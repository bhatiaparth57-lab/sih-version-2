import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={[
              'relative w-full rounded-2xl border border-edge2 bg-panel shadow-soft max-h-[88vh] overflow-hidden flex flex-col',
              wide ? 'max-w-3xl' : 'max-w-lg',
            ].join(' ')}
          >
            {(title || subtitle) && (
              <div className="flex items-start justify-between border-b border-edge px-5 py-4">
                <div>
                  {title && <h3 className="text-base font-bold text-ink">{title}</h3>}
                  {subtitle && <p className="mt-0.5 text-xs text-mute">{subtitle}</p>}
                </div>
                <button onClick={onClose} className="rounded-lg p-1 text-faint hover:bg-white/5 hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
