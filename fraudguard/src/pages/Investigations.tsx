import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bell, BrainCircuit, FileText, User, Truck, Check, ChevronDown,
  UserRound, MapPinned, Upload, MessageSquare, FileBarChart, FolderX, Link2, Gavel,
  Users, AlertTriangle, CheckCircle2, ShieldCheck, ArrowRight,
  ExternalLink,
} from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import { CASE_TIMELINE, projectById, Risk } from '@/lib/data';
import { getAllCitizenFeedback } from '@/lib/citizenFeedbackDemoData';
import { analyzeProjectCitizenFeedback } from '@/lib/citizenFeedbackEngine';
import type { CitizenFeedbackRecord, CitizenFeedbackIssue } from '@/lib/citizenFeedbackTypes';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface InvestigationCase {
  id: string;
  caseNumber: string;
  projectId: string;
  severity: Risk;
  status: string;
  assignedOfficer: string;
  riskScore: string;
  aiConfidence: string;
  linkedAlerts: number;
  vendorsInvolved: number;
  potentialExposure: string;
  invoiceDoc: string;
  initialNotes: {
    author: string;
    time: string;
    text: string;
  }[];
}

const CASES: readonly InvestigationCase[] = [
  {
    id: 'case-1',
    caseNumber: 'CASE #FG-2026-00421',
    projectId: 'MP-DEL-2026-0142',
    severity: 'CRITICAL',
    status: 'Under Investigation',
    assignedOfficer: 'A. Sharma',
    riskScore: '92/100',
    aiConfidence: '94%',
    linkedAlerts: 3,
    vendorsInvolved: 2,
    potentialExposure: '₹2,20,000',
    invoiceDoc: 'Invoice INV-8841',
    initialNotes: [
      {
        author: 'A. Sharma',
        time: '10:12',
        text: 'Requested supporting completion certificate & joint measurement book.',
      },
    ],
  },
  {
    id: 'case-2',
    caseNumber: 'CASE #FG-2026-00551',
    projectId: 'MP-KA-2026-0551',
    severity: 'HIGH',
    status: 'Field Review Queued',
    assignedOfficer: 'P. Kulkarni',
    riskScore: '84/100',
    aiConfidence: '91%',
    linkedAlerts: 2,
    vendorsInvolved: 1,
    potentialExposure: '₹1,85,000',
    invoiceDoc: 'Invoice INV-5510',
    initialNotes: [
      {
        author: 'P. Kulkarni',
        time: '11:30',
        text: 'Multiple citizen reports received regarding stalled water pipeline and uninstalled project signboards.',
      },
    ],
  },
  {
    id: 'case-3',
    caseNumber: 'CASE #FG-2026-00603',
    projectId: 'MP-WB-2026-0603',
    severity: 'HIGH',
    status: 'Audit Scheduled',
    assignedOfficer: 'S. Banerjee',
    riskScore: '78/100',
    aiConfidence: '87%',
    linkedAlerts: 2,
    vendorsInvolved: 1,
    potentialExposure: '₹1,40,000',
    invoiceDoc: 'Invoice INV-6032',
    initialNotes: [
      {
        author: 'S. Banerjee',
        time: '14:15',
        text: 'Tube well mechanism reported missing by proximate residents despite 100% fund disbursement.',
      },
    ],
  },
  {
    id: 'case-4',
    caseNumber: 'CASE #FG-2026-01120',
    projectId: 'MP-TN-2026-1120',
    severity: 'LOW',
    status: 'Routine Review',
    assignedOfficer: 'R. Raman',
    riskScore: '14/100',
    aiConfidence: '96%',
    linkedAlerts: 0,
    vendorsInvolved: 1,
    potentialExposure: '₹0',
    invoiceDoc: 'Invoice INV-1120',
    initialNotes: [
      {
        author: 'R. Raman',
        time: '09:00',
        text: 'Citizen observations corroborate completed drainage work. No physical discrepancies observed.',
      },
    ],
  },
];

const ACTIONS = [
  { label: 'Assign Officer', icon: UserRound, color: 'text-brand' },
  { label: 'Request Field Verification', icon: MapPinned, color: 'text-[#f0b64b]' },
  { label: 'Upload Evidence', icon: Upload, color: 'text-[#48d29b]' },
  { label: 'Add Comment', icon: MessageSquare, color: 'text-mute' },
  { label: 'Generate Report', icon: FileBarChart, color: 'text-[#ff8a3d]' },
  { label: 'Close Case', icon: FolderX, color: 'text-danger' },
];

const timelineIcon = [Bell, BrainCircuit, FileText, User, Truck, Check];

