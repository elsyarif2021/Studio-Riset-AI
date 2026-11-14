import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookMarked, Check, Save, Sparkles } from 'lucide-react';
import {
  BAB4_DATA_MARKER,
  CHAPTER_METADATA,
  countWords,
  hasBab4DataMarker,
} from '../lib/chapters';
import { formatInTextCitation } from '../lib/citations';
import { MAX_LENGTHS } from '../lib/validation';
import { assistChapterWithAi } from '../services/aiService';
import type {
  AiStatusResponse,
  ChapterKey,
  ChaptersMap,
  ProjectReference,
  ResearchProject,
} from '../types/research';

interface ChapterEditorProps {
  project: ResearchProject;
  references: ProjectReference[];
  aiStatus: AiStatusResponse | null;
  selectedModel: string;
  onSaveChapters: (input: {
    chapters: ChaptersMap;
    hasResearchData: boolean;
    researchDataSummary: string;
  }) => Promise<void>;
}

export function ChapterEditor({
  project,
  references,
  aiStatus,
  selectedModel,
  onSaveChapters,
}: ChapterEditorProps) {
  const [activeChapter, setActiveChapter] = useState<ChapterKey>('bab1');
  const [chapters, setChapters] = useState<ChaptersMap>(project.chapters);
  const [hasResearchData, setHasResearchData] = useState<boolean>(project.hasResearchData);
  const [researchDataSummary, setResearchDataSummary] = useState<string>(
    project.researchDataSummary || ''
  );

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showCitePicker, setShowCitePicker] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setChapters(project.chapters);
    setHasResearchData(project.hasResearchData);
    setResearchDataSummary(project.researchDataSummary || '');
    setDirty(false);
    setAiPreview(null);
    setAiError(null);
  }, [project.id]);

  // Debounced auto-save when dirty
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      void persistNow();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [chapters, hasResearchData, researchDataSummary, dirty]);

  const persistNow = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      await onSaveChapters({
        chapters,
        hasResearchData,
        researchDataSummary,
      });
      setDirty(false);
      setSaveMessage('Tersimpan ke database');
      window.setTimeout(() => setSaveMessage(null), 2200);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan bab.');
    } finally {
      setSaving(false);
    }
  };

  const currentMeta = CHAPTER_METADATA.find((c) => c.key === activeChapter) || CHAPTER_METADATA[0];
  const currentText = chapters[activeChapter] || '';
  const currentWords = countWords(currentText);
  const verifiedRefs = references.filter((r) => r.verified);
  const bab4Incomplete =
    activeChapter === 'bab4' && (!hasResearchData || hasBab4DataMarker(chapters.bab4));

  const updateActiveContent = (nextText: string) => {
    const clipped = nextText.slice(0, MAX_LENGTHS.chapterText);
    setChapters((prev) => ({
      ...prev,
      [activeChapter]: clipped,
    }));
    setDirty(true);
  };

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      updateActiveContent(currentText ? `${currentText}\n${snippet}` : snippet);
      return;
    }
    const start = el.selectionStart ?? currentText.length;
    const end = el.selectionEnd ?? currentText.length;
    const updated = currentText.slice(0, start) + snippet + currentText.slice(end);
    updateActiveContent(updated);
    window.requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleAssistAi = async () => {
    setAiError(null);
    setAiLoading(true);
    const refsForAi = verifiedRefs.length > 0 ? verifiedRefs : references;
    const res = await assistChapterWithAi({
      chapterKey: activeChapter,
      chapterTitle: `${currentMeta.roman}: ${currentMeta.title}`,
      title: project.title,
      topic: project.topic,
      methodology: project.methodology,
      researchQuestions: project.researchQuestions,
      researchObjectives: project.researchObjectives,
      currentContent: currentText,
      instruction: aiInstruction.trim(),
      references: refsForAi,
      hasResearchData,
      researchDataSummary,
      modelOverride: selectedModel || undefined,
    });
    setAiLoading(false);

    if (!res.ok) {
      setAiError(res.message);
      return;
    }
    setAiPreview(res.content);
  };

  return (
    <div className="space-y-4">
      {/* Chapter Switcher */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
        {CHAPTER_METADATA.map((ch) => {
          const active = activeChapter === ch.key;
          const wc = countWords(chapters[ch.key] || '');
          return (
            <button
              key={ch.key}
              type="button"
              onClick={() => {
                setActiveChapter(ch.key);
                setAiPreview(null);
                setAiError(null);
              }}
              className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{ch.shortLabel}</span>
              <span
                className={`font-mono-tabular text-[11px] ${
                  active ? 'text-slate-200' : 'text-slate-400'
                }`}
              >
                {wc}
              </span>
            </button>
          );
        })}
      </div>

      {/* BAB IV Research Data Guard Panel */}
      {activeChapter === 'bab4' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  hasResearchData ? 'text-emerald-700' : 'text-amber-700'
                }`}
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Status Data Penelitian untuk BAB IV
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {hasResearchData
                    ? 'Data lapangan ditandai tersedia. Pastikan ringkasan temuan diisi agar pembahasan tetap akurat.'
                    : 'Data penelitian belum tersedia. BAB IV menggunakan penanda agar hasil empiris tidak dikarang dan mudah Anda lengkapi kemudian.'}
                </p>
              </div>
            </div>

            {!hasResearchData && (
              <button
                type="button"
                onClick={() => insertAtCursor(`\n\n${BAB4_DATA_MARKER}\n`)}
                className="min-h-[44px] shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-3.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Sisipkan Penanda Data BAB IV
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={hasResearchData}
                onChange={(e) => {
                  setHasResearchData(e.target.checked);
                  setDirty(true);
                }}
                className="h-4 w-4 rounded border-slate-300 text-[#1E3A5F]"
              />
              <span className="text-xs font-medium text-slate-800">
                Data penelitian lapangan / hasil olah data sudah tersedia
              </span>
            </label>

            {hasResearchData && (
              <div>
                <label
                  htmlFor="bab4-data-summary"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Ringkasan Data &amp; Temuan Lapangan (Angka, Tema Wawancara, Hasil Uji)
                </label>
                <textarea
                  id="bab4-data-summary"
                  rows={3}
                  maxLength={MAX_LENGTHS.researchDataSummary}
                  value={researchDataSummary}
                  onChange={(e) => {
                    setResearchDataSummary(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Tempelkan ringkasan statistik responden, hasil uji hipotesis, atau kutipan wawancara terverifikasi di sini..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Editor Card */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif-academic text-lg font-bold text-slate-900">
                {currentMeta.roman}: {currentMeta.title}
              </h2>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono-tabular text-xs text-slate-500">{currentWords} kata</span>
              {bab4Incomplete && (
                <>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="text-xs font-semibold text-amber-700">
                    Memiliki penanda data
                  </span>
                </>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-600">{currentMeta.guidance}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCitePicker((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <BookMarked className="h-4 w-4 text-[#1E3A5F]" />
              <span>Sisipkan Sitasi ({references.length})</span>
            </button>

            <button
              type="button"
              onClick={() => void persistNow()}
              disabled={saving}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#1E3A5F] px-4 text-xs font-semibold text-white hover:bg-[#162C49] disabled:opacity-60"
            >
              {saving ? (
                <span>Menyimpan...</span>
              ) : saveMessage ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Tersimpan</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{dirty ? 'Simpan Sekarang' : 'Tersimpan'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {showCitePicker && (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800">
                Pilih referensi untuk menyisipkan sitasi dalam teks:
              </p>
              <button
                type="button"
                onClick={() => setShowCitePicker(false)}
                className="min-h-[36px] px-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>
            {references.length === 0 ? (
              <p className="mt-2 text-xs text-slate-600">
                Belum ada referensi pada proyek ini. Tambahkan di tab Referensi terlebih dahulu.
              </p>
            ) : (
              <div className="mt-2 flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                {references.map((ref) => {
                  const cite = formatInTextCitation(ref);
                  return (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => {
                        insertAtCursor(` ${cite}`);
                        setShowCitePicker(false);
                      }}
                      className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-800 hover:border-[#1E3A5F]"
                    >
                      <span className="font-semibold">{cite}</span>
                      <span className="ml-1.5 text-slate-500">
                        · {ref.title.slice(0, 42)}
                        {ref.title.length > 42 ? '…' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {saveError && (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 sm:mx-5">
            {saveError}
          </div>
        )}

        <div className="p-4 sm:p-5">
          <textarea
            ref={textareaRef}
            aria-label={`Editor ${currentMeta.roman}`}
            rows={16}
            value={currentText}
            onChange={(e) => updateActiveContent(e.target.value)}
            placeholder={`Tulis naskah ${currentMeta.roman}: ${currentMeta.title} di sini...`}
            className="font-serif-academic min-h-[360px] w-full resize-y rounded-xl border border-slate-200 bg-[#FAF9F6] p-4 text-[15px] leading-[1.7] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none sm:p-5"
          />
        </div>

        {/* AI Chapter Drafting Assistant */}
        <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="chapter-ai-instruction"
                className="block text-xs font-semibold text-slate-800"
              >
                Asisten Penulisan {currentMeta.shortLabel} (Ollama Cloud)
              </label>
              <p className="mt-0.5 text-xs text-slate-600">
                Hanya menggunakan {verifiedRefs.length > 0 ? `${verifiedRefs.length} referensi terverifikasi` : `${references.length} referensi proyek`} Anda.{' '}
                {aiStatus?.connected
                  ? 'Siap menyusun atau menyempurnakan paragraf.'
                  : 'Saat layanan AI bermasalah, Anda tetap dapat mengetik dan menyimpan secara normal.'}
              </p>
              <input
                id="chapter-ai-instruction"
                type="text"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                placeholder={`Instruksi opsional untuk ${currentMeta.shortLabel}, mis. "Kembangkan sub-bab 1.1 latar belakang dengan gaya formal"`}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAssistAi}
              disabled={aiLoading}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-[#1E3A5F] disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              <span className="whitespace-nowrap">
                {aiLoading ? 'Menyusun Draf...' : 'Bantu Kembangkan Bab'}
              </span>
            </button>
          </div>

          {aiError && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-relaxed text-red-800"
            >
              {aiError}
            </div>
          )}

          {aiPreview && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900">
                  Hasil Draf AI untuk {currentMeta.shortLabel}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveContent(
                        currentText.trim() ? `${currentText.trim()}\n\n${aiPreview}` : aiPreview
                      );
                      setAiPreview(null);
                    }}
                    className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Tambahkan ke Bawah
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveContent(aiPreview);
                      setAiPreview(null);
                    }}
                    className="min-h-[40px] rounded-lg bg-[#1E3A5F] px-3 text-xs font-semibold text-white hover:bg-[#162C49]"
                  >
                    Ganti Isi Bab
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiPreview(null)}
                    className="min-h-[40px] px-2 text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    Tutup
                  </button>
                </div>
              </div>
              <pre className="font-serif-academic max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {aiPreview}
              </pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
