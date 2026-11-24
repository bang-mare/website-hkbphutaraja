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

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  if (slug) {
    if (loading) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-[15px] text-slate-500">
          Memuat warta jemaat...
        </div>
      );
    }

    if (!detail) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-4">
          <h1 className="heading-page font-display font-bold text-[#0f172a]">
            Warta jemaat tidak ditemukan
          </h1>
          <Link
            to="/warta"
            className="inline-flex items-center min-h-[44px] text-[15px] font-semibold underline"
            style={{ color: primaryColor }}
          >
            &larr; Kembali ke daftar Warta Jemaat
          </Link>
        </div>
      );
    }

    const pdfUrl = (detail.meta?.warta_pdf_url as string) || '';
    const wartaDate = (detail.meta?.warta_date as string) || '';

    return (
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-6">
        <Link
          to="/warta"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-[15px] font-semibold hover:underline"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Semua Warta Jemaat</span>
        </Link>

        <header className="pb-6 border-b border-[#e2e8f0] space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-mono-num">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
              {wartaDate ||
                new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                  new Date(detail.published_at || detail.created_at)
                )}
            </span>
          </div>
          <h1 className="heading-page font-display font-bold text-[#0f172a]">
            {detail.title}
          </h1>
          {pdfUrl && (
            <div className="pt-2">
              <a
                href={pdfUrl}
                style={{ backgroundColor: accentColor, borderColor: accentColor }}
                className="btn-gold inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm rounded-lg whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Unduh Dokumen PDF Warta</span>
              </a>
            </div>
          )}
        </header>

        <div
          className="surface-card p-5 sm:p-8 space-y-4 text-base sm:text-[17px] text-slate-800 leading-[1.75] hkbp-prose [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[#0f172a] [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#0f172a] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:p-4 [&_blockquote]:bg-slate-50 [&_blockquote]:border [&_blockquote]:border-[#e2e8f0] [&_blockquote]:rounded-lg [&_blockquote]:italic"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(detail.content_html || '<p>Isi warta belum tersedia.</p>'),
          }}
        />
      </article>
    );
  }

  return (
    <div className="bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
        <header>
          <p
            className="text-xs uppercase tracking-[0.12em] font-semibold mb-2"
            style={{ color: accentColor }}
          >
            Tingting &amp; Informasi Mingguan
          </p>
          <h1 className="heading-page font-display font-bold text-[#0f172a] mb-2">
            Warta Jemaat Mingguan
          </h1>
          <p className="text-[15px] sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Baca warta pelayanan mingguan secara daring atau unduh berkas PDF resmi yang dikeluarkan sekretariat {options.site_title}.
          </p>
        </header>

        {loading ? (
          <p className="text-[15px] text-slate-500">Memuat arsip warta...</p>
        ) : list.length === 0 ? (
          <div className="surface-card p-8 text-center text-[15px] text-slate-600">
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
                  className="surface-card p-6 flex flex-col justify-between hover:border-[#d97706] transition-colors min-w-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 font-mono-num">
                      <FileText className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                      <span>
                        {wartaDate ||
                          new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                            new Date(item.published_at || item.created_at)
                          )}
                      </span>
                    </div>
                    <Link
                      to={`/warta/${item.slug}`}
                      className="font-display text-xl font-bold text-[#0f172a] hover:text-[#0f294a] hover:underline block mb-2 break-words"
                    >
                      {item.title}
                    </Link>
                    <p className="text-[15px] text-slate-600 line-clamp-3 mb-4 break-words">
                      {item.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
                    <Link
                      to={`/warta/${item.slug}`}
                      className="btn-navy inline-flex items-center justify-center px-3.5 py-2 min-h-[44px] sm:min-h-[36px] rounded-md"
                      style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                    >
                      Baca Online
                    </Link>
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] hover:underline"
                        style={{ color: accentColor }}
                      >
                        <Download className="w-4 h-4 shrink-0" />
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
    </div>
  );
}
