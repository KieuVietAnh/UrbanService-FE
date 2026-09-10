import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';

export const ManagerPageHeader = ({
  title,
  description,
  icon: Icon = Lucide.Activity,
  actions,
  statusLabel,
  statusValue,
  statusTone = 'success',
}) => (
  <header className="admin-page-hero manager-page-header manager-ui-page">
    <section className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <span className="admin-hero-icon" aria-hidden="true">
          <Icon size={26} />
        </span>
        <div className="min-w-0">
          <h1 className="admin-hero-title">{title}</h1>
          {description ? <p className="admin-hero-description">{description}</p> : null}
        </div>
      </div>

      {actions || statusLabel || statusValue ? (
        <aside className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          {statusLabel || statusValue ? (
            <dl className={`manager-header-status manager-header-status--${statusTone}`}>
              {statusLabel ? <dt>{statusLabel}</dt> : null}
              {statusValue ? <dd>{statusValue}</dd> : null}
            </dl>
          ) : null}
          {actions}
        </aside>
      ) : null}
    </section>
  </header>
);

export const ManagerMetricCard = ({
  label,
  value,
  description,
  icon: Icon = Lucide.Activity,
  toneClass = 'bg-blue-50 text-blue-700',
  to,
  ariaLabel,
}) => {
  const card = (
    <article
      className={`admin-stat-card h-full p-5 transition duration-200 ${
        to
          ? 'group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-[0_14px_36px_rgba(37,99,235,0.10)] dark:group-hover:border-blue-900/70'
          : ''
      }`}
    >
      <header className="flex items-start justify-between gap-4">
        <dl className="min-w-0">
          <dt className="manager-kpi-label">{label}</dt>
          <dd className="manager-kpi-value mt-2 text-[1.9rem] font-bold leading-none tracking-[-0.035em] text-slate-950 dark:text-slate-100">{value}</dd>
          {description ? <dd className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</dd> : null}
        </dl>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`} aria-hidden="true">
          <Icon size={20} />
        </span>
      </header>
    </article>
  );

  if (!to) return card;

  return (
    <Link
      to={to}
      aria-label={ariaLabel || `Mở ${label}`}
      className="group block h-full rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
    >
      {card}
    </Link>
  );
};

export const ManagerSectionHeader = ({
  id,
  title,
  description,
  icon: Icon,
  iconClassName = 'admin-mini-icon manager-section-icon',
  iconSize = 17,
  actions,
}) => (
  <header className="manager-soft-section-header flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      {Icon ? (
        <span className={iconClassName} aria-hidden="true">
          <Icon size={iconSize} />
        </span>
      ) : null}
      <div className="min-w-0">
        <h2 id={id} className="admin-section-title">{title}</h2>
        {description ? <p className="admin-section-description mt-1">{description}</p> : null}
      </div>
    </div>
    {actions ? <aside className="shrink-0">{actions}</aside> : null}
  </header>
);


export const ManagerSelectMenu = ({
  value,
  options = [],
  onChange,
  placeholder = 'Chọn',
  ariaLabel,
  className = '',
}) => {
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const selected = options.find((option) => String(option.value) === String(value));

  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === 'undefined') return;

    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 8;
    const preferredMaxHeight = 288;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const available = Math.max(120, Math.min(preferredMaxHeight, openAbove ? spaceAbove - gap : spaceBelow - gap));

    setMenuStyle({
      position: 'fixed',
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
      width: Math.min(rect.width, window.innerWidth - viewportPadding * 2),
      maxHeight: available,
      ...(openAbove
        ? { bottom: Math.max(viewportPadding, window.innerHeight - rect.top + gap) }
        : { top: Math.max(viewportPadding, rect.bottom + gap) }),
      zIndex: 12050,
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();

    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (anchorRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={anchorRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{selected?.label || placeholder}</span>
        <Lucide.ChevronDown size={15} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && menuStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-label={ariaLabel || placeholder}
              style={menuStyle}
              className="overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-950"
            >
              {options.map((option) => {
                const active = String(option.value) === String(value);
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={option.disabled}
                    onClick={() => {
                      onChange?.(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {active ? <Lucide.Check size={15} className="shrink-0" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export const ManagerListRefreshIndicator = ({
  visible,
  label = 'Đang làm mới',
}) => {
  if (!visible) return null;

  return (
    <span
      className="manager-list-refresh-indicator inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold"
      role="status"
      aria-live="polite"
    >
      <Lucide.LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
};

export const ManagerEmptyState = ({ icon: Icon = Lucide.Inbox, title, description, action }) => (
  <section className="flex flex-col items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:px-8">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600" aria-hidden="true">
      <Icon size={24} />
    </span>
    <h3 className="mt-4 text-base font-black text-slate-900">{title}</h3>
    {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
    {action ? <footer className="mt-5">{action}</footer> : null}
  </section>
);

export const ManagerToast = ({
  type = 'success',
  title,
  message,
  onClose,
  duration = 2200,
}) => {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!message || !duration) return undefined;
    const timer = window.setTimeout(() => closeRef.current?.(), duration);
    return () => window.clearTimeout(timer);
  }, [duration, message]);

  if (!message || typeof document === 'undefined') return null;

  const isError = type === 'error';
  const Icon = isError ? Lucide.CircleAlert : Lucide.CircleCheck;
  const resolvedTitle = title || (isError ? 'Không thể hoàn tất thao tác' : 'Thao tác thành công');

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 top-4 z-[12000] w-[calc(100vw-2rem)] max-w-sm sm:right-6 sm:top-24"
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <section
        className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 text-sm text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.18)] dark:bg-slate-950 dark:text-slate-200 ${
          isError
            ? 'border-rose-200 dark:border-rose-900/70'
            : 'border-emerald-200 dark:border-emerald-900/70'
        }`}
        role={isError ? 'alert' : 'status'}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isError
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
          }`}
          aria-hidden="true"
        >
          <Icon size={17} />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{resolvedTitle}</p>
          <p className="mt-0.5 break-words leading-5 text-slate-600 dark:text-slate-300">{message}</p>
        </div>

        <button
          type="button"
          onClick={() => closeRef.current?.()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900"
          aria-label="Đóng thông báo"
        >
          <Lucide.X size={15} />
        </button>
      </section>
    </div>,
    document.body,
  );
};

export const ManagerConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onCancel?.();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, onCancel, open]);

  if (!open || typeof document === 'undefined') return null;

  const toneConfig = tone === 'warning'
    ? {
      icon: Lucide.TriangleAlert,
      iconClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      buttonClass: 'bg-amber-600 hover:bg-amber-700',
    }
    : {
      icon: Lucide.CircleAlert,
      iconClass: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      buttonClass: 'bg-rose-600 hover:bg-rose-700',
    };

  const Icon = toneConfig.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[11000] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel?.();
      }}
    >
      <section className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-950">
        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneConfig.iconClass}`} aria-hidden="true">
              <Icon size={21} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">{title}</h2>
              {description ? (
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${toneConfig.buttonClass}`}
          >
            {loading ? <Lucide.LoaderCircle size={15} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};
