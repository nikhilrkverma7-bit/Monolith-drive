export type CameraMode = 'CHASE' | 'BUMPER' | 'HOOD';
export type GameStatus = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
export type WeatherKind = 'RAIN' | 'HAZE' | 'SNOW' | 'STORM';

export interface SectorWeatherProfile {
  kind: WeatherKind;
  label: string;
  fogDensity: number;
  rainOpacity: number;
  rainSpeed: number;
  windX: number;
  flurryOpacity: number;
  flurrySize: number;
  mistOpacity: number;
  roadRoughness: number;
  roadMetalness: number;
  precipColor: number;
  mistColor: number;
  sprayIntensity: number;
}

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
  weather: SectorWeatherProfile;
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
  weatherLabel: string;
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
    weather: {
      kind: 'RAIN',
      label: 'Light Rain',
      fogDensity: 0.0058,
      rainOpacity: 0.38,
      rainSpeed: 28,
      windX: -2.2,
      flurryOpacity: 0.0,
      flurrySize: 0.16,
      mistOpacity: 0.12,
      roadRoughness: 0.30,
      roadMetalness: 0.36,
      precipColor: 0xa5e8ff,
      mistColor: 0x2c4b6e,
      sprayIntensity: 0.5,
    },
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
    weather: {
      kind: 'HAZE',
      label: 'Amber Haze',
      fogDensity: 0.0079,
      rainOpacity: 0.0,
      rainSpeed: 12,
      windX: 3.8,
      flurryOpacity: 0.55,
      flurrySize: 0.18,
      mistOpacity: 0.24,
      roadRoughness: 0.48,
      roadMetalness: 0.22,
      precipColor: 0xffc875,
      mistColor: 0x6e3138,
      sprayIntensity: 0.0,
    },
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
    weather: {
      kind: 'SNOW',
      label: 'Ice Flurries',
      fogDensity: 0.0092,
      rainOpacity: 0.08,
      rainSpeed: 14,
      windX: -5.4,
      flurryOpacity: 0.78,
      flurrySize: 0.26,
      mistOpacity: 0.28,
      roadRoughness: 0.22,
      roadMetalness: 0.44,
      precipColor: 0xe0f2fe,
      mistColor: 0x3a648c,
      sprayIntensity: 0.25,
    },
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
    weather: {
      kind: 'STORM',
      label: 'Storm Rain',
      fogDensity: 0.0085,
      rainOpacity: 0.72,
      rainSpeed: 40,
      windX: 4.5,
      flurryOpacity: 0.35,
      flurrySize: 0.16,
      mistOpacity: 0.22,
      roadRoughness: 0.18,
      roadMetalness: 0.52,
      precipColor: 0xff9eb5,
      mistColor: 0x52182b,
      sprayIntensity: 1.0,
    },
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
