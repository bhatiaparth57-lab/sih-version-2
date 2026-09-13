import { useMemo, useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Filter, X, ChevronRight, Satellite, LocateFixed, ArrowLeft, AlertTriangle } from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import { PROJECTS, COORDS, HOTSPOTS, STATE_HIGHLIGHT, sp, Risk } from '@/lib/data';
import { cn } from '@/lib/utils';
import {
  runGeospatialVerification,
  getEnrichedGeospatialAssets,
  DEMO_GEOSPATIAL_ANALYSIS_DATE,
} from '@/lib/geospatialEngine';
import type { GeospatialAssetRecord } from '@/lib/geospatialTypes';
import GeospatialVerificationPanel from '@/components/GeospatialVerificationPanel';
import { toast } from '@/components/ui/Toast';

const GEO_URL = '/geo/india.topo.json';
const riskCol = (r: Risk) => (r === 'CRITICAL' ? '#ff5860' : r === 'HIGH' ? '#ff8a3d' : r === 'MEDIUM' ? '#f0b64b' : '#48d29b');

const STATE_NAME_OVERRIDES: Record<string, string> = {
  'NCT of Delhi': 'Delhi',
  'Jammu & Kashmir': 'Jammu and Kashmir',
  'Andaman & Nicobar': 'Andaman and Nicobar Islands',
  'Dadra & Nagar Haveli': 'dnh-and-dd',
  'Daman & Diu': 'dnh-and-dd',
};

function normalizeStateName(topoName: string): string {
  return STATE_NAME_OVERRIDES[topoName] || topoName;
}

function stateSlug(stateName: string): string {
  if (stateName === 'dnh-and-dd') return stateName;
  return stateName.toLowerCase().trim().replace(/\s+/g, '-').replace(/&/g, 'and');
}

function districtGeojsonUrl(stateName: string): string {
  return `https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@main/geojson/states/${stateSlug(stateName)}.geojson`;
}

