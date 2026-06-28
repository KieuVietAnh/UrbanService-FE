import { useEffect, useState } from 'react';

export default function DelightToast({ message = 'Hoàn tất', sub = '', open = false, onClose = () => {} }) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
    if (open) {
      const t = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 3800);
      return () => clearTimeout(t);
    }
  }, [open, onClose]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-6 z-[1000] max-w-xs w-full pointer-events-auto"
    >
      <div className="rounded-2xl bg-white border border-slate-100 shadow-lg p-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center font-black">✓</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-slate-900">{message}</div>
          {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
        </div>
        <button onClick={() => { setVisible(false); onClose(); }} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>
    </div>
  );
}
