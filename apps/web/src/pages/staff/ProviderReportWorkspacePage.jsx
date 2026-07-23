import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { LoadingSpinner, CompletionDocumentsCard, ConfirmationModal } from '@urbanmind/shared-ui';
import { canTransitionProviderReportStatus, normalizeProviderReportStatus } from '@urbanmind/shared-api';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import DelightToast from '../../components/delight/DelightToast';

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

/* ─── Step definitions ───────────────────────────────────────────────────── */

const STEPS = [
  { id: 'overview',              label: 'Tổng quan',            icon: Lucide.LayoutDashboard, description: 'Thông tin nhà thầu & cập nhật trạng thái' },
  { id: 'contact-logs',         label: 'Lịch sử liên hệ',      icon: Lucide.Phone,           description: 'Ghi nhận lịch sử liên hệ với nhà thầu'  },
  { id: 'completion-documents', label: 'Tài liệu hoàn thành',  icon: Lucide.FileText,        description: 'Tải lên tài liệu bằng chứng hoàn thành'  },
  { id: 'resolution',           label: 'Kết quả xử lý',        icon: Lucide.CheckSquare,     description: 'Gửi kết quả xử lý chờ phê duyệt',  requiresDone: true },
  { id: 'submitted',            label: 'Chờ phê duyệt',        icon: Lucide.Send,            description: 'Đã gửi — chờ quản lý phê duyệt',    terminal: true },
];

/* ─── Status chip colours ────────────────────────────────────────────────── */

const STATUS_COLOR = {
  Done:       { bg: 'var(--color-success-bg)', fg: 'var(--color-success)',  bd: 'rgba(4,120,87,0.18)' },
  InProgress: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)',  bd: 'rgba(180,83,9,0.18)'  },
  Failed:     { bg: 'var(--color-danger-bg)',  fg: 'var(--color-danger)',   bd: 'rgba(185,28,28,0.18)' },
  Cancelled:  { bg: '#f1f5f9',                 fg: '#475569',               bd: 'rgba(71,85,105,0.15)' },
  Accepted:   { bg: 'var(--color-info-bg)',    fg: 'var(--color-info)',     bd: 'rgba(37,99,235,0.15)' },
  Contacted:  { bg: 'var(--color-info-bg)',    fg: 'var(--color-info)',     bd: 'rgba(37,99,235,0.15)' },
  Reported:   { bg: '#f1f5f9',                 fg: '#475569',               bd: 'rgba(71,85,105,0.12)' },
};

