import type { VercelRequest, VercelResponse } from '@vercel/node';
import Busboy from 'busboy';
import { Readable } from 'stream';
import sharp from 'sharp';
import {
  checkUploadRateLimit,
  ensureDriveFolderPath,
  getGoogleDriveClient,
  getSupabaseAdmin,
  verifyBearerStaff,
} from '../_lib/serverClients.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEFAULT_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
];

const THUMB_WIDTHS = [150, 300, 768, 1024] as const;

interface ParsedUpload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  alt: string;
  caption: string;
  deskripsi: string;
}

function parseMultipart(req: VercelRequest, maxBytes: number): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({
      headers: req.headers as Record<string, string>,
      limits: { fileSize: maxBytes, files: 1 },
    });

    let fileBuffer: Buffer | null = null;
    let filename = 'upload';
    let mimeType = 'application/octet-stream';
    let fileLimitHit = false;
    const fields: Record<string, string> = {};

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (_name, stream, info) => {
      filename = info.filename || 'upload';
      mimeType = info.mimeType || 'application/octet-stream';
      const chunks: Buffer[] = [];
      stream.on('limit', () => {
        fileLimitHit = true;
      });
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on('error', (err) => reject(err));
    bb.on('finish', () => {
      if (fileLimitHit) {
        reject(new Error(`Ukuran berkas melebihi batas maksimal ${Math.round(maxBytes / (1024 * 1024))} MB.`));
        return;
      }
      if (!fileBuffer || fileBuffer.length === 0) {
        reject(new Error('Tidak ada berkas yang dikirim.'));
        return;
      }
      resolve({
        buffer: fileBuffer,
        filename,
        mimeType,
        alt: fields.alt || '',
        caption: fields.caption || '',
        deskripsi: fields.deskripsi || '',
      });
    });

    req.pipe(bb);
  });
}

async function uploadBufferToDrive(
  drive: ReturnType<typeof getGoogleDriveClient> extends infer T
    ? T extends { drive: infer D }
      ? D
      : never
    : never,
  folderId: string,
  name: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!res.data.id) {
    throw new Error(`Gagal mengunggah ${name} ke Google Drive.`);
  }
  return res.data.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

  if (!checkUploadRateLimit(authCheck.user.id)) {
    return res.status(429).json({
      error: 'Terlalu banyak unggahan dalam waktu singkat. Coba lagi beberapa menit lagi.',
    });
  }

  const driveClient = getGoogleDriveClient();
  const supabaseAdmin = getSupabaseAdmin();
  if (!driveClient || !supabaseAdmin) {
    return res.status(500).json({
      error:
        'Konfigurasi Google Drive Service Account (GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_DRIVE_ROOT_FOLDER_ID) belum lengkap di server.',
    });
  }

  try {
    // Ambil pengaturan ukuran & tipe file dari tabel options
    const { data: opts } = await supabaseAdmin
      .from('options')
      .select('option_name, option_value')
      .in('option_name', ['max_upload_size_mb', 'allowed_upload_mimes']);

    let maxMb = 10;
    let allowedMimes = DEFAULT_ALLOWED_MIMES;

    (opts || []).forEach((o) => {
      if (o.option_name === 'max_upload_size_mb' && typeof o.option_value === 'number') {
        maxMb = Math.max(1, Math.min(50, o.option_value));
      }
      if (o.option_name === 'allowed_upload_mimes' && Array.isArray(o.option_value)) {
        allowedMimes = o.option_value as string[];
      }
    });

    const parsed = await parseMultipart(req, maxMb * 1024 * 1024);

    if (!allowedMimes.includes(parsed.mimeType)) {
      return res.status(400).json({
        error: `Tipe berkas ${parsed.mimeType} tidak diizinkan. Gunakan JPG, PNG, WebP, GIF, PDF, atau MP4.`,
      });
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}/${month}`;

    const folderId = await ensureDriveFolderPath(
      driveClient.drive,
      driveClient.rootFolderId,
      ['uploads', year, month]
    );

    const safeName = parsed.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePrefix = Date.now();
    const driveOriginalName = `${uniquePrefix}-${safeName}`;

    // Upload file asli ke Drive
    const driveFileId = await uploadBufferToDrive(
      driveClient.drive,
      folderId,
      driveOriginalName,
      parsed.mimeType,
      parsed.buffer
    );

    let width: number | null = null;
    let height: number | null = null;
    const thumbnails: Record<string, string> = {};

    // Hasilkan thumbnail 150, 300, 768, 1024 untuk gambar raster (selain GIF animasi)
    if (
      parsed.mimeType.startsWith('image/') &&
      parsed.mimeType !== 'image/gif'
    ) {
      const metadata = await sharp(parsed.buffer).metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;

      for (const thumbW of THUMB_WIDTHS) {
        if (width && width <= thumbW) continue;
        const resizedBuffer = await sharp(parsed.buffer)
          .rotate()
          .resize({ width: thumbW, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();

        const thumbDriveId = await uploadBufferToDrive(
          driveClient.drive,
          folderId,
          `${uniquePrefix}-w${thumbW}-${safeName}.webp`,
          'image/webp',
          resizedBuffer
        );
        thumbnails[String(thumbW)] = thumbDriveId;
      }
    }

    // Simpan metadata ke tabel public.media
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('media')
      .insert({
        drive_file_id: driveFileId,
        drive_folder_id: folderId,
        nama: parsed.filename,
        mime: parsed.mimeType,
        ukuran: parsed.buffer.length,
        alt: parsed.alt || parsed.filename.replace(/\.[^.]+$/, ''),
        caption: parsed.caption,
        deskripsi: parsed.deskripsi,
        width,
        height,
        thumbnails,
        year_month: yearMonth,
        uploaded_by: authCheck.user.id,
      })
      .select('*')
      .single();

    if (insertError) {
      return res.status(500).json({ error: `Gagal menyimpan metadata media: ${insertError.message}` });
    }

    return res.status(200).json({ media: inserted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal mengunggah berkas.';
    return res.status(400).json({ error: msg });
  }
}