export default function MapIntelligence() {
  const [selected, setSelected] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  
  const [zoomCenter, setZoomCenter] = useState<[number, number]>([81, 24]);
  const [zoomLevel, setZoomLevel] = useState(1.05);
  const [stateCenter, setStateCenter] = useState<[number, number]>([81, 24]); 

  const [districtGeo, setDistrictGeo] = useState<any | null>(null);
  const [districtLoading, setDistrictLoading] = useState(false);

  const enrichedAssets = useMemo(() => getEnrichedGeospatialAssets(), []);
  const verificationResult = useMemo(
    () => runGeospatialVerification(enrichedAssets),
    [enrichedAssets],
  );

  const assetRecordMap = useMemo(() => {
    const map: Record<string, GeospatialAssetRecord> = {};
    for (const a of enrichedAssets) {
      map[a.projectId] = a;
    }
    return map;
  }, [enrichedAssets]);

  const markers = useMemo(() => {
    return PROJECTS.filter((p) => {
      if (riskFilter !== 'ALL' && p.risk !== riskFilter) return false;
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
      if (statusFilter !== 'ALL') {
        const rec = assetRecordMap[p.id];
        if (!rec || rec.demoAssetStatus !== statusFilter) return false;
      }
      if (selectedState && p.state !== selectedState) return false;
      return true;
    });
  }, [riskFilter, typeFilter, statusFilter, selectedState, assetRecordMap]);

  const selectedProj = PROJECTS.find((p) => p.id === selected) ?? null;
  const types = [...new Set(PROJECTS.map((p) => p.type))];

  useEffect(() => {
    if (!selectedState) {
      setDistrictGeo(null);
      return;
    }
    setDistrictLoading(true);
    fetch(districtGeojsonUrl(selectedState))
      .then((res) => {
        if (!res.ok) throw new Error(`No district geojson for ${selectedState}`);
        return res.json();
      })
      .then(setDistrictGeo)
      .catch((err) => {
        console.warn('[MapIntelligence] district geojson unavailable:', err.message);
        setDistrictGeo(null);
      })
      .finally(() => setDistrictLoading(false));
  }, [selectedState]);

  const handleStateClick = (geo: any) => {
    const rawName = geo.properties.name as string;
    const normalized = normalizeStateName(rawName);
    const centroid = geoCentroid(geo);
    
    setSelectedState(normalized);
    setZoomCenter(centroid);
    setStateCenter(centroid);
    setZoomLevel(4.5);
    setSelected(null);
    setSelectedDistrict(null);
  };

  const handleDistrictClick = (geo: any, distName: string) => {
    const centroid = geoCentroid(geo);
    setSelectedDistrict(distName);
    setZoomCenter(centroid);
    setZoomLevel(15);
    setSelected(null);
  };

  const resetToNational = () => {
    setSelectedState(null);
    setZoomCenter([81, 24]);
    setZoomLevel(1.05);
    setSelectedDistrict(null);
    setSelected(null);
  };

  const resetToState = () => {
    setSelectedDistrict(null);
    setZoomCenter(stateCenter);
    setZoomLevel(4.5);
    setSelected(null);
  };

  const districtProjectCounts = useMemo(() => {
    if (!selectedState) return {};
    const map: Record<string, { count: number; riskSum: number }> = {};
    for (const p of PROJECTS.filter((p) => p.state === selectedState)) {
      if (!map[p.district]) map[p.district] = { count: 0, riskSum: 0 };
      map[p.district].count += 1;
      map[p.district].riskSum += p.riskScore;
    }
    return map;
  }, [selectedState]);

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider text-ink">Geographic Intelligence</h1>
        <p className="mt-1 text-sm text-mute">
          Satellite + GPS + geo-tagged asset verification across India · Layer 4 Telemetry
        </p>
      </div>

      {/* Layer 4 Executive Telemetry Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3 border-edge bg-surface">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Monitored Assets</div>
          <div className="mt-1 text-lg font-extrabold text-ink">{PROJECTS.length}</div>
          <div className="text-[10.5px] text-mute">11 States / UTs active</div>
        </div>

        <div className="card p-3 border-edge bg-surface">
          <div className="text-[10px] font-bold uppercase tracking-wider text-warning">Potential Idle Funds</div>
          <div className="mt-1 text-lg font-extrabold text-warning">₹{verificationResult.totalIdleLakhs.toFixed(1)}L</div>
          <div className="text-[10.5px] text-mute">{verificationResult.idleCount} dormant / idle projects</div>
        </div>

        <div className="card p-3 border-edge bg-surface">
          <div className="text-[10px] font-bold uppercase tracking-wider text-danger">Geospatial Anomalies</div>
          <div className="mt-1 text-lg font-extrabold text-danger">
            {verificationResult.unverifiedCompletedCount + verificationResult.duplicateCoordsCount}
          </div>
          <div className="text-[10.5px] text-mute">Severe drift or divergence</div>
        </div>

        <div className="card p-3 border-edge bg-surface">
          <div className="text-[10px] font-bold uppercase tracking-wider text-brand">Field Visits Recommended</div>
          <div className="mt-1 text-lg font-extrabold text-brand">{verificationResult.needsFieldVisitCount}</div>
          <div className="text-[10.5px] text-mute">Physical inspection queue</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="card relative overflow-hidden lg:col-span-3" style={{ height: 'calc(100vh - 150px)', minHeight: 560 }}>
          
          {selectedDistrict ? (
            <button
              onClick={resetToState}
              className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-edge bg-surface/90 px-3 py-1.5 text-[11px] text-mute backdrop-blur hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to {selectedState}
            </button>
          ) : selectedState ? (
            <button
              onClick={resetToNational}
              className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-edge bg-surface/90 px-3 py-1.5 text-[11px] text-mute backdrop-blur hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to India
            </button>
          ) : null}

          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <span className="chip !py-0.5">Risk</span>
            <span className="chip !py-0.5">Type</span>
            <span className="chip !py-0.5">Status</span>
            <span className="chip !py-0.5">Telemetry</span>
          </div>

          <div className={`absolute left-3 z-10 flex flex-wrap gap-1.5 ${selectedState ? 'top-12' : 'top-3'}`}>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="rounded-lg border border-edge bg-surface px-2 py-1 text-[11px] text-mute focus:outline-none">
              <option value="ALL">All Risk</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-edge bg-surface px-2 py-1 text-[11px] text-mute focus:outline-none">
              <option value="ALL">All Types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-edge bg-surface px-2 py-1 text-[11px] text-mute focus:outline-none">
              <option value="ALL">All Status</option>
              <option value="Planned">Planned</option>
              <option value="Under Construction">Under Construction</option>
              <option value="Completed">Completed</option>
              <option value="Verified">Verified</option>
              <option value="Idle">Idle</option>
              <option value="Needs Field Visit">Needs Field Visit</option>
            </select>
            {(riskFilter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button onClick={() => { setRiskFilter('ALL'); setTypeFilter('ALL'); setStatusFilter('ALL'); }} className="flex items-center gap-1 rounded-lg border border-edge bg-surface px-2 py-1 text-[11px] text-faint hover:text-ink">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <ComposableMap projection="geoMercator" projectionConfig={{ scale: 950, center: [81, 24] }} style={{ width: '100%', height: '100%' }} className="bg-transparent outline-none">
            <ZoomableGroup center={zoomCenter} zoom={zoomLevel} onMoveEnd={() => {}}>
              
              {!selectedState && (
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies
                      .filter((g) => (g.properties.name ?? '') !== '')
                      .map((geo: any) => {
                        const name = geo.properties.name as string;
                        const base = STATE_HIGHLIGHT[name] || '#141d31';
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={base}
                            stroke="#0a1020"
                            strokeWidth={0.8}
                            onClick={() => handleStateClick(geo)}
                            style={{
                              default: { outline: 'none', transition: 'fill .3s', cursor: 'pointer' },
                              hover: { fill: (STATE_HIGHLIGHT[name] ? lighten(base, 12) : name ? lighten('#141d31', 10) : '#141d31'), outline: 'none', cursor: 'pointer' },
                            }}
                          />
                        );
                      })
                  }
                </Geographies>
              )}

              {selectedState && districtGeo && (
                <Geographies geography={districtGeo}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies.map((geo: any) => {
                      const distName = geo.properties.dtname || geo.properties.district || geo.properties.name;
                      const agg = districtProjectCounts[distName];
                      const avgRisk = agg ? agg.riskSum / agg.count : 0;
                      
                      const isSelected = selectedDistrict === distName;
                      const baseFill = agg ? riskCol(avgRisk >= 80 ? 'CRITICAL' : avgRisk >= 60 ? 'HIGH' : avgRisk >= 30 ? 'MEDIUM' : 'LOW') : '#141d31';
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={baseFill}
                          stroke={isSelected ? "#ffffff" : "#0a1020"}
                          strokeWidth={isSelected ? 1.5 : 0.5}
                          onClick={() => handleDistrictClick(geo, distName)}
                          style={{
                            default: { outline: 'none', cursor: 'pointer', opacity: (agg || isSelected) ? 0.75 : 0.35 },
                            hover: { outline: 'none', cursor: 'pointer', opacity: 1 },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              )}

              {markers.map((p) => {
                const [lon, lat] = COORDS[p.id];
                const currentRadius = Math.max(0.4, 6 / zoomLevel);
                const currentStroke = Math.max(0.1, 1.5 / zoomLevel);
                const profile = verificationResult.profiles[p.id];
                const hasFlags = profile && profile.findings.length > 0;

                return (
                  <Marker key={p.id} coordinates={[lon, lat]}>
                    <g
                      onClick={(e) => { e.stopPropagation(); setSelected(p.id); }}
                      className="cursor-pointer"
                      style={{ pointerEvents: 'all' }}
                    >
                      {hasFlags && (
                        <circle
                          r={currentRadius * 2.2}
                          fill="none"
                          stroke={profile.riskLevel === 'CRITICAL' ? '#ff5860' : '#ff8a3d'}
                          strokeWidth={currentStroke * 0.9}
                          strokeDasharray="1.5,1.5"
                          opacity={0.85}
                        />
                      )}
                      <circle r={currentRadius} fill={riskCol(p.risk)} stroke="#0a1020" strokeWidth={currentStroke} />
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {selectedState && districtLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-[12px] text-mute">
              Loading {selectedState} districts…
            </div>
          )}

          {selectedState && !districtLoading && !districtGeo && (
            <div className="absolute bottom-16 left-3 right-3 z-10 rounded-lg border border-edge bg-surface/90 px-3 py-2 text-[11px] text-faint backdrop-blur">
              District boundaries unavailable for {selectedState} from the current data source — showing project markers only.
            </div>
          )}

          <AnimatePresence>
            {selectedDistrict && !selectedProj && (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                className="glass absolute bottom-3 left-3 z-20 w-[300px] rounded-2xl border border-edge2 p-4 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink">{selectedDistrict}</span>
                  <button onClick={() => setSelectedDistrict(null)} className="text-faint hover:text-ink"><X className="h-3.5 w-3.5" /></button>
                </div>
                <p className="mt-1 text-[11.5px] text-mute">{selectedState}</p>
                <div className="mt-2 text-[12px] text-mute">
                  {districtProjectCounts[selectedDistrict]?.count ?? 0} project(s) monitored in this district
                </div>
                <div className="mt-3 space-y-1.5">
                  {PROJECTS.filter((p) => p.district === selectedDistrict).map((p) => (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex items-center justify-between rounded-lg border border-edge bg-white/[0.02] px-2.5 py-1.5 text-[11px] hover:bg-white/[0.05]"
                    >
                      <span className="text-ink">{p.name}</span>
                      <RiskBadge level={p.risk} />
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedProj && (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                className="glass absolute bottom-3 left-3 z-20 w-[350px] max-h-[90%] overflow-y-auto rounded-2xl border border-edge2 p-4 shadow-soft"
              >
                {(() => {
                  const assetRec = assetRecordMap[selectedProj.id];
                  const profile = verificationResult.profiles[selectedProj.id];
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="num text-[11px] font-bold text-brand">{selectedProj.id}</span>
                          {assetRec && (
                            <span className={cn(
                              'rounded-md px-1.5 py-0.5 text-[9px] font-semibold border',
                              assetRec.demoAssetStatus === 'Completed' || assetRec.demoAssetStatus === 'Verified'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : assetRec.demoAssetStatus === 'Idle'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : assetRec.demoAssetStatus === 'Needs Field Visit'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                            )}>
                              {assetRec.demoAssetStatus}
                            </span>
                          )}
                        </div>
                        <button onClick={() => setSelected(null)} className="text-faint hover:text-ink"><X className="h-3.5 w-3.5" /></button>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-danger" />
                        <span className="text-[13px] font-bold text-ink">{selectedProj.district}, {selectedProj.state}</span>
                        <RiskBadge level={selectedProj.risk} />
                      </div>

                      <div className="mt-1 text-[13px] font-semibold text-ink">{selectedProj.name}</div>

                      <div className="mt-2 space-y-1 text-[11.5px] text-mute">
                        <div className="flex justify-between">
                          <span>Sanctioned / Spent</span>
                          <span className="num font-semibold text-ink">{sp(selectedProj.spent)} / {sp(selectedProj.allocated)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Vendor</span>
                          <span className="truncate max-w-[180px]">{selectedProj.vendor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Geospatial Risk Score</span>
                          <span className="num font-bold" style={{ color: riskCol(selectedProj.risk) }}>
                            {profile?.riskScore ?? selectedProj.riskScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Progress vs Spend bar */}
                      {assetRec && (
                        <div className="mt-2.5 rounded-lg border border-edge bg-surface/70 p-2 text-[11px]">
                          <div className="flex justify-between text-mute mb-1">
                            <span>Disbursed: <b className="text-ink">{assetRec.spendRatioPercent}%</b></span>
                            <span>Physical: <b className="text-ink">{assetRec.demoPhysicalProgressPercent}%</b></span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex">
                            <div className="bg-brand h-full" style={{ width: `${Math.min(100, assetRec.spendRatioPercent)}%` }} />
                          </div>
                          <div className="mt-1.5 flex justify-between text-[10px] text-faint">
                            <span>Photos: {assetRec.demoPhotoPassCount}/{assetRec.demoPhotoEvidenceCount} verified</span>
                            {assetRec.demoGpsDriftMeters ? (
                              <span className="text-warning">{assetRec.demoGpsDriftMeters}m GPS drift</span>
                            ) : (
                              <span>GPS: Verified</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Top finding */}
                      {profile && profile.findings.length > 0 ? (
                        <div className="mt-2.5 rounded-lg border border-warning/25 bg-warning/[0.06] p-2 text-[11px] text-warning">
                          <div className="flex items-center gap-1 font-semibold">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{profile.findings[0].title}</span>
                          </div>
                          <div className="mt-1 text-[10.5px] text-mute line-clamp-2">
                            {profile.findings[0].detail}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-danger/25 bg-danger/[0.06] px-2.5 py-2 text-[11px] text-danger">
                          <LocateFixed className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Finding: {selectedProj.finding}
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => toast(`Field inspection audit scheduled for ${selectedProj.id}`, 'info')}
                          className="btn-subtle flex-1 !py-1.5 text-[11px]"
                        >
                          Schedule Audit
                        </button>
                        <Link to={`/projects/${selectedProj.id}`} className="btn-primary flex-1 !py-1.5 text-[11px] justify-center">
                          Full Case <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-xl border border-edge bg-surface/80 px-3 py-1.5 text-[10px] text-faint backdrop-blur">
            <Satellite className="h-3.5 w-3.5 text-brand" /> Satellite base layer · 2.1 km GPS confidence
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-brand" />
              <h3 className="text-sm font-bold text-ink">Risk Hotspots</h3>
            </div>
            <div className="mt-3 space-y-2">
              {HOTSPOTS.map((h) => (
                <button
                  key={h.state}
                  onClick={() => {
                    setSelectedState(h.state);
                    setZoomCenter([81, 24]); 
                    setZoomLevel(4.5);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-edge bg-white/[0.02] px-3 py-2.5 text-left hover:bg-white/[0.05]"
                >
                  <span className={cn('h-2 w-2 rounded-full', h.count >= 30 ? 'bg-[#ff5860]' : h.count >= 20 ? 'bg-[#ff8a3d]' : 'bg-[#f0b64b]')} />
                  <span className="flex-1 text-[12px] font-semibold text-ink">{h.state}</span>
                  <div className="text-right">
                    <span className="num text-[14px] font-bold text-ink">{h.count}</span>
                    <div className="text-[9px] text-faint">cases</div>
                  </div>
                  <span className="num text-[11px] text-mute">₹{h.exposure}Cr</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Visible Markers</h3>
            <p className="num mt-0.5 text-[11px] text-mute">{markers.length} of {PROJECTS.length}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([
                ['Critical', '#ff5860'], ['High', '#ff8a3d'], ['Medium', '#f0b64b'], ['Low', '#48d29b'],
              ] as const).map(([k, c]) => (
                <div key={k} className="flex items-center gap-2 text-[11px] text-mute">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {k}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Layer 4 Verification Panel */}
      <div className="mt-6">
        <GeospatialVerificationPanel
          initialProjectId={selected ?? undefined}
          onSelectProject={(id) => setSelected(id)}
        />
      </div>
    </div>
  );
}

function lighten(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}