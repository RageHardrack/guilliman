import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LeonRole } from '@prisma/client';

import { LEON_ROLES_KEY } from './leon-roles.decorator';

@Injectable()
export class LeonRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<LeonRole[]>(
      LEON_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.app !== 'LEON') {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
