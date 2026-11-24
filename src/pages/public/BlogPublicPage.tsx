import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Search, User } from 'lucide-react';
import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';
import { sanitizeHtml } from '../../lib/blocks';
import { fetchTerms } from '../../lib/cmsData';
import {
  fetchPublishedPostBySlug,
  fetchPublishedPosts,
  resolvePostFeaturedImage,
} from '../../lib/publicData';
import { PostThumbnail } from '../../components/PostThumbnail';
import type { PostRecord, Term } from '../../types/cms';

function normalizeMediaRef(url: string): string {
  const raw = url.trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, 'https://placeholder.local');
    return parsed.pathname.replace(/\/+$/, '');
  } catch {
    return raw.split('?')[0].trim();
  }
}

function stripHeroImageFromHtml(
  html: string,
  heroUrl: string
): { bodyHtml: string; heroCaption: string } {
  if (!html || !heroUrl || typeof DOMParser === 'undefined') {
    return { bodyHtml: html, heroCaption: '' };
  }
  const targetRef = normalizeMediaRef(heroUrl);
  if (!targetRef) return { bodyHtml: html, heroCaption: '' };

  const doc = new DOMParser().parseFromString(html, 'text/html');
  let heroCaption = '';
  const imgs = Array.from(doc.body.querySelectorAll('img'));

  for (const img of imgs) {
    const src = img.getAttribute('src') || '';
    if (normalizeMediaRef(src) !== targetRef) continue;

    const figure = img.closest('figure');
    if (figure && figure.querySelectorAll('img').length === 1) {
      const cap = figure.querySelector('figcaption')?.textContent?.trim() || '';
      if (cap && !heroCaption) heroCaption = cap;
      figure.remove();
    } else {
      img.remove();
    }
  }

  return {
    bodyHtml: doc.body.innerHTML.trim(),
    heroCaption,
  };
}

