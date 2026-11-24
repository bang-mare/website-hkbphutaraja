import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Undo2,
  Redo2,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  PanelRight,
  Eye,
  History,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Image as ImageIcon,
  Youtube,
  Columns3,
  Quote,
  List,
  Heading,
  Pilcrow,
  MousePointerClick,
  Minus,
  Images,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import {
  BLOCK_DEFINITIONS,
  createBlock,
  extractPlainExcerpt,
  extractYouTubeId,
  isSafeHttpOrRelativeUrl,
  sanitizeHtml,
  serializeBlocksToHtml,
  slugify,
} from '../../lib/blocks';
import {
  createTerm,
  fetchPostById,
  fetchPostRevisions,
  fetchPostsByType,
  fetchTerms,
  savePost,
} from '../../lib/cmsData';
import { hasCapability } from '../../lib/roles';
import { MediaPickerModal } from '../../components/admin/MediaPickerModal';
import { getMediaProxyUrl } from '../../lib/mediaClient';
import type {
  BlockType,
  GutenbergBlock,
  MediaItem,
  PostRecord,
  PostRevision,
  PostStatus,
  PostType,
  Term,
} from '../../types/cms';

interface PostEditorPageProps {
  postType: PostType;
}

const BACK_ROUTES: Record<PostType, { path: string; label: string; singular: string }> = {
  post: { path: '/admin/posts', label: 'Pos', singular: 'Pos' },
  page: { path: '/admin/pages', label: 'Halaman', singular: 'Halaman' },
  warta: { path: '/admin/warta', label: 'Warta Jemaat', singular: 'Warta Jemaat' },
  album: { path: '/admin/galeri', label: 'Galeri', singular: 'Album' },
};

const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  paragraph: Pilcrow,
  heading: Heading,
  image: ImageIcon,
  gallery: Images,
  list: List,
  quote: Quote,
  button: MousePointerClick,
  columns: Columns3,
  youtube: Youtube,
  separator: Minus,
};

