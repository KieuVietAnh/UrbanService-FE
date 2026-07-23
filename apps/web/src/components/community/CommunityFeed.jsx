import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as Lucide from 'lucide-react';
import { managementTypes } from '@urbanmind/shared-types';
import { normalizeTicketsResponse } from '@urbanmind/shared-api';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import {
  getCommunityFeed,
  getCommunityFeedPreview,
} from '../../services/api/feedApi';
import { signalrService } from '../../services/socket/signalrService';
import {
  readCommunityFeedCache,
  writeCommunityFeedCache,
} from '../../services/cache/communityFeedCache';
import CommunityFeedItem from './CommunityFeedItem';
import CommentDrawer from './CommentDrawer';

const COMMUNITY_RETURN_STORAGE_KEY = 'urbanmind-community-feed-return';
const COMMUNITY_RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const COMMUNITY_REFERENCE_TIMESTAMP = Date.now();
const COMMUNITY_FEED_PAGE_SIZE = 10;
const COMMUNITY_PREVIEW_CONCURRENCY = 3;
const COMMUNITY_FEED_BACKGROUND_REFRESH_MS = 30 * 1000;

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, limit), items.length) },
      () => worker()
    )
  );

  return results;
};

const readCommunityReturnContext = () => {
  if (typeof window === 'undefined') return null;

  try {
    const rawContext = window.sessionStorage.getItem(
      COMMUNITY_RETURN_STORAGE_KEY
    );
    if (!rawContext) return null;

    const parsedContext = JSON.parse(rawContext);
    return parsedContext && typeof parsedContext === 'object'
      ? parsedContext
      : null;
  } catch (error) {
    console.warn('Không thể đọc vị trí quay lại bảng tin', error);
    return null;
  }
};

const TAB_OPTIONS = [
  { value: 'Latest', label: 'Mới nhất', icon: Lucide.Clock3 },
  { value: 'Trending', label: 'Được quan tâm', icon: Lucide.Flame },
  { value: 'Nearby', label: 'Gần bạn', icon: Lucide.MapPin },
  { value: 'Processing', label: 'Đang xử lý', icon: Lucide.LoaderCircle },
  { value: 'Ended', label: 'Đã kết thúc', icon: Lucide.CircleCheckBig },
];

const PROCESSING_STATUSES = new Set([
  managementTypes.feedbackStatus.VERIFIED,
  managementTypes.feedbackStatus.ASSIGNED,
  managementTypes.feedbackStatus.IN_PROGRESS,
  managementTypes.feedbackStatus.RESOLVED,
  managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
  managementTypes.feedbackStatus.APPROVED,
]);

const normalizeFeedTab = (value, fallback = 'Latest') => {
  if (value === 'Resolved') return 'Ended';

  return TAB_OPTIONS.some((option) => option.value === value)
    ? value
    : fallback;
};

const getItemId = (item) => item?.feedbackId || item?.id || item?.ticketId;

const getSupportCount = (item) => Number(item?.supportCount || item?.supports || 0);

const getCommentCount = (item) => Number(
  item?.commentCount ?? (Array.isArray(item?.comments) ? item.comments.length : 0)
);

