import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import type {
  LeonCatalogImportResultDto,
  LeonCatalogIndexDto,
} from './dtos/leon-catalog.dto';
import {
  CatalogImportError,
  parseCatalogImport,
  type CatalogImportPayload,
} from './catalog-import.validation';

/**
 * Prisma's JSON input union cannot express "a validated JSON object", so the
 * already-validated payload is narrowed once, here, instead of leaking a cast
 * through the rest of the service.
 */
function toJsonPayload(
  payload: Record<string, unknown>,
): Prisma.InputJsonValue {
  return payload as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class LeonCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The catalog index. Metadata comes from the most recent sync, because the
   * faction rows are always written together by one import batch.
   */
  async getIndex(): Promise<LeonCatalogIndexDto> {
    const [newest, factions] = await Promise.all([
      this.prisma.leonCatalogFaction.findFirst({
        orderBy: { syncedAt: 'desc' },
      }),
      this.prisma.leonCatalogFaction.findMany({
        select: { id: true, name: true, units: true, detachments: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!newest) {
      throw new NotFoundException('No catalog has been imported yet');
    }

    return {
      gameSystem: newest.gameSystem,
      edition: newest.edition,
      version: newest.version,
      updatedDate: newest.updatedDate,
      factions,
    };
  }

  /** The package of one faction, exactly as the client imports it. */
  async getFaction(id: string): Promise<Record<string, unknown>> {
    const faction = await this.prisma.leonCatalogFaction.findUnique({
      where: { id },
    });

    if (!faction) {
      throw new NotFoundException(`Catalog faction ${id} not found`);
    }

    return faction.payload as unknown as Record<string, unknown>;
  }

  /**
   * Upserts one batch of faction packages. It never deletes: a faction removed
   * upstream has to be pruned deliberately (documented limitation of the first
   * slice, see L5 of odd/tasks/leon-catalog-api.md).
   */
  async importCatalog(body: unknown): Promise<LeonCatalogImportResultDto> {
    const parsed = this.parse(body);
    const syncedAt = new Date();

    const writes = parsed.factions.map((faction) => {
      const record = {
        name: faction.name,
        ...parsed.meta,
        units: faction.units,
        detachments: faction.detachments,
        payload: toJsonPayload(faction.payload),
        syncedAt,
      };

      return this.prisma.leonCatalogFaction.upsert({
        where: { id: faction.id },
        create: { id: faction.id, ...record },
        update: record,
      });
    });

    await this.prisma.$transaction(writes);

    return {
      synced: parsed.factions.map((faction) => faction.id),
      version: parsed.meta.version,
    };
  }

  private parse(body: unknown): CatalogImportPayload {
    try {
      return parseCatalogImport(body);
    } catch (error) {
      if (error instanceof CatalogImportError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
