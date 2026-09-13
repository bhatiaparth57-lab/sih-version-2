import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, User, ArrowRight, Cpu, SearchCheck, Shield, QrCode, Camera, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/Toast';

export default function Login({ onLogin, booted }: { onLogin: () => void; booted: boolean }) {
  const navigate = useNavigate();
  const [portalMode, setPortalMode] = useState<'officer' | 'citizen'>('officer');

  // Officer login states
  const [officer, setOfficer] = useState('');
  const [pass, setPass] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Citizen QR Portal states
  const [projectCode, setProjectCode] = useState('test-project-123');
  const [scanning, setScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Cleanup camera scanner on unmount or tab switch
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [portalMode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChecking(true);

    // If Supabase credentials are not configured, allow entering demo environment directly
    if (!isSupabaseConfigured) {
      setChecking(false);
      localStorage.setItem('fg_auth', '1');
      localStorage.setItem('fg_user', JSON.stringify({
        id: 'demo-officer-id',
        email: officer.trim() || 'officer@example.com',
        name: officer.trim() ? officer.trim().split('@')[0] : 'Authorized Officer',
        role: 'admin',
        state: null,
        district: null,
        region: 'ALL'
      }));
      onLogin();
      return;
    }

    // 1. Verify email and password securely with Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: officer.trim(),
      password: pass,
    });

    if (authError || !data.user) {
      setError('Invalid officer ID or password.');
      setChecking(false);
      return;
    }

    // 2. Fetch the real-time position and region from your 'profiles' table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role, state, district')
      .eq('id', data.user.id)
      .single();

    setChecking(false);

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // 3. Store the database profile in local storage to unlock the app
    localStorage.setItem('fg_auth', '1');
    localStorage.setItem('fg_user', JSON.stringify({ 
      id: data.user.id,
      email: data.user.email,
      name: profile?.full_name || 'Authorized Officer', 
      role: profile?.role || 'admin', 
      state: profile?.state || null,
      district: profile?.district || null,
      region: profile?.district || profile?.state || 'ALL' 
    }));

    onLogin();
  };

  const startCameraScan = async () => {
    setIsCameraActive(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader-container');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            scanner.stop().catch(() => {});
            setIsCameraActive(false);
            setProjectCode(decodedText);
            toast('QR Code scanned successfully!', 'success');
            navigate(`/feedback/${encodeURIComponent(decodedText)}`);
          },
          () => {}
        );
      } catch (err) {
        console.error('Camera error:', err);
        toast('Unable to access camera. Please enter code manually.', 'warn');
        setIsCameraActive(false);
      }
    }, 100);
  };

  const stopCameraScan = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Stop error:', err);
      }
    }
    setIsCameraActive(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectCode.trim()) {
      toast('Please enter a valid project code', 'warn');
      return;
    }
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      navigate(`/feedback/${projectCode.trim()}`);
    }, 600);
  };

  return (
    <motion.div
      className="relative flex min-h-screen w-full items-center justify-center px-4 bg-canvas"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute inset-0 grid place-items-center opacity-[0.05]">
        <div className="h-[480px] w-[480px] rounded-full border border-brand blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: booted ? 0 : 0.2, duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-[400px] rounded-3xl border border-edge2 bg-panel/80 p-8 shadow-soft backdrop-blur-xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/40">
            <ShieldCheck className="h-8 w-8 text-brand" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#48d29b] ring-2 ring-panel" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-[0.14em] text-ink">FRAUDGUARD</h1>
          <p className="mt-1.5 text-[13px] font-medium text-mute">AI-Powered MPLADS Verification</p>
          <p className="mt-2 max-w-[260px] text-[12px] italic leading-relaxed text-faint">
            "Protecting Public Funds Through Intelligent Verification"
          </p>
        </div>

        {/* PORTAL SWITCHER TABS */}
        <div className="mb-6 grid grid-cols-2 rounded-xl border border-edge bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => { stopCameraScan(); setPortalMode('officer'); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              portalMode === 'officer'
                ? 'bg-brand text-white shadow'
                : 'text-mute hover:text-ink'
            }`}
          >
            <User className="h-3.5 w-3.5" /> Nodal Auditor
          </button>
          <button
            type="button"
            onClick={() => setPortalMode('citizen')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              portalMode === 'citizen'
                ? 'bg-brand text-white shadow'
                : 'text-mute hover:text-ink'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" /> Citizen Portal
          </button>
        </div>

        {portalMode === 'officer' ? (
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="label mb-1.5 block">Officer ID (email)</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-edge bg-white/[0.02] px-3.5 py-3 transition focus-within:border-brand/50">
                <User className="h-4 w-4 text-faint" />
                <input
                  value={officer}
                  onChange={(e) => setOfficer(e.target.value)}
                  placeholder="e.g. parth@example.com"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="label mb-1.5 block">Password</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-edge bg-white/[0.02] px-3.5 py-3 transition focus-within:border-brand/50">
                <Lock className="h-4 w-4 text-faint" />
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
                />
              </div>
            </div>

            {!isSupabaseConfigured && (
              <div className="rounded-xl border border-[#f0b64b]/30 bg-[#f0b64b]/10 p-2.5 text-center text-[11px] text-[#f0b64b]">
                Demo Mode: Supabase not configured. Click below to enter.
              </div>
            )}

            {error && <p className="text-[12px] text-danger">{error}</p>}

            <button type="submit" className="btn-primary w-full py-3.5 text-sm" disabled={checking}>
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Enter Command Center <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-3.5">
            {!isCameraActive ? (
              <div className="rounded-xl border border-edge bg-white/[0.02] p-4 text-center">
                <button
                  type="button"
                  onClick={startCameraScan}
                  className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand transition hover:bg-brand/25 cursor-pointer shadow-glow"
                >
                  <Camera className="h-7 w-7" />
                </button>
                <h3 className="text-xs font-bold text-ink">Tap to Open Live Camera Scanner</h3>
                <p className="mt-1 text-[11px] text-mute">Scan project QR code at site to load feedback.</p>
              </div>
            ) : (
              <div className="relative rounded-xl border border-brand/40 bg-black p-2 text-center">
                <button
                  type="button"
                  onClick={stopCameraScan}
                  className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div id="qr-reader-container" className="overflow-hidden rounded-lg" style={{ width: '100%' }} />
                <p className="mt-1.5 text-[10px] text-mute">Position QR code within frame</p>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="label mb-1.5 block">Or Enter Project Code Manually</label>
                <input
                  type="text"
                  required
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="e.g. test-project-123"
                  className="w-full rounded-xl border border-edge bg-white/[0.02] px-3.5 py-3 text-sm text-ink placeholder:text-faint focus:border-brand/50 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={scanning}
                className="btn-primary w-full py-3.5 text-sm"
              >
                {scanning ? 'Loading Portal…' : 'Open Feedback Form'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-edge pt-4 text-center">
          {([
            ['AI Engine', 'Operational', Cpu],
            ['Verification', 'Online', SearchCheck],
            ['Environment', 'Secure', Shield],
          ] as [string, string, React.ComponentType<{ className?: string }>][]).map(([a, b, Icon]) => (
            <div key={a} className="flex flex-col items-center gap-1">
              <Icon className="h-3.5 w-3.5 text-[#48d29b]" />
              <span className="text-[10px] font-semibold text-ink">{a}</span>
              <span className="text-[9px] text-faint">{b}</span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-[10px] font-medium uppercase tracking-wider text-faint">
          DEMO ENVIRONMENT · Synthetic Data · SIH2026 · SIH26102
        </p>
      </motion.div>
    </motion.div>
  );
}