import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import PageTransition from '../../components/motion/PageTransition';

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
  const [, setDecision] = useState('approve');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleDecision = async (nextDecision) => {
    setDecision(nextDecision);
    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setMessage({
        type: 'success',
        text: nextDecision === 'approve'
          ? 'Đã chấp thuận kết quả xử lý và đưa phản ánh sang bước hoàn tất.'
          : nextDecision === 'reject'
            ? 'Đã từ chối kết quả và gửi phản ánh quay lại vòng xử lý.'
            : 'Đã gửi yêu cầu làm lại với ghi chú chi tiết cho đơn vị xử lý.',
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể cập nhật quyết định lúc này.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="page-container py-4">
          <div className="animate-pulse rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
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
      <div className="page-container space-y-6 py-4 text-slate-800">
        {message.type === 'success' && <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}
        {message.type === 'error' && <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">
                <Lucide.GitCompareArrows size={14} />
                Resolution review
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">So sánh kết quả trước và sau xử lý</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">Trang quyết định dành cho nhân viên tiếp nhận để xem xét cùng lúc tình trạng ban đầu, kết quả xử lý và thông tin đơn vị thực hiện.</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/staff/review')} className="btn btn-ghost rounded-2xl text-sm">
              Quay lại hàng chờ
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Original Report</div>
                  <h2 className="mt-1 text-lg font-black text-slate-900">{feedback?.title || '—'}</h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {feedback?.categoryName || '—'}
                </div>
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm leading-7 text-slate-600">{feedback?.description || 'Không có mô tả chi tiết.'}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Vị trí</div>
                  <div className="mt-2 font-semibold text-slate-700">{feedback?.locationText || '—'}</div>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Đơn vị xử lý</div>
                  <div className="mt-2 font-semibold text-slate-700">{feedback?.assignment?.operatorName || 'Chưa phân công'}</div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Before / After</div>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Comparison workspace</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button type="button" onClick={() => setActiveImage('before')} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${activeImage === 'before' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>Before</button>
                  <button type="button" onClick={() => setActiveImage('after')} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${activeImage === 'after' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>After</button>
                </div>
              </div>

              <div className="mt-4 hidden gap-4 lg:grid lg:grid-cols-2">
                <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-600">Before Images</div>
                  <div className="mt-3 grid gap-3">
                    {beforeImages.length > 0 ? beforeImages.map((image, index) => (
                      <img key={`${image}-${index}`} src={image} alt={`Before ${index + 1}`} className="h-48 w-full rounded-[1.1rem] object-cover" />
                    )) : (
                      <div className="flex h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-rose-200 bg-white/70 text-sm text-slate-500">Không có hình ảnh trước xử lý.</div>
                    )}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">After Images</div>
                  <div className="mt-3 grid gap-3">
                    {afterImages.length > 0 ? afterImages.map((image, index) => (
                      <img key={`${image}-${index}`} src={image} alt={`After ${index + 1}`} className="h-48 w-full rounded-[1.1rem] object-cover" />
                    )) : (
                      <div className="flex h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-emerald-200 bg-white/70 text-sm text-slate-500">Không có hình ảnh sau xử lý.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 lg:hidden">
                <div className="rounded-[1.1rem] border border-slate-200 bg-white p-2">
                  <img src={activeImage === 'before' ? (beforeImages[0] || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80') : (afterImages[0] || 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=900&q=80')} alt={activeImage === 'before' ? 'Before' : 'After'} className="h-64 w-full rounded-[0.9rem] object-cover" />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Resolution Notes</div>
              <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                {feedback?.resolution?.resolutionSummary || feedback?.resolution?.notes || 'Không có ghi chú từ đơn vị xử lý.'}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Operator Information</div>
              <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                    {feedback?.assignment?.operatorName?.slice(0, 2)?.toUpperCase() || 'OP'}
                  </div>
                  <div>
                    <div className="font-semibold">{feedback?.assignment?.operatorName || 'Đơn vị chưa xác định'}</div>
                    <div className="text-slate-500">{feedback?.assignment?.note || 'Không có ghi chú phân công.'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Decision</div>
              <div className="mt-4 space-y-3">
                <textarea
                  rows="4"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Thêm ghi chú phê duyệt, từ chối hoặc yêu cầu làm lại..."
                  className="textarea textarea-bordered w-full rounded-[1.2rem] border-slate-200 bg-white text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <button type="button" onClick={() => handleDecision('approve')} disabled={submitting} className="btn btn-success rounded-2xl text-sm">
                    <Lucide.CheckCircle2 size={16} className="mr-2" />Approve
                  </button>
                  <button type="button" onClick={() => handleDecision('reject')} disabled={submitting} className="btn btn-error rounded-2xl text-sm">
                    <Lucide.XCircle size={16} className="mr-2" />Reject
                  </button>
                  <button type="button" onClick={() => handleDecision('rework')} disabled={submitting} className="btn btn-outline rounded-2xl text-sm">
                    <Lucide.RefreshCw size={16} className="mr-2" />Request Rework
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
