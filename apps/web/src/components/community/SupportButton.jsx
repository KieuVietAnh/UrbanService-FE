import { useEffect, useState } from 'react';
import * as Lucide from 'lucide-react';
import { signalrService } from '../../services/socket/signalrService';

export default function SupportButton({
  feedbackId,
  initialCount = 0,
  initialSupported = false,
  className = '',
  onChange,
}) {
  const [isSupported, setIsSupported] = useState(Boolean(initialSupported));
  const [count, setCount] = useState(initialCount || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSupported(Boolean(initialSupported));
    setCount(initialCount || 0);
  }, [initialCount, initialSupported]);

  const toggle = async (event) => {
    event?.stopPropagation();
    if (loading) return;

    const nextSupported = !isSupported;
    const nextCount = Math.max(0, count + (nextSupported ? 1 : -1));

    setIsSupported(nextSupported);
    setCount(nextCount);
    setLoading(true);

    try {
      const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
      const prefix = base ? base.replace(/\/$/, '') : '';
      const url = `${prefix}/api/user/feedbacks/${feedbackId}/support`;
      const token = typeof localStorage !== 'undefined'
        ? localStorage.getItem('urbanmind_auth_token') || localStorage.getItem('token')
        : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(url, {
        method: nextSupported ? 'POST' : 'DELETE',
        credentials: 'include',
        headers,
      });

      if (!response.ok) throw new Error('Không thể cập nhật lượt quan tâm.');

      onChange?.({ isSupported: nextSupported, count: nextCount });

      try {
        signalrService.notifySupportAdded(feedbackId, nextCount, null);
      } catch {
        // Không làm gián đoạn thao tác nếu realtime chưa sẵn sàng.
      }
    } catch (error) {
      setIsSupported(!nextSupported);
      setCount(count);
      console.error('Support toggle failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
        isSupported
          ? 'border-error/20 bg-error/8 text-error'
          : 'border-base-300 bg-base-100 text-base-content/60 hover:border-error/20 hover:bg-error/5 hover:text-error'
      } ${className}`}
      aria-pressed={isSupported}
      aria-label={isSupported ? 'Bỏ quan tâm phản ánh' : 'Quan tâm phản ánh'}
    >
      <Lucide.Heart
        size={16}
        fill={isSupported ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      <span>{count}</span>
    </button>
  );
}
