import type { Timestamp } from 'firebase/firestore';

export type ChapterKey = 'bab1' | 'bab2' | 'bab3' | 'bab4' | 'bab5';

export type Methodology =
  | 'Kualitatif'
  | 'Kuantitatif'
  | 'Mix Method'
  | 'R&D'
  | 'PTK'
  | 'Studi Literatur';

export type ProjectStage =
  | 'Perencanaan'
  | 'Penyusunan'
  | 'Revisi'
  | 'Siap Ekspor';

export type ReferenceType =
  | 'Jurnal'
  | 'Buku'
  | 'Prosiding'
  | 'Skripsi/Tesis'
  | 'Dokumen/Web';

export type InstrumentType =
  | 'Kuesioner Skala Likert'
  | 'Pedoman Wawancara'
  | 'Lembar Observasi'
  | 'Tes/Rubrik';

export type ChaptersMap = Record<ChapterKey, string>;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  institution: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ResearchProject {
  id: string;
  ownerId: string;
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
  hasResearchData: boolean;
  researchDataSummary: string;
  chapters: ChaptersMap;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ProjectReference {
  id: string;
  ownerId: string;
  projectId: string;
  type: ReferenceType;
  authors: string;
  year: string;
  title: string;
  source: string;
  volumeIssuePages: string;
  doiOrUrl: string;
  notes: string;
  verified: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ProjectInstrument {
  id: string;
  ownerId: string;
  projectId: string;
  instrumentType: InstrumentType;
  code: string;
  variable: string;
  indicator: string;
  question: string;
  scaleOrNotes: string;
  orderIndex: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AiStatusResponse {
  configured: boolean;
  connected: boolean;
  status: 'connected' | 'unconfigured' | 'auth_error' | 'model_error' | 'rate_limit' | 'timeout' | 'unreachable';
  provider: string;
  baseUrl?: string;
  model: string;
  availableModels: string[];
  message: string;
  checkedAt: string;
}

export interface FormulateResult {
  titles: string[];
  researchQuestions: string[];
  researchObjectives: string[];
  rationale: string;
}
