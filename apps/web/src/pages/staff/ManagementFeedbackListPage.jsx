/* eslint-disable */
// src/pages/staff/ManagementFeedbackListPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import { PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES, managementTypes } from '@urbanmind/shared-types';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
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
        status: status || undefined,
        categoryId: categoryId || undefined,
      };

      const response = await managementFeedbackApi.getFeedbacks(params);
      setFeedbacks(Array.isArray(response?.items) ? response.items : []);
      setTotalCount(response?.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch feedbacks', err);
      setError('Unable to load feedbacks. Please try again.');
      setFeedbacks([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, status, categoryId]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, categoryId]);

  const summaryCounts = useMemo(() => {
    return feedbacks.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  }, [feedbacks]);

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

  const getStatusBadgeClass = (s) => STATUS_BADGE_CLASSES[s] || 'bg-slate-100 text-slate-700';
  const getPriorityBadgeClass = (p) => PRIORITY_BADGE_CLASSES[p] || 'bg-slate-100 text-slate-700';

  const getStatusLabel = (s) => {
    const labels = {
      [managementTypes.feedbackStatus.SUBMITTED]: 'Đã gửi',
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
    return labels[s] || s;
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

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
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
        <button
          onClick={fetchFeedbacks}
          className="btn btn-primary btn-sm rounded-lg"
        >
          <Lucide.RefreshCw size={16} />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-700">
              <Lucide.ListFilter size={14} />
              Quản lý phản ánh
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-900">Danh sách phản ánh đang vận hành</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Theo dõi phản ánh mới, kiểm tra trạng thái và điều hướng vào từng quy trình xử lý chi tiết.</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Tổng phản ánh</div>
            <div className="mt-1 text-xl font-black text-slate-900">{totalCount}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {workflowStageCards.map((card) => (
          <div key={card.status} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{card.title}</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{card.count}</div>
            <div className="mt-2 text-sm text-slate-500">{card.subtitle}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <label className="input input-bordered flex items-center gap-2 rounded-2xl border-slate-200 bg-slate-50">
              <Lucide.Search size={16} className="text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm phản ánh" className="grow bg-transparent text-sm" />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="select select-bordered rounded-2xl border-slate-200 bg-slate-50 text-sm">
              <option value="">Tất cả trạng thái</option>
              {Object.values(managementTypes.feedbackStatus).map((value) => (
                <option key={value} value={value}>{getStatusLabel(value)}</option>
              ))}
            </select>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="select select-bordered rounded-2xl border-slate-200 bg-slate-50 text-sm">
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id || category.categoryId} value={category.id || category.categoryId}>{category.name || category.categoryName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {feedbacks.length === 0 ? (
            <EmptyState title="Chưa có phản ánh" description="Không có dữ liệu phù hợp với bộ lọc hiện tại." />
          ) : (
            feedbacks.map((item) => (
              <button
                key={item.feedbackId || item.id}
                type="button"
                onClick={() => navigate(`/staff/feedbacks/${item.feedbackId || item.id}`)}
                className="flex w-full flex-col gap-4 rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-indigo-300 hover:bg-white"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getPriorityBadgeClass(item.priority)}`}>
                        {getPriorityLabel(item.priority)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">{item.title || 'Không có tiêu đề'}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description || 'Không có mô tả.'}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    <div className="font-semibold text-slate-700">{item.categoryName || item.category?.name || '—'}</div>
                    <div className="mt-1">{formatDate(item.createdAt)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                    <Lucide.User size={14} />
                    {item.assignment?.operatorName || item.operatorName || 'Chưa phân công'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                    <Lucide.MapPin size={14} />
                    {item.locationText || 'Không có vị trí'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div>
              Hiển thị {startIdx}–{endIdx} trên {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="btn btn-sm rounded-2xl">
                Trước
              </button>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{currentPage}/{totalPages}</span>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="btn btn-sm rounded-2xl">
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
