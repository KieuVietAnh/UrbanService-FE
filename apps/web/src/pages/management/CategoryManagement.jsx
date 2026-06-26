// src/pages/management/CategoryManagement.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { slaApi } from '../../services/api/slaApi';
import { toolsApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';

const categoryIconSet = [
  Lucide.Trash2,
  Lucide.Lightbulb,
  Lucide.Droplets,
  Lucide.Car,
  Lucide.TreePine,
  Lucide.Building2,
];

const getCategoryIcon = (index) => categoryIconSet[index % categoryIconSet.length];

const getActiveText = (isActive) => (isActive ? 'Đang hoạt động' : 'Tạm khóa');

const formatPhone = (phone) => phone || 'Chưa cập nhật';

export const CategoryManagement = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states to create category
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const operators = useMemo(() => toolsApi.getOperators(), []);

  const fetchCats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await slaApi.getCategories();
      setCategories(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCats();
  }, [fetchCats]);

  const categoryStats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((cat) => cat.isActive).length;
    const inactive = total - active;
    const assigned = categories.filter((cat) =>
      operators.some((operator) => operator.categoryId === cat.categoryId)
    ).length;

    return {
      total,
      active,
      inactive,
      assigned,
      unassigned: Math.max(total - assigned, 0),
    };
  }, [categories, operators]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catName || !catDesc) return;
    setCreateLoading(true);
    try {
      await slaApi.createCategory({
        categoryName: catName,
        description: catDesc
      }, user.userId);
      alert('Tạo danh mục mới thành công!');
      setShowCreateModal(false);
      setCatName('');
      setCatDesc('');
      fetchCats();
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                <Lucide.FolderKanban size={14} />
                Danh mục dịch vụ
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                  Cấu Hình Danh Mục Dịch Vụ
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Quản lý nhóm phản ánh đô thị, trạng thái hoạt động và đơn vị kỹ thuật đang phụ trách từng danh mục.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary rounded-2xl px-5 text-xs font-black shadow-lg shadow-primary/20"
            >
              <Lucide.PlusCircle size={17} />
              Thêm danh mục
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/40">Tổng danh mục</span>
            <div className="rounded-2xl bg-primary/10 p-2 text-primary">
              <Lucide.Layers3 size={18} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-base-content">{categoryStats.total}</p>
          <p className="mt-1 text-xs font-semibold text-base-content/55">Nhóm phản ánh đang được cấu hình.</p>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/40">Đang hoạt động</span>
            <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600">
              <Lucide.CheckCircle2 size={18} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-base-content">{categoryStats.active}</p>
          <p className="mt-1 text-xs font-semibold text-base-content/55">Có thể tiếp nhận phản ánh mới.</p>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/40">Đã gắn đơn vị</span>
            <div className="rounded-2xl bg-sky-500/10 p-2 text-sky-600">
              <Lucide.Network size={18} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-base-content">{categoryStats.assigned}</p>
          <p className="mt-1 text-xs font-semibold text-base-content/55">Có đơn vị xử lý mặc định.</p>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/40">Cần rà soát</span>
            <div className="rounded-2xl bg-amber-500/10 p-2 text-amber-600">
              <Lucide.AlertTriangle size={18} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-base-content">{categoryStats.unassigned + categoryStats.inactive}</p>
          <p className="mt-1 text-xs font-semibold text-base-content/55">Chưa gắn đơn vị hoặc đang khóa.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-base-content">Danh sách danh mục</h3>
            <p className="text-xs font-semibold text-base-content/50">
              Theo dõi phạm vi tiếp nhận và đơn vị chủ quản của từng nhóm phản ánh.
            </p>
          </div>
          <div className="rounded-2xl border border-base-300 bg-base-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-base-content/45">
            {categoryStats.total} danh mục
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-200/50">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-xs font-bold text-base-content/50">Đang tải danh mục dịch vụ...</p>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-200/50 p-8 text-center">
            <div className="max-w-md space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Lucide.FolderPlus size={24} />
              </div>
              <h4 className="text-base font-black text-base-content">Chưa có danh mục dịch vụ</h4>
              <p className="text-sm font-medium text-base-content/55">
                Tạo danh mục đầu tiên để hệ thống có thể phân loại và điều phối phản ánh đúng đơn vị xử lý.
              </p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm rounded-xl font-bold">
                <Lucide.PlusCircle size={15} />
                Thêm danh mục
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat, index) => {
              const operator = operators.find((item) => item.categoryId === cat.categoryId);
              const CategoryIcon = getCategoryIcon(index);

              return (
                <article
                  key={cat.categoryId}
                  className="group rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-content">
                        <CategoryIcon size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/35">
                          ID #{cat.categoryId}
                        </div>
                        <h4 className="mt-1 truncate text-base font-black text-base-content">
                          {cat.categoryName}
                        </h4>
                      </div>
                    </div>

                    <span className={`badge border-0 px-3 py-3 text-[10px] font-black uppercase ${cat.isActive
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : 'bg-base-300 text-base-content/60'
                      }`}
                    >
                      {getActiveText(cat.isActive)}
                    </span>
                  </div>

                  <p className="mt-4 min-h-[66px] text-sm font-medium leading-6 text-base-content/60">
                    {cat.description || 'Chưa có mô tả chi tiết cho danh mục này.'}
                  </p>

                  <div className="mt-5 rounded-3xl border border-base-300 bg-base-200/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-base-content/40">
                        Đơn vị chủ quản
                      </span>
                      {operator ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                          Đã gắn
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
                          Chưa gắn
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-base-100 text-primary shadow-sm">
                        <Lucide.HardHat size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-base-content">
                          {operator ? operator.operatorName : 'Chưa gắn đơn vị xử lý'}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-base-content/50">
                          <Lucide.Phone size={13} />
                          Hotline: {formatPhone(operator?.contactPhone)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl rounded-[2rem] border border-base-300 p-0 shadow-2xl">
            <div className="border-b border-base-300 bg-base-200/60 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Lucide.PlusCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-base-content">Thêm danh mục dịch vụ</h3>
                    <p className="mt-1 text-xs font-semibold text-base-content/55">
                      Tạo nhóm phân loại mới để phục vụ tiếp nhận và điều phối phản ánh.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-circle btn-ghost btn-sm"
                  aria-label="Đóng modal"
                >
                  <Lucide.X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-5 p-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                    Tên danh mục mới *
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Công viên cây xanh & Chiếu sáng"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="input input-bordered h-12 w-full rounded-2xl text-sm font-semibold"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                    Mô tả dịch vụ chi tiết *
                  </span>
                </label>
                <textarea
                  rows="5"
                  placeholder="Mô tả cụ thể phạm vi tiếp nhận các vấn đề thuộc nhóm danh mục này..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="textarea textarea-bordered w-full rounded-2xl p-4 text-sm font-semibold leading-6"
                  required
                ></textarea>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">
                Danh mục mới nên có mô tả rõ ràng để AI Copilot và đội vận hành phân loại phản ánh chính xác hơn.
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost rounded-2xl text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary rounded-2xl text-xs font-black"
                  disabled={createLoading}
                >
                  {createLoading ? <span className="loading loading-spinner"></span> : <Lucide.Save size={16} />}
                  Tạo danh mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
