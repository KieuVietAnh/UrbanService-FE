import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import * as Lucide from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function ConversationQueuePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadConversations = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await managementFeedbackApi.getFeedbacks({ pageIndex: 0, pageSize: 50 });
        const feedbacks = Array.isArray(response?.items) ? response.items : [];
        if (!active) return;
        setItems(feedbacks.map((item) => ({
          feedbackId: item?.feedbackId || item?.id,
          title: item?.title || 'Không có tiêu đề',
          citizenName: item?.userName || item?.reporterName || 'Không rõ',
          messageCount: item?.messageCount ?? item?.interactionMessageCount ?? 0,
          lastActivity: item?.updatedAt || item?.createdAt || null,
          status: item?.status || '',
        })));
      } catch (err) {
        if (!active) return;
        console.error('Failed to load conversation queue', err);
        setError('Không thể tải hàng đợi trao đổi. Vui lòng thử lại.');
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadConversations();
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => ({
    total: items.length,
    withMessages: items.filter((item) => Number(item.messageCount) > 0).length,
  }), [items]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="admin-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Hàng đợi trao đổi</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Quản Lý Hội Thoại</h1>
            <p className="mt-2 text-sm text-slate-500">Theo dõi nhanh các phản ánh có hoạt động trao đổi và mở trực tiếp vào kho làm việc chi tiết.</p>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{summary.total} phản ánh</div>
            <div className="mt-1">{summary.withMessages} phản ánh có trao đổi</div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Chưa có trao đổi nào" description="Các phản ánh sẽ xuất hiện ở đây khi có hoạt động mới." />
      ) : (
        <div className="admin-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Feedback ID</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tiêu đề</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Công dân</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tin nhắn</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Hoạt động cuối</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item) => (
                  <tr key={item.feedbackId} className="cursor-pointer transition hover:bg-slate-50" onClick={() => navigate(`/staff/feedbacks/${item.feedbackId}`)}>
                    <td className="px-4 py-4 font-semibold text-slate-900">{item.feedbackId}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.citizenName}</td>
                    <td className="px-4 py-4 text-slate-600">{item.messageCount}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(item.lastActivity)}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                        <Lucide.MessageSquareText size={12} />
                        {item.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
