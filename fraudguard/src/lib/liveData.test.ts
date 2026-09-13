/**
 * Unit tests for mapDbProjectToFrontend and the demo fallback normalization.
 * These tests are pure (no network, no React) and cover:
 *   1. Normal DB row mapping
 *   2. Null-safety for every optional field
 *   3. verify_status coercion to valid VerifyStatus
 *   4. qr_token is never present in the output
 *   5. Amounts aliased under both DB and legacy frontend names
 *   6. vendor_id is mapped to vendor field
 *   7. project_type is mapped to type field
 *   8. risk_score and riskScore are both set
 *   9. fiscal_year is mapped to year
 *  10. Advisory fields (risk_score, finding) are included but not renamed misleadingly
 */
import { describe, it, expect } from 'vitest';
import { mapDbProjectToFrontend, type DbProjectRow } from './liveData';

function makeRow(overrides: Partial<DbProjectRow> = {}): DbProjectRow {
  return {
    id: 'MP-TEST-001',
    name: 'Test Project',
    state: 'Delhi',
    district: 'North Delhi',
    constituency: 'North West Delhi',
    project_type: 'Health',
    vendor_id: 'VENDOR-42',
    amount_sanctioned: 5000000,
    amount_spent: 4800000,
    latitude: 28.7,
    longitude: 77.2,
    status: 'In Progress',
    risk_score: 72,
    finding: 'Cost deviation requires review',
    verify_status: 'Pending',
    fiscal_year: '2025-26',
    ...overrides,
  };
}

describe('mapDbProjectToFrontend', () => {
  it('maps a complete DB row to the expected frontend shape', () => {
    const result = mapDbProjectToFrontend(makeRow());
    expect(result.id).toBe('MP-TEST-001');
    expect(result.name).toBe('Test Project');
    expect(result.state).toBe('Delhi');
    expect(result.district).toBe('North Delhi');
    expect(result.constituency).toBe('North West Delhi');
  });

  it('maps project_type to type', () => {
    const result = mapDbProjectToFrontend(makeRow({ project_type: 'Roads' }));
    expect(result.type).toBe('Roads');
  });

  it('maps vendor_id to vendor', () => {
    const result = mapDbProjectToFrontend(makeRow({ vendor_id: 'VND-007' }));
    expect(result.vendor).toBe('VND-007');
  });

  it('maps amount_sanctioned to both amount_sanctioned and allocated', () => {
    const result = mapDbProjectToFrontend(makeRow({ amount_sanctioned: 1000000 }));
    expect(result.amount_sanctioned).toBe(1000000);
    expect(result.allocated).toBe(1000000);
  });

  it('maps amount_spent to both amount_spent and spent', () => {
    const result = mapDbProjectToFrontend(makeRow({ amount_spent: 900000 }));
    expect(result.amount_spent).toBe(900000);
    expect(result.spent).toBe(900000);
  });

  it('maps risk_score to both risk_score and riskScore', () => {
    const result = mapDbProjectToFrontend(makeRow({ risk_score: 85 }));
    expect(result.risk_score).toBe(85);
    expect(result.riskScore).toBe(85);
  });

  it('maps verify_status to verify', () => {
    expect(mapDbProjectToFrontend(makeRow({ verify_status: 'Verified' })).verify).toBe('Verified');
    expect(mapDbProjectToFrontend(makeRow({ verify_status: 'Failed' })).verify).toBe('Failed');
    expect(mapDbProjectToFrontend(makeRow({ verify_status: 'Field Visit' })).verify).toBe('Field Visit');
    expect(mapDbProjectToFrontend(makeRow({ verify_status: 'Pending' })).verify).toBe('Pending');
  });

  it('maps fiscal_year to year', () => {
    const result = mapDbProjectToFrontend(makeRow({ fiscal_year: '2024-25' }));
    expect(result.year).toBe('2024-25');
  });

  it('maps latitude/longitude to lat/lon', () => {
    const result = mapDbProjectToFrontend(makeRow({ latitude: 19.07, longitude: 72.88 }));
    expect(result.lat).toBe(19.07);
    expect(result.lon).toBe(72.88);
  });

  it('never includes qr_token in the output', () => {
    const result = mapDbProjectToFrontend(makeRow());
    expect(Object.keys(result)).not.toContain('qr_token');
  });

  // Null-safety tests
  it('defaults null name to empty string', () => {
    expect(mapDbProjectToFrontend(makeRow({ name: null })).name).toBe('');
  });

  it('defaults null state to empty string', () => {
    expect(mapDbProjectToFrontend(makeRow({ state: null })).state).toBe('');
  });

  it('defaults null district to empty string', () => {
    expect(mapDbProjectToFrontend(makeRow({ district: null })).district).toBe('');
  });

  it('defaults null constituency to empty string', () => {
    expect(mapDbProjectToFrontend(makeRow({ constituency: null })).constituency).toBe('');
  });

  it('defaults null project_type to empty string', () => {
    expect(mapDbProjectToFrontend(makeRow({ project_type: null })).type).toBe('');
  });

  it('defaults null vendor_id to N/A', () => {
    expect(mapDbProjectToFrontend(makeRow({ vendor_id: null })).vendor).toBe('N/A');
  });

  it('defaults null amount_sanctioned to 0 in both aliases', () => {
    const result = mapDbProjectToFrontend(makeRow({ amount_sanctioned: null }));
    expect(result.amount_sanctioned).toBe(0);
    expect(result.allocated).toBe(0);
  });

  it('defaults null amount_spent to 0 in both aliases', () => {
    const result = mapDbProjectToFrontend(makeRow({ amount_spent: null }));
    expect(result.amount_spent).toBe(0);
    expect(result.spent).toBe(0);
  });

  it('defaults null risk_score to 0 in both aliases', () => {
    const result = mapDbProjectToFrontend(makeRow({ risk_score: null }));
    expect(result.risk_score).toBe(0);
    expect(result.riskScore).toBe(0);
  });

  it('defaults null finding to empty string', () => {
    expect(mapDbProjectToFrontend(makeRow({ finding: null })).finding).toBe('');
  });

  it('defaults null fiscal_year to empty string', () => {
    expect(mapDbProjectToFrontend(makeRow({ fiscal_year: null })).year).toBe('');
  });

  it('keeps null latitude and longitude as null (not 0)', () => {
    const result = mapDbProjectToFrontend(makeRow({ latitude: null, longitude: null }));
    expect(result.lat).toBeNull();
    expect(result.lon).toBeNull();
  });

  it('coerces unknown verify_status to Pending', () => {
    expect(mapDbProjectToFrontend(makeRow({ verify_status: 'Unknown' })).verify).toBe('Pending');
    expect(mapDbProjectToFrontend(makeRow({ verify_status: null })).verify).toBe('Pending');
    expect(mapDbProjectToFrontend(makeRow({ verify_status: '' })).verify).toBe('Pending');
  });
});
