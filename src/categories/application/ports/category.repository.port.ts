import {
  BudgetGroup,
  Category,
  CategoryType,
} from '../../domain/category.entity';
import type {
  TaxCategory,
  TaxDeductionType,
} from '../../../transactions/domain/transaction.entity';

export interface CreateCategoryData {
  userId: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parentId?: string;
  taxCategory?: TaxCategory;
  taxDeductionType?: TaxDeductionType;
  budgetGroup?: BudgetGroup;
}

export abstract class CategoryRepositoryPort {
  abstract create(data: CreateCategoryData): Promise<Category>;
  abstract findById(id: string): Promise<Category | null>;
  abstract findByUserId(userId: string): Promise<Category[]>;
  abstract update(
    id: string,
    data: Partial<Omit<CreateCategoryData, 'userId'>>,
  ): Promise<Category>;
  abstract delete(id: string): Promise<boolean>;
}
