import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import {
  getPriorityIntent,
  getSeverityIntent,
  getStatusIntent,
} from '@urbanmind/shared-types';
import { incidentManagementApi } from '@urbanmind/shared-api';

import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import IncidentLocationMapCard from '../../components/maps/IncidentLocationMapCard';
import { ManagerEmptyState, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';
import { getCategoryLabel } from '../../utils/categoryLabels';
import {
  MISSING_INCIDENT_VALUE,
  formatManagerIncidentCode,
  formatManagerIncidentCount,
  formatManagerIncidentDateTime,
  getCandidateDisplayName,
  getCandidateId,
  getManagerIncidentPriorityLabel,
  getManagerIncidentSeverityLabel,
  getManagerIncidentStatusLabel,
} from './managerIncidentUtils';

const DETAIL_STATE = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  NOT_FOUND: 'not-found',
});

const CANDIDATE_STATE = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
  API_UNAVAILABLE: 'api-unavailable',
});

function DetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.85fr)]" aria-busy="true" aria-label="Đang tải chi tiết sự vụ">
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="admin-panel p-6">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-5 h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/70" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70" />
            </div>
          </section>
        ))}
      </div>
      <section className="admin-panel h-96 animate-pulse bg-slate-100 dark:bg-slate-800/70" />
      <span className="sr-only">Đang tải dữ liệu</span>
    </div>
  );
}

function MetadataItem({ icon: Icon, label, children, tone = 'blue' }) {
  const toneStyles = {
    blue: {
      surface: 'border-blue-100 bg-blue-50/45 dark:border-blue-900/70 dark:bg-blue-950/20',
      icon: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/60 dark:text-blue-200 dark:ring-blue-800',
    },
    emerald: {
      surface: 'border-emerald-100 bg-emerald-50/45 dark:border-emerald-900/70 dark:bg-emerald-950/20',
      icon: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200 dark:ring-emerald-800',
    },
    amber: {
      surface: 'border-amber-100 bg-amber-50/45 dark:border-amber-900/70 dark:bg-amber-950/20',
      icon: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:ring-amber-800',
    },
    violet: {
      surface: 'border-violet-100 bg-violet-50/45 dark:border-violet-900/70 dark:bg-violet-950/20',
      icon: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-900/60 dark:text-violet-200 dark:ring-violet-800',
    },
  }[tone];

  return (
    <div className={`flex min-w-0 items-start gap-3 rounded-2xl border p-4 ${toneStyles.surface}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${toneStyles.icon}`} aria-hidden="true">
        <Icon size={18} />
      </span>
      <dl className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 break-words text-sm font-bold leading-5 text-slate-900 dark:text-slate-100">{children || MISSING_INCIDENT_VALUE}</dd>
      </dl>
    </div>
  );
}

function IncidentBadges({ incident }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge intent={getStatusIntent(incident?.status)}>{getManagerIncidentStatusLabel(incident?.status)}</Badge>
      <Badge intent={getPriorityIntent(incident?.priority)}>Ưu tiên: {getManagerIncidentPriorityLabel(incident?.priority)}</Badge>
      <Badge intent={getSeverityIntent(incident?.severity)}>Mức độ: {getManagerIncidentSeverityLabel(incident?.severity)}</Badge>
      {incident?.mergedIntoIncidentId ? <Badge intent="neutral">Đã gộp</Badge> : null}
    </div>
  );
}

