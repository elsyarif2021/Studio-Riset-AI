import { useState } from 'react';
import { Check, Copy, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { formatApaBibliography, formatInTextCitation } from '../lib/citations';
import { MAX_LENGTHS, REFERENCE_TYPES } from '../lib/validation';
import type { ProjectReference, ReferenceType } from '../types/research';

interface ReferenceManagerProps {
  references: ProjectReference[];
  onAdd: (input: {
    type: ReferenceType;
    authors: string;
    year: string;
    title: string;
    source: string;
    volumeIssuePages: string;
    doiOrUrl: string;
    notes: string;
    verified: boolean;
  }) => Promise<void>;
  onUpdate: (
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
  ) => Promise<void>;
  onToggleVerified: (refId: string, verified: boolean) => Promise<void>;
  onDelete: (refId: string) => Promise<void>;
}

const EMPTY_FORM = {
  type: 'Jurnal' as ReferenceType,
  authors: '',
  year: String(new Date().getFullYear()),
  title: '',
  source: '',
  volumeIssuePages: '',
  doiOrUrl: '',
  notes: '',
  verified: true,
};

export function ReferenceManager({
  references,
  onAdd,
  onUpdate,
  onToggleVerified,
  onDelete,
}: ReferenceManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<'Semua' | 'Terverifikasi' | 'Belum'>('Semua');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (ref: ProjectReference) => {
    setEditingId(ref.id);
    setForm({
      type: ref.type,
      authors: ref.authors,
      year: ref.year,
      title: ref.title,
      source: ref.source,
      volumeIssuePages: ref.volumeIssuePages,
      doiOrUrl: ref.doiOrUrl,
      notes: ref.notes,
      verified: ref.verified,
    });
    setError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.authors.trim() || !form.title.trim()) {
      setError('Nama penulis dan judul referensi wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await onUpdate(editingId, form);
      } else {
        await onAdd(form);
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan referensi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCite = async (ref: ProjectReference) => {
    const text = formatInTextCitation(ref);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(ref.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback noop if clipboard restricted
    }
  };

  const filtered = references.filter((r) => {
    const matchesStatus =
      filterMode === 'Semua' ||
      (filterMode === 'Terverifikasi' && r.verified) ||
      (filterMode === 'Belum' && !r.verified);
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.authors.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.source.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const verifiedCount = references.filter((r) => r.verified).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Pengelolaan Referensi &amp; Daftar Pustaka
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            <span className="font-mono-tabular">{verifiedCount}</span> dari{' '}
            <span className="font-mono-tabular">{references.length}</span> referensi terverifikasi · AI hanya merujuk pustaka dari daftar ini.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-4 text-xs font-semibold text-white hover:bg-[#162C49]"
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">Tambah Referensi</span>
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-300 bg-white p-4 sm:p-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingId ? 'Sunting Referensi' : 'Tambah Referensi Baru'}
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Tutup form referensi"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="ref-type" className="block text-xs font-semibold text-slate-700">
                Jenis Pustaka
              </label>
              <select
                id="ref-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ReferenceType })}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {REFERENCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ref-authors" className="block text-xs font-semibold text-slate-700">
                Penulis <span className="text-red-600">*</span>
              </label>
              <input
                id="ref-authors"
                type="text"
                required
                maxLength={MAX_LENGTHS.refAuthors}
                value={form.authors}
                onChange={(e) => setForm({ ...form, authors: e.target.value })}
                placeholder="Mis. Sugiyono atau Sari, D., & Pratama, A."
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ref-year" className="block text-xs font-semibold text-slate-700">
                Tahun Terbit <span className="text-red-600">*</span>
              </label>
              <input
                id="ref-year"
                type="text"
                required
                maxLength={MAX_LENGTHS.refYear}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="font-mono-tabular mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ref-title" className="block text-xs font-semibold text-slate-700">
              Judul Artikel / Buku <span className="text-red-600">*</span>
            </label>
            <input
              id="ref-title"
              type="text"
              required
              maxLength={MAX_LENGTHS.refTitle}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Judul lengkap karya ilmiah"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="ref-source" className="block text-xs font-semibold text-slate-700">
                Nama Jurnal / Penerbit
              </label>
              <input
                id="ref-source"
                type="text"
                maxLength={MAX_LENGTHS.refSource}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Mis. Jurnal Pendidikan Indonesia / Alfabeta"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ref-vol" className="block text-xs font-semibold text-slate-700">
                Volume / Edisi / Halaman
              </label>
              <input
                id="ref-vol"
                type="text"
                maxLength={MAX_LENGTHS.refVolumeIssuePages}
                value={form.volumeIssuePages}
                onChange={(e) => setForm({ ...form, volumeIssuePages: e.target.value })}
                placeholder="Mis. Vol. 12(2), hal. 45-58"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ref-doi" className="block text-xs font-semibold text-slate-700">
                DOI atau URL
              </label>
              <input
                id="ref-doi"
                type="text"
                maxLength={MAX_LENGTHS.refDoiOrUrl}
                value={form.doiOrUrl}
                onChange={(e) => setForm({ ...form, doiOrUrl: e.target.value })}
                placeholder="https://doi.org/..."
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ref-notes" className="block text-xs font-semibold text-slate-700">
              Catatan Kutipan / Poin Relevan
            </label>
            <textarea
              id="ref-notes"
              rows={2}
              maxLength={MAX_LENGTHS.refNotes}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ringkasan temuan utama atau definisi penting dari sumber ini"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm({ ...form, verified: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-[#1E3A5F]"
            />
            <span className="text-xs font-medium text-slate-800">
              Saya sudah memverifikasi keaslian sumber referensi ini
            </span>
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] rounded-xl bg-[#1E3A5F] px-5 text-xs font-semibold text-white hover:bg-[#162C49] disabled:opacity-60"
            >
              {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Referensi'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari penulis, judul, atau jurnal..."
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(['Semua', 'Terverifikasi', 'Belum'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`min-h-[38px] rounded-lg px-3 text-xs font-medium transition-colors ${
                filterMode === mode
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {mode === 'Belum' ? 'Perlu Verifikasi' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Reference List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            {references.length === 0 ? 'Belum ada referensi tersimpan' : 'Tidak ada referensi yang cocok'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Tambahkan jurnal, buku, atau dokumen resmi agar dapat dikutip langsung di BAB I–V dan diekspor ke Daftar Pustaka Word.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {filtered.map((ref) => {
            const apa = formatApaBibliography(ref);
            const cite = formatInTextCitation(ref);
            const isConfirming = confirmDeleteId === ref.id;

            return (
              <article key={ref.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{ref.type}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{ref.year}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          ref.verified ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {ref.verified ? 'Terverifikasi' : 'Perlu verifikasi'}
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-sm font-semibold text-slate-900">{ref.title}</h3>
                    <p className="font-serif-academic mt-1 text-xs leading-relaxed text-slate-700">
                      {apa}
                    </p>
                    {ref.notes && (
                      <p className="mt-1.5 text-xs text-slate-500">Catatan: {ref.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleCopyCite(ref)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {copiedId === ref.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-700" />
                          <span>Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>{cite}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void onToggleVerified(ref.id, !ref.verified)}
                      aria-label={ref.verified ? 'Tandai belum diverifikasi' : 'Tandai terverifikasi'}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ShieldCheck
                        className={`h-3.5 w-3.5 ${ref.verified ? 'text-emerald-700' : 'text-slate-400'}`}
                      />
                      <span>{ref.verified ? 'Terverifikasi' : 'Verifikasi'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(ref)}
                      aria-label={`Sunting ${ref.title}`}
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[40px] rounded-lg border border-slate-200 px-2.5 text-xs text-slate-600"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void onDelete(ref.id);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[40px] rounded-lg bg-red-600 px-2.5 text-xs font-semibold text-white"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(ref.id)}
                        aria-label={`Hapus ${ref.title}`}
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
