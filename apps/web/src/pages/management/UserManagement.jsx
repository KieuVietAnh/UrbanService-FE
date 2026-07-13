// src/pages/management/UserManagement.jsx
import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../services/api/userApi';
import * as Lucide from 'lucide-react';

const ROLE_META = {
  'service-user': {
    label: 'Người dân',
    className: 'um-role-badge-user bg-blue-50 text-blue-700 ring-blue-100',
  },
  'system-staff': {
    label: 'Cán bộ tiếp nhận',
    className: 'um-role-badge-staff bg-violet-50 text-violet-700 ring-violet-100',
  },
  'service-provider': {
    label: 'Điều phối xử lý',
    className: 'um-role-badge-provider bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  'interaction-manager': {
    label: 'Quản lý tương tác',
    className: 'um-role-badge-interaction bg-amber-50 text-amber-700 ring-amber-100',
  },
  administrator: {
    label: 'Quản trị viên',
    className: 'um-role-badge-admin bg-slate-100 text-slate-700 ring-slate-200',
  },
};

const roleOptions = [
  { value: 'service-user', label: 'Người dân' },
  { value: 'system-staff', label: 'Cán bộ tiếp nhận' },
  { value: 'service-provider', label: 'Điều phối xử lý' },
  { value: 'interaction-manager', label: 'Quản lý tương tác' },
  { value: 'administrator', label: 'Quản trị viên' },
];

const ROLE_DESCRIPTIONS = {
  'service-user': 'Gửi phản ánh, theo dõi trạng thái xử lý và đánh giá kết quả.',
  'system-staff': 'Tiếp nhận, kiểm tra, phân loại và điều phối phản ánh mới.',
  'service-provider': 'Cập nhật tiến độ xử lý từ hiện trường hoặc từ đầu mối bên ngoài.',
  'interaction-manager': 'Theo dõi tương tác cộng đồng, sentiment và các kênh phản hồi.',
  administrator: 'Quản trị tài khoản, danh mục, SLA, tích hợp, audit log và vận hành hệ thống.',
};

const USERS_PAGE_SIZE = 8;

const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const normalizePhoneNumber = (value = '') => value.replace(/\D/g, '').slice(0, 10);
const isValidPhoneNumber = (value = '') => /^0\d{9}$/.test(value.trim());

const getApiErrorMessage = (error, fallback) => {
  const status = error?.response?.status || error?.status;
  const apiMessage = error?.response?.data?.message || error?.response?.data?.error;

  if (status === 404) {
    return 'Không tìm thấy API người dùng. Kiểm tra endpoint quản lý người dùng trên backend.';
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Không kết nối được API người dùng. Kiểm tra backend hoặc cấu hình API.';
  }

  return apiMessage || error?.message || fallback;
};


