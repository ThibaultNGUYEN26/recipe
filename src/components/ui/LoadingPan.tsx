import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface LoadingPanProps {
  label?: string;
  size?: number;
  className?: string;
}

export function LoadingPan({
  label = '',
  size = 160,
  className = '',
}: LoadingPanProps) {
  const duration = 1.45;

  return (
    <div
      id="pan-flip-loader"
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div
        className="relative flex items-center justify-center overflow-visible"
        style={{ width: `${size}px`, height: `${size * 0.95}px` }}
      >
        {/* Steam wisps */}
        <div className="absolute top-10 left-1/3 -translate-x-1/2 w-20 h-20 pointer-events-none overflow-visible z-0">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`steam-${i}`}
              className="absolute"
              style={{ left: `${12 + i * 16}px`, bottom: '16px' }}
              animate={{ y: [0, -35, -60], x: [0, i % 2 === 0 ? 6 : -6, i % 2 === 0 ? -4 : 5], opacity: [0, 0.45, 0], scale: [0.7, 1.15, 1.5] }}
              transition={{ duration: 1.7 + i * 0.25, repeat: Infinity, ease: 'easeInOut', delay: i * 0.45 }}
            >
              <svg width="14" height="24" viewBox="0 0 14 24" fill="none">
                <path d="M7 22 C 3 17, 11 11, 7 6 C 5 3, 9 1, 7 0" className="stroke-stone-400/50 dark:stroke-stone-500/40" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </motion.div>
          ))}
        </div>

        {/* Stovetop shadow */}
        <motion.div
          className="absolute bottom-4 left-8 w-36 h-4 rounded-full pointer-events-none bg-stone-900/15 dark:bg-black/50 blur-sm"
          animate={{ scaleX: [1, 0.92, 1.06, 0.94, 1.08, 1], scaleY: [1, 0.85, 1.15, 0.9, 1.12, 1], opacity: [0.45, 0.35, 0.65, 0.38, 0.6, 0.45] }}
          transition={{ duration, repeat: Infinity, ease: 'easeInOut', times: [0, 0.16, 0.28, 0.55, 0.84, 1] }}
        />

        <svg viewBox="0 -70 240 240" className="w-full h-full overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="panBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" /><stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
            <radialGradient id="panInnerFloor" cx="50%" cy="50%" r="50%">
              <stop offset="50%" stopColor="#0F172A" /><stop offset="100%" stopColor="#1E293B" />
            </radialGradient>
            <linearGradient id="handleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" /><stop offset="50%" stopColor="#0F172A" /><stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="pancakeSideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#92400E" /><stop offset="25%" stopColor="#D97706" /><stop offset="50%" stopColor="#F59E0B" /><stop offset="75%" stopColor="#D97706" /><stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <radialGradient id="pancakeTopGrad" cx="45%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#FEF08A" /><stop offset="40%" stopColor="#FDE047" /><stop offset="75%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#D97706" />
            </radialGradient>
            <radialGradient id="pancakeBottomGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#B45309" /><stop offset="60%" stopColor="#92400E" /><stop offset="100%" stopColor="#78350F" />
            </radialGradient>
          </defs>

          {/* Pan group */}
          <motion.g style={{ transformOrigin: '160px 130px' }}
            animate={{ y: [0, 8, -14, 1, 6, -1.5, 0], rotate: [0, -5, 10, -2, -4, 1, 0] }}
            transition={{ duration, repeat: Infinity, ease: 'easeInOut', times: [0, 0.16, 0.28, 0.55, 0.84, 0.93, 1] }}
          >
            <g>
              <path d="M148 128 L216 116 C221 115 226 118 226 123 C226 128 221 132 216 133 L148 138 Z" fill="url(#handleGrad)" />
              <circle cx="216" cy="124" r="3.5" fill="#000000" fillOpacity="0.4" />
              <circle cx="216" cy="124" r="3.5" stroke="#475569" strokeWidth="0.8" />
              <path d="M160 126 L206 119" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.4" />
            </g>
            <path d="M32 128 C32 148 64 156 98 156 C132 156 164 148 164 128 L164 124 C164 108 132 104 98 104 C64 104 32 108 32 124 Z" fill="url(#panBodyGrad)" />
            <ellipse cx="98" cy="124" rx="64" ry="20" fill="#334155" />
            <ellipse cx="98" cy="127" rx="58" ry="17" fill="url(#panInnerFloor)" />
            <ellipse cx="98" cy="126" rx="57" ry="16" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.25" />
            <motion.ellipse cx="98" cy="128" rx="38" ry="12" fill="#000000"
              animate={{ opacity: [0.55, 0.65, 0.45, 0.08, 0.08, 0.65, 0.58, 0.55], scale: [1, 1.05, 0.95, 0.6, 0.6, 1.15, 1, 1] }}
              transition={{ duration, repeat: Infinity, ease: 'easeInOut', times: [0, 0.16, 0.28, 0.55, 0.65, 0.84, 0.92, 1] }}
            />
          </motion.g>

          {/* Pancake group */}
          <motion.g style={{ transformOrigin: '98px 123px', transformStyle: 'preserve-3d' }}
            animate={{ y: [0, 8, -14, -112, -110, 6, -1.5, 0], rotateX: [0, 0, 35, 180, 270, 360, 360, 360], rotateZ: [0, -3, 7, 10, -5, -3, 1, 0], scaleY: [1, 0.9, 1.25, 1.05, 0.96, 0.78, 1.06, 1], scaleX: [1, 1.08, 0.88, 0.98, 1.02, 1.2, 0.96, 1] }}
            transition={{ duration, repeat: Infinity, ease: 'easeInOut', times: [0, 0.16, 0.28, 0.55, 0.65, 0.84, 0.92, 1] }}
          >
            <ellipse cx="98" cy="128" rx="38" ry="11.5" fill="url(#pancakeBottomGrad)" />
            <path d="M60 120 C60 127 77 132 98 132 C119 132 136 127 136 120 L136 127 C136 134 119 139 98 139 C77 139 60 134 60 127 Z" fill="url(#pancakeSideGrad)" />
            <path d="M62 125 C75 130 121 130 134 125" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
            <path d="M64 127 C78 132 118 132 132 127" stroke="#FEF08A" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.7" />
            <ellipse cx="98" cy="120" rx="38" ry="11.5" fill="url(#pancakeTopGrad)" />
            <ellipse cx="98" cy="119.5" rx="37" ry="10.8" stroke="#FFFBEB" strokeWidth="1" strokeOpacity="0.6" />
            <ellipse cx="96" cy="120" rx="22" ry="6.5" fill="#D97706" fillOpacity="0.35" />
            <ellipse cx="95" cy="119.5" rx="14" ry="4" fill="#B45309" fillOpacity="0.25" />
            <circle cx="82" cy="119" r="2" fill="#B45309" fillOpacity="0.45" />
            <circle cx="114" cy="121" r="1.8" fill="#B45309" fillOpacity="0.45" />
            <circle cx="98" cy="123" r="1.4" fill="#B45309" fillOpacity="0.4" />
            <circle cx="90" cy="117" r="1.2" fill="#D97706" fillOpacity="0.4" />
            <path d="M84 116 C 89 115, 105 114, 112 118 C 114 120, 111 123, 107 124 C 100 125, 93 124, 84 121 C 80 119, 81 117, 84 116 Z" fill="#92400E" fillOpacity="0.85" />
            <path d="M110 120 C 112 123, 114 128, 113 131 C 112 132, 110 132, 110 130 C 109 127, 108 123, 110 120 Z" fill="#78350F" fillOpacity="0.95" />
            <path d="M88 116 C 94 115.5 104 116 108 118" stroke="#FDE68A" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.8" />
            <g transform="translate(90, 109)">
              <ellipse cx="8" cy="9" rx="9" ry="3.5" fill="#F59E0B" fillOpacity="0.7" />
              <ellipse cx="8" cy="8.5" rx="6" ry="2.2" fill="#FEF08A" fillOpacity="0.8" />
              <polygon points="8,0 14,3.5 8,7 2,3.5" fill="#FEF9C3" />
              <polygon points="2,3.5 8,7 8,11.5 2,8" fill="#FDE047" />
              <polygon points="8,7 14,3.5 14,8 8,11.5" fill="#EAB308" />
              <circle cx="8" cy="3.5" r="1" fill="#FFFFFF" fillOpacity="0.9" />
              <line x1="8" y1="7" x2="8" y2="11.5" stroke="#CA8A04" strokeWidth="0.6" />
            </g>
          </motion.g>

          {/* Sizzle sparks */}
          <g transform="translate(98, 126)">
            {[{ angle: -45, dist: 18 }, { angle: -135, dist: 17 }, { angle: -80, dist: 22 }, { angle: -20, dist: 21 }, { angle: -160, dist: 16 }].map((spark, idx) => (
              <motion.circle key={`spark-${idx}`} r="1.6" fill={idx % 2 === 0 ? '#FBBF24' : '#F97316'}
                animate={{ opacity: [0, 0, 1, 0, 0], scale: [0, 0, 1.6, 0.2, 0], cx: [0, 0, Math.cos((spark.angle * Math.PI) / 180) * spark.dist, Math.cos((spark.angle * Math.PI) / 180) * (spark.dist + 8), 0], cy: [0, 0, Math.sin((spark.angle * Math.PI) / 180) * spark.dist, Math.sin((spark.angle * Math.PI) / 180) * (spark.dist + 10), 0] }}
                transition={{ duration, repeat: Infinity, ease: 'easeOut', times: [0, 0.82, 0.86, 0.96, 1] }}
              />
            ))}
          </g>
        </svg>
      </div>

      {label && (
        <motion.p
          className="mt-3 text-sm font-semibold tracking-tight text-stone-700 dark:text-stone-300"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
