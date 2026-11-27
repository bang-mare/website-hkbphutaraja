import { isSupabaseConfigured, supabase } from './supabase';
import { getMediaProxyUrl } from './mediaClient';
import type {
  ChurchProfileData,
  HomepageSectionConfig,
  HomepageSectionId,
  IbadahMinggu,
  MenuItemRecord,
  MenuLocation,
  MenuRecord,
  PhdLingkungan,
  PostRecord,
  PostType,
  SiteOptionsMap,
  Term,
  WidgetArea,
  WidgetRecord,
  Wijk,
} from '../types/cms';

export const DEFAULT_HOMEPAGE_LAYOUT: HomepageSectionConfig[] = [
  {
    id: 'hero',
    enabled: true,
    subtitle: 'Distrik VI Dairi · Huria Kristen Batak Protestan',
    description:
      'Melayani persekutuan (Koinonia), kesaksian (Marturia), dan pelayanan kasih (Diakonia) bagi seluruh ruas ni huria yang tersebar di enam lingkungan (Wijk) pelayanan.',
    variant: 'split',
  },
  {
    id: 'quick_links',
    enabled: true,
    columns: 3,
  },
  {
    id: 'announcements',
    enabled: true,
    title: 'Pengumuman',
  },
  {
    id: 'jemaat_stats',
    enabled: true,
    subtitle: 'Statistik Ruas Ni Huria (Aktif)',
    title: 'Skala Pelayanan & Demografi Jemaat',
  },
  {
    id: 'schedule',
    enabled: true,
    subtitle: 'Jadwal Pelayanan Terdekat',
    title: 'Ibadah Minggu & Kategorial',
    columns: 3,
    limit: 3,
  },
  {
    id: 'warta',
    enabled: true,
    subtitle: 'Tingting Huria',
    title: 'Warta Jemaat Terbaru',
    columns: 3,
    limit: 3,
  },
  {
    id: 'news',
    enabled: true,
    subtitle: 'Publikasi & Renungan',
    title: 'Berita & Artikel Huria',
    columns: 4,
    limit: 4,
  },
  {
    id: 'wijk',
    enabled: true,
    subtitle: 'Persekutuan Jemaat',
    title: 'Enam Lingkungan (Wijk) Pelayanan',
    columns: 3,
  },
  {
    id: 'contact',
    enabled: true,
    variant: 'banner',
  },
];

export function normalizeHomepageLayout(
  raw?: HomepageSectionConfig[] | null
): HomepageSectionConfig[] {
  const defaultMap = new Map<HomepageSectionId, HomepageSectionConfig>(
    DEFAULT_HOMEPAGE_LAYOUT.map((item) => [item.id, item])
  );
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_HOMEPAGE_LAYOUT.map((item) => ({ ...item }));
  }

  const seen = new Set<HomepageSectionId>();
  const result: HomepageSectionConfig[] = [];

  for (const item of raw) {
    if (!item || !defaultMap.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    const base = defaultMap.get(item.id)!;
    const validCols =
      item.columns === 1 || item.columns === 2 || item.columns === 3 || item.columns === 4
        ? item.columns
        : base.columns;
    const validLimit =
      typeof item.limit === 'number' && Number.isFinite(item.limit)
        ? Math.max(1, Math.min(12, Math.round(item.limit)))
        : base.limit;
    const validVariant =
      item.variant === 'split' ||
      item.variant === 'centered' ||
      item.variant === 'banner' ||
      item.variant === 'compact'
        ? item.variant
        : base.variant;

    result.push({
      id: item.id,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : base.enabled,
      title: typeof item.title === 'string' ? item.title : base.title,
      subtitle: typeof item.subtitle === 'string' ? item.subtitle : base.subtitle,
      description:
        typeof item.description === 'string' ? item.description : base.description,
      columns: validCols,
      limit: validLimit,
      variant: validVariant,
    });
  }

  for (const base of DEFAULT_HOMEPAGE_LAYOUT) {
    if (!seen.has(base.id)) {
      result.push({ ...base });
    }
  }

  return result;
}

