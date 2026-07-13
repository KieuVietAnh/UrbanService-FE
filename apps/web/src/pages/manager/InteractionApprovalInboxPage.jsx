import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { managementTypes, PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import { getApprovalQueueStatus, getApprovalQueueTitle } from './approvalQueueUtils';

export const InteractionApprovalInboxPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const loadItems = useCallback(async (requestedPage = 0, requestedPageSize = pageSize, requestedSearch = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await managementFeedbackApi.getFeedbacks({
        pageIndex: requestedPage,
        pageSize: requestedPageSize,
        status: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
        search: requestedSearch || undefined,
      });
      const list = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
      setItems(list);
      setTotalCount(Number(response?.totalItems ?? response?.totalCount ?? response?.total ?? list.length ?? 0));
    } catch (err) {
      console.error('Failed to load approval inbox', err);
      setError(err?.message || 'Không thể tải hàng đợi duyệt.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshQueue = async () => {
      setPageIndex(0);
      await loadItems(0, pageSize, search);
    };

    refreshQueue();
  }, [search, pageSize, location.state?.refreshKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageLabel = totalCount === 0 ? '0' : `${pageIndex + 1}/${totalPages}`;

  const summary = useMemo(() => ({
    pending: totalCount,
  }), [totalCount]);

  const getStatusLabel = (status) => ({
    [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 'Chờ duyệt',
  }[status] || status);

  const getPriorityLabel = (priority) => ({ Low: 'Thấp', Medium: 'Trung bình', High: 'Cao', Critical: 'Khẩn cấp' }[priority] || priority);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-8 w-2/3 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-[1.4rem] border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="mt-3 h-16 animate-pulse rounded-[1.2rem] bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">
              <Lucide.GitPullRequestArrow size={14} />
              Approval Queue
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-900">Pending manager approval</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Review feedback that is waiting for your final approval decision.</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Total Pending</div>
            <div className="mt-1 text-xl font-black text-slate-900">{summary.pending}</div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="input input-bordered flex flex-1 items-center gap-2 rounded-2xl border-slate-200 bg-slate-50">
            <Lucide.Search size={16} className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search feedback" className="grow bg-transparent text-sm" />
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Rows</label>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="select select-bordered rounded-2xl border-slate-200 bg-slate-50 text-sm">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorAlert title="Lỗi tải hàng đợi" message={error} onClose={() => setError('')} />
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-slate-200">
          {loading ? (
            <div className="space-y-2 bg-slate-50/60 p-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-[1rem] bg-slate-200" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="No feedback is waiting for approval" description="There are no items that match the current queue filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Feedback ID</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.feedbackId || item.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-700">{item.feedbackId || item.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{getApprovalQueueTitle(item)}</div>
                        <div className="mt-1 text-xs text-slate-500">{item?.description || 'No description'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item?.categoryName || item?.category?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{item?.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${PRIORITY_BADGE_CLASSES[item?.priority] || 'bg-slate-100 text-slate-700'}`}>
                          {getPriorityLabel(item?.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[item?.status] || 'bg-slate-100 text-slate-700'}`}>
                          {getStatusLabel(item?.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => navigate(`/manager/approvals/${item.feedbackId || item.id}`)} className="btn btn-sm rounded-2xl btn-outline">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalCount > 0 ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div>Showing {items.length} of {totalCount}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { const nextPage = Math.max(0, pageIndex - 1); setPageIndex(nextPage); loadItems(nextPage, pageSize, search); }} disabled={pageIndex === 0} className="btn btn-sm rounded-2xl">
                Previous
              </button>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{pageLabel}</span>
              <button type="button" onClick={() => { const nextPage = Math.min(totalPages - 1, pageIndex + 1); setPageIndex(nextPage); loadItems(nextPage, pageSize, search); }} disabled={pageIndex >= totalPages - 1} className="btn btn-sm rounded-2xl">
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
