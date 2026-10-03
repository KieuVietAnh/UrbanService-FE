import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

import { getEffectiveApiUrl } from '@/config/api';
import { AsyncStorageService } from '@/services/storage/asyncStorage';

const TICKET_MESSAGES_HUB_PATH = '/hubs/ticket-messages';
const AUTH_TOKEN_KEY = 'urbanmind_auth_token';

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

type TicketMessagesRealtimeOptions = {
  /** Tạm ngắt khi màn hình mất focus hoặc app chạy nền, để không giữ WebSocket vô ích. */
  enabled?: boolean;
  /** Gọi mỗi khi có tin nhắn mới; thường là refetch query của màn hình. */
  onMessage: () => void;
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
  { enabled = true, onMessage }: TicketMessagesRealtimeOptions,
) => {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!feedbackId || !enabled) {
      setConnected(false);
      return undefined;
    }

    let disposed = false;
    let connection: signalR.HubConnection | null = null;

    const start = async () => {
      const accessToken = await readAccessToken();
      if (!accessToken || disposed) return;

      connection = new signalR.HubConnectionBuilder()
        .withUrl(buildHubUrl(), { accessTokenFactory: readAccessToken })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.None)
        .build();

      const joinTicket = async () => {
        try {
          await connection?.invoke('JoinTicket', String(feedbackId));
          if (disposed) return;
          setConnected(true);
          // Lấp khoảng trống giữa lần tải đầu và lúc vào được group.
          onMessageRef.current();
        } catch {
          if (!disposed) setConnected(false);
        }
      };

      connection.on('TicketMessageReceived', () => {
        onMessageRef.current();
      });
      connection.onreconnected(() => {
        void joinTicket();
      });
      connection.onclose(() => {
        if (!disposed) setConnected(false);
      });

      try {
        await connection.start();
        if (disposed) return;
        await joinTicket();
      } catch {
        // Hội thoại vẫn chạy bằng nhịp tải lại nên không báo lỗi ra giao diện.
        if (!disposed) setConnected(false);
      }
    };

    void start();

    return () => {
      disposed = true;
      setConnected(false);
      connection?.off('TicketMessageReceived');
      connection?.stop().catch(() => {});
    };
  }, [enabled, feedbackId]);

  return { connected };
};
