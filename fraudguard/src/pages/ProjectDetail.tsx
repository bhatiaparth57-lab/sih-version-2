import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, FileText, Eye, MapPin, Landmark, Building2,
  Sparkles, Scale, FileCheck2, Network, TrendingUp, Layers, BrainCircuit,
  Copy, Check, ExternalLink, ShieldQuestion, QrCode,
} from 'lucide-react';
import Topbar from '@/components/Topbar';
import RiskBadge from '@/components/ui/RiskBadge';
import { RiskScore } from '@/components/ui/RiskScore';
import Modal from '@/components/ui/Modal';
import FinancialVerificationPanel from '@/components/FinancialVerificationPanel';
import GeospatialVerificationPanel from '@/components/GeospatialVerificationPanel';
import CitizenFeedbackPanel from '@/components/citizen/CitizenFeedbackPanel';
import ProjectQrModal from '@/components/citizen/ProjectQrModal';
import { projectById, DEMO_FINDINGS, rupees, Finding, Risk } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

export default function ProjectDetail() {
  const { id } = useParams();
  const p = projectById(id!) ?? projectById('MP-DEL-2026-0142')!;
  const [explain, setExplain] = useState(false);
  const [evidence, setEvidence] = useState<Finding | null>(null);
  const [computed, setComputed] = useState(p.riskScore);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const totalWeight = DEMO_FINDINGS.reduce((a, f) => a + f.weight, 0);
  const adjusted = totalWeight;

  return (
    <div className="p-5 pb-24">
      <Topbar title={p.id} subtitle={`Investigation screen · ${p.name}`} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/projects" className="btn-ghost !py-1.5 text-[11px]"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
        <RiskBadge level={p.risk} className="!text-[11px] !px-2.5 !py-1" />
        <span className="text-[12px] text-mute">Status: <span className="font-semibold text-ink">CRITICAL RISK</span></span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setQrModalOpen(true)} className="btn-subtle !py-1.5 text-[11px]">
            <QrCode className="h-3.5 w-3.5" /> Site QR Poster
          </button>
          <button onClick={() => toast('Evidence bundle queued (demo)')} className="btn-subtle !py-1.5 text-[11px]"><FileText className="h-3.5 w-3.5" /> Bundle</button>
          <button onClick={() => setExplain(true)} className="btn-primary !py-1.5 text-[11px]"><ShieldQuestion className="h-3.5 w-3.5" /> WHY THIS SCORE?</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: score */}
        <div className="card flex flex-col items-center p-6">
          <span className="label mb-2">AI Risk Score</span>
          <RiskScore value={computed} size={180} stroke={13} />
          <div className="mt-4 w-full space-y-1.5 text-[11px]">
            {[
              ['Claimed vs sanctioned', `${rupees(p.spent)} vs ${rupees(p.allocated)}`, '#ff8a3d'],
              ['Comparable norm deviation', '+27%', '#ff8a3d'],
              ['AI Confidence', '94%', '#48d29b'],
              ['Evidence reviewed', '37 documents', '#2f6bff'],
            ].map(([k, v, c]) => (
              <div key={k} className="flex justify-between rounded-lg border border-edge bg-white/[0.02] px-3 py-2">
                <span className="text-faint">{k}</span>
                <span className="num font-semibold" style={{ color: c as string }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: details */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">{p.name}</h2>
          <p className="text-[12px] text-mute">Why is this project suspicious? — Explainable AI findings</p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              [MapPin, 'Location', `${p.district}, ${p.state}`],
              [Landmark, 'Constituency', p.constituency],
              [Building2, 'Vendor', p.vendor],
              [FileText, 'Project Type', p.type],
              [FileCheck2, 'Verification', p.verify],
              [Scale, 'Financial Year', p.year],
            ].map(([Icon, k, v]: any) => (
              <div key={k} className="rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-faint"><Icon className="h-3 w-3" />{k}</div>
                <div className="mt-1 text-[12px] font-semibold text-ink">{v}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2.5">
            <h4 className="label">AI-Generated Explainable Findings</h4>
            {DEMO_FINDINGS.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 rounded-xl border border-edge bg-white/[0.02] p-3.5 transition hover:bg-white/[0.04]"
              >
                <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md', fseverity(f.severity))}>
                  {f.severity === 'CRITICAL' ? <Copy className="h-3.5 w-3.5" /> : f.severity === 'HIGH' ? <TrendingUp className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-ink">{i + 1}. {f.title}</p>
                    <span className="num shrink-0 text-[11px] font-bold text-mute">+{f.weight}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-mute">{f.detail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="chip !py-0.5 text-[10px]">Severity: <b className="text-ink">{f.severity}</b></span>
                    <span className="chip !py-0.5 text-[10px]">Confidence: <b className="num text-[#48d29b]">{f.confidence}%</b></span>
                    <button onClick={() => setEvidence(f)} className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
                      <Eye className="h-3 w-3" /> Evidence <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <FinancialVerificationPanel initialProjectId={p.id} />
      </div>

      <div className="mt-6">
        <GeospatialVerificationPanel initialProjectId={p.id} />
      </div>

      <div className="mt-6">
        <CitizenFeedbackPanel
          initialProjectId={p.id}
          onOpenQrModal={() => setQrModalOpen(true)}
        />
      </div>

      {/* explainability modal */}
      <Modal open={explain} onClose={() => setExplain(false)} title="Why this score?" subtitle="FRAUDGUARD Explainability Engine · 5 weighted signals" wide>
        <div className="mb-4 rounded-xl border border-brand/25 bg-brand/[0.06] p-4">
          <div className="flex items-start gap-3">
            <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <p className="text-[13.5px] leading-relaxed text-ink">
              The project received a risk score of <b>{p.riskScore}</b> because multiple independent signals indicate
              potential financial irregularity. Each signal is weighted by its statistical strength and cross-correlated
              across the full MPLADS portfolio.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {DEMO_FINDINGS.map((f) => (
            <div key={f.title} className="flex items-center gap-3 rounded-xl border border-edge bg-white/[0.02] px-3.5 py-2.5">
              <span className="text-[12.5px] text-mute">{f.title}</span>
              <span className={cn('num ml-auto text-[14px] font-extrabold', f.weight >= 20 ? 'text-[#ff5860]' : f.weight >= 15 ? 'text-[#ff8a3d]' : 'text-[#f0b64b]')}>
                +{f.weight}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-edge bg-white/[0.02] px-4 py-3">
          <span className="text-[12px] font-semibold text-mute">Total</span>
          <span className="num text-xl font-extrabold text-[#ff5860]">{adjusted} <span className="text-[11px] text-faint">/ 100</span></span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ['AI Confidence', '94%', '#48d29b'],
            ['Evidence Reviewed', '37', '#2f6bff'],
            ['Signals Cross-checked', '1,208', '#f0b64b'],
          ].map(([k, v, c]) => (
            <div key={k} className="rounded-xl border border-edge bg-white/[0.02] p-3 text-center">
              <div className="num text-lg font-bold" style={{ color: c as string }}>{v}</div>
              <div className="mt-0.5 text-[10px] text-faint">{k}</div>
            </div>
          ))}
        </div>
      </Modal>

      {/* evidence modal */}
      <Modal open={!!evidence} onClose={() => setEvidence(null)} title="Evidence Package" subtitle={`${evidence?.title ?? ''}`} wide>
        {evidence && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <RiskBadge level={evidence.severity} />
              <span className="chip">Confidence {evidence.confidence}%</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {evidence.evidence.map((e) => (
                <div key={e} className="rounded-xl border border-edge bg-white/[0.02] p-3">
                  <FileText className="mb-2 h-4 w-4 text-brand" />
                  <div className="text-[12px] font-semibold text-ink">{e}</div>
                  <button onClick={() => toast('Opening evidence: ' + e + ' (demo)', 'info')} className="mt-2 flex items-center gap-1 text-[11px] text-brand hover:underline">
                    Open <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-edge bg-white/[0.02] p-3 text-[11.5px] text-mute">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-ink"><Sparkles className="h-3.5 w-3.5 text-brand" /> AI link to other evidence</div>
              • Invoice INV-8841 also appears in project MP-BR-2026-0904 (duplicate)<br />
              • Vendor ABC Infra Pvt Ltd shares a director with SKM Contracts<br />
              • GPS co-ordinates 2.1 km from reported site landmark
            </div>
          </div>
        )}
      </Modal>

      {/* Project Site QR Poster Modal */}
      <ProjectQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        projectId={p.id}
      />
    </div>
  );
}

const fseverity = (s: Risk) => {
  const map: Record<Risk, string> = {
    CRITICAL: 'bg-[#ff5860]/12 text-[#ff5860]',
    HIGH: 'bg-[#ff8a3d]/12 text-[#ff8a3d]',
    MEDIUM: 'bg-[#f0b64b]/12 text-[#f0b64b]',
    LOW: 'bg-[#48d29b]/12 text-[#48d29b]',
  };
  return map[s];
};
