import { isSupabaseConfigured, supabase } from './supabase';
import { DEFAULT_WIJK } from './publicData';
import type {
  JemaatRecord,
  PermohonanAttachmentMeta,
  PermohonanEditableFieldKey,
  PermohonanJenis,
  PermohonanPerubahanField,
  PermohonanPerubahanRecord,
  PermohonanPublicStatusRecord,
  PermohonanStatus,
  PermohonanAnggotaDraft,
  PublicJemaatStats,
  Wijk,
} from '../types/cms';

export interface PerubahanFieldMeta {
  key: PermohonanEditableFieldKey;
  label: string;
  inputType: 'text' | 'date' | 'select';
  options?: string[];
}

export const PERUBAHAN_FIELD_OPTIONS: PerubahanFieldMeta[] = [
  { key: 'full_name', label: 'Nama Lengkap', inputType: 'text' },
  { key: 'no_registrasi', label: 'No. Registrasi / No. KK', inputType: 'text' },
  {
    key: 'family_role',
    label: 'Hubungan / Peran Keluarga',
    inputType: 'select',
    options: ['Kepala Keluarga', 'Ama/Suami', 'Istri', 'Ina/Istri', 'Anak', 'Anggota Keluarga'],
  },
  {
    key: 'gender',
    label: 'Jenis Kelamin',
    inputType: 'select',
    options: ['Laki-laki', 'Perempuan'],
  },
  { key: 'birth_place', label: 'Tempat Lahir', inputType: 'text' },
  { key: 'birth_date', label: 'Tanggal Lahir', inputType: 'date' },
  { key: 'wijk_id', label: 'Wijk / Lingkungan', inputType: 'select' },
  { key: 'address', label: 'Alamat', inputType: 'text' },
  { key: 'phone', label: 'No. HP / WhatsApp', inputType: 'text' },
  { key: 'baptism_date', label: 'Tanggal Baptis', inputType: 'date' },
  { key: 'sidi_date', label: 'Tanggal Sidi / Malua', inputType: 'date' },
  { key: 'marriage_date', label: 'Tanggal Menikah', inputType: 'date' },
  {
    key: 'status_keanggotaan',
    label: 'Status Keanggotaan',
    inputType: 'select',
    options: ['Aktif', 'Pindah', 'Meninggal', 'Nonaktif'],
  },
];

export const KELENGKAPAN_LABELS: Record<string, string> = {
  surat_keterangan_gereja: 'Surat Keterangan Gereja',
  akte_pernikahan: 'Akte Pernikahan',
  akte_baptis: 'Akte Baptis',
  akte_sidi: 'Akte Sidi',
  surat_pengantar_sintua_wijk: 'Surat Pengantar Sintua Wijk',
};

export const PERMOHONAN_STATUS_META: Record<
  PermohonanStatus,
  { label: string; tone: 'amber' | 'blue' | 'green' | 'red' }
> = {
  menunggu_sintua: { label: 'Menunggu Verifikasi Sintua', tone: 'amber' },
  terverifikasi_sintua: { label: 'Terverifikasi Sintua', tone: 'blue' },
  disetujui: { label: 'Disetujui Admin', tone: 'green' },
  ditolak: { label: 'Ditolak', tone: 'red' },
};

const SUPABASE_REQUIRED_ERROR =
  'Penyimpanan lokal dinonaktifkan. Hubungkan Supabase (VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY) untuk menyimpan dan mengakses data jemaat.';

export function isMigration003Error(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('permohonan_perubahan_jemaat') ||
    m.includes('get_public_jemaat_statistics') ||
    m.includes('submit_permohonan_perubahan') ||
    m.includes('lookup_permohonan_status') ||
    m.includes('could not find the function') ||
    m.includes('does not exist')
  );
}

