'use client';

export default function Fab({ icon: Icon, children, className, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`m3-state inline-flex items-center gap-2.5 h-14 px-5 rounded-2xl bg-[var(--primary-container)] text-[var(--on-primary-container)] border-none cursor-pointer shadow-[var(--el-3)] font-semibold text-[15px] ${className || ''}`}
    >
      {Icon && <Icon size={22} />}
      {children}
    </button>
  );
}
