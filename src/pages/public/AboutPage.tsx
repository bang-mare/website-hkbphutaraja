import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, MapPin, Pencil, Phone, Plus, Trash2, Users, X } from 'lucide-react';
import { usePublicSite } from '../../layouts/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { usePageSeo } from '../../hooks/usePageSeo';
import { hasCapability } from '../../lib/roles';
import { normalizeChurchProfile, saveSiteOptions } from '../../lib/publicData';
import type {
  ChurchProfileData,
  ChurchProfileFunctionary,
  ChurchProfileLeader,
  HuriaPagaranItem,
} from '../../types/cms';

export type ProfileTabKey = 'sejarah' | 'visi-misi' | 'pimpinan' | 'huria-pagaran';

const PROFILE_TABS: Array<{ key: ProfileTabKey; label: string }> = [
  { key: 'sejarah', label: 'Sejarah' },
  { key: 'visi-misi', label: 'Visi, Misi & Konfesi' },
  { key: 'pimpinan', label: 'Pimpinan, Sintua & Fungsionaris' },
  { key: 'huria-pagaran', label: 'Huria Pagaran' },
];

function resolveValidTab(raw: string | null): ProfileTabKey {
  if (
    raw === 'sejarah' ||
    raw === 'visi-misi' ||
    raw === 'pimpinan' ||
    raw === 'huria-pagaran'
  ) {
    return raw;
  }
  return 'sejarah';
}

type EditSectionKey =
  | 'sejarah_umum'
  | 'sejarah_lokal'
  | 'visi_misi'
  | 'konfesi'
  | 'leaders'
  | 'functionaries'
  | 'pagaran';

