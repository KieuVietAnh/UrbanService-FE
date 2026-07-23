import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SupportButton({
  feedbackId,
  initialCount = 0,
  initialSupported = false,
  className = '',
  onChange,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSupported, setIsSupported] = useState(Boolean(initialSupported));
  const [count, setCount] = useState(initialCount || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCount(Number(initialCount) || 0);
  }, [initialCount]);

  useEffect(() => {
    setIsSupported(Boolean(initialSupported));
  }, [feedbackId, initialSupported]);

  const toggle = async (event) => {
    event?.stopPropagation();
    if (loading) return;

    if (!user) {
      const redirect = `${location.pathname}${location.search}${location.hash}`;
      const params = new URLSearchParams({
        redirect,
        intent: 'community-interaction',
      });
      navigate(`/login?${params.toString()}`);
      return;
    }

    const previousSupported = isSupported;
    const previousCount = count;
    const nextSupported = !previousSupported;
    const optimisticCount = Math.max(
      0,
      previousCount + (nextSupported ? 1 : -1)
    );

    setIsSupported(nextSupported);
    setCount(optimisticCount);
    setLoading(true);

    try {
      const base = (
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        ''
      );
      const prefix = base ? base.replace(/\/$/, '') : '';
      const url = `${prefix}/api/user/feedbacks/${feedbackId}/support`;
      const token = typeof localStorage !== 'undefined'
        ? (
          localStorage.getItem('urbanmind_auth_token') ||
          localStorage.getItem('token')
        )
        : null;
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await fetch(url, {
        method: nextSupported ? 'POST' : 'DELETE',
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        throw new Error('Không thể cập nhật lượt quan tâm.');
      }

      const responsePayload = await response.json().catch(() => null);
      const responseData = responsePayload?.data || responsePayload || {};

      const serverSupported = [
        responseData?.isSupportedByCurrentUser,
        responseData?.isSupported,
        responseData?.supported,
      ].find((value) => typeof value === 'boolean');

      const serverCount = [
        responseData?.supportCount,
        responseData?.supports,
        responseData?.count,
      ].find((value) => Number.isFinite(Number(value)));

      const resolvedSupported = typeof serverSupported === 'boolean'
        ? serverSupported
        : nextSupported;
      const resolvedCount = serverCount !== undefined
        ? Math.max(0, Number(serverCount))
        : optimisticCount;

      setIsSupported(resolvedSupported);
      setCount(resolvedCount);
      onChange?.({
        isSupported: resolvedSupported,
        count: resolvedCount,
      });
    } catch (error) {
      setIsSupported(previousSupported);
      setCount(previousCount);
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
