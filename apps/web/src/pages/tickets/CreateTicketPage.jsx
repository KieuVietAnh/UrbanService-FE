import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { toolsApi } from '@urbanmind/shared-api';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { LocationPicker } from '../../components/maps/LocationPicker';

const STEPS = [
  { id: 1, label: 'Mô tả', icon: Lucide.FileText },
  { id: 2, label: 'Phân loại', icon: Lucide.Tags },
  { id: 3, label: 'Vị trí', icon: Lucide.MapPin },
  { id: 4, label: 'Minh chứng', icon: Lucide.Images },
];

const STEP_FIELDS = {
  1: ['title', 'description'],
  2: ['categoryId', 'priority'],
  3: ['areaId', 'location'],
  4: ['attachments'],
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
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [classificationLoading, setClassificationLoading] = useState(false);
  const [aiSuggestionAvailable, setAiSuggestionAvailable] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previewAttachmentId, setPreviewAttachmentId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingFocusField, setPendingFocusField] = useState(null);

  const formStageRef = useRef(null);
  const titleFieldRef = useRef(null);
  const descriptionFieldRef = useRef(null);
  const categoryFieldRef = useRef(null);
  const priorityFieldRef = useRef(null);
  const areaFieldRef = useRef(null);
  const locationFieldRef = useRef(null);
  const attachmentFieldRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setAreasLoading(true);
      setCategoriesLoading(true);

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
      setCategoriesLoading(false);
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
        categoryId: categoryFieldRef.current,
        priority: priorityFieldRef.current,
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
    1: Boolean(title.trim() && description.trim()),
    2: Boolean(categoryId && priority),
    3: Boolean(areaId && latitude != null && longitude != null),
    4: Boolean(
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
      if (!categoryId) {
        errors.categoryId = 'Vui lòng chọn danh mục phù hợp.';
      }
      if (!priority) {
        errors.priority = 'Vui lòng chọn mức độ ảnh hưởng.';
      }
    }

    if (stepId === 3) {
      if (!areaId) {
        errors.areaId = 'Vui lòng chọn khu vực xảy ra vấn đề.';
      }
      if (latitude == null || longitude == null) {
        errors.location = 'Vui lòng đánh dấu vị trí cụ thể trên bản đồ.';
      }
    }

    if (stepId === 4) {
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
    setAiSuggestionAvailable(false);

    try {
      const analysis = await toolsApi.aiClassify(title.trim(), description.trim());
      if (analysis?.categoryId) setCategoryId(String(analysis.categoryId));
      if (analysis?.urgencyLevel) {
        setPriority(normalizePriority(analysis.urgencyLevel));
      }
      setAiSuggestionAvailable(Boolean(analysis));
    } catch (error) {
      console.warn('Automatic classification unavailable', error);
    } finally {
      setClassificationLoading(false);
      goToStep(2);
    }
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
    [1, 2, 3, 4].forEach((stepId) => {
      Object.assign(allErrors, validateStep(stepId));
    });

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);

      const firstInvalidStep = [1, 2, 3, 4].find((stepId) => (
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

  const resetForm = () => {
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
    setAiSuggestionAvailable(false);
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
              className="btn admin-primary-action rounded-2xl"
            >
              <Lucide.ListChecks size={16} aria-hidden="true" />
              Xem phản ánh của tôi
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn admin-secondary-action rounded-2xl"
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
    <main className="space-y-4 text-base-content">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Gửi phản ánh
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/60">
            Cung cấp thông tin rõ ràng để phản ánh được chuyển đúng đơn vị và xử lý nhanh hơn.
          </p>
        </div>

        <Link to="/tickets" className="btn admin-secondary-action rounded-2xl">
          <Lucide.ArrowLeft size={16} aria-hidden="true" />
          Phản ánh của tôi
        </Link>
      </header>

      <nav
        className="sticky top-0 z-30 rounded-[22px] border border-base-300 bg-base-100/95 p-2.5 shadow-sm backdrop-blur sm:p-3"
        aria-label="Tiến trình gửi phản ánh"
      >
        <ol className="grid gap-2 sm:grid-cols-4">
          {STEPS.map(({ id, label, icon: Icon }) => {
            const isCurrent = step === id;
            const isComplete = stepCompletion[id];

            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    const previousStepsComplete = STEPS
                      .filter((item) => item.id < id)
                      .every((item) => stepCompletion[item.id]);

                    if (id <= step || previousStepsComplete) {
                      goToStep(id);
                    }
                  }}
                  disabled={
                    id > step &&
                    !STEPS
                      .filter((item) => item.id < id)
                      .every((item) => stepCompletion[item.id])
                  }
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    isCurrent
                      ? 'border-primary/45 bg-primary/8 text-primary'
                      : isComplete
                        ? 'border-success/25 bg-success/5 text-base-content'
                        : 'border-transparent bg-base-200/45 text-base-content/40'
                  } disabled:cursor-not-allowed`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isCurrent
                      ? 'bg-primary text-primary-content'
                      : isComplete
                        ? 'bg-success/12 text-success'
                        : 'bg-base-300 text-base-content/35'
                  }`} aria-hidden="true">
                    {isComplete && !isCurrent ? <Lucide.Check size={15} /> : <Icon size={15} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">
                      Bước {id}
                    </span>
                    <strong className="mt-0.5 block truncate text-sm font-semibold">
                      {label}
                    </strong>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

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

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article ref={formStageRef} className="scroll-mt-28 overflow-hidden rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
          {step === 1 ? (
            <section aria-labelledby="description-step-title">
              <header className="border-b border-base-300 px-5 py-3.5 sm:px-6">
                <h2 id="description-step-title" className="text-lg font-semibold">
                  Bạn đang gặp vấn đề gì?
                </h2>
                <p className="mt-1 text-xs leading-5 text-base-content/50">
                  Nêu ngắn gọn vấn đề và mô tả mức độ ảnh hưởng thực tế.
                </p>
              </header>

              <div className="space-y-4 p-5 sm:p-6">
                <label className="block">
                  <span className="text-sm font-semibold">Tiêu đề phản ánh</span>
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
                    className={`mt-2 h-11 w-full rounded-xl border bg-base-100 px-3.5 text-sm outline-none transition placeholder:text-base-content/35 focus:ring-2 ${
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
                  <span className="text-sm font-semibold">Mô tả chi tiết</span>
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
                    className={`mt-2 min-h-[150px] w-full resize-y rounded-xl border bg-base-100 px-3.5 py-3 text-sm leading-6 outline-none transition placeholder:text-base-content/35 focus:ring-2 ${
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

                <aside className="rounded-2xl border border-info/20 bg-info/5 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info" aria-hidden="true">
                      <Lucide.Lightbulb size={16} />
                    </span>
                    <p className="pt-1 text-xs leading-5 text-base-content/60">
                      <strong className="font-semibold text-base-content">Gợi ý:</strong>{' '}
                      Nêu dấu hiệu cụ thể, thời điểm phát hiện và mức độ ảnh hưởng đến người dân.
                    </p>
                  </div>
                </aside>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby="classification-step-title">
              <header className="border-b border-base-300 px-5 py-3.5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 id="classification-step-title" className="text-lg font-semibold">
                      Phân loại phản ánh
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-base-content/50">
                      Chọn nhóm dịch vụ và mức độ ảnh hưởng phù hợp.
                    </p>
                  </div>
                  {aiSuggestionAvailable ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
                      <Lucide.Sparkles size={13} aria-hidden="true" />
                      Đã có gợi ý tự động
                    </span>
                  ) : null}
                </div>
              </header>

              <div className="space-y-6 p-5 sm:p-6">
                <label className="block">
                  <span className="text-sm font-semibold">Danh mục</span>
                  <span className="ml-1 text-error">*</span>
                  <select
                    ref={categoryFieldRef}
                    value={categoryId}
                    onChange={(event) => {
                      setCategoryId(event.target.value);
                      clearFieldError('categoryId');
                    }}
                    disabled={categoriesLoading}
                    aria-invalid={Boolean(fieldErrors.categoryId)}
                    aria-describedby={fieldErrors.categoryId ? 'category-error' : undefined}
                    className={`mt-2 h-11 w-full rounded-xl border bg-base-100 px-3.5 text-sm font-medium outline-none transition focus:ring-2 ${
                      fieldErrors.categoryId
                        ? 'border-error focus:border-error focus:ring-error/15'
                        : 'border-base-300 focus:border-primary focus:ring-primary/15'
                    }`}
                  >
                    <option value="">
                      {categoriesLoading ? 'Đang tải danh mục...' : 'Chọn danh mục phản ánh'}
                    </option>
                    {categories.map((category) => (
                      <option key={getCategoryId(category)} value={getCategoryId(category)}>
                        {getCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.categoryId ? (
                    <span id="category-error" className="mt-1.5 block text-xs font-medium text-error" role="alert">
                      {fieldErrors.categoryId}
                    </span>
                  ) : null}
                  {!categoriesLoading && categories.length === 0 ? (
                    <span className="mt-2 block text-xs text-error">
                      Chưa tải được danh sách danh mục. Vui lòng thử lại sau.
                    </span>
                  ) : null}
                </label>

                <fieldset
                  ref={priorityFieldRef}
                  tabIndex={-1}
                  aria-invalid={Boolean(fieldErrors.priority)}
                  aria-describedby={fieldErrors.priority ? 'priority-error' : undefined}
                  className={`rounded-2xl outline-none ${fieldErrors.priority ? 'ring-2 ring-error/15' : ''}`}
                >
                  <legend className="text-sm font-semibold">
                    Mức độ ảnh hưởng <span className="text-error">*</span>
                  </legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {PRIORITY_OPTIONS.map((option) => {
                      const PriorityIcon = option.icon;
                      const selected = priority === option.value;

                      return (
                        <label
                          key={option.value}
                          className={`cursor-pointer rounded-2xl border p-4 transition ${
                            selected
                              ? 'border-primary/45 bg-primary/8 ring-2 ring-primary/10'
                              : 'border-base-300 hover:border-primary/30 hover:bg-base-200/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="priority"
                            value={option.value}
                            checked={selected}
                            onChange={(event) => {
                              setPriority(event.target.value);
                              clearFieldError('priority');
                            }}
                            className="sr-only"
                          />
                          <span className="flex items-start gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              selected ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/55'
                            }`} aria-hidden="true">
                              <PriorityIcon size={16} />
                            </span>
                            <span>
                              <strong className="block text-sm font-semibold">{option.label}</strong>
                              <span className="mt-1 block text-xs leading-5 text-base-content/50">
                                {option.description}
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.priority ? (
                    <span id="priority-error" className="mt-2 block text-xs font-medium text-error" role="alert">
                      {fieldErrors.priority}
                    </span>
                  ) : null}
                </fieldset>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section aria-labelledby="location-step-title">
              <header className="border-b border-base-300 px-5 py-3.5 sm:px-6">
                <h2 id="location-step-title" className="text-lg font-semibold">
                  Khu vực và vị trí sự cố
                </h2>
                <p className="mt-1 text-xs leading-5 text-base-content/50">
                  Chọn khu vực đã xảy ra sự cố, sau đó đánh dấu điểm chính xác trên bản đồ.
                </p>
              </header>

              <div className="space-y-5 p-5 sm:p-6">
                <label className="block">
                  <span className="text-sm font-semibold">Khu vực</span>
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
                    className={`mt-2 h-11 w-full rounded-xl border bg-base-100 px-3.5 text-sm font-medium outline-none transition focus:ring-2 ${
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
                    className={`rounded-[24px] border bg-base-100 p-2 outline-none transition ${
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
                        <h3 className="text-sm font-semibold">Có phản ánh tương tự gần vị trí này</h3>
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

          {step === 4 ? (
            <section aria-labelledby="evidence-step-title">
              <header className="border-b border-base-300 px-5 py-3.5 sm:px-6">
                <h2 id="evidence-step-title" className="text-lg font-semibold">
                  Thêm minh chứng
                </h2>
                <p className="mt-1 text-xs leading-5 text-base-content/50">
                  Hình ảnh hoặc video rõ ràng giúp việc xác minh và xử lý nhanh hơn.
                </p>
              </header>

              <div className="space-y-5 p-5 sm:p-6">
                <label
                  ref={attachmentFieldRef}
                  tabIndex={-1}
                  aria-invalid={Boolean(fieldErrors.attachments)}
                  className={`group relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed bg-base-200/30 p-5 text-center outline-none transition hover:bg-primary/5 ${
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
                      <h3 id="selected-evidence-title" className="text-sm font-semibold">
                        Minh chứng đã chọn
                      </h3>
                      <span className="text-xs text-base-content/45">
                        {attachments.length}/{MAX_ATTACHMENT_COUNT} tệp · {formatFileSize(totalAttachmentSize)}/{formatFileSize(MAX_TOTAL_ATTACHMENT_SIZE_BYTES)}
                      </span>
                    </div>

                    <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {attachments.map((attachment) => (
                        <li key={attachment.id} className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
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

          <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-base-300 bg-base-100/95 px-5 py-3.5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              type="button"
              onClick={() => goToStep(Math.max(1, step - 1))}
              disabled={step === 1 || submitting}
              className="btn admin-secondary-action rounded-2xl"
            >
              <Lucide.ArrowLeft size={16} aria-hidden="true" />
              Quay lại
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    handleDescriptionNext();
                    return;
                  }

                  if (validateStepAndFocus(step)) {
                    goToStep(Math.min(4, step + 1));
                  }
                }}
                disabled={classificationLoading}
                className="btn admin-primary-action rounded-2xl"
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
                className="btn admin-primary-action rounded-2xl"
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

        <aside className="sticky top-24 space-y-4">
          <section className="rounded-[24px] border border-base-300 bg-base-100 p-5 shadow-sm" aria-labelledby="submission-summary-title">
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
                  {selectedCategory ? getCategoryLabel(selectedCategory) : 'Chưa chọn'}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-xs text-base-content/45">Mức độ ảnh hưởng</dt>
                <dd className="mt-1 font-medium">
                  {selectedPriority?.label || 'Chưa chọn'}
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
    </main>
  );
};
