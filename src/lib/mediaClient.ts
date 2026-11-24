import { isSupabaseConfigured, supabase } from './supabase';
import {
  disconnectGoogleDrive,
  getGoogleDriveAccessToken,
} from './googleDriveAuth';
import type { MediaItem } from '../types/cms';

// Simpanan sementara untuk mode pratinjau lokal (tanpa koneksi Supabase)
const previewMediaStore: MediaItem[] = [
  {
    id: 'preview-media-1',
    drive_file_id: 'preview-drive-1',
    drive_folder_id: '',
    nama: 'Gedung-Gereja-HKBP-Hutaraja.jpg',
    mime: 'image/jpeg',
    ukuran: 482340,
    alt: 'Gedung Gereja HKBP Ressort Hutaraja',
    caption: 'Ruang kebaktian utama HKBP Ressort Hutaraja, Distrik VI Dairi',
    deskripsi: 'Foto pratinjau lokal gedung gereja HKBP Ressort Hutaraja.',
    width: 1600,
    height: 1066,
    thumbnails: {},
    year_month: '2026/11',
    uploaded_by: 'preview-administrator',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function getMediaProxyUrl(
  mediaId: string,
  options?: { width?: 150 | 300 | 768 | 1024; download?: boolean }
): string {
  if (mediaId === 'preview-media-1') {
    return '/src/assets/images/church_hero_sanctuary_1795501235668.jpg';
  }
  const params = new URLSearchParams();
  if (options?.width) params.set('w', String(options.width));
  if (options?.download) params.set('download', '1');
  const qs = params.toString();
  return qs ? `/api/media/${mediaId}?${qs}` : `/api/media/${mediaId}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function fetchMediaLibrary(): Promise<{
  items: MediaItem[];
  error: string | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { items: [...previewMediaStore], error: null };
  }

  const { data, error } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { items: [], error: error.message };
  }

  return { items: (data as MediaItem[]) || [], error: null };
}

export const STANDARD_IMAGE_WIDTH = 1200;
export const STANDARD_IMAGE_HEIGHT = 675;

export async function resizeImageToStandard(
  file: File,
  targetWidth = STANDARD_IMAGE_WIDTH,
  targetHeight = STANDARD_IMAGE_HEIGHT
): Promise<File> {
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml'
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        // Center-crop cover agar ukuran selalu seragam (1200x675) tanpa distorsi
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (targetWidth - drawWidth) / 2;
        const offsetY = (targetHeight - drawHeight) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              resolve(file);
              return;
            }
            const ext = outMime === 'image/png' ? '.png' : '.jpg';
            const baseName = file.name.replace(/\.[^.]+$/, '');
            resolve(new File([blob], `${baseName}${ext}`, { type: outMime }));
          },
          outMime,
          0.9
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export async function uploadMediaFile(
  file: File,
  meta?: { alt?: string; caption?: string; deskripsi?: string; preserveAspect?: boolean }
): Promise<{ media: MediaItem | null; error: string | null }> {
  const shouldStandardize =
    !meta?.preserveAspect &&
    file.type.startsWith('image/') &&
    file.type !== 'image/gif' &&
    file.type !== 'image/svg+xml';

  const processedFile = shouldStandardize
    ? await resizeImageToStandard(file, STANDARD_IMAGE_WIDTH, STANDARD_IMAGE_HEIGHT)
    : file;

  if (!isSupabaseConfigured || !supabase) {
    const newItem: MediaItem = {
      id: `preview-media-${Date.now()}`,
      drive_file_id: `preview-drive-${Date.now()}`,
      drive_folder_id: '',
      nama: processedFile.name,
      mime: processedFile.type || 'application/octet-stream',
      ukuran: processedFile.size,
      alt: meta?.alt || processedFile.name.replace(/\.[^.]+$/, ''),
      caption: meta?.caption || '',
      deskripsi: meta?.deskripsi || '',
      width: shouldStandardize ? STANDARD_IMAGE_WIDTH : null,
      height: shouldStandardize ? STANDARD_IMAGE_HEIGHT : null,
      thumbnails: {},
      year_month: new Date().toISOString().slice(0, 7).replace('-', '/'),
      uploaded_by: 'preview-administrator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    previewMediaStore.unshift(newItem);
    return { media: newItem, error: null };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { media: null, error: 'Sesi login tidak ditemukan. Silakan masuk kembali.' };
  }

  const formData = new FormData();
  formData.append('file', processedFile);
  if (meta?.alt) formData.append('alt', meta.alt);
  if (meta?.caption) formData.append('caption', meta.caption);
  if (meta?.deskripsi) formData.append('deskripsi', meta.deskripsi);
  if (shouldStandardize) formData.append('resize_mode', 'cover_16_9');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  const googleToken = getGoogleDriveAccessToken();
  if (googleToken) {
    headers['X-Google-Access-Token'] = googleToken;
  }

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload.code === 'GOOGLE_REAUTH_REQUIRED') {
      await disconnectGoogleDrive().catch(() => undefined);
    }
    return {
      media: null,
      error: payload.error || `Gagal mengunggah berkas (HTTP ${response.status}).`,
    };
  }

  return { media: payload.media as MediaItem, error: null };
}

export async function updateMediaMeta(
  id: string,
  updates: { nama: string; alt: string; caption: string; deskripsi: string }
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const idx = previewMediaStore.findIndex((m) => m.id === id);
    if (idx !== -1) {
      previewMediaStore[idx] = {
        ...previewMediaStore[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
    return { error: null };
  }

  const { error } = await supabase.from('media').update(updates).eq('id', id);
  return { error: error ? error.message : null };
}

export async function deleteMediaItems(ids: string[]): Promise<{ error: string | null }> {
  if (ids.length === 0) return { error: null };

  if (!isSupabaseConfigured || !supabase) {
    for (let i = previewMediaStore.length - 1; i >= 0; i--) {
      if (ids.includes(previewMediaStore[i].id)) {
        previewMediaStore.splice(i, 1);
      }
    }
    return { error: null };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { error: 'Sesi login tidak ditemukan.' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  const googleToken = getGoogleDriveAccessToken();
  if (googleToken) {
    headers['X-Google-Access-Token'] = googleToken;
  }

  const response = await fetch('/api/media/delete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload.code === 'GOOGLE_REAUTH_REQUIRED') {
      await disconnectGoogleDrive().catch(() => undefined);
    }
    return { error: payload.error || 'Gagal menghapus media.' };
  }

  return { error: null };
}
