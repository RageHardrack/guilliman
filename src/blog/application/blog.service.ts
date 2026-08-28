import { Injectable, NotFoundException } from '@nestjs/common';

import { IPost } from '../domain/blog.types';
import { BlogRepositoryPort } from '../domain/blog-repository.port';

@Injectable()
export class BlogService {
  constructor(private readonly blogRepository: BlogRepositoryPort) {}

  async findAll(): Promise<IPost[]> {
    return this.blogRepository.findAll();
  }

  async findBySlug(slug: string): Promise<any> {
    const posts = await this.blogRepository.findAll();
    const current = posts.find((post) => post.Slug === slug);

    if (!current) {
      throw new NotFoundException('Publicación no encontrada');
    }

    const pageContent = await this.blogRepository.findOne(current.id);
    const content = await this.blogRepository.getPostContent(pageContent.id);

    return { ...pageContent, content };
  }
}
