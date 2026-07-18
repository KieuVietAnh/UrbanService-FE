import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementTypes } from '@urbanmind/shared-types';
import { normalizeTicketsResponse } from '@urbanmind/shared-api';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import { getCommunityFeed } from '../../services/api/feedApi';
import { ticketApi } from '../../services/api/ticketApi';
import { signalrService } from '../../services/socket/signalrService';
import CommunityFeedItem from './CommunityFeedItem';
import CommentDrawer from './CommentDrawer';

const COMMUNITY_RETURN_STORAGE_KEY = 'urbanmind-community-feed-return';

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
  { value: 'Resolved', label: 'Đã xử lý', icon: Lucide.CircleCheck },
];

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

const FeedSkeleton = () => (
  <div className="space-y-4" aria-hidden="true">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="animate-pulse overflow-hidden rounded-[26px] border border-base-300 bg-base-100 shadow-sm"
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
        <div className="mx-5 h-56 rounded-2xl bg-base-300/50 sm:mx-6 sm:h-64" />
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
  const [restoredContext] = useState(readCommunityReturnContext);
  const restoreContextRef = useRef(restoredContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(() => (
    Math.max(1, Number(restoredContext?.page) || 1)
  ));
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState(
    restoredContext?.tab || initialTab
  );
  const [query, setQuery] = useState(restoredContext?.query || '');
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState(null);
  const [error, setError] = useState('');
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const isFetchingRef = useRef(false);

  const loadPage = useCallback(async (pageNumber = 1) => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setError('');
    setLoading(true);

    try {
      const response = await getCommunityFeed({
        PageNumber: pageNumber,
        PageSize: 10,
        Status: tab === 'Resolved' ? 'Resolved' : undefined,
      });
      const {
        items: fetchedItemsRaw,
        pageNumber: responsePageNumber,
        totalPages,
      } = response;
      const fetchedItems = normalizeTicketsResponse(fetchedItemsRaw || []);
      const publicItems = filterPublicItems(fetchedItems);

      setItems((currentItems) => {
        const merged = pageNumber === 1
          ? publicItems
          : [...currentItems, ...publicItems];
        return dedupeFeedItems(merged);
      });

      setHasMore(responsePageNumber < totalPages && fetchedItems.length > 0);

      const itemsMissingPreview = publicItems.filter((item) => (
        item?.attachmentCount > 0 &&
        !(Array.isArray(item?.attachments) && item.attachments.length > 0)
      ));

      if (itemsMissingPreview.length > 0) {
        Promise.all(
          itemsMissingPreview.map(async (item) => {
            const feedbackId = getItemId(item);

            try {
              const detail = await ticketApi.getTicketById(feedbackId, {
                role: 'service-user',
              });
              return {
                feedbackId,
                attachments: Array.isArray(detail?.attachments)
                  ? detail.attachments
                  : [],
              };
            } catch (previewError) {
              console.warn(
                'Không thể tải minh chứng cho bảng tin',
                feedbackId,
                previewError?.message || previewError
              );
              return { feedbackId, attachments: [] };
            }
          })
        ).then((results) => {
          const attachmentMap = new Map(
            results.map((result) => [result.feedbackId, result.attachments])
          );

          setItems((currentItems) => currentItems.map((item) => {
            const feedbackId = getItemId(item);
            const attachments = attachmentMap.get(feedbackId);

            if (
              attachments &&
              attachments.length > 0 &&
              !(Array.isArray(item?.attachments) && item.attachments.length > 0)
            ) {
              return { ...item, attachments };
            }

            return item;
          }));
        });
      }
    } catch (loadError) {
      console.error('CommunityFeed load error', loadError);
      setError(
        loadError?.response?.data?.message ||
        loadError?.message ||
        'Không thể tải bảng tin cộng đồng.'
      );
      setHasMore(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [tab]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialFeed = async () => {
      const savedContext = restoreContextRef.current;
      const shouldRestore = (
        savedContext &&
        savedContext.tab === tab
      );
      const targetPage = shouldRestore
        ? Math.max(1, Number(savedContext.page) || 1)
        : 1;

      setItems([]);
      setHasMore(true);
      setPage(targetPage);

      for (let pageNumber = 1; pageNumber <= targetPage; pageNumber += 1) {
        if (cancelled) return;
        await loadPage(pageNumber);
      }
    };

    loadInitialFeed();

    return () => {
      cancelled = true;
    };
  }, [tab, loadPage]);

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
        const detail = await ticketApi.getTicketById(incomingFeedbackId, {
          role: 'service-user',
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

  const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
  const searchedItems = normalizedQuery
    ? items.filter((item) => {
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
    : items;

  const visibleItems = [...searchedItems].sort((left, right) => {
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

  const trendingItems = [...items]
    .sort((left, right) => (
      getSupportCount(right) + getCommentCount(right)
    ) - (
      getSupportCount(left) + getCommentCount(left)
    ))
    .slice(0, 4);

  const processingStatuses = new Set([
    managementTypes.feedbackStatus.VERIFIED,
    managementTypes.feedbackStatus.ASSIGNED,
    managementTypes.feedbackStatus.IN_PROGRESS,
    managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
  ]);
  const completedStatuses = new Set([
    managementTypes.feedbackStatus.RESOLVED,
    managementTypes.feedbackStatus.APPROVED,
    managementTypes.feedbackStatus.CLOSED,
  ]);
  const processingCount = items.filter((item) => processingStatuses.has(item?.status)).length;
  const completedCount = items.filter((item) => completedStatuses.has(item?.status)).length;
  const initialLoading = loading && items.length === 0;
  const loadingMore = loading && items.length > 0;

  const openDetail = (item) => {
    const feedbackId = getItemId(item);
    if (!feedbackId) return;

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
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadPage(1);
  };

  const handleLoadMore = () => {
    if (loading || !hasMore || isFetchingRef.current) return;

    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage);
  };

  return (
    <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-[24px] border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-base-200/55 p-1" role="tablist" aria-label="Lọc bảng tin">
              {TAB_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = tab === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTab(option.value)}
                    role="tab"
                    aria-selected={active}
                    className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                      active
                        ? 'bg-base-100 text-primary shadow-sm ring-1 ring-base-300'
                        : 'text-base-content/55 hover:bg-base-100/70 hover:text-base-content'
                    }`}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <label className="relative block w-full lg:max-w-sm">
              <span className="sr-only">Tìm kiếm trong bảng tin</span>
              <Lucide.Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/35"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tiêu đề, khu vực, danh mục..."
                className="input input-bordered h-10 w-full rounded-xl bg-base-100 pl-10 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/45">
            <span>
              {initialLoading
                ? 'Đang tải bảng tin...'
                : `${visibleItems.length} phản ánh phù hợp`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lucide.Radio size={13} className="text-success" aria-hidden="true" />
              Cập nhật theo thời gian thực
            </span>
          </div>
        </section>

        {error ? (
          <div>
            <ErrorAlert title="Không thể tải bảng tin" message={error} onClose={() => setError('')} />
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
          <div className="space-y-4">
            {visibleItems.map((item, index) => (
              <CommunityFeedItem
                key={getItemId(item) || index}
                item={item}
                highlighted={
                  String(getItemId(item)) === String(highlightedFeedbackId)
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
              {query ? 'Không tìm thấy phản ánh phù hợp' : 'Chưa có phản ánh công khai'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-base-content/55">
              {query
                ? 'Thử sử dụng từ khóa khác hoặc chuyển sang một nhóm bảng tin khác.'
                : 'Các phản ánh đã được xác minh sẽ xuất hiện tại đây để cộng đồng cùng theo dõi.'}
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
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
              disabled={loadingMore}
              className="btn btn-outline min-w-52 rounded-xl"
            >
              {loadingMore ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Đang tải thêm...
                </>
              ) : (
                <>
                  <Lucide.Plus size={16} aria-hidden="true" />
                  Xem thêm phản ánh
                </>
              )}
            </button>
          </div>
        ) : null}

        {!loading && !hasMore && items.length > 0 ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-base-content/45">
            <Lucide.CircleCheck size={16} className="text-success" aria-hidden="true" />
            Bạn đã xem hết các phản ánh phù hợp.
          </div>
        ) : null}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24">
        <section className="rounded-[24px] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lucide.ChartNoAxesColumnIncreasing size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-bold">Tổng quan bảng tin</h2>
              <p className="mt-0.5 text-xs text-base-content/45">Dựa trên dữ liệu đã tải</p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-base-300 bg-base-200/40 px-2 py-3 text-center">
              <dt className="text-[11px] text-base-content/45">Công khai</dt>
              <dd className="mt-1 text-xl font-bold">{items.length}</dd>
            </div>
            <div className="rounded-2xl border border-warning/15 bg-warning/5 px-2 py-3 text-center">
              <dt className="text-[11px] text-base-content/45">Đang xử lý</dt>
              <dd className="mt-1 text-xl font-bold text-warning">{processingCount}</dd>
            </div>
            <div className="rounded-2xl border border-success/15 bg-success/5 px-2 py-3 text-center">
              <dt className="text-[11px] text-base-content/45">Hoàn tất</dt>
              <dd className="mt-1 text-xl font-bold text-success">{completedCount}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[24px] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Được quan tâm</h2>
              <p className="mt-1 text-xs text-base-content/45">Phản ánh có nhiều tương tác</p>
            </div>
            <Lucide.Flame size={19} className="text-warning" aria-hidden="true" />
          </div>

          {trendingItems.length > 0 ? (
            <ol className="mt-4 space-y-2">
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
                    <Lucide.ChevronRight size={15} className="mt-1 shrink-0 text-base-content/25" aria-hidden="true" />
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

        <section className="rounded-[24px] border border-base-300 bg-base-100 p-5 shadow-sm">
          <h2 className="font-bold">Khám phá thêm</h2>
          <p className="mt-1 text-xs leading-5 text-base-content/45">
            Xem các phản ánh theo vị trí để nắm tình hình xung quanh bạn.
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
  );
}
