import { Link } from 'react-router-dom';
import { ArrowRight, Cake, Users } from 'lucide-react';
import type { PublicJemaatStats } from '../types/cms';

interface PublicJemaatStatsSectionProps {
  stats: PublicJemaatStats;
  loading?: boolean;
  primaryColor: string;
  accentColor: string;
  subtitle?: string;
  title?: string;
  showCtaBar?: boolean;
  onOpenRequestForm?: () => void;
}

const BULAN_INDO = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatBirthdayLabel(birthDate: string): string {
  const parts = String(birthDate || '').split('-').map(Number);
  if (parts.length !== 3 || !parts[1] || !parts[2]) return birthDate;
  return `${parts[2]} ${BULAN_INDO[parts[1] - 1] || ''}`;
}

export function PublicJemaatStatsSection({
  stats,
  loading = false,
  primaryColor,
  accentColor,
  subtitle = 'Statistik Ruas Ni Huria (Aktif)',
  title = 'Skala Pelayanan Ressort',
  showCtaBar = true,
  onOpenRequestForm,
}: PublicJemaatStatsSectionProps) {
  const kategorialItems = [
    {
      label: 'Sekolah Minggu',
      sub: 'Usia 0–12 tahun',
      value: stats.kategorial.sekolah_minggu,
    },
    {
      label: 'Remaja / NHKBP',
      sub: 'Usia 13–25 tahun',
      value: stats.kategorial.remaja_nhkbp,
    },
    {
      label: 'Punguan Ama',
      sub: 'Ama / Kepala Keluarga',
      value: stats.kategorial.punguan_ama,
    },
    {
      label: 'Punguan Ina',
      sub: 'Ina / Istri',
      value: stats.kategorial.punguan_ina,
    },
    {
      label: 'Lansia',
      sub: 'Usia 60+ tahun',
      value: stats.kategorial.lansia,
    },
    {
      label: 'Sudah Sidi / Malua',
      sub: 'Tercatat tanggal sidi',
      value: stats.kategorial.sudah_sidi,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Baris 1: Ringkasan Total & Sebaran 6 Wijk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-4 min-w-0">
          <div className="surface-card p-5 sm:p-6 h-full flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold mb-1">
                {subtitle}
              </p>
              <h2 className="font-display heading-section font-bold text-[#0f172a] mb-2">
                {title}
              </h2>
              <p className="text-[15px] text-slate-600 leading-relaxed mb-5">
                Dihitung dari Database Induk Jemaat berstatus keanggotaan{' '}
                <strong className="text-[#0f172a]">Aktif</strong> di enam lingkungan pelayanan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Total Jiwa Aktif</div>
                <div
                  className="text-3xl sm:text-4xl font-bold font-mono-num"
                  style={{ color: primaryColor }}
                >
                  {loading ? '...' : stats.total_jiwa.toLocaleString('id-ID')}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Kepala Keluarga</div>
                <div
                  className="text-3xl sm:text-4xl font-bold font-mono-num"
                  style={{ color: accentColor }}
                >
                  {loading ? '...' : stats.total_kk.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 min-w-0">
          <div className="surface-card p-5 sm:p-6 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#0f172a]">
                Sebaran Jemaat di 6 Wijk / Lingkungan
              </h3>
              <span className="text-xs text-slate-600">
                Letare &middot; Exaudi &middot; Judika &middot; Galatia &middot; Efesus &middot; Jeremia
              </span>
            </div>

            <div className="space-y-3.5">
              {stats.per_wijk.map((w, idx) => (
                <div key={w.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-[#0f172a]">Wijk {w.name}</span>
                    <span className="font-mono-num text-slate-700 text-[13px] sm:text-sm">
                      <strong>{loading ? '...' : w.jiwa}</strong> jiwa &middot;{' '}
                      <strong>{loading ? '...' : w.kk}</strong> KK ({w.persentase}%)
                    </span>
                  </div>
                  <div className="progress-thin">
                    <div
                      className="progress-thin-bar"
                      style={{
                        width: `${Math.max(w.jiwa > 0 ? 4 : 0, Math.min(100, w.persentase))}%`,
                        backgroundColor: idx % 2 === 0 ? primaryColor : accentColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Baris 2: Demografi Kategorial HKBP & Ulang Tahun Minggu Ini */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 min-w-0">
          <div className="surface-card p-5 sm:p-6 h-full">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold mb-1">
              Pelayanan Kategorial
            </p>
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#0f172a] mb-4">
              Demografi Kategorial HKBP
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {kategorialItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3.5"
                >
                  <div
                    className="text-2xl font-bold font-mono-num mb-0.5"
                    style={{ color: primaryColor }}
                  >
                    {loading ? '...' : item.value.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm font-semibold text-[#0f172a] leading-snug">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 min-w-0">
          <div className="surface-card p-5 sm:p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold">
                  Persekutuan &amp; Doa Syukur
                </p>
                <Cake className="w-4 h-4 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#0f172a] mb-4">
                Ulang Tahun Jemaat Minggu Ini
              </h3>

              {loading ? (
                <p className="text-[15px] text-slate-600">Memuat daftar ulang tahun...</p>
              ) : stats.ulang_tahun_minggu_ini.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-[15px] text-slate-600 leading-relaxed">
                  Belum ada data ulang tahun jemaat dalam 7 hari ke depan.
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {stats.ulang_tahun_minggu_ini.slice(0, 6).map((b) => (
                    <li key={b.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[15px] text-[#0f172a] break-words">
                          {b.full_name}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Wijk {b.wijk_name} &middot; {formatBirthdayLabel(b.birth_date)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono-num text-xs">
                        <div className="font-semibold" style={{ color: accentColor }}>
                          {b.hari_lagi === 0 ? 'Hari Ini' : `${b.hari_lagi} hari lagi`}
                        </div>
                        <div className="text-slate-600">ke-{b.usia_baru} thn</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-3 mt-4 border-t border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span>
                Sudah Baptis:{' '}
                <strong className="font-mono-num text-[#0f172a]">
                  {stats.kategorial.sudah_baptis}
                </strong>{' '}
                &middot; Sudah Menikah:{' '}
                <strong className="font-mono-num text-[#0f172a]">
                  {stats.kategorial.sudah_menikah}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Ajukan Perubahan Data */}
      {showCtaBar && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-[#0f172a]">
              Ada Penambahan Anggota Keluarga atau Perbaikan Data Jemaat?
            </h3>
            <p className="text-[15px] text-slate-600 mt-0.5">
              Ajukan pembaruan data keluarga secara daring untuk diverifikasi oleh Sintua Wijk dan Sekretariat Huria.
            </p>
          </div>

          {onOpenRequestForm ? (
            <button
              type="button"
              onClick={onOpenRequestForm}
              style={{ backgroundColor: primaryColor }}
              className="btn-navy inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-[15px] rounded-lg whitespace-nowrap w-full sm:w-auto cursor-pointer"
            >
              <span>Ajukan Perubahan Data</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              to="/data-jemaat?tab=permohonan"
              style={{ backgroundColor: primaryColor }}
              className="btn-navy inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-[15px] rounded-lg whitespace-nowrap w-full sm:w-auto"
            >
              <span>Data Jemaat &amp; Ajukan Perubahan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
