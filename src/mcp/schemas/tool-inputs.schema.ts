import { z } from 'zod';

export const GetFiscalSummarySchema = {
  fiscal_year: z
    .number()
    .int()
    .default(2026)
    .describe('Año fiscal a consultar (ej. 2026)'),
};

export const GetMonthlyTaxChecklistSchema = {
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Debe tener formato YYYY-MM (ej. 2026-09)')
    .describe("Período fiscal en formato YYYY-MM (ej. '2026-09')"),
};

export const SimulateTaxScenarioSchema = {
  additional_income_4th: z
    .number()
    .default(0)
    .describe(
      'Ingresos brutos adicionales proyectados en 4ta categoría en PEN (ej. 5000)',
    ),
  additional_expenses_3uit: z
    .number()
    .default(0)
    .describe(
      'Gastos deducibles adicionales proyectados con DNI/RUC en PEN (ej. 2000)',
    ),
  fiscal_year: z
    .number()
    .int()
    .default(2026)
    .describe('Año fiscal de simulación'),
};

export const GetNetWorthAndLiquiditySchema = {
  base_currency: z
    .enum(['USD', 'PEN', 'VES'])
    .default('USD')
    .describe('Moneda base para consolidación del reporte (USD, PEN o VES)'),
};

export const GetBudgetAuditSchema = {
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Debe tener formato YYYY-MM (ej. 2026-09)')
    .describe("Período a auditar en formato YYYY-MM (ej. '2026-09')"),
};

export const CreateTransactionSchema = {
  account_id: z
    .string()
    .uuid('Debe ser un UUID válido de cuenta')
    .describe('ID de la cuenta bancaria o billetera'),
  amount: z.number().positive('El monto debe ser un número positivo'),
  currency: z
    .enum(['USD', 'PEN', 'VES'])
    .describe('Moneda de la transacción (USD, PEN o VES)'),
  type: z
    .enum(['INCOME', 'EXPENSE', 'TRANSFER'])
    .describe('Tipo de movimiento'),
  category_id: z
    .string()
    .uuid('Debe ser un UUID válido de categoría')
    .optional()
    .describe('ID de la categoría (opcional)'),
  category: z
    .string()
    .optional()
    .describe("Nombre o etiqueta de la categoría (ej. 'Alimentación')"),
  description: z
    .string()
    .describe("Descripción o concepto del movimiento (ej. 'Almuerzo en restaurante')"),
  is_deductible_3uit: z
    .boolean()
    .default(false)
    .describe(
      'Indica si cuenta con comprobante electrónico con DNI para deducción SUNAT (3 UIT)',
    ),
  tax_deduction_type: z
    .enum([
      'NONE',
      'RESTAURANT_BAR',
      'HOTEL',
      'RENTAL',
      'PROFESSIONAL_SERVICE',
      'DOMESTIC_WORKER',
    ])
    .default('NONE')
    .describe('Tipo específico de gasto deducible 3 UIT si aplica'),
  transaction_date: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('Fecha en formato ISO 8601 UTC (opcional, por defecto ahora)'),
};

export const RecordDebtPaymentSchema = {
  source_account_id: z
    .string()
    .uuid('Debe ser un UUID válido')
    .describe('Cuenta origen bancaria o billetera de donde salen los fondos (OBLIGATORIA)'),
  target_debt_id: z
    .string()
    .uuid('Debe ser un UUID válido')
    .describe('Identificador del préstamo o tarjeta de crédito a pagar'),
  amount: z
    .number()
    .positive('El monto del abono debe ser mayor a 0'),
  currency: z
    .enum(['USD', 'PEN', 'VES'])
    .describe('Moneda del pago'),
  payment_date: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('Fecha del pago en formato ISO 8601 (opcional)'),
  note: z
    .string()
    .optional()
    .describe('Nota o comentario adicional sobre el abono'),
};
