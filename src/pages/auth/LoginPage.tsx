import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { HkbpLogo } from '../../components/HkbpLogo';
import { hasCapability, ROLE_LABELS } from '../../lib/roles';
import type { UserRole } from '../../types/cms';

export function LoginPage() {
  const {
    profile,
    profileError,
    isSupabaseReady,
    signIn,
    signOut,
    resetPassword,
    enterPreviewSession,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || '/admin';

  const [mode, setMode] = useState<'login' | 'lostpassword'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole>('administrator');

  useEffect(() => {
    if (!profile) return;
    if (hasCapability(profile.role, 'access_admin')) {
      navigate(fromPath.startsWith('/admin') ? fromPath : '/admin', { replace: true });
    }
  }, [profile, navigate, fromPath]);

  const displayedError = errorMsg || profileError;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Galat: Alamat email dan kata sandi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const { error, profile: signedProfile } = await signIn(email.trim(), password);
      if (error) {
        setErrorMsg(error);
        return;
      }

      if (signedProfile) {
        if (hasCapability(signedProfile.role, 'access_admin')) {
          navigate(fromPath.startsWith('/admin') ? fromPath : '/admin', {
            replace: true,
          });
        } else {
          setErrorMsg(
            `Berhasil masuk sebagai ${signedProfile.email} (Peran: ${ROLE_LABELS[signedProfile.role]}), namun akun dengan peran Jemaat belum memiliki izin ke Dasbor Admin. Pastikan Anda sudah menjalankan SQL UPDATE public.profiles SET role = 'administrator' di Supabase SQL Editor.`
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.';
      setErrorMsg(`Galat: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLostPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Galat: Masukkan alamat email akun Anda.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        setErrorMsg(error);
      } else {
        setSuccessMsg(
          'Tautan atur ulang kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau folder spam.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewEnter = () => {
    enterPreviewSession(previewRole);
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#f0f0f1] text-[#3c434a] font-wp flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[340px]">
        {/* Logo HKBP di atas kartu seperti wp-login.php */}
        <div className="flex flex-col items-center mb-5">
          <Link
            to="/"
            className="inline-flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] rounded"
            title="HKBP Ressort Hutaraja"
          >
            <HkbpLogo className="w-16 h-16" variant="color" />
            <span className="text-sm font-semibold text-[#1d2327] tracking-tight">
              HKBP Ressort Hutaraja
            </span>
          </Link>
        </div>

        {/* Pesan Error / Sukses khas wp-login.php */}
        {displayedError && (
          <div
            role="alert"
            className="mb-4 bg-white border border-[#c3c4c7] border-l-4 border-l-[#d63638] p-3 text-[13px] text-[#1d2327] shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
          >
            <p>{displayedError}</p>
            {(profileError || (profile && !hasCapability(profile.role, 'access_admin'))) && (
              <div className="mt-2 pt-2 border-t border-[#f0f0f1] flex items-center gap-3">
                <Link to="/" className="text-[#2271b1] underline">
                  Ke Halaman Utama
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                    setErrorMsg(null);
                  }}
                  className="text-[#d63638] underline cursor-pointer"
                >
                  Keluar Akun
                </button>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mb-4 bg-white border border-[#c3c4c7] border-l-4 border-l-[#00a32a] p-3 text-[13px] text-[#1d2327] shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
          >
            {successMsg}
          </div>
        )}

        {mode === 'lostpassword' && !errorMsg && !successMsg && (
          <div className="mb-4 bg-white border border-[#c3c4c7] border-l-4 border-l-[#72aee6] p-3 text-[13px] text-[#3c434a] shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
            Masukkan alamat email Anda. Anda akan menerima email berisi tautan untuk membuat kata sandi baru.
          </div>
        )}

        {/* Kartu Login Putih di Tengah */}
        <div className="bg-white border border-[#c3c4c7] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="user_login"
                  className="block text-[14px] text-[#1d2327] mb-1"
                >
                  Alamat Email
                </label>
                <input
                  id="user_login"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-2.5 text-[15px] bg-white border border-[#8c8f94] rounded-[4px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none focus:ring-1 focus:ring-[#2271b1]"
                  placeholder="nama@hkbphutaraja.or.id"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="user_pass"
                  className="block text-[14px] text-[#1d2327] mb-1"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="user_pass"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-2.5 pr-10 text-[15px] bg-white border border-[#8c8f94] rounded-[4px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none focus:ring-1 focus:ring-[#2271b1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-[#2271b1] hover:text-[#135e96] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 text-[13px] text-[#3c434a] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-[3px] border-[#8c8f94] text-[#2271b1] focus:ring-[#2271b1]"
                  />
                  <span>Ingat saya</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 min-h-[34px] bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white text-[13px] font-medium rounded-[3px] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {submitting ? 'Memeriksa...' : 'Masuk'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLostPasswordSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="lost_email"
                  className="block text-[14px] text-[#1d2327] mb-1"
                >
                  Alamat Email
                </label>
                <input
                  id="lost_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-2.5 text-[15px] bg-white border border-[#8c8f94] rounded-[4px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none focus:ring-1 focus:ring-[#2271b1]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 min-h-[34px] bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white text-[13px] font-medium rounded-[3px] transition-colors cursor-pointer"
                >
                  {submitting ? 'Mengirim...' : 'Dapatkan Kata Sandi Baru'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Tautan bawah kartu */}
        <div className="mt-4 px-1 flex flex-col gap-2 text-[13px] text-[#50575e]">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setMode('lostpassword');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-left hover:text-[#2271b1] cursor-pointer w-fit"
            >
              Lupa kata sandi?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-left hover:text-[#2271b1] cursor-pointer w-fit"
            >
              Masuk
            </button>
          )}

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 hover:text-[#2271b1] w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke HKBP Ressort Hutaraja</span>
          </Link>
        </div>

        {/* Panel Pratinjau UI saat Supabase belum diisi di env */}
        {!isSupabaseReady && (
          <div className="mt-6 bg-white border border-[#c3c4c7] border-l-4 border-l-[#dba617] p-4 text-[12px] text-[#3c434a] shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-4 h-4 text-[#996800] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1d2327]">
                  Supabase Belum Terhubung
                </p>
                <p className="text-[#50575e] mt-0.5 leading-relaxed">
                  Isi <code className="bg-[#f0f0f1] px-1 rounded">VITE_SUPABASE_URL</code> dan{' '}
                  <code className="bg-[#f0f0f1] px-1 rounded">VITE_SUPABASE_ANON_KEY</code> untuk login Supabase nyata. Sementara itu, Anda dapat menguji tata letak &amp; hak akses peran di bawah ini:
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={previewRole}
                onChange={(e) => setPreviewRole(e.target.value as UserRole)}
                aria-label="Pilih peran untuk pratinjau"
                className="flex-1 h-8 px-2 text-[12px] bg-white border border-[#8c8f94] rounded-[3px] text-[#1d2327]"
              >
                {(['administrator', 'pendeta', 'sekretaris', 'bendahara', 'editor', 'penulis', 'kontributor'] as UserRole[]).map(
                  (r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  )
                )}
              </select>
              <button
                type="button"
                onClick={handlePreviewEnter}
                className="px-3 h-8 bg-[#f6f7f7] hover:bg-[#f0f0f1] border border-[#2271b1] text-[#2271b1] font-medium rounded-[3px] cursor-pointer whitespace-nowrap"
              >
                Uji Dasbor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
