import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotionPortfolioRepository } from './notion-portfolio.repository';
import { NOTION_CLIENT } from '../../notion/notion.module';
import { LanguagesService } from '../../notion/languages.service';

describe('NotionPortfolioRepository', () => {
  let repository: NotionPortfolioRepository;
  let mockNotion: any;
  let mockConfig: any;
  let mockLanguagesService: any;

  beforeEach(async () => {
    mockNotion = {
      databases: {
        query: vi.fn(),
      },
      pages: {
        retrieve: vi.fn(),
      },
      blocks: {
        children: {
          list: vi.fn(),
        },
      },
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'NOTION_PORTFOLIO_ID') return 'portfolio-db-id';
        return undefined;
      }),
    };

    mockLanguagesService = {
      getLanguageIdByCode: vi.fn(),
      getLanguageCodeById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionPortfolioRepository,
        {
          provide: NOTION_CLIENT,
          useValue: mockNotion,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
        {
          provide: LanguagesService,
          useValue: mockLanguagesService,
        },
      ],
    }).compile();

    repository = module.get<NotionPortfolioRepository>(NotionPortfolioRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findProjects', () => {
    it('should query without language filter if lang is not provided and resolve TranslationSlug', async () => {
      mockNotion.databases.query.mockResolvedValue({
        results: [
          {
            id: 'proj-1',
            properties: {
              Name: { title: [{ plain_text: 'Project 1' }] },
              Slug: { rich_text: [{ plain_text: 'project-1' }] },
              Language: { relation: [{ id: 'lang-es-id' }] },
              Translations: { relation: [{ id: 'proj-en-id' }] },
            },
          },
        ],
      });
      mockLanguagesService.getLanguageCodeById.mockResolvedValue('es');
      mockNotion.pages.retrieve.mockResolvedValue({
        id: 'proj-en-id',
        properties: {
          Slug: { rich_text: [{ plain_text: 'project-1-en' }] },
        },
      });

      const projects = await repository.findProjects('projects-block-id');

      expect(mockNotion.databases.query).toHaveBeenCalledWith({
        database_id: 'projects-block-id',
        sorts: [{ property: 'Orden', direction: 'ascending' }],
      });
      expect(projects).toHaveLength(1);
      expect(projects[0].Language).toBe('es');
      expect(projects[0].TranslationSlug).toBe('project-1-en');
      expect(mockNotion.pages.retrieve).toHaveBeenCalledWith({ page_id: 'proj-en-id' });
    });

    it('should include language relation filter when lang code is resolved', async () => {
      mockLanguagesService.getLanguageIdByCode.mockResolvedValue('lang-en-id');
      mockNotion.databases.query.mockResolvedValue({ results: [] });

      await repository.findProjects('projects-block-id', 'en');

      expect(mockLanguagesService.getLanguageIdByCode).toHaveBeenCalledWith('en');
      expect(mockNotion.databases.query).toHaveBeenCalledWith({
        database_id: 'projects-block-id',
        filter: {
          property: 'Language',
          relation: {
            contains: 'lang-en-id',
          },
        },
        sorts: [{ property: 'Orden', direction: 'ascending' }],
      });
    });
  });
});
