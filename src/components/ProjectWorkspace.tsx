import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  LayoutDashboard,
  ListChecks,
} from 'lucide-react';
import { countTotalWords } from '../lib/chapters';
import {
  addProjectInstrumentsBatch,
  addProjectReference,
  deleteProjectInstrument,
  deleteProjectReference,
  saveProjectChaptersAndData,
  subscribeProjectInstruments,
  subscribeProjectReferences,
  toggleReferenceVerified,
  updateProjectInstrument,
  updateProjectMeta,
  updateProjectReference,
} from '../services/firestoreService';
import type {
  AiStatusResponse,
  ProjectInstrument,
  ProjectReference,
  ResearchProject,
} from '../types/research';
import { ChapterEditor } from './ChapterEditor';
import { ExportDocxPanel } from './ExportDocxPanel';
import { InstrumentGenerator } from './InstrumentGenerator';
import { OverviewAndAiPanel } from './OverviewAndAiPanel';
import { ReferenceManager } from './ReferenceManager';

type WorkspaceTab = 'ringkasan' | 'bab' | 'referensi' | 'instrumen' | 'ekspor';

interface ProjectWorkspaceProps {
  uid: string;
  project: ResearchProject;
  aiStatus: AiStatusResponse | null;
  checkingAi: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onRefreshAi: () => void;
  onBackToList: () => void;
}

const TABS: Array<{
  id: WorkspaceTab;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'ringkasan', label: 'Ringkasan & AI', shortLabel: 'Ringkasan', icon: LayoutDashboard },
  { id: 'bab', label: 'Editor BAB I–V', shortLabel: 'BAB I–V', icon: FileText },
  { id: 'referensi', label: 'Referensi', shortLabel: 'Referensi', icon: BookOpen },
  { id: 'instrumen', label: 'Instrumen', shortLabel: 'Instrumen', icon: ListChecks },
  { id: 'ekspor', label: 'Ekspor Word', shortLabel: 'Ekspor', icon: Download },
];

export function ProjectWorkspace({
  uid,
  project,
  aiStatus,
  checkingAi,
  selectedModel,
  onSelectModel,
  onRefreshAi,
  onBackToList,
}: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('bab');
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [instruments, setInstruments] = useState<ProjectInstrument[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setSyncError(null);
    const unsubRefs = subscribeProjectReferences(
      uid,
      project.id,
      setReferences,
      (err) => setSyncError(err.message)
    );
    const unsubInst = subscribeProjectInstruments(
      uid,
      project.id,
      setInstruments,
      (err) => setSyncError(err.message)
    );
    return () => {
      unsubRefs();
      unsubInst();
    };
  }, [uid, project.id]);

  const totalWords = countTotalWords(project.chapters);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
      {/* Project Header Strip */}
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Semua Proyek</span>
          </button>
          <h1 className="font-serif-academic mt-1 truncate text-xl font-bold text-slate-900 sm:text-2xl">
            {project.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{project.methodology}</span>
            <span aria-hidden="true">·</span>
            <span>{project.stage}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{totalWords} kata</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{references.length} referensi</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{instruments.length} instrumen</span>
          </div>
        </div>
      </div>

      {syncError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
        >
          Terjadi kesalahan sinkronisasi Firestore: {syncError}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden w-60 shrink-0 space-y-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 lg:block">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-left text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#1E3A5F] text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Workspace Panel */}
        <main className="min-w-0 flex-1">
          {activeTab === 'ringkasan' && (
            <OverviewAndAiPanel
              project={project}
              references={references}
              aiStatus={aiStatus}
              checkingAi={checkingAi}
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              onRefreshAi={onRefreshAi}
              onSaveMeta={(input) => updateProjectMeta(project.id, input)}
            />
          )}

          {activeTab === 'bab' && (
            <ChapterEditor
              project={project}
              references={references}
              aiStatus={aiStatus}
              selectedModel={selectedModel}
              onSaveChapters={(input) => saveProjectChaptersAndData(project.id, input)}
            />
          )}

          {activeTab === 'referensi' && (
            <ReferenceManager
              references={references}
              onAdd={async (input) => {
                await addProjectReference(uid, project.id, input);
              }}
              onUpdate={(refId, input) => updateProjectReference(project.id, refId, input)}
              onToggleVerified={(refId, verified) =>
                toggleReferenceVerified(project.id, refId, verified)
              }
              onDelete={(refId) => deleteProjectReference(project.id, refId)}
            />
          )}

          {activeTab === 'instrumen' && (
            <InstrumentGenerator
              project={project}
              references={references}
              instruments={instruments}
              aiStatus={aiStatus}
              selectedModel={selectedModel}
              onAddBatch={(items) => addProjectInstrumentsBatch(uid, project.id, items)}
              onUpdate={(instId, item) => updateProjectInstrument(project.id, instId, item)}
              onDelete={(instId) => deleteProjectInstrument(project.id, instId)}
            />
          )}

          {activeTab === 'ekspor' && (
            <ExportDocxPanel
              project={project}
              references={references}
              instruments={instruments}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Natural Thumb Zone, compact 56px height) */}
      <nav
        aria-label="Navigasi Proyek"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
      >
        <div className="grid h-14 grid-cols-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                  active ? 'text-[#1E3A5F]' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="truncate text-[10px] font-semibold tracking-tight">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
