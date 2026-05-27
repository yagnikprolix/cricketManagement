'use client';
import clsx from 'clsx';

const TONES = {
  neutral: 'bg-[var(--surface-container-high)] text-[var(--on-surface)]',
  primary: 'bg-[var(--primary-container)] text-[var(--on-primary-container)]',
  success: 'bg-[var(--success-container)] text-[var(--success)]',
  warning: 'bg-[var(--warning-container)] text-[var(--warning)]',
  error:   'bg-[var(--error-container)] text-[var(--error)]',
  live:    'bg-[var(--live-container)] text-[var(--live)]',
};

export default function Chip({ children, icon: Icon, tone = 'neutral', size = 'md', selected, onClick }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2.5 text-[11px]' : 'h-8 px-3 text-xs',
        selected
          ? 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]'
          : TONES[tone],
        onClick && 'm3-state cursor-pointer'
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </Tag>
  );
}
