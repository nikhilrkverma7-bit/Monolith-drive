export type CameraMode = 'CHASE' | 'BUMPER' | 'HOOD';
export type GameStatus = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface SectorPalette {
  id: string;
  label: string;
  skyTop: number;
  skyHorizon: number;
  fog: number;
  accent: number;
  accentHex: string;
  accentSecondary: number;
  roadTint: number;
  monolith: number;
  sunColor: number;
}

export interface KeyState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  boost: boolean;
}

export interface TelemetrySnapshot {
  status: GameStatus;
  score: number;
  bestScore: number;
  bestDistance: number;
  distance: number;
  speedKmh: number;
  peakSpeedKmh: number;
  nitro: number;
  isBoosting: boolean;
  combo: number;
  nearMissCount: number;
  sectorIndex: number;
  sectorLabel: string;
  accentHex: string;
  cameraMode: CameraMode;
  isMuted: boolean;
  isNewRecord: boolean;
  nearMissEventId: number;
  nearMissBonus: number;
  sectorEventId: number;
}

export const CONFIG = {
  ROAD_WIDTH: 15,
  LANE_COUNT: 4,
  LANE_WIDTH: 3.4,
  SEGMENT_LENGTH: 420,
  BASE_MIN_SPEED: 38,
  BASE_MAX_SPEED: 74,
  NITRO_EXTRA_SPEED: 38,
  PLAYER_Z: 0,
  CAMERA_MODES: ['CHASE', 'BUMPER', 'HOOD'] as const,
  BEST_SCORE_KEY: 'monolith_drive_best_score_v1',
  BEST_DIST_KEY: 'monolith_drive_best_dist_v1',
  KMH_MULTIPLIER: 3.6,
};

export const LANE_CENTERS = [-5.1, -1.7, 1.7, 5.1];

export const SECTORS: SectorPalette[] = [
  {
    id: 'obsidian',
    label: 'Sector 01 · Obsidian',
    skyTop: 0x03050a,
    skyHorizon: 0x0b1626,
    fog: 0x09111e,
    accent: 0x00e5ff,
    accentHex: '#00e5ff',
    accentSecondary: 0x0077ff,
    roadTint: 0x161922,
    monolith: 0x0b0d13,
    sunColor: 0x66d9ff,
  },
  {
    id: 'solar-dusk',
    label: 'Sector 02 · Solar Dusk',
    skyTop: 0x110714,
    skyHorizon: 0x3b1526,
    fog: 0x260e1b,
    accent: 0xff9e00,
    accentHex: '#ff9e00',
    accentSecondary: 0xff3d00,
    roadTint: 0x1e161d,
    monolith: 0x130b12,
    sunColor: 0xffb74d,
  },
  {
    id: 'arctic-cobalt',
    label: 'Sector 03 · Arctic Cobalt',
    skyTop: 0x06101e,
    skyHorizon: 0x1b3452,
    fog: 0x13263d,
    accent: 0x7dd3fc,
    accentHex: '#7dd3fc',
    accentSecondary: 0x38bdf8,
    roadTint: 0x19212c,
    monolith: 0x0e1520,
    sunColor: 0xbae6fd,
  },
  {
    id: 'crimson-midnight',
    label: 'Sector 04 · Crimson Midnight',
    skyTop: 0x0d0307,
    skyHorizon: 0x330a18,
    fog: 0x210710,
    accent: 0xff2a5f,
    accentHex: '#ff2a5f',
    accentSecondary: 0xd90429,
    roadTint: 0x1c1418,
    monolith: 0x12090d,
    sunColor: 0xff6b8b,
  },
];

export function loadBestStats(): { bestScore: number; bestDistance: number } {
  try {
    const rawScore = window.localStorage.getItem(CONFIG.BEST_SCORE_KEY);
    const rawDist = window.localStorage.getItem(CONFIG.BEST_DIST_KEY);
    return {
      bestScore: rawScore ? Math.max(0, parseInt(rawScore, 10) || 0) : 0,
      bestDistance: rawDist ? Math.max(0, parseInt(rawDist, 10) || 0) : 0,
    };
  } catch {
    return { bestScore: 0, bestDistance: 0 };
  }
}

export function saveBestStats(score: number, distance: number): void {
  try {
    window.localStorage.setItem(CONFIG.BEST_SCORE_KEY, String(Math.floor(score)));
    window.localStorage.setItem(CONFIG.BEST_DIST_KEY, String(Math.floor(distance)));
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}
