import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { DEFAULT_WIJK, fetchPublicWijk } from '../../lib/publicData';
import type { KehadiranRecord, Wijk } from '../../types/cms';

const SERVICE_TYPE_LABELS: Record<KehadiranRecord['service_type'], string> = {
  minggu_pagi: 'Ibadah Minggu Pagi',
  minggu_siang: 'Ibadah Minggu Siang',
  minggu_sore: 'Ibadah Minggu Sore',
  phd: 'PHD Lingkungan (Wijk)',
  khusus: 'Ibadah Khusus / Hari Raya',
};

export function AttendancePage() {
  const { profile } = useAuth();
  const { addNotice } = useAdmin();

  const [records, setRecords] = useState<KehadiranRecord[]>([]);
  const [wijkList, setWijkList] = useState<Wijk[]>(DEFAULT_WIJK);
  const [loading, setLoading] = useState(true);

  const [serviceType, setServiceType] =
    useState<KehadiranRecord['service_type']>('minggu_siang');
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [wijkId, setWijkId] = useState('');
  const [men, setMen] = useState(0);
  const [women, setWomen] = useState(0);
  const [youth, setYouth] = useState(0);
  const [children, setChildren] = useState(0);
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    const wks = await fetchPublicWijk();
    setWijkList(wks);

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('kehadiran')
      .select('*, wijk:wijk(id, name)')
      .order('service_date', { ascending: false });

    setLoading(false);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setRecords((data as KehadiranRecord[]) || []);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalPreview = men + women + youth + children;

  const summary = useMemo(() => {
    const sum = records.reduce((acc, r) => acc + (r.total_count || 0), 0);
    const avg = records.length > 0 ? Math.round(sum / records.length) : 0;
    return { count: records.length, sum, avg };
  }, [records]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      addNotice({ type: 'warning', message: 'Hubungkan Supabase untuk mencatat kehadiran.' });
      return;
    }

    const { error } = await supabase.from('kehadiran').insert({
      service_type: serviceType,
      service_date: serviceDate,
      wijk_id: serviceType === 'phd' && wijkId ? wijkId : null,
      men_count: men,
      women_count: women,
      youth_count: youth,
      children_count: children,
      notes: notes.trim(),
      recorded_by: profile?.id || null,
    });

    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      addNotice({ type: 'success', message: 'Data kehadiran ibadah berhasil dicatat.' });
      setMen(0);
      setWomen(0);
      setYouth(0);
      setChildren(0);
      setNotes('');
      void loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('kehadiran').delete().eq('id', id);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      addNotice({ type: 'success', message: 'Catatan kehadiran dihapus.' });
    }
  };

  return (
    <div className="pt-4 text-[13px]">
      <h1 className="text-[23px] font-normal text-[#1d2327] mb-4">Kehadiran Ibadah</h1>

      {/* Ringkasan Angka */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-[#c3c4c7] p-4">
          <p className="text-[12px] text-[#50575e]">Total Kebaktian Tercatat</p>
          <p className="text-2xl font-semibold text-[#1d2327] tabular-nums mt-1">
            {summary.count}
          </p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-4">
          <p className="text-[12px] text-[#50575e]">Akumulasi Kehadiran Jemaat</p>
          <p className="text-2xl font-semibold text-[#2271b1] tabular-nums mt-1">
            {summary.sum.toLocaleString('id-ID')} jiwa
          </p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-4">
          <p className="text-[12px] text-[#50575e]">Rata-rata per Kebaktian</p>
          <p className="text-2xl font-semibold text-[#1d2327] tabular-nums mt-1">
            {summary.avg.toLocaleString('id-ID')} jiwa
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-4 bg-white border border-[#c3c4c7] p-4 space-y-3"
        >
          <h2 className="font-semibold text-[14px] text-[#1d2327]">
            Catat Kehadiran Baru
          </h2>
          <div>
            <label className="block text-[#50575e] mb-1">Jenis Kebaktian</label>
            <select
              value={serviceType}
              onChange={(e) =>
                setServiceType(e.target.value as KehadiranRecord['service_type'])
              }
              className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
            >
              {Object.entries(SERVICE_TYPE_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[#50575e] mb-1">Tanggal Kebaktian</label>
            <input
              type="date"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
            />
          </div>
          {serviceType === 'phd' && (
            <div>
              <label className="block text-[#50575e] mb-1">Lingkungan (Wijk)</label>
              <select
                value={wijkId}
                onChange={(e) => setWijkId(e.target.value)}
                className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
              >
                <option value="">-- Pilih Wijk --</option>
                {wijkList.map((w) => (
                  <option key={w.id} value={w.id}>
                    Wijk {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[#50575e] mb-1">Ama (Laki-laki)</label>
              <input
                type="number"
                min={0}
                value={men}
                onChange={(e) => setMen(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Ina (Perempuan)</label>
              <input
                type="number"
                min={0}
                value={women}
                onChange={(e) => setWomen(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Naposo / Remaja</label>
              <input
                type="number"
                min={0}
                value={youth}
                onChange={(e) => setYouth(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Sekolah Minggu</label>
              <input
                type="number"
                min={0}
                value={children}
                onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px] tabular-nums"
              />
            </div>
          </div>
          <div className="p-2.5 bg-[#f6f7f7] border border-[#dcdcde] flex items-center justify-between">
            <span className="font-medium text-[#1d2327]">Total Kehadiran:</span>
            <strong className="text-[15px] text-[#2271b1] tabular-nums">
              {totalPreview} orang
            </strong>
          </div>
          <div>
            <label className="block text-[#50575e] mb-1">Catatan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Simpan Kehadiran</span>
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-[#c3c4c7] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#c3c4c7] text-left">
                <th className="p-2.5 font-semibold">Tanggal</th>
                <th className="p-2.5 font-semibold">Kebaktian</th>
                <th className="p-2.5 font-semibold text-right">Ama</th>
                <th className="p-2.5 font-semibold text-right">Ina</th>
                <th className="p-2.5 font-semibold text-right">NHKBP</th>
                <th className="p-2.5 font-semibold text-right">ASM</th>
                <th className="p-2.5 font-semibold text-right">Total</th>
                <th className="p-2.5 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f1]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-[#50575e]">
                    Memuat data kehadiran...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-[#50575e]">
                    Belum ada catatan kehadiran ibadah.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#f6f7f7]">
                    <td className="p-2.5 tabular-nums whitespace-nowrap">
                      {r.service_date}
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium text-[#1d2327]">
                        {SERVICE_TYPE_LABELS[r.service_type]}
                      </div>
                      {r.wijk?.name && (
                        <div className="text-[11px] text-[#50575e]">
                          Wijk {r.wijk.name}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">{r.men_count}</td>
                    <td className="p-2.5 text-right tabular-nums">{r.women_count}</td>
                    <td className="p-2.5 text-right tabular-nums">{r.youth_count}</td>
                    <td className="p-2.5 text-right tabular-nums">{r.children_count}</td>
                    <td className="p-2.5 text-right font-semibold text-[#2271b1] tabular-nums">
                      {r.total_count}
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
