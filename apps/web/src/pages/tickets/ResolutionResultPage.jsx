import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { getStatusLabel, managementTypes, PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';
import PageTransition from '../../components/motion/PageTransition';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';

const normalizeImageList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return [value];
  return [];
};

const getAttachmentUrl = (file) => {
  if (!file) return '';
  if (typeof file === 'string') return file;
  return file.fileUrl || file.url || file.path || file.attachmentUrl || '';
};

const isVideoFile = (url = '') => {
  const value = String(url).toLowerCase();
  return value.includes('.mp4') || value.includes('.webm') || value.includes('.ogg') || value.includes('.mov') || value.includes('.m4v');
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const formatDuration = (start, end) => {
  if (!start || !end) return '—';
  const diffMs = new Date(end) - new Date(start);
  const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  if (diffDays === 1) return '1 ngày';
  return `${diffDays} ngày`;
};

export const ResolutionResultPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [comparisonPercent, setComparisonPercent] = useState(55);
  const [rating, setRating] = useState(5);
  const [satisfied, setSatisfied] = useState(true);
  const [reviewComment, setReviewComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    const loadTicket = async () => {
      try {
        setLoading(true);
        setError('');
        const detail = await ticketApi.getTicketById(feedbackId, { role: 'service-user' });
        const resolvedTicket = detail?.data || detail?.item || detail?.result || detail || null;
        setTicket(resolvedTicket);
      } catch (err) {
        console.error('Failed to load resolution result', err);
        setError(err?.message || 'Không thể tải kết quả xử lý.');
      } finally {
        setLoading(false);
      }
    };

    if (feedbackId) {
      loadTicket();
    }
  }, [feedbackId]);

  const beforeImages = useMemo(() => {
    const direct = normalizeImageList(ticket?.attachments || []).map(getAttachmentUrl);
    return direct.filter(Boolean);
  }, [ticket]);

  const afterImages = useMemo(() => {
    const resolutionAttachments = [
      ticket?.resolution?.afterAttachments,
      ticket?.resolution?.attachments,
      ticket?.resolution?.evidenceAttachments,
      ticket?.resolution?.imageUrls,
    ];

    return resolutionAttachments
      .flatMap((entry) => normalizeImageList(entry))
      .map(getAttachmentUrl)
      .filter(Boolean);
  }, [ticket]);

  const latestResolutionHistory = useMemo(() => {
    const histories = Array.isArray(ticket?.statusHistories)
      ? [...ticket.statusHistories]
      : [];
    const relevantStatuses = new Set([
      managementTypes.feedbackStatus.RESOLVED,
      managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
      managementTypes.feedbackStatus.APPROVED,
      managementTypes.feedbackStatus.CLOSED,
    ]);

    return histories
      .filter((item) => relevantStatuses.has(item?.newStatus || item?.status))
      .sort((a, b) => new Date(b?.changedAt || 0) - new Date(a?.changedAt || 0))[0] || null;
  }, [ticket]);

  const resolutionDate = (
    ticket?.resolution?.resolvedAt ||
    latestResolutionHistory?.changedAt ||
    ticket?.updatedAt ||
    ticket?.resolvedAt ||
    ticket?.createdAt
  );
  const resolutionSummary = (
    ticket?.resolution?.resolutionSummary ||
    ticket?.resolution?.summary ||
    latestResolutionHistory?.note ||
    'Kết quả đã được phê duyệt. API người dân hiện chưa trả về phần mô tả chi tiết của resolution.'
  );
  const resultNote = (
    ticket?.resolution?.resultNote ||
    ticket?.resolution?.notes ||
    ticket?.resolution?.note ||
    latestResolutionHistory?.note ||
    'Chưa có ghi chú chi tiết trong dữ liệu người dân được phép xem.'
  );
  const processingDuration = useMemo(() => formatDuration(ticket?.createdAt, resolutionDate), [ticket, resolutionDate]);

  const timelineItems = useMemo(() => {
    const items = [];

    if (ticket?.createdAt) {
      items.push({ title: 'Phản ánh được gửi', subtitle: 'Cư dân đã cung cấp thông tin và minh chứng.', date: ticket.createdAt, tone: 'info' });
    }

    if (ticket?.assignment?.operatorName) {
      items.push({ title: 'Đơn vị xử lý tiếp nhận', subtitle: ticket.assignment.operatorName, date: ticket.assignment.assignedAt || ticket.updatedAt, tone: 'accent' });
    }

    if ([managementTypes.feedbackStatus.IN_PROGRESS, managementTypes.feedbackStatus.RESOLVED, managementTypes.feedbackStatus.CLOSED].includes(ticket?.status)) {
      items.push({ title: 'Đang triển khai xử lý', subtitle: 'Đội ngũ đang thực hiện và giám sát tiến độ.', date: ticket.updatedAt || ticket.createdAt, tone: 'warning' });
    }

    if (resolutionDate) {
      items.push({ title: 'Hoàn tất xử lý', subtitle: 'Kết quả đã sẵn sàng để người dân xem.', date: resolutionDate, tone: 'success' });
    }

    return items;
  }, [resolutionDate, ticket]);

  const handleSubmitRating = async (event) => {
    event.preventDefault();
    if (!feedbackId) return;

    setRatingLoading(true);
    try {
      await ticketApi.submitReview(feedbackId, user?.userId, rating, satisfied, reviewComment, { role: user?.role || 'service-user' });
      const refreshed = await ticketApi.getTicketById(feedbackId, { role: 'service-user' });
      const refreshedTicket = refreshed?.data || refreshed?.item || refreshed?.result || refreshed;
      setTicket((current) => ({ ...(refreshedTicket || current), status: managementTypes.feedbackStatus.CLOSED }));
      setMessage({ type: 'success', text: 'Cảm ơn bạn đã đánh giá. Phản ánh đã được đóng.' });
    } catch (err) {
      console.error('Failed to submit review', err);
      setMessage({ type: 'error', text: err?.message || 'Không thể gửi đánh giá lúc này.' });
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="page-container space-y-6 py-4">
          <div className="animate-pulse rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-48 rounded-full bg-slate-100" />
            <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-100" />
            <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-80 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" />
            <div className="h-80 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!ticket) {
    return (
      <PageTransition>
        <div className="page-container py-6">
          <ErrorAlert title="Không thể xem kết quả" message={error || 'Chúng tôi không tìm thấy phản ánh này.'} />
          <button onClick={() => navigate('/tickets')} className="btn btn-primary mt-4 rounded-2xl">Quay lại danh sách</button>
        </div>
      </PageTransition>
    );
  }

  const statusLabel = getStatusLabel(ticket.status, ticket.status || 'Đang cập nhật');
  const statusTone = STATUS_BADGE_CLASSES[ticket.status] || 'bg-slate-100 text-slate-700';
  const priorityTone = PRIORITY_BADGE_CLASSES[ticket.priority] || PRIORITY_BADGE_CLASSES.Medium;
  const canSubmitReview = [
    managementTypes.feedbackStatus.APPROVED,
    managementTypes.feedbackStatus.RESOLVED, // backward compatibility
  ].includes(ticket.status);

  return (
    <PageTransition>
      <div className="page-container space-y-6 py-4 text-slate-800">
        {message.type === 'success' && <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}
        {message.type === 'error' && <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}

        <header className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-6 text-white shadow-[0_24px_60px_-24px_rgba(16,185,129,0.55)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] backdrop-blur">
                <Lucide.CheckCircle2 size={16} />
                Kết quả đã hoàn tất
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-black leading-tight sm:text-3xl">{ticket.title || 'Kết quả xử lý phản ánh'}</h1>
                <p className="max-w-2xl text-sm text-emerald-50/95 sm:text-base">
                  Đây là bản tóm tắt rõ ràng về cách phản ánh của bạn đã được xử lý, kết quả thực tế và tiến độ hoàn thiện.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/20 bg-white/12 p-4 text-sm backdrop-blur-sm sm:min-w-[260px]">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-emerald-50">Trạng thái</span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${statusTone}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-emerald-50">Hoàn tất lúc</span>
                <span className="font-semibold text-white">{formatDate(resolutionDate)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-emerald-50">Thời gian xử lý</span>
                <span className="font-semibold text-white">{processingDuration}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Thông tin phản ánh</p>
                <h2 className="mt-2 text-xl font-black text-slate-900">{ticket.title}</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${priorityTone}`}>
                Ưu tiên {ticket.priority || 'Trung bình'}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Danh mục</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{ticket.categoryName || 'Chưa xác định'}</p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Đơn vị xử lý</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{ticket.assignment?.operatorName || 'Đang cập nhật'}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Lucide.FileText size={16} className="text-emerald-600" />
                Tóm tắt kết quả xử lý
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {resolutionSummary}
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Lucide.MessageSquareMore size={16} className="text-cyan-600" />
              Ghi chú từ đơn vị xử lý
            </div>
            <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-7 text-slate-600">
                {resultNote}
              </p>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
                <span className="font-semibold text-slate-700">Ngày xử lý</span>
                <span>{formatDate(resolutionDate)}</span>
              </div>
              <div className="flex items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
                <span className="font-semibold text-slate-700">Địa điểm</span>
                <span>{ticket.locationText || 'Không có thông tin'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">So sánh trước và sau</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">Minh chứng xử lý rõ ràng</h2>
              <p className="mt-1 text-sm text-slate-500">Bản so sánh này giúp bạn thấy sự thay đổi thực tế sau khi đơn vị xử lý hoàn tất công việc.</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
              Hỗ trợ trượt hoặc vuốt trên màn hình di động
            </div>
          </div>

          {(beforeImages.length > 0 || afterImages.length > 0) ? (
            <>
              <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-700">Tỷ lệ hiển thị</div>
                  <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">{comparisonPercent}% trước</div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={comparisonPercent}
                  onChange={(event) => setComparisonPercent(Number(event.target.value))}
                  className="range range-primary range-sm"
                  aria-label="Điều chỉnh tỷ lệ so sánh ảnh trước và sau"
                />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-3">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                    <Lucide.ImagePlus size={16} className="text-rose-500" />
                    Trước khi xử lý
                  </div>
                  {beforeImages[0] ? (
                    <div className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-100">
                      {isVideoFile(beforeImages[0]) ? (
                        <video controls className="h-72 w-full object-cover" src={beforeImages[0]} />
                      ) : (
                        <img src={beforeImages[0]} alt="Hình ảnh trước khi xử lý" className="h-72 w-full object-cover" />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                      Chưa có hình ảnh trước khi xử lý
                    </div>
                  )}
                </div>

                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-3">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                    <Lucide.CheckCircle2 size={16} className="text-emerald-500" />
                    Sau khi xử lý
                  </div>
                  {afterImages[0] ? (
                    <div className="relative overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-100">
                      {isVideoFile(afterImages[0]) ? (
                        <video controls className="h-72 w-full object-cover" src={afterImages[0]} />
                      ) : (
                        <>
                          <img src={afterImages[0]} alt="Hình ảnh sau khi xử lý" className="h-72 w-full object-cover" />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/0 to-white/20" style={{ width: `${comparisonPercent}%` }} />
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                      Chưa có hình ảnh sau khi xử lý
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {beforeImages.slice(1).map((image, index) => (
                  <div key={`before-${index}`} className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-100">
                    <img src={image} alt={`Hình ảnh trước ${index + 2}`} className="h-48 w-full object-cover" />
                  </div>
                ))}
                {afterImages.slice(1).map((image, index) => (
                  <div key={`after-${index}`} className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-100">
                    <img src={image} alt={`Hình ảnh sau ${index + 2}`} className="h-48 w-full object-cover" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Chưa có minh chứng hình ảnh được đính kèm cho kết quả xử lý này.
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Lucide.LayoutPanelTop size={16} className="text-violet-600" />
              Tóm tắt quá trình xử lý
            </div>
            <div className="mt-6 space-y-4">
              {timelineItems.map((item, index) => (
                <div key={`${item.title}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`mt-1 h-3 w-3 rounded-full ${item.tone === 'success' ? 'bg-emerald-500' : item.tone === 'warning' ? 'bg-amber-500' : item.tone === 'accent' ? 'bg-violet-500' : 'bg-sky-500'}`} />
                    {index < timelineItems.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}
                  </div>
                  <div className="flex-1 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{item.title}</span>
                      <span className="text-[11px] font-semibold text-slate-400">{formatDate(item.date)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Lucide.Star size={16} className="text-amber-500" />
              Đánh giá chất lượng xử lý
            </div>
            <p className="mt-2 text-sm text-slate-500">Cảm nhận của bạn giúp hệ thống cải thiện trải nghiệm và chất lượng dịch vụ.</p>

            {canSubmitReview ? (
              <form onSubmit={handleSubmitRating} className="mt-6 space-y-4">
                <div className="flex flex-col items-start gap-2 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-700">Mức độ hài lòng</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`rounded-full p-2 ${rating >= value ? 'text-amber-500' : 'text-slate-300'}`}
                        aria-label={`Đánh giá ${value} sao`}
                      >
                        <Lucide.Star size={20} fill="currentColor" />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>Tôi hài lòng với kết quả này</span>
                  <input type="checkbox" checked={satisfied} onChange={(event) => setSatisfied(event.target.checked)} className="checkbox checkbox-primary checkbox-sm" />
                </label>

                <textarea
                  rows="4"
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Để lại nhận xét về sự rõ ràng, thời gian xử lý và chất lượng kết quả..."
                  className="textarea textarea-bordered w-full rounded-[1.2rem] border-slate-200 bg-white text-sm"
                />

                <button type="submit" disabled={ratingLoading} className="btn btn-primary w-full rounded-[1.1rem] font-black">
                  {ratingLoading ? <span className="loading loading-spinner" /> : 'Gửi đánh giá và đóng phản ánh'}
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                {ticket.status === managementTypes.feedbackStatus.CLOSED
                  ? 'Bạn đã hoàn tất đánh giá và phản ánh này đã được đóng.'
                  : 'Kết quả cần được Manager phê duyệt trước khi bạn có thể đánh giá.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  );
};
