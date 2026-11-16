import React from 'react';

interface RpgHealthBarProps {
  hp: number;
  maxHp: number;
}

const TOTAL_HEARTS = 5;

export const RpgHealthBar: React.FC<RpgHealthBarProps> = ({ hp, maxHp }) => {
  const hpPerHeart = maxHp / TOTAL_HEARTS;
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <div className="rpg-health-frame" aria-label={`Health ${hp} of ${maxHp}`}>
      <div className="flex items-center gap-1">
        {Array.from({ length: TOTAL_HEARTS }, (_, i) => {
          const heartMin = i * hpPerHeart;
          const heartFull = (i + 1) * hpPerHeart;
          const fillRatio = Math.max(0, Math.min(1, (hp - heartMin) / (heartFull - heartMin)));
          const clipId = `heart-clip-${i}`;

          return (
            <svg
              key={i}
              viewBox="0 0 24 22"
              className="w-4 h-4 sm:w-[18px] sm:h-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={24 * fillRatio} height="22" />
                </clipPath>
              </defs>
              {/* Empty Dark Vessel */}
              <path
                d="M12 20.4C12 20.4 2 13.8 2 7.2C2 3.9 4.6 1.5 7.7 1.5C9.6 1.5 11.2 2.4 12 3.8C12.8 2.4 14.4 1.5 16.3 1.5C19.4 1.5 22 3.9 22 7.2C22 13.8 12 20.4 12 20.4Z"
                fill="#1e293b"
                stroke="#78350f"
                strokeWidth="1.6"
              />
              {/* Filled Ruby Heart */}
              {fillRatio > 0 && (
                <path
                  clipPath={`url(#${clipId})`}
                  d="M12 20.4C12 20.4 2 13.8 2 7.2C2 3.9 4.6 1.5 7.7 1.5C9.6 1.5 11.2 2.4 12 3.8C12.8 2.4 14.4 1.5 16.3 1.5C19.4 1.5 22 3.9 22 7.2C22 13.8 12 20.4 12 20.4Z"
                  fill="url(#rubyHeartGrad)"
                />
              )}
              {/* Highlight glint */}
              {fillRatio > 0.3 && (
                <circle cx="7.5" cy="6.2" r="1.4" fill="rgba(255,255,255,0.55)" />
              )}
              {i === 0 && (
                <defs>
                  <linearGradient id="rubyHeartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="55%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#881337" />
                  </linearGradient>
                </defs>
              )}
            </svg>
          );
        })}
      </div>

      {/* Subtle forged metallic vitality sub-bar */}
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1.5 bg-slate-950 rounded-sm overflow-hidden border border-amber-700/60">
          <div
            className="h-full transition-all duration-200 ease-out"
            style={{
              width: `${pct}%`,
              background:
                pct > 45
                  ? 'linear-gradient(90deg, #e11d48, #fb7185)'
                  : 'linear-gradient(90deg, #b91c1c, #f59e0b)'
            }}
          />
        </div>
        <span className="text-[11px] font-mono tabular-nums font-bold text-amber-100 leading-none">
          {hp}/{maxHp}
        </span>
      </div>
    </div>
  );
};
