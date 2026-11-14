import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { METHODOLOGIES, MAX_LENGTHS } from '../lib/validation';
import { formulateTitleAndQuestions } from '../services/aiService';
import type { AiStatusResponse, Methodology } from '../types/research';

interface CreateProjectModalProps {
  open: boolean;
  defaultAuthor: string;
  aiStatus: AiStatusResponse | null;
  selectedModel: string;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    topic: string;
    studyProgram: string;
    authorName: string;
    institution: string;
    year: string;
    methodology: Methodology;
    researchQuestions: string;
    researchObjectives: string;
    hasResearchData: boolean;
  }) => Promise<void>;
}

export function CreateProjectModal({
  open,
  defaultAuthor,
  aiStatus,
  selectedModel,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [studyProgram, setStudyProgram] = useState('');
  const [authorName, setAuthorName] = useState(defaultAuthor);
  const [institution, setInstitution] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [methodology, setMethodology] = useState<Methodology>('Kualitatif');
  const [researchQuestions, setResearchQuestions] = useState('');
  const [researchObjectives, setResearchObjectives] = useState('');
  const [hasResearchData, setHasResearchData] = useState(false);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!open) return null;

  const handleAiFormulate = async () => {
    setAiError(null);
    if (!topic.trim() && !title.trim()) {
      setAiError('Isi terlebih dahulu topik/masalah awal atau judul sementara.');
      return;
    }
    setAiLoading(true);
    const res = await formulateTitleAndQuestions({
      topic: topic.trim() || title.trim(),
      studyProgram: studyProgram.trim(),
      methodology,
      existingTitle: title.trim(),
      modelOverride: selectedModel || undefined,
    });
    setAiLoading(false);

    if (!res.ok) {
      setAiError(res.message);
      return;
    }

    if (res.data.titles.length > 0) {
      setAiSuggestions(res.data.titles);
      if (!title.trim()) {
        setTitle(res.data.titles[0]);
      }
    }
    if (res.data.researchQuestions.length > 0) {
      setResearchQuestions(
        res.data.researchQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')
      );
    }
    if (res.data.researchObjectives.length > 0) {
      setResearchObjectives(
        res.data.researchObjectives.map((o, idx) => `${idx + 1}. ${o}`).join('\n')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError('Judul penelitian wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        topic: topic.trim(),
        studyProgram: studyProgram.trim(),
        authorName: authorName.trim() || defaultAuthor || 'Peneliti',
        institution: institution.trim(),
        year: year.trim() || String(new Date().getFullYear()),
        methodology,
        researchQuestions,
        researchObjectives,
        hasResearchData,
      });
      setTitle('');
      setTopic('');
      setResearchQuestions('');
      setResearchObjectives('');
      setAiSuggestions([]);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal membuat proyek penelitian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="create-project-title" className="text-base font-bold text-slate-900">
            Buat Proyek Penelitian Baru
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label htmlFor="new-topic" className="block text-xs font-semibold text-slate-700">
              Topik / Fenomena Masalah Awal
            </label>
            <textarea
              id="new-topic"
              rows={2}
              maxLength={MAX_LENGTHS.topic}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Dampak penggunaan pembelajaran adaptif terhadap literasi numerasi siswa SMP di daerah semi-urban."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-methodology" className="block text-xs font-semibold text-slate-700">
                Pendekatan Metodologi
              </label>
              <select
                id="new-methodology"
                value={methodology}
                onChange={(e) => setMethodology(e.target.value as Methodology)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {METHODOLOGIES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-prodi" className="block text-xs font-semibold text-slate-700">
                Program Studi / Bidang Ilmu
              </label>
              <input
                id="new-prodi"
                type="text"
                maxLength={MAX_LENGTHS.studyProgram}
                value={studyProgram}
                onChange={(e) => setStudyProgram(e.target.value)}
                placeholder="Mis. Pendidikan Matematika / Manajemen"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Bantu Rumuskan Judul &amp; Pertanyaan (Ollama Cloud)
                </p>
                <p className="text-xs text-slate-600">
                  {aiStatus?.connected
                    ? 'Siap membantu menyusun opsi judul & rumusan masalah dari topik Anda.'
                    : 'Layanan AI belum aktif/bermasalah. Anda tetap dapat mengisi judul secara manual di bawah.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAiFormulate}
                disabled={aiLoading || !aiStatus?.connected}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4 text-[#1E3A5F]" />
                <span className="whitespace-nowrap">
                  {aiLoading ? 'Merumuskan...' : 'Rumuskan dengan AI'}
                </span>
              </button>
            </div>
            {aiError && (
              <p className="mt-2 text-xs font-medium text-red-700">{aiError}</p>
            )}
            {aiSuggestions.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-slate-700">Pilih salah satu opsi judul:</p>
                {aiSuggestions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTitle(opt)}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-800 hover:border-[#1E3A5F] hover:bg-slate-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="new-title" className="block text-xs font-semibold text-slate-700">
              Judul Penelitian <span className="text-red-600">*</span>
            </label>
            <input
              id="new-title"
              type="text"
              required
              maxLength={MAX_LENGTHS.projectTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tuliskan judul penelitian Anda"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="new-rq" className="block text-xs font-semibold text-slate-700">
              Pertanyaan Penelitian / Rumusan Masalah
            </label>
            <textarea
              id="new-rq"
              rows={3}
              maxLength={MAX_LENGTHS.researchQuestions}
              value={researchQuestions}
              onChange={(e) => setResearchQuestions(e.target.value)}
              placeholder="1. Bagaimana ...?&#10;2. Sejauh mana ...?"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="new-author" className="block text-xs font-semibold text-slate-700">
                Nama Peneliti
              </label>
              <input
                id="new-author"
                type="text"
                maxLength={MAX_LENGTHS.authorName}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="new-institution" className="block text-xs font-semibold text-slate-700">
                Perguruan Tinggi / Lembaga
              </label>
              <input
                id="new-institution"
                type="text"
                maxLength={MAX_LENGTHS.institution}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Nama universitas"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="new-year" className="block text-xs font-semibold text-slate-700">
                Tahun
              </label>
              <input
                id="new-year"
                type="text"
                maxLength={MAX_LENGTHS.year}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="font-mono-tabular mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5">
            <input
              type="checkbox"
              checked={hasResearchData}
              onChange={(e) => setHasResearchData(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#1E3A5F]"
            />
            <span className="text-xs text-slate-700">
              Data penelitian lapangan sudah tersedia (jika belum dicentang, BAB IV otomatis diberi penanda kelengkapan data)
            </span>
          </label>

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] rounded-xl bg-[#1E3A5F] px-5 text-sm font-semibold text-white hover:bg-[#162C49] disabled:opacity-60"
            >
              {submitting ? 'Menyimpan...' : 'Buat & Buka Proyek'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
