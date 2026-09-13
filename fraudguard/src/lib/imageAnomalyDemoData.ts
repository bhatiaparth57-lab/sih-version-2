/**
 * =====================================================================
 * FRAUDGUARD — Layer 1: Image, GPS & Multi-Source Anomaly Demo Data
 * ⚠️ SYNTHETIC DEMO ENVIRONMENT ONLY
 *
 * All photos, EXIF metadata, camera serials, timestamps, coordinates,
 * SHA-256 fingerprints, and perceptual dHashes in this file are completely
 * synthetic and fabricated for demonstrating rule-based evidence validation.
 * They do NOT represent real government inspections or real citizens.
 *
 * ⚠️ EXPLICIT NOTICE ON SYNTHETIC SHA-256 AND PERCEPTUAL HASH VALUES:
 * All sha256 values in this dataset are SYNTHETIC PLACEHOLDERS explicitly
 * prefixed with 'demo_synthetic_sha256_'. They are NOT cryptographic hashes
 * calculated from real binary image files on disk. They exist strictly to test
 * deterministic exact-duplicate and cross-project evidence reuse rules.
 *
 * Similarly, perceptual dHash values are 16-character hexadecimal strings
 * constructed to test Hamming distance similarity thresholds (d <= 4)
 * without requiring bundled binary image files.
 * =====================================================================
 */

import type { ImageEvidenceRecord } from './imageAnomalyTypes';

/**
 * Creates an inline SVG data URI representing a synthetic inspection preview.
 * ⚠️ Note: These are synthetic SVG previews, not actual image thumbnails.
 */
