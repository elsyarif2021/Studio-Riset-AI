import type {
  ChaptersMap,
  InstrumentType,
  Methodology,
  ProjectStage,
  ReferenceType,
} from '../types/research';

// Verbatim constraints synced with firebase-blueprint.json & firestore.rules
export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const MAX_LENGTHS = {
  id: 128,
  displayName: 120,
  email: 200,
  photoURL: 500,
  projectTitle: 300,
  topic: 600,
  studyProgram: 150,
  authorName: 150,
  institution: 200,
  year: 10,
  methodology: 40,
  stage: 40,
  researchQuestions: 5000,
  researchObjectives: 5000,
  researchDataSummary: 15000,
  chapterText: 120000,
  refType: 40,
  refAuthors: 300,
  refYear: 20,
  refTitle: 400,
  refSource: 300,
  refVolumeIssuePages: 120,
  refDoiOrUrl: 400,
  refNotes: 2000,
  instType: 60,
  instCode: 40,
  instVariable: 200,
  instIndicator: 300,
  instQuestion: 1500,
  instScaleOrNotes: 300,
} as const;

export const METHODOLOGIES: Methodology[] = [
  'Kualitatif',
  'Kuantitatif',
  'Mix Method',
  'R&D',
  'PTK',
  'Studi Literatur',
];

export const PROJECT_STAGES: ProjectStage[] = [
  'Perencanaan',
  'Penyusunan',
  'Revisi',
  'Siap Ekspor',
];

export const REFERENCE_TYPES: ReferenceType[] = [
  'Jurnal',
  'Buku',
  'Prosiding',
  'Skripsi/Tesis',
  'Dokumen/Web',
];

export const INSTRUMENT_TYPES: InstrumentType[] = [
  'Kuesioner Skala Likert',
  'Pedoman Wawancara',
  'Lembar Observasi',
  'Tes/Rubrik',
];

export function clipString(value: string | undefined | null, maxLen: number): string {
  return (value ?? '').trim().slice(0, maxLen);
}

export function clipRawString(value: string | undefined | null, maxLen: number): string {
  return (value ?? '').slice(0, maxLen);
}

export function sanitizeChapters(chapters: Partial<ChaptersMap> | undefined): ChaptersMap {
  return {
    bab1: clipRawString(chapters?.bab1, MAX_LENGTHS.chapterText),
    bab2: clipRawString(chapters?.bab2, MAX_LENGTHS.chapterText),
    bab3: clipRawString(chapters?.bab3, MAX_LENGTHS.chapterText),
    bab4: clipRawString(chapters?.bab4, MAX_LENGTHS.chapterText),
    bab5: clipRawString(chapters?.bab5, MAX_LENGTHS.chapterText),
  };
}

export function isValidFirestoreId(id: string): boolean {
  return id.length >= 1 && id.length <= MAX_LENGTHS.id && ID_PATTERN.test(id);
}

export function generateSafeId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  return `${prefix}_${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, MAX_LENGTHS.id);
}
