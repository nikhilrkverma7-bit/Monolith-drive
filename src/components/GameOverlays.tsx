import React from 'react';
import {
  Play,
  RotateCcw,
  Camera,
  Volume2,
  VolumeX,
  Home,
  SlidersHorizontal,
} from 'lucide-react';
import { TelemetrySnapshot } from '../game/constants';
import { useIsTouchDevice } from '../game/useIsTouchDevice';

interface GameOverlaysProps {
  telemetry: TelemetrySnapshot;
  contextLost: boolean;
  isEditingControls: boolean;
  onStart: () => void;
  onResume: () => void;
  onReturnTitle: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onCustomizeControls: () => void;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  telemetry,
  contextLost,
  isEditingControls,
  onStart,
  onResume,
  onReturnTitle,
  onCycleCamera,
  onToggleMute,
  onCustomizeControls,
}) => {
  const isTouchDevice = useIsTouchDevice();

  if (contextLost) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#03050a]/92 p-6">
        <div className="max-w-md w-full bg-[#090c12] border border-white/10 rounded-xl p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Graphics Context Interrupted
          </h2>
          <p className="text-sm text-slate-300 mb-5">
            The 3D viewport lost its WebGL context. Reload or resume once your display driver restores.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg bg-cyan-400 text-slate-950 font-semibold text-sm hover:bg-cyan-300 transition-colors cursor-pointer"
          >
            Reload Viewport
          </button>
        </div>
      </div>
    );
  }

  if (telemetry.status === 'TITLE' && !isEditingControls) {
    return (
      <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
        {/* Top Minimal Utility Row */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-slate-300 tracking-wide">
            Obsidian Corridor · 4 Sectors
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={telemetry.isMuted ? 'Unmute audio' : 'Mute audio'}
              className="h-10 px-3 flex items-center gap-2 rounded-lg bg-[#080a10]/85 border border-white/10 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
            >
              {telemetry.isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>Audio Off</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Audio On</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Center-Top Hero Title Lockup over Calm Negative Space */}
        <div className="my-auto flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="mb-4">
            <svg
              width="56"
              height="40"
              viewBox="0 0 56 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M8 34L20 6H26L14 34H8Z" fill="#E2E8F0" />
              <path d="M23 34L35 6H41L29 34H23Z" fill="#00E5FF" />
              <path d="M38 34L46 16H51L43 34H38Z" fill="#64748B" />
            </svg>
          </div>

          <h1
            className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-white mb-3"
            style={{ textWrap: 'balance' }}
          >
            MONOLITH DRIVE
          </h1>

          <div className="mb-6 max-w-md px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#03050a]/72 via-[#03050a]/86 to-[#03050a]/72 border border-white/10 shadow-lg">
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Thread dense night traffic between towering obsidian monoliths and push into higher sectors.
            </p>
          </div>

          {telemetry.bestScore > 0 && (
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 bg-[#03050a]/72 border border-white/8 rounded-lg px-3.5 py-1.5 mb-5 font-mono-tabular">
              <span>Best Score {telemetry.bestScore.toLocaleString()}</span>
              <span aria-hidden="true">·</span>
              <span>Longest Run {telemetry.bestDistance.toLocaleString()} m</span>
            </div>
          )}

          <div className="pointer-events-auto flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2.5 min-w-[208px] px-8 py-3.5 rounded-lg bg-[#00e5ff] text-slate-950 font-semibold text-sm sm:text-base hover:bg-[#5ef0ff] transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Drive</span>
            </button>
            <button
              type="button"
              onClick={onCustomizeControls}
              className="inline-flex items-center justify-center gap-2 min-w-[208px] px-5 py-2.5 rounded-lg bg-[#080a10]/88 border border-white/15 text-slate-200 font-medium text-xs sm:text-sm hover:bg-white/14 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Customize Controls</span>
            </button>
          </div>
        </div>

        {/* Bottom Single Flat Control Hint Line (Desktop only) */}
        {!isTouchDevice ? (
          <div className="text-center text-xs text-slate-400 tracking-wide">
            A / D or Arrows Steer · W / S Throttle &amp; Brake · Space Nitro · C Camera · Esc Pause
          </div>
        ) : (
          <div aria-hidden="true" className="h-2" />
        )}
      </div>
    );
  }

  if (telemetry.status === 'PAUSED' && !isEditingControls) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#03050a]/72 p-6">
        <div className="w-full max-w-sm bg-[#090c12] border border-white/12 rounded-xl p-6">
          <div className="text-xs font-medium mb-1" style={{ color: telemetry.accentHex }}>
            {telemetry.sectorLabel} · {telemetry.weatherLabel}
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-5">Drive Paused</h2>

          <div className="flex items-center justify-between text-sm text-slate-300 pb-4 mb-5 border-b border-white/10 font-mono-tabular">
            <span>Score {telemetry.score.toLocaleString()}</span>
            <span>{telemetry.distance.toLocaleString()} m</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-[#00e5ff] text-slate-950 font-semibold text-sm hover:bg-[#5ef0ff] transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Drive</span>
            </button>
            <button
              type="button"
              onClick={onStart}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-white/8 border border-white/10 text-white font-medium text-sm hover:bg-white/14 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart Run</span>
            </button>
            <button
              type="button"
              onClick={onCustomizeControls}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-white/8 border border-white/10 text-slate-100 font-medium text-xs hover:bg-white/14 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: telemetry.accentHex }} />
              <span>Customize Controls</span>
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onCycleCamera}
                className="h-10 flex items-center justify-center gap-2 rounded-lg bg-white/6 border border-white/10 text-slate-200 text-xs font-medium hover:bg-white/12 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Cam: {telemetry.cameraMode}</span>
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                className="h-10 flex items-center justify-center gap-2 rounded-lg bg-white/6 border border-white/10 text-slate-200 text-xs font-medium hover:bg-white/12 transition-colors cursor-pointer"
              >
                {telemetry.isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio On</span>
                  </>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer mt-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Title</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (telemetry.status === 'GAMEOVER') {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#03050a]/76 p-6">
        <div className="w-full max-w-md bg-[#090c12] border border-white/12 rounded-xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium" style={{ color: telemetry.accentHex }}>
              {telemetry.sectorLabel} · {telemetry.weatherLabel}
            </span>
            {telemetry.isNewRecord && (
              <span className="text-xs font-semibold text-amber-300">New Best Record</span>
            )}
          </div>
          <h2 className="font-display text-3xl font-bold text-white mb-5">Run Terminated</h2>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 border border-white/8 rounded-lg p-3.5">
              <div className="text-xs text-slate-400 mb-1">Final Score</div>
              <div className="font-mono-tabular text-2xl font-bold text-white">
                {telemetry.score.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-lg p-3.5">
              <div className="text-xs text-slate-400 mb-1">Distance</div>
              <div className="font-mono-tabular text-2xl font-bold text-white">
                {telemetry.distance.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">m</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-lg p-3.5">
              <div className="text-xs text-slate-400 mb-1">Peak Speed</div>
              <div className="font-mono-tabular text-lg font-semibold text-slate-100">
                {telemetry.peakSpeedKmh} <span className="text-xs text-slate-400">km/h</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-lg p-3.5">
              <div className="text-xs text-slate-400 mb-1">Near Misses</div>
              <div className="font-mono-tabular text-lg font-semibold text-slate-100">
                {telemetry.nearMissCount}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 mb-5 font-mono-tabular">
            <span>All-Time Best: {telemetry.bestScore.toLocaleString()}</span>
            <span>Best Distance: {telemetry.bestDistance.toLocaleString()} m</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onStart}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-[#00e5ff] text-slate-950 font-semibold text-sm hover:bg-[#5ef0ff] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Drive Again</span>
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="h-11 px-5 flex items-center justify-center gap-2 rounded-lg bg-white/8 border border-white/10 text-slate-200 font-medium text-sm hover:bg-white/14 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Title</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
