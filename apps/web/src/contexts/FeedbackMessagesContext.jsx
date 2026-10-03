import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { managementFeedbackApi } from '../services/api/managementFeedbackApi';
import { FeedbackMessagesContext } from './FeedbackMessagesContextBase';
import { buildHubUrl, getSignalRAccessToken } from '../utils/signalRAccessToken';
import { createOptionalSignalRConnection } from '../utils/optionalSignalR';

const TICKET_MESSAGES_HUB_PATH = '/hubs/ticket-messages';

/*
 * Nhịp tải lại khi không có kênh realtime. Hai giây là mức đủ để hội thoại còn
 * dùng được, nhưng tốn một request mỗi hai giây cho mỗi người đang mở ticket.
 */
const MESSAGE_POLL_INTERVAL_MS = 2000;

/*
 * Khi WebSocket đang chạy thì tin nhắn tự đẩy xuống, nên nhịp này chỉ còn làm
 * nhiệm vụ đối chiếu: bắt lại những gì có thể đã lọt qua lúc kết nối chập chờn.
 */
const REALTIME_RECONCILE_INTERVAL_MS = 30000;

const normalizeMessages = (messages = []) => {
  return Array.isArray(messages)
    ? [...messages].sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0))
    : [];
};

const getMessageKey = (message) => String(
  message?.interactionMessageId ?? message?.InteractionMessageId ?? message?.id ?? '',
);

/*
 * Hub dùng camelCase, nhưng vẫn đọc cả PascalCase để một thay đổi cấu hình
 * serializer ở backend không làm hội thoại im lặng ngừng cập nhật.
 */
const normalizeRealtimeMessage = (payload) => {
  const candidate = payload?.message ?? payload?.data ?? payload;
  if (!candidate || typeof candidate !== 'object') return null;

  const messageId = Number(candidate.interactionMessageId ?? candidate.InteractionMessageId);
  if (!Number.isInteger(messageId) || messageId <= 0) return null;

  return {
    ...candidate,
    interactionMessageId: messageId,
    feedbackId: candidate.feedbackId ?? candidate.FeedbackId ?? null,
    userId: candidate.userId ?? candidate.UserId ?? null,
    userFullName: candidate.userFullName ?? candidate.UserFullName ?? null,
    userEmail: candidate.userEmail ?? candidate.UserEmail ?? null,
    userRole: candidate.userRole ?? candidate.UserRole ?? null,
    senderType: candidate.senderType ?? candidate.SenderType ?? null,
    messageText: candidate.messageText ?? candidate.MessageText ?? '',
    isInternal: Boolean(candidate.isInternal ?? candidate.IsInternal ?? false),
    createdAt: candidate.createdAt ?? candidate.CreatedAt ?? new Date().toISOString(),
  };
};

