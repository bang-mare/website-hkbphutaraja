/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicHomePage } from './pages/public/PublicHomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UpdatesPage } from './pages/admin/UpdatesPage';
import { ProfilePage } from './pages/admin/ProfilePage';
import { PostsListPage } from './pages/admin/PostsListPage';
import { PostEditorPage } from './pages/admin/PostEditorPage';
import { TermsPage } from './pages/admin/TermsPage';
import { CommentsPage } from './pages/admin/CommentsPage';
import { ModulePlaceholderPage } from './pages/admin/ModulePlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <Routes>
            {/* Rute Publik */}
            <Route path="/" element={<PublicHomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/wp-login.php" element={<Navigate to="/login" replace />} />
            <Route path="/wp-admin" element={<Navigate to="/admin" replace />} />
            <Route path="/wp-admin/*" element={<Navigate to="/admin" replace />} />

            {/* Rute Dashboard Admin (Clone wp-admin) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredCapability="access_admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="updates" element={<UpdatesPage />} />

              {/* Pos (Tahap 2) */}
              <Route
                path="posts"
                element={
                  <ProtectedRoute requiredCapability="manage_posts">
                    <PostsListPage postType="post" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="posts/new"
                element={
                  <ProtectedRoute requiredCapability="manage_posts">
                    <PostEditorPage postType="post" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="posts/categories"
                element={
                  <ProtectedRoute requiredCapability="publish_posts">
                    <TermsPage taxonomy="category" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="posts/tags"
                element={
                  <ProtectedRoute requiredCapability="publish_posts">
                    <TermsPage taxonomy="post_tag" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="posts/:id"
                element={
                  <ProtectedRoute requiredCapability="manage_posts">
                    <PostEditorPage postType="post" />
                  </ProtectedRoute>
                }
              />

              {/* Media (Tahap 3) */}
              <Route
                path="media"
                element={
                  <ProtectedRoute requiredCapability="manage_media">
                    <ModulePlaceholderPage
                      title="Pustaka Media"
                      addNewLabel="Tambah Media Baru"
                      stage="Tahap 3"
                      description="Pustaka media tampilan grid & daftar yang terhubung ke Google Drive melalui proxy /api/media/[id] dengan generasi thumbnail otomatis."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="media/new"
                element={
                  <ProtectedRoute requiredCapability="manage_media">
                    <ModulePlaceholderPage
                      title="Unggah Media Baru"
                      stage="Tahap 3"
                      description="Pengunggah berkas drag-and-drop ke Google Drive (folder uploads/YYYY/MM) dengan optimasi gambar dan validasi ukuran."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Halaman (Tahap 2) */}
              <Route
                path="pages"
                element={
                  <ProtectedRoute requiredCapability="manage_pages">
                    <PostsListPage postType="page" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pages/new"
                element={
                  <ProtectedRoute requiredCapability="manage_pages">
                    <PostEditorPage postType="page" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pages/:id"
                element={
                  <ProtectedRoute requiredCapability="manage_pages">
                    <PostEditorPage postType="page" />
                  </ProtectedRoute>
                }
              />

              {/* Komentar (Tahap 2) */}
              <Route
                path="comments"
                element={
                  <ProtectedRoute requiredCapability="manage_comments">
                    <CommentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Warta Jemaat (Tahap 2) */}
              <Route
                path="warta"
                element={
                  <ProtectedRoute requiredCapability="manage_warta">
                    <PostsListPage postType="warta" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="warta/new"
                element={
                  <ProtectedRoute requiredCapability="manage_warta">
                    <PostEditorPage postType="warta" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="warta/:id"
                element={
                  <ProtectedRoute requiredCapability="manage_warta">
                    <PostEditorPage postType="warta" />
                  </ProtectedRoute>
                }
              />

              {/* Jadwal Ibadah (Tahap 5) */}
              <Route
                path="jadwal"
                element={
                  <ProtectedRoute requiredCapability="manage_jadwal">
                    <ModulePlaceholderPage
                      title="Jadwal Ibadah Minggu"
                      addNewLabel="Tambah Jadwal"
                      stage="Tahap 5"
                      description="Pengelolaan jadwal kebaktian Minggu beserta petugas ibadah (Pengkhotbah, Liturgis, Organis, Pemandu Lagu)."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jadwal/phd"
                element={
                  <ProtectedRoute requiredCapability="manage_jadwal">
                    <ModulePlaceholderPage
                      title="PHD Lingkungan (Wijk)"
                      addNewLabel="Atur Tuan Rumah"
                      stage="Tahap 5"
                      description="Jadwal PHD rutin untuk 6 Wijk (Letare, Exaudi, Judika, Galatia, Efesus, Jeremia) dengan pembaruan tuan rumah mingguan."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Jemaat (Tahap 5) */}
              <Route
                path="jemaat"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <ModulePlaceholderPage
                      title="Data Jemaat"
                      addNewLabel="Tambah Jemaat"
                      stage="Tahap 5"
                      description="Basis data jemaat berdasarkan 6 Lingkungan (Wijk), status keanggotaan, baptis, dan sidi."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jemaat/import"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <ModulePlaceholderPage
                      title="Import Data Jemaat (XLSX)"
                      stage="Tahap 5"
                      description="Impor massal data keluarga dan anggota jemaat dari lembar kerja Excel (.xlsx)."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jemaat/ulang-tahun"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <ModulePlaceholderPage
                      title="Ulang Tahun Jemaat"
                      stage="Tahap 5"
                      description="Daftar anggota jemaat yang berulang tahun per minggu dan per bulan untuk didoakan dalam warta."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jemaat/pernikahan"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <ModulePlaceholderPage
                      title="Ulang Tahun Pernikahan"
                      stage="Tahap 5"
                      description="Daftar keluarga jemaat yang memperingati ulang tahun pernikahan."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Galeri (Tahap 4) */}
              <Route
                path="galeri"
                element={
                  <ProtectedRoute requiredCapability="manage_galeri">
                    <ModulePlaceholderPage
                      title="Album Galeri"
                      addNewLabel="Tambah Album"
                      stage="Tahap 4"
                      description="Kelola album foto dan dokumentasi video kegiatan gereja."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="galeri/new"
                element={
                  <ProtectedRoute requiredCapability="manage_galeri">
                    <ModulePlaceholderPage
                      title="Tambah Album Galeri"
                      stage="Tahap 4"
                      description="Buat album dokumentasi baru dari Pustaka Media Google Drive."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Kehadiran Ibadah (Tahap 5) */}
              <Route
                path="kehadiran"
                element={
                  <ProtectedRoute requiredCapability="manage_kehadiran">
                    <ModulePlaceholderPage
                      title="Kehadiran Ibadah"
                      addNewLabel="Catat Kehadiran"
                      stage="Tahap 5"
                      description="Rekap jumlah kehadiran jemaat pada ibadah Minggu, Sekolah Minggu, dan PHD Lingkungan."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Keuangan: HANYA Administrator & Pendeta */}
              <Route
                path="keuangan"
                element={
                  <ProtectedRoute requiredCapability="manage_keuangan">
                    <ModulePlaceholderPage
                      title="Keuangan Huria"
                      addNewLabel="Catat Transaksi"
                      stage="Tahap 5"
                      description="Pembukuan persembahan dan pengeluaran huria dengan kalkulasi otomatis pembagian 55% Pusat dan 45% Huria (pengecualian untuk pos sosial, beasiswa, dan pembangunan fisik lokal). Hanya dapat diakses oleh Administrator dan Pendeta."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Tampilan (Tahap 4) */}
              <Route
                path="appearance/menus"
                element={
                  <ProtectedRoute requiredCapability="manage_appearance">
                    <ModulePlaceholderPage
                      title="Menu Navigasi"
                      stage="Tahap 4"
                      description="Penyusun menu drag-and-drop bertingkat untuk lokasi Header dan Footer."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appearance/widgets"
                element={
                  <ProtectedRoute requiredCapability="manage_appearance">
                    <ModulePlaceholderPage
                      title="Widget"
                      stage="Tahap 4"
                      description="Atur widget pada area Footer 1, Footer 2, dan Sidebar publik."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appearance/customize"
                element={
                  <ProtectedRoute requiredCapability="manage_appearance">
                    <ModulePlaceholderPage
                      title="Sesuaikan Tema"
                      stage="Tahap 4"
                      description="Kustomisasi warna utama, logo gereja, dan banner header website publik."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Pengguna & Profil */}
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredCapability="manage_users">
                    <ModulePlaceholderPage
                      title="Semua Pengguna"
                      addNewLabel="Tambah Pengguna"
                      stage="Tahap 5"
                      description="Kelola akun pelayan dan pengelola situs beserta perannya (Administrator, Pendeta, Sekretaris, Bendahara, Editor, Penulis, Kontributor, Jemaat)."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users/new"
                element={
                  <ProtectedRoute requiredCapability="manage_users">
                    <ModulePlaceholderPage
                      title="Tambah Pengguna Baru"
                      stage="Tahap 5"
                      description="Tambahkan akun pengelola atau pelayan gereja baru."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedRoute requiredCapability="edit_own_profile">
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Pengaturan (Tahap 4) */}
              <Route
                path="settings/general"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <ModulePlaceholderPage
                      title="Pengaturan Umum"
                      stage="Tahap 4"
                      description="Judul situs, slogan, URL, email admin, zona waktu (Asia/Jakarta), serta format tanggal & waktu."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/writing"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <ModulePlaceholderPage
                      title="Pengaturan Penulisan"
                      stage="Tahap 4"
                      description="Kategori bawaan dan format penulisan pos."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/reading"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <ModulePlaceholderPage
                      title="Pengaturan Membaca"
                      stage="Tahap 4"
                      description="Jumlah pos per halaman dan tampilan beranda situs."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/discussion"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <ModulePlaceholderPage
                      title="Pengaturan Diskusi"
                      stage="Tahap 4"
                      description="Aturan moderasi komentar dan persetujuan admin sebelum tampil."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/media"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <ModulePlaceholderPage
                      title="Pengaturan Media"
                      stage="Tahap 3 &amp; Tahap 4"
                      description="Ukuran maksimal berkas unggahan dan dimensi thumbnail otomatis (150, 300, 768, 1024)."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/permalink"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <ModulePlaceholderPage
                      title="Pengaturan Permalink"
                      stage="Tahap 4"
                      description="Pilih struktur tautan permanen (Polos, Hari dan nama, Nama pos)."
                    />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
