// src/pages/tickets/TicketDetailPage.jsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toolsApi } from '@urbanmind/shared-api';
import { managementTypes } from '@urbanmind/shared-types';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import useTicketDetail from '../../hooks/useTicketDetail';
import { LocationPicker } from '../../components/maps/LocationPicker';

const CATEGORY_LABELS = {
  Drainage: 'Thoát nước',
  'Garbage Collection': 'Thu gom rác',
  'Public Safety': 'An toàn công cộng',
  'Road Maintenance': 'Bảo trì đường bộ',
  'Street Lighting': 'Chiếu sáng đô thị',
  'Water Supply': 'Cấp nước',
};

const PRIORITY_LABELS = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
  Urgent: 'Khẩn cấp',
};

const MAX_EDIT_ATTACHMENT_COUNT = 5;
const MAX_EDIT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_EDIT_VIDEO_SIZE_BYTES = 10 * 1024 * 1024;

const formatFileSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 10 || Number.isInteger(value) ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
};

const getAreaId = (area) => area?.areaId ?? area?.id;
const getAreaName = (area) => (
  area?.areaName ?? area?.name ?? area?.displayName ?? 'Chưa xác định khu vực'
);

const getCitizenStatusLabel = (status) => {
  switch (status) {
    case managementTypes.feedbackStatus.SUBMITTED:
      return 'Đã gửi';
    case managementTypes.feedbackStatus.AI_REVIEWED:
      return 'Đã tiếp nhận';
    case managementTypes.feedbackStatus.VERIFIED:
      return 'Đã xác minh';
    case managementTypes.feedbackStatus.ASSIGNED:
      return 'Đã phân công';
    case managementTypes.feedbackStatus.IN_PROGRESS:
      return 'Đang xử lý';
    case managementTypes.feedbackStatus.RESOLVED:
    case managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL:
      return 'Đang kiểm tra kết quả';
    case managementTypes.feedbackStatus.NEED_REWORK:
      return 'Cần xử lý bổ sung';
    case managementTypes.feedbackStatus.APPROVED:
      return 'Chờ bạn đánh giá';
    case managementTypes.feedbackStatus.CLOSED:
      return 'Đã đóng';
    case managementTypes.feedbackStatus.REJECTED:
      return 'Không tiếp nhận';
    case managementTypes.feedbackStatus.CANCELLED:
      return 'Đã hủy';
    default:
      return 'Đang cập nhật';
  }
};

const getStatusTone = (status) => {
  if (
    [
      managementTypes.feedbackStatus.APPROVED,
      managementTypes.feedbackStatus.CLOSED,
    ].includes(status)
  ) {
    return 'border-success/25 bg-success/10 text-success';
  }

  if (
    [
      managementTypes.feedbackStatus.REJECTED,
      managementTypes.feedbackStatus.CANCELLED,
    ].includes(status)
  ) {
    return 'border-error/25 bg-error/10 text-error';
  }

  if (
    [
      managementTypes.feedbackStatus.IN_PROGRESS,
      managementTypes.feedbackStatus.NEED_REWORK,
      managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
      managementTypes.feedbackStatus.RESOLVED,
    ].includes(status)
  ) {
    return 'border-warning/30 bg-warning/10 text-warning';
  }

  return 'border-info/25 bg-info/10 text-info';
};

const getPriorityTone = (priority) => {
  switch (priority) {
    case 'Urgent':
      return 'border-error/25 bg-error/10 text-error';
    case 'High':
      return 'border-warning/30 bg-warning/10 text-warning';
    case 'Low':
      return 'border-base-300 bg-base-200/65 text-base-content/60';
    default:
      return 'border-info/20 bg-info/8 text-info';
  }
};

const getCommentAuthor = (comment) => (
  comment?.userName ||
  comment?.authorName ||
  comment?.createdByName ||
  comment?.fullName ||
  'Người dùng'
);

const getCommentContent = (comment) => (
  comment?.content ||
  comment?.message ||
  comment?.text ||
  comment?.comment ||
  ''
);

