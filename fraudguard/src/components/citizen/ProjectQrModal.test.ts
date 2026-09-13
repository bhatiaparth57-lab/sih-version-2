import { describe, expect, it } from 'vitest';
import { buildProjectFeedbackUrl } from './ProjectQrModal';
import { PROJECTS, projectById } from '@/lib/data';

describe('Layer 5 - Phase 3: QR Code Generator & URL Helper', () => {
  const DEFAULT_ORIGIN = 'https://fraudguard.gov.in';

  // -------------------------------------------------------------
  // 1. Correct URL Generation
  // -------------------------------------------------------------
  describe('Public Feedback URL Generation', () => {
    it('generates the exact canonical /feedback/:projectId URL', () => {
      const url = buildProjectFeedbackUrl('MP-DEL-2026-0142', DEFAULT_ORIGIN);
      expect(url).toBe('https://fraudguard.gov.in/feedback/MP-DEL-2026-0142');
    });

    it('respects custom host origins', () => {
      const localUrl = buildProjectFeedbackUrl('MP-KA-2026-0551', 'http://localhost:5173');
      expect(localUrl).toBe('http://localhost:5173/feedback/MP-KA-2026-0551');

      const stagingUrl = buildProjectFeedbackUrl('MP-TN-2026-1120', 'https://staging.fraudguard.in');
      expect(stagingUrl).toBe('https://staging.fraudguard.in/feedback/MP-TN-2026-1120');
    });

    it('encodes special characters in project identifiers properly', () => {
      const encoded = buildProjectFeedbackUrl('MP#DEL/2026', DEFAULT_ORIGIN);
      expect(encoded).toBe('https://fraudguard.gov.in/feedback/MP%23DEL%2F2026');
    });
  });

  // -------------------------------------------------------------
  // 2. Project Identifier & Trimming
  // -------------------------------------------------------------
  describe('Project Identifier Handling', () => {
    it('trims leading and trailing whitespace from project IDs', () => {
      const url = buildProjectFeedbackUrl('   MP-UP-2026-0821   ', DEFAULT_ORIGIN);
      expect(url).toBe('https://fraudguard.gov.in/feedback/MP-UP-2026-0821');
    });

    it('returns null for empty strings, null, or undefined', () => {
      expect(buildProjectFeedbackUrl('')).toBeNull();
      expect(buildProjectFeedbackUrl('   ')).toBeNull();
      expect(buildProjectFeedbackUrl(null)).toBeNull();
      expect(buildProjectFeedbackUrl(undefined)).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // 3. Authentic PROJECTS Compatibility
  // -------------------------------------------------------------
  describe('Authentic PROJECTS Directory Integration', () => {
    it('generates valid canonical feedback URLs for all 13 authentic projects in data.ts', () => {
      expect(PROJECTS.length).toBe(13);

      for (const p of PROJECTS) {
        const url = buildProjectFeedbackUrl(p.id, DEFAULT_ORIGIN);
        expect(url).toBe(`https://fraudguard.gov.in/feedback/${p.id}`);
        expect(projectById(p.id)).toBeDefined();
        expect(projectById(p.id)?.name).toBe(p.name);
      }
    });
  });

  // -------------------------------------------------------------
  // 4. Privacy Safeguards
  // -------------------------------------------------------------
  describe('Privacy Safeguards', () => {
    it('guarantees that generated QR URLs never expose phone numbers, tokens, or coordinates', () => {
      const url = buildProjectFeedbackUrl('MP-DEL-2026-0142', DEFAULT_ORIGIN);
      expect(url).not.toBeNull();

      // Does not contain query strings with phone or coords
      expect(url!).not.toContain('?');
      expect(url!).not.toContain('&');
      expect(url!).not.toContain('phone');
      expect(url!).not.toContain('lat');
      expect(url!).not.toContain('lng');
      expect(url!).not.toContain('coord');

      // Conforms strictly to standard route
      expect(url!).toMatch(/^https:\/\/fraudguard\.gov\.in\/feedback\/[A-Za-z0-9-_]+$/);
    });
  });
});
