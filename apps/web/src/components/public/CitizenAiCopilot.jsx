import { useEffect, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toolsApi } from '@urbanmind/shared-api';
import { APP_ROLES } from '@urbanmind/shared-types';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeRole } from '../../utils/roleMap';

const AI_DOCK_STORAGE_KEY = 'urbanmind-ai-dock-position';
const AI_BUTTON_SIZE = 56;
const AI_MIN_TOP = 96;
const AI_CITIZEN_BOTTOM_GAP = 112;
const AI_DRAG_THRESHOLD = 6;

export const CitizenAiCopilot = () => {
  const { isAuthenticated, user } = useAuth();
  const isCitizen = normalizeRole(user?.role) === APP_ROLES.SERVICE_USER;
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Chào bạn! Tôi là UrbanMind Assist — trợ giúp bạn điều hướng quy trình phản ánh và giám sát vận hành đô thị. Bạn cần hỗ trợ gì hôm nay?',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() => (
    typeof window !== 'undefined' ? window.innerHeight : 900
  ));
  const [aiDock, setAiDock] = useState(() => {
    if (typeof window === 'undefined') return 'bottom';
    const savedDock = window.localStorage.getItem(AI_DOCK_STORAGE_KEY);
    return ['top', 'middle', 'bottom'].includes(savedDock) ? savedDock : 'bottom';
  });
  const [aiDragTop, setAiDragTop] = useState(null);
  const [aiDragging, setAiDragging] = useState(false);
  const aiDragStateRef = useRef(null);
  const suppressAiClickRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      setAiDragTop(null);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated || !isCitizen) return null;

  const getAiDockTop = (dock) => {
    const maxTop = Math.max(
      AI_MIN_TOP,
      viewportHeight - AI_BUTTON_SIZE - AI_CITIZEN_BOTTOM_GAP
    );

    if (dock === 'top') return AI_MIN_TOP;
    if (dock === 'middle') return Math.round((AI_MIN_TOP + maxTop) / 2);
    return maxTop;
  };

  const clampAiTop = (top) => {
    const maxTop = Math.max(
      AI_MIN_TOP,
      viewportHeight - AI_BUTTON_SIZE - AI_CITIZEN_BOTTOM_GAP
    );
    return Math.min(maxTop, Math.max(AI_MIN_TOP, top));
  };

  const handleAiPointerDown = (event) => {
    if (window.innerWidth < 768 || chatOpen) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    aiDragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: aiDragTop ?? getAiDockTop(aiDock),
      moved: false,
    };
    setAiDragging(true);
  };

  const handleAiPointerMove = (event) => {
    const dragState = aiDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - dragState.startY;
    if (Math.abs(deltaY) >= AI_DRAG_THRESHOLD) dragState.moved = true;

    if (dragState.moved) {
      event.preventDefault();
      setAiDragTop(clampAiTop(dragState.startTop + deltaY));
    }
  };

  const finishAiDrag = (event) => {
    const dragState = aiDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (dragState.moved) {
      const currentTop = clampAiTop(
        dragState.startTop + event.clientY - dragState.startY
      );
      const dockPositions = {
        top: getAiDockTop('top'),
        middle: getAiDockTop('middle'),
        bottom: getAiDockTop('bottom'),
      };
      const nearestDock = Object.entries(dockPositions).reduce(
        (nearest, [dock, dockTop]) => (
          Math.abs(dockTop - currentTop) < Math.abs(dockPositions[nearest] - currentTop)
            ? dock
            : nearest
        ),
        'bottom'
      );

      setAiDock(nearestDock);
      window.localStorage.setItem(AI_DOCK_STORAGE_KEY, nearestDock);
      suppressAiClickRef.current = true;
    }

    aiDragStateRef.current = null;
    setAiDragTop(null);
    setAiDragging(false);
  };

  const toggleChat = () => setChatOpen((current) => !current);

  const handleSendMessage = () => {
    if (!inputVal.trim() || loadingReply) return;

    const userMsg = inputVal.trim();
    setInputVal('');
    setChatMessages((current) => [...current, { sender: 'user', text: userMsg }]);
    setLoadingReply(true);

    window.setTimeout(() => {
      const replyText = toolsApi.getAiChatReply(userMsg);
      setChatMessages((current) => [...current, { sender: 'ai', text: replyText }]);
      setLoadingReply(false);
    }, 800);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (suppressAiClickRef.current) {
            suppressAiClickRef.current = false;
            return;
          }
          toggleChat();
        }}
        onPointerDown={handleAiPointerDown}
        onPointerMove={handleAiPointerMove}
        onPointerUp={finishAiDrag}
        onPointerCancel={finishAiDrag}
        aria-label={chatOpen ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
        title="Bấm để mở trợ lý. Trên máy tính, kéo dọc cạnh phải để đổi vị trí."
        className={`btn btn-circle btn-primary btn-lg group fixed right-5 z-40 bottom-24 shadow-xl shadow-blue-600/20 transition-[transform,box-shadow,background-color] hover:scale-105 sm:right-6 md:bottom-auto md:cursor-grab md:touch-none md:active:cursor-grabbing lg:right-8 ${
          aiDragging ? 'scale-105 shadow-2xl ring-4 ring-primary/15' : ''
        }`}
        style={
          typeof window !== 'undefined' && window.innerWidth >= 768
            ? {
                top: `${aiDragTop ?? getAiDockTop(aiDock)}px`,
                bottom: 'auto',
                touchAction: 'none',
              }
            : undefined
        }
      >
        <Lucide.Sparkles
          size={24}
          className="transition-transform group-hover:rotate-12"
          aria-hidden="true"
        />
      </button>

      <div
        className={`fixed inset-y-0 right-0 z-[2200] w-[min(24rem,calc(100vw-1rem))] transform border-l border-base-300 bg-base-100 shadow-2xl transition-transform duration-300 ${
          chatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-base-300 bg-primary px-6 py-4 text-primary-content">
            <div className="flex items-center gap-2">
              <Lucide.Sparkles className="animate-pulse" size={20} />
              <div>
                <h3 className="text-sm font-bold">UrbanMind AI Copilot</h3>
                <p className="text-[10px] opacity-75">Tư vấn pháp lý & phản ánh đô thị</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Đóng cửa sổ trợ lý"
              title="Đóng"
              onClick={toggleChat}
              className="btn btn-sm btn-ghost btn-circle text-primary-content hover:bg-primary-focus"
            >
              <Lucide.X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-base-200/50 p-4">
            {chatMessages.map((message, index) => (
              <div
                key={`${message.sender}-${index}`}
                className={`chat ${message.sender === 'ai' ? 'chat-start' : 'chat-end'}`}
              >
                <div className="chat-image avatar">
                  <div className="flex w-8 items-center justify-center rounded-full bg-base-300 p-1">
                    {message.sender === 'ai' ? (
                      <Lucide.Cpu className="h-full w-full text-primary" />
                    ) : user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Người dùng" />
                    ) : (
                      <Lucide.User className="h-full w-full text-primary" />
                    )}
                  </div>
                </div>
                <div
                  className={`chat-bubble max-w-[85%] text-xs font-medium leading-relaxed ${
                    message.sender === 'ai'
                      ? 'border border-base-300 bg-base-100 text-base-content shadow-sm'
                      : 'bg-primary text-primary-content shadow-sm'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {loadingReply ? (
              <div className="chat chat-start">
                <div className="chat-image avatar">
                  <div className="w-8 rounded-full bg-base-300 p-1">
                    <Lucide.Cpu className="h-full w-full animate-bounce text-primary" />
                  </div>
                </div>
                <div className="chat-bubble flex items-center gap-1.5 border border-base-300 bg-base-100 py-3">
                  <span className="loading loading-dots loading-xs" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-base-300 bg-base-100 px-4 py-2">
            <span className="mb-1 w-full text-[10px] font-bold text-gray-500">Gợi ý câu hỏi nhanh:</span>
            {[
              ['Mức phạt vứt rác?', 'Mức xử phạt vứt rác bừa bãi?'],
              ['SLA sửa đèn đường?', 'Quy định SLA sửa bóng đèn cháy?'],
              ['Báo mất nắp hố ga?', 'Lỗi mất nắp cống hố ga báo thế nào?'],
            ].map(([label, question]) => (
              <button
                key={label}
                type="button"
                onClick={() => setInputVal(question)}
                className="badge badge-outline cursor-pointer py-2 text-[10px] transition-colors hover:badge-primary"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-t border-base-300 bg-base-100 p-4">
            <input
              type="text"
              placeholder="Hỏi AI về luật, thủ tục phản ánh..."
              aria-label="Hỏi AI"
              value={inputVal}
              onChange={(event) => setInputVal(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSendMessage()}
              className="input input-bordered input-sm flex-1 rounded-xl text-xs"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              aria-label="Gửi tin nhắn"
              title="Gửi"
              className="btn btn-sm btn-primary btn-square rounded-xl"
              disabled={loadingReply}
            >
              <Lucide.SendHorizontal size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CitizenAiCopilot;
