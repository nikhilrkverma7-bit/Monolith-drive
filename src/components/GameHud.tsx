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
import {
  clampButtonCenter,
  ControlPreferences,
  getButtonPixelSize,
  TOUCH_CONTROL_ORDER,
  TouchButtonConfig,
  TouchControlId,
  TouchControlsLayout,
} from '../game/controlsLayout';
import { useIsTouchDevice } from '../game/useIsTouchDevice';

interface GameHudProps {
  telemetry: TelemetrySnapshot;
  controlsLayout: TouchControlsLayout;
  controlPrefs: ControlPreferences;
  onVirtualKey: (code: string, pressed: boolean) => void;
}

function triggerHaptic(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
  } catch {
    // Ignore environments that block vibration
  }
}

function renderControlIcon(id: TouchControlId, scale: number, accentHex: string) {
  const iconPx = Math.round(24 * Math.min(1.65, Math.max(0.8, scale)));
  switch (id) {
    case 'left':
      return <ChevronLeft style={{ width: iconPx + 4, height: iconPx + 4 }} />;
    case 'right':
      return <ChevronRight style={{ width: iconPx + 4, height: iconPx + 4 }} />;
    case 'brake':
      return <ChevronDown className="text-rose-300" style={{ width: iconPx, height: iconPx }} />;
    case 'throttle':
      return <ChevronUp className="text-slate-100" style={{ width: iconPx, height: iconPx }} />;
    case 'nitro':
      return <Flame style={{ width: iconPx, height: iconPx, color: accentHex }} />;
  }
}

interface PositionedTouchButtonProps {
  config: TouchButtonConfig;
  viewportW: number;
  viewportH: number;
  accentColor: string;
  isNitroReady: boolean;
  opacity: number;
  autoThrottle: boolean;
  isTouchDevice: boolean;
  onVirtualKey: (code: string, pressed: boolean) => void;
}

