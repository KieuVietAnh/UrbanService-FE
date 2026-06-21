// src/pages/staff/ManagementFeedbackDetailPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { assignmentApi, toolsApi } from '@urbanmind/shared-api';
import { managementTypes, STATUS_BADGE_CLASSES, PRIORITY_BADGE_CLASSES } from '@urbanmind/shared-types';
import { LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import IncidentMap from '../../components/maps/IncidentMap';
import * as Lucide from 'lucide-react';

export const ManagementFeedbackDetailPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [operators, setOperators] = useState([]);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Status update
  const [statusModal, setStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [statusLoading, setStatusLoading] = useState(false);

  // Verify
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Assignment
  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ operatorId: '', note: '' });
  const [assignLoading, setAssignLoading] = useState(false);

  // Preview attachment
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Load feedback details
  useEffect(() => {
    const loadFeedback = async () => {
      setLoading(true);
      setError('');
      try {
        const feedbackRes = await managementFeedbackApi.getFeedbackById(feedbackId);
        const [categoriesRes, operatorsRes] = await Promise.all([
          toolsApi.getCategories(),
          assignmentApi.getOperators(feedbackRes?.categoryId),
        ]);

        setFeedback(feedbackRes);
        setEditForm({
          categoryId: feedbackRes?.categoryId || '',
          title: feedbackRes?.title || '',
          description: feedbackRes?.description || '',
          locationText: feedbackRes?.locationText || '',
          latitude: feedbackRes?.latitude || '',
          longitude: feedbackRes?.longitude || '',
          priority: feedbackRes?.priority || '',
          dueDate: feedbackRes?.dueDate || '',
        });
        setStatusForm({ status: feedbackRes?.status || '', note: '' });
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
        setOperators(Array.isArray(operatorsRes) ? operatorsRes : []);
      } catch (err) {
        console.error('Failed to load feedback details', err);
        setError('Unable to load feedback details.');
      } finally {
        setLoading(false);
      }
    };

    if (feedbackId) {
      loadFeedback();
    }
  }, [feedbackId]);

  // Handle edit
  const handleEdit = async () => {
    setEditLoading(true);
    try {
      await managementFeedbackApi.updateFeedback(feedbackId, editForm);
      setFeedback(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update feedback', err);
      alert('Unable to update feedback');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    setStatusLoading(true);
    try {
      await managementFeedbackApi.updateStatus(feedbackId, {
        status: statusForm.status,
        note: statusForm.note,
      });
      setFeedback(prev => ({ ...prev, status: statusForm.status }));
      setStatusModal(false);
      setStatusForm({ status: '', note: '' });
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Unable to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle verify
  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      await managementFeedbackApi.verifyFeedback(feedbackId);
      setFeedback(prev => ({ ...prev, status: 'Verified' }));
    } catch (err) {
      console.error('Failed to verify feedback', err);
      alert('Unable to verify feedback');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Handle assign
  const handleAssign = async () => {
    setError('');
    if (!assignForm.operatorId) {
      setError('Vui lòng chọn đơn vị xử lý.');
      return;
    }

    const operatorId = Number(assignForm.operatorId);
    if (!Number.isInteger(operatorId) || operatorId <= 0) {
      setError('Đơn vị xử lý không hợp lệ.');
      return;
    }

    const selectedOperator = operators.find((op) => Number(op.operatorId) === operatorId);
    if (!selectedOperator) {
      setError('Đơn vị xử lý đã chọn không tồn tại. Vui lòng tải lại trang.');
      return;
    }

    if (!feedbackId) {
      setError('Mã phản ánh không hợp lệ. Vui lòng tải lại trang và thử lại.');
      return;
    }

    if (!user?.userId) {
      setError('Thông tin người dùng không hợp lệ. Vui lòng đăng nhập lại.');
      return;
    }

    setAssignLoading(true);
    try {
      const payload = {
        feedbackId,
        operatorId,
        staffUserId: user.userId,
        note: assignForm.note,
      };
      console.log('Assignment payload', payload);

      await managementFeedbackApi.assignToOperator(payload);
      setFeedback(prev => ({ ...prev, status: 'Assigned' }));
      setAssignModal(false);
      setAssignForm({ operatorId: '', note: '' });
    } catch (err) {
      console.error('Failed to assign feedback', err);
      setError(err.message || 'Không thể phân công phản ánh. Vui lòng thử lại.');
    } finally {
      setAssignLoading(false);
    }
  };

  const getStatusLabel = (s) => {
    const labels = {
      'Submitted': 'Đã gửi',
      'Verified': 'Đã xác minh',
      'Assigned': 'Đã giao',
      'InProgress': 'Đang xử lý',
      'Resolved': 'Hoàn thành',
      'SubmittedForApproval': 'Chờ duyệt',
      'Approved': 'Đã duyệt',
      'Rejected': 'Bị từ chối',
      'NeedRework': 'Cần sửa lại',
      'Closed': 'Đã đóng',
      'Cancelled': 'Đã hủy',
    };
    return labels[s] || s;
  };

  const getPriorityLabel = (p) => {
    const labels = {
      'Low': 'Thấp',
      'Medium': 'Trung bình',
      'High': 'Cao',
      'Critical': 'Khẩn cấp',
    };
    return labels[p] || p;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isVideoFile = (fileUrl = '') => {
    const url = fileUrl.toLowerCase();
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || url.includes('.mov') || url.includes('.m4v');
  };

  const getAttachmentUrl = (attachment) => {
    if (typeof attachment === 'string') return attachment;
    return attachment?.fileUrl || attachment?.url || attachment?.path || '';
  };

  const canVerify = feedback?.status === 'Submitted';
  const canAssign = feedback?.status === 'Verified';
  const canUpdateStatus = ['Verified', 'Assigned', 'InProgress'].includes(feedback?.status);

  const attachments = Array.isArray(feedback?.attachments) ? feedback.attachments : [];
  const comments = Array.isArray(feedback?.comments) ? feedback.comments : [];
  const statusHistories = useMemo(
    () => Array.isArray(feedback?.statusHistories) ? feedback.statusHistories : [],
    [feedback]
  );
  const sortedStatusHistories = useMemo(
    () => [...statusHistories].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt)),
    [statusHistories]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="space-y-4">
        <ErrorAlert 
          title="Không thể tải chi tiết phản ánh"
          message={error || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại hoặc quay lại danh sách.'}
        />
        <button
          onClick={() => navigate('/staff/queue')}
          className="btn btn-outline btn-sm rounded-lg"
        >
          <Lucide.ArrowLeft size={16} />
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
        <span className="cursor-pointer hover:text-slate-600" onClick={() => navigate('/staff/queue')}>
          Hàng đợi
        </span>
        <Lucide.ChevronRight size={12} />
        <span className="text-[#0052CC]">{feedback.title}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Header Card */}
          <div className="card bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{feedback.title}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${STATUS_BADGE_CLASSES[feedback.status]}`}>
                    {getStatusLabel(feedback.status)}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${PRIORITY_BADGE_CLASSES[feedback.priority]}`}>
                    {getPriorityLabel(feedback.priority)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {canVerify && (
                  <button
                    onClick={handleVerify}
                    disabled={verifyLoading}
                    className="btn btn-sm bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-lg text-xs font-bold"
                  >
                    {verifyLoading ? <span className="loading loading-spinner loading-xs"></span> : <Lucide.Check size={14} />}
                    Xác minh
                  </button>
                )}
                {canAssign && (
                  <button
                    onClick={() => setAssignModal(true)}
                    className="btn btn-sm bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-lg text-xs font-bold"
                  >
                    <Lucide.UserPlus size={14} />
                    Giao việc
                  </button>
                )}
                {canUpdateStatus && (
                  <button
                    onClick={() => setStatusModal(true)}
                    className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold"
                  >
                    <Lucide.RefreshCw size={14} />
                    Cập nhật
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold"
                >
                  <Lucide.Edit size={14} />
                  {isEditing ? 'Hủy' : 'Sửa'}
                </button>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="card bg-blue-50 border border-blue-200 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-900">Chỉnh sửa thông tin</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Danh mục</label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm(p => ({ ...p, categoryId: e.target.value }))}
                    className="select select-bordered w-full text-xs h-10 rounded-lg"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(cat => (
                      <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Ưu tiên</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm(p => ({ ...p, priority: e.target.value }))}
                    className="select select-bordered w-full text-xs h-10 rounded-lg"
                  >
                    <option value="">Chọn ưu tiên</option>
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Cao</option>
                    <option value="Critical">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tiêu đề</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className="input input-bordered w-full text-xs h-10 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Mô tả</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                  className="textarea textarea-bordered w-full text-xs rounded-lg"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={editForm.locationText}
                    onChange={(e) => setEditForm(p => ({ ...p, locationText: e.target.value }))}
                    className="input input-bordered w-full text-xs h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Ngày hạn</label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="input input-bordered w-full text-xs h-10 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Vĩ độ</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.latitude}
                    onChange={(e) => setEditForm(p => ({ ...p, latitude: parseFloat(e.target.value) }))}
                    className="input input-bordered w-full text-xs h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Kinh độ</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.longitude}
                    onChange={(e) => setEditForm(p => ({ ...p, longitude: parseFloat(e.target.value) }))}
                    className="input input-bordered w-full text-xs h-10 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  disabled={editLoading}
                  className="btn btn-sm bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-lg"
                >
                  {editLoading ? <span className="loading loading-spinner loading-xs"></span> : <Lucide.Save size={14} />}
                  Lưu
                </button>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-white border border-slate-200 p-4 rounded-xl col-span-2">
              <div className="text-[10px] text-slate-500 font-bold">Mô tả</div>
              <div className="text-sm font-bold text-slate-900 mt-1 whitespace-pre-line">{feedback.description || 'Không có mô tả'}</div>
            </div>
            <div className="card bg-white border border-slate-200 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 font-bold">Người báo cáo</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{feedback.userName || feedback.reporterName}</div>
            </div>
            <div className="card bg-white border border-slate-200 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 font-bold">Ngày tạo</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{formatDate(feedback.createdAt)}</div>
            </div>
            <div className="card bg-white border border-slate-200 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 font-bold">Danh mục</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{feedback.categoryName}</div>
            </div>
            <div className="card bg-white border border-slate-200 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 font-bold">Địa điểm</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{feedback.locationText || '-'}</div>
            </div>
            <div className="card bg-white border border-slate-200 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 font-bold">Ngày hạn</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{feedback.dueDate ? formatDate(feedback.dueDate) : 'Chưa có'}</div>
            </div>
          </div>

          {/* Map */}
          {feedback.latitude && feedback.longitude && (
            <div className="card bg-white border border-slate-200 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-600">Bản đồ</div>
                  <div className="text-[11px] text-slate-500">Nhấp vào để mở Google Maps hoặc xem điểm trên bản đồ.</div>
                </div>
                <a
                  href={`https://www.google.com/maps/?q=${feedback.latitude},${feedback.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-xs btn-ghost text-[#0052CC]"
                >
                  <Lucide.MapPin size={12} />
                  Google Maps
                </a>
              </div>
              <div className="h-[300px] rounded-3xl overflow-hidden">
                <IncidentMap incidents={[feedback]} />
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="card bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-900">Tệp đính kèm ({attachments.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments.map((attachment, idx) => {
                  const fileUrl = getAttachmentUrl(attachment);
                  const isVideo = isVideoFile(fileUrl);
                  return (
                    <div
                      key={idx}
                      className="relative bg-slate-100 rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => setPreviewAttachment(fileUrl)}
                    >
                      {isVideo ? (
                        <div className="w-full aspect-video bg-slate-800 flex items-center justify-center group-hover:bg-slate-900">
                          <Lucide.Play className="text-white" size={32} />
                        </div>
                      ) : (
                        <img
                          src={fileUrl}
                          alt={`Attachment ${idx}`}
                          className="w-full aspect-video object-cover group-hover:opacity-75"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition"></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="card bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">Bình luận</h3>
              <span className="text-xs text-slate-500">{comments.length} bình luận</span>
            </div>
            {comments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-slate-500 text-xs text-center">
                Chưa có bình luận nào.
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment, idx) => (
                  <div key={comment.commentId || comment.id || idx} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-slate-800">{comment.userName || comment.author || 'Người dùng'}</div>
                      <div className="text-[10px] text-slate-500">
                        {comment.createdAt ? formatDate(comment.createdAt) : ''}
                      </div>
                    </div>
                    <div className="mt-2 text-slate-700 whitespace-pre-line">{comment.content || comment.message || comment.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          {sortedStatusHistories.length > 0 && (
            <div className="card bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-900">Lịch sử trạng thái</h3>
              <div className="space-y-4">
                {sortedStatusHistories.map((history, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-[#0052CC] border-4 border-white"></div>
                      {idx < statusHistories.length - 1 && (
                        <div className="w-0.5 h-8 bg-slate-200 my-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {history.oldStatus} → {history.newStatus}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {history.changedByUserName} • {formatDate(history.changedAt)}
                      </div>
                      {history.note && (
                        <div className="text-xs text-slate-700 mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                          {history.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Info Card */}
          <div className="card bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-900">Thông tin</h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-slate-500 font-bold">Trạng thái</div>
                <div className="mt-1 font-bold">{getStatusLabel(feedback.status)}</div>
              </div>
              <div>
                <div className="text-slate-500 font-bold">Ưu tiên</div>
                <div className="mt-1 font-bold">{getPriorityLabel(feedback.priority)}</div>
              </div>
              <div>
                <div className="text-slate-500 font-bold">Danh mục</div>
                <div className="mt-1 font-bold">{feedback.categoryName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Cập nhật trạng thái</h3>
            
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Trạng thái mới</label>
              <select
                value={statusForm.status}
                onChange={(e) => setStatusForm(p => ({ ...p, status: e.target.value }))}
                className="select select-bordered w-full text-xs h-10 rounded-lg"
              >
                <option value="">Chọn trạng thái</option>
                {managementTypes.statusFlow[feedback.status]?.map(s => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Ghi chú</label>
              <textarea
                value={statusForm.note}
                onChange={(e) => setStatusForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Nhập ghi chú..."
                className="textarea textarea-bordered w-full text-xs rounded-lg"
                rows="3"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStatusModal(false)}
                className="btn btn-ghost flex-1 rounded-lg text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={statusLoading || !statusForm.status}
                className="btn bg-[#0052CC] hover:bg-[#0043a4] text-white border-none flex-1 rounded-lg text-xs"
              >
                {statusLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Giao việc cho nhân viên xử lý</h3>
            
            {operators.length === 0 ? (
              <div className="card bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
                <div className="flex gap-2">
                  <Lucide.AlertTriangle className="text-amber-600 flex-shrink-0" size={16} />
                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-amber-900">Không thể tải danh sách đơn vị xử lý</p>
                    <p className="text-amber-800">Tài khoản của bạn không có quyền truy cập danh sách này. Quyền Admin được yêu cầu.</p>
                    <p className="text-amber-700 italic">Vui lòng liên hệ với Admin để được cấp quyền hoặc sử dụng tài khoản Admin.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Chọn nhân viên</label>
                  <select
                    value={assignForm.operatorId}
                    onChange={(e) => setAssignForm(p => ({ ...p, operatorId: e.target.value }))}
                    className="select select-bordered w-full text-xs h-10 rounded-lg"
                  >
                    <option value="">-- Chọn đơn vị xử lý --</option>
                    {operators.map(op => (
                      <option key={op.operatorId} value={op.operatorId}>
                        {op.operatorName || op.fullName || `Đơn vị ${op.operatorId}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Ghi chú</label>
                  <textarea
                    value={assignForm.note}
                    onChange={(e) => setAssignForm(p => ({ ...p, note: e.target.value }))}
                    placeholder="Nhập ghi chú cho nhân viên..."
                    className="textarea textarea-bordered w-full text-xs rounded-lg"
                    rows="3"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setAssignModal(false)}
                className="btn btn-ghost flex-1 rounded-lg text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleAssign}
                disabled={assignLoading || !assignForm.operatorId || operators.length === 0}
                className="btn bg-[#0052CC] hover:bg-[#0043a4] text-white border-none flex-1 rounded-lg text-xs disabled:opacity-50"
              >
                {assignLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Giao việc'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <Lucide.X size={24} />
            </button>
            {isVideoFile(previewAttachment) ? (
              <video
                src={previewAttachment}
                controls
                className="w-full rounded-lg"
              />
            ) : (
              <img
                src={previewAttachment}
                alt="Preview"
                className="w-full rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