export const DEFAULT_CHURCH_PROFILE: ChurchProfileData = {
  eyebrow: 'INFO HURIA · PROFIL GEREJA',
  page_title: 'Profil & Struktur HKBP Ressort Hutaraja',
  page_subtitle:
    'Sejarah penginjilan HKBP & jemaat lokal, visi-misi & konfesi, direktori Parhalado, fungsionaris gereja, serta Huria Pagaran.',
  sejarah_umum_title: 'Sejarah Singkat HKBP Umum (RMG & I.L. Nommensen)',
  sejarah_umum_body:
    'Huria Kristen Batak Protestan (HKBP) lahir dari karya pekabaran Injil di Tanah Batak oleh para penginjil Rhenish Missionary Society (RMG) dari Jerman, yang berpuncak pada penetapan berdirinya HKBP pada 7 Oktober 1861 di Sipirok dan pelayanan Dr. Ingwer Ludwig Nommensen (Apostel ni Halak Batak).',
  sejarah_lokal_title: 'Sejarah Jemaat Lokal HKBP Ressort Hutaraja',
  sejarah_lokal_body:
    'HKBP Ressort Hutaraja (Distrik VI Dairi) berdiri dari semangat persekutuan warga Kristen Batak di wilayah Siempat Nempu, Kabupaten Dairi. Jemaat berkembang melayani 6 Wijk (Letare, Exaudi, Judika, Galatia, Efesus, dan Jeremia) dalam semangat Koinonia, Marturia, dan Diakonia.',
  visi_title: 'Visi Pelayanan Huria',
  visi_body:
    'Menjadi gereja yang inklusif, berakar kuat pada Firman Tuhan, serta menghadirkan damai sejahtera di tengah enam lingkungan (Wijk), gereja pagaran, dan masyarakat Kabupaten Dairi.',
  misi_items: [
    'Koinonia (Persekutuan): Memperkuat persekutuan ibadah minggu, PHD Lingkungan di 6 Wijk, serta pembinaan kategorial Sekolah Minggu, Remaja, Naposobulung, Ama, Ina, dan Lansia.',
    'Marturia (Kesaksian): Memberitakan Injil Kristus melalui pekabaran firman, katekisasi sidi, paduan suara, dan kesaksian hidup warga jemaat di tengah masyarakat.',
    'Diakonia (Pelayanan Kasih): Menggerakkan kepedulian sosial, kunjungan pastoral keluarga, beasiswa pendidikan, dan pelayanan diakonia yang transparan serta akuntabel.',
  ],
  konfesi_title: 'Konfesi HKBP (Pengakuan Iman)',
  konfesi_body:
    'Sebagai bagian dari gereja reformasi Lutheran di Indonesia, HKBP Ressort Hutaraja berpegang teguh pada Alkitab (Perjanjian Lama & Perjanjian Baru) sebagai sumber kebenaran tertinggi, tiga Pengakuan Iman Oikumenis (Rasuli, Nicea-Konstantinopel, Athanasius), serta Konfesi HKBP Tahun 1951 dan 1996.',
  konfesi_points: [
    'Keselamatan hanya oleh kasih karunia Allah di dalam Yesus Kristus melalui iman (Sola Gratia, Sola Fide, Sola Scriptura).',
    'Gereja adalah persekutuan orang percaya yang kudus dan am, dipanggil memberitakan firman dan melayani dua sakramen: Baptisan Kudus dan Perjamuan Kudus.',
    'Pengakuan iman HKBP meneguhkan tanggung jawab orang percaya terhadap keluarga, kebudayaan Batak yang ditransformasi Injil, keadilan sosial, dan pelestarian ciptaan.',
  ],
  leaders: [
    {
      id: 'ldr-1',
      role: 'Pendeta Ressort',
      name: 'Pdt. (Pendeta Ressort Hutaraja)',
      desc: 'Pemimpin umum ressort, pelayanan firman, sakramen, serta penggembalaan jemaat di induk maupun pagaran.',
    },
    {
      id: 'ldr-2',
      role: 'Guru Huria',
      name: 'Gr. (Guru Huria Induk)',
      desc: 'Pembinaan katekisasi sidi, pengajaran Sekolah Minggu, liturgi jemaat, dan administrasi pelayanan gerejawi.',
    },
    {
      id: 'ldr-3',
      role: 'Bibelvrouw',
      name: 'Bvr. (Bibelvrouw Ressort)',
      desc: 'Pelayanan firman bagi Punguan Ina, kaum perempuan, diakonia sosial, dan kunjungan pastoral keluarga.',
    },
    {
      id: 'ldr-4',
      role: 'Sekretaris & Bendahara Huria',
      name: 'St. (Sekretaris / Parartaon)',
      desc: 'Pengelolaan tata usaha kesekretariatan, registrasi database jemaat, serta pelaporan keuangan yang transparan.',
    },
  ],
  functionaries: [
    {
      id: 'fn-1',
      unit: 'Dewan Koinonia',
      chairperson: 'Ketua Dewan Koinonia',
      members: 'Seksi Sekolah Minggu, Remaja, Naposobulung, Parompuan, Ama, dan Lansia',
      desc: 'Mengkoordinasikan seluruh persekutuan kategorial dan pembinaan kerohanian antar-generasi.',
    },
    {
      id: 'fn-2',
      unit: 'Dewan Marturia',
      chairperson: 'Ketua Dewan Marturia',
      members: 'Seksi Pekabaran Injil & Seksi Musik / Song Leader / Koor',
      desc: 'Membina pelayanan musik gerejawi, paduan suara, liturgi ibadah, serta pekabaran Injil di lingkungan dan pagaran.',
    },
    {
      id: 'fn-3',
      unit: 'Dewan Diakonia',
      chairperson: 'Ketua Dewan Diakonia',
      members: 'Seksi Diakoni Sosial, Kesehatan, Pendidikan, dan Kemasyarakatan',
      desc: 'Menyalurkan diakonia duka/sakit, bantuan pendidikan, serta pelayanan kasih bagi jemaat dan warga sekitar.',
    },
    {
      id: 'fn-4',
      unit: 'Parartaon & Badan Audit Huria',
      chairperson: 'Ketua Parartaon & Tim Pemeriksa Keuangan',
      members: 'Majelis Perbendaharaan, Bendahara Huria, dan Tim Audit Internal',
      desc: 'Menjaga aset gereja, menyusun anggaran tahunan huria, serta mengaudit pembukuan kas jemaat dan sentralisasi.',
    },
  ],
  pagaran: [
    {
      id: 'pg-1',
      name: 'HKBP Hutaraja (Huria Sabungan / Induk)',
      location: 'Jl. Persada No. 205 Sidikalang / Kec. Siempat Nempu, Kab. Dairi',
      leader: 'Pdt. Ressort & Majelis Parhalado (6 Wijk)',
      service_time: 'Minggu Pagi 08.00 WIB · Minggu Siang 10.30 WIB',
      notes: 'Pusat administrasi dan pelayanan HKBP Ressort Hutaraja Distrik VI Dairi.',
    },
    {
      id: 'pg-2',
      name: 'HKBP Pagaran I (Gereja Pagaran)',
      location: 'Wilayah Pelayanan Ressort Hutaraja, Kab. Dairi',
      leader: 'Uluan Huria & Majelis Sintua Pagaran',
      service_time: 'Minggu Pagi / Siang 10.00 WIB',
      notes: 'Melayani jemaat di wilayah pagaran bersama pembinaan berkala dari Pendeta Ressort.',
    },
    {
      id: 'pg-3',
      name: 'HKBP Pagaran II (Gereja Pagaran)',
      location: 'Wilayah Pelayanan Ressort Hutaraja, Kab. Dairi',
      leader: 'Uluan Huria & Majelis Sintua Pagaran',
      service_time: 'Minggu 10.00 WIB',
      notes: 'Persekutuan ibadah minggu, Sekolah Minggu, dan PHD lingkungan pagaran.',
    },
  ],
};