const issueLabelMap: Record<CitizenFeedbackIssue, string> = {
  delayed_timeline: 'Delayed Timeline',
  substandard_materials: 'Substandard Materials',
  no_work_visible: 'No Work Visible',
  signboard_missing: 'Signboard Missing',
  site_abandoned: 'Site Inactive / Abandoned',
  access_blocked: 'Public Access Blocked',
};

export default function Investigations() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(CASES[0].id);
  const [panel, setPanel] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Record<string, { author: string; time: string; text: string }[]>>({});
  const [noteInput, setNoteInput] = useState('');

  const currentCase = useMemo(
    () => CASES.find((c) => c.id === selectedCaseId) || CASES[0],
    [selectedCaseId]
  );

  const displayedNotes = useMemo(() => {
    const extra = customNotes[currentCase.id] || [];
    return [...currentCase.initialNotes, ...extra];
  }, [currentCase, customNotes]);

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    const newNote = {
      author: 'A. Sharma',
      time: 'Just now',
      text: noteInput.trim(),
    };
    setCustomNotes((prev) => ({
      ...prev,
      [currentCase.id]: [...(prev[currentCase.id] || []), newNote],
    }));
    setNoteInput('');
    toast('Note added to case ledger (demo)', 'success');
  };

  const project = useMemo(
    () => projectById(currentCase.projectId),
    [currentCase.projectId]
  );

  const citizenRecords: CitizenFeedbackRecord[] = useMemo(
    () => getAllCitizenFeedback(currentCase.projectId),
    [currentCase.projectId]
  );

  const citizenSummary = useMemo(
    () => analyzeProjectCitizenFeedback(project, citizenRecords),
    [project, citizenRecords]
  );

  // Dynamic Case Timeline including citizen ground-truth advisory step if discrepancies exist
  const timeline = useMemo(() => {
    const base = [...CASE_TIMELINE];
    if (citizenSummary.findings.length > 0) {
      // Insert citizen ground-truth timeline event before resolution
      const withCitizen = [
        base[0],
        base[1],
        base[2],
        {
          label: 'Citizen Ground-Truth Advisory Logged',
          time: '06 Sep 2026 · 10:45',
          icon: 'users',
          done: true,
        },
        base[3],
        base[4],
        base[5],
      ];
      return withCitizen;
    }
    return base;
  }, [citizenSummary]);

  const act = (label: string) => {
    if (label === 'Close Case') {
      toast('Case on-hold — pending field verification (demo)', 'warn');
    } else if (label === 'Generate Report') {
      toast(`AI investigation report drafted for ${currentCase.caseNumber} (demo)`, 'success');
    } else if (label === 'Request Field Verification') {
      toast(`Priority field inspection requested for ${currentCase.projectId} (demo)`, 'success');
    } else {
      toast(`${label} — action queued (demo)`, 'info');
    }
  };

  return (
    <div className="p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-ink">Investigation Case Management</h1>
          <p className="mt-1 text-sm text-mute">Turn AI alerts and ground-truth discrepancies into auditable, actionable cases</p>
        </div>

        {/* Case Switcher Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-faint">Active Case:</span>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="rounded-xl border border-edge bg-panel px-3 py-1.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none"
          >
            {CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} · {c.projectId} ({c.severity})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Case Header Card */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/12 text-danger">
                  <Gavel className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-extrabold tracking-tight text-ink">{currentCase.caseNumber}</h2>
                    <RiskBadge level={currentCase.severity} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-mute">
                    <span>
                      Project:{' '}
                      <Link
                        to={`/projects/${currentCase.projectId}`}
                        className="font-bold text-brand hover:underline inline-flex items-center gap-1"
                      >
                        {currentCase.projectId}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </span>
                    <span className="text-faint">·</span>
                    <span>Status: <b className="text-[#f0b64b]">{currentCase.status}</b></span>
                    <span className="text-faint">·</span>
                    <span>Assigned Officer: <b className="text-ink">{currentCase.assignedOfficer}</b></span>
                  </div>
                </div>
              </div>

              {project && (
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-ink">{project.name}</div>
                  <div className="text-[11px] text-mute">{project.district}, {project.state}</div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => act(a.label)}
                  className="btn-subtle !justify-start !px-3 !py-2.5 text-[11.5px]"
                >
                  <a.icon className={cn('h-4 w-4', a.color)} /> {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Card */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Case Timeline</h3>
            <p className="mt-0.5 text-[11px] text-mute">Live status of the investigation workflow</p>
            <div className="mt-4 flex flex-col gap-0">
              {timeline.map((t, i) => {
                const Icon = t.icon === 'users' ? Users : timelineIcon[i % timelineIcon.length];
                const isLast = i === timeline.length - 1;
                const isCitizenStep = t.icon === 'users';
                return (
                  <div key={t.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border',
                          isCitizenStep
                            ? 'border-blue-500/40 bg-blue-500/12 text-blue-400'
                            : t.done
                            ? 'border-[#48d29b]/40 bg-[#48d29b]/12 text-[#48d29b]'
                            : 'border-edge bg-white/[0.02] text-faint'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isLast && (
                        <div
                          className={cn('w-px flex-1', t.done ? 'bg-[#48d29b]/30' : 'bg-edge')}
                          style={{ minHeight: 24 }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[13px] font-semibold', t.done ? 'text-ink' : 'text-faint')}>
                          {t.label}
                        </span>
                        <span className={cn('text-[10px]', isCitizenStep ? 'text-blue-400' : t.done ? 'text-[#48d29b]' : 'text-faint')}>
                          {t.time}
                        </span>
                      </div>
                      {isCitizenStep && (
                        <p className="mt-0.5 text-[11px] text-mute">
                          Crowdsourced physical site observations logged via public QR poster. Discrepancy score: {citizenSummary.discrepancyScore}/100.
                        </p>
                      )}
                      {!t.done && (
                        <button
                          onClick={() => toast('Advancing workflow step (demo)', 'info')}
                          className="chip mt-1.5 !border-brand/40 text-brand"
                        >
                          Advance step
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clearly Labeled "Citizen Ground-Truth Evidence" Section */}
          <div className="card p-5 border-edge bg-surface">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-ink">Citizen Ground-Truth Evidence</h3>
                    <span className="rounded-md bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">
                      Layer 5 Advisory Evidence
                    </span>
                  </div>
                  <p className="text-[11px] text-mute mt-0.5">
                    Crowdsourced site observations and physical status telemetry for {currentCase.projectId}
                  </p>
                </div>
              </div>

              <Link
                to={`/projects/${currentCase.projectId}`}
                className="text-[11.5px] font-semibold text-brand hover:underline flex items-center gap-1"
              >
                Open Project QR Portal <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* 4 Citizen Telemetry Cards */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="text-[10px] font-medium text-faint">Total Citizen Submissions</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="num text-lg font-bold text-ink">{citizenSummary.totalFeedbackCount}</span>
                  <span className="text-[10px] text-mute">observations</span>
                </div>
                <div className="text-[9.5px] text-faint mt-0.5">
                  {citizenSummary.records.filter((r) => r.hasPhotoProof).length} with photo attachments
                </div>
              </div>

              <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="text-[10px] font-medium text-faint">Observed Status Breakdown</div>
                <div className="mt-1 text-[11px] font-semibold text-ink space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-mute">Completed:</span>
                    <span className="num text-ink">{citizenSummary.statusDistribution.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mute">Active / Stalled:</span>
                    <span className="num text-[#ff8a3d]">
                      {citizenSummary.statusDistribution.in_progress + citizenSummary.statusDistribution.not_started + citizenSummary.statusDistribution.abandoned}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="text-[10px] font-medium text-faint">Reported Defects & Issues</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="num text-lg font-bold text-[#ff8a3d]">
                    {Object.values(citizenSummary.issueFrequency).reduce((s, c) => s + c, 0)}
                  </span>
                  <span className="text-[10px] text-mute">issues reported</span>
                </div>
                <div className="text-[9.5px] text-faint mt-0.5">
                  Avg satisfaction: {citizenSummary.totalFeedbackCount > 0 ? `${citizenSummary.averageRating} / 5.0` : '—'}
                </div>
              </div>

              <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="text-[10px] font-medium text-faint">Coarse Proximity Summary</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="num text-lg font-bold text-[#48d29b]">{citizenSummary.onSiteVerifiedPercent}%</span>
                  <span className="text-[10px] text-mute">verified on-site</span>
                </div>
                <div className="text-[9.5px] text-faint mt-0.5">
                  {citizenSummary.onSiteVerifiedCount} ≤ 150m · {citizenSummary.records.filter((r) => r.proximityStatus === 'proximate').length} proximate
                </div>
              </div>
            </div>

            {/* Reported Defect Chips */}
            {Object.values(citizenSummary.issueFrequency).some((c) => c > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] text-faint mr-1">Reported issue tags:</span>
                {(Object.entries(citizenSummary.issueFrequency) as [CitizenFeedbackIssue, number][])
                  .filter(([, count]) => count > 0)
                  .map(([issue, count]) => (
                    <span key={issue} className="chip !py-0.5 text-[10px] border-[#ff8a3d]/30 text-[#ff8a3d] bg-[#ff8a3d]/10">
                      {issueLabelMap[issue]} ({count})
                    </span>
                  ))}
              </div>
            )}

            {/* Layer 5 Deterministic Discrepancy Signals */}
            <div className="mt-4 space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink">
                Deterministic Discrepancy Signals & Explainable Evidence
              </h4>

              {citizenSummary.findings.length > 0 ? (
                citizenSummary.findings.map((f, i) => (
                  <div
                    key={f.ruleId}
                    className="rounded-xl border border-edge bg-white/[0.02] p-3.5 transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase',
                            f.severity === 'CRITICAL' && 'bg-[#ff5860]/12 text-[#ff5860] border border-[#ff5860]/30',
                            f.severity === 'HIGH' && 'bg-[#ff8a3d]/12 text-[#ff8a3d] border border-[#ff8a3d]/30',
                            f.severity === 'MEDIUM' && 'bg-[#f0b64b]/12 text-[#f0b64b] border border-[#f0b64b]/30',
                            f.severity === 'LOW' && 'bg-[#48d29b]/12 text-[#48d29b] border border-[#48d29b]/30',
                          )}
                        >
                          {f.severity}
                        </span>
                        <span className="text-[12.5px] font-semibold text-ink">
                          {i + 1}. {f.label}
                        </span>
                      </div>
                      <span className="num text-[11px] font-bold text-mute">+{f.scoreImpact} pts</span>
                    </div>

                    <p className="mt-1 text-[11.5px] text-mute leading-relaxed">{f.description}</p>

                    {f.evidence.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {f.evidence.map((ev, eIdx) => (
                          <li key={eIdx} className="text-[11px] text-faint flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-brand" /> {ev}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-2.5 rounded-lg border border-edge/60 bg-white/[0.01] px-2.5 py-1.5 text-[11px] text-mute">
                      <b className="text-ink">Recommended Action:</b> {f.recommendedAction}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-edge bg-white/[0.02] p-4 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-[#48d29b]" />
                  <p className="mt-1 text-xs font-semibold text-ink">Zero Citizen Discrepancy Signals</p>
                  <p className="text-[11px] text-mute mt-0.5">
                    Crowdsourced observations align with official project progress. No physical variance detected.
                  </p>
                </div>
              )}
            </div>

            {/* Advisory Recommended Next Action Alert */}
            <div className="mt-4">
              {citizenSummary.requiresFieldInspection ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ff8a3d]/30 bg-[#ff8a3d]/[0.06] p-3 text-[11.5px] text-[#ff8a3d]">
                  <div className="flex items-start gap-2 max-w-xl">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-ink">Advisory Recommendation: Priority Field Verification Required.</b>
                      <p className="text-mute text-[11px] mt-0.5">
                        Crowdsourced observations diverge materially from official progress records. An unannounced site visit by an assistant engineer is recommended to inspect physical assets before issuing final contractor retention release.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toast(`Field verification requisition logged for ${currentCase.projectId} (demo)`, 'success')}
                    className="btn-primary !py-1.5 !px-3 text-[11px] shrink-0"
                  >
                    Dispatch Field Inspector (Demo)
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-[#48d29b]/30 bg-[#48d29b]/[0.06] p-3 text-[11.5px] text-[#48d29b]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <div>
                    <b className="text-ink">Ground-Truth Verification Consistent.</b> Citizen observations corroborate official execution records. Standard document review remains sufficient.
                  </div>
                </div>
              )}
            </div>

            {/* Advisory Notice */}
            <div className="mt-3 rounded-xl border border-edge bg-white/[0.01] p-2.5 text-[10.5px] text-faint flex items-start gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-400 mt-0.5" />
              <div>
                <b className="text-mute">Advisory Evidence Safeguard:</b> Citizen feedback represents crowdsourced ground-truth observations to assist field inspection prioritization. It does not constitute legal proof of fraud, corruption, or contractor misconduct. Plaintext phone numbers, phone hashes, and exact GPS coordinates are strictly protected and never exposed.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Case Priority Card */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Case Priority</h3>
            <div className="mt-3 space-y-2">
              {[
                ['Severity', currentCase.severity],
                ['Risk Score', currentCase.riskScore],
                ['AI Confidence', currentCase.aiConfidence],
                ['Linked Alerts', String(currentCase.linkedAlerts)],
                ['Vendors Involved', String(currentCase.vendorsInvolved)],
                ['Potential Exposure', currentCase.potentialExposure],
                ['Citizen Discrepancy', `${citizenSummary.discrepancyScore}/100 (${citizenSummary.discrepancyLevel})`],
                ['Field Inspection', citizenSummary.requiresFieldInspection ? 'Recommended' : 'Not Required'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between rounded-lg border border-edge bg-white/[0.02] px-3 py-2 text-[12px]"
                >
                  <span className="text-mute">{k}</span>
                  <span
                    className={cn(
                      'num font-bold',
                      k === 'Severity' && v === 'CRITICAL' && 'text-danger',
                      k === 'Severity' && v === 'HIGH' && 'text-[#ff8a3d]',
                      k === 'Severity' && v === 'LOW' && 'text-[#48d29b]',
                      k === 'Field Inspection' && v === 'Recommended' && 'text-[#ff8a3d]',
                      k !== 'Severity' && k !== 'Field Inspection' && 'text-ink'
                    )}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Ledger */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Evidence Ledger</h3>
            <div className="mt-3 space-y-2">
              {[
                [currentCase.invoiceDoc, 'PDF · 1.2 MB', 'added'],
                ['Geo-tagged photos (3)', 'JPG · 14 files', 'added'],
                ['GPS coordinate log', 'JSON · 4 KB', 'added'],
                ['Cost comparison matrix', 'XLSX · 88 KB', 'linked'],
                [
                  'Citizen Ground-Truth Dossier',
                  `${citizenSummary.totalFeedbackCount} observations · QR verified`,
                  'linked',
                ],
              ].map(([name, meta]) => (
                <button
                  key={name}
                  onClick={() => setPanel(name)}
                  className="flex w-full items-start gap-2 rounded-lg border border-edge bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.04]"
                >
                  {name.includes('Citizen') ? (
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                  ) : (
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  )}
                  <div className="flex-1">
                    <div className="text-[11.5px] font-semibold text-ink">{name}</div>
                    <div className="text-[10px] text-faint">{meta}</div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-faint" />
                </button>
              ))}
            </div>
          </div>

          {/* Notes Card */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Notes</h3>
            <div className="mt-2 space-y-2">
              {displayedNotes.map((n, idx) => (
                <div key={idx} className="rounded-lg border border-edge bg-white/[0.02] p-3 text-[11.5px] text-mute">
                  <div className="flex items-center gap-1.5 text-[10px] text-faint">
                    <User className="h-3 w-3" /> {n.author} · {n.time}
                  </div>
                  <div className="mt-1">{n.text}</div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddNote();
              }}
              className="mt-3 flex items-center gap-2 rounded-lg border border-edge bg-white/[0.02] px-3 py-2"
            >
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add an investigative note…"
                className="w-full bg-transparent text-[12px] text-ink placeholder:text-faint focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand/90 transition"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Evidence Modal */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] grid place-items-center bg-black/60 backdrop-blur-sm"
            onClick={() => setPanel(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-[360px] max-w-[90vw] rounded-2xl border border-edge2 bg-panel p-5 shadow-soft"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                {panel.includes('Citizen') ? (
                  <Users className="h-4 w-4 text-blue-400" />
                ) : (
                  <FileText className="h-4 w-4 text-brand" />
                )}
                <h4 className="text-sm font-bold text-ink">{panel}</h4>
              </div>

              {panel.includes('Citizen') ? (
                <div className="mt-3 space-y-2 text-[12px] text-mute">
                  <p>
                    <b className="text-ink">Project:</b> {currentCase.projectId}
                  </p>
                  <p>
                    <b className="text-ink">Total Crowdsourced Observations:</b> {citizenSummary.totalFeedbackCount}
                  </p>
                  <p>
                    <b className="text-ink">Verified On-Site (≤ 150m):</b> {citizenSummary.onSiteVerifiedCount} ({citizenSummary.onSiteVerifiedPercent}%)
                  </p>
                  <p>
                    <b className="text-ink">Discrepancy Index:</b> {citizenSummary.discrepancyScore}/100 ({citizenSummary.discrepancyLevel})
                  </p>
                  <p className="text-[11px] text-faint">
                    Privacy Guarantee: Raw phone numbers, phone hashes, and exact GPS coordinates are NEVER stored in this dossier. Submissions are authenticated via non-reversible audit tokens (CTZ-TOK-XXXX).
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-mute">
                  Document preview panel (prototype). This file has been hash-chained to the investigation ledger for audit integrity.
                </p>
              )}

              <button
                onClick={() => {
                  setPanel(null);
                  toast('Evidence ledger verified (demo)', 'success');
                }}
                className="btn-primary mt-4 w-full !py-2 text-[12px]"
              >
                Close Preview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}