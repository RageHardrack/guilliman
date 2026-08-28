import { Injectable } from '@nestjs/common';

import { ContentBlock } from '../../blog/domain/blog.types';
import { AboutRepositoryPort } from '../domain/about-repository.port';

@Injectable()
export class AboutService {
  constructor(private readonly aboutRepository: AboutRepositoryPort) {}

  async getAboutContent(): Promise<ContentBlock[]> {
    return this.aboutRepository.getAboutContent();
  }
}
