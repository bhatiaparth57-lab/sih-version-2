/**
 * =====================================================================
 * FRAUDGUARD — Layer 1: Image, GPS & Multi-Source Anomaly Detection Engine
 *
 * Deterministic, explainable, rule-based photographic evidence validator.
 *
 * ⚠️ NON-ACCUSATORY AUDIT STANDARDS:
 * 1. Outputs indicate explainable anomalies, spatial mismatches, or potential
 *    duplicates requiring review. They do NOT declare crime, forgery, or guilt.
 * 2. Perceptual hashing similarity (dHash) indicates potential visual similarity
 *    needing auditor inspection; it does not claim definitive proof of re-use.
 * 3. Multi-source completion conflicts ONLY evaluate records with an explicit,
 *    declared milestone claim. Completion is NEVER inferred from images alone.
 * 4. All scores are strictly clamped to the interval [0, 100].
 * =====================================================================
 */

import type { Risk } from '@/lib/data';
import { COORDS, projectById } from '@/lib/data';
import { clamp } from '@/lib/utils';
import { calculateDistanceMeters, isWithinBroadIndiaBounds } from '@/lib/geospatialEngine';
import { DEMO_GEOSPATIAL_ANALYSIS_DATE } from '@/lib/geospatialDemoData';
import type {
  ImageEvidenceRecord,
  ImageAnomalyFinding,
  ImageAnomalyRuleId,
  ImageScoreBreakdownItem,
  ProjectImageProfile,
  DuplicateGroup,
  ImageVerificationResult,
} from './imageAnomalyTypes';

export const LAYER_1_ANALYSIS_REFERENCE_DATE = DEMO_GEOSPATIAL_ANALYSIS_DATE; // '2026-09-01'

/**
 * Distance thresholds in meters from sanctioned project coordinates.
 * Reference: Sanctioned landmark coordinates registered in project database.
 */
export const GPS_TOLERANCE_METERS = {
  MAX_ACCEPTABLE_OFFSET: 500,  // Offsets <= 500m are accepted as on-site / proximate
  CRITICAL_MISMATCH: 2000,      // Offsets > 2,000m indicate severe spatial divergence
};

/**
 * Rule weight and severity specification.
 */
export const IMAGE_RULE_WEIGHTS: Record<ImageAnomalyRuleId, { points: number; severity: Risk }> = {
  missing_exif_metadata: { points: 15, severity: 'MEDIUM' },
  invalid_coordinate_bounds: { points: 25, severity: 'HIGH' },
  gps_distance_mismatch: { points: 20, severity: 'HIGH' }, // 30 if > 2,000m
  timestamp_timeline_mismatch: { points: 20, severity: 'MEDIUM' },
  exact_hash_duplicate: { points: 30, severity: 'CRITICAL' },
  perceptual_hash_similarity: { points: 25, severity: 'HIGH' },
  cross_project_evidence_reuse: { points: 35, severity: 'CRITICAL' },
  multisource_geospatial_conflict: { points: 25, severity: 'HIGH' },
};

/**
 * Calculates the exact permissible photo capture window for a project.
 *
 * @param projectYear Fiscal year string from project record, e.g. '2025-26'
 * @param referenceDate Analysis reference date (defaults to '2026-09-01')
 * @returns Object containing exact ISO timestamp boundaries:
 *   - sanctionStart: e.g. '2025-04-01T00:00:00.000Z' (Start of Sanction FY)
 *   - earliestPermissibleCapture: exactly 180 calendar days prior to sanctionStart
 *     (allows pre-construction baseline survey documentation)
 *   - latestPermissibleCapture: end of the analysis reference date, e.g. '2026-09-01T23:59:59.999Z'
 */
export function calculateProjectTimelineWindow(
  projectYear = '2025-26',
  referenceDate = LAYER_1_ANALYSIS_REFERENCE_DATE
) {
  const sanctionStartYear = parseInt(projectYear.split('-')[0] || '2025', 10);
  const sanctionStart = new Date(Date.UTC(sanctionStartYear, 3, 1, 0, 0, 0, 0)); // April 1st UTC

  // Exactly 180 calendar days prior to April 1st of the sanction year (180 * 24 * 60 * 60 * 1000 ms)
  const earliestPermissibleCapture = new Date(sanctionStart.getTime() - 180 * 24 * 60 * 60 * 1000);

  // Analysis date at end of day (23:59:59.999 UTC)
  const ref = new Date(referenceDate);
  const latestPermissibleCapture = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), 23, 59, 59, 999)
  );

  return {
    sanctionStart: sanctionStart.toISOString(),
    earliestPermissibleCapture: earliestPermissibleCapture.toISOString(),
    latestPermissibleCapture: latestPermissibleCapture.toISOString(),
  };
}

