import { Budget } from './budget.entity';

describe('Budget Entity', () => {
  it('should create a valid Budget instance', () => {
    const budget = new Budget({
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 400,
      currency: 'PEN',
      period: 'MONTHLY',
    });

    expect(budget.userId).toBe('user-1');
    expect(budget.categoryId).toBe('cat-1');
    expect(budget.amount).toBe(400);
    expect(budget.currency).toBe('PEN');
    expect(budget.period).toBe('MONTHLY');
    expect(budget.toJSON()).toHaveProperty('amount', 400);
  });

  it('should throw error if userId is missing', () => {
    expect(() => {
      new Budget({
        userId: '',
        categoryId: 'cat-1',
        amount: 400,
      });
    }).toThrow('El userId es requerido para el presupuesto');
  });

  it('should throw error if categoryId is missing', () => {
    expect(() => {
      new Budget({
        userId: 'user-1',
        categoryId: '',
        amount: 400,
      });
    }).toThrow('El categoryId es requerido para el presupuesto');
  });

  it('should throw error if amount is zero or negative', () => {
    expect(() => {
      new Budget({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 0,
      });
    }).toThrow('El monto del presupuesto debe ser mayor a 0');

    expect(() => {
      new Budget({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: -50,
      });
    }).toThrow('El monto del presupuesto debe ser mayor a 0');
  });
});
