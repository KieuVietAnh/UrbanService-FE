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
              contactPhone: candidate.contactPhone || candidate.phone || candidate.contactNumber || '',
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
      navigate(`/tickets/${feedbackId}`);
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black">Điều Phối &amp; Phân Công Xử Lý</h2>
        <p className="text-xs text-gray-500 font-semibold">Lựa chọn đơn vị thi công phù hợp và thiết lập thời hạn xử lý sự cố dựa trên chuẩn SLA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ticket Summary Card */}
        <div className="card bg-base-100 border border-base-300 p-6 rounded-3xl shadow-sm space-y-4 h-fit">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-400 border-b border-base-300 pb-2">Tóm tắt sự cố</h4>
          <div className="space-y-1 text-xs">
            <span className="font-bold text-gray-500 block">Tiêu đề:</span>
            <span className="font-bold text-base-content block">{ticket.title}</span>
          </div>
          <div className="space-y-1 text-xs">
            <span className="font-bold text-gray-500 block">Nội dung chi tiết:</span>
            <p className="text-gray-600 bg-base-200/50 p-3 rounded-xl border border-base-300 italic">
              "{ticket.description}"
            </p>
          </div>
          <div className="space-y-1 text-xs">
            <span className="font-bold text-gray-500 block">Vị trí:</span>
            <span className="font-semibold block">{ticket.locationText}</span>
          </div>
          <div className="flex gap-2 text-xs font-bold pt-2">
            <span className="badge badge-sm badge-info uppercase py-2 px-2.5">Priority: {ticket.priority}</span>
              <span className="badge badge-sm badge-outline uppercase py-2 px-2.5">
              Category: {categories.find((c) => Number(c.categoryId) === Number(ticket.categoryId))?.categoryName || 'Không rõ'}
            </span>
          </div>
        </div>

        {/* Assignment Action Form Card */}
        <div className="card bg-base-100 border border-base-300 p-6 rounded-3xl shadow-sm space-y-5 h-fit">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-400 border-b border-base-300 pb-2">Thông tin phân công</h4>
          
          {error && (
            <div className="alert alert-error text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          {providerCandidatesLoaded && operators.length === 0 && (
            <div className="alert alert-warning text-xs rounded-xl space-y-2">
              <div className="flex gap-2">
                <Lucide.AlertTriangle size={16} className="flex-shrink-0" />
                <div>
                  <p className="font-bold">Không thể tải danh sách đơn vị xử lý</p>
                  <p className="text-[11px] mt-1">Hiện tại chưa có đơn vị xử lý phù hợp được trả về cho phản ánh này.</p>
                 
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAssign} className="space-y-4 text-xs">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs">Chọn đơn vị thi công xử lý *</span>
              </label>
              {operators.length > 0 ? (
                <select 
                  value={selectedOperatorId} 
                  onChange={(e) => {
                    setSelectedOperatorId(e.target.value);
                    if (e.target.value) setManualOperatorId('');
                  }}
                  className="select select-bordered select-sm rounded-xl font-bold"
                >
                  <option value="">-- Chọn từ danh sách đơn vị xử lý --</option>
                  {operators.map((op) => (
                    <option key={op.operatorId} value={op.operatorId}>
                      {op.operatorName}{op.contactPhone ? ` (${op.contactPhone})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-[11px] text-gray-500">Không thể tải danh sách từ hệ thống. Bạn có thể nhập trực tiếp mã đơn vị xử lý bên dưới.</div>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs">Hoặc nhập mã đơn vị xử lý</span>
              </label>
              <input
                type="text"
                value={manualOperatorId}
                onChange={(e) => {
                  setManualOperatorId(e.target.value);
                  if (e.target.value) setSelectedOperatorId('');
                }}
                placeholder="VD: 123"
                className="input input-bordered input-sm rounded-xl font-semibold"
              />
            </div>

            <div className="bg-warning/10 border border-warning/20 p-4 rounded-2xl space-y-1 text-[11px] text-gray-600">
              <div className="flex items-center gap-1.5 text-warning font-extrabold">
                <Lucide.Clock size={14} />
                <span>Quy chuẩn SLA dịch vụ</span>
              </div>
              <p className="font-medium">Ưu tiên <span className="font-bold text-primary">{ticket.priority}</span>: Yêu cầu khắc phục trong vòng <span className="font-bold text-primary">{slaHours} giờ</span>.</p>
              <p className="font-medium">Thời hạn hoàn tất dự kiến: <span className="font-bold text-base-content">{projectedDeadline.toLocaleString()}</span></p>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs">Ghi chú giao việc</span>
              </label>
              <textarea 
                rows="3"
                placeholder="Nhập hướng dẫn xử lý cụ thể, lưu ý về vị trí, các yêu cầu kỹ thuật..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="textarea textarea-bordered text-xs font-semibold p-2.5 rounded-xl"
              ></textarea>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => navigate(-1)}
                className="btn btn-sm btn-ghost flex-1 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="btn btn-sm btn-primary flex-1 rounded-xl font-bold disabled:opacity-50"
                disabled={assignLoading || (!selectedOperatorId && !manualOperatorId)}
              >
                {assignLoading ? <span className="loading loading-spinner"></span> : 'Xác Nhận Phân Công'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
