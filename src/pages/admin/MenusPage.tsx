import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Indent,
  Outdent,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { fetchPostsByType, fetchTerms } from '../../lib/cmsData';
import {
  createMenuRecord,
  fetchMenusAndItems,
  saveMenuStructure,
} from '../../lib/publicData';
import { slugify } from '../../lib/blocks';
import type {
  MenuItemRecord,
  MenuLocation,
  MenuRecord,
  PostRecord,
  Term,
} from '../../types/cms';

interface EditableMenuItem {
  localId: string;
  parentLocalId: string | null;
  title: string;
  item_type: 'page' | 'post' | 'custom' | 'category';
  object_id: string | null;
  url: string;
  target: string;
}

export function MenusPage() {
  const { addNotice } = useAdmin();

  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [allItems, setAllItems] = useState<MenuItemRecord[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>('');
  const [location, setLocation] = useState<MenuLocation | ''>('header');
  const [editableItems, setEditableItems] = useState<EditableMenuItem[]>([]);

  // Sources
  const [pages, setPages] = useState<PostRecord[]>([]);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [categories, setCategories] = useState<Term[]>([]);
  const [checkedPages, setCheckedPages] = useState<string[]>([]);
  const [checkedPosts, setCheckedPosts] = useState<string[]>([]);
  const [checkedCats, setCheckedCats] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [customUrl, setCustomUrl] = useState('/');

  // Create menu
  const [newMenuName, setNewMenuName] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetchMenusAndItems(),
      fetchPostsByType('page'),
      fetchPostsByType('post'),
      fetchTerms('category'),
    ]).then(([menuRes, pagesRes, postsRes, catRes]) => {
      setMenus(menuRes.menus);
      setAllItems(menuRes.items);
      setPages(pagesRes.posts.filter((p) => p.status === 'publish'));
      setPosts(postsRes.posts.filter((p) => p.status === 'publish'));
      setCategories(catRes);
      if (menuRes.menus.length > 0) {
        setSelectedMenuId(menuRes.menus[0].id);
      }
    });
  }, []);

  useEffect(() => {
    const activeMenu = menus.find((m) => m.id === selectedMenuId);
    if (!activeMenu) return;
    setLocation(activeMenu.location || '');
    const menuItems = allItems
      .filter((i) => i.menu_id === activeMenu.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    setEditableItems(
      menuItems.map((m) => ({
        localId: m.id,
        parentLocalId: m.parent_id,
        title: m.title,
        item_type: m.item_type,
        object_id: m.object_id,
        url: m.url,
        target: m.target || '_self',
      }))
    );
  }, [selectedMenuId, menus, allItems]);

  const addSelectedPages = () => {
    const chosen = pages.filter((p) => checkedPages.includes(p.id));
    setEditableItems((prev) => [
      ...prev,
      ...chosen.map((p) => ({
        localId: `loc-${Date.now()}-${p.id}`,
        parentLocalId: null,
        title: p.title,
        item_type: 'page' as const,
        object_id: p.id,
        url: `/${p.slug}`,
        target: '_self',
      })),
    ]);
    setCheckedPages([]);
  };

  const addSelectedPosts = () => {
    const chosen = posts.filter((p) => checkedPosts.includes(p.id));
    setEditableItems((prev) => [
      ...prev,
      ...chosen.map((p) => ({
        localId: `loc-${Date.now()}-${p.id}`,
        parentLocalId: null,
        title: p.title,
        item_type: 'post' as const,
        object_id: p.id,
        url: `/berita/${p.slug}`,
        target: '_self',
      })),
    ]);
    setCheckedPosts([]);
  };

  const addSelectedCats = () => {
    const chosen = categories.filter((c) => checkedCats.includes(c.id));
    setEditableItems((prev) => [
      ...prev,
      ...chosen.map((c) => ({
        localId: `loc-${Date.now()}-${c.id}`,
        parentLocalId: null,
        title: c.name,
        item_type: 'category' as const,
        object_id: c.id,
        url: `/kategori/${c.slug}`,
        target: '_self',
      })),
    ]);
    setCheckedCats([]);
  };

  const addCustomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;
    setEditableItems((prev) => [
      ...prev,
      {
        localId: `loc-${Date.now()}`,
        parentLocalId: null,
        title: customLabel.trim(),
        item_type: 'custom',
        object_id: null,
        url: customUrl.trim() || '/',
        target: '_self',
      },
    ]);
    setCustomLabel('');
    setCustomUrl('/');
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= editableItems.length) return;
    const next = [...editableItems];
    const [removed] = next.splice(idx, 1);
    next.splice(target, 0, removed);
    setEditableItems(next);
  };

  const toggleIndent = (idx: number) => {
    const current = editableItems[idx];
    if (!current) return;
    if (current.parentLocalId) {
      const next = [...editableItems];
      next[idx] = { ...current, parentLocalId: null };
      setEditableItems(next);
    } else if (idx > 0) {
      // Cari item induk terdekat di atasnya yang bukan sub-menu
      for (let i = idx - 1; i >= 0; i--) {
        if (!editableItems[i].parentLocalId) {
          const next = [...editableItems];
          next[idx] = { ...current, parentLocalId: editableItems[i].localId };
          setEditableItems(next);
          break;
        }
      }
    }
  };

  const handleSaveMenu = async () => {
    if (!selectedMenuId) return;
    setSaving(true);
    const { error } = await saveMenuStructure(
      selectedMenuId,
      location ? (location as MenuLocation) : null,
      editableItems.map((item, idx) => ({
        id: item.localId,
        parent_id: item.parentLocalId,
        title: item.title,
        item_type: item.item_type,
        object_id: item.object_id,
        url: item.url,
        target: item.target,
        sort_order: idx + 1,
      }))
    );
    setSaving(false);
    if (error) {
      addNotice({ type: 'error', message: error });
      return;
    }
    const refreshed = await fetchMenusAndItems();
    setMenus(refreshed.menus);
    setAllItems(refreshed.items);
    addNotice({ type: 'success', message: 'Struktur menu navigasi berhasil disimpan.' });
  };

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim()) return;
    const { menu, error } = await createMenuRecord(
      newMenuName.trim(),
      slugify(newMenuName) || `menu-${Date.now()}`
    );
    if (error || !menu) {
      addNotice({ type: 'error', message: error || 'Gagal membuat menu baru.' });
      return;
    }
    setMenus((prev) => [...prev, menu]);
    setSelectedMenuId(menu.id);
    setNewMenuName('');
    setShowNewMenu(false);
    addNotice({ type: 'success', message: `Menu "${menu.name}" dibuat.` });
  };

  return (
    <div className="pt-4 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-[23px] font-normal text-[#1d2327]">Menu Navigasi</h1>
        <button
          type="button"
          onClick={() => setShowNewMenu((v) => !v)}
          className="px-3 py-1 text-[13px] text-[#2271b1] border border-[#2271b1] bg-[#f6f7f7] rounded-[3px] cursor-pointer"
        >
          + Buat Menu Baru
        </button>
      </div>

      {/* Pemilih Menu ala WordPress */}
      <div className="bg-white border border-[#c3c4c7] p-3 mb-4 flex flex-wrap items-center gap-3">
        <label className="font-medium text-[#1d2327]">Pilih menu yang akan disunting:</label>
        <select
          value={selectedMenuId}
          onChange={(e) => setSelectedMenuId(e.target.value)}
          className="h-9 sm:h-8 w-full sm:w-auto max-w-full min-w-0 px-2.5 bg-white border border-[#8c8f94] rounded-[3px]"
        >
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.location ? `(${m.location === 'header' ? 'Menu Utama Header' : 'Menu Footer'})` : ''}
            </option>
          ))}
        </select>

        {showNewMenu && (
          <form
            onSubmit={handleCreateMenu}
            className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto"
          >
            <input
              type="text"
              value={newMenuName}
              onChange={(e) => setNewMenuName(e.target.value)}
              placeholder="Nama menu baru..."
              className="flex-1 min-w-0 h-9 sm:h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
            />
            <button
              type="submit"
              className="h-9 sm:h-8 px-3 bg-[#2271b1] text-white rounded-[3px] cursor-pointer shrink-0"
            >
              Buat Menu
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Panel Kiri: Tambah Item Menu */}
        <div className="lg:col-span-4 space-y-3">
          {/* Halaman */}
          <div className="bg-white border border-[#c3c4c7]">
            <div className="px-3.5 py-2.5 border-b border-[#c3c4c7] bg-[#f6f7f7] font-semibold">
              Halaman
            </div>
            <div className="p-3 space-y-2">
              <div className="max-h-32 overflow-y-auto space-y-1">
                {pages.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedPages.includes(p.id)}
                      onChange={() =>
                        setCheckedPages((prev) =>
                          prev.includes(p.id)
                            ? prev.filter((x) => x !== p.id)
                            : [...prev, p.id]
                        )
                      }
                    />
                    <span className="truncate">{p.title}</span>
                  </label>
                ))}
                {pages.length === 0 && (
                  <p className="text-[#50575e] text-[12px]">Belum ada halaman terbit.</p>
                )}
              </div>
              <button
                type="button"
                onClick={addSelectedPages}
                disabled={checkedPages.length === 0}
                className="px-3 py-1 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] disabled:opacity-50 rounded-[3px] cursor-pointer"
              >
                Tambahkan ke Menu
              </button>
            </div>
          </div>

          {/* Pos */}
          <div className="bg-white border border-[#c3c4c7]">
            <div className="px-3.5 py-2.5 border-b border-[#c3c4c7] bg-[#f6f7f7] font-semibold">
              Pos / Berita
            </div>
            <div className="p-3 space-y-2">
              <div className="max-h-32 overflow-y-auto space-y-1">
                {posts.slice(0, 10).map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedPosts.includes(p.id)}
                      onChange={() =>
                        setCheckedPosts((prev) =>
                          prev.includes(p.id)
                            ? prev.filter((x) => x !== p.id)
                            : [...prev, p.id]
                        )
                      }
                    />
                    <span className="truncate">{p.title}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={addSelectedPosts}
                disabled={checkedPosts.length === 0}
                className="px-3 py-1 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] disabled:opacity-50 rounded-[3px] cursor-pointer"
              >
                Tambahkan ke Menu
              </button>
            </div>
          </div>

          {/* Kategori */}
          <div className="bg-white border border-[#c3c4c7]">
            <div className="px-3.5 py-2.5 border-b border-[#c3c4c7] bg-[#f6f7f7] font-semibold">
              Kategori Berita
            </div>
            <div className="p-3 space-y-2">
              <div className="max-h-28 overflow-y-auto space-y-1">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedCats.includes(c.id)}
                      onChange={() =>
                        setCheckedCats((prev) =>
                          prev.includes(c.id)
                            ? prev.filter((x) => x !== c.id)
                            : [...prev, c.id]
                        )
                      }
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={addSelectedCats}
                disabled={checkedCats.length === 0}
                className="px-3 py-1 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] disabled:opacity-50 rounded-[3px] cursor-pointer"
              >
                Tambahkan ke Menu
              </button>
            </div>
          </div>

          {/* Tautan Tersuai */}
          <div className="bg-white border border-[#c3c4c7]">
            <div className="px-3.5 py-2.5 border-b border-[#c3c4c7] bg-[#f6f7f7] font-semibold">
              Tautan Tersuai (Custom Link)
            </div>
            <form onSubmit={addCustomLink} className="p-3 space-y-2.5">
              <div>
                <label className="block text-[12px] text-[#50575e] mb-1">URL Tujuan</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="/jadwal-ibadah atau https://..."
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#50575e] mb-1">Teks Tautan</label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Label Menu"
                  className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-1 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] rounded-[3px] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambahkan ke Menu</span>
              </button>
            </form>
          </div>
        </div>

        {/* Panel Kanan: Struktur Menu Drag-and-Drop */}
        <div className="lg:col-span-8 min-w-0 bg-white border border-[#c3c4c7]">
          <div className="px-4 py-3 border-b border-[#c3c4c7] bg-[#f6f7f7] flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-[#1d2327]">
              Struktur Menu (Seret atau gunakan panah untuk mengatur urutan &amp; sub-menu)
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveMenu()}
              className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Menu'}
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            {editableItems.length === 0 ? (
              <p className="text-[#50575e] py-6 text-center bg-[#f6f7f7] border border-dashed border-[#c3c4c7]">
                Belum ada item di menu ini. Tambahkan dari kolom sebelah kiri.
              </p>
            ) : (
              editableItems.map((item, idx) => (
                <div
                  key={item.localId}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null || dragIndex === idx) return;
                    const next = [...editableItems];
                    const [moved] = next.splice(dragIndex, 1);
                    next.splice(idx, 0, moved);
                    setEditableItems(next);
                    setDragIndex(null);
                  }}
                  className={`border border-[#c3c4c7] bg-[#f6f7f7] p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                    item.parentLocalId ? 'ml-4 sm:ml-8 border-l-2 border-l-[#2271b1]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-[#787c82] cursor-grab shrink-0" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const next = [...editableItems];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setEditableItems(next);
                        }}
                        className="h-8 sm:h-7 px-2 bg-white border border-[#8c8f94] rounded-[2px] font-medium min-w-0"
                      />
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => {
                          const next = [...editableItems];
                          next[idx] = { ...next[idx], url: e.target.value };
                          setEditableItems(next);
                        }}
                        className="h-8 sm:h-7 px-2 bg-white border border-[#8c8f94] rounded-[2px] font-mono text-[12px] min-w-0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      title="Naik"
                      className="w-9 h-9 sm:w-7 sm:h-7 inline-flex items-center justify-center bg-white border border-[#c3c4c7] rounded disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === editableItems.length - 1}
                      title="Turun"
                      className="w-9 h-9 sm:w-7 sm:h-7 inline-flex items-center justify-center bg-white border border-[#c3c4c7] rounded disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleIndent(idx)}
                      disabled={idx === 0 && !item.parentLocalId}
                      title={item.parentLocalId ? 'Jadikan menu utama' : 'Jadikan sub-menu'}
                      className="w-9 h-9 sm:w-7 sm:h-7 inline-flex items-center justify-center bg-white border border-[#c3c4c7] rounded disabled:opacity-40 cursor-pointer"
                    >
                      {item.parentLocalId ? (
                        <Outdent className="w-3.5 h-3.5" />
                      ) : (
                        <Indent className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditableItems((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      title="Hapus"
                      className="w-9 h-9 sm:w-7 sm:h-7 inline-flex items-center justify-center bg-white border border-[#c3c4c7] text-[#d63638] rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="pt-4 mt-4 border-t border-[#f0f0f1]">
              <h3 className="font-semibold text-[#1d2327] mb-2">Pengaturan Lokasi Tampilan</h3>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'header', label: 'Menu Utama (Header Situs)' },
                  { value: 'footer', label: 'Menu Footer' },
                  { value: '', label: 'Tidak ditampilkan' },
                ].map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="menuLocation"
                      checked={location === opt.value}
                      onChange={() => setLocation(opt.value as MenuLocation | '')}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
