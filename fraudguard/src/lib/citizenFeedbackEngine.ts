/**
 * =====================================================================
 * FRAUDGUARD — Layer 5: Citizen QR Feedback & Ground-Truth Verification
 * Deterministic Discrepancy Rule Engine
 *
 * ⚠️ NON-ACCUSATORY AUDIT STANDARDS:
 * 1. Findings represent explainable discrepancy signals and field verification
 *    recommendations. They do NOT declare fraud, corruption, or legal guilt.
 * 2. Mathematical scores are strictly clamped to the interval [0, 100].
 * 3. Empty feedback collections gracefully yield 0 score, LOW severity, and zero findings.
 * =====================================================================
 */

import type {
  CitizenFeedbackRecord,
  CitizenDiscrepancyFinding,
  CitizenDiscrepancySeverity,
  ProjectCitizenSummary,
  ObservedProgressStatus,
  CitizenFeedbackIssue,
} from './citizenFeedbackTypes';

export interface ProjectFeedbackContext {
  readonly id: string;
  readonly name?: string;
  readonly allocated?: number;
  readonly spent?: number;
  readonly verify?: string;
  readonly risk?: string;
}

/**
 * Rule 1: Status Variance — Inactivity / Stalled Execution Reported
 * Official project status is active, but a significant portion of visiting citizens report
 * no work or abandoned site.
 */
export const RULE_STATUS_VARIANCE_STALLED = 'RULE_STATUS_VARIANCE_STALLED';

/**
 * Rule 2: Quality & Defect Signal
 * Citizens report physical defects, crumbling concrete, or average quality rating is critically low.
 */
export const RULE_QUALITY_DEFECT_SIGNAL = 'RULE_QUALITY_DEFECT_SIGNAL';

/**
 * Rule 3: Completion Unverified by Ground-Truth
 * Official records show project completion or high spend, but citizens report unfinished site.
 */
export const RULE_COMPLETION_UNVERIFIED = 'RULE_COMPLETION_UNVERIFIED';

/**
 * Rule 4: Transparency & Compliance Signal
 * Mandatory MPLADS project signboard is reported missing or public access is restricted.
 */
export const RULE_TRANSPARENCY_DEFICIT = 'RULE_TRANSPARENCY_DEFICIT';

/**
 * Rule 5: Remote Submission Advisory
 * A high proportion of feedback originated beyond the 1 km perimeter.
 */
export const RULE_REMOTE_ANOMALY_CAUTION = 'RULE_REMOTE_ANOMALY_CAUTION';

/**
 * Classifies numerical score into severity bands.
 * - 0 - 39: LOW
 * - 40 - 69: MEDIUM
 * - 70 - 89: HIGH
 * - 90 - 100: CRITICAL
 */