export function AboutPage() {
  const { options, wijkList, updateSiteOptions } = usePublicSite();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = resolveValidTab(searchParams.get('tab'));
  const canEditProfile =
    hasCapability(profile?.role, 'manage_settings') ||
    hasCapability(profile?.role, 'manage_appearance');

  const churchProfile = normalizeChurchProfile(options.church_profile);
  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  const activeTabLabel =
    PROFILE_TABS.find((t) => t.key === activeTab)?.label || 'Sejarah';

  usePageSeo({
    title: `Profil · ${activeTabLabel}`,
    description:
      churchProfile.page_subtitle ||
      `Profil gereja, sejarah, visi-misi & konfesi, pimpinan, sintua, fungsionaris, dan Huria Pagaran ${options.site_title}.`,
    siteTitle: options.site_title,
  });

  // State modal sunting khusus admin/sekretariat (disimpan langsung ke Supabase options)
  const [editingSection, setEditingSection] = useState<EditSectionKey | null>(null);
  const [draftProfile, setDraftProfile] = useState<ChurchProfileData>(churchProfile);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(null), 3500);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  useEffect(() => {
    if (!editingSection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingSection(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingSection]);

  const handleSelectTab = (tabKey: ProfileTabKey) => {
    if (tabKey === 'sejarah') {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ tab: tabKey }, { replace: false });
    }
  };

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = PROFILE_TABS[(index + 1) % PROFILE_TABS.length];
      handleSelectTab(next.key);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev =
        PROFILE_TABS[(index - 1 + PROFILE_TABS.length) % PROFILE_TABS.length];
      handleSelectTab(prev.key);
    }
  };

  const openEditor = (section: EditSectionKey) => {
    setDraftProfile(normalizeChurchProfile(options.church_profile));
    setSaveError(null);
    setEditingSection(section);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const cleaned: ChurchProfileData = {
      ...draftProfile,
      misi_items: draftProfile.misi_items.map((s) => s.trim()).filter(Boolean),
      konfesi_points: draftProfile.konfesi_points
        .map((s) => s.trim())
        .filter(Boolean),
      leaders: draftProfile.leaders.filter(
        (l) => l.role.trim() || l.name.trim()
      ),
      functionaries: draftProfile.functionaries.filter(
        (f) => f.unit.trim() || f.chairperson.trim()
      ),
      pagaran: draftProfile.pagaran.filter((p) => p.name.trim()),
    };

    const nextOptions = {
      ...options,
      church_profile: cleaned,
    };

    const { error } = await saveSiteOptions({ church_profile: cleaned });
    setSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    updateSiteOptions(nextOptions);
    setEditingSection(null);
    setSaveSuccess('Perubahan profil gereja berhasil disimpan ke Supabase.');
  };

  const updateLeader = (
    idx: number,
    patch: Partial<ChurchProfileLeader>
  ) => {
    setDraftProfile((prev) => ({
      ...prev,
      leaders: prev.leaders.map((item, i) =>
        i === idx ? { ...item, ...patch } : item
      ),
    }));
  };

  const updateFunctionary = (
    idx: number,
    patch: Partial<ChurchProfileFunctionary>
  ) => {
    setDraftProfile((prev) => ({
      ...prev,
      functionaries: prev.functionaries.map((item, i) =>
        i === idx ? { ...item, ...patch } : item
      ),
    }));
  };

  const updatePagaran = (idx: number, patch: Partial<HuriaPagaranItem>) => {
    setDraftProfile((prev) => ({
      ...prev,
      pagaran: prev.pagaran.map((item, i) =>
        i === idx ? { ...item, ...patch } : item
      ),
    }));
  };

  const renderEditButton = (section: EditSectionKey, label: string) => {
    if (!canEditProfile) return null;
    return (
      <button
        type="button"
        onClick={() => openEditor(section)}
        aria-label={label}
        title={label}
        className="inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-amber-300 bg-amber-50/70 text-amber-600 hover:bg-amber-100 hover:border-amber-400 transition-colors shrink-0 cursor-pointer"
      >
        <Pencil className="w-4 h-4" aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="bg-[#f8fafc] min-h-[70vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-12 sm:pb-16 space-y-7">
        {/* Header Halaman Profil */}
        <header className="space-y-2.5 max-w-4xl">
          <p className="text-xs uppercase tracking-[0.12em] font-semibold text-slate-600">
            {churchProfile.eyebrow || 'INFO HURIA · PROFIL GEREJA'}
          </p>
          <h1 className="heading-page font-display font-bold text-[#0f172a]">
            {churchProfile.page_title || `Profil & Struktur ${options.site_title}`}
          </h1>
          <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed">
            {churchProfile.page_subtitle}
          </p>
        </header>

        {saveSuccess && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 font-medium"
          >
            {saveSuccess}
          </div>
        )}

        {/* Navigasi Tab Anak Menu Profil */}
        <div
          role="tablist"
          aria-label="Submenu Profil Gereja"
          className="flex flex-wrap items-center gap-2.5"
        >
          {PROFILE_TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`profile-tab-${tab.key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`profile-panel-${tab.key}`}
                onClick={() => handleSelectTab(tab.key)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                style={
                  isActive
                    ? { backgroundColor: primaryColor, borderColor: primaryColor }
                    : undefined
                }
                className={`inline-flex items-center justify-center min-h-[44px] px-4 sm:px-5 py-2.5 rounded-lg text-[14px] sm:text-[15px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'bg-white border-[#e2e8f0] text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: SEJARAH */}
        {activeTab === 'sejarah' && (
          <section
            id="profile-panel-sejarah"
            role="tabpanel"
            aria-labelledby="profile-tab-sejarah"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
          >
            <article className="surface-card p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-xl sm:text-[22px] font-bold text-[#0f172a] leading-snug">
                    {churchProfile.sejarah_umum_title}
                  </h2>
                  {renderEditButton(
                    'sejarah_umum',
                    'Sunting Sejarah Singkat HKBP Umum'
                  )}
                </div>
                <p className="text-[15px] sm:text-base text-slate-700 leading-[1.75] whitespace-pre-line">
                  {churchProfile.sejarah_umum_body}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                <span>7 Oktober 1861 · Sipirok</span>
                <span aria-hidden="true">&middot;</span>
                <span>Rhenish Missionary Society (RMG)</span>
                <span aria-hidden="true">&middot;</span>
                <span>Dr. I.L. Nommensen</span>
              </div>
            </article>

            <article className="surface-card p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-xl sm:text-[22px] font-bold text-[#0f172a] leading-snug">
                    {churchProfile.sejarah_lokal_title}
                  </h2>
                  {renderEditButton(
                    'sejarah_lokal',
                    'Sunting Sejarah Jemaat Lokal HKBP Ressort Hutaraja'
                  )}
                </div>
                <p className="text-[15px] sm:text-base text-slate-700 leading-[1.75] whitespace-pre-line">
                  {churchProfile.sejarah_lokal_body}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                <span>Distrik VI Dairi</span>
                <span aria-hidden="true">&middot;</span>
                <span>{wijkList.length} Lingkungan (Wijk)</span>
                <span aria-hidden="true">&middot;</span>
                <span>Koinonia · Marturia · Diakonia</span>
              </div>
            </article>
          </section>
        )}

        {/* TAB 2: VISI, MISI & KONFESI */}
        {activeTab === 'visi-misi' && (
          <section
            id="profile-panel-visi-misi"
            role="tabpanel"
            aria-labelledby="profile-tab-visi-misi"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
          >
            <article className="surface-card p-6 sm:p-8 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-xs uppercase tracking-[0.08em] font-semibold mb-1"
                    style={{ color: accentColor }}
                  >
                    Arah &amp; Panggilan Pelayanan
                  </p>
                  <h2 className="font-display text-xl sm:text-[22px] font-bold text-[#0f172a] leading-snug">
                    {churchProfile.visi_title}
                  </h2>
                </div>
                {renderEditButton('visi_misi', 'Sunting Visi & Misi Pelayanan')}
              </div>

              <p className="text-[15px] sm:text-base text-slate-800 leading-[1.75] font-medium whitespace-pre-line">
                {churchProfile.visi_body}
              </p>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-500">
                  Misi Pelayanan (Tri Tugas Panggilan Gereja)
                </h3>
                <ol className="space-y-3">
                  {churchProfile.misi_items.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-[15px] sm:text-base text-slate-700 leading-relaxed"
                    >
                      <span
                        className="font-mono-num text-xs font-bold pt-1 shrink-0"
                        style={{ color: primaryColor }}
                      >
                        0{idx + 1}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>

            <article className="surface-card p-6 sm:p-8 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                    Dasar Pengakuan Iman
                  </p>
                  <h2 className="font-display text-xl sm:text-[22px] font-bold text-[#0f172a] leading-snug">
                    {churchProfile.konfesi_title}
                  </h2>
                </div>
                {renderEditButton('konfesi', 'Sunting Konfesi HKBP')}
              </div>

              <p className="text-[15px] sm:text-base text-slate-700 leading-[1.75] whitespace-pre-line">
                {churchProfile.konfesi_body}
              </p>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-500">
                  Pokok-Pokok Pengakuan Iman HKBP (1951 &amp; 1996)
                </h3>
                <ol className="space-y-3">
                  {churchProfile.konfesi_points.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-[15px] sm:text-base text-slate-700 leading-relaxed"
                    >
                      <span
                        className="font-mono-num text-xs font-bold pt-1 shrink-0"
                        style={{ color: accentColor }}
                      >
                        0{idx + 1}.
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          </section>
        )}

        {/* TAB 3: PIMPINAN, SINTUA & FUNGSIONARIS */}
        {activeTab === 'pimpinan' && (
          <section
            id="profile-panel-pimpinan"
            role="tabpanel"
            aria-labelledby="profile-tab-pimpinan"
            className="space-y-10"
          >
            {/* Bagian A: Pimpinan & Pelayan Penuh Waktu */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                    Parhalado Ressort
                  </p>
                  <h2 className="heading-section font-display font-bold text-[#0f172a]">
                    Pimpinan &amp; Pelayan Penuh Waktu
                  </h2>
                </div>
                {renderEditButton('leaders', 'Sunting Daftar Pimpinan Ressort')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {churchProfile.leaders.map((leader) => (
                  <article
                    key={leader.id}
                    className="surface-card p-5 sm:p-6 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <p
                        className="text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
                        style={{ color: accentColor }}
                      >
                        {leader.role}
                      </p>
                      <h3 className="font-display text-lg font-bold text-[#0f172a] leading-snug mb-2">
                        {leader.name}
                      </h3>
                      <p className="text-[15px] text-slate-600 leading-relaxed">
                        {leader.desc}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Bagian B: Dewan & Fungsionaris Gereja */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                    Struktur Fungsionaris
                  </p>
                  <h2 className="heading-section font-display font-bold text-[#0f172a]">
                    Dewan Pelayanan &amp; Fungsionaris Huria
                  </h2>
                </div>
                {renderEditButton(
                  'functionaries',
                  'Sunting Dewan & Fungsionaris Gereja'
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {churchProfile.functionaries.map((fn) => (
                  <article key={fn.id} className="surface-card p-5 sm:p-6 space-y-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3
                        className="font-display text-xl font-bold"
                        style={{ color: primaryColor }}
                      >
                        {fn.unit}
                      </h3>
                      {fn.chairperson && (
                        <span className="text-xs font-semibold text-slate-600">
                          {fn.chairperson}
                        </span>
                      )}
                    </div>
                    {fn.members && (
                      <p className="text-sm font-medium text-slate-700">
                        Bidang / Seksi: {fn.members}
                      </p>
                    )}
                    <p className="text-[15px] text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
                      {fn.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            {/* Bagian C: Majelis Sintua & 6 Lingkungan (Wijk) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                    Direktori Sintua Lingkungan
                  </p>
                  <h2 className="heading-section font-display font-bold text-[#0f172a]">
                    Koordinator Sintua &amp; Enam Wijk Pelayanan
                  </h2>
                </div>
                <Link
                  to="/jadwal-ibadah"
                  className="inline-flex items-center min-h-[44px] sm:min-h-0 text-[15px] font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  Lihat jadwal PHD Lingkungan &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {wijkList.map((w, idx) => (
                  <article key={w.id} className="surface-card p-5 sm:p-6 space-y-2.5">
                    <p className="text-xs text-slate-500 font-mono-num">
                      0{idx + 1}. Lingkungan
                    </p>
                    <h3
                      className="font-display text-xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      Wijk {w.name}
                    </h3>
                    <p className="text-[15px] text-slate-600 leading-relaxed">
                      {w.description}
                    </p>
                    {(w.koordinator_name || w.koordinator_phone) && (
                      <div className="pt-2.5 border-t border-slate-100 space-y-1 text-sm text-slate-700">
                        {w.koordinator_name && (
                          <p>
                            Koordinator Sintua:{' '}
                            <strong className="text-[#0f172a]">
                              {w.koordinator_name}
                            </strong>
                          </p>
                        )}
                        {w.koordinator_phone && (
                          <p className="inline-flex items-center gap-1.5 text-slate-600 tabular-nums">
                            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{w.koordinator_phone}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: HURIA PAGARAN */}
        {activeTab === 'huria-pagaran' && (
          <section
            id="profile-panel-huria-pagaran"
            role="tabpanel"
            aria-labelledby="profile-tab-huria-pagaran"
            className="space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                  Jaringan Gereja Seressort
                </p>
                <h2 className="heading-section font-display font-bold text-[#0f172a]">
                  Daftar Huria Induk &amp; Huria Pagaran
                </h2>
                <p className="text-[15px] text-slate-600 mt-1">
                  Gereja-gereja yang terhimpun dan dilayani bersama dalam kesatuan{' '}
                  {options.site_title}, Distrik VI Dairi.
                </p>
              </div>
              {renderEditButton('pagaran', 'Sunting Daftar Huria Pagaran')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {churchProfile.pagaran.map((pg, idx) => (
                <article
                  key={pg.id}
                  className="surface-card p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-mono-num text-slate-500">
                      0{idx + 1}. {idx === 0 ? 'Huria Sabungan' : 'Huria Pagaran'}
                    </p>
                    <h3
                      className="font-display text-xl font-bold leading-snug"
                      style={{ color: primaryColor }}
                    >
                      {pg.name}
                    </h3>
                    <p className="text-[15px] text-slate-600 leading-relaxed">
                      {pg.notes}
                    </p>
                  </div>

                  <dl className="pt-3 border-t border-slate-100 space-y-2 text-sm text-slate-700">
                    {pg.location && (
                      <div className="flex items-start gap-2">
                        <MapPin
                          className="w-4 h-4 shrink-0 mt-0.5 text-slate-500"
                          aria-hidden="true"
                        />
                        <dd>{pg.location}</dd>
                      </div>
                    )}
                    {pg.leader && (
                      <div className="flex items-start gap-2">
                        <Users
                          className="w-4 h-4 shrink-0 mt-0.5 text-slate-500"
                          aria-hidden="true"
                        />
                        <dd>{pg.leader}</dd>
                      </div>
                    )}
                    {pg.service_time && (
                      <div className="flex items-start gap-2">
                        <Clock
                          className="w-4 h-4 shrink-0 mt-0.5 text-slate-500"
                          aria-hidden="true"
                        />
                        <dd className="tabular-nums">{pg.service_time}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modal Sunting Profil (khusus Admin / Sekretaris) */}
      {editingSection && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setEditingSection(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-[#f8fafc]">
              <h2
                id="profile-edit-modal-title"
                className="font-display text-lg font-bold text-[#0f172a]"
              >
                Sunting Konten Profil Gereja
              </h2>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                aria-label="Tutup dialog"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveSection}
              className="p-5 overflow-y-auto space-y-4 text-[15px]"
            >
              {editingSection === 'sejarah_umum' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Judul Kartu Sejarah Umum
                    </label>
                    <input
                      type="text"
                      required
                      value={draftProfile.sejarah_umum_title}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          sejarah_umum_title: e.target.value,
                        }))
                      }
                      className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Uraian Sejarah Singkat HKBP Umum
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={draftProfile.sejarah_umum_body}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          sejarah_umum_body: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-slate-300 rounded-lg leading-relaxed"
                    />
                  </div>
                </>
              )}

              {editingSection === 'sejarah_lokal' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Judul Kartu Sejarah Jemaat Lokal
                    </label>
                    <input
                      type="text"
                      required
                      value={draftProfile.sejarah_lokal_title}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          sejarah_lokal_title: e.target.value,
                        }))
                      }
                      className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Uraian Sejarah Jemaat Lokal
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={draftProfile.sejarah_lokal_body}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          sejarah_lokal_body: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-slate-300 rounded-lg leading-relaxed"
                    />
                  </div>
                </>
              )}

              {editingSection === 'visi_misi' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Judul Visi Pelayanan
                    </label>
                    <input
                      type="text"
                      required
                      value={draftProfile.visi_title}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          visi_title: e.target.value,
                        }))
                      }
                      className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Rumusan Visi
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={draftProfile.visi_body}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          visi_body: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Poin Misi (satu baris per poin)
                    </label>
                    <textarea
                      rows={5}
                      value={draftProfile.misi_items.join('\n')}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          misi_items: e.target.value.split('\n'),
                        }))
                      }
                      className="w-full p-3 border border-slate-300 rounded-lg leading-relaxed"
                    />
                  </div>
                </>
              )}

              {editingSection === 'konfesi' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Judul Konfesi HKBP
                    </label>
                    <input
                      type="text"
                      required
                      value={draftProfile.konfesi_title}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          konfesi_title: e.target.value,
                        }))
                      }
                      className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Penjelasan Konfesi
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={draftProfile.konfesi_body}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          konfesi_body: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Pokok Pengakuan Iman (satu baris per poin)
                    </label>
                    <textarea
                      rows={5}
                      value={draftProfile.konfesi_points.join('\n')}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          konfesi_points: e.target.value.split('\n'),
                        }))
                      }
                      className="w-full p-3 border border-slate-300 rounded-lg leading-relaxed"
                    />
                  </div>
                </>
              )}

              {editingSection === 'leaders' && (
                <div className="space-y-4">
                  {draftProfile.leaders.map((leader, idx) => (
                    <div
                      key={leader.id}
                      className="p-4 border border-slate-200 rounded-lg space-y-2.5 bg-slate-50/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Pelayan #{idx + 1}
                        </span>
                        {draftProfile.leaders.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraftProfile((prev) => ({
                                ...prev,
                                leaders: prev.leaders.filter((_, i) => i !== idx),
                              }))
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Jabatan (mis. Pendeta Ressort)"
                          value={leader.role}
                          onChange={(e) =>
                            updateLeader(idx, { role: e.target.value })
                          }
                          className="min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Nama Lengkap Pelayan"
                          value={leader.name}
                          onChange={(e) =>
                            updateLeader(idx, { name: e.target.value })
                          }
                          className="min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Tugas dan tanggung jawab pelayanan"
                        value={leader.desc}
                        onChange={(e) =>
                          updateLeader(idx, { desc: e.target.value })
                        }
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDraftProfile((prev) => ({
                        ...prev,
                        leaders: [
                          ...prev.leaders,
                          {
                            id: `ldr-${Date.now()}`,
                            role: 'Pelayan Huria',
                            name: '',
                            desc: '',
                          },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Pimpinan / Pelayan
                  </button>
                </div>
              )}

              {editingSection === 'functionaries' && (
                <div className="space-y-4">
                  {draftProfile.functionaries.map((fn, idx) => (
                    <div
                      key={fn.id}
                      className="p-4 border border-slate-200 rounded-lg space-y-2.5 bg-slate-50/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Unit Fungsionaris #{idx + 1}
                        </span>
                        {draftProfile.functionaries.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraftProfile((prev) => ({
                                ...prev,
                                functionaries: prev.functionaries.filter(
                                  (_, i) => i !== idx
                                ),
                              }))
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Nama Dewan / Unit"
                          value={fn.unit}
                          onChange={(e) =>
                            updateFunctionary(idx, { unit: e.target.value })
                          }
                          className="min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Nama Ketua / Penanggung Jawab"
                          value={fn.chairperson}
                          onChange={(e) =>
                            updateFunctionary(idx, {
                              chairperson: e.target.value,
                            })
                          }
                          className="min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Daftar Seksi / Anggota"
                        value={fn.members}
                        onChange={(e) =>
                          updateFunctionary(idx, { members: e.target.value })
                        }
                        className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                      />
                      <textarea
                        rows={2}
                        placeholder="Deskripsi tugas pelayanan"
                        value={fn.desc}
                        onChange={(e) =>
                          updateFunctionary(idx, { desc: e.target.value })
                        }
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDraftProfile((prev) => ({
                        ...prev,
                        functionaries: [
                          ...prev.functionaries,
                          {
                            id: `fn-${Date.now()}`,
                            unit: 'Dewan / Badan Baru',
                            chairperson: '',
                            members: '',
                            desc: '',
                          },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Dewan / Fungsionaris
                  </button>
                </div>
              )}

              {editingSection === 'pagaran' && (
                <div className="space-y-4">
                  {draftProfile.pagaran.map((pg, idx) => (
                    <div
                      key={pg.id}
                      className="p-4 border border-slate-200 rounded-lg space-y-2.5 bg-slate-50/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Gereja #{idx + 1}
                        </span>
                        {draftProfile.pagaran.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraftProfile((prev) => ({
                                ...prev,
                                pagaran: prev.pagaran.filter((_, i) => i !== idx),
                              }))
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Nama Gereja (Induk / Pagaran)"
                        value={pg.name}
                        onChange={(e) =>
                          updatePagaran(idx, { name: e.target.value })
                        }
                        className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Lokasi / Alamat"
                          value={pg.location}
                          onChange={(e) =>
                            updatePagaran(idx, { location: e.target.value })
                          }
                          className="min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Uluan / Pimpinan"
                          value={pg.leader}
                          onChange={(e) =>
                            updatePagaran(idx, { leader: e.target.value })
                          }
                          className="min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Jadwal Ibadah Minggu"
                        value={pg.service_time}
                        onChange={(e) =>
                          updatePagaran(idx, { service_time: e.target.value })
                        }
                        className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg bg-white"
                      />
                      <textarea
                        rows={2}
                        placeholder="Keterangan singkat"
                        value={pg.notes}
                        onChange={(e) =>
                          updatePagaran(idx, { notes: e.target.value })
                        }
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDraftProfile((prev) => ({
                        ...prev,
                        pagaran: [
                          ...prev.pagaran,
                          {
                            id: `pg-${Date.now()}`,
                            name: 'HKBP Pagaran',
                            location: '',
                            leader: '',
                            service_time: 'Minggu 10.00 WIB',
                            notes: '',
                          },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Huria Pagaran
                  </button>
                </div>
              )}

              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="min-h-[44px] px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ backgroundColor: primaryColor }}
                  className="min-h-[44px] px-5 py-2 rounded-lg font-semibold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
