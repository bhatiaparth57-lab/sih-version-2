/**
 * =====================================================================
 * FRAUDGUARD — Layer 3: Vendor Intelligence & Collusion Detection Engine
 *
 * Deterministic, explainable, rule-based analysis module.
 *
 * DISCLAIMER: This engine flags suspicious indicators and potential
 * collusion patterns for human auditor review and verification. It does
 * NOT establish criminal liability, corruption, or proven fraud.
 *
 * Terminology strictly adheres to audit standards:
 * - "Potential collusion indicator"
 * - "Suspicious relationship"
 * - "Requires investigation"
 * - "Possible coordinated billing pattern"
 * =====================================================================
 */

import type { Project, Risk } from '@/lib/data';
import type { Invoice } from '@/lib/financialTypes';
import type {
  CollusionCluster,
  RelationshipType,
  ScoreBreakdownItem,
  VendorFinding,
  VendorIntelligenceProfile,
  VendorIntelligenceResult,
  VendorRecord,
  VendorRelationship,
} from '@/lib/vendorTypes';

export interface VendorIntelligenceInput {
  vendors: VendorRecord[];
  projects: Project[];
  invoices?: Invoice[];
}

/**
 * Rule Scoring Weights (Points contributed to the 0 - 100 composite risk score)
 */
export const VENDOR_RULE_WEIGHTS = {
  shared_pan_clone: { points: 35, severity: 'CRITICAL' as Risk },
  shared_invoice_identifier: { points: 35, severity: 'CRITICAL' as Risk },
  shared_beneficiary_account: { points: 30, severity: 'CRITICAL' as Risk },
  interlocking_directorship: { points: 25, severity: 'HIGH' as Risk },
  shared_operational_address: { points: 20, severity: 'HIGH' as Risk },
  high_risk_project_concentration: { points: 20, severity: 'HIGH' as Risk },
  coordinated_billing_pattern: { points: 20, severity: 'HIGH' as Risk },
  shared_contact_domain: { points: 15, severity: 'MEDIUM' as Risk },
  geographic_ring_concentration: { points: 15, severity: 'MEDIUM' as Risk },
  rapid_related_billing: { points: 15, severity: 'MEDIUM' as Risk },
  declared_affiliation_flag: { points: 10, severity: 'MEDIUM' as Risk },
} as const;

