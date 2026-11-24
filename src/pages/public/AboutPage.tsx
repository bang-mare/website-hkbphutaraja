import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';

const SERVANTS = [
  {
    role: 'Pendeta Ressort',
    name: 'Pdt. (Nama Pendeta Ressort)',
    desc: 'Pimpinan jemaat dan pelayanan sakramen serta penggembalaan di HKBP Ressort Hutaraja.',
  },
  {
    role: 'Guru Huria',
    name: 'Gr. (Nama Guru Huria)',
    desc: 'Membina katekisasi sidi, Sekolah Minggu, dan koordinasi pelayanan gerejawi.',
  },
  {
    role: 'Bibelvrouw',
    name: 'Bvr. (Nama Bibelvrouw)',
    desc: 'Pelayanan firman bagi kaum ibu, diakonia sosial, dan kunjungan pastoral keluarga.',
  },
  {
    role: 'Majelis Sintua',
    name: 'Dewan & Parhalado Ressort',
    desc: 'Melayani enam lingkungan (Wijk) bersama seluruh penatua dalam persekutuan, kesaksian, dan diakonia.',
  },
];

export function AboutPage() {
  const { options, wijkList } = usePublicSite();
  usePageSeo({
    title: 'Tentang Kami',
    description: `Sejarah huria, visi-misi, struktur pelayan, dan 6 lingkungan ${options.site_title}.`,
    siteTitle: options.site_title,
  });

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  return (
    <div className="bg-[#f8fafc]">
      {/* Header Banner */}
      <section
        className="hero-sacred py-10"
        style={
          primaryColor.toLowerCase() !== '#0f294a'
            ? {
                background: `linear-gradient(135deg, #0a1c34 0%, ${primaryColor} 58%, #1e3a8a 100%)`,
              }
            : undefined
        }
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.14em] text-[#fbbf24] font-semibold mb-2">
            Profil Gereja &middot; Distrik VI Dairi
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
            Tentang {options.site_title}
          </h1>
          <p className="text-sm sm:text-base text-white/75 leading-relaxed">
            Huria Kristen Batak Protestan (HKBP) Ressort Hutaraja adalah persekutuan orang-orang percaya di bawah naungan Distrik VI Dairi yang terpanggil untuk bersekutu (Koinonia), bersaksi (Marturia), dan melayani (Diakonia).
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Sejarah & Visi Misi */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-card p-6 sm:p-7 space-y-3">
            <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-500">
              Sejarah Huria
            </p>
            <h2 className="font-display text-2xl font-bold text-[#0f172a]">
              Sejarah Singkat Huria
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Sejak berdirinya persekutuan jemaat di Hutaraja, gereja terus bertumbuh melalui pelayanan firman, pendidikan iman, dan kebersamaan keluarga Batak Kristen di wilayah Dairi. Halaman ini dapat disesuaikan kapan saja oleh sekretariat melalui menu Halaman di Dasbor Admin.
            </p>
          </div>

          <div className="surface-card p-6 sm:p-7 space-y-3 bg-white">
            <p
              className="text-xs uppercase tracking-[0.08em] font-semibold"
              style={{ color: accentColor }}
            >
              Panggilan Pelayanan
            </p>
            <h2 className="font-display text-2xl font-bold text-[#0f172a]">
              Visi &amp; Misi Pelayanan
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Menjadi gereja yang inklusif, berakar kuat pada Firman Tuhan, serta menghadirkan damai sejahtera di tengah enam lingkungan (Wijk) dan masyarakat sekitar.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
              <li>Menyelenggarakan ibadah yang hidup dan membangun iman keluarga.</li>
              <li>Memperkuat persekutuan kategorial dan PHD Lingkungan setiap minggu.</li>
              <li>Menjalankan pelayanan kasih (diakonia) secara transparan dan akuntabel.</li>
            </ul>
          </div>
        </section>

        {/* Struktur Pelayan */}
        <section>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold mb-1">
              Fungsionaris &amp; Majelis
            </p>
            <h2 className="font-display text-2xl font-bold text-[#0f172a]">
              Struktur Pelayan Huria (Parhalado)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVANTS.map((srv) => (
              <div key={srv.role} className="surface-card p-5">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
                  style={{ color: accentColor }}
                >
                  {srv.role}
                </p>
                <h3 className="font-display text-lg font-bold text-[#0f172a] mb-2">
                  {srv.name}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{srv.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6 Lingkungan (Wijk) */}
        <section>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold mb-1">
              Wilayah Pelayanan
            </p>
            <h2 className="font-display text-2xl font-bold text-[#0f172a]">
              Enam Lingkungan (Wijk) {options.site_title}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {wijkList.map((w, idx) => (
              <div key={w.id} className="surface-card p-5 space-y-2">
                <p className="text-xs text-slate-500 font-mono-num">
                  0{idx + 1}. Lingkungan
                </p>
                <h3
                  className="font-display text-xl font-bold"
                  style={{ color: primaryColor }}
                >
                  Wijk {w.name}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{w.description}</p>
                {w.koordinator_name && (
                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Koordinator: <strong className="text-slate-800">{w.koordinator_name}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
