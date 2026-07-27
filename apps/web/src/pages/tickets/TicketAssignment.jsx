// src/pages/tickets/TicketAssignment.jsx
import { useState, useEffect } from 'react';

const FALLBACK_CATEGORIES = [
  { categoryId: 1, categoryName: 'Vệ sinh môi trường' },
  { categoryId: 2, categoryName: 'Đường sá' },
  { categoryId: 3, categoryName: 'Cấp thoát nước' },
  { categoryId: 4, categoryName: 'Điện chiếu sáng' },
  { categoryId: 5, categoryName: 'Cây xanh' },
  { categoryId: 6, categoryName: 'An toàn giao thông' },
];
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { toolsApi, managementFeedbackApi } from '@urbanmind/shared-api';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import { signalrService } from '../../services/socket/signalrService';
import * as Lucide from 'lucide-react';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getFeedbackId = (ticket, routeId) => ticket?.feedbackId || ticket?.id || ticket?.ticketId || routeId || '';

export const TicketAssignment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [operators, setOperators] = useState([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [manualOperatorId, setManualOperatorId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [providerCandidatesLoaded, setProviderCandidatesLoaded] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const role = user?.role || 'system-staff';
        const resTicket = await ticketApi.getTicketById(id, { role });
        const providerCandidates = await managementFeedbackApi.getProviderCandidates(id);
        const categoryResponse = await toolsApi.getCategories();
        const normalizedCategories = Array.isArray(categoryResponse) && categoryResponse.length > 0
          ? categoryResponse
          : FALLBACK_CATEGORIES;
        const normalizedOperators = Array.isArray(providerCandidates)
          ? providerCandidates.map((candidate) => ({
              coordinatorId: candidate.coordinatorId ?? candidate.operatorId ?? candidate.id,
              operatorId: candidate.coordinatorId ?? candidate.operatorId ?? candidate.id,
              operatorName: candidate.providerName || candidate.coordinatorName || candidate.name || 'Unnamed provider',
              contactPhone: candidate.phoneNumber || candidate.contactPhone || candidate.phone || candidate.contactNumber || '',
              email: candidate.email || candidate.contactEmail || '',
              coverage: candidate.address || candidate.coverage || candidate.contractName || '',
              sla: candidate.sla || `${slaHours} giờ`,
              ...candidate,
            }))
          : [];

        setTicket(resTicket);
        setOperators(normalizedOperators);
        setCategories(normalizedCategories);
        setProviderCandidatesLoaded(true);
        if (normalizedOperators.length > 0) {
          setSelectedOperatorId(normalizedOperators[0].coordinatorId ?? normalizedOperators[0].operatorId);
        }
      } catch (err) {
        console.error(err);
        navigate('/staff/queue');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role) {
      loadDetails();
    }
  }, [id, navigate, user?.role]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setError('');
    const resolvedOperatorId = String(selectedOperatorId || manualOperatorId || '').trim();
    if (!resolvedOperatorId) {
      setError('Vui lòng chọn hoặc nhập mã đơn vị xử lý.');
      return;
    }

    const coordinatorId = Number(resolvedOperatorId);
    if (!Number.isInteger(coordinatorId) || coordinatorId <= 0) {
      setError('Đơn vị xử lý không hợp lệ.');
      return;
    }

    const selectedOperator = operators.find((op) => Number(op.coordinatorId ?? op.operatorId) === coordinatorId);
    const hasManualOperator = Boolean(manualOperatorId?.trim());
    if (!selectedOperator && operators.length > 0 && !hasManualOperator) {
      setError('Đơn vị xử lý đã chọn không tồn tại. Vui lòng kiểm tra lại mã hoặc tải lại trang.');
      return;
    }

    const feedbackId = getFeedbackId(ticket, id);
    if (!feedbackId) {
      setError('Không thể phân công vì thiếu mã phản ánh.');
      return;
    }

    if (!UUID_PATTERN.test(feedbackId)) {
      setError('Không thể phân công vì mã phản ánh không hợp lệ. Vui lòng tải lại và thử lại.');
      return;
    }

    if (!user?.userId) {
      setError('Thông tin người dùng không hợp lệ. Vui lòng đăng nhập lại.');
      return;
    }

    setAssignLoading(true);
    try {
      const assignmentPayload = {
        feedbackId,
        coordinatorId,
        staffUserId: user.userId,
        note,
      };
      await managementFeedbackApi.assignToOperator(assignmentPayload);
      signalrService.notifyAssignmentUpdated(feedbackId, coordinatorId, selectedOperator?.operatorName || selectedOperator?.fullName || '', user);
      setMessage({ type: 'success', text: 'Phân công thành công. Trạng thái đã được cập nhật cho người xử lý.' });
      navigate(`/staff/feedbacks/${feedbackId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể phân công phản ánh. Vui lòng thử lại.');
    } finally {
      setAssignLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 bg-base-100 rounded-3xl border border-base-300">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Calculate projected deadline based on priority
  const slaConfig = toolsApi.getSlaConfig();
  const slaHours = slaConfig[ticket.priority]?.hours || 24;
  const projectedDeadline = new Date();
  projectedDeadline.setHours(projectedDeadline.getHours() + slaHours);
  const selectedOperator = operators.find((op) => String(op.coordinatorId ?? op.operatorId) === String(selectedOperatorId)) || null;
  const categoryName = categories.find((c) => Number(c.categoryId) === Number(ticket.categoryId))?.categoryName || 'Không rõ';

  return (
    <div className="space-y-6">
      {message.type === 'success' && (
        <SuccessAlert
          message={message.text}
          onClose={() => setMessage({ type: '', text: '' })}
        />
      )}
      {message.type === 'error' && (
        <ErrorAlert
          message={message.text}
          onClose={() => setMessage({ type: '', text: '' })}
        />
      )}

      <div className="space-y-3">
        <h2 className="text-3xl font-black">Điều Phối & Phân Công Xử Lý</h2>
        <p className="max-w-3xl text-sm text-gray-500 font-semibold">Lựa chọn đơn vị xử lý phù hợp và xác nhận thời hạn xử lý.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,320px)_1fr]">
        <aside className="space-y-6">
          <div className="card bg-base-100 border border-base-200 p-6 rounded-[28px] shadow-sm h-full">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Tóm tắt sự cố</p>
                <h3 className="mt-3 text-xl font-black text-gray-900">{ticket.title || 'Không có tiêu đề'}</h3>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Lucide.FileText size={20} />
              </span>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="rounded-3xl border border-base-200 bg-base-200/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Vị trí</p>
                <p className="mt-2 font-semibold text-gray-900">{ticket.locationText || 'Chưa có vị trí'}</p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-3xl border border-base-200 bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Danh mục</p>
                  <p className="mt-2 font-semibold text-gray-900">{categoryName}</p>
                </div>
                <div className="rounded-3xl border border-base-200 bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Mức độ ưu tiên</p>
                  <p className="mt-2 font-semibold text-gray-900">{ticket.priority || 'Medium'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="card bg-base-100 border border-base-200 p-8 rounded-[32px] shadow-sm flex flex-col">
            <form onSubmit={handleAssign} className="flex flex-col">
              {error && (
                <div className="mb-4 rounded-3xl border border-error/20 bg-error/10 p-4 text-sm text-error">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                    <Lucide.UserCheck size={18} />
                    THÔNG TIN PHÂN CÔNG
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-gray-900">Decision Workspace</h3>
                    <p className="max-w-3xl text-sm text-gray-500">Lựa chọn đơn vị xử lý phù hợp và xác nhận thời hạn xử lý.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-base-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">SLA</p>
                  <p className="mt-3 text-2xl font-black text-gray-900">{slaHours} giờ</p>
                </div>
                <div className="rounded-3xl border border-base-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Priority</p>
                  <p className="mt-3 text-2xl font-black text-gray-900">{ticket.priority || 'Medium'}</p>
                </div>
                <div className="rounded-3xl border border-base-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Category</p>
                  <p className="mt-3 text-2xl font-black text-gray-900">{categoryName}</p>
                </div>
                <div className="rounded-3xl border border-base-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">ETA</p>
                  <p className="mt-3 text-2xl font-black text-gray-900">{projectedDeadline.toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1fr]">
                <div className={`rounded-[28px] border p-6 ${selectedOperator ? 'border-base-200 bg-white shadow-sm' : 'border-dashed border-base-300 bg-base-200/60'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Đơn vị xử lý đã chọn</p>
                      <p className="mt-3 text-lg font-semibold text-gray-900">{selectedOperator ? selectedOperator.operatorName : 'Chưa chọn đơn vị xử lý'}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${selectedOperator ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {selectedOperator ? 'Đã chọn' : 'Chưa chọn'}
                    </span>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Phone</p>
                      <p className="font-semibold text-gray-900">{selectedOperator?.contactPhone || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Email</p>
                      <p className="font-semibold text-gray-900">{selectedOperator?.email || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Coverage</p>
                      <p className="font-semibold text-gray-900">{selectedOperator?.coverage || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">SLA</p>
                      <p className="font-semibold text-gray-900">{selectedOperator?.sla || `${slaHours} giờ`}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="label">
                      <span className="label-text text-xs font-bold">Chọn đơn vị xử lý</span>
                    </label>
                    {providerCandidatesLoaded ? (
                      operators.length > 0 ? (
                        <select
                          value={selectedOperatorId}
                          onChange={(e) => {
                            setSelectedOperatorId(e.target.value);
                            if (e.target.value) setManualOperatorId('');
                          }}
                          className="select select-bordered select-sm rounded-2xl w-full font-semibold"
                        >
                          <option value="">-- Chọn đơn vị xử lý --</option>
                          {operators.map((op) => (
                            <option key={op.operatorId} value={op.operatorId}>
                              {op.operatorName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm text-gray-500">Không có đơn vị xử lý khả dụng. Hãy nhập mã thủ công bên dưới.</p>
                      )
                    ) : (
                      <p className="text-sm text-gray-500">Đang tải danh sách đơn vị xử lý...</p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="label">
                      <span className="label-text text-xs font-bold">Hoặc nhập mã đơn vị xử lý</span>
                    </label>
                    <input
                      type="text"
                      value={manualOperatorId}
                      onChange={(e) => {
                        setManualOperatorId(e.target.value);
                        if (e.target.value) setSelectedOperatorId('');
                      }}
                      placeholder="VD: 123"
                      className="input input-bordered input-sm rounded-2xl w-full font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-base-200 bg-base-200/50 p-6">
                <label className="label">
                  <span className="label-text text-xs font-bold">Ghi chú giao việc</span>
                </label>
                <textarea
                  rows="5"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Mô tả yêu cầu xử lý, lưu ý kỹ thuật, thông tin hiện trường..."
                  className="textarea textarea-bordered textarea-lg w-full rounded-3xl font-semibold text-sm"
                />
              </div>

              <div className="mt-4 border-t border-base-200 pt-4 sticky top-[calc(100vh-96px)] bg-base-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-center">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn btn-ghost rounded-2xl px-6"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-2xl px-6 font-bold"
                    disabled={assignLoading || (!selectedOperatorId && !manualOperatorId)}
                  >
                    {assignLoading ? <span className="loading loading-spinner"></span> : 'Xác nhận phân công'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="card bg-base-100 border border-base-200 p-6 rounded-[32px] shadow-sm">
            <div className="border-b border-base-200 pb-4 mb-6">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-400">Chi tiết sự cố</h4>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Tiêu đề</p>
                  <p className="mt-2 font-semibold text-gray-900">{ticket.title || 'Không có tiêu đề'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Mã phản ánh</p>
                  <p className="mt-2 font-semibold text-gray-900">{ticket.feedbackId || ticket.id || 'Không rõ'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Người báo cáo</p>
                  <p className="mt-2 font-semibold text-gray-900">{ticket.reporterName || 'Không rõ'}</p>
                </div>
              </div>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Khu vực</p>
                  <p className="mt-2 font-semibold text-gray-900">{ticket.areaName || 'Không có khu vực'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Danh mục</p>
                  <p className="mt-2 font-semibold text-gray-900">{categoryName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Mức độ ưu tiên</p>
                  <p className="mt-2 font-semibold text-gray-900">{ticket.priority || 'Medium'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Thời gian tạo</p>
                  <p className="mt-2 font-semibold text-gray-900">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('vi-VN') : 'Không rõ'}</p>
                </div>
              </div>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Nội dung phản ánh</p>
                  <p className="mt-2 rounded-3xl border border-base-200 bg-base-200/70 p-5 text-sm leading-7 text-gray-700">{ticket.description || 'Không có nội dung phản ánh.'}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
