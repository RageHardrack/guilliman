import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PortfolioService } from './portfolio.service';
import { PortfolioRepositoryPort } from '../domain/portfolio-repository.port';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findAllChildDatabases: vi.fn(),
      findProjects: vi.fn(),
      getProjectContent: vi.fn(),
      findSkills: vi.fn(),
      findExperience: vi.fn(),
      getPortfolioContent: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: PortfolioRepositoryPort,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPortfolio', () => {
    it('should return portfolio content and projects', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([
        { title: 'Projects', id: 'projects-db-id' },
      ]);
      mockRepository.getPortfolioContent.mockResolvedValue([
        { id: '1', body: 'Portfolio text' },
      ]);
      mockRepository.findProjects.mockResolvedValue([
        { id: 'p1', title: 'Project 1' },
      ]);

      const result = await service.getPortfolio();

      expect(result).toEqual({
        content: [{ id: '1', body: 'Portfolio text' }],
        projects: [{ id: 'p1', title: 'Project 1' }],
      });
      expect(mockRepository.findAllChildDatabases).toHaveBeenCalledTimes(1);
      expect(mockRepository.getPortfolioContent).toHaveBeenCalledTimes(1);
      expect(mockRepository.findProjects).toHaveBeenCalledWith(
        'projects-db-id',
      );
    });

    it('should throw NotFoundException if Projects database is not found', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([]);

      await expect(service.getPortfolio()).rejects.toThrow(
        new NotFoundException('Base de datos de Proyectos no encontrada'),
      );
    });
  });

  describe('getProjectDetail', () => {
    it('should return project detail with content', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([
        { title: 'Projects', id: 'projects-db-id' },
      ]);
      mockRepository.findProjects.mockResolvedValue([
        { id: 'p1', Slug: 'my-project', title: 'My Project' },
      ]);
      mockRepository.getProjectContent.mockResolvedValue([
        { id: 'c1', body: 'Detail content' },
      ]);

      const result = await service.getProjectDetail('my-project');

      expect(result).toEqual({
        project: { id: 'p1', Slug: 'my-project', title: 'My Project' },
        content: [{ id: 'c1', body: 'Detail content' }],
      });
    });

    it('should throw NotFoundException if Projects database is not found', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([]);

      await expect(service.getProjectDetail('my-project')).rejects.toThrow(
        new NotFoundException('Base de datos de Proyectos no encontrada'),
      );
    });

    it('should throw NotFoundException if project with slug is not found', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([
        { title: 'Projects', id: 'projects-db-id' },
      ]);
      mockRepository.findProjects.mockResolvedValue([
        { id: 'p1', Slug: 'other-project', title: 'Other' },
      ]);

      await expect(service.getProjectDetail('my-project')).rejects.toThrow(
        new NotFoundException('Proyecto no encontrado'),
      );
    });
  });

  describe('getSkills', () => {
    it('should return skills', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([
        { title: 'Skills', id: 'skills-db-id' },
      ]);
      mockRepository.findSkills.mockResolvedValue([{ name: 'TypeScript' }]);

      const result = await service.getSkills();

      expect(result).toEqual([{ name: 'TypeScript' }]);
      expect(mockRepository.findSkills).toHaveBeenCalledWith('skills-db-id');
    });

    it('should throw NotFoundException if Skills database is not found', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([]);

      await expect(service.getSkills()).rejects.toThrow(
        new NotFoundException('Base de datos de Habilidades no encontrada'),
      );
    });
  });

  describe('getExperience', () => {
    it('should return experiences', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([
        { title: 'Experience', id: 'exp-db-id' },
      ]);
      mockRepository.findExperience.mockResolvedValue([{ company: 'Google' }]);

      const result = await service.getExperience();

      expect(result).toEqual([{ company: 'Google' }]);
      expect(mockRepository.findExperience).toHaveBeenCalledWith('exp-db-id');
    });

    it('should throw NotFoundException if Experience database is not found', async () => {
      mockRepository.findAllChildDatabases.mockResolvedValue([]);

      await expect(service.getExperience()).rejects.toThrow(
        new NotFoundException('Base de datos de Experiencia no encontrada'),
      );
    });
  });
});
