import type { AdminMenuEntry, UserRole } from '../types/cms';

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  pendeta: 'Pendeta',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  editor: 'Editor',
  penulis: 'Penulis (Multimedia)',
  kontributor: 'Kontributor',
  jemaat: 'Jemaat',
};

export type Capability =
  | 'access_admin'
  | 'read_dashboard'
  | 'manage_posts'
  | 'publish_posts'
  | 'manage_media'
  | 'manage_pages'
  | 'manage_comments'
  | 'manage_warta'
  | 'manage_jadwal'
  | 'manage_jemaat'
  | 'manage_galeri'
  | 'manage_kehadiran'
  | 'manage_keuangan'
  | 'manage_appearance'
  | 'manage_users'
  | 'manage_settings'
  | 'edit_own_profile';

const ROLE_CAPABILITIES: Record<UserRole, Capability[]> = {
  administrator: [
    'access_admin',
    'read_dashboard',
    'manage_posts',
    'publish_posts',
    'manage_media',
    'manage_pages',
    'manage_comments',
    'manage_warta',
    'manage_jadwal',
    'manage_jemaat',
    'manage_galeri',
    'manage_kehadiran',
    'manage_keuangan',
    'manage_appearance',
    'manage_users',
    'manage_settings',
    'edit_own_profile',
  ],
  pendeta: [
    'access_admin',
    'read_dashboard',
    'manage_posts',
    'publish_posts',
    'manage_media',
    'manage_pages',
    'manage_comments',
    'manage_warta',
    'manage_jadwal',
    'manage_jemaat',
    'manage_galeri',
    'manage_kehadiran',
    'manage_keuangan',
    'edit_own_profile',
  ],
  sekretaris: [
    'access_admin',
    'read_dashboard',
    'manage_posts',
    'publish_posts',
    'manage_media',
    'manage_pages',
    'manage_comments',
    'manage_warta',
    'manage_jadwal',
    'manage_jemaat',
    'manage_galeri',
    'manage_kehadiran',
    'edit_own_profile',
  ],
  bendahara: [
    'access_admin',
    'read_dashboard',
    'manage_kehadiran',
    'edit_own_profile',
  ],
  editor: [
    'access_admin',
    'read_dashboard',
    'manage_posts',
    'publish_posts',
    'manage_media',
    'manage_pages',
    'manage_comments',
    'manage_warta',
    'manage_jadwal',
    'manage_galeri',
    'manage_appearance',
    'edit_own_profile',
  ],
  penulis: [
    'access_admin',
    'read_dashboard',
    'manage_posts',
    'publish_posts',
    'manage_media',
    'manage_warta',
    'manage_galeri',
    'edit_own_profile',
  ],
  kontributor: [
    'access_admin',
    'read_dashboard',
    'manage_posts',
    'edit_own_profile',
  ],
  jemaat: ['edit_own_profile'],
};

export function hasCapability(role: UserRole | undefined | null, cap: Capability | string): boolean {
  if (!role) return false;
  const caps = ROLE_CAPABILITIES[role] ?? [];
  return caps.includes(cap as Capability);
}

