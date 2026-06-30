// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { analyticsApi } from '../../services/api/analyticsApi';
import { toolsApi } from '@urbanmind/shared-api';
import { SentimentDonutChart, SLAPerformanceChart, CategoryVolumeBarChart } from '../../components/charts/CustomCharts';
import * as Lucide from 'lucide-react';
import PageTransition from '../../components/motion/PageTransition';
import MotionCard from '../../components/motion/MotionCard';
import OnboardingEmpty from '../../components/onboarding/OnboardingEmpty';
import CelebrationBadge from '../../components/delight/CelebrationBadge';
import { normalizeRole } from '../../utils/roleMap';
import { managementTypes } from '@urbanmind/shared-types';
import { signalrService } from '../../services/socket/signalrService';

export const Dashboard = () => {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadDashboardContent = async () => {
      setLoading(true);
      try {
        const [resStats, fetchedCategories] = await Promise.all([
          analyticsApi.getSystemDashboardStats(currentRole),
          toolsApi.getCategories().catch(() => []),
        ]);
        setStats(resStats);
        setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);

        let resTickets = [];
        if (currentRole === 'service-user') {
          resTickets = await ticketApi.getTickets({ userId: user.userId }, { role: currentRole });
        } else if (currentRole === 'service-provider') {
          resTickets = await ticketApi.getTickets({ operatorId: user.operatorId }, { role: currentRole });
        } else {
          resTickets = await ticketApi.getTickets({}, { role: currentRole });
        }

        // dashboard data loaded
        setTickets(Array.isArray(resTickets) ? resTickets : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardContent();
  }, [user, currentRole]);

  // realtime updates: refresh dashboard when tickets change
  useEffect(() => {
    if (!user) return;
    signalrService.start();
    const reload = async () => {
      try {
        const [resStats, fetchedCategories] = await Promise.all([
          analyticsApi.getSystemDashboardStats(currentRole),
          toolsApi.getCategories().catch(() => []),
        ]);
        setStats(resStats);
        setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
        let resTickets = [];
        if (currentRole === 'service-user') {
          resTickets = await ticketApi.getTickets({ userId: user.userId }, { role: currentRole });
        } else if (currentRole === 'service-provider') {
          resTickets = await ticketApi.getTickets({ operatorId: user.operatorId }, { role: currentRole });
        } else {
          resTickets = await ticketApi.getTickets({}, { role: currentRole });
        }
        setTickets(Array.isArray(resTickets) ? resTickets : []);
      } catch (e) {
        console.warn('Dashboard realtime reload failed', e);
      }
    };

    const relevantEvents = ['FeedbackStatusChanged', 'CommentAdded', 'SupportAdded', 'AssignmentCreated', 'AssignmentUpdated', 'ResolutionApproved', 'ResolutionSubmitted', 'ResolutionRejected', 'NotificationReceived'];
    relevantEvents.forEach((ev) => signalrService.on(ev, reload));

    return () => {
      relevantEvents.forEach((ev) => signalrService.off(ev, reload));
    };
  }, [user, currentRole]);

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
      case managementTypes.feedbackStatus.SUBMITTED:
        return <span className="circle-status-review">Cần review AI</span>;
      case managementTypes.feedbackStatus.AI_REVIEWED:
        return <span className="circle-status-pending">Chờ phân công</span>;
      case managementTypes.feedbackStatus.ASSIGNED:
        return <span className="circle-status-pending">Đã phân công</span>;
      case managementTypes.feedbackStatus.IN_PROGRESS:
        return <span className="circle-status-pending">Đang xử lý</span>;
      case managementTypes.feedbackStatus.RESOLVED:
        return <span className="circle-status-review">Chờ duyệt KQ</span>;
      case managementTypes.feedbackStatus.CLOSED:
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

  const getCategoryName = (categoryId) => {
    return categories.find((category) => category.categoryId === categoryId)?.categoryName || 'Khác';
  };

  const residentTickets = Array.isArray(tickets) ? tickets : [];
  const residentOpenTickets = residentTickets.filter((t) => ![managementTypes.feedbackStatus.RESOLVED, managementTypes.feedbackStatus.CLOSED].includes(t.status)).length;
  const residentInProgress = residentTickets.filter((t) => [managementTypes.feedbackStatus.ASSIGNED, managementTypes.feedbackStatus.IN_PROGRESS].includes(t.status)).length;
  const residentResolved = residentTickets.filter((t) => [managementTypes.feedbackStatus.RESOLVED, managementTypes.feedbackStatus.CLOSED].includes(t.status)).length;
  const residentReportedThisMonth = residentTickets.filter((t) => {
    const created = new Date(t.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const nearbyIncidents = residentTickets
    .filter((t) => t.locationText)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const neighborhoodTopCategories = Array.isArray(stats?.categoryDistribution)
    ? stats.categoryDistribution.slice(0, 3)
    : [];

  // ----------------------------------------------------
  // 1. RESIDENT DASHBOARD LAYOUT (Figma: Trang chủ Người dân.png)
  // ----------------------------------------------------
  if (currentRole === 'service-user') {
    return (
      <PageTransition>
      <div className="page-container space-y-8 text-slate-800">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-4">
                <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-blue-700">
                  Dashboard Cư dân
                </div>
                <div className="space-y-3">
                    <h2 className="heading-1">Chào, {user?.fullName || 'Bạn'}!</h2>
                  <p className="lead max-w-2xl">
                    Theo dõi tiến trình phản ánh, xem hoạt động cộng đồng và nắm bắt niềm tin vào dịch vụ đô thị một cách trực quan.
                  </p>
                </div>
                {residentReportedThisMonth >= 3 && (
                  <div className="mt-3">
                    <CelebrationBadge title="Người đóng góp tích cực" subtitle={`Bạn đã gửi ${residentReportedThisMonth} báo cáo tháng này`} />
                  </div>
                )}
              </div>

                {residentTickets.length === 0 ? (
                  <OnboardingEmpty />
                ) : (
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Số báo cáo của bạn</p>
                <p className="mt-3 metric-number">{residentTickets.length}</p>
                <p className="mt-2 metric-label">{residentReportedThisMonth} báo cáo trong tháng</p>
              </div>
                )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Mở</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{residentOpenTickets}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">Đang chờ giải quyết</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Đang xử lý</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{residentInProgress}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">Đơn vị đang xử lý</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Hoàn thành</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{residentResolved}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">Kết quả đã đóng</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tốc độ xử lý</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{stats.processingRate}%</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">Mức độ hoàn thành toàn thành phố</p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Niềm tin dịch vụ</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{stats.csatScore}/5</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Chỉ số hài lòng cư dân</p>
                </div>
                <div className="rounded-3xl bg-emerald-50 px-4 py-3 text-emerald-700">
                  <Lucide.ThumbsUp size={24} />
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${Math.min(stats.csatScore * 20, 100)}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <Lucide.Clock3 size={14} className="text-slate-400" />
                  Trung bình {stats.avgResolutionTimeHours} giờ xử lý
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <Lucide.Server size={14} className="text-slate-400" />
                  API: {stats.apiStatus}
                </span>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="heading-3">Thông báo</h3>
                    <p className="text-xs muted">Cập nhật mới nhất để bạn luôn nắm được.</p>
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Mới</span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sự cố hạ tầng</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">Cải tạo vỉa hè gần chợ Phú Nhuận</p>
                  <p className="mt-1 text-xs text-slate-500">Dự kiến hoàn thành trong 2 ngày.</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Chỉ số cộng đồng</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">Khối lượng phản ánh giảm 8%/tuần</p>
                  <p className="mt-1 text-xs text-slate-500">Thể hiện khả năng phối hợp dịch vụ tốt hơn.</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Tin tức</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">Chương trình bảo trì đèn đường sắp diễn ra</p>
                  <p className="mt-1 text-xs text-slate-500">Cập nhật lịch và khu vực thi công.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Hoạt động cộng đồng</h3>
                  <p className="text-xs font-semibold text-slate-500">Những vấn đề nổi bật tại khu vực chung.</p>
                </div>
                <Lucide.Activity size={20} className="text-slate-400" />
              </div>
              <div className="mt-5 space-y-4">
                  {neighborhoodTopCategories.length > 0 ? (
                  neighborhoodTopCategories.map((category, idx) => (
                    <MotionCard key={category.categoryId} index={idx} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            {renderCategoryIcon(category.categoryId)}
                          </span>
                          <div>
                            <p className="text-sm font-black text-slate-950">{category.categoryName}</p>
                            <p className="text-xs font-semibold text-slate-500">{category.count} phản ánh</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                          Ưu tiên
                        </span>
                      </div>
                    </MotionCard>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                    Dữ liệu hoạt động cộng đồng đang được cập nhật.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-950">Báo cáo của bạn</h3>
            <p className="mt-2 text-xs font-semibold text-slate-500">Trạng thái hiện tại của các phản ánh bạn đã gửi.</p>
            <div className="mt-5 grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Chờ xử lý</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{residentOpenTickets}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Đang xử lý</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{residentInProgress}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Đã giải quyết</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{residentResolved}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">Sức khỏe đô thị</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Chỉ số tổng quan phản ánh thành phố.</p>
              </div>
              <Lucide.ShieldCheck size={20} className="text-emerald-500" />
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Vi phạm SLA</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{stats.slaBreaches}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Độ ổn định API</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{stats.apiStatus}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Trạng thái AI</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{stats.aiStatus}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">Sự cố gần bạn</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Các phản ánh gần đây được ghi nhận tại địa chỉ của bạn.</p>
              </div>
              <Lucide.MapPin size={20} className="text-slate-400" />
            </div>
            <div className="mt-5 space-y-4">
              {nearbyIncidents.length > 0 ? (
                nearbyIncidents.map((incident) => (
                  <div key={incident.feedbackId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950 truncate">{incident.title}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">{incident.locationText || 'Địa chỉ chưa rõ'}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                        {renderCategoryIcon(incident.categoryId)}
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-500">{renderStatusBadge(incident.status)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Chưa có sự cố địa phương có địa chỉ rõ ràng.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <CategoryVolumeBarChart data={stats.categoryDistribution} />
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <SentimentDonutChart
              positive={stats.sentimentTrend.Positive}
              neutral={stats.sentimentTrend.Neutral}
              negative={stats.sentimentTrend.Negative}
            />
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">Hiệu năng SLA</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Nhìn nhanh tiến độ xử lý theo tuần.</p>
              </div>
              <Lucide.Clock3 size={20} className="text-slate-400" />
            </div>
            <div className="mt-5">
              <SLAPerformanceChart />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-950">Phản ánh gần đây</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Xem lại các báo cáo mới nhất của bạn.</p>
              </div>
              <Link to="/tickets" className="text-xs font-black text-blue-700 hover:underline flex items-center gap-1">
                Xem tất cả
                <Lucide.ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-black uppercase tracking-[0.18em]">
                    <th className="py-3">Mã</th>
                    <th className="py-3">Nội dung</th>
                    <th className="py-3">Trạng thái</th>
                    <th className="py-3">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {residentTickets.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400 font-bold">Bạn chưa có phản ánh gần đây.</td>
                    </tr>
                  ) : (
                    residentTickets.slice(0, 4).map((ticket) => (
                      <tr key={ticket.feedbackId} className="hover:bg-slate-50/70">
                        <td className="py-3.5 font-black text-blue-700">{formatTicketId(ticket.feedbackId)}</td>
                        <td className="py-3.5 font-semibold text-slate-700 truncate max-w-[220px]">{ticket.title}</td>
                        <td className="py-3.5">{renderStatusBadge(ticket.status)}</td>
                        <td className="py-3.5 font-semibold text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-700">
                <Lucide.Lightbulb size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">Tiện ích & Hỗ trợ</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Những gợi ý giúp bạn gửi phản ánh hiệu quả hơn.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-black">Định vị thông minh</p>
                <p className="mt-2 text-xs text-slate-500">Khai báo vị trí chính xác để đội ngũ xử lý đến nhanh hơn.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-black">Ảnh minh họa</p>
                <p className="mt-2 text-xs text-slate-500">Chụp nhiều góc, đặc biệt là cả cảnh chung quanh để xác định phạm vi sự cố.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-black">Đánh giá kết quả</p>
                <p className="mt-2 text-xs text-slate-500">Sau khi sự cố đóng, hãy cho biết chất lượng xử lý để cải thiện dịch vụ.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
    );
  }

  // ----------------------------------------------------
  // 2. SYSTEM STAFF DASHBOARD (Figma: Không gian làm việc - Nhân viên.png)
  // ----------------------------------------------------
  if (currentRole=== 'system-staff') {
    return (
      <div className="page-container space-y-6 text-slate-800">
        
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
              <button className="btn btn-sm bg-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-dark)] text-white border-none rounded-xl text-xs font-bold h-9 min-h-0">
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
                    <td className="font-bold text-[color:var(--brand-primary)] py-3.5">{formatTicketId(t.feedbackId)}</td>
                    <td className="max-w-[200px] font-semibold py-3.5 text-slate-700">
                      <div className="truncate">{t.title}</div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        {renderCategoryIcon(t.categoryId)}
                        <span>{getCategoryName(t.categoryId)}</span>
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
                      {t.status === managementTypes.feedbackStatus.SUBMITTED ? (
                        <Link to="/staff/queue" className="text-[color:var(--brand-primary)] hover:underline font-bold">Chi tiết</Link>
                      ) : t.status === managementTypes.feedbackStatus.RESOLVED ? (
                        <Link to="/staff/review" className="text-[color:var(--brand-primary)] hover:underline font-bold">Chi tiết</Link>
                      ) : (
                        <Link to={`/tickets/${t.feedbackId}`} className="text-[color:var(--brand-primary)] hover:underline font-bold">Chi tiết</Link>
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
  if (currentRole === 'service-provider') {
    const activeStatuses = [managementTypes.feedbackStatus.ASSIGNED, managementTypes.feedbackStatus.IN_PROGRESS];
    const waitingStatuses = [managementTypes.feedbackStatus.ASSIGNED];
    const inProgressStatuses = [managementTypes.feedbackStatus.IN_PROGRESS];
    const reviewStatuses = [managementTypes.feedbackStatus.RESOLVED];

    const assigned = tickets.filter(t => activeStatuses.includes(t.status));
    const waitingTasks = tickets.filter(t => waitingStatuses.includes(t.status));
    const inProgressTasks = tickets.filter(t => inProgressStatuses.includes(t.status));
    const reviewTasks = tickets.filter(t => reviewStatuses.includes(t.status));
    const visibleTasks = [...assigned, ...reviewTasks].slice(0, 5);

    const getOperatorStatusLabel = status => {
      switch (status) {
        case managementTypes.feedbackStatus.ASSIGNED:
          return 'Chờ tiếp nhận';
        case managementTypes.feedbackStatus.IN_PROGRESS:
          return 'Đang xử lý';
        case managementTypes.feedbackStatus.RESOLVED:
          return 'Chờ nghiệm thu';
        case managementTypes.feedbackStatus.CLOSED:
          return 'Hoàn tất';
        default:
          return 'Chờ xử lý';
      }
    };

    const getCategoryName = categoryId => {
      return categories.find(c => c.categoryId === categoryId)?.categoryName || 'Chưa phân loại';
    };

    const operatorStats = [
      {
        label: 'Tổng nhiệm vụ',
        value: tickets.length,
        helper: 'Phiếu được gán cho đơn vị',
        icon: Lucide.ClipboardList,
        iconClassName: 'bg-primary/10 text-primary',
      },
      {
        label: 'Chờ tiếp nhận',
        value: waitingTasks.length,
        helper: 'Cần xác nhận xử lý',
        icon: Lucide.BellRing,
        iconClassName: 'bg-warning/10 text-warning',
      },
      {
        label: 'Đang xử lý',
        value: inProgressTasks.length,
        helper: 'Đã nhận và đang thực hiện',
        icon: Lucide.Wrench,
        iconClassName: 'bg-info/10 text-info',
      },
      {
        label: 'Chờ nghiệm thu',
        value: reviewTasks.length,
        helper: 'Đã báo hoàn thành',
        icon: Lucide.CheckCircle2,
        iconClassName: 'bg-success/10 text-success',
      },
    ];

    const workflowSteps = [
      {
        title: 'Tiếp nhận',
        description: 'Xác nhận nhiệm vụ được giao.',
        icon: Lucide.Handshake,
      },
      {
        title: 'Di chuyển',
        description: 'Cập nhật trạng thái tới hiện trường.',
        icon: Lucide.Route,
      },
      {
        title: 'Xử lý',
        description: 'Thực hiện sửa chữa và ghi nhận tiến độ.',
        icon: Lucide.Wrench,
      },
      {
        title: 'Báo hoàn thành',
        description: 'Gửi ghi chú và ảnh nghiệm thu.',
        icon: Lucide.Camera,
      },
    ];

    return (
      <div className="page-container space-y-6 text-base-content">
        <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                  <Lucide.HardHat size={14} />
                  Trung tâm xử lý
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                    Bảng điều hành đơn vị xử lý
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                    Theo dõi nhiệm vụ được giao, cập nhật tiến độ hiện trường và gửi kết quả hoàn thành cho hệ thống UrbanMind.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-base-content/40">
                    Trạng thái
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Sẵn sàng nhận việc
                  </div>
                </div>

                <Link
                  to="/provider/tasks"
                  className="btn btn-primary rounded-2xl px-5 text-xs font-black shadow-lg shadow-primary/20"
                >
                  <Lucide.ArrowRight size={17} />
                  Mở nhiệm vụ được giao
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {operatorStats.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-base-content/40">
                      {item.label}
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-base-content">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-base-content/50">
                      {item.helper}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ${item.iconClassName}`}>
                    <Icon size={20} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
          <div className="rounded-[1.75rem] border border-base-300 bg-base-100 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-base-300 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-base-content">Nhiệm vụ ưu tiên</h3>
                <p className="mt-1 text-sm font-medium text-base-content/55">
                  Các phiếu đang cần đơn vị cập nhật tiến độ hoặc báo hoàn thành.
                </p>
              </div>
              <Link to="/provider/tasks" className="btn btn-outline btn-sm rounded-xl text-xs font-black">
                Xem tất cả
                <Lucide.ArrowRight size={14} />
              </Link>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-success/10 text-success">
                  <Lucide.CheckCircle2 size={28} />
                </div>
                <h4 className="mt-5 text-lg font-black text-base-content">Chưa có nhiệm vụ cần xử lý</h4>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-base-content/55">
                  Khi hệ thống phân công phản ánh cho đơn vị, danh sách nhiệm vụ sẽ xuất hiện tại đây. Bạn vẫn có thể mở màn nhiệm vụ để kiểm tra chi tiết.
                </p>
                <Link to="/provider/tasks" className="btn btn-primary mt-5 rounded-2xl px-5 text-xs font-black">
                  <Lucide.ClipboardList size={16} />
                  Mở nhiệm vụ được giao
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-base-300">
                {visibleTasks.map(task => (
                  <button
                    key={task.feedbackId}
                    type="button"
                    onClick={() => navigate('/provider/tasks')}
                    className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-base-200/70 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        {renderCategoryIcon(task.categoryId)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-primary">{formatTicketId(task.feedbackId)}</span>
                          <span className="rounded-full border border-base-300 px-2.5 py-1 text-[11px] font-black text-base-content/60">
                            {getCategoryName(task.categoryId)}
                          </span>
                        </div>
                        <h4 className="mt-2 truncate text-sm font-black text-base-content">{task.title}</h4>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-base-content/45">
                          <Lucide.MapPin size={13} />
                          {task.locationText || 'Chưa có địa chỉ chi tiết'}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-[11px] font-black text-primary">
                        {getOperatorStatusLabel(task.status)}
                      </span>
                      <Lucide.ChevronRight size={18} className="text-base-content/35" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-base-content">Quy trình xử lý</h3>
                  <p className="mt-1 text-sm font-medium text-base-content/55">Các bước cập nhật trạng thái tại hiện trường.</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Lucide.Workflow size={20} />
                </div>
              </div>

              <div className="space-y-3">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-base-200 text-primary">
                        <Icon size={17} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-base-content">
                          {index + 1}. {step.title}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-base-content/55">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-warning/20 bg-warning/10 p-5 text-warning-content shadow-sm">
              <div className="flex items-start gap-3">
                <Lucide.AlertTriangle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-black">Lưu ý vận hành</h4>
                  <p className="mt-1 text-sm font-semibold leading-6 opacity-80">
                    Khi hoàn thành xử lý, hãy gửi mô tả kết quả và ảnh nghiệm thu để bộ phận kiểm duyệt xác nhận trước khi đóng phản ánh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ----------------------------------------------------
  // 4. INTERACTION MANAGER DASHBOARD (interaction-manager)
  // ----------------------------------------------------
  if (currentRole === 'interaction-manager') {
    return (
      <div className="space-y-6 text-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Giám sát tương tác đô thị</h2>
          <p className="text-xs text-gray-500 font-semibold">Theo dõi sắc thái ý kiến người dân, khối lượng bình luận trực tuyến và hiệu năng giải quyết.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
            <span className="text-xl font-black text-[color:var(--brand-primary)]">{stats.csatScore}/5</span>
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
  if (currentRole === 'administrator') {
    const storageUsageValue = stats.storageUsage?.split(' ')[0] || '0';
    const adminTickets = Array.isArray(tickets) ? tickets : [];
    const recentTickets = adminTickets.slice(0, 4);
    const openFeedbackCount = adminTickets.filter((ticket) => ![managementTypes.feedbackStatus.RESOLVED, managementTypes.feedbackStatus.CLOSED].includes(ticket.status)).length;
    const adminMetrics = [
      {
        label: 'Tài khoản',
        value: stats.totalUsers || 0,
        helper: 'Người dùng toàn hệ thống',
        icon: Lucide.Users,
        tone: 'bg-blue-50 text-blue-700 border-blue-100',
        to: '/management/users',
      },
      {
        label: 'Feedback đang mở',
        value: openFeedbackCount,
        helper: 'Cần theo dõi xử lý',
        icon: Lucide.MessageSquare,
        tone: 'bg-amber-50 text-amber-700 border-amber-100',
        to: '/management/feedbacks',
      },
      {
        label: 'Booking / hóa đơn',
        value: 0,
        helper: 'Chờ kết nối dữ liệu',
        icon: Lucide.Receipt,
        tone: 'bg-violet-50 text-violet-700 border-violet-100',
        to: '/management/bookings',
      },
      {
        label: 'Dung lượng DB',
        value: `${storageUsageValue} KB`,
        helper: 'Theo thống kê hệ thống',
        icon: Lucide.Database,
        tone: 'bg-cyan-50 text-cyan-700 border-cyan-100',
        to: '/admin/performance',
      },
    ];

    const adminQuickLinks = [
      {
        title: 'Quản lý người dùng',
        description: 'Theo dõi tài khoản, trạng thái và vai trò truy cập.',
        to: '/management/users',
        icon: Lucide.Users,
      },
      {
        title: 'Quản lý feedback',
        description: 'Giám sát phản ánh, trạng thái và tiến độ xử lý.',
        to: '/management/feedbacks',
        icon: Lucide.MessageSquare,
      },
      {
        title: 'Quản lý booking',
        description: 'Chuẩn bị luồng hóa đơn, thanh toán và booking.',
        to: '/management/bookings',
        icon: Lucide.Receipt,
      },
      {
        title: 'Nhật ký hệ thống',
        description: 'Theo dõi lịch sử thao tác và sự kiện quan trọng.',
        to: '/admin/audit',
        icon: Lucide.FileClock,
      },
    ];

    const integrations = [
      { name: 'Zalo Mini App API', status: 'Đã kết nối', icon: Lucide.Radio },
      { name: 'Messenger Webhook', status: 'Đã kết nối', icon: Lucide.CheckCircle2 },
      { name: 'Tổng đài hotline', status: 'Đang bật', icon: Lucide.PhoneCall },
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
                Trung tâm quản trị
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
                  Vận hành
                </div>
                <div className="mt-2 text-sm font-black">Hiệu năng & Nhật ký</div>
              </Link>
              <Link
                to="/management/users"
                className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-blue-500">
                  <Lucide.KeyRound size={14} />
                  Tài khoản
                </div>
                <div className="mt-2 text-sm font-black">Quản lý người dùng</div>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {adminMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <Link key={metric.label} to={metric.to} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${metric.tone}`}>
                    <Icon size={20} />
                  </div>
                  <Lucide.ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-blue-600" />
                </div>
                <div className="mt-5 space-y-1">
                  <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
                  <p className="text-2xl font-semibold text-slate-950">{metric.value}</p>
                  <p className="text-xs font-medium text-slate-400">{metric.helper}</p>
                </div>
              </Link>
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
              <Link to="/management/feedbacks" className="inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:underline">
                Quản lý feedback
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
                              {getCategoryName(ticket.categoryId)}
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
                    Theo dõi feedback, booking và nhật ký hệ thống sau mỗi phiên cấu hình để tránh lệch luồng vận hành.
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
