import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { MediaPickerModal } from '../../components/admin/MediaPickerModal';
import { getMediaProxyUrl } from '../../lib/mediaClient';
import {
  DEFAULT_SITE_OPTIONS,
  fetchSiteOptions,
  saveSiteOptions,
} from '../../lib/publicData';
import type { MediaItem } from '../../types/cms';

export function CustomizeThemePage() {
  const { addNotice } = useAdmin();

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_SITE_OPTIONS.theme_primary_color);
  const [accentColor, setAccentColor] = useState(DEFAULT_SITE_OPTIONS.theme_accent_color);
  const [logoUrl, setLogoUrl] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState(
    DEFAULT_SITE_OPTIONS.theme_hero_image_url || ''
  );
  const [verseRef, setVerseRef] = useState(DEFAULT_SITE_OPTIONS.daily_verse.reference);
  const [verseText, setVerseText] = useState(DEFAULT_SITE_OPTIONS.daily_verse.text);
  const [saving, setSaving] = useState(false);

  const [pickerTarget, setPickerTarget] = useState<null | 'logo' | 'hero'>(null);

  useEffect(() => {
    fetchSiteOptions().then((opts) => {
      setPrimaryColor(opts.theme_primary_color || '#1E3A5F');
      setAccentColor(opts.theme_accent_color || '#9A3412');
      setLogoUrl(opts.theme_logo_url || '');
      setHeroImageUrl(
        opts.theme_hero_image_url || '/src/assets/images/church_hero_sanctuary_1795501235668.jpg'
      );
      setVerseRef(opts.daily_verse?.reference || 'Mazmur 119:105');
      setVerseText(
        opts.daily_verse?.text || 'Firman-Mu itu pelita bagi kakiku dan terang bagi jalanku.'
      );
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await saveSiteOptions({
      theme_primary_color: primaryColor,
      theme_accent_color: accentColor,
      theme_logo_url: logoUrl,
      theme_hero_image_url: heroImageUrl,
      daily_verse: { reference: verseRef, text: verseText },
    });
    setSaving(false);
    if (error) {
      addNotice({ type: 'error', message: error });
    } else {
      addNotice({ type: 'success', message: 'Kustomisasi tema situs berhasil disimpan.' });
    }
  };

  return (
    <div className="pt-4 text-[13px]">
      <h1 className="text-[23px] font-normal text-[#1d2327] mb-4">Sesuaikan Tema</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-5 bg-white border border-[#c3c4c7] p-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-[#1d2327] mb-1">
                Warna Utama (Header/Footer)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-8 border border-[#8c8f94] cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 h-8 px-2 border border-[#8c8f94] rounded-[2px] font-mono text-[12px]"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-[#1d2327] mb-1">
                Warna Aksen
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-8 border border-[#8c8f94] cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 h-8 px-2 border border-[#8c8f94] rounded-[2px] font-mono text-[12px]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#1d2327] mb-1">
              Logo Kustom Situs (Kosongkan untuk Logo HKBP Bawaan)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/api/media/..."
                className="flex-1 h-8 px-2 border border-[#8c8f94] rounded-[2px]"
              />
              <button
                type="button"
                onClick={() => setPickerTarget('logo')}
                className="px-3 h-8 border border-[#2271b1] text-[#2271b1] bg-[#f6f7f7] rounded-[2px] cursor-pointer"
              >
                Pilih
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#1d2327] mb-1">
              Gambar Banner Beranda (Hero)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                className="flex-1 h-8 px-2 border border-[#8c8f94] rounded-[2px]"
              />
              <button
                type="button"
                onClick={() => setPickerTarget('hero')}
                className="px-3 h-8 border border-[#2271b1] text-[#2271b1] bg-[#f6f7f7] rounded-[2px] cursor-pointer"
              >
                Pilih
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#f0f0f1] space-y-2.5">
            <h2 className="font-semibold text-[#1d2327]">Ayat / Renungan Beranda</h2>
            <div>
              <label className="block text-[#50575e] mb-1">Referensi Ayat</label>
              <input
                type="text"
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Isi Ayat / Renungan</label>
              <textarea
                rows={3}
                value={verseText}
                onChange={(e) => setVerseText(e.target.value)}
                className="w-full p-2 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
          >
            {saving ? 'Menyimpan...' : 'Terbitkan Perubahan Tema'}
          </button>
        </form>

        {/* Pratinjau Langsung */}
        <div className="lg:col-span-7 bg-white border border-[#c3c4c7] p-4 space-y-3">
          <p className="font-semibold text-[#1d2327]">Pratinjau Tampilan Publik</p>
          <div className="border border-stone-200 rounded overflow-hidden bg-[#FBF9F5]">
            <div
              className="px-4 py-3 text-white flex items-center justify-between"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="font-display font-semibold">HKBP Ressort Hutaraja</span>
              <span className="text-[11px] opacity-90">Beranda · Jadwal · Warta · Berita</span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: accentColor }}
                >
                  Distrik VI Dairi
                </p>
                <p className="font-display text-lg font-semibold text-stone-900 mb-2">
                  Bertumbuh dalam Firman, Melayani dalam Kasih
                </p>
                <div className="p-3 bg-[#F4EFE6] border border-stone-200 rounded text-[12px]">
                  <p className="font-semibold mb-0.5" style={{ color: primaryColor }}>
                    {verseRef}
                  </p>
                  <p className="italic text-stone-700">&ldquo;{verseText}&rdquo;</p>
                </div>
              </div>
              <div className="h-40 rounded overflow-hidden border border-stone-200 bg-stone-100">
                {heroImageUrl && (
                  <img
                    src={heroImageUrl}
                    alt="Pratinjau Hero"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaPickerModal
        open={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        accept="image"
        title={pickerTarget === 'logo' ? 'Pilih Logo Situs' : 'Pilih Gambar Header Beranda'}
        onSelect={(items: MediaItem[]) => {
          if (!items[0]) return;
          const url = getMediaProxyUrl(items[0].id, { width: pickerTarget === 'logo' ? 300 : 1024 });
          if (pickerTarget === 'logo') setLogoUrl(url);
          if (pickerTarget === 'hero') setHeroImageUrl(url);
          setPickerTarget(null);
        }}
      />
    </div>
  );
}
