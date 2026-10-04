import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ManagerPageHeader, ManagerSectionHeader, ManagerEmptyState } from '../../components/manager/ManagerPageElements';
import DelightToast from '../../components/delight/DelightToast';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import { getBadgeIntent } from '../../components/design-system/badgeSemantics';
import { getCategoryLabel } from '../../utils/categoryLabels';

const SESSION_KEY = 'staff-area-alerts-created';
const PAGE_SIZE = 10;

const normalizeAreaAlertPage = (response, pageNumber) => {
  const source = response?.data ?? response?.result ?? response;
  if (Array.isArray(source)) {
    const totalItems = source.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, pageNumber), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return {
      items: source.slice(start, start + PAGE_SIZE),
      pageNumber: safePage,
      totalItems,
      totalPages,
    };
  }

  const items = Array.isArray(source?.items)
    ? source.items
    : Array.isArray(source?.data)
      ? source.data
      : [];
  const totalItems = Number(source?.totalItems ?? source?.totalCount ?? items.length) || 0;
  const totalPages = Math.max(1, Number(source?.totalPages) || Math.ceil(totalItems / PAGE_SIZE));
  return {
    items,
    pageNumber: Math.min(Math.max(1, Number(source?.pageNumber) || pageNumber), totalPages),
    totalItems,
    totalPages,
  };
};

const getAreaLabel = (alert) => (
  alert?.areaName
  || alert?.area?.areaName
  || alert?.area?.name
  || alert?.area?.displayName
  || 'Khu vực chưa xác định'
);

