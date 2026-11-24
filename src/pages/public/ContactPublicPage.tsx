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

  const primaryColor = options.theme_primary_color || '#1E3A5F';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <header>
        <p className="text-xs uppercase tracking-widest text-[#9A3412] font-semibold mb-2">
          Sekretariat Gereja
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mb-2">
          Kontak &amp; Peta Lokasi
        </h1>
        <p className="text-sm text-stone-600 max-w-2xl">
          Hubungi sekretariat {options.site_title} untuk pelayanan administrasi gerejawi, pendaftaran baptisan, sidi, pemberkatan nikah, atau surat keterangan pindah jemaat.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-md p-6 space-y-5 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
            <div>
              <p className="font-semibold text-[#1C1917]">Alamat Gereja Induk</p>
              <p className="text-stone-600 mt-0.5">{options.church_address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
            <div>
              <p className="font-semibold text-[#1C1917]">Jam Pelayanan Sekretariat</p>
              <p className="text-stone-600 mt-0.5">
                Selasa – Sabtu: 09.00 – 15.00 WIB
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
            <div>
              <p className="font-semibold text-[#1C1917]">Email Resmi</p>
              <p className="text-stone-600 mt-0.5">{options.admin_email}</p>
            </div>
          </div>

          {options.church_phone && (
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
              <div>
                <p className="font-semibold text-[#1C1917]">Telepon Sekretariat</p>
                <p className="text-stone-600 mt-0.5 tabular-nums">
                  {options.church_phone}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Peta Lokasi OpenStreetMap Wilayah Dairi / Hutaraja */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-md overflow-hidden">
          <iframe
            title="Peta Lokasi HKBP Ressort Hutaraja Distrik VI Dairi"
            src="https://www.openstreetmap.org/export/embed.html?bbox=98.26%2C2.71%2C98.36%2C2.79&amp;layer=mapnik"
            className="w-full h-[380px] border-0"
            loading="lazy"
          />
          <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 text-xs text-stone-600 flex items-center justify-between">
            <span>Wilayah Pelayanan Distrik VI Dairi, Sumatera Utara</span>
            <a
              href="https://www.openstreetmap.org/?mlat=2.748&mlon=98.310#map=13/2.748/98.310"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-stone-900"
            >
              Buka Peta Lebih Besar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
