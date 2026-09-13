import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  BrainCircuit,
  Map,
  Building2,
  FileCheck2,
  Gavel,
  BarChart3,
  ShieldCheck,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/ai', label: 'AI Detection', icon: BrainCircuit },
  { to: '/map', label: 'Map Intelligence', icon: Map },
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { to: '/documents', label: 'Documents', icon: FileCheck2 },
  { to: '/investigations', label: 'Investigations', icon: Gavel },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col border-r border-edge bg-surface/70 backdrop-blur-md">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 ring-1 ring-brand/40">
          <ShieldCheck className="h-5 w-5 text-brand" />
        </div>
        <div className="leading-none">
          <div className="text-[15px] font-extrabold tracking-[0.12em] text-ink">FRAUDGUARD</div>
          <div className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.22em] text-faint">
            5-Layer Verification
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-mute transition-all duration-200',
                isActive
                  ? 'bg-brand/12 text-ink ring-1 ring-brand/20'
                  : 'hover:bg-white/[0.04] hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <it.icon className={cn('h-[17px] w-[17px]', isActive ? 'text-brand' : 'text-faint group-hover:text-mute')} />
                <span>{it.label}</span>
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-brand" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 px-3 pb-5">
        <div className="rounded-xl border border-edge bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[#48d29b]" />
            <span className="text-[11px] font-semibold text-ink">System Status</span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#48d29b]">
              <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-[#48d29b]" /> LIVE
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px]">
            {[
              ['AI Engine', 'Operational'],
              ['Verification', 'Online'],
              ['Sync', '6 min ago'],
              ['Uptime', '99.9%'],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <span className="text-faint">{k}</span>
                <span className="font-semibold text-mute">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-edge bg-white/[0.02] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#1a3fae] text-xs font-bold text-white">
            AS
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[12px] font-semibold text-ink">A. Sharma</div>
            <div className="truncate text-[10px] text-faint">Monitoring Officer · NDC</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
