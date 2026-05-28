'use client';

export default function Loader({ text = "Loading...", fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      {text && <p className="text-[16px] text-[var(--on-surface-variant)] tracking-wide">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--background)] text-[var(--on-background)]">
        {content}
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center p-8 w-full">
      {content}
    </div>
  );
}
