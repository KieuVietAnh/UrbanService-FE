import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi, toolsApi } from '@urbanmind/shared-api';
import { managementTypes } from '@urbanmind/shared-types';
import FeedbackLocationMapCard from '../../components/maps/FeedbackLocationMapCard';

const STATUS_META = {
  [managementTypes.feedbackStatus.SUBMITTED]: { label: 'Mới gửi', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  [managementTypes.feedbackStatus.AI_REVIEWED]: { label: 'AI đã phân loại', className: 'bg-violet-50 text-violet-700 ring-violet-100' },
  [managementTypes.feedbackStatus.VERIFIED]: { label: 'Đã xác minh', className: 'bg-sky-50 text-sky-700 ring-sky-100' },
  [managementTypes.feedbackStatus.ASSIGNED]: { label: 'Đã phân công', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  [managementTypes.feedbackStatus.IN_PROGRESS]: { label: 'Đang xử lý', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  [managementTypes.feedbackStatus.RESOLVED]: { label: 'Chờ nghiệm thu', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  [managementTypes.feedbackStatus.CLOSED]: { label: 'Đã đóng', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const PRIORITY_META = {
  Critical: { label: 'Khẩn cấp', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  High: { label: 'Cao', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  Medium: { label: 'Trung bình', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  Low: { label: 'Thấp', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const CATEGORY_TRANSLATIONS = {
  'street lighting': 'Chiếu sáng công cộng',
  lighting: 'Chiếu sáng công cộng',
  'road damage': 'Hư hỏng đường bộ',
  roads: 'Đường bộ',
  sanitation: 'Vệ sinh môi trường',
  waste: 'Rác thải',
  drainage: 'Thoát nước',
  traffic: 'Giao thông',
};

const normalizeResponse = (response) => response?.data || response?.item || response?.result || response?.record || response;

const formatFeedbackId = (feedbackId) => {
  if (!feedbackId) return '—';
  const value = String(feedbackId);
  const suffix = value.split('-').pop();
  return suffix ? `UM-${suffix.slice(0, 8).toUpperCase()}` : value;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const localizeCategoryName = (value) => {
  if (!value) return 'Chưa phân loại';
  return CATEGORY_TRANSLATIONS[String(value).trim().toLowerCase()] || value;
};

const getCategoryName = (feedback, categories) => {
  const value = feedback?.categoryName
    || categories.find((item) => String(item.categoryId) === String(feedback?.categoryId))?.categoryName;
  return localizeCategoryName(value);
};

const getLocationText = (feedback) => feedback?.areaName || feedback?.locationText || feedback?.address || 'Chưa có thông tin vị trí';
const getReporter = (feedback) => feedback?.userName || feedback?.reporterName || feedback?.citizenName || feedback?.createdBy || feedback?.email || 'Chưa có thông tin';

const normalizeAttachment = (file) => {
  if (!file) return null;
  if (typeof file === 'string') return { id: file, url: file, name: file.split('/').pop() || 'Tệp đính kèm', mimeType: '' };
  const url = file.fileUrl || file.url || file.path || file.attachmentUrl || file.mediaUrl || file.publicUrl || file.downloadUrl || '';
  if (!url) return null;
  return {
    id: file.attachmentId || file.feedbackAttachmentId || file.fileId || file.id || url,
    url: url.startsWith('http') || url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:') ? url : `/${url}`,
    name: file.fileName || file.name || file.originalName || url.split('/').pop() || 'Tệp đính kèm',
    mimeType: file.mimeType || file.contentType || file.type || '',
  };
};

const getAttachments = (feedback) => [
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
].filter(Array.isArray).flat().map(normalizeAttachment).filter(Boolean);

const isVideo = (file) => /video\/|\.mp4|\.webm|\.mov|\.m4v|\.ogg/i.test(`${file?.mimeType || ''} ${file?.url || ''}`);

const Badge = ({ type, value }) => {
  const meta = type === 'status'
    ? STATUS_META[value] || { label: value || 'Chưa rõ', className: 'bg-slate-100 text-slate-700 ring-slate-200' }
    : PRIORITY_META[value] || PRIORITY_META.Medium;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.className}`}>{meta.label}</span>;
};

const SectionHeading = ({ icon: Icon, title, description, action }) => (
  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
    <div className="flex min-w-0 items-start gap-3">
      <span className="admin-mini-icon" aria-hidden="true"><Icon size={17} /></span>
      <div className="min-w-0">
        <h2 className="admin-section-title">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}
      </div>
    </div>
    {action}
  </header>
);

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500" aria-hidden="true">
      <Icon size={15} />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">{value || '—'}</p>
    </div>
  </div>
);

export const FeedbackDetailPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [feedback, setFeedback] = useState(location.state?.feedback || null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMedia, setActiveMedia] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [failedMedia, setFailedMedia] = useState(() => new Set());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [detailResponse, categoryResponse] = await Promise.all([
          managementFeedbackApi.getFeedbackById(feedbackId),
          toolsApi.getCategories().catch(() => []),
        ]);
        if (!mounted) return;
        setFeedback((current) => ({ ...(current || {}), ...(normalizeResponse(detailResponse) || {}) }));
        setCategories(Array.isArray(categoryResponse) ? categoryResponse : []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Không thể tải chi tiết phản ánh.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [feedbackId]);

  const attachments = useMemo(() => getAttachments(feedback), [feedback]);
  const safeActiveIndex = Math.min(activeMedia, Math.max(attachments.length - 1, 0));
  const currentMedia = attachments[safeActiveIndex];
  const activePreview = previewIndex === null ? null : attachments[previewIndex];
  const activePreviewIsVideo = isVideo(activePreview);

  const movePreview = (direction) => {
    if (attachments.length < 2) return;
    setPreviewIndex((current) => {
      const safeCurrent = Number.isInteger(current) ? current : 0;
      return (safeCurrent + direction + attachments.length) % attachments.length;
    });
  };
  const latitude = feedback?.latitude ?? feedback?.lat ?? feedback?.location?.latitude ?? feedback?.location?.lat;
  const longitude = feedback?.longitude ?? feedback?.lng ?? feedback?.location?.longitude ?? feedback?.location?.lng;
  const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  useEffect(() => {
    setActiveMedia(0);
    setPreviewIndex(null);
    setFailedMedia(new Set());
  }, [feedbackId]);

  useEffect(() => {
    if (previewIndex === null) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPreviewIndex(null);
      if (event.key === 'ArrowLeft') {
        setPreviewIndex((current) => (current - 1 + attachments.length) % attachments.length);
      }
      if (event.key === 'ArrowRight') {
        setPreviewIndex((current) => (current + 1) % attachments.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [previewIndex, attachments.length]);

  const goBack = () => {
    navigate('/management/feedbacks', {
      state: {
        restoreFeedbackId: feedbackId,
        preserveScrollOnEnter: true,
      },
    });
  };

  const markMediaFailed = (file) => {
    setFailedMedia((current) => {
      const next = new Set(current);
      next.add(file?.id || file?.url);
      return next;
    });
  };

  if (loading && !feedback) {
    return (
      <div className="admin-page-shell flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-blue-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">Đang tải chi tiết phản ánh...</p>
        </div>
      </div>
    );
  }

  if (error && !feedback) {
    return (
      <div className="admin-page-shell">
        <div className="admin-panel mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Lucide.CircleAlert size={24} /></span>
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Không thể mở phản ánh</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <button type="button" onClick={goBack} className="btn admin-primary-action mt-5 h-10 rounded-xl px-5 text-sm font-semibold normal-case">Quay lại danh sách</button>
        </div>
      </div>
    );
  }

  const title = feedback?.title || 'Phản ánh không có tiêu đề';
  const description = feedback?.description || feedback?.content || 'Chưa có nội dung chi tiết.';

  return (
    <div className="admin-page-shell space-y-5 pb-4">
      <button type="button" onClick={goBack} className="admin-secondary-link inline-flex h-10 items-center gap-2 px-3.5 text-sm font-semibold transition">
        <Lucide.ArrowLeft size={16} />
        Quay lại danh sách
      </button>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          <Lucide.TriangleAlert className="mt-0.5 shrink-0" size={17} />
          <p>Không thể cập nhật dữ liệu mới nhất. Trang đang hiển thị thông tin đã tải trước đó.</p>
        </div>
      ) : null}

      <header className="admin-page-hero">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700"><Lucide.Hash size={14} />{formatFeedbackId(feedbackId)}</span>
              <Badge type="status" value={feedback?.status} />
              <Badge type="priority" value={feedback?.priority} />
              {loading ? <span className="loading loading-spinner loading-xs text-blue-600" aria-label="Đang cập nhật" /> : null}
            </div>
            <h1 className="admin-hero-title mt-3 max-w-4xl break-words">{title}</h1>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex min-w-0 items-center gap-2"><Lucide.MapPin size={16} className="shrink-0 text-slate-400" /><span className="break-words">{getLocationText(feedback)}</span></span>
              <span className="inline-flex items-center gap-2"><Lucide.Clock3 size={16} className="text-slate-400" />Gửi lúc {formatDateTime(feedback?.createdAt)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-5 border-0 bg-transparent shadow-none" style={{ background: 'transparent' }}>
          <section className="admin-panel overflow-hidden">
            <SectionHeading icon={Lucide.FileText} title="Nội dung phản ánh" description="Thông tin do người dân cung cấp" />
            <div className="px-5 py-5 sm:px-6">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">{description}</p>
            </div>
          </section>

          <section className="admin-panel overflow-hidden">
            <SectionHeading
              icon={Lucide.Images}
              title="Hình ảnh và video"
              description={attachments.length ? `${attachments.length} tệp đính kèm` : 'Không có tệp đính kèm'}
              action={attachments.length > 1 ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{safeActiveIndex + 1}/{attachments.length}</span> : null}
            />
            <div className="p-4 sm:p-5">
              {attachments.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(safeActiveIndex)}
                    className="group relative flex aspect-video min-h-[260px] max-h-[520px] w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45"
                    aria-label={`Mở xem toàn màn hình tệp ${safeActiveIndex + 1}`}
                  >
                    {failedMedia.has(currentMedia?.id || currentMedia?.url) ? (
                      <div className="px-6 text-center text-slate-300">
                        <Lucide.ImageOff className="mx-auto" size={32} />
                        <p className="mt-3 text-sm font-medium">Không thể tải tệp này</p>
                      </div>
                    ) : isVideo(currentMedia) ? (
                      <>
                        <video key={currentMedia.url} src={currentMedia.url} muted playsInline preload="metadata" onError={() => markMediaFailed(currentMedia)} className="pointer-events-none h-full max-h-[520px] w-full object-contain" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/20">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white backdrop-blur">
                            <Lucide.Play size={24} fill="currentColor" aria-hidden="true" />
                          </span>
                        </span>
                      </>
                    ) : (
                      <img src={currentMedia.url} alt={currentMedia.name || 'Hình ảnh phản ánh'} onError={() => markMediaFailed(currentMedia)} className="h-full max-h-[520px] w-full object-contain" />
                    )}
                    {!failedMedia.has(currentMedia?.id || currentMedia?.url) ? (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/55 px-3 py-2 text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Lucide.Maximize2 size={14} aria-hidden="true" />
                        Xem toàn màn hình
                      </span>
                    ) : null}
                  </button>

                  {attachments.length > 1 ? (
                    <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1" aria-label="Danh sách tệp đính kèm">
                      {attachments.map((file, index) => {
                        const selected = index === safeActiveIndex;
                        const failed = failedMedia.has(file.id || file.url);
                        return (
                          <button
                            key={file.id || `${file.url}-${index}`}
                            type="button"
                            onClick={() => setActiveMedia(index)}
                            aria-label={`Xem tệp ${index + 1}: ${file.name}`}
                            aria-pressed={selected}
                            className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${selected ? 'border-blue-500 shadow-sm' : 'border-transparent hover:border-slate-300'}`}
                          >
                            {failed ? <Lucide.ImageOff className="absolute inset-0 m-auto text-slate-400" size={20} /> : isVideo(file) ? <><video src={file.url} preload="metadata" className="h-full w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-slate-950/30 text-white"><Lucide.PlayCircle size={21} /></span></> : <img src={file.url} alt="" loading="lazy" onError={() => markMediaFailed(file)} className="h-full w-full object-cover" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="admin-empty-panel flex min-h-40 items-center justify-center px-5 py-10 text-center">
                  <div>
                    <Lucide.ImageOff className="mx-auto text-slate-300" size={30} />
                    <p className="mt-3 text-sm font-semibold text-slate-600">Chưa có hình ảnh hoặc video</p>
                    <p className="mt-1 text-xs text-slate-400">Phản ánh này không kèm theo tệp minh chứng.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <FeedbackLocationMapCard
            feedbackId={feedbackId}
            latitude={latitude}
            longitude={longitude}
            locationText={feedback?.locationText || feedback?.address}
            areaName={feedback?.areaName}
            variant="admin"
          />
        </main>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
          <section className="admin-panel overflow-hidden">
            <SectionHeading icon={Lucide.Info} title="Thông tin phản ánh" />
            <div className="divide-y divide-slate-200 px-5 py-4">
              <DetailRow icon={Lucide.Tag} label="Danh mục" value={getCategoryName(feedback, categories)} />
              <DetailRow icon={Lucide.UserRound} label="Người gửi" value={getReporter(feedback)} />
              <DetailRow icon={Lucide.CalendarPlus} label="Ngày tiếp nhận" value={formatDateTime(feedback?.createdAt)} />
              <DetailRow icon={Lucide.RefreshCw} label="Cập nhật gần nhất" value={formatDateTime(feedback?.updatedAt || feedback?.updatedDate)} />
            </div>
          </section>

          <section className="admin-panel overflow-hidden">
            <SectionHeading icon={Lucide.Navigation} title="Điều hướng" />
            <div className="space-y-2.5 p-5">
              <button
                type="button"
                disabled={!hasCoordinates}
                onClick={() => navigate('/community/map', { state: { focusFeedbackId: feedbackId, focusLatitude: Number(latitude), focusLongitude: Number(longitude) } })}
                className="btn admin-primary-action h-11 w-full rounded-xl text-sm font-semibold normal-case disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Lucide.MapPinned size={17} />
                Mở vị trí trên bản đồ
              </button>
              <button type="button" onClick={goBack} className="btn admin-secondary-action h-11 w-full rounded-xl text-sm font-semibold normal-case">
                <Lucide.List size={17} />
                Về danh sách phản ánh
              </button>
              {!hasCoordinates ? <p className="pt-1 text-center text-xs leading-5 text-slate-400">Phản ánh chưa có tọa độ bản đồ.</p> : null}
            </div>
          </section>
        </aside>
      </div>

      {activePreview && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100000] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black"
              role="dialog"
              aria-modal="true"
              aria-label={`Xem tệp đính kèm ${previewIndex + 1}`}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setPreviewIndex(null);
              }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent px-4 pb-16 pt-4 sm:px-6">
                <p className="text-sm font-semibold text-white">Minh chứng phản ánh</p>
                <p className="mt-1 text-xs text-white/65">{previewIndex + 1} / {attachments.length}</p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="absolute right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/80 sm:right-6"
                aria-label="Đóng xem trước"
              >
                <Lucide.X size={21} aria-hidden="true" />
              </button>

              <div className="flex h-full w-full items-center justify-center px-4 py-4 sm:px-20 sm:py-6">
                {activePreviewIsVideo ? (
                  <video
                    key={activePreview.url}
                    src={activePreview.url}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-full max-w-full object-contain"
                  >
                    Trình duyệt của bạn không hỗ trợ phát video.
                  </video>
                ) : (
                  <img
                    src={activePreview.url}
                    alt={`Minh chứng ${previewIndex + 1}`}
                    className="max-h-full max-w-full select-none object-contain"
                    draggable="false"
                  />
                )}
              </div>

              {attachments.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => movePreview(-1)}
                    className="absolute left-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/80 sm:left-6 sm:h-14 sm:w-14"
                    aria-label="Xem tệp trước"
                  >
                    <Lucide.ChevronLeft size={28} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePreview(1)}
                    className="absolute right-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/80 sm:right-6 sm:h-14 sm:w-14"
                    aria-label="Xem tệp tiếp theo"
                  >
                    <Lucide.ChevronRight size={28} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default FeedbackDetailPage;
