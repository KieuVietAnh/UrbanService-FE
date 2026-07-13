import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import PageTransition from '../../components/motion/PageTransition';
import { managementTypes } from '@urbanmind/shared-types';

const TEMPLATE_OPTIONS = [
  {
    title: 'Thiếu ảnh minh chứng',
    body: 'Cảm ơn bạn. Để chúng tôi tiếp tục xử lý phản ánh này, vui lòng gửi thêm hình ảnh hoặc video minh chứng tại hiện trường để xác nhận tình trạng.',
  },
  {
    title: 'Thiếu thông tin vị trí',
    body: 'Phản ánh hiện chưa đủ thông tin về vị trí chính xác. Vui lòng cung cấp thêm địa chỉ chi tiết hoặc điểm tham chiếu gần nhất.',
  },
  {
    title: 'Cần xác nhận tình trạng',
    body: 'Chúng tôi cần xác nhận tình trạng hiện tại sau khi xử lý ban đầu. Vui lòng cho biết trạng thái hiện tại và thời điểm bạn quan sát thấy.',
  },
];

const CHECKLIST_ITEMS = [
  'Ảnh/video minh chứng',
  'Thông tin vị trí chính xác',
  'Mô tả hiện trạng mới',
  'Thông tin liên hệ bổ sung',
  'Xác nhận thời điểm xảy ra',
];

export const RequestInfoWorkspacePage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [draftSaved, setDraftSaved] = useState(false);

  const [selectedChecklist, setSelectedChecklist] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [requestType, setRequestType] = useState('additional-info');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await managementFeedbackApi.getFeedbackById(feedbackId);
        setFeedback(result);
      } catch (err) {
        console.error('Failed to load feedback for request-info', err);
        setError(err?.message || 'Không thể tải thông tin phản ánh.');
      } finally {
        setLoading(false);
      }
    };

    if (feedbackId) {
      loadFeedback();
    }
  }, [feedbackId]);

  const selectedTemplate = useMemo(() => {
    const base = TEMPLATE_OPTIONS.find((option) => option.title === requestType) || TEMPLATE_OPTIONS[0];
    return base;
  }, [requestType]);

  const toggleChecklist = (item) => {
    setSelectedChecklist((prev) =>
      prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item]
    );
  };

  const handleApplyTemplate = (template) => {
    setRequestType(template.title);
    setMessageText(template.body);
    setDraftSaved(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setDraftSaved(true);
      setMessage({ type: 'success', text: 'Bản nháp đã được lưu trong phiên làm việc này.' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể lưu bản nháp.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendRequest = async () => {
    if (!messageText.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nội dung yêu cầu.' });
      return;
    }

    setSending(true);
    try {
      await managementFeedbackApi.updateStatus(feedbackId, {
        status: managementTypes.feedbackStatus.SUBMITTED,
        note: messageText,
      });
      setMessage({ type: 'success', text: 'Đã gửi yêu cầu thông tin cho người dân.' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || 'Không thể gửi yêu cầu này.' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="page-container space-y-4 py-4">
          <div className="animate-pulse rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-44 rounded-full bg-slate-100" />
            <div className="mt-4 h-8 w-2/3 rounded-2xl bg-slate-100" />
            <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-100" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="page-container space-y-6 py-4 text-slate-800">
        {message.type === 'success' && <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}
        {message.type === 'error' && <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />}

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">
                <Lucide.MessageSquarePlus size={14} />
                Yêu cầu thêm thông tin
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">Workspace yêu cầu bổ sung thông tin</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">Gửi một yêu cầu rõ ràng, có cấu trúc và có thể hành động ngay cho người dân để rút ngắn vòng lặp xử lý.</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} className="btn btn-ghost rounded-2xl text-sm">
              Quay lại chi tiết
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Lucide.FileText size={16} className="text-slate-600" />
                Tóm tắt phản ánh
              </div>
              <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Tiêu đề</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{feedback?.title || '—'}</p>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Nội dung</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{feedback?.description || 'Không có mô tả.'}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 text-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Danh mục</p>
                  <p className="mt-2 font-semibold text-slate-700">{feedback?.categoryName || '—'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 text-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Đơn vị xử lý</p>
                  <p className="mt-2 font-semibold text-slate-700">{feedback?.assignment?.operatorName || 'Chưa phân công'}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Lucide.ListChecks size={16} className="text-slate-600" />
                Checklist thông tin còn thiếu
              </div>
              <div className="mt-4 space-y-2">
                {CHECKLIST_ITEMS.map((item) => {
                  const checked = selectedChecklist.includes(item);
                  return (
                    <label key={item} className="flex cursor-pointer items-center justify-between rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      <span>{item}</span>
                      <input type="checkbox" checked={checked} onChange={() => toggleChecklist(item)} className="checkbox checkbox-primary checkbox-sm" />
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Lucide.LayoutTemplate size={16} className="text-slate-600" />
                Mẫu phản hồi đề xuất
              </div>
              <div className="mt-4 space-y-3">
                {TEMPLATE_OPTIONS.map((template) => (
                  <button key={template.title} type="button" onClick={() => handleApplyTemplate(template)} className={`w-full rounded-[1.2rem] border px-4 py-3 text-left transition ${requestType === template.title ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="text-sm font-semibold text-slate-800">{template.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{template.body}</div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Lucide.Edit3 size={16} className="text-slate-600" />
                Soạn tin nhắn cho công dân
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="font-semibold text-slate-700">Đang dùng mẫu</div>
                  <div className="mt-1">{selectedTemplate.title}</div>
                </div>

                <textarea
                  rows="8"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Nhập yêu cầu bổ sung thông tin cho công dân..."
                  className="textarea textarea-bordered w-full rounded-[1.2rem] border-slate-200 bg-white text-sm"
                />

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleSaveDraft} disabled={saving} className="btn btn-outline btn-primary rounded-2xl">
                    {saving ? <span className="loading loading-spinner" /> : <><Lucide.Save size={16} className="mr-2" />Lưu bản nháp</>}
                  </button>
                  <button type="button" onClick={() => navigate(`/staff/feedbacks/${feedbackId}`)} className="btn btn-ghost rounded-2xl">Hủy</button>
                  <button type="button" onClick={handleSendRequest} disabled={sending} className="btn btn-primary rounded-2xl">
                    {sending ? <span className="loading loading-spinner" /> : <><Lucide.Send size={16} className="mr-2" />Gửi yêu cầu</>}
                  </button>
                </div>

                {draftSaved && (
                  <div className="rounded-[1.1rem] border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                    Bản nháp đã được lưu sẵn sàng gửi sau.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Lucide.Clock3 size={16} className="text-slate-600" />
                Lịch sử yêu cầu
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">Yêu cầu mới</span>
                    <span className="text-[11px] text-slate-400">Mới</span>
                  </div>
                  <p className="mt-2">Sẵn sàng gửi cho công dân với nội dung vừa soạn.</p>
                </div>
                <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Chưa có lịch sử yêu cầu bổ sung thông tin trước đây cho phản ánh này.
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
