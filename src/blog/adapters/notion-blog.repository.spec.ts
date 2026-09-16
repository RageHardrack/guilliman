import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotionBlogRepository } from './notion-blog.repository';
import { NOTION_CLIENT } from '../../notion/notion.module';
import { LanguagesService } from '../../notion/languages.service';

describe('NotionBlogRepository', () => {
  let repository: NotionBlogRepository;
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
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'NOTION_BLOG_ID') return 'blog-db-id';
        if (key === 'APP_ENVIRONMENT') return 'dev';
        if (key === 'DEVELOPMENT_STAGE') return 'dev-stage-id';
        return defaultValue;
      }),
    };

    mockLanguagesService = {
      getLanguageIdByCode: vi.fn(),
      getLanguageCodeById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionBlogRepository,
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

    repository = module.get<NotionBlogRepository>(NotionBlogRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAll', () => {
    it('should query without language filter if lang is not provided', async () => {
      mockNotion.databases.query.mockResolvedValue({
        results: [
          {
            id: 'page-1',
            properties: {
              Post: { title: [{ plain_text: 'Post 1' }] },
              Slug: { rich_text: [{ plain_text: 'post-1' }] },
              Status: { select: { name: 'Publicado' } },
              Language: { relation: [{ id: 'lang-es-id' }] },
              Translations: { relation: [{ id: 'page-2' }] },
              Stage: { relation: [{ id: 'dev-stage-id' }] },
            },
          },
        ],
      });
      mockLanguagesService.getLanguageCodeById.mockResolvedValue('es');

      const posts = await repository.findAll();

      expect(mockNotion.databases.query).toHaveBeenCalledWith(
        expect.objectContaining({
          database_id: 'blog-db-id',
          filter: {
            and: [
              { property: 'Status', select: { equals: 'Publicado' } },
              { property: 'Stage', relation: { contains: 'dev-stage-id' } },
            ],
          },
        }),
      );
      expect(posts).toHaveLength(1);
      expect(posts[0].Language).toBe('es');
    });

    it('should include language relation filter when lang code is resolved', async () => {
      mockLanguagesService.getLanguageIdByCode.mockResolvedValue('lang-en-id');
      mockNotion.databases.query.mockResolvedValue({ results: [] });

      await repository.findAll('en');

      expect(mockLanguagesService.getLanguageIdByCode).toHaveBeenCalledWith('en');
      expect(mockNotion.databases.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {
            and: [
              { property: 'Status', select: { equals: 'Publicado' } },
              { property: 'Stage', relation: { contains: 'dev-stage-id' } },
              { property: 'Language', relation: { contains: 'lang-en-id' } },
            ],
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should retrieve page and resolve TranslationSlug if translation relation exists', async () => {
      mockNotion.pages.retrieve
        .mockResolvedValueOnce({
          id: 'page-1',
          properties: {
            Post: { title: [{ plain_text: 'Post 1' }] },
            Slug: { rich_text: [{ plain_text: 'post-1' }] },
            Language: { relation: [{ id: 'lang-es-id' }] },
            Translations: { relation: [{ id: 'page-trans-id' }] },
          },
        })
        .mockResolvedValueOnce({
          id: 'page-trans-id',
          properties: {
            Slug: { rich_text: [{ plain_text: 'post-1-en' }] },
          },
        });

      mockLanguagesService.getLanguageCodeById.mockResolvedValue('es');

      const post = await repository.findOne('page-1');

      expect(post.Slug).toBe('post-1');
      expect(post.Language).toBe('es');
      expect(post.TranslationSlug).toBe('post-1-en');
      expect(mockNotion.pages.retrieve).toHaveBeenCalledWith({ page_id: 'page-trans-id' });
    });

    it('should not query translation page if Translations relation is empty', async () => {
      mockNotion.pages.retrieve.mockResolvedValueOnce({
        id: 'page-1',
        properties: {
          Post: { title: [{ plain_text: 'Post 1' }] },
          Slug: { rich_text: [{ plain_text: 'post-1' }] },
          Language: { relation: [] },
          Translations: { relation: [] },
        },
      });

      const post = await repository.findOne('page-1');

      expect(post.TranslationSlug).toBeUndefined();
      expect(mockNotion.pages.retrieve).toHaveBeenCalledTimes(1);
    });
  });
});
