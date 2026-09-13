import { cn, } from '@/lib/utils';
import { RISK_BG } from '@/lib/data';

export default function RiskBadge({ level, className }: { level: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        RISK_BG[level as 'LOW'] ?? 'bg-white/5 text-mute border-edge',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}
