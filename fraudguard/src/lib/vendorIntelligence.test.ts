import { describe, expect, it } from 'vitest';
import type { Project } from '@/lib/data';
import type { Invoice } from '@/lib/financialTypes';
import {
  classifyVendorRisk,
  runVendorIntelligenceAnalysis,
  VENDOR_RULE_WEIGHTS,
} from './vendorIntelligence';
import {
  SYNTHETIC_DEMO_INVOICES,
  SYNTHETIC_DEMO_VENDORS,
  getDemoProjects,
} from './vendorDemoData';
import type { VendorRecord } from './vendorTypes';

describe('Layer 3: Vendor Intelligence & Collusion Detection Engine', () => {
  function makeVendor(id: string, name: string, overrides: Partial<VendorRecord> = {}): VendorRecord {
    return {
      id,
      name,
      projectsCount: 2,
      totalValueCrore: 1.5,
      risk: 'LOW',
      riskScore: 10,
      concentration: 15,
      alerts: 0,
      districtsCount: 2,
      highRisk: 0,
      demoPanToken: `DEMO-PAN-UNIQUE-${id}`,
      demoPhysicalAddress: `Unique Street ${id}, City, State (Synthetic Demo)`,
      demoDirectorNames: [`Unique Director ${id} (Synthetic)`],
      demoContactDomain: `${id}-unique.demo.internal`,
      demoBankTokenHash: `BANK-TOKEN-UNIQUE-${id}`,
      ...overrides,
    };
  }

  const normalProject: Project = {
    id: 'P-CLEAN-1',
    name: 'Standard Drainage Unit',
    state: 'Gujarat',
    district: 'Surat',
    constituency: 'Surat',
    type: 'Drainage',
    vendor: 'Clean Engineering Services',
    allocated: 20,
    spent: 19,
    risk: 'LOW',
    riskScore: 15,
    finding: 'Normal progress',
    verify: 'Verified',
    year: '2025-26',
    x: 10,
    y: 10,
  };

  it('assigns a low risk score (<25) and zero findings to a clean, independent vendor', () => {
    const clean = makeVendor('v-clean', 'Clean Engineering Services');
    const result = runVendorIntelligenceAnalysis({
      vendors: [clean],
      projects: [normalProject],
      invoices: [],
    });

    const profile = result.profiles['v-clean'];
    expect(profile).toBeDefined();
    expect(profile.riskScore).toBeLessThan(25);
    expect(profile.riskLevel).toBe('LOW');
    expect(profile.findings).toHaveLength(0);
    expect(profile.relationships).toHaveLength(0);
  });

  it('flags vendors sharing a synthetic PAN token with CRITICAL severity (+35 pts)', () => {
    const v1 = makeVendor('v1', 'Alpha Corp', { demoPanToken: 'DEMO-PAN-DUPLICATE-TOKEN' });
    const v2 = makeVendor('v2', 'Beta Infra', { demoPanToken: 'DEMO-PAN-DUPLICATE-TOKEN' });

    const result = runVendorIntelligenceAnalysis({
      vendors: [v1, v2],
      projects: [],
      invoices: [],
    });

    expect(result.allRelationships.some((r) => r.relationshipType === 'shared_pan')).toBe(true);
    expect(result.profiles['v1'].findings.some((f) => f.ruleName === 'shared_pan_clone')).toBe(true);
    expect(result.profiles['v1'].riskScore).toBe(35);
    expect(result.profiles['v1'].findings[0].severity).toBe('CRITICAL');
    expect(result.profiles['v1'].findings[0].title).toContain('Potential collusion indicator');
    expect(result.profiles['v1'].findings[0].recommendedAction).toBeDefined();
  });

  it('flags vendors sharing synthetic beneficiary bank account hashes with CRITICAL severity (+30 pts)', () => {
    const vA = makeVendor('vA', 'Bank Partner A', { demoBankTokenHash: 'BANK-DEMO-COMMON-TOKEN' });
    const vB = makeVendor('vB', 'Bank Partner B', { demoBankTokenHash: 'BANK-DEMO-COMMON-TOKEN' });

    const result = runVendorIntelligenceAnalysis({
      vendors: [vA, vB],
      projects: [],
      invoices: [],
    });

    const rel = result.allRelationships.find((r) => r.relationshipType === 'shared_bank_account');
    expect(rel).toBeDefined();
    expect(rel?.severity).toBe('CRITICAL');
    expect(result.profiles['vA'].findings.some((f) => f.ruleName === 'shared_beneficiary_account')).toBe(true);
    expect(result.profiles['vA'].riskScore).toBe(30);
  });

  it('flags interlocking directorships when director names overlap between distinct vendors', () => {
    const vA = makeVendor('vA', 'Director Entity 1', {
      demoDirectorNames: ['Director Ramesh Kumar', 'Director Anita Roy'],
    });
    const vB = makeVendor('vB', 'Director Entity 2', {
      demoDirectorNames: ['Director Anita Roy', 'Director David Lee'],
    });

    const result = runVendorIntelligenceAnalysis({
      vendors: [vA, vB],
      projects: [],
      invoices: [],
    });

    const rel = result.allRelationships.find((r) => r.relationshipType === 'shared_directors');
    expect(rel).toBeDefined();
    expect(rel?.severity).toBe('HIGH');
    expect(rel?.sharedValues[0]).toContain('Anita Roy');
    expect(result.profiles['vA'].findings.some((f) => f.ruleName === 'interlocking_directorship')).toBe(true);
    expect(result.profiles['vA'].riskScore).toBe(25);
  });

  it('flags shared operational physical address between vendors', () => {
    const commonAddress = 'Demo Plot 42, Sector 18, Industrial Area, Okhla Phase III, New Delhi (Synthetic Demo)';
    const vA = makeVendor('vA', 'Address Co A', { demoPhysicalAddress: commonAddress });
    const vB = makeVendor('vB', 'Address Co B', { demoPhysicalAddress: commonAddress });

    const result = runVendorIntelligenceAnalysis({
      vendors: [vA, vB],
      projects: [],
      invoices: [],
    });

    expect(result.allRelationships.some((r) => r.relationshipType === 'shared_address')).toBe(true);
    expect(result.profiles['vA'].findings.some((f) => f.ruleName === 'shared_operational_address')).toBe(true);
    expect(result.profiles['vA'].riskScore).toBe(20);
  });

  it('flags vendors with repeat participation in high-risk projects', () => {
    const highRiskVendor = makeVendor('v-hr', 'High Risk Works Ltd');

    const p1: Project = {
      ...normalProject,
      id: 'P-HR-1',
      vendor: 'High Risk Works Ltd',
      risk: 'CRITICAL',
      riskScore: 92,
      verify: 'Failed',
    };
    const p2: Project = {
      ...normalProject,
      id: 'P-HR-2',
      vendor: 'High Risk Works Ltd',
      risk: 'HIGH',
      riskScore: 78,
      verify: 'Pending',
    };

    const result = runVendorIntelligenceAnalysis({
      vendors: [highRiskVendor],
      projects: [p1, p2],
      invoices: [],
    });

    const profile = result.profiles['v-hr'];
    expect(profile.findings.some((f) => f.ruleName === 'high_risk_project_concentration')).toBe(true);
    expect(profile.findings[0].detail).toContain('2 projects categorized with HIGH or CRITICAL');
    expect(profile.riskScore).toBe(20);
  });

  it('detects cross-vendor duplicate invoice numbers', () => {
    const vA = makeVendor('vA', 'Vendor One');
    const vB = makeVendor('vB', 'Vendor Two');

    const inv1: Invoice = {
      id: 'inv-1',
      projectId: 'P1',
      vendorId: 'vA',
      invoiceDate: '2026-03-01',
      invoiceNumber: 'INV-SHARED-9900',
      description: 'Test invoice 1',
      claimedAmount: 500_000,
      taxAmount: 0,
      totalAmount: 500_000,
      verificationStatus: 'pending',
      lineItems: [],
    };

    const inv2: Invoice = {
      id: 'inv-2',
      projectId: 'P2',
      vendorId: 'vB',
      invoiceDate: '2026-03-05',
      invoiceNumber: 'INV-SHARED-9900', // Duplicate invoice number across distinct vendors
      description: 'Test invoice 2',
      claimedAmount: 820_000, // Distinct amount so coordinated billing parity is not triggered
      taxAmount: 0,
      totalAmount: 820_000,
      verificationStatus: 'pending',
      lineItems: [],
    };

    const result = runVendorIntelligenceAnalysis({
      vendors: [vA, vB],
      projects: [],
      invoices: [inv1, inv2],
    });

    const rel = result.allRelationships.find((r) => r.relationshipType === 'shared_invoice_number');
    expect(rel).toBeDefined();
    expect(rel?.severity).toBe('CRITICAL');
    expect(result.profiles['vA'].findings.some((f) => f.ruleName === 'shared_invoice_identifier')).toBe(true);
    expect(result.profiles['vA'].riskScore).toBe(35);
  });

  it('detects possible coordinated billing patterns between linked vendors', () => {
    const vA = makeVendor('vA', 'Linked Co A', { demoContactDomain: 'joint-group.demo.internal' });
    const vB = makeVendor('vB', 'Linked Co B', { demoContactDomain: 'joint-group.demo.internal' });

    // Both submit identical amount of ₹25,00,000 within 4 days
    const invA: Invoice = {
      id: 'inv-coord-a',
      projectId: 'P1',
      vendorId: 'vA',
      invoiceDate: '2026-02-10',
      invoiceNumber: 'INV-A-101',
      description: 'Civil tranche 1',
      claimedAmount: 2_500_000,
      taxAmount: 0,
      totalAmount: 2_500_000,
      verificationStatus: 'pending',
      lineItems: [],
    };
    const invB: Invoice = {
      id: 'inv-coord-b',
      projectId: 'P2',
      vendorId: 'vB',
      invoiceDate: '2026-02-14',
      invoiceNumber: 'INV-B-202',
      description: 'Civil tranche 2',
      claimedAmount: 2_500_000, // Identical claim amount
      taxAmount: 0,
      totalAmount: 2_500_000,
      verificationStatus: 'pending',
      lineItems: [],
    };

    const result = runVendorIntelligenceAnalysis({
      vendors: [vA, vB],
      projects: [],
      invoices: [invA, invB],
    });

    expect(result.allRelationships.some((r) => r.relationshipType === 'coordinated_billing')).toBe(true);
    expect(result.profiles['vA'].findings.some((f) => f.ruleName === 'coordinated_billing_pattern')).toBe(true);
  });

  it('strictly clamps risk score between 0 and 100 under heavy cumulative violations', () => {
    // Highly suspicious entity triggering multiple rules
    const extremeVendor = makeVendor('v-extreme', 'Extreme Suspicious Ltd', {
      projectsCount: 15,
      totalValueCrore: 20,
      risk: 'CRITICAL',
      riskScore: 99,
      concentration: 85,
      alerts: 10,
      districtsCount: 1,
      highRisk: 8,
      demoPanToken: 'DEMO-PAN-COMMON',
      demoBankTokenHash: 'BANK-TOKEN-COMMON',
      demoPhysicalAddress: 'Common Address Compound',
      demoDirectorNames: ['Overlapping Director'],
      demoContactDomain: 'common.demo.internal',
    });
    const peerVendor = makeVendor('v-peer', 'Peer Entity', {
      demoPanToken: 'DEMO-PAN-COMMON',
      demoBankTokenHash: 'BANK-TOKEN-COMMON',
      demoPhysicalAddress: 'Common Address Compound',
      demoDirectorNames: ['Overlapping Director'],
      demoContactDomain: 'common.demo.internal',
    });

    const p1: Project = { ...normalProject, id: 'P1', vendor: 'Extreme Suspicious Ltd', risk: 'CRITICAL', riskScore: 95 };
    const p2: Project = { ...normalProject, id: 'P2', vendor: 'Extreme Suspicious Ltd', risk: 'HIGH', riskScore: 85 };

    const result = runVendorIntelligenceAnalysis({
      vendors: [extremeVendor, peerVendor],
      projects: [p1, p2],
      invoices: [],
    });

    const score = result.profiles['v-extreme'].riskScore;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(100); // Caps cleanly at 100
    expect(result.profiles['v-extreme'].riskLevel).toBe('CRITICAL');
  });

  it('correctly maps severity bands from scores', () => {
    expect(classifyVendorRisk(0)).toBe('LOW');
    expect(classifyVendorRisk(24)).toBe('LOW');
    expect(classifyVendorRisk(25)).toBe('MEDIUM');
    expect(classifyVendorRisk(49)).toBe('MEDIUM');
    expect(classifyVendorRisk(50)).toBe('HIGH');
    expect(classifyVendorRisk(74)).toBe('HIGH');
    expect(classifyVendorRisk(75)).toBe('CRITICAL');
    expect(classifyVendorRisk(100)).toBe('CRITICAL');
  });

  it('correctly builds connected collusion clusters from related entities', () => {
    const v1 = makeVendor('v1', 'Cluster A1', { demoPanToken: 'PAN-C1' });
    const v2 = makeVendor('v2', 'Cluster A2', { demoPanToken: 'PAN-C1' });
    const v3 = makeVendor('v3', 'Cluster B1', { demoPhysicalAddress: 'Address C2 Long Enough Address' });
    const v4 = makeVendor('v4', 'Cluster B2', { demoPhysicalAddress: 'Address C2 Long Enough Address' });
    const cleanAlone = makeVendor('v-clean-alone', 'Solo Independent');

    const result = runVendorIntelligenceAnalysis({
      vendors: [v1, v2, v3, v4, cleanAlone],
      projects: [],
      invoices: [],
    });

    expect(result.clusters.length).toBe(2);
    expect(result.clusters.some((c) => c.vendorIds.includes('v1') && c.vendorIds.includes('v2'))).toBe(true);
    expect(result.clusters.some((c) => c.vendorIds.includes('v3') && c.vendorIds.includes('v4'))).toBe(true);
    // Unrelated clean vendor is not included in any cluster
    expect(result.clusters.some((c) => c.vendorIds.includes('v-clean-alone'))).toBe(false);
  });

  it('executes successfully on the synthetic demonstration dataset', () => {
    const result = runVendorIntelligenceAnalysis({
      vendors: SYNTHETIC_DEMO_VENDORS,
      projects: getDemoProjects(),
      invoices: SYNTHETIC_DEMO_INVOICES,
    });

    expect(result.vendorsAnalyzed).toBe(SYNTHETIC_DEMO_VENDORS.length);
    expect(result.allRelationships.length).toBeGreaterThan(0);
    expect(result.clusters.length).toBeGreaterThan(0);

    // Shree Sai Engineers must be clean
    const shree = result.profiles['v-shree'];
    expect(shree).toBeDefined();
    expect(shree.riskLevel).toBe('LOW');
    expect(shree.findings).toHaveLength(0);

    // ABC Infra must have high/critical risk score and findings
    const abc = result.profiles['v-abc'];
    expect(abc).toBeDefined();
    expect(abc.riskLevel).toBe('CRITICAL');
    expect(abc.findings.length).toBeGreaterThan(0);
  });

  it('computes unified summary counts that strictly match vendor profile findings', () => {
    const result = runVendorIntelligenceAnalysis({
      vendors: SYNTHETIC_DEMO_VENDORS,
      projects: getDemoProjects(),
      invoices: SYNTHETIC_DEMO_INVOICES,
    });

    const profiles = Object.values(result.profiles);
    const summary = result.summary;

    expect(summary.vendorsAnalyzed).toBe(SYNTHETIC_DEMO_VENDORS.length);
    expect(summary.flaggedTiesCount).toBe(result.allRelationships.length);
    expect(summary.identifiedClustersCount).toBe(result.clusters.length);

    // Profile risk level sums match summary
    const crit = profiles.filter((p) => p.riskLevel === 'CRITICAL').length;
    const high = profiles.filter((p) => p.riskLevel === 'HIGH').length;
    const med = profiles.filter((p) => p.riskLevel === 'MEDIUM').length;
    const low = profiles.filter((p) => p.riskLevel === 'LOW').length;

    expect(summary.criticalRiskCount).toBe(crit);
    expect(summary.highRiskCount).toBe(high);
    expect(summary.mediumRiskCount).toBe(med);
    expect(summary.lowRiskCount).toBe(low);
    expect(summary.highCriticalRiskCount).toBe(crit + high);
    expect(crit + high + med + low).toBe(summary.vendorsAnalyzed);

    // Flagged vendors and total indicators match profiles
    const flaggedVendors = profiles.filter((p) => p.findings.length > 0).length;
    const totalFindings = profiles.reduce((acc, p) => acc + p.findings.length, 0);

    expect(summary.flaggedVendorsCount).toBe(flaggedVendors);
    expect(summary.totalIndicatorsCount).toBe(totalFindings);
    expect(summary.totalIndicatorsCount).toBe(result.allFindings.length);
  });

  it('separates individual findings from pairwise ties: a vendor with 1 finding does not disappear with 0 ties', () => {
    // Single vendor with 2 high-risk projects (Rule 2 triggers, generating 1 finding and 20 points, but 0 pairwise ties)
    const soloVendor = makeVendor('v-solo', 'Solo High Risk Contractor Ltd', {
      demoPanToken: undefined,
      demoPhysicalAddress: undefined,
      demoDirectorNames: undefined,
      demoContactDomain: undefined,
      demoBankTokenHash: undefined,
    });

    const p1: Project = { ...normalProject, id: 'P1', vendor: 'Solo High Risk Contractor Ltd', risk: 'CRITICAL', riskScore: 85 };
    const p2: Project = { ...normalProject, id: 'P2', vendor: 'Solo High Risk Contractor Ltd', risk: 'HIGH', riskScore: 75 };

    const result = runVendorIntelligenceAnalysis({
      vendors: [soloVendor],
      projects: [p1, p2],
      invoices: [],
    });

    // Pairwise relationships must be exactly 0
    expect(result.allRelationships).toHaveLength(0);
    expect(result.clusters).toHaveLength(0);
    expect(result.summary.flaggedTiesCount).toBe(0);
    expect(result.summary.identifiedClustersCount).toBe(0);

    // Vendor finding MUST be recorded in the summary and profile
    expect(result.summary.flaggedVendorsCount).toBe(1);
    expect(result.summary.totalIndicatorsCount).toBe(1);
    expect(result.profiles['v-solo'].findings).toHaveLength(1);
    expect(result.profiles['v-solo'].findings[0].ruleName).toBe('high_risk_project_concentration');
    expect(result.profiles['v-solo'].riskScore).toBe(20);
    expect(result.profiles['v-solo'].riskLevel).toBe('LOW');
  });

  it('guarantees no duplicate relationships or vendor profiles', () => {
    const result = runVendorIntelligenceAnalysis({
      vendors: SYNTHETIC_DEMO_VENDORS,
      projects: getDemoProjects(),
      invoices: SYNTHETIC_DEMO_INVOICES,
    });

    // Check no duplicate vendor profile IDs
    const profileKeys = Object.keys(result.profiles);
    const uniqueKeys = new Set(profileKeys);
    expect(profileKeys.length).toBe(uniqueKeys.size);

    // Check no duplicate relationship pairs for the same type
    const relSignatures = new Set<string>();
    for (const rel of result.allRelationships) {
      const pair = [rel.sourceVendorId, rel.targetVendorId].sort().join('<->');
      const sig = `${pair}::${rel.relationshipType}`;
      expect(relSignatures.has(sig)).toBe(false);
      relSignatures.add(sig);
    }
  });

  it('verifies filters do not alter the underlying global analysis summary', () => {
    const result = runVendorIntelligenceAnalysis({
      vendors: SYNTHETIC_DEMO_VENDORS,
      projects: getDemoProjects(),
      invoices: SYNTHETIC_DEMO_INVOICES,
    });

    const baselineSummary = { ...result.summary };

    // Simulate UI directory filter: query "Sharma"
    const query = 'Sharma';
    const filtered = SYNTHETIC_DEMO_VENDORS.filter((v) =>
      v.name.toLowerCase().includes(query.toLowerCase()),
    );
    expect(filtered.length).toBe(1);

    // Filter by risk: "CRITICAL"
    const criticalOnly = SYNTHETIC_DEMO_VENDORS.filter(
      (v) => result.profiles[v.id]?.riskLevel === 'CRITICAL',
    );
    expect(criticalOnly.length).toBeGreaterThanOrEqual(1);

    // Global summary must remain completely unchanged
    expect(result.summary).toEqual(baselineSummary);
    expect(result.summary.vendorsAnalyzed).toBe(SYNTHETIC_DEMO_VENDORS.length);
  });
});

