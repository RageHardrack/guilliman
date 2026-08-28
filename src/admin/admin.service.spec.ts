import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminService } from './admin.service';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new AdminService(prisma);
  });

  describe('listUsers', () => {
    it('should return list of users with counts', async () => {
      const mockUsers = [
        { id: 'u1', email: 'admin@lascar.dev', role: Role.ADMIN, _count: { accounts: 2, transactions: 10 } },
      ];
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockUsers as any);

      const result = await service.listUsers();
      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should throw ConflictException if email exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u1' } as any);

      await expect(
        service.createUser({ email: 'existing@lascar.dev', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and create user with specified role', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      const mockCreated = { id: 'u2', email: 'new@lascar.dev', role: Role.ADMIN };
      vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreated as any);

      const result = await service.createUser({
        email: 'new@lascar.dev',
        password: 'password123',
        name: 'New Admin',
        role: Role.ADMIN,
      });

      expect(result).toEqual(mockCreated);
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        service.updateUser('admin-1', 'nonexistent', { role: Role.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if admin tries to deactivate themselves', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN, isActive: true } as any);

      await expect(
        service.updateUser('admin-1', 'admin-1', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update user role, name, status and SUNAT profile', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        name: 'Old',
        role: Role.USER,
        isActive: true,
        taxProfileEnabled: false,
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        id: 'u1',
        name: 'New',
        role: Role.ADMIN,
        isActive: true,
        taxProfileEnabled: true,
        taxRuc: '10456789012',
      } as any);

      const result = await service.updateUser('admin-1', 'u1', {
        name: 'New',
        role: Role.ADMIN,
        taxProfileEnabled: true,
        taxRuc: '10456789012',
      });
      expect(result.role).toBe(Role.ADMIN);
      expect(result.name).toBe('New');
      expect(result.taxProfileEnabled).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        service.resetPassword('nonexistent', { password: 'newpass' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update user password hash', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u1' } as any);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({ id: 'u1' } as any);

      const result = await service.resetPassword('u1', { password: 'newPassword123' });
      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should throw BadRequestException if admin tries to delete themselves', async () => {
      await expect(service.deleteUser('admin-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user is not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(service.deleteUser('admin-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete user successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-2' } as any);
      vi.mocked(prisma.user.delete).mockResolvedValueOnce({ id: 'user-2' } as any);

      const result = await service.deleteUser('admin-1', 'user-2');
      expect(result.success).toBe(true);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } });
    });
  });
});
