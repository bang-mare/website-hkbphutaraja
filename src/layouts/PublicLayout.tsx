import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ExternalLink,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  X,
  Youtube,
} from 'lucide-react';
import { HkbpLogo } from '../components/HkbpLogo';
import { useAuth } from '../contexts/AuthContext';
import { hasCapability } from '../lib/roles';
import {
  DEFAULT_HEADER_MENU_ITEMS,
  DEFAULT_PROFILE_SUBMENU_ITEMS,
  DEFAULT_SITE_OPTIONS,
  DEFAULT_WIDGETS,
  DEFAULT_WIJK,
  fetchMenuByLocation,
  fetchPublicWijk,
  fetchSiteOptions,
  fetchWidgets,
} from '../lib/publicData';
import type {
  MenuItemRecord,
  SiteOptionsMap,
  WidgetRecord,
  Wijk,
} from '../types/cms';

interface PublicSiteContextValue {
  options: SiteOptionsMap;
  widgets: WidgetRecord[];
  wijkList: Wijk[];
  updateSiteOptions: (next: SiteOptionsMap) => void;
}

const PublicSiteContext = createContext<PublicSiteContextValue>({
  options: DEFAULT_SITE_OPTIONS,
  widgets: DEFAULT_WIDGETS,
  wijkList: DEFAULT_WIJK,
  updateSiteOptions: () => {},
});

export function usePublicSite() {
  return useContext(PublicSiteContext);
}

