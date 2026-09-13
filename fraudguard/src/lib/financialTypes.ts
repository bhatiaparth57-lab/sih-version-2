import type { Risk } from '@/lib/data';

/** All financial amounts in this module are Indian rupees (INR), not lakhs. */
export type InvoiceVerificationStatus = 'pending' | 'verified' | 'warning' | 'failed';
export type FinancialVerdict = 'verified' | 'warning' | 'failed';

export interface FinancialVendor {
  id: string;
  name: string;
  pan?: string;
  gstin?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount: number;
}

export interface ApprovedBudget {
  projectId: string;
  totalAmount: number;
  categories: BudgetCategory[];
}

export interface ActualExpenditure {
  projectId: string;
  totalAmount: number;
  byCategory: Record<string, number>;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  /** Stable catalog key used to look up a reference (market) unit price. */
  itemKey?: string;
  categoryId?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  claimedAmount: number;
}

export interface Invoice {
  id: string;
  projectId: string;
  vendorId: string;
  invoiceDate: string;
  invoiceNumber: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  claimedAmount: number;
  taxAmount: number;
  totalAmount: number;
  supportingDocumentUrl?: string;
  supportingFileRef?: string;
  verificationStatus: InvoiceVerificationStatus;
  categoryId?: string;
  lineItems: InvoiceLineItem[];
}

export interface ReferencePrice {
  itemKey: string;
  label: string;
  unit: string;
  unitPrice: number;
}

export interface FraudFinding {
  id: string;
  ruleName: string;
  severity: Risk;
  explanation: string;
  affectedAmount: number;
  recommendedAction: string;
  invoiceId?: string;
  invoiceNumber?: string;
  projectId?: string;
  points: number;
}

export interface ScoreContribution {
  ruleName: string;
  points: number;
  reason: string;
}

export interface FinancialVerificationResult {
  projectId: string;
  engine: 'rule-based';
  engineLabel: string;
  score: number;
  risk: Risk;
  verdict: FinancialVerdict;
  findings: FraudFinding[];
  scoreBreakdown: ScoreContribution[];
  potentialOverbillAmount: number;
  invoiceCount: number;
  approvedBudget: number;
  actualExpenditure: number;
  remainingBudget: number;
}

export interface FinancialDataset {
  source: 'demo' | 'supabase';
  invoices: Invoice[];
  vendors: FinancialVendor[];
  budgets: Record<string, ApprovedBudget>;
  expenditure: Record<string, ActualExpenditure>;
  referencePrices: ReferencePrice[];
}

export interface VerificationOptions {
  /** Absolute INR tolerance for total / line-item arithmetic (rounding). Default 1. */
  moneyToleranceInr?: number;
  /** Flag unit prices at or above reference × this multiplier. Default 1.5. */
  unitPriceMultiplier?: number;
  /** Days between invoices from the same vendor/project treated as rapid repeats. Default 7. */
  rapidRepeatDays?: number;
  /** Days window for near-duplicate detection. Default 14. */
  nearDuplicateDays?: number;
  /** Relative amount gap treated as near-duplicate. Default 0.05 (5%). */
  nearDuplicateAmountRatio?: number;
}

export const LAKHS_TO_INR = 100_000;
export const lakhsToInr = (lakhs: number) => Math.round(lakhs * LAKHS_TO_INR);
export const inrToLakhs = (inr: number) => inr / LAKHS_TO_INR;

export function formatInr(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