// =====================================================================
// PURE TYPESCRIPT PERCEPTUAL HASH & BITWISE UTILITIES
// =====================================================================

/**
 * Computes the Hamming distance between two hexadecimal hash strings.
 * Counts the number of bit positions in which the corresponding bits differ.
 *
 * @param hexA 16-character hex string (64 bits)
 * @param hexB 16-character hex string (64 bits)
 * @returns Number of differing bits (0 to 64)
 */
export function computeHammingDistance(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) {
    throw new Error(`Hash length mismatch: ${hexA.length} vs ${hexB.length}`);
  }

  let distance = 0;
  for (let i = 0; i < hexA.length; i++) {
    const valA = parseInt(hexA[i], 16);
    const valB = parseInt(hexB[i], 16);
    if (isNaN(valA) || isNaN(valB)) {
      throw new Error(`Invalid hexadecimal character at position ${i}: '${hexA[i]}' vs '${hexB[i]}'`);
    }

    let xor = valA ^ valB;
    // Brian Kernighan's algorithm to count set bits
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }

  return distance;
}

/**
 * Computes a 64-bit Difference Hash (dHash) from an 8x9 matrix of luminance values (8 rows, each with 9 columns).
 * Evaluates row gradients: bit = (matrix[y][x] > matrix[y][x+1]) ? 1 : 0.
 *
 * ⚠️ IMPLEMENTATION BOUNDARY:
 * This function accepts a pre-computed 8x9 luminance matrix. It does NOT automatically
 * decode uploaded binary JPEG/PNG files (which in a browser environment requires an HTML5
 * Canvas/ImageData context or offscreen WebWorker, or on Node.js an image decoding library).
 *
 * @param matrix 8 rows, each with 9 luminance numbers (0 - 255)
 * @returns 16-character lowercase hexadecimal string
 */
export function computeDHashFromLuminanceMatrix(matrix: number[][]): string {
  if (matrix.length < 8) {
    throw new Error(`dHash requires at least 8 rows, received ${matrix.length}`);
  }

  let hexResult = '';
  let currentNibble = 0;
  let bitCountInNibble = 0;

  for (let y = 0; y < 8; y++) {
    const row = matrix[y];
    if (!row || row.length < 9) {
      throw new Error(`dHash row ${y} requires at least 9 columns, received ${row?.length ?? 0}`);
    }

    for (let x = 0; x < 8; x++) {
      const bit = row[x] > row[x + 1] ? 1 : 0;
      currentNibble = (currentNibble << 1) | bit;
      bitCountInNibble++;

      if (bitCountInNibble === 4) {
        hexResult += currentNibble.toString(16);
        currentNibble = 0;
        bitCountInNibble = 0;
      }
    }
  }

  return hexResult;
}

// =====================================================================
// DETERMINISTIC IMAGE & MULTI-SOURCE ANOMALY ENGINE
// =====================================================================

export interface GeospatialContextAsset {
  readonly projectId: string;
  readonly demoPhysicalProgressPercent?: number;
  readonly demoAssetStatus?: string;
  readonly demoIdleMonths?: number;
}

export interface ImageAnalysisOptions {
  /** Reference date for timeline validation (defaults to 2026-09-01) */
  referenceDate?: string;
  /** Layer 4 asset context for multi-source cross-checks */
  geospatialContext?: Record<string, GeospatialContextAsset>;
}

/**
 * Runs Layer 1: Image, GPS & Multi-Source Anomaly Detection across evidence records.
 */
