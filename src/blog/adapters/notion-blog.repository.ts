import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';

import { Client } from '@notionhq/client';

import { NOTION_CLIENT } from '../../notion/notion.module';
import { IPost, ContentBlock } from '../domain/blog.types';
import { BlogRepositoryPort } from '../domain/blog-repository.port';

@Injectable()
export class NotionBlogRepository implements BlogRepositoryPort {
  private readonly databaseId: string;
  private readonly stageId: string;

  constructor(
    @Inject(NOTION_CLIENT) private readonly notion: Client,
    private readonly configService: ConfigService,
  ) {
    this.databaseId = this.configService.get<string>('NOTION_BLOG_ID') || '';

    const env = this.configService.get<string>('APP_ENVIRONMENT', 'dev');
    const devEnv = this.configService.get<string>('DEVELOPMENT_STAGE') || '';
    const prodEnv = this.configService.get<string>('PRODUCTION_STAGE') || '';
    this.stageId = env === 'dev' ? devEnv : prodEnv;
  }

  async findAll(): Promise<IPost[]> {
    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      page_size: 10,
      filter: {
        and: [
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
        ],
      },
      sorts: [{ property: 'Fecha_Publicacion', direction: 'descending' }],
    });

    return (response.results as any[]).map((page) => ({
      id: page.id,
      ...this.mapProperties(page.properties),
    }));
  }

  async findOne(pageId: string): Promise<IPost> {
    const page: any = await this.notion.pages.retrieve({ page_id: pageId });
    return {
      id: page.id,
      ...this.mapProperties(page.properties),
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

  private mapProperties(properties: any) {
    return {
      Tags: properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
      Image_URL: properties.Image_URL?.url || '',
      Status: properties.Status?.select?.name || '',
      Slug: properties.Slug?.rich_text?.[0]?.plain_text || '',
      Fecha_Publicacion: properties.Fecha_Publicacion?.date?.start || '',
      Brief: properties.Brief?.rich_text?.[0]?.plain_text || '',
      Post: properties.Post?.title?.[0]?.plain_text || '',
      Prevent_Index: properties.Prevent_Index?.checkbox || false,
      Language: properties.Language?.select?.name || '',
      Stage: properties.Stage?.relation?.[0]?.id || '',
    };
  }
}
