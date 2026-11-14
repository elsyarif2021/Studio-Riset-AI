import { useEffect, useState } from 'react';
import { Check, Save, Sparkles } from 'lucide-react';
import { MAX_LENGTHS, METHODOLOGIES, PROJECT_STAGES } from '../lib/validation';
import { formulateTitleAndQuestions } from '../services/aiService';
import type {
  AiStatusResponse,
  FormulateResult,
  Methodology,
  ProjectReference,
  ProjectStage,
  ResearchProject,
} from '../types/research';
import { AiConnectionBanner } from './AiConnectionBanner';

interface OverviewAndAiPanelProps {
  project: ResearchProject;
  references: ProjectReference[];
  aiStatus: AiStatusResponse | null;
  checkingAi: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onRefreshAi: () => void;
  onSaveMeta: (input: {
    title: string;
    topic: string;
    studyProgram: string;
    authorName: string;
    institution: string;
    year: string;
    methodology: Methodology;
    stage: ProjectStage;
    researchQuestions: string;
    researchObjectives: string;
  }) => Promise<void>;
}

export function OverviewAndAiPanel({
  project,
  references,
  aiStatus,
  checkingAi,
  selectedModel,
  onSelectModel,
  onRefreshAi,
  onSaveMeta,
}: OverviewAndAiPanelProps) {
  const [title, setTitle] = useState(project.title);
  const [topic, setTopic] = useState(project.topic);
  const [studyProgram, setStudyProgram] = useState(project.studyProgram);
  const [authorName, setAuthorName] = useState(project.authorName);
  const [institution, setInstitution] = useState(project.institution);
  const [year, setYear] = useState(project.year);
  const [methodology, setMethodology] = useState<Methodology>(project.methodology);
  const [stage, setStage] = useState<ProjectStage>(project.stage);
  const [researchQuestions, setResearchQuestions] = useState(project.researchQuestions);
  const [researchObjectives, setResearchObjectives] = useState(project.researchObjectives);

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [contextNotes, setContextNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<FormulateResult | null>(null);

  useEffect(() => {
    setTitle(project.title);
    setTopic(project.topic);
    setStudyProgram(project.studyProgram);
    setAuthorName(project.authorName);
    setInstitution(project.institution);
    setYear(project.year);
    setMethodology(project.methodology);
    setStage(project.stage);
    setResearchQuestions(project.researchQuestions);
    setResearchObjectives(project.researchObjectives);
  }, [project.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (!title.trim()) {
      setSaveError('Judul penelitian tidak boleh kosong.');
      return;
    }
    setSaving(true);
    try {
      await onSaveMeta({
        title: title.trim(),
        topic: topic.trim(),
        studyProgram: studyProgram.trim(),
        authorName: authorName.trim(),
        institution: institution.trim(),
        year: year.trim(),
        methodology,
        stage,
        researchQuestions,
        researchObjectives,
      });
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan metadata proyek.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormulateAi = async () => {
    setAiError(null);
    if (!topic.trim() && !title.trim()) {
      setAiError('Isi topik atau judul sementara terlebih dahulu.');
      return;
    }
    setAiLoading(true);
    const verifiedOrProvided = references.filter((r) => r.verified);
    const refsToUse = verifiedOrProvided.length > 0 ? verifiedOrProvided : references;

    const res = await formulateTitleAndQuestions({
      topic: topic.trim() || title.trim(),
      studyProgram: studyProgram.trim(),
      methodology,
      contextNotes: contextNotes.trim(),
      existingTitle: title.trim(),
      references: refsToUse,
      modelOverride: selectedModel || undefined,
    });
    setAiLoading(false);

    if (!res.ok) {
      setAiError(res.message);
      return;
    }
    setAiResult(res.data);
  };

  return (
    <div className="space-y-6">
      <AiConnectionBanner
        aiStatus={aiStatus}
        checking={checkingAi}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        onRefresh={onRefreshAi}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Identitas &amp; Rancangan Penelitian</h2>
              <p className="text-xs text-slate-500">
                Informasi ini digunakan di halaman sampul DOCX dan konteks penyusunan bab.
              </p>
            </div>
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                Tersimpan
              </span>
            )}
          </div>

          <div>
            <label htmlFor="meta-title" className="block text-xs font-semibold text-slate-700">
              Judul Penelitian
            </label>
            <input
              id="meta-title"
              type="text"
              required
              maxLength={MAX_LENGTHS.projectTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="meta-topic" className="block text-xs font-semibold text-slate-700">
              Topik / Masalah Penelitian
            </label>
            <textarea
              id="meta-topic"
              rows={2}
              maxLength={MAX_LENGTHS.topic}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="meta-methodology" className="block text-xs font-semibold text-slate-700">
                Metodologi
              </label>
              <select
                id="meta-methodology"
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
              <label htmlFor="meta-stage" className="block text-xs font-semibold text-slate-700">
                Tahapan Naskah
              </label>
              <select
                id="meta-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as ProjectStage)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {PROJECT_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="meta-rq" className="block text-xs font-semibold text-slate-700">
              Rumusan Masalah / Pertanyaan Penelitian
            </label>
            <textarea
              id="meta-rq"
              rows={4}
              maxLength={MAX_LENGTHS.researchQuestions}
              value={researchQuestions}
              onChange={(e) => setResearchQuestions(e.target.value)}
              placeholder="1. Bagaimana ...?&#10;2. Apa pengaruh ...?"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="meta-ro" className="block text-xs font-semibold text-slate-700">
              Tujuan Penelitian
            </label>
            <textarea
              id="meta-ro"
              rows={3}
              maxLength={MAX_LENGTHS.researchObjectives}
              value={researchObjectives}
              onChange={(e) => setResearchObjectives(e.target.value)}
              placeholder="1. Mendeskripsikan ...&#10;2. Menganalisis ..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="meta-author" className="block text-xs font-semibold text-slate-700">
                Nama Peneliti
              </label>
              <input
                id="meta-author"
                type="text"
                maxLength={MAX_LENGTHS.authorName}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="meta-prodi" className="block text-xs font-semibold text-slate-700">
                Program Studi
              </label>
              <input
                id="meta-prodi"
                type="text"
                maxLength={MAX_LENGTHS.studyProgram}
                value={studyProgram}
                onChange={(e) => setStudyProgram(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="meta-institution" className="block text-xs font-semibold text-slate-700">
                Perguruan Tinggi / Institusi
              </label>
              <input
                id="meta-institution"
                type="text"
                maxLength={MAX_LENGTHS.institution}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="meta-year" className="block text-xs font-semibold text-slate-700">
                Tahun
              </label>
              <input
                id="meta-year"
                type="text"
                maxLength={MAX_LENGTHS.year}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="font-mono-tabular mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {saveError}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1E3A5F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#162C49] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Identitas Proyek'}</span>
            </button>
          </div>
        </form>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              Asisten Perumusan Judul &amp; Pertanyaan
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Menggunakan Ollama Cloud berdasarkan topik, metodologi, dan {references.filter((r) => r.verified).length} referensi terverifikasi Anda.
            </p>
          </div>

          <div>
            <label htmlFor="ai-context-notes" className="block text-xs font-semibold text-slate-700">
              Masukan Tambahan (Objek, Variabel, atau Fokus Lokasi)
            </label>
            <textarea
              id="ai-context-notes"
              rows={3}
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder="Contoh: Fokus pada guru sekolah dasar di wilayah pesisir, dengan variabel kesiapan teknologi dan efikasi diri."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleFormulateAi}
            disabled={aiLoading}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A5F] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            <span>{aiLoading ? 'Merumuskan dengan Ollama Cloud...' : 'Rumuskan Judul & Pertanyaan'}</span>
          </button>

          {aiError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800"
            >
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              {aiResult.titles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-800">
                    Opsi Judul (klik untuk menerapkan):
                  </p>
                  {aiResult.titles.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTitle(t)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs font-medium text-slate-900 transition-colors hover:border-[#1E3A5F] hover:bg-white"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {aiResult.researchQuestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">Usulan Pertanyaan Penelitian:</p>
                    <button
                      type="button"
                      onClick={() =>
                        setResearchQuestions(
                          aiResult.researchQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
                        )
                      }
                      className="min-h-[36px] rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-[#1E3A5F] hover:bg-slate-50"
                    >
                      Terapkan ke Form
                    </button>
                  </div>
                  <ul className="space-y-1 text-xs leading-relaxed text-slate-700">
                    {aiResult.researchQuestions.map((q, i) => (
                      <li key={i}>
                        {i + 1}. {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.researchObjectives.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">Usulan Tujuan Penelitian:</p>
                    <button
                      type="button"
                      onClick={() =>
                        setResearchObjectives(
                          aiResult.researchObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
                        )
                      }
                      className="min-h-[36px] rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-[#1E3A5F] hover:bg-slate-50"
                    >
                      Terapkan ke Form
                    </button>
                  </div>
                  <ul className="space-y-1 text-xs leading-relaxed text-slate-700">
                    {aiResult.researchObjectives.map((o, i) => (
                      <li key={i}>
                        {i + 1}. {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.rationale && (
                <p className="text-xs leading-relaxed text-slate-600">{aiResult.rationale}</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
