import { useEffect, useState } from 'react';
import { Calendar, Clock, Home, User } from 'lucide-react';
import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';
import {
  fetchPublicIbadahMinggu,
  fetchPublicPhdLingkungan,
} from '../../lib/publicData';
import type { IbadahMinggu, PhdLingkungan } from '../../types/cms';

export function SchedulePublicPage() {
  const { options, wijkList } = usePublicSite();
  usePageSeo({
    title: 'Jadwal Ibadah & PHD Lingkungan',
    description: `Jadwal ibadah Minggu dan PHD enam lingkungan (Wijk) ${options.site_title}.`,
    siteTitle: options.site_title,
  });

  const [ibadahList, setIbadahList] = useState<IbadahMinggu[]>([]);
  const [phdList, setPhdList] = useState<PhdLingkungan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPublicIbadahMinggu(12), fetchPublicPhdLingkungan()]).then(
      ([ibadah, phd]) => {
        setIbadahList(ibadah);
        setPhdList(phd);
        setLoading(false);
      }
    );
  }, []);

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  return (
    <div className="bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10 sm:space-y-12">
        <header>
          <p
            className="text-xs uppercase tracking-[0.12em] font-semibold mb-2"
            style={{ color: accentColor }}
          >
            Pelayanan Kebaktian
          </p>
          <h1 className="heading-page font-display font-bold text-[#0f172a] mb-3">
            Jadwal Ibadah Minggu &amp; PHD Lingkungan
          </h1>
          <p className="text-[15px] sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Informasi lengkap jam kebaktian Minggu beserta petugas pelayan ibadah, serta jadwal tuan rumah Partangiangan (PHD) di enam lingkungan (Wijk).
          </p>
        </header>

        {/* Ibadah Minggu */}
        <section className="space-y-4">
          <h2 className="heading-section font-display font-bold text-[#0f172a]">
            Jadwal Ibadah Minggu
          </h2>
          {loading ? (
            <p className="text-[15px] text-slate-500">Memuat jadwal ibadah...</p>
          ) : ibadahList.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="surface-card p-5">
                <div
                  className="flex items-center gap-2 text-xs font-semibold mb-1.5 font-mono-num"
                  style={{ color: accentColor }}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Setiap Minggu &middot; 08.00 WIB</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#0f172a]">
                  Ibadah Minggu Pagi &amp; Sekolah Minggu
                </h3>
                <p className="text-[15px] text-slate-600 mt-1">
                  Gereja Induk {options.site_title}.
                </p>
              </div>
              <div className="surface-card p-5">
                <div
                  className="flex items-center gap-2 text-xs font-semibold mb-1.5 font-mono-num"
                  style={{ color: accentColor }}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Setiap Minggu &middot; 10.30 WIB</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#0f172a]">
                  Ibadah Minggu Siang (Utama)
                </h3>
                <p className="text-[15px] text-slate-600 mt-1">
                  Gereja Induk {options.site_title}.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Tampilan Kartu Bertumpuk untuk Ponsel (< 768px) */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {ibadahList.map((row) => (
                  <article key={row.id} className="surface-card p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <span className="font-mono-num text-sm font-semibold text-[#0f172a]">
                        {new Intl.DateTimeFormat('id-ID', {
                          dateStyle: 'medium',
                        }).format(new Date(row.service_date))}
                      </span>
                      <span
                        className="font-mono-num text-xs font-bold px-2 py-0.5 rounded bg-amber-50"
                        style={{ color: accentColor }}
                      >
                        {row.service_time.slice(0, 5)} WIB
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#0f172a]">
                        {row.title}
                      </h3>
                      {row.liturgical_week && (
                        <p className="text-xs text-slate-500 mt-0.5">{row.liturgical_week}</p>
                      )}
                    </div>
                    {(row.preacher || row.liturgist) && (
                      <div className="text-[15px] text-slate-700 space-y-0.5">
                        {row.preacher && <p>Khotbah: {row.preacher}</p>}
                        {row.liturgist && (
                          <p className="text-sm text-slate-500">Agenda: {row.liturgist}</p>
                        )}
                      </div>
                    )}
                    {(row.bible_reading || row.theme) && (
                      <div className="pt-2 border-t border-slate-100 text-sm text-slate-600">
                        {row.bible_reading && (
                          <p className="font-semibold text-slate-800">{row.bible_reading}</p>
                        )}
                        {row.theme && <p className="mt-0.5">{row.theme}</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {/* Tampilan Tabel untuk Tablet & Desktop (>= 768px) */}
              <div className="hidden md:block surface-card overflow-x-auto">
                <table className="w-full border-collapse text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-slate-50 text-left text-slate-700">
                      <th className="p-3.5 font-semibold">Tanggal &amp; Jam</th>
                      <th className="p-3.5 font-semibold">Kebaktian &amp; Minggu Liturgi</th>
                      <th className="p-3.5 font-semibold">Pengkhotbah &amp; Liturgis</th>
                      <th className="p-3.5 font-semibold">Nats / Tema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ibadahList.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono-num whitespace-nowrap">
                          <p className="font-semibold text-[#0f172a]">
                            {new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'medium',
                            }).format(new Date(row.service_date))}
                          </p>
                          <p className="text-xs font-semibold" style={{ color: accentColor }}>
                            {row.service_time.slice(0, 5)} WIB
                          </p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-[#0f172a]">{row.title}</p>
                          {row.liturgical_week && (
                            <p className="text-xs text-slate-500">{row.liturgical_week}</p>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-700">
                          {row.preacher && <p>Khotbah: {row.preacher}</p>}
                          {row.liturgist && (
                            <p className="text-xs text-slate-500">Agenda: {row.liturgist}</p>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {row.bible_reading && (
                            <p className="font-medium text-slate-800">{row.bible_reading}</p>
                          )}
                          {row.theme && <p className="text-xs">{row.theme}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* PHD 6 Lingkungan */}
        <section className="space-y-4">
          <div>
            <h2 className="heading-section font-display font-bold text-[#0f172a]">
              Jadwal PHD 6 Lingkungan (Wijk)
            </h2>
            <p className="text-[15px] text-slate-600 mt-1">
              Hari dan jam ibadah tetap setiap minggu; keluarga tuan rumah diperbarui mingguan oleh majelis gereja.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {wijkList.map((w) => {
              const phd = phdList.find((p) => p.wijk_id === w.id);
              return (
                <div key={w.id} className="surface-card p-5 space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3
                      className="font-display text-xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      Wijk {w.name}
                    </h3>
                    <span
                      className="text-xs font-semibold font-mono-num"
                      style={{ color: accentColor }}
                    >
                      {phd
                        ? `${phd.day_of_week}, ${phd.service_time.slice(0, 5)} WIB`
                        : 'Rabu, 19.00 WIB'}
                    </span>
                  </div>

                  {phd ? (
                    <div className="space-y-2 text-[15px] text-slate-700 pt-3 border-t border-slate-100">
                      <div className="flex items-start gap-2 min-w-0">
                        <Home className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                        <div className="min-w-0 break-words">
                          <p className="font-semibold text-[#0f172a]">
                            Tuan Rumah: {phd.host_family || 'Menunggu konfirmasi'}
                          </p>
                          {phd.host_address && (
                            <p className="text-sm text-slate-500 mt-0.5">{phd.host_address}</p>
                          )}
                        </div>
                      </div>
                      {phd.next_date && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-mono-num">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Tanggal:{' '}
                            {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                              new Date(phd.next_date)
                            )}
                          </span>
                        </div>
                      )}
                      {phd.leader_name && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span>Pembawa Renungan: {phd.leader_name}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[15px] text-slate-500 pt-3 border-t border-slate-100">
                      Jadwal tuan rumah minggu ini akan segera diperbarui oleh sekretariat huria.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
