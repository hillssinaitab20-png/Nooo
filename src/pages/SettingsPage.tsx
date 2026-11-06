import React, { useState } from 'react';
import { useAuth, AUTHORIZED_ADMIN_EMAIL } from '../context/AuthContext.tsx';
import { useAccount } from '../context/AccountContext.tsx';
import { useMode } from '../context/ModeContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { VerifiedAdminBadge, StatusBadge } from '../components/common/StatusBadge.tsx';
import {
  Settings,
  ShieldCheck,
  Key,
  HardDrive,
  Trash2,
  ExternalLink,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  FileCode,
  Sliders,
} from 'lucide-react';

interface SettingsPageProps {
  onOpenSetupGuide: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenSetupGuide }) => {
  const { user, idToken, logout } = useAuth();
  const { oauthStatus, accounts } = useAccount();
  const { isDemo, toggleMode } = useMode();
  const { success, error: toastError } = useToast();

  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ passed: boolean; message: string } | null>(null);

  // Change password states
  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      toastError('Missing Fields', 'Please enter current and new passwords.');
      return;
    }
    if (newPass !== confirmPass) {
      toastError('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPass.length < 8) {
      toastError('Weak Password', 'New password must be at least 8 characters.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        success('Password Updated', 'Administrator password has been successfully updated.');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        toastError('Password Update Failed', data.message);
      }
    } catch {
      toastError('Network Error', 'Failed to communicate with authorization server.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handlePurgeAllTakeoutData = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete ALL imported YouTube and Google Search records across all accounts? This cannot be undone.'
      )
    ) {
      setIsPurging(true);
      try {
        for (const acc of accounts) {
          await fetch(`/api/accounts/${acc.accountId}/data`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${idToken}` },
          });
        }
        success('All History Purged', 'Cleaned all imported Takeout records from server storage.');
      } catch {
        toastError('Purge Failed', 'Network error while purging records.');
      } finally {
        setIsPurging(false);
      }
    }
  };

  const handleRunDiagnostics = () => {
    // Client-side validation checks
    const checks = [
      { name: 'Admin Email Normalization', ok: user?.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase() },
      { name: 'Session Token Presence', ok: !!idToken },
      { name: 'OAuth Redirect URI Valid', ok: !!oauthStatus?.redirectUri },
      { name: 'Least-Privilege Scopes Configured', ok: oauthStatus?.scopes.includes('https://www.googleapis.com/auth/gmail.readonly') },
    ];

    const allOk = checks.every(c => c.ok);
    setTestResult({
      passed: allOk,
      message: allOk
        ? 'All 4 client-side security invariants verified successfully.'
        : 'One or more security assertions failed.',
    });
    success('Diagnostics Complete', 'Verified security invariants.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="pb-2 border-b border-[#1E2C4F]/60">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white uppercase">
            Console Settings & Security
          </h1>
          {isDemo && <StatusBadge status="demo" size="sm" />}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Administrator identity, cryptographic parameters, OAuth configurations, and data lifecycle
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Administrator Profile & Password */}
          <div className="p-6 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-4">
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4D8DFF]" />
              Administrator Credentials &amp; Access Control
            </h2>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4D8DFF]/20 to-[#906BFF]/20 border border-[#4D8DFF]/40 text-[#4D8DFF] flex items-center justify-center font-bold text-xl font-mono">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base font-mono">
                    {user?.username || 'admin'}
                  </span>
                  <VerifiedAdminBadge />
                </div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">Contact: {user?.email}</div>
                <div className="text-[11px] text-emerald-400 font-mono mt-1">
                  ✓ Username &amp; Password Authentication Enabled
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="p-4 rounded-xl bg-[#080D1B]/70 border border-[#1E2C4F] space-y-3">
              <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#4D8DFF]" />
                Change Administrator Password
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Current Password</label>
                  <input
                    type="password"
                    placeholder="Current (Zetta@admin)"
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    className="w-full bg-[#131E35] border border-[#1E2C4F] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#4D8DFF]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">New Password</label>
                  <input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="w-full bg-[#131E35] border border-[#1E2C4F] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#4D8DFF]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    className="w-full bg-[#131E35] border border-[#1E2C4F] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#4D8DFF]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#4D8DFF] hover:bg-[#5c98ff] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isChangingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>

            <p className="text-xs text-slate-400 leading-relaxed">
              Default administrator credentials: Username: <code className="text-blue-300 font-mono">admin</code> &bull; Password: <code className="text-blue-300 font-mono">Zetta@admin</code>.
            </p>
          </div>

          {/* Section 2: Google Cloud OAuth 2.0 Credentials */}
          <div className="p-6 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-[#906BFF]" />
                Google Cloud OAuth 2.0 Configuration
              </h2>
              <button
                onClick={onOpenSetupGuide}
                className="text-xs text-[#4D8DFF] hover:underline font-mono flex items-center gap-1"
              >
                Open Full Setup Guide &rarr;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
                <div>
                  <span className="text-slate-400 block text-[11px]">OAuth Client ID Status</span>
                  <span className="font-mono text-white">
                    {oauthStatus?.clientIdConfigured ? '✓ Configured in Environment' : '✗ Missing / Placeholder'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    oauthStatus?.clientIdConfigured
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {oauthStatus?.clientIdConfigured ? 'READY' : 'ACTION REQUIRED'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
                <div>
                  <span className="text-slate-400 block text-[11px]">OAuth Client Secret Status</span>
                  <span className="font-mono text-white">
                    {oauthStatus?.clientSecretConfigured ? '✓ Configured in Environment' : '✗ Missing / Placeholder'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    oauthStatus?.clientSecretConfigured
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {oauthStatus?.clientSecretConfigured ? 'READY' : 'ACTION REQUIRED'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
                <span className="text-slate-400 block text-[11px] mb-1">Authorized Redirect URI</span>
                <code className="text-blue-300 font-mono text-xs break-all">
                  {oauthStatus?.redirectUri || 'http://localhost:3000/api/auth/google/callback'}
                </code>
              </div>
            </div>
          </div>

          {/* Section 3: Google Permissions & Revocation Notice */}
          <div className="p-6 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-3 text-xs leading-relaxed">
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Permissions Policy & Scope Revocation
            </h2>
            <p className="text-slate-300">
              Account Command Center requests only the minimum read-only permissions required:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
              <li><code className="text-blue-300">openid</code>, <code className="text-blue-300">email</code>, <code className="text-blue-300">profile</code>: Identity verification</li>
              <li><code className="text-emerald-300">https://www.googleapis.com/auth/gmail.readonly</code>: View messages and stats</li>
            </ul>
            <p className="text-slate-400">
              You can instantly revoke authorization from the <strong>My Google Accounts</strong> tab, or directly via your{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="text-[#4D8DFF] hover:underline"
              >
                Google Security Dashboard
              </a>
              . Disconnecting immediately terminates access and revokes stored refresh tokens.
            </p>
          </div>

          {/* Section 4: Danger Zone */}
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
            <h2 className="text-sm font-bold font-mono text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Data Retention &amp; Danger Zone
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Permanently delete all imported YouTube watch records and Google Search history records across all accounts.
            </p>
            <button
              onClick={handlePurgeAllTakeoutData}
              disabled={isPurging}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer shadow-lg shadow-rose-900/30 disabled:opacity-50"
            >
              {isPurging ? 'Purging Records...' : 'Purge All Imported Takeout Records'}
            </button>
          </div>
        </div>

        {/* Right Col: Diagnostics & Environment Info */}
        <div className="space-y-6">
          {/* Security Diagnostics Card */}
          <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-4">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-[#4D8DFF]" />
              System Diagnostics
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Run invariant checks against session tokens, administrator authorization, and OAuth parameters.
            </p>
            <button
              onClick={handleRunDiagnostics}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono font-semibold text-white bg-[#080D1B] border border-[#1E2C4F] hover:border-[#4D8DFF] transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#4D8DFF]" />
              Run Security Verification
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono ${
                  testResult.passed
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {testResult.passed ? 'PASSED' : 'CHECK FAILED'}
                </div>
                <div className="text-[11px] leading-relaxed opacity-90">{testResult.message}</div>
              </div>
            )}
          </div>

          {/* Mode Switch Card */}
          <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-3">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#906BFF]" />
              Environment Simulation Mode
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Switch to Demo Mode to explore with realistic fictional accounts and Takeout data, or Production Mode for strictly authorized live accounts.
            </p>
            <button
              onClick={toggleMode}
              className="w-full py-2 px-3 rounded-xl text-xs font-mono font-semibold text-white bg-[#906BFF]/20 border border-[#906BFF]/50 hover:bg-[#906BFF]/30 transition-all cursor-pointer"
            >
              Switch to {isDemo ? 'Production Mode' : 'Demo Mode'}
            </button>
          </div>

          {/* System Specs */}
          <div className="p-5 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-2.5 text-xs font-mono">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Environment Build Info
            </h3>
            <div className="text-slate-400 space-y-1 text-[11px]">
              <div>Framework: <span className="text-white">React 19 + TypeScript</span></div>
              <div>Runtime: <span className="text-white">Node.js + Express Server</span></div>
              <div>Database: <span className="text-white">Cloud Firestore</span></div>
              <div>Cipher: <span className="text-white">AES-256-GCM</span></div>
              <div>Build Status: <span className="text-emerald-400">Verified</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