function WorkspaceMetric({ icon: Icon, label, value, tone }) {
  const toneClass = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200',
  }[tone];

  return (
    <div className="flex min-w-0 items-center gap-3 bg-slate-50/95 px-5 py-4 sm:px-6 dark:bg-slate-900/95">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`} aria-hidden="true">
        <Icon size={18} />
      </span>
      <dl className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white" title={String(value)}>{value}</dd>
      </dl>
    </div>
  );
}

function IncidentWorkspaceHeader({ incident, incidentCode, reportCount, hasAssignee, onBack }) {
  return (
    <header className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950" aria-labelledby="manager-incident-page-title">
      <div className={`absolute inset-x-0 top-0 h-1 ${hasAssignee ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
      <div className="grid gap-6 px-5 pb-6 pt-7 sm:px-7 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.34fr)] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
              <Lucide.Fingerprint size={14} aria-hidden="true" />
              {incidentCode}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sự vụ thực tế</span>
          </div>
          <h1 id="manager-incident-page-title" className="mt-4 max-w-4xl text-2xl font-black leading-tight tracking-[-0.025em] text-slate-950 sm:text-[2rem] dark:text-white">
            {incident.title || 'Chi tiết sự vụ'}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Lucide.MapPin size={15} className="text-blue-600" aria-hidden="true" />{incident.areaName || MISSING_INCIDENT_VALUE}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5"><Lucide.Tags size={15} className="text-emerald-600" aria-hidden="true" />{getCategoryLabel(incident.categoryName, MISSING_INCIDENT_VALUE)}</span>
          </p>
          <div className="mt-5"><IncidentBadges incident={incident} /></div>
        </div>

        <aside className={`rounded-2xl border p-4 ${hasAssignee ? 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900 dark:bg-emerald-950/25' : 'border-amber-200 bg-amber-50/75 dark:border-amber-900 dark:bg-amber-950/25'}`} aria-label="Tình trạng phân công">
          <div className="flex items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${hasAssignee ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/70 dark:text-amber-200'}`} aria-hidden="true">
              {hasAssignee ? <Lucide.UserRoundCheck size={21} /> : <Lucide.UserRoundSearch size={21} />}
            </span>
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${hasAssignee ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{hasAssignee ? 'Đã phân công' : 'Chờ phân công'}</p>
              <p className="mt-1 break-words text-sm font-black leading-5 text-slate-950 dark:text-white">{incident.assignedStaffName || 'Chưa có Staff phụ trách'}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-4 w-full bg-white/70 shadow-none dark:bg-slate-950/40" onClick={onBack}>
            <Lucide.ArrowLeft size={16} aria-hidden="true" />
            Quay lại danh sách
          </Button>
        </aside>
      </div>

      <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-800" aria-label="Tóm tắt sự vụ">
        <WorkspaceMetric icon={Lucide.Files} label="Số Report" value={formatManagerIncidentCount(reportCount)} tone="blue" />
        <WorkspaceMetric icon={Lucide.UsersRound} label="Người theo dõi" value={formatManagerIncidentCount(incident.subscriberCount)} tone="violet" />
        <WorkspaceMetric icon={Lucide.CalendarPlus} label="Thời gian tạo" value={formatManagerIncidentDateTime(incident.createdAt)} tone="emerald" />
        <WorkspaceMetric icon={Lucide.History} label="Cập nhật gần nhất" value={formatManagerIncidentDateTime(incident.updatedAt)} tone="amber" />
      </div>
    </header>
  );
}

function CandidateSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tìm Staff phù hợp">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-3 w-56 max-w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
          <div className="mt-4 h-8 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70" />
        </div>
      ))}
      <span className="sr-only">Đang tải ứng viên phân công</span>
    </div>
  );
}

const getCandidateInitials = (name) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  return parts.slice(-2).map((part) => part.charAt(0).toUpperCase()).join('');
};

