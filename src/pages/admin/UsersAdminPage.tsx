import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { ROLE_LABELS } from '../../lib/roles';
import { DEFAULT_WIJK, fetchPublicWijk } from '../../lib/publicData';
import type { Profile, UserRole, Wijk } from '../../types/cms';

const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[];

export function UsersAdminPage({ createMode = false }: { createMode?: boolean }) {
  const { profile: currentUser } = useAuth();
  const { addNotice } = useAdmin();

  const [users, setUsers] = useState<Profile[]>([]);
  const [wijkList, setWijkList] = useState<Wijk[]>(DEFAULT_WIJK);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Form tambah pengguna baru
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('sekretaris');
  const [phone, setPhone] = useState('');
  const [wijkId, setWijkId] = useState('');
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const wks = await fetchPublicWijk();
    setWijkList(wks);

    if (!isSupabaseConfigured || !supabase) {
      setUsers(currentUser ? [currentUser] : []);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    setLoading(false);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setUsers((data as Profile[]) || []);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const handleRoleChange = async (userId: string, nextRole: UserRole) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', userId);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
      );
      addNotice({ type: 'success', message: 'Peran pengguna diperbarui.' });
    }
  };

  const handleToggleActive = async (userId: string, active: boolean) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: active })
      .eq('id', userId);
    if (error) {
      addNotice({ type: 'error', message: error.message });
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: active } : u))
      );
      addNotice({
        type: 'success',
        message: active ? 'Akun pengguna diaktifkan.' : 'Akun pengguna dinonaktifkan.',
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      addNotice({
        type: 'warning',
        message: 'Hubungkan Supabase terlebih dahulu untuk membuat akun baru.',
      });
      return;
    }

    setCreating(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role,
        phone,
        wijk_id: wijkId || null,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setCreating(false);

    if (!response.ok) {
      addNotice({
        type: 'error',
        message: payload.error || 'Gagal membuat pengguna baru.',
      });
      return;
    }

    addNotice({
      type: 'success',
      message: `Pengguna baru ${email} (${ROLE_LABELS[role]}) berhasil dibuat.`,
      linkLabel: 'Lihat semua pengguna',
      linkTo: '/admin/users',
    });
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    void loadUsers();
  };

  if (createMode) {
    return (
      <div className="pt-4 text-[13px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-[23px] font-normal text-[#1d2327]">Tambah Pengguna Baru</h1>
          <Link
            to="/admin/users"
            className="px-3 py-1 border border-[#c3c4c7] bg-white rounded-[3px]"
          >
            &larr; Semua Pengguna
          </Link>
        </div>

        <form
          onSubmit={handleCreateUser}
          className="bg-white border border-[#c3c4c7] p-5 max-w-2xl space-y-4"
        >
          <p className="text-[#50575e]">
            Buat akun pelayan atau pengelola baru. Akun langsung aktif tanpa perlu verifikasi email ulang (memerlukan <code>SUPABASE_SERVICE_ROLE_KEY</code> di server).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#1d2327] mb-1">
                Alamat Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1d2327] mb-1">
                Kata Sandi Awal (min. 6 karakter) *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1d2327] mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1d2327] mb-1">Peran</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#1d2327] mb-1">
                No. Telepon / WA
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-8 px-2.5 border border-[#8c8f94] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1d2327] mb-1">
                Lingkungan (Wijk)
              </label>
              <select
                value={wijkId}
                onChange={(e) => setWijkId(e.target.value)}
                className="w-full h-8 px-2 bg-white border border-[#8c8f94] rounded-[2px]"
              >
                <option value="">-- Tidak terikat Wijk --</option>
                {wijkList.map((w) => (
                  <option key={w.id} value={w.id}>
                    Wijk {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{creating ? 'Membuat Akun...' : 'Tambah Pengguna Baru'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pt-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-[23px] font-normal text-[#1d2327]">Semua Pengguna</h1>
        <Link
          to="/admin/users/new"
          className="px-3 py-1 text-[13px] text-[#2271b1] border border-[#2271b1] bg-[#f6f7f7] hover:bg-[#f0f6fc] rounded-[3px]"
        >
          Tambah Pengguna Baru
        </Link>
      </div>

      {/* Filter Peran */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-[12px]">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`cursor-pointer ${
            roleFilter === 'all' ? 'font-semibold text-[#1d2327]' : 'text-[#2271b1]'
          }`}
        >
          Semua ({users.length})
        </button>
        {ALL_ROLES.map((r) => {
          const count = users.filter((u) => u.role === r).length;
          if (count === 0) return null;
          return (
            <React.Fragment key={r}>
              <span className="text-[#c3c4c7]">|</span>
              <button
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`cursor-pointer ${
                  roleFilter === r ? 'font-semibold text-[#1d2327]' : 'text-[#2271b1]'
                }`}
              >
                {ROLE_LABELS[r]} ({count})
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="bg-white border border-[#c3c4c7] overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-[#c3c4c7] text-left">
              <th className="p-2.5 font-semibold">Nama Tampilan</th>
              <th className="p-2.5 font-semibold">Email</th>
              <th className="p-2.5 font-semibold">Peran</th>
              <th className="p-2.5 font-semibold">Status Akun</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f1]">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-[#50575e]">
                  Memuat daftar pengguna...
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#f6f7f7]">
                  <td className="p-2.5">
                    <div className="font-semibold text-[#1d2327]">
                      {u.display_name || u.full_name}
                    </div>
                    <div className="text-[11px] text-[#50575e]">{u.phone || '-'}</div>
                  </td>
                  <td className="p-2.5 text-[#2271b1]">{u.email}</td>
                  <td className="p-2.5">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser?.id}
                      onChange={(e) =>
                        void handleRoleChange(u.id, e.target.value as UserRole)
                      }
                      className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[2px] disabled:opacity-60"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2.5">
                    <button
                      type="button"
                      disabled={u.id === currentUser?.id}
                      onClick={() => void handleToggleActive(u.id, !u.is_active)}
                      className={`px-2 py-0.5 text-[12px] border rounded-[2px] cursor-pointer disabled:opacity-50 ${
                        u.is_active
                          ? 'border-[#00a32a] text-[#00a32a] bg-[#f0fdf4]'
                          : 'border-[#d63638] text-[#d63638] bg-[#fcf0f1]'
                      }`}
                    >
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
