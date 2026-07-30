import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { LoadingSpinner, EmptyState } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import Button from '../../components/design-system/Button';
// Lucide icons not used in this file

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
      <Button onClick={() => window.location.reload()} variant="primary" size="sm">Thử lại</Button>
    </div>
  );

  if (!item) return (
    <div className="p-6">
      <div className="text-lg font-bold">Không tìm thấy điều phối viên</div>
      <div className="mt-3 text-sm text-slate-500">ID: {coordinatorId}</div>
      <div className="mt-4">
        <Button onClick={() => navigate(-1)} variant="outline" size="sm">Quay lại</Button>
      </div>
    </div>
  );

  return (
    <div className="admin-page-shell space-y-6 p-4">
      <div className="admin-page-hero p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{item.coordinatorName || item.name || item.fullName || '—'}</h1>
            <div className="mt-1 text-sm text-slate-500">{item.providerName || item.provider?.name || ''}</div>
          </div>
          <div>
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm">Quay lại</Button>
          </div>
        </div>
      </div>
      <div className="admin-panel p-5">
        <div className="flex items-center gap-3">
          <Button className={activeTab === 'details' ? 'bg-slate-900 text-white' : ''} variant={activeTab === 'details' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('details')}>Chi tiết</Button>
          <Button className={activeTab === 'coverages' ? 'bg-slate-900 text-white' : ''} variant={activeTab === 'coverages' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('coverages')}>Vùng phủ</Button>
          
        </div>

        {activeTab === 'details' && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="admin-inset-panel p-4">
              <div className="text-xs text-slate-500">Số điện thoại</div>
              <div className="font-semibold mt-1">{item.phoneNumber || item.phone || '—'}</div>
            </div>
            <div className="admin-inset-panel p-4">
              <div className="text-xs text-slate-500">Email</div>
              <div className="font-semibold mt-1">{item.email || '—'}</div>
            </div>
            <div className="admin-inset-panel p-4">
              <div className="text-xs text-slate-500">Trạng thái</div>
              <div className="font-semibold mt-1">{item.isActive ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="admin-inset-panel p-4">
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
                  <Button onClick={() => setActiveTab('coverages')} variant="primary" size="sm">Thử lại</Button>
                </div>
              </div>
            ) : coverages.length === 0 ? (
              <EmptyState title="Chưa có vùng phủ" description="Không có vùng phủ dành cho điều phối viên này." />
            ) : (
              <div className="admin-table-wrap overflow-x-auto">
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
