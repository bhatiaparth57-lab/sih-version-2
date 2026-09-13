import type { Risk } from '@/lib/data';
import type {
  ActualExpenditure,
  ApprovedBudget,
  FinancialVerificationResult,
  FinancialVerdict,
  FraudFinding,
  Invoice,
  ReferencePrice,
  ScoreContribution,
  VerificationOptions,
} from '@/lib/financialTypes';

export const ENGINE_LABEL = 'Transparent rule-based financial verification engine';

const DEFAULTS: Required<VerificationOptions> = {
  moneyToleranceInr: 1,
  unitPriceMultiplier: 1.5,
  rapidRepeatDays: 7,
  nearDuplicateDays: 14,
  nearDuplicateAmountRatio: 0.05,
};

const POINTS: Record<Risk, number> = {
  CRITICAL: 22,
  HIGH: 16,
  MEDIUM: 10,
  LOW: 5,
};

const OVERBILL_RULES = new Set([
  'claimed_gt_approved_budget',
  'invoice_gt_remaining_budget',
  'line_qty_price_mismatch',
  'invoice_total_mismatch',
  'high_unit_price',
  'spending_exceeds_allocation',
  'category_budget_exceeded',
]);

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(Date.parse(a) - Date.parse(b));
  if (Number.isNaN(ms)) return Number.POSITIVE_INFINITY;
  return ms / 86_400_000;
}

