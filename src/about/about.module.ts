import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AboutService } from './application/about.service';
import { AboutController } from './adapters/about.controller';
import { AboutRepositoryPort } from './domain/about-repository.port';
import { NotionAboutRepository } from './adapters/notion-about.repository';

@Module({
  imports: [ConfigModule],
  controllers: [AboutController],
  providers: [
    AboutService,
    {
      provide: AboutRepositoryPort,
      useClass: NotionAboutRepository,
    },
  ],
  exports: [AboutService],
})
export class AboutModule {}
