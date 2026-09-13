import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Printer, Share2, Download, Sparkles,
  ShieldCheck, FileBarChart, Building2, MapPin, Scale, AlertTriangle, ArrowRight,
} from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import { toast } from '@/components/ui/Toast';
import { DEMO_PROJECT } from '@/lib/data';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { icon: FileText, title: 'Project Details', text: 'Name, ID, location, constituency, sanctioned vs released & spent amounts, vendor, FY period.' },
  { icon: Scale, title: 'Financial Analysis', text: 'Spent/allocated ratio of 1.27 vs state norm 0.86. 84% of expenditure booked in final 20% of project window.' },
  { icon: AlertTriangle, title: 'AI Risk Assessment', text: 'Composite risk score 92/100. Five independent weighted signals flagged with 94% model confidence.' },
  { icon: FileBarChart, title: 'Evidence', text: '37 documents reviewed. Duplicate invoice INV-8841, GPS drift 2.1km, vendor cluster match (0.97 confidence).' },
  { icon: Building2, title: 'Vendor Analysis', text: 'ABC Infra Pvt Ltd holds 12 projects, 9 within one district (75% concentration). Shared director with another vendor.' },
  { icon: MapPin, title: 'Geospatial Verification', text: 'Satellite & photo validation: 3/14 passing. Claimed coordinates 2.1 km from reported landmark.' },
];