export function classifyDiscrepancySeverity(score: number): CitizenDiscrepancySeverity {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  if (clamped >= 90) return 'CRITICAL';
  if (clamped >= 70) return 'HIGH';
  if (clamped >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Evaluates citizen feedback for a specific project against official records,
 * returning explainable findings and aggregated discrepancy metrics.
 */
export function analyzeProjectCitizenFeedback(
  project: ProjectFeedbackContext | null | undefined,
  feedbackRecords: readonly CitizenFeedbackRecord[]
): ProjectCitizenSummary {
  const projectId = project?.id || 'UNKNOWN-PROJECT';
  const total = feedbackRecords.length;

  // Initialize distributions
  const statusDistribution: Record<ObservedProgressStatus, number> = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
    abandoned: 0,
  };

  const issueFrequency: Record<CitizenFeedbackIssue, number> = {
    no_work_visible: 0,
    substandard_materials: 0,
    delayed_timeline: 0,
    site_abandoned: 0,
    access_blocked: 0,
    signboard_missing: 0,
  };

  if (total === 0) {
    return {
      projectId,
      totalFeedbackCount: 0,
      onSiteVerifiedCount: 0,
      onSiteVerifiedPercent: 0,
      averageRating: 0,
      statusDistribution,
      issueFrequency,
      discrepancyScore: 0,
      discrepancyLevel: 'LOW',
      findings: [],
      requiresFieldInspection: false,
      records: [],
    };
  }

  let ratingSum = 0;
  let onSiteCount = 0;
  let proximateCount = 0;
  let distantCount = 0;

  for (const record of feedbackRecords) {
    statusDistribution[record.observedStatus] =
      (statusDistribution[record.observedStatus] || 0) + 1;
    ratingSum += record.qualityRating;

    if (record.proximityStatus === 'on_site') {
      onSiteCount++;
    } else if (record.proximityStatus === 'proximate') {
      proximateCount++;
    } else if (record.proximityStatus === 'distant') {
      distantCount++;
    }

    for (const issue of record.issuesReported) {
      issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
    }
  }

  const averageRating = Number((ratingSum / total).toFixed(2));
  const onSiteVerifiedPercent = Math.round((onSiteCount / total) * 100);

  const findings: CitizenDiscrepancyFinding[] = [];
  let rawScore = 0;

  const officialVerify = (project?.verify || '').toLowerCase();
  const allocated = project?.allocated ?? 0;
  const spent = project?.spent ?? 0;
  const spendRatio = allocated > 0 ? (spent / allocated) * 100 : 0;

  // -------------------------------------------------------------
  // RULE 1: Status Variance — Inactivity / Stalled Execution Reported
  // -------------------------------------------------------------
  const inactiveCount =
    statusDistribution.abandoned + statusDistribution.not_started;
  const inactiveRatio = inactiveCount / total;

  if (total >= 2 && inactiveRatio >= 0.5 && officialVerify !== 'failed') {
    const isCritical = inactiveRatio >= 0.7 && onSiteCount >= 2;
    const impact = isCritical ? 40 : 35;
    rawScore += impact;

    findings.push({
      ruleId: RULE_STATUS_VARIANCE_STALLED,
      label: 'Citizen Discrepancy Signal: Work Inactivity Reported',
      severity: isCritical ? 'CRITICAL' : 'HIGH',
      scoreImpact: impact,
      description:
        'Citizen ground-truth observations indicate an inactive or abandoned site, diverging from recorded project execution status.',
      evidence: [
        `${inactiveCount} of ${total} citizens (${Math.round(
          inactiveRatio * 100
        )}%) observed the site as abandoned or not started`,
        `Official verification status: ${project?.verify || 'Pending'}`,
        `${onSiteCount} of ${total} submissions physically verified on-site (< 150m)`,
      ],
      recommendedAction:
        'Field verification recommended by assistant engineer to ascertain ground execution status.',
    });
  }

  // -------------------------------------------------------------
  // RULE 2: Quality & Defect Signal
  // -------------------------------------------------------------
  const defectCount = issueFrequency.substandard_materials || 0;
  if ((total >= 2 && averageRating <= 2.0) || defectCount >= 2) {
    const impact = 25;
    rawScore += impact;

    findings.push({
      ruleId: RULE_QUALITY_DEFECT_SIGNAL,
      label: 'Citizen Quality Signal: Material or Structural Concerns',
      severity: 'HIGH',
      scoreImpact: impact,
      description:
        'Multiple citizen reports flag potential material defects, crumbling concrete, or sub-standard finishing.',
      evidence: [
        `Average citizen satisfaction rating: ${averageRating} / 5.0`,
        `${defectCount} citizen reports specifically flagged substandard materials`,
      ],
      recommendedAction:
        'Sample materials for independent lab testing during next technical inspection.',
    });
  }

  // -------------------------------------------------------------
  // RULE 3: Completion Unverified by Ground-Truth
  // -------------------------------------------------------------
  const isOfficiallyDone =
    officialVerify === 'verified' ||
    officialVerify === 'completed' ||
    spendRatio >= 95;
  const incompleteCount =
    statusDistribution.not_started +
    statusDistribution.in_progress +
    statusDistribution.abandoned;

  if (isOfficiallyDone && total >= 2 && incompleteCount / total >= 0.5) {
    const impact = 30;
    rawScore += impact;

    findings.push({
      ruleId: RULE_COMPLETION_UNVERIFIED,
      label: 'Citizen Ground-Truth Check: Incomplete Works Reported',
      severity: 'CRITICAL',
      scoreImpact: impact,
      description:
        'Official records document project completion or near-complete fund disbursement, but local residents report incomplete facilities.',
      evidence: [
        `Financial disbursement ratio: ${Math.round(spendRatio)}% (Allocated: ${allocated}L, Spent: ${spent}L)`,
        `Official status: ${project?.verify || 'Verified'}`,
        `${incompleteCount} of ${total} respondents observed project as incomplete or inaccessible`,
      ],
      recommendedAction:
        'Field verification recommended prior to final contractor retention release.',
    });
  }

  // -------------------------------------------------------------
  // RULE 4: Transparency & Compliance Signal
  // -------------------------------------------------------------
  const signboardCount = issueFrequency.signboard_missing || 0;
  const accessCount = issueFrequency.access_blocked || 0;
  if (signboardCount + accessCount >= 2) {
    const impact = 15;
    rawScore += impact;

    findings.push({
      ruleId: RULE_TRANSPARENCY_DEFICIT,
      label: 'Transparency & Compliance Signal: Site Notice Deficiency',
      severity: 'MEDIUM',
      scoreImpact: impact,
      description:
        'Citizen feedback reports missing mandatory public MPLADS notice board or restricted public access.',
      evidence: [
        `${signboardCount} report(s) of missing mandatory project signboard`,
        `${accessCount} report(s) of blocked or restricted public access`,
      ],
      recommendedAction:
        'Issue compliance notice for mandatory public project signboard and clear public access.',
    });
  }

  // -------------------------------------------------------------
  // RULE 5: Remote Submission Advisory
  // -------------------------------------------------------------
  if (total >= 3 && distantCount / total >= 0.6) {
    const impact = 10;
    rawScore += impact;

    findings.push({
      ruleId: RULE_REMOTE_ANOMALY_CAUTION,
      label: 'Citizen Advisory Note: Predominantly Remote Feedback',
      severity: 'LOW',
      scoreImpact: impact,
      description:
        'A majority of feedback was submitted from beyond the 1 km perimeter. On-site citizen corroboration is prioritized.',
      evidence: [
        `${distantCount} of ${total} submissions originated beyond the 1,000m site perimeter`,
        `On-site verification rate is currently ${onSiteVerifiedPercent}%`,
      ],
      recommendedAction:
        'Encourage local neighborhood residents to scan the on-site QR poster for direct ground truth.',
    });
  }

  // Final score clamping strictly [0, 100]
  const discrepancyScore = Math.min(100, Math.max(0, rawScore));
  const discrepancyLevel = classifyDiscrepancySeverity(discrepancyScore);
  const requiresFieldInspection =
    discrepancyScore >= 40 ||
    findings.some((f) => f.severity === 'HIGH' || f.severity === 'CRITICAL');

  const lastSubmittedAt =
    feedbackRecords.length > 0 ? feedbackRecords[0].submittedAt : undefined;

  return {
    projectId,
    totalFeedbackCount: total,
    onSiteVerifiedCount: onSiteCount,
    onSiteVerifiedPercent,
    averageRating,
    statusDistribution,
    issueFrequency,
    discrepancyScore,
    discrepancyLevel,
    findings,
    requiresFieldInspection,
    lastSubmittedAt,
    records: feedbackRecords,
  };
}
