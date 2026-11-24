import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, BookOpen, ArrowRight } from 'lucide-react';
import { HkbpLogo } from '../../components/HkbpLogo';
import { useAuth } from '../../contexts/AuthContext';
import { hasCapability } from '../../lib/roles';

const WIJK_LIST = [
  { name: 'Letare', desc: 'Pelayanan keluarga & PHD rutin mingguan.' },
  { name: 'Exaudi', desc: 'Persekutuan doa dan diakonia lingkungan.' },
  { name: 'Judika', desc: 'Pembinaan koor dan warga jemaat.' },
  { name: 'Galatia', desc: 'Kebaktian rumah tangga & kunjungan kasih.' },
  { name: 'Efesus', desc: 'Persekutuan sektor & pelayanan pemuda.' },
  { name: 'Jeremia', desc: 'Pembinaan iman & kebersamaan sektor.' },
];

export function PublicHomePage() {
  const { profile } = useAuth();
  const isStaff = hasCapability(profile?.role, 'access_admin');

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1C1917] flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-display font-semibold tracking-tight text-[#1E3A5F] whitespace-nowrap shrink-0"
          >
            <HkbpLogo className="w-8 h-8 shrink-0" variant="color" />
            <span>HKBP Ressort Hutaraja</span>
          </Link>

          {/* Zone 2: 4-5 Concise Nav Links */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600"
          >
            <a
              href="#beranda"
              className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0"
            >
              Beranda
            </a>
            <a
              href="#jadwal"
              className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0"
            >
              Jadwal Ibadah
            </a>
            <a
              href="#wijk"
              className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0"
            >
              Lingkungan
            </a>
            <a
              href="#tentang"
              className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0"
            >
              Tentang Kami
            </a>
            <a
              href="#kontak"
              className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0"
            >
              Kontak
            </a>
          </nav>

          {/* Zone 3: Primary Action ("Masuk" / "Dasbor") */}
          <div className="flex items-center shrink-0">
            <Link
              to={isStaff ? '/admin' : '/login'}
              className="px-4 py-2 text-sm font-medium text-white bg-[#1E3A5F] hover:bg-[#162d4a] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {isStaff ? 'Dasbor Admin' : 'Masuk'}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="beranda" className="border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-widest text-[#9A3412] font-semibold mb-3">
                Distrik VI Dairi · Huria Kristen Batak Protestan
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#1C1917] leading-[1.15] tracking-tight mb-4 [text-wrap:balance]">
                Bertumbuh dalam Firman, Melayani dalam Kasih
              </h1>
              <p className="text-base text-stone-600 leading-relaxed max-w-xl mb-6">
                Selamat datang di portal resmi Gereja HKBP Ressort Hutaraja. Temukan jadwal ibadah Minggu, jadwal PHD enam lingkungan, warta jemaat mingguan, serta berita pelayanan huria.
              </p>

              {/* Ayat Harian */}
              <div className="bg-[#F4EFE6] border border-stone-200 p-4 rounded-md mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A5F] mb-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Ayat Renungan · Mazmur 119:105</span>
                </div>
                <p className="font-display italic text-stone-800 text-base leading-relaxed">
                  &ldquo;Firman-Mu itu pelita bagi kakiku dan terang bagi jalanku.&rdquo;
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#jadwal"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
                >
                  <span>Lihat Jadwal Ibadah</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  to="/login"
                  className="inline-flex items-center px-5 py-2.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
                >
                  Portal Pelayan &amp; Admin
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                <img
                  src="/src/assets/images/church_hero_sanctuary_1795501235668.jpg"
                  alt="Ruang Ibadah Gereja HKBP Ressort Hutaraja"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Jadwal Ibadah Strip */}
        <section id="jadwal" className="py-12 lg:py-16 border-b border-stone-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-500 font-medium mb-1">
                  Jadwal Pelayanan Rutin
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                  Ibadah Minggu &amp; Kategorial
                </h2>
              </div>
              <p className="text-sm text-stone-600">
                Waktu Indonesia Barat (WIB) · Gereja Induk Hutaraja
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 border border-stone-200 rounded-md bg-[#FBF9F5]">
                <div className="flex items-center gap-2 text-xs text-[#9A3412] font-semibold mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="tabular-nums">08.00 WIB</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-1">
                  Ibadah Minggu Pagi &amp; Sekolah Minggu
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Kebaktian umum pagi dan ibadah anak-anak Sekolah Minggu berlangsung serentak setiap hari Minggu.
                </p>
              </div>

              <div className="p-6 border border-stone-200 rounded-md bg-[#FBF9F5]">
                <div className="flex items-center gap-2 text-xs text-[#9A3412] font-semibold mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="tabular-nums">10.30 WIB</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-1">
                  Ibadah Minggu Siang (Utama)
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Kebaktian utama berbahasa Batak Toba / Indonesia disertai paduan suara huria dan koor lingkungan.
                </p>
              </div>

              <div className="p-6 border border-stone-200 rounded-md bg-[#FBF9F5]">
                <div className="flex items-center gap-2 text-xs text-[#9A3412] font-semibold mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Tengah Minggu</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-1">
                  PHD Lingkungan (Wijk)
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Partangiangan Huria di rumah keluarga jemaat pada 6 lingkungan dengan jadwal tuan rumah mingguan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6 Lingkungan (Wijk) */}
        <section id="wijk" className="py-12 lg:py-16 border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-8">
              <p className="text-xs uppercase tracking-widest text-stone-500 font-medium mb-1">
                Persekutuan Jemaat
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] mb-2">
                Enam Lingkungan (Wijk) Pelayanan
              </h2>
              <p className="text-sm text-stone-600">
                Pelayanan pastoral dan persekutuan doa HKBP Ressort Hutaraja terbagi ke dalam enam lingkungan aktif.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {WIJK_LIST.map((wijk, index) => (
                <div
                  key={wijk.name}
                  className="p-5 bg-white border border-stone-200 rounded-md"
                >
                  <p className="text-xs text-stone-500 tabular-nums mb-1">
                    0{index + 1}. Lingkungan
                  </p>
                  <h3 className="font-display text-xl font-semibold text-[#1E3A5F] mb-1.5">
                    Wijk {wijk.name}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{wijk.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tentang & Kontak */}
        <section id="tentang" className="py-12 lg:py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 font-medium mb-1">
                Profil Huria
              </p>
              <h2 className="font-display text-2xl font-semibold text-[#1C1917] mb-3">
                Tentang HKBP Ressort Hutaraja
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                HKBP Ressort Hutaraja berada dalam naungan Distrik VI Dairi, berpusat di Sumatera Utara. Bersama Pendeta Ressort, Guru Huria, Bibelvrouw, dan seluruh Sintua, gereja terpanggil menjadi persekutuan yang bersekutu, bersaksi, dan melayani.
              </p>
              <p className="text-xs text-stone-500">
                Halaman berita, warta jemaat PDF, galeri album, dan menu dinamis akan terhubung langsung dengan CMS pada tahap lanjutan.
              </p>
            </div>

            <div id="kontak" className="p-6 border border-stone-200 rounded-md bg-[#FBF9F5]">
              <h3 className="font-display text-xl font-semibold text-[#1C1917] mb-3">
                Sekretariat Gereja
              </h3>
              <div className="space-y-2.5 text-sm text-stone-700">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#1E3A5F] shrink-0 mt-0.5" />
                  <span>Hutaraja, Distrik VI Dairi, Sumatera Utara</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#1E3A5F] shrink-0 mt-0.5" />
                  <span>Jam Pelayanan Sekretariat: Selasa – Sabtu, 09.00 – 15.00 WIB</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-stone-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <HkbpLogo className="w-6 h-6" variant="monochrome-light" />
            <span>
              &copy; {new Date().getFullYear()} HKBP Ressort Hutaraja — Distrik VI Dairi
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-white underline">
              Masuk Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
