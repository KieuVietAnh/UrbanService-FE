// src/pages/tickets/AIReviewDetail.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { managementTypes } from '@urbanmind/shared-types';
import { signalrService } from '../../services/socket/signalrService';
import { toolsApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';

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
  
  // Edit variables
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectTicket = (t) => {
    const detectedCategoryId = t?.analysisResult?.detectedCategoryId || t?.detectedCategoryId || t?.categoryId;
    setSelectedTicket(t);
    setEditCategoryId(detectedCategoryId || '');
    setEditPriority(t.priority || 'Medium');
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

  const handleApprove = async () => {
    if (!selectedTicket) return;
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
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black">Hàng Chờ Kiểm Duyệt AI</h2>
        <p className="text-xs text-gray-500 font-semibold">Đánh giá kết quả phân loại tự động của AI đối với các phản ánh mới trước khi tiến hành điều phối.</p>
      </div>

      {tickets.length === 0 ? (
        <div className="card bg-base-100 border border-base-300 p-12 text-center rounded-3xl space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Lucide.CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm">Hàng Chờ Đang Trống</h3>
            <p className="text-xs text-gray-500 font-semibold mt-1">Tất cả các phản ánh mới đã được phê duyệt và điều phối hoàn tất.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List Queue Column */}
          <div className="card bg-base-100 border border-base-300 p-4 rounded-3xl shadow-sm space-y-3 h-[600px] overflow-y-auto">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 px-2">Danh sách phản ánh mới ({tickets.length})</h4>
            <div className="space-y-2">
              {tickets.map((t) => (
                <div 
                  key={t.feedbackId}
                  onClick={() => handleSelectTicket(t)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 text-xs flex flex-col gap-1.5 ${
                    selectedTicket?.feedbackId === t.feedbackId 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-base-300 hover:bg-base-200/50'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span>{t.feedbackId}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h5 className="font-extrabold truncate text-base-content">{t.title}</h5>
                  <span className="text-[10px] font-semibold text-gray-500 line-clamp-1">{t.locationText}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Detail splitscreen Column */}
          {selectedTicket && (
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px] overflow-y-auto">
              
              {/* Content preview */}
              <div className="card bg-base-100 border border-base-300 p-6 rounded-3xl shadow-sm space-y-4 h-fit">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-400 border-b border-base-300 pb-2">Chi Tiết Sự Cố</h4>
                <div className="space-y-1.5 text-xs">
                  <span className="font-bold text-gray-500">Mã phản ánh:</span>
                  <span className="font-semibold block">{selectedTicket.feedbackId}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <span className="font-bold text-gray-500">Người báo cáo:</span>
                  <span className="font-semibold block">{selectedTicket.reporterName}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <span className="font-bold text-gray-500">Nội dung phản ánh:</span>
                  <p className="bg-base-200/50 p-3.5 rounded-xl border border-base-300 font-semibold text-gray-600 leading-relaxed italic">
                    "{selectedTicket.description}"
                  </p>
                </div>
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-gray-500">Ảnh đính kèm:</span>
                    <img src={selectedTicket.attachments?.[0]} alt="Evidence" className="w-full aspect-video object-cover rounded-2xl border border-base-300" />
                  </div>
                )}
              </div>

              {/* AI analysis panel */}
              <div className="card bg-base-100 border border-base-300 p-6 rounded-3xl shadow-sm space-y-5 h-fit">
                <div className="flex items-center gap-2 border-b border-base-300 pb-3">
                  <Lucide.Sparkles className="text-primary animate-pulse" size={20} />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-primary">Phân Tích AI Đề Xuất</h4>
                </div>

                <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-500">Tóm tắt sự cố (AI):</span>
                    <span className="badge badge-primary badge-xs py-1.5 px-2 text-[8px] font-bold uppercase">Confidence: {Math.round((selectedTicket.confidenceScore || 0) * 100)}%</span>
                  </div>
                  <p className="font-medium text-primary italic">"{selectedTicket.summary || selectedTicket.description || 'Không có tóm tắt từ AI.'}"</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold text-xs">Nhận diện Danh mục (AI gợi ý)</span>
                    </label>
                    <select 
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(Number(e.target.value))}
                      className="select select-bordered select-sm rounded-xl font-bold"
                    >
                      {categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold text-xs">Nhận diện Độ ưu tiên (AI gợi ý)</span>
                    </label>
                    <select 
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="select select-bordered select-sm rounded-xl font-bold"
                    >
                      <option value="Low">Thấp (Low)</option>
                      <option value="Medium">Trung bình (Medium)</option>
                      <option value="High">Cao (High)</option>
                      <option value="Critical">Khẩn cấp (Critical)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-base-200 p-3.5 rounded-xl border border-base-300 text-[10px] font-bold text-gray-500 space-y-1">
                  <div>Phân tích cảm xúc: <span className="text-error">{selectedTicket.sentiment || 'Unknown'}</span></div>
                  <div>Danh mục AI đề xuất: <span>{selectedTicket.detectedCategoryName || 'Chưa rõ'}</span></div>
                </div>

                <button 
                  type="button"
                  onClick={handleApprove}
                  disabled={loading}
                  className="btn btn-primary w-full rounded-xl font-bold text-xs h-11"
                >
                  {loading ? <span className="loading loading-spinner"></span> : 'Xác Nhận & Duyệt Chuyển Phân Công'}
                </button>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