export function computeJemaatStatistics(
  records: JemaatRecord[],
  wijkList: Wijk[] = DEFAULT_WIJK
): PublicJemaatStats {
  const active = records.filter((r) => r.status_keanggotaan === 'aktif');
  const kkSet = new Set(
    active
      .map((r) => (r.no_registrasi || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let sekolahMinggu = 0;
  let remajaNhkbp = 0;
  let punguanAma = 0;
  let punguanIna = 0;
  let lansia = 0;
  let sudahBaptis = 0;
  let sudahSidi = 0;
  let sudahMenikah = 0;

  const birthdays: PublicJemaatStats['ulang_tahun_minggu_ini'] = [];

  for (const j of active) {
    const role = (j.family_role || '').trim().toLowerCase();
    const isParentRole =
      role.includes('kepala keluarga') ||
      role.includes('ama') ||
      role.includes('suami') ||
      role.includes('ina') ||
      role.includes('istri');

    if (role.includes('ama') || role.includes('suami') || role.includes('kepala keluarga')) {
      punguanAma++;
    }
    if (role.includes('ina') || role.includes('istri')) {
      punguanIna++;
    }
    if (j.baptism_date) sudahBaptis++;
    if (j.sidi_date) sudahSidi++;
    if (j.marriage_date) sudahMenikah++;

    if (j.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(j.birth_date)) {
      const [y, m, d] = j.birth_date.split('-').map(Number);
      let age = today.getFullYear() - y;
      const monthDiff = today.getMonth() + 1 - m;
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
        age--;
      }

      if (!isParentRole && age >= 0) {
        if (age <= 12) sekolahMinggu++;
        else if (age <= 25) remajaNhkbp++;
      }
      if (age >= 60) lansia++;

      let nextBday = new Date(today.getFullYear(), m - 1, d);
      if (nextBday < today) {
        nextBday = new Date(today.getFullYear() + 1, m - 1, d);
      }
      const diffDays = Math.round((nextBday.getTime() - today.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays <= 6) {
        const wijkName =
          j.wijk?.name ||
          wijkList.find((w) => w.id === j.wijk_id)?.name ||
          '-';
        birthdays.push({
          id: j.id,
          full_name: j.full_name,
          wijk_name: wijkName,
          birth_date: j.birth_date,
          usia_baru: nextBday.getFullYear() - y,
          hari_lagi: diffDays,
        });
      }
    }
  }

  birthdays.sort((a, b) => a.hari_lagi - b.hari_lagi || a.full_name.localeCompare(b.full_name));

  const perWijk = wijkList.map((w) => {
    const members = active.filter((j) => j.wijk_id === w.id);
    const wKk = new Set(
      members.map((m) => (m.no_registrasi || '').trim().toLowerCase()).filter(Boolean)
    ).size;
    return {
      id: w.id,
      name: w.name,
      jiwa: members.length,
      kk: wKk,
      persentase: active.length > 0 ? Number(((members.length / active.length) * 100).toFixed(1)) : 0,
    };
  });

  return {
    total_jiwa: active.length,
    total_kk: kkSet.size,
    per_wijk: perWijk,
    kategorial: {
      sekolah_minggu: sekolahMinggu,
      remaja_nhkbp: remajaNhkbp,
      punguan_ama: punguanAma,
      punguan_ina: punguanIna,
      lansia,
      sudah_baptis: sudahBaptis,
      sudah_sidi: sudahSidi,
      sudah_menikah: sudahMenikah,
    },
    ulang_tahun_minggu_ini: birthdays,
  };
}

export function createEmptyPublicStats(wijkList: Wijk[] = DEFAULT_WIJK): PublicJemaatStats {
  return computeJemaatStatistics([], wijkList);
}

export async function fetchPublicJemaatStats(
  wijkList: Wijk[] = DEFAULT_WIJK
): Promise<{ stats: PublicJemaatStats; migrationMissing?: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    return { stats: createEmptyPublicStats(wijkList) };
  }

  const { data, error } = await supabase.rpc('get_public_jemaat_statistics');
  if (error) {
    return {
      stats: createEmptyPublicStats(wijkList),
      migrationMissing: isMigration003Error(error.message),
    };
  }

  const raw = (data || {}) as Partial<PublicJemaatStats>;
  const empty = createEmptyPublicStats(wijkList);
  return {
    stats: {
      total_jiwa: Number(raw.total_jiwa ?? 0),
      total_kk: Number(raw.total_kk ?? 0),
      per_wijk:
        Array.isArray(raw.per_wijk) && raw.per_wijk.length > 0
          ? raw.per_wijk
          : empty.per_wijk,
      kategorial: {
        ...empty.kategorial,
        ...(raw.kategorial || {}),
      },
      ulang_tahun_minggu_ini: Array.isArray(raw.ulang_tahun_minggu_ini)
        ? raw.ulang_tahun_minggu_ini
        : [],
    },
  };
}

export async function prepareAttachmentMeta(
  file: File
): Promise<{ meta: PermohonanAttachmentMeta | null; error: string | null }> {
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { meta: null, error: `Ukuran berkas "${file.name}" melebihi batas 8 MB.` };
  }

  const isPdf = file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');
  if (!isPdf && !isImage) {
    return { meta: null, error: `Format berkas "${file.name}" harus PDF atau gambar.` };
  }

  const meta: PermohonanAttachmentMeta = {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };

  if (isImage && file.size <= 300 * 1024) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
        reader.readAsDataURL(file);
      });
      if (dataUrl && dataUrl.length <= 420_000) {
        meta.previewDataUrl = dataUrl;
      }
    } catch {
      // Non-fatal: keep file metadata without inline preview
    }
  }

  return { meta, error: null };
}

