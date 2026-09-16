import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { LanguagesService } from './languages.service';

describe('LanguagesService', () => {
  let service: LanguagesService;
  let mockNotion: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockNotion = {
      databases: {
        query: vi.fn(),
      },
    };

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'NOTION_LANGUAGES_ID') return 'mock-languages-db-id';
        return undefined;
      }),
    };

    service = new LanguagesService(mockNotion, mockConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should query Notion and return mapped languages', async () => {
    mockNotion.databases.query.mockResolvedValue({
      results: [
        {
          id: 'lang-es',
          properties: {
            Name: { title: [{ plain_text: 'Español' }] },
            Code: { rich_text: [{ plain_text: 'es' }] },
            Flag: { rich_text: [{ plain_text: '🇪🇸' }] },
            Default: { checkbox: true },
          },
        },
        {
          id: 'lang-en',
          properties: {
            Name: { title: [{ plain_text: 'English' }] },
            Code: { rich_text: [{ plain_text: 'en' }] },
            Flag: { rich_text: [{ plain_text: '🇺🇸' }] },
            Default: { checkbox: false },
          },
        },
      ],
    });

    const languages = await service.getLanguages();
    expect(languages).toHaveLength(2);
    expect(languages[0]).toEqual({
      id: 'lang-es',
      name: 'Español',
      code: 'es',
      flag: '🇪🇸',
      isDefault: true,
    });
    expect(languages[1]).toEqual({
      id: 'lang-en',
      name: 'English',
      code: 'en',
      flag: '🇺🇸',
      isDefault: false,
    });
  });

  it('should resolve language ID by code and code by ID', async () => {
    mockNotion.databases.query.mockResolvedValue({
      results: [
        {
          id: 'lang-es',
          properties: {
            Name: { title: [{ plain_text: 'Español' }] },
            Code: { rich_text: [{ plain_text: 'es' }] },
            Flag: { rich_text: [{ plain_text: '🇪🇸' }] },
            Default: { checkbox: true },
          },
        },
      ],
    });

    const id = await service.getLanguageIdByCode('es');
    expect(id).toBe('lang-es');

    const code = await service.getLanguageCodeById('lang-es');
    expect(code).toBe('es');
  });

  it('should return default language code', async () => {
    mockNotion.databases.query.mockResolvedValue({
      results: [
        {
          id: 'lang-es',
          properties: {
            Name: { title: [{ plain_text: 'Español' }] },
            Code: { rich_text: [{ plain_text: 'es' }] },
            Flag: { rich_text: [{ plain_text: '🇪🇸' }] },
            Default: { checkbox: true },
          },
        },
        {
          id: 'lang-en',
          properties: {
            Name: { title: [{ plain_text: 'English' }] },
            Code: { rich_text: [{ plain_text: 'en' }] },
            Flag: { rich_text: [{ plain_text: '🇺🇸' }] },
            Default: { checkbox: false },
          },
        },
      ],
    });

    const defaultLang = await service.getDefaultLanguage();
    expect(defaultLang.code).toBe('es');
  });
});
