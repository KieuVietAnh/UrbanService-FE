import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '@urbanmind/shared-api';
import { Message } from '../types/messaging.types';
import getSocketClient from '../api/socket';
import { useMessageQueue } from './use-message-queue';

const fetchMessages = async (conversationId: string, page = 1, pageSize = 30): Promise<Message[]> => {
  const res = await axiosClient.get(`/api/inbox/conversations/${conversationId}/messages`, { params: { pageNumber: page, pageSize } });
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data as Message[];
  return (data?.items ?? []) as Message[];
};

export const useMessages = (conversationId?: string, options?: { initialPage?: number }) => {
  const pageRef = (options?.initialPage) ?? 1;
  const qc = useQueryClient();
  const socket = getSocketClient(axiosClient.defaults.baseURL);
  const queue = useMessageQueue();

  const baseKey = ['inbox', 'messages', conversationId];

  const query = useQuery<Message[]>({
    queryKey: baseKey,
    queryFn: () => fetchMessages(conversationId as string, pageRef),
    enabled: !!conversationId,
    staleTime: 1000 * 10,
  });

  // subscribe to websocket new_message events for this conversation

  if (conversationId && socket) {
    socket.on('new_message', (payload: any) => {
      if (payload?.conversationId !== conversationId) return;
      // append to cache
      qc.setQueryData(baseKey, (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        return [...arr, payload];
      });
    });

    socket.on('delivered', (payload: any) => {
      qc.setQueryData(baseKey, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((m: any) => (m.id === payload.messageId ? { ...m, status: 'delivered' } : m));
      });
    });

    socket.on('read', (payload: any) => {
      qc.setQueryData(baseKey, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((m: any) => (m.id === payload.messageId ? { ...m, status: 'read' } : m));
      });
    });

    socket.on('typing', (payload: any) => {
      // typing indicators can be handled by a separate state or events
      qc.setQueryData(['inbox', 'typing', conversationId], payload);
    });
  }

  const sendMutation = useMutation({
    mutationFn: async (payload: { content?: string; attachments?: any[] }) => {
      // optimistic: push to cache with 'sending'
      const tempId = `temp-${Date.now()}`;
      qc.setQueryData(baseKey, (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        return [...arr, { id: tempId, conversationId, content: payload.content, attachments: payload.attachments, createdAt: new Date().toISOString(), status: 'sending' }];
      });

      // try websocket send first
      const socketSent = getSocketClient(axiosClient.defaults.baseURL).send('send_message', { conversationId, ...payload });
      if (socketSent) {
        // server will emit new_message with real id; mark optimistic as sent
        qc.invalidateQueries({ queryKey: baseKey });
        return { ok: true };
      }

      try {
        const res = await axiosClient.post(`/api/inbox/conversations/${conversationId}/messages`, payload);
        qc.invalidateQueries({ queryKey: baseKey });
        return res?.data ?? res;
      } catch (err) {
          // enqueue for later send
          queue.enqueue({ id: `q-${Date.now()}`, conversationId: conversationId as string, payload });
        // mark pending in cache
        qc.setQueryData(baseKey, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((m: any) => (m.status === 'sending' ? { ...m, status: 'pending' } : m));
        });
        throw err;
      }
    },
  });

  return { ...query, sendMutation } as any;
};

export const useSendMessage = (conversationId: string) => {
  const res = useMessages(conversationId);
  return res.sendMutation;
};

export default useMessages;
