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

  const primaryColor = options.theme_primary_color || '#1E3A5F';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-[#9A3412] font-semibold mb-2">
          Profil Gereja · Distrik VI Dairi
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mb-4">
          Tentang {options.site_title}
        </h1>
        <p className="text-base text-stone-600 leading-relaxed">
          Huria Kristen Batak Protestan (HKBP) Ressort Hutaraja adalah persekutuan orang-orang percaya di bawah naungan Distrik VI Dairi yang terpanggil untuk bersekutu (Koinonia), bersaksi (Marturia), dan melayani (Diakonia).
        </p>
      </header>

      {/* Sejarah & Visi Misi */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-white border border-stone-200 rounded-md space-y-3">
          <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
            Sejarah Singkat Huria
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Sejak berdirinya persekutuan jemaat di Hutaraja, gereja terus bertumbuh melalui pelayanan firman, pendidikan iman, dan kebersamaan keluarga Batak Kristen di wilayah Dairi. Halaman ini dapat disesuaikan kapan saja oleh sekretariat melalui menu Halaman di Dasbor Admin.
          </p>
        </div>

        <div className="p-6 bg-[#F4EFE6] border border-stone-200 rounded-md space-y-3">
          <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
            Visi &amp; Misi Pelayanan
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Menjadi gereja yang inklusif, berakar kuat pada Firman Tuhan, serta menghadirkan damai sejahtera di tengah enam lingkungan (Wijk) dan masyarakat sekitar.
          </p>
          <ul className="list-disc pl-5 text-sm text-stone-700 space-y-1">
            <li>Menyelenggarakan ibadah yang hidup dan membangun iman keluarga.</li>
            <li>Memperkuat persekutuan kategorial dan PHD Lingkungan setiap minggu.</li>
            <li>Menjalankan pelayanan kasih (diakonia) secara transparan dan akuntabel.</li>
          </ul>
        </div>
      </section>

      {/* Struktur Pelayan */}
      <section>
        <h2 className="font-display text-2xl font-semibold text-[#1C1917] mb-5">
          Struktur Pelayan Huria (Parhalado)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVANTS.map((srv) => (
            <div key={srv.role} className="p-5 bg-white border border-stone-200 rounded-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9A3412] mb-1">
                {srv.role}
              </p>
              <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-2">
                {srv.name}
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">{srv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6 Lingkungan (Wijk) */}
      <section>
        <h2 className="font-display text-2xl font-semibold text-[#1C1917] mb-5">
          Enam Lingkungan (Wijk) HKBP Ressort Hutaraja
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {wijkList.map((w, idx) => (
            <div key={w.id} className="p-5 bg-white border border-stone-200 rounded-md">
              <p className="text-xs text-stone-500 tabular-nums mb-1">
                0{idx + 1}. Lingkungan
              </p>
              <h3
                className="font-display text-xl font-semibold mb-1.5"
                style={{ color: primaryColor }}
              >
                Wijk {w.name}
              </h3>
              <p className="text-sm text-stone-600 mb-3">{w.description}</p>
              {w.koordinator_name && (
                <p className="text-xs text-stone-500">
                  Koordinator: <strong className="text-stone-800">{w.koordinator_name}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
