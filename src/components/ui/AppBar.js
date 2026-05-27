'use client';

export default function AppBar({ title, leading, actions, large, scrolled = false }) {
  return (
    <div 
      className="sticky top-0 z-10 transition-colors pt-[env(safe-area-inset-top,0)]"
      style={{
        background: scrolled ? 'var(--surface-container)' : 'var(--background)',
      }}
    >
      <div className="flex items-center gap-1 p-2 min-h-[56px]">
        {leading || <div className="w-2" />}
        <div className={`flex-1 ${large ? 'm3-headline-lg px-2 py-1' : 'm3-title-lg px-2 font-semibold'}`}>
          {title}
        </div>
        <div className="flex gap-0.5">{actions}</div>
      </div>
    </div>
  );
}
