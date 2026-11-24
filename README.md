# Website Resmi & CMS Gereja HKBP Ressort Hutaraja (Distrik VI Dairi)

Website resmi jemaat sekaligus sistem manajemen konten (CMS) bergaya **WordPress (`wp-admin`)** untuk **HKBP Ressort Hutaraja (Distrik VI Dairi)**.

---

## Ringkasan Fitur

1. **Website Publik Jemaat (Bahasa Indonesia)**
   - **Beranda**: Hero jemaat, ayat harian/renungan, spanduk pengumuman, jadwal ibadah terdekat, warta jemaat terbaru, berita terbaru, dan daftar 6 Lingkungan (Wijk).
   - **Tentang Kami**: Sejarah huria, visi-misi, struktur pelayan, dan direktori 6 Wijk (*Letare, Exaudi, Judika, Galatia, Efesus, Jeremia*).
   - **Jadwal Ibadah**: Ibadah Minggu beserta petugas dan jadwal **PHD Lingkungan (Wijk)** mingguan.
   - **Warta Jemaat**: Arsip warta mingguan, dapat dibaca online dan diunduh dalam format PDF.
   - **Berita & Artikel**: Kategori, tag, pencarian, paginasi, sidebar widget, serta komentar jemaat dengan moderasi admin.
   - **Galeri Foto & Video**: Album foto dengan *lightbox* dan tautan video YouTube.
   - **Halaman Statis Dinamis**: Admin dapat membuat halaman baru (mis. Persembahan, Sejarah, Pendaftaran Sakramen) dengan URL `/:slug`.
   - **SEO & Sitemap**: Judul halaman dinamis, deskripsi meta, Open Graph, dan `/sitemap.xml` otomatis.

2. **Dashboard Admin (`wp-admin` Clone)**
   - **Dasbor**: Widget *Sekilas*, *Aktivitas*, *Draf Cepat*, *Berita & Acara Huria*, *Jemaat per Wijk*, *Ulang Tahun Minggu Ini*, serta *Opsi Layar* & *Bantuan*.
   - **Editor Blok (Gaya Gutenberg)**: Paragraf, Judul, Gambar, Galeri, Daftar, Kutipan, Tombol, Kolom, Video YouTube, dan Pemisah — lengkap dengan riwayat revisi, autosave, penjadwalan terbit, *Quick Edit*, *Bulk Actions*, dan moderasi komentar.
   - **Pustaka Media (Google Drive)**: Terhubung langsung ke folder Google Drive melalui *proxy* aman (`/api/media/*`) dengan pembuatan *thumbnail* WebP otomatis (`150`, `300`, `768`, `1024`).
   - **Tampilan & Pengaturan**: *Menu Builder* (Header/Footer), *Widget Manager*, *Sesuaikan Tema* (warna, logo, hero), dan Pengaturan Umum/Penulisan/Membaca/Diskusi/Media/Permalink.
   - **Modul Pelayanan Gereja**:
     - Jadwal Ibadah Minggu & PHD 6 Wijk
     - Data Jemaat, **Import XLSX**, Ulang Tahun & Ulang Tahun Pernikahan
     - Kehadiran Ibadah
     - **Keuangan Huria** (**Khusus Administrator & Pendeta**): perhitungan otomatis **55% Pusat / 45% Huria**, serta pengecualian otomatis untuk pos *Diakonia Sosial*, *Beasiswa*, dan *Pembangunan Fisik Lokal* (100% tetap di Huria).

---

## Panduan Instalasi & Deploy (Langkah Demi Langkah)

Ikuti 5 langkah berikut secara berurutan agar website dan dashboard admin berjalan penuh secara *online* tanpa biaya server tambahan.

### Langkah 1 — Buat Proyek Supabase & Jalankan Skema Database

