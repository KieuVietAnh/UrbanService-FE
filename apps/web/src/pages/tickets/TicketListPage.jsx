// src/pages/tickets/TicketListPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { toolsApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';
import OnboardingEmpty from '../../components/onboarding/OnboardingEmpty';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';

export const TicketListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dateRange, setDateRange] = useState(''); // mock filter
  const [sortKey, setSortKey] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    categoryId: '',
    title: '',
    description: '',
    locationText: '',
    latitude: null,
    longitude: null,
    priority: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editAttachments, setEditAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentDeleteTarget, setAttachmentDeleteTarget] = useState(null);
  const [attachmentWarning, setAttachmentWarning] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [pageMessage, setPageMessage] = useState({ type: '', message: '' });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        search,
        status,
        categoryId
      };
      if (user?.role === 'service-user') {
        filters.userId = user.userId;
      }
      const res = await ticketApi.getTickets(filters);
      setTickets(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, search, status, categoryId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, categoryId, dateRange]);

  // Helpers for stats counts
  const [allCitizenTickets, setAllCitizenTickets] = useState([]);
  useEffect(() => {
    const fetchAllCitizenTickets = async () => {
      if (user?.userId) {
        try {
          const res = await ticketApi.getTickets({ userId: user.userId });
          setAllCitizenTickets(res);
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchAllCitizenTickets();
  }, [user, loading]);

  const countAll = allCitizenTickets.length;
  const countInProgress = allCitizenTickets.filter(t => ['Submitted', 'AI Reviewed', 'Assigned', 'InProgress'].includes(t.status)).length;
  const countResolved = allCitizenTickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
  const countAwaitingReview = allCitizenTickets.filter(t => t.status === 'Resolved').length;

  const renderProgressStage = (s) => {
    switch (s) {
      case 'Submitted':
        return { label: 'Mới nhận', tone: 'bg-blue-50 text-blue-600', icon: <Lucide.Mail className="text-blue-600" size={14} /> };
      case 'AI Reviewed':
        return { label: 'Đang phân loại', tone: 'bg-purple-50 text-purple-600', icon: <Lucide.Cpu className="text-purple-600" size={14} /> };
      case 'Assigned':
        return { label: 'Đã phân công', tone: 'bg-indigo-50 text-indigo-600', icon: <Lucide.Users className="text-indigo-600" size={14} /> };
      case 'InProgress':
        return { label: 'Đang xử lý', tone: 'bg-amber-50 text-amber-600', icon: <Lucide.Wrench className="text-amber-600" size={14} /> };
      case 'Resolved':
        return { label: 'Hoàn thành', tone: 'bg-emerald-50 text-emerald-600', icon: <Lucide.CheckCircle2 className="text-emerald-600" size={14} /> };
      case 'Closed':
        return { label: 'Đã đóng', tone: 'bg-slate-100 text-slate-600', icon: <Lucide.Lock className="text-slate-600" size={14} /> };
      default:
        return { label: 'Chờ xử lý', tone: 'bg-slate-50 text-slate-500', icon: <Lucide.Clock className="text-slate-500" size={14} /> };
    }
  };

  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-red-700">KHẨN CẤP</span>;
      case 'High':
        return <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700">CAO</span>;
      case 'Medium':
        return <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">TRUNG BÌNH</span>;
      case 'Low':
        return <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-700">THẤP</span>;
      default:
        return <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-700">TRUNG BÌNH</span>;
    }
  };

  const renderStatusDot = (s) => {
    const stage = renderProgressStage(s);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${stage.tone} border border-slate-200`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 opacity-75"></span>
        {stage.label}
      </span>
    );
  };

  const filteredTickets = tickets
    .filter((ticket) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        ticket.title?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        formatTicketId(ticket.feedbackId).toLowerCase().includes(query) ||
        ticket.locationText?.toLowerCase().includes(query);

      const matchesStatus = status ? ticket.status === status : true;
      const matchesCategory = categoryId ? String(ticket.categoryId) === String(categoryId) : true;
      const matchesDate = dateRange
        ? new Date(ticket.createdAt).toLocaleDateString('vi-VN').includes(dateRange)
        : true;

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    })
    .sort((a, b) => {
      if (sortKey === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortKey === 'priority') {
        const priorityOrder = { Critical: 1, High: 2, Medium: 3, Low: 4 };
        return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
      }
      if (sortKey === 'status') {
        const statusOrder = {
          Submitted: 1,
          'AI Reviewed': 2,
          Assigned: 3,
          InProgress: 4,
          Resolved: 5,
          Closed: 6,
        };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });


  const formatTicketId = (fbId) => {
    if (!fbId) return '';
    const num = fbId.split('-').pop();
    return `UM-2026-00${num}`;
  };

  const openEditModal = async (ticket) => {
    try {
      const detailResponse = await ticketApi.getTicketById(ticket.feedbackId);

      const detail =
        detailResponse?.data ||
        detailResponse?.item ||
        detailResponse?.result ||
        detailResponse ||
        ticket;

      setEditTarget(detail);

      setEditForm({
        categoryId: detail.categoryId || ticket.categoryId || '',
        title: detail.title || ticket.title || '',
        description: detail.description || ticket.description || '',
        locationText: detail.locationText || ticket.locationText || '',
        latitude: detail.latitude ?? ticket.latitude ?? null,
        longitude: detail.longitude ?? ticket.longitude ?? null,
        priority: detail.priority || ticket.priority || '',
      });
      setEditAttachments(Array.isArray(detail.attachments) ? detail.attachments : []);
      setSelectedFiles([]);
    } catch (err) {
      console.error('Không lấy được chi tiết phản ánh để sửa:', err);

      setEditTarget(ticket);
      setEditForm({
        categoryId: ticket.categoryId || '',
        title: ticket.title || '',
        description: ticket.description || '',
        locationText: ticket.locationText || '',
        latitude: ticket.latitude ?? null,
        longitude: ticket.longitude ?? null,
        priority: ticket.priority || '',
      });
      setEditAttachments(Array.isArray(ticket.attachments) ? ticket.attachments : []);
      setSelectedFiles([]);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setPageMessage({ type: 'error', message: 'Trình duyệt không hỗ trợ lấy vị trí hiện tại.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setEditForm((prev) => ({
          ...prev,
          latitude,
          longitude,
          locationText: `Vị trí hiện tại: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        }));
      },
      () => {
        setPageMessage({ type: 'error', message: 'Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền vị trí.' });
      }
    );
  };

  const getAttachmentId = (file) => {
    if (!file || typeof file === 'string') return null;

    return (
      file.attachmentId ||
      file.id ||
      file.fileId ||
      file.feedbackAttachmentId ||
      null
    );
  };

  const getAttachmentUrl = (file) => {
    if (!file) return '';

    if (typeof file === 'string') return file;

    return (
      file.fileUrl ||
      file.url ||
      file.path ||
      file.attachmentUrl ||
      file.displayUrl ||
      ''
    );
  };

  const getAttachmentName = (file, index) => {
    if (!file) return `Tệp ${index + 1}`;

    if (typeof file === 'string') {
      return file.split('/').pop() || `Tệp ${index + 1}`;
    }

    return (
      file.fileName ||
      file.name ||
      file.originalFileName ||
      `Tệp ${index + 1}`
    );
  };

  const isVideoFile = (fileUrl = '') => {
    const url = fileUrl.toLowerCase();

    return (
      url.includes('.mp4') ||
      url.includes('.webm') ||
      url.includes('.ogg') ||
      url.includes('.mov') ||
      url.includes('.m4v')
    );
  };
  const handleUploadAttachments = async () => {
    if (!editTarget || selectedFiles.length === 0) return;

    try {
      setAttachmentLoading(true);

      await ticketApi.addAttachments(editTarget.feedbackId, selectedFiles);

      const detailResponse = await ticketApi.getTicketById(editTarget.feedbackId);

      const detail =
        detailResponse?.data ||
        detailResponse?.item ||
        detailResponse?.result ||
        detailResponse;

      setEditAttachments(Array.isArray(detail?.attachments) ? detail.attachments : []);
      setSelectedFiles([]);
    } catch (err) {
      console.error('Không thể thêm tệp đính kèm:', err);
      setPageMessage({
        type: 'error',
        message:
          err?.response?.data?.message ||
          err?.message ||
          'Không thể thêm tệp đính kèm.',
      });
    } finally {
      setAttachmentLoading(false);
    }
  };

  const handleDeleteAttachment = async () => {
    if (editAttachments.length <= 1) {
      setAttachmentWarning('Phản ánh phải có ít nhất một hình ảnh hoặc video minh chứng.');
      setAttachmentDeleteTarget(null);
      return;
    }

    if (!editTarget || !attachmentDeleteTarget) return;

    const attachmentId = getAttachmentId(attachmentDeleteTarget);

    if (!attachmentId) {
      setPageMessage({ type: 'error', message: 'Không tìm thấy attachmentId để xóa file này.' });
      setAttachmentDeleteTarget(null);
      return;
    }

    try {
      setAttachmentLoading(true);

      await ticketApi.deleteAttachment(editTarget.feedbackId, attachmentId);

      setEditAttachments((prev) =>
        prev.filter((item) => getAttachmentId(item) !== attachmentId)
      );

      setAttachmentDeleteTarget(null);
    } catch (err) {
      console.error('Không thể xóa tệp đính kèm:', err);
      setPageMessage({
        type: 'error',
        message:
          err?.response?.data?.message ||
          err?.message ||
          'Không thể xóa tệp đính kèm.',
      });
    } finally {
      setAttachmentLoading(false);
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();

    if (!editTarget) return;

    if (!editForm.title.trim()) {
      setPageMessage({ type: 'error', message: 'Vui lòng nhập tiêu đề phản ánh.' });
      return;
    }

    if (!editForm.description.trim()) {
      setPageMessage({ type: 'error', message: 'Vui lòng nhập mô tả phản ánh.' });
      return;
    }

    try {
      setEditLoading(true);

      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        locationText: editForm.locationText.trim(),
      };

      if (editForm.categoryId !== '') {
        payload.categoryId = Number(editForm.categoryId);
      }

      if (editForm.latitude !== null && editForm.latitude !== '') {
        payload.latitude = Number(editForm.latitude);
      }

      if (editForm.longitude !== null && editForm.longitude !== '') {
        payload.longitude = Number(editForm.longitude);
      }

      if (editForm.priority !== '') {
        payload.priority = editForm.priority;
      }

      const updatedResponse = await ticketApi.updateTicket(editTarget.feedbackId, payload);

      const updatedTicket =
        updatedResponse?.data ||
        updatedResponse?.item ||
        updatedResponse?.result ||
        updatedResponse ||
        payload;

      const nextTicket = {
        ...editTarget,
        ...payload,
        ...updatedTicket,
      };

      setTickets((prev) =>
        prev.map((t) => (t.feedbackId === editTarget.feedbackId ? nextTicket : t))
      );

      setAllCitizenTickets((prev) =>
        prev.map((t) => (t.feedbackId === editTarget.feedbackId ? nextTicket : t))
      );

      setEditTarget(null);
    } catch (err) {
      console.error('Không thể cập nhật phản ánh:', err);
      setPageMessage({
        type: 'error',
        message:
          err?.response?.data?.message ||
          err?.message ||
          'Không thể cập nhật phản ánh.',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);

      await ticketApi.deleteTicket(deleteTarget.feedbackId);

      setTickets((prev) => prev.filter((t) => t.feedbackId !== deleteTarget.feedbackId));
      setAllCitizenTickets((prev) => prev.filter((t) => t.feedbackId !== deleteTarget.feedbackId));

      setDeleteTarget(null);
    } catch (err) {
      console.error('Không thể xóa phản ánh:', err);
      setPageMessage({
        type: 'error',
        message:
          err?.response?.data?.message ||
          err?.message ||
          'Không thể xóa phản ánh.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Pagination calculations
  const totalItems = filteredTickets.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTickets = Array.isArray(filteredTickets) ? filteredTickets.slice(startIndex, endIndex) : [];

  return (
    <div className="page-container space-y-6 text-slate-800">
      {pageMessage.type && (
        <div>
          {pageMessage.type === 'error' ? (
            <ErrorAlert
              title="Lỗi"
              message={pageMessage.message}
              onClose={() => setPageMessage({ type: '', message: '' })}
            />
          ) : (
            <SuccessAlert
              title="Thành công"
              message={pageMessage.message}
              onClose={() => setPageMessage({ type: '', message: '' })}
            />
          )}
        </div>
      )}
      {/* Breadcrumbs */}
      <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
        <span>Trang chủ</span>
        <Lucide.ChevronRight size={12} />
        <span className="text-[color:var(--brand-primary)]">Phản ánh đã gửi</span>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Phản ánh đã gửi</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Theo dõi tiến độ, cập nhật hội thoại và đánh giá chất lượng xử lý các sự cố đô thị.</p>
        </div>
        <Link to="/tickets/create" className="btn btn-primary rounded-xl text-xs font-bold gap-1.5 h-10 px-4 min-h-0">
          <Lucide.Plus size={16} />
          Gửi phản ánh mới
        </Link>
      </div>

      {/* 4 Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Tất cả phản ánh',
            count: countAll,
            icon: <Lucide.FileText size={18} />,
            active: status === '',
            onClick: () => setStatus(''),
          },
          {
            label: 'Đang xử lý',
            count: countInProgress,
            icon: <Lucide.Clock size={18} />,
            active: status === 'InProgress',
            onClick: () => setStatus('InProgress'),
          },
          {
            label: 'Đã xử lý',
            count: countResolved,
            icon: <Lucide.CheckCircle2 size={18} />,
            active: status === 'Resolved',
            onClick: () => setStatus('Resolved'),
          },
          {
            label: 'Chờ đánh giá',
            count: countAwaitingReview,
            icon: <Lucide.Star size={18} />,
            active: status === 'Resolved',
            onClick: () => setStatus('Resolved'),
          },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className={`w-full rounded-2xl border p-4 text-left transition duration-200 ${card.active ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            aria-pressed={card.active}
          >
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{card.label}</span>
              <div className={card.label === 'Đã xử lý' ? 'p-2 rounded-xl bg-emerald-50 text-emerald-600' : card.label === 'Chờ đánh giá' ? 'p-2 rounded-xl bg-red-50 text-red-500' : card.label === 'Đang xử lý' ? 'p-2 rounded-xl bg-slate-100 text-slate-600' : 'p-2 rounded-xl bg-blue-50 text-blue-600'}>
                {card.icon}
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-900">{card.count}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filters Hub Row */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="form-control sm:col-span-2">
            <label className="sr-only" htmlFor="resident-search">Tìm kiếm phản ánh</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Lucide.Search size={15} />
              </span>
              <input
                id="resident-search"
                type="text"
                aria-label="Tìm kiếm phản ánh"
                placeholder="Tìm kiếm phản ánh, địa điểm, mã..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input input-bordered w-full pl-9 text-xs rounded-xl h-10 border-slate-200 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="sr-only" htmlFor="filter-category">Lọc danh mục</label>
            <select
              id="filter-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="select select-bordered text-xs rounded-xl h-10 min-h-0 font-semibold border-slate-200 focus:border-primary focus:outline-none w-full"
            >
              <option value="">Tất cả danh mục</option>
              {toolsApi.getCategories().map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="sr-only" htmlFor="filter-status">Lọc trạng thái</label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="select select-bordered text-xs rounded-xl h-10 min-h-0 font-semibold border-slate-200 focus:border-primary focus:outline-none w-full"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Submitted">Đã gửi</option>
              <option value="AI Reviewed">Đang xem xét</option>
              <option value="Assigned">Đã phân công</option>
              <option value="InProgress">Đang xử lý</option>
              <option value="Resolved">Đã xử lý</option>
              <option value="Closed">Đã đóng</option>
            </select>
          </div>

          <div className="form-control">
            <label className="sr-only" htmlFor="sort-key">Sắp xếp</label>
            <select
              id="sort-key"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="select select-bordered text-xs rounded-xl h-10 min-h-0 font-semibold border-slate-200 focus:border-primary focus:outline-none w-full"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="priority">Ưu tiên</option>
              <option value="status">Trạng thái</option>
            </select>
          </div>

          <div className="form-control">
            <label className="sr-only" htmlFor="date-range">Bộ lọc ngày</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Lucide.Calendar size={15} />
              </span>
              <input
                id="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input input-bordered w-full pl-9 text-xs rounded-xl h-10 border-slate-200 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Status Shortcut Pills Row */}
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <span className="font-bold text-slate-400 mr-1">Sắp xếp nhanh:</span>
        {['', 'Submitted', 'AI Reviewed', 'Assigned', 'InProgress', 'Resolved', 'Closed'].map((value) => (
          <button
            key={value || 'all'}
            type="button"
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
            className={`px-3 py-1.5 rounded-full font-bold text-[11px] border transition duration-200 ease-out ${status === value ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
          >
            {value === '' ? 'Tất cả' : value === 'AI Reviewed' ? 'Đang xem xét' : value === 'InProgress' ? 'Đang xử lý' : value === 'Resolved' ? 'Đã xử lý' : value}
          </button>
        ))}
      </div>

      {/* Main timeline list */}
      <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4 fade-in-up visible">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-[color:var(--brand-primary)]"></span>
          </div>
        ) : paginatedTickets.length === 0 ? (
          <div className="py-6">
            <OnboardingEmpty />
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedTickets.map((ticket) => {
              const stage = renderProgressStage(ticket.status);
              return (
                <article key={ticket.feedbackId} className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="absolute left-0 top-7 hidden h-[calc(100%-2rem)] w-0.5 bg-slate-200 md:block"></div>
                  <div className="md:pl-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          <span>{formatTicketId(ticket.feedbackId)}</span>
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                          <span>{toolsApi.getCategories().find((c) => c.categoryId === ticket.categoryId)?.categoryName}</span>
                        </div>
                        <h3 className="text-base font-black text-slate-950 leading-tight">
                          {ticket.title}
                        </h3>
                        <p className="text-sm text-slate-600 max-w-3xl leading-6 line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {renderPriorityBadge(ticket.priority)}
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                          <Lucide.CalendarClock size={12} />
                          {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-3xl bg-white border border-slate-200 p-4">
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Trạng thái</p>
                        <div className="mt-3">{renderStatusDot(ticket.status)}</div>
                      </div>
                      <div className="rounded-3xl bg-white border border-slate-200 p-4">
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Tiến trình</p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-700">
                          {stage.icon}
                          {stage.label}
                        </div>
                      </div>
                      <div className="rounded-3xl bg-white border border-slate-200 p-4">
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Vị trí</p>
                        <p className="mt-3 text-sm font-semibold text-slate-700 truncate">
                          {ticket.locationText || 'Chưa có địa điểm'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Lucide.Tag size={14} />
                          {toolsApi.getCategories().find((c) => c.categoryId === ticket.categoryId)?.categoryName}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Lucide.Megaphone size={14} />
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate(`/tickets/${ticket.feedbackId}`)}
                          className="btn btn-sm rounded-2xl bg-[color:var(--brand-primary)] text-white border-none text-xs font-black h-10"
                        >
                          Xem tiến độ
                        </button>
                        <button
                          onClick={() => openEditModal(ticket)}
                          className="btn btn-sm btn-outline rounded-2xl text-xs font-bold h-10"
                        >
                          Chỉnh sửa
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination bar */}
        {!loading && tickets.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-slate-500">
            <div>
              Hiển thị {startIndex + 1}-{endIndex} của {totalItems} phản ánh
            </div>
            <div className="flex gap-1">
                <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="btn btn-xs rounded-lg btn-outline border-slate-200 disabled:opacity-50 text-slate-600"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`btn btn-xs rounded-lg w-8 h-8 ${currentPage === idx + 1
                    ? 'bg-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-dark)] text-white border-none'
                    : 'btn-outline border-slate-200 text-slate-600'
                    }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn btn-xs rounded-lg btn-outline border-slate-200 disabled:opacity-50 text-slate-600"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Lucide.Trash2 size={22} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Xóa phản ánh?
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Bạn có chắc muốn xóa phản ánh{' '}
                  <span className="font-bold text-slate-800">
                    {deleteTarget.title}
                  </span>
                  ? Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="btn btn-ghost rounded-xl font-bold"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleDeleteTicket}
                disabled={deleteLoading}
                className="btn bg-red-500 hover:bg-red-600 text-white border-none rounded-xl font-bold"
              >
                {deleteLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <Lucide.Trash2 size={16} />
                    Xóa phản ánh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[88vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Sửa phản ánh
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Cập nhật thông tin phản ánh của bạn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={editLoading}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <Lucide.X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTicket} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="form-control space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="input input-bordered rounded-2xl text-sm h-12"
                    placeholder="Nhập tiêu đề phản ánh"
                  />
                </div>

                <div className="form-control space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">
                    Danh mục
                  </label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))
                    }
                    className="select select-bordered rounded-2xl text-sm h-12"
                  >
                    {toolsApi.getCategories().map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control space-y-1.5 w-full">
                <label className="text-xs font-bold text-slate-600">
                  Mô tả
                </label>

                <textarea
                  rows="7"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="textarea textarea-bordered rounded-2xl text-sm w-full min-h-[190px] resize-none leading-relaxed px-4 py-3"
                  placeholder="Nhập mô tả phản ánh"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="form-control space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">
                    Vị trí
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.locationText}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, locationText: e.target.value }))
                      }
                      className="input input-bordered rounded-2xl text-sm h-12 flex-1"
                      placeholder="Nhập vị trí hoặc địa chỉ"
                    />

                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="btn btn-outline rounded-2xl h-12 px-4"
                      title="Lấy vị trí hiện tại"
                    >
                      <Lucide.MapPin size={17} />
                    </button>
                  </div>

                  {editForm.latitude !== null && editForm.longitude !== null && (
                    <p className="text-[10px] text-slate-400 font-semibold pl-1">
                      Tọa độ: {Number(editForm.latitude).toFixed(6)}, {Number(editForm.longitude).toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="form-control space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">
                    Mức ưu tiên
                  </label>

                  <select
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    className="select select-bordered rounded-2xl text-sm h-12"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-4 w-full">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                      <Lucide.ImagePlus size={18} />
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-slate-800">
                        Hình ảnh / video đính kèm
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Thêm hoặc xóa file đính kèm cho phản ánh này. Cần giữ lại ít nhất 1 ảnh hoặc video minh chứng.
                      </p>
                    </div>
                  </div>

                  {editAttachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {editAttachments.map((file, index) => {
                        const fileUrl = getAttachmentUrl(file);

                        return (
                          <div
                            key={getAttachmentId(file) || fileUrl || index}
                            className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3"
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(file)}
                              className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0"
                            >
                              {fileUrl ? (
                                isVideoFile(fileUrl) ? (
                                  <div className="relative w-full h-full bg-black">
                                    <video
                                      src={fileUrl}
                                      muted
                                      playsInline
                                      preload="metadata"
                                      className="w-full h-full object-cover opacity-80"
                                    />

                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <div className="w-7 h-7 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-sm">
                                        <Lucide.Play size={14} fill="currentColor" />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={fileUrl}
                                    alt={getAttachmentName(file, index)}
                                    className="w-full h-full object-cover"
                                  />
                                )
                              ) : (
                                <Lucide.File size={20} className="text-slate-400" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">
                                {getAttachmentName(file, index)}
                              </p>
                              {fileUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment(file)}
                                  className="text-[10px] text-[color:var(--brand-primary)] font-bold hover:underline"
                                >
                                  Xem file
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (editAttachments.length <= 1) {
                                  setAttachmentWarning('Phản ánh phải có ít nhất một hình ảnh hoặc video minh chứng.');
                                  setAttachmentDeleteTarget(null);
                                  return;
                                }

                                setAttachmentDeleteTarget(file);
                              }}
                              disabled={attachmentLoading}
                              className="btn btn-ghost btn-circle btn-xs text-red-500 hover:bg-red-50"
                              title="Xóa file"
                            >
                              <Lucide.Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                      className="file-input file-input-bordered rounded-2xl flex-1 text-sm"
                    />

                    <button
                      type="button"
                      onClick={handleUploadAttachments}
                      disabled={attachmentLoading || selectedFiles.length === 0}
                      className="btn btn-outline rounded-2xl font-bold"
                    >
                      {attachmentLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <>
                          <Lucide.Upload size={16} />
                          Thêm file
                        </>
                      )}
                    </button>
                  </div>

                  {selectedFiles.length > 0 && (
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Đã chọn {selectedFiles.length} file.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    disabled={editLoading}
                    className="btn btn-ghost rounded-xl font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="btn bg-amber-500 hover:bg-amber-600 text-white border-none rounded-xl font-bold"
                  >
                    {editLoading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <>
                        <Lucide.Save size={16} />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment Delete Modal */}
      {attachmentDeleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Lucide.Trash2 size={22} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Xóa tệp đính kèm?
                </h3>

                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Bạn có chắc muốn xóa file{' '}
                  <span className="font-bold text-slate-800">
                    {getAttachmentName(attachmentDeleteTarget, 0)}
                  </span>
                  ? Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAttachmentDeleteTarget(null)}
                disabled={attachmentLoading}
                className="btn btn-ghost rounded-xl font-bold"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleDeleteAttachment}
                disabled={attachmentLoading}
                className="btn bg-red-500 hover:bg-red-600 text-white border-none rounded-xl font-bold"
              >
                {attachmentLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <Lucide.Trash2 size={16} />
                    Xóa file
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {attachmentWarning && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <Lucide.AlertTriangle size={22} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Không thể xóa file cuối cùng
                </h3>

                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {attachmentWarning}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAttachmentWarning('')}
                className="btn bg-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-dark)] text-white border-none rounded-xl font-bold"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && (() => {
        const previewUrl = getAttachmentUrl(previewAttachment);
        const isVideo = isVideoFile(previewUrl);

        return (
          <div
            className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center px-4 py-6"
            onClick={() => setPreviewAttachment(null)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-slate-900 truncate">
                    {isVideo ? 'Video đính kèm' : 'Hình ảnh đính kèm'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Xem trực tiếp trong trang
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="btn btn-sm btn-ghost btn-circle"
                >
                  <Lucide.X size={18} />
                </button>
              </div>

              <div className="bg-black flex items-center justify-center max-h-[75vh]">
                {isVideo ? (
                  <video
                    src={previewUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[75vh] object-contain"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Attachment preview"
                    className="w-full max-h-[75vh] object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
