 
// src/pages/staff/ManagementFeedbackListPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import { managementTypes } from '@urbanmind/shared-types';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import { getCategoryLabel } from '../../utils/categoryLabels';
import * as Lucide from 'lucide-react';

export default function ManagementFeedbackListPage() {
  const navigate = useNavigate();

  const [feedbacks, setFeedbacks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const normalizeStatusValue = useCallback((value) => {
    if (!value) return '';
    const normalized = String(value).trim();
    if (normalized === managementTypes.feedbackStatus.AI_REVIEWED) return managementTypes.feedbackStatus.AI_REVIEWED;
    if (normalized.toLowerCase() === 'aireviewed' || normalized.toLowerCase() === 'ai reviewed' || normalized.toLowerCase() === 'ai_reviewed') {
      return managementTypes.feedbackStatus.AI_REVIEWED;
    }
    return normalized;
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await toolsApi.getCategories();
        setCategories(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCategories();
  }, []);

  // Fetch feedbacks
  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        pageIndex: currentPage - 1,
        pageSize,
        search: search || undefined,
        status: normalizeStatusValue(status) || undefined,
        categoryId: categoryId || undefined,
      };

      const response = await managementFeedbackApi.getFeedbacks(params);
      const items = Array.isArray(response?.items) ? response.items : [];
      const filteredItems = items.filter((item) => {
        const normalizedStatus = normalizeStatusValue(item.status);
        const normalizedSelectedStatus = normalizeStatusValue(status);
        const matchesSearch = !search || `${item.title || ''} ${item.description || ''} ${item.feedbackId || ''}`.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !normalizedSelectedStatus || normalizedStatus === normalizedSelectedStatus;
        const matchesCategory = !categoryId || String(item.categoryId ?? item.category?.categoryId ?? '') === String(categoryId);
        return matchesSearch && matchesStatus && matchesCategory;
      });

      setFeedbacks(filteredItems);
      setTotalCount(filteredItems.length || response?.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch feedbacks', err);
      setError('Không thể tải danh sách phản ánh. Vui lòng thử lại.');
      setFeedbacks([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, status, categoryId, normalizeStatusValue]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, categoryId]);

  const summaryCounts = useMemo(() => {
    return feedbacks.reduce((acc, item) => {
      const normalizedStatus = normalizeStatusValue(item.status);
      acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
      return acc;
    }, {});
  }, [feedbacks, normalizeStatusValue]);

  const workflowStageCards = useMemo(() => [
    {
      status: managementTypes.feedbackStatus.SUBMITTED,
      title: 'Chờ xác minh',
      subtitle: 'Xác thực nội dung và ưu tiên phản ánh mới',
      count: (summaryCounts[managementTypes.feedbackStatus.SUBMITTED] || 0) + (summaryCounts[managementTypes.feedbackStatus.AI_REVIEWED] || 0),
    },
    {
      status: managementTypes.feedbackStatus.AI_REVIEWED,
      title: 'Chờ AI phân loại',
      subtitle: 'Đã được AI tiền xử lý, chờ nhân viên xác minh',
      count: summaryCounts[managementTypes.feedbackStatus.AI_REVIEWED] || 0,
    },
    {
      status: managementTypes.feedbackStatus.VERIFIED,
      title: 'Sẵn sàng phân công',
      subtitle: 'Đã xác minh, cần chuyển sang đội xử lý',
      count: summaryCounts[managementTypes.feedbackStatus.VERIFIED] || 0,
    },
    {
      status: managementTypes.feedbackStatus.ASSIGNED,
      title: 'Đang xử lý',
      subtitle: 'Đã giao cho đội thi công hoặc vận hành',
      count: (summaryCounts[managementTypes.feedbackStatus.ASSIGNED] || 0) + (summaryCounts[managementTypes.feedbackStatus.IN_PROGRESS] || 0),
    },
    {
      status: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
      title: 'Chờ duyệt',
      subtitle: 'Hoàn thành xử lý, chờ xét duyệt kết quả',
      count: summaryCounts[managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL] || 0,
    },
  ], [summaryCounts]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);

  const getStatusClass = (s) => {
    if (!s) return 'border-slate-200 bg-slate-50 text-slate-700';
    const key = String(s).trim().toLowerCase();
    switch (key) {
      case managementTypes.feedbackStatus.AI_REVIEWED.toLowerCase():
      case 'aireviewed':
      case 'ai reviewed':
      case 'ai_reviewed':
        return 'border-violet-200 bg-violet-50 text-violet-700';
      case 'submitted':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case managementTypes.feedbackStatus.VERIFIED.toLowerCase():
      case 'verified':
        return 'border-sky-200 bg-sky-50 text-sky-700';
      case managementTypes.feedbackStatus.ASSIGNED.toLowerCase():
      case 'assigned':
        return 'border-cyan-200 bg-cyan-50 text-cyan-700';
      case 'inprogress':
      case 'in progress':
      case managementTypes.feedbackStatus.IN_PROGRESS.toLowerCase():
        return 'border-purple-200 bg-purple-50 text-purple-700';
      case 'waitingcitizen':
      case 'waiting citizen':
      case managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL.toLowerCase():
      case 'submittedforapproval':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case managementTypes.feedbackStatus.NEED_REWORK.toLowerCase():
      case 'needrework':
        return 'border-orange-200 bg-orange-50 text-orange-700';
      case managementTypes.feedbackStatus.APPROVED.toLowerCase():
      case 'approved':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'resolved':
        return 'border-teal-200 bg-teal-50 text-teal-700';
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

  const getPriorityClass = (p) => {
    if (!p) return 'badge-priority-low';
    const key = String(p).trim().toLowerCase();
    switch (key) {
      case 'critical': return 'badge-priority-critical';
      case 'high': return 'badge-priority-high';
      case 'medium': return 'badge-priority-medium';
      case 'low': return 'badge-priority-low';
      default: return 'badge-priority-low';
    }
  };

  const getStatusLabel = (s) => {
    const normalizedStatus = normalizeStatusValue(s);
    const labels = {
      [managementTypes.feedbackStatus.SUBMITTED]: 'Đã gửi',
      [managementTypes.feedbackStatus.AI_REVIEWED]: 'AI đã xem xét',
      [managementTypes.feedbackStatus.VERIFIED]: 'Đã xác minh',
      [managementTypes.feedbackStatus.ASSIGNED]: 'Đã giao',
      [managementTypes.feedbackStatus.IN_PROGRESS]: 'Đang xử lý',
      [managementTypes.feedbackStatus.RESOLVED]: 'Hoàn thành',
      [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 'Chờ duyệt',
      [managementTypes.feedbackStatus.APPROVED]: 'Đã duyệt',
      [managementTypes.feedbackStatus.REJECTED]: 'Bị từ chối',
      [managementTypes.feedbackStatus.NEED_REWORK]: 'Cần sửa lại',
      [managementTypes.feedbackStatus.CLOSED]: 'Đã đóng',
      [managementTypes.feedbackStatus.CANCELLED]: 'Đã hủy',
    };
    return labels[normalizedStatus] || normalizedStatus;
  };

  const getPriorityLabel = (p) => {
    const labels = {
      'Low': 'Thấp',
      'Medium': 'Trung bình',
      'High': 'Cao',
      'Critical': 'Khẩn cấp',
    };
    return labels[p] || p;
  };

  const formatDateTime = (date) => {
    if (!date) return 'Chưa có ngày';
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAssignedUnitName = (item) => {
    const assignedName = item?.assignment?.operatorName
      || item?.assignment?.providerName
      || item?.assignment?.coordinatorName
      || item?.assignment?.assignedTo
      || item?.assignment?.assignedToName
      || item?.assignment?.assignee
      || item?.assignment?.assigneeName
      || item?.operatorName
      || item?.assignedOperatorName
      || item?.providerName
      || item?.coordinatorName
      || item?.assigneeName
      || item?.assignedToName
      || item?.assignedTo
      || '';

    if (assignedName) return assignedName;

    const assignedStatuses = new Set([
      managementTypes.feedbackStatus.ASSIGNED,
      managementTypes.feedbackStatus.IN_PROGRESS,
      managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
      managementTypes.feedbackStatus.APPROVED,
      managementTypes.feedbackStatus.RESOLVED,
      managementTypes.feedbackStatus.CLOSED,
    ]);

    return assignedStatuses.has(normalizeStatusValue(item?.status))
      ? 'Đã phân công'
      : 'Chưa phân công';
  };

  const openProviderReport = async (feedbackId) => {
    try {
      const reports = await managementFeedbackApi.getProviderReports(feedbackId);
      const report = Array.isArray(reports) ? reports[0] : (reports && typeof reports === 'object' ? reports : null);
      const providerReportId = report?.providerReportId || report?.id || report?.providerReport?.providerReportId || report?.providerReportId;
      if (providerReportId) {
        navigate(`/staff/provider-reports/${providerReportId}`, { state: { feedbackId, providerReport: report } });
      } else {
        setError('Không tìm thấy báo cáo xử lý cho phản ánh này.');
      }
    } catch (err) {
      console.error('Failed to open provider report', err);
      setError('Không thể mở báo cáo xử lý. Vui lòng thử lại.');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setCategoryId('');
    setCurrentPage(1);
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorAlert 
          title="Lỗi tải danh sách"
          message={error || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.'}
        />
        <Button
          type="button"
          onClick={fetchFeedbacks}
          variant="primary"
          size="sm"
          className="rounded-lg"
        >
          <Lucide.RefreshCw size={16} />
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="admin-page-shell space-y-6 p-4">
      <div className="admin-page-hero p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge intent="info" className="gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
              <Lucide.ListFilter size={14} />
              Quản lý phản ánh
            </Badge>
            <h1 className="admin-hero-title mt-3">Danh sách phản ánh đang vận hành</h1>
            <p className="admin-hero-description mt-2 max-w-2xl">Theo dõi phản ánh mới, kiểm tra trạng thái và điều hướng vào từng quy trình xử lý chi tiết.</p>
          </div>
          <div className="admin-inset-panel px-4 py-3 text-sm text-slate-600">
            <div className="admin-section-description uppercase tracking-[0.24em]">Tổng phản ánh</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{totalCount}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {workflowStageCards.map((card) => (
          <div key={card.status} className="admin-stat-card p-4">
            <div className="admin-section-description uppercase tracking-[0.24em]">{card.title}</div>
            <div className="mt-2 heading-2 text-slate-900">{card.count}</div>
            <div className="mt-2 body-text">{card.subtitle}</div>
          </div>
        ))}
      </div>

      <div className="admin-panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <label className="input input-bordered flex items-center gap-2 rounded-[1rem] border-slate-200/80 bg-[rgba(248,250,252,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <Lucide.Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm phản ánh"
                className="grow bg-transparent text-sm"
              />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="select select-bordered rounded-[1rem] border-slate-200/80 bg-[rgba(248,250,252,0.88)] text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <option value="">Tất cả trạng thái</option>
              {Object.values(managementTypes.feedbackStatus).map((value) => (
                <option key={value} value={value}>{getStatusLabel(value)}</option>
              ))}
            </select>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="select select-bordered rounded-[1rem] border-slate-200/80 bg-[rgba(248,250,252,0.88)] text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id || category.categoryId} value={category.id || category.categoryId}>{getCategoryLabel(category.name || category.categoryName || category.categoryType || category.type)}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={handleResetFilters}
            variant="primary"
            className="rounded-[1rem] px-4 py-2.5 text-sm font-semibold"
          >
            <Lucide.RefreshCw size={16} />
            Làm mới bộ lọc
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {feedbacks.length === 0 ? (
            <EmptyState title="Chưa có phản ánh" description="Không có dữ liệu phù hợp với bộ lọc hiện tại." />
          ) : (
            feedbacks.map((item) => {
              const feedbackId = item.feedbackId || item.id;
              const parentFeedbackId = item.parentTicketId || item.parentFeedbackId || null;
              const isConfirmedDuplicate = Boolean(parentFeedbackId);
              const handleCardKeyDown = (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/staff/feedbacks/${feedbackId}`);
                }
              };

              return (
                <div
                  key={feedbackId}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)}
                  onKeyDown={handleCardKeyDown}
                  className="admin-panel overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.65fr_300px] lg:items-start">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {isConfirmedDuplicate ? (
                          <Badge intent="neutral" className="gap-1 rounded-full px-3 py-1 text-[11px] font-semibold">
                            <Lucide.GitMerge size={13} aria-hidden="true" />
                            Phản ánh trùng
                          </Badge>
                        ) : null}
                        <span className={`${getStatusClass(item.status)} inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold`}>{getStatusLabel(item.status)}</span>
                        <span className={`${getPriorityClass(item.priority)} inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold`}>{getPriorityLabel(item.priority)}</span>
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{item.title || 'Không có tiêu đề'}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description || 'Không có mô tả.'}</p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className={`${getStatusClass(item.status)} inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold`}>
                          <Lucide.Tag size={14} />
                          {getCategoryLabel(item.categoryName || item.category?.name || item.categoryType || item.type, 'Không rõ danh mục')}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                          <Lucide.CalendarDays size={14} />
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch justify-between gap-4">
                      <div className="grid gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-900 shadow-sm">
                          <Lucide.User size={14} />
                          {getAssignedUnitName(item)}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 shadow-sm">
                          <Lucide.MapPin size={14} />
                          {item.locationText || 'Không có vị trí'}
                        </span>
                      </div>
                      { !isConfirmedDuplicate && (item.status === managementTypes.feedbackStatus.ASSIGNED || item.status === managementTypes.feedbackStatus.IN_PROGRESS) && (
                        <Button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openProviderReport(item.feedbackId || item.id); }}
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap rounded-full"
                        >
                          Mở Báo Cáo Xử Lý
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="admin-inset-panel mt-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-slate-600">
            <div>
              Hiển thị {startIdx}–{endIdx} trên {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} variant="outline" size="sm" className="rounded-2xl">
                Trước
              </Button>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{currentPage}/{totalPages}</span>
              <Button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} variant="outline" size="sm" className="rounded-2xl">
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
