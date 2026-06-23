// src/pages/staff/ManagementFeedbackListPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import { PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

export const ManagementFeedbackListPage = () => {
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

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);

  const getStatusBadgeClass = (s) => STATUS_BADGE_CLASSES[s] || 'bg-slate-100 text-slate-700';
  const getPriorityBadgeClass = (p) => PRIORITY_BADGE_CLASSES[p] || 'bg-slate-100 text-slate-700';

  const getStatusLabel = (s) => {
    const labels = {
      'Submitted': 'Đã gửi',
      'Verified': 'Đã xác minh',
      'Assigned': 'Đã giao',
      'InProgress': 'Đang xử lý',
      'Resolved': 'Hoàn thành',
      'SubmittedForApproval': 'Chờ duyệt',
      'Approved': 'Đã duyệt',
      'Rejected': 'Bị từ chối',
      'NeedRework': 'Cần sửa lại',
      'Closed': 'Đã đóng',
      'Cancelled': 'Đã hủy',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý phản ánh</h1>
          <p className="text-xs text-slate-500 mt-1">Xem và quản lý tất cả phản ánh từ cộng đồng</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#0052CC]">{totalCount}</div>
          <p className="text-xs text-slate-500">Tổng phản ánh</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Tìm kiếm</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lucide.Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Tiêu đề, người dùng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input input-bordered w-full pl-9 text-xs h-10 rounded-lg border-slate-300 focus:border-[#0052CC]"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="select select-bordered w-full text-xs h-10 rounded-lg border-slate-300 focus:border-[#0052CC]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Submitted">Đã gửi</option>
              <option value="Verified">Đã xác minh</option>
              <option value="Assigned">Đã giao</option>
              <option value="InProgress">Đang xử lý</option>
              <option value="Resolved">Hoàn thành</option>
              <option value="SubmittedForApproval">Chờ duyệt</option>
              <option value="Approved">Đã duyệt</option>
              <option value="Rejected">Bị từ chối</option>
              <option value="NeedRework">Cần sửa lại</option>
              <option value="Closed">Đã đóng</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Danh mục</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="select select-bordered w-full text-xs h-10 rounded-lg border-slate-300 focus:border-[#0052CC]"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setStatus('');
                setCategoryId('');
              }}
              className="btn btn-ghost btn-sm w-full text-xs h-10 rounded-lg"
            >
              <Lucide.RotateCcw size={14} />
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {feedbacks.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="Không có phản ánh"
              message="Chưa có phản ánh nào để hiển thị"
              icon={<Lucide.Inbox size={32} className="text-slate-400" />}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="font-bold text-slate-700 px-4 py-3">Tiêu đề</th>
                    <th className="font-bold text-slate-700 px-4 py-3">Danh mục</th>
                    <th className="font-bold text-slate-700 px-4 py-3">Ưu tiên</th>
                    <th className="font-bold text-slate-700 px-4 py-3">Trạng thái</th>
                    <th className="font-bold text-slate-700 px-4 py-3">Người dùng</th>
                    <th className="font-bold text-slate-700 px-4 py-3">Ngày tạo</th>
                    <th className="font-bold text-slate-700 px-4 py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((feedback) => (
                    <tr key={feedback.feedbackId} className="border-b border-slate-200 hover:bg-blue-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                        {feedback.title}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {feedback.categoryName || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${getPriorityBadgeClass(feedback.priority)}`}>
                          {getPriorityLabel(feedback.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${getStatusBadgeClass(feedback.status)}`}>
                          {getStatusLabel(feedback.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {feedback.userName || feedback.reporterName || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(feedback.createdDate)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/staff/feedbacks/${feedback.feedbackId}`)}
                          className="btn btn-ghost btn-xs text-[#0052CC] hover:bg-blue-50"
                        >
                          <Lucide.Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Hiển thị <span className="font-bold">{startIdx}</span> đến <span className="font-bold">{endIdx}</span> trong <span className="font-bold">{totalCount}</span> kết quả
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-sm btn-ghost rounded-lg disabled:opacity-50"
                >
                  <Lucide.ChevronLeft size={16} />
                </button>
                <div className="text-xs font-bold text-slate-700 min-w-[100px] text-center">
                  Trang {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-sm btn-ghost rounded-lg disabled:opacity-50"
                >
                  <Lucide.ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