const getCreatedTimestamp = (item) => {
  const timestamp = new Date(item?.createdAt || item?.createdDate || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getAreaName = (item) => (
  item?.areaName || item?.wardName || item?.districtName || 'Chưa xác định khu vực'
);

const CATEGORY_LABELS = {
  'garbage collection': 'Thu gom rác',
  'waste management': 'Quản lý chất thải',
  'road maintenance': 'Bảo trì đường bộ',
  'street lighting': 'Chiếu sáng đô thị',
  drainage: 'Thoát nước',
  'water supply': 'Cấp nước',
  'public safety': 'An toàn công cộng',
};

const getCategoryLabel = (item) => {
  const rawCategory = item?.categoryName || item?.category?.name || '';
  const normalizedCategory = String(rawCategory)
    .trim()
    .toLocaleLowerCase('en-US');

  return CATEGORY_LABELS[normalizedCategory] || rawCategory;
};

const dedupeFeedItems = (feedItems = []) => {
  const seen = new Set();

  return feedItems.filter((item, index) => {
    const itemId = getItemId(item) || String(index);
    if (seen.has(itemId)) return false;
    seen.add(itemId);
    return true;
  });
};

const filterPublicItems = (feedItems = []) => (
  feedItems.filter((item) => {
    if (item?.isPublic === false) return false;

    const visibility = String(item?.visibility || item?.scope || '').toLowerCase();
    if (visibility === 'private' || visibility === 'internal') return false;

    const status = item?.status;
    if (!status) return false;
    if (status === managementTypes.feedbackStatus.SUBMITTED) return false;
    if (status === managementTypes.feedbackStatus.AI_REVIEWED) return false;

    return true;
  })
);

const mergeFeedMediaFromCache = (incomingItems = [], cachedItems = []) => {
  const cachedById = new Map(
    cachedItems
      .map((item) => [String(getItemId(item) || ''), item])
      .filter(([itemId]) => itemId)
  );

  return incomingItems.map((item) => {
    const cachedItem = cachedById.get(String(getItemId(item) || ''));
    if (!cachedItem) return item;

    const incomingAttachments = Array.isArray(item?.attachments)
      ? item.attachments
      : [];
    const cachedAttachments = Array.isArray(cachedItem?.attachments)
      ? cachedItem.attachments
      : [];
    const hasIncomingMedia = (
      incomingAttachments.length > 0 ||
      item?.imageUrl ||
      item?.coverImageUrl ||
      item?.thumbnailUrl ||
      item?.mediaUrl ||
      item?.attachmentUrl
    );

    return {
      ...item,
      description: item?.description || cachedItem?.description,
      attachments: incomingAttachments.length > 0
        ? incomingAttachments
        : cachedAttachments,
      imageUrl: item?.imageUrl || cachedItem?.imageUrl,
      coverImageUrl: item?.coverImageUrl || cachedItem?.coverImageUrl,
      thumbnailUrl: item?.thumbnailUrl || cachedItem?.thumbnailUrl,
      mediaUrl: item?.mediaUrl || cachedItem?.mediaUrl,
      attachmentUrl: item?.attachmentUrl || cachedItem?.attachmentUrl,
      __mediaState: hasIncomingMedia
        ? (item?.__mediaState || 'ready')
        : cachedItem?.__mediaState || item?.__mediaState,
    };
  });
};

const FeedSkeleton = () => (
  <div className="space-y-4" aria-hidden="true">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="public-loading-surface animate-pulse overflow-hidden rounded-[26px] border border-base-300 bg-base-100 shadow-sm"
      >
        <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
          <div className="h-11 w-11 rounded-2xl bg-base-300/65" />
          <div className="flex-1">
            <div className="h-4 w-36 rounded bg-base-300/70" />
            <div className="mt-2 h-3 w-52 rounded bg-base-300/45" />
          </div>
          <div className="h-7 w-24 rounded-full bg-base-300/50" />
        </div>
        <div className="px-5 pb-4 sm:px-6">
          <div className="h-6 w-3/5 rounded bg-base-300/70" />
          <div className="mt-3 h-4 w-full rounded bg-base-300/45" />
          <div className="mt-2 h-4 w-4/5 rounded bg-base-300/40" />
        </div>
        <div className="mx-5 h-44 rounded-2xl bg-base-300/50 sm:mx-6 sm:h-52" />
        <div className="mt-4 flex justify-between border-t border-base-300 px-5 py-4 sm:px-6">
          <div className="h-9 w-24 rounded-xl bg-base-300/50" />
          <div className="h-9 w-28 rounded-xl bg-base-300/45" />
        </div>
      </div>
    ))}
  </div>
);

