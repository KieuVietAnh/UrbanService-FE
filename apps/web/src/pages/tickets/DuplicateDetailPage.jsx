import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { duplicateManagementApi } from '@urbanmind/shared-api';
import { SuccessAlert, ErrorAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getTextValue = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  return String(value);
};

const getImageSources = (feedback = {}) => {
  const candidates = [];
  if (Array.isArray(feedback?.images)) candidates.push(...feedback.images);
  if (Array.isArray(feedback?.attachments)) candidates.push(...feedback.attachments);
  if (Array.isArray(feedback?.photos)) candidates.push(...feedback.photos);
  return candidates.filter(Boolean);
};

const getReasoning = (candidate) => {
  const reasoningCandidates = [
    candidate?.reasoning,
    candidate?.duplicateReasoning,
    candidate?.analysis?.reasoning,
    candidate?.details?.reasoning,
    candidate?.metadata?.reasoning,
  ];

  return reasoningCandidates.find((value) => typeof value === 'string' && value.trim()) || '';
};

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
  const [rejectReason, setRejectReason] = useState('');

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
      setCandidate(response || null);
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

  const primaryFeedback = useMemo(() => candidate?.primaryFeedback || candidate?.primary || null, [candidate]);
  const duplicateFeedback = useMemo(() => candidate?.duplicateFeedback || candidate?.duplicate || null, [candidate]);
  const reasoning = useMemo(() => getReasoning(candidate), [candidate]);

  const handleConfirmDuplicate = async () => {
    if (!duplicateCandidateId) return;

    setConfirmLoading(true);
    setPageMessage({ type: '', text: '' });

    try {
      await duplicateManagementApi.confirmDuplicateCandidate(duplicateCandidateId);
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
    if (!duplicateCandidateId || !rejectReason.trim()) return;

    setRejectLoading(true);
    setPageMessage({ type: '', text: '' });

    try {
      await duplicateManagementApi.rejectDuplicateCandidate(duplicateCandidateId, rejectReason.trim());
      setRejectModalOpen(false);
      setRejectReason('');
      navigate('/staff/duplicates', {
        replace: true,
        state: {
          successMessage: 'Đã từ chối candidate trùng lặp và loại khỏi hàng chờ thành công.',
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

  const renderFeedbackCard = (feedback, title) => {
    const images = getImageSources(feedback);
    return (
      <div className="card bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{getTextValue(feedback?.feedbackId || feedback?.id, '—')}</span>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Tiêu đề</div>
            <div className="mt-1 font-semibold text-slate-900">{getTextValue(feedback?.title, 'Không có tiêu đề')}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Mô tả</div>
            <div className="mt-1 whitespace-pre-line text-slate-700">{getTextValue(feedback?.description, 'Không có mô tả')}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Danh mục</div>
              <div className="mt-1 font-semibold text-slate-900">{getTextValue(feedback?.categoryName || feedback?.category?.name || feedback?.categoryType || feedback?.type, '—')}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Địa điểm</div>
              <div className="mt-1 font-semibold text-slate-900">{getTextValue(feedback?.locationText || feedback?.location || feedback?.address, '—')}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Người báo cáo</div>
              <div className="mt-1 font-semibold text-slate-900">{getTextValue(feedback?.reporterName || feedback?.userName || feedback?.reporter?.name, '—')}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Ngày tạo</div>
              <div className="mt-1 font-semibold text-slate-900">{formatDate(feedback?.createdAt || feedback?.createdDate)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Trạng thái</div>
              <div className="mt-1 font-semibold text-slate-900">{getTextValue(feedback?.status, '—')}</div>
            </div>
          </div>
        </div>

        {images.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Hình ảnh</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.slice(0, 4).map((image, index) => {
                const src = typeof image === 'string' ? image : image?.fileUrl || image?.url || image?.src || '';
                return src ? (
                  <img key={`${src}-${index}`} src={src} alt={`Attachment ${index + 1}`} className="h-36 w-full rounded-2xl object-cover border border-slate-200" />
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {pageMessage.type === 'success' && (
        <SuccessAlert message={pageMessage.text} onClose={() => setPageMessage({ type: '', text: '' })} />
      )}
      {pageMessage.type === 'error' && (
        <ErrorAlert message={pageMessage.text} onClose={() => setPageMessage({ type: '', text: '' })} />
      )}

      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
        <button type="button" onClick={() => navigate('/staff/duplicates')} className="hover:text-slate-600">
          Xử lý trùng lặp
        </button>
        <Lucide.ChevronRight size={12} />
        <span className="text-[#0052CC]">Chi tiết candidate</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Chi Tiết Phản Ánh Trùng Lặp</h2>
          <p className="text-xs text-gray-500 font-semibold">So sánh phản ánh chính với phản ánh được đề xuất là trùng lặp.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
            ID: {duplicateCandidateId || '—'}
          </div>
          <button
            type="button"
            onClick={() => setConfirmModalOpen(true)}
            className="btn btn-sm bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-lg"
          >
            <Lucide.CheckCircle2 size={14} />
            Xác nhận trùng lặp
          </button>
          <button
            type="button"
            onClick={() => setRejectModalOpen(true)}
            className="btn btn-sm btn-outline border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg"
          >
            <Lucide.XCircle size={14} />
            Từ chối trùng lặp
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-500">
          <span className="loading loading-spinner loading-sm mr-2" />
          Đang tải chi tiết candidate trùng lặp...
        </div>
      ) : error ? (
        <div className="card bg-rose-50 border border-rose-200 rounded-3xl p-10 text-center text-sm text-rose-700">
          {error}
        </div>
      ) : !candidate ? (
        <div className="card bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-500">
          Không tìm thấy dữ liệu cho candidate này.
        </div>
      ) : (
        <>
          <div className="card bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Confidence Score</div>
                <div className="text-2xl font-black text-slate-900">{candidate?.confidenceScore ?? candidate?.confidence ?? '—'}</div>
              </div>
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                {candidate?.status || 'Pending'}
              </div>
            </div>
          </div>

          {reasoning && (
            <div className="card bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900">Duplicate Reasoning</h3>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">{reasoning}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderFeedbackCard(primaryFeedback, 'Primary Feedback')}
            {renderFeedbackCard(duplicateFeedback, 'Candidate Duplicate')}
          </div>
        </>
      )}

      {confirmModalOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-50 p-2 text-amber-700">
                <Lucide.AlertTriangle size={18} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">Xác nhận phản ánh trùng lặp?</h3>
                <p className="text-sm text-slate-600">
                  Hành động này sẽ đánh dấu candidate này là trùng lặp và loại khỏi hàng chờ Pending của hệ thống.
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
                disabled={confirmLoading}
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
                <h3 className="text-lg font-black text-slate-900">Từ chối candidate trùng lặp?</h3>
                <p className="text-sm text-slate-600">
                  Vui lòng nhập lý do từ chối để hoàn tất hành động này.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label htmlFor="reject-reason" className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Lý do từ chối <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Ví dụ: Đây không phải phản ánh trùng lặp, vì nội dung khác nhau..."
                className="textarea textarea-bordered w-full text-sm rounded-2xl"
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason('');
                }}
                className="btn btn-sm btn-ghost rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectDuplicate}
                disabled={rejectLoading || !rejectReason.trim()}
                className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white border-none rounded-lg"
              >
                {rejectLoading ? <span className="loading loading-spinner loading-xs" /> : <Lucide.XCircle size={14} />}
                {rejectLoading ? 'Đang từ chối...' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
