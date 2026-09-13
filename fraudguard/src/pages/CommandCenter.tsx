import { useMemo } from 'react';
import { AlertTriangle, TrendingUp, ShieldAlert, Activity, FileText } from 'lucide-react';
import { useLiveProjects } from '@/lib/liveData';

export default function CommandCenter() {
  const { projects, loading } = useLiveProjects();
  
  // 1. Get the current secure user session
  const stored = localStorage.getItem('fg_user');
  const user = stored ? JSON.parse(stored) : { name: 'Officer', role: 'admin', region: 'ALL' };

  // 2. Filter data dynamically based on the user's secure role
  const dashboardData = useMemo(() => {
    let filtered = projects;
    
    // If they are not an admin, restrict their view!
    if (user.role !== 'admin' && user.role !== 'senior_auditor') {
      filtered = projects.filter(p => p.state === user.region || p.district === user.region);
    }

    const critical = filtered.filter(p => p.risk === 'CRITICAL');
    const high = filtered.filter(p => p.risk === 'HIGH');
    
    // Calculate total value (simplified for demo)
    const value = filtered.reduce((acc, curr) => acc + (curr.allocated || 0), 0);
    const valueStr = value > 10000000 ? `₹${(value/10000000).toFixed(1)} Cr` : `₹${(value/100000).toFixed(1)} L`;

    return {
      count: filtered.length,
      critical: critical.length,
      high: high.length,
      value: valueStr,
      alerts: critical.length + high.length
    };
  }, [projects, user]);

  return (
    <div className="p-6">
      {/* 
        HEADER SECTION
        Notice how the duplicate profile icon and Logout button are completely gone!
        This leaves just the clean dashboard title. 
      */}
      <div className="mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-ink">MPLADS Intelligence Command Center</h1>
        <p className="mt-1 text-sm text-mute">Real-time AI monitoring of project expenditure, vendors and physical assets</p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-ink">Good morning, {user.name.split(' ')[0]}.</h2>
        <p className="text-sm text-faint">
          {user.role === 'admin' 
            ? "Here's the national portfolio overview for today." 
            : `Here's what's happening in your authorized region (${user.region}) today.`}
        </p>
      </div>

      {/* Top Quick Stats Row */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-edge bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-mute">Projects in Scope</p>
          <p className="mt-2 text-2xl font-bold text-ink">{loading ? '...' : dashboardData.count}</p>
        </div>
        <div className="rounded-xl border border-[#ff5860]/20 bg-[#ff5860]/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff5860]">Critical Risk</p>
          <p className="mt-2 text-2xl font-bold text-[#ff5860]">{loading ? '...' : dashboardData.critical}</p>
        </div>
        <div className="rounded-xl border border-[#ff8a3d]/20 bg-[#ff8a3d]/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff8a3d]">High Risk</p>
          <p className="mt-2 text-2xl font-bold text-[#ff8a3d]">{loading ? '...' : dashboardData.high}</p>
        </div>
        <div className="rounded-xl border border-edge bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-mute">Value Monitored</p>
          <p className="mt-2 text-2xl font-bold text-ink">{loading ? '...' : dashboardData.value}</p>
        </div>
      </div>

      {/* Demo Banner */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-[#f0b64b]/30 bg-[#f0b64b]/10 px-4 py-2.5 text-[11px] font-medium text-[#f0b64b]">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          DEMO ENVIRONMENT — Synthetic Data · Real-time AI surveillance simulation
        </div>
        <span>SIH 2026 · Problem SIH26102</span>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-1 rounded-xl border border-edge bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-[#48d29b]">• Monitored</span>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-mute">Total Projects</p>
          <p className="mt-1 text-3xl font-bold text-ink">{loading ? '...' : dashboardData.count}</p>
          <p className="mt-2 text-[11px] text-faint">vs previous FY cycle</p>
        </div>

        <div className="col-span-1 rounded-xl border border-edge bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#48d29b]/10 text-[#48d29b]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-[#48d29b]">• In-flow</span>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-mute">Funds Monitored</p>
          <p className="mt-1 text-3xl font-bold text-ink">{loading ? '...' : dashboardData.value}</p>
          <p className="mt-2 text-[11px] text-faint">vs previous FY cycle</p>
        </div>

        <div className="col-span-1 rounded-xl border border-edge bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0b64b]/10 text-[#f0b64b]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-[#48d29b]">• Active</span>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-mute">AI Alerts</p>
          <p className="mt-1 text-3xl font-bold text-ink">{loading ? '...' : dashboardData.alerts}</p>
          <p className="mt-2 text-[11px] text-faint">Requires review</p>
        </div>

        <div className="col-span-2 rounded-xl border border-edge bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5860]/10 text-[#ff5860]">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-[#ff5860]">• Watch</span>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-mute">High-Risk Exposure</p>
          <p className="mt-1 text-3xl font-bold text-ink">
            {loading ? '...' : dashboardData.critical + dashboardData.high} <span className="text-lg text-mute">Projects</span>
          </p>
          <p className="mt-2 text-[11px] text-[#ff5860]">Immediate action recommended</p>
        </div>
      </div>
    </div>
  );
}