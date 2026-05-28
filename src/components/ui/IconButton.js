'use client';

export default function IconButton({ icon: Icon, onClick, badge, size = 40, className }) {
  return (
    <button
      onClick={onClick}
      className={`m3-state relative inline-flex items-center justify-center rounded-full bg-transparent text-[var(--on-surface-variant)] border-none cursor-pointer ${className || ''}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.min(size - 16, 24)} />
      {badge && (
        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-[var(--error)] text-[var(--on-error)] text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}
