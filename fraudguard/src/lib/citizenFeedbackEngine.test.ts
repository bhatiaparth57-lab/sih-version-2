import { describe, expect, it, beforeEach } from 'vitest';
import {
  analyzeProjectCitizenFeedback,
  classifyDiscrepancySeverity,
  RULE_STATUS_VARIANCE_STALLED,
  RULE_QUALITY_DEFECT_SIGNAL,
  RULE_COMPLETION_UNVERIFIED,
  RULE_TRANSPARENCY_DEFICIT,
  RULE_REMOTE_ANOMALY_CAUTION,
} from './citizenFeedbackEngine';
import {
  computeDistanceMeters,
  roundToCoarseDistance,
  classifyProximityFromDistance,
  generateCitizenToken,
  sanitizeAndCreateFeedbackRecord,
  saveDemoFeedbackRecord,
  getStoredDemoFeedback,
  getAllCitizenFeedback,
  clearDemoFeedbackStorage,
  DEMO_OTP_NOTICE,
  SYNTHETIC_SEED_FEEDBACK,
} from './citizenFeedbackDemoData';
import type {
  CitizenFeedbackRecord,
  RawCitizenSubmissionInput,
} from './citizenFeedbackTypes';

describe('Layer 5: Citizen QR Feedback & Ground-Truth Verification Engine', () => {
  beforeEach(() => {
    clearDemoFeedbackStorage();
  });

  // -------------------------------------------------------------
  // 1. Privacy Safeguards & Record Sanitization
  // -------------------------------------------------------------
  describe('Privacy Safeguards & Record Creation', () => {
    it('sanitizes submission inputs by generating an opaque token and discarding raw phone numbers', () => {
      const rawInput: RawCitizenSubmissionInput = {
        projectId: 'MP-KA-2026-0551',
        rawPhoneInput: '+91 98765 43210',
        otpInput: '123456',
        observedStatus: 'abandoned',
        qualityRating: 1,
        issuesReported: ['site_abandoned', 'no_work_visible'],
        comment: 'Canal trench dug but no construction equipment active.',
        hasPhotoProof: true,
        citizenCoordinates: { latitude: 15.8497, longitude: 74.4977 },
        projectCoordinates: { latitude: 15.8499, longitude: 74.4979 },
      };

      const record = sanitizeAndCreateFeedbackRecord(rawInput);

      // Token verification
      expect(record.citizenToken).toMatch(/^CTZ-TOK-[0-9A-F]{8}$/);

      // Verification that plain phone number is NOT present anywhere in record
      const serialized = JSON.stringify(record);
      expect(serialized).not.toContain('9876543210');
      expect(serialized).not.toContain('98765');
      expect(serialized).not.toContain('123456'); // OTP also not stored
      expect((record as Record<string, unknown>).rawPhoneInput).toBeUndefined();
      expect((record as Record<string, unknown>).otpInput).toBeUndefined();

      // Verification that precise coordinates are NOT stored in record
      expect((record as Record<string, unknown>).citizenCoordinates).toBeUndefined();
      expect(serialized).not.toContain('15.8497');
      expect(serialized).not.toContain('74.4977');

      // Coarse proximity preserved
      expect(record.proximityStatus).toBe('on_site');
      expect(typeof record.coarseDistanceMeters).toBe('number');
      expect(record.coarseDistanceMeters! % 50).toBe(0); // Rounded to 50m
      expect(record.isSynthetic).toBe(true);
      expect(record.storageSource).toBe('demo_local_storage');
    });

    it('generates deterministic tokens for identical phone inputs without reversible exposure', () => {
      const token1 = generateCitizenToken('9876543210');
      const token2 = generateCitizenToken('+91 98765-43210');
      const tokenDiff = generateCitizenToken('9123456780');

      expect(token1).toBe(token2);
      expect(token1).not.toBe(tokenDiff);
      expect(token1.startsWith('CTZ-TOK-')).toBe(true);
    });

    it('documents simulated OTP verification transparently', () => {
      expect(DEMO_OTP_NOTICE).toContain('DEMO MODE');
      expect(DEMO_OTP_NOTICE).toContain('No actual SMS is dispatched');
    });
  });

  // -------------------------------------------------------------
  // 2. Geofence Distance & Coarse Proximity Calculation
  // -------------------------------------------------------------
  describe('Geofence Distance & Proximity Classification', () => {
    it('computes accurate Haversine distance in meters', () => {
      // Two known coordinates in Delhi separated by ~2.1 km
      const p1 = { lat: 28.7041, lon: 77.1025 };
      const p2 = { lat: 28.723, lon: 77.1025 };
      const dist = computeDistanceMeters(p1.lat, p1.lon, p2.lat, p2.lon);

      expect(dist).toBeGreaterThan(2000);
      expect(dist).toBeLessThan(2200);

      // Identical coordinates yield 0 meters
      expect(computeDistanceMeters(28.7, 77.2, 28.7, 77.2)).toBe(0);
    });

    it('rounds exact distance to coarse 50-meter intervals for privacy preservation', () => {
      expect(roundToCoarseDistance(10)).toBe(0);
      expect(roundToCoarseDistance(38)).toBe(50);
      expect(roundToCoarseDistance(74)).toBe(50);
      expect(roundToCoarseDistance(76)).toBe(100);
      expect(roundToCoarseDistance(134)).toBe(150);
      expect(roundToCoarseDistance(520)).toBe(500);
    });

    it('classifies proximity into standard audit zones', () => {
      expect(classifyProximityFromDistance(0)).toBe('on_site');
      expect(classifyProximityFromDistance(150)).toBe('on_site');
      expect(classifyProximityFromDistance(151)).toBe('proximate');
      expect(classifyProximityFromDistance(500)).toBe('proximate');
      expect(classifyProximityFromDistance(1000)).toBe('proximate');
      expect(classifyProximityFromDistance(1001)).toBe('distant');
      expect(classifyProximityFromDistance(3500)).toBe('distant');
      expect(classifyProximityFromDistance(null)).toBe('unverified');
      expect(classifyProximityFromDistance(undefined)).toBe('unverified');
    });
  });

  // -------------------------------------------------------------
  // 3. Deterministic Discrepancy Rules
  // -------------------------------------------------------------
  describe('Deterministic Discrepancy Rules', () => {
    function makeFeedback(
      id: string,
      overrides: Partial<CitizenFeedbackRecord> = {}
    ): CitizenFeedbackRecord {
      return {
        id,
        projectId: 'TEST-PROJ-001',
        citizenToken: `CTZ-TOK-${id}`,
        submittedAt: '2026-08-20T10:00:00Z',
        proximityStatus: 'on_site',
        coarseDistanceMeters: 50,
        observedStatus: 'in_progress',
        qualityRating: 4,
        issuesReported: [],
        storageSource: 'synthetic_seed',
        isSynthetic: true,
        ...overrides,
      };
    }

    it('triggers RULE_STATUS_VARIANCE_STALLED when citizens report stalled progress or abandoned site', () => {
      const project = { id: 'TEST-PROJ-001', verify: 'Pending', allocated: 50, spent: 30 };
      const feedback: CitizenFeedbackRecord[] = [
        makeFeedback('fb-1', { observedStatus: 'abandoned', proximityStatus: 'on_site' }),
        makeFeedback('fb-2', { observedStatus: 'not_started', proximityStatus: 'on_site' }),
        makeFeedback('fb-3', { observedStatus: 'in_progress', proximityStatus: 'on_site' }),
      ];

      const summary = analyzeProjectCitizenFeedback(project, feedback);
      const finding = summary.findings.find((f) => f.ruleId === RULE_STATUS_VARIANCE_STALLED);

      expect(finding).toBeDefined();
      expect(finding?.label).toContain('Work Inactivity Reported');
      expect(finding?.recommendedAction).toContain('Field verification recommended');
      expect(summary.discrepancyScore).toBeGreaterThanOrEqual(35);
    });

    it('triggers RULE_QUALITY_DEFECT_SIGNAL when citizens report low ratings or substandard materials', () => {
      const project = { id: 'TEST-PROJ-001', verify: 'Pending', allocated: 40, spent: 20 };
      const feedback: CitizenFeedbackRecord[] = [
        makeFeedback('fb-1', {
          qualityRating: 1,
          issuesReported: ['substandard_materials'],
        }),
        makeFeedback('fb-2', {
          qualityRating: 2,
          issuesReported: ['substandard_materials'],
        }),
      ];

      const summary = analyzeProjectCitizenFeedback(project, feedback);
      const finding = summary.findings.find((f) => f.ruleId === RULE_QUALITY_DEFECT_SIGNAL);

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('HIGH');
      expect(finding?.scoreImpact).toBe(25);
      expect(finding?.label).toContain('Material or Structural Concerns');
      expect(summary.requiresFieldInspection).toBe(true);
    });

    it('triggers RULE_COMPLETION_UNVERIFIED when official status is Verified but citizens observe incomplete site', () => {
      const project = { id: 'TEST-PROJ-001', verify: 'Verified', allocated: 50, spent: 50 };
      const feedback: CitizenFeedbackRecord[] = [
        makeFeedback('fb-1', { observedStatus: 'not_started' }),
        makeFeedback('fb-2', { observedStatus: 'in_progress' }),
      ];

      const summary = analyzeProjectCitizenFeedback(project, feedback);
      const finding = summary.findings.find((f) => f.ruleId === RULE_COMPLETION_UNVERIFIED);

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('CRITICAL');
      expect(finding?.scoreImpact).toBe(30);
      expect(finding?.label).toContain('Incomplete Works Reported');
    });

    it('triggers RULE_TRANSPARENCY_DEFICIT when signboards are missing or access is blocked', () => {
      const project = { id: 'TEST-PROJ-001', verify: 'Pending', allocated: 30, spent: 15 };
      const feedback: CitizenFeedbackRecord[] = [
        makeFeedback('fb-1', { issuesReported: ['signboard_missing'] }),
        makeFeedback('fb-2', { issuesReported: ['access_blocked'] }),
      ];

      const summary = analyzeProjectCitizenFeedback(project, feedback);
      const finding = summary.findings.find((f) => f.ruleId === RULE_TRANSPARENCY_DEFICIT);

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('MEDIUM');
      expect(finding?.scoreImpact).toBe(15);
      expect(finding?.label).toContain('Site Notice Deficiency');
    });

    it('triggers RULE_REMOTE_ANOMALY_CAUTION when feedback originates mostly from distant locations', () => {
      const project = { id: 'TEST-PROJ-001', verify: 'Pending', allocated: 25, spent: 10 };
      const feedback: CitizenFeedbackRecord[] = [
        makeFeedback('fb-1', { proximityStatus: 'distant' }),
        makeFeedback('fb-2', { proximityStatus: 'distant' }),
        makeFeedback('fb-3', { proximityStatus: 'on_site' }),
      ];

      const summary = analyzeProjectCitizenFeedback(project, feedback);
      const finding = summary.findings.find((f) => f.ruleId === RULE_REMOTE_ANOMALY_CAUTION);

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('LOW');
      expect(finding?.scoreImpact).toBe(10);
    });
  });

  // -------------------------------------------------------------
  // 4. Empty & Mixed Feedback Sets
  // -------------------------------------------------------------
  describe('Empty and Mixed Feedback Sets', () => {
    it('gracefully handles empty feedback sets with zero score and LOW severity', () => {
      const project = { id: 'MP-EMPTY-2026', verify: 'Pending' };
      const summary = analyzeProjectCitizenFeedback(project, []);

      expect(summary.totalFeedbackCount).toBe(0);
      expect(summary.discrepancyScore).toBe(0);
      expect(summary.discrepancyLevel).toBe('LOW');
      expect(summary.findings.length).toBe(0);
      expect(summary.requiresFieldInspection).toBe(false);
      expect(summary.averageRating).toBe(0);
    });

    it('returns zero score and clean profile for fully verified, positive citizen observations', () => {
      const project = { id: 'MP-TN-2026-1120', verify: 'Verified', allocated: 26, spent: 26 };
      const cleanRecords = SYNTHETIC_SEED_FEEDBACK.filter(
        (f) => f.projectId === 'MP-TN-2026-1120'
      );

      expect(cleanRecords.length).toBeGreaterThan(0);
      const summary = analyzeProjectCitizenFeedback(project, cleanRecords);

      expect(summary.discrepancyScore).toBe(0);
      expect(summary.discrepancyLevel).toBe('LOW');
      expect(summary.findings.length).toBe(0);
      expect(summary.requiresFieldInspection).toBe(false);
      expect(summary.averageRating).toBeGreaterThanOrEqual(4.0);
    });

    it('accurately aggregates mixed feedback with positive and negative observations', () => {
      const project = { id: 'MP-MIXED-2026', verify: 'Pending', allocated: 40, spent: 20 };
      const mixed: CitizenFeedbackRecord[] = [
        {
          id: 'm1',
          projectId: 'MP-MIXED-2026',
          citizenToken: 'CTZ-TOK-M1',
          submittedAt: '2026-08-20T10:00:00Z',
          proximityStatus: 'on_site',
          coarseDistanceMeters: 50,
          observedStatus: 'completed',
          qualityRating: 5,
          issuesReported: [],
          storageSource: 'synthetic_seed',
          isSynthetic: true,
        },
        {
          id: 'm2',
          projectId: 'MP-MIXED-2026',
          citizenToken: 'CTZ-TOK-M2',
          submittedAt: '2026-08-21T11:00:00Z',
          proximityStatus: 'on_site',
          coarseDistanceMeters: 50,
          observedStatus: 'in_progress',
          qualityRating: 3,
          issuesReported: ['delayed_timeline'],
          storageSource: 'synthetic_seed',
          isSynthetic: true,
        },
        {
          id: 'm3',
          projectId: 'MP-MIXED-2026',
          citizenToken: 'CTZ-TOK-M3',
          submittedAt: '2026-08-22T12:00:00Z',
          proximityStatus: 'proximate',
          coarseDistanceMeters: 200,
          observedStatus: 'in_progress',
          qualityRating: 4,
          issuesReported: [],
          storageSource: 'synthetic_seed',
          isSynthetic: true,
        },
      ];

      const summary = analyzeProjectCitizenFeedback(project, mixed);
      expect(summary.totalFeedbackCount).toBe(3);
      expect(summary.onSiteVerifiedCount).toBe(2);
      expect(summary.onSiteVerifiedPercent).toBe(67);
      expect(summary.averageRating).toBe(4.0);
      expect(summary.statusDistribution.completed).toBe(1);
      expect(summary.statusDistribution.in_progress).toBe(2);
    });
  });

  // -------------------------------------------------------------
  // 5. Score and Severity Boundaries
  // -------------------------------------------------------------
  describe('Score and Severity Boundaries', () => {
    it('strictly clamps discrepancy score between 0 and 100 even with extreme cumulative weights', () => {
      const project = { id: 'EXTREME-PROJ', verify: 'Verified', allocated: 50, spent: 50 };
      // Triggers Rule 1 (40), Rule 2 (25), Rule 3 (30), Rule 4 (15) => Raw 110
      const extremeFeedback: CitizenFeedbackRecord[] = [
        {
          id: 'ex-1',
          projectId: 'EXTREME-PROJ',
          citizenToken: 'CTZ-TOK-E1',
          submittedAt: '2026-08-20T10:00:00Z',
          proximityStatus: 'on_site',
          coarseDistanceMeters: 50,
          observedStatus: 'abandoned',
          qualityRating: 1,
          issuesReported: ['substandard_materials', 'signboard_missing'],
          storageSource: 'synthetic_seed',
          isSynthetic: true,
        },
        {
          id: 'ex-2',
          projectId: 'EXTREME-PROJ',
          citizenToken: 'CTZ-TOK-E2',
          submittedAt: '2026-08-21T11:00:00Z',
          proximityStatus: 'on_site',
          coarseDistanceMeters: 50,
          observedStatus: 'abandoned',
          qualityRating: 1,
          issuesReported: ['substandard_materials', 'access_blocked'],
          storageSource: 'synthetic_seed',
          isSynthetic: true,
        },
      ];

      const summary = analyzeProjectCitizenFeedback(project, extremeFeedback);
      expect(summary.discrepancyScore).toBe(100);
      expect(summary.discrepancyLevel).toBe('CRITICAL');
      expect(summary.requiresFieldInspection).toBe(true);
    });

    it('maps scores accurately across severity tiers', () => {
      expect(classifyDiscrepancySeverity(0)).toBe('LOW');
      expect(classifyDiscrepancySeverity(25)).toBe('LOW');
      expect(classifyDiscrepancySeverity(39)).toBe('LOW');
      expect(classifyDiscrepancySeverity(40)).toBe('MEDIUM');
      expect(classifyDiscrepancySeverity(69)).toBe('MEDIUM');
      expect(classifyDiscrepancySeverity(70)).toBe('HIGH');
      expect(classifyDiscrepancySeverity(89)).toBe('HIGH');
      expect(classifyDiscrepancySeverity(90)).toBe('CRITICAL');
      expect(classifyDiscrepancySeverity(100)).toBe('CRITICAL');
      expect(classifyDiscrepancySeverity(150)).toBe('CRITICAL'); // Clamping check
      expect(classifyDiscrepancySeverity(-10)).toBe('LOW'); // Clamping check
    });
  });

  // -------------------------------------------------------------
  // 6. Demo Local Storage Persistence Behavior
  // -------------------------------------------------------------
  describe('Demo Local Storage Persistence Behavior', () => {
    it('retrieves baseline synthetic seed feedback initially', () => {
      const all = getAllCitizenFeedback();
      expect(all.length).toBe(SYNTHETIC_SEED_FEEDBACK.length);
      expect(all.some((f) => f.projectId === 'MP-KA-2026-0551')).toBe(true);
      expect(all.some((f) => f.projectId === 'MP-TN-2026-1120')).toBe(true);
    });

    it('persists a new demo record and merges it with baseline data', () => {
      const newRecord: CitizenFeedbackRecord = {
        id: 'cf-usr-test-123',
        projectId: 'MP-RJ-2026-0455',
        citizenToken: 'CTZ-TOK-TEST99',
        submittedAt: '2026-08-30T10:00:00Z',
        proximityStatus: 'on_site',
        coarseDistanceMeters: 50,
        observedStatus: 'completed',
        qualityRating: 5,
        issuesReported: [],
        comment: 'Panchayat school toilet unit installed and water tap functioning.',
        storageSource: 'demo_local_storage',
        isSynthetic: true,
      };

      saveDemoFeedbackRecord(newRecord);

      const stored = getStoredDemoFeedback();
      expect(stored.some((r) => r.id === 'cf-usr-test-123')).toBe(true);

      const projectFeedback = getAllCitizenFeedback('MP-RJ-2026-0455');
      expect(projectFeedback.some((r) => r.id === 'cf-usr-test-123')).toBe(true);
    });

    it('resets demo storage back to seed state', () => {
      const tempRecord: CitizenFeedbackRecord = {
        id: 'cf-temp-999',
        projectId: 'MP-GJ-2026-0712',
        citizenToken: 'CTZ-TOK-TEMP99',
        submittedAt: '2026-08-30T10:00:00Z',
        proximityStatus: 'on_site',
        observedStatus: 'completed',
        qualityRating: 5,
        issuesReported: [],
        storageSource: 'demo_local_storage',
        isSynthetic: true,
      };

      saveDemoFeedbackRecord(tempRecord);
      expect(getStoredDemoFeedback().length).toBeGreaterThan(0);

      clearDemoFeedbackStorage();
      expect(getStoredDemoFeedback().length).toBe(0);
      expect(getAllCitizenFeedback('MP-GJ-2026-0712').length).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 7. Non-Accusatory Audit Language Verification
  // -------------------------------------------------------------
  describe('Non-Accusatory Audit Language Integrity', () => {
    it('ensures all rule labels, descriptions, and recommendations adhere to objective audit terminology', () => {
      const project = { id: 'AUDIT-PROJ', verify: 'Verified', allocated: 50, spent: 50 };
      const feedback: CitizenFeedbackRecord[] = [
        {
          id: 'audit-1',
          projectId: 'AUDIT-PROJ',
          citizenToken: 'CTZ-TOK-AUD1',
          submittedAt: '2026-08-20T10:00:00Z',
          proximityStatus: 'on_site',
          observedStatus: 'abandoned',
          qualityRating: 1,
          issuesReported: ['substandard_materials', 'signboard_missing'],
          storageSource: 'synthetic_seed',
          isSynthetic: true,
        },
        {
          id: 'audit-2',
          projectId: 'AUDIT-PROJ',
          citizenToken: 'CTZ-TOK-AUD2',
          submittedAt: '2026-08-21T10:00:00Z',
          proximityStatus: 'on_site',
          observedStatus: 'not_started',
          qualityRating: 1,
          issuesReported: ['substandard_materials', 'access_blocked'],
          storageSource: 'synthetic_seed',
          isSynthetic: true,
        },
      ];

      const summary = analyzeProjectCitizenFeedback(project, feedback);
      expect(summary.findings.length).toBeGreaterThan(0);

      const forbiddenWords = ['fraud', 'corrupt', 'criminal', 'crime', 'guilty', 'scam', 'fake'];

      for (const finding of summary.findings) {
        const fullText = `${finding.label} ${finding.description} ${finding.recommendedAction} ${finding.evidence.join(' ')}`.toLowerCase();
        for (const word of forbiddenWords) {
          expect(fullText).not.toContain(word);
        }
      }
    });
  });
});
