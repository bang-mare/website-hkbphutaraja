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

const SUPABASE_REQUIRED_ERROR =
  'Penyimpanan lokal dinonaktifkan. Hubungkan Supabase (VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY) untuk menyimpan dan mengelola data.';

// ==============================================================================
// POSTS, PAGES & WARTA CRUD
// ==============================================================================
export async function fetchPostsByType(type: PostType): Promise<{
  posts: PostRecord[];
  error: string | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { posts: [], error: SUPABASE_REQUIRED_ERROR };
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
    return { post: null, error: SUPABASE_REQUIRED_ERROR };
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
  if (!isSupabaseConfigured || !supabase) {
    return { post: null, error: SUPABASE_REQUIRED_ERROR };
  }

  const safeSlugBase = slugify(input.slug || input.title || `${input.type}-${Date.now()}`);
  const finalSlug = safeSlugBase || `${input.type}-${Date.now()}`;
  const contentHtml = serializeBlocksToHtml(input.content);
  const now = new Date().toISOString();

  const publishedAt =
    input.status === 'publish'
      ? input.published_at || now
      : input.published_at ?? null;

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
    const { error: delTermErr } = await supabase
      .from('term_relationships')
      .delete()
      .eq('post_id', postId);
    if (delTermErr) return { post: null, error: delTermErr.message };

    if (input.termIds.length > 0) {
      const { error: insTermErr } = await supabase.from('term_relationships').insert(
        input.termIds.map((term_id) => ({ post_id: postId!, term_id }))
      );
      if (insTermErr) return { post: null, error: insTermErr.message };
    }
  }

  if (input.createRevision && postId) {
    const { count } = await supabase
      .from('post_revisions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    const { error: revErr } = await supabase.from('post_revisions').insert({
      post_id: postId,
      title: input.title,
      content: input.content,
      content_html: contentHtml,
      excerpt: input.excerpt,
      author_id: input.author_id,
      revision_number: (count ?? 0) + 1,
    });
    if (revErr) {
      console.warn('Gagal mencatat revisi:', revErr.message);
    }
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
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const { error } = await supabase.from('posts').update(updates).in('id', ids);
  if (error) return { error: error.message };

  if (categoryIds) {
    for (const id of ids) {
      // Hapus hanya kategori lama, pertahankan tag
      const { data: catTerms, error: catErr } = await supabase
        .from('terms')
        .select('id')
        .eq('taxonomy', 'category');
      if (catErr) return { error: catErr.message };

      const allCatIds = (catTerms || []).map((t) => t.id);
      if (allCatIds.length > 0) {
        const { error: delErr } = await supabase
          .from('term_relationships')
          .delete()
          .eq('post_id', id)
          .in('term_id', allCatIds);
        if (delErr) return { error: delErr.message };
      }
      if (categoryIds.length > 0) {
        const { error: insErr } = await supabase.from('term_relationships').insert(
          categoryIds.map((term_id) => ({ post_id: id, term_id }))
        );
        if (insErr) return { error: insErr.message };
      }
    }
  }

  return { error: null };
}

export async function deletePostsPermanently(ids: string[]): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }
  const { error } = await supabase.from('posts').delete().in('id', ids);
  return { error: error ? error.message : null };
}

// ==============================================================================
// REVISI
// ==============================================================================
export async function fetchPostRevisions(postId: string): Promise<PostRevision[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
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
    return [];
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
  if (!isSupabaseConfigured || !supabase) {
    return { term: null, error: SUPABASE_REQUIRED_ERROR };
  }

  const finalSlug = slugify(input.slug || input.name) || `term-${Date.now()}`;

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
  if (!isSupabaseConfigured || !supabase) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const finalSlug = slugify(updates.slug || updates.name);

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
    return { error: SUPABASE_REQUIRED_ERROR };
  }
  const { error } = await supabase.from('terms').delete().in('id', ids);
  return { error: error ? error.message : null };
}
