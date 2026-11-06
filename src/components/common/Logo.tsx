import React from 'react';
import { Shield, Cpu } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showSubtitle = true }) => {
  const iconSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Futuristic Shield Icon with glowing ring */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-tr from-[#4D8DFF] to-[#906BFF] opacity-60 blur-[6px] animate-pulse" />
        <div className={`relative ${iconSize} rounded-xl bg-[#131E35] border border-[#4D8DFF]/40 flex items-center justify-center shadow-lg shadow-[#4D8DFF]/20`}>
          <Shield className="w-4/6 h-4/6 text-[#4D8DFF]" />
          <Cpu className="absolute w-2.5 h-2.5 text-[#906BFF] -bottom-0.5 -right-0.5" />
        </div>
      </div>

      <div className="flex flex-col">
        <div className={`font-black tracking-wider uppercase bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent font-mono ${titleSize}`}>
          Account Command Center
        </div>
        {showSubtitle && (
          <div className="text-[10px] tracking-widest text-[#4D8DFF] font-semibold uppercase font-mono">
            Zero-Trust Admin Console
          </div>
        )}
      </div>
    </div>
  );
};
