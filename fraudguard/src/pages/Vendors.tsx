import { useMemo, useState } from 'react';
import {
  Building2, Search, Filter, Network, LayoutGrid, ShieldAlert,
  AlertTriangle, Users, Layers, ExternalLink, RefreshCw
} from 'lucide-react';
import { useLiveVendors } from '@/lib/liveData';
import { PROJECTS, RISK_COLOR, type Risk } from '@/lib/data';
import {
  SYNTHETIC_DEMO_VENDORS,
  SYNTHETIC_DEMO_INVOICES,
} from '@/lib/vendorDemoData';
import { runVendorIntelligenceAnalysis } from '@/lib/vendorIntelligence';
import type { VendorRecord, VendorRelationship } from '@/lib/vendorTypes';
import VendorRelationshipGraph from '@/components/VendorRelationshipGraph';
import VendorIntelligencePanel from '@/components/VendorIntelligencePanel';
import RiskBadge from '@/components/ui/RiskBadge';
import { cn } from '@/lib/utils';

import { isSupabaseConfigured } from '@/lib/supabaseClient';

export default function Vendors() {
  const { vendors: liveVendors, loading, error } = useLiveVendors();

  const [activeTab, setActiveTab] = useState<'network' | 'directory'>('network');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | Risk>('ALL');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('v-abc');
  const [selectedRelationship, setSelectedRelationship] = useState<VendorRelationship | null>(null);

  // Normalize Vendors: In demo mode, load synthetic tokens for demonstration.
  // When connected to live Supabase, real fields are preserved and synthetic tokens are NOT attributed as verified real-world facts.
  const normalizedVendors: VendorRecord[] = useMemo(() => {
    // If live database is connected, check whether to attach demo overlay or use strictly real columns
    if (isSupabaseConfigured && liveVendors && liveVendors.length > 0) {
      return liveVendors.map((v) => ({
        id: String(v.id || `v-${v.name}`),
        name: String(v.name || 'Unknown Vendor'),
        pan: v.pan ? String(v.pan) : undefined,
        gstin: v.gstin ? String(v.gstin) : undefined,
        projectsCount: Number(v.projects_count ?? v.projects ?? 0),
        totalValueCrore: Number(v.total_value ?? v.total ?? 0),
        risk: (v.risk_level || v.risk || 'LOW') as Risk,
        riskScore: Number(v.risk_score ?? v.riskScore ?? 0),
        concentration: Number(v.concentration ?? 0),
        alerts: Number(v.alerts ?? 0),
        districtsCount: Number(v.districts_count ?? v.districts ?? 0),
        highRisk: Number(v.high_risk ?? v.highRisk ?? 0),
        established: v.established ? String(v.established) : undefined,
        relation: v.relation ? String(v.relation) : undefined,
        // Live database records do not have synthetic demo tokens attributed to them
        demoPanToken: undefined,
        demoPhysicalAddress: undefined,
        demoDirectorNames: undefined,
        demoContactDomain: undefined,
        demoBankTokenHash: undefined,
      }));
    }

    // Demo / fallback mode: Use separated synthetic demo dataset with demo-only tokens
    if (liveVendors && liveVendors.length > 0) {
      return liveVendors.map((v) => {
        const demoMatch = SYNTHETIC_DEMO_VENDORS.find(
          (d) => d.name.toLowerCase() === (v.name || '').toLowerCase() || (v.pan && d.pan === v.pan),
        );

        const record: VendorRecord = {
          id: String(v.id || demoMatch?.id || `v-${v.name}`),
          name: String(v.name || 'Unknown Vendor'),
          pan: v.pan ? String(v.pan) : demoMatch?.pan,
          gstin: v.gstin ? String(v.gstin) : demoMatch?.gstin,
          projectsCount: Number(v.projects_count ?? v.projects ?? demoMatch?.projectsCount ?? 0),
          totalValueCrore: Number(v.total_value ?? v.total ?? demoMatch?.totalValueCrore ?? 0),
          risk: (v.risk_level || v.risk || demoMatch?.risk || 'LOW') as Risk,
          riskScore: Number(v.risk_score ?? v.riskScore ?? demoMatch?.riskScore ?? 0),
          concentration: Number(v.concentration ?? demoMatch?.concentration ?? 0),
          alerts: Number(v.alerts ?? demoMatch?.alerts ?? 0),
          districtsCount: Number(v.districts_count ?? v.districts ?? demoMatch?.districtsCount ?? 0),
          highRisk: Number(v.high_risk ?? v.highRisk ?? demoMatch?.highRisk ?? 0),
          established: v.established ? String(v.established) : demoMatch?.established,
          relation: v.relation ? String(v.relation) : demoMatch?.relation,
          demoPanToken: demoMatch?.demoPanToken,
          demoPhysicalAddress: demoMatch?.demoPhysicalAddress,
          demoDirectorNames: demoMatch?.demoDirectorNames,
          demoContactDomain: demoMatch?.demoContactDomain,
          demoBankTokenHash: demoMatch?.demoBankTokenHash,
        };
        return record;
      });
    }

    return SYNTHETIC_DEMO_VENDORS;
  }, [liveVendors]);

  // Run Layer 3 Vendor Intelligence Engine
  const analysis = useMemo(() => {
    return runVendorIntelligenceAnalysis({
      vendors: normalizedVendors,
      projects: PROJECTS,
      invoices: SYNTHETIC_DEMO_INVOICES,
    });
  }, [normalizedVendors]);

  // Search & Filtered Vendors
  const filteredVendors = useMemo(() => {
    return normalizedVendors.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.pan && v.pan.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.gstin && v.gstin.toLowerCase().includes(searchQuery.toLowerCase()));

      const profile = analysis.profiles[v.id];
      const risk = profile?.riskLevel || v.risk;
      const matchesRisk = selectedRiskFilter === 'ALL' || risk === selectedRiskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [normalizedVendors, searchQuery, selectedRiskFilter, analysis]);

  const selectedProfile = analysis.profiles[selectedVendorId] || analysis.profiles[normalizedVendors[0]?.id];

  // Executive summary counts
  const totalAnalyzed = analysis.vendorsAnalyzed;
  const criticalCount = Object.values(analysis.profiles).filter((p) => p.riskLevel === 'CRITICAL').length;
  const highCount = Object.values(analysis.profiles).filter((p) => p.riskLevel === 'HIGH').length;
  const relationshipCount = analysis.allRelationships.length;
  const clusterCount = analysis.clusters.length;

  return (
    <div className="p-5 space-y-5">
      {/* Top Title & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-ink">
            Layer 3: Vendor Intelligence & Collusion Detection
          </h1>
          <p className="mt-1 text-sm text-mute">
            Rule-based network analysis of entity relationships, shared corporate tokens, tender concentration, and billing patterns
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center rounded-xl border border-edge bg-surface p-1">
          <button
            onClick={() => setActiveTab('network')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
              activeTab === 'network' ? 'bg-brand/20 text-brand' : 'text-faint hover:text-ink',
            )}
          >
            <Network className="h-3.5 w-3.5" /> Collusion Network
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
              activeTab === 'directory' ? 'bg-brand/20 text-brand' : 'text-faint hover:text-ink',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Vendor Directory
          </button>
        </div>
      </div>

      {/* Synthetic Demo Notice Banner */}
      <div className="rounded-xl border border-[#f0b64b]/30 bg-[#f0b64b]/[0.06] px-4 py-2.5 text-[12px] text-[#f0b64b] flex flex-wrap items-center justify-between gap-2">
        <span>
          {isSupabaseConfigured
            ? 'LIVE DATABASE CONNECTED — Showing registered vendors. Any simulated relationship attributes are synthetic demonstration overlays and are never presented as verified real-world facts.'
            : 'DEMO ENVIRONMENT — All PANs, addresses, director names, email domains, and banking token hashes are synthetic demonstration data. Real government/tax records are not processed.'}
        </span>
        <span className="chip !py-0.5 text-[10px] text-[#f0b64b] border-[#f0b64b]/30">
          DETERMINISTIC RULE ENGINE
        </span>
      </div>

      {loading && <p className="text-[12px] text-mute">Loading vendor profiles and computing relationship graph...</p>}
      {error && <p className="text-[12px] text-danger">Database warning: {error} (Falling back to synthetic demo data)</p>}

      {/* Executive Metric Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Entities Analyzed</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-ink">{totalAnalyzed}</span>
            <span className="text-[11px] text-mute">contractors</span>
          </div>
        </div>

        <div className="card p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Flagged Collusion Ties</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-[#ff5860]">{relationshipCount}</span>
            <span className="text-[11px] text-mute">suspicious relationships</span>
          </div>
        </div>

        <div className="card p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Identified Clusters</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-[#ff8a3d]">{clusterCount}</span>
            <span className="text-[11px] text-mute">interlinked rings</span>
          </div>
        </div>

        <div className="card p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-faint">High / Critical Risk</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-[#ff5860]">
              {criticalCount + highCount}
            </span>
            <span className="text-[11px] text-mute">({criticalCount} critical)</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Search vendors by name, PAN, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-edge bg-surface py-2 pl-9 pr-4 text-[12px] text-ink placeholder-faint outline-none focus:border-brand/50"
          />
        </div>

        {/* Risk Level Filter Chips */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedRiskFilter(lvl)}
              className={cn(
                'rounded-lg px-2.5 py-1 font-bold transition',
                selectedRiskFilter === lvl
                  ? 'bg-brand/20 text-brand border border-brand/40'
                  : 'bg-white/[0.02] text-faint border border-edge hover:text-ink',
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: COLLUSION NETWORK & INTELLIGENCE */}
      {activeTab === 'network' && (
        <div className="space-y-4">
          {/* Detected Collusion Clusters Drawer */}
          {analysis.clusters.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-faint">
                Identified Collusion Clusters ({analysis.clusters.length})
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {analysis.clusters.map((c) => (
                  <div
                    key={c.id}
                    className="card p-3 border-edge/80 hover:border-brand/40 transition cursor-pointer"
                    onClick={() => {
                      if (c.vendorIds[0]) setSelectedVendorId(c.vendorIds[0]);
                      setSelectedRelationship(null);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-ink">{c.label}</span>
                      <RiskBadge level={c.severity} />
                    </div>
                    <p className="mt-1 text-[11px] text-mute line-clamp-2">{c.primaryIndicator}</p>
                    <div className="mt-2 text-[10px] text-brand flex items-center gap-1">
                      <span>{c.evidenceCount} relationship ties detected</span> · <span>Click to inspect</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Graph & Detail Panel Side-by-Side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <VendorRelationshipGraph
                analysis={analysis}
                vendors={filteredVendors}
                selectedVendorId={selectedVendorId}
                selectedRelationshipId={selectedRelationship?.id || null}
                onSelectVendor={(id) => {
                  setSelectedVendorId(id);
                  setSelectedRelationship(null);
                }}
                onSelectRelationship={(rel) => {
                  setSelectedRelationship(rel);
                  if (rel) setSelectedVendorId(rel.sourceVendorId);
                }}
              />
            </div>

            <div className="lg:col-span-5">
              <VendorIntelligencePanel
                profile={selectedProfile}
                selectedRelationship={selectedRelationship}
                onSelectVendor={(id) => {
                  setSelectedVendorId(id);
                  setSelectedRelationship(null);
                }}
                onClearRelationship={() => setSelectedRelationship(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ORIGINAL VENDOR DIRECTORY (Enhanced with Risk Badges & Click to Inspect) */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredVendors.length === 0 && (
            <p className="text-[12px] text-mute col-span-3 text-center py-10">
              No vendors match the search or risk filter criteria.
            </p>
          )}

          {filteredVendors.map((v) => {
            const profile = analysis.profiles[v.id];
            const risk = profile?.riskScore ?? v.riskScore ?? 0;
            const riskLevel = profile?.riskLevel || v.risk || 'LOW';

            return (
              <div
                key={v.id}
                className={cn(
                  'card p-4 transition-all hover:border-brand/40',
                  selectedVendorId === v.id ? 'border-brand/60 bg-panel' : '',
                )}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface border border-edge">
                      <Building2 className="h-5 w-5 text-mute" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-ink">{v.name}</h3>
                        <RiskBadge level={riskLevel} />
                      </div>
                      <p className="text-[10px] text-faint mt-0.5">
                        PAN {v.pan || 'N/A'} · GST {v.gstin || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collusion indicator chip if flagged */}
                {profile && profile.findings.length > 0 && (
                  <div className="mb-3 rounded-lg border border-[#ff5860]/20 bg-[#ff5860]/[0.04] px-2.5 py-1 text-[11px] text-[#ff5860] flex items-center justify-between">
                    <span>{profile.findings.length} collusion indicators</span>
                    <span className="font-mono font-bold">{risk}/100</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <StatBox label="PROJECTS" value={v.projectsCount} />
                  <StatBox label="VALUE" value={`₹${v.totalValueCrore}Cr`} />
                  <StatBox label="RISK SCORE" value={`${risk}/100`} />
                  <StatBox label="CONCENTRATION" value={`${v.concentration}%`} />
                  <StatBox label="DISTRICTS" value={v.districtsCount} />
                  <StatBox label="ALERTS" value={v.alerts} />
                </div>

                <div className="mt-3 border-t border-edge/60 pt-3 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedVendorId(v.id);
                      setSelectedRelationship(null);
                      setActiveTab('network');
                    }}
                    className="btn-outline !py-1 !px-2.5 text-[11px] w-full flex items-center justify-center gap-1 text-brand"
                  >
                    <Network className="h-3.5 w-3.5" /> Inspect in Collusion Graph
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-edge bg-white/[0.02] p-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1 text-[13px] font-bold text-ink">{value}</div>
    </div>
  );
}