export function PostEditorPage({ postType }: PostEditorPageProps) {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { addNotice } = useAdmin();

  const metaInfo = BACK_ROUTES[postType];
  const canPublish = hasCapability(profile?.role, 'publish_posts');

  const [postId, setPostId] = useState<string | undefined>(id);
  const [loading, setLoading] = useState(Boolean(id));
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [blocks, setBlocks] = useState<GutenbergBlock[]>([createBlock('paragraph')]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [scheduledAt, setScheduledAt] = useState('');
  const [featuredUrl, setFeaturedUrl] = useState('');
  const [featuredMediaId, setFeaturedMediaId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string>('');
  const [menuOrder, setMenuOrder] = useState<number>(0);
  const [wartaDate, setWartaDate] = useState<string>('');
  const [wartaPdfUrl, setWartaPdfUrl] = useState<string>('');
  const [mediaPickerTarget, setMediaPickerTarget] = useState<
    | null
    | { kind: 'featured' }
    | { kind: 'warta_pdf' }
    | { kind: 'block_image'; blockId: string }
    | { kind: 'block_gallery'; blockId: string }
  >(null);

  // Categories & Tags
  const [categories, setCategories] = useState<Term[]>([]);
  const [tags, setTags] = useState<Term[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Parent Pages (khusus page)
  const [parentPages, setParentPages] = useState<PostRecord[]>([]);

  // Revisions & Undo/Redo
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [activeRevisionModal, setActiveRevisionModal] = useState<PostRevision | null>(null);
  const [undoStack, setUndoStack] = useState<GutenbergBlock[][]>([]);
  const [redoStack, setRedoStack] = useState<GutenbergBlock[][]>([]);

  // Editor UI Controls
  const [rightTab, setRightTab] = useState<'document' | 'block'>('document');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inserterOpen, setInserterOpen] = useState(false);
  const [inserterSearch, setInserterSearch] = useState('');
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  // Accordion Panels di Panel Kanan
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    status: true,
    permalink: true,
    categories: true,
    tags: true,
    featured: false,
    excerpt: false,
    pageAttr: false,
    wartaMeta: true,
    revisions: true,
  });

  const toggleAccordion = (key: string) =>
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));

  // Load initial data
  useEffect(() => {
    let active = true;

    async function load() {
      const [cats, tagList, pagesRes] = await Promise.all([
        postType !== 'page' ? fetchTerms('category') : Promise.resolve([]),
        postType === 'post' ? fetchTerms('post_tag') : Promise.resolve([]),
        postType === 'page' ? fetchPostsByType('page') : Promise.resolve({ posts: [], error: null }),
      ]);

      if (!active) return;
      setCategories(cats);
      setTags(tagList);
      setParentPages(pagesRes.posts.filter((p) => p.id !== id));

      if (id) {
        setLoading(true);
        const { post, error } = await fetchPostById(id);
        if (!active) return;

        if (error || !post) {
          addNotice({
            type: 'error',
            message: error || `${metaInfo.singular} tidak ditemukan.`,
          });
          navigate(metaInfo.path);
          return;
        }

        setPostId(post.id);
        setTitle(post.title);
        setSlug(post.slug);
        setSlugTouched(true);
        setBlocks(post.content.length > 0 ? post.content : [createBlock('paragraph')]);
        setExcerpt(post.excerpt || '');
        setStatus(post.status);
        setScheduledAt(post.scheduled_at ? post.scheduled_at.slice(0, 16) : '');
        setParentId(post.parent_id || '');
        setMenuOrder(post.menu_order || 0);
        setFeaturedMediaId(post.featured_media_id || null);
        setFeaturedUrl(
          (post.meta?.featured_url as string) ||
            (post.featured_media_id ? getMediaProxyUrl(post.featured_media_id, { width: 1024 }) : '')
        );
        setWartaDate((post.meta?.warta_date as string) || '');
        setWartaPdfUrl((post.meta?.warta_pdf_url as string) || '');

        const postTerms = post.terms || [];
        setSelectedCatIds(
          postTerms.filter((t) => t.taxonomy === 'category').map((t) => t.id)
        );
        setSelectedTagIds(
          postTerms.filter((t) => t.taxonomy === 'post_tag').map((t) => t.id)
        );

        const revs = await fetchPostRevisions(post.id);
        if (active) setRevisions(revs);
        setLoading(false);
        setIsDirty(false);
      } else {
        setPostId(undefined);
        setTitle('');
        setSlug('');
        setSlugTouched(false);
        setBlocks([createBlock('paragraph')]);
        setExcerpt('');
        setStatus('draft');
        setScheduledAt('');
        setFeaturedMediaId(null);
        setFeaturedUrl('');
        setWartaDate('');
        setWartaPdfUrl('');
        setSelectedCatIds([]);
        setSelectedTagIds([]);
        setRevisions([]);
        setIsDirty(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id, postType, addNotice, navigate, metaInfo.path, metaInfo.singular]);

  // Auto-update slug from title if user hasn't manually edited slug
  useEffect(() => {
    if (!slugTouched && title) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

  const pushBlocksWithHistory = (nextBlocks: GutenbergBlock[]) => {
    setUndoStack((prev) => [...prev.slice(-19), blocks]);
    setRedoStack([]);
    setBlocks(nextBlocks);
    setIsDirty(true);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, blocks]);
    setUndoStack((u) => u.slice(0, -1));
    setBlocks(previous);
    setIsDirty(true);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, blocks]);
    setRedoStack((r) => r.slice(0, -1));
    setBlocks(next);
    setIsDirty(true);
  };

  const updateBlock = (blockId: string, patch: Partial<GutenbergBlock>) => {
    const next = blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
    setBlocks(next);
    setIsDirty(true);
  };

  const insertBlock = (type: BlockType, afterBlockId?: string | null) => {
    const nb = createBlock(type);
    const next = [...blocks];
    if (afterBlockId) {
      const idx = next.findIndex((b) => b.id === afterBlockId);
      if (idx !== -1) {
        next.splice(idx + 1, 0, nb);
      } else {
        next.push(nb);
      }
    } else {
      next.push(nb);
    }
    pushBlocksWithHistory(next);
    setSelectedBlockId(nb.id);
    setInserterOpen(false);
    setSlashBlockId(null);
  };

  const replaceSlashBlock = (blockId: string, type: BlockType) => {
    const nb = createBlock(type);
    const next = blocks.map((b) => (b.id === blockId ? nb : b));
    pushBlocksWithHistory(next);
    setSelectedBlockId(nb.id);
    setSlashBlockId(null);
  };

  const moveBlock = (blockId: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [removed] = next.splice(idx, 1);
    next.splice(target, 0, removed);
    pushBlocksWithHistory(next);
  };

  const duplicateBlock = (blockId: string) => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const copy: GutenbergBlock = {
      ...JSON.parse(JSON.stringify(blocks[idx])),
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    pushBlocksWithHistory(next);
    setSelectedBlockId(copy.id);
  };

  const deleteBlock = (blockId: string) => {
    if (blocks.length === 1) {
      pushBlocksWithHistory([createBlock('paragraph')]);
      return;
    }
    const next = blocks.filter((b) => b.id !== blockId);
    pushBlocksWithHistory(next);
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const performSave = useCallback(
    async (
      targetStatus: PostStatus,
      options: { isAuto?: boolean; createRevision?: boolean } = {}
    ) => {
      if (!options.isAuto) setSaving(true);
      if (options.isAuto) setAutosaveStatus('Menyimpan otomatis...');

      const finalExcerpt = excerpt.trim() || extractPlainExcerpt(blocks);
      const termIds = [...selectedCatIds, ...selectedTagIds];

      const { post: saved, error } = await savePost({
        id: postId,
        type: postType,
        title: title.trim() || '(Tanpa Judul)',
        slug: slug.trim() || slugify(title) || `${postType}-${Date.now()}`,
        content: blocks,
        excerpt: finalExcerpt,
        status: targetStatus,
        author_id: profile?.id || null,
        featured_media_id: featuredMediaId,
        scheduled_at:
          targetStatus === 'future' && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        parent_id: postType === 'page' && parentId ? parentId : null,
        menu_order: postType === 'page' ? menuOrder : 0,
        meta: {
          featured_url: isSafeHttpOrRelativeUrl(featuredUrl),
          warta_date: wartaDate,
          warta_pdf_url: isSafeHttpOrRelativeUrl(wartaPdfUrl),
        },
        termIds,
        createRevision: options.createRevision ?? !options.isAuto,
      });

      if (!options.isAuto) setSaving(false);

      if (error || !saved) {
        if (options.isAuto) {
          setAutosaveStatus('Gagal autosave');
        } else {
          addNotice({ type: 'error', message: `Gagal menyimpan: ${error}` });
        }
        return;
      }

      const wasNew = !postId;
      setPostId(saved.id);
      setSlug(saved.slug);
      setStatus(saved.status);
      setIsDirty(false);

      if (options.isAuto) {
        const timeStr = new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date());
        setAutosaveStatus(`Tersimpan otomatis pukul ${timeStr}`);
      } else {
        setAutosaveStatus('');
        const revs = await fetchPostRevisions(saved.id);
        setRevisions(revs);

        const actionText =
          targetStatus === 'publish'
            ? `${metaInfo.singular} diterbitkan.`
            : targetStatus === 'future'
              ? `${metaInfo.singular} dijadwalkan.`
              : targetStatus === 'pending'
                ? `${metaInfo.singular} dikirim untuk ditinjau.`
                : 'Draf disimpan.';

        addNotice({
          type: 'success',
          message: actionText,
          linkLabel: `Kembali ke daftar ${metaInfo.label}`,
          linkTo: metaInfo.path,
        });

        if (wasNew) {
          navigate(`${metaInfo.path}/${saved.id}`, { replace: true });
        }
      }
    },
    [
      addNotice,
      blocks,
      excerpt,
      featuredMediaId,
      featuredUrl,
      menuOrder,
      metaInfo.label,
      metaInfo.path,
      metaInfo.singular,
      navigate,
      parentId,
      postId,
      postType,
      profile?.id,
      scheduledAt,
      selectedCatIds,
      selectedTagIds,
      slug,
      title,
      wartaDate,
      wartaPdfUrl,
    ]
  );

  // Autosave setiap 20 detik jika ada perubahan
  const latestSaveRef = useRef(performSave);
  latestSaveRef.current = performSave;

  useEffect(() => {
    if (!isDirty || (!title.trim() && blocks.length === 1 && !blocks[0].content)) return;
    const timer = window.setTimeout(() => {
      const target = status === 'publish' ? 'publish' : 'draft';
      void latestSaveRef.current(target, { isAuto: true, createRevision: false });
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [isDirty, title, blocks, status]);

  const handleAddInlineCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const { term, error } = await createTerm({
      name: newCatName.trim(),
      taxonomy: 'category',
    });
    if (error || !term) {
      addNotice({ type: 'error', message: `Gagal menambah kategori: ${error}` });
      return;
    }
    setCategories((prev) => [...prev, term]);
    setSelectedCatIds((prev) => [...prev, term.id]);
    setNewCatName('');
    setShowNewCatForm(false);
  };

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const cleaned = tagInput.replace(/,/g, '').trim();
    if (!cleaned) return;

    const existing = tags.find((t) => t.name.toLowerCase() === cleaned.toLowerCase());
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds((prev) => [...prev, existing.id]);
      }
      setTagInput('');
      return;
    }

    const { term, error } = await createTerm({
      name: cleaned,
      taxonomy: 'post_tag',
    });
    if (error || !term) {
      addNotice({ type: 'error', message: `Gagal membuat tag: ${error}` });
      return;
    }
    setTags((prev) => [...prev, term]);
    setSelectedTagIds((prev) => [...prev, term.id]);
    setTagInput('');
  };

  const handleRestoreRevision = (rev: PostRevision) => {
    setTitle(rev.title);
    setBlocks(rev.content.length > 0 ? rev.content : [createBlock('paragraph')]);
    setExcerpt(rev.excerpt);
    setIsDirty(true);
    setActiveRevisionModal(null);
    addNotice({
      type: 'info',
      message: `Revisi #${rev.revision_number} dimuat ke editor. Klik Perbarui/Simpan Draf untuk menerapkan.`,
    });
  };

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  const filteredInserterBlocks = useMemo(() => {
    const q = inserterSearch.trim().toLowerCase();
    if (!q) return BLOCK_DEFINITIONS;
    return BLOCK_DEFINITIONS.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.keywords.some((k) => k.includes(q))
    );
  }, [inserterSearch]);

  const previewHtml = useMemo(() => serializeBlocksToHtml(blocks), [blocks]);

  if (loading) {
    return (
      <div className="py-12 text-center text-[13px] text-[#50575e]">
        Memuat editor blok...
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:-mx-5 -mb-8 flex flex-col min-h-[calc(100vh-80px)] bg-white border-t border-[#c3c4c7]">
      {/* ====================================================================
          TOP GUTENBERG TOOLBAR
         ==================================================================== */}
      <div className="sticky top-[46px] md:top-[32px] z-20 h-[56px] bg-white border-b border-[#e0e0e0] px-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Link
            to={metaInfo.path}
            title={`Kembali ke daftar ${metaInfo.label}`}
            className="w-9 h-9 flex items-center justify-center rounded-[2px] bg-[#1d2327] text-white hover:bg-[#2c3338]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setInserterOpen((o) => !o)}
              title="Tambah Blok"
              className={`h-9 px-2.5 flex items-center gap-1 rounded-[2px] text-[13px] font-medium cursor-pointer ${
                inserterOpen
                  ? 'bg-[#1d2327] text-white'
                  : 'bg-[#2271b1] hover:bg-[#135e96] text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Blok</span>
            </button>

            {inserterOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-[#c3c4c7] shadow-xl p-3 z-40 rounded-[2px]">
                <input
                  type="search"
                  value={inserterSearch}
                  onChange={(e) => setInserterSearch(e.target.value)}
                  placeholder="Cari blok..."
                  autoFocus
                  className="w-full h-8 px-2.5 mb-2.5 text-[13px] border border-[#8c8f94] rounded-[2px]"
                />
                <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
                  {filteredInserterBlocks.map((def) => {
                    const IconComp = BLOCK_ICONS[def.type];
                    return (
                      <button
                        key={def.type}
                        type="button"
                        onClick={() => insertBlock(def.type, selectedBlockId)}
                        className="flex flex-col items-center gap-1 p-2.5 border border-transparent hover:border-[#2271b1] hover:bg-[#f0f6fc] rounded-[2px] text-center cursor-pointer"
                      >
                        <IconComp className="w-5 h-5 text-[#1d2327]" />
                        <span className="text-[12px] text-[#1d2327] font-medium">
                          {def.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Urungkan (Undo)"
            className="w-8 h-8 flex items-center justify-center rounded-[2px] hover:bg-[#f0f0f1] disabled:opacity-35 cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Ulangi (Redo)"
            className="w-8 h-8 flex items-center justify-center rounded-[2px] hover:bg-[#f0f0f1] disabled:opacity-35 cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[13px]">
          {autosaveStatus && (
            <span className="hidden lg:inline text-[12px] text-[#50575e]">
              {autosaveStatus}
            </span>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => void performSave('draft', { createRevision: true })}
            className="px-3 h-8 text-[#2271b1] hover:bg-[#f0f6fc] rounded-[2px] cursor-pointer whitespace-nowrap"
          >
            Simpan Draf
          </button>

          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="px-3 h-8 border border-[#c3c4c7] hover:bg-[#f6f7f7] text-[#1d2327] rounded-[2px] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pratinjau</span>
          </button>

          {canPublish ? (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void performSave(status === 'future' ? 'future' : 'publish', {
                  createRevision: true,
                })
              }
              className="px-3.5 h-8 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[2px] cursor-pointer whitespace-nowrap"
            >
              {saving
                ? 'Menyimpan...'
                : status === 'publish'
                  ? 'Perbarui'
                  : status === 'future'
                    ? 'Jadwalkan'
                    : 'Terbitkan'}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void performSave('pending', { createRevision: true })}
              className="px-3.5 h-8 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[2px] cursor-pointer whitespace-nowrap"
            >
              {saving ? 'Mengirim...' : 'Kirim untuk Tinjauan'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            title="Pengaturan Pos & Blok"
            className={`w-8 h-8 flex items-center justify-center rounded-[2px] cursor-pointer ${
              sidebarOpen
                ? 'bg-[#1d2327] text-white'
                : 'hover:bg-[#f0f0f1] text-[#1d2327]'
            }`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ====================================================================
          BODY: CANVAS TENGAH + PANEL KANAN (POS / BLOK)
         ==================================================================== */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas Editor Tengah */}
        <div
          className="flex-1 overflow-y-auto px-4 sm:px-10 py-10 bg-white"
          onClick={() => setInserterOpen(false)}
        >
          <div className="max-w-3xl mx-auto">
            {/* Judul Besar ala Gutenberg */}
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Tambahkan judul"
              className="w-full font-display text-3xl sm:text-4xl font-semibold text-[#1d2327] placeholder:text-[#8c8f94] focus:outline-none mb-6 border-b border-transparent focus:border-[#e0e0e0] pb-2"
            />

            {/* Daftar Blok */}
            <div className="space-y-4">
              {blocks.map((block, index) => {
                const isSelected = selectedBlockId === block.id;
                const def = BLOCK_DEFINITIONS.find((d) => d.type === block.type);

                return (
                  <div
                    key={block.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBlockId(block.id);
                    }}
                    className={`relative group rounded-[2px] p-2 -mx-2 transition-colors ${
                      isSelected
                        ? 'ring-1 ring-[#2271b1] bg-[#f8fafc]/60'
                        : 'hover:ring-1 hover:ring-[#dcdcde]'
                    }`}
                  >
                    {/* Block Floating Toolbar */}
                    {isSelected && (
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#e0e0e0] text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1d2327]">
                            {def?.label}
                          </span>

                          {block.type === 'heading' && (
                            <div className="flex items-center border border-[#c3c4c7] rounded-[2px] overflow-hidden">
                              {([2, 3, 4] as const).map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => updateBlock(block.id, { level: lvl })}
                                  className={`px-2 py-0.5 cursor-pointer ${
                                    block.level === lvl
                                      ? 'bg-[#1d2327] text-white'
                                      : 'bg-white text-[#3c434a]'
                                  }`}
                                >
                                  H{lvl}
                                </button>
                              ))}
                            </div>
                          )}

                          {block.type === 'list' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateBlock(block.id, { ordered: !block.ordered })
                              }
                              className="px-2 py-0.5 border border-[#c3c4c7] rounded-[2px] bg-white cursor-pointer"
                            >
                              {block.ordered ? 'Bernomor (1,2,3)' : 'Butir (•)'}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveBlock(block.id, -1)}
                            title="Naikkan blok"
                            className="p-1 hover:bg-[#f0f0f1] disabled:opacity-30 rounded cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === blocks.length - 1}
                            onClick={() => moveBlock(block.id, 1)}
                            title="Turunkan blok"
                            className="p-1 hover:bg-[#f0f0f1] disabled:opacity-30 rounded cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateBlock(block.id)}
                            title="Duplikat blok"
                            className="p-1 hover:bg-[#f0f0f1] rounded cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBlock(block.id)}
                            title="Hapus blok"
                            className="p-1 hover:bg-[#fceaea] text-[#d63638] rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Render Isi Blok sesuai Tipe */}
                    {block.type === 'paragraph' && (
                      <div className="relative">
                        <textarea
                          rows={Math.max(2, (block.content || '').split('\n').length)}
                          value={block.content || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateBlock(block.id, { content: val });
                            if (val === '/') {
                              setSlashBlockId(block.id);
                            } else if (slashBlockId === block.id) {
                              setSlashBlockId(null);
                            }
                          }}
                          placeholder="Mulai menulis atau ketik / untuk memilih blok..."
                          style={{ textAlign: block.align || 'left' }}
                          className="w-full text-[16px] leading-relaxed text-[#1d2327] placeholder:text-[#a7aaad] focus:outline-none resize-none bg-transparent"
                        />
                        {slashBlockId === block.id && (
                          <div className="absolute left-0 top-full z-30 w-64 bg-white border border-[#c3c4c7] shadow-lg p-1.5 rounded-[2px]">
                            <p className="px-2 py-1 text-[11px] font-semibold text-[#50575e] uppercase">
                              Pilih Blok
                            </p>
                            {BLOCK_DEFINITIONS.map((d) => {
                              const Ic = BLOCK_ICONS[d.type];
                              return (
                                <button
                                  key={d.type}
                                  type="button"
                                  onClick={() => replaceSlashBlock(block.id, d.type)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-left hover:bg-[#f0f6fc] rounded-[2px] cursor-pointer"
                                >
                                  <Ic className="w-4 h-4 text-[#50575e]" />
                                  <span>{d.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {block.type === 'heading' && (
                      <input
                        type="text"
                        value={block.content || ''}
                        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                        placeholder={`Subjudul H${block.level || 2}...`}
                        style={{ textAlign: block.align || 'left' }}
                        className={`w-full font-display font-semibold text-[#1d2327] placeholder:text-[#a7aaad] focus:outline-none bg-transparent ${
                          block.level === 4
                            ? 'text-lg'
                            : block.level === 3
                              ? 'text-xl'
                              : 'text-2xl'
                        }`}
                      />
                    )}

                    {block.type === 'image' && (
                      <div className="border border-[#dcdcde] bg-[#f6f7f7] p-3 rounded-[2px] space-y-2 text-[13px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setMediaPickerTarget({ kind: 'block_image', blockId: block.id })
                            }
                            className="px-2.5 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white text-[12px] rounded-[2px] cursor-pointer"
                          >
                            Pilih dari Pustaka Media
                          </button>
                          <span className="text-[11px] text-[#50575e]">
                            atau tempel URL gambar di bawah
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="url"
                            value={block.url || ''}
                            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                            placeholder="URL Gambar (/api/media/... atau https://...)"
                            className="h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[2px]"
                          />
                          <input
                            type="text"
                            value={block.alt || ''}
                            onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                            placeholder="Teks alternatif (Alt text)"
                            className="h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[2px]"
                          />
                        </div>
                        {isSafeHttpOrRelativeUrl(block.url) && (
                          <img
                            src={isSafeHttpOrRelativeUrl(block.url)}
                            alt={block.alt || 'Pratinjau gambar'}
                            referrerPolicy="no-referrer"
                            className="max-h-72 object-contain mx-auto border border-[#dcdcde] bg-white"
                          />
                        )}
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                          placeholder="Tambahkan keterangan gambar..."
                          className="w-full h-7 px-2 bg-white border border-[#dcdcde] rounded-[2px] text-[12px] text-center"
                        />
                      </div>
                    )}

                    {block.type === 'gallery' && (
                      <div className="border border-[#dcdcde] bg-[#f6f7f7] p-3 rounded-[2px] space-y-2.5 text-[13px]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-[#1d2327]">
                            Galeri Foto ({(block.gallery || []).length} foto)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setMediaPickerTarget({ kind: 'block_gallery', blockId: block.id })
                              }
                              className="px-2 py-1 text-[12px] bg-[#2271b1] text-white rounded-[2px] cursor-pointer"
                            >
                              Pilih dari Pustaka Media
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateBlock(block.id, {
                                  gallery: [
                                    ...(block.gallery || []),
                                    { url: '', alt: '', caption: '' },
                                  ],
                                })
                              }
                              className="px-2 py-1 text-[12px] bg-white border border-[#2271b1] text-[#2271b1] rounded-[2px] cursor-pointer"
                            >
                              + URL Manual
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(block.gallery || []).map((item, gIdx) => (
                            <div
                              key={gIdx}
                              className="bg-white border border-[#dcdcde] p-2 space-y-1.5"
                            >
                              <input
                                type="url"
                                value={item.url}
                                onChange={(e) => {
                                  const nextGal = [...(block.gallery || [])];
                                  nextGal[gIdx] = { ...nextGal[gIdx], url: e.target.value };
                                  updateBlock(block.id, { gallery: nextGal });
                                }}
                                placeholder={`URL Foto #${gIdx + 1}`}
                                className="w-full h-7 px-2 border border-[#8c8f94] rounded-[2px] text-[12px]"
                              />
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={item.alt}
                                  onChange={(e) => {
                                    const nextGal = [...(block.gallery || [])];
                                    nextGal[gIdx] = { ...nextGal[gIdx], alt: e.target.value };
                                    updateBlock(block.id, { gallery: nextGal });
                                  }}
                                  placeholder="Teks alt"
                                  className="flex-1 h-7 px-2 border border-[#dcdcde] rounded-[2px] text-[12px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextGal = (block.gallery || []).filter(
                                      (_, i) => i !== gIdx
                                    );
                                    updateBlock(block.id, { gallery: nextGal });
                                  }}
                                  className="text-[11px] text-[#d63638] px-1.5 cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                          placeholder="Keterangan galeri..."
                          className="w-full h-7 px-2 bg-white border border-[#dcdcde] rounded-[2px] text-[12px]"
                        />
                      </div>
                    )}

                    {block.type === 'list' && (
                      <div className="space-y-1.5 pl-2">
                        {(block.items || ['']).map((item, iIdx) => (
                          <div key={iIdx} className="flex items-center gap-2">
                            <span className="text-[#50575e] w-5 text-right tabular-nums text-[13px]">
                              {block.ordered ? `${iIdx + 1}.` : '•'}
                            </span>
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const nextItems = [...(block.items || [])];
                                nextItems[iIdx] = e.target.value;
                                updateBlock(block.id, { items: nextItems });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const nextItems = [...(block.items || [])];
                                  nextItems.splice(iIdx + 1, 0, '');
                                  updateBlock(block.id, { items: nextItems });
                                }
                              }}
                              placeholder="Tulis item daftar (tekan Enter untuk baris baru)..."
                              className="flex-1 text-[15px] py-0.5 focus:outline-none border-b border-transparent focus:border-[#dcdcde]"
                            />
                            {(block.items || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextItems = (block.items || []).filter(
                                    (_, i) => i !== iIdx
                                  );
                                  updateBlock(block.id, { items: nextItems });
                                }}
                                className="text-[11px] text-[#787c82] hover:text-[#d63638] cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {block.type === 'quote' && (
                      <div className="p-4 bg-[#FBF9F5] border border-stone-200 rounded-[2px] space-y-2">
                        <textarea
                          rows={2}
                          value={block.content || ''}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Tulis kutipan atau ayat Alkitab..."
                          className="w-full font-display italic text-lg text-[#1C1917] bg-transparent focus:outline-none resize-none"
                        />
                        <input
                          type="text"
                          value={block.citation || ''}
                          onChange={(e) => updateBlock(block.id, { citation: e.target.value })}
                          placeholder="Sumber / Referensi ayat (mis. Mazmur 23:1)"
                          className="w-full text-[13px] text-stone-600 bg-transparent focus:outline-none"
                        />
                      </div>
                    )}

                    {block.type === 'button' && (
                      <div
                        className={`flex flex-col gap-2 ${
                          block.align === 'center'
                            ? 'items-center'
                            : block.align === 'right'
                              ? 'items-end'
                              : 'items-start'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={block.buttonText || ''}
                            onChange={(e) =>
                              updateBlock(block.id, { buttonText: e.target.value })
                            }
                            placeholder="Teks tombol..."
                            className={`px-4 py-2 text-[14px] font-medium rounded-[4px] focus:outline-none ${
                              block.buttonVariant === 'outline'
                                ? 'border-2 border-[#1E3A5F] text-[#1E3A5F] bg-white'
                                : 'bg-[#1E3A5F] text-white'
                            }`}
                          />
                          <input
                            type="url"
                            value={block.buttonUrl || ''}
                            onChange={(e) =>
                              updateBlock(block.id, { buttonUrl: e.target.value })
                            }
                            placeholder="https://tautan-tujuan"
                            className="h-9 px-2.5 text-[12px] border border-[#8c8f94] rounded-[2px] w-56"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'columns' && (
                      <div
                        className={`grid gap-4 ${
                          block.columnsCount === 3
                            ? 'grid-cols-1 md:grid-cols-3'
                            : 'grid-cols-1 md:grid-cols-2'
                        }`}
                      >
                        {(block.columns || []).map((col, cIdx) => (
                          <div
                            key={cIdx}
                            className="border border-dashed border-[#c3c4c7] p-3 rounded-[2px] space-y-1.5"
                          >
                            <input
                              type="text"
                              value={col.heading || ''}
                              onChange={(e) => {
                                const nextCols = [...(block.columns || [])];
                                nextCols[cIdx] = { ...nextCols[cIdx], heading: e.target.value };
                                updateBlock(block.id, { columns: nextCols });
                              }}
                              placeholder={`Judul Kolom ${cIdx + 1}`}
                              className="w-full font-semibold text-[14px] focus:outline-none"
                            />
                            <textarea
                              rows={3}
                              value={col.body}
                              onChange={(e) => {
                                const nextCols = [...(block.columns || [])];
                                nextCols[cIdx] = { ...nextCols[cIdx], body: e.target.value };
                                updateBlock(block.id, { columns: nextCols });
                              }}
                              placeholder="Isi kolom..."
                              className="w-full text-[13px] focus:outline-none resize-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {block.type === 'youtube' && (
                      <div className="border border-[#dcdcde] bg-[#f6f7f7] p-3 rounded-[2px] space-y-2 text-[13px]">
                        <input
                          type="url"
                          value={block.url || ''}
                          onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                          placeholder="Tempel tautan YouTube (contoh: https://www.youtube.com/watch?v=...)"
                          className="w-full h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[2px]"
                        />
                        {extractYouTubeId(block.url) && (
                          <div className="aspect-video w-full bg-black rounded overflow-hidden">
                            <iframe
                              src={`https://www.youtube.com/embed/${extractYouTubeId(block.url)}`}
                              title="Pratinjau Video YouTube"
                              allowFullScreen
                              className="w-full h-full border-0"
                            />
                          </div>
                        )}
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                          placeholder="Keterangan video (opsional)..."
                          className="w-full h-7 px-2 bg-white border border-[#dcdcde] rounded-[2px] text-[12px]"
                        />
                      </div>
                    )}

                    {block.type === 'separator' && (
                      <div className="py-3 flex justify-center">
                        {block.separatorStyle === 'dots' ? (
                          <span className="tracking-[1em] text-[#50575e] text-lg">
                            • • •
                          </span>
                        ) : (
                          <hr
                            className={`border-t border-[#8c8f94] ${
                              block.separatorStyle === 'wide' ? 'w-full' : 'w-32'
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tombol Tambah Blok di bawah kanvas */}
            <div className="mt-8 pt-4 border-t border-[#f0f0f1] flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-[#50575e] mr-1">Tambah cepat:</span>
              {(['paragraph', 'heading', 'image', 'list', 'quote', 'youtube'] as BlockType[]).map(
                (t) => {
                  const def = BLOCK_DEFINITIONS.find((d) => d.type === t)!;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => insertBlock(t, blocks[blocks.length - 1]?.id)}
                      className="px-2.5 py-1 text-[12px] bg-[#f6f7f7] hover:bg-[#f0f6fc] border border-[#c3c4c7] hover:border-[#2271b1] text-[#1d2327] rounded-[2px] cursor-pointer"
                    >
                      + {def.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* ====================================================================
            PANEL KANAN: POS / BLOK INSPECTOR
           ==================================================================== */}
        {sidebarOpen && (
          <aside className="w-[290px] sm:w-[310px] border-l border-[#e0e0e0] bg-white overflow-y-auto shrink-0 text-[13px]">
            {/* Tab Pos / Blok */}
            <div className="flex border-b border-[#e0e0e0] bg-[#f6f7f7]">
              <button
                type="button"
                onClick={() => setRightTab('document')}
                className={`flex-1 py-2.5 font-medium border-b-2 cursor-pointer ${
                  rightTab === 'document'
                    ? 'border-b-[#2271b1] bg-white text-[#1d2327]'
                    : 'border-b-transparent text-[#50575e] hover:text-[#1d2327]'
                }`}
              >
                {metaInfo.singular}
              </button>
              <button
                type="button"
                onClick={() => setRightTab('block')}
                className={`flex-1 py-2.5 font-medium border-b-2 cursor-pointer ${
                  rightTab === 'block'
                    ? 'border-b-[#2271b1] bg-white text-[#1d2327]'
                    : 'border-b-transparent text-[#50575e] hover:text-[#1d2327]'
                }`}
              >
                Blok
              </button>
            </div>

            {rightTab === 'document' ? (
              <div className="divide-y divide-[#e0e0e0]">
                {/* 1. Status & Visibilitas */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('status')}
                    className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                  >
                    <span>Status &amp; Visibilitas</span>
                    {openAccordions.status ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {openAccordions.status && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#50575e]">Status</span>
                        <select
                          value={status}
                          onChange={(e) => {
                            setStatus(e.target.value as PostStatus);
                            setIsDirty(true);
                          }}
                          className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                        >
                          {canPublish && <option value="publish">Terbit</option>}
                          <option value="draft">Draf</option>
                          <option value="pending">Menunggu Tinjauan</option>
                          {canPublish && <option value="future">Terjadwal</option>}
                          {canPublish && <option value="private">Pribadi</option>}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#50575e] mb-1">
                          Jadwalkan Terbit
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => {
                            setScheduledAt(e.target.value);
                            if (e.target.value && canPublish) setStatus('future');
                            setIsDirty(true);
                          }}
                          className="w-full h-7 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
                        />
                      </div>

                      {postId && status !== 'trash' && (
                        <button
                          type="button"
                          onClick={() => void performSave('trash', { createRevision: false })}
                          className="w-full py-1.5 border border-[#d63638] text-[#d63638] hover:bg-[#fceaea] rounded-[2px] cursor-pointer"
                        >
                          Pindah ke Sampah
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Permalink */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('permalink')}
                    className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                  >
                    <span>Permalink</span>
                    {openAccordions.permalink ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {openAccordions.permalink && (
                    <div className="px-4 pb-4 space-y-1.5">
                      <label className="block text-[12px] text-[#50575e]">
                        Slug URL
                      </label>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full h-7 px-2 border border-[#8c8f94] rounded-[2px] font-mono text-[12px]"
                      />
                      <p className="text-[11px] text-[#50575e] break-all">
                        Pratinjau: <span className="text-[#2271b1]">/{slug || '...'}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Kategori (untuk post & warta) */}
                {postType !== 'page' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleAccordion('categories')}
                      className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                    >
                      <span>Kategori</span>
                      {openAccordions.categories ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {openAccordions.categories && (
                      <div className="px-4 pb-4 space-y-2">
                        <div className="max-h-36 overflow-y-auto space-y-1.5">
                          {categories.map((cat) => (
                            <label
                              key={cat.id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCatIds.includes(cat.id)}
                                onChange={() => {
                                  setSelectedCatIds((prev) =>
                                    prev.includes(cat.id)
                                      ? prev.filter((x) => x !== cat.id)
                                      : [...prev, cat.id]
                                  );
                                  setIsDirty(true);
                                }}
                              />
                              <span>{cat.name}</span>
                            </label>
                          ))}
                        </div>

                        {!showNewCatForm ? (
                          <button
                            type="button"
                            onClick={() => setShowNewCatForm(true)}
                            className="text-[#2271b1] underline text-[12px] cursor-pointer"
                          >
                            + Tambah Kategori Baru
                          </button>
                        ) : (
                          <form onSubmit={handleAddInlineCategory} className="space-y-1.5 pt-1">
                            <input
                              type="text"
                              value={newCatName}
                              onChange={(e) => setNewCatName(e.target.value)}
                              placeholder="Nama kategori baru"
                              className="w-full h-7 px-2 border border-[#8c8f94] rounded-[2px]"
                            />
                            <div className="flex gap-1.5">
                              <button
                                type="submit"
                                className="px-2.5 py-1 bg-[#2271b1] text-white text-[12px] rounded-[2px] cursor-pointer"
                              >
                                Tambah
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowNewCatForm(false)}
                                className="px-2 py-1 text-[12px] text-[#50575e] cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Tag (untuk post) */}
                {postType === 'post' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleAccordion('tags')}
                      className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                    >
                      <span>Tag</span>
                      {openAccordions.tags ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {openAccordions.tags && (
                      <div className="px-4 pb-4 space-y-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => void handleAddTag(e)}
                          placeholder="Ketik tag lalu tekan Enter..."
                          className="w-full h-7 px-2 border border-[#8c8f94] rounded-[2px]"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTagIds.map((tid) => {
                            const t = tags.find((x) => x.id === tid);
                            if (!t) return null;
                            return (
                              <span
                                key={tid}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f0f0f1] border border-[#c3c4c7] rounded-[2px] text-[12px]"
                              >
                                <span>{t.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedTagIds((prev) =>
                                      prev.filter((x) => x !== tid)
                                    )
                                  }
                                  className="text-[#50575e] hover:text-[#d63638] cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Warta Metadata (khusus warta) */}
                {postType === 'warta' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleAccordion('wartaMeta')}
                      className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                    >
                      <span>Lampiran Warta Jemaat</span>
                      {openAccordions.wartaMeta ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {openAccordions.wartaMeta && (
                      <div className="px-4 pb-4 space-y-2.5">
                        <div>
                          <label className="block text-[12px] text-[#50575e] mb-1">
                            Tanggal Minggu Warta
                          </label>
                          <input
                            type="date"
                            value={wartaDate}
                            onChange={(e) => {
                              setWartaDate(e.target.value);
                              setIsDirty(true);
                            }}
                            className="w-full h-7 px-2 border border-[#8c8f94] rounded-[2px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] text-[#50575e] mb-1">
                            File PDF Warta Jemaat
                          </label>
                          <button
                            type="button"
                            onClick={() => setMediaPickerTarget({ kind: 'warta_pdf' })}
                            className="w-full mb-1.5 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f6fc] border border-[#2271b1] text-[#2271b1] text-[12px] rounded-[2px] cursor-pointer"
                          >
                            Unggah / Pilih PDF dari Google Drive
                          </button>
                          <input
                            type="url"
                            value={wartaPdfUrl}
                            onChange={(e) => {
                              setWartaPdfUrl(e.target.value);
                              setIsDirty(true);
                            }}
                            placeholder="/api/media/... atau https://..."
                            className="w-full h-7 px-2 border border-[#8c8f94] rounded-[2px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Gambar Unggulan */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('featured')}
                    className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                  >
                    <span>Gambar Unggulan</span>
                    {openAccordions.featured ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {openAccordions.featured && (
                    <div className="px-4 pb-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => setMediaPickerTarget({ kind: 'featured' })}
                        className="w-full py-2 border border-dashed border-[#8c8f94] bg-[#f6f7f7] hover:border-[#2271b1] hover:text-[#2271b1] text-[12px] rounded-[2px] cursor-pointer"
                      >
                        Tetapkan Gambar Unggulan
                      </button>
                      <input
                        type="url"
                        value={featuredUrl}
                        onChange={(e) => {
                          setFeaturedUrl(e.target.value);
                          setFeaturedMediaId(null);
                          setIsDirty(true);
                        }}
                        placeholder="URL gambar unggulan..."
                        className="w-full h-7 px-2 border border-[#8c8f94] rounded-[2px]"
                      />
                      {isSafeHttpOrRelativeUrl(featuredUrl) && (
                        <div className="space-y-1">
                          <img
                            src={isSafeHttpOrRelativeUrl(featuredUrl)}
                            alt="Gambar Unggulan"
                            referrerPolicy="no-referrer"
                            className="w-full h-32 object-cover border border-[#dcdcde]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFeaturedUrl('');
                              setFeaturedMediaId(null);
                              setIsDirty(true);
                            }}
                            className="text-[11px] text-[#d63638] hover:underline cursor-pointer"
                          >
                            Hapus gambar unggulan
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. Kutipan (Excerpt) */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('excerpt')}
                    className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                  >
                    <span>Kutipan (Excerpt)</span>
                    {openAccordions.excerpt ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {openAccordions.excerpt && (
                    <div className="px-4 pb-4">
                      <textarea
                        rows={3}
                        value={excerpt}
                        onChange={(e) => {
                          setExcerpt(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Ringkasan singkat artikel (opsional)..."
                        className="w-full p-2 border border-[#8c8f94] rounded-[2px]"
                      />
                    </div>
                  )}
                </div>

                {/* 8. Atribut Halaman */}
                {postType === 'page' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleAccordion('pageAttr')}
                      className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                    >
                      <span>Atribut Halaman</span>
                      {openAccordions.pageAttr ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {openAccordions.pageAttr && (
                      <div className="px-4 pb-4 space-y-2.5">
                        <div>
                          <label className="block text-[12px] text-[#50575e] mb-1">
                            Halaman Induk
                          </label>
                          <select
                            value={parentId}
                            onChange={(e) => {
                              setParentId(e.target.value);
                              setIsDirty(true);
                            }}
                            className="w-full h-7 px-2 border border-[#8c8f94] rounded-[2px]"
                          >
                            <option value="">(Tidak ada induk)</option>
                            {parentPages.map((pg) => (
                              <option key={pg.id} value={pg.id}>
                                {pg.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] text-[#50575e] mb-1">
                            Urutan
                          </label>
                          <input
                            type="number"
                            value={menuOrder}
                            onChange={(e) => {
                              setMenuOrder(Number(e.target.value) || 0);
                              setIsDirty(true);
                            }}
                            className="w-24 h-7 px-2 border border-[#8c8f94] rounded-[2px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 10. Riwayat Revisi */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('revisions')}
                    className="w-full px-4 py-3 flex items-center justify-between font-medium text-[#1d2327] hover:bg-[#f6f7f7] cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <History className="w-4 h-4 text-[#50575e]" />
                      <span>Revisi ({revisions.length})</span>
                    </span>
                    {openAccordions.revisions ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {openAccordions.revisions && (
                    <div className="px-4 pb-4">
                      {revisions.length === 0 ? (
                        <p className="text-[12px] text-[#50575e]">
                          Revisi otomatis tercatat setiap kali Anda menyimpan atau menerbitkan perubahan.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                          {revisions.map((rev) => (
                            <li
                              key={rev.id}
                              className="flex items-center justify-between gap-2 text-[12px] py-1 border-b border-[#f0f0f1]"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-[#1d2327]">
                                  Revisi #{rev.revision_number}
                                </span>
                                <p className="text-[11px] text-[#50575e] tabular-nums">
                                  {new Intl.DateTimeFormat('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }).format(new Date(rev.created_at))}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveRevisionModal(rev)}
                                className="text-[#2271b1] hover:underline shrink-0 cursor-pointer"
                              >
                                Lihat
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TAB BLOK INSPECTOR */
              <div className="p-4 space-y-4">
                {!selectedBlock ? (
                  <p className="text-[#50575e]">
                    Pilih salah satu blok di area kanvas untuk melihat pengaturannya.
                  </p>
                ) : (
                  <>
                    <div className="pb-2 border-b border-[#e0e0e0]">
                      <p className="font-semibold text-[#1d2327]">
                        {BLOCK_DEFINITIONS.find((d) => d.type === selectedBlock.type)?.label}
                      </p>
                      <p className="text-[12px] text-[#50575e]">
                        {BLOCK_DEFINITIONS.find((d) => d.type === selectedBlock.type)?.description}
                      </p>
                    </div>

                    {(selectedBlock.type === 'paragraph' ||
                      selectedBlock.type === 'heading' ||
                      selectedBlock.type === 'button') && (
                      <div>
                        <p className="font-medium text-[#1d2327] mb-1.5">Perataan Teks</p>
                        <div className="flex border border-[#8c8f94] rounded-[2px] overflow-hidden">
                          {(['left', 'center', 'right'] as const).map((al) => (
                            <button
                              key={al}
                              type="button"
                              onClick={() => updateBlock(selectedBlock.id, { align: al })}
                              className={`flex-1 py-1 text-[12px] cursor-pointer ${
                                (selectedBlock.align || 'left') === al
                                  ? 'bg-[#2271b1] text-white'
                                  : 'bg-white text-[#3c434a]'
                              }`}
                            >
                              {al === 'left' ? 'Kiri' : al === 'center' ? 'Tengah' : 'Kanan'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedBlock.type === 'button' && (
                      <div>
                        <p className="font-medium text-[#1d2327] mb-1.5">Gaya Tombol</p>
                        <select
                          value={selectedBlock.buttonVariant || 'solid'}
                          onChange={(e) =>
                            updateBlock(selectedBlock.id, {
                              buttonVariant: e.target.value as 'solid' | 'outline',
                            })
                          }
                          className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                        >
                          <option value="solid">Terisi Penuh</option>
                          <option value="outline">Garis Tepi (Outline)</option>
                        </select>
                      </div>
                    )}

                    {selectedBlock.type === 'columns' && (
                      <div>
                        <p className="font-medium text-[#1d2327] mb-1.5">Jumlah Kolom</p>
                        <select
                          value={selectedBlock.columnsCount || 2}
                          onChange={(e) => {
                            const count = Number(e.target.value) as 2 | 3;
                            const cur = selectedBlock.columns || [];
                            const nextCols =
                              count === 3
                                ? [
                                    cur[0] || { heading: 'Kolom 1', body: '' },
                                    cur[1] || { heading: 'Kolom 2', body: '' },
                                    cur[2] || { heading: 'Kolom 3', body: '' },
                                  ]
                                : [
                                    cur[0] || { heading: 'Kolom 1', body: '' },
                                    cur[1] || { heading: 'Kolom 2', body: '' },
                                  ];
                            updateBlock(selectedBlock.id, {
                              columnsCount: count,
                              columns: nextCols,
                            });
                          }}
                          className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                        >
                          <option value={2}>2 Kolom</option>
                          <option value={3}>3 Kolom</option>
                        </select>
                      </div>
                    )}

                    {selectedBlock.type === 'separator' && (
                      <div>
                        <p className="font-medium text-[#1d2327] mb-1.5">Gaya Pemisah</p>
                        <select
                          value={selectedBlock.separatorStyle || 'line'}
                          onChange={(e) =>
                            updateBlock(selectedBlock.id, {
                              separatorStyle: e.target.value as 'line' | 'dots' | 'wide',
                            })
                          }
                          className="w-full h-8 px-2 border border-[#8c8f94] rounded-[2px]"
                        >
                          <option value="line">Garis Standar</option>
                          <option value="wide">Garis Lebar Penuh</option>
                          <option value="dots">Titik-Titik</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Modal Pratinjau Konten */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#c3c4c7] bg-[#f6f7f7]">
              <span className="text-[13px] font-semibold text-[#1d2327]">
                Pratinjau {metaInfo.singular}
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-1 text-[#50575e] hover:text-[#1d2327] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto bg-[#FBF9F5] text-[#1C1917]">
              {isSafeHttpOrRelativeUrl(featuredUrl) && (
                <img
                  src={isSafeHttpOrRelativeUrl(featuredUrl)}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-72 object-cover rounded mb-6 border border-stone-200"
                />
              )}
              <h1 className="font-display text-3xl font-semibold mb-4">
                {title || '(Tanpa Judul)'}
              </h1>
              <div
                className="space-y-4 leading-relaxed text-[16px] [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_blockquote]:p-4 [&_blockquote]:bg-[#F4EFE6] [&_blockquote]:border [&_blockquote]:border-stone-200 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_iframe]:w-full [&_iframe]:aspect-video"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(previewHtml || '<p>(Belum ada konten)</p>'),
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Revisi */}
      {activeRevisionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl text-[13px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#c3c4c7] bg-[#f6f7f7]">
              <h2 className="text-[15px] font-semibold text-[#1d2327]">
                Revisi #{activeRevisionModal.revision_number} —{' '}
                {new Intl.DateTimeFormat('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(activeRevisionModal.created_at))}
              </h2>
              <button
                type="button"
                onClick={() => setActiveRevisionModal(null)}
                className="p-1 text-[#50575e] hover:text-[#1d2327] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <p className="text-[11px] uppercase font-semibold text-[#50575e] mb-1">
                  Judul Tersimpan
                </p>
                <p className="font-semibold text-[16px] text-[#1d2327]">
                  {activeRevisionModal.title || '(Tanpa Judul)'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-semibold text-[#50575e] mb-1">
                  Isi Konten
                </p>
                <div
                  className="p-4 border border-[#dcdcde] bg-[#f6f7f7] space-y-3"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      activeRevisionModal.content_html || '<p>(Kosong)</p>'
                    ),
                  }}
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-[#c3c4c7] bg-[#f6f7f7] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveRevisionModal(null)}
                className="px-3 py-1.5 border border-[#c3c4c7] bg-white rounded-[2px] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handleRestoreRevision(activeRevisionModal)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[2px] cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Pulihkan Revisi Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Pemilih Media Google Drive */}
      <MediaPickerModal
        open={Boolean(mediaPickerTarget)}
        onClose={() => setMediaPickerTarget(null)}
        multiple={mediaPickerTarget?.kind === 'block_gallery'}
        accept={
          mediaPickerTarget?.kind === 'warta_pdf'
            ? 'pdf'
            : mediaPickerTarget
              ? 'image'
              : 'all'
        }
        title={
          mediaPickerTarget?.kind === 'warta_pdf'
            ? 'Pilih File PDF Warta Jemaat'
            : mediaPickerTarget?.kind === 'block_gallery'
              ? 'Pilih Foto untuk Galeri'
              : 'Pilih Gambar dari Pustaka Media'
        }
        onSelect={(selectedItems: MediaItem[]) => {
          if (!mediaPickerTarget || selectedItems.length === 0) return;
          const first = selectedItems[0];
          if (mediaPickerTarget.kind === 'featured') {
            setFeaturedMediaId(first.id);
            setFeaturedUrl(getMediaProxyUrl(first.id, { width: 1024 }));
            setIsDirty(true);
          } else if (mediaPickerTarget.kind === 'warta_pdf') {
            setWartaPdfUrl(getMediaProxyUrl(first.id, { download: true }));
            setIsDirty(true);
          } else if (mediaPickerTarget.kind === 'block_image') {
            updateBlock(mediaPickerTarget.blockId, {
              mediaId: first.id,
              url: getMediaProxyUrl(first.id, { width: 1024 }),
              alt: first.alt || first.nama,
              caption: first.caption || '',
            });
          } else if (mediaPickerTarget.kind === 'block_gallery') {
            const targetBlock = blocks.find((b) => b.id === mediaPickerTarget.blockId);
            const existing = (targetBlock?.gallery || []).filter((g) => g.url.trim() !== '');
            const added = selectedItems.map((m) => ({
              url: getMediaProxyUrl(m.id, { width: 768 }),
              alt: m.alt || m.nama,
              caption: m.caption || '',
            }));
            updateBlock(mediaPickerTarget.blockId, {
              gallery: [...existing, ...added],
            });
          }
          setMediaPickerTarget(null);
        }}
      />
    </div>
  );
}
