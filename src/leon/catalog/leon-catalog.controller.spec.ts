import { LeonRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeonCatalogService } from './leon-catalog.service';
import { LEON_ROLES_KEY } from '../guards/leon-roles.decorator';
import { LeonCatalogController } from './leon-catalog.controller';

describe('LeonCatalogController', () => {
  let controller: LeonCatalogController;
  let service: LeonCatalogService;

  beforeEach(() => {
    service = {
      getIndex: vi.fn().mockResolvedValue({ factions: [] }),
      getFaction: vi.fn().mockResolvedValue({ factions: [] }),
      importCatalog: vi
        .fn()
        .mockResolvedValue({ synced: ['SM'], version: '11.0.20261021' }),
    } as unknown as LeonCatalogService;

    controller = new LeonCatalogController(service);
  });

  it('delegates the index read to the service', async () => {
    await controller.getIndex();

    expect(service.getIndex).toHaveBeenCalledTimes(1);
  });

  it('delegates the faction read with the requested id', async () => {
    await controller.getFaction('SM');

    expect(service.getFaction).toHaveBeenCalledWith('SM');
  });

  it('delegates the import with the untouched body', async () => {
    const body = { meta: {}, factions: [] };

    await controller.importCatalog(body);

    expect(service.importCatalog).toHaveBeenCalledWith(body);
  });

  it('restricts the import to administrators and leaves the reads open to any Leon user', () => {
    expect(
      Reflect.getMetadata(
        LEON_ROLES_KEY,
        LeonCatalogController.prototype.importCatalog,
      ),
    ).toEqual([LeonRole.ADMIN]);
    expect(
      Reflect.getMetadata(
        LEON_ROLES_KEY,
        LeonCatalogController.prototype.getIndex,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        LEON_ROLES_KEY,
        LeonCatalogController.prototype.getFaction,
      ),
    ).toBeUndefined();
  });
});
