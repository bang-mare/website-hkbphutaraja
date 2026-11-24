import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Gauge,
  Pin,
  Image as ImageIcon,
  FileText,
  Newspaper,
  CalendarDays,
  UsersRound,
  Images,
  ClipboardCheck,
  Wallet,
  Paintbrush,
  UserCog,
  SlidersHorizontal,
  Home,
  Plus,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { getAdminMenuForRole, hasCapability, ROLE_LABELS } from '../lib/roles';
import { HkbpLogo } from '../components/HkbpLogo';
import type { AdminMenuEntry, UserRole } from '../types/cms';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Gauge,
  Pin,
  Image: ImageIcon,
  FileText,
  Newspaper,
  CalendarDays,
  UsersRound,
  Images,
  ClipboardCheck,
  Wallet,
  Paintbrush,
  UserCog,
  SlidersHorizontal,
};

export function AdminLayout() {
  const { profile, signOut, isPreviewSession, enterPreviewSession } = useAuth();
  const {
    notices,
    dismissNotice,
    widgetVisibility,
    toggleWidgetVisibility,
    helpTabs,
    screenOptionsExtra,
  } = useAdmin();

  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredFlyout, setHoveredFlyout] = useState<{
    entry: AdminMenuEntry;
    left: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const closeFlyoutTimerRef = useRef<number | null>(null);

  // Admin Bar dropdown states
  const [openDropdown, setOpenDropdown] = useState<
    'brand' | 'site' | 'new' | 'user' | null
  >(null);

  // Screen Options & Help drawers
  const [openDrawer, setOpenDrawer] = useState<'screen' | 'help' | null>(null);
  const [activeHelpTabId, setActiveHelpTabId] = useState<string>('');

  const cancelCloseFlyout = () => {
    if (closeFlyoutTimerRef.current !== null) {
      window.clearTimeout(closeFlyoutTimerRef.current);
      closeFlyoutTimerRef.current = null;
    }
  };

  const scheduleCloseFlyout = () => {
    cancelCloseFlyout();
    closeFlyoutTimerRef.current = window.setTimeout(() => {
      setHoveredFlyout(null);
    }, 100);
  };

  useEffect(() => {
    return () => cancelCloseFlyout();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    setHoveredFlyout(null);
  }, [location.pathname]);

  useEffect(() => {
    if (helpTabs.length > 0 && !helpTabs.some((t) => t.id === activeHelpTabId)) {
      setActiveHelpTabId(helpTabs[0].id);
    }
  }, [helpTabs, activeHelpTabId]);

  const menuEntries = getAdminMenuForRole(profile?.role);

  const isMenuActive = (entry: AdminMenuEntry) => {
    if (entry.path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/updates';
    }
    if (entry.id === 'users' && location.pathname === '/admin/profile') {
      return true;
    }
    if (entry.id === 'appearance' && location.pathname.startsWith('/admin/appearance')) {
      return true;
    }
    if (entry.id === 'settings' && location.pathname.startsWith('/admin/settings')) {
      return true;
    }
    return (
      location.pathname === entry.path ||
      location.pathname.startsWith(`${entry.path}/`)
    );
  };

  const isSubmenuActive = (subPath: string) => location.pathname === subPath;

  const newMenuItems = [
    { label: 'Pos', path: '/admin/posts/new', cap: 'manage_posts' },
    { label: 'Media', path: '/admin/media/new', cap: 'manage_media' },
    { label: 'Halaman', path: '/admin/pages/new', cap: 'manage_pages' },
    { label: 'Warta Jemaat', path: '/admin/warta/new', cap: 'manage_warta' },
    { label: 'Jadwal Ibadah', path: '/admin/jadwal', cap: 'manage_jadwal' },
    { label: 'Jemaat', path: '/admin/jemaat', cap: 'manage_jemaat' },
    { label: 'Pengguna', path: '/admin/users/new', cap: 'manage_users' },
  ].filter((item) => hasCapability(profile?.role, item.cap));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = (profile?.display_name || profile?.full_name || 'A')
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-[#f0f0f1] text-[#1d2327] font-wp flex flex-col">
      {/* ====================================================================
          TOP WORDPRESS ADMIN BAR (#1d2327)
         ==================================================================== */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-[46px] md:h-[32px] bg-[#1d2327] text-[#f0f0f1] flex items-center justify-between px-1 md:px-2 text-[13px] select-none"
        onMouseLeave={() => setOpenDropdown(null)}
      >
        {/* Left Zone */}
        <div className="flex items-center h-full min-w-0">
          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Buka menu navigasi admin"
            className="md:hidden h-full px-2.5 flex items-center justify-center text-[#f0f0f1] hover:bg-[#2c3338] hover:text-[#72aee6] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand / WP Icon Dropdown */}
          <div
            className="relative h-full"
            onMouseEnter={() => setOpenDropdown('brand')}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'brand' ? null : 'brand')}
              aria-label="Menu HKBP CMS"
              className={`h-full px-2.5 flex items-center gap-1.5 hover:bg-[#2c3338] hover:text-[#72aee6] cursor-pointer ${
                openDropdown === 'brand' ? 'bg-[#2c3338] text-[#72aee6]' : ''
              }`}
            >
              <HkbpLogo className="w-5 h-5" variant="monochrome-light" />
            </button>
            {openDropdown === 'brand' && (
              <div className="absolute left-0 top-full w-48 bg-[#2c3338] text-[#f0f0f1] shadow-lg py-1.5 border border-[#1d2327] z-50">
                <Link
                  to="/admin"
                  className="block px-3.5 py-1.5 text-[13px] hover:text-[#72aee6]"
                >
                  Tentang HKBP CMS
                </Link>
                <Link
                  to="/"
                  className="block px-3.5 py-1.5 text-[13px] hover:text-[#72aee6]"
                >
                  Portal Publik Huria
                </Link>
                <a
                  href="https://hkbp.or.id"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-3.5 py-1.5 text-[13px] hover:text-[#72aee6]"
                >
                  <span>Situs HKBP Pusat</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            )}
          </div>

          {/* Site Name -> Lihat Situs */}
          <div
            className="relative h-full"
            onMouseEnter={() => setOpenDropdown('site')}
          >
            <Link
              to="/"
              className={`h-full px-2.5 flex items-center gap-1.5 hover:bg-[#2c3338] hover:text-[#72aee6] whitespace-nowrap ${
                openDropdown === 'site' ? 'bg-[#2c3338] text-[#72aee6]' : ''
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="font-medium truncate max-w-[140px] sm:max-w-none">
                HKBP Ressort Hutaraja
              </span>
            </Link>
            {openDropdown === 'site' && (
              <div className="absolute left-0 top-full w-44 bg-[#2c3338] text-[#f0f0f1] shadow-lg py-1.5 border border-[#1d2327] z-50">
                <Link
                  to="/"
                  className="block px-3.5 py-1.5 text-[13px] hover:text-[#72aee6]"
                >
                  Lihat Situs
                </Link>
              </div>
            )}
          </div>

          {/* + Baru Dropdown */}
          {newMenuItems.length > 0 && (
            <div
              className="relative h-full"
              onMouseEnter={() => setOpenDropdown('new')}
            >
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'new' ? null : 'new')}
                className={`h-full px-2.5 flex items-center gap-1 hover:bg-[#2c3338] hover:text-[#72aee6] cursor-pointer whitespace-nowrap ${
                  openDropdown === 'new' ? 'bg-[#2c3338] text-[#72aee6]' : ''
                }`}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Baru</span>
              </button>
              {openDropdown === 'new' && (
                <div className="absolute left-0 top-full w-44 bg-[#2c3338] text-[#f0f0f1] shadow-lg py-1.5 border border-[#1d2327] z-50">
                  {newMenuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-3.5 py-1.5 text-[13px] hover:text-[#72aee6]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Zone: Preview Role Switcher (hanya mode pratinjau lokal) + Halo, [nama] */}
        <div className="flex items-center h-full gap-1">
          {isPreviewSession && (
            <div className="hidden lg:flex items-center gap-1.5 mr-2 px-2 py-0.5 bg-[#2c3338] border border-[#50575e] rounded-[2px] text-[11px] text-[#f0f0f1]">
              <span className="text-[#dba617] font-medium">Mode Pratinjau:</span>
              <select
                value={profile?.role || 'administrator'}
                onChange={(e) => enterPreviewSession(e.target.value as UserRole)}
                aria-label="Ganti peran pratinjau"
                className="bg-[#1d2327] text-[#f0f0f1] border border-[#50575e] rounded-[2px] px-1.5 py-0.5 text-[11px] focus:outline-none cursor-pointer"
              >
                {(
                  [
                    'administrator',
                    'pendeta',
                    'sekretaris',
                    'bendahara',
                    'editor',
                    'penulis',
                    'kontributor',
                  ] as UserRole[]
                ).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Howdy / Halo, [nama] */}
          <div
            className="relative h-full"
            onMouseEnter={() => setOpenDropdown('user')}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'user' ? null : 'user')}
              className={`h-full px-2.5 flex items-center gap-2 hover:bg-[#2c3338] hover:text-[#72aee6] cursor-pointer whitespace-nowrap ${
                openDropdown === 'user' ? 'bg-[#2c3338] text-[#72aee6]' : ''
              }`}
            >
              <span className="hidden sm:inline">
                Halo, <span className="font-medium">{profile?.display_name || 'Pengurus'}</span>
              </span>
              <span className="w-5 h-5 bg-[#2271b1] text-white text-[10px] font-semibold flex items-center justify-center rounded-[2px] shrink-0">
                {initials}
              </span>
            </button>

            {openDropdown === 'user' && (
              <div className="absolute right-0 top-full w-60 bg-[#2c3338] text-[#f0f0f1] shadow-lg p-3 border border-[#1d2327] z-50">
                <div className="flex items-start gap-3 pb-2.5 border-b border-[#3c434a]">
                  <div className="w-12 h-12 bg-[#2271b1] text-white text-base font-semibold flex items-center justify-center rounded-[2px] shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">
                      {profile?.display_name}
                    </p>
                    <p className="text-[12px] text-[#c3c4c7] truncate">
                      {profile ? ROLE_LABELS[profile.role] : ''}
                    </p>
                    <p className="text-[11px] text-[#a7aaad] truncate mt-0.5">
                      {profile?.email}
                    </p>
                  </div>
                </div>
                <div className="pt-2 flex flex-col gap-1">
                  <Link
                    to="/admin/profile"
                    className="flex items-center gap-2 px-1.5 py-1 text-[13px] hover:text-[#72aee6]"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Sunting Profil</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-1.5 py-1 text-[13px] text-left hover:text-[#72aee6] cursor-pointer w-full"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ====================================================================
          BODY WRAPPER (SIDEBAR KIRI + KONTEN UTAMA)
         ==================================================================== */}
      <div className="flex flex-1 pt-[46px] md:pt-[32px]">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Kiri Gelap (#1d2327) */}
        <aside
          aria-label="Menu navigasi admin"
          onScroll={() => setHoveredFlyout(null)}
          className={`fixed md:sticky top-[46px] md:top-[32px] left-0 z-40 h-[calc(100vh-46px)] md:h-[calc(100vh-32px)] bg-[#1d2327] text-[#f0f0f1] shrink-0 transition-transform md:transition-none duration-200 overflow-y-auto flex flex-col justify-between select-none ${
            mobileMenuOpen ? 'translate-x-0 w-[200px]' : '-translate-x-full md:translate-x-0'
          } ${sidebarCollapsed ? 'md:w-[36px]' : 'md:w-[160px]'}`}
        >
          <nav className="py-2 flex-1">
            <ul className="space-y-0.5">
              {menuEntries.map((entry) => {
                const IconComp = ICON_MAP[entry.iconName] || Gauge;
                const active = isMenuActive(entry);
                const hasSubmenus = Boolean(entry.submenus && entry.submenus.length > 0);
                const isFlyoutOpen = hoveredFlyout?.entry.id === entry.id;

                return (
                  <React.Fragment key={entry.id}>
                    <li
                      className="relative"
                      onMouseEnter={(e) => {
                        cancelCloseFlyout();
                        if (!hasSubmenus || (active && !sidebarCollapsed)) {
                          setHoveredFlyout(null);
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const subCount = entry.submenus?.length || 0;
                        const estimatedHeight =
                          (sidebarCollapsed ? 32 : 0) + subCount * 30 + 16;
                        const opensUpward = rect.top + estimatedHeight > window.innerHeight - 8;
                        setHoveredFlyout({
                          entry,
                          left: Math.round(rect.right),
                          top: opensUpward ? undefined : Math.max(34, Math.round(rect.top)),
                          bottom: opensUpward
                            ? Math.max(8, Math.round(window.innerHeight - rect.bottom))
                            : undefined,
                        });
                      }}
                      onMouseLeave={scheduleCloseFlyout}
                    >
                      <Link
                        to={entry.path}
                        title={sidebarCollapsed ? entry.label : undefined}
                        className={`relative flex items-center gap-2 px-2.5 py-[7px] text-[13px] leading-[1.3] transition-colors ${
                          active
                            ? 'bg-[#2271b1] text-white font-semibold'
                            : isFlyoutOpen
                              ? 'bg-[#191e23] text-[#72aee6]'
                              : 'text-[#f0f0f1] hover:bg-[#191e23] hover:text-[#72aee6]'
                        }`}
                      >
                        <IconComp
                          className={`w-[17px] h-[17px] shrink-0 ${
                            active ? 'text-white' : 'text-[#a7aaad]'
                          }`}
                        />
                        {!sidebarCollapsed && (
                          <span className="truncate flex-1">{entry.label}</span>
                        )}
                        {/* Panah segitiga khas WordPress di item aktif */}
                        {active && (
                          <span
                            aria-hidden="true"
                            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-r-[8px] border-r-[#f0f0f1]"
                          />
                        )}
                      </Link>

                      {/* Submenu terbuka di bawah item aktif (ketika sidebar tidak collapsed) */}
                      {!sidebarCollapsed && active && hasSubmenus && (
                        <ul className="bg-[#2c3338] py-1.5">
                          {entry.submenus!.map((sub) => {
                            const subActive = isSubmenuActive(sub.path);
                            return (
                              <li key={sub.path}>
                                <Link
                                  to={sub.path}
                                  className={`block pl-8 pr-2.5 py-1 text-[12px] leading-[1.4] ${
                                    subActive
                                      ? 'text-white font-semibold'
                                      : 'text-[#c3c4c7] hover:text-[#72aee6]'
                                  }`}
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>

                    {entry.separatorAfter && (
                      <li aria-hidden="true" className="my-2 border-t border-[#2c3338]" />
                    )}
                  </React.Fragment>
                );
              })}
            </ul>
          </nav>

          {/* Collapse Menu Toggle */}
          <div className="hidden md:block border-t border-[#2c3338] py-1">
            <button
              type="button"
              onClick={() => {
                setHoveredFlyout(null);
                setSidebarCollapsed((c) => !c);
              }}
              title={sidebarCollapsed ? 'Bentangkan menu' : 'Ciutkan menu'}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-[12px] text-[#a7aaad] hover:text-[#72aee6] cursor-pointer"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span className="truncate">Ciutkan menu</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Flyout Submenu Fixed (terjepit ke viewport agar tidak menyebabkan scrollbar / kedip saat hover item bawah seperti Pengaturan) */}
        {hoveredFlyout && hoveredFlyout.entry.submenus && (
          <div
            onMouseEnter={cancelCloseFlyout}
            onMouseLeave={scheduleCloseFlyout}
            style={{
              left: `${hoveredFlyout.left}px`,
              top: hoveredFlyout.top !== undefined ? `${hoveredFlyout.top}px` : undefined,
              bottom: hoveredFlyout.bottom !== undefined ? `${hoveredFlyout.bottom}px` : undefined,
            }}
            className="hidden md:block fixed min-w-[175px] max-h-[calc(100vh-48px)] overflow-y-auto bg-[#2c3338] text-[#f0f0f1] shadow-[0_3px_8px_rgba(0,0,0,0.28)] py-1.5 z-50 border border-[#1d2327] border-l-0"
          >
            {sidebarCollapsed && (
              <div className="px-3 py-1.5 text-[12px] font-semibold text-white border-b border-[#3c434a] mb-1">
                {hoveredFlyout.entry.label}
              </div>
            )}
            {hoveredFlyout.entry.submenus.map((sub) => (
              <Link
                key={sub.path}
                to={sub.path}
                onClick={() => setHoveredFlyout(null)}
                className={`block px-3 py-1.5 text-[12px] whitespace-nowrap ${
                  isSubmenuActive(sub.path)
                    ? 'text-white font-semibold'
                    : 'text-[#c3c4c7] hover:text-[#72aee6]'
                }`}
              >
                {sub.label}
              </Link>
            ))}
          </div>
        )}

        {/* ==================================================================
            MAIN CONTENT AREA (#f0f0f1)
           ================================================================== */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <main className="px-4 sm:px-5 pb-8">
            {/* WordPress Screen Options & Help Drawer + Tabs */}
            <div className="relative">
              {openDrawer === 'screen' && (
                <div className="bg-white border border-t-0 border-[#c3c4c7] px-5 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.04)] text-[13px]">
                  <p className="font-semibold text-[#1d2327] mb-2">Elemen Layar Dasbor</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mb-2">
                    {(
                      [
                        ['sekilas', 'Sekilas'],
                        ['aktivitas', 'Aktivitas'],
                        ['draf_cepat', 'Draf Cepat'],
                        ['berita_acara', 'Berita & Acara Huria'],
                        ['jemaat_wijk', 'Jemaat per Wijk'],
                        ['ulang_tahun', 'Ulang Tahun Minggu Ini'],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="inline-flex items-center gap-1.5 text-[#3c434a] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={widgetVisibility[key]}
                          onChange={() => toggleWidgetVisibility(key)}
                          className="rounded-[2px] border-[#8c8f94] text-[#2271b1]"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {screenOptionsExtra}
                </div>
              )}

              {openDrawer === 'help' && (
                <div className="bg-white border border-t-0 border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] text-[13px]">
                  <div className="flex flex-col sm:flex-row min-h-[150px]">
                    <div className="sm:w-44 bg-[#f6f7f7] border-b sm:border-b-0 sm:border-r border-[#c3c4c7]">
                      {(helpTabs.length > 0
                        ? helpTabs
                        : [
                            {
                              id: 'ringkasan',
                              title: 'Ringkasan',
                              content: (
                                <p>
                                  Selamat datang di Dasbor HKBP Ressort Hutaraja. Gunakan menu sebelah kiri untuk mengelola berita, warta jemaat, jadwal ibadah, data jemaat per wijk, dan pengaturan situs.
                                </p>
                              ),
                            },
                            {
                              id: 'peran',
                              title: 'Hak Akses Peran',
                              content: (
                                <p>
                                  Setiap pengguna hanya melihat menu sesuai perannya. Modul Keuangan hanya dapat diakses oleh Administrator dan Pendeta.
                                </p>
                              ),
                            },
                          ]
                      ).map((tab) => {
                        const isTabActive =
                          (activeHelpTabId || helpTabs[0]?.id || 'ringkasan') === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveHelpTabId(tab.id)}
                            className={`w-full text-left px-3.5 py-2 text-[13px] cursor-pointer border-l-2 ${
                              isTabActive
                                ? 'bg-white border-l-[#2271b1] text-[#1d2327] font-semibold'
                                : 'border-l-transparent text-[#50575e] hover:text-[#1d2327]'
                            }`}
                          >
                            {tab.title}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex-1 p-4 text-[#3c434a] leading-relaxed">
                      {(helpTabs.length > 0
                        ? helpTabs
                        : [
                            {
                              id: 'ringkasan',
                              title: 'Ringkasan',
                              content: (
                                <p>
                                  Selamat datang di Dasbor HKBP Ressort Hutaraja. Gunakan menu sebelah kiri untuk mengelola berita, warta jemaat, jadwal ibadah, data jemaat per wijk, dan pengaturan situs.
                                </p>
                              ),
                            },
                            {
                              id: 'peran',
                              title: 'Hak Akses Peran',
                              content: (
                                <p>
                                  Setiap pengguna hanya melihat menu sesuai perannya. Modul Keuangan hanya dapat diakses oleh Administrator dan Pendeta.
                                </p>
                              ),
                            },
                          ]
                      ).find(
                        (t) =>
                          t.id === (activeHelpTabId || helpTabs[0]?.id || 'ringkasan')
                      )?.content}
                    </div>
                  </div>
                </div>
              )}

              {/* Screen Options & Help Top-Right Tabs */}
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDrawer((d) => (d === 'screen' ? null : 'screen'))
                  }
                  className="inline-flex items-center gap-1 bg-white border border-t-0 border-[#c3c4c7] rounded-b-[3px] px-3 py-1 text-[12px] text-[#50575e] hover:text-[#1d2327] shadow-[0_1px_1px_rgba(0,0,0,0.04)] cursor-pointer"
                >
                  <span>Opsi Layar</span>
                  {openDrawer === 'screen' ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDrawer((d) => (d === 'help' ? null : 'help'))}
                  className="inline-flex items-center gap-1 bg-white border border-t-0 border-[#c3c4c7] rounded-b-[3px] px-3 py-1 text-[12px] text-[#50575e] hover:text-[#1d2327] shadow-[0_1px_1px_rgba(0,0,0,0.04)] cursor-pointer"
                >
                  <span>Bantuan</span>
                  {openDrawer === 'help' ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Dismissible WordPress Admin Notices */}
            {notices.length > 0 && (
              <div className="mt-3 space-y-2">
                {notices.map((notice) => {
                  const borderColor =
                    notice.type === 'success'
                      ? 'border-l-[#00a32a]'
                      : notice.type === 'warning'
                        ? 'border-l-[#dba617]'
                        : notice.type === 'error'
                          ? 'border-l-[#d63638]'
                          : 'border-l-[#72aee6]';
                  return (
                    <div
                      key={notice.id}
                      role="status"
                      className={`bg-white border border-[#c3c4c7] border-l-4 ${borderColor} px-3.5 py-2.5 pr-9 relative text-[13px] text-[#1d2327] shadow-[0_1px_1px_rgba(0,0,0,0.04)]`}
                    >
                      <span>{notice.message}</span>
                      {notice.linkTo && notice.linkLabel && (
                        <Link
                          to={notice.linkTo}
                          className="ml-2 text-[#2271b1] underline hover:text-[#135e96]"
                        >
                          {notice.linkLabel}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => dismissNotice(notice.id)}
                        aria-label="Tutup pemberitahuan"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#787c82] hover:text-[#1d2327] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Child Route Content */}
            <Outlet />
          </main>

          {/* WordPress Admin Footer */}
          <footer className="px-5 py-3 text-[12px] text-[#50575e] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#dcdcde]/60">
            <p className="italic">
              Terima kasih telah berkarya bersama{' '}
              <span className="font-medium not-italic text-[#1d2327]">
                HKBP Hutaraja
              </span>
              .
            </p>
            <p className="tabular-nums">Versi 1.0 — HKBP Ressort Hutaraja</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
