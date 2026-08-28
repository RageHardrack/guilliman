import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LinksService } from './application/links.service';
import { LinksController } from './adapters/links.controller';
import { LinksRepositoryPort } from './domain/links-repository.port';
import { NotionLinksRepository } from './adapters/notion-links.repository';

@Module({
  imports: [ConfigModule],
  controllers: [LinksController],
  providers: [
    LinksService,
    {
      provide: LinksRepositoryPort,
      useClass: NotionLinksRepository,
    },
  ],
  exports: [LinksService],
})
export class LinksModule {}
