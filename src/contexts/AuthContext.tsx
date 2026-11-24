import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { ROLE_LABELS } from '../lib/roles';
import type { Profile, UserRole } from '../types/cms';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  isSupabaseReady: boolean;
  isPreviewSession: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; profile?: Profile | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  updateOwnProfile: (updates: {
    full_name: string;
    display_name: string;
    phone: string;
    bio: string;
  }) => Promise<{ error: string | null }>;
  enterPreviewSession: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createPreviewProfile(role: UserRole): Profile {
  const now = new Date().toISOString();
  const name = `Pratinjau ${ROLE_LABELS[role]}`;
  return {
    id: `preview-${role}`,
    email: `${role}@hkbphutaraja.or.id`,
    full_name: name,
    display_name: name,
    role,
    avatar_url: '',
    phone: '0812-0000-0000',
    wijk_id: null,
    bio: 'Akun pratinjau lokal untuk menguji tata letak dan hak akses wp-admin sebelum koneksi Supabase diisi.',
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid login')) {
    return 'Galat: Alamat email atau kata sandi tidak sesuai.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Galat: Email belum dikonfirmasi. Buka Supabase → Authentication → Users dan pastikan akun sudah terkonfirmasi (Auto Confirm User).';
  }
  if (lower.includes('too many requests')) {
    return 'Galat: Terlalu banyak percobaan masuk. Tunggu beberapa saat lalu coba lagi.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Galat: Gagal menghubungi server Supabase. Periksa koneksi internet dan URL Supabase Anda.';
  }
  return `Galat: ${message}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [isPreviewSession, setIsPreviewSession] = useState<boolean>(false);

  const fetchProfile = useCallback(
    async (
      userId: string,
      fallbackEmail?: string
    ): Promise<{ profile: Profile | null; error: string | null }> => {
      if (!supabase) {
        return { profile: null, error: 'Koneksi Supabase belum dikonfigurasi.' };
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          const msg = `Login berhasil, tetapi gagal memuat tabel profiles (${error.message}). Jalankan ulang migrasi SQL 001_initial_schema.sql (bagian GRANT & RLS) di Supabase SQL Editor.`;
          console.warn(msg);
          setProfileError(msg);
          return {
            profile: null,
            error: msg,
          };
        }

        setProfileError(null);

        if (data) {
          const loaded = data as Profile;
          setProfile(loaded);
          return { profile: loaded, error: null };
        }

        const email = fallbackEmail || '';
        const defaultName = email ? email.split('@')[0] : 'Pengguna';
        const fallback: Profile = {
          id: userId,
          email,
          full_name: defaultName,
          display_name: defaultName,
          role: 'jemaat',
          avatar_url: '',
          phone: '',
          wijk_id: null,
          bio: '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallback);
        return { profile: fallback, error: null };
      } catch (err) {
        const errText = err instanceof Error ? err.message : 'Kesalahan tidak diketahui';
        const msg = `Gagal memeriksa profil pengguna: ${errText}`;
        setProfileError(msg);
        return {
          profile: null,
          error: msg,
        };
      }
    },
    []
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          await fetchProfile(data.session.user.id, data.session.user.email);
        }
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    // Jangan jalankan query database secara sinkron di dalam onAuthStateChange
    // untuk menghindari lock contention pada @supabase/supabase-js v2.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const uid = nextSession.user.id;
        const uemail = nextSession.user.email;
        window.setTimeout(() => {
          if (active) {
            void fetchProfile(uid, uemail);
          }
        }, 0);
      } else {
        setProfile(null);
        setProfileError(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return {
        error: 'Koneksi Supabase belum dikonfigurasi pada environment variable.',
        profile: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: translateAuthError(error.message), profile: null };
      }

      if (!data.user) {
        return { error: 'Galat: Data pengguna tidak diterima dari Supabase.', profile: null };
      }

      setIsPreviewSession(false);
      setSession(data.session);
      setUser(data.user);

      const profileResult = await fetchProfile(data.user.id, data.user.email);
      if (profileResult.error) {
        return { error: profileResult.error, profile: null };
      }

      return { error: null, profile: profileResult.profile };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal terhubung ke Supabase.';
      return { error: translateAuthError(msg), profile: null };
    }
  };

  const signOut = async () => {
    if (supabase && session) {
      await supabase.auth.signOut();
    }
    setIsPreviewSession(false);
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileError(null);
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: 'Koneksi Supabase belum dikonfigurasi pada environment variable.' };
    }
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error ? translateAuthError(error.message) : null };
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  const updateOwnProfile = async (updates: {
    full_name: string;
    display_name: string;
    phone: string;
    bio: string;
  }) => {
    if (isPreviewSession && profile) {
      setProfile({ ...profile, ...updates, updated_at: new Date().toISOString() });
      return { error: null };
    }
    if (!supabase || !user) {
      return { error: 'Sesi pengguna tidak ditemukan.' };
    }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      return { error: error.message };
    }
    await fetchProfile(user.id, user.email);
    return { error: null };
  };

  const enterPreviewSession = (role: UserRole) => {
    if (isSupabaseConfigured) return;
    setIsPreviewSession(true);
    setProfile(createPreviewProfile(role));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        profileError,
        loading,
        isSupabaseReady: isSupabaseConfigured,
        isPreviewSession,
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
        updateOwnProfile,
        enterPreviewSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
