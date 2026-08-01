import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { APP_ROLES } from '@urbanmind/shared-types';
import { toolsApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeRole } from '../../utils/roleMap';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import { clearCoordinatorDirectoryCache } from '../../services/cache/adminCoordinatorDirectoryCache';

const EMPTY_COORDINATOR = {
  providerName: '', coordinatorName: '', phoneNumber: '', email: '', address: '', note: '',
};
const EMPTY_COVERAGE = { areaId: '', categoryId: '', isPrimary: false, priorityOrder: 1, isActive: true };

const unwrapList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  return [];
};
const unwrapItem = (value) => value?.data ?? value?.item ?? value?.result ?? value ?? null;
const translateApiMessage = (message, fallback) => {
  if (!message) return fallback;
  const normalized = String(message).toLowerCase();
  if (normalized.includes('phonenumber')) return 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.';
  if (normalized.includes('coordinatorname')) return 'Vui lòng nhập tên người phụ trách.';
  if (normalized.includes('providername')) return 'Vui lòng nhập tên đơn vị cung cấp.';
  return message;
};
const getErrorMessage = (error, fallback) => translateApiMessage(error?.response?.data?.message || error?.response?.data?.msg || error?.message, fallback);

function FieldHint({ message }) {
  if (!message) return null;
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <Lucide.CircleAlert size={15} className="cursor-help text-rose-500" aria-label={message} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
        {message}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}

