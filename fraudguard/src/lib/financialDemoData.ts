import { PROJECTS } from '@/lib/data';
import {
  lakhsToInr,
  type ActualExpenditure,
  type ApprovedBudget,
  type FinancialDataset,
  type FinancialVendor,
  type Invoice,
  type ReferencePrice,
} from '@/lib/financialTypes';

export const FINANCIAL_VENDORS: FinancialVendor[] = [
  { id: 'V-ABC', name: 'ABC Infra Pvt Ltd', pan: 'AAFCA2341B', gstin: '07AAFCA2341B1Z5' },
  { id: 'V-ORBIT', name: 'Orbit Civil Works', pan: 'AABCO7711R', gstin: '33AABCO7711R1Z2' },
  { id: 'V-GVK', name: 'GVK Builders', pan: 'AABCG1133M', gstin: '27AABCG1133M1ZT' },
  { id: 'V-JMD', name: 'JMD Constructions', pan: 'AABCO7711R' },
];

export const REFERENCE_PRICES: ReferencePrice[] = [
  { itemKey: 'cement-bag', label: 'OPC cement (50 kg bag)', unit: 'bag', unitPrice: 400 },
  { itemKey: 'steel-tonne', label: 'TMT steel', unit: 'tonne', unitPrice: 55_000 },
  { itemKey: 'hvac-unit', label: 'HVAC split unit', unit: 'unit', unitPrice: 85_000 },
  { itemKey: 'electrical-point', label: 'Electrical point', unit: 'point', unitPrice: 2_500 },
  { itemKey: 'drain-pipe', label: 'HDPE drainage pipe', unit: 'm', unitPrice: 1_200 },
  { itemKey: 'labour-day', label: 'Skilled labour', unit: 'day', unitPrice: 700 },
];

const CAT = {
  civil: { id: 'CAT-CIVIL', name: 'Civil works' },
  elec: { id: 'CAT-ELEC', name: 'Electrical' },
  eqp: { id: 'CAT-EQP', name: 'Equipment' },
  drain: { id: 'CAT-DRAIN', name: 'Drainage' },
} as const;

function budgetFor(projectId: string, categories: ApprovedBudget['categories']): ApprovedBudget {
  const project = PROJECTS.find((p) => p.id === projectId);
  const totalAmount = lakhsToInr(project?.allocated ?? 0);
  return { projectId, totalAmount, categories };
}

function expenditureFor(projectId: string, byCategory: Record<string, number>): ActualExpenditure {
  const project = PROJECTS.find((p) => p.id === projectId);
  return {
    projectId,
    totalAmount: lakhsToInr(project?.spent ?? 0),
    byCategory,
  };
}

/** Approved budgets — totals match `PROJECTS.allocated` converted from lakhs to INR. */
export const FINANCIAL_BUDGETS: Record<string, ApprovedBudget> = {
  'MP-DEL-2026-0142': budgetFor('MP-DEL-2026-0142', [
    { ...CAT.civil, allocatedAmount: 2_500_000 },
    { ...CAT.elec, allocatedAmount: 800_000 },
    { ...CAT.eqp, allocatedAmount: 1_500_000 },
  ]),
  'MP-TN-2026-1120': budgetFor('MP-TN-2026-1120', [
    { ...CAT.drain, allocatedAmount: 2_600_000 },
  ]),
  'MP-MH-2026-0331': budgetFor('MP-MH-2026-0331', [
    { ...CAT.civil, allocatedAmount: 2_200_000 },
  ]),
  'MP-BR-2026-0904': budgetFor('MP-BR-2026-0904', [
    { ...CAT.civil, allocatedAmount: 3_200_000 },
  ]),
};

