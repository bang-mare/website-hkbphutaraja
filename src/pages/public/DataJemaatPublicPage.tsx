import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  Paperclip,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';
import { PublicJemaatStatsSection } from '../../components/PublicJemaatStatsSection';
import {
  createEmptyPublicStats,
  fetchPublicJemaatStats,
  lookupPermohonanStatus,
  PERMOHONAN_STATUS_META,
  PERUBAHAN_FIELD_OPTIONS,
  prepareAttachmentMeta,
  submitPermohonanPerubahan,
} from '../../lib/jemaatData';
import type {
  PermohonanAnggotaDraft,
  PermohonanAttachmentMeta,
  PermohonanEditableFieldKey,
  PermohonanJenis,
  PermohonanPerubahanField,
  PermohonanPublicStatusRecord,
  PublicJemaatStats,
} from '../../types/cms';

type PublicJemaatTab = 'statistik' | 'permohonan';

const createEmptyAnggotaRow = (): PermohonanAnggotaDraft => ({
  nama_lengkap: '',
  tempat_lahir: '',
  tanggal_lahir: '',
  jenis_kelamin: 'L',
  status_keluarga: 'Anak',
});

const createEmptyPerubahanRow = (): PermohonanPerubahanField => ({
  field: 'full_name',
  field_label: 'Nama Lengkap',
  nama_anggota: '',
  data_lama: '',
  data_benar: '',
});

const DOC_INPUT_ITEMS = [
  { key: 'surat_keterangan_gereja', label: 'Surat Keterangan Gereja' },
  { key: 'akte_pernikahan', label: 'Akte Pernikahan' },
  { key: 'akte_baptis', label: 'Akte Baptis' },
  { key: 'akte_sidi', label: 'Akte Sidi' },
  { key: 'surat_pengantar_sintua_wijk', label: 'Surat Pengantar Sintua Wijk' },
];

