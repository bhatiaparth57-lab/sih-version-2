import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, MapPin, Calendar, AlertTriangle, CheckCircle2,
  Copy, Layers, ExternalLink, ShieldAlert, Info, Search,
  Filter, Sparkles, Hash, Eye, ArrowRight,
} from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import { PROJECTS, type Risk } from '@/lib/data';
import {
  runImageAnomalyAnalysis,
  GPS_TOLERANCE_METERS,
  LAYER_1_ANALYSIS_REFERENCE_DATE,
} from '@/lib/imageAnomalyEngine';
import {
  getAllDemoImages,
  getImagesForProject,
} from '@/lib/imageAnomalyDemoData';
import type {
  ImageEvidenceRecord,
  ImageAnomalyFinding,
  DuplicateGroup,
} from '@/lib/imageAnomalyTypes';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface Props {
  initialProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  compact?: boolean;
}

export default function ImageAnomalyPanel({
  initialProjectId,
  onSelectProject,
  compact = false,
}: Props) {
  const allImages = useMemo(() => getAllDemoImages(), []);
  const analysisResult = useMemo(
    () => runImageAnomalyAnalysis(allImages),
    [allImages]
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId ?? 'MP-DEL-2026-0142'
  );
  const [filterMode, setFilterMode] = useState<'ALL' | 'ANOMALIES' | 'VERIFIED'>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<ImageEvidenceRecord | null>(null);

  // Projects that have demo images
  const projectsWithImages = useMemo(() => {
    const projectIds = Array.from(new Set(allImages.map((img) => img.projectId)));
    return projectIds
      .map((id) => PROJECTS.find((p) => p.id === id) || { id, name: id, district: 'Unknown', state: '' })
      .sort((a, b) => (b.id === 'MP-DEL-2026-0142' ? 1 : -1));
  }, [allImages]);

  const activeProject = useMemo(
    () => PROJECTS.find((p) => p.id === selectedProjectId),
    [selectedProjectId]
  );

  const projectImages = useMemo(
    () => getImagesForProject(selectedProjectId),
    [selectedProjectId]
  );

  const projectProfile = useMemo(
    () => analysisResult.projectProfiles[selectedProjectId],
    [analysisResult, selectedProjectId]
  );

  // Filtered images list
  const filteredImages = useMemo(() => {
    return projectImages.filter((img) => {
      const imgFindings = (projectProfile?.findings ?? []).filter((f) => f.imageId === img.id);
      const isAnomaly = imgFindings.length > 0;

      if (filterMode === 'ANOMALIES' && !isAnomaly) return false;
      if (filterMode === 'VERIFIED' && isAnomaly) return false;
      if (stageFilter !== 'ALL' && img.stage !== stageFilter) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          img.fileName.toLowerCase().includes(query) ||
          img.id.toLowerCase().includes(query) ||
          img.stage.toLowerCase().includes(query) ||
          img.demoCaption.toLowerCase().includes(query) ||
          img.uploaderRole.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [projectImages, projectProfile, filterMode, stageFilter, searchTerm]);

  // Duplicate groups involving this project
  const relevantDuplicateGroups = useMemo(() => {
    return analysisResult.duplicateGroups.filter((g) =>
      g.projectIds.includes(selectedProjectId)
    );
  }, [analysisResult, selectedProjectId]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedImage(null);
    if (onSelectProject) onSelectProject(projectId);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast(`Copied ${label} to clipboard`, 'info');
    }
  };

  return (
    <div className="card p-5 border-edge bg-surface space-y-5">
      {/* 1. Header & Prominent Synthetic Demonstration Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
              <Camera className="h-4 w-4" />
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-400">
              Layer 1 Verification
            </span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
              Active Prototype · Explainable Audit Signals
            </span>
          </div>
          <h2 className="text-base font-bold text-ink mt-1">
            Layer 1: Image, GPS & Multi-Source Anomaly Detection
          </h2>
          <p className="mt-0.5 text-xs text-mute">
            Photographic evidence inspection, EXIF tag validation, spatial proximity verification, and perceptual similarity analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-edge bg-white/[0.02] px-3 py-1.5 text-[11px] text-faint">
          <Calendar className="h-3.5 w-3.5 text-brand" />
          <span>Timeline Anchor: <b className="text-ink">{LAYER_1_ANALYSIS_REFERENCE_DATE}</b></span>
        </div>
      </div>

      {/* Prominent Synthetic Demo Disclaimer */}
      <div className="rounded-xl border border-[#f0b64b]/30 bg-[#f0b64b]/[0.06] p-3.5 text-[11.5px] text-[#f0b64b] flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#f0b64b]" />
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wider text-[11px]">
            Synthetic Demonstration Data · Prototype Environment
          </div>
          <p className="text-[11.5px] text-mute leading-relaxed">
            All photo records, camera hardware tags, GPS coordinates, synthetic SHA-256 fingerprints (<span className="font-mono text-ink">demo_synthetic_sha256_*</span>), and perceptual difference hashes (<span className="font-mono text-ink">dHash</span>) in this module are completely synthetic demonstration test vectors. The current prototype processes pre-computed 8×9 luminance matrices and does not decode uploaded JPEG/PNG binaries in the browser.
          </p>
        </div>
      </div>

      {/* 2. Project Selector & Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-mute">Select Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => handleSelectProject(e.target.value)}
            className="rounded-lg border border-edge bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-ink focus:border-brand focus:outline-none"
          >
            {projectsWithImages.map((p) => (
              <option key={p.id} value={p.id} className="bg-panel text-ink">
                {p.id} — {p.name} ({getImagesForProject(p.id).length} photos)
              </option>
            ))}
          </select>

          {activeProject && (
            <Link
              to={`/projects/${activeProject.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline ml-1"
            >
              Project Detail <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Search & Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-faint" />
            <input
              type="text"
              placeholder="Search filename or caption..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 rounded-lg border border-edge bg-white/[0.03] pl-8 pr-2.5 py-1 text-[11px] text-ink placeholder:text-faint focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex items-center rounded-lg border border-edge bg-white/[0.02] p-0.5 text-[11px]">
            <button
              onClick={() => setFilterMode('ALL')}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition',
                filterMode === 'ALL' ? 'bg-brand/15 text-brand font-semibold' : 'text-mute hover:text-ink'
              )}
            >
              All ({projectImages.length})
            </button>
            <button
              onClick={() => setFilterMode('ANOMALIES')}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition',
                filterMode === 'ANOMALIES' ? 'bg-[#ff5860]/15 text-[#ff5860] font-semibold' : 'text-mute hover:text-ink'
              )}
            >
              Requires Review ({projectProfile?.anomalyImagesCount ?? 0})
            </button>
            <button
              onClick={() => setFilterMode('VERIFIED')}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition',
                filterMode === 'VERIFIED' ? 'bg-[#48d29b]/15 text-[#48d29b] font-semibold' : 'text-mute hover:text-ink'
              )}
            >
              Verified ({projectProfile?.verifiedImagesCount ?? 0})
            </button>
          </div>
        </div>
      </div>

      {/* 3. Executive KPI Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
            Total Photos Evaluated
          </div>
          <div className="num mt-1 text-xl font-bold text-ink">
            {projectProfile?.totalImages ?? 0}
          </div>
          <div className="text-[10.5px] text-mute mt-0.5">
            Photographic inspection records
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
            Verified On-Site Records
          </div>
          <div className="num mt-1 text-xl font-bold text-[#48d29b]">
            {projectProfile?.verifiedImagesCount ?? 0}
          </div>
          <div className="text-[10.5px] text-mute mt-0.5">
            Proximity &lt; {GPS_TOLERANCE_METERS.MAX_ACCEPTABLE_OFFSET}m & valid EXIF
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
            Review Recommendations
          </div>
          <div className="num mt-1 text-xl font-bold text-[#ff8a3d]">
            {projectProfile?.findings.length ?? 0}
          </div>
          <div className="text-[10.5px] text-mute mt-0.5">
            Potential anomalies requiring review
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
            Project Anomaly Index
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="num text-xl font-bold text-ink">
              {projectProfile?.anomalyScore ?? 0}/100
            </span>
            <RiskBadge level={projectProfile?.severity ?? 'LOW'} />
          </div>
          <div className="text-[10.5px] text-mute mt-0.5">
            Deterministic clamped score [0, 100]
          </div>
        </div>
      </div>

      {/* 4. Three Methodological Safeguards Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-faint">
            <Hash className="h-3.5 w-3.5 text-brand" /> Exact Hash vs Perceptual
          </div>
          <div className="text-xs font-bold text-ink mt-1">
            Deterministic Dual-Verification
          </div>
          <p className="text-[11px] text-mute mt-1 leading-relaxed">
            Exact cryptographic SHA-256 reuse across projects produces a <b>35-point</b> review signal. Perceptual dHash gradient alignment (Hamming distance &le; 4) produces a <b>25-point</b> visual similarity signal and explicitly does NOT claim proof of reuse.
          </p>
        </div>

        <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-faint">
            <MapPin className="h-3.5 w-3.5 text-blue-400" /> EXIF & Spatial Origin
          </div>
          <div className="text-xs font-bold text-ink mt-1">
            Provenance & Geofence Bounds
          </div>
          <p className="text-[11px] text-mute mt-1 leading-relaxed">
            Distinguishes <span className="chip !py-0 !px-1 text-[9px]">synthetic_demo</span>, <span className="chip !py-0 !px-1 text-[9px]">extracted_exif</span>, and <span className="chip !py-0 !px-1 text-[9px]">user_declared</span>. Measures offset against sanctioned project landmark coordinates (warning &gt; 500m, severe drift &gt; 2.0 km).
          </p>
        </div>

        <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-faint">
            <ShieldAlert className="h-3.5 w-3.5 text-[#ff8a3d]" /> Multi-Source Integrity
          </div>
          <div className="text-xs font-bold text-ink mt-1">
            Declared Milestone Cross-Check
          </div>
          <p className="text-[11px] text-mute mt-1 leading-relaxed">
            Completion conflicts are only evaluated when an explicit milestone claim is submitted. Physical progress is never inferred from photo pixels alone; discrepancies highlight variance between declared claims and Layer 4 telemetry.
          </p>
        </div>
      </div>

      {/* 5. Cross-Project & Duplicate Groups Drawer (if any) */}
      {relevantDuplicateGroups.length > 0 && (
        <div className="rounded-xl border border-[#ff8a3d]/30 bg-[#ff8a3d]/[0.04] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#ff8a3d]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                Detected Evidence Clusters & Potential Duplicates ({relevantDuplicateGroups.length})
              </h3>
            </div>
            <span className="text-[10.5px] text-faint">
              Cross-checked across 24 portfolio records
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {relevantDuplicateGroups.map((group, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-edge bg-surface/80 p-3 space-y-2 text-[11.5px]"
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase',
                    group.type === 'exact_sha256'
                      ? 'bg-[#ff5860]/12 text-[#ff5860] border border-[#ff5860]/30'
                      : 'bg-[#ff8a3d]/12 text-[#ff8a3d] border border-[#ff8a3d]/30'
                  )}>
                    {group.type === 'exact_sha256' ? 'Exact SHA-256 Match' : `Perceptual dHash Match (d=${group.hammingDistance})`}
                  </span>
                  <span className="text-[10px] text-faint">
                    {group.projectIds.length > 1 ? 'Cross-Project' : 'Intra-Project'}
                  </span>
                </div>

                <div className="text-ink font-semibold">{group.note}</div>

                <div className="flex flex-wrap items-center gap-1 text-[10.5px] text-mute">
                  <span>Involved records:</span>
                  {group.imageIds.map((id) => (
                    <span key={id} className="font-mono bg-white/[0.04] px-1.5 py-0.5 rounded text-ink">
                      {id}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-edge/40 text-[10.5px]">
                  <span className="text-faint">Hash signature:</span>
                  <span className="font-mono text-mute truncate max-w-[200px]" title={group.hash}>
                    {group.hash}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Image Evidence Records Gallery & Detail Inspector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Photo Evidence Records ({filteredImages.length} shown)
          </h3>
          <span className="text-[11px] text-faint">
            Project: <b className="text-ink">{selectedProjectId}</b>
          </span>
        </div>

        {filteredImages.length === 0 ? (
          <div className="rounded-xl border border-edge bg-white/[0.02] p-8 text-center text-mute text-xs">
            No photographic evidence records match the current filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredImages.map((img) => {
              const findings = (projectProfile?.findings ?? []).filter((f) => f.imageId === img.id);
              const isAnomaly = findings.length > 0;
              const isSelected = selectedImage?.id === img.id;

              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    'group relative rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between space-y-3',
                    isSelected
                      ? 'border-brand bg-brand/[0.03] shadow-glow'
                      : isAnomaly
                      ? 'border-edge bg-white/[0.02] hover:border-[#ff8a3d]/50 hover:bg-white/[0.04]'
                      : 'border-edge bg-white/[0.02] hover:border-[#48d29b]/50 hover:bg-white/[0.04]'
                  )}
                >
                  {/* Top Row: Preview Thumbnail & Basic Info */}
                  <div className="space-y-2.5">
                    <div className="relative overflow-hidden rounded-lg border border-edge bg-black/40">
                      {/* Synthetic SVG Preview */}
                      <img
                        src={img.thumbnailUrl}
                        alt={img.fileName}
                        className="w-full h-36 object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        <span className="rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-mono font-bold text-blue-300 border border-blue-400/30">
                          SYNTHETIC PREVIEW
                        </span>
                        <span className="rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-slate-200 border border-white/20">
                          {img.stage}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        {isAnomaly ? (
                          <span className="inline-flex items-center gap-1 rounded bg-[#ff5860]/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                            <AlertTriangle className="h-2.5 w-2.5" /> Requires Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-[#48d29b]/90 px-1.5 py-0.5 text-[9px] font-bold text-black shadow">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Verified On-Site
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9.5px] text-slate-300 bg-black/75 rounded px-2 py-0.5">
                        <span className="font-mono">{img.id}</span>
                        <span>{img.exif.origin}</span>
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div>
                      <div className="font-semibold text-xs text-ink truncate" title={img.fileName}>
                        {img.fileName}
                      </div>
                      <div className="text-[11px] text-mute mt-0.5 line-clamp-1">
                        {img.demoCaption}
                      </div>
                    </div>

                    {/* Technical details grid */}
                    <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-edge/60 bg-white/[0.01] p-2 text-[10.5px]">
                      <div>
                        <span className="text-faint">Capture Date:</span>
                        <div className="text-ink font-mono mt-0.5">
                          {img.exif.captureTimestamp
                            ? img.exif.captureTimestamp.substring(0, 10)
                            : 'Missing EXIF'}
                        </div>
                      </div>
                      <div>
                        <span className="text-faint">Device Tag:</span>
                        <div className="text-ink truncate mt-0.5" title={`${img.exif.cameraMake ?? 'Unknown'} ${img.exif.cameraModel ?? ''}`}>
                          {img.exif.cameraMake ? `${img.exif.cameraMake} ${img.exif.cameraModel}` : 'Not embedded'}
                        </div>
                      </div>
                      <div>
                        <span className="text-faint">GPS Coords:</span>
                        <div className="text-ink font-mono mt-0.5 truncate">
                          {img.exif.coordinates
                            ? `[${img.exif.coordinates[0].toFixed(2)}, ${img.exif.coordinates[1].toFixed(2)}]`
                            : 'None'}
                        </div>
                      </div>
                      <div>
                        <span className="text-faint">Uploader:</span>
                        <div className="text-ink truncate mt-0.5">
                          {img.uploaderRole}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Findings breakdown if flagged */}
                  {isAnomaly && (
                    <div className="space-y-1.5 pt-2 border-t border-edge/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff8a3d] flex items-center justify-between">
                        <span>Anomalies Detected ({findings.length})</span>
                        <span>+{findings.reduce((s, f) => s + f.points, 0)} pts</span>
                      </div>
                      {findings.slice(0, 2).map((f) => (
                        <div
                          key={f.id}
                          className="rounded-lg border border-edge/60 bg-white/[0.02] p-2 text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-ink truncate text-[11px]">{f.title}</span>
                            <span className={cn(
                              'rounded px-1 py-0.2 text-[8.5px] font-bold uppercase shrink-0',
                              f.severity === 'CRITICAL' && 'text-[#ff5860] bg-[#ff5860]/10',
                              f.severity === 'HIGH' && 'text-[#ff8a3d] bg-[#ff8a3d]/10',
                              f.severity === 'MEDIUM' && 'text-[#f0b64b] bg-[#f0b64b]/10',
                            )}>
                              {f.severity}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-mute line-clamp-2 leading-relaxed">
                            {f.explanation}
                          </p>
                          <div className="text-[10px] text-blue-400/90 pt-0.5">
                            &rarr; Action: {f.recommendedAction}
                          </div>
                        </div>
                      ))}
                      {findings.length > 2 && (
                        <div className="text-[10px] text-faint text-center">
                          +{findings.length - 2} more finding(s) — click to inspect
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action / Inspect prompt */}
                  <div className="pt-2 flex items-center justify-between border-t border-edge/40 text-[10.5px]">
                    <span className="font-mono text-faint truncate max-w-[150px]" title={img.perceptualHash}>
                      dHash: {img.perceptualHash}
                    </span>
                    <span className="text-brand font-semibold group-hover:underline inline-flex items-center gap-0.5">
                      Inspect Details &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Modal / Detailed Evidence Inspection Drawer */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-edge bg-surface p-5 space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-edge/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand">{selectedImage.id}</span>
                  <span className="chip !py-0.5 !px-1.5 text-[10px]">{selectedImage.stage}</span>
                  <span className="chip !py-0.5 !px-1.5 text-[10px] text-blue-400 border-blue-400/30 bg-blue-500/10">
                    {selectedImage.exif.origin}
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink mt-1">{selectedImage.fileName}</h3>
                <p className="text-xs text-mute mt-0.5">{selectedImage.demoCaption}</p>
              </div>

              <button
                onClick={() => setSelectedImage(null)}
                className="rounded-lg p-1.5 text-faint hover:bg-white/[0.05] hover:text-ink transition text-lg font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body: Preview & Hash Inspector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <img
                  src={selectedImage.thumbnailUrl}
                  alt={selectedImage.fileName}
                  className="w-full h-48 object-cover rounded-xl border border-edge bg-black/40"
                />
                <div className="mt-1 text-center text-[10px] text-faint">
                  Synthetic SVG demonstration preview
                </div>
              </div>

              <div className="space-y-2 text-[11.5px]">
                <div className="rounded-lg border border-edge bg-white/[0.02] p-2.5 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
                    Cryptographic SHA-256 Placeholder
                  </div>
                  <div className="font-mono text-[10.5px] text-ink break-all select-all flex items-center justify-between gap-1">
                    <span>{selectedImage.sha256}</span>
                    <button
                      onClick={() => copyToClipboard(selectedImage.sha256, 'SHA-256')}
                      className="p-1 text-faint hover:text-ink"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-edge bg-white/[0.02] p-2.5 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
                    64-Bit Difference Hash (dHash)
                  </div>
                  <div className="font-mono text-[11px] text-ink flex items-center justify-between gap-1">
                    <span>{selectedImage.perceptualHash}</span>
                    <span className="text-[9.5px] text-mute">16-char hex</span>
                  </div>
                </div>

                <div className="rounded-lg border border-edge bg-white/[0.02] p-2.5 space-y-1 text-[10.5px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
                    GPS & Camera Hardware
                  </div>
                  <div>Device: <b className="text-ink">{selectedImage.exif.cameraMake ?? 'None'} {selectedImage.exif.cameraModel ?? ''}</b></div>
                  <div>Coords: <span className="font-mono text-ink">{selectedImage.exif.coordinates ? `[${selectedImage.exif.coordinates[0]}, ${selectedImage.exif.coordinates[1]}]` : 'Missing'}</span></div>
                  <div>Accuracy: <b className="text-ink">{selectedImage.exif.gpsAccuracyMeters ? `${selectedImage.exif.gpsAccuracyMeters}m` : 'N/A'}</b></div>
                </div>
              </div>
            </div>

            {/* Explicit Milestone Claim if present */}
            {selectedImage.milestoneClaim && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.05] p-3 text-[11.5px] space-y-1">
                <div className="font-bold text-blue-400 text-xs">
                  Explicit Milestone Claim Submitted with Record
                </div>
                <div>Claimed Stage: <b className="text-ink">{selectedImage.milestoneClaim.claimedStage}</b> ({selectedImage.milestoneClaim.claimedCompletionPercent}% completion claimed)</div>
                {selectedImage.milestoneClaim.inspectionCertificateRef && (
                  <div>Certificate Ref: <span className="font-mono text-ink">{selectedImage.milestoneClaim.inspectionCertificateRef}</span></div>
                )}
              </div>
            )}

            {/* Findings for this image */}
            {(() => {
              const findings = (projectProfile?.findings ?? []).filter((f) => f.imageId === selectedImage.id);
              if (findings.length === 0) {
                return (
                  <div className="rounded-xl border border-[#48d29b]/30 bg-[#48d29b]/10 p-3 text-xs text-[#48d29b] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span><b>Verified:</b> This photographic record satisfies all Layer 1 spatial, timeline, and cryptographic integrity checks.</span>
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#ff8a3d]">
                    Anomaly Findings & Recommended Actions ({findings.length})
                  </div>
                  {findings.map((f) => (
                    <div key={f.id} className="rounded-xl border border-edge bg-white/[0.02] p-3 space-y-1.5 text-[11.5px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{f.title}</span>
                        <RiskBadge level={f.severity} />
                      </div>
                      <p className="text-mute">{f.explanation}</p>
                      <div className="rounded bg-black/30 p-2 font-mono text-[10.5px] text-faint">
                        {f.evidenceDetail}
                      </div>
                      <div className="text-blue-400 font-semibold text-[11px]">
                        Field Recommendation: {f.recommendedAction}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-edge/60 text-xs">
              <span className="text-faint text-[11px]">
                Advisory finding only &middot; Does not declare criminal guilt or fraud
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="btn-primary !py-1.5 !px-4 text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Methodology & Auditor Safeguards Notice */}
      <div className="rounded-xl border border-edge bg-white/[0.02] p-3 text-[11px] text-mute flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
        <div>
          <b className="text-ink">Auditor Safeguards & Methodology Notice:</b> Layer 1 signals prioritize ground-truth inspections and physical asset audits. Discrepancies represent explainable statistical or cryptographic divergence from official project landmarks and DPR milestones; they do not constitute legal findings of guilt or fraud. Field verification by the competent engineering authority remains strictly required before administrative action.
        </div>
      </div>
    </div>
  );
}
