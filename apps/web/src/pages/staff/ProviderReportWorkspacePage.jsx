import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { LoadingSpinner, CompletionDocumentsCard, ConfirmationModal } from '@urbanmind/shared-ui';
import {
  canTransitionProviderReportStatus,
  normalizeProviderReportStatus,
  slaApi
} from '@urbanmind/shared-api';
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

const normalizePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

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
  { id: 'completion-documents', label: 'Tài liệu hoàn thành',  icon: Lucide.FileText,        description: 'Tải lên tài liệu bằng chứng hoàn thành'  },
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
      const statusLocked =
        (step.id === 'completion-documents' && !canAccessCompletionDocuments) ||
        (step.id === 'resolution' && !canAccessResolution && !isResolutionSubmitted);
      const isLocked = idx > maxReached || statusLocked;
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
              {step.requiresInProgress && !canAccessResolution && !isResolutionSubmitted && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-warning)', fontWeight: 600, lineHeight: 1.3, marginTop: '1px' }}>
                  Yêu cầu trạng thái: InProgress
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
      if (
        !providerReportId ||
        !['completion-documents', 'resolution', 'submitted'].includes(activeStepId)
      ) return;
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
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.resolutions)
              ? res.resolutions
              : [];
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
      if (!feedbackId) return;

      await loadExistingResolutions(feedbackId, { active });
    };

    load();

    return () => {
      active = false;
    };
  }, [extractFeedbackId, loadExistingResolutions, report]);

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
  const isResolutionSubmitted = existingResolutions.length > 0;
  const canAccessCompletionDocuments = ['InProgress', 'Done'].includes(currentStatus);
  const canAccessResolution = ['InProgress', 'Done'].includes(currentStatus);
  const canSubmitResolution = currentStatus === 'InProgress' && !isResolutionSubmitted;
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
    const name = String(d?.fileName || d?.name || '').toLowerCase();
    const fileType = String(d?.fileType || d?.contentType || '').toLowerCase();
    const fileUrl = String(d?.fileUrl || d?.url || d?.downloadUrl || d?.documentUrl || '').toLowerCase();

    return (
      /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(name) ||
      /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(fileUrl) ||
      fileType.startsWith('image/')
      || fileType === 'image'
    );
  });

  const workflowChecklist = (() => {
    const hasSuccessfulContact =
      contactLogs.some((log) =>
        isSuccessfulCoordinatorContact(
          log?.contactResult
        )
      );

    const hasDocs = documents.length > 0;
    const isInProgress = ['InProgress', 'Done'].includes(currentStatus);
    const isDone = currentStatus === 'Done';

    return [
      { label: 'Báo cáo nhận', completed: Boolean(report) },
      {
        label: 'Đã liên hệ coordinator',
        completed: hasSuccessfulContact || isInProgress || isDone
      },
      { label: 'Đang xử lý', completed: isInProgress || isDone },
      { label: 'Tài liệu/minh chứng đã có', completed: hasDocs || isResolutionSubmitted || isDone },
      { label: 'Đã gửi kết quả chờ duyệt', completed: isResolutionSubmitted || isDone },
    ];
  })();

  const visibleSteps = STEPS;

  const workflowAction = (() => {
    if (currentStatus === 'InProgress') {
      return {
        title: 'Gửi kết quả xử lý',
        description: 'Đã liên hệ coordinator thành công. Staff có thể bổ sung minh chứng nếu cần, rồi gửi kết quả xử lý để chờ quản lý phê duyệt.',
        actionLabel: 'Đi tới kết quả xử lý',
        targetStep: 'resolution',
        nextStatus: null,
        disabled: false,
      };
    }

    if (currentStatus === 'Done') {
      return {
        title: 'Kết quả đã được gửi',
        description: 'Kết quả xử lý đã được gửi và đang chờ quản lý phê duyệt.',
        actionLabel: 'Xem kết quả',
        targetStep: 'resolution',
        nextStatus: null,
        disabled: false,
      };
    }

      return {
        title: 'Liên hệ điều phối viên',
        description: 'Tạo nhật ký liên hệ coordinator. Chỉ kết quả liên hệ thành công mới mở bước Submit Resolution; nếu cần liên hệ lại thì báo cáo vẫn ở Reported.',
        actionLabel: 'Tạo nhật ký liên hệ',
        targetStep: 'contact-logs',
        nextStatus: null,
        disabled: false,
      };
  })();

  const totalVisible = visibleSteps.length;

  useEffect(() => {
    if (!visibleSteps.length) return;

    /*
     * Khi vừa mở/reload trang:
     * - nếu đã submit resolution hoặc report đã Done thì mặc định mở bước 5/5.
     *
     * Sau đó nếu người dùng chủ động click lại bước 1-4 thì cho phép xem read-only,
     * không ép quay trở lại bước 5.
     */
    if (
      (isResolutionSubmitted || currentStatus === 'Done') &&
      !hasUserChosenStepRef.current
    ) {
      const submittedIndex = STEPS.findIndex((step) => step.id === 'submitted');

      if (submittedIndex >= 0 && activeStepId !== 'submitted') {
        setStepIndex(submittedIndex);
        setMaxReached((prev) => Math.max(prev, submittedIndex));
      }

      return;
    }

    if (hasUserChosenStepRef.current) return;

    let fallbackStepId = 'overview';

    if (currentStatus === 'InProgress') {
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
      openToast('Đã gửi tài liệu', 'Tài liệu hoàn thành đã được gửi thành công.');
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

    const imageFiles = files.filter((file) =>
      String(file?.type || '').toLowerCase().startsWith('image/')
    );

    if (imageFiles.length !== files.length) {
      setResolutionError('Chỉ hỗ trợ tệp hình ảnh ở mục Hình ảnh hoàn thành.');
    }

    if (!imageFiles.length) {
      event.target.value = '';
      return;
    }

    setResolutionImages((prev) => [
      ...prev,
      ...imageFiles.map((file) => ({
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        file,
      })),
    ]);

    event.target.value = '';
  };

  const removeResolutionImage = (index) => {
    setResolutionImages((prev) => {
      const target = prev[index];
      if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  useEffect(() => {
    return () => {
      resolutionImages.forEach((image) => {
        if (image?.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
    };
  }, [resolutionImages]);

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

    if (workflowAction.targetStep === 'resolution') {
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
  event.preventDefault();
  setLogFormError('');

  const method = String(
    logForm.contactMethod || ''
  ).trim();

  const result = String(
    logForm.contactResult || ''
  ).trim();

  const at = String(
    logForm.contactedAt || ''
  ).trim();

  const isSuccessfulContact =
    isSuccessfulCoordinatorContact(result);

  const shouldAutoTransition =
    currentStatus === 'Reported' &&
    isSuccessfulContact;

  if (!method || !result || !at) {
    setLogFormError(
      'Vui lòng điền phương thức, kết quả và thời điểm liên hệ.'
    );
    return;
  }

  setLogSaving(true);

  try {
    /*
     * 1. Lưu contact log trước.
     */
    const created =
      await managementFeedbackApi
        .createProviderReportContactLog(
          providerReportId,
          {
            contactMethod: method,
            contactResult: result,
            contactNote:
              String(
                logForm.contactNote || ''
              ).trim() || null,
            contactedAt: at
          }
        );

    setContactLogs((prev) => [
      created,
      ...(Array.isArray(prev)
        ? prev
        : [])
    ]);

    /*
     * 2. Nếu đây là lần liên hệ coordinator thành công
     *    đầu tiên khi report đang ở Reported,
     *    thì ghi nhận First Response SLA.
     */
    if (shouldAutoTransition) {
      const feedbackId =
        extractFeedbackId(report);

      if (!feedbackId) {
        throw new Error(
          'Không xác định được feedbackId để ghi nhận First Response SLA.'
        );
      }

      try {
  await slaApi.markResponded(
    feedbackId,
    'Staff đã liên hệ coordinator thành công.'
  );
} catch (slaErr) {
  const message = String(
    slaErr?.message || ''
  ).toLowerCase();

  const alreadyResponded =
    message.includes(
      'đã được ghi nhận phản hồi đầu tiên'
    );

  if (!alreadyResponded) {
    throw slaErr;
  }
}

const transitionResult =
  await performStatusTransition(
    'InProgress',
    'Tự động chuyển trạng thái sau khi tạo nhật ký liên hệ coordinator đầu tiên.',
    { auto: true }
  );

if (!transitionResult) {
  throw new Error(
    'First Response SLA đã được ghi nhận nhưng không thể chuyển báo cáo sang InProgress.'
  );
}
    }

    openToast(
      'Đã lưu lịch sử liên hệ',
      isSuccessfulContact
        ? 'Liên hệ thành công. First Response SLA đã được ghi nhận và báo cáo chuyển sang InProgress.'
        : 'Kết quả cần liên hệ lại/chưa thành công. Response SLA vẫn tiếp tục chạy.'
    );

    setLogForm({
      contactMethod: '',
      contactResult: '',
      contactNote: '',
      contactedAt:
        toLocalDateTimeValue()
    });
  }
  catch (err) {
    console.error(
      'Save log / mark SLA responded failed',
      err
    );

    setLogFormError(
      err?.message ||
      'Không thể lưu bản ghi liên hệ hoặc cập nhật SLA.'
    );
  }
  finally {
    setLogSaving(false);
  }
};

  const handleResolutionFormSubmit = (event) => {
    event.preventDefault();

    if (!canSubmitResolution) {
      setResolutionError('Báo cáo không còn ở trạng thái cho phép gửi kết quả mới.');
      return;
    }

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
    if (!canSubmitResolution) {
      setResolutionError('Báo cáo không còn ở trạng thái cho phép gửi kết quả mới.');
      setConfirmingResolutionSubmit(false);
      return;
    }

    const summary = String(resolutionForm.resolutionSummary || '').trim();
    const action = String(resolutionForm.actionTaken || '').trim();
    const result = String(resolutionForm.resultNote || '').trim();

    if (!summary || !action) {
      setResolutionError('Vui lòng nhập Tóm tắt kết quả và Hành động đã thực hiện.');
      return;
    }

    const feedbackId = extractFeedbackId(report);
    if (!feedbackId) {
      setResolutionError('Không xác định được feedbackId của báo cáo để gửi kết quả xử lý.');
      return;
    }

    const currentProviderReportId =
      normalizePositiveInt(report?.providerReportId) ||
      normalizePositiveInt(report?.id) ||
      normalizePositiveInt(providerReportId);

    if (!currentProviderReportId) {
      setResolutionError('Không xác định được providerReportId để gửi kết quả xử lý.');
      return;
    }

    setSubmittingResolution(true);
    setResolutionError('');

    try {
      /*
       * 1. Upload ảnh thật lên Cloudinary/completion_documents trước.
       *    Không gửi blob URL vào submit-resolution vì blob chỉ tồn tại trong browser.
       */
      for (const image of resolutionImages) {
        if (!(image?.file instanceof File)) continue;

        await managementFeedbackApi.uploadCompletionDocument(
          currentProviderReportId,
          image.file,
          {
            fileName: image.fileName,
            description: 'Hình ảnh hoàn thành xử lý',
          }
        );
      }

      /*
       * 2. Submit resolution và liên kết đúng Provider Report.
       *    imageUrls để rỗng vì ảnh đã được lưu qua completion-documents.
       *    Làm vậy tránh backend tạo CompletionDocument trùng lần nữa.
       */
      await managementFeedbackApi.submitResolution(feedbackId, {
        providerReportId: currentProviderReportId,
        resolutionSummary: summary,
        actionTaken: action,
        resultNote: result,
        imageUrls: [],
      });

      /*
       * 3. Refresh dữ liệu thật từ backend.
       */
      const [refreshedResolutions, refreshedDocuments] = await Promise.all([
        loadExistingResolutions(feedbackId, { active: true }),
        managementFeedbackApi.getProviderReportCompletionDocuments(currentProviderReportId),
      ]);

      const normalizedDocuments = Array.isArray(refreshedDocuments)
        ? refreshedDocuments
        : Array.isArray(refreshedDocuments?.items)
          ? refreshedDocuments.items
          : Array.isArray(refreshedDocuments?.data)
            ? refreshedDocuments.data
            : [];

      setDocuments(normalizedDocuments);

      if (Array.isArray(refreshedResolutions) && refreshedResolutions.length > 0) {
        setExistingResolutions(refreshedResolutions);
      } else {
        setExistingResolutions([
          {
            providerReportId: currentProviderReportId,
            resolutionSummary: summary,
            actionTaken: action,
            resultNote: result,
            status: 'SubmittedForApproval',
            createdByStaffUserName: 'Bạn',
            resolvedAt: new Date().toISOString(),
          },
        ]);
      }

      resolutionImages.forEach((image) => {
        if (image?.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      setResolutionImages([]);

      openToast(
        'Đã gửi kết quả xử lý',
        'Kết quả và hình ảnh hoàn thành đã được gửi chờ quản lý phê duyệt.'
      );

      const submittedIdx = STEPS.findIndex((step) => step.id === 'submitted');
      goTo(submittedIdx);
    } catch (err) {
      console.error('Submit resolution failed', err);
      setResolutionError(
        err?.message ||
        'Không thể gửi kết quả xử lý. Vui lòng kiểm tra ảnh, Provider Report và thử lại.'
      );
    } finally {
      setSubmittingResolution(false);
      setConfirmingResolutionSubmit(false);
    }
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
      <header style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.875rem 1.25rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(203,213,225,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Quay lại"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 500, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
            >
              <Lucide.ChevronLeft size={14} /> Báo cáo xử lý
            </button>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
              {report.providerReportId || report.id || providerReportId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <Badge intent={getBadgeIntent(currentStatus)} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]">
              {currentStatus || 'Không rõ'}
            </Badge>
            {feedbackId && (
              <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <Lucide.ExternalLink size={13} /> Mở phản ánh
              </Button>
            )}
          </div>
        </div>

        {/* Meta strip */}
        <div style={{ padding: '0.875rem 1.25rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <MetaField label="Nhà thầu"       value={providerName}    />
          <MetaField label="Điều phối viên" value={coordinatorName} />
          <MetaField label="Liên hệ"        value={[providerPhone !== '—' ? providerPhone : null, providerEmail !== '—' ? providerEmail : null].filter(Boolean).join(' · ') || '—'} />
          <MetaField label="Ngày phân công" value={report.assignedAt || report.assignedDate || report.createdAt ? formatContactDateTime(report.assignedAt || report.assignedDate || report.createdAt) : '—'} />
          <MetaField label="Mã báo cáo xử lý"    value={report.providerReportId || report.id} mono />
          {feedbackId && <MetaField label="Mã phản ánh" value={feedbackId} mono />}
        </div>
      </header>

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
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563eb' }}>Guided workflow</div>
                <h2 style={{ margin: '0.25rem 0 0.35rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Theo dõi tiến trình xử lý theo từng bước</h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.55 }}>Mỗi hành động đều có gợi ý bước tiếp theo, nhưng trạng thái vẫn được cập nhật thủ công theo quy trình hiện có.</p>
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
          {activeStepId !== 'resolution' && activeStepId !== 'submitted' ? (
            <section style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563eb' }}>
                    Hành động tiếp theo
                  </div>
                  <h3 style={{ margin: '0.25rem 0 0.35rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {workflowAction.title
                      .replace('Recommended next action: Submit Resolution', 'Gửi kết quả xử lý')
                      .replace('Recommended next action: Contact Coordinator', 'Liên hệ điều phối viên')
                      .replace('Resolution submitted', 'Kết quả đã được gửi')}
                  </h3>
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
                    {workflowAction.actionLabel
                      .replace('Submit Resolution', 'Đi tới kết quả xử lý')
                      .replace('Create Contact Log', 'Tạo nhật ký liên hệ')
                      .replace('View Resolution', 'Xem kết quả')}
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {/* ══ STEP 1: OVERVIEW ══════════════════════════════════════════ */}
          {activeStepId === 'overview' && (
            <section aria-labelledby="step-overview-title" style={{ ...card, overflow: 'hidden' }}>
              <SectionHeader
                title="Tổng quan & Cập nhật trạng thái"
                sub="Xem lại thông tin nhà thầu và cập nhật trạng thái báo cáo trước khi tiếp tục."
                action={
                  <Badge intent={getBadgeIntent(currentStatus)} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]">
                    {currentStatus || 'Không rõ'}
                  </Badge>
                }
              />

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {statusUpdateError && (
                  <ErrorAlert message={statusUpdateError} onClose={() => setStatusUpdateError('')} />
                )}

                <div style={{ padding: '0.875rem 1rem', borderRadius: '0.875rem', backgroundColor: 'rgba(248,250,252,0.95)', border: '1px solid rgba(203,213,225,0.8)', color: '#475569', fontSize: '0.875rem', lineHeight: 1.55 }}>
                  {isResolutionSubmitted || currentStatus === 'Done'
                    ? 'Báo cáo đã gửi kết quả và đang ở chế độ chỉ xem. Bạn có thể xem lại thông tin và lịch sử trạng thái nhưng không thể chỉnh sửa workflow trước đó.'
                    : 'Sử dụng nút hành động ở thẻ workflow phía trên để tiến trình báo cáo. Không cần mở trang quản lý trạng thái riêng.'}
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
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{item.status || 'Không rõ'}</div>
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
                nextLabel="Tiếp tục: Lịch sử liên hệ"
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
                    <div style={{ borderRadius: '0.875rem', border: '1px solid rgba(203,213,225,0.9)', backgroundColor: 'rgba(248,250,252,0.7)', padding: '1rem 1rem', color: '#475569', lineHeight: 1.6 }}>
                      {isResolutionSubmitted || currentStatus === 'Done'
                        ? 'Bước này đã hoàn tất và hiện ở chế độ chỉ xem. Bạn có thể xem lại toàn bộ lịch sử liên hệ nhưng không thể tạo thêm bản ghi mới sau khi đã gửi kết quả.'
                        : 'Bước này đã được hoàn tất. Nội dung lịch sử liên hệ ở trên có thể xem lại để đối chiếu.'}
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
                  nextLabel="Tiếp tục: Tài liệu hoàn thành"
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
                title="Tài liệu hoàn thành"
                sub={canUploadCompletionDocuments ? 'Tải lên bằng chứng hoàn thành từ nhà thầu trước khi tiếp tục.' : 'Bước này có thể xem lại nội dung tài liệu đã tải lên sau khi báo cáo được hoàn tất.'}
                action={canUploadCompletionDocuments ? null : (
                  <Badge intent={getBadgeIntent(currentStatus)} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]">
                    {currentStatus === 'Done' ? 'Đã gửi kết quả' : 'Xem lại'}
                  </Badge>
                )}
              />

              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {canUploadCompletionDocuments ? (
                  <form onSubmit={handleDocumentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <span style={fieldLabel}>Mô tả <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                      <textarea value={documentDescription} onChange={(e) => setDocumentDescription(e.target.value)} placeholder="Mô tả chi tiết về tài liệu hoàn thành..." rows={3} maxLength={1000} className="textarea textarea-bordered w-full" required />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span>Hỗ trợ: JPG, PNG, PDF</span>
                        <span>{documentDescription.trim().length}/1000</span>
                      </div>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" style={{ display: 'none' }} onChange={handleDocumentFileChange} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingDocuments} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Lucide.FolderPlus size={14} /> Chọn tệp
                        </Button>
                        <div style={{ minHeight: '1.1rem', color: selectedDocumentFile ? '#0f172a' : '#6b7280', fontSize: '0.9rem' }}>
                          {selectedDocumentFile ? selectedDocumentFile.name : 'Chưa chọn tệp nào'}
                        </div>
                      </div>

                      <Button type="submit" variant="primary" size="sm" disabled={uploadingDocuments} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', alignSelf: 'flex-start' }}>
                        {uploadingDocuments ? <span className="loading loading-spinner loading-xs" /> : <Lucide.CheckCircle2 size={14} />}
                        {uploadingDocuments ? 'Đang gửi...' : 'Gửi tài liệu'}
                      </Button>
                    </div>

                    {uploadError && <ErrorAlert message={uploadError} onClose={() => setUploadError('')} />}
                  </form>
                ) : (
                  <div
                    style={{
                      borderRadius: '0.875rem',
                      border: '1px solid rgba(203,213,225,0.9)',
                      backgroundColor: 'rgba(248,250,252,0.7)',
                      padding: '1rem 1rem',
                      color: '#475569',
                      lineHeight: 1.6,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.625rem',
                    }}
                  >
                    <Lucide.Lock size={15} style={{ flexShrink: 0, marginTop: '3px', color: '#64748b' }} />
                    <div>
                      <strong style={{ color: '#334155' }}>Chỉ xem.</strong>{' '}
                      Báo cáo đã gửi kết quả nên không thể tải thêm hoặc chỉnh sửa tài liệu hoàn thành.
                      Bạn vẫn có thể xem và mở các tài liệu đã gửi bên dưới.
                    </div>
                  </div>
                )}

                {documentsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><LoadingSpinner /></div>
                ) : documentsError ? (
                  <ErrorAlert message={documentsError} onClose={() => setDocumentsError('')} />
                ) : documents.length === 0 ? (
                  <div style={{ borderRadius: '0.875rem', border: '1px dashed rgba(203,213,225,0.9)', backgroundColor: 'rgba(248,250,252,0.7)', padding: '3rem 1rem', textAlign: 'center' }}>
                    <Lucide.FileText size={28} style={{ margin: '0 auto 0.625rem', color: '#94a3b8' }} aria-hidden="true" />
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Chưa có tài liệu nào được tải lên.</div>
                  </div>
                ) : (
                  <CompletionDocumentsCard
                    documents={documents}
                    onPreview={openImagePreview}
                    onDownload={handleDocumentDownload}
                    emptyMessage="Chưa có tài liệu hoàn thành nào được tải lên."
                  />
                )}
              </div>

              <StepFooter
                currentIndex={visibleStepIndex}
                totalSteps={totalVisible}
                onBack={goBack}
                onNext={goNext}
                nextLabel="Tiếp tục: Kết quả xử lý"
                nextDisabled={!canAccessResolution}
              />

              {/* Gate explanation when Resolution is locked */}
              {!canAccessResolution && !isResolutionSubmitted && (
                <div style={{ margin: '0 1.25rem 1rem', padding: '0.75rem 1rem', borderRadius: '0.875rem', backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(180,83,9,0.18)', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                  <Lucide.AlertTriangle size={15} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', lineHeight: 1.45 }}>
                    <strong>Bước tiếp theo bị khóa.</strong> Bạn cần tạo nhật ký liên hệ coordinator thành công để báo cáo chuyển sang <strong>InProgress</strong> trước khi gửi Kết quả xử lý.
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

                {isResolutionSubmitted && (
                  <div
                    style={{
                      marginBottom: '1rem',
                      padding: '0.875rem 1rem',
                      borderRadius: '0.875rem',
                      backgroundColor: 'rgba(248,250,252,0.8)',
                      border: '1px solid rgba(203,213,225,0.9)',
                      display: 'flex',
                      gap: '0.625rem',
                      alignItems: 'flex-start',
                      color: '#475569',
                      lineHeight: 1.5,
                    }}
                  >
                    <Lucide.Lock size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#64748b' }} />
                    <div>
                      <strong style={{ color: '#334155' }}>Chỉ xem.</strong>{' '}
                      Kết quả đã được gửi chờ phê duyệt nên không thể chỉnh sửa hoặc gửi lại từ bước này.
                    </div>
                  </div>
                )}

                {!canAccessResolution && !isResolutionSubmitted && (
                  <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', borderRadius: '0.875rem', backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(180,83,9,0.2)', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <Lucide.AlertTriangle size={15} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', lineHeight: 1.45 }}>
                      <strong>Báo cáo xử lý phải ở trạng thái InProgress</strong> trước khi gửi Kết quả xử lý. Hãy tạo nhật ký liên hệ coordinator thành công trước.
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
                    {imageDocuments.length > 0 && (
                      <div style={{ borderRadius: '0.875rem', border: '1px solid rgba(203,213,225,0.7)', backgroundColor: 'rgba(248,250,252,0.6)', padding: '0.875rem 1rem' }}>
                        <div style={{ ...fieldLabel, marginBottom: '0.625rem' }}>Hình ảnh hoàn thành</div>
                        <div style={{ display: 'grid', gap: '0.625rem', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                          {imageDocuments.map((doc, index) => {
                            const url = doc?.fileUrl || doc?.url || doc?.downloadUrl || doc?.documentUrl;
                            if (!url) return null;
                            return (
                              <button
                                key={doc?.completionDocumentId || `${url}-${index}`}
                                type="button"
                                onClick={() => openImagePreview(doc, index)}
                                style={{
                                  padding: 0,
                                  border: '1px solid rgba(203,213,225,0.7)',
                                  borderRadius: '0.75rem',
                                  overflow: 'hidden',
                                  background: '#fff',
                                  cursor: 'pointer',
                                }}
                              >
                                <img
                                  src={url}
                                  alt={doc?.description || `Hình ảnh hoàn thành ${index + 1}`}
                                  style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                          <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleResolutionImagesChange} disabled={!canSubmitResolution || submittingResolution} />
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
                                <button type="button" aria-label={`Remove ${img.fileName}`} onClick={() => removeResolutionImage(idx)} style={{ display: 'inline-flex', padding: '0.2rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)', borderRadius: '0.25rem', flexShrink: 0 }}>
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
            <section style={{ ...card, overflow: 'hidden' }}>
              <SectionHeader
                title="Chờ phê duyệt"
                sub="Kết quả xử lý đã được gửi thành công và đang chờ quản lý phê duyệt."
                action={
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.3rem 0.7rem', borderRadius: '9999px', backgroundColor: 'var(--color-success-bg)', border: '1px solid rgba(4,120,87,0.15)', color: 'var(--color-success)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <Lucide.CheckCircle2 size={12} />
                    Đã gửi chờ phê duyệt
                  </div>
                }
              />

              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {[
                  {
                    label: 'Tóm tắt kết quả',
                    value: existingResolutions[0]?.resolutionSummary || resolutionForm.resolutionSummary,
                  },
                  {
                    label: 'Hành động đã thực hiện',
                    value: existingResolutions[0]?.actionTaken || resolutionForm.actionTaken,
                  },
                  {
                    label: 'Ghi chú kết quả',
                    value: existingResolutions[0]?.resultNote || resolutionForm.resultNote,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      borderRadius: '0.875rem',
                      border: '1px solid rgba(203,213,225,0.7)',
                      backgroundColor: 'rgba(248,250,252,0.6)',
                      padding: '0.875rem 1rem',
                    }}
                  >
                    <div style={{ ...fieldLabel, marginBottom: '0.375rem' }}>{label}</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.5 }}>
                      {value || '—'}
                    </div>
                  </div>
                ))}

                {imageDocuments.length > 0 && (
                  <div
                    style={{
                      borderRadius: '0.875rem',
                      border: '1px solid rgba(203,213,225,0.7)',
                      backgroundColor: 'rgba(248,250,252,0.6)',
                      padding: '0.875rem 1rem',
                    }}
                  >
                    <div style={{ ...fieldLabel, marginBottom: '0.625rem' }}>
                      Hình ảnh hoàn thành
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: '0.625rem',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      }}
                    >
                      {imageDocuments.map((doc, index) => {
                        const url =
                          doc?.fileUrl ||
                          doc?.url ||
                          doc?.downloadUrl ||
                          doc?.documentUrl;

                        if (!url) return null;

                        return (
                          <button
                            key={doc?.completionDocumentId || `${url}-${index}`}
                            type="button"
                            onClick={() => openImagePreview(doc, index)}
                            style={{
                              padding: 0,
                              border: '1px solid rgba(203,213,225,0.7)',
                              borderRadius: '0.75rem',
                              overflow: 'hidden',
                              background: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            <img
                              src={url}
                              alt={doc?.description || `Hình ảnh hoàn thành ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100px',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {feedbackId && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                      <Lucide.ArrowLeft size={13} />
                      Quay lại phản ánh
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>{/* /right column */}
      </div>{/* /workspace body */}

      {/* ── Image lightbox ───────────────────────────────────────────────── */}
      {selectedImage && (
        <div role="dialog" aria-modal="true" aria-label="Image preview"
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(2,6,23,0.88)', padding: '1.5rem 1rem' }}
          onClick={closeImagePreview}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '56rem', borderRadius: '1.25rem', border: '1px solid rgba(71,85,105,0.5)', backgroundColor: '#0f172a', padding: '0.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.625rem', color: '#cbd5e1', fontSize: '0.875rem' }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imageDocuments[selectedImageIndex]?.fileName || imageDocuments[selectedImageIndex]?.name || 'Xem ảnh'}</div>
              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                {[{ dir: -1, icon: Lucide.ChevronLeft, label: 'Ảnh trước' }, { dir: 1, icon: Lucide.ChevronRight, label: 'Ảnh tiếp' }].map(({ dir, icon: Icon, label }) => (
                  <Button key={label} type="button" variant="ghost" size="sm" onClick={() => showImagePreview(dir)} aria-label={label} style={{ color: '#cbd5e1' }}><Icon size={16} /></Button>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={closeImagePreview} aria-label="Đóng" style={{ color: '#cbd5e1' }}><Lucide.X size={16} /></Button>
              </div>
            </div>
            <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '1rem', backgroundColor: '#020617' }}>
              <img src={selectedImage} alt="Xem trước tài liệu hoàn thành" style={{ maxHeight: '70vh', maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <ConfirmationModal
        open={resolutionPreviewOpen}
        title="Chi tiết kết quả xử lý"
        message="Thông tin resolution hiện có"
        confirmLabel="Đóng"
        cancelLabel="Đóng"
        onConfirm={() => setResolutionPreviewOpen(false)}
        onCancel={() => setResolutionPreviewOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem', color: '#374151' }}>
          {[
            { label: 'Tóm tắt kết quả',           value: existingResolutions[0]?.resolutionSummary || resolutionForm.resolutionSummary },
            { label: 'Hành động đã thực hiện',    value: existingResolutions[0]?.actionTaken       || resolutionForm.actionTaken       },
            { label: 'Ghi chú kết quả',           value: existingResolutions[0]?.resultNote        || resolutionForm.resultNote        },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{value || '—'}</div>
            </div>
          ))}
          {(resolutionImages.length > 0 || imageDocuments.length > 0) && (
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>Hình ảnh</div>
              <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                {resolutionImages.map((img, idx) => (
                  <img
                    key={`local-${img.fileName}-${idx}`}
                    src={img.previewUrl}
                    alt={img.fileName}
                    style={{ height: '5.5rem', width: '100%', borderRadius: '0.625rem', objectFit: 'cover' }}
                  />
                ))}
                {imageDocuments.map((doc, idx) => {
                  const url = doc?.fileUrl || doc?.url || doc?.downloadUrl || doc?.documentUrl;
                  if (!url) return null;
                  return (
                    <img
                      key={doc?.completionDocumentId || `persisted-${url}-${idx}`}
                      src={url}
                      alt={doc?.description || `Hình ảnh hoàn thành ${idx + 1}`}
                      style={{ height: '5.5rem', width: '100%', borderRadius: '0.625rem', objectFit: 'cover' }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ConfirmationModal>

      {confirmingResolutionSubmit && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="resolution-submit-title"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
              }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submittingResolution) {
                  setConfirmingResolutionSubmit(false);
                }
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  borderRadius: '1.25rem',
                  backgroundColor: '#fff',
                  border: '1px solid rgba(203,213,225,0.8)',
                  boxShadow: '0 24px 70px rgba(15,23,42,0.22)',
                  overflow: 'hidden',
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.875rem',
                    padding: '1.25rem 1.25rem 1rem',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(37,99,235,0.08)',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Lucide.Send size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      id="resolution-submit-title"
                      style={{
                        margin: 0,
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: '#0f172a',
                      }}
                    >
                      Gửi kết quả xử lý
                    </h3>

                    <p
                      style={{
                        margin: '0.45rem 0 0',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        color: '#64748b',
                      }}
                    >
                      Xác nhận gửi kết quả xử lý này để quản lý phê duyệt.
                      Sau khi gửi, nội dung sẽ chuyển sang trạng thái chờ duyệt.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Đóng"
                    onClick={() => setConfirmingResolutionSubmit(false)}
                    disabled={submittingResolution}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '0.65rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: submittingResolution ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Lucide.X size={18} />
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.625rem',
                    padding: '1rem 1.25rem',
                    borderTop: '1px solid rgba(203,213,225,0.6)',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingResolutionSubmit(false)}
                    disabled={submittingResolution}
                  >
                    Hủy
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitResolution}
                    disabled={submittingResolution}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    {submittingResolution
                      ? <span className="loading loading-spinner loading-xs" />
                      : <Lucide.Send size={14} />
                    }
                    {submittingResolution ? 'Đang gửi...' : 'Xác nhận gửi'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <DelightToast open={toastOpen} message={toastTitle} sub={toastSubtitle} onClose={() => setToastOpen(false)} />
    </div>
  );
};

export default ProviderReportWorkspacePage;