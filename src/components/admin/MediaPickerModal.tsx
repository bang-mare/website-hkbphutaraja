import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  FileText,
  Film,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { GoogleDriveConnectCard } from './GoogleDriveConnectCard';
import {
  fetchMediaLibrary,
  formatBytes,
  getMediaProxyUrl,
  updateMediaMeta,
  uploadMediaFile,
} from '../../lib/mediaClient';
import type { MediaItem } from '../../types/cms';

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  multiple?: boolean;
  accept?: 'all' | 'image' | 'pdf';
  title?: string;
  preserveAspect?: boolean;
}

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  multiple = false,
  accept = 'all',
  title = 'Pilih Media',
  preserveAspect = false,
}: MediaPickerModalProps) {
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Attachment meta edit
  const [metaNama, setMetaNama] = useState('');
  const [metaAlt, setMetaAlt] = useState('');
  const [metaCaption, setMetaCaption] = useState('');
  const [metaDeskripsi, setMetaDeskripsi] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [keepOriginalSize, setKeepOriginalSize] = useState(preserveAspect);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setKeepOriginalSize(preserveAspect);
  }, [preserveAspect, open]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
    setActiveId(null);
    setErrorMsg(null);
    setLoading(true);
    fetchMediaLibrary().then(({ items: data, error }) => {
      setLoading(false);
      if (error) {
        setErrorMsg(error);
      } else {
        setItems(data);
        if (data.length > 0) {
          setActiveId(data[0].id);
        }
      }
    });
  }, [open]);

  const activeItem = useMemo(
    () => items.find((i) => i.id === activeId) || null,
    [items, activeId]
  );

  useEffect(() => {
    if (activeItem) {
      setMetaNama(activeItem.nama || '');
      setMetaAlt(activeItem.alt || '');
      setMetaCaption(activeItem.caption || '');
      setMetaDeskripsi(activeItem.deskripsi || '');
    }
  }, [activeItem]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (accept === 'image' && !item.mime.startsWith('image/')) return false;
      if (accept === 'pdf' && item.mime !== 'application/pdf') return false;
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
  }, [items, accept, search]);

  if (!open) return null;

  const toggleItemSelection = (item: MediaItem) => {
    setActiveId(item.id);
    if (multiple) {
      setSelectedIds((prev) =>
        prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
      );
    } else {
      setSelectedIds([item.id]);
    }
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setErrorMsg(null);
    const uploaded: MediaItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const { media, error } = await uploadMediaFile(file, {
        preserveAspect: keepOriginalSize,
      });
      if (error) {
        setErrorMsg(error);
      } else if (media) {
        uploaded.push(media);
      }
    }

    setUploading(false);
    if (uploaded.length > 0) {
      setItems((prev) => [...uploaded, ...prev]);
      const nextIds = multiple ? uploaded.map((u) => u.id) : [uploaded[0].id];
      setSelectedIds(nextIds);
      setActiveId(uploaded[0].id);
      setTab('library');
    }
  };

  const handleSaveMeta = async () => {
    if (!activeItem) return;
    setSavingMeta(true);
    const { error } = await updateMediaMeta(activeItem.id, {
      nama: metaNama,
      alt: metaAlt,
      caption: metaCaption,
      deskripsi: metaDeskripsi,
    });
    setSavingMeta(false);
    if (error) {
      setErrorMsg(error);
    } else {
      setItems((prev) =>
        prev.map((m) =>
          m.id === activeItem.id
            ? {
                ...m,
                nama: metaNama,
                alt: metaAlt,
                caption: metaCaption,
                deskripsi: metaDeskripsi,
              }
            : m
        )
      );
    }
  };

  const handleConfirm = () => {
    const selected = items.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0 && activeItem) {
      onSelect([activeItem]);
      onClose();
      return;
    }
    if (selected.length > 0) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-6 font-wp">
      <div className="bg-white w-full max-w-5xl h-[90dvh] flex flex-col border border-[#c3c4c7] shadow-2xl">
        {/* Header ala WordPress Media Modal */}
        <div className="px-4 py-2.5 border-b border-[#dcdcde] flex items-center justify-between gap-3 bg-white">
          <h2 className="text-[18px] font-semibold text-[#1d2327] truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemilih media"
            className="w-11 h-11 md:w-8 md:h-8 inline-flex items-center justify-center text-[#50575e] hover:text-[#1d2327] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-2 border-b border-[#dcdcde] bg-[#f6f7f7] flex items-center gap-1 text-[13px]">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-3.5 py-2 border border-b-0 rounded-t-[2px] cursor-pointer ${
              tab === 'upload'
                ? 'bg-white border-[#dcdcde] text-[#1d2327] font-semibold -mb-[1px]'
                : 'border-transparent text-[#2271b1] hover:text-[#135e96]'
            }`}
          >
            Unggah Berkas
          </button>
          <button
            type="button"
            onClick={() => setTab('library')}
            className={`px-3.5 py-2 border border-b-0 rounded-t-[2px] cursor-pointer ${
              tab === 'library'
                ? 'bg-white border-[#dcdcde] text-[#1d2327] font-semibold -mb-[1px]'
                : 'border-transparent text-[#2271b1] hover:text-[#135e96]'
            }`}
          >
            Pustaka Media ({filteredItems.length})
          </button>
        </div>

        {errorMsg && (
          <div className="mx-4 mt-3 px-3 py-2 bg-[#fcf0f1] border-l-4 border-l-[#d63638] text-[13px] text-[#1d2327]">
            {errorMsg}
          </div>
        )}

        {/* Content */}
        {tab === 'upload' ? (
          <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center gap-4 bg-white overflow-y-auto">
            <div className="w-full max-w-2xl">
              <GoogleDriveConnectCard compact onError={(msg) => setErrorMsg(msg)} />
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
              className={`w-full max-w-2xl border-2 border-dashed p-5 sm:p-10 text-center rounded-[2px] transition-colors ${
                dragActive
                  ? 'border-[#2271b1] bg-[#f0f6fc]'
                  : 'border-[#c3c4c7] bg-[#f6f7f7]'
              }`}
            >
              <UploadCloud className="w-10 h-10 text-[#50575e] mx-auto mb-3" />
              <p className="text-[16px] font-medium text-[#1d2327] mb-1">
                Seret dan lepaskan berkas ke sini untuk mengunggah
              </p>
              <p className="text-[13px] text-[#50575e] mb-4">
                Berkas disimpan otomatis ke Google Drive (folder uploads/YYYY/MM) melalui proxy server.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple={multiple}
                accept={
                  accept === 'image'
                    ? 'image/*'
                    : accept === 'pdf'
                      ? 'application/pdf'
                      : 'image/*,application/pdf,video/mp4'
                }
                onChange={(e) => void handleUploadFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white text-[13px] font-medium rounded-[3px] cursor-pointer"
              >
                {uploading ? 'Mengunggah ke Google Drive...' : 'Pilih Berkas dari Komputer'}
              </button>
              <p className="text-[11px] text-[#50575e] mt-3">
                {keepOriginalSize
                  ? 'Mode ukuran asli aktif (disarankan untuk logo atau ikon).'
                  : 'Semua foto berita & galeri otomatis di-resize ke ukuran seragam 1200×675 px (16:9).'}
              </p>
              {accept !== 'pdf' && (
                <label className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-[#50575e] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepOriginalSize}
                    onChange={(e) => setKeepOriginalSize(e.target.checked)}
                    className="rounded-[2px]"
                  />
                  <span>Pertahankan rasio asli (khusus Logo)</span>
                </label>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            {/* Grid Media */}
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              <div className="px-4 py-2.5 border-b border-[#f0f0f1] flex flex-wrap items-center justify-between gap-2.5">
                <span className="text-[12px] text-[#50575e]">
                  {multiple
                    ? 'Klik beberapa item untuk memilih sekaligus.'
                    : 'Klik satu item media untuk memilih.'}
                </span>
                <div className="relative w-full sm:w-auto min-w-0">
                  <Search className="w-3.5 h-3.5 text-[#787c82] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari berkas..."
                    className="w-full sm:w-52 min-h-[38px] md:min-h-[28px] h-9 md:h-7 pl-8 pr-2.5 text-[13px] md:text-[12px] border border-[#8c8f94] rounded-[2px]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                {loading ? (
                  <p className="text-[13px] text-[#50575e] py-8 text-center">
                    Memuat pustaka media...
                  </p>
                ) : filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-[13px] text-[#50575e]">
                    Belum ada berkas media yang sesuai. Unggah berkas baru melalui tab Unggah Berkas.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredItems.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      const isImage = item.mime.startsWith('image/');
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItemSelection(item)}
                          className={`relative aspect-square border bg-[#f6f7f7] overflow-hidden text-left group cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-[#2271b1] border-[#2271b1]'
                              : 'border-[#c3c4c7] hover:border-[#2271b1]'
                          }`}
                        >
                          {isImage ? (
                            <img
                              src={getMediaProxyUrl(item.id, { width: 300 })}
                              alt={item.alt || item.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : item.mime === 'application/pdf' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                              <FileText className="w-8 h-8 text-[#9A3412] mb-1.5" />
                              <span className="text-[11px] text-[#1d2327] line-clamp-2 break-all">
                                {item.nama}
                              </span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                              <Film className="w-8 h-8 text-[#2271b1] mb-1.5" />
                              <span className="text-[11px] text-[#1d2327] line-clamp-2 break-all">
                                {item.nama}
                              </span>
                            </div>
                          )}
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#2271b1] text-white flex items-center justify-center rounded-[2px] shadow">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Detail Lampiran Kanan */}
            <aside className="w-full md:w-72 max-h-[38%] md:max-h-none border-t md:border-t-0 md:border-l border-[#dcdcde] bg-[#f6f7f7] p-4 overflow-y-auto text-[12px] shrink-0">
              {!activeItem ? (
                <p className="text-[#50575e]">Pilih salah satu berkas untuk melihat detail lampiran.</p>
              ) : (
                <div className="space-y-3">
                  <p className="font-semibold text-[#50575e] uppercase text-[11px]">
                    Detail Lampiran
                  </p>
                  <div className="pb-3 border-b border-[#dcdcde] space-y-1">
                    <p className="font-semibold text-[#1d2327] break-all">{activeItem.nama}</p>
                    <p className="text-[#50575e] tabular-nums">
                      {formatBytes(activeItem.ukuran)} · {activeItem.mime}
                    </p>
                    {activeItem.width && activeItem.height && (
                      <p className="text-[#50575e] tabular-nums">
                        Dimensi: {activeItem.width} × {activeItem.height} piksel
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[#50575e] mb-1">Teks Alternatif (Alt)</label>
                    <input
                      type="text"
                      value={metaAlt}
                      onChange={(e) => setMetaAlt(e.target.value)}
                      className="w-full h-7 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#50575e] mb-1">Judul / Nama Berkas</label>
                    <input
                      type="text"
                      value={metaNama}
                      onChange={(e) => setMetaNama(e.target.value)}
                      className="w-full h-7 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#50575e] mb-1">Keterangan (Caption)</label>
                    <textarea
                      rows={2}
                      value={metaCaption}
                      onChange={(e) => setMetaCaption(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#8c8f94] rounded-[2px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#50575e] mb-1">Deskripsi</label>
                    <textarea
                      rows={2}
                      value={metaDeskripsi}
                      onChange={(e) => setMetaDeskripsi(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#8c8f94] rounded-[2px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#50575e] mb-1">URL Proxy Situs</label>
                    <input
                      type="text"
                      readOnly
                      value={getMediaProxyUrl(activeItem.id)}
                      className="w-full h-7 px-2 bg-[#f0f0f1] border border-[#c3c4c7] rounded-[2px] font-mono text-[11px]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingMeta}
                    onClick={() => void handleSaveMeta()}
                    className="px-3 py-1 border border-[#2271b1] text-[#2271b1] bg-white hover:bg-[#f0f6fc] rounded-[2px] cursor-pointer"
                  >
                    {savingMeta ? 'Menyimpan...' : 'Simpan Metadata'}
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Footer Modal */}
        <div className="px-4 py-3 border-t border-[#dcdcde] bg-white flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-[#50575e] tabular-nums">
            {selectedIds.length} berkas dipilih
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 min-h-[44px] sm:min-h-[34px] border border-[#c3c4c7] bg-[#f6f7f7] text-[#1d2327] text-[13px] rounded-[3px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 && !activeItem}
              onClick={handleConfirm}
              className="px-4 py-2 min-h-[44px] sm:min-h-[34px] bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-50 text-white text-[13px] font-medium rounded-[3px] cursor-pointer"
            >
              Pilih Media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
