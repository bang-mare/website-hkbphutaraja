import { isSupabaseConfigured, supabase } from './supabase';
import { getMediaProxyUrl } from './mediaClient';
import type {
  CommentRecord,
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
  default_comment_status: 'open',
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

export const DEFAULT_HEADER_MENU_ITEMS: MenuItemRecord[] = [
  { id: 'dm-1', menu_id: 'default', parent_id: null, title: 'Beranda', item_type: 'custom', object_id: null, url: '/', target: '_self', sort_order: 1, created_at: '', updated_at: '' },
  { id: 'dm-2', menu_id: 'default', parent_id: null, title: 'Tentang Kami', item_type: 'custom', object_id: null, url: '/tentang-kami', target: '_self', sort_order: 2, created_at: '', updated_at: '' },
  { id: 'dm-3', menu_id: 'default', parent_id: null, title: 'Jadwal Ibadah', item_type: 'custom', object_id: null, url: '/jadwal-ibadah', target: '_self', sort_order: 3, created_at: '', updated_at: '' },
  { id: 'dm-4', menu_id: 'default', parent_id: null, title: 'Warta Jemaat', item_type: 'custom', object_id: null, url: '/warta', target: '_self', sort_order: 4, created_at: '', updated_at: '' },
  { id: 'dm-5', menu_id: 'default', parent_id: null, title: 'Berita', item_type: 'custom', object_id: null, url: '/berita', target: '_self', sort_order: 5, created_at: '', updated_at: '' },
  { id: 'dm-6', menu_id: 'default', parent_id: null, title: 'Galeri', item_type: 'custom', object_id: null, url: '/galeri', target: '_self', sort_order: 6, created_at: '', updated_at: '' },
  { id: 'dm-7', menu_id: 'default', parent_id: null, title: 'Kontak', item_type: 'custom', object_id: null, url: '/kontak', target: '_self', sort_order: 7, created_at: '', updated_at: '' },
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
    Object.assign(DEFAULT_SITE_OPTIONS, updates);
    return { error: null };
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
    return {
      menus: [
        { id: 'default', name: 'Menu Utama', slug: 'menu-utama', location: 'header', created_at: '', updated_at: '' },
        { id: 'footer', name: 'Menu Footer', slug: 'menu-footer', location: 'footer', created_at: '', updated_at: '' },
      ],
      items: DEFAULT_HEADER_MENU_ITEMS,
    };
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
    return { error: null };
  }

  // Pastikan hanya satu menu yang memakai lokasi tersebut
  if (location) {
    await supabase.from('menus').update({ location: null }).eq('location', location).neq('id', menuId);
  }
  const { error: menuErr } = await supabase.from('menus').update({ location }).eq('id', menuId);
  if (menuErr) return { error: menuErr.message };

  await supabase.from('menu_items').delete().eq('menu_id', menuId);
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

export async function createMenuRecord(name: string, slug: string): Promise<{ menu: MenuRecord | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      menu: { id: `menu-${Date.now()}`, name, slug, location: null, created_at: '', updated_at: '' },
      error: null,
    };
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
    return area ? DEFAULT_WIDGETS.filter((w) => w.area === area) : DEFAULT_WIDGETS;
  }

  let query = supabase.from('widgets').select('*').order('sort_order', { ascending: true });
  if (area) query = query.eq('area', area);
  const { data } = await query;
  const list = (data as WidgetRecord[]) || [];
  if (list.length === 0 && !area) return DEFAULT_WIDGETS;
  return list;
}

export async function saveWidgetRecord(
  widget: Partial<WidgetRecord> & { area: WidgetArea; widget_type: WidgetRecord['widget_type']; title: string }
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { error: null };

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
  if (!isSupabaseConfigured || !supabase) return { error: null };
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

export async function fetchApprovedCommentsForPost(postId: string): Promise<CommentRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });
  return (data as CommentRecord[]) || [];
}

export async function submitPublicComment(input: {
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: null };
  }
  const { error } = await supabase.from('comments').insert({
    post_id: input.post_id,
    author_name: input.author_name.trim(),
    author_email: input.author_email.trim(),
    content: input.content.trim(),
    status: 'pending',
  });
  return { error: error ? error.message : null };
}
