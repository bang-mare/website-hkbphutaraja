import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Download, FileText } from 'lucide-react';
import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';
import { sanitizeHtml } from '../../lib/blocks';
import { fetchPublishedPostBySlug, fetchPublishedPosts } from '../../lib/publicData';
import type { PostRecord } from '../../types/cms';

export function WartaPublicPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { options } = usePublicSite();

  const [list, setList] = useState<PostRecord[]>([]);
  const [detail, setDetail] = useState<PostRecord | null>(null);
  const [loading, setLoading] = useState(true);

  usePageSeo({
    title: slug && detail ? detail.title : 'Warta Jemaat',
    description:
      slug && detail
        ? detail.excerpt
        : `Arsip Warta Jemaat mingguan ${options.site_title}. Baca online atau unduh PDF.`,
    siteTitle: options.site_title,
  });

  useEffect(() => {
    setLoading(true);
    if (slug) {
      fetchPublishedPostBySlug(slug, 'warta').then((post) => {
        setDetail(post);
        setLoading(false);
      });
    } else {
      fetchPublishedPosts('warta', 30).then((posts) => {
        setList(posts);
        setLoading(false);
      });
    }
  }, [slug]);

  const primaryColor = options.theme_primary_color || '#1E3A5F';
  const accentColor = options.theme_accent_color || '#9A3412';

  if (slug) {
    if (loading) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-12 text-sm text-stone-500">
          Memuat warta jemaat...
        </div>
      );
    }

    if (!detail) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
          <h1 className="font-display text-2xl font-semibold">
            Warta jemaat tidak ditemukan
          </h1>
          <Link to="/warta" className="text-sm underline" style={{ color: primaryColor }}>
            &larr; Kembali ke daftar Warta Jemaat
          </Link>
        </div>
      );
    }

    const pdfUrl = (detail.meta?.warta_pdf_url as string) || '';
    const wartaDate = (detail.meta?.warta_date as string) || '';

    return (
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <Link
          to="/warta"
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Semua Warta Jemaat</span>
        </Link>

        <header className="pb-6 border-b border-stone-200 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {wartaDate ||
                new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                  new Date(detail.published_at || detail.created_at)
                )}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
            {detail.title}
          </h1>
          {pdfUrl && (
            <div className="pt-2">
              <a
                href={pdfUrl}
                style={{ backgroundColor: accentColor }}
                className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md hover:opacity-95"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Dokumen PDF Warta</span>
              </a>
            </div>
          )}
        </header>

        <div
          className="bg-white border border-stone-200 rounded-md p-6 sm:p-8 space-y-4 text-base leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:p-4 [&_blockquote]:bg-[#F4EFE6] [&_blockquote]:border [&_blockquote]:border-stone-200 [&_blockquote]:italic"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(detail.content_html || '<p>Isi warta belum tersedia.</p>'),
          }}
        />
      </article>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-[#9A3412] font-semibold mb-2">
          Tingting &amp; Informasi Mingguan
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mb-2">
          Warta Jemaat Mingguan
        </h1>
        <p className="text-sm text-stone-600 max-w-2xl">
          Baca warta pelayanan mingguan secara daring atau unduh berkas PDF resmi yang dikeluarkan sekretariat {options.site_title}.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-stone-500">Memuat arsip warta...</p>
      ) : list.length === 0 ? (
        <div className="p-8 bg-white border border-stone-200 rounded-md text-center text-sm text-stone-600">
          Belum ada Warta Jemaat yang diterbitkan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((item) => {
            const pdfUrl = (item.meta?.warta_pdf_url as string) || '';
            const wartaDate = (item.meta?.warta_date as string) || '';
            return (
              <div
                key={item.id}
                className="p-6 bg-white border border-stone-200 rounded-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-2 tabular-nums">
                    <FileText className="w-4 h-4 text-[#9A3412]" />
                    <span>
                      {wartaDate ||
                        new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                          new Date(item.published_at || item.created_at)
                        )}
                    </span>
                  </div>
                  <Link
                    to={`/warta/${item.slug}`}
                    className="font-display text-xl font-semibold text-[#1C1917] hover:underline block mb-2"
                  >
                    {item.title}
                  </Link>
                  <p className="text-sm text-stone-600 line-clamp-3 mb-4">
                    {item.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-medium">
                  <Link
                    to={`/warta/${item.slug}`}
                    className="hover:underline"
                    style={{ color: primaryColor }}
                  >
                    Baca Online &rarr;
                  </Link>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: accentColor }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
