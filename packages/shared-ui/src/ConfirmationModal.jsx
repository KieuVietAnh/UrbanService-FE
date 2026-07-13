import * as Lucide from 'lucide-react';

export default function ConfirmationModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Lucide.AlertCircle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
            {children ? <div className="mt-4">{children}</div> : null}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn btn-ghost rounded-2xl">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="btn btn-success rounded-2xl">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
