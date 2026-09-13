/**
 * =====================================================================
 * FRAUDGUARD — Layer 5: Citizen QR Feedback & Ground-Truth Verification
 * Synthetic Demo Data & Browser Local Storage Adapter
 *
 * ⚠️ DEMO ENVIRONMENT NOTICE:
 * All feedback items, comments, and audit tokens below are synthetic and
 * fabricated for demonstration purposes. They map strictly to the 13 authentic
 * projects defined in `src/lib/data.ts`.
 *
 * PRIVACY SAFEGUARDS:
 * - Plaintext phone numbers are NEVER stored or rendered.
 * - All citizen records use salted hash audit tokens (CTZ-TOK-XXXX).
 * - Exact citizen GPS coordinates are NEVER stored or rendered; only coarse
 *   proximity status (on_site / proximate / distant) and rounded distance.
 * - In demo mode, OTP verification is explicitly documented as simulated.
 * =====================================================================
 */

import type {
  CitizenFeedbackRecord,
  RawCitizenSubmissionInput,
  ProximityStatus,
} from './citizenFeedbackTypes';

export const DEMO_CITIZEN_STORAGE_KEY = 'fraudguard_demo_citizen_feedback_v1';

export const DEMO_STORAGE_DISCLAIMER =
  'TEMPORARY BROWSER DEMO STORAGE — Stored locally in browser session for prototype validation. Not connected to live production database.';

export const DEMO_OTP_NOTICE =
  'DEMO MODE: Enter any 6-digit code. No actual SMS is dispatched for this demonstration.';

export const PRIVACY_ASSURANCE_NOTICE =
  'Your phone number and precise GPS coordinates are never stored or displayed. All submissions are protected by one-way audit tokens.';

/**
 * Deterministic, non-reversible privacy token generator.
 * Hashes phone number with an application salt so that identical phone numbers in demo
 * generate consistent anonymous audit tokens without ever exposing the phone number.
 */
