import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { useApp } from '@/store';

interface Msg { role: 'user' | 'ai'; text: string; extra?: string[] }

const SUGGESTIONS = [
  'Show projects with unusual expenditure',
  'Which vendors have the highest risk?',
  'Why is this project flagged?',
  'Find duplicate invoices',
  'Generate investigation summary',
];

const ANSWERS: Record<string, string> = {
  'show projects with unusual expenditure':
    "I found 14 projects with expenditure deviations above 20%.\n\n• 5 are classified as High Risk.\n• 2 share invoice identifiers with other projects.\n• 3 involve vendors with unusually concentrated contract activity.\n\nWould you like me to open the highest-risk cases?",
  'which vendors have the highest risk?':
    "Top 3 high-risk vendors:\n\n• ABC Infra Pvt Ltd — score 91, 12 projects\n• GVK Builders — score 69, 7 projects\n• Sharma Constructions — score 74, 9 projects\n\nABC Infra shows a potential collusion pattern. Open the vendor network to inspect relationships.",
  'why is this project flagged?' :
    "MP-DEL-2026-0142 is flagged CRITICAL (92/100) because of 5 weighted signals: duplicate invoice (+24), cost deviation (+21), vendor concentration (+18), asset verification (+17) and timeline anomaly (+12). Model confidence is 94%.",
  'find duplicate invoices':
    "Duplicate candidate found: Invoice INV-8841 appears in both MP-DEL-2026-0142 and MP-BR-2026-0904 with different amounts. OCR fingerprint match is 0.97. I've linked this to case FG-2026-00421.",
  'generate investigation summary':
    "Summary for CASE #FG-2026-00421 (CRITICAL):\n\n• Duplicate invoice IVN-8841\n• 27% cost overrun vs peer norm\n• Vendor cluster concentration 75%\n• Field verification pending\n\nRecommended action: request joint measurement & suspend disbursement.",
};

export default function AIChat() {
  const { chatOpen, setChatOpen } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: 'Namaste. I am FraudGuard AI, your investigation copilot. Ask me about projects, vendors, invoices or anomalies.', extra: ['Powered by the 5-layer verification engine'] },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  const send = (text: string) => {
    const q = text.trim().toLowerCase();
    if (!q) return;
    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const key = Object.keys(ANSWERS).find((k) => q.includes(k.split(' ')[0]) && (q.includes(k.split(' ')[1]) || k === 'find duplicate invoices' || k === 'generate investigation summary') );
      const ans = ANSWERS[key ?? 'show projects with unusual expenditure'];
      setTyping(false);
      setMsgs((m) => [...m, { role: 'ai', text: ans }]);
    }, 1200);
  };

  return (
    <> 
      {/* floating button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-full border border-brand/40 bg-brand/90 px-4 py-3 text-[13px] font-bold text-white shadow-glow transition hover:bg-brand"
      >
        <Bot className="h-5 w-5" /> FraudGuard AI
      </button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed bottom-5 right-5 z-[100] flex h-[600px] w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-edge2 bg-surface/95 shadow-soft backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-edge bg-panel/60 p-4">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Bot className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#48d29b] ring-2 ring-panel" />
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-bold text-ink">FraudGuard AI</div>
                <div className="text-[10px] text-[#48d29b]">Copilot · online · demo</div>
              </div>
              <button onClick={() => setChatOpen(false)} className="rounded-lg p-1.5 text-faint hover:bg-white/5 hover:text-ink"><X className="h-4 w-4" /></button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.length === 1 && (
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="flex w-full items-center gap-2 rounded-lg border border-edge bg-white/[0.02] px-3 py-2 text-left text-[11.5px] text-mute transition hover:border-brand/40 hover:text-ink">
                      <Sparkles className="h-3 w-3 shrink-0 text-brand" /> {s}
                    </button>
                  ))}
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-brand/15 border border-brand/25 px-3.5 py-2.5 text-[12.5px] text-ink'
                    : 'max-w-[88%] rounded-2xl rounded-bl-sm border border-edge bg-white/[0.03] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-mute'}>
                    {m.text.split('\n').map((line, j) => <p key={j} className="whitespace-pre-wrap">{line.trim() ? line : <br />}</p>)}
                    {m.extra && <div className="mt-2 flex gap-2"><button onClick={() => send(m.extra![0])} className="chip !text-[10px]">{m.extra![0]}</button></div>}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-edge bg-white/[0.03] px-3.5 py-2.5 w-fit">
                  {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i*0.12}s` }} />)}
                </div>
              )}
            </div>

            <div className="border-t border-edge p-3">
              <div className="flex items-center gap-2 rounded-xl border border-edge bg-white/[0.02] px-3 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send(input)}
                  placeholder="Ask FraudGuard AI…"
                  className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-faint focus:outline-none"
                />
                <button onClick={() => send(input)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white"><Send className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-1.5 text-center text-[9.5px] text-faint">AI outputs are simulated for demo · verify before action</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
