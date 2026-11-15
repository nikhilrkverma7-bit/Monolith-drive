import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Flame,
} from 'lucide-react';
import { TelemetrySnapshot } from '../game/constants';

interface GameHudProps {
  telemetry: TelemetrySnapshot;
  onVirtualKey: (code: string, pressed: boolean) => void;
}

interface TouchHoldButtonProps {
  keyCode: string;
  label: string;
  subLabel?: string;
  accentColor?: string;
  isAccentActive?: boolean;
  className?: string;
  onVirtualKey: (code: string, pressed: boolean) => void;
  children: React.ReactNode;
}

const TouchHoldButton: React.FC<TouchHoldButtonProps> = ({
  keyCode,
  label,
  subLabel,
  accentColor,
  isAccentActive,
  className = '',
  onVirtualKey,
  children,
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const activePointersRef = useRef<Set<number>>(new Set());
  const [pressed, setPressed] = useState(false);

  // Prevent default touch scrolling/zooming cleanly with non-passive listeners
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const preventScroll = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchstart', preventScroll, { passive: false });
    el.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      el.removeEventListener('touchstart', preventScroll);
      el.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // Ensure virtual key is released if component unmounts while held
  useEffect(() => {
    const pointers = activePointersRef.current;
    return () => {
      if (pointers.size > 0) {
        pointers.clear();
        onVirtualKey(keyCode, false);
      }
    };
  }, [keyCode, onVirtualKey]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors on synthetic events
    }
    const wasEmpty = activePointersRef.current.size === 0;
    activePointersRef.current.add(e.pointerId);
    if (wasEmpty) {
      setPressed(true);
      onVirtualKey(keyCode, true);
    }
  };

  const releasePointer = (pointerId: number) => {
    if (!activePointersRef.current.has(pointerId)) return;
    activePointersRef.current.delete(pointerId);
    if (activePointersRef.current.size === 0) {
      setPressed(false);
      onVirtualKey(keyCode, false);
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onPointerDown={handlePointerDown}
      onPointerUp={(e) => releasePointer(e.pointerId)}
      onPointerCancel={(e) => releasePointer(e.pointerId)}
      onLostPointerCapture={(e) => releasePointer(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        borderColor:
          pressed && accentColor
            ? accentColor
            : isAccentActive && accentColor
              ? accentColor
              : undefined,
      }}
      className={`touch-none select-none flex flex-col items-center justify-center rounded-xl border transition-transform duration-75 cursor-pointer ${
        pressed
          ? 'bg-white/20 border-white/50 text-white scale-95'
          : 'bg-[#080a10]/52 border-white/15 text-slate-100 hover:bg-[#080a10]/70'
      } ${className}`}
    >
      {children}
      {subLabel && (
        <span className="font-mono-tabular text-[10px] leading-none font-medium text-slate-300 mt-0.5">
          {subLabel}
        </span>
      )}
    </button>
  );
};

interface TouchTapButtonProps {
  keyCode: string;
  label: string;
  title: string;
  badge?: string;
  onVirtualKey: (code: string, pressed: boolean) => void;
  children: React.ReactNode;
}

const TouchTapButton: React.FC<TouchTapButtonProps> = ({
  keyCode,
  label,
  title,
  badge,
  onVirtualKey,
  children,
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const preventScroll = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchstart', preventScroll, { passive: false });
    el.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      el.removeEventListener('touchstart', preventScroll);
      el.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  const triggerTap = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onVirtualKey(keyCode, true);
    onVirtualKey(keyCode, false);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      aria-label={label}
      onPointerDown={triggerTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onVirtualKey(keyCode, true);
          onVirtualKey(keyCode, false);
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="touch-none select-none h-11 min-w-[44px] px-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-[#080a10]/55 border border-white/15 text-slate-200 hover:text-white hover:bg-[#080a10]/78 active:bg-white/20 active:scale-95 transition-transform duration-75 cursor-pointer"
    >
      {children}
      {badge && (
        <span className="font-mono-tabular text-[10px] font-medium text-slate-400">
          {badge}
        </span>
      )}
    </button>
  );
};

export const GameHud: React.FC<GameHudProps> = ({ telemetry, onVirtualKey }) => {
  const cameraLabel =
    telemetry.cameraMode === 'CHASE'
      ? 'Chase'
      : telemetry.cameraMode === 'BUMPER'
        ? 'Bumper'
        : 'Hood';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Telemetry & Top-Corner Action Buttons */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Sector & Distance */}
        <div className="bg-[#080a10]/68 border border-white/12 rounded-lg px-3.5 py-2 sm:px-4 sm:py-2.5 flex flex-col gap-0.5">
          <div
            className="text-[11px] sm:text-xs font-medium tracking-wide whitespace-nowrap"
            style={{ color: telemetry.accentHex }}
          >
            {telemetry.sectorLabel}
          </div>
          <div className="flex items-baseline gap-2.5 text-slate-100">
            <span className="font-mono-tabular text-lg sm:text-2xl font-semibold tracking-tight">
              {telemetry.distance.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">m</span>
            </span>
            <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">
              {cameraLabel} cam
            </span>
          </div>
        </div>

        {/* Top-Right: Score + Camera (C), Audio (M), Pause (Esc) */}
        <div className="flex items-start gap-2">
          <div className="bg-[#080a10]/68 border border-white/12 rounded-lg px-3.5 py-2 sm:px-4 sm:py-2.5 text-right">
            <div className="flex items-center justify-end gap-2 text-[11px] sm:text-xs text-slate-400">
              <span>Score</span>
              {telemetry.combo > 1 && (
                <span
                  className="font-mono-tabular font-semibold"
                  style={{ color: telemetry.accentHex }}
                >
                  x{telemetry.combo}
                </span>
              )}
              {telemetry.bestScore > 0 && (
                <span className="hidden sm:inline font-mono-tabular">
                  · Best {telemetry.bestScore.toLocaleString()}
                </span>
              )}
            </div>
            <div className="font-mono-tabular text-lg sm:text-2xl font-semibold text-white tracking-tight">
              {telemetry.score.toLocaleString()}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <TouchTapButton
              keyCode="KeyC"
              label={`Switch camera (${cameraLabel})`}
              title="Switch camera (C)"
              badge="C"
              onVirtualKey={onVirtualKey}
            >
              <Camera className="w-4 h-4" />
            </TouchTapButton>
            <TouchTapButton
              keyCode="KeyM"
              label={telemetry.isMuted ? 'Unmute audio' : 'Mute audio'}
              title={telemetry.isMuted ? 'Unmute audio (M)' : 'Mute audio (M)'}
              onVirtualKey={onVirtualKey}
            >
              {telemetry.isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </TouchTapButton>
            <TouchTapButton
              keyCode="Escape"
              label="Pause game"
              title="Pause (Esc)"
              badge="ESC"
              onVirtualKey={onVirtualKey}
            >
              <Pause className="w-4 h-4" />
            </TouchTapButton>
          </div>
        </div>
      </div>

      {/* Transient Near-Miss Callout */}
      {telemetry.nearMissEventId > 0 && (
        <div
          key={telemetry.nearMissEventId}
          className="animate-near-miss fixed top-24 left-1/2 pointer-events-none flex items-center gap-2 bg-[#080a10]/85 border border-white/15 rounded-lg px-3.5 py-1.5"
        >
          <span
            className="font-display text-sm font-bold tracking-wider uppercase"
            style={{ color: telemetry.accentHex }}
          >
            Near Miss
          </span>
          <span className="font-mono-tabular text-xs font-semibold text-white">
            +{telemetry.nearMissBonus}
          </span>
          <span className="text-xs text-slate-300">· Nitro +18%</span>
        </div>
      )}

      {/* Bottom Perimeter: Multi-Touch Controls + Speedometer & Nitro */}
      <div className="flex flex-col gap-2.5 sm:gap-0">
        {/* Compact Speedometer on small mobile screens (sits cleanly above touch row) */}
        <div className="sm:hidden mx-auto bg-[#080a10]/68 border border-white/12 rounded-lg px-4 py-2 min-w-[210px]">
          <div className="flex items-baseline justify-between gap-4 mb-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-mono-tabular text-2xl font-bold text-white leading-none">
                {telemetry.speedKmh}
              </span>
              <span className="text-[11px] font-medium text-slate-400">km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Nitro</span>
              <span
                className="font-mono-tabular font-semibold"
                style={{
                  color: telemetry.isBoosting ? '#ffffff' : telemetry.accentHex,
                }}
              >
                {telemetry.nitro}%
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full transition-transform duration-75 origin-left rounded-full"
              style={{
                transform: `scaleX(${Math.max(0, Math.min(1, telemetry.nitro / 100))})`,
                backgroundColor: telemetry.isBoosting ? '#ffffff' : telemetry.accentHex,
              }}
            />
          </div>
        </div>

        {/* Bottom Controls Row: Left/Right Steer | Center Gauge (sm+) | Brake/Throttle/Nitro Pedals */}
        <div className="flex items-end justify-between gap-3">
          {/* Bottom-Left: Left / Right Steering Arrows */}
          <div className="pointer-events-auto flex items-center gap-2">
            <TouchHoldButton
              keyCode="ArrowLeft"
              label="Steer left"
              className="h-14 w-14 sm:h-16 sm:w-16"
              onVirtualKey={onVirtualKey}
            >
              <ChevronLeft className="w-7 h-7" />
            </TouchHoldButton>
            <TouchHoldButton
              keyCode="ArrowRight"
              label="Steer right"
              className="h-14 w-14 sm:h-16 sm:w-16"
              onVirtualKey={onVirtualKey}
            >
              <ChevronRight className="w-7 h-7" />
            </TouchHoldButton>
          </div>

          {/* Center Speedometer & Nitro Gauge (tablet/desktop inline) */}
          <div className="hidden sm:block mx-auto bg-[#080a10]/68 border border-white/12 rounded-lg px-5 py-2.5 min-w-[240px] md:min-w-[270px]">
            <div className="flex items-baseline justify-between gap-4 mb-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-mono-tabular text-3xl md:text-4xl font-bold text-white leading-none">
                  {telemetry.speedKmh}
                </span>
                <span className="text-xs font-medium text-slate-400">km/h</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Nitro</span>
                <span
                  className="font-mono-tabular font-semibold"
                  style={{
                    color: telemetry.isBoosting ? '#ffffff' : telemetry.accentHex,
                  }}
                >
                  {telemetry.nitro}%
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full transition-transform duration-75 origin-left rounded-full"
                style={{
                  transform: `scaleX(${Math.max(0, Math.min(1, telemetry.nitro / 100))})`,
                  backgroundColor: telemetry.isBoosting ? '#ffffff' : telemetry.accentHex,
                }}
              />
            </div>
          </div>

          {/* Bottom-Right: Brake (S), Throttle (W), and Nitro (Space) Pedals */}
          <div className="pointer-events-auto flex items-end gap-2">
            <TouchHoldButton
              keyCode="KeyS"
              label="Brake"
              subLabel="S"
              className="h-14 w-12 sm:h-16 sm:w-14"
              onVirtualKey={onVirtualKey}
            >
              <ChevronDown className="w-5 h-5 text-rose-300" />
            </TouchHoldButton>
            <TouchHoldButton
              keyCode="KeyW"
              label="Throttle"
              subLabel="W"
              className="h-16 w-12 sm:h-20 sm:w-14"
              onVirtualKey={onVirtualKey}
            >
              <ChevronUp className="w-5 h-5 text-slate-100" />
            </TouchHoldButton>
            <TouchHoldButton
              keyCode="Space"
              label="Nitro boost"
              subLabel="SPACE"
              accentColor={telemetry.accentHex}
              isAccentActive={telemetry.nitro > 20}
              className="h-16 w-14 sm:h-20 sm:w-16"
              onVirtualKey={onVirtualKey}
            >
              <Flame className="w-5 h-5" style={{ color: telemetry.accentHex }} />
            </TouchHoldButton>
          </div>
        </div>
      </div>
    </div>
  );
};
