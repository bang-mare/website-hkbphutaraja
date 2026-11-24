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

export async function uploadMediaFile(
  file: File,
  meta?: { alt?: string; caption?: string; deskripsi?: string }
): Promise<{ media: MediaItem | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const newItem: MediaItem = {
      id: `preview-media-${Date.now()}`,
      drive_file_id: `preview-drive-${Date.now()}`,
      drive_folder_id: '',
      nama: file.name,
      mime: file.type || 'application/octet-stream',
      ukuran: file.size,
      alt: meta?.alt || file.name.replace(/\.[^.]+$/, ''),
      caption: meta?.caption || '',
      deskripsi: meta?.deskripsi || '',
      width: null,
      height: null,
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
  formData.append('file', file);
  if (meta?.alt) formData.append('alt', meta.alt);
  if (meta?.caption) formData.append('caption', meta.caption);
  if (meta?.deskripsi) formData.append('deskripsi', meta.deskripsi);

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
