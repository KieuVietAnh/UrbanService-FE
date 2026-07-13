import { useEffect, useState } from 'react';

export default function CommentList({ feedbackId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
        const prefix = base ? base.replace(/\/$/, '') : '';
        const url = `${prefix}/api/user/feedbacks/${feedbackId}/comments`;
        const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('urbanmind_auth_token') || localStorage.getItem('token')) : null;
        const headers = token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' };
        const res = await fetch(url, { credentials: 'include', headers });
        if (!res.ok) throw new Error('Failed to load comments');
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const txt = await res.text();
          console.error('Expected JSON comments but got:', txt.slice(0,200));
          throw new Error('Comments API returned non-JSON');
        }
        const data = await res.json();
        const normalizedComments = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.comments)
              ? data.comments
              : [];
        if (mounted) setComments(normalizedComments);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [feedbackId]);

  if (loading) return <div className="p-4">Đang tải bình luận…</div>;
  if (!comments || comments.length === 0) return <div className="p-4 text-sm text-slate-500">Chưa có bình luận. Hãy là người đầu tiên bình luận.</div>;

  return (
    <div className="space-y-3 p-4">
      {comments.map(c => (
        <div key={c.id || c.createdAt} className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold">{(c.userName||'U').charAt(0)}</div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{c.userName || 'Người dùng'}</div>
            <div className="text-xs text-slate-400">{new Date(c.createdAt||c.createdDate).toLocaleString()}</div>
            <div className="mt-1 text-sm text-slate-700">{c.content ?? c.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
