import { describe, expect, it } from 'vitest';

import { Category } from './category.entity';

describe('Category Domain Entity', () => {
  it('should instantiate a Category entity correctly', () => {
    const now = new Date();
    const category = new Category({
      id: 'cat-1',
      userId: 'user-1',
      name: 'Supermercado',
      icon: 'shopping-cart',
      color: '#00ff00',
      type: 'EXPENSE',
      parentId: 'cat-parent',
      createdAt: now,
      updatedAt: now,
    });

    expect(category.id).toBe('cat-1');
    expect(category.userId).toBe('user-1');
    expect(category.name).toBe('Supermercado');
    expect(category.type).toBe('EXPENSE');
    expect(category.parentId).toBe('cat-parent');
    expect(category.toJSON().icon).toBe('shopping-cart');
  });
});
