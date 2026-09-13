/**
 * =====================================================================
 * FRAUDGUARD — Layer 4: Idle-Fund and Geospatial Asset Tracking Demo Data
 * ⚠️ SYNTHETIC DEMO ENVIRONMENT ONLY
 *
 * All coordinates, physical progress percentages, asset statuses, photo
 * telemetry counts, and GPS drift measurements in this file are completely
 * synthetic and fabricated for demonstrating rule-based spatial auditing.
 * They do NOT represent real government inspection data or sensitive locations.
 * =====================================================================
 */

import { PROJECTS, COORDS } from '@/lib/data';
import type { GeospatialAssetRecord } from '@/lib/geospatialTypes';

/**
 * Fixed analysis reference date ensuring 100% deterministic, reproducible
 * execution across all environments and times.
 */
export const DEMO_GEOSPATIAL_ANALYSIS_DATE = '2026-09-01';

interface SyntheticTelemetrySpec {
  demoPhysicalProgressPercent: number;
  demoAssetStatus: GeospatialAssetRecord['demoAssetStatus'];
  demoLastUpdateDate: string;
  demoPhotoEvidenceCount: number;
  demoPhotoPassCount: number;
  demoGpsDriftMeters?: number;
  demoIdleMonths?: number;
  demoSharedSiteJustification?: string;
  demoLandmarks?: string[];
}

const TELEMETRY_SPECS: Record<string, SyntheticTelemetrySpec> = {
  // 1. Flagship demo: Severe divergence (spent 127% vs 35% progress) + 2.1 km GPS drift
  'MP-DEL-2026-0142': {
    demoPhysicalProgressPercent: 35,
    demoAssetStatus: 'Under Construction',
    demoLastUpdateDate: '2026-04-10',
    demoPhotoEvidenceCount: 14,
    demoPhotoPassCount: 3,
    demoGpsDriftMeters: 2100,
    demoLandmarks: ['Satellite ground-truth @28.72N,77.18E', 'Geo-tagged photo set: 3/14 passing spatial validation'],
  },

  // 2. Idle funds: Funds released, spent exceeds allocation (52L vs 44L), only 20% progress, 14 months dormant
  'MP-TG-2026-0642': {
    demoPhysicalProgressPercent: 20,
    demoAssetStatus: 'Idle',
    demoLastUpdateDate: '2025-06-12',
    demoIdleMonths: 14,
    demoPhotoEvidenceCount: 4,
    demoPhotoPassCount: 1,
    demoGpsDriftMeters: 450,
    demoLandmarks: ['Site foundation abandoned', 'No progress logged in 14 months'],
  },

  // 3. Stalled progress: No update for > 230 days with unexpended balance
  'MP-UP-2026-0821': {
    demoPhysicalProgressPercent: 50,
    demoAssetStatus: 'Under Construction',
    demoLastUpdateDate: '2026-01-10',
    demoPhotoEvidenceCount: 5,
    demoPhotoPassCount: 3,
    demoGpsDriftMeters: 320,
    demoLandmarks: ['Sub-grade completed', 'Contractor demobilized'],
  },

  // 4. GPS drift & cost deviation: 1.4 km drift + 40% progress with 131% spend
  'MP-MH-2026-0331': {
    demoPhysicalProgressPercent: 40,
    demoAssetStatus: 'Needs Field Visit',
    demoLastUpdateDate: '2026-03-20',
    demoPhotoEvidenceCount: 6,
    demoPhotoPassCount: 2,
    demoGpsDriftMeters: 1400,
    demoLandmarks: ['Reported landmark discrepancy', 'Geo-tagged centroid offset 1.4 km'],
  },

  // 5. Verification gap / Scheduled field visit
  'MP-RJ-2026-0455': {
    demoPhysicalProgressPercent: 65,
    demoAssetStatus: 'Needs Field Visit',
    demoLastUpdateDate: '2026-07-02',
    demoPhotoEvidenceCount: 3,
    demoPhotoPassCount: 1,
    demoGpsDriftMeters: 550,
    demoLandmarks: ['Sanitary unit roof incomplete', 'Physical audit pending'],
  },

  // 6. High spending with low progress: 135% spend with 15% progress
  'MP-DL-2026-0090': {
    demoPhysicalProgressPercent: 15,
    demoAssetStatus: 'Needs Field Visit',
    demoLastUpdateDate: '2026-02-15',
    demoPhotoEvidenceCount: 2,
    demoPhotoPassCount: 0,
    demoGpsDriftMeters: 800,
    demoLandmarks: ['Interior renovation uncommenced'],
  },

  // 7. Clean, fully verified baseline asset: 100% progress, 100% spent, 0m drift, verified photo set
  'MP-TN-2026-1120': {
    demoPhysicalProgressPercent: 100,
    demoAssetStatus: 'Verified',
    demoLastUpdateDate: '2026-08-10',
    demoPhotoEvidenceCount: 8,
    demoPhotoPassCount: 8,
    demoGpsDriftMeters: 25,
    demoLandmarks: ['HDPE drainage trench line verified', 'Satellite scene consistent with completion'],
  },

  // 8. Normal progress under construction
  'MP-GJ-2026-0712': {
    demoPhysicalProgressPercent: 75,
    demoAssetStatus: 'Under Construction',
    demoLastUpdateDate: '2026-07-20',
    demoPhotoEvidenceCount: 6,
    demoPhotoPassCount: 5,
    demoGpsDriftMeters: 120,
    demoLandmarks: ['Brick masonry 85% complete'],
  },

  // 9. Vendor concentration anomaly
  'MP-WB-2026-0603': {
    demoPhysicalProgressPercent: 45,
    demoAssetStatus: 'Under Construction',
    demoLastUpdateDate: '2026-06-15',
    demoPhotoEvidenceCount: 4,
    demoPhotoPassCount: 2,
    demoGpsDriftMeters: 620,
    demoLandmarks: ['Piping manifold stage'],
  },

  // 10. Verified irrigation work
  'MP-KA-2026-0551': {
    demoPhysicalProgressPercent: 95,
    demoAssetStatus: 'Verified',
    demoLastUpdateDate: '2026-08-01',
    demoPhotoEvidenceCount: 7,
    demoPhotoPassCount: 7,
    demoGpsDriftMeters: 40,
    demoLandmarks: ['Canal lining inspection verified'],
  },

  // 11. Completed without verification evidence + Legitimate Shared-Site Justification
  'MP-BR-2026-0904': {
    demoPhysicalProgressPercent: 95,
    demoAssetStatus: 'Completed',
    demoLastUpdateDate: '2026-05-18',
    demoPhotoEvidenceCount: 0,
    demoPhotoPassCount: 0,
    demoGpsDriftMeters: 0,
    demoSharedSiteJustification: 'Sanctioned Phase 2 extension on shared Panchayat Bhawan compound',
    demoLandmarks: ['Civil finishing stage', 'Ground photos missing from portal'],
  },

  // 12. Clean hand pump cluster
  'MP-MP-2026-0310': {
    demoPhysicalProgressPercent: 100,
    demoAssetStatus: 'Verified',
    demoLastUpdateDate: '2026-08-15',
    demoPhotoEvidenceCount: 6,
    demoPhotoPassCount: 6,
    demoGpsDriftMeters: 30,
    demoLandmarks: ['5 bore points geo-tagged and active'],
  },

  // 13. Field visit pending
  'MP-AS-2026-1027': {
    demoPhysicalProgressPercent: 50,
    demoAssetStatus: 'Needs Field Visit',
    demoLastUpdateDate: '2026-04-20',
    demoPhotoEvidenceCount: 3,
    demoPhotoPassCount: 1,
    demoGpsDriftMeters: 750,
    demoLandmarks: ['Roofing frame erected'],
  },
};

