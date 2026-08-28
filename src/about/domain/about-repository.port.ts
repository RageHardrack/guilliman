import { ContentBlock } from '../../blog/domain/blog.types';

export abstract class AboutRepositoryPort {
  abstract getAboutContent(): Promise<ContentBlock[]>;
}
