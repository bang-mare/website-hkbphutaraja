import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGoogleDriveClient, getSupabaseAdmin } from '../_lib/serverClients.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!rawId || !UUID_REGEX.test(rawId)) {
    return res.status(400).json({ error: 'ID media tidak valid.' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const driveClient = getGoogleDriveClient();
  if (!supabaseAdmin || !driveClient) {
    return res.status(500).json({ error: 'Layanan media belum dikonfigurasi.' });
  }

  try {
    const { data: media, error } = await supabaseAdmin
      .from('media')
      .select('id, drive_file_id, nama, mime, thumbnails')
      .eq('id', rawId)
      .maybeSingle();

    if (error || !media) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    const reqWidthParam = Array.isArray(req.query.w) ? req.query.w[0] : req.query.w;
    const reqWidth = reqWidthParam ? Number(reqWidthParam) : 0;
    const downloadFlag = req.query.download === '1';

    let targetFileId = media.drive_file_id as string;
    let targetMime = media.mime as string;

    if (
      reqWidth > 0 &&
      media.thumbnails &&
      typeof media.thumbnails === 'object' &&
      !downloadFlag
    ) {
      const thumbs = media.thumbnails as Record<string, string>;
      const sizes = Object.keys(thumbs)
        .map(Number)
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);

      const bestSize = sizes.find((s) => s >= reqWidth);
      if (bestSize && thumbs[String(bestSize)]) {
        targetFileId = thumbs[String(bestSize)];
        targetMime = 'image/webp';
      }
    }

    const driveRes = await driveClient.drive.files.get(
      { fileId: targetFileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(driveRes.data as ArrayBuffer);
    const safeFilename = encodeURIComponent(String(media.nama || 'berkas'));

    res.setHeader('Content-Type', targetMime);
    res.setHeader(
      'Content-Disposition',
      `${downloadFlag ? 'attachment' : 'inline'}; filename*=UTF-8''${safeFilename}`
    );
    res.setHeader(
      'Cache-Control',
      'public, max-age=31536000, s-maxage=31536000, immutable'
    );

    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Proxy media error:', err);
    return res.status(502).json({ error: 'Gagal mengambil berkas dari Google Drive.' });
  }
}
