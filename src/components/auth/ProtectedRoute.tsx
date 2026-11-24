import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasCapability, ROLE_LABELS, type Capability } from '../../lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredCapability?: Capability;
}

export function ProtectedRoute({
  children,
  requiredCapability = 'access_admin',
}: ProtectedRouteProps) {
  const { profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f1] flex items-center justify-center font-wp">
        <div className="bg-white border border-[#c3c4c7] px-6 py-5 shadow-sm text-sm text-[#3c434a] flex items-center gap-3">
          <span className="inline-block w-4 h-4 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin" />
          <span>Memuat sesi dasbor HKBP Ressort Hutaraja...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen bg-[#f0f0f1] flex items-center justify-center p-4 font-wp">
        <div className="max-w-md w-full bg-white border border-[#c3c4c7] p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-[#1d2327] mb-2">Akun Dinonaktifkan</h1>
          <p className="text-sm text-[#50575e] mb-4">
            Akun Anda saat ini berstatus tidak aktif. Silakan hubungi Administrator atau Sekretaris Huria.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white text-sm font-medium rounded-[3px] cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  if (!hasCapability(profile.role, requiredCapability)) {
    return (
      <div className="min-h-screen bg-[#f0f0f1] flex items-center justify-center p-4 font-wp">
        <div className="max-w-lg w-full bg-white border border-[#c3c4c7] border-l-4 border-l-[#d63638] p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-[#d63638] shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-semibold text-[#1d2327] mb-1">
                Akses Ditolak (403)
              </h1>
              <p className="text-sm text-[#50575e] mb-3">
                Maaf, peran Anda sebagai <strong>{ROLE_LABELS[profile.role]}</strong> tidak memiliki izin untuk mengakses halaman ini.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {hasCapability(profile.role, 'access_admin') ? (
                  <Link
                    to="/admin"
                    className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-sm rounded-[3px]"
                  >
                    Kembali ke Dasbor
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-sm rounded-[3px]"
                  >
                    Kembali ke Situs Utama
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="px-3.5 py-1.5 border border-[#c3c4c7] bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] text-sm rounded-[3px] cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
