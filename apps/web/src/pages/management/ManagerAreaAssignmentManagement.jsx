import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { managerAreaAssignmentApi, toolsApi, userApi } from '@urbanmind/shared-api';
import {
  ManagerConfirmDialog,
  ManagerListRefreshIndicator,
  ManagerMetricCard,
  ManagerPageHeader,
  ManagerSelectMenu,
  ManagerToast,
} from '../../components/manager/ManagerPageElements';
import { AdminEmptyState, AdminErrorState } from '../../components/admin/AdminDataStates';

const normalizeBackendRole = (value) => String(value || '').trim().replace(/[-_\s]/g, '').toLowerCase();
const isManagerUser = (user) => normalizeBackendRole(user?.roleName || user?.role) === 'interactionmanager';
const getUserId = (user) => user?.userId || user?.id || '';
const getUserName = (user) => user?.fullName || user?.name || user?.email || 'Manager chưa cập nhật tên';
const getAreaId = (area) => area?.areaId ?? area?.id;
const getAreaName = (area) => area?.areaName || area?.name || 'Khu vực chưa cập nhật';
const getAssignmentId = (item) => item?.managerAreaAssignmentId ?? item?.assignmentId ?? item?.id;

const EMPTY_FORM = {
  assignmentId: '',
  managerUserId: '',
  managerName: '',
  areaId: '',
};

const buttonBase = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

