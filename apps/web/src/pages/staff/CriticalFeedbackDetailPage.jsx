import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import DelightToast from '../../components/delight/DelightToast';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';

const getSuggestedSeverity = (urgency = '') => {
  const normalized = `${urgency || ''}`.trim().toLowerCase();
  if (normalized === 'critical') return 'Critical';
  if (normalized === 'high') return 'High';
  return 'Medium';
};

const formatDateTime = (value) => {
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

const formatConfidence = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const percent = numeric > 1 ? numeric : numeric * 100;
  return `${Math.round(percent)}%`;
};

const createInitialFormState = (feedback) => ({
  title: feedback?.title || feedback?.description || '',
  message: feedback?.description || feedback?.title || '',
  severity: getSuggestedSeverity(feedback?.urgencyLevel || feedback?.analysisResult?.urgencyLevel || feedback?.urgency),
  radiusMeters: '',
  startAt: '',
  endAt: '',
});

export const CriticalFeedbackDetailPage = () => {
  const navigate = useNavigate();
  const { feedbackId } = useParams();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalStage, setModalStage] = useState('form');
  const [formState, setFormState] = useState(createInitialFormState(null));
  const [errors, setErrors] = useState({});
  const [toastState, setToastState] = useState({ open: false, message: '', sub: '' });
  const [submissionMessage, setSubmissionMessage] = useState('');

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        const detail = await managementFeedbackApi.getFeedbackById(feedbackId);
        setFeedback(detail || null);
      } catch (error) {
        console.error('Failed to load critical feedback detail', error);
        setFeedback(null);
      } finally {
        setLoading(false);
      }
    };

    if (feedbackId) {
      loadFeedback();
    }
  }, [feedbackId]);

  useEffect(() => {
    if (feedback) {
      setFormState(createInitialFormState(feedback));
    }
  }, [feedback]);

  const analysis = useMemo(() => feedback?.analysisResult || {}, [feedback]);
  const attachments = useMemo(() => {
    const rawAttachments = feedback?.attachments || feedback?.images || [];
    return Array.isArray(rawAttachments) ? rawAttachments : [];
  }, [feedback]);

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setModalStage('form');
    setErrors({});
    setSubmissionMessage('');
    setFormState(createInitialFormState(feedback));
  };

  const handlePreviewSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!formState.title?.trim()) nextErrors.title = 'Vui lòng nhập tiêu đề cảnh báo';
    if (!formState.message?.trim()) nextErrors.message = 'Vui lòng nhập nội dung cảnh báo';
    if (!formState.severity?.trim()) nextErrors.severity = 'Vui lòng chọn mức độ';
    if (!formState.startAt?.trim()) nextErrors.startAt = 'Vui lòng chọn thời gian bắt đầu';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setModalStage('confirm');
    setSubmissionMessage('');
  };

  const handleConfirmCreate = async () => {
    try {
      setModalStage('loading');
      const response = await fetch(`/api/management/feedbacks/${feedbackId}/area-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title: formState.title,
          message: formState.message,
          severity: formState.severity,
          radiusMeters: formState.radiusMeters ? Number(formState.radiusMeters) : undefined,
          startAt: formState.startAt,
          endAt: formState.endAt || undefined,
          source: 'Critical Feedback',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Không thể tạo cảnh báo');
      }

      setToastState({ open: true, message: 'Cảnh báo đã được tạo', sub: 'Cảnh báo từ phản ánh này đã được gửi thành công.' });
      setModalStage('success');
      window.setTimeout(() => {
        navigate('/staff/area-alerts');
      }, 900);
    } catch (error) {
      setSubmissionMessage(error?.message || 'Vui lòng thử lại sau.');
      setModalStage('error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <EmptyState title="Không tìm thấy phản ánh" description="Phản ánh này không còn khả dụng hoặc đã bị xóa." />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-800">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">
              <Lucide.AlertCircle size={14} />
              Phản ánh khẩn cấp
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-900">{feedback?.title || feedback?.description || 'Không có tiêu đề'}</h1>
            <p className="mt-2 text-sm leading-7 text-slate-600">{feedback?.description || 'Không có nội dung mô tả chi tiết.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/staff/critical-feedbacks')} className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
              <span className="inline-flex items-center gap-2">
                <Lucide.ArrowLeft size={16} />
                Quay lại hàng chờ
              </span>
            </button>
            <button type="button" onClick={openCreateModal} className="rounded-[1rem] bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              <span className="inline-flex items-center gap-2">
                <Lucide.BellRing size={16} />
                Tạo cảnh báo từ phản ánh
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-5">
          <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Lucide.FileText size={18} className="text-slate-500" />
              <h2 className="text-base font-black text-slate-900">Thông tin phản ánh</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Khu vực</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.areaName || feedback?.area?.name || feedback?.locationText || '—'}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Danh mục</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.categoryName || feedback?.detectedCategoryName || feedback?.category?.name || '—'}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Người báo cáo</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.reporterName || '—'}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Vị trí</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.locationText || '—'}</div>
              </div>
            </div>
            {attachments.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Hình ảnh</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {attachments.map((attachment, index) => (
                    <img key={`${attachment?.url || attachment || index}`} src={attachment?.url || attachment} alt={`Evidence ${index + 1}`} className="h-44 w-full rounded-[1.2rem] border border-slate-200 object-cover" />
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Lucide.Sparkles size={18} className="text-slate-500" />
              <h2 className="text-base font-black text-slate-900">Phân tích AI</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Mức độ ưu tiên</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.urgencyLevel || analysis?.urgencyLevel || '—'}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Cảm xúc</div>
                <div className="mt-1 font-semibold text-slate-700">{analysis?.sentiment || '—'}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Độ tin cậy</div>
                <div className="mt-1 font-semibold text-slate-700">{formatConfidence(feedback?.confidenceScore ?? analysis?.confidenceScore)}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Lý do</div>
                <div className="mt-1 font-semibold text-slate-700">{analysis?.reasoning || analysis?.summary || '—'}</div>
              </div>
            </div>
          </article>
        </section>

        <aside className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Lucide.BellRing size={18} className="text-slate-500" />
            <h2 className="text-base font-black text-slate-900">Hành động</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Tạo cảnh báo mới từ phản ánh này để theo dõi khu vực một cách chủ động.
            </div>
            <button type="button" onClick={openCreateModal} className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
              <Lucide.BellRing size={16} />
              Tạo cảnh báo từ phản ánh
            </button>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Thời gian gửi</div>
              <div className="mt-1 font-semibold text-slate-700">{formatDateTime(feedback?.createdAt || feedback?.created_at)}</div>
            </div>
          </div>
        </aside>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Tạo cảnh báo từ phản ánh</h2>
                <p className="mt-1 text-sm text-slate-500">Xác nhận thông tin trước khi gửi cảnh báo cho khu vực liên quan.</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng cửa sổ">
                <Lucide.X size={18} />
              </button>
            </div>

            {modalStage === 'form' && (
              <form onSubmit={handlePreviewSubmit} className="space-y-4 px-5 py-5 sm:px-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    <span>Tiêu đề <span className="text-rose-500">*</span></span>
                    <input value={formState.title} onChange={(event) => handleFieldChange('title', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" />
                    {errors.title && <span className="text-xs font-medium text-rose-600">{errors.title}</span>}
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    <span>Mức độ nghiêm trọng <span className="text-rose-500">*</span></span>
                    <select value={formState.severity} onChange={(event) => handleFieldChange('severity', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400">
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    {errors.severity && <span className="text-xs font-medium text-rose-600">{errors.severity}</span>}
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Nội dung <span className="text-rose-500">*</span></span>
                  <textarea value={formState.message} onChange={(event) => handleFieldChange('message', event.target.value)} rows={4} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" />
                  {errors.message && <span className="text-xs font-medium text-rose-600">{errors.message}</span>}
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    <span>Bán kính (m)</span>
                    <input value={formState.radiusMeters} onChange={(event) => handleFieldChange('radiusMeters', event.target.value)} type="number" className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    <span>Thời gian bắt đầu <span className="text-rose-500">*</span></span>
                    <input type="datetime-local" value={formState.startAt} onChange={(event) => handleFieldChange('startAt', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" />
                    {errors.startAt && <span className="text-xs font-medium text-rose-600">{errors.startAt}</span>}
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Thời gian kết thúc</span>
                  <input type="datetime-local" value={formState.endAt} onChange={(event) => handleFieldChange('endAt', event.target.value)} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400" />
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-[1rem] border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Hủy</button>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                    <Lucide.CheckCircle2 size={16} />
                    Tiếp tục xác nhận
                  </button>
                </div>
              </form>
            )}

            {modalStage === 'confirm' && (
              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Xác nhận gửi cảnh báo</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div><span className="font-semibold text-slate-800">Tiêu đề:</span> {formState.title}</div>
                    <div><span className="font-semibold text-slate-800">Mức độ:</span> {formState.severity}</div>
                    <div><span className="font-semibold text-slate-800">Thời gian bắt đầu:</span> {formState.startAt ? formatDateTime(formState.startAt) : '—'}</div>
                    <div><span className="font-semibold text-slate-800">Nguồn:</span> Critical Feedback</div>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setModalStage('form')} className="rounded-[1rem] border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Chỉnh sửa</button>
                  <button type="button" onClick={handleConfirmCreate} className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                    <Lucide.BellRing size={16} />
                    Xác nhận tạo cảnh báo
                  </button>
                </div>
              </div>
            )}

            {modalStage === 'loading' && (
              <div className="flex flex-col items-center justify-center gap-3 px-5 py-8 text-center sm:px-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <span className="loading loading-spinner loading-md" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Đang tạo cảnh báo</h3>
                  <p className="mt-1 text-sm text-slate-500">Hệ thống đang gửi cảnh báo từ phản ánh này.</p>
                </div>
              </div>
            )}

            {modalStage === 'success' && (
              <div className="flex flex-col items-center justify-center gap-3 px-5 py-8 text-center sm:px-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Lucide.CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Cảnh báo đã được tạo thành công</h3>
                  <p className="mt-1 text-sm text-slate-500">Bạn sẽ được chuyển về danh sách cảnh báo khu vực ngay sau đây.</p>
                </div>
              </div>
            )}

            {modalStage === 'error' && (
              <div className="flex flex-col items-center justify-center gap-3 px-5 py-8 text-center sm:px-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <Lucide.AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Không thể tạo cảnh báo</h3>
                  <p className="mt-1 text-sm text-slate-500">{submissionMessage || 'Vui lòng thử lại sau.'}</p>
                </div>
                <button type="button" onClick={() => setModalStage('form')} className="rounded-[1rem] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">Thử lại</button>
              </div>
            )}
          </div>
        </div>
      )}

      <DelightToast open={toastState.open} message={toastState.message} sub={toastState.sub} onClose={() => setToastState({ open: false, message: '', sub: '' })} />
    </div>
  );
};

export default CriticalFeedbackDetailPage;
