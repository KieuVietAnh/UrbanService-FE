// src/pages/tickets/TicketListPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { ticketApi } from '../../services/api/ticketApi';
import { toolsApi } from '@urbanmind/shared-api';
import { getStatusLabel, managementTypes } from '@urbanmind/shared-types';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import PublicPageMotion from '../../components/public/PublicPageMotion';

const TICKET_LIST_SNAPSHOT_STORAGE_KEY =
  'urbanmind-service-user-ticket-list-snapshot';
const TICKET_CATEGORY_SNAPSHOT_STORAGE_KEY =
  'urbanmind-service-user-ticket-category-snapshot';
const TICKET_LIST_RETURN_STORAGE_KEY =
  'urbanmind-ticket-list-return';

const readSessionArray = (storageKey) => {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const writeSessionArray = (storageKey, items) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify(items)
    );
  } catch {
    // Storage can be unavailable in private mode.
  }
};

const readTicketListReturnContext = () => {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.sessionStorage.getItem(
      TICKET_LIST_RETURN_STORAGE_KEY
    );
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object'
      ? parsedValue
      : null;
  } catch {
    return null;
  }
};

const writeTicketListReturnContext = (context) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      TICKET_LIST_RETURN_STORAGE_KEY,
      JSON.stringify(context)
    );
  } catch {
    // Storage can be unavailable in private mode.
  }
};

const STATUS_FILTER_VALUES = {
  ALL: '',
  PROCESSING: '__processing__',
  CHECKING: '__checking__',
  RESULTS: '__results__',
  AWAITING_REVIEW: managementTypes.feedbackStatus.APPROVED,
  ENDED: managementTypes.feedbackStatus.CLOSED,
};

const PROCESSING_STATUSES = new Set([
  managementTypes.feedbackStatus.SUBMITTED,
  managementTypes.feedbackStatus.AI_REVIEWED,
  managementTypes.feedbackStatus.VERIFIED,
  managementTypes.feedbackStatus.ASSIGNED,
  managementTypes.feedbackStatus.IN_PROGRESS,
  managementTypes.feedbackStatus.NEED_REWORK,
]);

const CHECKING_STATUSES = new Set([
  managementTypes.feedbackStatus.RESOLVED,
  managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
]);

const RESULT_STATUSES = new Set([
  managementTypes.feedbackStatus.RESOLVED,
  managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
  managementTypes.feedbackStatus.APPROVED,
  managementTypes.feedbackStatus.CLOSED,
]);

const STATUS_QUERY_VALUES = {
  processing: STATUS_FILTER_VALUES.PROCESSING,
  checking: STATUS_FILTER_VALUES.CHECKING,
  results: STATUS_FILTER_VALUES.RESULTS,
  'awaiting-review': STATUS_FILTER_VALUES.AWAITING_REVIEW,
  ended: STATUS_FILTER_VALUES.ENDED,
};

const getStatusFilterFromQuery = (queryValue) => (
  STATUS_QUERY_VALUES[queryValue] || ''
);

const getStatusQueryValue = (statusValue) => {
  const matchedEntry = Object.entries(STATUS_QUERY_VALUES)
    .find(([, value]) => String(value) === String(statusValue));

  return matchedEntry?.[0] || '';
};

