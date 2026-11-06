import React, { useState, useEffect } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useMode } from '../context/ModeContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { YouTubeRecord } from '../types/index.ts';
import {
  Video,
  UploadCloud,
  Search,
  ExternalLink,
  Trash2,
  Calendar,
  RefreshCw,
  Info,
  Clock,
  PlaySquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface YouTubeHistoryPageProps {
  onOpenTakeoutModal: () => void;
}

export const YouTubeHistoryPage: React.FC<YouTubeHistoryPageProps> = ({
  onOpenTakeoutModal,
}) => {
  const { idToken } = useAuth();
  const { accounts, activeAccount, setActiveAccount } = useAccount();
  const { isDemo } = useMode();
  const { success, error: toastError } = useToast();

  const [records, setRecords] = useState<YouTubeRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const targetAccount = activeAccount || accounts[0] || null;

  const fetchYouTubeRecords = async (page = 1) => {
    if (!targetAccount) return;
    setIsLoading(true);

    try {
      const qParam = encodeURIComponent(searchQuery.trim());
      const fromParam = dateFrom ? `&from=${encodeURIComponent(dateFrom)}` : '';
      const toParam = dateTo ? `&to=${encodeURIComponent(dateTo)}` : '';

      const res = await fetch(
        `/api/takeout/${targetAccount.accountId}/youtube?page=${page}&limit=15&q=${qParam}${fromParam}${toParam}&demo=${isDemo}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotalRecords(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch YouTube records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchYouTubeRecords(1);
  }, [targetAccount?.accountId, isDemo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchYouTubeRecords(1);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!targetAccount) return;
    try {
      const res = await fetch(
        `/api/takeout/${targetAccount.accountId}/youtube?recordId=${encodeURIComponent(recordId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      if (res.ok) {
        success('Record Deleted', 'Removed entry from imported history.');
        fetchYouTubeRecords(currentPage);
      }
    } catch {
      toastError('Error', 'Failed to delete record.');
    }
  };

  const handlePurgeAll = async () => {
    if (!targetAccount) return;
    if (window.confirm('Delete all imported YouTube records for this account?')) {
      try {
        const res = await fetch(`/api/takeout/${targetAccount.accountId}/youtube`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          success('History Purged', 'Deleted all imported YouTube records.');
          fetchYouTubeRecords(1);
        }
      } catch {
        toastError('Error', 'Failed to purge history.');
      }
    }
  };

  if (!targetAccount) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[#131E35] border border-dashed border-[#1E2C4F] text-slate-400 text-xs">
        <Video className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <div className="text-white font-medium text-sm">No Connected Google Account Available</div>
        <p className="mt-1 text-slate-400 max-w-sm mx-auto">
          Please connect an authorized Google account to view or import YouTube watch history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1E2C4F]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white uppercase">
              YouTube Watch History
            </h1>
            {isDemo && <StatusBadge status="demo" size="sm" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Imported Google Takeout watch records &bull; Normalized and chronologically organized
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTakeoutModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#906BFF] to-[#784ceb] hover:from-[#a07eff] hover:to-[#885cf0] transition-all cursor-pointer shadow-lg shadow-[#906BFF]/20"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Takeout</span>
          </button>
        </div>
      </div>

      {/* Official Takeout Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-[#131E35] border border-[#1E2C4F] text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#906BFF] shrink-0 mt-0.5" />
          <div className="leading-relaxed text-slate-300">
            <strong>Exported Archive Notice:</strong> Google does not offer a complete personal watch history API via the YouTube Data API. Displayed history is parsed from your voluntarily exported Google Takeout archives (<code className="text-blue-300 font-mono">watch-history.json / .html</code> or ZIP).
          </div>
        </div>
        <a
          href="https://takeout.google.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080D1B] border border-[#1E2C4F] text-[#4D8DFF] hover:text-white hover:border-[#4D8DFF] transition-all font-mono text-xs shrink-0"
        >
          <span>Official Takeout</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-[#131E35] border border-[#1E2C4F] space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by video title or channel name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#080D1B] border border-[#1E2C4F] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#4D8DFF]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#080D1B] border border-[#1E2C4F] rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
              title="Filter from date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#080D1B] border border-[#1E2C4F] rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
              title="Filter to date"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4D8DFF] hover:bg-[#5c98ff] transition-colors"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDateFrom('');
                setDateTo('');
                fetchYouTubeRecords(1);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-[#080D1B] border border-[#1E2C4F]"
              title="Reset filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#1E2C4F]/60">
          <span>
            Total Records: <strong className="text-white font-mono">{totalRecords}</strong>
          </span>
          {records.length > 0 && (
            <button
              onClick={handlePurgeAll}
              className="text-rose-400 hover:text-rose-300 hover:underline text-[11px] font-mono"
            >
              Purge All YouTube Records
            </button>
          )}
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center rounded-2xl bg-[#131E35] border border-[#1E2C4F] text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#4D8DFF]" />
            Loading timeline records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#131E35] border border-[#1E2C4F] text-slate-400 text-xs space-y-2">
            <PlaySquare className="w-8 h-8 mx-auto text-slate-400" />
            <div className="text-white font-medium">No YouTube Watch Records Found</div>
            <p className="text-slate-400 text-[11px]">
              Click &ldquo;Import Takeout&rdquo; to load your watch history from a Takeout ZIP or JSON export.
            </p>
          </div>
        ) : (
          records.map(rec => (
            <div
              key={rec.recordId}
              className="p-4 rounded-xl bg-[#131E35] border border-[#1E2C4F] hover:border-[#906BFF]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                  <PlaySquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {rec.titleUrl ? (
                      <a
                        href={rec.titleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs sm:text-sm font-semibold text-white hover:text-[#4D8DFF] transition-colors truncate flex items-center gap-1"
                      >
                        <span>{rec.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold text-white truncate">
                        {rec.title}
                      </span>
                    )}
                    {rec.isDemo && <StatusBadge status="demo" size="sm" />}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono mt-1">
                    {rec.channelTitle && (
                      <span className="text-slate-300">
                        Channel:{' '}
                        {rec.channelUrl ? (
                          <a
                            href={rec.channelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-300 hover:underline"
                          >
                            {rec.channelTitle}
                          </a>
                        ) : (
                          rec.channelTitle
                        )}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(rec.watchedAt).toLocaleString()}
                    </span>
                    <span className="text-slate-400">
                      Source: {rec.source}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleDeleteRecord(rec.recordId)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchYouTubeRecords(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-[#131E35] border border-[#1E2C4F] text-slate-300 disabled:opacity-30 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchYouTubeRecords(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-[#131E35] border border-[#1E2C4F] text-slate-300 disabled:opacity-30 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
