import { SetMetadata } from '@nestjs/common';
import { LeonRole } from '@prisma/client';

export const LEON_ROLES_KEY = 'leon_roles';
export const LeonRoles = (...roles: LeonRole[]) => SetMetadata(LEON_ROLES_KEY, roles);
