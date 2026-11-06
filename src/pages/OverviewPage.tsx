import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAccount } from '../context/AccountContext.tsx';
import { useMode } from '../context/ModeContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { SystemOverviewMetrics, ActivityLog } from '../types/index.ts';
import {
  Users,
  Mail,
  RefreshCw,
  Plus,
  UploadCloud,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  HardDrive,
  BarChart3,
} from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (tab: any) => void;
  onOpenAddAccount: () => void;
  onOpenTakeoutModal: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  onOpenAddAccount,
  onOpenTakeoutModal,
}) => {
  const { idToken } = useAuth();
  const { accounts, activeAccount, setActiveAccount } = useAccount();
  const { isDemo } = useMode();
  const { success, error } = useToast();

  const [metrics, setMetrics] = useState<SystemOverviewMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/system/overview?demo=${isDemo}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error('Failed to fetch overview metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [idToken, isDemo]);

  const handleRefresh = async () => {
    await fetchOverview();
    success('Overview Refreshed', 'Retrieved latest metrics across connected accounts.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1E2C4F]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white uppercase">
              Command Overview
            </h1>
            {isDemo && <StatusBadge status="demo" size="sm" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status across authorized Google accounts, Gmail APIs, and export stores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 bg-[#131E35] border border-[#1E2C4F] hover:border-[#4D8DFF]/40 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#4D8DFF]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenAddAccount}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#4D8DFF] to-[#3a70d6] hover:from-[#5c98ff] hover:to-[#437de6] transition-all cursor-pointer shadow-lg shadow-[#4D8DFF]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Accounts */}
        <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] relative overflow-hidden group hover:border-[#4D8DFF]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Connected Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-[#4D8DFF]/15 border border-[#4D8DFF]/30 flex items-center justify-center text-[#4D8DFF]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {metrics ? metrics.connectedAccountsTotal : accounts.length}
            </span>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {metrics?.activeConnections || accounts.filter(a => a.status === 'connected').length} Active
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-[#1E2C4F]/50 pt-2">
            <span>Disconnected / Expired</span>
            <span className="font-mono text-slate-300">
              {metrics?.disconnectedAccounts || accounts.filter(a => a.status !== 'connected').length}
            </span>
          </div>
        </div>

        {/* Card 2: Gmail Inbox */}
        <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] relative overflow-hidden group hover:border-[#4D8DFF]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Gmail Inbox Messages</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {metrics ? metrics.gmailInboxTotal : 0}
            </span>
            {isDemo && <StatusBadge status="demo" size="sm" />}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-[#1E2C4F]/50 pt-2">
            <span>Unread Attention</span>
            <span className="font-mono text-blue-300 font-semibold">
              {metrics ? metrics.gmailUnreadTotal : 0} unread
            </span>
          </div>
        </div>

        {/* Card 3: Sent Count */}
        <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] relative overflow-hidden group hover:border-[#906BFF]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Gmail Sent Messages</span>
            <div className="w-8 h-8 rounded-xl bg-[#906BFF]/15 border border-[#906BFF]/30 flex items-center justify-center text-[#906BFF]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {metrics ? metrics.gmailSentTotal : 0}
            </span>
            {isDemo && <StatusBadge status="demo" size="sm" />}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-[#1E2C4F]/50 pt-2">
            <span>Permissions</span>
            <span className="font-mono text-slate-300">gmail.readonly</span>
          </div>
        </div>

        {/* Card 4: Connection Health */}
        <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Sync Status</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-300">
              Operational
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-[#1E2C4F]/50 pt-2">
            <span>Last Sync</span>
            <span className="font-mono text-slate-300">
              {metrics?.lastSyncAt ? new Date(metrics.lastSyncAt).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Connected Accounts Quick Cards & Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Authorized Google Accounts */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4D8DFF]" />
                Authorized Google Accounts ({accounts.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Independently authorized by the administrator via OAuth 2.0 code flow
              </p>
            </div>
            <button
              onClick={() => onNavigate('accounts')}
              className="text-xs text-[#4D8DFF] hover:underline font-mono flex items-center gap-1"
            >
              Manage All &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {accounts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#1E2C4F] rounded-xl text-slate-400 text-xs">
                <p>No Google accounts connected yet.</p>
                <button
                  onClick={onOpenAddAccount}
                  className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4D8DFF] hover:bg-[#5c98ff] transition-all"
                >
                  Connect Your First Google Account
                </button>
              </div>
            ) : (
              accounts.map(acc => {
                const isActive = activeAccount?.accountId === acc.accountId;
                return (
                  <div
                    key={acc.accountId}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[#080D1B] border-[#4D8DFF]/40 shadow-lg shadow-[#4D8DFF]/5'
                        : 'bg-[#080D1B]/60 border-[#1E2C4F] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {acc.picture ? (
                        <img
                          src={acc.picture}
                          alt={acc.name}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#1E2C4F]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#4D8DFF]/20 text-[#4D8DFF] flex items-center justify-center font-bold text-sm shrink-0">
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs sm:text-sm truncate">
                            {acc.name}
                          </span>
                          {acc.isDemo && <StatusBadge status="demo" size="sm" />}
                        </div>
                        <div className="text-xs text-slate-400 font-mono truncate">{acc.email}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Services: <span className="text-slate-300 font-mono">Gmail, YouTube, Search</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <StatusBadge status={acc.status} />
                      <button
                        onClick={() => setActiveAccount(acc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                            : 'bg-[#131E35] text-slate-300 hover:text-white border border-[#1E2C4F]'
                        }`}
                      >
                        {isActive ? 'Active' : 'Set Active'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Quick Actions & Integration Health */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-3">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Quick Operations
            </h3>

            <div className="space-y-2">
              <button
                onClick={onOpenAddAccount}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#080D1B] border border-[#1E2C4F] hover:border-[#4D8DFF]/50 text-slate-200 hover:text-white text-xs transition-colors"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <Plus className="w-4 h-4 text-[#4D8DFF]" />
                  Add Google Account (OAuth 2.0)
                </span>
                <span className="font-mono text-[10px] text-slate-400">&rarr;</span>
              </button>

              <button
                onClick={onOpenTakeoutModal}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#080D1B] border border-[#1E2C4F] hover:border-[#906BFF]/50 text-slate-200 hover:text-white text-xs transition-colors"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <UploadCloud className="w-4 h-4 text-[#906BFF]" />
                  Import Takeout Archive (ZIP/JSON)
                </span>
                <span className="font-mono text-[10px] text-slate-400">&rarr;</span>
              </button>

              <button
                onClick={() => onNavigate('gmail')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#080D1B] border border-[#1E2C4F] hover:border-blue-400/50 text-slate-200 hover:text-white text-xs transition-colors"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Access Gmail Viewer
                </span>
                <span className="font-mono text-[10px] text-slate-400">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Security & Token Vault Status */}
          <div className="p-4 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-mono font-bold text-white text-[11px] uppercase">
              <Shield className="w-4 h-4 text-emerald-400" />
              Security Architecture
            </div>
            <ul className="text-slate-400 space-y-1.5 text-[11px] leading-relaxed">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>AES-256-GCM encrypted refresh token store</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Zero raw token exposure to client bundle</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>On-demand Gmail fetch (no permanent email bodies)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Application Activity Logs */}
      <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#906BFF]" />
              Recent Application Activity
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Audit log of logins, synchronization checks, imports, and account changes
            </p>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="text-xs text-[#4D8DFF] hover:underline font-mono"
          >
            View Full Audit Trail &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E2C4F] text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Event Type</th>
                <th className="pb-3 font-semibold">Target Account</th>
                <th className="pb-3 font-semibold">Summary</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2C4F]/50">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No activity logged yet.
                  </td>
                </tr>
              ) : (
                recentLogs.slice(0, 6).map(log => (
                  <tr key={log.id} className="hover:bg-[#080D1B]/40 transition-colors">
                    <td className="py-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 font-mono text-white">
                      <span className="px-2 py-0.5 rounded bg-[#080D1B] border border-[#1E2C4F] text-[10px] text-blue-300">
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-300 truncate max-w-[140px]">
                      {log.accountEmail || 'Administrator'}
                    </td>
                    <td className="py-3 text-slate-300 pr-4">
                      {log.summary}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : log.status === 'error'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
