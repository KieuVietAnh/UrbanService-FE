import * as Lucide from 'lucide-react';
import { getStatusIntent } from '@urbanmind/shared-types';
import { INCIDENT_MANAGEMENT_CAPABILITIES } from '@urbanmind/shared-api';

import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import { useAuth } from '../../contexts/AuthContext';
import {
  EMPTY_VALUE,
  formatIncidentCode,
  formatOperationalDateTime,
  getIncidentStatusLabel,
} from './incidentDetailPresentation';
import {
  getIncidentNextActionCopy,
  getIncidentProcessingSteps,
  isAssignedToAnotherStaff,
} from './staffIncidentProcessing';

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

function ProviderBlocker({ incident }) {
  const providerCapability = INCIDENT_MANAGEMENT_CAPABILITIES.providerAssignment;

  return (
    <section className="admin-panel overflow-hidden" aria-labelledby="incident-provider-title">
      <header className="flex items-start gap-3 border-b border-slate-200 bg-slate-50/65 px-5 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950/25">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/55 dark:text-blue-300" aria-hidden="true">
          <Lucide.Building2 size={18} />
        </span>
        <div className="min-w-0">
          <h2 id="incident-provider-title" className="admin-section-title">Đơn vị xử lý</h2>
          <p className="admin-section-description mt-1">Đơn vị phối hợp thực hiện công việc chuyên môn của sự vụ.</p>
        </div>
      </header>

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] sm:p-6">
        <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff phụ trách sự vụ</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/55 dark:text-blue-300" aria-hidden="true">
              <Lucide.UserRoundCheck size={18} />
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-bold text-slate-950 dark:text-white">
                {String(incident?.assignedStaffName ?? '').trim() || 'Chưa có dữ liệu Staff phụ trách'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Điều phối và theo dõi toàn bộ sự vụ</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/70 dark:bg-amber-950/25">
          <div className="flex items-start gap-3">
            <Lucide.ServerOff className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" size={19} aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-sm font-black text-amber-950 dark:text-amber-100">
                Chưa có API hỗ trợ phân công đơn vị xử lý ở cấp sự vụ
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-amber-900/85 dark:text-amber-100/80">
                Backend hiện vẫn yêu cầu xử lý theo Feedback nhưng chưa cung cấp quy tắc xác định Report đại diện cho Incident.
              </p>
              {providerCapability.legacyRequiresFeedbackId ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-900">
                  <Lucide.Link2Off size={14} aria-hidden="true" />
                  Chưa thiết lập đơn vị xử lý
                </p>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default function StaffIncidentProcessingPanel({ incident }) {
  const { user } = useAuth();
  const steps = getIncidentProcessingSteps(incident?.status);
  const assignedToAnotherStaff = isAssignedToAnotherStaff(incident, user);
  const startCapability = INCIDENT_MANAGEMENT_CAPABILITIES.staffStartProcessing;
  const isAssigned = String(incident?.status ?? '').replace(/[-_\s]+/g, '').toLowerCase() === 'assigned';

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
            <ProcessingFact icon={Lucide.UserCheck} label="Thời gian được phân công" value="Chưa có dữ liệu" />
            <ProcessingFact icon={Lucide.Play} label="Thời gian bắt đầu xử lý" value="Chưa có dữ liệu" />
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
                <Lucide.LockKeyhole className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" size={18} aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-amber-950 dark:text-amber-100">Chưa thể bắt đầu xử lý trên hệ thống</h3>
                  <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-100/75">
                    Backend đã có API đổi trạng thái sự vụ nhưng chưa xác nhận quyền chuyển từ Đã phân công sang Đang xử lý cho Staff.
                  </p>
                </div>
              </div>
              <Button type="button" size="sm" disabled={!startCapability.available || assignedToAnotherStaff} className="shrink-0 whitespace-nowrap">
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

      <ProviderBlocker incident={incident} />

      <p className="sr-only">Mã sự vụ {formatIncidentCode(incident?.incidentId)}</p>
    </div>
  );
}