export const FeedbackMessagesProvider = ({ feedbackId, includeInternal = true, children }) => {
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const syncInFlightRef = useRef(false);
  const sendInFlightRef = useRef(false);
  const loadMessagesRef = useRef(null);

  const loadMessages = useCallback(
    async ({ keepMessagesOnError = false, silent = false } = {}) => {
      if (!feedbackId) {
        setMessages([]);
        setMessagesError('');
        return false;
      }

      if (syncInFlightRef.current) {
        return false;
      }

      syncInFlightRef.current = true;

      if (!silent) {
        setMessagesLoading(true);
        setMessagesError('');
      }

      try {
        const nextMessages = await managementFeedbackApi.getFeedbackMessages(feedbackId, {
          includeInternal,
        });

        const sortedMessages = normalizeMessages(nextMessages);

        setMessages((currentMessages) => {
          const currentLast = currentMessages[currentMessages.length - 1];
          const nextLast = sortedMessages[sortedMessages.length - 1];

          const unchanged =
            currentMessages.length === sortedMessages.length
            && String(currentLast?.interactionMessageId || currentLast?.id || '')
              === String(nextLast?.interactionMessageId || nextLast?.id || '');

          return unchanged ? currentMessages : sortedMessages;
        });

        setLastSyncedAt(new Date());
        setSyncStatus('synced');
        if (!silent) {
          setMessagesError('');
        }
        return true;
      } catch (error) {
        console.error('Failed to load feedback messages', error);
        if (!silent) {
          if (!keepMessagesOnError) {
            setMessages([]);
          }
          setMessagesError(error?.message || 'Không thể tải trao đổi.');
          setSyncStatus('warning');
        }
        return false;
      } finally {
        syncInFlightRef.current = false;
        if (!silent) {
          setMessagesLoading(false);
        }
      }
    },
    [feedbackId, includeInternal]
  );

  /*
   * Giữ loadMessages trong ref để effect realtime gọi được mà không phải nhận nó
   * làm dependency; nếu nhận thì mỗi lần tham số đổi lại dựng lại WebSocket.
   */
  useEffect(() => {
    loadMessagesRef.current = loadMessages;
  }, [loadMessages]);

  /*
   * Chèn tin nhắn nhận từ hub. Lọc theo interactionMessageId thay vì nối thẳng,
   * vì cùng một tin có thể vừa đến qua WebSocket vừa đến qua nhịp tải lại.
   */
  const appendRealtimeMessage = useCallback((payload) => {
    const message = normalizeRealtimeMessage(payload);
    if (!message) return;

    /*
     * Backend đã không gửi ghi chú nội bộ xuống group của người dân. Lớp lọc này
     * dành cho màn hình nhân sự đang chủ động xem ở chế độ không kèm nội bộ.
     */
    if (!includeInternal && message.isInternal) return;

    setMessages((currentMessages) => {
      const messageKey = getMessageKey(message);
      if (currentMessages.some((item) => getMessageKey(item) === messageKey)) {
        return currentMessages;
      }
      return normalizeMessages([...currentMessages, message]);
    });

    setLastSyncedAt(new Date());
    setSyncStatus('synced');
  }, [includeInternal]);

  const sendMessage = useCallback(
    async (payload) => {
      if (!feedbackId || sendInFlightRef.current) {
        return false;
      }

      sendInFlightRef.current = true;
      setMessageSubmitting(true);
      setMessagesError('');

      try {
        await managementFeedbackApi.createFeedbackMessage(feedbackId, payload);
        const refreshed = await loadMessages({ keepMessagesOnError: true });
        if (refreshed) {
          setLastSyncedAt(new Date());
          setSyncStatus('synced');
        } else {
          setSyncStatus('warning');
        }
        // The message has already been accepted by the API at this point.
        // A concurrent poll may make the follow-up refresh return false; that
        // must not be reported to the composer as a failed send.
        return true;
      } catch (error) {
        console.error('Failed to send feedback message', error);
        setMessagesError(error?.message || 'Không thể gửi trao đổi.');
        setSyncStatus('failed');
        throw error;
      } finally {
        sendInFlightRef.current = false;
        setMessageSubmitting(false);
      }
    },
    [feedbackId, loadMessages]
  );

  // Tải lần đầu khi đổi ticket. Tách khỏi effect nhịp tải lại bên dưới vì effect đó
  // chạy lại mỗi khi trạng thái kết nối realtime đổi, mà tải lại không im lặng ở
  // thời điểm đó sẽ làm nháy spinner giữa lúc đang đọc hội thoại.
  useEffect(() => {
    if (!feedbackId) {
      setMessages([]);
      setMessagesError('');
      setLastSyncedAt(null);
      setSyncStatus('idle');
      return;
    }

    loadMessages({ keepMessagesOnError: true });
  }, [feedbackId, loadMessages]);

  useEffect(() => {
    if (!feedbackId) return undefined;

    const pollMessages = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      loadMessages({ keepMessagesOnError: true, silent: true });
    };

    const intervalId = window.setInterval(
      pollMessages,
      realtimeConnected ? REALTIME_RECONCILE_INTERVAL_MS : MESSAGE_POLL_INTERVAL_MS,
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMessages({ keepMessagesOnError: true, silent: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [feedbackId, loadMessages, realtimeConnected]);

  /*
   * Kênh realtime của hội thoại.
   *
   * Chỉ phụ thuộc feedbackId: đổi includeInternal không được dựng lại kết nối,
   * vì nó chỉ đổi cách lọc ở client. loadMessages được gọi qua ref vì nó đổi định
   * danh mỗi khi tham số đổi, mà mở lại WebSocket theo nhịp đó thì vô nghĩa.
   */
  useEffect(() => {
    if (!feedbackId || typeof window === 'undefined') return undefined;
    if (!getSignalRAccessToken()) return undefined;

    let disposed = false;

    const connection = createOptionalSignalRConnection({
      signalR,
      hubUrl: buildHubUrl(TICKET_MESSAGES_HUB_PATH),
      accessTokenFactory: () => getSignalRAccessToken(),
    });

    const joinTicket = async () => {
      try {
        await connection.invoke('JoinTicket', String(feedbackId));
        if (disposed) return;
        setRealtimeConnected(true);
        // Lấp khoảng trống giữa lần tải đầu và lúc vào được group.
        loadMessagesRef.current?.({ keepMessagesOnError: true, silent: true });
      } catch {
        if (!disposed) setRealtimeConnected(false);
      }
    };

    connection.on('TicketMessageReceived', appendRealtimeMessage);
    connection.onreconnected(() => { void joinTicket(); });
    connection.onclose(() => { if (!disposed) setRealtimeConnected(false); });

    connection.start()
      .then(joinTicket)
      .catch(() => {
        // Hội thoại vẫn chạy bằng nhịp tải lại; không cần báo lỗi cho người dùng.
        if (!disposed) setRealtimeConnected(false);
      });

    return () => {
      disposed = true;
      setRealtimeConnected(false);
      connection.off('TicketMessageReceived', appendRealtimeMessage);
      connection.stop().catch(() => {});
    };
  }, [appendRealtimeMessage, feedbackId]);

  const value = useMemo(
    () => ({
      feedbackId,
      includeInternal,
      messages,
      messagesLoading,
      messagesError,
      messageSubmitting,
      lastSyncedAt,
      syncStatus,
      realtimeConnected,
      loadMessages,
      sendMessage,
    }),
    [feedbackId, includeInternal, lastSyncedAt, loadMessages, messageSubmitting, messages, messagesError, messagesLoading, realtimeConnected, sendMessage, syncStatus]
  );

  return <FeedbackMessagesContext.Provider value={value}>{children}</FeedbackMessagesContext.Provider>;
};
