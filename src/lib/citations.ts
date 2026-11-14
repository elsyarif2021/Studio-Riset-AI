import type { ProjectReference } from '../types/research';

export function formatInTextCitation(ref: ProjectReference): string {
  const rawAuthors = ref.authors.trim();
  const firstAuthor = rawAuthors.split(/[;,]| dan | & /i)[0]?.trim() || rawAuthors;
  const parts = firstAuthor.split(/\s+/).filter(Boolean);
  const surname =
    rawAuthors.includes(',') && parts.length > 0
      ? rawAuthors.split(',')[0].trim()
      : parts.length > 1
        ? parts[parts.length - 1]
        : firstAuthor;

  const hasMultiple = /[;,]| dan | & /i.test(rawAuthors);
  const authorLabel = hasMultiple ? `${surname} dkk.` : surname;
  return `(${authorLabel}, ${ref.year.trim() || 't.t.'})`;
}

export function formatApaBibliography(ref: ProjectReference): string {
  const authors = ref.authors.trim();
  const year = ref.year.trim() || 't.t.';
  const title = ref.title.trim();
  const source = ref.source.trim();
  const vol = ref.volumeIssuePages.trim();
  const doiOrUrl = ref.doiOrUrl.trim();

  const segments: string[] = [`${authors} (${year}).`, `${title}.`];

  if (source) {
    if (vol) {
      segments.push(`${source}, ${vol}.`);
    } else {
      segments.push(`${source}.`);
    }
  } else if (vol) {
    segments.push(`${vol}.`);
  }

  if (doiOrUrl) {
    segments.push(doiOrUrl);
  }

  return segments.join(' ');
}

export function sortReferencesAlphabetically(refs: ProjectReference[]): ProjectReference[] {
  return [...refs].sort((a, b) =>
    a.authors.localeCompare(b.authors, 'id', { sensitivity: 'base' })
  );
}
