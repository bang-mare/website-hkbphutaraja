import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import {
  deletePostsPermanently,
  fetchPostsByType,
  fetchTerms,
  updatePostsStatusOrQuickEdit,
} from '../../lib/cmsData';
import { hasCapability } from '../../lib/roles';
import { sanitizeHtml, slugify } from '../../lib/blocks';
import type { PostRecord, PostStatus, PostType, Term } from '../../types/cms';

interface PostsListPageProps {
  postType: PostType;
}

const TYPE_META: Record<
  PostType,
  { singular: string; plural: string; newPath: string; basePath: string }
> = {
  post: {
    singular: 'Pos',
    plural: 'Pos',
    newPath: '/admin/posts/new',
    basePath: '/admin/posts',
  },
  page: {
    singular: 'Halaman',
    plural: 'Halaman',
    newPath: '/admin/pages/new',
    basePath: '/admin/pages',
  },
  warta: {
    singular: 'Warta Jemaat',
    plural: 'Warta Jemaat',
    newPath: '/admin/warta/new',
    basePath: '/admin/warta',
  },
  album: {
    singular: 'Album',
    plural: 'Album Galeri',
    newPath: '/admin/galeri/new',
    basePath: '/admin/galeri',
  },
};

const STATUS_LABELS: Record<PostStatus, string> = {
  publish: 'Terbit',
  draft: 'Draf',
  pending: 'Menunggu Tinjauan',
  future: 'Terjadwal',
  private: 'Pribadi',
  trash: 'Sampah',
};

