export type TouchControlId = 'left' | 'right' | 'brake' | 'throttle' | 'nitro';
export type ControlShape = 'rounded-square' | 'circle' | 'tall-pedal';

export interface TouchButtonConfig {
  id: TouchControlId;
  keyCode: string;
  displaySymbol: string;
  label: string;
  subLabel?: string;
  /** Normalized viewport center X (0..1) */
  xPct: number;
  /** Normalized viewport center Y (0..1) */
  yPct: number;
  /** Multiplier from 0.7 to 2.0 */
  scale: number;
  shape: ControlShape;
}

export type TouchControlsLayout = Record<TouchControlId, TouchButtonConfig>;

export const TOUCH_CONTROL_ORDER: TouchControlId[] = [
  'left',
  'right',
  'brake',
  'throttle',
  'nitro',
];

export const SHAPE_BASE_DIMENSIONS: Record<
  ControlShape,
  { width: number; height: number; borderRadius: string; label: string }
> = {
  'rounded-square': {
    width: 78,
    height: 78,
    borderRadius: '14px',
    label: 'Rounded Square',
  },
  circle: {
    width: 78,
    height: 78,
    borderRadius: '9999px',
    label: 'Circle',
  },
  'tall-pedal': {
    width: 72,
    height: 104,
    borderRadius: '14px',
    label: 'Tall Pedal',
  },
};

export const CONTROLS_LAYOUT_STORAGE_KEY = 'monolith_drive_touch_layout_v1';

export function getButtonPixelSize(config: Pick<TouchButtonConfig, 'shape' | 'scale'>): {
  width: number;
  height: number;
  borderRadius: string;
} {
  const base = SHAPE_BASE_DIMENSIONS[config.shape];
  return {
    width: Math.round(base.width * config.scale),
    height: Math.round(base.height * config.scale),
    borderRadius: base.borderRadius,
  };
}

export function createDefaultControlsLayout(
  viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280,
  viewportH = typeof window !== 'undefined' ? window.innerHeight : 720
): TouchControlsLayout {
  const w = Math.max(320, viewportW);
  const h = Math.max(320, viewportH);

  const edgePad = w < 640 ? 14 : 22;
  const bottomPad = h < 500 ? 14 : 22;
  const gap = w < 640 ? 10 : 14;

  // Base sizes at scale = 1.0 (30% larger default touch targets)
  const sqW = SHAPE_BASE_DIMENSIONS['rounded-square'].width;
  const sqH = SHAPE_BASE_DIMENSIONS['rounded-square'].height;
  const pedW = SHAPE_BASE_DIMENSIONS['tall-pedal'].width;
  const pedH = SHAPE_BASE_DIMENSIONS['tall-pedal'].height;

  // Bottom-left: < and >
  const leftCx = edgePad + sqW / 2;
  const rightCx = edgePad + sqW + gap + sqW / 2;
  const steerCy = h - bottomPad - sqH / 2;

  // Bottom-right: S (Brake), W (Throttle), SPACE (Nitro)
  const nitroCx = w - edgePad - pedW / 2;
  const throttleCx = w - edgePad - pedW - gap - pedW / 2;
  const pedalCy = h - bottomPad - pedH / 2;

  // On very narrow portrait screens (< 500px), stack Brake neatly above Nitro/Throttle
  // so left & right clusters never collide horizontally.
  const isNarrowPortrait = w < 500;
  const brakeCx = isNarrowPortrait
    ? nitroCx
    : w - edgePad - pedW * 2 - gap * 2 - sqW / 2;
  const brakeCy = isNarrowPortrait
    ? h - bottomPad - pedH - gap - sqH / 2
    : h - bottomPad - sqH / 2;

  return {
    left: {
      id: 'left',
      keyCode: 'ArrowLeft',
      displaySymbol: '<',
      label: 'Steer Left (<)',
      xPct: leftCx / w,
      yPct: steerCy / h,
      scale: 1.0,
      shape: 'rounded-square',
    },
    right: {
      id: 'right',
      keyCode: 'ArrowRight',
      displaySymbol: '>',
      label: 'Steer Right (>)',
      xPct: rightCx / w,
      yPct: steerCy / h,
      scale: 1.0,
      shape: 'rounded-square',
    },
    brake: {
      id: 'brake',
      keyCode: 'KeyS',
      displaySymbol: 'S',
      label: 'Brake (S)',
      subLabel: 'S',
      xPct: brakeCx / w,
      yPct: brakeCy / h,
      scale: 1.0,
      shape: 'rounded-square',
    },
    throttle: {
      id: 'throttle',
      keyCode: 'KeyW',
      displaySymbol: 'W',
      label: 'Throttle (W)',
      subLabel: 'W',
      xPct: throttleCx / w,
      yPct: pedalCy / h,
      scale: 1.0,
      shape: 'tall-pedal',
    },
    nitro: {
      id: 'nitro',
      keyCode: 'Space',
      displaySymbol: 'SPACE',
      label: 'Nitro (SPACE)',
      subLabel: 'SPACE',
      xPct: nitroCx / w,
      yPct: pedalCy / h,
      scale: 1.0,
      shape: 'tall-pedal',
    },
  };
}

export function clampButtonCenter(
  cx: number,
  cy: number,
  width: number,
  height: number,
  viewportW: number,
  viewportH: number
): { cx: number; cy: number } {
  const pad = 8;
  const minX = width / 2 + pad;
  const maxX = Math.max(minX, viewportW - width / 2 - pad);
  const minY = height / 2 + pad;
  const maxY = Math.max(minY, viewportH - height / 2 - pad);
  return {
    cx: Math.max(minX, Math.min(maxX, cx)),
    cy: Math.max(minY, Math.min(maxY, cy)),
  };
}

export function loadControlsLayout(): TouchControlsLayout {
  const fallback = createDefaultControlsLayout();
  try {
    const raw = window.localStorage.getItem(CONTROLS_LAYOUT_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<TouchControlId, Partial<TouchButtonConfig>>>;
    const result = { ...fallback };
    for (const id of TOUCH_CONTROL_ORDER) {
      const saved = parsed[id];
      if (!saved) continue;
      const base = fallback[id];
      const shape: ControlShape =
        saved.shape === 'rounded-square' ||
        saved.shape === 'circle' ||
        saved.shape === 'tall-pedal'
          ? saved.shape
          : base.shape;
      const scale =
        typeof saved.scale === 'number' && Number.isFinite(saved.scale)
          ? Math.max(0.7, Math.min(2.0, saved.scale))
          : base.scale;
      const xPct =
        typeof saved.xPct === 'number' && Number.isFinite(saved.xPct)
          ? Math.max(0, Math.min(1, saved.xPct))
          : base.xPct;
      const yPct =
        typeof saved.yPct === 'number' && Number.isFinite(saved.yPct)
          ? Math.max(0, Math.min(1, saved.yPct))
          : base.yPct;

      result[id] = {
        ...base,
        shape,
        scale,
        xPct,
        yPct,
      };
    }
    return result;
  } catch {
    return fallback;
  }
}

export function saveControlsLayout(layout: TouchControlsLayout): void {
  try {
    window.localStorage.setItem(CONTROLS_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearSavedControlsLayout(): void {
  try {
    window.localStorage.removeItem(CONTROLS_LAYOUT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
