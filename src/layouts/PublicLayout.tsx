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

  const primaryColor = options.theme_primary_color || '#1E3A5F';
  const topMenuItems = headerItems.filter((i) => !i.parent_id);
  const getChildren = (parentId: string) =>
    headerItems.filter((i) => i.parent_id === parentId);

  const footerWidgets1 = widgets.filter((w) => w.area === 'footer_1' && w.is_active);
  const footerWidgets2 = widgets.filter((w) => w.area === 'footer_2' && w.is_active);

  return (
    <PublicSiteContext.Provider value={{ options, widgets, wijkList }}>
      <div className="min-h-screen bg-[#FBF9F5] text-[#1C1917] flex flex-col">
        {/* Header Navigasi 3 Zona */}
        <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
            {/* Zona 1: Brand */}
            <Link
              to="/"
              className="flex items-center gap-2.5 text-lg font-display font-semibold tracking-tight whitespace-nowrap shrink-0"
              style={{ color: primaryColor }}
            >
              {options.theme_logo_url ? (
                <img
                  src={options.theme_logo_url}
                  alt={options.site_title}
                  className="w-8 h-8 object-contain shrink-0"
                />
              ) : (
                <HkbpLogo className="w-8 h-8 shrink-0" variant="color" />
              )}
              <span>{options.site_title}</span>
            </Link>

            {/* Zona 2: Navigasi Utama Desktop */}
            <nav
              aria-label="Navigasi Utama"
              className="hidden lg:flex items-center gap-5 text-sm font-medium text-stone-700"
            >
              {topMenuItems.map((item) => {
                const children = getChildren(item.id);
                const isExternal = item.url.startsWith('http');
                const active =
                  item.url === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.url);

                if (children.length > 0) {
                  return (
                    <div key={item.id} className="relative group">
                      <Link
                        to={item.url}
                        className={`inline-flex items-center gap-1 py-2 whitespace-nowrap hover:text-[#1E3A5F] ${
                          active ? 'font-semibold text-[#1E3A5F]' : ''
                        }`}
                      >
                        <span>{item.title}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Link>
                      <div className="hidden group-hover:block absolute left-0 top-full w-48 bg-white border border-stone-200 shadow-lg py-1.5 z-40 rounded-md">
                        {children.map((ch) => (
                          <Link
                            key={ch.id}
                            to={ch.url}
                            className="block px-3.5 py-1.5 text-sm text-stone-700 hover:bg-stone-50 hover:text-[#1E3A5F]"
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
                    className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap"
                  >
                    {item.title}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={item.url}
                    className={`hover:text-[#1E3A5F] transition-colors whitespace-nowrap ${
                      active ? 'font-semibold text-[#1E3A5F]' : ''
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Zona 3: Tombol Masuk + Hamburger Mobile */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={isStaff ? '/admin' : '/login'}
                style={{ backgroundColor: primaryColor }}
                className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-95 transition-opacity whitespace-nowrap"
              >
                {isStaff ? 'Dasbor Admin' : 'Masuk'}
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Buka menu navigasi"
                className="lg:hidden p-2 text-stone-700 border border-stone-300 rounded-md"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Drawer Mobile */}
          {mobileOpen && (
            <nav className="lg:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-1">
              {topMenuItems.map((item) => (
                <div key={item.id}>
                  <Link
                    to={item.url}
                    className="block py-2 text-sm font-medium text-stone-800 hover:text-[#1E3A5F]"
                  >
                    {item.title}
                  </Link>
                  {getChildren(item.id).map((ch) => (
                    <Link
                      key={ch.id}
                      to={ch.url}
                      className="block pl-4 py-1.5 text-sm text-stone-600"
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

        {/* Footer Dinamis dengan Widget */}
        <footer style={{ backgroundColor: primaryColor }} className="text-stone-200 pt-10 pb-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-white/15">
            {/* Widget Area 1 */}
            <div className="space-y-4">
              {footerWidgets1.length > 0 ? (
                footerWidgets1.map((w) => (
                  <div key={w.id}>
                    <h3 className="font-display text-base font-semibold text-white mb-2">
                      {w.title}
                    </h3>
                    <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-line">
                      {String(w.config?.body || '')}
                    </p>
                  </div>
                ))
              ) : (
                <div>
                  <h3 className="font-display text-base font-semibold text-white mb-2">
                    {options.site_title}
                  </h3>
                  <p className="text-sm text-stone-300">{options.site_tagline}</p>
                </div>
              )}
            </div>

            {/* Widget Area 2 */}
            <div className="space-y-4">
              {footerWidgets2.map((w) => (
                <div key={w.id}>
                  <h3 className="font-display text-base font-semibold text-white mb-2">
                    {w.title}
                  </h3>
                  <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-line tabular-nums">
                    {String(w.config?.body || '')}
                  </p>
                </div>
              ))}
            </div>

            {/* Menu Footer / Tautan Cepat */}
            <div>
              <h3 className="font-display text-base font-semibold text-white mb-2">
                Navigasi Huria
              </h3>
              <ul className="space-y-1.5 text-sm text-stone-300">
                {(footerItems.length > 0
                  ? footerItems
                  : DEFAULT_HEADER_MENU_ITEMS
                ).map((item) => (
                  <li key={item.id}>
                    <Link to={item.url} className="hover:text-white transition-colors">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-300">
            <div className="flex items-center gap-2.5">
              <HkbpLogo className="w-5 h-5" variant="monochrome-light" />
              <span>
                &copy; {new Date().getFullYear()} {options.site_title} — {options.church_address}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/sitemap.xml" className="hover:text-white">
                Peta Situs
              </Link>
              <Link to="/login" className="hover:text-white underline">
                Masuk Pengelola
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </PublicSiteContext.Provider>
  );
}
