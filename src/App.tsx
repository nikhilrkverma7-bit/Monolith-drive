import { useCallback, useEffect, useRef, useState } from 'react';
import { loadBestStats, SECTORS, TelemetrySnapshot } from './game/constants';
import {
  loadControlsLayout,
  saveControlsLayout,
  TouchControlsLayout,
} from './game/controlsLayout';
import { MonolithEngine } from './game/MonolithEngine';
import { GameHud } from './components/GameHud';
import { GameOverlays } from './components/GameOverlays';
import { ControlsEditor } from './components/ControlsEditor';

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
    weatherLabel: SECTORS[0].weather.label,
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
  const [controlsLayout, setControlsLayout] = useState<TouchControlsLayout>(() =>
    loadControlsLayout()
  );
  const [isEditingControls, setIsEditingControls] = useState(false);

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

  // Automatically close controls editor if game leaves PAUSED state (e.g. via Esc)
  useEffect(() => {
    if (telemetry.status !== 'PAUSED' && isEditingControls) {
      setIsEditingControls(false);
    }
  }, [telemetry.status, isEditingControls]);

  const handleStart = useCallback(() => {
    setIsEditingControls(false);
    engineRef.current?.startGame();
  }, []);

  const handleResume = useCallback(() => {
    setIsEditingControls(false);
    engineRef.current?.resumeGame();
  }, []);

  const handleReturnTitle = useCallback(() => {
    setIsEditingControls(false);
    engineRef.current?.returnToTitle();
  }, []);

  const handleCycleCamera = useCallback(() => {
    engineRef.current?.cycleCamera();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleVirtualKey = useCallback((code: string, pressed: boolean) => {
    engineRef.current?.dispatchVirtualKey(code, pressed);
  }, []);

  const handleCustomizeControls = useCallback(() => {
    setIsEditingControls(true);
  }, []);

  const handleSaveControlsLayout = useCallback((nextLayout: TouchControlsLayout) => {
    setControlsLayout(nextLayout);
    saveControlsLayout(nextLayout);
    setIsEditingControls(false);
  }, []);

  const handleCancelControlsEdit = useCallback(() => {
    setIsEditingControls(false);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#03050a] touch-none select-none">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Active Gameplay HUD */}
      {telemetry.status === 'PLAYING' && !contextLost && (
        <GameHud
          telemetry={telemetry}
          controlsLayout={controlsLayout}
          onVirtualKey={handleVirtualKey}
        />
      )}

      {/* Live Drag-and-Drop Controls Layout Editor */}
      {telemetry.status === 'PAUSED' && isEditingControls && !contextLost && (
        <ControlsEditor
          initialLayout={controlsLayout}
          accentHex={telemetry.accentHex}
          onSave={handleSaveControlsLayout}
          onCancel={handleCancelControlsEdit}
        />
      )}

      {/* Title, Pause, Game Over & Context Loss Overlays */}
      <GameOverlays
        telemetry={telemetry}
        contextLost={contextLost}
        isEditingControls={isEditingControls}
        onStart={handleStart}
        onResume={handleResume}
        onReturnTitle={handleReturnTitle}
        onCycleCamera={handleCycleCamera}
        onToggleMute={handleToggleMute}
        onCustomizeControls={handleCustomizeControls}
      />
    </main>
  );
}
