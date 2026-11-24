import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';
import { sanitizeHtml } from '../../lib/blocks';
import {
  fetchPublishedPostBySlug,
  resolvePostFeaturedImage,
} from '../../lib/publicData';
import type { PostRecord } from '../../types/cms';

export function StaticPagePublic() {
  const { slug } = useParams<{ slug: string }>();
  const { options } = usePublicSite();
  const [page, setPage] = useState<PostRecord | null>(null);
  const [loading, setLoading] = useState(true);

  usePageSeo({
    title: page ? page.title : 'Halaman Tidak Ditemukan',
    description: page?.excerpt,
    siteTitle: options.site_title,
  });

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPublishedPostBySlug(slug, 'page').then((data) => {
      setPage(data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-sm text-stone-500">
        Memuat halaman...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-xs uppercase tracking-widest text-[#9A3412] font-semibold">
          Halaman 404
        </p>
        <h1 className="font-display text-3xl font-semibold text-[#1C1917]">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm text-stone-600">
          Maaf, halaman yang Anda cari belum diterbitkan atau alamat tautan telah berubah.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-[#1E3A5F] text-white text-sm font-medium rounded-md"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const cover = resolvePostFeaturedImage(page);

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <header className="border-b border-stone-200 pb-5">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
          {page.title}
        </h1>
      </header>

      {cover && (
        <img
          src={cover}
          alt={page.title}
          className="w-full max-h-96 object-cover rounded-md border border-stone-200"
        />
      )}

      <div
        className="bg-white border border-stone-200 rounded-md p-6 sm:p-8 space-y-4 text-base leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:p-4 [&_blockquote]:bg-[#F4EFE6] [&_blockquote]:border [&_blockquote]:border-stone-200 [&_blockquote]:italic [&_iframe]:w-full [&_iframe]:aspect-video"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(page.content_html || ''),
        }}
      />
    </article>
  );
}
