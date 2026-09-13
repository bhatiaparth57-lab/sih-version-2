import { LogOut, User } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function Topbar({ title, subtitle }: { title: string, subtitle: string }) {
  const handleLogout = async () => {
    // 1. Tell Supabase to invalidate the session securely (if configured)
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    
    // 2. Destroy the local keys in the browser memory
    localStorage.removeItem('fg_auth');
    localStorage.removeItem('fg_user');
    
    // 3. Force the app to reload, which instantly locks the screen
    window.location.href = '/'; 
  };

  return (
    <header className="flex items-center justify-between border-b border-edge bg-surface px-6 py-4">
      <div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        <p className="text-xs text-mute">{subtitle}</p>
      </div>

      {/* Profile & Logout Section */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/30">
          <User className="h-5 w-5" />
        </div>

        <button 
          onClick={handleLogout}
          className="ml-2 flex items-center gap-2 rounded-lg border border-[#ff5860]/20 bg-[#ff5860]/10 px-3 py-2 text-xs font-medium text-[#ff5860] transition-colors hover:bg-[#ff5860]/20"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}