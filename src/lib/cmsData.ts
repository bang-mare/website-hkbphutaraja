import { isSupabaseConfigured, supabase } from './supabase';
import { serializeBlocksToHtml, slugify } from './blocks';
import type {
  GutenbergBlock,
  PostRecord,
  PostRevision,
  PostStatus,
  PostType,
  TaxonomyType,
  Term,
} from '../types/cms';

// ==============================================================================
// PENYIMPANAN MODE PRATINJAU LOKAL (Hanya digunakan jika Supabase belum diatur)
// ==============================================================================
const memoryStore: {
  posts: PostRecord[];
  revisions: PostRevision[];
  terms: Term[];
  termLinks: Array<{ post_id: string; term_id: string }>;
} = {
  posts: [
    {
      id: 'sample-page-1',
      type: 'page',
      title: 'Tentang HKBP Ressort Hutaraja',
      slug: 'tentang-kami',
      content: [
        {
          id: 'b1',
          type: 'paragraph',
          content:
            'Huria Kristen Batak Protestan (HKBP) Ressort Hutaraja merupakan bagian dari Distrik VI Dairi yang melayani jemaat di enam lingkungan (wijk): Letare, Exaudi, Judika, Galatia, Efesus, dan Jeremia.',
        },
      ],
      content_html:
        '<p>Huria Kristen Batak Protestan (HKBP) Ressort Hutaraja merupakan bagian dari Distrik VI Dairi yang melayani jemaat di enam lingkungan (wijk): Letare, Exaudi, Judika, Galatia, Efesus, dan Jeremia.</p>',
      excerpt: 'Profil singkat, sejarah huria, visi-misi, dan enam lingkungan pelayanan HKBP Ressort Hutaraja.',
      status: 'publish',
      author_id: 'preview-administrator',
      featured_media_id: null,
      published_at: new Date().toISOString(),
      scheduled_at: null,
      parent_id: null,
      menu_order: 1,
      meta: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: { id: 'preview-administrator', display_name: 'Admin Huria', email: 'admin@hkbphutaraja.or.id' },
      terms: [],
    },
    {
      id: 'sample-post-1',
      type: 'post',
      title: 'Selamat Datang di Portal Resmi HKBP Ressort Hutaraja',
      slug: 'selamat-datang-portal-hkbp-hutaraja',
      content: [
        {
          id: 'b2',
          type: 'paragraph',
          content:
            'Puji syukur kepada Tuhan Yesus Kristus, portal informasi dan pelayanan jemaat HKBP Ressort Hutaraja kini hadir untuk memudahkan jemaat mengakses warta mingguan dan jadwal ibadah.',
        },
      ],
      content_html:
        '<p>Puji syukur kepada Tuhan Yesus Kristus, portal informasi dan pelayanan jemaat HKBP Ressort Hutaraja kini hadir untuk memudahkan jemaat mengakses warta mingguan dan jadwal ibadah.</p>',
      excerpt: 'Portal informasi resmi jemaat HKBP Ressort Hutaraja Distrik VI Dairi.',
      status: 'publish',
      author_id: 'preview-administrator',
      featured_media_id: null,
      published_at: new Date().toISOString(),
      scheduled_at: null,
      parent_id: null,
      menu_order: 0,
      meta: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: { id: 'preview-administrator', display_name: 'Admin Huria', email: 'admin@hkbphutaraja.or.id' },
      terms: [],
    },
  ],
  revisions: [],
  terms: [
    {
      id: 'term-cat-1',
      name: 'Berita Huria',
      slug: 'berita-huria',
      taxonomy: 'category',
      description: 'Berita dan kegiatan jemaat HKBP Ressort Hutaraja',
      parent_id: null,
      count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'term-cat-2',
      name: 'Renungan',
      slug: 'renungan',
      taxonomy: 'category',
      description: 'Renungan harian dan khotbah minggu',
      parent_id: null,
      count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'term-tag-1',
      name: 'Distrik VI Dairi',
      slug: 'distrik-vi-dairi',
      taxonomy: 'post_tag',
      description: '',
      parent_id: null,
      count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  termLinks: [{ post_id: 'sample-post-1', term_id: 'term-cat-1' }],
};

// ==============================================================================
// POSTS, PAGES & WARTA CRUD
// ==============================================================================
export async function fetchPostsByType(type: PostType): Promise<{
  posts: PostRecord[];
  error: string | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    const list = memoryStore.posts
      .filter((p) => p.type === type)
      .map((p) => ({
        ...p,
        terms: memoryStore.termLinks
          .filter((l) => l.post_id === p.id)
          .map((l) => memoryStore.terms.find((t) => t.id === l.term_id))
          .filter((t): t is Term => Boolean(t)),
      }))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return { posts: list, error: null };
  }

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(id, display_name, email),
      term_relationships(term:terms(*))
    `
    )
    .eq('type', type)
    .order('updated_at', { ascending: false });

  if (error) {
    return { posts: [], error: error.message };
  }

  const mapped: PostRecord[] = (data || []).map((row: Record<string, unknown>) => {
    const rels = (row.term_relationships as Array<{ term: Term | null }> | null) || [];
    const terms = rels.map((r) => r.term).filter((t): t is Term => Boolean(t));
    return {
      ...(row as unknown as PostRecord),
      content: Array.isArray(row.content) ? (row.content as GutenbergBlock[]) : [],
      terms,
    };
  });

  return { posts: mapped, error: null };
}

export async function fetchPostById(id: string): Promise<{
  post: PostRecord | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    const found = memoryStore.posts.find((p) => p.id === id);
    if (!found) return { post: null, error: 'Pos tidak ditemukan.' };
    const terms = memoryStore.termLinks
      .filter((l) => l.post_id === found.id)
      .map((l) => memoryStore.terms.find((t) => t.id === l.term_id))
      .filter((t): t is Term => Boolean(t));
    return { post: { ...found, terms }, error: null };
  }

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(id, display_name, email),
      term_relationships(term:terms(*))
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return { post: null, error: error.message };
  if (!data) return { post: null, error: 'Konten tidak ditemukan.' };

  const rels =
    ((data as Record<string, unknown>).term_relationships as Array<{ term: Term | null }>) || [];
  const post: PostRecord = {
    ...(data as unknown as PostRecord),
    content: Array.isArray(data.content) ? (data.content as GutenbergBlock[]) : [],
    terms: rels.map((r) => r.term).filter((t): t is Term => Boolean(t)),
  };
  return { post, error: null };
}

export interface SavePostInput {
  id?: string;
  type: PostType;
  title: string;
  slug: string;
  content: GutenbergBlock[];
  excerpt: string;
  status: PostStatus;
  author_id: string | null;
  featured_media_id?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  parent_id?: string | null;
  menu_order?: number;
  meta?: Record<string, unknown>;
  termIds?: string[];
  createRevision?: boolean;
}

export async function savePost(input: SavePostInput): Promise<{
  post: PostRecord | null;
  error: string | null;
}> {
  const safeSlugBase = slugify(input.slug || input.title || `${input.type}-${Date.now()}`);
  const finalSlug = safeSlugBase || `${input.type}-${Date.now()}`;
  const contentHtml = serializeBlocksToHtml(input.content);
  const now = new Date().toISOString();

  const publishedAt =
    input.status === 'publish'
      ? input.published_at || now
      : input.published_at ?? null;

  if (!isSupabaseConfigured || !supabase) {
    let saved: PostRecord;
    if (input.id) {
      const idx = memoryStore.posts.findIndex((p) => p.id === input.id);
      if (idx === -1) return { post: null, error: 'Pos tidak ditemukan.' };
      const existing = memoryStore.posts[idx];
      saved = {
        ...existing,
        title: input.title,
        slug: finalSlug,
        content: input.content,
        content_html: contentHtml,
        excerpt: input.excerpt,
        status: input.status,
        featured_media_id: input.featured_media_id ?? null,
        published_at: publishedAt,
        scheduled_at: input.scheduled_at ?? null,
        parent_id: input.parent_id ?? null,
        menu_order: input.menu_order ?? 0,
        meta: input.meta ?? existing.meta,
        updated_at: now,
      };
      memoryStore.posts[idx] = saved;
    } else {
      saved = {
        id: `post-${Date.now()}`,
        type: input.type,
        title: input.title,
        slug: finalSlug,
        content: input.content,
        content_html: contentHtml,
        excerpt: input.excerpt,
        status: input.status,
        author_id: input.author_id,
        featured_media_id: input.featured_media_id ?? null,
        published_at: publishedAt,
        scheduled_at: input.scheduled_at ?? null,
        parent_id: input.parent_id ?? null,
        menu_order: input.menu_order ?? 0,
        meta: input.meta ?? {},
        created_at: now,
        updated_at: now,
      };
      memoryStore.posts.unshift(saved);
    }

    if (input.termIds) {
      memoryStore.termLinks = memoryStore.termLinks.filter((l) => l.post_id !== saved.id);
      input.termIds.forEach((tid) => {
        memoryStore.termLinks.push({ post_id: saved.id, term_id: tid });
      });
    }

    if (input.createRevision) {
      const revCount = memoryStore.revisions.filter((r) => r.post_id === saved.id).length;
      memoryStore.revisions.unshift({
        id: `rev-${Date.now()}`,
        post_id: saved.id,
        title: saved.title,
        content: saved.content,
        content_html: saved.content_html,
        excerpt: saved.excerpt,
        author_id: input.author_id,
        revision_number: revCount + 1,
        created_at: now,
      });
    }

    return { post: saved, error: null };
  }

  // Pastikan slug unik saat insert / ganti slug
  let uniqueSlug = finalSlug;
  const { data: conflict } = await supabase
    .from('posts')
    .select('id')
    .eq('slug', uniqueSlug)
    .maybeSingle();

  if (conflict && conflict.id !== input.id) {
    uniqueSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
  }

  const payload = {
    type: input.type,
    title: input.title,
    slug: uniqueSlug,
    content: input.content,
    content_html: contentHtml,
    excerpt: input.excerpt,
    status: input.status,
    author_id: input.author_id,
    featured_media_id: input.featured_media_id ?? null,
    published_at: publishedAt,
    scheduled_at: input.scheduled_at ?? null,
    parent_id: input.parent_id ?? null,
    menu_order: input.menu_order ?? 0,
    meta: input.meta ?? {},
  };

  let postId = input.id;
  if (postId) {
    const { data, error } = await supabase
      .from('posts')
      .update(payload)
      .eq('id', postId)
      .select('*')
      .single();
    if (error) return { post: null, error: error.message };
    postId = data.id;
  } else {
    const { data, error } = await supabase
      .from('posts')
      .insert(payload)
      .select('*')
      .single();
    if (error) return { post: null, error: error.message };
    postId = data.id;
  }

  if (input.termIds && postId) {
    await supabase.from('term_relationships').delete().eq('post_id', postId);
    if (input.termIds.length > 0) {
      await supabase.from('term_relationships').insert(
        input.termIds.map((term_id) => ({ post_id: postId!, term_id }))
      );
    }
  }

  if (input.createRevision && postId) {
    const { count } = await supabase
      .from('post_revisions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    await supabase.from('post_revisions').insert({
      post_id: postId,
      title: input.title,
      content: input.content,
      content_html: contentHtml,
      excerpt: input.excerpt,
      author_id: input.author_id,
      revision_number: (count ?? 0) + 1,
    });
  }

  return fetchPostById(postId!);
}

export async function updatePostsStatusOrQuickEdit(
  ids: string[],
  updates: Partial<{
    status: PostStatus;
    title: string;
    slug: string;
    published_at: string | null;
  }>,
  categoryIds?: string[]
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    ids.forEach((id) => {
      const idx = memoryStore.posts.findIndex((p) => p.id === id);
      if (idx !== -1) {
        memoryStore.posts[idx] = {
          ...memoryStore.posts[idx],
          ...updates,
          updated_at: new Date().toISOString(),
        };
      }
      if (categoryIds) {
        memoryStore.termLinks = memoryStore.termLinks.filter((l) => l.post_id !== id);
        categoryIds.forEach((cid) => memoryStore.termLinks.push({ post_id: id, term_id: cid }));
      }
    });
    return { error: null };
  }

  const { error } = await supabase.from('posts').update(updates).in('id', ids);
  if (error) return { error: error.message };

  if (categoryIds) {
    for (const id of ids) {
      // Hapus hanya kategori lama, pertahankan tag
      const { data: catTerms } = await supabase
        .from('terms')
        .select('id')
        .eq('taxonomy', 'category');
      const allCatIds = (catTerms || []).map((t) => t.id);
      if (allCatIds.length > 0) {
        await supabase
          .from('term_relationships')
          .delete()
          .eq('post_id', id)
          .in('term_id', allCatIds);
      }
      if (categoryIds.length > 0) {
        await supabase.from('term_relationships').insert(
          categoryIds.map((term_id) => ({ post_id: id, term_id }))
        );
      }
    }
  }

  return { error: null };
}

export async function deletePostsPermanently(ids: string[]): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    memoryStore.posts = memoryStore.posts.filter((p) => !ids.includes(p.id));
    return { error: null };
  }
  const { error } = await supabase.from('posts').delete().in('id', ids);
  return { error: error ? error.message : null };
}

// ==============================================================================
// REVISI
// ==============================================================================
export async function fetchPostRevisions(postId: string): Promise<PostRevision[]> {
  if (!isSupabaseConfigured || !supabase) {
    return memoryStore.revisions.filter((r) => r.post_id === postId);
  }
  const { data } = await supabase
    .from('post_revisions')
    .select('*, author:profiles!post_revisions_author_id_fkey(display_name)')
    .eq('post_id', postId)
    .order('revision_number', { ascending: false })
    .limit(20);
  return (data as PostRevision[]) || [];
}

// ==============================================================================
// TERMS (KATEGORI & TAG)
// ==============================================================================
export async function fetchTerms(taxonomy: TaxonomyType): Promise<Term[]> {
  if (!isSupabaseConfigured || !supabase) {
    return memoryStore.terms
      .filter((t) => t.taxonomy === taxonomy)
      .map((t) => ({
        ...t,
        count: memoryStore.termLinks.filter((l) => l.term_id === t.id).length,
      }));
  }

  const { data } = await supabase
    .from('terms')
    .select('*, term_relationships(count)')
    .eq('taxonomy', taxonomy)
    .order('name', { ascending: true });

  return (data || []).map((row: Record<string, unknown>) => {
    const rels = row.term_relationships as Array<{ count: number }> | undefined;
    return {
      ...(row as unknown as Term),
      count: rels && rels[0] ? rels[0].count : (row.count as number) || 0,
    };
  });
}

export async function createTerm(input: {
  name: string;
  slug?: string;
  taxonomy: TaxonomyType;
  description?: string;
  parent_id?: string | null;
}): Promise<{ term: Term | null; error: string | null }> {
  const finalSlug = slugify(input.slug || input.name) || `term-${Date.now()}`;

  if (!isSupabaseConfigured || !supabase) {
    const newTerm: Term = {
      id: `term-${Date.now()}`,
      name: input.name.trim(),
      slug: finalSlug,
      taxonomy: input.taxonomy,
      description: input.description?.trim() || '',
      parent_id: input.parent_id ?? null,
      count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.terms.push(newTerm);
    return { term: newTerm, error: null };
  }

  const { data, error } = await supabase
    .from('terms')
    .insert({
      name: input.name.trim(),
      slug: finalSlug,
      taxonomy: input.taxonomy,
      description: input.description?.trim() || '',
      parent_id: input.parent_id ?? null,
    })
    .select('*')
    .single();

  return { term: (data as Term) || null, error: error ? error.message : null };
}

export async function updateTerm(
  id: string,
  updates: { name: string; slug: string; description: string; parent_id?: string | null }
): Promise<{ error: string | null }> {
  const finalSlug = slugify(updates.slug || updates.name);
  if (!isSupabaseConfigured || !supabase) {
    const idx = memoryStore.terms.findIndex((t) => t.id === id);
    if (idx !== -1) {
      memoryStore.terms[idx] = {
        ...memoryStore.terms[idx],
        name: updates.name,
        slug: finalSlug,
        description: updates.description,
        parent_id: updates.parent_id ?? null,
      };
    }
    return { error: null };
  }

  const { error } = await supabase
    .from('terms')
    .update({
      name: updates.name.trim(),
      slug: finalSlug,
      description: updates.description.trim(),
      parent_id: updates.parent_id ?? null,
    })
    .eq('id', id);
  return { error: error ? error.message : null };
}

export async function deleteTerms(ids: string[]): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    memoryStore.terms = memoryStore.terms.filter((t) => !ids.includes(t.id));
    memoryStore.termLinks = memoryStore.termLinks.filter((l) => !ids.includes(l.term_id));
    return { error: null };
  }
  const { error } = await supabase.from('terms').delete().in('id', ids);
  return { error: error ? error.message : null };
}
