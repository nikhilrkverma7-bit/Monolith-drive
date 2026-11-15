import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyState, loadBestStats, SECTORS, TelemetrySnapshot } from './game/constants';
import { MonolithEngine } from './game/MonolithEngine';
import { GameHud } from './components/GameHud';
import { GameOverlays } from './components/GameOverlays';

function createInitialTelemetry(): TelemetrySnapshot {
  const best = loadBestStats();
  return {
    status: 'TITLE',
    score: 0,
    bestScore: best.bestScore,
    bestDistance: best.bestDistance,
    distance: 0,
    speedKmh: 137,
    peakSpeedKmh: 137,
    nitro: 100,
    isBoosting: false,
    combo: 1,
    nearMissCount: 0,
    sectorIndex: 0,
    sectorLabel: SECTORS[0].label,
    accentHex: SECTORS[0].accentHex,
    cameraMode: 'CHASE',
    isMuted: false,
    isNewRecord: false,
    nearMissEventId: 0,
    nearMissBonus: 0,
    sectorEventId: 0,
  };
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MonolithEngine | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(createInitialTelemetry);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new MonolithEngine(
      mountEl,
      (snapshot) => {
        setTelemetry(snapshot);
      },
      (lost) => {
        setContextLost(lost);
      }
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleReturnTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleCycleCamera = useCallback(() => {
    engineRef.current?.cycleCamera();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleTouchControl = useCallback((control: keyof KeyState, active: boolean) => {
    engineRef.current?.setTouchControl(control, active);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#03050a]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Active Gameplay HUD */}
      {telemetry.status === 'PLAYING' && !contextLost && (
        <GameHud
          telemetry={telemetry}
          onToggleMute={handleToggleMute}
          onCycleCamera={handleCycleCamera}
          onPause={handlePause}
          onTouchControl={handleTouchControl}
        />
      )}

      {/* Title, Pause, Game Over & Context Loss Overlays */}
      <GameOverlays
        telemetry={telemetry}
        contextLost={contextLost}
        onStart={handleStart}
        onResume={handleResume}
        onReturnTitle={handleReturnTitle}
        onCycleCamera={handleCycleCamera}
        onToggleMute={handleToggleMute}
      />
    </main>
  );
}