const USER_MANAGEMENT_SCOPED_STYLES = `
  .um-users-card { min-width: 0; max-width: 100%; }
  .um-users-table { table-layout: fixed; }
  .um-users-filter-grid { grid-template-columns: 1fr; }
  @media (min-width: 640px) {
    .um-users-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .um-users-filter-search { grid-column: 1 / -1; }
  }
  @media (min-width: 1280px) {
    .um-users-filter-grid { grid-template-columns: minmax(260px, 320px) 170px 160px 150px; }
    .um-users-filter-search { grid-column: auto; }
  }
  .um-role-badge,
  .um-status-badge {
    min-height: 30px;
    white-space: nowrap;
  }
  .um-role-badge {
    min-width: 138px;
    justify-content: center;
  }
  .um-status-badge {
    min-width: 112px;
    justify-content: center;
  }
  .um-user-actions {
    min-width: 260px;
  }
  .um-user-action-button {
    min-width: 112px;
  }
  .um-user-lock-button {
    min-width: 96px;
  }
  .um-access-status-toggle {
    min-width: 178px;
    min-height: 62px;
  }
  .um-access-status-toggle-label {
    min-width: 96px;
    white-space: nowrap;
  }
  .um-access-role-compare-card {
    min-height: 118px;
  }
  .um-access-compare-helper {
    min-height: 18px;
  }
  .um-access-policy-note {
    min-height: 82px;
  }
  .um-access-compare-arrow {
    width: 34px;
    height: 34px;
  }

  .um-filter-select {
    color-scheme: light;
    background-color: #f8fafc !important;
    color: #0f172a !important;
    border-color: #cbd5e1 !important;
    outline: none !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  .um-filter-select:hover {
    background-color: #ffffff !important;
    border-color: #bfdbfe !important;
  }
  .um-filter-select:focus {
    background-color: #ffffff !important;
    border-color: #2563eb !important;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12) !important;
  }
  .um-filter-select option {
    background-color: #ffffff !important;
    color: #0f172a !important;
  }
  html[data-theme="dark"] .um-filter-select {
    color-scheme: dark;
    background-color: rgba(15, 23, 42, 0.92) !important;
    color: #e2e8f0 !important;
    border-color: rgba(71, 85, 105, 0.92) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
  }
  html[data-theme="dark"] .um-filter-select:hover {
    background-color: rgba(15, 23, 42, 1) !important;
    border-color: rgba(96, 165, 250, 0.58) !important;
  }
  html[data-theme="dark"] .um-filter-select:focus {
    background-color: rgba(15, 23, 42, 1) !important;
    border-color: #60a5fa !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.20) !important;
  }
  html[data-theme="dark"] .um-filter-select option {
    background-color: #0f172a !important;
    color: #e2e8f0 !important;
  }
  .um-access-role-select {
    appearance: none;
    outline: none !important;
  }
  .um-access-role-select:focus {
    border-color: #2563eb !important;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14) !important;
  }
  html[data-theme="dark"] .um-access-role-select {
    background: rgba(15, 23, 42, 0.92);
    border-color: rgba(71, 85, 105, 0.92);
    color: #e2e8f0;
  }
  html[data-theme="dark"] .um-access-role-select:focus {
    border-color: #60a5fa !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.22) !important;
  }
  html[data-theme="dark"] .um-role-badge-staff {
    background: rgba(109, 40, 217, 0.30) !important;
    color: #ddd6fe !important;
    border-color: rgba(167, 139, 250, 0.36) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  html[data-theme="dark"] .um-role-badge-user {
    background: rgba(37, 99, 235, 0.28) !important;
    color: #bfdbfe !important;
    border-color: rgba(96, 165, 250, 0.36) !important;
  }
  html[data-theme="dark"] .um-role-badge-provider {
    background: rgba(4, 120, 87, 0.26) !important;
    color: #a7f3d0 !important;
    border-color: rgba(52, 211, 153, 0.34) !important;
  }
  html[data-theme="dark"] .um-role-badge-interaction {
    background: rgba(146, 64, 14, 0.26) !important;
    color: #fde68a !important;
    border-color: rgba(251, 191, 36, 0.34) !important;
  }
  html[data-theme="dark"] .um-role-badge-admin,
  html[data-theme="dark"] .um-role-badge-unknown {
    background: rgba(51, 65, 85, 0.58) !important;
    color: #cbd5e1 !important;
    border-color: rgba(148, 163, 184, 0.32) !important;
  }
`;

const getRoleMeta = (role) => ROLE_META[role] || {
  label: role || 'Không xác định',
  className: 'um-role-badge-unknown bg-slate-100 text-slate-600 ring-slate-200',
};

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'U';
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase();
};

const StatCard = ({ icon: Icon, label, value, helper, tone = 'slate' }) => {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  }[tone];

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
};

