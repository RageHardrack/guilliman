import { ContentBlock } from '../../blog/domain/blog.types';
import {
  IProject,
  ISkill,
  IExperience,
  ChildDatabase,
} from './portfolio.types';

export abstract class PortfolioRepositoryPort {
  abstract findAllChildDatabases(): Promise<ChildDatabase[]>;
  abstract findProjects(blockId: string): Promise<IProject[]>;
  abstract getProjectContent(projectId: string): Promise<ContentBlock[]>;
  abstract findSkills(blockId: string): Promise<ISkill[]>;
  abstract findExperience(blockId: string): Promise<IExperience[]>;
  abstract getPortfolioContent(): Promise<ContentBlock[]>;
}
