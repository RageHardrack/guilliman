import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';

import { Client } from '@notionhq/client';

import { NOTION_CLIENT } from '../../notion/notion.module';
import { ContentBlock } from '../../blog/domain/blog.types';
import { AboutRepositoryPort } from '../domain/about-repository.port';

@Injectable()
export class NotionAboutRepository implements AboutRepositoryPort {
  private readonly databaseId: string;

  constructor(
    @Inject(NOTION_CLIENT) private readonly notion: Client,
    private readonly configService: ConfigService,
  ) {
    this.databaseId = this.configService.get<string>('NOTION_ABOUT_ID') || '';
  }

  async getAboutContent(): Promise<ContentBlock[]> {
    const response = await this.notion.blocks.children.list({
      block_id: this.databaseId,
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
}
