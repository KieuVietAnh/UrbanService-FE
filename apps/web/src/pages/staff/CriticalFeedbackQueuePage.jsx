import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { EmptyState, LoadingSpinner } from '@urbanmind/shared-ui';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { toolsApi } from '@urbanmind/shared-api';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';

const URGENCY_OPTIONS = ['High', 'Critical'];

const getUrgencyIntent = (urgency = '') => {
  const normalized = `${urgency || ''}`.trim().toLowerCase();
  if (normalized === 'critical') return 'danger';
  if (normalized === 'high') return 'warning';
  return 'neutral';
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const formatConfidence = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const percent = numeric > 1 ? numeric : numeric * 100;
  return `${Math.round(percent)}%`;
};

export const CriticalFeedbackQueuePage = () => {
  const navigate = useNavigate();
  const { feedbackId } = useParams();

  const [feedbacks, setFeedbacks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');

  useEffect(() => {
    const loadQueue = async () => {
      try {
        setLoading(true);
        const [queueResponse, categoriesResponse] = await Promise.all([
          managementFeedbackApi.getAiReviewedFeedbacks({ pageSize: 100 }),
          toolsApi.getCategories().catch(() => []),
        ]);

        const normalizedQueue = Array.isArray(queueResponse) ? queueResponse : [];
        const criticalOnly = normalizedQueue.filter((item) => {
          const urgency = `${item?.urgencyLevel || item?.analysisResult?.urgencyLevel || item?.urgency || ''}`.trim();
          return urgency === 'High' || urgency === 'Critical';
        });

        setFeedbacks(criticalOnly);
        setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : []);
      } catch (error) {
        console.error('Failed to load critical feedback queue', error);
        setFeedbacks([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, []);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      const title = `${item?.title || item?.description || ''}`.toLowerCase();
      const area = `${item?.areaName || item?.area?.name || item?.locationText || ''}`.toLowerCase();
      const category = `${item?.categoryName || item?.detectedCategoryName || item?.category?.name || ''}`.toLowerCase();
      const urgency = `${item?.urgencyLevel || item?.analysisResult?.urgencyLevel || item?.urgency || ''}`.trim();

      const matchesSearch = !search || [title, area, category].some((value) => value.includes(search.toLowerCase()));
      const matchesCategory = !categoryFilter || category.includes(categoryFilter.toLowerCase());
      const matchesUrgency = !urgencyFilter || urgency === urgencyFilter;

      return matchesSearch && matchesCategory && matchesUrgency;
    });
  }, [categoryFilter, feedbacks, search, urgencyFilter]);

  const selectedFeedback = useMemo(() => {
    return filteredFeedbacks.find((item) => String(item?.feedbackId || item?.id) === String(feedbackId)) || null;
  }, [feedbackId, filteredFeedbacks]);

  const detailFeedback = selectedFeedback || (feedbackId ? feedbacks.find((item) => String(item?.feedbackId || item?.id) === String(feedbackId)) || null : null);

  return (
    <div className="space-y-5 text-slate-800">
      <section className="admin-page-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge intent="warning" className="gap-2 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]">
              <Lucide.AlertCircle size={14} />
              Hàng chờ phản ánh khẩn cấp
            </Badge>
            <h1 className="admin-hero-title mt-3">Theo dõi phản ánh có mức độ ưu tiên cao</h1>
            <p className="admin-hero-description mt-2 max-w-2xl">
              Chỉ hiển thị các phản ánh đã được AI đánh dấu là High hoặc Critical để nhân viên xử lý nhanh hơn.
            </p>
          </div>
          <div className="admin-inset-panel px-4 py-3 text-sm text-slate-600">
            <div className="admin-section-description uppercase tracking-[0.24em]">Tổng phản ánh</div>
            <div className="mt-1 heading-2 text-slate-900">{filteredFeedbacks.length}</div>
          </div>
        </div>
      </section>

      <section className="admin-panel p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>Tìm kiếm</span>
            <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200/80 bg-[rgba(248,250,252,0.88)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <Lucide.Search size={16} className="text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tiêu đề, khu vực, danh mục" className="w-full bg-transparent text-sm outline-none text-slate-800" />
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>Danh mục</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-[1rem] border border-slate-200/80 bg-[rgba(248,250,252,0.88)] px-3 py-2.5 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] outline-none">
              <option value="">Tất cả</option>
              {categories.map((category) => (
                <option key={category.id || category.categoryId} value={category.name || category.categoryName || category.categoryType || category.type}>
                  {category.name || category.categoryName || category.categoryType || category.type}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>Mức độ ưu tiên</span>
            <select value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value)} className="rounded-[1rem] border border-slate-200/80 bg-[rgba(248,250,252,0.88)] px-3 py-2.5 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] outline-none">
              <option value="">Tất cả</option>
              {URGENCY_OPTIONS.map((urgency) => (
                <option key={urgency} value={urgency}>{urgency}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <div className="admin-panel p-10 text-center">
          <LoadingSpinner />
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="admin-empty-panel p-10 text-center">
          <EmptyState title="Không có phản ánh khẩn cấp" description="Không có dữ liệu phù hợp với bộ lọc hiện tại." />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-3">
            {filteredFeedbacks.map((item) => {
              const urgency = `${item?.urgencyLevel || item?.analysisResult?.urgencyLevel || item?.urgency || ''}`.trim();
              const feedbackIdValue = item?.feedbackId || item?.id;
              const isActive = String(feedbackIdValue) === String(feedbackId);

              return (
                <article key={feedbackIdValue} className={`rounded-[1.4rem] border p-4 shadow-[0_14px_34px_rgba(15,23,42,0.058)] transition ${isActive ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.96))] hover:border-slate-300'}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge intent={getUrgencyIntent(urgency)} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                          {urgency || 'High'}
                        </Badge>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                          {item?.confidenceScore ? formatConfidence(item.confidenceScore) : '—'}
                        </span>
                      </div>
                      <h2 className="mt-3 heading-3 text-slate-900">{item?.title || item?.description || 'Không có tiêu đề'}</h2>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="admin-inset-panel p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Khu vực</div>
                          <div className="mt-1 font-semibold text-slate-700">{item?.areaName || item?.area?.name || item?.locationText || '—'}</div>
                        </div>
                        <div className="admin-inset-panel p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Danh mục</div>
                          <div className="mt-1 font-semibold text-slate-700">{item?.categoryName || item?.detectedCategoryName || item?.category?.name || '—'}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          <Lucide.Clock3 size={14} />
                          {formatDateTime(item?.createdAt || item?.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          <Lucide.Sparkles size={14} />
                          AI confidence {formatConfidence(item?.confidenceScore)}
                        </span>
                      </div>
                    </div>
                    <Button type="button" onClick={() => navigate(`/staff/critical-feedbacks/${feedbackIdValue}`)} variant="outline" size="sm">
                      <Lucide.Eye size={16} />
                      Xem chi tiết
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="admin-panel p-5">
            {detailFeedback ? (
              <div className="space-y-4">
                <div>
                  <Badge intent="warning" className="gap-2 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]">
                    <Lucide.FileText size={14} />
                    Chi tiết phản ánh
                  </Badge>
                  <h2 className="mt-3 heading-3 text-slate-900">{detailFeedback?.title || detailFeedback?.description || 'Không có tiêu đề'}</h2>
                  <p className="mt-2 body-text">{detailFeedback?.description || 'Không có nội dung mô tả chi tiết.'}</p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Khu vực</div>
                    <div className="mt-1 font-semibold text-slate-700">{detailFeedback?.areaName || detailFeedback?.area?.name || detailFeedback?.locationText || '—'}</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Danh mục</div>
                    <div className="mt-1 font-semibold text-slate-700">{detailFeedback?.categoryName || detailFeedback?.detectedCategoryName || detailFeedback?.category?.name || '—'}</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Mức độ ưu tiên</div>
                    <div className="mt-1 font-semibold text-slate-700">{detailFeedback?.urgencyLevel || detailFeedback?.analysisResult?.urgencyLevel || detailFeedback?.urgency || '—'}</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">AI Confidence</div>
                    <div className="mt-1 font-semibold text-slate-700">{formatConfidence(detailFeedback?.confidenceScore)}</div>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Thời gian gửi</div>
                  <div className="mt-1 font-semibold text-slate-700">{formatDateTime(detailFeedback?.createdAt || detailFeedback?.created_at)}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Chọn một phản ánh để xem chi tiết.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default CriticalFeedbackQueuePage;
