import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Filter, Play,
  Scale, ShieldAlert, Wallet,
} from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import { RiskScore } from '@/components/ui/RiskScore';
import { toast } from '@/components/ui/Toast';
import { PROJECTS, type Risk } from '@/lib/data';
import { loadFinancialDataset } from '@/lib/financialData';
import { vendorNameById } from '@/lib/financialDemoData';
import { formatInr, lakhsToInr, type FinancialDataset, type FinancialVerdict, type Invoice } from '@/lib/financialTypes';
import { verifyInvoices } from '@/lib/financialVerification';
import { cn } from '@/lib/utils';

const SEVERITIES: Array<'ALL' | Risk> = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const VERDICT_STYLE: Record<FinancialVerdict, string> = {
  verified: 'border-[#48d29b]/30 bg-[#48d29b]/10 text-[#48d29b]',
  warning: 'border-[#f0b64b]/30 bg-[#f0b64b]/10 text-[#f0b64b]',
  failed: 'border-[#ff5860]/30 bg-[#ff5860]/10 text-[#ff5860]',
};

export default function FinancialVerificationPanel({
  initialProjectId,
  compact,
}: {
  initialProjectId?: string;
  compact?: boolean;
}) {
  const [dataset, setDataset] = useState<FinancialDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId ?? 'MP-DEL-2026-0142');
  const [openInvoice, setOpenInvoice] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'ALL' | Risk>('ALL');
  const [ran, setRan] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadFinancialDataset()
      .then((data) => {
        if (!cancelled) {
          setDataset(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load financial data');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  const invoices = useMemo(
    () => (dataset?.invoices ?? []).filter((i) => i.projectId === projectId),
    [dataset, projectId],
  );
  const project = PROJECTS.find((p) => p.id === projectId);
  const budget = dataset?.budgets[projectId] ?? (project
    ? { projectId, totalAmount: lakhsToInr(project.allocated), categories: [] }
    : undefined);
  const spent = dataset?.expenditure[projectId] ?? (project
    ? { projectId, totalAmount: lakhsToInr(project.spent), byCategory: {} }
    : undefined);

  const result = useMemo(() => {
    if (!dataset || !ran) return null;
    return verifyInvoices({
      projectId,
      invoices,
      allInvoices: dataset.invoices,
      budget,
      expenditure: spent,
      referencePrices: dataset.referencePrices,
    });
  }, [dataset, invoices, projectId, ran, budget, spent]);

  const findings = (result?.findings ?? []).filter((f) => severity === 'ALL' || f.severity === severity);

  const run = () => {
    if (!invoices.length) {
      toast('No invoices on this project', 'warn');
    }
    setRan(true);
    const preview = dataset
      ? verifyInvoices({
          projectId,
          invoices,
          allInvoices: dataset.invoices,
          budget,
          expenditure: spent,
          referencePrices: dataset.referencePrices,
        })
      : null;
    if (preview) {
      toast(
        `Rule-based verification complete — ${preview.findings.length} finding${preview.findings.length === 1 ? '' : 's'}, score ${preview.score}/100`,
        preview.verdict === 'failed' ? 'warn' : 'success',
      );
    }
  };

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="mt-4 grid gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 text-[12.5px] text-[#ff5860]">
        <AlertTriangle className="mb-2 h-4 w-4" />
        Could not load financial verification data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Cost Overbilling & Document Verification</h2>
          <p className="mt-1 text-[12px] text-mute">
            {ENGINE_NOTE} · Data source: <b className="text-ink">{dataset?.source === 'supabase' ? 'Supabase' : 'Demo dataset'}</b>
          </p>
        </div>
        <button onClick={run} className="btn-primary !py-1.5 text-[11px]">
          <Play className="h-3 w-3" /> Run financial verification
        </button>
      </div>

      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4')}>
        <label className="card p-3">
          <span className="label">Project</span>
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setRan(false); setOpenInvoice(null); }}
            className="mt-1.5 w-full rounded-lg border border-edge bg-white/[0.03] px-2 py-2 text-[12px] text-ink"
          >
            {PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
            ))}
          </select>
        </label>
        <Kpi icon={Wallet} label="Approved budget" value={budget ? formatInr(budget.totalAmount) : '—'} hint={project ? `${project.allocated} L sanctioned` : ''} />
        <Kpi icon={Scale} label="Actual expenditure" value={spent ? formatInr(spent.totalAmount) : '—'} hint={project ? `${project.spent} L booked` : ''} />
        <Kpi
          icon={ShieldAlert}
          label="Remaining (after invoices)"
          value={budget ? formatInr(Math.max(0, budget.totalAmount - invoices.reduce((s, i) => s + i.totalAmount, 0))) : '—'}
          hint={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
        />
      </div>

      {budget?.categories?.length ? (
        <div className="flex flex-wrap gap-2">
          {budget.categories.map((c) => {
            const used = spent?.byCategory[c.id] ?? 0;
            const over = used > c.allocatedAmount;
            return (
              <span key={c.id} className={cn('chip !py-1 text-[10.5px]', over && '!border-[#ff5860]/30 !text-[#ff5860]')}>
                {c.name}: {formatInr(used)} / {formatInr(c.allocatedAmount)}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="border-b border-edge px-4 py-3">
          <h3 className="text-[13px] font-bold text-ink">Invoices</h3>
          <p className="text-[11px] text-mute">Expand a row to inspect line items</p>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-faint">No invoices are recorded for this project in the current dataset.</div>
        ) : (
          <div className="divide-y divide-edge">
            {invoices.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                open={openInvoice === inv.id}
                onToggle={() => setOpenInvoice((id) => (id === inv.id ? null : inv.id))}
              />
            ))}
          </div>
        )}
      </div>

      {ran && result && (
        <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3')}>
          <div className="card flex flex-col items-center p-5">
            <span className="label mb-2">Rule-based risk score</span>
            <RiskScore value={result.score} size={compact ? 140 : 168} label="FINANCIAL RISK" />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <RiskBadge level={result.risk} />
              <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', VERDICT_STYLE[result.verdict])}>
                {result.verdict}
              </span>
            </div>
            <p className="mt-3 text-center text-[11.5px] text-mute">
              Potential overbilling: <b className="num text-ink">{formatInr(result.potentialOverbillAmount)}</b>
            </p>
            <p className="mt-1 text-center text-[10.5px] text-faint">{result.engineLabel}</p>
          </div>

          <div className="card p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[13px] font-bold text-ink">Findings</h3>
              <span className="num text-[12px] text-mute">{result.findings.length}</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-faint"><Filter className="h-3 w-3" /> Severity</span>
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={cn('chip !py-0.5 text-[10px]', severity === s && 'border-brand/40 text-ink')}
                >
                  {s}
                </button>
              ))}
            </div>

            {findings.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 py-6 text-[12px] text-faint">
                <CheckCircle2 className="h-5 w-5 text-[#48d29b]" />
                {result.findings.length === 0
                  ? 'No rule violations on this project.'
                  : 'No findings at this severity.'}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {findings.map((f) => (
                  <div key={f.id} className="rounded-xl border border-edge bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-start gap-2">
                      <RiskBadge level={f.severity} />
                      <span className="text-[12px] font-semibold text-ink">{f.ruleName}</span>
                      <span className="num ml-auto text-[11px] font-bold text-mute">+{f.points}</span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-mute">{f.explanation}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10.5px] text-faint">
                      <span className="chip !py-0.5">Affected {formatInr(f.affectedAmount)}</span>
                      {f.invoiceNumber && <span className="chip !py-0.5">{f.invoiceNumber}</span>}
                    </div>
                    <p className="mt-2 text-[11px] text-ink"><b>Recommended:</b> {f.recommendedAction}</p>
                  </div>
                ))}
              </div>
            )}

            {result.scoreBreakdown.length > 0 && (
              <div className="mt-4 rounded-xl border border-edge bg-white/[0.02] p-3">
                <div className="label mb-2">Why points were added</div>
                {result.scoreBreakdown.map((row, i) => (
                  <div key={`${row.ruleName}-${i}`} className="flex items-start justify-between gap-3 py-1 text-[11px]">
                    <span className="text-mute">{row.ruleName}</span>
                    <span className="num shrink-0 font-bold text-ink">+{row.points}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-edge pt-2 text-[12px] font-semibold">
                  <span>Capped score</span>
                  <span className="num">{result.score} / 100</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ENGINE_NOTE = 'Transparent rule-based engine — no machine-learning model';

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-faint"><Icon className="h-3 w-3" /> {label}</div>
      <div className="num mt-1 text-[16px] font-bold text-ink">{value}</div>
      <div className="text-[10px] text-faint">{hint}</div>
    </div>
  );
}

function InvoiceRow({ invoice, open, onToggle }: { invoice: Invoice; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.03]">
        {open ? <ChevronDown className="mt-0.5 h-4 w-4 text-brand" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-faint" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-[12px] font-bold text-ink">{invoice.invoiceNumber}</span>
            <span className="text-[11px] text-mute">{invoice.invoiceDate}</span>
            <span className="text-[11px] text-faint">{vendorNameById(invoice.vendorId)}</span>
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-mute">{invoice.description}</p>
        </div>
        <div className="text-right">
          <div className="num text-[13px] font-bold text-ink">{formatInr(invoice.totalAmount)}</div>
          <div className="text-[10px] text-faint">tax {formatInr(invoice.taxAmount)}</div>
        </div>
      </button>
      {open && (
        <div className="border-t border-edge bg-white/[0.015] px-4 py-3">
          <div className="mb-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[11px]">
              <thead className="text-[10px] uppercase tracking-wide text-faint">
                <tr>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium">Unit price</th>
                  <th className="pb-2 font-medium">Claimed</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li) => (
                  <tr key={li.id} className="border-t border-edge/60">
                    <td className="py-1.5 text-ink">{li.description}</td>
                    <td className="num py-1.5 text-mute">{li.quantity} {li.unit}</td>
                    <td className="num py-1.5 text-mute">{formatInr(li.unitPrice)}</td>
                    <td className="num py-1.5 font-semibold text-ink">{formatInr(li.claimedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[10.5px] text-faint">
            Support: {invoice.supportingFileRef || invoice.supportingDocumentUrl || 'none'} · Status: {invoice.verificationStatus}
          </div>
        </div>
      )}
    </div>
  );
}