export function generateCitizenToken(
  rawPhone: string,
  salt: string = 'FRAUDGUARD_CITIZEN_SALT_2026'
): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  const cleanPhone = digits.length > 10 ? digits.slice(-10) : digits;
  const input = `${salt}:${cleanPhone || 'ANON'}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code << 1), 0x5bd1e995);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `CTZ-TOK-${hex1.slice(0, 4)}${hex2.slice(0, 4)}`;
}

/**
 * Approximate distance calculation between two coordinates in meters (Haversine formula).
 */
export function computeDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Rounds exact distance to nearest 50 meters for privacy preservation.
 */
export function roundToCoarseDistance(meters: number): number {
  if (meters < 25) return 0;
  return Math.round(meters / 50) * 50;
}

/**
 * Classifies proximity based on distance in meters.
 */
export function classifyProximityFromDistance(
  distanceMeters: number | null | undefined
): ProximityStatus {
  if (distanceMeters === null || distanceMeters === undefined || Number.isNaN(distanceMeters)) {
    return 'unverified';
  }
  if (distanceMeters <= 150) return 'on_site';
  if (distanceMeters <= 1000) return 'proximate';
  return 'distant';
}

/**
 * Baseline synthetic seed records anchored to the 13 authentic projects in `PROJECTS`.
 */
export const SYNTHETIC_SEED_FEEDBACK: readonly CitizenFeedbackRecord[] = [
  // 1. MP-KA-2026-0551: Sub-Minor Irrigation Canal, Belagavi (Severe inactivity & defects reported)
  {
    id: 'cf-ka-01',
    projectId: 'MP-KA-2026-0551',
    citizenToken: 'CTZ-TOK-8841F9A0',
    submittedAt: '2026-08-14T10:15:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 50,
    observedStatus: 'abandoned',
    qualityRating: 1,
    issuesReported: ['site_abandoned', 'no_work_visible'],
    comment:
      'Canal excavation was stopped 4 months ago. Heavy machinery was moved away and trench remains incomplete.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-ka-02',
    projectId: 'MP-KA-2026-0551',
    citizenToken: 'CTZ-TOK-9218E1B7',
    submittedAt: '2026-08-18T14:40:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 100,
    observedStatus: 'not_started',
    qualityRating: 2,
    issuesReported: ['delayed_timeline', 'signboard_missing'],
    comment:
      'No active construction labor seen here this month. Mandatory project sign board is not installed.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-ka-03',
    projectId: 'MP-KA-2026-0551',
    citizenToken: 'CTZ-TOK-4432C8D1',
    submittedAt: '2026-08-22T09:20:00Z',
    proximityStatus: 'proximate',
    coarseDistanceMeters: 350,
    observedStatus: 'abandoned',
    qualityRating: 1,
    issuesReported: ['substandard_materials'],
    comment:
      'Pre-cast concrete segments left by the roadside are cracked and crumbling.',
    hasPhotoProof: false,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-ka-04',
    projectId: 'MP-KA-2026-0551',
    citizenToken: 'CTZ-TOK-1590A7E3',
    submittedAt: '2026-08-26T16:05:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 50,
    observedStatus: 'in_progress',
    qualityRating: 2,
    issuesReported: ['delayed_timeline'],
    comment:
      'Occasional maintenance work only. Deep digging paused since pre-monsoon.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },

  // 2. MP-DEL-2026-0142: Health Clinic North West Delhi (Building locked, unequipped)
  {
    id: 'cf-del-01',
    projectId: 'MP-DEL-2026-0142',
    citizenToken: 'CTZ-TOK-1402D3F5',
    submittedAt: '2026-08-10T11:30:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 50,
    observedStatus: 'in_progress',
    qualityRating: 2,
    issuesReported: ['delayed_timeline', 'substandard_materials'],
    comment:
      'Structural brickwork done but windows and electric fittings are unfinished. Building remains locked.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-del-02',
    projectId: 'MP-DEL-2026-0142',
    citizenToken: 'CTZ-TOK-7193B6C8',
    submittedAt: '2026-08-15T15:10:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 100,
    observedStatus: 'not_started',
    qualityRating: 1,
    issuesReported: ['no_work_visible'],
    comment:
      'No medical staff or supplies. Facility cannot be used by neighborhood patients.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-del-03',
    projectId: 'MP-DEL-2026-0142',
    citizenToken: 'CTZ-TOK-3829A4E2',
    submittedAt: '2026-08-20T12:00:00Z',
    proximityStatus: 'proximate',
    coarseDistanceMeters: 400,
    observedStatus: 'in_progress',
    qualityRating: 2,
    issuesReported: ['delayed_timeline'],
    comment:
      'Progress has been exceedingly slow over the past 6 months.',
    hasPhotoProof: false,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },

  // 3. MP-TN-2026-1120: Panchayat Road Drainage, Vellore (Clean positive verification)
  {
    id: 'cf-tn-01',
    projectId: 'MP-TN-2026-1120',
    citizenToken: 'CTZ-TOK-6610E9A4',
    submittedAt: '2026-08-05T08:45:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 50,
    observedStatus: 'completed',
    qualityRating: 5,
    issuesReported: [],
    comment:
      'Cement concrete drains laid properly on both sides of the main village road.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-tn-02',
    projectId: 'MP-TN-2026-1120',
    citizenToken: 'CTZ-TOK-8834C1D9',
    submittedAt: '2026-08-09T13:20:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 100,
    observedStatus: 'completed',
    qualityRating: 5,
    issuesReported: [],
    comment:
      'Drainage water is flowing freely without waterlogging now.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-tn-03',
    projectId: 'MP-TN-2026-1120',
    citizenToken: 'CTZ-TOK-2947F5B8',
    submittedAt: '2026-08-16T17:15:00Z',
    proximityStatus: 'proximate',
    coarseDistanceMeters: 250,
    observedStatus: 'completed',
    qualityRating: 4,
    issuesReported: [],
    comment:
      'Work finished neatly and road is clean.',
    hasPhotoProof: false,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },

  // 4. MP-WB-2026-0603: Community Water Points, Hooghly (Incomplete water points)
  {
    id: 'cf-wb-01',
    projectId: 'MP-WB-2026-0603',
    citizenToken: 'CTZ-TOK-5198B2A7',
    submittedAt: '2026-08-11T10:00:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 50,
    observedStatus: 'abandoned',
    qualityRating: 1,
    issuesReported: ['no_work_visible', 'site_abandoned'],
    comment:
      'Tube well drilled but hand pump mechanism never fitted. Surrounding concrete slab broken.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-wb-02',
    projectId: 'MP-WB-2026-0603',
    citizenToken: 'CTZ-TOK-7421D8C3',
    submittedAt: '2026-08-19T14:30:00Z',
    proximityStatus: 'proximate',
    coarseDistanceMeters: 200,
    observedStatus: 'not_started',
    qualityRating: 2,
    issuesReported: ['delayed_timeline'],
    comment:
      'Residents still fetching water from distant taps. Project inactive.',
    hasPhotoProof: false,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },

  // 5. MP-MP-2026-0310: Rural Hand Pump Cluster, Bhopal (Clean positive verification)
  {
    id: 'cf-mp-01',
    projectId: 'MP-MP-2026-0310',
    citizenToken: 'CTZ-TOK-3319F4B1',
    submittedAt: '2026-08-04T09:10:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 50,
    observedStatus: 'completed',
    qualityRating: 5,
    issuesReported: [],
    comment:
      'Both hand pumps installed and operating cleanly in the ward.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
  {
    id: 'cf-mp-02',
    projectId: 'MP-MP-2026-0310',
    citizenToken: 'CTZ-TOK-9042C7D6',
    submittedAt: '2026-08-12T11:45:00Z',
    proximityStatus: 'on_site',
    coarseDistanceMeters: 100,
    observedStatus: 'completed',
    qualityRating: 4,
    issuesReported: [],
    comment:
      'Good quality installation and clean water output.',
    hasPhotoProof: true,
    storageSource: 'synthetic_seed',
    isSynthetic: true,
  },
];

/**
 * In-memory fallback cache when running outside a browser environment (e.g. Node tests).
 */
let inMemoryDemoStore: CitizenFeedbackRecord[] = [];

/**
 * Safely inspects whether window.localStorage is accessible.
 */
function isLocalStorageAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage !== null
    );
  } catch {
    return false;
  }
}

/**
 * Reads demo feedback records persisted in browser localStorage.
 */
export function getStoredDemoFeedback(): CitizenFeedbackRecord[] {
  if (!isLocalStorageAvailable()) {
    return [...inMemoryDemoStore];
  }
  try {
    const raw = window.localStorage.getItem(DEMO_CITIZEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as CitizenFeedbackRecord[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Saves a new feedback record to demo storage (localStorage or in-memory fallback).
 */
export function saveDemoFeedbackRecord(record: CitizenFeedbackRecord): void {
  if (!isLocalStorageAvailable()) {
    inMemoryDemoStore = [record, ...inMemoryDemoStore.filter((r) => r.id !== record.id)];
    return;
  }
  try {
    const existing = getStoredDemoFeedback();
    const updated = [record, ...existing.filter((r) => r.id !== record.id)];
    window.localStorage.setItem(DEMO_CITIZEN_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    inMemoryDemoStore = [record, ...inMemoryDemoStore.filter((r) => r.id !== record.id)];
  }
}

/**
 * Clears demo feedback from browser storage and in-memory cache.
 */
export function clearDemoFeedbackStorage(): void {
  inMemoryDemoStore = [];
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(DEMO_CITIZEN_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Resets demo storage to baseline synthetic seed feedback.
 */
export function resetDemoFeedbackToSeed(): void {
  clearDemoFeedbackStorage();
}

/**
 * Retrieves all citizen feedback, combining baseline synthetic seed data with
 * any demo feedback submitted during the current browser session.
 *
 * @param projectId Optional filter by authentic project ID
 */
export function getAllCitizenFeedback(projectId?: string): CitizenFeedbackRecord[] {
  const userStored = getStoredDemoFeedback();
  const userMap = new Map<string, CitizenFeedbackRecord>();
  for (const item of userStored) {
    userMap.set(item.id, item);
  }

  // Combine seed items (overridden if an identical ID exists in user store) + user items
  const combined: CitizenFeedbackRecord[] = [...userStored];
  for (const seed of SYNTHETIC_SEED_FEEDBACK) {
    if (!userMap.has(seed.id)) {
      combined.push(seed);
    }
  }

  // Sort descending by submission date
  combined.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  if (projectId) {
    return combined.filter((item) => item.projectId === projectId);
  }
  return combined;
}

/**
 * Factory function to transform a raw submission into a privacy-sanitized CitizenFeedbackRecord.
 *
 * PRIVACY GUARANTEE:
 * - Phone numbers are converted to opaque salted tokens and discarded.
 * - Exact coordinates are used to compute coarse proximity and discarded.
 */
export function sanitizeAndCreateFeedbackRecord(
  input: RawCitizenSubmissionInput
): CitizenFeedbackRecord {
  // 1. Generate opaque salted token from phone number
  const citizenToken = generateCitizenToken(input.rawPhoneInput);

  // 2. Compute coarse proximity status
  let coarseDistanceMeters: number | undefined = undefined;
  let proximityStatus: ProximityStatus = 'unverified';

  if (
    input.citizenCoordinates &&
    input.projectCoordinates &&
    typeof input.citizenCoordinates.latitude === 'number' &&
    typeof input.citizenCoordinates.longitude === 'number' &&
    typeof input.projectCoordinates.latitude === 'number' &&
    typeof input.projectCoordinates.longitude === 'number'
  ) {
    const rawDist = computeDistanceMeters(
      input.citizenCoordinates.latitude,
      input.citizenCoordinates.longitude,
      input.projectCoordinates.latitude,
      input.projectCoordinates.longitude
    );
    coarseDistanceMeters = roundToCoarseDistance(rawDist);
    proximityStatus = classifyProximityFromDistance(rawDist);
  }

  const newRecord: CitizenFeedbackRecord = {
    id: `cf-usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId: input.projectId,
    citizenToken,
    submittedAt: new Date().toISOString(),
    proximityStatus,
    coarseDistanceMeters,
    observedStatus: input.observedStatus,
    qualityRating: input.qualityRating,
    issuesReported: [...input.issuesReported],
    comment: input.comment ? input.comment.trim().slice(0, 500) : undefined,
    hasPhotoProof: Boolean(input.hasPhotoProof),
    storageSource: 'demo_local_storage',
    isSynthetic: true,
  };

  return newRecord;
}
