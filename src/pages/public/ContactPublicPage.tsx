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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8 sm:space-y-10">
        <header>
          <p
            className="text-xs uppercase tracking-[0.12em] font-semibold mb-2"
            style={{ color: accentColor }}
          >
            Sekretariat Gereja
          </p>
          <h1 className="heading-page font-display font-bold text-[#0f172a] mb-2">
            Kontak &amp; Peta Lokasi
          </h1>
          <p className="text-[15px] sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Hubungi sekretariat {options.site_title} untuk pelayanan administrasi gerejawi, pendaftaran baptisan, sidi, pemberkatan nikah, atau surat keterangan pindah jemaat.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          <div className="lg:col-span-5 surface-card p-5 sm:p-6 space-y-5 text-[15px] min-w-0">
            <div className="flex items-start gap-3 min-w-0">
              <span
                className="w-10 h-10 rounded-lg bg-[#eff6ff] inline-flex items-center justify-center shrink-0"
                style={{ color: primaryColor }}
              >
                <MapPin className="w-4 h-4" />
              </span>
              <div className="min-w-0 break-words">
                <p className="font-semibold text-[#0f172a]">Alamat Gereja Induk</p>
                <p className="text-slate-600 mt-0.5">{options.church_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <span
                className="w-10 h-10 rounded-lg bg-[#fef3c7] inline-flex items-center justify-center shrink-0"
                style={{ color: accentColor }}
              >
                <Clock className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[#0f172a]">Jam Pelayanan Sekretariat</p>
                <p className="text-slate-600 mt-0.5">
                  Selasa &ndash; Sabtu: <span className="font-mono-num">09.00 &ndash; 15.00 WIB</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <span
                className="w-10 h-10 rounded-lg bg-[#eff6ff] inline-flex items-center justify-center shrink-0"
                style={{ color: primaryColor }}
              >
                <Mail className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[#0f172a]">Email Resmi</p>
                <a
                  href={`mailto:${options.admin_email}`}
                  className="text-slate-600 hover:underline mt-0.5 inline-flex items-center min-h-[36px] break-all"
                >
                  {options.admin_email}
                </a>
              </div>
            </div>

            {options.church_phone && (
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className="w-10 h-10 rounded-lg bg-[#fef3c7] inline-flex items-center justify-center shrink-0"
                  style={{ color: accentColor }}
                >
                  <Phone className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[#0f172a]">Telepon Sekretariat</p>
                  <a
                    href={`tel:${options.church_phone.replace(/[^+\d]/g, '')}`}
                    className="text-slate-600 hover:underline mt-0.5 font-mono-num inline-flex items-center min-h-[36px]"
                  >
                    {options.church_phone}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Peta Lokasi OpenStreetMap Wilayah Dairi / Hutaraja */}
          <div className="lg:col-span-7 surface-card overflow-hidden min-w-0">
            <iframe
              title="Peta Lokasi HKBP Ressort Hutaraja Distrik VI Dairi"
              src="https://www.openstreetmap.org/export/embed.html?bbox=98.26%2C2.71%2C98.36%2C2.79&amp;layer=mapnik"
              className="w-full aspect-[4/3] sm:aspect-video min-h-[240px] max-h-[420px] border-0"
              loading="lazy"
            />
            <div className="px-4 py-3 bg-slate-50 border-t border-[#e2e8f0] text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Wilayah Pelayanan Distrik VI Dairi, Sumatera Utara</span>
              <a
                href="https://www.openstreetmap.org/?mlat=2.748&mlon=98.310#map=13/2.748/98.310"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center min-h-[44px] sm:min-h-0 font-semibold hover:underline"
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
