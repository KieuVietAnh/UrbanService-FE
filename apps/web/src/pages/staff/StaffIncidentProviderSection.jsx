import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { extractApiErrorMessage, incidentManagementApi } from '@urbanmind/shared-api';

import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import EmptyState from '../../components/design-system/EmptyState';
import StaffIncidentActionDialog from './StaffIncidentActionDialog';
import StaffIncidentProgressSection from './StaffIncidentProgressSection';
import {
  EMPTY_VALUE,
  formatOperationalDateTime,
} from './incidentDetailPresentation';
import {
  canManageIncidentExecution,
  getProviderStatusIntent,
  getProviderStatusLabel,
} from './staffIncidentProcessing';

const PROVIDER_STATE = Object.freeze({
  LOADING: 'loading',
  CANDIDATES: 'candidates',
  ASSIGNED: 'assigned',
  EMPTY: 'empty',
  RESTRICTED: 'restricted',
  API_UNAVAILABLE: 'api-unavailable',
  ERROR: 'error',
});

const sameIdentifier = (left, right) => (
  Boolean(String(left ?? '').trim() && String(right ?? '').trim())
  && String(left).trim().toLowerCase() === String(right).trim().toLowerCase()
);

const getCoordinatorId = (candidate) => {
  const value = Number(candidate?.coordinatorId);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};

const getCandidateName = (candidate) => (
  String(candidate?.providerName ?? '').trim()
  || String(candidate?.coordinatorName ?? '').trim()
  || 'Đơn vị chưa có tên'
);

const getActionErrorMessage = (error, fallback) => {
  if (!error?.response && !error?.status && !error?.code && String(error?.message ?? '').trim()) {
    return String(error.message).trim();
  }
  return extractApiErrorMessage(error, fallback);
};

function ProviderSkeleton() {
  return (
    <div className="space-y-3 p-5 sm:p-6" aria-busy="true" aria-label="Đang tải đơn vị xử lý">
      <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/70" />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/70" />
        <div className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/70" />
      </div>
      <span className="sr-only">Đang tải dữ liệu</span>
    </div>
  );
}

function ProviderCandidateCard({ candidate, disabled, onSelect, selected }) {
  const coordinatorId = getCoordinatorId(candidate);
  const providerName = getCandidateName(candidate);

  return (
    <label className={`group relative block min-w-0 rounded-2xl border p-4 transition focus-within:ring-4 focus-within:ring-blue-100 dark:focus-within:ring-blue-950 ${selected ? 'border-blue-400 bg-blue-50/65 shadow-[0_14px_30px_rgba(37,99,235,0.1)] dark:border-blue-700 dark:bg-blue-950/25' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/25 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900'}`}>
      <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${selected ? 'bg-blue-600' : 'bg-transparent'}`} aria-hidden="true" />
      <span className="flex items-start gap-3">
        <input
          type="radio"
          name="incident-provider"
          value={coordinatorId || ''}
          checked={selected}
          disabled={disabled || !coordinatorId}
          onChange={() => coordinatorId && onSelect(coordinatorId)}
          className="sr-only"
        />
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${selected ? 'bg-blue-600 text-white ring-blue-600' : 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/45 dark:text-blue-300 dark:ring-blue-900'}`} aria-hidden="true">
          <Lucide.Building2 size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-2">
            <strong className="break-words text-sm leading-6 text-slate-950 dark:text-white">{providerName}</strong>
            {candidate?.isPrimary ? <Badge intent="success">Ưu tiên chính</Badge> : null}
          </span>
          <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Đầu mối: {String(candidate?.coordinatorName ?? '').trim() || EMPTY_VALUE}
          </span>
        </span>
      </span>

      <dl className="mt-4 grid gap-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-800 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="font-semibold text-slate-500 dark:text-slate-400">Liên hệ</dt>
          <dd className="mt-1 break-words font-bold text-slate-800 dark:text-slate-100">
            {candidate?.phoneNumber || candidate?.email || EMPTY_VALUE}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold text-slate-500 dark:text-slate-400">Hợp đồng</dt>
          <dd className="mt-1 break-words font-bold text-slate-800 dark:text-slate-100">
            {candidate?.contractName || candidate?.contractCode || EMPTY_VALUE}
          </dd>
        </div>
      </dl>
    </label>
  );
}

