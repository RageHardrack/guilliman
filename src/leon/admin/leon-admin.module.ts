import { Module } from '@nestjs/common';

import { LeonAdminUsersController } from './leon-admin-users.controller';
import { LeonAdminUsersService } from './leon-admin-users.service';
import { LeonAuthModule } from '../auth/leon-auth.module';

@Module({
  imports: [LeonAuthModule],
  controllers: [LeonAdminUsersController],
  providers: [LeonAdminUsersService],
  exports: [LeonAdminUsersService],
})
export class LeonAdminModule {}
