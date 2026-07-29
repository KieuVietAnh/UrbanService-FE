import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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

const getAiMessageText = (payload) => (
  payload?.message ||
  payload?.messageText ||
  payload?.reply ||
  payload?.content ||
  payload?.data?.message ||
  payload?.data?.messageText ||
  payload?.data?.reply ||
  ''
);

const getAiConversationId = (payload) => (
  payload?.conversationId ||
  payload?.conversationID ||
  payload?.id ||
  payload?.data?.conversationId ||
  payload?.data?.conversationID ||
  payload?.data?.id ||
  payload?.result?.conversationId ||
  payload?.result?.conversationID ||
  payload?.result?.id ||
  payload?.conversation?.conversationId ||
  payload?.conversation?.conversationID ||
  payload?.conversation?.id ||
  payload?.data?.conversation?.conversationId ||
  payload?.data?.conversation?.conversationID ||
  payload?.data?.conversation?.id ||
  null
);

const normalizeAiMessage = (message, index = 0) => ({
  id: message?.messageId || message?.id || `${message?.createdAt || Date.now()}-${index}`,
  sender: String(message?.senderType || message?.sender || '').toLowerCase().includes('user') ? 'user' : 'ai',
  text: getAiMessageText(message),
  createdAt: message?.createdAt,
});

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const CitizenAiCopilot = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const isCitizen = normalizeRole(user?.role) === APP_ROLES.SERVICE_USER;
  const [chatOpen, setChatOpen] = useState(false);
  const routeFeedbackId = location.pathname.startsWith('/tickets/') && params.feedbackId
    ? params.feedbackId
    : null;
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Chào bạn! Tôi là UrbanMind Assist — trợ giúp bạn điều hướng quy trình phản ánh và giám sát vận hành đô thị. Bạn cần hỗ trợ gì hôm nay?',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [reflection, setReflection] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingReply, setLoadingReply] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [showAiDraftForm, setShowAiDraftForm] = useState(false);
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

  const loadConversations = async () => {
    setConversationsLoading(true);
    try {
      setConversations(await toolsApi.getAiConversations());
    } catch (error) {
      console.warn('Unable to load AI conversations', error);
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  useEffect(() => {
    if (chatOpen) loadConversations();
  }, [chatOpen]);

  const selectConversation = async (conversationId) => {
    setActiveConversationId(conversationId);
    setMessagesLoading(true);
    try {
      const messages = await toolsApi.getAiConversationMessages(conversationId);
      setChatMessages(messages.map(normalizeAiMessage).filter((message) => message.text));
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        { sender: 'ai', text: 'Không thể tải tin nhắn của hội thoại này.' },
      ]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setChatMessages([
      {
        sender: 'ai',
        text: routeFeedbackId
          ? `Bạn đang chat theo ngữ cảnh phản ánh #${routeFeedbackId}. Hãy nhập câu hỏi cần AI hỗ trợ.`
          : 'Chào bạn! Tôi là UrbanMind Assist — trợ giúp bạn điều hướng quy trình phản ánh và giám sát vận hành đô thị. Bạn cần hỗ trợ gì hôm nay?',
      },
    ]);
  };

  const toggleChat = () => setChatOpen((current) => !current);

  const handleSendMessage = async () => {
    if (!inputVal.trim() || loadingReply) return;

    const userMsg = inputVal.trim();
    setInputVal('');
    setReflection((current) => current || userMsg);
    setChatMessages((current) => [...current, { sender: 'user', text: userMsg }]);
    setLoadingReply(true);

    try {
      const payload = {
        conversationId: activeConversationId ?? null,
        message: userMsg,
        ...(!activeConversationId && routeFeedbackId ? { feedbackId: routeFeedbackId } : {}),
      };
      const response = await toolsApi.getAiChatReply(payload);
      const replyText = getAiMessageText(response);
      const nextConversationId = getAiConversationId(response);
      if (nextConversationId) setActiveConversationId(nextConversationId);
      setChatMessages((current) => [
        ...current,
        {
          sender: 'ai',
          text: replyText || 'Mình đã ghi nhận nội dung. Hãy bổ sung vị trí và ảnh nếu có, sau đó bấm “Tạo bản nháp phản ánh”.',
        },
      ]);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          sender: 'ai',
          text: error?.message || 'Chưa thể kết nối AI chat. Bạn vẫn có thể nhập đủ thông tin và tạo bản nháp phản ánh.',
        },
      ]);
      loadConversations();
    } finally {
      setLoadingReply(false);
    }
  };

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      setChatMessages((current) => [
        ...current,
        { sender: 'ai', text: 'Trình duyệt chưa hỗ trợ lấy GPS. Bạn hãy nhập vị trí dạng văn bản.' },
      ]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;
        setLatitude(String(nextLatitude));
        setLongitude(String(nextLongitude));
        setLocationText((current) => current || `Vị trí GPS: ${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}`);
      },
      () => {
        setChatMessages((current) => [
          ...current,
          { sender: 'ai', text: 'Không thể lấy GPS. Bạn hãy nhập vị trí dạng văn bản.' },
        ]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    setSelectedImages(files.slice(0, 5));
  };

  const handleCreateDraft = async () => {
    const text = reflection.trim() || inputVal.trim();
    if (!text || creatingDraft) {
      setChatMessages((current) => [
        ...current,
        { sender: 'ai', text: 'Bạn hãy nhập nội dung phản ánh trước khi tạo bản nháp.' },
      ]);
      return;
    }

    setCreatingDraft(true);

    try {
      const base64Images = await Promise.all(selectedImages.map(fileToBase64));
      const draft = await toolsApi.createAiFeedbackDraft({
        reflection: text,
        location: locationText.trim(),
        latitude: latitude === '' ? null : Number(latitude),
        longitude: longitude === '' ? null : Number(longitude),
        imageUrls: [],
        base64Images,
      });

      navigate('/tickets/create', {
        state: {
          aiDraft: draft,
          aiDraftSource: {
            reflection: text,
            imageNames: selectedImages.map((file) => file.name),
          },
        },
      });
      setChatOpen(false);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          sender: 'ai',
          text: error?.message || 'Không thể tạo bản nháp phản ánh bằng AI. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setCreatingDraft(false);
    }
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

          <div className="border-b border-base-300 bg-base-100 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                Hội thoại của tôi
              </span>
              <button type="button" onClick={startNewConversation} className="btn btn-ghost btn-xs rounded-xl">
                Chat mới
              </button>
            </div>
            {routeFeedbackId ? (
              <p className="mb-2 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary">
                Chat theo phản ánh #{routeFeedbackId}
              </p>
            ) : null}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {conversationsLoading ? (
                <span className="loading loading-dots loading-xs" />
              ) : conversations.length > 0 ? conversations.map((conversation) => {
                const conversationId = conversation.conversationId || conversation.id;
                return (
                  <button
                    key={conversationId}
                    type="button"
                    onClick={() => selectConversation(conversationId)}
                    className={`max-w-44 shrink-0 rounded-xl border px-3 py-2 text-left text-[11px] transition ${
                      String(activeConversationId) === String(conversationId)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-base-300 bg-base-100 hover:border-primary/40'
                    }`}
                  >
                    <span className="block truncate font-bold">
                      {conversation.title || `Hội thoại #${conversationId}`}
                    </span>
                    <span className="mt-0.5 block truncate text-base-content/55">
                      {conversation.lastMessage || `${conversation.messageCount || 0} tin nhắn`}
                    </span>
                  </button>
                );
              }) : (
                <span className="text-[11px] text-base-content/50">Chưa có hội thoại cũ.</span>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-base-200/50 p-4">
            {messagesLoading ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner loading-sm" />
              </div>
            ) : null}
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

          <div className="border-t border-base-300 bg-base-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowAiDraftForm((current) => !current)}
              className="btn btn-outline btn-sm w-full rounded-xl"
              aria-expanded={showAiDraftForm}
            >
              <Lucide.FilePlus2 size={14} />
              Tạo phản ánh bằng AI
              {showAiDraftForm ? <Lucide.ChevronDown size={14} /> : <Lucide.ChevronUp size={14} />}
            </button>

            {showAiDraftForm ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={reflection}
                  onChange={(event) => setReflection(event.target.value)}
                  placeholder="Mô tả phản ánh tự nhiên, ví dụ: Đường trước nhà tôi có ổ gà lớn..."
                  className="textarea textarea-bordered textarea-xs min-h-16 w-full rounded-xl text-xs"
                />
                <input
                  type="text"
                  value={locationText}
                  onChange={(event) => setLocationText(event.target.value)}
                  placeholder="Vị trí dạng text"
                  className="input input-bordered input-xs w-full rounded-xl text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="Latitude"
                    className="input input-bordered input-xs rounded-xl text-xs"
                  />
                  <input
                    type="number"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="Longitude"
                    className="input input-bordered input-xs rounded-xl text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleUseBrowserLocation} className="btn btn-xs btn-outline rounded-xl">
                    <Lucide.MapPin size={12} />
                    GPS
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="file-input file-input-bordered file-input-xs min-w-0 flex-1 rounded-xl text-xs"
                  />
                </div>
                {selectedImages.length > 0 ? (
                  <p className="text-[10px] text-base-content/60">
                    Đã chọn {selectedImages.length} ảnh: {selectedImages.map((file) => file.name).join(', ')}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleCreateDraft}
                  disabled={creatingDraft}
                  className="btn btn-primary btn-sm w-full rounded-xl"
                >
                  {creatingDraft ? <span className="loading loading-spinner loading-xs" /> : <Lucide.FilePlus2 size={14} />}
                  Tạo bản nháp phản ánh
                </button>
              </div>
            ) : null}
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
