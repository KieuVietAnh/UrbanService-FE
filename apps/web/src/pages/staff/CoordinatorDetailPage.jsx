import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { LoadingSpinner, EmptyState } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

export default function CoordinatorDetailPage() {
  const { coordinatorId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  // Coverages
  const [coverages, setCoverages] = useState([]);
  const [loadingCoverages, setLoadingCoverages] = useState(false);
  const [errorCoverages, setErrorCoverages] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await managementFeedbackApi.getServiceProviderDetail(coordinatorId);
        const payload = res ?? res?.data ?? res?.item ?? res ?? null;
        setItem(payload);
      } catch (err) {
        console.error('Failed to load coordinator detail', err);
        setError('Không thể tải thông tin điều phối viên. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    if (coordinatorId) load();
  }, [coordinatorId]);

  useEffect(() => {
    const loadCoverages = async () => {
      if (!coordinatorId) return;
      setLoadingCoverages(true);
      setErrorCoverages('');
      try {
        const res = await managementFeedbackApi.getCoordinatorCoverages(coordinatorId);
        setCoverages(Array.isArray(res) ? res : (res?.items ?? []));
      } catch (err) {
        console.error('Failed to load coverages', err);
        setErrorCoverages('Không thể tải danh sách vùng phủ. Vui lòng thử lại.');
        setCoverages([]);
      } finally {
        setLoadingCoverages(false);
      }
    };

    if (activeTab === 'coverages') {
      loadCoverages();
    }
  }, [coordinatorId, activeTab]);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  if (error) return (
    <div className="space-y-4">
      <ErrorAlert title="Lỗi tải chi tiết" message={error} />
      <button onClick={() => window.location.reload()} className="btn btn-primary btn-sm">Thử lại</button>
    </div>
  );

  if (!item) return (
    <div className="p-6">
      <div className="text-lg font-bold">Không tìm thấy điều phối viên</div>
      <div className="mt-3 text-sm text-slate-500">ID: {coordinatorId}</div>
      <div className="mt-4">
        <button onClick={() => navigate(-1)} className="btn btn-sm">Quay lại</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">{item.coordinatorName || item.name || item.fullName || '—'}</h1>
            <div className="mt-1 text-sm text-slate-500">{item.providerName || item.provider?.name || ''}</div>
          </div>
          <div>
            <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">Quay lại</button>
          </div>
        </div>
      </div>
      <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button className={`btn btn-sm btn-ghost ${activeTab === 'details' ? 'btn-active' : ''}`} onClick={() => setActiveTab('details')}>Chi tiết</button>
          <button className={`btn btn-sm btn-ghost ${activeTab === 'coverages' ? 'btn-active' : ''}`} onClick={() => setActiveTab('coverages')}>Vùng phủ</button>
          
        </div>

        {activeTab === 'details' && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Số điện thoại</div>
              <div className="font-semibold mt-1">{item.phoneNumber || item.phone || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Email</div>
              <div className="font-semibold mt-1">{item.email || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Trạng thái</div>
              <div className="font-semibold mt-1">{item.isActive ? 'Active' : 'Inactive'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Coverage</div>
              <div className="font-semibold mt-1">{item.coverageCount ?? item.coverage?.length ?? 0}</div>
            </div>
          </div>
        )}

        {activeTab === 'coverages' && (
          <div className="mt-4">
            {loadingCoverages ? (
              <div className="flex justify-center py-6"><LoadingSpinner /></div>
            ) : errorCoverages ? (
              <div className="space-y-4">
                <ErrorAlert title="Lỗi tải vùng phủ" message={errorCoverages} />
                <div>
                  <button onClick={() => setActiveTab('coverages')} className="btn btn-primary btn-sm">Thử lại</button>
                </div>
              </div>
            ) : coverages.length === 0 ? (
              <EmptyState title="Chưa có vùng phủ" description="Không có vùng phủ dành cho điều phối viên này." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full text-sm">
                  <thead>
                    <tr>
                      <th>Coverage ID</th>
                      <th>Area ID</th>
                      <th>Area Name</th>
                      <th>Category ID</th>
                      <th>Category Name</th>
                      <th>Primary</th>
                      <th>Priority</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverages.map((c) => (
                      <tr key={c.coverageId || c.id}>
                        <td className="font-semibold">{c.coverageId || c.id || '—'}</td>
                        <td>{c.areaId ?? c.area?.areaId ?? '—'}</td>
                        <td>{c.areaName ?? c.area?.name ?? c.area?.areaName ?? '—'}</td>
                        <td>{c.categoryId ?? c.category?.categoryId ?? '—'}</td>
                        <td>{c.categoryName ?? c.category?.name ?? c.category?.categoryName ?? '—'}</td>
                        <td>{c.isPrimary ? 'Yes' : 'No'}</td>
                        <td>{c.priorityOrder ?? c.priority ?? '—'}</td>
                        <td>{c.isActive ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
}