const PositionedTouchButton: React.FC<PositionedTouchButtonProps> = ({
  config,
  viewportW,
  viewportH,
  accentColor,
  isNitroReady,
  opacity,
  autoThrottle,
  isTouchDevice,
  onVirtualKey,
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
        onVirtualKey(config.keyCode, false);
      }
    };
  }, [config.keyCode, onVirtualKey]);

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
      triggerHaptic();
      onVirtualKey(config.keyCode, true);
    }
  };

  const releasePointer = (pointerId: number) => {
    if (!activePointersRef.current.has(pointerId)) return;
    activePointersRef.current.delete(pointerId);
    if (activePointersRef.current.size === 0) {
      setPressed(false);
      onVirtualKey(config.keyCode, false);
    }
  };

  const size = getButtonPixelSize(config);
  const clamped = clampButtonCenter(
    config.xPct * viewportW,
    config.yPct * viewportH,
    size.width,
    size.height,
    viewportW,
    viewportH
  );

  const isBrake = config.id === 'brake';
  const isThrottle = config.id === 'throttle';
  const isNitro = config.id === 'nitro';
  const showNitroIdleBorder = isNitro && isNitroReady && !pressed;
  const showAutoIdle = isThrottle && autoThrottle && !pressed;

  const activeBoxShadow = pressed
    ? isBrake
      ? '0 0 22px rgba(244, 63, 94, 0.68), inset 0 0 12px rgba(244, 63, 94, 0.35)'
      : '0 0 22px rgba(0, 229, 255, 0.68), inset 0 0 12px rgba(0, 229, 255, 0.35)'
    : undefined;

  const idleBorderColor = showNitroIdleBorder
    ? accentColor
    : showAutoIdle
      ? 'rgba(0, 229, 255, 0.55)'
      : undefined;

  const effectiveOpacity = pressed ? Math.min(1, Math.max(0.7, opacity + 0.3)) : opacity;

  const pressedClass = isBrake
    ? 'bg-rose-500/28 border-rose-400 text-rose-100 scale-95'
    : 'bg-cyan-400/24 border-[#00e5ff] text-white scale-95';

  const subText =
    isThrottle && autoThrottle ? 'AUTO' : isTouchDevice ? undefined : config.subLabel;

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={config.label}
      aria-pressed={pressed}
      onPointerDown={handlePointerDown}
      onPointerUp={(e) => releasePointer(e.pointerId)}
      onPointerCancel={(e) => releasePointer(e.pointerId)}
      onLostPointerCapture={(e) => releasePointer(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: `${Math.round(clamped.cx - size.width / 2)}px`,
        top: `${Math.round(clamped.cy - size.height / 2)}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        borderRadius: size.borderRadius,
        borderColor: pressed ? undefined : idleBorderColor,
        boxShadow: activeBoxShadow,
        opacity: effectiveOpacity,
      }}
      className={`pointer-events-auto touch-none select-none flex flex-col items-center justify-center border transition-[transform,box-shadow,background-color,border-color,opacity] duration-75 cursor-pointer ${
        pressed ? pressedClass : 'bg-[#080a10]/52 border-white/15 text-slate-100 hover:bg-[#080a10]/70'
      }`}
    >
      {renderControlIcon(config.id, config.scale, accentColor)}
      {subText && (
        <span
          className={`font-mono-tabular leading-none font-medium mt-0.5 ${
            isThrottle && autoThrottle ? 'text-[#00e5ff]' : 'text-slate-300'
          }`}
          style={{ fontSize: `${Math.round(10 * Math.min(1.4, Math.max(0.85, config.scale)))}px` }}
        >
          {subText}
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
    triggerHaptic();
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
      className="touch-none select-none h-11 min-w-[44px] px-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-[#080a10]/55 border border-white/15 text-slate-200 hover:text-white hover:bg-[#080a10]/78 active:bg-cyan-400/22 active:border-[#00e5ff] active:shadow-[0_0_16px_rgba(0,229,255,0.55)] active:scale-95 transition-[transform,box-shadow,background-color,border-color] duration-75 cursor-pointer"
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

export const GameHud: React.FC<GameHudProps> = ({
  telemetry,
  controlsLayout,
  controlPrefs,
  onVirtualKey,
}) => {
  const isTouchDevice = useIsTouchDevice();
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cameraLabel =
    telemetry.cameraMode === 'CHASE'
      ? 'Chase'
      : telemetry.cameraMode === 'BUMPER'
        ? 'Bumper'
        : 'Hood';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Telemetry & Top-Corner Action Buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          {/* Top-Left: Sector, Weather & Distance */}
          <div className="bg-[#080a10]/68 border border-white/12 rounded-lg px-3.5 py-2 sm:px-4 sm:py-2.5 flex flex-col gap-0.5">
            <div
              className="text-[11px] sm:text-xs font-medium tracking-wide whitespace-nowrap"
              style={{ color: telemetry.accentHex }}
            >
              {telemetry.sectorLabel} · {telemetry.weatherLabel}
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
                badge={isTouchDevice ? undefined : 'C'}
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
                badge={isTouchDevice ? undefined : 'ESC'}
                onVirtualKey={onVirtualKey}
              >
                <Pause className="w-4 h-4" />
              </TouchTapButton>
            </div>
          </div>
        </div>

        {/* Compact Speedometer & Nitro Gauge on < md screens (avoids colliding with larger bottom touch pads) */}
        <div className="md:hidden mx-auto bg-[#080a10]/68 border border-white/12 rounded-lg px-4 py-1.5 min-w-[205px]">
          <div className="flex items-baseline justify-between gap-4 mb-1">
            <div className="flex items-baseline gap-1">
              <span className="font-display font-mono-tabular text-xl font-bold text-white leading-none">
                {telemetry.speedKmh}
              </span>
              <span className="text-[11px] font-medium text-slate-400">km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
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
      </div>

      {/* Transient Near-Miss Callout */}
      {telemetry.nearMissEventId > 0 && (
        <div
          key={telemetry.nearMissEventId}
          className="animate-near-miss fixed top-28 md:top-24 left-1/2 pointer-events-none flex items-center gap-2 bg-[#080a10]/85 border border-white/15 rounded-lg px-3.5 py-1.5"
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

      {/* Center Speedometer & Nitro Gauge on md+ screens */}
      <div className="hidden md:block mx-auto bg-[#080a10]/68 border border-white/12 rounded-lg px-5 py-2.5 min-w-[250px]">
        <div className="flex items-baseline justify-between gap-4 mb-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-mono-tabular text-3xl lg:text-4xl font-bold text-white leading-none">
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

      {/* Persistent, Customizable Multi-Touch Control Buttons (<, >, S, W, SPACE) */}
      {TOUCH_CONTROL_ORDER.map((id) => (
        <PositionedTouchButton
          key={id}
          config={controlsLayout[id]}
          viewportW={viewport.w}
          viewportH={viewport.h}
          accentColor={telemetry.accentHex}
          isNitroReady={telemetry.nitro > 20}
          opacity={controlPrefs.opacity}
          autoThrottle={controlPrefs.autoThrottle}
          isTouchDevice={isTouchDevice}
          onVirtualKey={onVirtualKey}
        />
      ))}
    </div>
  );
};
