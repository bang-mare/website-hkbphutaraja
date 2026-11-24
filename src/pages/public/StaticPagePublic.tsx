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

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-[15px] text-slate-500">
        Memuat halaman...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <p
          className="text-xs uppercase tracking-[0.12em] font-semibold"
          style={{ color: accentColor }}
        >
          Halaman 404
        </p>
        <h1 className="heading-page font-display font-bold text-[#0f172a]">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-[15px] text-slate-600">
          Maaf, halaman yang Anda cari belum diterbitkan atau alamat tautan telah berubah.
        </p>
        <Link
          to="/"
          style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          className="btn-navy inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 text-sm rounded-lg"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const cover = resolvePostFeaturedImage(page);

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-6">
      <header className="border-b border-[#e2e8f0] pb-5">
        <h1 className="heading-page font-display font-bold text-[#0f172a]">
          {page.title}
        </h1>
      </header>

      {cover && (
        <img
          src={cover}
          alt={page.title}
          referrerPolicy="no-referrer"
          className="w-full max-h-[60dvh] object-cover rounded-xl border border-[#e2e8f0]"
        />
      )}

      <div
        className="surface-card p-5 sm:p-8 space-y-4 text-base sm:text-[17px] text-slate-800 leading-[1.75] hkbp-prose [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[#0f172a] [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#0f172a] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:p-4 [&_blockquote]:bg-slate-50 [&_blockquote]:border [&_blockquote]:border-[#e2e8f0] [&_blockquote]:rounded-lg [&_blockquote]:italic [&_iframe]:w-full [&_iframe]:aspect-video"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(page.content_html || ''),
        }}
      />
    </article>
  );
}
