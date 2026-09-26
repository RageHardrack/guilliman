import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { LeonRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface LeonJwtPayload {
  sub: string;
  email: string;
  role: LeonRole;
  app: 'LEON';
}

@Injectable()
export class LeonJwtStrategy extends PassportStrategy(Strategy, 'leon-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.LEON_JWT_SECRET || process.env.JWT_SECRET || 'leon-dev-secret-key-1355',
    });
  }

  async validate(payload: LeonJwtPayload) {
    if (payload.app !== 'LEON') {
      throw new UnauthorizedException('Token is not valid for Leon app');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      app: payload.app,
    };
  }
}
