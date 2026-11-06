import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Category as PrismaCategory } from '@prisma/client';

import { Category } from '../../domain/category.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CategoryRepositoryPort,
  CreateCategoryData,
  UpdateCategoryData,
} from '../../application/ports/category.repository.port';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<Category> {
    await this.assertParentOwned(data.parentId, data.userId);

    const raw = await this.prisma.category.create({
      data: {
        userId: data.userId,
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId,
        taxCategory: data.taxCategory || 'NONE',
        taxDeductionType: data.taxDeductionType || 'NONE',
        budgetGroup: data.budgetGroup || 'UNASSIGNED',
      },
    });
    return this.mapToDomain(raw);
  }

  async findById(id: string, userId: string): Promise<Category> {
    return this.mapToDomain(await this.getOwnedRow(id, userId));
  }

  async findByUserId(userId: string): Promise<Category[]> {
    const rawList = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return rawList.map((raw: PrismaCategory) => this.mapToDomain(raw));
  }

  async update(
    id: string,
    userId: string,
    data: UpdateCategoryData,
  ): Promise<Category> {
    await this.getOwnedRow(id, userId);
    await this.assertParentOwned(data.parentId, userId);

    const raw = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.taxCategory !== undefined && {
          taxCategory: data.taxCategory,
        }),
        ...(data.taxDeductionType !== undefined && {
          taxDeductionType: data.taxDeductionType,
        }),
        ...(data.budgetGroup !== undefined && {
          budgetGroup: data.budgetGroup,
        }),
      },
    });
    return this.mapToDomain(raw);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOwnedRow(id, userId);
    await this.prisma.category.delete({ where: { id } });
  }

  /**
   * Reads by { id, userId } so foreign and missing categories both look
   * absent: the caller gets 404 and no mutation is attempted.
   */
  private async getOwnedRow(
    id: string,
    userId: string,
  ): Promise<PrismaCategory> {
    const row = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('Category not found');
    }
    return row;
  }

  /**
   * A parentId that does not belong to the token user is rejected with 400
   * before any write, so a foreign parent can never be attached.
   */
  private async assertParentOwned(
    parentId: string | undefined,
    userId: string,
  ): Promise<void> {
    if (parentId === undefined || parentId === null) {
      return;
    }

    const parent = await this.prisma.category.findFirst({
      where: { id: parentId, userId },
    });
    if (!parent) {
      throw new BadRequestException(
        'Referenced parent category does not belong to the user',
      );
    }
  }

  private mapToDomain(raw: PrismaCategory): Category {
    return new Category({
      id: raw.id,
      userId: raw.userId,
      name: raw.name,
      icon: raw.icon,
      color: raw.color,
      type: raw.type,
      parentId: raw.parentId,
      taxCategory: raw.taxCategory,
      taxDeductionType: raw.taxDeductionType,
      budgetGroup: raw.budgetGroup,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
