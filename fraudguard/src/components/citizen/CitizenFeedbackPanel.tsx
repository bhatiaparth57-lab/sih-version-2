// src/components/citizen/CitizenFeedbackPanel.tsx
//
// Layer 5: Citizen QR Feedback & Ground-Truth Verification Panel
// Internal auditor view for crowdsourced site feedback and deterministic discrepancy analysis.

import React, { useMemo, useState } from 'react';
import {
  Users,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Star,
  Camera,
  Layers,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { projectById } from '@/lib/data';
import { getAllCitizenFeedback } from '@/lib/citizenFeedbackDemoData';
import { analyzeProjectCitizenFeedback } from '@/lib/citizenFeedbackEngine';
import type {
  CitizenFeedbackRecord,
  CitizenDiscrepancySeverity,
} from '@/lib/citizenFeedbackTypes';
import RiskBadge from '@/components/ui/RiskBadge';
import ProjectQrModal from '@/components/citizen/ProjectQrModal';
import { cn } from '@/lib/utils';

export interface CitizenFeedbackPanelProps {
  initialProjectId: string;
  onOpenQrModal?: () => void;
}

const severityColorMap: Record<CitizenDiscrepancySeverity, string> = {
  CRITICAL: 'bg-[#ff5860]/12 text-[#ff5860] border-[#ff5860]/30',
  HIGH: 'bg-[#ff8a3d]/12 text-[#ff8a3d] border-[#ff8a3d]/30',
  MEDIUM: 'bg-[#f0b64b]/12 text-[#f0b64b] border-[#f0b64b]/30',
  LOW: 'bg-[#48d29b]/12 text-[#48d29b] border-[#48d29b]/30',
};

export default function CitizenFeedbackPanel({
  initialProjectId,
  onOpenQrModal,
}: CitizenFeedbackPanelProps) {
  const [internalQrOpen, setInternalQrOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'feed'>('summary');

  const project = useMemo(() => projectById(initialProjectId), [initialProjectId]);
  const feedbackRecords: CitizenFeedbackRecord[] = useMemo(
    () => getAllCitizenFeedback(initialProjectId),
    [initialProjectId]
  );

  const summary = useMemo(
    () => analyzeProjectCitizenFeedback(project, feedbackRecords),
    [project, feedbackRecords]
  );

  const handleOpenQr = () => {
    if (onOpenQrModal) {
      onOpenQrModal();
    } else {
      setInternalQrOpen(true);
    }
  };

  if (!project) {
    return (
      <div className="card p-5 text-center text-xs text-mute">
        Project information not found for citizen feedback evaluation.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Internal QR Modal fallback */}
      <ProjectQrModal
        isOpen={internalQrOpen}
        onClose={() => setInternalQrOpen(false)}
        projectId={project.id}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Layer 5 Verification
              </span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                Citizen Ground-Truth
              </span>
            </div>
            <h3 className="text-base font-bold text-ink">
              Citizen QR Feedback & Field Observation Audit
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-edge bg-white/[0.02] p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('summary')}
              className={cn(
                'rounded-lg px-3 py-1 text-[11px] font-medium transition',
                activeTab === 'summary' ? 'bg-white/[0.08] text-ink shadow-sm' : 'text-mute hover:text-ink'
              )}
            >
              Summary & Signals
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={cn(
                'rounded-lg px-3 py-1 text-[11px] font-medium transition',
                activeTab === 'feed' ? 'bg-white/[0.08] text-ink shadow-sm' : 'text-mute hover:text-ink'
              )}
            >
              Observation Log ({summary.totalFeedbackCount})
            </button>
          </div>

          <button
            onClick={handleOpenQr}
            className="btn-primary flex items-center gap-1.5 !py-1.5 text-[11px]"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Generate QR Poster</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 space-y-5">
        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
            <span className="text-[10px] font-medium text-faint">Total Submissions</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-xl font-bold text-ink">{summary.totalFeedbackCount}</span>
              <span className="text-[10px] text-mute">crowdsourced</span>
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
            <span className="text-[10px] font-medium text-faint">On-Site Verified Proximity</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-xl font-bold text-[#48d29b]">{summary.onSiteVerifiedPercent}%</span>
              <span className="text-[10px] text-mute">({summary.onSiteVerifiedCount} ≤ 150m)</span>
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
            <span className="text-[10px] font-medium text-faint">Average Quality Rating</span>
            <div className="mt-1 flex items-center gap-1">
              <span className="num text-xl font-bold text-ink">
                {summary.totalFeedbackCount > 0 ? summary.averageRating : '—'}
              </span>
              {summary.totalFeedbackCount > 0 && (
                <div className="flex text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-current" />
                </div>
              )}
              <span className="text-[10px] text-faint">/ 5.0</span>
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
            <span className="text-[10px] font-medium text-faint">Discrepancy Index</span>
            <div className="mt-1 flex items-center justify-between">
              <span
                className={cn(
                  'num text-xl font-extrabold',
                  summary.discrepancyScore >= 70
                    ? 'text-[#ff5860]'
                    : summary.discrepancyScore >= 40
                    ? 'text-[#ff8a3d]'
                    : 'text-[#48d29b]'
                )}
              >
                {summary.discrepancyScore}
                <span className="text-[11px] font-normal text-faint">/100</span>
              </span>
              <RiskBadge level={summary.discrepancyLevel} className="!text-[9px] !py-0.5 !px-1.5" />
            </div>
          </div>
        </div>

        {/* TAB 1: SUMMARY & DISCREPANCY FINDINGS */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Contrast: Official vs Citizen Telemetry */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Official Records Card */}
              <div className="rounded-xl border border-edge bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <FileCheck className="h-4 w-4 text-blue-400" />
                    <span>Official Administrative Record</span>
                  </div>
                  <span className="chip !py-0 text-[10px]">Registry Data</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-edge/40">
                    <span className="text-mute">Recorded Status:</span>
                    <span className="font-semibold text-ink">{project.verify}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-edge/40">
                    <span className="text-mute">Disbursement:</span>
                    <span className="font-semibold text-ink">
                      ₹{project.spent}L spent / ₹{project.allocated}L allocated ({Math.round((project.spent / (project.allocated || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-mute">Contractor / Vendor:</span>
                    <span className="font-semibold text-ink truncate max-w-[180px]">{project.vendor}</span>
                  </div>
                </div>
              </div>

              {/* Citizen Telemetry Breakdown */}
              <div className="rounded-xl border border-edge bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span>Crowdsourced Ground-Truth Telemetry</span>
                  </div>
                  <span className="chip !py-0 text-[10px]">On-Site QR Stream</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-edge/40">
                    <span className="text-mute">Observed Status Distribution:</span>
                    <span className="font-medium text-ink">
                      {summary.statusDistribution.completed} Completed • {summary.statusDistribution.in_progress} Active • {summary.statusDistribution.abandoned + summary.statusDistribution.not_started} Stalled/Inactive
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-edge/40">
                    <span className="text-mute">Reported Defects / Issues:</span>
                    <span className="font-medium text-amber-400">
                      {summary.issueFrequency.substandard_materials + summary.issueFrequency.delayed_timeline + summary.issueFrequency.signboard_missing} issues logged
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-mute">Ground Inspection Status:</span>
                    <span className={cn('font-semibold', summary.requiresFieldInspection ? 'text-[#ff8a3d]' : 'text-[#48d29b]')}>
                      {summary.requiresFieldInspection ? 'Field Inspection Recommended' : 'Consistent with Norms'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Field Verification Recommendation Alert */}
            {summary.requiresFieldInspection ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-100">Advisory Field Inspection Recommended:</strong>{' '}
                  On-site citizen feedback exhibits material divergence from recorded project execution. An unannounced site visit by an assistant engineer is recommended to verify actual works.
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-emerald-100">Citizen Observations Consistent:</strong>{' '}
                  Visiting citizen observations align with administrative records. No ground-truth variance detected.
                </div>
              </div>
            )}

            {/* Explainable Discrepancy Findings */}
            {summary.findings.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <h4 className="label">Citizen Discrepancy Signals & Explainable Evidence</h4>
                {summary.findings.map((f, idx) => (
                  <div
                    key={f.ruleId}
                    className="rounded-xl border border-edge bg-white/[0.02] p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold border',
                            severityColorMap[f.severity]
                          )}
                        >
                          {f.severity}
                        </span>
                        <h5 className="text-xs font-bold text-ink">
                          {idx + 1}. {f.label}
                        </h5>
                      </div>
                      <span className="num text-[11px] font-bold text-mute">+{f.scoreImpact} pts</span>
                    </div>

                    <p className="text-[11.5px] leading-relaxed text-mute">{f.description}</p>

                    {/* Evidence Points */}
                    <div className="space-y-1 text-[11px] text-faint pl-2 border-l-2 border-edge">
                      {f.evidence.map((ev, i) => (
                        <div key={i}>• {ev}</div>
                      ))}
                    </div>

                    <div className="pt-1 text-[11px] text-blue-400 font-medium">
                      Recommended Action: <span className="text-ink">{f.recommendedAction}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRIVACY-SAFE OBSERVATION LOG */}
        {activeTab === 'feed' && (
          <div className="space-y-3">
            {summary.records.length === 0 ? (
              <div className="rounded-xl border border-dashed border-edge p-8 text-center space-y-3">
                <Users className="h-8 w-8 text-mute mx-auto opacity-50" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-ink">No Citizen Observations Logged Yet</p>
                  <p className="text-[11px] text-mute max-w-sm mx-auto">
                    Deploy the on-site QR poster at the physical works location so visiting citizens can record verified observations.
                  </p>
                </div>
                <button
                  onClick={handleOpenQr}
                  className="btn-primary !py-1.5 !px-3 text-xs inline-flex items-center gap-1.5"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Print Site QR Poster
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {summary.records.map((r) => {
                  const proximityBadge =
                    r.proximityStatus === 'on_site'
                      ? { label: 'Verified On-Site (< 150m)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
                      : r.proximityStatus === 'proximate'
                      ? {
                          label: `Proximate (~${r.coarseDistanceMeters ?? 200}m)`,
                          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                        }
                      : r.proximityStatus === 'distant'
                      ? { label: 'Remote (> 1km)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
                      : { label: 'Unverified Proximity', color: 'text-mute bg-white/[0.04] border-edge' };

                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-edge bg-white/[0.02] p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {r.citizenToken}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border', proximityBadge.color)}>
                            {proximityBadge.label}
                          </span>
                        </div>

                        <span className="text-[10px] text-faint">
                          {new Date(r.submittedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                        <div>
                          <span className="text-faint">Observed: </span>
                          <strong className="text-ink capitalize">{r.observedStatus.replace('_', ' ')}</strong>
                        </div>

                        <div className="flex items-center gap-1 text-amber-400">
                          <span className="text-faint mr-1">Rating: </span>
                          {Array.from({ length: r.qualityRating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </div>

                        {r.hasPhotoProof && (
                          <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                            <Camera className="h-3 w-3" /> Photo proof attached
                          </span>
                        )}
                      </div>

                      {r.issuesReported.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {r.issuesReported.map((issue) => (
                            <span
                              key={issue}
                              className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]"
                            >
                              {issue.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {r.comment && (
                        <p className="text-[11px] italic text-mute bg-white/[0.01] p-2 rounded-lg border border-edge/50">
                          "{r.comment}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Privacy & Methodology Disclaimer */}
        <div className="flex items-start gap-2.5 rounded-xl border border-edge bg-white/[0.01] p-3 text-[11px] text-faint">
          <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-mute">Methodology & Privacy Notice:</span> Citizen feedback represents crowdsourced ground-truth observations to assist field inspection prioritization. It does not constitute legal proof of fraud, contractor misconduct, or criminal violation. Raw phone numbers are hashed into non-reversible audit tokens (<code className="font-mono text-blue-400">CTZ-TOK-XXXX</code>), and exact citizen GPS coordinates are never stored or displayed to auditors.
          </div>
        </div>
      </div>
    </div>
  );
}
