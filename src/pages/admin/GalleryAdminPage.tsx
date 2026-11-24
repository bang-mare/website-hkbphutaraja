import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Images, Plus, Trash2, Video, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { MediaPickerModal } from '../../components/admin/MediaPickerModal';
import { getMediaProxyUrl } from '../../lib/mediaClient';
import {
  deletePostsPermanently,
  fetchPostById,
  fetchPostsByType,
  savePost,
} from '../../lib/cmsData';
import { extractYouTubeId, slugify } from '../../lib/blocks';
import type { MediaItem, PostRecord, PostStatus } from '../../types/cms';

interface AlbumPhoto {
  url: string;
  alt: string;
  caption: string;
}

export function GalleryAdminPage({ createMode = false }: { createMode?: boolean }) {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { addNotice } = useAdmin();

  const isEditing = createMode || Boolean(id);

  // List state
  const [albums, setAlbums] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [albumId, setAlbumId] = useState<string | undefined>(id);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState<PostStatus>('publish');
  const [coverUrl, setCoverUrl] = useState('');
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [pickerMode, setPickerMode] = useState<null | 'cover' | 'photos'>(null);

  const loadList = async () => {
    setLoading(true);
    const { posts, error } = await fetchPostsByType('album');
    setLoading(false);
    if (error) {
      addNotice({ type: 'error', message: error });
    } else {
      setAlbums(posts.filter((a) => a.status !== 'trash'));
    }
  };

  useEffect(() => {
    if (!isEditing) {
      void loadList();
      return;
    }

    if (id) {
      setLoading(true);
      fetchPostById(id).then(({ post, error }) => {
        setLoading(false);
        if (error || !post) {
          addNotice({ type: 'error', message: error || 'Album tidak ditemukan.' });
          navigate('/admin/galeri');
          return;
        }
        setAlbumId(post.id);
        setTitle(post.title);
        setSlug(post.slug);
        setExcerpt(post.excerpt || '');
        setStatus(post.status);
        setCoverUrl((post.meta?.featured_url as string) || '');
        setPhotos((post.meta?.album_photos as AlbumPhoto[]) || []);
        setVideos((post.meta?.album_videos as string[]) || []);
      });
    } else {
      setAlbumId(undefined);
      setTitle('');
      setSlug('');
      setExcerpt('');
      setStatus('publish');
      setCoverUrl('');
      setPhotos([]);
      setVideos([]);
      setLoading(false);
    }
  }, [id, createMode, isEditing]);

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addNotice({ type: 'warning', message: 'Judul album wajib diisi.' });
      return;
    }
    setSaving(true);
    const { post, error } = await savePost({
      id: albumId,
      type: 'album',
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      content: [
        {
          id: 'alb-desc',
          type: 'paragraph',
          content: excerpt.trim(),
        },
        ...(photos.length > 0
          ? [
              {
                id: 'alb-gal',
                type: 'gallery' as const,
                gallery: photos,
                caption: title.trim(),
              },
            ]
          : []),
      ],
      excerpt: excerpt.trim(),
      status,
      author_id: profile?.id || null,
      meta: {
        featured_url: coverUrl || photos[0]?.url || '',
        album_photos: photos,
        album_videos: videos,
      },
    });
    setSaving(false);

    if (error || !post) {
      addNotice({ type: 'error', message: error || 'Gagal menyimpan album.' });
      return;
    }

    addNotice({
      type: 'success',
      message: 'Album galeri berhasil disimpan.',
      linkLabel: 'Kembali ke daftar album',
      linkTo: '/admin/galeri',
    });
    navigate(`/admin/galeri/${post.id}`, { replace: true });
  };

  const handleAddVideo = () => {
    const trimmed = newVideoUrl.trim();
    if (!trimmed) return;
    if (!extractYouTubeId(trimmed)) {
      addNotice({
        type: 'warning',
        message: 'Masukkan tautan YouTube yang valid (youtube.com/watch?v=... atau youtu.be/...).',
      });
      return;
    }
    setVideos((prev) => [...prev, trimmed]);
    setNewVideoUrl('');
  };

  const handleDeleteAlbum = async (targetId: string) => {
    const { error } = await deletePostsPermanently([targetId]);
    if (error) {
      addNotice({ type: 'error', message: error });
    } else {
      addNotice({ type: 'success', message: 'Album dihapus.' });
      setAlbums((prev) => prev.filter((a) => a.id !== targetId));
    }
  };

  if (isEditing) {
    return (
      <div className="pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-[23px] font-normal text-[#1d2327]">
            {albumId ? 'Edit Album Galeri' : 'Tambah Album Galeri'}
          </h1>
          <Link
            to="/admin/galeri"
            className="px-3 py-1 text-[13px] border border-[#c3c4c7] bg-white hover:bg-[#f6f7f7] rounded-[3px]"
          >
            &larr; Kembali ke Semua Album
          </Link>
        </div>

        <form onSubmit={handleSaveAlbum} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 min-w-0 space-y-4">
            <div className="bg-white border border-[#c3c4c7] p-4 space-y-3 text-[13px]">
              <div>
                <label className="block font-semibold text-[#1d2327] mb-1">
                  Nama Album Kegiatan
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!albumId) setSlug(slugify(e.target.value));
                  }}
                  placeholder="Mis. Perayaan Natal Jemaat 2026"
                  className="w-full h-9 px-3 border border-[#8c8f94] rounded-[3px]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1d2327] mb-1">
                  Slug URL
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full h-8 px-3 border border-[#8c8f94] rounded-[3px] font-mono text-[12px]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1d2327] mb-1">
                  Deskripsi Singkat Album
                </label>
                <textarea
                  rows={3}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Keterangan singkat acara atau dokumentasi..."
                  className="w-full p-2.5 border border-[#8c8f94] rounded-[3px]"
                />
              </div>
            </div>

            {/* Daftar Foto Album */}
            <div className="bg-white border border-[#c3c4c7] p-4 text-[13px]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-[14px] font-semibold text-[#1d2327]">
                  Foto Dokumentasi ({photos.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setPickerMode('photos')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] bg-[#2271b1] hover:bg-[#135e96] text-white rounded-[3px] cursor-pointer"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Tambah Foto dari Google Drive</span>
                </button>
              </div>

              {photos.length === 0 ? (
                <p className="text-[#50575e] py-6 text-center bg-[#f6f7f7] border border-dashed border-[#c3c4c7]">
                  Belum ada foto di album ini. Klik tombol di atas untuk memilih foto dari Pustaka Media.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos.map((photo, idx) => (
                    <div
                      key={`${photo.url}-${idx}`}
                      className="border border-[#c3c4c7] bg-[#f6f7f7] p-1.5 space-y-1.5 relative"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setPhotos((prev) => prev.filter((_, i) => i !== idx))
                        }
                        title="Hapus foto dari album"
                        className="absolute top-2 right-2 w-8 h-8 sm:w-6 sm:h-6 bg-[#d63638] text-white rounded flex items-center justify-center cursor-pointer shadow"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <img
                        src={photo.url}
                        alt={photo.alt}
                        className="w-full h-28 object-cover bg-white"
                      />
                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) => {
                          const next = [...photos];
                          next[idx] = { ...next[idx], caption: e.target.value };
                          setPhotos(next);
                        }}
                        placeholder="Keterangan foto..."
                        className="w-full h-7 px-1.5 bg-white border border-[#dcdcde] text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video YouTube */}
            <div className="bg-white border border-[#c3c4c7] p-4 text-[13px] space-y-3">
              <h2 className="text-[14px] font-semibold text-[#1d2327]">
                Dokumentasi Video YouTube ({videos.length})
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 min-w-0 h-9 sm:h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
                />
                <button
                  type="button"
                  onClick={handleAddVideo}
                  className="px-3 h-9 sm:h-8 border border-[#2271b1] text-[#2271b1] bg-[#f6f7f7] hover:bg-[#f0f6fc] rounded-[3px] cursor-pointer shrink-0"
                >
                  + Tambah Video
                </button>
              </div>
              {videos.length > 0 && (
                <ul className="divide-y divide-[#f0f0f1]">
                  {videos.map((v, idx) => (
                    <li key={idx} className="py-2 flex items-center justify-between gap-2 min-w-0">
                      <span className="inline-flex items-center gap-2 text-[#1d2327] min-w-0 flex-1">
                        <Video className="w-4 h-4 text-[#2271b1] shrink-0" />
                        <span className="truncate">{v}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVideos((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-[#d63638] text-[12px] hover:underline cursor-pointer shrink-0 px-2 py-1"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4 text-[13px]">
            <div className="bg-white border border-[#c3c4c7]">
              <div className="px-3.5 py-2.5 border-b border-[#c3c4c7] font-semibold">
                Terbitkan Album
              </div>
              <div className="p-3.5 space-y-3">
                <div>
                  <label className="block text-[#50575e] mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PostStatus)}
                    className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                  >
                    <option value="publish">Terbit</option>
                    <option value="draft">Draf</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Album'}
                </button>
              </div>
            </div>

            <div className="bg-white border border-[#c3c4c7]">
              <div className="px-3.5 py-2.5 border-b border-[#c3c4c7] font-semibold">
                Sampul Album
              </div>
              <div className="p-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setPickerMode('cover')}
                  className="w-full py-1.5 border border-dashed border-[#8c8f94] bg-[#f6f7f7] text-[12px] hover:border-[#2271b1] rounded-[3px] cursor-pointer"
                >
                  Pilih Gambar Sampul
                </button>
                {coverUrl && (
                  <img
                    src={coverUrl}
                    alt="Sampul Album"
                    className="w-full h-36 object-cover border border-[#dcdcde]"
                  />
                )}
              </div>
            </div>
          </div>
        </form>

        <MediaPickerModal
          open={Boolean(pickerMode)}
          onClose={() => setPickerMode(null)}
          multiple={pickerMode === 'photos'}
          accept="image"
          title={
            pickerMode === 'cover' ? 'Pilih Gambar Sampul Album' : 'Pilih Foto Album'
          }
          onSelect={(items: MediaItem[]) => {
            if (pickerMode === 'cover' && items[0]) {
              setCoverUrl(getMediaProxyUrl(items[0].id, { width: 768 }));
            } else if (pickerMode === 'photos') {
              setPhotos((prev) => [
                ...prev,
                ...items.map((m) => ({
                  url: getMediaProxyUrl(m.id, { width: 1024 }),
                  alt: m.alt || m.nama,
                  caption: m.caption || '',
                })),
              ]);
            }
            setPickerMode(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-[23px] font-normal text-[#1d2327]">Album Galeri</h1>
        <Link
          to="/admin/galeri/new"
          className="px-3 py-1 text-[13px] text-[#2271b1] border border-[#2271b1] bg-[#f6f7f7] hover:bg-[#f0f6fc] rounded-[3px]"
        >
          Tambah Album
        </Link>
      </div>

      {loading ? (
        <div className="bg-white border border-[#c3c4c7] p-8 text-center text-[13px] text-[#50575e]">
          Memuat daftar album...
        </div>
      ) : albums.length === 0 ? (
        <div className="bg-white border border-[#c3c4c7] p-8 text-center text-[13px] text-[#50575e]">
          <Images className="w-10 h-10 text-[#8c8f94] mx-auto mb-2" />
          <p className="mb-3">Belum ada album galeri foto/video.</p>
          <Link
            to="/admin/galeri/new"
            className="inline-block px-4 py-1.5 bg-[#2271b1] text-white rounded-[3px]"
          >
            Buat Album Pertama
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-[#c3c4c7] overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#c3c4c7] text-left">
                <th className="p-2.5 font-semibold">Judul Album</th>
                <th className="p-2.5 font-semibold">Foto / Video</th>
                <th className="p-2.5 font-semibold">Status</th>
                <th className="p-2.5 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f1]">
              {albums.map((album) => {
                const photoList = (album.meta?.album_photos as AlbumPhoto[]) || [];
                const videoList = (album.meta?.album_videos as string[]) || [];
                return (
                  <tr key={album.id} className="hover:bg-[#f6f7f7]">
                    <td className="p-2.5">
                      <Link
                        to={`/admin/galeri/${album.id}`}
                        className="font-semibold text-[#2271b1] hover:underline"
                      >
                        {album.title}
                      </Link>
                      <div className="flex items-center gap-2 text-[12px] mt-0.5">
                        <Link
                          to={`/admin/galeri/${album.id}`}
                          className="text-[#2271b1] hover:underline"
                        >
                          Edit
                        </Link>
                        <span>|</span>
                        <Link
                          to={`/galeri/${album.slug}`}
                          className="text-[#2271b1] hover:underline"
                        >
                          Lihat
                        </Link>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => void handleDeleteAlbum(album.id)}
                          className="text-[#d63638] hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 tabular-nums text-[#50575e]">
                      {photoList.length} foto · {videoList.length} video
                    </td>
                    <td className="p-2.5 text-[#50575e]">
                      {album.status === 'publish' ? 'Terbit' : 'Draf'}
                    </td>
                    <td className="p-2.5 tabular-nums text-[#50575e]">
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
                        new Date(album.updated_at)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