function CandidateCard({ candidate, selected, onSelect }) {
  const candidateId = getCandidateId(candidate);
  const name = getCandidateDisplayName(candidate);
  return (
    <label className={`group relative block cursor-pointer overflow-hidden rounded-2xl border p-4 transition duration-200 focus-within:ring-4 focus-within:ring-blue-100 dark:focus-within:ring-blue-950 ${selected ? 'border-blue-400 bg-blue-50/70 shadow-[0_14px_32px_rgba(37,99,235,0.12)] dark:border-blue-600 dark:bg-blue-950/30' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800'}`}>
      <span className={`absolute inset-y-0 left-0 w-1 transition ${selected ? 'bg-blue-600' : 'bg-transparent group-hover:bg-blue-200 dark:group-hover:bg-blue-800'}`} aria-hidden="true" />
      <span className="flex items-start gap-3 pl-1">
        <input
          type="radio"
          name="incident-assignee"
          value={candidateId}
          checked={selected}
          onChange={() => onSelect(candidateId)}
          className="sr-only"
        />
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ring-1 ${selected ? 'bg-blue-600 text-white ring-blue-600' : 'bg-slate-100 text-slate-700 ring-slate-200 group-hover:bg-blue-100 group-hover:text-blue-700 group-hover:ring-blue-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'}`} aria-hidden="true">
          {getCandidateInitials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <strong className="break-words text-sm text-slate-950 dark:text-white">{name}</strong>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-900'}`} aria-hidden="true">
              <Lucide.Check size={14} strokeWidth={3} />
            </span>
          </span>
          <span className="mt-1 block break-all text-xs text-slate-500 dark:text-slate-400">{candidate?.email || MISSING_INCIDENT_VALUE}</span>
          {candidate?.isPrimary ? <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">Phù hợp chính</span> : null}
        </span>
      </span>
      <span className="mt-4 grid gap-2 border-t border-slate-200 pt-3 text-xs sm:grid-cols-2 dark:border-slate-800">
        <span className="flex items-start gap-2 font-semibold leading-5 text-slate-600 dark:text-slate-300">
          <Lucide.MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
          Phụ trách {candidate?.areaName || MISSING_INCIDENT_VALUE}
        </span>
        <span className="flex items-start gap-2 font-semibold leading-5 text-slate-600 dark:text-slate-300">
          <Lucide.Tags className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          Danh mục {getCategoryLabel(candidate?.categoryName, MISSING_INCIDENT_VALUE)}
        </span>
      </span>
    </label>
  );
}

function CandidateMessage({ state, onRetry }) {
  const content = {
    [CANDIDATE_STATE.EMPTY]: {
      icon: Lucide.UserRoundX,
      title: 'Không có Staff phù hợp',
      description: 'Hiện chưa có Staff nào được cấu hình phù hợp với khu vực và danh mục của sự vụ này.',
    },
    [CANDIDATE_STATE.API_UNAVAILABLE]: {
      icon: Lucide.ServerOff,
      title: 'Chưa có API hỗ trợ tìm Staff phù hợp',
      description: 'Backend hiện chưa cung cấp nguồn dữ liệu ứng viên phân công cho sự vụ này.',
    },
    [CANDIDATE_STATE.ERROR]: {
      icon: Lucide.TriangleAlert,
      title: 'Không thể tải danh sách Staff phù hợp',
      description: 'Đã xảy ra lỗi khi tìm Staff theo khu vực và danh mục.',
      action: (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <Lucide.RefreshCw size={16} aria-hidden="true" />
          Thử lại
        </Button>
      ),
    },
  }[state];
  if (!content) return null;
  const Icon = content.icon;
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-7 text-center dark:border-slate-700 dark:bg-slate-900/55" aria-live="polite">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800" aria-hidden="true"><Icon size={21} /></span>
      <h3 className="mt-4 text-sm font-black text-slate-950 dark:text-white">{content.title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{content.description}</p>
      {content.action ? <div className="mt-4">{content.action}</div> : null}
    </section>
  );
}

