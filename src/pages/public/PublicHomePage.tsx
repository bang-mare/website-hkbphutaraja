import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileText,
  Images,
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
import { PostThumbnail } from '../../components/PostThumbnail';
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
  const [heroImgError, setHeroImgError] = useState(false);

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

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';
  const heroImage =
    options.theme_hero_image_url ||
    '/src/assets/images/church_hero_sanctuary_1795501235668.jpg';

  const pengumumanPosts = beritaList.filter((p) =>
    p.terms?.some((t) => t.slug === 'pengumuman')
  );
  const nextService = ibadahList[0];

  return (
    <div className="bg-[#f8fafc]">
      {/* Hero Section (Sacred Navy Gradient, Gold Rule & Schedule Card) */}
      <section
        className="hero-sacred py-12 lg:py-16"
        style={
          primaryColor.toLowerCase() !== '#0f294a'
            ? {
                background: `linear-gradient(135deg, #0a1c34 0%, ${primaryColor} 58%, #1e3a8a 100%)`,
              }
            : undefined
        }
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Kolom Kiri: Identitas, Visi & Ayat Renungan */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.14em] font-semibold text-[#fbbf24] mb-2">
              Distrik VI Dairi &middot; Huria Kristen Batak Protestan
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight mb-3 [text-wrap:balance]">
              {options.site_title}
            </h1>
            <p className="text-[15px] text-white/75 leading-relaxed max-w-2xl mb-4">
              Melayani persekutuan (Koinonia), kesaksian (Marturia), dan pelayanan kasih (Diakonia) bagi seluruh ruas ni huria yang tersebar di enam lingkungan (Wijk) pelayanan.
            </p>
            <div
              className="w-16 h-[2px] mb-5"
              style={{ backgroundColor: accentColor === '#d97706' ? '#f59e0b' : accentColor }}
            />

            {/* Ayat Renungan Glass Card */}
            <div className="rounded-xl p-4 sm:p-5 bg-white/[0.08] border border-white/[0.16] mb-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.1em] font-semibold text-[#fbbf24] mb-1.5">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Ayat Renungan &middot; {options.daily_verse.reference}</span>
              </div>
              <p className="font-display italic text-white text-lg leading-relaxed">
                &ldquo;{options.daily_verse.text}&rdquo;
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/jadwal-ibadah"
                style={{
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                }}
                className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg whitespace-nowrap"
              >
                <span>Lihat Jadwal Ibadah</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/warta"
                className="inline-flex items-center px-5 py-2.5 border border-white/40 text-white hover:bg-white/10 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Warta Jemaat Mingguan
              </Link>
            </div>
          </div>

          {/* Kolom Kanan: Kartu Ibadah Minggu Terdekat & Foto Gereja */}
          <div className="lg:col-span-5">
            <div className="bg-white text-[#0f172a] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
              {!heroImgError && heroImage && (
                <div className="aspect-[16/9] rounded-lg overflow-hidden border border-[#e2e8f0] bg-slate-100">
                  <img
                    src={heroImage}
                    alt={`Ruang Ibadah ${options.site_title}`}
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1.5">
                  Ibadah Minggu Terdekat
                </p>

                {nextService ? (
                  <div className="space-y-1.5">
                    <div
                      className="flex items-center gap-2 text-xs font-semibold font-mono-num"
                      style={{ color: accentColor }}
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {new Intl.DateTimeFormat('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }).format(new Date(nextService.service_date))}{' '}
                        &middot; {nextService.service_time.slice(0, 5)} WIB
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-[#0f172a]">
                      {nextService.title}
                    </h2>
                    {nextService.liturgical_week && (
                      <p className="text-xs font-medium text-slate-500">
                        {nextService.liturgical_week}
                      </p>
                    )}
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {nextService.preacher ? `Pengkhotbah: ${nextService.preacher}. ` : ''}
                      {nextService.theme ||
                        'Mari bersekutu memuji Tuhan bersama seluruh keluarga jemaat.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <p className="font-semibold text-sm text-[#0f172a]">
                          Ibadah Pagi &amp; Sekolah Minggu
                        </p>
                        <p className="text-xs text-slate-500">Setiap Hari Minggu</p>
                      </div>
                      <span
                        className="font-mono-num text-xs font-semibold"
                        style={{ color: accentColor }}
                      >
                        08.00 WIB
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="font-semibold text-sm text-[#0f172a]">
                          Ibadah Minggu Siang (Utama)
                        </p>
                        <p className="text-xs text-slate-500">Gereja Induk Hutaraja</p>
                      </div>
                      <span
                        className="font-mono-num text-xs font-semibold"
                        style={{ color: accentColor }}
                      >
                        10.30 WIB
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Jadwal lengkap &amp; petugas</span>
                <Link
                  to="/jadwal-ibadah"
                  className="font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  Buka Jadwal &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Akses Cepat (Quick Link Cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/warta" className="quick-link-card p-4 block">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-9 h-9 rounded-lg bg-[#eff6ff] text-[#0f294a] inline-flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <span className="font-bold text-sm text-[#0f172a]">Warta Jemaat</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Baca Tingting mingguan secara daring &amp; unduh PDF resmi huria.
            </p>
          </Link>

          <Link to="/jadwal-ibadah" className="quick-link-card p-4 block">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-9 h-9 rounded-lg bg-[#fef3c7] text-[#b45309] inline-flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </span>
              <span className="font-bold text-sm text-[#0f172a]">Jadwal Ibadah &amp; PHD</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kebaktian Minggu dan tuan rumah partangiangan enam lingkungan.
            </p>
          </Link>

          <Link to="/galeri" className="quick-link-card p-4 block">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-9 h-9 rounded-lg bg-[#f5f3ff] text-[#6d28d9] inline-flex items-center justify-center shrink-0">
                <Images className="w-5 h-5" />
              </span>
              <span className="font-bold text-sm text-[#0f172a]">Galeri &amp; Berita Huria</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dokumentasi kegiatan persekutuan, katekisasi, dan berita pelayanan.
            </p>
          </Link>
        </div>
      </section>

      {/* Pengumuman Penting (jika ada pos berkategori Pengumuman) */}
      {pengumumanPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-start sm:items-center gap-2.5">
              <Megaphone className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" style={{ color: accentColor }} />
              <div>
                <span className="font-semibold text-[#0f172a] mr-2">Pengumuman:</span>
                <Link
                  to={`/berita/${pengumumanPosts[0].slug}`}
                  className="text-slate-800 hover:underline font-medium"
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
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold mb-1">
                Jadwal Pelayanan Terdekat
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0f172a]">
                Ibadah Minggu &amp; Kategorial
              </h2>
            </div>
            <Link
              to="/jadwal-ibadah"
              className="text-sm font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Lihat jadwal lengkap &amp; PHD Wijk &rarr;
            </Link>
          </div>

          {ibadahList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {ibadahList.map((item) => (
                <div key={item.id} className="surface-card p-6">
                  <div
                    className="flex items-center gap-2 text-xs font-semibold mb-2 font-mono-num"
                    style={{ color: accentColor }}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>
                      {new Intl.DateTimeFormat('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }).format(new Date(item.service_date))}{' '}
                      &middot; {item.service_time.slice(0, 5)} WIB
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#0f172a] mb-1">
                    {item.title}
                  </h3>
                  {item.liturgical_week && (
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      {item.liturgical_week}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.preacher ? `Pengkhotbah: ${item.preacher}. ` : ''}
                    {item.theme || 'Mari bersekutu memuji Tuhan bersama seluruh keluarga jemaat.'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="surface-card p-6">
                <div
                  className="flex items-center gap-2 text-xs font-semibold mb-2 font-mono-num"
                  style={{ color: accentColor }}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>08.00 WIB</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#0f172a] mb-1">
                  Ibadah Minggu Pagi &amp; Sekolah Minggu
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Kebaktian umum pagi dan ibadah anak-anak Sekolah Minggu berlangsung setiap hari Minggu.
                </p>
              </div>
              <div className="surface-card p-6">
                <div
                  className="flex items-center gap-2 text-xs font-semibold mb-2 font-mono-num"
                  style={{ color: accentColor }}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>10.30 WIB</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#0f172a] mb-1">
                  Ibadah Minggu Siang (Utama)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Kebaktian utama disertai paduan suara huria dan koor enam lingkungan.
                </p>
              </div>
              <div className="surface-card p-6">
                <div
                  className="flex items-center gap-2 text-xs font-semibold mb-2"
                  style={{ color: accentColor }}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Tengah Minggu</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#0f172a] mb-1">
                  PHD Lingkungan (Wijk)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Partangiangan di rumah keluarga jemaat pada 6 lingkungan dengan jadwal tuan rumah mingguan.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Baris 1 (Atas): Warta Jemaat Terbaru */}
      <section className="py-6 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold mb-1">
                Tingting Huria
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0f172a]">
                Warta Jemaat Terbaru
              </h2>
            </div>
            <Link
              to="/warta"
              className="text-sm font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Arsip Warta &rarr;
            </Link>
          </div>
          {wartaList.length === 0 ? (
            <div className="surface-card p-6 text-sm text-slate-600">
              Warta jemaat mingguan akan tampil di sini setelah diterbitkan melalui dasbor admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {wartaList.map((w) => {
                const pdfUrl = (w.meta?.warta_pdf_url as string) || '';
                return (
                  <div key={w.id} className="surface-card p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 font-mono-num">
                        <FileText className="w-3.5 h-3.5 text-[#d97706]" />
                        <span>
                          {(w.meta?.warta_date as string) ||
                            new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'medium',
                            }).format(new Date(w.published_at || w.created_at))}
                        </span>
                      </div>
                      <Link
                        to={`/warta/${w.slug}`}
                        className="font-display text-lg font-bold text-[#0f172a] hover:text-[#0f294a] hover:underline block mb-1.5"
                      >
                        {w.title}
                      </Link>
                      {w.excerpt && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                          {w.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold pt-2.5 border-t border-slate-100">
                      <Link
                        to={`/warta/${w.slug}`}
                        className="hover:underline"
                        style={{ color: primaryColor }}
                      >
                        Baca Online &rarr;
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
      </section>

      {/* Baris 2 (Bawah): Berita & Artikel Huria */}
      <section className="py-10 pb-12 border-t border-[#e2e8f0]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold mb-1">
                Publikasi &amp; Renungan
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0f172a]">
                Berita &amp; Artikel Huria
              </h2>
            </div>
            <Link
              to="/berita"
              className="text-sm font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Semua Berita &rarr;
            </Link>
          </div>
          {beritaList.length === 0 ? (
            <div className="surface-card p-6 text-sm text-slate-600">
              Berita pelayanan dan renungan gereja akan tampil di sini setelah diterbitkan.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {beritaList.map((post) => {
                const thumb = resolvePostFeaturedImage(post);
                const categoryName = post.terms?.find((t) => t.taxonomy === 'category')?.name;
                return (
                  <article
                    key={post.id}
                    className="surface-card overflow-hidden flex flex-col group"
                  >
                    <Link to={`/berita/${post.slug}`} className="block">
                      <PostThumbnail
                        src={thumb}
                        alt={post.title}
                        categoryLabel={categoryName}
                        className="aspect-[16/9]"
                      />
                    </Link>
                    <div className="p-5 flex-1 flex flex-col">
                      <p className="text-xs text-slate-500 mb-1.5 font-mono-num">
                        {new Intl.DateTimeFormat('id-ID', {
                          dateStyle: 'medium',
                        }).format(new Date(post.published_at || post.created_at))}
                      </p>
                      <Link
                        to={`/berita/${post.slug}`}
                        className="font-display text-base font-bold text-[#0f172a] hover:text-[#0f294a] hover:underline mb-2 line-clamp-2"
                      >
                        {post.title}
                      </Link>
                      <p className="text-sm text-slate-600 line-clamp-2 flex-1 mb-3">
                        {post.excerpt}
                      </p>
                      <Link
                        to={`/berita/${post.slug}`}
                        className="text-xs font-semibold hover:underline"
                        style={{ color: primaryColor }}
                      >
                        Baca selengkapnya &rarr;
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 6 Lingkungan (Wijk) */}
      <section className="py-12 border-t border-[#e2e8f0] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold mb-1">
                Persekutuan Jemaat
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0f172a]">
                Enam Lingkungan (Wijk) Pelayanan
              </h2>
            </div>
            <Link
              to="/tentang-kami"
              className="text-sm font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Profil lengkap &amp; pelayan &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {wijkList.map((wijk, index) => (
              <div key={wijk.id} className="surface-card p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono-num">
                  <span>0{index + 1}. Lingkungan</span>
                  <span>Wijk {index + 1}/6</span>
                </div>
                <h3
                  className="font-display text-xl font-bold"
                  style={{ color: primaryColor }}
                >
                  Wijk {wijk.name}
                </h3>
                <div className="progress-thin">
                  <div
                    className="progress-thin-bar"
                    style={{
                      width: '100%',
                      backgroundColor: index % 2 === 0 ? primaryColor : accentColor,
                    }}
                  />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed pt-1">
                  {wijk.description}
                </p>
              </div>
            ))}
          </div>

          {/* Strip Kontak Singkat */}
          <div className="mt-10 p-6 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className="w-10 h-10 rounded-lg inline-flex items-center justify-center shrink-0 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <MapPin className="w-5 h-5" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-[#0f172a]">
                  Sekretariat {options.site_title}
                </p>
                <p className="text-sm text-slate-600">{options.church_address}</p>
              </div>
            </div>
            <Link
              to="/kontak"
              style={{ backgroundColor: primaryColor }}
              className="btn-navy px-4 py-2.5 text-sm rounded-lg whitespace-nowrap self-start sm:self-auto"
            >
              Peta &amp; Hubungi Kami
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
