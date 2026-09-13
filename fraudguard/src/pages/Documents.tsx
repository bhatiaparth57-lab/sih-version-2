import { useRef, useState } from 'react';
import {
  FileUp, FileText, CheckCircle2, ScanLine, FileSearch, Copy, BarChart3,
  Loader2, AlertTriangle, Eye, UploadCloud, X, ChevronRight, Sparkles,
} from 'lucide-react';
import FinancialVerificationPanel from '@/components/FinancialVerificationPanel';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { DEMO_FINANCIAL_DATASET } from '@/lib/financialDemoData';
import { formatInr } from '@/lib/financialTypes';
import { verifyInvoices } from '@/lib/financialVerification';

const STEPS = [
  { label: 'OCR Extraction', icon: ScanLine },
  { label: 'Entity Extraction', icon: FileSearch },
  { label: 'Invoice Matching', icon: Copy },
  { label: 'Duplicate Detection', icon: BarChart3 },
];

export default function Documents() {
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startVerify = () => {
    if (!uploaded) { toast('Upload a document first', 'warn'); return; }
    setRunning(true); setDone(false); setProgress(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setProgress(i);
      if (i >= STEPS.length) {
        clearInterval(t);
        setTimeout(() => { setRunning(false); setDone(true); toast('AI verification complete — mismatch found', 'success'); }, 500);
      }
    }, 700);
  };

  const reset = () => { setUploaded(null); setDone(false); setProgress(-1); };

  const extracted = DEMO_FINANCIAL_DATASET.invoices.find((i) => i.invoiceNumber === 'INV-8841' && i.projectId === 'MP-DEL-2026-0142');
  const docResult = extracted
    ? verifyInvoices({
        projectId: extracted.projectId,
        invoices: DEMO_FINANCIAL_DATASET.invoices.filter((i) => i.projectId === extracted.projectId),
        allInvoices: DEMO_FINANCIAL_DATASET.invoices,
        budget: DEMO_FINANCIAL_DATASET.budgets[extracted.projectId],
        expenditure: DEMO_FINANCIAL_DATASET.expenditure[extracted.projectId],
        referencePrices: DEMO_FINANCIAL_DATASET.referencePrices,
      })
    : null;
  const mismatch = docResult?.findings.find((f) => f.invoiceId === extracted?.id && (f.ruleName === 'duplicate_invoice_number' || f.ruleName === 'invoice_gt_remaining_budget'))
    ?? docResult?.findings.find((f) => f.invoiceId === extracted?.id);

  return (
    <div className="p-5">
      <div className="mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-ink">Document Intelligence</h1>
        <p className="mt-1 text-sm text-mute">AI/OCR verification of invoices, work orders and completion certificates</p>
      </div>

      <div className="mb-4 rounded-xl border border-[#f0b64b]/30 bg-[#f0b64b]/[0.06] px-3.5 py-2 text-[11.5px] text-[#f0b64b]">
        DEMO ENVIRONMENT — Synthetic Data · Sample invoice pre-loaded for the demo
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          {!uploaded ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="flex h-[340px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-edge2 bg-white/[0.01] text-center transition hover:border-brand/40 hover:bg-white/[0.03]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <FileUp className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-[14px] font-bold text-ink">Drag & Drop Government Documents</h3>
              <p className="mt-1 text-[12px] text-mute">or click to browse your workstation</p>
              <div className="mt-4 flex gap-2">
                {['PDF', 'JPG', 'PNG'].map((f) => <span key={f} className="chip">{f}</span>)}
              </div>
              <p className="mt-5 text-[10px] text-faint">Max 25 MB · encrypted in-flight · hash recorded</p>
              <input ref={inputRef} type="file" className="hidden" onChange={() => { setUploaded('Invoice_INV-8841.pdf'); toast('Invoice_INV-8841.pdf staged (demo)', 'info'); }} />
            </div>
          ) : (
            <div className="flex h-[340px] flex-col rounded-2xl border border-edge bg-white/[0.02] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0b64b]/12 text-[#f0b64b]"><FileText className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-ink">{uploaded}</div>
                  <div className="text-[11px] text-faint">1.2 MB · uploaded just now</div>
                </div>
                {running ? (
                  <span className="chip !border-brand/40"><Loader2 className="h-3.5 w-3.5 animate-spin text-brand" /> Analyzing</span>
                ) : (
                  <button onClick={reset} className="text-faint hover:text-ink"><X className="h-4 w-4" /></button>
                )}
              </div>

              <div className="mt-4 flex-1 space-y-2">
                {STEPS.map((s, i) => {
                  const state = running && progress > i ? 'done' : running && progress === i ? 'run' : running ? 'wait' : done ? 'done' : 'wait';
                  return (
                    <div key={s.label} className="flex items-center gap-3 rounded-xl border border-edge bg-white/[0.02] px-3 py-2.5">
                      <s.icon className={cn('h-4 w-4', state === 'done' ? 'text-[#48d29b]' : state === 'run' ? 'text-brand' : 'text-faint')} />
                      <span className={cn('text-[12.5px] font-medium', state === 'wait' ? 'text-faint' : 'text-ink')}>{s.label}</span>
                      <span className="ml-auto flex items-center gap-1 text-[10.5px] font-semibold">
                        {state === 'done' && <span className="text-[#48d29b]"><CheckCircle2 className="h-4 w-4" /></span>}
                        {state === 'run' && <span className="text-brand"><Loader2 className="h-3.5 w-3.5 animate-spin" /></span>}
                        {state === 'wait' && <span className="text-faint">Queued</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button onClick={startVerify} disabled={running} className="btn-primary w-full !py-3">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {running ? 'VERIFYING…' : done ? 'RE-RUN AI VERIFICATION' : 'RUN AI VERIFICATION'}
              </button>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold text-ink">Extracted Information</h3>
          <p className="mt-0.5 text-[11px] text-mute">Auto-parsed via OCR & entity extraction</p>

          {done ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Invoice Number', extracted?.invoiceNumber ?? 'INV-8841'], ['Invoice Date', extracted?.invoiceDate ?? '2026-03-12'],
                  ['Vendor', 'ABC Infra Pvt Ltd'], ['Amount', extracted ? formatInr(extracted.totalAmount) : '₹12,40,000'],
                  ['Project ID', extracted?.projectId ?? 'MP-DEL-2026-0142'], ['GSTIN', '07AAFCA2341B1Z5'],
                  ['Description', extracted?.description ?? 'HVAC & electrical works'], ['Currency', 'INR'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-edge bg-white/[0.02] p-2.5">
                    <div className="text-[9px] uppercase tracking-wide text-faint">{k}</div>
                    <div className="mt-0.5 truncate text-[12px] font-semibold text-ink">{v}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-edge bg-white/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-brand" />
                  <h4 className="text-[12.5px] font-bold text-ink">Document Consistency</h4>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-mute">Invoice Amount</span>
                    <span className="num font-semibold text-ink">{extracted ? formatInr(extracted.totalAmount) : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-mute">Approved budget</span>
                    <span className="num font-semibold text-ink">{docResult ? formatInr(docResult.approvedBudget) : '—'}</span>
                  </div>
                  <div className="my-1 h-px bg-edge" />
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-mute">Potential overbilling</span>
                    <span className="num text-[15px] font-extrabold text-[#ff5860]">{docResult ? formatInr(docResult.potentialOverbillAmount) : '—'}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/[0.06] px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5860]" />
                  <div>
                    <div className="text-[12px] font-bold text-[#ff5860]">⚠ {mismatch ? mismatch.ruleName : 'FINANCIAL MISMATCH'}</div>
                    <div className="mt-0.5 text-[11px] text-mute">{mismatch?.explanation ?? 'Rule-based checks flagged this invoice.'} Score {docResult?.score}/100 ({docResult?.verdict}).</div>
                  </div>
                </div>
                <button onClick={() => toast('Mismatch escalated to case FG-2026-00421 (demo)', 'success')} className="btn-primary mt-3 w-full !py-2 text-[11.5px]">
                  Escalate to Investigation <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-4 w-1/3 rounded" />
                  <div className="skeleton h-4 flex-1 rounded" />
                </div>
              ))}
              <div className="mt-5 rounded-xl border border-edge bg-white/[0.01] p-6 text-center text-[11.5px] text-faint">
                <UploadCloud className="mx-auto mb-2 h-5 w-5" />
                Extracted fields, consistency comparison and anomaly flags will appear here after verification.
              </div>
            </div>
          )}
        </div>
      </div>

      {done && (
        <div className="mt-6">
          <FinancialVerificationPanel initialProjectId="MP-DEL-2026-0142" />
        </div>
      )}
    </div>
  );
}