const ToastMessage = ({ type, text, onClose }) => {
  if (!text) return null;

  const isError = type === 'error';

  return (
    <div className="fixed right-6 top-20 z-50 w-[min(420px,calc(100vw-32px))]">
      <div className={`rounded-2xl border bg-white p-4 shadow-2xl shadow-slate-900/10 ${isError ? 'border-rose-200' : 'border-emerald-200'}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isError ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {isError ? <Lucide.AlertCircle size={18} /> : <Lucide.CheckCircle2 size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-950">{isError ? 'Có lỗi xảy ra' : 'Thành công'}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">{text}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng thông báo"
          >
            <Lucide.X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};


const CustomSelect = ({
  value,
  options,
  onChange,
  ariaLabel,
  getDescription,
  placeholder = 'Chọn',
  buttonClassName = '',
  menuClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const selectRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((item) => item.value === value);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 220);
    const safeGap = 12;
    const estimatedItemHeight = getDescription ? 62 : 44;
    const estimatedHeight = Math.min(320, Math.max(56, options.length * estimatedItemHeight + 12));
    const spaceBelow = window.innerHeight - rect.bottom - safeGap;
    const spaceAbove = rect.top - safeGap;
    const shouldOpenUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const menuHeight = shouldOpenUp ? Math.min(estimatedHeight, spaceAbove) : Math.min(estimatedHeight, spaceBelow || estimatedHeight);
    const left = Math.min(
      Math.max(safeGap, rect.left),
      Math.max(safeGap, window.innerWidth - minWidth - safeGap),
    );

    setMenuStyle({
      position: 'fixed',
      left,
      top: shouldOpenUp ? Math.max(safeGap, rect.top - menuHeight - 8) : rect.bottom + 8,
      width: minWidth,
      maxHeight: Math.max(140, menuHeight),
      zIndex: 180,
    });
  }, [getDescription, options.length]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();

    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const clickedTrigger = selectRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);

      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const menu = open && menuStyle ? createPortal((
    <div
      ref={menuRef}
      className={`overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-950 dark:shadow-[0_22px_60px_rgba(0,0,0,0.42)] ${menuClassName}`}
      role="listbox"
      aria-label={ariaLabel}
      style={menuStyle}
    >
      {options.map((item) => {
        const active = item.value === value;
        const description = getDescription?.(item);

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => handleSelect(item.value)}
            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${active
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100'
            }`}
            role="option"
            aria-selected={active}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active
              ? 'bg-blue-600 text-white dark:bg-blue-400 dark:text-slate-950'
              : 'bg-slate-100 text-transparent dark:bg-slate-800'
            }`}>
              <Lucide.Check size={13} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{item.label}</span>
              {description && (
                <span className={`mt-0.5 block text-xs leading-5 ${active ? 'text-blue-600 dark:text-blue-200/80' : 'text-slate-500 dark:text-slate-500'}`}>
                  {description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  ), document.body) : null;

  return (
    <div ref={selectRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:border-blue-400/50 dark:hover:bg-slate-950 dark:focus:border-blue-400 dark:focus:ring-blue-500/20 ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="min-w-0 truncate">{selected?.label || placeholder}</span>
        <Lucide.ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition dark:text-slate-500 ${open ? 'rotate-180 text-blue-500 dark:text-blue-300' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
};


const EditAccessModal = ({
  targetUser,
  editRole,
  editActive,
  accessLoading,
  onRoleChange,
  onActiveChange,
  onClose,
  onSubmit,
}) => {
  if (!targetUser) return null;

  const currentMeta = getRoleMeta(targetUser.role);
  const nextMeta = getRoleMeta(editRole);
  const roleChanged = editRole !== targetUser.role;
  const isAdminRole = editRole === 'administrator';

  return createPortal((
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-access-title"
    >
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.25)] dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-6 dark:border-slate-700 dark:bg-slate-900/80">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <Lucide.UserCog size={20} />
            </span>
            <div className="min-w-0">
              <h3 id="edit-access-title" className="text-xl font-semibold text-slate-950 dark:text-slate-100">Chỉnh quyền tài khoản</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Đổi vai trò nghiệp vụ hoặc khóa/mở quyền đăng nhập của tài khoản này.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Đóng"
          >
            <Lucide.X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              {targetUser.avatarUrl ? (
                <div className="avatar">
                  <div className="h-12 w-12 rounded-xl ring-1 ring-slate-200">
                    <img src={targetUser.avatarUrl} alt={targetUser.fullName || 'Avatar'} />
                  </div>
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                  {getInitials(targetUser.fullName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{targetUser.fullName || 'Chưa có tên'}</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">{targetUser.email || 'Chưa có email'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <div className="grid gap-3 sm:grid-cols-[150px_1fr] sm:items-start">
                <label className="pt-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Vai trò truy cập</span>
                </label>

                <div>
                  <CustomSelect
                    value={editRole}
                    onChange={onRoleChange}
                    options={roleOptions}
                    ariaLabel="Chọn vai trò truy cập"
                    getDescription={(item) => ROLE_DESCRIPTIONS[item.value]}
                    menuClassName="max-h-[320px] overflow-y-auto"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {ROLE_DESCRIPTIONS[editRole] || 'Vai trò này chưa có mô tả nghiệp vụ.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
              <div className="um-access-role-compare-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-400 dark:text-slate-500">Vai trò hiện tại</p>
                    <span className={`um-role-badge mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${currentMeta.className}`}>
                      {currentMeta.label}
                    </span>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-950/50 dark:text-slate-500 dark:ring-slate-700">
                    <Lucide.UserRound size={15} />
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex items-center justify-center">
                <span className={`um-access-compare-arrow flex items-center justify-center rounded-full ring-1 ${roleChanged
                  ? 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/25'
                  : 'bg-slate-50 text-slate-400 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-500 dark:ring-slate-700'
                }`}>
                  <Lucide.ArrowRight size={16} />
                </span>
              </div>

              <div className={`um-access-role-compare-card rounded-2xl border p-4 shadow-sm transition ${roleChanged
                ? 'border-blue-200 bg-blue-50/60 ring-1 ring-blue-100 dark:border-blue-400/30 dark:bg-blue-500/10 dark:ring-blue-400/20'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-400 dark:text-slate-500">Vai trò sau chỉnh sửa</p>
                    <span className={`um-role-badge mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${nextMeta.className}`}>
                      {nextMeta.label}
                    </span>
                  </div>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${roleChanged
                    ? 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-400/30'
                    : 'bg-slate-50 text-slate-400 ring-slate-200 dark:bg-slate-950/50 dark:text-slate-500 dark:ring-slate-700'
                  }`}>
                    {roleChanged ? <Lucide.Sparkles size={15} /> : <Lucide.Check size={15} />}
                  </span>
                </div>
                <p className={`um-access-compare-helper mt-3 text-xs font-medium ${roleChanged
                  ? 'text-blue-600 dark:text-blue-300'
                  : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {roleChanged ? 'Vai trò sẽ được cập nhật sau khi lưu thay đổi.' : 'Chưa có thay đổi vai trò.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="grid gap-4 sm:grid-cols-[1fr_190px] sm:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Trạng thái tài khoản</p>
                <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Khi khóa tài khoản, người dùng sẽ không thể đăng nhập cho đến khi Admin mở lại.
                </p>
              </div>
              <label className="um-access-status-toggle grid cursor-pointer grid-cols-[104px_44px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/60">
                <span className={`um-access-status-toggle-label text-sm font-semibold leading-tight ${editActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {editActive ? 'Đang hoạt động' : 'Đã khóa'}
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm shrink-0"
                  checked={editActive}
                  onChange={(e) => onActiveChange(e.target.checked)}
                />
              </label>
            </div>
          </div>

          <div className={`um-access-policy-note rounded-2xl border p-4 text-sm leading-6 transition ${isAdminRole
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200'
            : 'border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400'
          }`}>
            <span className="font-semibold">{isAdminRole ? 'Lưu ý:' : 'Ghi chú:'}</span>{' '}
            {isAdminRole
              ? 'Vai trò Quản trị viên có quyền truy cập cấu hình hệ thống, audit log và quản lý tài khoản. Chỉ cấp cho tài khoản thật sự cần vận hành hệ thống.'
              : 'Thay đổi vai trò hoặc trạng thái chỉ được áp dụng sau khi bấm Lưu thay đổi.'}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-700">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl text-sm font-medium">
              Hủy
            </button>
            <button
              type="submit"
              className="btn rounded-xl border-0 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
              disabled={accessLoading}
            >
              {accessLoading ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={16} />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
};


const ConfirmStatusModal = ({ targetUser, loading, onClose, onConfirm }) => {
  if (!targetUser) return null;

  const nextActive = !targetUser.isActive;
  const actionText = nextActive ? 'mở khóa' : 'khóa';
  const actionLabel = nextActive ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
  const roleMeta = getRoleMeta(targetUser.role);
  const title = nextActive ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?';
  const description = nextActive
    ? 'Tài khoản này sẽ có thể đăng nhập lại sau khi được mở khóa.'
    : 'Tài khoản này sẽ không thể đăng nhập cho đến khi Admin mở lại.';

  return createPortal((
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-status-title"
    >
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-[460px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-black/45">
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${nextActive
              ? 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/12 dark:text-blue-300 dark:ring-blue-400/25'
              : 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/25'
            }`}>
              {nextActive ? <Lucide.Unlock size={20} /> : <Lucide.Lock size={20} />}
            </span>
            <div className="min-w-0">
              <h3 id="confirm-status-title" className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {title}
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Đóng"
            disabled={loading}
          >
            <Lucide.X size={18} />
          </button>
        </div>

        <div className="px-6 pb-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700/80 dark:bg-slate-800/55">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Tài khoản áp dụng
            </p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {targetUser.avatarUrl ? (
                  <div className="avatar">
                    <div className="h-11 w-11 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700">
                      <img src={targetUser.avatarUrl} alt={targetUser.fullName || 'Avatar'} />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/25">
                    {getInitials(targetUser.fullName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{targetUser.fullName || 'Chưa có tên'}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{targetUser.email || 'Chưa có email'}</p>
                </div>
              </div>
              <span className={`um-role-badge inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${roleMeta.className}`}>
                {roleMeta.label}
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Xác nhận <span className={nextActive ? 'font-semibold text-blue-700 dark:text-blue-300' : 'font-semibold text-rose-700 dark:text-rose-300'}>{actionText}</span> tài khoản này?
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-700/80 dark:bg-slate-950/35">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70 ${nextActive
              ? 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'
              : 'bg-rose-600 shadow-rose-600/20 hover:bg-rose-700'
            }`}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : (nextActive ? <Lucide.Unlock size={16} /> : <Lucide.Lock size={16} />)}
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
};


export const UserManagement = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRole, setEditRole] = useState('service-user');
  const [editActive, setEditActive] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('service-user');
  const [operatorId, setOperatorId] = useState('1');
  const [createLoading, setCreateLoading] = useState(false);
  const [createFormError, setCreateFormError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingStatusUser, setPendingStatusUser] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const res = await userApi.getUsers();
      setUsers(Array.isArray(res) ? res : []);
      setMessage((prev) => (prev.type === 'error' ? { type: '', text: '' } : prev));
    } catch (err) {
      console.error(err);
      setUsers([]);
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Không thể tải danh sách người dùng.') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!message.text) return undefined;

    const timeout = window.setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, message.type === 'error' ? 4200 : 2600);

    return () => window.clearTimeout(timeout);
  }, [message.type, message.text]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((item) => item.isActive).length;
    const locked = users.filter((item) => !item.isActive).length;
    const operatorCount = users.filter((item) => ['system-staff', 'service-provider', 'interaction-manager', 'administrator'].includes(item.role)).length;

    return { total, active, locked, operatorCount };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const nextUsers = users.filter((item) => {
      const roleMeta = getRoleMeta(item.role);
      const matchesSearch = !keyword || [item.fullName, item.email, item.phoneNumber, roleMeta.label]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesRole = roleFilter === 'all' || item.role === roleFilter;
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && item.isActive)
        || (statusFilter === 'locked' && !item.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });

    return [...nextUsers].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return String(a.fullName || '').localeCompare(String(b.fullName || ''), 'vi', { sensitivity: 'base' });
      }

      if (sortBy === 'name-desc') {
        return String(b.fullName || '').localeCompare(String(a.fullName || ''), 'vi', { sensitivity: 'base' });
      }

      if (sortBy === 'role') {
        return getRoleMeta(a.role).label.localeCompare(getRoleMeta(b.role).label, 'vi', { sensitivity: 'base' });
      }

      if (sortBy === 'status') {
        return Number(b.isActive) - Number(a.isActive);
      }

      return 0;
    });
  }, [users, searchTerm, roleFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filteredUsers.length === 0 ? 0 : (safeCurrentPage - 1) * USERS_PAGE_SIZE + 1;
  const pageEnd = Math.min(safeCurrentPage * USERS_PAGE_SIZE, filteredUsers.length);
  const paginatedUsers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PAGE_SIZE);
  }, [filteredUsers, safeCurrentPage]);
  const hasActiveFilters = Boolean(searchTerm.trim()) || roleFilter !== 'all' || statusFilter !== 'all';

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetCreateForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('service-user');
    setOperatorId('1');
    setCreateFormError('');
  };

  const openCreateModal = () => {
    setCreateFormError('');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createLoading) return;
    setShowCreateModal(false);
    setCreateFormError('');
  };

  const openAccessModal = (targetUser) => {
    setSelectedUser(targetUser);
    setEditRole(targetUser.role || 'service-user');
    setEditActive(Boolean(targetUser.isActive));
  };

  const closeAccessModal = () => {
    if (accessLoading) return;
    setSelectedUser(null);
  };

  const handleSaveAccess = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const roleChanged = editRole !== selectedUser.role;
    const statusChanged = editActive !== Boolean(selectedUser.isActive);

    if (!roleChanged && !statusChanged) {
      setSelectedUser(null);
      return;
    }

    setAccessLoading(true);

    let roleApiMissing = false;

    try {
      if (roleChanged) {
        if (typeof userApi.updateUserRole === 'function') {
          await userApi.updateUserRole(selectedUser.userId, editRole, currentAdmin?.userId);
        } else if (typeof userApi.updateUser === 'function') {
          await userApi.updateUser(selectedUser.userId, { role: editRole }, currentAdmin?.userId);
        } else {
          roleApiMissing = true;
        }
      }

      if (roleApiMissing) {
        setMessage({
          type: 'error',
          text: 'API đổi vai trò chưa được kết nối. Cần backend bổ sung endpoint trước khi lưu thay đổi vai trò.',
        });
        return;
      }

      if (statusChanged) {
        await userApi.updateUserStatus(selectedUser.userId, editActive, currentAdmin?.userId);
      }

      await fetchUsers();
      setMessage({ type: 'success', text: 'Đã cập nhật quyền truy cập tài khoản.' });

      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Lỗi khi cập nhật quyền tài khoản.') });
    } finally {
      setAccessLoading(false);
    }
  };

  const handleToggleStatus = (targetUser) => {
    setPendingStatusUser(targetUser);
  };

  const closeStatusConfirmModal = () => {
    if (statusLoading) return;
    setPendingStatusUser(null);
  };

  const handleConfirmToggleStatus = async () => {
    if (!pendingStatusUser) return;

    const nextActive = !pendingStatusUser.isActive;
    const targetName = pendingStatusUser.fullName || pendingStatusUser.email || 'tài khoản này';

    setStatusLoading(true);

    try {
      await userApi.updateUserStatus(pendingStatusUser.userId, nextActive, currentAdmin?.userId);
      await fetchUsers();
      setMessage({ type: 'success', text: `${nextActive ? 'Đã mở khóa' : 'Đã khóa'} tài khoản ${targetName}.` });
      setPendingStatusUser(null);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Lỗi khi cập nhật trạng thái tài khoản.') });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    const nextFullName = fullName.trim();
    const nextEmail = email.trim().toLowerCase();
    const nextPhone = normalizePhoneNumber(phone);

    if (!nextFullName || !nextEmail || !nextPhone) {
      setCreateFormError('Vui lòng nhập đầy đủ họ tên, email và số điện thoại.');
      return;
    }

    if (!isValidEmail(nextEmail)) {
      setCreateFormError('Email chưa đúng định dạng. Ví dụ: test01@urbanmind.local');
      return;
    }

    if (!isValidPhoneNumber(nextPhone)) {
      setCreateFormError('Số điện thoại chưa hợp lệ. Vui lòng nhập 10 chữ số và bắt đầu bằng 0. Ví dụ: 0902000001');
      return;
    }

    setCreateFormError('');
    setCreateLoading(true);

    try {
      await userApi.createUser({
        fullName: nextFullName,
        email: nextEmail,
        phoneNumber: nextPhone,
        role,
        operatorId: role === 'service-provider' ? Number(operatorId) : null,
      }, currentAdmin?.userId);

      setMessage({ type: 'success', text: 'Tạo tài khoản thành công. Mật khẩu mặc định: 123456.' });
      setShowCreateModal(false);
      resetCreateForm();
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Lỗi khi tạo tài khoản.') });
    } finally {
      setCreateLoading(false);
    }
  };

  const hasLoadError = message.type === 'error' && users.length === 0 && !loading;

  return (
    <div className="admin-page-shell space-y-6">
      <style>{USER_MANAGEMENT_SCOPED_STYLES}</style>
      <ToastMessage
        type={message.type}
        text={message.text}
        onClose={() => setMessage({ type: '', text: '' })}
      />

      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.UsersRound size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="admin-hero-title">
                Quản lý người dùng
              </h1>
              <p className="admin-hero-description">
                Quản lý tài khoản, đổi vai trò nghiệp vụ và khóa/mở quyền truy cập hệ thống.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:self-center">
            <button
              type="button"
              onClick={fetchUsers}
              className="btn btn-outline h-11 rounded-xl border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={loading}
            >
              <Lucide.RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="btn h-11 rounded-xl border-0 bg-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Lucide.UserPlus size={16} />
              Tạo tài khoản
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Lucide.Users} label="Tổng tài khoản" value={stats.total} helper="Tất cả người dùng" tone="blue" />
        <StatCard icon={Lucide.UserCheck} label="Đang hoạt động" value={stats.active} helper="Có thể đăng nhập" tone="emerald" />
        <StatCard icon={Lucide.UserX} label="Đã khóa" value={stats.locked} helper="Đang bị vô hiệu hóa" tone="rose" />
        <StatCard icon={Lucide.UserCog} label="Tài khoản nội bộ" value={stats.operatorCount} helper="Staff, điều phối, quản trị" tone="slate" />
      </section>

      <section className="um-users-card overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Danh sách tài khoản</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {loading ? 'Đang tải dữ liệu...' : `${filteredUsers.length}/${stats.total} tài khoản`}
            </p>
          </div>

          <div className="um-users-filter-grid grid w-full gap-3 xl:w-auto">
            <div className="um-users-filter-search relative">
              <Lucide.Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, email, số điện thoại..."
                className="input input-bordered h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-950"
              />
            </div>

            <CustomSelect
              value={roleFilter}
              onChange={setRoleFilter}
              options={[{ value: 'all', label: 'Tất cả vai trò' }, ...roleOptions]}
              ariaLabel="Lọc theo vai trò"
            />

            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Hoạt động' },
                { value: 'locked', label: 'Đã khóa' },
              ]}
              ariaLabel="Lọc theo trạng thái"
            />

            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'newest', label: 'Mới nhất' },
                { value: 'name-asc', label: 'Tên A-Z' },
                { value: 'name-desc', label: 'Tên Z-A' },
                { value: 'role', label: 'Theo vai trò' },
                { value: 'status', label: 'Theo trạng thái' },
              ]}
              ariaLabel="Sắp xếp danh sách"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
            <span className="loading loading-spinner loading-lg text-blue-600" />
            <p className="text-sm font-medium">Đang tải danh sách...</p>
          </div>
        ) : hasLoadError ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <Lucide.WifiOff size={28} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">Không thể tải danh sách</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Kiểm tra kết nối API hoặc thử làm mới dữ liệu.
            </p>
            <button
              type="button"
              onClick={fetchUsers}
              className="btn btn-outline mt-5 rounded-xl text-sm font-medium"
            >
              <Lucide.RefreshCcw size={16} />
              Thử lại
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
              <Lucide.UsersRound size={28} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">
              {hasActiveFilters ? 'Không tìm thấy tài khoản' : 'Chưa có tài khoản'}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {hasActiveFilters ? 'Thử đổi từ khóa, vai trò hoặc trạng thái lọc.' : 'Tạo tài khoản đầu tiên để bắt đầu quản lý quyền truy cập.'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={openCreateModal}
                className="btn mt-5 rounded-xl border-0 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Lucide.UserPlus size={16} />
                Tạo tài khoản
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="block xl:hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedUsers.map((u) => {
                  const roleMeta = getRoleMeta(u.role);
                  const isCurrentAdmin = u.userId === currentAdmin?.userId;

                  return (
                    <article key={u.userId} className="px-5 py-4 sm:px-6">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-blue-400/40">
                        <div className="flex items-start gap-3">
                          {u.avatarUrl ? (
                            <div className="avatar shrink-0">
                              <div className="h-12 w-12 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700">
                                <img src={u.avatarUrl} alt={u.fullName || 'Avatar'} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/25">
                              {getInitials(u.fullName)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{u.fullName || 'Chưa có tên'}</h3>
                              {isCurrentAdmin && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/25">
                                  Bạn
                                </span>
                              )}
                            </div>

                            <div className="mt-2 grid gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Lucide.Mail size={14} className="shrink-0" />
                                <span className="truncate">{u.email || 'Chưa có email'}</span>
                              </span>
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Lucide.Phone size={14} className="shrink-0" />
                                <span className="truncate">{u.phoneNumber || 'Chưa có SĐT'}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/45">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Vai trò</p>
                            <span className={`um-role-badge inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${roleMeta.className}`}>
                              {roleMeta.label}
                            </span>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/45">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Trạng thái</p>
                            <span className={`um-status-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${u.isActive
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25'
                              : 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25'
                            }`}>
                              <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                          {isCurrentAdmin ? (
                            <span className="inline-flex w-full justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-500">
                              Tài khoản hiện tại
                            </span>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => openAccessModal(u)}
                                className="btn btn-sm h-10 rounded-xl border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <Lucide.UserCog size={14} />
                                Chỉnh quyền
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`btn btn-sm h-10 rounded-xl text-sm font-medium ${u.isActive ? 'btn-outline btn-error' : 'btn-primary'}`}
                              >
                                {u.isActive ? (
                                  <>
                                    <Lucide.Lock size={14} />
                                    Khóa
                                  </>
                                ) : (
                                  <>
                                    <Lucide.Unlock size={14} />
                                    Mở khóa
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="um-users-table table w-full min-w-[960px] text-sm">
              <colgroup>
                <col className="w-[40%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                  <th className="px-6 py-4">Người dùng</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((u) => {
                  const roleMeta = getRoleMeta(u.role);
                  const isCurrentAdmin = u.userId === currentAdmin?.userId;

                  return (
                    <tr key={u.userId} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <div className="avatar">
                              <div className="h-11 w-11 rounded-xl ring-1 ring-slate-200">
                                <img src={u.avatarUrl} alt={u.fullName || 'Avatar'} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                              {getInitials(u.fullName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-950">{u.fullName || 'Chưa có tên'}</span>
                              {isCurrentAdmin && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <Lucide.Mail size={14} />
                                {u.email || 'Chưa có email'}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Lucide.Phone size={14} />
                                {u.phoneNumber || 'Chưa có SĐT'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`um-role-badge inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${roleMeta.className}`}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`um-status-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${u.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-rose-50 text-rose-700 ring-rose-100'
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right align-middle">
                        {isCurrentAdmin ? (
                          <span className="inline-flex min-w-[260px] justify-end text-sm text-slate-400">Tài khoản hiện tại</span>
                        ) : (
                          <div className="um-user-actions flex flex-col justify-end gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => openAccessModal(u)}
                              className="um-user-action-button btn btn-sm rounded-xl border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                            >
                              <Lucide.UserCog size={14} />
                              Chỉnh quyền
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`um-user-lock-button btn btn-sm rounded-xl text-sm font-medium whitespace-nowrap ${u.isActive ? 'btn-outline btn-error' : 'btn-primary'}`}
                            >
                              {u.isActive ? (
                                <>
                                  <Lucide.Lock size={14} />
                                  Khóa
                                </>
                              ) : (
                                <>
                                  <Lucide.Unlock size={14} />
                                  Mở khóa
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:text-slate-400">
              <span>
                Hiển thị {pageStart}-{pageEnd} trong tổng {filteredUsers.length} tài khoản
              </span>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="btn btn-sm rounded-xl border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={safeCurrentPage === 1}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`btn btn-sm rounded-xl text-sm font-medium ${page === safeCurrentPage
                      ? 'border-0 bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    aria-current={page === safeCurrentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="btn btn-sm rounded-xl border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={safeCurrentPage === totalPages}
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <EditAccessModal
        targetUser={selectedUser}
        editRole={editRole}
        editActive={editActive}
        accessLoading={accessLoading}
        onRoleChange={setEditRole}
        onActiveChange={setEditActive}
        onClose={closeAccessModal}
        onSubmit={handleSaveAccess}
      />

      <ConfirmStatusModal
        targetUser={pendingStatusUser}
        loading={statusLoading}
        onClose={closeStatusConfirmModal}
        onConfirm={handleConfirmToggleStatus}
      />

      {showCreateModal && createPortal((
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
        >
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" />

          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-slate-200 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Lucide.UserPlus size={20} />
                </span>
                <div>
                  <h3 id="create-user-title" className="text-xl font-semibold text-slate-950">Tạo tài khoản</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mật khẩu mặc định: 123456</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Đóng"
              >
                <Lucide.X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} noValidate className="space-y-5 p-6">
              {createFormError && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
                  <Lucide.AlertCircle className="mt-0.5 shrink-0" size={18} />
                  <span>{createFormError}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text text-sm font-medium text-slate-700">Họ và tên *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Trần Quốc Toản"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setCreateFormError('');
                    }}
                    className="input input-bordered h-11 w-full rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm font-medium text-slate-700">Email *</span>
                  </label>
                  <input
                    type="email"
                    placeholder="account@urbanmind.vn"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setCreateFormError('');
                    }}
                    aria-invalid={Boolean(createFormError && createFormError.toLowerCase().includes('email'))}
                    className={`input input-bordered h-11 w-full rounded-xl text-sm ${createFormError.toLowerCase().includes('email') ? 'border-rose-300 focus:border-rose-500' : ''}`}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm font-medium text-slate-700">Số điện thoại *</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="09XXXXXXXX"
                    value={phone}
                    onChange={(e) => {
                      setPhone(normalizePhoneNumber(e.target.value));
                      setCreateFormError('');
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    aria-invalid={Boolean(createFormError && createFormError.toLowerCase().includes('số điện thoại'))}
                    className={`input input-bordered h-11 w-full rounded-xl text-sm ${createFormError.toLowerCase().includes('số điện thoại') ? 'border-rose-300 focus:border-rose-500' : ''}`}
                    required
                  />
                  <p className="mt-2 text-xs text-slate-400">Nhập 10 chữ số, bắt đầu bằng 0.</p>
                </div>

                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text text-sm font-medium text-slate-700">Vai trò *</span>
                  </label>
                  <CustomSelect
                    value={role}
                    onChange={(nextRole) => {
                      setRole(nextRole);
                      setCreateFormError('');
                    }}
                    options={roleOptions}
                    ariaLabel="Chọn vai trò tài khoản"
                    getDescription={(item) => ROLE_DESCRIPTIONS[item.value]}
                    menuClassName="max-h-[320px] overflow-y-auto"
                  />
                </div>

                {role === 'service-provider' && (
                  <div className="form-control sm:col-span-2">
                    <label className="label">
                      <span className="label-text text-sm font-medium text-slate-700">Đầu mối phụ trách</span>
                    </label>
                    <select
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      className="select select-bordered h-11 rounded-xl text-sm"
                    >
                      <option value="1">Đầu mối Điện chiếu sáng</option>
                      <option value="2">Đầu mối Thu gom Rác thải</option>
                      <option value="3">Tổng công ty Cấp nước SAWACO</option>
                      <option value="4">Khu quản lý cầu đường bộ số 1</option>
                      <option value="5">Đầu mối Công viên Cây xanh</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="btn btn-ghost rounded-xl text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn rounded-xl border-0 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                  disabled={createLoading}
                >
                  {createLoading ? <span className="loading loading-spinner loading-sm" /> : <Lucide.UserPlus size={16} />}
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};
