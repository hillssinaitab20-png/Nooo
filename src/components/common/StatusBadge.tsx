import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'expired' | 'needs_reauth' | 'demo' | 'active';
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', className = '' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'connected':
    case 'active':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Connected
        </span>
      );

    case 'needs_reauth':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono ${sizeClasses} ${className}`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Re-auth Needed
        </span>
      );

    case 'expired':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono ${sizeClasses} ${className}`}
        >
          <Clock className="w-3 h-3 text-rose-400" />
          Token Expired
        </span>
      );

    case 'disconnected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 font-mono ${sizeClasses} ${className}`}
        >
          <XCircle className="w-3 h-3 text-slate-400" />
          Disconnected
        </span>
      );

    case 'demo':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-md bg-[#906BFF]/20 border border-[#906BFF]/50 text-[#d8caff] font-mono tracking-wider ${sizeClasses} ${className}`}
        >
          <Sparkles className="w-2.5 h-2.5 text-[#906BFF]" />
          DEMO
        </span>
      );

    default:
      return null;
  }
};

export const VerifiedAdminBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#4D8DFF]/15 border border-[#4D8DFF]/40 text-[#4D8DFF] font-mono ${className}`}
    >
      <ShieldCheck className="w-3 h-3 text-[#4D8DFF]" />
      VERIFIED ADMIN
    </span>
  );
};
