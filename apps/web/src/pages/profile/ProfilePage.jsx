// src/pages/profile/ProfilePage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleLabel } from '../../utils/roleMap';
import { ticketApi } from '../../services/api/ticketApi';

const ROLE_LABELS = {
  administrator: 'Quản trị viên',
  'service-user': 'Người dân',
  'system-staff': 'Nhân viên hệ thống',
  'service-provider': 'Đơn vị xử lý',
  'interaction-manager': 'Quản lý tương tác',
};

const normalizeRole = role => {
  const rawRole = String(role || '').trim();
  const normalizedRole = rawRole
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replaceAll('_', '-')
    .replaceAll(' ', '-')
    .toLowerCase();

  const roleAliases = {
    administrator: 'administrator',
    admin: 'administrator',
    serviceuser: 'service-user',
    'service-user': 'service-user',
    citizen: 'service-user',
    user: 'service-user',
    systemstaff: 'system-staff',
    'system-staff': 'system-staff',
    staff: 'system-staff',
    serviceprovider: 'service-provider',
    'service-provider': 'service-provider',
    serviceoperator: 'service-provider',
    'service-operator': 'service-provider',
    serviceoperatorstaff: 'service-provider',
    'service-operator-staff': 'service-provider',
    operator: 'service-provider',
    provider: 'service-provider',
    interactionmanager: 'interaction-manager',
    'interaction-manager': 'interaction-manager',
  };

  return roleAliases[normalizedRole] || normalizedRole;
};

const getUserInitials = value => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return 'U';

  const parts = normalizedValue.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return normalizedValue.slice(0, 2).toUpperCase();
};

