import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

import { getEffectiveApiUrl } from '@/config/api';
import { AsyncStorageService } from '@/services/storage/asyncStorage';

const TICKET_MESSAGES_HUB_PATH = '/hubs/ticket-messages';
const AUTH_TOKEN_KEY = 'urbanmind_auth_token';
const INITIAL_RETRY_DELAYS_MS = [1000, 2000, 5000, 10000, 30000] as const;

/**
 * Nhịp tải lại khi không có kênh realtime, dùng chung cho hai màn hội thoại.
 */
export const MESSAGE_POLL_INTERVAL_MS = 2000;

/**
 * Khi WebSocket đang chạy thì tin nhắn được đẩy xuống ngay, nên nhịp này chỉ còn
 * làm nhiệm vụ đối chiếu lại những gì có thể lọt qua lúc kết nối chập chờn.
 */
export const REALTIME_RECONCILE_INTERVAL_MS = 30000;

const readAccessToken = async () => {
  try {
    return (await AsyncStorageService.getItem<string>(AUTH_TOKEN_KEY)) || '';
  } catch {
    // Không đọc được storage thì coi như chưa đăng nhập; phía gọi tự xoay sang poll.
    return '';
  }
};

const buildHubUrl = () => `${getEffectiveApiUrl().replace(/\/$/, '')}${TICKET_MESSAGES_HUB_PATH}`;

type DataRecord = Record<string, unknown>;

const asRecord = (value: unknown): DataRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as DataRecord
    : null
);

const asText = (value: unknown) => (
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''
);

/** Dữ liệu chuẩn hóa từ event TicketMessageReceived của backend. */
export type RealtimeTicketMessage = {
  interactionMessageId: string;
  feedbackId: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userRole: string;
  senderType: string;
  messageText: string;
  isInternal: boolean;
  createdAt: string;
};

/**
 * SignalR thường trả DTO trực tiếp. Việc đọc thêm `message`/`data` và PascalCase
 * giúp app không im lặng mất realtime nếu gateway bọc payload hoặc backend đổi
 * cấu hình JSON serializer.
 */
export const normalizeRealtimeTicketMessage = (
  payload: unknown,
): RealtimeTicketMessage | null => {
  const envelope = asRecord(payload);
  const candidate = asRecord(envelope?.message ?? envelope?.data ?? payload);
  if (!candidate) return null;

  const interactionMessageId = asText(
    candidate.interactionMessageId ?? candidate.InteractionMessageId ?? candidate.messageId ?? candidate.MessageId,
  ).trim();
  if (!interactionMessageId || interactionMessageId.startsWith('temp-')) return null;

  return {
    interactionMessageId,
    feedbackId: asText(
      candidate.feedbackId ?? candidate.FeedbackId ?? envelope?.feedbackId ?? envelope?.FeedbackId,
    ),
    userId: asText(candidate.userId ?? candidate.UserId),
    userFullName: asText(candidate.userFullName ?? candidate.UserFullName),
    userEmail: asText(candidate.userEmail ?? candidate.UserEmail),
    userRole: asText(candidate.userRole ?? candidate.UserRole),
    senderType: asText(candidate.senderType ?? candidate.SenderType),
    messageText: asText(candidate.messageText ?? candidate.MessageText),
    isInternal: (candidate.isInternal ?? candidate.IsInternal) === true,
    createdAt: asText(candidate.createdAt ?? candidate.CreatedAt) || new Date().toISOString(),
  };
};

type TicketMessagesRealtimeOptions = {
  /** Tạm ngắt khi màn hình mất focus hoặc app chạy nền, để không giữ WebSocket vô ích. */
  enabled?: boolean;
  /** Chèn DTO được server đẩy xuống vào cache của màn hình. */
  onMessage: (message: RealtimeTicketMessage) => void;
  /** Đối chiếu REST sau khi join/reconnect hoặc khi event không đọc được. */
  onSyncNeeded?: () => void;
};