export const ManagerAreaAssignmentManagement = () => {
  const [assignments, setAssignments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('active');
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async ({ background = false } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [assignmentResult, managerResult, areaResult] = await Promise.allSettled([
        managerAreaAssignmentApi.getAll(),
        userApi.getUsers({ roleName: 'INTERACTIONMANAGER', isActive: true }),
        toolsApi.getAreas({}, { throwOnError: true }),
      ]);

      if (assignmentResult.status === 'rejected') throw assignmentResult.reason;
      setAssignments(assignmentResult.value || []);
      setManagers(
        managerResult.status === 'fulfilled' && Array.isArray(managerResult.value)
          ? managerResult.value.filter(isManagerUser)
          : [],
      );
      setAreas(areaResult.status === 'fulfilled' && Array.isArray(areaResult.value) ? areaResult.value : []);

      const unavailable = [
        managerResult.status === 'rejected' ? 'danh sách Manager' : '',
        areaResult.status === 'rejected' ? 'khu vực' : '',
      ].filter(Boolean);
      if (unavailable.length > 0) {
        setToast({
          type: 'error',
          message: `Chưa tải được ${unavailable.join(', ')}. Danh sách phân khu vực vẫn được giữ để tra cứu.`,
        });
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError?.message || 'Không thể tải phạm vi quản lý khu vực.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!modalOpen || typeof window === 'undefined') return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) setModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, saving]);

  const managerOptions = useMemo(() => [
    { value: '', label: 'Chọn Manager' },
    ...managers.map((manager) => ({
      value: String(getUserId(manager)),
      label: `${getUserName(manager)}${manager?.email ? ` · ${manager.email}` : ''}`,
    })),
  ], [managers]);

  const areaOptions = useMemo(() => [
    { value: '', label: 'Chọn phường / khu vực' },
    ...areas.map((area) => ({ value: String(getAreaId(area)), label: getAreaName(area) })),
  ], [areas]);

  const assignmentManagerOptions = useMemo(() => {
    const directory = new Map();
    assignments.forEach((item) => {
      const id = String(item?.managerUserId || '');
      if (id) directory.set(id, item?.managerName || item?.managerEmail || id);
    });
    return [
      { value: '', label: 'Tất cả Manager' },
      ...Array.from(directory, ([value, label]) => ({ value, label })),
    ];
  }, [assignments]);

  const filterAreaOptions = useMemo(() => [
    { value: '', label: 'Tất cả khu vực' },
    ...areas.map((area) => ({ value: String(getAreaId(area)), label: getAreaName(area) })),
  ], [areas]);

  const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
  const filteredAssignments = assignments.filter((item) => {
    if (managerFilter && String(item?.managerUserId || '') !== managerFilter) return false;
    if (areaFilter && String(item?.areaId ?? '') !== areaFilter) return false;
    if (activeFilter === 'active' && item?.isActive === false) return false;
    if (activeFilter === 'inactive' && item?.isActive !== false) return false;
    if (!normalizedQuery) return true;
    return [item?.managerName, item?.managerEmail, item?.areaName, item?.wardCode]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('vi-VN')
      .includes(normalizedQuery);
  });

  const activeCount = assignments.filter((item) => item?.isActive !== false).length;
  const coveredManagerCount = new Set(
    assignments.filter((item) => item?.isActive !== false).map((item) => String(item?.managerUserId || '')).filter(Boolean),
  ).size;
  const coveredAreaCount = new Set(
    assignments.filter((item) => item?.isActive !== false).map((item) => String(item?.areaId || '')).filter(Boolean),
  ).size;

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const editAssignment = (item) => {
    setForm({
      assignmentId: String(getAssignmentId(item) || ''),
      managerUserId: String(item?.managerUserId || ''),
      managerName: item?.managerName || item?.managerEmail || 'Manager',
      areaId: String(item?.areaId || ''),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const persistForm = async () => {
    setSaving(true);
    try {
      if (form.assignmentId) {
        await managerAreaAssignmentApi.update(form.assignmentId, { areaId: form.areaId });
        setToast({ type: 'success', message: 'Đã cập nhật khu vực quản lý của Manager.' });
      } else {
        await managerAreaAssignmentApi.create({
          managerUserId: form.managerUserId,
          areaId: form.areaId,
        });
        setToast({ type: 'success', message: 'Đã phân khu vực cho Manager.' });
      }
      setConfirmAction(null);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load({ background: true });
    } catch (saveError) {
      setToast({
        type: 'error',
        message: saveError?.response?.data?.message || saveError?.message || 'Không thể lưu phạm vi quản lý khu vực.',
      });
    } finally {
      setSaving(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.managerUserId || !form.areaId) {
      setToast({ type: 'error', message: 'Vui lòng chọn Manager và khu vực quản lý.' });
      return;
    }
    setConfirmAction({
      type: 'save',
      title: form.assignmentId ? 'Lưu thay đổi khu vực?' : 'Xác nhận phân khu vực?',
      description: form.assignmentId
        ? `Khu vực quản lý của ${form.managerName} sẽ được cập nhật.`
        : 'Manager sẽ được cấp quyền quản lý các nghiệp vụ thuộc khu vực đã chọn.',
      confirmLabel: form.assignmentId ? 'Lưu thay đổi' : 'Phân khu vực',
      tone: 'info',
    });
  };

  const requestToggleActive = (item) => {
    const isActive = item?.isActive !== false;
    setConfirmAction({
      type: 'toggle',
      item,
      title: isActive ? 'Tạm dừng phạm vi này?' : 'Kích hoạt lại phạm vi này?',
      description: isActive
        ? `${item?.managerName || 'Manager'} sẽ không còn quyền quản lý ${item?.areaName || 'khu vực này'}.`
        : `${item?.managerName || 'Manager'} sẽ được khôi phục quyền quản lý ${item?.areaName || 'khu vực này'}.`,
      confirmLabel: isActive ? 'Tạm dừng' : 'Kích hoạt',
      tone: isActive ? 'warning' : 'success',
    });
  };

  const confirmPendingAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'save') {
      await persistForm();
      return;
    }

    const item = confirmAction.item;
    const assignmentId = getAssignmentId(item);
    if (!assignmentId) return;
    setActionLoading(true);
    try {
      const nextActive = item?.isActive === false;
      await managerAreaAssignmentApi.setActive(assignmentId, nextActive);
      setToast({
        type: 'success',
        message: nextActive ? 'Đã kích hoạt lại phạm vi quản lý.' : 'Đã tạm dừng phạm vi quản lý.',
      });
      setConfirmAction(null);
      await load({ background: true });
    } catch (toggleError) {
      setToast({
        type: 'error',
        message: toggleError?.response?.data?.message || toggleError?.message || 'Không thể thay đổi trạng thái phạm vi quản lý.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="manager-ui-page space-y-5">
      <ManagerPageHeader
        title="Phạm vi quản lý khu vực"
        description="Phân phường hoặc khu vực phụ trách cho từng Interaction Manager."
        icon={Lucide.MapPinned}
        statusLabel="Đang hoạt động"
        statusValue={loading ? 'Đang tải…' : `${activeCount} phạm vi`}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => load({ background: true })} disabled={loading || refreshing} className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200`}>
              <Lucide.RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button type="button" onClick={openCreateModal} disabled={loading} className={`${buttonBase} bg-blue-600 text-white shadow-sm hover:bg-blue-700`}>
              <Lucide.Plus size={17} />
              Phân khu vực
            </button>
          </div>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <ManagerMetricCard label="Phạm vi hoạt động" value={loading ? '—' : activeCount} description="Phân quyền khu vực đang có hiệu lực." icon={Lucide.MapPinned} toneClass="bg-blue-50 text-blue-700" />
        <ManagerMetricCard label="Manager được phân quyền" value={loading ? '—' : coveredManagerCount} description="Manager có ít nhất một khu vực hoạt động." icon={Lucide.UsersRound} toneClass="bg-cyan-50 text-cyan-700" />
        <ManagerMetricCard label="Khu vực có quản lý" value={loading ? '—' : coveredAreaCount} description="Khu vực đã có Manager phụ trách." icon={Lucide.Map} toneClass="bg-emerald-50 text-emerald-700" />
      </section>

      <section className="admin-panel relative overflow-hidden">
        <div className="manager-list-panel-header bg-transparent px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Danh sách phạm vi Manager</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tra cứu, cập nhật và tạm dừng quyền quản lý theo khu vực.</p>
              </div>
              <ManagerListRefreshIndicator visible={refreshing} />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(160px,0.8fr)]">
              <label className="relative block">
                <Lucide.Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Manager, email hoặc khu vực" className="input input-bordered h-11 w-full rounded-xl bg-white pl-10 text-sm dark:bg-slate-900" />
              </label>
              <ManagerSelectMenu value={managerFilter} options={assignmentManagerOptions} onChange={setManagerFilter} ariaLabel="Lọc Manager" />
              <ManagerSelectMenu value={areaFilter} options={filterAreaOptions} onChange={setAreaFilter} ariaLabel="Lọc khu vực" />
              <ManagerSelectMenu value={activeFilter} options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'inactive', label: 'Tạm dừng' },
              ]} onChange={setActiveFilter} ariaLabel="Lọc trạng thái" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center"><span className="loading loading-spinner loading-lg text-blue-600" /></div>
        ) : error ? (
          <AdminErrorState description={error} onRetry={() => load()} />
        ) : filteredAssignments.length === 0 ? (
          <AdminEmptyState icon={Lucide.MapPinned} title="Chưa có phạm vi phù hợp" description="Thử thay đổi bộ lọc hoặc phân khu vực mới cho Manager." />
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredAssignments.map((item) => {
              const assignmentId = getAssignmentId(item);
              const isActive = item?.isActive !== false;
              return (
                <article key={assignmentId} className="grid gap-4 px-5 py-4 sm:px-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_160px_220px] xl:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950 dark:text-slate-100">{item?.managerName || 'Manager chưa cập nhật tên'}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item?.managerEmail || 'Chưa có email'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">Khu vực</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200 xl:mt-0">{item?.areaName || 'Khu vực chưa cập nhật'}</p>
                    {item?.wardCode ? <p className="mt-1 text-xs text-slate-400">Mã phường: {item.wardCode}</p> : null}
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                    <button type="button" onClick={() => editAssignment(item)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <Lucide.Pencil size={13} /> Chỉnh sửa
                    </button>
                    <button type="button" onClick={() => requestToggleActive(item)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${isActive ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                      {isActive ? <Lucide.Pause size={13} /> : <Lucide.Play size={13} />}
                      {isActive ? 'Tạm dừng' : 'Kích hoạt'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modalOpen && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[10000] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="manager-area-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <form onSubmit={submit} className="my-auto w-full max-w-xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Phân quyền khu vực</p>
                <h2 id="manager-area-modal-title" className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-slate-100">{form.assignmentId ? 'Chỉnh sửa phạm vi' : 'Phân khu vực cho Manager'}</h2>
              </div>
              <button type="button" onClick={closeModal} disabled={saving} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900" aria-label="Đóng cửa sổ">
                <Lucide.X size={17} />
              </button>
            </header>

            <div className="grid gap-4 px-5 py-5 sm:px-6">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Manager <span className="text-rose-500">*</span></span>
                {form.assignmentId ? (
                  <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{form.managerName}</div>
                ) : (
                  <ManagerSelectMenu value={form.managerUserId} options={managerOptions} onChange={(value) => setForm((current) => ({ ...current, managerUserId: value }))} placeholder="Chọn Manager" ariaLabel="Chọn Manager" />
                )}
              </label>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Phường / khu vực <span className="text-rose-500">*</span></span>
                <ManagerSelectMenu value={form.areaId} options={areaOptions} onChange={(value) => setForm((current) => ({ ...current, areaId: value }))} placeholder="Chọn khu vực" ariaLabel="Chọn khu vực" />
              </label>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-slate-800 dark:bg-slate-900/40">
              <button type="button" onClick={closeModal} disabled={saving} className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200`}>Hủy</button>
              <button type="submit" disabled={saving || !form.managerUserId || !form.areaId} className={`${buttonBase} bg-blue-600 text-white shadow-sm hover:bg-blue-700`}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={16} />}
                {saving ? 'Đang lưu…' : form.assignmentId ? 'Lưu thay đổi' : 'Phân khu vực'}
              </button>
            </footer>
          </form>
        </div>,
        document.body,
      ) : null}

      <ManagerConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title || 'Xác nhận thao tác'}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.confirmLabel || 'Xác nhận'}
        cancelLabel="Hủy"
        tone={confirmAction?.tone || 'warning'}
        loading={saving || actionLoading}
        onConfirm={confirmPendingAction}
        onCancel={() => { if (!saving && !actionLoading) setConfirmAction(null); }}
      />

      <ManagerToast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
};

export default ManagerAreaAssignmentManagement;