export interface SubmitPermohonanInput {
  jenis_permohonan: PermohonanJenis;
  wijk_id: string | null;
  wijk_name: string;
  no_registrasi: string;
  nama_pemohon: string;
  nama_suami?: string;
  nama_istri?: string;
  email_pemohon?: string;
  alamat_pemohon?: string;
  no_hp_pemohon: string;
  verifikasi_identitas: string;
  daftar_anggota?: PermohonanAnggotaDraft[];
  daftar_perubahan?: PermohonanPerubahanField[];
  kelengkapan_dokumen?: Record<string, PermohonanAttachmentMeta>;
  detail_perubahan: string;
}

export async function submitPermohonanPerubahan(
  input: SubmitPermohonanInput
): Promise<{
  data: PermohonanPublicStatusRecord | null;
  error: string | null;
  migrationMissing?: boolean;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: SUPABASE_REQUIRED_ERROR };
  }

  const { data, error } = await supabase.rpc('submit_permohonan_perubahan', {
    p_payload: input,
  });

  if (error) {
    return {
      data: null,
      error: isMigration003Error(error.message)
        ? 'Modul permohonan database belum diaktifkan. Hubungi Sekretaris/Admin untuk menjalankan migrasi SQL 003.'
        : error.message,
      migrationMissing: isMigration003Error(error.message),
    };
  }

  return { data: data as PermohonanPublicStatusRecord, error: null };
}

export async function lookupPermohonanStatus(
  query: string
): Promise<{
  items: PermohonanPublicStatusRecord[];
  error: string | null;
  migrationMissing?: boolean;
}> {
  const clean = query.trim();
  if (clean.length < 4) {
    return {
      items: [],
      error: 'Masukkan minimal 4 karakter No. Registrasi / No. KK atau ID Pengajuan.',
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return { items: [], error: SUPABASE_REQUIRED_ERROR };
  }

  const { data, error } = await supabase.rpc('lookup_permohonan_status', {
    p_query: clean,
  });

  if (error) {
    return {
      items: [],
      error: isMigration003Error(error.message)
        ? 'Fitur cek status memerlukan aktivasi migrasi SQL 003 oleh Administrator.'
        : error.message,
      migrationMissing: isMigration003Error(error.message),
    };
  }

  return {
    items: Array.isArray(data) ? (data as PermohonanPublicStatusRecord[]) : [],
    error: null,
  };
}

export async function fetchAdminPermohonan(): Promise<{
  items: PermohonanPerubahanRecord[];
  error: string | null;
  migrationMissing?: boolean;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { items: [], error: SUPABASE_REQUIRED_ERROR };
  }

  const { data, error } = await supabase
    .from('permohonan_perubahan_jemaat')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return {
      items: [],
      error: error.message,
      migrationMissing: isMigration003Error(error.message),
    };
  }

  return {
    items: (data as PermohonanPerubahanRecord[]) || [],
    error: null,
  };
}

