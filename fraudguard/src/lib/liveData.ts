import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { PROJECTS, VENDORS, type VerifyStatus, type Risk } from './data';
import { SYNTHETIC_DEMO_VENDORS } from './vendorDemoData';
import type { VendorRecord } from './vendorTypes';

// ==========================================
// 1. PROJECTS — DB row type (confirmed schema)
// ==========================================

/**
 * Columns selected from public.projects.
 * Excludes: qr_token (never exposed in UI), category (not used by Projects page),
 *           created_at (not displayed in the project list).
 */
export interface DbProjectRow {
  id: string;
  name: string | null;
  state: string | null;
  district: string | null;
  constituency: string | null;
  project_type: string | null;   // frontend: type
  vendor_id: string | null;      // frontend: vendor (displayed as ID until vendors table is joined)
  amount_sanctioned: number | null;
  amount_spent: number | null;
  latitude: number | null;       // frontend: lat
  longitude: number | null;      // frontend: lon
  status: string | null;
  risk_score: number | null;     // advisory only — not a confirmed fraud probability
  finding: string | null;        // advisory only — not a confirmed legal determination
  verify_status: string | null;  // frontend: verify
  fiscal_year: string | null;    // frontend: year
}

/**
 * The frontend-normalised project shape used by Projects.tsx, CommandCenter.tsx, and other pages.
 * Both DB column names (amount_sanctioned, risk_score) and legacy frontend aliases
 * (allocated, riskScore) are present for backward compatibility.
 * qr_token is deliberately absent.
 */
export interface FrontendProject {
  // Identity
  id: string;
  name: string;
  // Location
  state: string;
  district: string;
  constituency: string;
  // Classification
  type: string;
  // Vendor displayed as vendor_id string until a join is implemented
  vendor: string;
  // Amounts (DB names)
  amount_sanctioned: number;
  amount_spent: number;
  // Amounts (legacy frontend aliases — kept for CommandCenter and other consumers)
  allocated: number;
  spent: number;
  // Coordinates (null means not recorded)
  lat: number | null;
  lon: number | null;
  // Status
  status: string;
  // Advisory risk score (0–100); not a confirmed fraud probability
  risk_score: number;
  riskScore: number;  // legacy alias
  // Advisory AI finding label; not a confirmed legal determination
  finding: string;
  // Verification status
  verify: VerifyStatus;
  // Fiscal year
  year: string;
  // Demo-data extra fields (present only in fallback mode, absent from DB rows)
  risk?: string;
  x?: number;
  y?: number;
  landmarks?: string[];
}

/** Explicit column list — no wildcard, qr_token deliberately excluded. */
const PROJECTS_SELECT =
  'id, name, state, district, constituency, project_type, vendor_id, ' +
  'amount_sanctioned, amount_spent, latitude, longitude, status, ' +
  'risk_score, finding, verify_status, fiscal_year';

/** Known-valid VerifyStatus values. Anything else falls back to 'Pending'. */
const VALID_VERIFY: VerifyStatus[] = ['Verified', 'Pending', 'Field Visit', 'Failed'];

/**
 * Maps a raw Supabase DB row to the shape expected by the Projects page.
 *
 * Notes:
 * - vendor_id is used as the vendor display label until a vendor join is implemented.
 * - risk_score and finding are advisory signals, not confirmed fraud determinations.
 * - verify_status is coerced to a known VerifyStatus or defaults to 'Pending'.
 * - Amounts are always numbers (null → 0); coordinates are null-safe optionals.
 * - qr_token is never fetched or included in the returned object.
 */
export function mapDbProjectToFrontend(row: DbProjectRow): FrontendProject {
  const riskScore = row.risk_score ?? 0;
  const amountSanctioned = row.amount_sanctioned ?? 0;
  const amountSpent = row.amount_spent ?? 0;
  const verifyRaw = row.verify_status ?? '';
  const verify: VerifyStatus = VALID_VERIFY.includes(verifyRaw as VerifyStatus)
    ? (verifyRaw as VerifyStatus)
    : 'Pending';

  return {
    // Identity
    id: row.id,
    name: row.name ?? '',
    // Location
    state: row.state ?? '',
    district: row.district ?? '',
    constituency: row.constituency ?? '',
    // Type (DB: project_type → frontend: type)
    type: row.project_type ?? '',
    // Vendor identifier displayed until vendors table is joined
    vendor: row.vendor_id ?? 'N/A',
    // Amounts — DB column names AND legacy frontend aliases both set for compatibility
    amount_sanctioned: amountSanctioned,
    amount_spent: amountSpent,
    allocated: amountSanctioned,
    spent: amountSpent,
    // Coordinates — null means coordinates not recorded
    lat: row.latitude ?? null,
    lon: row.longitude ?? null,
    // Status
    status: row.status ?? '',
    // Advisory risk score (0–100); not a confirmed fraud probability
    risk_score: riskScore,
    riskScore,
    // Advisory finding label; not a confirmed legal determination
    finding: row.finding ?? '',
    // Verification status
    verify,
    // Fiscal year
    year: row.fiscal_year ?? '',
  };
}

/** Normalizes a demo Project record to the same shape as mapDbProjectToFrontend output. */
function normalizeDemoProject(p: (typeof PROJECTS)[number]): FrontendProject {
  return {
    ...p,
    amount_sanctioned: p.allocated ?? 0,
    amount_spent: p.spent ?? 0,
    risk_score: p.riskScore ?? 0,
    riskScore: p.riskScore ?? 0,
    vendor: p.vendor ?? 'N/A',
    status: '',
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    verify: p.verify ?? 'Pending',
    year: p.year ?? '',
  };
}

