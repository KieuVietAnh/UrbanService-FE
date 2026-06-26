// src/pages/admin/PerformanceDashboard.jsx
import { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Cpu,
  Database,
  HardDrive,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { analyticsApi } from '../../services/api/analyticsApi';

const serviceCards = [
  {
    title: 'Cổng dịch vụ API',
    subtitle: 'Gateway & public endpoints',
    status: 'Healthy',
    statusClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconClass: 'bg-emerald-500/10 text-emerald-600',
    Icon: Server,
    rows: [
      { label: 'Thời gian phản hồi TB', value: '120ms', valueClass: 'text-base-content' },
      { label: 'Tỷ lệ thành công', value: '99.98%', valueClass: 'text-emerald-600' },
      { label: 'Peak request', value: '250 req/s', valueClass: 'text-base-content' },
    ],
  },
  {
    title: 'Mô hình AI Copilot',
    subtitle: 'Phân loại & hỗ trợ xử lý',
    status: 'Active',
    statusClass: 'bg-sky-100 text-sky-700 border-sky-200',
    iconClass: 'bg-sky-500/10 text-sky-600',
    Icon: Bot,
    rows: [
      { label: 'Tốc độ xử lý GPU', value: '0.8 giây/token', valueClass: 'text-base-content' },
      { label: 'Độ chính xác NLP', value: '94.2%', valueClass: 'text-base-content' },
      { label: 'Hàng chờ phân loại', value: '00 Phiếu', valueClass: 'text-emerald-600' },
    ],
  },
  {
    title: 'Lưu trữ CSDL',
    subtitle: 'Database & backup service',
    status: 'Sufficient',
    statusClass: 'bg-amber-100 text-amber-700 border-amber-200',
    iconClass: 'bg-amber-500/10 text-amber-600',
    Icon: Database,
    rows: [
      { label: 'Dữ liệu quan hệ', value: '22 Bảng', valueClass: 'text-base-content' },
      { label: 'Sao lưu gần nhất', value: '1 Giờ trước', valueClass: 'text-base-content' },
    ],
  },
];

const healthMetrics = [
  {
    label: 'API uptime',
    value: '99.98%',
    description: 'Ổn định trong 24h gần nhất',
    progress: 99,
    Icon: ShieldCheck,
  },
  {
    label: 'Response time',
    value: '120ms',
    description: 'Thời gian phản hồi trung bình',
    progress: 86,
    Icon: Zap,
  },
  {
    label: 'AI accuracy',
    value: '94.2%',
    description: 'Độ chính xác phân loại NLP',
    progress: 94,
    Icon: Cpu,
  },
];

export const PerformanceDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
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

  if (loading) {
    return (
      <div className="min-h-[360px] rounded-[2rem] border border-base-300 bg-base-100/80 p-8 shadow-sm">
        <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <div>
            <p className="text-sm font-bold text-base-content">Đang tải dữ liệu hiệu năng</p>
            <p className="text-xs font-medium text-base-content/50">Đồng bộ trạng thái API, AI và cơ sở dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  const storageUsage = stats?.storageUsage || 'Chưa có dữ liệu';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-16 h-32 w-32 rounded-full bg-info/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                <Activity className="h-3.5 w-3.5" />
                System Monitoring
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-base-content md:text-3xl">
                  Hiệu Năng &amp; Trạng Thái Hệ Thống
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Theo dõi sức khỏe hạ tầng, thời gian đáp ứng API, trạng thái AI Copilot và dung lượng lưu trữ của nền tảng UrbanMind.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-base-content/45">Tổng quan hệ thống</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                <span className="text-sm font-black text-base-content">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning-content">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {healthMetrics.map(({ label, value, description, progress, Icon }) => (
          <div key={label} className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-base-content/45">{label}</p>
                <p className="mt-2 text-3xl font-black text-base-content">{value}</p>
              </div>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-base-content/55">{description}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-base-200">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {serviceCards.map(({ title, subtitle, status, statusClass, iconClass, Icon, rows }) => (
          <div key={title} className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-base-300 pb-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-3 ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-base-content">{title}</h3>
                  <p className="text-xs font-semibold text-base-content/45">{subtitle}</p>
                </div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClass}`}>
                {status}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {title === 'Lưu trữ CSDL' && (
                <div className="rounded-2xl bg-base-200/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-base-content/50">Dung lượng sử dụng</p>
                      <p className="mt-1 text-xl font-black text-base-content">{storageUsage}</p>
                    </div>
                    <HardDrive className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              )}

              {rows.map(({ label, value, valueClass }) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-2xl bg-base-200/40 px-3 py-2.5 text-xs">
                  <span className="font-semibold text-base-content/55">{label}</span>
                  <span className={`font-black ${valueClass}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
