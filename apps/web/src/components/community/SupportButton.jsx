import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { setCommunityIncidentSupport } from '../../services/api/feedApi';

export default function SupportButton({
  incidentId,
  initialCount = 0,
  initialSupported = false,
  className = '',
  onChange,
  isAuthenticated,
  onRequireAuth,
  entityLabel = 'phản ánh',
  showLabel = false,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = incidentId;
  const supportStorageKey = useMemo(() => (
    incidentId && entityId ? `urbanmind:incident-support:${entityId}` : null
  ), [entityId, incidentId]);
  const cachedSupported = (() => {
    if (!supportStorageKey || typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(supportStorageKey) === '1';
  })();
  const [isSupported, setIsSupported] = useState(Boolean(initialSupported || cachedSupported));
  const [count, setCount] = useState(initialCount || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCount(Number(initialCount) || 0);
  }, [initialCount]);

  useEffect(() => {
    const cached = supportStorageKey && typeof window !== 'undefined'
      ? window.sessionStorage.getItem(supportStorageKey) === '1'
      : false;
    setIsSupported(Boolean(initialSupported || cached));
  }, [entityId, initialSupported, supportStorageKey]);

  const toggle = async (event) => {
    event?.stopPropagation();

    if (isAuthenticated === false) {
      onRequireAuth?.();
      return;
    }

    if (loading || !entityId) return;

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
      const responseData = await setCommunityIncidentSupport(entityId, nextSupported);

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
      if (supportStorageKey && typeof window !== 'undefined') {
        if (resolvedSupported) window.sessionStorage.setItem(supportStorageKey, '1');
        else window.sessionStorage.removeItem(supportStorageKey);
      }
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
      aria-label={isSupported ? `Bỏ quan tâm ${entityLabel}` : `Quan tâm ${entityLabel}`}
    >
      <Lucide.Heart
        size={16}
        fill={isSupported ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      {showLabel ? <span>{isSupported ? 'Đã đồng tình' : 'Đồng tình'}</span> : null}
      <span>{count}</span>
    </button>
  );
}
