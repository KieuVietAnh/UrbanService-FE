import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { getStatusIntent } from '@urbanmind/shared-types';

import Badge from '../../components/design-system/Badge';
import EmptyState from '../../components/design-system/EmptyState';
import {
  EMPTY_VALUE,
  formatConfidence,
  formatOperationalDateTime,
  formatReportCode,
  getReportLinkMethodLabel,
  getReportLinkRoleLabel,
  getReportLinkStatusLabel,
  getReportStatusLabel,
  getSubmissionChannelLabel,
} from './incidentDetailPresentation';

function ReportMetadata({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon size={14} className="shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}

function ReportRow({ report, incidentId }) {
  const feedbackId = String(report?.feedbackId ?? '').trim();
  const reportTitle = String(report?.title ?? '').trim() || 'Phản ánh chưa có tiêu đề';
  const reporterName = String(report?.reporterName ?? '').trim() || EMPTY_VALUE;
  const locationText = String(report?.locationText ?? '').trim() || EMPTY_VALUE;
  const linkedBy = String(report?.linkedByUserName ?? '').trim() || EMPTY_VALUE;
  const reason = String(report?.reason ?? '').trim();

  return (
    <li>
      <article className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300">
              {formatReportCode(feedbackId)}
            </span>
            <Badge intent={getStatusIntent(report?.feedbackStatus)}>
              {getReportStatusLabel(report?.feedbackStatus)}
            </Badge>
            {report?.linkStatus ? (
              <Badge intent="neutral">{getReportLinkStatusLabel(report.linkStatus)}</Badge>
            ) : null}
          </div>

          <h3 className="mt-3 break-words text-base font-bold leading-6 text-slate-950 dark:text-white">
            {reportTitle}
          </h3>

          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex min-w-0 items-start gap-2 text-slate-600 dark:text-slate-300">
              <Lucide.UserRound size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="break-words"><span className="sr-only">Người gửi: </span>{reporterName}</span>
            </div>
            <div className="flex min-w-0 items-start gap-2 text-slate-600 dark:text-slate-300">
              <Lucide.MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="break-words"><span className="sr-only">Vị trí: </span>{locationText}</span>
            </div>
          </div>

          {reason ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lý do liên kết</p>
              <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{reason}</p>
            </div>
          ) : null}
        </div>

        <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-2">
          <ReportMetadata
            label="Kênh gửi"
            value={getSubmissionChannelLabel(report?.submissionChannel)}
            icon={Lucide.Send}
          />
          <ReportMetadata
            label="Cách liên kết"
            value={getReportLinkMethodLabel(report?.linkMethod)}
            icon={Lucide.Link2}
          />
          <ReportMetadata
            label="Vai trò liên kết"
            value={getReportLinkRoleLabel(report?.linkRole)}
            icon={Lucide.Network}
          />
          <ReportMetadata
            label="Độ tin cậy"
            value={formatConfidence(report?.confidenceScore)}
            icon={Lucide.Gauge}
          />
          <ReportMetadata
            label="Liên kết lúc"
            value={formatOperationalDateTime(report?.linkedAt)}
            icon={Lucide.CalendarClock}
          />
          <ReportMetadata
            label="Người liên kết"
            value={linkedBy}
            icon={Lucide.UserRoundCheck}
          />
        </dl>

        <div className="lg:pt-1">
          {feedbackId ? (
            <Link
              to={`/staff/feedbacks/${feedbackId}`}
              state={{
                fromIncidentId: String(incidentId ?? ''),
                returnLabel: 'Quay lại các phản ánh của sự vụ',
              }}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 lg:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-blue-950/30 dark:hover:text-blue-300 dark:focus-visible:ring-blue-950"
            >
              Xem phản ánh
              <Lucide.ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <span className="text-sm font-medium text-slate-500">Chưa có mã phản ánh</span>
          )}
        </div>
      </article>
    </li>
  );
}

export default function StaffIncidentReportsPanel({ incident, capability }) {
  const reportsFieldExists = Object.prototype.hasOwnProperty.call(incident ?? {}, 'reports');
  const reports = Array.isArray(incident?.reports) ? incident.reports : [];
  const reportedCount = Number(incident?.reportCount);
  const hasReportedCount = Number.isFinite(reportedCount) && reportedCount >= 0;
  const embeddedListMissing = !capability?.reportsEmbedded
    || !reportsFieldExists
    || (!Array.isArray(incident?.reports) && hasReportedCount && reportedCount > 0);

  if (embeddedListMissing) {
    return (
      <div id="incident-panel-reports" role="tabpanel" aria-labelledby="incident-tab-reports" tabIndex={0} className="focus-visible:outline-none">
        <EmptyState
          icon={Lucide.ServerOff}
          title="Chưa có API hỗ trợ danh sách phản ánh"
          description="Backend hiện chưa cung cấp danh sách phản ánh thuộc sự vụ này."
        />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div id="incident-panel-reports" role="tabpanel" aria-labelledby="incident-tab-reports" tabIndex={0} className="focus-visible:outline-none">
        <EmptyState
          icon={Lucide.MessagesSquare}
          title="Chưa có phản ánh trong sự vụ này"
          description="Các Report được liên kết với sự vụ sẽ xuất hiện tại đây."
        />
      </div>
    );
  }

  const visibleCount = hasReportedCount ? reportedCount : reports.length;
  const hasPartialEmbeddedList = hasReportedCount && reportedCount !== reports.length;

  return (
    <div
      id="incident-panel-reports"
      role="tabpanel"
      aria-labelledby="incident-tab-reports"
      tabIndex={0}
      className="space-y-4 focus-visible:outline-none"
    >
      <aside className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3.5 text-sm leading-6 text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/25 dark:text-blue-100" role="note">
        <Lucide.Info size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
        <p>
          Một sự vụ có thể được nhiều người dân phản ánh. Mỗi Report vẫn được lưu giữ và cung cấp thêm thông tin cho quá trình xử lý.
        </p>
      </aside>

      {hasPartialEmbeddedList ? (
        <aside className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100" role="note">
          Backend ghi nhận {reportedCount.toLocaleString('vi-VN')} phản ánh nhưng response hiện chỉ cung cấp {reports.length.toLocaleString('vi-VN')} mục. Danh sách dưới đây chỉ hiển thị dữ liệu đã nhận được.
        </aside>
      ) : null}

      <section className="admin-panel overflow-hidden" aria-labelledby="incident-reports-title">
        <header className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 dark:border-slate-800">
          <div>
            <h2 id="incident-reports-title" className="admin-section-title">Danh sách phản ánh</h2>
            <p className="admin-section-description mt-1">Đọc từng nguồn thông tin đã được liên kết với sự vụ.</p>
          </div>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {visibleCount.toLocaleString('vi-VN')} phản ánh
          </span>
        </header>

        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {reports.map((report, index) => (
            <ReportRow
              key={report?.incidentReportLinkId || report?.feedbackId || `report-${index}`}
              report={report}
              incidentId={incident?.incidentId}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}