export function runImageAnomalyAnalysis(
  images: ImageEvidenceRecord[],
  options: ImageAnalysisOptions = {}
): ImageVerificationResult {
  const refDate = options.referenceDate ?? LAYER_1_ANALYSIS_REFERENCE_DATE;
  const geoContext = options.geospatialContext ?? {};

  // Group images by project
  const imagesByProject = new Map<string, ImageEvidenceRecord[]>();
  for (const img of images) {
    const list = imagesByProject.get(img.projectId) || [];
    list.push(img);
    imagesByProject.set(img.projectId, list);
  }

  const allFindings: ImageAnomalyFinding[] = [];
  const projectFindingsMap = new Map<string, ImageAnomalyFinding[]>();
  const projectScoreMap = new Map<string, ImageScoreBreakdownItem[]>();
  const duplicateGroups: DuplicateGroup[] = [];

  function addFinding(f: ImageAnomalyFinding) {
    allFindings.push(f);
    const list = projectFindingsMap.get(f.projectId) || [];
    list.push(f);
    projectFindingsMap.set(f.projectId, list);

    const scoreList = projectScoreMap.get(f.projectId) || [];
    scoreList.push({
      ruleId: f.ruleId,
      imageId: f.imageId,
      points: f.points,
      reason: f.title,
    });
    projectScoreMap.set(f.projectId, scoreList);
  }

  // =====================================================================
  // 1. INDIVIDUAL IMAGE CHECKS: EXIF, GPS Bounds, Proximity, Timeline
  // =====================================================================
  for (const img of images) {
    const project = projectById(img.projectId);
    const sanctionedCoords = COORDS[img.projectId] ?? (project?.lon && project?.lat ? [project.lon, project.lat] : undefined);

    // Rule 1: Missing EXIF Metadata
    if (!img.exif.hasExif || !img.exif.captureTimestamp) {
      addFinding({
        id: `FND-EXIF-${img.id}`,
        ruleId: 'missing_exif_metadata',
        imageId: img.id,
        projectId: img.projectId,
        severity: IMAGE_RULE_WEIGHTS.missing_exif_metadata.severity,
        points: IMAGE_RULE_WEIGHTS.missing_exif_metadata.points,
        title: 'Image metadata absent or stripped',
        explanation: `Photo '${img.fileName}' lacks embedded EXIF tags (capture timestamp or camera profile missing).`,
        evidenceDetail: `Metadata source: ${img.exif.origin}. EXIF header present: ${img.exif.hasExif ? 'Yes' : 'No'}.`,
        recommendedAction: 'Require re-capture and upload via the authenticated official mobile inspection client.',
      });
    }

    // Rule 2: Invalid Coordinate Bounds
    const coords = img.exif.coordinates;
    const hasValidCoords = coords && isWithinBroadIndiaBounds(coords);
    if (!coords || !hasValidCoords) {
      addFinding({
        id: `FND-BOUNDS-${img.id}`,
        ruleId: 'invalid_coordinate_bounds',
        imageId: img.id,
        projectId: img.projectId,
        severity: IMAGE_RULE_WEIGHTS.invalid_coordinate_bounds.severity,
        points: IMAGE_RULE_WEIGHTS.invalid_coordinate_bounds.points,
        title: 'Invalid or missing GPS coordinate bounds',
        explanation: `Photo '${img.fileName}' contains missing or out-of-bounds coordinates (${coords ? coords.join(', ') : 'None'}).`,
        evidenceDetail: `Extracted coordinates: ${coords ? `[${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]` : 'Missing'}. Broad India bounds check: Failed.`,
        recommendedAction: 'Dispatch field inspection officer to re-geotag site milestone.',
      });
    }

    // Rule 3: GPS Distance Mismatch from Sanctioned Project Site
    if (hasValidCoords && sanctionedCoords) {
      const distanceMeters = Math.round(calculateDistanceMeters(coords, sanctionedCoords));
      if (distanceMeters > GPS_TOLERANCE_METERS.MAX_ACCEPTABLE_OFFSET) {
        const isCritical = distanceMeters > GPS_TOLERANCE_METERS.CRITICAL_MISMATCH;
        const points = isCritical ? 30 : IMAGE_RULE_WEIGHTS.gps_distance_mismatch.points;
        const severity: Risk = isCritical ? 'CRITICAL' : 'HIGH';

        addFinding({
          id: `FND-GPS-${img.id}`,
          ruleId: 'gps_distance_mismatch',
          imageId: img.id,
          projectId: img.projectId,
          severity,
          points,
          title: isCritical
            ? `Severe GPS offset (${(distanceMeters / 1000).toFixed(1)} km from site)`
            : `GPS coordinate mismatch (${distanceMeters}m from site)`,
          explanation: `Photo capture coordinates are ${distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} meters`} away from the sanctioned project landmark.`,
          evidenceDetail: `Photo GPS: [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}], Sanctioned site: [${sanctionedCoords[0].toFixed(4)}, ${sanctionedCoords[1].toFixed(4)}]. Offset: ${distanceMeters}m.`,
          recommendedAction: 'Conduct physical ground-truth inspection to confirm whether work was executed at correct sanctioned location.',
        });
      }
    }

    // Rule 4: Timestamp Timeline Mismatch
    if (img.exif.captureTimestamp) {
      const captureTime = new Date(img.exif.captureTimestamp).getTime();
      const projectYear = project?.year ?? '2025-26';
      const timeline = calculateProjectTimelineWindow(projectYear, refDate);
      const earliestPermissibleTime = new Date(timeline.earliestPermissibleCapture).getTime();
      const latestPermissibleTime = new Date(timeline.latestPermissibleCapture).getTime();

      // Check if photo post-dates the permissible analysis window end
      if (captureTime > latestPermissibleTime) {
        addFinding({
          id: `FND-TIME-FUT-${img.id}`,
          ruleId: 'timestamp_timeline_mismatch',
          imageId: img.id,
          projectId: img.projectId,
          severity: IMAGE_RULE_WEIGHTS.timestamp_timeline_mismatch.severity,
          points: IMAGE_RULE_WEIGHTS.timestamp_timeline_mismatch.points,
          title: 'Capture timestamp post-dates analysis date',
          explanation: `Photo '${img.fileName}' has an EXIF timestamp (${img.exif.captureTimestamp}) later than the permissible window end (${timeline.latestPermissibleCapture}).`,
          evidenceDetail: `EXIF timestamp: ${img.exif.captureTimestamp}. Permissible window: ${timeline.earliestPermissibleCapture} to ${timeline.latestPermissibleCapture}.`,
          recommendedAction: 'Verify device clock calibration with the inspecting authority.',
        });
      }

      // Check if photo predates the earliest permissible baseline survey date
      if (captureTime < earliestPermissibleTime) {
        const captureYear = new Date(img.exif.captureTimestamp).getFullYear();
        addFinding({
          id: `FND-TIME-PRE-${img.id}`,
          ruleId: 'timestamp_timeline_mismatch',
          imageId: img.id,
          projectId: img.projectId,
          severity: IMAGE_RULE_WEIGHTS.timestamp_timeline_mismatch.severity,
          points: IMAGE_RULE_WEIGHTS.timestamp_timeline_mismatch.points,
          title: `Capture timestamp predates project timeline (${captureYear} vs ${projectYear})`,
          explanation: `Photo '${img.fileName}' was taken on ${img.exif.captureTimestamp.substring(0, 10)}, before the earliest permissible baseline date (${timeline.earliestPermissibleCapture.substring(0, 10)}).`,
          evidenceDetail: `EXIF capture date: ${img.exif.captureTimestamp}. Sanction FY: ${projectYear} (Sanction start: ${timeline.sanctionStart.substring(0, 10)}).`,
          recommendedAction: 'Audit historical photo archives to check if pre-existing infrastructure is being re-submitted.',
        });
      }
    }

    // Rule 8: Multi-Source Geospatial Conflict
    // Strictly evaluated ONLY when the submission explicitly contains a declared milestone claim
    if (img.milestoneClaim?.isDeclaredMilestoneClaim) {
      const claim = img.milestoneClaim;
      const geoAsset = geoContext[img.projectId];

      const claimsAdvancedProgress =
        claim.claimedStage === 'Completion' ||
        claim.claimedStage === 'Roofing & Finishing' ||
        claim.claimedCompletionPercent >= 75;

      if (claimsAdvancedProgress && geoAsset) {
        const progress = geoAsset.demoPhysicalProgressPercent ?? 100;
        const status = geoAsset.demoAssetStatus;
        const isIdle = status === 'Idle' || (geoAsset.demoIdleMonths ?? 0) > 6;

        if (progress < 40 || isIdle) {
          addFinding({
            id: `FND-MULTI-${img.id}`,
            ruleId: 'multisource_geospatial_conflict',
            imageId: img.id,
            projectId: img.projectId,
            severity: IMAGE_RULE_WEIGHTS.multisource_geospatial_conflict.severity,
            points: IMAGE_RULE_WEIGHTS.multisource_geospatial_conflict.points,
            title: 'Multi-source conflict: declared completion vs physical telemetry',
            explanation: `Submission explicitly declares milestone '${claim.claimedStage}' (${claim.claimedCompletionPercent}% complete), but Layer 4 geospatial telemetry records site as ${status} with only ${progress}% physical progress.`,
            evidenceDetail: `Declared claim: ${claim.claimedStage} (${claim.claimedCompletionPercent}%). Geospatial verified progress: ${progress}%, Status: ${status}.`,
            recommendedAction: 'Cross-examine contractor milestone claim with satellite imagery ground-truth.',
          });
        }
      }
    }
  }

  // =====================================================================
  // 2. PAIRWISE / PORTFOLIO CHECKS: Exact Hashes, Near-Duplicates, Cross-Project
  // =====================================================================
  const shaMap = new Map<string, ImageEvidenceRecord[]>();
  for (const img of images) {
    const list = shaMap.get(img.sha256) || [];
    list.push(img);
    shaMap.set(img.sha256, list);
  }

  // Exact SHA-256 Duplicates
  for (const [sha, group] of shaMap.entries()) {
    if (group.length > 1) {
      const distinctProjects = Array.from(new Set(group.map((g) => g.projectId)));
      const isCrossProject = distinctProjects.length > 1;

      duplicateGroups.push({
        hash: sha,
        type: 'exact_sha256',
        hammingDistance: 0,
        imageIds: group.map((g) => g.id),
        projectIds: distinctProjects,
        note: isCrossProject
          ? `Exact image file SHA-256 reused across ${distinctProjects.length} distinct projects`
          : `Exact duplicate image SHA-256 uploaded ${group.length} times within same project`,
      });

      for (let i = 0; i < group.length; i++) {
        const current = group[i];
        const others = group.filter((_, idx) => idx !== i);

        if (isCrossProject) {
          // Rule 7: Cross-Project Evidence Reuse (Exact SHA-256 duplicate file)
          addFinding({
            id: `FND-CROSS-${current.id}`,
            ruleId: 'cross_project_evidence_reuse',
            imageId: current.id,
            projectId: current.projectId,
            severity: IMAGE_RULE_WEIGHTS.cross_project_evidence_reuse.severity,
            points: IMAGE_RULE_WEIGHTS.cross_project_evidence_reuse.points,
            title: 'Cross-project exact duplicate evidence requiring review',
            explanation: `Identical cryptographic file SHA-256 is attached to project ${current.projectId} and also appears in ${others.map((o) => o.projectId).join(', ')}. Review is required to determine whether identical documentation was attached to multiple projects.`,
            evidenceDetail: `SHA-256: ${sha}. Matches in: ${others.map((o) => `${o.projectId} (${o.fileName})`).join(', ')}.`,
            recommendedAction: 'Escalate to vigilance division for cross-district verification of work singularity.',
            relatedImageIds: others.map((o) => o.id),
            relatedProjectIds: others.map((o) => o.projectId),
          });
        } else {
          // Rule 5: Exact Hash Duplicate within Same Project
          addFinding({
            id: `FND-EXACT-${current.id}`,
            ruleId: 'exact_hash_duplicate',
            imageId: current.id,
            projectId: current.projectId,
            severity: IMAGE_RULE_WEIGHTS.exact_hash_duplicate.severity,
            points: IMAGE_RULE_WEIGHTS.exact_hash_duplicate.points,
            title: 'Exact duplicate image file submitted',
            explanation: `Identical image file '${current.fileName}' has been submitted multiple times for this project.`,
            evidenceDetail: `SHA-256: ${sha}. Duplicate match: ${others.map((o) => o.id).join(', ')}.`,
            recommendedAction: 'Review milestone billing attachments for duplicate photo submissions.',
            relatedImageIds: others.map((o) => o.id),
          });
        }
      }
    }
  }

  // Perceptual dHash Near-Duplicate Check (Hamming Distance <= 4)
  // Evaluated for image pairs that do NOT already share an exact SHA-256
  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const a = images[i];
      const b = images[j];

      // Skip exact SHA duplicates as they are already handled
      if (a.sha256 === b.sha256) continue;

      const dist = computeHammingDistance(a.perceptualHash, b.perceptualHash);
      if (dist <= 4) {
        const isCrossProject = a.projectId !== b.projectId;

        duplicateGroups.push({
          hash: `${a.perceptualHash}~${b.perceptualHash}`,
          type: 'perceptual_dhash',
          hammingDistance: dist,
          imageIds: [a.id, b.id],
          projectIds: Array.from(new Set([a.projectId, b.projectId])),
          note: isCrossProject
            ? `Potential visual similarity across projects (Hamming distance ${dist})`
            : `Potential near-duplicate photo within project (Hamming distance ${dist})`,
        });

        if (isCrossProject) {
          // Cross-project visual similarity (strictly NOT confirmed evidence reuse)
          addFinding({
            id: `FND-PDHASH-CROSS-${a.id}-${b.id}`,
            ruleId: 'perceptual_hash_similarity',
            imageId: a.id,
            projectId: a.projectId,
            severity: IMAGE_RULE_WEIGHTS.perceptual_hash_similarity.severity,
            points: IMAGE_RULE_WEIGHTS.perceptual_hash_similarity.points,
            title: `Potential cross-project visual similarity requiring review (Distance ${dist}/64)`,
            explanation: `Image '${a.fileName}' shows potential visual similarity requiring review against '${b.fileName}' in project ${b.projectId} (differing bits: ${dist}/64). Note: Perceptual gradient similarity alone does not prove evidence reuse; field inspection is required to determine whether standard engineering designs share visual features.`,
            evidenceDetail: `dHash comparison: ${a.perceptualHash} vs ${b.perceptualHash}. Differing bits: ${dist}/64.`,
            recommendedAction: 'Perform manual visual inspection to compare structural features against standard architectural drawings.',
            relatedImageIds: [b.id],
            relatedProjectIds: [b.projectId],
          });
        } else {
          // Rule 6: Perceptual Hash Similarity within same project
          addFinding({
            id: `FND-PDHASH-${a.id}-${b.id}`,
            ruleId: 'perceptual_hash_similarity',
            imageId: a.id,
            projectId: a.projectId,
            severity: IMAGE_RULE_WEIGHTS.perceptual_hash_similarity.severity,
            points: IMAGE_RULE_WEIGHTS.perceptual_hash_similarity.points,
            title: `Potential near-duplicate image (Hamming distance ${dist}/64)`,
            explanation: `Image '${a.fileName}' has potential visual similarity requiring review against '${b.fileName}' (e.g. minor crop, compression, or lighting difference).`,
            evidenceDetail: `dHash: ${a.perceptualHash} vs ${b.perceptualHash}. Differing bits: ${dist}/64.`,
            recommendedAction: 'Review photo sequence to confirm if distinct construction milestones were independently documented.',
            relatedImageIds: [b.id],
          });
        }
      }
    }
  }

  // =====================================================================
  // 3. PROJECT PROFILES & AGGREGATION
  // =====================================================================
  const projectProfiles: Record<string, ProjectImageProfile> = {};
  let maxAnomalyScore = 0;

  for (const [projectId, projectImages] of imagesByProject.entries()) {
    const findings = projectFindingsMap.get(projectId) || [];
    const scoreBreakdown = projectScoreMap.get(projectId) || [];

    const rawScore = scoreBreakdown.reduce((sum, item) => sum + item.points, 0);
    const anomalyScore = clamp(rawScore, 0, 100);
    maxAnomalyScore = Math.max(maxAnomalyScore, anomalyScore);

    const severity: Risk =
      anomalyScore >= 85 ? 'CRITICAL' : anomalyScore >= 60 ? 'HIGH' : anomalyScore >= 30 ? 'MEDIUM' : 'LOW';

    // Count anomaly images vs verified images
    const anomalyImageIds = new Set(findings.map((f) => f.imageId));
    const anomalyImagesCount = anomalyImageIds.size;
    const verifiedImagesCount = projectImages.length - anomalyImagesCount;

    projectProfiles[projectId] = {
      projectId,
      totalImages: projectImages.length,
      verifiedImagesCount: Math.max(0, verifiedImagesCount),
      anomalyImagesCount,
      anomalyScore,
      severity,
      findings,
      scoreBreakdown,
      images: projectImages,
    };
  }

  return {
    engine: 'rule-based-image-validator',
    analysisReferenceDate: refDate,
    totalImagesAnalyzed: images.length,
    totalFindingsCount: allFindings.length,
    maxAnomalyScore,
    projectProfiles,
    allFindings,
    duplicateGroups,
  };
}
