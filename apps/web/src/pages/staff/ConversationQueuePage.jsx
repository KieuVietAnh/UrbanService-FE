import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import Badge from '../../components/design-system/Badge';
import { getBadgeIntent } from '../../components/design-system/badgeSemantics';
import * as Lucide from 'lucide-react';
import { ManagerMetricCard, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';


const getStatusLabel = (status) => {
  const key = String(status || '').trim().toLowerCase().replace(/[ _-]/g, '');
  const labels = {
    submitted: 'Đã gửi',
    aireviewed: 'Đã phân loại AI',
    verified: 'Đã xác minh',
    assigned: 'Đã phân công',
    inprogress: 'Đang xử lý',
    waitingcitizen: 'Chờ người dân',
    submittedforapproval: 'Chờ duyệt kết quả',
    needrework: 'Cần làm lại',
    resolved: 'Đã xử lý',
    approved: 'Đã duyệt',
    closed: 'Đã đóng',
    rejected: 'Đã từ chối',
    duplicate: 'Trùng lặp',
  };

  return labels[key] || status || '—';
};

const formatActivityDate = (value) => {
  if (!value) return { time: '—', date: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: '—', date: '' };

  return {
    time: new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date),
    date: new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
  };
};

const STAFF_CONVERSATION_RETURN_KEY = 'staff-conversation-return';

