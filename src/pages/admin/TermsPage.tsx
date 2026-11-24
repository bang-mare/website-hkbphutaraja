import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { createTerm, deleteTerms, fetchTerms, updateTerm } from '../../lib/cmsData';
import { slugify } from '../../lib/blocks';
import type { TaxonomyType, Term } from '../../types/cms';

interface TermsPageProps {
  taxonomy: TaxonomyType;
}

export function TermsPage({ taxonomy }: TermsPageProps) {
  const { addNotice } = useAdmin();
  const isCategory = taxonomy === 'category';
  const titleLabel = isCategory ? 'Kategori' : 'Tag';

  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  // Form Kiri (Tambah Baru)
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit Inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const loadTerms = useCallback(async () => {
    setLoading(true);
    const list = await fetchTerms(taxonomy);
    setTerms(list);
    setLoading(false);
  }, [taxonomy]);

  useEffect(() => {
    void loadTerms();
    setSelectedIds([]);
    setEditingId(null);
  }, [loadTerms]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addNotice({ type: 'warning', message: `Nama ${titleLabel.toLowerCase()} wajib diisi.` });
      return;
    }
    setSaving(true);
    const { error } = await createTerm({
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      taxonomy,
      description: description.trim(),
      parent_id: isCategory && parentId ? parentId : null,
    });
    setSaving(false);

    if (error) {
      addNotice({ type: 'error', message: `Gagal menambah ${titleLabel.toLowerCase()}: ${error}` });
      return;
    }

    setName('');
    setSlug('');
    setParentId('');
    setDescription('');
    addNotice({ type: 'success', message: `${titleLabel} berhasil ditambahkan.` });
    await loadTerms();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const { error } = await updateTerm(editingId, {
      name: editName,
      slug: editSlug,
      description: editDesc,
    });
    if (error) {
      addNotice({ type: 'error', message: `Gagal memperbarui: ${error}` });
      return;
    }
    setEditingId(null);
    addNotice({ type: 'success', message: `${titleLabel} diperbarui.` });
    await loadTerms();
  };

  const handleDelete = async (ids: string[]) => {
    const { error } = await deleteTerms(ids);
    if (error) {
      addNotice({ type: 'error', message: `Gagal menghapus: ${error}` });
      return;
    }
    setSelectedIds([]);
    addNotice({ type: 'success', message: `${ids.length} ${titleLabel.toLowerCase()} dihapus.` });
    await loadTerms();
  };

  const filtered = terms.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
  });

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-[23px] font-normal text-[#1d2327]">{titleLabel}</h1>
        <div className="relative w-full sm:w-auto min-w-0">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari ${titleLabel}...`}
            className="w-full sm:w-52 h-8 md:h-7 pl-2.5 pr-7 text-[13px] bg-white border border-[#8c8f94] rounded-[3px]"
          />
          <Search className="w-3.5 h-3.5 text-[#787c82] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-[13px]">
        {/* Kolom Kiri: Form Tambah Baru ala WordPress */}
        <div className="lg:col-span-4">
          <h2 className="text-[14px] font-semibold text-[#1d2327] mb-3">
            Tambah {titleLabel} Baru
          </h2>
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label htmlFor="term-name" className="block text-[#1d2327] mb-1">
                Nama
              </label>
              <input
                id="term-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px]"
              />
              <p className="text-[12px] text-[#50575e] mt-1">
                Nama ini akan tampil di situs publik Anda.
              </p>
            </div>

            <div>
              <label htmlFor="term-slug" className="block text-[#1d2327] mb-1">
                Slug
              </label>
              <input
                id="term-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={name ? slugify(name) : ''}
                className="w-full h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px] font-mono text-[12px]"
              />
              <p className="text-[12px] text-[#50575e] mt-1">
                Versi ramah URL (huruf kecil, angka, dan tanda hubung).
              </p>
            </div>

            {isCategory && (
              <div>
                <label htmlFor="term-parent" className="block text-[#1d2327] mb-1">
                  Kategori Induk
                </label>
                <select
                  id="term-parent"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                >
                  <option value="">Tidak ada</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="term-desc" className="block text-[#1d2327] mb-1">
                Deskripsi
              </label>
              <textarea
                id="term-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 bg-white border border-[#8c8f94] rounded-[3px]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
            >
              {saving ? 'Menyimpan...' : `Tambah ${titleLabel} Baru`}
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Tabel Daftar Terms */}
        <div className="lg:col-span-8 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                <option value="">Tindakan massal</option>
                <option value="delete">Hapus</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (bulkAction === 'delete' && selectedIds.length > 0) {
                    void handleDelete(selectedIds);
                    setBulkAction('');
                  }
                }}
                className="h-7 px-2.5 bg-[#f6f7f7] border border-[#2271b1] text-[#2271b1] rounded-[3px] cursor-pointer"
              >
                Terapkan
              </button>
            </div>
            <span className="text-[#50575e] tabular-nums">{filtered.length} butir</span>
          </div>

          <div className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#c3c4c7]">
                  <th className="w-9 p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 &&
                        filtered.every((t) => selectedIds.includes(t.id))
                      }
                      onChange={() => {
                        if (filtered.every((t) => selectedIds.includes(t.id))) {
                          setSelectedIds([]);
                        } else {
                          setSelectedIds(filtered.map((t) => t.id));
                        }
                      }}
                    />
                  </th>
                  <th className="p-2.5 font-medium">Nama</th>
                  <th className="p-2.5 font-medium">Deskripsi</th>
                  <th className="p-2.5 font-medium">Slug</th>
                  <th className="p-2.5 font-medium text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f1]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-5 text-center text-[#50575e]">
                      Memuat...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-5 text-center text-[#50575e]">
                      Belum ada {titleLabel.toLowerCase()}.
                    </td>
                  </tr>
                ) : (
                  filtered.map((term, idx) =>
                    editingId === term.id ? (
                      <tr key={term.id} className="bg-[#f6f7f7]">
                        <td colSpan={5} className="p-3">
                          <form onSubmit={handleSaveEdit} className="space-y-2">
                            <p className="font-semibold text-[11px] uppercase">Edit Cepat</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Nama"
                                className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                              />
                              <input
                                type="text"
                                value={editSlug}
                                onChange={(e) => setEditSlug(e.target.value)}
                                placeholder="Slug"
                                className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px] font-mono text-[12px]"
                              />
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                placeholder="Deskripsi"
                                className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                              />
                            </div>
                            <div className="flex justify-between pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 bg-white border border-[#2271b1] text-[#2271b1] rounded-[3px] cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="submit"
                                className="px-3 py-1 bg-[#2271b1] text-white rounded-[3px] cursor-pointer"
                              >
                                Perbarui {titleLabel}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={term.id}
                        className={`group ${idx % 2 === 0 ? 'bg-[#f6f7f7]/55' : 'bg-white'}`}
                      >
                        <td className="p-2.5 text-center align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(term.id)}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(term.id)
                                  ? prev.filter((x) => x !== term.id)
                                  : [...prev, term.id]
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5 align-top">
                          <div className="font-semibold text-[#2271b1]">{term.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] opacity-100 [@media(hover:hover)]:lg:opacity-0 [@media(hover:hover)]:lg:group-hover:opacity-100 [@media(hover:hover)]:lg:group-focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(term.id);
                                setEditName(term.name);
                                setEditSlug(term.slug);
                                setEditDesc(term.description);
                              }}
                              className="text-[#2271b1] hover:underline cursor-pointer"
                            >
                              Edit Cepat
                            </button>
                            <span className="text-[#c3c4c7]">|</span>
                            <button
                              type="button"
                              onClick={() => void handleDelete([term.id])}
                              className="text-[#b32d2e] hover:underline cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 align-top text-[#50575e]">
                          {term.description || '—'}
                        </td>
                        <td className="p-2.5 align-top font-mono text-[12px] text-[#50575e]">
                          {term.slug}
                        </td>
                        <td className="p-2.5 align-top text-right tabular-nums text-[#2271b1]">
                          {term.count}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
