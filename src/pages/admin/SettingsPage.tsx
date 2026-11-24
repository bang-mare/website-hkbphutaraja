import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import {
  DEFAULT_SITE_OPTIONS,
  fetchSiteOptions,
  saveSiteOptions,
} from '../../lib/publicData';
import { fetchTerms } from '../../lib/cmsData';
import type { SiteOptionsMap, Term } from '../../types/cms';

export type SettingsSection =
  | 'general'
  | 'writing'
  | 'reading'
  | 'media'
  | 'permalink';

const SECTION_TITLES: Record<SettingsSection, string> = {
  general: 'Pengaturan Umum',
  writing: 'Pengaturan Penulisan',
  reading: 'Pengaturan Membaca',
  media: 'Pengaturan Media',
  permalink: 'Pengaturan Permalink',
};

export function SettingsPage({ section }: { section: SettingsSection }) {
  const { addNotice } = useAdmin();

  const [options, setOptions] = useState<SiteOptionsMap>(DEFAULT_SITE_OPTIONS);
  const [categories, setCategories] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSiteOptions(), fetchTerms('category')]).then(([opts, cats]) => {
      setOptions(opts);
      setCategories(cats);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await saveSiteOptions(options);
    setSaving(false);
    if (error) {
      addNotice({ type: 'error', message: `Gagal menyimpan pengaturan: ${error}` });
    } else {
      addNotice({ type: 'success', message: 'Pengaturan berhasil disimpan.' });
    }
  };

  if (loading) {
    return (
      <div className="pt-4 text-[13px] text-[#50575e]">Memuat pengaturan...</div>
    );
  }

  return (
    <div className="pt-4 text-[13px]">
      <h1 className="text-[23px] font-normal text-[#1d2327] mb-4">
        {SECTION_TITLES[section]}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#c3c4c7] p-5 max-w-3xl space-y-5 shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
      >
        {section === 'general' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-semibold text-[#1d2327]">Judul Situs</label>
              <input
                type="text"
                value={options.site_title}
                onChange={(e) => setOptions({ ...options, site_title: e.target.value })}
                className="sm:col-span-2 h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-semibold text-[#1d2327]">Slogan</label>
              <input
                type="text"
                value={options.site_tagline}
                onChange={(e) => setOptions({ ...options, site_tagline: e.target.value })}
                className="sm:col-span-2 h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-semibold text-[#1d2327]">Alamat Situs (URL)</label>
              <input
                type="url"
                value={options.site_url}
                onChange={(e) => setOptions({ ...options, site_url: e.target.value })}
                className="sm:col-span-2 h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-semibold text-[#1d2327]">Email Administrasi</label>
              <input
                type="email"
                value={options.admin_email}
                onChange={(e) => setOptions({ ...options, admin_email: e.target.value })}
                className="sm:col-span-2 h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-semibold text-[#1d2327]">Alamat Gereja</label>
              <input
                type="text"
                value={options.church_address}
                onChange={(e) => setOptions({ ...options, church_address: e.target.value })}
                className="sm:col-span-2 h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-semibold text-[#1d2327]">Zona Waktu</label>
              <select
                value={options.timezone_string}
                onChange={(e) => setOptions({ ...options, timezone_string: e.target.value })}
                className="sm:col-span-2 h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                <option value="Asia/Jakarta">Asia/Jakarta (WIB, UTC+7)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA, UTC+8)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT, UTC+9)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-semibold text-[#1d2327]">Format Tanggal</label>
              <select
                value={options.date_format}
                onChange={(e) => setOptions({ ...options, date_format: e.target.value })}
                className="sm:col-span-2 h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                <option value="d F Y">24 November 2026 (d F Y)</option>
                <option value="d/m/Y">24/11/2026 (d/m/Y)</option>
                <option value="Y-m-d">2026-11-24 (Y-m-d)</option>
              </select>
            </div>
          </>
        )}

        {section === 'writing' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
            <label className="font-semibold text-[#1d2327]">Kategori Pos Bawaan</label>
            <select
              value={options.default_category_id || ''}
              onChange={(e) =>
                setOptions({ ...options, default_category_id: e.target.value })
              }
              className="sm:col-span-2 h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
            >
              <option value="">-- Pilih Kategori Bawaan --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {section === 'reading' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
            <label className="font-semibold text-[#1d2327]">
              Jumlah Berita per Halaman
            </label>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="number"
                min={3}
                max={30}
                value={options.posts_per_page}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    posts_per_page: Math.max(3, Number(e.target.value) || 10),
                  })
                }
                className="w-24 h-8 px-2.5 border border-[#8c8f94] rounded-[3px] tabular-nums"
              />
              <span className="text-[#50575e]">pos per halaman</span>
            </div>
          </div>
        )}

        {section === 'media' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-semibold text-[#1d2327]">
                Maksimal Ukuran Berkas (MB)
              </label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={options.max_upload_size_mb}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      max_upload_size_mb: Math.max(1, Math.min(50, Number(e.target.value) || 10)),
                    })
                  }
                  className="w-24 h-8 px-2.5 border border-[#8c8f94] rounded-[3px] tabular-nums"
                />
                <span className="text-[#50575e]">MB per berkas</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-[#1d2327] mb-1">
                Ukuran Thumbnail Otomatis (Google Drive Proxy)
              </p>
              <p className="text-[#50575e]">
                Thumbnail WebP otomatis dihasilkan untuk lebar: <strong>150px</strong>,{' '}
                <strong>300px</strong>, <strong>768px</strong>, dan <strong>1024px</strong>.
              </p>
            </div>
          </>
        )}

        {section === 'permalink' && (
          <div className="space-y-3">
            <p className="font-semibold text-[#1d2327]">Struktur Tautan Permanen (Permalink)</p>
            {[
              { value: '/%postname%/', label: 'Nama Pos (Disarankan)', sample: '/berita/judul-artikel' },
              { value: '/%year%/%monthnum%/%postname%/', label: 'Bulan dan Nama', sample: '/2026/11/judul-artikel' },
              { value: '/?p=%post_id%', label: 'Polos', sample: '/berita/id-pos' },
            ].map((item) => (
              <label key={item.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="permalinkStructure"
                  checked={options.permalink_structure === item.value}
                  onChange={() =>
                    setOptions({ ...options, permalink_structure: item.value })
                  }
                />
                <span className="font-medium w-44">{item.label}</span>
                <code className="px-2 py-0.5 bg-[#f0f0f1] border border-[#dcdcde] text-[12px]">
                  {item.sample}
                </code>
              </label>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-[#f0f0f1]">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  );
}
