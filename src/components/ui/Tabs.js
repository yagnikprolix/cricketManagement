'use client';
import clsx from 'clsx';

export default function Tabs({ current, onChange, items, className }) {
  return (
    <div className={`flex border-b border-[var(--outline-variant)] bg-[var(--surface)] ${className || ''}`}>
      {items.map(it => {
        const active = current === it.id;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className="flex-1 relative bg-transparent border-none py-3 px-2 cursor-pointer active:opacity-70 transition-opacity"
            style={{ color: active ? 'var(--primary)' : 'var(--on-surface-variant)' }}
          >
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-[0.2px]">
              {Icon && <Icon size={18} className={active ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)]"} />}
              {it.label}
            </span>
            <span
              className={clsx(
                "absolute left-1/2 bottom-[-1px] -translate-x-1/2 h-[3px] rounded-t-[3px] bg-[var(--primary)]",
                active ? "w-[60px]" : "w-0"
              )}
              style={{ transition: 'width 0.25s var(--ease-emph)' }}
            />
          </button>
        );
      })}
    </div>
  );
}
