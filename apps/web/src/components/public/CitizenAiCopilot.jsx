import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { ticketApi, toolsApi } from '@urbanmind/shared-api';
import { APP_ROLES } from '@urbanmind/shared-types';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeRole } from '../../utils/roleMap';

const AI_DOCK_STORAGE_KEY = 'urbanmind-ai-dock-position';
const AI_BUTTON_SIZE = 56;
const AI_MIN_TOP = 96;
const AI_CITIZEN_BOTTOM_GAP = 112;
const AI_DRAG_THRESHOLD = 6;

const DRAFT_STEPS = {
  IDLE: 'idle',
  TITLE: 'title',
  DESCRIPTION: 'description',
  LOCATION: 'location',
  EVIDENCE: 'evidence',
  READY: 'ready',
};

const DRAFT_INTENT_REGEX = /(tạo|tao|lập|lap|gửi|gui).*(phản ánh|phan anh|feedback|ticket)|phản ánh|phan anh/i;

const getDraftQuestion = (step) => {
  if (step === DRAFT_STEPS.TITLE) {
    return 'Bạn muốn đặt tiêu đề phản ánh là gì? Ví dụ: “Đường hư hỏng trước nhà”.';
  }

  if (step === DRAFT_STEPS.DESCRIPTION) {
    return 'Bạn mô tả chi tiết sự việc giúp tôi nhé: vấn đề là gì, mức độ ảnh hưởng/khẩn cấp ra sao?';
  }

  if (step === DRAFT_STEPS.LOCATION) {
    return 'Vị trí cụ thể ở đâu? Bạn có thể nhập địa chỉ hoặc bấm nút GPS bên dưới.';
  }

  if (step === DRAFT_STEPS.EVIDENCE) {
    return 'Bạn có ảnh minh chứng không? Nếu có hãy bấm nút “Ảnh” bên dưới để chọn ảnh, hoặc nhắn “không có” để bỏ qua.';
  }

  return 'Đã đủ thông tin cơ bản. Bạn bấm “Tạo bản nháp” để tôi tạo phản ánh cho bạn.';
};

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
  reader.onload = () => {
    const result = String(reader.result || '');
    const [, rawBase64 = result] = result.split(',');
    resolve(rawBase64);
  };
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
  const [draftStep, setDraftStep] = useState(DRAFT_STEPS.IDLE);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [reflection, setReflection] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingReply, setLoadingReply] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
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
  if (chatOpen) {
    loadConversations();
  }
}, [chatOpen]);

if (!isAuthenticated || !isCitizen) {
  return null;
}

