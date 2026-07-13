import { useEffect, useState, useRef, useCallback } from 'react';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import CommunityFeedItem from './CommunityFeedItem';
import CommentDrawer from './CommentDrawer';
import { getCommunityFeed } from '../../services/api/feedApi';
import { ticketApi } from '../../services/api/ticketApi';
import { managementTypes } from '@urbanmind/shared-types';
import { normalizeTicketsResponse } from '@urbanmind/shared-api';
import { signalrService } from '../../services/socket/signalrService';

export default function CommunityFeed({ initialTab = 'Latest' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState(initialTab);
  const [error, setError] = useState('');
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const observerRef = useRef();
  const isFetchingRef = useRef(false);

  const dedupeFeedItems = (feedItems = []) => {
    const seen = new Set();
    return feedItems.filter((item, index) => {
      const itemId = item?.feedbackId || item?.id || item?.ticketId || String(index);
      if (seen.has(itemId)) return false;
      seen.add(itemId);
      return true;
    });
  };

  const loadPage = useCallback(async (p = 1) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setError('');
      setLoading(true);
      const response = await getCommunityFeed({
        PageNumber: p,
        PageSize: 10,
        Status: tab === 'Resolved' ? 'Resolved' : undefined,
      });
      const { items: fetchedItemsRaw, pageNumber, totalPages } = response;
      const fetchedItems = normalizeTicketsResponse(fetchedItemsRaw || []);

      if (!fetchedItems || fetchedItems.length === 0) {
        setHasMore(false);
        if (p === 1) {
          setItems([]);
        }
        return;
      }

      setItems((prev) => {
        const merged = p === 1 ? fetchedItems : [...prev, ...fetchedItems];
        const deduped = dedupeFeedItems(merged);
        // Filter out statuses that should not be visible in the public feed
        const filtered = deduped.filter((it) => {
          // Defensive: only show public items
          if (it?.isPublic === false) return false;
          const vis = String(it?.visibility || it?.scope || '').toLowerCase();
          if (vis === 'private' || vis === 'internal') return false;

          const s = it?.status;
          if (!s) return false;
          if (s === managementTypes.feedbackStatus.SUBMITTED) return false;
          if (s === managementTypes.feedbackStatus.AI_REVIEWED) return false;
          return true;
        });
        if (filtered.length === prev.length && p !== 1) {
          setHasMore(false);
        }
        return filtered;
      });

      // If API returns only attachment counts (no attachment objects/urls),
      // fetch ticket details for items that have attachments so we can show previews.
      (async () => {
        try {
          const needs = fetchedItems.filter((it) => it?.attachmentCount > 0 && !(it.attachments && it.attachments.length));
          if (needs.length === 0) return;

          const lookups = await Promise.all(
            needs.map(async (it) => {
              try {
                const detail = await ticketApi.getTicketById(it.feedbackId || it.id, { role: 'service-user' });
                return { id: it.feedbackId || it.id, attachments: Array.isArray(detail?.attachments) ? detail.attachments : [] };
              } catch (error) {
                console.warn('Failed to fetch ticket detail for preview', it.feedbackId || it.id, error?.message || error);
                return { id: it.feedbackId || it.id, attachments: [] };
              }
            })
          );

          const map = new Map(lookups.map((l) => [l.id, l.attachments]));
          setItems((prev) => prev.map((it) => {
            const id = it.feedbackId || it.id;
            if (map.has(id) && (!it.attachments || it.attachments.length === 0)) {
              return { ...it, attachments: map.get(id) };
            }
            return it;
          }));
        } catch (error) {
          console.warn('Failed to fetch previews for feed items', error?.message || error);
        }
      })();
      setHasMore(pageNumber < totalPages);
    } catch (err) {
      console.error('CommunityFeed load error', err);
      setError(err?.message || String(err));
      setHasMore(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [tab]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadPage(1);
  }, [tab, loadPage]);

  // realtime updates for feed items
  useEffect(() => {
    signalrService.start();

    const handleCommentAdded = (incomingFeedbackId) => {
      setItems((prev) => prev.map((it) => {
        const id = it.feedbackId || it.id;
        if (id === incomingFeedbackId) {
          const currentCount = it.commentCount ?? (Array.isArray(it.comments) ? it.comments.length : 0);
          return { ...it, commentCount: currentCount + 1 };
        }
        return it;
      }));
    };

    const handleSupportAdded = (incomingFeedbackId, payload) => {
      setItems((prev) => prev.map((it) => {
        const id = it.feedbackId || it.id;
        if (id === incomingFeedbackId) {
          return { ...it, supportCount: payload?.supportCount ?? (it.supportCount || 0) };
        }
        return it;
      }));
    };

    const handleStatusChanged = async (incomingFeedbackId, payload) => {
      setItems((prev) => prev.map((it) => {
        const id = it.feedbackId || it.id;
        if (id === incomingFeedbackId) {
          // remove from public feed if status becomes Submitted or AI Reviewed
          const newStatus = payload?.newStatus;
          if (newStatus === managementTypes.feedbackStatus.SUBMITTED || newStatus === managementTypes.feedbackStatus.AI_REVIEWED) {
            return null; // filtered out later
          }
          return { ...it, status: newStatus };
        }
        return it;
      }).filter(Boolean));
    };

    const handleAssignment = async (incomingFeedbackId, payload) => {
      setItems((prev) => prev.map((it) => (it.feedbackId === incomingFeedbackId || it.id === incomingFeedbackId) ? { ...it, assignment: payload } : it));
    };

    const handleResolutionRefresh = async (incomingFeedbackId) => {
      try {
        const detail = await ticketApi.getTicketById(incomingFeedbackId, { role: 'service-user' });
        setItems((prev) => prev.map((it) => {
          const id = it.feedbackId || it.id;
          if (id === incomingFeedbackId) {
            return { ...it, ...detail };
          }
          return it;
        }));
      } catch {
        // ignore
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

  // infinite scroll sentinel
  useEffect(() => {
    if (!hasMore) return;
    const el = observerRef.current;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && !isFetchingRef.current) {
        const next = page + 1;
        loadPage(next);
        setPage(next);
      }
    }, { rootMargin: '400px' });
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, [page, hasMore, loading, loadPage]);

  const openDetail = (item) => {
    // handle open detail - navigate or modal
    window.location.href = `/community/feed/${item.feedbackId}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-auto">
        {['Trending','Latest','Nearby','Resolved'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-ghost btn-sm rounded-full ${tab===t? 'btn-active':''}`}>{t}</button>
        ))}
      </div>

      {error && (
        <div>
          <ErrorAlert title="Lỗi tải nguồn" message={error} onClose={() => setError('')} />
          <div className="mt-2">
            <button onClick={() => { setPage(1); setHasMore(true); loadPage(1); }} className="btn btn-sm">Thử lại</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {items.map((it, index) => {
          const key = it?.feedbackId || it?.id || it?.ticketId || `${index}-${String(it)}`;
          return (
            <CommunityFeedItem key={key} item={it} onOpenComments={(id) => setOpenCommentsFor(id)} onOpen={openDetail} />
          );
        })}

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="h-40 sm:h-56 bg-slate-100 rounded-lg mb-3" />
                <div className="h-4 bg-slate-100 rounded w-5/6 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-600">
            <h4 className="font-bold">Không có phản ánh để hiển thị</h4>
            <p className="text-sm mt-2">Thử thay đổi bộ lọc hoặc đăng nhập để xem nhiều hơn.</p>
          </div>
        )}

        <div ref={observerRef} />
      </div>

      <CommentDrawer open={!!openCommentsFor} feedbackId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />
    </div>
  );
}
