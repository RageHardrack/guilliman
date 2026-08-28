import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PortfolioService } from './application/portfolio.service';
import { PortfolioController } from './adapters/portfolio.controller';
import { PortfolioRepositoryPort } from './domain/portfolio-repository.port';
import { NotionPortfolioRepository } from './adapters/notion-portfolio.repository';

@Module({
  imports: [ConfigModule],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    {
      provide: PortfolioRepositoryPort,
      useClass: NotionPortfolioRepository,
    },
  ],
  exports: [PortfolioService],
})
export class PortfolioModule {}
