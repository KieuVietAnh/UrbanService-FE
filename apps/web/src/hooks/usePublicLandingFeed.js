import { useCallback, useEffect, useMemo, useState } from 'react';
import { managementTypes } from '@urbanmind/shared-types';
import { getAttachmentUrl } from '@urbanmind/shared-utils';
import {
  getCommunityFeed,
  getCommunityFeedDetail,
} from '../services/api/feedApi';

const PREVIEW_SIZE = 4;

const TERMINAL_STATUSES = new Set([
  managementTypes.feedbackStatus.RESOLVED,
  managementTypes.feedbackStatus.APPROVED,
  managementTypes.feedbackStatus.CLOSED,
]);

const HIDDEN_PUBLIC_STATUSES = new Set([
  managementTypes.feedbackStatus.SUBMITTED,
  managementTypes.feedbackStatus.AI_REVIEWED,
]);

const getFeedbackId = (item) => (
  item?.feedbackId || item?.id || item?.ticketId || ''
);

const getCreatedAt = (item) => (
  item?.createdAt || item?.createdDate || item?.submittedAt
);

const getMediaCandidates = (item) => {
  const attachments = Array.isArray(item?.attachments)
    ? item.attachments
    : [];
  const fallbackMedia = [
    item?.imageUrl,
    item?.image,
    item?.coverImageUrl,
    item?.thumbnailUrl,
    item?.mediaUrl,
    item?.attachmentUrl,
  ].filter(Boolean);

  return attachments.length > 0 ? attachments : fallbackMedia;
};

const hasMedia = (item) => getMediaCandidates(item).some((attachment) => (
  Boolean(getAttachmentUrl(attachment))
));

const isPublicFeedback = (item) => {
  if (!item || item?.isPublic === false) return false;

  const visibility = String(item?.visibility || item?.scope || '').toLowerCase();
  if (visibility === 'private' || visibility === 'internal') return false;

  return !HIDDEN_PUBLIC_STATUSES.has(item?.status);
};

const hydrateFeedback = async (item) => {
  const feedbackId = getFeedbackId(item);
  if (!feedbackId || hasMedia(item)) return item;

  try {
    const detail = await getCommunityFeedDetail(feedbackId);
    return detail && typeof detail === 'object'
      ? { ...item, ...detail }
      : item;
  } catch {
    return item;
  }
};

const usePublicLandingFeed = () => {
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getCommunityFeed({
        PageNumber: 1,
        PageSize: 8,
      });
      const publicItems = (Array.isArray(response?.items) ? response.items : [])
        .filter(isPublicFeedback)
        .sort((firstItem, secondItem) => (
          new Date(getCreatedAt(secondItem) || 0).getTime() -
          new Date(getCreatedAt(firstItem) || 0).getTime()
        ));
      const previewItems = publicItems.slice(0, PREVIEW_SIZE);
      const hydratedItems = await Promise.all(
        previewItems.map(hydrateFeedback)
      );

      setItems(hydratedItems);
      setTotalItems(Number(response?.totalItems) || publicItems.length);
    } catch (loadError) {
      setItems([]);
      setTotalItems(0);
      setError(loadError?.message || 'Không thể tải phản ánh gần đây.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const activeCount = items.filter((item) => (
      item?.status && !TERMINAL_STATUSES.has(item.status)
    )).length;
    const completedCount = items.filter((item) => (
      TERMINAL_STATUSES.has(item?.status)
    )).length;
    const interactionCount = items.reduce((total, item) => (
      total +
      Number(item?.supportCount || item?.supports || 0) +
      Number(item?.commentCount || 0)
    ), 0);

    return {
      totalItems,
      activeCount,
      completedCount,
      interactionCount,
    };
  }, [items, totalItems]);

  return {
    items,
    summary,
    loading,
    error,
    reload: load,
  };
};

export default usePublicLandingFeed;
