import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import {
  deleteWidgetRecord,
  fetchWidgets,
  saveWidgetRecord,
} from '../../lib/publicData';
import type { WidgetArea, WidgetRecord } from '../../types/cms';

const AREAS: Array<{ id: WidgetArea; label: string; desc: string }> = [
  { id: 'footer_1', label: 'Footer Kolom 1 (Kiri)', desc: 'Profil singkat gereja di footer website.' },
  { id: 'footer_2', label: 'Footer Kolom 2 (Tengah)', desc: 'Jadwal ibadah atau informasi kontak di footer.' },
  { id: 'sidebar', label: 'Sidebar Berita & Warta', desc: 'Ditampilkan di sisi kanan halaman blog & warta.' },
];

const WIDGET_TYPES: Array<{ type: WidgetRecord['widget_type']; label: string }> = [
  { type: 'text', label: 'Teks / Pengumuman' },
  { type: 'schedule', label: 'Jadwal Ibadah Ringkas' },
  { type: 'contact', label: 'Kontak Sekretariat' },
  { type: 'recent_posts', label: 'Pos Terbaru' },
];

export function WidgetsPage() {
  const { addNotice } = useAdmin();

  const [widgets, setWidgets] = useState<WidgetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Add widget form
  const [newArea, setNewArea] = useState<WidgetArea>('footer_1');
  const [newType, setNewType] = useState<WidgetRecord['widget_type']>('text');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const loadWidgets = async () => {
    setLoading(true);
    const list = await fetchWidgets();
    setWidgets(list);
    setLoading(false);
  };

  useEffect(() => {
    void loadWidgets();
  }, []);

  const handleAddWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const areaCount = widgets.filter((w) => w.area === newArea).length;
    const { error } = await saveWidgetRecord({
      area: newArea,
      widget_type: newType,
      title: newTitle.trim(),
      config: { body: newBody.trim() },
      sort_order: areaCount + 1,
      is_active: true,
    });
    if (error) {
      addNotice({ type: 'error', message: error });
      return;
    }
    setNewTitle('');
    setNewBody('');
    addNotice({ type: 'success', message: 'Widget ditambahkan.' });
    void loadWidgets();
  };

  const handleUpdateWidget = async (w: WidgetRecord) => {
    const { error } = await saveWidgetRecord(w);
    if (error) {
      addNotice({ type: 'error', message: error });
    } else {
      addNotice({ type: 'success', message: `Widget "${w.title}" diperbarui.` });
    }
  };

  const handleDeleteWidget = async (id: string) => {
    const { error } = await deleteWidgetRecord(id);
    if (error) {
      addNotice({ type: 'error', message: error });
    } else {
      setWidgets((prev) => prev.filter((w) => w.id !== id));
      addNotice({ type: 'success', message: 'Widget dihapus.' });
    }
  };

  const moveWidget = async (areaWidgets: WidgetRecord[], idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= areaWidgets.length) return;
    const a = areaWidgets[idx];
    const b = areaWidgets[target];
    await Promise.all([
      saveWidgetRecord({ ...a, sort_order: b.sort_order }),
      saveWidgetRecord({ ...b, sort_order: a.sort_order }),
    ]);
    void loadWidgets();
  };

  return (
    <div className="pt-4 text-[13px]">
      <h1 className="text-[23px] font-normal text-[#1d2327] mb-4">Widget</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form Tambah Widget */}
        <div className="lg:col-span-4 bg-white border border-[#c3c4c7]">
          <div className="px-4 py-2.5 border-b border-[#c3c4c7] bg-[#f6f7f7] font-semibold">
            Tambah Widget Baru
          </div>
          <form onSubmit={handleAddWidget} className="p-4 space-y-3">
            <div>
              <label className="block text-[#50575e] mb-1">Area Widget</label>
              <select
                value={newArea}
                onChange={(e) => setNewArea(e.target.value as WidgetArea)}
                className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                {AREAS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Tipe Widget</label>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as WidgetRecord['widget_type'])
                }
                className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                {WIDGET_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Judul Widget</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Mis. Jadwal Pelayanan"
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block text-[#50575e] mb-1">Isi / Teks Widget</label>
              <textarea
                rows={4}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Tulis informasi yang ditampilkan pada widget..."
                className="w-full p-2 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambahkan Widget</span>
            </button>
          </form>
        </div>

        {/* Daftar Area Widget */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <div className="bg-white border border-[#c3c4c7] p-6 text-center text-[#50575e]">
              Memuat widget...
            </div>
          ) : (
            AREAS.map((area) => {
              const areaWidgets = widgets
                .filter((w) => w.area === area.id)
                .sort((a, b) => a.sort_order - b.sort_order);

              return (
                <div key={area.id} className="bg-white border border-[#c3c4c7]">
                  <div className="px-4 py-2.5 border-b border-[#c3c4c7] bg-[#f6f7f7]">
                    <h2 className="font-semibold text-[#1d2327]">{area.label}</h2>
                    <p className="text-[12px] text-[#50575e]">{area.desc}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {areaWidgets.length === 0 ? (
                      <p className="text-[#50575e] text-[12px]">
                        Belum ada widget pada area ini.
                      </p>
                    ) : (
                      areaWidgets.map((w, idx) => (
                        <div
                          key={w.id}
                          className="border border-[#c3c4c7] bg-[#f6f7f7] p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={w.title}
                              onChange={(e) =>
                                setWidgets((prev) =>
                                  prev.map((x) =>
                                    x.id === w.id ? { ...x, title: e.target.value } : x
                                  )
                                )
                              }
                              className="flex-1 h-7 px-2 bg-white border border-[#8c8f94] rounded-[2px] font-semibold"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => void moveWidget(areaWidgets, idx, -1)}
                                className="p-1 bg-white border border-[#c3c4c7] rounded disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === areaWidgets.length - 1}
                                onClick={() => void moveWidget(areaWidgets, idx, 1)}
                                className="p-1 bg-white border border-[#c3c4c7] rounded disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteWidget(w.id)}
                                className="p-1 bg-white border border-[#c3c4c7] text-[#d63638] rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={String(w.config?.body || '')}
                            onChange={(e) =>
                              setWidgets((prev) =>
                                prev.map((x) =>
                                  x.id === w.id
                                    ? { ...x, config: { ...x.config, body: e.target.value } }
                                    : x
                                )
                              )
                            }
                            className="w-full p-2 bg-white border border-[#8c8f94] rounded-[2px]"
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => void handleUpdateWidget(w)}
                              className="px-3 py-1 bg-[#2271b1] text-white text-[12px] rounded-[2px] cursor-pointer"
                            >
                              Simpan Widget
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
