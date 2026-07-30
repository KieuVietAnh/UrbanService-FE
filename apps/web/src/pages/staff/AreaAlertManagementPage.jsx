import { useEffect, useState } from 'react';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import { LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import DelightToast from '../../components/delight/DelightToast';
import { ManagerPageHeader, ManagerSectionHeader, ManagerEmptyState } from '../../components/manager/ManagerPageElements';
import { LocationPicker } from '../../components/maps/LocationPicker';
import { getCategoryLabel } from '../../utils/categoryLabels';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import { getBadgeIntent } from '../../components/design-system/badgeSemantics';

const DEFAULT_FORM = {
  title: '',
  message: '',
  severity: 'Medium',
  areaId: '',
  categoryId: '',
  latitude: '',
  longitude: '',
  radiusMeters: '',
  startAt: '',
  endAt: '',
};

const normalizeLookupList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const normalizeAlertsList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getAreaLabel = (area) => area?.areaName || area?.name || area?.displayName || 'Khu vực chưa xác định';

export default function AreaAlertManagementPage() {
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', sub: '' });

  useEffect(() => {
    const loadLookups = async () => {
      setLoadingAlerts(true);
      setError('');
      try {
        const [areasRes, categoriesRes, alertsRes] = await Promise.allSettled([
          toolsApi.getAreas(),
          toolsApi.getCategories(),
          managementFeedbackApi.getAreaAlerts(),
        ]);

        setAreas(normalizeLookupList(areasRes.status === 'fulfilled' ? areasRes.value : []));
        setCategories(normalizeLookupList(categoriesRes.status === 'fulfilled' ? categoriesRes.value : []));
        setAlerts(normalizeAlertsList(alertsRes.status === 'fulfilled' ? alertsRes.value : []));
      } catch (err) {
        console.error('Failed to load area alert lookups', err);
        setError('Không thể tải dữ liệu khu vực và danh mục. Vui lòng thử lại.');
      } finally {
        setLoadingAlerts(false);
      }
    };

    loadLookups();
  }, []);

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleLocationSelect = (latitude, longitude) => {
    setForm((current) => ({
      ...current,
      latitude: latitude != null ? String(latitude) : '',
      longitude: longitude != null ? String(longitude) : '',
    }));
    setFormErrors((current) => ({ ...current, latitude: undefined, longitude: undefined }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.title?.trim()) {
      nextErrors.title = 'Vui lòng nhập tiêu đề cảnh báo.';
    }
    if (!form.message?.trim()) {
      nextErrors.message = 'Vui lòng nhập nội dung cảnh báo.';
    }
    if (!form.severity?.trim()) {
      nextErrors.severity = 'Vui lòng chọn mức độ nghiêm trọng.';
    }
    if (!form.startAt?.trim()) {
      nextErrors.startAt = 'Vui lòng chọn thời gian bắt đầu.';
    }
    if ((form.latitude || form.longitude) && !(form.latitude && form.longitude)) {
      nextErrors.latitude = 'Cần nhập cả kinh độ và vĩ độ nếu muốn định vị chính xác.';
      nextErrors.longitude = 'Cần nhập cả kinh độ và vĩ độ nếu muốn định vị chính xác.';
    }
    if (form.radiusMeters && Number(form.radiusMeters) <= 0) {
      nextErrors.radiusMeters = 'Bán kính phải lớn hơn 0.';
    }

    return nextErrors;
  };

  const handleCreateAlert = async () => {
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setLoadingCreate(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      severity: form.severity,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      radiusMeters: form.radiusMeters ? Number(form.radiusMeters) : undefined,
      areaId: form.areaId ? Number(form.areaId) : undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    };

    try {
      await managementFeedbackApi.createAreaAlert(payload);
      setToast({ open: true, message: 'Cảnh báo khu vực đã được tạo', sub: 'Yêu cầu tạo cảnh báo thủ công đã được gửi.' });
      setShowCreateModal(false);
      setForm(DEFAULT_FORM);
      setLoadingAlerts(true);
      try {
        const alertsRes = await managementFeedbackApi.getAreaAlerts();
        setAlerts(normalizeAlertsList(alertsRes));
      } catch (reloadErr) {
        console.warn('Failed to refresh alerts list after creation', reloadErr);
      } finally {
        setLoadingAlerts(false);
      }
    } catch (err) {
      console.error('Failed to create area alert', err);
      setError(err?.message || 'Không thể tạo cảnh báo khu vực. Vui lòng thử lại.');
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <div className="admin-page-shell space-y-6 p-4">
      <ManagerPageHeader
        title="Quản Lý Cảnh Báo Khu Vực"
        description="Tạo cảnh báo thủ công và quản lý thông tin cảnh báo theo khu vực."
        icon={Lucide.BellRing}
        actions={(
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            variant="primary"
          >
            <Lucide.PlusCircle size={18} />
            <span>Tạo cảnh báo thủ công</span>
          </Button>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="admin-panel p-5">
          <div className="admin-section-description uppercase tracking-[0.24em]">Hướng dẫn</div>
          <div className="mt-4 body-text">Tạo cảnh báo khu vực khi cần phát hành thông tin xử lý khẩn cấp hoặc cảnh báo sự cố mà không cần liên kết trực tiếp với phản ánh có sẵn.</div>
        </div>
        <div className="admin-panel p-5">
          <div className="admin-section-description uppercase tracking-[0.24em]">Đầu vào bắt buộc</div>
          <ul className="mt-4 space-y-2 body-text">
            <li>Tiêu đề</li>
            <li>Nội dung cảnh báo</li>
            <li>Mức độ nghiêm trọng</li>
            <li>Thời gian bắt đầu</li>
          </ul>
        </div>
        <div className="admin-panel p-5">
          <div className="admin-section-description uppercase tracking-[0.24em]">Lưu ý</div>
          <p className="mt-4 body-text">Nếu chọn kinh độ/vĩ độ thì mục này sẽ ghi đè vị trí hiển thị cảnh báo. Khu vực và danh mục giúp phân loại cảnh báo.</p>
        </div>
      </div>

      <section className="admin-panel p-5">
        <ManagerSectionHeader
          title="Danh sách cảnh báo thủ công"
          description="Danh sách cảnh báo khu vực sẽ hiển thị khi backend cung cấp dữ liệu cảnh báo."
        />

        <div className="mt-6">
          {loadingAlerts ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <ErrorAlert title="Lỗi tải dữ liệu" message={error} onClose={() => setError('')} />
          ) : alerts.length === 0 ? (
            <ManagerEmptyState
              title="Chưa có cảnh báo thủ công"
              description="Nhấn nút Tạo cảnh báo thủ công để thêm cảnh báo mới."
              action={(
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                >
                  Tạo cảnh báo ngay
                </Button>
              )}
            />
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.areaAlertId || alert.id || alert.alertId} className="admin-inset-panel p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Badge intent={getBadgeIntent(alert.severity || 'Không rõ mức', 'severity')} className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap">
                        {alert.severity || 'Không rõ mức'}
                      </Badge>
                      <h3 className="mt-2 heading-3 text-slate-900">{alert.title || 'Không có tiêu đề'}</h3>
                      <p className="mt-2 body-text">{alert.message || 'Không có nội dung cảnh báo'}</p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {alert.areaName || getAreaLabel(alert.area) || 'Khu vực chưa xác định'}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-500">
                    <div>Danh mục: {getCategoryLabel(alert.categoryName || alert.category?.name || alert.categoryType || alert.type) || 'Không rõ'}</div>
                    <div>Thời gian: {alert.startAt ? new Date(alert.startAt).toLocaleString('vi-VN') : 'Chưa có'}</div>
                    <div>Bán kính: {alert.radiusMeters ? `${alert.radiusMeters} m` : 'Không xác định'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {showCreateModal && (
        <div className="fixed left-1/2 top-16 z-50 w-[min(95vw,820px)] max-h-[calc(100vh-112px)] -translate-x-1/2 overflow-hidden shadow-2xl admin-panel">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="heading-2 text-slate-900">Tạo cảnh báo thủ công</h2>
              <p className="admin-hero-description mt-2">Điền thông tin chi tiết để gửi cảnh báo mới qua API quản lý cảnh báo khu vực.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Đóng"
            >
              <Lucide.X size={18} />
            </button>
          </div>
          <div className="max-h-[calc(100vh-192px)] overflow-y-auto p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>Tiêu đề</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="input input-bordered w-full rounded-[1rem] border-slate-200 bg-slate-50"
                />
                {formErrors.title && <span className="text-xs font-medium text-rose-600">{formErrors.title}</span>}
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>Mức độ</span>
                <select
                  value={form.severity}
                  onChange={(e) => handleFieldChange('severity', e.target.value)}
                  className="select select-bordered w-full rounded-[1rem] border-slate-200 bg-slate-50"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                {formErrors.severity && <span className="text-xs font-medium text-rose-600">{formErrors.severity}</span>}
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <span>Nội dung cảnh báo</span>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => handleFieldChange('message', e.target.value)}
                className="textarea textarea-bordered w-full rounded-[1rem] border-slate-200/80 bg-[rgba(248,250,252,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]"
              />
              {formErrors.message && <span className="text-xs font-medium text-rose-600">{formErrors.message}</span>}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>Khu vực</span>
                <select
                  value={form.areaId}
                  onChange={(e) => handleFieldChange('areaId', e.target.value)}
                  className="select select-bordered w-full rounded-[1rem] border-slate-200 bg-slate-50"
                >
                  <option value="">Không chọn</option>
                  {areas.map((area) => (
                    <option key={area.areaId ?? area.id} value={area.areaId ?? area.id}>
                      {getAreaLabel(area)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>Danh mục</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => handleFieldChange('categoryId', e.target.value)}
                  className="select select-bordered w-full rounded-[1rem] border-slate-200 bg-slate-50"
                >
                  <option value="">Không chọn</option>
                  {categories.map((category) => (
                    <option key={category.categoryId ?? category.id} value={category.categoryId ?? category.id}>
                      {getCategoryLabel(category.categoryName || category.name || category.categoryType || category.type)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold text-slate-700">Chọn vị trí</div>
              <div className="text-sm text-slate-500">Nhấp vào bản đồ để định vị cảnh báo khu vực. Nếu không chọn vị trí, cảnh báo sẽ chỉ dùng khu vực hoặc danh mục.</div>
              <LocationPicker
                latitude={form.latitude ? Number(form.latitude) : null}
                longitude={form.longitude ? Number(form.longitude) : null}
                onSelectLocation={handleLocationSelect}
                className="rounded-[1.5rem] border border-slate-200"
              />
              <div className="admin-inset-panel p-4 text-sm text-slate-700">
                {form.latitude && form.longitude ? (
                  <p>Vị trí đã chọn: {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}</p>
                ) : (
                  <p className="text-slate-500">Chưa chọn vị trí. Nhấp vào bản đồ để thiết lập vĩ độ/kinh độ.</p>
                )}
              </div>
              {(formErrors.latitude || formErrors.longitude) && (
                <div className="text-xs font-medium text-rose-600">
                  {formErrors.latitude || formErrors.longitude}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>Bán kính (m)</span>
                <input
                  type="number"
                  min="0"
                  value={form.radiusMeters}
                  onChange={(e) => handleFieldChange('radiusMeters', e.target.value)}
                  className="input input-bordered w-full rounded-[1rem] border-slate-200 bg-slate-50"
                />
                {formErrors.radiusMeters && <span className="text-xs font-medium text-rose-600">{formErrors.radiusMeters}</span>}
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Bắt đầu</span>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => handleFieldChange('startAt', e.target.value)}
                    className="input input-bordered w-full rounded-[1rem] border-slate-200 bg-slate-50"
                  />
                  {formErrors.startAt && <span className="text-xs font-medium text-rose-600">{formErrors.startAt}</span>}
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Kết thúc</span>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => handleFieldChange('endAt', e.target.value)}
                    className="input input-bordered w-full rounded-[1rem] border-slate-200 bg-slate-50"
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                onClick={() => setShowCreateModal(false)}
                variant="ghost"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleCreateAlert}
                disabled={loadingCreate}
                variant="primary"
              >
                {loadingCreate ? <span className="loading loading-spinner loading-xs" /> : 'Tạo cảnh báo'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DelightToast
        open={toast.open}
        message={toast.message}
        sub={toast.sub}
        onClose={() => setToast({ open: false, message: '', sub: '' })}
      />
    </div>
  );
}
