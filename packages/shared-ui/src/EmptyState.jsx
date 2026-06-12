import React from 'react';

export default function EmptyState({ title = 'Không có dữ liệu', detail = '' }) {
  return (
    <div className="py-12 text-center rounded-3xl space-y-4 flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h18v18H3z" strokeOpacity="0.12"/></svg>
      </div>
      <div>
        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
        {detail && <p className="text-xs text-slate-500 font-semibold mt-1 max-w-sm mx-auto">{detail}</p>}
      </div>
    </div>
  );
}
