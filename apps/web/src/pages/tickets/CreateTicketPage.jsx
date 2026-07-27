import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { toolsApi } from '@urbanmind/shared-api';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { LocationPicker } from '../../components/maps/LocationPicker';

const STEPS = [
  { id: 1, label: 'Mô tả', description: 'Nêu rõ vấn đề', icon: Lucide.FileText },
  { id: 2, label: 'Vị trí', description: 'Đánh dấu trên bản đồ', icon: Lucide.MapPin },
  { id: 3, label: 'Minh chứng', description: 'Thêm ảnh hoặc video', icon: Lucide.Images },
];

const STEP_FIELDS = {
  1: ['title', 'description'],
  2: ['areaId', 'location'],
  3: ['attachments'],
};

const CATEGORY_LABELS = {
  Drainage: 'Thoát nước',
  'Garbage Collection': 'Thu gom rác',
  'Public Safety': 'An toàn công cộng',
  'Road Maintenance': 'Bảo trì đường bộ',
  'Street Lighting': 'Chiếu sáng đô thị',
  'Water Supply': 'Cấp nước',
};

const MAX_ATTACHMENT_COUNT = 5;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
const DRAFT_STORAGE_PREFIX = 'urbanmind:create-ticket-draft';

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

const PRIORITY_OPTIONS = [
  {
    value: 'Low',
    label: 'Thấp',
    description: 'Ít ảnh hưởng và chưa cần xử lý ngay.',
    icon: Lucide.ArrowDown,
  },
  {
    value: 'Medium',
    label: 'Trung bình',
    description: 'Có ảnh hưởng nhưng chưa gây nguy hiểm tức thời.',
    icon: Lucide.Minus,
  },
  {
    value: 'High',
    label: 'Cao',
    description: 'Ảnh hưởng rõ rệt và cần được ưu tiên.',
    icon: Lucide.ArrowUp,
  },
  {
    value: 'Urgent',
    label: 'Khẩn cấp',
    description: 'Có nguy cơ mất an toàn hoặc gây gián đoạn nghiêm trọng.',
    icon: Lucide.Siren,
  },
];

const getCategoryId = (category) => category?.categoryId ?? category?.id;
const getCategoryName = (category) => (
  category?.categoryName ?? category?.name ?? 'Chưa phân loại'
);
const getCategoryLabel = (category) => {
  const name = getCategoryName(category);
  return CATEGORY_LABELS[name] || name;
};

const getAreaId = (area) => area?.areaId ?? area?.id;
const getAreaName = (area) => (
  area?.areaName ?? area?.name ?? area?.displayName ?? 'Chưa xác định khu vực'
);

const normalizePriority = (value) => {
  if (value === 'Critical') return 'Urgent';
  return PRIORITY_OPTIONS.some((option) => option.value === value)
    ? value
    : 'Medium';
};

const isVideo = (attachment) => (
  attachment?.type?.startsWith('video/') || attachment?.file?.type?.startsWith('video/')
);

