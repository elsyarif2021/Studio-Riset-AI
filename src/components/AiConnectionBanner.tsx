import { AlertCircle, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import type { AiStatusResponse } from '../types/research';

interface AiConnectionBannerProps {
  aiStatus: AiStatusResponse | null;
  checking: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onRefresh: () => void;
  compact?: boolean;
}

export function AiConnectionBanner({
  aiStatus,
  checking,
  selectedModel,
  onSelectModel,
  onRefresh,
  compact = false,
}: AiConnectionBannerProps) {
  const connected = Boolean(aiStatus?.connected);
  const configured = Boolean(aiStatus?.configured);

  const statusText = checking
    ? 'Memeriksa koneksi Ollama Cloud...'
    : connected
      ? `Ollama Cloud terhubung (${selectedModel || aiStatus?.model || 'default'})`
      : configured
        ? 'Koneksi Ollama Cloud bermasalah'
        : 'Ollama Cloud belum dikonfigurasi';

  const statusTone = checking
    ? 'text-slate-600'
    : connected
      ? 'text-emerald-700'
      : configured
        ? 'text-red-700'
        : 'text-amber-800';

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {connected ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          ) : configured ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
          ) : (
            <WifiOff className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className={`truncate text-xs font-semibold ${statusTone}`}>{statusText}</p>
            {aiStatus?.message && !connected && (
              <p className="mt-0.5 text-xs text-slate-600">{aiStatus.message}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && aiStatus && aiStatus.availableModels.length > 0 && (
            <select
              aria-label="Pilih model Ollama Cloud"
              value={selectedModel || aiStatus.model}
              onChange={(e) => onSelectModel(e.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              {aiStatus.availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={checking}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">Cek Koneksi</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Status Koneksi Ollama Cloud"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {connected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            ) : configured ? (
              <AlertCircle className="h-5 w-5 text-red-700" aria-hidden="true" />
            ) : (
              <WifiOff className="h-5 w-5 text-amber-700" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Layanan AI Ollama Cloud</h3>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className={`text-xs font-semibold ${statusTone}`}>
                {checking
                  ? 'Memeriksa...'
                  : connected
                    ? 'Terhubung'
                    : configured
                      ? 'Gagal Terhubung'
                      : 'Belum Dikonfigurasi'}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {aiStatus?.message || 'Memeriksa status koneksi backend Ollama Cloud...'}
            </p>
            {aiStatus?.checkedAt && (
              <p className="font-mono-tabular mt-1.5 text-xs text-slate-500">
                Terakhir diperiksa: {new Date(aiStatus.checkedAt).toLocaleTimeString('id-ID')}
                {aiStatus.model ? ` · Model aktif: ${selectedModel || aiStatus.model}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {connected && aiStatus && aiStatus.availableModels.length > 0 && (
            <select
              aria-label="Pilih model Ollama Cloud"
              value={selectedModel || aiStatus.model}
              onChange={(e) => onSelectModel(e.target.value)}
              className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              {aiStatus.availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={checking}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">Uji Koneksi</span>
          </button>
        </div>
      </div>
    </section>
  );
}