export function classifyVendorRisk(score: number): Risk {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function normalizeStr(s: string | undefined): string {
  return (s || '').toLowerCase().trim().replace(/[\s,.-]+/g, ' ');
}

/**
 * Executes Layer 3: Rule-Based Vendor Intelligence Analysis across all provided vendors, projects, and invoices.
 */
export function runVendorIntelligenceAnalysis(input: VendorIntelligenceInput): VendorIntelligenceResult {
  const { vendors = [], projects = [], invoices = [] } = input;

  const allRelationships: VendorRelationship[] = [];
  const findingsByVendor = new Map<string, VendorFinding[]>();
  const scoreBreakdownByVendor = new Map<string, ScoreBreakdownItem[]>();

  // Helper to append finding to a vendor
  function addFinding(vendorId: string, finding: VendorFinding) {
    const list = findingsByVendor.get(vendorId) || [];
    list.push(finding);
    findingsByVendor.set(vendorId, list);
  }

  // Helper to append score breakdown to a vendor
  function addScoreItem(vendorId: string, item: ScoreBreakdownItem) {
    const list = scoreBreakdownByVendor.get(vendorId) || [];
    list.push(item);
    scoreBreakdownByVendor.set(vendorId, list);
  }

  // Helper to add a directional or bidirectional relationship
  function addRelationship(rel: VendorRelationship) {
    const exists = allRelationships.some(
      (r) =>
        (r.sourceVendorId === rel.sourceVendorId && r.targetVendorId === rel.targetVendorId && r.relationshipType === rel.relationshipType) ||
        (r.sourceVendorId === rel.targetVendorId && r.targetVendorId === rel.sourceVendorId && r.relationshipType === rel.relationshipType),
    );
    if (!exists) {
      allRelationships.push(rel);
    }
  }

  // =========================================================================
  // RULE 1: SHARED STRUCTURAL ATTRIBUTES (PAN, Address, Director, Bank, Contact)
  // =========================================================================
  for (let i = 0; i < vendors.length; i++) {
    for (let j = i + 1; j < vendors.length; j++) {
      const vA = vendors[i];
      const vB = vendors[j];

      // 1A. Shared Synthetic PAN Token (Entity Cloning / Duplicate registration)
      if (vA.demoPanToken && vB.demoPanToken && vA.demoPanToken === vB.demoPanToken) {
        const title = 'Potential collusion indicator: Shared synthetic PAN token';
        const detail = `Vendors "${vA.name}" and "${vB.name}" present identical synthetic PAN token registration "${vA.demoPanToken}".`;
        const evidence = [
          `Matching synthetic PAN token: ${vA.demoPanToken}`,
          `Entities: ${vA.name} and ${vB.name}`,
          'Requires verification against official registration registry',
        ];
        const action = 'Request incorporation documents and physical identity verification for both entities';

        addRelationship({
          id: `rel-pan-${vA.id}-${vB.id}`,
          sourceVendorId: vA.id,
          targetVendorId: vB.id,
          sourceVendorName: vA.name,
          targetVendorName: vB.name,
          relationshipType: 'shared_pan',
          severity: VENDOR_RULE_WEIGHTS.shared_pan_clone.severity,
          confidence: 99,
          title,
          description: detail,
          evidence,
          sharedValues: [vA.demoPanToken],
        });

        [vA, vB].forEach((v, idx) => {
          const other = idx === 0 ? vB : vA;
          addFinding(v.id, {
            id: `find-pan-${v.id}-${other.id}`,
            ruleName: 'shared_pan_clone',
            vendorId: v.id,
            vendorName: v.name,
            severity: VENDOR_RULE_WEIGHTS.shared_pan_clone.severity,
            confidence: 99,
            points: VENDOR_RULE_WEIGHTS.shared_pan_clone.points,
            title,
            detail,
            evidence,
            recommendedAction: action,
            relatedVendorIds: [other.id],
            relatedVendorNames: [other.name],
          });
          addScoreItem(v.id, {
            ruleName: 'shared_pan_clone',
            points: VENDOR_RULE_WEIGHTS.shared_pan_clone.points,
            reason: `Shared registration token with ${other.name}`,
          });
        });
      }

      // 1B. Shared Synthetic Beneficiary Bank Account Hash
      if (vA.demoBankTokenHash && vB.demoBankTokenHash && vA.demoBankTokenHash === vB.demoBankTokenHash) {
        const title = 'Potential collusion indicator: Shared beneficiary banking hash';
        const detail = `Vendors "${vA.name}" and "${vB.name}" share the same synthetic disbursement account identifier (${vA.demoBankTokenHash}).`;
        const evidence = [
          `Shared synthetic bank hash: ${vA.demoBankTokenHash}`,
          `Common payment beneficiary link detected between distinct bidding entities`,
        ];
        const action = 'Initiate banking mandate audit and trace beneficial ownership of linked accounts';

        addRelationship({
          id: `rel-bank-${vA.id}-${vB.id}`,
          sourceVendorId: vA.id,
          targetVendorId: vB.id,
          sourceVendorName: vA.name,
          targetVendorName: vB.name,
          relationshipType: 'shared_bank_account',
          severity: VENDOR_RULE_WEIGHTS.shared_beneficiary_account.severity,
          confidence: 95,
          title,
          description: detail,
          evidence,
          sharedValues: [vA.demoBankTokenHash],
        });

        [vA, vB].forEach((v, idx) => {
          const other = idx === 0 ? vB : vA;
          addFinding(v.id, {
            id: `find-bank-${v.id}-${other.id}`,
            ruleName: 'shared_beneficiary_account',
            vendorId: v.id,
            vendorName: v.name,
            severity: VENDOR_RULE_WEIGHTS.shared_beneficiary_account.severity,
            confidence: 95,
            points: VENDOR_RULE_WEIGHTS.shared_beneficiary_account.points,
            title,
            detail,
            evidence,
            recommendedAction: action,
            relatedVendorIds: [other.id],
            relatedVendorNames: [other.name],
          });
          addScoreItem(v.id, {
            ruleName: 'shared_beneficiary_account',
            points: VENDOR_RULE_WEIGHTS.shared_beneficiary_account.points,
            reason: `Shared payment beneficiary account hash with ${other.name}`,
          });
        });
      }

      // 1C. Interlocking Directorships (Overlapping Director Names)
      if (vA.demoDirectorNames && vB.demoDirectorNames) {
        const commonDirs = vA.demoDirectorNames.filter((dA) =>
          vB.demoDirectorNames?.some((dB) => normalizeStr(dA) === normalizeStr(dB)),
        );

        if (commonDirs.length > 0) {
          const title = 'Suspicious relationship: Interlocking directorship detected';
          const detail = `Vendors "${vA.name}" and "${vB.name}" share common management (${commonDirs.join(', ')}).`;
          const evidence = [
            `Common directorship overlap: ${commonDirs.join(', ')}`,
            'Cross-directorship in competing public procurement tenders',
          ];
          const action = 'Review corporate filings (MCA-21 DIN records) for conflict of interest';

          addRelationship({
            id: `rel-dir-${vA.id}-${vB.id}`,
            sourceVendorId: vA.id,
            targetVendorId: vB.id,
            sourceVendorName: vA.name,
            targetVendorName: vB.name,
            relationshipType: 'shared_directors',
            severity: VENDOR_RULE_WEIGHTS.interlocking_directorship.severity,
            confidence: 92,
            title,
            description: detail,
            evidence,
            sharedValues: commonDirs,
          });

          [vA, vB].forEach((v, idx) => {
            const other = idx === 0 ? vB : vA;
            addFinding(v.id, {
              id: `find-dir-${v.id}-${other.id}`,
              ruleName: 'interlocking_directorship',
              vendorId: v.id,
              vendorName: v.name,
              severity: VENDOR_RULE_WEIGHTS.interlocking_directorship.severity,
              confidence: 92,
              points: VENDOR_RULE_WEIGHTS.interlocking_directorship.points,
              title,
              detail,
              evidence,
              recommendedAction: action,
              relatedVendorIds: [other.id],
              relatedVendorNames: [other.name],
            });
            addScoreItem(v.id, {
              ruleName: 'interlocking_directorship',
              points: VENDOR_RULE_WEIGHTS.interlocking_directorship.points,
              reason: `Common director (${commonDirs.join(', ')}) with ${other.name}`,
            });
          });
        }
      }

      // 1D. Shared Registered Operational Address
      if (vA.demoPhysicalAddress && vB.demoPhysicalAddress) {
        const normA = normalizeStr(vA.demoPhysicalAddress);
        const normB = normalizeStr(vB.demoPhysicalAddress);
        if (normA.length > 10 && normA === normB) {
          const title = 'Suspicious relationship: Shared operational premises';
          const detail = `Vendors "${vA.name}" and "${vB.name}" report identical registered physical address (${vA.demoPhysicalAddress}).`;
          const evidence = [
            `Identical registered address: ${vA.demoPhysicalAddress}`,
            'Co-located operational premises between supposedly independent contractors',
          ];
          const action = 'Conduct field verification of the physical premises and inspect lease agreements';

          addRelationship({
            id: `rel-addr-${vA.id}-${vB.id}`,
            sourceVendorId: vA.id,
            targetVendorId: vB.id,
            sourceVendorName: vA.name,
            targetVendorName: vB.name,
            relationshipType: 'shared_address',
            severity: VENDOR_RULE_WEIGHTS.shared_operational_address.severity,
            confidence: 88,
            title,
            description: detail,
            evidence,
            sharedValues: [vA.demoPhysicalAddress],
          });

          [vA, vB].forEach((v, idx) => {
            const other = idx === 0 ? vB : vA;
            addFinding(v.id, {
              id: `find-addr-${v.id}-${other.id}`,
              ruleName: 'shared_operational_address',
              vendorId: v.id,
              vendorName: v.name,
              severity: VENDOR_RULE_WEIGHTS.shared_operational_address.severity,
              confidence: 88,
              points: VENDOR_RULE_WEIGHTS.shared_operational_address.points,
              title,
              detail,
              evidence,
              recommendedAction: action,
              relatedVendorIds: [other.id],
              relatedVendorNames: [other.name],
            });
            addScoreItem(v.id, {
              ruleName: 'shared_operational_address',
              points: VENDOR_RULE_WEIGHTS.shared_operational_address.points,
              reason: `Shared operational address with ${other.name}`,
            });
          });
        }
      }

      // 1E. Shared Contact Domain
      if (vA.demoContactDomain && vB.demoContactDomain && vA.demoContactDomain === vB.demoContactDomain) {
        const title = 'Potential collusion indicator: Shared contact channel domain';
        const detail = `Vendors "${vA.name}" and "${vB.name}" utilize common corporate communication domain (${vA.demoContactDomain}).`;
        const evidence = [
          `Shared contact domain: ${vA.demoContactDomain}`,
          'Shared IT infrastructure or joint administration channel',
        ];
        const action = 'Verify domain registration (WHOIS) and corporate email provenance';

        addRelationship({
          id: `rel-contact-${vA.id}-${vB.id}`,
          sourceVendorId: vA.id,
          targetVendorId: vB.id,
          sourceVendorName: vA.name,
          targetVendorName: vB.name,
          relationshipType: 'shared_contact',
          severity: VENDOR_RULE_WEIGHTS.shared_contact_domain.severity,
          confidence: 80,
          title,
          description: detail,
          evidence,
          sharedValues: [vA.demoContactDomain],
        });

        [vA, vB].forEach((v, idx) => {
          const other = idx === 0 ? vB : vA;
          addFinding(v.id, {
            id: `find-contact-${v.id}-${other.id}`,
            ruleName: 'shared_contact_domain',
            vendorId: v.id,
            vendorName: v.name,
            severity: VENDOR_RULE_WEIGHTS.shared_contact_domain.severity,
            confidence: 80,
            points: VENDOR_RULE_WEIGHTS.shared_contact_domain.points,
            title,
            detail,
            evidence,
            recommendedAction: action,
            relatedVendorIds: [other.id],
            relatedVendorNames: [other.name],
          });
          addScoreItem(v.id, {
            ruleName: 'shared_contact_domain',
            points: VENDOR_RULE_WEIGHTS.shared_contact_domain.points,
            reason: `Shared contact domain with ${other.name}`,
          });
        });
      }

      // 1F. Declared Baseline Relation Check
      if (vA.relation && vA.relation !== '—' && vA.relation.toLowerCase().includes(vB.name.toLowerCase().split(' ')[0])) {
        const title = 'Requires investigation: Disclosed structural affiliation';
        const detail = `Declared relationship noted: "${vA.relation}".`;
        const evidence = [`Contract documentation note: ${vA.relation}`];
        const action = 'Review tender compliance disclosure forms for non-collusion affidavits';

        addRelationship({
          id: `rel-declared-${vA.id}-${vB.id}`,
          sourceVendorId: vA.id,
          targetVendorId: vB.id,
          sourceVendorName: vA.name,
          targetVendorName: vB.name,
          relationshipType: 'declared_affiliation',
          severity: VENDOR_RULE_WEIGHTS.declared_affiliation_flag.severity,
          confidence: 75,
          title,
          description: detail,
          evidence,
          sharedValues: [vA.relation],
        });

        addFinding(vA.id, {
          id: `find-decl-${vA.id}-${vB.id}`,
          ruleName: 'declared_affiliation_flag',
          vendorId: vA.id,
          vendorName: vA.name,
          severity: VENDOR_RULE_WEIGHTS.declared_affiliation_flag.severity,
          confidence: 75,
          points: VENDOR_RULE_WEIGHTS.declared_affiliation_flag.points,
          title,
          detail,
          evidence,
          recommendedAction: action,
          relatedVendorIds: [vB.id],
          relatedVendorNames: [vB.name],
        });
        addScoreItem(vA.id, {
          ruleName: 'declared_affiliation_flag',
          points: VENDOR_RULE_WEIGHTS.declared_affiliation_flag.points,
          reason: `Declared affiliation with ${vB.name}`,
        });
      }
    }
  }

  // =========================================================================
  // RULE 2: HIGH-RISK PROJECT CONCENTRATION (Based on existing Project data)
  // =========================================================================
  for (const vendor of vendors) {
    const assignedProjects = projects.filter(
      (p) => normalizeStr(p.vendor) === normalizeStr(vendor.name) || p.vendor.includes(vendor.name),
    );
    const highRiskProjects = assignedProjects.filter(
      (p) => p.risk === 'CRITICAL' || p.risk === 'HIGH' || p.riskScore >= 70 || p.verify === 'Failed',
    );

    if (highRiskProjects.length >= 2) {
      const title = 'Requires investigation: Repeat participation in high-risk projects';
      const detail = `Vendor is assigned to ${highRiskProjects.length} projects categorized with HIGH or CRITICAL risk scores (${highRiskProjects.map((p) => p.id).join(', ')}).`;
      const evidence = [
        `Total assigned projects in system: ${assignedProjects.length}`,
        `Projects flagged with anomalies: ${highRiskProjects.length}`,
        `Project IDs: ${highRiskProjects.map((p) => `${p.id} (Risk: ${p.riskScore}/100, ${p.finding})`).join('; ')}`,
      ];
      const action = 'Review vendor past performance ratings and conduct cross-project technical audit';

      addFinding(vendor.id, {
        id: `find-hrp-${vendor.id}`,
        ruleName: 'high_risk_project_concentration',
        vendorId: vendor.id,
        vendorName: vendor.name,
        severity: VENDOR_RULE_WEIGHTS.high_risk_project_concentration.severity,
        confidence: 85,
        points: VENDOR_RULE_WEIGHTS.high_risk_project_concentration.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
        relatedProjectIds: highRiskProjects.map((p) => p.id),
      });

      addScoreItem(vendor.id, {
        ruleName: 'high_risk_project_concentration',
        points: VENDOR_RULE_WEIGHTS.high_risk_project_concentration.points,
        reason: `${highRiskProjects.length} high-risk project assignments`,
      });
    }
  }

  // =========================================================================
  // RULE 3: CROSS-VENDOR INVOICING (Duplicate numbers, Coordinated billing)
  // =========================================================================
  // Helper to resolve invoice vendor to VendorRecord
  function findVendorByInvoice(inv: Invoice): VendorRecord | undefined {
    return vendors.find(
      (v) =>
        v.id.toLowerCase() === inv.vendorId.toLowerCase() ||
        v.id.toLowerCase().replace('v-', '') === inv.vendorId.toLowerCase().replace('v-', '') ||
        normalizeStr(v.name) === normalizeStr(inv.vendorId) ||
        (inv.vendorId === 'V-ABC' && v.name.includes('ABC')) ||
        (inv.vendorId === 'V-ORBIT' && v.name.includes('Orbit')) ||
        (inv.vendorId === 'V-GVK' && v.name.includes('GVK')) ||
        (inv.vendorId === 'V-JMD' && v.name.includes('JMD')),
    );
  }

  // 3A. Cross-Vendor Duplicate Invoice Identifier
  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const invA = invoices[i];
      const invB = invoices[j];

      if (invA.invoiceNumber && invB.invoiceNumber && invA.invoiceNumber.trim() === invB.invoiceNumber.trim()) {
        const venA = findVendorByInvoice(invA);
        const venB = findVendorByInvoice(invB);

        if (venA && venB && venA.id !== venB.id) {
          const title = 'Potential collusion indicator: Cross-vendor duplicate invoice number';
          const detail = `Distinct vendors "${venA.name}" and "${venB.name}" submitted identical invoice number "${invA.invoiceNumber}" across separate projects.`;
          const evidence = [
            `Matching invoice number: ${invA.invoiceNumber}`,
            `Invoice 1: ${invA.id} (${venA.name}, Project ${invA.projectId}, Claim: ₹${invA.claimedAmount.toLocaleString('en-IN')})`,
            `Invoice 2: ${invB.id} (${venB.name}, Project ${invB.projectId}, Claim: ₹${invB.claimedAmount.toLocaleString('en-IN')})`,
          ];
          const action = 'Issue immediate payment freeze on both invoices and request original physical bills';

          addRelationship({
            id: `rel-invdup-${venA.id}-${venB.id}`,
            sourceVendorId: venA.id,
            targetVendorId: venB.id,
            sourceVendorName: venA.name,
            targetVendorName: venB.name,
            relationshipType: 'shared_invoice_number',
            severity: VENDOR_RULE_WEIGHTS.shared_invoice_identifier.severity,
            confidence: 98,
            title,
            description: detail,
            evidence,
            sharedValues: [invA.invoiceNumber],
          });

          [venA, venB].forEach((v, idx) => {
            const other = idx === 0 ? venB : venA;
            addFinding(v.id, {
              id: `find-invdup-${v.id}-${other.id}`,
              ruleName: 'shared_invoice_identifier',
              vendorId: v.id,
              vendorName: v.name,
              severity: VENDOR_RULE_WEIGHTS.shared_invoice_identifier.severity,
              confidence: 98,
              points: VENDOR_RULE_WEIGHTS.shared_invoice_identifier.points,
              title,
              detail,
              evidence,
              recommendedAction: action,
              relatedVendorIds: [other.id],
              relatedVendorNames: [other.name],
              relatedProjectIds: [invA.projectId, invB.projectId],
            });
            addScoreItem(v.id, {
              ruleName: 'shared_invoice_identifier',
              points: VENDOR_RULE_WEIGHTS.shared_invoice_identifier.points,
              reason: `Shared invoice number ${invA.invoiceNumber} with ${other.name}`,
            });
          });
        }
      }
    }
  }

  // 3B. Possible Coordinated Billing Pattern (Near-identical amounts submitted contemporaneously)
  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const invA = invoices[i];
      const invB = invoices[j];
      const venA = findVendorByInvoice(invA);
      const venB = findVendorByInvoice(invB);

      if (venA && venB && venA.id !== venB.id) {
        // Check if amounts are within 1% of each other and above significant threshold (> ₹1 Lakh)
        const amtA = invA.claimedAmount;
        const amtB = invB.claimedAmount;
        const diffRatio = Math.abs(amtA - amtB) / Math.max(amtA, amtB);

        // Check if invoice dates are within 14 days
        const dateA = new Date(invA.invoiceDate).getTime();
        const dateB = new Date(invB.invoiceDate).getTime();
        const daysDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);

        if (diffRatio <= 0.01 && daysDiff <= 14 && amtA >= 100_000) {
          // Check if these vendors also share any structural link
          const shareLink = allRelationships.some(
            (r) =>
              (r.sourceVendorId === venA.id && r.targetVendorId === venB.id) ||
              (r.sourceVendorId === venB.id && r.targetVendorId === venA.id),
          );

          if (shareLink) {
            const title = 'Possible coordinated billing pattern detected';
            const detail = `Affiliated vendors "${venA.name}" and "${venB.name}" submitted synchronized invoice claims of ₹${amtA.toLocaleString('en-IN')} within ${Math.round(daysDiff)} days.`;
            const evidence = [
              `Claim amount parity: ₹${amtA.toLocaleString('en-IN')} vs ₹${amtB.toLocaleString('en-IN')} (delta < 1%)`,
              `Temporal proximity: Invoices submitted within ${Math.round(daysDiff)} days of each other`,
              `Invoices: ${invA.id} (${invA.projectId}) and ${invB.id} (${invB.projectId})`,
            ];
            const action = 'Audit project milestone sign-offs and verify measurement book (MB) records';

            addRelationship({
              id: `rel-coord-${venA.id}-${venB.id}`,
              sourceVendorId: venA.id,
              targetVendorId: venB.id,
              sourceVendorName: venA.name,
              targetVendorName: venB.name,
              relationshipType: 'coordinated_billing',
              severity: VENDOR_RULE_WEIGHTS.coordinated_billing_pattern.severity,
              confidence: 86,
              title,
              description: detail,
              evidence,
              sharedValues: [`₹${amtA.toLocaleString('en-IN')}`],
            });

            [venA, venB].forEach((v, idx) => {
              const other = idx === 0 ? venB : venA;
              addFinding(v.id, {
                id: `find-coord-${v.id}-${other.id}`,
                ruleName: 'coordinated_billing_pattern',
                vendorId: v.id,
                vendorName: v.name,
                severity: VENDOR_RULE_WEIGHTS.coordinated_billing_pattern.severity,
                confidence: 86,
                points: VENDOR_RULE_WEIGHTS.coordinated_billing_pattern.points,
                title,
                detail,
                evidence,
                recommendedAction: action,
                relatedVendorIds: [other.id],
                relatedVendorNames: [other.name],
                relatedProjectIds: [invA.projectId, invB.projectId],
              });
              addScoreItem(v.id, {
                ruleName: 'coordinated_billing_pattern',
                points: VENDOR_RULE_WEIGHTS.coordinated_billing_pattern.points,
                reason: `Synchronized invoice billing with ${other.name}`,
              });
            });
          }
        }
      }
    }
  }

  // =========================================================================
  // RULE 4: GEOGRAPHIC RING CONCENTRATION
  // =========================================================================
  for (const vendor of vendors) {
    if (vendor.concentration >= 60 && vendor.projectsCount >= 5 && vendor.districtsCount <= 2) {
      const title = 'Potential collusion indicator: Abnormal geographic tender concentration';
      const detail = `Vendor holds ${vendor.concentration}% project concentration across only ${vendor.districtsCount} district(s) with ${vendor.projectsCount} total tenders.`;
      const evidence = [
        `Geographic concentration: ${vendor.concentration}% (peer average: ~20%)`,
        `Districts served: ${vendor.districtsCount}`,
        `Total tenders awarded: ${vendor.projectsCount}`,
      ];
      const action = 'Review tender participation logs to detect bid suppression or non-competitive awards';

      addFinding(vendor.id, {
        id: `find-geo-${vendor.id}`,
        ruleName: 'geographic_ring_concentration',
        vendorId: vendor.id,
        vendorName: vendor.name,
        severity: VENDOR_RULE_WEIGHTS.geographic_ring_concentration.severity,
        confidence: 80,
        points: VENDOR_RULE_WEIGHTS.geographic_ring_concentration.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
      });

      addScoreItem(vendor.id, {
        ruleName: 'geographic_ring_concentration',
        points: VENDOR_RULE_WEIGHTS.geographic_ring_concentration.points,
        reason: `${vendor.concentration}% geographic concentration in limited districts`,
      });
    }
  }

  // =========================================================================
  // AGGREGATION, SCORE NORMALIZATION & PROFILES
  // =========================================================================
  const profiles: Record<string, VendorIntelligenceProfile> = {};

  for (const vendor of vendors) {
    const rawFindings = findingsByVendor.get(vendor.id) || [];
    const scoreItems = scoreBreakdownByVendor.get(vendor.id) || [];

    // Deduplicate findings by ruleName + relatedVendorIds
    const findings: VendorFinding[] = [];
    const seenFindingKey = new Set<string>();
    for (const f of rawFindings) {
      const key = `${f.ruleName}-${(f.relatedVendorIds || []).sort().join(',')}`;
      if (!seenFindingKey.has(key)) {
        seenFindingKey.add(key);
        findings.push(f);
      }
    }

    // Deduplicate score breakdown items
    const scoreBreakdown: ScoreBreakdownItem[] = [];
    const seenScoreKey = new Set<string>();
    let totalScore = 0;
    for (const s of scoreItems) {
      const key = `${s.ruleName}-${s.reason}`;
      if (!seenScoreKey.has(key)) {
        seenScoreKey.add(key);
        scoreBreakdown.push(s);
        totalScore += s.points;
      }
    }

    // Ensure score is strictly clamped between 0 and 100
    const riskScore = Math.min(100, Math.max(0, totalScore));
    const riskLevel = classifyVendorRisk(riskScore);

    // Vendor relationships
    const vendorRelationships = allRelationships.filter(
      (r) => r.sourceVendorId === vendor.id || r.targetVendorId === vendor.id,
    );

    // Related projects
    const relatedProjects = projects.filter(
      (p) => normalizeStr(p.vendor) === normalizeStr(vendor.name) || p.vendor.includes(vendor.name),
    );

    // Associated invoices
    const vendorInvoices = invoices.filter((inv) => {
      const v = findVendorByInvoice(inv);
      return v?.id === vendor.id;
    });
    const totalInvoicedInr = vendorInvoices.reduce((s, i) => s + i.claimedAmount, 0);

    profiles[vendor.id] = {
      vendor,
      riskScore,
      riskLevel,
      findings,
      scoreBreakdown,
      relationships: vendorRelationships,
      relatedProjects,
      invoicesCount: vendorInvoices.length,
      totalInvoicedInr,
    };
  }

  // =========================================================================
  // GRAPH CLUSTERING (Disjoint-Set / Connected Components)
  // =========================================================================
  const clusters = buildCollusionClusters(vendors, allRelationships);

  const allFindingsList: VendorFinding[] = [];
  for (const p of Object.values(profiles)) {
    allFindingsList.push(...p.findings);
  }

  return {
    engine: 'rule-based',
    analyzedAt: new Date().toISOString(),
    vendorsAnalyzed: vendors.length,
    profiles,
    allRelationships,
    allFindings: allFindingsList,
    clusters,
  };
}

