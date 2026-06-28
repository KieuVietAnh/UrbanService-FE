 

function EmptyState({ title = 'Không có dữ liệu', description = '', action = null }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-center">
      <div className="text-xl font-black text-slate-900">{title}</div>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
