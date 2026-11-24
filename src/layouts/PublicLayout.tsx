import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
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

  const footerWidgets1 = widgets.filter((w) => w.area === 'footer_1' && w.is_active);
  const footerWidgets2 = widgets.filter((w) => w.area === 'footer_2' && w.is_active);

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

        {/* Footer 3-Kolom Putih Bersih (Sesuai Tema Referensi) */}
        <footer className="bg-white border-t border-[#e2e8f0] pt-10 pb-8 mt-12 text-sm text-slate-600">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[#e2e8f0]">
            {/* Kolom 1: Identitas Gereja + Widget Area 1 */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-start gap-3">
                {options.theme_logo_url ? (
                  <img
                    src={options.theme_logo_url}
                    alt={options.site_title}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded object-contain shrink-0"
                  />
                ) : (
                  <HkbpLogo className="w-9 h-9 shrink-0" variant="color" />
                )}
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {options.site_title} — Distrik VI Dairi
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{options.church_address}</p>
                </div>
              </div>
              {footerWidgets1.map((w) => (
                <div key={w.id} className="pt-1">
                  <p className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    {w.title}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {String(w.config?.body || '')}
                  </p>
                </div>
              ))}
            </div>

            {/* Kolom 2: Peta Situs / Menu Footer */}
            <div className="md:col-span-4 space-y-2.5">
              <h3 className="font-bold text-slate-900 uppercase tracking-[0.08em] text-xs">
                Peta Situs HKBP
              </h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {(footerItems.length > 0
                  ? footerItems
                  : DEFAULT_HEADER_MENU_ITEMS
                ).map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.url}
                      className="text-slate-600 hover:text-[#0f294a] transition-colors"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kolom 3: Jadwal & Widget Area 2 */}
            <div className="md:col-span-3 space-y-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-[0.08em] text-xs">
                Akses Cepat &amp; Jadwal
              </h3>
              {footerWidgets2.map((w) => (
                <div key={w.id}>
                  <p className="font-semibold text-slate-800 text-xs mb-1">{w.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-mono-num">
                    {String(w.config?.body || '')}
                  </p>
                </div>
              ))}
              <div className="pt-1 flex flex-col gap-1">
                <Link
                  to="/warta"
                  className="text-sm font-medium text-slate-600 hover:text-[#0f294a]"
                >
                  Warta Jemaat Pekan Ini
                </Link>
                <Link
                  to={isStaff ? '/admin' : '/login'}
                  style={{ color: primaryColor }}
                  className="text-sm font-semibold hover:underline"
                >
                  {isStaff ? 'Buka Dasbor Admin →' : 'Portal Pengurus →'}
                </Link>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} {options.site_title}
            </div>
            <div className="flex items-center gap-4">
              <span>Koinonia &middot; Marturia &middot; Diakonia</span>
              <Link to="/sitemap.xml" className="hover:text-[#0f294a] underline">
                Sitemap
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </PublicSiteContext.Provider>
  );
}
