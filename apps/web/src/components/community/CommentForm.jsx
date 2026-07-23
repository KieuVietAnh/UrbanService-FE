import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function CommentForm({ feedbackId, onPosted }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      const redirect = `${location.pathname}${location.search}${location.hash}`;
      const params = new URLSearchParams({
        redirect,
        intent: 'community-interaction',
      });
      navigate(`/login?${params.toString()}`);
      return;
    }

    if (!text.trim()) return setError('Vui lòng nhập nội dung.');
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
      const prefix = base ? base.replace(/\/$/, '') : '';
      const url = `${prefix}/api/user/feedbacks/${feedbackId}/comments`;
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('urbanmind_auth_token') || localStorage.getItem('token')) : null;
      const headers = Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {});
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ content: text.trim() }),
      });
      if (!res.ok) throw new Error('Failed to post');
      setText('');
      onPosted && onPosted();
    } catch (err) {
      console.error(err);
      setError('Không thể gửi bình luận.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-4 border-t">
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Viết bình luận..." className="input input-bordered flex-1" />
        <button disabled={loading} className="btn btn-primary">Gửi</button>
      </div>
    </form>
  );
}
