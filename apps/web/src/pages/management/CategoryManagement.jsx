// src/pages/management/CategoryManagement.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { slaApi } from '../../services/api/slaApi';
import { toolsApi } from '@urbanmind/shared-api';
import { SuccessAlert, ErrorAlert } from '../../components/alerts/ErrorAlert';
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

const StatCard = ({ label, value, description, icon: Icon, tone = 'primary' }) => {
  const toneClass = {
    primary: 'bg-blue-50 text-blue-700',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    warning: 'bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className="admin-stat-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
};

const CreateCategoryModal = ({
  catName,
  catDesc,
  createLoading,
  onClose,
  onSubmit,
  onNameChange,
  onDescChange,
}) => createPortal(
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <div className="border-b border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Lucide.PlusCircle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Thêm danh mục dịch vụ</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Tạo nhóm phân loại mới để tiếp nhận và điều phối phản ánh đúng đơn vị xử lý.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
            aria-label="Đóng modal"
          >
            <Lucide.X size={18} />
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6">
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-semibold text-slate-600">Tên danh mục *</span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Công viên cây xanh & chiếu sáng"
            value={catName}
            onChange={(e) => onNameChange(e.target.value)}
            className="input input-bordered h-12 w-full rounded-2xl text-sm"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-semibold text-slate-600">Mô tả dịch vụ *</span>
          </label>
          <textarea
            rows="5"
            placeholder="Mô tả phạm vi tiếp nhận các vấn đề thuộc danh mục này..."
            value={catDesc}
            onChange={(e) => onDescChange(e.target.value)}
            className="textarea textarea-bordered w-full rounded-2xl p-4 text-sm leading-6"
            required
          />
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-600">
          Mô tả rõ ràng giúp AI Copilot và đội vận hành phân loại phản ánh chính xác hơn.
        </div>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-ghost rounded-2xl text-sm font-semibold">
            Hủy
          </button>
          <button type="submit" className="btn rounded-xl border-0 bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700" disabled={createLoading}>
            {createLoading ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={16} />}
            Tạo danh mục
          </button>
        </div>
      </form>
    </div>
  </div>,
  document.body
);

export const CategoryManagement = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCats = useCallback(async () => {
    setLoading(true);
    try {
      const [resCategories, resOperators] = await Promise.all([
        slaApi.getCategories(),
        toolsApi.getOperators(),
      ]);
      setCategories(Array.isArray(resCategories) ? resCategories : []);
      setOperators(Array.isArray(resOperators) ? resOperators : []);
    } catch (err) {
      console.error(err);
      setCategories([]);
      setOperators([]);
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

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return categories.filter((cat) => {
      const operator = operators.find((item) => item.categoryId === cat.categoryId);
      const text = [
        cat.categoryId,
        cat.categoryName,
        cat.description,
        operator?.operatorName,
        operator?.contactPhone,
        getActiveText(cat.isActive),
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && cat.isActive) ||
        (statusFilter === 'inactive' && !cat.isActive) ||
        (statusFilter === 'assigned' && operator) ||
        (statusFilter === 'unassigned' && !operator);

      return matchesSearch && matchesStatus;
    });
  }, [categories, operators, search, statusFilter]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim() || !catDesc.trim()) return;

    setCreateLoading(true);
    try {
      await slaApi.createCategory({
        categoryName: catName.trim(),
        description: catDesc.trim(),
      }, user?.userId);
      setMessage({ type: 'success', text: 'Tạo danh mục mới thành công!' });
      setShowCreateModal(false);
      setCatName('');
      setCatDesc('');
      fetchCats();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi tạo danh mục.' });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="admin-page-shell space-y-6">
      {message.type === 'success' && (
        <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      )}
      {message.type === 'error' && (
        <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      )}

      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.FolderKanban size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="admin-hero-title">
                Cấu hình danh mục dịch vụ
              </h2>
              <p className="admin-hero-description">
                Quản lý nhóm phản ánh đô thị, trạng thái hoạt động và đơn vị kỹ thuật phụ trách từng danh mục.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-primary-action btn rounded-xl px-5 text-sm font-semibold normal-case"
          >
            <Lucide.PlusCircle size={17} />
            Thêm danh mục
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng danh mục" value={categoryStats.total} description="Nhóm phản ánh đang cấu hình." icon={Lucide.Layers3} />
        <StatCard label="Đang hoạt động" value={categoryStats.active} description="Có thể tiếp nhận phản ánh mới." icon={Lucide.CheckCircle2} tone="success" />
        <StatCard label="Đã gắn đơn vị" value={categoryStats.assigned} description="Có đơn vị xử lý mặc định." icon={Lucide.Network} tone="info" />
        <StatCard label="Cần rà soát" value={categoryStats.unassigned + categoryStats.inactive} description="Chưa gắn đơn vị hoặc đang khóa." icon={Lucide.AlertTriangle} tone="warning" />
      </section>

      <section className="admin-panel p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Danh sách danh mục</h3>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi phạm vi tiếp nhận và đơn vị chủ quản của từng nhóm phản ánh.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="input input-bordered flex h-11 min-w-[260px] items-center gap-2 rounded-2xl bg-white text-sm">
              <Lucide.Search size={16} className="text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="grow"
                placeholder="Tìm tên, mô tả, đơn vị..."
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select select-bordered h-11 rounded-2xl text-sm"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm khóa</option>
              <option value="assigned">Đã gắn đơn vị</option>
              <option value="unassigned">Chưa gắn đơn vị</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty-panel flex min-h-[320px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="loading loading-spinner loading-lg text-blue-700" />
              <p className="text-sm text-slate-500">Đang tải danh mục dịch vụ...</p>
            </div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="admin-empty-panel flex min-h-[320px] items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                <Lucide.FolderPlus size={24} />
              </div>
              <h4 className="text-base font-semibold text-slate-950">Không có danh mục phù hợp</h4>
              <p className="text-sm leading-6 text-slate-500">
                Thử đổi từ khóa, bộ lọc hoặc tạo danh mục mới để hệ thống có thể phân loại phản ánh.
              </p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-sm rounded-xl border-0 bg-blue-600 font-semibold text-white hover:bg-blue-700">
                <Lucide.PlusCircle size={15} />
                Thêm danh mục
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCategories.map((cat, index) => {
              const operator = operators.find((item) => item.categoryId === cat.categoryId);
              const CategoryIcon = getCategoryIcon(index);

              return (
                <article
                  key={cat.categoryId}
                  className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <CategoryIcon size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">ID #{cat.categoryId}</div>
                        <h4 className="mt-1 truncate text-base font-semibold text-slate-950">{cat.categoryName}</h4>
                      </div>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cat.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {getActiveText(cat.isActive)}
                    </span>
                  </div>

                  <p className="mt-4 min-h-[66px] text-sm leading-6 text-slate-500">
                    {cat.description || 'Chưa có mô tả chi tiết cho danh mục này.'}
                  </p>

                  <div className="admin-inset-panel mt-5 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-400">Đơn vị chủ quản</span>
                      {operator ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Đã gắn</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Chưa gắn</span>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                        <Lucide.HardHat size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {operator ? operator.operatorName : 'Chưa gắn đơn vị xử lý'}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
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
        <CreateCategoryModal
          catName={catName}
          catDesc={catDesc}
          createLoading={createLoading}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCategory}
          onNameChange={setCatName}
          onDescChange={setCatDesc}
        />
      )}
    </div>
  );
};
