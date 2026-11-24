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

  const primaryColor = options.theme_primary_color || '#1E3A5F';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <header>
        <p className="text-xs uppercase tracking-widest text-[#9A3412] font-semibold mb-2">
          Pelayanan Kebaktian
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mb-3">
          Jadwal Ibadah Minggu &amp; PHD Lingkungan
        </h1>
        <p className="text-sm text-stone-600 max-w-2xl">
          Informasi lengkap jam kebaktian Minggu beserta petugas pelayan ibadah, serta jadwal tuan rumah Partangiangan (PHD) di enam lingkungan (Wijk).
        </p>
      </header>

      {/* Ibadah Minggu */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
          Jadwal Ibadah Minggu
        </h2>
        {loading ? (
          <p className="text-sm text-stone-500">Memuat jadwal ibadah...</p>
        ) : ibadahList.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 bg-white border border-stone-200 rounded-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9A3412] mb-1 tabular-nums">
                <Clock className="w-4 h-4" />
                <span>Setiap Minggu · 08.00 WIB</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                Ibadah Minggu Pagi &amp; Sekolah Minggu
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Gereja Induk HKBP Ressort Hutaraja.
              </p>
            </div>
            <div className="p-5 bg-white border border-stone-200 rounded-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9A3412] mb-1 tabular-nums">
                <Clock className="w-4 h-4" />
                <span>Setiap Minggu · 10.30 WIB</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                Ibadah Minggu Siang (Utama)
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Gereja Induk HKBP Ressort Hutaraja.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-700">
                  <th className="p-3 font-semibold">Tanggal &amp; Jam</th>
                  <th className="p-3 font-semibold">Kebaktian &amp; Minggu Liturgi</th>
                  <th className="p-3 font-semibold">Pengkhotbah &amp; Liturgis</th>
                  <th className="p-3 font-semibold">Nats / Tema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ibadahList.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/70">
                    <td className="p-3 tabular-nums whitespace-nowrap">
                      <p className="font-semibold text-[#1C1917]">
                        {new Intl.DateTimeFormat('id-ID', {
                          dateStyle: 'medium',
                        }).format(new Date(row.service_date))}
                      </p>
                      <p className="text-xs text-[#9A3412]">
                        {row.service_time.slice(0, 5)} WIB
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-[#1C1917]">{row.title}</p>
                      {row.liturgical_week && (
                        <p className="text-xs text-stone-500">{row.liturgical_week}</p>
                      )}
                    </td>
                    <td className="p-3 text-stone-700">
                      {row.preacher && <p>Khotbah: {row.preacher}</p>}
                      {row.liturgist && (
                        <p className="text-xs text-stone-500">Agenda: {row.liturgist}</p>
                      )}
                    </td>
                    <td className="p-3 text-stone-600">
                      {row.bible_reading && (
                        <p className="font-medium text-stone-800">{row.bible_reading}</p>
                      )}
                      {row.theme && <p className="text-xs">{row.theme}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PHD 6 Lingkungan */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
            Jadwal PHD 6 Lingkungan (Wijk)
          </h2>
          <p className="text-sm text-stone-600">
            Hari dan jam ibadah tetap setiap minggu; keluarga tuan rumah diperbarui mingguan oleh majelis gereja.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {wijkList.map((w) => {
            const phd = phdList.find((p) => p.wijk_id === w.id);
            return (
              <div
                key={w.id}
                className="p-5 bg-white border border-stone-200 rounded-md space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className="font-display text-xl font-semibold"
                    style={{ color: primaryColor }}
                  >
                    Wijk {w.name}
                  </h3>
                  <span className="text-xs font-medium text-[#9A3412] tabular-nums">
                    {phd ? `${phd.day_of_week}, ${phd.service_time.slice(0, 5)} WIB` : 'Rabu, 19.00 WIB'}
                  </span>
                </div>

                {phd ? (
                  <div className="space-y-1.5 text-sm text-stone-700 pt-2 border-t border-stone-100">
                    <div className="flex items-start gap-2">
                      <Home className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-[#1C1917]">
                          Tuan Rumah: {phd.host_family || 'Menunggu konfirmasi'}
                        </p>
                        {phd.host_address && (
                          <p className="text-xs text-stone-500">{phd.host_address}</p>
                        )}
                      </div>
                    </div>
                    {phd.next_date && (
                      <div className="flex items-center gap-2 text-xs text-stone-500 tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          Tanggal:{' '}
                          {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                            new Date(phd.next_date)
                          )}
                        </span>
                      </div>
                    )}
                    {phd.leader_name && (
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <User className="w-3.5 h-3.5" />
                        <span>Pembawa Renungan: {phd.leader_name}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500 pt-2 border-t border-stone-100">
                    Jadwal tuan rumah minggu ini akan segera diperbarui oleh sekretariat huria.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
