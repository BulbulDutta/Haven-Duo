import React from 'react';
import { Flame, Zap, X, Check } from 'lucide-react';
import { sounds } from '../services/sound';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: number;
  snapCount: number;
  hasOneShotBlaster: boolean;
  onBuySnap: () => void;
  onBuyBlaster: () => void;
}

export const SNAP_COST = 50;
export const BLASTER_COST = 150;

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  tokens,
  snapCount,
  hasOneShotBlaster,
  onBuySnap,
  onBuyBlaster
}) => {
  if (!isOpen) return null;

  return (
    <div className="game-landscape-stage fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto">
      <div className="relative w-full max-w-lg max-h-[94dvh] bg-[#0d192b] rounded-2xl border border-amber-500/50 shadow-2xl p-4 sm:p-6 space-y-3 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-2.5 sm:pb-3 border-b border-white/10">
          <div>
            <h2 className="font-cinzel font-black text-base sm:text-lg text-amber-100 tracking-wide">
              Sanctuary Armory
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Equip relics before descending into the depths
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="token-pill-badge !py-1.5 !px-3.5">
              <div className="token-coin-icon !w-6 !h-6 !text-xs">
                <span>T</span>
              </div>
              <span className="token-text !text-xs tabular-nums">TOKENS {tokens}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playSwitchPress();
                onClose();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Close Shop"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Shop Items */}
        <div className="space-y-3">
          {/* Item 1: The Snap of Doom */}
          <div className="p-4 rounded-xl bg-slate-950/65 border border-white/10 flex items-center justify-between gap-4 hover:border-amber-400/50 transition">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-purple-700 to-amber-500 border border-white/30 flex items-center justify-center shadow-md">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <h3 className="font-cinzel font-bold text-sm text-amber-100">
                    The Snap of Doom
                  </h3>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="text-slate-300 font-medium tabular-nums">
                    Owned: {snapCount}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Consumable relic. Trigger with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">F</kbd> in battle to banish the nearest Shadow instantly.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={tokens < SNAP_COST}
              onClick={onBuySnap}
              className={`shrink-0 px-4 py-2.5 rounded-xl font-black text-xs tracking-wider transition whitespace-nowrap ${
                tokens >= SNAP_COST
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
              }`}
            >
              {SNAP_COST} Tokens
            </button>
          </div>

          {/* Item 2: One-Shot Blaster */}
          <div className="p-4 rounded-xl bg-slate-950/65 border border-white/10 flex items-center justify-between gap-4 hover:border-amber-400/50 transition">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-rose-600 to-amber-400 border border-white/30 flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-slate-950" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <h3 className="font-cinzel font-bold text-sm text-amber-100">
                    One-Shot Blaster
                  </h3>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="text-slate-300 font-medium">
                    Permanent Sidearm
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fires superheated tracer bolts that fell any Shadow in a single hit.
                </p>
              </div>
            </div>

            {hasOneShotBlaster ? (
              <div className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap">
                <Check className="w-4 h-4" />
                Equipped
              </div>
            ) : (
              <button
                type="button"
                disabled={tokens < BLASTER_COST}
                onClick={onBuyBlaster}
                className={`shrink-0 px-4 py-2.5 rounded-xl font-black text-xs tracking-wider transition whitespace-nowrap ${
                  tokens >= BLASTER_COST
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                }`}
              >
                {BLASTER_COST} Tokens
              </button>
            )}
          </div>
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs cursor-pointer transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
