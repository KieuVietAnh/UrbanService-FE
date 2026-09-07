import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { getStatusIntent } from '@urbanmind/shared-types';
import { extractApiErrorMessage, incidentManagementApi } from '@urbanmind/shared-api';

import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import { useAuth } from '../../contexts/AuthContext';
import {
  EMPTY_VALUE,
  formatIncidentCode,
  formatOperationalDateTime,
  getIncidentStatusLabel,
} from './incidentDetailPresentation';
import StaffIncidentActionDialog from './StaffIncidentActionDialog';
import StaffIncidentProviderSection from './StaffIncidentProviderSection';
import {
  canStartIncidentProcessing,
  getIncidentNextActionCopy,
  getIncidentProcessingSteps,
  getStartProcessingDeniedMessage,
  isAssignedToAnotherStaff,
} from './staffIncidentProcessing';

const getActionErrorMessage = (error, fallback) => {
  if (!error?.response && !error?.status && !error?.code && String(error?.message ?? '').trim()) {
    return String(error.message).trim();
  }
  return extractApiErrorMessage(error, fallback);
};

function ProcessingFact({ icon: Icon, label, value, children }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/65">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/45 dark:text-blue-300 dark:ring-blue-900" aria-hidden="true">
          <Icon size={16} />
        </span>
        <dl className="min-w-0">
          <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
          <dd className="mt-1.5 break-words text-sm font-bold leading-6 text-slate-950 dark:text-white">
            {children || value || EMPTY_VALUE}
          </dd>
        </dl>
      </div>
    </div>
  );
}