export default function CoordinatorDetailPage() {
  const { coordinatorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const canManage = role === APP_ROLES.ADMINISTRATOR || role === APP_ROLES.INTERACTION_MANAGER;

  const [item, setItem] = useState(null);
  const [form, setForm] = useState(EMPTY_COORDINATOR);
  const [originalForm, setOriginalForm] = useState(EMPTY_COORDINATOR);
  const [coverages, setCoverages] = useState([]);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [coverageForm, setCoverageForm] = useState(EMPTY_COVERAGE);
  const [editingCoverageId, setEditingCoverageId] = useState(null);
  const [coverageSaving, setCoverageSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const loadData = useCallback(async () => {
    if (!coordinatorId) return;
    setLoading(true);
    setError('');
    try {
      const [detailResult, coverageResult] = await Promise.all([
        managementFeedbackApi.getServiceProviderDetail(coordinatorId),
        managementFeedbackApi.getCoordinatorCoverages(coordinatorId),
      ]);
      const detail = unwrapItem(detailResult);
      setItem(detail);
      const nextForm = {
        providerName: detail?.providerName || '',
        coordinatorName: detail?.coordinatorName || detail?.name || '',
        phoneNumber: String(detail?.phoneNumber || detail?.phone || '').replace(/\D/g, '').slice(0, 10),
        email: detail?.email || '',
        address: detail?.address || '',
        note: detail?.note || '',
      };
      setForm(nextForm);
      setOriginalForm(nextForm);
      setSubmitted(false);
      setCoverages(unwrapList(coverageResult));
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải thông tin điều phối viên.'));
    } finally {
      setLoading(false);
    }
  }, [coordinatorId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    Promise.allSettled([toolsApi.getAreas(), toolsApi.getCategories()]).then(([areaResult, categoryResult]) => {
      setAreas(areaResult.status === 'fulfilled' ? unwrapList(areaResult.value) : []);
      setCategories(categoryResult.status === 'fulfilled' ? unwrapList(categoryResult.value) : []);
    });
  }, []);

  const activeCoverages = useMemo(() => coverages.filter((coverage) => coverage.isActive).length, [coverages]);
  const validation = useMemo(() => ({
    providerName: form.providerName.trim() ? '' : 'Vui lòng nhập tên đơn vị cung cấp.',
    coordinatorName: form.coordinatorName.trim() ? '' : 'Vui lòng nhập tên người phụ trách.',
    phoneNumber: !form.phoneNumber.trim()
      ? 'Vui lòng nhập số điện thoại.'
      : !/^0\d{9}$/.test(form.phoneNumber)
        ? 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.'
        : '',
  }), [form.coordinatorName, form.phoneNumber, form.providerName]);
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(originalForm), [form, originalForm]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty || saving) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saving]);

  const updateForm = (field, value) => {
    const nextValue = field === 'phoneNumber' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setForm((current) => ({ ...current, [field]: nextValue }));
    if (message.type === 'error') setMessage({ type: '', text: '' });
  };
  const updateCoverageForm = (field, value) => setCoverageForm((current) => ({ ...current, [field]: value }));

  const saveCoordinator = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    const firstInvalidField = Object.keys(validation).find((field) => validation[field]);
    if (firstInvalidField) {
      setMessage({ type: 'error', text: 'Vui lòng kiểm tra lại các trường được đánh dấu.' });
      requestAnimationFrame(() => document.querySelector(`[name="${firstInvalidField}"]`)?.focus());
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await managementFeedbackApi.updateServiceProvider(coordinatorId, {
        providerName: form.providerName.trim(), coordinatorName: form.coordinatorName.trim(),
        phoneNumber: form.phoneNumber.trim(), email: form.email.trim(), address: form.address.trim(), note: form.note.trim(),
      });
      const updated = unwrapItem(response) || { ...item, ...form };
      setItem((current) => ({ ...current, ...updated }));
      setOriginalForm({ ...form });
      setSubmitted(false);
      clearCoordinatorDirectoryCache();
      setMessage({ type: 'success', text: 'Đã cập nhật điều phối viên.' });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Không thể cập nhật điều phối viên.') });
    } finally { setSaving(false); }
  };

  const toggleActive = async () => {
    const nextActive = !item?.isActive;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await managementFeedbackApi.setServiceProviderActive(coordinatorId, nextActive);
      const updated = unwrapItem(response);
      setItem((current) => ({ ...current, ...updated, isActive: updated?.isActive ?? nextActive }));
      clearCoordinatorDirectoryCache();
      setMessage({ type: 'success', text: nextActive ? 'Đã kích hoạt điều phối viên.' : 'Đã vô hiệu hóa điều phối viên.' });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Không thể thay đổi trạng thái.') });
    } finally { setSaving(false); }
  };

  const leaveDetail = () => navigate('/management/coordinators', { state: { restoreCoordinatorList: true } });
  const goBack = () => {
    if (isDirty && !saving) {
      setShowLeaveConfirm(true);
      return;
    }
    leaveDetail();
  };

  const openNewCoverage = () => {
    setEditingCoverageId(null);
    setCoverageForm(EMPTY_COVERAGE);
    setShowCoverageModal(true);
  };
  const openEditCoverage = (coverage) => {
    setEditingCoverageId(coverage.coverageId ?? coverage.id);
    setCoverageForm({
      areaId: String(coverage.areaId ?? coverage.area?.areaId ?? ''),
      categoryId: String(coverage.categoryId ?? coverage.category?.categoryId ?? ''),
      isPrimary: Boolean(coverage.isPrimary),
      priorityOrder: Number(coverage.priorityOrder ?? coverage.priority ?? 1),
      isActive: coverage.isActive !== false,
    });
    setShowCoverageModal(true);
  };

  const saveCoverage = async (event) => {
    event.preventDefault();
    if (!coverageForm.areaId || !coverageForm.categoryId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn khu vực và danh mục.' });
      return;
    }
    setCoverageSaving(true);
    setMessage({ type: '', text: '' });
    const payload = {
      areaId: Number(coverageForm.areaId), categoryId: Number(coverageForm.categoryId),
      isPrimary: Boolean(coverageForm.isPrimary), priorityOrder: Number(coverageForm.priorityOrder) || 1,
      ...(editingCoverageId ? { isActive: Boolean(coverageForm.isActive) } : {}),
    };
    try {
      if (editingCoverageId) {
        await managementFeedbackApi.updateCoordinatorCoverage(coordinatorId, editingCoverageId, payload);
      } else {
        await managementFeedbackApi.createCoordinatorCoverage(coordinatorId, payload);
      }
      setShowCoverageModal(false);
      clearCoordinatorDirectoryCache();
      await loadData();
      setMessage({ type: 'success', text: editingCoverageId ? 'Đã cập nhật phạm vi phụ trách.' : 'Đã thêm phạm vi phụ trách.' });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Không thể lưu phạm vi phụ trách.') });
    } finally { setCoverageSaving(false); }
  };

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><span className="loading loading-spinner loading-lg text-blue-600" /></div>;
  if (error) return <div className="space-y-4 p-4"><ErrorAlert title="Lỗi tải chi tiết" message={error} /><button onClick={loadData} className="btn btn-primary">Thử lại</button></div>;
  if (!item) return <div className="p-6 text-center"><h2 className="text-xl font-bold">Không tìm thấy điều phối viên</h2><button onClick={() => navigate('/management/coordinators', { state: { restoreCoordinatorList: true } })} className="btn btn-ghost mt-4">Quay lại</button></div>;

  return (
    <div className="admin-page-shell space-y-6">
      <section className="admin-page-hero">
        <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"><Lucide.ArrowLeft size={17} /> Quay lại danh sách</button>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white"><Lucide.Building2 size={26} /></div>
            <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">{item.providerName || '—'}</h1><span className={`badge border-0 font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{item.isActive ? 'Đang hoạt động' : 'Đã tắt'}</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Người phụ trách: <strong className="font-semibold text-slate-700 dark:text-slate-200">{item.coordinatorName || item.name || '—'}</strong></p></div>
          </div>
          {canManage && <button type="button" onClick={toggleActive} disabled={saving} className={`btn rounded-2xl border-0 ${item.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{item.isActive ? <Lucide.PowerOff size={17} /> : <Lucide.Power size={17} />}{item.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</button>}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-900/80"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phạm vi phụ trách</div><div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{coverages.length}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-900/80"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phạm vi đang hoạt động</div><div className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{activeCoverages}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-900/80"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phạm vi chính</div><div className="mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-300">{coverages.filter((coverage) => coverage.isPrimary).length}</div></div>
        </div>
      </section>

      {message.text && <div className={`rounded-2xl border p-4 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'}`}>{message.text}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <form onSubmit={saveCoordinator} className="admin-panel p-5 sm:p-6 dark:border-slate-700 dark:bg-slate-950/70">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Thông tin điều phối viên</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Thông tin đơn vị và người phụ trách.</p></div><Lucide.Contact size={22} className="text-blue-600 dark:text-blue-400" /></div>
          <div className="mt-6 space-y-4">
            {[
              ['providerName', 'Tên đơn vị cung cấp', true],
              ['coordinatorName', 'Tên người phụ trách', true],
            ].map(([field, label, required]) => (
              <label key={field} className="block">
                <span className="mb-2 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">{label}{required ? ' *' : ''}{submitted && <FieldHint message={validation[field]} />}</span>
                <input name={field} type="text" disabled={!canManage} value={form[field]} onChange={(event) => updateForm(field, event.target.value)} aria-invalid={submitted && Boolean(validation[field])} className={`input input-bordered w-full rounded-xl font-normal ${submitted && validation[field] ? 'border-rose-300 bg-rose-50/50 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700'} bg-white text-slate-900 focus:border-blue-500 focus:outline-none dark:bg-slate-950/70 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-900`} />
              </label>
            ))}
            <label className="block">
              <span className="mb-2 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">Số điện thoại *{submitted && <FieldHint message={validation.phoneNumber} />}</span>
              <input name="phoneNumber" type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} disabled={!canManage} value={form.phoneNumber} onChange={(event) => updateForm('phoneNumber', event.target.value)} aria-invalid={submitted && Boolean(validation.phoneNumber)} className={`input input-bordered w-full rounded-xl font-normal tabular-nums ${submitted && validation.phoneNumber ? 'border-rose-300 bg-rose-50/50 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700'} bg-white text-slate-900 focus:border-blue-500 focus:outline-none dark:bg-slate-950/70 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-900`} placeholder="Ví dụ: 0912345678" />
            </label>
            <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</span><input type="email" disabled={!canManage} value={form.email} onChange={(event) => updateForm('email', event.target.value)} className="input input-bordered w-full rounded-xl border-slate-200 bg-white font-normal text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-900" /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Địa chỉ</span><input type="text" disabled={!canManage} value={form.address} onChange={(event) => updateForm('address', event.target.value)} className="input input-bordered w-full rounded-xl border-slate-200 bg-white font-normal text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-900" /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Ghi chú</span><textarea disabled={!canManage} value={form.note} onChange={(event) => updateForm('note', event.target.value)} className="textarea textarea-bordered min-h-24 w-full rounded-xl border-slate-200 bg-white font-normal text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-900" /></label>
          </div>
          {canManage && <button type="submit" disabled={saving} className="btn mt-6 h-11 w-full rounded-xl border-0 bg-blue-600 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">{saving ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={17} />} Lưu thay đổi</button>}
        </form>

        <section className="admin-panel p-5 sm:p-6 dark:border-slate-700 dark:bg-slate-950/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Phạm vi phụ trách</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Chỉ điều phối viên có phạm vi đang hoạt động khớp khu vực và danh mục mới xuất hiện trong danh sách đề xuất xử lý.</p></div>{canManage && <button type="button" onClick={openNewCoverage} className="btn rounded-2xl border-0 bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"><Lucide.Plus size={17} /> Thêm phạm vi</button>}</div>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="table w-full text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400"><tr><th>Khu vực</th><th>Danh mục</th><th>Ưu tiên</th><th>Trạng thái</th>{canManage && <th />}</tr></thead>
              <tbody>
                {coverages.length === 0 ? <tr><td colSpan={canManage ? 5 : 4} className="py-12 text-center text-slate-500">Chưa có phạm vi phụ trách. Điều phối viên này chưa thể được đề xuất theo khu vực và danh mục.</td></tr> : coverages.map((coverage) => {
                  const id = coverage.coverageId ?? coverage.id;
                  return <tr key={id}><td><div className="font-semibold text-slate-900 dark:text-slate-100">{coverage.areaName ?? coverage.area?.name ?? '—'}</div><div className="text-xs text-slate-400 dark:text-slate-500">ID {coverage.areaId ?? coverage.area?.areaId ?? '—'}</div></td><td><div className="font-medium text-slate-800 dark:text-slate-200">{coverage.categoryName ?? coverage.category?.name ?? '—'}</div><div className="text-xs text-slate-400 dark:text-slate-500">ID {coverage.categoryId ?? coverage.category?.categoryId ?? '—'}</div></td><td><div className="flex items-center gap-2"><span className="font-semibold text-slate-900 dark:text-slate-100">{coverage.priorityOrder ?? coverage.priority ?? '—'}</span>{coverage.isPrimary && <span className="badge border-0 bg-amber-50 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Chính</span>}</div></td><td><span className={`badge border-0 font-semibold ${coverage.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{coverage.isActive ? 'Hoạt động' : 'Đã tắt'}</span></td>{canManage && <td><button type="button" onClick={() => openEditCoverage(coverage)} className="btn btn-square btn-ghost btn-sm" aria-label="Sửa phạm vi phụ trách"><Lucide.Pencil size={16} /></button></td>}</tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="leave-detail-title">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Lucide.TriangleAlert size={21} /></div>
              <div>
                <h2 id="leave-detail-title" className="text-lg font-semibold text-slate-950 dark:text-slate-50">Bỏ các thay đổi chưa lưu?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Thông tin điều phối viên đã được chỉnh sửa nhưng chưa lưu. Nếu quay lại danh sách, các thay đổi này sẽ bị mất.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowLeaveConfirm(false)} className="btn rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Tiếp tục chỉnh sửa</button>
              <button type="button" onClick={leaveDetail} className="btn rounded-2xl border-0 bg-rose-600 text-white hover:bg-rose-700">Bỏ thay đổi và quay lại</button>
            </div>
          </div>
        </div>
      )}

      {showCoverageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
          <form onSubmit={saveCoverage} className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">{editingCoverageId ? 'Cập nhật phạm vi' : 'Thêm phạm vi'}</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Thiết lập khu vực, danh mục và thứ tự ưu tiên.</p></div><button type="button" onClick={() => setShowCoverageModal(false)} className="btn btn-circle btn-ghost btn-sm"><Lucide.X size={18} /></button></div>
            <div className="mt-6 space-y-4">
              <label className="block"><span className="mb-2 block text-sm font-bold">Khu vực *</span><select value={coverageForm.areaId} onChange={(event) => updateCoverageForm('areaId', event.target.value)} className="select select-bordered w-full rounded-2xl border-slate-200"><option value="">Chọn khu vực</option>{areas.map((area) => <option key={area.areaId ?? area.id} value={area.areaId ?? area.id}>{area.areaName ?? area.name}</option>)}</select></label>
              <label className="block"><span className="mb-2 block text-sm font-bold">Danh mục *</span><select value={coverageForm.categoryId} onChange={(event) => updateCoverageForm('categoryId', event.target.value)} className="select select-bordered w-full rounded-2xl border-slate-200"><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category.categoryId ?? category.id} value={category.categoryId ?? category.id}>{category.categoryName ?? category.name}</option>)}</select></label>
              <label className="block"><span className="mb-2 block text-sm font-bold">Thứ tự ưu tiên</span><input type="number" min="1" value={coverageForm.priorityOrder} onChange={(event) => updateCoverageForm('priorityOrder', event.target.value)} className="input input-bordered w-full rounded-2xl border-slate-200" /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold"><input type="checkbox" checked={coverageForm.isPrimary} onChange={(event) => updateCoverageForm('isPrimary', event.target.checked)} className="checkbox checkbox-sm" /> Phạm vi chính</label>{editingCoverageId && <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold"><input type="checkbox" checked={coverageForm.isActive} onChange={(event) => updateCoverageForm('isActive', event.target.checked)} className="checkbox checkbox-sm" /> Đang hoạt động</label>}</div>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowCoverageModal(false)} className="btn btn-ghost rounded-2xl">Hủy</button><button type="submit" disabled={coverageSaving} className="btn rounded-2xl border-0 bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">{coverageSaving ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={17} />} Lưu phạm vi</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
