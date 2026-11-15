import React from 'react';
import { Camera, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, Flame, ArrowDown } from 'lucide-react';
import { KeyState, TelemetrySnapshot } from '../game/constants';

interface GameHudProps {
  telemetry: TelemetrySnapshot;
  onToggleMute: () => void;
  onCycleCamera: () => void;
  onPause: () => void;
  onTouchControl: (control: keyof KeyState, active: boolean) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  telemetry,
  onToggleMute,
  onCycleCamera,
  onPause,
  onTouchControl,
}) => {
  const cameraLabel =
    telemetry.cameraMode === 'CHASE'
      ? 'Chase'
      : telemetry.cameraMode === 'BUMPER'
        ? 'Bumper'
        : 'Hood';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Perimeter Telemetry Row */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Sector & Distance */}
        <div className="bg-[#080a10]/82 border border-white/10 rounded-lg px-4 py-2.5 flex flex-col gap-0.5">
          <div
            className="text-xs font-medium tracking-wide whitespace-nowrap"
            style={{ color: telemetry.accentHex }}
          >
            {telemetry.sectorLabel}
          </div>
          <div className="flex items-baseline gap-3 text-slate-100">
            <span className="font-mono-tabular text-xl sm:text-2xl font-semibold tracking-tight">
              {telemetry.distance.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">m</span>
            </span>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {cameraLabel} cam
            </span>
          </div>
        </div>

        {/* Top-Right: Score, Combo & Utility Controls */}
        <div className="flex items-start gap-2.5">
          <div className="bg-[#080a10]/82 border border-white/10 rounded-lg px-4 py-2.5 text-right">
            <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
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
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Best {telemetry.bestScore.toLocaleString()}
                  </span>
                </>
              )}
            </div>
            <div className="font-mono-tabular text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {telemetry.score.toLocaleString()}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 bg-[#080a10]/82 border border-white/10 rounded-lg p-1.5">
            <button
              type="button"
              onClick={onCycleCamera}
              title="Switch camera (C)"
              aria-label="Switch camera"
              className="h-10 w-10 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              title={telemetry.isMuted ? 'Unmute audio (M)' : 'Mute audio (M)'}
              aria-label={telemetry.isMuted ? 'Unmute audio' : 'Mute audio'}
              className="h-10 w-10 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {telemetry.isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onPause}
              title="Pause (Esc)"
              aria-label="Pause game"
              className="h-10 w-10 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transient Near-Miss Callout (Center-Top, non-occluding) */}
      {telemetry.nearMissEventId > 0 && (
        <div
          key={telemetry.nearMissEventId}
          className="animate-near-miss fixed top-24 left-1/2 pointer-events-none flex items-center gap-2 bg-[#080a10]/88 border border-white/15 rounded-lg px-3.5 py-1.5"
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

      {/* Bottom Perimeter: Touch Controls (mobile/coarse) + Compact Speedometer & Nitro */}
      <div className="flex items-end justify-between gap-4">
        {/* Left Touch Steer Pad (visible on touch/small viewports) */}
        <div className="pointer-events-auto flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label="Steer left"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onTouchControl('left', true);
            }}
            onPointerUp={() => onTouchControl('left', false)}
            onPointerCancel={() => onTouchControl('left', false)}
            className="h-14 w-14 flex items-center justify-center rounded-xl bg-[#080a10]/82 border border-white/15 text-white active:bg-white/15"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="Steer right"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onTouchControl('right', true);
            }}
            onPointerUp={() => onTouchControl('right', false)}
            onPointerCancel={() => onTouchControl('right', false)}
            className="h-14 w-14 flex items-center justify-center rounded-xl bg-[#080a10]/82 border border-white/15 text-white active:bg-white/15"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Center Compact Speedometer & Nitro Gauge */}
        <div className="mx-auto bg-[#080a10]/84 border border-white/10 rounded-lg px-5 py-2.5 min-w-[230px] sm:min-w-[280px]">
          <div className="flex items-baseline justify-between gap-4 mb-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-mono-tabular text-3xl sm:text-4xl font-bold text-white leading-none">
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

        {/* Right Touch Brake & Nitro Pad (visible on touch/small viewports) */}
        <div className="pointer-events-auto flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label="Brake"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onTouchControl('down', true);
            }}
            onPointerUp={() => onTouchControl('down', false)}
            onPointerCancel={() => onTouchControl('down', false)}
            className="h-14 w-14 flex items-center justify-center rounded-xl bg-[#080a10]/82 border border-white/15 text-slate-200 active:bg-white/15"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Nitro boost"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onTouchControl('boost', true);
            }}
            onPointerUp={() => onTouchControl('boost', false)}
            onPointerCancel={() => onTouchControl('boost', false)}
            className="h-14 w-14 flex items-center justify-center rounded-xl bg-[#080a10]/82 border border-white/15 text-white active:bg-white/15"
            style={{
              borderColor:
                telemetry.nitro > 20 ? telemetry.accentHex : 'rgba(255,255,255,0.15)',
            }}
          >
            <Flame className="w-5 h-5" style={{ color: telemetry.accentHex }} />
          </button>
        </div>
      </div>
    </div>
  );
};
