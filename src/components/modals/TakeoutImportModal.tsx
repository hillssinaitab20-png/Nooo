import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileArchive, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useAccount } from '../../context/AccountContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface TakeoutImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'youtube' | 'search';
  onSuccess?: () => void;
}

export const TakeoutImportModal: React.FC<TakeoutImportModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'youtube',
  onSuccess,
}) => {
  const { accounts, activeAccount } = useAccount();
  const { idToken } = useAuth();
  const { success, error: toastError } = useToast();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(activeAccount?.accountId || (accounts[0]?.accountId || ''));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success: boolean;
    fileName: string;
    sourceType: string;
    youtube?: { added: number; duplicates: number; totalExtracted: number };
    search?: { added: number; duplicates: number; totalExtracted: number };
    warnings?: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const name = file.name.toLowerCase();
      if (!name.endsWith('.json') && !name.endsWith('.html') && !name.endsWith('.htm') && !name.endsWith('.zip')) {
        setErrorMessage('Unsupported file format. Please upload .json, .html, or .zip Takeout files.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 50MB security ceiling.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedAccountId) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setResult(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64Data = res.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedFile);
      const base64 = await base64Promise;

      const response = await fetch('/api/takeout/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileData: base64,
          accountId: selectedAccountId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
        success('Import Complete', `Processed Takeout archive: ${data.fileName}`);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data.message || 'Import failed. Check file format.');
        toastError('Import Failed', data.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during upload.');
      toastError('Upload Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#131E35] border border-[#1E2C4F] shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E2C4F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#906BFF]/15 border border-[#906BFF]/30 flex items-center justify-center text-[#906BFF]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-mono text-base text-white tracking-wide uppercase">
                Import Google Takeout Export
              </h3>
              <p className="text-xs text-slate-400">
                Securely ingest personal YouTube watch history or Google Search activity
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4 text-xs">
          {/* Target Account Selector */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 font-mono">
              Target Google Account:
            </label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full bg-[#080D1B] border border-[#1E2C4F] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#4D8DFF]"
            >
              {accounts.map(acc => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name} ({acc.email})
                </option>
              ))}
            </select>
          </div>

          {/* Official Google Takeout Hint */}
          <div className="p-3 rounded-xl bg-[#080D1B] border border-[#1E2C4F] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Don&apos;t have an export yet? Generate one on Google:</span>
            <a
              href="https://takeout.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[#4D8DFF] hover:underline font-mono font-medium shrink-0 ml-2"
            >
              takeout.google.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Drag & Drop Upload Zone */}
          {!result && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : 'border-[#1E2C4F] hover:border-[#4D8DFF]/50 bg-[#080D1B]/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.html,.htm,.zip"
                onChange={handleFileChange}
                className="hidden"
              />

              <FileArchive className={`w-10 h-10 mb-2 ${selectedFile ? 'text-emerald-400' : 'text-[#4D8DFF]'}`} />
              {selectedFile ? (
                <div className="text-center">
                  <div className="font-semibold text-white text-xs">{selectedFile.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB &bull; Ready to ingest
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="font-medium text-slate-200 text-xs">
                    Click to browse or drop Takeout archive
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Supports <code className="text-blue-300">.json</code>, <code className="text-blue-300">.html</code>, or <code className="text-blue-300">.zip</code> (max 50MB)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Result Summary */}
          {result && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
                Takeout Processing Succeeded
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded bg-[#080D1B] border border-[#1E2C4F]">
                  <span className="text-slate-400 block text-[11px]">YouTube Records</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {result.youtube?.added || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    ({result.youtube?.duplicates || 0} duplicates skipped)
                  </span>
                </div>
                <div className="p-2 rounded bg-[#080D1B] border border-[#1E2C4F]">
                  <span className="text-slate-400 block text-[11px]">Search Records</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {result.search?.added || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    ({result.search?.duplicates || 0} duplicates skipped)
                  </span>
                </div>
              </div>
              {result.warnings && result.warnings.length > 0 && (
                <div className="text-[11px] text-amber-300 pt-1">
                  Note: {result.warnings.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-[#1E2C4F] flex items-center justify-between">
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            {result ? 'Done' : 'Cancel'}
          </button>

          {!result ? (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isProcessing || !selectedAccountId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#906BFF] to-[#784ceb] hover:from-[#a07eff] hover:to-[#885cf0] disabled:opacity-40 transition-all cursor-pointer shadow-lg shadow-[#906BFF]/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Takeout...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Ingest Takeout Records</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={resetModal}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#4D8DFF] hover:bg-[#4D8DFF]/10 transition-colors"
            >
              Upload Another File
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