const getCommentTimestamp = (comment) => {
  const timestamp = new Date(
    comment?.createdAt ||
    comment?.createdDate ||
    comment?.timestamp ||
    0
  ).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const normalizeCommentText = (value) => (
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi-VN')
);

const dedupeComments = (commentItems = []) => {
  const uniqueComments = [];
  const seenIds = new Set();
  const recentFingerprints = new Map();

  commentItems.forEach((comment, index) => {
    const rawId = comment?.commentId || comment?.id;
    const commentId = rawId ? String(rawId) : '';
    const author = normalizeCommentText(getCommentAuthor(comment));
    const content = normalizeCommentText(getCommentContent(comment));
    const timestamp = getCommentTimestamp(comment);
    const fingerprint = `${author}::${content}`;

    if (commentId && seenIds.has(commentId)) return;

    const previousTimestamp = recentFingerprints.get(fingerprint);
    const likelyOptimisticDuplicate = (
      fingerprint !== '::' &&
      previousTimestamp !== undefined &&
      (
        timestamp === 0 ||
        previousTimestamp === 0 ||
        Math.abs(timestamp - previousTimestamp) <= 10000
      )
    );

    if (likelyOptimisticDuplicate) return;

    if (commentId) seenIds.add(commentId);
    recentFingerprints.set(fingerprint, timestamp);
    uniqueComments.push({
      ...comment,
      __ticketCommentRenderKey: (
        commentId ||
        `${fingerprint}-${timestamp || index}`
      ),
    });
  });

  return uniqueComments;
};

const translateHistoryText = (value) => {
  const original = String(value || '').trim();
  if (!original) return 'Không có ghi chú.';

  const normalized = original.toLowerCase();
  const translations = [
    ['feedback created', 'Phản ánh đã được tạo.'],
    ['feedback submitted', 'Phản ánh đã được gửi.'],
    ['feedback verified', 'Phản ánh đã được xác minh.'],
    ['verified by staff', 'Thông tin phản ánh đã được nhân viên xác minh.'],
    ['verified', 'Thông tin phản ánh đã được xác minh.'],
    ['waiting for manager approval', 'Kết quả đang chờ người quản lý duyệt.'],
    ['submitted for approval', 'Kết quả đã được gửi để kiểm tra và phê duyệt.'],
    ['need rework', 'Kết quả cần được xử lý hoặc bổ sung thêm.'],
    ['assigned to operator', 'Phản ánh đã được chuyển đến đơn vị phụ trách.'],
    ['assigned', 'Phản ánh đã được phân công cho đơn vị xử lý.'],
    ['processing started', 'Đơn vị phụ trách đã bắt đầu xử lý.'],
    ['in progress', 'Đơn vị phụ trách đang xử lý phản ánh.'],
    ['approved', 'Kết quả xử lý đã được phê duyệt.'],
    ['rejected', 'Phản ánh hoặc kết quả xử lý chưa được chấp thuận.'],
    ['closed', 'Phản ánh đã được đóng.'],
  ];

  const matched = translations.find(([keyword]) => normalized.includes(keyword));
  return matched ? matched[1] : original;
};

export const TicketDetailPage = () => {
  const { id: feedbackId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const {
    ticket: fetchedTicket,
    comments,
    history,
    chatInput,
    setChatInput,
    loading,
    error,
    handleSendChat,
    handleRateSubmit,
    rating,
    setRating,
    satisfied,
    setSatisfied,
    reviewComment,
    setReviewComment,
    ratingLoading,
    getAttachmentUrl,
  } = useTicketDetail(feedbackId, user);

  const [ticket, setTicket] = useState(null);
  const [updateNotice, setUpdateNotice] = useState('');
  const [previewAttachmentIndex, setPreviewAttachmentIndex] = useState(null);
  const [previewSource, setPreviewSource] = useState('detail');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [editAttachments, setEditAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const selectedFilesRef = useRef([]);
  const [attachmentDeleteTarget, setAttachmentDeleteTarget] = useState(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [visibleCommentCount, setVisibleCommentCount] = useState(3);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationPickerError, setLocationPickerError] = useState('');
  const [locationDraft, setLocationDraft] = useState({
    areaId: '',
    locationText: '',
    latitude: null,
    longitude: null,
  });
  const editInitialSnapshotRef = useRef('');
  const [editForm, setEditForm] = useState({
    areaId: '',
    categoryId: '',
    title: '',
    description: '',
    locationText: '',
    latitude: null,
    longitude: null,
    priority: '',
  });

  useEffect(() => {
    setVisibleCommentCount(3);
  }, [feedbackId]);

  const attachments = Array.isArray(ticket?.attachments)
    ? ticket.attachments
    : [];

  const editPreviewItems = [
    ...editAttachments,
    ...selectedFiles,
  ];
  const previewItems = previewSource === 'edit'
    ? editPreviewItems
    : attachments;
  const previewAttachment = previewAttachmentIndex === null
    ? null
    : previewItems[previewAttachmentIndex] || null;

  const readReturnContext = () => {
    let storedContext;

    try {
      storedContext = JSON.parse(
        sessionStorage.getItem('urbanmind-ticket-list-return') || 'null'
      );
    } catch {
      storedContext = null;
    }

    const matchingStoredContext = (
      storedContext?.ticketId &&
      String(storedContext.ticketId) === String(feedbackId)
    )
      ? storedContext
      : null;

    return {
      from: location.state?.from || matchingStoredContext?.from || '/tickets',
      scrollY: Number(matchingStoredContext?.scrollY || 0),
      ticketId: location.state?.ticketId || matchingStoredContext?.ticketId || feedbackId,
    };
  };

  const handleBackToList = ({ replace = false, highlight = true } = {}) => {
    const returnContext = readReturnContext();

    navigate(returnContext.from, {
      replace,
      state: {
        restoreScrollY: returnContext.scrollY,
        restoreTicketId: highlight ? returnContext.ticketId : null,
      },
    });
  };

  const serializeEditState = (form = editForm, files = selectedFiles) => JSON.stringify({
    areaId: String(form.areaId || ''),
    categoryId: String(form.categoryId || ''),
    title: form.title || '',
    description: form.description || '',
    locationText: form.locationText || '',
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,
    priority: form.priority || '',
    selectedFiles: files.map((item) => {
      const file = item.file || item;
      return `${file.name}-${file.size}-${file.lastModified}`;
    }),
    attachmentIds: editAttachments.map((file) => resolveAttachmentId(file)),
  });

  const requestCloseEdit = () => {
    const currentSnapshot = serializeEditState();

    if (
      editInitialSnapshotRef.current &&
      currentSnapshot !== editInitialSnapshotRef.current
    ) {
      const shouldClose = window.confirm(
        'Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng trình chỉnh sửa?'
      );

      if (!shouldClose) return;
    }

    clearSelectedFiles();
    setLocationPickerError('');
    setLocationPickerOpen(false);
    setActionError('');
    setEditOpen(false);
  };

  useEffect(() => {
    setTicket(fetchedTicket || null);
  }, [fetchedTicket]);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    if (!updateNotice) return undefined;

    const timer = window.setTimeout(() => {
      setUpdateNotice('');
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [updateNotice]);

  useEffect(() => () => {
    selectedFilesRef.current.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

  useEffect(() => {
    if (!previewAttachment) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handlePreviewKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewAttachmentIndex(null);
        return;
      }

      if (
        previewItems.length > 1 &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        setPreviewAttachmentIndex((currentIndex) => {
          const safeIndex = Number.isInteger(currentIndex) ? currentIndex : 0;
          return (safeIndex + direction + previewItems.length) % previewItems.length;
        });
      }
    };

    document.addEventListener('keydown', handlePreviewKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handlePreviewKeyDown);
    };
  }, [previewAttachment, previewItems.length]);

  useEffect(() => {
    const actionOverlayOpen = Boolean(
      editOpen || deleteOpen || attachmentDeleteTarget || locationPickerOpen
    );

    if (!actionOverlayOpen || previewAttachment) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleOverlayKeyDown = (event) => {
      if (event.key !== 'Escape' || actionLoading) return;

      if (locationPickerOpen) {
        setLocationPickerError('');
        setLocationPickerOpen(false);
      } else if (attachmentDeleteTarget) {
        setAttachmentDeleteTarget(null);
      } else if (deleteOpen) {
        setDeleteOpen(false);
      } else if (editOpen) {
        setSelectedFiles((items) => {
          items.forEach((item) => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          });
          return [];
        });
        setActionError('');
        setEditOpen(false);
      }
    };

    document.addEventListener('keydown', handleOverlayKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleOverlayKeyDown);
    };
  }, [
    actionLoading,
    attachmentDeleteTarget,
    deleteOpen,
    editOpen,
    locationPickerOpen,
    previewAttachment,
  ]);

  const formatDate = (value) => {
    if (!value) return 'Chưa có';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return 'Chưa có';

    return parsedDate.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isVideoFile = (fileUrl = '') => {
    const url = String(fileUrl).toLowerCase();
    return [
      '.mp4',
      '.webm',
      '.ogg',
      '.mov',
      '.m4v',
    ].some((extension) => url.includes(extension));
  };

  const statusDescription = (status) => {
    switch (status) {
      case managementTypes.feedbackStatus.SUBMITTED:
        return 'Phản ánh đã được gửi và đang chờ tiếp nhận.';
      case managementTypes.feedbackStatus.AI_REVIEWED:
        return 'Hệ thống đã tiếp nhận và đang phân loại phản ánh.';
      case managementTypes.feedbackStatus.VERIFIED:
        return 'Thông tin phản ánh đã được xác minh.';
      case managementTypes.feedbackStatus.ASSIGNED:
        return 'Phản ánh đã được chuyển đến đơn vị phụ trách.';
      case managementTypes.feedbackStatus.IN_PROGRESS:
        return 'Đơn vị phụ trách đang tiến hành xử lý.';
      case managementTypes.feedbackStatus.RESOLVED:
      case managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL:
        return 'Kết quả xử lý đang được kiểm tra và phê duyệt.';
      case managementTypes.feedbackStatus.APPROVED:
        return 'Kết quả đã được phê duyệt. Bạn có thể xem và đánh giá.';
      case managementTypes.feedbackStatus.NEED_REWORK:
        return 'Đơn vị phụ trách cần xử lý hoặc bổ sung kết quả.';
      case managementTypes.feedbackStatus.CLOSED:
        return 'Phản ánh đã hoàn tất và được đóng.';
      case managementTypes.feedbackStatus.REJECTED:
        return 'Phản ánh chưa đủ điều kiện để tiếp nhận xử lý.';
      case managementTypes.feedbackStatus.CANCELLED:
        return 'Phản ánh đã được hủy.';
      default:
        return 'Tiến trình xử lý đang được cập nhật.';
    }
  };

  const getRatingText = (value) => {
    switch (value) {
      case 1:
        return 'Rất không hài lòng';
      case 2:
        return 'Không hài lòng';
      case 3:
        return 'Bình thường';
      case 4:
        return 'Hài lòng';
      case 5:
        return 'Rất hài lòng';
      default:
        return 'Chưa chọn mức đánh giá';
    }
  };

  const getCategoryLabel = (categoryName) => (
    CATEGORY_LABELS[categoryName] || categoryName || 'Chưa phân loại'
  );

  const normalizedRole = String(user?.role || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  const isServiceUser = normalizedRole.includes('serviceuser') ||
    normalizedRole.includes('citizen');

  const canEditTicket = isServiceUser && [
    managementTypes.feedbackStatus.SUBMITTED,
    managementTypes.feedbackStatus.AI_REVIEWED,
  ].includes(ticket?.status);

  const canDeleteTicket = isServiceUser &&
    ticket?.status === managementTypes.feedbackStatus.SUBMITTED;

  const canReviewResolution = [
    managementTypes.feedbackStatus.APPROVED,
    managementTypes.feedbackStatus.RESOLVED,
  ].includes(ticket?.status);

  const resolveAttachmentId = (file) => {
    if (!file || typeof file === 'string') return null;
    return file.attachmentId ||
      file.id ||
      file.fileId ||
      file.feedbackAttachmentId ||
      null;
  };

  const resolveAttachmentName = (file, index) => {
    if (!file) return `Tệp ${index + 1}`;
    if (typeof file === 'string') {
      return file.split('/').pop() || `Tệp ${index + 1}`;
    }

    return file.fileName ||
      file.name ||
      file.originalFileName ||
      file.file?.name ||
      `Tệp ${index + 1}`;
  };

  const resolvePreviewUrl = (file) => (
    file?.previewUrl || getAttachmentUrl(file)
  );

  const isVideoAttachment = (file) => {
    const mimeType = file?.type || file?.file?.type || '';
    return mimeType.startsWith('video/') || isVideoFile(resolvePreviewUrl(file));
  };

  const releaseSelectedFileItems = (items) => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  };

  const clearSelectedFiles = () => {
    setSelectedFiles((items) => {
      releaseSelectedFileItems(items);
      return [];
    });
  };

  const removeSelectedFile = (itemId) => {
    setSelectedFiles((items) => {
      const target = items.find((item) => item.id === itemId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return items.filter((item) => item.id !== itemId);
    });
  };

  const handleSelectEditFiles = (event) => {
    const input = event.target;
    const files = Array.from(input.files || []);
    input.value = '';

    if (files.length === 0) return;

    setActionError('');

    const availableSlots = Math.max(
      0,
      MAX_EDIT_ATTACHMENT_COUNT - editAttachments.length - selectedFiles.length
    );

    if (availableSlots === 0) {
      setActionError(`Chỉ được giữ tối đa ${MAX_EDIT_ATTACHMENT_COUNT} tệp minh chứng.`);
      return;
    }

    const acceptedFiles = [];
    const rejectedMessages = [];

    files.slice(0, availableSlots).forEach((file) => {
      const imageFile = file.type.startsWith('image/');
      const videoFile = file.type.startsWith('video/');

      if (!imageFile && !videoFile) {
        rejectedMessages.push(`${file.name}: chỉ hỗ trợ hình ảnh hoặc video.`);
        return;
      }

      const sizeLimit = videoFile
        ? MAX_EDIT_VIDEO_SIZE_BYTES
        : MAX_EDIT_IMAGE_SIZE_BYTES;

      if (file.size > sizeLimit) {
        rejectedMessages.push(
          `${file.name}: vượt quá giới hạn ${formatFileSize(sizeLimit)}.`
        );
        return;
      }

      acceptedFiles.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID?.() || Date.now()}`,
        file,
        name: file.name,
        type: file.type,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (files.length > availableSlots) {
      rejectedMessages.push(
        `Chỉ còn có thể thêm ${availableSlots} tệp minh chứng.`
      );
    }

    if (acceptedFiles.length > 0) {
      setSelectedFiles((items) => [...items, ...acceptedFiles]);
    }

    if (rejectedMessages.length > 0) {
      setActionError(rejectedMessages[0]);
    }
  };

  const openLocationEditor = () => {
    setLocationPickerError('');
    setLocationDraft({
      areaId: editForm.areaId || ticket?.areaId || '',
      locationText: editForm.locationText || ticket?.locationText || '',
      latitude: editForm.latitude ?? ticket?.latitude ?? null,
      longitude: editForm.longitude ?? ticket?.longitude ?? null,
    });
    setLocationPickerOpen(true);
  };

  const handleLocationDraftSelect = (latitude, longitude, address) => {
    setLocationDraft((draft) => ({
      ...draft,
      latitude,
      longitude,
      locationText: address || `Vị trí đã chọn: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    }));
    setLocationPickerError('');
  };

  const confirmLocationChange = () => {
    if (!locationDraft.areaId) {
      setLocationPickerError('Vui lòng chọn khu vực xảy ra vấn đề.');
      return;
    }

    if (locationDraft.latitude == null || locationDraft.longitude == null) {
      setLocationPickerError('Vui lòng chọn một điểm cụ thể trên bản đồ.');
      return;
    }

    setEditForm((form) => ({
      ...form,
      areaId: locationDraft.areaId,
      locationText: locationDraft.locationText,
      latitude: locationDraft.latitude,
      longitude: locationDraft.longitude,
    }));
    setLocationPickerOpen(false);
    setLocationPickerError('');
  };

  const openEditDialog = async () => {
    setActionError('');
    clearSelectedFiles();
    setEditForm({
      areaId: ticket?.areaId || '',
      categoryId: ticket?.categoryId || '',
      title: ticket?.title || '',
      description: ticket?.description || '',
      locationText: ticket?.locationText || '',
      latitude: ticket?.latitude ?? null,
      longitude: ticket?.longitude ?? null,
      priority: ticket?.priority || '',
    });
    setEditAttachments(attachments);
    setLocationPickerOpen(false);
    setEditOpen(true);

    window.requestAnimationFrame(() => {
      editInitialSnapshotRef.current = JSON.stringify({
        areaId: String(ticket?.areaId || ''),
        categoryId: String(ticket?.categoryId || ''),
        title: ticket?.title || '',
        description: ticket?.description || '',
        locationText: ticket?.locationText || '',
        latitude: ticket?.latitude ?? null,
        longitude: ticket?.longitude ?? null,
        priority: ticket?.priority || '',
        selectedFiles: [],
        attachmentIds: attachments.map((file) => resolveAttachmentId(file)),
      });
    });

    const requests = [];
    if (categories.length === 0) requests.push(['categories', toolsApi.getCategories()]);
    if (areas.length === 0) requests.push(['areas', toolsApi.getAreas()]);

    if (requests.length > 0) {
      const results = await Promise.allSettled(requests.map(([, request]) => request));
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const [type] = requests[index];
        const values = Array.isArray(result.value) ? result.value : [];
        if (type === 'categories') setCategories(values);
        if (type === 'areas') setAreas(values);
      });
    }
  };

  const handleUpdateTicket = async (event) => {
    event.preventDefault();

    if (!editForm.title.trim() || !editForm.description.trim()) {
      setActionError('Vui lòng nhập đầy đủ tiêu đề và mô tả phản ánh.');
      return;
    }

    if (editAttachments.length + selectedFiles.length === 0) {
      setActionError('Phản ánh phải có ít nhất một tệp minh chứng.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setUpdateNotice('');

    try {
      const addedFileCount = selectedFiles.length;
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        locationText: editForm.locationText.trim(),
      };

      if (editForm.areaId !== '') payload.areaId = Number(editForm.areaId);
      if (editForm.categoryId !== '') payload.categoryId = Number(editForm.categoryId);
      if (editForm.priority) payload.priority = editForm.priority;
      if (editForm.latitude !== null && editForm.latitude !== '') {
        payload.latitude = Number(editForm.latitude);
      }
      if (editForm.longitude !== null && editForm.longitude !== '') {
        payload.longitude = Number(editForm.longitude);
      }

      await ticketApi.updateTicket(feedbackId, payload, { role: 'service-user' });

      if (addedFileCount > 0) {
        await ticketApi.addAttachments(
          feedbackId,
          selectedFiles.map((item) => item.file),
          { role: 'service-user' }
        );
      }

      let refreshedTicket = null;

      try {
        const refreshedResponse = await ticketApi.getTicketById(feedbackId, {
          role: 'service-user',
        });

        refreshedTicket = (
          refreshedResponse?.data ||
          refreshedResponse?.ticket ||
          refreshedResponse
        );
      } catch (refreshError) {
        console.warn(
          'Cập nhật thành công nhưng chưa thể tải lại chi tiết phản ánh',
          refreshError
        );
      }

      if (refreshedTicket && typeof refreshedTicket === 'object') {
        setTicket(refreshedTicket);
        setEditAttachments(
          Array.isArray(refreshedTicket.attachments)
            ? refreshedTicket.attachments
            : []
        );
      } else {
        setTicket((currentTicket) => (
          currentTicket
            ? { ...currentTicket, ...payload }
            : currentTicket
        ));
      }

      clearSelectedFiles();
      setEditOpen(false);
      setUpdateNotice(
        addedFileCount > 0
          ? `Đã cập nhật phản ánh và thêm ${addedFileCount} tệp minh chứng.`
          : 'Đã cập nhật phản ánh.'
      );
    } catch (updateError) {
      console.error('Không thể cập nhật phản ánh', updateError);
      setActionError(
        updateError?.response?.data?.message ||
        updateError?.message ||
        'Không thể cập nhật phản ánh.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTicket = async () => {
    setActionLoading(true);
    setActionError('');

    try {
      await ticketApi.deleteTicket(feedbackId, { role: 'service-user' });
      handleBackToList({ replace: true, highlight: false });
    } catch (deleteError) {
      console.error('Không thể xóa phản ánh', deleteError);
      setActionError(
        deleteError?.response?.data?.message ||
        deleteError?.message ||
        'Không thể xóa phản ánh.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAttachment = async () => {
    if (!attachmentDeleteTarget) return;

    if (editAttachments.length <= 1) {
      setActionError('Phản ánh phải giữ lại ít nhất một tệp minh chứng.');
      setAttachmentDeleteTarget(null);
      return;
    }

    const attachmentId = resolveAttachmentId(attachmentDeleteTarget);
    if (!attachmentId) {
      setActionError('Không xác định được tệp đính kèm cần xóa.');
      setAttachmentDeleteTarget(null);
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      await ticketApi.deleteAttachment(feedbackId, attachmentId, {
        role: 'service-user',
      });
      const nextAttachments = editAttachments.filter(
        (item) => resolveAttachmentId(item) !== attachmentId
      );
      setEditAttachments(nextAttachments);

      try {
        const baseline = JSON.parse(editInitialSnapshotRef.current || '{}');
        editInitialSnapshotRef.current = JSON.stringify({
          ...baseline,
          attachmentIds: nextAttachments.map((item) => resolveAttachmentId(item)),
        });
      } catch {
        // Keep the current snapshot if it cannot be parsed.
      }

      setAttachmentDeleteTarget(null);
    } catch (deleteAttachmentError) {
      console.error('Không thể xóa tệp đính kèm', deleteAttachmentError);
      setActionError(
        deleteAttachmentError?.response?.data?.message ||
        deleteAttachmentError?.message ||
        'Không thể xóa tệp đính kèm.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const sortedHistory = useMemo(
    () => (Array.isArray(history)
      ? [...history].sort(
        (first, second) => new Date(first.changedAt) - new Date(second.changedAt)
      )
      : []),
    [history]
  );

  const visibleHistory = historyExpanded
    ? sortedHistory
    : sortedHistory.slice(-3);

  const uniqueComments = dedupeComments(
    Array.isArray(comments) ? comments : []
  );
  const orderedComments = [...uniqueComments].sort(
    (firstComment, secondComment) => (
      getCommentTimestamp(secondComment) -
      getCommentTimestamp(firstComment)
    )
  );
  const visibleComments = orderedComments.slice(
    0,
    visibleCommentCount
  );
  const hiddenCommentCount = Math.max(
    0,
    orderedComments.length - visibleComments.length
  );
  const latestCommentAt = (
    orderedComments[0]?.createdAt ||
    orderedComments[0]?.createdDate ||
    ticket?.updatedAt ||
    ticket?.createdAt
  );

  const approvalStatusText = (() => {
    if (
      [
        managementTypes.feedbackStatus.APPROVED,
        managementTypes.feedbackStatus.CLOSED,
      ].includes(ticket?.status)
    ) {
      return 'Đã phê duyệt';
    }

    if (
      [
        managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
        managementTypes.feedbackStatus.RESOLVED,
      ].includes(ticket?.status)
    ) {
      return 'Đang chờ phê duyệt';
    }

    if (ticket?.status === managementTypes.feedbackStatus.NEED_REWORK) {
      return 'Cần xử lý bổ sung';
    }

    if (ticket?.status === managementTypes.feedbackStatus.REJECTED) {
      return 'Không được phê duyệt';
    }

    return 'Chưa có kết quả';
  })();

  const citizenJourneySteps = [
    {
      title: 'Đã tiếp nhận',
      description: 'Hồ sơ đã được ghi nhận',
      statuses: [
        managementTypes.feedbackStatus.SUBMITTED,
        managementTypes.feedbackStatus.AI_REVIEWED,
        managementTypes.feedbackStatus.VERIFIED,
      ],
      icon: Lucide.Inbox,
    },
    {
      title: 'Đang xử lý',
      description: 'Đơn vị phụ trách thực hiện',
      statuses: [
        managementTypes.feedbackStatus.ASSIGNED,
        managementTypes.feedbackStatus.IN_PROGRESS,
        managementTypes.feedbackStatus.NEED_REWORK,
      ],
      icon: Lucide.Wrench,
    },
    {
      title: 'Kiểm tra kết quả',
      description: 'Kết quả đang được rà soát',
      statuses: [
        managementTypes.feedbackStatus.RESOLVED,
        managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
      ],
      icon: Lucide.ClipboardCheck,
    },
    {
      title: 'Hoàn tất',
      description: 'Chờ đánh giá hoặc đã đóng',
      statuses: [
        managementTypes.feedbackStatus.APPROVED,
        managementTypes.feedbackStatus.CLOSED,
      ],
      icon: Lucide.CircleCheckBig,
    },
  ];

  const citizenJourneyIndex = Math.max(
    0,
    citizenJourneySteps.findIndex((step) => step.statuses.includes(ticket?.status))
  );

  const openPreview = (source, index) => {
    setPreviewSource(source);
    setPreviewAttachmentIndex(index);
  };

  const movePreview = (direction) => {
    if (previewItems.length <= 1) return;

    setPreviewAttachmentIndex((currentIndex) => {
      const safeIndex = Number.isInteger(currentIndex) ? currentIndex : 0;
      return (safeIndex + direction + previewItems.length) % previewItems.length;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[340px] items-center justify-center rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-[28px] border border-base-300 bg-base-100 px-6 py-16 text-center shadow-sm">
        <Lucide.FileWarning
          size={34}
          className="mx-auto text-base-content/35"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-lg font-bold text-base-content">
          Không thể tải chi tiết phản ánh
        </h1>
        <p className="mt-2 text-sm text-base-content/55">
          {error || 'Vui lòng thử lại hoặc quay về danh sách phản ánh.'}
        </p>
        <button
          type="button"
          onClick={() => handleBackToList()}
          className="btn admin-primary-action mt-5 rounded-2xl"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const createdAt = ticket.createdAt || ticket.submittedAt;
  const updatedAt = ticket.updatedAt || ticket.lastUpdatedAt || createdAt;
  const operatorName = ticket.assignment?.operatorName ||
    ticket.assignment?.staffName ||
    'Chưa phân công';

  return (
    <>
      {updateNotice && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed right-4 top-4 z-[100000] flex max-w-sm items-start gap-3 rounded-2xl border border-success/25 bg-base-100 px-4 py-3 text-base-content shadow-2xl sm:right-6 sm:top-6"
              role="status"
              aria-live="polite"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
                aria-hidden="true"
              >
                <Lucide.CircleCheck size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Cập nhật thành công</p>
                <p className="mt-0.5 text-xs leading-5 text-base-content/55">
                  {updateNotice}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpdateNotice('')}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
                aria-label="Đóng thông báo"
              >
                <Lucide.X size={16} aria-hidden="true" />
              </button>
            </div>,
            document.body
          )
        : null}

      <main className="page-container space-y-4 pb-2 text-base-content">
          <nav
            className="flex items-center text-sm font-medium text-base-content/55 sm:mb-1"
            aria-label="Điều hướng chi tiết phản ánh"
          >
            <button
              type="button"
              onClick={() => handleBackToList()}
              className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-base-200 hover:text-primary"
            >
              <Lucide.ArrowLeft size={15} aria-hidden="true" />
              Quay lại phản ánh của tôi
            </button>
          </nav>

          <section className="overflow-hidden rounded-[28px] border border-base-300 bg-base-100 shadow-[0_16px_40px_rgba(15,23,42,0.10)]">
            <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
                    <Lucide.Tag size={13} aria-hidden="true" />
                    {getCategoryLabel(ticket.categoryName)}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${getPriorityTone(ticket.priority)}`}>
                    <Lucide.Gauge size={13} aria-hidden="true" />
                    Mức độ {PRIORITY_LABELS[ticket.priority] || 'Trung bình'}
                  </span>
                </div>

                <h1 className="mt-3 break-words text-2xl font-bold tracking-tight sm:text-[30px]">
                  {ticket.title}
                </h1>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-base-content/55">
                  <span className="inline-flex items-center gap-1.5">
                    <Lucide.MapPin size={15} aria-hidden="true" />
                    {ticket.areaName || 'Chưa xác định khu vực'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Lucide.CalendarDays size={15} aria-hidden="true" />
                    Gửi {formatDate(createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Lucide.Clock3 size={15} aria-hidden="true" />
                    Cập nhật {formatDate(updatedAt)}
                  </span>
                </div>
              </div>

              <div className="rounded-[22px] border border-info/20 bg-base-100 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)] ring-1 ring-info/5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusTone(ticket.status)}`}>
                    <Lucide.Activity size={13} aria-hidden="true" />
                    {getCitizenStatusLabel(ticket.status)}
                  </span>
                  <span className="text-xs font-medium text-base-content/55">
                    Trạng thái hiện tại
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-base-content/65">
                  {statusDescription(ticket.status)}
                </p>

                {(canEditTicket || canDeleteTicket || canReviewResolution ||
                  ticket.status === managementTypes.feedbackStatus.NEED_REWORK ||
                  ticket.status === managementTypes.feedbackStatus.REJECTED) ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canEditTicket ? (
                      <button
                        type="button"
                        onClick={openEditDialog}
                        className="btn admin-secondary-action btn-sm rounded-xl"
                      >
                        <Lucide.Pencil size={14} aria-hidden="true" />
                        Chỉnh sửa
                      </button>
                    ) : null}

                    {canDeleteTicket ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionError('');
                          setDeleteOpen(true);
                        }}
                        className="btn btn-sm rounded-xl border-error/25 bg-error/8 text-error hover:border-error/40 hover:bg-error/12"
                      >
                        <Lucide.Trash2 size={14} aria-hidden="true" />
                        Xóa phản ánh
                      </button>
                    ) : null}

                    {canReviewResolution && isServiceUser ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/tickets/${feedbackId}/result`)}
                        className="btn admin-primary-action btn-sm rounded-xl"
                      >
                        <Lucide.ClipboardCheck size={14} aria-hidden="true" />
                        Xem kết quả
                      </button>
                    ) : null}

                    {isServiceUser && [
                      managementTypes.feedbackStatus.NEED_REWORK,
                      managementTypes.feedbackStatus.REJECTED,
                    ].includes(ticket.status) ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/tickets/${feedbackId}/rework`)}
                        className="btn btn-warning btn-sm rounded-xl"
                      >
                        <Lucide.RefreshCw size={14} aria-hidden="true" />
                        Bổ sung thông tin
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <dl className="grid border-t border-base-300 bg-base-200/55 sm:grid-cols-3">
              <div className="flex items-center gap-3 px-5 py-3 sm:border-r sm:border-base-300">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                  <Lucide.Building2 size={17} />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-base-content/55">Đơn vị phụ trách</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold">{operatorName}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-base-300 px-5 py-3 sm:border-r sm:border-t-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning" aria-hidden="true">
                  <Lucide.CalendarClock size={17} />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-base-content/55">Hạn xử lý dự kiến</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold">{formatDate(ticket.dueDate)}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-primary/10 px-5 py-3 sm:border-t-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success" aria-hidden="true">
                  <Lucide.BadgeCheck size={17} />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-base-content/55">Kết quả phê duyệt</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold">{approvalStatusText}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="rounded-[28px] border border-base-300 bg-base-100 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:p-5" aria-labelledby="journey-title">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="journey-title" className="text-lg font-bold">Tiến độ xử lý</h2>
                <p className="mt-1 text-sm text-base-content/60">
                  Các mốc chính được rút gọn để bạn dễ theo dõi.
                </p>
              </div>
              <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                Bước {citizenJourneyIndex + 1}/{citizenJourneySteps.length}
              </span>
            </header>

            <div className="mt-4 overflow-x-auto pb-1">
              <ol className="grid min-w-[680px] grid-cols-4">
                {citizenJourneySteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isComplete = index < citizenJourneyIndex;
                  const isActive = index === citizenJourneyIndex;

                  return (
                    <li key={step.title} className="relative px-3 text-center">
                      {index < citizenJourneySteps.length - 1 ? (
                        <span
                          className={`absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-[18px] h-0.5 ${index < citizenJourneyIndex ? 'bg-primary' : 'bg-base-300'}`}
                          aria-hidden="true"
                        />
                      ) : null}

                      <span
                        className={`relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full border transition ${
                          isComplete
                            ? 'border-primary bg-primary text-primary-content'
                            : isActive
                              ? 'border-primary bg-primary/10 text-primary ring-4 ring-primary/10'
                              : 'border-base-300 bg-base-100 text-base-content/30'
                        }`}
                      >
                        {isComplete ? (
                          <Lucide.Check size={17} aria-hidden="true" />
                        ) : (
                          <StepIcon size={17} aria-hidden="true" />
                        )}
                      </span>
                      <p className={`mt-2 text-sm font-semibold ${isActive || isComplete ? 'text-base-content' : 'text-base-content/48'}`}>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-base-content/52">
                        {step.description}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          <section className="rounded-[28px] border border-base-300 bg-base-100 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:p-5" aria-labelledby="ticket-content-title">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="ticket-content-title" className="text-lg font-bold">Nội dung phản ánh</h2>
                <p className="mt-1 text-sm text-base-content/60">
                  Mô tả và minh chứng đã gửi cùng phản ánh.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-200/45 px-3 py-1.5 text-xs font-semibold text-base-content/55">
                <Lucide.Paperclip size={13} aria-hidden="true" />
                {attachments.length} tệp
              </span>
            </header>

            <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-4 sm:px-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-base-content/72">
                {ticket.description || 'Không có nội dung mô tả.'}
              </p>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold">Hình ảnh và video</h3>

              {attachments.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {attachments.map((file, index) => {
                    const fileUrl = getAttachmentUrl(file);
                    const isVideo = isVideoFile(fileUrl);

                    return (
                      <button
                        key={resolveAttachmentId(file) || fileUrl || index}
                        type="button"
                        onClick={() => openPreview('detail', index)}
                        className="group overflow-hidden rounded-2xl border border-base-300 bg-base-200/45 text-left transition hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label={`Xem ${resolveAttachmentName(file, index)}`}
                      >
                        <span className="relative flex h-36 items-center justify-center overflow-hidden bg-base-200/65 sm:h-40">
                          {isVideo ? (
                            <video
                              src={fileUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <img
                              src={fileUrl}
                              alt=""
                              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                            />
                          )}

                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white transition group-hover:bg-black/25 group-focus-visible:bg-black/25">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
                              {isVideo ? (
                                <Lucide.Play size={17} fill="currentColor" aria-hidden="true" />
                              ) : (
                                <Lucide.Expand size={17} aria-hidden="true" />
                              )}
                            </span>
                          </span>
                        </span>
                        <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                          <span className="truncate text-xs font-medium text-base-content/68">
                            {resolveAttachmentName(file, index)}
                          </span>
                          <Lucide.Maximize2 size={13} className="shrink-0 text-base-content/35" aria-hidden="true" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-base-300 bg-base-200/25 px-5 py-8 text-center">
                  <Lucide.ImageOff size={24} className="mx-auto text-base-content/25" aria-hidden="true" />
                  <p className="mt-2 text-sm text-base-content/55">Phản ánh này chưa có tệp minh chứng.</p>
                </div>
              )}
            </div>
          </section>

          <div className={`grid gap-4 ${
            canReviewResolution && isServiceUser
              ? 'xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] xl:items-start'
              : ''
          }`}>
            <section className="rounded-[28px] border border-base-300 bg-base-100 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.08)] sm:p-5" aria-labelledby="history-title">
              <header>
                <h2 id="history-title" className="text-lg font-bold">Lịch sử cập nhật</h2>
                <p className="mt-1 text-sm text-base-content/60">
                  Các thay đổi được ghi nhận theo thứ tự thời gian.
                </p>
              </header>

              {sortedHistory.length > 0 ? (
                <>
                  <ol className="mt-4">
                    {visibleHistory.map((historyItem, index) => (
                      <li
                        key={historyItem?.historyId || index}
                        className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 pb-4 last:pb-0"
                      >
                        {index !== visibleHistory.length - 1 ? (
                          <span className="absolute bottom-0 left-[15px] top-8 w-px bg-base-300" aria-hidden="true" />
                        ) : null}

                        <span className="relative z-10 mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                          <Lucide.Check size={14} aria-hidden="true" />
                        </span>

                        <div className="min-w-0 border-b border-base-300 pb-3 last:border-b-0">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold">
                              {getCitizenStatusLabel(historyItem?.newStatus || historyItem?.status)}
                            </p>
                            <time className="text-xs text-base-content/52">
                              {formatDate(historyItem?.changedAt)}
                            </time>
                          </div>
                          <p className="mt-1.5 text-sm leading-6 text-base-content/58">
                            {translateHistoryText(historyItem?.note || historyItem?.description)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {sortedHistory.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setHistoryExpanded((expanded) => !expanded)}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:underline"
                    >
                      {historyExpanded ? (
                        <>
                          Thu gọn lịch sử
                          <Lucide.ChevronUp size={15} aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          Xem toàn bộ {sortedHistory.length} cập nhật
                          <Lucide.ChevronDown size={15} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  ) : null}
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-base-300 bg-base-200/25 px-5 py-8 text-center text-sm text-base-content/55">
                  Chưa có lịch sử cập nhật.
                </div>
              )}
            </section>

            <aside className="space-y-4">
              {canReviewResolution && isServiceUser ? (
                <section className="rounded-[28px] border border-success/25 bg-base-100 p-5 shadow-sm" aria-labelledby="rating-title">
                  <header className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success" aria-hidden="true">
                      <Lucide.Star size={18} />
                    </span>
                    <div>
                      <h2 id="rating-title" className="text-base font-bold">Đánh giá kết quả</h2>
                      <p className="mt-1 text-sm leading-6 text-base-content/60">
                        Ý kiến của bạn giúp cải thiện chất lượng phục vụ.
                      </p>
                    </div>
                  </header>

                  <form onSubmit={handleRateSubmit} className="mt-4 space-y-4">
                    <fieldset>
                      <legend className="text-sm font-semibold">Mức độ hài lòng</legend>
                      <div className="mt-2 flex justify-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <label key={value} className="cursor-pointer">
                            <input
                              type="radio"
                              name="citizen-rating"
                              value={value}
                              checked={rating === value}
                              onChange={() => setRating(value)}
                              className="peer sr-only"
                            />
                            <Lucide.Star
                              size={28}
                              className={`transition ${rating >= value ? 'fill-warning text-warning' : 'text-base-content/20 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/35'}`}
                              aria-hidden="true"
                            />
                            <span className="sr-only">{value} sao</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-center text-xs font-semibold text-warning">
                        {getRatingText(rating)}
                      </p>
                    </fieldset>

                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-200/35 px-4 py-3">
                      <span className="text-sm font-medium">Tôi hài lòng với kết quả</span>
                      <input
                        type="checkbox"
                        checked={satisfied}
                        onChange={(event) => setSatisfied(event.target.checked)}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold">Ý kiến thêm</span>
                      <textarea
                        rows="3"
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder="Chia sẻ nhận xét về kết quả xử lý..."
                        className="textarea textarea-bordered mt-2 w-full rounded-2xl bg-base-100 text-sm"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={ratingLoading}
                      className="btn admin-primary-action w-full rounded-2xl"
                    >
                      {ratingLoading ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <Lucide.Send size={15} aria-hidden="true" />
                      )}
                      Gửi đánh giá
                    </button>
                  </form>
                </section>
              ) : null}
            </aside>
          </div>

          <section
            className="overflow-hidden rounded-[28px] border border-base-300 bg-base-100 shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
            aria-labelledby="comments-title"
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-base-300 px-5 py-5 sm:px-6">
              <div>
                <h2 id="comments-title" className="text-lg font-bold">
                  Trao đổi cộng đồng
                </h2>
                <p className="mt-1 text-sm text-base-content/55">
                  Chia sẻ thông tin hữu ích và trao đổi văn minh về phản ánh.
                </p>
              </div>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 text-xs font-semibold text-primary">
                <Lucide.MessageCircle size={14} aria-hidden="true" />
                {orderedComments.length} bình luận
              </span>
            </header>

            <div className="grid gap-5 bg-base-200/18 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
              <div className="min-w-0 space-y-4">
                <form
                  onSubmit={handleSendChat}
                  className="rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-content shadow-sm">
                      {(user?.fullName || user?.name || 'Bạn')
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <label htmlFor="public-comment" className="sr-only">
                        Viết bình luận công khai
                      </label>
                      <textarea
                        id="public-comment"
                        rows="2"
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder="Bạn nghĩ gì về phản ánh này?"
                        className="textarea textarea-bordered min-h-[72px] max-h-40 w-full resize-y rounded-xl border-base-300 bg-base-100 px-4 py-3 text-sm leading-6 focus:border-primary/40 focus:outline-none"
                      />

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-1.5 text-xs text-base-content/42">
                          <Lucide.Globe2 size={13} aria-hidden="true" />
                          Nội dung được hiển thị công khai.
                        </p>
                        <button
                          type="submit"
                          disabled={!chatInput?.trim()}
                          className="btn admin-primary-action h-10 min-h-10 rounded-xl px-4"
                        >
                          <Lucide.Send size={14} aria-hidden="true" />
                          Gửi bình luận
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="space-y-3">
                  {visibleComments.length > 0 ? (
                    visibleComments.map((comment, index) => {
                      const author = getCommentAuthor(comment);
                      const content = getCommentContent(comment);

                      return (
                        <article
                          key={
                            comment.__ticketCommentRenderKey ||
                            comment.commentId ||
                            comment.id ||
                            index
                          }
                          className="grid grid-cols-[40px_minmax(0,1fr)] gap-3"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-xs font-bold text-secondary">
                            {author.charAt(0).toUpperCase()}
                          </span>

                          <div className="min-w-0 rounded-2xl rounded-tl-md border border-base-300 bg-base-100 px-4 py-3 shadow-sm transition hover:border-primary/15">
                            <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <p className="truncate text-sm font-semibold">
                                {author}
                              </p>
                              <time
                                dateTime={comment?.createdAt || undefined}
                                className="shrink-0 text-xs text-base-content/42"
                              >
                                {formatDate(comment?.createdAt)}
                              </time>
                            </header>
                            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-base-content/68">
                              {content || 'Bình luận không có nội dung.'}
                            </p>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-6 text-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                        <Lucide.MessageCircle size={20} aria-hidden="true" />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-base-content/65">
                        Chưa có bình luận nào
                      </p>
                      <p className="mt-1 text-xs text-base-content/42">
                        Hãy là người đầu tiên chia sẻ thông tin hữu ích.
                      </p>
                    </div>
                  )}
                </div>

                {hiddenCommentCount > 0 || (
                  visibleCommentCount > 3 &&
                  orderedComments.length > 3
                ) ? (
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {hiddenCommentCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCommentCount(
                          (currentCount) => currentCount + 5
                        )}
                        className="btn btn-outline btn-sm rounded-xl px-4"
                      >
                        <Lucide.MessageSquareMore
                          size={15}
                          aria-hidden="true"
                        />
                        Xem thêm {Math.min(5, hiddenCommentCount)} bình luận
                      </button>
                    ) : null}

                    {visibleCommentCount > 3 &&
                    orderedComments.length > 3 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCommentCount(3)}
                        className="btn btn-ghost btn-sm rounded-xl px-4 text-base-content/55"
                      >
                        <Lucide.ChevronUp size={15} aria-hidden="true" />
                        Thu gọn
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <aside className="space-y-4 xl:sticky xl:top-24">
                <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-base-100 to-secondary/8 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Lucide.ChartNoAxesColumnIncreasing
                        size={19}
                        aria-hidden="true"
                      />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold">
                        Tổng quan trao đổi
                      </h3>
                      <p className="mt-0.5 text-xs text-base-content/45">
                        Thông tin của cuộc thảo luận.
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-base-300/80 bg-base-100/85 px-3 py-3">
                      <dt className="text-[11px] text-base-content/45">
                        Bình luận
                      </dt>
                      <dd className="mt-1 text-xl font-bold">
                        {orderedComments.length}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-base-300/80 bg-base-100/85 px-3 py-3">
                      <dt className="text-[11px] text-base-content/45">
                        Trạng thái
                      </dt>
                      <dd className="mt-1 truncate text-sm font-bold text-primary">
                        {getCitizenStatusLabel(ticket?.status)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-2 rounded-xl border border-base-300/80 bg-base-100/85 px-3 py-3">
                    <p className="text-[11px] text-base-content/45">
                      Hoạt động gần nhất
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-base-content/68">
                      <Lucide.Clock3 size={13} aria-hidden="true" />
                      {formatDate(latestCommentAt)}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Lucide.ShieldCheck size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold">
                        Trao đổi văn minh
                      </h3>
                      <p className="mt-0.5 text-xs text-base-content/45">
                        Giữ cuộc thảo luận hữu ích.
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-3 text-xs leading-5 text-base-content/58">
                    <li className="flex gap-2">
                      <Lucide.Check
                        size={14}
                        className="mt-0.5 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      Chia sẻ thông tin đúng với sự việc.
                    </li>
                    <li className="flex gap-2">
                      <Lucide.Check
                        size={14}
                        className="mt-0.5 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      Tôn trọng người tham gia trao đổi.
                    </li>
                    <li className="flex gap-2">
                      <Lucide.Check
                        size={14}
                        className="mt-0.5 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      Không đăng nội dung spam hoặc không liên quan.
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </section>
      </main>

      {editOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[99980] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-slate-950/70 p-0 backdrop-blur-sm lg:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-ticket-title"
          >
            <section className="flex h-full w-full flex-col overflow-hidden bg-base-100 text-base-content shadow-2xl lg:h-[min(92dvh,860px)] lg:max-w-6xl lg:rounded-[28px] lg:border lg:border-base-300">
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-base-300 px-4 py-3 sm:px-6 sm:py-4">
                <div className="min-w-0">
                  <h2 id="edit-ticket-title" className="text-lg font-bold sm:text-xl">
                    Chỉnh sửa phản ánh
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-base-content/60 sm:text-sm">
                    Cập nhật thông tin và minh chứng trước khi phản ánh được xác minh.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestCloseEdit}
                  disabled={actionLoading}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-base-300 text-base-content/55 transition hover:bg-base-200 hover:text-base-content disabled:opacity-50"
                  aria-label="Đóng trình chỉnh sửa"
                >
                  <Lucide.X size={19} aria-hidden="true" />
                </button>
              </header>

              <form
                onSubmit={handleUpdateTicket}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:overflow-hidden">
                  {actionError ? (
                    <p className="mb-4 rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-sm text-error">
                      {actionError}
                    </p>
                  ) : null}

                  <div className="grid min-h-full gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
                    <section className="grid content-start gap-3 rounded-[22px] border border-base-300 bg-base-100 p-4">
                      <label className="form-control">
                        <span className="mb-1.5 text-sm font-semibold">Tiêu đề</span>
                        <input
                          value={editForm.title}
                          onChange={(event) => setEditForm((form) => ({ ...form, title: event.target.value }))}
                          className="input input-bordered h-11 w-full rounded-xl bg-base-100"
                          required
                        />
                      </label>

                      <label className="form-control">
                        <span className="mb-1.5 text-sm font-semibold">Mô tả</span>
                        <textarea
                          rows="4"
                          value={editForm.description}
                          onChange={(event) => setEditForm((form) => ({ ...form, description: event.target.value }))}
                          className="textarea textarea-bordered min-h-32 w-full resize-none rounded-xl bg-base-100"
                          required
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="form-control">
                          <span className="mb-1.5 text-sm font-semibold">Danh mục</span>
                          <select
                            value={editForm.categoryId}
                            onChange={(event) => setEditForm((form) => ({ ...form, categoryId: event.target.value }))}
                            className="select select-bordered h-11 w-full rounded-xl bg-base-100"
                          >
                            <option value="">Chưa phân loại</option>
                            {categories.map((category) => (
                              <option key={category.categoryId} value={category.categoryId}>
                                {getCategoryLabel(category.categoryName)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="form-control">
                          <span className="mb-1.5 text-sm font-semibold">Mức độ ảnh hưởng</span>
                          <select
                            value={editForm.priority}
                            onChange={(event) => setEditForm((form) => ({ ...form, priority: event.target.value }))}
                            className="select select-bordered h-11 w-full rounded-xl bg-base-100"
                          >
                            <option value="Low">Thấp</option>
                            <option value="Medium">Trung bình</option>
                            <option value="High">Cao</option>
                            <option value="Urgent">Khẩn cấp</option>
                          </select>
                        </label>
                      </div>

                      <section className="rounded-2xl border border-base-300 bg-base-200/30 p-3.5" aria-labelledby="edit-location-title">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 id="edit-location-title" className="text-sm font-semibold">Vị trí phản ánh</h3>
                            <p className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs text-base-content/55">
                              <Lucide.MapPin size={13} className="shrink-0 text-primary" aria-hidden="true" />
                              <span className="truncate">
                                {areas.find((area) => String(getAreaId(area)) === String(editForm.areaId))
                                  ? getAreaName(areas.find((area) => String(getAreaId(area)) === String(editForm.areaId)))
                                  : ticket?.areaName || 'Chưa xác định khu vực'}
                              </span>
                            </p>
                            <p className="mt-1.5 text-xs leading-5 text-base-content/55">
                              {editForm.latitude != null && editForm.longitude != null
                                ? 'Điểm đã được đánh dấu trên bản đồ.'
                                : 'Chưa có điểm cụ thể trên bản đồ.'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={openLocationEditor}
                            className="btn admin-secondary-action btn-sm shrink-0 rounded-xl"
                          >
                            <Lucide.MapPinned size={14} aria-hidden="true" />
                            Thay đổi vị trí
                          </button>
                        </div>
                      </section>
                    </section>

                    <section className="flex min-h-0 flex-col rounded-[22px] border border-base-300 bg-base-200/25 p-4">
                      <header className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">Tệp minh chứng</h3>
                          <p className="mt-1 text-xs leading-5 text-base-content/48">
                            Bấm vào ảnh hoặc video để xem lại trước khi lưu.
                          </p>
                        </div>
                        <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-xs font-semibold text-base-content/55">
                          {editAttachments.length + selectedFiles.length}/{MAX_EDIT_ATTACHMENT_COUNT} tệp
                        </span>
                      </header>

                      <div className="mt-3 grid max-h-[280px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {editAttachments.map((file, index) => {
                          const previewUrl = resolvePreviewUrl(file);
                          const video = isVideoAttachment(file);

                          return (
                            <article
                              key={resolveAttachmentId(file) || previewUrl || index}
                              className="overflow-hidden rounded-xl border border-base-300 bg-base-100"
                            >
                              <button
                                type="button"
                                onClick={() => openPreview('edit', index)}
                                className="group relative block h-24 w-full overflow-hidden bg-base-200/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                aria-label={`Xem ${resolveAttachmentName(file, index)}`}
                              >
                                {video ? (
                                  <video
                                    src={previewUrl}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <img
                                    src={previewUrl}
                                    alt=""
                                    className="h-full w-full object-contain"
                                  />
                                )}
                                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100 group-focus-visible:bg-black/30 group-focus-visible:opacity-100">
                                  {video ? <Lucide.Play size={20} fill="currentColor" /> : <Lucide.Expand size={20} />}
                                </span>
                              </button>

                              <footer className="flex items-center gap-2 px-2.5 py-2">
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium">
                                    {resolveAttachmentName(file, index)}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] font-semibold text-success">
                                    Đã tải lên
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAttachmentDeleteTarget(file)}
                                  disabled={actionLoading || editAttachments.length <= 1}
                                  title={editAttachments.length <= 1 ? 'Phản ánh phải giữ lại ít nhất một tệp đã tải lên.' : 'Xóa tệp'}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label={`Xóa ${resolveAttachmentName(file, index)}`}
                                >
                                  <Lucide.Trash2 size={14} aria-hidden="true" />
                                </button>
                              </footer>
                            </article>
                          );
                        })}

                        {selectedFiles.map((item, index) => {
                          const galleryIndex = editAttachments.length + index;
                          const video = isVideoAttachment(item);

                          return (
                            <article
                              key={item.id}
                              className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5"
                            >
                              <button
                                type="button"
                                onClick={() => openPreview('edit', galleryIndex)}
                                className="group relative block h-24 w-full overflow-hidden bg-base-200/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                aria-label={`Xem ${item.name}`}
                              >
                                {video ? (
                                  <video
                                    src={item.previewUrl}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <img
                                    src={item.previewUrl}
                                    alt=""
                                    className="h-full w-full object-contain"
                                  />
                                )}
                                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100 group-focus-visible:bg-black/30 group-focus-visible:opacity-100">
                                  {video ? <Lucide.Play size={20} fill="currentColor" /> : <Lucide.Expand size={20} />}
                                </span>
                                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-content">
                                  Mới
                                </span>
                              </button>

                              <footer className="flex items-center gap-2 px-2.5 py-2">
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium">{item.name}</span>
                                  <span className="mt-0.5 block text-[10px] text-base-content/55">
                                    {formatFileSize(item.file.size)} · Chờ lưu
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeSelectedFile(item.id)}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-error transition hover:bg-error/10"
                                  aria-label={`Bỏ ${item.name}`}
                                >
                                  <Lucide.X size={14} aria-hidden="true" />
                                </button>
                              </footer>
                            </article>
                          );
                        })}
                      </div>

                      {editAttachments.length + selectedFiles.length === 0 ? (
                        <div className="mt-3 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-100/70 text-center text-xs text-base-content/55">
                          Chưa có tệp minh chứng.
                        </div>
                      ) : null}

                      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3.5 transition hover:border-primary/55 hover:bg-primary/8">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleSelectEditFiles}
                          className="sr-only"
                          disabled={actionLoading || editAttachments.length + selectedFiles.length >= MAX_EDIT_ATTACHMENT_COUNT}
                        />
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary" aria-hidden="true">
                          <Lucide.ImagePlus size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block text-sm font-semibold text-primary">
                            Chọn ảnh hoặc video từ thiết bị
                          </strong>
                          <span className="mt-0.5 block text-xs leading-5 text-base-content/55">
                            Ảnh tối đa 5 MB · Video tối đa 10 MB · Tệp mới được tải lên khi bấm Lưu thay đổi.
                          </span>
                        </span>
                        <Lucide.ChevronRight size={16} className="shrink-0 text-primary" aria-hidden="true" />
                      </label>
                    </section>
                  </div>
                </div>

                <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-base-300 bg-base-100 px-4 py-3 sm:px-6">
                  <button
                    type="button"
                    onClick={requestCloseEdit}
                    disabled={actionLoading}
                    className="btn admin-secondary-action rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn admin-primary-action rounded-xl"
                  >
                    {actionLoading ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <Lucide.Save size={15} aria-hidden="true" />
                    )}
                    Lưu thay đổi
                  </button>
                </footer>
              </form>
            </section>
          </div>,
          document.body
        )
        : null}

      {locationPickerOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[100020] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-slate-950/80 p-3 backdrop-blur-sm sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-location-picker-title"
          >
            <section className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-base-100 shadow-2xl sm:h-[min(92dvh,860px)] sm:rounded-[28px]">
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-base-300 px-4 py-3 sm:px-6 sm:py-4">
                <div className="min-w-0">
                  <h2 id="edit-location-picker-title" className="text-lg font-bold sm:text-xl">
                    Thay đổi vị trí phản ánh
                  </h2>
                  <p className="mt-0.5 text-xs text-base-content/60 sm:text-sm">
                    Chọn khu vực và đánh dấu lại đúng điểm xảy ra vấn đề trên bản đồ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationPickerError('');
                    setLocationPickerOpen(false);
                  }}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-base-300 text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
                  aria-label="Đóng trình chọn vị trí"
                >
                  <Lucide.X size={19} aria-hidden="true" />
                </button>
              </header>

              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden">
                <aside className="space-y-4 rounded-[22px] border border-base-300 bg-base-200/25 p-4">
                  <label className="block">
                    <span className="text-sm font-semibold">Khu vực</span>
                    <select
                      value={locationDraft.areaId}
                      onChange={(event) => {
                        setLocationDraft((draft) => ({
                          ...draft,
                          areaId: event.target.value,
                        }));
                        setLocationPickerError('');
                      }}
                      className="select select-bordered mt-2 h-11 w-full rounded-xl bg-base-100"
                    >
                      <option value="">Chọn khu vực</option>
                      {areas.map((area) => (
                        <option key={getAreaId(area)} value={getAreaId(area)}>
                          {getAreaName(area)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <section className="rounded-2xl border border-base-300 bg-base-100 p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                        <Lucide.MapPin size={17} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">Điểm đang chọn</h3>
                        <p className="mt-1 text-xs leading-5 text-base-content/60">
                          {locationDraft.latitude != null && locationDraft.longitude != null
                            ? 'Đã đánh dấu một điểm trên bản đồ.'
                            : 'Nhấp vào bản đồ để chọn vị trí.'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <p className="text-xs leading-5 text-base-content/55">
                    Vị trí mới chỉ được áp dụng sau khi bấm <strong>Xác nhận vị trí</strong>, sau đó bấm <strong>Lưu thay đổi</strong> trong trình chỉnh sửa.
                  </p>

                  {locationPickerError ? (
                    <p className="rounded-xl border border-error/25 bg-error/10 px-3 py-2.5 text-xs font-medium text-error" role="alert">
                      {locationPickerError}
                    </p>
                  ) : null}
                </aside>

                <div className="min-h-[360px] overflow-hidden rounded-[22px] border border-base-300 bg-base-200 p-2 lg:min-h-0">
                  <LocationPicker
                    latitude={locationDraft.latitude}
                    longitude={locationDraft.longitude}
                    onSelectLocation={handleLocationDraftSelect}
                  />
                </div>
              </div>

              <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-base-300 bg-base-100 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setLocationPickerError('');
                    setLocationPickerOpen(false);
                  }}
                  className="btn admin-secondary-action rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmLocationChange}
                  className="btn admin-primary-action rounded-xl"
                >
                  <Lucide.MapPinned size={15} aria-hidden="true" />
                  Xác nhận vị trí
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )
        : null}

      {deleteOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[99990] flex h-[100dvh] w-screen items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ticket-title"
          >
            <section className="w-full max-w-md rounded-[24px] border border-base-300 bg-base-100 p-5 text-base-content shadow-2xl sm:p-6">
              <header className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-error/10 text-error" aria-hidden="true">
                  <Lucide.Trash2 size={20} />
                </span>
                <div className="min-w-0">
                  <h2 id="delete-ticket-title" className="text-lg font-bold">
                    Xóa phản ánh?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-base-content/60">
                    Phản ánh <strong className="break-words">{ticket.title}</strong> sẽ bị xóa vĩnh viễn và không thể khôi phục.
                  </p>
                </div>
              </header>

              {actionError ? (
                <p className="mt-4 rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-sm text-error">
                  {actionError}
                </p>
              ) : null}

              <footer className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  disabled={actionLoading}
                  autoFocus
                  className="btn admin-secondary-action rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTicket}
                  disabled={actionLoading}
                  className="btn rounded-xl border-none bg-error text-error-content hover:bg-error/90"
                >
                  {actionLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <Lucide.Trash2 size={15} aria-hidden="true" />
                  )}
                  Xóa phản ánh
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )
        : null}

      {attachmentDeleteTarget && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[99995] flex h-[100dvh] w-screen items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-attachment-title"
          >
            <section className="w-full max-w-sm rounded-[22px] border border-base-300 bg-base-100 p-5 text-base-content shadow-2xl">
              <h2 id="delete-attachment-title" className="text-lg font-bold">
                Xóa tệp minh chứng?
              </h2>
              <p className="mt-2 text-sm leading-6 text-base-content/60">
                Bạn có chắc muốn xóa <strong className="break-words">{resolveAttachmentName(attachmentDeleteTarget, 0)}</strong>?
              </p>
              <footer className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAttachmentDeleteTarget(null)}
                  disabled={actionLoading}
                  autoFocus
                  className="btn admin-secondary-action rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAttachment}
                  disabled={actionLoading}
                  className="btn rounded-xl border-none bg-error text-error-content hover:bg-error/90"
                >
                  Xóa tệp
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )
        : null}

      {previewAttachment && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[99999] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-media-preview-title"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 via-black/35 to-transparent px-4 pb-16 pt-4 sm:px-6 sm:pt-5">
              <div className="min-w-0">
                <h2
                  id="detail-media-preview-title"
                  className="max-w-[72vw] truncate text-sm font-semibold text-white sm:text-base"
                >
                  {resolveAttachmentName(previewAttachment, previewAttachmentIndex)}
                </h2>
                <p className="mt-1 text-xs text-white/65">
                  {previewAttachmentIndex + 1} / {previewItems.length}
                  <span className="hidden sm:inline"> · Dùng phím ← → để chuyển tệp</span>
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
              {isVideoAttachment(previewAttachment) ? (
                <video
                  key={resolvePreviewUrl(previewAttachment)}
                  src={resolvePreviewUrl(previewAttachment)}
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
                  key={resolvePreviewUrl(previewAttachment)}
                  src={resolvePreviewUrl(previewAttachment)}
                  alt={resolveAttachmentName(previewAttachment, previewAttachmentIndex)}
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

    </>
  );
};
