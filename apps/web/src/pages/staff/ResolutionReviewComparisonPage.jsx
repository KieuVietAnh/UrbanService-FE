import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import PageTransition from '../../components/motion/PageTransition';
import { ConfirmationModal } from '@urbanmind/shared-ui';
import DelightToast from '../../components/delight/DelightToast';
import { getCategoryLabel } from '../../utils/categoryLabels';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';

const buildImageList = (attachments = []) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];
  return attachments
    .map((attachment) => {
      if (typeof attachment === 'string') return attachment;
      return attachment?.fileUrl || attachment?.url || attachment?.path || '';
    })
    .filter(Boolean);
};

export const ResolutionReviewComparisonPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeImage, setActiveImage] = useState('before');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastState, setToastState] = useState({ open: false, message: '', sub: '' });

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        const result = await managementFeedbackApi.getFeedbackById(feedbackId);
        setFeedback(result);
      } catch (err) {
        console.error('Failed to load feedback for comparison review', err);
        setMessage({ type: 'error', text: err?.message || 'Không thể tải dữ liệu phản ánh.' });
      } finally {
        setLoading(false);
      }
    };

    if (feedbackId) {
      loadFeedback();
    }
  }, [feedbackId]);

  const beforeImages = useMemo(() => buildImageList(feedback?.attachments), [feedback]);
  const afterImages = useMemo(() => buildImageList(feedback?.resolution?.attachments || feedback?.afterAttachments), [feedback]);

  const handleDecisionRequest = (nextDecision) => {
    setPendingDecision(nextDecision);
    setConfirmOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!feedbackId || !pendingDecision) return;

    setSubmitting(true);
    setConfirmOpen(false);
    setMessage({ type: '', text: '' });

    try {
      if (pendingDecision === 'approve') {
        await managementFeedbackApi.approveFeedback(feedbackId, note);
        setToastState({
          open: true,
          message: 'Đã phê duyệt kết quả xử lý',
          sub: 'Đang quay lại hàng đợi duyệt...',
        });
      } else {
        await managementFeedbackApi.requestRework(feedbackId, note || 'Yêu cầu làm lại từ quản lý.');
        setToastState({
          open: true,
          message: 'Đã gửi yêu cầu làm lại',
          sub: 'Đang quay lại hàng đợi duyệt...',
        });
      }

      setTimeout(() => {
        navigate('/manager/approvals', { state: { refreshKey: Date.now() } });
      }, 250);
    } catch (err) {
      console.error('Failed to submit decision', err);
      setMessage({ type: 'error', text: err?.message || 'Không thể cập nhật quyết định lúc này.' });
    } finally {
      setSubmitting(false);
      setPendingDecision(null);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="page-container py-4">
          <div className="admin-panel animate-pulse p-6">
            <div className="h-5 w-40 rounded-full bg-slate-100" />
            <div className="mt-4 h-8 w-2/3 rounded-2xl bg-slate-100" />
            <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-100" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="admin-page-shell page-container space-y-6 py-4 text-slate-800">
        {message.type === 'success' && <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}
        {message.type === 'error' && <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}

        <div className="admin-page-hero p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Badge intent="success" className="gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                <Lucide.GitCompareArrows size={14} />
                Xem xét kết quả xử lý
              </Badge>
              <div>
                <h1 className="admin-hero-title">So sánh kết quả trước và sau xử lý</h1>
                <p className="admin-hero-description mt-2 max-w-2xl">Trang quyết định dành cho nhân viên tiếp nhận để xem xét cùng lúc tình trạng ban đầu, kết quả xử lý và thông tin đơn vị thực hiện.</p>
              </div>
            </div>
            <Button type="button" onClick={() => navigate('/staff/review')} variant="ghost" size="sm" className="rounded-2xl">
              Quay lại hàng chờ
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="admin-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="admin-section-description uppercase tracking-[0.24em]">Phản ánh ban đầu</div>
                  <h2 className="mt-1 heading-3 text-slate-900">{feedback?.title || '—'}</h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {getCategoryLabel(feedback?.categoryName || feedback?.category?.name || feedback?.categoryType || feedback?.type, '—')}
                </div>
              </div>

              <div className="admin-inset-panel mt-4 p-4">
                <p className="body-text">{feedback?.description || 'Không có mô tả chi tiết.'}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="admin-inset-panel p-3 text-sm">
                  <div className="admin-section-description uppercase tracking-[0.24em]">Vị trí</div>
                  <div className="mt-2 font-semibold text-slate-700">{feedback?.locationText || '—'}</div>
                </div>
                <div className="admin-inset-panel p-3 text-sm">
                  <div className="admin-section-description uppercase tracking-[0.24em]">Đơn vị xử lý</div>
                  <div className="mt-2 font-semibold text-slate-700">{feedback?.assignment?.operatorName || 'Chưa phân công'}</div>
                </div>
              </div>
            </section>

            <section className="admin-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Trước / Sau</div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">So sánh hình ảnh</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                  <Button type="button" onClick={() => setActiveImage('before')} variant={activeImage === 'before' ? 'primary' : 'ghost'} size="sm" className="rounded-full">Trước</Button>
                  <Button type="button" onClick={() => setActiveImage('after')} variant={activeImage === 'after' ? 'primary' : 'ghost'} size="sm" className="rounded-full">Sau</Button>
                </div>
              </div>

              <div className="mt-4 hidden gap-4 lg:grid lg:grid-cols-2">
                <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-600">Ảnh trước xử lý</div>
                  <div className="mt-3 grid gap-3">
                    {beforeImages.length > 0 ? beforeImages.map((image, index) => (
                      <img key={`${image}-${index}`} src={image} alt={`Trước ${index + 1}`} className="h-48 w-full rounded-[1.1rem] object-cover" />
                    )) : (
                      <div className="flex h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-rose-200 bg-white/70 text-sm text-slate-500">Không có hình ảnh trước xử lý.</div>
                    )}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-600">Ảnh sau xử lý</div>
                  <div className="mt-3 grid gap-3">
                    {afterImages.length > 0 ? afterImages.map((image, index) => (
                      <img key={`${image}-${index}`} src={image} alt={`Sau ${index + 1}`} className="h-48 w-full rounded-[1.1rem] object-cover" />
                    )) : (
                      <div className="flex h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-emerald-200 bg-white/70 text-sm text-slate-500">Không có hình ảnh sau xử lý.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 lg:hidden">
                <div className="admin-inset-panel p-2">
                  <img src={activeImage === 'before' ? (beforeImages[0] || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80') : (afterImages[0] || 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=900&q=80')} alt={activeImage === 'before' ? 'Trước' : 'Sau'} className="h-64 w-full rounded-[0.9rem] object-cover" />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="admin-panel p-5 sm:p-6">
              <div className="admin-section-description uppercase tracking-[0.24em]">Ghi chú kết quả xử lý</div>
              <div className="admin-inset-panel mt-4 p-4 text-sm leading-6 text-slate-600">
                {feedback?.resolution?.resolutionSummary || feedback?.resolution?.notes || 'Không có ghi chú từ đơn vị xử lý.'}
              </div>
            </section>

            <section className="admin-panel p-5 sm:p-6">
              <div className="admin-section-description uppercase tracking-[0.24em]">Thông tin đơn vị xử lý</div>
              <div className="admin-inset-panel mt-4 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {feedback?.assignment?.operatorName?.slice(0, 2)?.toUpperCase() || 'OP'}
                  </div>
                  <div>
                    <div className="font-semibold">{feedback?.assignment?.operatorName || 'Đơn vị chưa xác định'}</div>
                    <div className="text-slate-500">{feedback?.assignment?.note || 'Không có ghi chú phân công.'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-panel p-5 sm:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Quyết định</div>
              <div className="mt-4 space-y-3">
                <textarea
                  rows="4"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Thêm ghi chú phê duyệt, từ chối hoặc yêu cầu làm lại..."
                  className="textarea textarea-bordered w-full rounded-[1.2rem] border-slate-200 bg-white text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button type="button" onClick={() => handleDecisionRequest('approve')} disabled={submitting} variant="primary">
                    <Lucide.CheckCircle2 size={16} />{submitting && pendingDecision === 'approve' ? 'Đang xử lý...' : 'Phê duyệt'}
                  </Button>
                  <Button type="button" onClick={() => handleDecisionRequest('reject')} disabled={submitting} variant="outline">
                    <Lucide.XCircle size={16} />{submitting && pendingDecision === 'reject' ? 'Đang xử lý...' : 'Từ chối'}
                  </Button>
                  <Button type="button" onClick={() => handleDecisionRequest('rework')} disabled={submitting} variant="ghost">
                    <Lucide.RefreshCw size={16} />{submitting && pendingDecision === 'rework' ? 'Đang xử lý...' : 'Yêu cầu làm lại'}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title={pendingDecision === 'approve' ? 'Phê duyệt kết quả' : 'Yêu cầu làm lại'}
        message={pendingDecision === 'approve'
          ? 'Bạn có chắc chắn muốn phê duyệt kết quả xử lý cho phản ánh này?'
          : 'Bạn có chắc chắn muốn gửi yêu cầu làm lại cho đơn vị xử lý?'}
        confirmLabel={pendingDecision === 'approve' ? 'Phê duyệt' : 'Gửi yêu cầu'}
        cancelLabel="Hủy"
        onConfirm={handleConfirmDecision}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDecision(null);
        }}
      />

      <DelightToast
        open={toastState.open}
        message={toastState.message}
        sub={toastState.sub}
        onClose={() => setToastState({ open: false, message: '', sub: '' })}
      />
    </PageTransition>
  );
};
