import { useEffect, useMemo, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useFeedbackMessages } from '../../contexts/FeedbackMessagesContext';
import DelightToast from '../delight/DelightToast';

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

const isStaffLikeMessage = (message) => {
  const role = `${message?.userRole || ''}`.toLowerCase();
  const senderType = `${message?.senderType || ''}`.toLowerCase();
  return role.includes('staff') || role.includes('manager') || role.includes('admin') || role.includes('system') || senderType.includes('staff') || senderType.includes('system');
};

export default function StaffCommunicationSurface({ feedbackTitle }) {
  const [panel, setPanel] = useState(null);
  const [draft, setDraft] = useState('');
  const [composerMode, setComposerMode] = useState('public');
  const [toastState, setToastState] = useState({ open: false, message: '', sub: '' });
  const messageEndRef = useRef(null);

  const {
    messages,
    messagesLoading,
    messagesError,
    messageSubmitting,
    loadMessages,
    sendMessage,
  } = useFeedbackMessages();

  const openToast = (message, sub = '') => {
    setToastState({ open: true, message, sub });
  };

  useEffect(() => {
    if (panel) {
      loadMessages({ keepMessagesOnError: true });
    }
  }, [panel, loadMessages]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, panel]);

  const orderedMessages = useMemo(() => {
    return Array.isArray(messages)
      ? [...messages].sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0))
      : [];
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed || messageSubmitting) return;

    try {
      const refreshed = await sendMessage({
        messageText: trimmed,
        isInternal: composerMode === 'internal',
      });

      if (!refreshed) {
        openToast(
          'Tin nhắn đã gửi nhưng không thể đồng bộ',
          'Hãy thử làm mới đoạn trao đổi hoặc kiểm tra kết nối.'
        );
      }

      setDraft('');
    } catch (error) {
      console.error('Failed to send feedback message', error);
      openToast('Không thể gửi tin nhắn', error?.message || 'Vui lòng thử lại.');
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[2500] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => setPanel('chat')}
          className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_46px_rgba(11,86,217,0.24)] transition hover:bg-primary/95"
        >
          <Lucide.MessageSquareText size={18} />
          Trao đổi
        </button>
      </div>

      {panel ? (
        <div className="fixed inset-0 z-[2600] flex justify-end bg-primary/15 backdrop-blur-[2px]">
          <div className="flex h-screen w-full max-w-[32rem] flex-col border-l border-primary/20 bg-white shadow-[0_24px_80px_rgba(11,86,217,0.24)]">
            <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-5 py-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                  Trao đổi ticket
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {feedbackTitle || 'Phản ánh'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-200"
                  aria-label="Đóng"
                >
                  <Lucide.X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden px-5 py-4">
              {messagesLoading ? (
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  <span className="loading loading-spinner loading-sm mr-2" />
                  Đang tải trao đổi...
                </div>
              ) : messagesError ? (
                <div className="rounded-[1rem] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{messagesError}</div>
              ) : orderedMessages.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Chưa có trao đổi nào. Gửi câu trả lời đầu tiên cho người dân hoặc tạo ghi chú nội bộ.
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                  {orderedMessages.map((message) => {
                    const isInternal = Boolean(message?.isInternal);
                    const isStaff = isStaffLikeMessage(message);
                    return (
                      <div key={message.interactionMessageId || message.id} className={`flex ${isStaff || isInternal ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[88%] rounded-[1.15rem] border px-3 py-3 shadow-sm ${isInternal ? 'border-amber-200 bg-amber-50 text-amber-900' : isStaff ? 'border-primary/20 bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-700'}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${isInternal ? 'bg-amber-200 text-amber-800' : isStaff ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'}`}>
                              {isInternal ? 'Nội bộ' : isStaff ? 'Nhân viên' : 'Công dân'}
                            </span>
                            {isInternal ? (
                              <span className="rounded-full bg-amber-200/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                                Internal
                              </span>
                            ) : null}
                            <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isInternal ? 'text-amber-700' : isStaff ? 'text-slate-200' : 'text-slate-400'}`}>
                              {message?.userFullName || 'Không rõ'}
                            </span>
                          </div>
                          <div className="mt-2 whitespace-pre-line text-sm leading-6">
                            {message?.messageText || '—'}
                          </div>
                          <div className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${isInternal ? 'text-amber-600' : isStaff ? 'text-slate-300' : 'text-slate-400'}`}>
                            {formatMessageTime(message?.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messageEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-3 py-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {[
                  { id: 'public', label: 'Trả lời người dân' },
                  { id: 'internal', label: 'Ghi chú nội bộ' },
                ].map((tab) => {
                  const selected = composerMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setComposerMode(tab.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${selected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  placeholder="Nhập phản hồi hoặc ghi chú nội bộ..."
                  className="w-full resize-none border-0 bg-transparent px-2 py-1 text-sm outline-none"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">
                    Tin nhắn sẽ được gửi qua API trao đổi hiện có.
                  </div>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={messageSubmitting || !draft.trim()}
                    className="rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {messageSubmitting ? <span className="loading loading-spinner loading-xs" /> : 'Gửi'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <DelightToast
        open={toastState.open}
        message={toastState.message}
        sub={toastState.sub}
        onClose={() => setToastState({ open: false, message: '', sub: '' })}
      />
    </>
  );
}
