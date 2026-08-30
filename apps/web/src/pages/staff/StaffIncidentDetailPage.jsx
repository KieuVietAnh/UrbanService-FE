import { useMemo, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import {
  getPriorityIntent,
  getSeverityIntent,
  getStatusIntent,
} from '@urbanmind/shared-types';

import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import EmptyState from '../../components/design-system/EmptyState';
import {
  STAFF_INCIDENT_DETAIL_STATE,
  useStaffIncidentDetail,
} from '../../hooks/useStaffIncidentDetail';
import StaffIncidentReportsPanel from './StaffIncidentReportsPanel';
import StaffIncidentTimelinePanel from './StaffIncidentTimelinePanel';

const STATUS_LABELS = Object.freeze({
  new: 'Mới',
  verified: 'Đã xác nhận',
  assigned: 'Đã phân công',
  inprogress: 'Đang xử lý',
  submittedforapproval: 'Chờ duyệt kết quả',
  needrework: 'Cần xử lý lại',
  approved: 'Đã duyệt',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng',
  merged: 'Đã gộp',
});

const PRIORITY_LABELS = Object.freeze({
  critical: 'Khẩn cấp',
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  normal: 'Trung bình',
  low: 'Thấp',
});

const SEVERITY_LABELS = Object.freeze({
  critical: 'Nghiêm trọng',
  urgent: 'Nghiêm trọng',
  major: 'Cao',
  high: 'Cao',
  medium: 'Trung bình',
  normal: 'Trung bình',
  minor: 'Thấp',
  low: 'Thấp',
});

const TAB_ITEMS = Object.freeze([
  { id: 'overview', label: 'Tổng quan', icon: Lucide.LayoutDashboard },
  { id: 'reports', label: 'Các phản ánh', icon: Lucide.MessagesSquare },
  { id: 'timeline', label: 'Dòng thời gian', icon: Lucide.History },
]);

const EMPTY_VALUE = 'Chưa có dữ liệu';

const normalizeEnumKey = (value) => String(value ?? '')
  .trim()
  .replace(/[-_\s]+/g, '')
  .toLowerCase();

const getEnumLabel = (value, labels) => {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  return labels[normalizeEnumKey(value)] || 'Chưa xác định';
};

const formatIncidentCode = (incidentId) => {
  const normalized = String(incidentId ?? '').trim();
  return normalized ? `SV-${normalized.slice(0, 8).toUpperCase()}` : EMPTY_VALUE;
};

const formatDateTime = (value) => {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatCount = (value) => {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  const count = Number(value);
  return Number.isFinite(count) ? count.toLocaleString('vi-VN') : EMPTY_VALUE;
};

const formatCoordinates = (latitude, longitude) => {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return EMPTY_VALUE;
  }

  return `${parsedLatitude.toFixed(6)}, ${parsedLongitude.toFixed(6)}`;
};

function Breadcrumbs() {
  return (
    <nav aria-label="Đường dẫn trang" className="flex min-w-0 items-center gap-2 text-sm">
      <Link
        to="/staff/incidents"
        className="rounded-md font-semibold text-slate-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:text-slate-300 dark:hover:text-blue-300 dark:focus-visible:ring-blue-950"
      >
        Sự vụ của tôi
      </Link>
      <Lucide.ChevronRight size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
      <span className="truncate text-slate-500 dark:text-slate-400" aria-current="page">
        Chi tiết sự vụ
      </span>
    </nav>
  );
}

function SectionHeading({ id, icon: Icon, title, description }) {
  return (
    <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
      <span className="admin-mini-icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <h2 id={id} className="admin-section-title">{title}</h2>
        {description ? <p className="admin-section-description mt-1">{description}</p> : null}
      </div>
    </header>
  );
}

function MetadataRow({ label, value, icon: Icon, valueClassName = '' }) {
  return (
    <div className="grid gap-2 py-3.5 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)] sm:gap-5">
      <dt className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        {Icon ? <Icon size={16} className="shrink-0" aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd className={`min-w-0 text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100 ${valueClassName}`}>
        {value}
      </dd>
    </div>
  );
}

function ClassificationItem({ label, children }) {
  return (
    <div className="min-w-0 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:px-6 dark:border-slate-800/80">
      <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 min-w-0 text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100">
        {children}
      </dd>
    </div>
  );
}

function IncidentDetailSkeleton() {
  return (
    <article className="admin-page-shell space-y-5" aria-busy="true" aria-label="Đang tải chi tiết sự vụ">
      <Breadcrumbs />

      <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="h-4 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-9 w-3/5 max-w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/70" />
      </header>

      <div className="flex gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        {[96, 124, 132].map((width) => (
          <div key={width} className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" style={{ width }} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
        <div className="space-y-5">
          {[7, 6].map((rows) => (
            <section key={rows} className="admin-panel overflow-hidden p-5 sm:p-6">
              <div className="h-5 w-40 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="mt-5 space-y-4">
                {Array.from({ length: rows }).map((_, index) => (
                  <div key={index} className="h-4 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/70" />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="space-y-5">
          {[6, 3].map((rows) => (
            <section key={rows} className="admin-panel overflow-hidden p-5 sm:p-6">
              <div className="h-5 w-36 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="mt-5 space-y-4">
                {Array.from({ length: rows }).map((_, index) => (
                  <div key={index} className="h-4 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/70" />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <span className="sr-only">Đang tải dữ liệu</span>
    </article>
  );
}

function IncidentDetailState({ state, onRetry }) {
  const content = {
    [STAFF_INCIDENT_DETAIL_STATE.API_UNAVAILABLE]: {
      icon: Lucide.ServerOff,
      title: 'Chưa có API hỗ trợ chi tiết sự vụ',
      description: 'Backend hiện chưa cung cấp dữ liệu chi tiết cho sự vụ này.',
    },
    [STAFF_INCIDENT_DETAIL_STATE.ERROR]: {
      icon: Lucide.TriangleAlert,
      title: 'Không thể tải chi tiết sự vụ',
      description: 'Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng thử lại.',
      action: (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <Lucide.RefreshCw size={16} aria-hidden="true" />
          Thử lại
        </Button>
      ),
    },
    [STAFF_INCIDENT_DETAIL_STATE.NOT_FOUND]: {
      icon: Lucide.FileQuestion,
      title: 'Không tìm thấy sự vụ',
      description: 'Sự vụ này không tồn tại hoặc hiện không còn khả dụng.',
    },
  }[state];

  if (!content) return null;

  return (
    <article className="admin-page-shell space-y-5">
      <Breadcrumbs />
      <EmptyState {...content} />
      <div className="flex justify-center">
        <Link
          to="/staff/incidents"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-950"
        >
          <Lucide.ArrowLeft size={16} aria-hidden="true" />
          Quay lại danh sách sự vụ
        </Link>
      </div>
    </article>
  );
}

function IncidentTabs({ activeTab, onTabChange, reportCount }) {
  const tabRefs = useRef([]);
  const parsedReportCount = Number(reportCount);
  const hasReportCount = Number.isFinite(parsedReportCount) && parsedReportCount >= 0;

  const handleKeyDown = (event, currentIndex) => {
    let nextIndex = null;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TAB_ITEMS.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TAB_ITEMS.length) % TAB_ITEMS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TAB_ITEMS.length - 1;

    if (nextIndex === null) return;

    event.preventDefault();
    onTabChange(TAB_ITEMS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      <div className="flex min-w-max gap-1" role="tablist" aria-label="Nội dung chi tiết sự vụ">
        {TAB_ITEMS.map((tab, index) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          const label = tab.id === 'reports' && hasReportCount
            ? `${tab.label} (${parsedReportCount.toLocaleString('vi-VN')})`
            : tab.label;

          return (
            <button
              key={tab.id}
              ref={(node) => { tabRefs.current[index] = node; }}
              id={`incident-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`incident-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`relative inline-flex min-h-12 items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-100 dark:focus-visible:ring-blue-950 ${
                selected
                  ? 'bg-blue-50/70 text-blue-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-600 dark:bg-blue-950/25 dark:text-blue-300'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OverviewPanel({ incident, capability }) {
  const incidentCode = formatIncidentCode(incident?.incidentId);
  const title = String(incident?.title ?? '').trim() || EMPTY_VALUE;
  const description = String(incident?.description ?? '').trim() || EMPTY_VALUE;
  const locationText = String(incident?.locationText ?? '').trim() || EMPTY_VALUE;
  const areaName = String(incident?.areaName ?? '').trim() || EMPTY_VALUE;
  const categoryName = String(incident?.categoryName ?? '').trim() || EMPTY_VALUE;
  const assignedStaffName = String(incident?.assignedStaffName ?? '').trim();

  return (
    <div
      id="incident-panel-overview"
      role="tabpanel"
      aria-labelledby="incident-tab-overview"
      tabIndex={0}
      className="grid gap-5 focus-visible:outline-none xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]"
    >
      <div className="min-w-0 space-y-5">
        <section className="admin-panel overflow-hidden" aria-labelledby="incident-identity-title">
          <SectionHeading
            id="incident-identity-title"
            icon={Lucide.Fingerprint}
            title="Nhận diện sự vụ"
            description="Thông tin cốt lõi để nhận biết và xác định vị trí sự vụ."
          />
          <dl className="divide-y divide-slate-100 px-5 sm:px-6 dark:divide-slate-800/80">
            <MetadataRow label="Mã sự vụ" icon={Lucide.Hash} value={incidentCode} valueClassName="font-mono break-all" />
            <MetadataRow label="Tiêu đề" icon={Lucide.Type} value={title} />
            <MetadataRow
              label="Mô tả"
              icon={Lucide.AlignLeft}
              value={<span className="whitespace-pre-line font-medium text-slate-700 dark:text-slate-200">{description}</span>}
            />
            <MetadataRow label="Vị trí ghi nhận" icon={Lucide.MapPin} value={locationText} />
            <MetadataRow
              label="Tọa độ"
              icon={Lucide.Crosshair}
              value={formatCoordinates(incident?.latitude, incident?.longitude)}
              valueClassName="font-mono"
            />
          </dl>
        </section>

        <section className="admin-panel overflow-hidden" aria-labelledby="incident-classification-title">
          <SectionHeading
            id="incident-classification-title"
            icon={Lucide.Tags}
            title="Phân loại"
            description="Phạm vi, danh mục và mức độ cần ưu tiên theo dữ liệu sự vụ."
          />
          <dl className="grid sm:grid-cols-2">
            <ClassificationItem label="Phường / Khu vực">{areaName}</ClassificationItem>
            <ClassificationItem label="Danh mục">{categoryName}</ClassificationItem>
            <ClassificationItem label="Trạng thái">
              <Badge intent={getStatusIntent(incident?.status)}>
                {getEnumLabel(incident?.status, STATUS_LABELS)}
              </Badge>
            </ClassificationItem>
            <ClassificationItem label="Mức ưu tiên">
              <Badge intent={getPriorityIntent(incident?.priority)}>
                {getEnumLabel(incident?.priority, PRIORITY_LABELS)}
              </Badge>
            </ClassificationItem>
            <ClassificationItem label="Mức độ nghiêm trọng">
              <Badge intent={getSeverityIntent(incident?.severity)}>
                {getEnumLabel(incident?.severity, SEVERITY_LABELS)}
              </Badge>
            </ClassificationItem>
            <ClassificationItem label="Trạng thái gộp">
              {incident?.mergedIntoIncidentId ? (
                <span className="space-y-1">
                  <Badge intent="neutral">Đã gộp</Badge>
                  <span className="block break-all font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sang {formatIncidentCode(incident.mergedIntoIncidentId)}
                  </span>
                </span>
              ) : 'Chưa gộp'}
            </ClassificationItem>
          </dl>
        </section>
      </div>

      <aside className="min-w-0 space-y-5" aria-label="Thông tin xử lý sự vụ">
        <section className="admin-panel overflow-hidden" aria-labelledby="incident-handling-title">
          <SectionHeading
            id="incident-handling-title"
            icon={Lucide.BriefcaseBusiness}
            title="Theo dõi xử lý"
            description="Phân công, số lượng phản ánh và các mốc thời gian của sự vụ."
          />

          <div className="border-b border-slate-100 px-5 py-5 sm:px-6 dark:border-slate-800/80">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" aria-hidden="true">
                <Lucide.UserRoundCheck size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Staff phụ trách
                </p>
                <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-900 dark:text-slate-100">
                  {assignedStaffName || 'Chưa có dữ liệu Staff phụ trách'}
                </p>
              </div>
            </div>
          </div>

          <dl className="divide-y divide-slate-100 px-5 sm:px-6 dark:divide-slate-800/80">
            <MetadataRow label="Số phản ánh" value={formatCount(incident?.reportCount)} />
            <MetadataRow label="Người theo dõi" value={formatCount(incident?.subscriberCount)} />
            <MetadataRow label="Thời gian tạo" value={formatDateTime(incident?.createdAt)} />
            <MetadataRow label="Cập nhật gần nhất" value={formatDateTime(incident?.updatedAt)} />
            <MetadataRow label="Hạn dự kiến" value={formatDateTime(incident?.dueDate)} />
            <MetadataRow label="Đã giải quyết lúc" value={formatDateTime(incident?.resolvedAt)} />
            <MetadataRow label="Đã đóng lúc" value={formatDateTime(incident?.closedAt)} />
          </dl>
        </section>

        <section className="admin-panel overflow-hidden" aria-labelledby="incident-sla-title">
          <SectionHeading
            id="incident-sla-title"
            icon={Lucide.ClockAlert}
            title="SLA sự vụ"
            description="Cam kết thời gian xử lý ở cấp sự vụ."
          />
          <div className="px-5 py-5 sm:px-6">
            {!capability.incidentLevelSla ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/50" role="note">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Chưa có API SLA theo sự vụ</p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  SLA hiện chưa được backend cung cấp ở cấp Incident.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </aside>
    </div>
  );
}

export default function StaffIncidentDetailPage() {
  const { incidentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { capability, incident, retry, state } = useStaffIncidentDetail(incidentId);
  const requestedTab = searchParams.get('tab');
  const activeTab = useMemo(
    () => TAB_ITEMS.some((tab) => tab.id === requestedTab) ? requestedTab : 'overview',
    [requestedTab],
  );

  const selectTab = (tabId) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (tabId === 'overview') nextSearchParams.delete('tab');
    else nextSearchParams.set('tab', tabId);
    setSearchParams(nextSearchParams, { replace: true });
  };

  if (state === STAFF_INCIDENT_DETAIL_STATE.LOADING) {
    return <IncidentDetailSkeleton />;
  }

  if (state !== STAFF_INCIDENT_DETAIL_STATE.READY || !incident) {
    return <IncidentDetailState state={state} onRetry={retry} />;
  }

  const incidentTitle = String(incident?.title ?? '').trim() || 'Sự vụ chưa có tiêu đề';

  return (
    <article className="admin-page-shell space-y-5 pb-6">
      <Breadcrumbs />

      <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{formatIncidentCode(incident?.incidentId)}</span>
              {incident?.mergedIntoIncidentId ? <span aria-hidden="true">•</span> : null}
              {incident?.mergedIntoIncidentId ? <span>Đã gộp</span> : null}
            </div>
            <h1 className="mt-2 max-w-4xl text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-3xl dark:text-white">
              {incidentTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Tổng hợp thông tin nhận diện, phân loại và phân công của sự vụ.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge intent={getStatusIntent(incident?.status)} className="px-3 py-1.5 text-xs">
              Trạng thái: {getEnumLabel(incident?.status, STATUS_LABELS)}
            </Badge>
            <Badge intent={getPriorityIntent(incident?.priority)} className="px-3 py-1.5 text-xs">
              Ưu tiên: {getEnumLabel(incident?.priority, PRIORITY_LABELS)}
            </Badge>
          </div>
        </div>
      </header>

      <IncidentTabs
        activeTab={activeTab}
        onTabChange={selectTab}
        reportCount={incident?.reportCount}
      />

      {activeTab === 'overview' ? (
        <OverviewPanel incident={incident} capability={capability} />
      ) : null}
      {activeTab === 'reports' ? (
        <StaffIncidentReportsPanel incident={incident} capability={capability} />
      ) : null}
      {activeTab === 'timeline' ? (
        <StaffIncidentTimelinePanel incidentId={incident?.incidentId || incidentId} />
      ) : null}
    </article>
  );
}
