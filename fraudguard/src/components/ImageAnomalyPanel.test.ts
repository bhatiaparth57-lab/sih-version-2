import { describe, it, expect } from 'vitest';
import {
  getAllDemoImages,
  getImagesForProject,
} from '@/lib/imageAnomalyDemoData';
import {
  runImageAnomalyAnalysis,
  GPS_TOLERANCE_METERS,
  LAYER_1_ANALYSIS_REFERENCE_DATE,
} from '@/lib/imageAnomalyEngine';
import type { ImageEvidenceRecord } from '@/lib/imageAnomalyTypes';

describe('ImageAnomalyPanel Component Logic & UI Filters', () => {
  const allImages = getAllDemoImages();
  const analysisResult = runImageAnomalyAnalysis(allImages);

  it('correctly associates images with the flagship project MP-DEL-2026-0142', () => {
    const delhiImages = getImagesForProject('MP-DEL-2026-0142');
    expect(delhiImages).toHaveLength(14);

    const profile = analysisResult.projectProfiles['MP-DEL-2026-0142'];
    expect(profile).toBeDefined();
    expect(profile.totalImages).toBe(14);
    expect(profile.verifiedImagesCount).toBe(3);
    expect(profile.anomalyImagesCount).toBe(11);
  });

  it('filters anomaly images requiring review vs verified on-site records', () => {
    const delhiImages = getImagesForProject('MP-DEL-2026-0142');
    const profile = analysisResult.projectProfiles['MP-DEL-2026-0142'];
    const anomalyImageIds = new Set(profile.findings.map((f) => f.imageId));

    // Simulated UI filter: 'ANOMALIES'
    const anomalyFiltered = delhiImages.filter((img) => anomalyImageIds.has(img.id));
    expect(anomalyFiltered).toHaveLength(11);

    // Simulated UI filter: 'VERIFIED'
    const verifiedFiltered = delhiImages.filter((img) => !anomalyImageIds.has(img.id));
    expect(verifiedFiltered).toHaveLength(3);
    expect(verifiedFiltered.map((i) => i.id)).toEqual([
      'IMG-DEL-0142-01',
      'IMG-DEL-0142-02',
      'IMG-DEL-0142-03',
    ]);
  });

  it('filters images by construction milestone stage', () => {
    const delhiImages = getImagesForProject('MP-DEL-2026-0142');
    const foundationImages = delhiImages.filter((img) => img.stage === 'Foundation');
    expect(foundationImages.length).toBeGreaterThanOrEqual(1);

    const superstructureImages = delhiImages.filter((img) => img.stage === 'Superstructure');
    expect(superstructureImages.length).toBeGreaterThanOrEqual(1);

    const completionImages = allImages.filter((img) => img.stage === 'Completion');
    expect(completionImages.length).toBeGreaterThanOrEqual(1);
  });

  it('filters images by search term across filename, stage, and caption', () => {
    const delhiImages = getImagesForProject('MP-DEL-2026-0142');

    const searchFilename = delhiImages.filter((img) =>
      img.fileName.toLowerCase().includes('foundation')
    );
    expect(searchFilename.length).toBeGreaterThanOrEqual(1);

    const searchCaption = delhiImages.filter((img) =>
      img.demoCaption.toLowerCase().includes('reinforcement')
    );
    expect(searchCaption.length).toBeGreaterThanOrEqual(1);
  });

  it('identifies duplicate groups involving the selected project', () => {
    const delhiGroups = analysisResult.duplicateGroups.filter((g) =>
      g.projectIds.includes('MP-DEL-2026-0142')
    );

    expect(delhiGroups.length).toBeGreaterThanOrEqual(2);

    // One exact SHA-256 duplicate group (with Bihar)
    const exactGroup = delhiGroups.find((g) => g.type === 'exact_sha256');
    expect(exactGroup).toBeDefined();
    expect(exactGroup?.projectIds).toContain('MP-BR-2026-0904');

    // One perceptual dHash group
    const pHashGroup = delhiGroups.find((g) => g.type === 'perceptual_dhash');
    expect(pHashGroup).toBeDefined();
    expect(pHashGroup?.hammingDistance).toBeLessThanOrEqual(4);
  });

  it('verifies all image records include lightweight synthetic SVG previews', () => {
    for (const img of allImages) {
      expect(img.thumbnailUrl).toBeDefined();
      expect(img.thumbnailUrl).toMatch(/^data:image\/svg\+xml/);
      expect(img.thumbnailUrl).toContain('data:image/svg+xml;utf8');
      expect(img.isSynthetic).toBe(true);
    }
  });

  it('ensures non-accusatory terminology in all displayed anomaly findings', () => {
    const prohibitedWords = ['fraud', 'forgery', 'crime', 'criminal', 'fake', 'guilty', 'theft', 'scam'];

    for (const finding of analysisResult.allFindings) {
      const textToAudit = `${finding.title} ${finding.explanation} ${finding.recommendedAction}`.toLowerCase();
      for (const word of prohibitedWords) {
        expect(textToAudit).not.toContain(word);
      }
      // Must contain review-oriented phrasing
      expect(textToAudit).toMatch(/(review|verification|inspection|offset|mismatch|singularity|calibration|clarification|audit)/);
    }
  });
});
