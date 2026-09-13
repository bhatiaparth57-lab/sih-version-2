/**
 * =====================================================================
 * FRAUDGUARD — Supabase Client Setup & Connection Status
 *
 * ⚠️ SECURITY & CONFIGURATION POLICIES:
 * 1. Reads ONLY Vite client-side environment variables:
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_PUBLISHABLE_KEY (with backward-compatible fallback to VITE_SUPABASE_ANON_KEY)
 * 2. NEVER hardcodes secret or publishable keys in source code.
 * 3. STRICTLY rejects service-role or secret keys (e.g. role: 'service_role' or 'sb_secret_*')
 *    to prevent accidental exposure of elevated credentials on the client.
 * 4. Safe fallback to demo mode with synthetic data when unconfigured.
 * =====================================================================
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawPublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

/**
 * Checks whether a given key appears to be an elevated service-role key or secret token.
 * Service-role keys must NEVER be bundled or used in client code.
 */
export function isServiceRoleKey(key: string): boolean {
  if (!key) return false;
  if (key.includes('service_role') || key.startsWith('sb_secret_')) return true;
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      // Decode JWT payload (middle segment)
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (payload.role === 'service_role') return true;
    }
  } catch {
    // Ignore non-JWT parsing failures
  }
  return false;
}

const hasServiceRoleKey = isServiceRoleKey(rawPublishableKey);
if (hasServiceRoleKey) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabaseClient] CRITICAL SECURITY ALERT: A service-role or secret key was detected in client environment variables. Service-role keys grant full database bypass and must NEVER be exposed in client code. Client initialization blocked.',
  );
}

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawPublishableKey &&
  rawUrl !== 'your_supabase_project_url' &&
  rawUrl !== 'https://your-project-id.supabase.co' &&
  rawPublishableKey !== 'your_supabase_anon_key' &&
  rawPublishableKey !== 'your_supabase_publishable_key' &&
  /^https?:\/\//i.test(rawUrl) &&
  !hasServiceRoleKey
);

if (!isSupabaseConfigured && !hasServiceRoleKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseClient] Missing or placeholder VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in environment. Running in demo mode with synthetic data fallback.',
  );
}

// Fallback to a valid format URL when unconfigured to prevent createClient from throwing synchronously at startup
const SUPABASE_URL = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = isSupabaseConfigured ? rawPublishableKey : 'placeholder-publishable-key';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseConnectionStatus {
  readonly configured: boolean;
  readonly connected: boolean;
  readonly url?: string;
  readonly error?: string;
}

/**
 * Performs a lightweight, non-destructive connection check against the Supabase backend.
 * Queries supabase.auth.getSession() without querying or modifying database tables.
 */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  if (!isSupabaseConfigured) {
    return {
      configured: false,
      connected: false,
      error: 'Supabase client is not configured. Missing or placeholder VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.',
    };
  }

  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      return {
        configured: true,
        connected: false,
        url: SUPABASE_URL,
        error: error.message,
      };
    }
    return {
      configured: true,
      connected: true,
      url: SUPABASE_URL,
    };
  } catch (err: unknown) {
    return {
      configured: true,
      connected: false,
      url: SUPABASE_URL,
      error: err instanceof Error ? err.message : 'Unknown network connection error',
    };
  }
}

export interface Profile {
  id: string;
  full_name: string;
  role: 'field_officer' | 'district_officer' | 'state_authority' | 'mp_office' | 'admin';
  state: string | null;
  district: string | null;
  constituency: string | null;
}

/** Fetch the logged-in user's role + region. Call once after login. */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, state, district, constituency')
    .eq('id', user.id)
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[getCurrentUserProfile]', error.message);
    return null;
  }
  return data as Profile;
}
