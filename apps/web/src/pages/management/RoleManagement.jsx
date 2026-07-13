// src/pages/management/RoleManagement.jsx
import { Fragment, useState } from 'react';
import { APP_ROLES } from '@urbanmind/shared-types';
import { SuccessAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

export const RoleManagement = () => {
  // Mock permission matrix state
  const roles = [
    { key: APP_ROLES.SERVICE_USER, name: 'Resident (Người dân)' },
    { key: APP_ROLES.SYSTEM_STAFF, name: 'System Staff (Cán bộ tiếp nhận)' },
    { key: APP_ROLES.SERVICE_PROVIDER, name: 'Service Provider (Kỹ thuật viên)' },
    { key: APP_ROLES.INTERACTION_MANAGER, name: 'Interaction Manager (Quản lý)' },
    { key: APP_ROLES.ADMINISTRATOR, name: 'Admin Hệ Thống' }
  ];

  const permissions = [
    { key: 'ticket:create', desc: 'Tạo phiếu phản ánh sự cố đô thị' },
    { key: 'ticket:view-own', desc: 'Xem danh sách phản ánh cá nhân đã gửi' },
    { key: 'ticket:view-all', desc: 'Xem toàn bộ hàng chờ phản ánh thành phố' },
    { key: 'ticket:verify', desc: 'Duyệt/Sửa phân loại danh mục tự động của AI' },
    { key: 'ticket:merge', desc: 'Gộp trùng lặp các phản ánh (Master Ticket)' },
    { key: 'ticket:assign', desc: 'Điều phối phân việc cho đơn vị kỹ thuật' },
    { key: 'ticket:update-progress', desc: 'Cập nhật tiến độ thi công (Sửa chữa)' },
    { key: 'ticket:resolve', desc: 'Báo cáo hoàn thành sự cố đính kèm ảnh bàn giao' },
    { key: 'ticket:inspect-resolution', desc: 'Nghiệm thu hoặc yêu cầu đơn vị sửa chữa lại' },
    { key: 'ticket:rate', desc: 'Citizen đánh giá chất lượng hoàn thiện (CSAT)' },
    { key: 'analytics:view', desc: 'Xem báo cáo phân tích SLA & Cảm xúc (AI)' },
    { key: 'user:manage', desc: 'Quản lý tài khoản, vai trò và phân quyền' }
  ];

  // Map showing which roles have which permissions
  const [matrix, setMatrix] = useState({
    [APP_ROLES.SERVICE_USER]: ['ticket:create', 'ticket:view-own', 'ticket:rate', 'ticket:chat'],
    [APP_ROLES.SYSTEM_STAFF]: ['ticket:view-all', 'ticket:verify', 'ticket:merge', 'ticket:assign', 'ticket:inspect-resolution', 'ticket:chat'],
    [APP_ROLES.SERVICE_PROVIDER]: ['ticket:view-assigned', 'ticket:update-progress', 'ticket:resolve', 'ticket:chat'],
    [APP_ROLES.INTERACTION_MANAGER]: ['analytics:view', 'ticket:chat'],
    [APP_ROLES.ADMINISTRATOR]: ['ticket:view-all', 'user:manage', 'category:manage', 'sla:manage', 'integration:manage', 'system:logs']
  });

  const roleMeta = {
    [APP_ROLES.SERVICE_USER]: {
      label: 'Người dân',
      tone: 'badge-info',
      icon: Lucide.Users,
      description: 'Gửi phản ánh và theo dõi hồ sơ cá nhân'
    },
    [APP_ROLES.SYSTEM_STAFF]: {
      label: 'Cán bộ tiếp nhận',
      tone: 'badge-warning',
      icon: Lucide.ClipboardCheck,
      description: 'Kiểm duyệt, gộp trùng và điều phối phản ánh'
    },
    [APP_ROLES.SERVICE_PROVIDER]: {
      label: 'Đơn vị xử lý',
      tone: 'badge-success',
      icon: Lucide.Wrench,
      description: 'Cập nhật tiến độ và báo cáo hoàn thành'
    },
    [APP_ROLES.INTERACTION_MANAGER]: {
      label: 'Quản lý tương tác',
      tone: 'badge-secondary',
      icon: Lucide.MessagesSquare,
      description: 'Theo dõi phân tích và tương tác người dùng'
    },
    [APP_ROLES.ADMINISTRATOR]: {
      label: 'Quản trị viên',
      tone: 'badge-primary',
      icon: Lucide.ShieldCheck,
      description: 'Quản trị tài khoản, cấu hình và nhật ký hệ thống'
    }
  };

  const permissionGroups = [
    {
      title: 'Tiếp nhận phản ánh',
      icon: Lucide.Inbox,
      permissions: ['ticket:create', 'ticket:view-own', 'ticket:view-all']
    },
    {
      title: 'Điều phối & kiểm duyệt',
      icon: Lucide.Route,
      permissions: ['ticket:verify', 'ticket:merge', 'ticket:assign']
    },
    {
      title: 'Xử lý hiện trường',
      icon: Lucide.HardHat,
      permissions: ['ticket:update-progress', 'ticket:resolve', 'ticket:inspect-resolution']
    },
    {
      title: 'Đánh giá & quản trị',
      icon: Lucide.BarChart3,
      permissions: ['ticket:rate', 'analytics:view', 'user:manage']
    }
  ];

  const listedPermissionKeys = permissions.map(permission => permission.key);
  const grantedPermissionCount = roles.reduce((total, role) => {
    const activePerms = matrix[role.key] || [];
    return total + activePerms.filter(permission => listedPermissionKeys.includes(permission)).length;
  }, 0);
  const totalPermissionSlots = roles.length * permissions.length;
  const coverageRate = totalPermissionSlots > 0
    ? Math.round((grantedPermissionCount / totalPermissionSlots) * 100)
    : 0;
  const administratorPermissionCount = (matrix[APP_ROLES.ADMINISTRATOR] || []).filter(permission => (
    listedPermissionKeys.includes(permission)
  )).length;

  const getPermissionInfo = permissionKey => {
    return permissions.find(permission => permission.key === permissionKey);
  };

  const handleToggle = (roleKey, permKey) => {
    const activePerms = matrix[roleKey] || [];
    const isChecked = activePerms.includes(permKey);
    let updated;
    if (isChecked) {
      updated = activePerms.filter(p => p !== permKey);
    } else {
      updated = [...activePerms, permKey];
    }
    setMatrix(prev => ({ ...prev, [roleKey]: updated }));
  };

  const [pageMessage, setPageMessage] = useState({ type: '', text: '' });

  const handleSave = () => {
    setPageMessage({ type: 'success', text: 'Đã cập nhật ma trận phân quyền vai trò trên hệ thống thành công!' });
  };

  return (
    <div className="space-y-6">
      {pageMessage.type === 'success' && (
        <SuccessAlert
          message={pageMessage.text}
          onClose={() => setPageMessage({ type: '', text: '' })}
        />
      )}
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                <Lucide.KeyRound size={14} />
                Phân quyền hệ thống
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                  Quản Lý Vai Trò & Quyền Hạn
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Cấu hình ma trận quyền cho từng nhóm vai trò nghiệp vụ, giúp Admin kiểm soát đúng phạm vi truy cập trong hệ thống UrbanMind.
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="btn btn-primary rounded-2xl px-5 text-xs font-black shadow-lg shadow-primary/20"
            >
              <Lucide.Save size={17} />
              Lưu thay đổi
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Lucide.UsersRound size={22} />
            </div>
            <span className="badge badge-primary badge-outline font-bold">Vai trò</span>
          </div>
          <p className="mt-4 text-sm font-bold text-base-content/50">Vai trò hệ thống</p>
          <p className="mt-1 text-3xl font-black text-base-content">{roles.length}</p>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-info/10 p-3 text-info">
              <Lucide.ListChecks size={22} />
            </div>
            <span className="badge badge-info badge-outline font-bold">Quyền</span>
          </div>
          <p className="mt-4 text-sm font-bold text-base-content/50">Quyền đang hiển thị</p>
          <p className="mt-1 text-3xl font-black text-base-content">{permissions.length}</p>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-success/10 p-3 text-success">
              <Lucide.CheckCircle2 size={22} />
            </div>
            <span className="badge badge-success badge-outline font-bold">Đã bật</span>
          </div>
          <p className="mt-4 text-sm font-bold text-base-content/50">Ô quyền đã bật</p>
          <p className="mt-1 text-3xl font-black text-base-content">{grantedPermissionCount}</p>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-warning/10 p-3 text-warning">
              <Lucide.Activity size={22} />
            </div>
            <span className="badge badge-warning badge-outline font-bold">{coverageRate}%</span>
          </div>
          <p className="mt-4 text-sm font-bold text-base-content/50">Tỷ lệ phân quyền</p>
          <progress className="progress progress-warning mt-3 h-2" value={coverageRate} max="100" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {roles.map(role => {
          const meta = roleMeta[role.key] || {};
          const Icon = meta.icon || Lucide.UserRoundCog;
          const activeCount = (matrix[role.key] || []).filter(permission => (
            listedPermissionKeys.includes(permission)
          )).length;
          const activeRate = permissions.length > 0
            ? Math.round((activeCount / permissions.length) * 100)
            : 0;

          return (
            <div key={role.key} className="rounded-3xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-base-200 p-3 text-primary">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`badge ${meta.tone || 'badge-neutral'} badge-outline mb-2 font-bold`}>
                    {meta.label || role.name}
                  </span>
                  <h3 className="truncate text-sm font-black text-base-content">{role.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-base-content/55">
                    {meta.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-bold text-base-content/50">
                <span>{activeCount}/{permissions.length} quyền</span>
                <span>{activeRate}%</span>
              </div>
              <progress className="progress progress-primary mt-2 h-2" value={activeRate} max="100" />
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-base-300 bg-base-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-base-content">Ma trận phân quyền</h3>
            <p className="mt-1 text-sm font-medium text-base-content/55">
              Bật/tắt quyền cho từng vai trò. Các thay đổi chỉ được xác nhận khi bấm lưu cấu hình.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-base-content/60">
            <span className="badge badge-ghost gap-1 rounded-xl">
              <Lucide.Shield size={13} />
              Admin: {administratorPermissionCount} quyền hiển thị
            </span>
            <span className="badge badge-ghost gap-1 rounded-xl">
              <Lucide.MousePointerClick size={13} />
              Click checkbox để thay đổi
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full min-w-[1120px]">
            <thead>
              <tr className="border-base-300 bg-base-200/80 text-[11px] font-black uppercase tracking-wider text-base-content/55">
                <th className="sticky left-0 z-10 w-[320px] bg-base-200/95 backdrop-blur">
                  Quyền hạn hệ thống
                </th>
                {roles.map(role => {
                  const meta = roleMeta[role.key] || {};
                  const Icon = meta.icon || Lucide.UserRoundCog;

                  return (
                    <th key={role.key} className="min-w-[150px] text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Icon size={17} />
                        <span>{meta.label || role.name}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {permissionGroups.map(group => {
                const GroupIcon = group.icon;

                return (
                  <Fragment key={group.title}>
                    <tr className="border-base-300">
                      <td colSpan={roles.length + 1} className="bg-base-200/50 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-base-content/50">
                          <GroupIcon size={15} />
                          {group.title}
                        </div>
                      </td>
                    </tr>

                    {group.permissions.map(permissionKey => {
                      const permission = getPermissionInfo(permissionKey);
                      if (!permission) return null;

                      return (
                        <tr key={permission.key} className="group border-base-300 hover:bg-base-200/40">
                          <td className="sticky left-0 z-10 bg-base-100 py-4 backdrop-blur group-hover:bg-base-200">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
                                <Lucide.Key size={16} />
                              </div>
                              <div>
                                <div className="font-mono text-xs font-black text-base-content">
                                  {permission.key}
                                </div>
                                <div className="mt-1 text-xs font-semibold leading-5 text-base-content/55">
                                  {permission.desc}
                                </div>
                              </div>
                            </div>
                          </td>

                          {roles.map(role => {
                            const hasPerm = (matrix[role.key] || []).includes(permission.key);

                            return (
                              <td key={role.key} className="text-center">
                                <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl p-2 transition hover:bg-base-200">
                                  <input
                                    type="checkbox"
                                    checked={hasPerm}
                                    onChange={() => handleToggle(role.key, permission.key)}
                                    className="checkbox checkbox-primary checkbox-sm"
                                    aria-label={`${role.name} - ${permission.key}`}
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-info/10 p-3 text-info">
            <Lucide.Info size={20} />
          </div>
          <div>
            <h3 className="font-black text-base-content">Ghi chú vận hành</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-base-content/60">
              Đây là màn cấu hình quyền ở cấp vai trò. Khi cần thay đổi quyền nhạy cảm như quản lý tài khoản hoặc log hệ thống, Admin nên kiểm tra lại tác động tới flow xử lý phản ánh trước khi lưu.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge badge-primary badge-outline rounded-xl font-bold">Nguyên tắc least privilege</span>
              <span className="badge badge-info badge-outline rounded-xl font-bold">Theo dõi thay đổi sau khi lưu</span>
              <span className="badge badge-warning badge-outline rounded-xl font-bold">Không cấp quyền dư thừa</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
