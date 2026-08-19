import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function DelightToast({
  message = 'Hoàn tất',
  sub = '',
  open = false,
  onClose = () => {},
  position = 'bottom-right',
  variant = 'success',
}) {
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3800);

    return () => clearTimeout(timer);
  }, [open, onClose, message, sub]);

  if (!open) return null;

  const isError = variant === 'error';
  const positionClass = position === 'top-right' ? 'top-4' : 'bottom-6';

  const toast = (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`fixed right-4 ${positionClass} z-[99999] max-w-sm w-[calc(100vw-2rem)] pointer-events-auto`}
    >
      <div className="rounded-2xl bg-white border border-slate-100 shadow-xl p-3.5 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl grid place-items-center font-black ${isError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{isError ? '!' : '✓'}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-slate-900">{message}</div>
          {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
        </div>
        <button onClick={onClose} aria-label="Đóng thông báo" title="Đóng" className="text-slate-400 hover:text-slate-600">✕</button>
      </div>
    </div>
  );

  try {
    return createPortal(toast, document.body);
  } catch {
    // Fallback if portal not available
    return toast;
  }
}
