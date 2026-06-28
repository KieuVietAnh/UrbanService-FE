import { useEffect } from 'react';
import CommentList from './CommentList';
import CommentForm from './CommentForm';

export default function CommentDrawer({ open, onClose, feedbackId }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="hidden lg:block w-96 bg-white border-l shadow-xl overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Bình luận</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Đóng</button>
        </div>
        <CommentList feedbackId={feedbackId} />
        <CommentForm feedbackId={feedbackId} onPosted={() => {/* trigger refresh via list's effect by re-mounting if needed */}} />
      </div>

      {/* Mobile bottom sheet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl p-3 max-h-[70vh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Bình luận</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Đóng</button>
        </div>
        <CommentList feedbackId={feedbackId} />
        <CommentForm feedbackId={feedbackId} onPosted={() => {}} />
      </div>

      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
