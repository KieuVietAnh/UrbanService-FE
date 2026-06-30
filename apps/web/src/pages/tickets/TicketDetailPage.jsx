// src/pages/tickets/TicketDetailPage.jsx

import { Fragment, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useTicketDetail from '../../hooks/useTicketDetail';
import { TICKET_STATUS_STEPS, getStatusStep, getStatusLabel, PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES, managementTypes } from '@urbanmind/shared-types';
import * as Lucide from 'lucide-react';
import PageTransition from '../../components/motion/PageTransition';
import MotionCard from '../../components/motion/MotionCard';
import TimelineProgress from '../../components/motion/TimelineProgress';
import ConfettiBurst from '../../components/delight/ConfettiBurst';
import DelightToast from '../../components/delight/DelightToast';
import { useEffect, useRef } from 'react';

export const TicketDetailPage = () => {
  const { id: feedbackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    ticket,
    comments,
    history,
    chatInput,
    setChatInput,
    loading,
    error,
    handleSendChat,
    handleRateSubmit,
    rating,
    setRating,
    satisfied,
    setSatisfied,
    reviewComment,
    setReviewComment,
    ratingLoading,
    getAttachmentUrl,
  } = useTicketDetail(feedbackId, user);
  const [, setPreviewAttachment] = useState(null);

  const [resolvedToastOpen, setResolvedToastOpen] = useState(false);
  const resolvedShownRef = useRef(false);

  useEffect(() => {
    if (ticket?.status === managementTypes.feedbackStatus.RESOLVED && !resolvedShownRef.current) {
      resolvedShownRef.current = true;
      setResolvedToastOpen(true);
      // auto-close after a while handled by DelightToast
    }
  }, [ticket?.status]);

  const getRatingText = (val) => {
    switch (val) {
      case 1:
        return 'Rất tệ';
      case 2:
        return 'Không hài lòng';
      case 3:
        return 'Bình thường';
      case 4:
        return 'Hài lòng';
      case 5:
        return 'Rất hài lòng';
      default:
        return '';
    }
  };

  const formatTicketId = (fbId) => {
    if (!fbId) return '';
    const num = fbId.split('-').pop();
    return `UM-2026-00${num}`;
  };

  const formatDate = (value) => {
    if (!value) return 'Không có';
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isVideoFile = (fileUrl = '') => {
    const url = String(fileUrl).toLowerCase();
    return (
      url.includes('.mp4') ||
      url.includes('.webm') ||
      url.includes('.ogg') ||
      url.includes('.mov') ||
      url.includes('.m4v')
    );
  };

  const statusDescription = (status) => {
    switch (status) {
      case managementTypes.feedbackStatus.SUBMITTED:
        return 'Phản ánh đã gửi và đang chờ kiểm duyệt.';
      case managementTypes.feedbackStatus.AI_REVIEWED:
        return 'Đơn vị đang phân loại và xác định phương án xử lý.';
      case managementTypes.feedbackStatus.ASSIGNED:
        return 'Đã phân công đơn vị xử lý và chuẩn bị triển khai.';
      case managementTypes.feedbackStatus.IN_PROGRESS:
        return 'Đang tiến hành xử lý tại hiện trường.';
      case managementTypes.feedbackStatus.RESOLVED:
        return 'Đã xử lý xong. Vui lòng đánh giá chất lượng.';
      case managementTypes.feedbackStatus.CLOSED:
        return 'Phản ánh đã đóng sau khi hoàn tất các bước.';
      default:
        return 'Tiến trình xử lý đang được cập nhật.';
    }
  };

  const attachments = Array.isArray(ticket?.attachments) ? ticket.attachments : [];
  const currentStep = getStatusStep(ticket?.status);
  const steps = TICKET_STATUS_STEPS;
  const sortedHistory = useMemo(
    () => Array.isArray(history) ? [...history].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt)) : [],
    [history]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20 bg-white rounded-3xl border border-slate-200">
        <span className="loading loading-spinner loading-lg text-[color:var(--brand-primary)]"></span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex justify-center py-20 bg-white rounded-3xl border border-slate-200 text-slate-700">
        <div className="text-center">
          <p className="font-bold text-sm">{error || 'Unable to load feedback details.'}</p>
          <p className="text-xs text-slate-500">Vui lòng thử lại hoặc quay lại danh sách.</p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentStep) / Math.max(1, steps.length - 1)) * 100);

  return (
    <>
    <PageTransition>
    <div className="page-container space-y-6 text-slate-800">
      <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
        <button aria-label="Đi tới trang chủ" className="cursor-pointer hover:text-slate-600 text-left" onClick={() => navigate('/dashboard')}>Trang chủ</button>
        <Lucide.ChevronRight size={12} aria-hidden />
        <button aria-label="Xem danh sách phản ánh" className="cursor-pointer hover:text-slate-600 text-left" onClick={() => navigate('/tickets')}>Phản ánh đã gửi</button>
        <Lucide.ChevronRight size={12} aria-hidden />
        <span className="text-[color:var(--brand-primary)]" aria-current="page">{formatTicketId(ticket.feedbackId)}</span>
      </div>

      <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col lg:flex-row justify-between gap-6">
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">{formatTicketId(ticket.feedbackId)}</span>
            <span className="status-label status-info">
              {ticket.categoryName || 'Chưa xác định'}
            </span>
            {ticket.isMasterTicket && <span className="badge badge-accent badge-xs font-black uppercase py-2 px-2.5 rounded-lg text-white">MASTER TICKET</span>}
          </div>
          <h1 className="heading-1">{ticket.title}</h1>
          <p className="lead flex items-center gap-2">
            <Lucide.MapPin size={12} className="text-[color:var(--brand-primary)]" aria-hidden />
            {ticket.locationText || 'Không có vị trí cụ thể'}
          </p>
        </div>

        <div className="flex flex-col gap-4 items-start sm:items-end">
          <span className={`badge font-bold py-2.5 px-3 rounded-lg border uppercase ${PRIORITY_BADGE_CLASSES[ticket.priority] || PRIORITY_BADGE_CLASSES.Medium}`}>
            Ưu tiên: {ticket.priority || 'Không xác định'}
          </span>
          <span className={`badge font-bold py-2.5 px-3 rounded-lg border uppercase ${STATUS_BADGE_CLASSES[ticket.status] || STATUS_BADGE_CLASSES.default} ${ticket.status === managementTypes.feedbackStatus.RESOLVED && resolvedToastOpen ? 'ring-2 ring-emerald-100' : ''}`}>
            Trạng thái: {getStatusLabel(ticket.status, ticket.status || 'Không xác định')}
          </span>
          <div className="rounded-3xl bg-slate-50 px-4 py-3 text-[11px] text-slate-600 border border-slate-200">
            {statusDescription(ticket.status)}
          </div>
          {(ticket.status === managementTypes.feedbackStatus.RESOLVED || ticket.status === managementTypes.feedbackStatus.NEED_REWORK || ticket.status === managementTypes.feedbackStatus.REJECTED) && user?.role === 'service-user' && (
            <div className="flex flex-wrap gap-2">
              {ticket.status === managementTypes.feedbackStatus.NEED_REWORK || ticket.status === managementTypes.feedbackStatus.REJECTED ? (
                <button
                  type="button"
                  onClick={() => navigate(`/tickets/${feedbackId}/rework`)}
                  className="btn btn-warning rounded-2xl px-4 py-2 text-[11px] font-black"
                >
                  <Lucide.RefreshCw size={14} className="mr-2" />
                  Rework Center
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/tickets/${feedbackId}/result`)}
                  className="btn btn-primary rounded-2xl px-4 py-2 text-[11px] font-black"
                >
                  <Lucide.Sparkles size={14} className="mr-2" />
                  Xem kết quả xử lý
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="heading-3">Tổng quan hành trình</h4>
            <p className="text-xs muted">Nắm rõ tiến độ xử lý, đơn vị phụ trách và thời hạn hoàn thành.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px] text-slate-500">
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4 text-center">
              <div className="font-bold text-slate-900">{ticket.assignment?.operatorName ? 'Đã phân công' : 'Chưa phân công'}</div>
              <div className="mt-1">Đơn vị xử lý</div>
            </div>
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4 text-center">
              <div className="font-bold text-slate-900">{formatDate(ticket.dueDate)}</div>
              <div className="mt-1">Hạn SLA</div>
            </div>
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4 text-center">
              <div className="font-bold text-slate-900">{ticket.priority || 'Trung bình'}</div>
              <div className="mt-1">Mức độ</div>
            </div>
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4 text-center">
              <div className="font-bold text-slate-900">{ticket.status}</div>
              <div className="mt-1">Trạng thái</div>
            </div>
          </div>
        </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500 mb-4">
            <span>Quy trình</span>
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold normal-case tracking-normal text-slate-600">Bước hiện tại: {getStatusLabel(ticket.status, 'Đang cập nhật')}</span>
          </div>
          <TimelineProgress percent={progressPercent} className="mb-4" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Đơn vị xử lý</div>
              <div className="mt-2 font-semibold text-slate-800">{ticket.assignment?.operatorName || ticket.assignment?.staffName || 'Chưa phân công'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Nghiệm thu / phê duyệt</div>
              <div className="mt-2 font-semibold text-slate-800">{ticket.resolution?.isApproved ? 'Đã duyệt' : ticket.status === managementTypes.feedbackStatus.RESOLVED ? 'Chờ nghiệm thu' : 'Chưa có kết quả phê duyệt'}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-3">
            {steps.map((step, idx) => {
              const isComplete = currentStep > idx;
              const isActive = currentStep === idx;
              return (
                <Fragment key={step.title}>
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-10 h-10 rounded-full grid place-items-center text-[11px] font-black status-transition ${isComplete ? 'bg-[color:var(--brand-primary)] text-white shadow-lg shadow-[color:var(--brand-primary)]/10' : isActive ? 'bg-[color:var(--color-info)] text-white ring-2 ring-[color:var(--color-info)]/10' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {idx + 1}
                      </div>
                      <span className="mt-2 text-[10px] font-bold text-slate-700">{step.title}</span>
                    </div>
                    {idx !== steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full timeline-segment ${isComplete ? 'complete' : ''}`} />}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Description */}
          <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
            <h4 className="font-extrabold text-sm border-b border-slate-100 pb-2 text-slate-900">Thông Tin Phản Ánh</h4>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Mô tả của người dân</span>
              <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-5 rounded-3xl border border-slate-150 italic">
                {ticket.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-slate-700 text-xs">
                <div className="font-bold text-slate-900 mb-2 uppercase tracking-[0.2em] text-[10px]">Bằng chứng đính kèm</div>
                <p className="leading-relaxed">Các ảnh và video giúp đơn vị xử lý xác định sự cố nhanh hơn và chính xác hơn.</p>
              </div>
              <div>
                {attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((file, index) => {
                      const fileUrl = getAttachmentUrl(file);
                      const isVideo = isVideoFile(fileUrl);
                      return (
                        <button
                          key={file?.attachmentId || file?.id || fileUrl || `attachment-${index}`}
                          type="button"
                          onClick={() => setPreviewAttachment(file)}
                          aria-label={`Xem tệp đính kèm ${index + 1}`}
                          title={`Xem tệp đính kèm ${index + 1}`}
                          className="rounded-3xl overflow-hidden border border-slate-200 aspect-video bg-slate-50 shadow-sm group relative"
                        >
                          {isVideo ? (
                            <div className="relative w-full h-full bg-black">
                              <video src={fileUrl} muted playsInline preload="metadata" className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
                                  <Lucide.Play size={22} fill="currentColor" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img src={fileUrl} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-[11px] text-slate-500">Không có tệp đính kèm.</div>
                )}
              </div>
            </div>

            {/* SLA countdown info */}
            {ticket.dueDate && ticket.status !== managementTypes.feedbackStatus.RESOLVED && ticket.status !== managementTypes.feedbackStatus.CLOSED && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center gap-2 text-amber-700 font-bold">
                  <Lucide.Clock size={16} />
                  <span>Hạn chót giải quyết (SLA)</span>
                </div>
                <span className="font-extrabold text-slate-800">
                  {new Date(ticket.dueDate).toLocaleString()}
                </span>
              </div>
            )}

          </div>

          {/* Activity Log / Status Timeline History */}
          <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm border-b border-slate-100 pb-2 text-slate-900">Lịch Sử Cập Nhật Trạng Thái</h4>
            <div className="space-y-4 text-xs">
              {sortedHistory.length > 0 ? sortedHistory.map((h, i) => (
                <div key={h?.historyId ?? i} className="flex gap-4 items-start last:pb-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[color:var(--brand-primary)] mt-1.5 ring-4 ring-[color:var(--brand-primary)]/10 shrink-0" aria-hidden></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-extrabold text-slate-750">{h?.newStatus || h?.status || 'Cập nhật'}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{h?.changedAt ? formatDate(h.changedAt) : '---'}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5 font-medium leading-relaxed">{h?.note || h?.description || 'Không có ghi chú'}</p>
                  </div>
                </div>
              )) : (
                <div className="text-slate-500 text-[10px]">Không có lịch sử trạng thái.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Rating Form block (Flow 4: CSAT review) */}
          {ticket.status === managementTypes.feedbackStatus.RESOLVED && user?.role === 'service-user' && (
            <div className="card bg-white border border-[color:var(--brand-primary)]/30 shadow-md p-6 rounded-3xl space-y-4 ring-2 ring-[color:var(--brand-primary)]/5">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-[color:var(--color-info-bg)] text-[color:var(--color-info)] flex items-center justify-center mx-auto" aria-hidden>
                  <Lucide.Star className="animate-pulse" size={20} />
                </div>
                <h3 className="font-black text-sm text-[color:var(--color-info)] uppercase tracking-wider">Đánh giá chất lượng xử lý</h3>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Ý kiến của bạn sẽ giúp ban quản lý nghiệm thu chất lượng thi công.</p>
              </div>

              <form onSubmit={handleRateSubmit} className="space-y-4 text-xs">
                <div className="form-control text-center">
                  <label className="label justify-center py-0">
                    <span className="label-text font-bold text-xs text-slate-700">Chấm điểm sao (1 - 5)</span>
                  </label>
                  <div className="flex flex-col items-center gap-1.5 mt-2">
                    <div className="rating rating-md flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <input
                          key={num}
                          type="radio"
                          name="rating-1"
                          aria-label={`Đánh giá ${num} sao`}
                          checked={rating === num}
                          onChange={() => setRating(num)}
                          className="mask mask-star-2 bg-amber-400 cursor-pointer"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-amber-600 block bg-amber-50 px-2 py-0.5 rounded-md">
                      {getRatingText(rating)}
                    </span>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="label-text font-bold text-slate-700">Tôi hài lòng với kết quả này</span>
                    <input
                      type="checkbox"
                      checked={satisfied}
                      onChange={(e) => setSatisfied(e.target.checked)}
                      className="checkbox checkbox-primary checkbox-sm rounded-lg"
                    />
                  </label>
                </div>

                <div className="form-control space-y-1">
                  <label className="label py-0">
                    <span className="label-text font-bold text-slate-700">Bình luận, ý kiến đóng góp</span>
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Để lại ý kiến về thái độ phục vụ, chất lượng hoàn thiện công trình..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="textarea textarea-bordered text-xs font-semibold p-2.5 rounded-xl border-slate-200 focus:outline-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full rounded-xl font-bold text-xs h-10 min-h-0"
                  disabled={ratingLoading}
                >
                  {ratingLoading ? <span className="loading loading-spinner"></span> : 'Gửi Đánh Giá & Đóng Phản Ánh'}
                </button>
              </form>
            </div>
          )}

          {/* Public Comments */}
          <div className="card bg-white border border-slate-200 shadow-sm p-6 rounded-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h4 className="font-black text-sm text-slate-900">Bình luận cộng đồng</h4>
                <p className="text-xs text-slate-500 font-semibold">
                  Người dân có thể trao đổi công khai giống phần bình luận bài đăng.
                </p>
              </div>
                <div className="status-label status-neutral">
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white px-2 py-0.5 text-xs text-slate-900 shadow-sm">
                    {comments.length}
                  </span>
                  <span>Bình luận</span>
                </div>
            </div>

            <form onSubmit={handleSendChat} className="flex flex-col gap-3 mb-5 sm:flex-row items-stretch">
              <label htmlFor="public-comment" className="sr-only">Viết bình luận công khai</label>
              <input
                id="public-comment"
                type="text"
                placeholder="Viết bình luận công khai..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                aria-label="Viết bình luận công khai"
                className="input input-bordered flex-1 rounded-2xl text-sm px-4 py-3"
              />
              <button
                type="submit"
                aria-label="Gửi bình luận"
                title="Gửi bình luận"
                disabled={!chatInput?.trim()}
                className="btn btn-primary rounded-2xl font-bold text-xs h-12 min-h-0 ml-0 sm:ml-3"
              >
                <Lucide.Send size={15} className="mr-2" aria-hidden />
                Gửi
              </button>
            </form>

            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center text-slate-400 text-xs font-semibold py-8 bg-slate-50 border border-slate-100 rounded-2xl">
                  Chưa có bình luận nào. Hãy là người đầu tiên bình luận.
                </div>
              ) : (
                comments.filter(Boolean).map((comment, index) => {
                  const author = comment?.userName || comment?.authorName || 'Người dùng';
                  const content = comment?.content || comment?.message || '---';
                  const createdAt = comment?.createdAt ? new Date(comment.createdAt).toLocaleString() : 'Vừa xong';

                  return (
                    <MotionCard key={comment.commentId || comment.id || index} index={index} className="grid gap-3 p-4 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs shrink-0">
                          {author.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-800 truncate">{author}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{createdAt}</span>
                          </div>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed break-words mt-2">{content}</p>
                        </div>
                      </div>
                    </MotionCard>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
      {resolvedToastOpen && (
        <>
          <ConfettiBurst />
          <DelightToast open={resolvedToastOpen} message="Phản ánh đã được xử lý" sub="Cảm ơn bạn — hãy đánh giá chất lượng hoàn thiện." onClose={() => setResolvedToastOpen(false)} />
        </>
      )}
    </>
  );
};