const readConversationReturnSnapshot = () => {
  try {
    const raw = sessionStorage.getItem(STAFF_CONVERSATION_RETURN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const formatFeedbackId = (value) => {
  const id = String(value || '');
  if (id.length <= 18) return id || '—';
  return `${id.slice(0, 8)}…${id.slice(-5)}`;
};

export default function ConversationQueuePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [initialReturnSnapshot] = useState(() => readConversationReturnSnapshot());
  const rowRefs = useRef(new Map());
  const restoreHandledRef = useRef(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(() => Number(initialReturnSnapshot?.page) || 1);
  const [systemTotal, setSystemTotal] = useState(0);
  const [conversationFilter, setConversationFilter] = useState('all');
  const pageSize = 10;

  const getStatusClass = (s) => {
    if (!s) return 'border-slate-200 bg-slate-50 text-slate-700';
    const key = String(s).trim().toLowerCase();
    switch (key) {
      case 'aireviewed':
      case 'ai reviewed':
      case 'ai_reviewed':
        return 'border-violet-200 bg-violet-50 text-violet-700';
      case 'submitted':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'verified':
        return 'border-sky-200 bg-sky-50 text-sky-700';
      case 'assigned':
        return 'border-cyan-200 bg-cyan-50 text-cyan-700';
      case 'inprogress':
      case 'in progress':
        return 'border-purple-200 bg-purple-50 text-purple-700';
      case 'waitingcitizen':
      case 'waiting citizen':
      case 'submittedforapproval':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'needrework':
        return 'border-orange-200 bg-orange-50 text-orange-700';
      case 'resolved':
        return 'border-teal-200 bg-teal-50 text-teal-700';
      case 'approved':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'closed':
        return 'border-slate-200 bg-slate-50 text-slate-700';
      case 'rejected':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'duplicate':
        return 'border-slate-200 bg-slate-50 text-slate-700';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  };

  useEffect(() => {
    let active = true;

    const loadConversations = async () => {
      setLoading(true);
      setError('');

      try {
        const firstResponse = await managementFeedbackApi.getFeedbacks({
          pageNumber: 1,
          pageSize: 50,
        });

        const firstItems = Array.isArray(firstResponse?.items) ? firstResponse.items : [];
        const totalItems = Number(firstResponse?.totalItems ?? firstResponse?.totalCount ?? firstItems.length) || 0;
        const totalPages = Math.max(
          1,
          Number(firstResponse?.totalPages) || Math.ceil(totalItems / 50)
        );

        const remainingResponses = totalPages > 1
          ? await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, index) => (
                managementFeedbackApi.getFeedbacks({
                  pageNumber: index + 2,
                  pageSize: 50,
                })
              ))
            )
          : [];

        if (!active) return;

        const feedbacks = [
          ...firstItems,
          ...remainingResponses.flatMap((response) => (
            Array.isArray(response?.items) ? response.items : []
          )),
        ];

        const initialItems = feedbacks.map((item) => ({
          feedbackId: item?.feedbackId || item?.id,
          title: item?.title || 'Không có tiêu đề',
          citizenName: item?.userName || item?.reporterName || 'Không rõ',
          messageCount: Number(
            item?.interactionMessageCount
            ?? item?.messageCount
            ?? item?.commentCount
            ?? 0
          ),
          lastActivity: item?.updatedAt || item?.createdAt || null,
          status: item?.status || '',
        }));

        setSystemTotal(totalItems || initialItems.length);
        setItems(initialItems);

        const resolvedCounts = await Promise.allSettled(
          initialItems.map(async (item) => {
            if (Number(item.messageCount) > 0) return item.messageCount;

            try {
              const messages = await managementFeedbackApi.getFeedbackMessages(
                item.feedbackId,
                { includeInternal: true }
              );
              return Array.isArray(messages) ? messages.length : 0;
            } catch {
              return item.messageCount ?? 0;
            }
          })
        );

        if (!active) return;

        setItems(initialItems.map((item, index) => ({
          ...item,
          messageCount: Number(
            resolvedCounts[index]?.status === 'fulfilled'
              ? resolvedCounts[index].value
              : item.messageCount
          ),
        })));
      } catch (err) {
        if (!active) return;
        console.error('Failed to load conversation queue', err);
        setError('Không thể tải danh sách trao đổi. Vui lòng thử lại.');
        setItems([]);
        setSystemTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadConversations();

    return () => {
      active = false;
    };
  }, []);


  const summary = useMemo(() => ({
    total: systemTotal || items.length,
    withMessages: items.filter((item) => Number(item.messageCount) > 0).length,
  }), [items, systemTotal]);

  const filteredItems = useMemo(
    () => (
      conversationFilter === 'with-messages'
        ? items.filter((item) => Number(item.messageCount) > 0)
        : items
    ),
    [conversationFilter, items]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const openConversationFeedback = useCallback((item) => {
    const scrollContainer = document.querySelector('[data-dashboard-scroll-container]');
    const feedbackId = String(item?.feedbackId || '');

    sessionStorage.setItem(
      STAFF_CONVERSATION_RETURN_KEY,
      JSON.stringify({
        feedbackId,
        page: currentPage,
        scrollY: scrollContainer?.scrollTop || 0,
      })
    );

    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: {
        ...(location.state || {}),
        restoreConversationFeedbackId: feedbackId,
        preserveScrollOnEnter: true,
      },
    });

    navigate(`/staff/feedbacks/${feedbackId}`, {
      state: {
        fromStaffConversations: true,
        feedbackId,
        feedbackTitle: item?.title || '',
        focusExchange: true,
      },
    });
  }, [
    currentPage,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  const pageStart = (currentPage - 1) * pageSize;
  const paginatedItems = useMemo(
    () => filteredItems.slice(pageStart, pageStart + pageSize),
    [filteredItems, pageStart]
  );

  useEffect(() => {
    setPage(1);
  }, [conversationFilter]);

  useEffect(() => {
    if (loading || restoreHandledRef.current) return undefined;

    const targetFeedbackId = String(
      location.state?.restoreConversationFeedbackId
      || initialReturnSnapshot?.feedbackId
      || ''
    );

    if (!targetFeedbackId) {
      restoreHandledRef.current = true;
      return undefined;
    }

    const targetRow = rowRefs.current.get(targetFeedbackId);
    const scrollContainer = document.querySelector('[data-dashboard-scroll-container]');

    if (!targetRow || !scrollContainer) return undefined;

    restoreHandledRef.current = true;

    requestAnimationFrame(() => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const rowRect = targetRow.getBoundingClientRect();
      const rowTop = scrollContainer.scrollTop + rowRect.top - containerRect.top;
      const centeredTop = Math.max(
        0,
        rowTop - Math.max(24, (scrollContainer.clientHeight - targetRow.offsetHeight) / 2)
      );

      scrollContainer.scrollTo({
        top: centeredTop,
        left: 0,
        behavior: 'auto',
      });

      targetRow.classList.add('bg-blue-50');
      window.setTimeout(() => {
        targetRow.classList.remove('bg-blue-50');
      }, 2200);
    });

    sessionStorage.removeItem(STAFF_CONVERSATION_RETURN_KEY);
    return undefined;
  }, [initialReturnSnapshot, loading, location.state, paginatedItems]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.min(Math.max(currentPage - 2, 1), totalPages - 4);
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 text-slate-800">
      <ManagerPageHeader
        title="Quản lý trao đổi"
        description="Theo dõi các phản ánh có hoạt động trao đổi và mở nhanh hồ sơ để tiếp tục xử lý."
        icon={Lucide.MessagesSquare}
        statusLabel="HỒ SƠ ĐANG HIỂN THỊ"
        statusValue={`${summary.total} phản ánh`}
      />

      <section className="grid gap-4 md:grid-cols-2" aria-label="Tổng quan trao đổi">
        <button
          type="button"
          onClick={() => setConversationFilter('all')}
          aria-pressed={conversationFilter === 'all'}
          className={`rounded-[1.4rem] text-left transition-all duration-200 ${
            conversationFilter === 'all'
              ? 'ring-2 ring-blue-200 ring-offset-2 ring-offset-transparent'
              : 'hover:-translate-y-0.5'
          }`}
        >
          <ManagerMetricCard
            label="Tổng phản ánh"
            value={summary.total}
            description="Hiển thị toàn bộ phản ánh trong danh sách."
            icon={Lucide.Files}
            toneClass="bg-blue-50 text-blue-700"
          />
        </button>

        <button
          type="button"
          onClick={() => setConversationFilter((current) => (
            current === 'with-messages' ? 'all' : 'with-messages'
          ))}
          aria-pressed={conversationFilter === 'with-messages'}
          className={`rounded-[1.4rem] text-left transition-all duration-200 ${
            conversationFilter === 'with-messages'
              ? 'ring-2 ring-emerald-200 ring-offset-2 ring-offset-transparent'
              : 'hover:-translate-y-0.5'
          }`}
        >
          <ManagerMetricCard
            label="Có trao đổi"
            value={summary.withMessages}
            description="Chỉ hiển thị phản ánh đã phát sinh ít nhất một tin nhắn."
            icon={Lucide.MessageSquareText}
            toneClass="bg-emerald-50 text-emerald-700"
          />
        </button>
      </section>

      {filteredItems.length === 0 ? (
        <EmptyState
          title={conversationFilter === 'with-messages' ? 'Chưa có phản ánh có trao đổi' : 'Chưa có phản ánh nào'}
          description={conversationFilter === 'with-messages'
            ? 'Chưa có phản ánh nào phát sinh tin nhắn.'
            : 'Danh sách hiện chưa có dữ liệu phản ánh.'}
        />
      ) : (
        <section className="admin-panel overflow-hidden" aria-labelledby="conversation-list-title">
          <ManagerSectionHeader
            id="conversation-list-title"
            title="Danh sách phản ánh có trao đổi"
            description="Chọn một hồ sơ để mở không gian xử lý và xem toàn bộ nội dung trao đổi."
            icon={Lucide.Inbox}
          />

          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[20%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[17%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mã phản ánh</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Nội dung</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Người gửi</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tin nhắn</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hoạt động gần nhất</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Trạng thái</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedItems.map((item) => {
                  const activity = formatActivityDate(item.lastActivity);

                  return (
                    <tr
                      key={item.feedbackId}
                      ref={(node) => {
                        const key = String(item.feedbackId);
                        if (node) rowRefs.current.set(key, node);
                        else rowRefs.current.delete(key);
                      }}
                      className="group cursor-pointer transition-colors duration-500 hover:bg-blue-50/35"
                      onClick={() => openConversationFeedback(item)}
                    >
                      <td className="px-5 py-4 align-middle">
                        <span
                          className="block truncate whitespace-nowrap font-semibold text-blue-700"
                          title={item.feedbackId || undefined}
                        >
                          {formatFeedbackId(item.feedbackId)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="line-clamp-2 font-semibold leading-5 text-slate-900" title={item.title}>
                          {item.title}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="line-clamp-2 leading-5 text-slate-600" title={item.citizenName}>
                          {item.citizenName}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center align-middle">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-100">
                          {item.messageCount ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle text-slate-600">
                        <span className="block whitespace-nowrap font-medium text-slate-700">{activity.time}</span>
                        {activity.date ? <span className="mt-0.5 block whitespace-nowrap text-xs text-slate-500">{activity.date}</span> : null}
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <Badge intent={getBadgeIntent(item.status, 'status')} className={`${getStatusClass(item.status)} inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]`}>
                          <Lucide.MessageSquareText size={12} className="shrink-0" />
                          <span className="truncate">{getStatusLabel(item.status)}</span>
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline inline-flex min-h-0 whitespace-nowrap rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            openConversationFeedback(item);
                          }}
                        >
                          Mở hồ sơ
                          <Lucide.ArrowRight size={14} className="shrink-0" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Hiển thị <span className="font-semibold text-slate-700">{filteredItems.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + pageSize, filteredItems.length)}</span> trong tổng số{' '}
              <span className="font-semibold text-slate-700">{filteredItems.length}</span> phản ánh
            </p>

            <nav className="flex items-center gap-1.5" aria-label="Phân trang danh sách trao đổi">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                aria-label="Trang trước"
              >
                <Lucide.ChevronLeft size={16} />
              </button>

              {visiblePages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                    pageNumber === currentPage
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === currentPage ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
              >
                <Lucide.ChevronRight size={16} />
              </button>
            </nav>
          </div>
        </section>
      )}
    </div>
  );
}
