'use client';

export default function GroundArt({ variant = 'ground-1', state, height = 140, className }) {
  const palettes = {
    'ground-1': { sky: '#FFB347', skyTo: '#FF7043', field: '#1B5E20', fieldTo: '#2E7D32', pitch: '#C9A66B' }, // dusk
    'ground-2': { sky: '#82B1FF', skyTo: '#5C6BC0', field: '#2E7D32', fieldTo: '#388E3C', pitch: '#D4B47A' }, // morning
    'ground-3': { sky: '#1A237E', skyTo: '#311B92', field: '#1B5E20', fieldTo: '#2E7D32', pitch: '#B58D5C' }, // night
  };
  const p = palettes[variant] || palettes['ground-1'];

  return (
    <div className={`relative overflow-hidden ${className || ''}`} style={{ height }}>
      <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" className="block">
        <defs>
          <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.sky} />
            <stop offset="100%" stopColor={p.skyTo} />
          </linearGradient>
          <linearGradient id={`field-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.fieldTo} />
            <stop offset="100%" stopColor={p.field} />
          </linearGradient>
          <pattern id={`stripes-${variant}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="skewX(-20)">
            <rect width="20" height="40" fill="rgba(0,0,0,0.06)" />
          </pattern>
        </defs>
        {/* sky */}
        <rect width="400" height="60" fill={`url(#sky-${variant})`} />
        {/* hills */}
        <path d="M0,60 Q60,40 130,55 T280,50 T400,55 L400,75 L0,75 Z" fill="rgba(0,0,0,0.18)" />
        {/* field */}
        <rect y="60" width="400" height="100" fill={`url(#field-${variant})`} />
        <rect y="60" width="400" height="100" fill={`url(#stripes-${variant})`} opacity="0.6" />
        {/* boundary circle */}
        <ellipse cx="200" cy="170" rx="240" ry="60" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <ellipse cx="200" cy="160" rx="180" ry="44" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        {/* pitch */}
        <polygon points="170,90 230,90 260,160 140,160" fill={p.pitch} />
        <polygon points="170,90 230,90 260,160 140,160" fill="rgba(0,0,0,0.08)" />
        {/* stumps */}
        <rect x="196" y="92" width="8" height="4" fill="#fff" opacity="0.8" />
        <rect x="194" y="155" width="12" height="4" fill="#fff" opacity="0.8" />
        {/* lights for night */}
        {variant === 'ground-3' && (
          <g>
            <circle cx="60" cy="30" r="8" fill="#FFF9C4" opacity="0.9" />
            <circle cx="340" cy="30" r="8" fill="#FFF9C4" opacity="0.9" />
            <circle cx="60" cy="30" r="20" fill="#FFF9C4" opacity="0.15" />
            <circle cx="340" cy="30" r="20" fill="#FFF9C4" opacity="0.15" />
          </g>
        )}
      </svg>
      {state === 'live' && (
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(229,57,53,0.95)] text-white text-[11px] font-bold tracking-wider shadow-[0_4px_12px_rgba(229,57,53,0.4)]">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-[crkPulse_1.4s_infinite]" />
          LIVE
        </div>
      )}
      {state === 'completed' && (
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[rgba(0,0,0,0.55)] text-white text-[11px] font-bold tracking-wider backdrop-blur-md">
          COMPLETED
        </div>
      )}
    </div>
  );
}
