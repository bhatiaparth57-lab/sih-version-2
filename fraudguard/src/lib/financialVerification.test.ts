import { describe, expect, it } from 'vitest';
import type { ApprovedBudget, ActualExpenditure, Invoice, ReferencePrice } from './financialTypes';
import { verifyInvoices, verifyPortfolio, __testables } from './financialVerification';
import { DEMO_FINANCIAL_DATASET } from './financialDemoData';

const refs: ReferencePrice[] = DEMO_FINANCIAL_DATASET.referencePrices;

function inv(partial: Partial<Invoice> & Pick<Invoice, 'id' | 'projectId' | 'invoiceNumber'>): Invoice {
  return {
    vendorId: 'V-ABC',
    invoiceDate: '2026-03-01',
    description: 'test',
    claimedAmount: 100,
    taxAmount: 18,
    totalAmount: 118,
    verificationStatus: 'pending',
    lineItems: [
      {
        id: `${partial.id}-li`,
        invoiceId: partial.id,
        description: 'item',
        quantity: 1,
        unit: 'u',
        unitPrice: 100,
        claimedAmount: 100,
      },
    ],
    ...partial,
  };
}

const budget = (projectId: string, total: number, categories: ApprovedBudget['categories'] = []): ApprovedBudget => ({
  projectId,
  totalAmount: total,
  categories,
});

const spent = (projectId: string, total: number, byCategory: Record<string, number> = {}): ActualExpenditure => ({
  projectId,
  totalAmount: total,
  byCategory,
});

