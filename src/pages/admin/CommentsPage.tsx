import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import {
  deleteCommentsPermanently,
  fetchComments,
  replyToComment,
  updateCommentsStatus,
} from '../../lib/cmsData';
import type { CommentRecord, CommentStatus } from '../../types/cms';

export function CommentsPage() {
  const { profile } = useAuth();
  const { addNotice } = useAdmin();

  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | CommentStatus>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  const [replyingTo, setReplyingTo] = useState<CommentRecord | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const { comments: data, error } = await fetchComments();
    if (error) {
      addNotice({ type: 'error', message: `Gagal memuat komentar: ${error}` });
    } else {
      setComments(data);
    }
    setLoading(false);
  }, [addNotice]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0, spam: 0, trash: 0 };
    comments.forEach((item) => {
      if (item.status !== 'trash' && item.status !== 'spam') c.all += 1;
      c[item.status] = (c[item.status] || 0) + 1;
    });
    return c;
  }, [comments]);

  const filtered = useMemo(() => {
    return comments.filter((item) => {
      if (statusFilter === 'all') {
        return item.status !== 'trash' && item.status !== 'spam';
      }
      return item.status === statusFilter;
    });
  }, [comments, statusFilter]);

  const handleStatusChange = async (ids: string[], nextStatus: CommentStatus) => {
    const { error } = await updateCommentsStatus(ids, nextStatus);
    if (error) {
      addNotice({ type: 'error', message: `Gagal memperbarui status: ${error}` });
      return;
    }
    setSelectedIds([]);
    addNotice({ type: 'success', message: 'Status komentar diperbarui.' });
    await loadComments();
  };

  const handleDeletePermanent = async (ids: string[]) => {
    const { error } = await deleteCommentsPermanently(ids);
    if (error) {
      addNotice({ type: 'error', message: `Gagal menghapus komentar: ${error}` });
      return;
    }
    setSelectedIds([]);
    addNotice({ type: 'success', message: 'Komentar dihapus secara permanen.' });
    await loadComments();
  };

  const handleApplyBulk = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === 'delete') {
      await handleDeletePermanent(selectedIds);
    } else {
      await handleStatusChange(selectedIds, bulkAction as CommentStatus);
    }
    setBulkAction('');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyContent.trim()) return;
    setSendingReply(true);
    const { error } = await replyToComment({
      post_id: replyingTo.post_id,
      parent_id: replyingTo.id,
      author_id: profile?.id || null,
      author_name: profile?.display_name || 'Admin Huria',
      author_email: profile?.email || '',
      content: replyContent.trim(),
    });
    setSendingReply(false);
    if (error) {
      addNotice({ type: 'error', message: `Gagal mengirim balasan: ${error}` });
      return;
    }
    setReplyingTo(null);
    setReplyContent('');
    addNotice({ type: 'success', message: 'Balasan komentar diterbitkan.' });
    await loadComments();
  };

  return (
    <div className="pt-4">
      <h1 className="text-[23px] font-normal text-[#1d2327] mb-3">Komentar</h1>

      <ul className="flex flex-wrap items-center gap-y-1 text-[13px] text-[#50575e] mb-2">
        {(
          [
            ['all', 'Semua', counts.all],
            ['pending', 'Menunggu', counts.pending],
            ['approved', 'Disetujui', counts.approved],
            ['spam', 'Spam', counts.spam],
            ['trash', 'Sampah', counts.trash],
          ] as const
        ).map(([key, label, count], idx, arr) => (
          <li key={key} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => {
                setStatusFilter(key);
                setSelectedIds([]);
              }}
              className={`cursor-pointer ${
                statusFilter === key
                  ? 'font-semibold text-[#1d2327]'
                  : 'text-[#2271b1] hover:underline'
              }`}
            >
              {label} <span className="tabular-nums">({count})</span>
            </button>
            {idx < arr.length - 1 && <span className="mx-1.5 text-[#a7aaad]">|</span>}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between py-2 text-[13px]">
        <div className="flex items-center gap-1">
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="h-7 px-2 bg-white border border-[#8c8f94] rounded-[3px]"
          >
            <option value="">Tindakan massal</option>
            <option value="approved">Setujui</option>
            <option value="pending">Tandai Menunggu</option>
            <option value="spam">Tandai Spam</option>
            {statusFilter === 'trash' ? (
              <option value="delete">Hapus Permanen</option>
            ) : (
              <option value="trash">Pindah ke Sampah</option>
            )}
          </select>
          <button
            type="button"
            onClick={() => void handleApplyBulk()}
            className="h-7 px-2.5 bg-[#f6f7f7] border border-[#2271b1] text-[#2271b1] rounded-[3px] cursor-pointer"
          >
            Terapkan
          </button>
        </div>
        <span className="text-[#50575e] tabular-nums">{filtered.length} butir</span>
      </div>

      <div className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] overflow-x-auto text-[13px]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#c3c4c7]">
              <th className="w-9 p-2.5 text-center">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 &&
                    filtered.every((c) => selectedIds.includes(c.id))
                  }
                  onChange={() => {
                    if (filtered.every((c) => selectedIds.includes(c.id))) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(filtered.map((c) => c.id));
                    }
                  }}
                />
              </th>
              <th className="p-2.5 font-medium w-48">Penulis</th>
              <th className="p-2.5 font-medium">Komentar</th>
              <th className="p-2.5 font-medium w-52">Menanggapi</th>
              <th className="p-2.5 font-medium w-40">Dikirim pada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f1]">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[#50575e]">
                  Memuat komentar...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[#50575e]">
                  Tidak ada komentar ditemukan pada status ini.
                </td>
              </tr>
            ) : (
              filtered.map((cmt) => (
                <React.Fragment key={cmt.id}>
                  <tr
                    className={`group ${
                      cmt.status === 'pending' ? 'bg-[#fcf9e8]' : 'bg-white'
                    }`}
                  >
                    <td className="p-2.5 text-center align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cmt.id)}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(cmt.id)
                              ? prev.filter((x) => x !== cmt.id)
                              : [...prev, cmt.id]
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5 align-top">
                      <div className="font-semibold text-[#1d2327]">
                        {cmt.author_name}
                      </div>
                      <div className="text-[12px] text-[#2271b1] break-all">
                        {cmt.author_email}
                      </div>
                    </td>
                    <td className="p-2.5 align-top">
                      <p className="text-[#3c434a] leading-relaxed">{cmt.content}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {cmt.status !== 'approved' ? (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange([cmt.id], 'approved')}
                            className="text-[#007017] hover:underline cursor-pointer"
                          >
                            Setujui
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange([cmt.id], 'pending')}
                            className="text-[#996800] hover:underline cursor-pointer"
                          >
                            Batal Setujui
                          </button>
                        )}
                        <span className="text-[#c3c4c7]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(cmt);
                            setReplyContent('');
                          }}
                          className="text-[#2271b1] hover:underline cursor-pointer"
                        >
                          Balas
                        </button>
                        <span className="text-[#c3c4c7]">|</span>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange([cmt.id], 'spam')}
                          className="text-[#b32d2e] hover:underline cursor-pointer"
                        >
                          Spam
                        </button>
                        <span className="text-[#c3c4c7]">|</span>
                        {cmt.status === 'trash' ? (
                          <button
                            type="button"
                            onClick={() => void handleDeletePermanent([cmt.id])}
                            className="text-[#b32d2e] hover:underline cursor-pointer"
                          >
                            Hapus Permanen
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange([cmt.id], 'trash')}
                            className="text-[#b32d2e] hover:underline cursor-pointer"
                          >
                            Sampah
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 align-top">
                      {cmt.post ? (
                        <Link
                          to={`/admin/posts/${cmt.post.id}`}
                          className="text-[#2271b1] hover:underline font-medium"
                        >
                          {cmt.post.title}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-2.5 align-top text-[12px] text-[#50575e] tabular-nums">
                      {new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(cmt.created_at))}
                    </td>
                  </tr>

                  {replyingTo?.id === cmt.id && (
                    <tr className="bg-[#f6f7f7]">
                      <td colSpan={5} className="p-4">
                        <form onSubmit={handleSendReply} className="space-y-2 max-w-2xl">
                          <p className="font-semibold text-[12px] text-[#1d2327]">
                            Balas komentar {cmt.author_name}
                          </p>
                          <textarea
                            rows={3}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Tulis balasan Anda..."
                            className="w-full p-2 bg-white border border-[#8c8f94] rounded-[3px]"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={sendingReply}
                              className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white rounded-[3px] cursor-pointer"
                            >
                              {sendingReply ? 'Mengirim...' : 'Setujui & Balas'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1.5 bg-white border border-[#c3c4c7] rounded-[3px] cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
