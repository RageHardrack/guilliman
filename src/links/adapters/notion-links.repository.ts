import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';

import { Client } from '@notionhq/client';

import { ILink } from '../domain/links.types';
import { NOTION_CLIENT } from '../../notion/notion.module';
import { LinksRepositoryPort } from '../domain/links-repository.port';

@Injectable()
export class NotionLinksRepository implements LinksRepositoryPort {
  private readonly databaseId: string;
  private readonly stageId: string;

  constructor(
    @Inject(NOTION_CLIENT) private readonly notion: Client,
    private readonly configService: ConfigService,
  ) {
    this.databaseId =
      this.configService.get<string>('NOTION_LINK_TREE_ID') || '';

    const env = this.configService.get<string>('APP_ENVIRONMENT', 'dev');
    const devEnv = this.configService.get<string>('DEVELOPMENT_STAGE') || '';
    const prodEnv = this.configService.get<string>('PRODUCTION_STAGE') || '';
    this.stageId = env === 'dev' ? devEnv : prodEnv;
  }

  async findAll(): Promise<ILink[]> {
    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      sorts: [{ property: 'Orden', direction: 'ascending' }],
      filter: {
        and: [
          {
            property: 'Display',
            checkbox: {
              equals: true,
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
    });

    return (response.results as any[]).map((link) => ({
      id: link.id,
      ...this.mapProperties(link.properties),
    }));
  }

  private mapProperties(properties: any) {
    return {
      Link: properties.Link?.url || '',
      Orden: properties.Orden?.number || 0,
      Name: properties.Name?.title?.[0]?.plain_text || '',
      Display: properties.Display?.checkbox || false,
      Stage: properties.Stage?.relation?.[0]?.id || '',
    };
  }
}
