// src/pages/profile/ProfilePage.jsx
import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleLabel } from '../../utils/roleMap';

const ROLE_LABELS = {
  administrator: 'Quản trị viên',
  'service-user': 'Khách',
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

export const ProfilePage = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatarError, setAvatarError] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const displayName = fullName || user?.fullName || user?.email || 'Người dùng';
  const userInitials = useMemo(() => getUserInitials(displayName), [displayName]);
  const roleLabel = ROLE_LABELS[normalizedRole] || getRoleLabel(user?.role) || 'Người dùng';
  const showAvatarImage = Boolean(user?.avatarUrl) && !avatarError;
  const createdAtLabel = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN')
    : 'Chưa có dữ liệu';

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

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                <Lucide.UserRoundCog size={14} />
                Hồ sơ tài khoản
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                  Hồ sơ cá nhân
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Quản lý thông tin định danh, vai trò truy cập và chi tiết liên hệ của tài khoản UrbanMind.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-base-content/40">
                Trạng thái tài khoản
              </p>
              <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-success">
                <span className="h-2 w-2 rounded-full bg-success" />
                Đang hoạt động
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
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

            <h3 className="mt-5 text-xl font-black text-base-content">{displayName}</h3>
            <p className="mt-1 text-sm font-semibold text-base-content/50">{user?.email || 'Chưa có email'}</p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
              <Lucide.ShieldCheck size={14} />
              {roleLabel}
            </div>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl bg-base-200/70 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-base-content/50">Mã người dùng</span>
              <span className="max-w-[150px] truncate font-black text-base-content">{user?.userId || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-base-content/50">Xác minh</span>
              <span className={`badge badge-sm font-black ${user?.isVerified ? 'badge-success' : 'badge-warning'}`}>
                {user?.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-base-content/50">Ngày tạo</span>
              <span className="font-black text-base-content">{createdAtLabel}</span>
            </div>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
          <div className="border-b border-base-300 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lucide.ContactRound size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-base-content">Thông tin liên hệ</h3>
                <p className="text-sm font-medium text-base-content/55">
                  Cập nhật thông tin hiển thị và kênh liên lạc nội bộ.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5 p-6">
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
                Hiện tại thay đổi được lưu ở giao diện. Khi API hồ sơ sẵn sàng, phần này có thể nối lưu dữ liệu thật.
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
