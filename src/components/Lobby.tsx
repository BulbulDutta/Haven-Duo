import React, { useEffect, useRef } from 'react';
import { ShoppingBag } from 'lucide-react';
import { sounds } from '../services/sound';

interface LobbyProps {
  tokens: number;
  bestLevel: number;
  bestChapter: number;
  snapCount: number;
  hasOneShotBlaster: boolean;
  onStartGame: () => void;
  onOpenShop: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  tokens,
  bestLevel,
  bestChapter,
  snapCount,
  hasOneShotBlaster,
  onStartGame,
  onOpenShop
}) => {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Canvas background: drifting celestial clouds, volumetric golden god-rays & floating stardust particles
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: -(Math.random() * 18 + 8),
      speedX: (Math.random() - 0.5) * 12,
      opacity: Math.random() * 0.75 + 0.25,
      pulseSpeed: Math.random() * 2 + 1,
      phase: Math.random() * Math.PI * 2
    }));

    const clouds = Array.from({ length: 12 }, (_, idx) => ({
      x: (idx / 12) * width,
      y: height * (0.62 + (idx % 4) * 0.08),
      radius: 90 + (idx % 3) * 45,
      speed: 8 + (idx % 3) * 5,
      alpha: 0.08 + (idx % 3) * 0.03
    }));

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      const originX = width * 0.5;
      const originY = -30;
      const rayCount = 8;

      ctx.save();
      for (let r = 0; r < rayCount; r++) {
        const baseAngle = ((r - rayCount / 2) / (rayCount / 2)) * 0.75;
        const angleSway = Math.sin(elapsed * 0.4 + r * 0.8) * 0.06;
        const angle = baseAngle + angleSway;
        const rayLength = Math.max(width, height) * 1.3;
        const spread = 0.12;

        const p1x = originX + Math.sin(angle - spread) * rayLength;
        const p1y = originY + Math.cos(angle - spread) * rayLength;
        const p2x = originX + Math.sin(angle + spread) * rayLength;
        const p2y = originY + Math.cos(angle + spread) * rayLength;

        const rayGrad = ctx.createRadialGradient(
          originX,
          originY,
          40,
          originX,
          originY + height * 0.6,
          height * 0.9
        );
        const rayAlpha = (0.09 + Math.sin(elapsed * 0.6 + r * 1.2) * 0.04).toFixed(3);
        rayGrad.addColorStop(0, `rgba(255, 238, 170, ${rayAlpha})`);
        rayGrad.addColorStop(0.4, `rgba(254, 215, 102, ${(Number(rayAlpha) * 0.6).toFixed(3)})`);
        rayGrad.addColorStop(1, 'rgba(254, 215, 102, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      clouds.forEach((c) => {
        const cx = ((c.x + elapsed * c.speed) % (width + c.radius * 3)) - c.radius * 1.5;
        const cy = c.y + Math.sin(elapsed * 0.5 + c.x) * 6;
        const cloudGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, c.radius);
        cloudGrad.addColorStop(0, `rgba(255, 255, 255, ${c.alpha})`);
        cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, c.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      ctx.save();
      particles.forEach((p) => {
        p.y += p.speedY * 0.016;
        p.x += p.speedX * 0.016 + Math.sin(elapsed + p.phase) * 0.3;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        const currentAlpha = p.opacity * (0.6 + 0.4 * Math.sin(elapsed * p.pulseSpeed + p.phase));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254, 240, 138, ${currentAlpha * 0.25})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 230, ${currentAlpha})`;
        ctx.shadowColor = '#FDE047';
        ctx.shadowBlur = 8;
        ctx.fill();
      });
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handlePlayClick = () => {
    sounds.playSwitchPress();
    onStartGame();
  };

  const handleShopClick = () => {
    sounds.playSwitchPress();
    onOpenShop();
  };

  return (
    <div className="game-landscape-stage relative w-screen h-[100dvh] overflow-hidden select-none bg-[#0a1829]">
      {/* Heavenly Sky Background */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url('/assets/haven_sky_bg.jpg')`,
          filter: 'brightness(0.92) contrast(1.04)'
        }}
      />

      {/* Atmospheric Mist & Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 15%, rgba(254, 240, 138, 0.22) 0%, rgba(10, 24, 46, 0.35) 60%, rgba(5, 12, 24, 0.78) 100%)'
        }}
      />

      {/* Live God-Rays, Clouds, & Floating Particles Canvas */}
      <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-1" />

      {/* Top Bar: Responsive 3-zone header keeping HAVEN centered and Token counter top-right */}
      <header className="relative z-20 w-full pt-3 sm:pt-6 px-3 sm:px-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div />

        <div className="text-center">
          <h1 className="haven-title-3d text-3xl sm:text-5xl md:text-7xl font-black tracking-[0.14em] uppercase whitespace-nowrap">
            HAVEN
          </h1>
        </div>

        <div className="flex justify-end">
          <div className="token-pill-badge">
            <div className="token-coin-icon">
              <span>T</span>
            </div>
            <span className="token-text tabular-nums whitespace-nowrap">TOKENS {tokens}</span>
          </div>
        </div>
      </header>

      {/* Bulletproof Centered Main Menu (Absolute 50%/50% Centering across Mobile, Tablet, Desktop) */}
      <main className="lobby-center-container">
        <div className="w-full flex flex-row items-center justify-around sm:justify-between gap-4 sm:gap-8 md:gap-12">
          {/* Male Angel Character ("THE ADVENTURER") */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative angel-float flex flex-col items-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-56 sm:h-56 rounded-full bg-radial from-amber-300/25 via-sky-400/15 to-transparent blur-2xl pointer-events-none" />

              <div className="relative w-28 sm:w-44 md:w-56 h-[34dvh] max-h-36 sm:max-h-56 md:max-h-64 flex items-center justify-center">
                <img
                  src="/assets/aistudio/angel_pure.png"
                  alt="The Adventurer Male Angel"
                  className="w-full h-full object-contain filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.65)] drop-shadow-[0_0_24px_rgba(125,211,252,0.45)]"
                />
              </div>

              <div className="mt-1 sm:mt-2">
                <div className="adventurer-plate">THE ADVENTURER</div>
              </div>
            </div>
          </div>

          {/* Centered Action Column: PLAY + SHOP */}
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm">
            <button
              type="button"
              onClick={handlePlayClick}
              className="play-pill-button group relative cursor-pointer"
              aria-label="Play Haven"
            >
              <div className="absolute inset-0 rounded-full bg-radial from-sky-400/20 to-transparent pointer-events-none" />
              <span className="play-text relative z-10 transition-transform duration-200 group-hover:scale-105">
                PLAY
              </span>
            </button>

            <button
              type="button"
              onClick={handleShopClick}
              className="lobby-shop-button"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" />
              <span>SHOP</span>
            </button>

            {/* Unboxed Stage & Loadout Readout */}
            <div className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-1 text-[11px] sm:text-xs text-slate-300/90 font-medium text-center">
              <span className="tabular-nums">
                Best: Level {bestLevel}-{bestChapter}
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span>{hasOneShotBlaster ? 'One-Shot Blaster' : 'Standard Bolt'}</span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="tabular-nums">Snap: {snapCount}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
