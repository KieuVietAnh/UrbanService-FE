import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { duplicateManagementApi, managementFeedbackApi } from '@urbanmind/shared-api';
import { SuccessAlert, ErrorAlert } from '../../components/alerts/ErrorAlert';
import Badge from '../../components/design-system/Badge';
import { getBadgeIntent } from '../../components/design-system/badgeSemantics';
import * as Lucide from 'lucide-react';
import Button from '../../components/design-system/Button';
import { ManagerPageHeader } from '../../components/manager/ManagerPageElements';
import { normalizeDuplicateCandidatePayload, extractImageUrls } from './duplicateDetailUtils';

// formatDate removed from this file; other pages use their own helpers

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTextValue = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return fallback;
};

const getImageSources = (feedback = {}) => extractImageUrls(feedback || {});

const parseCoordinates = (value) => {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 2) return [Number(value[0]), Number(value[1])];
  if (typeof value === 'object') {
    if (value?.lat != null && value?.lng != null) return [Number(value.lat), Number(value.lng)];
    if (value?.latitude != null && value?.longitude != null) return [Number(value.latitude), Number(value.longitude)];
    if (Array.isArray(value?.coordinates) && value.coordinates.length >= 2) return [Number(value.coordinates[0]), Number(value.coordinates[1])];
  }
  if (typeof value === 'string') {
    const matches = value.match(/-?\d+(?:\.\d+)?/g);
    if (matches && matches.length >= 2) return [Number(matches[0]), Number(matches[1])];
  }
  return null;
};

const formatCoordinates = (value) => {
  const parsed = parseCoordinates(value);
  if (!parsed) return getTextValue(value, '—');
  const [lat, lng] = parsed;
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return getTextValue(value, '—');
};

