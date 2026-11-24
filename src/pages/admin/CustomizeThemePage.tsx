import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { MediaPickerModal } from '../../components/admin/MediaPickerModal';
import { HkbpLogo } from '../../components/HkbpLogo';
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

  // Kustomisasi Halaman Login
  const [loginLogoUrl, setLoginLogoUrl] = useState('');
  const [loginTitle, setLoginTitle] = useState(
    DEFAULT_SITE_OPTIONS.login_title || 'HKBP Ressort Hutaraja'
  );
  const [loginSubtitle, setLoginSubtitle] = useState('');
  const [loginBackText, setLoginBackText] = useState(
    DEFAULT_SITE_OPTIONS.login_back_text || 'Kembali ke HKBP Ressort Hutaraja'
  );

  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<null | 'logo' | 'hero' | 'login_logo'>(null);

  useEffect(() => {
    fetchSiteOptions().then((opts) => {
      setPrimaryColor(opts.theme_primary_color || '#0f294a');
      setAccentColor(opts.theme_accent_color || '#d97706');
      setLogoUrl(opts.theme_logo_url || '');
      setHeroImageUrl(
        opts.theme_hero_image_url || '/src/assets/images/church_hero_sanctuary_1795501235668.jpg'
      );
      setVerseRef(opts.daily_verse?.reference || 'Kolose 2:7');
      setVerseText(
        opts.daily_verse?.text ||
          'Hendaklah kamu berakar di dalam Dia dan dibangun di atas Dia, hendaklah kamu bertambah teguh dalam iman yang telah diajarkan kepadamu.'
      );
      setLoginLogoUrl(opts.login_logo_url || '');
      setLoginTitle(opts.login_title ?? opts.site_title ?? 'HKBP Ressort Hutaraja');
      setLoginSubtitle(opts.login_subtitle || '');
      setLoginBackText(
        opts.login_back_text ?? `Kembali ke ${opts.site_title || 'HKBP Ressort Hutaraja'}`
      );
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await saveSiteOptions({
      theme_primary_color: primaryColor,
      theme_accent_color: accentColor,
      theme_logo_url: logoUrl.trim(),
      theme_hero_image_url: heroImageUrl.trim(),
      daily_verse: { reference: verseRef, text: verseText },
      login_logo_url: loginLogoUrl.trim(),
      login_title: loginTitle.trim(),
      login_subtitle: loginSubtitle.trim(),
      login_back_text: loginBackText.trim(),
    });
    setSaving(false);
    if (error) {
      addNotice({ type: 'error', message: error });
    } else {
      addNotice({
        type: 'success',
        message: 'Kustomisasi tema situs dan halaman login berhasil disimpan.',
      });
    }
  };

  const effectiveLoginLogo = loginLogoUrl.trim() || logoUrl.trim();

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

          {/* Kustomisasi Halaman Login */}
          <div className="pt-3 border-t border-[#f0f0f1] space-y-2.5">
            <h2 className="font-semibold text-[#1d2327]">Halaman Login (Masuk Admin)</h2>
            <div>
              <label className="block text-[#50575e] mb-1">
                Logo Halaman Login (Kosongkan untuk pakai Logo Situs / HKBP Bawaan)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={loginLogoUrl}
                  onChange={(e) => setLoginLogoUrl(e.target.value)}
                  placeholder="/api/media/..."
                  className="flex-1 h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('login_logo')}
                  className="px-3 h-8 border border-[#2271b1] text-[#2271b1] bg-[#f6f7f7] rounded-[2px] cursor-pointer"
                >
                  Pilih
                </button>
                {loginLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setLoginLogoUrl('')}
                    className="px-2.5 h-8 border border-[#c3c4c7] text-[#50575e] bg-white hover:bg-[#f6f7f7] rounded-[2px] cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Teks Judul Login</label>
              <input
                type="text"
                value={loginTitle}
                onChange={(e) => setLoginTitle(e.target.value)}
                placeholder="HKBP Ressort Hutaraja"
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">
                Teks Subjudul / Keterangan Login (Opsional)
              </label>
              <textarea
                rows={2}
                value={loginSubtitle}
                onChange={(e) => setLoginSubtitle(e.target.value)}
                placeholder="Mis. Portal Pengurus & Pelayanan Huria Distrik VI Dairi"
                className="w-full p-2 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">
                Teks Tautan Kembali ke Beranda
              </label>
              <input
                type="text"
                value={loginBackText}
                onChange={(e) => setLoginBackText(e.target.value)}
                placeholder="Kembali ke HKBP Ressort Hutaraja"
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
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

        {/* Kolom Kanan: Pratinjau Langsung Publik & Halaman Login */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-[#c3c4c7] p-4 space-y-3">
            <p className="font-semibold text-[#1d2327]">Pratinjau Tampilan Publik</p>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-[#f8fafc]">
              <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <span className="font-display font-bold text-sm" style={{ color: primaryColor }}>
                  HKBP Ressort Hutaraja
                </span>
                <span className="text-[11px] text-slate-600">Beranda · Jadwal · Warta · Berita</span>
              </div>
              <div
                className="p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center text-white"
                style={{
                  background: `linear-gradient(135deg, #0a1c34 0%, ${primaryColor} 58%, #1e3a8a 100%)`,
                }}
              >
                <div className="sm:col-span-7">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: '#fbbf24' }}
                  >
                    Distrik VI Dairi
                  </p>
                  <p className="font-display text-lg font-bold text-white mb-2">
                    HKBP Ressort Hutaraja
                  </p>
                  <div
                    className="w-10 h-[2px] mb-2"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="p-3 bg-white/10 border border-white/20 rounded-lg text-[11px]">
                    <p className="font-semibold mb-0.5 text-[#fbbf24]">
                      {verseRef}
                    </p>
                    <p className="italic text-white/85">&ldquo;{verseText}&rdquo;</p>
                  </div>
                </div>
                <div className="sm:col-span-5 bg-white rounded-lg p-2.5 text-slate-900">
                  <div className="h-24 rounded overflow-hidden border border-slate-200 bg-slate-100 mb-2">
                    {heroImageUrl && (
                      <img
                        src={heroImageUrl}
                        alt="Pratinjau Hero"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Ibadah Minggu Terdekat
                  </p>
                  <p className="text-xs font-bold text-slate-900">08.00 &amp; 10.30 WIB</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pratinjau Halaman Login */}
          <div className="bg-white border border-[#c3c4c7] p-4 space-y-3">
            <p className="font-semibold text-[#1d2327]">Pratinjau Halaman Login (/login)</p>
            <div className="border border-[#c3c4c7] bg-[#f0f0f1] p-6 flex flex-col items-center">
              <div className="w-full max-w-[260px]">
                <div className="flex flex-col items-center text-center mb-3">
                  {effectiveLoginLogo ? (
                    <img
                      src={effectiveLoginLogo}
                      alt={loginTitle || 'Logo Login'}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-contain mb-1.5"
                    />
                  ) : (
                    <HkbpLogo className="w-12 h-12 mb-1.5" variant="color" />
                  )}
                  <span className="text-[13px] font-semibold text-[#1d2327]">
                    {loginTitle || 'HKBP Ressort Hutaraja'}
                  </span>
                  {loginSubtitle && (
                    <span className="text-[11px] text-[#50575e] mt-0.5 leading-snug">
                      {loginSubtitle}
                    </span>
                  )}
                </div>

                <div className="bg-white border border-[#c3c4c7] p-3.5 space-y-2 text-[11px]">
                  <div>
                    <div className="text-[#1d2327] mb-0.5">Alamat Email</div>
                    <div className="h-6 border border-[#8c8f94] rounded-[2px] bg-white" />
                  </div>
                  <div>
                    <div className="text-[#1d2327] mb-0.5">Kata Sandi</div>
                    <div className="h-6 border border-[#8c8f94] rounded-[2px] bg-white" />
                  </div>
                  <div className="flex justify-end pt-1">
                    <span className="px-2.5 py-1 bg-[#2271b1] text-white rounded-[2px]">
                      Masuk
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#50575e] mt-2">
                  &larr; {loginBackText || 'Kembali ke HKBP Ressort Hutaraja'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaPickerModal
        open={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        accept="image"
        title={
          pickerTarget === 'logo'
            ? 'Pilih Logo Situs'
            : pickerTarget === 'login_logo'
              ? 'Pilih Logo Halaman Login'
              : 'Pilih Gambar Header Beranda'
        }
        onSelect={(items: MediaItem[]) => {
          if (!items[0]) return;
          const url = getMediaProxyUrl(items[0].id, {
            width: pickerTarget === 'hero' ? 1024 : 300,
          });
          if (pickerTarget === 'logo') setLogoUrl(url);
          if (pickerTarget === 'login_logo') setLoginLogoUrl(url);
          if (pickerTarget === 'hero') setHeroImageUrl(url);
          setPickerTarget(null);
        }}
      />
    </div>
  );
}
