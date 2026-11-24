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
