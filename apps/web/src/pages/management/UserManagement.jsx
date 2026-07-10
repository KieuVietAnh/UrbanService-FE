// src/pages/management/UserManagement.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../services/api/userApi';
import * as Lucide from 'lucide-react';

const ROLE_META = {
  'service-user': {
    label: 'Cư dân',
    className: 'bg-blue-50 text-blue-700 ring-blue-100',
  },
  'system-staff': {
    label: 'Nhân viên tiếp nhận',
    className: 'bg-violet-50 text-violet-700 ring-violet-100',
  },
  'service-provider': {
    label: 'Đơn vị xử lý',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  'interaction-manager': {
    label: 'Quản lý tương tác',
    className: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  administrator: {
    label: 'Quản trị viên',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
};

const roleOptions = [
  { value: 'service-user', label: 'Cư dân' },
  { value: 'system-staff', label: 'Nhân viên tiếp nhận' },
  { value: 'service-provider', label: 'Đơn vị xử lý' },
  { value: 'interaction-manager', label: 'Quản lý tương tác' },
  { value: 'administrator', label: 'Quản trị viên' },
];

const getRoleMeta = (role) => ROLE_META[role] || {
  label: role || 'Không xác định',
  className: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'U';
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase();
};

const StatCard = ({ icon: Icon, label, value, helper, tone = 'slate' }) => {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  }[tone];

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
};

const ToastMessage = ({ type, text, onClose }) => {
  if (!text) return null;

  const isError = type === 'error';

  return (
    <div className="fixed right-6 top-20 z-50 w-[min(420px,calc(100vw-32px))]">
      <div className={`rounded-2xl border bg-white p-4 shadow-2xl shadow-slate-900/10 ${isError ? 'border-rose-200' : 'border-emerald-200'}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isError ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {isError ? <Lucide.AlertCircle size={18} /> : <Lucide.CheckCircle2 size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-950">{isError ? 'Có lỗi xảy ra' : 'Thành công'}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">{text}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng thông báo"
          >
            <Lucide.X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const UserManagement = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('service-user');
  const [operatorId, setOperatorId] = useState('1');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.getUsers();
      setUsers(Array.isArray(res) ? res : []);
      setMessage((prev) => (prev.type === 'error' ? { type: '', text: '' } : prev));
    } catch (err) {
      console.error(err);
      setUsers([]);
      setMessage({ type: 'error', text: 'Không thể tải danh sách người dùng.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((item) => item.isActive).length;
    const locked = users.filter((item) => !item.isActive).length;
    const operatorCount = users.filter((item) => item.role === 'service-provider').length;

    return { total, active, locked, operatorCount };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((item) => {
      const roleMeta = getRoleMeta(item.role);
      return [item.fullName, item.email, item.phoneNumber, roleMeta.label]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [users, searchTerm]);

  const resetCreateForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('service-user');
    setOperatorId('1');
  };

  const handleToggleStatus = async (userId, currentActive) => {
    try {
      await userApi.updateUserStatus(userId, !currentActive, currentAdmin?.userId);
      fetchUsers();
      setMessage({ type: 'success', text: 'Đã cập nhật trạng thái tài khoản.' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi cập nhật trạng thái tài khoản.' });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !phone) return;

    setCreateLoading(true);
    try {
      await userApi.createUser({
        fullName,
        email,
        phoneNumber: phone,
        role,
        operatorId: role === 'service-provider' ? Number(operatorId) : null,
      }, currentAdmin?.userId);

      setMessage({ type: 'success', text: 'Tạo người dùng thành công. Mật khẩu mặc định: 123456.' });
      setShowCreateModal(false);
      resetCreateForm();
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi tạo tài khoản.' });
    } finally {
      setCreateLoading(false);
    }
  };

  const hasLoadError = message.type === 'error' && users.length === 0 && !loading;

  return (
    <div className="admin-page-shell space-y-6">
      <ToastMessage
        type={message.type}
        text={message.text}
        onClose={() => setMessage({ type: '', text: '' })}
      />

      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.UsersRound size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="admin-hero-title">
                Quản lý người dùng
              </h1>
              <p className="admin-hero-description">
                Quản lý tài khoản, vai trò và trạng thái truy cập trong hệ thống.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:self-center">
            <button
              type="button"
              onClick={fetchUsers}
              className="btn btn-outline h-11 rounded-xl border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={loading}
            >
              <Lucide.RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn h-11 rounded-xl border-0 bg-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Lucide.UserPlus size={16} />
              Tạo người dùng
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Lucide.Users} label="Tổng tài khoản" value={stats.total} helper="Tất cả người dùng" tone="blue" />
        <StatCard icon={Lucide.UserCheck} label="Đang hoạt động" value={stats.active} helper="Có thể đăng nhập" tone="emerald" />
        <StatCard icon={Lucide.UserX} label="Đã khóa" value={stats.locked} helper="Đang bị vô hiệu hóa" tone="rose" />
        <StatCard icon={Lucide.Wrench} label="Đơn vị xử lý" value={stats.operatorCount} helper="Tài khoản vận hành" tone="slate" />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Danh sách tài khoản</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'Đang tải dữ liệu...' : `${filteredUsers.length}/${stats.total} tài khoản`}
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Lucide.Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên, email, số điện thoại..."
              className="input input-bordered h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
            <span className="loading loading-spinner loading-lg text-blue-600" />
            <p className="text-sm font-medium">Đang tải danh sách...</p>
          </div>
        ) : hasLoadError ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <Lucide.WifiOff size={28} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">Không thể tải danh sách</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Kiểm tra kết nối API hoặc thử làm mới dữ liệu.
            </p>
            <button
              type="button"
              onClick={fetchUsers}
              className="btn btn-outline mt-5 rounded-xl text-sm font-medium"
            >
              <Lucide.RefreshCcw size={16} />
              Thử lại
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
              <Lucide.UsersRound size={28} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">
              {searchTerm ? 'Không tìm thấy tài khoản' : 'Chưa có tài khoản'}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {searchTerm ? 'Thử tìm bằng từ khóa khác.' : 'Tạo người dùng đầu tiên để bắt đầu phân quyền truy cập.'}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn mt-5 rounded-xl border-0 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Lucide.UserPlus size={16} />
                Tạo người dùng
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                  <th className="px-6 py-4">Người dùng</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const roleMeta = getRoleMeta(u.role);
                  const isCurrentAdmin = u.userId === currentAdmin?.userId;

                  return (
                    <tr key={u.userId} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <div className="avatar">
                              <div className="h-11 w-11 rounded-xl ring-1 ring-slate-200">
                                <img src={u.avatarUrl} alt={u.fullName || 'Avatar'} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                              {getInitials(u.fullName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-950">{u.fullName || 'Chưa có tên'}</span>
                              {isCurrentAdmin && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <Lucide.Mail size={14} />
                                {u.email || 'Chưa có email'}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Lucide.Phone size={14} />
                                {u.phoneNumber || 'Chưa có SĐT'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${roleMeta.className}`}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${u.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-rose-50 text-rose-700 ring-rose-100'
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isCurrentAdmin ? (
                          <span className="text-sm text-slate-400">Tài khoản hiện tại</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u.userId, u.isActive)}
                            className={`btn btn-sm rounded-xl text-sm font-medium ${u.isActive ? 'btn-outline btn-error' : 'btn-primary'}`}
                          >
                            {u.isActive ? (
                              <>
                                <Lucide.Lock size={14} />
                                Khóa
                              </>
                            ) : (
                              <>
                                <Lucide.Unlock size={14} />
                                Mở khóa
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
        >
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" />

          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-slate-200 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Lucide.UserPlus size={20} />
                </span>
                <div>
                  <h3 id="create-user-title" className="text-xl font-semibold text-slate-950">Tạo người dùng</h3>
                  <p className="mt-1 text-sm text-slate-500">Mật khẩu mặc định: 123456</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Đóng"
              >
                <Lucide.X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text text-sm font-medium text-slate-700">Họ và tên *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Trần Quốc Toản"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input input-bordered h-11 w-full rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm font-medium text-slate-700">Email *</span>
                  </label>
                  <input
                    type="email"
                    placeholder="account@urbanmind.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input input-bordered h-11 w-full rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm font-medium text-slate-700">Số điện thoại *</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="09XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input input-bordered h-11 w-full rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text text-sm font-medium text-slate-700">Vai trò *</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="select select-bordered h-11 rounded-xl text-sm"
                    required
                  >
                    {roleOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {role === 'service-provider' && (
                  <div className="form-control sm:col-span-2">
                    <label className="label">
                      <span className="label-text text-sm font-medium text-slate-700">Đơn vị vận hành</span>
                    </label>
                    <select
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      className="select select-bordered h-11 rounded-xl text-sm"
                    >
                      <option value="1">Đơn vị Điện chiếu sáng</option>
                      <option value="2">Đơn vị Thu gom Rác thải</option>
                      <option value="3">Tổng công ty Cấp nước SAWACO</option>
                      <option value="4">Khu quản lý cầu đường bộ số 1</option>
                      <option value="5">Đơn vị Công viên Cây xanh</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost rounded-xl text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn rounded-xl border-0 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                  disabled={createLoading}
                >
                  {createLoading ? <span className="loading loading-spinner loading-sm" /> : <Lucide.UserPlus size={16} />}
                  Thêm tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
