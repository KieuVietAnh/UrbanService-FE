import { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';

export default function SupportButton({ feedbackId, initialCount = 0, initialSupported = false, className = '', onChange }) {
  const [isSupported, setIsSupported] = useState(Boolean(initialSupported));
  const [count, setCount] = useState(initialCount || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSupported(Boolean(initialSupported));
    setCount(initialCount || 0);
  }, [initialCount, initialSupported]);

  const toggle = async (e) => {
    if (e) e.stopPropagation();
    if (loading) return;
    const next = !isSupported;
    // optimistic
    setIsSupported(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setLoading(true);

    try {
      const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
      const prefix = base ? base.replace(/\/$/, '') : '';
      const url = `${prefix}/api/user/feedbacks/${feedbackId}/support`;
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('urbanmind_auth_token') || localStorage.getItem('token')) : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(url, { method: next ? 'POST' : 'DELETE', credentials: 'include', headers });
      if (!resp.ok) throw new Error('Network response was not ok');
      onChange && onChange({ isSupported: next, count });
    } catch (err) {
      // rollback
      setIsSupported(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      console.error('Support toggle failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600 shadow-sm transition hover:bg-primary/10 hover:text-primary ${className}`}
      aria-pressed={isSupported}
    >
      <Lucide.Heart className={isSupported ? 'text-primary' : 'text-slate-400'} size={16} />
      <span className="font-semibold transition-all">{count}</span>
    </button>
  );
}
