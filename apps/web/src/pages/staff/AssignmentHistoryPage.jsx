import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import Button from '../../components/design-system/Button';
import PageTransition from '../../components/motion/PageTransition';
import { EmptyState } from '@urbanmind/shared-ui';

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tất cả', icon: Lucide.ListFilter },
  { id: 'assignment', label: 'Phân công', icon: Lucide.UserCheck },
  { id: 'reassignment', label: 'Chuyển giao', icon: Lucide.RefreshCw },
  { id: 'escalation', label: 'Leo thang', icon: Lucide.Siren },
];

const normalizeEventType = (entry = {}) => {
  const rawType = `${entry?.type || entry?.eventType || entry?.category || ''}`.toLowerCase();
  if (rawType.includes('escal')) return 'escalation';
  if (rawType.includes('reassign') || rawType.includes('transfer') || rawType.includes('handoff')) return 'reassignment';
  return 'assignment';
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusLabel = (status = '') => {
  const labels = {
    Submitted: 'Đã gửi',
    AiReviewed: 'AI đã xem xét',
    AIReviewed: 'AI đã xem xét',
    Verified: 'Đã xác minh',
    Assigned: 'Đã giao',
    InProgress: 'Đang xử lý',
    SubmittedForApproval: 'Chờ duyệt',
    Approved: 'Đã duyệt',
    NeedsRework: 'Cần sửa lại',
    Closed: 'Đã đóng',
    Rejected: 'Không chấp nhận',
  };
  return labels[status] || status || '—';
};

export const AssignmentHistoryPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const hasFeedbackId = Boolean(feedbackId);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await managementFeedbackApi.getFeedbackById(feedbackId);
        setFeedback(result);
      } catch (err) {
        console.error('Failed to load feedback for assignment history', err);
        setError(err?.message || 'Không thể tải lịch sử phân công.');
      } finally {
        setLoading(false);
      }
    };

    if (hasFeedbackId) {
      loadFeedback();
    } else {
      setLoading(false);
    }
  }, [feedbackId, hasFeedbackId]);

  const assignmentEvents = useMemo(() => {
    if (!hasFeedbackId) return [];

    const sourceList = Array.isArray(feedback?.assignmentHistory)
      ? feedback.assignmentHistory
      : Array.isArray(feedback?.assignmentHistories)
        ? feedback.assignmentHistories
        : [];

    return sourceList.map((entry, index) => ({
      id: entry?.id || entry?.historyId || `${feedbackId}-${index}`,
      type: normalizeEventType(entry),
      title: entry?.title || entry?.note || 'Cập nhật phân công',
      assignedBy: entry?.assignedBy || entry?.assignedByName || entry?.changedByUserName || 'Hệ thống',
      assignedTo: entry?.assignedTo || entry?.assignedToName || entry?.operatorName || entry?.currentAssignee || feedback?.assignment?.operatorName || 'Chưa phân công',
      assignmentDate: entry?.assignmentDate || entry?.changedAt || entry?.assignedAt || feedback?.assignment?.assignedAt || feedback?.updatedAt,
      previousAssignee: entry?.previousAssignee || entry?.previousOperatorName || '—',
      currentAssignee: entry?.currentAssignee || entry?.assignedTo || entry?.assignedToName || entry?.operatorName || feedback?.assignment?.operatorName || 'Chưa phân công',
      note: entry?.note || entry?.description || entry?.details || 'Không có ghi chú bổ sung.',
    }));
  }, [feedback, feedbackId, hasFeedbackId]);

  const visibleEvents = useMemo(() => {
    if (activeFilter === 'all') return assignmentEvents;
    return assignmentEvents.filter((event) => event.type === activeFilter);
  }, [activeFilter, assignmentEvents]);

  if (loading) {
    return (
      <PageTransition>
        <div className="page-container py-4">
          <div className="admin-panel animate-pulse p-6">
            <div className="h-5 w-40 rounded-full bg-slate-100" />
            <div className="mt-4 h-8 w-2/3 rounded-2xl bg-slate-100" />
            <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-100" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!hasFeedbackId) {
    return (
      <PageTransition>
        <div className="admin-page-shell page-container space-y-6 py-4 text-slate-800">
          <div className="admin-page-hero p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
                <Lucide.History size={26} />
              </div>
              <div>
                <h1 className="admin-hero-title">Lịch sử phân công</h1>
                <p className="admin-hero-description mt-2 max-w-2xl">Chọn một phản ánh để xem các lần phân công, chuyển giao và leo thang đã được ghi nhận.</p>
              </div>
            </div>
          </div>
          <EmptyState title="Chưa chọn phản ánh" description="Mở một phản ánh từ danh sách để xem lịch sử phân công." />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="admin-page-shell page-container space-y-5 py-4 text-slate-800">
        {error && <ErrorAlert message={error} onClose={() => setError('')} />}

        <div className="admin-page-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
                <Lucide.History size={26} />
              </div>
              <div className="min-w-0">
                <h1 className="admin-hero-title">Lịch sử phân công</h1>
                <p className="admin-hero-description mt-2 max-w-2xl">Theo dõi các lần phân công, chuyển giao và leo thang của phản ánh theo đúng dữ liệu đã ghi nhận.</p>
              </div>
            </div>
            <Button type="button" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} variant="outline" size="sm" className="shrink-0">
              <Lucide.ArrowLeft size={15} />
              Quay lại chi tiết
            </Button>
          </div>
        </div>

        <section className="admin-panel overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Lucide.MessageSquareText size={14} />
                Phản ánh
              </div>
              <h2 className="mt-2 text-lg font-bold text-slate-950">{feedback?.title || '—'}</h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{feedback?.description || 'Không có mô tả bổ sung.'}</p>
            </div>
            <div className="border-t border-slate-200 p-5 lg:min-w-[210px] lg:border-l lg:border-t-0 sm:p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trạng thái hiện tại</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {getStatusLabel(feedback?.status)}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm">
          {FILTER_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = activeFilter === option.id;
            return (
              <Button key={option.id} type="button" onClick={() => setActiveFilter(option.id)} variant={active ? 'primary' : 'outline'} size="sm" className="rounded-full">
                <Icon size={14} />
                {option.label}
              </Button>
            );
          })}
        </div>

        <div className="space-y-3">
          {visibleEvents.length === 0 ? (
            <EmptyState
              title="Chưa có lịch sử phân công"
              description="Hệ thống chưa ghi nhận sự kiện phân công, chuyển giao hoặc leo thang phù hợp với bộ lọc này."
            />
          ) : (
            visibleEvents.map((event, index) => {
              const Icon = event.type === 'escalation' ? Lucide.Siren : event.type === 'reassignment' ? Lucide.RefreshCw : Lucide.UserCheck;
              const typeLabel = event.type === 'escalation' ? 'Leo thang' : event.type === 'reassignment' ? 'Chuyển giao' : 'Phân công';
              return (
                <article key={event.id} className="admin-panel relative overflow-hidden p-5">
                  {index < visibleEvents.length - 1 ? <div className="absolute bottom-[-1rem] left-[2.15rem] top-10 w-px bg-slate-200" /> : null}
                  <div className="flex gap-3">
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{index + 1}. {typeLabel}</div>
                          <h3 className="mt-1 text-base font-bold text-slate-900">{event.title}</h3>
                        </div>
                        <time className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          {formatDate(event.assignmentDate)}
                        </time>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Người phân công</div>
                          <div className="mt-1 font-semibold text-slate-700">{event.assignedBy}</div>
                          <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Được phân công cho</div>
                          <div className="mt-1 font-semibold text-slate-700">{event.assignedTo}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Người phụ trách cũ</div>
                          <div className="mt-1 font-semibold text-slate-700">{event.previousAssignee}</div>
                          <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Người phụ trách hiện tại</div>
                          <div className="mt-1 font-semibold text-slate-700">{event.currentAssignee}</div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Ghi chú</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{event.note}</p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </PageTransition>
  );
};