const STATUS_OPTIONS = [
  { value: STATUS_FILTER_VALUES.ALL, label: 'Tất cả trạng thái' },
  { value: STATUS_FILTER_VALUES.PROCESSING, label: 'Đang xử lý' },
  { value: STATUS_FILTER_VALUES.CHECKING, label: 'Đang kiểm tra kết quả' },
  { value: STATUS_FILTER_VALUES.RESULTS, label: 'Có kết quả' },
  { value: STATUS_FILTER_VALUES.AWAITING_REVIEW, label: 'Chờ bạn đánh giá' },
  { value: STATUS_FILTER_VALUES.ENDED, label: 'Đã kết thúc' },
  { value: managementTypes.feedbackStatus.REJECTED, label: 'Không tiếp nhận' },
  { value: managementTypes.feedbackStatus.CANCELLED, label: 'Đã hủy' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Cập nhật mới nhất' },
  { value: 'oldest', label: 'Cũ nhất trước' },
  { value: 'status', label: 'Tiến trình xử lý' },
];

const CATEGORY_LABELS = {
  Drainage: 'Thoát nước',
  'Garbage Collection': 'Thu gom rác',
  'Public Safety': 'An toàn công cộng',
  'Road Maintenance': 'Bảo trì đường bộ',
  'Street Lighting': 'Chiếu sáng đô thị',
  'Water Supply': 'Cấp nước',
};

const getCategoryLabel = (categoryName) => (
  CATEGORY_LABELS[categoryName] || categoryName || 'Chưa phân loại'
);

const formatDate = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getCitizenStatusMeta = (status) => {
  const statusMap = {
    [managementTypes.feedbackStatus.SUBMITTED]: {
      label: 'Đã tiếp nhận',
      icon: Lucide.Inbox,
      tone: 'blue',
    },
    [managementTypes.feedbackStatus.AI_REVIEWED]: {
      label: 'Đang phân loại',
      icon: Lucide.ScanSearch,
      tone: 'violet',
    },
    [managementTypes.feedbackStatus.VERIFIED]: {
      label: 'Đã xác minh',
      icon: Lucide.BadgeCheck,
      tone: 'blue',
    },
    [managementTypes.feedbackStatus.ASSIGNED]: {
      label: 'Đã chuyển xử lý',
      icon: Lucide.Send,
      tone: 'blue',
    },
    [managementTypes.feedbackStatus.IN_PROGRESS]: {
      label: 'Đang xử lý',
      icon: Lucide.LoaderCircle,
      tone: 'amber',
    },
    [managementTypes.feedbackStatus.RESOLVED]: {
      label: 'Đang kiểm tra kết quả',
      icon: Lucide.ClipboardCheck,
      tone: 'amber',
    },
    [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: {
      label: 'Đang kiểm tra kết quả',
      icon: Lucide.ClipboardCheck,
      tone: 'amber',
    },
    [managementTypes.feedbackStatus.NEED_REWORK]: {
      label: 'Cần bổ sung xử lý',
      icon: Lucide.RotateCcw,
      tone: 'amber',
    },
    [managementTypes.feedbackStatus.APPROVED]: {
      label: 'Chờ bạn đánh giá',
      icon: Lucide.Star,
      tone: 'green',
    },
    [managementTypes.feedbackStatus.CLOSED]: {
      label: 'Đã kết thúc',
      icon: Lucide.CircleCheckBig,
      tone: 'green',
    },
    [managementTypes.feedbackStatus.REJECTED]: {
      label: 'Không tiếp nhận',
      icon: Lucide.CircleX,
      tone: 'red',
    },
    [managementTypes.feedbackStatus.CANCELLED]: {
      label: 'Đã hủy',
      icon: Lucide.Ban,
      tone: 'slate',
    },
  };

  return statusMap[status] || {
    label: getStatusLabel(status, 'Đang cập nhật'),
    icon: Lucide.Clock3,
    tone: 'slate',
  };
};

const CitizenTicketThemeStyles = () => (
  <style>{`
    .citizen-ticket-page {
      --ticket-blue: #2563eb;
      --ticket-blue-soft: rgba(37, 99, 235, 0.1);
      --ticket-blue-border: rgba(37, 99, 235, 0.24);
      --ticket-violet: #6d28d9;
      --ticket-violet-soft: rgba(109, 40, 217, 0.1);
      --ticket-violet-border: rgba(109, 40, 217, 0.24);
      --ticket-amber: #b45309;
      --ticket-amber-soft: rgba(217, 119, 6, 0.1);
      --ticket-amber-border: rgba(217, 119, 6, 0.28);
      --ticket-green: #047857;
      --ticket-green-soft: rgba(5, 150, 105, 0.1);
      --ticket-green-border: rgba(5, 150, 105, 0.26);
      --ticket-red: #b91c1c;
      --ticket-red-soft: rgba(220, 38, 38, 0.08);
      --ticket-red-border: rgba(220, 38, 38, 0.24);
      --ticket-slate: #64748b;
      --ticket-slate-soft: rgba(100, 116, 139, 0.1);
      --ticket-slate-border: rgba(100, 116, 139, 0.24);
    }

    .citizen-ticket-page-shell {
      border-color: rgba(148, 163, 184, 0.42);
      background:
        radial-gradient(circle at 8% 5%, rgba(59, 130, 246, 0.09), transparent 25%),
        radial-gradient(circle at 92% 10%, rgba(14, 165, 233, 0.07), transparent 25%),
        linear-gradient(180deg, rgba(226, 235, 247, 0.9), rgba(242, 247, 252, 0.72));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.86),
        0 24px 70px rgba(15, 23, 42, 0.07);
    }

    .citizen-ticket-hero,
    .citizen-ticket-panel {
      border-color: var(--public-border);
      background: var(--public-surface);
      box-shadow: var(--public-shadow);
    }

    .citizen-ticket-hero {
      background:
        radial-gradient(circle at 88% 18%, rgba(34, 211, 238, 0.12), transparent 28%),
        radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.1), transparent 27%),
        linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(243, 248, 255, 0.96));
    }

    .citizen-ticket-summary {
      border-color: rgba(148, 163, 184, 0.34);
      background: rgba(255, 255, 255, 0.76);
      color: var(--public-title);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
    }

    .citizen-ticket-summary:hover,
    .citizen-ticket-summary.is-active {
      border-color: var(--summary-border);
      background: var(--summary-soft);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.78),
        0 10px 28px rgba(15, 23, 42, 0.08);
    }

    .citizen-ticket-summary-blue {
      --summary-color: var(--ticket-blue);
      --summary-soft: var(--ticket-blue-soft);
      --summary-border: var(--ticket-blue-border);
    }

    .citizen-ticket-summary-violet {
      --summary-color: var(--ticket-violet);
      --summary-soft: var(--ticket-violet-soft);
      --summary-border: var(--ticket-violet-border);
    }

    .citizen-ticket-summary-amber {
      --summary-color: var(--ticket-amber);
      --summary-soft: var(--ticket-amber-soft);
      --summary-border: var(--ticket-amber-border);
    }

    .citizen-ticket-summary-green {
      --summary-color: var(--ticket-green);
      --summary-soft: var(--ticket-green-soft);
      --summary-border: var(--ticket-green-border);
    }

    .citizen-ticket-summary-icon,
    .citizen-ticket-summary-value {
      color: var(--summary-color);
    }

    .citizen-ticket-control,
    .citizen-ticket-input {
      border-color: var(--public-border);
      background: var(--public-surface-strong);
      color: var(--public-title);
    }

    .citizen-ticket-control:hover,
    .citizen-ticket-control:focus-visible,
    .citizen-ticket-input:focus {
      border-color: rgba(37, 99, 235, 0.5);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .citizen-ticket-input::placeholder {
      color: var(--public-muted);
    }

    .citizen-ticket-menu {
      border-color: var(--public-border);
      background: var(--public-surface-strong);
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
    }

    .citizen-ticket-option {
      color: var(--public-copy);
    }

    .citizen-ticket-option:hover {
      background: var(--public-surface-soft);
      color: var(--public-title);
    }

    .citizen-ticket-option.is-selected {
      background: var(--ticket-blue-soft);
      color: var(--ticket-blue);
    }

    .citizen-ticket-divider {
      border-color: var(--public-border);
    }

    .citizen-ticket-list > li + li {
      border-top: 1px solid var(--public-border);
    }

    .citizen-ticket-row {
      color: var(--public-title);
    }

    .citizen-ticket-row:hover {
      background: rgba(37, 99, 235, 0.045);
    }

    .citizen-ticket-row:hover .citizen-ticket-row-title,
    .citizen-ticket-row:hover .citizen-ticket-row-arrow {
      color: var(--ticket-blue);
    }

    .citizen-ticket-row:hover .citizen-ticket-row-arrow {
      border-color: var(--ticket-blue-border);
      background: var(--ticket-blue-soft);
    }

    .citizen-ticket-row.is-returned {
      background: rgba(37, 99, 235, 0.055);
      box-shadow: inset 3px 0 0 var(--ticket-blue);
      animation: citizen-ticket-return-highlight 2.5s ease-out both;
    }

    .citizen-ticket-row.is-returned .citizen-ticket-row-title,
    .citizen-ticket-row.is-returned .citizen-ticket-row-arrow {
      color: var(--ticket-blue);
    }

    .citizen-ticket-row.is-returned .citizen-ticket-row-arrow {
      border-color: var(--ticket-blue-border);
      background: var(--ticket-blue-soft);
    }

    @keyframes citizen-ticket-return-highlight {
      0%, 72% {
        background: rgba(37, 99, 235, 0.075);
        box-shadow: inset 3px 0 0 var(--ticket-blue);
      }
      100% {
        background: transparent;
        box-shadow: inset 0 0 0 transparent;
      }
    }

    .citizen-ticket-eyebrow,
    .citizen-ticket-clear-button {
      color: var(--ticket-blue);
    }

    .citizen-ticket-filter-icon,
    .citizen-ticket-sync,
    .citizen-ticket-active-chip {
      border-color: var(--ticket-blue-border);
      background: var(--ticket-blue-soft);
      color: var(--ticket-blue);
    }

    .citizen-ticket-skeleton-strong {
      background: rgba(203, 213, 225, 0.78);
    }

    .citizen-ticket-skeleton-soft {
      background: rgba(226, 232, 240, 0.78);
    }

    .citizen-ticket-row-icon {
      border-color: rgba(37, 99, 235, 0.18);
      background: rgba(37, 99, 235, 0.08);
      color: var(--ticket-blue);
    }

    .citizen-status {
      border-color: var(--status-border);
      background: var(--status-soft);
      color: var(--status-color);
    }

    .citizen-status-blue {
      --status-color: var(--ticket-blue);
      --status-soft: var(--ticket-blue-soft);
      --status-border: var(--ticket-blue-border);
    }

    .citizen-status-violet {
      --status-color: var(--ticket-violet);
      --status-soft: var(--ticket-violet-soft);
      --status-border: var(--ticket-violet-border);
    }

    .citizen-status-amber {
      --status-color: var(--ticket-amber);
      --status-soft: var(--ticket-amber-soft);
      --status-border: var(--ticket-amber-border);
    }

    .citizen-status-green {
      --status-color: var(--ticket-green);
      --status-soft: var(--ticket-green-soft);
      --status-border: var(--ticket-green-border);
    }

    .citizen-status-red {
      --status-color: var(--ticket-red);
      --status-soft: var(--ticket-red-soft);
      --status-border: var(--ticket-red-border);
    }

    .citizen-status-slate {
      --status-color: var(--ticket-slate);
      --status-soft: var(--ticket-slate-soft);
      --status-border: var(--ticket-slate-border);
    }

    .citizen-ticket-primary-button {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
    }

    .citizen-ticket-primary-button:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    .citizen-ticket-secondary-button {
      border-color: var(--public-border);
      background: var(--public-surface-strong);
      color: var(--public-title);
    }

    .citizen-ticket-secondary-button:hover {
      border-color: rgba(37, 99, 235, 0.35);
      background: var(--public-surface-soft);
      color: #2563eb;
    }

    html[data-theme="dark"] .citizen-ticket-page {
      --ticket-blue: #7db5ff;
      --ticket-blue-soft: rgba(37, 99, 235, 0.18);
      --ticket-blue-border: rgba(96, 165, 250, 0.28);
      --ticket-violet: #c4b5fd;
      --ticket-violet-soft: rgba(109, 40, 217, 0.2);
      --ticket-violet-border: rgba(167, 139, 250, 0.28);
      --ticket-amber: #fbbf24;
      --ticket-amber-soft: rgba(217, 119, 6, 0.16);
      --ticket-amber-border: rgba(251, 191, 36, 0.26);
      --ticket-green: #6ee7b7;
      --ticket-green-soft: rgba(5, 150, 105, 0.17);
      --ticket-green-border: rgba(110, 231, 183, 0.24);
      --ticket-red: #fca5a5;
      --ticket-red-soft: rgba(220, 38, 38, 0.16);
      --ticket-red-border: rgba(248, 113, 113, 0.24);
      --ticket-slate: #a8b6ca;
      --ticket-slate-soft: rgba(100, 116, 139, 0.16);
      --ticket-slate-border: rgba(148, 163, 184, 0.2);
    }

    html[data-theme="dark"] .citizen-ticket-page-shell {
      border-color: rgba(71, 85, 105, 0.5);
      background:
        radial-gradient(circle at 8% 5%, rgba(37, 99, 235, 0.13), transparent 25%),
        radial-gradient(circle at 92% 10%, rgba(8, 145, 178, 0.1), transparent 25%),
        linear-gradient(180deg, rgba(8, 22, 42, 0.9), rgba(5, 13, 27, 0.72));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.035),
        0 24px 70px rgba(0, 0, 0, 0.24);
    }

    html[data-theme="dark"] .citizen-ticket-hero,
    html[data-theme="dark"] .citizen-ticket-panel {
      border-color: rgba(96, 165, 250, 0.18);
      background:
        radial-gradient(circle at 92% 2%, rgba(37, 99, 235, 0.07), transparent 24%),
        linear-gradient(145deg, rgba(13, 29, 54, 0.98), rgba(8, 20, 40, 0.98));
      box-shadow:
        0 26px 72px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    html[data-theme="dark"] .citizen-ticket-summary {
      border-color: rgba(71, 85, 105, 0.54);
      background: rgba(7, 18, 36, 0.76);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
    }

    html[data-theme="dark"] .citizen-ticket-summary:hover,
    html[data-theme="dark"] .citizen-ticket-summary.is-active {
      border-color: var(--summary-border);
      background: var(--summary-soft);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.035),
        0 12px 30px rgba(0, 0, 0, 0.22);
    }

    html[data-theme="dark"] .citizen-ticket-control,
    html[data-theme="dark"] .citizen-ticket-input,
    html[data-theme="dark"] .citizen-ticket-menu,
    html[data-theme="dark"] .citizen-ticket-secondary-button {
      border-color: rgba(71, 85, 105, 0.62);
      background: rgba(7, 18, 36, 0.88);
      color: #f8fafc;
    }

    html[data-theme="dark"] .citizen-ticket-option:hover,
    html[data-theme="dark"] .citizen-ticket-row:hover {
      background: rgba(37, 99, 235, 0.1);
    }

    html[data-theme="dark"] .citizen-ticket-skeleton-strong {
      background: rgba(255, 255, 255, 0.08);
    }

    html[data-theme="dark"] .citizen-ticket-skeleton-soft {
      background: rgba(255, 255, 255, 0.05);
    }

    html[data-theme="dark"] .citizen-ticket-divider {
      border-color: rgba(71, 85, 105, 0.52);
    }

    html[data-theme="dark"] .citizen-ticket-row-icon {
      border-color: rgba(96, 165, 250, 0.24);
      background: rgba(30, 64, 175, 0.22);
      color: #93c5fd;
    }

    html[data-theme="dark"] .citizen-ticket-secondary-button:hover {
      border-color: rgba(96, 165, 250, 0.34);
      background: rgba(17, 38, 70, 0.92);
      color: #dbeafe;
    }
  `}</style>
);

const FilterDropdown = ({
  menuId,
  value,
  options,
  onChange,
  icon: Icon,
  label,
  openMenu,
  setOpenMenu,
}) => {
  const isOpen = openMenu === menuId;
  const selectedOption = options.find(
    (option) => String(option.value) === String(value)
  ) || options[0];

  return (
    <section className="relative min-w-0" data-ticket-menu>
      <button
        type="button"
        onClick={() => setOpenMenu(isOpen ? null : menuId)}
        className="citizen-ticket-control flex h-11 w-full items-center gap-2 rounded-xl border px-3 text-sm font-medium outline-none transition"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon
          size={15}
          className="shrink-0 text-[var(--public-muted)]"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-left">
          {selectedOption?.label}
        </span>
        <Lucide.ChevronDown
          size={15}
          className={`shrink-0 text-[var(--public-muted)] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <menu
          className="citizen-ticket-menu absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border p-1.5"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);

            return (
              <li key={String(option.value || 'all')}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpenMenu(null);
                  }}
                  className={`citizen-ticket-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    isSelected ? 'is-selected font-semibold' : ''
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <Lucide.Check
                      size={15}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </menu>
      ) : null}
    </section>
  );
};

const SummaryButton = ({
  label,
  helper,
  value,
  icon: Icon,
  tone,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`citizen-ticket-summary citizen-ticket-summary-${tone} ${
      active ? 'is-active' : ''
    } group min-w-0 rounded-2xl border px-4 py-3.5 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25`}
  >
    <span className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--public-muted)]">
      {label}
      <Icon
        size={15}
        className="citizen-ticket-summary-icon"
        aria-hidden="true"
      />
    </span>
    <strong className="citizen-ticket-summary-value mt-1.5 block text-2xl font-bold tracking-tight">
      {value}
    </strong>
    <span className="mt-1 block truncate text-[11px] text-[var(--public-copy)]">
      {helper}
    </span>
  </button>
);

