// src/pages/staff/ManagementFeedbackDetailPage.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFeedbackMessages } from '../../contexts/FeedbackMessagesContextHook';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import { managementTypes, getStatusIntent } from '@urbanmind/shared-types';
import { signalrService } from '../../services/socket/signalrService';
import { LoadingSpinner, EmptyState, ConfirmationModal } from '@urbanmind/shared-ui';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import DelightToast from '../../components/delight/DelightToast';
import IncidentMap from '../../components/maps/IncidentMap';
import { getCategoryLabel } from '../../utils/categoryLabels';
import * as Lucide from 'lucide-react';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';

const CITIZEN_NOTIFICATION_TEMPLATES = [
  {
    id: 'received',
    label: 'Đã tiếp nhận',
    shortLabel: 'Tiếp nhận phản ánh',
    title: 'Phản ánh đã được tiếp nhận',
    message: 'Đơn vị phụ trách đã tiếp nhận phản ánh của bạn và đang xem xét xử lý.',
  },
  {
    id: 'processing',
    label: 'Đang xử lý',
    shortLabel: 'Đang xử lý phản ánh',
    title: 'Phản ánh đang được xử lý',
    message: 'Đơn vị phụ trách đang tiến hành xử lý phản ánh của bạn.',
  },
  {
    id: 'completed',
    label: 'Đã hoàn thành',
    shortLabel: 'Hoàn tất xử lý',
    title: 'Phản ánh đã được xử lý',
    message: 'Đơn vị phụ trách đã hoàn thành việc xử lý phản ánh của bạn.',
  },
  {
    id: 'need-info',
    label: 'Cần bổ sung thông tin',
    shortLabel: 'Yêu cầu thêm thông tin',
    title: 'Cần bổ sung thông tin',
    message: 'Vui lòng cung cấp thêm thông tin để hỗ trợ quá trình xử lý phản ánh.',
  },
  {
    id: 'rejected',
    label: 'Từ chối xử lý',
    shortLabel: 'Không đủ điều kiện',
    title: 'Phản ánh không đủ điều kiện xử lý',
    message: 'Phản ánh hiện chưa đủ điều kiện để tiếp tục xử lý.',
  },
  {
    id: 'custom',
    label: 'Tùy chỉnh',
    shortLabel: 'Soạn riêng',
    title: '',
    message: '',
  },
];

export const ManagementFeedbackDetailPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

  const getUrgencyLevel = (currentFeedback) => {
    const urgency = currentFeedback?.priority || currentFeedback?.analysisResult?.urgencyLevel || currentFeedback?.urgencyLevel || currentFeedback?.urgency || '';
    return `${urgency}`.trim();
  };

  const getSuggestedSeverity = (urgency = '') => {
    const normalized = `${urgency || ''}`.trim().toLowerCase();
    if (normalized === 'critical') return 'Critical';
    if (normalized === 'high') return 'High';
    return 'Medium';
  };

  const getFeedbackAreaId = (currentFeedback) => {
    return currentFeedback?.areaId ?? currentFeedback?.area?.areaId ?? '';
  };

  const getFeedbackCategoryId = (currentFeedback) => {
    return currentFeedback?.categoryId ?? currentFeedback?.category?.categoryId ?? '';
  };

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Status update
  const [statusModal, setStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [statusLoading, setStatusLoading] = useState(false);

  // Area alert creation
  const [showAreaAlertModal, setShowAreaAlertModal] = useState(false);
  const [areaAlertForm, setAreaAlertForm] = useState({
    title: '',
    message: '',
    severity: 'Medium',
    startAt: '',
    endAt: '',
    radiusMeters: '',
    areaId: '',
    categoryId: '',
  });
  const [areaAlertErrors, setAreaAlertErrors] = useState({});
  const [areaAlertLoading, setAreaAlertLoading] = useState(false);
  const [areaAlertToast, setAreaAlertToast] = useState({ open: false, message: '', sub: '' });

  // Verify
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Assignment
  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ operatorId: '', note: '' });
  const [assignLoading, setAssignLoading] = useState(false);

  // Preview attachment
  const [previewAttachmentIndex, setPreviewAttachmentIndex] = useState(null);
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState(null);

  // Citizen notification
  const [notificationForm, setNotificationForm] = useState({ templateId: 'custom', title: '', message: '', targetUrl: '' });
  const [notificationErrors, setNotificationErrors] = useState({});
  const [notificationSubmitting, setNotificationSubmitting] = useState(false);
  const [notificationConfirmOpen, setNotificationConfirmOpen] = useState(false);
  const [pendingNotificationPayload, setPendingNotificationPayload] = useState(null);
  const [notificationToast, setNotificationToast] = useState({ open: false, message: '', sub: '' });
  const [notificationActivities, setNotificationActivities] = useState([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Internal communication
  const [messageDraft, setMessageDraft] = useState('');
  const [composerMode, setComposerMode] = useState('public');
  const messageViewportRef = useRef(null);
  const exchangeSectionRef = useRef(null);
  const initialExchangeFocusHandledRef = useRef(false);
  const [activeViewTab, setActiveViewTab] = useState(() => location.state?.focusExchange ? 'exchange' : 'detail');

  const {
    messages,
    messagesLoading,
    messagesError,
    messageSubmitting,
    loadMessages: reloadFeedbackMessages,
    sendMessage: sendFeedbackMessage,
  } = useFeedbackMessages();

  // Load feedback details
  useEffect(() => {
    let active = true;

    const loadFeedback = async () => {
      setLoading(true);
      setError('');
      setCandidatesLoadError('');
      try {
        const feedbackRes = await managementFeedbackApi.getFeedbackById(feedbackId);

        if (!active) return;

        setFeedback(feedbackRes);
        setLoading(false);

        const linkedFeedbackId = feedbackRes?.feedbackId || feedbackId;
        const [categoriesRes, candidatesRes] = await Promise.allSettled([
          toolsApi.getCategories(),
          managementFeedbackApi.getProviderCandidates(linkedFeedbackId),
        ]);

        if (!active) return;

        setCategories(
          categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value)
            ? categoriesRes.value
            : []
        );
        if (candidatesRes.status === 'fulfilled') {
          setCandidates(Array.isArray(candidatesRes.value) ? candidatesRes.value : []);
        } else {
          setCandidates([]);
          setCandidatesLoadError(candidatesRes.reason?.message || 'Không thể tải danh sách đơn vị xử lý.');
        }

        // Debug: log urgency-related fields so we can see why the button may be hidden
        try {
          const dbg = {
            id: feedbackRes?.feedbackId || feedbackId,
            urgencyFromHelper: getUrgencyLevel(feedbackRes),
            urgencyLevel: feedbackRes?.urgencyLevel,
            urgency: feedbackRes?.urgency,
            priority: feedbackRes?.priority,
          };
          console.debug('DEBUG_FEEDBACK_URGENCY', dbg);
          // also print a compact string for easy copy/paste
          let analysisJson = '';
          try {
            analysisJson = JSON.stringify(feedbackRes?.analysisResult || {});
          } catch {
            analysisJson = '[unserializable]';
          }
          console.info(`DEBUG_FEEDBACK_URGENCY_SUMMARY id=${dbg.id} helper=${dbg.urgencyFromHelper} urgencyLevel=${dbg.urgencyLevel} urgency=${dbg.urgency} priority=${dbg.priority} analysisResult=${analysisJson}`);
        } catch {
          // ignore
        }
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
        setAreaAlertForm({
          title: feedbackRes?.title || feedbackRes?.description || '',
          message: feedbackRes?.description || feedbackRes?.title || '',
          severity: getSuggestedSeverity(getUrgencyLevel(feedbackRes)),
          startAt: '',
          endAt: '',
          radiusMeters: '',
          areaId: String(getFeedbackAreaId(feedbackRes) || ''),
          categoryId: String(getFeedbackCategoryId(feedbackRes) || ''),
        });
      } catch (err) {
        if (!active) return;
        console.error('Failed to load feedback details', err);
        setError('Không thể tải chi tiết phản ánh. Vui lòng thử lại.');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (feedbackId) {
      loadFeedback();
    }

    return () => {
      active = false;
    };
  }, [feedbackId]);

  useEffect(() => {
    if (!feedbackId) {
      return;
    }

    reloadFeedbackMessages();
  }, [feedbackId, reloadFeedbackMessages]);

  const handleMessageSend = async () => {
    if (!feedbackId || !messageDraft.trim()) return;

    try {
      const refreshed = await sendFeedbackMessage({
        messageText: messageDraft.trim(),
        isInternal: composerMode === 'internal',
      });

      if (refreshed) {
        sessionStorage.setItem('staff-conversation-count-dirty', '1');
        setMessageDraft('');
        setPageMessage({ type: '', text: '' });
      } else {
        setPageMessage({ type: '', text: '' });
      }
    } catch (err) {
      console.error('Failed to send feedback message', err);
      setPageMessage({ type: 'error', text: 'Không thể gửi trao đổi. Vui lòng thử lại.' });
    }
  };

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
      } catch {
        console.warn('SignalR notify failed');
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
      } catch {
        console.warn('SignalR notify failed');
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

  const handleAreaAlertFieldChange = (field, value) => {
    setAreaAlertForm((current) => ({ ...current, [field]: value }));
    setAreaAlertErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateAreaAlertForm = () => {
    const nextErrors = {};
    if (!areaAlertForm.title?.trim()) nextErrors.title = 'Vui lòng nhập tiêu đề cảnh báo.';
    if (!areaAlertForm.message?.trim()) nextErrors.message = 'Vui lòng nhập nội dung cảnh báo.';
    if (!areaAlertForm.severity?.trim()) nextErrors.severity = 'Vui lòng chọn mức độ nghiêm trọng.';
    if (!areaAlertForm.startAt?.trim()) nextErrors.startAt = 'Vui lòng chọn thời gian bắt đầu.';
    return nextErrors;
  };

  const handleCreateAreaAlert = async () => {
    const validationErrors = validateAreaAlertForm();
    if (Object.keys(validationErrors).length > 0) {
      setAreaAlertErrors(validationErrors);
      return;
    }

    setAreaAlertLoading(true);
    try {
      const payload = {
        title: areaAlertForm.title?.trim(),
        message: areaAlertForm.message?.trim(),
        severity: areaAlertForm.severity,
        startAt: areaAlertForm.startAt ? new Date(areaAlertForm.startAt).toISOString() : undefined,
        endAt: areaAlertForm.endAt ? new Date(areaAlertForm.endAt).toISOString() : undefined,
        radiusMeters: areaAlertForm.radiusMeters ? Number(areaAlertForm.radiusMeters) : undefined,
      };
      await managementFeedbackApi.createAreaAlertFromFeedback(feedbackId, payload);
      setShowAreaAlertModal(false);
      setAreaAlertToast({ open: true, message: 'Cảnh báo khu vực đã được tạo', sub: 'Cảnh báo mới đã gửi thành công từ phản ánh.' });
    } catch (err) {
      console.error('Failed to create area alert', err);
      const submitMessage = err?.message || 'Không thể tạo cảnh báo khu vực. Vui lòng thử lại.';
      setAreaAlertErrors({ submit: submitMessage });
      setAreaAlertToast({ open: true, message: 'Tạo cảnh báo khu vực thất bại', sub: submitMessage });
    } finally {
      setAreaAlertLoading(false);
    }
  };

  const handleNotificationFieldChange = (field, value) => {
    setNotificationForm((current) => ({ ...current, [field]: value }));
    setNotificationErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateNotificationForm = () => {
    const nextErrors = {};
    if (!notificationForm.title?.trim()) nextErrors.title = 'Vui lòng nhập tiêu đề thông báo.';
    if (!notificationForm.message?.trim()) nextErrors.message = 'Vui lòng nhập nội dung thông báo.';
    return nextErrors;
  };

  const openNotificationConfirmation = () => {
    const validationErrors = validateNotificationForm();
    if (Object.keys(validationErrors).length > 0) {
      setNotificationErrors(validationErrors);
      return;
    }

    const payload = {
      templateId: notificationForm.templateId,
      title: notificationForm.title?.trim(),
      message: notificationForm.message?.trim(),
      targetUrl: notificationForm.targetUrl?.trim() || undefined,
    };

    setPendingNotificationPayload(payload);
    setNotificationConfirmOpen(true);
  };

  const handleSendCitizenNotification = async () => {
    if (!feedbackId || !pendingNotificationPayload) return;

    setNotificationSubmitting(true);
    setNotificationConfirmOpen(false);
    try {
      await managementFeedbackApi.notifyProviderResult(feedbackId, pendingNotificationPayload);
      setNotificationToast({
        open: true,
        message: 'Đã gửi thông báo cho người dân',
        sub: 'Thông báo sẽ được gửi ngay sau khi xác nhận.',
      });
      setNotificationActivities((current) => [
        {
          id: `${Date.now()}`,
          title: 'Đã gửi thông báo cho người dân',
          subtitle: pendingNotificationPayload.title,
          timestamp: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 3));
      if (notificationForm.templateId === 'custom') {
        setNotificationForm({ templateId: 'custom', title: '', message: '', targetUrl: '' });
      }
      setNotificationErrors({});
    } catch (err) {
      console.error('Failed to send citizen notification', err);
      setNotificationToast({
        open: true,
        message: 'Gửi thông báo thất bại',
        sub: err?.message || 'Không thể gửi thông báo cho người dân lúc này.',
      });
    } finally {
      setNotificationSubmitting(false);
      setPendingNotificationPayload(null);
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

  const isHighOrCriticalUrgency = (currentFeedback) => {
    const urgency = getUrgencyLevel(currentFeedback).toLowerCase();
    // Match common variants like 'High', 'high (ai)', 'HIGH', 'HighUrgency', etc.
    return urgency.includes('high') || urgency.includes('critical');
  };

  const forceShowAreaAlert = (() => {
    try {
      return typeof window !== 'undefined' && window.location.search.includes('forceAreaAlert');
    } catch {
      return false;
    }
  })();

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

  const suggestedNotificationTemplateId = useMemo(() => {
    const status = `${feedback?.status || ''}`.trim();
    if (status === managementTypes.feedbackStatus.IN_PROGRESS) return 'processing';
    if (status === managementTypes.feedbackStatus.RESOLVED || status === managementTypes.feedbackStatus.APPROVED || status === managementTypes.feedbackStatus.CLOSED) return 'completed';
    if (status === managementTypes.feedbackStatus.REJECTED) return 'rejected';
    if (status === managementTypes.feedbackStatus.NEED_REWORK) return 'need-info';
    if (status === managementTypes.feedbackStatus.SUBMITTED || status === managementTypes.feedbackStatus.VERIFIED || status === managementTypes.feedbackStatus.ASSIGNED) return 'received';
    return 'custom';
  }, [feedback?.status]);

  const notificationContentValid = useMemo(() => {
    const title = notificationForm.title?.trim();
    const message = notificationForm.message?.trim();
    return Boolean(notificationForm.templateId && title && message);
  }, [notificationForm.templateId, notificationForm.title, notificationForm.message]);

  const recipientSummary = useMemo(() => ({
    name: feedback?.userName
      || feedback?.reporterName
      || feedback?.reporter?.name
      || feedback?.user?.fullName
      || feedback?.user?.name
      || feedback?.citizenName
      || feedback?.residentName
      || feedback?.createdByName
      || feedback?.createdBy?.name
      || feedback?.ownerName
      || 'Chưa có thông tin',
    feedbackCode: feedback?.feedbackCode || feedback?.code || feedback?.feedbackId || feedback?.id || '—',
    area: feedback?.area?.name || feedback?.areaName || feedback?.wardName || feedback?.locationText || 'Chưa cập nhật',
  }), [feedback]);

  const isVideoFile = (fileUrl = '') => {
    const url = fileUrl.toLowerCase();
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || url.includes('.mov') || url.includes('.m4v');
  };

  const getAttachmentUrl = (attachment) => {
    if (typeof attachment === 'string') return attachment;
    return attachment?.fileUrl || attachment?.url || attachment?.path || '';
  };

  const nextStatusOptions = managementTypes.statusFlow[feedback?.status] || [];

  const parentFeedbackId = feedback?.parentTicketId || feedback?.parentFeedbackId || null;
  const isConfirmedDuplicate = Boolean(parentFeedbackId);
  const isMasterTicket = Boolean(feedback?.isMasterTicket);
  const canVerify = !isConfirmedDuplicate && [managementTypes.feedbackStatus.SUBMITTED, managementTypes.feedbackStatus.AI_REVIEWED].includes(feedback?.status);
  const canAssign = !isConfirmedDuplicate && feedback?.status === managementTypes.feedbackStatus.VERIFIED;
  const canUpdateStatus = !isConfirmedDuplicate && nextStatusOptions.length > 0;

  const attachments = useMemo(
    () => (Array.isArray(feedback?.attachments) ? feedback.attachments : []),
    [feedback]
  );
  const previewItems = useMemo(
    () => attachments.filter((attachment) => Boolean(getAttachmentUrl(attachment))),
    [attachments]
  );
  const previewAttachment = (
    previewAttachmentIndex !== null
    && previewAttachmentIndex >= 0
    && previewAttachmentIndex < previewItems.length
  )
    ? previewItems[previewAttachmentIndex]
    : null;
  const previewAttachmentUrl = previewAttachment ? getAttachmentUrl(previewAttachment) : '';

  const movePreview = useCallback((direction) => {
    if (previewItems.length < 2) return;

    setPreviewAttachmentIndex((currentIndex) => {
      if (currentIndex === null) return null;
      return (currentIndex + direction + previewItems.length) % previewItems.length;
    });
  }, [previewItems.length]);

  useEffect(() => {
    if (previewAttachmentIndex === null) return undefined;

    const handlePreviewKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewAttachmentIndex(null);
      } else if (event.key === 'ArrowLeft') {
        movePreview(-1);
      } else if (event.key === 'ArrowRight') {
        movePreview(1);
      }
    };

    document.addEventListener('keydown', handlePreviewKeyDown);
    return () => document.removeEventListener('keydown', handlePreviewKeyDown);
  }, [previewAttachmentIndex, movePreview]);


  useEffect(() => {
    if (activeViewTab !== 'exchange') return;
    const viewport = messageViewportRef.current;
    if (!viewport) return;

    requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
  }, [activeViewTab, messages.length]);

  useEffect(() => {
    if (
      loading
      || activeViewTab !== 'exchange'
      || !location.state?.focusExchange
      || initialExchangeFocusHandledRef.current
    ) {
      return;
    }

    initialExchangeFocusHandledRef.current = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        exchangeSectionRef.current?.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        });
      });
    });
  }, [activeViewTab, loading, location.state]);

  const handleViewTabChange = (tabId) => {
    setActiveViewTab(tabId);

    if (tabId !== 'exchange') return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        exchangeSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
  };

  const comments = Array.isArray(feedback?.comments) ? feedback.comments : [];

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    const loadLinkedFeedbacks = async () => {
      if (!feedbackId || !isMasterTicket) {
        setLinkedFeedbacks([]);
        setLinkedFeedbacksError('');
        setLinkedFeedbacksLoading(false);
        return;
      }

      setLinkedFeedbacksLoading(true);
      setLinkedFeedbacksError('');
      try {
        const linkedFeedbackId = feedback?.feedbackId || feedbackId;
        const response = await managementFeedbackApi.getLinkedFeedbacks(linkedFeedbackId, {
          signal: abortController.signal,
        });
        if (active) setLinkedFeedbacks(Array.isArray(response) ? response : []);
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error('Failed to load linked feedbacks', err);
        if (active) {
          setLinkedFeedbacks([]);
          setLinkedFeedbacksError(err?.message || 'Không thể tải danh sách phản ánh liên kết.');
        }
      } finally {
        if (active) setLinkedFeedbacksLoading(false);
      }
    };

    if (feedback) {
      loadLinkedFeedbacks();
    }

    return () => {
      active = false;
      abortController.abort();
    };
  }, [feedback, feedbackId, isMasterTicket]);

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    const loadRelatedFeedbacks = async () => {
      if (!parentFeedbackId) {
        setRelatedFeedbacks([]);
        setRelatedFeedbacksError('');
        setRelatedFeedbacksLoading(false);
        return;
      }

      setRelatedFeedbacksLoading(true);
      setRelatedFeedbacksError('');
      try {
        const response = await managementFeedbackApi.getRelatedFeedbacks(feedbackId, {
          signal: abortController.signal,
        });
        if (active) setRelatedFeedbacks(Array.isArray(response) ? response : []);
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error('Failed to load related feedbacks', err);
        if (active) {
          setRelatedFeedbacks([]);
          setRelatedFeedbacksError(err?.message || 'Không thể tải danh sách phản ánh liên quan.');
        }
      } finally {
        if (active) setRelatedFeedbacksLoading(false);
      }
    };

    if (feedback) {
      loadRelatedFeedbacks();
    }

    return () => {
      active = false;
      abortController.abort();
    };
  }, [feedback, feedbackId, parentFeedbackId]);
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
        accent: 'amber',
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

  const isStaffMessage = (message) => {
    const normalizedRole = `${message?.userRole || ''}`.toLowerCase();
    const senderType = `${message?.senderType || ''}`.toLowerCase();
    return normalizedRole.includes('staff')
      || normalizedRole.includes('manager')
      || normalizedRole.includes('admin')
      || normalizedRole.includes('system')
      || senderType.includes('staff')
      || senderType.includes('system');
  };

  const getMessageAuthor = (message) => {
    return message?.userFullName || message?.userName || message?.author || 'Hệ thống';
  };

  const getMessageBody = (message) => {
    return message?.messageText || message?.message || message?.note || '';
  };

  const getMessageAvatar = (label) => {
    return (label || '')
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const messageItems = useMemo(() => {
    return Array.isArray(messages)
      ? [...messages].sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0))
      : [];
  }, [messages]);

  const groupedMessageBlocks = useMemo(() => {
    const blocks = [];
    let currentBlock = null;

    messageItems.forEach((message) => {
      const author = getMessageAuthor(message);
      const isInternal = Boolean(message?.isInternal);
      const isStaff = isStaffMessage(message) && !isInternal;
      const senderKey = `${isInternal ? 'internal' : isStaff ? 'staff' : 'resident'}|${author}`;

      if (!currentBlock || currentBlock.senderKey !== senderKey) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          senderKey,
          author,
          isInternal,
          isStaff,
          messages: [],
        };
      }

      currentBlock.messages.push(message);
    });

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }, [messageItems]);

  const historyEvents = useMemo(() => {
    const accentPalette = {
      blue: { dot: 'bg-blue-600', pill: 'bg-blue-50 text-blue-700' },
      violet: { dot: 'bg-violet-600', pill: 'bg-violet-50 text-violet-700' },
      sky: { dot: 'bg-sky-600', pill: 'bg-sky-50 text-sky-700' },
      indigo: { dot: 'bg-indigo-600', pill: 'bg-indigo-50 text-indigo-700' },
      amber: { dot: 'bg-amber-600', pill: 'bg-amber-50 text-amber-700' },
      teal: { dot: 'bg-teal-600', pill: 'bg-teal-50 text-teal-700' },
      emerald: { dot: 'bg-emerald-600', pill: 'bg-emerald-50 text-emerald-700' },
      rose: { dot: 'bg-rose-600', pill: 'bg-rose-50 text-rose-700' },
      orange: { dot: 'bg-orange-600', pill: 'bg-orange-50 text-orange-700' },
      slate: { dot: 'bg-slate-500', pill: 'bg-slate-100 text-slate-700' },
    };

    const getActivityAccent = (accent) => accentPalette[accent] || accentPalette.slate;

    const mappedTimelineEvents = timelineEvents.map((event) => ({
      ...event,
      accentTone: getActivityAccent(event.accent),
      label: event.type === 'assignment' ? 'Phân công' : event.type === 'approval' ? 'Duyệt' : 'Trạng thái',
    }));

    const mappedNotificationActivities = Array.isArray(notificationActivities)
      ? notificationActivities.map((activity, index) => ({
          id: activity.id || `notification-${index}`,
          type: 'notification',
          title: activity.title || 'Thông báo',
          subtitle: activity.subtitle || '',
          actor: activity.actor || activity.sender || activity.userName || 'Hệ thống',
          timestamp: activity.timestamp,
          note: activity.note || activity.message || '',
          accent: 'rose',
          accentTone: accentPalette.rose,
          label: 'Thông báo',
        }))
      : [];

    return [...mappedTimelineEvents, ...mappedNotificationActivities].sort(
      (left, right) => new Date(left.timestamp || 0) - new Date(right.timestamp || 0)
    );
  }, [timelineEvents, notificationActivities]);

  const formatHistoryLabel = (event) => {
    if (event.type === 'notification') return 'Thông báo';
    if (event.type === 'assignment') return 'Phân công';
    if (event.type === 'approval') return 'Duyệt';
    return 'Trạng thái';
  };

  const returnToFeedbackList = useCallback(() => {
    if (location.state?.fromStaffConversations || location.state?.fromStaffFeedbackList) {
      navigate(-1);
      return;
    }

    navigate('/staff/feedbacks', {
      state: {
        restoreFeedbackId: String(feedbackId || ''),
      },
    });
  }, [location.state, navigate, feedbackId]);

  const detailParentLabel = location.state?.fromStaffConversations
    ? 'Quản lý trao đổi'
    : 'Quản lý phản ánh';

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
        <Button
          type="button"
          onClick={returnToFeedbackList}
          variant="outline"
          size="sm"
        >
          <Lucide.ArrowLeft size={16} />
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="admin-page-shell space-y-6 p-4">
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
      <div className="admin-panel p-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'detail', label: 'Chi tiết', icon: Lucide.FileText },
            { id: 'exchange', label: 'Trao đổi', icon: Lucide.MessageSquareText },
            { id: 'history', label: 'Lịch sử', icon: Lucide.Clock3 },
          ].map((tab) => {
            const selected = activeViewTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleViewTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-[0.9rem] px-4 py-2.5 text-sm font-semibold transition duration-200 ${selected ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-1 text-sm font-medium text-slate-500">
        <button
          type="button"
          onClick={returnToFeedbackList}
          className="inline-flex items-center gap-1 text-slate-500 transition hover:text-blue-600"
          aria-label={`Quay lại ${detailParentLabel.toLowerCase()}`}
        >
          {detailParentLabel}
        </button>
        <Lucide.ChevronRight size={12} />
        <span className="min-w-0 truncate font-semibold text-slate-800">{feedback.title}</span>
      </div>

      {isConfirmedDuplicate ? (
        <section className="rounded-[1.4rem] border border-violet-200 bg-violet-50 p-5 shadow-sm" aria-labelledby="staff-duplicate-feedback-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
                <Lucide.GitMerge size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 id="staff-duplicate-feedback-title" className="font-bold text-violet-950">Phản ánh trùng</h2>
                <p className="mt-1 text-sm leading-6 text-violet-800">
                  Phản ánh này đã được đánh dấu trùng và được xử lý theo phản ánh đã có.
                </p>
              </div>
            </div>
            <Button type="button" onClick={() => navigate(`/staff/feedbacks/${parentFeedbackId}`)} variant="outline" size="sm">
              <Lucide.ExternalLink size={14} aria-hidden="true" />
              Xem phản ánh đã có
            </Button>
          </div>
        </section>
      ) : null}

      {activeViewTab === 'detail' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.75fr)]">
        {/* Main Content */}
        <div className="min-w-0 space-y-6">
          {/* Header Card */}
          <div className="admin-page-hero p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
                    <Lucide.FileText size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="admin-section-description uppercase tracking-[0.2em]">Chi tiết phản ánh</div>
                    <h1 className="admin-hero-title mt-1 break-words">{feedback.title}</h1>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isConfirmedDuplicate ? (
                    <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700">
                      <Lucide.GitMerge size={14} aria-hidden="true" />
                      Phản ánh trùng
                    </span>
                  ) : null}

                  <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-white/80 px-3 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">Trạng thái</span>
                    <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                      <Lucide.CircleCheck size={14} aria-hidden="true" />
                      {getStatusLabel(feedback.status)}
                    </span>
                  </div>

                  <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">Ưu tiên</span>
                    <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <Lucide.Gauge size={14} aria-hidden="true" />
                      {getPriorityLabel(feedback.priority)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:max-w-[320px] lg:justify-end">
                {canVerify && (
                  <Button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifyLoading}
                    variant="primary"
                    size="sm"
                  >
                    {verifyLoading ? <span className="loading loading-spinner loading-xs"></span> : <Lucide.Check size={14} />}
                    Xác minh
                  </Button>
                )}
                {/* area alert button moved to map section for better context */}
                {canAssign && (
                  <div className="relative">
                    <Button
                      type="button"
                      onClick={() => setAssignModal(true)}
                      variant="primary"
                      size="sm"
                    >
                      <Lucide.UserPlus size={14} />
                      Giao việc
                    </Button>
                    {assignModal && (
                      <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setAssignModal(false)} />
                        <div className="absolute left-0 top-full mt-2 z-[10000] w-[min(100vw-2rem,28rem)]">
                          <div className="card max-h-[calc(100vh-6rem)] overflow-y-auto space-y-4 rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
                            <h3 className="admin-section-title">Giao việc cho nhân viên xử lý</h3>
                            
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
                                    className="input input-bordered w-full text-xs h-10 rounded-[1rem] border-slate-200/80 bg-[rgba(248,250,252,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] mb-2"
                                  />
                                  <select
                                    value={assignForm.operatorId}
                                    onChange={(e) => setAssignForm(p => ({ ...p, operatorId: e.target.value }))}
                                    className="select select-bordered w-full text-xs h-10 rounded-[1rem] border-slate-200/80 bg-[rgba(248,250,252,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]"
                                  >
                                    <option value="">-- Chọn nhà cung cấp --</option>
                                    {candidates.filter(c => {
                                      const q = candidateSearch.trim().toLowerCase();
                                      if (!q) return true;
                                      return (c.providerName || '').toLowerCase().includes(q) || (c.coordinatorName || '').toLowerCase().includes(q);
                                    }).map(c => (
                                      <option key={c.coordinatorId} value={c.coordinatorId}>
                                        {c.providerName ? `${c.providerName} — ${c.coordinatorName || 'Điều phối viên'}` : `Nhà thầu ${c.coordinatorId} — ${c.coordinatorName || 'Điều phối viên'}`}
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
                                    className="textarea textarea-bordered w-full text-xs rounded-[1rem] border-slate-200/80 bg-[rgba(248,250,252,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]"
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
                                        <div className="mt-2">Phù hợp khu vực: {sel.areaMatch ?? sel.note ?? 'Không có dữ liệu'}</div>
                                        <div>Phù hợp danh mục: {sel.categoryMatch ?? (sel.priorityOrder !== undefined ? `Ưu tiên ${sel.priorityOrder}` : 'Không có dữ liệu')}</div>
                                      </div>
                                    );
                                  })()
                                )}
                              </>
                            )}

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={() => setAssignModal(false)}
                                variant="ghost"
                                size="sm"
                                className="flex-1"
                              >
                                Hủy
                              </Button>
                              <Button
                                type="button"
                                onClick={handleAssign}
                                disabled={assignLoading || !assignForm.operatorId || candidates.length === 0}
                                variant="primary"
                                size="sm"
                                className="flex-1"
                              >
                                {assignLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Giao việc'}
                              </Button>
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
                      className="btn btn-sm btn-outline rounded-[1rem] border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold"
                    >
                      <Lucide.RefreshCw size={14} />
                      Cập nhật
                    </button>
                    {statusModal && (
                      <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setStatusModal(false)} />
                        <div className="absolute left-0 top-full mt-2 z-[10000] w-[min(100vw-2rem,28rem)]">
                          <div className="card max-h-[calc(100vh-6rem)] overflow-y-auto space-y-4 rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
                            <h3 className="admin-section-title">Cập nhật trạng thái</h3>
                            
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
                              <Button
                                type="button"
                                onClick={() => setStatusModal(false)}
                                variant="ghost"
                                size="sm"
                                className="flex-1"
                              >
                                Hủy
                              </Button>
                              <Button
                                type="button"
                                onClick={handleStatusUpdate}
                                disabled={statusLoading || !statusForm.status}
                                variant="primary"
                                size="sm"
                                className="flex-1"
                              >
                                {statusLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Cập nhật'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  variant="outline"
                  size="sm"
                >
                  <Lucide.Edit size={14} />
                  {isEditing ? 'Hủy' : 'Sửa'}
                </Button>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="admin-panel p-5 sm:p-6 space-y-5">
              <div>
                <div className="admin-section-description uppercase tracking-[0.2em]">Chỉnh sửa hồ sơ</div>
                <h3 className="admin-section-title mt-1">Cập nhật thông tin phản ánh</h3>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Trạng thái</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                    className="select select-bordered w-full text-xs h-10 rounded-lg"
                  >
                    <option value="">Giữ nguyên</option>
                    <option value="Submitted">Đã gửi</option>
                    <option value="AI Reviewed">Đã kiểm tra AI</option>
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
                <Button
                  type="button"
                  onClick={handleEdit}
                  disabled={editLoading}
                  variant="primary"
                  size="sm"
                >
                  {editLoading ? <span className="loading loading-spinner loading-xs"></span> : <Lucide.Save size={14} />}
                  Lưu
                </Button>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="admin-inset-panel p-4 sm:col-span-2">
              <div className="admin-section-description uppercase tracking-[0.18em]">Mô tả</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-slate-900 whitespace-pre-line">{feedback.description || 'Không có mô tả'}</div>
            </div>
            <div className="admin-inset-panel p-4">
              <div className="admin-section-description uppercase tracking-[0.18em]">Người báo cáo</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{feedback.userName || feedback.reporterName}</div>
            </div>
            <div className="admin-inset-panel p-4">
              <div className="admin-section-description uppercase tracking-[0.18em]">Ngày tạo</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{formatDate(feedback.createdAt)}</div>
            </div>
            <div className="admin-inset-panel p-4">
              <div className="admin-section-description uppercase tracking-[0.18em]">Danh mục</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{getCategoryLabel(feedback.categoryName || feedback.category?.name || feedback.categoryType || feedback.type)}</div>
            </div>
            <div className="admin-inset-panel p-4">
              <div className="admin-section-description uppercase tracking-[0.18em]">Địa điểm</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-slate-900">{feedback.locationText || '-'}</div>
            </div>
            <div className="admin-inset-panel p-4">
              <div className="admin-section-description uppercase tracking-[0.18em]">Ngày hạn</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{feedback.dueDate ? formatDate(feedback.dueDate) : 'Chưa có'}</div>
            </div>
          </div>

          {/* Map */}
          {feedback.latitude && feedback.longitude && (
            <div className="admin-panel relative overflow-visible p-4 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="admin-section-description uppercase tracking-[0.2em]">Vị trí phản ánh</div>
                  <div className="admin-section-title mt-1">Bản đồ sự cố</div>
                  <div className="mt-1 text-sm text-slate-500">Xem vị trí trên bản đồ hoặc mở nhanh bằng Google Maps.</div>
                </div>
                <a
                  href={`https://www.google.com/maps/?q=${feedback.latitude},${feedback.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Lucide.MapPin size={12} />
                  Google Maps
                </a>
              </div>
              <div className="h-[300px] rounded-3xl overflow-hidden">
                <IncidentMap incidents={[feedback]} />
              </div>
              <div className="mt-4 flex items-center justify-end">
                {(isHighOrCriticalUrgency(feedback) || forceShowAreaAlert) && (
                  <div className="relative">
                    <Button
                      type="button"
                      onClick={() => setShowAreaAlertModal(true)}
                      disabled={areaAlertLoading}
                      variant="primary"
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Lucide.BellRing size={14} />
                      Tạo cảnh báo khu vực
                    </Button>

                    {showAreaAlertModal && (
                      <div className="absolute right-0 bottom-full mb-3 z-50 w-[min(100vw-2rem,36rem)] admin-panel shadow-xl">
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-lg font-semibold text-slate-900">Tạo cảnh báo khu vực</h2>
                              <p className="mt-1 text-sm text-slate-500">Giữ lại thông tin từ phản ánh và điều chỉnh trước khi gửi.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAreaAlertModal(false)}
                              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                              aria-label="Đóng"
                            >
                              <Lucide.X size={18} />
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                              <span>Tiêu đề</span>
                              <input
                                value={areaAlertForm.title}
                                onChange={(e) => handleAreaAlertFieldChange('title', e.target.value)}
                                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400"
                              />
                              {areaAlertErrors.title && <span className="text-xs font-medium text-rose-600">{areaAlertErrors.title}</span>}
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                              <span>Mức độ</span>
                              <select
                                value={areaAlertForm.severity}
                                onChange={(e) => handleAreaAlertFieldChange('severity', e.target.value)}
                                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400"
                              >
                                <option value="Critical">Khẩn cấp</option>
                                <option value="High">Cao</option>
                                <option value="Medium">Trung bình</option>
                                <option value="Low">Thấp</option>
                              </select>
                              {areaAlertErrors.severity && <span className="text-xs font-medium text-rose-600">{areaAlertErrors.severity}</span>}
                            </label>
                          </div>

                          <label className="flex flex-col gap-2 mt-3 text-sm font-semibold text-slate-700">
                            <span>Nội dung cảnh báo</span>
                            <textarea
                              value={areaAlertForm.message}
                              onChange={(e) => handleAreaAlertFieldChange('message', e.target.value)}
                              rows={2}
                              className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400"
                            />
                            {areaAlertErrors.message && <span className="text-xs font-medium text-rose-600">{areaAlertErrors.message}</span>}
                          </label>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                              <span>Bán kính (m)</span>
                              <input
                                type="number"
                                value={areaAlertForm.radiusMeters}
                                onChange={(e) => handleAreaAlertFieldChange('radiusMeters', e.target.value)}
                                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400"
                              />
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                              <span>Danh mục</span>
                              <select
                                value={areaAlertForm.categoryId}
                                onChange={(e) => handleAreaAlertFieldChange('categoryId', e.target.value)}
                                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400"
                              >
                                <option value="">Không chọn</option>
                                {categories.map((cat) => (
                                  <option key={cat.categoryId} value={cat.categoryId}>{getCategoryLabel(cat.categoryName || cat.name || cat.categoryType || cat.type)}</option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                              <span>Bắt đầu</span>
                              <input
                                type="datetime-local"
                                value={areaAlertForm.startAt}
                                onChange={(e) => handleAreaAlertFieldChange('startAt', e.target.value)}
                                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400"
                              />
                              {areaAlertErrors.startAt && <span className="text-xs font-medium text-rose-600">{areaAlertErrors.startAt}</span>}
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                              <span>Kết thúc</span>
                              <input
                                type="datetime-local"
                                value={areaAlertForm.endAt}
                                onChange={(e) => handleAreaAlertFieldChange('endAt', e.target.value)}
                                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400"
                              />
                            </label>
                          </div>

                          {areaAlertErrors.submit && (
                            <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mt-4">
                              {areaAlertErrors.submit}
                            </div>
                          )}

                          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button
                              type="button"
                              onClick={() => setShowAreaAlertModal(false)}
                              variant="ghost"
                            >
                              Hủy
                            </Button>
                            <Button
                              type="button"
                              onClick={handleCreateAreaAlert}
                              disabled={areaAlertLoading}
                              variant="primary"
                            >
                              {areaAlertLoading ? <span className="loading loading-spinner loading-xs" /> : 'Tạo cảnh báo'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="admin-panel p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
                <Lucide.BellRing size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Thông báo cho người dân</div>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Thông báo cho người dân</h3>
                <p className="mt-1 text-sm text-slate-500">Gửi thông báo thủ công tới người dân về trạng thái xử lý phản ánh.</p>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                <Lucide.Info size={12} />
                Trạng thái hiện tại
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{feedback ? getStatusLabel(feedback.status) : 'Đang tải...'}</div>
                  <div className="mt-1 text-sm text-slate-500">Thông báo đề xuất sẽ được đánh dấu phù hợp với trạng thái hiện tại.</div>
                </div>
                <Badge intent={feedback?.status ? getStatusIntent(feedback.status) : 'neutral'} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {feedback ? getStatusLabel(feedback.status) : 'Đang tải'}
                </Badge>
              </div>
            </div>

            <div className="rounded-[1rem] border border-slate-200/80 bg-white p-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Thông tin người nhận</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Người nhận</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{recipientSummary.name}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Mã phản ánh</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{recipientSummary.feedbackCode}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Khu vực</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{recipientSummary.area}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CITIZEN_NOTIFICATION_TEMPLATES.map((template) => {
                const selected = notificationForm.templateId === template.id;
                const isSuggested = template.id === suggestedNotificationTemplateId;
                const semanticClass = template.id === 'received'
                  ? 'status-info'
                  : template.id === 'processing'
                    ? 'status-warning'
                    : template.id === 'completed'
                      ? 'status-success'
                      : template.id === 'rejected'
                        ? 'status-danger'
                        : 'status-neutral';
                const selectedClass = selected
                  ? `${semanticClass} shadow-[0_12px_24px_rgba(15,23,42,0.08)]`
                  : `${semanticClass} bg-white/80 hover:bg-slate-50`;
                return (
                  <Button
                    key={template.id}
                    type="button"
                    variant={selected ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setNotificationForm((current) => ({ ...current, templateId: template.id, title: template.title, message: template.message }));
                      setNotificationErrors((current) => ({ ...current, title: undefined, message: undefined }));
                    }}
                    className={`justify-start rounded-[1rem] px-3 py-2.5 text-left ${selectedClass} ${isSuggested && !selected ? 'ring-1 ring-slate-200' : ''}`}
                  >
                    <span className="flex w-full items-start justify-between gap-2">
                      <span className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-semibold">{template.label}</span>
                        <span className="text-xs font-medium opacity-80">{template.shortLabel}</span>
                      </span>
                      {isSuggested && (
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Gợi ý
                        </span>
                      )}
                    </span>
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-3">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Tiêu đề</span>
                  <input
                    value={notificationForm.title}
                    onChange={(event) => handleNotificationFieldChange('title', event.target.value)}
                    className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    placeholder="Nhập tiêu đề thông báo"
                  />
                  {notificationErrors.title && <span className="text-xs font-medium text-rose-600">{notificationErrors.title}</span>}
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span>Nội dung</span>
                  <textarea
                    value={notificationForm.message}
                    onChange={(event) => handleNotificationFieldChange('message', event.target.value)}
                    rows={5}
                    className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    placeholder="Nhập nội dung thông báo"
                  />
                  {notificationErrors.message && <span className="text-xs font-medium text-rose-600">{notificationErrors.message}</span>}
                </label>

                <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 p-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-slate-700"
                  >
                    <span className="flex items-center gap-2">
                      <Lucide.Settings2 size={14} className="text-slate-500" />
                      Tùy chọn nâng cao
                    </span>
                    {showAdvancedOptions ? <Lucide.ChevronUp size={16} className="text-slate-500" /> : <Lucide.ChevronDown size={16} className="text-slate-500" />}
                  </button>
                  {showAdvancedOptions && (
                    <label className="mt-3 flex flex-col gap-2 text-sm font-semibold text-slate-700">
                      <span>Link đính kèm</span>
                      <input
                        value={notificationForm.targetUrl}
                        onChange={(event) => handleNotificationFieldChange('targetUrl', event.target.value)}
                        className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        placeholder="https://..."
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="admin-inset-panel p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Lucide.BellRing size={15} className="text-rose-600" />
                  Xem trước thông báo
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <Lucide.BellRing size={12} />
                    Thông báo
                  </div>
                  <div className="mt-3 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {notificationForm.templateId === 'processing' ? 'Đang xử lý' : notificationForm.templateId === 'completed' ? 'Đã hoàn thành' : notificationForm.templateId === 'received' ? 'Đã tiếp nhận' : notificationForm.templateId === 'rejected' ? 'Từ chối xử lý' : notificationForm.templateId === 'need-info' ? 'Cần bổ sung thông tin' : 'Tùy chỉnh'}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">{notificationForm.title || 'Tiêu đề thông báo'}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600 whitespace-pre-line">{notificationForm.message || 'Nội dung thông báo sẽ hiển thị ở đây.'}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <span>Ngày giờ gửi</span>
                    <span>{formatDate(new Date().toISOString())}</span>
                  </div>
                  {notificationForm.targetUrl && (
                    <div className="mt-3 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {notificationForm.targetUrl}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
              <div className="text-sm text-slate-500">
                {notificationContentValid ? 'Thông báo đã sẵn sàng để gửi cho người dân.' : 'Vui lòng nhập tiêu đề và nội dung trước khi gửi.'}
              </div>
              <Button
                type="button"
                onClick={openNotificationConfirmation}
                disabled={notificationSubmitting || !notificationContentValid}
                variant="primary"
                size="sm"
              >
                {notificationSubmitting ? <span className="loading loading-spinner loading-xs" /> : <Lucide.Send size={14} />}
                Gửi thông báo
              </Button>
            </div>

            {notificationActivities.length > 0 && (
              <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Lịch sử thông báo</div>
                <div className="mt-3 space-y-3">
                  {notificationActivities.map((activity) => (
                    <div key={activity.id} className="relative pl-5">
                      <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-600" />
                      <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5">
                        <div className="text-sm font-semibold text-slate-900">{activity.title}</div>
                        <div className="mt-0.5 text-sm text-slate-600">{activity.subtitle}</div>
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{formatDate(activity.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          {activeViewTab === 'detail' && attachments.length > 0 && (
            <div className="admin-panel p-6 space-y-4">
              <h3 className="font-bold text-slate-900">Tệp đính kèm ({attachments.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments.map((attachment, idx) => {
                  const fileUrl = getAttachmentUrl(attachment);
                  const isVideo = isVideoFile(fileUrl);
                  const attachmentKey = attachment?.attachmentId || attachment?.id || fileUrl || `attachment-${idx}`;
                  return (
                    <div
                      key={attachmentKey}
                      className="relative bg-slate-100 rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => setPreviewAttachmentIndex(previewItems.findIndex((item) => getAttachmentUrl(item) === fileUrl))}
                    >
                      {isVideo ? (
                        <div className="w-full aspect-video bg-primary/80 flex items-center justify-center group-hover:bg-primary/90">
                          <Lucide.Play className="text-white" size={32} />
                        </div>
                      ) : (
                        <img
                          src={fileUrl}
                          alt={`Attachment ${idx}`}
                          className="w-full aspect-video object-cover group-hover:opacity-75"
                        />
                      )}
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition"></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          {activeViewTab === 'detail' ? (
            <div className="admin-panel p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900">Bình luận</h3>
                <span className="text-xs text-slate-500">{comments.length} bình luận</span>
              </div>
              {comments.length === 0 ? (
                <EmptyState
                  title="Chưa có bình luận nào"
                  description="Phản ánh này hiện chưa có bình luận nào."
                />
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
          ) : null}

          {isMasterTicket ? (
          <div className="admin-panel p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">Phản ánh liên kết</h3>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {linkedFeedbacks.length} mục
              </span>
            </div>

            {linkedFeedbacksLoading ? (
              <div className="admin-empty-panel p-4 text-sm text-slate-500">
                <span className="loading loading-spinner loading-sm mr-2" />
                Đang tải phản ánh liên kết...
              </div>
            ) : linkedFeedbacksError ? (
              <div className="admin-info-note p-4 text-sm text-rose-700">
                {linkedFeedbacksError}
              </div>
            ) : linkedFeedbacks.length === 0 ? (
              <EmptyState
                title="Chưa có phản ánh liên kết"
                description="Không có phản ánh con nào được liên kết với phản ánh này."
              />
            ) : (
              <div className="space-y-3">
                {linkedFeedbacks.map((item, index) => {
                  const childFeedbackId = item?.feedbackId || item?.id;
                  return (
                    <div key={childFeedbackId || index} className="admin-inset-panel p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Mã phản ánh</div>
                          <div className="font-semibold text-slate-900">{childFeedbackId || '—'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Trạng thái</div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
                              <Lucide.GitMerge size={11} aria-hidden="true" />
                              Phản ánh trùng
                            </span>
                            <span className="text-sm font-semibold text-slate-900">{getStatusLabel(item?.status)}</span>
                          </div>
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
          ) : null}

          {isConfirmedDuplicate ? (
          <div className="admin-panel p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">Cụm phản ánh trùng</h3>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {relatedFeedbacks.length} mục
              </span>
            </div>

            {relatedFeedbacksLoading ? (
              <div className="admin-empty-panel p-4 text-sm text-slate-500">
                <span className="loading loading-spinner loading-sm mr-2" />
                Đang tải phản ánh liên quan...
              </div>
            ) : relatedFeedbacksError ? (
              <div className="admin-info-note p-4 text-sm text-rose-700">
                {relatedFeedbacksError}
              </div>
            ) : relatedFeedbacks.length === 0 ? (
              <EmptyState
                title="Chưa có phản ánh liên quan"
                description="Không có phản ánh liên quan nào được tìm thấy cho phản ánh này."
              />
            ) : (
              <div className="space-y-3">
                {relatedFeedbacks.map((item, index) => {
                  const relatedId = item?.feedbackId || item?.id;
                  return (
                    <div key={relatedId || index} className="admin-inset-panel p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {item?.relationType === 'master' ? 'Phản ánh chính đã có' : 'Phản ánh trùng liên quan'}
                          </div>
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
          ) : null}

          {showAreaAlertModal && (
            <div className="absolute right-4 bottom-16 z-50 w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow pointer-events-auto">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Tạo Cảnh Báo Khu Vực</h2>
                    <p className="mt-1 text-sm text-slate-500">Sửa tiêu đề, nội dung hoặc thời gian trước khi gửi.</p>
                  </div>
                  <button type="button" onClick={() => setShowAreaAlertModal(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                    <Lucide.X size={18} />
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <input value={areaAlertForm.title} onChange={(e) => handleAreaAlertFieldChange('title', e.target.value)} className="input w-full" />
                  <textarea value={areaAlertForm.message} onChange={(e) => handleAreaAlertFieldChange('message', e.target.value)} className="textarea w-full" rows={3} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAreaAlertModal(false)} className="btn btn-ghost">Hủy</button>
                    <button onClick={handleCreateAreaAlert} className="btn btn-primary">Tạo cảnh báo</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Timeline Progress */}
          <div className="admin-panel p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">Tiến độ hồ sơ</h3>
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
          <div className="admin-panel p-6 space-y-4">
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
                <Button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifyLoading}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  {verifyLoading ? <span className="loading loading-spinner loading-xs"></span> : <Lucide.Check size={14} />}
                  Xác minh phản ánh
                </Button>
              )}
              {canAssign && (
                <Button
                  type="button"
                  onClick={() => setAssignModal(true)}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  <Lucide.UserPlus size={14} />
                  Phân công đơn vị xử lý
                </Button>
              )}
              <Button
                type="button"
                onClick={() => navigate(`/staff/feedbacks/${feedbackId}/request-info`)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Lucide.MessageSquarePlus size={14} />
                Yêu cầu thêm thông tin
              </Button>
              <Button
                type="button"
                onClick={() => navigate(`/staff/feedbacks/${feedbackId}/history`)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Lucide.History size={14} />
                Xem lịch sử phân công
              </Button>
              <Button
                type="button"
                onClick={openProviderReportWorkspace}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Lucide.FileText size={14} />
                Mở báo cáo xử lý
              </Button>
              {nextStatusOptions.length > 0 && (
                <div className="admin-inset-panel p-4">
                  <div className="text-xs text-slate-500 font-bold mb-2">Trạng thái tiếp theo</div>
                  <div className="flex flex-wrap gap-2">
                    {nextStatusOptions.map((nextStatus) => (
                      <Badge
                        key={nextStatus}
                        intent={getStatusIntent(nextStatus)}
                        className="px-3 py-1 text-[11px] font-semibold"
                      >
                        {getStatusLabel(nextStatus)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {!
                canVerify &&
                !canAssign &&
                nextStatusOptions.length === 0 && (
                  <div className="admin-inset-panel p-4 text-sm text-slate-600">
                    Không còn bước nào cần thực hiện cho phản ánh này.
                  </div>
                )}
            </div>
          </div>

          <div className="admin-info-note p-6 space-y-4">
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
      ) : null}

      {activeViewTab === 'exchange' ? (
        <section ref={exchangeSectionRef} className="admin-panel scroll-mt-5 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">Trao đổi phản ánh</div>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Hội thoại với người dân</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Phản hồi người dân và ghi chú nội bộ trong cùng một luồng xử lý.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Lucide.MessagesSquare size={16} className="text-blue-600" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-700">{messages.length} tin nhắn</span>
              </div>
            </div>
          </div>

          <div className="grid h-[560px] min-h-0 grid-rows-[minmax(0,1fr)_auto]">
            <div className="min-h-0 px-5 pt-5">
              {messagesLoading ? (
                <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
                  <span className="loading loading-spinner loading-sm mr-2" />
                  Đang tải trao đổi...
                </div>
              ) : messagesError ? (
                <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 text-center text-sm text-rose-700">
                  {messagesError}
                </div>
              ) : groupedMessageBlocks.length === 0 ? (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                    <Lucide.MessagesSquare size={21} aria-hidden="true" />
                  </span>
                  <div className="mt-3 text-base font-semibold text-slate-900">Chưa có trao đổi</div>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                    Bắt đầu bằng một phản hồi cho người dân hoặc tạo ghi chú nội bộ cho đội xử lý.
                  </p>
                </div>
              ) : (
                <div
                  ref={messageViewportRef}
                  className="h-full min-h-[260px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 sm:px-5"
                >
                  <div className="space-y-5">
                    {groupedMessageBlocks.map((block) => {
                      const blockKey = `${block.senderKey}-${block.messages[0]?.interactionMessageId || block.messages[0]?.id}`;
                      const isStaffPublic = block.isStaff && !block.isInternal;

                      return (
                        <div
                          key={blockKey}
                          className={`flex ${
                            block.isInternal
                              ? 'justify-center'
                              : isStaffPublic
                                ? 'justify-end'
                                : 'justify-start'
                          }`}
                        >
                          <div className={block.isInternal ? 'w-full max-w-[92%]' : 'w-full max-w-[72%]'}>
                            <div className={`mb-1.5 flex items-center gap-2 ${isStaffPublic ? 'justify-end' : ''}`}>
                              {!isStaffPublic ? (
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                    block.isInternal
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {block.isInternal ? (
                                    <Lucide.LockKeyhole size={14} aria-hidden="true" />
                                  ) : (
                                    getMessageAvatar(block.author)
                                  )}
                                </div>
                              ) : null}

                              <span className="text-xs font-semibold text-slate-800">{block.author}</span>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  block.isInternal
                                    ? 'bg-amber-100 text-amber-700'
                                    : block.isStaff
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {block.isInternal ? 'Nội bộ' : block.isStaff ? 'Nhân viên' : 'Người dân'}
                              </span>

                              {isStaffPublic ? (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                  {getMessageAvatar(block.author)}
                                </div>
                              ) : null}
                            </div>

                            {block.isInternal ? (
                              <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                <Lucide.LockKeyhole size={14} className="shrink-0" aria-hidden="true" />
                                Chỉ quản lý và nhân viên có thể xem.
                              </div>
                            ) : null}

                            <div className="space-y-2">
                              {block.messages.map((message) => {
                                const body = getMessageBody(message);

                                return (
                                  <div key={message?.interactionMessageId || message?.id}>
                                    <div
                                      className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                                        block.isInternal
                                          ? 'border border-amber-200 bg-amber-50 text-amber-950'
                                          : block.isStaff
                                            ? 'bg-blue-600 text-white'
                                            : 'border border-slate-200 bg-white text-slate-800'
                                      }`}
                                    >
                                      <div className="whitespace-pre-line break-words">{body || '—'}</div>
                                    </div>

                                    <div
                                      className={`mt-1 px-1 text-[11px] text-slate-400 ${
                                        isStaffPublic ? 'text-right' : ''
                                      }`}
                                    >
                                      {formatDate(message?.createdAt)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'public', label: 'Trả lời người dân', icon: Lucide.Send },
                  { id: 'internal', label: 'Ghi chú nội bộ', icon: Lucide.LockKeyhole },
                ].map((mode) => {
                  const selected = composerMode === mode.id;
                  const ModeIcon = mode.icon;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setComposerMode(mode.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                        selected
                          ? mode.id === 'internal'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <ModeIcon size={14} aria-hidden="true" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-end gap-3">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">
                    {composerMode === 'internal' ? 'Nội dung ghi chú' : 'Nội dung phản hồi'}
                  </span>
                  <textarea
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    rows={2}
                    placeholder={
                      composerMode === 'internal'
                        ? 'Nhập ghi chú nội bộ...'
                        : 'Nhập phản hồi cho người dân...'
                    }
                    className="min-h-[72px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <Button
                  type="button"
                  onClick={handleMessageSend}
                  disabled={messageSubmitting || !messageDraft.trim()}
                  variant="primary"
                  size="sm"
                  className="mb-1 shrink-0"
                >
                  {messageSubmitting ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Lucide.Send size={14} />
                  )}
                  {composerMode === 'internal' ? 'Lưu' : 'Gửi'}
                </Button>
              </div>

              <div className="mt-1 text-xs text-slate-400">{messageDraft.length} ký tự</div>
            </div>
          </div>
        </section>
      ) : null}

      {activeViewTab === 'history' ? (
        <div className="space-y-6">
          <div className="admin-panel p-6 space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Theo dõi hồ sơ</div>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Dòng sự kiện phản ánh</h3>
              <p className="mt-1 text-sm text-slate-500">Xem lại toàn bộ tiến trình xử lý, quyết định và thông báo của phản ánh từ lúc tiếp nhận đến hiện tại.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Tổng số</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{historyEvents.length}</div>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Theo dõi từ đầu đến cuối</div>
              </div>

              <ol className="mt-6 space-y-6">
                {historyEvents.map((event, index) => {
                  const isLast = index === historyEvents.length - 1;
                  return (
                    <li key={event.id || `${event.title}-${index}`} className="relative flex gap-4">
                      <div className="flex flex-col items-center text-center">
                        <div className={`${event.accentTone.dot} h-3.5 w-3.5 rounded-full`} aria-hidden="true" />
                        {!isLast && <div className="mt-2 h-full w-px bg-slate-200" aria-hidden="true" />}
                      </div>
                      <div className="flex-1 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">{event.title}</div>
                            {event.subtitle ? <div className="mt-1 text-sm text-slate-500">{event.subtitle}</div> : null}
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${event.accentTone.pill}`}>
                            {formatHistoryLabel(event)}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Người thực hiện</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{event.actor || 'Hệ thống'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Thời gian</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(event.timestamp)}</div>
                          </div>
                        </div>

                        {event.note ? (
                          <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-line">
                            {event.note === 'Phản ánh được tạo' ? 'Phản ánh được tạo' : event.note}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      ) : null}

      {/* Attachment Preview - same full-screen viewer pattern as Service User */}
      {previewAttachment && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[99999] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-detail-media-preview-title"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 via-black/35 to-transparent px-4 pb-16 pt-4 sm:px-6 sm:pt-5">
              <div className="min-w-0">
                <h2
                  id="staff-detail-media-preview-title"
                  className="max-w-[72vw] truncate text-sm font-semibold text-white sm:text-base"
                >
                  {previewAttachment?.fileName || previewAttachment?.name || `Tệp đính kèm ${previewAttachmentIndex + 1}`}
                </h2>
                <p className="mt-1 text-xs text-white/65">
                  {previewAttachmentIndex + 1} / {previewItems.length}
                  {previewItems.length > 1 ? (
                    <span className="hidden sm:inline"> · Dùng phím ← → để chuyển tệp</span>
                  ) : null}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPreviewAttachmentIndex(null)}
              className="absolute right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:top-5"
              aria-label="Đóng xem trước"
            >
              <Lucide.X size={21} aria-hidden="true" />
            </button>

            <div
              className="flex h-full w-full items-center justify-center overflow-hidden px-3 py-3 sm:px-16 sm:py-5"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setPreviewAttachmentIndex(null);
                }
              }}
            >
              {isVideoFile(previewAttachmentUrl) ? (
                <video
                  key={previewAttachmentUrl}
                  src={previewAttachmentUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="block max-h-[calc(100dvh-24px)] max-w-[calc(100vw-24px)] object-contain sm:max-h-[calc(100dvh-40px)] sm:max-w-[calc(100vw-128px)]"
                >
                  Trình duyệt của bạn không hỗ trợ phát video.
                </video>
              ) : (
                <img
                  key={previewAttachmentUrl}
                  src={previewAttachmentUrl}
                  alt={previewAttachment?.fileName || previewAttachment?.name || `Tệp đính kèm ${previewAttachmentIndex + 1}`}
                  className="block max-h-[calc(100dvh-24px)] max-w-[calc(100vw-24px)] select-none object-contain sm:max-h-[calc(100dvh-40px)] sm:max-w-[calc(100vw-128px)]"
                  draggable="false"
                />
              )}
            </div>

            {previewItems.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => movePreview(-1)}
                  className="absolute left-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-xl backdrop-blur transition hover:scale-105 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:left-6 sm:h-14 sm:w-14"
                  aria-label="Xem tệp trước"
                >
                  <Lucide.ChevronLeft size={28} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => movePreview(1)}
                  className="absolute right-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-xl backdrop-blur transition hover:scale-105 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:h-14 sm:w-14"
                  aria-label="Xem tệp tiếp theo"
                >
                  <Lucide.ChevronRight size={28} aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>,
          document.body
        )
        : null}

      <DelightToast open={areaAlertToast.open} message={areaAlertToast.message} sub={areaAlertToast.sub} onClose={() => setAreaAlertToast({ open: false, message: '', sub: '' })} />
      <DelightToast open={notificationToast.open} message={notificationToast.message} sub={notificationToast.sub} onClose={() => setNotificationToast({ open: false, message: '', sub: '' })} />

      <ConfirmationModal
        open={notificationConfirmOpen}
        title="Xác nhận gửi thông báo"
        message="Người dân sẽ nhận được thông báo này ngay sau khi gửi."
        confirmLabel="Gửi thông báo"
        cancelLabel="Hủy"
        onConfirm={handleSendCitizenNotification}
        onCancel={() => {
          setNotificationConfirmOpen(false);
          setPendingNotificationPayload(null);
        }}
      />
    </div>
  );
};
