import clsx from './clsx';

function Select({ className, children, ...props }) {
  return (
    <select className={clsx('w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-4', className)} {...props}>
      {children}
    </select>
  );
}

export default Select;
