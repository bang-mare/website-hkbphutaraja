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

export type CommentStatus = 'approved' | 'pending' | 'spam' | 'trash';

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

export interface ColumnItem {
  heading?: string;
  body: string;
}

export interface GutenbergBlock {
  id: string;
  type: BlockType;
  content?: string;
  level?: 2 | 3 | 4;
  align?: 'left' | 'center' | 'right';
  url?: string;
  alt?: string;
  caption?: string;
  mediaId?: string;
  ordered?: boolean;
  items?: string[];
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
  comment_status: boolean;
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
  comment_count?: number;
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

export interface CommentRecord {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string;
  author_email: string;
  content: string;
  status: CommentStatus;
  ip_address: string;
  created_at: string;
  updated_at: string;
  post?: {
    id: string;
    title: string;
    slug: string;
    type: PostType;
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
  badgeCount?: number;
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
  default_comment_status: 'open' | 'closed';
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