export function PostsListPage({ postType }: PostsListPageProps) {
  const { profile } = useAuth();
  const { addNotice, setScreenOptionsExtra, setHelpTabs } = useAdmin();
  const navigate = useNavigate();

  const meta = TYPE_META[postType];
  const canPublish = hasCapability(profile?.role, 'publish_posts');

  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [categories, setCategories] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination States
  const [statusFilter, setStatusFilter] = useState<'all' | PostStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Screen Options Column Visibility
  const [visibleCols, setVisibleCols] = useState({
    author: true,
    categories: postType !== 'page',
    tags: postType === 'post',
    comments: postType !== 'page',
    date: true,
  });

  // Bulk Selection & Bulk Edit
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkEditing, setBulkEditing] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<PostStatus | ''>('');
  const [bulkCatIds, setBulkCatIds] = useState<string[]>([]);

  // Inline Quick Edit
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [qeTitle, setQeTitle] = useState('');
  const [qeSlug, setQeSlug] = useState('');
  const [qeDate, setQeDate] = useState('');
  const [qeStatus, setQeStatus] = useState<PostStatus>('draft');
  const [qeComments, setQeComments] = useState(true);
  const [qeCatIds, setQeCatIds] = useState<string[]>([]);
  const [qeSaving, setQeSaving] = useState(false);

  // Preview Modal
  const [previewPost, setPreviewPost] = useState<PostRecord | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [postsRes, catsRes] = await Promise.all([
      fetchPostsByType(postType),
      postType !== 'page' ? fetchTerms('category') : Promise.resolve([]),
    ]);
    if (postsRes.error) {
      addNotice({ type: 'error', message: `Gagal memuat ${meta.plural}: ${postsRes.error}` });
    } else {
      setPosts(postsRes.posts);
    }
    setCategories(catsRes);
    setLoading(false);
  }, [postType, addNotice, meta.plural]);

  useEffect(() => {
    void loadData();
    setSelectedIds([]);
    setQuickEditId(null);
    setBulkEditing(false);
    setStatusFilter('all');
    setCurrentPage(1);
  }, [loadData]);

  // Register Screen Options & Help tabs
  useEffect(() => {
    setScreenOptionsExtra(
      <div className="pt-3 mt-3 border-t border-[#f0f0f1] space-y-3">
        <div>
          <p className="font-semibold text-[#1d2327] mb-1.5">Kolom Tabel {meta.plural}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {(
              [
                ['author', 'Penulis'],
                ...(postType !== 'page' ? [['categories', 'Kategori'] as const] : []),
                ...(postType === 'post' ? [['tags', 'Tag'] as const] : []),
                ...(postType !== 'page' ? [['comments', 'Komentar'] as const] : []),
                ['date', 'Tanggal'],
              ] as Array<[keyof typeof visibleCols, string]>
            ).map(([colKey, label]) => (
              <label key={colKey} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleCols[colKey]}
                  onChange={() =>
                    setVisibleCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="wp-per-page" className="text-[#1d2327]">
            Jumlah butir per halaman:
          </label>
          <input
            id="wp-per-page"
            type="number"
            min={5}
            max={100}
            value={perPage}
            onChange={(e) => {
              const val = Math.max(5, Math.min(100, Number(e.target.value) || 20));
              setPerPage(val);
              setCurrentPage(1);
            }}
            className="w-16 h-7 px-2 border border-[#8c8f94] rounded-[3px]"
          />
        </div>
      </div>
    );

    setHelpTabs([
      {
        id: 'ringkasan-tabel',
        title: 'Ringkasan',
        content: (
          <p>
            Layar ini menampilkan seluruh daftar {meta.plural}. Arahkan kursor pada salah satu judul untuk menampilkan tautan aksi cepat: Edit, Edit Cepat, Sampah, dan Lihat.
          </p>
        ),
      },
      {
        id: 'tindakan-massal',
        title: 'Tindakan Massal',
        content: (
          <p>
            Centang beberapa baris sekaligus lalu pilih <strong>Edit</strong> atau <strong>Pindah ke Sampah</strong> pada menu Tindakan Massal.
          </p>
        ),
      },
    ]);

    return () => {
      setScreenOptionsExtra(null);
      setHelpTabs([]);
    };
  }, [meta.plural, postType, visibleCols, perPage, setScreenOptionsExtra, setHelpTabs]);

  // Status counts (WordPress excludes 'trash' from 'Semua')
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      publish: 0,
      draft: 0,
      pending: 0,
      future: 0,
      private: 0,
      trash: 0,
    };
    posts.forEach((p) => {
      if (p.status !== 'trash') counts.all += 1;
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [posts]);

  // Month options from posts
  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    posts.forEach((p) => {
      const dt = new Date(p.published_at || p.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
      }).format(dt);
      map.set(key, label);
    });
    return Array.from(map.entries());
  }, [posts]);

  // Filtered rows
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter === 'all') {
        if (p.status === 'trash') return false;
      } else if (p.status !== statusFilter) {
        return false;
      }

      if (categoryFilter) {
        const hasCat = (p.terms || []).some((t) => t.id === categoryFilter);
        if (!hasCat) return false;
      }

      if (monthFilter) {
        const dt = new Date(p.published_at || p.created_at);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (key !== monthFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSlug = p.slug.toLowerCase().includes(q);
        const matchExcerpt = p.excerpt.toLowerCase().includes(q);
        if (!matchTitle && !matchSlug && !matchExcerpt) return false;
      }

      return true;
    });
  }, [posts, statusFilter, categoryFilter, monthFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = filteredPosts.slice((safePage - 1) * perPage, safePage * perPage);

  const allOnPageSelected =
    paginatedPosts.length > 0 && paginatedPosts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(paginatedPosts.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...paginatedPosts.map((p) => p.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleTrash = async (ids: string[]) => {
    const { error } = await updatePostsStatusOrQuickEdit(ids, { status: 'trash' });
    if (error) {
      addNotice({ type: 'error', message: `Gagal memindahkan ke sampah: ${error}` });
      return;
    }
    addNotice({
      type: 'success',
      message: `${ids.length} ${meta.singular.toLowerCase()} dipindahkan ke Sampah.`,
    });
    setSelectedIds([]);
    await loadData();
  };

  const handleRestore = async (ids: string[]) => {
    const { error } = await updatePostsStatusOrQuickEdit(ids, { status: 'draft' });
    if (error) {
      addNotice({ type: 'error', message: `Gagal memulihkan: ${error}` });
      return;
    }
    addNotice({
      type: 'success',
      message: `${ids.length} ${meta.singular.toLowerCase()} dipulihkan sebagai Draf.`,
    });
    setSelectedIds([]);
    await loadData();
  };

  const handleDeletePermanent = async (ids: string[]) => {
    const { error } = await deletePostsPermanently(ids);
    if (error) {
      addNotice({ type: 'error', message: `Gagal menghapus permanen: ${error}` });
      return;
    }
    addNotice({
      type: 'success',
      message: `${ids.length} ${meta.singular.toLowerCase()} dihapus secara permanen.`,
    });
    setSelectedIds([]);
    await loadData();
  };

  const handleApplyBulkAction = async () => {
    if (selectedIds.length === 0 || !bulkAction) return;
    if (bulkAction === 'edit') {
      setBulkEditing(true);
      setBulkStatus('');
      setBulkCatIds([]);
      return;
    }
    if (bulkAction === 'trash') {
      await handleTrash(selectedIds);
    } else if (bulkAction === 'restore') {
      await handleRestore(selectedIds);
    } else if (bulkAction === 'delete') {
      await handleDeletePermanent(selectedIds);
    }
    setBulkAction('');
  };

  const handleSaveBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    const updates: Partial<{ status: PostStatus }> = {};
    if (bulkStatus) updates.status = bulkStatus;
    const { error } = await updatePostsStatusOrQuickEdit(
      selectedIds,
      updates,
      bulkCatIds.length > 0 ? bulkCatIds : undefined
    );
    if (error) {
      addNotice({ type: 'error', message: `Gagal memperbarui massal: ${error}` });
      return;
    }
    addNotice({
      type: 'success',
      message: `${selectedIds.length} ${meta.singular.toLowerCase()} berhasil diperbarui.`,
    });
    setBulkEditing(false);
    setBulkAction('');
    setSelectedIds([]);
    await loadData();
  };

  const openQuickEdit = (post: PostRecord) => {
    setQuickEditId(post.id);
    setQeTitle(post.title);
    setQeSlug(post.slug);
    const dt = post.published_at || post.created_at;
    setQeDate(dt.slice(0, 16));
    setQeStatus(post.status);
    setQeComments(post.comment_status);
    setQeCatIds(
      (post.terms || []).filter((t) => t.taxonomy === 'category').map((t) => t.id)
    );
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditId) return;
    setQeSaving(true);
    const { error } = await updatePostsStatusOrQuickEdit(
      [quickEditId],
      {
        title: qeTitle.trim() || '(Tanpa Judul)',
        slug: slugify(qeSlug || qeTitle) || `item-${Date.now()}`,
        published_at: qeDate ? new Date(qeDate).toISOString() : null,
        status: qeStatus,
        comment_status: qeComments,
      },
      postType !== 'page' ? qeCatIds : undefined
    );
    setQeSaving(false);

    if (error) {
      addNotice({ type: 'error', message: `Gagal memperbarui cepat: ${error}` });
      return;
    }

    addNotice({ type: 'success', message: `${meta.singular} diperbarui.` });
    setQuickEditId(null);
    await loadData();
  };

  const formatTanggal = (iso: string | null) => {
    if (!iso) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  };

  const colSpanTotal =
    2 +
    (visibleCols.author ? 1 : 0) +
    (visibleCols.categories && postType !== 'page' ? 1 : 0) +
    (visibleCols.tags && postType === 'post' ? 1 : 0) +
    (visibleCols.comments && postType !== 'page' ? 1 : 0) +
    (visibleCols.date ? 1 : 0);

  return (
    <div className="pt-4">
      {/* Header Judul + Tombol Tambah Baru */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h1 className="text-[23px] font-normal text-[#1d2327] leading-tight">
          {meta.plural}
        </h1>
        <Link
          to={meta.newPath}
          className="px-2.5 py-1 text-[13px] font-medium text-[#2271b1] bg-[#f6f7f7] hover:bg-[#f0f0f1] border border-[#2271b1] rounded-[3px] whitespace-nowrap"
        >
          Tambah Baru
        </Link>
        {searchQuery && (
          <span className="text-[13px] text-[#50575e]">
            Hasil pencarian untuk: <strong>&ldquo;{searchQuery}&rdquo;</strong>
          </span>
        )}
      </div>

      {/* Subsubsub Status Links + Search Box */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2 text-[13px]">
        <ul className="flex flex-wrap items-center gap-y-1 text-[#50575e]">
          {(
            [
              ['all', 'Semua', statusCounts.all],
              ['publish', 'Terbit', statusCounts.publish],
              ['draft', 'Draf', statusCounts.draft],
              ['pending', 'Menunggu Tinjauan', statusCounts.pending],
              ['future', 'Terjadwal', statusCounts.future],
              ['private', 'Pribadi', statusCounts.private],
              ['trash', 'Sampah', statusCounts.trash],
            ] as const
          ).map(([key, label, count], idx, arr) => {
            if (key !== 'all' && key !== 'publish' && key !== 'draft' && count === 0) {
              return null;
            }
            const active = statusFilter === key;
            return (
              <li key={key} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter(key);
                    setCurrentPage(1);
                    setSelectedIds([]);
                  }}
                  className={`cursor-pointer ${
                    active ? 'font-semibold text-[#1d2327]' : 'text-[#2271b1] hover:underline'
                  }`}
                >
                  {label}{' '}
                  <span className="text-[#50575e] font-normal tabular-nums">({count})</span>
                </button>
                {idx < arr.length - 1 && (
                  <span aria-hidden="true" className="mx-1.5 text-[#a7aaad]">
                    |
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchQuery(searchInput);
            setCurrentPage(1);
          }}
          className="flex items-center gap-1.5"
        >
          <div className="relative">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Cari ${meta.singular}...`}
              className="h-7 pl-2.5 pr-7 text-[13px] bg-white border border-[#8c8f94] rounded-[3px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[#787c82] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="submit"
            className="h-7 px-2.5 text-[13px] bg-[#f6f7f7] hover:bg-[#f0f0f1] border border-[#2271b1] text-[#2271b1] rounded-[3px] cursor-pointer whitespace-nowrap"
          >
            Cari {meta.singular}
          </button>
        </form>
      </div>

      {/* Tablenav Top: Bulk Actions + Filter + Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              aria-label="Tindakan massal"
              className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px] text-[13px]"
            >
              <option value="">Tindakan massal</option>
              {statusFilter !== 'trash' ? (
                <>
                  <option value="edit">Edit</option>
                  <option value="trash">Pindah ke Sampah</option>
                </>
              ) : (
                <>
                  <option value="restore">Pulihkan</option>
                  <option value="delete">Hapus Permanen</option>
                </>
              )}
            </select>
            <button
              type="button"
              onClick={() => void handleApplyBulkAction()}
              className="h-7 px-2.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] border border-[#2271b1] text-[#2271b1] rounded-[3px] cursor-pointer"
            >
              Terapkan
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Saring menurut tanggal"
              className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px] text-[13px]"
            >
              <option value="">Semua tanggal</option>
              {monthOptions.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>

            {postType !== 'page' && (
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Saring menurut kategori"
                className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px] text-[13px]"
              >
                <option value="">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center gap-2 text-[#50575e] tabular-nums">
          <span>{filteredPosts.length} butir</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 h-7 bg-[#f6f7f7] border border-[#c3c4c7] rounded-[3px] disabled:opacity-40 cursor-pointer"
              >
                «
              </button>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 h-7 bg-[#f6f7f7] border border-[#c3c4c7] rounded-[3px] disabled:opacity-40 cursor-pointer"
              >
                ‹
              </button>
              <span className="px-1.5">
                {safePage} dari {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 h-7 bg-[#f6f7f7] border border-[#c3c4c7] rounded-[3px] disabled:opacity-40 cursor-pointer"
              >
                ›
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 h-7 bg-[#f6f7f7] border border-[#c3c4c7] rounded-[3px] disabled:opacity-40 cursor-pointer"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Edit Inline Panel */}
      {bulkEditing && selectedIds.length > 0 && (
        <form
          onSubmit={handleSaveBulkEdit}
          className="mb-3 bg-white border border-[#c3c4c7] p-4 shadow-sm text-[13px]"
        >
          <p className="font-semibold text-[#1d2327] mb-3 uppercase text-[11px] tracking-wide">
            Sunting Massal ({selectedIds.length} butir dipilih)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            {postType !== 'page' && (
              <div>
                <p className="font-medium text-[#1d2327] mb-1">Kategori</p>
                <div className="max-h-28 overflow-y-auto border border-[#c3c4c7] p-2 space-y-1">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkCatIds.includes(cat.id)}
                        onChange={() =>
                          setBulkCatIds((prev) =>
                            prev.includes(cat.id)
                              ? prev.filter((x) => x !== cat.id)
                              : [...prev, cat.id]
                          )
                        }
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label htmlFor="bulk-status" className="block font-medium text-[#1d2327] mb-1">
                Status
              </label>
              <select
                id="bulk-status"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as PostStatus | '')}
                className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                <option value="">— Tidak Diubah —</option>
                {canPublish && <option value="publish">Terbit</option>}
                <option value="draft">Draf</option>
                <option value="pending">Menunggu Tinjauan</option>
                {canPublish && <option value="private">Pribadi</option>}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f1]">
            <button
              type="button"
              onClick={() => setBulkEditing(false)}
              className="px-3 py-1.5 border border-[#2271b1] text-[#2271b1] rounded-[3px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
            >
              Perbarui
            </button>
          </div>
        </form>
      )}

      {/* WP List Table */}
      <div className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#c3c4c7] bg-white text-[#1d2327]">
              <th className="w-9 p-2.5 text-center">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  aria-label="Pilih semua"
                />
              </th>
              <th className="p-2.5 font-medium min-w-[240px]">Judul</th>
              {visibleCols.author && <th className="p-2.5 font-medium">Penulis</th>}
              {visibleCols.categories && postType !== 'page' && (
                <th className="p-2.5 font-medium">Kategori</th>
              )}
              {visibleCols.tags && postType === 'post' && (
                <th className="p-2.5 font-medium">Tag</th>
              )}
              {visibleCols.comments && postType !== 'page' && (
                <th className="p-2.5 font-medium w-16 text-center" title="Komentar">
                  <MessageSquare className="w-4 h-4 inline text-[#50575e]" />
                </th>
              )}
              {visibleCols.date && <th className="p-2.5 font-medium w-44">Tanggal</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#f0f0f1]">
            {loading ? (
              <tr>
                <td colSpan={colSpanTotal} className="p-6 text-center text-[#50575e]">
                  Memuat daftar {meta.plural.toLowerCase()}...
                </td>
              </tr>
            ) : paginatedPosts.length === 0 ? (
              <tr>
                <td colSpan={colSpanTotal} className="p-6 text-center text-[#50575e]">
                  Tidak ada {meta.singular.toLowerCase()} ditemukan.{' '}
                  <Link to={meta.newPath} className="text-[#2271b1] hover:underline">
                    Buat {meta.singular.toLowerCase()} baru
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              paginatedPosts.map((post, idx) => {
                const isEditingInline = quickEditId === post.id;
                const postCats = (post.terms || []).filter((t) => t.taxonomy === 'category');
                const postTags = (post.terms || []).filter((t) => t.taxonomy === 'post_tag');
                const editRoute = `${meta.basePath}/${post.id}`;

                if (isEditingInline) {
                  return (
                    <tr key={post.id} className="bg-[#f6f7f7]">
                      <td colSpan={colSpanTotal} className="p-4">
                        <form onSubmit={handleSaveQuickEdit} className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1d2327]">
                            Edit Cepat
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <div>
                                <label className="block text-[12px] text-[#1d2327] mb-0.5">
                                  Judul
                                </label>
                                <input
                                  type="text"
                                  value={qeTitle}
                                  onChange={(e) => setQeTitle(e.target.value)}
                                  className="w-full h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[12px] text-[#1d2327] mb-0.5">
                                  Slug
                                </label>
                                <input
                                  type="text"
                                  value={qeSlug}
                                  onChange={(e) => setQeSlug(e.target.value)}
                                  className="w-full h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px] font-mono text-[12px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[12px] text-[#1d2327] mb-0.5">
                                  Tanggal
                                </label>
                                <input
                                  type="datetime-local"
                                  value={qeDate}
                                  onChange={(e) => setQeDate(e.target.value)}
                                  className="w-full h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                                />
                              </div>
                            </div>

                            {postType !== 'page' && (
                              <div>
                                <p className="text-[12px] text-[#1d2327] mb-1">Kategori</p>
                                <div className="max-h-32 overflow-y-auto bg-white border border-[#8c8f94] p-2 space-y-1">
                                  {categories.map((cat) => (
                                    <label
                                      key={cat.id}
                                      className="flex items-center gap-1.5 cursor-pointer text-[12px]"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={qeCatIds.includes(cat.id)}
                                        onChange={() =>
                                          setQeCatIds((prev) =>
                                            prev.includes(cat.id)
                                              ? prev.filter((x) => x !== cat.id)
                                              : [...prev, cat.id]
                                          )
                                        }
                                      />
                                      <span>{cat.name}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-[12px] text-[#1d2327] mb-0.5">
                                  Status
                                </label>
                                <select
                                  value={qeStatus}
                                  onChange={(e) => setQeStatus(e.target.value as PostStatus)}
                                  className="w-full h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
                                >
                                  {canPublish && <option value="publish">Terbit</option>}
                                  <option value="draft">Draf</option>
                                  <option value="pending">Menunggu Tinjauan</option>
                                  {canPublish && <option value="future">Terjadwal</option>}
                                  {canPublish && <option value="private">Pribadi</option>}
                                </select>
                              </div>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={qeComments}
                                  onChange={(e) => setQeComments(e.target.checked)}
                                />
                                <span>Izinkan komentar</span>
                              </label>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#dcdcde]">
                            <button
                              type="button"
                              onClick={() => setQuickEditId(null)}
                              className="px-3 py-1 bg-white border border-[#2271b1] text-[#2271b1] rounded-[3px] cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              disabled={qeSaving}
                              className="px-4 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px] cursor-pointer"
                            >
                              {qeSaving ? 'Menyimpan...' : 'Perbarui'}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={post.id}
                    className={`group ${idx % 2 === 0 ? 'bg-[#f6f7f7]/55' : 'bg-white'} hover:bg-[#f0f6fc]/50`}
                  >
                    <td className="p-2.5 text-center align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(post.id)}
                        onChange={() => toggleSelectOne(post.id)}
                        aria-label={`Pilih ${post.title}`}
                      />
                    </td>
                    <td className="p-2.5 align-top">
                      <div className="font-semibold text-[14px]">
                        <button
                          type="button"
                          onClick={() => navigate(editRoute)}
                          className="text-[#2271b1] hover:text-[#135e96] text-left cursor-pointer"
                        >
                          {post.title || '(Tanpa Judul)'}
                        </button>
                        {post.status !== 'publish' && (
                          <span className="ml-1.5 font-semibold text-[#50575e] text-[13px]">
                            — {STATUS_LABELS[post.status]}
                          </span>
                        )}
                      </div>

                      {/* Hover Row Actions ala WordPress */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                        {post.status !== 'trash' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => navigate(editRoute)}
                              className="text-[#2271b1] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                            <span className="text-[#c3c4c7]">|</span>
                            <button
                              type="button"
                              onClick={() => openQuickEdit(post)}
                              className="text-[#2271b1] hover:underline cursor-pointer"
                            >
                              Edit Cepat
                            </button>
                            <span className="text-[#c3c4c7]">|</span>
                            <button
                              type="button"
                              onClick={() => void handleTrash([post.id])}
                              className="text-[#b32d2e] hover:underline cursor-pointer"
                            >
                              Sampah
                            </button>
                            <span className="text-[#c3c4c7]">|</span>
                            <button
                              type="button"
                              onClick={() => setPreviewPost(post)}
                              className="text-[#2271b1] hover:underline cursor-pointer"
                            >
                              Lihat
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleRestore([post.id])}
                              className="text-[#2271b1] hover:underline cursor-pointer"
                            >
                              Pulihkan
                            </button>
                            <span className="text-[#c3c4c7]">|</span>
                            <button
                              type="button"
                              onClick={() => void handleDeletePermanent([post.id])}
                              className="text-[#b32d2e] hover:underline cursor-pointer"
                            >
                              Hapus Permanen
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                    {visibleCols.author && (
                      <td className="p-2.5 align-top text-[#2271b1]">
                        {post.author?.display_name || 'Pengurus Huria'}
                      </td>
                    )}

                    {visibleCols.categories && postType !== 'page' && (
                      <td className="p-2.5 align-top text-[#2271b1]">
                        {postCats.length > 0
                          ? postCats.map((c) => c.name).join(', ')
                          : '—'}
                      </td>
                    )}

                    {visibleCols.tags && postType === 'post' && (
                      <td className="p-2.5 align-top text-[#2271b1]">
                        {postTags.length > 0
                          ? postTags.map((t) => t.name).join(', ')
                          : '—'}
                      </td>
                    )}

                    {visibleCols.comments && postType !== 'page' && (
                      <td className="p-2.5 align-top text-center tabular-nums text-[#50575e]">
                        {post.comment_count ?? 0}
                      </td>
                    )}

                    {visibleCols.date && (
                      <td className="p-2.5 align-top text-[#50575e] text-[12px]">
                        <div>{STATUS_LABELS[post.status]}</div>
                        <div className="tabular-nums">
                          {formatTanggal(post.published_at || post.updated_at)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Pratinjau Cepat */}
      {previewPost && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#c3c4c7] bg-[#f6f7f7]">
              <div>
                <p className="text-[12px] text-[#50575e]">
                  Pratinjau {meta.singular} · /{previewPost.slug}
                </p>
                <h2 className="text-[16px] font-semibold text-[#1d2327]">
                  {previewPost.title || '(Tanpa Judul)'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                aria-label="Tutup pratinjau"
                className="p-1.5 text-[#50575e] hover:text-[#1d2327] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto prose prose-stone max-w-none bg-[#FBF9F5]">
              <h1 className="font-display text-3xl font-semibold text-[#1C1917] mb-4">
                {previewPost.title || '(Tanpa Judul)'}
              </h1>
              <div
                className="space-y-4 text-[#1C1917] leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(previewPost.content_html || '<p>(Belum ada konten)</p>'),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
