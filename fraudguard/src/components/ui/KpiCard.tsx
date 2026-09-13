import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Sparkline from './Sparkline';
import AnimatedNumber from './AnimatedNumber';
import { cn } from '@/lib/utils';

export default function KpiCard({
  label,
  value,
  format,
  delta,
  icon: Icon,
  spark,
  accent = '#2f6bff',
  status,
  index,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta: number;
  icon: any;
  spark: number[];
  accent?: string;
  status?: string;
  index?: number;
}) {
  const up = delta >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index ?? 0) * 0.06, duration: 0.5, ease: 'easeOut' }}
      className="card card-hover relative overflow-hidden p-4"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}1a`, color: accent }}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {status && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#48d29b]">
            <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-[#48d29b]" /> {status}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="label">{label}</div>
          <div className="num mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink">
            <AnimatedNumber value={value} format={format} duration={1200} />
            {format ? null : ''}
          </div>
        </div>
        <div className="hidden flex-col items-end gap-1 sm:flex">
          <Sparkline data={spark} color={accent} />
          <span
            className={cn(
              'num inline-flex items-center gap-0.5 text-[11px] font-semibold',
              up ? 'text-[#48d29b]' : 'text-[#ff5860]',
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-faint">vs previous FY cycle</div>
    </motion.div>
  );
}
