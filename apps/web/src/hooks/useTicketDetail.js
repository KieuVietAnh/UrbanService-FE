import { useState, useEffect, useRef } from 'react';
import { ticketApi } from '../services/api/ticketApi';
import { signalrService } from '../services/socket/signalrService';

export function useTicketDetail(feedbackId, user, detailFetcher) {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(5);
  const [satisfied, setSatisfied] = useState(true);
  const [reviewComment, setReviewComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setError('');
      setLoading(true);
      try {
        const resolveRole = (r) => {
          if (!r) return undefined;
          const raw = String(r || '').toLowerCase();
          if (raw.includes('service-user') || raw.includes('serviceuser') || raw.includes('citizen') || raw.includes('user')) return 'service-user';
          if (raw.includes('service-provider') || raw.includes('serviceprovider') || raw.includes('operator')) return 'service-provider';
          if (raw.includes('system-staff') || raw.includes('systemstaff') || raw.includes('staff')) return 'system-staff';
          if (raw.includes('administrator') || raw.includes('admin')) return 'administrator';
          if (raw.includes('interaction-manager') || raw.includes('interactionmanager')) return 'interaction-manager';
          return undefined;
        };

        const role = resolveRole(user?.role);
        const resTicket = detailFetcher
          ? await detailFetcher(feedbackId)
          : await ticketApi.getTicketById(feedbackId, { role });
        const ticketData = resTicket;
        if (!ticketData) throw new Error('Empty ticket data received');
        setTicket(ticketData);
        setComments(Array.isArray(ticketData.comments) ? ticketData.comments.filter(Boolean) : []);
        setHistory(Array.isArray(ticketData.statusHistories) ? ticketData.statusHistories.filter(Boolean) : []);
      } catch (err) {
        console.error('Failed to load ticket details', err);
        setError('Unable to load feedback details.');
        setTicket(null);
        setComments([]);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    const load = async () => await fetchDetails();
    load();

    signalrService.start();
    const handleReceiveMessage = (incomingFeedbackId, comment) => {
      if (incomingFeedbackId === feedbackId) setComments((prev) => [...prev, comment]);
    };
    signalrService.on('ReceiveChatMessage', handleReceiveMessage);
    signalrService.on('CommentAdded', handleReceiveMessage);

    const handleStatusChange = async (incomingFeedbackId) => {
      if (incomingFeedbackId === feedbackId) {
        // refresh details to pick up status, history and related changes
        await fetchDetails();
      }
    };
    signalrService.on('FeedbackStatusChanged', handleStatusChange);
    signalrService.on('FeedbackStatusChangedNotificationReceived', handleStatusChange);

    const handleAssignment = async (incomingFeedbackId) => {
      if (incomingFeedbackId === feedbackId) {
        await fetchDetails();
      }
    };
    signalrService.on('AssignmentUpdated', handleAssignment);
    signalrService.on('AssignmentCreated', handleAssignment);

    const handleSupport = (incomingFeedbackId, payload) => {
      if (incomingFeedbackId === feedbackId) {
        setTicket((prev) => ({ ...(prev || {}), supportCount: payload?.supportCount ?? (prev?.supportCount || 0) }));
      }
    };
    signalrService.on('SupportAdded', handleSupport);

    const handleResolutionEvents = async (incomingFeedbackId) => {
      if (incomingFeedbackId === feedbackId) {
        await fetchDetails();
      }
    };
    signalrService.on('ResolutionSubmitted', handleResolutionEvents);
    signalrService.on('ResolutionApproved', handleResolutionEvents);
    signalrService.on('ResolutionRejected', handleResolutionEvents);

    return () => {
      signalrService.off('ReceiveChatMessage', handleReceiveMessage);
      signalrService.off('CommentAdded', handleReceiveMessage);
      signalrService.off('FeedbackStatusChanged', handleStatusChange);
      signalrService.off('FeedbackStatusChangedNotificationReceived', handleStatusChange);
      signalrService.off('AssignmentUpdated', handleAssignment);
      signalrService.off('AssignmentCreated', handleAssignment);
      signalrService.off('SupportAdded', handleSupport);
      signalrService.off('ResolutionSubmitted', handleResolutionEvents);
      signalrService.off('ResolutionApproved', handleResolutionEvents);
      signalrService.off('ResolutionRejected', handleResolutionEvents);
      signalrService.stop();
    };
  }, [detailFetcher, feedbackId, user?.role]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendChat = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!chatInput || !chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    await signalrService.sendChatMessage(feedbackId, user, text);
    const role = (user && (String(user.role || '').toLowerCase().includes('staff') || String(user.role || '').toLowerCase().includes('service-provider'))) ? String(user.role) : undefined;
    const resHist = await ticketApi.getHistory(feedbackId, { role });
    setHistory(Array.isArray(resHist) ? resHist : []);
  };

  const handleRateSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setRatingLoading(true);
    try {
      const role = user?.role || 'service-user';
      await ticketApi.submitReview(feedbackId, user.userId, rating, satisfied, reviewComment, { role });
      const refresh = async () => {
        setError('');
        setLoading(true);
        try {
          const resolveRole = (r) => {
            if (!r) return undefined;
            const raw = String(r || '').toLowerCase();
            if (raw.includes('service-user') || raw.includes('serviceuser') || raw.includes('citizen') || raw.includes('user')) return 'service-user';
            if (raw.includes('service-provider') || raw.includes('serviceprovider') || raw.includes('operator')) return 'service-provider';
            if (raw.includes('system-staff') || raw.includes('systemstaff') || raw.includes('staff')) return 'system-staff';
            if (raw.includes('administrator') || raw.includes('admin')) return 'administrator';
            if (raw.includes('interaction-manager') || raw.includes('interactionmanager')) return 'interaction-manager';
            return undefined;
          };

          const role = resolveRole(user?.role);
          const resTicket = detailFetcher
            ? await detailFetcher(feedbackId)
            : await ticketApi.getTicketById(feedbackId, { role });
          const ticketData = resTicket;
          if (!ticketData) throw new Error('Empty ticket data received');
          setTicket(ticketData);
          setComments(Array.isArray(ticketData.comments) ? ticketData.comments.filter(Boolean) : []);
          setHistory(Array.isArray(ticketData.statusHistories) ? ticketData.statusHistories.filter(Boolean) : []);
        } catch (err) {
          console.error('Failed to load ticket details', err);
          setError('Unable to load feedback details.');
          setTicket(null);
          setComments([]);
          setHistory([]);
        } finally {
          setLoading(false);
        }
      };
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setRatingLoading(false);
    }
  };

  const getAttachmentUrl = (file) => {
    try {
      if (!file) return '';
      if (typeof file === 'string') return file;
      if (typeof file === 'object') {
        if (file.url) return file.url;
        if (file.path) return file.path;
        if (file.fileUrl) return file.fileUrl;
        if (file.link) return file.link;
        if (file.attributes && (file.attributes.url || file.attributes.path)) {
          return file.attributes.url || file.attributes.path;
        }
        const id = file.id || file.attachmentId || file.fileId || file.uuid;
        if (id) return `/api/attachments/${id}`;
        return String(file);
      }
    } catch (e) {
      console.warn('getAttachmentUrl error', e, file);
    }
    return String(file);
  };

  return {
    ticket,
    comments,
    history,
    chatInput,
    setChatInput,
    loading,
    error,
    chatEndRef,
    handleSendChat,
    handleRateSubmit,
    rating,
    setRating,
    satisfied,
    setSatisfied,
    reviewComment,
    setReviewComment,
    ratingLoading,
    getAttachmentUrl,
  };
}

export default useTicketDetail;
