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
}

const PublicSiteContext = createContext<PublicSiteContextValue>({
  options: DEFAULT_SITE_OPTIONS,
  widgets: DEFAULT_WIDGETS,
  wijkList: DEFAULT_WIJK,
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
  }, [location.pathname]);

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
  const topMenuItems = headerItems.filter((i) => !i.parent_id);
  const getChildren = (parentId: string) =>
    headerItems.filter((i) => i.parent_id === parentId);

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
  const baseSitemapItems =
    footerItems.length > 0 ? footerItems : DEFAULT_HEADER_MENU_ITEMS;
  const sitemapLinks = (() => {
    const list = baseSitemapItems.map((item) => ({
      id: item.id,
      title: item.title === 'Warta Jemaat' || item.title === 'Warta' ? 'Warta Jemaat' : item.title,
      url: item.url,
    }));
    const hasPelayanan = list.some((i) => i.title.toLowerCase() === 'pelayanan');
    if (list.length % 2 !== 0 && !hasPelayanan) {
      const kontakIdx = list.findIndex((i) => i.url === '/kontak');
      const pelayananItem = {
        id: 'footer-pelayanan',
        title: 'Pelayanan',
        url: '/tentang-kami',
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
    <PublicSiteContext.Provider value={{ options, widgets, wijkList }}>
      <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col">
        {/* Top Navigation Bar (White Navbar, Navy Brand, Gold Hover/Active Underline) */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#e2e8f0]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
            {/* Brand */}
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-[17px] font-display font-bold tracking-[-0.01em] whitespace-nowrap shrink-0"
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
              <span>{options.site_title}</span>
            </Link>

            {/* Navigasi Utama Desktop */}
            <nav
              aria-label="Navigasi Utama"
              className="hidden lg:flex items-center gap-1"
            >
              {topMenuItems.map((item) => {
                const children = getChildren(item.id);
                const isExternal = item.url.startsWith('http');
                const active =
                  item.url === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.url);

                const linkStyle = active
                  ? { color: primaryColor, borderBottomColor: accentColor }
                  : undefined;

                if (children.length > 0) {
                  return (
                    <div key={item.id} className="relative group">
                      <Link
                        to={item.url}
                        style={linkStyle}
                        className={`inline-flex items-center gap-1 px-2.5 py-2 text-[13.5px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                          active
                            ? 'font-semibold'
                            : 'border-transparent text-slate-600 hover:text-[#0f294a] hover:border-[#d97706]'
                        }`}
                      >
                        <span>{item.title}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Link>
                      <div className="hidden group-hover:block absolute left-0 top-full min-w-[220px] bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_12px_28px_rgba(15,41,74,0.12)] p-1.5 z-40">
                        {children.map((ch) => (
                          <Link
                            key={ch.id}
                            to={ch.url}
                            className="block px-3 py-2 text-[13.5px] text-slate-700 rounded-md hover:bg-slate-100 hover:text-[#0f294a]"
                          >
                            {ch.title}
                          </Link>
                        ))}
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
                    className="px-2.5 py-2 text-[13.5px] font-medium text-slate-600 border-b-2 border-transparent hover:text-[#0f294a] hover:border-[#d97706] transition-colors whitespace-nowrap"
                  >
                    {item.title}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={item.url}
                    style={linkStyle}
                    className={`px-2.5 py-2 text-[13.5px] font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                className="px-4 py-2 text-[13px] font-semibold text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                {isStaff ? 'Dasbor Admin' : 'Masuk'}
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Buka menu navigasi"
                className="lg:hidden p-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Drawer Mobile */}
          {mobileOpen && (
            <nav className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
              {topMenuItems.map((item) => (
                <div key={item.id}>
                  <Link
                    to={item.url}
                    className="block py-2 text-sm font-medium text-slate-800 hover:text-[#0f294a]"
                  >
                    {item.title}
                  </Link>
                  {getChildren(item.id).map((ch) => (
                    <Link
                      key={ch.id}
                      to={ch.url}
                      className="block pl-4 py-1.5 text-sm text-slate-600 hover:text-[#0f294a]"
                    >
                      {ch.title}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          )}
        </header>

        {/* Konten Halaman */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer 3-Kolom Hangat, Bersih, & Mudah Dibaca */}
        <footer className="bg-white border-t border-[#e2e8f0] pt-12 pb-8 mt-14 text-[15px] text-slate-700 font-sans">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12 pb-10">
            {/* KOLOM 1: Identitas Gereja */}
            <div className="space-y-4">
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

              <p className="text-[15px] font-medium text-slate-800 leading-relaxed">
                {FOOTER_CONFIG.tagline}
              </p>

              <p className="text-sm text-slate-700 leading-relaxed flex items-start gap-2">
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
                  className="inline-flex items-center gap-2 min-h-[44px] md:min-h-[38px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-[#f8fafc] text-slate-800 hover:border-[#0f294a] hover:bg-slate-100 hover:text-[#0f294a] transition-colors"
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
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[15px]">
                  {sitemapLinks.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.url}
                        className="inline-flex items-center min-h-[44px] md:min-h-[34px] text-slate-700 hover:text-[#0f294a] hover:underline decoration-[#d97706] decoration-1 underline-offset-4 transition-colors"
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
                          className="inline-flex items-center gap-2.5 min-h-[44px] md:min-h-[36px] text-[15px] text-slate-700 hover:text-[#0f294a] hover:underline decoration-[#d97706] underline-offset-4 transition-colors"
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
              <div className="pt-2 border-t border-slate-100 space-y-1 text-sm text-slate-700">
                {options.admin_email && (
                  <div>
                    <a
                      href={`mailto:${options.admin_email}`}
                      className="inline-flex items-center gap-2 min-h-[44px] md:min-h-[32px] hover:text-[#0f294a] hover:underline underline-offset-4 transition-colors break-all"
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
                      className="inline-flex items-center gap-2 min-h-[44px] md:min-h-[32px] hover:text-[#0f294a] hover:underline underline-offset-4 transition-colors"
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 border-t border-[#e2e8f0] space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <p className="text-xs sm:text-sm text-slate-700">
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
                className="inline-flex items-center min-h-[44px] md:min-h-0 px-2 text-xs text-slate-600 hover:text-[#0f294a] hover:underline underline-offset-4 transition-colors"
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