const TicketListSkeleton = () => (
  <ol className="citizen-ticket-list" aria-hidden="true">
    {[0, 1, 2, 3].map((item) => (
      <li key={item}>
        <div className="grid animate-pulse gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <div className="citizen-ticket-skeleton-soft h-11 w-11 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="citizen-ticket-skeleton-strong h-4 w-64 max-w-[70%] rounded" />
              <div className="mt-3 flex gap-3">
                <div className="citizen-ticket-skeleton-soft h-3 w-24 rounded" />
                <div className="citizen-ticket-skeleton-soft h-3 w-32 rounded" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-[60px] lg:pl-0">
            <div className="citizen-ticket-skeleton-soft h-7 w-32 rounded-full" />
            <div className="citizen-ticket-skeleton-soft h-8 w-8 rounded-xl" />
          </div>
        </div>
      </li>
    ))}
  </ol>
);

export const TicketListPage = () => {
  const pageRootRef = useRef(null);
  const filtersSectionRef = useRef(null);
  const filtersReadyRef = useRef(false);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [restoredContext] = useState(() => {
    const storedContext = readTicketListReturnContext();
    const restoreTicketId = location.state?.restoreTicketId;

    if (!restoreTicketId) return storedContext;

    return {
      ...(storedContext || {}),
      ticketId: restoreTicketId,
      pendingRestore: true,
    };
  });
  const restoreContextRef = useRef(restoredContext);
  const [cachedTickets] = useState(() => (
    readSessionArray(TICKET_LIST_SNAPSHOT_STORAGE_KEY)
  ));
  const [cachedCategories] = useState(() => (
    readSessionArray(TICKET_CATEGORY_SNAPSHOT_STORAGE_KEY)
  ));
  const [tickets, setTickets] = useState(cachedTickets);
  const [categories, setCategories] = useState(cachedCategories);
  const [search, setSearch] = useState(
    () => searchParams.get('search') || ''
  );
  const [status, setStatus] = useState(
    () => getStatusFilterFromQuery(
      searchParams.get('status')
    )
  );
  const [categoryId, setCategoryId] = useState(
    () => searchParams.get('category') || ''
  );
  const [sortKey, setSortKey] = useState(() => {
    const requestedSort = searchParams.get('sort');

    return SORT_OPTIONS.some(
      (option) => option.value === requestedSort
    )
      ? requestedSort
      : 'newest';
  });
  const [openMenu, setOpenMenu] = useState(null);
  const [loading, setLoading] = useState(
    cachedTickets.length === 0
  );
  const [refreshing, setRefreshing] = useState(
    cachedTickets.length > 0
  );
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(() => (
    Math.max(1, Number(restoredContext?.page) || 1)
  ));
  const [highlightedTicketId, setHighlightedTicketId] = useState('');
  const pageSize = 6;

  const loadTickets = useCallback(async () => {
    const hasCachedTickets = cachedTickets.length > 0;

    if (hasCachedTickets) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await ticketApi.getTickets(
        { pageNumber: 1, pageSize: 100 },
        { role: 'service-user' }
      );
      const nextTickets = Array.isArray(response) ? response : [];

      setTickets(nextTickets);
      writeSessionArray(
        TICKET_LIST_SNAPSHOT_STORAGE_KEY,
        nextTickets
      );
    } catch (err) {
      console.error('Không thể tải danh sách phản ánh', err);

      if (!hasCachedTickets) {
        setTickets([]);
      }

      setError(err?.message || 'Không thể tải danh sách phản ánh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cachedTickets.length]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams();
    const trimmedSearch = search.trim();
    const statusQueryValue = getStatusQueryValue(status);

    if (trimmedSearch) {
      nextSearchParams.set('search', trimmedSearch);
    }
    if (statusQueryValue) {
      nextSearchParams.set('status', statusQueryValue);
    }
    if (categoryId) {
      nextSearchParams.set('category', String(categoryId));
    }
    if (sortKey !== 'newest') {
      nextSearchParams.set('sort', sortKey);
    }

    if (nextSearchParams.toString() === searchParams.toString()) {
      return;
    }

    setSearchParams(nextSearchParams, {
      replace: true,
      state: location.state,
    });
  }, [
    categoryId,
    location.state,
    search,
    searchParams,
    setSearchParams,
    sortKey,
    status,
  ]);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const response = await toolsApi.getCategories();
        const nextCategories = Array.isArray(response)
          ? response
          : [];

        if (active) {
          setCategories(nextCategories);
          writeSessionArray(
            TICKET_CATEGORY_SNAPSHOT_STORAGE_KEY,
            nextCategories
          );
        }
      } catch (err) {
        console.warn('Không thể tải danh mục phản ánh', err);
      }
    };

    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const closeMenus = (event) => {
      if (!event.target.closest('[data-ticket-menu]')) setOpenMenu(null);
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!filtersReadyRef.current) {
      filtersReadyRef.current = true;
      return;
    }

    setCurrentPage(1);
  }, [search, status, categoryId, sortKey]);

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Tất cả danh mục' },
    ...categories.map((category) => ({
      value: category.categoryId,
      label: getCategoryLabel(category.categoryName),
    })),
  ], [categories]);

  const summary = useMemo(() => ({
    total: tickets.length,
    inProgress: tickets.filter(
      (ticket) => PROCESSING_STATUSES.has(ticket.status)
    ).length,
    checking: tickets.filter(
      (ticket) => CHECKING_STATUSES.has(ticket.status)
    ).length,
    awaitingReview: tickets.filter(
      (ticket) => ticket.status === managementTypes.feedbackStatus.APPROVED
    ).length,
    ended: tickets.filter(
      (ticket) => ticket.status === managementTypes.feedbackStatus.CLOSED
    ).length,
  }), [tickets]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    const statusOrder = {
      [managementTypes.feedbackStatus.SUBMITTED]: 1,
      [managementTypes.feedbackStatus.AI_REVIEWED]: 2,
      [managementTypes.feedbackStatus.VERIFIED]: 3,
      [managementTypes.feedbackStatus.ASSIGNED]: 4,
      [managementTypes.feedbackStatus.IN_PROGRESS]: 5,
      [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 6,
      [managementTypes.feedbackStatus.NEED_REWORK]: 7,
      [managementTypes.feedbackStatus.APPROVED]: 8,
      [managementTypes.feedbackStatus.CLOSED]: 9,
      [managementTypes.feedbackStatus.REJECTED]: 10,
      [managementTypes.feedbackStatus.CANCELLED]: 11,
    };

    return [...tickets]
      .filter((ticket) => {
        const matchesSearch = !query || [
          ticket.title,
          ticket.areaName,
          getCategoryLabel(ticket.categoryName),
        ].some((value) => String(value || '').toLowerCase().includes(query));

        const matchesStatus = (() => {
          if (!status) return true;
          if (status === STATUS_FILTER_VALUES.PROCESSING) {
            return PROCESSING_STATUSES.has(ticket.status);
          }
          if (status === STATUS_FILTER_VALUES.CHECKING) {
            return CHECKING_STATUSES.has(ticket.status);
          }
          if (status === STATUS_FILTER_VALUES.RESULTS) {
            return RESULT_STATUSES.has(ticket.status);
          }
          return ticket.status === status;
        })();
        const matchesCategory = categoryId
          ? String(ticket.categoryId) === String(categoryId)
          : true;

        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        if (sortKey === 'oldest') {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }

        if (sortKey === 'status') {
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        }

        return new Date(b.updatedAt || b.createdAt || 0)
          - new Date(a.updatedAt || a.createdAt || 0);
      });
  }, [categoryId, search, sortKey, status, tickets]);

  const totalItems = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const savedContext = restoreContextRef.current;
    if (
      !savedContext?.pendingRestore ||
      loading ||
      filteredTickets.length === 0
    ) {
      return undefined;
    }

    const restoreTicketId = String(savedContext.ticketId || '');
    const restoredIndex = filteredTickets.findIndex((ticket) => (
      String(ticket.feedbackId || ticket.id) === restoreTicketId
    ));

    if (restoredIndex < 0) {
      writeTicketListReturnContext({
        ...savedContext,
        pendingRestore: false,
      });
      restoreContextRef.current = null;
      return undefined;
    }

    const restoredPage = Math.floor(restoredIndex / pageSize) + 1;
    if (safeCurrentPage !== restoredPage) {
      setCurrentPage(restoredPage);
      return undefined;
    }

    let cancelled = false;
    let retryCount = 0;
    let retryTimer = null;
    let highlightTimer = null;

    const consumeReturnContext = () => {
      try {
        window.sessionStorage.removeItem(TICKET_LIST_RETURN_STORAGE_KEY);
      } catch {
        // Storage can be unavailable in private mode.
      }
      restoreContextRef.current = null;
    };

    const restorePosition = () => {
      if (cancelled) return;

      const escapedTicketId = (
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(restoreTicketId)
          : restoreTicketId.replace(/["\\]/g, '\\$&')
      );
      const targetRow = document.querySelector(
        `[data-ticket-id="${escapedTicketId}"]`
      );
      const scrollContainer = document.querySelector(
        '[data-dashboard-scroll-container]'
      );

      if (!targetRow || !scrollContainer) {
        retryCount += 1;
        if (retryCount < 30) {
          retryTimer = window.setTimeout(restorePosition, 100);
          return;
        }

        scrollContainer?.scrollTo({
          top: Number(savedContext.scrollY) || 0,
          left: 0,
          behavior: 'auto',
        });
        consumeReturnContext();
        return;
      }

      window.requestAnimationFrame(() => {
        if (cancelled) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const rowRect = targetRow.getBoundingClientRect();
        const rowTopInContainer = (
          scrollContainer.scrollTop + rowRect.top - containerRect.top
        );
        const centeredTop = Math.max(
          0,
          rowTopInContainer - Math.max(
            24,
            (scrollContainer.clientHeight - targetRow.offsetHeight) / 2
          )
        );

        scrollContainer.scrollTo({
          top: centeredTop,
          left: 0,
          behavior: 'auto',
        });
        setHighlightedTicketId(restoreTicketId);
        highlightTimer = window.setTimeout(() => {
          setHighlightedTicketId('');
        }, 2500);
        consumeReturnContext();
      });
    };

    restorePosition();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (highlightTimer) window.clearTimeout(highlightTimer);
    };
  }, [
    filteredTickets,
    loading,
    pageSize,
    safeCurrentPage,
  ]);

  const currentListPath = `${location.pathname}${location.search}`;
  const handleOpenTicket = (ticketId) => {
    writeTicketListReturnContext({
      from: currentListPath,
      scrollY: document.querySelector('[data-dashboard-scroll-container]')?.scrollTop || 0,
      ticketId: String(ticketId),
      page: safeCurrentPage,
      pendingRestore: true,
    });
  };

  const handleSummaryFilter = (nextStatus) => {
    setStatus(nextStatus);
    setOpenMenu(null);
    setCurrentPage(1);

    window.requestAnimationFrame(() => {
      filtersSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCategoryId('');
    setSortKey('newest');
    setOpenMenu(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    search || status || categoryId || sortKey !== 'newest'
  );
  const selectedStatusLabel = STATUS_OPTIONS.find(
    (option) => String(option.value) === String(status)
  )?.label;

  return (
    <PublicPageMotion>
      <CitizenTicketThemeStyles />
      <main
        ref={pageRootRef}
        data-public-reveal
        className="citizen-ticket-page relative isolate space-y-5 text-[var(--public-title)]"
      >
        <div
          className="pointer-events-none absolute -inset-x-3 -inset-y-4 -z-10 overflow-hidden rounded-[36px] border border-[var(--public-border-soft)] bg-[linear-gradient(180deg,var(--public-surface-soft),transparent)] sm:-inset-x-5 sm:-inset-y-5"
          aria-hidden="true"
        />

        <section
          data-public-reveal
          className="citizen-ticket-hero relative overflow-hidden rounded-[30px] border"
          aria-labelledby="my-feedback-title"
        >
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 1400 300"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full text-blue-500 opacity-[0.12]"
              fill="none"
            >
              <path
                d="M-25 238C145 210 215 126 365 126C510 126 559 197 700 194C848 190 913 112 1052 112C1191 112 1272 166 1430 143"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M-15 278C184 251 250 200 403 204C544 208 626 264 760 256C898 248 959 193 1095 190C1231 186 1299 220 1420 236"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="10 12"
                strokeLinecap="round"
                opacity="0.75"
              />
              <circle cx="365" cy="126" r="7" fill="currentColor" opacity="0.7" />
              <circle cx="700" cy="194" r="8" fill="currentColor" opacity="0.55" />
              <circle cx="1052" cy="112" r="7" fill="currentColor" opacity="0.7" />
            </svg>
          </div>

          <div className="relative px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <header className="max-w-2xl">
                <h1
                  id="my-feedback-title"
                  className="text-3xl font-bold tracking-tight sm:text-4xl"
                >
                  Phản ánh của tôi
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--public-copy)] sm:text-base">
                  Theo dõi tiến trình, xem kết quả và quản lý những phản ánh bạn đã gửi.
                </p>
              </header>

              <nav
                className="flex flex-wrap items-center gap-2.5"
                aria-label="Thao tác phản ánh"
              >
                <Link
                  to="/tickets/create"
                  className="citizen-ticket-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition"
                >
                  <Lucide.Plus size={17} aria-hidden="true" />
                  Gửi phản ánh
                </Link>
                <Link
                  to="/tickets/archive"
                  className="citizen-ticket-secondary-button inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition"
                >
                  <Lucide.Archive size={16} aria-hidden="true" />
                  Kho lưu trữ
                </Link>
              </nav>
            </div>

            <nav
              className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5"
              aria-label="Lọc nhanh theo tình trạng phản ánh"
            >
              <SummaryButton
                label="Tổng phản ánh"
                helper="Xem toàn bộ"
                value={summary.total}
                icon={Lucide.Files}
                tone="blue"
                active={status === STATUS_FILTER_VALUES.ALL}
                onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.ALL)}
              />
              <SummaryButton
                label="Đang xử lý"
                helper="Theo dõi tiến độ"
                value={summary.inProgress}
                icon={Lucide.LoaderCircle}
                tone="amber"
                active={status === STATUS_FILTER_VALUES.PROCESSING}
                onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.PROCESSING)}
              />
              <SummaryButton
                label="Đang kiểm tra"
                helper="Kết quả đang duyệt"
                value={summary.checking}
                icon={Lucide.ClipboardCheck}
                tone="violet"
                active={status === STATUS_FILTER_VALUES.CHECKING}
                onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.CHECKING)}
              />
              <SummaryButton
                label="Chờ đánh giá"
                helper="Cần bạn phản hồi"
                value={summary.awaitingReview}
                icon={Lucide.Star}
                tone="green"
                active={status === STATUS_FILTER_VALUES.AWAITING_REVIEW}
                onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.AWAITING_REVIEW)}
              />
              <SummaryButton
                label="Đã kết thúc"
                helper="Hồ sơ hoàn tất"
                value={summary.ended}
                icon={Lucide.CircleCheckBig}
                tone="green"
                active={status === STATUS_FILTER_VALUES.ENDED}
                onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.ENDED)}
              />
            </nav>
          </div>
        </section>

        <section
          ref={filtersSectionRef}
          data-public-reveal
          className="citizen-ticket-panel scroll-mt-28 rounded-[26px] border p-4 sm:p-5"
          aria-labelledby="ticket-filters-title"
        >
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="citizen-ticket-filter-icon flex h-9 w-9 items-center justify-center rounded-xl border">
                <Lucide.SlidersHorizontal size={16} aria-hidden="true" />
              </span>
              <div>
                <h2 id="ticket-filters-title" className="text-sm font-semibold">
                  Tìm và lọc phản ánh
                </h2>
                <p className="mt-0.5 text-xs text-[var(--public-muted)]">
                  Thu hẹp danh sách theo tiêu đề, khu vực, danh mục hoặc trạng thái.
                </p>
              </div>
            </div>

            {refreshing ? (
              <span
                className="citizen-ticket-sync inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                role="status"
              >
                <span className="loading loading-spinner loading-xs" />
                Đang đồng bộ
              </span>
            ) : null}
          </header>

          <div className="mt-4 grid gap-2.5 md:grid-cols-[minmax(240px,1.55fr)_minmax(180px,0.8fr)_minmax(190px,0.85fr)_minmax(180px,0.75fr)]">
            <label className="relative block" htmlFor="ticket-search">
              <span className="sr-only">Tìm phản ánh</span>
              <Lucide.Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--public-muted)]"
                aria-hidden="true"
              />
              <input
                id="ticket-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="citizen-ticket-input h-11 w-full rounded-xl border pl-9 pr-9 text-sm outline-none transition"
                placeholder="Tìm theo tiêu đề hoặc khu vực"
                autoComplete="off"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--public-muted)] transition hover:bg-blue-500/10 hover:text-blue-600"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <Lucide.X size={14} aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <FilterDropdown
              menuId="category"
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
              icon={Lucide.Tags}
              label="Lọc theo danh mục"
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
            />

            <FilterDropdown
              menuId="status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={setStatus}
              icon={Lucide.ListFilter}
              label="Lọc theo trạng thái"
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
            />

            <FilterDropdown
              menuId="sort"
              value={sortKey}
              options={SORT_OPTIONS}
              onChange={setSortKey}
              icon={Lucide.ArrowUpDown}
              label="Sắp xếp danh sách"
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
            />
          </div>

          {hasActiveFilters ? (
            <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t citizen-ticket-divider pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {status ? (
                  <span className="citizen-ticket-active-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
                    <Lucide.Filter size={13} aria-hidden="true" />
                    {selectedStatusLabel || 'Trạng thái đã chọn'}
                    <button
                      type="button"
                      onClick={() => setStatus(STATUS_FILTER_VALUES.ALL)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-blue-500/10"
                      aria-label="Xóa bộ lọc trạng thái"
                    >
                      <Lucide.X size={12} aria-hidden="true" />
                    </button>
                  </span>
                ) : null}
                {search ? (
                  <span className="rounded-full border border-[var(--public-border)] bg-[var(--public-surface-soft)] px-3 py-1.5 text-xs text-[var(--public-copy)]">
                    Từ khóa: “{search.trim()}”
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="citizen-ticket-clear-button inline-flex items-center gap-2 text-xs font-semibold transition hover:underline"
              >
                <Lucide.RotateCcw size={13} aria-hidden="true" />
                Xóa bộ lọc
              </button>
            </footer>
          ) : null}
        </section>

        {error ? (
          <aside aria-live="assertive">
            <ErrorAlert
              title="Không thể tải dữ liệu"
              message={error}
              onClose={() => setError('')}
            />
          </aside>
        ) : null}

        <section
          data-public-reveal
          className="citizen-ticket-panel overflow-hidden rounded-[26px] border"
          aria-labelledby="ticket-list-title"
          aria-busy={loading}
        >
          <header className="citizen-ticket-divider flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
            <div>
              <h2 id="ticket-list-title" className="text-lg font-semibold">
                Danh sách phản ánh
              </h2>
              <p className="mt-1 text-xs text-[var(--public-muted)]">
                {totalItems} phản ánh phù hợp với bộ lọc hiện tại.
              </p>
            </div>

            <span className="hidden items-center gap-2 text-xs font-medium text-[var(--public-copy)] sm:inline-flex">
              <Lucide.MousePointerClick size={14} aria-hidden="true" />
              Chọn một phản ánh để xem chi tiết
            </span>
          </header>

          {loading ? (
            <TicketListSkeleton />
          ) : paginatedTickets.length === 0 ? (
            <section className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
              <span
                className="citizen-ticket-row-icon flex h-14 w-14 items-center justify-center rounded-2xl border"
                aria-hidden="true"
              >
                {hasActiveFilters ? (
                  <Lucide.SearchX size={24} />
                ) : (
                  <Lucide.FilePlus2 size={24} />
                )}
              </span>
              <h3 className="mt-4 text-base font-semibold">
                {hasActiveFilters
                  ? 'Không có phản ánh phù hợp'
                  : 'Bạn chưa gửi phản ánh nào'}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--public-copy)]">
                {hasActiveFilters
                  ? 'Hãy thay đổi từ khóa hoặc bộ lọc để mở rộng kết quả.'
                  : 'Khi phát hiện vấn đề đô thị, hãy gửi thông tin và hình ảnh để theo dõi tiến độ xử lý tại đây.'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="citizen-ticket-secondary-button mt-5 inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition"
                >
                  <Lucide.RotateCcw size={15} aria-hidden="true" />
                  Xóa bộ lọc
                </button>
              ) : (
                <Link
                  to="/tickets/create"
                  className="citizen-ticket-primary-button mt-5 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition"
                >
                  <Lucide.Plus size={16} aria-hidden="true" />
                  Gửi phản ánh đầu tiên
                </Link>
              )}
            </section>
          ) : (
            <ol className="citizen-ticket-list">
              {paginatedTickets.map((ticket) => {
                const feedbackId = ticket.feedbackId || ticket.id;
                const statusMeta = getCitizenStatusMeta(ticket.status);
                const StatusIcon = statusMeta.icon;
                const updatedAt = ticket.updatedAt || ticket.createdAt;
                const parentTicketId = ticket.parentTicketId || ticket.parentFeedbackId || null;
                const isConfirmedDuplicate = Boolean(parentTicketId);
                const isPotentialDuplicate = Boolean(
                  ticket.duplicateWarning && !isConfirmedDuplicate
                );

                return (
                  <li key={feedbackId}>
                    <Link
                      to={`/tickets/${feedbackId}`}
                      state={{
                        from: currentListPath,
                        returnLabel: 'Quay lại phản ánh của tôi',
                        ticketId: feedbackId,
                      }}
                      onClick={() => handleOpenTicket(feedbackId)}
                      data-ticket-id={feedbackId}
                      className={`citizen-ticket-row group grid gap-4 px-5 py-5 transition sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center ${
                        String(highlightedTicketId) === String(feedbackId)
                          ? 'is-returned'
                          : ''
                      }`}
                      aria-label={`Xem chi tiết phản ánh ${ticket.title || ''}`}
                    >
                      <article className="flex min-w-0 items-start gap-4">
                        <span
                          className="citizen-ticket-row-icon mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                          aria-hidden="true"
                        >
                          <Lucide.MapPinned size={18} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="citizen-ticket-row-title min-w-0 truncate text-base font-semibold leading-6 transition-colors">
                              {ticket.title || 'Phản ánh chưa có tiêu đề'}
                            </h3>
                            <span className="rounded-full border border-[var(--public-border)] bg-[var(--public-surface-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--public-copy)]">
                              {getCategoryLabel(ticket.categoryName)}
                            </span>
                            {isConfirmedDuplicate ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-violet-300/70 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300"
                                title="Phản ánh này đã được đánh dấu trùng và xử lý theo phản ánh đã có."
                              >
                                <Lucide.GitMerge size={12} aria-hidden="true" />
                                Phản ánh trùng
                              </span>
                            ) : isPotentialDuplicate ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
                                title="Hệ thống đang kiểm tra khả năng phản ánh này trùng với một phản ánh khác."
                              >
                                <Lucide.ScanSearch size={12} aria-hidden="true" />
                                Nghi trùng
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--public-muted)]">
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <Lucide.MapPin size={13} className="shrink-0" aria-hidden="true" />
                              <span className="max-w-md truncate">
                                {ticket.areaName || 'Chưa xác định khu vực'}
                              </span>
                            </span>

                            <time
                              className="inline-flex items-center gap-1.5"
                              dateTime={ticket.createdAt || undefined}
                            >
                              <Lucide.CalendarDays size={13} aria-hidden="true" />
                              Gửi {formatDate(ticket.createdAt)}
                            </time>
                          </div>
                        </div>
                      </article>

                      <aside
                        className="flex items-center justify-between gap-3 pl-[60px] lg:min-w-[290px] lg:justify-end lg:pl-0"
                        aria-label="Trạng thái phản ánh"
                      >
                        <div className="text-right">
                          <span
                            className={`citizen-status citizen-status-${statusMeta.tone} inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold`}
                          >
                            <StatusIcon size={13} aria-hidden="true" />
                            {statusMeta.label}
                          </span>
                          <time
                            className="mt-1.5 block text-[11px] text-[var(--public-muted)]"
                            dateTime={updatedAt || undefined}
                          >
                            Cập nhật {formatDate(updatedAt)}
                          </time>
                        </div>

                        <span className="citizen-ticket-row-arrow flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] text-[var(--public-muted)] transition">
                          <Lucide.ArrowRight size={16} aria-hidden="true" />
                        </span>
                      </aside>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}

          {totalItems > 0 ? (
            <footer className="citizen-ticket-divider flex flex-col gap-3 border-t px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-[var(--public-muted)]">
                Hiển thị{' '}
                <strong className="text-[var(--public-title)]">
                  {startIndex + 1}–{endIndex}
                </strong>{' '}
                trong tổng số{' '}
                <strong className="text-[var(--public-title)]">
                  {totalItems}
                </strong>{' '}
                phản ánh
              </p>

              <nav
                className="flex items-center gap-2"
                aria-label="Phân trang danh sách phản ánh"
              >
                <button
                  type="button"
                  className="citizen-ticket-secondary-button inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  <Lucide.ChevronLeft size={15} aria-hidden="true" />
                  Trước
                </button>

                <span className="citizen-ticket-control inline-flex h-9 min-w-16 items-center justify-center rounded-xl border px-3 text-xs font-medium text-[var(--public-copy)]">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  className="citizen-ticket-secondary-button inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Sau
                  <Lucide.ChevronRight size={15} aria-hidden="true" />
                </button>
              </nav>
            </footer>
          ) : null}
        </section>
      </main>
    </PublicPageMotion>
  );
};
