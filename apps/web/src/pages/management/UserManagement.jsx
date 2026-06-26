// src/pages/management/UserManagement.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../services/api/userApi';
import * as Lucide from 'lucide-react';

const ROLE_META = {
  'service-user': {
    label: 'Cư dân',
    description: 'Gửi và theo dõi phản ánh',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'system-staff': {
    label: 'Nhân viên hệ thống',
    description: 'Tiếp nhận và điều phối phản ánh',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  'service-provider': {
    label: 'Đơn vị xử lý',
    description: 'Cập nhật tiến độ xử lý hiện trường',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'interaction-manager': {
    label: 'Quản lý tương tác',
    description: 'Theo dõi chất lượng tương tác',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  administrator: {
    label: 'Quản trị viên',
    description: 'Quản trị toàn hệ thống',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
};

const getRoleMeta = (role) => ROLE_META[role] || {
  label: role || 'Không xác định',
  description: 'Chưa có mô tả vai trò',
  className: 'bg-base-200 text-base-content/70 border-base-300',
};

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'U';
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase();
};

export const UserManagement = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states to create user
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
    } catch (err) {
      console.error(err);
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
    const adminCount = users.filter((item) => item.role === 'administrator').length;
    const operatorCount = users.filter((item) => item.role === 'service-provider').length;

    return {
      total,
      active,
      locked,
      adminCount,
      operatorCount,
      activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }, [users]);

  const roleDistribution = useMemo(() => {
    return Object.entries(ROLE_META).map(([roleKey, meta]) => ({
      role: roleKey,
      label: meta.label,
      count: users.filter((item) => item.role === roleKey).length,
      className: meta.className,
    }));
  }, [users]);

  const handleToggleStatus = async (userId, currentActive) => {
    try {
      await userApi.updateUserStatus(userId, !currentActive, currentAdmin?.userId);
      fetchUsers();
      alert('Đã cập nhật trạng thái tài khoản thành công.');
    } catch (err) {
      console.error(err);
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
        operatorId: role === 'service-provider' ? Number(operatorId) : null
      }, currentAdmin?.userId);

      alert('Tạo người dùng mới thành công! Mật khẩu mặc định là: 123456');
      setShowCreateModal(false);

      // Reset
      setFullName('');
      setEmail('');
      setPhone('');
      setRole('service-user');

      fetchUsers();
    } catch (err) {
      alert(err.message || 'Lỗi khi tạo tài khoản.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent lg:block" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                <Lucide.UsersRound size={14} />
                Quản trị tài khoản
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                  Quản lý người dùng
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Theo dõi tài khoản, vai trò truy cập và trạng thái hoạt động của người dùng trong hệ thống UrbanMind.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={fetchUsers}
                className="btn btn-outline rounded-2xl text-xs font-black"
                disabled={loading}
              >
                <Lucide.RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                Làm mới
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary rounded-2xl text-xs font-black shadow-lg shadow-primary/20"
              >
                <Lucide.UserPlus size={16} />
                Tạo người dùng mới
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.6rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/45">Tổng tài khoản</p>
              <p className="mt-3 text-3xl font-black text-base-content">{stats.total}</p>
              <p className="mt-1 text-xs font-semibold text-base-content/50">Toàn bộ người dùng hệ thống</p>
            </div>
            <span className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Lucide.Users size={20} />
            </span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700/70">Đang hoạt động</p>
              <p className="mt-3 text-3xl font-black text-emerald-700">{stats.active}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700/60">{stats.activeRate}% tài khoản khả dụng</p>
            </div>
            <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <Lucide.UserCheck size={20} />
            </span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-rose-100 bg-rose-50/60 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-700/70">Đã khóa</p>
              <p className="mt-3 text-3xl font-black text-rose-700">{stats.locked}</p>
              <p className="mt-1 text-xs font-semibold text-rose-700/60">Tài khoản đang bị vô hiệu hóa</p>
            </div>
            <span className="rounded-2xl bg-rose-100 p-3 text-rose-700">
              <Lucide.UserX size={20} />
            </span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/45">Quyền quản trị</p>
              <p className="mt-3 text-3xl font-black text-base-content">{stats.adminCount}</p>
              <p className="mt-1 text-xs font-semibold text-base-content/50">{stats.operatorCount} tài khoản đơn vị xử lý</p>
            </div>
            <span className="rounded-2xl bg-violet-50 p-3 text-violet-700">
              <Lucide.ShieldCheck size={20} />
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-[1.8rem] border border-base-300 bg-base-100 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-base-300 bg-base-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-base-content">Danh sách tài khoản</h3>
              <p className="mt-1 text-xs font-semibold text-base-content/55">
                Kiểm soát trạng thái truy cập và vai trò của từng người dùng.
              </p>
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-200 px-4 py-2 text-xs font-bold text-base-content/60">
              {stats.total} tài khoản
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-base-content/60">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm font-bold">Đang tải danh sách người dùng...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <div className="rounded-3xl bg-base-200 p-5 text-base-content/50">
                <Lucide.UsersRound size={34} />
              </div>
              <h3 className="mt-4 text-lg font-black text-base-content">Chưa có tài khoản nào</h3>
              <p className="mt-2 max-w-md text-sm font-medium text-base-content/55">
                Tạo người dùng mới để bắt đầu phân quyền truy cập hệ thống.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary mt-5 rounded-2xl text-xs font-black"
              >
                <Lucide.UserPlus size={16} />
                Tạo người dùng mới
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full min-w-[860px] text-xs">
                <thead>
                  <tr className="border-b border-base-300 bg-base-200/70 text-[10px] font-black uppercase tracking-[0.18em] text-base-content/45">
                    <th className="px-5 py-4">Người dùng</th>
                    <th className="px-5 py-4">Liên hệ</th>
                    <th className="px-5 py-4">Vai trò</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-300">
                  {users.map((u) => {
                    const roleMeta = getRoleMeta(u.role);
                    const isCurrentAdmin = u.userId === currentAdmin?.userId;

                    return (
                      <tr key={u.userId} className="transition-colors hover:bg-base-200/60">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <div className="avatar">
                                <div className="h-11 w-11 rounded-2xl ring-1 ring-base-300">
                                  <img src={u.avatarUrl} alt={u.fullName || 'Avatar'} />
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary ring-1 ring-primary/10">
                                {getInitials(u.fullName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-base-content">{u.fullName}</span>
                                {isCurrentAdmin && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <span className="mt-1 block max-w-[260px] truncate text-[11px] font-semibold text-base-content/45">
                                ID: {u.userId}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5 font-semibold text-base-content/60">
                            <div className="flex items-center gap-2">
                              <Lucide.Mail size={14} className="text-base-content/35" />
                              <span className="max-w-[220px] truncate">{u.email || 'Chưa có email'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Lucide.Phone size={14} className="text-base-content/35" />
                              <span>{u.phoneNumber || 'Chưa có SĐT'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`inline-flex max-w-[220px] items-center gap-2 rounded-2xl border px-3 py-2 ${roleMeta.className}`}>
                            <Lucide.BadgeCheck size={14} />
                            <div>
                              <p className="text-[11px] font-black leading-none">{roleMeta.label}</p>
                              <p className="mt-1 text-[10px] font-semibold opacity-70">{roleMeta.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase ${u.isActive
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                            }`}>
                            <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isCurrentAdmin ? (
                            <span className="text-[11px] font-bold text-base-content/40">Tài khoản hiện tại</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u.userId, u.isActive)}
                              className={`btn btn-sm rounded-xl text-[11px] font-black ${u.isActive ? 'btn-outline btn-error' : 'btn-primary'
                                }`}
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
        </div>

        <aside className="space-y-6">
          <div className="rounded-[1.8rem] border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-base-content">Phân bổ vai trò</h3>
                <p className="mt-1 text-xs font-semibold text-base-content/50">Tổng quan cơ cấu tài khoản.</p>
              </div>
              <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Lucide.PieChart size={18} />
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {roleDistribution.map((item) => (
                <div key={item.role} className="rounded-2xl border border-base-300 bg-base-200/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-base-content">{item.label}</span>
                    <span className="text-sm font-black text-base-content">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-base-300">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${stats.total > 0 ? Math.max((item.count / stats.total) * 100, item.count > 0 ? 8 : 0) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <Lucide.Info size={18} />
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-900">Lưu ý phân quyền</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-amber-800/80">
                  Tài khoản đơn vị xử lý cần được gắn đúng đơn vị vận hành để nhận nhiệm vụ phù hợp.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl rounded-[2rem] border border-base-300 p-0 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-base-300 bg-base-100 p-6">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Lucide.UserPlus size={20} />
                </span>
                <div>
                  <h3 className="text-lg font-black text-base-content">Tạo người dùng hệ thống</h3>
                  <p className="mt-1 text-xs font-semibold text-base-content/55">
                    Mật khẩu mặc định sau khi tạo tài khoản là 123456.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <Lucide.X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5 p-6 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text text-xs font-black">Họ và tên *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Trần Quốc Toản"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input input-bordered h-11 w-full rounded-2xl text-sm font-semibold"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-black">Email đăng nhập *</span>
                  </label>
                  <input
                    type="email"
                    placeholder="account@urbanmind.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input input-bordered h-11 w-full rounded-2xl text-sm font-semibold"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-black">Số điện thoại *</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="09XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input input-bordered h-11 w-full rounded-2xl text-sm font-semibold"
                    required
                  />
                </div>

                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text text-xs font-black">Vai trò phân nhiệm *</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="select select-bordered h-11 rounded-2xl text-sm font-bold"
                    required
                  >
                    <option value="service-user">Resident (Người dân)</option>
                    <option value="system-staff">System Staff (Nhân viên)</option>
                    <option value="service-provider">Service Provider (Đội kỹ thuật)</option>
                    <option value="interaction-manager">Interaction Manager (Quản lý)</option>
                    <option value="administrator">Administrator (Quản trị viên)</option>
                  </select>
                </div>

                {role === 'service-provider' && (
                  <div className="form-control sm:col-span-2">
                    <label className="label">
                      <span className="label-text text-xs font-black">Gắn đơn vị vận hành công ích</span>
                    </label>
                    <select
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      className="select select-bordered h-11 rounded-2xl text-sm font-bold"
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

              <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-xs font-semibold leading-5 text-base-content/60">
                Sau khi tạo, Admin có thể khóa/mở khóa tài khoản trực tiếp trong danh sách người dùng.
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-base-300 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost rounded-2xl text-xs font-black"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary rounded-2xl text-xs font-black"
                  disabled={createLoading}
                >
                  {createLoading ? <span className="loading loading-spinner"></span> : <Lucide.UserPlus size={16} />}
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
