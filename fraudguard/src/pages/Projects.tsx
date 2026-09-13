import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronRight, Download, Filter, X, Lock } from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import { Risk, VerifyStatus } from '@/lib/data';
import { useLiveProjects } from '@/lib/liveData';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

const RISKS: ('ALL' | Risk)[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const VERIFY: ('ALL' | VerifyStatus)[] = ['ALL', 'Verified', 'Pending', 'Field Visit', 'Failed'];

function getActiveUser() {
  const stored = localStorage.getItem('fg_user');
  return stored ? JSON.parse(stored) : { name: 'Auditor', role: 'admin', state: null, district: null, region: 'ALL' };
}

// Helper to derive accurate risk label strictly from the numerical score
function deriveRiskLevel(score: number): Risk {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export default function Projects() {
  const { projects, loading, error } = useLiveProjects();
  const user = getActiveUser();

  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [risk, setRisk] = useState<('ALL' | Risk)>('ALL');
  const [verify, setVerify] = useState<('ALL' | VerifyStatus)>('ALL');

  // STRICT POSITION & REGION FILTERING LAYER
  const securedProjects = useMemo(() => {
    if (!projects) return [];
    
    const role = (user.role || '').toLowerCase();
    
    if (role === 'admin' || role === 'national_auditor') {
      return projects;
    }
    if (role === 'state_authority' && user.state) {
      return projects.filter(p => p.state?.toLowerCase().trim() === user.state.toLowerCase().trim());
    }
    if (['mp', 'nodal_officer', 'junior_officer'].includes(role) && user.district) {
      return projects.filter(p => p.district?.toLowerCase().trim() === user.district.toLowerCase().trim());
    }
    if (user.region && user.region !== 'ALL') {
      return projects.filter(p => 
        p.state?.toLowerCase().trim() === user.region.toLowerCase().trim() || 
        p.district?.toLowerCase().trim() === user.region.toLowerCase().trim()
      );
    }
    return projects; 
  }, [projects, user]);

  const STATES = useMemo(() => [...new Set(securedProjects.map((p) => p.state).filter(Boolean))], [securedProjects]);
  const TYPES = useMemo(() => [...new Set(securedProjects.map((p) => p.type).filter(Boolean))], [securedProjects]);

  const rows = useMemo(() => {
    return securedProjects.filter((p) => {
      const searchBlob = `${p.id || ''} ${p.name || ''} ${p.vendor || ''} ${p.district || ''} ${p.state || ''}`.toLowerCase();
      const score = p.risk_score || p.riskScore || 0;
      const pRisk = deriveRiskLevel(score);
      
      if (q && !searchBlob.includes(q.toLowerCase())) return false;
      if (stateFilter !== 'ALL' && p.state !== stateFilter) return false;
      if (type !== 'ALL' && p.type !== type) return false;
      if (risk !== 'ALL' && pRisk !== risk) return false;
      if (verify !== 'ALL' && p.verify !== verify) return false;
      return true;
    }).sort((a, b) => (b.risk_score || b.riskScore || 0) - (a.risk_score || a.riskScore || 0));
  }, [securedProjects, q, stateFilter, type, risk, verify]);

  const getAccessBadgeText = () => {
    const role = (user.role || '').toLowerCase();
    if (role === 'admin') return 'Full National Access (ADMIN)';
    if (role === 'state_authority') return `State Restricted View: ${user.state || 'Assigned State'}`;
    if (['mp', 'nodal_officer', 'junior_officer'].includes(role)) {
      return `District Restricted View: ${user.district || user.region || 'Assigned District'}`;
    }
    return 'Restricted View Active';
  };

  return (
    <div className="p-5">
      <div className="mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-ink">Project Intelligence</h1>
        <p className="mt-1 text-sm text-mute">
          {user.role === 'admin'
            ? "Searchable register of all MPLADS projects under monitoring"
            : `Showing authorized operational records for your jurisdiction`}
        </p>
      </div>
      
      <div className="mb-4 rounded-xl border border-[#f0b64b]/30 bg-[#f0b64b]/[0.06] px-3.5 py-2 text-[11.5px] text-[#f0b64b] flex items-center justify-between">
        <span>LIVE DATABASE CONNECTED — Supabase RBAC Mode</span>
        <span className="flex items-center gap-1 font-semibold opacity-90">
          <Lock className="h-3 w-3" /> {getAccessBadgeText()}
        </span>
      </div>

      {loading && <p className="mb-4 text-[12px] text-mute">Loading database registers…</p>}
      {error && <p className="mb-4 text-[12px] text-danger">Could not load database records: {error}</p>}

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-edge p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search project ID, name, vendor, district…"
              className="w-full rounded-xl border border-edge bg-white/[0.02] py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-brand/50 focus:outline-none"
            />
          </div>
          <button onClick={() => toast('Project register exported')} className="btn-subtle !py-2 text-[12px]">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button className="btn-ghost !py-2 text-[12px]"><SlidersHorizontal className="h-3.5 w-3.5" /> Columns</button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-3">
          <Filter className="h-3.5 w-3.5 text-faint" />
          {[
            ['State', stateFilter, setStateFilter, STATES],
            ['Type', type, setType, TYPES],
            ['Risk', risk, setRisk, RISKS],
            ['Verification', verify, setVerify, VERIFY],
          ].map(([label, val, set, opts]: any) => (
            <select
              key={label}
              value={val}
              onChange={(e) => set(e.target.value)}
              className="rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-[12px] text-mute focus:border-brand/50 focus:outline-none"
            >
              <option value="ALL">All {label}</option>
              {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {(stateFilter !== 'ALL' || type !== 'ALL' || risk !== 'ALL' || verify !== 'ALL' || q) && (
            <button
              onClick={() => { setStateFilter('ALL'); setType('ALL'); setRisk('ALL'); setVerify('ALL'); setQ(''); }}
              className="ml-auto flex items-center gap-1 text-[11px] text-faint hover:text-ink"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <span className="ml-auto num text-[11px] text-faint">{rows.length} projects</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left border-collapse">
            <thead>
              <tr className="border-b border-edge text-[10px] uppercase tracking-wider text-faint bg-white/[0.01]">
                <th className="px-4 py-3 font-semibold w-[120px]">Project ID</th>
                <th className="px-4 py-3 font-semibold w-[200px]">Project Name</th>
                <th className="px-4 py-3 font-semibold w-[130px]">Location</th>
                <th className="px-4 py-3 font-semibold w-[110px]">Sanctioned</th>
                <th className="px-4 py-3 font-semibold w-[110px]">Spent</th>
                <th className="px-4 py-3 font-semibold w-[130px]">Vendor</th>
                <th className="px-4 py-3 font-semibold w-[130px]">Risk Score</th>
                <th className="px-4 py-3 font-semibold w-[130px]">AI Finding</th>
                <th className="px-4 py-3 font-semibold w-[110px]">Verification</th>
                <th className="px-4 py-3 font-semibold w-[90px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[12px] text-mute">
                    No matching projects found for your jurisdiction. Check if your profile has a valid state or district assigned in Supabase.
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const currentRiskScore = p.risk_score || p.riskScore || 0;
                  const currentRiskLevel = deriveRiskLevel(currentRiskScore);
                  return (
                    <tr key={p.id} className="transition hover:bg-white/[0.03] group">
                      <td className="px-4 py-3 align-middle">
                        <Link to={`/projects/${p.id}`} className="num text-[12px] font-bold text-brand hover:underline">
                          {p.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Link to={`/projects/${p.id}`} className="block">
                          <div className="text-[12.5px] font-semibold text-ink">{p.name}</div>
                          <div className="mt-0.5 text-[11px] text-faint">{p.type}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle text-[11.5px] text-mute">
                        {p.district}<br /><span className="text-faint">{p.state}</span>
                      </td>
                      <td className="px-4 py-3 align-middle num text-[12px] text-ink">
                        ₹{(p.amount_sanctioned || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-middle num text-[12px] font-semibold" style={{ color: (p.amount_spent || 0) > (p.amount_sanctioned || 0) ? '#ff8a3d' : '#e6edf7' }}>
                        ₹{(p.amount_spent || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-middle text-[11.5px] text-mute">
                        {p.vendor || 'N/A'}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.05]">
                            <div className="h-full rounded-full" style={{ width: `${currentRiskScore}%`, background: rcol(currentRiskLevel) }} />
                          </div>
                          <span className="num text-[12px] font-bold text-ink">{currentRiskScore}</span>
                        </div>
                        <RiskBadge level={currentRiskLevel} className="mt-1" />
                      </td>
                      <td className="px-4 py-3 align-middle text-[11.5px] text-mute">
                        {p.finding || 'AI review'}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <VerifyPill v={p.verify || 'Pending'} />
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <Link to={`/projects/${p.id}`} className={cn('inline-flex items-center gap-1 rounded-lg border border-[#ff5860]/30 bg-[#ff5860]/10 px-2 py-1 text-[10.5px] font-bold uppercase text-[#ff5860]', currentRiskLevel === 'CRITICAL' ? '' : 'opacity-0 group-hover:opacity-100')}>
                          Investigate <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function VerifyPill({ v }: { v: VerifyStatus }) {
  const map: Record<string, string> = {
    Verified: 'border-[#48d29b]/30 bg-[#48d29b]/10 text-[#48d29b]',
    Pending: 'border-[#f0b64b]/30 bg-[#f0b64b]/10 text-[#f0b64b]',
    'Field Visit': 'border-brand/30 bg-brand/10 text-brand',
    Failed: 'border-[#ff5860]/30 bg-[#ff5860]/10 text-[#ff5860]',
  };
  return <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', map[v] || map['Pending'])}>{v}</span>;
}

const rcol = (r: string) => (r === 'CRITICAL' ? '#ff5860' : r === 'HIGH' ? '#ff8a3d' : r === 'MEDIUM' ? '#f0b64b' : '#48d29b');