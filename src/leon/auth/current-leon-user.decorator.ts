import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { LeonRole } from '@prisma/client';

export interface CurrentLeonUserData {
  userId: string;
  email: string;
  role: LeonRole;
  app: 'LEON';
}

export const CurrentLeonUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentLeonUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
