import type { ChapterKey, ChaptersMap, Methodology } from '../types/research';

export interface ChapterMeta {
  key: ChapterKey;
  roman: string;
  shortLabel: string;
  title: string;
  subtitle: string;
  guidance: string;
}

export const CHAPTER_METADATA: ChapterMeta[] = [
  {
    key: 'bab1',
    roman: 'BAB I',
    shortLabel: 'BAB I',
    title: 'PENDAHULUAN',
    subtitle: 'Latar belakang, rumusan masalah, tujuan, manfaat, dan ruang lingkup penelitian.',
    guidance:
      'Jelaskan kesenjangan fenomena/teori, fokus rumusan masalah, tujuan yang terukur, serta manfaat teoritis dan praktis.',
  },
  {
    key: 'bab2',
    roman: 'BAB II',
    shortLabel: 'BAB II',
    title: 'TINJAUAN PUSTAKA',
    subtitle: 'Landasan teori, penelitian terdahulu yang relevan, dan kerangka pemikiran.',
    guidance:
      'Gunakan hanya referensi yang telah Anda masukkan atau verifikasi pada tab Referensi.',
  },
  {
    key: 'bab3',
    roman: 'BAB III',
    shortLabel: 'BAB III',
    title: 'METODOLOGI PENELITIAN',
    subtitle: 'Desain, lokasi/subjek, instrumen pengumpulan data, dan teknik analisis data.',
    guidance:
      'Pastikan teknik pengumpulan data selaras dengan butir pada Generator Instrumen.',
  },
  {
    key: 'bab4',
    roman: 'BAB IV',
    shortLabel: 'BAB IV',
    title: 'HASIL DAN PEMBAHASAN',
    subtitle: 'Temuan empiris, pengolahan data penelitian, serta pembahasan berbasis teori.',
    guidance:
      'Jika data lapangan belum tersedia, gunakan penanda data agar bagian temuan tidak berisi angka fiktif.',
  },
  {
    key: 'bab5',
    roman: 'BAB V',
    shortLabel: 'BAB V',
    title: 'PENUTUP',
    subtitle: 'Kesimpulan yang menjawab rumusan masalah serta saran/implikasi penelitian.',
    guidance:
      'Kesimpulan harus langsung menjawab setiap poin pada Rumusan Masalah secara ringkas.',
  },
];

export const BAB4_DATA_MARKER =
  '[PENANDA DATA PENELITIAN BAB IV: Data hasil penelitian lapangan belum tersedia. Lengkapi tabel hasil, angka statistik, atau kutipan temuan empiris Anda di bagian ini sebelum finalisasi naskah.]';

export function buildDefaultChapters(params: {
  title: string;
  topic: string;
  methodology: Methodology;
  researchQuestions: string;
  researchObjectives: string;
  hasResearchData?: boolean;
}): ChaptersMap {
  const rqText = params.researchQuestions.trim() || '1. Bagaimana gambaran utama permasalahan penelitian?\n2. Faktor apa saja yang memengaruhi fenomena yang dikaji?';
  const roText = params.researchObjectives.trim() || '1. Mendeskripsikan kondisi empiris objek penelitian.\n2. Menganalisis faktor-faktor yang memengaruhi topik penelitian.';

  return {
    bab1: [
      '1.1 Latar Belakang Masalah',
      `Penelitian berjudul "${params.title}" berangkat dari kajian mengenai ${params.topic || 'fenomena utama yang diangkat dalam studi ini'}.`,
      '',
      '1.2 Rumusan Masalah',
      rqText,
      '',
      '1.3 Tujuan Penelitian',
      roText,
      '',
      '1.4 Manfaat Penelitian',
      'Penelitian ini diharapkan memberikan kontribusi teoritis bagi pengembangan kajian ilmiah serta manfaat praktis bagi pemangku kepentingan terkait.',
    ].join('\n'),
    bab2: [
      '2.1 Kajian Teori',
      'Uraikan konsep utama, definisi operasional, serta teori rujukan yang mendukung variabel atau fokus penelitian. Sisipkan sitasi dari referensi terverifikasi.',
      '',
      '2.2 Penelitian Terdahulu',
      'Ringkas hasil penelitian terdahulu yang relevan beserta persamaan dan perbedaannya dengan penelitian ini.',
      '',
      '2.3 Kerangka Pemikiran',
      'Jelaskan alur logis hubungan antar konsep atau variabel yang diteliti.',
    ].join('\n'),
    bab3: [
      '3.1 Jenis dan Pendekatan Penelitian',
      `Penelitian ini menggunakan pendekatan ${params.methodology} yang disesuaikan dengan tujuan penelitian.`,
      '',
      '3.2 Lokasi, Waktu, dan Subjek/Sampel Penelitian',
      'Tuliskan lokasi penelitian, periode pelaksanaan, serta populasi/sampel atau informan penelitian.',
      '',
      '3.3 Instrumen dan Teknik Pengumpulan Data',
      'Rincian kisi-kisi dan butir instrumen penelitian terlampir pada bagian Instrumen Penelitian.',
      '',
      '3.4 Teknik Analisis Data dan Uji Keabsahan',
      'Jelaskan tahapan pengolahan data, reduksi/uji statistik, serta prosedur validasi keabsahan temuan.',
    ].join('\n'),
    bab4: [
      '4.1 Gambaran Umum Objek Penelitian',
      'Deskripsikan profil singkat lokasi, partisipan, atau karakteristik responden penelitian.',
      '',
      '4.2 Hasil Penelitian',
      params.hasResearchData
        ? 'Sajikan hasil pengumpulan data lapangan sesuai instrumen penelitian.'
        : BAB4_DATA_MARKER,
      '',
      '4.3 Pembahasan',
      params.hasResearchData
        ? 'Bandingkan temuan penelitian dengan kajian teori dan penelitian terdahulu pada BAB II.'
        : `${BAB4_DATA_MARKER}\n\n[PENANDA PEMBAHASAN BAB IV: Interpretasi dan dialog antara temuan data dengan pustaka pada BAB II disusun setelah data penelitian dilengkapi.]`,
    ].join('\n'),
    bab5: [
      '5.1 Kesimpulan',
      'Simpulkan temuan utama yang secara langsung menjawab seluruh rumusan masalah pada BAB I.',
      '',
      '5.2 Saran dan Implikasi',
      'Berikan rekomendasi praktis bagi pihak terkait serta saran metodologis untuk penelitian lanjutan.',
    ].join('\n'),
  };
}

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function countTotalWords(chapters: ChaptersMap): number {
  return (
    countWords(chapters.bab1) +
    countWords(chapters.bab2) +
    countWords(chapters.bab3) +
    countWords(chapters.bab4) +
    countWords(chapters.bab5)
  );
}

export function hasBab4DataMarker(bab4Content: string): boolean {
  return (
    bab4Content.includes('[PENANDA DATA') ||
    bab4Content.includes('[PENANDA PEMBAHASAN') ||
    bab4Content.includes('[PERLU DATA')
  );
}
