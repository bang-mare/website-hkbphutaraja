import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { DEFAULT_WIJK, fetchPublicWijk } from '../../lib/publicData';
import type { IbadahMinggu, PhdLingkungan, Wijk } from '../../types/cms';

export function ScheduleAdminPage({ mode }: { mode: 'minggu' | 'phd' }) {
  const { addNotice } = useAdmin();

  const [wijkList, setWijkList] = useState<Wijk[]>(DEFAULT_WIJK);
  const [ibadahList, setIbadahList] = useState<IbadahMinggu[]>([]);
  const [phdList, setPhdList] = useState<PhdLingkungan[]>([]);
  const [loading, setLoading] = useState(true);

  // Ibadah Minggu form
  const [editIbadahId, setEditIbadahId] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTime, setServiceTime] = useState('10:30');
  const [title, setTitle] = useState('Kebaktian Minggu Siang');
  const [liturgicalWeek, setLiturgicalWeek] = useState('');
  const [preacher, setPreacher] = useState('');
  const [liturgist, setLiturgist] = useState('');
  const [organist, setOrganist] = useState('');
  const [songLeader, setSongLeader] = useState('');
  const [bibleReading, setBibleReading] = useState('');
  const [theme, setTheme] = useState('');

  // PHD Lingkungan form
  const [editPhdId, setEditPhdId] = useState<string | null>(null);
  const [phdWijkId, setPhdWijkId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Rabu');
  const [phdTime, setPhdTime] = useState('19:00');
  const [nextDate, setNextDate] = useState('');
  const [hostFamily, setHostFamily] = useState('');
  const [hostAddress, setHostAddress] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [topic, setTopic] = useState('');

  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const wks = await fetchPublicWijk();
    setWijkList(wks);
    if (!phdWijkId && wks[0]) setPhdWijkId(wks[0].id);

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    if (mode === 'minggu') {
      const { data } = await supabase
        .from('ibadah_minggu')
        .select('*')
        .order('service_date', { ascending: false });
      setIbadahList((data as IbadahMinggu[]) || []);
    } else {
      const { data } = await supabase
        .from('phd_lingkungan')
        .select('*, wijk:wijk(id, name, sort_order)')
        .order('day_of_week', { ascending: true });
      setPhdList((data as PhdLingkungan[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [mode]);

  const resetIbadahForm = () => {
    setEditIbadahId(null);
    setServiceDate('');
    setServiceTime('10:30');
    setTitle('Kebaktian Minggu Siang');
    setLiturgicalWeek('');
    setPreacher('');
    setLiturgist('');
    setOrganist('');
    setSongLeader('');
    setBibleReading('');
    setTheme('');
  };

  const handleSaveIbadah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceDate || !title.trim()) return;
    setSaving(true);
    const payload = {
      service_date: serviceDate,
      service_time: serviceTime,
      title: title.trim(),
      liturgical_week: liturgicalWeek.trim(),
      preacher: preacher.trim(),
      liturgist: liturgist.trim(),
      organist: organist.trim(),
      song_leader: songLeader.trim(),
      bible_reading: bibleReading.trim(),
      theme: theme.trim(),
      notes: '',
    };

    if (!isSupabaseConfigured || !supabase) {
      setSaving(false);
      addNotice({ type: 'success', message: 'Jadwal Ibadah Minggu disimpan (Pratinjau).' });
      return;
    }

    const { error } = editIbadahId
      ? await supabase.from('ibadah_minggu').update(payload).eq('id', editIbadahId)
      : await supabase.from('ibadah_minggu').insert(payload);

    setSaving(false);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      addNotice({ type: 'success', message: 'Jadwal Ibadah Minggu disimpan.' });
      resetIbadahForm();
      void loadData();
    }
  };

  const handleDeleteIbadah = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('ibadah_minggu').delete().eq('id', id);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setIbadahList((prev) => prev.filter((x) => x.id !== id));
      addNotice({ type: 'success', message: 'Jadwal ibadah dihapus.' });
    }
  };

  const resetPhdForm = () => {
    setEditPhdId(null);
    setDayOfWeek('Rabu');
    setPhdTime('19:00');
    setNextDate('');
    setHostFamily('');
    setHostAddress('');
    setLeaderName('');
    setTopic('');
  };

  const handleSavePhd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phdWijkId || !hostFamily.trim()) return;
    setSaving(true);
    const payload = {
      wijk_id: phdWijkId,
      day_of_week: dayOfWeek,
      service_time: phdTime,
      next_date: nextDate || null,
      host_family: hostFamily.trim(),
      host_address: hostAddress.trim(),
      leader_name: leaderName.trim(),
      topic: topic.trim(),
      notes: '',
    };

    if (!isSupabaseConfigured || !supabase) {
      setSaving(false);
      addNotice({ type: 'success', message: 'Jadwal PHD Lingkungan disimpan (Pratinjau).' });
      return;
    }

    const { error } = editPhdId
      ? await supabase.from('phd_lingkungan').update(payload).eq('id', editPhdId)
      : await supabase.from('phd_lingkungan').insert(payload);

    setSaving(false);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      addNotice({ type: 'success', message: 'Jadwal PHD Lingkungan diperbarui.' });
      resetPhdForm();
      void loadData();
    }
  };

  const handleDeletePhd = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('phd_lingkungan').delete().eq('id', id);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setPhdList((prev) => prev.filter((x) => x.id !== id));
      addNotice({ type: 'success', message: 'Jadwal PHD dihapus.' });
    }
  };

  return (
    <div className="pt-4 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-[23px] font-normal text-[#1d2327]">
          {mode === 'minggu' ? 'Jadwal Ibadah Minggu' : 'PHD Lingkungan (6 Wijk)'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/jadwal"
            className={`px-3 py-1.5 border rounded-[3px] ${
              mode === 'minggu'
                ? 'bg-[#2271b1] border-[#2271b1] text-white'
                : 'bg-white border-[#c3c4c7] text-[#1d2327]'
            }`}
          >
            Ibadah Minggu
          </Link>
          <Link
            to="/admin/jadwal/phd"
            className={`px-3 py-1.5 border rounded-[3px] ${
              mode === 'phd'
                ? 'bg-[#2271b1] border-[#2271b1] text-white'
                : 'bg-white border-[#c3c4c7] text-[#1d2327]'
            }`}
          >
            PHD Lingkungan
          </Link>
        </div>
      </div>

      {mode === 'minggu' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSaveIbadah}
            className="lg:col-span-4 bg-white border border-[#c3c4c7] p-4 space-y-3"
          >
            <h2 className="font-semibold text-[14px] text-[#1d2327]">
              {editIbadahId ? 'Edit Jadwal Ibadah' : 'Tambah Jadwal Ibadah Minggu'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#50575e] mb-1">Tanggal *</label>
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Jam (WIB) *</label>
                <input
                  type="time"
                  required
                  value={serviceTime}
                  onChange={(e) => setServiceTime(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Nama Kebaktian *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Minggu Liturgi (Almanak HKBP)</label>
              <input
                type="text"
                value={liturgicalWeek}
                onChange={(e) => setLiturgicalWeek(e.target.value)}
                placeholder="Mis. Minggu Trinitatis / Advent I"
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#50575e] mb-1">Pengkhotbah (Parjamita)</label>
                <input
                  type="text"
                  value={preacher}
                  onChange={(e) => setPreacher(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Liturgis (Paragenda)</label>
                <input
                  type="text"
                  value={liturgist}
                  onChange={(e) => setLiturgist(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#50575e] mb-1">Organis / Musik</label>
                <input
                  type="text"
                  value={organist}
                  onChange={(e) => setOrganist(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Song Leader</label>
                <input
                  type="text"
                  value={songLeader}
                  onChange={(e) => setSongLeader(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Nats Khotbah &amp; Epistel</label>
              <input
                type="text"
                value={bibleReading}
                onChange={(e) => setBibleReading(e.target.value)}
                placeholder="Mis. Mazmur 23:1-6"
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Tema Ibadah</label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{editIbadahId ? 'Perbarui Jadwal' : 'Simpan Jadwal'}</span>
              </button>
              {editIbadahId && (
                <button
                  type="button"
                  onClick={resetIbadahForm}
                  className="px-3 py-1.5 text-[#50575e] cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 min-w-0 bg-white border border-[#c3c4c7] overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse">
              <thead>
                <tr className="border-b border-[#c3c4c7] text-left">
                  <th className="p-2.5 font-semibold">Tanggal &amp; Jam</th>
                  <th className="p-2.5 font-semibold">Kebaktian</th>
                  <th className="p-2.5 font-semibold">Petugas</th>
                  <th className="p-2.5 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f1]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[#50575e]">
                      Memuat jadwal ibadah...
                    </td>
                  </tr>
                ) : ibadahList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[#50575e]">
                      Belum ada jadwal ibadah Minggu tercatat.
                    </td>
                  </tr>
                ) : (
                  ibadahList.map((row) => (
                    <tr key={row.id} className="hover:bg-[#f6f7f7]">
                      <td className="p-2.5 tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-[#1d2327]">
                          {row.service_date}
                        </div>
                        <div className="text-[12px] text-[#50575e]">
                          {row.service_time.slice(0, 5)} WIB
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-[#1d2327]">{row.title}</div>
                        <div className="text-[12px] text-[#50575e]">
                          {row.liturgical_week} {row.bible_reading ? `· ${row.bible_reading}` : ''}
                        </div>
                      </td>
                      <td className="p-2.5 text-[12px] text-[#3c434a]">
                        <div>Khotbah: {row.preacher || '-'}</div>
                        <div>Agenda: {row.liturgist || '-'}</div>
                      </td>
                      <td className="p-2.5 whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditIbadahId(row.id);
                            setServiceDate(row.service_date);
                            setServiceTime(row.service_time.slice(0, 5));
                            setTitle(row.title);
                            setLiturgicalWeek(row.liturgical_week);
                            setPreacher(row.preacher);
                            setLiturgist(row.liturgist);
                            setOrganist(row.organist);
                            setSongLeader(row.song_leader);
                            setBibleReading(row.bible_reading);
                            setTheme(row.theme);
                          }}
                          className="text-[#2271b1] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteIbadah(row.id)}
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSavePhd}
            className="lg:col-span-4 bg-white border border-[#c3c4c7] p-4 space-y-3"
          >
            <h2 className="font-semibold text-[14px] text-[#1d2327]">
              {editPhdId ? 'Edit Tuan Rumah PHD' : 'Tambah / Atur PHD Lingkungan'}
            </h2>
            <div>
              <label className="block text-[#50575e] mb-1">Lingkungan (Wijk) *</label>
              <select
                value={phdWijkId}
                onChange={(e) => setPhdWijkId(e.target.value)}
                className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
              >
                {wijkList.map((w) => (
                  <option key={w.id} value={w.id}>
                    Wijk {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#50575e] mb-1">Hari Tetap</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                >
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#50575e] mb-1">Jam (WIB)</label>
                <input
                  type="time"
                  value={phdTime}
                  onChange={(e) => setPhdTime(e.target.value)}
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Tanggal PHD Minggu Ini</label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Keluarga Tuan Rumah *</label>
              <input
                type="text"
                required
                value={hostFamily}
                onChange={(e) => setHostFamily(e.target.value)}
                placeholder="Mis. Kel. St. R. Simanjuntak / br. Purba"
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Alamat Tuan Rumah</label>
              <input
                type="text"
                value={hostAddress}
                onChange={(e) => setHostAddress(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Pelayan / Pembawa Renungan</label>
              <input
                type="text"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Topik / Bahan PHD</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[2px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>{editPhdId ? 'Perbarui PHD' : 'Simpan Jadwal PHD'}</span>
              </button>
              {editPhdId && (
                <button
                  type="button"
                  onClick={resetPhdForm}
                  className="px-3 py-1.5 text-[#50575e] cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 min-w-0 bg-white border border-[#c3c4c7] overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse">
              <thead>
                <tr className="border-b border-[#c3c4c7] text-left">
                  <th className="p-2.5 font-semibold">Wijk</th>
                  <th className="p-2.5 font-semibold">Hari &amp; Jam</th>
                  <th className="p-2.5 font-semibold">Tuan Rumah &amp; Alamat</th>
                  <th className="p-2.5 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f1]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[#50575e]">
                      Memuat jadwal PHD...
                    </td>
                  </tr>
                ) : phdList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[#50575e]">
                      Belum ada data PHD Lingkungan. Tambahkan dari formulir di sebelah kiri.
                    </td>
                  </tr>
                ) : (
                  phdList.map((row) => (
                    <tr key={row.id} className="hover:bg-[#f6f7f7]">
                      <td className="p-2.5 font-semibold text-[#1d2327]">
                        Wijk {row.wijk?.name || '-'}
                      </td>
                      <td className="p-2.5 tabular-nums">
                        <div>
                          {row.day_of_week}, {row.service_time.slice(0, 5)} WIB
                        </div>
                        {row.next_date && (
                          <div className="text-[11px] text-[#50575e]">{row.next_date}</div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <div className="font-medium text-[#1d2327]">{row.host_family}</div>
                        <div className="text-[12px] text-[#50575e]">
                          {row.host_address} {row.leader_name ? `· Pelayan: ${row.leader_name}` : ''}
                        </div>
                      </td>
                      <td className="p-2.5 whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditPhdId(row.id);
                            setPhdWijkId(row.wijk_id);
                            setDayOfWeek(row.day_of_week);
                            setPhdTime(row.service_time.slice(0, 5));
                            setNextDate(row.next_date || '');
                            setHostFamily(row.host_family);
                            setHostAddress(row.host_address);
                            setLeaderName(row.leader_name);
                            setTopic(row.topic);
                          }}
                          className="text-[#2271b1] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeletePhd(row.id)}
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
      )}
    </div>
  );
}
