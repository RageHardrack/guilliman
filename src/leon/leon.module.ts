import { Module } from '@nestjs/common';

import { LeonAuthModule } from './auth/leon-auth.module';
import { LeonAdminModule } from './admin/leon-admin.module';
import { LeonCatalogModule } from './catalog/leon-catalog.module';
import { LeonRostersModule } from './rosters/leon-rosters.module';

@Module({
  imports: [
    LeonAuthModule,
    LeonAdminModule,
    LeonCatalogModule,
    LeonRostersModule,
  ],
  exports: [
    LeonAuthModule,
    LeonAdminModule,
    LeonCatalogModule,
    LeonRostersModule,
  ],
})
export class LeonModule {}
