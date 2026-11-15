import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Flame,
  RotateCcw,
  Check,
  X,
  ArrowUpDown,
} from 'lucide-react';
import {
  clampButtonCenter,
  ControlPreferences,
  ControlShape,
  createDefaultControlsLayout,
  DEFAULT_CONTROL_PREFS,
  getButtonPixelSize,
  SHAPE_BASE_DIMENSIONS,
  TOUCH_CONTROL_ORDER,
  TouchButtonConfig,
  TouchControlId,
  TouchControlsLayout,
} from '../game/controlsLayout';

interface ControlsEditorProps {
  initialLayout: TouchControlsLayout;
  initialPrefs: ControlPreferences;
  accentHex: string;
  onSave: (layout: TouchControlsLayout, prefs: ControlPreferences) => void;
  onCancel: () => void;
}

const SHAPES: ControlShape[] = ['rounded-square', 'circle', 'tall-pedal'];

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

interface PanelButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onAction: () => void;
}

const PanelButton: React.FC<PanelButtonProps> = ({
  onAction,
  children,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  className,
  ...rest
}) => {
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointerActionAtRef = useRef(0);

  return (
    <button
      type="button"
      {...rest}
      className={`touch-manipulation select-none ${className ?? ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          lastPointerActionAtRef.current = 0;
        }
        onKeyDown?.(e);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        activePointerIdRef.current = e.pointerId;
        onPointerDown?.(e);
      }}
      onPointerCancel={(e) => {
        e.stopPropagation();
        if (activePointerIdRef.current === e.pointerId) {
          activePointerIdRef.current = null;
        }
        onPointerCancel?.(e);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onPointerUp?.(e);
        if (activePointerIdRef.current !== e.pointerId) return;
        activePointerIdRef.current = null;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        if (!inside) return;

        lastPointerActionAtRef.current = performance.now();
        onAction();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (performance.now() - lastPointerActionAtRef.current < 450) {
          lastPointerActionAtRef.current = 0;
          return;
        }
        onAction();
      }}
    >
      {children}
    </button>
  );
};

export const ControlsEditor: React.FC<ControlsEditorProps> = ({
  initialLayout,
  initialPrefs,
  accentHex,
  onSave,
  onCancel,
}) => {
  const [draft, setDraft] = useState<TouchControlsLayout>(() => ({ ...initialLayout }));
  const [draftPrefs, setDraftPrefs] = useState<ControlPreferences>(() => ({ ...initialPrefs }));
  const [selectedId, setSelectedId] = useState<TouchControlId>('left');
  const [dockTop, setDockTop] = useState(true);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  const dragStageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    id: TouchControlId;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<TouchControlId | null>(null);

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Prevent touch scrolling strictly on the drag stage so the floating panel buttons receive normal touch/click events
  useEffect(() => {
    const el = dragStageRef.current;
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

  const selectedBtn = draft[selectedId];

  const handleButtonPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    btn: TouchButtonConfig
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(btn.id);

    const size = getButtonPixelSize(btn);
    const clamped = clampButtonCenter(
      btn.xPct * viewport.w,
      btn.yPct * viewport.h,
      size.width,
      size.height,
      viewport.w,
      viewport.h
    );

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture issues
    }

    dragStateRef.current = {
      id: btn.id,
      pointerId: e.pointerId,
      offsetX: e.clientX - clamped.cx,
      offsetY: e.clientY - clamped.cy,
    };
    setDraggingId(btn.id);
  };

  const handleButtonPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();

    setDraft((prev) => {
      const current = prev[drag.id];
      const size = getButtonPixelSize(current);
      const rawCx = e.clientX - drag.offsetX;
      const rawCy = e.clientY - drag.offsetY;
      const clamped = clampButtonCenter(
        rawCx,
        rawCy,
        size.width,
        size.height,
        viewport.w,
        viewport.h
      );

      return {
        ...prev,
        [drag.id]: {
          ...current,
          xPct: clamped.cx / viewport.w,
          yPct: clamped.cy / viewport.h,
        },
      };
    });
  };

  const handleButtonPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragStateRef.current = null;
    setDraggingId(null);
  };

  const handleScaleChange = (newScale: number) => {
    const clampedScale = Math.max(0.7, Math.min(2.0, Number(newScale.toFixed(2))));
    setDraft((prev) => {
      const current = prev[selectedId];
      const nextBtn: TouchButtonConfig = { ...current, scale: clampedScale };
      const size = getButtonPixelSize(nextBtn);
      const clampedPos = clampButtonCenter(
        nextBtn.xPct * viewport.w,
        nextBtn.yPct * viewport.h,
        size.width,
        size.height,
        viewport.w,
        viewport.h
      );
      return {
        ...prev,
        [selectedId]: {
          ...nextBtn,
          xPct: clampedPos.cx / viewport.w,
          yPct: clampedPos.cy / viewport.h,
        },
      };
    });
  };

  const handleShapeChange = (shape: ControlShape) => {
    setDraft((prev) => {
      const current = prev[selectedId];
      const nextBtn: TouchButtonConfig = { ...current, shape };
      const size = getButtonPixelSize(nextBtn);
      const clampedPos = clampButtonCenter(
        nextBtn.xPct * viewport.w,
        nextBtn.yPct * viewport.h,
        size.width,
        size.height,
        viewport.w,
        viewport.h
      );
      return {
        ...prev,
        [selectedId]: {
          ...nextBtn,
          xPct: clampedPos.cx / viewport.w,
          yPct: clampedPos.cy / viewport.h,
        },
      };
    });
  };

  const handleOpacityChange = (newOpacity: number) => {
    const clampedOpacity = Math.max(0.2, Math.min(1.0, Number(newOpacity.toFixed(2))));
    setDraftPrefs((prev) => ({ ...prev, opacity: clampedOpacity }));
  };

  const handleToggleAutoThrottle = () => {
    setDraftPrefs((prev) => ({ ...prev, autoThrottle: !prev.autoThrottle }));
  };

  const handleResetDefault = () => {
    setDraft(createDefaultControlsLayout(viewport.w, viewport.h));
    setDraftPrefs({ ...DEFAULT_CONTROL_PREFS });
  };

  return (
    <>
      {/* Full-Screen Drag Stage Layer (below floating inspector panel) */}
      <div
        ref={dragStageRef}
        className="fixed inset-0 z-30 select-none touch-none overflow-hidden"
      >
        {/* Subtle Alignment Grid over Paused Game Scene */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: 'rgba(3, 5, 10, 0.42)',
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Draggable Touch Buttons */}
        {TOUCH_CONTROL_ORDER.map((id) => {
          const btn = draft[id];
          const size = getButtonPixelSize(btn);
          const clamped = clampButtonCenter(
            btn.xPct * viewport.w,
            btn.yPct * viewport.h,
            size.width,
            size.height,
            viewport.w,
            viewport.h
          );
          const isSelected = selectedId === id;
          const isDragging = draggingId === id;

          return (
            <button
              key={id}
              type="button"
              aria-label={`Drag or select ${btn.label}`}
              onPointerDown={(e) => handleButtonPointerDown(e, btn)}
              onPointerMove={handleButtonPointerMove}
              onPointerUp={handleButtonPointerUp}
              onPointerCancel={handleButtonPointerUp}
              onLostPointerCapture={handleButtonPointerUp}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                position: 'absolute',
                left: `${Math.round(clamped.cx - size.width / 2)}px`,
                top: `${Math.round(clamped.cy - size.height / 2)}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                borderRadius: size.borderRadius,
                opacity: isDragging ? Math.min(1, draftPrefs.opacity + 0.25) : draftPrefs.opacity,
                borderColor: isSelected ? accentHex : 'rgba(255, 255, 255, 0.25)',
                boxShadow: isSelected ? `0 0 0 2px ${accentHex}44` : undefined,
              }}
              className={`touch-none select-none flex flex-col items-center justify-center border-2 transition-colors ${
                isDragging
                  ? 'bg-white/25 text-white cursor-grabbing z-20'
                  : isSelected
                    ? 'bg-[#080a10]/80 text-white cursor-grab z-10'
                    : 'bg-[#080a10]/58 text-slate-200 hover:bg-[#080a10]/75 cursor-grab'
              }`}
            >
              {renderControlIcon(btn.id, btn.scale, accentHex)}
              {btn.id === 'throttle' && draftPrefs.autoThrottle ? (
                <span
                  className="font-mono-tabular font-semibold leading-none mt-1"
                  style={{
                    color: accentHex,
                    fontSize: `${Math.round(10 * Math.min(1.4, Math.max(0.85, btn.scale)))}px`,
                  }}
                >
                  AUTO
                </span>
              ) : (
                btn.subLabel && (
                  <span
                    className="font-mono-tabular font-semibold text-slate-200 leading-none mt-1"
                    style={{
                      fontSize: `${Math.round(11 * Math.min(1.4, Math.max(0.85, btn.scale)))}px`,
                    }}
                  >
                    {btn.subLabel}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Layout Inspector Panel (Higher z-index & isolated from drag stage) */}
      <div
        role="dialog"
        aria-label="Customize Controls"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`fixed left-1/2 -translate-x-1/2 z-50 w-[min(94vw,540px)] bg-[#090c12]/95 border border-white/15 rounded-xl p-3.5 sm:p-4 shadow-2xl touch-manipulation select-none ${
          dockTop ? 'top-3 sm:top-5' : 'bottom-3 sm:bottom-5'
        }`}
      >
        {/* Header: Title, Dock Position Flip, Selected Label */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-xs font-semibold text-white">Customize Controls</div>
            <div className="text-[11px] text-slate-400">
              Drag buttons anywhere · Tap to adjust size and shape
            </div>
          </div>
          <PanelButton
            onAction={() => setDockTop((v) => !v)}
            title={dockTop ? 'Move toolbar to bottom' : 'Move toolbar to top'}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg bg-white/8 border border-white/10 text-[11px] font-medium text-slate-200 hover:bg-white/14 active:bg-white/20 cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{dockTop ? 'Move Bar Down' : 'Move Bar Up'}</span>
          </PanelButton>
        </div>

        {/* Quick Button Selector Row */}
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {TOUCH_CONTROL_ORDER.map((id) => {
            const b = draft[id];
            const active = selectedId === id;
            return (
              <PanelButton
                key={id}
                onAction={() => setSelectedId(id)}
                style={active ? { borderColor: accentHex, color: accentHex } : undefined}
                className={`h-8 rounded-lg border text-xs font-mono-tabular font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-white/12 text-white'
                    : 'bg-white/4 border-white/10 text-slate-300 hover:bg-white/10 active:bg-white/18'
                }`}
              >
                {b.displaySymbol}
              </PanelButton>
            );
          })}
        </div>

        {/* Selected Button Controls: Scale Slider (0.7x - 2.0x) + Shape Toggle */}
        <div className="bg-white/4 border border-white/8 rounded-lg p-3 mb-2.5 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="control-scale-slider"
              className="text-xs font-medium text-slate-200 whitespace-nowrap"
            >
              {selectedBtn.label} Size
            </label>
            <div className="flex items-center gap-2.5 flex-1 max-w-[260px]">
              <input
                id="control-scale-slider"
                type="range"
                min={0.7}
                max={2.0}
                step={0.05}
                value={selectedBtn.scale}
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-full accent-cyan-400 cursor-pointer touch-pan-x"
              />
              <span className="font-mono-tabular text-xs font-semibold text-white w-11 text-right">
                {selectedBtn.scale.toFixed(2)}x
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-200">Shape</span>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#05070b] border border-white/10">
              {SHAPES.map((shape) => {
                const active = selectedBtn.shape === shape;
                return (
                  <PanelButton
                    key={shape}
                    onAction={() => handleShapeChange(shape)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-white/16 text-white'
                        : 'text-slate-400 hover:text-slate-200 active:bg-white/10'
                    }`}
                  >
                    {SHAPE_BASE_DIMENSIONS[shape].label}
                  </PanelButton>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global Touch Preferences: Opacity Slider (20% - 100%) + Auto-Throttle Toggle */}
        <div className="bg-white/4 border border-white/8 rounded-lg p-3 mb-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="control-opacity-slider"
              className="text-xs font-medium text-slate-200 whitespace-nowrap"
            >
              Opacity
            </label>
            <div className="flex items-center gap-2.5 flex-1 max-w-[260px]">
              <input
                id="control-opacity-slider"
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={draftPrefs.opacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-full accent-cyan-400 cursor-pointer touch-pan-x"
              />
              <span className="font-mono-tabular text-xs font-semibold text-white w-11 text-right">
                {Math.round(draftPrefs.opacity * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-200">Auto-Throttle</div>
              <div className="text-[11px] text-slate-400">
                Cruise at full speed automatically unless braking
              </div>
            </div>
            <PanelButton
              role="switch"
              aria-checked={draftPrefs.autoThrottle}
              onAction={handleToggleAutoThrottle}
              className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                draftPrefs.autoThrottle
                  ? 'bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff]'
                  : 'bg-white/6 border-white/12 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-sm ${
                  draftPrefs.autoThrottle ? 'bg-[#00e5ff]' : 'bg-slate-500'
                }`}
              />
              <span>{draftPrefs.autoThrottle ? 'On' : 'Off'}</span>
            </PanelButton>
          </div>
        </div>

        {/* Action Row: Reset to Default | Cancel | Save */}
        <div className="flex items-center justify-between gap-2">
          <PanelButton
            onAction={handleResetDefault}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-white/6 border border-white/10 text-xs font-medium text-slate-200 hover:bg-white/12 active:bg-white/18 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </PanelButton>

          <div className="flex items-center gap-2">
            <PanelButton
              onAction={onCancel}
              className="h-9 px-3.5 flex items-center gap-1.5 rounded-lg bg-white/6 border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/12 active:bg-white/18 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </PanelButton>
            <PanelButton
              onAction={() => onSave(draft, draftPrefs)}
              className="h-9 px-4 flex items-center gap-1.5 rounded-lg bg-[#00e5ff] text-slate-950 text-xs font-semibold hover:bg-[#5ef0ff] active:bg-[#5ef0ff] transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </PanelButton>
          </div>
        </div>
      </div>
    </>
  );
};
