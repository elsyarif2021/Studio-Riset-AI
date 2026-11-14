import type {
  AiStatusResponse,
  ChapterKey,
  FormulateResult,
  InstrumentType,
  Methodology,
  ProjectReference,
} from '../types/research';

export interface AiServiceError {
  ok: false;
  errorCode: string;
  message: string;
}

export async function fetchAiStatus(): Promise<AiStatusResponse> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) {
      return {
        configured: false,
        connected: false,
        status: 'unreachable',
        provider: 'Ollama Cloud',
        model: '-',
        availableModels: [],
        message: `Gagal memeriksa status backend AI (HTTP ${res.status}). Editor naskah tetap aktif.`,
        checkedAt: new Date().toISOString(),
      };
    }
    return (await res.json()) as AiStatusResponse;
  } catch {
    return {
      configured: false,
      connected: false,
      status: 'unreachable',
      provider: 'Ollama Cloud',
      model: '-',
      availableModels: [],
      message: 'Backend AI tidak merespons. Editor BAB I–V, referensi, instrumen, dan ekspor Word tetap dapat dipakai.',
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function formulateTitleAndQuestions(payload: {
  topic: string;
  studyProgram?: string;
  methodology?: Methodology;
  contextNotes?: string;
  existingTitle?: string;
  references?: ProjectReference[];
  modelOverride?: string;
}): Promise<{ ok: true; model: string; data: FormulateResult } | AiServiceError> {
  try {
    const res = await fetch('/api/ai/formulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        references: (payload.references || []).map((r) => ({
          authors: r.authors,
          year: r.year,
          title: r.title,
          source: r.source,
          verified: r.verified,
        })),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        errorCode: json.errorCode || 'ai_error',
        message: json.message || `Gagal merumuskan judul (HTTP ${res.status}).`,
      };
    }
    return json;
  } catch (err) {
    return {
      ok: false,
      errorCode: 'network_error',
      message:
        'Koneksi ke server gagal saat menghubungi AI: ' +
        (err instanceof Error ? err.message : 'Jaringan terganggu.'),
    };
  }
}

export async function generateInstrumentsWithAi(payload: {
  title: string;
  methodology: Methodology;
  researchQuestions: string;
  variables: string;
  instrumentType: InstrumentType;
  itemCount: number;
  references: ProjectReference[];
  modelOverride?: string;
}): Promise<
  | {
      ok: true;
      model: string;
      items: Array<{
        code: string;
        variable: string;
        indicator: string;
        question: string;
        scaleOrNotes: string;
      }>;
    }
  | AiServiceError
> {
  try {
    const res = await fetch('/api/ai/instruments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        references: payload.references.map((r) => ({
          authors: r.authors,
          year: r.year,
          title: r.title,
          source: r.source,
          verified: r.verified,
        })),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        errorCode: json.errorCode || 'ai_error',
        message: json.message || `Gagal menyusun instrumen (HTTP ${res.status}).`,
      };
    }
    return json;
  } catch (err) {
    return {
      ok: false,
      errorCode: 'network_error',
      message:
        'Tidak dapat terhubung ke server AI: ' +
        (err instanceof Error ? err.message : 'Gangguan jaringan.'),
    };
  }
}

export async function assistChapterWithAi(payload: {
  chapterKey: ChapterKey;
  chapterTitle: string;
  title: string;
  topic: string;
  methodology: Methodology;
  researchQuestions: string;
  researchObjectives: string;
  currentContent: string;
  instruction: string;
  references: ProjectReference[];
  hasResearchData: boolean;
  researchDataSummary: string;
  modelOverride?: string;
}): Promise<{ ok: true; model: string; content: string } | AiServiceError> {
  try {
    const res = await fetch('/api/ai/assist-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        references: payload.references.map((r) => ({
          authors: r.authors,
          year: r.year,
          title: r.title,
          source: r.source,
          verified: r.verified,
        })),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        errorCode: json.errorCode || 'ai_error',
        message: json.message || `Gagal memproses draf bab (HTTP ${res.status}).`,
      };
    }
    return json;
  } catch (err) {
    return {
      ok: false,
      errorCode: 'network_error',
      message:
        'Gagal menghubungi server AI: ' +
        (err instanceof Error ? err.message : 'Jaringan terganggu.'),
    };
  }
}
