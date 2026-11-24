import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileText,
  MapPin,
  Megaphone,
} from 'lucide-react';
import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';
import {
  fetchPublicIbadahMinggu,
  fetchPublishedPosts,
  resolvePostFeaturedImage,
} from '../../lib/publicData';
import type { IbadahMinggu, PostRecord } from '../../types/cms';

export function PublicHomePage() {
  const { options, wijkList } = usePublicSite();
  usePageSeo({
    title: `${options.site_title} — Distrik VI Dairi`,
    description: options.site_tagline,
    siteTitle: options.site_title,
  });

  const [ibadahList, setIbadahList] = useState<IbadahMinggu[]>([]);
  const [wartaList, setWartaList] = useState<PostRecord[]>([]);
  const [beritaList, setBeritaList] = useState<PostRecord[]>([]);

  useEffect(() => {
    Promise.all([
      fetchPublicIbadahMinggu(3),
      fetchPublishedPosts('warta', 3),
      fetchPublishedPosts('post', 4),
    ]).then(([ibadah, warta, berita]) => {
      setIbadahList(ibadah);
      setWartaList(warta);
      setBeritaList(berita);
    });
  }, []);

  const primaryColor = options.theme_primary_color || '#1E3A5F';
  const accentColor = options.theme_accent_color || '#9A3412';
  const heroImage =
    options.theme_hero_image_url ||
    '/src/assets/images/church_hero_sanctuary_1795501235668.jpg';

  const pengumumanPosts = beritaList.filter((p) =>
    p.terms?.some((t) => t.slug === 'pengumuman')
  );

  return (
    <div>
      {/* Hero Section */}
      <section className="border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p
              className="text-xs uppercase tracking-widest font-semibold mb-3"
              style={{ color: accentColor }}
            >
              Distrik VI Dairi · Huria Kristen Batak Protestan
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#1C1917] leading-[1.15] tracking-tight mb-4 [text-wrap:balance]">
              Bertumbuh dalam Firman, Melayani dalam Kasih
            </h1>
            <p className="text-base text-stone-600 leading-relaxed max-w-xl mb-6">
              Selamat datang di portal resmi Gereja {options.site_title}. Temukan jadwal ibadah Minggu, jadwal PHD enam lingkungan, warta jemaat mingguan, serta berita pelayanan huria.
            </p>

            {/* Ayat Harian */}
            <div className="bg-[#F4EFE6] border border-stone-200 p-4 rounded-md mb-6">
              <div
                className="flex items-center gap-2 text-xs font-semibold mb-1.5"
                style={{ color: primaryColor }}
              >
                <BookOpen className="w-4 h-4" />
                <span>Ayat Renungan · {options.daily_verse.reference}</span>
              </div>
              <p className="font-display italic text-stone-800 text-base leading-relaxed">
                &ldquo;{options.daily_verse.text}&rdquo;
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/jadwal-ibadah"
                style={{ backgroundColor: primaryColor }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-md hover:opacity-95 transition-opacity whitespace-nowrap"
              >
                <span>Lihat Jadwal Ibadah</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/warta"
                className="inline-flex items-center px-5 py-2.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
              >
                Warta Jemaat Mingguan
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[280px] rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
              <img
                src={heroImage}
                alt={`Ruang Ibadah ${options.site_title}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pengumuman Penting (jika ada pos berkategori Pengumuman) */}
      {pengumumanPosts.length > 0 && (
        <section className="bg-[#F4EFE6] border-b border-stone-200 py-4">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-start sm:items-center gap-2.5">
              <Megaphone className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" style={{ color: accentColor }} />
              <div>
                <span className="font-semibold text-stone-900 mr-2">Pengumuman:</span>
                <Link
                  to={`/berita/${pengumumanPosts[0].slug}`}
                  className="text-stone-800 hover:underline font-medium"
                >
                  {pengumumanPosts[0].title}
                </Link>
              </div>
            </div>
            <Link
              to={`/berita/${pengumumanPosts[0].slug}`}
              className="text-xs font-semibold hover:underline shrink-0"
              style={{ color: primaryColor }}
            >
              Baca selengkapnya &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* Jadwal Ibadah Terdekat */}
      <section className="py-12 lg:py-16 border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 font-medium mb-1">
                Jadwal Pelayanan Terdekat
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                Ibadah Minggu &amp; Kategorial
              </h2>
            </div>
            <Link
              to="/jadwal-ibadah"
              className="text-sm font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              Lihat jadwal lengkap &amp; PHD Wijk &rarr;
            </Link>
          </div>

          {ibadahList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ibadahList.map((item) => (
                <div
                  key={item.id}
                  className="p-6 border border-stone-200 rounded-md bg-[#FBF9F5]"
                >
                  <div
                    className="flex items-center gap-2 text-xs font-semibold mb-2 tabular-nums"
                    style={{ color: accentColor }}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Intl.DateTimeFormat('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }).format(new Date(item.service_date))}{' '}
                      · {item.service_time.slice(0, 5)} WIB
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-1">
                    {item.title}
                  </h3>
                  {item.liturgical_week && (
                    <p className="text-xs font-medium text-stone-500 mb-2">
                      {item.liturgical_week}
                    </p>
                  )}
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {item.preacher ? `Pengkhotbah: ${item.preacher}. ` : ''}
                    {item.theme || 'Mari bersekutu memuji Tuhan bersama seluruh keluarga jemaat.'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 border border-stone-200 rounded-md bg-[#FBF9F5]">
                <div
                  className="flex items-center gap-2 text-xs font-semibold mb-2 tabular-nums"
                  style={{ color: accentColor }}
                >
                  <Clock className="w-4 h-4" />
                  <span>08.00 WIB</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-1">
                  Ibadah Minggu Pagi &amp; Sekolah Minggu
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Kebaktian umum pagi dan ibadah anak-anak Sekolah Minggu berlangsung setiap hari Minggu.
                </p>
              </div>
              <div className="p-6 border border-stone-200 rounded-md bg-[#FBF9F5]">
                <div
                  className="flex items-center gap-2 text-xs font-semibold mb-2 tabular-nums"
                  style={{ color: accentColor }}
                >
                  <Clock className="w-4 h-4" />
                  <span>10.30 WIB</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-1">
                  Ibadah Minggu Siang (Utama)
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Kebaktian utama disertai paduan suara huria dan koor enam lingkungan.
                </p>
              </div>
              <div className="p-6 border border-stone-200 rounded-md bg-[#FBF9F5]">
                <div
                  className="flex items-center gap-2 text-xs font-semibold mb-2"
                  style={{ color: accentColor }}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Tengah Minggu</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-1">
                  PHD Lingkungan (Wijk)
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Partangiangan di rumah keluarga jemaat pada 6 lingkungan dengan jadwal tuan rumah mingguan.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Warta Jemaat Terbaru & Berita Terbaru */}
      <section className="py-12 lg:py-16 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Warta Terbaru */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
                Warta Jemaat Terbaru
              </h2>
              <Link
                to="/warta"
                className="text-sm font-medium hover:underline"
                style={{ color: primaryColor }}
              >
                Arsip Warta &rarr;
              </Link>
            </div>
            {wartaList.length === 0 ? (
              <div className="p-6 bg-white border border-stone-200 rounded-md text-sm text-stone-600">
                Warta jemaat mingguan akan tampil di sini setelah diterbitkan melalui dasbor admin.
              </div>
            ) : (
              <div className="space-y-4">
                {wartaList.map((w) => {
                  const pdfUrl = (w.meta?.warta_pdf_url as string) || '';
                  return (
                    <div
                      key={w.id}
                      className="p-5 bg-white border border-stone-200 rounded-md"
                    >
                      <div className="flex items-center gap-2 text-xs text-stone-500 mb-1.5 tabular-nums">
                        <FileText className="w-3.5 h-3.5" />
                        <span>
                          {(w.meta?.warta_date as string) ||
                            new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'medium',
                            }).format(new Date(w.published_at || w.created_at))}
                        </span>
                      </div>
                      <Link
                        to={`/warta/${w.slug}`}
                        className="font-display text-lg font-semibold text-[#1C1917] hover:underline block mb-1.5"
                      >
                        {w.title}
                      </Link>
                      {w.excerpt && (
                        <p className="text-sm text-stone-600 line-clamp-2 mb-3">
                          {w.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <Link
                          to={`/warta/${w.slug}`}
                          className="hover:underline"
                          style={{ color: primaryColor }}
                        >
                          Baca Online
                        </Link>
                        {pdfUrl && (
                          <a
                            href={pdfUrl}
                            className="inline-flex items-center gap-1 hover:underline"
                            style={{ color: accentColor }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Unduh PDF</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Berita & Artikel Terbaru */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
                Berita &amp; Artikel Huria
              </h2>
              <Link
                to="/berita"
                className="text-sm font-medium hover:underline"
                style={{ color: primaryColor }}
              >
                Semua Berita &rarr;
              </Link>
            </div>
            {beritaList.length === 0 ? (
              <div className="p-6 bg-white border border-stone-200 rounded-md text-sm text-stone-600">
                Berita pelayanan dan renungan gereja akan tampil di sini setelah diterbitkan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {beritaList.map((post) => {
                  const thumb = resolvePostFeaturedImage(post);
                  return (
                    <article
                      key={post.id}
                      className="bg-white border border-stone-200 rounded-md overflow-hidden flex flex-col"
                    >
                      {thumb && (
                        <Link to={`/berita/${post.slug}`} className="block h-40 bg-stone-100">
                          <img
                            src={thumb}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-xs text-stone-500 mb-1 tabular-nums">
                          {new Intl.DateTimeFormat('id-ID', {
                            dateStyle: 'medium',
                          }).format(new Date(post.published_at || post.created_at))}
                        </p>
                        <Link
                          to={`/berita/${post.slug}`}
                          className="font-display text-base font-semibold text-[#1C1917] hover:underline mb-2"
                        >
                          {post.title}
                        </Link>
                        <p className="text-sm text-stone-600 line-clamp-2 flex-1">
                          {post.excerpt}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6 Lingkungan (Wijk) */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-widest text-stone-500 font-medium mb-1">
                Persekutuan Jemaat
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] mb-2">
                Enam Lingkungan (Wijk) Pelayanan
              </h2>
            </div>
            <Link
              to="/tentang-kami"
              className="text-sm font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              Profil lengkap &amp; pelayan &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {wijkList.map((wijk, index) => (
              <div
                key={wijk.id}
                className="p-5 bg-[#FBF9F5] border border-stone-200 rounded-md"
              >
                <p className="text-xs text-stone-500 tabular-nums mb-1">
                  0{index + 1}. Lingkungan
                </p>
                <h3
                  className="font-display text-xl font-semibold mb-1.5"
                  style={{ color: primaryColor }}
                >
                  Wijk {wijk.name}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {wijk.description}
                </p>
              </div>
            ))}
          </div>

          {/* Strip Kontak Singkat */}
          <div className="mt-10 p-6 border border-stone-200 rounded-md bg-[#FBF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
              <div>
                <p className="font-display text-lg font-semibold text-[#1C1917]">
                  Sekretariat {options.site_title}
                </p>
                <p className="text-sm text-stone-600">{options.church_address}</p>
              </div>
            </div>
            <Link
              to="/kontak"
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 text-sm font-medium text-white rounded-md whitespace-nowrap self-start sm:self-auto"
            >
              Peta &amp; Hubungi Kami
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
