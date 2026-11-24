import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Cake, Copy, Download, HeartHandshake, Plus, Search, Upload } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { DEFAULT_WIJK, fetchPublicWijk } from '../../lib/publicData';
import type { JemaatRecord, Wijk } from '../../types/cms';

export type JemaatTab = 'list' | 'import' | 'birthdays' | 'anniversaries';

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

const normalizeHeaderKey = (key: string) =>
  key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const pickField = (row: Record<string, unknown>, aliases: string[]): string => {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return String(row[alias]).trim();
    }
  }
  const normalizedEntries = Object.entries(row).map(([k, v]) => [normalizeHeaderKey(k), v] as const);
  for (const alias of aliases) {
    const target = normalizeHeaderKey(alias);
    const match = normalizedEntries.find(([k, v]) => k === target && v !== undefined && v !== null && String(v).trim() !== '');
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
  `${(noRegistrasi || '').trim().toLowerCase()}||${fullName.trim().toLowerCase()}`;

export function CongregationPage({ tab }: { tab: JemaatTab }) {
  const { addNotice } = useAdmin();

  const [wijkList, setWijkList] = useState<Wijk[]>(DEFAULT_WIJK);
  const [jemaatList, setJemaatList] = useState<JemaatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const [wijkFilter, setWijkFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Form Tambah / Edit Jemaat
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [noRegistrasi, setNoRegistrasi] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [birthDate, setBirthDate] = useState('');
  const [marriageDate, setMarriageDate] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [sidiDate, setSidiDate] = useState('');
  const [wijkId, setWijkId] = useState('');
  const [familyRole, setFamilyRole] = useState('Kepala Keluarga');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [statusKeanggotaan, setStatusKeanggotaan] =
    useState<JemaatRecord['status_keanggotaan']>('aktif');

  // XLSX Import State
  const [importRows, setImportRows] = useState<Array<Record<string, unknown>>>([]);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip_existing' | 'update_existing' | 'insert_all'>('skip_existing');
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
        return `${String(y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

  const loadData = async () => {
    setLoading(true);
    const wks = await fetchPublicWijk();
    setWijkList(wks);
    if (!wijkId && wks[0]) setWijkId(wks[0].id);

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
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
      if (rows.length > 0 && 'no_induk' in rows[0] && !('no_registrasi' in rows[0])) {
        setMigrationNeeded(true);
      } else {
        setMigrationNeeded(false);
      }
      setJemaatList(rows as unknown as JemaatRecord[]);
    }
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

  const distinctFamiliesCount = useMemo(() => {
    const set = new Set(
      filteredList
        .map((j) => (j.no_registrasi || '').trim().toLowerCase())
        .filter(Boolean)
    );
    return set.size;
  }, [filteredList]);

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
        pickField(r, ['no_registrasi', 'nomor_registrasi', 'no_register', 'no_reg', 'no_induk'])
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
    setBirthDate('');
    setMarriageDate('');
    setBaptismDate('');
    setSidiDate('');
    setFamilyRole('Kepala Keluarga');
    setPhone('');
    setAddress('');
    setStatusKeanggotaan('aktif');
  };

  const handleSaveJemaat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    if (!isSupabaseConfigured || !supabase) {
      addNotice({ type: 'warning', message: 'Hubungkan Supabase untuk menyimpan data jemaat.' });
      return;
    }

    const payload = {
      no_registrasi: normalizeRegValue(noRegistrasi),
      full_name: fullName.trim(),
      gender,
      birth_date: birthDate || null,
      marriage_date: marriageDate || null,
      baptism_date: baptismDate || null,
      sidi_date: sidiDate || null,
      wijk_id: wijkId || null,
      family_role: familyRole.trim() || 'Anggota Keluarga',
      phone: phone.trim(),
      address: address.trim(),
      status_keanggotaan: statusKeanggotaan,
      is_active: statusKeanggotaan === 'aktif',
    };

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
    if (!supabase) return;
    const { error } = await supabase.from('jemaat').delete().eq('id', id);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setJemaatList((prev) => prev.filter((x) => x.id !== id));
      addNotice({ type: 'success', message: 'Data jemaat dihapus.' });
    }
  };

  const handleDownloadTemplate = () => {
    const sample = [
      {
        no_registrasi: 'REG-001',
        full_name: 'St. Marusaha Lumbantobing',
        gender: 'L',
        wijk: 'Letare',
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
    if (importRows.length === 0 || !supabase) return;
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
      const fullNameVal = pickField(r, ['full_name', 'nama_lengkap', 'nama', 'name']);
      if (!fullNameVal) continue;

      const regVal = normalizeRegValue(
        pickField(r, ['no_registrasi', 'nomor_registrasi', 'no_register', 'no_reg', 'no_induk'])
      );
      const wijkRaw = pickField(r, ['wijk', 'lingkungan'])
        .toLowerCase()
        .replace(/^wijk\s+/i, '');
      const genderRaw = (pickField(r, ['gender', 'jenis_kelamin', 'jk', 'l_p']) || 'L').toUpperCase();

      const payload = {
        no_registrasi: regVal,
        full_name: fullNameVal,
        gender: genderRaw === 'P' || genderRaw === 'PEREMPUAN' ? 'P' : 'L',
        wijk_id: wijkNameToId.get(wijkRaw) || null,
        birth_date: normalizeExcelDate(pickField(r, ['birth_date', 'tanggal_lahir', 'tgl_lahir'])),
        marriage_date: normalizeExcelDate(
          pickField(r, ['marriage_date', 'tanggal_nikah', 'tgl_nikah', 'tanggal_pernikahan'])
        ),
        baptism_date: normalizeExcelDate(
          pickField(r, ['baptism_date', 'tanggal_baptis', 'tgl_baptis'])
        ),
        sidi_date: normalizeExcelDate(pickField(r, ['sidi_date', 'tanggal_sidi', 'tgl_sidi'])),
        family_role:
          pickField(r, ['family_role', 'peran_keluarga', 'hubungan_keluarga', 'status_keluarga']) ||
          'Anggota Keluarga',
        phone: pickField(r, ['phone', 'telepon', 'no_hp', 'no_telepon', 'hp', 'wa']),
        address: pickField(r, ['address', 'alamat', 'alamat_rumah']),
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

    let importError: string | null = null;

    if (toInsert.length > 0) {
      const { error } = await supabase.from('jemaat').insert(toInsert);
      if (error) importError = error.message;
    }

    if (!importError && toUpdate.length > 0) {
      for (const item of toUpdate) {
        const { error } = await supabase.from('jemaat').update(item.payload).eq('id', item.id);
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
      const insertedCount = toInsert.length;
      const updatedCount = toUpdate.length;
      addNotice({
        type: 'success',
        message: `Impor selesai: ${insertedCount} anggota ditambahkan${
          updatedCount > 0 ? `, ${updatedCount} diperbarui` : ''
        }${skippedCount > 0 ? `, ${skippedCount} anggota yang sudah ada dilewati` : ''}.`,
      });
      setImportRows([]);
      void loadData();
    }
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
            berikut di <strong>Supabase → SQL Editor</strong> agar berubah menjadi{' '}
            <code>no_registrasi</code> (nomor registrasi keluarga yang boleh sama untuk beberapa anggota):
          </p>
          <pre className="bg-white border border-[#c3c4c7] p-2.5 text-[11px] overflow-x-auto text-[#1d2327]">
            {MIGRATION_002_SQL}
          </pre>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[23px] font-normal text-[#1d2327]">Data Jemaat</h1>
          {tab === 'list' && (
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
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { path: '/admin/jemaat', label: 'Semua Jemaat', key: 'list' },
            { path: '/admin/jemaat/import', label: 'Import XLSX', key: 'import' },
            { path: '/admin/jemaat/ulang-tahun', label: 'Ulang Tahun', key: 'birthdays' },
            { path: '/admin/jemaat/pernikahan', label: 'Ulang Tahun Pernikahan', key: 'anniversaries' },
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

      {tab === 'list' && (
        <div className="space-y-4">
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
                <label className="block text-[#50575e] mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
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
                <label className="block text-[#50575e] mb-1">Peran Keluarga</label>
                <input
                  type="text"
                  value={familyRole}
                  onChange={(e) => setFamilyRole(e.target.value)}
                  placeholder="Kepala Keluarga / Istri / Anak"
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
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

          {/* Filter Bar */}
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
                {distinctFamiliesCount > 0 ? ` (${distinctFamiliesCount} nomor registrasi keluarga)` : ''}
              </span>
            </div>

            <div className="relative w-full sm:w-auto min-w-0">
              <Search className="w-3.5 h-3.5 text-[#787c82] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau no. registrasi..."
                className="w-full sm:w-60 h-8 pl-8 pr-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
          </div>

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
                          onClick={() => {
                            setEditId(j.id);
                            setNoRegistrasi(j.no_registrasi || '');
                            setFullName(j.full_name);
                            setGender(j.gender || 'L');
                            setBirthDate(j.birth_date || '');
                            setMarriageDate(j.marriage_date || '');
                            setBaptismDate(j.baptism_date || '');
                            setSidiDate(j.sidi_date || '');
                            setWijkId(j.wijk_id || '');
                            setFamilyRole(j.family_role);
                            setPhone(j.phone);
                            setAddress(j.address);
                            setStatusKeanggotaan(j.status_keanggotaan);
                            setShowForm(true);
                          }}
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
        </div>
      )}

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
            <code>birth_date</code> (YYYY-MM-DD / DD-MM-YYYY), <code>marriage_date</code>,{' '}
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
                {(importStats.existingMemberCount > 0 || importStats.inFileDuplicateMemberCount > 0) && (
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
                      e.target.value as 'skip_existing' | 'update_existing' | 'insert_all'
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
                      : `Proses ${importStats.validCount} Baris ke Supabase`}
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
                          ]) || '-'}
                        </td>
                        <td className="p-2">
                          {pickField(r, ['full_name', 'nama_lengkap', 'nama', 'name']) || '-'}
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
                          {pickField(r, ['gender', 'jenis_kelamin', 'jk', 'l_p']) || 'L'}
                        </td>
                        <td className="p-2">{pickField(r, ['wijk', 'lingkungan']) || '-'}</td>
                        <td className="p-2 tabular-nums">
                          {pickField(r, ['birth_date', 'tanggal_lahir', 'tgl_lahir']) || '-'}
                        </td>
                        <td className="p-2">
                          {pickField(r, ['phone', 'telepon', 'no_hp', 'no_telepon', 'hp', 'wa']) ||
                            '-'}
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
                {(tab === 'birthdays' ? birthdaysByMonth : anniversariesByMonth).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[#50575e]">
                      Tidak ada data pada bulan yang dipilih.
                    </td>
                  </tr>
                ) : (
                  (tab === 'birthdays' ? birthdaysByMonth : anniversariesByMonth).map((j) => (
                    <tr key={j.id}>
                      <td className="p-2.5 tabular-nums text-[#2271b1]">
                        {j.no_registrasi || '-'}
                      </td>
                      <td className="p-2.5 font-semibold text-[#1d2327]">{j.full_name}</td>
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
