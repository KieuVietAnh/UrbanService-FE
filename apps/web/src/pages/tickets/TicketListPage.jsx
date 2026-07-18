// src/pages/tickets/TicketListPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { ticketApi } from '../../services/api/ticketApi';
import { toolsApi } from '@urbanmind/shared-api';
import { getStatusLabel, managementTypes } from '@urbanmind/shared-types';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';

const TICKET_LIST_SNAPSHOT_STORAGE_KEY =
  'urbanmind-service-user-ticket-list-snapshot';
const TICKET_CATEGORY_SNAPSHOT_STORAGE_KEY =
  'urbanmind-service-user-ticket-category-snapshot';

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
      className: 'border-info/25 bg-info/10 text-info',
    },
    [managementTypes.feedbackStatus.AI_REVIEWED]: {
      label: 'Đang phân loại',
      icon: Lucide.ScanSearch,
      className: 'border-secondary/25 bg-secondary/10 text-secondary',
    },
    [managementTypes.feedbackStatus.VERIFIED]: {
      label: 'Đã xác minh',
      icon: Lucide.BadgeCheck,
      className: 'border-info/25 bg-info/10 text-info',
    },
    [managementTypes.feedbackStatus.ASSIGNED]: {
      label: 'Đã chuyển xử lý',
      icon: Lucide.Send,
      className: 'border-info/25 bg-info/10 text-info',
    },
    [managementTypes.feedbackStatus.IN_PROGRESS]: {
      label: 'Đang xử lý',
      icon: Lucide.LoaderCircle,
      className: 'border-warning/25 bg-warning/10 text-warning',
    },
    [managementTypes.feedbackStatus.RESOLVED]: {
      label: 'Đang kiểm tra kết quả',
      icon: Lucide.ClipboardCheck,
      className: 'border-warning/25 bg-warning/10 text-warning',
    },
    [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: {
      label: 'Đang kiểm tra kết quả',
      icon: Lucide.ClipboardCheck,
      className: 'border-warning/25 bg-warning/10 text-warning',
    },
    [managementTypes.feedbackStatus.NEED_REWORK]: {
      label: 'Đang xử lý bổ sung',
      icon: Lucide.RotateCcw,
      className: 'border-warning/25 bg-warning/10 text-warning',
    },
    [managementTypes.feedbackStatus.APPROVED]: {
      label: 'Chờ bạn đánh giá',
      icon: Lucide.Star,
      className: 'border-success/25 bg-success/10 text-success',
    },
    [managementTypes.feedbackStatus.CLOSED]: {
      label: 'Đã kết thúc',
      icon: Lucide.CircleCheckBig,
      className: 'border-success/25 bg-success/10 text-success',
    },
    [managementTypes.feedbackStatus.REJECTED]: {
      label: 'Không tiếp nhận',
      icon: Lucide.CircleX,
      className: 'border-error/25 bg-error/10 text-error',
    },
    [managementTypes.feedbackStatus.CANCELLED]: {
      label: 'Đã hủy',
      icon: Lucide.Ban,
      className: 'border-base-300 bg-base-200 text-base-content/60',
    },
  };

  return statusMap[status] || {
    label: getStatusLabel(status, 'Đang cập nhật'),
    icon: Lucide.Clock3,
    className: 'border-base-300 bg-base-200 text-base-content/60',
  };
};

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
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3 text-sm font-medium text-base-content outline-none transition hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon
          size={15}
          className="shrink-0 text-base-content/35"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-left">
          {selectedOption?.label}
        </span>
        <Lucide.ChevronDown
          size={15}
          className={`shrink-0 text-base-content/35 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <menu
          className="absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-xl"
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
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <Lucide.Check size={15} className="shrink-0" aria-hidden="true" />
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

const TicketListSkeleton = () => (
  <ol className="divide-y divide-base-300" aria-hidden="true">
    {[0, 1, 2, 3].map((item) => (
      <li key={item}>
        <div className="grid animate-pulse gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-base-300/45" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-56 max-w-[70%] rounded bg-base-300/55" />
              <div className="mt-3 flex gap-4">
                <div className="h-3 w-28 rounded bg-base-300/30" />
                <div className="h-3 w-24 rounded bg-base-300/30" />
                <div className="h-3 w-28 rounded bg-base-300/30" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-[54px] lg:pl-0">
            <div className="h-7 w-28 rounded-full bg-base-300/35" />
            <div className="h-9 w-36 rounded-xl bg-base-300/40" />
          </div>
        </div>
      </li>
    ))}
  </ol>
);

export const TicketListPage = () => {
  const pageRootRef = useRef(null);
  const filtersSectionRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [currentPage, setCurrentPage] = useState(1);
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

    setSearchParams(nextSearchParams, { replace: true });
  }, [
    categoryId,
    search,
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

  return (
    <main ref={pageRootRef} className="space-y-5 text-base-content">
      <section
        className="relative overflow-hidden rounded-[30px] border border-info/15 bg-gradient-to-br from-base-100 via-info/[0.035] to-primary/[0.075] shadow-[0_18px_48px_rgba(15,23,42,0.085)]"
        aria-labelledby="my-feedback-title"
      >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1400 360"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full text-info opacity-[0.15]"
            fill="none"
          >
            <path
              d="M-30 270C121 236 195 142 337 142C486 142 522 222 671 220C823 218 884 123 1034 123C1175 123 1245 191 1435 154"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M-10 318C170 286 247 216 385 220C528 225 605 302 746 292C879 282 947 216 1076 211C1195 207 1272 246 1415 269"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeDasharray="10 12"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M988 -18C944 66 974 127 1038 162C1091 191 1178 190 1234 148C1285 109 1290 40 1350 -16"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.65"
            />
            <circle cx="337" cy="142" r="7" fill="currentColor" opacity="0.75" />
            <circle cx="671" cy="220" r="9" fill="currentColor" opacity="0.6" />
            <circle cx="1034" cy="123" r="8" fill="currentColor" opacity="0.75" />
            <circle cx="1234" cy="148" r="27" stroke="currentColor" opacity="0.35" />
          </svg>

          <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-info/[0.065] blur-3xl" />
          <div className="absolute -bottom-24 right-[7%] h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />

          <span className="absolute left-[46%] top-[16%] flex h-8 w-8 items-center justify-center rounded-full border border-info/12 bg-base-100/65 text-info/45 shadow-sm backdrop-blur">
            <Lucide.MapPin size={14} />
          </span>
          <span className="absolute right-[22%] top-[12%] flex h-8 w-8 items-center justify-center rounded-full border border-secondary/12 bg-base-100/65 text-secondary/45 shadow-sm backdrop-blur">
            <Lucide.Route size={14} />
          </span>
          <span className="absolute right-[8%] top-[31%] flex h-8 w-8 items-center justify-center rounded-full border border-success/12 bg-base-100/65 text-success/45 shadow-sm backdrop-blur">
            <Lucide.CircleCheck size={14} />
          </span>
        </div>

        <div className="relative px-5 py-6 sm:px-7 sm:py-7">
          <header className="max-w-3xl">
            <h1
              id="my-feedback-title"
              className="mt-4 text-3xl font-bold tracking-tight text-base-content sm:text-4xl"
            >
              Phản ánh của tôi
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-base-content/60">
              Theo dõi tiến trình, xem kết quả và cập nhật những phản ánh bạn đã gửi.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/8 px-3 py-1.5 text-xs font-semibold text-info">
                <Lucide.Activity size={13} aria-hidden="true" />
                Theo dõi toàn bộ tiến trình
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-base-300/85 bg-base-100/70 px-3 py-1.5 text-xs font-medium text-base-content/55 backdrop-blur">
                <Lucide.BellRing size={13} className="text-warning" aria-hidden="true" />
                Cập nhật khi trạng thái thay đổi
              </span>
            </div>
          </header>

          <dl
            className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
            aria-label="Lọc nhanh theo tình trạng phản ánh"
          >
            <button
              type="button"
              onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.ALL)}
              aria-pressed={status === STATUS_FILTER_VALUES.ALL}
              className={`group min-w-0 rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                status === STATUS_FILTER_VALUES.ALL
                  ? 'border-primary/40 bg-base-100/95 ring-2 ring-primary/10'
                  : 'border-base-300 bg-base-100/85 hover:border-primary/30'
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                Tổng phản ánh
                <Lucide.Files size={14} className="text-primary" aria-hidden="true" />
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-base-content">
                {summary.total}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-primary">
                Xem toàn bộ
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.PROCESSING)}
              aria-pressed={status === STATUS_FILTER_VALUES.PROCESSING}
              className={`group min-w-0 rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/25 ${
                status === STATUS_FILTER_VALUES.PROCESSING
                  ? 'border-warning/45 bg-warning/[0.08] ring-2 ring-warning/10'
                  : 'border-warning/20 bg-warning/5 hover:border-warning/35'
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                Đang xử lý
                <Lucide.LoaderCircle size={14} className="text-warning" aria-hidden="true" />
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-warning">
                {summary.inProgress}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-warning">
                Theo dõi tiến độ
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.CHECKING)}
              aria-pressed={status === STATUS_FILTER_VALUES.CHECKING}
              className={`group min-w-0 rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/25 ${
                status === STATUS_FILTER_VALUES.CHECKING
                  ? 'border-secondary/45 bg-secondary/[0.08] ring-2 ring-secondary/10'
                  : 'border-secondary/20 bg-secondary/5 hover:border-secondary/35'
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                Đang kiểm tra kết quả
                <Lucide.ClipboardCheck size={14} className="text-secondary" aria-hidden="true" />
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-secondary">
                {summary.checking}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-secondary">
                Xem kết quả đang duyệt
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.AWAITING_REVIEW)}
              aria-pressed={status === STATUS_FILTER_VALUES.AWAITING_REVIEW}
              className={`group min-w-0 rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/25 ${
                status === STATUS_FILTER_VALUES.AWAITING_REVIEW
                  ? 'border-success/45 bg-success/[0.08] ring-2 ring-success/10'
                  : 'border-success/20 bg-success/5 hover:border-success/35'
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                Chờ bạn đánh giá
                <Lucide.Star size={14} className="text-success" aria-hidden="true" />
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-success">
                {summary.awaitingReview}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-success">
                Xem và đánh giá
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.ENDED)}
              aria-pressed={status === STATUS_FILTER_VALUES.ENDED}
              className={`group min-w-0 rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/25 ${
                status === STATUS_FILTER_VALUES.ENDED
                  ? 'border-success/45 bg-success/[0.08] ring-2 ring-success/10'
                  : 'border-success/20 bg-success/5 hover:border-success/35'
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                Đã kết thúc
                <Lucide.CircleCheckBig size={14} className="text-success" aria-hidden="true" />
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-success">
                {summary.ended}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-success">
                Xem hồ sơ đã kết thúc
              </span>
            </button>
          </dl>
        </div>
      </section>

      <section
        ref={filtersSectionRef}
        className="scroll-mt-28 rounded-[24px] border border-base-300 bg-base-100 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] sm:p-5"
        aria-labelledby="ticket-filters-title"
      >
        <header>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <Lucide.SlidersHorizontal size={15} aria-hidden="true" />
            </span>
            <div>
              <h2 id="ticket-filters-title" className="text-sm font-semibold">
                Tìm và lọc phản ánh
              </h2>
              <p className="mt-0.5 text-xs text-base-content/45">
                Thu hẹp danh sách theo nhu cầu của bạn.
              </p>
            </div>
          </div>
        </header>

        <div className="mt-3 grid gap-2.5 md:grid-cols-[minmax(240px,1.55fr)_minmax(180px,0.8fr)_minmax(190px,0.85fr)_minmax(180px,0.75fr)]">
          <label className="relative block" htmlFor="ticket-search">
            <span className="sr-only">Tìm phản ánh</span>
            <Lucide.Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" aria-hidden="true" />
            <input
              id="ticket-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-base-300 bg-base-100 pl-9 pr-9 text-sm outline-none transition placeholder:text-base-content/35 focus:border-primary focus:ring-2 focus:ring-primary/15"
              placeholder="Tìm theo tiêu đề hoặc khu vực"
              autoComplete="off"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-base-content/35 hover:bg-base-200 hover:text-base-content"
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
          <footer className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {status ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
                <Lucide.Filter size={13} aria-hidden="true" />
                Đang lọc: {
                  STATUS_OPTIONS.find(
                    (option) => String(option.value) === String(status)
                  )?.label || 'Trạng thái đã chọn'
                }
                <button
                  type="button"
                  onClick={() => setStatus(STATUS_FILTER_VALUES.ALL)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-primary/10"
                  aria-label="Xóa bộ lọc trạng thái"
                >
                  <Lucide.X size={12} aria-hidden="true" />
                </button>
              </span>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              <Lucide.RotateCcw size={13} aria-hidden="true" />
              Xóa bộ lọc
            </button>
          </footer>
        ) : null}
      </section>

      {error ? (
        <aside aria-live="assertive">
          <ErrorAlert title="Không thể tải dữ liệu" message={error} onClose={() => setError('')} />
        </aside>
      ) : null}

      <section className="overflow-hidden rounded-[26px] border border-base-300 bg-base-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)]" aria-labelledby="ticket-list-title" aria-busy={loading}>
        <header className="flex items-center justify-between gap-4 border-b border-base-300 px-5 py-4 sm:px-6">
          <div>
            <h2 id="ticket-list-title" className="text-lg font-semibold">
              Danh sách phản ánh
            </h2>
            <p className="mt-1 text-xs text-base-content/50">
              {totalItems} phản ánh phù hợp với bộ lọc hiện tại.
            </p>
          </div>

          {refreshing ? (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/8 px-3 py-1.5 text-xs font-semibold text-info"
              role="status"
            >
              <span className="loading loading-spinner loading-xs" />
              Đang đồng bộ
            </span>
          ) : null}
        </header>

        {loading ? (
          <TicketListSkeleton />
        ) : paginatedTickets.length === 0 ? (
          <section className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-base-200 text-base-content/40" aria-hidden="true">
              <Lucide.SearchX size={24} />
            </span>
            <h3 className="mt-4 text-base font-semibold">Không có phản ánh phù hợp</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-base-content/50">
              Hãy thay đổi từ khóa hoặc bộ lọc để mở rộng kết quả.
            </p>
            {hasActiveFilters ? (
              <button type="button" onClick={clearFilters} className="btn admin-secondary-action mt-5 rounded-2xl">
                Xóa bộ lọc
              </button>
            ) : null}
          </section>
        ) : (
          <ol className="divide-y divide-base-300">
            {paginatedTickets.map((ticket) => {
              const feedbackId = ticket.feedbackId || ticket.id;
              const statusMeta = getCitizenStatusMeta(ticket.status);
              const StatusIcon = statusMeta.icon;
              const updatedAt = ticket.updatedAt || ticket.createdAt;

              return (
                <li key={feedbackId}>
                  <article className="grid gap-4 px-5 py-4 transition-colors hover:bg-base-200/35 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <section className="flex min-w-0 items-start gap-3.5">
                      <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${statusMeta.className}`} aria-hidden="true">
                        <StatusIcon size={17} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <Link to={`/tickets/${feedbackId}`} className="block truncate text-base font-semibold leading-6 text-base-content transition-colors hover:text-primary">
                          {ticket.title || 'Phản ánh chưa có tiêu đề'}
                        </Link>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-base-content/45">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Lucide.MapPin size={13} className="shrink-0" aria-hidden="true" />
                            <span className="max-w-md truncate">
                              {ticket.areaName || 'Chưa xác định khu vực'}
                            </span>
                          </span>

                          <time className="inline-flex items-center gap-1.5" dateTime={ticket.createdAt || undefined}>
                            <Lucide.CalendarDays size={13} aria-hidden="true" />
                            Gửi {formatDate(ticket.createdAt)}
                          </time>

                          <time className="inline-flex items-center gap-1.5" dateTime={updatedAt || undefined}>
                            <Lucide.Clock3 size={13} aria-hidden="true" />
                            Cập nhật {formatDate(updatedAt)}
                          </time>
                        </div>
                      </div>
                    </section>

                    <aside
                      className="grid w-full grid-cols-[minmax(0,1fr)_132px] items-center gap-3 pl-[54px] lg:w-[340px] lg:grid-cols-[184px_144px] lg:pl-0"
                      aria-label="Trạng thái và thao tác"
                    >
                      <span
                        className={`inline-flex w-fit items-center gap-1.5 justify-self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${statusMeta.className}`}
                      >
                        <StatusIcon size={13} aria-hidden="true" />
                        {statusMeta.label}
                      </span>

                      <Link
                        to={`/tickets/${feedbackId}`}
                        className="btn btn-sm admin-primary-action w-full justify-center rounded-xl"
                      >
                        Xem chi tiết
                        <Lucide.ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </aside>
                  </article>
                </li>
              );
            })}
          </ol>
        )}

        {totalItems > 0 ? (
          <footer className="flex flex-col gap-3 border-t border-base-300 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-base-content/45">
              Hiển thị <strong className="text-base-content">{startIndex + 1}–{endIndex}</strong> trong tổng số <strong className="text-base-content">{totalItems}</strong> phản ánh
            </p>

            <nav className="flex items-center gap-2" aria-label="Phân trang danh sách phản ánh">
              <button
                type="button"
                className="btn btn-sm admin-secondary-action rounded-xl"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <Lucide.ChevronLeft size={15} aria-hidden="true" />
                Trước
              </button>

              <span className="inline-flex h-8 min-w-16 items-center justify-center rounded-xl border border-base-300 bg-base-100 px-3 text-xs font-medium text-base-content/60">
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-sm admin-secondary-action rounded-xl"
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
  );
};