const readSessionAlerts = () => {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const severityLabel = {
  Critical: 'Khẩn cấp',
  High: 'Cao',
  Medium: 'Trung bình',
  Low: 'Thấp',
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa xác định';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa xác định';
  return date.toLocaleString('vi-VN');
};

export default function AreaAlertManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alerts, setAlerts] = useState(() => readSessionAlerts());
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(() => readSessionAlerts().length);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', sub: '' });

  useEffect(() => {
    const createdAlert = location.state?.createdAlert;
    if (!createdAlert) return;

    setAlerts((current) => {
      const createdId = createdAlert?.alertId ?? createdAlert?.areaAlertId ?? createdAlert?.id;
      const next = [
        createdAlert,
        ...current.filter((item) => (
          (item?.alertId ?? item?.areaAlertId ?? item?.id) !== createdId
        )),
      ];

      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        // Session persistence is best-effort only.
      }

      return next;
    });

    setToast({
      open: true,
      message: 'Cảnh báo khu vực đã được tạo',
      sub: 'Cảnh báo thủ công đã được phát hành thành công.',
    });

    setPage(1);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await managementFeedbackApi.getAreaAlerts({
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      const result = normalizeAreaAlertPage(response, page);
      setAlerts(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
      if (result.pageNumber !== page) setPage(result.pageNumber);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.items));
      } catch {
        // Session cache is only a fallback when the API is temporarily unavailable.
      }
    } catch (requestError) {
      console.error('Failed to load area alerts', requestError);
      setError('Không thể tải danh sách cảnh báo từ hệ thống. Đang giữ dữ liệu gần nhất trong phiên.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const criticalCount = useMemo(
    () => alerts.filter((item) => item?.severity === 'Critical' || item?.severity === 'High').length,
    [alerts]
  );

  return (
    <div className="admin-page-shell space-y-6">
      <ManagerPageHeader
        title="Quản lý cảnh báo khu vực"
        description="Phát hành cảnh báo theo khu vực và theo dõi danh sách cảnh báo từ hệ thống."
        icon={Lucide.BellRing}
        statusLabel="TỔNG CẢNH BÁO"
        statusValue={`${totalItems} cảnh báo`}
        actions={(
          <Button
            type="button"
            onClick={() => navigate('/staff/area-alerts/create')}
            variant="primary"
          >
            <Lucide.Plus size={17} />
            Tạo cảnh báo
          </Button>
        )}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="admin-panel flex items-start gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Lucide.Megaphone size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Cảnh báo thủ công</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {totalItems} trên hệ thống
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Tạo cảnh báo trực tiếp cho một khu vực khi cần thông tin người dân nhanh chóng.
            </p>
          </div>
        </div>

        <div className="admin-panel flex items-start gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Lucide.TriangleAlert size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Mức độ cao / khẩn cấp</h2>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {criticalCount} trên trang này
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Theo dõi nhanh các cảnh báo có mức độ Cao hoặc Khẩn cấp vừa phát hành.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <ManagerSectionHeader
            title="Cảnh báo vừa tạo"
            description="Danh sách cảnh báo được đọc từ hệ thống và tải theo từng trang."
            icon={Lucide.History}
          />
        </div>

        {error ? (
          <div className="mx-5 mt-5 flex items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-6">
            <span>{error}</span>
            <button type="button" onClick={() => void loadAlerts()} className="shrink-0 font-semibold text-amber-900 underline">Thử lại</button>
          </div>
        ) : null}

        {loading && alerts.length === 0 ? (
          <div className="flex items-center justify-center gap-3 px-6 py-12 text-sm font-medium text-slate-500">
            <span className="loading loading-spinner loading-md text-blue-600" /> Đang tải cảnh báo...
          </div>
        ) : alerts.length === 0 ? (
          <div className="px-6 py-12">
            <ManagerEmptyState
              title="Chưa có cảnh báo khu vực"
              description="Tạo cảnh báo mới để phát hành thông tin theo khu vực."
              action={(
                <Button
                  type="button"
                  onClick={() => navigate('/staff/area-alerts/create')}
                  variant="primary"
                >
                  <Lucide.Plus size={16} />
                  Tạo cảnh báo
                </Button>
              )}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <article
                key={alert.alertId || alert.areaAlertId || alert.id}
                className="px-5 py-5 transition hover:bg-slate-50/70 sm:px-6"
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        intent={getBadgeIntent(alert.severity || 'Medium', 'severity')}
                        className="whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold"
                      >
                        {severityLabel[alert.severity] || alert.severity || 'Chưa xác định'}
                      </Badge>

                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {alert.alertType === 'FeedbackCritical' ? 'Từ phản ánh' : 'Thủ công'}
                      </span>

                      {alert.status ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                          {alert.status}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-slate-950">
                      {alert.title || 'Không có tiêu đề'}
                    </h3>
                    <p className="mt-1.5 max-w-4xl text-sm leading-6 text-slate-600">
                      {alert.message || 'Không có nội dung cảnh báo'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600">
                    <Lucide.MapPin size={15} className="text-slate-400" aria-hidden="true" />
                    {getAreaLabel(alert)}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-xs font-medium text-slate-400">Danh mục</div>
                    <div className="mt-1 font-medium text-slate-700">
                      {getCategoryLabel(alert.categoryName || alert.category?.name || alert.categoryType || alert.type) || 'Không chọn'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400">Bắt đầu</div>
                    <div className="mt-1 font-medium text-slate-700">{formatDateTime(alert.startAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400">Kết thúc</div>
                    <div className="mt-1 font-medium text-slate-700">{formatDateTime(alert.endAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400">Bán kính</div>
                    <div className="mt-1 font-medium text-slate-700">
                      {alert.radiusMeters ? `${alert.radiusMeters} m` : 'Theo khu vực'}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && totalPages > 1 ? (
          <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>Trang <strong className="text-slate-700">{page}</strong> / {totalPages} · Tổng {totalItems} cảnh báo</span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <Lucide.ChevronLeft size={15} /> Trước
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Sau <Lucide.ChevronRight size={15} />
              </Button>
            </div>
          </footer>
        ) : null}
      </section>

      <DelightToast
        open={toast.open}
        message={toast.message}
        sub={toast.sub}
        onClose={() => setToast({ open: false, message: '', sub: '' })}
      />
    </div>
  );
}
