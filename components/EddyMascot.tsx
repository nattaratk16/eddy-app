import { useId } from 'react';

type EddyMood = 'wave' | 'happy' | 'sleepy' | 'celebrate' | 'think';

interface EddyMascotProps {
  mood?: EddyMood;
  size?: number;
  className?: string;
  float?: boolean;
}

/**
 * Eddy — the friendly 3D-pastel blob mascot that represents the AI assistant
 * throughout the app (login illustration, sidebar avatar, chat widget, empty states).
 */
export default function EddyMascot({
  mood = 'happy',
  size = 160,
  className = '',
  float = true,
}: EddyMascotProps) {
  const uid = useId().replace(/:/g, '');
  const bodyGrad = `eddyBody-${uid}`;
  const cheekGrad = `eddyCheek-${uid}`;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`${float ? 'animate-floatSlow' : ''} ${className}`}
      role="img"
      aria-label="Eddy mascot"
    >
      <defs>
        <linearGradient id={bodyGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6B98CE" />
          <stop offset="100%" stopColor="#204170" />
        </linearGradient>
        <radialGradient id={cheekGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD3E2" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFD3E2" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft shadow ellipse on the ground */}
      <ellipse cx="100" cy="178" rx="46" ry="8" fill="#0D1C33" opacity="0.12" />

      {/* little stub legs */}
      <rect x="76" y="150" width="14" height="20" rx="7" fill="#172E52" />
      <rect x="110" y="150" width="14" height="20" rx="7" fill="#172E52" />

      {/* body - rounded blob */}
      <path
        d="M100 24
           C 146 24 168 58 168 100
           C 168 146 138 172 100 172
           C 62 172 32 146 32 100
           C 32 58 54 24 100 24 Z"
        fill={`url(#${bodyGrad})`}
      />

      {/* 3D highlight */}
      <ellipse cx="74" cy="62" rx="22" ry="16" fill="#ffffff" opacity="0.35" />

      {/* cheeks */}
      <circle cx="62" cy="116" r="14" fill={`url(#${cheekGrad})`} />
      <circle cx="138" cy="116" r="14" fill={`url(#${cheekGrad})`} />

      {/* arms */}
      {mood === 'wave' ? (
        <>
          <rect x="20" y="92" width="34" height="14" rx="7" fill="#3D72B4" />
          <g transform="rotate(-35 158 78)">
            <rect x="142" y="71" width="38" height="14" rx="7" fill="#3D72B4" />
          </g>
        </>
      ) : mood === 'celebrate' ? (
        <>
          <g transform="rotate(35 30 100)">
            <rect x="10" y="93" width="38" height="14" rx="7" fill="#3D72B4" />
          </g>
          <g transform="rotate(-35 170 100)">
            <rect x="152" y="93" width="38" height="14" rx="7" fill="#3D72B4" />
          </g>
        </>
      ) : (
        <>
          <rect x="20" y="98" width="34" height="14" rx="7" fill="#3D72B4" />
          <rect x="146" y="98" width="34" height="14" rx="7" fill="#3D72B4" />
        </>
      )}

      {/* face */}
      {mood === 'sleepy' ? (
        <>
          <path d="M70 100 q12 10 24 0" stroke="#14202E" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M106 100 q12 10 24 0" stroke="#14202E" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M88 134 q12 6 24 0" stroke="#14202E" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : mood === 'think' ? (
        <>
          <circle cx="78" cy="100" r="6" fill="#14202E" />
          <circle cx="122" cy="100" r="6" fill="#14202E" className="animate-blink" />
          <path d="M88 132 q12 -4 24 0" stroke="#14202E" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="78" cy="100" r="6" fill="#14202E" className="animate-blink" />
          <circle cx="122" cy="100" r="6" fill="#14202E" className="animate-blink" />
          <path d="M82 128 q18 16 36 0" stroke="#14202E" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* antenna with sparkle - Eddy's signature detail (gold accent) */}
      <line x1="100" y1="24" x2="100" y2="8" stroke="#172E52" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="6" r="6" fill="#C9A15A" />
    </svg>
  );
}
