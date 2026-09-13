/**
 * =====================================================================
 * FRAUDGUARD — Layer 4: Idle-Fund & Geospatial Asset Tracking Engine
 *
 * Deterministic, explainable, rule-based spatial auditing module.
 *
 * DISCLAIMER: This engine flags potential idle funds, stalled milestones,
 * and spatial discrepancies for human auditor review and verification.
 * It does NOT establish criminal diversion, theft, or proven corruption.
 *
 * Terminology strictly adheres to audit standards:
 * - "Potential idle-fund indicator"
 * - "Possible stalled execution"
 * - "Geospatial verification required"
 * - "Requires field inspection"
 * =====================================================================
 */

import type { Risk } from '@/lib/data';
export { DEMO_GEOSPATIAL_ANALYSIS_DATE, getEnrichedGeospatialAssets } from './geospatialDemoData';
import { DEMO_GEOSPATIAL_ANALYSIS_DATE } from './geospatialDemoData';
import type {
  GeospatialAssetProfile,
  GeospatialAssetRecord,
  GeospatialFinding,
  GeospatialScoreBreakdownItem,
  GeospatialVerificationResult,
} from './geospatialTypes';

export const GEOSPATIAL_RULE_WEIGHTS = {
  severe_cost_progress_divergence: { points: 30, severity: 'CRITICAL' as Risk },
  duplicate_close_coordinates: { points: 30, severity: 'CRITICAL' as Risk },
  spending_without_progress: { points: 25, severity: 'HIGH' as Risk },
  completed_without_verification: { points: 25, severity: 'HIGH' as Risk },
  stalled_progress_idle_funds: { points: 20, severity: 'HIGH' as Risk },
  spatial_gps_drift: { points: 20, severity: 'HIGH' as Risk },
  missing_or_invalid_coords: { points: 20, severity: 'MEDIUM' as Risk },
  field_visit_urgency: { points: 15, severity: 'MEDIUM' as Risk },
} as const;

