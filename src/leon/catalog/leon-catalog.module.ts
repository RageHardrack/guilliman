import { Module } from '@nestjs/common';

import { LeonAuthModule } from '../auth/leon-auth.module';
import { LeonCatalogService } from './leon-catalog.service';
import { LeonCatalogController } from './leon-catalog.controller';

@Module({
  imports: [LeonAuthModule],
  controllers: [LeonCatalogController],
  providers: [LeonCatalogService],
  exports: [LeonCatalogService],
})
export class LeonCatalogModule {}
