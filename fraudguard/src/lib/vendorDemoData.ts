/**
 * =====================================================================
 * FRAUDGUARD — Layer 3: Vendor Intelligence Demo Dataset
 * ⚠️ SYNTHETIC DEMO ENVIRONMENT ONLY
 *
 * ALL records, addresses, tokens, hashes, director names, and contact
 * channels in this file are completely synthetic and fabricated for
 * testing and demonstrating rule-based collusion detection algorithms.
 * They do NOT represent any real government data, real persons, real tax
 * identifiers, or real banking accounts.
 * =====================================================================
 */

import { VENDORS, PROJECTS } from '@/lib/data';
import { DEMO_FINANCIAL_DATASET } from '@/lib/financialDemoData';
import type { Invoice } from '@/lib/financialTypes';
import type { VendorRecord } from '@/lib/vendorTypes';

/**
 * Synthetic demonstration vendor dataset with explicit demo-only relationship tokens.
 * All tokens are prefixed with DEMO- or explicitly marked as synthetic.
 */
export const SYNTHETIC_DEMO_VENDORS: VendorRecord[] = [
  {
    id: 'v-abc',
    name: 'ABC Infra Pvt Ltd',
    pan: 'AAFCA2341B',
    gstin: '07AAFCA2341B1Z5',
    projectsCount: 12,
    totalValueCrore: 8.4,
    risk: 'CRITICAL',
    riskScore: 91,
    concentration: 75,
    alerts: 7,
    districtsCount: 4,
    highRisk: 7,
    established: '2014',
    relation: 'Shared director with SKM Contracts',
    // Synthetic Demo-only attributes
    demoPanToken: 'DEMO-PAN-ABC-0142',
    demoPhysicalAddress: 'Demo Suite 401, Apex Commercial Tower, Okhla Phase II, New Delhi (Synthetic Demo)',
    demoDirectorNames: ['Demo Dir S. Verma (Synthetic)', 'Demo Dir R. K. Gupta (Synthetic)'],
    demoContactDomain: 'abcinfra-group.demo.internal',
    demoBankTokenHash: 'BANK-TOKEN-DEMO-0142-ALPHA',
  },
  {
    id: 'v-skm',
    name: 'SKM Contracts',
    pan: 'AABCS3390L',
    gstin: '07AABCS3390L1Z9',
    projectsCount: 4,
    totalValueCrore: 2.6,
    risk: 'MEDIUM',
    riskScore: 48,
    concentration: 28,
    alerts: 1,
    districtsCount: 1,
    highRisk: 1,
    established: '2018',
    relation: 'Affiliated operational office with ABC Infra Pvt Ltd',
    // Synthetic Demo-only attributes (Shares Director S. Verma and email domain with ABC Infra)
    demoPanToken: 'DEMO-PAN-SKM-3390',
    demoPhysicalAddress: 'Demo Suite 403, Apex Commercial Tower, Okhla Phase II, New Delhi (Synthetic Demo)',
    demoDirectorNames: ['Demo Dir S. Verma (Synthetic)', 'Demo Dir A. Mehta (Synthetic)'],
    demoContactDomain: 'abcinfra-group.demo.internal',
    demoBankTokenHash: 'BANK-TOKEN-DEMO-3390-BETA',
  },
  {
    id: 'v-orbit',
    name: 'Orbit Civil Works',
    pan: 'AABCO7711R',
    gstin: '33AABCO7711R1Z2',
    projectsCount: 3,
    totalValueCrore: 1.8,
    risk: 'LOW',
    riskScore: 22,
    concentration: 15,
    alerts: 0,
    districtsCount: 1,
    highRisk: 0,
    established: '2019',
    relation: 'Common operational premises with Sharma Constructions',
    // Synthetic Demo-only attributes (Shares address with Sharma Constructions & PAN token with JMD)
    demoPanToken: 'DEMO-PAN-SHARED-7711-CLONE',
    demoPhysicalAddress: 'Demo Plot 42, Sector 18, Industrial Area, Okhla Phase III, New Delhi (Synthetic Demo)',
    demoDirectorNames: ['Demo Dir K. N. Iyer (Synthetic)'],
    demoContactDomain: 'orbitcivil.demo.internal',
    demoBankTokenHash: 'BANK-TOKEN-DEMO-7711-GAMMA',
  },
  {
    id: 'v-sharma',
    name: 'Sharma Constructions',
    pan: 'AAECS5540K',
    gstin: '09AAECS5540K1ZL',
    projectsCount: 9,
    totalValueCrore: 6.1,
    risk: 'HIGH',
    riskScore: 74,
    concentration: 58,
    alerts: 4,
    districtsCount: 3,
    highRisk: 3,
    established: '2012',
    relation: 'Common address with Orbit Civil Works',
    // Synthetic Demo-only attributes (Shares physical address with Orbit Civil Works)
    demoPanToken: 'DEMO-PAN-SHARMA-5540',
    demoPhysicalAddress: 'Demo Plot 42, Sector 18, Industrial Area, Okhla Phase III, New Delhi (Synthetic Demo)',
    demoDirectorNames: ['Demo Dir M. L. Sharma (Synthetic)'],
    demoContactDomain: 'sharmaconst.demo.internal',
    demoBankTokenHash: 'BANK-TOKEN-DEMO-5540-DELTA',
  },
  {
    id: 'v-jmd',
    name: 'JMD Constructions',
    pan: 'AABCO7711R',
    gstin: '29AABCO7711R1Z1',
    projectsCount: 2,
    totalValueCrore: 1.2,
    risk: 'MEDIUM',
    riskScore: 39,
    concentration: 20,
    alerts: 1,
    districtsCount: 1,
    highRisk: 0,
    established: '2021',
    relation: 'Shared PAN token registration with Orbit Civil Works',
    // Synthetic Demo-only attributes (Cloned / duplicate demo PAN token with Orbit Civil Works)
    demoPanToken: 'DEMO-PAN-SHARED-7711-CLONE',
    demoPhysicalAddress: 'Demo Hub 12, Whitefield Industrial Zone, Bengaluru (Synthetic Demo)',
    demoDirectorNames: ['Demo Dir P. Chawla (Synthetic)'],
    demoContactDomain: 'jmdconstructions.demo.internal',
    demoBankTokenHash: 'BANK-TOKEN-DEMO-8822-EPSILON',
  },
  {
    id: 'v-gvk',
    name: 'GVK Builders',
    pan: 'AABCG1133M',
    gstin: '27AABCG1133M1ZT',
    projectsCount: 7,
    totalValueCrore: 5.2,
    risk: 'HIGH',
    riskScore: 69,
    concentration: 41,
    alerts: 3,
    districtsCount: 2,
    highRisk: 2,
    established: '2016',
    relation: 'Beneficiary bank pair with R.K. Enterprises',
    // Synthetic Demo-only attributes (Shares bank account hash with R.K. Enterprises)
    demoPanToken: 'DEMO-PAN-GVK-1133',
    demoPhysicalAddress: 'Demo Landmark 7, Nariman Point, Mumbai (Synthetic Demo)',
    demoDirectorNames: ['Demo Dir V. G. Kulkarni (Synthetic)'],
    demoContactDomain: 'gvkbuilders.demo.internal',
    demoBankTokenHash: 'BANK-SHARED-BENEFICIARY-9842',
  },
  {
    id: 'v-rk',
    name: 'R.K. Enterprises',
    pan: 'AABCR8821Q',
    gstin: '08AABCR8821Q1Z8',
    projectsCount: 6,
    totalValueCrore: 3.9,
    risk: 'MEDIUM',
    riskScore: 53,
    concentration: 34,
    alerts: 2,
    districtsCount: 2,
    highRisk: 1,
    established: '2015',
    relation: 'Beneficiary bank pair with GVK Builders',
    // Synthetic Demo-only attributes (Shares bank account hash with GVK Builders)
    demoPanToken: 'DEMO-PAN-RK-8821',
    demoPhysicalAddress: 'Demo Trade Centre, MI Road, Jaipur (Synthetic Demo)',
    demoDirectorNames: ['Demo Dir R. K. Agrawal (Synthetic)'],
    demoContactDomain: 'rkenterprises.demo.internal',
    demoBankTokenHash: 'BANK-SHARED-BENEFICIARY-9842',
  },
  {
    // Clean / normal vendor baseline with 0 shared tokens and clean history
    id: 'v-shree',
    name: 'Shree Sai Engineers',
    pan: 'AABCS9922G',
    gstin: '24AABCS9922G1Z5',
    projectsCount: 3,
    totalValueCrore: 1.6,
    risk: 'LOW',
    riskScore: 19,
    concentration: 12,
    alerts: 0,
    districtsCount: 2,
    highRisk: 0,
    established: '2020',
    relation: '—',
    demoPanToken: 'DEMO-PAN-SHREE-9922-INDEPENDENT',
    demoPhysicalAddress: 'Demo Complex B-14, SG Highway, Ahmedabad (Synthetic Demo)',
    demoDirectorNames: ['Demo Dir D. J. Patel (Synthetic)'],
    demoContactDomain: 'shreesaiengineers.demo.internal',
    demoBankTokenHash: 'BANK-TOKEN-DEMO-INDEPENDENT-1199',
  },
];

