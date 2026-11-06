import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Clock, LogIn } from 'lucide-react';
import { Logo } from '../common/Logo.tsx';

export const SessionExpiredScreen: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen w-full bg-[#080D1B] flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100 font-sans">
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl bg-[#131E35]/95 border border-amber-500/40 p-8 shadow-2xl shadow-black/80 backdrop-blur-xl text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Clock className="w-8 h-8" />
            </div>
          </div>

          <h2 className="text-xl font-bold font-mono text-white tracking-wide uppercase mb-2">
            Session Expired
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Your administrator authorization session has reached its security TTL. Please sign in again with your administrator username and password.
          </p>

          <div className="space-y-2">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-[#4D8DFF] to-[#3a70d6] hover:from-[#5c98ff] hover:to-[#437de6] transition-all cursor-pointer shadow-lg shadow-[#4D8DFF]/25"
            >
              <LogIn className="w-4 h-4" />
              <span>Return to Login Screen</span>
            </button>
            <button
              onClick={logout}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Return to Login Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
