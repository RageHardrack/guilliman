export interface TaxBracket {
  bracketNumber: number;
  description: string;
  rate: number;
  uitRange: string;
  taxableAmount: number;
  taxAmount: number;
}

export interface TaxDeductibleItem {
  id: string;
  date: Date;
  note?: string | null;
  documentType: string;
  documentNumber?: string | null;
  deductionType: string;
  originalAmount: number;
  deductionPercentage: number;
  deductibleAmount: number;
}

export interface TaxProjectionResult {
  year: number;
  uitValue: number;
  currency: string;
  
  // 4ta Categoría
  grossFourthCategory: number;
  fourthCategoryDeduction20: number; // 20% deducción legal (máx 24 UIT)
  netFourthCategory: number;
  
  // 5ta Categoría
  grossFifthCategory: number;
  netFifthCategory: number;
  
  // Renta Total Bruta & Neta de Trabajo
  totalGrossIncome: number;
  totalNetWorkIncome: number;
  
  // Deducciones
  fixedDeduction7Uit: number; // 7 UIT
  deductible3UitLimit: number; // 3 UIT
  appliedDeductible3Uit: number; // Deducciones adicionales reales
  totalDeductions: number;
  
  // Base Imponible
  netTaxableIncome: number;
  
  // Tramos Progresivos
  brackets: TaxBracket[];
  totalCalculatedTax: number;
  
  // Retenciones
  fourthCategoryWithholdings: number;
  fifthCategoryWithholdings: number;
  totalWithholdings: number;
  
  // Saldo
  estimatedTaxDue: number; // Positivo: Por pagar | Negativo: Saldo a favor
  status: 'PAYMENT_DUE' | 'REFUND_DUE' | 'ZERO';
}