describe('financial verification engine', () => {
  it('returns a verified empty result for no invoices', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [],
      budget: budget('P1', 1000),
      expenditure: spent('P1', 0),
    });
    expect(result.invoiceCount).toBe(0);
    expect(result.score).toBe(0);
    expect(result.risk).toBe('LOW');
    expect(result.verdict).toBe('verified');
    expect(result.findings).toEqual([]);
    expect(result.engine).toBe('rule-based');
  });

  it('accepts a valid invoice with matching line items, tax and total', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({ id: 'a', projectId: 'P1', invoiceNumber: 'INV-OK' })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 118),
      referencePrices: refs,
    });
    expect(result.findings.filter((f) => f.ruleName === 'invoice_total_mismatch')).toHaveLength(0);
    expect(result.findings.filter((f) => f.ruleName === 'line_qty_price_mismatch')).toHaveLength(0);
  });

  it('flags an incorrect invoice total', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({ id: 'a', projectId: 'P1', invoiceNumber: 'INV-BAD', totalAmount: 999 })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 999),
    });
    expect(result.findings.some((f) => f.ruleName === 'invoice_total_mismatch')).toBe(true);
    expect(result.scoreBreakdown.some((s) => s.ruleName === 'invoice_total_mismatch' && s.points > 0)).toBe(true);
  });

  it('allows rounding differences within 1 INR', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({
        id: 'a',
        projectId: 'P1',
        invoiceNumber: 'INV-ROUND',
        claimedAmount: 100,
        taxAmount: 18.4,
        totalAmount: 118.6,
        lineItems: [{
          id: 'a-li',
          invoiceId: 'a',
          description: 'item',
          quantity: 3,
          unit: 'u',
          unitPrice: 33.333,
          claimedAmount: 100,
        }],
      })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 118.6),
      options: { moneyToleranceInr: 1 },
    });
    expect(result.findings.some((f) => f.ruleName === 'invoice_total_mismatch')).toBe(false);
    expect(result.findings.some((f) => f.ruleName === 'line_qty_price_mismatch')).toBe(false);
  });

  it('flags quantity × unit price mismatches', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({
        id: 'a',
        projectId: 'P1',
        invoiceNumber: 'INV-Q',
        claimedAmount: 500,
        taxAmount: 0,
        totalAmount: 500,
        lineItems: [{
          id: 'a-li',
          invoiceId: 'a',
          description: 'steel',
          quantity: 2,
          unit: 't',
          unitPrice: 100,
          claimedAmount: 500,
        }],
      })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 500),
    });
    const f = result.findings.find((x) => x.ruleName === 'line_qty_price_mismatch');
    expect(f?.affectedAmount).toBe(300);
  });

  it('flags zero and negative quantities', () => {
    const zero = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({
        id: 'z',
        projectId: 'P1',
        invoiceNumber: 'INV-0',
        lineItems: [{ id: 'z-li', invoiceId: 'z', description: 'x', quantity: 0, unit: 'u', unitPrice: 10, claimedAmount: 0 }],
        claimedAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 0),
    });
    const neg = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({
        id: 'n',
        projectId: 'P1',
        invoiceNumber: 'INV-NEG',
        lineItems: [{ id: 'n-li', invoiceId: 'n', description: 'x', quantity: -2, unit: 'u', unitPrice: 10, claimedAmount: -20 }],
        claimedAmount: -20,
        taxAmount: 0,
        totalAmount: -20,
      })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 0),
    });
    expect(zero.findings.some((f) => f.ruleName === 'invalid_quantity')).toBe(true);
    expect(neg.findings.some((f) => f.ruleName === 'invalid_quantity')).toBe(true);
  });

  it('flags missing required fields', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({ id: 'm', projectId: 'P1', invoiceNumber: '   ', vendorId: '', invoiceDate: 'not-a-date' })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 118),
    });
    expect(result.findings.some((f) => f.ruleName === 'missing_required_fields')).toBe(true);
  });

  it('flags an invoice that exceeds remaining budget', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [
        inv({ id: 'a', projectId: 'P1', invoiceNumber: 'A', claimedAmount: 80, taxAmount: 0, totalAmount: 80, lineItems: [{ id: 'a-li', invoiceId: 'a', description: 'x', quantity: 1, unit: 'u', unitPrice: 80, claimedAmount: 80 }] }),
        inv({ id: 'b', projectId: 'P1', invoiceNumber: 'B', claimedAmount: 50, taxAmount: 0, totalAmount: 50, lineItems: [{ id: 'b-li', invoiceId: 'b', description: 'x', quantity: 1, unit: 'u', unitPrice: 50, claimedAmount: 50 }] }),
      ],
      budget: budget('P1', 100),
      expenditure: spent('P1', 130),
    });
    expect(result.findings.some((f) => f.ruleName === 'invoice_gt_remaining_budget' && f.invoiceId === 'b')).toBe(true);
  });

  it('flags claimed amount greater than the full approved budget', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({
        id: 'a',
        projectId: 'P1',
        invoiceNumber: 'HUGE',
        claimedAmount: 5_000,
        taxAmount: 0,
        totalAmount: 5_000,
        lineItems: [{ id: 'a-li', invoiceId: 'a', description: 'x', quantity: 1, unit: 'u', unitPrice: 5_000, claimedAmount: 5_000 }],
      })],
      budget: budget('P1', 1_000),
      expenditure: spent('P1', 5_000),
    });
    expect(result.findings.some((f) => f.ruleName === 'claimed_gt_approved_budget')).toBe(true);
  });

  it('detects duplicate invoice numbers even across different projects', () => {
    const all = [
      inv({ id: 'a', projectId: 'P1', invoiceNumber: 'INV-8841' }),
      inv({ id: 'b', projectId: 'P2', invoiceNumber: 'INV-8841', totalAmount: 200, claimedAmount: 200, taxAmount: 0, lineItems: [{ id: 'b-li', invoiceId: 'b', description: 'x', quantity: 1, unit: 'u', unitPrice: 200, claimedAmount: 200 }] }),
    ];
    const r1 = verifyInvoices({ projectId: 'P1', invoices: [all[0]], allInvoices: all, budget: budget('P1', 10_000), expenditure: spent('P1', 118) });
    const r2 = verifyInvoices({ projectId: 'P2', invoices: [all[1]], allInvoices: all, budget: budget('P2', 10_000), expenditure: spent('P2', 200) });
    expect(r1.findings.some((f) => f.ruleName === 'duplicate_invoice_number')).toBe(true);
    expect(r2.findings.some((f) => f.ruleName === 'duplicate_invoice_number')).toBe(true);
  });

  it('does not treat the same number on a single invoice as a duplicate', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({ id: 'a', projectId: 'P1', invoiceNumber: 'UNIQUE' })],
      allInvoices: [inv({ id: 'a', projectId: 'P1', invoiceNumber: 'UNIQUE' })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 118),
    });
    expect(result.findings.some((f) => f.ruleName === 'duplicate_invoice_number')).toBe(false);
  });

  it('does not flag duplicate numbers that only exist on another isolated project when allInvoices is scoped', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({ id: 'a', projectId: 'P1', invoiceNumber: 'INV-1' })],
      allInvoices: [inv({ id: 'a', projectId: 'P1', invoiceNumber: 'INV-1' })],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 118),
    });
    expect(result.findings.some((f) => f.ruleName === 'duplicate_invoice_number')).toBe(false);
  });

  it('detects near-duplicates and rapid repeats for the same vendor/project', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [
        inv({ id: 'a', projectId: 'P1', invoiceNumber: 'N1', invoiceDate: '2026-03-01', claimedAmount: 100, taxAmount: 0, totalAmount: 100, lineItems: [{ id: 'a-li', invoiceId: 'a', description: 'x', quantity: 1, unit: 'u', unitPrice: 100, claimedAmount: 100 }] }),
        inv({ id: 'b', projectId: 'P1', invoiceNumber: 'N2', invoiceDate: '2026-03-02', claimedAmount: 102, taxAmount: 0, totalAmount: 102, lineItems: [{ id: 'b-li', invoiceId: 'b', description: 'x', quantity: 1, unit: 'u', unitPrice: 102, claimedAmount: 102 }] }),
      ],
      budget: budget('P1', 10_000),
      expenditure: spent('P1', 202),
    });
    expect(result.findings.some((f) => f.ruleName === 'near_duplicate_invoice')).toBe(true);
    expect(result.findings.some((f) => f.ruleName === 'rapid_repeat_invoices')).toBe(true);
  });

  it('flags unusually high unit prices against the reference catalog', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({
        id: 'a',
        projectId: 'P1',
        invoiceNumber: 'CEM',
        claimedAmount: 2_400,
        taxAmount: 0,
        totalAmount: 2_400,
        lineItems: [{
          id: 'a-li',
          invoiceId: 'a',
          description: 'cement',
          itemKey: 'cement-bag',
          quantity: 1,
          unit: 'bag',
          unitPrice: 2_400,
          claimedAmount: 2_400,
        }],
      })],
      budget: budget('P1', 100_000),
      expenditure: spent('P1', 2_400),
      referencePrices: refs,
    });
    expect(result.findings.some((f) => f.ruleName === 'high_unit_price' && f.severity === 'CRITICAL')).toBe(true);
  });

  it('flags spending that exceeds allocation and category budgets', () => {
    const result = verifyInvoices({
      projectId: 'P1',
      invoices: [inv({ id: 'a', projectId: 'P1', invoiceNumber: 'C1', categoryId: 'ELEC' })],
      budget: budget('P1', 100, [{ id: 'ELEC', name: 'Electrical', allocatedAmount: 50 }]),
      expenditure: spent('P1', 200, { ELEC: 80 }),
    });
    expect(result.findings.some((f) => f.ruleName === 'spending_exceeds_allocation')).toBe(true);
    expect(result.findings.some((f) => f.ruleName === 'category_budget_exceeded')).toBe(true);
  });

  it('caps the score at 100 and classifies risk from the calculated total', () => {
    const { classifyRisk } = __testables;
    expect(classifyRisk(0)).toBe('LOW');
    expect(classifyRisk(24)).toBe('LOW');
    expect(classifyRisk(25)).toBe('MEDIUM');
    expect(classifyRisk(50)).toBe('HIGH');
    expect(classifyRisk(75)).toBe('CRITICAL');

    const demo = verifyInvoices({
      projectId: 'MP-DEL-2026-0142',
      invoices: DEMO_FINANCIAL_DATASET.invoices.filter((i) => i.projectId === 'MP-DEL-2026-0142'),
      allInvoices: DEMO_FINANCIAL_DATASET.invoices,
      budget: DEMO_FINANCIAL_DATASET.budgets['MP-DEL-2026-0142'],
      expenditure: DEMO_FINANCIAL_DATASET.expenditure['MP-DEL-2026-0142'],
      referencePrices: refs,
    });
    expect(demo.score).toBeGreaterThan(0);
    expect(demo.score).toBeLessThanOrEqual(100);
    expect(demo.findings.length).toBeGreaterThan(0);
    expect(demo.verdict).toBe('failed');
  });

  it('runs the required synthetic cases in the demo dataset', () => {
    const del = verifyInvoices({
      projectId: 'MP-DEL-2026-0142',
      invoices: DEMO_FINANCIAL_DATASET.invoices.filter((i) => i.projectId === 'MP-DEL-2026-0142'),
      allInvoices: DEMO_FINANCIAL_DATASET.invoices,
      budget: DEMO_FINANCIAL_DATASET.budgets['MP-DEL-2026-0142'],
      expenditure: DEMO_FINANCIAL_DATASET.expenditure['MP-DEL-2026-0142'],
      referencePrices: refs,
    });
    const tn = verifyInvoices({
      projectId: 'MP-TN-2026-1120',
      invoices: DEMO_FINANCIAL_DATASET.invoices.filter((i) => i.projectId === 'MP-TN-2026-1120'),
      allInvoices: DEMO_FINANCIAL_DATASET.invoices,
      budget: DEMO_FINANCIAL_DATASET.budgets['MP-TN-2026-1120'],
      expenditure: DEMO_FINANCIAL_DATASET.expenditure['MP-TN-2026-1120'],
      referencePrices: refs,
    });
    const mh = verifyInvoices({
      projectId: 'MP-MH-2026-0331',
      invoices: DEMO_FINANCIAL_DATASET.invoices.filter((i) => i.projectId === 'MP-MH-2026-0331'),
      allInvoices: DEMO_FINANCIAL_DATASET.invoices,
      budget: DEMO_FINANCIAL_DATASET.budgets['MP-MH-2026-0331'],
      expenditure: DEMO_FINANCIAL_DATASET.expenditure['MP-MH-2026-0331'],
      referencePrices: refs,
    });

    expect(tn.findings.some((f) => f.ruleName === 'invoice_total_mismatch')).toBe(false);
    expect(del.findings.some((f) => f.invoiceId === 'inv-del-bad-total' && f.ruleName === 'invoice_total_mismatch')).toBe(true);
    expect(del.findings.some((f) => f.invoiceId === 'inv-del-over-remaining' && f.ruleName === 'invoice_gt_remaining_budget')).toBe(true);
    expect(del.findings.some((f) => f.ruleName === 'duplicate_invoice_number')).toBe(true);
    expect(del.findings.some((f) => f.ruleName === 'high_unit_price')).toBe(true);
    expect(mh.findings.some((f) => f.ruleName === 'spending_exceeds_allocation')).toBe(true);

    const portfolio = verifyPortfolio({
      projectIds: ['MP-DEL-2026-0142', 'MP-TN-2026-1120', 'MP-MH-2026-0331'],
      invoices: DEMO_FINANCIAL_DATASET.invoices,
      budgets: DEMO_FINANCIAL_DATASET.budgets,
      expenditure: DEMO_FINANCIAL_DATASET.expenditure,
      referencePrices: refs,
    });
    const alertCount = portfolio.reduce((s, r) => s + r.findings.length, 0);
    expect(alertCount).toBeGreaterThan(0);
  });
});