/**
 * Builds normalized GeospatialAssetRecord list by merging baseline projects with
 * synthetic demonstration telemetry.
 */
export function getGeospatialDemoAssets(): GeospatialAssetRecord[] {
  const refTime = new Date(DEMO_GEOSPATIAL_ANALYSIS_DATE).getTime();

  return PROJECTS.map((p) => {
    const coords = COORDS[p.id] || [81.0, 24.0];
    const spec = TELEMETRY_SPECS[p.id] || {
      demoPhysicalProgressPercent: 50,
      demoAssetStatus: 'Under Construction',
      demoLastUpdateDate: '2026-05-01',
      demoPhotoEvidenceCount: 4,
      demoPhotoPassCount: 3,
      demoGpsDriftMeters: 100,
    };

    const updateTime = new Date(spec.demoLastUpdateDate).getTime();
    const daysSince = Math.max(0, Math.floor((refTime - updateTime) / (1000 * 60 * 60 * 24)));
    const spendRatio = p.allocated > 0 ? Math.round((p.spent / p.allocated) * 100) : 0;

    return {
      projectId: p.id,
      projectName: p.name,
      state: p.state,
      district: p.district,
      constituency: p.constituency,
      projectType: p.type,
      vendorName: p.vendor,
      allocatedLakhs: p.allocated,
      spentLakhs: p.spent,
      spendRatioPercent: spendRatio,
      baselineRisk: p.risk,
      baselineRiskScore: p.riskScore,
      verifyStatus: p.verify,
      year: p.year,
      demoCoordinates: [coords[0], coords[1]],
      demoPhysicalProgressPercent: spec.demoPhysicalProgressPercent,
      demoAssetStatus: spec.demoAssetStatus,
      demoLastUpdateDate: spec.demoLastUpdateDate,
      demoDaysSinceUpdate: daysSince,
      demoIdleMonths: spec.demoIdleMonths,
      demoPhotoEvidenceCount: spec.demoPhotoEvidenceCount,
      demoPhotoPassCount: spec.demoPhotoPassCount,
      demoGpsDriftMeters: spec.demoGpsDriftMeters,
      demoSharedSiteJustification: spec.demoSharedSiteJustification,
      demoLandmarks: spec.demoLandmarks || p.landmarks,
      isSynthetic: true,
    };
  });
}

export const getEnrichedGeospatialAssets = getGeospatialDemoAssets;

