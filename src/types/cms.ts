export type UserRole =
  | 'administrator'
  | 'pendeta'
  | 'sekretaris'
  | 'bendahara'
  | 'editor'
  | 'penulis'
  | 'kontributor'
  | 'jemaat';

export type PostType = 'post' | 'page' | 'warta' | 'album';

export type PostStatus =
  | 'publish'
  | 'draft'
  | 'pending'
  | 'future'
  | 'private'
  | 'trash';

export type TaxonomyType = 'category' | 'post_tag';

export interface Wijk {
  id: string;
  name: string;
  slug: string;
  description: string;
  koordinator_name: string;
  koordinator_phone: string;
  sort_order: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  role: UserRole;
  avatar_url: string;
  phone: string;
  wijk_id: string | null;
  bio: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'image'
  | 'gallery'
  | 'list'
  | 'quote'
  | 'button'
  | 'columns'
  | 'youtube'
  | 'separator';

export interface GalleryItem {
  url: string;
  alt: string;
  caption?: string;
}

export type BlockFontFamily = 'default' | 'serif' | 'sans' | 'mono';
export type BlockFontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type BlockTextAlign = 'left' | 'center' | 'right' | 'justify';

export interface ColumnItem {
  heading?: string;
  headingHtml?: string;
  body: string;
  bodyHtml?: string;
}

export interface GutenbergBlock {
  id: string;
  type: BlockType;
  content?: string;
  contentHtml?: string;
  level?: 2 | 3 | 4;
  align?: BlockTextAlign;
  fontFamily?: BlockFontFamily;
  fontSize?: BlockFontSize;
  textColor?: string;
  backgroundColor?: string;
  url?: string;
  alt?: string;
  caption?: string;
  mediaId?: string;
  ordered?: boolean;
  items?: string[];
  itemsHtml?: string[];
  citation?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonVariant?: 'solid' | 'outline';
  gallery?: GalleryItem[];
  columnsCount?: 2 | 3;
  columns?: ColumnItem[];
  separatorStyle?: 'line' | 'dots' | 'wide';
}

export interface Term {
  id: string;
  name: string;
  slug: string;
  taxonomy: TaxonomyType;
  description: string;
  parent_id: string | null;
  count: number;
  created_at: string;
  updated_at: string;
}

export interface PostRecord {
  id: string;
  type: PostType;
  title: string;
  slug: string;
  content: GutenbergBlock[];
  content_html: string;
  excerpt: string;
  status: PostStatus;
  author_id: string | null;
  featured_media_id: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  parent_id: string | null;
  menu_order: number;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  terms?: Term[];
}

export interface PostRevision {
  id: string;
  post_id: string;
  title: string;
  content: GutenbergBlock[];
  content_html: string;
  excerpt: string;
  author_id: string | null;
  revision_number: number;
  created_at: string;
  author?: {
    display_name: string;
  } | null;
}

export interface PostSummary {
  id: string;
  type: PostType;
  title: string;
  slug: string;
  excerpt: string;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface AdminNotice {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  linkLabel?: string;
  linkTo?: string;
}

export interface AdminSubmenuItem {
  label: string;
  path: string;
  capability?: string;
}

export interface AdminMenuEntry {
  id: string;
  label: string;
  path: string;
  iconName: string;
  capability: string;
  separatorAfter?: boolean;
  submenus?: AdminSubmenuItem[];
}

export interface MediaItem {
  id: string;
  drive_file_id: string;
  drive_folder_id: string;
  nama: string;
  mime: string;
  ukuran: number;
  alt: string;
  caption: string;
  deskripsi: string;
  width: number | null;
  height: number | null;
  thumbnails: Record<string, string>;
  year_month: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MenuLocation = 'header' | 'footer' | 'footer_secondary';

export interface MenuRecord {
  id: string;
  name: string;
  slug: string;
  location: MenuLocation | null;
  created_at: string;
  updated_at: string;
}

export interface MenuItemRecord {
  id: string;
  menu_id: string;
  parent_id: string | null;
  title: string;
  item_type: 'page' | 'post' | 'custom' | 'category';
  object_id: string | null;
  url: string;
  target: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type WidgetArea = 'footer_1' | 'footer_2' | 'sidebar';

export interface WidgetRecord {
  id: string;
  area: WidgetArea;
  widget_type: 'text' | 'schedule' | 'recent_posts' | 'contact';
  title: string;
  config: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type HomepageSectionId =
  | 'hero'
  | 'quick_links'
  | 'announcements'
  | 'jemaat_stats'
  | 'schedule'
  | 'warta'
  | 'news'
  | 'wijk'
  | 'contact';

export interface HomepageSectionConfig {
  id: HomepageSectionId;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  columns?: 1 | 2 | 3 | 4;
  limit?: number;
  variant?: 'split' | 'centered' | 'banner' | 'compact';
}

export interface SiteOptionsMap {
  site_title: string;
  site_tagline: string;
  site_url: string;
  admin_email: string;
  timezone_string: string;
  date_format: string;
  time_format: string;
  permalink_structure: string;
  posts_per_page: number;
  default_category_id?: string;
  max_upload_size_mb: number;
  allowed_upload_mimes: string[];
  theme_primary_color: string;
  theme_accent_color: string;
  theme_logo_url?: string;
  theme_hero_image_url?: string;
  login_logo_url?: string;
  login_title?: string;
  login_subtitle?: string;
  login_back_text?: string;
  church_address: string;
  church_phone?: string;
  daily_verse: { reference: string; text: string };
  homepage_layout?: HomepageSectionConfig[];
}

export interface JemaatRecord {
  id: string;
  no_registrasi: string | null;
  full_name: string;
  gender: 'L' | 'P' | null;
  birth_place: string;
  birth_date: string | null;
  marriage_date: string | null;
  baptism_date: string | null;
  sidi_date: string | null;
  status_keanggotaan: 'aktif' | 'pindah' | 'meninggal' | 'nonaktif';
  family_role: string;
  family_head_id: string | null;
  wijk_id: string | null;
  phone: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  wijk?: { id: string; name: string } | null;
}

export interface IbadahMinggu {
  id: string;
  service_date: string;
  service_time: string;
  title: string;
  liturgical_week: string;
  preacher: string;
  liturgist: string;
  organist: string;
  song_leader: string;
  bible_reading: string;
  theme: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PhdLingkungan {
  id: string;
  wijk_id: string;
  day_of_week: string;
  service_time: string;
  next_date: string | null;
  host_family: string;
  host_address: string;
  leader_name: string;
  topic: string;
  notes: string;
  created_at: string;
  updated_at: string;
  wijk?: { id: string; name: string; sort_order?: number } | null;
}

export interface KehadiranRecord {
  id: string;
  service_type: 'minggu_pagi' | 'minggu_siang' | 'minggu_sore' | 'phd' | 'khusus';
  service_date: string;
  wijk_id: string | null;
  ibadah_id: string | null;
  men_count: number;
  women_count: number;
  youth_count: number;
  children_count: number;
  total_count: number;
  notes: string;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  wijk?: { id: string; name: string } | null;
}

export interface KeuanganRecord {
  id: string;
  transaction_date: string;
  type: 'pemasukan' | 'pengeluaran';
  category: string;
  description: string;
  amount: number;
  is_excluded_from_split: boolean;
  center_share_amount: number;
  church_share_amount: number;
  reference_no: string;
  recorded_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PermohonanJenis =
  | 'Tambah Anggota/Anak Lahir'
  | 'Perbaikan Biodata'
  | 'Pindah/Mutasi'
  | 'Meninggal';

export type PermohonanStatus =
  | 'menunggu_sintua'
  | 'terverifikasi_sintua'
  | 'disetujui'
  | 'ditolak';

export interface PermohonanAnggotaDraft {
  nama_lengkap: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: 'L' | 'P';
  status_keluarga: 'Anak' | 'Ama/Suami' | 'Ina/Istri';
}

export type PermohonanEditableFieldKey =
  | 'full_name'
  | 'no_registrasi'
  | 'family_role'
  | 'gender'
  | 'birth_place'
  | 'birth_date'
  | 'wijk_id'
  | 'address'
  | 'phone'
  | 'baptism_date'
  | 'sidi_date'
  | 'marriage_date'
  | 'status_keanggotaan';

export interface PermohonanPerubahanField {
  field: PermohonanEditableFieldKey;
  field_label: string;
  nama_anggota: string;
  data_lama: string;
  data_benar: string;
}

export interface PermohonanAttachmentMeta {
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  previewDataUrl?: string;
}

export interface PermohonanPerubahanRecord {
  id: string;
  request_code: string;
  jenis_permohonan: PermohonanJenis;
  wijk_id: string | null;
  wijk_name: string;
  no_registrasi: string;
  nama_pemohon: string;
  nama_suami: string;
  nama_istri: string;
  email_pemohon: string;
  alamat_pemohon: string;
  no_hp_pemohon: string;
  verifikasi_identitas: string;
  daftar_anggota: PermohonanAnggotaDraft[];
  daftar_perubahan: PermohonanPerubahanField[];
  kelengkapan_dokumen: Record<string, PermohonanAttachmentMeta>;
  detail_perubahan: string;
  status_verifikasi: PermohonanStatus;
  catatan_sintua: string;
  catatan_admin: string;
  verified_by?: string | null;
  verified_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermohonanPublicStatusRecord {
  id: string;
  request_code: string;
  jenis_permohonan: PermohonanJenis;
  wijk_name: string;
  status_verifikasi: PermohonanStatus;
  detail_perubahan: string;
  daftar_anggota: PermohonanAnggotaDraft[];
  daftar_perubahan: PermohonanPerubahanField[];
  catatan_sintua: string;
  catatan_admin: string;
  created_at: string;
  updated_at: string;
}

export interface PublicJemaatBirthdayItem {
  id: string;
  full_name: string;
  wijk_name: string;
  birth_date: string;
  usia_baru: number;
  hari_lagi: number;
}

export interface PublicJemaatWijkStat {
  id: string;
  name: string;
  jiwa: number;
  kk: number;
  persentase: number;
}

export interface PublicJemaatStats {
  total_jiwa: number;
  total_kk: number;
  per_wijk: PublicJemaatWijkStat[];
  kategorial: {
    sekolah_minggu: number;
    remaja_nhkbp: number;
    punguan_ama: number;
    punguan_ina: number;
    lansia: number;
    sudah_baptis: number;
    sudah_sidi: number;
    sudah_menikah: number;
  };
  ulang_tahun_minggu_ini: PublicJemaatBirthdayItem[];
}


