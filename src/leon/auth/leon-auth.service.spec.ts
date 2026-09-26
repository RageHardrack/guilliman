import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeonAuthService } from './leon-auth.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

describe('LeonAuthService', () => {
  let service: LeonAuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(() => {
    prisma = {
      leonUser: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    jwtService = {
      sign: vi.fn().mockReturnValue('mock-leon-jwt-token'),
    } as unknown as JwtService;

    service = new LeonAuthService(prisma, jwtService);
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found in leon_users', async () => {
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce(null);

      await expect(
        service.login({
          email: 'player@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user account is deactivated', async () => {
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce({
        id: 'leon-1',
        email: 'inactive@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Inactive Player',
        role: 'USER',
        isActive: false,
      } as any);

      await expect(
        service.login({
          email: 'inactive@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce({
        id: 'leon-1',
        email: 'player@example.com',
        password: hashedPassword,
        name: 'Player One',
        role: 'USER',
        isActive: true,
      } as any);

      await expect(
        service.login({
          email: 'player@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken with app: LEON and user data on successful login', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      const mockLeonUser = {
        id: 'leon-1',
        email: 'player@example.com',
        password: hashedPassword,
        name: 'Player One',
        role: 'USER',
        isActive: true,
      };

      vi.mocked(prisma.leonUser.findUnique).mockResolvedValueOnce(mockLeonUser as any);

      const result = await service.login({
        email: 'player@example.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('mock-leon-jwt-token');
      expect(result.user).toEqual({
        id: 'leon-1',
        email: 'player@example.com',
        name: 'Player One',
        role: 'USER',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'leon-1',
        email: 'player@example.com',
        role: 'USER',
        app: 'LEON',
      });
    });
  });
});
