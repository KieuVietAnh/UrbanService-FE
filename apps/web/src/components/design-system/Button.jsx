import clsx from './clsx';

const base = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4';

function Button({ variant = 'primary', size = 'md', children, className, ...rest }) {
  const variantClass = {
    primary: 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] hover:bg-[var(--brand-primary-dark)]',
    ghost: 'bg-transparent text-[var(--brand-primary)] hover:bg-slate-100',
    outline: 'bg-white border border-slate-200 text-[var(--brand-primary)] hover:bg-slate-50',
  }[variant];

  const sizeClass = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  }[size];

  return (
    <button className={clsx(base, variantClass, sizeClass, className)} {...rest}>
      {children}
    </button>
  );
}

export default Button;