export function normalizeChurchProfile(
  raw?: Partial<ChurchProfileData> | null
): ChurchProfileData {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_CHURCH_PROFILE,
      misi_items: [...DEFAULT_CHURCH_PROFILE.misi_items],
      konfesi_points: [...DEFAULT_CHURCH_PROFILE.konfesi_points],
      leaders: DEFAULT_CHURCH_PROFILE.leaders.map((item) => ({ ...item })),
      functionaries: DEFAULT_CHURCH_PROFILE.functionaries.map((item) => ({ ...item })),
      pagaran: DEFAULT_CHURCH_PROFILE.pagaran.map((item) => ({ ...item })),
    };
  }

  return {
    eyebrow: raw.eyebrow?.trim() || DEFAULT_CHURCH_PROFILE.eyebrow,
    page_title: raw.page_title?.trim() || DEFAULT_CHURCH_PROFILE.page_title,
    page_subtitle: raw.page_subtitle?.trim() || DEFAULT_CHURCH_PROFILE.page_subtitle,
    sejarah_umum_title: raw.sejarah_umum_title?.trim() || DEFAULT_CHURCH_PROFILE.sejarah_umum_title,
    sejarah_umum_body: raw.sejarah_umum_body?.trim() || DEFAULT_CHURCH_PROFILE.sejarah_umum_body,
    sejarah_lokal_title: raw.sejarah_lokal_title?.trim() || DEFAULT_CHURCH_PROFILE.sejarah_lokal_title,
    sejarah_lokal_body: raw.sejarah_lokal_body?.trim() || DEFAULT_CHURCH_PROFILE.sejarah_lokal_body,
    visi_title: raw.visi_title?.trim() || DEFAULT_CHURCH_PROFILE.visi_title,
    visi_body: raw.visi_body?.trim() || DEFAULT_CHURCH_PROFILE.visi_body,
    misi_items:
      Array.isArray(raw.misi_items) && raw.misi_items.length > 0
        ? raw.misi_items.filter((m) => typeof m === 'string' && m.trim().length > 0)
        : [...DEFAULT_CHURCH_PROFILE.misi_items],
    konfesi_title: raw.konfesi_title?.trim() || DEFAULT_CHURCH_PROFILE.konfesi_title,
    konfesi_body: raw.konfesi_body?.trim() || DEFAULT_CHURCH_PROFILE.konfesi_body,
    konfesi_points:
      Array.isArray(raw.konfesi_points) && raw.konfesi_points.length > 0
        ? raw.konfesi_points.filter((p) => typeof p === 'string' && p.trim().length > 0)
        : [...DEFAULT_CHURCH_PROFILE.konfesi_points],
    leaders:
      Array.isArray(raw.leaders) && raw.leaders.length > 0
        ? raw.leaders
        : DEFAULT_CHURCH_PROFILE.leaders.map((item) => ({ ...item })),
    functionaries:
      Array.isArray(raw.functionaries) && raw.functionaries.length > 0
        ? raw.functionaries
        : DEFAULT_CHURCH_PROFILE.functionaries.map((item) => ({ ...item })),
    pagaran:
      Array.isArray(raw.pagaran) && raw.pagaran.length > 0
        ? raw.pagaran
        : DEFAULT_CHURCH_PROFILE.pagaran.map((item) => ({ ...item })),
  };
}

