import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Hand, Wand2, Flame, Zap } from 'lucide-react';
import { sounds } from '../services/sound';

interface VirtualControlsProps {
  onMoveVector: (vx: number, vy: number) => void;
  onInteract: () => void;
  onShoot: () => void;
  onSnap: () => void;
  ammo: number;
  maxAmmo: number;
  snapCount: number;
  hasOneShotBlaster: boolean;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({
  onMoveVector,
  onInteract,
  onShoot,
  onSnap,
  ammo,
  maxAmmo,
  snapCount,
  hasOneShotBlaster
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const maxRadius = 45;

  const updateKnobPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!joystickBaseRef.current) return;
      const rect = joystickBaseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) {
        setKnobPos({ x: 0, y: 0 });
        onMoveVector(0, 0);
        return;
      }

      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, maxRadius);
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;

      setKnobPos({ x: kx, y: ky });
      onMoveVector(kx / maxRadius, ky / maxRadius);
    },
    [onMoveVector, maxRadius]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!joystickBaseRef.current) return;
    setIsDragging(true);
    touchIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateKnobPosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || touchIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateKnobPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (touchIdRef.current === e.pointerId) {
      setIsDragging(false);
      touchIdRef.current = null;
      setKnobPos({ x: 0, y: 0 });
      onMoveVector(0, 0);
    }
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onMoveVector(0, 0);
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [isDragging, onMoveVector]);

  return (
    <div className="fixed inset-x-0 bottom-0 pointer-events-none z-30 flex items-end justify-between px-3 pb-4 sm:px-6 sm:pb-6 select-none touch-none">
      {/* Virtual Joystick */}
      <div className="pointer-events-auto">
        <div
          ref={joystickBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/35 backdrop-blur-md border-2 border-white/80 shadow-xl flex items-center justify-center cursor-pointer active:bg-white/45 touch-none"
          style={{ boxShadow: '0 8px 32px 0 rgba(135, 206, 235, 0.35)' }}
        >
          <div className="absolute inset-2.5 sm:inset-3 rounded-full border border-sky-300/40 pointer-events-none" />
          <div className="absolute top-1.5 sm:top-2 w-1.5 h-1.5 rounded-full bg-sky-400/70" />
          <div className="absolute bottom-1.5 sm:bottom-2 w-1.5 h-1.5 rounded-full bg-sky-400/70" />
          <div className="absolute left-1.5 sm:left-2 w-1.5 h-1.5 rounded-full bg-sky-400/70" />
          <div className="absolute right-1.5 sm:right-2 w-1.5 h-1.5 rounded-full bg-sky-400/70" />

          <div
            className="absolute w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-sky-500 via-sky-400 to-amber-300 shadow-lg border-2 border-white flex items-center justify-center pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              boxShadow: '0 4px 14px rgba(56, 189, 248, 0.5)'
            }}
          >
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/80 shadow-inner" />
          </div>
        </div>
      </div>

      {/* Right Action Buttons: Snap (when owned), Shoot & Interact */}
      <div className="pointer-events-auto flex items-end gap-2 sm:gap-4">
        {snapCount > 0 && (
          <button
            type="button"
            onClick={onSnap}
            className="relative w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-amber-400 border-[3px] sm:border-4 border-white shadow-2xl flex flex-col items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
            style={{ boxShadow: '0 8px 24px rgba(168, 85, 247, 0.55)' }}
            title="The Snap of Doom [F]"
          >
            <Flame className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2.5]" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider mt-0.5">Snap</span>
            <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-slate-950 border border-amber-300 text-[9px] sm:text-[10px] font-mono font-bold text-amber-300">
              x{snapCount}
            </span>
          </button>
        )}

        {/* Shoot Bolt Button */}
        <button
          type="button"
          onClick={onShoot}
          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] sm:border-4 border-white shadow-2xl flex flex-col items-center justify-center text-white active:scale-90 transition-transform cursor-pointer ${
            ammo <= 0
              ? 'bg-slate-600/80 opacity-75'
              : hasOneShotBlaster
              ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-yellow-300'
              : 'bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-400'
          }`}
          style={{
            boxShadow: hasOneShotBlaster
              ? '0 8px 26px rgba(245, 158, 11, 0.6)'
              : '0 8px 24px rgba(59, 130, 246, 0.45)'
          }}
          title={hasOneShotBlaster ? 'One-Shot Blaster [Space]' : 'Fire Bolt [Space]'}
        >
          {hasOneShotBlaster ? (
            <Zap className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2.5]" />
          ) : (
            <Wand2 className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2.5]" />
          )}
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider mt-0.5">
            {hasOneShotBlaster ? 'Blaster' : 'Shoot'}
          </span>
          <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-slate-900 border border-sky-300 text-[9px] sm:text-[10px] font-mono font-bold text-sky-200">
            {ammo}/{maxAmmo}
          </span>
        </button>

        {/* Interact Button */}
        <button
          type="button"
          onClick={() => {
            sounds.playSwitchPress();
            onInteract();
          }}
          className="relative w-16 h-16 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 border-[3px] sm:border-4 border-white shadow-2xl flex flex-col items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
          style={{ boxShadow: '0 8px 28px rgba(245, 158, 11, 0.45)' }}
          title="Interact [E]"
        >
          <Hand className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5]" />
          <span className="text-[8px] sm:text-xs font-black uppercase tracking-wider mt-0.5">
            Interact
          </span>
        </button>
      </div>
    </div>
  );
};