export default function Reports() {
  const [drafting, setDrafting] = useState(false);
  const [preview, setPreview] = useState(false);

  const generate = () => {
    setDrafting(true);
    setTimeout(() => { setDrafting(false); setPreview(true); toast('AI investigation report generated (demo)', 'success'); }, 1800);
  };

  return (
    <div className="p-5">
      <div className="mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-ink">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-mute">Generate auditable AI investigation reports</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="card p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand"><ShieldCheck className="h-8 w-8" /></div>
            <h3 className="mt-4 text-lg font-extrabold tracking-tight text-ink">Generate AI Investigation Report</h3>
            <p className="mx-auto mt-1.5 max-w-md text-[12.5px] text-mute">
              Compile findings from all five verification layers for the selected project into a print-ready, evidence-linked report.
            </p>
            <button onClick={generate} disabled={drafting} className="btn-primary mt-5 !py-3 !px-7 text-sm">
              {drafting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Assembling report…</> : <Sparkles className="h-4 w-4" />} GENERATE AI INVESTIGATION REPORT
            </button>
            {drafting && (
              <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-xl border border-edge">
                <div className="scan h-1 bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Included Analysis Sections</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <div key={s.title} className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                  <div className="flex items-center gap-2"><s.icon className="h-4 w-4 text-brand" /><span className="text-[12.5px] font-bold text-ink">{s.title}</span></div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-mute">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Report Settings</h3>
            <div className="mt-3 space-y-2">
              {[
                ['Include evidence links', true],
                ['Attach vendor graph', true],
                ['Attach satellite stills', true],
                ['Redact PII', false],
              ].map(([k, on]: any) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-edge bg-white/[0.02] px-3 py-2.5">
                  <span className="text-[12px] text-mute">{k}</span>
                  <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-white/[0.04]" >
                    <span className={cn(on ? 'translate-x-4 bg-brand' : 'translate-x-0.5 bg-faint', 'h-4 w-4 rounded-full transition-all')} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Target Project</h3>
            <div className="mt-3 rounded-xl border border-edge bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <span className="num text-[11px] font-bold text-brand">{DEMO_PROJECT.id}</span>
                <RiskBadge level={DEMO_PROJECT.risk} />
              </div>
              <div className="mt-1 text-[12.5px] font-semibold text-ink">{DEMO_PROJECT.name}</div>
              <div className="text-[11px] text-faint">{DEMO_PROJECT.district}, {DEMO_PROJECT.state}</div>
            </div>
          </div>
        </div>
      </div>

      {/* preview modal */}
      {preview && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[108] overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="mx-auto my-8 max-w-3xl rounded-2xl border border-edge2 bg-panel shadow-soft">
            <div className="flex flex-wrap items-center gap-2 border-b border-edge p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/12 text-brand"><ShieldCheck className="h-4 w-4" /></div>
              <div>
                <h3 className="text-[13.5px] font-bold text-ink">Report Preview — MP-DEL-2026-0142</h3>
                <div className="text-[10px] text-faint">FRAUDGUARD · MPLADS AI Investigation Report</div>
              </div>
              <div className="ml-auto flex gap-2">
                <button onClick={() => toast('Exported to PDF (demo)', 'success')} className="btn-ghost !py-1.5 text-[11px]"><Download className="h-3.5 w-3.5" /> Export PDF</button>
                <button onClick={() => toast('Share link copied (demo)', 'success')} className="btn-ghost !py-1.5 text-[11px]"><Share2 className="h-3.5 w-3.5" /> Share</button>
                <button onClick={() => window.print()} className="btn-ghost !py-1.5 text-[11px]"><Printer className="h-3.5 w-3.5" /> Print</button>
                <button onClick={() => setPreview(false)} className="btn-subtle !py-1.5 text-[11px]">Close</button>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="border-b border-edge pb-4 text-center">
                <div className="text-lg font-extrabold tracking-widest text-ink">FRAUDGUARD</div>
                <div className="text-[11px] uppercase tracking-wider text-faint">MPLADS AI Investigation Report</div>
                <div className="mt-2 chip mx-auto w-fit">SYNTHETIC DEMO DATA</div>
              </div>

              <ReportBlock title="1 · Project Details">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                  {[
                    ['Project ID', DEMO_PROJECT.id], ['Name', DEMO_PROJECT.name],
                    ['Location', `${DEMO_PROJECT.district}, ${DEMO_PROJECT.state}`], ['Financial Year', DEMO_PROJECT.year],
                    ['Sanctioned', '₹48,00,000'], ['Released', '₹46,00,000'],
                    ['Claimed Spent', '₹61,00,000'], ['Vendor', DEMO_PROJECT.vendor],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-edge/60 py-1"><span className="text-faint">{k}</span><span className="num font-semibold text-ink">{v}</span></div>
                  ))}
                </div>
              </ReportBlock>

              <ReportBlock title="2 · Financial Analysis">
                <p className="text-[12px] leading-relaxed text-mute">Claimed expenditure of <b className="text-ink">₹61,00,000</b> exceeds the sanctioned <b className="text-ink">₹48,00,000</b> by 27.1%. Comparable projects show a norm of 0.86 spent/allocated. Disbursement acceleration observed in the final 20% of the project window.</p>
              </ReportBlock>

              <ReportBlock title="3 · AI Risk Assessment">
                <div className="flex items-center gap-4">
                  <RiskScoreMini />
                  <p className="text-[12px] leading-relaxed text-mute">Final risk score <b className="text-danger">92/100</b> (CRITICAL) with <b className="text-ink">94%</b> model confidence. Signals: duplicate invoice, cost deviation, vendor concentration, asset verification, timeline anomaly.</p>
                </div>
              </ReportBlock>

              <ReportBlock title="4 · Evidence & Vendor Analysis">
                <ul className="space-y-1.5 text-[12px] text-mute">
                  <li className="flex gap-2"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> Duplicate invoice INV-8841 linked to MP-BR-2026-0904.</li>
                  <li className="flex gap-2"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> Vendor concentration 75% within one district (peer median 18%).</li>
                  <li className="flex gap-2"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> 37 documents reviewed; geospatial validation 3/14 passing.</li>
                </ul>
              </ReportBlock>

              <ReportBlock title="5 · Recommended Action">
                <p className="text-[12px] leading-relaxed text-mute">Assign to investigation officer for escheat/freeze proceedings. Request field verification and joint measurement. Suspend further disbursement to vendor <b className="text-ink">ABC Infra Pvt Ltd</b> pending audit.</p>
              </ReportBlock>

              <div className="flex items-center justify-between rounded-xl border border-danger/25 bg-danger/[0.06] p-4">
                <span className="text-[12px] font-bold text-danger">FINAL RISK SCORE</span>
                <span className="num text-2xl font-extrabold text-danger">92 / 100</span>
              </div>
              <div className="text-center text-[10px] text-faint">Generated by FRAUDGUARD · DEMO ENVIRONMENT — Synthetic Data · Not for official use</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-edge bg-white/[0.02] p-4">
      <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-brand">{title}</h4>
      {children}
    </div>
  );
}

function RiskScoreMini() {
  return (
    <div className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center">
      <svg width={74} height={74} className="-rotate-90">
        <circle cx={37} cy={37} r={30} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={7} />
        <circle cx={37} cy={37} r={30} fill="none" stroke="#ff5860" strokeWidth={7} strokeLinecap="round" strokeDasharray={188.5} strokeDashoffset={188.5 * (1 - 0.92)} />
      </svg>
      <div className="absolute text-[16px] font-extrabold text-danger">92</div>
    </div>
  );
}