/**
 * Mở kênh realtime cho hội thoại của một ticket.
 *
 * Hook chỉ báo "có tin mới" chứ không tự ghép tin vào cache, vì màn hình người dân
 * và màn hình nhân sự dùng hai kiểu dữ liệu tin nhắn khác nhau. Để mỗi màn hình tự
 * tải lại giữ cho nguồn sự thật vẫn là API, đổi lại một request cho mỗi tin nhắn
 * thay vì một request mỗi hai giây.
 *
 * Trả về trạng thái kết nối để màn hình giãn nhịp tải lại khi socket đang chạy.
 */
export const useTicketMessagesRealtime = (
  feedbackId: string | undefined,
  { enabled = true, onMessage, onSyncNeeded }: TicketMessagesRealtimeOptions,
) => {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  const onSyncNeededRef = useRef(onSyncNeeded);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onSyncNeededRef.current = onSyncNeeded;
  }, [onSyncNeeded]);

  useEffect(() => {
    if (!feedbackId || !enabled) {
      setConnected(false);
      return undefined;
    }

    let disposed = false;
    let connection: signalR.HubConnection | null = null;
    let starting = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const nextRetryDelay = () => {
      const delay = INITIAL_RETRY_DELAYS_MS[
        Math.min(retryAttempt, INITIAL_RETRY_DELAYS_MS.length - 1)
      ];
      retryAttempt += 1;
      return delay;
    };

    const scheduleInitialRetry = () => {
      if (disposed || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void start();
      }, nextRetryDelay());
    };

    const joinTicket = async () => {
      try {
        await connection?.invoke('JoinTicket', String(feedbackId));
        if (disposed) return;
        retryAttempt = 0;
        setConnected(true);
        // Lấp khoảng trống giữa lần tải đầu và lúc vào được group.
        onSyncNeededRef.current?.();
      } catch {
        if (!disposed) {
          setConnected(false);
          if (!retryTimer) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              void joinTicket();
            }, nextRetryDelay());
          }
        }
      }
    };

    const start = async () => {
      if (disposed || starting) return;
      if (connection && connection.state !== signalR.HubConnectionState.Disconnected) return;

      starting = true;
      const accessToken = await readAccessToken();
      if (!accessToken || disposed) {
        starting = false;
        if (!disposed) scheduleInitialRetry();
        return;
      }

      if (!connection) {
        connection = new signalR.HubConnectionBuilder()
          .withUrl(buildHubUrl(), { accessTokenFactory: readAccessToken })
          .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: ({ previousRetryCount }) => (
              INITIAL_RETRY_DELAYS_MS[
                Math.min(previousRetryCount, INITIAL_RETRY_DELAYS_MS.length - 1)
              ]
            ),
          })
          .configureLogging(signalR.LogLevel.None)
          .build();

        connection.on('TicketMessageReceived', (...eventArguments: unknown[]) => {
          // Hỗ trợ cả event(dto) và event(feedbackId, dto).
          const payload = eventArguments.length > 1 ? eventArguments[1] : eventArguments[0];
          const message = normalizeRealtimeTicketMessage(payload);
          if (!message) {
            onSyncNeededRef.current?.();
            return;
          }
          if (
            message.feedbackId &&
            message.feedbackId.toLowerCase() !== String(feedbackId).toLowerCase()
          ) return;
          onMessageRef.current(message);
        });
        connection.onreconnecting(() => {
          if (!disposed) setConnected(false);
        });
        connection.onreconnected(() => {
          void joinTicket();
        });
        connection.onclose(() => {
          if (disposed) return;
          setConnected(false);
          scheduleInitialRetry();
        });
      }

      try {
        await connection.start();
        if (disposed) return;
        await joinTicket();
      } catch {
        // Hội thoại vẫn chạy bằng polling; đồng thời thử nối hub lại ở nền.
        if (!disposed) {
          setConnected(false);
          scheduleInitialRetry();
        }
      } finally {
        starting = false;
      }
    };

    void start();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      setConnected(false);
      connection?.off('TicketMessageReceived');
      connection?.stop().catch(() => {});
    };
  }, [enabled, feedbackId]);

  return { connected };
};
