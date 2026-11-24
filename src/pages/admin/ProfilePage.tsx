import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { ROLE_LABELS } from '../../lib/roles';

export function ProfilePage() {
  const { profile, updateOwnProfile } = useAuth();
  const { addNotice } = useAdmin();

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateOwnProfile({
      full_name: fullName.trim(),
      display_name: displayName.trim() || fullName.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
    });
    setSaving(false);

    if (error) {
      addNotice({ type: 'error', message: `Gagal memperbarui profil: ${error}` });
    } else {
      addNotice({ type: 'success', message: 'Profil diperbarui.' });
    }
  };

  return (
    <div className="pt-4 max-w-3xl">
      <h1 className="text-[23px] font-normal text-[#1d2327] mb-4">Profil Saya</h1>

      <form onSubmit={handleSubmit} className="space-y-6 text-[13px]">
        <div className="bg-white border border-[#c3c4c7] p-5 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-semibold text-[#1d2327] mb-4 pb-2 border-b border-[#f0f0f1]">
            Nama &amp; Identitas
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-medium text-[#1d2327]">Email</label>
              <div className="sm:col-span-2">
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full max-w-sm h-8 px-2.5 bg-[#f0f0f1] border border-[#8c8f94] rounded-[3px] text-[#50575e]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="font-medium text-[#1d2327]">Peran</label>
              <div className="sm:col-span-2 text-[#1d2327] font-medium">
                {profile ? ROLE_LABELS[profile.role] : '-'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label htmlFor="profile-fullname" className="font-medium text-[#1d2327]">
                Nama Lengkap
              </label>
              <div className="sm:col-span-2">
                <input
                  id="profile-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full max-w-sm h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label htmlFor="profile-displayname" className="font-medium text-[#1d2327]">
                Tampilkan Nama Secara Publik Sebagai
              </label>
              <div className="sm:col-span-2">
                <input
                  id="profile-displayname"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full max-w-sm h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label htmlFor="profile-phone" className="font-medium text-[#1d2327]">
                Nomor Telepon / WhatsApp
              </label>
              <div className="sm:col-span-2">
                <input
                  id="profile-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full max-w-sm h-8 px-2.5 bg-white border border-[#8c8f94] rounded-[3px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label htmlFor="profile-bio" className="font-medium text-[#1d2327] pt-1">
                Informasi Biografi
              </label>
              <div className="sm:col-span-2">
                <textarea
                  id="profile-bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full max-w-md p-2.5 bg-white border border-[#8c8f94] rounded-[3px] text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white font-medium rounded-[3px] cursor-pointer"
          >
            {saving ? 'Menyimpan...' : 'Perbarui Profil'}
          </button>
        </div>
      </form>
    </div>
  );
}
