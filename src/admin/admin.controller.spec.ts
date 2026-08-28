import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  beforeEach(() => {
    service = {
      listUsers: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      resetPassword: vi.fn(),
      deleteUser: vi.fn(),
    } as unknown as AdminService;

    controller = new AdminController(service);
  });

  it('should list users', async () => {
    const mockList = [{ id: 'u1', email: 'test@lascar.dev', role: Role.ADMIN }];
    vi.mocked(service.listUsers).mockResolvedValueOnce(mockList as any);

    const result = await controller.listUsers();
    expect(result).toEqual(mockList);
    expect(service.listUsers).toHaveBeenCalled();
  });

  it('should create user', async () => {
    const dto = { email: 'new@lascar.dev', password: 'pass', name: 'User', role: Role.USER };
    const mockCreated = { id: 'u2', ...dto };
    vi.mocked(service.createUser).mockResolvedValueOnce(mockCreated as any);

    const result = await controller.createUser(dto);
    expect(result).toEqual(mockCreated);
    expect(service.createUser).toHaveBeenCalledWith(dto);
  });

  it('should update user', async () => {
    const dto = { role: Role.ADMIN };
    const mockUpdated = { id: 'u2', email: 'u2@lascar.dev', role: Role.ADMIN };
    vi.mocked(service.updateUser).mockResolvedValueOnce(mockUpdated as any);

    const result = await controller.updateUser('u2', dto, {
      userId: 'admin-1',
      role: Role.ADMIN,
    });
    expect(result).toEqual(mockUpdated);
    expect(service.updateUser).toHaveBeenCalledWith('admin-1', 'u2', dto);
  });

  it('should reset password', async () => {
    const dto = { password: 'newPassword123' };
    vi.mocked(service.resetPassword).mockResolvedValueOnce({ success: true, message: 'ok' });

    const result = await controller.resetPassword('u2', dto);
    expect(result).toEqual({ success: true, message: 'ok' });
    expect(service.resetPassword).toHaveBeenCalledWith('u2', dto);
  });

  it('should delete user', async () => {
    vi.mocked(service.deleteUser).mockResolvedValueOnce({ success: true, message: 'ok' });

    const result = await controller.deleteUser('u2', { userId: 'admin-1', role: Role.ADMIN });
    expect(result).toEqual({ success: true, message: 'ok' });
    expect(service.deleteUser).toHaveBeenCalledWith('admin-1', 'u2');
  });
});