export async function verifySintuaPermohonan(
  id: string,
  valid: boolean,
  catatanSintua: string,
  verifiedBy: string | null
): Promise<{ error: string | null }> {
  const nextStatus: PermohonanStatus = valid ? 'terverifikasi_sintua' : 'ditolak';

  if (!isSupabaseConfigured || !supabase) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const { error } = await supabase
    .from('permohonan_perubahan_jemaat')
    .update({
      status_verifikasi: nextStatus,
      catatan_sintua: catatanSintua.trim(),
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
    })
    .eq('id', id);

  return { error: error ? error.message : null };
}

function mapFieldValueForJemaat(
  field: PermohonanEditableFieldKey,
  rawValue: string,
  wijkList: Wijk[]
): Record<string, unknown> {
  const val = rawValue.trim();
  if (field === 'gender') {
    const up = val.toUpperCase();
    return {
      gender: up === 'P' || up.startsWith('PEREMPUAN') ? 'P' : 'L',
    };
  }
  if (field === 'wijk_id') {
    const cleanWijk = val.replace(/^wijk\s+/i, '').trim().toLowerCase();
    const found = wijkList.find(
      (w) => w.id === val || w.name.toLowerCase() === cleanWijk
    );
    return { wijk_id: found ? found.id : null };
  }
  if (field === 'status_keanggotaan') {
    const lower = val.toLowerCase();
    const mapped: JemaatRecord['status_keanggotaan'] = lower.includes('pindah')
      ? 'pindah'
      : lower.includes('meninggal')
        ? 'meninggal'
        : lower.includes('nonaktif')
          ? 'nonaktif'
          : 'aktif';
    return {
      status_keanggotaan: mapped,
      is_active: mapped === 'aktif',
    };
  }
  if (
    field === 'birth_date' ||
    field === 'baptism_date' ||
    field === 'sidi_date' ||
    field === 'marriage_date'
  ) {
    return { [field]: val || null };
  }
  return { [field]: val };
}

