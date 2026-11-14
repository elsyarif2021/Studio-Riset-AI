import { Component, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { LogOut } from 'lucide-react';
import { AuthLandingView } from './components/AuthLandingView';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProjectListDashboard } from './components/ProjectListDashboard';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { auth, db, googleProvider } from './lib/firebase';
import { fetchAiStatus } from './services/aiService';
import {
  createResearchProject,
  deleteResearchProject,
  ensureUserProfile,
  subscribeUserProjects,
} from './services/firestoreService';
import type { AiStatusResponse, ResearchProject } from './types/research';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RisetAI Boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="text-base font-bold text-slate-900">Terjadi Kendala Aplikasi</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {this.state.errorMessage || 'Terjadi kesalahan tidak terduga pada tampilan.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-[44px] rounded-xl bg-[#1E3A5F] px-4 text-xs font-semibold text-white"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function readSelectedProjectFromHash(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith('#proyek=')) {
    const val = decodeURIComponent(hash.slice('#proyek='.length)).trim();
    return val || null;
  }
  return null;
}

function RisetAiApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() =>
    readSelectedProjectFromHash()
  );
  const [createOpen, setCreateOpen] = useState(false);

  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [checkingAi, setCheckingAi] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');

  const refreshAiStatus = async () => {
    setCheckingAi(true);
    const status = await fetchAiStatus();
    setAiStatus(status);
    setSelectedModel((prev) => prev || status.model || '');
    setCheckingAi(false);
  };

  useEffect(() => {
    void refreshAiStatus();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        void ensureUserProfile(currentUser).catch(() => {
          // Profile sync error logged by handleFirestoreError
        });
      } else {
        setProjects([]);
        setProjectsLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setProjectsLoading(true);
    const unsub = subscribeUserProjects(
      user.uid,
      (list) => {
        setProjects(list);
        setProjectsLoading(false);
      },
      () => {
        setProjectsLoading(false);
      }
    );
    return () => unsub();
  }, [authReady, user]);

  useEffect(() => {
    const onHashChange = () => {
      setSelectedProjectId(readSelectedProjectFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const selectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      window.location.hash = `proyek=${encodeURIComponent(projectId)}`;
    } else if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? `Gagal masuk dengan Google: ${err.message}`
          : 'Gagal masuk dengan Google.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    selectProject(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;
    const refsSnap = await getDocs(
      query(
        collection(db, 'projects', projectId, 'references'),
        where('ownerId', '==', user.uid),
        where('projectId', '==', projectId)
      )
    );
    const instSnap = await getDocs(
      query(
        collection(db, 'projects', projectId, 'instruments'),
        where('ownerId', '==', user.uid),
        where('projectId', '==', projectId)
      )
    );
    await deleteResearchProject(
      projectId,
      refsSnap.docs.map((d) => d.id),
      instSnap.docs.map((d) => d.id)
    );
    if (selectedProjectId === projectId) {
      selectProject(null);
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm font-medium text-slate-600">Memuat RisetAI Academic Studio...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthLandingView
        onSignIn={() => void handleSignIn()}
        loading={authLoading}
        errorMessage={authError}
      />
    );
  }

  const activeProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) || null
    : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Clean 3-Zone Top Bar (48px mobile / 56px desktop) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4 sm:h-14 sm:gap-8 sm:px-6">
          <button
            type="button"
            onClick={() => selectProject(null)}
            className="shrink-0 whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 sm:text-base"
          >
            RisetAI Academic Studio
          </button>

          <nav className="hidden items-center gap-6 text-xs font-medium text-slate-600 md:flex">
            <button
              type="button"
              onClick={() => selectProject(null)}
              className="whitespace-nowrap hover:text-slate-900"
            >
              Daftar Proyek
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="whitespace-nowrap hover:text-slate-900"
            >
              Proyek Baru
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-[180px] truncate text-xs font-medium text-slate-600 sm:inline">
              {user.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {activeProject ? (
        <ProjectWorkspace
          uid={user.uid}
          project={activeProject}
          aiStatus={aiStatus}
          checkingAi={checkingAi}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onRefreshAi={() => void refreshAiStatus()}
          onBackToList={() => selectProject(null)}
        />
      ) : (
        <ProjectListDashboard
          projects={projects}
          loading={projectsLoading}
          onSelectProject={(id) => selectProject(id)}
          onOpenCreate={() => setCreateOpen(true)}
          onDeleteProject={handleDeleteProject}
          aiStatus={aiStatus}
          checkingAi={checkingAi}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onRefreshAi={() => void refreshAiStatus()}
        />
      )}

      <CreateProjectModal
        open={createOpen}
        defaultAuthor={user.displayName || user.email?.split('@')[0] || ''}
        aiStatus={aiStatus}
        selectedModel={selectedModel}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          const newId = await createResearchProject(user.uid, input);
          selectProject(newId);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <RisetAiApp />
    </AppErrorBoundary>
  );
}
