import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Cake,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  HeartHandshake,
  Paperclip,
  Plus,
  Search,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { DEFAULT_WIJK, fetchPublicWijk } from '../../lib/publicData';
import {
  fetchAdminPermohonan,
  finalizePermohonanAndSync,
  KELENGKAPAN_LABELS,
  PERMOHONAN_STATUS_META,
  readPreviewJemaat,
  verifySintuaPermohonan,
  writePreviewJemaat,
} from '../../lib/jemaatData';
import type {
  JemaatRecord,
  PermohonanPerubahanRecord,
  PermohonanStatus,
  Wijk,
} from '../../types/cms';

export type JemaatTab =
  | 'list'
  | 'requests'
  | 'import'
  | 'birthdays'
  | 'anniversaries';

const MIGRATION_002_SQL = `-- Jalankan di Supabase SQL Editor (aman dijalankan berulang kali)
ALTER TABLE public.jemaat DROP CONSTRAINT IF EXISTS jemaat_no_induk_key;
DROP INDEX IF EXISTS public.jemaat_no_induk_key;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jemaat' AND column_name = 'no_induk'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jemaat' AND column_name = 'no_registrasi'
  ) THEN
    ALTER TABLE public.jemaat RENAME COLUMN no_induk TO no_registrasi;
  END IF;
END $$;

ALTER TABLE public.jemaat ADD COLUMN IF NOT EXISTS no_registrasi TEXT;
CREATE INDEX IF NOT EXISTS idx_jemaat_no_registrasi ON public.jemaat(no_registrasi);`;

const MIGRATION_003_HINT =
  'Jalankan file SQL supabase/migrations/003_permohonan_perubahan_jemaat.sql di Supabase -> SQL Editor untuk mengaktifkan tabel permohonan perubahan data & statistik publik.';

const normalizeHeaderKey = (key: string) =>
  key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const pickField = (row: Record<string, unknown>, aliases: string[]): string => {
  for (const alias of aliases) {
    if (
      row[alias] !== undefined &&
      row[alias] !== null &&
      String(row[alias]).trim() !== ''
    ) {
      return String(row[alias]).trim();
    }
  }
  const normalizedEntries = Object.entries(row).map(
    ([k, v]) => [normalizeHeaderKey(k), v] as const
  );
  for (const alias of aliases) {
    const target = normalizeHeaderKey(alias);
    const match = normalizedEntries.find(
      ([k, v]) =>
        k === target &&
        v !== undefined &&
        v !== null &&
        String(v).trim() !== ''
    );
    if (match) return String(match[1]).trim();
  }
  return '';
};

const normalizeRegValue = (raw: string): string | null => {
  const clean = raw.trim();
  if (!clean || clean === '-') return null;
  return clean;
};

const makeMemberKey = (noRegistrasi: string | null, fullName: string) =>
  `${(noRegistrasi || '').trim().toLowerCase()}||${fullName
    .trim()
    .toLowerCase()}`;

interface RequestModalState {
  permohonan: PermohonanPerubahanRecord;
  mode: 'verify_sintua' | 'approve_admin' | 'reject';
}

