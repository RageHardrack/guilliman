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

export interface UpdateCategoryData {
  name?: string;
  type?: CategoryType;
  icon?: string;
  color?: string;
  parentId?: string;
  taxCategory?: TaxCategory;
  taxDeductionType?: TaxDeductionType;
  budgetGroup?: BudgetGroup;
}

/**
 * Every method is scoped by userId: a category that does not exist or
 * belongs to another user must be indistinguishable (404, no mutation).
 * A parentId that is not owned by the user is rejected with 400 before
 * any write.
 */
export abstract class CategoryRepositoryPort {
  abstract create(data: CreateCategoryData): Promise<Category>;
  abstract findById(id: string, userId: string): Promise<Category>;
  abstract findByUserId(userId: string): Promise<Category[]>;
  abstract update(
    id: string,
    userId: string,
    data: UpdateCategoryData,
  ): Promise<Category>;
  abstract delete(id: string, userId: string): Promise<void>;
}
