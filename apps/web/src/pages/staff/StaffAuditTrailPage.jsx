import { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toolsApi } from '@urbanmind/shared-api';
import PageTransition from '../../components/motion/PageTransition';

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getActionMeta = (action = '') => {
  const normalized = `${action}`.toLowerCase();
  if (normalized.includes('delete') || normalized.includes('remove')) {
    return { label: 'Xóa', icon: Lucide.Trash2, tone: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
  }
  if (normalized.includes('create') || normalized.includes('add')) {
    return { label: 'Tạo', icon: Lucide.PlusCircle, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  }
  if (normalized.includes('update') || normalized.includes('change') || normalized.includes('edit')) {
    return { label: 'Cập nhật', icon: Lucide.PencilLine, tone: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  }
  if (normalized.includes('login') || normalized.includes('auth')) {
    return { label: 'Truy cập', icon: Lucide.LogIn, tone: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' };
  }
  return { label: 'Theo dõi', icon: Lucide.Activity, tone: 'border-slate-200 bg-slate-50 text-slate-700', dot: 'bg-slate-500' };
};

const readValue = (value) => {
  if (!value) return '—';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed);
    } catch {
      return value;
    }
  }
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
};

export const StaffAuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const response = await toolsApi.getAuditLogs();
        setLogs(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error('Failed to load audit logs', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter((log) => {
      const createdAt = log?.createdAt ? new Date(log.createdAt) : null;
      let dateMatch = true;

      if (dateFilter === '30') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        dateMatch = createdAt && createdAt >= cutoff;
      } else if (dateFilter === '90') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 90);
        dateMatch = createdAt && createdAt >= cutoff;
      } else if (dateFilter === '365') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 365);
        dateMatch = createdAt && createdAt >= cutoff;
      }

      const userMatch = userFilter === 'all' || String(log?.userId || '').toLowerCase() === userFilter.toLowerCase();
      const actionMatch = actionFilter === 'all' || `${log?.action || ''}`.toLowerCase().includes(actionFilter.toLowerCase());

      return dateMatch && userMatch && actionMatch;
    });
  }, [actionFilter, dateFilter, logs, userFilter]);

  const users = useMemo(() => Array.from(new Set(logs.map((log) => log.userId).filter(Boolean))), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action).filter(Boolean))), [logs]);

  return (
    <PageTransition>
      <div className="space-y-5 text-slate-800">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.8)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] backdrop-blur">
                <Lucide.ShieldCheck size={14} />
                Nhật ký kiểm toán
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Theo dõi toàn bộ hành động quan trọng</h1>
                <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
                  Giao diện timeline-first giúp nhân viên nắm nhanh ai đã làm gì, khi nào và thay đổi gì trong phản ánh hoặc hệ thống.
                </p>
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Sự kiện ghi nhận</div>
              <div className="mt-1 text-xl font-black text-white">{logs.length}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <span>Ngày</span>
              <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="select select-bordered rounded-[1rem] border-slate-200 bg-slate-50 text-sm">
                <option value="all">Tất cả thời gian</option>
                <option value="30">30 ngày gần đây</option>
                <option value="90">90 ngày gần đây</option>
                <option value="365">1 năm gần đây</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <span>Người dùng</span>
              <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} className="select select-bordered rounded-[1rem] border-slate-200 bg-slate-50 text-sm">
                <option value="all">Tất cả người dùng</option>
                {users.map((userId) => (
                  <option key={userId} value={userId}>{userId}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <span>Loại hành động</span>
              <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="select select-bordered rounded-[1rem] border-slate-200 bg-slate-50 text-sm">
                <option value="all">Tất cả</option>
                {actions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-[1.6rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Đang tải lịch sử hành động...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Không có sự kiện nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const actionMeta = getActionMeta(log.action);
              const ActionIcon = actionMeta.icon;
              return (
                <article key={log.auditId} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${actionMeta.tone}`}>
                        <ActionIcon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-black text-slate-900">{log.action || 'Hành động hệ thống'}</h2>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${actionMeta.tone}`}>
                            {actionMeta.label}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                            <Lucide.UserRound size={14} />
                            {log.userId || 'Không xác định'}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                            <Lucide.Clock3 size={14} />
                            {formatDateTime(log.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                            <Lucide.FileText size={14} />
                            {log.entityName || 'Không xác định'}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Mã phản ánh</div>
                            <div className="mt-2 font-semibold text-slate-700">{log.entityId || '—'}</div>
                          </div>
                          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Giá trị cũ</div>
                            <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{readValue(log.oldValues)}</div>
                          </div>
                          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 xl:col-span-2">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Giá trị mới</div>
                            <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{readValue(log.newValues)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </PageTransition>
  );
};

export default StaffAuditTrailPage;
