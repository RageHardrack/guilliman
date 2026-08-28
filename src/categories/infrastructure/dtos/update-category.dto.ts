import { ApiPropertyOptional } from '@nestjs/swagger';

import type { CategoryType } from '../../domain/category.entity';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Comida y Restaurantes',
    description: 'Nombre de la categoría',
  })
  name?: string;

  @ApiPropertyOptional({
    enum: ['INCOME', 'EXPENSE'],
    example: 'EXPENSE',
    description: 'Tipo de categoría',
  })
  type?: CategoryType;

  @ApiPropertyOptional({
    example: 'i-heroicons-shopping-cart',
    description: 'Icono representativo',
  })
  icon?: string;

  @ApiPropertyOptional({
    example: '#10B981',
    description: 'Color hexadecimal de la categoría',
  })
  color?: string;

  @ApiPropertyOptional({
    example: 'b7c25a73-12fe-4a4b-87e3-059adfbff011',
    description: 'ID de la categoría padre para subcategorías',
  })
  parentId?: string;

  @ApiPropertyOptional({
    enum: ['NONE', 'FOURTH_CATEGORY_INCOME', 'FIFTH_CATEGORY_INCOME', 'DEDUCTIBLE_EXPENSE_3UIT'],
    example: 'DEDUCTIBLE_EXPENSE_3UIT',
    description: 'Régimen tributario SUNAT por defecto',
  })
  taxCategory?: 'NONE' | 'FOURTH_CATEGORY_INCOME' | 'FIFTH_CATEGORY_INCOME' | 'DEDUCTIBLE_EXPENSE_3UIT';

  @ApiPropertyOptional({
    enum: ['NONE', 'RESTAURANT_BAR', 'HOTEL', 'RENTAL', 'PROFESSIONAL_SERVICE', 'DOMESTIC_WORKER'],
    example: 'RESTAURANT_BAR',
    description: 'Tipo de deducción 3 UIT SUNAT por defecto',
  })
  taxDeductionType?: 'NONE' | 'RESTAURANT_BAR' | 'HOTEL' | 'RENTAL' | 'PROFESSIONAL_SERVICE' | 'DOMESTIC_WORKER';
}
