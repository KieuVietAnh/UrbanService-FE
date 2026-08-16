import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const formatFeedbackId = (value) => {
  const id = String(value || '');
  if (id.length <= 18) return id || '—';
  return `${id.slice(0, 8)}…${id.slice(-5)}`;
};

export default function ConversationQueuePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
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
        const response = await managementFeedbackApi.getFeedbacks({ pageIndex: 0, pageSize: 50 });
        const feedbacks = Array.isArray(response?.items) ? response.items : [];
        const initialItems = feedbacks.map((item) => ({
          feedbackId: item?.feedbackId || item?.id,
          title: item?.title || 'Không có tiêu đề',
          citizenName: item?.userName || item?.reporterName || 'Không rõ',
          messageCount: Number(item?.commentCount ?? item?.messageCount ?? item?.interactionMessageCount ?? 0),
          lastActivity: item?.updatedAt || item?.createdAt || null,
          status: item?.status || '',
        }));
        if (!active) return;

        setItems(initialItems);

        const resolvedCounts = await Promise.allSettled(initialItems.map(async (item) => {
          if (Number(item.messageCount) > 0) {
            return item.messageCount;
          }
          try {
            const messages = await managementFeedbackApi.getFeedbackMessages(item.feedbackId, { includeInternal: true });
            return Array.isArray(messages) ? messages.length : 0;
          } catch {
            return item.messageCount ?? 0;
          }
        }));

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
        setError('Không thể tải hàng đợi trao đổi. Vui lòng thử lại.');
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadConversations();
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => ({
    total: items.length,
    withMessages: items.filter((item) => Number(item.messageCount) > 0).length,
  }), [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedItems = useMemo(
    () => items.slice(pageStart, pageStart + pageSize),
    [items, pageStart]
  );

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
        <ManagerMetricCard
          label="Tổng phản ánh"
          value={summary.total}
          description="Số hồ sơ đang có trong hàng đợi trao đổi."
          icon={Lucide.Files}
          toneClass="bg-blue-50 text-blue-700"
        />
        <ManagerMetricCard
          label="Có trao đổi"
          value={summary.withMessages}
          description="Phản ánh đã phát sinh ít nhất một tin nhắn."
          icon={Lucide.MessageSquareText}
          toneClass="bg-emerald-50 text-emerald-700"
        />
      </section>

      {items.length === 0 ? (
        <EmptyState title="Chưa có trao đổi nào" description="Các phản ánh sẽ xuất hiện ở đây khi có hoạt động trao đổi." />
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
                      className="group cursor-pointer transition-colors hover:bg-blue-50/35"
                      onClick={() => navigate(`/staff/feedbacks/${item.feedbackId}`)}
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
                            navigate(`/staff/feedbacks/${item.feedbackId}`);
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
              Hiển thị <span className="font-semibold text-slate-700">{items.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + pageSize, items.length)}</span> trong tổng số{' '}
              <span className="font-semibold text-slate-700">{items.length}</span> phản ánh
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
