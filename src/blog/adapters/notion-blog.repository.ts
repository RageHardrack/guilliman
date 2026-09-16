import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';

import { Client } from '@notionhq/client';

import { NOTION_CLIENT } from '../../notion/notion.module';
import { LanguagesService } from '../../notion/languages.service';
import { IPost, ContentBlock } from '../domain/blog.types';
import { BlogRepositoryPort } from '../domain/blog-repository.port';

@Injectable()
export class NotionBlogRepository implements BlogRepositoryPort {
  private readonly databaseId: string;
  private readonly stageId: string;

  constructor(
    @Inject(NOTION_CLIENT) private readonly notion: Client,
    private readonly configService: ConfigService,
    private readonly languagesService: LanguagesService,
  ) {
    this.databaseId = this.configService.get<string>('NOTION_BLOG_ID') || '';

    const env = this.configService.get<string>('APP_ENVIRONMENT', 'dev');
    const devEnv = this.configService.get<string>('DEVELOPMENT_STAGE') || '';
    const prodEnv = this.configService.get<string>('PRODUCTION_STAGE') || '';
    this.stageId = env === 'dev' ? devEnv : prodEnv;
  }

  async findAll(lang?: string): Promise<IPost[]> {
    const filters: any[] = [
      {
        property: 'Status',
        select: {
          equals: 'Publicado',
        },
      },
      {
        property: 'Stage',
        relation: {
          contains: this.stageId,
        },
      },
    ];

    if (lang) {
      const languageId = await this.languagesService.getLanguageIdByCode(lang);
      if (languageId) {
        filters.push({
          property: 'Language',
          relation: {
            contains: languageId,
          },
        });
      }
    }

    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      page_size: 10,
      filter: {
        and: filters,
      },
      sorts: [{ property: 'Fecha_Publicacion', direction: 'descending' }],
    });

    const posts = await Promise.all(
      (response.results as any[]).map(async (page) => {
        const mapped = await this.mapProperties(page.properties);
        return {
          id: page.id,
          ...mapped,
        };
      }),
    );

    return posts;
  }

  async findOne(pageId: string): Promise<IPost> {
    const page: any = await this.notion.pages.retrieve({ page_id: pageId });
    const mapped = await this.mapProperties(page.properties);

    let translationSlug: string | undefined;
    const translationRelation = page.properties.Translations?.relation;
    if (translationRelation && translationRelation.length > 0) {
      try {
        const translatedPageId = translationRelation[0].id;
        const translatedPage: any = await this.notion.pages.retrieve({
          page_id: translatedPageId,
        });
        translationSlug =
          translatedPage.properties.Slug?.rich_text?.[0]?.plain_text || undefined;
      } catch {
        // Ignored if translated page cannot be retrieved
      }
    }

    return {
      id: page.id,
      ...mapped,
      TranslationSlug: translationSlug,
    };
  }

  async getPostContent(blockId: string): Promise<ContentBlock[]> {
    const response = await this.notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
    });

    return (response.results as any[]).map((block) => {
      const type = block.type;
      return {
        object: block.object,
        id: block.id,
        type,
        body:
          type === 'image'
            ? block[type]?.file?.url || ''
            : block[type]?.rich_text?.[0]?.plain_text || '',
        caption:
          type === 'image'
            ? block[type]?.caption?.[0]?.plain_text || ''
            : block[type]?.rich_text?.[0]?.plain_text || '',
        emoji: type === 'callout' ? block[type]?.icon?.emoji || null : null,
      };
    });
  }

  private async mapProperties(properties: any) {
    let languageCode = '';
    const langRelationId = properties.Language?.relation?.[0]?.id;
    if (langRelationId) {
      languageCode =
        (await this.languagesService.getLanguageCodeById(langRelationId)) || '';
    } else if (properties.Language?.select?.name) {
      languageCode = properties.Language.select.name;
    }

    return {
      Tags: properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
      Image_URL: properties.Image_URL?.url || '',
      Status: properties.Status?.select?.name || '',
      Slug: properties.Slug?.rich_text?.[0]?.plain_text || '',
      Fecha_Publicacion: properties.Fecha_Publicacion?.date?.start || '',
      Brief: properties.Brief?.rich_text?.[0]?.plain_text || '',
      Post: properties.Post?.title?.[0]?.plain_text || '',
      Prevent_Index: properties.Prevent_Index?.checkbox || false,
      Language: languageCode,
      Stage: properties.Stage?.relation?.[0]?.id || '',
    };
  }
}
