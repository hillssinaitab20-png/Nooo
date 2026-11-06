import React, { useState } from 'react';
import { useAuth, AUTHORIZED_ADMIN_USERNAME, AUTHORIZED_ADMIN_EMAIL } from '../../context/AuthContext.tsx';
import { Logo } from '../common/Logo.tsx';
import { ShieldCheck, Lock, User, Eye, EyeOff, KeyRound, AlertCircle, Sparkles, LogIn } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, loginDemoAdmin, isLoading } = useAuth();

  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('Zetta@admin');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    const res = await login(username.trim(), password);
    if (!res.success) {
      setErrorMessage(res.message || 'Invalid administrator username or password.');
    }
  };

  const handleFillCredentials = () => {
    setUsername('admin');
    setPassword('Zetta@admin');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#080D1B] flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100 font-sans">
      {/* Background futuristic grid & glowing orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E2C4F_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4D8DFF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#906BFF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="relative rounded-2xl bg-[#131E35]/95 border border-[#1E2C4F] p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
          {/* Subtle accent glow border */}
          <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#4D8DFF] to-transparent" />

          {/* Logo Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Logo size="lg" />
            <p className="mt-3 text-xs text-slate-400 max-w-xs leading-relaxed">
              Private command console for administrator-owned Google account management and data synchronization.
            </p>
          </div>

          {/* Security Notice Box */}
          <div className="mb-5 p-3 rounded-xl bg-[#080D1B]/80 border border-[#1E2C4F] text-xs">
            <div className="flex items-center gap-1.5 text-[#4D8DFF] font-semibold font-mono mb-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              AUTHENTICATION PERIMETER
            </div>
            <p className="text-slate-400 text-[11px] leading-normal">
              Enter the administrator credentials to unlock the console. Public registration is permanently disabled.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Username & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                Administrator Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  className="w-full bg-[#080D1B] border border-[#1E2C4F] focus:border-[#4D8DFF] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none transition-colors"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                Administrator Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                  className="w-full bg-[#080D1B] border border-[#1E2C4F] focus:border-[#4D8DFF] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-[#4D8DFF] to-[#3a70d6] hover:from-[#5c98ff] hover:to-[#437de6] active:scale-[0.99] transition-all shadow-lg shadow-[#4D8DFF]/25 disabled:opacity-50 cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Identity...' : 'Unlock Command Center'}</span>
            </button>
          </form>

          {/* Credentials quick-fill hint */}
          <div className="mt-5 pt-4 border-t border-[#1E2C4F]/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handleFillCredentials}
              className="text-[11px] font-mono text-[#4D8DFF] hover:underline flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3" />
              Auto-fill (admin / Zetta@admin)
            </button>

            <button
              type="button"
              onClick={loginDemoAdmin}
              className="text-[11px] font-mono text-[#906BFF] hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Demo Preview
            </button>
          </div>

          {/* Footer security badges */}
          <div className="mt-5 pt-3 border-t border-[#1E2C4F]/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#4D8DFF]" />
              HMAC-SHA256 Token
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              AES-256 Vault
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
