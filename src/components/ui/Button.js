'use client';
import clsx from 'clsx';

const VARIANTS = {
  filled:   'bg-[var(--primary)] text-[var(--on-primary)]',
  tonal:    'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]',
  outlined: 'bg-transparent text-[var(--primary)] border border-[var(--outline)]',
  text:     'bg-transparent text-[var(--primary)]',
  error:    'bg-[var(--error)] text-[var(--on-error)]',
};

export default function Button({ children, variant = 'filled', size = 'md', icon: Icon, full, onClick, className, disabled, ...rest }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'm3-state inline-flex items-center justify-center gap-2 rounded-full font-semibold',
        size === 'sm' ? 'h-9 px-4 text-[13px]' : size === 'lg' ? 'h-14 px-6 text-base' : 'h-11 px-5 text-[15px]',
        full && 'w-full',
        VARIANTS[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}
