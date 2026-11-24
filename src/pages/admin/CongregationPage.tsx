import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Cake, Download, HeartHandshake, Plus, Search, Upload } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { DEFAULT_WIJK, fetchPublicWijk } from '../../lib/publicData';
import type { JemaatRecord, Wijk } from '../../types/cms';

export type JemaatTab = 'list' | 'import' | 'birthdays' | 'anniversaries';

export function CongregationPage({ tab }: { tab: JemaatTab }) {
  const { addNotice } = useAdmin();

  const [wijkList, setWijkList] = useState<Wijk[]>(DEFAULT_WIJK);
  const [jemaatList, setJemaatList] = useState<JemaatRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [wijkFilter, setWijkFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Form Tambah / Edit Jemaat
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [noInduk, setNoInduk] = useState('');
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
  const [importing, setImporting] = useState(false);
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);

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
      addNotice({ type: 'error', message: error.message });
    } else {
      setJemaatList((data as JemaatRecord[]) || []);
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
          (j.no_induk || '').toLowerCase().includes(q) ||
          j.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [jemaatList, wijkFilter, search]);

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

  const resetForm = () => {
    setEditId(null);
    setNoInduk('');
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
      no_induk: noInduk.trim() || null,
      full_name: fullName.trim(),
      gender,
      birth_date: birthDate || null,
      marriage_date: marriageDate || null,
      baptism_date: baptismDate || null,
      sidi_date: sidiDate || null,
      wijk_id: wijkId || null,
      family_role: familyRole,
      phone: phone.trim(),
      address: address.trim(),
      status_keanggotaan: statusKeanggotaan,
      is_active: statusKeanggotaan === 'aktif',
    };

    const { error } = editId
      ? await supabase.from('jemaat').update(payload).eq('id', editId)
      : await supabase.from('jemaat').insert(payload);

    if (error) {
      addNotice({ type: 'error', message: error.message });
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
        no_induk: 'HR-001',
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
  };

  const handleCommitImport = async () => {
    if (importRows.length === 0 || !supabase) return;
    setImporting(true);
    const wijkNameToId = new Map<string, string>();
    wijkList.forEach((w) => wijkNameToId.set(w.name.toLowerCase(), w.id));

    const prepared = importRows
      .filter((r) => String(r.full_name || r.nama || '').trim() !== '')
      .map((r) => {
        const wijkRaw = String(r.wijk || r.lingkungan || '').trim().toLowerCase();
        const genderRaw = String(r.gender || r.jenis_kelamin || 'L').trim().toUpperCase();
        return {
          no_induk: String(r.no_induk || '').trim() || null,
          full_name: String(r.full_name || r.nama || '').trim(),
          gender: genderRaw === 'P' ? 'P' : 'L',
          wijk_id: wijkNameToId.get(wijkRaw) || null,
          birth_date: String(r.birth_date || r.tanggal_lahir || '').trim() || null,
          marriage_date: String(r.marriage_date || r.tanggal_nikah || '').trim() || null,
          baptism_date: String(r.baptism_date || '').trim() || null,
          sidi_date: String(r.sidi_date || '').trim() || null,
          family_role: String(r.family_role || 'Anggota Keluarga').trim(),
          phone: String(r.phone || r.telepon || '').trim(),
          address: String(r.address || r.alamat || '').trim(),
          status_keanggotaan: 'aktif',
          is_active: true,
        };
      });

    const { error } = await supabase.from('jemaat').insert(prepared);
    setImporting(false);
    if (error) {
      addNotice({ type: 'error', message: `Gagal impor XLSX: ${error.message}` });
    } else {
      addNotice({
        type: 'success',
        message: `${prepared.length} data jemaat berhasil diimpor.`,
      });
      setImportRows([]);
      void loadData();
    }
  };

  return (
    <div className="pt-4 text-[13px]">
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
              className={`px-3 py-1.5 border rounded-[3px] ${
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
                <label className="block text-[#50575e] mb-1">No. Induk / Register</label>
                <input
                  type="text"
                  value={noInduk}
                  onChange={(e) => setNoInduk(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
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
            <div className="flex items-center gap-2">
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
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#787c82] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau no. induk..."
                className="h-8 pl-8 pr-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
          </div>

          <div className="bg-white border border-[#c3c4c7] overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#c3c4c7] text-left">
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
                    <td colSpan={6} className="p-6 text-center text-[#50575e]">
                      Memuat data jemaat...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[#50575e]">
                      Belum ada data jemaat. Tambahkan manual atau gunakan Import XLSX.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((j) => (
                    <tr key={j.id} className="hover:bg-[#f6f7f7]">
                      <td className="p-2.5">
                        <div className="font-semibold text-[#1d2327]">{j.full_name}</div>
                        <div className="text-[11px] text-[#50575e]">
                          {j.no_induk ? `No. ${j.no_induk} · ` : ''}
                          {j.family_role}
                        </div>
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
                            setNoInduk(j.no_induk || '');
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
        <div className="bg-white border border-[#c3c4c7] p-5 space-y-4 max-w-4xl">
          <h2 className="text-[16px] font-semibold text-[#1d2327]">
            Import Data Jemaat dari Excel (.xlsx / .csv)
          </h2>
          <p className="text-[#50575e]">
            Gunakan kolom standar: <code>no_induk</code>, <code>full_name</code>,{' '}
            <code>gender</code> (L/P), <code>wijk</code> (Letare, Exaudi, Judika, Galatia, Efesus, Jeremia),{' '}
            <code>birth_date</code> (YYYY-MM-DD), <code>marriage_date</code>, <code>phone</code>,{' '}
            <code>address</code>.
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
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1d2327]">
                  Pratinjau {importRows.length} baris siap diimpor:
                </span>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => void handleCommitImport()}
                  className="px-4 py-1.5 bg-[#00a32a] hover:bg-[#008a20] text-white font-medium rounded-[3px] cursor-pointer"
                >
                  {importing ? 'Mengimpor...' : `Impor ${importRows.length} Baris ke Supabase`}
                </button>
              </div>
              <div className="max-h-64 overflow-auto border border-[#c3c4c7]">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7] text-left">
                      <th className="p-2">Nama</th>
                      <th className="p-2">L/P</th>
                      <th className="p-2">Wijk</th>
                      <th className="p-2">Tgl Lahir</th>
                      <th className="p-2">Telepon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1]">
                    {importRows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td className="p-2">{String(r.full_name || r.nama || '-')}</td>
                        <td className="p-2">{String(r.gender || 'L')}</td>
                        <td className="p-2">{String(r.wijk || '-')}</td>
                        <td className="p-2 tabular-nums">{String(r.birth_date || '-')}</td>
                        <td className="p-2">{String(r.phone || '-')}</td>
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

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#c3c4c7] text-left">
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
                  <td colSpan={3} className="p-6 text-center text-[#50575e]">
                    Tidak ada data pada bulan yang dipilih.
                  </td>
                </tr>
              ) : (
                (tab === 'birthdays' ? birthdaysByMonth : anniversariesByMonth).map((j) => (
                  <tr key={j.id}>
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
      )}
    </div>
  );
}
