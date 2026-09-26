import { LeonRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeonAdminUsersController } from './leon-admin-users.controller';
import { LeonAdminUsersService } from './leon-admin-users.service';

describe('LeonAdminUsersController', () => {
  let controller: LeonAdminUsersController;
  let service: LeonAdminUsersService;

  beforeEach(() => {
    service = {
      listUsers: vi.fn().mockResolvedValue([]),
      createUser: vi.fn().mockResolvedValue({ id: 'new-id' }),
      updateUser: vi.fn().mockResolvedValue({ id: 'updated-id' }),
      resetPassword: vi.fn().mockResolvedValue({ message: 'Success' }),
      deleteUser: vi.fn().mockResolvedValue({ message: 'Deleted' }),
    } as unknown as LeonAdminUsersService;

    controller = new LeonAdminUsersController(service);
  });

  it('should list users', async () => {
    await controller.listUsers();
    expect(service.listUsers).toHaveBeenCalled();
  });

  it('should create user', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    await controller.createUser(dto);
    expect(service.createUser).toHaveBeenCalledWith(dto);
  });

  it('should reset password', async () => {
    const dto = { newPassword: 'new123Password!' };
    await controller.resetPassword('user-1', dto);
    expect(service.resetPassword).toHaveBeenCalledWith('user-1', dto);
  });
});
