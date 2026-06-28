/* eslint-disable */
// src/pages/staff/ManagementFeedbackListPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import { PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';
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
      status: 'Submitted',
      title: 'Chờ xác minh',
      subtitle: 'Xác thực nội dung và ưu tiên phản ánh mới',
      count: summaryCounts.Submitted || 0,
    },
    {
      status: 'Verified',
      title: 'Sẵn sàng phân công',
      subtitle: 'Đã xác minh, cần chuyển sang đội xử lý',
      count: summaryCounts.Verified || 0,
    },
    {
      status: 'Assigned',
      title: 'Đang xử lý',
      subtitle: 'Đã giao cho đội thi công hoặc vận hành',
      count: (summaryCounts.Assigned || 0) + (summaryCounts.InProgress || 0),
    },
    {
      status: 'SubmittedForApproval',
      title: 'Chờ duyệt',
      subtitle: 'Hoàn thành xử lý, chờ xét duyệt kết quả',
      count: summaryCounts.SubmittedForApproval || 0,
    },
  ], [summaryCounts]);

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

  return <div className="p-4">Management feedback list placeholder</div>;
}
