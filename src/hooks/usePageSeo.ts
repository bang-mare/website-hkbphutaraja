import { useEffect } from 'react';

interface SeoOptions {
  title: string;
  description?: string;
  siteTitle?: string;
}

export function usePageSeo({
  title,
  description,
  siteTitle = 'HKBP Ressort Hutaraja',
}: SeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes(siteTitle) ? title : `${title} — ${siteTitle}`;
    document.title = fullTitle;

    const desc =
      description ||
      'Website Resmi Gereja HKBP Ressort Hutaraja (Distrik VI Dairi). Jadwal ibadah, warta jemaat, berita huria, dan layanan jemaat.';

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, value: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
  }, [title, description, siteTitle]);
}