export function getAdminMenuForRole(
  role: UserRole | undefined | null,
  pendingCommentsCount = 0
): AdminMenuEntry[] {
  const allMenus: AdminMenuEntry[] = [
    {
      id: 'dashboard',
      label: 'Dasbor',
      path: '/admin',
      iconName: 'Gauge',
      capability: 'read_dashboard',
      submenus: [
        { label: 'Beranda', path: '/admin' },
        { label: 'Pembaruan', path: '/admin/updates' },
      ],
    },
    {
      id: 'posts',
      label: 'Pos',
      path: '/admin/posts',
      iconName: 'Pin',
      capability: 'manage_posts',
      submenus: [
        { label: 'Semua Pos', path: '/admin/posts' },
        { label: 'Tambah Baru', path: '/admin/posts/new' },
        { label: 'Kategori', path: '/admin/posts/categories', capability: 'publish_posts' },
        { label: 'Tag', path: '/admin/posts/tags', capability: 'publish_posts' },
      ],
    },
    {
      id: 'media',
      label: 'Media',
      path: '/admin/media',
      iconName: 'Image',
      capability: 'manage_media',
      submenus: [
        { label: 'Pustaka Media', path: '/admin/media' },
        { label: 'Tambah Baru', path: '/admin/media/new' },
      ],
    },
    {
      id: 'pages',
      label: 'Halaman',
      path: '/admin/pages',
      iconName: 'FileText',
      capability: 'manage_pages',
      submenus: [
        { label: 'Semua Halaman', path: '/admin/pages' },
        { label: 'Tambah Baru', path: '/admin/pages/new' },
      ],
    },
    {
      id: 'comments',
      label: 'Komentar',
      path: '/admin/comments',
      iconName: 'MessageSquare',
      capability: 'manage_comments',
      badgeCount: pendingCommentsCount,
      separatorAfter: true,
    },
    {
      id: 'warta',
      label: 'Warta Jemaat',
      path: '/admin/warta',
      iconName: 'Newspaper',
      capability: 'manage_warta',
      submenus: [
        { label: 'Semua Warta', path: '/admin/warta' },
        { label: 'Tambah Baru', path: '/admin/warta/new' },
      ],
    },
    {
      id: 'jadwal',
      label: 'Jadwal Ibadah',
      path: '/admin/jadwal',
      iconName: 'CalendarDays',
      capability: 'manage_jadwal',
      submenus: [
        { label: 'Ibadah Minggu', path: '/admin/jadwal' },
        { label: 'PHD Lingkungan', path: '/admin/jadwal/phd' },
      ],
    },
    {
      id: 'jemaat',
      label: 'Jemaat',
      path: '/admin/jemaat',
      iconName: 'UsersRound',
      capability: 'manage_jemaat',
      submenus: [
        { label: 'Data Jemaat', path: '/admin/jemaat' },
        { label: 'Import XLSX', path: '/admin/jemaat/import' },
        { label: 'Ulang Tahun', path: '/admin/jemaat/ulang-tahun' },
        { label: 'Ulang Tahun Pernikahan', path: '/admin/jemaat/pernikahan' },
      ],
    },
    {
      id: 'galeri',
      label: 'Galeri',
      path: '/admin/galeri',
      iconName: 'Images',
      capability: 'manage_galeri',
      submenus: [
        { label: 'Album', path: '/admin/galeri' },
        { label: 'Tambah Album', path: '/admin/galeri/new' },
      ],
    },
    {
      id: 'kehadiran',
      label: 'Kehadiran Ibadah',
      path: '/admin/kehadiran',
      iconName: 'ClipboardCheck',
      capability: 'manage_kehadiran',
    },
    {
      id: 'keuangan',
      label: 'Keuangan',
      path: '/admin/keuangan',
      iconName: 'Wallet',
      capability: 'manage_keuangan',
      separatorAfter: true,
    },
    {
      id: 'appearance',
      label: 'Tampilan',
      path: '/admin/appearance/menus',
      iconName: 'Paintbrush',
      capability: 'manage_appearance',
      submenus: [
        { label: 'Menu', path: '/admin/appearance/menus' },
        { label: 'Widget', path: '/admin/appearance/widgets' },
        { label: 'Sesuaikan Tema', path: '/admin/appearance/customize' },
      ],
    },
    {
      id: 'users',
      label: 'Pengguna',
      path: '/admin/users',
      iconName: 'UserCog',
      capability: 'edit_own_profile',
      submenus: [
        { label: 'Semua Pengguna', path: '/admin/users', capability: 'manage_users' },
        { label: 'Tambah Baru', path: '/admin/users/new', capability: 'manage_users' },
        { label: 'Profil Saya', path: '/admin/profile', capability: 'edit_own_profile' },
      ],
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      path: '/admin/settings/general',
      iconName: 'SlidersHorizontal',
      capability: 'manage_settings',
      submenus: [
        { label: 'Umum', path: '/admin/settings/general' },
        { label: 'Penulisan', path: '/admin/settings/writing' },
        { label: 'Membaca', path: '/admin/settings/reading' },
        { label: 'Diskusi', path: '/admin/settings/discussion' },
        { label: 'Media', path: '/admin/settings/media' },
        { label: 'Permalink', path: '/admin/settings/permalink' },
      ],
    },
  ];

  return allMenus
    .filter((item) => hasCapability(role, item.capability))
    .map((item) => ({
      ...item,
      submenus: item.submenus?.filter(
        (sub) => !sub.capability || hasCapability(role, sub.capability)
      ),
    }))
    .filter((item) => !item.submenus || item.submenus.length > 0);
}
