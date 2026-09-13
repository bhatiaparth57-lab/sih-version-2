import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, DollarSign, FileText, Building2, MapPin, Users, ChevronRight, ScanLine,
  ShieldCheck, FileSearch, ArrowRight, Play, AlertTriangle, CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import ImageAnomalyPanel from '@/components/ImageAnomalyPanel';
import FinancialVerificationPanel from '@/components/FinancialVerificationPanel';
import GeospatialVerificationPanel from '@/components/GeospatialVerificationPanel';
import { LAYERS, DETECTION, PROJECTS } from '@/lib/data';
import { DEMO_FINANCIAL_DATASET } from '@/lib/financialDemoData';
import { verifyPortfolio } from '@/lib/financialVerification';
import { getAllCitizenFeedback } from '@/lib/citizenFeedbackDemoData';
import { analyzeProjectCitizenFeedback } from '@/lib/citizenFeedbackEngine';
import { getAllDemoImages } from '@/lib/imageAnomalyDemoData';
import { runImageAnomalyAnalysis } from '@/lib/imageAnomalyEngine';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const layerIcon = ['Camera', 'DollarSign', 'Building2', 'MapPin', 'Users'];

export default function AIDetection() {
  const [active, setActive] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanCount, setScanCount] = useState<number | null>(null);

  const portfolio = useMemo(
    () =>
      verifyPortfolio({
        projectIds: PROJECTS.map((p) => p.id),
        invoices: DEMO_FINANCIAL_DATASET.invoices,
        budgets: DEMO_FINANCIAL_DATASET.budgets,
        expenditure: DEMO_FINANCIAL_DATASET.expenditure,
        referencePrices: DEMO_FINANCIAL_DATASET.referencePrices,
      }),
    [],
  );

  const financialFindingCount = portfolio.reduce((s, r) => s + r.findings.length, 0);
  const overbillingCount = portfolio.reduce(
    (s, r) => s + r.findings.filter((f) => f.ruleName.includes('budget') || f.ruleName.includes('over') || f.ruleName.includes('price') || f.ruleName.includes('mismatch') || f.ruleName.includes('duplicate')).length,
    0,
  );

  const layer1Data = useMemo(() => {
    const allImages = getAllDemoImages();
    const result = runImageAnomalyAnalysis(allImages);
    return {
      totalImages: allImages.length,
      totalFindings: result.totalFindingsCount,
      maxAnomalyScore: result.maxAnomalyScore,
      duplicateGroupsCount: result.duplicateGroups.length,
    };
  }, []);

  const layer5Data = useMemo(() => {
    const monitoredProjects = PROJECTS.map((p) => {
      const records = getAllCitizenFeedback(p.id);
      const summary = analyzeProjectCitizenFeedback(p, records);
      return { project: p, records, summary };
    }).filter((item) => item.records.length > 0);

    const totalFeedbackCount = monitoredProjects.reduce((sum, item) => sum + item.records.length, 0);
    const requiringFieldVerificationCount = monitoredProjects.filter(
      (item) => item.summary.requiresFieldInspection
    ).length;
    const withDiscrepancySignalsCount = monitoredProjects.filter(
      (item) => item.summary.findings.length > 0
    ).length;
    const maxDiscrepancyScore = Math.max(
      ...monitoredProjects.map((item) => item.summary.discrepancyScore),
      0
    );

    return {
      monitoredProjects,
      totalFeedbackCount,
      requiringFieldVerificationCount,
      withDiscrepancySignalsCount,
      maxDiscrepancyScore,
    };
  }, []);

  const runScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const total = financialFindingCount + layer1Data.totalFindings;
      setScanCount(total);
      toast(`5-Layer verification scan complete — ${layer1Data.totalFindings} image anomaly signals, ${financialFindingCount} invoice findings`, 'success');
    }, 2600);
  };

  return (
    <div className="p-5">
      <div className="mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-ink">AI Fraud Detection</h1>
        <p className="mt-1 text-sm text-mute">5-Layer AI Verification Engine — Explainable & auditable</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#f0b64b]/30 bg-[#f0b64b]/[0.06] px-3.5 py-2 text-[11.5px] text-[#f0b64b]">
        DEMO ENVIRONMENT — Synthetic Data · <span className="font-semibold">Run the full pipeline for the guided demo</span>
        <button onClick={runScan} className="btn-primary ml-auto !py-1.5 !px-3 text-[11px]">
          {scanning ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Scanning…</> : <><Play className="h-3 w-3" /> Run 5-Layer Scan</>}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          {LAYERS.map((l, i) => {
            return (
              <div
                key={l.id}
                onClick={() => setActive(i)}
                className={cn(
                  'group relative cursor-pointer rounded-2xl border p-4 transition-all duration-300',
                  active === i ? 'border-brand/40 bg-panel shadow-glow' : 'border-edge bg-white/[0.02] hover:bg-white/[0.04]',
                )}
              >
                {scanning && <div className="pointer-events-none absolute inset-x-0 top-0 h-[40%] overflow-hidden rounded-t-2xl"><div className="scan absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand/50 to-transparent" /></div>}
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', active === i ? 'bg-brand/15 text-brand' : 'bg-white/[0.03] text-faint')}>
                    {layerIcon[i] === 'Camera' && <Camera className="h-5 w-5" />}
                    {layerIcon[i] === 'DollarSign' && <DollarSign className="h-5 w-5" />}
                    {layerIcon[i] === 'FileText' && <FileText className="h-5 w-5" />}
                    {layerIcon[i] === 'Building2' && <Building2 className="h-5 w-5" />}
                    {layerIcon[i] === 'MapPin' && <MapPin className="h-5 w-5" />}
                    {layerIcon[i] === 'Users' && <Users className="h-5 w-5" />}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-[11px] font-bold text-faint">{l.id}</span>
                      <h3 className="text-[14px] font-bold text-ink">{l.title}</h3>
                      <StatusPill status={l.status} />
                    </div>
                    <p className="mt-1 text-[12px] text-mute">{l.desc}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {l.detect.map((d) => <span key={d} className="chip !py-0.5 text-[10px]">{d}</span>)}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-faint">
                      <span>Records analyzed: <b className="num text-ink">{i === 0 ? layer1Data.totalImages : i === 1 ? DEMO_FINANCIAL_DATASET.invoices.length.toLocaleString('en-IN') : i === 4 ? layer5Data.totalFeedbackCount : l.signal.analyzed.toLocaleString('en-IN')}</b></span>
                      <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-[#ff8a3d]" /> {i === 0 ? 'Anomaly Index:' : i === 4 ? 'Discrepancy Index:' : 'Risk:'} <b className="num text-[#ff8a3d]">{i === 0 ? `${layer1Data.maxAnomalyScore}/100` : i === 1 ? Math.max(...portfolio.map((r) => r.score), 0) : i === 4 ? `${layer5Data.maxDiscrepancyScore}/100` : l.signal.risk}</b></span>
                      <span className="flex items-center gap-1"><FileSearch className="h-3 w-3 text-brand" /> {i === 0 || i === 4 ? 'Advisory Signals:' : 'Evidence:'} <b className="num text-ink">{i === 0 ? layer1Data.totalFindings : i === 1 ? financialFindingCount : i === 4 ? layer5Data.withDiscrepancySignalsCount : l.signal.evidence}</b></span>
                    </div>
                  </div>
                  <ChevronRight className={cn('mt-5 h-4 w-4 shrink-0 transition', active === i ? 'text-brand' : 'text-faint')} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <span className="label">Detection Categories</span>
            <div className="mt-3 space-y-2">
              {DETECTION.map((d) => {
                const live = d.label === 'Overbilling' || d.label === 'Duplicate Billing'
                  ? (d.label === 'Overbilling' ? overbillingCount : portfolio.reduce((s, r) => s + r.findings.filter((f) => f.ruleName === 'duplicate_invoice_number').length, 0))
                  : d.alerts;
                return (
                <button key={d.label} onClick={() => {
                  if (d.label === 'Asset Verification') {
                    setActive(0);
                    toast(`${layer1Data.totalFindings} rule-based image/GPS findings from loaded evidence`, 'info');
                  } else if (d.label === 'Overbilling' || d.label === 'Duplicate Billing') {
                    setActive(1);
                    toast(`${live} rule-based finding${live === 1 ? '' : 's'} from current invoice data`, 'info');
                  } else if (d.label === 'Vendor Collusion') {
                    setActive(2);
                    toast('Opening Vendor Collusion review (demo)', 'info');
                  } else if (d.label === 'Idle Funds') {
                    setActive(3);
                    toast('Opening Idle Funds geospatial review (demo)', 'info');
                  } else {
                    toast('Opening ' + d.label + ' review (demo)', 'info');
                  }
                }} className="flex w-full items-center gap-3 rounded-xl border border-edge bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.04]">
                  <RiskBadge level={d.risk} />
                  <span className="text-[12.5px] font-semibold text-ink">{d.label}</span>
                  <span className="num ml-auto text-[14px] font-bold text-ink">{live}</span>
                  <ChevronRight className="h-4 w-4 text-faint" />
                </button>
              );})}
            </div>
          </div>

          <div className="card p-5">
            <span className="label">How the engine explains a score</span>
            <ol className="mt-3 space-y-2.5">
              {['Analyze records across 5 layers', 'Detect independent risk signals', 'Weight & cross-correlate signals', 'Produce level + confidence + evidence'].map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-[12.5px] text-mute">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[11px] font-bold text-brand">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-xl border border-edge bg-white/[0.02] p-3 text-[11.5px] text-mute">
              <ScanLine className="mb-1.5 h-4 w-4 text-brand" />
              Every finding ships with the <b className="text-ink">evidence</b> and <b className="text-ink">confidence</b> that produced it — no black box.
              <Link to="/projects/MP-DEL-2026-0142" className="mt-2 flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:underline">
                Try it on MP-DEL-2026-0142 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {active === 0 && (
        <div className="mt-6">
          {scanCount !== null && (
            <p className="mb-3 text-[12px] text-mute">Last scan: <b className="num text-ink">{layer1Data.totalFindings}</b> photographic evidence anomaly findings across {layer1Data.totalImages} records.</p>
          )}
          <ImageAnomalyPanel />
        </div>
      )}

      {active === 1 && (
        <div className="mt-6">
          {scanCount !== null && (
            <p className="mb-3 text-[12px] text-mute">Last scan: <b className="num text-ink">{financialFindingCount}</b> financial findings calculated from the loaded invoice set.</p>
          )}
          <FinancialVerificationPanel />
        </div>
      )}

      {active === 2 && (
        <div className="mt-6 card p-5 border-edge bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-ink">Layer 3: Vendor Intelligence & Collusion Detection</h3>
              <p className="text-xs text-mute mt-0.5">
                Multi-entity relationship graph and deterministic collusion indicator analysis
              </p>
            </div>
            <Link to="/vendors" className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5">
              Open Interactive Collusion Network <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Rule Engine</div>
              <div className="text-sm font-bold text-ink mt-1">Deterministic Network Analysis</div>
              <p className="text-[11px] text-mute mt-1">Checks shared synthetic PAN tokens, common physical addresses, interlocking directorships, and synchronized billing.</p>
            </div>
            <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Auditor Safeguards</div>
              <div className="text-sm font-bold text-ink mt-1">Non-Accusatory Classification</div>
              <p className="text-[11px] text-mute mt-1">Flags indicators for human inquiry without asserting criminal liability or guilt.</p>
            </div>
            <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Graph Visualization</div>
              <div className="text-sm font-bold text-ink mt-1">Zero-Dependency SVG Network</div>
              <p className="text-[11px] text-mute mt-1">Interactive nodes and pulsing relationship edges with click-to-inspect evidence inspection.</p>
            </div>
          </div>
        </div>
      )}

      {active === 3 && (
        <div className="mt-6 space-y-4">
          <div className="card p-5 border-edge bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Layer 4: Idle-Fund & Geospatial Asset Tracking</h3>
                <p className="text-xs text-mute mt-0.5">
                  Satellite + GPS cross-checks, physical progress divergence, and dormant fund monitoring
                </p>
              </div>
              <Link to="/map" className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5">
                Open National Geographic Intelligence Map <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Rule Engine</div>
                <div className="text-sm font-bold text-ink mt-1">Physical vs Spend Divergence</div>
                <p className="text-[11px] text-mute mt-1">Identifies projects where financial disbursements significantly outpace verified on-site construction progress.</p>
              </div>
              <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Spatial Telemetry</div>
                <div className="text-sm font-bold text-ink mt-1">GPS Drift & Site Proximity</div>
                <p className="text-[11px] text-mute mt-1">Measures camera geotag deviation from sanctioned landmarks and flags duplicate coordinates without site justification.</p>
              </div>
              <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Dormancy Telemetry</div>
                <div className="text-sm font-bold text-ink mt-1">Idle Fund Quantification</div>
                <p className="text-[11px] text-mute mt-1">Tracks unspent balances in inactive schemes past 180 days with non-accusatory inquiry recommendations.</p>
              </div>
            </div>
          </div>

          <GeospatialVerificationPanel />
        </div>
      )}

      {active === 4 && (
        <div className="mt-6 space-y-4">
          <div className="card p-5 border-edge bg-surface">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Layer 5 Verification
                  </span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                    Active Prototype · Advisory Telemetry
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink mt-1">
                  Layer 5: Citizen QR Feedback & Ground-Truth Verification
                </h3>
                <p className="text-xs text-mute mt-0.5">
                  Public site QR posters, coarse proximity verification, and deterministic physical observation discrepancy detection
                </p>
              </div>
              <Link
                to="/projects/MP-DEL-2026-0142"
                className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
              >
                Inspect Sample Project (MP-DEL-2026-0142) <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 4 Executive Metric Cards */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-faint">
                  Projects with Feedback
                </div>
                <div className="num mt-1 text-xl font-bold text-ink">
                  {layer5Data.monitoredProjects.length}
                </div>
                <div className="text-[10.5px] text-mute mt-0.5">
                  Sites with crowdsourced telemetry
                </div>
              </div>

              <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-faint">
                  Total Observations
                </div>
                <div className="num mt-1 text-xl font-bold text-blue-400">
                  {layer5Data.totalFeedbackCount}
                </div>
                <div className="text-[10.5px] text-mute mt-0.5">
                  Anonymous crowdsourced submissions
                </div>
              </div>

              <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-faint">
                  Discrepancy Signals
                </div>
                <div className="num mt-1 text-xl font-bold text-[#ff8a3d]">
                  {layer5Data.withDiscrepancySignalsCount}
                </div>
                <div className="text-[10.5px] text-mute mt-0.5">
                  Projects with observation variance
                </div>
              </div>

              <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-faint">
                  Field Verification Required
                </div>
                <div className="num mt-1 text-xl font-bold text-[#ff5860]">
                  {layer5Data.requiringFieldVerificationCount}
                </div>
                <div className="text-[10.5px] text-mute mt-0.5">
                  Unannounced site inspections advised
                </div>
              </div>
            </div>

            {/* How Citizen Ground-Truth Complements Layers 2-4 */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-2.5">
                How Citizen Ground-Truth Complements Layers 2–4
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
                    Layer 2 Financial Complement
                  </div>
                  <div className="text-sm font-bold text-ink mt-1">Cross-Validates Paper Invoices</div>
                  <p className="text-[11.5px] text-mute mt-1.5 leading-relaxed">
                    Invoices and fund disbursement files can appear mathematically consistent on paper, but crowdsourced observations verify whether physical construction materials and labor are present at the sanctioned location.
                  </p>
                </div>
                <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
                    Layer 3 Vendor Complement
                  </div>
                  <div className="text-sm font-bold text-ink mt-1">Verifies Contractor Presence</div>
                  <p className="text-[11.5px] text-mute mt-1.5 leading-relaxed">
                    Collusive vendor networks can shuffle tender paperwork between shared directors or addresses; local citizen observations confirm whether contracted entities are actively executing work on the ground.
                  </p>
                </div>
                <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-faint">
                    Layer 4 Geospatial Complement
                  </div>
                  <div className="text-sm font-bold text-ink mt-1">Direct Ground-Level Validation</div>
                  <p className="text-[11.5px] text-mute mt-1.5 leading-relaxed">
                    Satellite imagery suffers from cloud cover and update latency, while geo-tagged camera EXIF data can drift; visiting citizens provide direct, qualitative feedback on functional asset utility.
                  </p>
                </div>
              </div>
            </div>

            {/* Monitored Projects Table */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Projects with Crowdsourced Ground-Truth Telemetry
                </h4>
                <span className="text-[11px] text-faint">
                  {layer5Data.monitoredProjects.length} projects monitored
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-edge">
                <table className="w-full text-left text-[12px]">
                  <thead className="border-b border-edge bg-white/[0.02] text-[10.5px] font-bold uppercase tracking-wider text-faint">
                    <tr>
                      <th className="px-3 py-2.5">Project</th>
                      <th className="px-3 py-2.5">Location</th>
                      <th className="px-3 py-2.5 text-center">Observations</th>
                      <th className="px-3 py-2.5 text-center">On-Site Proximity</th>
                      <th className="px-3 py-2.5 text-center">Discrepancy Index</th>
                      <th className="px-3 py-2.5">Field Status</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge/40">
                    {layer5Data.monitoredProjects.map(({ project, records, summary }) => {
                      const onSitePct = summary.onSiteVerifiedPercent;
                      return (
                        <tr key={project.id} className="hover:bg-white/[0.02] transition">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-ink">{project.name}</div>
                            <div className="text-[10.5px] font-mono text-faint">{project.id}</div>
                          </td>
                          <td className="px-3 py-2.5 text-mute">
                            {project.district}, {project.state}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="num font-bold text-ink">{records.length}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={cn(
                              'num font-bold',
                              onSitePct >= 60 ? 'text-[#48d29b]' : 'text-[#f0b64b]'
                            )}>
                              {onSitePct}%
                            </span>
                            <span className="text-[10px] text-faint ml-1">({summary.onSiteVerifiedCount} / {records.length})</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="num font-bold text-ink mr-1.5">{summary.discrepancyScore}</span>
                            <span className={cn(
                              'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase',
                              summary.discrepancyLevel === 'CRITICAL' && 'bg-[#ff5860]/12 text-[#ff5860] border border-[#ff5860]/30',
                              summary.discrepancyLevel === 'HIGH' && 'bg-[#ff8a3d]/12 text-[#ff8a3d] border border-[#ff8a3d]/30',
                              summary.discrepancyLevel === 'MEDIUM' && 'bg-[#f0b64b]/12 text-[#f0b64b] border border-[#f0b64b]/30',
                              summary.discrepancyLevel === 'LOW' && 'bg-[#48d29b]/12 text-[#48d29b] border border-[#48d29b]/30',
                            )}>
                              {summary.discrepancyLevel}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {summary.requiresFieldInspection ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#ff8a3d]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#ff8a3d] border border-[#ff8a3d]/30">
                                <AlertTriangle className="h-3 w-3" /> Requires Field Inspection
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#48d29b]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#48d29b] border border-[#48d29b]/30">
                                <CheckCircle2 className="h-3 w-3" /> Observation Consistent
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Link
                              to={`/projects/${project.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                            >
                              Inspect <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Methodology & Privacy Notice */}
            <div className="mt-4 rounded-xl border border-edge bg-white/[0.02] p-3 text-[11px] text-mute flex items-start gap-2.5">
              <ScanLine className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
              <div>
                <b className="text-ink">Auditor Safeguards & Methodology Notice:</b> Layer 5 telemetry represents crowdsourced ground-truth observations to assist field inspection prioritization. It produces explainable, advisory discrepancy signals and does not constitute legal proof of fraud or contractor misconduct. All citizen inputs are privacy-protected via non-reversible audit tokens (<span className="font-mono text-ink">CTZ-TOK-XXXX</span>) and coarse distance bands.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Analyzing': 'text-brand border-brand/30 bg-brand/10',
    'Risk detected': 'text-[#ff5860] border-[#ff5860]/30 bg-[#ff5860]/10',
    'Monitoring': 'text-[#48d29b] border-[#48d29b]/30 bg-[#48d29b]/10',
  };
  return <span className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase', map[status])}>{status}</span>;
}