import { Module } from '@nestjs/common';
import { LeonRostersController } from './leon-rosters.controller';
import { LeonRostersService } from './leon-rosters.service';
import { LeonAuthModule } from '../auth/leon-auth.module';

@Module({
  imports: [LeonAuthModule],
  controllers: [LeonRostersController],
  providers: [LeonRostersService],
  exports: [LeonRostersService],
})
export class LeonRostersModule {}
