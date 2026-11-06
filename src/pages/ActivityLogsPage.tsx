import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useMode } from '../context/ModeContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { ActivityLog } from '../types/index.ts';
import {
  Activity,
  RefreshCw,
  Filter,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const { idToken } = useAuth();
  const { isDemo } = useMode();
  const { success } = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/activity-logs?limit=100&demo=${isDemo}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [idToken, isDemo]);

  const filteredLogs = logs.filter(log => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1E2C4F]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white uppercase">
              Application Activity Logs
            </h1>
            {isDemo && <StatusBadge status="demo" size="sm" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable application security and audit trail &bull; Logins, authorizations, sync events, and purges
          </p>
        </div>

        <button
          onClick={() => {
            fetchLogs();
            success('Logs Refreshed', 'Retrieved latest application audit events.');
          }}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 bg-[#131E35] border border-[#1E2C4F] hover:border-[#4D8DFF]/40 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#4D8DFF]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Security Scope Notice */}
      <div className="p-3.5 rounded-xl bg-[#080D1B] border border-[#1E2C4F] text-xs text-slate-400 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-[#4D8DFF] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Security Notice:</strong> These entries reflect internal application audit events within Account Command Center. They do not claim access to Google&apos;s external infrastructure or account device logs. In compliance with strict zero-trust standards, email contents, tokens, and cryptographic keys are <em>never</em> written to audit logs.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#131E35] border border-[#1E2C4F] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#080D1B] border border-[#1E2C4F] rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">Event Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-[#080D1B] border border-[#1E2C4F] rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
            >
              <option value="all">All Events</option>
              <option value="login">Administrator Login</option>
              <option value="connect_account">Account Authorization</option>
              <option value="disconnect_account">Account Disconnect</option>
              <option value="sync_gmail">Gmail Sync</option>
              <option value="import_takeout">Takeout Import</option>
              <option value="delete_data">Data Deletion</option>
            </select>
          </div>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Showing <span className="text-white font-bold">{filteredLogs.length}</span> of {logs.length} events
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-[#131E35] border border-[#1E2C4F] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#4D8DFF]" />
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No activity logs match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1E2C4F] text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-[#080D1B]/50">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Target Account</th>
                  <th className="py-3 px-4 font-semibold">Summary</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2C4F]/50">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#080D1B]/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#080D1B] border border-[#1E2C4F] text-[10px] font-mono text-blue-300">
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 text-xs truncate max-w-[150px]">
                      {log.accountEmail || 'Administrator'}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {log.summary}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : log.status === 'error'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : log.status === 'warning'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {log.status === 'success' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {log.status === 'error' && <XCircle className="w-2.5 h-2.5" />}
                        {log.status === 'warning' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {log.status === 'info' && <Info className="w-2.5 h-2.5" />}
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
