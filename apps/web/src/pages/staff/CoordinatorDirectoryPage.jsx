import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

export default function CoordinatorDirectoryPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [areaId, setAreaId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [aRes, cRes] = await Promise.allSettled([toolsApi.getAreas(), toolsApi.getCategories()]);
        setAreas(aRes.status === 'fulfilled' && Array.isArray(aRes.value) ? aRes.value : []);
        setCategories(cRes.status === 'fulfilled' && Array.isArray(cRes.value) ? cRes.value : []);
      } catch (err) {
        console.error('Failed to load lookups', err);
      }
    };
    loadLookups();
  }, []);

  const fetchCoordinators = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search: search || undefined,
        areaId: areaId || undefined,
        categoryId: categoryId || undefined,
        includeInactive: includeInactive ? true : undefined,
        page: currentPage,
        pageSize,
      };

      const response = await managementFeedbackApi.getServiceProviders(params);
      const itemsArr = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.data)
            ? response.data
            : [];

      setItems(itemsArr);
      const total = response?.totalCount ?? response?.total ?? response?.totalItems ?? itemsArr.length ?? 0;
      setTotalCount(total);
    } catch (err) {
      console.error('Failed to fetch coordinators', err);
      setError('Không thể tải danh sách điều phối viên. Vui lòng thử lại.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [search, areaId, categoryId, includeInactive, currentPage, pageSize]);

  useEffect(() => { fetchCoordinators(); }, [fetchCoordinators]);

  useEffect(() => { setCurrentPage(1); }, [search, areaId, categoryId, includeInactive]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorAlert title="Lỗi tải danh bạ" message={error} />
        <button onClick={fetchCoordinators} className="btn btn-primary btn-sm rounded-lg">
          <Lucide.RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-700">
              <Lucide.Users size={14} /> Danh bạ Điều phối viên
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-900">Danh bạ Điều phối viên</h1>
            <p className="mt-2 text-sm text-slate-500">Tìm kiếm và quản lý danh sách điều phối viên theo khu vực và danh mục.</p>
          </div>
          <div className="text-sm text-slate-600">Tổng: <span className="font-black">{totalCount}</span></div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="input input-bordered flex items-center gap-2 rounded-2xl border-slate-200 bg-slate-50">
            <Lucide.Search size={16} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, email hoặc điện thoại" className="grow bg-transparent text-sm" />
          </label>

          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="select select-bordered rounded-2xl border-slate-200 bg-slate-50 text-sm">
            <option value="">Tất cả khu vực</option>
            {areas.map((a) => (<option key={a.id || a.areaId} value={a.id || a.areaId}>{a.name || a.areaName}</option>))}
          </select>

          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="select select-bordered rounded-2xl border-slate-200 bg-slate-50 text-sm">
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (<option key={c.id || c.categoryId} value={c.id || c.categoryId}>{c.name || c.categoryName}</option>))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(Boolean(e.target.checked))} />
            Bao gồm đã tắt
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          {items.length === 0 ? (
            <EmptyState title="Chưa có điều phối viên" description="Không có dữ liệu phù hợp với bộ lọc hiện tại." />
          ) : (
            <table className="table table-zebra w-full text-sm">
              <thead>
                <tr>
                  <th>Coordinator ID</th>
                  <th>Provider</th>
                  <th>Coordinator</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Active</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.coordinatorId || it.id} onClick={() => navigate(`/staff/coordinators/${it.coordinatorId || it.id}`)} className="cursor-pointer">
                    <td className="font-semibold">{it.coordinatorId || it.id || '—'}</td>
                    <td>{it.providerName || it.provider?.name || '—'}</td>
                    <td>{it.coordinatorName || it.name || it.fullName || '—'}</td>
                    <td>{it.phoneNumber || it.phone || '—'}</td>
                    <td>{it.email || '—'}</td>
                    <td>{it.isActive ? 'Yes' : 'No'}</td>
                    <td>{it.coverageCount ?? it.coverage?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <div className="text-sm text-slate-500">Hiển thị trang {currentPage} trên {totalPages}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-sm rounded-2xl">Trước</button>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{currentPage}/{totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-sm rounded-2xl">Sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
