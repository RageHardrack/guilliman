import { Module } from '@nestjs/common';
import { LeonAuthModule } from './auth/leon-auth.module';
import { LeonAdminModule } from './admin/leon-admin.module';
import { LeonRostersModule } from './rosters/leon-rosters.module';

@Module({
  imports: [LeonAuthModule, LeonAdminModule, LeonRostersModule],
  exports: [LeonAuthModule, LeonAdminModule, LeonRostersModule],
})
export class LeonModule {}
