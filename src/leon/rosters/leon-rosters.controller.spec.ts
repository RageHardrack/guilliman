import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeonRostersController } from './leon-rosters.controller';
import { LeonRostersService } from './leon-rosters.service';

describe('LeonRostersController', () => {
  let controller: LeonRostersController;
  let service: LeonRostersService;

  beforeEach(() => {
    service = {
      listRosters: vi.fn().mockResolvedValue([]),
      getRoster: vi.fn().mockResolvedValue({ id: 'r-1' }),
      createRoster: vi.fn().mockResolvedValue({ id: 'new-r' }),
      updateRoster: vi.fn().mockResolvedValue({ id: 'updated-r' }),
      deleteRoster: vi.fn().mockResolvedValue({ message: 'Deleted' }),
    } as unknown as LeonRostersService;

    controller = new LeonRostersController(service);
  });

  const mockUser = {
    userId: 'u-123',
    email: 'user@test.com',
    role: 'USER' as const,
    app: 'LEON' as const,
  };

  it('should list rosters for current user', async () => {
    await controller.listRosters(mockUser);
    expect(service.listRosters).toHaveBeenCalledWith('u-123');
  });

  it('should get single roster for current user', async () => {
    await controller.getRoster('r-1', mockUser);
    expect(service.getRoster).toHaveBeenCalledWith('u-123', 'r-1');
  });

  it('should create roster for current user', async () => {
    const dto = { name: 'My List' };
    await controller.createRoster(dto, mockUser);
    expect(service.createRoster).toHaveBeenCalledWith('u-123', dto);
  });

  it('should update roster for current user', async () => {
    const dto = { name: 'Updated List' };
    await controller.updateRoster('r-1', dto, mockUser);
    expect(service.updateRoster).toHaveBeenCalledWith('u-123', 'r-1', dto);
  });

  it('should delete roster for current user', async () => {
    await controller.deleteRoster('r-1', mockUser);
    expect(service.deleteRoster).toHaveBeenCalledWith('u-123', 'r-1');
  });
});
