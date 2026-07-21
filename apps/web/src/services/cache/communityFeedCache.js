export const COMMUNITY_FEED_CACHE_TTL_MS = 60 * 1000;

const snapshotsByOwner = new Map();

const normalizeOwnerKey = (ownerKey) => (
  String(ownerKey || 'anonymous')
);

const getFeedbackId = (item) => (
  item?.feedbackId || item?.id || item?.ticketId
);

export const readCommunityFeedCache = (ownerKey) => {
  const snapshot = snapshotsByOwner.get(normalizeOwnerKey(ownerKey));

  if (!snapshot || !Array.isArray(snapshot.items)) {
    return null;
  }

  return snapshot;
};

export const writeCommunityFeedCache = (ownerKey, items) => {
  const nextSnapshot = {
    items: Array.isArray(items) ? items : [],
    updatedAt: Date.now(),
  };

  snapshotsByOwner.set(normalizeOwnerKey(ownerKey), nextSnapshot);
  return nextSnapshot;
};

export const patchCommunityFeedCacheItem = (
  ownerKey,
  feedbackId,
  patchOrUpdater
) => {
  if (!feedbackId) return null;

  const normalizedOwnerKey = normalizeOwnerKey(ownerKey);
  const currentSnapshot = snapshotsByOwner.get(normalizedOwnerKey);

  if (!currentSnapshot || !Array.isArray(currentSnapshot.items)) {
    return null;
  }

  let changed = false;
  const nextItems = currentSnapshot.items.map((item) => {
    if (String(getFeedbackId(item)) !== String(feedbackId)) {
      return item;
    }

    const patch = typeof patchOrUpdater === 'function'
      ? patchOrUpdater(item)
      : patchOrUpdater;

    if (!patch || typeof patch !== 'object') {
      return item;
    }

    changed = true;
    return {
      ...item,
      ...patch,
    };
  });

  if (!changed) return currentSnapshot;

  const nextSnapshot = {
    items: nextItems,
    updatedAt: currentSnapshot.updatedAt,
  };

  snapshotsByOwner.set(normalizedOwnerKey, nextSnapshot);
  return nextSnapshot;
};
