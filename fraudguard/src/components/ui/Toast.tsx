import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'warn' | 'info';
interface ToastItem {
  id: number;
  text: string;
  type: ToastType;
}

let pushFn: ((t: Omit<ToastItem, 'id'>) => void) | null = null;
export function toast(text: string, type: ToastType = 'success') {
  pushFn?.({ text, type });
}

const ICON = {
  success: CheckCircle2,
  warn: AlertTriangle,
  info: Info,
};
const COLOR = {
  success: 'text-[#48d29b]',
  warn: 'text-[#ff8a3d]',
  info: 'text-[#2f6bff]',
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    pushFn = (t) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-3), { ...t, id }]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4200);
    };
    return () => {
      pushFn = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[320px] flex-col gap-2">
      <AnimatePresence>
        {items.map((i) => {
          const Icon = ICON[i.type];
          return (
            <motion.div
              key={i.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="glass pointer-events-auto flex items-start gap-3 rounded-xl border border-edge2 p-3 shadow-soft"
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', COLOR[i.type])} />
              <p className="flex-1 text-[13px] text-ink">{i.text}</p>
              <button
                onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}
                className="text-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
