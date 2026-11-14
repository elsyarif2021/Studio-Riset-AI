import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { CHAPTER_METADATA, hasBab4DataMarker } from './chapters';
import { formatApaBibliography, sortReferencesAlphabetically } from './citations';
import type { ProjectInstrument, ProjectReference, ResearchProject } from '../types/research';

const FONT_NAME = 'Times New Roman';
const BODY_SIZE_HALF_PT = 24; // 12pt
const HEADING_SIZE_HALF_PT = 28; // 14pt
const SUBHEADING_SIZE_HALF_PT = 24; // 12pt bold

function isSubheadingLine(line: string): boolean {
  return /^(\d+\.\d+(\.\d+)?|[A-Z]\.)\s+/.test(line.trim());
}

function buildChapterParagraphs(content: string): Paragraph[] {
  const lines = content.split(/\r?\n/);
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('[PENANDA') || trimmed.startsWith('[PERLU')) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 160, after: 160, line: 360 },
          shading: {
            type: ShadingType.CLEAR,
            color: 'auto',
            fill: 'FEF3C7',
          },
          children: [
            new TextRun({
              text: trimmed,
              font: FONT_NAME,
              size: BODY_SIZE_HALF_PT,
              bold: true,
              color: '92400E',
            }),
          ],
        })
      );
      continue;
    }

    if (isSubheadingLine(trimmed)) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100, line: 360 },
          children: [
            new TextRun({
              text: trimmed,
              font: FONT_NAME,
              size: SUBHEADING_SIZE_HALF_PT,
              bold: true,
              color: '0F172A',
            }),
          ],
        })
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 140, line: 360 },
        children: [
          new TextRun({
            text: trimmed,
            font: FONT_NAME,
            size: BODY_SIZE_HALF_PT,
            color: '111827',
          }),
        ],
      })
    );
  }

  return paragraphs;
}

function buildInstrumentTable(instruments: ProjectInstrument[]): Table {
  const borderSpec = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'CBD5E1',
  };

  const cellBorders = {
    top: borderSpec,
    bottom: borderSpec,
    left: borderSpec,
    right: borderSpec,
  };

  const headers = [
    { label: 'Kode', widthPct: 10 },
    { label: 'Variabel / Aspek', widthPct: 20 },
    { label: 'Indikator', widthPct: 22 },
    { label: 'Butir Pertanyaan / Pernyataan', widthPct: 33 },
    { label: 'Skala / Keterangan', widthPct: 15 },
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          width: { size: h.widthPct, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: {
            type: ShadingType.CLEAR,
            color: 'auto',
            fill: '1E3A5F',
          },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: h.label,
                  font: FONT_NAME,
                  size: 20, // 10pt
                  bold: true,
                  color: 'FFFFFF',
                }),
              ],
            }),
          ],
        })
    ),
  });

  const sorted = [...instruments].sort((a, b) => a.orderIndex - b.orderIndex);

  const bodyRows = sorted.map(
    (item, idx) =>
      new TableRow({
        children: [
          item.code || `B${idx + 1}`,
          item.variable,
          item.indicator,
          item.question,
          `${item.instrumentType}${item.scaleOrNotes ? ` — ${item.scaleOrNotes}` : ''}`,
        ].map((cellText, colIdx) => {
          const widthPct = headers[colIdx].widthPct;
          return new TableCell({
            width: { size: widthPct, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            shading:
              idx % 2 === 1
                ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F8FAFC' }
                : undefined,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 276 },
                children: [
                  new TextRun({
                    text: cellText || '-',
                    font: FONT_NAME,
                    size: 20, // 10pt
                    color: '111827',
                  }),
                ],
              }),
            ],
          });
        }),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