export const CreateTicketPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const draftStorageKey = `${DRAFT_STORAGE_PREFIX}:${user?.userId || 'anonymous'}`;

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [classificationLoading, setClassificationLoading] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previewAttachmentId, setPreviewAttachmentId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingFocusField, setPendingFocusField] = useState(null);
  const [draftNotice, setDraftNotice] = useState('');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingExit, setPendingExit] = useState(null);
  const draftHydratedRef = useRef(false);
  const draftSaveTimerRef = useRef(null);

  const formStageRef = useRef(null);
  const titleFieldRef = useRef(null);
  const descriptionFieldRef = useRef(null);
  const areaFieldRef = useRef(null);
  const locationFieldRef = useRef(null);
  const attachmentFieldRef = useRef(null);


  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);

      if (!rawDraft) {
        draftHydratedRef.current = true;
        return;
      }

      const draft = JSON.parse(rawDraft);
      const restoredStep = Math.min(3, Math.max(1, Number(draft.step) || 1));

      setStep(restoredStep);
      setTitle(typeof draft.title === 'string' ? draft.title : '');
      setDescription(typeof draft.description === 'string' ? draft.description : '');
      setAreaId(draft.areaId ? String(draft.areaId) : '');
      setCategoryId(draft.categoryId ? String(draft.categoryId) : '');
      setPriority(normalizePriority(draft.priority));
      setLocationText(typeof draft.locationText === 'string' ? draft.locationText : '');
      setLatitude(Number.isFinite(draft.latitude) ? draft.latitude : null);
      setLongitude(Number.isFinite(draft.longitude) ? draft.longitude : null);
      setDraftNotice(
        draft.hadAttachments
          ? 'Đã khôi phục phản ánh đang làm dở. Hình ảnh hoặc video cần được chọn lại.'
          : 'Đã khôi phục phản ánh đang làm dở.'
      );
    } catch (error) {
      console.warn('Unable to restore create-ticket draft', error);
      window.localStorage.removeItem(draftStorageKey);
    } finally {
      draftHydratedRef.current = true;
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftHydratedRef.current || submitted) return undefined;

    window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(() => {
      const hasDraftContent = Boolean(
        title.trim() ||
        description.trim() ||
        areaId ||
        locationText ||
        latitude != null ||
        longitude != null ||
        attachments.length > 0 ||
        step > 1
      );

      if (!hasDraftContent) {
        window.localStorage.removeItem(draftStorageKey);
        return;
      }

      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          step,
          title,
          description,
          areaId,
          categoryId,
          priority,
          locationText,
          latitude,
          longitude,
          hadAttachments: attachments.length > 0,
          attachmentNames: attachments.map((item) => item.name),
          savedAt: new Date().toISOString(),
        })
      );
    }, 350);

    return () => window.clearTimeout(draftSaveTimerRef.current);
  }, [
    areaId,
    attachments,
    categoryId,
    description,
    draftStorageKey,
    latitude,
    locationText,
    longitude,
    priority,
    step,
    submitted,
    title,
  ]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setAreasLoading(true);

      const [areasResult, categoriesResult] = await Promise.allSettled([
        toolsApi.getAreas(),
        toolsApi.getCategories(),
      ]);

      if (!active) return;

      setAreas(
        areasResult.status === 'fulfilled' && Array.isArray(areasResult.value)
          ? areasResult.value
          : []
      );
      setCategories(
        categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)
          ? categoriesResult.value
          : []
      );
      setAreasLoading(false);
    };

    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!previewAttachmentId) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handlePreviewKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewAttachmentId(null);
        return;
      }

      if (
        attachments.length > 1 &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;

        setPreviewAttachmentId((currentId) => {
          const currentIndex = attachments.findIndex(
            (attachment) => attachment.id === currentId
          );
          const safeIndex = currentIndex >= 0 ? currentIndex : 0;
          const nextIndex = (
            safeIndex + direction + attachments.length
          ) % attachments.length;

          return attachments[nextIndex]?.id || null;
        });
      }
    };

    document.addEventListener('keydown', handlePreviewKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handlePreviewKeyDown);
    };
  }, [attachments, previewAttachmentId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      formStageRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    if (!pendingFocusField) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const fieldTargets = {
        title: titleFieldRef.current,
        description: descriptionFieldRef.current,
        areaId: areaFieldRef.current,
        location: locationFieldRef.current,
        attachments: attachmentFieldRef.current,
      };
      const target = fieldTargets[pendingFocusField];

      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        window.setTimeout(() => {
          target.focus?.({ preventScroll: true });
        }, 280);
      }

      setPendingFocusField(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingFocusField, step]);

  const selectedArea = useMemo(
    () => areas.find((area) => String(getAreaId(area)) === String(areaId)),
    [areaId, areas]
  );

  const selectedCategory = useMemo(
    () => categories.find(
      (category) => String(getCategoryId(category)) === String(categoryId)
    ),
    [categories, categoryId]
  );

  const selectedPriority = useMemo(
    () => PRIORITY_OPTIONS.find((option) => option.value === priority),
    [priority]
  );

  const totalAttachmentSize = useMemo(
    () => attachments.reduce(
      (total, attachment) => total + (attachment.file?.size || 0),
      0
    ),
    [attachments]
  );

  const previewAttachmentIndex = useMemo(
    () => attachments.findIndex(
      (attachment) => attachment.id === previewAttachmentId
    ),
    [attachments, previewAttachmentId]
  );

  const previewAttachment = previewAttachmentIndex >= 0
    ? attachments[previewAttachmentIndex]
    : null;

  const openAttachmentPreview = (attachmentId) => {
    setPreviewAttachmentId(attachmentId);
  };

  const closeAttachmentPreview = () => {
    setPreviewAttachmentId(null);
  };

  const moveAttachmentPreview = (direction) => {
    if (attachments.length <= 1) return;

    const safeIndex = previewAttachmentIndex >= 0
      ? previewAttachmentIndex
      : 0;
    const nextIndex = (
      safeIndex + direction + attachments.length
    ) % attachments.length;

    setPreviewAttachmentId(attachments[nextIndex]?.id || null);
  };

  const stepCompletion = useMemo(() => ({
    1: Boolean(title.trim() && description.trim() && categoryId && priority),
    2: Boolean(areaId && latitude != null && longitude != null),
    3: Boolean(
      attachments.length > 0 &&
      attachments.length <= MAX_ATTACHMENT_COUNT &&
      totalAttachmentSize <= MAX_TOTAL_ATTACHMENT_SIZE_BYTES
    ),
  }), [
    areaId,
    attachments.length,
    categoryId,
    description,
    latitude,
    longitude,
    priority,
    title,
    totalAttachmentSize,
  ]);

  const validateStep = (stepId) => {
    const errors = {};

    if (stepId === 1) {
      if (!title.trim()) {
        errors.title = 'Vui lòng nhập tiêu đề phản ánh.';
      }
      if (!description.trim()) {
        errors.description = 'Vui lòng mô tả chi tiết vấn đề.';
      }
    }

    if (stepId === 2) {
      if (!areaId) {
        errors.areaId = 'Vui lòng chọn khu vực xảy ra vấn đề.';
      }
      if (latitude == null || longitude == null) {
        errors.location = 'Vui lòng đánh dấu vị trí cụ thể trên bản đồ.';
      }
    }

    if (stepId === 3) {
      if (attachments.length === 0) {
        errors.attachments = 'Vui lòng thêm ít nhất một hình ảnh hoặc video minh chứng.';
      } else if (
        attachments.length > MAX_ATTACHMENT_COUNT ||
        totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE_BYTES
      ) {
        errors.attachments = `Tối đa ${MAX_ATTACHMENT_COUNT} tệp và tổng dung lượng không quá ${formatFileSize(MAX_TOTAL_ATTACHMENT_SIZE_BYTES)}.`;
      }
    }

    return errors;
  };

  const replaceStepErrors = (stepId, nextErrors) => {
    setFieldErrors((current) => {
      const next = { ...current };
      STEP_FIELDS[stepId].forEach((fieldName) => {
        delete next[fieldName];
      });
      return { ...next, ...nextErrors };
    });
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors((current) => {
      if (!current[fieldName]) return current;
      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  };

  const validateStepAndFocus = (stepId) => {
    const errors = validateStep(stepId);
    replaceStepErrors(stepId, errors);

    const firstInvalidField = STEP_FIELDS[stepId].find(
      (fieldName) => errors[fieldName]
    );

    if (!firstInvalidField) {
      setSubmitError('');
      return true;
    }

    setSubmitError('Vui lòng kiểm tra các thông tin còn thiếu trước khi tiếp tục.');
    setPendingFocusField(firstInvalidField);
    return false;
  };

  const goToStep = (nextStep) => {
    setSubmitError('');
    setStep(nextStep);
  };

  const hasUnsavedDraft = useMemo(() => Boolean(
    !submitted && (
      title.trim() ||
      description.trim() ||
      areaId ||
      locationText ||
      latitude != null ||
      longitude != null ||
      attachments.length > 0 ||
      step > 1
    )
  ), [
    areaId,
    attachments.length,
    description,
    latitude,
    locationText,
    longitude,
    step,
    submitted,
    title,
  ]);

  useEffect(() => {
    if (!hasUnsavedDraft) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handleDocumentClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (`${destination.pathname}${destination.search}${destination.hash}` === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingExit({ type: 'path', value: `${destination.pathname}${destination.search}${destination.hash}` });
      setShowLeaveDialog(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasUnsavedDraft]);

  const stayOnPage = () => {
    setShowLeaveDialog(false);
    setPendingExit(null);
  };

  const leavePage = () => {
    const destination = pendingExit;
    setShowLeaveDialog(false);
    setPendingExit(null);

    if (destination?.type === 'history') {
      navigate(-1);
      return;
    }

    navigate(destination?.value || '/');
  };

  const handleReturnToSource = () => {
    if (hasUnsavedDraft) {
      setPendingExit({ type: window.history.length > 1 ? 'history' : 'path', value: '/' });
      setShowLeaveDialog(true);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const handleFileUpload = async (event) => {
    const input = event.target;
    const files = Array.from(input.files || []);
    input.value = '';

    if (files.length === 0) return;

    setAttachmentError('');

    const acceptedFiles = [];
    const validationMessages = [];
    const existingFiles = new Set(
      attachments.map(
        (attachment) => (
          `${attachment.file?.name}-${attachment.file?.size}-${attachment.file?.lastModified}`
        )
      )
    );

    let nextCount = attachments.length;
    let nextTotalSize = totalAttachmentSize;

    files.forEach((file) => {
      const fileIdentity = `${file.name}-${file.size}-${file.lastModified}`;
      const imageFile = file.type.startsWith('image/');
      const videoFile = file.type.startsWith('video/');

      if (existingFiles.has(fileIdentity)) {
        validationMessages.push(`${file.name}: tệp này đã được chọn.`);
        return;
      }

      if (!imageFile && !videoFile) {
        validationMessages.push(
          `${file.name}: chỉ hỗ trợ tệp hình ảnh hoặc video.`
        );
        return;
      }

      if (nextCount >= MAX_ATTACHMENT_COUNT) {
        validationMessages.push(
          `Chỉ được chọn tối đa ${MAX_ATTACHMENT_COUNT} tệp minh chứng.`
        );
        return;
      }

      const fileSizeLimit = videoFile
        ? MAX_VIDEO_SIZE_BYTES
        : MAX_IMAGE_SIZE_BYTES;

      if (file.size > fileSizeLimit) {
        validationMessages.push(
          `${file.name}: ${videoFile ? 'video' : 'ảnh'} không được vượt quá ${formatFileSize(fileSizeLimit)}.`
        );
        return;
      }

      if (nextTotalSize + file.size > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
        validationMessages.push(
          `Tổng dung lượng minh chứng không được vượt quá ${formatFileSize(MAX_TOTAL_ATTACHMENT_SIZE_BYTES)}.`
        );
        return;
      }

      acceptedFiles.push(file);
      existingFiles.add(fileIdentity);
      nextCount += 1;
      nextTotalSize += file.size;
    });

    if (validationMessages.length > 0) {
      const firstMessage = validationMessages[0];
      const remainingCount = validationMessages.length - 1;

      setAttachmentError(
        remainingCount > 0
          ? `${firstMessage} Và ${remainingCount} tệp khác không được thêm.`
          : firstMessage
      );
    }

    if (acceptedFiles.length === 0) return;

    try {
      const nextAttachments = await Promise.all(
        acceptedFiles.map(
          (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              resolve({
                id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID?.() || Date.now()}`,
                file,
                preview: reader.result,
                type: file.type,
                name: file.name,
              });
            };

            reader.onerror = () => reject(
              new Error(`Không thể đọc tệp ${file.name}.`)
            );

            reader.readAsDataURL(file);
          })
        )
      );

      setAttachments((current) => [...current, ...nextAttachments]);
      clearFieldError('attachments');
      setSubmitError('');
    } catch (error) {
      setAttachmentError(
        error?.message || 'Không thể đọc tệp đã chọn. Vui lòng thử lại.'
      );
    }
  };

  const removeAttachment = (attachmentId) => {
    setAttachments((current) => (
      current.filter((item) => item.id !== attachmentId)
    ));
    setAttachmentError('');
    clearFieldError('attachments');
  };

  const handleDescriptionNext = async () => {
    if (!validateStepAndFocus(1)) return;

    setSubmitError('');
    setClassificationLoading(true);

    let resolvedCategoryId = categoryId;
    let resolvedPriority = priority;

    try {
      const analysis = await toolsApi.aiClassify(title.trim(), description.trim());
      if (analysis?.categoryId) resolvedCategoryId = String(analysis.categoryId);
      if (analysis?.urgencyLevel) {
        resolvedPriority = normalizePriority(analysis.urgencyLevel);
      }
    } catch (error) {
      console.warn('Automatic classification unavailable', error);
    }

    if (!resolvedCategoryId) {
      const fallbackCategoryId = getCategoryId(categories[0]);
      if (fallbackCategoryId) resolvedCategoryId = String(fallbackCategoryId);
    }

    setClassificationLoading(false);

    if (!resolvedCategoryId) {
      setSubmitError('Hệ thống chưa thể tự phân loại phản ánh. Vui lòng thử lại sau ít phút.');
      return;
    }

    setCategoryId(resolvedCategoryId);
    setPriority(resolvedPriority || 'Medium');
    goToStep(2);
  };

  const handleLocationSelect = async (lat, lng, address) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationText(address || `Vị trí đã chọn: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    clearFieldError('location');
    setSubmitError('');
    setShowDuplicateWarning(false);
    setDuplicates([]);

    try {
      const matches = await toolsApi.checkDuplicates(Number(categoryId), lat, lng);
      const normalizedMatches = Array.isArray(matches) ? matches : [];
      setDuplicates(normalizedMatches);
      setShowDuplicateWarning(normalizedMatches.length > 0);
    } catch (error) {
      console.warn('Duplicate check unavailable', error);
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');

    const allErrors = {};
    [1, 2, 3].forEach((stepId) => {
      Object.assign(allErrors, validateStep(stepId));
    });

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);

      const firstInvalidStep = [1, 2, 3].find((stepId) => (
        STEP_FIELDS[stepId].some((fieldName) => allErrors[fieldName])
      ));
      const firstInvalidField = STEP_FIELDS[firstInvalidStep].find(
        (fieldName) => allErrors[fieldName]
      );

      setSubmitError('Phản ánh còn thiếu thông tin. Hệ thống đã đưa bạn tới mục cần bổ sung.');
      setStep(firstInvalidStep);
      setPendingFocusField(firstInvalidField);
      return;
    }

    setSubmitting(true);

    try {
      await ticketApi.createTicket(
        user?.userId,
        user?.fullName,
        {
          areaId: Number(areaId),
          categoryId: Number(categoryId),
          title: title.trim(),
          description: description.trim(),
          priority,
          locationText,
          latitude,
          longitude,
          attachments: attachments.map((item) => item.file),
        },
        { role: user?.role || 'service-user' }
      );
      window.localStorage.removeItem(draftStorageKey);
      setDraftNotice('');
      setSubmitted(true);
    } catch (error) {
      console.error('createTicket error', error);

      const networkUploadError = error?.message === 'Network Error';
      setSubmitError(
        networkUploadError
          ? 'Không thể tải minh chứng lên. Hãy kiểm tra kết nối và bảo đảm tệp không vượt quá giới hạn dung lượng.'
          : error?.message || 'Không thể gửi phản ánh. Vui lòng thử lại sau.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clearDraft = () => {
    window.localStorage.removeItem(draftStorageKey);
    setDraftNotice('');
    setStep(1);
    setTitle('');
    setDescription('');
    setAreaId('');
    setCategoryId('');
    setPriority('Medium');
    setLocationText('');
    setLatitude(null);
    setLongitude(null);
    setAttachments([]);
    setAttachmentError('');
    setDuplicates([]);
    setShowDuplicateWarning(false);
    setSubmitError('');
    setFieldErrors({});
    setPendingFocusField(null);
  };

  const resetForm = () => {
    window.localStorage.removeItem(draftStorageKey);
    setDraftNotice('');
    setStep(1);
    setTitle('');
    setDescription('');
    setAreaId('');
    setCategoryId('');
    setPriority('Medium');
    setLocationText('');
    setLatitude(null);
    setLongitude(null);
    setAttachments([]);
    setAttachmentError('');
    setDuplicates([]);
    setShowDuplicateWarning(false);
    setSubmitError('');
    setSubmitted(false);
    setPreviewAttachmentId(null);
    setFieldErrors({});
    setPendingFocusField(null);
  };

  if (submitted) {
    return (
      <main className="flex min-h-[calc(100vh-220px)] items-center justify-center py-8 text-base-content">
        <section className="w-full max-w-2xl rounded-[28px] border border-base-300 bg-base-100 p-6 text-center shadow-sm sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-success/12 text-success" aria-hidden="true">
            <Lucide.CircleCheckBig size={30} />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            Phản ánh đã được gửi
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-base-content/60">
            Hệ thống đã tiếp nhận thông tin. Bạn có thể theo dõi tiến trình xử lý trong mục Phản ánh của tôi.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.20)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-50"
            >
              <Lucide.ListChecks size={16} aria-hidden="true" />
              Xem phản ánh của tôi
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 text-sm font-semibold transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:bg-slate-700"
            >
              <Lucide.Plus size={16} aria-hidden="true" />
              Gửi phản ánh khác
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="create-ticket-page text-base-content">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="create-ticket-shell relative isolate rounded-[34px] border p-4 sm:p-5 lg:p-6">

        <header className="create-ticket-hero mb-5 overflow-hidden rounded-[26px] border p-5 sm:p-7">
          <nav aria-label="Điều hướng" className="mb-6">
            <button
              type="button"
              onClick={handleReturnToSource}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:bg-slate-700"
            >
              <Lucide.ArrowLeft size={14} aria-hidden="true" />
              Quay lại
            </button>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)] sm:flex" aria-hidden="true"><Lucide.MessageSquarePlus size={22} /></span>
              <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">Phản ánh đô thị</p>
              <h1 className="text-[32px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[38px] dark:text-white">Gửi phản ánh</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/55 sm:text-[15px]">
                Mô tả vấn đề, đánh dấu vị trí và thêm minh chứng để hệ thống tiếp nhận chính xác hơn.
              </p>
              </div>
            </div>

            <Link
              to="/tickets"
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:bg-slate-700 sm:self-end"
            >
              <Lucide.ListChecks size={16} aria-hidden="true" />
              Phản ánh của tôi
            </Link>
          </div>
        </header>

        <section className="create-ticket-stepper mb-5 rounded-[22px] border px-5 py-4 sm:px-6" aria-label="Tiến trình gửi phản ánh">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600 dark:text-blue-300">
                Bước {step} trên {STEPS.length}
              </p>
              <p className="mt-1 text-sm font-semibold">{STEPS[step - 1]?.label}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Lucide.Clock3 size={12} aria-hidden="true" /> Khoảng 2–3 phút</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
            {STEPS.map(({ id }) => (
              <span
                key={id}
                className={`h-1 rounded-full transition-colors ${
                  id <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <ol className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
            {STEPS.map(({ id, label, icon: Icon }) => {
              const isCurrent = step === id;
              const isComplete = stepCompletion[id];
              const previousStepsComplete = STEPS
                .filter((item) => item.id < id)
                .every((item) => stepCompletion[item.id]);
              const isEnabled = id <= step || previousStepsComplete;

              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => isEnabled && goToStep(id)}
                    disabled={!isEnabled}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-xs transition sm:text-sm ${
                      isCurrent
                        ? 'font-semibold text-blue-700 dark:text-blue-300'
                        : isComplete
                          ? 'font-medium text-emerald-700 dark:text-emerald-300'
                          : 'text-base-content/40'
                    } disabled:cursor-not-allowed`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      isCurrent
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-slate-200 bg-slate-50 text-base-content/35 dark:border-slate-700 dark:bg-slate-800'
                    }`} aria-hidden="true">
                      {isComplete && !isCurrent ? <Lucide.Check size={13} /> : <Icon size={13} />}
                    </span>
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

      {draftNotice ? (
        <aside className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 sm:flex-row sm:items-center dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-100" role="status">
          <span className="flex min-w-0 flex-1 items-start gap-3">
            <Lucide.History size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
            <span className="leading-5">{draftNotice}</span>
          </span>
          <button
            type="button"
            onClick={clearDraft}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800"
          >
            <Lucide.Trash2 size={14} aria-hidden="true" />
            Xóa bản nháp
          </button>
        </aside>
      ) : null}

      {submitError ? (
        <aside className="flex items-start gap-3 rounded-2xl border border-error/25 bg-error/8 px-4 py-3 text-sm text-error" role="alert">
          <Lucide.CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{submitError}</span>
          <button
            type="button"
            onClick={() => setSubmitError('')}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-error/10"
            aria-label="Đóng thông báo lỗi"
          >
            <Lucide.X size={14} aria-hidden="true" />
          </button>
        </aside>
      ) : null}

      <section>
        <article ref={formStageRef} className="create-ticket-form scroll-mt-24 overflow-hidden rounded-[24px] border">
          {step === 1 ? (
            <section aria-labelledby="description-step-title">
              <header className="create-ticket-form-header border-b px-5 py-4 sm:px-7">
                <h2 id="description-step-title" className="text-lg font-semibold dark:text-slate-100">
                  Bạn đang gặp vấn đề gì?
                </h2>
                <p className="mt-1 text-xs leading-5 text-base-content/50">
                  Nêu ngắn gọn vấn đề và mô tả mức độ ảnh hưởng thực tế.
                </p>
              </header>

              <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-8">
                <div className="space-y-6">
                <label className="block">
                  <span className="text-sm font-semibold dark:text-slate-100">Tiêu đề phản ánh</span>
                  <span className="ml-1 text-error">*</span>
                  <input
                    ref={titleFieldRef}
                    type="text"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      clearFieldError('title');
                    }}
                    maxLength={160}
                    placeholder="Ví dụ: Đèn đường trước số 123 không hoạt động"
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? 'title-error' : undefined}
                    className={`mt-2.5 h-[52px] w-full rounded-xl border bg-base-100 px-4 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 text-[15px] outline-none transition placeholder:text-base-content/35 focus:ring-2 ${
                      fieldErrors.title
                        ? 'border-error focus:border-error focus:ring-error/15'
                        : 'border-base-300 focus:border-primary focus:ring-primary/15'
                    }`}
                  />
                  <span className="mt-1.5 flex items-start justify-between gap-3">
                    {fieldErrors.title ? (
                      <span id="title-error" className="text-xs font-medium text-error" role="alert">
                        {fieldErrors.title}
                      </span>
                    ) : <span />}
                    <span className="shrink-0 text-[11px] text-base-content/40">
                      {title.length}/160
                    </span>
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold dark:text-slate-100">Mô tả chi tiết</span>
                  <span className="ml-1 text-error">*</span>
                  <textarea
                    ref={descriptionFieldRef}
                    rows={5}
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      clearFieldError('description');
                    }}
                    placeholder="Vấn đề bắt đầu từ khi nào? Ảnh hưởng đến người dân hoặc giao thông ra sao?"
                    aria-invalid={Boolean(fieldErrors.description)}
                    aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                    className={`mt-2.5 min-h-[150px] w-full resize-y rounded-xl border bg-base-100 px-4 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 py-3.5 text-[15px] leading-6 outline-none transition placeholder:text-base-content/35 focus:ring-2 ${
                      fieldErrors.description
                        ? 'border-error focus:border-error focus:ring-error/15'
                        : 'border-base-300 focus:border-primary focus:ring-primary/15'
                    }`}
                  />
                  {fieldErrors.description ? (
                    <span id="description-error" className="mt-1.5 block text-xs font-medium text-error" role="alert">
                      {fieldErrors.description}
                    </span>
                  ) : null}
                </label>

                </div>

                <aside className="h-fit rounded-[20px] border border-blue-100 bg-[linear-gradient(160deg,#eff6ff_0%,#f8fbff_100%)] p-5 lg:sticky lg:top-24 dark:border-slate-700 dark:bg-[linear-gradient(160deg,#101d33_0%,#0d1728_100%)]" aria-label="Gợi ý mô tả">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                    <Lucide.Lightbulb size={16} aria-hidden="true" />
                    Mô tả tốt nên có
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Thông tin được tự động lưu trên thiết bị này để bạn có thể quay lại tiếp tục.</p>
                  <ul className="mt-4 grid gap-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2"><Lucide.Check size={14} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" /> Dấu hiệu hoặc tình trạng cụ thể</li>
                    <li className="flex gap-2"><Lucide.Check size={14} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" /> Thời điểm bạn phát hiện</li>
                    <li className="flex gap-2"><Lucide.Check size={14} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" /> Mức độ ảnh hưởng thực tế</li>
                  </ul>
                </aside>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby="location-step-title">
              <header className="create-ticket-form-header border-b px-5 py-4 sm:px-7">
                <h2 id="location-step-title" className="text-lg font-semibold dark:text-slate-100">
                  Khu vực và vị trí sự cố
                </h2>
                <p className="mt-1 text-xs leading-5 text-base-content/50">
                  Chọn khu vực đã xảy ra sự cố, sau đó đánh dấu điểm chính xác trên bản đồ.
                </p>
              </header>

              <div className="space-y-5 p-5 sm:p-7 lg:p-8">
                <label className="block">
                  <span className="text-sm font-semibold dark:text-slate-100">Khu vực</span>
                  <span className="ml-1 text-error">*</span>
                  <select
                    ref={areaFieldRef}
                    value={areaId}
                    onChange={(event) => {
                      setAreaId(event.target.value);
                      clearFieldError('areaId');
                    }}
                    disabled={areasLoading}
                    aria-invalid={Boolean(fieldErrors.areaId)}
                    aria-describedby={fieldErrors.areaId ? 'area-error' : undefined}
                    className={`mt-2.5 h-[52px] w-full rounded-xl border bg-base-100 px-4 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 text-[15px] font-medium outline-none transition focus:ring-2 ${
                      fieldErrors.areaId
                        ? 'border-error focus:border-error focus:ring-error/15'
                        : 'border-base-300 focus:border-primary focus:ring-primary/15'
                    }`}
                  >
                    <option value="">
                      {areasLoading ? 'Đang tải khu vực...' : 'Chọn khu vực xảy ra sự cố'}
                    </option>
                    {areas.map((area) => (
                      <option key={getAreaId(area)} value={getAreaId(area)}>
                        {getAreaName(area)}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.areaId ? (
                    <span id="area-error" className="mt-1.5 block text-xs font-medium text-error" role="alert">
                      {fieldErrors.areaId}
                    </span>
                  ) : null}
                  <span className="mt-2 block text-xs leading-5 text-base-content/45">
                    Danh sách khu vực được cập nhật tự động từ hệ thống.
                  </span>
                </label>

                <div>
                  <div
                    ref={locationFieldRef}
                    tabIndex={-1}
                    aria-invalid={Boolean(fieldErrors.location)}
                    aria-describedby={fieldErrors.location ? 'location-error' : undefined}
                    className={`rounded-[24px] border bg-base-100 p-2 dark:border-slate-700 dark:bg-slate-950 outline-none transition ${
                      fieldErrors.location
                        ? 'border-error ring-2 ring-error/15'
                        : 'border-base-300'
                    }`}
                  >
                    <LocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      onSelectLocation={handleLocationSelect}
                    />
                  </div>
                  {fieldErrors.location ? (
                    <span id="location-error" className="mt-1.5 block text-xs font-medium text-error" role="alert">
                      {fieldErrors.location}
                    </span>
                  ) : null}
                </div>

                {showDuplicateWarning ? (
                  <aside className="rounded-2xl border border-warning/25 bg-warning/8 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/12 text-warning" aria-hidden="true">
                        <Lucide.TriangleAlert size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold dark:text-slate-100">Có phản ánh tương tự gần vị trí này</h3>
                        <p className="mt-1 text-xs leading-5 text-base-content/55">
                          Hệ thống tìm thấy {duplicates.length} phản ánh có thể liên quan. Bạn có thể xem trước khi quyết định gửi mới.
                        </p>
                        <ul className="mt-3 space-y-2">
                          {duplicates.slice(0, 3).map((duplicate, index) => (
                            <li key={duplicate.feedbackId || index}>
                              <button
                                type="button"
                                onClick={() => navigate(`/tickets/${duplicate.feedbackId}`)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-warning/15 bg-base-100 px-3 py-2 text-left text-xs transition hover:border-warning/35"
                              >
                                <span className="truncate font-medium">
                                  {duplicate.title || 'Phản ánh tương tự'}
                                </span>
                                <Lucide.ArrowUpRight size={14} className="shrink-0" aria-hidden="true" />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => setShowDuplicateWarning(false)}
                          className="mt-3 text-xs font-semibold text-warning hover:underline"
                        >
                          Tôi vẫn muốn gửi phản ánh mới
                        </button>
                      </div>
                    </div>
                  </aside>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section aria-labelledby="evidence-step-title">
              <header className="create-ticket-form-header border-b px-5 py-4 sm:px-7">
                <h2 id="evidence-step-title" className="text-lg font-semibold dark:text-slate-100">
                  Thêm minh chứng
                </h2>
                <p className="mt-1 text-xs leading-5 text-base-content/50">
                  Hình ảnh hoặc video rõ ràng giúp việc xác minh và xử lý nhanh hơn.
                </p>
              </header>

              <div className="space-y-5 p-5 sm:p-7 lg:p-8">
                <label
                  ref={attachmentFieldRef}
                  tabIndex={-1}
                  aria-invalid={Boolean(fieldErrors.attachments)}
                  className={`group relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed bg-base-200/30 dark:border-slate-700 dark:bg-slate-950/70 p-5 text-center outline-none transition hover:bg-primary/5 ${
                    fieldErrors.attachments
                      ? 'border-error ring-2 ring-error/15'
                      : 'border-base-300 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                    aria-describedby="evidence-upload-rules"
                  />
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
                    <Lucide.UploadCloud size={23} />
                  </span>
                  <strong className="mt-4 text-sm font-semibold">
                    Chọn hình ảnh hoặc video
                  </strong>
                  <span
                    id="evidence-upload-rules"
                    className="mt-1 text-xs leading-5 text-base-content/45"
                  >
                    Tối đa {MAX_ATTACHMENT_COUNT} tệp · Ảnh tối đa {formatFileSize(MAX_IMAGE_SIZE_BYTES)} · Video tối đa {formatFileSize(MAX_VIDEO_SIZE_BYTES)}
                  </span>
                  <span className="mt-0.5 text-xs leading-5 text-base-content/40">
                    Tổng dung lượng không quá {formatFileSize(MAX_TOTAL_ATTACHMENT_SIZE_BYTES)}.
                  </span>
                </label>

                {fieldErrors.attachments || attachmentError ? (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error"
                  >
                    <Lucide.CircleAlert
                      size={17}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="leading-5">
                      {fieldErrors.attachments || attachmentError}
                    </span>
                  </div>
                ) : null}

                {attachments.length > 0 ? (
                  <section aria-labelledby="selected-evidence-title">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id="selected-evidence-title" className="text-sm font-semibold dark:text-slate-100">
                        Minh chứng đã chọn
                      </h3>
                      <span className="text-xs text-base-content/45">
                        {attachments.length}/{MAX_ATTACHMENT_COUNT} tệp · {formatFileSize(totalAttachmentSize)}/{formatFileSize(MAX_TOTAL_ATTACHMENT_SIZE_BYTES)}
                      </span>
                    </div>

                    <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {attachments.map((attachment) => (
                        <li key={attachment.id} className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 dark:border-slate-700 dark:bg-slate-900">
                          <button
                            type="button"
                            onClick={() => openAttachmentPreview(attachment.id)}
                            className="group relative block h-36 w-full overflow-hidden bg-base-200"
                            aria-label={`Xem trước ${attachment.name}`}
                          >
                            {isVideo(attachment) ? (
                              <video src={attachment.preview} className="h-full w-full object-cover" muted />
                            ) : (
                              <img
                                src={attachment.preview}
                                alt={attachment.name}
                                className="h-full w-full object-cover"
                              />
                            )}
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100 group-focus-visible:bg-black/35 group-focus-visible:opacity-100">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur">
                                {isVideo(attachment) ? (
                                  <Lucide.Play size={18} fill="currentColor" aria-hidden="true" />
                                ) : (
                                  <Lucide.Expand size={18} aria-hidden="true" />
                                )}
                              </span>
                            </span>
                          </button>
                          <div className="flex items-center gap-2 px-3 py-2.5">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium">
                                {attachment.name}
                              </span>
                              <span className="mt-0.5 block text-[11px] text-base-content/40">
                                {formatFileSize(attachment.file?.size || 0)}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(attachment.id)}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-error transition hover:bg-error/10"
                              aria-label={`Xóa ${attachment.name}`}
                            >
                              <Lucide.Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </section>
          ) : null}

          <footer className={`flex flex-col-reverse gap-3 border-t border-slate-200/80 bg-white px-5 py-4 sm:flex-row sm:items-center sm:px-7 dark:border-slate-700 dark:bg-[#0d1728] ${step === 1 ? 'sm:justify-end' : 'sm:justify-between'}`}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 text-sm font-semibold transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:bg-slate-700"
              >
                <Lucide.ArrowLeft size={16} aria-hidden="true" />
                Quay lại
              </button>
            ) : null}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    handleDescriptionNext();
                    return;
                  }

                  if (validateStepAndFocus(step)) {
                    goToStep(Math.min(3, step + 1));
                  }
                }}
                disabled={classificationLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.20)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-50"
              >
                {classificationLoading ? (
                  <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                ) : null}
                Tiếp tục
                <Lucide.ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                ) : (
                  <Lucide.Send size={16} aria-hidden="true" />
                )}
                {submitting ? 'Đang gửi...' : 'Gửi phản ánh'}
              </button>
            )}
          </footer>
        </article>

        <aside className="hidden">
          <section className="rounded-[24px] border border-blue-100/80 bg-base-100 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] dark:border-blue-500/15" aria-labelledby="submission-summary-title">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
                <Lucide.ClipboardList size={18} />
              </span>
              <div>
                <h2 id="submission-summary-title" className="text-base font-semibold">
                  Thông tin đã nhập
                </h2>
                <p className="mt-1 text-xs text-base-content/45">
                  Kiểm tra nhanh trước khi gửi.
                </p>
              </div>
            </div>

            <dl className="mt-4 divide-y divide-base-300 text-sm">
              <div className="py-3 first:pt-0">
                <dt className="text-xs text-base-content/45">Vấn đề</dt>
                <dd className="mt-1 truncate font-medium">
                  {title.trim() || 'Chưa nhập tiêu đề'}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-xs text-base-content/45">Danh mục</dt>
                <dd className="mt-1 font-medium">
                  {selectedCategory ? getCategoryLabel(selectedCategory) : 'Hệ thống đang xác định'}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-xs text-base-content/45">Mức độ ảnh hưởng</dt>
                <dd className="mt-1 font-medium">
                  {selectedPriority?.label || 'Hệ thống đang xác định'}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-xs text-base-content/45">Khu vực</dt>
                <dd className="mt-1 font-medium">
                  {selectedArea ? getAreaName(selectedArea) : 'Chưa chọn'}
                </dd>
              </div>
              <div className="py-3 last:pb-0">
                <dt className="text-xs text-base-content/45">Minh chứng</dt>
                <dd className="mt-1 font-medium">
                  {attachments.length > 0
                    ? `${attachments.length} tệp · ${formatFileSize(totalAttachmentSize)}`
                    : 'Chưa thêm'}
                </dd>
              </div>
            </dl>
          </section>

          <aside className="rounded-[24px] border border-info/20 bg-info/5 p-5">
            <div className="flex items-start gap-3">
              <Lucide.ShieldCheck size={18} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
              <p className="text-xs leading-5 text-base-content/55">
                Thông tin vị trí và minh chứng chỉ được sử dụng để tiếp nhận, xác minh và xử lý phản ánh.
              </p>
            </div>
          </aside>
        </aside>
      </section>
        </div>

      {showLeaveDialog && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm" role="presentation">
              <section className="w-full max-w-md rounded-[24px] border border-white/60 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)] dark:border-base-300 dark:bg-base-100" role="dialog" aria-modal="true" aria-labelledby="leave-draft-title">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" aria-hidden="true">
                  <Lucide.FileClock size={22} />
                </span>
                <h2 id="leave-draft-title" className="mt-4 text-xl font-semibold tracking-tight">Rời khỏi phản ánh đang làm?</h2>
                <p className="mt-2 text-sm leading-6 text-base-content/60">
                  Nội dung mô tả và vị trí đã được lưu tự động. Bạn có thể quay lại trang Gửi phản ánh để tiếp tục từ bước hiện tại.
                </p>
                {attachments.length > 0 ? (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/8 dark:text-amber-200">
                    Ảnh hoặc video không được lưu trong bản nháp và cần chọn lại khi quay lại.
                  </p>
                ) : null}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={stayOnPage} className="inline-flex h-11 items-center justify-center rounded-xl border border-base-300 bg-base-100 px-4 text-sm font-semibold transition hover:border-blue-200 hover:text-blue-700">
                    Tiếp tục chỉnh sửa
                  </button>
                  <button type="button" onClick={leavePage} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.20)] transition hover:bg-blue-700">
                    Rời trang
                    <Lucide.ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
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
              aria-labelledby="attachment-preview-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeAttachmentPreview();
                }
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 via-black/35 to-transparent px-4 pb-16 pt-4 sm:px-6 sm:pt-5"
                aria-hidden="true"
              >
                <div className="min-w-0">
                  <h2
                    id="attachment-preview-title"
                    className="max-w-[70vw] truncate text-sm font-semibold text-white sm:text-base"
                  >
                    {previewAttachment.name}
                  </h2>
                  <p className="mt-1 text-xs text-white/65">
                    {previewAttachmentIndex + 1} / {attachments.length}
                    <span className="hidden sm:inline">
                      {' '}· Dùng phím ← → để chuyển tệp
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAttachmentPreview}
                className="absolute right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:top-5"
                aria-label="Đóng xem trước"
              >
                <Lucide.X size={21} aria-hidden="true" />
              </button>

              <div
                className="flex h-full w-full items-center justify-center overflow-hidden px-3 py-3 sm:px-16 sm:py-5"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeAttachmentPreview();
                  }
                }}
              >
                {isVideo(previewAttachment) ? (
                  <video
                    key={previewAttachment.id}
                    src={previewAttachment.preview}
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
                    key={previewAttachment.id}
                    src={previewAttachment.preview}
                    alt={previewAttachment.name}
                    className="block max-h-[calc(100dvh-24px)] max-w-[calc(100vw-24px)] select-none object-contain sm:max-h-[calc(100dvh-40px)] sm:max-w-[calc(100vw-128px)]"
                    draggable="false"
                  />
                )}
              </div>

              {attachments.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => moveAttachmentPreview(-1)}
                    className="absolute left-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-xl backdrop-blur transition hover:scale-105 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:left-6 sm:h-14 sm:w-14"
                    aria-label="Xem tệp trước"
                  >
                    <Lucide.ChevronLeft size={28} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveAttachmentPreview(1)}
                    className="absolute right-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-xl backdrop-blur transition hover:scale-105 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:h-14 sm:w-14"
                    aria-label="Xem tệp tiếp theo"
                  >
                    <Lucide.ChevronRight size={28} aria-hidden="true" />
                  </button>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/75 via-black/20 to-transparent px-4 pb-4 pt-14">
                    <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                      {previewAttachmentIndex + 1} / {attachments.length}
                    </span>
                  </div>
                </>
              ) : null}
            </div>,
            document.body
          )
        : null}
      </div>
    </main>
  );
};
