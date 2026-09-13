import { describe, it, expect } from 'vitest';
import {
  supabase,
  isSupabaseConfigured,
  isServiceRoleKey,
  checkSupabaseConnection,
} from './supabaseClient';

describe('Supabase Client Setup & Security Verification', () => {
  describe('isServiceRoleKey Security Guard', () => {
    it('detects keys with service_role string or prefix', () => {
      expect(isServiceRoleKey('service_role')).toBe(true);
      expect(isServiceRoleKey('supabase_service_role_key_12345')).toBe(true);
      expect(isServiceRoleKey('sb_secret_abcdef123456')).toBe(true);
    });

    it('detects JWT tokens with payload role: service_role', () => {
      // Mock JWT header.payload.signature
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const serviceRolePayload = btoa(JSON.stringify({ role: 'service_role', exp: 1999999999 }));
      const serviceRoleJwt = `${header}.${serviceRolePayload}.signature`;

      expect(isServiceRoleKey(serviceRoleJwt)).toBe(true);
    });

    it('permits legitimate anon/publishable tokens with role: anon or public keys', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const anonPayload = btoa(JSON.stringify({ role: 'anon', exp: 1999999999 }));
      const anonJwt = `${header}.${anonPayload}.signature`;

      expect(isServiceRoleKey(anonJwt)).toBe(false);
      expect(isServiceRoleKey('sb_publishable_abcdef123456')).toBe(false);
      expect(isServiceRoleKey('')).toBe(false);
    });
  });

  describe('Configuration & Connection Check', () => {
    it('exports initialized supabase client instance', () => {
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(typeof supabase.from).toBe('function');
    });

    it('reports safe status without throwing when unconfigured or in demo mode', async () => {
      const status = await checkSupabaseConnection();
      expect(status).toBeDefined();
      expect(typeof status.configured).toBe('boolean');
      expect(typeof status.connected).toBe('boolean');

      if (!status.configured) {
        expect(status.connected).toBe(false);
        expect(status.error).toContain('Supabase');
      }
    });

    it('does not expose any service-role or secret keys in client exports', () => {
      expect(isServiceRoleKey(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '')).toBe(false);
      expect(isServiceRoleKey(import.meta.env.VITE_SUPABASE_ANON_KEY || '')).toBe(false);
    });
  });
});
