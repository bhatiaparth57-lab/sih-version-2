import { useState, useMemo } from 'react';
import {
  MapPin, Compass, Camera, AlertTriangle, Calendar,
  CheckCircle2, Info, Search, ShieldAlert,
} from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import {
  runGeospatialVerification,
  getEnrichedGeospatialAssets,
  DEMO_GEOSPATIAL_ANALYSIS_DATE,
} from '@/lib/geospatialEngine';
import type {
  GeospatialAssetRecord,
  GeospatialVerificationResult,
  GeospatialFinding,
} from '@/lib/geospatialTypes';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface Props {
  initialProjectId?: string;
  onSelectProject?: (projectId: string) => void;
}

export default function GeospatialVerificationPanel({
  initialProjectId,
  onSelectProject,
}: Props) {
  const enrichedAssets = useMemo(() => getEnrichedGeospatialAssets(), []);
  const verificationResult: GeospatialVerificationResult = useMemo(
    () => runGeospatialVerification(enrichedAssets),
    [enrichedAssets],
  );

  const [selectedId, setSelectedId] = useState<string>(
    initialProjectId && enrichedAssets.some((a: GeospatialAssetRecord) => a.projectId === initialProjectId)
      ? initialProjectId
      : enrichedAssets[0]?.projectId ?? '',
  );

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const currentAsset: GeospatialAssetRecord | undefined = useMemo(
    () => enrichedAssets.find((a: GeospatialAssetRecord) => a.projectId === selectedId),
    [enrichedAssets, selectedId],
  );

  const currentProfile = currentAsset
    ? verificationResult.profiles[currentAsset.projectId]
    : undefined;

  const filteredAssets = useMemo(() => {
    return enrichedAssets.filter((a: GeospatialAssetRecord) => {
      if (statusFilter !== 'ALL' && a.demoAssetStatus !== statusFilter) return false;
      if (
        searchTerm &&
        !a.projectName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !a.projectId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !a.district.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [enrichedAssets, statusFilter, searchTerm]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (onSelectProject) onSelectProject(id);
  };

  return (
    <div className="card p-5 border-edge bg-surface">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <Compass className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-ink">
              Layer 4: Idle-Fund & Geospatial Asset Tracking
            </h2>
          </div>
          <p className="mt-1 text-xs text-mute">
            Deterministic physical-financial divergence checks, GPS drift detection, and dormancy telemetry.
          </p>
        </div>

        {/* Demo telemetry badge */}
        <div className="flex items-center gap-2 rounded-xl border border-edge bg-white/[0.02] px-3 py-1.5 text-[11px] text-faint">
          <Calendar className="h-3.5 w-3.5 text-brand" />
          <span>Analysis Reference: <b className="text-ink">{DEMO_GEOSPATIAL_ANALYSIS_DATE}</b></span>
          <span className="chip !py-0.5 !px-1.5 text-[10px] text-warning border-warning/30 bg-warning/10">
            Demo Telemetry
          </span>
        </div>
      </div>

      {/* High-level portfolio summary metrics */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Monitored Assets</div>
          <div className="mt-1 text-xl font-extrabold text-ink">{verificationResult.assetsAnalyzed}</div>
          <div className="mt-0.5 text-[10.5px] text-mute">Across all regions</div>
        </div>

        <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-warning">Potential Idle Funds</div>
          <div className="mt-1 text-xl font-extrabold text-warning">₹{verificationResult.totalIdleLakhs.toFixed(1)}L</div>
          <div className="mt-0.5 text-[10.5px] text-mute">{verificationResult.idleCount} dormant / idle projects</div>
        </div>

        <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-danger">Verification Required</div>
          <div className="mt-1 text-xl font-extrabold text-danger">
            {verificationResult.unverifiedCompletedCount + verificationResult.duplicateCoordsCount}
          </div>
          <div className="mt-0.5 text-[10.5px] text-mute">Severe drift or divergence</div>
        </div>

        <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-brand">Field Visits Recommended</div>
          <div className="mt-1 text-xl font-extrabold text-brand">{verificationResult.needsFieldVisitCount}</div>
          <div className="mt-0.5 text-[10.5px] text-mute">Urgent on-site audit queue</div>
        </div>
      </div>

      {/* Main Asset Inspector Grid */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column: Asset Selector & Status List */}
        <div className="space-y-3 lg:col-span-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-faint" />
              <input
                type="text"
                placeholder="Search asset or district…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-edge bg-surface py-1.5 pl-8 pr-3 text-xs text-ink placeholder-faint focus:border-brand focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-edge bg-surface px-2 py-1.5 text-xs text-mute focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="Planned">Planned</option>
              <option value="Under Construction">Under Construction</option>
              <option value="Completed">Completed</option>
              <option value="Verified">Verified</option>
              <option value="Idle">Idle</option>
              <option value="Needs Field Visit">Needs Field Visit</option>
            </select>
          </div>

          <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
            {filteredAssets.map((asset: GeospatialAssetRecord) => {
              const profile = verificationResult.profiles[asset.projectId];
              const isSelected = asset.projectId === selectedId;
              const hasFlags = profile && profile.findings.length > 0;

              return (
                <button
                  key={asset.projectId}
                  onClick={() => handleSelect(asset.projectId)}
                  className={cn(
                    'w-full rounded-xl border p-2.5 text-left transition-all',
                    isSelected
                      ? 'border-brand bg-brand/10 shadow-sm'
                      : 'border-edge bg-white/[0.02] hover:bg-white/[0.04]',
                  )}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-brand">{asset.projectId}</span>
                    <span className={cn(
                      'rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold',
                      asset.demoAssetStatus === 'Completed' || asset.demoAssetStatus === 'Verified'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : asset.demoAssetStatus === 'Idle'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : asset.demoAssetStatus === 'Needs Field Visit'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                    )}>
                      {asset.demoAssetStatus}
                    </span>
                  </div>

                  <div className="mt-1 line-clamp-1 text-xs font-semibold text-ink">{asset.projectName}</div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-mute">
                    <span>{asset.district}, {asset.state}</span>
                    <span className="num font-bold" style={{
                      color: (profile?.riskScore || 0) >= 60 ? '#ff5860' : (profile?.riskScore || 0) >= 30 ? '#ff8a3d' : '#48d29b'
                    }}>
                      Score: {profile?.riskScore ?? 0}
                    </span>
                  </div>

                  {hasFlags && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-warning">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span className="truncate">{profile.findings[0].title}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: In-depth Asset Details & Rule Breakdown */}
        {currentAsset && currentProfile ? (
          <div className="space-y-4 lg:col-span-8">
            {/* Top Asset Summary Box */}
            <div className="rounded-2xl border border-edge bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand">{currentAsset.projectId}</span>
                    <span className="chip text-[10.5px]">{currentAsset.projectType}</span>
                    <RiskBadge level={currentProfile.riskLevel} />
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-ink">{currentAsset.projectName}</h3>
                  <p className="mt-0.5 text-xs text-mute">
                    {currentAsset.district}, {currentAsset.state} · Contractor: <span className="text-ink">{currentAsset.vendorName}</span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Asset Risk Score</div>
                  <div className="mt-0.5 text-2xl font-extrabold" style={{
                    color: currentProfile.riskScore >= 60 ? '#ff5860' : currentProfile.riskScore >= 30 ? '#ff8a3d' : '#48d29b'
                  }}>
                    {currentProfile.riskScore} <span className="text-xs text-faint">/ 100</span>
                  </div>
                  <div className="text-[10.5px] text-mute">{currentProfile.findings.length} findings recorded</div>
                </div>
              </div>

              {/* Progress vs Spend Comparison */}
              <div className="mt-4 rounded-xl border border-edge bg-surface/80 p-3">
                <div className="text-xs font-bold text-ink mb-2 flex items-center justify-between">
                  <span>Physical Completion vs Financial Disbursement</span>
                  <span className={cn(
                    'text-[11px] font-bold',
                    currentAsset.spendRatioPercent - currentAsset.demoPhysicalProgressPercent >= 40
                      ? 'text-danger'
                      : currentAsset.spendRatioPercent - currentAsset.demoPhysicalProgressPercent >= 20
                      ? 'text-warning'
                      : 'text-emerald-400',
                  )}>
                    Divergence Gap: {currentAsset.spendRatioPercent - currentAsset.demoPhysicalProgressPercent}%
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] text-mute mb-1">
                      <span>Financial Disbursement (Spend)</span>
                      <span className="num font-bold text-ink">
                        {currentAsset.spendRatioPercent}% (₹{currentAsset.spentLakhs}L of ₹{currentAsset.allocatedLakhs}L)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full bg-brand transition-all"
                        style={{ width: `${Math.min(100, currentAsset.spendRatioPercent)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-mute mb-1">
                      <span>Physical On-Site Progress</span>
                      <span className="num font-bold text-ink">{currentAsset.demoPhysicalProgressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={cn(
                          'h-full transition-all',
                          currentAsset.spendRatioPercent - currentAsset.demoPhysicalProgressPercent >= 40
                            ? 'bg-danger'
                            : currentAsset.spendRatioPercent - currentAsset.demoPhysicalProgressPercent >= 20
                            ? 'bg-warning'
                            : 'bg-emerald-400',
                        )}
                        style={{ width: `${Math.min(100, currentAsset.demoPhysicalProgressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Telemetry Grid */}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                <div className="rounded-xl border border-edge bg-surface/50 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-faint">
                    <MapPin className="h-3 w-3 text-brand" /> Coordinates
                  </div>
                  <div className="mt-1 font-mono text-[11px] font-semibold text-ink">
                    {currentAsset.demoCoordinates[1].toFixed(4)}°N, {currentAsset.demoCoordinates[0].toFixed(4)}°E
                  </div>
                </div>

                <div className="rounded-xl border border-edge bg-surface/50 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-faint">
                    <Calendar className="h-3 w-3 text-brand" /> Last Update
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-ink">
                    {currentAsset.demoLastUpdateDate}
                  </div>
                  <div className="text-[10px] text-mute">({currentAsset.demoDaysSinceUpdate} days dormant)</div>
                </div>

                <div className="rounded-xl border border-edge bg-surface/50 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-faint">
                    <Camera className="h-3 w-3 text-brand" /> Photo Evidence
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-ink">
                    {currentAsset.demoPhotoPassCount} / {currentAsset.demoPhotoEvidenceCount} verified
                  </div>
                  <div className="text-[10px] text-mute">
                    ({currentAsset.demoPhotoEvidenceCount > 0 ? Math.round((currentAsset.demoPhotoPassCount / currentAsset.demoPhotoEvidenceCount) * 100) : 0}% pass rate)
                  </div>
                </div>

                <div className="rounded-xl border border-edge bg-surface/50 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-faint">
                    <Compass className="h-3 w-3 text-brand" /> Spatial GPS Drift
                  </div>
                  <div className={cn(
                    'mt-1 font-mono text-[11px] font-semibold',
                    (currentAsset.demoGpsDriftMeters || 0) > 1000 ? 'text-danger' : 'text-ink',
                  )}>
                    {currentAsset.demoGpsDriftMeters ? `${currentAsset.demoGpsDriftMeters}m` : '0m (In tolerance)'}
                  </div>
                  <div className="text-[10px] text-mute">
                    {(currentAsset.demoGpsDriftMeters || 0) > 1000 ? '> 1km deviation' : '< 250m threshold'}
                  </div>
                </div>
              </div>

              {/* Shared Site Justification Note (if present) */}
              {currentAsset.demoSharedSiteJustification && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/[0.04] p-2.5 text-xs text-mute">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  <div>
                    <span className="font-bold text-ink">Documented Shared Compound Justification: </span>
                    {currentAsset.demoSharedSiteJustification}
                  </div>
                </div>
              )}
            </div>

            {/* Rule Findings List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-faint">
                Geospatial & Telemetry Findings ({currentProfile.findings.length})
              </h4>

              {currentProfile.findings.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>No geospatial anomalies or idle fund triggers detected for this asset. Telemetry aligns with reported physical status.</span>
                </div>
              ) : (
                currentProfile.findings.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-edge bg-white/[0.02] p-3 transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase',
                          f.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          f.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        )}>
                          {f.severity}
                        </span>
                        <span className="text-xs font-bold text-ink">{f.title}</span>
                      </div>
                      <span className="num font-bold text-warning text-xs">+{f.points} pts</span>
                    </div>

                    <p className="mt-1.5 text-xs text-mute leading-relaxed">{f.detail}</p>

                    <div className="mt-2 space-y-1 rounded-lg border border-edge/60 bg-surface/60 p-2 text-[11px] text-faint">
                      <div className="font-semibold text-ink">Recorded Evidence:</div>
                      {f.evidence.map((ev, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-brand" />
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-edge/40">
                      <div className="text-[11px] text-brand flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Action: {f.recommendedAction}</span>
                      </div>
                      <button
                        onClick={() => {
                          toast(`Field audit task queued for inspection team`, 'info');
                        }}
                        className="btn-subtle !py-1 !px-2 text-[10.5px]"
                      >
                        Schedule Field Audit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-12 text-xs text-mute lg:col-span-8">
            Select an asset from the list to view geospatial and idle-fund telemetry.
          </div>
        )}
      </div>
    </div>
  );
}
