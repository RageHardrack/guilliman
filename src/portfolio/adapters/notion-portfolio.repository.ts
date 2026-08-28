import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';

import { Client } from '@notionhq/client';

import { NOTION_CLIENT } from '../../notion/notion.module';
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

  async findProjects(blockId: string): Promise<IProject[]> {
    const response = await this.notion.databases.query({
      database_id: blockId,
      sorts: [{ property: 'Orden', direction: 'ascending' }],
    });

    return (response.results as any[]).map((project) => ({
      id: project.id,
      ...this.mapProjectProperties(project.properties),
    }));
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

  private mapProjectProperties(properties: any) {
    return {
      Name: properties.Name?.title?.[0]?.plain_text || '',
      Slug: properties.Slug?.rich_text?.[0]?.plain_text || '',
      Tags: properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
      Repository: properties.Repository?.url || '',
      Preview: properties.Preview?.url || '',
      Language: properties.Language?.select?.name || '',
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
