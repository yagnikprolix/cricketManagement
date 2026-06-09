"use client";

import { useEffect, useState } from 'react';

export default function GoogleAd({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = 'true',
  style = { display: 'block' },
  className = '',
}) {
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense script error or ad-blocker detected:', error);
        setAdError(true);
      }
    }
  }, []);

  const isDev = process.env.NODE_ENV === 'development';

  // Render a sleek Material 3 container in development mode or if ads are blocked/failed
  if (isDev || adError) {
    return (
      <div className={`w-full flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-[var(--outline-variant)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] transition-all duration-300 hover:border-[var(--primary)] hover:bg-[var(--surface-container)] ${className}`}>
        <div className="flex items-center gap-2 mb-1 text-[var(--primary)]">
          <span className="material-symbols-rounded text-lg animate-pulse">ads_click</span>
          <span className="m3-label-sm font-semibold tracking-wider uppercase">Advertisement</span>
        </div>
        <p className="m3-body-sm text-[var(--on-surface-variant)] opacity-70 text-center">
          {isDev ? "Google AdSense Slot (Development Mode)" : "Sponsored Ad Slot"}
        </p>
        <div className="mt-2 text-[10px] font-mono opacity-50 px-2 py-0.5 bg-[var(--surface-container-high)] rounded-md flex gap-2">
          <span>Slot: {adSlot || 'Auto'}</span>
          <span>·</span>
          <span>Format: {adFormat}</span>
        </div>
      </div>
    );
  }

  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-6485931326285001';

  return (
    <div className={`w-full overflow-hidden flex justify-center ${className}`}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={client}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      />
    </div>
  );
}
