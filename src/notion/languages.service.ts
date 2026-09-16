import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';
import { NOTION_CLIENT } from './notion.constants';

export interface NotionLanguage {
  id: string;
  code: string;
  name: string;
  flag: string;
  isDefault: boolean;
}

@Injectable()
export class LanguagesService {
  private readonly logger = new Logger(LanguagesService.name);
  private readonly databaseId: string;
  private cache: NotionLanguage[] | null = null;
  private cacheTimestamp = 0;
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(NOTION_CLIENT) private readonly notion: Client,
    private readonly configService: ConfigService,
  ) {
    this.databaseId = this.configService.get<string>('NOTION_LANGUAGES_ID') || '';
  }

  async getLanguages(): Promise<NotionLanguage[]> {
    const now = Date.now();
    if (this.cache && now - this.cacheTimestamp < this.ttlMs) {
      return this.cache;
    }

    if (!this.databaseId) {
      this.logger.warn('NOTION_LANGUAGES_ID is not configured');
      return [];
    }

    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
      });

      const languages: NotionLanguage[] = (response.results as any[]).map((page) => {
        const props = page.properties;
        const name = props.Name?.title?.[0]?.plain_text || '';
        const code = props.Code?.rich_text?.[0]?.plain_text || props.Code?.select?.name || '';
        const flag = props.Flag?.rich_text?.[0]?.plain_text || '';
        const isDefault = props.Default?.checkbox || false;

        return {
          id: page.id,
          name,
          code,
          flag,
          isDefault,
        };
      });

      this.cache = languages;
      this.cacheTimestamp = now;
      return languages;
    } catch (error: any) {
      this.logger.error(`Failed to fetch languages from Notion: ${error.message}`);
      return this.cache || [];
    }
  }

  async getLanguageIdByCode(code: string): Promise<string | undefined> {
    const languages = await this.getLanguages();
    const found = languages.find(
      (l) => l.code.toLowerCase() === code.toLowerCase(),
    );
    return found?.id;
  }

  async getLanguageCodeById(id: string): Promise<string | undefined> {
    const languages = await this.getLanguages();
    const found = languages.find((l) => l.id === id);
    return found?.code;
  }

  async getDefaultLanguage(): Promise<NotionLanguage> {
    const languages = await this.getLanguages();
    const defaultLang = languages.find((l) => l.isDefault);
    return (
      defaultLang ||
      languages[0] || {
        id: '',
        code: 'es',
        name: 'Español',
        flag: '🇪🇸',
        isDefault: true,
      }
    );
  }
}
