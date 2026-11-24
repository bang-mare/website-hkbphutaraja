import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Pin,
  FileText,
  Newspaper,
  UsersRound,
  CalendarDays,
  Cake,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../lib/supabase';
import { hasCapability } from '../../lib/roles';
import { WpPostbox } from '../../components/admin/WpPostbox';
import type { PostSummary } from '../../types/cms';

interface WijkStat {
  id: string;
  name: string;
  count: number;
}

interface BirthdayPerson {
  id: string;
  full_name: string;
  birth_date: string;
  wijk_name: string;
}

const DEFAULT_WIJK_LIST: WijkStat[] = [
  { id: 'letare', name: 'Letare', count: 0 },
  { id: 'exaudi', name: 'Exaudi', count: 0 },
  { id: 'judika', name: 'Judika', count: 0 },
  { id: 'galatia', name: 'Galatia', count: 0 },
  { id: 'efesus', name: 'Efesus', count: 0 },
  { id: 'jeremia', name: 'Jeremia', count: 0 },
];

export function DashboardPage() {
  const { profile, isSupabaseReady, isPreviewSession } = useAuth();
  const { widgetVisibility, addNotice, setHelpTabs } = useAdmin();

  const [counts, setCounts] = useState({
    posts: 0,
    pages: 0,
    warta: 0,
    jemaat: 0,
  });
  const [recentPosts, setRecentPosts] = useState<PostSummary[]>([]);
  const [wijkStats, setWijkStats] = useState<WijkStat[]>(DEFAULT_WIJK_LIST);
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Quick Draft State
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<
    Array<{ id: string; title: string; excerpt: string; created_at: string }>
  >([]);

  useEffect(() => {
    setHelpTabs([
      {
        id: 'ringkasan',
        title: 'Ringkasan',
        content: (
          <div className="space-y-2">
            <p>
              Selamat datang di Dasbor <strong>HKBP Ressort Hutaraja</strong>. Halaman ini menampilkan ringkasan konten situs, aktivitas terbaru, Draf Cepat, serta data pelayanan jemaat per wijk.
            </p>
            <p>
              Gunakan tab <strong>Opsi Layar</strong> di kanan atas untuk menampilkan atau menyembunyikan kotak widget sesuai kebutuhan Anda.
            </p>
          </div>
        ),
      },
      {
        id: 'navigasi',
        title: 'Navigasi',
        content: (
          <p>
            Menu sebelah kiri dapat diciutkan melalui tombol <em>Ciutkan menu</em> di bagian bawah sidebar. Arahkan kursor pada menu untuk membuka submenu secara cepat.
          </p>
        ),
      },
    ]);
    return () => setHelpTabs([]);
  }, [setHelpTabs]);

  useEffect(() => {
    if (!supabase || !isSupabaseReady) return;

    let active = true;
    setLoadingStats(true);

    async function loadDashboardData() {
      try {
        const [
          postsRes,
          pagesRes,
          wartaRes,
          jemaatRes,
          recentRes,
          wijkRes,
        ] = await Promise.all([
          supabase!
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'post')
            .eq('status', 'publish'),
          supabase!
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'page')
            .eq('status', 'publish'),
          supabase!
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'warta')
            .eq('status', 'publish'),
          supabase!
            .from('jemaat')
            .select('*', { count: 'exact', head: true })
            .eq('status_keanggotaan', 'aktif'),
          supabase!
            .from('posts')
            .select('id, type, title, slug, excerpt, status, published_at, created_at, updated_at')
            .neq('status', 'trash')
            .order('updated_at', { ascending: false })
            .limit(5),
          supabase!
            .from('wijk')
            .select('id, name, sort_order')
            .order('sort_order', { ascending: true }),
        ]);

        if (!active) return;

        setCounts({
          posts: postsRes.count ?? 0,
          pages: pagesRes.count ?? 0,
          warta: wartaRes.count ?? 0,
          jemaat: jemaatRes.count ?? 0,
        });

        if (recentRes.data) {
          const allRecent = recentRes.data as PostSummary[];
          setRecentPosts(allRecent);
          setLocalDrafts(
            allRecent
              .filter((p) => p.status === 'draft')
              .slice(0, 3)
              .map((p) => ({
                id: p.id,
                title: p.title || '(Tanpa Judul)',
                excerpt: p.excerpt,
                created_at: p.created_at,
              }))
          );
        }

        if (wijkRes.data && wijkRes.data.length > 0) {
          const { data: jemaatWijkRows } = await supabase!
            .from('jemaat')
            .select('wijk_id, birth_date, full_name, id')
            .eq('status_keanggotaan', 'aktif');

          const countMap = new Map<string, number>();
          const upcomingBdays: BirthdayPerson[] = [];
          const wijkNameMap = new Map<string, string>();
          wijkRes.data.forEach((w) => wijkNameMap.set(w.id, w.name));

          const today = new Date();
          const currentMonth = today.getMonth() + 1;
          const currentDay = today.getDate();

          (jemaatWijkRows || []).forEach((row) => {
            if (row.wijk_id) {
              countMap.set(row.wijk_id, (countMap.get(row.wijk_id) || 0) + 1);
            }
            if (row.birth_date) {
              const parts = String(row.birth_date).split('-');
              if (parts.length === 3) {
                const m = Number(parts[1]);
                const d = Number(parts[2]);
                if (m === currentMonth && d >= currentDay && d <= currentDay + 7) {
                  upcomingBdays.push({
                    id: row.id,
                    full_name: row.full_name,
                    birth_date: row.birth_date,
                    wijk_name: row.wijk_id ? wijkNameMap.get(row.wijk_id) || '-' : '-',
                  });
                }
              }
            }
          });

          setWijkStats(
            wijkRes.data.map((w) => ({
              id: w.id,
              name: w.name,
              count: countMap.get(w.id) || 0,
            }))
          );
          setBirthdays(upcomingBdays.slice(0, 6));
        }
      } catch (err) {
        console.error('Gagal memuat statistik dasbor:', err);
      } finally {
        if (active) setLoadingStats(false);
      }
    }

    loadDashboardData();
    return () => {
      active = false;
    };
  }, [isSupabaseReady]);

  const handleSaveQuickDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() && !draftContent.trim()) {
      addNotice({
        type: 'warning',
        message: 'Isi judul atau catatan sebelum menyimpan draf cepat.',
      });
      return;
    }

    setSavingDraft(true);
    const title = draftTitle.trim() || '(Tanpa Judul)';
    const contentText = draftContent.trim();

    if (supabase && isSupabaseReady && profile) {
      const slug = `draf-${Date.now()}`;
      const { data, error } = await supabase
        .from('posts')
        .insert({
          type: 'post',
          title,
          slug,
          content: [{ id: 'b1', type: 'paragraph', content: contentText }],
          content_html: contentText ? `<p>${contentText}</p>` : '',
          excerpt: contentText.slice(0, 140),
          status: 'draft',
          author_id: profile.id,
        })
        .select('id, title, excerpt, created_at')
        .single();

      setSavingDraft(false);

      if (error) {
        addNotice({
          type: 'error',
          message: `Gagal menyimpan draf: ${error.message}`,
        });
        return;
      }

      if (data) {
        setLocalDrafts((prev) => [data, ...prev].slice(0, 3));
      }
    } else {
      setSavingDraft(false);
      setLocalDrafts((prev) =>
        [
          {
            id: `draft-${Date.now()}`,
            title,
            excerpt: contentText,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 3)
      );
    }

    setDraftTitle('');
    setDraftContent('');
    addNotice({
      type: 'success',
      message: 'Draf cepat berhasil disimpan.',
      linkLabel: 'Lihat semua pos',
      linkTo: '/admin/posts',
    });
  };

  const formatTanggal = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="pt-4">
      {/* Judul Halaman ala WordPress */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-[23px] font-normal text-[#1d2327] leading-tight">
          Dasbor
        </h1>
        {isPreviewSession && (
          <span className="text-[12px] text-[#50575e] bg-white border border-[#c3c4c7] px-2.5 py-1">
            Mode Pratinjau UI Lokal — hubungkan Supabase untuk data langsung
          </span>
        )}
      </div>

      {/* Welcome Panel ringkas khas WordPress */}
      <div className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] p-5 mb-5">
        <h2 className="text-[20px] font-normal text-[#1d2327] mb-1">
          Selamat datang di CMS HKBP Ressort Hutaraja!
        </h2>
        <p className="text-[13px] text-[#50575e] mb-4">
          Portal pengelolaan resmi gereja Distrik VI Dairi dengan tata letak WordPress Admin.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-[#f0f0f1] text-[13px]">
          <div>
            <h3 className="font-semibold text-[#1d2327] mb-2">Mulai Berkarya</h3>
            {hasCapability(profile?.role, 'manage_posts') ? (
              <Link
                to="/admin/posts/new"
                className="inline-block px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px]"
              >
                Tulis Berita Baru
              </Link>
            ) : (
              <Link
                to="/admin/profile"
                className="inline-block px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px]"
              >
                Kelola Profil Saya
              </Link>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[#1d2327] mb-2">Langkah Berikutnya</h3>
            <ul className="space-y-1.5 text-[#2271b1]">
              {hasCapability(profile?.role, 'manage_warta') && (
                <li>
                  <Link to="/admin/warta" className="hover:underline">
                    Kelola Warta Jemaat Mingguan
                  </Link>
                </li>
              )}
              {hasCapability(profile?.role, 'manage_jadwal') && (
                <li>
                  <Link to="/admin/jadwal" className="hover:underline">
                    Atur Jadwal Ibadah &amp; PHD Lingkungan
                  </Link>
                </li>
              )}
              {hasCapability(profile?.role, 'manage_appearance') && (
                <li>
                  <Link to="/admin/appearance/homepage" className="hover:underline">
                    Atur Tata Letak Beranda Publik
                  </Link>
                </li>
              )}
              <li>
                <Link to="/" className="hover:underline">
                  Lihat Situs Publik Huria
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-[#1d2327] mb-2">Status Sistem</h3>
            <ul className="space-y-1 text-[#50575e]">
              <li>
                Basis Data:{' '}
                <strong className="text-[#1d2327]">
                  {isSupabaseReady ? 'Supabase Terhubung' : 'Menunggu Konfigurasi Env'}
                </strong>
              </li>
              <li>
                Zona Waktu: <strong className="text-[#1d2327]">Asia/Jakarta (WIB)</strong>
              </li>
              <li>
                Enam Lingkungan: <strong className="text-[#1d2327]">6 Wijk Terdaftar</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom Postboxes WordPress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* KOLOM KIRI */}
        <div className="space-y-5">
          {/* Widget 1: Sekilas */}
          {widgetVisibility.sekilas && (
            <WpPostbox title="Sekilas">
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[13px] mb-4">
                <Link
                  to="/admin/posts"
                  className="flex items-center gap-2 text-[#2271b1] hover:underline"
                >
                  <Pin className="w-4 h-4 text-[#8c8f94]" />
                  <span className="tabular-nums">
                    {loadingStats ? '...' : counts.posts} Pos
                  </span>
                </Link>
                <Link
                  to="/admin/pages"
                  className="flex items-center gap-2 text-[#2271b1] hover:underline"
                >
                  <FileText className="w-4 h-4 text-[#8c8f94]" />
                  <span className="tabular-nums">
                    {loadingStats ? '...' : counts.pages} Halaman
                  </span>
                </Link>
                <Link
                  to="/admin/warta"
                  className="flex items-center gap-2 text-[#2271b1] hover:underline"
                >
                  <Newspaper className="w-4 h-4 text-[#8c8f94]" />
                  <span className="tabular-nums">
                    {loadingStats ? '...' : counts.warta} Warta Jemaat
                  </span>
                </Link>
                {hasCapability(profile?.role, 'manage_jemaat') && (
                  <Link
                    to="/admin/jemaat"
                    className="flex items-center gap-2 text-[#2271b1] hover:underline"
                  >
                    <UsersRound className="w-4 h-4 text-[#8c8f94]" />
                    <span className="tabular-nums">
                      {loadingStats ? '...' : counts.jemaat} Jemaat Aktif
                    </span>
                  </Link>
                )}
              </div>
              <p className="text-[13px] text-[#50575e] pt-3 border-t border-[#f0f0f1]">
                Portal <strong>HKBP Ressort Hutaraja</strong> menggunakan tema resmi Huria (Distrik VI Dairi).
              </p>
            </WpPostbox>
          )}

          {/* Widget 2: Aktivitas */}
          {widgetVisibility.aktivitas && (
            <WpPostbox title="Aktivitas">
              <div className="text-[13px]">
                <h3 className="font-semibold text-[#1d2327] mb-2">
                  Baru Saja Diperbarui
                </h3>
                {recentPosts.length === 0 ? (
                  <p className="text-[#50575e] py-2">
                    Belum ada aktivitas konten terbaru. Pos dan warta yang diterbitkan akan muncul di sini.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#f0f0f1]">
                    {recentPosts.map((post) => (
                      <li
                        key={post.id}
                        className="py-2 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-[#50575e] mr-2 tabular-nums">
                            {formatTanggal(post.updated_at)}
                          </span>
                          <Link
                            to={
                              post.type === 'page'
                                ? `/admin/pages`
                                : post.type === 'warta'
                                  ? `/admin/warta`
                                  : `/admin/posts`
                            }
                            className="text-[#2271b1] hover:underline font-medium truncate"
                          >
                            {post.title || '(Tanpa Judul)'}
                          </Link>
                        </div>
                        <span className="text-[12px] text-[#50575e] shrink-0">
                          {post.status === 'publish'
                            ? 'Terbit'
                            : post.status === 'draft'
                              ? 'Draf'
                              : post.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </WpPostbox>
          )}

          {/* Widget Kustom 1: Jemaat per Wijk */}
          {widgetVisibility.jemaat_wijk && (
            <WpPostbox title="Jemaat per Wijk (6 Lingkungan)">
              <div className="text-[13px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#c3c4c7] text-left text-[#50575e]">
                      <th className="py-1.5 font-medium">Lingkungan (Wijk)</th>
                      <th className="py-1.5 font-medium text-right">Jumlah Jemaat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1]">
                    {wijkStats.map((w) => (
                      <tr key={w.id} className="hover:bg-[#f6f7f7]">
                        <td className="py-1.5 font-medium text-[#1d2327]">
                          Wijk {w.name}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-[#50575e]">
                          {w.count} jiwa
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WpPostbox>
          )}
        </div>

        {/* KOLOM KANAN */}
        <div className="space-y-5">
          {/* Widget 3: Draf Cepat */}
          {widgetVisibility.draf_cepat && hasCapability(profile?.role, 'manage_posts') && (
            <WpPostbox title="Draf Cepat">
              <form onSubmit={handleSaveQuickDraft} className="space-y-3 text-[13px]">
                <div>
                  <label htmlFor="quick-draft-title" className="block text-[#1d2327] mb-1">
                    Judul
                  </label>
                  <input
                    id="quick-draft-title"
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Judul catatan atau berita..."
                    className="w-full h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="quick-draft-content" className="block text-[#1d2327] mb-1">
                    Apa yang ada di pikiran Anda?
                  </label>
                  <textarea
                    id="quick-draft-content"
                    rows={3}
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="Catat ide pengumuman, renungan, atau warta..."
                    className="w-full p-2.5 bg-white border border-[#8c8f94] rounded-[3px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingDraft}
                  className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
                >
                  {savingDraft ? 'Menyimpan...' : 'Simpan Draf'}
                </button>
              </form>

              {localDrafts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#f0f0f1] text-[13px]">
                  <h3 className="font-semibold text-[#1d2327] mb-2">
                    Draf Terbaru Anda
                  </h3>
                  <ul className="space-y-2">
                    {localDrafts.map((d) => (
                      <li key={d.id}>
                        <div className="flex items-center gap-2">
                          <Link
                            to="/admin/posts"
                            className="text-[#2271b1] hover:underline font-medium"
                          >
                            {d.title}
                          </Link>
                          <span className="text-[12px] text-[#50575e] tabular-nums">
                            {formatTanggal(d.created_at)}
                          </span>
                        </div>
                        {d.excerpt && (
                          <p className="text-[12px] text-[#50575e] line-clamp-1">
                            {d.excerpt}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </WpPostbox>
          )}

          {/* Widget 4: Berita & Acara Huria */}
          {widgetVisibility.berita_acara && (
            <WpPostbox title="Berita &amp; Acara Huria">
              <div className="text-[13px] space-y-3">
                <div className="flex items-start gap-2.5 pb-3 border-b border-[#f0f0f1]">
                  <CalendarDays className="w-4 h-4 text-[#2271b1] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#1d2327]">
                      Ibadah Minggu &amp; Sekolah Minggu
                    </p>
                    <p className="text-[#50575e] mt-0.5">
                      Setiap Minggu pukul 08.00 WIB (Pagi / Sekolah Minggu) &amp; 10.30 WIB (Siang).
                    </p>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-[#1d2327] mb-1">
                    Pelayanan PHD Lingkungan (Wijk)
                  </p>
                  <p className="text-[#50575e]">
                    Jadwal tuan rumah PHD untuk 6 Wijk (Letare, Exaudi, Judika, Galatia, Efesus, Jeremia) dikelola pada menu{' '}
                    <Link to="/admin/jadwal/phd" className="text-[#2271b1] hover:underline">
                      Jadwal Ibadah &rarr; PHD Lingkungan
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </WpPostbox>
          )}

          {/* Widget Kustom 2: Ulang Tahun Minggu Ini */}
          {widgetVisibility.ulang_tahun && (
            <WpPostbox title="Ulang Tahun Minggu Ini">
              <div className="text-[13px]">
                {birthdays.length === 0 ? (
                  <div className="flex items-start gap-2.5 text-[#50575e] py-1">
                    <Cake className="w-4 h-4 text-[#8c8f94] shrink-0 mt-0.5" />
                    <p>
                      Belum ada data ulang tahun jemaat untuk minggu ini. Data jemaat dapat diimpor melalui menu{' '}
                      <Link to="/admin/jemaat/import" className="text-[#2271b1] hover:underline">
                        Jemaat &rarr; Import XLSX
                      </Link>
                      .
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#f0f0f1]">
                    {birthdays.map((b) => (
                      <li key={b.id} className="py-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#1d2327]">{b.full_name}</p>
                          <p className="text-[12px] text-[#50575e]">Wijk {b.wijk_name}</p>
                        </div>
                        <span className="text-[12px] text-[#50575e] tabular-nums">
                          {formatTanggal(b.birth_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </WpPostbox>
          )}
        </div>
      </div>
    </div>
  );
}
