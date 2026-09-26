import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeonRostersService } from './leon-rosters.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

describe('LeonRostersService', () => {
  let service: LeonRostersService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      leonRoster: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new LeonRostersService(prisma);
  });

  describe('listRosters', () => {
    it('should list all rosters for a given user', async () => {
      const mockRosters = [
        { id: 'r-1', leonUserId: 'u-1', name: 'Army 1', pointsTotal: 1000 },
        { id: 'r-2', leonUserId: 'u-1', name: 'Army 2', pointsTotal: 2000 },
      ];
      vi.mocked(prisma.leonRoster.findMany).mockResolvedValueOnce(mockRosters as any);

      const result = await service.listRosters('u-1');
      expect(result).toEqual(mockRosters);
      expect(prisma.leonRoster.findMany).toHaveBeenCalledWith({
        where: { leonUserId: 'u-1' },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('getRoster', () => {
    it('should throw NotFoundException if roster is not found for user', async () => {
      vi.mocked(prisma.leonRoster.findFirst).mockResolvedValueOnce(null);

      await expect(service.getRoster('u-1', 'r-99')).rejects.toThrow(NotFoundException);
    });

    it('should return roster if found for user', async () => {
      const mockRoster = { id: 'r-1', leonUserId: 'u-1', name: 'Army 1' };
      vi.mocked(prisma.leonRoster.findFirst).mockResolvedValueOnce(mockRoster as any);

      const result = await service.getRoster('u-1', 'r-1');
      expect(result).toEqual(mockRoster);
    });
  });

  describe('createRoster', () => {
    it('should create and return roster associated with user', async () => {
      const dto = {
        name: 'Dark Angels 2000pts',
        gameSystem: '40k-10e',
        faction: 'Dark Angels',
        detachment: 'Unforgiven Task Force',
        pointsLimit: 2000,
        pointsTotal: 1990,
        content: { units: [{ name: 'Azrael', points: 105 }] },
      };

      vi.mocked(prisma.leonRoster.create).mockResolvedValueOnce({
        id: 'r-new',
        leonUserId: 'u-1',
        ...dto,
      } as any);

      const result = await service.createRoster('u-1', dto);
      expect(result.id).toBe('r-new');
      expect(prisma.leonRoster.create).toHaveBeenCalledWith({
        data: {
          leonUserId: 'u-1',
          name: dto.name,
          gameSystem: dto.gameSystem || '40k-10e',
          faction: dto.faction,
          detachment: dto.detachment,
          pointsLimit: dto.pointsLimit || 2000,
          pointsTotal: dto.pointsTotal || 0,
          content: dto.content || {},
        },
      });
    });
  });

  describe('updateRoster', () => {
    it('should throw NotFoundException if roster does not exist for user', async () => {
      vi.mocked(prisma.leonRoster.findFirst).mockResolvedValueOnce(null);

      await expect(service.updateRoster('u-1', 'r-99', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update roster when found for user', async () => {
      vi.mocked(prisma.leonRoster.findFirst).mockResolvedValueOnce({ id: 'r-1', leonUserId: 'u-1' } as any);
      vi.mocked(prisma.leonRoster.update).mockResolvedValueOnce({
        id: 'r-1',
        name: 'New Name',
      } as any);

      const result = await service.updateRoster('u-1', 'r-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteRoster', () => {
    it('should throw NotFoundException if roster not found for user', async () => {
      vi.mocked(prisma.leonRoster.findFirst).mockResolvedValueOnce(null);

      await expect(service.deleteRoster('u-1', 'r-99')).rejects.toThrow(NotFoundException);
    });

    it('should delete roster when found for user', async () => {
      vi.mocked(prisma.leonRoster.findFirst).mockResolvedValueOnce({ id: 'r-1', leonUserId: 'u-1' } as any);
      vi.mocked(prisma.leonRoster.delete).mockResolvedValueOnce({ id: 'r-1' } as any);

      const result = await service.deleteRoster('u-1', 'r-1');
      expect(result).toEqual({ message: 'Roster r-1 deleted successfully' });
      expect(prisma.leonRoster.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
    });
  });
});
