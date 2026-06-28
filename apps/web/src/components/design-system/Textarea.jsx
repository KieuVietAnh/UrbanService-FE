import React from 'react';
import clsx from './clsx';

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx('w-full min-h-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-4', className)}
    {...props}
  />
));

Textarea.displayName = 'Textarea';

export default Textarea;
