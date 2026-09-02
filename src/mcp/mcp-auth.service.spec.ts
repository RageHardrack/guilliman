import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { McpAuthService } from './mcp-auth.service';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { Role } from '@prisma/client';

describe('McpAuthService (ADMIN Security Guard)', () => {
  let service: McpAuthService;
  let prisma: PrismaService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MCP_USER_ID;
    delete process.env.MCP_USER_EMAIL;

    prisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new McpAuthService(prisma);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('permite el acceso si se encuentra un usuario con rol ADMIN activo', async () => {
    const adminUser = {
      id: 'admin-uuid',
      email: 'admin@lascar.pe',
      name: 'Daniel Colmenares',
      role: Role.ADMIN,
      isActive: true,
    };

    (prisma.user.findFirst as any).mockResolvedValue(adminUser);

    const result = await service.getAdminUserContext();

    expect(result.id).toBe('admin-uuid');
    expect(result.role).toBe(Role.ADMIN);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
    });
  });

  it('rechaza el acceso si no existe ningún usuario ADMIN en la base de datos', async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);

    await expect(service.getAdminUserContext()).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('bloquea inmediatamente si el usuario resuelto tiene rol USER (no ADMIN)', async () => {
    process.env.MCP_USER_ID = 'regular-user-id';

    const regularUser = {
      id: 'regular-user-id',
      email: 'user@lascar.pe',
      role: Role.USER,
      isActive: true,
    };

    (prisma.user.findUnique as any).mockResolvedValue(regularUser);

    await expect(service.getAdminUserContext()).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('bloquea el acceso si el usuario ADMIN está inactivo (isActive: false)', async () => {
    process.env.MCP_USER_EMAIL = 'disabled-admin@lascar.pe';

    const disabledAdmin = {
      id: 'disabled-admin-id',
      email: 'disabled-admin@lascar.pe',
      role: Role.ADMIN,
      isActive: false,
    };

    (prisma.user.findUnique as any).mockResolvedValue(disabledAdmin);

    await expect(service.getAdminUserContext()).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('autentica correctamente mediante MCP_USER_EMAIL cuando es ADMIN válido', async () => {
    process.env.MCP_USER_EMAIL = 'daniel@lascar.pe';

    const adminUser = {
      id: 'admin-custom-id',
      email: 'daniel@lascar.pe',
      role: Role.ADMIN,
      isActive: true,
    };

    (prisma.user.findUnique as any).mockResolvedValue(adminUser);

    const result = await service.getAdminUserContext();

    expect(result.id).toBe('admin-custom-id');
    expect(result.email).toBe('daniel@lascar.pe');
  });
});
