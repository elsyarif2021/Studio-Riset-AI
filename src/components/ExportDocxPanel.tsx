import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText } from 'lucide-react';
import { CHAPTER_METADATA, countWords, hasBab4DataMarker } from '../lib/chapters';
import { buildDocxFileName, buildResearchDocxBlob } from '../lib/docxExport';
import type { ProjectInstrument, ProjectReference, ResearchProject } from '../types/research';

interface ExportDocxPanelProps {
  project: ResearchProject;
  references: ProjectReference[];
  instruments: ProjectInstrument[];
}

export function ExportDocxPanel({ project, references, instruments }: ExportDocxPanelProps) {
  const [onlyVerifiedRefs, setOnlyVerifiedRefs] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedFile, setExportedFile] = useState<string | null>(null);

  const verifiedCount = references.filter((r) => r.verified).length;
  const bab4NeedsData = !project.hasResearchData || hasBab4DataMarker(project.chapters.bab4 || '');

  const handleDownload = async () => {
    setExportError(null);
    setExportedFile(null);
    setExporting(true);
    try {
      const blob = await buildResearchDocxBlob({
        project,
        references,
        instruments,
        onlyVerifiedRefs,
      });
      const fileName = buildDocxFileName(project);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setExportedFile(fileName);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal membuat file Word (.docx).');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Ekspor Naskah Lengkap ke Microsoft Word (.docx)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Menghasilkan dokumen Word terformat Times New Roman 12pt (spasi 1,5) dengan Halaman Judul, BAB I–V, Tabel Instrumen Penelitian, dan Daftar Pustaka APA yang tersusun rapi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={exporting}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#162C49] disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span className="whitespace-nowrap">
              {exporting ? 'Menyusun DOCX...' : 'Unduh Word (.docx)'}
            </span>
          </button>
        </div>

        <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-3 border-t border-slate-100 pt-4">
          <input
            type="checkbox"
            checked={onlyVerifiedRefs}
            onChange={(e) => setOnlyVerifiedRefs(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#1E3A5F]"
          />
          <span className="text-xs font-medium text-slate-800">
            Sertakan hanya referensi yang sudah ditandai Terverifikasi ({verifiedCount} pustaka)
          </span>
        </label>

        {exportedFile && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Dokumen {exportedFile} berhasil dibuat dan diunduh.</span>
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
          >
            {exportError}
          </div>
        )}
      </section>

      {bab4NeedsData && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h3 className="text-xs font-semibold text-amber-900">
              Catatan Kelengkapan BAB IV
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
              BAB IV masih menandakan data penelitian lapangan belum lengkap. File Word yang diunduh tetap akan menyertakan kotak penanda yang jelas pada BAB IV agar mudah dilengkapi di Microsoft Word atau di editor ini.
            </p>
          </div>
        </section>
      )}

      {/* Structure Checklist */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">Ringkasan Struktur Dokumen</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {CHAPTER_METADATA.map((meta) => {
            const wc = countWords(project.chapters[meta.key] || '');
            return (
              <div key={meta.key} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {meta.roman}: {meta.title}
                    </p>
                    <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
                  </div>
                </div>
                <span className="font-mono-tabular shrink-0 text-xs font-medium text-slate-700">
                  {wc} kata
                </span>
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Lampiran: Tabel Kisi-Kisi &amp; Butir Instrumen
              </p>
              <p className="text-[11px] text-slate-500">
                Diekspor sebagai tabel Word berbingkai dengan header terstruktur.
              </p>
            </div>
            <span className="font-mono-tabular shrink-0 text-xs font-medium text-slate-700">
              {instruments.length} butir
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">Daftar Pustaka (Urut Alfabetis)</p>
              <p className="text-[11px] text-slate-500">
                Format APA 7th dengan indentasi menggantung (hanging indent).
              </p>
            </div>
            <span className="font-mono-tabular shrink-0 text-xs font-medium text-slate-700">
              {onlyVerifiedRefs ? verifiedCount : references.length} pustaka
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
