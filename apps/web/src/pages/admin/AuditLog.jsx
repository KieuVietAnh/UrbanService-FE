// src/pages/admin/AuditLog.jsx
import { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toolsApi } from '@urbanmind/shared-api';

const formatDateTime = (value) => {
  if (!value) return 'Chưa có dữ liệu';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getActionMeta = (action = '') => {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes('delete') || normalizedAction.includes('remove')) {
    return {
      label: 'Rủi ro cao',
      tone: 'bg-rose-50 text-rose-700',
      iconTone: 'bg-rose-50 text-rose-700',
      icon: Lucide.Trash2,
      filter: 'risk',
    };
  }

  if (normalizedAction.includes('create') || normalizedAction.includes('add')) {
    return {
      label: 'Tạo mới',
      tone: 'bg-emerald-50 text-emerald-700',
      iconTone: 'bg-emerald-50 text-emerald-700',
      icon: Lucide.PlusCircle,
      filter: 'create',
    };
  }

  if (normalizedAction.includes('update') || normalizedAction.includes('change') || normalizedAction.includes('edit')) {
    return {
      label: 'Cập nhật',
      tone: 'bg-amber-50 text-amber-700',
      iconTone: 'bg-amber-50 text-amber-700',
      icon: Lucide.PencilLine,
      filter: 'update',
    };
  }

  if (normalizedAction.includes('login') || normalizedAction.includes('auth')) {
    return {
      label: 'Truy cập',
      tone: 'bg-blue-50 text-blue-700',
      iconTone: 'bg-blue-50 text-blue-700',
      icon: Lucide.LogIn,
      filter: 'access',
    };
  }

  return {
    label: 'Theo dõi',
    tone: 'bg-blue-50 text-blue-700',
    iconTone: 'bg-blue-50 text-blue-700',
    icon: Lucide.Activity,
    filter: 'monitor',
  };
};

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

export const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    setLogs(toolsApi.getAuditLogs());
    setLoading(false);
  }, []);

  const auditLogs = useMemo(() => Array.isArray(logs) ? logs : [], [logs]);

  const auditSummary = useMemo(() => {
    const actorIds = new Set(auditLogs.map((log) => log.userId).filter(Boolean));
    const entityNames = new Set(auditLogs.map((log) => log.entityName).filter(Boolean));
    const latestDate = auditLogs.reduce((latest, log) => {
      const currentTime = new Date(log.createdAt).getTime();
      if (Number.isNaN(currentTime)) return latest;
      return currentTime > latest ? currentTime : latest;
    }, 0);

    return {
      totalLogs: auditLogs.length,
      actors: actorIds.size,
      entities: entityNames.size,
      latest: latestDate ? formatDateTime(latestDate) : 'Chưa có dữ liệu',
    };
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const actionMeta = getActionMeta(log.action);
      const text = [
        log.userId,
        log.action,
        actionMeta.label,
        log.entityName,
        log.entityId,
        log.ipAddress,
        log.userAgent,
        formatDateTime(log.createdAt),
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesAction = actionFilter === 'all' || actionMeta.filter === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [auditLogs, actionFilter, search]);

  return (
    <div className="admin-page-shell space-y-6">
      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.FileClock size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="admin-hero-title">
                Nhật ký hệ thống
              </h2>
              <p className="admin-hero-description">
                Theo dõi lịch sử thao tác dữ liệu, cấu hình hệ thống và hoạt động quản trị để đảm bảo minh bạch vận hành.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Đang theo dõi
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-950">Hoạt động quản trị</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng nhật ký" value={auditSummary.totalLogs} description="Sự kiện đã ghi nhận." icon={Lucide.FileClock} toneClass="bg-blue-50 text-blue-700" />
        <StatCard label="Tác nhân" value={auditSummary.actors} description="Tài khoản có thao tác." icon={Lucide.UsersRound} toneClass="bg-blue-50 text-blue-700" />
        <StatCard label="Đối tượng" value={auditSummary.entities} description="Module bị tác động." icon={Lucide.Database} toneClass="bg-amber-50 text-amber-700" />
        <StatCard label="Log mới nhất" value={auditSummary.latest} description="Thời điểm gần nhất." icon={Lucide.Clock3} toneClass="bg-emerald-50 text-emerald-700" />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between sm:px-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Dòng sự kiện gần đây</h3>
            <p className="mt-1 text-sm text-slate-500">
              Kiểm tra thao tác quản trị, nguồn truy cập và đối tượng bị tác động.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="input input-bordered flex h-11 min-w-[260px] items-center gap-2 rounded-2xl bg-white text-sm">
              <Lucide.Search size={16} className="text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="grow"
                placeholder="Tìm người dùng, hành động, IP..."
              />
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="select select-bordered h-11 rounded-2xl text-sm"
            >
              <option value="all">Tất cả hành động</option>
              <option value="create">Tạo mới</option>
              <option value="update">Cập nhật</option>
              <option value="risk">Rủi ro cao</option>
              <option value="access">Truy cập</option>
              <option value="monitor">Theo dõi</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-blue-700" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="rounded-3xl bg-slate-50 p-5 text-slate-400">
              <Lucide.FileSearch size={36} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">Không có nhật ký phù hợp</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Thử thay đổi từ khóa hoặc bộ lọc để xem thêm lịch sử hoạt động hệ thống.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="px-6 py-4">Tác nhân</th>
                  <th className="px-6 py-4">Hành động</th>
                  <th className="px-6 py-4">Đối tượng</th>
                  <th className="px-6 py-4">Thiết bị / IP</th>
                  <th className="px-6 py-4 text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => {
                  const actionMeta = getActionMeta(log.action);
                  const ActionIcon = actionMeta.icon;

                  return (
                    <tr key={log.auditId || `${log.userId}-${log.action}-${log.createdAt}`} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                            <Lucide.UserRound size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-950">{log.userId || 'Không xác định'}</div>
                            <div className="text-xs text-slate-400">Tài khoản hệ thống</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-2xl p-2 ${actionMeta.iconTone}`}>
                            <ActionIcon size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-950">{log.action || 'Không có hành động'}</div>
                            <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${actionMeta.tone}`}>
                              {actionMeta.label}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex max-w-xs items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <Lucide.Box size={15} className="shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-950">
                              {log.entityName || 'Không xác định'}
                            </div>
                            <div className="truncate text-xs text-slate-400">
                              ID: {log.entityId || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-950">IP: {log.ipAddress || 'N/A'}</div>
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                          {log.userAgent || 'Không có User Agent'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-slate-950">{formatDateTime(log.createdAt)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