export function BlogPublicPage({
  filterMode,
}: {
  filterMode?: 'category' | 'tag';
}) {
  const { slug } = useParams<{ slug?: string }>();
  const { options, widgets } = usePublicSite();

  const isDetail = Boolean(slug && !filterMode);

  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [categories, setCategories] = useState<Term[]>([]);
  const [tags, setTags] = useState<Term[]>([]);
  const [detail, setDetail] = useState<PostRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    filterMode === 'category' && slug ? slug : 'all'
  );
  const [selectedTag, setSelectedTag] = useState<string>(
    filterMode === 'tag' && slug ? slug : 'all'
  );
  const [page, setPage] = useState(1);

  usePageSeo({
    title: isDetail && detail ? detail.title : 'Berita & Artikel Huria',
    description:
      isDetail && detail
        ? detail.excerpt
        : `Kumpulan berita pelayanan, renungan, dan pengumuman ${options.site_title}.`,
    siteTitle: options.site_title,
  });

  useEffect(() => {
    if (filterMode === 'category') {
      setSelectedCategory(slug || 'all');
      setSelectedTag('all');
    } else if (filterMode === 'tag') {
      setSelectedTag(slug || 'all');
      setSelectedCategory('all');
    }
    setPage(1);
  }, [filterMode, slug]);

  useEffect(() => {
    setLoading(true);
    if (isDetail && slug) {
      fetchPublishedPostBySlug(slug, 'post').then((post) => {
        setDetail(post);
        setLoading(false);
      });
    } else {
      Promise.all([
        fetchPublishedPosts('post', 100),
        fetchTerms('category'),
        fetchTerms('post_tag'),
      ]).then(([list, cats, tagList]) => {
        setPosts(list);
        setCategories(cats);
        setTags(tagList);
        setLoading(false);
      });
    }
  }, [isDetail, slug]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (
        selectedCategory !== 'all' &&
        !p.terms?.some((t) => t.taxonomy === 'category' && t.slug === selectedCategory)
      ) {
        return false;
      }
      if (
        selectedTag !== 'all' &&
        !p.terms?.some((t) => t.taxonomy === 'post_tag' && t.slug === selectedTag)
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posts, selectedCategory, selectedTag, search]);

  const perPage = options.posts_per_page || 10;
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / perPage));
  const pagedPosts = filteredPosts.slice((page - 1) * perPage, page * perPage);

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';
  const sidebarWidgets = widgets.filter((w) => w.area === 'sidebar' && w.is_active);

  if (isDetail) {
    if (loading) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-12 text-sm text-slate-500">
          Memuat artikel...
        </div>
      );
    }
    if (!detail) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#0f172a]">
            Artikel tidak ditemukan
          </h1>
          <Link
            to="/berita"
            className="text-sm font-semibold underline"
            style={{ color: primaryColor }}
          >
            &larr; Kembali ke Berita
          </Link>
        </div>
      );
    }

    const cover = resolvePostFeaturedImage(detail);
    const { bodyHtml, heroCaption } = stripHeroImageFromHtml(
      detail.content_html || '',
      cover
    );

    return (
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <Link
          to="/berita"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Semua Berita &amp; Artikel</span>
        </Link>

        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono-num">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" style={{ color: accentColor }} />
              {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                new Date(detail.published_at || detail.created_at)
              )}
            </span>
            {detail.author?.display_name && (
              <span className="inline-flex items-center gap-1.5 font-sans">
                <User className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                {detail.author.display_name}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0f172a] leading-tight">
            {detail.title}
          </h1>

          {detail.terms && detail.terms.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              {detail.terms.map((t) => (
                <Link
                  key={t.id}
                  to={
                    t.taxonomy === 'category'
                      ? `/kategori/${t.slug}`
                      : `/tag/${t.slug}`
                  }
                  className="underline text-slate-600 hover:text-[#0f294a]"
                >
                  {t.taxonomy === 'post_tag' ? `#${t.name}` : t.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        {cover && (
          <figure className="space-y-2">
            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-[#e2e8f0] bg-slate-100">
              <img
                src={cover}
                alt={detail.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            {heroCaption && (
              <figcaption className="text-xs text-slate-500 italic">
                {heroCaption}
              </figcaption>
            )}
          </figure>
        )}

        <div
          className="surface-card p-6 sm:p-8 space-y-4 text-base text-slate-800 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[#0f172a] [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#0f172a] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:p-4 [&_blockquote]:bg-slate-50 [&_blockquote]:border [&_blockquote]:border-[#e2e8f0] [&_blockquote]:rounded-lg [&_blockquote]:italic [&_iframe]:w-full [&_iframe]:aspect-video [&_img]:w-full [&_img]:aspect-[16/9] [&_img]:object-cover [&_img]:rounded-lg [&_img]:mx-auto"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(bodyHtml || '<p>Belum ada isi artikel.</p>'),
          }}
        />
      </article>
    );
  }

  return (
    <div className="bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <header className="mb-8">
          <p
            className="text-xs uppercase tracking-[0.12em] font-semibold mb-2"
            style={{ color: accentColor }}
          >
            Kabar Pelayanan &amp; Renungan
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0f172a] mb-2">
            Berita &amp; Artikel Huria
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Bar Pencarian */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari berita, renungan, atau pengumuman..."
                  className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#0f294a]"
                />
              </div>
              {(selectedCategory !== 'all' || selectedTag !== 'all') && (
                <Link
                  to="/berita"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedTag('all');
                  }}
                  className="text-xs font-semibold underline text-slate-600 hover:text-[#0f294a]"
                >
                  Reset filter
                </Link>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Memuat berita...</p>
            ) : pagedPosts.length === 0 ? (
              <div className="surface-card p-8 text-center text-sm text-slate-600">
                Belum ada artikel yang cocok dengan filter Anda.
              </div>
            ) : (
              <div className="space-y-5">
                {pagedPosts.map((post) => {
                  const thumb = resolvePostFeaturedImage(post);
                  const categoryName = post.terms?.find((t) => t.taxonomy === 'category')?.name;
                  return (
                    <article
                      key={post.id}
                      className="surface-card overflow-hidden grid grid-cols-1 sm:grid-cols-12 group"
                    >
                      <Link
                        to={`/berita/${post.slug}`}
                        className="sm:col-span-4 block self-stretch"
                      >
                        <PostThumbnail
                          src={thumb}
                          alt={post.title}
                          categoryLabel={categoryName}
                          className="w-full aspect-[16/9]"
                        />
                      </Link>
                      <div className="p-5 flex flex-col justify-between sm:col-span-8">
                        <div>
                          <p className="text-xs text-slate-500 mb-1.5 font-mono-num">
                            {new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'long',
                            }).format(new Date(post.published_at || post.created_at))}
                          </p>
                          <Link
                            to={`/berita/${post.slug}`}
                            className="font-display text-xl font-bold text-[#0f172a] hover:text-[#0f294a] hover:underline block mb-2"
                          >
                            {post.title}
                          </Link>
                          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                            {post.excerpt}
                          </p>
                        </div>
                        <Link
                          to={`/berita/${post.slug}`}
                          className="text-xs font-semibold hover:underline"
                          style={{ color: primaryColor }}
                        >
                          Baca selengkapnya &rarr;
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Paginasi */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0] text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg font-medium disabled:opacity-40 cursor-pointer"
                >
                  &larr; Sebelumnya
                </button>
                <span className="text-slate-600 font-mono-num text-xs">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg font-medium disabled:opacity-40 cursor-pointer"
                >
                  Berikutnya &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Kategori, Tag & Widget */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="surface-card p-5">
              <h2 className="font-display text-lg font-bold text-[#0f172a] mb-3">
                Kategori
              </h2>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setPage(1);
                    }}
                    className={`hover:underline cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'font-semibold text-[#0f294a]'
                        : 'text-slate-700'
                    }`}
                  >
                    Semua Kategori
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between">
                    <Link
                      to={`/kategori/${cat.slug}`}
                      className={`hover:underline ${
                        selectedCategory === cat.slug
                          ? 'font-semibold text-[#0f294a]'
                          : 'text-slate-700'
                      }`}
                    >
                      {cat.name}
                    </Link>
                    <span className="text-xs text-slate-400 font-mono-num">{cat.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            {tags.length > 0 && (
              <div className="surface-card p-5">
                <h2 className="font-display text-lg font-bold text-[#0f172a] mb-3">
                  Topik / Tag
                </h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
                  {tags.map((tag) => (
                    <Link
                      key={tag.id}
                      to={`/tag/${tag.slug}`}
                      className={`hover:underline ${
                        selectedTag === tag.slug
                          ? 'font-semibold text-[#0f294a]'
                          : 'text-slate-600'
                      }`}
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {sidebarWidgets.map((w) => (
              <div key={w.id} className="surface-card p-5">
                <h2 className="font-display text-lg font-bold text-[#0f172a] mb-2">
                  {w.title}
                </h2>
                <p className="text-sm text-slate-600 whitespace-pre-line">
                  {String(w.config?.body || '')}
                </p>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}
