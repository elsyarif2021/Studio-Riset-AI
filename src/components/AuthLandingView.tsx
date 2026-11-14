import { BookOpen, FileText, FolderLock, ListChecks, LogIn } from 'lucide-react';

interface AuthLandingViewProps {
  onSignIn: () => void;
  loading: boolean;
  errorMessage: string | null;
}

export function AuthLandingView({ onSignIn, loading, errorMessage }: AuthLandingViewProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          <span className="whitespace-nowrap text-base font-bold tracking-tight text-slate-900">
            RisetAI Academic Studio
          </span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#fitur" className="whitespace-nowrap hover:text-slate-900">
              Alur Penulisan
            </a>
            <a href="#keamanan" className="whitespace-nowrap hover:text-slate-900">
              Privasi Proyek
            </a>
            <a href="#ekspor" className="whitespace-nowrap hover:text-slate-900">
              Ekspor Word
            </a>
          </nav>
          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#1E3A5F] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#162C49] disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            <span>{loading ? 'Memproses...' : 'Masuk Google'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold tracking-wide text-[#1E3A5F]">
              Studio Riset &amp; Penulisan Ilmiah Berbahasa Indonesia
            </p>
            <h1 className="font-serif-academic mt-3 text-3xl font-bold leading-tight text-slate-900 [text-wrap:balance] sm:text-4xl lg:text-[42px]">
              Susun Naskah BAB I–V, Referensi Terverifikasi, dan Instrumen Penelitian dari HP maupun Desktop.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              Kelola seluruh proyek penelitian Anda dalam satu ruang kerja privat. Lanjutkan penulisan dari perangkat mana saja dengan akun Google yang sama, manfaatkan asistensi Ollama Cloud secara terukur, dan unduh langsung file Word (.docx) yang rapi.
            </p>

            {errorMessage && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {errorMessage}
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onSignIn}
                disabled={loading}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-[#1E3A5F] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#162C49] disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                <span>{loading ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google'}</span>
              </button>
              <span className="text-xs text-slate-500">
                Proyek tersimpan otomatis dan hanya dapat dibuka oleh akun pemilik.
              </span>
            </div>
          </div>

          <div
            id="fitur"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5"
          >
            <h2 className="text-base font-semibold text-slate-900">Komponen Studio Penelitian</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tetap bekerja penuh bahkan saat layanan AI sedang tidak tersedia.
            </p>

            <div className="mt-5 divide-y divide-slate-100">
              <div className="flex items-start gap-3.5 py-3.5 first:pt-0">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#1E3A5F]" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Editor Terstruktur BAB I–V</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Kerangka ilmiah lengkap dengan penanda otomatis pada BAB IV jika data penelitian lapangan belum tersedia.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 py-3.5">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#1E3A5F]" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Pengelola Referensi Terverifikasi</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Catat pustaka, tandai status verifikasi, salin sitasi dalam teks, dan susun daftar pustaka APA secara otomatis.
                  </p>
                </div>
              </div>

              <div id="ekspor" className="flex items-start gap-3.5 py-3.5">
                <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-[#1E3A5F]" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Generator Instrumen &amp; Ekspor DOCX</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Susun tabel kisi-kisi kuesioner/wawancara dan unduh file Word (.docx) lengkap dengan judul bab dan daftar pustaka.
                  </p>
                </div>
              </div>

              <div id="keamanan" className="flex items-start gap-3.5 py-3.5 last:pb-0">
                <FolderLock className="mt-0.5 h-5 w-5 shrink-0 text-[#1E3A5F]" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Akses Terkunci per Pemilik</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Setiap naskah, referensi, dan instrumen dibatasi hanya untuk akun Google pemilik proyek di database cloud.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
