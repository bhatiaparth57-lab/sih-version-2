import type { Risk, VerifyStatus } from '@/lib/data';

export type AssetStatus =
  | 'Planned'
  | 'Under Construction'
  | 'Completed'
  | 'Verified'
  | 'Idle'
  | 'Needs Field Visit';

export interface GeospatialAssetRecord {
  projectId: string;
  projectName: string;
  state: string;
  district: string;
  constituency: string;
  projectType: string;
  vendorName: string;
  allocatedLakhs: number;
  spentLakhs: number;
  spendRatioPercent: number;
  baselineRisk: Risk;
  baselineRiskScore: number;
  verifyStatus: VerifyStatus;
  year: string;
  // Synthetic demo-only fields (Never real government or location-sensitive data)
  demoCoordinates: [number, number]; // [longitude, latitude]
  demoPhysicalProgressPercent: number; // 0 to 100
  demoAssetStatus: AssetStatus;
  demoLastUpdateDate: string; // ISO date string (YYYY-MM-DD)
  demoDaysSinceUpdate: number;
  demoIdleMonths?: number;
  demoPhotoEvidenceCount: number;
  demoPhotoPassCount: number;
  demoGpsDriftMeters?: number;
  /** Legitimate co-location justification (e.g. Phase 2 expansion on shared compound) */
  demoSharedSiteJustification?: string;
  demoLandmarks?: string[];
  isSynthetic: true;
}

export interface GeospatialFinding {
  id: string;
  ruleName: string;
  projectId: string;
  projectName: string;
  severity: Risk;
  confidence: number; // 0 - 100
  points: number;
  title: string;
  detail: string;
  evidence: string[];
  recommendedAction: string;
  relatedProjectIds?: string[];
}

export interface GeospatialScoreBreakdownItem {
  ruleName: string;
  points: number;
  reason: string;
}

export interface GeospatialAssetProfile {
  record: GeospatialAssetRecord;
  riskScore: number; // 0 - 100 clamped
  riskLevel: Risk;
  findings: GeospatialFinding[];
  scoreBreakdown: GeospatialScoreBreakdownItem[];
  spendVsProgressGap: number; // spendRatioPercent - demoPhysicalProgressPercent
  isIdle: boolean;
  needsFieldVisit: boolean;
}

export interface GeospatialVerificationResult {
  engine: 'rule-based';
  analysisReferenceDate: string;
  assetsAnalyzed: number;
  totalSanctionedLakhs: number;
  totalSpentLakhs: number;
  totalIdleLakhs: number;
  profiles: Record<string, GeospatialAssetProfile>;
  allFindings: GeospatialFinding[];
  idleCount: number;
  stalledCount: number;
  unverifiedCompletedCount: number;
  needsFieldVisitCount: number;
  duplicateCoordsCount: number;
}
