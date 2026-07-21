// src/pages/staff/ManagementFeedbackDetailPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import { managementTypes, STATUS_BADGE_CLASSES, PRIORITY_BADGE_CLASSES } from '@urbanmind/shared-types';
import { signalrService } from '../../services/socket/signalrService';
import { LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import IncidentMap from '../../components/maps/IncidentMap';
import { getCategoryLabel } from '../../utils/categoryLabels';
import * as Lucide from 'lucide-react';

export const ManagementFeedbackDetailPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageMessage, setPageMessage] = useState({ type: '', text: '' });
  const [categories, setCategories] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidatesLoadError, setCandidatesLoadError] = useState('');
  const [linkedFeedbacks, setLinkedFeedbacks] = useState([]);
  const [linkedFeedbacksLoading, setLinkedFeedbacksLoading] = useState(false);
  const [linkedFeedbacksError, setLinkedFeedbacksError] = useState('');
  const [relatedFeedbacks, setRelatedFeedbacks] = useState([]);
  const [relatedFeedbacksLoading, setRelatedFeedbacksLoading] = useState(false);
  const [relatedFeedbacksError, setRelatedFeedbacksError] = useState('');

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
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState(null);

  // Load feedback details
  useEffect(() => {
    const loadFeedback = async () => {
      setLoading(true);
      setError('');
      setCandidatesLoadError('');
      try {
        const feedbackRes = await managementFeedbackApi.getFeedbackById(feedbackId);
        const linkedFeedbackId = feedbackRes?.feedbackId || feedbackId;
        const [categoriesRes, candidatesRes, linkedFeedbacksRes] = await Promise.allSettled([
          toolsApi.getCategories(),
          managementFeedbackApi.getProviderCandidates(linkedFeedbackId),
          managementFeedbackApi.getLinkedFeedbacks(linkedFeedbackId),
        ]);

        setCategories(Array.isArray(categoriesRes.value) ? categoriesRes.value : []);
        if (candidatesRes.status === 'fulfilled') {
          setCandidates(Array.isArray(candidatesRes.value) ? candidatesRes.value : []);
        } else {
          setCandidates([]);
          setCandidatesLoadError(candidatesRes.reason?.message || 'Không thể tải danh sách đơn vị xử lý.');
        }

        if (linkedFeedbacksRes.status === 'fulfilled') {
          setLinkedFeedbacks(Array.isArray(linkedFeedbacksRes.value) ? linkedFeedbacksRes.value : []);
          setLinkedFeedbacksError('');
        } else {
          setLinkedFeedbacks([]);
          setLinkedFeedbacksError(linkedFeedbacksRes.reason?.message || 'Không thể tải danh sách phản ánh liên kết.');
        }

        setFeedback(feedbackRes);
        setEditForm({
          categoryId: feedbackRes?.categoryId ?? '',
          title: feedbackRes?.title || '',
          description: feedbackRes?.description || '',
          locationText: feedbackRes?.locationText || '',
          latitude: feedbackRes?.latitude ?? '',
          longitude: feedbackRes?.longitude ?? '',
          priority: feedbackRes?.priority || '',
          dueDate: feedbackRes?.dueDate || '',
          status: feedbackRes?.status || '',
          statusNote: '',
        });
      } catch (err) {
        console.error('Failed to load feedback details', err);
        setError('Không thể tải chi tiết phản ánh. Vui lòng thử lại.');
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
      const payload = {
        ...editForm,
        categoryId: editForm.categoryId === '' ? null : editForm.categoryId,
        latitude: editForm.latitude === '' ? null : editForm.latitude,
        longitude: editForm.longitude === '' ? null : editForm.longitude,
      };

      await managementFeedbackApi.updateFeedback(feedbackId, payload);
      setFeedback(prev => ({ ...prev, ...payload }));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update feedback', err);
      setPageMessage({ type: 'error', text: err?.message || 'Không thể cập nhật phản ánh.' });
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
      try {
        signalrService.notifyStatusChanged(feedbackId, feedback?.status, statusForm.status, user);
      } catch (e) {
        console.warn('SignalR notify failed', e);
      }
      setStatusModal(false);
      setStatusForm({ status: '', note: '' });
    } catch (err) {
      console.error('Failed to update status', err);
      setPageMessage({ type: 'error', text: err?.message || 'Không thể cập nhật trạng thái phản ánh.' });
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle verify
  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      await managementFeedbackApi.verifyFeedback(feedbackId);
      setFeedback(prev => ({ ...prev, status: managementTypes.feedbackStatus.VERIFIED }));
    } catch (err) {
      console.error('Failed to verify feedback', err);
      setPageMessage({ type: 'error', text: err?.message || 'Không thể xác minh phản ánh.' });
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

    const selectedCandidate = candidates.find((c) => Number(c.coordinatorId) === operatorId);
    if (!selectedCandidate) {
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
        coordinatorId: operatorId,
        staffUserId: user.userId,
        note: assignForm.note,
      };

      await managementFeedbackApi.assignToOperator(payload);
      setFeedback(prev => ({ ...prev, status: managementTypes.feedbackStatus.ASSIGNED }));
      try {
        signalrService.notifyAssignmentUpdated(feedbackId, operatorId, selectedCandidate.coordinatorName || selectedCandidate.providerName, user);
        signalrService.notifyStatusChanged(feedbackId, feedback?.status, managementTypes.feedbackStatus.ASSIGNED, user);
      } catch (e) {
        console.warn('SignalR notify failed', e);
      }
      setAssignModal(false);
      setAssignForm({ operatorId: '', note: '' });
    } catch (err) {
      console.error('Failed to assign feedback', err);
      setError(err.message || 'Không thể phân công phản ánh. Vui lòng thử lại.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Open provider report workspace for this feedback
  const openProviderReportWorkspace = async () => {
    try {
      const reports = await managementFeedbackApi.getProviderReports(feedbackId);
      const report = Array.isArray(reports) ? reports[0] : (reports && typeof reports === 'object' ? reports : null);
      const providerReportId = report?.providerReportId || report?.id || report?.providerReport?.providerReportId || report?.providerReportId;
      if (providerReportId) {
        navigate(`/staff/provider-reports/${providerReportId}`, {
          state: {
            feedbackId,
            providerReport: report,
          },
        });
      } else {
        setPageMessage({ type: 'error', text: 'Không tìm thấy báo cáo xử lý cho phản ánh này.' });
      }
    } catch (err) {
      console.error('Failed to open provider report workspace', err);
      setPageMessage({ type: 'error', text: 'Không thể mở báo cáo xử lý.' });
    }
  };

  const getStatusLabel = (s) => {
    const labels = {
      [managementTypes.feedbackStatus.SUBMITTED]: 'Đã gửi',
      [managementTypes.feedbackStatus.VERIFIED]: 'Đã xác minh',
      [managementTypes.feedbackStatus.ASSIGNED]: 'Đã giao',
      [managementTypes.feedbackStatus.IN_PROGRESS]: 'Đang xử lý',
      [managementTypes.feedbackStatus.RESOLVED]: 'Hoàn thành',
      [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 'Chờ duyệt',
      [managementTypes.feedbackStatus.APPROVED]: 'Đã duyệt',
      [managementTypes.feedbackStatus.REJECTED]: 'Bị từ chối',
      [managementTypes.feedbackStatus.NEED_REWORK]: 'Cần sửa lại',
      [managementTypes.feedbackStatus.CLOSED]: 'Đã đóng',
      [managementTypes.feedbackStatus.CANCELLED]: 'Đã hủy',
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

  const nextStatusOptions = managementTypes.statusFlow[feedback?.status] || [];

  const canVerify = [managementTypes.feedbackStatus.SUBMITTED, managementTypes.feedbackStatus.AI_REVIEWED].includes(feedback?.status);
  const canAssign = feedback?.status === managementTypes.feedbackStatus.VERIFIED;
  const canUpdateStatus = nextStatusOptions.length > 0;

  const attachments = Array.isArray(feedback?.attachments) ? feedback.attachments : [];
  const comments = Array.isArray(feedback?.comments) ? feedback.comments : [];

  useEffect(() => {
    const loadLinkedFeedbacks = async () => {
      if (!feedbackId) return;

      setLinkedFeedbacksLoading(true);
      setLinkedFeedbacksError('');
      try {
        const linkedFeedbackId = feedback?.feedbackId || feedbackId;
        const response = await managementFeedbackApi.getLinkedFeedbacks(linkedFeedbackId);
        setLinkedFeedbacks(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error('Failed to load linked feedbacks', err);
        setLinkedFeedbacks([]);
        setLinkedFeedbacksError(err?.message || 'Không thể tải danh sách phản ánh liên kết.');
      } finally {
        setLinkedFeedbacksLoading(false);
      }
    };

    if (feedback) {
      loadLinkedFeedbacks();
    }
  }, [feedback, feedbackId]);

  useEffect(() => {
    const loadRelatedFeedbacks = async () => {
      if (!feedbackId) return;

      setRelatedFeedbacksLoading(true);
      setRelatedFeedbacksError('');
      try {
        const relatedFeedbackId = feedback?.feedbackId || feedbackId;
        const response = await managementFeedbackApi.getRelatedFeedbacks(relatedFeedbackId);
        setRelatedFeedbacks(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error('Failed to load related feedbacks', err);
        setRelatedFeedbacks([]);
        setRelatedFeedbacksError(err?.message || 'Không thể tải danh sách phản ánh liên quan.');
      } finally {
        setRelatedFeedbacksLoading(false);
      }
    };

    if (feedback) {
      loadRelatedFeedbacks();
    }
  }, [feedback, feedbackId]);
  const statusHistories = useMemo(
    () => Array.isArray(feedback?.statusHistories) ? feedback.statusHistories : [],
    [feedback]
  );
  const sortedStatusHistories = useMemo(
    () => [...statusHistories].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt)),
    [statusHistories]
  );

  const timelineEvents = useMemo(() => {
    const events = [];
    const statusMeta = {
      [managementTypes.feedbackStatus.SUBMITTED]: {
        title: 'Đã gửi',
        subtitle: 'Phản ánh được tiếp nhận',
        accent: 'blue',
        icon: 'Send',
      },
      [managementTypes.feedbackStatus.AI_REVIEWED]: {
        title: 'AI đã xem xét',
        subtitle: 'Tự động phân loại và kiểm tra',
        accent: 'violet',
        icon: 'Sparkles',
      },
      [managementTypes.feedbackStatus.VERIFIED]: {
        title: 'Đã xác minh',
        subtitle: 'Thông tin được kiểm chứng',
        accent: 'sky',
        icon: 'BadgeCheck',
      },
      [managementTypes.feedbackStatus.ASSIGNED]: {
        title: 'Đã phân công',
        subtitle: 'Đơn vị xử lý được chỉ định',
        accent: 'indigo',
        icon: 'UserRoundCheck',
      },
      [managementTypes.feedbackStatus.IN_PROGRESS]: {
        title: 'Đang xử lý',
        subtitle: 'Đội xử lý đã bắt đầu công việc',
        accent: 'amber',
        icon: 'Wrench',
      },
      [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: {
        title: 'Đã nộp duyệt',
        subtitle: 'Kết quả sẵn sàng chờ phê duyệt',
        accent: 'teal',
        icon: 'FileCheck2',
      },
      [managementTypes.feedbackStatus.APPROVED]: {
        title: 'Đã duyệt',
        subtitle: 'Kết quả được chấp thuận',
        accent: 'emerald',
        icon: 'CheckCircle2',
      },
      [managementTypes.feedbackStatus.REJECTED]: {
        title: 'Đã từ chối',
        subtitle: 'Yêu cầu cần điều chỉnh',
        accent: 'rose',
        icon: 'XCircle',
      },
      [managementTypes.feedbackStatus.NEED_REWORK]: {
        title: 'Yêu cầu làm lại',
        subtitle: 'Bổ sung thông tin hoặc chỉnh sửa',
        accent: 'orange',
        icon: 'RefreshCw',
      },
      [managementTypes.feedbackStatus.CLOSED]: {
        title: 'Đã đóng',
        subtitle: 'Hồ sơ đã hoàn tất',
        accent: 'slate',
        icon: 'Archive',
      },
    };

    const pushEvent = (item) => {
      if (!item) return;
      events.push({
        id: item.id,
        type: item.type || 'status',
        title: item.title,
        subtitle: item.subtitle,
        actor: item.actor || 'Hệ thống',
        timestamp: item.timestamp,
        note: item.note || '',
        accent: item.accent || 'slate',
        icon: item.icon || 'CircleDot',
      });
    };

    if (feedback?.createdAt) {
      pushEvent({
        id: 'creation',
        type: 'status',
        title: 'Đã gửi',
        subtitle: 'Phản ánh được tạo và nhập vào hệ thống',
        actor: feedback?.submittedByName || feedback?.submittedBy || 'Công dân',
        timestamp: feedback.createdAt,
        note: feedback?.description || 'Phản ánh đã được ghi nhận trong hệ thống.',
        accent: 'blue',
        icon: 'Send',
      });
    }

    sortedStatusHistories.forEach((history, index) => {
      const meta = statusMeta[history.newStatus] || {
        title: getStatusLabel(history.newStatus),
        subtitle: 'Cập nhật trạng thái',
        accent: 'slate',
        icon: 'CircleDot',
      };
      const eventType = history.newStatus === managementTypes.feedbackStatus.ASSIGNED || history.newStatus === managementTypes.feedbackStatus.IN_PROGRESS
        ? 'assignment'
        : history.newStatus === managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL || history.newStatus === managementTypes.feedbackStatus.APPROVED || history.newStatus === managementTypes.feedbackStatus.REJECTED || history.newStatus === managementTypes.feedbackStatus.NEED_REWORK
          ? 'approval'
          : 'status';

      pushEvent({
        id: `history-${index}`,
        type: eventType,
        title: meta.title,
        subtitle: meta.subtitle,
        actor: history.changedByUserName || 'Hệ thống',
        timestamp: history.changedAt,
        note: history.note || '',
        accent: meta.accent,
        icon: meta.icon,
      });
    });

    if (feedback?.assignment?.operatorName) {
      const hasAssignmentEvent = events.some((event) => event.title === 'Đã phân công' || event.title === 'Đang xử lý');
      if (!hasAssignmentEvent) {
        pushEvent({
          id: 'assignment',
          type: 'assignment',
          title: 'Thay đổi phân công',
          subtitle: `Đã giao cho ${feedback.assignment.operatorName}`,
          actor: feedback.assignment.assignedByName || 'Hệ thống',
          timestamp: feedback.assignment.assignedAt || feedback.updatedAt || feedback.createdAt,
          note: feedback.assignment.note || 'Đơn vị xử lý đã được cập nhật.',
          accent: 'indigo',
          icon: 'UserRoundCheck',
        });
      }
    }

    if (feedback?.resolution?.resolutionSummary || feedback?.resolution?.notes) {
      pushEvent({
        id: 'resolution',
        type: 'approval',
        title: 'Kết quả xử lý',
        subtitle: 'Đơn vị xử lý đã nộp kết quả',
        actor: feedback?.assignment?.operatorName || 'Đơn vị xử lý',
        timestamp: feedback?.resolution?.submittedAt || feedback?.updatedAt || feedback?.createdAt,
        note: feedback?.resolution?.resolutionSummary || feedback?.resolution?.notes || '',
        accent: 'emerald',
        icon: 'FileCheck2',
      });
    }

    return events;
  }, [feedback, sortedStatusHistories]);

  useEffect(() => {
    if (timelineEvents.length > 0 && !selectedTimelineEventId) {
      setSelectedTimelineEventId(timelineEvents[0].id);
    }
  }, [timelineEvents, selectedTimelineEventId]);

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
      {pageMessage.type === 'success' && (
        <SuccessAlert
          message={pageMessage.text}
          onClose={() => setPageMessage({ type: '', text: '' })}
        />
      )}
      {pageMessage.type === 'error' && (
        <ErrorAlert
          message={pageMessage.text}
          onClose={() => setPageMessage({ type: '', text: '' })}
        />
      )}
      {/* Breadcrumb */}
      <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
        <button
          type="button"
          onClick={() => navigate('/staff/queue')}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Quay lại hàng đợi"
        >
          Hàng đợi
        </button>
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
                  <div className="relative">
                    <button
                      onClick={() => setAssignModal(true)}
                      className="btn btn-sm bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-lg text-xs font-bold"
                    >
                      <Lucide.UserPlus size={14} />
                      Giao việc
                    </button>
                    {assignModal && (
                      <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setAssignModal(false)} />
                        <div className="absolute left-0 top-full mt-2 z-[10000] w-[min(100vw-2rem,28rem)]">
                          <div className="card max-h-[calc(100vh-6rem)] overflow-y-auto space-y-4 rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-900">Giao việc cho nhân viên xử lý</h3>
                            
                            {candidates.length === 0 ? (
                              <div className="card bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
                                <div className="flex gap-2">
                                  <Lucide.AlertTriangle className="text-amber-600 flex-shrink-0" size={16} />
                                  <div className="space-y-2 text-xs">
                                    <p className="font-bold text-amber-900">Không có đơn vị xử lý phù hợp</p>
                                    <p className="text-amber-800">Không tìm thấy nhà cung cấp phù hợp với khu vực hoặc hạng mục của phản ánh này.</p>
                                    {candidatesLoadError ? (
                                      <p className="text-amber-700 italic">Lỗi: {candidatesLoadError}</p>
                                    ) : (
                                      <p className="text-amber-700 italic">Vui lòng kiểm tra lại sau hoặc liên hệ với quản trị viên nếu bạn nghĩ có sai sót.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Tìm nhà cung cấp</label>
                                  <input
                                    placeholder="Tìm theo tên nhà cung cấp hoặc điều phối viên..."
                                    value={candidateSearch}
                                    onChange={(e) => setCandidateSearch(e.target.value)}
                                    className="input input-bordered w-full text-xs h-10 rounded-lg mb-2"
                                  />
                                  <select
                                    value={assignForm.operatorId}
                                    onChange={(e) => setAssignForm(p => ({ ...p, operatorId: e.target.value }))}
                                    className="select select-bordered w-full text-xs h-10 rounded-lg"
                                  >
                                    <option value="">-- Chọn nhà cung cấp --</option>
                                    {candidates.filter(c => {
                                      const q = candidateSearch.trim().toLowerCase();
                                      if (!q) return true;
                                      return (c.providerName || '').toLowerCase().includes(q) || (c.coordinatorName || '').toLowerCase().includes(q);
                                    }).map(c => (
                                      <option key={c.coordinatorId} value={c.coordinatorId}>
                                        {`${c.providerName || `Nhà thầu ${c.coordinatorId}`} — ${c.coordinatorName || 'Điều phối viên'}`}
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

                                {assignForm.operatorId && (
                                  (() => {
                                    const sel = candidates.find(c => String(c.coordinatorId) === String(assignForm.operatorId));
                                    if (!sel) return null;
                                    return (
                                      <div className="card bg-base-100 border p-3 rounded-lg mt-3 text-xs">
                                        <div className="font-bold">{sel.providerName || 'Không có tên nhà cung cấp'}</div>
                                        <div className="text-muted">Điều phối viên: {sel.coordinatorName || '—'}</div>
                                        <div className="mt-2">Area Match: {sel.areaMatch ?? sel.note ?? 'Không có dữ liệu'}</div>
                                        <div>Category Match: {sel.categoryMatch ?? (sel.priorityOrder !== undefined ? `priority ${sel.priorityOrder}` : 'Không có dữ liệu')}</div>
                                      </div>
                                    );
                                  })()
                                )}
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
                                disabled={assignLoading || !assignForm.operatorId || candidates.length === 0}
                                className="btn bg-[#0052CC] hover:bg-[#0043a4] text-white border-none flex-1 rounded-lg text-xs disabled:opacity-50"
                              >
                                {assignLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Giao việc'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {canUpdateStatus && (
                  <div className="relative">
                    <button
                      onClick={() => setStatusModal(true)}
                      className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold"
                    >
                      <Lucide.RefreshCw size={14} />
                      Cập nhật
                    </button>
                    {statusModal && (
                      <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setStatusModal(false)} />
                        <div className="absolute left-0 top-full mt-2 z-[10000] w-[min(100vw-2rem,28rem)]">
                          <div className="card max-h-[calc(100vh-6rem)] overflow-y-auto space-y-4 rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
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
                      </>
                    )}
                  </div>
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
                      <option key={cat.categoryId} value={cat.categoryId}>{getCategoryLabel(cat.categoryName || cat.name || cat.categoryType || cat.type)}</option>
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
                    onChange={(e) => setEditForm(p => ({ ...p, latitude: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                    className="input input-bordered w-full text-xs h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Kinh độ</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.longitude}
                    onChange={(e) => setEditForm(p => ({ ...p, longitude: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                    className="input input-bordered w-full text-xs h-10 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Trạng thái</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                    className="select select-bordered w-full text-xs h-10 rounded-lg"
                  >
                    <option value="">Giữ nguyên</option>
                    <option value="Submitted">Đã gửi</option>
                    <option value="AI Reviewed">Đã xem xét AI</option>
                    <option value="Verified">Đã xác minh</option>
                    <option value="Assigned">Đã phân công</option>
                    <option value="InProgress">Đang xử lý</option>
                    <option value="Resolved">Đã xử lý</option>
                    <option value="SubmittedForApproval">Chờ nghiệm thu</option>
                    <option value="Approved">Đã duyệt</option>
                    <option value="Rejected">Bị từ chối</option>
                    <option value="NeedRework">Cần làm lại</option>
                    <option value="Closed">Đã đóng</option>
                    <option value="Cancelled">Đã hủy</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Ghi chú trạng thái</label>
                  <input
                    type="text"
                    value={editForm.statusNote}
                    onChange={(e) => setEditForm(p => ({ ...p, statusNote: e.target.value }))}
                    className="input input-bordered w-full text-xs h-10 rounded-lg"
                    placeholder="Nhập ghi chú nếu có"
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

          <div className="card bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">Phản ánh liên kết</h3>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {linkedFeedbacks.length} mục
              </span>
            </div>

            {linkedFeedbacksLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                <span className="loading loading-spinner loading-sm mr-2" />
                Đang tải phản ánh liên kết...
              </div>
            ) : linkedFeedbacksError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {linkedFeedbacksError}
              </div>
            ) : linkedFeedbacks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 text-center">
                Không có phản ánh liên kết nào.
              </div>
            ) : (
              <div className="space-y-3">
                {linkedFeedbacks.map((item, index) => {
                  const childFeedbackId = item?.feedbackId || item?.id;
                  return (
                    <div key={childFeedbackId || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Feedback ID</div>
                          <div className="font-semibold text-slate-900">{childFeedbackId || '—'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Trạng thái</div>
                          <div className="text-sm font-semibold text-slate-900">{getStatusLabel(item?.status)}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Người báo cáo</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {item?.reporterName || item?.reporter?.name || item?.userName || '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Ngày tạo</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatDate(item?.createdAt || item?.createdDate)}
                          </div>
                        </div>
                      </div>
                      {childFeedbackId && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/staff/feedbacks/${childFeedbackId}`)}
                            className="btn btn-xs btn-outline rounded-lg"
                          >
                            <Lucide.ExternalLink size={12} />
                            Xem phản ánh con
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">Phản ánh liên quan</h3>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {relatedFeedbacks.length} mục
              </span>
            </div>

            {relatedFeedbacksLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                <span className="loading loading-spinner loading-sm mr-2" />
                Đang tải phản ánh liên quan...
              </div>
            ) : relatedFeedbacksError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {relatedFeedbacksError}
              </div>
            ) : relatedFeedbacks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 text-center">
                Không có phản ánh liên quan nào.
              </div>
            ) : (
              <div className="space-y-3">
                {relatedFeedbacks.map((item, index) => {
                  const relatedId = item?.feedbackId || item?.id;
                  return (
                    <div key={relatedId || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Feedback ID</div>
                          <div className="font-semibold text-slate-900">{relatedId || '—'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Trạng thái</div>
                          <div className="text-sm font-semibold text-slate-900">{getStatusLabel(item?.status)}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Danh mục</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {getCategoryLabel(item?.categoryName || item?.category?.name || item?.categoryType || item?.type)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Ngày tạo</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatDate(item?.createdAt || item?.createdDate)}
                          </div>
                        </div>
                      </div>
                      {relatedId && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/staff/feedbacks/${relatedId}`)}
                            className="btn btn-xs btn-outline rounded-lg"
                          >
                            <Lucide.ExternalLink size={12} />
                            Xem chi tiết
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
              <div className="text-sm font-bold text-slate-900 mt-1">{getCategoryLabel(feedback.categoryName || feedback.category?.name || feedback.categoryType || feedback.type)}</div>
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
          {timelineEvents.length > 0 && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Theo dõi hồ sơ</div>
                  <h3 className="mt-1 text-lg font-black text-slate-900">Theo dõi hồ sơ từ đầu đến cuối</h3>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {timelineEvents.length} mốc thời gian
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-3">
                  {timelineEvents.map((event) => {
                    const Icon = Lucide[event.icon] || Lucide.CircleDot;
                    const isActive = event.id === selectedTimelineEventId;
                    const accentClass = event.accent === 'blue'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : event.accent === 'violet'
                        ? 'border-violet-200 bg-violet-50 text-violet-700'
                        : event.accent === 'sky'
                          ? 'border-sky-200 bg-sky-50 text-sky-700'
                          : event.accent === 'indigo'
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : event.accent === 'amber'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : event.accent === 'teal'
                                ? 'border-teal-200 bg-teal-50 text-teal-700'
                                : event.accent === 'emerald'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : event.accent === 'rose'
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : event.accent === 'orange'
                                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-700';

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedTimelineEventId(event.id)}
                        className={`flex w-full items-start gap-3 rounded-[1.25rem] border p-4 text-left transition ${isActive ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${isActive ? 'border-white/20 bg-white/10 text-white' : accentClass}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className={`text-sm font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>{event.title}</div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {event.type === 'assignment' ? 'Phân công' : event.type === 'approval' ? 'Phê duyệt' : 'Trạng thái'}
                            </span>
                          </div>
                          <div className={`mt-1 text-sm ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{event.subtitle}</div>
                          <div className={`mt-2 text-xs ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{event.actor} • {formatDate(event.timestamp)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  {(() => {
                    const activeEvent = timelineEvents.find((event) => event.id === selectedTimelineEventId) || timelineEvents[0];
                    if (!activeEvent) return null;
                    const ActiveIcon = Lucide[activeEvent.icon] || Lucide.CircleDot;
                    return (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Mốc đang xem</div>
                            <div className="mt-1 text-xl font-black text-slate-900">{activeEvent.title}</div>
                          </div>
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                            <ActiveIcon size={18} />
                          </div>
                        </div>

                        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                          <div className="text-sm font-semibold text-slate-900">{activeEvent.subtitle}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">{activeEvent.actor}</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">{formatDate(activeEvent.timestamp)}</span>
                          </div>
                          {activeEvent.note ? (
                            <div className="mt-3 rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-sm leading-7 text-slate-600">
                              {activeEvent.note}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                              Không có ghi chú chi tiết cho bước này.
                            </div>
                          )}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-[1rem] border border-slate-200 bg-white p-3 text-sm">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Thực hiện bởi</div>
                            <div className="mt-1 font-semibold text-slate-700">{activeEvent.actor}</div>
                          </div>
                          <div className="rounded-[1rem] border border-slate-200 bg-white p-3 text-sm">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Thời điểm</div>
                            <div className="mt-1 font-semibold text-slate-700">{formatDate(activeEvent.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Timeline Progress */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-slate-900">Tiến độ hồ sơ</h3>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Trực tiếp
              </span>
            </div>
            {(() => {
              const TIMELINE_ORDER = [
                managementTypes.feedbackStatus.SUBMITTED,
                managementTypes.feedbackStatus.AI_REVIEWED,
                managementTypes.feedbackStatus.VERIFIED,
                managementTypes.feedbackStatus.ASSIGNED,
                managementTypes.feedbackStatus.IN_PROGRESS,
                managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
                managementTypes.feedbackStatus.APPROVED,
                managementTypes.feedbackStatus.CLOSED,
              ];

              const currentIndex = TIMELINE_ORDER.indexOf(feedback.status);

              return (
                <div className="mt-4 space-y-3">
                  {TIMELINE_ORDER.map((step, idx) => {
                    const done = currentIndex > idx;
                    const current = currentIndex === idx;
                    const history = sortedStatusHistories.find(h => h.newStatus === step) || null;
                    const timeLabel = history ? formatDate(history.changedAt) : (step === managementTypes.feedbackStatus.SUBMITTED ? formatDate(feedback.createdAt) : '');

                    return (
                      <div key={step} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`h-3 w-3 rounded-full border-4 border-white ${done || current ? 'bg-[#0052CC]' : 'bg-slate-200'}`}></div>
                          {idx < TIMELINE_ORDER.length - 1 && (
                            <div className={`mt-1 w-[2px] flex-1 ${done ? 'bg-[#0052CC]' : 'bg-slate-200'}`} style={{ minHeight: 28 }}></div>
                          )}
                        </div>
                        <div className="flex-1 rounded-[1rem] border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className={`text-sm font-bold ${current ? 'text-slate-900' : 'text-slate-700'}`}>{getStatusLabel(step)}</div>
                          <div className="mt-1 text-xs text-slate-500">{timeLabel || 'Đang chờ cập nhật'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <div className="card bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-900">Hành động tiếp theo</h3>
            <p className="text-sm text-slate-600">
              {canVerify
                ? 'Xác minh phản ánh trước khi phân công đội xử lý.'
                : canAssign
                ? 'Phân công ngay để phản ánh bắt đầu vào quy trình xử lý.'
                : nextStatusOptions.length > 0
                ? 'Cập nhật trạng thái khi phản ánh đã sẵn sàng cho bước tiếp theo.'
                : 'Đã hoàn thành hoặc không cần hành động tiếp theo.'}
            </p>
            <div className="space-y-3">
              {canVerify && (
                <button
                  onClick={handleVerify}
                  disabled={verifyLoading}
                  className="btn btn-sm w-full bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-lg"
                >
                  {verifyLoading ? <span className="loading loading-spinner loading-xs"></span> : <Lucide.Check size={14} />}
                  Xác minh phản ánh
                </button>
              )}
              {canAssign && (
                <button
                  onClick={() => setAssignModal(true)}
                  className="btn btn-sm w-full bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-lg"
                >
                  <Lucide.UserPlus size={14} />
                  Phân công đơn vị xử lý
                </button>
              )}
              <button
                onClick={() => navigate(`/staff/feedbacks/${feedbackId}/request-info`)}
                className="btn btn-sm w-full btn-outline rounded-lg"
              >
                <Lucide.MessageSquarePlus size={14} />
                Yêu cầu thêm thông tin
              </button>
              <button
                onClick={() => navigate(`/staff/feedbacks/${feedbackId}/history`)}
                className="btn btn-sm w-full btn-outline rounded-lg"
              >
                <Lucide.History size={14} />
                Xem lịch sử phân công
              </button>
              <button
                onClick={openProviderReportWorkspace}
                className="btn btn-sm w-full btn-outline rounded-lg"
              >
                <Lucide.FileText size={14} />
                Mở báo cáo xử lý
              </button>
              {nextStatusOptions.length > 0 && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500 font-bold mb-2">Trạng thái tiếp theo</div>
                  <div className="flex flex-wrap gap-2">
                    {nextStatusOptions.map((nextStatus) => (
                      <span
                        key={nextStatus}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[nextStatus] || 'bg-slate-100 text-slate-700'}`}
                      >
                        {getStatusLabel(nextStatus)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!
                canVerify &&
                !canAssign &&
                nextStatusOptions.length === 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    Không còn bước nào cần thực hiện cho phản ánh này.
                  </div>
                )}
            </div>
          </div>

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
                <div className="mt-1 font-bold">{getCategoryLabel(feedback.categoryName || feedback.category?.name || feedback.categoryType || feedback.type)}</div>
              </div>
              <div>
                <div className="text-slate-500 font-bold">Đơn vị xử lý</div>
                <div className="mt-1 font-bold">{feedback.operatorName || feedback.assignedOperatorName || 'Chưa phân công'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[99999]">
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
