import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { usePublicSite } from '../../layouts/PublicLayout';
import { usePageSeo } from '../../hooks/usePageSeo';

export function ContactPublicPage() {
  const { options } = usePublicSite();
  usePageSeo({
    title: 'Kontak & Lokasi',
    description: `Alamat sekretariat, kontak pelayanan, dan peta lokasi ${options.site_title}.`,
    siteTitle: options.site_title,
  });

  const primaryColor = options.theme_primary_color || '#0f294a';
  const accentColor = options.theme_accent_color || '#d97706';

  return (
    <div className="bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <header>
          <p
            className="text-xs uppercase tracking-[0.12em] font-semibold mb-2"
            style={{ color: accentColor }}
          >
            Sekretariat Gereja
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0f172a] mb-2">
            Kontak &amp; Peta Lokasi
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
            Hubungi sekretariat {options.site_title} untuk pelayanan administrasi gerejawi, pendaftaran baptisan, sidi, pemberkatan nikah, atau surat keterangan pindah jemaat.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 surface-card p-6 space-y-5 text-sm">
            <div className="flex items-start gap-3">
              <span
                className="w-9 h-9 rounded-lg bg-[#eff6ff] inline-flex items-center justify-center shrink-0"
                style={{ color: primaryColor }}
              >
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <p className="font-semibold text-[#0f172a]">Alamat Gereja Induk</p>
                <p className="text-slate-600 mt-0.5">{options.church_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span
                className="w-9 h-9 rounded-lg bg-[#fef3c7] inline-flex items-center justify-center shrink-0"
                style={{ color: accentColor }}
              >
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <p className="font-semibold text-[#0f172a]">Jam Pelayanan Sekretariat</p>
                <p className="text-slate-600 mt-0.5">
                  Selasa &ndash; Sabtu: <span className="font-mono-num">09.00 &ndash; 15.00 WIB</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span
                className="w-9 h-9 rounded-lg bg-[#eff6ff] inline-flex items-center justify-center shrink-0"
                style={{ color: primaryColor }}
              >
                <Mail className="w-4 h-4" />
              </span>
              <div>
                <p className="font-semibold text-[#0f172a]">Email Resmi</p>
                <p className="text-slate-600 mt-0.5">{options.admin_email}</p>
              </div>
            </div>

            {options.church_phone && (
              <div className="flex items-start gap-3">
                <span
                  className="w-9 h-9 rounded-lg bg-[#fef3c7] inline-flex items-center justify-center shrink-0"
                  style={{ color: accentColor }}
                >
                  <Phone className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-semibold text-[#0f172a]">Telepon Sekretariat</p>
                  <p className="text-slate-600 mt-0.5 font-mono-num">
                    {options.church_phone}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Peta Lokasi OpenStreetMap Wilayah Dairi / Hutaraja */}
          <div className="lg:col-span-7 surface-card overflow-hidden">
            <iframe
              title="Peta Lokasi HKBP Ressort Hutaraja Distrik VI Dairi"
              src="https://www.openstreetmap.org/export/embed.html?bbox=98.26%2C2.71%2C98.36%2C2.79&amp;layer=mapnik"
              className="w-full h-[380px] border-0"
              loading="lazy"
            />
            <div className="px-4 py-3 bg-slate-50 border-t border-[#e2e8f0] text-xs text-slate-600 flex items-center justify-between">
              <span>Wilayah Pelayanan Distrik VI Dairi, Sumatera Utara</span>
              <a
                href="https://www.openstreetmap.org/?mlat=2.748&mlon=98.310#map=13/2.748/98.310"
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
                style={{ color: primaryColor }}
              >
                Buka Peta Lebih Besar &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
