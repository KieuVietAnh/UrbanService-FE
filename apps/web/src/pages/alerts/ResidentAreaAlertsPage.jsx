import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { extractApiErrorMessage, toolsApi, userAreaAlertApi } from '@urbanmind/shared-api';

const PAGE_SIZE = 8;

const formatDateTime = (value) => {
  if (!value) return 'Không xác định';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const severityMeta = (severity) => {
  const value = String(severity || '').toLowerCase();
  if (['critical', 'urgent', 'severe'].includes(value)) {
    return { label: severity || 'Nghiêm trọng', className: 'border-rose-200 bg-rose-50 text-rose-700' };
  }
  if (['high', 'warning'].includes(value)) {
    return { label: severity || 'Cao', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  }
  if (['low', 'info', 'informational'].includes(value)) {
    return { label: severity || 'Thông tin', className: 'border-sky-200 bg-sky-50 text-sky-700' };
  }
  return { label: severity || 'Trung bình', className: 'border-blue-200 bg-blue-50 text-blue-700' };
};

const getAreaId = (area) => area?.areaId ?? area?.id ?? area?.areaID;
const getAreaName = (area) => area?.areaName ?? area?.name ?? `Khu vực ${getAreaId(area) ?? ''}`;

export const ResidentAreaAlertsPage = () => {
  const [areas, setAreas] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [onlySubscribedAreas, setOnlySubscribedAreas] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [alertsPage, setAlertsPage] = useState({ items: [], totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [actionAreaId, setActionAreaId] = useState(null);
  const [error, setError] = useState('');

  const subscribedAreaIds = useMemo(
    () => new Set(subscriptions.map((item) => Number(item.areaId))),
    [subscriptions]
  );

  const availableAreas = useMemo(
    () => areas.filter((area) => !subscribedAreaIds.has(Number(getAreaId(area)))),
    [areas, subscribedAreaIds]
  );

  const loadSubscriptionsAndAreas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [areaList, subscriptionList] = await Promise.all([
        toolsApi.getAreas({}, { throwOnError: true }),
        userAreaAlertApi.getSubscriptions(),
      ]);
      setAreas(Array.isArray(areaList) ? areaList : []);
      setSubscriptions(Array.isArray(subscriptionList) ? subscriptionList : []);
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, 'Không thể tải danh sách khu vực đang theo dõi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setError('');
    try {
      const payload = await userAreaAlertApi.getAlerts({
        OnlySubscribedAreas: onlySubscribedAreas,
        PageNumber: pageNumber,
        PageSize: PAGE_SIZE,
      });
      setAlertsPage(payload);
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, 'Không thể tải cảnh báo khu vực.'));
      setAlertsPage({ items: [], totalItems: 0, totalPages: 0 });
    } finally {
      setAlertsLoading(false);
    }
  }, [onlySubscribedAreas, pageNumber]);

  useEffect(() => {
    loadSubscriptionsAndAreas();
  }, [loadSubscriptionsAndAreas]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleSubscribe = async () => {
    const areaId = Number(selectedAreaId);
    if (!areaId) return;

    setActionAreaId(areaId);
    setError('');
    try {
      await userAreaAlertApi.subscribe(areaId, { receiveAlerts: true, isPrimaryArea: false });
      setSelectedAreaId('');
      await loadSubscriptionsAndAreas();
      setPageNumber(1);
      await loadAlerts();
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, 'Không thể theo dõi khu vực này.'));
    } finally {
      setActionAreaId(null);
    }
  };

  const handleUnsubscribe = async (areaId) => {
    setActionAreaId(areaId);
    setError('');
    try {
      await userAreaAlertApi.unsubscribe(areaId);
      await loadSubscriptionsAndAreas();
      setPageNumber(1);
      await loadAlerts();
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, 'Không thể bỏ theo dõi khu vực này.'));
    } finally {
      setActionAreaId(null);
    }
  };

  const alerts = Array.isArray(alertsPage.items) ? alertsPage.items : [];
  const totalPages = Math.max(0, Number(alertsPage.totalPages) || 0);
  const totalItems = Number(alertsPage.totalItems) || alerts.length;

  return (
    <div className="space-y-6">
      <section className="resident-area-alert-hero relative isolate overflow-hidden rounded-[30px] border p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="resident-area-alert-orb resident-area-alert-orb-left absolute -left-20 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full blur-3xl" />
          <div className="resident-area-alert-orb resident-area-alert-orb-right absolute -right-12 -top-20 h-64 w-64 rounded-full blur-3xl" />
          <div className="resident-area-alert-ring absolute right-[24%] bottom-[-38%] h-52 w-52 rounded-full border-[30px]" />
          <svg viewBox="0 0 1280 240" preserveAspectRatio="none" className="resident-area-alert-mapline absolute inset-0 h-full w-full" fill="none">
            <path d="M-40 188C130 124 240 206 408 142C566 82 704 176 870 114C1015 60 1142 87 1320 142" stroke="currentColor" strokeWidth="1.8" />
            <path d="M-20 216C150 170 290 230 462 184C632 138 755 213 924 166C1070 126 1188 133 1320 174" stroke="currentColor" strokeWidth="1.2" strokeDasharray="7 11" />
            <circle cx="408" cy="142" r="6" fill="currentColor" />
            <circle cx="870" cy="114" r="6" fill="currentColor" />
            <circle cx="1140" cy="88" r="4" fill="currentColor" opacity="0.7" />
          </svg>
          <div className="absolute right-[8%] top-[22%] h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_0_10px_rgba(34,211,238,0.10)]" />
          <div className="absolute left-[42%] bottom-[16%] hidden h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_9px_rgba(59,130,246,0.08)] sm:block" />
        </div>

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]">
              <Lucide.BellRing size={22} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.03em] text-[var(--public-title)] sm:text-3xl">Cảnh báo khu vực</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--public-copy)]">
                Theo dõi các phường bạn quan tâm và xem cảnh báo đô thị được gửi tới cư dân trong khu vực đó.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="resident-area-alert-chip resident-area-alert-chip-blue inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
                  <Lucide.MapPinned size={13} aria-hidden="true" />
                  Theo dõi theo phường
                </span>
                <span className="resident-area-alert-chip resident-area-alert-chip-cyan inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
                  <Lucide.RadioTower size={13} aria-hidden="true" />
                  Cập nhật cảnh báo đô thị
                </span>
              </div>
            </div>
          </div>

          <div className="resident-area-alert-count inline-flex w-fit items-center gap-2 rounded-2xl border px-4 py-3 text-sm text-[var(--public-copy)] shadow-sm backdrop-blur">
            <Lucide.MapPin size={17} className="resident-area-alert-count-icon text-blue-600" aria-hidden="true" />
            <strong className="text-[var(--public-title)]">{subscriptions.length}</strong>
            khu vực đang theo dõi
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <Lucide.CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(280px,0.68fr)_minmax(0,1.32fr)]">
        <aside className="self-start xl:sticky xl:top-24">
          <div className="rounded-[26px] border border-[var(--public-border)] bg-[var(--public-surface)] p-5 shadow-[0_18px_52px_rgba(15,23,42,0.07)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--public-title)]">Khu vực đang theo dõi</h2>
              <p className="mt-1 text-sm text-[var(--public-copy)]">Chọn một phường để nhận cảnh báo liên quan.</p>
            </div>
            <Lucide.RadioTower size={20} className="shrink-0 text-blue-600" aria-hidden="true" />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedAreaId}
              onChange={(event) => setSelectedAreaId(event.target.value)}
              disabled={loading || availableAreas.length === 0}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-3 text-sm text-[var(--public-title)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{availableAreas.length ? 'Chọn khu vực' : 'Đã theo dõi tất cả khu vực'}</option>
              {availableAreas.map((area) => (
                <option key={getAreaId(area)} value={getAreaId(area)}>{getAreaName(area)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={!selectedAreaId || actionAreaId !== null}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {actionAreaId && Number(selectedAreaId) === actionAreaId ? <span className="loading loading-spinner loading-xs" /> : <Lucide.Plus size={16} aria-hidden="true" />}
              Theo dõi
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              [1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-200/60" />)
            ) : subscriptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--public-border)] bg-[var(--public-surface-soft)] p-5 text-center">
                <Lucide.MapPinned size={24} className="mx-auto text-[var(--public-muted)]" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-[var(--public-title)]">Chưa theo dõi khu vực nào</p>
                <p className="mt-1 text-xs leading-5 text-[var(--public-muted)]">Chọn một khu vực ở phía trên để bắt đầu nhận cảnh báo.</p>
              </div>
            ) : (
              subscriptions.map((subscription) => (
                <div key={subscription.subscriptionId ?? subscription.areaId} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Lucide.MapPin size={15} className="shrink-0 text-blue-600" aria-hidden="true" />
                      <strong className="truncate text-sm text-[var(--public-title)]">{subscription.areaName || `Khu vực ${subscription.areaId}`}</strong>
                    </div>
                    <p className="mt-1 text-xs text-[var(--public-muted)]">{subscription.receiveAlerts ? 'Đang nhận cảnh báo' : 'Đã tắt cảnh báo'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnsubscribe(subscription.areaId)}
                    disabled={actionAreaId !== null}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    {actionAreaId === subscription.areaId ? <span className="loading loading-spinner loading-xs" /> : <Lucide.X size={14} aria-hidden="true" />}
                    Bỏ theo dõi
                  </button>
                </div>
              ))
            )}
          </div>
          </div>
        </aside>

        <div className="rounded-[26px] border border-[var(--public-border)] bg-[var(--public-surface)] p-5 shadow-[0_18px_52px_rgba(15,23,42,0.07)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--public-title)]">Cảnh báo dành cho cư dân</h2>
              <p className="mt-1 text-sm text-[var(--public-copy)]">{totalItems} cảnh báo phù hợp với bộ lọc hiện tại.</p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] px-3 py-2.5 text-sm font-medium text-[var(--public-title)]">
              <input
                type="checkbox"
                checked={onlySubscribedAreas}
                onChange={(event) => {
                  setOnlySubscribedAreas(event.target.checked);
                  setPageNumber(1);
                }}
                className="toggle toggle-sm toggle-primary"
              />
              Chỉ khu vực đang theo dõi
            </label>
          </div>

          <div className="mt-5 space-y-3">
            {alertsLoading ? (
              [1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />)
            ) : alerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--public-border)] bg-[var(--public-surface-soft)] px-5 py-10 text-center">
                <Lucide.BellOff size={28} className="mx-auto text-[var(--public-muted)]" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-[var(--public-title)]">Chưa có cảnh báo phù hợp</p>
                <p className="mt-1 text-xs leading-5 text-[var(--public-muted)]">Khi có cảnh báo mới từ khu vực phù hợp, nội dung sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const severity = severityMeta(alert.severity);
                return (
                  <article key={alert.areaAlertId ?? alert.alertId ?? `${alert.areaId}-${alert.createdAt}`} className="rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${severity.className}`}>{severity.label}</span>
                          {alert.areaName ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><Lucide.MapPin size={13} aria-hidden="true" />{alert.areaName}</span> : null}
                          {alert.categoryName ? <span className="text-xs text-[var(--public-muted)]">• {alert.categoryName}</span> : null}
                        </div>
                        <h3 className="mt-2 text-base font-bold leading-6 text-[var(--public-title)]">{alert.title || 'Cảnh báo khu vực'}</h3>
                        <p className="mt-1.5 text-sm leading-6 text-[var(--public-copy)]">{alert.message || 'Không có mô tả bổ sung.'}</p>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--public-muted)]">{formatDateTime(alert.startAt || alert.createdAt)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--public-border)] pt-3 text-xs text-[var(--public-muted)]">
                      {alert.alertType ? <span className="inline-flex items-center gap-1.5"><Lucide.TriangleAlert size={13} aria-hidden="true" />{alert.alertType}</span> : null}
                      {alert.status ? <span className="inline-flex items-center gap-1.5"><Lucide.Activity size={13} aria-hidden="true" />{alert.status}</span> : null}
                      {alert.isSubscribedArea ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600"><Lucide.Radio size={13} aria-hidden="true" />Khu vực đang theo dõi</span> : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--public-border)] pt-4">
              <button
                type="button"
                onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                disabled={pageNumber <= 1 || alertsLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-3 text-sm font-semibold text-[var(--public-title)] disabled:opacity-45"
              >
                <Lucide.ChevronLeft size={16} aria-hidden="true" />
                Trước
              </button>
              <span className="text-sm font-medium text-[var(--public-copy)]">Trang {pageNumber}/{totalPages}</span>
              <button
                type="button"
                onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
                disabled={pageNumber >= totalPages || alertsLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-3 text-sm font-semibold text-[var(--public-title)] disabled:opacity-45"
              >
                Sau
                <Lucide.ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};