export function classifyGeospatialRisk(score: number): Risk {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculates great-circle distance between two coordinates [longitude, latitude] in meters
 * using the Haversine formula.
 */
export function calculateDistanceMeters(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Broad coordinate validity check for the sovereign territory of India.
 * Note: Passing this basic check does NOT prove that the asset is at the verified physical spot.
 */
export function isWithinBroadIndiaBounds(coords: [number, number] | undefined): boolean {
  if (!coords || (coords[0] === 0 && coords[1] === 0)) return false;
  const [lon, lat] = coords;
  return lon >= 68.0 && lon <= 98.0 && lat >= 8.0 && lat <= 38.0;
}

/**
 * Executes Layer 4: Rule-Based Idle-Fund & Geospatial Asset Verification across all assets.
 */
export function runGeospatialVerification(assets: GeospatialAssetRecord[]): GeospatialVerificationResult {
  const profiles: Record<string, GeospatialAssetProfile> = {};
  const allFindings: GeospatialFinding[] = [];

  let idleCount = 0;
  let stalledCount = 0;
  let unverifiedCompletedCount = 0;
  let needsFieldVisitCount = 0;
  let duplicateCoordsCount = 0;
  let totalIdleLakhs = 0;

  // Track findings and score breakdowns per project ID
  const findingsMap = new Map<string, GeospatialFinding[]>();
  const scoresMap = new Map<string, GeospatialScoreBreakdownItem[]>();

  function addFinding(projectId: string, finding: GeospatialFinding) {
    const list = findingsMap.get(projectId) || [];
    list.push(finding);
    findingsMap.set(projectId, list);
    allFindings.push(finding);
  }

  function addScore(projectId: string, item: GeospatialScoreBreakdownItem) {
    const list = scoresMap.get(projectId) || [];
    list.push(item);
    scoresMap.set(projectId, list);
  }

  // =========================================================================
  // CROSS-PROJECT RULES: Co-located / Duplicate Coordinates Check (< 100 meters)
  // =========================================================================
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const a = assets[i];
      const b = assets[j];

      if (
        isWithinBroadIndiaBounds(a.demoCoordinates) &&
        isWithinBroadIndiaBounds(b.demoCoordinates)
      ) {
        const dist = calculateDistanceMeters(a.demoCoordinates, b.demoCoordinates);

        // If distance is less than 100 meters, check shared-site justification
        if (dist < 100) {
          const hasJustification = !!(a.demoSharedSiteJustification || b.demoSharedSiteJustification);

          if (!hasJustification) {
            duplicateCoordsCount += 1;
            const distRounded = Math.round(dist);
            const title = 'Geospatial verification required: Co-located coordinates without site justification';
            const detail = `Projects "${a.projectName}" and "${b.projectName}" report co-located coordinates (${distRounded}m apart) without documented shared compound justification.`;
            const evidence = [
              `Coordinate distance: ${distRounded} meters`,
              `Project A: ${a.projectId} (${a.projectName}) at [${a.demoCoordinates.join(', ')}]`,
              `Project B: ${b.projectId} (${b.projectName}) at [${b.demoCoordinates.join(', ')}]`,
              'No documented shared-site justification recorded in sanction approval',
            ];
            const action = 'Verify whether physical assets are distinct structures or duplicate claims on a single asset';

            [a, b].forEach((asset, idx) => {
              const other = idx === 0 ? b : a;
              addFinding(asset.projectId, {
                id: `find-co-loc-${asset.projectId}-${other.projectId}`,
                ruleName: 'duplicate_close_coordinates',
                projectId: asset.projectId,
                projectName: asset.projectName,
                severity: GEOSPATIAL_RULE_WEIGHTS.duplicate_close_coordinates.severity,
                confidence: 90,
                points: GEOSPATIAL_RULE_WEIGHTS.duplicate_close_coordinates.points,
                title,
                detail,
                evidence,
                recommendedAction: action,
                relatedProjectIds: [other.projectId],
              });

              addScore(asset.projectId, {
                ruleName: 'duplicate_close_coordinates',
                points: GEOSPATIAL_RULE_WEIGHTS.duplicate_close_coordinates.points,
                reason: `Co-located within ${distRounded}m of ${other.projectId} without site justification`,
              });
            });
          }
        }
      }
    }
  }

  // =========================================================================
  // SINGLE-ASSET TELEMETRY RULES
  // =========================================================================
  for (const asset of assets) {
    let triggeredDivergence = false;

    // Rule 1: Severe Cost vs Physical Progress Divergence (>= 80% spent and < 40% progress)
    if (asset.spendRatioPercent >= 80 && asset.demoPhysicalProgressPercent < 40) {
      triggeredDivergence = true;
      const title = 'Potential idle-fund indicator: Severe cost vs progress divergence';
      const detail = `Financial expenditure is ${asset.spendRatioPercent}% (₹${asset.spentLakhs}L / ₹${asset.allocatedLakhs}L) while reported physical on-site completion is only ${asset.demoPhysicalProgressPercent}%.`;
      const evidence = [
        `Expenditure drawn: ₹${asset.spentLakhs}L of ₹${asset.allocatedLakhs}L (${asset.spendRatioPercent}%)`,
        `Physical progress logged: ${asset.demoPhysicalProgressPercent}%`,
        `Disbursement-to-progress divergence gap: +${asset.spendRatioPercent - asset.demoPhysicalProgressPercent}%`,
      ];
      const action = 'Initiate emergency physical inspection and halt subsequent payment releases';

      addFinding(asset.projectId, {
        id: `find-div-${asset.projectId}`,
        ruleName: 'severe_cost_progress_divergence',
        projectId: asset.projectId,
        projectName: asset.projectName,
        severity: GEOSPATIAL_RULE_WEIGHTS.severe_cost_progress_divergence.severity,
        confidence: 94,
        points: GEOSPATIAL_RULE_WEIGHTS.severe_cost_progress_divergence.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
      });

      addScore(asset.projectId, {
        ruleName: 'severe_cost_progress_divergence',
        points: GEOSPATIAL_RULE_WEIGHTS.severe_cost_progress_divergence.points,
        reason: `Spent ${asset.spendRatioPercent}% with only ${asset.demoPhysicalProgressPercent}% physical completion`,
      });
    }

    // Rule 2: Spending Without Sufficient Progress (>= 50% spent and <= 20% progress)
    if (!triggeredDivergence && asset.spendRatioPercent >= 50 && asset.demoPhysicalProgressPercent <= 20) {
      const title = 'Possible stalled execution: Significant disbursement leading physical progress';
      const detail = `Expenditure has reached ${asset.spendRatioPercent}% while physical completion stands at ${asset.demoPhysicalProgressPercent}%.`;
      const evidence = [
        `Financial spend ratio: ${asset.spendRatioPercent}%`,
        `Reported physical progress: ${asset.demoPhysicalProgressPercent}%`,
      ];
      const action = 'Request updated engineering measurement book (MB) and physical milestone certificates';

      addFinding(asset.projectId, {
        id: `find-spend-prog-${asset.projectId}`,
        ruleName: 'spending_without_progress',
        projectId: asset.projectId,
        projectName: asset.projectName,
        severity: GEOSPATIAL_RULE_WEIGHTS.spending_without_progress.severity,
        confidence: 88,
        points: GEOSPATIAL_RULE_WEIGHTS.spending_without_progress.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
      });

      addScore(asset.projectId, {
        ruleName: 'spending_without_progress',
        points: GEOSPATIAL_RULE_WEIGHTS.spending_without_progress.points,
        reason: `Expenditure ${asset.spendRatioPercent}% significantly leads physical progress (${asset.demoPhysicalProgressPercent}%)`,
      });
    }

    // Rule 3: Stalled Progress / Idle Funds (>= 180 days inactive with unexpended balance, or idle >= 12 months)
    const isDormantTime = asset.demoDaysSinceUpdate >= 180 && asset.allocatedLakhs > asset.spentLakhs;
    const isIdleMonths = (asset.demoIdleMonths || 0) >= 12;

    if (isDormantTime || isIdleMonths || asset.demoAssetStatus === 'Idle') {
      idleCount += 1;
      stalledCount += 1;
      const unspent =
        asset.allocatedLakhs > asset.spentLakhs
          ? asset.allocatedLakhs - asset.spentLakhs
          : Math.round(asset.spentLakhs * (1 - asset.demoPhysicalProgressPercent / 100));
      totalIdleLakhs += unspent;

      const idlePeriodText = asset.demoIdleMonths
        ? `${asset.demoIdleMonths} months`
        : `${asset.demoDaysSinceUpdate} days (~${Math.round(asset.demoDaysSinceUpdate / 30)} months)`;

      const title = 'Potential idle-fund indicator: Dormant project balance with stalled activity';
      const detail = `Project has logged no physical update for ${idlePeriodText} as of ${DEMO_GEOSPATIAL_ANALYSIS_DATE}. Unutilized sanctioned balance: ₹${unspent}L.`;
      const evidence = [
        `Dormancy duration: ${idlePeriodText} (Analysis reference: ${DEMO_GEOSPATIAL_ANALYSIS_DATE})`,
        `Unexpended balance remaining: ₹${unspent}L`,
        `Last progress update date: ${asset.demoLastUpdateDate}`,
      ];
      const action = 'Review fund surrender procedures or issue contractor mobilization cure notice';

      addFinding(asset.projectId, {
        id: `find-idle-${asset.projectId}`,
        ruleName: 'stalled_progress_idle_funds',
        projectId: asset.projectId,
        projectName: asset.projectName,
        severity: GEOSPATIAL_RULE_WEIGHTS.stalled_progress_idle_funds.severity,
        confidence: 91,
        points: GEOSPATIAL_RULE_WEIGHTS.stalled_progress_idle_funds.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
      });

      addScore(asset.projectId, {
        ruleName: 'stalled_progress_idle_funds',
        points: GEOSPATIAL_RULE_WEIGHTS.stalled_progress_idle_funds.points,
        reason: `Dormant for ${idlePeriodText} with ₹${unspent}L idle balance`,
      });
    }

    // Rule 4: Completed Asset Missing Ground-Truth Verification Evidence
    const photoPassRate =
      asset.demoPhotoEvidenceCount > 0
        ? Math.round((asset.demoPhotoPassCount / asset.demoPhotoEvidenceCount) * 100)
        : 0;

    const isMarkedCompleted = asset.demoAssetStatus === 'Completed' || asset.spendRatioPercent >= 100;
    if (isMarkedCompleted && (photoPassRate < 50 || asset.demoPhotoEvidenceCount === 0)) {
      unverifiedCompletedCount += 1;
      const title = 'Geospatial verification required: Completed status lacking ground-truth evidence';
      const detail = `Asset is reported as completed or fully disbursed, but ground-truth photo validation rate is ${photoPassRate}% (${asset.demoPhotoPassCount}/${asset.demoPhotoEvidenceCount} verified).`;
      const evidence = [
        `Asset status: ${asset.demoAssetStatus} (Spend: ${asset.spendRatioPercent}%)`,
        `Geotagged photos validated: ${asset.demoPhotoPassCount} of ${asset.demoPhotoEvidenceCount} (${photoPassRate}%)`,
        'Independent physical inspection sign-off certificate is absent',
      ];
      const action = 'Dispatch vigilance verification team to capture geo-fenced panoramic site photos';

      addFinding(asset.projectId, {
        id: `find-unver-comp-${asset.projectId}`,
        ruleName: 'completed_without_verification',
        projectId: asset.projectId,
        projectName: asset.projectName,
        severity: GEOSPATIAL_RULE_WEIGHTS.completed_without_verification.severity,
        confidence: 92,
        points: GEOSPATIAL_RULE_WEIGHTS.completed_without_verification.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
      });

      addScore(asset.projectId, {
        ruleName: 'completed_without_verification',
        points: GEOSPATIAL_RULE_WEIGHTS.completed_without_verification.points,
        reason: `Reported complete but photo validation is only ${photoPassRate}%`,
      });
    }

    // Rule 5: Significant GPS Drift from Sanctioned Landmark (> 1,000 meters)
    if (asset.demoGpsDriftMeters && asset.demoGpsDriftMeters > 1000) {
      const driftKm = (asset.demoGpsDriftMeters / 1000).toFixed(1);
      const title = 'Requires field inspection: Significant spatial drift from sanctioned landmark';
      const detail = `Geotagged site imagery exhibits a spatial drift of ${asset.demoGpsDriftMeters} meters (${driftKm} km) from sanctioned landmark coordinates.`;
      const evidence = [
        `Measured spatial drift: ${asset.demoGpsDriftMeters} meters`,
        `Acceptable tolerance threshold: 250 meters`,
        `Reported landmarks: ${(asset.demoLandmarks || []).join('; ') || 'None recorded'}`,
      ];
      const action = 'Survey actual physical construction location against sanctioned revenue boundary map';

      addFinding(asset.projectId, {
        id: `find-drift-${asset.projectId}`,
        ruleName: 'spatial_gps_drift',
        projectId: asset.projectId,
        projectName: asset.projectName,
        severity: GEOSPATIAL_RULE_WEIGHTS.spatial_gps_drift.severity,
        confidence: 89,
        points: GEOSPATIAL_RULE_WEIGHTS.spatial_gps_drift.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
      });

      addScore(asset.projectId, {
        ruleName: 'spatial_gps_drift',
        points: GEOSPATIAL_RULE_WEIGHTS.spatial_gps_drift.points,
        reason: `Spatial drift of ${asset.demoGpsDriftMeters}m from landmark`,
      });
    }

    // Rule 6: Missing or Out-of-Bounds Coordinates
    if (!isWithinBroadIndiaBounds(asset.demoCoordinates)) {
      const title = 'Geospatial verification required: Out-of-bounds or invalid coordinates';
      const detail = `Reported coordinates [${asset.demoCoordinates.join(', ')}] fall outside the broad territory bounds of India or are null.`;
      const evidence = [
        `Reported coordinates: [${asset.demoCoordinates.join(', ')}]`,
        'Valid longitude range: 68.0°E to 98.0°E; Valid latitude range: 8.0°N to 38.0°N',
      ];
      const action = 'Collect authoritative GPS coordinates from district project management unit';

      addFinding(asset.projectId, {
        id: `find-oob-${asset.projectId}`,
        ruleName: 'missing_or_invalid_coords',
        projectId: asset.projectId,
        projectName: asset.projectName,
        severity: GEOSPATIAL_RULE_WEIGHTS.missing_or_invalid_coords.severity,
        confidence: 96,
        points: GEOSPATIAL_RULE_WEIGHTS.missing_or_invalid_coords.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
      });

      addScore(asset.projectId, {
        ruleName: 'missing_or_invalid_coords',
        points: GEOSPATIAL_RULE_WEIGHTS.missing_or_invalid_coords.points,
        reason: 'Coordinates outside valid territorial bounds',
      });
    }

    // Rule 7: Priority Field Visit Urgency
    if (asset.demoAssetStatus === 'Needs Field Visit' || asset.verifyStatus === 'Field Visit') {
      needsFieldVisitCount += 1;
      const title = 'Requires field inspection: Priority on-site physical visit scheduled';
      const detail = `Asset is flagged as requiring physical site inspection due to conflicting progress telemetry.`;
      const evidence = [
        `Asset status: ${asset.demoAssetStatus}`,
        `Portal verification flag: ${asset.verifyStatus}`,
      ];
      const action = 'Assign vigilance inspection officer and schedule priority physical site audit';

      addFinding(asset.projectId, {
        id: `find-fvisit-${asset.projectId}`,
        ruleName: 'field_visit_urgency',
        projectId: asset.projectId,
        projectName: asset.projectName,
        severity: GEOSPATIAL_RULE_WEIGHTS.field_visit_urgency.severity,
        confidence: 82,
        points: GEOSPATIAL_RULE_WEIGHTS.field_visit_urgency.points,
        title,
        detail,
        evidence,
        recommendedAction: action,
      });

      addScore(asset.projectId, {
        ruleName: 'field_visit_urgency',
        points: GEOSPATIAL_RULE_WEIGHTS.field_visit_urgency.points,
        reason: 'Scheduled on-site verification pending',
      });
    }

    // =======================================================================
    // AGGREGATION & SCORE CLAMPING PER ASSET
    // =======================================================================
    const rawFindings = findingsMap.get(asset.projectId) || [];
    const scoreItems = scoresMap.get(asset.projectId) || [];

    let totalPoints = 0;
    for (const s of scoreItems) {
      totalPoints += s.points;
    }

    // Clamp score strictly between 0 and 100
    const riskScore = Math.min(100, Math.max(0, totalPoints));
    const riskLevel = classifyGeospatialRisk(riskScore);
    const gap = asset.spendRatioPercent - asset.demoPhysicalProgressPercent;

    profiles[asset.projectId] = {
      record: asset,
      riskScore,
      riskLevel,
      findings: rawFindings,
      scoreBreakdown: scoreItems,
      spendVsProgressGap: gap,
      isIdle: isDormantTime || isIdleMonths || asset.demoAssetStatus === 'Idle',
      needsFieldVisit: asset.demoAssetStatus === 'Needs Field Visit' || asset.verifyStatus === 'Field Visit',
    };
  }

  const totalSanctioned = assets.reduce((s, a) => s + a.allocatedLakhs, 0);
  const totalSpent = assets.reduce((s, a) => s + a.spentLakhs, 0);

  return {
    engine: 'rule-based',
    analysisReferenceDate: DEMO_GEOSPATIAL_ANALYSIS_DATE,
    assetsAnalyzed: assets.length,
    totalSanctionedLakhs: totalSanctioned,
    totalSpentLakhs: totalSpent,
    totalIdleLakhs,
    profiles,
    allFindings,
    idleCount,
    stalledCount,
    unverifiedCompletedCount,
    needsFieldVisitCount,
    duplicateCoordsCount,
  };
}
