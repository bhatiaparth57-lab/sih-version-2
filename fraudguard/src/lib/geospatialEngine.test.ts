import { describe, expect, it } from 'vitest';
import {
  calculateDistanceMeters,
  classifyGeospatialRisk,
  isWithinBroadIndiaBounds,
  runGeospatialVerification,
} from './geospatialEngine';
import {
  DEMO_GEOSPATIAL_ANALYSIS_DATE,
  getGeospatialDemoAssets,
} from './geospatialDemoData';
import type { GeospatialAssetRecord } from './geospatialTypes';

describe('Layer 4: Idle-Fund & Geospatial Asset Tracking Engine', () => {
  function makeAsset(id: string, name: string, overrides: Partial<GeospatialAssetRecord> = {}): GeospatialAssetRecord {
    return {
      projectId: id,
      projectName: name,
      state: 'Tamil Nadu',
      district: 'Vellore',
      constituency: 'Vellore',
      projectType: 'Roads',
      vendorName: 'Orbit Civil Works',
      allocatedLakhs: 30,
      spentLakhs: 15,
      spendRatioPercent: 50,
      baselineRisk: 'LOW',
      baselineRiskScore: 10,
      verifyStatus: 'Verified',
      year: '2025-26',
      demoCoordinates: [79.13, 12.92], // Valid coordinates in Tamil Nadu
      demoPhysicalProgressPercent: 50,
      demoAssetStatus: 'Under Construction',
      demoLastUpdateDate: '2026-08-01',
      demoDaysSinceUpdate: 31,
      demoPhotoEvidenceCount: 6,
      demoPhotoPassCount: 6,
      demoGpsDriftMeters: 50,
      isSynthetic: true,
      ...overrides,
    };
  }

  it('assigns a low risk score (<25) and zero findings to a clean, verified asset', () => {
    const clean = makeAsset('P-CLEAN', 'Clean Drainage Project', {
      allocatedLakhs: 26,
      spentLakhs: 26,
      spendRatioPercent: 100,
      demoPhysicalProgressPercent: 100,
      demoAssetStatus: 'Verified',
      demoPhotoEvidenceCount: 8,
      demoPhotoPassCount: 8,
      demoGpsDriftMeters: 20,
    });

    const result = runGeospatialVerification([clean]);
    const profile = result.profiles['P-CLEAN'];

    expect(profile).toBeDefined();
    expect(profile.riskScore).toBeLessThan(25);
    expect(profile.riskLevel).toBe('LOW');
    expect(profile.findings).toHaveLength(0);
  });

  it('flags severe cost vs progress divergence (spend >= 80% with progress < 40%) with CRITICAL severity (+30 pts)', () => {
    const diverged = makeAsset('P-DIV', 'Diverged Flyover Project', {
      allocatedLakhs: 50,
      spentLakhs: 48,
      spendRatioPercent: 96,
      demoPhysicalProgressPercent: 25,
      demoAssetStatus: 'Under Construction',
    });

    const result = runGeospatialVerification([diverged]);
    const profile = result.profiles['P-DIV'];

    expect(profile.findings.some((f) => f.ruleName === 'severe_cost_progress_divergence')).toBe(true);
    expect(profile.riskScore).toBe(30);
    expect(profile.riskLevel).toBe('MEDIUM'); // 30 is medium
    expect(profile.findings[0].severity).toBe('CRITICAL');
    expect(profile.findings[0].title).toContain('Potential idle-fund indicator');
  });

  it('flags spending without progress (spend >= 50% with progress <= 20%) with HIGH severity (+25 pts)', () => {
    const stalled = makeAsset('P-STALL', 'Stalled Canal Work', {
      allocatedLakhs: 40,
      spentLakhs: 24,
      spendRatioPercent: 60,
      demoPhysicalProgressPercent: 15,
      demoAssetStatus: 'Under Construction',
    });

    const result = runGeospatialVerification([stalled]);
    const profile = result.profiles['P-STALL'];

    expect(profile.findings.some((f) => f.ruleName === 'spending_without_progress')).toBe(true);
    expect(profile.riskScore).toBe(25);
    expect(profile.findings[0].severity).toBe('HIGH');
  });

  it('flags dormant projects inactive >= 180 days or idle >= 12 months with unspent funds', () => {
    const idleAsset = makeAsset('P-IDLE', 'Idle Health Center', {
      allocatedLakhs: 44,
      spentLakhs: 20,
      demoDaysSinceUpdate: 240,
      demoIdleMonths: 14,
      demoAssetStatus: 'Idle',
    });

    const result = runGeospatialVerification([idleAsset]);
    const profile = result.profiles['P-IDLE'];

    expect(profile.findings.some((f) => f.ruleName === 'stalled_progress_idle_funds')).toBe(true);
    expect(profile.isIdle).toBe(true);
    expect(profile.findings[0].detail).toContain(DEMO_GEOSPATIAL_ANALYSIS_DATE);
  });

  it('flags completed assets missing ground-truth photo validation (<50% pass rate)', () => {
    const unverified = makeAsset('P-UNVER', 'Completed Community Hall', {
      allocatedLakhs: 30,
      spentLakhs: 30,
      spendRatioPercent: 100,
      demoPhysicalProgressPercent: 100,
      demoAssetStatus: 'Completed',
      demoPhotoEvidenceCount: 4,
      demoPhotoPassCount: 1, // 25% pass rate
    });

    const result = runGeospatialVerification([unverified]);
    const profile = result.profiles['P-UNVER'];

    expect(profile.findings.some((f) => f.ruleName === 'completed_without_verification')).toBe(true);
    expect(profile.findings[0].detail).toContain('25%');
  });

  it('flags missing or out-of-bounds coordinates', () => {
    const oobAsset = makeAsset('P-OOB', 'Invalid Coords Unit', {
      demoCoordinates: [120.5, 45.2], // Outside India bounds
    });

    const result = runGeospatialVerification([oobAsset]);
    const profile = result.profiles['P-OOB'];

    expect(profile.findings.some((f) => f.ruleName === 'missing_or_invalid_coords')).toBe(true);
    expect(isWithinBroadIndiaBounds([120.5, 45.2])).toBe(false);
  });

  it('flags duplicate close coordinates (< 100m) when NO site justification exists', () => {
    const a1 = makeAsset('P-A1', 'Sanctioned Hall 1', { demoCoordinates: [77.21, 28.61] });
    const a2 = makeAsset('P-A2', 'Sanctioned Hall 2', { demoCoordinates: [77.2101, 28.6101] }); // ~15 meters apart

    const result = runGeospatialVerification([a1, a2]);

    expect(result.profiles['P-A1'].findings.some((f) => f.ruleName === 'duplicate_close_coordinates')).toBe(true);
    expect(result.profiles['P-A2'].findings.some((f) => f.ruleName === 'duplicate_close_coordinates')).toBe(true);
    expect(result.duplicateCoordsCount).toBe(1);
  });

  it('does NOT penalize duplicate/close coordinates when a legitimate shared-site justification is documented', () => {
    const a1 = makeAsset('P-COMP-1', 'Panchayat Complex Phase 1', { demoCoordinates: [85.14, 25.59] });
    const a2 = makeAsset('P-COMP-2', 'Panchayat Complex Phase 2', {
      demoCoordinates: [85.1402, 25.5902], // ~25 meters apart
      demoSharedSiteJustification: 'Sanctioned Phase 2 extension on shared Panchayat compound',
    });

    const result = runGeospatialVerification([a1, a2]);

    // Neither asset is penalized for duplicate coordinates because justification exists
    expect(result.profiles['P-COMP-1'].findings.some((f) => f.ruleName === 'duplicate_close_coordinates')).toBe(false);
    expect(result.profiles['P-COMP-2'].findings.some((f) => f.ruleName === 'duplicate_close_coordinates')).toBe(false);
    expect(result.duplicateCoordsCount).toBe(0);
  });

  it('flags significant GPS drift exceeding 1,000 meters (> 1 km) from landmark', () => {
    const drifted = makeAsset('P-DRIFT', 'Drifted Sub-Centre', {
      demoGpsDriftMeters: 2100, // 2.1 km drift
    });

    const result = runGeospatialVerification([drifted]);
    const profile = result.profiles['P-DRIFT'];

    expect(profile.findings.some((f) => f.ruleName === 'spatial_gps_drift')).toBe(true);
    expect(profile.findings[0].detail).toContain('2100 meters (2.1 km)');
  });

  it('strictly caps risk score at 100 under heavy cumulative violations', () => {
    const extremeAsset = makeAsset('P-EXTREME', 'Extreme Anomaly Asset', {
      allocatedLakhs: 80,
      spentLakhs: 80,
      spendRatioPercent: 100,
      demoPhysicalProgressPercent: 10, // divergence: +30
      demoDaysSinceUpdate: 250, // idle: +20
      demoIdleMonths: 14, // idle: +20
      demoAssetStatus: 'Needs Field Visit', // visit: +15
      demoPhotoEvidenceCount: 10,
      demoPhotoPassCount: 1, // completed/spent without verification: +25
      demoGpsDriftMeters: 2500, // drift: +20
      // Total points: 30 + 20 + 25 + 20 + 15 = 110 -> clamped to 100
    });

    const result = runGeospatialVerification([extremeAsset]);
    const profile = result.profiles['P-EXTREME'];

    expect(profile.riskScore).toBe(100); // Clamped at 100
    expect(profile.riskLevel).toBe('CRITICAL');
  });

  it('correctly calculates Haversine distance in meters', () => {
    // Delhi Connaught Place to India Gate ~ 2.1 km
    const dist = calculateDistanceMeters([77.2167, 28.6315], [77.2295, 28.6129]);
    expect(dist).toBeGreaterThan(2000);
    expect(dist).toBeLessThan(2500);

    // Same coordinates
    expect(calculateDistanceMeters([77.2, 28.7], [77.2, 28.7])).toBe(0);
  });

  it('correctly maps severity bands from scores', () => {
    expect(classifyGeospatialRisk(0)).toBe('LOW');
    expect(classifyGeospatialRisk(24)).toBe('LOW');
    expect(classifyGeospatialRisk(25)).toBe('MEDIUM');
    expect(classifyGeospatialRisk(49)).toBe('MEDIUM');
    expect(classifyGeospatialRisk(50)).toBe('HIGH');
    expect(classifyGeospatialRisk(74)).toBe('HIGH');
    expect(classifyGeospatialRisk(75)).toBe('CRITICAL');
    expect(classifyGeospatialRisk(100)).toBe('CRITICAL');
  });

  it('executes successfully on all 13 baseline synthetic demo assets', () => {
    const assets = getGeospatialDemoAssets();
    expect(assets).toHaveLength(13);

    const result = runGeospatialVerification(assets);
    expect(result.assetsAnalyzed).toBe(13);
    expect(result.analysisReferenceDate).toBe(DEMO_GEOSPATIAL_ANALYSIS_DATE);
    expect(result.allFindings.length).toBeGreaterThan(0);

    // MP-TN-2026-1120 must be clean
    const cleanTn = result.profiles['MP-TN-2026-1120'];
    expect(cleanTn.riskScore).toBeLessThan(25);
    expect(cleanTn.riskLevel).toBe('LOW');

    // MP-DEL-2026-0142 must have high/critical score and findings
    const del = result.profiles['MP-DEL-2026-0142'];
    expect(del.riskScore).toBeGreaterThanOrEqual(50);
    expect(del.findings.some((f) => f.ruleName === 'severe_cost_progress_divergence')).toBe(true);

    // MP-TG-2026-0642 must be flagged for idle funds
    const tg = result.profiles['MP-TG-2026-0642'];
    expect(tg.isIdle).toBe(true);
    expect(tg.findings.some((f) => f.ruleName === 'stalled_progress_idle_funds')).toBe(true);
  });
});
