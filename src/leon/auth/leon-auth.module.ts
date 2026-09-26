import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { LeonAuthController } from './leon-auth.controller';
import { LeonAuthService } from './leon-auth.service';
import { LeonJwtStrategy } from '../guards/leon-jwt.strategy';
import { LeonRolesGuard } from '../guards/leon-roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'leon-jwt' }),
    JwtModule.register({
      secret: process.env.LEON_JWT_SECRET || process.env.JWT_SECRET || 'leon-dev-secret-key-1355',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [LeonAuthController],
  providers: [LeonAuthService, LeonJwtStrategy, LeonRolesGuard],
  exports: [LeonAuthService, LeonJwtStrategy, LeonRolesGuard, JwtModule],
})
export class LeonAuthModule {}