export const DEFAULT_SITE_OPTIONS: SiteOptionsMap = {
  site_title: 'HKBP Ressort Hutaraja',
  site_tagline: 'Distrik VI Dairi — Huria Kristen Batak Protestan',
  site_url: 'https://hkbp-hutaraja.vercel.app',
  admin_email: 'sekretariat@hkbphutaraja.or.id',
  timezone_string: 'Asia/Jakarta',
  date_format: 'd F Y',
  time_format: 'H:i',
  permalink_structure: '/%postname%/',
  posts_per_page: 10,
  max_upload_size_mb: 10,
  allowed_upload_mimes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
  ],
  theme_primary_color: '#0f294a',
  theme_accent_color: '#d97706',
  theme_logo_url: '',
  theme_hero_image_url: '/src/assets/images/church_hero_sanctuary_1795501235668.jpg',
  login_logo_url: '',
  login_title: 'HKBP Ressort Hutaraja',
  login_subtitle: '',
  login_back_text: 'Kembali ke HKBP Ressort Hutaraja',
  church_address: 'Jl. Gereja Hutaraja No. 1, Kec. Siempat Nempu, Kab. Dairi, Sumatera Utara',
  church_phone: '+62 813-6211-0400',
  daily_verse: {
    reference: 'Kolose 2:7',
    text: 'Hendaklah kamu berakar di dalam Dia dan dibangun di atas Dia, hendaklah kamu bertambah teguh dalam iman yang telah diajarkan kepadamu, dan hendaklah hatimu melimpah dengan syukur.',
  },
  homepage_layout: DEFAULT_HOMEPAGE_LAYOUT,
  church_profile: DEFAULT_CHURCH_PROFILE,
};