export function CongregationPage({ tab }: { tab: JemaatTab }) {
  const { profile } = useAuth();
  const { addNotice } = useAdmin();

  const [wijkList, setWijkList] = useState<Wijk[]>(DEFAULT_WIJK);
  const [jemaatList, setJemaatList] = useState<JemaatRecord[]>([]);
  const [permohonanList, setPermohonanList] = useState<PermohonanPerubahanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migration003Needed, setMigration003Needed] = useState(false);

  const [wijkFilter, setWijkFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'jiwa' | 'kk'>('jiwa');

  // Form Tambah / Edit Jemaat
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [noRegistrasi, setNoRegistrasi] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [marriageDate, setMarriageDate] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [sidiDate, setSidiDate] = useState('');
  const [wijkId, setWijkId] = useState('');
  const [familyRole, setFamilyRole] = useState('Kepala Keluarga');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [statusKeanggotaan, setStatusKeanggotaan] =
    useState<JemaatRecord['status_keanggotaan']>('aktif');

  // Permohonan Filter & Action Modal
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | PermohonanStatus>('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [actionModal, setActionModal] = useState<RequestModalState | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);

  // XLSX Import State
  const [importRows, setImportRows] = useState<Array<Record<string, unknown>>>([]);
  const [duplicatePolicy, setDuplicatePolicy] = useState<
    'skip_existing' | 'update_existing' | 'insert_all'
  >('skip_existing');
  const [importing, setImporting] = useState(false);
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);

  const normalizeExcelDate = (raw: unknown): string | null => {
    const val = String(raw ?? '').trim();
    if (!val || val === '-') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const dmy = val.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dmy) {
      const a = Number(dmy[1]);
      const b = Number(dmy[2]);
      let y = Number(dmy[3]);
      if (y < 100) y += y >= 30 ? 1900 : 2000;
      const day = a > 12 || b <= 12 ? a : b;
      const month = a > 12 || b <= 12 ? b : a;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${String(y).padStart(4, '0')}-${String(month).padStart(
          2,
          '0'
        )}-${String(day).padStart(2, '0')}`;
      }
    }
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return null;
  };

  const checkSchemaMismatch = (message: string) => {
    if (
      message.includes('no_registrasi') ||
      message.includes('jemaat_no_induk_key') ||
      message.includes('schema cache')
    ) {
      setMigrationNeeded(true);
      return true;
    }
    return false;
  };

  const loadPermohonan = async () => {
    setLoadingRequests(true);
    const { items, error, migrationMissing } = await fetchAdminPermohonan();
    setLoadingRequests(false);
    if (migrationMissing) {
      setMigration003Needed(true);
      return;
    }
    setMigration003Needed(false);
    if (error) {
      addNotice({ type: 'error', message: error });
    } else {
      setPermohonanList(items);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const wks = await fetchPublicWijk();
    setWijkList(wks);
    if (!wijkId && wks[0]) setWijkId(wks[0].id);

    if (!isSupabaseConfigured || !supabase) {
      setJemaatList(readPreviewJemaat());
      setLoading(false);
      await loadPermohonan();
      return;
    }

    const { data, error } = await supabase
      .from('jemaat')
      .select('*, wijk:wijk(id, name)')
      .order('full_name', { ascending: true });

    setLoading(false);
    if (error) {
      checkSchemaMismatch(error.message);
      addNotice({ type: 'error', message: error.message });
    } else {
      const rows = (data as Array<Record<string, unknown>>) || [];
      if (
        rows.length > 0 &&
        'no_induk' in rows[0] &&
        !('no_registrasi' in rows[0])
      ) {
        setMigrationNeeded(true);
      } else {
        setMigrationNeeded(false);
      }
      setJemaatList(rows as unknown as JemaatRecord[]);
    }

    await loadPermohonan();
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredList = useMemo(() => {
    return jemaatList.filter((j) => {
      if (wijkFilter !== 'all' && j.wijk_id !== wijkFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          j.full_name.toLowerCase().includes(q) ||
          (j.no_registrasi || '').toLowerCase().includes(q) ||
          j.family_role.toLowerCase().includes(q) ||
          j.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [jemaatList, wijkFilter, search]);

  const summaryStats = useMemo(() => {
    const aktif = jemaatList.filter((j) => j.status_keanggotaan === 'aktif');
    return {
      aktifCount: aktif.length,
      baptisCount: aktif.filter((j) => Boolean(j.baptism_date)).length,
      sidiCount: aktif.filter((j) => Boolean(j.sidi_date)).length,
      nikahCount: aktif.filter((j) => Boolean(j.marriage_date)).length,
    };
  }, [jemaatList]);

  const groupedByKk = useMemo(() => {
    const groups = new Map<string, JemaatRecord[]>();
    filteredList.forEach((m) => {
      const key = (m.no_registrasi || '').trim() || 'TANPA-NO-REG';
      const arr = groups.get(key) || [];
      arr.push(m);
      groups.set(key, arr);
    });
    return Array.from(groups.entries());
  }, [filteredList]);

  const distinctFamiliesCount = useMemo(() => {
    const set = new Set(
      filteredList
        .map((j) => (j.no_registrasi || '').trim().toLowerCase())
        .filter(Boolean)
    );
    return set.size;
  }, [filteredList]);

  const pendingRequestsCount = useMemo(
    () =>
      permohonanList.filter(
        (p) =>
          p.status_verifikasi === 'menunggu_sintua' ||
          p.status_verifikasi === 'terverifikasi_sintua'
      ).length,
    [permohonanList]
  );

  const filteredRequests = useMemo(() => {
    return permohonanList.filter((p) => {
      if (
        requestStatusFilter !== 'all' &&
        p.status_verifikasi !== requestStatusFilter
      ) {
        return false;
      }
      if (requestSearch.trim()) {
        const q = requestSearch.trim().toLowerCase();
        return (
          p.request_code.toLowerCase().includes(q) ||
          p.no_registrasi.toLowerCase().includes(q) ||
          p.nama_pemohon.toLowerCase().includes(q) ||
          p.wijk_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [permohonanList, requestStatusFilter, requestSearch]);

  const birthdaysByMonth = useMemo(() => {
    return jemaatList.filter((j) => {
      if (!j.birth_date || j.status_keanggotaan !== 'aktif') return false;
      const m = Number(String(j.birth_date).split('-')[1]);
      return m === monthFilter;
    });
  }, [jemaatList, monthFilter]);

  const anniversariesByMonth = useMemo(() => {
    return jemaatList.filter((j) => {
      if (!j.marriage_date || j.status_keanggotaan !== 'aktif') return false;
      const m = Number(String(j.marriage_date).split('-')[1]);
      return m === monthFilter;
    });
  }, [jemaatList, monthFilter]);

  const importStats = useMemo(() => {
    const existingMemberKeys = new Set(
      jemaatList.map((j) => makeMemberKey(j.no_registrasi, j.full_name))
    );
    const distinctRegs = new Set<string>();
    const seenInFile = new Set<string>();
    let validCount = 0;
    let existingMemberCount = 0;
    let inFileDuplicateMemberCount = 0;

    importRows.forEach((r) => {
      const name = pickField(r, ['full_name', 'nama_lengkap', 'nama', 'name']);
      if (!name) return;
      validCount++;
      const reg = normalizeRegValue(
        pickField(r, [
          'no_registrasi',
          'nomor_registrasi',
          'no_register',
          'no_reg',
          'no_induk',
          'no_kk',
        ])
      );
      if (reg) distinctRegs.add(reg.toLowerCase());

      const key = makeMemberKey(reg, name);
      if (seenInFile.has(key)) {
        inFileDuplicateMemberCount++;
      } else {
        seenInFile.add(key);
        if (existingMemberKeys.has(key)) existingMemberCount++;
      }
    });

    return {
      validCount,
      familyCount: distinctRegs.size,
      existingMemberCount,
      inFileDuplicateMemberCount,
    };
  }, [importRows, jemaatList]);

  const resetForm = () => {
    setEditId(null);
    setNoRegistrasi('');
    setFullName('');
    setGender('L');
    setBirthPlace('');
    setBirthDate('');
    setMarriageDate('');
    setBaptismDate('');
    setSidiDate('');
    setFamilyRole('Kepala Keluarga');
    setPhone('');
    setAddress('');
    setNotes('');
    setStatusKeanggotaan('aktif');
  };

  const openEditJemaat = (j: JemaatRecord) => {
    setEditId(j.id);
    setNoRegistrasi(j.no_registrasi || '');
    setFullName(j.full_name);
    setGender(j.gender || 'L');
    setBirthPlace(j.birth_place || '');
    setBirthDate(j.birth_date || '');
    setMarriageDate(j.marriage_date || '');
    setBaptismDate(j.baptism_date || '');
    setSidiDate(j.sidi_date || '');
    setWijkId(j.wijk_id || '');
    setFamilyRole(j.family_role);
    setPhone(j.phone);
    setAddress(j.address);
    setNotes(j.notes || '');
    setStatusKeanggotaan(j.status_keanggotaan);
    setShowForm(true);
  };

  const handleSaveJemaat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const payload = {
      no_registrasi: normalizeRegValue(noRegistrasi),
      full_name: fullName.trim(),
      gender,
      birth_place: birthPlace.trim(),
      birth_date: birthDate || null,
      marriage_date: marriageDate || null,
      baptism_date: baptismDate || null,
      sidi_date: sidiDate || null,
      wijk_id: wijkId || null,
      family_role: familyRole.trim() || 'Anggota Keluarga',
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      status_keanggotaan: statusKeanggotaan,
      is_active: statusKeanggotaan === 'aktif',
    };

    if (!isSupabaseConfigured || !supabase) {
      const wijkObj = wijkList.find((w) => w.id === payload.wijk_id) || null;
      const nowIso = new Date().toISOString();
      const existing = readPreviewJemaat();
      let nextRows: JemaatRecord[];
      if (editId) {
        nextRows = existing.map((row) =>
          row.id === editId
            ? {
                ...row,
                ...payload,
                updated_at: nowIso,
                wijk: wijkObj ? { id: wijkObj.id, name: wijkObj.name } : null,
              }
            : row
        );
      } else {
        const created: JemaatRecord = {
          id: `jmt-${Date.now()}`,
          family_head_id: null,
          created_at: nowIso,
          updated_at: nowIso,
          ...payload,
          wijk: wijkObj ? { id: wijkObj.id, name: wijkObj.name } : null,
        };
        nextRows = [created, ...existing];
      }
      writePreviewJemaat(nextRows);
      setJemaatList(nextRows);
      addNotice({ type: 'success', message: 'Data jemaat disimpan di mode pratinjau lokal.' });
      resetForm();
      setShowForm(false);
      return;
    }

    const { error } = editId
      ? await supabase.from('jemaat').update(payload).eq('id', editId)
      : await supabase.from('jemaat').insert(payload);

    if (error) {
      if (checkSchemaMismatch(error.message)) {
        addNotice({
          type: 'error',
          message:
            'Kolom database masih menggunakan no_induk unik. Jalankan SQL migrasi 002_jemaat_no_registrasi.sql pada kotak panduan di atas.',
        });
      } else {
        addNotice({ type: 'error', message: error.message });
      }
    } else {
      addNotice({ type: 'success', message: 'Data jemaat berhasil disimpan.' });
      resetForm();
      setShowForm(false);
      void loadData();
    }
  };

  const handleDeleteJemaat = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      const nextRows = readPreviewJemaat().filter((x) => x.id !== id);
      writePreviewJemaat(nextRows);
      setJemaatList(nextRows);
      addNotice({ type: 'success', message: 'Data jemaat dihapus dari pratinjau lokal.' });
      return;
    }

    const { error } = await supabase.from('jemaat').delete().eq('id', id);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setJemaatList((prev) => prev.filter((x) => x.id !== id));
      addNotice({ type: 'success', message: 'Data jemaat dihapus.' });
    }
  };

  const handleExportXlsx = () => {
    const source = filteredList.length > 0 ? filteredList : jemaatList;
    if (source.length === 0) {
      addNotice({ type: 'warning', message: 'Belum ada data jemaat untuk diekspor.' });
      return;
    }

    const rows = source.map((j) => ({
      no_registrasi: j.no_registrasi || '',
      full_name: j.full_name,
      family_role: j.family_role,
      gender: j.gender || '',
      birth_place: j.birth_place || '',
      birth_date: j.birth_date || '',
      wijk: j.wijk?.name || wijkList.find((w) => w.id === j.wijk_id)?.name || '',
      address: j.address || '',
      phone: j.phone || '',
      baptism_date: j.baptism_date || '',
      sidi_date: j.sidi_date || '',
      marriage_date: j.marriage_date || '',
      status_keanggotaan: j.status_keanggotaan,
      notes: j.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Jemaat');
    XLSX.writeFile(
      wb,
      `Data_Jemaat_HKBP_Hutaraja_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    addNotice({
      type: 'success',
      message: `Berhasil mengekspor ${source.length} data jemaat ke Excel (.xlsx).`,
    });
  };

  const handleDownloadTemplate = () => {
    const sample = [
      {
        no_registrasi: 'REG-001',
        full_name: 'St. Marusaha Lumbantobing',
        gender: 'L',
        wijk: 'Letare',
        birth_place: 'Sidikalang',
        birth_date: '1978-11-20',
        marriage_date: '2005-06-14',
        baptism_date: '1979-01-15',
        sidi_date: '1994-05-10',
        family_role: 'Kepala Keluarga',
        phone: '081260000011',
        address: 'Dusun I Hutaraja',
      },
      {
        no_registrasi: 'REG-001',
        full_name: 'Tiurma br. Siregar',
        gender: 'P',
        wijk: 'Letare',
        birth_place: 'Tarutung',
        birth_date: '1981-04-08',
        marriage_date: '2005-06-14',
        baptism_date: '1981-07-12',
        sidi_date: '1997-05-18',
        family_role: 'Istri',
        phone: '081260000012',
        address: 'Dusun I Hutaraja',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Jemaat');
    XLSX.writeFile(wb, 'Template_Import_Jemaat_HKBP_Hutaraja.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      raw: false,
    });
    setImportRows(rows);
    e.target.value = '';
  };

  const handleCommitImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);

    const wijkNameToId = new Map<string, string>();
    wijkList.forEach((w) => wijkNameToId.set(w.name.toLowerCase(), w.id));

    const existingMap = new Map<string, string>();
    jemaatList.forEach((j) => {
      existingMap.set(makeMemberKey(j.no_registrasi, j.full_name), j.id);
    });

    const seenInBatch = new Set<string>();
    const toInsert: Array<Record<string, unknown>> = [];
    const toUpdate: Array<{ id: string; payload: Record<string, unknown> }> = [];
    let skippedCount = 0;

    for (const r of importRows) {
      const fullNameVal = pickField(r, [
        'full_name',
        'nama_lengkap',
        'nama',
        'name',
      ]);
      if (!fullNameVal) continue;

      const regVal = normalizeRegValue(
        pickField(r, [
          'no_registrasi',
          'nomor_registrasi',
          'no_register',
          'no_reg',
          'no_induk',
          'no_kk',
        ])
      );
      const wijkRaw = pickField(r, ['wijk', 'lingkungan'])
        .toLowerCase()
        .replace(/^wijk\s+/i, '');
      const genderRaw = (
        pickField(r, ['gender', 'jenis_kelamin', 'jk', 'l_p']) || 'L'
      ).toUpperCase();

      const payload = {
        no_registrasi: regVal,
        full_name: fullNameVal,
        gender: genderRaw === 'P' || genderRaw.startsWith('PEREMPUAN') ? 'P' : 'L',
        wijk_id: wijkNameToId.get(wijkRaw) || null,
        birth_place: pickField(r, ['birth_place', 'tempat_lahir']),
        birth_date: normalizeExcelDate(
          pickField(r, ['birth_date', 'tanggal_lahir', 'tgl_lahir'])
        ),
        marriage_date: normalizeExcelDate(
          pickField(r, [
            'marriage_date',
            'tanggal_nikah',
            'tgl_nikah',
            'tanggal_pernikahan',
            'tanggal_menikah',
          ])
        ),
        baptism_date: normalizeExcelDate(
          pickField(r, ['baptism_date', 'tanggal_baptis', 'tgl_baptis'])
        ),
        sidi_date: normalizeExcelDate(
          pickField(r, ['sidi_date', 'tanggal_sidi', 'tgl_sidi'])
        ),
        family_role:
          pickField(r, [
            'family_role',
            'peran_keluarga',
            'hubungan_keluarga',
            'status_keluarga',
          ]) || 'Anggota Keluarga',
        phone: pickField(r, [
          'phone',
          'telepon',
          'no_hp',
          'no_telepon',
          'hp',
          'wa',
        ]),
        address: pickField(r, ['address', 'alamat', 'alamat_rumah']),
        notes: pickField(r, ['notes', 'catatan']),
        status_keanggotaan: 'aktif',
        is_active: true,
      };

      const memberKey = makeMemberKey(regVal, fullNameVal);

      if (duplicatePolicy !== 'insert_all') {
        if (seenInBatch.has(memberKey)) {
          skippedCount++;
          continue;
        }
        seenInBatch.add(memberKey);

        const existingId = existingMap.get(memberKey);
        if (existingId) {
          if (duplicatePolicy === 'skip_existing') {
            skippedCount++;
            continue;
          }
          if (duplicatePolicy === 'update_existing') {
            toUpdate.push({ id: existingId, payload });
            continue;
          }
        }
      }

      toInsert.push(payload);
    }

    if (!isSupabaseConfigured || !supabase) {
      const nowIso = new Date().toISOString();
      let current = [...readPreviewJemaat()];
      toUpdate.forEach((u) => {
        current = current.map((row) => {
          if (row.id !== u.id) return row;
          const wObj = wijkList.find((w) => w.id === u.payload.wijk_id);
          return {
            ...row,
            ...(u.payload as Partial<JemaatRecord>),
            updated_at: nowIso,
            wijk: wObj ? { id: wObj.id, name: wObj.name } : null,
          };
        });
      });
      const added: JemaatRecord[] = toInsert.map((item, idx) => {
        const wObj = wijkList.find((w) => w.id === item.wijk_id);
        return {
          id: `jmt-imp-${Date.now()}-${idx}`,
          family_head_id: null,
          created_at: nowIso,
          updated_at: nowIso,
          ...(item as Omit<JemaatRecord, 'id' | 'family_head_id' | 'created_at' | 'updated_at'>),
          wijk: wObj ? { id: wObj.id, name: wObj.name } : null,
        };
      });
      const merged = [...added, ...current];
      writePreviewJemaat(merged);
      setJemaatList(merged);
      setImporting(false);
      setImportRows([]);
      addNotice({
        type: 'success',
        message: `Impor pratinjau selesai: ${toInsert.length} anggota ditambahkan${
          toUpdate.length > 0 ? `, ${toUpdate.length} diperbarui` : ''
        }${skippedCount > 0 ? `, ${skippedCount} dilewati` : ''}.`,
      });
      return;
    }

    let importError: string | null = null;

    if (toInsert.length > 0) {
      const { error } = await supabase.from('jemaat').insert(toInsert);
      if (error) importError = error.message;
    }

    if (!importError && toUpdate.length > 0) {
      for (const item of toUpdate) {
        const { error } = await supabase
          .from('jemaat')
          .update(item.payload)
          .eq('id', item.id);
        if (error) {
          importError = error.message;
          break;
        }
      }
    }

    setImporting(false);
    if (importError) {
      if (checkSchemaMismatch(importError)) {
        addNotice({
          type: 'error',
          message:
            'Gagal impor XLSX: kolom database belum diperbarui ke no_registrasi (non-unik). Jalankan SQL migrasi 002_jemaat_no_registrasi.sql di Supabase SQL Editor.',
        });
      } else {
        addNotice({ type: 'error', message: `Gagal impor XLSX: ${importError}` });
      }
    } else {
      addNotice({
        type: 'success',
        message: `Impor selesai: ${toInsert.length} anggota ditambahkan${
          toUpdate.length > 0 ? `, ${toUpdate.length} diperbarui` : ''
        }${skippedCount > 0 ? `, ${skippedCount} anggota yang sudah ada dilewati` : ''}.`,
      });
      setImportRows([]);
      void loadData();
    }
  };

  const handleConfirmRequestAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    const { permohonan, mode } = actionModal;
    if (mode === 'reject' && !actionNote.trim()) {
      addNotice({ type: 'warning', message: 'Alasan penolakan wajib diisi.' });
      return;
    }

    setProcessingRequest(true);
    if (mode === 'verify_sintua') {
      const { error } = await verifySintuaPermohonan(
        permohonan.id,
        true,
        actionNote,
        profile?.id || null
      );
      setProcessingRequest(false);
      if (error) {
        addNotice({ type: 'error', message: error });
        return;
      }
      addNotice({
        type: 'success',
        message: `Permohonan ${permohonan.request_code} berhasil diverifikasi Sintua.`,
      });
      setActionModal(null);
      setActionNote('');
      await loadPermohonan();
      return;
    }

    const isApprove = mode === 'approve_admin';
    const { appliedNote, error } = await finalizePermohonanAndSync(
      permohonan,
      isApprove,
      actionNote,
      profile?.id || null,
      wijkList
    );
    setProcessingRequest(false);

    if (error) {
      addNotice({ type: 'error', message: error });
      return;
    }

    addNotice({
      type: isApprove ? 'success' : 'info',
      message: `${permohonan.request_code}: ${appliedNote}`,
    });
    setActionModal(null);
    setActionNote('');
    await loadData();
  };

  const handleCopyMigrationSql = async () => {
    try {
      await navigator.clipboard.writeText(MIGRATION_002_SQL);
      addNotice({
        type: 'success',
        message: 'SQL migrasi 002_jemaat_no_registrasi.sql disalin ke clipboard.',
      });
    } catch {
      addNotice({
        type: 'info',
        message: 'Silakan salin SQL secara manual dari kotak migrasi di halaman ini.',
      });
    }
  };

  return (
    <div className="pt-4 text-[13px]">
      {migrationNeeded && (
        <div className="mb-4 bg-[#fcf9e8] border border-[#c3c4c7] border-l-4 border-l-[#d63638] p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-[#1d2327]">
              Diperlukan Pembaruan Skema Database Supabase (Migrasi 002)
            </h2>
            <button
              type="button"
              onClick={() => void handleCopyMigrationSql()}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white text-[12px] font-medium rounded-[3px] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin SQL Migrasi</span>
            </button>
          </div>
          <p className="text-[12px] text-[#50575e]">
            Kolom tabel <code>jemaat</code> masih memakai <code>no_induk</code> unik. Jalankan SQL
            berikut di <strong>Supabase &rarr; SQL Editor</strong> agar berubah menjadi{' '}
            <code>no_registrasi</code> (nomor registrasi keluarga yang boleh sama untuk beberapa anggota):
          </p>
          <pre className="bg-white border border-[#c3c4c7] p-2.5 text-[11px] overflow-x-auto text-[#1d2327]">
            {MIGRATION_002_SQL}
          </pre>
        </div>
      )}

      {migration003Needed && (
        <div className="mb-4 bg-[#fcf9e8] border border-[#c3c4c7] border-l-4 border-l-[#dba617] p-4 space-y-1.5">
          <h2 className="text-[14px] font-semibold text-[#1d2327]">
            Diperlukan Migrasi Database 003 (Permohonan Perubahan Data Jemaat)
          </h2>
          <p className="text-[12px] text-[#50575e]">{MIGRATION_003_HINT}</p>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[23px] font-normal text-[#1d2327]">Data Jemaat</h1>
          {tab === 'list' && (
            <>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm((v) => !v);
                }}
                className="px-3 py-1 text-[13px] text-[#2271b1] border border-[#2271b1] bg-[#f6f7f7] rounded-[3px] cursor-pointer"
              >
                Tambah Jemaat
              </button>
              <button
                type="button"
                onClick={handleExportXlsx}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[13px] text-[#1d2327] border border-[#c3c4c7] bg-white hover:bg-[#f6f7f7] rounded-[3px] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .xlsx</span>
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { path: '/admin/jemaat', label: 'Semua Jemaat', key: 'list' },
            {
              path: '/admin/jemaat/permohonan',
              label:
                pendingRequestsCount > 0
                  ? `Permohonan (${pendingRequestsCount})`
                  : 'Permohonan Perubahan',
              key: 'requests',
            },
            { path: '/admin/jemaat/import', label: 'Import XLSX', key: 'import' },
            {
              path: '/admin/jemaat/ulang-tahun',
              label: 'Ulang Tahun',
              key: 'birthdays',
            },
            {
              path: '/admin/jemaat/pernikahan',
              label: 'Ulang Tahun Pernikahan',
              key: 'anniversaries',
            },
          ].map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className={`inline-flex items-center min-h-[38px] md:min-h-0 px-3 py-1.5 border rounded-[3px] ${
                tab === item.key
                  ? 'bg-[#2271b1] border-[#2271b1] text-white'
                  : 'bg-white border-[#c3c4c7] text-[#1d2327]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* TAB 1: DAFTAR JEMAAT */}
      {tab === 'list' && (
        <div className="space-y-4">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-[#c3c4c7] p-3.5">
              <div className="text-[11px] uppercase tracking-wider text-[#50575e]">
                Jemaat Aktif
              </div>
              <div className="text-[22px] font-semibold text-[#1d2327] tabular-nums mt-0.5">
                {summaryStats.aktifCount}
              </div>
            </div>
            <div className="bg-white border border-[#c3c4c7] p-3.5">
              <div className="text-[11px] uppercase tracking-wider text-[#50575e]">
                Sudah Baptis
              </div>
              <div className="text-[22px] font-semibold text-[#2271b1] tabular-nums mt-0.5">
                {summaryStats.baptisCount}
              </div>
            </div>
            <div className="bg-white border border-[#c3c4c7] p-3.5">
              <div className="text-[11px] uppercase tracking-wider text-[#50575e]">
                Sudah Sidi / Malua
              </div>
              <div className="text-[22px] font-semibold text-[#007017] tabular-nums mt-0.5">
                {summaryStats.sidiCount}
              </div>
            </div>
            <div className="bg-white border border-[#c3c4c7] p-3.5">
              <div className="text-[11px] uppercase tracking-wider text-[#50575e]">
                Sudah Menikah
              </div>
              <div className="text-[22px] font-semibold text-[#9A3412] tabular-nums mt-0.5">
                {summaryStats.nikahCount}
              </div>
            </div>
          </div>

          {showForm && (
            <form
              onSubmit={handleSaveJemaat}
              className="bg-white border border-[#c3c4c7] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              <div>
                <label className="block text-[#50575e] mb-1">No. Registrasi Keluarga</label>
                <input
                  type="text"
                  value={noRegistrasi}
                  onChange={(e) => setNoRegistrasi(e.target.value)}
                  placeholder="Mis. REG-001"
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
                <p className="text-[11px] text-[#646970] mt-0.5">
                  Semua anggota 1 keluarga memakai nomor registrasi sama.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[#50575e] mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Lingkungan (Wijk)</label>
                <select
                  value={wijkId}
                  onChange={(e) => setWijkId(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                >
                  {wijkList.map((w) => (
                    <option key={w.id} value={w.id}>
                      Wijk {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Jenis Kelamin</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                  className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  placeholder="Contoh: Sidikalang"
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Peran Keluarga</label>
                <input
                  type="text"
                  list="family-role-options"
                  value={familyRole}
                  onChange={(e) => setFamilyRole(e.target.value)}
                  placeholder="Kepala Keluarga / Istri / Anak"
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
                <datalist id="family-role-options">
                  <option value="Kepala Keluarga" />
                  <option value="Ama/Suami" />
                  <option value="Istri" />
                  <option value="Ina/Istri" />
                  <option value="Anak" />
                  <option value="Anggota Keluarga" />
                </datalist>
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Tanggal Baptis</label>
                <input
                  type="date"
                  value={baptismDate}
                  onChange={(e) => setBaptismDate(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Tanggal Sidi / Malua</label>
                <input
                  type="date"
                  value={sidiDate}
                  onChange={(e) => setSidiDate(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Tanggal Pernikahan</label>
                <input
                  type="date"
                  value={marriageDate}
                  onChange={(e) => setMarriageDate(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Status Keanggotaan</label>
                <select
                  value={statusKeanggotaan}
                  onChange={(e) =>
                    setStatusKeanggotaan(
                      e.target.value as JemaatRecord['status_keanggotaan']
                    )
                  }
                  className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                >
                  <option value="aktif">Aktif</option>
                  <option value="pindah">Pindah Huria</option>
                  <option value="meninggal">Meninggal Dunia</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">No. Telepon / WA</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[#50575e] mb-1">Alamat Rumah</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan (opsional)"
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2 pt-2 border-t border-[#f0f0f1]">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#2271b1] text-white font-medium rounded-[3px] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editId ? 'Perbarui Data Jemaat' : 'Simpan Data Jemaat'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-[#50575e] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* Filter Bar + View Toggle */}
          <div className="bg-white border border-[#c3c4c7] p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={wijkFilter}
                onChange={(e) => setWijkFilter(e.target.value)}
                className="h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                <option value="all">Semua Lingkungan (6 Wijk)</option>
                {wijkList.map((w) => (
                  <option key={w.id} value={w.id}>
                    Wijk {w.name}
                  </option>
                ))}
              </select>
              <span className="text-[#50575e] tabular-nums">
                Menampilkan {filteredList.length} jemaat
                {distinctFamiliesCount > 0
                  ? ` (${distinctFamiliesCount} nomor registrasi keluarga)`
                  : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="inline-flex border border-[#c3c4c7] rounded-[3px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('jiwa')}
                  className={`px-2.5 py-1 text-[12px] cursor-pointer ${
                    viewMode === 'jiwa'
                      ? 'bg-[#2271b1] text-white font-medium'
                      : 'bg-white text-[#50575e] hover:bg-[#f6f7f7]'
                  }`}
                >
                  Daftar Jiwa
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('kk')}
                  className={`px-2.5 py-1 text-[12px] cursor-pointer border-l border-[#c3c4c7] ${
                    viewMode === 'kk'
                      ? 'bg-[#2271b1] text-white font-medium'
                      : 'bg-white text-[#50575e] hover:bg-[#f6f7f7]'
                  }`}
                >
                  Kelompok per KK
                </button>
              </div>

              <div className="relative flex-1 sm:flex-initial min-w-0">
                <Search className="w-3.5 h-3.5 text-[#787c82] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau no. registrasi..."
                  className="w-full sm:w-56 h-8 pl-8 pr-2.5 border border-[#8c8f94] rounded-[3px]"
                />
              </div>
            </div>
          </div>

          {viewMode === 'kk' ? (
            <div className="space-y-3">
              {loading ? (
                <div className="bg-white border border-[#c3c4c7] p-6 text-center text-[#50575e]">
                  Memuat kelompok keluarga...
                </div>
              ) : groupedByKk.length === 0 ? (
                <div className="bg-white border border-[#c3c4c7] p-6 text-center text-[#50575e]">
                  Belum ada data jemaat. Tambahkan manual atau gunakan Import XLSX.
                </div>
              ) : (
                groupedByKk.map(([kkKey, members]) => {
                  const head =
                    members.find((m) => {
                      const r = m.family_role.toLowerCase();
                      return (
                        r.includes('kepala') ||
                        r.includes('ama') ||
                        r.includes('suami')
                      );
                    }) || members[0];
                  return (
                    <div
                      key={kkKey}
                      className="bg-white border border-[#c3c4c7] p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#f0f0f1]">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#2271b1]" />
                          <span className="font-mono tabular-nums text-[12px] text-[#2271b1] font-semibold">
                            {kkKey}
                          </span>
                          <span className="text-[#787c82]">&middot;</span>
                          <strong className="text-[#1d2327]">{head.full_name}</strong>
                        </div>
                        <div className="text-[12px] text-[#50575e]">
                          Wijk {head.wijk?.name || '-'} &middot;{' '}
                          <strong className="tabular-nums">{members.length}</strong> anggota
                        </div>
                      </div>

                      <div className="divide-y divide-[#f0f0f1]">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            className="py-1.5 flex flex-wrap items-center justify-between gap-2 text-[12px]"
                          >
                            <div>
                              <span className="font-medium text-[#1d2327]">
                                {m.full_name}
                              </span>{' '}
                              <span className="text-[#50575e]">({m.family_role})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="tabular-nums text-[#50575e]">
                                {m.birth_date || '-'}
                              </span>
                              <button
                                type="button"
                                onClick={() => openEditJemaat(m)}
                                className="text-[#2271b1] hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#c3c4c7] overflow-x-auto">
              <table className="w-full border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-[#c3c4c7] text-left">
                    <th className="p-2.5 font-semibold">No. Registrasi</th>
                    <th className="p-2.5 font-semibold">Nama Lengkap</th>
                    <th className="p-2.5 font-semibold">Wijk</th>
                    <th className="p-2.5 font-semibold">L/P</th>
                    <th className="p-2.5 font-semibold">Tgl Lahir</th>
                    <th className="p-2.5 font-semibold">Kontak &amp; Status</th>
                    <th className="p-2.5 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f1]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-[#50575e]">
                        Memuat data jemaat...
                      </td>
                    </tr>
                  ) : filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-[#50575e]">
                        Belum ada data jemaat. Tambahkan manual atau gunakan Import XLSX.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((j) => (
                      <tr key={j.id} className="hover:bg-[#f6f7f7]">
                        <td className="p-2.5 tabular-nums font-medium text-[#2271b1]">
                          {j.no_registrasi || '-'}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-[#1d2327]">{j.full_name}</div>
                          <div className="text-[11px] text-[#50575e]">{j.family_role}</div>
                        </td>
                        <td className="p-2.5">Wijk {j.wijk?.name || '-'}</td>
                        <td className="p-2.5">{j.gender || '-'}</td>
                        <td className="p-2.5 tabular-nums">{j.birth_date || '-'}</td>
                        <td className="p-2.5">
                          <div>{j.phone || '-'}</div>
                          <div className="text-[11px] text-[#50575e] capitalize">
                            {j.status_keanggotaan}
                          </div>
                        </td>
                        <td className="p-2.5 space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditJemaat(j)}
                            className="text-[#2271b1] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteJemaat(j.id)}
                            className="text-[#d63638] hover:underline cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERMOHONAN PERUBAHAN DATA JEMAAT */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#c3c4c7] p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#2271b1]" />
              <select
                value={requestStatusFilter}
                onChange={(e) =>
                  setRequestStatusFilter(
                    e.target.value as 'all' | PermohonanStatus
                  )
                }
                className="h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                <option value="all">Semua Status Permohonan</option>
                <option value="menunggu_sintua">Menunggu Sintua</option>
                <option value="terverifikasi_sintua">Terverifikasi Sintua</option>
                <option value="disetujui">Disetujui Admin</option>
                <option value="ditolak">Ditolak</option>
              </select>
              <span className="text-[#50575e] tabular-nums">
                {filteredRequests.length} permohonan ditampilkan
              </span>
            </div>

            <div className="relative w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 text-[#787c82] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                placeholder="Cari kode REQ / No. KK / pemohon..."
                className="w-full sm:w-64 h-8 pl-8 pr-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
          </div>

          {loadingRequests ? (
            <div className="bg-white border border-[#c3c4c7] p-6 text-center text-[#50575e]">
              Memuat daftar permohonan perubahan data...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white border border-[#c3c4c7] p-6 text-center text-[#50575e]">
              Belum ada permohonan perubahan data jemaat pada filter ini.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((p) => {
                const statusInfo =
                  PERMOHONAN_STATUS_META[p.status_verifikasi] ||
                  PERMOHONAN_STATUS_META.menunggu_sintua;
                const docEntries = p.kelengkapan_dokumen
                  ? Object.entries(p.kelengkapan_dokumen)
                  : [];

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-[#c3c4c7] p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#f0f0f1]">
                      <div className="text-[12px] text-[#50575e] font-mono tabular-nums">
                        <strong className="text-[#1d2327]">{p.request_code}</strong> &middot;{' '}
                        {new Intl.DateTimeFormat('id-ID', {
                          dateStyle: 'medium',
                        }).format(new Date(p.created_at))}{' '}
                        &middot; Wijk {p.wijk_name}
                      </div>
                      <span
                        className={`text-[12px] font-semibold ${
                          statusInfo.tone === 'green'
                            ? 'text-[#007017]'
                            : statusInfo.tone === 'red'
                              ? 'text-[#d63638]'
                              : statusInfo.tone === 'blue'
                                ? 'text-[#2271b1]'
                                : 'text-[#996800]'
                        }`}
                      >
                        Status: {statusInfo.label}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-[15px] font-semibold text-[#1d2327]">
                        {p.jenis_permohonan} &mdash; {p.nama_pemohon} (No. Reg/KK:{' '}
                        <span className="font-mono tabular-nums text-[#2271b1]">
                          {p.no_registrasi}
                        </span>
                        )
                      </h2>
                      {(p.nama_suami || p.nama_istri || p.email_pemohon || p.alamat_pemohon) && (
                        <p className="text-[12px] text-[#50575e] mt-1">
                          {p.nama_suami ? `Suami: ${p.nama_suami} · ` : ''}
                          {p.nama_istri ? `Istri: ${p.nama_istri} · ` : ''}
                          {p.email_pemohon ? `Email: ${p.email_pemohon} · ` : ''}
                          {p.alamat_pemohon ? `Alamat: ${p.alamat_pemohon}` : ''}
                        </p>
                      )}
                    </div>

                    {Array.isArray(p.daftar_anggota) && p.daftar_anggota.length > 0 && (
                      <div className="overflow-x-auto border border-[#c3c4c7]">
                        <table className="w-full border-collapse text-[12px]">
                          <thead>
                            <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7] text-left">
                              <th className="p-2">#</th>
                              <th className="p-2">Nama Anak / Anggota</th>
                              <th className="p-2">Hubungan</th>
                              <th className="p-2">JK</th>
                              <th className="p-2">Tempat &amp; Tgl Lahir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f0f0f1]">
                            {p.daftar_anggota.map((a, idx) => (
                              <tr key={idx}>
                                <td className="p-2 tabular-nums">{idx + 1}</td>
                                <td className="p-2 font-semibold">{a.nama_lengkap}</td>
                                <td className="p-2">{a.status_keluarga}</td>
                                <td className="p-2">{a.jenis_kelamin}</td>
                                <td className="p-2 tabular-nums">
                                  {a.tempat_lahir || '-'}, {a.tanggal_lahir || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {Array.isArray(p.daftar_perubahan) &&
                      p.daftar_perubahan.length > 0 && (
                        <div className="overflow-x-auto border border-[#c3c4c7]">
                          <table className="w-full border-collapse text-[12px]">
                            <thead>
                              <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7] text-left">
                                <th className="p-2">Data Diubah</th>
                                <th className="p-2">Anggota</th>
                                <th className="p-2">Data Lama (Salah)</th>
                                <th className="p-2">Data yang Benar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f0f1]">
                              {p.daftar_perubahan.map((c, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 font-semibold">
                                    {c.field_label || c.field}
                                  </td>
                                  <td className="p-2">
                                    {c.nama_anggota || 'Keluarga / KK'}
                                  </td>
                                  <td className="p-2 text-[#d63638] line-through">
                                    {c.data_lama}
                                  </td>
                                  <td className="p-2 text-[#007017] font-semibold">
                                    {c.data_benar}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    {docEntries.length > 0 && (
                      <div className="text-[12px] text-[#50575e] flex flex-wrap items-center gap-3">
                        <strong className="text-[#1d2327]">Lampiran Administrasi:</strong>
                        {docEntries.map(([key, item]) => (
                          <span key={key} className="inline-flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>
                              {KELENGKAPAN_LABELS[key] || key}: {item.fileName}
                            </span>
                            {item.previewDataUrl && (
                              <a
                                href={item.previewDataUrl}
                                download={item.fileName}
                                className="text-[#2271b1] hover:underline ml-1"
                              >
                                (Unduh)
                              </a>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {p.detail_perubahan && (
                      <p className="text-[12px] text-[#50575e]">{p.detail_perubahan}</p>
                    )}

                    <div className="text-[12px] text-[#50575e]">
                      Verifikasi: <strong>{p.verifikasi_identitas}</strong> &middot; WA:{' '}
                      <strong className="font-mono tabular-nums">
                        {p.no_hp_pemohon}
                      </strong>
                    </div>

                    {p.catatan_sintua && (
                      <div className="text-[12px] text-[#007017]">
                        <strong>Catatan Sintua:</strong> {p.catatan_sintua}
                      </div>
                    )}
                    {p.catatan_admin && (
                      <div className="text-[12px] text-[#2271b1]">
                        <strong>Catatan Admin:</strong> {p.catatan_admin}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {(p.status_verifikasi === 'menunggu_sintua' ||
                      p.status_verifikasi === 'terverifikasi_sintua') && (
                      <div className="pt-2 border-t border-[#f0f0f1] flex flex-wrap gap-2">
                        {p.status_verifikasi === 'menunggu_sintua' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionNote('');
                              setActionModal({ permohonan: p, mode: 'verify_sintua' });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00a32a] hover:bg-[#008a20] text-white font-medium rounded-[3px] cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verifikasi Valid (Sintua)</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActionNote('');
                            setActionModal({ permohonan: p, mode: 'approve_admin' });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui &amp; Terapkan ke Database Induk</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionNote('');
                            setActionModal({ permohonan: p, mode: 'reject' });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#d63638] text-[#d63638] hover:bg-[#fcf0f1] rounded-[3px] cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Confirmation Modal */}
          {actionModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
            >
              <form
                onSubmit={handleConfirmRequestAction}
                className="bg-white border border-[#c3c4c7] w-full max-w-md p-5 space-y-4 shadow-lg"
              >
                <h2 className="text-[16px] font-semibold text-[#1d2327]">
                  {actionModal.mode === 'verify_sintua'
                    ? 'Verifikasi Sintua Wijk'
                    : actionModal.mode === 'approve_admin'
                      ? 'Setujui & Terapkan ke Database Jemaat'
                      : 'Tolak Permohonan Perubahan'}
                </h2>
                <p className="text-[12px] text-[#50575e]">
                  Permohonan{' '}
                  <strong className="font-mono">
                    {actionModal.permohonan.request_code}
                  </strong>{' '}
                  ({actionModal.permohonan.jenis_permohonan}) atas nama{' '}
                  <strong>{actionModal.permohonan.nama_pemohon}</strong>.
                </p>

                <div>
                  <label className="block font-medium text-[#1d2327] mb-1">
                    {actionModal.mode === 'reject'
                      ? 'Alasan Penolakan (Wajib diisi)'
                      : 'Catatan (Opsional)'}
                  </label>
                  <textarea
                    rows={3}
                    required={actionModal.mode === 'reject'}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder={
                      actionModal.mode === 'reject'
                        ? 'Jelaskan kekurangan data/dokumen...'
                        : 'Tambahkan catatan verifikasi bila ada...'
                    }
                    className="w-full p-2.5 border border-[#8c8f94] rounded-[3px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f1]">
                  <button
                    type="button"
                    disabled={processingRequest}
                    onClick={() => setActionModal(null)}
                    className="px-3 py-1.5 border border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e] rounded-[3px] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={processingRequest}
                    className={`px-4 py-1.5 text-white font-medium rounded-[3px] cursor-pointer disabled:opacity-60 ${
                      actionModal.mode === 'reject'
                        ? 'bg-[#d63638] hover:bg-[#b32d2e]'
                        : 'bg-[#2271b1] hover:bg-[#135e96]'
                    }`}
                  >
                    {processingRequest ? 'Memproses...' : 'Konfirmasi'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: IMPORT XLSX */}
      {tab === 'import' && (
        <div className="bg-white border border-[#c3c4c7] p-5 space-y-4 max-w-5xl">
          <h2 className="text-[16px] font-semibold text-[#1d2327]">
            Import Data Jemaat dari Excel (.xlsx / .csv)
          </h2>
          <p className="text-[#50575e]">
            Gunakan kolom standar: <code>no_registrasi</code> (nomor registrasi keluarga — boleh
            sama untuk semua anggota dalam 1 keluarga), <code>full_name</code>,{' '}
            <code>family_role</code> (Kepala Keluarga/Istri/Anak), <code>gender</code> (L/P),{' '}
            <code>wijk</code> (Letare, Exaudi, Judika, Galatia, Efesus, Jeremia),{' '}
            <code>birth_place</code>, <code>birth_date</code> (YYYY-MM-DD / DD-MM-YYYY),{' '}
            <code>baptism_date</code>, <code>sidi_date</code>, <code>marriage_date</code>,{' '}
            <code>phone</code>, <code>address</code>.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] rounded-[3px] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template XLSX</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Pilih Berkas Excel (.xlsx)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => void handleFileUpload(e)}
                className="hidden"
              />
            </label>
          </div>

          {importRows.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-[#f0f0f1]">
              <div className="bg-[#f0f6fc] border border-[#c3c4c7] border-l-4 border-l-[#2271b1] p-3 text-[12px] text-[#1d2327] space-y-1">
                <div className="font-semibold">
                  Ringkasan Berkas: {importStats.validCount} anggota jemaat dalam{' '}
                  {importStats.familyCount} nomor registrasi keluarga.
                </div>
                {(importStats.existingMemberCount > 0 ||
                  importStats.inFileDuplicateMemberCount > 0) && (
                  <ul className="list-disc pl-4 space-y-0.5 text-[#50575e]">
                    {importStats.existingMemberCount > 0 && (
                      <li>
                        <strong>{importStats.existingMemberCount}</strong> anggota (kombinasi No.
                        Registrasi &amp; Nama yang sama) sudah ada di database.
                      </li>
                    )}
                    {importStats.inFileDuplicateMemberCount > 0 && (
                      <li>
                        <strong>{importStats.inFileDuplicateMemberCount}</strong> baris memiliki
                        kombinasi No. Registrasi &amp; Nama yang identik di dalam berkas Excel.
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-3">
                <label className="block font-semibold text-[#1d2327] mb-1">
                  Penanganan Jika Anggota yang Sama Sudah Ada (No. Registrasi &amp; Nama Sama)
                </label>
                <select
                  value={duplicatePolicy}
                  onChange={(e) =>
                    setDuplicatePolicy(
                      e.target.value as
                        | 'skip_existing'
                        | 'update_existing'
                        | 'insert_all'
                    )
                  }
                  className="w-full md:max-w-xl h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                >
                  <option value="skip_existing">
                    Lewati anggota yang sudah ada (anggota keluarga lain dengan No. Registrasi sama tetap disimpan)
                  </option>
                  <option value="update_existing">
                    Perbarui data anggota yang sudah ada &amp; tambahkan anggota baru
                  </option>
                  <option value="insert_all">
                    Tambahkan semua baris sebagai data baru
                  </option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#1d2327]">
                  Pratinjau {importStats.validCount} baris valid siap diproses (dari{' '}
                  {importRows.length} baris berkas):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => setImportRows([])}
                    className="px-3 py-1.5 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#50575e] rounded-[3px] cursor-pointer"
                  >
                    Bersihkan
                  </button>
                  <button
                    type="button"
                    disabled={importing || importStats.validCount === 0}
                    onClick={() => void handleCommitImport()}
                    className="px-4 py-1.5 bg-[#00a32a] hover:bg-[#008a20] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
                  >
                    {importing
                      ? 'Mengimpor...'
                      : `Proses ${importStats.validCount} Baris`}
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto border border-[#c3c4c7]">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7] text-left">
                      <th className="p-2">No. Registrasi</th>
                      <th className="p-2">Nama Lengkap</th>
                      <th className="p-2">Peran Keluarga</th>
                      <th className="p-2">L/P</th>
                      <th className="p-2">Wijk</th>
                      <th className="p-2">Tgl Lahir</th>
                      <th className="p-2">Telepon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1]">
                    {importRows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 tabular-nums font-medium text-[#2271b1]">
                          {pickField(r, [
                            'no_registrasi',
                            'nomor_registrasi',
                            'no_register',
                            'no_reg',
                            'no_induk',
                            'no_kk',
                          ]) || '-'}
                        </td>
                        <td className="p-2">
                          {pickField(r, [
                            'full_name',
                            'nama_lengkap',
                            'nama',
                            'name',
                          ]) || '-'}
                        </td>
                        <td className="p-2">
                          {pickField(r, [
                            'family_role',
                            'peran_keluarga',
                            'hubungan_keluarga',
                            'status_keluarga',
                          ]) || 'Anggota Keluarga'}
                        </td>
                        <td className="p-2">
                          {pickField(r, ['gender', 'jenis_kelamin', 'jk', 'l_p']) ||
                            'L'}
                        </td>
                        <td className="p-2">
                          {pickField(r, ['wijk', 'lingkungan']) || '-'}
                        </td>
                        <td className="p-2 tabular-nums">
                          {pickField(r, [
                            'birth_date',
                            'tanggal_lahir',
                            'tgl_lahir',
                          ]) || '-'}
                        </td>
                        <td className="p-2">
                          {pickField(r, [
                            'phone',
                            'telepon',
                            'no_hp',
                            'no_telepon',
                            'hp',
                            'wa',
                          ]) || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4 & 5: ULANG TAHUN & PERNIKAHAN */}
      {(tab === 'birthdays' || tab === 'anniversaries') && (
        <div className="bg-white border border-[#c3c4c7] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {tab === 'birthdays' ? (
                <Cake className="w-5 h-5 text-[#2271b1]" />
              ) : (
                <HeartHandshake className="w-5 h-5 text-[#9A3412]" />
              )}
              <h2 className="text-[16px] font-semibold text-[#1d2327]">
                {tab === 'birthdays'
                  ? 'Daftar Ulang Tahun Jemaat per Bulan'
                  : 'Daftar Ulang Tahun Pernikahan Jemaat'}
              </h2>
            </div>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(Number(e.target.value))}
              className="h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px]"
            >
              {[
                'Januari',
                'Februari',
                'Maret',
                'April',
                'Mei',
                'Juni',
                'Juli',
                'Agustus',
                'September',
                'Oktober',
                'November',
                'Desember',
              ].map((mName, idx) => (
                <option key={mName} value={idx + 1}>
                  Bulan {mName}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[460px]">
              <thead>
                <tr className="border-b border-[#c3c4c7] text-left">
                  <th className="p-2.5 font-semibold">No. Registrasi</th>
                  <th className="p-2.5 font-semibold">Nama Jemaat</th>
                  <th className="p-2.5 font-semibold">Wijk</th>
                  <th className="p-2.5 font-semibold">
                    {tab === 'birthdays' ? 'Tanggal Lahir' : 'Tanggal Pernikahan'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f1]">
                {(tab === 'birthdays'
                  ? birthdaysByMonth
                  : anniversariesByMonth
                ).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[#50575e]">
                      Tidak ada data pada bulan yang dipilih.
                    </td>
                  </tr>
                ) : (
                  (tab === 'birthdays'
                    ? birthdaysByMonth
                    : anniversariesByMonth
                  ).map((j) => (
                    <tr key={j.id}>
                      <td className="p-2.5 tabular-nums text-[#2271b1]">
                        {j.no_registrasi || '-'}
                      </td>
                      <td className="p-2.5 font-semibold text-[#1d2327]">
                        {j.full_name}
                      </td>
                      <td className="p-2.5">Wijk {j.wijk?.name || '-'}</td>
                      <td className="p-2.5 tabular-nums">
                        {tab === 'birthdays' ? j.birth_date : j.marriage_date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
