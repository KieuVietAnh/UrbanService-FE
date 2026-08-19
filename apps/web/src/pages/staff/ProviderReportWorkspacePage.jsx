import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { LoadingSpinner, ConfirmationModal } from '@urbanmind/shared-ui';
import { canTransitionProviderReportStatus, normalizeProviderReportStatus } from '@urbanmind/shared-api';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import DelightToast from '../../components/delight/DelightToast';
import Badge from '../../components/design-system/Badge';
import { getBadgeIntent } from '../../components/design-system/badgeSemantics';
import Button from '../../components/design-system/Button';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const toLocalDateTimeValue = (date = new Date()) => {
  const pad = (v) => `${v}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatContactDateTime = (value) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Không xác định';
    return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'Không xác định'; }
};

const getProviderReportStatusLabel = (status) => ({
  Reported: 'Đã tiếp nhận',
  InProgress: 'Đang xử lý',
  Done: 'Đã gửi chờ duyệt',
}[normalizeProviderReportStatus(status)] || status || 'Không rõ');

const isSuccessfulCoordinatorContact = (contactResult) => {
  const normalized = String(contactResult || '').trim().toLowerCase();
  if (!normalized) return false;

  if (
    normalized.includes('liên hệ lại') ||
    normalized.includes('lien he lai') ||
    normalized.includes('cần gọi lại') ||
    normalized.includes('can goi lai') ||
    normalized.includes('không') ||
    normalized.includes('khong') ||
    normalized.includes('chưa') ||
    normalized.includes('chua') ||
    normalized.includes('thất bại') ||
    normalized.includes('that bai') ||
    normalized.includes('failed')
  ) {
    return false;
  }

  return (
    normalized.includes('thành công') ||
    normalized.includes('thanh cong') ||
    normalized.includes('đã liên hệ') ||
    normalized.includes('da lien he') ||
    normalized.includes('successful') ||
    normalized.includes('success')
  );
};

/* ─── Step definitions ───────────────────────────────────────────────────── */

const STEPS = [
  { id: 'overview',              label: 'Tổng quan',            icon: Lucide.LayoutDashboard, description: 'Thông tin nhà thầu & cập nhật trạng thái' },
  { id: 'contact-logs',         label: 'Lịch sử liên hệ',      icon: Lucide.Phone,           description: 'Ghi nhận lịch sử liên hệ với nhà thầu'  },
  { id: 'completion-documents', label: 'Minh chứng xử lý',    icon: Lucide.FileText,        description: 'Ảnh và tài liệu xác nhận sau xử lý'  },
  { id: 'resolution',           label: 'Kết quả xử lý',        icon: Lucide.CheckSquare,     description: 'Gửi kết quả xử lý chờ phê duyệt',  requiresInProgress: true },
  { id: 'submitted',            label: 'Chờ phê duyệt',        icon: Lucide.Send,            description: 'Đã gửi — chờ quản lý phê duyệt',    terminal: true },
];

/* ─── Design tokens (inline so only this file changes) ───────────────────── */

const card = {
  borderRadius: '1rem',
  border: '1px solid rgba(203,213,225,0.7)',
  backgroundColor: 'rgba(255,255,255,0.97)',
  boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
};

const fieldLabel = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: '#6b7280',
  marginBottom: '4px',
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Vertical wizard-style progress rail on the left side */
const WizardRail = ({ steps, currentIndex, maxReached, isResolutionSubmitted, canAccessCompletionDocuments, canAccessResolution, onGoTo }) => (
  <nav
    aria-label="Workflow progress"
    style={{
      width: '220px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}
  >
    {steps.map((step, idx) => {
      /* hide terminal step until submitted */
      if (step.terminal && !isResolutionSubmitted) return null;

      const isPast      = idx < currentIndex;
      const isCurrent   = idx === currentIndex;
      const isFuture    = idx > currentIndex && idx <= maxReached;
      const statusLocked = (step.id === 'completion-documents' && !canAccessCompletionDocuments) || (step.requiresInProgress && !canAccessResolution);
      const isLocked    = idx > maxReached || statusLocked || (step.requiresInProgress && !canAccessResolution && idx > currentIndex);
      const isClickable = isPast || isCurrent || isFuture; /* can go back or re-visit reached */

      const Icon = step.icon;
      const circleColor  = isCurrent ? 'var(--brand-primary)' : isPast || isFuture ? 'var(--color-success)' : '#cbd5e1';
      const labelColor   = isCurrent ? '#0f172a' : isPast || isFuture ? '#374151' : '#94a3b8';
      const connColor    = idx < steps.filter(s => !s.terminal || isResolutionSubmitted).length - 1
        ? isPast ? 'var(--brand-primary)' : '#e2e8f0'
        : 'transparent';

      return (
        <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <button
            type="button"
            disabled={isLocked || isClickable === false}
            onClick={() => isClickable && onGoTo(idx)}
            aria-current={isCurrent ? 'step' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.625rem 0.75rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: isCurrent ? 'rgba(11,86,217,0.07)' : 'transparent',
              cursor: isClickable ? 'pointer' : 'default',
              textAlign: 'left',
              transition: 'background 140ms ease',
            }}
          >
            {/* Step circle */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: isLocked ? '#f1f5f9' : circleColor,
                border: isCurrent ? '2px solid var(--brand-primary)' : `2px solid ${circleColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 220ms ease',
              }}
            >
              {isPast ? (
                <Lucide.Check size={14} color="#fff" aria-hidden="true" />
              ) : isLocked ? (
                <Lucide.Lock size={11} color="#94a3b8" aria-hidden="true" />
              ) : (
                <Icon size={13} color={isCurrent ? '#fff' : '#94a3b8'} aria-hidden="true" />
              )}
            </div>

            {/* Step text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: isCurrent ? 700 : 500, color: isLocked ? '#94a3b8' : labelColor, lineHeight: 1.2 }}>
                {step.label}
              </div>
              {isCurrent && (
                <div style={{ fontSize: '0.6875rem', color: '#6b7280', lineHeight: 1.3, marginTop: '1px' }}>
                  {step.description}
                </div>
              )}
              {step.requiresInProgress && !canAccessResolution && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-warning)', fontWeight: 600, lineHeight: 1.3, marginTop: '1px' }}>
                  Yêu cầu trạng thái: Đang xử lý
                </div>
              )}
            </div>
          </button>

          {/* Connector */}
          {idx < STEPS.filter(s => !s.terminal || isResolutionSubmitted).length - 1 && (
            <div style={{ width: '1px', height: '16px', backgroundColor: connColor, marginLeft: '28px', transition: 'background 220ms ease' }} />
          )}
        </div>
      );
    })}
  </nav>
);

/** Section header inside a step */
const SectionHeader = ({ title, sub, action }) => (
  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(203,213,225,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
    <div>
      <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '2px 0 0', lineHeight: 1.45 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

/** Uniform meta field */
const MetaField = ({ label, value, mono }) => (
  <div>
    <div style={fieldLabel}>{label}</div>
    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.3, fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : undefined }}>
      {value || '—'}
    </div>
  </div>
);