const selectConversation = async (conversationId) => {
    setActiveConversationId(conversationId);
    setMessagesLoading(true);
    try {
      const messages = await toolsApi.getAiConversationMessages(conversationId);
      setChatMessages(messages.map(normalizeAiMessage).filter((message) => message.text));
    } catch {
  setChatMessages((current) => [
    ...current,
    { sender: 'ai', text: 'Không thể tải tin nhắn của hội thoại này.' },
  ]);
} finally {
      setMessagesLoading(false);
    }
  };

  const resetDraftFlow = () => {
    setDraftStep(DRAFT_STEPS.IDLE);
    setDraftTitle('');
    setDraftDescription('');
    setReflection('');
    setLocationText('');
    setLatitude('');
    setLongitude('');
    setSelectedImages([]);
  };

  const startDraftFlow = () => {
    setActiveConversationId(null);
    setDraftStep(DRAFT_STEPS.TITLE);
    setChatMessages((current) => [
      ...current,
      { sender: 'ai', text: getDraftQuestion(DRAFT_STEPS.TITLE) },
    ]);
  };

  const buildReflectionText = (
    title = draftTitle,
    description = draftDescription,
    locationValue = locationText
  ) => (
    [
      title.trim() ? `Tiêu đề: ${title.trim()}` : '',
      description.trim() ? `Mô tả: ${description.trim()}` : '',
      locationValue.trim() ? `Vị trí: ${locationValue.trim()}` : '',
    ].filter(Boolean).join('\n')
  );

  const getEntityId = (entity, primaryKey) => (
    entity?.[primaryKey] ?? entity?.id ?? entity?.value ?? null
  );

  const resolveFeedbackRequiredIds = async (draft) => {
    const [areasResult, categoriesResult] = await Promise.allSettled([
      toolsApi.getAreas(),
      toolsApi.getCategories(),
    ]);

    const areas = areasResult.status === 'fulfilled' && Array.isArray(areasResult.value)
      ? areasResult.value
      : [];
    const categories = categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)
      ? categoriesResult.value
      : [];

    const normalize = (value) => String(value ?? '').trim().toLowerCase();
    const suggestedArea = normalize(draft?.areaId || draft?.suggestedArea || draft?.areaName || draft?.location);
    const suggestedCategory = normalize(draft?.categoryId || draft?.suggestedCategory || draft?.categoryName);

    const matchedArea = areas.find((area) => {
      const areaId = normalize(getEntityId(area, 'areaId'));
      const areaName = normalize(area?.areaName || area?.name || area?.displayName);
      return suggestedArea && (areaId === suggestedArea || areaName === suggestedArea || suggestedArea.includes(areaName));
    });

    const matchedCategory = categories.find((category) => {
      const categoryId = normalize(getEntityId(category, 'categoryId'));
      const categoryName = normalize(category?.categoryName || category?.name || category?.displayName);
      return suggestedCategory && (categoryId === suggestedCategory || categoryName === suggestedCategory || suggestedCategory.includes(categoryName));
    });

    return {
      areaId: getEntityId(matchedArea, 'areaId') ?? getEntityId(areas[0], 'areaId'),
      categoryId: getEntityId(matchedCategory, 'categoryId') ?? getEntityId(categories[0], 'categoryId'),
    };
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    resetDraftFlow();
    setChatMessages([
      {
        sender: 'ai',
        text: routeFeedbackId
          ? `Bạn đang chat theo ngữ cảnh phản ánh #${routeFeedbackId}. Hãy nhập câu hỏi cần AI hỗ trợ.`
          : 'Chào bạn! Nếu muốn tạo phản ánh, hãy nhắn “tạo phản ánh”, tôi sẽ hỏi từng thông tin một.',
      },
    ]);
  };

  const toggleChat = () => setChatOpen((current) => !current);

  const handleDraftStepMessage = (userMsg) => {
    if (draftStep === DRAFT_STEPS.TITLE) {
      setDraftTitle(userMsg);
      setDraftStep(DRAFT_STEPS.DESCRIPTION);
      setChatMessages((current) => [
        ...current,
        { sender: 'ai', text: getDraftQuestion(DRAFT_STEPS.DESCRIPTION) },
      ]);
      return true;
    }

    if (draftStep === DRAFT_STEPS.DESCRIPTION) {
      setDraftDescription(userMsg);
      const nextReflection = buildReflectionText(draftTitle, userMsg);
      setReflection(nextReflection);
      setDraftStep(DRAFT_STEPS.LOCATION);
      setChatMessages((current) => [
        ...current,
        { sender: 'ai', text: getDraftQuestion(DRAFT_STEPS.LOCATION) },
      ]);
      return true;
    }

    if (draftStep === DRAFT_STEPS.LOCATION) {
      setLocationText(userMsg);
      setDraftStep(DRAFT_STEPS.EVIDENCE);
      setChatMessages((current) => [
        ...current,
        { sender: 'ai', text: getDraftQuestion(DRAFT_STEPS.EVIDENCE) },
      ]);
      return true;
    }

    if (draftStep === DRAFT_STEPS.EVIDENCE) {
      setDraftStep(DRAFT_STEPS.READY);
      setChatMessages((current) => [
        ...current,
        { sender: 'ai', text: getDraftQuestion(DRAFT_STEPS.READY) },
      ]);
      return true;
    }

    if (draftStep === DRAFT_STEPS.READY) {
      setChatMessages((current) => [
        ...current,
        { sender: 'ai', text: 'Thông tin đã sẵn sàng. Bạn bấm “Tạo bản nháp” để tôi tạo phản ánh.' },
      ]);
      return true;
    }

    return false;
  };

  const handleSendMessage = async () => {
    if (!inputVal.trim() || loadingReply) return;

    const userMsg = inputVal.trim();
    setInputVal('');
    setChatMessages((current) => [...current, { sender: 'user', text: userMsg }]);

    if (draftStep !== DRAFT_STEPS.IDLE && handleDraftStepMessage(userMsg)) {
      return;
    }

    if (DRAFT_INTENT_REGEX.test(userMsg)) {
      startDraftFlow();
      return;
    }

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
        if (draftStep === DRAFT_STEPS.LOCATION) {
          setDraftStep(DRAFT_STEPS.EVIDENCE);
        }
        setChatMessages((current) => [
          ...current,
          {
            sender: 'ai',
            text: draftStep === DRAFT_STEPS.LOCATION
              ? `Đã lấy GPS: ${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}. ${getDraftQuestion(DRAFT_STEPS.EVIDENCE)}`
              : `Đã lấy GPS: ${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}.`,
          },
        ]);
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
    const nextImages = files.slice(0, 5);
    setSelectedImages(nextImages);
    if (nextImages.length > 0) {
      if (draftStep === DRAFT_STEPS.EVIDENCE) {
        setDraftStep(DRAFT_STEPS.READY);
      }
      setChatMessages((current) => [
        ...current,
        {
          sender: 'ai',
          text: draftStep === DRAFT_STEPS.EVIDENCE
            ? `Đã đính kèm ${nextImages.length} ảnh minh chứng: ${nextImages.map((file) => file.name).join(', ')}. ${getDraftQuestion(DRAFT_STEPS.READY)}`
            : `Đã đính kèm ${nextImages.length} ảnh minh chứng: ${nextImages.map((file) => file.name).join(', ')}.`,
        },
      ]);
    }
  };

  const handleCreateDraft = async () => {
    const collectedTitle = draftTitle.trim();
    const collectedDescription = draftDescription.trim() || reflection.trim() || inputVal.trim();
    const collectedLocation = locationText.trim();
    const text = buildReflectionText(collectedTitle, collectedDescription, collectedLocation).trim() || inputVal.trim();
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
        location: collectedLocation,
        latitude: latitude === '' ? null : Number(latitude),
        longitude: longitude === '' ? null : Number(longitude),
        imageUrls: [],
        base64Images,
      });

      const normalizedDraft = draft?.data ?? draft?.draft ?? draft ?? {};
      const finalDraft = {
        ...normalizedDraft,
        title: collectedTitle || normalizedDraft.title || normalizedDraft.summary || 'Phản ánh đô thị từ AI',
        description: collectedDescription || normalizedDraft.description || normalizedDraft.summary || text,
        location: collectedLocation || normalizedDraft.location || '',
        latitude: latitude === '' ? normalizedDraft.latitude ?? null : Number(latitude),
        longitude: longitude === '' ? normalizedDraft.longitude ?? null : Number(longitude),
        imageUrls: Array.isArray(normalizedDraft.imageUrls) ? normalizedDraft.imageUrls : [],
        confirmationMessage: 'Đã lấy thông tin bạn cung cấp để tạo phản ánh. Vui lòng kiểm tra lại và bấm gửi phản ánh.',
      };

      const resolvedIds = await resolveFeedbackRequiredIds(finalDraft);
      const latitudeNumber = Number(finalDraft.latitude);
      const longitudeNumber = Number(finalDraft.longitude);
      const hasCoordinates = Number.isFinite(latitudeNumber) && Number.isFinite(longitudeNumber);

      if (!resolvedIds.areaId || !resolvedIds.categoryId || !hasCoordinates) {
        navigate('/tickets/create', {
          state: {
            aiDraft: finalDraft,
            aiDraftSource: {
              reflection: text,
              title: finalDraft.title,
              description: finalDraft.description,
              location: finalDraft.location,
              imageNames: selectedImages.map((file) => file.name),
              createAttempted: true,
            },
          },
        });
        setChatOpen(false);
        return;
      }

      const response = await ticketApi.createTicket(
        user?.userId,
        user?.fullName || user?.name,
        {
          areaId: Number(resolvedIds.areaId),
          categoryId: Number(resolvedIds.categoryId),
          title: finalDraft.title,
          description: finalDraft.description,
          priority: normalizedDraft.urgencyLevel || normalizedDraft.priority || 'Medium',
          locationText: finalDraft.location || collectedLocation || `Vị trí GPS: ${latitudeNumber.toFixed(6)}, ${longitudeNumber.toFixed(6)}`,
          latitude: latitudeNumber,
          longitude: longitudeNumber,
          attachments: selectedImages,
        },
        { role: user?.role || APP_ROLES.SERVICE_USER }
      );

      const createdFeedbackId = response?.data?.feedbackId || response?.data?.id || response?.feedbackId || response?.id;
      setChatMessages((current) => [
        ...current,
        {
          sender: 'ai',
          text: createdFeedbackId
            ? `Đã tạo phản ánh thành công (#${createdFeedbackId}). Bạn có thể theo dõi trong mục “Phản ánh của tôi”.`
            : 'Đã tạo phản ánh thành công. Bạn có thể theo dõi trong mục “Phản ánh của tôi”.',
        },
      ]);
      resetDraftFlow();
      loadConversations();
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

      {chatOpen ? (
        <div className="fixed inset-0 z-[2198]" onClick={() => setChatOpen(false)} />
      ) : null}

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
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={draftStep === DRAFT_STEPS.IDLE ? startDraftFlow : handleCreateDraft}
                disabled={creatingDraft}
                className="btn btn-primary btn-sm flex-1 rounded-xl"
              >
                {creatingDraft ? <span className="loading loading-spinner loading-xs" /> : <Lucide.FilePlus2 size={14} />}
                {draftStep === DRAFT_STEPS.IDLE ? 'Tạo phản ánh' : 'Tạo bản nháp'}
              </button>
              <button
                type="button"
                onClick={handleUseBrowserLocation}
                className="btn btn-outline btn-sm rounded-xl"
                title="Lấy GPS"
              >
                <Lucide.MapPin size={14} />
                GPS
              </button>
              <label className="btn btn-outline btn-sm rounded-xl" title="Đính kèm ảnh">
                <Lucide.ImagePlus size={14} />
                Ảnh
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="text"
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              placeholder="Vị trí phản ánh (có thể nhập sau khi chat)"
              className="input input-bordered input-xs w-full rounded-xl text-xs"
            />
            {selectedImages.length > 0 ? (
              <p className="mt-1 text-[10px] text-base-content/60">
                Đã chọn {selectedImages.length} ảnh: {selectedImages.map((file) => file.name).join(', ')}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2 border-t border-base-300 bg-base-100 p-4">
            <input
              type="text"
              placeholder={draftStep === DRAFT_STEPS.IDLE ? 'Nhắn với AI hoặc nhập “tạo phản ánh”...' : 'Trả lời câu hỏi hiện tại...'}
              aria-label="Nhắn với AI"
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