export function PublicLayout() {
  const { profile } = useAuth();
  const location = useLocation();
  const isStaff = hasCapability(profile?.role, 'access_admin');

  const [options, setOptions] = useState<SiteOptionsMap>(DEFAULT_SITE_OPTIONS);
  const [headerItems, setHeaderItems] = useState<MenuItemRecord[]>(
    DEFAULT_HEADER_MENU_ITEMS
  );
  const [footerItems, setFooterItems] = useState<MenuItemRecord[]>([]);
  const [widgets, setWidgets] = useState<WidgetRecord[]>(DEFAULT_WIDGETS);
  const [wijkList, setWijkList] = useState<Wijk[]>(DEFAULT_WIJK);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    Promise.all([
      fetchSiteOptions(),
      fetchMenuByLocation('header'),
      fetchMenuByLocation('footer'),
      fetchWidgets(),
      fetchPublicWijk(),
    ]).then(([opts, hItems, fItems, wList, wijkData]) => {
      setOptions(opts);
      setHeaderItems(hItems.length > 0 ? hItems : DEFAULT_HEADER_MENU_ITEMS);
      setFooterItems(fItems);
      setWidgets(wList.length > 0 ? wList : DEFAULT_WIDGETS);
      setWijkList(wijkData);
    });
  }, []);

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  // Pastikan menu Profil (/tentang-kami atau /profil) selalu memiliki 4 anak menu tab bila belum dikustomisasi di DB
  const resolvedHeaderItems = React.useMemo(() => {
    const items = headerItems.map((item) => {
      const normalizedUrl = item.url.split('?')[0].replace(/\/+$/, '') || '/';
      if (!item.parent_id && (normalizedUrl === '/tentang-kami' || normalizedUrl === '/profil')) {
        return {
          ...item,
          title: item.title === 'Tentang Kami' ? 'Profil' : item.title,
        };
      }
      return item;
    });

    const profileParent = items.find((item) => {
      const normalizedUrl = item.url.split('?')[0].replace(/\/+$/, '') || '/';
      return !item.parent_id && (normalizedUrl === '/tentang-kami' || normalizedUrl === '/profil');
    });

    if (profileParent) {
      const hasExistingChildren = items.some((item) => item.parent_id === profileParent.id);
      if (!hasExistingChildren) {
        return [
          ...items,
          ...DEFAULT_PROFILE_SUBMENU_ITEMS.map((sub) => ({
            ...sub,
            menu_id: profileParent.menu_id,
            parent_id: profileParent.id,
          })),
        ];
      }
    }

    return items;
  }, [headerItems]);

  const topMenuItems = resolvedHeaderItems.filter((i) => !i.parent_id);
  const getChildren = (parentId: string) =>
    resolvedHeaderItems
      .filter((i) => i.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);

  const isNavItemActive = (url: string) => {
    const cleanTarget = url.split('?')[0].replace(/\/+$/, '') || '/';
    const cleanPath = location.pathname.replace(/\/+$/, '') || '/';
    if (cleanTarget === '/') return cleanPath === '/';
    if (cleanTarget === '/tentang-kami' || cleanTarget === '/profil') {
      return cleanPath === '/tentang-kami' || cleanPath === '/profil';
    }
    return cleanPath.startsWith(cleanTarget);
  };

  const isSubmenuItemActive = (url: string) => {
    const [targetPathRaw, targetQuery] = url.split('?');
    const targetPath = targetPathRaw.replace(/\/+$/, '') || '/';
    const cleanPath = location.pathname.replace(/\/+$/, '') || '/';
    const onProfilePage = cleanPath === '/tentang-kami' || cleanPath === '/profil';
    if ((targetPath === '/tentang-kami' || targetPath === '/profil') && onProfilePage) {
      const currentTab = new URLSearchParams(location.search).get('tab') || 'sejarah';
      const targetTab = new URLSearchParams(targetQuery || '').get('tab') || 'sejarah';
      return currentTab === targetTab;
    }
    return cleanPath === targetPath && location.search === (targetQuery ? `?${targetQuery}` : '');
  };

  // Konfigurasi data footer (isi URL media sosial di bawah ini; platform yang kosong tidak ditampilkan)
  const FOOTER_CONFIG = {
    address: 'Jl. Persada No. 205 Sidikalang, Kabupaten Dairi, Sumatera Utara',
    tagline: 'Melayani dengan Kasih, Bertumbuh dalam Iman',
    googleMapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Jl.+Persada+No.+205+Sidikalang%2C+Kabupaten+Dairi%2C+Sumatera+Utara',
    facebookUrl: '',
    youtubeUrl: '',
    instagramUrl: '',
    whatsappUrl: '',
    closingVerse: '“Marilah kita saling mengasihi” — 1 Yohanes 4:7',
  };

  // Normalisasi nomor telepon gereja menjadi tautan WhatsApp bila whatsappUrl belum diisi khusus
  const normalizedPhoneDigits = (options.church_phone || '').replace(/[^\d]/g, '');
  const waDigits = normalizedPhoneDigits.startsWith('0')
    ? `62${normalizedPhoneDigits.slice(1)}`
    : normalizedPhoneDigits;
  const resolvedWhatsappUrl =
    FOOTER_CONFIG.whatsappUrl || (waDigits ? `https://wa.me/${waDigits}` : '');

  const socialLinks = [
    {
      key: 'facebook',
      label: 'Facebook',
      ariaLabel: 'Kunjungi halaman Facebook HKBP Ressort Hutaraja (buka di tab baru)',
      url: FOOTER_CONFIG.facebookUrl,
      icon: Facebook,
    },
    {
      key: 'youtube',
      label: 'YouTube',
      ariaLabel: 'Kunjungi kanal YouTube HKBP Ressort Hutaraja (buka di tab baru)',
      url: FOOTER_CONFIG.youtubeUrl,
      icon: Youtube,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      ariaLabel: 'Kunjungi akun Instagram HKBP Ressort Hutaraja (buka di tab baru)',
      url: FOOTER_CONFIG.instagramUrl,
      icon: Instagram,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp Sekretariat',
      ariaLabel: 'Hubungi WhatsApp Sekretariat HKBP Ressort Hutaraja (buka di tab baru)',
      url: resolvedWhatsappUrl,
      icon: MessageCircle,
    },
  ].filter((item) => Boolean(item.url));

  // Susun tautan Peta Situs agar genap (8 item) dan seimbang dalam 2 kolom
  const baseSitemapItems = (
    footerItems.length > 0 ? footerItems : DEFAULT_HEADER_MENU_ITEMS
  ).filter((item) => !item.parent_id);
  const sitemapLinks = (() => {
    const list = baseSitemapItems.map((item) => ({
      id: item.id,
      title:
        item.title === 'Warta Jemaat' || item.title === 'Warta'
          ? 'Warta Jemaat'
          : item.url === '/tentang-kami' && item.title === 'Profil'
            ? 'Tentang Kami'
            : item.title,
      url: item.url,
    }));
    const hasPelayanan = list.some((i) => i.title.toLowerCase() === 'pelayanan');
    if (list.length % 2 !== 0 && !hasPelayanan) {
      const kontakIdx = list.findIndex((i) => i.url === '/kontak');
      const pelayananItem = {
        id: 'footer-pelayanan',
        title: 'Pelayanan',
        url: '/tentang-kami?tab=pimpinan',
      };
      if (kontakIdx >= 0) {
        list.splice(kontakIdx, 0, pelayananItem);
      } else {
        list.push(pelayananItem);
      }
    }
    return list;
  })();

  return (
    <PublicSiteContext.Provider
      value={{ options, widgets, wijkList, updateSiteOptions: setOptions }}
    >
      <div className="min-h-dvh bg-[#f8fafc] text-[#0f172a] flex flex-col">
        {/* Top Navigation Bar (White Navbar, Navy Brand, Gold Hover/Active Underline) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#e2e8f0] pt-[env(safe-area-inset-top)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
            {/* Brand */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 sm:gap-2.5 min-h-[44px] font-display font-bold tracking-[-0.01em] min-w-0"
              style={{ color: primaryColor }}
            >
              {options.theme_logo_url ? (
                <img
                  src={options.theme_logo_url}
                  alt={options.site_title}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded object-contain shrink-0"
                />
              ) : (
                <HkbpLogo className="w-8 h-8 shrink-0" variant="color" />
              )}
              <span className="text-[14px] sm:text-[17px] leading-tight line-clamp-2 sm:line-clamp-none sm:whitespace-nowrap">
                {options.site_title}
              </span>
            </Link>

            {/* Navigasi Utama Desktop */}
            <nav
              aria-label="Navigasi Utama"
              className="hidden lg:flex items-center gap-0.5 xl:gap-1"
            >
              {topMenuItems.map((item) => {
                const children = getChildren(item.id);
                const isExternal = item.url.startsWith('http');
                const active = isNavItemActive(item.url);

                const linkStyle = active
                  ? { color: primaryColor, borderBottomColor: accentColor }
                  : undefined;

                if (children.length > 0) {
                  return (
                    <div key={item.id} className="relative group">
                      <Link
                        to={item.url}
                        style={linkStyle}
                        className={`inline-flex items-center gap-1 min-h-[44px] px-2 xl:px-2.5 py-2 text-[13.5px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                          active
                            ? 'font-semibold'
                            : 'border-transparent text-slate-600 hover:text-[#0f294a] hover:border-[#d97706]'
                        }`}
                      >
                        <span>{item.title}</span>
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                      <div className="hidden group-hover:block group-focus-within:block absolute left-0 top-full min-w-[250px] bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_12px_28px_rgba(15,41,74,0.12)] p-1.5 z-40">
                        {children.map((ch) => {
                          const childActive = isSubmenuItemActive(ch.url);
                          return (
                            <Link
                              key={ch.id}
                              to={ch.url}
                              className={`flex items-center min-h-[40px] px-3 py-2 text-[13.5px] rounded-md transition-colors ${
                                childActive
                                  ? 'bg-[#0f294a] text-white font-semibold'
                                  : 'text-slate-700 hover:bg-slate-100 hover:text-[#0f294a]'
                              }`}
                            >
                              {ch.title}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return isExternal ? (
                  <a
                    key={item.id}
                    href={item.url}
                    target={item.target || '_self'}
                    rel="noreferrer"
                    className="inline-flex items-center min-h-[44px] px-2 xl:px-2.5 py-2 text-[13.5px] font-medium text-slate-600 border-b-2 border-transparent hover:text-[#0f294a] hover:border-[#d97706] transition-colors whitespace-nowrap"
                  >
                    {item.title}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={item.url}
                    style={linkStyle}
                    className={`inline-flex items-center min-h-[44px] px-2 xl:px-2.5 py-2 text-[13.5px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                      active
                        ? 'font-semibold'
                        : 'border-transparent text-slate-600 hover:text-[#0f294a] hover:border-[#d97706]'
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Tombol Masuk / Portal Pengurus + Hamburger Mobile */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={isStaff ? '/admin' : '/login'}
                style={{ backgroundColor: primaryColor }}
                className="inline-flex items-center justify-center min-h-[44px] lg:min-h-[38px] px-3 sm:px-4 py-2 text-[13px] font-semibold text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                {isStaff ? 'Dasbor Admin' : 'Masuk'}
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-drawer"
                aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Drawer Mobile & Tablet */}
          {mobileOpen && (
            <>
              <div
                aria-hidden="true"
                onClick={() => setMobileOpen(false)}
                className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-slate-950/35 z-30"
              />
              <nav
                id="mobile-nav-drawer"
                aria-label="Menu Navigasi Ponsel"
                className="lg:hidden relative z-40 border-t border-slate-200 bg-white px-4 sm:px-6 py-3 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto shadow-lg"
              >
                {topMenuItems.map((item) => {
                  const active = isNavItemActive(item.url);
                  const isExternal = item.url.startsWith('http');
                  return (
                    <div key={item.id}>
                      {isExternal ? (
                        <a
                          href={item.url}
                          target={item.target || '_self'}
                          rel="noreferrer"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center min-h-[44px] px-2 rounded-lg text-base font-medium text-slate-800 hover:bg-slate-50 hover:text-[#0f294a]"
                        >
                          {item.title}
                        </a>
                      ) : (
                        <Link
                          to={item.url}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center min-h-[44px] px-2 rounded-lg text-base transition-colors ${
                            active
                              ? 'font-semibold bg-slate-100 text-[#0f294a]'
                              : 'font-medium text-slate-800 hover:bg-slate-50 hover:text-[#0f294a]'
                          }`}
                        >
                          {item.title}
                        </Link>
                      )}
                      {getChildren(item.id).map((ch) => {
                        const childActive = isSubmenuItemActive(ch.url);
                        return (
                          <Link
                            key={ch.id}
                            to={ch.url}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center min-h-[44px] pl-6 pr-3 rounded-lg text-[15px] transition-colors ${
                              childActive
                                ? 'font-semibold text-[#0f294a] bg-slate-50'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-[#0f294a]'
                            }`}
                          >
                            {ch.title}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </nav>
            </>
          )}
        </header>

        {/* Konten Halaman */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>

        {/* Footer Responsif: 1 kolom ponsel, 2 kolom tablet, 3 kolom desktop */}
        <footer className="bg-white border-t border-[#e2e8f0] pt-12 pb-[calc(2rem+env(safe-area-inset-bottom))] mt-14 text-[15px] text-slate-700 font-sans">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12 pb-10">
            {/* KOLOM 1: Identitas Gereja */}
            <div className="space-y-4 md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3.5">
                {options.theme_logo_url ? (
                  <img
                    src={options.theme_logo_url}
                    alt={`Logo ${options.site_title}`}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-md object-contain shrink-0"
                  />
                ) : (
                  <HkbpLogo className="w-12 h-12 shrink-0" variant="color" />
                )}
                <h2
                  className="font-display text-lg sm:text-xl font-bold leading-snug"
                  style={{ color: primaryColor }}
                >
                  {options.site_title} &mdash; Distrik VI Dairi
                </h2>
              </div>

              <p className="text-base font-medium text-slate-800 leading-relaxed">
                {FOOTER_CONFIG.tagline}
              </p>

              <p className="text-[15px] text-slate-700 leading-relaxed flex items-start gap-2">
                <MapPin
                  className="w-4 h-4 shrink-0 mt-1"
                  style={{ color: accentColor }}
                  aria-hidden="true"
                />
                <span>{FOOTER_CONFIG.address}</span>
              </p>

              <div className="pt-1">
                <a
                  href={FOOTER_CONFIG.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Lihat lokasi HKBP Ressort Hutaraja di Google Maps (buka di tab baru)"
                  className="inline-flex items-center gap-2 min-h-[44px] lg:min-h-[38px] px-3.5 py-2 text-[13px] font-semibold rounded-lg border border-slate-300 bg-[#f8fafc] text-slate-800 hover:border-[#0f294a] hover:bg-slate-100 hover:text-[#0f294a] transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Lihat di Google Maps</span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-slate-600" aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* KOLOM 2: Peta Situs HKBP */}
            <div className="space-y-4">
              <h3 className="font-bold text-[#0f172a] uppercase tracking-[0.08em] text-xs">
                Peta Situs HKBP
              </h3>
              <nav aria-label="Peta Situs HKBP">
                <ul className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1 text-[15px]">
                  {sitemapLinks.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.url}
                        className="inline-flex items-center min-h-[44px] lg:min-h-[34px] text-slate-700 hover:text-[#0f294a] hover:underline decoration-[#d97706] decoration-1 underline-offset-4 transition-colors"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* KOLOM 3: Media Sosial & Kontak Singkat */}
            <div className="space-y-4">
              <h3 className="font-bold text-[#0f172a] uppercase tracking-[0.08em] text-xs">
                Media Sosial
              </h3>

              {socialLinks.length > 0 && (
                <ul className="space-y-1">
                  {socialLinks.map((social) => {
                    const SocialIcon = social.icon;
                    return (
                      <li key={social.key}>
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.ariaLabel}
                          className="inline-flex items-center gap-2.5 min-h-[44px] lg:min-h-[36px] text-[15px] text-slate-700 hover:text-[#0f294a] hover:underline decoration-[#d97706] underline-offset-4 transition-colors"
                        >
                          <SocialIcon
                            className="w-4 h-4 shrink-0"
                            style={{ color: primaryColor }}
                            aria-hidden="true"
                          />
                          <span>{social.label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Info Kontak Singkat */}
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[15px] text-slate-700">
                {options.admin_email && (
                  <div>
                    <a
                      href={`mailto:${options.admin_email}`}
                      className="inline-flex items-center gap-2 min-h-[44px] lg:min-h-[32px] hover:text-[#0f294a] hover:underline underline-offset-4 transition-colors break-all"
                    >
                      <Mail
                        className="w-4 h-4 shrink-0"
                        style={{ color: accentColor }}
                        aria-hidden="true"
                      />
                      <span>Email: {options.admin_email}</span>
                    </a>
                  </div>
                )}
                {options.church_phone && (
                  <div>
                    <a
                      href={`tel:${options.church_phone.replace(/[^+\d]/g, '')}`}
                      className="inline-flex items-center gap-2 min-h-[44px] lg:min-h-[32px] hover:text-[#0f294a] hover:underline underline-offset-4 transition-colors"
                    >
                      <Phone
                        className="w-4 h-4 shrink-0"
                        style={{ color: accentColor }}
                        aria-hidden="true"
                      />
                      <span>Telepon/WA: {options.church_phone}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Baris Bawah (Bottom Bar) dengan Garis Pemisah Tipis */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-[#e2e8f0] space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <p className="text-[13px] sm:text-sm text-slate-700">
                &copy; {new Date().getFullYear()} {options.site_title}, Distrik VI Dairi
              </p>

              <p
                className="text-sm sm:text-[15px] font-semibold tracking-[0.06em]"
                style={{ color: primaryColor }}
              >
                Koinonia &nbsp;&middot;&nbsp; Marturia &nbsp;&middot;&nbsp; Diakonia
              </p>

              <Link
                to={isStaff ? '/admin' : '/login'}
                className="inline-flex items-center min-h-[44px] lg:min-h-0 px-2 text-xs text-slate-600 hover:text-[#0f294a] hover:underline underline-offset-4 transition-colors"
              >
                Login Admin
              </Link>
            </div>

            {FOOTER_CONFIG.closingVerse && (
              <p className="text-center text-xs text-slate-600 italic pt-1">
                {FOOTER_CONFIG.closingVerse}
              </p>
            )}
          </div>
        </footer>
      </div>
    </PublicSiteContext.Provider>
  );
}
