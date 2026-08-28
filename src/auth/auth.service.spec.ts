import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    } as unknown as PrismaService;

    jwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    } as unknown as JwtService;

    service = new AuthService(prisma, jwtService);
  });

  describe('register', () => {
    it('should throw ConflictException if user email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'existing-id',
      } as any);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return accessToken and user data', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      const mockCreatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
      };
      vi.mocked(prisma.user.create).mockResolvedValueOnce(
        mockCreatedUser as any,
      );

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('USER');
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        service.login({
          email: 'wrong@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('realpassword', 10);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'USER',
      } as any);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        email: 'inactive@example.com',
        password: 'hashed-password',
        isActive: false,
        role: 'USER',
      } as any);

      await expect(
        service.login({
          email: 'inactive@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken and user on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('secret123', 10);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        taxProfileEnabled: true,
        taxCountry: 'PE',
        taxRuc: '10456789012',
        createdAt: new Date(),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any);

      const result = await service.login({
        email: 'test@example.com',
        password: 'secret123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.isActive).toBe(true);
      expect(result.user.taxProfileEnabled).toBe(true);
    });
  });
});
