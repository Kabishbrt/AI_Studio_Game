import { useCallback, useEffect, useRef, useState } from 'react';
import { GameOverlay } from './components/GameOverlay';
import { NepaliRunnerEngine } from './game/NepaliRunnerEngine';
import { GameHudState, OutfitId } from './game/types';

const INITIAL_HUD: GameHudState = {
  status: 'menu',
  score: 0,
  bestScore: 0,
  coins: 0,
  totalCoins: 0,
  distance: 0,
  speed: 19,
  multiplier: 1,
  activePowerUps: [],
  isNewBest: false,
  crashReason: '',
  outfit: 'classic',
  muted: false,
  noticeText: '',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<NepaliRunnerEngine | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [contextLost, setContextLost] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Mount Three.js engine once in isolated container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    let engine: NepaliRunnerEngine | null = null;
    try {
      engine = new NepaliRunnerEngine(
        mount,
        (nextState) => setHud(nextState),
        (lost) => setContextLost(lost)
      );
      engineRef.current = engine;
    } catch (err) {
      setWebglError(
        err instanceof Error ? err.message : '3D WebGL rendering is unavailable on this device.'
      );
    }

    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard controls (WASD, Arrows, Space, Enter, Escape/P)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const key = e.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(key)) {
        e.preventDefault();
      }

      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        engine.moveLane(-1);
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        engine.moveLane(1);
      } else if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === ' ') {
        if (hud.status === 'menu' || hud.status === 'gameover') {
          if (key === ' ') engine.startNewRun();
        } else if (hud.status === 'playing') {
          engine.jump();
        }
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        engine.slide();
      } else if (key === 'Enter') {
        if (hud.status === 'menu' || hud.status === 'gameover') {
          engine.startNewRun();
        } else if (hud.status === 'paused') {
          engine.resumeGame();
        }
      } else if (key === 'Escape' || key === 'p' || key === 'P') {
        if (hud.status === 'playing') {
          engine.pauseGame();
        } else if (hud.status === 'paused') {
          engine.resumeGame();
        }
      } else if (key === 'm' || key === 'M') {
        engine.toggleMute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.status]);

  // Pointer / Touch Swipe controls on the canvas wrapper
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || !engineRef.current) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const threshold = 24;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      engineRef.current.moveLane(dx < 0 ? -1 : 1);
    } else {
      if (dy < 0) engineRef.current.jump();
      else engineRef.current.slide();
    }
  }, []);

  const handleStart = useCallback(() => engineRef.current?.startNewRun(), []);
  const handlePause = useCallback(() => engineRef.current?.pauseGame(), []);
  const handleResume = useCallback(() => engineRef.current?.resumeGame(), []);
  const handleMenu = useCallback(() => engineRef.current?.returnToMenu(), []);
  const handleOutfitChange = useCallback((outfit: OutfitId) => engineRef.current?.setOutfit(outfit), []);
  const handleToggleMute = useCallback(() => engineRef.current?.toggleMute(), []);
  const handleTouchAction = useCallback((action: 'left' | 'right' | 'jump' | 'slide') => {
    const engine = engineRef.current;
    if (!engine) return;
    if (action === 'left') engine.moveLane(-1);
    else if (action === 'right') engine.moveLane(1);
    else if (action === 'jump') engine.jump();
    else if (action === 'slide') engine.slide();
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#12100E]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Dedicated isolated WebGL canvas container */}
      <div ref={canvasMountRef} className="h-full w-full" />

      {webglError ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12100E] p-6">
          <div className="max-w-md rounded-2xl border border-[#E8D8C3]/20 bg-[#16120F] p-6 text-center shadow-2xl">
            <h1 className="font-display text-2xl font-bold text-[#FFF8EE]">Kathmandu Dash</h1>
            <p className="mt-2 text-sm text-[#D4C7B4]">
              Unable to start 3D graphics in this browser ({webglError}). Try enabling hardware acceleration or opening in Chrome or Safari.
            </p>
          </div>
        </div>
      ) : (
        <GameOverlay
          hud={hud}
          contextLost={contextLost}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onMenu={handleMenu}
          onOutfitChange={handleOutfitChange}
          onToggleMute={handleToggleMute}
          onTouchAction={handleTouchAction}
        />
      )}
    </div>
  );
}
