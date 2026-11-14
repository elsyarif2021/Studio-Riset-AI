import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface OllamaTagModel {
  name?: string;
  model?: string;
}

interface OllamaChatResponse {
  message?: {
    role?: string;
    content?: string;
  };
  error?: string;
}

interface ReferencePromptItem {
  authors: string;
  year: string;
  title: string;
  source?: string;
  verified?: boolean;
}

const PRESET_CLOUD_MODELS = [
  'deepseek-v4.1-flash',
  'deepseek-v4.1-flash:1017',
  'kimi-k3.1-pro',
  'kimi-k3',
  'glm-5.3-flash',
  'glm-5.3',
  'minimax-m3.1-flash',
  'minimax-m3',
  'mimo-v2.6-flash',
  'mimo-v2.6-pro',
  'nemotron-3-ultra',
  'nemotron-3-super',
  'inkling-2-small',
  'muse-spark-open',
  'clef:27b',
  'beam',
  'gemma4:31b',
  'mistral-large-4',
];

function normalizeBaseUrl(rawUrl: string | undefined): string {
  const cleaned = (rawUrl || 'https://ollama.com/api')
    .replace(/["'\\]+/g, '')
    .trim()
    .replace(/\/+$/, '');
  if (!cleaned) return 'https://ollama.com/api';
  if (/^https?:\/\/ollama\.com(\/.*)?$/i.test(cleaned)) {
    return 'https://ollama.com/api';
  }
  return cleaned;
}

function normalizeModelName(rawModel: string, baseUrl: string): string {
  const m = rawModel.replace(/["'\\]+/g, '').trim();
  if (!m) return 'deepseek-v4.1-flash';
  // On Ollama Cloud HTTP API, model names do not take the local CLI ":cloud" / "-cloud" suffix
  if (baseUrl.includes('ollama.com')) {
    if (m.endsWith(':cloud')) return m.slice(0, -':cloud'.length);
    if (m.endsWith('-cloud')) return m.slice(0, -'-cloud'.length);
  }
  return m;
}

function getOllamaConfig() {
  const apiKey = (process.env.OLLAMA_API_KEY || '')
    .replace(/["'\\]+/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  const baseUrl = normalizeBaseUrl(process.env.OLLAMA_BASE_URL);
  const rawDefault = (process.env.OLLAMA_MODEL || 'deepseek-v4.1-flash').trim();
  const defaultModel = normalizeModelName(rawDefault, baseUrl);
  return { apiKey, baseUrl, defaultModel };
}

function stripJsonCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

function classifyOllamaError(statusCode: number, rawBody: string, model?: string): {
  status: 'auth_error' | 'model_error' | 'rate_limit' | 'unreachable';
  message: string;
} {
  if (statusCode === 401 || statusCode === 403) {
    return {
      status: 'auth_error',
      message:
        'Autentikasi Ollama Cloud ditolak (HTTP ' +
        statusCode +
        '). Periksa kembali OLLAMA_API_KEY pada secret deployment Anda.',
    };
  }
  if (statusCode === 404) {
    return {
      status: 'model_error',
      message:
        'Model Ollama Cloud "' +
        (model || 'default') +
        '" tidak ditemukan (HTTP 404). Pilih model lain yang tersedia pada panel status AI.',
    };
  }
  if (statusCode === 429) {
    return {
      status: 'rate_limit',
      message:
        'Batas permintaan Ollama Cloud tercapai (HTTP 429). Silakan tunggu beberapa saat lalu coba lagi.',
    };
  }
  return {
    status: 'unreachable',
    message:
      'Ollama Cloud mengembalikan kesalahan (HTTP ' +
      statusCode +
      '): ' +
      (rawBody.slice(0, 180) || 'Gangguan layanan sementara.'),
  };
}

function handleFetchException(err: unknown): {
  status: 'timeout' | 'unreachable';
  message: string;
} {
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return {
      status: 'timeout',
      message:
        'Koneksi ke Ollama Cloud melebihi batas waktu (timeout). Anda tetap dapat menulis, mengedit, menyimpan, dan mengekspor dokumen Word secara normal.',
    };
  }
  const detail = err instanceof Error ? err.message : String(err);
  return {
    status: 'unreachable',
    message:
      'Tidak dapat terhubung ke layanan Ollama Cloud (' +
      detail +
      '). Editor BAB I–V, referensi, instrumen, dan ekspor Word tetap aktif.',
  };
}

async function callOllamaChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: { modelOverride?: string; jsonFormat?: boolean } = {}
): Promise<{ ok: true; content: string; model: string } | { ok: false; httpStatus: number; errorCode: string; message: string }> {
  const { apiKey, baseUrl, defaultModel } = getOllamaConfig();
  if (!apiKey) {
    return {
      ok: false,
      httpStatus: 503,
      errorCode: 'unconfigured',
      message:
        'Kunci API Ollama Cloud (OLLAMA_API_KEY) belum diatur pada secret deployment. Layanan AI tidak aktif, tetapi seluruh editor, referensi, instrumen manual, dan ekspor DOCX tetap bekerja.',
    };
  }

  const targetModel = normalizeModelName(options.modelOverride || defaultModel, baseUrl);

  try {
    const payload: Record<string, unknown> = {
      model: targetModel,
      messages,
      stream: false,
    };
    if (options.jsonFormat) {
      payload.format = 'json';
    }

    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const classified = classifyOllamaError(response.status, errText, targetModel);
      return {
        ok: false,
        httpStatus: response.status >= 400 && response.status < 600 ? response.status : 502,
        errorCode: classified.status,
        message: classified.message,
      };
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data?.message?.content?.trim() || '';
    if (!content) {
      return {
        ok: false,
        httpStatus: 502,
        errorCode: 'empty_response',
        message: 'Ollama Cloud mengembalikan respons kosong. Silakan coba ulang atau ganti model.',
      };
    }

    return { ok: true, content, model: targetModel };
  } catch (err) {
    const info = handleFetchException(err);
    return {
      ok: false,
      httpStatus: info.status === 'timeout' ? 504 : 503,
      errorCode: info.status,
      message: info.message,
    };
  }
}

function formatReferencesForPrompt(refs: ReferencePromptItem[]): string {
  if (!Array.isArray(refs) || refs.length === 0) {
    return '(Belum ada referensi terverifikasi atau masukan pengguna. JANGAN mengarang referensi, nama penulis, atau tahun terbit.)';
  }
  return refs
    .slice(0, 40)
    .map((r, idx) => {
      const statusLabel = r.verified ? 'Terverifikasi' : 'Masukan Pengguna';
      return `${idx + 1}. ${r.authors} (${r.year}). "${r.title}". ${r.source || '-'} [${statusLabel}]`;
    })
    .join('\n');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'RisetAI Academic Studio' });
  });

  app.get('/api/ai/status', async (_req: Request, res: Response) => {
    const { apiKey, baseUrl, defaultModel } = getOllamaConfig();
    const checkedAt = new Date().toISOString();

    if (!apiKey) {
      res.json({
        configured: false,
        connected: false,
        status: 'unconfigured',
        provider: 'Ollama Cloud',
        baseUrl,
        model: defaultModel,
        availableModels: [],
        message:
          'OLLAMA_API_KEY belum diatur pada secret deployment. Editor BAB I–V, pengelola referensi, generator instrumen manual, dan ekspor Word tetap dapat digunakan sepenuhnya.',
        checkedAt,
      });
      return;
    }

    try {
      const tagsResponse = await fetch(`${baseUrl}/tags`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!tagsResponse.ok) {
        const errText = await tagsResponse.text().catch(() => '');
        if (tagsResponse.status === 404) {
          res.json({
            configured: true,
            connected: false,
            status: 'unreachable',
            provider: 'Ollama Cloud',
            baseUrl,
            model: defaultModel,
            availableModels: [],
            message: `Endpoint daftar model tidak ditemukan (HTTP 404) di ${baseUrl}/tags. Pastikan OLLAMA_BASE_URL diatur ke https://ollama.com/api.`,
            checkedAt,
          });
          return;
        }
        const classified = classifyOllamaError(tagsResponse.status, errText, defaultModel);
        res.json({
          configured: true,
          connected: false,
          status: classified.status,
          provider: 'Ollama Cloud',
          baseUrl,
          model: defaultModel,
          availableModels: [],
          message: classified.message,
          checkedAt,
        });
        return;
      }

      const json = (await tagsResponse.json()) as { models?: OllamaTagModel[] };
      const fetchedModels = Array.isArray(json.models)
        ? json.models
            .map((m) => (m.name || m.model || '').trim())
            .filter((name) => name.length > 0)
        : [];

      const availableModels = Array.from(new Set([...fetchedModels, ...PRESET_CLOUD_MODELS]));

      const envModel = process.env.OLLAMA_MODEL?.trim();
      const activeModel = envModel
        ? normalizeModelName(envModel, baseUrl)
        : availableModels.includes(defaultModel)
          ? defaultModel
          : availableModels[0] || defaultModel;

      res.json({
        configured: true,
        connected: true,
        status: 'connected',
        provider: 'Ollama Cloud',
        baseUrl,
        model: activeModel,
        availableModels,
        message: `Terhubung ke Ollama Cloud (${availableModels.length} model tersedia).`,
        checkedAt,
      });
    } catch (err) {
      const info = handleFetchException(err);
      res.json({
        configured: true,
        connected: false,
        status: info.status,
        provider: 'Ollama Cloud',
        baseUrl,
        model: defaultModel,
        availableModels: [],
        message: info.message,
        checkedAt,
      });
    }
  });

  app.post('/api/ai/formulate', async (req: Request, res: Response) => {
    const body = req.body as {
      topic?: string;
      studyProgram?: string;
      methodology?: string;
      contextNotes?: string;
      existingTitle?: string;
      references?: ReferencePromptItem[];
      modelOverride?: string;
    };

    const topic = (body.topic || body.existingTitle || '').trim();
    if (!topic) {
      res.status(400).json({
        ok: false,
        errorCode: 'validation_error',
        message: 'Masukkan topik, fenomena, atau ide awal penelitian terlebih dahulu.',
      });
      return;
    }

    const refsBlock = formatReferencesForPrompt(body.references || []);
    const systemPrompt = [
      'Anda adalah asisten metodologi penelitian akademik Indonesia (tingkat Skripsi/Tesis/Jurnal Sinta).',
      'Tugas Anda membantu peneliti merumuskan opsi judul penelitian, pertanyaan penelitian (rumusan masalah), dan tujuan penelitian berdasarkan masukan pengguna.',
      'Gunakan bahasa Indonesia akademik baku sesuai PUEBI/EYD V.',
      'ATURAN KETAT REFERENSI: Hanya rujuk pustaka dari daftar referensi yang diberikan pengguna di bawah ini. Jangan pernah mengarang nama penulis, tahun terbit, atau judul referensi baru.',
      'Keluarkan respons HANYA dalam format JSON valid dengan skema persis:',
      '{"titles":["judul 1","judul 2","judul 3"],"researchQuestions":["pertanyaan 1","pertanyaan 2","pertanyaan 3"],"researchObjectives":["tujuan 1","tujuan 2","tujuan 3"],"rationale":"penjelasan singkat penyelarasan metodologi"}',
    ].join('\n');

    const userPrompt = [
      `Topik / Masalah Awal: ${topic}`,
      `Program Studi / Bidang: ${body.studyProgram || 'Umum'}`,
      `Pendekatan Metodologi: ${body.methodology || 'Kualitatif'}`,
      body.existingTitle ? `Judul Sementara: ${body.existingTitle}` : '',
      body.contextNotes ? `Catatan / Konteks Tambahan: ${body.contextNotes}` : '',
      `\nDaftar Referensi Pengguna:\n${refsBlock}`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await callOllamaChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { modelOverride: body.modelOverride, jsonFormat: true }
    );

    if (!result.ok) {
      res.status(result.httpStatus).json({
        ok: false,
        errorCode: result.errorCode,
        message: result.message,
      });
      return;
    }

    try {
      const parsed = JSON.parse(stripJsonCodeFence(result.content)) as {
        titles?: string[];
        researchQuestions?: string[];
        researchObjectives?: string[];
        rationale?: string;
      };
      res.json({
        ok: true,
        model: result.model,
        data: {
          titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 5) : [],
          researchQuestions: Array.isArray(parsed.researchQuestions)
            ? parsed.researchQuestions.slice(0, 6)
            : [],
          researchObjectives: Array.isArray(parsed.researchObjectives)
            ? parsed.researchObjectives.slice(0, 6)
            : [],
          rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
        },
      });
    } catch {
      res.status(502).json({
        ok: false,
        errorCode: 'parse_error',
        message:
          'Respons AI tidak berformat JSON yang diharapkan. Silakan coba lagi atau susun rumusan masalah secara manual.',
      });
    }
  });

  app.post('/api/ai/instruments', async (req: Request, res: Response) => {
    const body = req.body as {
      title?: string;
      methodology?: string;
      researchQuestions?: string;
      variables?: string;
      instrumentType?: string;
      itemCount?: number;
      references?: ReferencePromptItem[];
      modelOverride?: string;
    };

    const title = (body.title || '').trim();
    const variables = (body.variables || '').trim();
    const researchQuestions = (body.researchQuestions || '').trim();

    if (!title && !variables && !researchQuestions) {
      res.status(400).json({
        ok: false,
        errorCode: 'validation_error',
        message: 'Lengkapi judul, pertanyaan penelitian, atau variabel/aspek untuk menyusun instrumen.',
      });
      return;
    }

    const itemCount = Math.min(Math.max(Number(body.itemCount) || 6, 2), 15);
    const instrumentType = body.instrumentType || 'Kuesioner Skala Likert';
    const refsBlock = formatReferencesForPrompt(body.references || []);

    const systemPrompt = [
      'Anda adalah perancang instrumen penelitian akademik Indonesia.',
      'Buat butir-butir instrumen penelitian yang operasional, jelas, tidak bias, dan selaras dengan rumusan masalah serta metodologi.',
      'Jangan mengarang kutipan teori di luar daftar referensi yang diberikan pengguna.',
      'Keluarkan respons HANYA dalam format JSON valid dengan skema persis:',
      '{"items":[{"code":"Q1","variable":"Nama Variabel/Aspek","indicator":"Indikator Spesifik","question":"Butir pertanyaan atau pernyataan lengkap","scaleOrNotes":"Skala Likert 1-5 / Pedoman probing"}]}',
    ].join('\n');

    const userPrompt = [
      `Judul Penelitian: ${title || '-'}`,
      `Metodologi: ${body.methodology || 'Kuantitatif'}`,
      `Jenis Instrumen: ${instrumentType}`,
      `Jumlah Butir Diminta: ${itemCount}`,
      `Variabel / Fokus Pengamatan: ${variables || 'Sesuaikan dengan judul dan rumusan masalah'}`,
      `Rumusan Masalah:\n${researchQuestions || '-'}`,
      `\nReferensi Pengguna:\n${refsBlock}`,
    ].join('\n');

    const result = await callOllamaChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { modelOverride: body.modelOverride, jsonFormat: true }
    );

    if (!result.ok) {
      res.status(result.httpStatus).json({
        ok: false,
        errorCode: result.errorCode,
        message: result.message,
      });
      return;
    }

    try {
      const parsed = JSON.parse(stripJsonCodeFence(result.content)) as {
        items?: Array<{
          code?: string;
          variable?: string;
          indicator?: string;
          question?: string;
          scaleOrNotes?: string;
        }>;
      };
      const items = Array.isArray(parsed.items)
        ? parsed.items
            .filter((item) => item && typeof item.question === 'string' && item.question.trim().length > 0)
            .slice(0, 15)
            .map((item, idx) => ({
              code: (item.code || `B${idx + 1}`).trim(),
              variable: (item.variable || variables || 'Variabel Utama').trim(),
              indicator: (item.indicator || 'Indikator Penelitian').trim(),
              question: item.question!.trim(),
              scaleOrNotes: (item.scaleOrNotes || instrumentType).trim(),
            }))
        : [];

      if (items.length === 0) {
        res.status(502).json({
          ok: false,
          errorCode: 'empty_items',
          message: 'Model tidak menghasilkan butir instrumen. Gunakan fitur tambah butir manual atau coba ulang.',
        });
        return;
      }

      res.json({ ok: true, model: result.model, items });
    } catch {
      res.status(502).json({
        ok: false,
        errorCode: 'parse_error',
        message: 'Format respons instrumen AI tidak valid. Anda tetap dapat menambahkan butir instrumen secara manual.',
      });
    }
  });

  app.post('/api/ai/assist-chapter', async (req: Request, res: Response) => {
    const body = req.body as {
      chapterKey?: string;
      chapterTitle?: string;
      title?: string;
      topic?: string;
      methodology?: string;
      researchQuestions?: string;
      researchObjectives?: string;
      currentContent?: string;
      instruction?: string;
      references?: ReferencePromptItem[];
      hasResearchData?: boolean;
      researchDataSummary?: string;
      modelOverride?: string;
    };

    const chapterKey = (body.chapterKey || 'bab1').trim();
    const refs = Array.isArray(body.references) ? body.references : [];
    const refsBlock = formatReferencesForPrompt(refs);

    const isBab4 = chapterKey === 'bab4';
    const hasData = Boolean(body.hasResearchData && body.researchDataSummary && body.researchDataSummary.trim().length > 0);

    const bab4Directive =
      isBab4 && !hasData
        ? [
            'PERHATIAN KHUSUS BAB IV (DATA PENELITIAN BELUM TERSEDIA):',
            '- Peneliti BELUM menyediakan data lapangan/empiris.',
            '- DILARANG KERAS mengarang angka responden, persentase, skor uji statistik, kutipan wawancara fiktif, atau hasil observasi palsu.',
            '- Wajib susun kerangka pembahasan BAB IV dengan menyisipkan penanda eksplisit di setiap bagian temuan menggunakan format persis:',
            '  [PENANDA DATA PENELITIAN BAB IV: Data hasil penelitian belum tersedia. Lengkapi data empiris, tabel/grafik, atau transkrip temuan lapangan di sini sebelum finalisasi.]',
          ].join('\n')
        : isBab4 && hasData
          ? `DATA PENELITIAN TERSEDIA DARI PENGGUNA (gunakan hanya data ini, jangan menambah angka fiktif):\n${body.researchDataSummary}`
          : '';

    const systemPrompt = [
      'Anda adalah asisten penulis naskah ilmiah berbahasa Indonesia baku untuk RisetAI Academic Studio.',
      'ATURAN INTEGRITAS AKADEMIK:',
      '1. Gunakan HANYA referensi yang tercantum pada Daftar Referensi Pengguna di bawah ini dalam format sitasi dalam teks (Penulis, Tahun).',
      '2. DILARANG mengarang nama penulis, tahun terbit, DOI, atau judul jurnal di luar daftar yang diberikan.',
      '3. Jika suatu bagian membutuhkan dukungan pustaka namun daftar referensi pengguna belum mencakup topik tersebut, tuliskan penanda: [PERLU REFERENSI TERVERIFIKASI: jelaskan sumber yang perlu dicari dan diverifikasi peneliti].',
      bab4Directive,
      'Hasilkan draf teks naskah yang rapi dengan sub-judul bernomor yang jelas (tanpa kode/tag JSON).',
    ]
      .filter(Boolean)
      .join('\n\n');

    const userPrompt = [
      `Bagian Target: ${body.chapterTitle || chapterKey.toUpperCase()}`,
      `Judul Penelitian: ${body.title || '-'}`,
      `Topik: ${body.topic || '-'}`,
      `Metodologi: ${body.methodology || '-'}`,
      `Rumusan Masalah:\n${body.researchQuestions || '-'}`,
      `Tujuan Penelitian:\n${body.researchObjectives || '-'}`,
      `\nDaftar Referensi Pengguna (Hanya gunakan daftar ini):\n${refsBlock}`,
      body.currentContent?.trim()
        ? `\nDraf Saat Ini (lanjutkan atau sempurnakan):\n${body.currentContent.slice(0, 6000)}`
        : '',
      body.instruction?.trim()
        ? `\nInstruksi Khusus Peneliti:\n${body.instruction.trim()}`
        : '\nSusun atau lengkapi draf akademik terstruktur untuk bab ini.',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await callOllamaChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { modelOverride: body.modelOverride, jsonFormat: false }
    );

    if (!result.ok) {
      res.status(result.httpStatus).json({
        ok: false,
        errorCode: result.errorCode,
        message: result.message,
      });
      return;
    }

    res.json({
      ok: true,
      model: result.model,
      content: result.content,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RisetAI Academic Studio berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal memulai server RisetAI:', err);
  process.exit(1);
});
