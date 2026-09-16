import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';

import { Client } from '@notionhq/client';

import { NOTION_CLIENT } from '../../notion/notion.module';
import { LanguagesService } from '../../notion/languages.service';
import { ContentBlock } from '../../blog/domain/blog.types';
import { PortfolioRepositoryPort } from '../domain/portfolio-repository.port';
import {
  IProject,
  ISkill,
  IExperience,
  ChildDatabase,
} from '../domain/portfolio.types';

@Injectable()
export class NotionPortfolioRepository implements PortfolioRepositoryPort {
  private readonly databaseId: string;

  constructor(
    @Inject(NOTION_CLIENT) private readonly notion: Client,
    private readonly configService: ConfigService,
    private readonly languagesService: LanguagesService,
  ) {
    this.databaseId =
      this.configService.get<string>('NOTION_PORTFOLIO_ID') || '';
  }

  async findAllChildDatabases(): Promise<ChildDatabase[]> {
    const blocksResponse = await this.notion.blocks.children.list({
      block_id: this.databaseId,
    });

    return (blocksResponse.results as any[])
      .filter((block) => block.type === 'child_database')
      .map((block) => ({
        id: block.id,
        object: block.object,
        type: block.type,
        title: block.child_database.title,
      }));
  }

  async findProjects(blockId: string, lang?: string): Promise<IProject[]> {
    const queryParams: any = {
      database_id: blockId,
      sorts: [{ property: 'Orden', direction: 'ascending' }],
    };

    if (lang) {
      const languageId = await this.languagesService.getLanguageIdByCode(lang);
      if (languageId) {
        queryParams.filter = {
          property: 'Language',
          relation: {
            contains: languageId,
          },
        };
      }
    }

    const response = await this.notion.databases.query(queryParams);

    const projects = await Promise.all(
      (response.results as any[]).map(async (project) => {
        const mapped = await this.mapProjectProperties(project.properties);

        let translationSlug: string | undefined;
        const translationRelation = project.properties.Translations?.relation;
        if (translationRelation && translationRelation.length > 0) {
          try {
            const translatedPageId = translationRelation[0].id;
            const translatedPage: any = await this.notion.pages.retrieve({
              page_id: translatedPageId,
            });
            translationSlug =
              translatedPage.properties.Slug?.rich_text?.[0]?.plain_text ||
              undefined;
          } catch {
            // Ignored if cannot be fetched
          }
        }

        return {
          id: project.id,
          ...mapped,
          TranslationSlug: translationSlug,
        };
      }),
    );

    return projects;
  }

  async getProjectContent(projectId: string): Promise<ContentBlock[]> {
    const response = await this.notion.blocks.children.list({
      block_id: projectId,
      page_size: 100,
    });

    return (response.results as any[])
      .filter((block) => block.type !== 'child_database')
      .map((block) => this.mapContentBlock(block));
  }

  async findSkills(blockId: string): Promise<ISkill[]> {
    const response = await this.notion.databases.query({
      database_id: blockId,
      sorts: [{ property: 'Orden', direction: 'ascending' }],
    });

    return (response.results as any[]).map((skill) => ({
      id: skill.id,
      ...this.mapSkillProperties(skill.properties),
    }));
  }

  async findExperience(blockId: string): Promise<IExperience[]> {
    const response = await this.notion.databases.query({
      database_id: blockId,
      sorts: [{ property: 'Orden', direction: 'ascending' }],
    });

    return (response.results as any[]).map((xp) => ({
      id: xp.id,
      ...this.mapExperienceProperties(xp.properties),
    }));
  }

  async getPortfolioContent(): Promise<ContentBlock[]> {
    const response = await this.notion.blocks.children.list({
      block_id: this.databaseId,
      page_size: 100,
    });

    return (response.results as any[])
      .filter((block) => block.type !== 'child_database')
      .map((block) => this.mapContentBlock(block));
  }

  private async mapProjectProperties(properties: any) {
    let languageCode = '';
    const langRelationId = properties.Language?.relation?.[0]?.id;
    if (langRelationId) {
      languageCode =
        (await this.languagesService.getLanguageCodeById(langRelationId)) || '';
    } else if (properties.Language?.select?.name) {
      languageCode = properties.Language.select.name;
    }

    return {
      Name: properties.Name?.title?.[0]?.plain_text || '',
      Slug: properties.Slug?.rich_text?.[0]?.plain_text || '',
      Tags: properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
      Repository: properties.Repository?.url || '',
      Preview: properties.Preview?.url || '',
      Language: languageCode,
      Orden: properties.Orden?.number || 0,
    };
  }

  private mapSkillProperties(properties: any) {
    return {
      Name: properties.Name?.title?.[0]?.plain_text || '',
      Image_URL: properties.Image_URL?.url || '',
      Orden: properties.Orden?.number || 0,
      Tags: properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
    };
  }

  private mapExperienceProperties(properties: any) {
    return {
      Work: properties.Work?.title?.[0]?.plain_text || '',
      Stack: properties.Stack?.multi_select?.map((tag: any) => tag.name) || [],
      Orden: properties.Orden?.number || 0,
      Period: properties.Period?.rich_text?.[0]?.plain_text || '',
      Description: properties.Description?.rich_text?.[0]?.plain_text || '',
    };
  }

  private mapContentBlock(block: any): ContentBlock {
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
  }
}
