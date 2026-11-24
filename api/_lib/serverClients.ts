import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { google, type drive_v3 } from 'googleapis';

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getGoogleDriveServiceAccountEmail(): string | null {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() || '';
  if (!rawJson) return null;
  try {
    const credentials = JSON.parse(rawJson);
    return typeof credentials.client_email === 'string'
      ? credentials.client_email
      : null;
  } catch {
    return null;
  }
}

export function getGoogleDriveClient(): {
  drive: drive_v3.Drive;
  rootFolderId: string;
} | null {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() || '';
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || '';
  if (!rawJson || !rootFolderId) return null;

  try {
    const credentials = JSON.parse(rawJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });
    return { drive, rootFolderId };
  } catch (err) {
    console.error('Gagal mem-parsing GOOGLE_SERVICE_ACCOUNT_JSON:', err);
    return null;
  }
}

export function getGoogleDriveOAuthRefreshClient(): {
  drive: drive_v3.Drive;
  rootFolderId: string;
} | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || '';
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim() || '';
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || '';

  if (!clientId || !clientSecret || !refreshToken) return null;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return { drive, rootFolderId };
}

export function getGoogleDriveClientFromAccessToken(
  accessToken: string
): {
  drive: drive_v3.Drive;
  rootFolderId: string;
} | null {
  const cleaned = accessToken.trim();
  if (!cleaned || cleaned.length > 4096 || /[\r\n]/.test(cleaned)) {
    return null;
  }
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: cleaned });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || '';
  return { drive, rootFolderId };
}

export async function resolveOrCreateRootFolder(
  drive: drive_v3.Drive,
  preferredRootId: string
): Promise<string> {
  if (preferredRootId) {
    try {
      const check = await drive.files.get({
        fileId: preferredRootId,
        fields: 'id, trashed',
        supportsAllDrives: true,
      });
      if (check.data.id && !check.data.trashed) {
        return check.data.id;
      }
    } catch {
      // Fallback ke pembuatan / pencarian folder HKBP-Hutaraja-Media di Drive user
    }
  }

  const folderName = 'HKBP-Hutaraja-Media';
  const listRes = await drive.files.list({
    q: `'root' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (listRes.data.files && listRes.data.files.length > 0 && listRes.data.files[0].id) {
    return listRes.data.files[0].id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  if (!createRes.data.id) {
    throw new Error('Gagal membuat folder HKBP-Hutaraja-Media di Google Drive.');
  }
  return createRes.data.id;
}

export async function ensureDriveReadPermission(
  drive: drive_v3.Drive,
  fileOrFolderId: string,
  serviceAccountEmail: string | null,
  allowAnyoneFallback: boolean
): Promise<void> {
  if (serviceAccountEmail) {
    try {
      await drive.permissions.create({
        fileId: fileOrFolderId,
        requestBody: {
          type: 'user',
          role: 'reader',
          emailAddress: serviceAccountEmail,
        },
        sendNotificationEmail: false,
        supportsAllDrives: true,
      });
      return;
    } catch {
      // Permission mungkin sudah diwarisi dari folder induk
    }
  } else if (allowAnyoneFallback) {
    try {
      await drive.permissions.create({
        fileId: fileOrFolderId,
        requestBody: {
          type: 'anyone',
          role: 'reader',
        },
        supportsAllDrives: true,
      });
    } catch {
      // Abaikan jika gagal mengatur izin publik
    }
  }
}

export interface VerifiedStaff {
  id: string;
  email: string;
  role: string;
  display_name: string;
}

export async function verifyBearerStaff(
  authHeader: string | undefined,
  allowedRoles: string[]
): Promise<{ user: VerifiedStaff | null; status: number; error: string | null }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      user: null,
      status: 500,
      error: 'Konfigurasi server Supabase (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) belum diisi.',
    };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, status: 401, error: 'Token otorisasi tidak ditemukan.' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { user: null, status: 401, error: 'Token otorisasi kosong.' };
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return { user: null, status: 401, error: 'Sesi tidak valid atau telah kedaluwarsa.' };
  }

  const { data: profile, error: profError } = await admin
    .from('profiles')
    .select('id, email, role, display_name, is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profError || !profile || !profile.is_active) {
    return { user: null, status: 403, error: 'Profil pengguna tidak aktif atau tidak ditemukan.' };
  }

  if (!allowedRoles.includes(profile.role)) {
    return { user: null, status: 403, error: 'Peran Anda tidak memiliki izin untuk aksi ini.' };
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      display_name: profile.display_name,
    },
    status: 200,
    error: null,
  };
}

// Rate limiter memori sederhana per userId (mis. maks 25 unggahan per 5 menit)
const rateBuckets = new Map<string, number[]>();

export function checkUploadRateLimit(userId: string, maxRequests = 25, windowMs = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = (rateBuckets.get(userId) || []).filter((ts) => now - ts < windowMs);
  if (timestamps.length >= maxRequests) {
    rateBuckets.set(userId, timestamps);
    return false;
  }
  timestamps.push(now);
  rateBuckets.set(userId, timestamps);
  return true;
}

export async function ensureDriveFolderPath(
  drive: drive_v3.Drive,
  rootFolderId: string,
  segments: string[]
): Promise<string> {
  let parentId = rootFolderId;

  for (const name of segments) {
    const safeName = name.replace(/'/g, "\\'");
    const listRes = await drive.files.list({
      q: `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (listRes.data.files && listRes.data.files.length > 0 && listRes.data.files[0].id) {
      parentId = listRes.data.files[0].id;
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
        supportsAllDrives: true,
      });
      if (!createRes.data.id) {
        throw new Error(`Gagal membuat folder ${name} di Google Drive.`);
      }
      parentId = createRes.data.id;
    }
  }

  return parentId;
}
