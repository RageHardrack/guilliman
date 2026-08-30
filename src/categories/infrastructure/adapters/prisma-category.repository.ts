import { Injectable } from '@nestjs/common';

import { Category as PrismaCategory } from '@prisma/client';

import { Category } from '../../domain/category.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CategoryRepositoryPort,
  CreateCategoryData,
} from '../../application/ports/category.repository.port';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<Category> {
    const raw = await this.prisma.category.create({
      data: {
        userId: data.userId,
        name: data.name,
        type: data.type as any,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId,
        taxCategory: (data.taxCategory as any) || 'NONE',
        taxDeductionType: (data.taxDeductionType as any) || 'NONE',
        budgetGroup: (data.budgetGroup as any) || 'UNASSIGNED',
      },
    });
    return this.mapToDomain(raw);
  }

  async findById(id: string): Promise<Category | null> {
    const raw = await this.prisma.category.findUnique({ where: { id } });
    return raw ? this.mapToDomain(raw) : null;
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
    data: Partial<Omit<CreateCategoryData, 'userId'>>,
  ): Promise<Category> {
    const raw = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type as any }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.taxCategory !== undefined && {
          taxCategory: data.taxCategory as any,
        }),
        ...(data.taxDeductionType !== undefined && {
          taxDeductionType: data.taxDeductionType as any,
        }),
        ...(data.budgetGroup !== undefined && {
          budgetGroup: data.budgetGroup as any,
        }),
      },
    });
    return this.mapToDomain(raw);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.category.delete({ where: { id } });
      return true;
    } catch {
      return false;
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
      budgetGroup: raw.budgetGroup as any,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
