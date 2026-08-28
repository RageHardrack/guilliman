import { ILink } from './links.types';

export abstract class LinksRepositoryPort {
  abstract findAll(): Promise<ILink[]>;
}
