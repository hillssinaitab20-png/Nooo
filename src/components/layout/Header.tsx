import React, { useState, useRef, useEffect } from 'react';
import { Logo } from '../common/Logo.tsx';
import { StatusBadge, VerifiedAdminBadge } from '../common/StatusBadge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useAccount } from '../../context/AccountContext.tsx';
import { useMode } from '../../context/ModeContext.tsx';
import {
  Menu,
  ChevronDown,
  User,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSetupGuide: () => void;
  onOpenAddAccount: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenSetupGuide,
  onOpenAddAccount,
}) => {
  const { user, logout } = useAuth();
  const { accounts, activeAccount, setActiveAccount, syncAccount, isLoading } = useAccount();
  const { isDemo, toggleMode } = useMode();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#080D1B]/90 backdrop-blur-md border-b border-[#1E2C4F] px-4 lg:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#131E35] lg:hidden transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Logo size="sm" showSubtitle={false} />
      </div>

      {/* Middle/Right: Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Demo Mode Toggle */}
        <div className="flex items-center">
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
              isDemo
                ? 'bg-[#906BFF]/20 border border-[#906BFF]/60 text-[#d8caff] shadow-lg shadow-[#906BFF]/10'
                : 'bg-[#131E35] border border-[#1E2C4F] text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between Live Production data and Demo simulation"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDemo ? 'text-[#906BFF]' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isDemo ? 'DEMO MODE' : 'PROD MODE'}</span>
          </button>
        </div>

        {/* Global Account Selector */}
        <div className="relative" ref={accountMenuRef}>
          <button
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131E35] border border-[#1E2C4F] hover:border-[#4D8DFF]/40 text-xs text-slate-200 transition-all cursor-pointer"
          >
            {activeAccount ? (
              <>
                {activeAccount.picture ? (
                  <img
                    src={activeAccount.picture}
                    alt={activeAccount.name}
                    className="w-5 h-5 rounded-full object-cover border border-[#4D8DFF]/30"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#4D8DFF]/20 text-[#4D8DFF] flex items-center justify-center font-bold text-[10px]">
                    {activeAccount.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-mono text-white max-w-[120px] sm:max-w-[160px] truncate">
                  {activeAccount.name}
                </span>
                {activeAccount.isDemo && <span className="text-[9px] px-1 bg-[#906BFF]/30 text-[#d8caff] rounded">DEMO</span>}
              </>
            ) : (
              <span className="text-slate-400 font-mono">Select Account</span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Account Dropdown */}
          {accountMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#131E35] border border-[#1E2C4F] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-[#1E2C4F]/60">
                Authorized Google Accounts ({accounts.length})
              </div>
              <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                {accounts.map(acc => (
                  <div
                    key={acc.accountId}
                    onClick={() => {
                      setActiveAccount(acc);
                      setAccountMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      activeAccount?.accountId === acc.accountId
                        ? 'bg-[#4D8DFF]/15 border border-[#4D8DFF]/30'
                        : 'hover:bg-[#080D1B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {acc.picture ? (
                        <img src={acc.picture} alt={acc.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#4D8DFF]/20 text-[#4D8DFF] flex items-center justify-center font-bold text-xs shrink-0">
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate flex items-center gap-1">
                          <span>{acc.name}</span>
                          {acc.isDemo && <span className="text-[9px] px-1 bg-[#906BFF]/30 text-[#d8caff] rounded">DEMO</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{acc.email}</div>
                      </div>
                    </div>
                    <StatusBadge status={acc.status} size="sm" />
                  </div>
                ))}
              </div>

              {/* Add Account Shortcut */}
              <div className="pt-2 border-t border-[#1E2C4F]/60 flex gap-1">
                <button
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onOpenAddAccount();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#4D8DFF] to-[#3a70d6] hover:from-[#5c98ff] hover:to-[#437de6] transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Google Account</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-[#131E35] border border-[#1E2C4F] hover:border-[#4D8DFF]/40 transition-all cursor-pointer"
          >
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-white leading-tight">Admin Console</span>
              <span className="text-[10px] text-[#4D8DFF] font-mono leading-tight">Primary Auth</span>
            </div>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Admin'}
                className="w-8 h-8 rounded-lg object-cover border border-[#4D8DFF]/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#4D8DFF]/20 text-[#4D8DFF] flex items-center justify-center font-bold text-xs">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
          </button>

          {/* Profile Dropdown */}
          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#131E35] border border-[#1E2C4F] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 pb-3 border-b border-[#1E2C4F]">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#4D8DFF]/20 text-[#4D8DFF] flex items-center justify-center font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{user?.displayName || 'Administrator'}</div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</div>
                  <VerifiedAdminBadge className="mt-1" />
                </div>
              </div>

              <div className="py-3 space-y-1 text-xs">
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onOpenSetupGuide();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#080D1B] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#4D8DFF]" />
                    OAuth & Cloud Setup Guide
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="pt-2 border-t border-[#1E2C4F]">
                <button
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 transition-colors text-xs font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Terminate Admin Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