export const DEFAULT_WIJK: Wijk[] = [
  {
    id: 'w-1',
    name: 'Letare',
    slug: 'letare',
    description: 'Lingkungan (Wijk) Letare HKBP Ressort Hutaraja',
    koordinator_name: 'St. H. Simanjuntak',
    koordinator_phone: '0812-6000-0001',
    sort_order: 1,
  },
  {
    id: 'w-2',
    name: 'Exaudi',
    slug: 'exaudi',
    description: 'Lingkungan (Wijk) Exaudi HKBP Ressort Hutaraja',
    koordinator_name: 'St. R. Lumbantobing',
    koordinator_phone: '0812-6000-0002',
    sort_order: 2,
  },
  {
    id: 'w-3',
    name: 'Judika',
    slug: 'judika',
    description: 'Lingkungan (Wijk) Judika HKBP Ressort Hutaraja',
    koordinator_name: 'St. M. Siregar',
    koordinator_phone: '0812-6000-0003',
    sort_order: 3,
  },
  {
    id: 'w-4',
    name: 'Galatia',
    slug: 'galatia',
    description: 'Lingkungan (Wijk) Galatia HKBP Ressort Hutaraja',
    koordinator_name: 'St. B. Sihombing',
    koordinator_phone: '0812-6000-0004',
    sort_order: 4,
  },
  {
    id: 'w-5',
    name: 'Efesus',
    slug: 'efesus',
    description: 'Lingkungan (Wijk) Efesus HKBP Ressort Hutaraja',
    koordinator_name: 'St. J. Situmorang',
    koordinator_phone: '0812-6000-0005',
    sort_order: 5,
  },
  {
    id: 'w-6',
    name: 'Jeremia',
    slug: 'jeremia',
    description: 'Lingkungan (Wijk) Jeremia HKBP Ressort Hutaraja',
    koordinator_name: 'St. D. Silaban',
    koordinator_phone: '0812-6000-0006',
    sort_order: 6,
  },
];

export const DEFAULT_PROFILE_SUBMENU_ITEMS: MenuItemRecord[] = [
  { id: 'dm-2-sejarah', menu_id: 'default', parent_id: 'dm-2', title: 'Sejarah', item_type: 'custom', object_id: null, url: '/tentang-kami?tab=sejarah', target: '_self', sort_order: 1, created_at: '', updated_at: '' },
  { id: 'dm-2-visi-misi', menu_id: 'default', parent_id: 'dm-2', title: 'Visi, Misi & Konfesi', item_type: 'custom', object_id: null, url: '/tentang-kami?tab=visi-misi', target: '_self', sort_order: 2, created_at: '', updated_at: '' },
  { id: 'dm-2-pimpinan', menu_id: 'default', parent_id: 'dm-2', title: 'Pimpinan, Sintua & Fungsionaris', item_type: 'custom', object_id: null, url: '/tentang-kami?tab=pimpinan', target: '_self', sort_order: 3, created_at: '', updated_at: '' },
  { id: 'dm-2-pagaran', menu_id: 'default', parent_id: 'dm-2', title: 'Huria Pagaran', item_type: 'custom', object_id: null, url: '/tentang-kami?tab=huria-pagaran', target: '_self', sort_order: 4, created_at: '', updated_at: '' },
];

