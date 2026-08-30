import type {
  TaxCategory,
  TaxDeductionType,
} from '../../transactions/domain/transaction.entity';

export type CategoryType = 'INCOME' | 'EXPENSE';
export type BudgetGroup = 'NEEDS' | 'WANTS' | 'SAVINGS' | 'UNASSIGNED';

export interface CategoryProps {
  id: string;
  userId: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  type: CategoryType;
  parentId?: string | null;
  taxCategory?: TaxCategory;
  taxDeductionType?: TaxDeductionType;
  budgetGroup?: BudgetGroup;
  createdAt: Date;
  updatedAt: Date;
}

export class Category {
  constructor(private readonly props: CategoryProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get icon(): string | null | undefined {
    return this.props.icon;
  }
  get color(): string | null | undefined {
    return this.props.color;
  }
  get type(): CategoryType {
    return this.props.type;
  }
  get parentId(): string | null | undefined {
    return this.props.parentId;
  }
  get taxCategory(): TaxCategory {
    return this.props.taxCategory || 'NONE';
  }
  get taxDeductionType(): TaxDeductionType {
    return this.props.taxDeductionType || 'NONE';
  }
  get budgetGroup(): BudgetGroup {
    return this.props.budgetGroup || 'UNASSIGNED';
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): CategoryProps {
    return { ...this.props, budgetGroup: this.budgetGroup };
  }
}
