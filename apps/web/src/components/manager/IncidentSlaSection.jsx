import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { extractApiErrorMessage, slaApi } from '@urbanmind/shared-api';
import { ManagerConfirmDialog, ManagerSectionHeader, ManagerSelectMenu } from './ManagerPageElements';

const SLA_STATUS_META = {
  running: { label: 'Đang chạy', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  paused: { label: 'Tạm dừng', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  completed: { label: 'Đã hoàn thành', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

const TARGET_STATUS_META = {
  pending: { label: 'Đang chờ', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  met: { label: 'Đạt', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  breached: { label: 'Vi phạm', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
};

const EVENT_LABELS = {
  started: 'Bắt đầu tính SLA',
  responded: 'Đã ghi nhận phản hồi đầu tiên',
  paused: 'Tạm dừng SLA',
  resumed: 'Tiếp tục tính SLA',
  responsewarning: 'Cảnh báo sắp trễ hạn phản hồi',
  resolutionwarning: 'Cảnh báo sắp trễ hạn hoàn thành',
  responsebreached: 'Vi phạm hạn phản hồi',
  resolutionbreached: 'Vi phạm hạn hoàn thành',
  recalculated: 'Tính lại SLA theo chính sách mới',
  completed: 'Hoàn thành SLA',
  cancelled: 'Hủy SLA',
};

const TRIGGER_LABELS = {
  user: 'Người dân',
  staff: 'Nhân viên',
  manager: 'Quản lý',
  system: 'Hệ thống',
};

const PAUSE_REASON_OPTIONS = [
  { value: 'WaitingCitizen', label: 'Chờ người dân phản hồi' },
  { value: 'ExternalDependency', label: 'Phụ thuộc đơn vị bên ngoài' },
  { value: 'SystemMaintenance', label: 'Bảo trì hệ thống' },
  { value: 'ForceMajeure', label: 'Sự kiện bất khả kháng' },
  { value: 'Other', label: 'Lý do khác' },
];

const normalizeKey = (value) => String(value ?? '').replace(/[-_\s]/g, '').toLowerCase();

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Đổi số mili giây thành chuỗi đọc được, cắt ở hai đơn vị lớn nhất để không
 * gây nhiễu. Giá trị âm được hiểu là đã quá hạn.
 */
const formatDuration = (milliseconds) => {
  const totalSeconds = Math.floor(Math.abs(milliseconds) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút ${seconds} giây`;
  return `${seconds} giây`;
};

const SlaBadge = ({ value, meta }) => {
  const resolved = meta[normalizeKey(value)] || {
    label: 'Chưa xác định',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${resolved.className}`}>
      {resolved.label}
    </span>
  );
};

/**
 * Một mốc hạn của SLA, ví dụ hạn phản hồi hoặc hạn hoàn thành.
 *
 * Đồng hồ đếm ngược chạy theo giờ máy chủ chứ không theo giờ trình duyệt, vì
 * máy người dùng có thể lệch giờ và làm con số hiển thị sai.
 */
const SlaCountdownCard = ({ title, icon: Icon, dueAt, targetStatus, isWarning, isBreached, progressPercent, nowMs }) => {
  const dueMs = dueAt ? new Date(dueAt).getTime() : Number.NaN;
  const hasDue = Number.isFinite(dueMs);
  const remainingMs = hasDue ? dueMs - nowMs : 0;
  const overdue = hasDue && remainingMs < 0;

  const settled = ['met', 'breached'].includes(normalizeKey(targetStatus));
  const clampedProgress = Math.min(100, Math.max(0, Number(progressPercent) || 0));

  const tone = isBreached || overdue
    ? { bar: 'bg-rose-500', text: 'text-rose-600', ring: 'border-rose-200 bg-rose-50/60' }
    : isWarning
      ? { bar: 'bg-amber-500', text: 'text-amber-600', ring: 'border-amber-200 bg-amber-50/60' }
      : { bar: 'bg-blue-500', text: 'text-blue-600', ring: 'border-blue-200 bg-blue-50/50' };

  return (
    <div className={`rounded-2xl border p-4 ${settled ? 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60' : tone.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
          <Icon size={14} aria-hidden="true" />
          {title}
        </p>
        <SlaBadge value={targetStatus} meta={TARGET_STATUS_META} />
      </div>

      <p className={`mt-3 text-2xl font-bold tracking-[-0.02em] ${settled ? 'text-slate-700 dark:text-slate-200' : tone.text}`}>
        {!hasDue
          ? '—'
          : settled
            ? formatDateTime(dueAt)
            : overdue
              ? `Quá hạn ${formatDuration(remainingMs)}`
              : `Còn ${formatDuration(remainingMs)}`}
      </p>

      {!settled ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className={`h-full rounded-full transition-[width] duration-500 ${tone.bar}`} style={{ width: `${clampedProgress}%` }} />
        </div>
      ) : null}

      <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
        Hạn: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDateTime(dueAt)}</span>
      </p>
    </div>
  );
};

const MetaItem = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">{label}</p>
    <p className="mt-1.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value ?? '—'}</p>
  </div>
);

/**
 * Khối SLA của một sự vụ.
 *
 * Tự tải dữ liệu theo `incidentId` và tự chịu trách nhiệm cho mọi thao tác vòng
 * đời SLA, nên trang chi tiết sự vụ chỉ cần gắn component vào là xong.
 */
export const IncidentSlaSection = ({ incidentId, canManage = false, onChanged }) => {
  const requestIdRef = useRef(0);
  const clockOffsetRef = useRef(0);

  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirmAction, setConfirmAction] = useState(null);
  const [pauseForm, setPauseForm] = useState({ reasonCode: 'WaitingCitizen', reasonNote: '' });
  const [noteDraft, setNoteDraft] = useState('');
  const [timelineOpen, setTimelineOpen] = useState(false);

  const load = useCallback(async ({ background = false } = {}) => {
    if (!incidentId) return;
    const requestId = ++requestIdRef.current;
    if (!background) setLoading(true);
    setError('');

    const [detailResult, statusResult, timelineResult] = await Promise.allSettled([
      slaApi.getCurrentIncidentSla(incidentId),
      slaApi.getIncidentSlaStatus(incidentId),
      slaApi.getIncidentSlaTimeline(incidentId),
    ]);

    if (requestId !== requestIdRef.current) return;

    if (detailResult.status === 'fulfilled') setDetail(detailResult.value ?? null);
    if (timelineResult.status === 'fulfilled') {
      setTimeline(Array.isArray(timelineResult.value) ? timelineResult.value : []);
    }

    if (statusResult.status === 'fulfilled' && statusResult.value) {
      const nextStatus = statusResult.value;
      setStatus(nextStatus);
      /*
       * Ghi lại độ lệch giữa đồng hồ máy chủ và đồng hồ trình duyệt để đếm
       * ngược không bị sai khi máy người dùng lệch giờ.
       */
      const serverMs = nextStatus?.serverTime ? new Date(nextStatus.serverTime).getTime() : Number.NaN;
      clockOffsetRef.current = Number.isFinite(serverMs) ? serverMs - Date.now() : 0;
      setNowMs(Date.now() + clockOffsetRef.current);
    }

    /*
     * Sự vụ chưa khởi động SLA là trạng thái hợp lệ, không phải lỗi. Chỉ báo lỗi
     * khi cả hai lời gọi chính đều thất bại.
     */
    if (detailResult.status === 'rejected' && statusResult.status === 'rejected') {
      const reason = detailResult.reason;
      const notFound = Number(reason?.response?.status) === 404;
      setDetail(null);
      setStatus(null);
      setError(notFound ? '' : extractApiErrorMessage(reason, 'Không thể tải dữ liệu SLA của sự vụ.'));
    }

    setLoading(false);
    setLoaded(true);
  }, [incidentId]);

  useEffect(() => {
    setDetail(null);
    setStatus(null);
    setTimeline([]);
    setLoaded(false);
    void load();
    return () => { requestIdRef.current += 1; };
  }, [load]);

  const isRunning = normalizeKey(detail?.status ?? status?.status) === 'running';
  const isPaused = normalizeKey(detail?.status ?? status?.status) === 'paused';
  const isActive = isRunning || isPaused;

  // Đồng hồ chỉ chạy khi SLA còn đang tính giờ, tránh render thừa mỗi giây.
  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setInterval(() => setNowMs(Date.now() + clockOffsetRef.current), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const runAction = useCallback(async (key, action, successMessage) => {
    setActionLoading(key);
    setActionError('');
    try {
      await action();
      setConfirmAction(null);
      setNoteDraft('');
      setPauseForm({ reasonCode: 'WaitingCitizen', reasonNote: '' });
      await load({ background: true });
      if (typeof onChanged === 'function') onChanged(successMessage);
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Không thể thực hiện thao tác SLA.'));
    } finally {
      setActionLoading('');
    }
  }, [load, onChanged]);

  const handleConfirm = useCallback(() => {
    const type = confirmAction?.type;
    if (!type) return;

    if (type === 'start') {
      void runAction('start', () => slaApi.startIncidentSla(incidentId), 'Đã khởi động SLA cho sự vụ.');
      return;
    }
    if (type === 'pause') {
      void runAction('pause', () => slaApi.pauseIncidentSla(incidentId, {
        reasonCode: pauseForm.reasonCode,
        reasonNote: pauseForm.reasonNote.trim() || null,
      }), 'Đã tạm dừng SLA.');
      return;
    }
    if (type === 'resume') {
      void runAction('resume', () => slaApi.resumeIncidentSla(incidentId, {
        note: noteDraft.trim() || null,
      }), 'Đã tiếp tục tính SLA.');
      return;
    }
    if (type === 'complete') {
      void runAction('complete', () => slaApi.completeIncidentSla(incidentId, {
        note: noteDraft.trim() || null,
      }), 'Đã đóng SLA của sự vụ.');
      return;
    }
    if (type === 'recalculate') {
      void runAction('recalculate', () => slaApi.recalculateIncidentSla(incidentId, {
        note: noteDraft.trim() || null,
      }), 'Đã tính lại SLA theo chính sách hiện hành.');
      return;
    }
    if (type === 'cancel') {
      void runAction('cancel', () => slaApi.cancelIncidentSla(incidentId, noteDraft.trim() || null), 'Đã hủy SLA của sự vụ.');
    }
  }, [confirmAction, incidentId, noteDraft, pauseForm, runAction]);

  const openConfirm = (type, title, description) => {
    setActionError('');
    setNoteDraft('');
    setConfirmAction({ type, title, description });
  };

  const meta = useMemo(() => ([
    { label: 'Chính sách áp dụng', value: detail?.policyName },
    { label: 'Mức ưu tiên', value: detail?.priority },
    { label: 'Bắt đầu lúc', value: formatDateTime(detail?.startedAt ?? status?.startedAt) },
    { label: 'Phản hồi đầu tiên', value: detail?.respondedAt ? formatDateTime(detail.respondedAt) : 'Chưa ghi nhận' },
    { label: 'Tổng thời gian tạm dừng', value: `${Number(detail?.totalPausedMinutes ?? 0)} phút` },
    { label: 'Người khởi động', value: detail?.startedByUserName },
  ]), [detail, status]);

  if (loading && !loaded) {
    return (
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <ManagerSectionHeader id="incident-sla-title" title="SLA sự vụ" description="Đang tải dữ liệu SLA…" icon={Lucide.Timer} />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </section>
    );
  }

  const hasSla = Boolean(detail || status);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
      <ManagerSectionHeader
        id="incident-sla-title"
        title="SLA sự vụ"
        description="Hạn phản hồi, hạn hoàn thành và lịch sử thay đổi SLA của sự vụ này."
        icon={Lucide.Timer}
        actions={hasSla ? <SlaBadge value={detail?.status ?? status?.status} meta={SLA_STATUS_META} /> : null}
      />

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {error ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <Lucide.TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Không thể tải dữ liệu SLA</p>
              <p className="mt-1 leading-6">{error}</p>
            </div>
            <button type="button" onClick={() => void load()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 text-xs font-semibold hover:bg-amber-100 dark:bg-transparent">
              <Lucide.RefreshCcw size={14} aria-hidden="true" />Thử lại
            </button>
          </div>
        ) : null}

        {!hasSla ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <Lucide.TimerOff size={28} className="text-slate-300 dark:text-slate-600" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Sự vụ chưa được tính SLA</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
              {canManage
                ? 'Khởi động SLA để bắt đầu đếm hạn phản hồi và hạn hoàn thành theo chính sách của phường và danh mục.'
                : 'SLA sẽ xuất hiện tại đây sau khi Interaction Manager khởi động theo dõi cho sự vụ.'}
            </p>
            {canManage ? (
              <button
                type="button"
                onClick={() => openConfirm('start', 'Khởi động SLA cho sự vụ?', 'Hệ thống sẽ chọn chính sách SLA theo phường, danh mục và mức ưu tiên hiện tại của sự vụ, rồi bắt đầu đếm hạn ngay lập tức.')}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Lucide.Play size={15} aria-hidden="true" />Khởi động SLA
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <SlaCountdownCard
                title="Hạn phản hồi"
                icon={Lucide.MessageCircleReply}
                dueAt={status?.responseDueAt ?? detail?.responseDueAt}
                targetStatus={status?.responseStatus ?? detail?.responseStatus}
                isWarning={status?.isResponseWarning}
                isBreached={status?.isResponseBreached ?? detail?.isResponseBreached}
                progressPercent={status?.responseProgressPercent}
                nowMs={nowMs}
              />
              <SlaCountdownCard
                title="Hạn hoàn thành"
                icon={Lucide.CircleCheckBig}
                dueAt={status?.resolutionDueAt ?? detail?.resolutionDueAt}
                targetStatus={status?.resolutionStatus ?? detail?.resolutionStatus}
                isWarning={status?.isResolutionWarning}
                isBreached={status?.isResolutionBreached ?? detail?.isResolutionBreached}
                progressPercent={status?.resolutionProgressPercent}
                nowMs={nowMs}
              />
            </div>

            {isPaused ? (
              <p className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <Lucide.PauseCircle size={14} aria-hidden="true" />
                SLA đang tạm dừng nên đồng hồ không chạy. Thời gian tạm dừng không bị tính vào hạn xử lý.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {meta.map((item) => <MetaItem key={item.label} label={item.label} value={item.value} />)}
            </div>

            {canManage ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="mr-auto px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Thao tác SLA</p>

                {isRunning ? (
                  <button type="button" onClick={() => openConfirm('pause', 'Tạm dừng SLA?', 'Đồng hồ SLA sẽ ngừng chạy cho tới khi được tiếp tục. Khoảng thời gian tạm dừng không bị tính vào hạn xử lý.')} className="manager-detail-action">
                    <Lucide.Pause size={15} aria-hidden="true" />Tạm dừng
                  </button>
                ) : null}

                {isPaused ? (
                  <button type="button" onClick={() => openConfirm('resume', 'Tiếp tục tính SLA?', 'Đồng hồ SLA sẽ chạy trở lại từ thời điểm hiện tại.')} className="manager-detail-action">
                    <Lucide.Play size={15} aria-hidden="true" />Tiếp tục
                  </button>
                ) : null}

                {isActive ? (
                  <>
                    <button type="button" onClick={() => openConfirm('recalculate', 'Tính lại SLA?', 'Hệ thống sẽ áp lại chính sách SLA hiện hành theo phường, danh mục và mức ưu tiên mới nhất của sự vụ. Các mốc hạn có thể thay đổi.')} className="manager-detail-action">
                      <Lucide.RefreshCw size={15} aria-hidden="true" />Tính lại
                    </button>
                    <button type="button" onClick={() => openConfirm('complete', 'Đóng SLA của sự vụ?', 'SLA sẽ được ghi nhận là hoàn thành và ngừng theo dõi. Thao tác này không đổi trạng thái của sự vụ.')} className="manager-detail-action">
                      <Lucide.BadgeCheck size={15} aria-hidden="true" />Hoàn thành
                    </button>
                    <button type="button" onClick={() => openConfirm('cancel', 'Hủy SLA của sự vụ?', 'SLA sẽ ngừng theo dõi và được đánh dấu là đã hủy. Dùng khi sự vụ không còn thuộc phạm vi cam kết xử lý.')} className="manager-detail-action">
                      <Lucide.CircleSlash size={15} aria-hidden="true" />Hủy SLA
                    </button>
                  </>
                ) : null}

                {detail?.incidentSlaId ? (
                  <button
                    type="button"
                    disabled={actionLoading === 'check'}
                    onClick={() => void runAction('check', () => slaApi.checkIncidentSlaViolation(detail.incidentSlaId), 'Đã kiểm tra vi phạm SLA.')}
                    className="manager-detail-action manager-detail-action--primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'check' ? <Lucide.LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Lucide.ShieldAlert size={15} aria-hidden="true" />}
                    Kiểm tra vi phạm
                  </button>
                ) : null}
              </div>
            ) : null}

            {actionError ? <p className="text-sm font-medium text-rose-600">{actionError}</p> : null}

            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTimelineOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                aria-expanded={timelineOpen}
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  <Lucide.History size={16} aria-hidden="true" />
                  Lịch sử SLA
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-900">{timeline.length}</span>
                </span>
                <Lucide.ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${timelineOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {timelineOpen ? (
                timeline.length === 0 ? (
                  <p className="border-t border-slate-100 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800">Chưa có sự kiện SLA nào được ghi nhận.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                    {timeline.map((event) => (
                      <li key={event?.slaEventId} className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {EVENT_LABELS[normalizeKey(event?.eventType)] || 'Cập nhật SLA'}
                          </p>
                          <span className="text-xs text-slate-400">{formatDateTime(event?.createdAt)}</span>
                        </div>
                        {event?.note ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600 dark:text-slate-300">{event.note}</p> : null}
                        <p className="mt-1 text-[11px] text-slate-400">
                          Nguồn: {TRIGGER_LABELS[normalizeKey(event?.triggerSource)] || 'Không xác định'}
                          {event?.oldStatus && event?.newStatus ? ` · ${event.oldStatus} → ${event.newStatus}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          </div>
        )}
      </div>

      <ManagerConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title || 'Xác nhận thao tác SLA'}
        description={confirmAction?.description}
        confirmLabel="Xác nhận"
        tone={confirmAction?.type === 'cancel' ? 'danger' : 'warning'}
        loading={Boolean(actionLoading)}
        onCancel={() => { setConfirmAction(null); setActionError(''); }}
        onConfirm={handleConfirm}
      >
        {confirmAction?.type === 'pause' ? (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Lý do tạm dừng</span>
              <ManagerSelectMenu
                value={pauseForm.reasonCode}
                options={PAUSE_REASON_OPTIONS}
                onChange={(value) => setPauseForm((current) => ({ ...current, reasonCode: value }))}
                ariaLabel="Chọn lý do tạm dừng SLA"
                className="mt-2 w-full font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span></span>
              <textarea
                value={pauseForm.reasonNote}
                onChange={(event) => setPauseForm((current) => ({ ...current, reasonNote: event.target.value }))}
                rows={3}
                placeholder="Ví dụ: đang chờ người dân bổ sung hình ảnh hiện trường."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900"
              />
            </label>
          </div>
        ) : confirmAction && confirmAction.type !== 'start' ? (
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span></span>
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={3}
              placeholder="Ghi chú sẽ được lưu vào lịch sử SLA."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900"
            />
          </label>
        ) : null}
        {actionError ? <p className="mt-3 text-sm font-medium text-rose-600">{actionError}</p> : null}
      </ManagerConfirmDialog>
    </section>
  );
};

export default IncidentSlaSection;
