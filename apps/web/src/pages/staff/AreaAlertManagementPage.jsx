import { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import DelightToast from '../../components/delight/DelightToast';
import { getSeverityBadgeClasses, normalizeAreaAlertRecord, SEVERITY_OPTIONS, validateAreaAlertForm } from './areaAlertManagement.utils.mjs';

const initialFormState = {
  area: '',
  category: '',
  hotspot: '',
  title: '',
  message: '',
  severity: 'High',
  latitude: '',
  longitude: '',
  radiusMeters: '',
  startAt: '',
  endAt: '',
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const buildPayload = (values) => ({
  area: values.area,
  category: values.category || undefined,
  hotspot: values.hotspot || undefined,
  title: values.title,
  message: values.message,
  severity: values.severity,
  latitude: values.latitude ? Number(values.latitude) : undefined,
  longitude: values.longitude ? Number(values.longitude) : undefined,
  radiusMeters: values.radiusMeters ? Number(values.radiusMeters) : undefined,
  startAt: values.startAt,
  endAt: values.endAt || undefined,
});

export const AreaAlertManagementPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [toastState, setToastState] = useState({ open: false, message: '', sub: '' });

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/management/area-alerts', {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Không thể tải dữ liệu cảnh báo');
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
        setAlerts(items.map(normalizeAreaAlertRecord));
      } catch (error) {
        console.error('Failed to load area alerts', error);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  const canShowEmptyState = !loading && alerts.length === 0;

  const summary = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    alerts.forEach((alert) => {
      const severity = `${alert.severity || ''}`.trim();
      if (counts[severity] !== undefined) {
        counts[severity] += 1;
      }
    });

    return counts;
  }, [alerts]);

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateAreaAlertForm(formState);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/management/area-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(buildPayload(formState)),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || 'Không thể tạo cảnh báo');
      }

      const created = await response.json().catch(() => ({}));
      const normalized = normalizeAreaAlertRecord(created || { ...buildPayload(formState), id: `local-${Date.now()}` });
      setAlerts((current) => [normalized, ...current]);
      setFormState(initialFormState);
      setErrors({});
      setShowCreateModal(false);
      setToastState({ open: true, message: 'Cảnh báo đã được tạo', sub: 'Cảnh báo mới đã được thêm vào danh sách và sẵn sàng theo dõi.' });
    } catch (error) {
      setToastState({ open: true, message: 'Không thể tạo cảnh báo', sub: error?.message || 'Vui lòng thử lại sau.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 text-slate-800">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_45%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#334155_100%)] p-6 text-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.8)] sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex max-w-max items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-slate-100 backdrop-blur-sm">
              <Lucide.AlertTriangle size={14} />
              Quản lý cảnh báo khu vực
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-[-0.025em] text-white sm:text-3xl">Theo dõi và phát hành cảnh báo cho khu vực đang quan tâm</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Quản lý danh sách cảnh báo theo mức độ ưu tiên và cập nhật thông tin cho từng khu vực một cách trực quan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] bg-white px-4 py-2.5 text-sm font-black text-slate-900 shadow-[0_10px_30px_-12px_rgba(255,255,255,0.7)] transition hover:bg-slate-100"
          >
            <Lucide.PlusCircle size={16} />
            Tạo cảnh báo
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SEVERITY_OPTIONS.map((severity) => (
          <div key={severity} className="rounded-[1.35rem] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.32)]">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{severity}</div>
            <div className="mt-2 text-2xl font-black tracking-[-0.02em] text-slate-900">{summary[severity] || 0}</div>
            <div className="mt-1 text-sm text-slate-500">Cảnh báo {severity.toLowerCase()}</div>
          </div>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.32)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-lg font-black tracking-[-0.02em] text-slate-900">Danh sách cảnh báo</h2>
            <p className="mt-1 text-sm text-slate-500">Thông tin được sắp xếp theo mức ưu tiên để dễ theo dõi.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600">
            {alerts.length} mục
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((value) => (
              <div key={value} className="animate-pulse rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-7 w-24 rounded-full bg-slate-200" />
                  <div className="h-7 w-24 rounded-full bg-slate-200" />
                  <div className="h-7 w-24 rounded-full bg-slate-200" />
                </div>
                <div className="mt-4 h-4 w-2/3 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-200" />
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((cell) => (
                    <div key={cell} className="h-16 rounded-[1.1rem] border border-slate-200 bg-white" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : canShowEmptyState ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <Lucide.BellOff className="text-slate-500" size={20} />
            </div>
            <h3 className="mt-4 text-lg font-black tracking-[-0.02em] text-slate-900">Chưa có cảnh báo nào</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
              Tạo cảnh báo đầu tiên để truyền tín hiệu cho khu vực liên quan và giúp đội ngũ phản ứng nhanh hơn.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <article key={alert.id} className="rounded-[1.4rem] border border-slate-200/80 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_42px_-24px_rgba(15,23,42,0.45)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border border-transparent px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] shadow-sm ${getSeverityBadgeClasses(alert.severity)}`}>
                        {alert.severity || 'Medium'}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {alert.alertType || 'Area Alert'}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {alert.status || 'Active'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-[-0.02em] text-slate-900">{alert.title}</h3>
                      <p className="mt-1 text-sm leading-7 text-slate-600">{alert.message}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Khu vực</div>
                        <div className="mt-1 font-semibold text-slate-700">{alert.areaName || alert.area || '—'}</div>
                      </div>
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Danh mục</div>
                        <div className="mt-1 font-semibold text-slate-700">{alert.categoryName || alert.category || '—'}</div>
                      </div>
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Bắt đầu</div>
                        <div className="mt-1 font-semibold text-slate-700">{formatDateTime(alert.startAt)}</div>
                      </div>
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Kết thúc</div>
                        <div className="mt-1 font-semibold text-slate-700">{formatDateTime(alert.endAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Tạo cảnh báo khu vực</h2>
                <p className="mt-1 text-sm text-slate-500">Điền thông tin dưới đây để kích hoạt cảnh báo mới cho khu vực.</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng cửa sổ">
                <Lucide.X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Khu vực <span className="text-rose-500">*</span></span>
                  <input value={formState.area} onChange={(event) => handleFieldChange('area', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" placeholder="Ví dụ: Khu vực A" />
                  {errors.area && <span className="text-xs font-medium text-rose-600">{errors.area}</span>}
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Danh mục</span>
                  <input value={formState.category} onChange={(event) => handleFieldChange('category', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" placeholder="Ví dụ: Môi trường" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Hotspot</span>
                  <input value={formState.hotspot} onChange={(event) => handleFieldChange('hotspot', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" placeholder="Ví dụ: Điểm đèn đỏ" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Mức độ nghiêm trọng <span className="text-rose-500">*</span></span>
                  <select value={formState.severity} onChange={(event) => handleFieldChange('severity', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400">
                    {SEVERITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {errors.severity && <span className="text-xs font-medium text-rose-600">{errors.severity}</span>}
                </label>
              </div>

              <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Thông tin cảnh báo</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                    <span>Tiêu đề <span className="text-rose-500">*</span></span>
                    <input value={formState.title} onChange={(event) => handleFieldChange('title', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-400" placeholder="Nhập tiêu đề cảnh báo" />
                    {errors.title && <span className="text-xs font-medium text-rose-600">{errors.title}</span>}
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                    <span>Nội dung <span className="text-rose-500">*</span></span>
                    <textarea value={formState.message} onChange={(event) => handleFieldChange('message', event.target.value)} rows={4} className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-400" placeholder="Mô tả cảnh báo chi tiết" />
                    {errors.message && <span className="text-xs font-medium text-rose-600">{errors.message}</span>}
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Vĩ độ</span>
                  <input type="number" value={formState.latitude} onChange={(event) => handleFieldChange('latitude', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" placeholder="10.762" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Kinh độ</span>
                  <input type="number" value={formState.longitude} onChange={(event) => handleFieldChange('longitude', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" placeholder="106.660" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Bán kính (m)</span>
                  <input type="number" value={formState.radiusMeters} onChange={(event) => handleFieldChange('radiusMeters', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" placeholder="250" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Thời gian bắt đầu <span className="text-rose-500">*</span></span>
                  <input type="datetime-local" value={formState.startAt} onChange={(event) => handleFieldChange('startAt', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" />
                  {errors.startAt && <span className="text-xs font-medium text-rose-600">{errors.startAt}</span>}
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>Thời gian kết thúc</span>
                <input type="datetime-local" value={formState.endAt} onChange={(event) => handleFieldChange('endAt', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-[1rem] border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Hủy</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {submitting ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={16} />}
                  {submitting ? 'Đang tạo...' : 'Tạo cảnh báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DelightToast open={toastState.open} message={toastState.message} sub={toastState.sub} onClose={() => setToastState({ open: false, message: '', sub: '' })} />
    </div>
  );
};

export default AreaAlertManagementPage;
