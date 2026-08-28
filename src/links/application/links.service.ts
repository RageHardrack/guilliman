import { Injectable } from '@nestjs/common';

import { ILink } from '../domain/links.types';
import { LinksRepositoryPort } from '../domain/links-repository.port';

@Injectable()
export class LinksService {
  constructor(private readonly linksRepository: LinksRepositoryPort) {}

  async findAll(): Promise<ILink[]> {
    return this.linksRepository.findAll();
  }
}
