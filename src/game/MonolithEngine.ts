import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  CameraMode,
  CONFIG,
  GameStatus,
  KeyState,
  LANE_CENTERS,
  loadBestStats,
  saveBestStats,
  SECTORS,
  TelemetrySnapshot,
} from './constants';
import { SoundEngine } from './audio';
import {
  createAsphaltTextures,
  createSkyDomeShaderMaterial,
  createSoftShadowTexture,
  detectSoftwareWebGL,
} from './procedural';
import {
  buildHighwayEnvironment,
  buildPlayerSupercar,
  createObstacleMesh,
  createObstacleSharedMaterials,
  HighwayEnvironmentRig,
  ObstacleSharedMaterials,
  PlayerSupercarRig,
} from './models';

// Pre-allocated scratch math helpers (zero per-frame allocations)
const _targetSkyTop = new THREE.Color();
const _targetSkyHorizon = new THREE.Color();
const _targetFogColor = new THREE.Color();
const _targetAccentColor = new THREE.Color();
const _targetSunColor = new THREE.Color();
const _targetMonolithColor = new THREE.Color();
const _ribbonLeftPos = new THREE.Vector3();
const _ribbonRightPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

const TRAIL_POINTS = 26;
const AMBIENT_PARTICLE_COUNT = 120;
const SPARK_COUNT = 48;

interface LightRibbon {
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  mat: THREE.MeshBasicMaterial;
  history: THREE.Vector3[];
}

interface ActiveObstacle {
  mesh: THREE.Group;
  type: 'TRAFFIC' | 'SWEEPER';
  x: number;
  z: number;
  speed: number;
  halfW: number;
  halfD: number;
  patrolBaseX: number;
  patrolAmp: number;
  patrolPhase: number;
  patrolFreq: number;
  nearMissed: boolean;
}

interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export class MonolithEngine {
  private container: HTMLElement;
  private onTelemetry: (snapshot: TelemetrySnapshot) => void;
  private onContextLost?: (lost: boolean) => void;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;

  private skyMat: THREE.ShaderMaterial;
  private dirLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private asphaltTextures: { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  private shadowTexture: THREE.CanvasTexture;
  private envRig: HighwayEnvironmentRig;
  private playerRig: PlayerSupercarRig;
  private leftRibbon: LightRibbon;
  private rightRibbon: LightRibbon;

  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.PointsMaterial;
  private particleVelocities: Float32Array;

  private sparkGeo: THREE.BufferGeometry;
  private sparkMat: THREE.PointsMaterial;
  private sparks: SparkParticle[] = [];

  private obstaclePoolGroup = new THREE.Group();
  private obsMats: ObstacleSharedMaterials;
  private obstacles: ActiveObstacle[] = [];

  private sound = new SoundEngine();

  private status: GameStatus = 'TITLE';
  private score = 0;
  private bestScore = 0;
  private bestDistance = 0;
  private isNewRecord = false;
  private distance = 0;
  private speed = CONFIG.BASE_MIN_SPEED;
  private peakSpeedKmh = 0;
  private playerX = 0;
  private playerVx = 0;
  private nitro = 100;
  private isBoosting = false;
  private combo = 1;
  private comboTimer = 0;
  private nearMissCount = 0;
  private nearMissEventId = 0;
  private nearMissBonus = 0;
  private sectorIndex = 0;
  private sectorEventId = 0;
  private spawnTimer = 0.8;
  private shakeIntensity = 0;
  private scrapeCooldown = 0;
  private hitstopTimer = 0;
  private crashPending = false;
  private cameraModeIndex = 0;

  private activeKeyCodes = new Set<string>();
  private keys: KeyState = {
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  };
  private touches: KeyState = {
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  };

  private frameId = 0;
  private isTimeoutId = false;
  private disposed = false;
  private lastTime = performance.now();
  private lastHudEmit = 0;

  constructor(
    container: HTMLElement,
    onTelemetry: (snapshot: TelemetrySnapshot) => void,
    onContextLost?: (lost: boolean) => void
  ) {
    this.container = container;
    this.onTelemetry = onTelemetry;
    this.onContextLost = onContextLost;

    const best = loadBestStats();
    this.bestScore = best.bestScore;
    this.bestDistance = best.bestDistance;

    this.isSoftwareGl = detectSoftwareWebGL();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(SECTORS[0].fog, 0.0058);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 460);
    this.camera.position.set(0, 3.1, 7.6);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Studio Environment Reflection (RoomEnvironment on every device)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Post-processing on GPU devices only (skip multi-pass bottleneck on software WebGL)
    if (!this.isSoftwareGl) {
      try {
        const composer = new EffectComposer(this.renderer);
        composer.addPass(new RenderPass(this.scene, this.camera));
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.52,
          0.42,
          0.8
        );
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
        this.composer = composer;
        this.bloomPass = bloomPass;
      } catch {
        this.composer = null;
        this.bloomPass = null;
      }
    }

    // Sky Dome
    this.skyMat = createSkyDomeShaderMaterial();
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 20), this.skyMat);
    this.scene.add(skyDome);

    // Three-point + warm/cool contrast lighting
    const hemiLight = new THREE.HemisphereLight(0x90b4e8, 0x090a0f, 0.9);
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(SECTORS[0].sunColor, 1.35);
    this.dirLight.position.set(18, 34, -45);
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.DirectionalLight(SECTORS[0].accent, 0.9);
    this.rimLight.position.set(-22, 12, 28);
    this.scene.add(this.rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.asphaltTextures = createAsphaltTextures(maxAniso);
    this.shadowTexture = createSoftShadowTexture();

    this.envRig = buildHighwayEnvironment(this.scene, this.asphaltTextures);
    this.playerRig = buildPlayerSupercar(this.scene, this.shadowTexture);

    this.leftRibbon = this.createLightRibbon(0xff1e42);
    this.rightRibbon = this.createLightRibbon(0xff1e42);

    // Ambient speed particles
    const particlePositions = new Float32Array(AMBIENT_PARTICLE_COUNT * 3);
    this.particleVelocities = new Float32Array(AMBIENT_PARTICLE_COUNT);
    for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 34;
      particlePositions[i * 3 + 1] = 0.3 + Math.random() * 10;
      particlePositions[i * 3 + 2] = -Math.random() * 160;
      this.particleVelocities[i] = 0.85 + Math.random() * 0.4;
    }
    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    this.particleMat = new THREE.PointsMaterial({
      color: SECTORS[0].accent,
      size: 0.16,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.scene.add(new THREE.Points(this.particleGeo, this.particleMat));

    // Spark burst pool for scrapes, near-misses, and impacts
    const sparkPositions = new Float32Array(SPARK_COUNT * 3);
    for (let i = 0; i < SPARK_COUNT; i++) {
      sparkPositions[i * 3 + 1] = -50;
      this.sparks.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
      });
    }
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    this.sparkMat = new THREE.PointsMaterial({
      color: 0xffb74d,
      size: 0.24,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMat);
    sparkPoints.frustumCulled = false;
    this.scene.add(sparkPoints);

    this.obsMats = createObstacleSharedMaterials();
    this.scene.add(this.obstaclePoolGroup);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitTelemetry(true);
    this.scheduleNextFrame();
  }

  private createLightRibbon(colorHex: number): LightRibbon {
    const positions = new Float32Array(TRAIL_POINTS * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    const history: THREE.Vector3[] = [];
    for (let i = 0; i < TRAIL_POINTS; i++) {
      history.push(new THREE.Vector3(0, 0.68, 2.1 + i * 0.25));
    }
    return { mesh, geo, mat, history };
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    if (this.status === 'PLAYING') {
      this.pauseGame();
    }
    this.onContextLost?.(true);
  };

  private handleContextRestored = (): void => {
    this.onContextLost?.(false);
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  };

  private syncKeysFromCodes(): void {
    this.keys.left =
      this.activeKeyCodes.has('ArrowLeft') || this.activeKeyCodes.has('KeyA');
    this.keys.right =
      this.activeKeyCodes.has('ArrowRight') || this.activeKeyCodes.has('KeyD');
    this.keys.up =
      this.activeKeyCodes.has('ArrowUp') || this.activeKeyCodes.has('KeyW');
    this.keys.down =
      this.activeKeyCodes.has('ArrowDown') || this.activeKeyCodes.has('KeyS');
    this.keys.boost =
      this.activeKeyCodes.has('Space') ||
      this.activeKeyCodes.has('ShiftLeft') ||
      this.activeKeyCodes.has('ShiftRight');
  }

  private handleBlur = (): void => {
    this.activeKeyCodes.clear();
    this.syncKeysFromCodes();
    this.touches.left = false;
    this.touches.right = false;
    this.touches.up = false;
    this.touches.down = false;
    this.touches.boost = false;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;

    if (
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'Space'
    ) {
      if (e.cancelable) e.preventDefault();
    }

    const wasHeld = this.activeKeyCodes.has(code);
    this.activeKeyCodes.add(code);
    this.syncKeysFromCodes();

    if (!e.repeat && !wasHeld) {
      if (code === 'KeyC') {
        this.cycleCamera();
      } else if (code === 'KeyM') {
        this.toggleMute();
      } else if (code === 'Escape' || code === 'KeyP') {
        if (this.status === 'PLAYING') {
          this.pauseGame();
        } else if (this.status === 'PAUSED') {
          this.resumeGame();
        }
      } else if (code === 'Enter' || code === 'Space') {
        if (this.status === 'TITLE' || this.status === 'GAMEOVER') {
          this.startGame();
        }
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.activeKeyCodes.delete(e.code);
    this.syncKeysFromCodes();
  };

  public dispatchVirtualKey(code: string, pressed: boolean): void {
    const event = new KeyboardEvent(pressed ? 'keydown' : 'keyup', {
      code,
      bubbles: true,
      cancelable: true,
    });
    if (pressed) {
      this.handleKeyDown(event);
    } else {
      this.handleKeyUp(event);
    }
  }

  public setTouchControl(control: keyof KeyState, active: boolean): void {
    this.touches[control] = active;
  }

  public startGame(): void {
    this.sound.init();
    this.resetRunState();
    this.status = 'PLAYING';
    this.emitTelemetry(true);
  }

  public pauseGame(): void {
    if (this.status !== 'PLAYING') return;
    this.status = 'PAUSED';
    this.handleBlur();
    this.sound.updateEngine(0, false, false);
    this.emitTelemetry(true);
  }

  public resumeGame(): void {
    if (this.status !== 'PAUSED') return;
    this.sound.init();
    this.status = 'PLAYING';
    this.lastTime = performance.now();
    this.emitTelemetry(true);
  }

  public returnToTitle(): void {
    this.resetRunState();
    this.status = 'TITLE';
    this.sound.updateEngine(0, false, false);
    this.emitTelemetry(true);
  }

  public cycleCamera(): void {
    this.cameraModeIndex = (this.cameraModeIndex + 1) % CONFIG.CAMERA_MODES.length;
    this.emitTelemetry(true);
  }

  public toggleMute(): void {
    this.sound.init();
    this.sound.setMuted(!this.sound.isMuted());
    this.emitTelemetry(true);
  }

  private clearObstacles(): void {
    for (let i = 0; i < this.obstacles.length; i++) {
      this.obstaclePoolGroup.remove(this.obstacles[i].mesh);
    }
    this.obstacles.length = 0;
  }

  private resetRunState(): void {
    this.clearObstacles();
    this.score = 0;
    this.distance = 0;
    this.speed = CONFIG.BASE_MIN_SPEED;
    this.peakSpeedKmh = Math.round(CONFIG.BASE_MIN_SPEED * CONFIG.KMH_MULTIPLIER);
    this.playerX = 0;
    this.playerVx = 0;
    this.nitro = 100;
    this.isBoosting = false;
    this.combo = 1;
    this.comboTimer = 0;
    this.nearMissCount = 0;
    this.nearMissBonus = 0;
    this.isNewRecord = false;
    this.sectorIndex = 0;
    this.spawnTimer = 0.7;
    this.shakeIntensity = 0;
    this.scrapeCooldown = 0;
    this.hitstopTimer = 0;
    this.crashPending = false;

    this.playerRig.root.position.set(0, 0, CONFIG.PLAYER_Z);
    this.playerRig.carVisual.rotation.set(0, 0, 0);

    [this.leftRibbon, this.rightRibbon].forEach((r, idx) => {
      const xOff = idx === 0 ? -0.68 : 0.68;
      for (let i = 0; i < TRAIL_POINTS; i++) {
        r.history[i].set(xOff, 0.68, 2.1 + i * 0.2);
      }
    });

    const s0 = SECTORS[0];
    this.skyMat.uniforms.topColor.value.setHex(s0.skyTop);
    this.skyMat.uniforms.horizonColor.value.setHex(s0.skyHorizon);
    this.skyMat.uniforms.glowColor.value.setHex(s0.accent);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(s0.fog);
    }
    this.dirLight.color.setHex(s0.sunColor);
    this.rimLight.color.setHex(s0.accent);
    this.envRig.railEdgeMat.color.setHex(s0.accent);
    this.envRig.railEdgeMat.emissive.setHex(s0.accent);
    this.envRig.gantryLightStripMat.color.setHex(s0.accent);
    this.envRig.gantryLightStripMat.emissive.setHex(s0.accent);
    this.envRig.monolithSlitMat.color.setHex(s0.accent);
    this.envRig.monolithSlitMat.emissive.setHex(s0.accent);
    this.envRig.monolithMat.color.setHex(s0.monolith);
    this.particleMat.color.setHex(s0.accent);
    this.playerRig.caliperMat.color.setHex(s0.accent);
    this.playerRig.caliperMat.emissive.setHex(s0.accent);
    for (let i = 0; i < this.envRig.gantries.length; i++) {
      this.envRig.gantries[i].poolMat.color.setHex(s0.accent);
    }
  }

  private spawnSparkBurst(x: number, y: number, z: number, count: number, spread = 8): void {
    let spawned = 0;
    for (let i = 0; i < this.sparks.length && spawned < count; i++) {
      const s = this.sparks[i];
      if (!s.active) {
        s.active = true;
        s.x = x + (Math.random() - 0.5) * 0.5;
        s.y = y + Math.random() * 0.4;
        s.z = z + (Math.random() - 0.5) * 0.8;
        s.vx = (Math.random() - 0.5) * spread;
        s.vy = 2.5 + Math.random() * 5.5;
        s.vz = 4 + Math.random() * 14;
        s.life = 0;
        s.maxLife = 0.28 + Math.random() * 0.25;
        spawned++;
      }
    }
  }

  private updateSparks(dt: number): void {
    const arr = this.sparkGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (!s.active) {
        arr[i * 3 + 1] = -50;
        continue;
      }
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        arr[i * 3 + 1] = -50;
        continue;
      }
      s.vy -= 18 * dt;
      s.x += s.vx * dt;
      s.y = Math.max(0.05, s.y + s.vy * dt);
      s.z += s.vz * dt;

      arr[i * 3] = s.x;
      arr[i * 3 + 1] = s.y;
      arr[i * 3 + 2] = s.z;
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  private spawnWave(): void {
    // Allow at most 1–3 obstacles per wave so at least 1 lane always remains clear
    const difficulty = Math.min(1, this.distance / 3200);
    const maxObstaclesInWave = difficulty > 0.55 ? 3 : difficulty > 0.18 ? 2 : 1;
    const count =
      maxObstaclesInWave === 1
        ? 1
        : Math.random() < 0.35 + difficulty * 0.4
          ? maxObstaclesInWave
          : 1;

    // Shuffle lane indices
    const lanes = [0, 1, 2, 3];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = lanes[i];
      lanes[i] = lanes[j];
      lanes[j] = tmp;
    }

    const baseSpawnZ = -215;

    for (let i = 0; i < count; i++) {
      const laneIdx = lanes[i];
      const laneX = LANE_CENTERS[laneIdx];
      const canSpawnSweeper = this.distance > 340 && count === 1 && Math.random() < 0.24;
      const type: 'TRAFFIC' | 'SWEEPER' = canSpawnSweeper ? 'SWEEPER' : 'TRAFFIC';

      const created = createObstacleMesh(type, this.shadowTexture, this.obsMats);
      const zOffset = baseSpawnZ - i * (6 + Math.random() * 10);
      created.mesh.position.set(laneX, 0, zOffset);
      this.obstaclePoolGroup.add(created.mesh);

      const trafficSpeed =
        type === 'SWEEPER'
          ? 12 + Math.random() * 8
          : (created.isHauler ? 16 : 21) + Math.random() * 12 + difficulty * 6;

      this.obstacles.push({
        mesh: created.mesh,
        type,
        x: laneX,
        z: zOffset,
        speed: trafficSpeed,
        halfW: created.halfW,
        halfD: created.halfD,
        patrolBaseX: laneX,
        patrolAmp: type === 'SWEEPER' ? 3.2 : 0,
        patrolPhase: Math.random() * Math.PI * 2,
        patrolFreq: 1.6 + Math.random() * 0.8,
        nearMissed: false,
      });
    }
  }

  private updateSectorAtmosphere(dt: number): void {
    const newSector = Math.min(SECTORS.length - 1, Math.floor(this.distance / 1100));
    if (newSector !== this.sectorIndex) {
      this.sectorIndex = newSector;
      this.sectorEventId++;
      this.sound.playSectorUp();
      this.emitTelemetry(true);
    }

    const targetPalette = SECTORS[this.sectorIndex];
    _targetSkyTop.setHex(targetPalette.skyTop);
    _targetSkyHorizon.setHex(targetPalette.skyHorizon);
    _targetFogColor.setHex(targetPalette.fog);
    _targetAccentColor.setHex(targetPalette.accent);
    _targetSunColor.setHex(targetPalette.sunColor);
    _targetMonolithColor.setHex(targetPalette.monolith);

    const lerpFactor = Math.min(1, dt * 1.4);
    this.skyMat.uniforms.topColor.value.lerp(_targetSkyTop, lerpFactor);
    this.skyMat.uniforms.horizonColor.value.lerp(_targetSkyHorizon, lerpFactor);
    this.skyMat.uniforms.glowColor.value.lerp(_targetAccentColor, lerpFactor);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(_targetFogColor, lerpFactor);
    }
    this.dirLight.color.lerp(_targetSunColor, lerpFactor);
    this.rimLight.color.lerp(_targetAccentColor, lerpFactor);

    this.envRig.railEdgeMat.color.lerp(_targetAccentColor, lerpFactor);
    this.envRig.railEdgeMat.emissive.lerp(_targetAccentColor, lerpFactor);
    this.envRig.gantryLightStripMat.color.lerp(_targetAccentColor, lerpFactor);
    this.envRig.gantryLightStripMat.emissive.lerp(_targetAccentColor, lerpFactor);
    this.envRig.monolithSlitMat.color.lerp(_targetAccentColor, lerpFactor);
    this.envRig.monolithSlitMat.emissive.lerp(_targetAccentColor, lerpFactor);
    this.envRig.monolithMat.color.lerp(_targetMonolithColor, lerpFactor);
    this.particleMat.color.lerp(_targetAccentColor, lerpFactor);
    this.playerRig.caliperMat.color.lerp(_targetAccentColor, lerpFactor);
    this.playerRig.caliperMat.emissive.lerp(_targetAccentColor, lerpFactor);

    for (let i = 0; i < this.envRig.gantries.length; i++) {
      this.envRig.gantries[i].poolMat.color.lerp(_targetAccentColor, lerpFactor);
    }
  }

  private updateRibbonGeometry(
    ribbon: LightRibbon,
    anchorX: number,
    anchorY: number,
    anchorZ: number,
    speedDelta: number,
    isBoosting: boolean
  ): void {
    for (let i = TRAIL_POINTS - 1; i > 0; i--) {
      ribbon.history[i].copy(ribbon.history[i - 1]);
      ribbon.history[i].z += speedDelta * (isBoosting ? 1.25 : 0.92);
    }
    ribbon.history[0].set(anchorX, anchorY, anchorZ);

    const posAttr = ribbon.geo.attributes.position as THREE.BufferAttribute;
    const halfWidth = isBoosting ? 0.085 : 0.055;
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const p = ribbon.history[i];
      const taper = 1.0 - i / TRAIL_POINTS;
      const w = halfWidth * taper;
      posAttr.setXYZ(i * 2, p.x - w, p.y, p.z);
      posAttr.setXYZ(i * 2 + 1, p.x + w, p.y, p.z);
    }
    posAttr.needsUpdate = true;
    ribbon.mat.opacity = isBoosting ? 0.72 : 0.36;
    ribbon.mat.color.setHex(isBoosting ? 0x00e5ff : 0xff1e42);
  }

  private scrollWorldGeometry(dz: number): void {
    this.asphaltTextures.map.offset.y -= dz / (CONFIG.SEGMENT_LENGTH / 28);
    this.asphaltTextures.roughnessMap.offset.y = this.asphaltTextures.map.offset.y;

    for (let i = 0; i < this.envRig.laneDashes.length; i++) {
      const dash = this.envRig.laneDashes[i];
      dash.position.z += dz;
      if (dash.position.z > 30) {
        dash.position.z -= CONFIG.SEGMENT_LENGTH;
      }
    }

    for (let i = 0; i < this.envRig.gantries.length; i++) {
      const g = this.envRig.gantries[i].group;
      g.position.z += dz;
      if (g.position.z > 35) {
        g.position.z -= this.envRig.gantryCount * this.envRig.gantrySpacing;
      }
    }

    for (let i = 0; i < this.envRig.monoliths.length; i++) {
      const m = this.envRig.monoliths[i];
      m.position.z += dz;
      if (m.position.z > 35) {
        m.position.z -= CONFIG.SEGMENT_LENGTH;
      }
    }

    const pArr = this.particleGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i++) {
      pArr[i * 3 + 2] += dz * this.particleVelocities[i] * 1.35;
      if (pArr[i * 3 + 2] > 18) {
        pArr[i * 3 + 2] = -155 - Math.random() * 25;
        pArr[i * 3] = (Math.random() - 0.5) * 34;
        pArr[i * 3 + 1] = 0.3 + Math.random() * 10;
      }
    }
    this.particleGeo.attributes.position.needsUpdate = true;
  }

  private updateSimulation(dt: number, now: number): void {
    this.updateSparks(dt);

    if (this.status === 'PAUSED') {
      return;
    }

    // Brief simulation hitstop on heavy crash impact
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      if (this.hitstopTimer <= 0 && this.crashPending) {
        this.crashPending = false;
        this.status = 'GAMEOVER';
        this.sound.updateEngine(0, false, false);
        this.emitTelemetry(true);
      }
      return;
    }

    this.updateSectorAtmosphere(dt);

    if (this.status !== 'PLAYING') {
      // Smooth attract-mode cruise on Title / Game Over background
      const cruiseSpeed = this.status === 'GAMEOVER' ? 8 : 28;
      const dz = cruiseSpeed * dt;
      this.scrollWorldGeometry(dz);

      for (let i = 0; i < this.playerRig.wheels.length; i++) {
        this.playerRig.wheels[i].spinner.rotation.x -= dz / 0.37;
      }

      if (this.status === 'TITLE') {
        const t = now * 0.0005;
        this.playerRig.root.position.x = Math.sin(t) * 2.2;
        this.playerRig.carVisual.rotation.z = -Math.cos(t) * 0.04;
        this.playerRig.carVisual.rotation.y = -Math.cos(t) * 0.03;

        this.updateRibbonGeometry(
          this.leftRibbon,
          this.playerRig.root.position.x - 0.68,
          0.68,
          2.11,
          dz,
          false
        );
        this.updateRibbonGeometry(
          this.rightRibbon,
          this.playerRig.root.position.x + 0.68,
          0.68,
          2.11,
          dz,
          false
        );

        this.camera.position.set(this.playerRig.root.position.x * 0.6, 3.1, 7.6);
        _camTarget.set(this.playerRig.root.position.x * 0.8, 1.0, -18);
        this.camera.lookAt(_camTarget);
      } else {
        // Slowly decay camera shake on Game Over backdrop
        this.shakeIntensity *= Math.exp(-5 * dt);
      }
      return;
    }

    // 1. Escalating Difficulty Ramp
    const difficultyRamp = Math.min(26, this.distance * 0.0034);
    const currentMinSpeed = CONFIG.BASE_MIN_SPEED + difficultyRamp * 0.75;
    const currentMaxSpeed = CONFIG.BASE_MAX_SPEED + difficultyRamp;

    // 2. Nitro Boost Handling
    const wantBoost = this.keys.boost || this.touches.boost;
    if (wantBoost && this.nitro > 2) {
      this.isBoosting = true;
      this.nitro = Math.max(0, this.nitro - 34 * dt);
    } else {
      this.isBoosting = false;
      this.nitro = Math.min(100, this.nitro + 6.8 * dt);
    }

    // 3. Longitudinal Speed
    const wantUp = this.keys.up || this.touches.up;
    const wantDown = this.keys.down || this.touches.down;

    let targetSpeed = currentMinSpeed + (currentMaxSpeed - currentMinSpeed) * 0.48;
    if (wantUp) targetSpeed = currentMaxSpeed;
    if (wantDown) targetSpeed = currentMinSpeed * 0.68;
    if (this.isBoosting) targetSpeed = currentMaxSpeed + CONFIG.NITRO_EXTRA_SPEED;

    const accelRate = this.isBoosting ? 7.5 : wantDown ? 6.5 : 3.4;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, accelRate, dt);

    const currentKmh = Math.round(this.speed * CONFIG.KMH_MULTIPLIER);
    if (currentKmh > this.peakSpeedKmh) {
      this.peakSpeedKmh = currentKmh;
    }

    this.playerRig.tailMat.emissiveIntensity = wantDown ? 4.4 : 2.6;
    this.playerRig.tailGlowLight.intensity = wantDown ? 2.6 : 1.2;

    // 4. Lateral Steering Physics
    let steerInput = 0;
    if (this.keys.left || this.touches.left) steerInput -= 1;
    if (this.keys.right || this.touches.right) steerInput += 1;

    const lateralAccel = 74;
    const lateralFriction = 9.5;
    this.playerVx += steerInput * lateralAccel * dt;
    this.playerVx -= this.playerVx * lateralFriction * dt;
    this.playerX += this.playerVx * dt;

    if (this.scrapeCooldown > 0) this.scrapeCooldown -= dt;

    const maxX = CONFIG.ROAD_WIDTH / 2 - 1.18;
    if (this.playerX < -maxX) {
      this.playerX = -maxX;
      if (Math.abs(this.playerVx) > 2.5 && this.scrapeCooldown <= 0) {
        this.sound.playScrape();
        this.spawnSparkBurst(-CONFIG.ROAD_WIDTH / 2 + 0.15, 0.42, 0.5, 8, 5);
        this.scrapeCooldown = 0.22;
      }
      this.playerVx = Math.abs(this.playerVx) * 0.35;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);
    } else if (this.playerX > maxX) {
      this.playerX = maxX;
      if (Math.abs(this.playerVx) > 2.5 && this.scrapeCooldown <= 0) {
        this.sound.playScrape();
        this.spawnSparkBurst(CONFIG.ROAD_WIDTH / 2 - 0.15, 0.42, 0.5, 8, 5);
        this.scrapeCooldown = 0.22;
      }
      this.playerVx = -Math.abs(this.playerVx) * 0.35;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);
    }

    this.playerRig.root.position.x = this.playerX;

    // Dynamic Body Roll, Pitch & Wheel Rotation
    const targetRoll = -this.playerVx * 0.013;
    const targetYaw = -this.playerVx * 0.0085;
    const targetPitch = this.isBoosting ? 0.022 : wantDown ? -0.028 : 0;
    this.playerRig.carVisual.rotation.z = THREE.MathUtils.damp(
      this.playerRig.carVisual.rotation.z,
      targetRoll,
      14,
      dt
    );
    this.playerRig.carVisual.rotation.y = THREE.MathUtils.damp(
      this.playerRig.carVisual.rotation.y,
      targetYaw,
      14,
      dt
    );
    this.playerRig.carVisual.rotation.x = THREE.MathUtils.damp(
      this.playerRig.carVisual.rotation.x,
      targetPitch,
      12,
      dt
    );

    const wheelStep = (this.speed * dt) / 0.37;
    for (let i = 0; i < this.playerRig.wheels.length; i++) {
      const w = this.playerRig.wheels[i];
      w.spinner.rotation.x -= wheelStep;
      if (w.isFront) {
        w.assembly.rotation.y = THREE.MathUtils.damp(
          w.assembly.rotation.y,
          -steerInput * 0.28,
          16,
          dt
        );
      }
    }

    // Nitro Thruster Cones
    if (this.isBoosting) {
      this.playerRig.nitroMat.opacity = 0.78 + Math.random() * 0.22;
      this.playerRig.nitroCoreMat.opacity = 0.92;
      const scaleZ = 0.95 + Math.random() * 0.55;
      this.playerRig.exhaustLeft.scale.set(1.15, 1.15, scaleZ);
      this.playerRig.exhaustRight.scale.set(1.15, 1.15, scaleZ);
    } else {
      this.playerRig.nitroMat.opacity *= Math.exp(-12 * dt);
      this.playerRig.nitroCoreMat.opacity *= Math.exp(-14 * dt);
    }

    // 5. Scroll Road, Gantries, Monoliths & Particles
    const dz = this.speed * dt;
    this.distance += dz;
    this.score += dz * (this.isBoosting ? 1.55 : 1.0) * (1 + (this.combo - 1) * 0.25);

    this.scrollWorldGeometry(dz);
    this.particleMat.opacity = this.isBoosting ? 0.85 : 0.45;

    this.updateRibbonGeometry(
      this.leftRibbon,
      this.playerX - 0.68,
      0.68,
      2.11,
      dz,
      this.isBoosting
    );
    this.updateRibbonGeometry(
      this.rightRibbon,
      this.playerX + 0.68,
      0.68,
      2.11,
      dz,
      this.isBoosting
    );

    // 6. Combo Decay
    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
      }
    }

    // 7. Traffic & Sweeper Spawning
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      const baseInterval = Math.max(0.42, 1.15 - difficultyRamp * 0.025);
      const speedAdjust = 52 / Math.max(35, this.speed);
      this.spawnTimer = baseInterval * speedAdjust * (0.82 + Math.random() * 0.35);
    }

    // 8. Update Obstacles, Near Misses & Collisions
    const playerHalfW = 0.84;
    const playerHalfD = 1.98;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const relDz = (this.speed - obs.speed) * dt;
      obs.z += relDz;

      if (obs.type === 'SWEEPER') {
        obs.patrolPhase += obs.patrolFreq * dt;
        const limitX = CONFIG.ROAD_WIDTH / 2 - obs.halfW - 0.35;
        obs.x = THREE.MathUtils.clamp(
          obs.patrolBaseX + Math.sin(obs.patrolPhase) * obs.patrolAmp,
          -limitX,
          limitX
        );
      }

      obs.mesh.position.set(obs.x, 0, obs.z);

      const dx = Math.abs(this.playerX - obs.x);
      const dzObs = Math.abs(CONFIG.PLAYER_Z - obs.z);

      // Collision check
      if (dx < playerHalfW + obs.halfW && dzObs < playerHalfD + obs.halfD) {
        this.triggerCrash();
        return;
      }

      // Near-miss check
      if (
        !obs.nearMissed &&
        dzObs < playerHalfD + obs.halfD + 0.85 &&
        dx < playerHalfW + obs.halfW + 1.18
      ) {
        obs.nearMissed = true;
        this.combo = Math.min(12, this.combo + 1);
        this.comboTimer = 4.2;
        this.nearMissCount += 1;
        this.nitro = Math.min(100, this.nitro + 18);
        const bonus = 150 * this.combo;
        this.score += bonus;
        this.nearMissBonus = bonus;
        this.nearMissEventId++;
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.12);
        this.sound.playNearMiss(this.combo);
        this.spawnSparkBurst(
          (this.playerX + obs.x) * 0.5,
          0.55,
          obs.z * 0.5,
          10,
          7
        );
        this.emitTelemetry(true);
      }

      if (obs.z > 28) {
        this.obstaclePoolGroup.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    // Best score tracking live
    if (Math.floor(this.score) > this.bestScore) {
      this.bestScore = Math.floor(this.score);
      this.isNewRecord = true;
    }
    if (Math.floor(this.distance) > this.bestDistance) {
      this.bestDistance = Math.floor(this.distance);
    }

    // 9. Camera Perspective & Dynamic FOV Warp
    const camMode = CONFIG.CAMERA_MODES[this.cameraModeIndex];
    const targetFov = this.isBoosting
      ? 78
      : 62 + ((this.speed - CONFIG.BASE_MIN_SPEED) / 60) * 8;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, dt);
    this.camera.updateProjectionMatrix();

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.001) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= Math.exp(-10 * dt);
    }
    if (this.isBoosting) {
      shakeX += (Math.random() - 0.5) * 0.045;
      shakeY += (Math.random() - 0.5) * 0.045;
    }

    if (camMode === 'CHASE') {
      const desiredX = this.playerX * 0.72 + shakeX;
      const desiredY = 2.85 + shakeY;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredX, 14, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredY, 14, dt);
      this.camera.position.z = 6.9;
      _camTarget.set(this.playerX * 0.88, 0.95, -22);
      this.camera.lookAt(_camTarget);
    } else if (camMode === 'BUMPER') {
      this.camera.position.set(this.playerX + shakeX, 0.72 + shakeY, -2.25);
      _camTarget.set(this.playerX + this.playerVx * 0.06, 0.75, -35);
      this.camera.lookAt(_camTarget);
    } else {
      this.camera.position.set(this.playerX + shakeX, 1.24 + shakeY, -0.35);
      _camTarget.set(this.playerX + this.playerVx * 0.08, 0.92, -32);
      this.camera.lookAt(_camTarget);
    }

    // 10. Audio & Throttled HUD Telemetry
    this.sound.updateEngine(this.speed, this.isBoosting, true);
    if (now - this.lastHudEmit >= 50) {
      this.emitTelemetry(false, now);
    }
  }

  private triggerCrash(): void {
    this.sound.playCrash();
    this.sound.updateEngine(0, false, false);
    this.shakeIntensity = 0.65;
    this.hitstopTimer = 0.075;
    this.crashPending = true;
    this.spawnSparkBurst(this.playerX, 0.75, -1.2, 32, 16);

    const finalScore = Math.floor(this.score);
    const finalDist = Math.floor(this.distance);
    if (finalScore >= this.bestScore) {
      this.bestScore = finalScore;
    }
    if (finalDist >= this.bestDistance) {
      this.bestDistance = finalDist;
    }
    saveBestStats(this.bestScore, this.bestDistance);
  }

  private emitTelemetry(force: boolean, now = performance.now()): void {
    if (!force && now - this.lastHudEmit < 50) return;
    this.lastHudEmit = now;

    const sector = SECTORS[this.sectorIndex];
    const camMode: CameraMode = CONFIG.CAMERA_MODES[this.cameraModeIndex];

    this.onTelemetry({
      status: this.status,
      score: Math.floor(this.score),
      bestScore: this.bestScore,
      bestDistance: this.bestDistance,
      distance: Math.floor(this.distance),
      speedKmh: Math.round(this.speed * CONFIG.KMH_MULTIPLIER),
      peakSpeedKmh: this.peakSpeedKmh,
      nitro: Math.round(this.nitro),
      isBoosting: this.isBoosting,
      combo: this.combo,
      nearMissCount: this.nearMissCount,
      sectorIndex: this.sectorIndex,
      sectorLabel: sector.label,
      accentHex: sector.accentHex,
      cameraMode: camMode,
      isMuted: this.sound.isMuted(),
      isNewRecord: this.isNewRecord,
      nearMissEventId: this.nearMissEventId,
      nearMissBonus: this.nearMissBonus,
      sectorEventId: this.sectorEventId,
    });
  }

  private renderFrame(): void {
    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.isTimeoutId = true;
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.isTimeoutId = true;
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.isTimeoutId = true;
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.isTimeoutId = true;
    this.frameId = window.setTimeout(poll, 5);
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.isTimeoutId = false;
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    this.updateSimulation(dt, now);
    this.renderFrame();
    this.scheduleNextFrame();
  };

  public dispose(): void {
    this.disposed = true;
    if (this.isTimeoutId) {
      clearTimeout(this.frameId);
    } else {
      cancelAnimationFrame(this.frameId);
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.sound.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.asphaltTextures.map.dispose();
    this.asphaltTextures.roughnessMap.dispose();
    this.shadowTexture.dispose();
    this.envRenderTarget?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// Keep unused scratch references bound cleanly for compiler check
void _ribbonLeftPos;
void _ribbonRightPos;
