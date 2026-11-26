import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Lock, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { KeuanganRecord } from '../../types/cms';

const CATEGORIES = [
  { name: 'Persembahan Ibadah Minggu (Pelean Ia/Ib/II)', excluded: false },
  { name: 'Persembahan PHD Lingkungan / Sektor', excluded: false },
  { name: 'Ucapan Syukur (Hamauliateon)', excluded: false },
  { name: 'Perpuluhan Jemaat', excluded: false },
  { name: 'Diakonia Sosial', excluded: true },
  { name: 'Beasiswa Jemaat', excluded: true },
  { name: 'Pembangunan Fisik Lokal Huria', excluded: true },
  { name: 'Operasional & Pengeluaran Huria', excluded: true },
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function FinancePage() {
  const { profile } = useAuth();
  const { addNotice } = useAdmin();

  const [records, setRecords] = useState<KeuanganRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Form transaksi
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [isExcluded, setIsExcluded] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');

  const loadData = async () => {
    setLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      addNotice({
        type: 'error',
        message: 'Penyimpanan lokal dinonaktifkan. Hubungkan Supabase untuk memuat transaksi keuangan.',
      });
      return;
    }

    const { data, error } = await supabase
      .from('keuangan')
      .select('*')
      .order('transaction_date', { ascending: false });

    setLoading(false);
    if (error) {
      addNotice({ type: 'error', message: `Gagal memuat keuangan: ${error.message}` });
    } else {
      setRecords((data as KeuanganRecord[]) || []);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Hitung 55% Pusat / 45% Huria (kecuali sosial, beasiswa, pembangunan fisik lokal, atau pengeluaran)
  const calculatedShares = useMemo(() => {
    if (txType === 'pengeluaran' || isExcluded) {
      return {
        center: 0,
        church: txType === 'pemasukan' ? amount : 0,
      };
    }
    const center = Math.round(amount * 0.55);
    const church = amount - center;
    return { center, church };
  }, [txType, isExcluded, amount]);

  const filteredRecords = useMemo(() => {
    if (!monthFilter) return records;
    return records.filter((r) => r.transaction_date.startsWith(monthFilter));
  }, [records, monthFilter]);

  const totals = useMemo(() => {
    let pemasukan = 0;
    let pengeluaran = 0;
    let pusat55 = 0;
    let huria45 = 0;

    filteredRecords.forEach((r) => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'pemasukan') {
        pemasukan += amt;
        pusat55 += Number(r.center_share_amount) || 0;
        huria45 += Number(r.church_share_amount) || 0;
      } else {
        pengeluaran += amt;
      }
    });

    return {
      pemasukan,
      pengeluaran,
      pusat55,
      huria45,
      saldoHuria: huria45 - pengeluaran,
    };
  }, [filteredRecords]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      addNotice({ type: 'warning', message: 'Nominal transaksi harus lebih dari 0.' });
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      addNotice({
        type: 'error',
        message: 'Penyimpanan lokal dinonaktifkan. Hubungkan Supabase untuk menyimpan transaksi keuangan.',
      });
      return;
    }

    const { error } = await supabase.from('keuangan').insert({
      transaction_date: txDate,
      type: txType,
      category,
      description: description.trim(),
      amount,
      is_excluded_from_split: txType === 'pengeluaran' ? true : isExcluded,
      center_share_amount: calculatedShares.center,
      church_share_amount: calculatedShares.church,
      reference_no: referenceNo.trim(),
      recorded_by: profile?.id || null,
    });

    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      addNotice({ type: 'success', message: 'Transaksi keuangan berhasil dicatat.' });
      setDescription('');
      setAmount(0);
      setReferenceNo('');
      void loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      addNotice({
        type: 'error',
        message: 'Penyimpanan lokal dinonaktifkan. Hubungkan Supabase untuk menghapus transaksi.',
      });
      return;
    }
    const { error } = await supabase.from('keuangan').delete().eq('id', id);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      addNotice({ type: 'success', message: 'Transaksi dihapus.' });
    }
  };

  const handleExportXlsx = () => {
    const rows = filteredRecords.map((r) => ({
      Tanggal: r.transaction_date,
      Jenis: r.type,
      Kategori: r.category,
      Keterangan: r.description,
      Nominal: r.amount,
      Dikecualikan_55_45: r.is_excluded_from_split ? 'Ya' : 'Tidak',
      Setoran_Pusat_55: r.center_share_amount,
      Kas_Huria_45: r.church_share_amount,
      No_Bukti: r.reference_no,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Keuangan_Huria');
    XLSX.writeFile(wb, `Laporan_Keuangan_HKBP_Hutaraja_${monthFilter || 'Semua'}.xlsx`);
  };

  return (
    <div className="pt-4 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[23px] font-normal text-[#1d2327]">
            Keuangan Huria (55% Pusat / 45% Huria)
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-[#fcf0f1] border border-[#d63638]/40 text-[#8a2424] rounded-[2px]">
            <Lock className="w-3 h-3" />
            Khusus Admin &amp; Pendeta
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-9 sm:h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
          />
          <button
            type="button"
            onClick={handleExportXlsx}
            className="inline-flex items-center gap-1.5 h-9 sm:h-8 px-3 bg-white border border-[#c3c4c7] hover:bg-[#f6f7f7] rounded-[3px] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor XLSX</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Keuangan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div className="bg-white border border-[#c3c4c7] p-3.5">
          <p className="text-[11px] text-[#50575e]">Total Pemasukan</p>
          <p className="text-lg font-semibold text-[#1d2327] tabular-nums mt-0.5">
            {formatRupiah(totals.pemasukan)}
          </p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5">
          <p className="text-[11px] text-[#50575e]">Setoran ke Pusat (55%)</p>
          <p className="text-lg font-semibold text-[#9A3412] tabular-nums mt-0.5">
            {formatRupiah(totals.pusat55)}
          </p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5">
          <p className="text-[11px] text-[#50575e]">Bagian Huria (45% + Khusus)</p>
          <p className="text-lg font-semibold text-[#2271b1] tabular-nums mt-0.5">
            {formatRupiah(totals.huria45)}
          </p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5">
          <p className="text-[11px] text-[#50575e]">Total Pengeluaran Huria</p>
          <p className="text-lg font-semibold text-[#d63638] tabular-nums mt-0.5">
            {formatRupiah(totals.pengeluaran)}
          </p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5">
          <p className="text-[11px] text-[#50575e]">Saldo Bersih Kas Huria</p>
          <p className="text-lg font-semibold text-[#00a32a] tabular-nums mt-0.5">
            {formatRupiah(totals.saldoHuria)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-4 bg-white border border-[#c3c4c7] p-4 space-y-3"
        >
          <h2 className="font-semibold text-[14px] text-[#1d2327]">
            Catat Transaksi Keuangan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[#50575e] mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Jenis</label>
              <select
                value={txType}
                onChange={(e) =>
                  setTxType(e.target.value as 'pemasukan' | 'pengeluaran')
                }
                className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
              >
                <option value="pemasukan">Pemasukan</option>
                <option value="pengeluaran">Pengeluaran</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#50575e] mb-1">Kategori Pos</label>
            <select
              value={category}
              onChange={(e) => {
                const chosen = CATEGORIES.find((c) => c.name === e.target.value);
                setCategory(e.target.value);
                if (chosen) setIsExcluded(chosen.excluded);
              }}
              className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#50575e] mb-1">Nominal (Rp) *</label>
            <input
              type="number"
              min={0}
              required
              value={amount || ''}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px] tabular-nums"
            />
          </div>

          {txType === 'pemasukan' && (
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isExcluded}
                  onChange={(e) => setIsExcluded(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[12px] text-[#3c434a]">
                  Kecualikan dari pembagian 55% Pusat (khusus Pos Sosial, Beasiswa, &amp; Pembangunan Fisik Lokal — 100% di Huria)
                </span>
              </label>

              <div className="p-2.5 bg-[#f6f7f7] border border-[#dcdcde] text-[12px] space-y-1">
                <div className="flex justify-between">
                  <span>Bagian Pusat ({isExcluded ? '0%' : '55%'}):</span>
                  <strong className="tabular-nums text-[#9A3412]">
                    {formatRupiah(calculatedShares.center)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Tetap di Huria ({isExcluded ? '100%' : '45%'}):</span>
                  <strong className="tabular-nums text-[#2271b1]">
                    {formatRupiah(calculatedShares.church)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#50575e] mb-1">Keterangan Transaksi</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mis. Pelean Minggu Siang Wijk Letare"
              className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
            />
          </div>

          <div>
            <label className="block text-[#50575e] mb-1">No. Bukti / Referensi</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Simpan Transaksi</span>
          </button>
        </form>

        <div className="lg:col-span-8 min-w-0 bg-white border border-[#c3c4c7] overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-[#c3c4c7] text-left">
                <th className="p-2.5 font-semibold">Tanggal</th>
                <th className="p-2.5 font-semibold">Kategori &amp; Keterangan</th>
                <th className="p-2.5 font-semibold text-right">Nominal</th>
                <th className="p-2.5 font-semibold text-right">Pusat 55%</th>
                <th className="p-2.5 font-semibold text-right">Huria 45%</th>
                <th className="p-2.5 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f1]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#50575e]">
                    Memuat transaksi keuangan...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#50575e]">
                    Belum ada transaksi pada bulan ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#f6f7f7]">
                    <td className="p-2.5 tabular-nums whitespace-nowrap">
                      {r.transaction_date}
                    </td>
                    <td className="p-2.5">
                      <div className="font-semibold text-[#1d2327]">{r.category}</div>
                      <div className="text-[12px] text-[#50575e]">
                        {r.description || '-'}
                        {r.is_excluded_from_split && r.type === 'pemasukan' && (
                          <span className="ml-1.5 text-[11px] text-[#2271b1]">
                            (Dikecualikan 100% Huria)
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`p-2.5 text-right font-semibold tabular-nums whitespace-nowrap ${
                        r.type === 'pengeluaran' ? 'text-[#d63638]' : 'text-[#1d2327]'
                      }`}
                    >
                      {r.type === 'pengeluaran' ? '- ' : ''}
                      {formatRupiah(Number(r.amount))}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-[#9A3412] whitespace-nowrap">
                      {formatRupiah(Number(r.center_share_amount))}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-[#2271b1] whitespace-nowrap">
                      {formatRupiah(Number(r.church_share_amount))}
                    </td>
                    <td className="p-2.5">
                      <button
                        type="button"
                        onClick={() => void handleDelete(r.id)}
                        className="text-[#d63638] hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
