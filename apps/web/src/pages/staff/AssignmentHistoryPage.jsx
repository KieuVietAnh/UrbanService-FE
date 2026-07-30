import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import Badge from '../../components/design-system/Badge';
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

export const AssignmentHistoryPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

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

    if (feedbackId) {
      loadFeedback();
    }
  }, [feedbackId]);

  const assignmentEvents = useMemo(() => {
    const sourceList = Array.isArray(feedback?.assignmentHistory)
      ? feedback.assignmentHistory
      : Array.isArray(feedback?.assignmentHistories)
        ? feedback.assignmentHistories
        : [];

    const normalized = sourceList.map((entry, index) => ({
      id: entry?.id || entry?.historyId || `${feedbackId}-${index}`,
      type: normalizeEventType(entry),
      title: entry?.title || entry?.note || 'Cập nhật phân công',
      assignedBy: entry?.assignedBy || entry?.assignedByName || entry?.changedByUserName || 'Hệ thống',
      assignedTo: entry?.assignedTo || entry?.assignedToName || entry?.operatorName || entry?.currentAssignee || feedback?.assignment?.operatorName || 'Chưa phân công',
      assignmentDate: entry?.assignmentDate || entry?.changedAt || entry?.assignedAt || feedback?.assignment?.assignedAt || feedback?.updatedAt,
      previousAssignee: entry?.previousAssignee || entry?.previousOperatorName || '—',
      currentAssignee: entry?.currentAssignee || entry?.assignedTo || entry?.assignedToName || entry?.operatorName || feedback?.assignment?.operatorName || 'Chưa phân công',
      note: entry?.note || entry?.description || entry?.details || 'Cập nhật quyền sở hữu cho phản ánh.',
    }));

    if (normalized.length > 0) {
      return normalized;
    }

    const fallbackAssignee = feedback?.assignment?.operatorName || feedback?.operatorName || feedback?.assignedOperatorName || 'Chưa phân công';
    const fallbackAssignedBy = feedback?.assignment?.assignedByName || feedback?.assignedByName || 'Hệ thống';

    return [
      {
        id: `${feedbackId}-fallback`,
        type: 'assignment',
        title: 'Phân công ban đầu',
        assignedBy: fallbackAssignedBy,
        assignedTo: fallbackAssignee,
        assignmentDate: feedback?.assignment?.assignedAt || feedback?.createdAt || feedback?.updatedAt,
        previousAssignee: '—',
        currentAssignee: fallbackAssignee,
        note: feedback?.assignment?.note || 'Phản ánh đã được đưa vào quy trình xử lý hiện tại.',
      },
    ];
  }, [feedback, feedbackId]);

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

  return (
    <PageTransition>
      <div className="admin-page-shell page-container space-y-6 py-4 text-slate-800">
        {error && <ErrorAlert message={error} onClose={() => setError('')} />}

        <div className="admin-page-hero p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Badge intent="info" className="gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                <Lucide.History size={14} />
                Lịch sử phân công
              </Badge>
              <div>
                <h1 className="admin-hero-title">Theo dõi thay đổi người phụ trách</h1>
                <p className="admin-hero-description mt-2 max-w-2xl">Một dòng thời gian rõ ràng cho các lần phân công, chuyển giao và leo thang xử lý, giúp đội vận hành giữ được sự minh bạch và trách nhiệm.</p>
              </div>
            </div>
            <Button type="button" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} variant="ghost" size="sm">
              Quay lại chi tiết
            </Button>
          </div>
        </div>

        <div className="admin-panel p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="admin-section-title uppercase tracking-[0.24em]">Phản ánh</div>
              <h2 className="admin-section-title mt-2">{feedback?.title || '—'}</h2>
              <p className="admin-hero-description mt-2 max-w-2xl">{feedback?.description || 'Không có mô tả bổ sung.'}</p>
            </div>
            <div className="admin-inset-panel px-4 py-3">
              <div className="admin-section-description uppercase tracking-[0.24em]">Trạng thái hiện tại</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{feedback?.status || '—'}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = activeFilter === option.id;
            return (
              <Button
                key={option.id}
                type="button"
                onClick={() => setActiveFilter(option.id)}
                variant={active ? 'primary' : 'outline'}
                size="sm"
                className={active ? 'rounded-full' : 'rounded-full'}
              >
                <Icon size={14} />
                {option.label}
              </Button>
            );
          })}
        </div>

        <div className="space-y-4">
          {visibleEvents.length === 0 ? (
            <EmptyState
              title="Chưa có dữ liệu lịch sử"
              description="Chưa có dữ liệu lịch sử cho bộ lọc này."
            />
          ) : (
            visibleEvents.map((event, index) => {
              const Icon = event.type === 'escalation' ? Lucide.Siren : event.type === 'reassignment' ? Lucide.RefreshCw : Lucide.UserCheck;
              return (
                <div key={event.id} className="admin-panel relative p-5 sm:p-6">
                  <div className="absolute left-6 top-6 bottom-[-1.2rem] w-px bg-slate-200" />
                  <div className="flex gap-4">
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{index + 1}. {event.type === 'escalation' ? 'Leo thang' : event.type === 'reassignment' ? 'Chuyển giao' : 'Phân công'}</div>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900">{event.title}</h3>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          {formatDate(event.assignmentDate)}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        <div className="admin-inset-panel p-4">
                          <div className="grid gap-3 text-sm">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Người phân công</div>
                              <div className="mt-1 font-semibold text-slate-700">{event.assignedBy}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Được phân công cho</div>
                              <div className="mt-1 font-semibold text-slate-700">{event.assignedTo}</div>
                            </div>
                          </div>
                        </div>
                        <div className="admin-inset-panel p-4">
                          <div className="grid gap-3 text-sm">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Người phụ trách cũ</div>
                              <div className="mt-1 font-semibold text-slate-700">{event.previousAssignee}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Người phụ trách hiện tại</div>
                              <div className="mt-1 font-semibold text-slate-700">{event.currentAssignee}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="admin-inset-panel mt-4 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Ghi chú</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{event.note}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageTransition>
  );
};
