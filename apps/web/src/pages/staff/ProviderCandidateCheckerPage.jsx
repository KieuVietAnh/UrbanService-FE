import { useState, useMemo } from 'react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

export default function ProviderCandidateCheckerPage() {
  const [feedbackId, setFeedbackId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');

  const runCheck = async () => {
    if (!feedbackId) return setError('Vui lòng nhập Feedback ID');
    setLoading(true); setError(''); setCandidates([]);
    try {
      const resp = await managementFeedbackApi.getProviderCandidates(feedbackId);
      const items = Array.isArray(resp) ? resp : (resp?.items ?? resp?.data ?? resp ?? []);
      setCandidates(items);
    } catch (err) {
      console.error('Failed to load provider candidates', err);
      setError('Không thể tải danh sách ứng viên. Vui lòng thử lại.');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const firstCoverage = (c) => {
    if (!c) return null;
    if (Array.isArray(c.coverages) && c.coverages.length) return c.coverages[0];
    if (Array.isArray(c.coverage) && c.coverage.length) return c.coverage[0];
    if (Array.isArray(c.coverageList) && c.coverageList.length) return c.coverageList[0];
    if (c.coverage && typeof c.coverage === 'object') return c.coverage;
    return null;
  };


  const isPrimaryFlag = (c) => {
    const cov = firstCoverage(c);
    return Boolean(c?.isPrimary ?? c?.primary ?? c?.is_primary ?? c?.primaryFlag ?? cov?.isPrimary ?? cov?.is_primary ?? false);
  };

  const isActiveFlag = (c) => {
    const cov = firstCoverage(c);
    return Boolean(c?.isActive ?? c?.active ?? c?.is_active ?? cov?.isActive ?? cov?.is_active ?? false);
  };

  const filtered = useMemo(() => {
    if (!search) return candidates;
    const q = String(search).toLowerCase();
    return candidates.filter((c) => {
      return [c.coordinatorId, c.providerName, c.coordinatorName, c.phoneNumber, c.email]
        .some((v) => v !== undefined && String(v).toLowerCase().includes(q));
    });
  }, [candidates, search]);

  const summary = useMemo(() => {
    const total = candidates.length;
    const primary = candidates.filter((c) => isPrimaryFlag(c)).length;
    const active = candidates.filter((c) => isActiveFlag(c)).length;
    return { total, primary, active };
  }, [candidates]);

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-700">
              <Lucide.Search size={14} />
              Kiểm tra ứng viên nhà cung cấp
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-900">Kiểm tra ứng viên nhà cung cấp</h1>
            <p className="mt-2 text-sm text-slate-500">Kiểm tra các điều phối viên ứng viên cho một phản ánh dựa trên coverage.</p>
          </div>
          <div className="text-sm text-slate-600">Tổng: <span className="font-black">{summary.total}</span></div>
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex gap-2 items-center">
            <label className="input input-bordered flex items-center gap-2 rounded-2xl border-slate-200 bg-slate-50">
            <Lucide.Hash size={16} className="text-slate-400" />
            <input value={feedbackId} onChange={(e) => setFeedbackId(e.target.value)} placeholder="ID phản ánh" className="grow bg-transparent text-sm" />
          </label>
          <button onClick={runCheck} className="btn btn-primary">{loading ? <LoadingSpinner /> : 'Kiểm tra ứng viên'}</button>
          <label className="input input-bordered flex items-center gap-2 rounded-2xl border-slate-200 bg-slate-50 ml-auto">
            <Lucide.Search size={16} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm trong kết quả" className="grow bg-transparent text-sm" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-slate-500">Tổng ứng viên</div>
            <div className="font-black text-xl">{summary.total}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-slate-500">Ứng viên chính</div>
            <div className="font-black text-xl text-blue-600">{summary.primary}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-slate-500">Ứng viên hoạt động</div>
            <div className="font-black text-xl text-green-600">{summary.active}</div>
          </div>
        </div>

        <div className="mt-4">
          {error && (
            <div className="mb-3">
              <ErrorAlert title="Lỗi" message={error} />
            </div>
          )}

          {loading && candidates.length === 0 ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (!loading && candidates.length === 0) ? (
            <EmptyState title="Chưa có ứng viên" description="Chưa có kết quả cho Feedback ID này." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full text-sm">
                <thead>
                  <tr>
                    <th>ID Điều phối viên</th>
                    <th>Nhà cung cấp</th>
                    <th>Điều phối viên</th>
                    <th>Điện thoại</th>
                    <th>Email</th>
                    <th>Chính</th>
                    <th>Ưu tiên</th>
                    <th>Hoạt động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.coordinatorId || c.id}>
                      <td className="font-semibold">{c.coordinatorId || c.id || '—'}</td>
                      <td>{c.providerName || c.provider?.name || '—'}</td>
                      <td>{c.coordinatorName || c.name || c.fullName || '—'}</td>
                      <td>{c.phoneNumber || c.phone || '—'}</td>
                      <td>{c.email || '—'}</td>
                      
                      <td>{isPrimaryFlag(c) ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Chính</span> : ''}</td>
                      <td>{c.priorityOrder ?? c.priority ?? '—'}</td>
                      <td>{isActiveFlag(c) ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Hoạt động</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Không hoạt động</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