export default function CommunityFeed({ initialTab = 'Latest' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cacheOwnerKey = (
    user?.userId || user?.id || user?.email || 'service-user'
  );
  const [restoredContext] = useState(readCommunityReturnContext);
  const restoreContextRef = useRef(restoredContext);
  const [initialCache] = useState(() => (
    readCommunityFeedCache(cacheOwnerKey)
  ));
  const [items, setItems] = useState(() => (
    Array.isArray(initialCache?.items) ? initialCache.items : []
  ));
  const [loading, setLoading] = useState(() => (
    !(Array.isArray(initialCache?.items) && initialCache.items.length > 0)
  ));
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(() => (
    Math.max(
      1,
      Number(restoredContext?.page) ||
      Number(initialCache?.page) ||
      1
    )
  ));
  const [loadedServerPage, setLoadedServerPage] = useState(() => (
    Math.max(0, Number(initialCache?.loadedServerPage) || 0)
  ));
  const [totalPages, setTotalPages] = useState(() => (
    Math.max(1, Number(initialCache?.totalPages) || 1)
  ));
  const [totalItems, setTotalItems] = useState(() => (
    Math.max(0, Number(initialCache?.totalItems) || 0)
  ));
  const [tab, setTab] = useState(() => (
    normalizeFeedTab(
      restoredContext?.tab || initialCache?.tab,
      initialTab
    )
  ));
  const [query, setQuery] = useState(() => (
    restoredContext?.query || initialCache?.query || ''
  ));
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState(null);
  const [error, setError] = useState('');
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const isFetchingRef = useRef(false);
  const hasLoadedSnapshotRef = useRef(
    Array.isArray(initialCache?.items) && initialCache.items.length > 0
  );
  const hasInitializedFiltersRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadSessionRef = useRef(0);
  const filterSectionRef = useRef(null);
  const feedListSectionRef = useRef(null);
  const [scrollRequest, setScrollRequest] = useState({
    id: 0,
    target: 'controls',
  });

  const normalizePageItems = useCallback((rawItems = []) => {
    const publicItems = dedupeFeedItems(
      filterPublicItems(normalizeTicketsResponse(rawItems))
    );

    return publicItems.map((item) => {
      const hasAttachments = (
        Array.isArray(item?.attachments) && item.attachments.length > 0
      );

      if (hasAttachments || Number(item?.attachmentCount || 0) <= 0) {
        return item;
      }

      return {
        ...item,
        __mediaState: 'loading',
      };
    });
  }, []);

  const requestFeedPage = useCallback(async (
    pageNumber,
    { force = false } = {}
  ) => {
    const response = await getCommunityFeed(
      {
        PageNumber: pageNumber,
        PageSize: COMMUNITY_FEED_PAGE_SIZE,
      },
      { force }
    );

    return {
      items: normalizePageItems(response?.items || []),
      pageNumber: Math.max(1, Number(response?.pageNumber) || pageNumber),
      totalPages: Math.max(1, Number(response?.totalPages) || 1),
      totalItems: Math.max(0, Number(response?.totalItems) || 0),
    };
  }, [normalizePageItems]);

  const hydrateFeedPreviews = useCallback(async (feedItems, sessionId) => {
    const candidates = feedItems.filter((item) => (
      item?.attachmentCount > 0 &&
      !(Array.isArray(item?.attachments) && item.attachments.length > 0)
    ));

    if (candidates.length === 0) return;

    const results = await mapWithConcurrency(
      candidates,
      COMMUNITY_PREVIEW_CONCURRENCY,
      async (item) => {
        const feedbackId = getItemId(item);

        try {
          const preview = await getCommunityFeedPreview(feedbackId);
          const attachments = Array.isArray(preview?.attachments)
            ? preview.attachments
            : [];
          const fallbackMedia = (
            preview?.imageUrl ||
            preview?.image ||
            preview?.coverImageUrl ||
            preview?.thumbnailUrl ||
            preview?.mediaUrl ||
            preview?.attachmentUrl ||
            ''
          );

          return {
            feedbackId,
            patch: {
              attachments,
              description: item?.description || preview?.description,
              imageUrl: item?.imageUrl || preview?.imageUrl,
              coverImageUrl: item?.coverImageUrl || preview?.coverImageUrl,
              thumbnailUrl: item?.thumbnailUrl || preview?.thumbnailUrl,
              __mediaState: attachments.length > 0 || fallbackMedia
                ? 'ready'
                : 'error',
            },
          };
        } catch (previewError) {
          console.warn(
            'Không thể tải minh chứng công khai cho bảng tin',
            feedbackId,
            previewError?.message || previewError
          );

          return {
            feedbackId,
            patch: {
              __mediaState: 'error',
            },
          };
        }
      }
    );

    if (
      !isMountedRef.current ||
      sessionId !== loadSessionRef.current
    ) {
      return;
    }

    const patchMap = new Map(
      results
        .filter((result) => result?.feedbackId)
        .map((result) => [String(result.feedbackId), result.patch])
    );

    setItems((currentItems) => currentItems.map((item) => {
      const patch = patchMap.get(String(getItemId(item)));
      return patch ? { ...item, ...patch } : item;
    }));
  }, []);

  const loadFeedSnapshot = useCallback(async ({
    background = false,
    force = false,
  } = {}) => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setError('');

    const showInitialLoading = (
      !background &&
      !hasLoadedSnapshotRef.current
    );

    if (showInitialLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const sessionId = loadSessionRef.current + 1;
    loadSessionRef.current = sessionId;

    try {
      const firstPage = await requestFeedPage(1, { force });
      const restoredPage = background
        ? 1
        : Math.max(1, Number(restoreContextRef.current?.page) || 1);
      const targetPage = Math.min(restoredPage, firstPage.totalPages);
      const pageResults = [firstPage];

      for (let pageNumber = 2; pageNumber <= targetPage; pageNumber += 1) {
        pageResults.push(await requestFeedPage(pageNumber, { force }));
      }

      if (
        !isMountedRef.current ||
        sessionId !== loadSessionRef.current
      ) {
        return;
      }

      const cachedSnapshot = readCommunityFeedCache(
        cacheOwnerKey,
        { allowStale: true }
      );
      const mergedItems = mergeFeedMediaFromCache(
        dedupeFeedItems(
          pageResults.flatMap((result) => result.items)
        ),
        cachedSnapshot?.items || []
      );
      const lastPage = pageResults[pageResults.length - 1] || firstPage;

      setItems(mergedItems);
      setLoadedServerPage(lastPage.pageNumber);
      setTotalPages(firstPage.totalPages);
      setTotalItems(firstPage.totalItems);
      setPage(targetPage);
      hasLoadedSnapshotRef.current = true;

      hydrateFeedPreviews(mergedItems, sessionId);
    } catch (loadError) {
      console.error('CommunityFeed load error', loadError);
      setError(
        loadError?.response?.data?.message ||
        loadError?.message ||
        'Không thể tải bảng tin cộng đồng.'
      );
    } finally {
      if (
        isMountedRef.current &&
        sessionId === loadSessionRef.current
      ) {
        setLoading(false);
        setRefreshing(false);
        isFetchingRef.current = false;
      }
    }
  }, [cacheOwnerKey, hydrateFeedPreviews, requestFeedPage]);

  const loadNextServerPage = useCallback(async () => {
    if (
      isFetchingRef.current ||
      loadedServerPage >= totalPages
    ) {
      return;
    }

    isFetchingRef.current = true;
    setRefreshing(true);
    setError('');

    const sessionId = loadSessionRef.current;
    const nextPageNumber = loadedServerPage + 1;

    try {
      const nextPage = await requestFeedPage(nextPageNumber);

      if (
        !isMountedRef.current ||
        sessionId !== loadSessionRef.current
      ) {
        return;
      }

      setItems((currentItems) => dedupeFeedItems([
        ...currentItems,
        ...nextPage.items,
      ]));
      setLoadedServerPage(nextPage.pageNumber);
      setTotalPages(nextPage.totalPages);
      setTotalItems(nextPage.totalItems);
      setPage((currentPage) => Math.max(
        currentPage + 1,
        nextPage.pageNumber
      ));

      hydrateFeedPreviews(nextPage.items, sessionId);
    } catch (loadError) {
      console.error('CommunityFeed next page error', loadError);
      setError(
        loadError?.response?.data?.message ||
        loadError?.message ||
        'Không thể tải thêm phản ánh.'
      );
    } finally {
      if (
        isMountedRef.current &&
        sessionId === loadSessionRef.current
      ) {
        setRefreshing(false);
        isFetchingRef.current = false;
      }
    }
  }, [
    hydrateFeedPreviews,
    loadedServerPage,
    requestFeedPage,
    totalPages,
  ]);

  useEffect(() => {
    // React StrictMode mounts, cleans up, then mounts effects again in development.
    // Reset these guards on every effect setup so the second mount can finish.
    isMountedRef.current = true;
    isFetchingRef.current = false;

    const cachedSnapshot = readCommunityFeedCache(cacheOwnerKey);
    const returningFromDetail = Boolean(
      restoreContextRef.current &&
      Array.isArray(cachedSnapshot?.items) &&
      cachedSnapshot.items.length > 0
    );

    if (cachedSnapshot?.items?.length) {
      setItems(cachedSnapshot.items);
      setPage(Math.max(1, Number(cachedSnapshot.page) || 1));
      setLoadedServerPage(
        Math.max(1, Number(cachedSnapshot.loadedServerPage) || 1)
      );
      setTotalPages(Math.max(1, Number(cachedSnapshot.totalPages) || 1));
      setTotalItems(
        Math.max(
          cachedSnapshot.items.length,
          Number(cachedSnapshot.totalItems) || 0
        )
      );
      setLoading(false);
      hasLoadedSnapshotRef.current = true;

      const shouldRefreshInBackground = (
        !returningFromDetail &&
        Date.now() - Number(cachedSnapshot.updatedAt || 0) >=
          COMMUNITY_FEED_BACKGROUND_REFRESH_MS
      );

      if (shouldRefreshInBackground) {
        loadFeedSnapshot({ background: true });
      }
    } else {
      loadFeedSnapshot();
    }

    return () => {
      isMountedRef.current = false;
      isFetchingRef.current = false;
      loadSessionRef.current += 1;
    };
  }, [cacheOwnerKey, loadFeedSnapshot]);

  useEffect(() => {
    if (!hasLoadedSnapshotRef.current || items.length === 0) return;

    writeCommunityFeedCache(cacheOwnerKey, {
      items,
      page,
      loadedServerPage,
      totalPages,
      totalItems,
      tab,
      query,
    });
  }, [
    cacheOwnerKey,
    items,
    loadedServerPage,
    page,
    query,
    tab,
    totalItems,
    totalPages,
  ]);

  useEffect(() => {
    if (!hasInitializedFiltersRef.current) {
      hasInitializedFiltersRef.current = true;
      return;
    }

    setPage(1);
  }, [query, tab]);

  const requestFeedScroll = useCallback((target = 'list') => {
    setScrollRequest((currentRequest) => ({
      id: currentRequest.id + 1,
      target,
    }));
  }, []);

  useEffect(() => {
    if (
      scrollRequest.id === 0 ||
      typeof window === 'undefined'
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const targetElement = (
        scrollRequest.target === 'controls'
          ? filterSectionRef.current
          : (
              feedListSectionRef.current ||
              filterSectionRef.current
            )
      );

      if (!targetElement) return;

      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }, scrollRequest.target === 'list' ? 100 : 60);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [scrollRequest]);

  const handleFeedTabChange = useCallback((
    nextTab,
    target = 'controls'
  ) => {
    setTab(nextTab);
    requestFeedScroll(target);
  }, [requestFeedScroll]);

  const handleQueryFocus = useCallback(() => {
    requestFeedScroll('controls');
  }, [requestFeedScroll]);

  const handleQueryChange = useCallback((event) => {
    setQuery(event.target.value);
    requestFeedScroll('controls');
  }, [requestFeedScroll]);

  useEffect(() => {
    signalrService.start();

    const handleCommentAdded = (incomingFeedbackId) => {
      setItems((currentItems) => currentItems.map((item) => {
        if (getItemId(item) !== incomingFeedbackId) return item;
        return { ...item, commentCount: getCommentCount(item) + 1 };
      }));
    };

    const handleSupportAdded = (incomingFeedbackId, payload) => {
      setItems((currentItems) => currentItems.map((item) => (
        getItemId(item) === incomingFeedbackId
          ? { ...item, supportCount: payload?.supportCount ?? getSupportCount(item) }
          : item
      )));
    };

    const handleStatusChanged = (incomingFeedbackId, payload) => {
      setItems((currentItems) => currentItems
        .map((item) => {
          if (getItemId(item) !== incomingFeedbackId) return item;

          const nextStatus = payload?.newStatus;
          if (
            nextStatus === managementTypes.feedbackStatus.SUBMITTED ||
            nextStatus === managementTypes.feedbackStatus.AI_REVIEWED
          ) {
            return null;
          }

          return { ...item, status: nextStatus };
        })
        .filter(Boolean));
    };

    const handleAssignment = (incomingFeedbackId, payload) => {
      setItems((currentItems) => currentItems.map((item) => (
        getItemId(item) === incomingFeedbackId
          ? { ...item, assignment: payload }
          : item
      )));
    };

    const handleResolutionRefresh = async (incomingFeedbackId) => {
      try {
        const detail = await getCommunityFeedPreview(incomingFeedbackId, {
          force: true,
        });
        setItems((currentItems) => currentItems.map((item) => (
          getItemId(item) === incomingFeedbackId
            ? { ...item, ...detail }
            : item
        )));
      } catch {
        // Giữ dữ liệu hiện có nếu chưa thể tải bản cập nhật realtime.
      }
    };

    signalrService.on('CommentAdded', handleCommentAdded);
    signalrService.on('SupportAdded', handleSupportAdded);
    signalrService.on('FeedbackStatusChanged', handleStatusChanged);
    signalrService.on('AssignmentCreated', handleAssignment);
    signalrService.on('AssignmentUpdated', handleAssignment);
    signalrService.on('ResolutionSubmitted', handleResolutionRefresh);
    signalrService.on('ResolutionApproved', handleResolutionRefresh);
    signalrService.on('ResolutionRejected', handleResolutionRefresh);

    return () => {
      signalrService.off('CommentAdded', handleCommentAdded);
      signalrService.off('SupportAdded', handleSupportAdded);
      signalrService.off('FeedbackStatusChanged', handleStatusChanged);
      signalrService.off('AssignmentCreated', handleAssignment);
      signalrService.off('AssignmentUpdated', handleAssignment);
      signalrService.off('ResolutionSubmitted', handleResolutionRefresh);
      signalrService.off('ResolutionApproved', handleResolutionRefresh);
      signalrService.off('ResolutionRejected', handleResolutionRefresh);
    };
  }, []);

  useEffect(() => {
    const savedContext = restoreContextRef.current;
    if (!savedContext || loading || items.length === 0) return undefined;

    let cancelled = false;
    let retryCount = 0;

    const restorePosition = () => {
      if (cancelled) return;

      const escapedFeedbackId = (
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(String(savedContext.feedbackId || ''))
          : String(savedContext.feedbackId || '').replace(/["\\]/g, '\\$&')
      );
      const targetRow = escapedFeedbackId
        ? document.querySelector(
          `[data-community-feedback-id="${escapedFeedbackId}"]`
        )
        : null;

      if (targetRow) {
        targetRow.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        setHighlightedFeedbackId(String(savedContext.feedbackId));

        window.setTimeout(() => {
          setHighlightedFeedbackId(null);
        }, 2200);

        window.sessionStorage.removeItem(COMMUNITY_RETURN_STORAGE_KEY);
        restoreContextRef.current = null;
        return;
      }

      retryCount += 1;
      if (retryCount < 8) {
        window.setTimeout(restorePosition, 120);
        return;
      }

      window.scrollTo({
        top: Number(savedContext.scrollY) || 0,
        behavior: 'smooth',
      });
      window.sessionStorage.removeItem(COMMUNITY_RETURN_STORAGE_KEY);
      restoreContextRef.current = null;
    };

    const timer = window.setTimeout(restorePosition, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [items, loading]);

  const tabItems = tab === 'Processing'
    ? items.filter((item) => PROCESSING_STATUSES.has(item?.status))
    : tab === 'Ended'
      ? items.filter(
          (item) => (
            item?.status === managementTypes.feedbackStatus.CLOSED
          )
        )
      : items;

  const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
  const searchedItems = normalizedQuery
    ? tabItems.filter((item) => {
        const searchable = [
          item?.title,
          item?.description,
          getCategoryLabel(item),
          getAreaName(item),
          item?.userName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('vi-VN');

        return searchable.includes(normalizedQuery);
      })
    : tabItems;

  const sortedItems = [...searchedItems].sort((left, right) => {
    if (tab === 'Trending') {
      const engagementDifference = (
        getSupportCount(right) + getCommentCount(right)
      ) - (
        getSupportCount(left) + getCommentCount(left)
      );
      if (engagementDifference !== 0) return engagementDifference;
    }

    return getCreatedTimestamp(right) - getCreatedTimestamp(left);
  });
  const visibleItems = sortedItems.slice(
    0,
    page * COMMUNITY_FEED_PAGE_SIZE
  );
  const hasMore = (
    visibleItems.length < sortedItems.length ||
    loadedServerPage < totalPages
  );

  const trendingItems = [...items]
    .sort((left, right) => (
      getSupportCount(right) + getCommentCount(right)
    ) - (
      getSupportCount(left) + getCommentCount(left)
    ))
    .slice(0, 4);

  const processingCount = items.filter(
    (item) => PROCESSING_STATUSES.has(item?.status)
  ).length;
  const endedCount = items.filter(
    (item) => (
      item?.status === managementTypes.feedbackStatus.CLOSED
    )
  ).length;
  const sevenDaysAgo = (
    COMMUNITY_REFERENCE_TIMESTAMP - COMMUNITY_RECENT_WINDOW_MS
  );
  const recentPublicCount = items.filter(
    (item) => getCreatedTimestamp(item) >= sevenDaysAgo
  ).length;
  const loadedInteractionCount = items.reduce(
    (total, item) => (
      total + getSupportCount(item) + getCommentCount(item)
    ),
    0
  );
  const latestActivityTimestamp = items.reduce(
    (latestTimestamp, item) => {
      const itemTimestamp = new Date(
        item?.updatedAt ||
        item?.createdAt ||
        item?.createdDate ||
        0
      ).getTime();

      if (Number.isNaN(itemTimestamp)) return latestTimestamp;
      return Math.max(latestTimestamp, itemTimestamp);
    },
    0
  );
  const latestActivityText = latestActivityTimestamp
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(latestActivityTimestamp))
    : 'Chưa có hoạt động';

  const initialLoading = loading && items.length === 0;

  const openDetail = (item) => {
    const feedbackId = getItemId(item);
    if (!feedbackId) return;

    writeCommunityFeedCache(cacheOwnerKey, {
      items,
      page,
      loadedServerPage,
      totalPages,
      totalItems,
      tab,
      query,
    });

    try {
      window.sessionStorage.setItem(
        COMMUNITY_RETURN_STORAGE_KEY,
        JSON.stringify({
          tab,
          query,
          page,
          scrollY: window.scrollY,
          feedbackId,
        })
      );
    } catch (storageError) {
      console.warn('Không thể lưu vị trí bảng tin', storageError);
    }

    navigate(`/community/feed/${feedbackId}`, {
      state: { from: '/community/feed' },
    });
  };

  const retryLoad = () => {
    loadFeedSnapshot({
      background: items.length > 0,
      force: true,
    });
  };

  const handleLoadMore = () => {
    if (!hasMore || refreshing) return;

    if (visibleItems.length < sortedItems.length) {
      setPage((currentPage) => currentPage + 1);
      return;
    }

    loadNextServerPage();
  };

  return (
    <>
      <section data-public-reveal className="relative isolate overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-base-100 via-info/[0.025] to-primary/[0.075] shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1400 320"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full text-primary"
            fill="none"
          >
            <path
              d="M-40 250C135 210 185 72 365 96C515 116 515 260 690 243C836 229 856 81 1018 90C1165 98 1192 214 1445 142"
              stroke="currentColor"
              strokeWidth="2"
              strokeOpacity="0.09"
            />
            <path
              d="M-15 278C180 238 222 129 397 145C564 160 614 294 786 262C934 234 964 126 1131 124C1250 122 1320 171 1435 188"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="9 12"
              strokeOpacity="0.075"
            />
            <path
              d="M722 -25C761 70 742 145 802 207C872 278 1014 280 1075 194C1129 118 1091 38 1173 -28"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeOpacity="0.065"
            />
            <circle
              cx="360"
              cy="97"
              r="7"
              fill="currentColor"
              fillOpacity="0.09"
            />
            <circle
              cx="690"
              cy="243"
              r="9"
              fill="currentColor"
              fillOpacity="0.075"
            />
            <circle
              cx="1018"
              cy="90"
              r="6"
              fill="currentColor"
              fillOpacity="0.11"
            />
            <circle
              cx="1131"
              cy="124"
              r="15"
              stroke="currentColor"
              strokeOpacity="0.075"
            />
          </svg>

          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-primary/[0.035] blur-3xl" />
          <div className="absolute -bottom-28 right-[12%] h-72 w-72 rounded-full bg-info/[0.07] blur-3xl" />

          <span className="absolute left-[42%] top-[24%] flex h-8 w-8 items-center justify-center rounded-full border border-primary/10 bg-base-100/50 text-primary/35 shadow-sm">
            <Lucide.MapPin size={14} />
          </span>
          <span className="absolute bottom-[18%] left-[57%] flex h-7 w-7 items-center justify-center rounded-full border border-success/10 bg-base-100/50 text-success/35 shadow-sm">
            <Lucide.Check size={13} />
          </span>
          <span className="absolute right-[24%] top-[18%] flex h-7 w-7 items-center justify-center rounded-full border border-secondary/10 bg-base-100/50 text-secondary/35 shadow-sm">
            <Lucide.MessageCircle size={13} />
          </span>
        </div>

        <div className="relative grid gap-6 px-6 py-7 sm:px-8 sm:py-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="max-w-3xl">
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Bảng tin đô thị
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-base-content/60">
              Theo dõi các phản ánh đã được xác minh, cùng trao đổi và giám sát tiến độ xử lý trong cộng đồng.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                <Lucide.Radio size={14} aria-hidden="true" />
                Cập nhật theo thời gian thực
              </span>
            </div>
          </div>

          <div className="relative">
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => handleFeedTabChange('Latest')}
                className="group min-w-[118px] rounded-2xl border border-base-300 bg-base-100/85 px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                  Tổng công khai
                  <Lucide.Files
                    size={14}
                    className="text-primary"
                    aria-hidden="true"
                  />
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-base-content">
                  {initialLoading ? (
                    <span className="inline-block h-7 w-8 animate-pulse rounded bg-base-300/55" />
                  ) : (
                    totalItems || items.length
                  )}
                </dd>
                <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-primary">
                  Xem toàn bộ
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFeedTabChange('Processing')}
                className="group min-w-[118px] rounded-2xl border border-warning/20 bg-warning/5 px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-warning/35 hover:shadow-md"
              >
                <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                  Đang xử lý
                  <Lucide.LoaderCircle
                    size={14}
                    className="text-warning"
                    aria-hidden="true"
                  />
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-warning">
                  {initialLoading ? (
                    <span className="inline-block h-7 w-8 animate-pulse rounded bg-warning/15" />
                  ) : (
                    processingCount
                  )}
                </dd>
                <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-warning">
                  Theo dõi tiến độ
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFeedTabChange('Ended')}
                className="group min-w-[118px] rounded-2xl border border-success/20 bg-success/5 px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-success/35 hover:shadow-md"
              >
                <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                  Đã kết thúc
                  <Lucide.CircleCheckBig
                    size={14}
                    className="text-success"
                    aria-hidden="true"
                  />
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-success">
                  {initialLoading ? (
                    <span className="inline-block h-7 w-8 animate-pulse rounded bg-success/15" />
                  ) : (
                    endedCount
                  )}
                </dd>
                <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-success">
                  Xem hồ sơ đã kết thúc
                </span>
              </button>
            </dl>
          </div>
        </div>
      </section>

      <section data-public-reveal className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-4">
          <section
            ref={filterSectionRef}
            className="scroll-mt-28 rounded-[22px] border border-base-300 bg-base-100 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.055)] sm:p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div
                className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-base-200/60 p-1"
                role="tablist"
                aria-label="Lọc bảng tin"
              >
                {TAB_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = tab === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFeedTabChange(option.value)}
                      role="tab"
                      aria-selected={active}
                      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                        active
                          ? 'bg-base-100 text-primary shadow-sm ring-1 ring-base-300'
                          : 'text-base-content/52 hover:bg-base-100/75 hover:text-base-content'
                      }`}
                    >
                      <Icon size={15} aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <label className="relative block w-full lg:max-w-[360px]">
                <span className="sr-only">Tìm kiếm trong bảng tin</span>
                <Lucide.Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/35"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onFocus={handleQueryFocus}
                  onChange={handleQueryChange}
                  placeholder="Tìm tiêu đề, khu vực, danh mục..."
                  className="input input-bordered h-10 w-full rounded-xl bg-base-100 pl-10 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-base-content/45">
              <span>
                {initialLoading
                  ? 'Đang tải dữ liệu bảng tin...'
                  : `${sortedItems.length}${loadedServerPage < totalPages ? '+' : ''} phản ánh phù hợp`}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                refreshing
                  ? 'bg-info/8 text-info'
                  : 'bg-success/8 text-success'
              }`}>
                {refreshing ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                )}
                {refreshing
                  ? 'Đang đồng bộ dữ liệu'
                  : 'Cập nhật trực tiếp'}
              </span>
            </div>
          </section>

          {error ? (
            <div>
              <ErrorAlert
                title="Không thể tải bảng tin"
                message={error}
                onClose={() => setError('')}
              />
              <button
                type="button"
                onClick={retryLoad}
                className="btn btn-sm mt-3 rounded-xl"
              >
                <Lucide.RefreshCw size={14} aria-hidden="true" />
                Thử lại
              </button>
            </div>
          ) : null}

          {initialLoading ? <FeedSkeleton /> : null}

          {!initialLoading && visibleItems.length > 0 ? (
            <div
              ref={feedListSectionRef}
              className="scroll-mt-28 space-y-4"
            >
              {visibleItems.map((item, index) => (
                <CommunityFeedItem
                  key={getItemId(item) || index}
                  item={item}
                  priority={index < 2}
                  highlighted={
                    String(getItemId(item)) ===
                    String(highlightedFeedbackId)
                  }
                  onOpenComments={setOpenCommentsFor}
                  onOpen={openDetail}
                />
              ))}
            </div>
          ) : null}

          {!initialLoading && visibleItems.length === 0 && !error ? (
            <div className="rounded-[26px] border border-base-300 bg-base-100 px-6 py-12 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                <Lucide.Newspaper size={25} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-bold">
                {query
                  ? 'Không tìm thấy phản ánh phù hợp'
                  : 'Chưa có phản ánh công khai'}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-base-content/55">
                {query
                  ? 'Thử sử dụng từ khóa khác hoặc chuyển sang một nhóm bảng tin khác.'
                  : 'Các phản ánh đã được xác minh sẽ xuất hiện tại đây để cộng đồng cùng theo dõi.'}
              </p>
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    requestFeedScroll('controls');
                  }}
                  className="btn btn-sm mt-5 rounded-xl"
                >
                  Xóa từ khóa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/tickets/create')}
                  className="btn admin-primary-action btn-sm mt-5 rounded-xl"
                >
                  <Lucide.Plus size={15} aria-hidden="true" />
                  Gửi phản ánh
                </button>
              )}
            </div>
          ) : null}

          {items.length > 0 && hasMore ? (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={handleLoadMore}
                className="btn btn-outline min-w-52 rounded-xl"
                disabled={refreshing}
              >
                {refreshing ? (
                  <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                ) : (
                  <Lucide.Plus size={16} aria-hidden="true" />
                )}
                {refreshing ? 'Đang tải thêm...' : 'Hiện thêm phản ánh'}
              </button>
            </div>
          ) : null}

          {!initialLoading && !hasMore && sortedItems.length > 0 ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-base-content/45">
              <Lucide.CircleCheck
                size={16}
                className="text-success"
                aria-hidden="true"
              />
              Bạn đã xem hết các phản ánh phù hợp.
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[24px] border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Được quan tâm</h2>
                <p className="mt-1 text-xs text-base-content/45">
                  Phản ánh có nhiều tương tác
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                <Lucide.Flame size={19} aria-hidden="true" />
              </span>
            </div>

            {trendingItems.length > 0 ? (
              <ol className="mt-4 space-y-1.5">
                {trendingItems.map((item, index) => (
                  <li key={getItemId(item) || index}>
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      className="group flex w-full items-start gap-3 rounded-2xl border border-transparent px-2 py-2.5 text-left transition hover:border-base-300 hover:bg-base-200/45"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-semibold leading-5 transition group-hover:text-primary">
                          {item?.title || 'Phản ánh đô thị'}
                        </span>
                        <span className="mt-1 flex items-center gap-3 text-[11px] text-base-content/45">
                          <span className="inline-flex items-center gap-1">
                            <Lucide.Heart size={11} aria-hidden="true" />
                            {getSupportCount(item)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Lucide.MessageCircle size={11} aria-hidden="true" />
                            {getCommentCount(item)}
                          </span>
                        </span>
                      </span>
                      <Lucide.ChevronRight
                        size={15}
                        className="mt-1 shrink-0 text-base-content/25"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 rounded-2xl bg-base-200/45 px-4 py-5 text-center text-sm text-base-content/45">
                Chưa có dữ liệu xu hướng.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/8 via-base-100 to-secondary/8 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lucide.Activity size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold">Hoạt động cộng đồng</h2>
                <p className="mt-0.5 text-xs text-base-content/45">
                  Dựa trên toàn bộ bảng tin
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-base-300/75 bg-base-100/80 px-3 py-3">
                <dt className="text-xs text-base-content/50">
                  Phản ánh mới trong 7 ngày
                </dt>
                <dd className="text-sm font-bold text-info">
                  {recentPublicCount}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-base-300/75 bg-base-100/80 px-3 py-3">
                <dt className="text-xs text-base-content/50">
                  Tổng lượt tương tác
                </dt>
                <dd className="text-sm font-bold text-secondary">
                  {loadedInteractionCount}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-base-300/75 bg-base-100/80 px-3 py-3">
                <dt className="text-xs text-base-content/50">
                  Cập nhật gần nhất
                </dt>
                <dd className="text-xs font-semibold">
                  {latestActivityText}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[24px] border border-base-300 bg-base-100 p-5 shadow-sm">
            <h2 className="font-bold">Khám phá theo khu vực</h2>
            <p className="mt-1 text-xs leading-5 text-base-content/45">
              Xem các phản ánh trên bản đồ để nắm tình hình xung quanh bạn.
            </p>
            <button
              type="button"
              onClick={() => navigate('/community/map')}
              className="btn btn-outline mt-4 w-full rounded-xl"
            >
              <Lucide.Map size={16} aria-hidden="true" />
              Mở bản đồ sự cố
            </button>
          </section>
        </aside>

        <CommentDrawer
          open={Boolean(openCommentsFor)}
          feedbackId={openCommentsFor}
          onClose={() => setOpenCommentsFor(null)}
        />
      </section>
    </>
  );

}
