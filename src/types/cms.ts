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
