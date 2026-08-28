import { Subscription } from './subscription.entity';

describe('Subscription Entity', () => {
  it('should create a valid Subscription instance', () => {
    const sub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Netflix 4K',
      amount: 15.99,
      currency: 'USD',
      frequency: 'MONTHLY',
      nextDueDate: new Date('2026-09-01'),
    });

    expect(sub.name).toBe('Netflix 4K');
    expect(sub.amount).toBe(15.99);
    expect(sub.frequency).toBe('MONTHLY');
    expect(sub.isActive).toBe(true);
  });

  it('should advance due date correctly for monthly subscriptions', () => {
    const sub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Spotify',
      amount: 9.99,
      frequency: 'MONTHLY',
      nextDueDate: new Date('2026-08-15'),
    });

    const nextDate = sub.calculateNextDueDate();
    expect(nextDate.toISOString().slice(0, 10)).toBe('2026-09-15');
  });

  it('should advance due date correctly for weekly, biweekly, bimonthly, quarterly, semiannual, yearly and custom subscriptions', () => {
    const weeklySub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Clases de Francés',
      amount: 25,
      frequency: 'WEEKLY',
      nextDueDate: new Date('2026-08-01'),
    });
    expect(weeklySub.calculateNextDueDate().toISOString().slice(0, 10)).toBe(
      '2026-08-08',
    );

    const biweeklySub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Membresía Quincenal',
      amount: 40,
      frequency: 'BIWEEKLY',
      nextDueDate: new Date('2026-08-01'),
    });
    expect(biweeklySub.calculateNextDueDate().toISOString().slice(0, 10)).toBe(
      '2026-08-15',
    );

    const bimonthlySub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Mantenimiento de Filtros',
      amount: 60,
      frequency: 'BIMONTHLY',
      nextDueDate: new Date('2026-08-01'),
    });
    expect(bimonthlySub.calculateNextDueDate().toISOString().slice(0, 10)).toBe(
      '2026-10-01',
    );

    const quarterlySub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Seguro Trimestral',
      amount: 150,
      frequency: 'QUARTERLY',
      nextDueDate: new Date('2026-08-01'),
    });
    expect(quarterlySub.calculateNextDueDate().toISOString().slice(0, 10)).toBe(
      '2026-11-01',
    );

    const semiannualSub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Matrícula Semestral',
      amount: 300,
      frequency: 'SEMIANNUAL',
      nextDueDate: new Date('2026-08-01'),
    });
    expect(semiannualSub.calculateNextDueDate().toISOString().slice(0, 10)).toBe(
      '2027-02-01',
    );

    const yearlySub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Dominio Lascar.dev',
      amount: 12,
      frequency: 'YEARLY',
      nextDueDate: new Date('2026-08-01'),
    });
    expect(yearlySub.calculateNextDueDate().toISOString().slice(0, 10)).toBe(
      '2027-08-01',
    );

    const customSub = new Subscription({
      userId: 'user-1',
      accountId: 'acc-1',
      name: 'Recarga de Gas',
      amount: 50,
      frequency: 'CUSTOM',
      customIntervalDays: 45,
      nextDueDate: new Date('2026-08-01'),
    });
    expect(customSub.calculateNextDueDate().toISOString().slice(0, 10)).toBe(
      '2026-09-15',
    );
  });

  it('should throw error on invalid data', () => {
    expect(() => {
      new Subscription({
        userId: '',
        accountId: 'acc-1',
        name: 'Gym',
        amount: 50,
        nextDueDate: new Date(),
      });
    }).toThrow('El userId es requerido');

    expect(() => {
      new Subscription({
        userId: 'user-1',
        accountId: '',
        name: 'Gym',
        amount: 50,
        nextDueDate: new Date(),
      });
    }).toThrow('El accountId es requerido');

    expect(() => {
      new Subscription({
        userId: 'user-1',
        accountId: 'acc-1',
        name: '',
        amount: 50,
        nextDueDate: new Date(),
      });
    }).toThrow('El nombre de la suscripción es requerido');

    expect(() => {
      new Subscription({
        userId: 'user-1',
        accountId: 'acc-1',
        name: 'Gym',
        amount: 0,
        nextDueDate: new Date(),
      });
    }).toThrow('El monto de la suscripción debe ser mayor a 0');
  });
});
