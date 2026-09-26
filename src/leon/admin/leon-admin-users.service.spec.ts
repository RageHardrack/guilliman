import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LeonRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeonAdminUsersService } from './leon-admin-users.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

describe('LeonAdminUsersService', () => {
  let service: LeonAdminUsersService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      leonUser: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new LeonAdminUsersService(prisma);
  });

  describe('listUsers', () => {
    it('should return all leon users without passwords', async () => {
      const mockUsers = [
        { id: '1', email: 'u1@test.com', role: 'ADMIN', isActive: true, createdAt: new Date() },
        { id: '2', email: 'u2@test.com', role: 'USER', isActive: true, createdAt: new Date() },
      ];
      vi.mocked(prisma.leonUser.findMany).mockResolvedValueOnce(mockUsers as any);

      const result = await service.listUsers();
      expect(result).toHaveLength(2);
      expect(prisma.leonUser.findMany).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should throw ConflictException if email is already taken', async () => {
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce({ id: 'existing' } as any);

      await expect(
        service.createUser({ email: 'taken@test.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user with hashed password', async () => {
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.leonUser.create).mockResolvedValueOnce({
        id: 'new-id',
        email: 'new@test.com',
        name: 'New Player',
        role: LeonRole.USER,
        isActive: true,
      } as any);

      const result = await service.createUser({
        email: 'new@test.com',
        password: 'password123',
        name: 'New Player',
      });

      expect(result.id).toBe('new-id');
      expect(prisma.leonUser.create).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw NotFoundException if user not found', async () => {
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce(null);

      await expect(
        service.resetPassword('missing-id', { newPassword: 'newPassword123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update user password with new hash', async () => {
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce({ id: 'user-1' } as any);
      vi.mocked(prisma.leonUser.update).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@test.com',
      } as any);

      const result = await service.resetPassword('user-1', { newPassword: 'newPassword123' });
      expect(result).toEqual({ message: 'Password reset successfully for user user-1' });
      expect(prisma.leonUser.update).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should throw BadRequestException if admin tries to delete themselves', async () => {
      await expect(service.deleteUser('admin-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user to delete is not found', async () => {
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce(null);

      await expect(service.deleteUser('admin-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should delete user when valid', async () => {
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce({ id: 'user-2' } as any);
      vi.mocked(prisma.leonUser.delete).mockResolvedValueOnce({ id: 'user-2' } as any);

      const result = await service.deleteUser('admin-1', 'user-2');
      expect(result).toEqual({ message: 'User user-2 deleted successfully' });
      expect(prisma.leonUser.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } });
    });
  });
});
