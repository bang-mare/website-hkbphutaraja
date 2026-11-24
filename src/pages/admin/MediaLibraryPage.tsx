import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  Film,
  Grid,
  List as ListIcon,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { GoogleDriveConnectCard } from '../../components/admin/GoogleDriveConnectCard';
import {
  deleteMediaItems,
  fetchMediaLibrary,
  formatBytes,
  getMediaProxyUrl,
  updateMediaMeta,
  uploadMediaFile,
} from '../../lib/mediaClient';
import type { MediaItem } from '../../types/cms';

interface MediaLibraryPageProps {
  defaultOpenUpload?: boolean;
}

export function MediaLibraryPage({ defaultOpenUpload = false }: MediaLibraryPageProps) {
  const { addNotice, setHelpTabs } = useAdmin();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploader, setShowUploader] = useState(defaultOpenUpload);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Filter & Selection
  const [mimeFilter, setMimeFilter] = useState<'all' | 'image' | 'pdf' | 'video'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Detail Modal
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editDeskripsi, setEditDeskripsi] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowUploader(defaultOpenUpload);
  }, [defaultOpenUpload]);

  useEffect(() => {
    setHelpTabs([
      {
        id: 'media-help',
        title: 'Pustaka Media & Google Drive',
        content: (
          <div className="space-y-2">
            <p>
              Semua gambar, dokumen PDF Warta Jemaat, dan video disimpan aman di Google Drive menggunakan Service Account dan disajikan melalui rute proxy <code>/api/media/[id]</code>.
            </p>
            <p>
              Gambar otomatis dibuatkan variasi thumbnail (150px, 300px, 768px, 1024px) dalam format WebP untuk mempercepat tampilan situs publik.
            </p>
          </div>
        ),
      },
    ]);
    return () => setHelpTabs([]);
  }, [setHelpTabs]);

  const loadLibrary = async () => {
    setLoading(true);
    const { items: data, error } = await fetchMediaLibrary();
    setLoading(false);
    if (error) {
      addNotice({ type: 'error', message: `Gagal memuat pustaka media: ${error}` });
    } else {
      setItems(data);
    }
  };

  useEffect(() => {
    void loadLibrary();
  }, []);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.year_month) set.add(i.year_month);
    });
    return Array.from(set).sort().reverse();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (mimeFilter === 'image' && !item.mime.startsWith('image/')) return false;
      if (mimeFilter === 'pdf' && item.mime !== 'application/pdf') return false;
      if (mimeFilter === 'video' && !item.mime.startsWith('video/')) return false;
      if (monthFilter !== 'all' && item.year_month !== monthFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          item.nama.toLowerCase().includes(q) ||
          item.alt.toLowerCase().includes(q) ||
          item.caption.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, mimeFilter, monthFilter, search]);

  const openDetail = (item: MediaItem) => {
    setDetailItem(item);
    setEditNama(item.nama || '');
    setEditAlt(item.alt || '');
    setEditCaption(item.caption || '');
    setEditDeskripsi(item.deskripsi || '');
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const { media, error } = await uploadMediaFile(files[i]);
      if (error) {
        addNotice({ type: 'error', message: `Gagal mengunggah ${files[i].name}: ${error}` });
      } else if (media) {
        successCount++;
        setItems((prev) => [media, ...prev]);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      addNotice({
        type: 'success',
        message: `${successCount} berkas berhasil diunggah ke Google Drive.`,
      });
    }
  };

  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailItem) return;
    setSavingMeta(true);
    const { error } = await updateMediaMeta(detailItem.id, {
      nama: editNama,
      alt: editAlt,
      caption: editCaption,
      deskripsi: editDeskripsi,
    });
    setSavingMeta(false);
    if (error) {
      addNotice({ type: 'error', message: error });
      return;
    }
    const updated = {
      ...detailItem,
      nama: editNama,
      alt: editAlt,
      caption: editCaption,
      deskripsi: editDeskripsi,
    };
    setDetailItem(updated);
    setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    addNotice({ type: 'success', message: 'Metadata lampiran diperbarui.' });
  };

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return;
    const ids = pendingDeleteIds;
    setDeleting(true);
    const { error } = await deleteMediaItems(ids);
    setDeleting(false);
    setPendingDeleteIds(null);
    if (error) {
      addNotice({ type: 'error', message: error });
      return;
    }
    setItems((prev) => prev.filter((m) => !ids.includes(m.id)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    if (detailItem && ids.includes(detailItem.id)) {
      setDetailItem(null);
    }
    addNotice({
      type: 'success',
      message: `${ids.length} berkas dipindahkan ke sampah Google Drive dan dihapus dari pustaka.`,
    });
  };

  const handleCopyUrl = async (id: string) => {
    const url = `${window.location.origin}${getMediaProxyUrl(id)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="pt-4">
      {/* Header Judul + Tambah Baru ala WordPress */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-[23px] font-normal text-[#1d2327]">Pustaka Media</h1>
        <button
          type="button"
          onClick={() => setShowUploader((v) => !v)}
          className="px-3 py-1 text-[13px] text-[#2271b1] border border-[#2271b1] bg-[#f6f7f7] hover:bg-[#f0f6fc] rounded-[3px] cursor-pointer"
        >
          Tambah Berkas Media Baru
        </button>
      </div>

      {/* Status Koneksi Google Drive */}
      <div className="mb-4">
        <GoogleDriveConnectCard
          compact
          onError={(msg) => addNotice({ type: 'error', message: msg })}
        />
      </div>

      {/* Dropzone Uploader ala WordPress */}
      {showUploader && (
        <div className="bg-white border border-[#c3c4c7] p-6 mb-4 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[14px] font-semibold text-[#1d2327]">
              Unggah Berkas ke Google Drive
            </h2>
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="text-[#50575e] hover:text-[#1d2327] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              void handleUploadFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed p-8 text-center rounded-[2px] transition-colors ${
              dragActive
                ? 'border-[#2271b1] bg-[#f0f6fc]'
                : 'border-[#c3c4c7] bg-[#f6f7f7]'
            }`}
          >
            <UploadCloud className="w-9 h-9 text-[#50575e] mx-auto mb-2" />
            <p className="text-[15px] text-[#1d2327] mb-1">
              Letakkan berkas di mana saja di kotak ini untuk mengunggah
            </p>
            <p className="text-[12px] text-[#50575e] mb-4">
              Mendukung JPG, PNG, WebP, GIF, PDF (Warta Jemaat), dan MP4. Thumbnail otomatis dihasilkan pada ukuran 150, 300, 768, dan 1024 piksel.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,video/mp4"
              onChange={(e) => void handleUploadFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white text-[13px] font-medium rounded-[3px] cursor-pointer"
            >
              {uploading ? 'Mengunggah...' : 'Pilih Berkas'}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar Filter ala WP Media */}
      <div className="bg-white border border-[#c3c4c7] px-3 py-2.5 mb-4 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-[#c3c4c7] rounded-[2px] overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Tampilan Daftar"
              className={`p-1.5 cursor-pointer ${
                viewMode === 'list' ? 'bg-[#f0f0f1] text-[#2271b1]' : 'bg-white text-[#50575e]'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Tampilan Grid"
              className={`p-1.5 cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#f0f0f1] text-[#2271b1]' : 'bg-white text-[#50575e]'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <select
            value={mimeFilter}
            onChange={(e) => setMimeFilter(e.target.value as typeof mimeFilter)}
            className="h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
          >
            <option value="all">Semua item media</option>
            <option value="image">Gambar</option>
            <option value="pdf">Dokumen PDF (Warta)</option>
            <option value="video">Video</option>
          </select>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
          >
            <option value="all">Semua tanggal</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {ym}
              </option>
            ))}
          </select>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => requestDelete(selectedIds)}
              className="inline-flex items-center gap-1 h-8 px-2.5 border border-[#d63638] text-[#d63638] hover:bg-[#fcf0f1] rounded-[3px] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({selectedIds.length})</span>
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#787c82] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari media..."
            className="h-8 pl-8 pr-2.5 border border-[#8c8f94] rounded-[3px] w-48 sm:w-56"
          />
        </div>
      </div>

      {/* Konten Utama: Grid atau Tabel WP */}
      {loading ? (
        <div className="bg-white border border-[#c3c4c7] p-8 text-center text-[13px] text-[#50575e]">
          Memuat pustaka media...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-[#c3c4c7] p-10 text-center text-[13px] text-[#50575e]">
          Tidak ada media ditemukan. Klik <strong>Tambah Berkas Media Baru</strong> untuk mengunggah gambar atau PDF Warta Jemaat ke Google Drive.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isImage = item.mime.startsWith('image/');
            return (
              <div
                key={item.id}
                className={`relative aspect-square bg-white border overflow-hidden group ${
                  isSelected ? 'ring-2 ring-[#2271b1] border-[#2271b1]' : 'border-[#c3c4c7]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openDetail(item)}
                  className="w-full h-full block cursor-pointer"
                >
                  {isImage ? (
                    <img
                      src={getMediaProxyUrl(item.id, { width: 300 })}
                      alt={item.alt || item.nama}
                      className="w-full h-full object-cover"
                    />
                  ) : item.mime === 'application/pdf' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-[#f6f7f7] text-center">
                      <FileText className="w-10 h-10 text-[#9A3412] mb-2" />
                      <span className="text-[11px] text-[#1d2327] line-clamp-2 break-all">
                        {item.nama}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-[#f6f7f7] text-center">
                      <Film className="w-10 h-10 text-[#2271b1] mb-2" />
                      <span className="text-[11px] text-[#1d2327] line-clamp-2 break-all">
                        {item.nama}
                      </span>
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelect(item.id)}
                  title="Pilih media"
                  className={`absolute top-1.5 left-1.5 w-5 h-5 border flex items-center justify-center rounded-[2px] cursor-pointer ${
                    isSelected
                      ? 'bg-[#2271b1] border-[#2271b1] text-white'
                      : 'bg-white/90 border-[#8c8f94] text-transparent opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#c3c4c7] overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#c3c4c7] bg-white text-left text-[#1d2327]">
                <th className="p-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredItems.length > 0 &&
                      selectedIds.length === filteredItems.length
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? filteredItems.map((i) => i.id) : []
                      )
                    }
                  />
                </th>
                <th className="p-2.5 font-semibold">Berkas</th>
                <th className="p-2.5 font-semibold">Tipe</th>
                <th className="p-2.5 font-semibold">Ukuran</th>
                <th className="p-2.5 font-semibold">Folder</th>
                <th className="p-2.5 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f1]">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#f6f7f7] group">
                  <td className="p-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 shrink-0 bg-[#f0f0f1] border border-[#dcdcde] flex items-center justify-center overflow-hidden">
                        {item.mime.startsWith('image/') ? (
                          <img
                            src={getMediaProxyUrl(item.id, { width: 150 })}
                            alt={item.alt || item.nama}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-[#50575e]" />
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="font-semibold text-[#2271b1] hover:underline text-left cursor-pointer"
                        >
                          {item.nama}
                        </button>
                        <div className="flex items-center gap-2 text-[12px] text-[#50575e] mt-0.5">
                          <button
                            type="button"
                            onClick={() => openDetail(item)}
                            className="text-[#2271b1] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => void handleCopyUrl(item.id)}
                            className="text-[#2271b1] hover:underline cursor-pointer"
                          >
                            {copiedId === item.id ? 'Tersalin!' : 'Salin URL'}
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => requestDelete([item.id])}
                            className="text-[#d63638] hover:underline cursor-pointer"
                          >
                            Hapus Permanen
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5 text-[#50575e]">{item.mime}</td>
                  <td className="p-2.5 text-[#50575e] tabular-nums">
                    {formatBytes(item.ukuran)}
                  </td>
                  <td className="p-2.5 text-[#50575e] tabular-nums">
                    uploads/{item.year_month}
                  </td>
                  <td className="p-2.5 text-[#50575e] tabular-nums">
                    {new Intl.DateTimeFormat('id-ID', {
                      dateStyle: 'medium',
                    }).format(new Date(item.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detail Lampiran */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[88vh] flex flex-col border border-[#c3c4c7] shadow-2xl">
            <div className="px-4 py-3 border-b border-[#dcdcde] flex items-center justify-between bg-[#f6f7f7]">
              <h2 className="text-[15px] font-semibold text-[#1d2327]">
                Detail Lampiran: {detailItem.nama}
              </h2>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1 text-[#50575e] hover:text-[#1d2327] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
              <div className="md:col-span-7 p-6 bg-[#f0f0f1] flex items-center justify-center">
                {detailItem.mime.startsWith('image/') ? (
                  <img
                    src={getMediaProxyUrl(detailItem.id, { width: 1024 })}
                    alt={detailItem.alt || detailItem.nama}
                    className="max-h-[55vh] object-contain border border-[#c3c4c7] bg-white"
                  />
                ) : (
                  <div className="text-center p-6 bg-white border border-[#c3c4c7]">
                    <FileText className="w-12 h-12 text-[#9A3412] mx-auto mb-2" />
                    <p className="text-[13px] font-medium mb-3">{detailItem.nama}</p>
                    <a
                      href={getMediaProxyUrl(detailItem.id, { download: true })}
                      className="inline-block px-3.5 py-1.5 bg-[#2271b1] text-white text-[13px] rounded-[3px]"
                    >
                      Unduh Berkas
                    </a>
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSaveDetail}
                className="md:col-span-5 p-5 space-y-3 text-[13px] border-t md:border-t-0 md:border-l border-[#dcdcde]"
              >
                <div className="pb-2.5 border-b border-[#f0f0f1] text-[12px] text-[#50575e] space-y-0.5">
                  <p>
                    <strong>Tipe:</strong> {detailItem.mime}
                  </p>
                  <p className="tabular-nums">
                    <strong>Ukuran:</strong> {formatBytes(detailItem.ukuran)}
                  </p>
                  {detailItem.width && detailItem.height && (
                    <p className="tabular-nums">
                      <strong>Dimensi:</strong> {detailItem.width} × {detailItem.height} px
                    </p>
                  )}
                  <p>
                    <strong>Folder Drive:</strong> uploads/{detailItem.year_month}
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] text-[#50575e] mb-1">
                    Teks Alternatif (Alt)
                  </label>
                  <input
                    type="text"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#50575e] mb-1">
                    Nama / Judul
                  </label>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#50575e] mb-1">
                    Keterangan (Caption)
                  </label>
                  <textarea
                    rows={2}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full p-2 border border-[#8c8f94] rounded-[2px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#50575e] mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    rows={2}
                    value={editDeskripsi}
                    onChange={(e) => setEditDeskripsi(e.target.value)}
                    className="w-full p-2 border border-[#8c8f94] rounded-[2px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#50575e] mb-1">
                    URL Proxy Berkas
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={getMediaProxyUrl(detailItem.id)}
                      className="flex-1 h-8 px-2 bg-[#f0f0f1] border border-[#c3c4c7] rounded-[2px] font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopyUrl(detailItem.id)}
                      className="px-2.5 h-8 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] rounded-[2px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === detailItem.id ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#f0f0f1] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => requestDelete([detailItem.id])}
                    className="text-[#d63638] hover:underline text-[12px] cursor-pointer"
                  >
                    Hapus permanen
                  </button>
                  <button
                    type="submit"
                    disabled={savingMeta}
                    className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
                  >
                    {savingMeta ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Penghapusan Google Drive */}
      {pendingDeleteIds && pendingDeleteIds.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md border border-[#c3c4c7] shadow-2xl p-5 space-y-4">
            <h2 className="text-[16px] font-semibold text-[#1d2327]">
              Konfirmasi Hapus {pendingDeleteIds.length} Berkas Media
            </h2>
            <p className="text-[13px] text-[#50575e] leading-relaxed">
              Berkas berikut akan dipindahkan ke tempat sampah <strong>Google Drive</strong> dan dihapus dari pustaka media website:
            </p>
            <ul className="max-h-32 overflow-y-auto bg-[#f6f7f7] border border-[#dcdcde] p-2.5 text-[12px] text-[#1d2327] space-y-1">
              {items
                .filter((i) => pendingDeleteIds.includes(i.id))
                .map((i) => (
                  <li key={i.id} className="truncate">
                    &bull; {i.nama}
                  </li>
                ))}
            </ul>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f1]">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDeleteIds(null)}
                className="px-3.5 py-1.5 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#1d2327] text-[13px] rounded-[3px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="px-3.5 py-1.5 bg-[#d63638] hover:bg-[#b32d2e] disabled:opacity-60 text-white text-[13px] font-medium rounded-[3px] cursor-pointer"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