function CurrentProvider({ assignment }) {
  return (
    <div className="p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <article className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/65 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/25">
          <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_10px_22px_rgba(5,150,105,0.2)]" aria-hidden="true">
              <Lucide.Building2 size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">Đơn vị đang xử lý</p>
              <h3 className="mt-1 break-words text-base font-black leading-6 text-slate-950 dark:text-white">
                {assignment?.providerName || 'Đơn vị chưa có tên'}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Đầu mối: {assignment?.coordinatorName || EMPTY_VALUE}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Badge intent={getProviderStatusIntent(assignment?.reportStatus)}>
              Trạng thái đơn vị: {getProviderStatusLabel(assignment?.reportStatus)}
            </Badge>
          </div>
        </article>

        <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2">
          {[
            ['Điện thoại', assignment?.phoneNumber],
            ['Email', assignment?.email],
            ['Địa chỉ', assignment?.address],
            ['Người phân công', assignment?.assignedByStaffUserName],
            ['Phân công lúc', formatOperationalDateTime(assignment?.assignedAt)],
            ['Cập nhật gần nhất', formatOperationalDateTime(assignment?.updatedAt)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-900/65">
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="mt-1 break-words font-bold leading-5 text-slate-900 dark:text-slate-100">{value || EMPTY_VALUE}</dd>
            </div>
          ))}
        </dl>
      </div>

      {assignment?.note ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/55 p-4 text-sm leading-6 text-slate-700 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-slate-200">
          <Lucide.NotebookPen className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300" size={17} aria-hidden="true" />
          <p><strong>Ghi chú phân công:</strong> {assignment.note}</p>
        </div>
      ) : null}

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
        <Lucide.LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Backend quy định mỗi sự vụ chỉ có một đơn vị xử lý và không hỗ trợ thay đổi đơn vị.
      </p>
    </div>
  );
}

