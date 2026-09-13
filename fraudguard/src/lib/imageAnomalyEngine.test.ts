import { describe, it, expect } from 'vitest';
import {
  computeHammingDistance,
  computeDHashFromLuminanceMatrix,
  runImageAnomalyAnalysis,
  calculateProjectTimelineWindow,
  GPS_TOLERANCE_METERS,
} from './imageAnomalyEngine';
import {
  DEMO_IMAGE_DATASET,
  getAllDemoImages,
  getImagesForProject,
} from './imageAnomalyDemoData';
import type { ImageEvidenceRecord } from './imageAnomalyTypes';

describe('Layer 1: Image, GPS & Multi-Source Anomaly Detection', () => {
  // ===================================================================
  // 1. PURE TYPESCRIPT PERCEPTUAL HASH & BITWISE UTILITIES
  // ===================================================================
  describe('Perceptual Hash & Hamming Distance Utilities', () => {
    it('computes distance 0 for identical 64-bit hex hashes', () => {
      const hash = 'a1b2c3d4e5f60718';
      expect(computeHammingDistance(hash, hash)).toBe(0);
    });

    it('computes exact bit difference for known single-bit changes', () => {
      // '0' is 0000, '1' is 0001 -> 1 bit difference
      const hashA = '0000000000000000';
      const hashB = '0000000000000001';
      expect(computeHammingDistance(hashA, hashB)).toBe(1);

      // 'f' is 1111, 'e' is 1110 -> 1 bit difference
      const hashC = 'ffffffffffffffff';
      const hashD = 'fffffffffffffffe';
      expect(computeHammingDistance(hashC, hashD)).toBe(1);
    });

    it('computes distance 64 for completely inverted 64-bit hashes', () => {
      const hashZero = '0000000000000000';
      const hashMax = 'ffffffffffffffff';
      expect(computeHammingDistance(hashZero, hashMax)).toBe(64);
    });

    it('computes distance across all 64 bits for alternating bit patterns', () => {
      // '5' is 0101, 'a' is 1010. Every nibble has 4 bit differences.
      // 16 nibbles * 4 bits = 64 bits difference.
      const hashAlt1 = '5555555555555555';
      const hashAlt2 = 'aaaaaaaaaaaaaaaa';
      expect(computeHammingDistance(hashAlt1, hashAlt2)).toBe(64);

      // '3' is 0011, 'c' is 1100 -> 4 bits difference per nibble
      const hashPair1 = '3333333333333333';
      const hashPair2 = 'cccccccccccccccc';
      expect(computeHammingDistance(hashPair1, hashPair2)).toBe(64);

      // Known intermediate distance:
      // Compare '0000000000000000' with '5555555555555555' (each '5' has 2 bits set -> 16 * 2 = 32 bits)
      expect(computeHammingDistance('0000000000000000', '5555555555555555')).toBe(32);
    });

    it('throws error when hash lengths do not match', () => {
      expect(() => computeHammingDistance('abcd', 'abcdef')).toThrow(/Hash length mismatch/);
    });

    it('throws error when invalid hexadecimal characters are provided', () => {
      expect(() => computeHammingDistance('000000000000000z', '0000000000000000')).toThrow(/Invalid hexadecimal/);
    });

    it('generates deterministic 16-character dHash from a 9x8 luminance matrix', () => {
      // Construct a 9x8 matrix where every row strictly descends: [9, 8, 7, 6, 5, 4, 3, 2, 1]
      // Since row[x] > row[x+1] for all 8 comparisons, every row yields 11111111 (0xff)
      const descendingMatrix = Array.from({ length: 8 }, () => [9, 8, 7, 6, 5, 4, 3, 2, 1]);
      const hashDesc = computeDHashFromLuminanceMatrix(descendingMatrix);
      expect(hashDesc).toBe('ffffffffffffffff');
      expect(hashDesc).toHaveLength(16);

      // Construct a 9x8 matrix where every row strictly ascends: [1, 2, 3, 4, 5, 6, 7, 8, 9]
      // Since row[x] < row[x+1], all bits are 0 -> 0x00
      const ascendingMatrix = Array.from({ length: 8 }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const hashAsc = computeDHashFromLuminanceMatrix(ascendingMatrix);
      expect(hashAsc).toBe('0000000000000000');
      expect(hashAsc).toHaveLength(16);
    });

    it('generates deterministic alternating dHash from custom gradient matrix', () => {
      // 8 rows: Even rows strictly ascend (0x00), odd rows strictly descend (0xff)
      const alternatingRows = Array.from({ length: 8 }, (_, rowIndex) =>
        rowIndex % 2 === 0
          ? [1, 2, 3, 4, 5, 6, 7, 8, 9] // ascending -> 00
          : [9, 8, 7, 6, 5, 4, 3, 2, 1] // descending -> ff
      );
      const hash = computeDHashFromLuminanceMatrix(alternatingRows);
      expect(hash).toBe('00ff00ff00ff00ff');
      expect(hash).toHaveLength(16);
    });

    it('validates minimum dimensions for dHash matrix', () => {
      expect(() => computeDHashFromLuminanceMatrix([[1, 2, 3]])).toThrow(/requires at least 8 rows/);
      expect(() =>
        computeDHashFromLuminanceMatrix(Array.from({ length: 8 }, () => [1, 2, 3, 4]))
      ).toThrow(/requires at least 9 columns/);
    });
  });

  // ===================================================================
  // 2. INDIVIDUAL VALIDATION RULES (RULES 1 - 4)
  // ===================================================================
  describe('Rule 1: Missing EXIF Metadata', () => {
    it('flags photos with stripped EXIF headers and missing capture timestamp', () => {
      const strippedPhoto: ImageEvidenceRecord = {
        id: 'TEST-STRIPPED-01',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'unverified_upload.png',
        fileSizeBytes: 1000000,
        mimeType: 'image/png',
        stage: 'Foundation',
        uploadTimestamp: '2026-03-01T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'sha_test_stripped_exif_unique',
        perceptualHash: '1122334455667788',
        exif: {
          hasExif: false,
          origin: 'user_declared',
          isSynthetic: true,
        },
        thumbnailUrl: '',
        demoCaption: 'Test stripped photo',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([strippedPhoto]);
      const finding = result.allFindings.find((f) => f.ruleId === 'missing_exif_metadata');

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('MEDIUM');
      expect(finding?.points).toBe(15);
      expect(finding?.title).toBe('Image metadata absent or stripped');
    });
  });

  describe('Rule 2: Invalid Coordinate Bounds', () => {
    it('flags photos with [0, 0] or non-India coordinates', () => {
      const nullIslandPhoto: ImageEvidenceRecord = {
        id: 'TEST-NULL-ISLAND',
        projectId: 'MP-MH-2026-0331',
        fileName: 'zero_coords.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Foundation',
        uploadTimestamp: '2026-03-01T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'sha_test_null_island',
        perceptualHash: '9988776655443322',
        exif: {
          hasExif: true,
          origin: 'synthetic_demo',
          captureTimestamp: '2026-03-01T09:30:00Z',
          coordinates: [0, 0], // Null Island
          isSynthetic: true,
        },
        thumbnailUrl: '',
        demoCaption: 'Test zero coords',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([nullIslandPhoto]);
      const finding = result.allFindings.find((f) => f.ruleId === 'invalid_coordinate_bounds');

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('HIGH');
      expect(finding?.points).toBe(25);
    });
  });

  describe('Rule 3: GPS Distance Mismatch', () => {
    // Sanctioned Landmark for MP-DEL-2026-0142 is [77.2, 28.7]
    it('accepts photos within 500m tolerance with zero GPS mismatch findings', () => {
      const onSitePhoto: ImageEvidenceRecord = {
        id: 'TEST-ONSITE-01',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'onsite.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Foundation',
        uploadTimestamp: '2026-03-01T10:00:00Z',
        uploaderRole: 'District Inspector',
        sha256: 'sha_test_onsite_45m',
        perceptualHash: '1234123412341234',
        exif: {
          hasExif: true,
          origin: 'synthetic_demo',
          captureTimestamp: '2026-03-01T09:30:00Z',
          coordinates: [77.2004, 28.7002], // ~45m away
          isSynthetic: true,
        },
        thumbnailUrl: '',
        demoCaption: 'On-site verification',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([onSitePhoto]);
      const gpsFindings = result.allFindings.filter((f) => f.ruleId === 'gps_distance_mismatch');
      expect(gpsFindings).toHaveLength(0);
    });

    it('flags GPS offset > 500m and <= 2,000m as HIGH severity (20 points)', () => {
      const moderateOffsetPhoto: ImageEvidenceRecord = {
        id: 'TEST-MODERATE-OFFSET',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'moderate_offset.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Superstructure',
        uploadTimestamp: '2026-03-01T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'sha_test_moderate_offset_750m',
        perceptualHash: '4321432143214321',
        exif: {
          hasExif: true,
          origin: 'synthetic_demo',
          captureTimestamp: '2026-03-01T09:30:00Z',
          coordinates: [77.2070, 28.7040], // ~800m away
          isSynthetic: true,
        },
        thumbnailUrl: '',
        demoCaption: 'Moderate offset',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([moderateOffsetPhoto]);
      const finding = result.allFindings.find((f) => f.ruleId === 'gps_distance_mismatch');

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('HIGH');
      expect(finding?.points).toBe(20);
    });

    it('flags GPS offset > 2,000m (e.g. 2.1 km drift) as CRITICAL severity (30 points)', () => {
      const severeOffsetPhoto: ImageEvidenceRecord = {
        id: 'TEST-SEVERE-OFFSET',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'severe_drift.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Roofing & Finishing',
        uploadTimestamp: '2026-03-01T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'sha_test_severe_drift_2100m',
        perceptualHash: '5678567856785678',
        exif: {
          hasExif: true,
          origin: 'synthetic_demo',
          captureTimestamp: '2026-03-01T09:30:00Z',
          coordinates: [77.2150, 28.7135], // ~2,093m (~2.1 km) away
          isSynthetic: true,
        },
        thumbnailUrl: '',
        demoCaption: 'Severe offset 2.1km',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([severeOffsetPhoto]);
      const finding = result.allFindings.find((f) => f.ruleId === 'gps_distance_mismatch');

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('CRITICAL');
      expect(finding?.points).toBe(30);
      expect(finding?.title).toContain('2.1 km from site');
    });
  });

  describe('Rule 4: Timestamp Timeline Inconsistency', () => {
    it('flags historical archive photos captured years prior to project sanction', () => {
      const historicalPhoto: ImageEvidenceRecord = {
        id: 'TEST-HISTORICAL-01',
        projectId: 'MP-UP-2026-0821', // Project FY 2025-26
        fileName: 'old_photo.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Foundation',
        uploadTimestamp: '2026-01-10T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'sha_test_historical_2021',
        perceptualHash: '8765876587658765',
        exif: {
          hasExif: true,
          origin: 'synthetic_demo',
          captureTimestamp: '2021-04-10T10:00:00Z', // 2021 vs 2025 sanction
          coordinates: [80.9502, 26.8402],
          isSynthetic: true,
        },
        thumbnailUrl: '',
        demoCaption: 'Old archive test',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([historicalPhoto]);
      const finding = result.allFindings.find((f) => f.ruleId === 'timestamp_timeline_mismatch');

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('MEDIUM');
      expect(finding?.points).toBe(20);
      expect(finding?.title).toContain('2021 vs 2025-26');
    });

    it('flags photos with future timestamps beyond reference analysis date', () => {
      const futurePhoto: ImageEvidenceRecord = {
        id: 'TEST-FUTURE-01',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'future_photo.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Foundation',
        uploadTimestamp: '2026-10-15T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'sha_test_future_timestamp',
        perceptualHash: '00ff00ff00ff00ff',
        exif: {
          hasExif: true,
          origin: 'synthetic_demo',
          captureTimestamp: '2026-10-15T10:00:00Z', // Oct 2026 is after Sep 1, 2026
          coordinates: [77.2002, 28.7001],
          isSynthetic: true,
        },
        thumbnailUrl: '',
        demoCaption: 'Future timestamp test',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([futurePhoto]);
      const finding = result.allFindings.find((f) => f.ruleId === 'timestamp_timeline_mismatch');

      expect(finding).toBeDefined();
      expect(finding?.title).toContain('Capture timestamp post-dates analysis date');
    });

    describe('calculateProjectTimelineWindow boundary tests', () => {
      it('calculates exact ISO boundaries for FY 2025-26', () => {
        const window = calculateProjectTimelineWindow('2025-26', '2026-09-01');
        // Sanction FY starts April 1, 2025
        expect(window.sanctionStart).toBe('2025-04-01T00:00:00.000Z');
        // Exactly 180 calendar days prior to April 1, 2025 is October 3, 2024
        expect(window.earliestPermissibleCapture).toBe('2024-10-03T00:00:00.000Z');
        // Latest permissible is analysis date end of day UTC
        expect(window.latestPermissibleCapture).toBe('2026-09-01T23:59:59.999Z');
      });

      it('flags photo captured 1 ms before earliest permissible capture boundary', () => {
        const window = calculateProjectTimelineWindow('2025-26', '2026-09-01');
        const beforeTime = new Date(new Date(window.earliestPermissibleCapture).getTime() - 1).toISOString();

        const photo: ImageEvidenceRecord = {
          id: 'TEST-BOUNDARY-PRE-1MS',
          projectId: 'MP-DEL-2026-0142',
          fileName: 'pre_boundary.jpg',
          fileSizeBytes: 1000000,
          mimeType: 'image/jpeg',
          stage: 'Pre-Construction',
          uploadTimestamp: '2026-01-01T10:00:00Z',
          uploaderRole: 'Contractor',
          sha256: 'demo_synthetic_sha256_pre_boundary',
          perceptualHash: '1111222233334444',
          exif: {
            hasExif: true,
            origin: 'synthetic_demo',
            captureTimestamp: beforeTime, // 1 ms before allowed boundary!
            coordinates: [77.2001, 28.7001],
            isSynthetic: true,
          },
          thumbnailUrl: '',
          demoCaption: '1 ms before boundary',
          isSynthetic: true,
        };

        const result = runImageAnomalyAnalysis([photo]);
        const finding = result.allFindings.find((f) => f.ruleId === 'timestamp_timeline_mismatch');
        expect(finding).toBeDefined();
        expect(finding?.title).toContain('Capture timestamp predates project timeline');
      });

      it('accepts photo captured exactly on the earliest permissible capture boundary', () => {
        const window = calculateProjectTimelineWindow('2025-26', '2026-09-01');

        const photo: ImageEvidenceRecord = {
          id: 'TEST-BOUNDARY-ON-EARLIEST',
          projectId: 'MP-DEL-2026-0142',
          fileName: 'on_earliest.jpg',
          fileSizeBytes: 1000000,
          mimeType: 'image/jpeg',
          stage: 'Pre-Construction',
          uploadTimestamp: '2026-01-01T10:00:00Z',
          uploaderRole: 'Contractor',
          sha256: 'demo_synthetic_sha256_on_earliest',
          perceptualHash: '1111222233334444',
          exif: {
            hasExif: true,
            origin: 'synthetic_demo',
            captureTimestamp: window.earliestPermissibleCapture, // exactly on boundary!
            coordinates: [77.2001, 28.7001],
            isSynthetic: true,
          },
          thumbnailUrl: '',
          demoCaption: 'Exactly on earliest boundary',
          isSynthetic: true,
        };

        const result = runImageAnomalyAnalysis([photo]);
        const finding = result.allFindings.find((f) => f.ruleId === 'timestamp_timeline_mismatch');
        expect(finding).toBeUndefined();
      });

      it('accepts photo captured 1 ms after earliest permissible capture boundary', () => {
        const window = calculateProjectTimelineWindow('2025-26', '2026-09-01');
        const afterTime = new Date(new Date(window.earliestPermissibleCapture).getTime() + 1).toISOString();

        const photo: ImageEvidenceRecord = {
          id: 'TEST-BOUNDARY-POST-1MS',
          projectId: 'MP-DEL-2026-0142',
          fileName: 'post_earliest.jpg',
          fileSizeBytes: 1000000,
          mimeType: 'image/jpeg',
          stage: 'Pre-Construction',
          uploadTimestamp: '2026-01-01T10:00:00Z',
          uploaderRole: 'Contractor',
          sha256: 'demo_synthetic_sha256_post_earliest',
          perceptualHash: '1111222233334444',
          exif: {
            hasExif: true,
            origin: 'synthetic_demo',
            captureTimestamp: afterTime, // 1 ms after allowed boundary!
            coordinates: [77.2001, 28.7001],
            isSynthetic: true,
          },
          thumbnailUrl: '',
          demoCaption: '1 ms after earliest boundary',
          isSynthetic: true,
        };

        const result = runImageAnomalyAnalysis([photo]);
        const finding = result.allFindings.find((f) => f.ruleId === 'timestamp_timeline_mismatch');
        expect(finding).toBeUndefined();
      });

      it('accepts photo captured exactly on the latest permissible analysis date boundary', () => {
        const window = calculateProjectTimelineWindow('2025-26', '2026-09-01');

        const photo: ImageEvidenceRecord = {
          id: 'TEST-BOUNDARY-ON-LATEST',
          projectId: 'MP-DEL-2026-0142',
          fileName: 'on_latest.jpg',
          fileSizeBytes: 1000000,
          mimeType: 'image/jpeg',
          stage: 'Completion',
          uploadTimestamp: '2026-09-01T23:59:59.999Z',
          uploaderRole: 'District Inspector',
          sha256: 'demo_synthetic_sha256_on_latest',
          perceptualHash: '1111222233334444',
          exif: {
            hasExif: true,
            origin: 'synthetic_demo',
            captureTimestamp: window.latestPermissibleCapture, // exactly on boundary!
            coordinates: [77.2001, 28.7001],
            isSynthetic: true,
          },
          thumbnailUrl: '',
          demoCaption: 'Exactly on latest boundary',
          isSynthetic: true,
        };

        const result = runImageAnomalyAnalysis([photo]);
        const finding = result.allFindings.find((f) => f.ruleId === 'timestamp_timeline_mismatch');
        expect(finding).toBeUndefined();
      });

      it('flags photo captured 1 ms after the latest permissible analysis date boundary', () => {
        const window = calculateProjectTimelineWindow('2025-26', '2026-09-01');
        const afterLatestTime = new Date(new Date(window.latestPermissibleCapture).getTime() + 1).toISOString();

        const photo: ImageEvidenceRecord = {
          id: 'TEST-BOUNDARY-POST-LATEST-1MS',
          projectId: 'MP-DEL-2026-0142',
          fileName: 'post_latest.jpg',
          fileSizeBytes: 1000000,
          mimeType: 'image/jpeg',
          stage: 'Completion',
          uploadTimestamp: '2026-09-02T00:00:00.000Z',
          uploaderRole: 'Contractor',
          sha256: 'demo_synthetic_sha256_post_latest',
          perceptualHash: '1111222233334444',
          exif: {
            hasExif: true,
            origin: 'synthetic_demo',
            captureTimestamp: afterLatestTime, // 1 ms in the future!
            coordinates: [77.2001, 28.7001],
            isSynthetic: true,
          },
          thumbnailUrl: '',
          demoCaption: '1 ms after latest boundary',
          isSynthetic: true,
        };

        const result = runImageAnomalyAnalysis([photo]);
        const finding = result.allFindings.find((f) => f.ruleId === 'timestamp_timeline_mismatch');
        expect(finding).toBeDefined();
        expect(finding?.title).toBe('Capture timestamp post-dates analysis date');
      });
    });
  });

  // ===================================================================
  // 3. DUPLICATE & REUSE RULES (RULES 5 - 7)
  // ===================================================================
  describe('Rule 5: Exact Hash Duplicate within Same Project', () => {
    it('flags multiple photos within the same project sharing identical SHA-256', () => {
      const sharedSha = 'SHARED_EXACT_SHA_SAME_PROJECT_TEST_998811';
      const photoA: ImageEvidenceRecord = {
        id: 'TEST-DUP-A',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'billing_submission_1.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Plinth Level',
        uploadTimestamp: '2026-02-01T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: sharedSha,
        perceptualHash: '1111222233334444',
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-02-01T09:00:00Z', coordinates: [77.2001, 28.7001], isSynthetic: true },
        thumbnailUrl: '',
        demoCaption: 'Duplicate submission A',
        isSynthetic: true,
      };

      const photoB: ImageEvidenceRecord = {
        ...photoA,
        id: 'TEST-DUP-B',
        fileName: 'billing_submission_2.jpg',
        stage: 'Superstructure',
        uploadTimestamp: '2026-03-01T10:00:00Z',
        demoCaption: 'Duplicate submission B',
      };

      const result = runImageAnomalyAnalysis([photoA, photoB]);
      const duplicateFindings = result.allFindings.filter((f) => f.ruleId === 'exact_hash_duplicate');

      expect(duplicateFindings.length).toBeGreaterThanOrEqual(2);
      expect(duplicateFindings[0].severity).toBe('CRITICAL');
      expect(duplicateFindings[0].points).toBe(30);
      expect(result.duplicateGroups).toHaveLength(1);
      expect(result.duplicateGroups[0].type).toBe('exact_sha256');
    });
  });

  describe('Rule 6: Perceptual Hash Similarity within Same Project', () => {
    it('flags near-duplicates (Hamming distance <= 4) with non-accusatory review terminology', () => {
      const photoA: ImageEvidenceRecord = {
        id: 'TEST-PDHASH-A',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'column_frame_wide.jpg',
        fileSizeBytes: 1500000,
        mimeType: 'image/jpeg',
        stage: 'Superstructure',
        uploadTimestamp: '2026-03-10T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'unique_sha_pdhash_a',
        perceptualHash: '12345678abcdef00',
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-03-10T09:00:00Z', coordinates: [77.2001, 28.7001], isSynthetic: true },
        thumbnailUrl: '',
        demoCaption: 'Frame wide',
        isSynthetic: true,
      };

      const photoB: ImageEvidenceRecord = {
        id: 'TEST-PDHASH-B',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'column_frame_cropped.jpg',
        fileSizeBytes: 1400000,
        mimeType: 'image/jpeg',
        stage: 'Superstructure',
        uploadTimestamp: '2026-03-10T10:05:00Z',
        uploaderRole: 'Contractor',
        sha256: 'unique_sha_pdhash_b',
        perceptualHash: '12345678abcdef07', // Differs by 3 bits from photoA
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-03-10T09:02:00Z', coordinates: [77.2001, 28.7001], isSynthetic: true },
        thumbnailUrl: '',
        demoCaption: 'Frame cropped',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([photoA, photoB]);
      const finding = result.allFindings.find((f) => f.ruleId === 'perceptual_hash_similarity');

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('HIGH');
      expect(finding?.points).toBe(25);
      expect(finding?.title).toContain('Potential near-duplicate image');
      expect(finding?.explanation).toContain('potential visual similarity requiring review');
    });

    it('does not flag images with distinct perceptual hashes (Hamming distance > 4)', () => {
      const photoA: ImageEvidenceRecord = {
        id: 'TEST-DISTINCT-A',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'distinct_scene_a.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Foundation',
        uploadTimestamp: '2026-02-01T10:00:00Z',
        uploaderRole: 'District Inspector',
        sha256: 'sha_distinct_scene_a',
        perceptualHash: '0000000000000000',
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-02-01T09:00:00Z', coordinates: [77.2001, 28.7001], isSynthetic: true },
        thumbnailUrl: '',
        demoCaption: 'Distinct A',
        isSynthetic: true,
      };

      const photoB: ImageEvidenceRecord = {
        ...photoA,
        id: 'TEST-DISTINCT-B',
        fileName: 'distinct_scene_b.jpg',
        sha256: 'sha_distinct_scene_b',
        perceptualHash: 'ffffffffffffffff', // Distance 64
      };

      const result = runImageAnomalyAnalysis([photoA, photoB]);
      const findings = result.allFindings.filter((f) => f.ruleId === 'perceptual_hash_similarity');
      expect(findings).toHaveLength(0);
    });
  });

  describe('Rule 7: Cross-Project Evidence Reuse & Visual Similarity', () => {
    it('flags exact cryptographic SHA-256 matches across projects as exact duplicate evidence requiring review (35 points, CRITICAL)', () => {
      const sharedSha = 'demo_synthetic_sha256_shared_delhi_and_bihar';
      const delhiPhoto: ImageEvidenceRecord = {
        id: 'TEST-CROSS-DELHI-EXACT',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'delhi_fire_panel.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Roofing & Finishing',
        uploadTimestamp: '2026-03-01T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: sharedSha,
        perceptualHash: 'aabbccddeeff0011',
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-03-01T09:00:00Z', coordinates: [77.2001, 28.7001], isSynthetic: true },
        thumbnailUrl: '',
        demoCaption: 'Delhi fire panel',
        isSynthetic: true,
      };

      const biharPhoto: ImageEvidenceRecord = {
        id: 'TEST-CROSS-BIHAR-EXACT',
        projectId: 'MP-BR-2026-0904', // Distinct project!
        fileName: 'bihar_fire_panel.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Roofing & Finishing',
        uploadTimestamp: '2026-03-15T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: sharedSha,
        perceptualHash: 'aabbccddeeff0011',
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-03-01T09:00:00Z', coordinates: [77.2001, 28.7001], isSynthetic: true },
        thumbnailUrl: '',
        demoCaption: 'Bihar fire panel',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([delhiPhoto, biharPhoto]);
      const crossFindings = result.allFindings.filter((f) => f.ruleId === 'cross_project_evidence_reuse');

      expect(crossFindings.length).toBeGreaterThanOrEqual(2);
      expect(crossFindings[0].severity).toBe('CRITICAL');
      expect(crossFindings[0].points).toBe(35);
      expect(crossFindings[0].title).toBe('Cross-project exact duplicate evidence requiring review');
      expect(crossFindings[0].explanation).toContain('Identical cryptographic file SHA-256');
      expect(crossFindings[0].relatedProjectIds).toContain('MP-BR-2026-0904');
    });

    it('classifies cross-project perceptual dHash similarity as potential visual similarity requiring review, NOT confirmed evidence reuse', () => {
      const delhiPhoto: ImageEvidenceRecord = {
        id: 'TEST-CROSS-DELHI-PDHASH',
        projectId: 'MP-DEL-2026-0142',
        fileName: 'delhi_clinic_facade.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Superstructure',
        uploadTimestamp: '2026-03-01T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'demo_synthetic_sha256_unique_facade_delhi',
        perceptualHash: '12345678abcdef00',
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-03-01T09:00:00Z', coordinates: [77.2001, 28.7001], isSynthetic: true },
        thumbnailUrl: '',
        demoCaption: 'Delhi facade',
        isSynthetic: true,
      };

      const biharPhoto: ImageEvidenceRecord = {
        id: 'TEST-CROSS-BIHAR-PDHASH',
        projectId: 'MP-BR-2026-0904',
        fileName: 'bihar_bhawan_facade.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Superstructure',
        uploadTimestamp: '2026-03-15T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'demo_synthetic_sha256_unique_facade_bihar', // Distinct SHA-256
        perceptualHash: '12345678abcdef03', // Distance = 2 bits
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-03-15T09:00:00Z', coordinates: [85.1401, 25.5901], isSynthetic: true },
        thumbnailUrl: '',
        demoCaption: 'Bihar facade',
        isSynthetic: true,
      };

      const result = runImageAnomalyAnalysis([delhiPhoto, biharPhoto]);
      const pHashFinding = result.allFindings.find(
        (f) => f.ruleId === 'perceptual_hash_similarity' && f.projectId === 'MP-DEL-2026-0142'
      );

      expect(pHashFinding).toBeDefined();
      expect(pHashFinding?.title).toContain('Potential cross-project visual similarity requiring review');
      expect(pHashFinding?.explanation).toContain('Perceptual gradient similarity alone does not prove evidence reuse');
      expect(pHashFinding?.severity).toBe('HIGH');
      expect(pHashFinding?.points).toBe(25);
    });
  });

  // ===================================================================
  // 4. MULTI-SOURCE RULE (RULE 8)
  // ===================================================================
  describe('Rule 8: Multi-Source Completion Conflict', () => {
    it('flags records with explicit completion claim when Layer 4 telemetry is idle or < 40% progress', () => {
      const claimPhoto: ImageEvidenceRecord = {
        id: 'TEST-CLAIM-01',
        projectId: 'MP-TG-2026-0642',
        fileName: 'claimed_complete.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Completion',
        uploadTimestamp: '2026-05-10T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'sha_test_claim_complete_01',
        perceptualHash: '1111222233334444',
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-05-10T09:00:00Z', coordinates: [78.4902, 17.3802], isSynthetic: true },
        // Explicit declared milestone claim:
        milestoneClaim: {
          isDeclaredMilestoneClaim: true,
          claimedStage: 'Completion',
          claimedCompletionPercent: 100,
          inspectionCertificateRef: 'COMP-CERT-9988',
        },
        thumbnailUrl: '',
        demoCaption: 'Declared complete',
        isSynthetic: true,
      };

      const geoContext = {
        'MP-TG-2026-0642': {
          projectId: 'MP-TG-2026-0642',
          demoPhysicalProgressPercent: 20, // Only 20% progress
          demoAssetStatus: 'Idle',
          demoIdleMonths: 14,
        },
      };

      const result = runImageAnomalyAnalysis([claimPhoto], { geospatialContext: geoContext });
      const finding = result.allFindings.find((f) => f.ruleId === 'multisource_geospatial_conflict');

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('HIGH');
      expect(finding?.points).toBe(25);
      expect(finding?.title).toContain('Multi-source conflict');
    });

    it('does NOT apply completion conflict rule when submission lacks an explicit milestone claim', () => {
      const photoWithoutClaim: ImageEvidenceRecord = {
        id: 'TEST-NOCLAIM-01',
        projectId: 'MP-TG-2026-0642',
        fileName: 'photo_without_claim.jpg',
        fileSizeBytes: 1000000,
        mimeType: 'image/jpeg',
        stage: 'Completion', // stage label alone is NOT an explicit claim
        uploadTimestamp: '2026-05-10T10:00:00Z',
        uploaderRole: 'Contractor',
        sha256: 'sha_test_no_claim',
        perceptualHash: '1111222233334444',
        exif: { hasExif: true, origin: 'synthetic_demo', captureTimestamp: '2026-05-10T09:00:00Z', coordinates: [78.4902, 17.3802], isSynthetic: true },
        // milestoneClaim is intentionally undefined
        thumbnailUrl: '',
        demoCaption: 'No explicit claim',
        isSynthetic: true,
      };

      const geoContext = {
        'MP-TG-2026-0642': {
          projectId: 'MP-TG-2026-0642',
          demoPhysicalProgressPercent: 20,
          demoAssetStatus: 'Idle',
        },
      };

      const result = runImageAnomalyAnalysis([photoWithoutClaim], { geospatialContext: geoContext });
      const finding = result.allFindings.find((f) => f.ruleId === 'multisource_geospatial_conflict');

      // Crucial requirement: NEVER infer completion from image pixels or stage label alone!
      expect(finding).toBeUndefined();
    });
  });

  // ===================================================================
  // 5. DEMO DATASET & PORTFOLIO INTEGRATION
  // ===================================================================
  describe('Synthetic Demo Dataset Portfolio Analysis', () => {
    it('correctly validates the flagship project MP-DEL-2026-0142', () => {
      const delhiImages = getImagesForProject('MP-DEL-2026-0142');
      expect(delhiImages).toHaveLength(14);

      const allDemoImages = getAllDemoImages();
      const result = runImageAnomalyAnalysis(allDemoImages);
      const profile = result.projectProfiles['MP-DEL-2026-0142'];

      expect(profile).toBeDefined();
      expect(profile.totalImages).toBe(14);
      // Exactly 3 photos pass spatial validation
      expect(profile.verifiedImagesCount).toBe(3);
      expect(profile.anomalyImagesCount).toBe(11);
      expect(profile.anomalyScore).toBeGreaterThanOrEqual(85);
      expect(profile.severity).toBe('CRITICAL');

      // Has 2.1 km GPS drift finding
      const gps21km = profile.findings.find((f) => f.ruleId === 'gps_distance_mismatch' && f.points === 30);
      expect(gps21km).toBeDefined();

      // Has cross-project reuse finding (with MP-BR-2026-0904)
      const crossProject = profile.findings.find((f) => f.ruleId === 'cross_project_evidence_reuse');
      expect(crossProject).toBeDefined();

      // Has perceptual near-duplicate finding
      const pHashDup = profile.findings.find((f) => f.ruleId === 'perceptual_hash_similarity');
      expect(pHashDup).toBeDefined();

      // Has stripped EXIF finding
      const strippedExif = profile.findings.find((f) => f.ruleId === 'missing_exif_metadata');
      expect(strippedExif).toBeDefined();
    });

    it('validates clean baseline project MP-TN-2026-1120 with zero findings and score 0', () => {
      const velloreImages = getImagesForProject('MP-TN-2026-1120');
      expect(velloreImages).toHaveLength(3);

      const result = runImageAnomalyAnalysis(velloreImages);
      const profile = result.projectProfiles['MP-TN-2026-1120'];

      expect(profile).toBeDefined();
      expect(profile.totalImages).toBe(3);
      expect(profile.verifiedImagesCount).toBe(3);
      expect(profile.anomalyImagesCount).toBe(0);
      expect(profile.findings).toHaveLength(0);
      expect(profile.anomalyScore).toBe(0);
      expect(profile.severity).toBe('LOW');
    });

    it('gracefully handles empty image collections', () => {
      const result = runImageAnomalyAnalysis([]);
      expect(result.totalImagesAnalyzed).toBe(0);
      expect(result.totalFindingsCount).toBe(0);
      expect(result.maxAnomalyScore).toBe(0);
      expect(result.allFindings).toHaveLength(0);
      expect(result.duplicateGroups).toHaveLength(0);
    });

    it('enforces non-accusatory terminology across all findings in the dataset', () => {
      const allDemoImages = getAllDemoImages();
      const geoContext = {
        'MP-TG-2026-0642': {
          projectId: 'MP-TG-2026-0642',
          demoPhysicalProgressPercent: 20,
          demoAssetStatus: 'Idle',
          demoIdleMonths: 14,
        },
      };

      const result = runImageAnomalyAnalysis(allDemoImages, { geospatialContext: geoContext });

      const prohibitedWords = ['fraud', 'forgery', 'crime', 'criminal', 'fake', 'guilty', 'theft', 'scam'];

      for (const finding of result.allFindings) {
        const textToAudit = `${finding.title} ${finding.explanation} ${finding.recommendedAction}`.toLowerCase();
        for (const word of prohibitedWords) {
          expect(textToAudit).not.toContain(word);
        }
      }
    });

    it('clamps all anomaly scores strictly to [0, 100]', () => {
      const allDemoImages = getAllDemoImages();
      const result = runImageAnomalyAnalysis(allDemoImages);

      for (const profile of Object.values(result.projectProfiles)) {
        expect(profile.anomalyScore).toBeGreaterThanOrEqual(0);
        expect(profile.anomalyScore).toBeLessThanOrEqual(100);
      }
      expect(result.maxAnomalyScore).toBeGreaterThanOrEqual(0);
      expect(result.maxAnomalyScore).toBeLessThanOrEqual(100);
    });

    it('verifies dataset reconciliation: unique IDs, synthetic sha256 prefix, and explicit demo labels', () => {
      const allImages = getAllDemoImages();
      // Exactly 24 records across all projects
      expect(allImages).toHaveLength(24);

      const idSet = new Set<string>();
      for (const img of allImages) {
        // Confirm unique ID
        expect(idSet.has(img.id)).toBe(false);
        idSet.add(img.id);

        // Confirm synthetic sha256 is explicitly demo placeholder
        expect(img.sha256).toMatch(/^demo_synthetic_sha256_/);

        // Confirm explicit demo metadata labels
        expect(img.isSynthetic).toBe(true);
        expect(img.exif.isSynthetic).toBe(true);

        // Confirm preview is lightweight synthetic SVG data URI (not actual image thumbnail)
        expect(img.thumbnailUrl).toMatch(/^data:image\/svg\+xml/);
      }

      // Exact count verification per project
      expect(getImagesForProject('MP-DEL-2026-0142')).toHaveLength(14);
      expect(getImagesForProject('MP-BR-2026-0904')).toHaveLength(2);
      expect(getImagesForProject('MP-TG-2026-0642')).toHaveLength(1);
      expect(getImagesForProject('MP-MH-2026-0331')).toHaveLength(2);
      expect(getImagesForProject('MP-UP-2026-0821')).toHaveLength(1);
      expect(getImagesForProject('MP-TN-2026-1120')).toHaveLength(3);
      expect(getImagesForProject('MP-DL-2026-0090')).toHaveLength(1);

      // Confirm Delhi duplicate record IMG-DEL-0142-13 is counted inside the 14-photo set
      const delhiIds = getImagesForProject('MP-DEL-2026-0142').map((i) => i.id);
      expect(delhiIds).toContain('IMG-DEL-0142-13');
    });
  });
});
