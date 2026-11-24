import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getGoogleDriveClient,
  getSupabaseAdmin,
  verifyBearerStaff,
} from '../_lib/serverClients.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  }

  const authCheck = await verifyBearerStaff(req.headers.authorization, [
    'administrator',
    'pendeta',
    'sekretaris',
    'editor',
    'penulis',
  ]);
  if (!authCheck.user) {
    return res.status(authCheck.status).json({ error: authCheck.error });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const driveClient = getGoogleDriveClient();
  if (!supabaseAdmin || !driveClient) {
    return res.status(500).json({ error: 'Layanan media belum dikonfigurasi.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const mediaIds: string[] = Array.isArray(body.ids)
      ? body.ids
      : body.id
        ? [body.id]
        : [];

    if (mediaIds.length === 0) {
      return res.status(400).json({ error: 'ID media wajib disertakan.' });
    }

    const { data: items, error: fetchErr } = await supabaseAdmin
      .from('media')
      .select('id, drive_file_id, thumbnails, uploaded_by')
      .in('id', mediaIds);

    if (fetchErr || !items || items.length === 0) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    const isPrivileged = ['administrator', 'pendeta', 'editor'].includes(authCheck.user.role);
    for (const item of items) {
      if (!isPrivileged && item.uploaded_by !== authCheck.user.id) {
        return res.status(403).json({
          error: 'Anda hanya dapat menghapus media yang Anda unggah sendiri.',
        });
      }
    }

    // Pindahkan file utama dan thumbnail ke tempat sampah Google Drive
    for (const item of items) {
      const fileIdsToTrash = [item.drive_file_id as string];
      if (item.thumbnails && typeof item.thumbnails === 'object') {
        Object.values(item.thumbnails as Record<string, string>).forEach((tid) => {
          if (tid) fileIdsToTrash.push(tid);
        });
      }

      for (const fId of fileIdsToTrash) {
        try {
          await driveClient.drive.files.update({
            fileId: fId,
            requestBody: { trashed: true },
            supportsAllDrives: true,
          });
        } catch (driveErr) {
          console.warn(`Gagal memindahkan file Drive ${fId} ke sampah:`, driveErr);
        }
      }
    }

    const { error: delErr } = await supabaseAdmin
      .from('media')
      .delete()
      .in('id', items.map((i) => i.id));

    if (delErr) {
      return res.status(500).json({ error: `Gagal menghapus catatan media: ${delErr.message}` });
    }

    return res.status(200).json({ deleted: items.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menghapus media.';
    return res.status(500).json({ error: msg });
  }
}
