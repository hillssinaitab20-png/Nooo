import React, { useState } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import { useMode } from '../context/ModeContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  Mail,
  Video,
  Search,
  Key,
} from 'lucide-react';

interface AccountsPageProps {
  onOpenSetupGuide: () => void;
  onOpenAddAccount: () => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
  onOpenSetupGuide,
  onOpenAddAccount,
}) => {
  const {
    accounts,
    activeAccount,
    setActiveAccount,
    syncAccount,
    disconnectAccount,
    deleteAccount,
    deleteAccountData,
    oauthStatus,
    isLoading,
    refreshAccounts,
  } = useAccount();
  const { isDemo } = useMode();
  const { success, error } = useToast();

  const [operatingAccountId, setOperatingAccountId] = useState<string | null>(null);

  const handleSync = async (accountId: string) => {
    setOperatingAccountId(accountId);
    await syncAccount(accountId);
    setOperatingAccountId(null);
  };

  const handleDisconnect = async (accountId: string) => {
    if (window.confirm('Disconnect this Google account? Its refresh token will be revoked with Google.')) {
      setOperatingAccountId(accountId);
      await disconnectAccount(accountId);
      setOperatingAccountId(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (window.confirm('Permanently delete this account record, all its stored credentials, and imported history?')) {
      setOperatingAccountId(accountId);
      await deleteAccount(accountId);
      setOperatingAccountId(null);
    }
  };

  const handlePurgeData = async (accountId: string) => {
    if (window.confirm('Purge all imported YouTube and Google Search records for this account?')) {
      setOperatingAccountId(accountId);
      await deleteAccountData(accountId);
      setOperatingAccountId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1E2C4F]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white uppercase">
              My Google Accounts
            </h1>
            {isDemo && <StatusBadge status="demo" size="sm" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage, synchronize, and revoke independently authorized administrator-owned Google accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshAccounts()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 bg-[#131E35] border border-[#1E2C4F] hover:border-[#4D8DFF]/40 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#4D8DFF]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenAddAccount}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#4D8DFF] to-[#3a70d6] hover:from-[#5c98ff] hover:to-[#437de6] transition-all cursor-pointer shadow-lg shadow-[#4D8DFF]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Google Account</span>
          </button>
        </div>
      </div>

      {/* OAuth Setup Required Warning (if credentials missing on server) */}
      {!oauthStatus?.isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-white uppercase font-mono">
                Google Cloud OAuth Credentials Not Yet Configured
              </div>
              <p className="text-amber-300/90 mt-0.5 leading-relaxed">
                To connect real live Google accounts, configure your <code className="bg-amber-950 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-amber-950 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in the server environment.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSetupGuide}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-semibold font-mono text-xs hover:bg-amber-400 transition-colors shrink-0"
          >
            View Setup Guide &rarr;
          </button>
        </div>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.length === 0 ? (
          <div className="md:col-span-2 p-12 text-center rounded-2xl bg-[#131E35] border border-dashed border-[#1E2C4F] text-slate-400 text-xs space-y-3">
            <Users className="w-12 h-12 text-slate-400 mx-auto" />
            <div className="text-white font-medium text-sm">No Google Accounts Connected</div>
            <p className="max-w-md mx-auto text-slate-400 leading-relaxed">
              Authorize an account using the dedicated server-side OAuth 2.0 flow. You can also toggle <strong>Demo Mode</strong> in the header to explore with fictional accounts.
            </p>
            <button
              onClick={onOpenAddAccount}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4D8DFF] hover:bg-[#5c98ff] transition-all"
            >
              Add Google Account
            </button>
          </div>
        ) : (
          accounts.map(acc => {
            const isActive = activeAccount?.accountId === acc.accountId;
            const isOperating = operatingAccountId === acc.accountId;

            return (
              <div
                key={acc.accountId}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-[#131E35] border-[#4D8DFF]/60 shadow-xl shadow-[#4D8DFF]/10'
                    : 'bg-[#131E35] border-[#1E2C4F] hover:border-slate-500'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {acc.picture ? (
                        <img
                          src={acc.picture}
                          alt={acc.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-[#1E2C4F] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-[#4D8DFF]/20 text-[#4D8DFF] flex items-center justify-center font-bold text-base shrink-0">
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm sm:text-base truncate">
                            {acc.name}
                          </span>
                          {acc.isDemo && <StatusBadge status="demo" size="sm" />}
                        </div>
                        <div className="text-xs text-slate-300 font-mono truncate">{acc.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {acc.accountId.slice(0, 16)}...
                        </div>
                      </div>
                    </div>

                    <StatusBadge status={acc.status} />
                  </div>

                  {/* Service Indicators */}
                  <div className="p-3 rounded-xl bg-[#080D1B] border border-[#1E2C4F] space-y-2 text-xs mb-4">
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                      Enabled Integrations
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-mono">
                        <Mail className="w-3 h-3 text-blue-400" />
                        Gmail Read-Only
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#906BFF]/10 border border-[#906BFF]/30 text-[#d8caff] text-[11px] font-mono">
                        <Video className="w-3 h-3 text-[#906BFF]" />
                        YouTube Takeout
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                        <Search className="w-3 h-3 text-emerald-400" />
                        Search Takeout
                      </span>
                    </div>
                  </div>

                  {/* Sync Metadata */}
                  <div className="text-[11px] text-slate-400 space-y-1 font-mono mb-4">
                    <div className="flex justify-between">
                      <span>Connected At:</span>
                      <span className="text-slate-300">
                        {new Date(acc.connectedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Verified Sync:</span>
                      <span className="text-slate-300">
                        {new Date(acc.lastSyncAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#1E2C4F] flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveAccount(acc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-[#080D1B] text-slate-300 hover:text-white border border-[#1E2C4F]'
                    }`}
                  >
                    {isActive ? '✓ Active Context' : 'Set as Active'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSync(acc.accountId)}
                      disabled={isOperating}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#080D1B] border border-transparent hover:border-[#1E2C4F] transition-all"
                      title="Sync connection status"
                    >
                      <RefreshCw className={`w-4 h-4 ${isOperating ? 'animate-spin text-[#4D8DFF]' : ''}`} />
                    </button>

                    <button
                      onClick={() => handlePurgeData(acc.accountId)}
                      disabled={isOperating}
                      className="p-1.5 rounded-lg text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/30 transition-all text-xs"
                      title="Purge imported history data"
                    >
                      Clear Data
                    </button>

                    <button
                      onClick={() => handleDisconnect(acc.accountId)}
                      disabled={isOperating}
                      className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/30 transition-all text-xs flex items-center gap-1"
                      title="Revoke OAuth token & disconnect"
                    >
                      <Unlink className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>

                    <button
                      onClick={() => handleDelete(acc.accountId)}
                      disabled={isOperating}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                      title="Remove account record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
