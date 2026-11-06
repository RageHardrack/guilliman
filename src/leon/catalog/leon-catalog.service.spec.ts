import { BadRequestException, NotFoundException } from '@nestjs/common';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeonCatalogService } from './leon-catalog.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

const META = {
  gameSystem: 'wh40k-11e',
  edition: '11th',
  version: '11.0.20261021',
  updatedDate: '2026-10-21',
};

function factionPayload(id: string, units: number, detachments: number) {
  return {
    ...META,
    globalStratagems: [],
    factions: [
      {
        id,
        name: `Faction ${id}`,
        units: Array.from({ length: units }, (_, index) => ({
          id: `${id}-unit-${index}`,
        })),
        detachments: Array.from({ length: detachments }, (_, index) => ({
          id: `${id}-det-${index}`,
        })),
      },
    ],
  };
}

function importBody() {
  return {
    meta: META,
    factions: [
      { id: 'SM', name: 'Space Marines', package: factionPayload('SM', 2, 1) },
      { id: 'ORK', name: 'Orks', package: factionPayload('ORK', 3, 0) },
    ],
  };
}

describe('LeonCatalogService', () => {
  let service: LeonCatalogService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      leonCatalogFaction: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    } as unknown as PrismaService;

    service = new LeonCatalogService(prisma);
  });

  describe('getIndex', () => {
    it('throws NotFound when no catalog has been imported yet', async () => {
      vi.mocked(prisma.leonCatalogFaction.findFirst).mockResolvedValueOnce(
        null,
      );
      vi.mocked(prisma.leonCatalogFaction.findMany).mockResolvedValueOnce([]);

      await expect(service.getIndex()).rejects.toThrow(NotFoundException);
    });

    it('returns the metadata of the newest sync plus the faction summaries', async () => {
      vi.mocked(prisma.leonCatalogFaction.findFirst).mockResolvedValueOnce({
        ...META,
        syncedAt: new Date('2026-10-21T16:10:00Z'),
      } as never);
      vi.mocked(prisma.leonCatalogFaction.findMany).mockResolvedValueOnce([
        { id: 'ORK', name: 'Orks', units: 95, detachments: 6 },
        { id: 'SM', name: 'Space Marines', units: 120, detachments: 8 },
      ] as never);

      const index = await service.getIndex();

      expect(index).toEqual({
        ...META,
        factions: [
          { id: 'ORK', name: 'Orks', units: 95, detachments: 6 },
          { id: 'SM', name: 'Space Marines', units: 120, detachments: 8 },
        ],
      });
      expect(prisma.leonCatalogFaction.findFirst).toHaveBeenCalledWith({
        orderBy: { syncedAt: 'desc' },
      });
      expect(prisma.leonCatalogFaction.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, units: true, detachments: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getFaction', () => {
    it('throws NotFound for an unknown faction', async () => {
      vi.mocked(prisma.leonCatalogFaction.findUnique).mockResolvedValueOnce(
        null,
      );

      await expect(service.getFaction('NOPE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the stored package payload', async () => {
      const payload = factionPayload('SM', 2, 1);
      vi.mocked(prisma.leonCatalogFaction.findUnique).mockResolvedValueOnce({
        id: 'SM',
        payload,
      } as never);

      const result = await service.getFaction('SM');

      expect(result).toEqual(payload);
      expect(prisma.leonCatalogFaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'SM' },
      });
    });
  });

  describe('importCatalog', () => {
    it('upserts every faction with counts recomputed from the payload in one transaction', async () => {
      const body = importBody();

      const result = await service.importCatalog(body);

      expect(result).toEqual({ synced: ['SM', 'ORK'], version: META.version });
      expect(prisma.leonCatalogFaction.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      const smCall = vi.mocked(prisma.leonCatalogFaction.upsert).mock
        .calls[0][0];
      expect(smCall.where).toEqual({ id: 'SM' });
      expect(smCall.create).toMatchObject({
        id: 'SM',
        name: 'Space Marines',
        ...META,
        units: 2,
        detachments: 1,
        payload: factionPayload('SM', 2, 1),
      });
      expect(smCall.update).toMatchObject({
        name: 'Space Marines',
        ...META,
        units: 2,
        detachments: 1,
      });
      expect(smCall.update.syncedAt).toBeInstanceOf(Date);

      const orkCall = vi.mocked(prisma.leonCatalogFaction.upsert).mock
        .calls[1][0];
      expect(orkCall.where).toEqual({ id: 'ORK' });
      expect(orkCall.create).toMatchObject({ units: 3, detachments: 0 });
    });

    it('rejects an invalid body with BadRequest and never touches the database', async () => {
      const body = importBody();
      (body.factions[0] as { package: unknown }).package = factionPayload(
        'ORK',
        1,
        0,
      );

      await expect(service.importCatalog(body)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.leonCatalogFaction.upsert).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a body with more factions than the transport allows', async () => {
      const body = importBody();
      for (let index = 0; index < 24; index += 1) {
        const id = `F${index}`;
        body.factions.push({
          id,
          name: `Faction ${id}`,
          package: factionPayload(id, 1, 1),
        });
      }

      await expect(service.importCatalog(body)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.leonCatalogFaction.upsert).not.toHaveBeenCalled();
    });
  });
});