export const DEFAULT_HEADER_MENU_ITEMS: MenuItemRecord[] = [
  { id: 'dm-1', menu_id: 'default', parent_id: null, title: 'Beranda', item_type: 'custom', object_id: null, url: '/', target: '_self', sort_order: 1, created_at: '', updated_at: '' },
  { id: 'dm-2', menu_id: 'default', parent_id: null, title: 'Profil', item_type: 'custom', object_id: null, url: '/tentang-kami', target: '_self', sort_order: 2, created_at: '', updated_at: '' },
  ...DEFAULT_PROFILE_SUBMENU_ITEMS,
  { id: 'dm-3', menu_id: 'default', parent_id: null, title: 'Jadwal Ibadah', item_type: 'custom', object_id: null, url: '/jadwal-ibadah', target: '_self', sort_order: 3, created_at: '', updated_at: '' },
  { id: 'dm-4', menu_id: 'default', parent_id: null, title: 'Warta Jemaat', item_type: 'custom', object_id: null, url: '/warta', target: '_self', sort_order: 4, created_at: '', updated_at: '' },
  { id: 'dm-8', menu_id: 'default', parent_id: null, title: 'Data Jemaat', item_type: 'custom', object_id: null, url: '/data-jemaat', target: '_self', sort_order: 5, created_at: '', updated_at: '' },
  { id: 'dm-5', menu_id: 'default', parent_id: null, title: 'Berita', item_type: 'custom', object_id: null, url: '/berita', target: '_self', sort_order: 6, created_at: '', updated_at: '' },
  { id: 'dm-6', menu_id: 'default', parent_id: null, title: 'Galeri', item_type: 'custom', object_id: null, url: '/galeri', target: '_self', sort_order: 7, created_at: '', updated_at: '' },
  { id: 'dm-7', menu_id: 'default', parent_id: null, title: 'Kontak', item_type: 'custom', object_id: null, url: '/kontak', target: '_self', sort_order: 8, created_at: '', updated_at: '' },
];

