import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { buildDefaultChapters } from '../lib/chapters';
import {
  clipRawString,
  clipString,
  generateSafeId,
  INSTRUMENT_TYPES,
  MAX_LENGTHS,
  METHODOLOGIES,
  PROJECT_STAGES,
  REFERENCE_TYPES,
  sanitizeChapters,
} from '../lib/validation';
import type {
  ChaptersMap,
  InstrumentType,
  Methodology,
  ProjectInstrument,
  ProjectReference,
  ProjectStage,
  ReferenceType,
  ResearchProject,
} from '../types/research';

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const displayName = clipString(user.displayName || user.email?.split('@')[0] || 'Peneliti', MAX_LENGTHS.displayName);
    const email = clipString(user.email || 'user@example.com', MAX_LENGTHS.email);
    const photoURL = clipString(user.photoURL || '', MAX_LENGTHS.photoURL);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        email,
        photoURL,
        institution: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        email,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeUserProjects(
  uid: string,
  onData: (projects: ResearchProject[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'projects';
  const q = query(collection(db, 'projects'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ResearchProject[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ResearchProject, 'id'>),
        }))
        .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export function subscribeProjectReferences(
  uid: string,
  projectId: string,
  onData: (refs: ProjectReference[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `projects/${projectId}/references`;
  const q = query(
    collection(db, 'projects', projectId, 'references'),
    where('ownerId', '==', uid),
    where('projectId', '==', projectId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ProjectReference[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ProjectReference, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export function subscribeProjectInstruments(
  uid: string,
  projectId: string,
  onData: (items: ProjectInstrument[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `projects/${projectId}/instruments`;
  const q = query(
    collection(db, 'projects', projectId, 'instruments'),
    where('ownerId', '==', uid),
    where('projectId', '==', projectId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ProjectInstrument[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ProjectInstrument, 'id'>),
        }))
        .sort((a, b) => a.orderIndex - b.orderIndex);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function createResearchProject(
  uid: string,
  input: {
    title: string;
    topic: string;
    studyProgram: string;
    authorName: string;
    institution: string;
    year: string;
    methodology: Methodology;
    researchQuestions?: string;
    researchObjectives?: string;
    hasResearchData?: boolean;
  }
): Promise<string> {
  const projectId = generateSafeId('proj');
  const path = `projects/${projectId}`;

  const safeTitle = clipString(input.title, MAX_LENGTHS.projectTitle) || 'Proyek Penelitian Baru';
  const safeTopic = clipString(input.topic, MAX_LENGTHS.topic);
  const safeMethodology = METHODOLOGIES.includes(input.methodology)
    ? input.methodology
    : 'Kualitatif';
  const safeQuestions = clipRawString(input.researchQuestions || '', MAX_LENGTHS.researchQuestions);
  const safeObjectives = clipRawString(input.researchObjectives || '', MAX_LENGTHS.researchObjectives);
  const hasResearchData = Boolean(input.hasResearchData);

  const defaultChapters = sanitizeChapters(
    buildDefaultChapters({
      title: safeTitle,
      topic: safeTopic,
      methodology: safeMethodology,
      researchQuestions: safeQuestions,
      researchObjectives: safeObjectives,
      hasResearchData,
    })
  );

  try {
    await setDoc(doc(db, 'projects', projectId), {
      ownerId: uid,
      title: safeTitle,
      topic: safeTopic,
      studyProgram: clipString(input.studyProgram, MAX_LENGTHS.studyProgram),
      authorName: clipString(input.authorName, MAX_LENGTHS.authorName),
      institution: clipString(input.institution, MAX_LENGTHS.institution),
      year: clipString(input.year || String(new Date().getFullYear()), MAX_LENGTHS.year),
      methodology: safeMethodology,
      stage: 'Perencanaan' as ProjectStage,
      researchQuestions: safeQuestions,
      researchObjectives: safeObjectives,
      hasResearchData,
      researchDataSummary: '',
      chapters: defaultChapters,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return projectId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateProjectMeta(
  projectId: string,
  input: {
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
  }
): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      title: clipString(input.title, MAX_LENGTHS.projectTitle) || 'Proyek Penelitian',
      topic: clipString(input.topic, MAX_LENGTHS.topic),
      studyProgram: clipString(input.studyProgram, MAX_LENGTHS.studyProgram),
      authorName: clipString(input.authorName, MAX_LENGTHS.authorName),
      institution: clipString(input.institution, MAX_LENGTHS.institution),
      year: clipString(input.year, MAX_LENGTHS.year),
      methodology: METHODOLOGIES.includes(input.methodology) ? input.methodology : 'Kualitatif',
      stage: PROJECT_STAGES.includes(input.stage) ? input.stage : 'Penyusunan',
      researchQuestions: clipRawString(input.researchQuestions, MAX_LENGTHS.researchQuestions),
      researchObjectives: clipRawString(input.researchObjectives, MAX_LENGTHS.researchObjectives),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveProjectChaptersAndData(
  projectId: string,
  input: {
    chapters: ChaptersMap;
    hasResearchData: boolean;
    researchDataSummary: string;
    stage?: ProjectStage;
  }
): Promise<void> {
  const path = `projects/${projectId}`;
  const payload: Record<string, unknown> = {
    chapters: sanitizeChapters(input.chapters),
    hasResearchData: Boolean(input.hasResearchData),
    researchDataSummary: clipRawString(input.researchDataSummary, MAX_LENGTHS.researchDataSummary),
    updatedAt: serverTimestamp(),
  };
  if (input.stage && PROJECT_STAGES.includes(input.stage)) {
    payload.stage = input.stage;
  }
  try {
    await updateDoc(doc(db, 'projects', projectId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteResearchProject(
  projectId: string,
  refIds: string[],
  instrumentIds: string[]
): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    const batch = writeBatch(db);
    for (const rid of refIds) {
      batch.delete(doc(db, 'projects', projectId, 'references', rid));
    }
    for (const iid of instrumentIds) {
      batch.delete(doc(db, 'projects', projectId, 'instruments', iid));
    }
    batch.delete(doc(db, 'projects', projectId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addProjectReference(
  uid: string,
  projectId: string,
  input: {
    type: ReferenceType;
    authors: string;
    year: string;
    title: string;
    source: string;
    volumeIssuePages: string;
    doiOrUrl: string;
    notes: string;
    verified: boolean;
  }
): Promise<string> {
  const refId = generateSafeId('ref');
  const path = `projects/${projectId}/references/${refId}`;
  try {
    await setDoc(doc(db, 'projects', projectId, 'references', refId), {
      ownerId: uid,
      projectId,
      type: REFERENCE_TYPES.includes(input.type) ? input.type : 'Jurnal',
      authors: clipString(input.authors, MAX_LENGTHS.refAuthors) || 'Anonim',
      year: clipString(input.year, MAX_LENGTHS.refYear) || String(new Date().getFullYear()),
      title: clipString(input.title, MAX_LENGTHS.refTitle) || 'Tanpa Judul',
      source: clipString(input.source, MAX_LENGTHS.refSource),
      volumeIssuePages: clipString(input.volumeIssuePages, MAX_LENGTHS.refVolumeIssuePages),
      doiOrUrl: clipString(input.doiOrUrl, MAX_LENGTHS.refDoiOrUrl),
      notes: clipRawString(input.notes, MAX_LENGTHS.refNotes),
      verified: Boolean(input.verified),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return refId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateProjectReference(
  projectId: string,
  refId: string,
  input: {
    type: ReferenceType;
    authors: string;
    year: string;
    title: string;
    source: string;
    volumeIssuePages: string;
    doiOrUrl: string;
    notes: string;
    verified: boolean;
  }
): Promise<void> {
  const path = `projects/${projectId}/references/${refId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId, 'references', refId), {
      type: REFERENCE_TYPES.includes(input.type) ? input.type : 'Jurnal',
      authors: clipString(input.authors, MAX_LENGTHS.refAuthors) || 'Anonim',
      year: clipString(input.year, MAX_LENGTHS.refYear) || String(new Date().getFullYear()),
      title: clipString(input.title, MAX_LENGTHS.refTitle) || 'Tanpa Judul',
      source: clipString(input.source, MAX_LENGTHS.refSource),
      volumeIssuePages: clipString(input.volumeIssuePages, MAX_LENGTHS.refVolumeIssuePages),
      doiOrUrl: clipString(input.doiOrUrl, MAX_LENGTHS.refDoiOrUrl),
      notes: clipRawString(input.notes, MAX_LENGTHS.refNotes),
      verified: Boolean(input.verified),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleReferenceVerified(
  projectId: string,
  refId: string,
  verified: boolean
): Promise<void> {
  const path = `projects/${projectId}/references/${refId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId, 'references', refId), {
      verified: Boolean(verified),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProjectReference(projectId: string, refId: string): Promise<void> {
  const path = `projects/${projectId}/references/${refId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'references', refId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addProjectInstrumentsBatch(
  uid: string,
  projectId: string,
  items: Array<{
    instrumentType: InstrumentType;
    code: string;
    variable: string;
    indicator: string;
    question: string;
    scaleOrNotes: string;
    orderIndex: number;
  }>
): Promise<void> {
  const path = `projects/${projectId}/instruments`;
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const instId = generateSafeId('inst');
      const ref = doc(db, 'projects', projectId, 'instruments', instId);
      batch.set(ref, {
        ownerId: uid,
        projectId,
        instrumentType: INSTRUMENT_TYPES.includes(item.instrumentType)
          ? item.instrumentType
          : 'Kuesioner Skala Likert',
        code: clipString(item.code, MAX_LENGTHS.instCode) || 'B1',
        variable: clipString(item.variable, MAX_LENGTHS.instVariable) || 'Variabel',
        indicator: clipString(item.indicator, MAX_LENGTHS.instIndicator) || 'Indikator',
        question: clipString(item.question, MAX_LENGTHS.instQuestion) || 'Butir pertanyaan',
        scaleOrNotes: clipString(item.scaleOrNotes, MAX_LENGTHS.instScaleOrNotes),
        orderIndex: Math.max(0, Math.min(10000, Math.round(item.orderIndex))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateProjectInstrument(
  projectId: string,
  instId: string,
  item: {
    instrumentType: InstrumentType;
    code: string;
    variable: string;
    indicator: string;
    question: string;
    scaleOrNotes: string;
    orderIndex: number;
  }
): Promise<void> {
  const path = `projects/${projectId}/instruments/${instId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId, 'instruments', instId), {
      instrumentType: INSTRUMENT_TYPES.includes(item.instrumentType)
        ? item.instrumentType
        : 'Kuesioner Skala Likert',
      code: clipString(item.code, MAX_LENGTHS.instCode) || 'B1',
      variable: clipString(item.variable, MAX_LENGTHS.instVariable) || 'Variabel',
      indicator: clipString(item.indicator, MAX_LENGTHS.instIndicator) || 'Indikator',
      question: clipString(item.question, MAX_LENGTHS.instQuestion) || 'Butir pertanyaan',
      scaleOrNotes: clipString(item.scaleOrNotes, MAX_LENGTHS.instScaleOrNotes),
      orderIndex: Math.max(0, Math.min(10000, Math.round(item.orderIndex))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProjectInstrument(projectId: string, instId: string): Promise<void> {
  const path = `projects/${projectId}/instruments/${instId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'instruments', instId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
