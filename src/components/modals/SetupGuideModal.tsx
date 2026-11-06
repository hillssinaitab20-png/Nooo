import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, ShieldCheck, AlertTriangle, Key, Mail, Terminal } from 'lucide-react';
import { useAccount } from '../../context/AccountContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const { oauthStatus } = useAccount();
  const { success } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const redirectUri = oauthStatus?.redirectUri || 'http://localhost:3000/api/auth/google/callback';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    success('Copied to Clipboard', text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#131E35] border border-[#1E2C4F] shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E2C4F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4D8DFF]/15 border border-[#4D8DFF]/30 flex items-center justify-center text-[#4D8DFF]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-mono text-base text-white tracking-wide uppercase">
                Google Cloud OAuth & API Setup Guide
              </h3>
              <p className="text-xs text-slate-400">
                Configure your Google Cloud project to authorize personal Google accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content steps */}
        <div className="mt-5 space-y-6 text-xs text-slate-300">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
            <div className="flex items-center justify-between font-mono font-bold text-white mb-2">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#4D8DFF] text-black text-[11px] flex items-center justify-center font-bold">1</span>
                Create Google Cloud Project
              </span>
              <a
                href="https://console.cloud.google.com/projectcreate"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#4D8DFF] hover:underline"
              >
                GCP Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Create a new Google Cloud Project (e.g. <code className="text-blue-300">account-command-center</code>) or use an existing personal project in the Google Cloud Console.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
            <div className="flex items-center justify-between font-mono font-bold text-white mb-2">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#4D8DFF] text-black text-[11px] flex items-center justify-center font-bold">2</span>
                OAuth Consent Screen Configuration
              </span>
              <a
                href="https://console.cloud.google.com/apis/credentials/consent"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#4D8DFF] hover:underline"
              >
                Consent Screen <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 leading-relaxed mb-2">
              Select <strong>External</strong> User Type (or Internal for Workspace organizations). Add App Name (<code className="text-blue-300">Account Command Center</code>) and your administrator contact email.
            </p>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Testing Mode Notice:</strong> If your app is in &ldquo;Testing&rdquo; publishing status, you MUST add every Google account you intend to connect under <strong>Test Users</strong> in Google Cloud Console.
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
            <div className="flex items-center justify-between font-mono font-bold text-white mb-2">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#4D8DFF] text-black text-[11px] flex items-center justify-center font-bold">3</span>
                Create Web OAuth 2.0 Credentials
              </span>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#4D8DFF] hover:underline"
              >
                Credentials <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 leading-relaxed mb-3">
              Go to Credentials &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong>. Select application type <strong>Web application</strong>. Add the following Authorized Redirect URI:
            </p>
            <div className="flex items-center gap-2 bg-[#131E35] p-2.5 rounded-lg border border-[#1E2C4F]">
              <code className="text-blue-300 font-mono text-[11px] flex-1 break-all">
                {redirectUri}
              </code>
              <button
                onClick={() => handleCopy(redirectUri, 'uri')}
                className="px-2.5 py-1 rounded bg-[#4D8DFF]/20 hover:bg-[#4D8DFF]/30 text-[#4D8DFF] font-mono text-xs flex items-center gap-1 transition-colors"
              >
                {copiedKey === 'uri' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
            <div className="flex items-center justify-between font-mono font-bold text-white mb-2">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#4D8DFF] text-black text-[11px] flex items-center justify-center font-bold">4</span>
                Enable Gmail API & Restricted Scope Notice
              </span>
              <a
                href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#4D8DFF] hover:underline"
              >
                Gmail API Library <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 leading-relaxed mb-3">
              Enable the <strong>Gmail API</strong> in the API Library. Account Command Center requests the minimum scope required:
            </p>
            <div className="flex items-center gap-2 bg-[#131E35] p-2 rounded-lg border border-[#1E2C4F] mb-3">
              <code className="text-emerald-300 font-mono text-[11px] flex-1">
                https://www.googleapis.com/auth/gmail.readonly
              </code>
              <button
                onClick={() => handleCopy('https://www.googleapis.com/auth/gmail.readonly', 'scope')}
                className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs flex items-center gap-1"
              >
                {copiedKey === 'scope' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 text-[11px] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#4D8DFF]" />
              <span>
                <strong>Restricted Scope Notice:</strong> <code>gmail.readonly</code> is classified as a Restricted Scope by Google. For wide commercial distribution, Google OAuth App Verification and a CASA Tier 2 security assessment are required. For private administrator personal account management, publishing status remains in Testing.
              </span>
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-xl bg-[#080D1B] border border-[#1E2C4F]">
            <div className="flex items-center gap-2 font-mono font-bold text-white mb-2">
              <span className="w-5 h-5 rounded-full bg-[#4D8DFF] text-black text-[11px] flex items-center justify-center font-bold">5</span>
              Set Environment Variables
            </div>
            <p className="text-slate-400 leading-relaxed mb-2">
              Set <code className="text-blue-300">GOOGLE_CLIENT_ID</code> and <code className="text-blue-300">GOOGLE_CLIENT_SECRET</code> in your server environment variables or <code className="text-blue-300">.env</code>:
            </p>
            <pre className="p-3 rounded-lg bg-[#131E35] border border-[#1E2C4F] font-mono text-[11px] text-slate-300 overflow-x-auto">
{`ADMIN_EMAIL="${oauthStatus?.adminEmail || 'hillssinaitab20@gmail.com'}"
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="${redirectUri}"
TOKEN_ENCRYPTION_KEY="32_byte_aes_gcm_secret_key"`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#1E2C4F] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Current OAuth status:{' '}
            <span className={oauthStatus?.isConfigured ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {oauthStatus?.isConfigured ? 'Configured' : 'Credentials Missing'}
            </span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-[#4D8DFF] hover:bg-[#5c98ff] transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
