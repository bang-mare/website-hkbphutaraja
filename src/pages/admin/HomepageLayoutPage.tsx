import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  RotateCcw,
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import {
  DEFAULT_HOMEPAGE_LAYOUT,
  fetchSiteOptions,
  normalizeHomepageLayout,
  saveSiteOptions,
} from '../../lib/publicData';
import type { HomepageSectionConfig, HomepageSectionId } from '../../types/cms';

interface SectionDescriptor {
  name: string;
  description: string;
  hasTitle?: boolean;
  hasSubtitle?: boolean;
  columnOptions?: Array<1 | 2 | 3 | 4>;
  limitRange?: { min: number; max: number; label: string };
  variantOptions?: Array<{ value: NonNullable<HomepageSectionConfig['variant']>; label: string }>;
}

const SECTION_META: Record<HomepageSectionId, SectionDescriptor> = {
  hero: {
    name: 'Hero & Ayat Renungan',
    description: 'Banner utama identitas huria, ayat renungan harian, tombol aksi, dan kartu ibadah terdekat.',
    variantOptions: [
      { value: 'split', label: 'Kiri-Kanan (Teks + Kartu Ibadah & Foto)' },
      { value: 'centered', label: 'Terpusat (Teks & Ayat di Tengah)' },
    ],
  },
  quick_links: {
    name: 'Kartu Akses Cepat',
    description: 'Tautan cepat menuju Warta Jemaat, Jadwal Ibadah & PHD, serta Galeri & Berita.',
    columnOptions: [1, 2, 3],
  },
  announcements: {
    name: 'Bilahan Pengumuman Penting',
    description: 'Pita pengumuman singkat dari pos terbaru berkategori Pengumuman (otomatis tersembunyi jika kosong).',
    hasTitle: true,
  },
  schedule: {
    name: 'Jadwal Ibadah Terdekat',
    description: 'Daftar ibadah Minggu & kategorial terdekat beserta tautan ke jadwal lengkap.',
    hasSubtitle: true,
    hasTitle: true,
    columnOptions: [1, 2, 3],
    limitRange: { min: 1, max: 6, label: 'Jumlah jadwal tampil' },
  },
  warta: {
    name: 'Warta Jemaat Terbaru',
    description: 'Baris khusus Tingting Huria dengan tautan baca daring dan unduh PDF.',
    hasSubtitle: true,
    hasTitle: true,
    columnOptions: [1, 2, 3],
    limitRange: { min: 1, max: 9, label: 'Jumlah warta tampil' },
  },
  news: {
    name: 'Berita & Artikel Huria',
    description: 'Baris publikasi berita pelayanan dan renungan lengkap dengan thumbnail.',
    hasSubtitle: true,
    hasTitle: true,
    columnOptions: [1, 2, 3, 4],
    limitRange: { min: 1, max: 12, label: 'Jumlah berita tampil' },
  },
  wijk: {
    name: 'Enam Lingkungan (Wijk)',
    description: 'Daftar 6 lingkungan pelayanan (Letare, Exaudi, Judika, Galatia, Efesus, Jeremia).',
    hasSubtitle: true,
    hasTitle: true,
    columnOptions: [1, 2, 3],
  },
  contact: {
    name: 'Strip Kontak Sekretariat',
    description: 'Informasi singkat alamat gereja dan tombol menuju halaman Kontak & Peta.',
    variantOptions: [
      { value: 'banner', label: 'Banner Penuh (Lebar Penuh)' },
      { value: 'compact', label: 'Ringkas (Rata Tengah Kompak)' },
    ],
  },
};

