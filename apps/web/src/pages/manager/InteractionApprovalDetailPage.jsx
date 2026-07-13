import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import { ManagerEmptyState, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';
import { getStatusLabel, managementTypes, PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';

const normalizeProviderReports = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return value && typeof value === 'object' ? [value] : [];
};

const normalizeDocuments = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.documents)) return value.documents;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const normalizeResolutions = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.resolutions)) return value.resolutions;
  if (Array.isArray(value?.data)) return value.data;
  return value ? [value] : [];
};

const getResolutionDate = (resolution) => (
  resolution?.resolvedAt ||
  resolution?.submittedAt ||
  resolution?.createdAt ||
  resolution?.updatedAt ||
  null
);

const pickLatestResolution = (items = []) => (
  [...items].sort((a, b) => (
    new Date(getResolutionDate(b) || 0) - new Date(getResolutionDate(a) || 0)
  ))[0] || null
);

const pickProviderReport = (reports = [], providerReportId) => {
  if (providerReportId !== undefined && providerReportId !== null) {
    const matchingReport = reports.find((report) => (
      Number(report?.providerReportId) === Number(providerReportId)
    ));
    if (matchingReport) return matchingReport;
  }

  return [...reports].sort((a, b) => (
    new Date(b?.reportedAt || b?.updatedAt || 0) -
    new Date(a?.reportedAt || a?.updatedAt || 0)
  ))[0] || null;
};