const formatDate = timestamp => {
  if (!timestamp) return 'Chưa có dữ liệu';
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatMembership = timestamp => {
  if (!timestamp) return 'Chưa có dữ liệu';
  const created = new Date(timestamp).getTime();
  const now = Date.now();
  const days = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
  if (days >= 365) return `${Math.floor(days / 365)} năm`;
  if (days >= 30) return `${Math.floor(days / 30)} tháng`;
  return `${days} ngày`;
};

export const ProfilePage = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatarError, setAvatarError] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const displayName = fullName || user?.fullName || user?.email || 'Người dùng';
  const userInitials = useMemo(() => getUserInitials(displayName), [displayName]);
  const roleLabel = ROLE_LABELS[normalizedRole] || getRoleLabel(user?.role) || 'Người dùng';
  const showAvatarImage = Boolean(user?.avatarUrl) && !avatarError;
  const createdAtLabel = formatDate(user?.createdAt);
  const membershipAge = formatMembership(user?.createdAt);

  useEffect(() => {
    if (!user) return;

    const loadTickets = async () => {
      setLoadingTickets(true);
      try {
        const filters = {};
        if (normalizedRole === 'service-user') {
          filters.userId = user.userId;
        } else if (normalizedRole === 'service-provider') {
          filters.operatorId = user.operatorId;
        } else {
          filters.userId = user.userId;
        }

        const response = await ticketApi.getTickets(filters, { role: normalizedRole });
        setTickets(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('ProfilePage ticket load failed', error);
        setTickets([]);
      } finally {
        setLoadingTickets(false);
      }
    };

    loadTickets();
  }, [user, normalizedRole]);

  const userTickets = Array.isArray(tickets) ? tickets : [];
  const totalTickets = userTickets.length;
  const resolvedTickets = userTickets.filter(ticket => ['Resolved', 'Closed'].includes(ticket.status)).length;
  const openTickets = userTickets.filter(ticket => !['Resolved', 'Closed'].includes(ticket.status)).length;
  const reportedThisMonth = userTickets.filter(ticket => {
    if (!ticket.createdAt) return false;
    const created = new Date(ticket.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
  const resolvedDurationHours = userTickets.reduce((acc, ticket) => {
    const createdAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : 0;
    const resolvedAt = ticket.resolution?.resolvedAt ? new Date(ticket.resolution.resolvedAt).getTime() : 0;
    if (!createdAt || !resolvedAt) return acc;
    return acc + Math.max(0, (resolvedAt - createdAt) / (1000 * 60 * 60));
  }, 0);
  const averageResolutionHours = resolvedTickets > 0 ? Math.round(resolvedDurationHours / resolvedTickets) : 0;
  const trustScore = Math.min(
    98,
    55 + resolvedTickets * 4 + (user?.isVerified ? 20 : 0) + (reportedThisMonth >= 1 ? 8 : 0)
  );
  const trustLabel = trustScore >= 85 ? 'Rất đáng tin cậy' : trustScore >= 70 ? 'Đáng tin cậy' : 'Đang xây dựng';

  const latestTickets = [...userTickets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const achievements = [
    {
      icon: Lucide.Star,
      title: 'Đóng góp cộng đồng',
      description: `${totalTickets} phản ánh đã gửi`,
    },
    {
      icon: Lucide.ShieldCheck,
      title: 'Tài khoản xác minh',
      description: user?.isVerified ? 'Email đã được xác thực' : 'Xác minh email ngay',
    },
    {
      icon: Lucide.CheckCircle2,
      title: 'Tỷ lệ hoàn thành',
      description: `${resolutionRate}% phản ánh đã xử lý`,
    },
  ];

  const handleUpdate = event => {
    event.preventDefault();
    setToastMessage('Đã lưu thay đổi hồ sơ');
    window.setTimeout(() => setToastMessage(''), 2600);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                <Lucide.UserRoundCog size={14} />
                Hồ sơ tài khoản
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-base-content sm:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Xem lại hồ sơ, mức độ tin cậy và tiến trình đóng góp của bạn trong hệ thống UrbanMind.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-base-300 bg-white/90 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mức độ tin cậy</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{trustScore}</p>
              <p className="mt-2 text-sm font-medium text-slate-600">{trustLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className={showAvatarImage ? 'avatar' : 'avatar placeholder'}>
                {showAvatarImage ? (
                  <div className="h-24 w-24 rounded-full ring-2 ring-primary ring-offset-4 ring-offset-base-100">
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      onError={() => setAvatarError(true)}
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 text-primary ring-2 ring-primary ring-offset-4 ring-offset-base-100">
                    <span className="text-2xl font-black leading-none tracking-tight">{userInitials}</span>
                  </div>
                )}
              </div>

              <h2 className="mt-5 text-xl font-black text-base-content">{displayName}</h2>
              <p className="mt-1 text-sm font-semibold text-base-content/50">{roleLabel}</p>
              <p className="mt-2 text-sm text-base-content/60">{user?.email || 'Chưa có email'}</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
                <Lucide.MapPin size={14} />
                {membershipAge}
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-3xl bg-base-200/70 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-base-content/50">Mã người dùng</span>
                <span className="max-w-[150px] truncate font-black text-base-content">{user?.userId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-base-content/50">Ngày tạo</span>
                <span className="font-black text-base-content">{createdAtLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-base-content/50">Xác minh</span>
                <span className={`badge badge-sm font-black ${user?.isVerified ? 'badge-success' : 'badge-warning'}`}>
                  {user?.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                </span>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-black text-base-content">
              <Lucide.Activity className="h-5 w-5 text-primary" />
              Tóm tắt hoạt động
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Đang mở</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{loadingTickets ? '—' : openTickets}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Đã giải quyết</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{loadingTickets ? '—' : resolvedTickets}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tháng này</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{loadingTickets ? '—' : reportedThisMonth}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tỷ lệ hoàn thành</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{loadingTickets ? '—' : `${resolutionRate}%`}</p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-base-content">Thành tích</p>
                <p className="mt-1 text-sm text-base-content/60">Những dấu hiệu thể hiện bạn là công dân tích cực.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {achievements.map(achievement => (
                <div key={achievement.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                      <achievement.icon size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">{achievement.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-base-content/50">Hoạt động gần đây</p>
                <h2 className="mt-3 text-2xl font-black text-slate-950">Bản đồ đóng góp của bạn</h2>
              </div>
              <Link
                to="/tickets"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300"
              >
                <Lucide.ArrowRight size={16} />
                Xem phiếu của tôi
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {loadingTickets ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Đang tải hoạt động...
                </div>
              ) : latestTickets.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Chưa có hoạt động gần đây.
                </div>
              ) : (
                latestTickets.map(ticket => (
                  <div key={ticket.feedbackId || ticket.createdAt} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{ticket.title || ticket.categoryName || 'Phản ánh mới'}</p>
                        <p className="mt-2 text-sm text-slate-500">{ticket.locationText || 'Vị trí chưa xác định'}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {ticket.status || 'Chờ xử lý'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{formatDate(ticket.createdAt)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">#{ticket.feedbackId || 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-black text-base-content">
              <Lucide.Settings2 className="h-5 w-5 text-primary" />
              Cài đặt hồ sơ
            </div>

            <form onSubmit={handleUpdate} className="mt-6 space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="form-control lg:col-span-2">
                  <label className="label">
                    <span className="label-text text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                      Email đăng nhập
                    </span>
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input input-bordered h-12 w-full rounded-2xl bg-base-200 text-sm font-bold"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                      Họ và tên
                    </span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={event => setFullName(event.target.value)}
                    className="input input-bordered h-12 w-full rounded-2xl text-sm font-bold"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                      Số điện thoại
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={event => setPhone(event.target.value)}
                    className="input input-bordered h-12 w-full rounded-2xl text-sm font-bold"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="form-control lg:col-span-2">
                  <label className="label">
                    <span className="label-text text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                      Địa chỉ liên hệ
                    </span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={event => setAddress(event.target.value)}
                    className="input input-bordered h-12 w-full rounded-2xl text-sm font-bold"
                    placeholder="Nhập địa chỉ liên hệ"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-base-300 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold leading-5 text-base-content/50">
                  Thay đổi hiện chỉ lưu trên giao diện. Khi API hồ sơ sẵn sàng, dữ liệu sẽ được đồng bộ.
                </p>
                <button
                  type="submit"
                  className="btn btn-primary rounded-2xl px-6 text-xs font-black shadow-lg shadow-primary/20"
                >
                  <Lucide.Save size={17} />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </section>
        </section>
      </div>

      {toastMessage && (
        <div className="toast toast-end z-50">
          <div className="alert border border-success/20 bg-success text-success-content shadow-lg">
            <Lucide.CheckCircle2 size={18} />
            <span className="text-sm font-bold">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
