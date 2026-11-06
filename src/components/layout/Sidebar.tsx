import React from 'react';
import {
  LayoutDashboard,
  Users,
  Mail,
  Video,
  Search,
  Activity,
  Settings,
  X,
  ExternalLink,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useAccount } from '../../context/AccountContext.tsx';
import { useMode } from '../../context/ModeContext.tsx';

export type NavigationTab =
  | 'overview'
  | 'accounts'
  | 'gmail'
  | 'youtube'
  | 'search'
  | 'logs'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { accounts, activeAccount } = useAccount();
  const { isDemo } = useMode();

  const navItems = [
    { id: 'overview' as NavigationTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'accounts' as NavigationTab, label: 'My Google Accounts', icon: Users, badge: accounts.length },
    { id: 'gmail' as NavigationTab, label: 'Gmail', icon: Mail },
    { id: 'youtube' as NavigationTab, label: 'YouTube History', icon: Video },
    { id: 'search' as NavigationTab, label: 'Search History', icon: Search },
    { id: 'logs' as NavigationTab, label: 'Activity Logs', icon: Activity },
    { id: 'settings' as NavigationTab, label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: NavigationTab) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-[#080D1B] border-r border-[#1E2C4F] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation list */}
        <div className="p-4 space-y-1 overflow-y-auto">
          {/* Active Account Pill */}
          {activeAccount && (
            <div className="mb-4 p-3 rounded-xl bg-[#131E35] border border-[#1E2C4F] flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-[10px] uppercase tracking-wider text-[#4D8DFF] font-mono font-semibold">
                  Active Context
                </div>
                <div className="text-xs font-semibold text-white truncate">{activeAccount.name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{activeAccount.email}</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
          )}

          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-3 py-1">
            Command Modules
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#4D8DFF]/20 to-[#906BFF]/20 text-white border border-[#4D8DFF]/40 shadow-lg shadow-[#4D8DFF]/10 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-[#131E35]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#4D8DFF]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#4D8DFF] text-black font-bold'
                        : 'bg-[#131E35] text-slate-400 border border-[#1E2C4F]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom System & Google Links */}
        <div className="p-4 border-t border-[#1E2C4F] space-y-3">
          {isDemo && (
            <div className="p-2.5 rounded-xl bg-[#906BFF]/10 border border-[#906BFF]/30 text-[#d8caff] text-[11px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#906BFF] shrink-0" />
              <span>Demo simulation active. Fictional accounts & records displayed.</span>
            </div>
          )}

          <div className="text-[11px] text-slate-400 space-y-1 font-mono">
            <a
              href="https://takeout.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-[#131E35] hover:text-white transition-colors"
            >
              <span>Google Takeout</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-[#131E35] hover:text-white transition-colors"
            >
              <span>Account Permissions</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          <div className="text-[10px] text-slate-400 text-center font-mono pt-2 border-t border-[#1E2C4F]/50">
            Account Command Center &bull; v2.4
          </div>
        </div>
      </aside>
    </>
  );
};
