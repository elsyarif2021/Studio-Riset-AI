import { useState } from 'react';
import { ChevronRight, Plus, Search, Trash2 } from 'lucide-react';
import { countTotalWords, hasBab4DataMarker } from '../lib/chapters';
import { PROJECT_STAGES } from '../lib/validation';
import type { AiStatusResponse, ProjectStage, ResearchProject } from '../types/research';
import { AiConnectionBanner } from './AiConnectionBanner';

interface ProjectListDashboardProps {
  projects: ResearchProject[];
  loading: boolean;
  onSelectProject: (projectId: string) => void;
  onOpenCreate: () => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  aiStatus: AiStatusResponse | null;
  checkingAi: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onRefreshAi: () => void;
}

export function ProjectListDashboard({
  projects,
  loading,
  onSelectProject,
  onOpenCreate,
  onDeleteProject,
  aiStatus,
  checkingAi,
  selectedModel,
  onSelectModel,
  onRefreshAi,
}: ProjectListDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'Semua' | ProjectStage>('Semua');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = projects.filter((p) => {
    const matchesStage = stageFilter === 'Semua' || p.stage === stageFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.topic.toLowerCase().includes(q) ||
      p.studyProgram.toLowerCase().includes(q);
    return matchesStage && matchesSearch;
  });

  const handleConfirmDelete = async (projectId: string) => {
    setDeletingId(projectId);
    try {
      await onDeleteProject(projectId);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-20 sm:px-6 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif-academic text-2xl font-bold text-slate-900 sm:text-3xl">
            Proyek Penelitian Saya
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Seluruh proyek tersimpan aman di akun Anda dan dapat dibuka kembali dari HP maupun komputer.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#162C49]"
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">Buat Proyek Baru</span>
        </button>
      </div>

      <AiConnectionBanner
        aiStatus={aiStatus}
        checking={checkingAi}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        onRefresh={onRefreshAi}
        compact
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, topik, atau prodi..."
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
          {(['Semua', ...PROJECT_STAGES] as const).map((stage) => {
            const active = stageFilter === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stage)}
                className={`min-h-[38px] shrink-0 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#1E3A5F] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {stage}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            {projects.length === 0
              ? 'Belum ada proyek penelitian'
              : 'Tidak ada proyek yang cocok dengan pencarian'}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            {projects.length === 0
              ? 'Mulai proyek pertama Anda untuk menyusun BAB I–V, mengelola referensi, membuat instrumen, dan mengekspor file Word (.docx).'
              : 'Coba ubah kata kunci pencarian atau pilih filter tahapan lain.'}
          </p>
          {projects.length === 0 && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1E3A5F] px-5 text-sm font-semibold text-white hover:bg-[#162C49]"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Proyek Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((project) => {
            const totalWords = countTotalWords(project.chapters);
            const bab4NeedsData =
              !project.hasResearchData || hasBab4DataMarker(project.chapters?.bab4 || '');
            const updatedLabel = project.updatedAt?.toDate
              ? project.updatedAt.toDate().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Baru saja';
            const isConfirming = confirmDeleteId === project.id;

            return (
              <article
                key={project.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{project.methodology}</span>
                    <span aria-hidden="true">·</span>
                    <span>{project.stage}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{project.year || '2026'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    className="mt-2 block w-full text-left focus:outline-none"
                  >
                    <h2 className="font-serif-academic line-clamp-2 text-lg font-bold leading-snug text-slate-900 hover:text-[#1E3A5F]">
                      {project.title}
                    </h2>
                  </button>

                  {project.topic && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{project.topic}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono-tabular">{totalWords} kata</span>
                    <span aria-hidden="true">·</span>
                    <span>Diperbarui {updatedLabel}</span>
                    {bab4NeedsData && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-amber-700">BAB IV perlu data</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                  {isConfirming ? (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-medium text-red-700">Hapus proyek ini permanen?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === project.id}
                          onClick={() => void handleConfirmDelete(project.id)}
                          className="min-h-[40px] rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === project.id ? 'Menghapus...' : 'Ya, Hapus'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(project.id)}
                        aria-label={`Hapus proyek ${project.title}`}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectProject(project.id)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-[#1E3A5F]"
                      >
                        <span>Buka Editor</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
