import React from 'react';
import {
  Coins,
  Magnet,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { GameHudState, OUTFIT_CONFIGS, OutfitId, PowerUpType } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface GameOverlayProps {
  hud: GameHudState;
  contextLost: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onMenu: () => void;
  onOutfitChange: (outfit: OutfitId) => void;
  onToggleMute: () => void;
  onTouchAction: (action: 'left' | 'right' | 'jump' | 'slide') => void;
}

const POWERUP_META: Record<PowerUpType, { label: string; colorClass: string; Icon: React.ElementType }> = {
  magnet: { label: 'Khukuri Magnet', colorClass: 'bg-[#DC143C]', Icon: Magnet },
  jetpack: { label: 'Akash Udan', colorClass: 'bg-[#F59E0B]', Icon: Wind },
  multiplier: { label: '2x Sashan', colorClass: 'bg-[#38BDF8]', Icon: Sparkles },
  shield: { label: 'Bhimsen Shield', colorClass: 'bg-[#10B981]', Icon: Shield },
};

export const GameOverlay: React.FC<GameOverlayProps> = ({
  hud,
  contextLost,
  onStart,
  onPause,
  onResume,
  onMenu,
  onOutfitChange,
  onToggleMute,
  onTouchAction,
}) => {
  const { status } = hud;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top HUD Bar */}
      <header className="flex items-start justify-between gap-4">
        {/* Left: Score & Distance Readout (visible in gameplay & pause) */}
        {status !== 'menu' ? (
          <div className="pointer-events-auto rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/88 px-4 py-2.5 shadow-lg">
            <div className="flex items-baseline gap-3">
              <span className="font-mono-num text-2xl font-bold tracking-tight text-[#FFF8EE] sm:text-3xl">
                {hud.score.toLocaleString()}
              </span>
              {hud.multiplier > 1 && (
                <span className="font-mono-num text-xs font-bold text-[#38BDF8]">
                  ×{hud.multiplier}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[#C7B9A5]">
              <span className="font-mono-num">{hud.distance} m</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">Best {hud.bestScore.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/88 px-4 py-2.5 shadow-lg">
            <div className="flex items-center gap-3 text-sm text-[#FFF8EE]">
              <Trophy className="h-4 w-4 text-[#F5B82E]" aria-hidden="true" />
              <span className="font-medium">Best</span>
              <span className="font-mono-num font-bold">{hud.bestScore.toLocaleString()}</span>
              <span aria-hidden="true" className="text-[#C7B9A5]/50">·</span>
              <Coins className="h-4 w-4 text-[#F5B82E]" aria-hidden="true" />
              <span className="font-mono-num font-bold">{hud.totalCoins.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Center: Active Power-Ups & Notices */}
        <div className="hidden flex-col items-center gap-2 sm:flex">
          {hud.noticeText && status === 'playing' && (
            <div className="rounded-lg border border-[#F5B82E]/35 bg-[#16120F]/90 px-4 py-1.5 text-sm font-semibold text-[#FFE082] shadow-md">
              {hud.noticeText}
            </div>
          )}
          {hud.activePowerUps.length > 0 && status !== 'menu' && (
            <div className="flex items-center gap-2">
              {hud.activePowerUps.map((p) => {
                const meta = POWERUP_META[p.type];
                const Icon = meta.Icon;
                const pct = Math.max(0, Math.min(100, (p.remaining / p.duration) * 100));
                return (
                  <div
                    key={p.type}
                    className="w-36 rounded-lg border border-[#E8D8C3]/15 bg-[#16120F]/88 px-3 py-1.5 shadow-md"
                  >
                    <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-[#FFF8EE]">
                      <span className="flex items-center gap-1.5 truncate">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[#F5B82E]" aria-hidden="true" />
                        <span className="truncate">{meta.label}</span>
                      </span>
                      <span className="font-mono-num text-[11px] text-[#C7B9A5]">
                        {Math.ceil(p.remaining)}s
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full ${meta.colorClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Mohar Coins + Mute + Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          {status !== 'menu' && (
            <div className="flex items-center gap-2 rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/88 px-3.5 py-2.5 shadow-lg">
              <Coins className="h-4 w-4 text-[#F5B82E]" aria-hidden="true" />
              <span className="font-mono-num text-base font-bold text-[#FFF8EE]">
                {hud.coins.toLocaleString()}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/88 text-[#FFF8EE] shadow-lg transition-colors hover:bg-[#2A221C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
          >
            {hud.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {status === 'playing' && (
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause game"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/88 text-[#FFF8EE] shadow-lg transition-colors hover:bg-[#2A221C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
            >
              <Pause className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Power-Up Strip */}
      {hud.activePowerUps.length > 0 && status === 'playing' && (
        <div className="mt-2 flex flex-wrap justify-center gap-2 sm:hidden">
          {hud.activePowerUps.map((p) => {
            const meta = POWERUP_META[p.type];
            const pct = Math.max(0, Math.min(100, (p.remaining / p.duration) * 100));
            return (
              <div
                key={p.type}
                className="w-28 rounded-lg border border-[#E8D8C3]/15 bg-[#16120F]/88 px-2.5 py-1"
              >
                <div className="flex items-center justify-between text-[11px] font-medium text-[#FFF8EE]">
                  <span className="truncate">{meta.label}</span>
                  <span className="font-mono-num">{Math.ceil(p.remaining)}s</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full ${meta.colorClass}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Center Overlays (Menu, Pause, Game Over, WebGL Warning) */}
      <main className="flex flex-1 items-center justify-center lg:justify-start">
        {contextLost && (
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-[#F59E0B]/40 bg-[#16120F]/95 p-6 text-center shadow-2xl">
            <h2 className="font-display text-xl font-bold text-[#FFF8EE]">Graphics Context Paused</h2>
            <p className="mt-2 text-sm text-[#C7B9A5]">
              Your browser temporarily suspended WebGL rendering. Waiting to restore the Kathmandu street scene.
            </p>
          </div>
        )}

        {!contextLost && status === 'menu' && (
          <section className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#E8D8C3]/18 bg-[#16120F]/92 p-6 shadow-2xl sm:p-8 lg:ml-6">
            <p className="text-xs font-semibold tracking-wide text-[#F5B82E]">
              Kathmandu Heritage Runner
            </p>
            <h1 className="font-display mt-1.5 text-3xl font-extrabold tracking-tight text-[#FFF8EE] sm:text-4xl">
              Kathmandu Dash
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#D4C7B4]">
              Sprint through Durbar Square cobblestones as PM Balen Shah. Dodge Sajha buses, leap bamboo festival gates, duck under carved Torana arches, and collect gold Mohars.
            </p>

            {/* Outfit Selector */}
            <div className="mt-6">
              <div className="text-xs font-medium text-[#C7B9A5]">Select Attire</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(OUTFIT_CONFIGS) as OutfitId[]).map((id) => {
                  const cfg = OUTFIT_CONFIGS[id];
                  const active = hud.outfit === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onOutfitChange(id)}
                      className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E] ${
                        active
                          ? 'border-[#F5B82E] bg-[#2D2118] text-[#FFF8EE]'
                          : 'border-[#E8D8C3]/12 bg-[#1E1814] text-[#C7B9A5] hover:bg-[#261E18] hover:text-[#FFF8EE]'
                      }`}
                    >
                      <div className="truncate text-xs font-semibold">{cfg.name}</div>
                      <div className="mt-0.5 truncate text-[11px] opacity-80">{cfg.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onStart}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#DC143C] px-6 py-3 text-base font-bold text-white shadow-lg transition-colors hover:bg-[#B91032] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
              >
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                <span className="whitespace-nowrap">Start Run</span>
              </button>
              <PWAInstallButton variant="menu" />
            </div>

            <div className="mt-5 border-t border-[#E8D8C3]/10 pt-4 text-xs text-[#C7B9A5]">
              <span>Arrow keys or WASD to move, jump, and slide</span>
              <span aria-hidden="true"> · </span>
              <span>Swipe on touch devices</span>
            </div>
          </section>
        )}

        {!contextLost && status === 'paused' && (
          <section className="pointer-events-auto mx-auto w-full max-w-sm rounded-2xl border border-[#E8D8C3]/18 bg-[#16120F]/94 p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-[#FFF8EE]">Run Paused</h2>
            <p className="mt-1.5 text-sm text-[#C7B9A5]">
              Current score {hud.score.toLocaleString()} · {hud.distance} m
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#DC143C] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B91032] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span className="whitespace-nowrap">Resume</span>
              </button>
              <button
                type="button"
                onClick={onStart}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#E8D8C3]/15 bg-[#221B16] px-5 py-2.5 text-sm font-semibold text-[#FFF8EE] transition-colors hover:bg-[#2E241E]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span className="whitespace-nowrap">Restart Run</span>
              </button>
              <button
                type="button"
                onClick={onMenu}
                className="min-h-[44px] w-full rounded-xl px-5 py-2 text-sm font-medium text-[#C7B9A5] transition-colors hover:text-[#FFF8EE]"
              >
                Main Menu
              </button>
            </div>
          </section>
        )}

        {!contextLost && status === 'gameover' && (
          <section className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-[#E8D8C3]/20 bg-[#16120F]/94 p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold text-[#FFF8EE]">Run Ended</h2>
              {hud.isNewBest && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#F5B82E]">
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  New Best
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-[#D4C7B4]">{hud.crashReason}</p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-[#E8D8C3]/12 py-4">
              <div>
                <div className="text-xs text-[#C7B9A5]">Score</div>
                <div className="font-mono-num mt-0.5 text-xl font-bold text-[#FFF8EE]">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#C7B9A5]">Distance</div>
                <div className="font-mono-num mt-0.5 text-xl font-bold text-[#FFF8EE]">
                  {hud.distance} m
                </div>
              </div>
              <div>
                <div className="text-xs text-[#C7B9A5]">Mohars</div>
                <div className="font-mono-num mt-0.5 text-xl font-bold text-[#F5B82E]">
                  +{hud.coins.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={onStart}
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#DC143C] px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#B91032] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span className="whitespace-nowrap">Run Again</span>
              </button>
              <button
                type="button"
                onClick={onMenu}
                className="flex min-h-[48px] items-center justify-center rounded-xl border border-[#E8D8C3]/15 bg-[#221B16] px-5 py-3 text-sm font-semibold text-[#FFF8EE] transition-colors hover:bg-[#2E241E]"
              >
                <span className="whitespace-nowrap">Main Menu</span>
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Controls Hint / Mobile Touch Pad */}
      <footer className="flex items-end justify-center">
        {status === 'playing' && (
          <>
            <div className="hidden rounded-lg border border-[#E8D8C3]/10 bg-[#16120F]/75 px-3.5 py-1.5 text-xs text-[#D4C7B4] sm:block">
              <span>← / → or A / D: Switch Lane</span>
              <span aria-hidden="true" className="mx-2 text-[#C7B9A5]/50">·</span>
              <span>↑ / W / Space: Jump</span>
              <span aria-hidden="true" className="mx-2 text-[#C7B9A5]/50">·</span>
              <span>↓ / S: Slide or Fast Dive</span>
            </div>

            {/* Compact mobile quick-action buttons for one-handed tap reliability */}
            <div className="pointer-events-auto flex w-full max-w-xs items-center justify-between gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => onTouchAction('left')}
                aria-label="Move Left"
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/80 text-sm font-bold text-[#FFF8EE] active:bg-[#2A221C]"
              >
                Left
              </button>
              <button
                type="button"
                onClick={() => onTouchAction('jump')}
                aria-label="Jump"
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-[#F5B82E]/35 bg-[#DC143C]/90 text-sm font-bold text-white active:bg-[#B91032]"
              >
                Jump
              </button>
              <button
                type="button"
                onClick={() => onTouchAction('slide')}
                aria-label="Slide"
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/80 text-sm font-bold text-[#FFF8EE] active:bg-[#2A221C]"
              >
                Slide
              </button>
              <button
                type="button"
                onClick={() => onTouchAction('right')}
                aria-label="Move Right"
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/80 text-sm font-bold text-[#FFF8EE] active:bg-[#2A221C]"
              >
                Right
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
};
