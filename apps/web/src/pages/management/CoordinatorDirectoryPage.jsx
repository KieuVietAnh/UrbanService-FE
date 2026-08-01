import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_ROLES } from '@urbanmind/shared-types';
import { toolsApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeRole } from '../../utils/roleMap';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import { getCoordinatorDirectoryCache, setCoordinatorDirectoryCache } from '../../services/cache/adminCoordinatorDirectoryCache';


const unwrapList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  return [];
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.msg || error?.message || fallback;

export default function CoordinatorDirectoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialCache = useMemo(() => getCoordinatorDirectoryCache(), []);
  const shouldRestoreRef = useRef(Boolean(location.state?.restoreCoordinatorList && initialCache.hasLoaded));
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const canManage = role === APP_ROLES.ADMINISTRATOR || role === APP_ROLES.INTERACTION_MANAGER;

  const [items, setItems] = useState(initialCache.items);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!initialCache.hasLoaded);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(initialCache.search);
  const [areaId, setAreaId] = useState(initialCache.areaId);
  const [categoryId, setCategoryId] = useState(initialCache.categoryId);
  const [includeInactive, setIncludeInactive] = useState(initialCache.includeInactive);

  useEffect(() => {
    Promise.allSettled([toolsApi.getAreas(), toolsApi.getCategories()]).then(([areaResult, categoryResult]) => {
      setAreas(areaResult.status === 'fulfilled' ? unwrapList(areaResult.value) : []);
      setCategories(categoryResult.status === 'fulfilled' ? unwrapList(categoryResult.value) : []);
    });
  }, []);

  const fetchCoordinators = useCallback(async ({ keepCurrent = false } = {}) => {
    if (!keepCurrent) setLoading(true);
    setError('');
    try {
      const response = await managementFeedbackApi.getServiceProviders({
        search: search.trim() || undefined,
        areaId: areaId || undefined,
        categoryId: categoryId || undefined,
        includeInactive: includeInactive || undefined,
      });
      const nextItems = unwrapList(response);
      setItems(nextItems);
      setCoordinatorDirectoryCache({
        items: nextItems,
        search,
        areaId,
        categoryId,
        includeInactive,
        hasLoaded: true,
        updatedAt: Date.now(),
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách điều phối viên.'));
      if (!keepCurrent) setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, areaId, categoryId, includeInactive]);

  useEffect(() => {
    if (shouldRestoreRef.current) {
      shouldRestoreRef.current = false;
      const frame = window.requestAnimationFrame(() => window.scrollTo({ top: initialCache.scrollY || 0, behavior: 'auto' }));
      return () => window.cancelAnimationFrame(frame);
    }

    const timer = window.setTimeout(() => fetchCoordinators({ keepCurrent: initialCache.hasLoaded }), 250);
    return () => window.clearTimeout(timer);
  }, [fetchCoordinators, initialCache.hasLoaded, initialCache.scrollY]);

  useEffect(() => {
    setCoordinatorDirectoryCache({ search, areaId, categoryId, includeInactive });
  }, [search, areaId, categoryId, includeInactive]);

  useEffect(() => () => {
    setCoordinatorDirectoryCache({ scrollY: window.scrollY });
  }, []);

  const openCoordinator = (id) => {
    setCoordinatorDirectoryCache({
      items,
      search,
      areaId,
      categoryId,
      includeInactive,
      scrollY: window.scrollY,
      hasLoaded: true,
    });
    navigate(`/management/coordinators/${id}`);
  };

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((item) => item.isActive).length,
    inactive: items.filter((item) => !item.isActive).length,
    coverages: items.reduce((sum, item) => sum + Number(item.coverageCount || 0), 0),
  }), [items]);

  return (
    <div className="admin-page-shell space-y-6">
      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon"><Lucide.Network size={22} /></div>
            <div className="min-w-0">
              <h1 className="admin-hero-title">Quản lý điều phối viên</h1>
              <p className="admin-hero-description">Quản lý đơn vị cung cấp, người phụ trách và phạm vi xử lý phản ánh theo khu vực, danh mục.</p>
            </div>
          </div>
          {canManage && (
            <button type="button" onClick={() => navigate('/management/coordinators/new')} className="btn h-11 rounded-xl border-0 bg-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
              <Lucide.Plus size={18} /> Thêm điều phối viên
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Tổng điều phối viên', stats.total, Lucide.Users, 'Tất cả đơn vị'],
          ['Đang hoạt động', stats.active, Lucide.CircleCheck, 'Có thể nhận phân công'],
          ['Đã vô hiệu hóa', stats.inactive, Lucide.CircleOff, 'Tạm ngừng hoạt động'],
          ['Phạm vi phụ trách', stats.coverages, Lucide.MapPinned, 'Tổng khu vực – danh mục'],
        ].map(([label, value, Icon, helper]) => (
          <div key={label} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-950/70">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{helper}</p></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><Icon size={18} /></div>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-panel overflow-hidden p-5 dark:border-slate-700 dark:bg-slate-950/70">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950/70">
            <Lucide.Search size={17} className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500" placeholder="Tìm đơn vị, người phụ trách, email, số điện thoại" />
          </label>
          <select value={areaId} onChange={(event) => setAreaId(event.target.value)} className="select select-bordered h-11 rounded-xl border-slate-200 bg-slate-50 text-sm font-normal dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100">
            <option value="">Tất cả khu vực</option>
            {areas.map((area) => <option key={area.areaId ?? area.id} value={area.areaId ?? area.id}>{area.areaName ?? area.name}</option>)}
          </select>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="select select-bordered h-11 rounded-xl border-slate-200 bg-slate-50 text-sm font-normal dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100">
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => <option key={category.categoryId ?? category.id} value={category.categoryId ?? category.id}>{category.categoryName ?? category.name}</option>)}
          </select>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} className="checkbox checkbox-sm" /> Đã vô hiệu hóa
          </label>
        </div>

        {error && <div className="mt-4"><ErrorAlert title="Không tải được dữ liệu" message={error} /></div>}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="table w-full text-sm text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              <tr><th>Đơn vị cung cấp</th><th>Người phụ trách</th><th>Liên hệ</th><th>Phạm vi phụ trách</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center"><span className="loading loading-spinner loading-md text-blue-600" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-500">Không có điều phối viên phù hợp với bộ lọc.</td></tr>
              ) : items.map((item) => {
                const id = item.coordinatorId ?? item.id;
                return (
                  <tr key={id} className="cursor-pointer transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-500/5" onClick={() => openCoordinator(id)}>
                    <td><div className="font-semibold text-slate-950 dark:text-slate-100">{item.providerName || '—'}</div><div className="mt-1 text-xs text-slate-400 dark:text-slate-500">ID: {id}</div></td>
                    <td className="font-medium text-slate-700 dark:text-slate-300">{item.coordinatorName || item.name || '—'}</td>
                    <td><div>{item.phoneNumber || '—'}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.email || '—'}</div></td>
                    <td><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{item.coverageCount ?? 0}</span></td>
                    <td><span className={`badge border-0 font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{item.isActive ? 'Hoạt động' : 'Đã vô hiệu hóa'}</span></td>
                    <td><Lucide.ChevronRight size={18} className="text-slate-400" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