/**
 * Connected Component Clustering: Groups linked vendors into identifiable collusion clusters.
 */
function buildCollusionClusters(vendors: VendorRecord[], relationships: VendorRelationship[]): CollusionCluster[] {
  const parent = new Map<string, string>();

  function find(id: string): string {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!));
    }
    return parent.get(id)!;
  }

  function union(a: string, b: string) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent.set(rootA, rootB);
    }
  }

  for (const rel of relationships) {
    union(rel.sourceVendorId, rel.targetVendorId);
  }

  const groupMap = new Map<string, string[]>();
  for (const v of vendors) {
    const root = find(v.id);
    const list = groupMap.get(root) || [];
    list.push(v.id);
    groupMap.set(root, list);
  }

  const clusters: CollusionCluster[] = [];
  let clusterIdx = 1;

  for (const [, memberIds] of groupMap.entries()) {
    if (memberIds.length < 2) continue; // Singletons are not clusters

    const memberVendors = vendors.filter((v) => memberIds.includes(v.id));
    const memberNames = memberVendors.map((v) => v.name);

    // Find relationships inside this cluster
    const clusterRels = relationships.filter(
      (r) => memberIds.includes(r.sourceVendorId) && memberIds.includes(r.targetVendorId),
    );

    // Determine highest severity inside cluster
    let severity: Risk = 'LOW';
    if (clusterRels.some((r) => r.severity === 'CRITICAL')) severity = 'CRITICAL';
    else if (clusterRels.some((r) => r.severity === 'HIGH')) severity = 'HIGH';
    else if (clusterRels.some((r) => r.severity === 'MEDIUM')) severity = 'MEDIUM';

    // Primary indicator
    const primaryRel = clusterRels.find((r) => r.severity === severity) || clusterRels[0];
    const indicator = primaryRel ? primaryRel.title : 'Interconnected vendor relationship cluster';

    clusters.push({
      id: `cluster-${clusterIdx++}`,
      label: `Collusion Indicator Cluster ${clusterIdx - 1}: ${memberNames.slice(0, 2).join(' & ')}${memberNames.length > 2 ? ' +' + (memberNames.length - 2) : ''}`,
      vendorIds: memberIds,
      vendorNames: memberNames,
      severity,
      primaryIndicator: indicator,
      evidenceCount: clusterRels.length,
    });
  }

  return clusters;
}
