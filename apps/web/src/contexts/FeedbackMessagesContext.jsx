import { useCallback, useEffect, useMemo, useState } from 'react';
import { managementFeedbackApi } from '../services/api/managementFeedbackApi';
import { FeedbackMessagesContext } from './FeedbackMessagesContextBase';

const normalizeMessages = (messages = []) => {
  return Array.isArray(messages)
    ? [...messages].sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0))
    : [];
};

export const FeedbackMessagesProvider = ({ feedbackId, includeInternal = true, children }) => {
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');

  const loadMessages = useCallback(
    async ({ keepMessagesOnError = false } = {}) => {
      if (!feedbackId) {
        setMessages([]);
        setMessagesError('');
        return false;
      }

      setMessagesLoading(true);
      setMessagesError('');

      try {
        const nextMessages = await managementFeedbackApi.getFeedbackMessages(feedbackId, {
          includeInternal,
        });

        const sortedMessages = normalizeMessages(nextMessages);
        setMessages(sortedMessages);
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
        return true;
      } catch (error) {
        console.error('Failed to load feedback messages', error);
        if (!keepMessagesOnError) {
          setMessages([]);
        }
        setMessagesError(error?.message || 'Không thể tải trao đổi.');
        setSyncStatus('warning');
        return false;
      } finally {
        setMessagesLoading(false);
      }
    },
    [feedbackId, includeInternal]
  );

  const sendMessage = useCallback(
    async (payload) => {
      if (!feedbackId) {
        return false;
      }

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
        return refreshed;
      } catch (error) {
        console.error('Failed to send feedback message', error);
        setMessagesError(error?.message || 'Không thể gửi trao đổi.');
        setSyncStatus('failed');
        throw error;
      } finally {
        setMessageSubmitting(false);
      }
    },
    [feedbackId, loadMessages]
  );

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
      loadMessages,
      sendMessage,
    }),
    [feedbackId, includeInternal, lastSyncedAt, loadMessages, messageSubmitting, messages, messagesError, messagesLoading, sendMessage, syncStatus]
  );

  return <FeedbackMessagesContext.Provider value={value}>{children}</FeedbackMessagesContext.Provider>;
};

