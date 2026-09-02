export const UIT_2026 = 5350;
export const DEDUCTION_FIXED_7_UIT = 7 * UIT_2026;
export const MAX_DEDUCTION_3_UIT = 3 * UIT_2026;

export const DATINCORP_MONTHLY_GROSS = 4080.0;
export const FOURTH_CATEGORY_ADVANCE_RATE = 0.08;
export const DATINCORP_MONTHLY_ADVANCE_TAX =
  DATINCORP_MONTHLY_GROSS * FOURTH_CATEGORY_ADVANCE_RATE; // 326.40

export const INITIAL_TAX_CREDIT_2026 = 2800.0;
export const RUC_LAST_DIGIT = 3;

/**
 * Indicative SUNAT monthly filing schedule for RUC ending in digit 3 (Fiscal Year 2026)
 */
export const SUNAT_DUE_DATES_2026_DIGIT_3: Record<string, string> = {
  '2026-01': '2026-02-18',
  '2026-02': '2026-03-18',
  '2026-03': '2026-04-20',
  '2026-04': '2026-05-19',
  '2026-05': '2026-06-18',
  '2026-06': '2026-07-20',
  '2026-07': '2026-08-19',
  '2026-08': '2026-09-18',
  '2026-09': '2026-10-20',
  '2026-10': '2026-11-19',
  '2026-11': '2026-12-18',
  '2026-12': '2027-01-20',
};
