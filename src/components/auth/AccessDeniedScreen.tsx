import React from 'react';
import { useAuth, AUTHORIZED_ADMIN_EMAIL } from '../../context/AuthContext.tsx';
import { ShieldAlert, LogOut, ArrowLeft, Lock } from 'lucide-react';
import { Logo } from '../common/Logo.tsx';

export const AccessDeniedScreen: React.FC = () => {
  const { accessDenied, logout, clearAccessDenied, loginDemoAdmin } = useAuth();

  return (
    <div className="min-h-screen w-full bg-[#080D1B] flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100 font-sans">
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl bg-[#131E35]/95 border border-rose-500/40 p-8 shadow-2xl shadow-rose-950/40 backdrop-blur-xl">
          {/* Top Rose Glow */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-rose-500/20 blur-md animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-9 h-9" />
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold font-mono text-white tracking-wide uppercase">
              403 Access Denied
            </h2>
            <p className="mt-2 text-xs text-rose-300 font-medium">
              UNAUTHORIZED GOOGLE ACCOUNT DETECTED
            </p>
          </div>

          <div className="space-y-3 mb-6 p-4 rounded-xl bg-[#080D1B] border border-rose-900/40 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Attempted Account:</span>
              <span className="font-mono text-rose-300 break-all bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/30">
                {accessDenied?.attemptedEmail || 'Unknown Account'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Required Administrator:</span>
              <span className="font-mono text-emerald-300 break-all bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">
                {AUTHORIZED_ADMIN_EMAIL}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] pt-1 leading-relaxed border-t border-[#1E2C4F]">
              Account Command Center is a single-administrator security perimeter. Public registrations, invitations, and non-admin Google logins are permanently rejected.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={async () => {
                await logout();
                clearAccessDenied();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 transition-all cursor-pointer shadow-lg shadow-rose-900/30"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Try Authorized Account</span>
            </button>

            <button
              onClick={() => {
                clearAccessDenied();
                loginDemoAdmin();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs text-slate-300 bg-[#080D1B] border border-[#1E2C4F] hover:border-slate-500 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Preview (Demo Mode)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