/** Step navigation footer — Next / Back */
const StepFooter = ({ currentIndex, totalSteps, onBack, onNext, nextLabel, nextDisabled, nextLoading, nextVariant = 'primary', hideNext = false }) => {
  const isFirst = currentIndex === 0;
  const isLast  = currentIndex === totalSteps - 1;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isFirst ? 'flex-end' : 'space-between',
        padding: '1rem 1.25rem',
        borderTop: '1px solid rgba(203,213,225,0.5)',
        backgroundColor: 'rgba(248,250,252,0.6)',
        borderRadius: '0 0 1rem 1rem',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      {!isFirst && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#475569' }}
        >
          <Lucide.ArrowLeft size={14} />
          Quay lại
        </Button>
      )}
      {!isLast && !hideNext && (
        <Button
          type="button"
          variant={nextVariant === 'primary' ? 'primary' : 'outline'}
          size="sm"
          onClick={onNext}
          disabled={nextDisabled}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          {nextLoading ? <span className="loading loading-spinner loading-xs" /> : null}
          {nextLabel || 'Bước tiếp theo'}
          {!nextLoading && <Lucide.ArrowRight size={14} />}
        </Button>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export const ProviderReportWorkspacePage = () => {
  const { providerReportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const feedbackIdFromState = location.state?.feedbackId || location.state?.feedback?.feedbackId || null;
  const initialReport = location.state?.providerReport || location.state?.report || null;

  /* ── Core state ─────────────────────────────────────────────────────────── */
  const [report,        setReport]        = useState(initialReport);
  const [loading,       setLoading]       = useState(true);

  /* ── Wizard navigation ──────────────────────────────────────────────────── */
  const [stepIndex,     setStepIndex]     = useState(0);
  const [maxReached,    setMaxReached]    = useState(0);
  const [hasHydratedWorkspace, setHasHydratedWorkspace] = useState(false);
  const workspaceStorageKey = `urbanmind-provider-report-workspace-${providerReportId || feedbackIdFromState || 'default'}`;

  /* ── Contact logs ───────────────────────────────────────────────────────── */
  const [contactLogs,         setContactLogs]         = useState([]);
  const [contactLogsLoading,  setContactLogsLoading]  = useState(false);
  const [contactLogsError,    setContactLogsError]    = useState('');
  const [logForm, setLogForm] = useState({ contactMethod: '', contactResult: '', contactNote: '', contactedAt: toLocalDateTimeValue() });
  const [logSaving,     setLogSaving]     = useState(false);
  const [logFormError,  setLogFormError]  = useState('');

  /* ── Completion documents ───────────────────────────────────────────────── */
  const [documents,          setDocuments]          = useState([]);
  const [documentsLoading,   setDocumentsLoading]   = useState(false);
  const [documentsError,     setDocumentsError]     = useState('');
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [uploadError,        setUploadError]        = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedDocumentFile, setSelectedDocumentFile] = useState(null);

  /* ── Resolution ─────────────────────────────────────────────────────────── */
  const [resolutionForm, setResolutionForm] = useState({ resolutionSummary: '', actionTaken: '', resultNote: '' });
  const [resolutionImages,         setResolutionImages]         = useState([]);
  const [submittingResolution,     setSubmittingResolution]     = useState(false);
  const [resolutionError,          setResolutionError]          = useState('');
  const [existingResolutions,      setExistingResolutions]      = useState([]);
  const [resolutionsLoading,       setResolutionsLoading]       = useState(false);
  const [resolutionsError,         setResolutionsError]         = useState('');
  const [confirmingResolutionSubmit, setConfirmingResolutionSubmit] = useState(false);
  const [resolutionPreviewOpen,    setResolutionPreviewOpen]    = useState(false);

  /* ── Status transition actions ───────────────────────────────────────── */
  const [statusUpdating,    setStatusUpdating]    = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const statusTransitionLockRef = useRef(false);

  /* ── Image lightbox ─────────────────────────────────────────────────────── */
  const [selectedImage,      setSelectedImage]      = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!selectedImage && !resolutionPreviewOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [selectedImage, resolutionPreviewOpen]);

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  const [toastOpen,     setToastOpen]     = useState(false);
  const [toastTitle,    setToastTitle]    = useState('');
  const [toastSubtitle, setToastSubtitle] = useState('');
  const openToast = (title, sub) => { setToastTitle(title); setToastSubtitle(sub); setToastOpen(true); };

  const fileInputRef = useRef(null);
  const hasUserChosenStepRef = useRef(false);

  /* ── Derive active step id from index ──────────────────────────────────── */
  const activeStepId = STEPS[stepIndex]?.id ?? 'overview';

  const extractFeedbackId = useCallback((currentReport = report) => {
    return currentReport?.feedbackId || currentReport?.feedback?.feedbackId || currentReport?.feedback?.id || feedbackIdFromState || null;
  }, [feedbackIdFromState, report]);

  /* ── Navigation helpers ─────────────────────────────────────────────────── */
  const goTo = (idx) => {
    const step = STEPS[idx];
    if (!step) return;
    hasUserChosenStepRef.current = true;
    setStepIndex(idx);
    setMaxReached((prev) => Math.max(prev, idx));
  };

  const goNext = () => {
    const currentVisibleIndex = visibleSteps.findIndex((step) => step.id === activeStepId);
    const nextVisibleIndex = Math.min(currentVisibleIndex + 1, visibleSteps.length - 1);
    const targetStep = visibleSteps[nextVisibleIndex];
    if (!targetStep) return;
    const targetGlobalIndex = STEPS.findIndex((step) => step.id === targetStep.id);
    goTo(targetGlobalIndex);
  };
  const goBack = () => {
    const currentVisibleIndex = visibleSteps.findIndex((step) => step.id === activeStepId);
    const prevVisibleIndex = Math.max(currentVisibleIndex - 1, 0);
    const targetStep = visibleSteps[prevVisibleIndex];
    if (!targetStep) return;
    const targetGlobalIndex = STEPS.findIndex((step) => step.id === targetStep.id);
    goTo(targetGlobalIndex);
  };

  /* ════════════════════════════════════════════════════════════════════════
     Data loading (all logic unchanged — only trigger key changes from
     activeTab → activeStepId)
     ════════════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!providerReportId) { if (active) setReport(null); return; }
        const res = await managementFeedbackApi.getProviderReportById(providerReportId, feedbackIdFromState);
        if (active) setReport(res || null);
      } catch (err) { console.error('Failed to load provider report', err); }
      finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [providerReportId, feedbackIdFromState]);

  useEffect(() => {
    if (!providerReportId) return;
    hasUserChosenStepRef.current = false;
    try {
      const raw = window.localStorage.getItem(workspaceStorageKey);
      if (!raw) {
        setHasHydratedWorkspace(true);
        return;
      }
      const parsed = JSON.parse(raw);
      const storedStepId = typeof parsed.stepId === 'string' ? parsed.stepId : '';
      const storedStepIndex = typeof parsed.stepIndex === 'number' && Number.isFinite(parsed.stepIndex) ? parsed.stepIndex : null;
      const storedMaxReached = typeof parsed.maxReached === 'number' && Number.isFinite(parsed.maxReached) ? parsed.maxReached : null;

      if (storedStepId) {
        const restoredIndex = STEPS.findIndex((step) => step.id === storedStepId);
        if (restoredIndex >= 0) {
          setStepIndex(restoredIndex);
        }
      } else if (storedStepIndex !== null) {
        const safeIndex = Math.max(0, Math.min(storedStepIndex, STEPS.length - 1));
        setStepIndex(safeIndex);
      }

      if (storedMaxReached !== null) {
        const safeMaxReached = Math.max(0, Math.min(storedMaxReached, STEPS.length - 1));
        setMaxReached(safeMaxReached);
      }
    } catch (err) {
      console.warn('Failed to restore provider report workspace state', err);
    } finally {
      setHasHydratedWorkspace(true);
    }
  }, [providerReportId, workspaceStorageKey]);

  useEffect(() => {
    if (!providerReportId || !hasHydratedWorkspace) return;
    try {
      window.localStorage.setItem(workspaceStorageKey, JSON.stringify({
        stepId: activeStepId,
        stepIndex,
        maxReached,
        updatedAt: Date.now(),
      }));
    } catch (err) {
      console.warn('Failed to persist provider report workspace state', err);
    }
  }, [providerReportId, workspaceStorageKey, activeStepId, stepIndex, maxReached, hasHydratedWorkspace]);

  useEffect(() => {
    if (report?.resolution) {
      setResolutionForm({
        resolutionSummary: report.resolution.resolutionSummary || report.resolution.summary || '',
        actionTaken: report.resolution.actionTaken || '',
        resultNote: report.resolution.resultNote || report.resolution.note || report.resolution.result || '',
      });
    }
  }, [report]);

  useEffect(() => {
    const load = async () => {
      if (!providerReportId || activeStepId !== 'contact-logs') return;
      setContactLogsLoading(true); setContactLogsError('');
      try {
        const logs = await managementFeedbackApi.getProviderReportContactLogs(providerReportId);
        setContactLogs(Array.isArray(logs) ? logs : []);
      } catch (err) { console.error('Failed to load contact logs', err); setContactLogsError('Không thể tải lịch sử liên hệ.'); }
      finally { setContactLogsLoading(false); }
    };
    load();
  }, [providerReportId, activeStepId]);

  useEffect(() => {
    const load = async () => {
      if (!providerReportId || activeStepId !== 'completion-documents') return;
      setDocumentsLoading(true); setDocumentsError('');
      try {
        const res = await managementFeedbackApi.getProviderReportCompletionDocuments(providerReportId);
        setDocuments(Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : []);
      } catch (err) { console.error('Failed to load completion documents', err); setDocumentsError(err?.message || 'Không thể tải tài liệu.'); setDocuments([]); }
      finally { setDocumentsLoading(false); }
    };
    load();
  }, [providerReportId, activeStepId]);

  const loadExistingResolutions = useCallback(async (feedbackId, options = {}) => {
    const fallbackResolution = report?.resolution ? [report.resolution] : [];
    if (!feedbackId && fallbackResolution.length === 0) {
      setExistingResolutions([]);
      return [];
    }

    if (!feedbackId) {
      if (options?.active !== false) {
        setExistingResolutions(fallbackResolution);
      }
      return fallbackResolution;
    }

    if (options?.active !== false) {
      setResolutionsLoading(true);
      setResolutionsError('');
    }

    try {
      const res = await managementFeedbackApi.getResolutions(feedbackId);
      const list = Array.isArray(res) ? res : [];
      if (options?.active !== false) {
        setExistingResolutions(list);
      }
      return list;
    } catch (err) {
      console.error('Failed to load resolutions', err);
      if (options?.active !== false) {
        setResolutionsError(err?.message || 'Không thể tải resolution.');
        setExistingResolutions(fallbackResolution);
      }
      return fallbackResolution;
    } finally {
      if (options?.active !== false) {
        setResolutionsLoading(false);
      }
    }
  }, [report]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const feedbackId = extractFeedbackId(report);
      if (!feedbackId || activeStepId !== 'resolution') return;
      await loadExistingResolutions(feedbackId, { active });
    };
    load();
    return () => { active = false; };
  }, [activeStepId, extractFeedbackId, loadExistingResolutions, report]);

  /* ════════════════════════════════════════════════════════════════════════
     Derived state (unchanged)
     ════════════════════════════════════════════════════════════════════════ */

  const provider        = report?.provider || report?.operator || report?.assignedOperator || {};
  const coordinator     = report?.coordinator || report?.contact || {};
  const providerName    = report?.providerName || provider?.operatorName || provider?.providerName || provider?.name || '—';
  const coordinatorName = report?.coordinatorName || coordinator?.name || coordinator?.contactName || '—';
  const providerPhone   = report?.phoneNumber || coordinator?.phone || provider?.phoneNumber || '—';
  const providerEmail   = report?.email || coordinator?.email || provider?.email || '—';
  const currentStatus   = normalizeProviderReportStatus(report?.status || report?.reportStatus || '');
  const canAccessCompletionDocuments = ['InProgress', 'Done'].includes(currentStatus);
  const canAccessResolution   = ['InProgress', 'Done'].includes(currentStatus);
  const canSubmitResolution   = currentStatus === 'InProgress';
  const isResolutionSubmitted = existingResolutions.length > 0;
  const canReviewContactLogs = ['Reported', 'InProgress', 'Done'].includes(currentStatus);
  const canUploadCompletionDocuments = currentStatus === 'InProgress';

  const statusHistoryItems = (() => {
    const history = Array.isArray(report?.statusHistory)
      ? report.statusHistory.map((item) => ({
          status: normalizeProviderReportStatus(item?.status || item?.newStatus || item?.value || ''),
          updatedAt: item?.updatedAt || item?.changedAt || report?.updatedAt || report?.createdAt || '',
          note: item?.note || item?.comment || '',
        }))
      : [];
    if (history.length > 0) return history;
    return [{ status: currentStatus || 'Assigned', updatedAt: report?.updatedAt || report?.createdAt || '', note: 'Trạng thái hiện tại' }];
  })();

  const sortedContactLogs = [...contactLogs].sort((a, b) => new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime());

  const imageDocuments = documents.filter((d) => {
    const n = String(d?.fileName || d?.name || '').toLowerCase();
    return n.match(/\.(png|jpe?g|gif|webp|svg)$/) || d?.contentType?.includes('image');
  });

  const workflowChecklist = (() => {
    const hasLogs = contactLogs.length > 0;
    const hasDocs = documents.length > 0;
    const isInProgress = ['InProgress', 'Done'].includes(currentStatus);
    const isDone = currentStatus === 'Done';

    return [
      { label: 'Báo cáo nhận', completed: Boolean(report) },
      { label: 'Đã liên hệ điều phối viên', completed: hasLogs || isInProgress || isDone },
      { label: 'Đang xử lý', completed: isInProgress || isDone },
      { label: 'Tài liệu/minh chứng đã có', completed: hasDocs || isResolutionSubmitted || isDone },
      { label: 'Đã gửi kết quả chờ duyệt', completed: isResolutionSubmitted || isDone },
    ];
  })();

  const workflowProgress = Math.round((workflowChecklist.filter((item) => item.completed).length / workflowChecklist.length) * 100);

  const visibleSteps = STEPS;

  const workflowAction = (() => {
    if (isResolutionSubmitted || currentStatus === 'Done') {
      return {
        title: 'Kết quả xử lý đã được gửi',
        description: 'Kết quả xử lý đã được gửi và đang chờ quản lý phê duyệt.',
        actionLabel: 'Xem kết quả xử lý',
        targetStep: 'resolution',
        nextStatus: null,
        disabled: false,
      };
    }

    if (currentStatus === 'InProgress') {
      return {
        title: 'Bước tiếp theo: Gửi kết quả xử lý',
        description: 'Đã liên hệ điều phối viên thành công. Staff có thể bổ sung minh chứng nếu cần, rồi gửi kết quả xử lý để chờ quản lý phê duyệt.',
        actionLabel: 'Gửi kết quả xử lý',
        targetStep: 'resolution',
        nextStatus: null,
        disabled: false,
      };
    }

      return {
        title: 'Bước tiếp theo: Liên hệ điều phối viên',
        description: 'Tạo nhật ký liên hệ điều phối viên. Khi liên hệ thành công, báo cáo sẽ chuyển sang bước xử lý và có thể bổ sung minh chứng trước khi gửi kết quả.',
        actionLabel: 'Tạo nhật ký liên hệ',
        targetStep: 'contact-logs',
        nextStatus: null,
        disabled: false,
      };
  })();

  const totalVisible = visibleSteps.length;

  useEffect(() => {
    if (!visibleSteps.length) return;
    if (hasUserChosenStepRef.current) return;

    let fallbackStepId = 'overview';
    if (isResolutionSubmitted || currentStatus === 'Done') {
      fallbackStepId = 'submitted';
    } else if (currentStatus === 'InProgress') {
      fallbackStepId = 'resolution';
    } else if (currentStatus === 'Reported') {
      fallbackStepId = 'contact-logs';
    }

    if (activeStepId === fallbackStepId) return;

    const fallbackGlobalIndex = STEPS.findIndex((step) => step.id === fallbackStepId);
    const fallbackSafeIndex = fallbackGlobalIndex >= 0 ? fallbackGlobalIndex : 0;
    setStepIndex(fallbackSafeIndex);
    setMaxReached((prev) => Math.max(prev, fallbackSafeIndex));
  }, [activeStepId, currentStatus, isResolutionSubmitted, visibleSteps]);

  /* ════════════════════════════════════════════════════════════════════════
     Event handlers (all logic unchanged)
     ════════════════════════════════════════════════════════════════════════ */

  const openImagePreview = (doc, index) => {
    const url = doc?.fileUrl || doc?.url || doc?.downloadUrl || doc?.documentUrl;
    if (!url) return;
    const imgIdx = imageDocuments.findIndex((item) => {
      const n1 = String(item?.fileName || item?.name || '').toLowerCase();
      const n2 = String(doc?.fileName || doc?.name || '').toLowerCase();
      return n1 === n2 && (item?.fileUrl || item?.url || item?.downloadUrl || item?.documentUrl) === url;
    });
    setSelectedImage(url);
    setSelectedImageIndex(imgIdx >= 0 ? imgIdx : index);
  };

  const closeImagePreview   = () => { setSelectedImage(null); setSelectedImageIndex(0); };
  const showImagePreview    = (dir) => {
    if (!imageDocuments.length) return;
    const next = (selectedImageIndex + dir + imageDocuments.length) % imageDocuments.length;
    const url  = imageDocuments[next]?.fileUrl || imageDocuments[next]?.url || imageDocuments[next]?.downloadUrl || imageDocuments[next]?.documentUrl;
    if (url) { setSelectedImage(url); setSelectedImageIndex(next); }
  };

  const handleDocumentDownload = (doc) => {
    const url = doc?.fileUrl || doc?.url || doc?.downloadUrl || doc?.documentUrl;
    if (!url) { setUploadError('Không có đường dẫn tải xuống.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDocumentFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedDocumentFile(file);
    setUploadError('');
  };

  const handleDocumentSubmit = async (event) => {
    event.preventDefault();
    const file = selectedDocumentFile;
    const desc = String(documentDescription || '').trim();

    if (!file) {
      setUploadError('Vui lòng chọn một tệp để tải lên.');
      return;
    }

    if (!desc) {
      setUploadError('Vui lòng nhập mô tả cho tài liệu.');
      return;
    }

    const ext = String(file.name || '').split('.').pop()?.toLowerCase();
    const supported = ['jpg', 'jpeg', 'png', 'pdf'];
    const supportedMime = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!supported.includes(ext) && !supportedMime.includes(file.type)) {
      setUploadError('Chỉ hỗ trợ tệp JPG, PNG hoặc PDF.');
      return;
    }

    setUploadingDocuments(true);
    setUploadError('');

    try {
      await managementFeedbackApi.uploadCompletionDocument(providerReportId, file, { fileName: file.name, description: desc });
      const res = await managementFeedbackApi.getProviderReportCompletionDocuments(providerReportId);
      setDocuments(Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : []);
      setDocumentDescription('');
      setSelectedDocumentFile(null);
      openToast('Đã tải minh chứng', 'Ảnh hoặc tài liệu minh chứng đã được lưu thành công.');
    } catch (err) {
      console.error('Upload failed', err);
      setUploadError(err?.message || 'Không thể tải lên tài liệu.');
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleResolutionImagesChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setResolutionImages((prev) => [...prev, ...files.map((f) => ({ fileName: f.name, previewUrl: URL.createObjectURL(f), file: f }))]);
    event.target.value = '';
  };

  const performStatusTransition = async (nextStatus, note = null, { auto = false } = {}) => {
    if (statusTransitionLockRef.current) return null;
    if (!nextStatus) return null;
    if (!auto && !canTransitionProviderReportStatus(currentStatus, nextStatus)) {
      setStatusUpdateError('Chuyển trạng thái không hợp lệ.');
      return null;
    }

    statusTransitionLockRef.current = true;
    setStatusUpdating(true);
    setStatusUpdateError('');

    try {
      hasUserChosenStepRef.current = false;
      await managementFeedbackApi.updateProviderReportStatus(providerReportId, { status: nextStatus, note: note || null });
      let refreshed = null;
      try {
        refreshed = await managementFeedbackApi.getProviderReportById(providerReportId);
      } catch (refreshErr) {
        console.warn('Provider report refresh failed after status update', refreshErr);
      }
      if (refreshed) {
        setReport(refreshed);
      } else {
        setReport((prev) => prev ? { ...prev, status: nextStatus } : prev);
      }
      if (auto) {
        openToast('Tự động cập nhật trạng thái', `Trạng thái đã chuyển sang ${nextStatus}.`);
      } else {
        openToast('Đã cập nhật trạng thái', 'Trạng thái báo cáo xử lý đã được cập nhật.');
      }
      return refreshed;
    } catch (err) {
      const message = err?.message || 'Không thể cập nhật trạng thái.';
      if (auto) {
        openToast('Tự động chuyển trạng thái thất bại', message);
      } else {
        setStatusUpdateError(message);
      }
      return null;
    } finally {
      statusTransitionLockRef.current = false;
      setStatusUpdating(false);
    }
  };

  const handleWorkflowActionClick = async () => {
    if (workflowAction.nextStatus) {
      if (!canTransitionProviderReportStatus(currentStatus, workflowAction.nextStatus)) {
        setStatusUpdateError('Chỉ cho phép chuyển tiến theo hướng trước.');
        return;
      }
      await performStatusTransition(workflowAction.nextStatus, 'Workflow action', { auto: false });
      return;
    }

    if (workflowAction.targetStep === 'resolution' && currentStatus === 'InProgress' && !isResolutionSubmitted) {
      openToast('Sẵn sàng gửi kết quả xử lý', 'Điền nội dung kết quả xử lý ở bước tiếp theo.');
    }

    const targetIndex = STEPS.findIndex((step) => step.id === workflowAction.targetStep);
    if (targetIndex >= 0) {
      hasUserChosenStepRef.current = true;
      goTo(targetIndex);
    }
  };

  const handleLogInputChange = (key, value) => setLogForm((prev) => ({ ...prev, [key]: value }));
  const handleSaveLog = async (event) => {
    event.preventDefault(); setLogFormError('');
    const method = String(logForm.contactMethod || '').trim();
    const result = String(logForm.contactResult || '').trim();
    const at     = String(logForm.contactedAt   || '').trim();
    const shouldAutoTransition = currentStatus === 'Reported' && isSuccessfulCoordinatorContact(result);
    if (!method || !result || !at) { setLogFormError('Vui lòng điền phương thức, kết quả và thời điểm liên hệ.'); return; }
    setLogSaving(true);
    try {
      const created = await managementFeedbackApi.createProviderReportContactLog(providerReportId, { contactMethod: method, contactResult: result, contactNote: String(logForm.contactNote || '').trim() || null, contactedAt: at });
      setContactLogs((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      openToast(
        'Đã lưu lịch sử liên hệ',
        isSuccessfulCoordinatorContact(result)
          ? 'Liên hệ thành công. Báo cáo sẽ được chuyển sang trạng thái Đang xử lý để tiếp tục quy trình.'
          : 'Kết quả cần liên hệ lại/chưa thành công. Chưa thể Submit Resolution.'
      );
      setLogForm({ contactMethod: '', contactResult: '', contactNote: '', contactedAt: toLocalDateTimeValue() });
      if (shouldAutoTransition) {
        await performStatusTransition('InProgress', 'Tự động chuyển trạng thái sau khi tạo nhật ký liên hệ điều phối viên đầu tiên.', { auto: true });
      }
    } catch (err) { console.error('Save log failed', err); setLogFormError(err?.message || 'Không thể lưu bản ghi liên hệ.'); }
    finally { setLogSaving(false); }
  };

  const handleResolutionFormSubmit = (event) => {
    event.preventDefault();
    const summary = String(resolutionForm.resolutionSummary || '').trim();
    const action  = String(resolutionForm.actionTaken       || '').trim();
    if (!summary || !action) {
      setResolutionError('Vui lòng nhập Tóm tắt kết quả và Hành động đã thực hiện.');
      return;
    }
    setResolutionError('');
    setConfirmingResolutionSubmit(true);
  };

  const handleSubmitResolution = async () => {
    const summary = String(resolutionForm.resolutionSummary || '').trim();
    const action  = String(resolutionForm.actionTaken       || '').trim();
    const result  = String(resolutionForm.resultNote        || '').trim();
    if (!summary || !action) { setResolutionError('Vui lòng nhập Tóm tắt kết quả và Hành động đã thực hiện.'); return; }
    setSubmittingResolution(true); setResolutionError('');
    try {
      const feedbackId = extractFeedbackId(report);
      if (!feedbackId) {
        throw new Error('Không xác định được feedbackId của báo cáo để gửi kết quả xử lý.');
      }

      await managementFeedbackApi.submitResolution(feedbackId, {
        status: 'SubmittedForApproval',
        resolutionSummary: summary,
        actionTaken: action,
        resultNote: result,
        completionImages: resolutionImages.map((img) => ({ fileName: img.fileName, previewUrl: img.previewUrl })),
      });

      const refreshedResolutions = await loadExistingResolutions(feedbackId, { active: true });
      if (Array.isArray(refreshedResolutions) && refreshedResolutions.length > 0) {
        setExistingResolutions(refreshedResolutions);
      } else {
        setExistingResolutions([{ resolutionSummary: summary, actionTaken: action, resultNote: result, status: 'SubmittedForApproval', createdByStaffUserName: 'You', resolvedAt: new Date().toISOString() }]);
      }
      openToast('Đã gửi kết quả xử lý', 'Kết quả xử lý đã được gửi chờ quản lý phê duyệt.');
      const submittedIdx = STEPS.findIndex((s) => s.id === 'submitted');
      goTo(submittedIdx);
    } catch (err) { console.error('Submit resolution failed', err); setResolutionError(err?.message || 'Không thể gửi kết quả xử lý.'); }
    finally { setSubmittingResolution(false); setConfirmingResolutionSubmit(false); }
  };

  /* ════════════════════════════════════════════════════════════════════════
     Loading / not-found
     ════════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 1rem' }}><LoadingSpinner /></div>;
  }

  if (!report) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ ...card, padding: '3rem 1.5rem', textAlign: 'center' }}>
          <Lucide.FileX size={32} style={{ margin: '0 auto 1rem', color: '#94a3b8' }} aria-hidden="true" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Báo cáo xử lý không tìm thấy</h2>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>Không thể tìm thấy báo cáo tương ứng với id cung cấp.</p>
          <div style={{ marginTop: '1.25rem' }}>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Quay lại</Button>
          </div>
        </div>
      </div>
    );
  }

  const feedbackId = report.feedbackId || report.feedback?.feedbackId || '';

  /* ════════════════════════════════════════════════════════════════════════
     Current step index inside visibleSteps
     ════════════════════════════════════════════════════════════════════════ */
  const visibleStepIndex = visibleSteps.findIndex((s) => s.id === activeStepId);

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="provider-report-workspace-page"
      style={{ minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section
        className="admin-page-hero"
        style={{
          borderRadius: '1.5rem',
          border: '1px solid rgba(147,197,253,0.45)',
          background: 'linear-gradient(115deg, rgba(239,246,255,0.98), rgba(236,254,255,0.92) 48%, rgba(219,234,254,0.96))',
          padding: '1.5rem 1.75rem',
          boxShadow: '0 14px 34px rgba(37,99,235,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 10px 22px rgba(37,99,235,0.2)' }}>
              <Lucide.ClipboardCheck size={27} aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2563eb' }}>Báo cáo xử lý</div>
              <h1 style={{ margin: '0.2rem 0 0.35rem', fontSize: 'clamp(1.65rem, 2.4vw, 2.35rem)', lineHeight: 1.1, fontWeight: 850, color: '#0f172a' }}>
                Báo cáo #{report.providerReportId || report.id || providerReportId}
              </h1>
              <p style={{ margin: 0, maxWidth: '780px', fontSize: '0.92rem', lineHeight: 1.55, color: '#64748b' }}>
                Theo dõi tiến độ của đơn vị xử lý, lưu ảnh/tài liệu minh chứng hoàn thành và gửi kết quả để quản lý phê duyệt.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <Badge intent={getBadgeIntent(currentStatus)} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]">
              {getProviderReportStatusLabel(currentStatus)}
            </Badge>
            {feedbackId && (
              <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.82)' }}>
                <Lucide.ArrowLeft size={14} /> Mở phản ánh
              </Button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(148,163,184,0.22)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
          <MetaField label="Nhà thầu" value={providerName} />
          <MetaField label="Điều phối viên" value={coordinatorName} />
          <MetaField label="Liên hệ" value={[providerPhone !== '—' ? providerPhone : null, providerEmail !== '—' ? providerEmail : null].filter(Boolean).join(' · ') || '—'} />
          <MetaField label="Ngày phân công" value={report.assignedAt || report.assignedDate || report.createdAt ? formatContactDateTime(report.assignedAt || report.assignedDate || report.createdAt) : '—'} />
          {feedbackId && <MetaField label="Mã phản ánh" value={feedbackId} mono />}
        </div>
      </section>

      {/* ── Workspace body: rail + step content ─────────────────────────── */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* LEFT: wizard rail */}
        <div
          style={{ ...card, padding: '1rem 0.75rem', flexShrink: 0, position: 'sticky', top: '1rem' }}
          className="hidden lg:block"
        >
          <WizardRail
            steps={visibleSteps}
            currentIndex={visibleStepIndex}
            maxReached={maxReached}
            isResolutionSubmitted={isResolutionSubmitted}
            canAccessCompletionDocuments={canAccessCompletionDocuments}
            canAccessResolution={canAccessResolution}
            onGoTo={(idx) => {
              const globalIdx = STEPS.findIndex((s) => s.id === visibleSteps[idx].id);
              hasUserChosenStepRef.current = true;
              setStepIndex(globalIdx);
            }}
          />
        </div>

        {/* RIGHT: step content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Mobile step indicator */}
          <div className="lg:hidden" style={{ ...card, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Bước {visibleStepIndex + 1} / {totalVisible}
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
              {visibleSteps[visibleStepIndex]?.label}
            </span>
          </div>

          <section style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563eb' }}>QUY TRÌNH XỬ LÝ</div>
                <h2 style={{ margin: '0.25rem 0 0.35rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Theo dõi tiến trình xử lý theo từng bước</h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.55 }}>Theo dõi từng bước từ lúc tiếp nhận báo cáo đến khi có minh chứng hoàn thành và gửi kết quả chờ phê duyệt.</p>
              </div>
              <div style={{ minWidth: '180px', padding: '0.75rem 0.9rem', backgroundColor: '#f8fafc', border: '1px solid rgba(203,213,225,0.7)', borderRadius: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  <span>Tiến độ</span>
                  <span>{workflowProgress}%</span>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', backgroundColor: '#e2e8f0', marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ width: `${workflowProgress}%`, height: '100%', backgroundColor: 'var(--brand-primary)', borderRadius: '999px' }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '0.25rem 1.25rem 1.25rem' }}>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {workflowChecklist.map((step, index) => (
                  <div key={step.label} style={{ padding: '0.8rem 0.9rem', borderRadius: '0.95rem', border: `1px solid ${step.completed ? 'rgba(4,120,87,0.2)' : 'rgba(203,213,225,0.75)'}`, backgroundColor: step.completed ? 'rgba(236,253,245,0.8)' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: step.completed ? '#047857' : '#334155' }}>
                      {step.completed ? <Lucide.CheckCircle2 size={15} /> : <Lucide.Circle size={15} />}
                      <span>{step.label}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>{index + 1}. {step.completed ? 'Đã hoàn tất' : 'Chưa hoàn tất'}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ NEXT ACTION CARD ══════════════════════════════════════════════ */}
          <section style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563eb' }}>Bước tiếp theo</div>
                <h3 style={{ margin: '0.25rem 0 0.35rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{workflowAction.title}</h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.55 }}>{workflowAction.description}</p>
                {workflowAction.missingRequirement && (
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600, lineHeight: 1.5 }}>
                    {workflowAction.missingRequirement}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleWorkflowActionClick}
                  disabled={statusUpdating || workflowAction.disabled}
                >
                  {workflowAction.actionLabel}
                </Button>
              </div>
            </div>
          </section>

          {/* ══ STEP 1: OVERVIEW ══════════════════════════════════════════ */}
          {activeStepId === 'overview' && (
            <section aria-labelledby="step-overview-title" style={{ ...card, overflow: 'hidden' }}>
              <SectionHeader
                title="Tổng quan & Cập nhật trạng thái"
                sub="Xem lại thông tin nhà thầu và cập nhật trạng thái báo cáo trước khi tiếp tục."
                action={
                  <Badge intent={getBadgeIntent(currentStatus)} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]">
                    {getProviderReportStatusLabel(currentStatus)}
                  </Badge>
                }
              />

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {statusUpdateError && (
                  <ErrorAlert message={statusUpdateError} onClose={() => setStatusUpdateError('')} />
                )}

                <div style={{ padding: '0.875rem 1rem', borderRadius: '0.875rem', backgroundColor: 'rgba(248,250,252,0.95)', border: '1px solid rgba(203,213,225,0.8)', color: '#475569', fontSize: '0.875rem', lineHeight: 1.55 }}>
                  Sử dụng nút hành động ở thẻ workflow phía trên để tiến trình báo cáo. Không cần mở trang quản lý trạng thái riêng.
                </div>

                {/* Status history timeline */}
                <div style={{ borderTop: '1px solid rgba(203,213,225,0.5)', paddingTop: '1rem' }}>
                  <div style={{ ...fieldLabel, marginBottom: '0.875rem' }}>Lịch sử trạng thái</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {statusHistoryItems.map((item, idx) => (
                      <div key={`${item.status}-${idx}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '14px', flexShrink: 0, paddingTop: '3px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: idx === 0 ? 'var(--brand-primary)' : '#cbd5e1', flexShrink: 0 }} />
                          {idx < statusHistoryItems.length - 1 && <div style={{ width: '1px', flex: 1, minHeight: '24px', backgroundColor: '#e2e8f0', marginTop: '3px' }} />}
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', paddingBottom: idx < statusHistoryItems.length - 1 ? '0.75rem' : 0 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{getProviderReportStatusLabel(item.status)}</div>
                            {item.note && <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '1px' }}>{item.note}</div>}
                          </div>
                          {item.updatedAt && <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }}>{formatContactDateTime(item.updatedAt)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <StepFooter
                currentIndex={visibleStepIndex}
                totalSteps={totalVisible}
                onBack={goBack}
                onNext={goNext}
                nextLabel={currentStatus === 'Reported' ? 'Tiếp tục: Lịch sử liên hệ' : 'Xem lịch sử liên hệ'}
              />
            </section>
          )}

          {/* ══ STEP 2: CONTACT LOGS ══════════════════════════════════════ */}
          {activeStepId === 'contact-logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Log list */}
              <section aria-labelledby="contact-logs-title" style={{ ...card, overflow: 'hidden' }}>
                <SectionHeader
                  title="Lịch sử liên hệ"
                  sub="Lịch sử liên hệ với nhà thầu có thể xem lại bất cứ lúc nào."
                  action={
                    sortedContactLogs.length > 0 ? (
                      <span style={{ padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid rgba(37,99,235,0.15)', lineHeight: 1.8 }}>
                        {sortedContactLogs.length} bản ghi
                      </span>
                    ) : null
                  }
                />
                <div style={{ padding: '1rem 1.25rem' }}>
                  {contactLogsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><LoadingSpinner /></div>
                  ) : contactLogsError ? (
                    <ErrorAlert message={contactLogsError} onClose={() => setContactLogsError('')} />
                  ) : sortedContactLogs.length === 0 ? (
                    <div style={{ borderRadius: '0.875rem', border: '1px dashed rgba(203,213,225,0.9)', backgroundColor: 'rgba(248,250,252,0.7)', padding: '2.5rem 1rem', textAlign: 'center' }}>
                      <Lucide.Phone size={24} style={{ margin: '0 auto 0.625rem', color: '#94a3b8' }} aria-hidden="true" />
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Chưa có bản ghi liên hệ nào.</div>
                      <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '2px' }}>Thêm nhật ký liên hệ mới trong biểu mẫu bên dưới.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {sortedContactLogs.map((log) => (
                        <article key={log.contactLogId || `${log.contactedAt}-${log.contactMethod}`} style={{ borderRadius: '0.875rem', border: '1px solid rgba(203,213,225,0.7)', backgroundColor: 'rgba(248,250,252,0.6)', padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{formatContactDateTime(log.contactedAt)}</div>
                              <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '2px' }}>{log.contactedByUserName || 'Không rõ'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flexShrink: 0 }}>
                              {[log.contactMethod, log.contactResult].filter(Boolean).map((tag, ti) => (
                                <span key={ti} style={{ padding: '0.2rem 0.55rem', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, backgroundColor: ti === 0 ? 'rgba(248,250,252,0.9)' : 'var(--color-info-bg)', border: `1px solid ${ti === 0 ? 'rgba(203,213,225,0.8)' : 'rgba(37,99,235,0.12)'}`, color: ti === 0 ? '#475569' : 'var(--color-info)', lineHeight: 1.8 }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          {log.contactNote && (
                            <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: '0.625rem', backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(203,213,225,0.5)', fontSize: '0.8125rem', color: '#374151', lineHeight: 1.5 }}>
                              {log.contactNote}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Add log form */}
              <section aria-labelledby="add-log-title" style={{ ...card, overflow: 'hidden' }}>
                <SectionHeader title="Ghi nhật ký liên hệ" sub={canReviewContactLogs ? 'Bạn có thể xem lại và cập nhật nội dung liên hệ ở bước này.' : 'Ghi lại chi tiết cuộc gọi, email hoặc tin nhắn với nhà thầu.'} />
                <div style={{ padding: '1rem 1.25rem' }}>
                  {logFormError && <div style={{ marginBottom: '0.75rem' }}><ErrorAlert message={logFormError} onClose={() => setLogFormError('')} /></div>}
                  {canReviewContactLogs && currentStatus !== 'Reported' ? (
                    <div style={{ borderRadius: '0.75rem', border: '1px solid rgba(16,185,129,0.18)', backgroundColor: 'rgba(236,253,245,0.65)', padding: '0.65rem 0.8rem', color: '#475569', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                      <Lucide.CheckCircle2 size={14} color='var(--color-success)' aria-hidden='true' />
                      Bước liên hệ đã hoàn tất. Bạn vẫn có thể xem lại các bản ghi phía trên.
                    </div>
                  ) : (
                    <form onSubmit={handleSaveLog} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div style={{ display: 'grid', gap: '0.875rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          <span style={fieldLabel}>Phương thức liên hệ <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                          <input value={logForm.contactMethod} onChange={(e) => handleLogInputChange('contactMethod', e.target.value)} placeholder="Gọi điện / Email / Tin nhắn" className="input input-bordered w-full" required />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          <span style={fieldLabel}>Kết quả <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                          <select value={logForm.contactResult} onChange={(e) => handleLogInputChange('contactResult', e.target.value)} className="select select-bordered w-full" required>
                            <option value="">Chọn kết quả liên hệ</option>
                            <option value="Đã liên hệ thành công">Đã liên hệ thành công</option>
                            <option value="Cần liên hệ lại">Cần liên hệ lại</option>
                            <option value="Không có phản hồi">Không có phản hồi</option>
                            <option value="Liên hệ thất bại">Liên hệ thất bại</option>
                          </select>
                        </label>
                      </div>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span style={fieldLabel}>Nội dung liên hệ</span>
                        <textarea value={logForm.contactNote} onChange={(e) => handleLogInputChange('contactNote', e.target.value)} placeholder="Ghi chú thêm về cuộc gọi hoặc email..." rows={3} className="textarea textarea-bordered w-full" />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span style={fieldLabel}>Thời điểm liên hệ <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                        <input type="datetime-local" value={logForm.contactedAt} onChange={(e) => handleLogInputChange('contactedAt', e.target.value)} className="input input-bordered w-full" required />
                      </label>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="outline" size="sm" disabled={logSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          {logSaving ? <span className="loading loading-spinner loading-xs" /> : <Lucide.Plus size={13} />}
                          {logSaving ? 'Đang lưu...' : 'Lưu liên hệ'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                <StepFooter
                  currentIndex={visibleStepIndex}
                  totalSteps={totalVisible}
                  onBack={goBack}
                  onNext={goNext}
                  nextLabel={currentStatus === 'Reported' ? 'Tiếp tục: Minh chứng xử lý' : 'Xem minh chứng xử lý'}
                  nextDisabled={!canAccessCompletionDocuments}
                  nextVariant={!canAccessCompletionDocuments ? 'ghost' : 'primary'}
                />
              </section>
            </div>
          )}

          {/* ══ STEP 3: COMPLETION DOCUMENTS ═════════════════════════════ */}
          {activeStepId === 'completion-documents' && (
            <section aria-labelledby="docs-title" style={{ ...card, overflow: 'hidden' }}>
              <SectionHeader
                title="Ảnh và tài liệu minh chứng sau xử lý"
                sub={canUploadCompletionDocuments ? 'Tải ảnh hiện trường sau xử lý, biên bản nghiệm thu hoặc tài liệu xác nhận do đơn vị xử lý cung cấp.' : 'Xem lại ảnh và tài liệu minh chứng đã được lưu cho báo cáo xử lý này.'}
                action={canUploadCompletionDocuments ? null : (
                  <Badge intent={getBadgeIntent(currentStatus)} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]">
                    {currentStatus === 'Done' ? 'Đã gửi kết quả' : 'Xem lại'}
                  </Badge>
                )}
              />

              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {canUploadCompletionDocuments ? (
                  <form onSubmit={handleDocumentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.9rem 1rem', borderRadius: '0.95rem', border: '1px solid rgba(59,130,246,0.18)', background: 'rgba(239,246,255,0.72)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '0.75rem', display: 'grid', placeItems: 'center', background: '#fff', color: '#2563eb', flexShrink: 0 }}>
                        <Lucide.Images size={18} aria-hidden="true" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 750, color: '#0f172a' }}>Minh chứng hoàn thành từ đơn vị xử lý</div>
                        <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', lineHeight: 1.5, color: '#64748b' }}>Ưu tiên ảnh hiện trường sau khi khắc phục. Có thể đính kèm thêm PDF biên bản hoặc tài liệu xác nhận.</div>
                      </div>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <span style={fieldLabel}>Mô tả minh chứng <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                      <textarea value={documentDescription} onChange={(e) => setDocumentDescription(e.target.value)} placeholder="Ví dụ: Ảnh mặt đường sau khi sửa chữa hoàn tất..." rows={3} maxLength={1000} className="textarea textarea-bordered w-full" required />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span>Hỗ trợ: JPG, PNG, PDF</span>
                        <span>{documentDescription.trim().length}/1000</span>
                      </div>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" style={{ display: 'none' }} onChange={handleDocumentFileChange} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingDocuments} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Lucide.ImagePlus size={14} /> Chọn ảnh / tài liệu
                        </Button>
                        <div style={{ minHeight: '1.1rem', color: selectedDocumentFile ? '#0f172a' : '#6b7280', fontSize: '0.9rem' }}>
                          {selectedDocumentFile ? selectedDocumentFile.name : 'Chưa chọn tệp nào'}
                        </div>
                      </div>

                      <Button type="submit" variant="primary" size="sm" disabled={uploadingDocuments} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', alignSelf: 'flex-start' }}>
                        {uploadingDocuments ? <span className="loading loading-spinner loading-xs" /> : <Lucide.CheckCircle2 size={14} />}
                        {uploadingDocuments ? 'Đang tải lên...' : 'Tải minh chứng lên'}
                      </Button>
                    </div>

                    {uploadError && <ErrorAlert message={uploadError} onClose={() => setUploadError('')} />}
                  </form>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <span style={fieldLabel}>Mô tả <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(tùy chọn)</span></span>
                    <textarea value={documentDescription} onChange={(e) => setDocumentDescription(e.target.value)} placeholder="Thêm mô tả cho bằng chứng hoàn thành..." rows={2} maxLength={1000} className="textarea textarea-bordered w-full" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <span>Hỗ trợ: JPG, PNG, PDF</span>
                      <span>{documentDescription.trim().length}/1000</span>
                    </div>
                  </label>
                )}

                {!canUploadCompletionDocuments && (
                  <div style={{ borderRadius: '0.875rem', border: '1px solid rgba(203,213,225,0.9)', backgroundColor: 'rgba(248,250,252,0.7)', padding: '1rem 1rem', color: '#475569', lineHeight: 1.6 }}>
                    Bước minh chứng đã hoàn tất. Bạn có thể xem lại ảnh và tài liệu bên dưới để đối chiếu khi cần.
                  </div>
                )}

                {documentsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><LoadingSpinner /></div>
                ) : documentsError ? (
                  <ErrorAlert message={documentsError} onClose={() => setDocumentsError('')} />
                ) : documents.length === 0 ? (
                  <div style={{ borderRadius: '0.875rem', border: '1px dashed rgba(203,213,225,0.9)', backgroundColor: 'rgba(248,250,252,0.7)', padding: '3rem 1rem', textAlign: 'center' }}>
                    <Lucide.FileText size={28} style={{ margin: '0 auto 0.625rem', color: '#94a3b8' }} aria-hidden="true" />
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Chưa có ảnh hoặc tài liệu minh chứng nào được tải lên.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.875rem' }}>
                    {documents.map((doc, index) => {
                      const url = doc?.fileUrl || doc?.url || doc?.downloadUrl || doc?.documentUrl || '';
                      const fileName = doc?.fileName || doc?.name || `Minh chứng ${index + 1}`;
                      const contentType = String(doc?.contentType || doc?.mimeType || '').toLowerCase();
                      const lowerName = String(fileName).toLowerCase();
                      const isPdf = contentType.includes('pdf') || lowerName.endsWith('.pdf');
                      const description = doc?.description || doc?.note || '';
                      const uploadedBy = doc?.uploadedByName || doc?.uploadedBy || doc?.createdByName || '';

                      return (
                        <article key={doc?.id || doc?.documentId || `${fileName}-${index}`} style={{ overflow: 'hidden', borderRadius: '1rem', border: '1px solid rgba(203,213,225,0.9)', background: '#fff', boxShadow: '0 8px 22px rgba(15,23,42,0.04)' }}>
                          {!isPdf && url ? (
                            <button
                              type="button"
                              onClick={() => openImagePreview(doc, index)}
                              aria-label={`Xem ảnh ${fileName}`}
                              style={{ display: 'block', width: '100%', padding: 0, border: 0, background: '#eef4fb', cursor: 'zoom-in' }}
                            >
                              <img src={url} alt={description || fileName} style={{ display: 'block', width: '100%', height: '180px', objectFit: 'cover' }} />
                            </button>
                          ) : (
                            <div style={{ height: '120px', display: 'grid', placeItems: 'center', background: '#f8fafc', color: '#64748b' }}>
                              <div style={{ textAlign: 'center' }}>
                                <Lucide.FileText size={30} style={{ margin: '0 auto 0.4rem' }} aria-hidden="true" />
                                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Tài liệu PDF</div>
                              </div>
                            </div>
                          )}

                          <div style={{ padding: '0.85rem 0.95rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 750, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
                            {description && <div style={{ fontSize: '0.8rem', lineHeight: 1.45, color: '#64748b' }}>{description}</div>}
                            {uploadedBy && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Người tải lên: {uploadedBy}</div>}
                            {url && (
                              <button
                                type="button"
                                onClick={() => isPdf ? handleDocumentDownload(doc) : openImagePreview(doc, index)}
                                style={{ marginTop: '0.2rem', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', border: 0, background: 'transparent', color: '#2563eb', padding: 0, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                {isPdf ? <Lucide.Download size={14} /> : <Lucide.Maximize2 size={14} />}
                                {isPdf ? 'Tải xuống' : 'Xem ảnh'}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <StepFooter
                currentIndex={visibleStepIndex}
                totalSteps={totalVisible}
                onBack={goBack}
                onNext={goNext}
                nextLabel={currentStatus === 'InProgress' && !isResolutionSubmitted ? 'Tiếp tục: Kết quả xử lý' : 'Xem kết quả xử lý'}
                nextDisabled={!canAccessResolution}
              />

              {/* Gate explanation when Resolution is locked */}
              {!canAccessResolution && (
                <div style={{ margin: '0 1.25rem 1rem', padding: '0.75rem 1rem', borderRadius: '0.875rem', backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(180,83,9,0.18)', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                  <Lucide.AlertTriangle size={15} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', lineHeight: 1.45 }}>
                    <strong>Bước tiếp theo đang bị khóa.</strong> Cần có nhật ký liên hệ điều phối viên thành công để báo cáo chuyển sang <strong>Đang xử lý</strong> trước khi gửi kết quả.
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ══ STEP 4: RESOLUTION ═══════════════════════════════════════ */}
          {activeStepId === 'resolution' && (
            <section aria-labelledby="resolution-title" style={{ ...card, overflow: 'hidden' }}>
              <SectionHeader
                title="Kết quả xử lý"
                sub="Gửi kết quả xử lý cuối cùng để chuyển sang trạng thái chờ quản lý phê duyệt."
                action={
                  existingResolutions.length > 0 ? (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setResolutionPreviewOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Lucide.Eye size={13} /> Xem trước
                    </button>
                  ) : null
                }
              />

              <div style={{ padding: '1rem 1.25rem' }}>
                {resolutionError && <div style={{ marginBottom: '0.75rem' }}><ErrorAlert message={resolutionError} onClose={() => setResolutionError('')} /></div>}

                {!isResolutionSubmitted && !canSubmitResolution && (
                  <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', borderRadius: '0.875rem', backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(180,83,9,0.2)', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <Lucide.AlertTriangle size={15} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', lineHeight: 1.45 }}>
                      <strong>Báo cáo xử lý phải ở trạng thái Đang xử lý</strong> trước khi gửi kết quả. Hãy tạo nhật ký liên hệ điều phối viên thành công trước.
                    </div>
                  </div>
                )}

                {resolutionsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><LoadingSpinner /></div>
                ) : resolutionsError ? (
                  <ErrorAlert message={resolutionsError} onClose={() => setResolutionsError('')} />
                ) : existingResolutions.length > 0 ? (
                  /* Already submitted — read-only */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', backgroundColor: 'var(--color-success-bg)', border: '1px solid rgba(4,120,87,0.15)', color: 'var(--color-success)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', width: 'fit-content' }}>
                      <Lucide.CheckCircle2 size={12} /> Đã gửi chờ phê duyệt
                    </div>
                    {[
                      { label: 'Tóm tắt kết quả',           value: existingResolutions[0]?.resolutionSummary || resolutionForm.resolutionSummary },
                      { label: 'Hành động đã thực hiện',    value: existingResolutions[0]?.actionTaken       || resolutionForm.actionTaken       },
                      { label: 'Ghi chú kết quả',           value: existingResolutions[0]?.resultNote        || resolutionForm.resultNote        },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ borderRadius: '0.875rem', border: '1px solid rgba(203,213,225,0.7)', backgroundColor: 'rgba(248,250,252,0.6)', padding: '0.875rem 1rem' }}>
                        <div style={{ ...fieldLabel, marginBottom: '0.375rem' }}>{label}</div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.5 }}>{value || '—'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Resolution form */
                  <form onSubmit={handleResolutionFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {[
                      { key: 'resolutionSummary', label: 'Tóm tắt kết quả',         placeholder: 'Tóm tắt kết quả xử lý...', required: true },
                      { key: 'actionTaken',       label: 'Hành động đã thực hiện', placeholder: 'Các bước công việc đã thực hiện...', required: true },
                      { key: 'resultNote',        label: 'Ghi chú kết quả',         placeholder: 'Ghi chú kết quả cuối cùng...', required: false },
                    ].map(({ key, label, placeholder, required }) => (
                      <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span style={fieldLabel}>{label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}</span>
                        <textarea
                          value={resolutionForm[key]}
                          onChange={(e) => setResolutionForm((p) => ({ ...p, [key]: e.target.value }))}
                          rows={3}
                          placeholder={placeholder}
                          className="textarea textarea-bordered w-full"
                          disabled={!canSubmitResolution}
                          required={required}
                        />
                      </label>
                    ))}

                    {/* Completion images */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={fieldLabel}>Hình ảnh hoàn thành</span>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.65rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', borderRadius: '0.5rem', border: '1px solid rgba(203,213,225,0.9)', backgroundColor: 'rgba(255,255,255,0.9)', color: '#475569' }}>
                          <Lucide.ImagePlus size={13} /> Thêm ảnh
                          <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleResolutionImagesChange} />
                        </label>
                      </div>
                      {resolutionImages.length === 0 ? (
                        <div style={{ borderRadius: '0.875rem', border: '1px dashed rgba(203,213,225,0.9)', backgroundColor: 'rgba(248,250,252,0.6)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8' }}>
                          Chưa có hình ảnh hoàn thành nào được chọn.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.625rem', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                          {resolutionImages.map((img, idx) => (
                            <div key={`${img.fileName}-${idx}`} style={{ borderRadius: '0.75rem', border: '1px solid rgba(203,213,225,0.7)', overflow: 'hidden' }}>
                              <img src={img.previewUrl} alt={img.fileName} style={{ width: '100%', height: '88px', objectFit: 'cover', display: 'block' }} />
                              <div style={{ padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem', backgroundColor: 'rgba(248,250,252,0.97)' }}>
                                <span style={{ fontSize: '0.75rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{img.fileName}</span>
                                <button type="button" aria-label={`Remove ${img.fileName}`} onClick={() => setResolutionImages((p) => p.filter((_, i) => i !== idx))} style={{ display: 'inline-flex', padding: '0.2rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)', borderRadius: '0.25rem', flexShrink: 0 }}>
                                  <Lucide.X size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={submittingResolution || !canSubmitResolution}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                      >
                        {submittingResolution ? <span className="loading loading-spinner loading-xs" /> : <Lucide.Send size={13} />}
                        {submittingResolution ? 'Đang gửi...' : 'Gửi kết quả xử lý'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              <StepFooter
                currentIndex={visibleStepIndex}
                totalSteps={totalVisible}
                onBack={goBack}
                hideNext
              />
            </section>
          )}

          {/* ══ STEP 5: AWAITING APPROVAL (terminal) ═════════════════════ */}
          {activeStepId === 'submitted' && isResolutionSubmitted && (
            <section style={{ ...card, padding: '3rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.125rem' }}>
                <Lucide.Check size={24} color="#fff" aria-hidden="true" />
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-success)', margin: '0 0 0.5rem' }}>
                Đã gửi kết quả xử lý
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 auto', lineHeight: 1.6, maxWidth: '38ch' }}>
                Kết quả xử lý đã được gửi thành công. Chờ quản lý phê duyệt — không cần thêm hành động nào.
              </p>
              {feedbackId && (
                <div style={{ marginTop: '1.5rem' }}>
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Lucide.ArrowLeft size={13} /> Quay lại phản ánh
                  </Button>
                </div>
              )}
            </section>
          )}

        </div>{/* /right column */}
      </div>{/* /workspace body */}

      {/* ── Image lightbox ───────────────────────────────────────────────── */}
      {selectedImage && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh minh chứng"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15,23,42,0.24)',
            backdropFilter: 'blur(7px)',
            WebkitBackdropFilter: 'blur(7px)',
            overflow: 'hidden',
            padding: '1.25rem',
          }}
          onClick={closeImagePreview}
        >
          <div
            style={{
              width: 'min(920px, 94vw)',
              maxHeight: 'calc(100dvh - 2.5rem)',
              overflow: 'hidden',
              borderRadius: '1.25rem',
              border: '1px solid rgba(203,213,225,0.9)',
              backgroundColor: '#fff',
              boxShadow: '0 24px 70px rgba(15,23,42,0.28)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '1rem 1.125rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.35rem', height: '2.35rem', borderRadius: '0.8rem', backgroundColor: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Lucide.Image size={18} aria-hidden="true" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Ảnh minh chứng xử lý</div>
                  <div style={{ marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#64748b' }}>
                    {imageDocuments[selectedImageIndex]?.fileName || imageDocuments[selectedImageIndex]?.name || 'Ảnh minh chứng'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                {imageDocuments.length > 1 && [
                  { dir: -1, icon: Lucide.ChevronLeft, label: 'Ảnh trước' },
                  { dir: 1, icon: Lucide.ChevronRight, label: 'Ảnh tiếp' },
                ].map(({ dir, icon: Icon, label }) => (
                  <Button key={label} type="button" variant="ghost" size="sm" onClick={() => showImagePreview(dir)} aria-label={label}>
                    <Icon size={17} />
                  </Button>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={closeImagePreview} aria-label="Đóng">
                  <Lucide.X size={18} />
                </Button>
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', height: 'min(72dvh, 720px)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '0.9rem', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                <img src={selectedImage} alt="Ảnh minh chứng xử lý" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Resolution preview ───────────────────────────────────────────── */}
      {resolutionPreviewOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem trước kết quả xử lý"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15,23,42,0.22)',
            backdropFilter: 'blur(7px)',
            WebkitBackdropFilter: 'blur(7px)',
            overflow: 'hidden',
            padding: '1.25rem',
          }}
          onClick={() => setResolutionPreviewOpen(false)}
        >
          <div
            style={{
              width: 'min(680px, 94vw)',
              maxHeight: '84vh',
              overflow: 'hidden',
              borderRadius: '1.25rem',
              border: '1px solid rgba(203,213,225,0.9)',
              backgroundColor: '#fff',
              boxShadow: '0 24px 70px rgba(15,23,42,0.24)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.125rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <div style={{ width: '2.35rem', height: '2.35rem', borderRadius: '0.8rem', backgroundColor: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Lucide.ClipboardCheck size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Xem trước kết quả xử lý</h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>Kiểm tra thông tin đã ghi nhận trước khi đóng cửa sổ.</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setResolutionPreviewOpen(false)} aria-label="Đóng">
                <Lucide.X size={18} />
              </Button>
            </div>

            <div style={{ maxHeight: '62vh', overflowY: 'auto', padding: '1rem 1.125rem', display: 'grid', gap: '0.75rem' }}>
              {[
                { label: 'Tóm tắt kết quả', value: existingResolutions[0]?.resolutionSummary || resolutionForm.resolutionSummary, icon: Lucide.FileText },
                { label: 'Hành động đã thực hiện', value: existingResolutions[0]?.actionTaken || resolutionForm.actionTaken, icon: Lucide.CheckCircle2 },
                { label: 'Ghi chú kết quả', value: existingResolutions[0]?.resultNote || resolutionForm.resultNote, icon: Lucide.MessageSquareText },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ display: 'flex', gap: '0.75rem', padding: '0.9rem 1rem', borderRadius: '0.9rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.7rem', backgroundColor: '#fff', color: '#2563eb', display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                    <Icon size={15} aria-hidden="true" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{label}</div>
                    <div style={{ marginTop: '0.25rem', fontSize: '0.9rem', fontWeight: 650, lineHeight: 1.55, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{value || 'Chưa có thông tin'}</div>
                  </div>
                </div>
              ))}

              {resolutionImages.length > 0 && (
                <div style={{ paddingTop: '0.25rem' }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Hình ảnh</div>
                  <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                    {resolutionImages.map((img, idx) => (
                      <img key={`${img.fileName}-${idx}`} src={img.previewUrl} alt={img.fileName} style={{ height: '6rem', width: '100%', borderRadius: '0.75rem', border: '1px solid #e2e8f0', objectFit: 'cover' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.125rem 1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
              <Button type="button" onClick={() => setResolutionPreviewOpen(false)} style={{ minWidth: '6.5rem' }}>Đóng</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <ConfirmationModal
        open={confirmingResolutionSubmit}
        title="Gửi kết quả xử lý"
        message="Bạn có chắc chắn muốn gửi kết quả xử lý này để quản lý phê duyệt không?"
        confirmLabel="Xác nhận gửi"
        cancelLabel="Hủy"
        onConfirm={handleSubmitResolution}
        onCancel={() => setConfirmingResolutionSubmit(false)}
      />

      <DelightToast open={toastOpen} message={toastTitle} sub={toastSubtitle} onClose={() => setToastOpen(false)} />
    </div>
  );
};

export default ProviderReportWorkspacePage;
