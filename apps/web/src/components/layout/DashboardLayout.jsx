// src/components/layout/DashboardLayout.jsx
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import PageTransition from '../motion/PageTransition';
import * as Lucide from 'lucide-react';
import { toolsApi } from '@urbanmind/shared-api';
import { APP_ROLES } from '@urbanmind/shared-types';
import { normalizeRole } from '../../utils/roleMap';
import { useAuth } from '../../contexts/AuthContext';

const AI_DOCK_STORAGE_KEY = 'urbanmind-ai-dock-position';
const AI_BUTTON_SIZE = 56;
const AI_MIN_TOP = 96;
const AI_CITIZEN_BOTTOM_GAP = 112;
const AI_DRAG_THRESHOLD = 6;


export const DashboardLayout = ({ children }) => {

  const { user } = useAuth();
  const location = useLocation();
  const isCitizen = normalizeRole(user?.role) === APP_ROLES.SERVICE_USER;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Chào bạn! Tôi là UrbanMind Assist — trợ giúp bạn điều hướng quy trình phản ánh và giám sát vận hành đô thị. Bạn cần hỗ trợ gì hôm nay?' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() => (
    typeof window !== 'undefined' ? window.innerHeight : 900
  ));
  const [aiDock, setAiDock] = useState(() => {
    if (typeof window === 'undefined') return 'bottom';
    const savedDock = window.localStorage.getItem(AI_DOCK_STORAGE_KEY);
    return ['top', 'middle', 'bottom'].includes(savedDock)
      ? savedDock
      : 'bottom';
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
    if (!isCitizen || window.innerWidth < 768 || chatOpen) return;

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
    if (Math.abs(deltaY) >= AI_DRAG_THRESHOLD) {
      dragState.moved = true;
    }

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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleChat = () => setChatOpen(!chatOpen);

  const handleSendMessage = () => {
    if (!inputVal.trim() || loadingReply) return;

    const userMsg = inputVal;
    setInputVal('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoadingReply(true);

    // Simulate AI response delay
    setTimeout(() => {
      const replyText = toolsApi.getAiChatReply(userMsg);
      setChatMessages(prev => [...prev, { sender: 'ai', text: replyText }]);
      setLoadingReply(false);
    }, 800);
  };

  const handleQuickQuestion = (question) => {
    setInputVal(question);
  };

  const showFooter = isCitizen;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-100 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar navigation */}
        {!isCitizen && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

        {/* Main container */}
        <div className="flex min-w-0 w-full flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          <Header onMenuToggle={toggleSidebar} />

          {/* Main scrollable workspace */}
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950">
            <div className="flex min-h-full flex-col">
              <PageTransition
                key={location.pathname}
                className={`mx-auto w-full flex-1 ${
                  isCitizen
                    ? 'citizen-content-shell max-w-[1600px] px-5 py-7 sm:px-6 lg:px-8 lg:py-8'
                    : 'max-w-7xl space-y-6 p-5 sm:p-6'
                }`}
              >
                {children}
              </PageTransition>
              {showFooter ? <Footer /> : null}
            </div>
          </main>
        </div>
      </div>

      {/* PERSISTENT AI COPILOT FLOATING BUTTON */}
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
        title={
          isCitizen
            ? 'Bấm để mở trợ lý. Trên máy tính, kéo dọc cạnh phải để đổi vị trí.'
            : 'Mở trợ lý AI'
        }
        className={`btn btn-circle btn-primary btn-lg group fixed right-5 z-40 shadow-xl shadow-blue-600/20 transition-[transform,box-shadow,background-color] hover:scale-105 sm:right-6 lg:right-8 ${
          isCitizen ? 'bottom-24 md:bottom-auto' : 'bottom-6'
        } ${
          isCitizen ? 'md:cursor-grab md:touch-none md:active:cursor-grabbing' : ''
        } ${aiDragging ? 'scale-105 shadow-2xl ring-4 ring-primary/15' : ''}`}
        style={
          isCitizen && typeof window !== 'undefined' && window.innerWidth >= 768
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


      {/* AI COPILOT CHAT PANEL (Slide out Drawer) */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[min(24rem,calc(100vw-1rem))] bg-base-100 border-l border-base-300 shadow-2xl transform transition-transform duration-300 ${chatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-primary text-primary-content">
            <div className="flex items-center gap-2">
              <Lucide.Sparkles className="animate-pulse" size={20} />
              <div>
                <h3 className="font-bold text-sm">UrbanMind AI Copilot</h3>
                <p className="text-[10px] opacity-75">Tư vấn pháp lý & phản ánh đô thị</p>
              </div>
            </div>
            <button aria-label="Đóng cửa sổ trợ lý" title="Đóng" onClick={toggleChat} className="btn btn-sm btn-ghost btn-circle text-primary-content hover:bg-primary-focus">
              <Lucide.X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-base-200/50">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat ${msg.sender === 'ai' ? 'chat-start' : 'chat-end'}`}>
                <div className="chat-image avatar">
                  <div className="w-8 rounded-full bg-base-300 p-1 flex items-center justify-center">
                    {msg.sender === 'ai' ? (
                      <Lucide.Cpu className="text-primary w-full h-full" />
                    ) : (
                      <img src={user?.avatarUrl} alt="User" />
                    )}
                  </div>
                </div>
                <div className={`chat-bubble text-xs font-medium leading-relaxed max-w-[85%] ${msg.sender === 'ai'
                  ? 'bg-base-100 text-base-content border border-base-300 shadow-sm'
                  : 'bg-primary text-primary-content shadow-sm'
                  }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loadingReply && (
              <div className="chat chat-start">
                <div className="chat-image avatar">
                  <div className="w-8 rounded-full bg-base-300 p-1">
                    <Lucide.Cpu className="text-primary w-full h-full animate-bounce" />
                  </div>
                </div>
                <div className="chat-bubble bg-base-100 border border-base-300 flex items-center gap-1.5 py-3">
                  <span className="loading loading-dots loading-xs"></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick recommendations */}
          <div className="px-4 py-2 bg-base-100 border-t border-base-300 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-gray-500 font-bold w-full mb-1">Gợi ý câu hỏi nhanh:</span>
            <button
              onClick={() => handleQuickQuestion('Mức xử phạt vứt rác bừa bãi?')}
              className="badge badge-outline hover:badge-primary text-[10px] py-2 cursor-pointer transition-colors"
            >
              Mức phạt vứt rác?
            </button>
            <button
              onClick={() => handleQuickQuestion('Quy định SLA sửa bóng đèn cháy?')}
              className="badge badge-outline hover:badge-primary text-[10px] py-2 cursor-pointer transition-colors"
            >
              SLA sửa đèn đường?
            </button>
            <button
              onClick={() => handleQuickQuestion('Lỗi mất nắp cống hố ga báo thế nào?')}
              className="badge badge-outline hover:badge-primary text-[10px] py-2 cursor-pointer transition-colors"
            >
              Báo mất nắp hố ga?
            </button>
          </div>

          {/* Input form */}
          <div className="p-4 border-t border-base-300 bg-base-100 flex gap-2">
            <input
              type="text"
              placeholder="Hỏi AI về luật, thủ tục phản ánh..."
              aria-label="Hỏi AI"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="input input-bordered input-sm flex-1 text-xs rounded-xl"
            />
            <button
              onClick={handleSendMessage}
              aria-label="Gửi tin nhắn"
              title="Gửi"
              className="btn btn-sm btn-primary btn-square rounded-xl"
              disabled={loadingReply}
            >
              <Lucide.SendHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        ></div>
      )}
    </div>
  );
};