export default function StaffIncidentProviderSection({ incident, onIncidentUpdated, user }) {
  const incidentId = String(incident?.incidentId ?? '').trim();
  const capability = incidentManagementApi.capabilities.providerAssignment;
  const canManage = canManageIncidentExecution(incident, user);
  const [state, setState] = useState(capability.available ? PROVIDER_STATE.LOADING : PROVIDER_STATE.API_UNAVAILABLE);
  const [assignment, setAssignment] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState(null);
  const [assignmentNote, setAssignmentNote] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const sortedCandidates = useMemo(() => [...candidates].sort((left, right) => {
    if (Boolean(left?.isPrimary) !== Boolean(right?.isPrimary)) return left?.isPrimary ? -1 : 1;
    return Number(left?.priorityOrder || 0) - Number(right?.priorityOrder || 0);
  }), [candidates]);
  const selectedCandidate = useMemo(
    () => sortedCandidates.find((candidate) => getCoordinatorId(candidate) === selectedCoordinatorId) || null,
    [selectedCoordinatorId, sortedCandidates],
  );

  useEffect(() => {
    if (!capability.available || !incidentId) {
      setState(PROVIDER_STATE.API_UNAVAILABLE);
      return undefined;
    }

    const controller = new AbortController();
    const load = async () => {
      setState(PROVIDER_STATE.LOADING);
      setMessage({ type: '', text: '' });
      try {
        const currentAssignment = await incidentManagementApi.getIncidentProviderAssignment(
          incidentId,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;

        if (currentAssignment) {
          if (!sameIdentifier(currentAssignment?.incidentId, incidentId)) {
            throw new Error('Dữ liệu đơn vị xử lý không thuộc sự vụ đang mở.');
          }
          setAssignment(currentAssignment);
          setCandidates([]);
          setState(PROVIDER_STATE.ASSIGNED);
          return;
        }

        setAssignment(null);
        if (!canManage) {
          setCandidates([]);
          setState(PROVIDER_STATE.RESTRICTED);
          return;
        }

        const result = await incidentManagementApi.getIncidentProviderCandidates(
          incidentId,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setCandidates(result);
        setSelectedCoordinatorId(null);
        setState(result.length > 0 ? PROVIDER_STATE.CANDIDATES : PROVIDER_STATE.EMPTY);
      } catch (error) {
        if (controller.signal.aborted || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
        setAssignment(null);
        setCandidates([]);
        const status = Number(error?.status ?? error?.response?.status);
        setState([404, 405].includes(status) ? PROVIDER_STATE.API_UNAVAILABLE : PROVIDER_STATE.ERROR);
        setMessage({
          type: 'error',
          text: getActionErrorMessage(error, 'Không thể tải thông tin đơn vị xử lý.'),
        });
      }
    };

    void load();
    return () => controller.abort();
  }, [canManage, capability.available, incidentId, refreshVersion]);

  const retry = useCallback(() => setRefreshVersion((current) => current + 1), []);
  const closeDialog = useCallback(() => {
    if (!submitting) setDialogOpen(false);
  }, [submitting]);

  const assignProvider = async () => {
    if (!selectedCandidate || submitting) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const latestIncident = await incidentManagementApi.getIncidentById(incidentId);
      if (!latestIncident || !canManageIncidentExecution(latestIncident, user)) {
        throw new Error('Sự vụ không còn được phân công cho bạn hoặc không còn ở trạng thái cho phép phân công đơn vị.');
      }

      const existingAssignment = await incidentManagementApi.getIncidentProviderAssignment(incidentId);
      if (existingAssignment) {
        setAssignment(existingAssignment);
        setCandidates([]);
        setState(PROVIDER_STATE.ASSIGNED);
        throw new Error('Sự vụ đã có đơn vị xử lý. Dữ liệu mới nhất đã được tải lại.');
      }

      const createdAssignment = await incidentManagementApi.assignIncidentProvider(incidentId, {
        coordinatorId: getCoordinatorId(selectedCandidate),
        note: assignmentNote,
      });
      if (!createdAssignment || !sameIdentifier(createdAssignment?.incidentId, incidentId)) {
        throw new Error('Backend trả về dữ liệu phân công không thuộc sự vụ đang mở.');
      }

      setAssignment(createdAssignment);
      setCandidates([]);
      setSelectedCoordinatorId(null);
      setAssignmentNote('');
      setState(PROVIDER_STATE.ASSIGNED);
      setDialogOpen(false);
      setMessage({ type: 'success', text: 'Đã phân công đơn vị xử lý cho sự vụ.' });
      onIncidentUpdated?.(latestIncident);
    } catch (error) {
      setDialogOpen(false);
      setMessage({
        type: 'error',
        text: getActionErrorMessage(error, 'Không thể phân công đơn vị xử lý.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const stateContent = {
    [PROVIDER_STATE.EMPTY]: {
      icon: Lucide.Building2,
      title: 'Không có đơn vị xử lý phù hợp',
      description: 'Hiện chưa có đơn vị nào phù hợp với khu vực và danh mục của sự vụ.',
    },
    [PROVIDER_STATE.RESTRICTED]: {
      icon: Lucide.ShieldAlert,
      title: 'Bạn không thể phân công đơn vị xử lý',
      description: 'Chỉ Staff đang phụ trách mới có thể chọn đơn vị cho sự vụ ở trạng thái xử lý phù hợp.',
    },
    [PROVIDER_STATE.API_UNAVAILABLE]: {
      icon: Lucide.ServerOff,
      title: 'Chưa có API hỗ trợ tìm đơn vị xử lý cho sự vụ',
      description: 'API đơn vị xử lý hiện chưa khả dụng trên môi trường đang sử dụng.',
    },
    [PROVIDER_STATE.ERROR]: {
      icon: Lucide.TriangleAlert,
      title: 'Không thể tải danh sách đơn vị xử lý',
      description: message.text || 'Đã xảy ra lỗi khi kết nối với máy chủ.',
      action: (
        <Button type="button" variant="outline" size="sm" onClick={retry}>
          <Lucide.RefreshCw size={16} aria-hidden="true" />
          Thử lại
        </Button>
      ),
    },
  }[state];

  return (
    <>
      <section className="admin-panel overflow-hidden" aria-labelledby="incident-provider-title">
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/65 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 dark:border-slate-800 dark:bg-slate-950/25">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/55 dark:text-emerald-300" aria-hidden="true">
            <Lucide.Building2 size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="incident-provider-title" className="admin-section-title">Đơn vị xử lý</h2>
            <p className="admin-section-description mt-1">Chọn đơn vị phù hợp để phối hợp xử lý sự vụ theo khu vực và danh mục.</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Lucide.UserRoundCheck size={13} aria-hidden="true" />
          Staff phụ trách: {incident?.assignedStaffName || EMPTY_VALUE}
        </span>
      </header>

      {message.text && state !== PROVIDER_STATE.ERROR ? (
        <div className={`mx-5 mt-5 flex items-start gap-3 rounded-2xl border p-4 sm:mx-6 ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100' : 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-100'}`} role={message.type === 'success' ? 'status' : 'alert'}>
          {message.type === 'success' ? <Lucide.CircleCheckBig className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> : <Lucide.CircleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />}
          <p className="text-sm font-bold leading-6">{message.text}</p>
        </div>
      ) : null}

      {state === PROVIDER_STATE.LOADING ? <ProviderSkeleton /> : null}
      {state === PROVIDER_STATE.ASSIGNED ? <CurrentProvider assignment={assignment} /> : null}
      {stateContent ? <div className="p-5 sm:p-6"><EmptyState {...stateContent} /></div> : null}

      {state === PROVIDER_STATE.CANDIDATES ? (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/55 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
            <Lucide.ScanSearch className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300" size={18} aria-hidden="true" />
            <div>
              <h3 className="text-sm font-black text-slate-950 dark:text-white">Chưa có đơn vị xử lý</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Các đơn vị dưới đây phù hợp với {incident?.areaName || EMPTY_VALUE} · {incident?.categoryName || EMPTY_VALUE}.
              </p>
            </div>
          </div>

          <fieldset className="grid gap-3 lg:grid-cols-2" disabled={submitting}>
            <legend className="sr-only">Chọn đơn vị xử lý sự vụ</legend>
            {sortedCandidates.map((candidate) => {
              const coordinatorId = getCoordinatorId(candidate);
              return (
                <ProviderCandidateCard
                  key={coordinatorId || `${candidate?.providerName}-${candidate?.coordinatorName}`}
                  candidate={candidate}
                  disabled={submitting}
                  selected={selectedCoordinatorId === coordinatorId}
                  onSelect={setSelectedCoordinatorId}
                />
              );
            })}
          </fieldset>

          <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/65 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end dark:border-slate-800 dark:bg-slate-950/30">
            <label className="min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="incident-provider-note">
              Ghi chú phân công <span className="font-medium text-slate-400">(không bắt buộc)</span>
              <textarea
                id="incident-provider-note"
                value={assignmentNote}
                onChange={(event) => setAssignmentNote(event.target.value)}
                rows={2}
                placeholder="Thông tin cần lưu ý khi phối hợp xử lý..."
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-blue-950"
              />
            </label>
            <Button
              type="button"
              className="min-h-11 shrink-0 whitespace-nowrap"
              disabled={!selectedCandidate || submitting}
              onClick={() => setDialogOpen(true)}
            >
              <Lucide.Send size={16} aria-hidden="true" />
              Chọn đơn vị xử lý
            </Button>
          </div>
        </div>
      ) : null}

        <StaffIncidentActionDialog
          open={dialogOpen}
          busy={submitting}
          title="Xác nhận phân công đơn vị xử lý?"
          description="Kiểm tra sự vụ và đơn vị trước khi xác nhận. Backend không hỗ trợ thay đổi đơn vị sau khi phân công."
          icon={Lucide.Building2}
          confirmLabel="Xác nhận phân công"
          onClose={closeDialog}
          onConfirm={assignProvider}
        >
          <dl className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/65">
            {[
              ['Sự vụ', incident?.title || incidentId],
              ['Đơn vị', selectedCandidate ? getCandidateName(selectedCandidate) : EMPTY_VALUE],
              ['Phường / Khu vực', incident?.areaName || EMPTY_VALUE],
              ['Danh mục', incident?.categoryName || EMPTY_VALUE],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                <dt className="font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="break-words font-bold text-slate-900 dark:text-slate-100">{value}</dd>
              </div>
            ))}
          </dl>
        </StaffIncidentActionDialog>
      </section>

      {state === PROVIDER_STATE.ASSIGNED ? (
        <StaffIncidentProgressSection
          assignment={assignment}
          incident={incident}
          onAssignmentUpdated={setAssignment}
          onIncidentUpdated={onIncidentUpdated}
          user={user}
        />
      ) : null}
    </>
  );
}
