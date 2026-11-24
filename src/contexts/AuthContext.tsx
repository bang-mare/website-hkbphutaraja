import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { ROLE_LABELS } from '../lib/roles';
import type { Profile, UserRole } from '../types/cms';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isSupabaseReady: boolean;
  isPreviewSession: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [isPreviewSession, setIsPreviewSession] = useState<boolean>(false);

  const fetchProfile = useCallback(async (userId: string, fallbackEmail?: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Gagal memuat profil:', error.message);
      return;
    }

    if (data) {
      setProfile(data as Profile);
    } else if (fallbackEmail) {
      setProfile({
        id: userId,
        email: fallbackEmail,
        full_name: fallbackEmail.split('@')[0],
        display_name: fallbackEmail.split('@')[0],
        role: 'jemaat',
        avatar_url: '',
        phone: '',
        wijk_id: null,
        bio: '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await fetchProfile(data.session.user.id, data.session.user.email);
      }
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        fetchProfile(nextSession.user.id, nextSession.user.email);
      } else {
        setProfile(null);
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
      return { error: 'Koneksi Supabase belum dikonfigurasi pada environment variable.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('invalid login')) {
        return { error: 'Galat: Alamat email atau kata sandi tidak sesuai.' };
      }
      return { error: error.message };
    }
    setIsPreviewSession(false);
    return { error: null };
  };

  const signOut = async () => {
    if (supabase && session) {
      await supabase.auth.signOut();
    }
    setIsPreviewSession(false);
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: 'Koneksi Supabase belum dikonfigurasi pada environment variable.' };
    }
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error ? error.message : null };
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