export async function buildResearchDocxBlob(params: {
  project: ResearchProject;
  references: ProjectReference[];
  instruments: ProjectInstrument[];
  onlyVerifiedRefs?: boolean;
}): Promise<Blob> {
  const { project, references, instruments, onlyVerifiedRefs = false } = params;

  const filteredRefs = onlyVerifiedRefs
    ? references.filter((r) => r.verified)
    : references;
  const sortedRefs = sortReferencesAlphabetically(filteredRefs);

  const children: Array<Paragraph | Table> = [];

  // 1. Halaman Judul
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 400 },
      children: [
        new TextRun({
          text: project.title.toUpperCase(),
          font: FONT_NAME,
          size: 32, // 16pt
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [
        new TextRun({
          text: `Naskah Penelitian (${project.methodology})`,
          font: FONT_NAME,
          size: BODY_SIZE_HALF_PT,
          italics: true,
          color: '334155',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 120 },
      children: [
        new TextRun({
          text: 'Disusun oleh:',
          font: FONT_NAME,
          size: BODY_SIZE_HALF_PT,
          color: '334155',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1600 },
      children: [
        new TextRun({
          text: project.authorName || 'Peneliti',
          font: FONT_NAME,
          size: HEADING_SIZE_HALF_PT,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 80 },
      children: [
        new TextRun({
          text: (project.studyProgram || 'Program Studi').toUpperCase(),
          font: FONT_NAME,
          size: BODY_SIZE_HALF_PT,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: (project.institution || 'Institusi Akademik').toUpperCase(),
          font: FONT_NAME,
          size: BODY_SIZE_HALF_PT,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: project.year || String(new Date().getFullYear()),
          font: FONT_NAME,
          size: BODY_SIZE_HALF_PT,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // 2. BAB I - BAB V
  CHAPTER_METADATA.forEach((meta, index) => {
    if (index > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: meta.roman,
            font: FONT_NAME,
            size: HEADING_SIZE_HALF_PT,
            bold: true,
            color: '0F172A',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 320 },
        children: [
          new TextRun({
            text: meta.title,
            font: FONT_NAME,
            size: HEADING_SIZE_HALF_PT,
            bold: true,
            color: '0F172A',
          }),
        ],
      })
    );

    if (meta.key === 'bab4' && (!project.hasResearchData || hasBab4DataMarker(project.chapters.bab4))) {
      children.push(
        new Paragraph({
          spacing: { after: 200, line: 320 },
          shading: {
            type: ShadingType.CLEAR,
            color: 'auto',
            fill: 'FEF3C7',
          },
          children: [
            new TextRun({
              text: 'CATATAN KELENGKAPAN DATA BAB IV: ',
              font: FONT_NAME,
              size: 20,
              bold: true,
              color: '92400E',
            }),
            new TextRun({
              text: 'Data penelitian lapangan ditandai belum lengkap. Harap lengkapi bagian hasil dan pembahasan sebelum naskah dikumpulkan.',
              font: FONT_NAME,
              size: 20,
              color: '92400E',
            }),
          ],
        })
      );
    }

    const chapterContent = project.chapters[meta.key] || '';
    if (chapterContent.trim()) {
      children.push(...buildChapterParagraphs(chapterContent));
    } else {
      children.push(
        new Paragraph({
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: `[Belum ada isi untuk ${meta.roman}: ${meta.title}]`,
              font: FONT_NAME,
              size: BODY_SIZE_HALF_PT,
              italics: true,
              color: '64748B',
            }),
          ],
        })
      );
    }
  });

  // 3. Lampiran Tabel Instrumen Penelitian
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text: 'LAMPIRAN',
          font: FONT_NAME,
          size: HEADING_SIZE_HALF_PT,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: 'TABEL KISI-KISI & BUTIR INSTRUMEN PENELITIAN',
          font: FONT_NAME,
          size: SUBHEADING_SIZE_HALF_PT,
          bold: true,
          color: '0F172A',
        }),
      ],
    })
  );

  if (instruments.length > 0) {
    children.push(buildInstrumentTable(instruments));
  } else {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: '[Belum ada butir instrumen yang ditambahkan pada proyek ini.]',
            font: FONT_NAME,
            size: BODY_SIZE_HALF_PT,
            italics: true,
            color: '64748B',
          }),
        ],
      })
    );
  }

  // 4. Daftar Pustaka
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 320 },
      children: [
        new TextRun({
          text: 'DAFTAR PUSTAKA',
          font: FONT_NAME,
          size: HEADING_SIZE_HALF_PT,
          bold: true,
          color: '0F172A',
        }),
      ],
    })
  );

  if (sortedRefs.length > 0) {
    for (const ref of sortedRefs) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 720, hanging: 720 },
          spacing: { after: 160, line: 320 },
          children: [
            new TextRun({
              text: formatApaBibliography(ref),
              font: FONT_NAME,
              size: BODY_SIZE_HALF_PT,
              color: '111827',
            }),
          ],
        })
      );
    }
  } else {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: '[Belum ada referensi pustaka yang ditambahkan pada proyek ini.]',
            font: FONT_NAME,
            size: BODY_SIZE_HALF_PT,
            italics: true,
            color: '64748B',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    creator: project.authorName || 'RisetAI Academic Studio',
    title: project.title,
    description: `Naskah penelitian: ${project.title}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1700,
              right: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function buildDocxFileName(project: ResearchProject): string {
  const slug = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  const year = project.year.replace(/[^0-9]/g, '') || String(new Date().getFullYear());
  return `RisetAI_${slug || 'naskah'}_${year}.docx`;
}
