// src/pages/tickets/AIReviewDetail.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { managementTypes } from '@urbanmind/shared-types';
import { signalrService } from '../../services/socket/signalrService';
import { toolsApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';

const getUrgencyBadgeClass = (urgency = '') => {
  const normalized = `${urgency || ''}`.trim().toLowerCase();
  if (normalized === 'critical') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (normalized === 'high') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-500';
};

const getTicketPriority = (ticket = {}) => {
  return `${ticket.priority || ticket.urgencyLevel || ticket.analysisResult?.urgencyLevel || ticket.urgency || 'Medium'}`.trim();
};

const FALLBACK_CATEGORIES = [
  { categoryId: 1, categoryName: 'Vệ sinh môi trường' },
  { categoryId: 2, categoryName: 'Đường sá' },
  { categoryId: 3, categoryName: 'Cấp thoát nước' },
  { categoryId: 4, categoryName: 'Điện chiếu sáng' },
  { categoryId: 5, categoryName: 'Cây xanh' },
  { categoryId: 6, categoryName: 'An toàn giao thông' },
];

export const AIReviewDetail = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [categories, setCategories] = useState([]);
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [showUrgencyDropdown, setShowUrgencyDropdown] = useState(false);
  
  // Edit variables
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectTicket = (t) => {
    const detectedCategoryId = t?.analysisResult?.detectedCategoryId || t?.detectedCategoryId || t?.categoryId;
    setSelectedTicket(t);
    setEditCategoryId(detectedCategoryId || '');
    setEditPriority(getTicketPriority(t));
  };

  useEffect(() => {
    const loadQueue = async () => {
      try {
        const res = await managementFeedbackApi.getAiReviewedFeedbacks({ pageSize: 50 });
        const normalized = Array.isArray(res) ? res : [];
        setTickets(normalized);
        if (normalized.length > 0) {
          handleSelectTicket(normalized[0]);
        } else {
          setSelectedTicket(null);
        }
      } catch (err) {
        console.error('Failed to load AI reviewed queue', err);
      }
    };

    const loadCategories = async () => {
      try {
        const res = await toolsApi.getCategories();
        const resolved = Array.isArray(res) && res.length > 0 ? res : FALLBACK_CATEGORIES;
        setCategories(resolved);
      } catch (err) {
        console.error('Failed to load categories', err);
        setCategories(FALLBACK_CATEGORIES);
      }
    };

    loadQueue();
    loadCategories();
  }, []);

  const URGENCY_OPTIONS = ['High', 'Critical'];

  useEffect(() => {
    const onDocClick = (event) => {
      if (!showUrgencyDropdown) return;
      try {
        const target = event.target;
        if (!target.closest('.urgency-dropdown') && !target.closest('.urgency-filter-button')) {
          setShowUrgencyDropdown(false);
        }
      } catch {
        setShowUrgencyDropdown(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showUrgencyDropdown]);

  const displayedTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (!urgencyFilter) return true;
      const urgency = getTicketPriority(t);
      return urgency === urgencyFilter;
    });
  }, [tickets, urgencyFilter]);

  useEffect(() => {
    if (!displayedTickets || displayedTickets.length === 0) {
      setSelectedTicket(null);
      return;
    }
    // keep selection in sync: if current selectedTicket isn't in displayed list, pick first
    const isSelectedVisible = selectedTicket && displayedTickets.some((d) => d.feedbackId === selectedTicket.feedbackId);
    if (!isSelectedVisible) setSelectedTicket(displayedTickets[0]);
  }, [displayedTickets, selectedTicket]);

  const selectedParentFeedbackId = selectedTicket?.parentTicketId || selectedTicket?.parentFeedbackId || null;
  const selectedIsConfirmedDuplicate = Boolean(selectedParentFeedbackId);

  const handleApprove = async () => {
    if (!selectedTicket || selectedIsConfirmedDuplicate) return;
    setLoading(true);
    try {
      await ticketApi.verifyAndApprove(selectedTicket.feedbackId, user.userId, {
        categoryId: editCategoryId,
        priority: editPriority
      }, { role: user.role });
      // Notify listeners that status changed (Submitted -> Verified)
      try {
        signalrService.notifyStatusChanged(selectedTicket.feedbackId, selectedTicket.status, managementTypes.feedbackStatus.VERIFIED, user);
      } catch (e) {
        console.warn('SignalR notify failed', e);
      }
      // Redirect to assignment page for this ticket
      navigate(`/tickets/assign/${selectedTicket.feedbackId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-3xl font-black">Hàng Chờ Kiểm Duyệt AI</h2>
        <p className="max-w-3xl text-sm text-gray-500 font-semibold">Đánh giá kết quả phân loại tự động của AI đối với các phản ánh mới trước khi tiến hành điều phối.</p>
      </div>

      {tickets.length === 0 ? (
        <div className="card bg-base-100 border border-base-300 p-12 text-center rounded-[28px] space-y-4 shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Lucide.CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm">Hàng Chờ Đang Trống</h3>
            <p className="text-xs text-gray-500 font-semibold mt-1">Tất cả các phản ánh mới đã được phê duyệt và điều phối hoàn tất.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
          <aside className="lg:sticky lg:top-28 self-start">
            <div className="card bg-base-100 border border-base-200 p-4 rounded-[28px] shadow-sm">
              <div className="border-b border-base-200 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Danh sách phản ánh mới ({displayedTickets.length})</h4>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowUrgencyDropdown((v) => !v)}
                      className="urgency-filter-button btn btn-sm btn-outline border-slate-300 rounded-xl text-xs font-bold text-slate-600 h-9 min-h-0 flex gap-1.5 items-center"
                    >
                      <Lucide.SlidersHorizontal size={14} />
                      Bộ lọc
                    </button>
                  </div>
                </div>
                {showUrgencyDropdown ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 mt-3 urgency-dropdown">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tùy chọn lọc</span>
                      <button
                        type="button"
                        onClick={() => { setUrgencyFilter(''); setShowUrgencyDropdown(false); }}
                        className={`btn btn-xs rounded-full border-slate-300 ${urgencyFilter === '' ? 'bg-[color:var(--brand-primary)] text-white' : 'bg-white text-slate-700'}`}
                      >
                        Tất cả
                      </button>
                      {URGENCY_OPTIONS.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => { setUrgencyFilter(u); setShowUrgencyDropdown(false); }}
                          className={`btn btn-xs rounded-full border-slate-300 ${urgencyFilter === u ? 'bg-[color:var(--brand-primary)] text-white' : 'bg-white text-slate-700'}`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-3 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
                {displayedTickets.map((t) => {
                  const isConfirmedDuplicate = Boolean(t?.parentTicketId || t?.parentFeedbackId);
                  return (
                  <button
                    key={t.feedbackId}
                    type="button"
                    onClick={() => handleSelectTicket(t)}
                    className={`w-full text-left p-4 rounded-3xl border transition duration-200 flex flex-col gap-3 ${
                      selectedTicket?.feedbackId === t.feedbackId
                        ? 'border-primary bg-primary/10 shadow-sm text-primary'
                        : `border-base-200 ${getUrgencyBadgeClass(getTicketPriority(t)) === 'border-amber-200 bg-amber-50 text-amber-700' || getUrgencyBadgeClass(getTicketPriority(t)) === 'border-rose-200 bg-rose-50 text-rose-700' ? 'bg-amber-50/20 hover:border-amber-300' : 'bg-white hover:border-base-300 hover:shadow-sm'}`
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500">
                      <span className="truncate">{t.feedbackId}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isConfirmedDuplicate ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
                          <Lucide.GitMerge size={11} aria-hidden="true" />
                          Phản ánh trùng
                        </span>
                      ) : null}
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getUrgencyBadgeClass(getTicketPriority(t))}`}>
                        {getTicketPriority(t)}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-base-content line-clamp-2">{t.title}</h5>
                    <span className="text-xs font-semibold text-gray-500 line-clamp-1">{t.locationText}</span>
                  </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            {selectedTicket && (
              <>
                {selectedIsConfirmedDuplicate ? (
                  <section className="rounded-[28px] border border-violet-200 bg-violet-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
                          <Lucide.GitMerge size={20} aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="font-bold text-violet-950">Phản ánh trùng</h3>
                          <p className="mt-1 text-sm text-violet-800">Không duyệt hoặc phân công riêng; phản ánh này được xử lý theo phản ánh đã có.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/staff/feedbacks/${selectedParentFeedbackId}`)}
                        className="btn btn-sm rounded-xl border-violet-200 bg-white text-violet-700 hover:bg-violet-100"
                      >
                        <Lucide.ExternalLink size={14} aria-hidden="true" />
                        Xem phản ánh đã có
                      </button>
                    </div>
                  </section>
                ) : null}
                <div className="card bg-base-100 border border-base-200 p-6 rounded-[32px] shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary">
                        <Lucide.Sparkles size={16} /> AI Review Insights
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black leading-tight">Phân Tích AI Đề Xuất</h3>
                        <p className="max-w-2xl text-sm text-gray-500">Kết quả phân tích tự động từ AI giúp staff đánh giá và ra quyết định nhanh hơn.</p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-3 rounded-3xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                        <Lucide.BarChart3 size={20} />
                      </span>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Độ tin cậy AI</p>
                        <p className="text-2xl font-black">{Math.round((selectedTicket.confidenceScore || 0) * 100)}%</p>
                      </div>
                    </div>
                  </div>                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getUrgencyBadgeClass(getTicketPriority(selectedTicket))}`}>
                      {getTicketPriority(selectedTicket)}
                    </span>
                  </div>
                  <div className="mt-6 grid gap-6">
                    <div className="rounded-[28px] border border-base-200 bg-base-200/70 p-6">
                      <p className="text-sm uppercase tracking-[0.18em] text-gray-500">Tóm tắt sự cố</p>
                      <p className="mt-4 text-lg leading-8 font-semibold text-gray-900">{selectedTicket.summary || selectedTicket.description || 'Không có tóm tắt từ AI.'}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-3xl border border-base-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Lucide.ShieldCheck size={18} />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Độ tin cậy</p>
                            <p className="mt-2 text-xl font-bold text-gray-900">{Math.round((selectedTicket.confidenceScore || 0) * 100)}%</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-3xl border border-base-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                            <Lucide.TrendingUp size={18} />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ưu tiên</p>
                            <p className="mt-2 text-xl font-bold text-gray-900">{getTicketPriority(selectedTicket)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-3xl border border-base-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                            <Lucide.HeartPulse size={18} />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cảm xúc</p>
                            <p className="mt-2 text-xl font-bold text-gray-900">{selectedTicket.sentiment || 'Neutral'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-3xl border border-base-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                            <Lucide.Repeat size={18} />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Trùng lặp</p>
                            <p className="mt-2 text-xl font-bold text-gray-900">{selectedTicket.duplicateLikelihood != null ? `${selectedTicket.duplicateLikelihood}%` : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-bold text-xs">Danh mục</span>
                        </label>
                        <select 
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(Number(e.target.value))}
                          className="select select-bordered select-sm rounded-2xl font-semibold"
                        >
                          {categories.map((c) => (
                            <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-bold text-xs">Mức độ ưu tiên</span>
                        </label>
                        <select 
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value)}
                          className="select select-bordered select-sm rounded-2xl font-semibold"
                        >
                          <option value="Low">Thấp (Low)</option>
                          <option value="Medium">Trung bình (Medium)</option>
                          <option value="High">Cao (High)</option>
                          <option value="Critical">Khẩn cấp (Critical)</option>
                        </select>
                      </div>

                      <div className="rounded-3xl border border-base-200 bg-base-200/70 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Khu vực</p>
                        <p className="mt-3 text-sm font-semibold text-gray-900">{selectedTicket.areaName || 'Chưa có khu vực'}</p>
                      </div>
                    </div>

                    <div className="rounded-[32px] border border-base-200 bg-base-200/70 p-6 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Rủi ro & Hành động đề xuất</p>
                          <p className="mt-2 text-sm text-gray-600">Thông tin AI dựa trên dữ liệu phân tích và cảnh báo giúp bạn đưa quyết định nhanh hơn.</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Thông tin AI</span>
                      </div>
                      <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <p className="font-semibold text-gray-900">Rủi ro / Lưu ý</p>
                            {selectedTicket.riskNotes?.length > 0 ? (
                              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-600">
                                {selectedTicket.riskNotes.map((note) => <li key={note}>{note}</li>)}
                              </ul>
                            ) : (
                              <p className="mt-3 text-gray-600">Không có ghi chú rủi ro cụ thể.</p>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Quan sát AI</p>
                            <p className="mt-3 text-gray-600">{selectedTicket.summary || 'AI không cung cấp nhận xét chi tiết.'}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="font-semibold text-gray-900">Ưu tiên xử lý</p>
                            <p className="mt-3 text-gray-600">{getTicketPriority(selectedTicket) ? `Xử lý ở mức ${getTicketPriority(selectedTicket).toLowerCase()}` : 'Chưa xác định mức độ ưu tiên.'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Hành động đề xuất</p>
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-600">
                              <li>Kiểm tra danh mục và mức độ ưu tiên AI đề xuất.</li>
                              <li>Chỉnh sửa nếu cần và xác nhận chuyển phân công.</li>
                              <li>Ghi chú thêm nếu có rủi ro đặc biệt.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedIsConfirmedDuplicate ? (
                      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center text-sm font-semibold text-violet-800">
                        Phản ánh trùng không cần duyệt hoặc phân công riêng.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={loading}
                        className="btn btn-primary w-full rounded-2xl font-bold text-sm h-14"
                      >
                        {loading ? <span className="loading loading-spinner"></span> : 'Xác Nhận & Duyệt Chuyển Phân Công'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="card bg-base-100 border border-base-200 p-6 rounded-[32px] shadow-sm">
                  <div className="border-b border-base-200 pb-4 mb-6">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-400">Chi Tiết Sự Cố</h4>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tiêu đề</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedTicket.title || 'Không có tiêu đề'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Mã phản ánh</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedTicket.feedbackId}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Người báo cáo</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedTicket.reporterName || 'Không rõ'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Địa điểm</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedTicket.locationText || 'Không có địa điểm'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Khu vực</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedTicket.areaName || 'Không có khu vực'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Danh mục hồ sơ</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedTicket.categoryName || 'Không có danh mục'}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nội dung phản ánh</p>
                      <p className="mt-3 rounded-3xl border border-base-200 bg-base-200/70 p-5 text-sm leading-7 text-gray-700">{selectedTicket.description || selectedTicket.title || 'Không có nội dung phản ánh.'}</p>
                    </div>
                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ảnh đính kèm</p>
                        <img src={selectedTicket.attachments?.[0]} alt="Evidence" className="mt-3 w-full aspect-video object-cover rounded-[28px] border border-base-200" />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
};
