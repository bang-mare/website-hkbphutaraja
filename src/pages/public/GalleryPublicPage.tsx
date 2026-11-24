import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Images, Video, X } from 'lucide-react';
import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';
import { extractYouTubeId } from '../../lib/blocks';
import {
  fetchPublishedPostBySlug,
  fetchPublishedPosts,
  resolvePostFeaturedImage,
} from '../../lib/publicData';
import type { PostRecord } from '../../types/cms';

interface AlbumPhoto {
  url: string;
  alt: string;
  caption?: string;
}

export function GalleryPublicPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { options } = usePublicSite();

  const [albums, setAlbums] = useState<PostRecord[]>([]);
  const [detail, setDetail] = useState<PostRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState<AlbumPhoto | null>(null);

  usePageSeo({
    title: slug && detail ? detail.title : 'Galeri Foto & Video',
    description: `Dokumentasi foto dan video kegiatan pelayanan ${options.site_title}.`,
    siteTitle: options.site_title,
  });

  useEffect(() => {
    setLoading(true);
    if (slug) {
      fetchPublishedPostBySlug(slug, 'album').then((album) => {
        setDetail(album);
        setLoading(false);
      });
    } else {
      fetchPublishedPosts('album', 30).then((list) => {
        setAlbums(list);
        setLoading(false);
      });
    }
  }, [slug]);

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  if (slug) {
    if (loading) {
      return (
        <div className="max-w-5xl mx-auto px-4 py-12 text-sm text-slate-500">
          Memuat album galeri...
        </div>
      );
    }
    if (!detail) {
      return (
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#0f172a]">
            Album tidak ditemukan
          </h1>
          <Link
            to="/galeri"
            className="text-sm font-semibold underline"
            style={{ color: primaryColor }}
          >
            &larr; Kembali ke Galeri
          </Link>
        </div>
      );
    }

    const photos = (detail.meta?.album_photos as AlbumPhoto[]) || [];
    const videos = (detail.meta?.album_videos as string[]) || [];

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <Link
          to="/galeri"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Semua Album Galeri</span>
        </Link>

        <header>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0f172a] mb-2">
            {detail.title}
          </h1>
          {detail.excerpt && (
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl">{detail.excerpt}</p>
          )}
        </header>

        {photos.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#0f172a]">
              Dokumentasi Foto ({photos.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxPhoto(photo)}
                  className="surface-card overflow-hidden text-left hover:border-[#d97706] transition-colors cursor-pointer group"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-[#0f294a] to-[#1e3a8a] overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.alt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                  {photo.caption && (
                    <p className="p-2.5 text-xs text-slate-600 line-clamp-2">
                      {photo.caption}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#0f172a]">
              Video Kegiatan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((vUrl, idx) => {
                const ytId = extractYouTubeId(vUrl);
                if (!ytId) return null;
                return (
                  <div
                    key={idx}
                    className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-[#e2e8f0]"
                  >
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={`Video Album ${idx + 1}`}
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {lightboxPhoto && (
          <div
            onClick={() => setLightboxPhoto(null)}
            className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full bg-white rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="px-4 py-3 flex items-center justify-between border-b border-[#e2e8f0]">
                <span className="text-sm font-semibold text-[#0f172a]">
                  {lightboxPhoto.caption || lightboxPhoto.alt}
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="p-1 text-slate-600 hover:text-[#0f172a] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.alt}
                referrerPolicy="no-referrer"
                className="w-full max-h-[75vh] object-contain bg-slate-950"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <header>
          <p
            className="text-xs uppercase tracking-[0.12em] font-semibold mb-2"
            style={{ color: accentColor }}
          >
            Dokumentasi Kegiatan
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0f172a] mb-2">
            Galeri Foto &amp; Video Huria
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Kumpulan album dokumentasi ibadah, perayaan hari besar gerejawi, dan kegiatan enam lingkungan.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-500">Memuat galeri...</p>
        ) : albums.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-slate-600">
            Belum ada album galeri yang diterbitkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => {
              const cover = resolvePostFeaturedImage(album);
              const photos = (album.meta?.album_photos as AlbumPhoto[]) || [];
              const videos = (album.meta?.album_videos as string[]) || [];
              return (
                <Link
                  key={album.id}
                  to={`/galeri/${album.slug}`}
                  className="surface-card overflow-hidden hover:border-[#d97706] transition-colors flex flex-col group"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-[#0f294a] to-[#1e3a8a] flex items-center justify-center overflow-hidden">
                    {cover ? (
                      <img
                        src={cover}
                        alt={album.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    ) : (
                      <Images className="w-10 h-10 text-white/50" />
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="font-display text-xl font-bold text-[#0f172a] group-hover:text-[#0f294a] mb-1.5">
                        {album.title}
                      </h2>
                      {album.excerpt && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                          {album.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-mono-num pt-3 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1">
                        <Images className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                        {photos.length} foto
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        {videos.length} video
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
