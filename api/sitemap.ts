import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers.host || 'hkbp-hutaraja.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${host}`;

  const staticPaths = [
    '/',
    '/tentang-kami',
    '/jadwal-ibadah',
    '/warta',
    '/berita',
    '/galeri',
    '/kontak',
  ];

  const urls: Array<{ loc: string; lastmod?: string }> = staticPaths.map((p) => ({
    loc: `${baseUrl}${p}`,
  }));

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

  if (supabaseUrl && anonKey) {
    try {
      const client = createClient(supabaseUrl, anonKey);
      const { data } = await client
        .from('posts')
        .select('type, slug, updated_at')
        .eq('status', 'publish')
        .order('updated_at', { ascending: false })
        .limit(500);

      (data || []).forEach((item) => {
        const prefix =
          item.type === 'post'
            ? '/berita/'
            : item.type === 'warta'
              ? '/warta/'
              : item.type === 'album'
                ? '/galeri/'
                : '/';
        const loc = `${baseUrl}${prefix}${item.slug}`;
        if (!urls.some((u) => u.loc === loc)) {
          urls.push({ loc, lastmod: new Date(item.updated_at).toISOString().split('T')[0] });
        }
      });
    } catch {
      // Abaikan error saat generate sitemap fallback
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</loc>${
      u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''
    }
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(xml);
}
