// src/pages/tickets/TicketListPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { ticketApi } from '../../services/api/ticketApi';
import { toolsApi } from '@urbanmind/shared-api';
import { getStatusLabel, managementTypes } from '@urbanmind/shared-types';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';

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

export const TicketListPage = () => {
  const pageRootRef = useRef(null);
  const filtersSectionRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await ticketApi.getTickets(
        { pageNumber: 1, pageSize: 100 },
        { role: 'service-user' }
      );
      setTickets(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Không thể tải danh sách phản ánh', err);
      setTickets([]);
      setError(err?.message || 'Không thể tải danh sách phản ánh.');
    } finally {
      setLoading(false);
    }
  }, []);

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
        if (active) setCategories(Array.isArray(response) ? response : []);
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <section>
          <h1 className="text-3xl font-bold tracking-tight text-base-content">
            Phản ánh của tôi
          </h1>
          <p className="mt-2 text-sm leading-6 text-base-content/55">
            Theo dõi tiến trình, xem kết quả và cập nhật những phản ánh bạn đã gửi.
          </p>
        </section>
      </header>

      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        aria-label="Lọc nhanh theo tình trạng phản ánh"
      >
        <button
          type="button"
          onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.ALL)}
          aria-pressed={status === STATUS_FILTER_VALUES.ALL}
          className={`group flex items-center gap-4 rounded-[22px] border px-4 py-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            status === STATUS_FILTER_VALUES.ALL
              ? 'border-primary/45 bg-primary/5 ring-2 ring-primary/10'
              : 'border-base-300 bg-base-100 hover:-translate-y-0.5 hover:border-primary/30'
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info" aria-hidden="true">
            <Lucide.Files size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-base-content/50">Tổng phản ánh</span>
            <strong className="mt-1 block text-2xl font-bold text-base-content">
              {summary.total}
            </strong>
          </span>
          <Lucide.ChevronDown
            size={16}
            className="shrink-0 text-base-content/25 transition-transform group-hover:translate-y-0.5 group-hover:text-primary"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.PROCESSING)}
          aria-pressed={status === STATUS_FILTER_VALUES.PROCESSING}
          className={`group flex items-center gap-4 rounded-[22px] border px-4 py-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            status === STATUS_FILTER_VALUES.PROCESSING
              ? 'border-warning/45 bg-warning/5 ring-2 ring-warning/10'
              : 'border-base-300 bg-base-100 hover:-translate-y-0.5 hover:border-warning/35'
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning" aria-hidden="true">
            <Lucide.LoaderCircle size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-base-content/50">Đang xử lý</span>
            <strong className="mt-1 block text-2xl font-bold text-base-content">
              {summary.inProgress}
            </strong>
          </span>
          <Lucide.ChevronDown
            size={16}
            className="shrink-0 text-base-content/25 transition-transform group-hover:translate-y-0.5 group-hover:text-warning"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.CHECKING)}
          aria-pressed={status === STATUS_FILTER_VALUES.CHECKING}
          className={`group flex items-center gap-4 rounded-[22px] border px-4 py-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            status === STATUS_FILTER_VALUES.CHECKING
              ? 'border-secondary/45 bg-secondary/5 ring-2 ring-secondary/10'
              : 'border-base-300 bg-base-100 hover:-translate-y-0.5 hover:border-secondary/35'
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary" aria-hidden="true">
            <Lucide.ClipboardCheck size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-base-content/50">Đang kiểm tra kết quả</span>
            <strong className="mt-1 block text-2xl font-bold text-base-content">
              {summary.checking}
            </strong>
          </span>
          <Lucide.ChevronDown
            size={16}
            className="shrink-0 text-base-content/25 transition-transform group-hover:translate-y-0.5 group-hover:text-secondary"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.AWAITING_REVIEW)}
          aria-pressed={status === STATUS_FILTER_VALUES.AWAITING_REVIEW}
          className={`group flex items-center gap-4 rounded-[22px] border px-4 py-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            status === STATUS_FILTER_VALUES.AWAITING_REVIEW
              ? 'border-success/45 bg-success/5 ring-2 ring-success/10'
              : 'border-base-300 bg-base-100 hover:-translate-y-0.5 hover:border-success/35'
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success" aria-hidden="true">
            <Lucide.Star size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-base-content/50">Chờ bạn đánh giá</span>
            <strong className="mt-1 block text-2xl font-bold text-base-content">
              {summary.awaitingReview}
            </strong>
          </span>
          <Lucide.ChevronDown
            size={16}
            className="shrink-0 text-base-content/25 transition-transform group-hover:translate-y-0.5 group-hover:text-success"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => handleSummaryFilter(STATUS_FILTER_VALUES.ENDED)}
          aria-pressed={status === STATUS_FILTER_VALUES.ENDED}
          className={`group flex items-center gap-4 rounded-[22px] border px-4 py-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            status === STATUS_FILTER_VALUES.ENDED
              ? 'border-success/45 bg-success/5 ring-2 ring-success/10'
              : 'border-base-300 bg-base-100 hover:-translate-y-0.5 hover:border-success/35'
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success" aria-hidden="true">
            <Lucide.CircleCheckBig size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-base-content/50">
              Đã kết thúc
            </span>
            <strong className="mt-1 block text-2xl font-bold text-base-content">
              {summary.ended}
            </strong>
          </span>
          <Lucide.ChevronDown
            size={16}
            className="shrink-0 text-base-content/25 transition-transform group-hover:translate-y-0.5 group-hover:text-success"
            aria-hidden="true"
          />
        </button>
      </section>

      <section
        ref={filtersSectionRef}
        className="scroll-mt-24 rounded-[26px] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6"
        aria-labelledby="ticket-filters-title"
      >
        <header>
          <h2 id="ticket-filters-title" className="text-base font-semibold">
            Tìm và lọc phản ánh
          </h2>
          <p className="mt-1 text-xs text-base-content/50">
            Lọc theo danh mục, trạng thái hoặc sắp xếp danh sách.
          </p>
        </header>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(240px,1.55fr)_minmax(180px,0.8fr)_minmax(190px,0.85fr)_minmax(180px,0.75fr)]">
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

      <section className="rounded-[26px] border border-base-300 bg-base-100 shadow-sm" aria-labelledby="ticket-list-title" aria-busy={loading}>
        <header className="flex items-center justify-between gap-4 border-b border-base-300 px-5 py-4 sm:px-6">
          <div>
            <h2 id="ticket-list-title" className="text-lg font-semibold">
              Danh sách phản ánh
            </h2>
            <p className="mt-1 text-xs text-base-content/50">
              {totalItems} phản ánh phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
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

        {!loading && totalItems > 0 ? (
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
