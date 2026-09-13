import { useEffect, useState } from 'react';

export function RiskScore({
  value,
  size = 150,
  stroke = 12,
  label = 'AI RISK SCORE',
  color,
  suffix,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
  suffix?: string;
}) {
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setAnim(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (anim / 100) * c;
  const col = color ?? (value >= 85 ? '#ff5860' : value >= 60 ? '#ff8a3d' : value >= 40 ? '#f0b64b' : '#48d29b');

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ring-svg -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: 'none' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-4xl font-extrabold tracking-tight" style={{ color: col }}>
          {Math.round(anim)}
          {suffix}
        </span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-faint">{label}</span>
        <span className="num text-[10px] text-mute">/ 100</span>
      </div>
    </div>
  );
}
