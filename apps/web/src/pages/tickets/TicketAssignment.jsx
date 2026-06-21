// src/pages/tickets/TicketAssignment.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { assignmentApi } from '../../services/api/assignmentApi';
import { toolsApi } from '@urbanmind/shared-api';
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
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const resTicket = await ticketApi.getTicketById(id);
        const resOps = await assignmentApi.getOperators(resTicket?.categoryId);

        setTicket(resTicket);
        setOperators(resOps);
        if (resOps.length > 0) {
          setSelectedOperatorId(resOps[0].operatorId);
        }
      } catch (err) {
        console.error(err);
        navigate('/staff/queue');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [id, navigate]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedOperatorId) {
      setError('Vui lòng chọn đơn vị xử lý.');
      return;
    }

    const operatorId = Number(selectedOperatorId);
    if (!Number.isInteger(operatorId) || operatorId <= 0) {
      setError('Đơn vị xử lý không hợp lệ.');
      return;
    }

    const selectedOperator = operators.find((op) => Number(op.operatorId) === operatorId);
    if (!selectedOperator) {
      setError('Đơn vị xử lý đã chọn không tồn tại. Vui lòng tải lại trang.');
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
        operatorId,
        staffUserId: user.userId,
        note,
      };
      console.debug('Assignment payload', assignmentPayload);
      await assignmentApi.assignTicket(assignmentPayload);
      alert('Phân công xử lý thành công! Đội kỹ thuật đã được thông báo.');
      navigate('/dashboard');
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
              Category: {toolsApi.getCategories().find(c => c.categoryId === ticket.categoryId)?.categoryName}
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

          {operators.length === 0 && (
            <div className="alert alert-warning text-xs rounded-xl space-y-2">
              <div className="flex gap-2">
                <Lucide.AlertTriangle size={16} className="flex-shrink-0" />
                <div>
                  <p className="font-bold">Không thể tải danh sách đơn vị xử lý</p>
                  <p className="text-[11px] mt-1">Tài khoản của bạn không có quyền truy cập danh sách này. Quyền Admin được yêu cầu.</p>
                  <p className="text-[11px] mt-1 italic">Vui lòng liên hệ với Admin để được cấp quyền hoặc sử dụng tài khoản Admin.</p>
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
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                  className="select select-bordered select-sm rounded-xl font-bold"
                  required
                >
                  {operators.map((op) => (
                    <option key={op.operatorId} value={op.operatorId}>
                      {op.operatorName} ({op.contactPhone})
                    </option>
                  ))}
                </select>
              ) : (
                <select 
                  disabled
                  className="select select-bordered select-sm rounded-xl font-bold opacity-50"
                >
                  <option>-- Không có đơn vị xử lý (Cần quyền Admin) --</option>
                </select>
              )}
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
                disabled={assignLoading || !selectedOperatorId || operators.length === 0}
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