export async function finalizePermohonanAndSync(
  permohonan: PermohonanPerubahanRecord,
  approve: boolean,
  catatanAdmin: string,
  approvedBy: string | null,
  wijkList: Wijk[]
): Promise<{ appliedNote: string; error: string | null }> {
  const nextStatus: PermohonanStatus = approve ? 'disetujui' : 'ditolak';
  const defaultNote = approve
    ? 'Disetujui dan diterapkan ke Database Induk Jemaat.'
    : 'Ditolak oleh Admin / Sekretaris Huria.';
  const finalNote = catatanAdmin.trim() || defaultNote;

  let appliedCount = 0;

  if (!isSupabaseConfigured || !supabase) {
    return { appliedNote: '', error: SUPABASE_REQUIRED_ERROR };
  }

  // Supabase execution
  if (approve) {
    if (permohonan.jenis_permohonan === 'Tambah Anggota/Anak Lahir') {
      const anggota =
        Array.isArray(permohonan.daftar_anggota) && permohonan.daftar_anggota.length > 0
          ? permohonan.daftar_anggota
          : [
              {
                nama_lengkap: permohonan.nama_pemohon,
                tempat_lahir: '',
                tanggal_lahir: '',
                jenis_kelamin: 'L' as const,
                status_keluarga: 'Anak' as const,
              },
            ];

      const inserts = anggota.map((m) => ({
        no_registrasi: permohonan.no_registrasi.trim(),
        full_name: m.nama_lengkap.trim(),
        gender: m.jenis_kelamin === 'P' ? 'P' : 'L',
        birth_place: (m.tempat_lahir || '').trim(),
        birth_date: m.tanggal_lahir || null,
        wijk_id: permohonan.wijk_id || null,
        family_role: m.status_keluarga || 'Anak',
        phone: (permohonan.no_hp_pemohon || '').trim(),
        address: (permohonan.alamat_pemohon || '').trim(),
        notes: `Ditambahkan dari permohonan ${permohonan.request_code}`,
        status_keanggotaan: 'aktif',
        is_active: true,
      }));

      const { error: insErr } = await supabase.from('jemaat').insert(inserts);
      if (insErr) return { appliedNote: '', error: insErr.message };
      appliedCount = inserts.length;
    } else if (
      permohonan.jenis_permohonan === 'Perbaikan Biodata' &&
      Array.isArray(permohonan.daftar_perubahan) &&
      permohonan.daftar_perubahan.length > 0
    ) {
      const { data: famData, error: famErr } = await supabase
        .from('jemaat')
        .select('*')
        .ilike('no_registrasi', permohonan.no_registrasi.trim());

      if (famErr) return { appliedNote: '', error: famErr.message };
      const family = (famData as JemaatRecord[]) || [];

      for (const ch of permohonan.daftar_perubahan) {
        let targets = ch.nama_anggota
          ? family.filter((j) =>
              j.full_name.toLowerCase().includes(ch.nama_anggota.toLowerCase())
            )
          : [];
        if (
          targets.length === 0 &&
          (ch.field === 'address' || ch.field === 'wijk_id' || ch.field === 'no_registrasi')
        ) {
          targets = family;
        }
        if (targets.length === 0 && family.length > 0) {
          targets = [family[0]];
        }
        const patch = mapFieldValueForJemaat(ch.field, ch.data_benar, wijkList);
        for (const t of targets) {
          const { error: updErr } = await supabase
            .from('jemaat')
            .update(patch)
            .eq('id', t.id);
          if (updErr) return { appliedNote: '', error: updErr.message };
          appliedCount++;
        }
      }
    } else if (
      permohonan.jenis_permohonan === 'Pindah/Mutasi' ||
      permohonan.jenis_permohonan === 'Meninggal'
    ) {
      const nextMemberStatus: JemaatRecord['status_keanggotaan'] =
        permohonan.jenis_permohonan === 'Pindah/Mutasi' ? 'pindah' : 'meninggal';
      const { data: famData } = await supabase
        .from('jemaat')
        .select('id, full_name')
        .ilike('no_registrasi', permohonan.no_registrasi.trim());

      const fam = (famData as Array<{ id: string; full_name: string }>) || [];
      const exactTargets = fam.filter((m) =>
        m.full_name.toLowerCase().includes(permohonan.nama_pemohon.trim().toLowerCase())
      );
      for (const t of exactTargets) {
        const { error: updErr } = await supabase
          .from('jemaat')
          .update({ status_keanggotaan: nextMemberStatus, is_active: false })
          .eq('id', t.id);
        if (updErr) return { appliedNote: '', error: updErr.message };
        appliedCount++;
      }
    }
  }

  const { error: reqErr } = await supabase
    .from('permohonan_perubahan_jemaat')
    .update({
      status_verifikasi: nextStatus,
      catatan_admin: finalNote,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', permohonan.id);

  if (reqErr) return { appliedNote: '', error: reqErr.message };

  return {
    appliedNote: approve
      ? appliedCount > 0
        ? `Disetujui & ${appliedCount} baris data jemaat otomatis diperbarui.`
        : 'Permohonan disetujui (perubahan manual dicatat bila nama anggota spesifik tidak ditemukan di No. Registrasi tersebut).'
      : 'Permohonan ditolak.',
    error: null,
  };
}