export const FINANCIAL_EXPENDITURE: Record<string, ActualExpenditure> = {
  'MP-DEL-2026-0142': expenditureFor('MP-DEL-2026-0142', {
    'CAT-CIVIL': 2_400_000,
    'CAT-ELEC': 1_200_000,
    'CAT-EQP': 2_500_000,
  }),
  'MP-TN-2026-1120': expenditureFor('MP-TN-2026-1120', {
    'CAT-DRAIN': 2_600_000,
  }),
  'MP-MH-2026-0331': expenditureFor('MP-MH-2026-0331', {
    'CAT-CIVIL': 2_900_000,
  }),
  'MP-BR-2026-0904': expenditureFor('MP-BR-2026-0904', {
    'CAT-CIVIL': 3_800_000,
  }),
};

/**
 * Synthetic invoices covering the required demo cases:
 * valid total, incorrect total, remaining-budget breach, duplicate number,
 * suspicious unit price, project overspend, plus qty×price mismatch,
 * rapid repeats, near-duplicates, and category overspend.
 */
export const FINANCIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-tn-valid',
    projectId: 'MP-TN-2026-1120',
    vendorId: 'V-ORBIT',
    invoiceDate: '2026-01-12',
    invoiceNumber: 'INV-TN-2001',
    description: 'Panchayat road drainage pipes — work order WO-TN-118',
    claimedAmount: 120_000,
    taxAmount: 21_600,
    totalAmount: 141_600,
    supportingFileRef: 'Invoice_INV-TN-2001.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-DRAIN',
    lineItems: [
      {
        id: 'li-tn-1',
        invoiceId: 'inv-tn-valid',
        description: 'HDPE drainage pipe 200 mm',
        itemKey: 'drain-pipe',
        categoryId: 'CAT-DRAIN',
        quantity: 100,
        unit: 'm',
        unitPrice: 1_200,
        claimedAmount: 120_000,
      },
    ],
  },
  {
    id: 'inv-del-valid',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-01-04',
    invoiceNumber: 'INV-DEL-1001',
    description: 'Electrical points — sanctioned BOQ item E-12',
    claimedAmount: 50_000,
    taxAmount: 9_000,
    totalAmount: 59_000,
    supportingFileRef: 'Invoice_INV-DEL-1001.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-ELEC',
    lineItems: [
      {
        id: 'li-del-valid-1',
        invoiceId: 'inv-del-valid',
        description: 'Electrical point (switch + socket)',
        itemKey: 'electrical-point',
        categoryId: 'CAT-ELEC',
        quantity: 20,
        unit: 'point',
        unitPrice: 2_500,
        claimedAmount: 50_000,
      },
    ],
  },
  {
    id: 'inv-del-bad-total',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-01-15',
    invoiceNumber: 'INV-DEL-1002',
    description: 'Cement supply — arithmetic total does not match lines + tax',
    claimedAmount: 40_000,
    taxAmount: 7_200,
    totalAmount: 80_000,
    supportingFileRef: 'Invoice_INV-DEL-1002.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-CIVIL',
    lineItems: [
      {
        id: 'li-del-bad-total-1',
        invoiceId: 'inv-del-bad-total',
        description: 'OPC cement 50 kg',
        itemKey: 'cement-bag',
        categoryId: 'CAT-CIVIL',
        quantity: 100,
        unit: 'bag',
        unitPrice: 400,
        claimedAmount: 40_000,
      },
    ],
  },
  {
    id: 'inv-del-qty-price',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-02-02',
    invoiceNumber: 'INV-DEL-1004',
    description: 'TMT steel — qty × unit price does not equal claimed line amount',
    claimedAmount: 720_000,
    taxAmount: 129_600,
    totalAmount: 849_600,
    supportingFileRef: 'Invoice_INV-DEL-1004.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-CIVIL',
    lineItems: [
      {
        id: 'li-del-qty-1',
        invoiceId: 'inv-del-qty-price',
        description: 'TMT 500D bars',
        itemKey: 'steel-tonne',
        categoryId: 'CAT-CIVIL',
        quantity: 10,
        unit: 'tonne',
        unitPrice: 55_000,
        claimedAmount: 720_000,
      },
    ],
  },
  {
    id: 'inv-del-8841',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-03-12',
    invoiceNumber: 'INV-8841',
    description: 'HVAC & electrical works (flagship demo invoice)',
    claimedAmount: 1_050_000,
    taxAmount: 190_000,
    totalAmount: 1_240_000,
    supportingFileRef: 'Invoice_INV-8841.pdf',
    supportingDocumentUrl: '/demo/Invoice_INV-8841.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-EQP',
    lineItems: [
      {
        id: 'li-8841-1',
        invoiceId: 'inv-del-8841',
        description: 'HVAC split units',
        itemKey: 'hvac-unit',
        categoryId: 'CAT-EQP',
        quantity: 10,
        unit: 'unit',
        unitPrice: 85_000,
        claimedAmount: 850_000,
      },
      {
        id: 'li-8841-2',
        invoiceId: 'inv-del-8841',
        description: 'Installation & commissioning',
        categoryId: 'CAT-EQP',
        quantity: 1,
        unit: 'ls',
        unitPrice: 200_000,
        claimedAmount: 200_000,
      },
    ],
  },
  {
    id: 'inv-br-8841',
    projectId: 'MP-BR-2026-0904',
    vendorId: 'V-ABC',
    invoiceDate: '2026-03-18',
    invoiceNumber: 'INV-8841',
    description: 'Duplicate invoice number reused on a second project',
    claimedAmount: 830_508,
    taxAmount: 149_492,
    totalAmount: 980_000,
    supportingFileRef: 'Invoice_INV-8841-BR.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-CIVIL',
    lineItems: [
      {
        id: 'li-br-8841-1',
        invoiceId: 'inv-br-8841',
        description: 'Civil finishing lump sum',
        categoryId: 'CAT-CIVIL',
        quantity: 1,
        unit: 'ls',
        unitPrice: 830_508,
        claimedAmount: 830_508,
      },
    ],
  },
  {
    id: 'inv-del-high-price',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-03-20',
    invoiceNumber: 'INV-DEL-1005',
    description: 'Cement billed at 6× the configured reference unit price',
    claimedAmount: 192_000,
    taxAmount: 34_560,
    totalAmount: 226_560,
    supportingFileRef: 'Invoice_INV-DEL-1005.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-CIVIL',
    lineItems: [
      {
        id: 'li-high-price-1',
        invoiceId: 'inv-del-high-price',
        description: 'OPC cement 50 kg',
        itemKey: 'cement-bag',
        categoryId: 'CAT-CIVIL',
        quantity: 80,
        unit: 'bag',
        unitPrice: 2_400,
        claimedAmount: 192_000,
      },
    ],
  },
  {
    id: 'inv-del-rapid-a',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-03-21',
    invoiceNumber: 'INV-DEL-1006',
    description: 'Labour mobilisation — first of a rapid pair',
    claimedAmount: 150_000,
    taxAmount: 27_000,
    totalAmount: 177_000,
    supportingFileRef: 'Invoice_INV-DEL-1006.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-CIVIL',
    lineItems: [
      {
        id: 'li-rapid-a',
        invoiceId: 'inv-del-rapid-a',
        description: 'Skilled labour',
        itemKey: 'labour-day',
        categoryId: 'CAT-CIVIL',
        quantity: 200,
        unit: 'day',
        unitPrice: 750,
        claimedAmount: 150_000,
      },
    ],
  },
  {
    id: 'inv-del-rapid-b',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-03-22',
    invoiceNumber: 'INV-DEL-1007',
    description: 'Labour mobilisation — submitted the next day',
    claimedAmount: 152_000,
    taxAmount: 27_360,
    totalAmount: 179_360,
    supportingFileRef: 'Invoice_INV-DEL-1007.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-CIVIL',
    lineItems: [
      {
        id: 'li-rapid-b',
        invoiceId: 'inv-del-rapid-b',
        description: 'Skilled labour',
        itemKey: 'labour-day',
        categoryId: 'CAT-CIVIL',
        quantity: 200,
        unit: 'day',
        unitPrice: 760,
        claimedAmount: 152_000,
      },
    ],
  },
  {
    id: 'inv-del-near-dup',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-03-24',
    invoiceNumber: 'INV-DEL-1008',
    description: 'Near-duplicate of INV-DEL-1006 (same vendor, similar amount)',
    claimedAmount: 151_000,
    taxAmount: 27_180,
    totalAmount: 178_180,
    supportingFileRef: 'Invoice_INV-DEL-1008.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-CIVIL',
    lineItems: [
      {
        id: 'li-near-dup',
        invoiceId: 'inv-del-near-dup',
        description: 'Skilled labour',
        itemKey: 'labour-day',
        categoryId: 'CAT-CIVIL',
        quantity: 200,
        unit: 'day',
        unitPrice: 755,
        claimedAmount: 151_000,
      },
    ],
  },
  {
    id: 'inv-del-category',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-04-02',
    invoiceNumber: 'INV-DEL-1010',
    description: 'Electrical package that exceeds the electrical category budget',
    claimedAmount: 1_200_000,
    taxAmount: 216_000,
    totalAmount: 1_416_000,
    supportingFileRef: 'Invoice_INV-DEL-1010.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-ELEC',
    lineItems: [
      {
        id: 'li-cat-elec',
        invoiceId: 'inv-del-category',
        description: 'Main electrical package',
        itemKey: 'electrical-point',
        categoryId: 'CAT-ELEC',
        quantity: 480,
        unit: 'point',
        unitPrice: 2_500,
        claimedAmount: 1_200_000,
      },
    ],
  },
  {
    id: 'inv-del-over-remaining',
    projectId: 'MP-DEL-2026-0142',
    vendorId: 'V-ABC',
    invoiceDate: '2026-04-18',
    invoiceNumber: 'INV-DEL-1099',
    description: 'Final claim that exceeds remaining sanctioned budget',
    claimedAmount: 3_500_000,
    taxAmount: 0,
    totalAmount: 3_500_000,
    supportingFileRef: 'Invoice_INV-DEL-1099.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-EQP',
    lineItems: [
      {
        id: 'li-over-rem',
        invoiceId: 'inv-del-over-remaining',
        description: 'Equipment balance claim',
        categoryId: 'CAT-EQP',
        quantity: 1,
        unit: 'ls',
        unitPrice: 3_500_000,
        claimedAmount: 3_500_000,
      },
    ],
  },
  {
    id: 'inv-mh-overspend',
    projectId: 'MP-MH-2026-0331',
    vendorId: 'V-GVK',
    invoiceDate: '2026-02-20',
    invoiceNumber: 'INV-MH-3301',
    description: 'Anganwadi civil bill — expenditure already exceeds allocation',
    claimedAmount: 2_900_000,
    taxAmount: 0,
    totalAmount: 2_900_000,
    supportingFileRef: 'Invoice_INV-MH-3301.pdf',
    verificationStatus: 'pending',
    categoryId: 'CAT-CIVIL',
    lineItems: [
      {
        id: 'li-mh-1',
        invoiceId: 'inv-mh-overspend',
        description: 'Civil package',
        categoryId: 'CAT-CIVIL',
        quantity: 1,
        unit: 'ls',
        unitPrice: 2_900_000,
        claimedAmount: 2_900_000,
      },
    ],
  },
];

export const DEMO_FINANCIAL_DATASET: FinancialDataset = {
  source: 'demo',
  invoices: FINANCIAL_INVOICES,
  vendors: FINANCIAL_VENDORS,
  budgets: FINANCIAL_BUDGETS,
  expenditure: FINANCIAL_EXPENDITURE,
  referencePrices: REFERENCE_PRICES,
};

export function vendorNameById(id: string): string {
  return FINANCIAL_VENDORS.find((v) => v.id === id)?.name ?? id;
}
