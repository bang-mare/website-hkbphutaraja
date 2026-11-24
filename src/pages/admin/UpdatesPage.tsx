import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function UpdatesPage() {
  const { isSupabaseReady } = useAuth();

  const stages = [
    {
      stage: 'Tahap 1',
      title: 'Struktur Proyek, Skema SQL + RLS, Autentikasi & Layout wp-admin',
      done: true,
    },
    {
      stage: 'Tahap 2',
      title: 'Pos, Halaman, Kategori, Tag, Editor Blok Gutenberg, Status & Revisi',
      done: true,
    },
    {
      stage: 'Tahap 3',
      title: 'Integrasi Google Drive (Service Account) & Pustaka Media',
      done: false,
    },
    {
      stage: 'Tahap 4',
      title: 'Website Publik Penuh, Menu Builder, Widget & Pengaturan',
      done: false,
    },
    {
      stage: 'Tahap 5',
      title: 'Modul Gereja (Jemaat, Jadwal Ibadah, PHD, Kehadiran, Keuangan) & Peran',
      done: false,
    },
    {
      stage: 'Tahap 6',
      title: 'Panduan Deploy GitHub → Vercel, Setup Supabase & Google Drive',
      done: false,
    },
  ];

  return (
    <div className="pt-4">
      <h1 className="text-[23px] font-normal text-[#1d2327] mb-4">Pembaruan CMS</h1>

      <div className="bg-white border border-[#c3c4c7] p-5 shadow-[0_1px_1px_rgba(0,0,0,0.04)] mb-5 text-[13px]">
        <h2 className="text-[16px] font-semibold text-[#1d2327] mb-3">
          Status Koneksi &amp; Layanan
        </h2>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            {isSupabaseReady ? (
              <CheckCircle2 className="w-4 h-4 text-[#00a32a]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#dba617]" />
            )}
            <span>
              <strong>Supabase Auth &amp; PostgreSQL:</strong>{' '}
              {isSupabaseReady
                ? 'Terhubung melalui environment variable.'
                : 'Belum dikonfigurasi (isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY).'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#787c82]" />
            <span>
              <strong>Google Drive API Proxy:</strong> Dijadwalkan aktif penuh pada Tahap 3.
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#c3c4c7] p-5 shadow-[0_1px_1px_rgba(0,0,0,0.04)] text-[13px]">
        <h2 className="text-[16px] font-semibold text-[#1d2327] mb-3">
          Tahapan Pengembangan HKBP Ressort Hutaraja CMS
        </h2>
        <ul className="divide-y divide-[#f0f0f1]">
          {stages.map((s) => (
            <li key={s.stage} className="py-2.5 flex items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-[#1d2327] mr-2">{s.stage}:</span>
                <span className="text-[#3c434a]">{s.title}</span>
              </div>
              <span
                className={`text-[12px] font-medium shrink-0 ${
                  s.done ? 'text-[#00a32a]' : 'text-[#50575e]'
                }`}
              >
                {s.done ? 'Selesai' : 'Menunggu'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
