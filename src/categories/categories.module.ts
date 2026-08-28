import { Module } from '@nestjs/common';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { CategoryRepositoryPort } from './application/ports/category.repository.port';
import { CategoriesController } from './infrastructure/controllers/categories.controller';
import { PrismaCategoryRepository } from './infrastructure/adapters/prisma-category.repository';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    {
      provide: CategoryRepositoryPort,
      useClass: PrismaCategoryRepository,
    },
  ],
  exports: [CategoryRepositoryPort],
})
export class CategoriesModule {}
