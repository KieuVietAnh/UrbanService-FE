// src/pages/management/BookingManagement.jsx
import * as Lucide from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, helper, tone = 'blue' }) => {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  }[tone];

  return (
    <div className="admin-stat-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
};

const workflowItems = [
  {
    title: 'Booking',
    description: 'Theo dõi lịch đặt dịch vụ hoặc yêu cầu xử lý có phát sinh chi phí.',
    icon: Lucide.CalendarDays,
  },
  {
    title: 'Hóa đơn',
    description: 'Tổng hợp thông tin hóa đơn, khoản phải thu và trạng thái phát hành.',
    icon: Lucide.FileText,
  },
  {
    title: 'Thanh toán',
    description: 'Kiểm tra phương thức thanh toán, trạng thái đối soát và giao dịch lỗi.',
    icon: Lucide.CreditCard,
  },
];

export const BookingManagement = () => {
  return (
    <div className="admin-page-shell space-y-6">
      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.Receipt size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="admin-hero-title">
                Quản lý booking
              </h1>
              <p className="admin-hero-description">
                Chuẩn bị khu vực quản lý booking, hóa đơn và thanh toán cho Admin.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <Lucide.Plug size={14} />
            Chờ API booking / thanh toán
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Lucide.CalendarCheck} label="Booking" value="0" helper="Chưa có dữ liệu" tone="blue" />
        <StatCard icon={Lucide.FileText} label="Hóa đơn" value="0" helper="Chờ kết nối API" tone="violet" />
        <StatCard icon={Lucide.CreditCard} label="Thanh toán" value="0" helper="Chưa có giao dịch" tone="emerald" />
        <StatCard icon={Lucide.AlertCircle} label="Cần xử lý" value="0" helper="Giao dịch lỗi/đối soát" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)] xl:col-span-2">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-950">Danh sách booking & hóa đơn</h2>
            <p className="mt-1 text-sm text-slate-500">Khu vực này sẽ hiển thị dữ liệu khi backend cung cấp endpoint booking/payment.</p>
          </div>

          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Lucide.Receipt size={28} />
            </div>
            <h3 className="mt-5 text-base font-semibold text-slate-950">Chưa có dữ liệu booking</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Hiện chưa thấy API cho booking, hóa đơn hoặc thanh toán trong shared-api. Trang này được dựng sẵn UI shell để nối dữ liệu khi backend hoàn tất.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-slate-950">Luồng quản lý dự kiến</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Các khối chính cần có khi nối API booking/payment.</p>

          <div className="mt-5 space-y-3">
            {workflowItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="admin-inset-panel p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
