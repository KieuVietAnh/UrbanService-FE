import React from 'react';
import clsx from './clsx';

const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx('w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-4 focus-visible:outline-none focus-visible:ring-[color-mix(in srgb, var(--brand-primary) 12%, transparent)]', className)}
    {...props}
  />
));

Input.displayName = 'Input';

export default Input;
