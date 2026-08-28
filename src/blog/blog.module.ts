import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BlogService } from './application/blog.service';
import { BlogController } from './adapters/blog.controller';
import { BlogRepositoryPort } from './domain/blog-repository.port';
import { NotionBlogRepository } from './adapters/notion-blog.repository';

@Module({
  imports: [ConfigModule],
  controllers: [BlogController],
  providers: [
    BlogService,
    {
      provide: BlogRepositoryPort,
      useClass: NotionBlogRepository,
    },
  ],
  exports: [BlogService],
})
export class BlogModule {}
