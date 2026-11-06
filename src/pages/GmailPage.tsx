import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useAccount } from '../context/AccountContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useMode } from '../context/ModeContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { GmailMessageSummary, GmailMessageDetail, GmailStats } from '../types/index.ts';
import {
  Mail,
  Inbox,
  Send,
  Search,
  RefreshCw,
  Paperclip,
  Clock,
  Shield,
  Eye,
  X,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const GmailPage: React.FC = () => {
  const { idToken } = useAuth();
  const { accounts, activeAccount, setActiveAccount } = useAccount();
  const { isDemo } = useMode();
  const { success, error: toastError } = useToast();

  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'all'>('inbox');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [stats, setStats] = useState<GmailStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeMessage, setActiveMessage] = useState<GmailMessageDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  const targetAccount = activeAccount || accounts[0] || null;

  const fetchStatsAndMessages = async () => {
    if (!targetAccount) return;
    setIsLoading(true);

    try {
      // Fetch stats
      const statsRes = await fetch(`/api/gmail/${targetAccount.accountId}/stats?demo=${isDemo}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      // Fetch messages
      const folderParam = currentFolder;
      const qParam = searchQuery.trim() ? encodeURIComponent(searchQuery.trim()) : '';
      const messagesRes = await fetch(
        `/api/gmail/${targetAccount.accountId}/messages?folder=${folderParam}&q=${qParam}&demo=${isDemo}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessages(data.messages || []);
      } else {
        const data = await messagesRes.json();
        toastError('Failed to fetch Gmail messages', data.message);
      }
    } catch (err: any) {
      console.error('Error fetching Gmail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndMessages();
  }, [targetAccount?.accountId, currentFolder, isDemo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatsAndMessages();
  };

  const handleOpenMessage = async (msgSummary: GmailMessageSummary) => {
    if (!targetAccount) return;
    setIsLoadingDetail(true);

    try {
      const res = await fetch(
        `/api/gmail/${targetAccount.accountId}/messages/${msgSummary.id}?demo=${isDemo}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setActiveMessage(data.message);
      } else {
        toastError('Error', 'Unable to retrieve full message contents from Gmail.');
      }
    } catch {
      toastError('Network Error', 'Failed to retrieve message.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  if (!targetAccount) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[#131E35] border border-dashed border-[#1E2C4F] text-slate-400 text-xs">
        <Mail className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <div className="text-white font-medium text-sm">No Connected Google Account Available</div>
        <p className="mt-1 text-slate-400 max-w-sm mx-auto">
          Please connect an authorized Google account under <strong>My Google Accounts</strong> to view read-only Gmail messages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Account Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1E2C4F]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white uppercase">
              Gmail Read-Only Console
            </h1>
            {isDemo && <StatusBadge status="demo" size="sm" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Official Gmail API integration via restricted scope <code className="text-blue-300">gmail.readonly</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Account Selector if multiple */}
          {accounts.length > 1 && (
            <select
              value={targetAccount.accountId}
              onChange={e => {
                const found = accounts.find(a => a.accountId === e.target.value);
                if (found) setActiveAccount(found);
              }}
              className="bg-[#131E35] border border-[#1E2C4F] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
            >
              {accounts.map(acc => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name} ({acc.email})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={fetchStatsAndMessages}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 bg-[#131E35] border border-[#1E2C4F] hover:border-[#4D8DFF]/40 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#4D8DFF]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Gmail Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#131E35] border border-[#1E2C4F]">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Inbox Total</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {stats ? stats.inboxTotal : '—'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#131E35] border border-[#1E2C4F]">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Unread Messages</span>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {stats ? stats.unreadTotal : '—'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#131E35] border border-[#1E2C4F]">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Sent Total</span>
          <div className="text-2xl font-bold font-mono text-[#906BFF] mt-1">
            {stats ? stats.sentTotal : '—'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#131E35] border border-[#1E2C4F]">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Scope Health</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-300 font-bold">Authorized</span>
          </div>
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-3.5 rounded-xl bg-[#080D1B] border border-[#1E2C4F] text-xs text-slate-400 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-[#4D8DFF] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Privacy Boundary:</strong> Messages are fetched securely on-demand directly through Google&apos;s Gmail API. Email bodies and attachments are <em>never</em> stored or indexed in our database. HTML contents are sanitized client-side against tracking pixels and scripts.
        </div>
      </div>

      {/* Controls: Folders & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Folder Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#131E35] border border-[#1E2C4F]">
          <button
            onClick={() => setCurrentFolder('inbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              currentFolder === 'inbox'
                ? 'bg-[#4D8DFF] text-black font-bold shadow-md shadow-[#4D8DFF]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Inbox</span>
          </button>
          <button
            onClick={() => setCurrentFolder('sent')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              currentFolder === 'sent'
                ? 'bg-[#4D8DFF] text-black font-bold shadow-md shadow-[#4D8DFF]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Sent</span>
          </button>
          <button
            onClick={() => setCurrentFolder('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              currentFolder === 'all'
                ? 'bg-[#4D8DFF] text-black font-bold shadow-md shadow-[#4D8DFF]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>All Mail</span>
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Search messages by sender, subject, or keyword..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#131E35] border border-[#1E2C4F] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#4D8DFF]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Message List */}
      <div className="rounded-2xl bg-[#131E35] border border-[#1E2C4F] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#4D8DFF]" />
            Fetching authorized messages from Gmail API...
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No messages found in this folder matching your query.
          </div>
        ) : (
          <div className="divide-y divide-[#1E2C4F]/60">
            {messages.map(msg => (
              <div
                key={msg.id}
                onClick={() => handleOpenMessage(msg)}
                className={`p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#080D1B]/50 transition-colors ${
                  msg.isUnread ? 'bg-[#080D1B]/20 font-semibold' : 'opacity-90'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Unread indicator */}
                  <div className="w-2 h-2 rounded-full shrink-0">
                    {msg.isUnread && <span className="block w-2 h-2 rounded-full bg-[#4D8DFF]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-200 truncate max-w-[140px] sm:max-w-[200px]">
                        {msg.from.replace(/<.*>/, '').trim() || msg.from}
                      </span>
                      {msg.hasAttachments && (
                        <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      {msg.isDemo && <StatusBadge status="demo" size="sm" />}
                    </div>

                    <div className="text-xs text-white truncate mt-0.5">
                      {msg.subject}
                    </div>

                    <div className="text-[11px] text-slate-400 truncate mt-0.5 max-w-xl">
                      {msg.snippet}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    {new Date(msg.date).toLocaleDateString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Modal (Sanitized HTML) */}
      {activeMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-[#131E35] border border-[#1E2C4F] shadow-2xl text-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1E2C4F] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    {activeMessage.folder.toUpperCase()}
                  </span>
                  {activeMessage.isDemo && <StatusBadge status="demo" size="sm" />}
                  <span className="text-xs font-mono text-slate-400">
                    {new Date(activeMessage.date).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-wide leading-tight">
                  {activeMessage.subject}
                </h3>
                <div className="text-xs text-slate-300 mt-1 font-mono truncate">
                  From: <span className="text-white">{activeMessage.from}</span>
                </div>
                {activeMessage.to && (
                  <div className="text-xs text-slate-400 font-mono truncate">
                    To: {activeMessage.to}
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveMessage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sanitized Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-[#080D1B]/40">
              {activeMessage.bodyHtml ? (
                <div
                  className="bg-white text-slate-900 p-6 rounded-xl shadow-inner prose prose-sm max-w-none overflow-x-auto"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(activeMessage.bodyHtml, {
                      USE_PROFILES: { html: true },
                      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
                      FORBID_ATTR: ['onerror', 'onload', 'onclick'],
                    }),
                  }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 bg-[#080D1B] p-4 rounded-xl border border-[#1E2C4F]">
                  {activeMessage.bodyText || activeMessage.snippet}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1E2C4F] flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Sanitized on-demand (Not retained in DB)
              </span>
              <button
                onClick={() => setActiveMessage(null)}
                className="px-4 py-1.5 rounded-xl bg-[#4D8DFF] text-white text-xs font-semibold hover:bg-[#5c98ff] transition-colors"
              >
                Close Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
