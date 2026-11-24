import { useEffect, useState } from 'react';
import { CheckCircle2, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  subscribeGoogleDriveAuth,
} from '../../lib/googleDriveAuth';

interface GoogleDriveConnectCardProps {
  compact?: boolean;
  onError?: (msg: string) => void;
}

export function GoogleDriveConnectCard({
  compact = false,
  onError,
}: GoogleDriveConnectCardProps) {
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    return subscribeGoogleDriveAuth((state) => {
      setConnected(state.connected);
      setUser(state.user);
    });
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectGoogleDrive();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menghubungkan akun Google Drive.';
      onError?.(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
  };

  if (connected && user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#edfaef] border border-[#00a32a]/40 rounded-[3px] text-[12px] text-[#1d2327]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#00a32a] shrink-0" />
          <span>
            Google Drive terhubung:{' '}
            <strong>{user.email || user.displayName || 'Akun Google'}</strong> (unggah memakai kuota akun Anda)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={connecting}
            onClick={() => void handleConnect()}
            className="text-[#2271b1] hover:underline cursor-pointer"
          >
            Ganti Akun
          </button>
          <span className="text-[#c3c4c7]">|</span>
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            className="inline-flex items-center gap-1 text-[#d63638] hover:underline cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Putuskan</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#f0f6fc] border border-[#72aee6] rounded-[3px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        compact ? 'p-3' : 'p-3.5'
      }`}
    >
      <div className="text-[12.5px] text-[#1d2327] leading-snug">
        <p className="font-semibold mb-0.5">
          Hubungkan Akun Google Drive untuk Mengunggah Berkas
        </p>
        <p className="text-[#50575e]">
          Akun layanan (Service Account) tidak memiliki kuota penyimpanan di Google Drive pribadi. Masuk dengan akun Google pemilik folder Drive agar unggahan memakai kuota akun Anda.
        </p>
      </div>

      {/* Official Sign in with Google button style */}
      <button
        type="button"
        disabled={connecting}
        onClick={() => void handleConnect()}
        className="gsi-material-button inline-flex items-center gap-2.5 h-10 px-3.5 bg-white hover:bg-[#f8f9fa] active:bg-[#eeeeee] border border-[#747775] rounded-[4px] text-[#1f1f1f] text-[13px] font-medium shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
      >
        <span className="gsi-material-button-icon w-[18px] h-[18px] shrink-0 block">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            style={{ display: 'block', width: '100%', height: '100%' }}
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </span>
        <span className="gsi-material-button-contents">
          {connecting ? 'Menghubungkan...' : 'Sign in with Google'}
        </span>
      </button>
    </div>
  );
}
