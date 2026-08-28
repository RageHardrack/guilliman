import { Injectable, NotFoundException } from '@nestjs/common';

import { ContentBlock } from '../../blog/domain/blog.types';
import { IProject, ISkill, IExperience } from '../domain/portfolio.types';
import { PortfolioRepositoryPort } from '../domain/portfolio-repository.port';

@Injectable()
export class PortfolioService {
  constructor(private readonly portfolioRepository: PortfolioRepositoryPort) {}

  async getPortfolio(): Promise<{
    content: ContentBlock[];
    projects: IProject[];
  }> {
    const childDbs = await this.portfolioRepository.findAllChildDatabases();
    const projectsDb = childDbs.find((db) => db.title === 'Projects');

    if (!projectsDb) {
      throw new NotFoundException('Base de datos de Proyectos no encontrada');
    }

    const [content, projects] = await Promise.all([
      this.portfolioRepository.getPortfolioContent(),
      this.portfolioRepository.findProjects(projectsDb.id),
    ]);

    return { content, projects };
  }

  async getProjectDetail(
    slug: string,
  ): Promise<{ project: IProject; content: ContentBlock[] }> {
    const childDbs = await this.portfolioRepository.findAllChildDatabases();
    const projectsDb = childDbs.find((db) => db.title === 'Projects');

    if (!projectsDb) {
      throw new NotFoundException('Base de datos de Proyectos no encontrada');
    }

    const projects = await this.portfolioRepository.findProjects(projectsDb.id);
    const project = projects.find((p) => p.Slug === slug);

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const content = await this.portfolioRepository.getProjectContent(
      project.id,
    );
    return { project, content };
  }

  async getSkills(): Promise<ISkill[]> {
    const childDbs = await this.portfolioRepository.findAllChildDatabases();
    const skillsDb = childDbs.find((db) => db.title === 'Skills');

    if (!skillsDb) {
      throw new NotFoundException('Base de datos de Habilidades no encontrada');
    }

    return this.portfolioRepository.findSkills(skillsDb.id);
  }

  async getExperience(): Promise<IExperience[]> {
    const childDbs = await this.portfolioRepository.findAllChildDatabases();
    const expDb = childDbs.find((db) => db.title === 'Experience');

    if (!expDb) {
      throw new NotFoundException('Base de datos de Experiencia no encontrada');
    }

    return this.portfolioRepository.findExperience(expDb.id);
  }
}
