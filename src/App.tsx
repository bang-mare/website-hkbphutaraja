/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { LoginPage } from './pages/auth/LoginPage';

// Public Pages
import { PublicHomePage } from './pages/public/PublicHomePage';
import { AboutPage } from './pages/public/AboutPage';
import { SchedulePublicPage } from './pages/public/SchedulePublicPage';
import { WartaPublicPage } from './pages/public/WartaPublicPage';
import { BlogPublicPage } from './pages/public/BlogPublicPage';
import { GalleryPublicPage } from './pages/public/GalleryPublicPage';
import { ContactPublicPage } from './pages/public/ContactPublicPage';
import { DataJemaatPublicPage } from './pages/public/DataJemaatPublicPage';
import { StaticPagePublic } from './pages/public/StaticPagePublic';

// Admin Pages
import { DashboardPage } from './pages/admin/DashboardPage';
import { UpdatesPage } from './pages/admin/UpdatesPage';
import { ProfilePage } from './pages/admin/ProfilePage';
import { PostsListPage } from './pages/admin/PostsListPage';
import { PostEditorPage } from './pages/admin/PostEditorPage';
import { TermsPage } from './pages/admin/TermsPage';
import { MediaLibraryPage } from './pages/admin/MediaLibraryPage';
import { ScheduleAdminPage } from './pages/admin/ScheduleAdminPage';
import { CongregationPage } from './pages/admin/CongregationPage';
import { GalleryAdminPage } from './pages/admin/GalleryAdminPage';
import { AttendancePage } from './pages/admin/AttendancePage';
import { FinancePage } from './pages/admin/FinancePage';
import { HomepageLayoutPage } from './pages/admin/HomepageLayoutPage';
import { MenusPage } from './pages/admin/MenusPage';
import { WidgetsPage } from './pages/admin/WidgetsPage';
import { CustomizeThemePage } from './pages/admin/CustomizeThemePage';
import { UsersAdminPage } from './pages/admin/UsersAdminPage';
import { SettingsPage } from './pages/admin/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <Routes>
            {/* Rute Autentikasi & Alias WordPress */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/wp-login.php" element={<Navigate to="/login" replace />} />
            <Route path="/wp-admin" element={<Navigate to="/admin" replace />} />
            <Route path="/wp-admin/*" element={<Navigate to="/admin" replace />} />

            {/* Rute Website Publik (Front-end Jemaat) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<PublicHomePage />} />
              <Route path="/tentang-kami" element={<AboutPage />} />
              <Route path="/profil" element={<AboutPage />} />
              <Route path="/jadwal-ibadah" element={<SchedulePublicPage />} />
              <Route path="/warta" element={<WartaPublicPage />} />
              <Route path="/warta/:slug" element={<WartaPublicPage />} />
              <Route path="/berita" element={<BlogPublicPage />} />
              <Route path="/berita/:slug" element={<BlogPublicPage />} />
              <Route
                path="/kategori/:slug"
                element={<BlogPublicPage filterMode="category" />}
              />
              <Route path="/tag/:slug" element={<BlogPublicPage filterMode="tag" />} />
              <Route path="/galeri" element={<GalleryPublicPage />} />
              <Route path="/galeri/:slug" element={<GalleryPublicPage />} />
              <Route path="/data-jemaat" element={<DataJemaatPublicPage />} />
              <Route path="/kontak" element={<ContactPublicPage />} />
              {/* Halaman Statis Dinamis (Page) */}
              <Route path="/:slug" element={<StaticPagePublic />} />
            </Route>

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

              {/* Pos */}
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

              {/* Media (Google Drive API Proxy) */}
              <Route
                path="media"
                element={
                  <ProtectedRoute requiredCapability="manage_media">
                    <MediaLibraryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="media/new"
                element={
                  <ProtectedRoute requiredCapability="manage_media">
                    <MediaLibraryPage defaultOpenUpload />
                  </ProtectedRoute>
                }
              />

              {/* Halaman Statis */}
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

              {/* Warta Jemaat */}
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

              {/* Jadwal Ibadah */}
              <Route
                path="jadwal"
                element={
                  <ProtectedRoute requiredCapability="manage_jadwal">
                    <ScheduleAdminPage mode="minggu" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jadwal/phd"
                element={
                  <ProtectedRoute requiredCapability="manage_jadwal">
                    <ScheduleAdminPage mode="phd" />
                  </ProtectedRoute>
                }
              />

              {/* Jemaat */}
              <Route
                path="jemaat"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <CongregationPage tab="list" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jemaat/permohonan"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <CongregationPage tab="requests" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jemaat/import"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <CongregationPage tab="import" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jemaat/ulang-tahun"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <CongregationPage tab="birthdays" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="jemaat/pernikahan"
                element={
                  <ProtectedRoute requiredCapability="manage_jemaat">
                    <CongregationPage tab="anniversaries" />
                  </ProtectedRoute>
                }
              />

              {/* Galeri */}
              <Route
                path="galeri"
                element={
                  <ProtectedRoute requiredCapability="manage_galeri">
                    <GalleryAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="galeri/new"
                element={
                  <ProtectedRoute requiredCapability="manage_galeri">
                    <GalleryAdminPage createMode />
                  </ProtectedRoute>
                }
              />
              <Route
                path="galeri/:id"
                element={
                  <ProtectedRoute requiredCapability="manage_galeri">
                    <GalleryAdminPage />
                  </ProtectedRoute>
                }
              />

              {/* Kehadiran Ibadah */}
              <Route
                path="kehadiran"
                element={
                  <ProtectedRoute requiredCapability="manage_kehadiran">
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />

              {/* Keuangan: HANYA Administrator & Pendeta */}
              <Route
                path="keuangan"
                element={
                  <ProtectedRoute requiredCapability="manage_keuangan">
                    <FinancePage />
                  </ProtectedRoute>
                }
              />

              {/* Tampilan */}
              <Route
                path="appearance/homepage"
                element={
                  <ProtectedRoute requiredCapability="manage_appearance">
                    <HomepageLayoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appearance/menus"
                element={
                  <ProtectedRoute requiredCapability="manage_appearance">
                    <MenusPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appearance/widgets"
                element={
                  <ProtectedRoute requiredCapability="manage_appearance">
                    <WidgetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appearance/customize"
                element={
                  <ProtectedRoute requiredCapability="manage_appearance">
                    <CustomizeThemePage />
                  </ProtectedRoute>
                }
              />

              {/* Pengguna & Profil */}
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredCapability="manage_users">
                    <UsersAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users/new"
                element={
                  <ProtectedRoute requiredCapability="manage_users">
                    <UsersAdminPage createMode />
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

              {/* Pengaturan */}
              <Route
                path="settings/general"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <SettingsPage section="general" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/writing"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <SettingsPage section="writing" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/reading"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <SettingsPage section="reading" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/media"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <SettingsPage section="media" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/permalink"
                element={
                  <ProtectedRoute requiredCapability="manage_settings">
                    <SettingsPage section="permalink" />
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
