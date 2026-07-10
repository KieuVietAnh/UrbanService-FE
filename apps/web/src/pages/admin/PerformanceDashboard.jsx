// src/pages/admin/PerformanceDashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { analyticsApi } from '../../services/api/analyticsApi';

const serviceCards = [
  {
    title: 'Cổng dịch vụ API',
    subtitle: 'Cổng kết nối & endpoint công khai',
    status: 'Ổn định',
    statusClass: 'bg-emerald-50 text-emerald-700',
    iconClass: 'bg-emerald-50 text-emerald-700',
    Icon: Server,
    rows: [
      { label: 'Thời gian phản hồi TB', value: '120ms', valueClass: 'text-slate-950' },
      { label: 'Tỷ lệ thành công', value: '99.98%', valueClass: 'text-emerald-700' },
      { label: 'Lưu lượng cao điểm', value: '250 req/s', valueClass: 'text-slate-950' },
    ],
  },
  {
    title: 'Mô hình AI Copilot',
    subtitle: 'Phân loại & hỗ trợ xử lý',
    status: 'Đang bật',
    statusClass: 'bg-blue-50 text-blue-700',
    iconClass: 'bg-blue-50 text-blue-700',
    Icon: Bot,
    rows: [
      { label: 'Tốc độ xử lý GPU', value: '0.8 giây/token', valueClass: 'text-slate-950' },
      { label: 'Độ chính xác NLP', value: '94.2%', valueClass: 'text-slate-950' },
      { label: 'Hàng chờ phân loại', value: '0 phiếu', valueClass: 'text-emerald-700' },
    ],
  },
  {
    title: 'Lưu trữ CSDL',
    subtitle: 'Cơ sở dữ liệu & sao lưu',
    status: 'Đủ dung lượng',
    statusClass: 'bg-amber-50 text-amber-700',
    iconClass: 'bg-amber-50 text-amber-700',
    Icon: Database,
    rows: [
      { label: 'Dữ liệu quan hệ', value: '22 bảng', valueClass: 'text-slate-950' },
      { label: 'Sao lưu gần nhất', value: '1 giờ trước', valueClass: 'text-slate-950' },
    ],
  },
];

const healthMetrics = [
  {
    label: 'Thời gian hoạt động API',
    value: '99.98%',
    description: 'Ổn định trong 24h gần nhất',
    progress: 99,
    Icon: ShieldCheck,
    toneClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Thời gian phản hồi',
    value: '120ms',
    description: 'Thời gian phản hồi trung bình',
    progress: 86,
    Icon: Zap,
    toneClass: 'bg-blue-50 text-blue-700',
  },
  {
    label: 'Độ chính xác AI',
    value: '94.2%',
    description: 'Độ chính xác phân loại NLP',
    progress: 94,
    Icon: Cpu,
    toneClass: 'bg-blue-50 text-blue-700',
  },
];

const StatCard = ({ label, value, description, icon: Icon, toneClass }) => (
  <div className="admin-stat-card p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

export const PerformanceDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await analyticsApi.getSystemDashboardStats();
        setStats(res);
      } catch (err) {
        console.error(err);
        setError('Không thể tải đầy đủ dữ liệu hiệu năng hệ thống. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const storageUsage = stats?.storageUsage || 'Chưa có dữ liệu';
  const summaryCards = useMemo(() => ([
    {
      label: 'Trạng thái API',
      value: 'Ổn định',
      description: 'Endpoint phản hồi bình thường.',
      icon: Server,
      toneClass: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'AI Copilot',
      value: 'Đang bật',
      description: 'Sẵn sàng phân loại phản ánh.',
      icon: Bot,
      toneClass: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Dung lượng',
      value: storageUsage,
      description: 'Mức sử dụng lưu trữ hiện tại.',
      icon: HardDrive,
      toneClass: 'bg-amber-50 text-amber-700',
    },
  ]), [storageUsage]);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-blue-700" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Đang tải dữ liệu hiệu năng</p>
          <p className="mt-1 text-xs text-slate-400">Đồng bộ trạng thái API, AI và cơ sở dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-shell space-y-6">
      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Activity className="h-[22px] w-[22px]" />
            </div>
            <div className="min-w-0">
              <h2 className="admin-hero-title">
                Hiệu năng &amp; trạng thái hệ thống
              </h2>
              <p className="admin-hero-description">
                Theo dõi sức khỏe hạ tầng, thời gian đáp ứng API, trạng thái AI Copilot và dung lượng lưu trữ của UrbanMind.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700">Tổng quan hệ thống</p>
            <div className="mt-1 flex items-center gap-2 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.12)]" />
              <span className="text-sm font-semibold text-slate-950">Đang vận hành</span>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-600">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {healthMetrics.map(({ label, value, description, progress, Icon, toneClass }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-50">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="admin-panel p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Trạng thái dịch vụ nền</h3>
            <p className="mt-1 text-sm text-slate-500">
              Tổng hợp các thành phần chính đang phục vụ quá trình tiếp nhận và xử lý phản ánh.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            <RefreshCw size={14} />
            Cập nhật tự động
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {serviceCards.map(({ title, subtitle, status, statusClass, iconClass, Icon, rows }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-semibold text-slate-950">{title}</h4>
                    <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                  {status}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {title === 'Lưu trữ CSDL' && (
                  <div className="rounded-2xl bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400">Dung lượng sử dụng</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{storageUsage}</p>
                      </div>
                      <HardDrive className="h-6 w-6 text-amber-700" />
                    </div>
                  </div>
                )}

                {rows.map(({ label, value, valueClass }) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50/80 px-3 py-2.5 text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className={`font-semibold ${valueClass}`}>{value}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