export const DEFAULT_WIDGETS: WidgetRecord[] = [
  {
    id: 'dw-1',
    area: 'footer_1',
    widget_type: 'text',
    title: 'HKBP Ressort Hutaraja',
    config: {
      body: 'Distrik VI Dairi, Sumatera Utara. Melayani jemaat dalam persekutuan, kesaksian, dan diakonia.',
    },
    sort_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'dw-2',
    area: 'footer_2',
    widget_type: 'schedule',
    title: 'Jam Ibadah Minggu',
    config: {
      body: 'Ibadah Pagi & Sekolah Minggu: 08.00 WIB\nIbadah Siang (Utama): 10.30 WIB\nPHD Lingkungan: Tengah Minggu',
    },
    sort_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

const SUPABASE_REQUIRED_ERROR =
  'Penyimpanan lokal dinonaktifkan. Hubungkan Supabase (VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY) untuk menyimpan pengaturan ke database.';

// ==============================================================================
// OPTIONS (PENGATURAN & KUSTOMISASI TEMA)
// ==============================================================================
export async function fetchSiteOptions(): Promise<SiteOptionsMap> {
  if (!isSupabaseConfigured || !supabase) {
    return { ...DEFAULT_SITE_OPTIONS };
  }

  const { data } = await supabase.from('options').select('option_name, option_value');
  if (!data || data.length === 0) {
    return { ...DEFAULT_SITE_OPTIONS };
  }

  const merged: Record<string, unknown> = { ...DEFAULT_SITE_OPTIONS };
  data.forEach((row) => {
    merged[row.option_name] = row.option_value;
  });

  return merged as unknown as SiteOptionsMap;
}

export async function saveSiteOptions(
  updates: Partial<SiteOptionsMap>,
  autoload = true
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const rows = Object.entries(updates).map(([option_name, option_value]) => ({
    option_name,
    option_value,
    autoload: option_name === 'admin_email' ? false : autoload,
  }));

  const { error } = await supabase.from('options').upsert(rows, { onConflict: 'option_name' });
  return { error: error ? error.message : null };
}

// ==============================================================================
// MENUS & MENU ITEMS
// ==============================================================================
export async function fetchMenusAndItems(): Promise<{
  menus: MenuRecord[];
  items: MenuItemRecord[];
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { menus: [], items: [] };
  }

  const [menusRes, itemsRes] = await Promise.all([
    supabase.from('menus').select('*').order('created_at', { ascending: true }),
    supabase.from('menu_items').select('*').order('sort_order', { ascending: true }),
  ]);

  return {
    menus: (menusRes.data as MenuRecord[]) || [],
    items: (itemsRes.data as MenuItemRecord[]) || [],
  };
}

export async function fetchMenuByLocation(location: MenuLocation): Promise<MenuItemRecord[]> {
  if (!isSupabaseConfigured || !supabase) {
    return location === 'header' ? DEFAULT_HEADER_MENU_ITEMS : [];
  }

  const { data: menu } = await supabase
    .from('menus')
    .select('id')
    .eq('location', location)
    .maybeSingle();

  if (!menu) return location === 'header' ? DEFAULT_HEADER_MENU_ITEMS : [];

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('menu_id', menu.id)
    .order('sort_order', { ascending: true });

  const list = (items as MenuItemRecord[]) || [];
  if (list.length === 0 && location === 'header') {
    return DEFAULT_HEADER_MENU_ITEMS;
  }
  return list;
}

export async function saveMenuStructure(
  menuId: string,
  location: MenuLocation | null,
  items: Array<{
    id?: string;
    parent_id: string | null;
    title: string;
    item_type: 'page' | 'post' | 'custom' | 'category';
    object_id: string | null;
    url: string;
    target: string;
    sort_order: number;
  }>
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  // Pastikan hanya satu menu yang memakai lokasi tersebut
  if (location) {
    const { error: resetErr } = await supabase
      .from('menus')
      .update({ location: null })
      .eq('location', location)
      .neq('id', menuId);
    if (resetErr) return { error: resetErr.message };
  }
  const { error: menuErr } = await supabase.from('menus').update({ location }).eq('id', menuId);
  if (menuErr) return { error: menuErr.message };

  const { error: delErr } = await supabase.from('menu_items').delete().eq('menu_id', menuId);
  if (delErr) return { error: delErr.message };

  if (items.length > 0) {
    const idMap = new Map<string, string>();
    // Insert level atas dulu agar parent_id valid
    const topItems = items.filter((i) => !i.parent_id);
    for (const item of topItems) {
      const { data: inserted, error } = await supabase
        .from('menu_items')
        .insert({
          menu_id: menuId,
          parent_id: null,
          title: item.title,
          item_type: item.item_type,
          object_id: item.object_id,
          url: item.url,
          target: item.target || '_self',
          sort_order: item.sort_order,
        })
        .select('id')
        .single();
      if (error) return { error: error.message };
      if (item.id && inserted) idMap.set(item.id, inserted.id);
    }

    const childItems = items.filter((i) => Boolean(i.parent_id));
    for (const child of childItems) {
      const mappedParent = child.parent_id ? idMap.get(child.parent_id) || null : null;
      const { error } = await supabase.from('menu_items').insert({
        menu_id: menuId,
        parent_id: mappedParent,
        title: child.title,
        item_type: child.item_type,
        object_id: child.object_id,
        url: child.url,
        target: child.target || '_self',
        sort_order: child.sort_order,
      });
      if (error) return { error: error.message };
    }
  }

  return { error: null };
}

export async function createMenuRecord(
  name: string,
  slug: string
): Promise<{ menu: MenuRecord | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { menu: null, error: SUPABASE_REQUIRED_ERROR };
  }
  const { data, error } = await supabase
    .from('menus')
    .insert({ name, slug })
    .select('*')
    .single();
  return { menu: (data as MenuRecord) || null, error: error ? error.message : null };
}

// ==============================================================================
// WIDGETS
// ==============================================================================
export async function fetchWidgets(area?: WidgetArea): Promise<WidgetRecord[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  let query = supabase.from('widgets').select('*').order('sort_order', { ascending: true });
  if (area) query = query.eq('area', area);
  const { data } = await query;
  return (data as WidgetRecord[]) || [];
}