function AssignmentDialog({ open, incident, candidate, submitting, onClose, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const dashboardScrollContainer = document.querySelector('[data-dashboard-scroll-container]');
    const previousDashboardOverflow = dashboardScrollContainer?.style.overflowY || '';
    document.body.style.overflow = 'hidden';
    if (dashboardScrollContainer) dashboardScrollContainer.style.overflowY = 'hidden';
    document.getElementById('manager-assignment-confirm')?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (dashboardScrollContainer) dashboardScrollContainer.style.overflowY = previousDashboardOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, open, submitting]);

  if (!open || !candidate || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 cursor-default bg-transparent" aria-label="Đóng hộp thoại xác nhận phân công" onClick={submitting ? undefined : onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="manager-assignment-dialog-title" className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-900">
        <header className="border-b border-slate-200 bg-blue-50/70 px-5 py-5 sm:px-6 dark:border-slate-800 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200" aria-hidden="true">
              <Lucide.UserRoundCheck size={21} />
            </span>
            <div>
              <h2 id="manager-assignment-dialog-title" className="text-lg font-black text-slate-950 dark:text-white">Xác nhận phân công Staff?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Kiểm tra người nhận và phạm vi sự vụ trước khi xác nhận.</p>
            </div>
          </div>
        </header>
        <dl className="grid gap-4 px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff nhận sự vụ</dt>
            <dd className="mt-1 font-bold text-slate-950 dark:text-white">{getCandidateDisplayName(candidate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sự vụ</dt>
            <dd className="mt-1 font-bold leading-5 text-slate-950 dark:text-white">{incident?.title || formatManagerIncidentCode(incident?.incidentId)}</dd>
            <dd className="mt-1 text-xs text-slate-500">{formatManagerIncidentCode(incident?.incidentId)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phường / Khu vực</dt>
            <dd className="mt-1 font-bold text-slate-950 dark:text-white">{incident?.areaName || MISSING_INCIDENT_VALUE}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Danh mục</dt>
            <dd className="mt-1 font-bold text-slate-950 dark:text-white">{getCategoryLabel(incident?.categoryName, MISSING_INCIDENT_VALUE)}</dd>
          </div>
        </dl>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button id="manager-assignment-confirm" type="button" onClick={onConfirm} disabled={submitting}>
            {submitting ? <Lucide.LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Lucide.UserRoundCheck size={17} aria-hidden="true" />}
            {submitting ? 'Đang phân công' : 'Xác nhận phân công'}
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function EmbeddedReportsSummary({ reports }) {
  if (!Array.isArray(reports) || reports.length === 0) return null;
  return (
    <section className="admin-panel overflow-hidden border-t-[3px] border-t-violet-500 shadow-[0_18px_44px_rgba(124,58,237,0.06)]" aria-labelledby="manager-incident-report-summary-title">
      <ManagerSectionHeader
        id="manager-incident-report-summary-title"
        title="Report thuộc sự vụ"
        description="Tóm tắt dữ liệu Report được trả về trực tiếp trong chi tiết Incident."
        icon={Lucide.Files}
        iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 ring-1 ring-violet-200 shadow-[0_10px_24px_rgba(124,58,237,0.12)] dark:bg-violet-950/45 dark:text-violet-300 dark:ring-violet-800"
        iconSize={20}
      />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {reports.slice(0, 3).map((report, index) => {
          const reportId = report?.feedbackId || report?.reportId || report?.id;
          return (
            <article key={reportId || index} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-black text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700 dark:text-violet-300">Report {reportId ? String(reportId).slice(0, 8).toUpperCase() : MISSING_INCIDENT_VALUE}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-slate-900 dark:text-slate-100">{report?.title || report?.summary || MISSING_INCIDENT_VALUE}</h3>
                </div>
              </div>
              {report?.status ? <Badge intent={getStatusIntent(report.status)}>{getManagerIncidentStatusLabel(report.status)}</Badge> : null}
            </article>
          );
        })}
      </div>
      {reports.length > 3 ? <p className="border-t border-slate-200 px-5 py-3 text-xs font-semibold text-slate-500 sm:px-6 dark:border-slate-800">Còn {reports.length - 3} Report khác trong sự vụ.</p> : null}
    </section>
  );
}

export function ManagerIncidentDetailPage() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [detailState, setDetailState] = useState(DETAIL_STATE.LOADING);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [candidates, setCandidates] = useState([]);
  const [candidateState, setCandidateState] = useState(CANDIDATE_STATE.IDLE);
  const [candidateRefreshKey, setCandidateRefreshKey] = useState(0);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadIncident = useCallback(async (signal) => {
    setDetailState(DETAIL_STATE.LOADING);
    try {
      const response = await incidentManagementApi.getIncidentById(incidentId, { signal });
      if (!response) {
        setIncident(null);
        setDetailState(DETAIL_STATE.NOT_FOUND);
        return;
      }
      setIncident(response);
      setDetailState(DETAIL_STATE.READY);
    } catch (error) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      setIncident(null);
      const status = Number(error?.status ?? error?.response?.status);
      setDetailState(status === 404 ? DETAIL_STATE.NOT_FOUND : DETAIL_STATE.ERROR);
    }
  }, [incidentId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadIncident(controller.signal);
    return () => controller.abort();
  }, [detailRefreshKey, loadIncident]);

  const hasAssignee = Boolean(incident?.assignedStaffUserId || incident?.assignedStaffName);

  useEffect(() => {
    if (detailState !== DETAIL_STATE.READY || !incident || hasAssignee) {
      setCandidateState(CANDIDATE_STATE.IDLE);
      setCandidates([]);
      return undefined;
    }
    if (!incidentManagementApi.capabilities.assigneeCandidates.available) {
      setCandidateState(CANDIDATE_STATE.API_UNAVAILABLE);
      return undefined;
    }

    const controller = new AbortController();
    const loadCandidates = async () => {
      setCandidateState(CANDIDATE_STATE.LOADING);
      try {
        const response = await incidentManagementApi.getIncidentAssigneeCandidates(incidentId, { signal: controller.signal });
        setCandidates(response);
        setCandidateState(response.length > 0 ? CANDIDATE_STATE.READY : CANDIDATE_STATE.EMPTY);
      } catch (error) {
        if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
        setCandidates([]);
        const status = Number(error?.status ?? error?.response?.status);
        setCandidateState([404, 405].includes(status) ? CANDIDATE_STATE.API_UNAVAILABLE : CANDIDATE_STATE.ERROR);
      }
    };
    void loadCandidates();
    return () => controller.abort();
  }, [candidateRefreshKey, detailState, hasAssignee, incident, incidentId]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => getCandidateId(candidate) === selectedCandidateId) || null,
    [candidates, selectedCandidateId],
  );

  const closeDialog = useCallback(() => {
    if (!assigning) setDialogOpen(false);
  }, [assigning]);

  const assignIncident = async () => {
    if (!selectedCandidate || assigning) return;
    setAssigning(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await incidentManagementApi.assignIncident(incidentId, {
        staffUserId: getCandidateId(selectedCandidate),
      });
      if (response) setIncident(response);
      setDialogOpen(false);
      setSelectedCandidateId('');
      setCandidates([]);
      setCandidateState(CANDIDATE_STATE.IDLE);
      setMessage({ type: 'success', text: 'Đã phân công sự vụ cho Staff' });

      try {
        const refreshed = await incidentManagementApi.getIncidentById(incidentId);
        if (refreshed) setIncident(refreshed);
      } catch {
        // The assign response is already the authoritative IncidentDetailDto.
      }
    } catch (error) {
      setDialogOpen(false);
      setMessage({ type: 'error', text: error?.message || 'Không thể phân công sự vụ cho Staff' });
    } finally {
      setAssigning(false);
    }
  };

  if (detailState === DETAIL_STATE.LOADING && !incident) {
    return (
      <main className="space-y-6 pb-8">
        <ManagerPageHeader title="Chi tiết sự vụ" description="Đang tải dữ liệu Incident từ backend." icon={Lucide.BriefcaseBusiness} />
        <DetailSkeleton />
      </main>
    );
  }

  if (detailState === DETAIL_STATE.NOT_FOUND) {
    return (
      <main className="pb-8">
        <ManagerEmptyState icon={Lucide.FileQuestion} title="Không tìm thấy sự vụ" description="Sự vụ không tồn tại hoặc không còn khả dụng trong phạm vi quản lý." action={<Button type="button" variant="outline" size="sm" onClick={() => navigate('/manager/incidents')}>Về danh sách sự vụ</Button>} />
      </main>
    );
  }

  if (detailState === DETAIL_STATE.ERROR || !incident) {
    return (
      <main className="pb-8">
        <ManagerEmptyState icon={Lucide.TriangleAlert} title="Không thể tải chi tiết sự vụ" description="Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng thử lại." action={<Button type="button" variant="outline" size="sm" onClick={() => setDetailRefreshKey((value) => value + 1)}><Lucide.RefreshCw size={16} aria-hidden="true" />Thử lại</Button>} />
      </main>
    );
  }

  const incidentCode = formatManagerIncidentCode(incident.incidentId || incidentId);
  const reportCount = incident.reportCount ?? (Array.isArray(incident.reports) ? incident.reports.length : null);

  return (
    <main className="space-y-6 pb-8">
      <nav className="flex flex-wrap items-center gap-2 px-1 text-sm font-medium text-slate-500 dark:text-slate-400" aria-label="Đường dẫn trang">
        <Link to="/manager/incidents" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">Quản lý sự vụ</Link>
        <Lucide.ChevronRight size={15} aria-hidden="true" />
        <span className="text-slate-800 dark:text-slate-100">Chi tiết sự vụ</span>
      </nav>

      {message.type === 'success' ? <aside aria-live="polite"><SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} /></aside> : null}
      {message.type === 'error' ? <aside aria-live="assertive"><ErrorAlert title="Không thể phân công" message={message.text} onClose={() => setMessage({ type: '', text: '' })} /></aside> : null}

      <IncidentWorkspaceHeader
        incident={incident}
        incidentCode={incidentCode}
        reportCount={reportCount}
        hasAssignee={hasAssignee}
        onBack={() => navigate('/manager/incidents')}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.85fr)] xl:items-start">
        <div className="space-y-6">
          <section className="admin-panel overflow-hidden border-t-[3px] border-t-blue-500 shadow-[0_18px_44px_rgba(37,99,235,0.06)]" aria-labelledby="manager-incident-overview-title">
            <ManagerSectionHeader
              id="manager-incident-overview-title"
              title="Tổng quan sự vụ"
              description="Thông tin nhận diện, nội dung và vị trí ở cấp Incident."
              icon={Lucide.FileText}
              iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-[0_10px_24px_rgba(37,99,235,0.12)] dark:bg-blue-950/45 dark:text-blue-300 dark:ring-blue-800"
              iconSize={20}
            />
            <div className="p-5 sm:p-6">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/75 px-4 py-4 sm:px-5 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" aria-hidden="true" />
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-blue-300 dark:ring-slate-800" aria-hidden="true"><Lucide.AlignLeft size={18} /></span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Mô tả sự vụ</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{incident.description || MISSING_INCIDENT_VALUE}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetadataItem icon={Lucide.MapPinned} label="Phường / Khu vực" tone="blue">{incident.areaName || MISSING_INCIDENT_VALUE}</MetadataItem>
                <MetadataItem icon={Lucide.Tags} label="Danh mục" tone="emerald">{getCategoryLabel(incident.categoryName, MISSING_INCIDENT_VALUE)}</MetadataItem>
              </div>
              {incident.locationText ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/45 px-4 py-3.5 dark:border-cyan-900/70 dark:bg-cyan-950/20">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-200" aria-hidden="true"><Lucide.Navigation size={17} /></span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-300">Vị trí ghi nhận</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{incident.locationText}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <IncidentLocationMapCard
            incidentId={incident.incidentId || incidentId}
            latitude={incident.lat ?? incident.latitude}
            longitude={incident.lng ?? incident.longitude}
            locationText={incident.locationText}
            areaName={incident.areaName}
          />

          <section className="admin-panel overflow-hidden border-t-[3px] border-t-emerald-500 shadow-[0_18px_44px_rgba(16,185,129,0.06)]" aria-labelledby="manager-incident-progress-title">
            <ManagerSectionHeader
              id="manager-incident-progress-title"
              title="Thông tin quản lý"
              description="Người phụ trách và trạng thái xử lý hiện tại của sự vụ."
              icon={Lucide.Gauge}
              iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 shadow-[0_10px_24px_rgba(16,185,129,0.12)] dark:bg-emerald-950/45 dark:text-emerald-300 dark:ring-emerald-800"
              iconSize={20}
            />
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <MetadataItem icon={Lucide.UserRoundCheck} label="Staff được phân công" tone="emerald">{incident.assignedStaffName || 'Chưa phân công'}</MetadataItem>
              <MetadataItem icon={Lucide.CircleDotDashed} label="Trạng thái" tone="blue">{getManagerIncidentStatusLabel(incident.status)}</MetadataItem>
              <MetadataItem icon={Lucide.CalendarPlus} label="Thời gian tạo" tone="violet">{formatManagerIncidentDateTime(incident.createdAt)}</MetadataItem>
              <MetadataItem icon={Lucide.History} label="Cập nhật gần nhất" tone="amber">{formatManagerIncidentDateTime(incident.updatedAt)}</MetadataItem>
            </div>
          </section>

          <EmbeddedReportsSummary reports={incident.reports} />
        </div>

        <aside className="admin-panel overflow-hidden border-t-[3px] border-t-blue-600 shadow-[0_22px_52px_rgba(37,99,235,0.09)] xl:sticky xl:top-24" aria-labelledby="manager-incident-assignment-title">
          <ManagerSectionHeader
            id="manager-incident-assignment-title"
            title="Phân công Staff"
            description="Danh sách Staff phù hợp được xác định dựa trên khu vực và danh mục của sự vụ."
            icon={Lucide.UserRoundCog}
            iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-[0_10px_24px_rgba(37,99,235,0.14)] dark:bg-blue-950/45 dark:text-blue-300 dark:ring-blue-800"
            iconSize={20}
          />
          <div className="p-5 sm:p-6">
            {hasAssignee ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/75 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <span className="absolute inset-x-0 top-0 h-1 bg-emerald-500" aria-hidden="true" />
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.22)]" aria-hidden="true"><Lucide.UserRoundCheck size={22} /></span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Staff đang phụ trách</p>
                      <p className="mt-1 break-words text-base font-black text-slate-950 dark:text-white">{incident.assignedStaffName || MISSING_INCIDENT_VALUE}</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800/80 dark:text-emerald-200/80">Sự vụ đã được chuyển đến người phụ trách để theo dõi.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-emerald-200 pt-4 text-xs font-semibold text-slate-700 dark:border-emerald-900 dark:text-slate-200 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <span className="flex items-start gap-2"><Lucide.MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />{incident.areaName || MISSING_INCIDENT_VALUE}</span>
                    <span className="flex items-start gap-2"><Lucide.Tags className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />{getCategoryLabel(incident.categoryName, MISSING_INCIDENT_VALUE)}</span>
                  </div>
                </div>
                <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <Lucide.LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Chưa có API hỗ trợ phân công lại.
                </p>
              </div>
            ) : null}

            {!hasAssignee ? (
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/70 dark:bg-blue-950/20" role="note">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200" aria-hidden="true"><Lucide.ScanSearch size={17} /></span>
                  <div>
                    <p className="text-xs font-black text-blue-900 dark:text-blue-100">Phạm vi tìm Staff phù hợp</p>
                    <p className="mt-1 text-xs leading-5 text-blue-800/80 dark:text-blue-200/80">{incident.areaName || MISSING_INCIDENT_VALUE} · {getCategoryLabel(incident.categoryName, MISSING_INCIDENT_VALUE)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {!hasAssignee && candidateState === CANDIDATE_STATE.LOADING ? <CandidateSkeleton /> : null}
            {!hasAssignee && candidateState === CANDIDATE_STATE.READY ? (
              <div className="space-y-4">
                <fieldset className="space-y-3">
                  <legend className="sr-only">Chọn Staff nhận sự vụ</legend>
                  {candidates.map((candidate) => {
                    const candidateId = getCandidateId(candidate);
                    return <CandidateCard key={candidateId} candidate={candidate} selected={selectedCandidateId === candidateId} onSelect={setSelectedCandidateId} />;
                  })}
                </fieldset>
                <Button type="button" className="min-h-12 w-full text-sm" disabled={!selectedCandidate} onClick={() => setDialogOpen(true)}>
                  <Lucide.Send size={17} aria-hidden="true" />
                  Phân công xử lý
                </Button>
              </div>
            ) : null}
            {!hasAssignee && [CANDIDATE_STATE.EMPTY, CANDIDATE_STATE.ERROR, CANDIDATE_STATE.API_UNAVAILABLE].includes(candidateState) ? (
              <CandidateMessage state={candidateState} onRetry={() => setCandidateRefreshKey((value) => value + 1)} />
            ) : null}
          </div>
        </aside>
      </div>

      <AssignmentDialog open={dialogOpen} incident={incident} candidate={selectedCandidate} submitting={assigning} onClose={closeDialog} onConfirm={assignIncident} />
    </main>
  );
}

export default ManagerIncidentDetailPage;
