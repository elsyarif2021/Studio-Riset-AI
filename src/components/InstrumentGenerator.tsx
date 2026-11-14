import { useState } from 'react';
import { Pencil, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { INSTRUMENT_TYPES, MAX_LENGTHS } from '../lib/validation';
import { generateInstrumentsWithAi } from '../services/aiService';
import type {
  AiStatusResponse,
  InstrumentType,
  ProjectInstrument,
  ProjectReference,
  ResearchProject,
} from '../types/research';

interface InstrumentGeneratorProps {
  project: ResearchProject;
  references: ProjectReference[];
  instruments: ProjectInstrument[];
  aiStatus: AiStatusResponse | null;
  selectedModel: string;
  onAddBatch: (
    items: Array<{
      instrumentType: InstrumentType;
      code: string;
      variable: string;
      indicator: string;
      question: string;
      scaleOrNotes: string;
      orderIndex: number;
    }>
  ) => Promise<void>;
  onUpdate: (
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
  ) => Promise<void>;
  onDelete: (instId: string) => Promise<void>;
}

export function InstrumentGenerator({
  project,
  references,
  instruments,
  aiStatus,
  selectedModel,
  onAddBatch,
  onUpdate,
  onDelete,
}: InstrumentGeneratorProps) {
  const [instrumentType, setInstrumentType] = useState<InstrumentType>(
    project.methodology === 'Kualitatif' ? 'Pedoman Wawancara' : 'Kuesioner Skala Likert'
  );
  const [variables, setVariables] = useState('');
  const [itemCount, setItemCount] = useState(5);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    code: '',
    variable: '',
    indicator: '',
    question: '',
    scaleOrNotes: '',
  });
  const [manualSaving, setManualSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    instrumentType: 'Kuesioner Skala Likert' as InstrumentType,
    code: '',
    variable: '',
    indicator: '',
    question: '',
    scaleOrNotes: '',
    orderIndex: 0,
  });

  const handleAiGenerate = async () => {
    setAiError(null);
    setAiLoading(true);
    const verifiedOrProvided = references.filter((r) => r.verified);
    const res = await generateInstrumentsWithAi({
      title: project.title,
      methodology: project.methodology,
      researchQuestions: project.researchQuestions,
      variables: variables.trim(),
      instrumentType,
      itemCount,
      references: verifiedOrProvided.length > 0 ? verifiedOrProvided : references,
      modelOverride: selectedModel || undefined,
    });
    setAiLoading(false);

    if (!res.ok) {
      setAiError(res.message);
      return;
    }

    const baseIndex = instruments.length;
    await onAddBatch(
      res.items.map((item, idx) => ({
        instrumentType,
        code: item.code,
        variable: item.variable,
        indicator: item.indicator,
        question: item.question,
        scaleOrNotes: item.scaleOrNotes,
        orderIndex: baseIndex + idx + 1,
      }))
    );
  };

  const handleAddManualTemplate = async () => {
    const baseIndex = instruments.length;
    const prefix = instrumentType === 'Pedoman Wawancara' ? 'W' : instrumentType === 'Lembar Observasi' ? 'O' : 'Q';
    const scaleDefault =
      instrumentType === 'Kuesioner Skala Likert'
        ? 'Likert 1 (STS) - 5 (SS)'
        : instrumentType === 'Pedoman Wawancara'
          ? 'Pertanyaan Terbuka + Probing'
          : 'Checklist Ya / Tidak + Catatan';

    await onAddBatch([
      {
        instrumentType,
        code: `${prefix}${baseIndex + 1}`,
        variable: variables.trim() || 'Variabel / Aspek Utama',
        indicator: 'Indikator 1 (Sesuaikan)',
        question: 'Tuliskan butir pertanyaan atau pernyataan instrumen penelitian sesuai indikator di sini.',
        scaleOrNotes: scaleDefault,
        orderIndex: baseIndex + 1,
      },
      {
        instrumentType,
        code: `${prefix}${baseIndex + 2}`,
        variable: variables.trim() || 'Variabel / Aspek Utama',
        indicator: 'Indikator 2 (Sesuaikan)',
        question: 'Tuliskan butir lanjutan untuk menggali data sesuai rumusan masalah.',
        scaleOrNotes: scaleDefault,
        orderIndex: baseIndex + 2,
      },
    ]);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.question.trim()) return;
    setManualSaving(true);
    try {
      const nextIdx = instruments.length + 1;
      await onAddBatch([
        {
          instrumentType,
          code: manualForm.code.trim() || `B${nextIdx}`,
          variable: manualForm.variable.trim() || 'Variabel Utama',
          indicator: manualForm.indicator.trim() || 'Indikator Penelitian',
          question: manualForm.question.trim(),
          scaleOrNotes: manualForm.scaleOrNotes.trim() || instrumentType,
          orderIndex: nextIdx,
        },
      ]);
      setManualForm({ code: '', variable: '', indicator: '', question: '', scaleOrNotes: '' });
      setManualOpen(false);
    } finally {
      setManualSaving(false);
    }
  };

  const startEdit = (item: ProjectInstrument) => {
    setEditingId(item.id);
    setEditDraft({
      instrumentType: item.instrumentType,
      code: item.code,
      variable: item.variable,
      indicator: item.indicator,
      question: item.question,
      scaleOrNotes: item.scaleOrNotes,
      orderIndex: item.orderIndex,
    });
  };

  const saveEdit = async (instId: string) => {
    await onUpdate(instId, editDraft);
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Generator Controls */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Generator Kisi-Kisi &amp; Instrumen Penelitian
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Seluruh butir instrumen otomatis disusun sebagai tabel lampiran pada hasil ekspor Word (.docx).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="inst-type" className="block text-xs font-semibold text-slate-700">
              Jenis Instrumen
            </label>
            <select
              id="inst-type"
              value={instrumentType}
              onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {INSTRUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="inst-vars" className="block text-xs font-semibold text-slate-700">
              Variabel / Fokus Aspek
            </label>
            <input
              id="inst-vars"
              type="text"
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              placeholder="Mis. Kesiapan Guru, Dukungan Infrastruktur"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="inst-count" className="block text-xs font-semibold text-slate-700">
              Jumlah Butir (AI)
            </label>
            <input
              id="inst-count"
              type="number"
              min={2}
              max={15}
              value={itemCount}
              onChange={(e) => setItemCount(Number(e.target.value) || 5)}
              className="font-mono-tabular mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleAiGenerate}
            disabled={aiLoading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1E3A5F] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#162C49] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {aiLoading
                ? 'Menyusun Instrumen...'
                : aiStatus?.connected
                  ? 'Generate Butir dengan AI'
                  : 'Coba Generate dengan AI'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Butir Manual</span>
          </button>

          <button
            type="button"
            onClick={() => void handleAddManualTemplate()}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <span>Sisipkan 2 Contoh Kisi-Kisi</span>
          </button>
        </div>

        {aiError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-relaxed text-red-800"
          >
            {aiError}
          </div>
        )}

        {manualOpen && (
          <form
            onSubmit={handleManualSubmit}
            className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-900">Tambah Butir Manual</p>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <input
                type="text"
                maxLength={MAX_LENGTHS.instCode}
                value={manualForm.code}
                onChange={(e) => setManualForm({ ...manualForm, code: e.target.value })}
                placeholder={`Kode (mis. B${instruments.length + 1})`}
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
              <input
                type="text"
                maxLength={MAX_LENGTHS.instVariable}
                value={manualForm.variable}
                onChange={(e) => setManualForm({ ...manualForm, variable: e.target.value })}
                placeholder="Variabel / Aspek"
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
              <input
                type="text"
                maxLength={MAX_LENGTHS.instIndicator}
                value={manualForm.indicator}
                onChange={(e) => setManualForm({ ...manualForm, indicator: e.target.value })}
                placeholder="Indikator"
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
            </div>
            <textarea
              rows={2}
              required
              maxLength={MAX_LENGTHS.instQuestion}
              value={manualForm.question}
              onChange={(e) => setManualForm({ ...manualForm, question: e.target.value })}
              placeholder="Tuliskan butir pertanyaan atau pernyataan..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                maxLength={MAX_LENGTHS.instScaleOrNotes}
                value={manualForm.scaleOrNotes}
                onChange={(e) => setManualForm({ ...manualForm, scaleOrNotes: e.target.value })}
                placeholder="Skala / Keterangan (mis. Likert 1-5)"
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
              <button
                type="submit"
                disabled={manualSaving}
                className="min-h-[44px] rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-[#1E3A5F]"
              >
                {manualSaving ? 'Menyimpan...' : 'Simpan Butir'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Instrument Table (Desktop) & Cards (Mobile) */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Daftar Butir Instrumen (<span className="font-mono-tabular">{instruments.length}</span>)
          </h3>
        </div>

        {instruments.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-900">Belum ada butir instrumen</p>
            <p className="mt-1 text-xs text-slate-600">
              Gunakan AI untuk menyusun otomatis atau tambahkan butir instrumen secara manual.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="divide-y divide-slate-200 md:hidden">
              {instruments.map((item) => {
                const isEditing = editingId === item.id;
                if (isEditing) {
                  return (
                    <div key={item.id} className="space-y-2.5 bg-slate-50 p-4">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editDraft.code}
                          onChange={(e) => setEditDraft({ ...editDraft, code: e.target.value })}
                          placeholder="Kode"
                          className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
                        />
                        <input
                          value={editDraft.variable}
                          onChange={(e) => setEditDraft({ ...editDraft, variable: e.target.value })}
                          placeholder="Variabel"
                          className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs"
                        />
                      </div>
                      <input
                        value={editDraft.indicator}
                        onChange={(e) => setEditDraft({ ...editDraft, indicator: e.target.value })}
                        placeholder="Indikator"
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
                      />
                      <textarea
                        rows={3}
                        value={editDraft.question}
                        onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                      />
                      <input
                        value={editDraft.scaleOrNotes}
                        onChange={(e) => setEditDraft({ ...editDraft, scaleOrNotes: e.target.value })}
                        placeholder="Skala / Keterangan"
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-xs"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit(item.id)}
                          className="min-h-[40px] rounded-lg bg-[#1E3A5F] px-3 text-xs font-semibold text-white"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {item.code} · {item.variable}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          aria-label={`Sunting butir ${item.code}`}
                          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(item.id)}
                          aria-label={`Hapus butir ${item.code}`}
                          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-600">Indikator: {item.indicator}</p>
                    <p className="text-sm leading-relaxed text-slate-900">{item.question}</p>
                    <p className="text-xs text-slate-500">
                      {item.instrumentType} · {item.scaleOrNotes}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">Kode</th>
                    <th className="px-4 py-3 font-semibold">Variabel</th>
                    <th className="px-4 py-3 font-semibold">Indikator</th>
                    <th className="px-4 py-3 font-semibold">Butir Pertanyaan / Pernyataan</th>
                    <th className="px-4 py-3 font-semibold">Skala / Catatan</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {instruments.map((item) => {
                    const isEditing = editingId === item.id;
                    if (isEditing) {
                      return (
                        <tr key={item.id} className="bg-slate-50 align-top">
                          <td className="p-2.5">
                            <input
                              value={editDraft.code}
                              onChange={(e) => setEditDraft({ ...editDraft, code: e.target.value })}
                              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              value={editDraft.variable}
                              onChange={(e) => setEditDraft({ ...editDraft, variable: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              value={editDraft.indicator}
                              onChange={(e) => setEditDraft({ ...editDraft, indicator: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <textarea
                              rows={2}
                              value={editDraft.question}
                              onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              value={editDraft.scaleOrNotes}
                              onChange={(e) => setEditDraft({ ...editDraft, scaleOrNotes: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void saveEdit(item.id)}
                              aria-label="Simpan butir"
                              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-[#1E3A5F] px-2.5 text-xs font-semibold text-white"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              aria-label="Batal sunting"
                              className="ml-1 inline-flex min-h-[36px] items-center rounded-lg border border-slate-200 bg-white px-2 text-xs"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={item.id} className="align-top hover:bg-slate-50/70">
                        <td className="font-mono-tabular px-4 py-3 font-semibold text-slate-900">
                          {item.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{item.variable}</td>
                        <td className="px-4 py-3 text-slate-600">{item.indicator}</td>
                        <td className="px-4 py-3 leading-relaxed text-slate-900">{item.question}</td>
                        <td className="px-4 py-3 text-slate-600">{item.scaleOrNotes}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            aria-label={`Sunting ${item.code}`}
                            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDelete(item.id)}
                            aria-label={`Hapus ${item.code}`}
                            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