export async function saveWidgetRecord(
  widget: Partial<WidgetRecord> & { area: WidgetArea; widget_type: WidgetRecord['widget_type']; title: string }
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  if (widget.id) {
    const { error } = await supabase
      .from('widgets')
      .update({
        area: widget.area,
        widget_type: widget.widget_type,
        title: widget.title,
        config: widget.config || {},
        sort_order: widget.sort_order ?? 0,
        is_active: widget.is_active ?? true,
      })
      .eq('id', widget.id);
    return { error: error ? error.message : null };
  }

  const { error } = await supabase.from('widgets').insert({
    area: widget.area,
    widget_type: widget.widget_type,
    title: widget.title,
    config: widget.config || {},
    sort_order: widget.sort_order ?? 0,
    is_active: widget.is_active ?? true,
  });
  return { error: error ? error.message : null };
}

export async function deleteWidgetRecord(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }
  const { error } = await supabase.from('widgets').delete().eq('id', id);
  return { error: error ? error.message : null };
}

// ==============================================================================
// PUBLIC CONTENT QUERIES
// ==============================================================================
export async function fetchPublishedPosts(
  type: PostType,
  limit = 20
): Promise<PostRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(id, display_name, email),
      term_relationships(term:terms(*))
    `
    )
    .eq('type', type)
    .eq('status', 'publish')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map((row: Record<string, unknown>) => {
    const rels = (row.term_relationships as Array<{ term: Term | null }> | null) || [];
    return {
      ...(row as unknown as PostRecord),
      terms: rels.map((r) => r.term).filter((t): t is Term => Boolean(t)),
    };
  });
}

export async function fetchPublishedPostBySlug(
  slug: string,
  type?: PostType
): Promise<PostRecord | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  let query = supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(id, display_name, email),
      term_relationships(term:terms(*))
    `
    )
    .eq('slug', slug)
    .eq('status', 'publish');

  if (type) query = query.eq('type', type);
  const { data } = await query.maybeSingle();
  if (!data) return null;

  const rels =
    ((data as Record<string, unknown>).term_relationships as Array<{ term: Term | null }>) || [];
  return {
    ...(data as unknown as PostRecord),
    terms: rels.map((r) => r.term).filter((t): t is Term => Boolean(t)),
  };
}

export function resolvePostFeaturedImage(post: PostRecord): string {
  const metaUrl = ((post.meta?.featured_url as string) || '').trim();
  if (metaUrl) return metaUrl;
  if (post.featured_media_id) {
    return getMediaProxyUrl(post.featured_media_id, { width: 768 });
  }
  if (Array.isArray(post.content)) {
    for (const block of post.content) {
      if (block.type === 'image') {
        if (block.url && block.url.trim()) return block.url.trim();
        if (block.mediaId) return getMediaProxyUrl(block.mediaId, { width: 768 });
      }
      if (block.type === 'gallery' && Array.isArray(block.gallery) && block.gallery[0]?.url) {
        return block.gallery[0].url.trim();
      }
    }
  }
  if (post.content_html) {
    const imgMatch = post.content_html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) return imgMatch[1].trim();
  }
  return '';
}

export async function fetchPublicWijk(): Promise<Wijk[]> {
  if (!isSupabaseConfigured || !supabase) return DEFAULT_WIJK;
  const { data } = await supabase
    .from('wijk')
    .select('*')
    .order('sort_order', { ascending: true });
  return data && data.length > 0 ? (data as Wijk[]) : DEFAULT_WIJK;
}

export async function fetchPublicIbadahMinggu(limit = 10): Promise<IbadahMinggu[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data } = await supabase
    .from('ibadah_minggu')
    .select('*')
    .order('service_date', { ascending: false })
    .order('service_time', { ascending: true })
    .limit(limit);
  return (data as IbadahMinggu[]) || [];
}

export async function fetchPublicPhdLingkungan(): Promise<PhdLingkungan[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data } = await supabase
    .from('phd_lingkungan')
    .select('*, wijk:wijk(id, name, sort_order)')
    .order('day_of_week', { ascending: true });
  return (data as PhdLingkungan[]) || [];
}