const isImageDocument = (document) => {
  const fileType = String(document?.fileType || '').toLowerCase();
  const fileUrl = String(document?.fileUrl || '').toLowerCase();
  return fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(fileUrl);
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getFileLabel = (document, index) => {
  const fallback = `Tài liệu ${index + 1}`;
  if (document?.fileName) return document.fileName;
  if (!document?.fileUrl) return fallback;
  try {
    const pathname = new URL(document.fileUrl).pathname;
    return decodeURIComponent(pathname.split('/').pop() || fallback);
  } catch {
    return fallback;
  }
};

const DetailValue = ({ label, children }) => (
  <div className="admin-inset-panel p-4">
    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</dt>
    <dd className="mt-2 text-sm font-semibold leading-6 text-slate-700">{children || '—'}</dd>
  </div>
);

export const InteractionApprovalDetailPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isInteractionView = location.pathname.startsWith('/manager/interactions/');
  const backPath = isInteractionView ? '/manager/interactions' : '/manager/approvals';
  const [feedback, setFeedback] = useState(null);
  const [providerReport, setProviderReport] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [resolutions, setResolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [note, setNote] = useState('');
  const [reworkReason, setReworkReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(null);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await managementFeedbackApi.getFeedbackById(feedbackId);
      setFeedback(detail);
      const [reportResult, resolutionsResult] = await Promise.allSettled([
        managementFeedbackApi.getProviderReports(feedbackId),
        managementFeedbackApi.getResolutions(feedbackId),
      ]);

      const reportList = reportResult.status === 'fulfilled'
        ? normalizeProviderReports(reportResult.value)
        : [];
      const resolutionList = resolutionsResult.status === 'fulfilled'
        ? normalizeResolutions(resolutionsResult.value)
        : [];
      const selectedResolution = pickLatestResolution(resolutionList);
      const selectedReport = pickProviderReport(reportList, selectedResolution?.providerReportId);

      setProviderReport(selectedReport);
      setResolutions(resolutionList);

      if (selectedReport?.providerReportId) {
        try {
          const documentResult = await managementFeedbackApi.getProviderReportCompletionDocuments(
            selectedReport.providerReportId
          );
          setDocuments(normalizeDocuments(documentResult));
        } catch (documentError) {
          console.warn('Failed to load completion documents', documentError);
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load approval detail', err);
      setMessage({ type: 'error', text: err?.message || 'Không thể tải chi tiết duyệt.' });
    } finally {
      setLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    if (feedbackId) loadFeedback();
  }, [feedbackId, loadFeedback]);

  const latestResolution = pickLatestResolution(
    resolutions.length > 0
      ? resolutions
      : feedback?.resolution
        ? [feedback.resolution]
        : []
  );

  const beforeImages = useMemo(() => {
    const attachments = Array.isArray(feedback?.attachments) ? feedback.attachments : [];
    return attachments
      .map((attachment) => typeof attachment === 'string' ? attachment : attachment?.fileUrl || attachment?.url || '')
      .filter(Boolean);
  }, [feedback]);

  const afterImages = useMemo(() => (
    documents
      .filter(isImageDocument)
      .map((document) => document?.fileUrl || '')
      .filter(Boolean)
  ), [documents]);

  const timelineItems = useMemo(() => [
    { status: managementTypes.feedbackStatus.SUBMITTED, subtitle: 'Người dân đã gửi phản ánh' },
    { status: managementTypes.feedbackStatus.AI_REVIEWED, subtitle: 'AI hoàn tất phân loại sơ bộ' },
    { status: managementTypes.feedbackStatus.VERIFIED, subtitle: 'Nhân viên đã xác minh thông tin' },
    { status: managementTypes.feedbackStatus.ASSIGNED, subtitle: 'Đã chuyển tới đơn vị phối hợp' },
    { status: managementTypes.feedbackStatus.IN_PROGRESS, subtitle: 'Đơn vị đang thực hiện xử lý' },
    { status: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL, subtitle: 'Kết quả đang chờ Manager quyết định' },
  ], []);

  const activeTimelineIndex = useMemo(() => {
    const map = {
      [managementTypes.feedbackStatus.SUBMITTED]: 0,
      [managementTypes.feedbackStatus.AI_REVIEWED]: 1,
      [managementTypes.feedbackStatus.VERIFIED]: 2,
      [managementTypes.feedbackStatus.ASSIGNED]: 3,
      [managementTypes.feedbackStatus.IN_PROGRESS]: 4,
      [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 5,
    };
    return map[feedback?.status] ?? -1;
  }, [feedback?.status]);

  const handleDecision = async (decision) => {
    const normalizedReworkReason = (reworkReason || note).trim();
    if (decision === 'rework' && !normalizedReworkReason) {
      setMessage({ type: 'error', text: 'Vui lòng nhập lý do yêu cầu làm lại.' });
      setConfirmingAction(null);
      return;
    }

    setSubmitting(true);
    try {
      if (decision === 'approve') {
        await managementFeedbackApi.approveFeedback(feedbackId, note);
        setMessage({ type: 'success', text: 'Đã duyệt kết quả xử lý.' });
      } else {
        await managementFeedbackApi.requestRework(feedbackId, normalizedReworkReason);
        setMessage({ type: 'success', text: 'Đã gửi yêu cầu làm lại.' });
      }
      await loadFeedback();
      navigate('/manager/approvals', { state: { refreshKey: Date.now() } });
    } catch (err) {
      console.error('Failed to complete approval decision', err);
      setMessage({ type: 'error', text: err?.message || 'Không thể cập nhật quyết định duyệt.' });
    } finally {
      setSubmitting(false);
      setConfirmingAction(null);
      setReworkReason('');
    }
  };

  if (loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải hồ sơ duyệt">
        <header className="admin-page-hero h-44 animate-pulse" />
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <section className="space-y-6">
            <article className="admin-panel h-52 animate-pulse" />
            <article className="admin-panel h-72 animate-pulse" />
          </section>
          <aside className="admin-panel h-[30rem] animate-pulse" />
        </section>
      </article>
    );
  }

  if (!feedback) {
    return (
      <article className="admin-page-shell space-y-6">
        <ManagerPageHeader
          title="Không tìm thấy hồ sơ"
          description="Hồ sơ có thể đã bị xóa hoặc tài khoản hiện tại không có quyền truy cập."
          icon={Lucide.FileQuestion}
        />
        <section className="admin-panel overflow-hidden">
          <ManagerEmptyState
            icon={Lucide.FileQuestion}
            title="Không có dữ liệu phản ánh"
            description="Quay lại hàng đợi duyệt và chọn một hồ sơ khác."
            action={(
              <button type="button" className="btn admin-primary-action rounded-2xl" onClick={() => navigate(backPath)}>
                Quay lại hàng đợi
              </button>
            )}
          />
        </section>
      </article>
    );
  }

  const isAwaitingApproval = feedback.status === managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL;

  return (
    <article className="admin-page-shell space-y-6">
      {message.type === 'success' ? (
        <aside aria-live="polite"><SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} /></aside>
      ) : null}
      {message.type === 'error' ? (
        <aside aria-live="assertive"><ErrorAlert title="Không thể hoàn tất thao tác" message={message.text} onClose={() => setMessage({ type: '', text: '' })} /></aside>
      ) : null}

      <ManagerPageHeader
        title={feedback.title || 'Chi tiết phản ánh'}
        description={isAwaitingApproval
          ? 'Đối chiếu nội dung phản ánh, kết quả Staff gửi, tài liệu của đơn vị xử lý và toàn bộ lịch sử trước khi ra quyết định.'
          : 'Theo dõi thông tin phản ánh, tiến trình phối hợp và dữ liệu kết quả theo trạng thái hiện tại.'}
        icon={Lucide.FileCheck2}
        statusLabel="Trạng thái"
        statusValue={getStatusLabel(feedback.status)}
        actions={(
          <button type="button" onClick={() => navigate(backPath)} className="btn admin-secondary-action rounded-2xl">
            <Lucide.ArrowLeft size={16} aria-hidden="true" />
            Quay lại
          </button>
        )}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <section className="space-y-6" aria-label="Nội dung hồ sơ duyệt">
          <article className="admin-panel overflow-hidden">
            <ManagerSectionHeader
              title="Thông tin phản ánh"
              description="Nội dung gốc do người dân cung cấp và dữ liệu phân loại hiện tại."
              icon={Lucide.MessageSquareText}
            />
            <section className="space-y-4 p-5 sm:p-6">
              <blockquote className="admin-inset-panel p-5 text-sm leading-7 text-slate-700">
                {feedback.description || 'Không có mô tả chi tiết.'}
              </blockquote>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailValue label="Mã phản ánh">{feedback.feedbackId}</DetailValue>
                <DetailValue label="Người gửi">{feedback.userName || 'Không xác định'}</DetailValue>
                <DetailValue label="Khu vực">{feedback.areaName || 'Chưa xác định'}</DetailValue>
                <DetailValue label="Danh mục">{feedback.categoryName || 'Chưa phân loại'}</DetailValue>
                <DetailValue label="Vị trí"><address className="not-italic">{feedback.locationText || 'Chưa có địa chỉ'}</address></DetailValue>
                <DetailValue label="Mức ưu tiên">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_BADGE_CLASSES[feedback.priority] || PRIORITY_BADGE_CLASSES.Medium}`}>
                    {feedback.priority || 'Medium'}
                  </span>
                </DetailValue>
              </dl>
            </section>
          </article>

          <article className="admin-panel overflow-hidden">
            <ManagerSectionHeader
              title="Kết quả xử lý mới nhất"
              description="Nội dung Staff gửi để đề nghị Manager phê duyệt."
              icon={Lucide.ClipboardCheck}
              actions={(
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[feedback.status] || STATUS_BADGE_CLASSES.SubmittedForApproval}`}>
                  {getStatusLabel(feedback.status)}
                </span>
              )}
            />
            <dl className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <DetailValue label="Tóm tắt kết quả">{latestResolution?.resolutionSummary}</DetailValue>
              <DetailValue label="Hành động đã thực hiện">{latestResolution?.actionTaken}</DetailValue>
              <DetailValue label="Ghi chú kết quả">{latestResolution?.resultNote}</DetailValue>
              <DetailValue label="Người gửi kết quả">{latestResolution?.createdByStaffUserName || 'Không xác định'}</DetailValue>
              <DetailValue label="Thời điểm gửi">{formatDateTime(getResolutionDate(latestResolution))}</DetailValue>
              <DetailValue label="Mã báo cáo đơn vị">{latestResolution?.providerReportId || 'Không liên kết'}</DetailValue>
            </dl>
          </article>

          <article className="admin-panel overflow-hidden">
            <ManagerSectionHeader
              title="Lịch sử kết quả xử lý"
              description="Mỗi lần Staff gửi lại kết quả được giữ nguyên để bảo đảm truy vết và minh bạch quyết định."
              icon={Lucide.History}
              actions={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{resolutions.length} lần gửi</span>}
            />
            {resolutions.length > 0 ? (
              <ol className="space-y-3 p-5 sm:p-6">
                {resolutions.map((resolution, index) => (
                  <li key={resolution.resolutionId || index}>
                    <article className="admin-inset-panel p-4">
                      <header className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-950">Lần gửi #{resolutions.length - index}</h3>
                        <time className="text-xs text-slate-500" dateTime={getResolutionDate(resolution) || undefined}>
                          {formatDateTime(getResolutionDate(resolution))}
                        </time>
                      </header>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        <DetailValue label="Tóm tắt">{resolution.resolutionSummary}</DetailValue>
                        <DetailValue label="Hành động">{resolution.actionTaken}</DetailValue>
                        <DetailValue label="Ghi chú">{resolution.resultNote}</DetailValue>
                        <DetailValue label="Nhân viên">{resolution.createdByStaffUserName || 'Không xác định'}</DetailValue>
                      </dl>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <ManagerEmptyState
                icon={Lucide.History}
                title="Chưa có lịch sử kết quả"
                description="API chưa trả về bản ghi resolution cho phản ánh này."
              />
            )}
          </article>

          <article className="admin-panel overflow-hidden">
            <ManagerSectionHeader
              title="Thông tin đơn vị xử lý"
              description="Báo cáo gần nhất liên kết với kết quả đang được duyệt."
              icon={Lucide.Building2}
            />
            <dl className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <DetailValue label="Đơn vị">{providerReport?.providerName || 'Chưa xác định'}</DetailValue>
              <DetailValue label="Điều phối viên">{providerReport?.coordinatorName || 'Chưa xác định'}</DetailValue>
              <DetailValue label="Trạng thái báo cáo">{providerReport?.reportStatus || 'Chưa xác định'}</DetailValue>
              <DetailValue label="Thời điểm chuyển">{formatDateTime(providerReport?.reportedAt)}</DetailValue>
              <DetailValue label="Cập nhật gần nhất">{formatDateTime(providerReport?.updatedAt)}</DetailValue>
              <DetailValue label="Ghi chú phối hợp">{providerReport?.reportNote || 'Không có ghi chú'}</DetailValue>
            </dl>
          </article>

          <article className="admin-panel overflow-hidden">
            <ManagerSectionHeader
              title="Tài liệu hoàn thành"
              description="Ảnh và tài liệu do đơn vị xử lý gửi để chứng minh kết quả thực hiện."
              icon={Lucide.Paperclip}
              actions={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{documents.length} tài liệu</span>}
            />
            {documents.length > 0 ? (
              <ul className="grid gap-3 p-5 md:grid-cols-2 sm:p-6">
                {documents.map((document, index) => (
                  <li key={document.completionDocumentId || document.fileUrl || index}>
                    <article className="admin-inset-panel h-full p-4">
                      <header className="flex items-start gap-3">
                        <span className="admin-mini-icon" aria-hidden="true">
                          {isImageDocument(document) ? <Lucide.Image size={17} /> : <Lucide.FileText size={17} />}
                        </span>
                        <span className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-950">{getFileLabel(document, index)}</h3>
                          <p className="mt-1 text-xs text-slate-500">{document.uploadedByUserName || 'Không xác định'} · {formatDateTime(document.receivedAt)}</p>
                        </span>
                      </header>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{document.description || 'Không có mô tả.'}</p>
                      {document.fileUrl ? (
                        <footer className="mt-4">
                          <a href={document.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                            <Lucide.ExternalLink size={14} aria-hidden="true" />
                            Mở tài liệu
                          </a>
                        </footer>
                      ) : null}
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <ManagerEmptyState
                icon={Lucide.FileX2}
                title="Chưa có tài liệu hoàn thành"
                description="Manager nên cân nhắc yêu cầu làm lại nếu hồ sơ cần bằng chứng nhưng đơn vị chưa gửi tài liệu."
              />
            )}
          </article>
        </section>

        <aside className="space-y-6" aria-label="Tiến trình và quyết định duyệt">
          <section className="admin-panel overflow-hidden">
            <ManagerSectionHeader
              title="Tiến trình xử lý"
              description="Các mốc chính trước khi hồ sơ đến bước duyệt."
              icon={Lucide.Workflow}
            />
            <ol className="space-y-3 p-5 sm:p-6">
              {timelineItems.map((item, index) => {
                const isActive = index === activeTimelineIndex;
                const isCompleted = index < activeTimelineIndex;
                return (
                  <li key={item.status} className="flex gap-3">
                    <span className="flex flex-col items-center" aria-hidden="true">
                      <span className={`h-3.5 w-3.5 rounded-full border-2 ${isActive ? 'border-blue-600 bg-blue-600' : isCompleted ? 'border-emerald-400 bg-emerald-400' : 'border-slate-300 bg-white'}`} />
                      {index < timelineItems.length - 1 ? <span className={`mt-1 w-px flex-1 ${isCompleted ? 'bg-emerald-300' : 'bg-slate-200'}`} /> : null}
                    </span>
                    <article className={`min-w-0 flex-1 rounded-2xl border p-3 ${isActive ? 'border-blue-200 bg-blue-50' : isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                      <h3 className="text-sm font-semibold text-slate-800">{getStatusLabel(item.status)}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.subtitle}</p>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="admin-panel overflow-hidden">
            <ManagerSectionHeader
              title="Đối chiếu hình ảnh"
              description="So sánh tình trạng ban đầu và bằng chứng sau xử lý."
              icon={Lucide.Images}
            />
            <section className="grid gap-4 p-5 sm:p-6">
              <figure className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                <figcaption className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">Trước xử lý</figcaption>
                <section className="mt-3 grid gap-3">
                  {beforeImages.length > 0 ? beforeImages.map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt={`Tình trạng trước xử lý ${index + 1}`} className="h-44 w-full rounded-xl object-cover" />
                  )) : <p className="rounded-xl border border-dashed border-rose-200 bg-white/70 p-8 text-center text-sm text-slate-500">Không có ảnh ban đầu.</p>}
                </section>
              </figure>

              <figure className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <figcaption className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Sau xử lý</figcaption>
                <section className="mt-3 grid gap-3">
                  {afterImages.length > 0 ? afterImages.map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt={`Kết quả sau xử lý ${index + 1}`} className="h-44 w-full rounded-xl object-cover" />
                  )) : <p className="rounded-xl border border-dashed border-emerald-200 bg-white/70 p-8 text-center text-sm text-slate-500">Không có ảnh hoàn thành.</p>}
                </section>
              </figure>
            </section>
          </section>

          <section className="admin-panel overflow-hidden xl:sticky xl:top-6">
            <ManagerSectionHeader
              title="Quyết định của Manager"
              description="Chỉ duyệt khi kết quả rõ ràng, bằng chứng phù hợp và nội dung nhất quán với phản ánh ban đầu."
              icon={Lucide.Gavel}
            />
            {isAwaitingApproval ? (
              <form className="space-y-4 p-5 sm:p-6" onSubmit={(event) => event.preventDefault()}>
                <fieldset>
                  <legend className="sr-only">Ghi chú phê duyệt</legend>
                  <label htmlFor="approval-note" className="text-sm font-semibold text-slate-700">Ghi chú quyết định</label>
                  <textarea
                    id="approval-note"
                    rows="4"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ghi nhận lý do duyệt hoặc nội dung cần lưu ý..."
                    className="textarea textarea-bordered mt-2 w-full rounded-2xl bg-white text-sm"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">Ghi chú duyệt là tùy chọn; khi yêu cầu làm lại, hệ thống bắt buộc phải có lý do.</p>
                </fieldset>

                <footer className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingAction('approve')}
                    disabled={submitting}
                    className="btn admin-primary-action rounded-2xl"
                  >
                    <Lucide.CheckCircle2 size={17} aria-hidden="true" />
                    Duyệt kết quả
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingAction('rework')}
                    disabled={submitting}
                    className="btn admin-secondary-action rounded-2xl text-amber-700"
                  >
                    <Lucide.RotateCcw size={17} aria-hidden="true" />
                    Yêu cầu làm lại
                  </button>
                </footer>
              </form>
            ) : (
              <section className="p-5 sm:p-6">
                <aside className="admin-info-note p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Chế độ chỉ xem</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Hồ sơ hiện ở trạng thái {getStatusLabel(feedback.status)}. Quyết định duyệt chỉ khả dụng khi trạng thái là Chờ nghiệm thu.</p>
                </aside>
              </section>
            )}
          </section>
        </aside>
      </section>

      {isAwaitingApproval && confirmingAction ? (
        <dialog open className="modal modal-open bg-transparent" aria-labelledby="approval-dialog-title">
          <form method="dialog" className="modal-box admin-panel max-w-lg p-6" onSubmit={(event) => event.preventDefault()}>
            <header className="flex items-start gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${confirmingAction === 'approve' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`} aria-hidden="true">
                {confirmingAction === 'approve' ? <Lucide.BadgeCheck size={20} /> : <Lucide.RotateCcw size={20} />}
              </span>
              <span>
                <h2 id="approval-dialog-title" className="text-lg font-semibold text-slate-950">
                  {confirmingAction === 'approve' ? 'Xác nhận duyệt kết quả' : 'Yêu cầu Staff làm lại'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {confirmingAction === 'approve'
                    ? 'Sau khi duyệt, người dân có thể đánh giá kết quả và đóng phản ánh.'
                    : 'Lý do sẽ được gửi lại để Staff bổ sung hoặc chỉnh sửa kết quả xử lý.'}
                </p>
              </span>
            </header>

            {confirmingAction === 'rework' ? (
              <fieldset className="mt-5">
                <legend className="sr-only">Lý do yêu cầu làm lại</legend>
                <label htmlFor="rework-reason" className="text-sm font-semibold text-slate-700">Lý do làm lại <span className="text-rose-600">*</span></label>
                <textarea
                  id="rework-reason"
                  rows="4"
                  value={reworkReason}
                  onChange={(event) => setReworkReason(event.target.value)}
                  placeholder="Ví dụ: thiếu ảnh hoàn thành, mô tả kết quả chưa rõ..."
                  className="textarea textarea-bordered mt-2 w-full rounded-2xl bg-white text-sm"
                  required
                />
              </fieldset>
            ) : null}

            <footer className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmingAction(null)} className="btn admin-secondary-action rounded-2xl" disabled={submitting}>
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDecision(confirmingAction)}
                className="btn admin-primary-action rounded-2xl"
                disabled={submitting}
              >
                {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
                {confirmingAction === 'approve' ? 'Xác nhận duyệt' : 'Gửi yêu cầu'}
              </button>
            </footer>
          </form>
          <form method="dialog" className="modal-backdrop">
            <button type="button" aria-label="Đóng hộp thoại" onClick={() => setConfirmingAction(null)}>close</button>
          </form>
        </dialog>
      ) : null}
    </article>
  );
};
