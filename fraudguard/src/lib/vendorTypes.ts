import type { Risk, Project } from '@/lib/data';

export type RelationshipType =
  | 'shared_pan'
  | 'shared_bank_account'
  | 'shared_directors'
  | 'shared_address'
  | 'shared_contact'
  | 'declared_affiliation'
  | 'coordinated_billing'
  | 'shared_invoice_number';

export interface VendorRecord {
  id: string;
  name: string;
  pan?: string;
  gstin?: string;
  projectsCount: number;
  totalValueCrore: number;
  risk: Risk;
  riskScore: number;
  concentration: number;
  alerts: number;
  districtsCount: number;
  highRisk: number;
  established?: string;
  relation?: string;
  /** Explicit synthetic demo-only fields to avoid using or simulating real PII / identity data */
  demoPanToken?: string;
  demoPhysicalAddress?: string;
  demoDirectorNames?: string[];
  demoContactDomain?: string;
  demoBankTokenHash?: string;
}

export interface VendorRelationship {
  id: string;
  sourceVendorId: string;
  targetVendorId: string;
  sourceVendorName: string;
  targetVendorName: string;
  relationshipType: RelationshipType;
  severity: Risk;
  confidence: number; // 0 - 100
  title: string;
  description: string;
  evidence: string[];
  sharedValues: string[];
}

export interface VendorFinding {
  id: string;
  ruleName: string;
  vendorId: string;
  vendorName: string;
  severity: Risk;
  confidence: number;
  points: number;
  title: string;
  detail: string;
  evidence: string[];
  recommendedAction: string;
  relatedVendorIds?: string[];
  relatedVendorNames?: string[];
  relatedProjectIds?: string[];
}

export interface ScoreBreakdownItem {
  ruleName: string;
  points: number;
  reason: string;
}

export interface VendorIntelligenceProfile {
  vendor: VendorRecord;
  riskScore: number; // 0 - 100 capped
  riskLevel: Risk;
  findings: VendorFinding[];
  scoreBreakdown: ScoreBreakdownItem[];
  relationships: VendorRelationship[];
  relatedProjects: Project[];
  invoicesCount: number;
  totalInvoicedInr: number;
}

export interface CollusionCluster {
  id: string;
  label: string;
  vendorIds: string[];
  vendorNames: string[];
  severity: Risk;
  primaryIndicator: string;
  evidenceCount: number;
}

export interface VendorIntelligenceSummary {
  vendorsAnalyzed: number;
  flaggedTiesCount: number;         // Pairwise relationship ties between distinct vendors
  identifiedClustersCount: number;  // Connected collusion rings
  highCriticalRiskCount: number;    // Vendors categorized with HIGH or CRITICAL risk
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  flaggedVendorsCount: number;      // Vendors with at least one finding/indicator
  totalIndicatorsCount: number;     // Total findings across all vendors
}

export interface VendorIntelligenceResult {
  engine: 'rule-based';
  analyzedAt: string;
  vendorsAnalyzed: number;
  profiles: Record<string, VendorIntelligenceProfile>;
  allRelationships: VendorRelationship[];
  allFindings: VendorFinding[];
  clusters: CollusionCluster[];
  summary: VendorIntelligenceSummary;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'vendor' | 'project';
  risk: Risk;
  riskScore?: number;
  x: number;
  y: number;
  meta?: {
    pan?: string;
    value?: string;
    vendorName?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'contract' | 'suspicious_link';
  relationshipType?: RelationshipType;
  severity?: Risk;
  label?: string;
  isSuspicious: boolean;
}