function createSyntheticPreview(title: string, subtitle: string, accentColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
    <rect width="320" height="200" fill="#0f172a" rx="8"/>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1"/>
    </pattern>
    <rect width="320" height="200" fill="url(#grid)" rx="8"/>
    <rect x="20" y="20" width="280" height="120" rx="6" fill="#1e293b" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="4,4"/>
    <circle cx="160" cy="80" r="28" fill="${accentColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="2"/>
    <path d="M 152 72 L 168 72 M 160 64 L 160 80 M 148 92 L 172 92" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
    <text x="160" y="162" fill="#f8fafc" font-size="12" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${title}</text>
    <text x="160" y="180" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif" text-anchor="middle">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Alias for backward-compatible call sites
const createSyntheticThumbnail = createSyntheticPreview;

// ---------------------------------------------------------------------
// SYNTHETIC EVIDENCE DATASET (Curated for 13 Projects)
// ---------------------------------------------------------------------

export const DEMO_IMAGE_DATASET: ImageEvidenceRecord[] = [
  // ===================================================================
  // 1. FLAGSHIP PROJECT: MP-DEL-2026-0142 (North Delhi Clinic)
  // Sanctioned Landmark: [77.2000, 28.7000]
  // 14 total photos:
  // - 3 passing spatial validation (< 150m, valid EXIF, consistent dates)
  // - 8 photos with 2.1 km GPS drift [77.2200, 28.7180]
  // - 1 photo with stripped EXIF
  // - 1 photo with exact duplicate SHA-256 (reused in MP-BR-2026-0904)
  // - 1 photo with perceptual near-duplicate dHash (Hamming distance 3)
  // ===================================================================

  // 3 Passing Photos
  {
    id: 'IMG-DEL-0142-01',
    projectId: 'MP-DEL-2026-0142',
    fileName: 'foundation_trench_north.jpg',
    fileSizeBytes: 2451000,
    mimeType: 'image/jpeg',
    stage: 'Foundation',
    uploadTimestamp: '2026-02-10T11:20:00Z',
    uploaderRole: 'District Inspector',
    sha256: 'demo_synthetic_sha256_delhi_0142_01_foundation',
    perceptualHash: 'e1a4b8c2d9e0f124',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-02-10T10:45:12Z',
      cameraMake: 'Samsung',
      cameraModel: 'Galaxy S22',
      coordinates: [77.2004, 28.7002], // ~45m from site
      altitudeMeters: 215,
      gpsAccuracyMeters: 4.2,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Foundation Trench North', 'Verified on-site (45m)', '#48d29b'),
    demoCaption: 'Excavation of northern foundation footing in presence of AE-II.',
    isSynthetic: true,
  },
  {
    id: 'IMG-DEL-0142-02',
    projectId: 'MP-DEL-2026-0142',
    fileName: 'plinth_reinforcement_east.jpg',
    fileSizeBytes: 3104000,
    mimeType: 'image/jpeg',
    stage: 'Plinth Level',
    uploadTimestamp: '2026-03-01T15:10:00Z',
    uploaderRole: 'District Inspector',
    sha256: 'demo_synthetic_sha256_delhi_0142_02_plinth',
    perceptualHash: 'c4e8f2a1b9d03478',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-03-01T14:30:22Z',
      cameraMake: 'Samsung',
      cameraModel: 'Galaxy S22',
      coordinates: [77.2006, 28.7005], // ~75m from site
      altitudeMeters: 216,
      gpsAccuracyMeters: 3.8,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Plinth Beam East', 'Verified on-site (75m)', '#48d29b'),
    demoCaption: 'Plinth beam steel reinforcement inspection before concreting.',
    isSynthetic: true,
  },
  {
    id: 'IMG-DEL-0142-03',
    projectId: 'MP-DEL-2026-0142',
    fileName: 'column_casting_block_a.jpg',
    fileSizeBytes: 2890000,
    mimeType: 'image/jpeg',
    stage: 'Superstructure',
    uploadTimestamp: '2026-03-15T09:40:00Z',
    uploaderRole: 'District Inspector',
    sha256: 'demo_synthetic_sha256_delhi_0142_03_superstructure',
    perceptualHash: '98f1a2b3c4d5e670',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-03-15T09:05:44Z',
      cameraMake: 'Samsung',
      cameraModel: 'Galaxy S22',
      coordinates: [77.2008, 28.7003], // ~80m from site
      altitudeMeters: 217,
      gpsAccuracyMeters: 4.0,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Column Casting Block A', 'Verified on-site (80m)', '#48d29b'),
    demoCaption: 'RCC column formwork and casting quality verification.',
    isSynthetic: true,
  },

  // 8 Photos with 2.1 km GPS Drift: coordinates [77.2150, 28.7135] (~2.1 km away)
  ...[
    { idx: '04', name: 'masonry_wall_elevation_1.jpg', stage: 'Superstructure' as const, time: '2026-03-18T10:00:00Z' },
    { idx: '05', name: 'masonry_wall_elevation_2.jpg', stage: 'Superstructure' as const, time: '2026-03-18T10:05:00Z' },
    { idx: '06', name: 'roof_slab_shuttering_1.jpg', stage: 'Roofing & Finishing' as const, time: '2026-03-22T14:15:00Z' },
    { idx: '07', name: 'roof_slab_shuttering_2.jpg', stage: 'Roofing & Finishing' as const, time: '2026-03-22T14:20:00Z' },
    { idx: '08', name: 'plastering_hall_interior.jpg', stage: 'Roofing & Finishing' as const, time: '2026-03-25T11:30:00Z' },
    { idx: '09', name: 'flooring_screed_ground.jpg', stage: 'Roofing & Finishing' as const, time: '2026-03-28T16:00:00Z' },
    { idx: '10', name: 'electrical_conduit_rough.jpg', stage: 'Roofing & Finishing' as const, time: '2026-04-02T13:45:00Z' },
    { idx: '11', name: 'plumbing_riser_ducts.jpg', stage: 'Roofing & Finishing' as const, time: '2026-04-05T15:20:00Z' },
  ].map((item) => ({
    id: `IMG-DEL-0142-${item.idx}`,
    projectId: 'MP-DEL-2026-0142',
    fileName: item.name,
    fileSizeBytes: 3200000 + parseInt(item.idx, 10) * 45000,
    mimeType: 'image/jpeg' as const,
    stage: item.stage,
    uploadTimestamp: item.time,
    uploaderRole: 'Contractor' as const,
    sha256: `demo_synthetic_sha256_delhi_0142_${item.idx}_drift_workshop`,
    perceptualHash: `a0f${item.idx}b7c9d1e2f34`,
    exif: {
      hasExif: true,
      origin: 'synthetic_demo' as const,
      captureTimestamp: item.time,
      cameraMake: 'Redmi',
      cameraModel: 'Note 12 Pro',
      coordinates: [77.2150, 28.7135] as [number, number], // ~2,093m (~2.1 km) from sanctioned site
      altitudeMeters: 220,
      gpsAccuracyMeters: 5.0,
      isSynthetic: true as const,
    },
    thumbnailUrl: createSyntheticThumbnail(item.name.replace('.jpg', ''), 'GPS Drift: 2.1 km offset', '#ff5860'),
    demoCaption: `Contractor billing claim photo geotagged at private workshop 2.1 km away.`,
    isSynthetic: true as const,
  })),

  // 1 Photo with Stripped EXIF Metadata
  {
    id: 'IMG-DEL-0142-12',
    projectId: 'MP-DEL-2026-0142',
    fileName: 'generator_dg_set_delivery.png',
    fileSizeBytes: 1845000,
    mimeType: 'image/png',
    stage: 'Roofing & Finishing',
    uploadTimestamp: '2026-04-08T10:00:00Z',
    uploaderRole: 'Contractor',
    sha256: 'demo_synthetic_sha256_delhi_0142_12_stripped_exif',
    perceptualHash: '55aa33cc77bb11dd',
    exif: {
      hasExif: false,
      origin: 'user_declared',
      // Metadata stripped / not present
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('DG Set Delivery', 'EXIF Metadata Stripped', '#f0b64b'),
    demoCaption: 'Delivery slip photo uploaded without EXIF header or geotag.',
    isSynthetic: true,
  },

  // 1 Photo: Cross-Project Duplicate Reused in MP-BR-2026-0904
  {
    id: 'IMG-DEL-0142-13',
    projectId: 'MP-DEL-2026-0142',
    fileName: 'fire_safety_panel_installation.jpg',
    fileSizeBytes: 2750000,
    mimeType: 'image/jpeg',
    stage: 'Roofing & Finishing',
    uploadTimestamp: '2026-04-10T14:30:00Z',
    uploaderRole: 'Contractor',
    sha256: 'demo_synthetic_sha256_cross_project_duplicate_delhi_bihar_fire_panel',
    perceptualHash: '12345678abcdef00',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-04-10T12:00:00Z',
      cameraMake: 'Apple',
      cameraModel: 'iPhone 13',
      coordinates: [77.2002, 28.7001],
      altitudeMeters: 215,
      gpsAccuracyMeters: 4.5,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Fire Safety Panel', 'Shared photo fingerprint', '#ff5860'),
    demoCaption: 'Electrical control panel photo attached to North Delhi health centre claim.',
    isSynthetic: true,
  },

  // 1 Photo: Near-Duplicate (Perceptual dHash Hamming Distance = 3)
  {
    id: 'IMG-DEL-0142-14',
    projectId: 'MP-DEL-2026-0142',
    fileName: 'generator_foundation_pad.jpg',
    fileSizeBytes: 2600000,
    mimeType: 'image/jpeg',
    stage: 'Plinth Level',
    uploadTimestamp: '2026-04-12T16:00:00Z',
    uploaderRole: 'Contractor',
    sha256: 'demo_synthetic_sha256_delhi_0142_14_generator_pad_cropped',
    perceptualHash: '12345678abcdef07', // Differs by 3 bits from IMG-DEL-0142-13
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-04-10T12:02:00Z',
      cameraMake: 'Apple',
      cameraModel: 'iPhone 13',
      coordinates: [77.2003, 28.7002],
      altitudeMeters: 215,
      gpsAccuracyMeters: 4.5,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Generator Foundation', 'Perceptual similarity (d=3)', '#ff8a3d'),
    demoCaption: 'Slightly cropped perspective of equipment pad submitted for separate milestone claim.',
    isSynthetic: true,
  },

  // ===================================================================
  // 2. MP-BR-2026-0904 (Patna Sahib Panchayat Bhawan Phase 2)
  // Sanctioned Landmark: [85.1400, 25.5900]
  // Vendor: ABC Infra Pvt Ltd (same vendor as MP-DEL-2026-0142)
  // Re-uses exact SHA-256 duplicate image from MP-DEL-2026-0142!
  // ===================================================================
  {
    id: 'IMG-BR-0904-01',
    projectId: 'MP-BR-2026-0904',
    fileName: 'bhawan_fire_control_system.jpg',
    fileSizeBytes: 2750000,
    mimeType: 'image/jpeg',
    stage: 'Roofing & Finishing',
    uploadTimestamp: '2026-04-15T11:00:00Z',
    uploaderRole: 'Contractor',
    // EXACT SAME SHA-256 AS IMG-DEL-0142-13
    sha256: 'demo_synthetic_sha256_cross_project_duplicate_delhi_bihar_fire_panel',
    perceptualHash: '12345678abcdef00',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-04-10T12:00:00Z', // identical timestamp to Delhi photo
      cameraMake: 'Apple',
      cameraModel: 'iPhone 13',
      coordinates: [77.2002, 28.7001], // Geotagged in Delhi, but submitted for Patna!
      altitudeMeters: 215,
      gpsAccuracyMeters: 4.5,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Panchayat Fire Control', 'Reused from MP-DEL-2026-0142', '#ff5860'),
    demoCaption: 'Identical photo file submitted for Bihar Panchayat Bhawan contract billing.',
    isSynthetic: true,
  },
  {
    id: 'IMG-BR-0904-02',
    projectId: 'MP-BR-2026-0904',
    fileName: 'patna_ground_plinth.jpg',
    fileSizeBytes: 2900000,
    mimeType: 'image/jpeg',
    stage: 'Plinth Level',
    uploadTimestamp: '2026-02-20T10:00:00Z',
    uploaderRole: 'District Inspector',
    sha256: 'demo_synthetic_sha256_bihar_0904_02_patna_plinth',
    perceptualHash: '9900aabbccddeeff',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-02-20T09:30:00Z',
      cameraMake: 'Samsung',
      cameraModel: 'Galaxy A54',
      coordinates: [85.1402, 25.5903],
      altitudeMeters: 53,
      gpsAccuracyMeters: 5.0,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Patna Ground Plinth', 'Verified on-site (40m)', '#48d29b'),
    demoCaption: 'Ground level plinth beam verification in Patna.',
    isSynthetic: true,
  },

  // ===================================================================
  // 3. MP-TG-2026-0642 (Hyderabad Community Health Centre)
  // Sanctioned Landmark: [78.4900, 17.3800]
  // In Layer 4, this project is Idle past 14 months with only 20% progress.
  // Contains an explicit declared milestone claim of 100% Completion!
  // Triggers Rule 8: Multi-Source Geospatial Conflict.
  // ===================================================================
  {
    id: 'IMG-TG-0642-01',
    projectId: 'MP-TG-2026-0642',
    fileName: 'health_centre_completed_ward.jpg',
    fileSizeBytes: 3400000,
    mimeType: 'image/jpeg',
    stage: 'Completion',
    uploadTimestamp: '2026-05-10T14:00:00Z',
    uploaderRole: 'Contractor',
    sha256: 'demo_synthetic_sha256_telangana_0642_01_claimed_completion',
    perceptualHash: 'feedfacecafebeef',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-05-10T13:15:00Z',
      cameraMake: 'OnePlus',
      cameraModel: '11R',
      coordinates: [78.4905, 17.3802], // ~60m from site
      altitudeMeters: 505,
      gpsAccuracyMeters: 4.8,
      isSynthetic: true,
    },
    // Explicit Declared Milestone Claim
    milestoneClaim: {
      isDeclaredMilestoneClaim: true,
      claimedStage: 'Completion',
      claimedCompletionPercent: 100,
      inspectionCertificateRef: 'COMP-CERT-TG-2026-88',
    },
    thumbnailUrl: createSyntheticThumbnail('Completed Inpatient Ward', 'Declared 100% Complete vs Idle Site', '#ff8a3d'),
    demoCaption: 'Contractor claims 100% completion while Layer 4 satellite logs dormant site.',
    isSynthetic: true,
  },

  // ===================================================================
  // 4. MP-MH-2026-0331 (Nagpur Anganwadi Centre Block)
  // Sanctioned Landmark: [79.0800, 21.1500]
  // Photo with Invalid Coordinates: [0, 0] (Null Island)
  // Photo with GPS Drift: 1.4 km
  // ===================================================================
  {
    id: 'IMG-MH-0331-01',
    projectId: 'MP-MH-2026-0331',
    fileName: 'classroom_roofing_sheet.jpg',
    fileSizeBytes: 2150000,
    mimeType: 'image/jpeg',
    stage: 'Roofing & Finishing',
    uploadTimestamp: '2026-03-20T11:00:00Z',
    uploaderRole: 'Contractor',
    sha256: 'demo_synthetic_sha256_maharashtra_0331_01_null_island',
    perceptualHash: '0011223344556677',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-03-20T10:15:00Z',
      cameraMake: 'Vivo',
      cameraModel: 'V27',
      coordinates: [0, 0], // Null Island: Invalid bounds!
      altitudeMeters: 0,
      gpsAccuracyMeters: 999,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Roofing Sheet', 'Invalid GPS [0, 0]', '#ff8a3d'),
    demoCaption: 'Roofing photo with corrupt/zeroed GPS coordinates.',
    isSynthetic: true,
  },
  {
    id: 'IMG-MH-0331-02',
    projectId: 'MP-MH-2026-0331',
    fileName: 'classroom_verandah_offset.jpg',
    fileSizeBytes: 2800000,
    mimeType: 'image/jpeg',
    stage: 'Superstructure',
    uploadTimestamp: '2026-03-22T15:00:00Z',
    uploaderRole: 'Contractor',
    sha256: 'demo_synthetic_sha256_maharashtra_0331_02_verandah_drift',
    perceptualHash: '8877665544332211',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-03-22T14:10:00Z',
      cameraMake: 'Vivo',
      cameraModel: 'V27',
      coordinates: [79.0920, 21.1600], // ~1,400m away
      altitudeMeters: 310,
      gpsAccuracyMeters: 6.0,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Classroom Verandah', 'GPS Offset: 1.4 km', '#ff8a3d'),
    demoCaption: 'Verandah photo geotagged 1.4 km from sanctioned Anganwadi site.',
    isSynthetic: true,
  },

  // ===================================================================
  // 5. MP-UP-2026-0821 (Lucknow Rural Road Upgrade)
  // Sanctioned Landmark: [80.9500, 26.8400]
  // Sanction Year: 2025-26
  // Photo has capture timestamp from 2021 (4 years prior to sanction)!
  // Triggers Rule 4: Timestamp Timeline Inconsistency.
  // ===================================================================
  {
    id: 'IMG-UP-0821-01',
    projectId: 'MP-UP-2026-0821',
    fileName: 'bitumen_layer_old_archive.jpg',
    fileSizeBytes: 3050000,
    mimeType: 'image/jpeg',
    stage: 'Superstructure',
    uploadTimestamp: '2026-01-10T12:00:00Z',
    uploaderRole: 'Contractor',
    sha256: 'demo_synthetic_sha256_up_0821_01_bitumen_2021_archive',
    perceptualHash: 'aa55aa55aa55aa55',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      // Capture timestamp from April 2021 (4 years before 2025-26 sanction!)
      captureTimestamp: '2021-04-12T10:30:00Z',
      cameraMake: 'Nikon',
      cameraModel: 'D3500',
      coordinates: [80.9504, 26.8403],
      altitudeMeters: 123,
      gpsAccuracyMeters: 4.0,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Bitumen Layer', 'Timeline Mismatch: 2021 photo', '#f0b64b'),
    demoCaption: 'Historical 2021 road photo submitted for 2025-26 sanctioned upgrade contract.',
    isSynthetic: true,
  },

  // ===================================================================
  // 6. MP-TN-2026-1120 (Vellore Panchayat Road Drainage)
  // Sanctioned Landmark: [79.1300, 12.9200]
  // Clean, verified baseline! 3 photos, valid EXIF, accurate coordinates (< 80m).
  // Yields 0 findings, score 0, LOW severity.
  // ===================================================================
  {
    id: 'IMG-TN-1120-01',
    projectId: 'MP-TN-2026-1120',
    fileName: 'drainage_culvert_inlet.jpg',
    fileSizeBytes: 2400000,
    mimeType: 'image/jpeg',
    stage: 'Foundation',
    uploadTimestamp: '2025-11-10T10:00:00Z',
    uploaderRole: 'District Inspector',
    sha256: 'demo_synthetic_sha256_tamilnadu_1120_01_culvert_inlet',
    perceptualHash: '1122334455667788',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2025-11-10T09:40:00Z',
      cameraMake: 'Apple',
      cameraModel: 'iPhone 14',
      coordinates: [79.1303, 12.9202], // ~40m from site
      altitudeMeters: 215,
      gpsAccuracyMeters: 3.5,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Culvert Inlet', 'Verified on-site (40m)', '#48d29b'),
    demoCaption: 'Drainage culvert foundation footing verified on-site.',
    isSynthetic: true,
  },
  {
    id: 'IMG-TN-1120-02',
    projectId: 'MP-TN-2026-1120',
    fileName: 'drainage_masonry_wall.jpg',
    fileSizeBytes: 2650000,
    mimeType: 'image/jpeg',
    stage: 'Superstructure',
    uploadTimestamp: '2025-12-15T11:30:00Z',
    uploaderRole: 'District Inspector',
    sha256: 'demo_synthetic_sha256_tamilnadu_1120_02_drain_wall',
    perceptualHash: '2233445566778899',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2025-12-15T11:10:00Z',
      cameraMake: 'Apple',
      cameraModel: 'iPhone 14',
      coordinates: [79.1305, 12.9204], // ~65m from site
      altitudeMeters: 215,
      gpsAccuracyMeters: 3.8,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Masonry Drain Channel', 'Verified on-site (65m)', '#48d29b'),
    demoCaption: 'Side-channel brick masonry wall inspection.',
    isSynthetic: true,
  },
  {
    id: 'IMG-TN-1120-03',
    projectId: 'MP-TN-2026-1120',
    fileName: 'drainage_cover_slab_complete.jpg',
    fileSizeBytes: 2890000,
    mimeType: 'image/jpeg',
    stage: 'Completion',
    uploadTimestamp: '2026-01-20T14:00:00Z',
    uploaderRole: 'District Inspector',
    sha256: 'demo_synthetic_sha256_tamilnadu_1120_03_cover_slab',
    perceptualHash: '33445566778899aa',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-01-20T13:45:00Z',
      cameraMake: 'Apple',
      cameraModel: 'iPhone 14',
      coordinates: [79.1304, 12.9203], // ~50m from site
      altitudeMeters: 216,
      gpsAccuracyMeters: 3.2,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Completed Drainage Cover', 'Verified on-site (50m)', '#48d29b'),
    demoCaption: 'Pre-cast RCC cover slabs installed and inspected.',
    isSynthetic: true,
  },

  // ===================================================================
  // 7. MP-DL-2026-0090 (South Delhi Public Library Upgradation)
  // Sanctioned Landmark: [77.1900, 28.5000]
  // 1 photo with GPS offset 800m
  // ===================================================================
  {
    id: 'IMG-DL-0090-01',
    projectId: 'MP-DL-2026-0090',
    fileName: 'library_reading_hall_interior.jpg',
    fileSizeBytes: 2300000,
    mimeType: 'image/jpeg',
    stage: 'Roofing & Finishing',
    uploadTimestamp: '2026-02-15T10:00:00Z',
    uploaderRole: 'Contractor',
    sha256: 'demo_synthetic_sha256_delhi_0090_01_library_hall',
    perceptualHash: '445566778899aabb',
    exif: {
      hasExif: true,
      origin: 'synthetic_demo',
      captureTimestamp: '2026-02-15T09:30:00Z',
      cameraMake: 'Samsung',
      cameraModel: 'Galaxy S21',
      coordinates: [77.1970, 28.5040], // ~800m away
      altitudeMeters: 228,
      gpsAccuracyMeters: 5.5,
      isSynthetic: true,
    },
    thumbnailUrl: createSyntheticThumbnail('Library Reading Hall', 'GPS Offset: 800m', '#ff8a3d'),
    demoCaption: 'Interior renovation photograph geotagged 800m from sanctioned facility.',
    isSynthetic: true,
  },
];

// ---------------------------------------------------------------------
// ACCESSOR UTILITIES
// ---------------------------------------------------------------------

export function getAllDemoImages(): ImageEvidenceRecord[] {
  return [...DEMO_IMAGE_DATASET];
}

export function getImagesForProject(projectId: string): ImageEvidenceRecord[] {
  return DEMO_IMAGE_DATASET.filter((img) => img.projectId === projectId);
}

export function getImageById(imageId: string): ImageEvidenceRecord | undefined {
  return DEMO_IMAGE_DATASET.find((img) => img.id === imageId);
}
