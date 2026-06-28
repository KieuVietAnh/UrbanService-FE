import { useEffect, useState, useRef, useCallback } from 'react';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import CommunityFeedItem from './CommunityFeedItem';
import CommentDrawer from './CommentDrawer';
import { getCommunityFeed } from '../../services/api/feedApi';

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
      const response = await getCommunityFeed({ page: p, tab: tab.toLowerCase() });
      const { items: fetchedItems, pageNumber, totalPages } = response;

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
        if (deduped.length === prev.length && p !== 1) {
          setHasMore(false);
        }
        return deduped;
      });
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
            {Array.from({length:3}).map((_,i)=> (
              <div key={i} className="animate-pulse bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="h-44 bg-slate-100 rounded-lg mb-3" />
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
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
