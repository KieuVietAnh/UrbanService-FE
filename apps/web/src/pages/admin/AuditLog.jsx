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
      icon: Lucide.Trash2,
      badgeClass: 'border-error/20 bg-error/10 text-error',
      iconClass: 'bg-error/10 text-error',
    };
  }

  if (normalizedAction.includes('create') || normalizedAction.includes('add')) {
    return {
      label: 'Tạo mới',
      icon: Lucide.PlusCircle,
      badgeClass: 'border-success/20 bg-success/10 text-success',
      iconClass: 'bg-success/10 text-success',
    };
  }

  if (normalizedAction.includes('update') || normalizedAction.includes('change') || normalizedAction.includes('edit')) {
    return {
      label: 'Cập nhật',
      icon: Lucide.PencilLine,
      badgeClass: 'border-warning/20 bg-warning/10 text-warning',
      iconClass: 'bg-warning/10 text-warning',
    };
  }

  if (normalizedAction.includes('login') || normalizedAction.includes('auth')) {
    return {
      label: 'Truy cập',
      icon: Lucide.LogIn,
      badgeClass: 'border-info/20 bg-info/10 text-info',
      iconClass: 'bg-info/10 text-info',
    };
  }

  return {
    label: 'Theo dõi',
    icon: Lucide.Activity,
    badgeClass: 'border-primary/20 bg-primary/10 text-primary',
    iconClass: 'bg-primary/10 text-primary',
  };
};

export const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read logs from shared tools API
    setLogs(toolsApi.getAuditLogs());
    setLoading(false);
  }, []);

  const auditLogs = useMemo(() => {
    return Array.isArray(logs) ? logs : [];
  }, [logs]);

  const auditSummary = useMemo(() => {
    const actorIds = new Set(auditLogs.map(log => log.userId).filter(Boolean));
    const entityNames = new Set(auditLogs.map(log => log.entityName).filter(Boolean));
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

  const summaryCards = [
    {
      label: 'Tổng nhật ký',
      value: auditSummary.totalLogs,
      description: 'Sự kiện đã ghi nhận',
      icon: Lucide.FileClock,
    },
    {
      label: 'Tác nhân',
      value: auditSummary.actors,
      description: 'Tài khoản có thao tác',
      icon: Lucide.UsersRound,
    },
    {
      label: 'Đối tượng',
      value: auditSummary.entities,
      description: 'Module bị tác động',
      icon: Lucide.Database,
    },
    {
      label: 'Log mới nhất',
      value: auditSummary.latest,
      description: 'Thời điểm gần nhất',
      icon: Lucide.Clock3,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-16 h-28 w-28 rounded-full bg-info/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                <Lucide.ShieldCheck size={14} />
                Audit Trail
              </div>
              <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                Nhật ký hệ thống
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                Theo dõi toàn bộ lịch sử thao tác dữ liệu, cấu hình hệ thống và các hoạt động quản trị để đảm bảo minh bạch, truy vết và an toàn vận hành.
              </p>
            </div>

            <div className="rounded-2xl border border-success/15 bg-success/10 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-success/80">
                <span className="h-2 w-2 rounded-full bg-success" />
                Monitoring
              </div>
              <div className="mt-1 text-sm font-black text-base-content">Đang ghi nhận hoạt động</div>
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const SummaryIcon = card.icon;

          return (
            <div key={card.label} className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/45">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-base-content">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-base-content/50">
                    {card.description}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <SummaryIcon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Logs Table */}
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-base-300 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-base-content">Dòng sự kiện gần đây</h3>
            <p className="mt-1 text-sm font-medium text-base-content/55">
              Kiểm tra thao tác quản trị, nguồn truy cập và đối tượng bị tác động.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-base-300 bg-base-200 px-3 py-2 text-xs font-bold text-base-content/60">
            <Lucide.Search size={14} />
            Chế độ xem chỉ đọc
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="rounded-3xl bg-base-200 p-5 text-base-content/40">
              <Lucide.FileSearch size={36} />
            </div>
            <h3 className="mt-4 text-lg font-black text-base-content">Chưa có nhật ký hệ thống</h3>
            <p className="mt-2 max-w-md text-sm font-medium leading-6 text-base-content/55">
              Khi có thao tác quản trị hoặc thay đổi cấu hình, hệ thống sẽ hiển thị lịch sử tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="bg-base-200 text-[11px] font-black uppercase tracking-[0.16em] text-base-content/45">
                  <th className="px-6 py-4">Tác nhân</th>
                  <th className="px-6 py-4">Hành động</th>
                  <th className="px-6 py-4">Đối tượng</th>
                  <th className="px-6 py-4">Thiết bị / IP</th>
                  <th className="px-6 py-4 text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {auditLogs.map((log) => {
                  const actionMeta = getActionMeta(log.action);
                  const ActionIcon = actionMeta.icon;

                  return (
                    <tr key={log.auditId} className="transition-colors hover:bg-base-200/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Lucide.UserRound size={18} />
                          </div>
                          <div>
                            <div className="font-black text-base-content">{log.userId || 'Không xác định'}</div>
                            <div className="text-xs font-semibold text-base-content/45">Tài khoản hệ thống</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-2xl p-2 ${actionMeta.iconClass}`}>
                            <ActionIcon size={16} />
                          </div>
                          <div>
                            <div className="font-black text-base-content">{log.action || 'Không có hành động'}</div>
                            <div className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${actionMeta.badgeClass}`}>
                              {actionMeta.label}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex max-w-xs items-center gap-2 rounded-2xl border border-base-300 bg-base-200 px-3 py-2">
                          <Lucide.Box size={15} className="shrink-0 text-base-content/45" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-base-content">
                              {log.entityName || 'Không xác định'}
                            </div>
                            <div className="truncate text-xs font-semibold text-base-content/45">
                              ID: {log.entityId || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-base-content">IP: {log.ipAddress || 'N/A'}</div>
                        <div className="mt-1 max-w-xs truncate text-xs font-medium text-base-content/45">
                          {log.userAgent || 'Không có User Agent'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-base-content">{formatDateTime(log.createdAt)}</div>
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