export function HomepageLayoutPage() {
  const { addNotice, setHelpTabs } = useAdmin();

  const [layout, setLayout] = useState<HomepageSectionConfig[]>(() =>
    DEFAULT_HOMEPAGE_LAYOUT.map((item) => ({ ...item }))
  );
  const [expandedId, setExpandedId] = useState<HomepageSectionId | null>('hero');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHelpTabs([
      {
        id: 'tata-letak',
        title: 'Tata Letak Beranda',
        content: (
          <div className="space-y-2">
            <p>
              Halaman ini memungkinkan Administrator mengatur bagian mana saja yang tampil di Beranda publik, menyembunyikan bagian yang tidak diperlukan, mengubah posisi urutan atas-bawah, serta memilih jumlah kolom dan variasi tata letak tiap bagian.
            </p>
            <p>
              Seret kartu menggunakan ikon pegangan, gunakan panah naik/turun, atau pilih nomor posisi secara langsung lalu klik <strong>Simpan Tata Letak</strong>.
            </p>
          </div>
        ),
      },
    ]);
    return () => setHelpTabs([]);
  }, [setHelpTabs]);

  useEffect(() => {
    setLoading(true);
    fetchSiteOptions().then((opts) => {
      setLayout(normalizeHomepageLayout(opts.homepage_layout));
      setLoading(false);
    });
  }, []);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= layout.length ||
      toIndex >= layout.length
    ) {
      return;
    }
    setLayout((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const updateItem = (
    id: HomepageSectionId,
    patch: Partial<HomepageSectionConfig>
  ) => {
    setLayout((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleReset = () => {
    setLayout(DEFAULT_HOMEPAGE_LAYOUT.map((item) => ({ ...item })));
    addNotice({
      type: 'info',
      message: 'Susunan dikembalikan ke bawaan (klik Simpan Tata Letak untuk menerapkan ke situs).',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const normalized = normalizeHomepageLayout(layout);
    const { error } = await saveSiteOptions({ homepage_layout: normalized });
    setSaving(false);
    if (error) {
      addNotice({ type: 'error', message: `Gagal menyimpan tata letak: ${error}` });
    } else {
      setLayout(normalized);
      addNotice({
        type: 'success',
        message: 'Tata letak dan urutan beranda berhasil disimpan.',
        linkLabel: 'Lihat Beranda Publik',
        linkTo: '/',
      });
    }
  };

  const enabledSections = layout.filter((s) => s.enabled);
  const hiddenSections = layout.filter((s) => !s.enabled);

  if (loading) {
    return (
      <div className="pt-4 text-[13px] text-[#50575e]">
        Memuat konfigurasi tata letak beranda...
      </div>
    );
  }

  return (
    <div className="pt-4 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[23px] font-normal text-[#1d2327] leading-tight">
            Tata Letak Beranda
          </h1>
          <p className="text-[12px] text-[#50575e] mt-0.5">
            Atur bagian yang ditampilkan atau disembunyikan, urutan posisi atas-bawah, serta tata letak grid pada halaman beranda publik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="px-3 py-1.5 bg-white border border-[#2271b1] text-[#2271b1] hover:bg-[#f0f6fc] rounded-[3px] text-[12px] font-medium"
          >
            Lihat Beranda Publik
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KOLOM KIRI: DAFTAR SEKSI & PENGATURAN */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white border border-[#c3c4c7] p-3 flex flex-wrap items-center justify-between gap-2 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
            <div className="text-[12px] text-[#50575e]">
              <strong className="text-[#1d2327]">{enabledSections.length}</strong> bagian tampil &middot;{' '}
              <strong className="text-[#1d2327]">{hiddenSections.length}</strong> disembunyikan
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#50575e] rounded-[3px] text-[12px] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Bawaan</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
              >
                {saving ? 'Menyimpan...' : 'Simpan Tata Letak'}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {layout.map((item, idx) => {
              const meta = SECTION_META[item.id];
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== idx) {
                      moveItem(dragIndex, idx);
                    }
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`bg-white border transition-colors shadow-[0_1px_1px_rgba(0,0,0,0.04)] ${
                    dragIndex === idx
                      ? 'border-[#2271b1] opacity-70'
                      : item.enabled
                        ? 'border-[#c3c4c7]'
                        : 'border-[#dcdcde] bg-[#f9f9fa]'
                  }`}
                >
                  {/* Card Header Row */}
                  <div className="p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        title="Seret untuk mengubah urutan"
                        className="text-[#8c8f94] hover:text-[#1d2327] cursor-grab active:cursor-grabbing shrink-0"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>

                      <select
                        aria-label={`Posisi ${meta.name}`}
                        value={idx}
                        onChange={(e) => moveItem(idx, Number(e.target.value))}
                        className="h-7 px-1.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-[2px] text-[12px] font-mono tabular-nums text-[#1d2327] cursor-pointer shrink-0"
                      >
                        {layout.map((_, posIdx) => (
                          <option key={posIdx} value={posIdx}>
                            #{posIdx + 1}
                          </option>
                        ))}
                      </select>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold text-[13px] ${
                              item.enabled ? 'text-[#1d2327]' : 'text-[#787c82] line-through'
                            }`}
                          >
                            {meta.name}
                          </span>
                          {!item.enabled && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#f0f0f1] text-[#50575e] border border-[#dcdcde] rounded-[2px]">
                              Disembunyikan
                            </span>
                          )}
                          {item.enabled && item.columns && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#f0f6fc] text-[#2271b1] border border-[#c5d9ed] rounded-[2px]">
                              {item.columns} Kolom
                            </span>
                          )}
                          {item.enabled && item.variant && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#f0f6fc] text-[#2271b1] border border-[#c5d9ed] rounded-[2px]">
                              {item.variant === 'split'
                                ? 'Kiri-Kanan'
                                : item.variant === 'centered'
                                  ? 'Terpusat'
                                  : item.variant === 'compact'
                                    ? 'Ringkas'
                                    : 'Banner Penuh'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#50575e] truncate">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { enabled: !item.enabled })}
                        title={item.enabled ? 'Sembunyikan dari beranda' : 'Tampilkan di beranda'}
                        className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-[3px] border text-[12px] font-medium cursor-pointer ${
                          item.enabled
                            ? 'bg-[#edfaef] border-[#00a32a]/40 text-[#007017] hover:bg-[#dcf5e0]'
                            : 'bg-white border-[#c3c4c7] text-[#50575e] hover:bg-[#f6f7f7]'
                        }`}
                      >
                        {item.enabled ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Tampil</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Sembunyi</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, idx - 1)}
                        title="Pindah ke atas"
                        className="w-7 h-7 inline-flex items-center justify-center border border-[#c3c4c7] bg-white hover:bg-[#f6f7f7] disabled:opacity-35 rounded-[3px] cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === layout.length - 1}
                        onClick={() => moveItem(idx, idx + 1)}
                        title="Pindah ke bawah"
                        className="w-7 h-7 inline-flex items-center justify-center border border-[#c3c4c7] bg-white hover:bg-[#f6f7f7] disabled:opacity-35 rounded-[3px] cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.id)
                        }
                        title="Pengaturan detail bagian"
                        className="w-7 h-7 inline-flex items-center justify-center border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] rounded-[3px] cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Configuration Panel */}
                  {isExpanded && (
                    <div className="px-4 py-3 border-t border-[#f0f0f1] bg-[#f9f9fa] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                      {meta.hasSubtitle && (
                        <div>
                          <label className="block font-medium text-[#1d2327] mb-1">
                            Label Atas (Subjudul Seksi)
                          </label>
                          <input
                            type="text"
                            value={item.subtitle || ''}
                            onChange={(e) =>
                              updateItem(item.id, { subtitle: e.target.value })
                            }
                            className="w-full h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px]"
                          />
                        </div>
                      )}

                      {meta.hasTitle && (
                        <div>
                          <label className="block font-medium text-[#1d2327] mb-1">
                            Judul Seksi
                          </label>
                          <input
                            type="text"
                            value={item.title || ''}
                            onChange={(e) =>
                              updateItem(item.id, { title: e.target.value })
                            }
                            className="w-full h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px]"
                          />
                        </div>
                      )}

                      {meta.variantOptions && (
                        <div className="sm:col-span-2">
                          <label className="block font-medium text-[#1d2327] mb-1">
                            Posisi &amp; Gaya Tata Letak
                          </label>
                          <select
                            value={item.variant || meta.variantOptions[0].value}
                            onChange={(e) =>
                              updateItem(item.id, {
                                variant: e.target.value as HomepageSectionConfig['variant'],
                              })
                            }
                            className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                          >
                            {meta.variantOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {meta.columnOptions && (
                        <div>
                          <label className="block font-medium text-[#1d2327] mb-1">
                            Tata Letak Kolom (Desktop)
                          </label>
                          <select
                            value={item.columns || meta.columnOptions[meta.columnOptions.length - 1]}
                            onChange={(e) =>
                              updateItem(item.id, {
                                columns: Number(e.target.value) as 1 | 2 | 3 | 4,
                              })
                            }
                            className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                          >
                            {meta.columnOptions.map((c) => (
                              <option key={c} value={c}>
                                {c} Kolom Sejajar
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {meta.limitRange && (
                        <div>
                          <label className="block font-medium text-[#1d2327] mb-1">
                            {meta.limitRange.label}
                          </label>
                          <input
                            type="number"
                            min={meta.limitRange.min}
                            max={meta.limitRange.max}
                            value={item.limit ?? meta.limitRange.min}
                            onChange={(e) => {
                              const raw = Number(e.target.value) || meta.limitRange!.min;
                              const clamped = Math.max(
                                meta.limitRange!.min,
                                Math.min(meta.limitRange!.max, raw)
                              );
                              updateItem(item.id, { limit: clamped });
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px] tabular-nums"
                          />
                        </div>
                      )}

                      {!meta.hasTitle &&
                        !meta.hasSubtitle &&
                        !meta.variantOptions &&
                        !meta.columnOptions &&
                        !meta.limitRange && (
                          <p className="sm:col-span-2 text-[#50575e]">
                            Gunakan tombol Tampil/Sembunyi dan pengatur posisi di atas untuk mengatur bagian ini.
                          </p>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN: PRATINJAU STRUKTUR BERANDA */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#c3c4c7] p-4 space-y-3 shadow-[0_1px_1px_rgba(0,0,0,0.04)] sticky top-12">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f1]">
              <div className="flex items-center gap-2 font-semibold text-[#1d2327]">
                <LayoutTemplate className="w-4 h-4 text-[#2271b1]" />
                <span>Pratinjau Susunan Beranda</span>
              </div>
              <span className="text-[11px] text-[#50575e]">
                Urutan atas ke bawah
              </span>
            </div>

            <div className="border border-slate-200 rounded-md bg-[#f8fafc] overflow-hidden">
              {/* Mock Navbar */}
              <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-[10px]">
                <span className="font-bold text-[#0f294a]">HKBP Ressort Hutaraja</span>
                <span className="text-slate-400">Header Menu</span>
              </div>

              {/* Active Sections Wireframe */}
              <div className="p-2.5 space-y-2 max-h-[520px] overflow-y-auto">
                {enabledSections.length === 0 ? (
                  <div className="p-6 text-center text-[12px] text-[#787c82] border border-dashed border-slate-300 rounded">
                    Semua bagian disembunyikan. Aktifkan minimal satu bagian agar beranda tidak kosong.
                  </div>
                ) : (
                  enabledSections.map((sec, idx) => {
                    const meta = SECTION_META[sec.id];
                    const cols = sec.columns || 1;
                    return (
                      <div
                        key={sec.id}
                        className={`rounded border p-2.5 text-[11px] ${
                          sec.id === 'hero'
                            ? 'bg-[#0f294a] text-white border-[#0a1c34]'
                            : sec.id === 'announcements'
                              ? 'bg-amber-50 border-amber-200 text-slate-800'
                              : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-semibold">
                            {idx + 1}. {sec.title || meta.name}
                          </span>
                          <span
                            className={`text-[10px] ${
                              sec.id === 'hero' ? 'text-amber-300' : 'text-slate-400'
                            }`}
                          >
                            {sec.limit ? `maks ${sec.limit}` : ''}
                            {sec.limit && sec.columns ? ' · ' : ''}
                            {sec.columns ? `${sec.columns} col` : ''}
                            {sec.variant ? sec.variant : ''}
                          </span>
                        </div>

                        {sec.id === 'hero' && (
                          <div
                            className={`grid gap-1.5 ${
                              sec.variant === 'centered' ? 'grid-cols-1' : 'grid-cols-12'
                            }`}
                          >
                            <div
                              className={`${
                                sec.variant === 'centered'
                                  ? 'text-center py-1'
                                  : 'col-span-7'
                              } bg-white/10 rounded p-1.5 text-[10px] text-white/80`}
                            >
                              Identitas &amp; Ayat Renungan
                            </div>
                            {sec.variant !== 'centered' && (
                              <div className="col-span-5 bg-white text-slate-700 rounded p-1.5 text-[10px]">
                                Foto &amp; Jadwal Terdekat
                              </div>
                            )}
                          </div>
                        )}

                        {sec.columns && (
                          <div
                            className="grid gap-1.5 mt-1"
                            style={{
                              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                            }}
                          >
                            {Array.from({ length: cols }).map((_, i) => (
                              <div
                                key={i}
                                className="h-5 rounded bg-slate-100 border border-slate-200/80"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mock Footer */}
              <div className="px-3 py-2 bg-[#0f294a] text-white/75 text-[10px] text-center">
                Footer Situs
              </div>
            </div>

            {hiddenSections.length > 0 && (
              <div className="pt-2 border-t border-[#f0f0f1] text-[12px]">
                <p className="font-medium text-[#50575e] mb-1">
                  Bagian Disembunyikan ({hiddenSections.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {hiddenSections.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => updateItem(sec.id, { enabled: true })}
                      className="px-2 py-0.5 bg-[#f6f7f7] hover:bg-[#edfaef] border border-[#c3c4c7] rounded-[2px] text-[11px] text-[#50575e] hover:text-[#007017] cursor-pointer"
                    >
                      + Tampilkan {SECTION_META[sec.id].name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