function withinTol(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

function classifyRisk(score: number): Risk {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function verdictFromFindings(findings: FraudFinding[]): FinancialVerdict {
  if (findings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')) return 'failed';
  if (findings.some((f) => f.severity === 'MEDIUM')) return 'warning';
  return 'verified';
}

function finding(
  partial: Omit<FraudFinding, 'id' | 'points'> & { id?: string },
): FraudFinding {
  const points = POINTS[partial.severity];
  return {
    ...partial,
    id: partial.id ?? `${partial.ruleName}:${partial.invoiceId ?? partial.projectId ?? 'project'}`,
    points,
  };
}

function lineSum(invoice: Invoice): number {
  if (!invoice.lineItems.length) return invoice.claimedAmount;
  return invoice.lineItems.reduce((s, li) => s + (Number.isFinite(li.claimedAmount) ? li.claimedAmount : 0), 0);
}

function expectedTotal(invoice: Invoice): number {
  // Invoice total should equal line-item claimed amounts plus invoice-level tax.
  return roundMoney(lineSum(invoice) + (Number.isFinite(invoice.taxAmount) ? invoice.taxAmount : 0));
}

function billedForProject(invoices: Invoice[], projectId: string, exceptId?: string): number {
  return invoices
    .filter((inv) => inv.projectId === projectId && inv.id !== exceptId)
    .reduce((s, inv) => s + (Number.isFinite(inv.totalAmount) ? inv.totalAmount : 0), 0);
}

function categoryBilled(invoices: Invoice[], projectId: string, categoryId: string): number {
  let sum = 0;
  for (const inv of invoices) {
    if (inv.projectId !== projectId) continue;
    const fromLines = inv.lineItems
      .filter((li) => li.categoryId === categoryId)
      .reduce((s, li) => s + li.claimedAmount, 0);
    if (fromLines > 0) sum += fromLines;
    else if (inv.categoryId === categoryId) sum += inv.claimedAmount;
  }
  return sum;
}

export function verifyInvoices(input: {
  projectId: string;
  invoices: Invoice[];
  allInvoices?: Invoice[];
  budget?: ApprovedBudget;
  expenditure?: ActualExpenditure;
  referencePrices?: ReferencePrice[];
  options?: VerificationOptions;
}): FinancialVerificationResult {
  const opts = { ...DEFAULTS, ...input.options };
  const projectInvoices = input.invoices.filter((i) => i.projectId === input.projectId);
  const universe = input.allInvoices ?? input.invoices;
  const findings: FraudFinding[] = [];
  const ref = new Map((input.referencePrices ?? []).map((r) => [r.itemKey, r]));
  const approved = input.budget?.totalAmount ?? 0;
  const actual = input.expenditure?.totalAmount ?? projectInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const remainingBudget = roundMoney(approved - billedForProject(projectInvoices, input.projectId));

  // --- Project-level allocation ---
  // Overspend = actual expenditure − approved budget (floored at 0).
  if (approved > 0 && actual > approved + opts.moneyToleranceInr) {
    const excess = roundMoney(actual - approved);
    findings.push(finding({
      ruleName: 'spending_exceeds_allocation',
      severity: excess / approved >= 0.15 ? 'CRITICAL' : 'HIGH',
      projectId: input.projectId,
      affectedAmount: excess,
      explanation: `Actual expenditure ${actual.toLocaleString('en-IN')} exceeds approved budget ${approved.toLocaleString('en-IN')} by ${excess.toLocaleString('en-IN')} INR (${((excess / approved) * 100).toFixed(1)}%).`,
      recommendedAction: 'Freeze further disbursement and reconcile the utilisation certificate against sanctioned heads.',
    }));
  }

  if (input.budget?.categories?.length) {
    for (const cat of input.budget.categories) {
      const spentCat = input.expenditure?.byCategory[cat.id] ?? categoryBilled(projectInvoices, input.projectId, cat.id);
      if (spentCat > cat.allocatedAmount + opts.moneyToleranceInr) {
        const excess = roundMoney(spentCat - cat.allocatedAmount);
        findings.push(finding({
          ruleName: 'category_budget_exceeded',
          severity: 'HIGH',
          projectId: input.projectId,
          affectedAmount: excess,
          explanation: `Category “${cat.name}” spent ${spentCat.toLocaleString('en-IN')} against an allocation of ${cat.allocatedAmount.toLocaleString('en-IN')} (over by ${excess.toLocaleString('en-IN')} INR).`,
          recommendedAction: `Require a revised estimate or reappropriation approval for ${cat.name} before honouring further bills.`,
          id: `category_budget_exceeded:${input.projectId}:${cat.id}`,
        }));
      }
    }
  }

  for (const inv of projectInvoices) {
    const missing: string[] = [];
    if (!inv.invoiceNumber?.trim()) missing.push('invoice number');
    if (!inv.vendorId?.trim()) missing.push('vendor');
    if (!inv.invoiceDate?.trim() || Number.isNaN(Date.parse(inv.invoiceDate))) missing.push('invoice date');
    if (!Number.isFinite(inv.totalAmount)) missing.push('total amount');
    if (missing.length) {
      findings.push(finding({
        ruleName: 'missing_required_fields',
        severity: 'MEDIUM',
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        projectId: inv.projectId,
        affectedAmount: Number.isFinite(inv.totalAmount) ? inv.totalAmount : 0,
        explanation: `Invoice ${inv.invoiceNumber || inv.id} is missing ${missing.join(', ')}.`,
        recommendedAction: 'Return the bill to the vendor and withhold payment until mandatory fields are complete.',
      }));
    }

    for (const li of inv.lineItems) {
      if (!Number.isFinite(li.quantity) || li.quantity <= 0) {
        findings.push(finding({
          ruleName: 'invalid_quantity',
          severity: 'HIGH',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          projectId: inv.projectId,
          affectedAmount: li.claimedAmount,
          explanation: `Line “${li.description}” on ${inv.invoiceNumber} has quantity ${li.quantity}. Quantity must be a positive number.`,
          recommendedAction: 'Reject the line item and request a corrected invoice.',
          id: `invalid_quantity:${li.id}`,
        }));
      }

      // Expected line amount = quantity × unit price (compared within rounding tolerance).
      if (Number.isFinite(li.quantity) && Number.isFinite(li.unitPrice) && Number.isFinite(li.claimedAmount)) {
        const expected = roundMoney(li.quantity * li.unitPrice);
        if (!withinTol(expected, li.claimedAmount, opts.moneyToleranceInr)) {
          findings.push(finding({
            ruleName: 'line_qty_price_mismatch',
            severity: 'HIGH',
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            projectId: inv.projectId,
            affectedAmount: roundMoney(Math.abs(li.claimedAmount - expected)),
            explanation: `Line “${li.description}” on ${inv.invoiceNumber}: ${li.quantity} × ${li.unitPrice.toLocaleString('en-IN')} = ${expected.toLocaleString('en-IN')}, but claimed amount is ${li.claimedAmount.toLocaleString('en-IN')}.`,
            recommendedAction: 'Correct the line arithmetic before passing the bill.',
            id: `line_qty_price_mismatch:${li.id}`,
          }));
        }
      }

      if (li.itemKey && ref.has(li.itemKey) && Number.isFinite(li.unitPrice) && li.unitPrice > 0) {
        const market = ref.get(li.itemKey)!;
        // Suspicious if billed unit price ≥ configured reference × multiplier (default 1.5×).
        if (li.unitPrice >= market.unitPrice * opts.unitPriceMultiplier) {
          const extra = roundMoney((li.unitPrice - market.unitPrice) * Math.max(li.quantity, 0));
          findings.push(finding({
            ruleName: 'high_unit_price',
            severity: li.unitPrice >= market.unitPrice * 3 ? 'CRITICAL' : 'HIGH',
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            projectId: inv.projectId,
            affectedAmount: extra,
            explanation: `“${li.description}” billed at ${li.unitPrice.toLocaleString('en-IN')} INR/${li.unit} versus reference ${market.unitPrice.toLocaleString('en-IN')} (${(li.unitPrice / market.unitPrice).toFixed(1)}×). Excess versus reference ≈ ${extra.toLocaleString('en-IN')} INR.`,
            recommendedAction: 'Seek rate analysis / market quotation and recover the excess if unjustified.',
            id: `high_unit_price:${li.id}`,
          }));
        }
      }
    }

    const expectedInvTotal = expectedTotal(inv);
    if (Number.isFinite(inv.totalAmount) && !withinTol(expectedInvTotal, inv.totalAmount, opts.moneyToleranceInr)) {
      findings.push(finding({
        ruleName: 'invoice_total_mismatch',
        severity: 'HIGH',
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        projectId: inv.projectId,
        affectedAmount: roundMoney(Math.abs(inv.totalAmount - expectedInvTotal)),
        explanation: `Invoice ${inv.invoiceNumber} total ${inv.totalAmount.toLocaleString('en-IN')} does not equal line items (${lineSum(inv).toLocaleString('en-IN')}) + tax (${(inv.taxAmount || 0).toLocaleString('en-IN')}) = ${expectedInvTotal.toLocaleString('en-IN')}.`,
        recommendedAction: 'Recompute GST and line totals; do not pass a self-inconsistent bill.',
      }));
    }

    if (approved > 0 && Number.isFinite(inv.claimedAmount) && inv.claimedAmount > approved + opts.moneyToleranceInr) {
      findings.push(finding({
        ruleName: 'claimed_gt_approved_budget',
        severity: 'CRITICAL',
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        projectId: inv.projectId,
        affectedAmount: roundMoney(inv.claimedAmount - approved),
        explanation: `Invoice ${inv.invoiceNumber} claimed ${inv.claimedAmount.toLocaleString('en-IN')} which is greater than the entire approved project budget ${approved.toLocaleString('en-IN')}.`,
        recommendedAction: 'Reject the claim and verify whether the invoice was attached to the wrong project.',
      }));
    }

    // Remaining budget for this bill = approved − sum of other invoices on the same project.
    const remainingIfAccepted = roundMoney(approved - billedForProject(projectInvoices, inv.projectId, inv.id));
    if (approved > 0 && Number.isFinite(inv.totalAmount) && inv.totalAmount > remainingIfAccepted + opts.moneyToleranceInr) {
      findings.push(finding({
        ruleName: 'invoice_gt_remaining_budget',
        severity: 'CRITICAL',
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        projectId: inv.projectId,
        affectedAmount: roundMoney(inv.totalAmount - Math.max(remainingIfAccepted, 0)),
        explanation: `Invoice ${inv.invoiceNumber} total ${inv.totalAmount.toLocaleString('en-IN')} exceeds remaining budget ${Math.max(remainingIfAccepted, 0).toLocaleString('en-IN')} after other bills on ${inv.projectId}.`,
        recommendedAction: 'Do not authorise payment beyond the sanctioned balance; initiate an overbilling review.',
      }));
    }

    const dupes = universe.filter(
      (other) => other.id !== inv.id && other.invoiceNumber.trim() === inv.invoiceNumber.trim(),
    );
    if (dupes.length) {
      findings.push(finding({
        ruleName: 'duplicate_invoice_number',
        severity: 'CRITICAL',
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        projectId: inv.projectId,
        affectedAmount: inv.totalAmount,
        explanation: `Invoice number ${inv.invoiceNumber} is reused on ${dupes.map((d) => `${d.id} (${d.projectId}, ${d.totalAmount.toLocaleString('en-IN')} INR)`).join('; ')}.`,
        recommendedAction: 'Treat as a suspected duplicate billing and match against payment history before release.',
      }));
    }

    const near = universe.filter((other) => {
      if (other.id === inv.id) return false;
      if (other.projectId !== inv.projectId || other.vendorId !== inv.vendorId) return false;
      if (other.invoiceNumber.trim() === inv.invoiceNumber.trim()) return false;
      if (daysBetween(other.invoiceDate, inv.invoiceDate) > opts.nearDuplicateDays) return false;
      const base = Math.max(inv.totalAmount, other.totalAmount, 1);
      return Math.abs(inv.totalAmount - other.totalAmount) / base <= opts.nearDuplicateAmountRatio;
    });
    if (near.length) {
      findings.push(finding({
        ruleName: 'near_duplicate_invoice',
        severity: 'HIGH',
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        projectId: inv.projectId,
        affectedAmount: inv.totalAmount,
        explanation: `Invoice ${inv.invoiceNumber} is a near-duplicate of ${near.map((n) => n.invoiceNumber).join(', ')} (same project and vendor, amount within ${(opts.nearDuplicateAmountRatio * 100).toFixed(0)}%, within ${opts.nearDuplicateDays} days).`,
        recommendedAction: 'Confirm these are distinct work items; otherwise recover the overlapping claim.',
      }));
    }
  }

  // Rapid repeats: same project + vendor, ≥2 invoices inside the configured window.
  const byVendor = new Map<string, Invoice[]>();
  for (const inv of projectInvoices) {
    const list = byVendor.get(inv.vendorId) ?? [];
    list.push(inv);
    byVendor.set(inv.vendorId, list);
  }
  for (const [vendorId, list] of byVendor) {
    const sorted = [...list].sort((a, b) => Date.parse(a.invoiceDate) - Date.parse(b.invoiceDate));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gap = daysBetween(prev.invoiceDate, curr.invoiceDate);
      if (gap <= opts.rapidRepeatDays) {
        findings.push(finding({
          ruleName: 'rapid_repeat_invoices',
          severity: 'MEDIUM',
          invoiceId: curr.id,
          invoiceNumber: curr.invoiceNumber,
          projectId: curr.projectId,
          affectedAmount: curr.totalAmount,
          explanation: `Vendor ${vendorId} submitted ${curr.invoiceNumber} only ${gap.toFixed(0)} day(s) after ${prev.invoiceNumber} on the same project (threshold ${opts.rapidRepeatDays} days).`,
          recommendedAction: 'Review whether the work progressed enough to justify a second bill in this window.',
          id: `rapid_repeat_invoices:${curr.id}:${prev.id}`,
        }));
      }
    }
  }

  const unique = dedupeFindings(findings);
  const scoreBreakdown: ScoreContribution[] = unique.map((f) => ({
    ruleName: f.ruleName,
    points: f.points,
    reason: f.explanation,
  }));
  const rawScore = unique.reduce((s, f) => s + f.points, 0);
  const score = Math.min(100, rawScore);
  const potentialOverbillAmount = sumOverbill(unique);

  return {
    projectId: input.projectId,
    engine: 'rule-based',
    engineLabel: ENGINE_LABEL,
    score,
    risk: classifyRisk(score),
    verdict: projectInvoices.length === 0 ? 'verified' : verdictFromFindings(unique),
    findings: unique,
    scoreBreakdown,
    potentialOverbillAmount,
    invoiceCount: projectInvoices.length,
    approvedBudget: approved,
    actualExpenditure: actual,
    remainingBudget,
  };
}

export function verifyPortfolio(input: {
  projectIds: string[];
  invoices: Invoice[];
  budgets: Record<string, ApprovedBudget>;
  expenditure: Record<string, ActualExpenditure>;
  referencePrices?: ReferencePrice[];
  options?: VerificationOptions;
}): FinancialVerificationResult[] {
  return input.projectIds.map((projectId) =>
    verifyInvoices({
      projectId,
      invoices: input.invoices.filter((i) => i.projectId === projectId),
      allInvoices: input.invoices,
      budget: input.budgets[projectId],
      expenditure: input.expenditure[projectId],
      referencePrices: input.referencePrices,
      options: input.options,
    }),
  );
}

function dedupeFindings(findings: FraudFinding[]): FraudFinding[] {
  const seen = new Set<string>();
  const out: FraudFinding[] = [];
  for (const f of findings) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
  }
  return out;
}

function sumOverbill(findings: FraudFinding[]): number {
  const byInvoice = new Map<string, number>();
  let projectLevel = 0;
  for (const f of findings) {
    if (!OVERBILL_RULES.has(f.ruleName)) continue;
    if (f.invoiceId) {
      byInvoice.set(f.invoiceId, Math.max(byInvoice.get(f.invoiceId) ?? 0, f.affectedAmount));
    } else {
      projectLevel = Math.max(projectLevel, f.affectedAmount);
    }
  }
  const invoiceSum = [...byInvoice.values()].reduce((s, n) => s + n, 0);
  // Prefer the larger of project-level excess and summed invoice-level excess so we do not
  // double-count the same rupees, but never hide invoice-level mismatches.
  return roundMoney(Math.max(projectLevel, invoiceSum));
}

export const __testables = {
  classifyRisk,
  verdictFromFindings,
  expectedTotal,
  withinTol,
  DEFAULTS,
};
