import { IPost, ContentBlock } from './blog.types';

export abstract class BlogRepositoryPort {
  abstract findAll(): Promise<IPost[]>;
  abstract findOne(pageId: string): Promise<IPost>;
  abstract getPostContent(blockId: string): Promise<ContentBlock[]>;
}
