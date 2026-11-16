import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Clock, RefreshCw } from 'lucide-react';
import { sounds } from '../services/sound';

interface VictoryModalProps {
  isOpen: boolean;
  timeElapsed: number;
  tokensCollected: number;
  onRestart: () => void;
  onReturnLobby: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  timeElapsed,
  tokensCollected,
  onRestart,
  onReturnLobby
}) => {
  useEffect(() => {
    if (isOpen) {
      sounds.playHavenAscension();
      try {
        const count = 180;
        const defaults = {
          origin: { y: 0.7 },
          colors: ['#FFD700', '#F59E0B', '#60A5FA', '#FFFFFF']
        };

        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        };

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.15, { spread: 120, startVelocity: 45 });
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="game-landscape-stage fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-md max-h-[94dvh] bg-gradient-to-b from-slate-900 via-[#0f1f3a] to-slate-900 rounded-3xl border-2 border-amber-400/70 shadow-2xl p-5 sm:p-8 text-center space-y-4 sm:space-y-6">
        <div className="relative mx-auto w-22 h-22 rounded-full bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-100 border-4 border-white/80 shadow-xl flex items-center justify-center">
          <Trophy className="w-11 h-11 text-amber-900" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Safe Haven Reached
          </div>
          <h2 className="haven-title-3d text-2xl sm:text-3xl font-black">
            VICTORY: You have reached the Haven
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
            The Adventurer has banished the shadows and claimed eternal peace upon the Sanctuary Throne.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950/60 rounded-2xl border border-amber-400/25">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-bold uppercase">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Time
            </div>
            <div className="text-lg font-black text-slate-100 font-mono">{timeFormatted}</div>
          </div>

          <div className="space-y-1 border-l border-white/10">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-bold uppercase">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-amber-950 font-cinzel text-[10px] font-black">
                T
              </span>
              Tokens
            </div>
            <div className="text-lg font-black text-amber-300 font-mono">{tokensCollected}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={() => {
              sounds.playSwitchPress();
              onReturnLobby();
            }}
            className="flex-1 py-3 px-4 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Main Lobby
          </button>

          <button
            onClick={() => {
              sounds.playGateUnlock();
              onRestart();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
