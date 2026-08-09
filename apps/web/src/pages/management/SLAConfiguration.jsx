import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { slaApi } from '../../services/api/slaApi';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminRefreshIndicator,
} from '../../components/admin/AdminDataStates';
import { getCategoryLabel } from '../../utils/categoryLabels';

const PRIORITIES = [
  { value: 'Critical', label: 'Khẩn cấp', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  { value: 'High', label: 'Cao', className: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
  { value: 'Medium', label: 'Trung bình', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { value: 'Low', label: 'Thấp', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
];

const EMPTY_FORM = {
  policyName: '', areaId: '', categoryId: '', priority: 'Medium',
  responseTimeMinutes: '60', resolutionTimeMinutes: '1440',
  effectiveFrom: '', effectiveTo: '', isActive: true,
};

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const formatDate = (value) => {
  if (!value) return 'Không giới hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatMinutes = (value) => {
  const minutes = Number(value || 0);
  if (minutes < 60) return `${minutes} phút`;
  if (minutes % 1440 === 0) return `${minutes / 1440} ngày`;
  if (minutes % 60 === 0) return `${minutes / 60} giờ`;
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
};

const getPriority = (value) => PRIORITIES.find((item) => item.value === value) || PRIORITIES[2];
const getErrorMessage = (error, fallback) => error?.response?.data?.msg || error?.response?.data?.message || error?.message || fallback;

const normalizeForm = (policy) => policy ? {
  policyName: policy.policyName || '',
  areaId: policy.areaId ?? '',
  categoryId: policy.categoryId ?? '',
  priority: policy.priority || 'Medium',
  responseTimeMinutes: String(policy.responseTimeMinutes ?? ''),
  resolutionTimeMinutes: String(policy.resolutionTimeMinutes ?? ''),
  effectiveFrom: toLocalInput(policy.effectiveFrom),
  effectiveTo: toLocalInput(policy.effectiveTo),
  isActive: Boolean(policy.isActive),
} : { ...EMPTY_FORM, effectiveFrom: toLocalInput(new Date()) };

const buildPayload = (form) => ({
  policyName: form.policyName.trim(),
  areaId: form.areaId === '' ? null : Number(form.areaId),
  categoryId: form.categoryId === '' ? null : Number(form.categoryId),
  priority: form.priority,
  responseTimeMinutes: Number(form.responseTimeMinutes),
  resolutionTimeMinutes: Number(form.resolutionTimeMinutes),
  effectiveFrom: new Date(form.effectiveFrom).toISOString(),
  effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : null,
  isActive: Boolean(form.isActive),
});

const PolicySkeleton = () => (
  <div className="space-y-3" role="status">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
    ))}
    <span className="sr-only">Đang tải chính sách SLA</span>
  </div>
);

export const SLAConfiguration = () => {
  const [policies, setPolicies] = useState([]);
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ priority: '', areaId: '', categoryId: '', isActive: '', isCurrentlyEffective: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [form, setForm] = useState(() => normalizeForm(null));
  const [initialForm, setInitialForm] = useState(() => normalizeForm(null));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadLookups = useCallback(async () => {
    const [nextAreas, nextCategories] = await Promise.all([slaApi.getAreas(), slaApi.getCategories()]);
    setAreas(Array.isArray(nextAreas) ? nextAreas : []);
    setCategories(Array.isArray(nextCategories) ? nextCategories : []);
  }, []);

  const loadPolicies = useCallback(async ({ keepCurrent = false } = {}) => {
    keepCurrent ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await slaApi.getPolicies({
        search: debouncedSearch,
        priority: filters.priority,
        areaId: filters.areaId,
        categoryId: filters.categoryId,
        isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
        isCurrentlyEffective: filters.isCurrentlyEffective === '' ? undefined : filters.isCurrentlyEffective === 'true',
        pageNumber: page,
        pageSize: 10,
      });
      const items = Array.isArray(response?.items) ? response.items : [];
      setPolicies(items);
      setPagination({
        totalItems: Number(response?.totalItems ?? items.length),
        totalPages: Number(response?.totalPages ?? 0),
        hasPreviousPage: Boolean(response?.hasPreviousPage),
        hasNextPage: Boolean(response?.hasNextPage),
      });
    } catch {
      if (!keepCurrent) setPolicies([]);
      setError('Không thể tải chính sách SLA. Vui lòng thử lại sau hoặc liên hệ quản trị hệ thống.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, filters, page]);


  const loadDashboardOverview = useCallback(async () => {
    try {
      const response = await slaApi.getDashboardOverview();
      setDashboardOverview(response || null);
    } catch {
      setDashboardOverview(null);
    }
  }, []);

  useEffect(() => { loadLookups().catch(() => {}); }, [loadLookups]);
  useEffect(() => { loadDashboardOverview(); }, [loadDashboardOverview]);
  useEffect(() => { loadPolicies({ keepCurrent: policies.length > 0 }); }, [loadPolicies]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [modalOpen]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!modalOpen || !isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty, modalOpen]);

  const openModal = (policy = null) => {
    const next = normalizeForm(policy);
    setEditingPolicy(policy);
    setForm(next);
    setInitialForm(next);
    setFormError('');
    setModalOpen(true);
  };

  const requestCloseModal = () => {
    if (isDirty && !window.confirm('Các thay đổi chưa được lưu sẽ bị mất. Bạn vẫn muốn đóng?')) return;
    setModalOpen(false);
  };

  const handleRefresh = () => {
    if (modalOpen && isDirty && !window.confirm('Làm mới sẽ bỏ các thay đổi chưa lưu. Bạn vẫn muốn tiếp tục?')) return;
    if (modalOpen) setModalOpen(false);
    loadPolicies({ keepCurrent: policies.length > 0 });
    loadDashboardOverview();
  };

  const validateForm = () => {
    if (!form.policyName.trim()) return 'Vui lòng nhập tên chính sách.';
    if (!form.effectiveFrom) return 'Vui lòng chọn ngày bắt đầu hiệu lực.';
    if (Number(form.responseTimeMinutes) <= 0) return 'Thời gian phản hồi phải lớn hơn 0 phút.';
    if (Number(form.resolutionTimeMinutes) < Number(form.responseTimeMinutes)) return 'Thời gian hoàn thành phải lớn hơn hoặc bằng thời gian phản hồi.';
    if (form.effectiveTo && new Date(form.effectiveTo) <= new Date(form.effectiveFrom)) return 'Ngày kết thúc phải sau ngày bắt đầu.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateForm();
    if (validation) { setFormError(validation); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = buildPayload(form);
      if (editingPolicy?.slaPolicyId) await slaApi.updatePolicy(editingPolicy.slaPolicyId, payload);
      else await slaApi.createPolicy(payload);
      setModalOpen(false);
      setMessage({ type: 'success', text: editingPolicy ? 'Đã cập nhật chính sách SLA.' : 'Đã tạo chính sách SLA.' });
      await loadPolicies({ keepCurrent: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không thể lưu chính sách SLA.'));
    } finally { setSaving(false); }
  };

  const toggleActive = async (policy) => {
    try {
      await slaApi.setPolicyActive(policy.slaPolicyId, !policy.isActive);
      setMessage({ type: 'success', text: policy.isActive ? 'Đã ngừng kích hoạt chính sách.' : 'Đã kích hoạt chính sách.' });
      loadPolicies({ keepCurrent: true });
    } catch (err) { setMessage({ type: 'error', text: getErrorMessage(err, 'Không thể đổi trạng thái chính sách.') }); }
  };

  const removePolicy = async (policy) => {
    if (!window.confirm(`Xóa chính sách “${policy.policyName}”? Chính sách đã được sử dụng có thể không thể xóa.`)) return;
    try {
      await slaApi.deletePolicy(policy.slaPolicyId);
      setMessage({ type: 'success', text: 'Đã xóa chính sách SLA.' });
      loadPolicies({ keepCurrent: true });
    } catch (err) { setMessage({ type: 'error', text: getErrorMessage(err, 'Không thể xóa chính sách SLA.') }); }
  };

  return (
    <div className="admin-page-shell space-y-6">
      {message.type === 'success' && <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}
      {message.type === 'error' && <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}

      <section className="admin-page-hero">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="admin-hero-icon"><Lucide.TimerReset size={22} /></div>
            <div>
              <h2 className="admin-hero-title">Chính sách SLA</h2>
              <p className="admin-hero-description">Quy định hạn phản hồi và hoàn thành theo khu vực, danh mục và mức ưu tiên.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleRefresh} className="admin-secondary-action btn rounded-xl"><Lucide.RefreshCw size={17} /> Làm mới</button>
            <button type="button" onClick={() => openModal()} className="admin-primary-action btn rounded-xl border-0"><Lucide.Plus size={18} /> Tạo chính sách</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['Tổng SLA', dashboardOverview?.totalSla ?? '—', Lucide.ListChecks],
          ['Đang chạy', dashboardOverview?.runningSla ?? '—', Lucide.Activity],
          [
            'Tỷ lệ thành công',
            dashboardOverview?.successRate != null ? `${dashboardOverview.successRate}%` : '—',
            Lucide.BadgeCheck,
          ],
        ].map(([label, value, Icon]) => (
          <div key={label} className="admin-stat-card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">{value}</p></div><div className="admin-mini-icon"><Icon size={19} /></div></div></div>
        ))}
      </section>

      <section className="admin-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="form-control flex-1"><span className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Tìm kiếm</span><div className="relative"><Lucide.Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="input input-bordered h-11 w-full rounded-xl pl-10" placeholder="Tên chính sách SLA..." /></div></label>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <select value={filters.priority} onChange={(e) => { setFilters((v) => ({ ...v, priority: e.target.value })); setPage(1); }} className="select select-bordered h-11 rounded-xl"><option value="">Tất cả ưu tiên</option>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select value={filters.areaId} onChange={(e) => { setFilters((v) => ({ ...v, areaId: e.target.value })); setPage(1); }} className="select select-bordered h-11 rounded-xl"><option value="">Mọi khu vực</option>{areas.map((item) => <option key={item.areaId ?? item.id} value={item.areaId ?? item.id}>{item.areaName || item.name}</option>)}</select>
            <select value={filters.categoryId} onChange={(e) => { setFilters((v) => ({ ...v, categoryId: e.target.value })); setPage(1); }} className="select select-bordered h-11 rounded-xl"><option value="">Mọi danh mục</option>{categories.map((item) => <option key={item.categoryId ?? item.id} value={item.categoryId ?? item.id}>{getCategoryLabel(item.categoryName || item.name)}</option>)}</select>
            <select value={filters.isActive} onChange={(e) => { setFilters((v) => ({ ...v, isActive: e.target.value })); setPage(1); }} className="select select-bordered h-11 rounded-xl"><option value="">Mọi trạng thái</option><option value="true">Đang bật</option><option value="false">Đã tắt</option></select>
            <select value={filters.isCurrentlyEffective} onChange={(e) => { setFilters((v) => ({ ...v, isCurrentlyEffective: e.target.value })); setPage(1); }} className="select select-bordered h-11 rounded-xl"><option value="">Mọi hiệu lực</option><option value="true">Đang có hiệu lực</option><option value="false">Chưa/đã hết hiệu lực</option></select>
          </div>
        </div>
        <div className="mt-4"><AdminRefreshIndicator visible={refreshing} label="Đang đồng bộ chính sách..." /></div>
      </section>

      <section className="admin-panel overflow-hidden">
        {loading ? <div className="p-6"><PolicySkeleton /></div> : error && policies.length === 0 ? <AdminErrorState description={error} onRetry={() => loadPolicies()} /> : policies.length === 0 ? <AdminEmptyState icon={Lucide.TimerOff} title="Chưa có chính sách phù hợp" description="Thử đổi bộ lọc hoặc tạo chính sách SLA đầu tiên." /> : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead><tr><th>Chính sách</th><th>Phạm vi áp dụng</th><th>Ưu tiên</th><th>Cam kết thời gian</th><th>Hiệu lực</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
              <tbody>{policies.map((policy) => { const priority = getPriority(policy.priority); return (
                <tr key={policy.slaPolicyId} className="hover:bg-blue-50/50 dark:hover:bg-blue-500/5">
                  <td><div className="font-semibold text-slate-950 dark:text-slate-100">{policy.policyName || `Chính sách #${policy.slaPolicyId}`}</div><div className="mt-1 text-xs text-slate-400">Mã #{policy.slaPolicyId}</div></td>
                  <td><div>{policy.areaName || 'Tất cả khu vực'}</div><div className="mt-1 text-xs text-slate-500">{getCategoryLabel(policy.categoryName, 'Tất cả danh mục')}</div></td>
                  <td><span className={`badge border-0 font-semibold ${priority.className}`}>{priority.label}</span></td>
                  <td><div className="text-sm"><span className="font-semibold">Phản hồi:</span> {formatMinutes(policy.responseTimeMinutes)}</div><div className="mt-1 text-sm"><span className="font-semibold">Hoàn thành:</span> {formatMinutes(policy.resolutionTimeMinutes)}</div></td>
                  <td><div className="text-sm">Từ {formatDate(policy.effectiveFrom)}</div><div className="mt-1 text-xs text-slate-500">Đến {formatDate(policy.effectiveTo)}</div></td>
                  <td><div className="flex flex-col items-start gap-1"><span className={`badge border-0 ${policy.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{policy.isActive ? 'Đang bật' : 'Đã tắt'}</span>{policy.isCurrentlyEffective && <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">Đang có hiệu lực</span>}</div></td>
                  <td><div className="flex justify-end gap-1"><button type="button" onClick={() => openModal(policy)} className="btn btn-ghost btn-sm rounded-lg" aria-label="Chỉnh sửa"><Lucide.Pencil size={16} /></button><button type="button" onClick={() => toggleActive(policy)} className="btn btn-ghost btn-sm rounded-lg" aria-label={policy.isActive ? 'Ngừng kích hoạt' : 'Kích hoạt'}>{policy.isActive ? <Lucide.PauseCircle size={16} /> : <Lucide.PlayCircle size={16} />}</button><button type="button" onClick={() => removePolicy(policy)} className="btn btn-ghost btn-sm rounded-lg text-rose-600" aria-label="Xóa"><Lucide.Trash2 size={16} /></button></div></td>
                </tr>); })}</tbody>
            </table>
          </div>
        )}
        {!loading && pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-white/10"><p className="text-sm text-slate-500">Trang {page}/{pagination.totalPages} · {pagination.totalItems} chính sách</p><div className="flex gap-2"><button type="button" disabled={!pagination.hasPreviousPage} onClick={() => setPage((v) => Math.max(1, v - 1))} className="btn btn-sm rounded-xl"><Lucide.ChevronLeft size={16} /> Trước</button><button type="button" disabled={!pagination.hasNextPage} onClick={() => setPage((v) => v + 1)} className="btn btn-sm rounded-xl">Sau <Lucide.ChevronRight size={16} /></button></div></div>}
      </section>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) requestCloseModal(); }}>
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-white/10"><div><h3 className="text-lg font-semibold text-slate-950 dark:text-slate-100">{editingPolicy ? 'Cập nhật chính sách SLA' : 'Tạo chính sách SLA'}</h3><p className="mt-1 text-sm text-slate-500">Thiết lập phạm vi và hai mốc thời gian cam kết.</p></div><button type="button" onClick={requestCloseModal} className="btn btn-ghost btn-sm btn-circle"><Lucide.X size={18} /></button></div>
            <form id="sla-policy-form" onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {formError && <ErrorAlert message={formError} onClose={() => setFormError('')} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-control sm:col-span-2"><span className="mb-2 text-sm font-semibold">Tên chính sách *</span><input value={form.policyName} onChange={(e) => setForm((v) => ({ ...v, policyName: e.target.value }))} className="input input-bordered h-11 rounded-xl" placeholder="Ví dụ: SLA chiếu sáng đô thị mức cao" /></label>
                <label className="form-control"><span className="mb-2 text-sm font-semibold">Khu vực</span><select value={form.areaId} onChange={(e) => setForm((v) => ({ ...v, areaId: e.target.value }))} className="select select-bordered h-11 rounded-xl"><option value="">Tất cả khu vực</option>{areas.map((item) => <option key={item.areaId ?? item.id} value={item.areaId ?? item.id}>{item.areaName || item.name}</option>)}</select></label>
                <label className="form-control"><span className="mb-2 text-sm font-semibold">Danh mục</span><select value={form.categoryId} onChange={(e) => setForm((v) => ({ ...v, categoryId: e.target.value }))} className="select select-bordered h-11 rounded-xl"><option value="">Tất cả danh mục</option>{categories.map((item) => <option key={item.categoryId ?? item.id} value={item.categoryId ?? item.id}>{getCategoryLabel(item.categoryName || item.name)}</option>)}</select></label>
                <label className="form-control"><span className="mb-2 text-sm font-semibold">Mức ưu tiên *</span><select value={form.priority} onChange={(e) => setForm((v) => ({ ...v, priority: e.target.value }))} className="select select-bordered h-11 rounded-xl">{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <div />
                <label className="form-control"><span className="mb-2 text-sm font-semibold">Thời gian phản hồi (phút) *</span><input type="number" min="1" value={form.responseTimeMinutes} onChange={(e) => setForm((v) => ({ ...v, responseTimeMinutes: e.target.value }))} className="input input-bordered h-11 rounded-xl" /></label>
                <label className="form-control"><span className="mb-2 text-sm font-semibold">Thời gian hoàn thành (phút) *</span><input type="number" min="1" value={form.resolutionTimeMinutes} onChange={(e) => setForm((v) => ({ ...v, resolutionTimeMinutes: e.target.value }))} className="input input-bordered h-11 rounded-xl" /></label>
                <label className="form-control"><span className="mb-2 text-sm font-semibold">Bắt đầu hiệu lực *</span><input type="datetime-local" value={form.effectiveFrom} onChange={(e) => setForm((v) => ({ ...v, effectiveFrom: e.target.value }))} className="input input-bordered h-11 rounded-xl" /></label>
                <label className="form-control"><span className="mb-2 text-sm font-semibold">Kết thúc hiệu lực</span><input type="datetime-local" value={form.effectiveTo} onChange={(e) => setForm((v) => ({ ...v, effectiveTo: e.target.value }))} className="input input-bordered h-11 rounded-xl" /></label>
                <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((v) => ({ ...v, isActive: e.target.checked }))} className="checkbox checkbox-primary" /><span><span className="block text-sm font-semibold">Kích hoạt chính sách</span><span className="mt-1 block text-xs text-slate-500">Chính sách chỉ được hệ thống lựa chọn khi đang bật và nằm trong thời gian hiệu lực.</span></span></label>
              </div>
            </form>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10"><p className={`text-xs ${isDirty ? 'font-semibold text-amber-600' : 'text-slate-400'}`}>{isDirty ? 'Có thay đổi chưa lưu' : 'Chưa có thay đổi'}</p><div className="flex gap-2"><button type="button" onClick={requestCloseModal} className="btn rounded-xl">Hủy</button><button type="submit" form="sla-policy-form" disabled={saving || !isDirty} className="admin-primary-action btn rounded-xl border-0">{saving ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={17} />} Lưu chính sách</button></div></div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};