function ProgressStep({ step, index, isLast }) {
  const stateCopy = {
    complete: 'Đã hoàn tất',
    current: 'Bước hiện tại',
    pending: 'Chưa đến bước',
  }[step.state];
  const stateClass = {
    complete: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-200',
    current: 'border-blue-600 bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)]',
    pending: 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500',
  }[step.state];

  return (
    <li className="relative flex min-w-0 gap-3 sm:flex-1 sm:flex-col sm:gap-2">
      {!isLast ? (
        <span className={`absolute left-[1.12rem] top-9 h-[calc(100%+0.5rem)] w-px sm:left-[calc(50%+1.15rem)] sm:top-[1.15rem] sm:h-px sm:w-[calc(100%-2.3rem)] ${step.state === 'complete' ? 'bg-blue-300 dark:bg-blue-800' : 'bg-slate-200 dark:bg-slate-800'}`} aria-hidden="true" />
      ) : null}
      <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-black sm:mx-auto ${stateClass}`} aria-hidden="true">
        {step.state === 'complete' ? <Lucide.Check size={16} /> : index + 1}
      </span>
      <span className="min-w-0 pb-4 sm:px-1 sm:pb-0 sm:text-center">
        <strong className="block text-sm font-bold text-slate-900 dark:text-slate-100">{step.label}</strong>
        <span className={`mt-0.5 block text-xs font-semibold ${step.state === 'current' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {stateCopy}
        </span>
      </span>
    </li>
  );
}

export default function StaffIncidentProcessingPanel({ incident, onIncidentUpdated }) {
  const { user } = useAuth();
  const steps = getIncidentProcessingSteps(incident?.status);
  const assignedToAnotherStaff = isAssignedToAnotherStaff(incident, user);
  const mayStartProcessing = canStartIncidentProcessing(incident, user);
  const startCapability = incidentManagementApi.capabilities.staffStartProcessing;
  const isAssigned = String(incident?.status ?? '').replace(/[-_\s]+/g, '').toLowerCase() === 'assigned';
  const incidentId = String(incident?.incidentId ?? '').trim();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const closeDialog = useCallback(() => {
    if (!submitting) setDialogOpen(false);
  }, [submitting]);

  const startProcessing = async () => {
    if (!mayStartProcessing || submitting || !incidentId) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const latestIncident = await incidentManagementApi.getIncidentById(incidentId);
      if (!latestIncident) throw new Error('Không tìm thấy sự vụ để bắt đầu xử lý.');

      if (!canStartIncidentProcessing(latestIncident, user)) {
        onIncidentUpdated?.(latestIncident);
        throw new Error('Sự vụ không còn được phân công cho bạn hoặc trạng thái đã thay đổi.');
      }

      const updatedIncident = await incidentManagementApi.startIncidentProcessing(incidentId, {
        note: 'Staff bắt đầu xử lý sự vụ.',
      });
      if (!updatedIncident) throw new Error('Backend không trả về dữ liệu sự vụ sau khi cập nhật.');

      const updated = onIncidentUpdated?.(updatedIncident);
      if (updated === false) throw new Error('Dữ liệu cập nhật không thuộc sự vụ đang mở.');

      setDialogOpen(false);
      setMessage({ type: 'success', text: 'Đã bắt đầu xử lý sự vụ.' });
    } catch (error) {
      setDialogOpen(false);
      let errorMessage = getActionErrorMessage(error, 'Không thể bắt đầu xử lý sự vụ.');

      if (Number(error?.status ?? error?.response?.status) === 403) {
        try {
          const latestIncident = await incidentManagementApi.getIncidentById(incidentId);
          if (latestIncident) onIncidentUpdated?.(latestIncident);
          errorMessage = getStartProcessingDeniedMessage(latestIncident, user);
        } catch {
          errorMessage = getStartProcessingDeniedMessage(null, user);
        }
      }

      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="incident-panel-processing"
      role="tabpanel"
      aria-labelledby="incident-tab-processing"
      tabIndex={0}
      className="space-y-5 focus-visible:outline-none"
    >
      <section className="admin-panel overflow-hidden" aria-labelledby="incident-processing-status-title">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/65 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 dark:border-slate-800 dark:bg-slate-950/25">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.2)]" aria-hidden="true">
              <Lucide.Wrench size={20} />
            </span>
            <div className="min-w-0">
              <h2 id="incident-processing-status-title" className="admin-section-title">Trạng thái xử lý</h2>
              <p className="admin-section-description mt-1">Theo dõi trạng thái hiện tại và bước xử lý hợp lệ tiếp theo của sự vụ.</p>
            </div>
          </div>
          <Badge intent={getStatusIntent(incident?.status)} className="w-fit px-3 py-1.5 text-xs">
            {getIncidentStatusLabel(incident?.status)}
          </Badge>
        </header>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProcessingFact icon={Lucide.CircleDotDashed} label="Trạng thái sự vụ">
              <Badge intent={getStatusIntent(incident?.status)}>{getIncidentStatusLabel(incident?.status)}</Badge>
            </ProcessingFact>
            <ProcessingFact icon={Lucide.UserRoundCheck} label="Staff phụ trách" value={String(incident?.assignedStaffName ?? '').trim() || 'Chưa có dữ liệu Staff phụ trách'} />
            <ProcessingFact icon={Lucide.UserCheck} label="Thời gian được phân công" value={formatOperationalDateTime(incident?.assignedAt)} />
            <ProcessingFact icon={Lucide.Play} label="Thời gian bắt đầu xử lý" value={formatOperationalDateTime(incident?.processingStartedAt)} />
            <ProcessingFact icon={Lucide.RefreshCw} label="Cập nhật gần nhất" value={formatOperationalDateTime(incident?.updatedAt)} />
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <Lucide.Route className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300" size={18} aria-hidden="true" />
              <div>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">Bước xử lý tiếp theo</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{getIncidentNextActionCopy(incident?.status)}</p>
              </div>
            </div>
          </div>

          {message.text ? (
            <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100' : 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-100'}`} role={message.type === 'success' ? 'status' : 'alert'}>
              {message.type === 'success' ? <Lucide.CircleCheckBig className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> : <Lucide.CircleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />}
              <p className="text-sm font-semibold leading-6">{message.text}</p>
            </div>
          ) : null}

          {assignedToAnotherStaff ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-100" role="status">
              <Lucide.ShieldAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
              <div>
                <h3 className="text-sm font-black">Bạn không phải Staff đang phụ trách sự vụ này</h3>
                <p className="mt-1 text-sm leading-6 opacity-80">Thông tin phân công trên sự vụ không trùng với tài khoản hiện tại.</p>
              </div>
            </div>
          ) : null}

          {isAssigned ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/70 dark:bg-amber-950/25">
              <div className="flex min-w-0 items-start gap-3">
                <Lucide.PlayCircle className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" size={19} aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-amber-950 dark:text-amber-100">
                    {mayStartProcessing ? 'Sự vụ đã sẵn sàng để xử lý' : 'Chưa thể bắt đầu xử lý sự vụ'}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-100/75">
                    {mayStartProcessing
                      ? 'Bắt đầu xử lý sẽ chuyển trạng thái sự vụ sang Đang xử lý và ghi nhận thời điểm thực hiện.'
                      : 'Chỉ Staff đang được phân công mới có thể bắt đầu xử lý sự vụ này.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!startCapability.available || !mayStartProcessing || submitting}
                className="shrink-0 whitespace-nowrap"
                onClick={() => setDialogOpen(true)}
              >
                <Lucide.Play size={16} aria-hidden="true" />
                Bắt đầu xử lý
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="admin-panel overflow-hidden" aria-labelledby="incident-processing-progress-title">
        <header className="flex items-start gap-3 border-b border-slate-200 bg-slate-50/65 px-5 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950/25">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/55 dark:text-blue-300" aria-hidden="true">
            <Lucide.ListChecks size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="incident-processing-progress-title" className="admin-section-title">Tiến trình xử lý</h2>
            <p className="admin-section-description mt-1">Các mốc được xác định trực tiếp từ trạng thái sự vụ hiện tại.</p>
          </div>
        </header>
        <div className="p-5 sm:p-6">
          <ol className="flex flex-col gap-2 sm:flex-row sm:gap-0" aria-label="Các bước xử lý sự vụ">
            {steps.map((step, index) => (
              <ProgressStep key={step.id} step={step} index={index} isLast={index === steps.length - 1} />
            ))}
          </ol>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
            <Lucide.Gauge className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" size={18} aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Chưa có dữ liệu tiến độ xử lý</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Backend chưa cung cấp khối lượng công việc hoặc tiến độ chi tiết ở cấp sự vụ.</p>
            </div>
          </div>
        </div>
      </section>

      <StaffIncidentProviderSection
        incident={incident}
        onIncidentUpdated={onIncidentUpdated}
        user={user}
      />

      <StaffIncidentActionDialog
        open={dialogOpen}
        busy={submitting}
        title="Bắt đầu xử lý sự vụ này?"
        description="Trạng thái sự vụ sẽ chuyển từ Đã phân công sang Đang xử lý."
        icon={Lucide.Play}
        confirmLabel="Xác nhận bắt đầu"
        onClose={closeDialog}
        onConfirm={startProcessing}
      >
        <dl className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/65">
          {[
            ['Sự vụ', incident?.title || formatIncidentCode(incidentId)],
            ['Mã sự vụ', formatIncidentCode(incidentId)],
            ['Staff phụ trách', incident?.assignedStaffName || EMPTY_VALUE],
            ['Trạng thái hiện tại', getIncidentStatusLabel(incident?.status)],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
              <dt className="font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="break-words font-bold text-slate-900 dark:text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>
      </StaffIncidentActionDialog>

      <p className="sr-only">Mã sự vụ {formatIncidentCode(incidentId)}</p>
    </div>
  );
}
