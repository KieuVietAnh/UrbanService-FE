// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { analyticsApi } from '../../services/api/analyticsApi';
import { toolsApi } from '@urbanmind/shared-api';
import { SentimentDonutChart, SLAPerformanceChart } from '../../components/charts/CustomCharts';
import * as Lucide from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadDashboardContent = async () => {
      setLoading(true);
      try {
        const resStats = await analyticsApi.getSystemDashboardStats();
        setStats(resStats);

        let resTickets = [];
        if (user.role === 'service-user') {
          resTickets = await ticketApi.getTickets({ userId: user.userId }, { role: user.role });
        } else if (user.role === 'service-provider') {
          resTickets = await ticketApi.getTickets({ operatorId: user.operatorId }, { role: user.role });
        } else {
          resTickets = await ticketApi.getTickets({}, { role: user.role });
        }

        console.log('Dashboard ticket fetch response', resTickets);
        setTickets(Array.isArray(resTickets) ? resTickets : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardContent();
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-20 bg-white rounded-3xl border border-slate-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Convert ticket priority string to Figma priority badge
  const renderPriorityBadge = (p) => {
    switch (p) {
      case 'Critical':
        return <span className="badge-priority-critical">KHẨN CẤP</span>;
      case 'High':
        return <span className="badge-priority-high">CAO</span>;
      case 'Medium':
        return <span className="badge-priority-medium">TRUNG BÌNH</span>;
      case 'Low':
        return <span className="badge-priority-low">THẤP</span>;
      default:
        return <span className="badge-priority-low">TRUNG BÌNH</span>;
    }
  };

  // Convert ticket status to Figma status bubble
  const renderStatusBadge = (s) => {
    switch (s) {
      case 'Submitted':
        return <span className="circle-status-review">Cần review AI</span>;
      case 'AI Reviewed':
        return <span className="circle-status-pending">Chờ phân công</span>;
      case 'Assigned':
        return <span className="circle-status-pending">Đã phân công</span>;
      case 'InProgress':
        return <span className="circle-status-pending">Đang xử lý</span>;
      case 'Resolved':
        return <span className="circle-status-review">Chờ duyệt KQ</span>;
      case 'Closed':
        return <span className="circle-status-pending">Đã đóng</span>;
      default:
        return <span className="circle-status-pending">Chờ xử lý</span>;
    }
  };

  // Icon mapping helper
  const renderCategoryIcon = (catId) => {
    switch (catId) {
      case 1: return <Lucide.Trash className="text-emerald-500 shrink-0" size={14} />;
      case 2: return <Lucide.Lightbulb className="text-amber-500 shrink-0" size={14} />;
      case 3: return <Lucide.Droplet className="text-blue-500 shrink-0" size={14} />;
      case 4: return <Lucide.Construction className="text-indigo-500 shrink-0" size={14} />;
      case 5: return <Lucide.Trees className="text-green-500 shrink-0" size={14} />;
      default: return <Lucide.Construction className="text-slate-500 shrink-0" size={14} />;
    }
  };

  // Convert default fb- ticket ID to UM-2026-00xxx
  const formatTicketId = (fbId) => {
    if (!fbId) return '';
    const num = fbId.split('-').pop();
    return `UM-2026-00${num}`;
  };

  // ----------------------------------------------------
  // 1. RESIDENT DASHBOARD LAYOUT (Figma: Trang chủ Người dân.png)
  // ----------------------------------------------------
  if (user.role === 'service-user') {
    return (
      <div className="space-y-8 text-slate-800">
        
        {/* Welcome Section & Weather widget */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Chào, {user?.fullName || 'Bạn'}!</h2>
            <p className="text-xs font-semibold text-slate-500">Cùng chung tay xây dựng đô thị thông minh và bền vững ngày hôm nay.</p>
          </div>
          <div className="btn btn-xs rounded-xl font-bold bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex gap-2 items-center py-2 px-3 h-auto hover:bg-[#EFF6FF]">
            <Lucide.Sun size={14} className="text-[#d97706]" />
            <span>TP.HCM: 28°C • Nắng nhẹ</span>
          </div>
        </div>

        {/* 4 Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Create */}
          <Link 
            to="/tickets/create" 
            className="card bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left space-y-4 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lucide.Plus size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-slate-900">Gửi phản ánh mới</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Báo cáo vấn đề hạ tầng, vệ sinh môi trường.
              </p>
            </div>
          </Link>

          {/* Card 2: Track */}
          <Link 
            to="/tickets" 
            className="card bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left space-y-4 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lucide.RefreshCw size={18} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-slate-900">Theo dõi tiến trình</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Cập nhật trạng thái các báo cáo của bạn.
              </p>
            </div>
          </Link>

          {/* Card 3: News */}
          <Link 
            to="/community/feed" 
            className="card bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left space-y-4 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lucide.Calendar size={18} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-slate-900">Tin tức khu vực</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Thông tin quy hoạch và sự kiện cộng đồng.
              </p>
            </div>
          </Link>

          {/* Card 4: Reports */}
          <Link 
            to="/community/map" 
            className="card bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left space-y-4 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lucide.BarChart3 size={18} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-slate-900">Báo cáo thống kê</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Phân tích dữ liệu đô thị minh bạch.
              </p>
            </div>
          </Link>
        </div>

        {/* Phản ánh gần đây Section */}
        <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-900">Phản ánh gần đây</h3>
            <Link to="/tickets" className="text-xs font-bold text-[#0052CC] hover:underline flex items-center gap-1">
              Xem tất cả
              <Lucide.ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto w-full text-xs">
            <table className="table w-full">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <th className="py-3">MÃ PHẢN ÁNH</th>
                  <th className="py-3">NỘI DUNG</th>
                  <th className="py-3">LOẠI VẤN ĐỀ</th>
                  <th className="py-3">TRẠNG THÁI</th>
                  <th className="py-3">NGÀY GỬI</th>
                  <th className="py-3 text-right">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400 font-bold">Bạn chưa gửi phản ánh nào</td>
                  </tr>
                ) : (
                  (Array.isArray(tickets) ? tickets.slice(0, 3) : []).map((t) => (
                    <tr key={t.feedbackId} className="hover:bg-slate-50/50">
                      <td className="font-bold text-[#0052CC] py-3.5">{formatTicketId(t.feedbackId)}</td>
                      <td className="max-w-[240px] font-semibold py-3.5 text-slate-700 truncate">
                        {t.title}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          {renderCategoryIcon(t.categoryId)}
                          <span>{toolsApi.getCategories().find(c => c.categoryId === t.categoryId)?.categoryName}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        {renderStatusBadge(t.status)}
                      </td>
                      <td className="font-bold text-slate-400 py-3.5">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-right py-3.5">
                        <button
                          onClick={() => navigate(`/tickets/${t.feedbackId}`)}
                          className="btn btn-ghost btn-circle btn-xs text-[#0052CC]"
                          title="Xem chi tiết"
                        >
                          <Lucide.Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Map preview card (2 cols) */}
          <div className="lg:col-span-2 card bg-white border border-slate-200 overflow-hidden rounded-3xl shadow-sm relative h-64 flex flex-col justify-end">
            <div className="absolute inset-0 bg-[#E0F2FE] flex items-center justify-center overflow-hidden">
              {/* Custom SVG mockup map of Saigon River / road network */}
              <svg className="w-full h-full opacity-60" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* River */}
                <path d="M-50,150 Q150,80 300,180 T650,140" stroke="#93C5FD" strokeWidth="60" fill="none" strokeLinecap="round" />
                <path d="M-50,150 Q150,80 300,180 T650,140" stroke="#60A5FA" strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.3" />
                {/* Grid roads */}
                <line x1="50" y1="-10" x2="50" y2="310" stroke="#ffffff" strokeWidth="6" />
                <line x1="180" y1="-10" x2="180" y2="310" stroke="#ffffff" strokeWidth="6" />
                <line x1="380" y1="-10" x2="380" y2="310" stroke="#ffffff" strokeWidth="6" />
                <line x1="520" y1="-10" x2="520" y2="310" stroke="#ffffff" strokeWidth="6" />
                
                <line x1="-10" y1="80" x2="610" y2="80" stroke="#ffffff" strokeWidth="6" />
                <line x1="-10" y1="220" x2="610" y2="220" stroke="#ffffff" strokeWidth="6" />
                
                {/* Diagonal roads */}
                <line x1="-10" y1="300" x2="400" y2="-10" stroke="#ffffff" strokeWidth="4" />
                <line x1="200" y1="310" x2="610" y2="50" stroke="#ffffff" strokeWidth="4" />
                
                {/* Some buildings mock */}
                <rect x="80" y="20" width="40" height="30" rx="3" fill="#cbd5e1" />
                <rect x="230" y="30" width="50" height="40" rx="4" fill="#94a3b8" />
                <rect x="420" y="100" width="35" height="50" rx="3" fill="#cbd5e1" />
                <rect x="100" y="240" width="60" height="30" rx="4" fill="#cbd5e1" />
                <rect x="440" y="230" width="50" height="40" rx="4" fill="#94a3b8" />

                {/* Map Pins */}
                <circle cx="120" cy="110" r="8" fill="#EF4444" />
                <circle cx="120" cy="110" r="14" stroke="#EF4444" strokeWidth="2" strokeDasharray="3 3" />
                
                <circle cx="410" cy="240" r="8" fill="#3B82F6" />
                <circle cx="410" cy="240" r="14" stroke="#3B82F6" strokeWidth="2" strokeDasharray="3 3" />
              </svg>
            </div>
            
            {/* Overlay banner */}
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-xs text-white p-3 rounded-2xl max-w-xs space-y-1">
              <h4 className="font-extrabold text-xs">Bản đồ sự cố cộng đồng</h4>
              <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">Xem toàn cảnh các sự cố hạ tầng đô thị đang được xử lý trong khu vực của bạn.</p>
            </div>

            <div className="p-4 z-10 bg-gradient-to-t from-slate-900/60 to-transparent flex justify-start">
              <button 
                onClick={() => navigate('/community/map')}
                className="btn btn-sm bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-xl text-xs font-extrabold h-9"
              >
                <Lucide.Map size={14} />
                Xem bản đồ
              </button>
            </div>
          </div>

          {/* Right Column: "Mẹo nhỏ" guide card (1 col) */}
          <div className="lg:col-span-1 card bg-[#F8FAF8] border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-800">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-500">
                  <Lucide.Lightbulb size={18} />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">Mẹo nhỏ gửi phản ánh</h4>
              </div>
              <ul className="space-y-3 text-[11px] font-semibold text-slate-500 list-none pl-0 leading-relaxed">
                <li className="flex gap-2 items-start">
                  <Lucide.CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Cung cấp hình ảnh rõ nét và chụp cận cảnh sự cố để AI tóm tắt chính xác.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <Lucide.CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Sử dụng định vị GPS để cán bộ nhanh chóng xác định đúng vị trí thi công.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <Lucide.CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Nhập @ai vào khung chat chi tiết để được AI Copilot hướng dẫn nhanh.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <Lucide.CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Đánh giá chất lượng và CSAT sau khi sự cố hoàn thành để nâng cao SLA dịch vụ.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. SYSTEM STAFF DASHBOARD (Figma: Không gian làm việc - Nhân viên.png)
  // ----------------------------------------------------
  if (user.role === 'system-staff') {
    return (
      <div className="space-y-6 text-slate-800">
        
        {/* Header Greeting */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900">Không gian làm việc</h2>
          <p className="text-xs font-semibold text-slate-500">Xin chào, {user.fullName}. Bạn có thể kiểm tra phản ánh mới, xác nhận phân loại AI và phân công xử lý.</p>
        </div>

        {/* 5 Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Lucide.Folder size={18} />
              </div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">+12%</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">18</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Phản ánh mới</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Lucide.Cpu size={18} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Review</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">9</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Cần review AI</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-red-50 text-red-600">
                <Lucide.AlertTriangle size={18} />
              </div>
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">High</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">4</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Nghi trùng lặp</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <Lucide.UserPlus size={18} />
              </div>
              <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">Task</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">6</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Chờ phân công</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Lucide.CheckSquare size={18} />
              </div>
              <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">Approval</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">3</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Chờ duyệt KQ</span>
            </div>
          </div>
        </div>

        {/* Dynamic Data Table "Phản ánh cần xử lý" */}
        <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900">Phản ánh cần xử lý</h3>
            <div className="flex gap-2">
              <button onClick={() => navigate('/staff/queue')} className="btn btn-sm btn-outline border-slate-300 rounded-xl text-xs font-bold text-slate-600 h-9 min-h-0 flex gap-1.5 items-center">
                <Lucide.SlidersHorizontal size={14} />
                Bộ lọc
              </button>
              <button className="btn btn-sm bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-xl text-xs font-bold h-9 min-h-0">
                Xuất báo cáo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full text-xs">
            <table className="table w-full">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <th className="py-3">Mã phản ánh</th>
                  <th className="py-3">Nội dung</th>
                  <th className="py-3">Loại AI gợi ý</th>
                  <th className="py-3">Mức độ ưu tiên</th>
                  <th className="py-3">Trạng thái</th>
                  <th className="py-3">Thời gian gửi</th>
                  <th className="py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(Array.isArray(tickets) ? tickets.slice(0, 4) : []).map(t => (
                  <tr key={t.feedbackId} className="hover:bg-slate-50/50">
                    <td className="font-bold text-[#0052CC] py-3.5">{formatTicketId(t.feedbackId)}</td>
                    <td className="max-w-[200px] font-semibold py-3.5 text-slate-700">
                      <div className="truncate">{t.title}</div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        {renderCategoryIcon(t.categoryId)}
                        <span>{toolsApi.getCategories().find(c => c.categoryId === t.categoryId)?.categoryName}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      {renderPriorityBadge(t.priority)}
                    </td>
                    <td className="py-3.5">
                      {renderStatusBadge(t.status)}
                    </td>
                    <td className="font-bold text-slate-400 py-3.5">
                      {new Date(t.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}, {new Date(t.createdAt).toLocaleDateString([], {day: '2-digit', month: '2-digit'})}
                    </td>
                    <td className="text-right py-3.5">
                      {t.status === 'Submitted' ? (
                        <Link to="/staff/queue" className="text-[#0052CC] hover:underline font-bold">Chi tiết</Link>
                      ) : t.status === 'Resolved' ? (
                        <Link to="/staff/review" className="text-[#0052CC] hover:underline font-bold">Chi tiết</Link>
                      ) : (
                        <Link to={`/tickets/${t.feedbackId}`} className="text-[#0052CC] hover:underline font-bold">Chi tiết</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. SERVICE PROVIDER DASHBOARD (service-provider)
  // ----------------------------------------------------
  if (user.role === 'service-provider') {
    const assigned = tickets.filter(t => t.status === 'Assigned' || t.status === 'Accepted' || t.status === 'InProgress');
    
    return (
      <div className="space-y-6 text-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Bảng điều khiển</h2>
          <p className="text-xs text-gray-500 font-semibold">Cập nhật tiến độ thi công và hoàn thành sửa chữa hạ tầng khu vực.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
            <span className="text-2xl font-black text-[#d97706]">{assigned.length} Phiếu</span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Nhiệm vụ chưa sửa xong</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
            <span className="text-2xl font-black text-[#059669]">
              {tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length} Phiếu
            </span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Công việc hoàn thành</p>
          </div>
        </div>

        <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm border-b border-slate-200 pb-2">Danh sách công việc đang xử lý</h3>
          {assigned.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500 font-semibold">Hiện tại bạn không còn công việc sửa chữa nào bị tồn đọng.</div>
          ) : (
            <div className="space-y-3">
              {assigned.map(t => (
                <div 
                  key={t.feedbackId}
                  onClick={() => navigate('/provider/tasks')}
                  className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer transition-all duration-200 flex justify-between items-center text-xs"
                >
                  <div className="space-y-1.5 truncate max-w-[75%]">
                    <span className="text-[9px] text-[#0052CC] font-bold block">{formatTicketId(t.feedbackId)}</span>
                    <span className="font-black text-slate-900 block truncate">{t.title}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{t.locationText}</span>
                  </div>
                  <span className="badge badge-sm font-bold uppercase py-2 px-2.5 bg-amber-50 text-amber-700 border-amber-200 border">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 4. INTERACTION MANAGER DASHBOARD (interaction-manager)
  // ----------------------------------------------------
  if (user.role === 'interaction-manager') {
    return (
      <div className="space-y-6 text-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Giám sát tương tác đô thị</h2>
          <p className="text-xs text-gray-500 font-semibold">Theo dõi sắc thái ý kiến người dân, khối lượng bình luận trực tuyến và hiệu năng giải quyết.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
            <span className="text-xl font-black text-[#0052CC]">{stats.csatScore}/5</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1">CSAT hài lòng</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
            <span className="text-xl font-black text-secondary">{stats.avgResolutionTimeHours} giờ</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1">Thời gian sửa SLA</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
            <span className="text-xl font-black text-[#059669]">{stats.processingRate}%</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1">Tỷ lệ đóng hồ sơ</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
            <span className="text-xl font-black text-error">{stats.slaBreaches} Phiếu</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1">Vi phạm SLA</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SentimentDonutChart 
              positive={stats.sentimentTrend.Positive}
              neutral={stats.sentimentTrend.Neutral}
              negative={stats.sentimentTrend.Negative}
            />
          </div>
          <div className="lg:col-span-2">
            <SLAPerformanceChart />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 5. ADMINISTRATOR DASHBOARD (administrator)
  // ----------------------------------------------------
  if (user.role === 'administrator') {
    const storageUsageValue = stats.storageUsage?.split(' ')[0] || '0';
    const recentTickets = Array.isArray(tickets) ? tickets.slice(0, 4) : [];
    const adminMetrics = [
      {
        label: 'Tài khoản hoạt động',
        value: stats.totalUsers || 0,
        helper: 'Người dùng toàn hệ thống',
        icon: Lucide.Users,
        tone: 'bg-blue-50 text-blue-700 border-blue-100',
      },
      {
        label: 'API Health',
        value: '99.98%',
        helper: 'Gateway đang ổn định',
        icon: Lucide.Activity,
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      },
      {
        label: 'Dung lượng DB',
        value: `${storageUsageValue} KB`,
        helper: 'Theo thống kê hệ thống',
        icon: Lucide.Database,
        tone: 'bg-cyan-50 text-cyan-700 border-cyan-100',
      },
      {
        label: 'AI Classification',
        value: 'Active',
        helper: 'Luồng phân loại đang bật',
        icon: Lucide.Bot,
        tone: 'bg-violet-50 text-violet-700 border-violet-100',
      },
    ];

    const adminQuickLinks = [
      {
        title: 'Quản lý người dùng',
        description: 'Kiểm soát tài khoản, trạng thái và quyền truy cập.',
        to: '/management/users',
        icon: Lucide.Users,
      },
      {
        title: 'Cấu hình SLA',
        description: 'Thiết lập ngưỡng xử lý cho từng nhóm phản ánh.',
        to: '/management/sla',
        icon: Lucide.Gauge,
      },
      {
        title: 'Nhật ký hệ thống',
        description: 'Theo dõi lịch sử thao tác và sự kiện quan trọng.',
        to: '/admin/audit',
        icon: Lucide.FileClock,
      },
    ];

    const integrations = [
      { name: 'Zalo mini app API', status: 'Connected', icon: Lucide.Radio },
      { name: 'Messenger webhook', status: 'Connected', icon: Lucide.CheckCircle2 },
      { name: 'Tổng đài hotline', status: 'Active', icon: Lucide.PhoneCall },
    ];

    const categoryDistribution = Array.isArray(stats.categoryDistribution)
      ? stats.categoryDistribution.map((item, index) => ({
          id: Number(item.categoryId ?? item.id ?? index + 1),
          name: item.categoryName || item.name || item.label || `Danh mục ${index + 1}`,
          count: Number(item.count ?? item.value ?? item.total ?? 0),
        }))
      : [];
    const totalCategoryTickets = categoryDistribution.reduce((sum, item) => sum + item.count, 0);
    const maxCategoryCount = Math.max(...categoryDistribution.map(item => item.count), 1);
    const hasLowCategoryData = totalCategoryTickets > 0 && totalCategoryTickets <= 5;

    return (
      <div className="space-y-6 text-slate-800">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-32 w-32 rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-700">
                <Lucide.ShieldCheck size={14} />
                Administrator Control Center
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">
                  Tổng quan quản trị hệ thống
                </h2>
                <p className="max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Theo dõi sức khỏe nền tảng, tài nguyên máy chủ, tích hợp tiếp nhận đa kênh và dữ liệu vận hành đô thị trong một màn hình.
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
              <Link
                to="/admin/performance"
                className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-white/70">
                  <Lucide.Server size={14} />
                  Health
                </div>
                <div className="mt-2 text-sm font-black">Hiệu năng & Logs</div>
              </Link>
              <Link
                to="/management/users"
                className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-blue-500">
                  <Lucide.KeyRound size={14} />
                  Access
                </div>
                <div className="mt-2 text-sm font-black">Quản lý quyền</div>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {adminMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div key={metric.label} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${metric.tone}`}>
                    <Icon size={20} />
                  </div>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Live
                  </span>
                </div>
                <div className="mt-5 space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{metric.label}</p>
                  <p className="text-2xl font-black text-slate-950">{metric.value}</p>
                  <p className="text-xs font-semibold text-slate-500">{metric.helper}</p>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">Phân bổ phản ánh theo danh mục</h3>
                <p className="text-xs font-semibold text-slate-500">Tổng hợp khối lượng phản ánh để Admin theo dõi cấu hình danh mục.</p>
              </div>
              <Link to="/management/categories" className="inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:underline">
                Cấu hình danh mục
                <Lucide.ArrowRight size={14} />
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Tổng phản ánh</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{totalCategoryTickets}</p>
                </div>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${hasLowCategoryData ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {hasLowCategoryData ? 'Dữ liệu còn ít' : 'Đang cập nhật'}
                </span>
              </div>

              {categoryDistribution.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Lucide.BarChart3 size={22} />
                  </div>
                  <p className="mt-3 text-sm font-black text-slate-700">Chưa có dữ liệu danh mục</p>
                  <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-400">
                    Khi có phản ánh mới, hệ thống sẽ tự động tổng hợp theo từng danh mục.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryDistribution.map((category) => {
                    const percent = Math.round((category.count / maxCategoryCount) * 100);
                    const barWidth = category.count === 0 ? '0%' : `${Math.max(percent, 12)}%`;

                    return (
                      <div key={`${category.id}-${category.name}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                              {renderCategoryIcon(category.id)}
                            </div>
                            <span className="truncate text-xs font-black text-slate-800">{category.name}</span>
                          </div>
                          <span className="shrink-0 text-sm font-black text-slate-950">
                            {category.count}
                            <span className="ml-1 text-[10px] font-bold text-slate-400">phiếu</span>
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${category.count === 0 ? 'bg-transparent' : 'bg-gradient-to-r from-blue-600 to-violet-600'}`}
                            style={{ width: barWidth }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasLowCategoryData && (
                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-[11px] font-semibold leading-5 text-amber-700">
                  Dữ liệu hiện còn ít nên hệ thống ưu tiên hiển thị dạng danh sách để tránh biểu đồ bị phóng đại. Khi số lượng phản ánh tăng, phần này vẫn phản ánh đúng tỷ trọng từng danh mục.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-950">Tích hợp đa kênh</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Các kênh tiếp nhận phản ánh đang hoạt động.</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-600">
                <Lucide.CheckCircle2 size={18} />
              </div>
            </div>

            <div className="space-y-3">
              {integrations.map((integration) => {
                const Icon = integration.icon;

                return (
                  <div key={integration.name} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                        <Icon size={16} />
                      </div>
                      <span className="truncate text-xs font-black text-slate-700">{integration.name}</span>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                      {integration.status}
                    </span>
                  </div>
                );
              })}
            </div>

            <Link
              to="/management/integrations"
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Quản lý tích hợp
              <Lucide.ArrowRight size={14} />
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">Phản ánh mới nhất</h3>
                <p className="text-xs font-semibold text-slate-500">Dữ liệu tổng hợp để Admin giám sát luồng vận hành.</p>
              </div>
              <Link to="/admin/performance" className="inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:underline">
                Xem hiệu năng
                <Lucide.ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3">Mã</th>
                    <th className="py-3">Nội dung</th>
                    <th className="py-3">Danh mục</th>
                    <th className="py-3">Ưu tiên</th>
                    <th className="py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTickets.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-xs font-bold text-slate-400">
                        Chưa có dữ liệu phản ánh để hiển thị.
                      </td>
                    </tr>
                  ) : (
                    recentTickets.map((ticket) => (
                      <tr key={ticket.feedbackId} className="hover:bg-slate-50/70">
                        <td className="py-3.5 font-black text-blue-700">{formatTicketId(ticket.feedbackId)}</td>
                        <td className="max-w-[240px] py-3.5 font-bold text-slate-700">
                          <div className="truncate">{ticket.title}</div>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            {renderCategoryIcon(ticket.categoryId)}
                            <span className="truncate">
                              {toolsApi.getCategories().find(c => c.categoryId === ticket.categoryId)?.categoryName || 'Chưa phân loại'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5">{renderPriorityBadge(ticket.priority)}</td>
                        <td className="py-3.5">{renderStatusBadge(ticket.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-black text-slate-950">Lối tắt quản trị</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">Các flow Admin thường cần kiểm tra.</p>
            </div>

            <div className="space-y-3">
              {adminQuickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    to={item.to}
                    className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm group-hover:text-blue-700">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-800">{item.title}</h4>
                        <Lucide.ArrowRight size={14} className="shrink-0 text-slate-300 group-hover:text-blue-700" />
                      </div>
                      <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
              <div className="flex items-start gap-3">
                <Lucide.AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black">Gợi ý kiểm tra định kỳ</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-amber-700">
                    Xem log hệ thống và SLA sau mỗi phiên cấu hình để đảm bảo flow xử lý không bị lệch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
};
