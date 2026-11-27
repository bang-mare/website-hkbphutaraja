import { useEffect, useMemo, useState } from 'react';
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
  normalizeHomepageLayout,
  resolvePostFeaturedImage,
} from '../../lib/publicData';
import { PostThumbnail } from '../../components/PostThumbnail';
import { PublicJemaatStatsSection } from '../../components/PublicJemaatStatsSection';
import { createEmptyPublicStats, fetchPublicJemaatStats } from '../../lib/jemaatData';
import type {
  HomepageSectionConfig,
  IbadahMinggu,
  PostRecord,
  PublicJemaatStats,
} from '../../types/cms';

function getGridClass(columns?: 1 | 2 | 3 | 4, defaultCols: 1 | 2 | 3 | 4 = 3): string {
  const cols = columns || defaultCols;
  switch (cols) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-1 md:grid-cols-2';
    case 4:
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    case 3:
    default:
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  }
}

export function PublicHomePage() {
  const { options, wijkList } = usePublicSite();
  usePageSeo({
    title: `${options.site_title} — Distrik VI Dairi`,
    description: options.site_tagline,
    siteTitle: options.site_title,
  });

  const layoutSections = useMemo(
    () => normalizeHomepageLayout(options.homepage_layout),
    [options.homepage_layout]
  );

  const scheduleLimit = useMemo(() => {
    const cfg = layoutSections.find((s) => s.id === 'schedule');
    return Math.max(1, cfg?.limit ?? 3);
  }, [layoutSections]);

  const wartaLimit = useMemo(() => {
    const cfg = layoutSections.find((s) => s.id === 'warta');
    return Math.max(1, cfg?.limit ?? 3);
  }, [layoutSections]);

  const newsLimit = useMemo(() => {
    const cfg = layoutSections.find((s) => s.id === 'news');
    return Math.max(1, cfg?.limit ?? 4);
  }, [layoutSections]);

  const [ibadahList, setIbadahList] = useState<IbadahMinggu[]>([]);
  const [wartaList, setWartaList] = useState<PostRecord[]>([]);
  const [beritaList, setBeritaList] = useState<PostRecord[]>([]);
  const [jemaatStats, setJemaatStats] = useState<PublicJemaatStats>(() =>
    createEmptyPublicStats(wijkList)
  );
  const [loadingJemaatStats, setLoadingJemaatStats] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  const showJemaatStats = useMemo(
    () => layoutSections.some((s) => s.id === 'jemaat_stats' && s.enabled),
    [layoutSections]
  );

  useEffect(() => {
    Promise.all([
      fetchPublicIbadahMinggu(Math.max(3, scheduleLimit)),
      fetchPublishedPosts('warta', wartaLimit),
      fetchPublishedPosts('post', Math.max(6, newsLimit)),
    ]).then(([ibadah, warta, berita]) => {
      setIbadahList(ibadah);
      setWartaList(warta);
      setBeritaList(berita);
    });
  }, [scheduleLimit, wartaLimit, newsLimit]);

  useEffect(() => {
    if (!showJemaatStats) return;
    let active = true;
    setLoadingJemaatStats(true);
    fetchPublicJemaatStats(wijkList).then(({ stats }) => {
      if (!active) return;
      setJemaatStats(stats);
      setLoadingJemaatStats(false);
    });
    return () => {
      active = false;
    };
  }, [showJemaatStats, wijkList]);

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';
  const heroImage =
    options.theme_hero_image_url ||
    '/src/assets/images/church_hero_sanctuary_1795501235668.jpg';

  const pengumumanPosts = beritaList.filter((p) =>
    p.terms?.some((t) => t.slug === 'pengumuman')
  );
  const nextService = ibadahList[0];

  const renderSection = (section: HomepageSectionConfig) => {
    if (!section.enabled) return null;

    switch (section.id) {
      case 'hero': {
        const isCentered = section.variant === 'centered';
        const heroEyebrow =
          section.subtitle?.trim() || 'Distrik VI Dairi · Huria Kristen Batak Protestan';
        const heroHeading = section.title?.trim() || options.site_title;
        const heroDescription =
          section.description?.trim() ||
          'Melayani persekutuan (Koinonia), kesaksian (Marturia), dan pelayanan kasih (Diakonia) bagi seluruh ruas ni huria yang tersebar di enam lingkungan (Wijk) pelayanan.';

        return (
          <section
            key="hero"
            className="hero-sacred py-10 sm:py-12 lg:py-16"
            style={
              primaryColor.toLowerCase() !== '#0f294a'
                ? {
                    background: `linear-gradient(135deg, #0a1c34 0%, ${primaryColor} 58%, #1e3a8a 100%)`,
                  }
                : undefined
            }
          >
            {isCentered ? (
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
                <p className="text-xs uppercase tracking-[0.14em] font-semibold text-[#fbbf24] mb-2">
                  {heroEyebrow}
                </p>
                <h1 className="font-display heading-hero font-bold text-white tracking-tight mb-3 [text-wrap:balance]">
                  {heroHeading}
                </h1>
                <p className="text-base text-white/85 leading-relaxed max-w-2xl mb-4">
                  {heroDescription}
                </p>
                <div
                  className="w-16 h-[2px] mb-5"
                  style={{ backgroundColor: accentColor === '#d97706' ? '#f59e0b' : accentColor }}
                />
                <div className="rounded-xl p-4 sm:p-5 bg-white/[0.08] border border-white/[0.16] mb-6 w-full max-w-2xl text-left">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.1em] font-semibold text-[#fbbf24] mb-1.5">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>Ayat Renungan &middot; {options.daily_verse.reference}</span>
                  </div>
                  <p className="font-display italic text-white text-base sm:text-lg leading-relaxed">
                    &ldquo;{options.daily_verse.text}&rdquo;
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
                  <Link
                    to="/jadwal-ibadah"
                    style={{
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                    }}
                    className="btn-gold inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-[15px] rounded-lg whitespace-nowrap"
                  >
                    <span>Lihat Jadwal Ibadah</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/warta"
                    className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 border border-white/40 text-white hover:bg-white/10 text-[15px] font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    Warta Jemaat Mingguan
                  </Link>
                </div>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Kolom Kiri: Identitas, Visi & Ayat Renungan */}
                <div className="lg:col-span-7 flex flex-col justify-center min-w-0">
                  <p className="text-xs uppercase tracking-[0.14em] font-semibold text-[#fbbf24] mb-2">
                    {heroEyebrow}
                  </p>
                  <h1 className="font-display heading-hero font-bold text-white tracking-tight mb-3 [text-wrap:balance]">
                    {heroHeading}
                  </h1>
                  <p className="text-base text-white/85 leading-relaxed max-w-2xl mb-4">
                    {heroDescription}
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
                    <p className="font-display italic text-white text-base sm:text-lg leading-relaxed">
                      &ldquo;{options.daily_verse.text}&rdquo;
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <Link
                      to="/jadwal-ibadah"
                      style={{
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                      }}
                      className="btn-gold inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-[15px] rounded-lg whitespace-nowrap"
                    >
                      <span>Lihat Jadwal Ibadah</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/warta"
                      className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 border border-white/40 text-white hover:bg-white/10 text-[15px] font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      Warta Jemaat Mingguan
                    </Link>
                  </div>
                </div>

                {/* Kolom Kanan: Kartu Ibadah Minggu Terdekat & Foto Gereja */}
                <div className="lg:col-span-5 min-w-0">
                  <div className="bg-white text-[#0f172a] rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
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
                      <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 mb-1.5">
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
                            <p className="text-xs font-medium text-slate-600">
                              {nextService.liturgical_week}
                            </p>
                          )}
                          <p className="text-[15px] text-slate-700 leading-relaxed">
                            {nextService.preacher ? `Pengkhotbah: ${nextService.preacher}. ` : ''}
                            {nextService.theme ||
                              'Mari bersekutu memuji Tuhan bersama seluruh keluarga jemaat.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100">
                            <div>
                              <p className="font-semibold text-[15px] text-[#0f172a]">
                                Ibadah Pagi &amp; Sekolah Minggu
                              </p>
                              <p className="text-xs text-slate-600">Setiap Hari Minggu</p>
                            </div>
                            <span
                              className="font-mono-num text-xs font-semibold shrink-0"
                              style={{ color: accentColor }}
                            >
                              08.00 WIB
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 py-1">
                            <div>
                              <p className="font-semibold text-[15px] text-[#0f172a]">
                                Ibadah Minggu Siang (Utama)
                              </p>
                              <p className="text-xs text-slate-600">Gereja Induk Hutaraja</p>
                            </div>
                            <span
                              className="font-mono-num text-xs font-semibold shrink-0"
                              style={{ color: accentColor }}
                            >
                              10.30 WIB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600">Jadwal lengkap &amp; petugas</span>
                      <Link
                        to="/jadwal-ibadah"
                        className="inline-flex items-center min-h-[44px] sm:min-h-0 font-semibold hover:underline"
                        style={{ color: primaryColor }}
                      >
                        Buka Jadwal &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      }

      case 'quick_links':
        return (
          <section key="quick_links" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className={`grid ${getGridClass(section.columns, 3)} gap-4`}>
              <Link to="/warta" className="quick-link-card p-5 block">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-10 h-10 rounded-lg bg-[#eff6ff] text-[#0f294a] inline-flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </span>
                  <span className="font-bold text-base text-[#0f172a]">Warta Jemaat</span>
                </div>
                <p className="text-[15px] text-slate-600 leading-relaxed">
                  Baca Tingting mingguan secara daring &amp; unduh PDF resmi huria.
                </p>
              </Link>

              <Link to="/jadwal-ibadah" className="quick-link-card p-5 block">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-10 h-10 rounded-lg bg-[#fef3c7] text-[#b45309] inline-flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <span className="font-bold text-base text-[#0f172a]">Jadwal Ibadah &amp; PHD</span>
                </div>
                <p className="text-[15px] text-slate-600 leading-relaxed">
                  Kebaktian Minggu dan tuan rumah partangiangan enam lingkungan.
                </p>
              </Link>

              <Link to="/galeri" className="quick-link-card p-5 block">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-10 h-10 rounded-lg bg-[#f5f3ff] text-[#6d28d9] inline-flex items-center justify-center shrink-0">
                    <Images className="w-5 h-5" />
                  </span>
                  <span className="font-bold text-base text-[#0f172a]">Galeri &amp; Berita Huria</span>
                </div>
                <p className="text-[15px] text-slate-600 leading-relaxed">
                  Dokumentasi kegiatan persekutuan, katekisasi, dan berita pelayanan.
                </p>
              </Link>
            </div>
          </section>
        );

      case 'announcements':
        if (pengumumanPosts.length === 0) return null;
        return (
          <section key="announcements" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[15px]">
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <Megaphone className="w-4 h-4 shrink-0 mt-1 sm:mt-0" style={{ color: accentColor }} />
                <div className="min-w-0">
                  <span className="font-semibold text-[#0f172a] mr-2">
                    {section.title || 'Pengumuman'}:
                  </span>
                  <Link
                    to={`/berita/${pengumumanPosts[0].slug}`}
                    className="text-slate-800 hover:underline font-medium break-words"
                  >
                    {pengumumanPosts[0].title}
                  </Link>
                </div>
              </div>
              <Link
                to={`/berita/${pengumumanPosts[0].slug}`}
                className="inline-flex items-center min-h-[44px] sm:min-h-0 text-sm font-semibold hover:underline shrink-0"
                style={{ color: primaryColor }}
              >
                Baca selengkapnya &rarr;
              </Link>
            </div>
          </section>
        );

      case 'jemaat_stats':
        return (
          <section key="jemaat_stats" className="py-10 border-t border-[#e2e8f0]/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <PublicJemaatStatsSection
                stats={jemaatStats}
                loading={loadingJemaatStats}
                primaryColor={primaryColor}
                accentColor={accentColor}
                subtitle={section.subtitle || 'Statistik Ruas Ni Huria (Aktif)'}
                title={section.title || 'Skala Pelayanan & Demografi Jemaat'}
                showCtaBar
              />
            </div>
          </section>
        );

      case 'schedule': {
        const displayedIbadah = ibadahList.slice(0, scheduleLimit);
        return (
          <section key="schedule" className="py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold mb-1">
                    {section.subtitle || 'Jadwal Pelayanan Terdekat'}
                  </p>
                  <h2 className="font-display heading-section font-bold text-[#0f172a]">
                    {section.title || 'Ibadah Minggu & Kategorial'}
                  </h2>
                </div>
                <Link
                  to="/jadwal-ibadah"
                  className="inline-flex items-center min-h-[44px] sm:min-h-0 text-[15px] font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  Lihat jadwal lengkap &amp; PHD Wijk &rarr;
                </Link>
              </div>

              {displayedIbadah.length > 0 ? (
                <div className={`grid ${getGridClass(section.columns, 3)} gap-5`}>
                  {displayedIbadah.map((item) => (
                    <div key={item.id} className="surface-card p-5 sm:p-6">
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
                        <p className="text-xs font-medium text-slate-600 mb-2">
                          {item.liturgical_week}
                        </p>
                      )}
                      <p className="text-[15px] text-slate-700 leading-relaxed">
                        {item.preacher ? `Pengkhotbah: ${item.preacher}. ` : ''}
                        {item.theme || 'Mari bersekutu memuji Tuhan bersama seluruh keluarga jemaat.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`grid ${getGridClass(section.columns, 3)} gap-5`}>
                  <div className="surface-card p-5 sm:p-6">
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
                    <p className="text-[15px] text-slate-700 leading-relaxed">
                      Kebaktian umum pagi dan ibadah anak-anak Sekolah Minggu berlangsung setiap hari Minggu.
                    </p>
                  </div>
                  <div className="surface-card p-5 sm:p-6">
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
                    <p className="text-[15px] text-slate-700 leading-relaxed">
                      Kebaktian utama disertai paduan suara huria dan koor enam lingkungan.
                    </p>
                  </div>
                  <div className="surface-card p-5 sm:p-6">
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
                    <p className="text-[15px] text-slate-700 leading-relaxed">
                      Partangiangan di rumah keluarga jemaat pada 6 lingkungan dengan jadwal tuan rumah mingguan.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      }

      case 'warta': {
        const displayedWarta = wartaList.slice(0, wartaLimit);
        return (
          <section key="warta" className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold mb-1">
                    {section.subtitle || 'Tingting Huria'}
                  </p>
                  <h2 className="font-display heading-section font-bold text-[#0f172a]">
                    {section.title || 'Warta Jemaat Terbaru'}
                  </h2>
                </div>
                <Link
                  to="/warta"
                  className="inline-flex items-center min-h-[44px] sm:min-h-0 text-[15px] font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  Arsip Warta &rarr;
                </Link>
              </div>
              {displayedWarta.length === 0 ? (
                <div className="surface-card p-6 text-[15px] text-slate-600">
                  Warta jemaat mingguan akan tampil di sini setelah diterbitkan melalui dasbor admin.
                </div>
              ) : (
                <div className={`grid ${getGridClass(section.columns, 3)} gap-5`}>
                  {displayedWarta.map((w) => {
                    const pdfUrl = (w.meta?.warta_pdf_url as string) || '';
                    return (
                      <div key={w.id} className="surface-card p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 mb-1.5 font-mono-num">
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
                            <p className="text-[15px] text-slate-600 line-clamp-2 mb-3">
                              {w.excerpt}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[13px] font-semibold pt-2.5 border-t border-slate-100">
                          <Link
                            to={`/warta/${w.slug}`}
                            className="inline-flex items-center min-h-[44px] sm:min-h-[32px] hover:underline"
                            style={{ color: primaryColor }}
                          >
                            Baca Online &rarr;
                          </Link>
                          {pdfUrl && (
                            <a
                              href={pdfUrl}
                              className="inline-flex items-center gap-1 min-h-[44px] sm:min-h-[32px] hover:underline"
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
        );
      }

      case 'news': {
        const displayedBerita = beritaList.slice(0, newsLimit);
        return (
          <section key="news" className="py-10 border-t border-[#e2e8f0]/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold mb-1">
                    {section.subtitle || 'Publikasi & Renungan'}
                  </p>
                  <h2 className="font-display heading-section font-bold text-[#0f172a]">
                    {section.title || 'Berita & Artikel Huria'}
                  </h2>
                </div>
                <Link
                  to="/berita"
                  className="inline-flex items-center min-h-[44px] sm:min-h-0 text-[15px] font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  Semua Berita &rarr;
                </Link>
              </div>
              {displayedBerita.length === 0 ? (
                <div className="surface-card p-6 text-[15px] text-slate-600">
                  Berita pelayanan dan renungan gereja akan tampil di sini setelah diterbitkan.
                </div>
              ) : (
                <div className={`grid ${getGridClass(section.columns, 4)} gap-5`}>
                  {displayedBerita.map((post) => {
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
                          <p className="text-xs text-slate-600 mb-1.5 font-mono-num">
                            {new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'medium',
                            }).format(new Date(post.published_at || post.created_at))}
                          </p>
                          <Link
                            to={`/berita/${post.slug}`}
                            className="font-display text-lg font-bold text-[#0f172a] hover:text-[#0f294a] hover:underline mb-2 line-clamp-2"
                          >
                            {post.title}
                          </Link>
                          <p className="text-[15px] text-slate-600 line-clamp-2 flex-1 mb-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                          <Link
                            to={`/berita/${post.slug}`}
                            className="inline-flex items-center min-h-[44px] sm:min-h-[32px] text-[13px] font-semibold hover:underline"
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
        );
      }

      case 'wijk':
        return (
          <section key="wijk" className="py-10 border-t border-[#e2e8f0] bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-600 font-semibold mb-1">
                    {section.subtitle || 'Persekutuan Jemaat'}
                  </p>
                  <h2 className="font-display heading-section font-bold text-[#0f172a]">
                    {section.title || 'Enam Lingkungan (Wijk) Pelayanan'}
                  </h2>
                </div>
                <Link
                  to="/tentang-kami?tab=pimpinan"
                  className="inline-flex items-center min-h-[44px] sm:min-h-0 text-[15px] font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  Profil lengkap &amp; pelayan &rarr;
                </Link>
              </div>

              <div className={`grid ${getGridClass(section.columns, 3)} gap-4`}>
                {wijkList.map((wijk, index) => (
                  <div key={wijk.id} className="surface-card p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-mono-num">
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
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section key="contact" className="py-8 bg-white border-t border-[#e2e8f0]/70">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className={`rounded-xl border border-[#e2e8f0] bg-[#f8fafc] ${
                  section.variant === 'compact'
                    ? 'p-5 max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4'
                    : 'p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="w-10 h-10 rounded-lg inline-flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <MapPin className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold text-[#0f172a]">
                      Sekretariat {options.site_title}
                    </p>
                    <p className="text-[15px] text-slate-600 break-words">{options.church_address}</p>
                  </div>
                </div>
                <Link
                  to="/kontak"
                  style={{ backgroundColor: primaryColor }}
                  className="btn-navy inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 text-[15px] rounded-lg whitespace-nowrap w-full sm:w-auto"
                >
                  Peta &amp; Hubungi Kami
                </Link>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-[#f8fafc]">
      {layoutSections.map((section) => renderSection(section))}
    </div>
  );
}