const statusChip = (status) => {
  const c = STATUS_COLOR[status] ?? { bg: '#f1f5f9', fg: '#475569', bd: 'rgba(71,85,105,0.12)' };
  return { backgroundColor: c.bg, color: c.fg, border: `1px solid ${c.bd}` };
};

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
      const statusLocked = (step.id === 'completion-documents' && !canAccessCompletionDocuments) || (step.requiresDone && !canAccessResolution);
      const isLocked    = idx > maxReached || statusLocked || (step.requiresDone && !canAccessResolution && idx > currentIndex);
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
              {step.requiresDone && !canAccessResolution && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-warning)', fontWeight: 600, lineHeight: 1.3, marginTop: '1px' }}>
                  Yêu cầu trạng thái: Done
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
const StepFooter = ({ currentIndex, totalSteps, onBack, onNext, nextLabel, nextDisabled, nextLoading, nextVariant = 'primary' }) => {
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
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#475569' }}
        >
          <Lucide.ArrowLeft size={14} />
          Quay lại
        </button>
      )}
      {!isLast && (
        <button
          type="button"
          className={`btn btn-sm ${nextVariant === 'primary' ? 'btn-primary' : 'btn-success'}`}
          onClick={onNext}
          disabled={nextDisabled}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          {nextLoading ? <span className="loading loading-spinner loading-xs" /> : null}
          {nextLabel || 'Bước tiếp theo'}
          {!nextLoading && <Lucide.ArrowRight size={14} />}
        </button>
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

  /* ── Derive active step id from index ──────────────────────────────────── */
  const activeStepId = STEPS[stepIndex]?.id ?? 'overview';

  /* ── Navigation helpers ─────────────────────────────────────────────────── */
  const canNavigateToStep = (idx) => {
    const step = STEPS[idx];
    if (!step) return false;
    if (step.id === 'completion-documents' && !canAccessCompletionDocuments) return false;
    if (step.id === 'resolution' && !canAccessResolution) return false;
    return true;
  };

  const goTo = (idx) => {
    if (!canNavigateToStep(idx)) {
      if (STEPS[idx]?.id === 'completion-documents') {
        openToast('Bước bị khóa', 'Bạn cần chấp thuận báo cáo trước khi tải lên tài liệu hoàn thành.');
      } else if (STEPS[idx]?.id === 'resolution') {
        openToast('Bước bị khóa', 'Bạn cần đánh dấu báo cáo là Done trước khi gửi kết quả xử lý.');
      }
      return;
    }
    setStepIndex(idx);
    setMaxReached((prev) => Math.max(prev, idx));
  };
  const goNext = () => goTo(stepIndex + 1);
  const goBack = () => setStepIndex((prev) => Math.max(0, prev - 1));

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      const feedbackId = report?.feedbackId || report?.feedback?.feedbackId || null;
      if (!feedbackId || activeStepId !== 'resolution') return;
      setResolutionsLoading(true); setResolutionsError('');
      try {
        const res = await managementFeedbackApi.getResolutions(feedbackId);
        const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : [];
        if (active) { setExistingResolutions(list); }
      } catch (err) { console.error('Failed to load resolutions', err); if (active) { setResolutionsError(err?.message || 'Không thể tải resolution.'); setExistingResolutions([]); } }
      finally { if (active) setResolutionsLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [activeStepId, report?.feedbackId, report?.feedback?.feedbackId]);

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
  const canAccessCompletionDocuments = ['Accepted', 'InProgress', 'Done'].includes(currentStatus);
  const canAccessResolution   = currentStatus === 'Done';
  const isResolutionSubmitted = existingResolutions.length > 0;

  const statusHistoryItems = useMemo(() => {
    const history = Array.isArray(report?.statusHistory)
      ? report.statusHistory.map((item) => ({
          status: normalizeProviderReportStatus(item?.status || item?.newStatus || item?.value || ''),
          updatedAt: item?.updatedAt || item?.changedAt || report?.updatedAt || report?.createdAt || '',
          note: item?.note || item?.comment || '',
        }))
      : [];
    if (history.length > 0) return history;
    return [{ status: currentStatus || 'Assigned', updatedAt: report?.updatedAt || report?.createdAt || '', note: 'Trạng thái hiện tại' }];
  }, [report, currentStatus]);

  const sortedContactLogs = useMemo(() =>
    [...contactLogs].sort((a, b) => new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime()),
    [contactLogs]
  );

  const imageDocuments = useMemo(() =>
    documents.filter((d) => {
      const n = String(d?.fileName || d?.name || '').toLowerCase();
      return n.match(/\.(png|jpe?g|gif|webp|svg)$/) || d?.contentType?.includes('image');
    }),
    [documents]
  );

  const workflowChecklist = useMemo(() => {
    const hasLogs = contactLogs.length > 0;
    const hasDocs = documents.length > 0;
    const isContacted = ['Contacted', 'Accepted', 'InProgress', 'Done'].includes(currentStatus);
    const isAccepted = ['Accepted', 'InProgress', 'Done'].includes(currentStatus);
    const isInProgress = ['InProgress', 'Done'].includes(currentStatus);
    const isDone = currentStatus === 'Done';

    return [
      { label: 'Báo cáo nhận', completed: Boolean(report) },
      { label: 'Đã tạo contact log', completed: hasLogs || isContacted },
      { label: 'Đã xác nhận chấp thuận', completed: isAccepted },
      { label: 'Tài liệu hoàn thành sẵn sàng', completed: hasDocs || isInProgress || isDone },
      { label: 'Đã đánh dấu hoàn tất', completed: isDone },
      { label: 'Sẵn sàng kết quả', completed: isDone || isResolutionSubmitted },
    ];
  }, [contactLogs.length, currentStatus, documents.length, isResolutionSubmitted, report]);

  const workflowProgress = useMemo(() => {
    const completed = workflowChecklist.filter((item) => item.completed).length;
    return Math.round((completed / workflowChecklist.length) * 100);
  }, [workflowChecklist]);

  const workflowAction = useMemo(() => {
    if (currentStatus === 'Done') {
      return {
        title: 'Ready for Resolution Submission',
        description: 'Báo cáo đã hoàn tất. Tiếp theo là gửi kết quả xử lý để chuyển sang phê duyệt.',
        actionLabel: 'Submit Resolution',
        targetStep: 'resolution',
        nextStatus: null,
        disabled: false,
      };
    }

    if (currentStatus === 'InProgress') {
      return {
        title: 'Recommended next action: Mark Done',
        description: 'Sau khi tài liệu hoàn thành đã được tải lên, hãy đánh dấu báo cáo là hoàn tất.',
        actionLabel: 'Mark Done',
        targetStep: 'overview',
        nextStatus: 'Done',
        disabled: false,
      };
    }

    if (currentStatus === 'Accepted') {
      return {
        title: 'Recommended next action: Upload Completion Documents',
        description: 'Sau khi báo cáo được chấp thuận, hãy tải lên ít nhất một tài liệu hoàn thành.',
        actionLabel: 'Upload Completion Documents',
        targetStep: 'completion-documents',
        nextStatus: null,
        disabled: false,
      };
    }

    if (currentStatus === 'Contacted') {
      return {
        title: 'Recommended next action: Mark Accepted',
        description: 'Sau khi đã có contact log, hãy chấp nhận báo cáo và mở khóa bước tài liệu hoàn thành.',
        actionLabel: 'Mark Accepted',
        targetStep: 'overview',
        nextStatus: 'Accepted',
        disabled: false,
      };
    }

    return {
      title: 'Recommended next action: Create Contact Log',
      description: 'Bắt đầu quy trình bằng một bản ghi liên hệ trước khi tiếp tục bước chấp thuận.',
      actionLabel: 'Create Contact Log',
      targetStep: 'contact-logs',
      nextStatus: null,
      disabled: false,
    };
  }, [currentStatus]);

  /* visible steps for the rail (hide terminal until submitted) */
  const visibleSteps = STEPS.filter((s) => !s.terminal || isResolutionSubmitted);
  const totalVisible = visibleSteps.length;

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

  const handleDocumentUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const supported = files.filter((f) => {
      const ext = String(f.name || '').split('.').pop()?.toLowerCase();
      return ['image/jpeg','image/png','application/pdf'].includes(f.type) || ['jpg','jpeg','png','pdf'].includes(ext);
    });
    const desc = String(documentDescription || '').trim();
    if (desc.length > 1000) { setUploadError('Mô tả không được vượt quá 1000 ký tự.'); event.target.value = ''; return; }
    if (supported.length !== files.length) setUploadError('Chỉ hỗ trợ tệp JPG, PNG hoặc PDF.');
    if (!supported.length) { event.target.value = ''; return; }
    const firstCompletionUpload = currentStatus === 'Accepted' && documents.length === 0;
    setUploadingDocuments(true); setUploadError('');
    try {
      for (const f of supported) await managementFeedbackApi.uploadCompletionDocument(providerReportId, f, { fileName: f.name, description: desc });
      const res = await managementFeedbackApi.getProviderReportCompletionDocuments(providerReportId);
      setDocuments(Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : []);
      setDocumentDescription('');
      openToast('Đã tải lên tài liệu', 'Tài liệu hoàn thành đã được tải lên thành công.');
      if (firstCompletionUpload) {
        await performStatusTransition('InProgress', 'Tự động chuyển trạng thái sau khi tải lên tài liệu hoàn thành đầu tiên.', { auto: true });
      }
    } catch (err) { console.error('Upload failed', err); setUploadError(err?.message || 'Không thể tải lên tài liệu.'); }
    finally { setUploadingDocuments(false); event.target.value = ''; }
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

    goTo(STEPS.findIndex((step) => step.id === workflowAction.targetStep));
  };

  const handleLogInputChange = (key, value) => setLogForm((prev) => ({ ...prev, [key]: value }));
  const handleSaveLog = async (event) => {
    event.preventDefault(); setLogFormError('');
    const method = String(logForm.contactMethod || '').trim();
    const result = String(logForm.contactResult || '').trim();
    const at     = String(logForm.contactedAt   || '').trim();
    const shouldAutoTransition = currentStatus === 'Reported' && contactLogs.length === 0;
    if (!method || !result || !at) { setLogFormError('Vui lòng điền phương thức, kết quả và thời điểm liên hệ.'); return; }
    setLogSaving(true);
    try {
      const created = await managementFeedbackApi.createProviderReportContactLog(providerReportId, { contactMethod: method, contactResult: result, contactNote: String(logForm.contactNote || '').trim() || null, contactedAt: at });
      setContactLogs((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      openToast('Đã lưu lịch sử liên hệ', 'Nhật ký liên hệ mới đã được thêm.');
      setLogForm({ contactMethod: '', contactResult: '', contactNote: '', contactedAt: toLocalDateTimeValue() });
      if (shouldAutoTransition) {
        await performStatusTransition('Contacted', 'Tự động chuyển trạng thái sau khi tạo nhật ký liên hệ đầu tiên.', { auto: true });
      }
    } catch (err) { console.error('Save log failed', err); setLogFormError(err?.message || 'Không thể lưu bản ghi liên hệ.'); }
    finally { setLogSaving(false); }
  };

  const handleSubmitResolution = async () => {
    const summary = String(resolutionForm.resolutionSummary || '').trim();
    const action  = String(resolutionForm.actionTaken       || '').trim();
    const result  = String(resolutionForm.resultNote        || '').trim();
    if (!summary || !action) { setResolutionError('Vui lòng nhập Tóm tắt kết quả và Hành động đã thực hiện.'); return; }
    setSubmittingResolution(true); setResolutionError('');
    try {
      const feedbackId = report?.feedbackId || report?.feedback?.feedbackId || report?.id || providerReportId;
      await managementFeedbackApi.submitResolution({
        feedbackId,
        status: 'SubmittedForApproval',
        resolutionSummary: summary,
        actionTaken: action,
        resultNote: result,
        completionImages: resolutionImages.map((img) => ({ fileName: img.fileName, previewUrl: img.previewUrl })),
      });
      setExistingResolutions([{ resolutionSummary: summary, actionTaken: action, resultNote: result, status: 'SubmittedForApproval', createdByStaffUserName: 'You', resolvedAt: new Date().toISOString() }]);
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
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Quay lại</button>
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
            <span style={{ ...statusChip(currentStatus), padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.8 }}>
              {currentStatus || 'Không rõ'}
            </span>
            {feedbackId && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <Lucide.ExternalLink size={13} /> Mở phản ánh
              </button>
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
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563eb' }}>Recommended next action</div>
                <h3 style={{ margin: '0.25rem 0 0.35rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{workflowAction.title}</h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.55 }}>{workflowAction.description}</p>
                {workflowAction.missingRequirement && (
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600, lineHeight: 1.5 }}>
                    {workflowAction.missingRequirement}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleWorkflowActionClick}
                  disabled={statusUpdating || workflowAction.disabled}
                >
                  {workflowAction.actionLabel}
                </button>
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
                  <span style={{ ...statusChip(currentStatus), padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.8 }}>
                    {currentStatus || 'Không rõ'}
                  </span>
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
                  sub="Lịch sử liên hệ với nhà thầu."
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
                <SectionHeader title="Ghi nhật ký liên hệ" sub="Ghi lại chi tiết cuộc gọi, email hoặc tin nhắn với nhà thầu." />
                <div style={{ padding: '1rem 1.25rem' }}>
                  {logFormError && <div style={{ marginBottom: '0.75rem' }}><ErrorAlert message={logFormError} onClose={() => setLogFormError('')} /></div>}
                  <form onSubmit={handleSaveLog} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'grid', gap: '0.875rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span style={fieldLabel}>Phương thức liên hệ <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                        <input value={logForm.contactMethod} onChange={(e) => handleLogInputChange('contactMethod', e.target.value)} placeholder="Gọi điện / Email / Tin nhắn" className="input input-bordered w-full" required />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span style={fieldLabel}>Kết quả <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                        <input value={logForm.contactResult} onChange={(e) => handleLogInputChange('contactResult', e.target.value)} placeholder="Đã liên hệ thành công / Không có phản hồi" className="input input-bordered w-full" required />
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
                      <button type="submit" className="btn btn-outline btn-sm" disabled={logSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        {logSaving ? <span className="loading loading-spinner loading-xs" /> : <Lucide.Plus size={13} />}
                        {logSaving ? 'Đang lưu...' : 'Lưu liên hệ'}
                      </button>
                    </div>
                  </form>
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
                sub="Tải lên bằng chứng hoàn thành từ nhà thầu trước khi tiếp tục."
                action={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" style={{ display: 'none' }} onChange={handleDocumentUpload} />
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingDocuments} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      {uploadingDocuments ? <span className="loading loading-spinner loading-xs" /> : <Lucide.UploadCloud size={13} />}
                      {uploadingDocuments ? 'Đang tải...' : 'Tải lên'}
                    </button>
                  </div>
                }
              />

              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <span style={fieldLabel}>Mô tả <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(tùy chọn)</span></span>
                  <textarea value={documentDescription} onChange={(e) => setDocumentDescription(e.target.value)} placeholder="Thêm mô tả cho bằng chứng hoàn thành..." rows={2} maxLength={1000} className="textarea textarea-bordered w-full" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>Hỗ trợ: JPG, PNG, PDF</span>
                    <span>{documentDescription.trim().length}/1000</span>
                  </div>
                </label>

                {uploadError && <ErrorAlert message={uploadError} onClose={() => setUploadError('')} />}

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
              {!canAccessResolution && (
                <div style={{ margin: '0 1.25rem 1rem', padding: '0.75rem 1rem', borderRadius: '0.875rem', backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(180,83,9,0.18)', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                  <Lucide.AlertTriangle size={15} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', lineHeight: 1.45 }}>
                    <strong>Bước tiếp theo bị khóa.</strong> Bạn cần cập nhật trạng thái báo cáo xử lý thành <strong>Hoàn thành (Done)</strong> từ bước Tổng quan trước khi có thể gửi Kết quả xử lý.
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

                {!canAccessResolution && (
                  <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', borderRadius: '0.875rem', backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(180,83,9,0.2)', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <Lucide.AlertTriangle size={15} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', lineHeight: 1.45 }}>
                      <strong>Báo cáo xử lý phải ở trạng thái Hoàn thành (Done)</strong> trước khi gửi Kết quả xử lý. Quay lại bước Tổng quan để cập nhật.
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
                          disabled={!canAccessResolution}
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
                  </div>
                )}
              </div>

              <StepFooter
                currentIndex={visibleStepIndex}
                totalSteps={totalVisible}
                onBack={goBack}
                onNext={() => setConfirmingResolutionSubmit(true)}
                nextLabel={submittingResolution ? 'Đang gửi...' : 'Gửi kết quả xử lý'}
                nextDisabled={submittingResolution || !canAccessResolution || existingResolutions.length > 0}
                nextLoading={submittingResolution}
                nextVariant="primary"
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
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Lucide.ArrowLeft size={13} /> Quay lại phản ánh
                  </button>
                </div>
              )}
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
                  <button key={label} type="button" className="btn btn-ghost btn-sm" onClick={() => showImagePreview(dir)} aria-label={label} style={{ color: '#cbd5e1' }}><Icon size={16} /></button>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={closeImagePreview} aria-label="Đóng" style={{ color: '#cbd5e1' }}><Lucide.X size={16} /></button>
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
          {resolutionImages.length > 0 && (
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>Hình ảnh</div>
              <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                {resolutionImages.map((img, idx) => <img key={`${img.fileName}-${idx}`} src={img.previewUrl} alt={img.fileName} style={{ height: '5.5rem', width: '100%', borderRadius: '0.625rem', objectFit: 'cover' }} />)}
              </div>
            </div>
          )}
        </div>
      </ConfirmationModal>

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
