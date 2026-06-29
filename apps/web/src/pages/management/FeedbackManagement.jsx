// src/pages/management/FeedbackManagement.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi, toolsApi } from '@urbanmind/shared-api';

const STATUS_META = {
  Submitted: { label: 'Mới gửi', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  'AI Reviewed': { label: 'AI đã phân loại', className: 'bg-violet-50 text-violet-700 ring-violet-100' },
  AIReviewed: { label: 'AI đã phân loại', className: 'bg-violet-50 text-violet-700 ring-violet-100' },
  AiReviewed: { label: 'AI đã phân loại', className: 'bg-violet-50 text-violet-700 ring-violet-100' },
  Verified: { label: 'Đã xác minh', className: 'bg-sky-50 text-sky-700 ring-sky-100' },
  Assigned: { label: 'Đã phân công', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  Accepted: { label: 'Đã tiếp nhận', className: 'bg-cyan-50 text-cyan-700 ring-cyan-100' },
  InProgress: { label: 'Đang xử lý', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  Resolved: { label: 'Chờ nghiệm thu', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  Closed: { label: 'Đã đóng', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const PRIORITY_META = {
  Critical: { label: 'Khẩn cấp', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  High: { label: 'Cao', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  Medium: { label: 'Trung bình', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  Low: { label: 'Thấp', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const normalizeFeedbackResponse = (response) => {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.items,
    response?.data,
    response?.content,
    response?.result,
    response?.records,
    response?.feedbacks,
    response?.data?.items,
    response?.data?.content,
    response?.data?.result,
    response?.data?.records,
    response?.data?.feedbacks,
    response?.result?.items,
    response?.result?.content,
    response?.result?.records,
  ];

  const matchedArray = candidates.find(Array.isArray);
  return matchedArray || [];
};

const getCategoryName = (categoryId) => {
  const categories = typeof toolsApi.getCategories === 'function' ? toolsApi.getCategories() : [];
  return categories.find((category) => String(category.categoryId) === String(categoryId))?.categoryName || 'Chưa phân loại';
};

const formatFeedbackId = (feedbackId) => {
  if (!feedbackId) return '—';
  const value = String(feedbackId);
  const suffix = value.split('-').pop();
  return suffix ? `UM-${suffix.slice(0, 8).toUpperCase()}` : value;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
};

const getLocationText = (feedback) => {
  const lat = feedback?.latitude ?? feedback?.lat ?? feedback?.location?.latitude ?? feedback?.location?.lat;
  const lng = feedback?.longitude ?? feedback?.lng ?? feedback?.location?.longitude ?? feedback?.location?.lng;

  if (feedback?.locationText || feedback?.address) return feedback.locationText || feedback.address;
  if (lat && lng) return `Vị trí đã chọn: ${lat}, ${lng}`;
  return 'Chưa có vị trí';
};

const getStatusLabel = (status) => {
  return STATUS_META[status]?.label || status || 'Chưa rõ';
};

const getPriorityLabel = (priority) => {
  return PRIORITY_META[priority]?.label || priority || 'Trung bình';
};

const getFeedbackAuthorText = (feedback) => {
  return [
    feedback?.userName,
    feedback?.createdBy,
    feedback?.citizenName,
    feedback?.reporterName,
    feedback?.fullName,
    feedback?.email,
    feedback?.phone,
    feedback?.phoneNumber,
  ]
    .filter(Boolean)
    .join(' ');
};


const normalizeFeedbackDetailResponse = (response) => {
  return response?.data || response?.item || response?.result || response?.record || response;
};

const normalizeAttachment = (file) => {
  if (!file) return null;

  if (typeof file === 'string') {
    return {
      fileUrl: file,
      url: file,
      fileName: file.split('/').pop() || 'Tệp đính kèm',
    };
  }

  const fileUrl =
    file.fileUrl ||
    file.url ||
    file.path ||
    file.attachmentUrl ||
    file.displayUrl ||
    file.mediaUrl ||
    file.publicUrl ||
    file.downloadUrl ||
    '';

  return {
    ...file,
    attachmentId:
      file.attachmentId ||
      file.attachmentID ||
      file.feedbackAttachmentId ||
      file.feedbackAttachmentID ||
      file.fileId ||
      file.fileID ||
      file.id ||
      null,
    fileUrl,
    fileName:
      file.fileName ||
      file.name ||
      file.originalName ||
      file.originalFileName ||
      fileUrl?.split('/').pop() ||
      'Tệp đính kèm',
    mimeType: file.mimeType || file.contentType || file.type || '',
  };
};

const getFeedbackAttachments = (feedback) => {
  const candidates = [
    feedback?.attachments,
    feedback?.feedbackAttachments,
    feedback?.files,
    feedback?.media,
    feedback?.medias,
    feedback?.mediaFiles,
    feedback?.uploadedFiles,
    feedback?.evidenceFiles,
    feedback?.images,
    feedback?.videos,
    feedback?.attachmentUrls,
    feedback?.mediaUrls,
  ];

  return candidates
    .filter(Array.isArray)
    .flat()
    .map(normalizeAttachment)
    .filter((file) => file?.fileUrl || file?.url || file?.path || file?.attachmentUrl);
};

const getAttachmentUrl = (file) => {
  const normalized = normalizeAttachment(file);
  const raw = normalized?.fileUrl || normalized?.url || normalized?.path || normalized?.attachmentUrl || '';

  if (!raw) return '';

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('blob:') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
};

const isVideoAttachment = (file) => {
  const normalized = normalizeAttachment(file);
  const value = `${normalized?.mimeType || ''} ${getAttachmentUrl(normalized)} ${normalized?.fileName || ''}`.toLowerCase();

  return (
    value.includes('video/') ||
    value.includes('.mp4') ||
    value.includes('.webm') ||
    value.includes('.ogg') ||
    value.includes('.mov') ||
    value.includes('.m4v')
  );
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { label: getStatusLabel(status), className: 'bg-slate-100 text-slate-600 ring-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const meta = PRIORITY_META[priority] || { ...PRIORITY_META.Medium, label: getPriorityLabel(priority) };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, helper, tone = 'blue' }) => {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-900">{value || '—'}</p>
  </div>
);

const pauseAllVideos = () => {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('video').forEach((video) => {
    video.pause();
  });
};


const AttachmentGallery = ({ attachments }) => {
  const validAttachments = attachments
    .map((file) => {
      const normalized = normalizeAttachment(file);
      const fileUrl = getAttachmentUrl(normalized);
      if (!fileUrl) return null;

      return {
        ...normalized,
        fileUrl,
        isVideo: isVideoAttachment(normalized),
      };
    })
    .filter(Boolean);

  const [activeIndex, setActiveIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!validAttachments.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-medium text-slate-500">
        Không có hình ảnh hoặc video đính kèm.
      </div>
    );
  }

  const safeActiveIndex = Math.min(activeIndex, validAttachments.length - 1);
  const activeFile = validAttachments[safeActiveIndex];
  const hasMultipleFiles = validAttachments.length > 1;

  const showPrevious = () => {
    pauseAllVideos();
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? validAttachments.length - 1 : currentIndex - 1,
    );
  };

  const showNext = () => {
    pauseAllVideos();
    setActiveIndex((currentIndex) =>
      currentIndex === validAttachments.length - 1 ? 0 : currentIndex + 1,
    );
  };

  const openPreview = () => {
    pauseAllVideos();
    setPreviewOpen(true);
  };

  const closePreview = () => {
    pauseAllVideos();
    setPreviewOpen(false);
  };

  const previewFileName = activeFile.fileName || `Tệp ${safeActiveIndex + 1}`;

  const preview = previewOpen && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[90] bg-slate-950/85 text-white backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Đóng trình xem media"
        className="absolute inset-0"
        onClick={closePreview}
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-white px-3 text-sm font-semibold text-slate-950">
              {safeActiveIndex + 1}/{validAttachments.length}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{previewFileName}</p>
              <p className="text-xs text-white/55">
                {activeFile.isVideo ? 'Video đính kèm' : 'Hình ảnh đính kèm'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closePreview}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white hover:text-slate-950"
            aria-label="Đóng"
          >
            <Lucide.X size={20} />
          </button>
        </div>

        <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 items-center justify-center py-5">
          {hasMultipleFiles ? (
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/90 text-slate-950 shadow-2xl shadow-black/30 transition hover:scale-105 hover:bg-white sm:left-4"
              aria-label="Xem tệp trước"
            >
              <Lucide.ChevronLeft size={26} />
            </button>
          ) : null}

          <div className="mx-12 flex max-h-[calc(100vh-13rem)] w-full items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl shadow-black/40 sm:mx-20">
            {activeFile.isVideo ? (
              <video
                key={activeFile.fileUrl}
                src={activeFile.fileUrl}
                controls
                preload="metadata"
                className="max-h-[calc(100vh-13rem)] max-w-full object-contain"
              />
            ) : (
              <img
                src={activeFile.fileUrl}
                alt={previewFileName}
                className="max-h-[calc(100vh-13rem)] max-w-full object-contain"
              />
            )}
          </div>

          {hasMultipleFiles ? (
            <button
              type="button"
              onClick={showNext}
              className="absolute right-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/90 text-slate-950 shadow-2xl shadow-black/30 transition hover:scale-105 hover:bg-white sm:right-4"
              aria-label="Xem tệp tiếp theo"
            >
              <Lucide.ChevronRight size={26} />
            </button>
          ) : null}
        </div>

        {hasMultipleFiles ? (
          <div className="mx-auto flex w-full max-w-5xl gap-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/10 p-3 shadow-2xl shadow-black/20 backdrop-blur-md">
            {validAttachments.map((file, index) => {
              const isActive = index === safeActiveIndex;

              return (
                <button
                  key={file.attachmentId || file.fileUrl || index}
                  type="button"
                  onClick={() => {
                    pauseAllVideos();
                    setActiveIndex(index);
                  }}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition ${
                    isActive
                      ? 'border-white ring-2 ring-white/70'
                      : 'border-white/10 opacity-65 hover:opacity-100'
                  }`}
                  aria-label={`Xem tệp ${index + 1}`}
                >
                  {file.isVideo ? (
                    <>
                      <video src={file.fileUrl} preload="metadata" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-950/25 text-white">
                        <Lucide.PlayCircle size={22} />
                      </span>
                    </>
                  ) : (
                    <img
                      src={file.fileUrl}
                      alt={file.fileName || `Tệp ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl truncate rounded-full bg-white/10 px-4 py-2 text-center text-sm font-medium text-white/80 backdrop-blur-md">
            {previewFileName}
          </div>
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className="space-y-4" onClick={(event) => event.stopPropagation()}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
        <div className="relative flex aspect-[16/10] max-h-[430px] min-h-[260px] items-center justify-center bg-slate-950">
          {activeFile.isVideo ? (
            <video
              key={activeFile.fileUrl}
              src={activeFile.fileUrl}
              controls
              preload="metadata"
              className="max-h-full w-full bg-black object-contain"
            />
          ) : (
            <button type="button" onClick={openPreview} className="h-full w-full cursor-zoom-in" aria-label="Phóng to ảnh">
              <img
                src={activeFile.fileUrl}
                alt={activeFile.fileName || `Tệp ${safeActiveIndex + 1}`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </button>
          )}

          <button
            type="button"
            onClick={openPreview}
            className="absolute left-3 top-3 flex h-10 items-center gap-2 rounded-full bg-white/95 px-3 text-xs font-semibold text-slate-900 shadow-lg shadow-slate-950/15 transition hover:bg-white"
            aria-label="Phóng to media"
          >
            <Lucide.Maximize2 size={16} />
            Phóng to
          </button>

          {hasMultipleFiles ? (
            <>
              <button
                type="button"
                onClick={showPrevious}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/90 text-slate-900 shadow-lg shadow-slate-950/20 transition hover:scale-105 hover:bg-white"
                aria-label="Xem tệp trước"
              >
                <Lucide.ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={showNext}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/90 text-slate-900 shadow-lg shadow-slate-950/20 transition hover:scale-105 hover:bg-white"
                aria-label="Xem tệp tiếp theo"
              >
                <Lucide.ChevronRight size={20} />
              </button>
            </>
          ) : null}

          <div className="absolute right-3 top-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {safeActiveIndex + 1}/{validAttachments.length}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-3 text-xs font-medium text-slate-600">
          {activeFile.isVideo ? <Lucide.PlayCircle size={15} /> : <Lucide.Image size={15} />}
          <span className="truncate">{activeFile.fileName || `Tệp ${safeActiveIndex + 1}`}</span>
        </div>
      </div>

      {hasMultipleFiles ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {validAttachments.map((file, index) => {
            const isActive = index === safeActiveIndex;

            return (
              <button
                key={file.attachmentId || file.fileUrl || index}
                type="button"
                onClick={() => {
                  pauseAllVideos();
                  setActiveIndex(index);
                }}
                className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border bg-slate-100 transition ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
                aria-label={`Xem tệp ${index + 1}`}
              >
                {file.isVideo ? (
                  <>
                    <video src={file.fileUrl} preload="metadata" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/20 text-white">
                      <Lucide.PlayCircle size={22} />
                    </span>
                  </>
                ) : (
                  <img
                    src={file.fileUrl}
                    alt={file.fileName || `Tệp ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {preview}
    </div>
  );
};
const FeedbackDetailModal = ({ feedback, loadingDetail, detailError, onClose }) => {
  if (!feedback || typeof document === 'undefined') return null;

  const feedbackId = feedback.feedbackId || feedback.id;
  const attachments = getFeedbackAttachments(feedback);
  const handleClose = () => {
    pauseAllVideos();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Đóng chi tiết feedback"
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]"
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Lucide.MessageSquare size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-700">{formatFeedbackId(feedbackId)}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                {feedback.title || 'Feedback không có tiêu đề'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{getLocationText(feedback)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <Lucide.X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Danh mục" value={getCategoryName(feedback.categoryId)} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Ưu tiên</p>
              <div className="mt-2"><PriorityBadge priority={feedback.priority} /></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Trạng thái</p>
              <div className="mt-2"><StatusBadge status={feedback.status} /></div>
            </div>
            <DetailItem label="Ngày tạo" value={formatDate(feedback.createdAt)} />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Lucide.FileText size={16} />
              Nội dung phản ánh
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {feedback.description || feedback.content || feedback.title || 'Chưa có nội dung chi tiết.'}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Lucide.Images size={16} />
                Hình ảnh / video đính kèm
              </div>
              {loadingDetail ? (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="loading loading-spinner loading-xs" />
                  Đang tải tệp
                </span>
              ) : null}
            </div>

            {detailError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                Không thể tải đầy đủ tệp đính kèm. Bạn có thể thử mở lại chi tiết sau.
              </div>
            ) : loadingDetail ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm font-medium text-slate-500">
                Đang tải hình ảnh và video...
              </div>
            ) : (
              <AttachmentGallery attachments={attachments} />
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Vị trí" value={getLocationText(feedback)} />
            <DetailItem label="Người gửi" value={feedback.userName || feedback.createdBy || feedback.citizenName || 'Chưa có thông tin'} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={handleClose} className="btn btn-outline h-10 rounded-xl text-sm font-medium">
            Đóng
          </button>
          <Link
            to="/community/map"
            className="btn h-10 rounded-xl border-0 bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
            onClick={handleClose}
          >
            <Lucide.Map size={16} />
            Xem trên bản đồ
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedFeedbackLoading, setSelectedFeedbackLoading] = useState(false);
  const [selectedFeedbackError, setSelectedFeedbackError] = useState('');

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await managementFeedbackApi.getFeedbacks();
      setFeedbacks(normalizeFeedbackResponse(response));
    } catch (err) {
      console.error(err);
      setFeedbacks([]);
      setError(err?.message || 'Không thể tải danh sách feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleOpenFeedbackDetail = useCallback(async (feedback) => {
    const feedbackId = feedback?.feedbackId || feedback?.id;

    setSelectedFeedback(feedback);
    setSelectedFeedbackError('');

    if (!feedbackId) return;

    try {
      setSelectedFeedbackLoading(true);
      const response = await managementFeedbackApi.getFeedbackById(feedbackId);
      const detail = normalizeFeedbackDetailResponse(response);
      setSelectedFeedback((current) => ({ ...(current || feedback), ...(detail || {}) }));
    } catch (err) {
      console.error(err);
      setSelectedFeedbackError(err?.message || 'Không thể tải chi tiết feedback.');
    } finally {
      setSelectedFeedbackLoading(false);
    }
  }, []);

  const stats = useMemo(() => {
    const total = feedbacks.length;
    const open = feedbacks.filter((item) => !['Resolved', 'Closed'].includes(item.status)).length;
    const assigned = feedbacks.filter((item) => ['Assigned', 'Accepted', 'InProgress'].includes(item.status)).length;
    const completed = feedbacks.filter((item) => ['Resolved', 'Closed'].includes(item.status)).length;

    return { total, open, assigned, completed };
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return feedbacks.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const searchable = [
        item.feedbackId,
        formatFeedbackId(item.feedbackId || item.id),
        item.title,
        item.description,
        item.content,
        item.locationText,
        item.address,
        getLocationText(item),
        getCategoryName(item.categoryId),
        item.status,
        getStatusLabel(item.status),
        item.priority,
        getPriorityLabel(item.priority),
        getFeedbackAuthorText(item),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!keyword || searchable.includes(keyword));
    });
  }, [feedbacks, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 text-slate-700">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Lucide.MessageSquare size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Quản lý feedback
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Theo dõi phản ánh, trạng thái xử lý và các điểm cần điều phối.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:self-center">
            <button
              type="button"
              onClick={fetchFeedbacks}
              className="btn btn-outline h-11 rounded-xl border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={loading}
            >
              <Lucide.RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <Link
              to="/community/map"
              className="btn h-11 rounded-xl border-0 bg-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Lucide.Map size={16} />
              Xem bản đồ
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Lucide.Inbox} label="Tổng feedback" value={stats.total} helper="Tất cả phản ánh" tone="blue" />
        <StatCard icon={Lucide.AlertCircle} label="Đang mở" value={stats.open} helper="Cần theo dõi" tone="amber" />
        <StatCard icon={Lucide.Wrench} label="Đang xử lý" value={stats.assigned} helper="Đã điều phối" tone="slate" />
        <StatCard icon={Lucide.CheckCircle2} label="Hoàn tất" value={stats.completed} helper="Đã nghiệm thu/đóng" tone="emerald" />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Danh sách feedback</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredFeedbacks.length}/{feedbacks.length} phản ánh</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Lucide.Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm focus:border-blue-300 focus:outline-none sm:w-72"
                placeholder="Tìm mã, nội dung, vị trí, danh mục..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="select h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-blue-300 focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <span className="loading loading-spinner loading-lg text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Lucide.WifiOff size={24} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-950">Không thể tải feedback</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{error}</p>
            <button type="button" onClick={fetchFeedbacks} className="btn btn-outline mt-5 h-10 rounded-xl text-sm">
              <Lucide.RefreshCcw size={15} />
              Thử lại
            </button>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Lucide.MessageSquare size={24} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-950">Chưa có feedback phù hợp</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Thử thay đổi bộ lọc hoặc làm mới dữ liệu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-6 py-4">Mã</th>
                  <th className="px-6 py-4">Nội dung</th>
                  <th className="px-6 py-4">Danh mục</th>
                  <th className="px-6 py-4">Ưu tiên</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFeedbacks.map((feedback) => {
                  const feedbackId = feedback.feedbackId || feedback.id;
                  return (
                    <tr
                      key={feedbackId}
                      className="cursor-pointer transition hover:bg-slate-50/80"
                      onClick={() => handleOpenFeedbackDetail(feedback)}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-blue-700">{formatFeedbackId(feedbackId)}</td>
                      <td className="max-w-[320px] px-6 py-4">
                        <p className="truncate text-sm font-semibold text-slate-900">{feedback.title || 'Không có tiêu đề'}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{getLocationText(feedback)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{getCategoryName(feedback.categoryId)}</td>
                      <td className="px-6 py-4"><PriorityBadge priority={feedback.priority} /></td>
                      <td className="px-6 py-4"><StatusBadge status={feedback.status} /></td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(feedback.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenFeedbackDetail(feedback);
                          }}
                          className="btn btn-ghost h-9 min-h-0 rounded-xl px-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FeedbackDetailModal
        feedback={selectedFeedback}
        loadingDetail={selectedFeedbackLoading}
        detailError={selectedFeedbackError}
        onClose={() => setSelectedFeedback(null)}
      />
    </div>
  );
};