// ==========================================
// 1b. useLiveProjects hook
// ==========================================
export function useLiveProjects() {
  const [projects, setProjects] = useState<FrontendProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Demo mode: Supabase not configured — serve synthetic data immediately
    if (!isSupabaseConfigured) {
      setProjects((PROJECTS || []).map(normalizeDemoProject));
      setLoading(false);
      return;
    }

    async function fetchProjects() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select(PROJECTS_SELECT);

      if (fetchError || !data || data.length === 0) {
        // Fallback: DB error or empty result set — serve demo data
        console.warn('[useLiveProjects] DB fetch failed or empty, using demo fallback:', fetchError?.message);
        setProjects((PROJECTS || []).map(normalizeDemoProject));
        if (fetchError) setError(fetchError.message);
      } else {
        // Cast through unknown first — Supabase infers a generic error union type
        // that does not overlap with DbProjectRow statically, but the selected columns
        // match exactly at runtime.
        setProjects((data as unknown as DbProjectRow[]).map(mapDbProjectToFrontend));
      }

      setLoading(false);
    }

    fetchProjects();
  }, []);

  return { projects, loading, error };
}



// ==========================================
// 2. VENDORS CONNECTION & DEMO FALLBACK
// ==========================================

export interface UseLiveVendorsResult {
  vendors: VendorRecord[];
  loading: boolean;
  error: string | null;
  isLive: boolean;
}

/**
 * Resolves database query output into typed VendorRecord array and isLive status.
 * Pure function separated for deterministic unit testing.
 * - isLive is true ONLY when dbData has at least 1 actual row.
 * - In all other cases (unconfigured, error, empty table), falls back to complete
 *   SYNTHETIC_DEMO_VENDORS with tokens and attributes preserved.
 */
export function resolveLiveVendors(
  dbData: any[] | null | undefined,
  dbError: { message: string } | null | undefined,
  isConfigured: boolean,
): { vendors: VendorRecord[]; isLive: boolean; error: string | null } {
  if (!isConfigured) {
    return { vendors: SYNTHETIC_DEMO_VENDORS, isLive: false, error: null };
  }

  if (dbError) {
    return { vendors: SYNTHETIC_DEMO_VENDORS, isLive: false, error: dbError.message };
  }

  if (!dbData || dbData.length === 0) {
    return { vendors: SYNTHETIC_DEMO_VENDORS, isLive: false, error: null };
  }

  // Live Supabase records: Map database columns without attaching simulated relationship tokens
  const liveVendors: VendorRecord[] = dbData.map((v) => ({
    id: String(v.id || `v-${v.name}`),
    name: String(v.name || 'Unknown Vendor'),
    pan: v.pan ? String(v.pan) : undefined,
    gstin: v.gstin ? String(v.gstin) : undefined,
    projectsCount: Number(v.projects_count ?? v.projectsCount ?? v.projects ?? 0),
    totalValueCrore: Number(v.total_value ?? v.totalValueCrore ?? v.total ?? 0),
    risk: (v.risk_level || v.risk || 'LOW') as Risk,
    riskScore: Number(v.risk_score ?? v.riskScore ?? 0),
    concentration: Number(v.concentration ?? 0),
    alerts: Number(v.alerts ?? 0),
    districtsCount: Number(v.districts_count ?? v.districtsCount ?? v.districts ?? 0),
    highRisk: Number(v.high_risk ?? v.highRisk ?? 0),
    established: v.established ? String(v.established) : undefined,
    relation: v.relation ? String(v.relation) : undefined,
    demoPanToken: undefined,
    demoPhysicalAddress: undefined,
    demoDirectorNames: undefined,
    demoContactDomain: undefined,
    demoBankTokenHash: undefined,
  }));

  return { vendors: liveVendors, isLive: true, error: null };
}

export function useLiveVendors(): UseLiveVendorsResult {
  const [vendors, setVendors] = useState<VendorRecord[]>(SYNTHETIC_DEMO_VENDORS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const resolved = resolveLiveVendors(null, null, false);
      setVendors(resolved.vendors);
      setIsLive(resolved.isLive);
      setError(resolved.error);
      setLoading(false);
      return;
    }

    async function fetchVendors() {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase.from('vendors').select('*');
        const resolved = resolveLiveVendors(data, fetchError, true);
        if (fetchError || !data || data.length === 0) {
          console.warn('[useLiveVendors] Supabase fetch failed or empty, using demo fallback:', fetchError?.message);
        }
        setVendors(resolved.vendors);
        setIsLive(resolved.isLive);
        setError(resolved.error);
      } catch (err: unknown) {
        const resolved = resolveLiveVendors(
          null,
          { message: err instanceof Error ? err.message : 'Unknown network error' },
          true,
        );
        setVendors(resolved.vendors);
        setIsLive(resolved.isLive);
        setError(resolved.error);
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  return { vendors, loading, error, isLive };
}

// ==========================================
// 3. INVESTIGATIONS CONNECTION
// ==========================================
export function useLiveInvestigations() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInvestigations([]);
      setLoading(false);
      return;
    }

    async function fetchInvestigations() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('investigations').select('*');
        if (!error && data) {
          setInvestigations(data);
        }
      } catch {
        setInvestigations([]);
      }
      setLoading(false);
    }
    fetchInvestigations();
  }, []);

  return { investigations, loading };
}

// ==========================================
// 4. ALERTS / FEEDBACK (Placeholder)
// ==========================================
export function useLiveAlerts() {
  return { alerts: [], loading: false };
}