/**
 * Synthetic invoices incorporating cross-vendor billing patterns for collusion testing.
 * Merges baseline financialDemoData invoices with specific cross-vendor patterns:
 * 1. Cross-vendor duplicate invoice identifier (`INV-8841` reused by distinct vendor `V-SKM`)
 * 2. Near-duplicate / coordinated billing amounts between linked vendors within 14 days
 */
export const SYNTHETIC_DEMO_INVOICES: Invoice[] = [
  ...DEMO_FINANCIAL_DATASET.invoices,
  {
    id: 'inv-skm-cross-dup',
    projectId: 'MP-DL-2026-0090',
    vendorId: 'v-skm',
    invoiceDate: '2026-03-15',
    invoiceNumber: 'INV-8841', // Exact duplicate invoice number also submitted by ABC Infra
    description: 'Electrical fixtures package — cross-vendor duplicate identifier (Demo)',
    claimedAmount: 1_050_000,
    taxAmount: 189_000,
    totalAmount: 1_239_000,
    supportingFileRef: 'Invoice_INV-8841-SKM.pdf',
    verificationStatus: 'pending',
    lineItems: [
      {
        id: 'li-skm-1',
        invoiceId: 'inv-skm-cross-dup',
        description: 'Lighting fixtures',
        quantity: 10,
        unit: 'unit',
        unitPrice: 105_000,
        claimedAmount: 1_050_000,
      },
    ],
  },
  {
    id: 'inv-rk-coordinated-bill',
    projectId: 'MP-RJ-2026-0455',
    vendorId: 'v-rk',
    invoiceDate: '2026-02-25', // Within 5 days of GVK invoice on 2026-02-20
    invoiceNumber: 'INV-RK-3302',
    description: 'School toilet block civil claim — coordinated billing pattern with GVK (Demo)',
    claimedAmount: 2_900_000, // Identical claim amount to GVK Builders INV-MH-3301
    taxAmount: 0,
    totalAmount: 2_900_000,
    supportingFileRef: 'Invoice_INV-RK-3302.pdf',
    verificationStatus: 'pending',
    lineItems: [
      {
        id: 'li-rk-1',
        invoiceId: 'inv-rk-coordinated-bill',
        description: 'Sanitary and civil civil bundle',
        quantity: 1,
        unit: 'ls',
        unitPrice: 2_900_000,
        claimedAmount: 2_900_000,
      },
    ],
  },
];

/**
 * Normalizes input vendors (from Supabase or local fallback) into rich VendorRecord objects,
 * attaching synthetic demo tokens for demonstration and simulation purposes.
 */
export function getDemoVendorRecords(): VendorRecord[] {
  return SYNTHETIC_DEMO_VENDORS;
}

export function getDemoVendorInvoices(): Invoice[] {
  return SYNTHETIC_DEMO_INVOICES;
}

export function getDemoProjects() {
  return PROJECTS;
}
