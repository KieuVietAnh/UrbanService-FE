import clsx from './clsx';

function Notification({ type = 'info', title, children, className }) {
  const intent = {
    info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  }[type];

  return (
    <div className={clsx('rounded-lg p-3 border border-slate-200 shadow-sm', intent, className)} role="status">
      {title && <div className="font-semibold mb-1">{title}</div>}
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default Notification;
