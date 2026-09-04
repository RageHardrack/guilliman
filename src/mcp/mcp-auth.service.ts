import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { User, Role } from '@prisma/client';

import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

@Injectable()
export class McpAuthService {
  private readonly logger = new Logger(McpAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves and authenticates the executing user.
   * Strictly enforces that the user has role 'ADMIN' and isActive === true.
   * Fails closed if the user does not exist or is not an ADMIN.
   */
  async getAdminUserContext(): Promise<User> {
    const envUserId = process.env.MCP_USER_ID;
    const envUserEmail = process.env.MCP_USER_EMAIL;

    let user: User | null = null;

    if (envUserId) {
      user = await this.prisma.user.findUnique({
        where: { id: envUserId },
      });
      if (!user) {
        throw new UnauthorizedException(
          `MCP Security: User with specified MCP_USER_ID '${envUserId}' was not found.`,
        );
      }
    } else if (envUserEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: envUserEmail },
      });
      if (!user) {
        throw new UnauthorizedException(
          `MCP Security: User with specified MCP_USER_EMAIL '${envUserEmail}' was not found.`,
        );
      }
    } else {
      // Fallback to active ADMIN user
      user = await this.prisma.user.findFirst({
        where: {
          role: Role.ADMIN,
          isActive: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException(
          'MCP Security: No active ADMIN user found in database. MCP server requires an ADMIN user to operate.',
        );
      }
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        `MCP Security: User '${user.email}' is inactive. Access denied.`,
      );
    }

    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        `MCP Security: Access Denied. User '${user.email}' has role '${user.role}', but MCP requires 'ADMIN' role.`,
      );
    }

    this.logger.log(
      `MCP Admin Authenticated: ${user.name || user.email} (${user.id}) [Role: ${user.role}]`,
    );

    return user;
  }
}
