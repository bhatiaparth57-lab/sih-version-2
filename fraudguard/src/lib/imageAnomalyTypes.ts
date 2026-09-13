/**
 * =====================================================================
 * FRAUDGUARD — Layer 1: Image, GPS & Multi-Source Anomaly Detection Types
 *
 * Strict TypeScript models for photographic evidence inspection, EXIF tags,
 * spatial validation, cryptographic hashes, perceptual similarity, and
 * explainable anomaly findings.
 * =====================================================================
 */

import type { Risk } from '@/lib/data';

export type MetadataOrigin =
  | 'extracted_exif'     // Directly extracted from file EXIF header
  | 'synthetic_demo'     // Fabricated for reproducible demo/testing
  | 'user_declared';     // Declared by the submitter via web form

export type ImageStage =
  | 'Pre-Construction'
  | 'Foundation'
  | 'Plinth Level'
  | 'Superstructure'
  | 'Roofing & Finishing'
  | 'Completion';

export interface ImageExifMetadata {
  /** Whether the image contained valid EXIF metadata headers */
  readonly hasExif: boolean;
  /** Provenance of the metadata */
  readonly origin: MetadataOrigin;
  /** ISO 8601 capture timestamp from EXIF DateTimeOriginal, e.g. '2026-03-12T14:22:10' */
  readonly captureTimestamp?: string;
  /** Camera manufacturer from EXIF Make */
  readonly cameraMake?: string;
  /** Camera model from EXIF Model */
  readonly cameraModel?: string;
  /** Operating system or editing software from EXIF Software */
  readonly software?: string;
  /** GPS coordinates [longitude, latitude] extracted from EXIF GPS tags */
  readonly coordinates?: [number, number];
  /** Altitude in meters above sea level from EXIF GPSAltitude */
  readonly altitudeMeters?: number;
  /** Estimated GPS accuracy / dilution of precision in meters */
  readonly gpsAccuracyMeters?: number;
  /** Visibly indicates synthetic demo nature */
  readonly isSynthetic: true;
}

/**
 * Explicit milestone or completion claim submitted with the evidence record.
 * Required for multi-source conflict verification. Completion is NEVER
 * inferred from image pixels alone.
 */
export interface DeclaredMilestoneClaim {
  /** Whether the submission explicitly declares a project milestone */
  readonly isDeclaredMilestoneClaim: boolean;
  /** Declared construction milestone stage */
  readonly claimedStage: ImageStage;
  /** Declared physical completion percentage (0 - 100) */
  readonly claimedCompletionPercent: number;
  /** Reference inspection note or certificate number */
  readonly inspectionCertificateRef?: string;
}

export interface ImageEvidenceRecord {
  readonly id: string;
  readonly projectId: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly stage: ImageStage;
  readonly uploadTimestamp: string;
  readonly uploaderRole: 'Contractor' | 'District Inspector' | 'Citizen Auditor';
  /**
   * Synthetic SHA-256 cryptographic fingerprint placeholder (strictly demo-only;
   * not computed from real on-disk binary images).
   */
  readonly sha256: string;
  /** 64-bit Difference Hash (dHash) hex string (16 characters) */
  readonly perceptualHash: string;
  /** EXIF metadata breakdown with clear provenance */
  readonly exif: ImageExifMetadata;
  /** Explicit declared milestone claim, if any */
  readonly milestoneClaim?: DeclaredMilestoneClaim;
  /** Lightweight synthetic SVG preview (demonstration placeholder, not actual image thumbnail) */
  readonly thumbnailUrl: string;
  /** Descriptive caption */
  readonly demoCaption: string;
  /** Visibly marks this record as synthetic demo data */
  readonly isSynthetic: true;
}

export type ImageAnomalyRuleId =
  | 'missing_exif_metadata'
  | 'invalid_coordinate_bounds'
  | 'gps_distance_mismatch'
  | 'timestamp_timeline_mismatch'
  | 'exact_hash_duplicate'
  | 'perceptual_hash_similarity'
  | 'cross_project_evidence_reuse'
  | 'multisource_geospatial_conflict';

export interface ImageAnomalyFinding {
  readonly id: string;
  readonly ruleId: ImageAnomalyRuleId;
  readonly imageId: string;
  readonly projectId: string;
  readonly severity: Risk;
  readonly points: number;
  readonly title: string;
  readonly explanation: string;
  readonly evidenceDetail: string;
  readonly recommendedAction: string;
  readonly relatedImageIds?: string[];
  readonly relatedProjectIds?: string[];
}

export interface ImageScoreBreakdownItem {
  readonly ruleId: ImageAnomalyRuleId;
  readonly imageId: string;
  readonly points: number;
  readonly reason: string;
}

export interface DuplicateGroup {
  readonly hash: string;
  readonly type: 'exact_sha256' | 'perceptual_dhash';
  /** Hamming distance between hashes (0 for exact match) */
  readonly hammingDistance: number;
  readonly imageIds: string[];
  readonly projectIds: string[];
  readonly note: string;
}

export interface ProjectImageProfile {
  readonly projectId: string;
  readonly totalImages: number;
  readonly verifiedImagesCount: number;
  readonly anomalyImagesCount: number;
  /** Clamped to [0, 100] */
  readonly anomalyScore: number;
  readonly severity: Risk;
  readonly findings: ImageAnomalyFinding[];
  readonly scoreBreakdown: ImageScoreBreakdownItem[];
  readonly images: ImageEvidenceRecord[];
}

export interface ImageVerificationResult {
  readonly engine: 'rule-based-image-validator';
  readonly analysisReferenceDate: string;
  readonly totalImagesAnalyzed: number;
  readonly totalFindingsCount: number;
  readonly maxAnomalyScore: number;
  readonly projectProfiles: Record<string, ProjectImageProfile>;
  readonly allFindings: ImageAnomalyFinding[];
  readonly duplicateGroups: DuplicateGroup[];
}