1. Buka [https://supabase.com](https://supabase.com) lalu daftar/masuk dan klik **New Project**.
2. Beri nama proyek (misalnya: `hkbp-hutaraja`), buat password database yang kuat, pilih region terdekat (mis. `Southeast Asia (Singapore)`), lalu klik **Create new project**.
3. Setelah proyek selesai dibuat, buka menu kiri **SQL Editor** → **New query**.
4. Salin seluruh isi file `supabase/migrations/001_initial_schema.sql` dari repositori ini, tempel ke SQL Editor, lalu klik **Run**.
   - Script ini akan membuat seluruh tabel (`profiles`, `wijk`, `posts`, `media`, `jemaat`, `ibadah_minggu`, `phd_lingkungan`, `kehadiran`, `keuangan`, `menus`, `widgets`, `options`, dll.) beserta aturan keamanan *Row Level Security (RLS)*.
5. Buka menu **Project Settings** (ikon roda gigi) → **API**, lalu catat 3 nilai penting ini:
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **anon / public key** (`VITE_SUPABASE_ANON_KEY`)
   - **service_role key** (`SUPABASE_SERVICE_ROLE_KEY` — **rahasia**, hanya untuk server/Vercel)

### Langkah 2 — Buat Akun Administrator Pertama

1. Di dashboard Supabase, buka **Authentication** → **Users** → klik **Add user** → **Create new user**.
2. Masukkan email dan kata sandi pengurus utama (mis. Pendeta atau Admin), centang **Auto Confirm User**, lalu klik **Create user**.
3. Buka kembali **SQL Editor** → **New query**, jalankan perintah berikut (ganti alamat email sesuai yang baru Anda buat):

```sql
UPDATE public.profiles
SET role = 'administrator', full_name = 'Administrator HKBP Hutaraja', display_name = 'Admin Huria'
WHERE email = 'admin@hkbphutaraja.or.id';
```

4. Sekarang akun tersebut dapat masuk melalui halaman `/login` di website dan menambah akun pelayan lainnya langsung dari menu **Pengguna → Tambah Baru**.

---

### Langkah 3 — Hubungkan Google Drive (Untuk Foto, Gambar & PDF Warta)

Website tidak menyimpan gambar/PDF di penyimpanan terbatas database, melainkan di Google Drive milik gereja melalui akun layanan resmi Google (*Service Account*).

1. Buka [https://console.cloud.google.com](https://console.cloud.google.com) dan buat proyek baru (mis. `HKBP Hutaraja Media`).
2. Di kolom pencarian atas, ketik **Google Drive API**, klik hasilnya, lalu tekan tombol **Enable**.
3. Buka menu **IAM & Admin** → **Service Accounts** → klik **Create Service Account**.
   - Beri nama `hkbp-cms-media`, klik **Create and Continue** → **Done**.
4. Klik akun layanan yang baru dibuat → buka tab **Keys** → **Add Key** → **Create new key** → pilih **JSON** → klik **Create**.
   - File `.json` akan terunduh ke komputer Anda. **Jaga kerahasiaan file ini.**
   - Catat nilai `client_email` di dalam file JSON tersebut (formatnya seperti `hkbp-cms-media@....iam.gserviceaccount.com`).
5. Buka [https://drive.google.com](https://drive.google.com) menggunakan akun Google gereja, lalu buat 1 folder baru bernama **`HKBP-Hutaraja-Media`**.
6. Klik kanan folder tersebut → pilih **Bagikan (Share)** → masukkan alamat `client_email` Service Account tadi → atur izin menjadi **Editor** → klik **Kirim**.
7. Buka folder `HKBP-Hutaraja-Media` tersebut, lalu lihat URL di browser:
   - Contoh URL: `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz`
   - Bagian akhir setelah `/folders/` (`1AbCdEfGhIjKlMnOpQrStUvWxYz`) adalah **`GOOGLE_DRIVE_ROOT_FOLDER_ID`**.

---

### Langkah 4 — Push ke GitHub & Deploy ke Vercel

1. Unggah (*push*) seluruh kode proyek ini ke repositori **GitHub** (disarankan repositori *Private*).
2. Buka [https://vercel.com](https://vercel.com), masuk dengan akun GitHub Anda, lalu klik **Add New...** → **Project**.
3. Pilih repositori GitHub proyek ini, lalu buka bagian **Environment Variables** dan isi seluruh variabel berikut:

| Nama Variabel | Diambil Dari |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ID Folder Google Drive `HKBP-Hutaraja-Media` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Seluruh isi teks file `.json` kunci Service Account Google (dalam satu baris/JSON utuh) |

4. Klik **Deploy**. Dalam 1–2 menit website resmi **HKBP Ressort Hutaraja** akan langsung aktif secara online.

---

### Langkah 5 — Aktifkan Keep-Alive & Backup Mingguan Otomatis di GitHub

Paket gratis Supabase akan menonaktifkan (*pause*) database jika tidak ada aktivitas selama 7 hari. Repositori ini sudah dilengkapi 2 alur kerja otomatis di `.github/workflows/`:
- `supabase-keepalive.yml`: mengirim ping ringan setiap **2 hari** agar Supabase selalu aktif.
- `supabase-backup.yml`: membuat cadangan data otomatis setiap **hari Minggu**.

Cara mengaktifkannya di GitHub:
1. Buka repositori GitHub Anda → **Settings** → **Secrets and variables** → **Actions**.
2. Klik **New repository secret** dan tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - *(Opsional untuk backup SQL penuh)* `SUPABASE_DB_URL` (Connection String PostgreSQL dari Supabase → Settings → Database).

---

## Matriks Peran Pengguna (RBAC)

| Peran | Akses Utama |
|---|---|
| **Administrator** | Seluruh modul CMS, Pengguna, Tampilan, Pengaturan, dan **Keuangan** |
| **Pendeta** | Pos, Warta, Jadwal, Jemaat, Galeri, Kehadiran, dan **Keuangan** |
| **Sekretaris** | Pos, Halaman, Komentar, Warta, Jadwal Ibadah, Jemaat, Galeri, Kehadiran |
| **Bendahara** | Dasbor, Kehadiran Ibadah, Profil Saya *(tidak mengakses modul Keuangan khusus Pendeta/Admin)* |
| **Editor** | Pos, Halaman, Media, Komentar, Warta, Jadwal, Galeri, Tampilan |
| **Penulis (Multimedia)** | Pos, Media, Warta, Galeri |
| **Kontributor** | Menulis & mengedit draf pos pribadi |
| **Jemaat** | Melihat situs publik & mengubah profil sendiri |

---

## Pengembangan Lokal (Komputer Pengembang)

Salin `.env.example` menjadi `.env`, isi nilai konfigurasi, lalu jalankan:

```bash
npm install
npm run dev
```

Aplikasi berjalan di `http://localhost:3000` (menyajikan Vite frontend sekaligus endpoint `/api/*` Express).