const getDistanceKm = (coordsA, coordsB) => {
  if (!coordsA || !coordsB) return Infinity;
  const [lat1, lon1] = coordsA;
  const [lat2, lon2] = coordsB;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getStatusClass = (s) => {
  if (!s) return 'border-slate-200 bg-slate-50 text-slate-700';
  const key = String(s).trim().toLowerCase();
  switch (key) {
    case 'pending':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    case 'confirmed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const getNormalizedConfidence = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return score > 1 ? score : score * 100;
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'Pending':
      return 'Chờ xử lý';
    case 'Confirmed':
      return 'Đã xác nhận';
    case 'Rejected':
      return 'Đã từ chối';
    default:
      return status || 'Không xác định';
  }
};

const getRecommendationText = (confidence) => {
  if (confidence === null) return 'Cần phân tích thêm';
  if (confidence >= 90) return 'Độ tin cậy cao';
  if (confidence >= 75) return 'Khả năng trùng';
  return 'Cần kiểm tra cẩn thận';
};

const ELIGIBLE_MASTER_STATUSES = new Set([
  'verified',
  'assigned',
  'inprogress',
  'resolved',
  'submittedforapproval',
  'approved',
  'needrework',
  'closed',
]);

export const DuplicateDetailPage = () => {
  const navigate = useNavigate();
  const { duplicateCandidateId } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageMessage, setPageMessage] = useState({ type: '', text: '' });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const loadCandidate = useCallback(async () => {
    if (!duplicateCandidateId) {
      setError('Thiếu mã ứng viên trùng lặp.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await duplicateManagementApi.getDuplicateById(duplicateCandidateId);

      const normalizedCandidate = normalizeDuplicateCandidatePayload(response || null);

      if (normalizedCandidate) {
        setCandidate(normalizedCandidate);
        setLoading(false);
      }

      // If attachments are stored on the referenced feedback resources, fetch them by id
      const fbId = response?.feedbackId || response?.feedback?.feedbackId || response?.feedback?.id || response?.feedback?.feedback_id || null;
      const parentId = response?.potentialParentFeedbackId || response?.potentialParentFeedback?.feedbackId || response?.potentialParentFeedback?.id || response?.potentialParentFeedback?.feedback_id || null;

      let fetchedFb = null;
      let fetchedParent = null;

      const detailRequests = [
        fbId ? managementFeedbackApi.getFeedbackById(fbId) : Promise.resolve(null),
        parentId ? managementFeedbackApi.getFeedbackById(parentId) : Promise.resolve(null),
      ];
      const [feedbackResult, parentResult] = await Promise.allSettled(detailRequests);

      fetchedFb = feedbackResult.status === 'fulfilled' ? feedbackResult.value : null;
      fetchedParent = parentResult.status === 'fulfilled' ? parentResult.value : null;

      const fbUrls = extractImageUrls(fetchedFb || response?.feedback || {});
      const parentUrls = extractImageUrls(fetchedParent || response?.potentialParentFeedback || {});


      // If normalized images empty, populate each side from the corresponding fetched resource
      const hasPrimaryImages = normalizedCandidate?.primaryFeedback?.images?.length;
      const hasDuplicateImages = normalizedCandidate?.duplicateFeedback?.images?.length;

      if (!hasPrimaryImages || !hasDuplicateImages) {
        const patched = {
          ...normalizedCandidate,
          primaryFeedback: {
            ...(normalizedCandidate.primaryFeedback || {}),
            images: hasPrimaryImages ? normalizedCandidate.primaryFeedback.images : fbUrls,
          },
          duplicateFeedback: {
            ...(normalizedCandidate.duplicateFeedback || {}),
            images: hasDuplicateImages ? normalizedCandidate.duplicateFeedback.images : parentUrls,
          },
        };
        setCandidate(patched);
      } else {
        setCandidate(normalizedCandidate);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Không thể tải chi tiết phản ánh trùng lặp.');
    } finally {
      setLoading(false);
    }
  }, [duplicateCandidateId]);

  useEffect(() => {
    loadCandidate();
  }, [loadCandidate]);

  const primaryFeedback = useMemo(() => candidate?.primaryFeedback || null, [candidate]);
  const duplicateFeedback = useMemo(() => candidate?.duplicateFeedback || null, [candidate]);
  // reasoning not displayed here; keep helper available in utils if needed
  const primaryImages = useMemo(() => getImageSources(primaryFeedback), [primaryFeedback]);
  const duplicateImages = useMemo(() => getImageSources(duplicateFeedback), [duplicateFeedback]);
  const imageSources = useMemo(() => [...primaryImages, ...duplicateImages], [primaryImages, duplicateImages]);

  useEffect(() => {
    if (!selectedImage && imageSources.length) {
      setSelectedImage(imageSources[0]);
    }
  }, [imageSources, selectedImage]);

  // refreshImages removed — reload handled by page reload or candidate load

  const confidenceValue = getNormalizedConfidence(candidate?.confidenceScore ?? candidate?.confidence);
  const confidenceLabel = getRecommendationText(confidenceValue);
  const statusLabel = getStatusLabel(candidate?.status);
  const candidateIsPending = String(candidate?.status || '').toLowerCase() === 'pending';
  const parentStatus = String(duplicateFeedback?.status || '').trim();
  const parentIsEligibleMaster = ELIGIBLE_MASTER_STATUSES.has(parentStatus.toLowerCase());
  const canConfirmDuplicate = candidateIsPending && parentIsEligibleMaster;
  const confirmBlockedMessage = !candidateIsPending
    ? 'Đề xuất này không còn ở trạng thái chờ xử lý.'
    : `Phản ánh chính đang ở trạng thái ${parentStatus || 'không xác định'} và chưa thể công khai. Hãy duyệt phản ánh chính trước khi xác nhận trùng.`;

  const comparisonRows = useMemo(() => {
    const titleA = getTextValue(primaryFeedback?.title, '—');
    const titleB = getTextValue(duplicateFeedback?.title, '—');
    const descriptionA = getTextValue(primaryFeedback?.description, '—');
    const descriptionB = getTextValue(duplicateFeedback?.description, '—');
    const categoryA = getTextValue(primaryFeedback?.categoryName || primaryFeedback?.category?.name, '—');
    const categoryB = getTextValue(duplicateFeedback?.categoryName || duplicateFeedback?.category?.name, '—');
    const areaA = getTextValue(primaryFeedback?.areaName || primaryFeedback?.area?.name, '—');
    const areaB = getTextValue(duplicateFeedback?.areaName || duplicateFeedback?.area?.name, '—');
    const priorityA = getTextValue(primaryFeedback?.priority, '—');
    const priorityB = getTextValue(duplicateFeedback?.priority, '—');
    const reporterA = getTextValue(primaryFeedback?.reporterName || primaryFeedback?.userName || primaryFeedback?.reporter?.name, '—');
    const reporterB = getTextValue(duplicateFeedback?.reporterName || duplicateFeedback?.userName || duplicateFeedback?.reporter?.name, '—');
    const createdA = formatDateTime(primaryFeedback?.createdAt || primaryFeedback?.createdDate);
    const createdB = formatDateTime(duplicateFeedback?.createdAt || duplicateFeedback?.createdDate);
    const coordinatesA = formatCoordinates(primaryFeedback?.coordinates || primaryFeedback?.locationCoordinates || primaryFeedback?.geo);
    const coordinatesB = formatCoordinates(duplicateFeedback?.coordinates || duplicateFeedback?.locationCoordinates || duplicateFeedback?.geo);
    const statusA = getTextValue(primaryFeedback?.status, '—');
    const statusB = getTextValue(duplicateFeedback?.status, '—');

    const coordsA = parseCoordinates(primaryFeedback?.coordinates || primaryFeedback?.locationCoordinates || primaryFeedback?.geo);
    const coordsB = parseCoordinates(duplicateFeedback?.coordinates || duplicateFeedback?.locationCoordinates || duplicateFeedback?.geo);
    const distance = getDistanceKm(coordsA, coordsB);
    const coordinateMatch = coordsA && coordsB ? (distance <= 0.5 ? 'same' : distance <= 5 ? 'similar' : 'neutral') : coordinatesA === coordinatesB ? 'same' : 'neutral';

    return [
      { label: 'Tiêu đề', a: titleA, b: titleB, match: titleA === titleB ? 'same' : 'neutral' },
      { label: 'Mô tả', a: descriptionA, b: descriptionB, match: descriptionA === descriptionB ? 'same' : 'neutral' },
      { label: 'Danh mục', a: categoryA, b: categoryB, match: categoryA === categoryB ? 'same' : 'neutral' },
      { label: 'Khu vực', a: areaA, b: areaB, match: areaA === areaB ? 'same' : 'neutral' },
      { label: 'Ưu tiên', a: priorityA, b: priorityB, match: priorityA === priorityB ? 'same' : 'neutral' },
      { label: 'Người báo cáo', a: reporterA, b: reporterB, match: reporterA === reporterB ? 'same' : 'neutral' },
      { label: 'Ngày tạo', a: createdA, b: createdB, match: Math.abs(new Date(primaryFeedback?.createdAt || primaryFeedback?.createdDate) - new Date(duplicateFeedback?.createdAt || duplicateFeedback?.createdDate)) <= 24 * 60 * 60 * 1000 ? 'same' : 'neutral' },
      { label: 'Tọa độ', a: coordinatesA, b: coordinatesB, match: coordinateMatch },
      { label: 'Trạng thái', a: statusA, b: statusB, match: statusA === statusB ? 'same' : 'neutral' },
    ];
  }, [primaryFeedback, duplicateFeedback]);

  const evidenceItems = useMemo(() => {
    const categoryMatch = comparisonRows.find((row) => row.label === 'Danh mục')?.match === 'same';
    const areaMatch = comparisonRows.find((row) => row.label === 'Khu vực')?.match === 'same';
    const coordinatesMatch = comparisonRows.find((row) => row.label === 'Tọa độ')?.match;
    const descriptionMatch = comparisonRows.find((row) => row.label === 'Mô tả')?.match === 'same';
    const timeMatch = comparisonRows.find((row) => row.label === 'Ngày tạo')?.match;

    return [
      {
        title: 'Cùng danh mục',
        description: categoryMatch ? 'Danh mục phản ánh trùng nhau.' : 'Danh mục khác nhau.',
        confidence: categoryMatch ? 96 : 35,
        impact: categoryMatch ? 'Cao' : 'Trung bình',
        active: categoryMatch,
      },
      {
        title: 'Cùng khu vực',
        description: areaMatch ? 'Khu vực báo cáo trùng nhau.' : 'Khu vực khác nhau.',
        confidence: areaMatch ? 92 : 38,
        impact: areaMatch ? 'Cao' : 'Trung bình',
        active: areaMatch,
      },
      {
        title: 'Tọa độ gần giống',
        description: coordinatesMatch === 'same' ? 'Tọa độ gần như giống nhau.' : coordinatesMatch === 'similar' ? 'Tọa độ gần nhau.' : 'Tọa độ khác nhau.',
        confidence: coordinatesMatch === 'same' ? 88 : coordinatesMatch === 'similar' ? 68 : 30,
        impact: coordinatesMatch === 'same' ? 'Cao' : coordinatesMatch === 'similar' ? 'Trung bình' : 'Thấp',
        active: coordinatesMatch !== 'neutral',
      },
      {
        title: 'Nội dung tương đồng',
        description: descriptionMatch ? 'Nội dung trùng khớp.' : 'Nội dung khác biệt.',
        confidence: descriptionMatch ? 85 : 40,
        impact: descriptionMatch ? 'Trung bình' : 'Thấp',
        active: descriptionMatch,
      },
      {
        title: 'Ngày tạo gần nhau',
        description: timeMatch === 'same' ? 'Ngày tạo gần nhau.' : 'Ngày tạo khác nhau.',
        confidence: timeMatch === 'same' ? 82 : 30,
        impact: timeMatch === 'same' ? 'Trung bình' : 'Thấp',
        active: timeMatch === 'same',
      },
    ];
  }, [comparisonRows]);

  const handleConfirmDuplicate = async () => {
    if (!duplicateCandidateId) return;

    if (!canConfirmDuplicate) {
      setPageMessage({ type: 'error', text: confirmBlockedMessage });
      return;
    }

    setConfirmLoading(true);
    setPageMessage({ type: '', text: '' });

    try {
      await duplicateManagementApi.confirmDuplicateCandidate(duplicateCandidateId);
      sessionStorage.setItem('staff-duplicate-cache-dirty', '1');
      setConfirmModalOpen(false);
      navigate('/staff/duplicates', {
        replace: true,
        state: {
          successMessage: 'Đã xác nhận phản ánh trùng lặp và loại khỏi hàng chờ thành công.',
        },
      });
    } catch (err) {
      console.error(err);
      setPageMessage({
        type: 'error',
        text: err?.message || 'Không thể xác nhận phản ánh trùng lặp lúc này.',
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleRejectDuplicate = async () => {
    if (!duplicateCandidateId) return;

    setRejectLoading(true);
    setPageMessage({ type: '', text: '' });

    try {
      await duplicateManagementApi.rejectDuplicateCandidate(duplicateCandidateId);
      sessionStorage.setItem('staff-duplicate-cache-dirty', '1');
      setRejectModalOpen(false);
      navigate('/staff/duplicates', {
        replace: true,
        state: {
          successMessage: 'Đã xác định hai phản ánh không trùng và loại khỏi hàng chờ.',
        },
      });
    } catch (err) {
      console.error(err);
      setPageMessage({
        type: 'error',
        text: err?.message || 'Không thể từ chối phản ánh trùng lặp lúc này.',
      });
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <div className="admin-page-shell space-y-6 pb-6">
      {pageMessage.type === 'success' && (
        <SuccessAlert message={pageMessage.text} onClose={() => setPageMessage({ type: '', text: '' })} />
      )}
      {pageMessage.type === 'error' && (
        <ErrorAlert message={pageMessage.text} onClose={() => setPageMessage({ type: '', text: '' })} />
      )}

      <ManagerPageHeader
        title="Chi tiết trường hợp nghi trùng"
        description="So sánh hai phản ánh, kiểm tra bằng chứng AI và đưa ra kết luận cuối cùng."
        icon={Lucide.ScanSearch}
        statusLabel="MÃ ĐỀ XUẤT"
        statusValue={duplicateCandidateId ? `${String(duplicateCandidateId).slice(0, 8)}…` : '—'}
        actions={(
          <Button type="button" onClick={() => navigate('/staff/duplicates')} variant="ghost" size="sm">
            <Lucide.ArrowLeft size={16} />
            Quay lại danh sách
          </Button>
        )}
      />

      {loading ? (
        <div className="card bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-500">
          <span className="loading loading-spinner loading-sm mr-2" />
          Đang tải chi tiết trường hợp nghi trùng...
        </div>
      ) : error ? (
        <div className="card bg-rose-50 border border-rose-200 rounded-3xl p-10 text-center text-sm text-rose-700">
          {error}
        </div>
      ) : !candidate ? (
        <div className="card bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-500">
          Không tìm thấy dữ liệu cho trường hợp này.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="admin-panel p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Độ tương đồng</div>
              <div className="mt-1.5 text-2xl font-semibold text-slate-950">{confidenceValue !== null ? `${Math.round(confidenceValue)}%` : '—'}</div>
            </div>
            <div className="admin-panel p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Mức tin cậy</div>
              <div className="mt-1.5 text-2xl font-semibold text-slate-950">{confidenceLabel}</div>
            </div>
            <div className="admin-panel p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Trạng thái</div>
              <div className="mt-3">
                <Badge intent={getBadgeIntent(candidate?.status)} className={`${getStatusClass(candidate?.status)} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]`}>
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </div>

          {!parentIsEligibleMaster && candidateIsPending && (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl status-warning">
                <Lucide.AlertTriangle size={16} />
              </div>
              <div>
                <div className="font-semibold">Chưa thể xác nhận phản ánh trùng</div>
                <p className="mt-1 text-slate-700">{confirmBlockedMessage}</p>
              </div>
            </div>
          )}

          <section className="admin-panel overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Đối chiếu phản ánh</div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">So sánh hai phản ánh</h2>
                </div>
                <div className="text-xs font-medium text-slate-500">Giống / Khác được tính theo dữ liệu hiện tại</div>
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-2 xl:divide-x xl:divide-slate-200">
              <article className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500">Phản ánh mới</div>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-950">
                      {getTextValue(primaryFeedback?.title, '—')}
                    </h3>
                  </div>
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-semibold text-blue-700">A</span>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {primaryImages.length ? (
                    <img src={primaryImages[0]} alt="Phản ánh mới" className="h-56 w-full object-cover" />
                  ) : (
                    <div className="flex h-56 items-center justify-center text-slate-500">
                      <div className="text-center text-sm">
                        <Lucide.ImageOff size={26} className="mx-auto mb-2 text-slate-400" />
                        Không có ảnh
                      </div>
                    </div>
                  )}
                </div>
              </article>

              <article className="border-t border-slate-200 p-5 sm:p-6 xl:border-t-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Phản ánh nghi là chính</div>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-950">
                      {getTextValue(duplicateFeedback?.title, '—')}
                    </h3>
                  </div>
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-emerald-50 px-2 text-xs font-semibold text-emerald-700">B</span>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {duplicateImages.length ? (
                    <img src={duplicateImages[0]} alt="Phản ánh nghi là chính" className="h-56 w-full object-cover" />
                  ) : (
                    <div className="flex h-56 items-center justify-center text-slate-500">
                      <div className="text-center text-sm">
                        <Lucide.ImageOff size={26} className="mx-auto mb-2 text-slate-400" />
                        Không có ảnh
                      </div>
                    </div>
                  )}
                </div>
              </article>
            </div>

            <div className="border-t border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[34%]" />
                    <col className="w-[16%]" />
                    <col className="w-[34%]" />
                  </colgroup>
                  <thead className="bg-slate-50/85">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">Thuộc tính</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">Phản ánh mới</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">So sánh</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">Phản ánh chính</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {comparisonRows.map((row) => (
                      <tr key={row.label} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{row.label}</td>
                        <td className="px-5 py-3.5 text-slate-600">{row.a}</td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge
                            intent={row.match === 'same' ? 'success' : row.match === 'similar' ? 'info' : 'neutral'}
                            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]"
                          >
                            {row.match === 'same' ? 'Giống' : row.match === 'similar' ? 'Tương đồng' : 'Khác'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{row.b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="admin-panel overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4 md:flex-row md:items-center md:justify-between sm:px-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Bằng chứng AI</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Bằng chứng hỗ trợ</div>
              </div>
              <div className="text-sm text-slate-500">AI là dữ liệu tham khảo, cần kiểm định bởi staff.</div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
              {evidenceItems.slice(0, 4).map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${item.active ? 'status-success' : 'status-neutral'}`}>
                      <Lucide.CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {confirmModalOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl status-warning">
                <Lucide.AlertTriangle size={16} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">Xác nhận phản ánh trùng lặp?</h3>
                <p className="text-sm text-slate-600">
                  Hành động này sẽ đánh dấu đề xuất này là trùng lặp và loại khỏi hàng chờ Pending của hệ thống.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="btn btn-sm btn-ghost rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDuplicate}
                disabled={confirmLoading || !canConfirmDuplicate}
                className="btn btn-sm bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-lg"
              >
                {confirmLoading ? <span className="loading loading-spinner loading-xs" /> : <Lucide.Check size={14} />}
                {confirmLoading ? 'Đang xác nhận...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-50 p-2 text-rose-700">
                <Lucide.XCircle size={18} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">Xác định hai phản ánh không trùng?</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Hệ thống sẽ đánh dấu đề xuất này là <strong>Đã từ chối</strong>. Hai phản ánh vẫn được giữ độc lập và không được gộp.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="btn btn-sm btn-ghost rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectDuplicate}
                disabled={rejectLoading}
                className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white border-none rounded-lg"
              >
                {rejectLoading ? <span className="loading loading-spinner loading-xs" /> : <Lucide.XCircle size={14} />}
                {rejectLoading ? 'Đang từ chối...' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {candidateIsPending ? (
        <div className="sticky bottom-4 z-30 rounded-[22px] border border-slate-200 bg-white/95 px-4 py-3.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Kết luận của Staff</div>
              <div className="mt-1 text-sm font-medium text-slate-600">
                AI đề xuất độ tương đồng <strong className="text-slate-900">{confidenceValue !== null ? `${Math.round(confidenceValue)}%` : '—'}</strong>. Hãy kiểm tra dữ liệu trước khi quyết định.
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                className="btn btn-outline min-h-0 rounded-xl px-4 py-2.5"
              >
                <Lucide.XCircle size={15} className="mr-1.5" />
                Không trùng lặp
              </button>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                disabled={!canConfirmDuplicate || confirmLoading}
                title={!canConfirmDuplicate ? confirmBlockedMessage : undefined}
                className="btn btn-primary min-h-0 rounded-xl px-4 py-2.5 shadow-md shadow-blue-500/15"
              >
                <Lucide.CheckCircle2 size={15} className="mr-1.5" />
                Xác nhận trùng lặp
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${candidate?.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {candidate?.status === 'Confirmed' ? <Lucide.BadgeCheck size={18} /> : <Lucide.XCircle size={18} />}
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">Trường hợp đã được xử lý</div>
              <div className="mt-0.5 text-xs text-slate-500">Không còn hành động xử lý nào cho đề xuất này.</div>
            </div>
          </div>
          <Badge intent={getBadgeIntent(candidate?.status)} className={`${getStatusClass(candidate?.status)} px-3 py-1 text-[11px] font-semibold`}>
            {statusLabel}
          </Badge>
        </div>
      )}
    </div>
  );
};