export function DataJemaatPublicPage() {
  const { options, wijkList } = usePublicSite();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab: PublicJemaatTab =
    searchParams.get('tab') === 'permohonan' ? 'permohonan' : 'statistik';
  const [activeTab, setActiveTab] = useState<PublicJemaatTab>(initialTab);

  usePageSeo({
    title: 'Data Jemaat & Permohonan Perubahan Data',
    description: `Statistik ruas ni huria aktif, permohonan perubahan data jemaat, dan cek status pengajuan di ${options.site_title}.`,
    siteTitle: options.site_title,
  });

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  const [stats, setStats] = useState<PublicJemaatStats>(() =>
    createEmptyPublicStats(wijkList)
  );
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const paramTab = searchParams.get('tab');
    if (paramTab === 'permohonan') setActiveTab('permohonan');
    else if (paramTab === 'statistik') setActiveTab('statistik');
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoadingStats(true);
    fetchPublicJemaatStats(wijkList).then(({ stats: fetched }) => {
      if (!active) return;
      setStats(fetched);
      setLoadingStats(false);
    });
    return () => {
      active = false;
    };
  }, [wijkList]);

  const switchTab = (nextTab: PublicJemaatTab) => {
    setActiveTab(nextTab);
    setSearchParams(nextTab === 'permohonan' ? { tab: 'permohonan' } : {});
  };

  // =========================================================================
  // STATE FORM PERMOHONAN PERUBAHAN DATA
  // =========================================================================
  const [jenisPermohonan, setJenisPermohonan] = useState<PermohonanJenis>(
    'Tambah Anggota/Anak Lahir'
  );
  const [wijkId, setWijkId] = useState('');
  const [namaSuami, setNamaSuami] = useState('');
  const [namaIstri, setNamaIstri] = useState('');
  const [emailPemohon, setEmailPemohon] = useState('');
  const [alamatPemohon, setAlamatPemohon] = useState('');
  const [namaPemohonUmum, setNamaPemohonUmum] = useState('');
  const [noRegistrasi, setNoRegistrasi] = useState('');
  const [verifikasiIdentitas, setVerifikasiIdentitas] = useState('');
  const [noHpPemohon, setNoHpPemohon] = useState('');
  const [detailManual, setDetailManual] = useState('');

  const [anggotaRows, setAnggotaRows] = useState<PermohonanAnggotaDraft[]>([
    createEmptyAnggotaRow(),
  ]);
  const [perubahanRows, setPerubahanRows] = useState<PermohonanPerubahanField[]>([
    createEmptyPerubahanRow(),
  ]);
  const [attachments, setAttachments] = useState<
    Record<string, PermohonanAttachmentMeta>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitSuccessCode, setSubmitSuccessCode] = useState('');

  // =========================================================================
  // STATE CEK STATUS PERMOHONAN
  // =========================================================================
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupSearched, setLookupSearched] = useState(false);
  const [lookupResults, setLookupResults] = useState<
    PermohonanPublicStatusRecord[]
  >([]);

  const runLookup = async (q: string) => {
    setLookupError('');
    setLookupLoading(true);
    setLookupSearched(true);
    const { items, error } = await lookupPermohonanStatus(q);
    setLookupLoading(false);
    if (error) {
      setLookupError(error);
      setLookupResults([]);
      return;
    }
    setLookupResults(items);
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runLookup(lookupQuery);
  };

  const handleAttachmentChange = async (
    docKey: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    const { meta, error } = await prepareAttachmentMeta(file);
    if (error || !meta) {
      setFormError(error || 'Gagal membaca berkas lampiran.');
      e.target.value = '';
      return;
    }
    setAttachments((prev) => ({ ...prev, [docKey]: meta }));
  };

  const removeAttachment = (docKey: string) => {
    setAttachments((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
  };

  const updateAnggotaRow = (
    idx: number,
    patch: Partial<PermohonanAnggotaDraft>
  ) => {
    setAnggotaRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  };

  const updatePerubahanRow = (
    idx: number,
    patch: Partial<PermohonanPerubahanField>
  ) => {
    setPerubahanRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  };

  const handleSubmitPermohonan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitSuccessCode('');

    const selectedWijk = wijkList.find((w) => w.id === wijkId);
    const cleanReg = noRegistrasi.trim();
    const cleanVerif = verifikasiIdentitas.trim();
    const cleanHp = noHpPemohon.trim();
    const cleanDetail = detailManual.trim();

    if (!selectedWijk) {
      setFormError('Silakan pilih Wijk / Lingkungan terlebih dahulu.');
      return;
    }
    if (cleanReg.length < 3) {
      setFormError('Nomor Kartu Keluarga (KK) / No. Registrasi wajib diisi.');
      return;
    }
    if (cleanVerif.length < 4) {
      setFormError('Tanggal lahir atau 6 digit terakhir NIK verifikasi wajib diisi.');
      return;
    }
    if (cleanHp.length < 9) {
      setFormError('Nomor HP / WhatsApp aktif minimal 9 digit.');
      return;
    }

    let finalNamaPemohon = namaPemohonUmum.trim();
    let finalDetail = cleanDetail;
    let validAnggota: PermohonanAnggotaDraft[] = [];
    let validPerubahan: PermohonanPerubahanField[] = [];

    if (jenisPermohonan === 'Tambah Anggota/Anak Lahir') {
      if (!namaSuami.trim() || !alamatPemohon.trim()) {
        setFormError('Nama Suami / Kepala Keluarga dan Alamat keluarga wajib diisi.');
        return;
      }
      validAnggota = anggotaRows.filter((a) => a.nama_lengkap.trim() !== '');
      if (
        validAnggota.length === 0 ||
        validAnggota.some((a) => !a.tanggal_lahir.trim())
      ) {
        setFormError(
          'Isi minimal 1 data anak / anggota keluarga lengkap beserta tanggal lahirnya.'
        );
        return;
      }
      finalNamaPemohon = namaSuami.trim();
      if (!finalDetail) {
        finalDetail = `Penambahan ${validAnggota.length} anggota keluarga: ${validAnggota
          .map((a) => a.nama_lengkap.trim())
          .join(', ')}`;
      }
    } else if (jenisPermohonan === 'Perbaikan Biodata') {
      if (!finalNamaPemohon) {
        setFormError('Nama pemohon / kepala keluarga wajib diisi.');
        return;
      }
      validPerubahan = perubahanRows;
      if (
        validPerubahan.length === 0 ||
        validPerubahan.some((c) => !c.data_lama.trim() || !c.data_benar.trim())
      ) {
        setFormError(
          'Lengkapi Data Lama (Salah) dan Data yang Benar pada seluruh baris perubahan.'
        );
        return;
      }
      if (!finalDetail) {
        finalDetail = `Perbaikan ${validPerubahan.length} data: ${validPerubahan
          .map((c) => `${c.field_label} (${c.data_lama} -> ${c.data_benar})`)
          .join('; ')}`;
      }
    } else {
      if (!finalNamaPemohon || cleanDetail.length < 6) {
        setFormError(
          'Nama pemohon dan rincian permohonan (minimal 6 karakter) wajib diisi.'
        );
        return;
      }
    }

    setSubmitting(true);
    const { data, error } = await submitPermohonanPerubahan({
      jenis_permohonan: jenisPermohonan,
      wijk_id: selectedWijk.id,
      wijk_name: selectedWijk.name,
      no_registrasi: cleanReg,
      nama_pemohon: finalNamaPemohon,
      nama_suami: jenisPermohonan === 'Tambah Anggota/Anak Lahir' ? namaSuami.trim() : '',
      nama_istri: jenisPermohonan === 'Tambah Anggota/Anak Lahir' ? namaIstri.trim() : '',
      email_pemohon:
        jenisPermohonan === 'Tambah Anggota/Anak Lahir' ? emailPemohon.trim() : '',
      alamat_pemohon:
        jenisPermohonan === 'Tambah Anggota/Anak Lahir' ? alamatPemohon.trim() : '',
      no_hp_pemohon: cleanHp,
      verifikasi_identitas: cleanVerif,
      daftar_anggota: validAnggota,
      daftar_perubahan: validPerubahan,
      kelengkapan_dokumen:
        jenisPermohonan === 'Tambah Anggota/Anak Lahir' ? attachments : {},
      detail_perubahan: finalDetail,
    });
    setSubmitting(false);

    if (error || !data) {
      setFormError(error || 'Gagal mengirim permohonan.');
      return;
    }

    // Reset form & tampilkan di panel Cek Status
    setNamaSuami('');
    setNamaIstri('');
    setEmailPemohon('');
    setAlamatPemohon('');
    setNamaPemohonUmum('');
    setNoRegistrasi('');
    setVerifikasiIdentitas('');
    setNoHpPemohon('');
    setDetailManual('');
    setAnggotaRows([createEmptyAnggotaRow()]);
    setPerubahanRows([createEmptyPerubahanRow()]);
    setAttachments({});

    setSubmitSuccessCode(data.request_code);
    setLookupQuery(data.request_code);
    await runLookup(data.request_code);
  };

  const renderDataBenarInput = (
    row: PermohonanPerubahanField,
    idx: number
  ) => {
    const meta =
      PERUBAHAN_FIELD_OPTIONS.find((o) => o.key === row.field) ||
      PERUBAHAN_FIELD_OPTIONS[0];

    if (row.field === 'wijk_id') {
      return (
        <select
          value={row.data_benar}
          onChange={(e) => updatePerubahanRow(idx, { data_benar: e.target.value })}
          className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
        >
          <option value="">-- Pilih Wijk Benar --</option>
          {wijkList.map((w) => (
            <option key={w.id} value={w.name}>
              Wijk {w.name}
            </option>
          ))}
        </select>
      );
    }

    if (meta.inputType === 'select' && meta.options) {
      return (
        <select
          value={row.data_benar}
          onChange={(e) => updatePerubahanRow(idx, { data_benar: e.target.value })}
          className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
        >
          <option value="">-- Pilih Nilai Benar --</option>
          {meta.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (meta.inputType === 'date') {
      return (
        <input
          type="date"
          value={row.data_benar}
          onChange={(e) => updatePerubahanRow(idx, { data_benar: e.target.value })}
          className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
        />
      );
    }

    return (
      <input
        type="text"
        value={row.data_benar}
        onChange={(e) => updatePerubahanRow(idx, { data_benar: e.target.value })}
        placeholder="Ketik data yang benar..."
        className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
      />
    );
  };

  const isTambahMode = jenisPermohonan === 'Tambah Anggota/Anak Lahir';
  const isPerbaikanMode = jenisPermohonan === 'Perbaikan Biodata';

  return (
    <div className="bg-[#f8fafc] min-h-[70vh]">
      {/* Page Header */}
      <section className="bg-white border-b border-[#e2e8f0] py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.1em] font-semibold text-slate-600 mb-1">
            Administrasi &amp; Ruas Ni Huria
          </p>
          <h1 className="font-display heading-page font-bold text-[#0f172a] mb-2">
            Data Jemaat &amp; Permohonan Perubahan Data
          </h1>
          <p className="text-base text-slate-600 max-w-3xl leading-relaxed mb-6">
            Statistik resmi ruas ni huria aktif di enam lingkungan (Wijk), layanan pengajuan pembaruan data keluarga kepada Sintua Wijk &amp; Sekretariat Huria, serta pelacakan status permohonan.
          </p>

          <div
            role="tablist"
            aria-label="Menu Data Jemaat"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'statistik'}
              onClick={() => switchTab('statistik')}
              style={
                activeTab === 'statistik'
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-sm sm:text-[15px] font-semibold border transition-colors cursor-pointer ${
                activeTab === 'statistik'
                  ? 'text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UsersRound className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Statistik &amp; Ulang Tahun Jemaat</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'permohonan'}
              onClick={() => switchTab('permohonan')}
              style={
                activeTab === 'permohonan'
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-sm sm:text-[15px] font-semibold border transition-colors cursor-pointer ${
                activeTab === 'permohonan'
                  ? 'text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FilePlus2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Permohonan Perubahan Data &amp; Cek Status</span>
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {activeTab === 'statistik' ? (
          <PublicJemaatStatsSection
            stats={stats}
            loading={loadingStats}
            primaryColor={primaryColor}
            accentColor={accentColor}
            onOpenRequestForm={() => switchTab('permohonan')}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* KOLOM KIRI: FORMULIR PENGAJUAN */}
            <div className="lg:col-span-7 min-w-0">
              <div className="surface-card p-5 sm:p-6">
                <div className="mb-5">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0f172a] mb-1">
                    Formulir Pengajuan Pembaruan Data Jemaat
                  </h2>
                  <p className="text-[15px] text-slate-600 leading-relaxed">
                    Alur verifikasi berjenjang: pengajuan diteruskan ke Sintua Wijk untuk divalidasi lalu diterapkan oleh Sekretaris / Admin ke Database Induk Jemaat.
                  </p>
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-800"
                  >
                    {formError}
                  </div>
                )}

                {submitSuccessCode && (
                  <div
                    role="status"
                    className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-[15px] text-emerald-900 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        Permohonan berhasil dikirim dengan ID:{' '}
                        <span className="font-mono-num underline">{submitSuccessCode}</span>
                      </p>
                      <p className="text-sm text-emerald-800 mt-0.5">
                        Simpan ID Pengajuan atau Nomor KK Anda untuk memantau progres di panel Cek Status Permohonan.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitPermohonan} noValidate className="space-y-5">
                  {/* Jenis Permohonan & Wijk */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="reqJenis"
                        className="block text-sm font-semibold text-[#0f172a] mb-1.5"
                      >
                        Jenis Permohonan <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="reqJenis"
                        value={jenisPermohonan}
                        onChange={(e) => {
                          setJenisPermohonan(e.target.value as PermohonanJenis);
                          setFormError('');
                        }}
                        className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                      >
                        <option value="Tambah Anggota/Anak Lahir">
                          Tambah Anggota / Anak Lahir
                        </option>
                        <option value="Perbaikan Biodata">
                          Perbaikan Biodata (Multi-Perubahan)
                        </option>
                        <option value="Pindah/Mutasi">Pindah / Mutasi</option>
                        <option value="Meninggal">Meninggal</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="reqWijk"
                        className="block text-sm font-semibold text-[#0f172a] mb-1.5"
                      >
                        Wijk / Lingkungan <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="reqWijk"
                        value={wijkId}
                        onChange={(e) => setWijkId(e.target.value)}
                        className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                      >
                        <option value="">-- Pilih Wijk / Lingkungan --</option>
                        {wijkList.map((w) => (
                          <option key={w.id} value={w.id}>
                            Wijk {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Identitas Keluarga (Khusus Tambah Anggota / Anak Lahir) */}
                  {isTambahMode ? (
                    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 space-y-3">
                      <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-600">
                        Identitas Keluarga
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="reqNamaSuami"
                            className="block text-sm font-semibold text-[#0f172a] mb-1"
                          >
                            Nama Suami / Kepala Keluarga <span className="text-red-600">*</span>
                          </label>
                          <input
                            id="reqNamaSuami"
                            type="text"
                            value={namaSuami}
                            onChange={(e) => setNamaSuami(e.target.value)}
                            placeholder="Nama lengkap suami"
                            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="reqNamaIstri"
                            className="block text-sm font-semibold text-[#0f172a] mb-1"
                          >
                            Nama Istri
                          </label>
                          <input
                            id="reqNamaIstri"
                            type="text"
                            value={namaIstri}
                            onChange={(e) => setNamaIstri(e.target.value)}
                            placeholder="Nama lengkap istri"
                            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="reqEmail"
                            className="block text-sm font-semibold text-[#0f172a] mb-1"
                          >
                            Email
                          </label>
                          <input
                            id="reqEmail"
                            type="email"
                            value={emailPemohon}
                            onChange={(e) => setEmailPemohon(e.target.value)}
                            placeholder="nama@email.com (opsional)"
                            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="reqAlamat"
                            className="block text-sm font-semibold text-[#0f172a] mb-1"
                          >
                            Alamat <span className="text-red-600">*</span>
                          </label>
                          <input
                            id="reqAlamat"
                            type="text"
                            value={alamatPemohon}
                            onChange={(e) => setAlamatPemohon(e.target.value)}
                            placeholder="Alamat lengkap tempat tinggal"
                            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="reqNamaPemohonUmum"
                        className="block text-sm font-semibold text-[#0f172a] mb-1.5"
                      >
                        Nama Pemohon / Kepala Keluarga <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="reqNamaPemohonUmum"
                        type="text"
                        value={namaPemohonUmum}
                        onChange={(e) => setNamaPemohonUmum(e.target.value)}
                        placeholder="Nama lengkap kepala keluarga / pemohon"
                        className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                      />
                    </div>
                  )}

                  {/* Field Verifikasi Umum */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="reqNoReg"
                        className="block text-sm font-semibold text-[#0f172a] mb-1.5"
                      >
                        No. KK / No. Registrasi <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="reqNoReg"
                        type="text"
                        value={noRegistrasi}
                        onChange={(e) => setNoRegistrasi(e.target.value)}
                        placeholder="REG-001 / No. KK"
                        className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg font-mono-num text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reqVerif"
                        className="block text-sm font-semibold text-[#0f172a] mb-1.5"
                      >
                        Tgl Lahir / NIK Verifikasi <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="reqVerif"
                        type="text"
                        value={verifikasiIdentitas}
                        onChange={(e) => setVerifikasiIdentitas(e.target.value)}
                        placeholder="YYYY-MM-DD / 6 digit NIK"
                        className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reqHp"
                        className="block text-sm font-semibold text-[#0f172a] mb-1.5"
                      >
                        HP / WhatsApp Aktif <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="reqHp"
                        type="tel"
                        value={noHpPemohon}
                        onChange={(e) => setNoHpPemohon(e.target.value)}
                        placeholder="0813xxxxxxxx"
                        className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg font-mono-num text-base sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Multi-Baris Daftar Anggota (Tambah Anggota / Anak Lahir) */}
                  {isTambahMode && (
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-600">
                            Daftar Anggota Keluarga
                          </p>
                          <p className="text-xs text-slate-600">
                            Dapat menambahkan lebih dari 1 anak / anggota dalam satu pengajuan.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAnggotaRows((prev) => [...prev, createEmptyAnggotaRow()])
                          }
                          className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-[#0f294a] rounded-lg cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Anak / Anggota</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {anggotaRows.map((row, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong
                                className="text-sm font-bold"
                                style={{ color: primaryColor }}
                              >
                                Anggota #{idx + 1}
                              </strong>
                              {anggotaRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAnggotaRows((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  className="inline-flex items-center gap-1 min-h-[36px] px-2 text-xs font-semibold text-red-700 hover:underline cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Nama Anak / Anggota <span className="text-red-600">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={row.nama_lengkap}
                                  onChange={(e) =>
                                    updateAnggotaRow(idx, { nama_lengkap: e.target.value })
                                  }
                                  placeholder="Nama lengkap"
                                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Tempat Lahir
                                </label>
                                <input
                                  type="text"
                                  value={row.tempat_lahir}
                                  onChange={(e) =>
                                    updateAnggotaRow(idx, { tempat_lahir: e.target.value })
                                  }
                                  placeholder="Contoh: Sidikalang"
                                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Tanggal Lahir <span className="text-red-600">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={row.tanggal_lahir}
                                  onChange={(e) =>
                                    updateAnggotaRow(idx, { tanggal_lahir: e.target.value })
                                  }
                                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Jenis Kelamin
                                </label>
                                <select
                                  value={row.jenis_kelamin}
                                  onChange={(e) =>
                                    updateAnggotaRow(idx, {
                                      jenis_kelamin: e.target.value as 'L' | 'P',
                                    })
                                  }
                                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                                >
                                  <option value="L">Laki-laki</option>
                                  <option value="P">Perempuan</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Hubungan Keluarga
                                </label>
                                <select
                                  value={row.status_keluarga}
                                  onChange={(e) =>
                                    updateAnggotaRow(idx, {
                                      status_keluarga: e.target.value as
                                        | 'Anak'
                                        | 'Ama/Suami'
                                        | 'Ina/Istri',
                                    })
                                  }
                                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                                >
                                  <option value="Anak">Anak</option>
                                  <option value="Ama/Suami">Ama/Suami</option>
                                  <option value="Ina/Istri">Ina/Istri</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Kelengkapan Administrasi (Opsional) */}
                      <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-600">
                            Kelengkapan Administrasi (Opsional)
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Lampirkan pindaian PDF / foto dokumen pendukung (maks. 8 MB per berkas) untuk mempercepat verifikasi Sintua Wijk.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {DOC_INPUT_ITEMS.map((doc) => {
                            const attached = attachments[doc.key];
                            return (
                              <div key={doc.key} className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  {doc.label}
                                </label>
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  onChange={(e) => void handleAttachmentChange(doc.key, e)}
                                  className="block w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
                                />
                                {attached && (
                                  <div className="flex items-center justify-between gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                                    <span className="truncate flex items-center gap-1">
                                      <Paperclip className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{attached.fileName}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeAttachment(doc.key)}
                                      className="text-red-700 font-semibold hover:underline shrink-0 cursor-pointer"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Multi-Baris Daftar Data Diubah (Perbaikan Biodata) */}
                  {isPerbaikanMode && (
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] font-semibold text-slate-600">
                            Daftar Data yang Hendak Diubah
                          </p>
                          <p className="text-xs text-slate-600">
                            Pilih kolom yang salah, tuliskan data lama serta data yang benar.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPerubahanRows((prev) => [...prev, createEmptyPerubahanRow()])
                          }
                          className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-[#0f294a] rounded-lg cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Perubahan</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {perubahanRows.map((row, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong
                                className="text-sm font-bold"
                                style={{ color: primaryColor }}
                              >
                                Perubahan #{idx + 1}
                              </strong>
                              {perubahanRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPerubahanRows((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  className="inline-flex items-center gap-1 min-h-[36px] px-2 text-xs font-semibold text-red-700 hover:underline cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Data yang Hendak Diubah <span className="text-red-600">*</span>
                                </label>
                                <select
                                  value={row.field}
                                  onChange={(e) => {
                                    const nextField = e.target
                                      .value as PermohonanEditableFieldKey;
                                    const meta = PERUBAHAN_FIELD_OPTIONS.find(
                                      (o) => o.key === nextField
                                    );
                                    updatePerubahanRow(idx, {
                                      field: nextField,
                                      field_label: meta?.label || nextField,
                                      data_benar: '',
                                    });
                                  }}
                                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                                >
                                  {PERUBAHAN_FIELD_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.key}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Nama Anggota (Opsional)
                                </label>
                                <input
                                  type="text"
                                  value={row.nama_anggota}
                                  onChange={(e) =>
                                    updatePerubahanRow(idx, {
                                      nama_anggota: e.target.value,
                                    })
                                  }
                                  placeholder="Jika khusus 1 anggota dalam KK"
                                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-red-700 mb-1">
                                  Data Lama (Salah) <span className="text-red-600">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={row.data_lama}
                                  onChange={(e) =>
                                    updatePerubahanRow(idx, { data_lama: e.target.value })
                                  }
                                  placeholder="Tuliskan data saat ini"
                                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-emerald-700 mb-1">
                                  Data yang Benar <span className="text-red-600">*</span>
                                </label>
                                {renderDataBenarInput(row, idx)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Catatan Tambahan / Rincian Perubahan */}
                  <div>
                    <label
                      htmlFor="reqDetail"
                      className="block text-sm font-semibold text-[#0f172a] mb-1.5"
                    >
                      {isTambahMode || isPerbaikanMode ? (
                        'Catatan Tambahan (Opsional)'
                      ) : (
                        <>
                          Rincian Perubahan Data <span className="text-red-600">*</span>
                        </>
                      )}
                    </label>
                    <textarea
                      id="reqDetail"
                      rows={3}
                      value={detailManual}
                      onChange={(e) => setDetailManual(e.target.value)}
                      placeholder={
                        isTambahMode || isPerbaikanMode
                          ? 'Tuliskan keterangan tambahan bila diperlukan...'
                          : 'Jelaskan nama anggota, tanggal kejadian/mutasi, atau gereja tujuan...'
                      }
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{ backgroundColor: primaryColor }}
                      className="btn-navy inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 text-[15px] rounded-lg w-full sm:w-auto disabled:opacity-60 cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>
                        {submitting ? 'Mengirim Permohonan...' : 'Kirim Permohonan Update'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* KOLOM KANAN: CEK STATUS PERMOHONAN */}
            <div className="lg:col-span-5 min-w-0">
              <div className="surface-card p-5 sm:p-6">
                <h2 className="font-display text-xl font-bold text-[#0f172a] mb-1.5">
                  Cek Status Permohonan
                </h2>
                <p className="text-[15px] text-slate-600 leading-relaxed mb-4">
                  Masukkan Nomor Registrasi / No. KK atau ID Pengajuan (contoh:{' '}
                  <code className="font-mono-num bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                    REQ-2026-001
                  </code>
                  ) untuk memantau progres verifikasi Sintua &amp; Admin.
                </p>

                <form
                  onSubmit={handleLookupSubmit}
                  className="flex flex-col sm:flex-row gap-2 mb-5"
                >
                  <label htmlFor="inputCekStatus" className="sr-only">
                    No. KK atau ID Pengajuan
                  </label>
                  <input
                    id="inputCekStatus"
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="No. KK atau ID Pengajuan..."
                    className="flex-1 min-h-[44px] px-3.5 bg-white border border-slate-300 rounded-lg font-mono-num text-base sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    style={{ backgroundColor: accentColor }}
                    className="btn-gold inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap cursor-pointer disabled:opacity-60"
                  >
                    <Search className="w-4 h-4" />
                    <span>{lookupLoading ? 'Mencari...' : 'Cek Status'}</span>
                  </button>
                </form>

                {lookupError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 mb-3">
                    {lookupError}
                  </div>
                )}

                {!lookupSearched ? (
                  <p className="text-[15px] text-slate-600">
                    Hasil pelacakan permohonan akan tampil di sini.
                  </p>
                ) : lookupLoading ? (
                  <p className="text-[15px] text-slate-600">Memeriksa data permohonan...</p>
                ) : lookupResults.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Data permohonan tidak ditemukan untuk &ldquo;{lookupQuery.trim()}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lookupResults.map((p) => {
                      const statusInfo =
                        PERMOHONAN_STATUS_META[p.status_verifikasi] ||
                        PERMOHONAN_STATUS_META.menunggu_sintua;
                      const statusColor =
                        statusInfo.tone === 'green'
                          ? 'text-emerald-700'
                          : statusInfo.tone === 'red'
                            ? 'text-red-700'
                            : statusInfo.tone === 'blue'
                              ? 'text-[#0f294a]'
                              : 'text-amber-700';

                      return (
                        <div
                          key={p.id}
                          className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-mono-num font-bold text-[#0f172a]">
                              {p.request_code}
                            </span>
                            <span className={`font-bold ${statusColor}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="text-sm font-semibold text-[#0f172a]">
                            {p.jenis_permohonan} &middot; Wijk {p.wijk_name}
                          </div>

                          {/* Daftar Anggota Diajukan */}
                          {Array.isArray(p.daftar_anggota) && p.daftar_anggota.length > 0 && (
                            <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                                    <th className="p-2 font-semibold">Nama Anggota</th>
                                    <th className="p-2 font-semibold">Hubungan</th>
                                    <th className="p-2 font-semibold">Tgl Lahir</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {p.daftar_anggota.map((a, i) => (
                                    <tr key={i}>
                                      <td className="p-2 font-medium">{a.nama_lengkap}</td>
                                      <td className="p-2">{a.status_keluarga}</td>
                                      <td className="p-2 font-mono-num">{a.tanggal_lahir || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Daftar Perubahan Diajukan */}
                          {Array.isArray(p.daftar_perubahan) && p.daftar_perubahan.length > 0 && (
                            <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                                    <th className="p-2 font-semibold">Data</th>
                                    <th className="p-2 font-semibold">Lama</th>
                                    <th className="p-2 font-semibold">Baru</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {p.daftar_perubahan.map((c, i) => (
                                    <tr key={i}>
                                      <td className="p-2 font-medium">
                                        {c.field_label || c.field}
                                      </td>
                                      <td className="p-2 text-red-700 line-through">
                                        {c.data_lama}
                                      </td>
                                      <td className="p-2 text-emerald-700 font-semibold">
                                        {c.data_benar}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {p.detail_perubahan && (
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {p.detail_perubahan}
                            </p>
                          )}

                          {p.catatan_sintua && (
                            <p className="text-xs text-emerald-800">
                              <strong>Catatan Sintua:</strong> {p.catatan_sintua}
                            </p>
                          )}

                          {p.catatan_admin && (
                            <p className="text-xs text-[#0f294a]">
                              <strong>Catatan Admin:</strong> {p.catatan_admin}
                            </p>
                          )}

                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono-num">
                            <span>
                              Diajukan:{' '}
                              {new Intl.DateTimeFormat('id-ID', {
                                dateStyle: 'medium',
                              }).format(new Date(p.created_at))}
                            </span>
                            <span>Alur: Sintua Wijk &rarr; Sekretariat</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
