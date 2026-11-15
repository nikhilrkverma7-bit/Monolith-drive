import * as THREE from 'three';
import { SectorWeatherProfile } from './constants';

const RAIN_COUNT = 340;
const FLURRY_COUNT = 160;
const MIST_COUNT = 28;
const SPRAY_COUNT = 44;

const _targetPrecipColor = new THREE.Color();
const _targetMistColor = new THREE.Color();

function createSoftSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.72, 'rgba(255, 255, 255, 0.10)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class WeatherSystem {
  private group = new THREE.Group();
  private spriteTex: THREE.CanvasTexture;

  // Rain streaks (velocity-aligned line segments)
  private rainGeo: THREE.BufferGeometry;
  private rainMat: THREE.LineBasicMaterial;
  private rainSeeds: Float32Array;

  // Ice flurries / dusk haze particles
  private flurryGeo: THREE.BufferGeometry;
  private flurryMat: THREE.PointsMaterial;
  private flurryPhases: Float32Array;

  // Low-altitude drifting ground mist sprites
  private mistGeo: THREE.BufferGeometry;
  private mistMat: THREE.PointsMaterial;
  private mistDrifts: Float32Array;

  // Rear-wheel wet road tire spray
  private sprayGeo: THREE.BufferGeometry;
  private sprayMat: THREE.PointsMaterial;
  private sprayAges: Float32Array;
  private sprayVelX: Float32Array;
  private sprayVelY: Float32Array;

  private currentRainOpacity = 0.38;
  private currentRainSpeed = 28;
  private currentWindX = -2.2;
  private currentFlurryOpacity = 0;
  private currentFlurrySize = 0.16;
  private currentMistOpacity = 0.12;
  private currentSprayIntensity = 0.5;
  private elapsed = 0;

  constructor(scene: THREE.Scene, initialProfile: SectorWeatherProfile) {
    this.spriteTex = createSoftSpriteTexture();

    this.currentRainOpacity = initialProfile.rainOpacity;
    this.currentRainSpeed = initialProfile.rainSpeed;
    this.currentWindX = initialProfile.windX;
    this.currentFlurryOpacity = initialProfile.flurryOpacity;
    this.currentFlurrySize = initialProfile.flurrySize;
    this.currentMistOpacity = initialProfile.mistOpacity;
    this.currentSprayIntensity = initialProfile.sprayIntensity;

    // 1. Rain Streak LineSegments
    const rainPositions = new Float32Array(RAIN_COUNT * 2 * 3);
    this.rainSeeds = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = (Math.random() - 0.5) * 44;
      const y = Math.random() * 18;
      const z = 12 - Math.random() * 130;
      this.rainSeeds[i] = 0.8 + Math.random() * 0.45;
      rainPositions[i * 6] = x;
      rainPositions[i * 6 + 1] = y;
      rainPositions[i * 6 + 2] = z;
      rainPositions[i * 6 + 3] = x;
      rainPositions[i * 6 + 4] = y + 0.9;
      rainPositions[i * 6 + 5] = z - 0.6;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: initialProfile.precipColor,
      transparent: true,
      opacity: initialProfile.rainOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rainLines = new THREE.LineSegments(this.rainGeo, this.rainMat);
    rainLines.frustumCulled = false;
    this.group.add(rainLines);

    // 2. Ice Flurries & Thermal Haze Motes
    const flurryPositions = new Float32Array(FLURRY_COUNT * 3);
    this.flurryPhases = new Float32Array(FLURRY_COUNT);
    for (let i = 0; i < FLURRY_COUNT; i++) {
      flurryPositions[i * 3] = (Math.random() - 0.5) * 42;
      flurryPositions[i * 3 + 1] = 0.4 + Math.random() * 14;
      flurryPositions[i * 3 + 2] = 12 - Math.random() * 125;
      this.flurryPhases[i] = Math.random() * Math.PI * 2;
    }
    this.flurryGeo = new THREE.BufferGeometry();
    this.flurryGeo.setAttribute('position', new THREE.BufferAttribute(flurryPositions, 3));
    this.flurryMat = new THREE.PointsMaterial({
      map: this.spriteTex,
      color: initialProfile.precipColor,
      size: initialProfile.flurrySize,
      transparent: true,
      opacity: initialProfile.flurryOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flurryPoints = new THREE.Points(this.flurryGeo, this.flurryMat);
    flurryPoints.frustumCulled = false;
    this.group.add(flurryPoints);

    // 3. Low-Altitude Ground Fog / Mist Layer
    const mistPositions = new Float32Array(MIST_COUNT * 3);
    this.mistDrifts = new Float32Array(MIST_COUNT);
    for (let i = 0; i < MIST_COUNT; i++) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 38;
      mistPositions[i * 3 + 1] = 1.0 + Math.random() * 2.4;
      mistPositions[i * 3 + 2] = -10 - Math.random() * 145;
      this.mistDrifts[i] = (Math.random() - 0.5) * 2.2;
    }
    this.mistGeo = new THREE.BufferGeometry();
    this.mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    this.mistMat = new THREE.PointsMaterial({
      map: this.spriteTex,
      color: initialProfile.mistColor,
      size: 16,
      transparent: true,
      opacity: initialProfile.mistOpacity,
      depthWrite: false,
    });
    const mistPoints = new THREE.Points(this.mistGeo, this.mistMat);
    mistPoints.frustumCulled = false;
    this.group.add(mistPoints);

    // 4. Wet Asphalt Tire Wake Spray
    const sprayPositions = new Float32Array(SPRAY_COUNT * 3);
    this.sprayAges = new Float32Array(SPRAY_COUNT);
    this.sprayVelX = new Float32Array(SPRAY_COUNT);
    this.sprayVelY = new Float32Array(SPRAY_COUNT);
    for (let i = 0; i < SPRAY_COUNT; i++) {
      this.sprayAges[i] = (i / SPRAY_COUNT) * 0.45;
      sprayPositions[i * 3 + 1] = -20;
    }
    this.sprayGeo = new THREE.BufferGeometry();
    this.sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));
    this.sprayMat = new THREE.PointsMaterial({
      map: this.spriteTex,
      color: 0xdbeafe,
      size: 0.65,
      transparent: true,
      opacity: 0.25 * initialProfile.sprayIntensity,
      depthWrite: false,
    });
    const sprayPoints = new THREE.Points(this.sprayGeo, this.sprayMat);
    sprayPoints.frustumCulled = false;
    this.group.add(sprayPoints);

    scene.add(this.group);
  }

  public resetImmediate(profile: SectorWeatherProfile): void {
    this.currentRainOpacity = profile.rainOpacity;
    this.currentRainSpeed = profile.rainSpeed;
    this.currentWindX = profile.windX;
    this.currentFlurryOpacity = profile.flurryOpacity;
    this.currentFlurrySize = profile.flurrySize;
    this.currentMistOpacity = profile.mistOpacity;
    this.currentSprayIntensity = profile.sprayIntensity;

    this.rainMat.opacity = profile.rainOpacity;
    this.rainMat.color.setHex(profile.precipColor);
    this.flurryMat.opacity = profile.flurryOpacity;
    this.flurryMat.size = profile.flurrySize;
    this.flurryMat.color.setHex(profile.precipColor);
    this.mistMat.opacity = profile.mistOpacity;
    this.mistMat.color.setHex(profile.mistColor);
  }

  public update(
    dt: number,
    vehicleSpeed: number,
    playerX: number,
    targetProfile: SectorWeatherProfile,
    fog: THREE.FogExp2 | null,
    roadMat: THREE.MeshStandardMaterial
  ): void {
    this.elapsed += dt;

    // Smoothly damp all weather parameters toward target sector profile
    const dampLambda = 1.4;
    this.currentRainOpacity = THREE.MathUtils.damp(
      this.currentRainOpacity,
      targetProfile.rainOpacity,
      dampLambda,
      dt
    );
    this.currentRainSpeed = THREE.MathUtils.damp(
      this.currentRainSpeed,
      targetProfile.rainSpeed,
      dampLambda,
      dt
    );
    this.currentWindX = THREE.MathUtils.damp(
      this.currentWindX,
      targetProfile.windX,
      dampLambda,
      dt
    );
    this.currentFlurryOpacity = THREE.MathUtils.damp(
      this.currentFlurryOpacity,
      targetProfile.flurryOpacity,
      dampLambda,
      dt
    );
    this.currentFlurrySize = THREE.MathUtils.damp(
      this.currentFlurrySize,
      targetProfile.flurrySize,
      dampLambda,
      dt
    );
    this.currentMistOpacity = THREE.MathUtils.damp(
      this.currentMistOpacity,
      targetProfile.mistOpacity,
      dampLambda,
      dt
    );
    this.currentSprayIntensity = THREE.MathUtils.damp(
      this.currentSprayIntensity,
      targetProfile.sprayIntensity,
      dampLambda,
      dt
    );

    if (fog) {
      fog.density = THREE.MathUtils.damp(fog.density, targetProfile.fogDensity, dampLambda, dt);
    }
    roadMat.roughness = THREE.MathUtils.damp(
      roadMat.roughness,
      targetProfile.roadRoughness,
      dampLambda,
      dt
    );
    roadMat.metalness = THREE.MathUtils.damp(
      roadMat.metalness,
      targetProfile.roadMetalness,
      dampLambda,
      dt
    );

    const colorLerp = Math.min(1, dt * 1.4);
    _targetPrecipColor.setHex(targetProfile.precipColor);
    _targetMistColor.setHex(targetProfile.mistColor);
    this.rainMat.color.lerp(_targetPrecipColor, colorLerp);
    this.flurryMat.color.lerp(_targetPrecipColor, colorLerp);
    this.mistMat.color.lerp(_targetMistColor, colorLerp);

    this.rainMat.opacity = this.currentRainOpacity;
    this.flurryMat.opacity = this.currentFlurryOpacity;
    this.flurryMat.size = this.currentFlurrySize;
    this.mistMat.opacity = this.currentMistOpacity;

    // 1. Update Rain Streaks
    if (this.currentRainOpacity > 0.01) {
      const rArr = this.rainGeo.attributes.position.array as Float32Array;
      const forwardDz = vehicleSpeed * 0.88;
      const streakScale = 0.032;

      for (let i = 0; i < RAIN_COUNT; i++) {
        const seed = this.rainSeeds[i];
        const vx = this.currentWindX * seed;
        const vy = -this.currentRainSpeed * seed;
        const vz = forwardDz * seed;

        let x = rArr[i * 6] + vx * dt;
        let y = rArr[i * 6 + 1] + vy * dt;
        let z = rArr[i * 6 + 2] + vz * dt;

        if (y < 0 || z > 14) {
          x = playerX + (Math.random() - 0.5) * 44;
          y = y < 0 ? 15 + Math.random() * 4 : Math.random() * 17;
          z = z > 14 ? -118 - Math.random() * 16 : 10 - Math.random() * 126;
        }
        if (x < playerX - 24) x += 48;
        else if (x > playerX + 24) x -= 48;

        rArr[i * 6] = x;
        rArr[i * 6 + 1] = y;
        rArr[i * 6 + 2] = z;

        rArr[i * 6 + 3] = x - vx * streakScale;
        rArr[i * 6 + 4] = y - vy * streakScale;
        rArr[i * 6 + 5] = z - vz * streakScale;
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }

    // 2. Update Flurries / Thermal Haze Motes
    if (this.currentFlurryOpacity > 0.01) {
      const fArr = this.flurryGeo.attributes.position.array as Float32Array;
      const isSnow = targetProfile.kind === 'SNOW';
      const fallRate = isSnow ? 3.2 : 0.6;
      const forwardDz = vehicleSpeed * 0.72;

      for (let i = 0; i < FLURRY_COUNT; i++) {
        const phase = this.flurryPhases[i];
        const swirlX = Math.sin(this.elapsed * 2.1 + phase) * (isSnow ? 2.8 : 1.4);
        const swirlY = isSnow ? 0 : Math.cos(this.elapsed * 1.7 + phase) * 0.8;

        let x = fArr[i * 3] + (this.currentWindX * 0.55 + swirlX) * dt;
        let y = fArr[i * 3 + 1] + (-fallRate + swirlY) * dt;
        let z = fArr[i * 3 + 2] + forwardDz * dt;

        if (y < 0.2 || y > 16 || z > 14) {
          x = playerX + (Math.random() - 0.5) * 42;
          y = isSnow ? 12 + Math.random() * 4 : 0.6 + Math.random() * 12;
          z = z > 14 ? -115 - Math.random() * 15 : 10 - Math.random() * 122;
        }
        if (x < playerX - 22) x += 44;
        else if (x > playerX + 22) x -= 44;

        fArr[i * 3] = x;
        fArr[i * 3 + 1] = y;
        fArr[i * 3 + 2] = z;
      }
      this.flurryGeo.attributes.position.needsUpdate = true;
    }

    // 3. Update Low-Altitude Drifting Mist
    if (this.currentMistOpacity > 0.01) {
      const mArr = this.mistGeo.attributes.position.array as Float32Array;
      const mistDz = vehicleSpeed * 0.65;
      for (let i = 0; i < MIST_COUNT; i++) {
        let x = mArr[i * 3] + (this.mistDrifts[i] + this.currentWindX * 0.25) * dt;
        let z = mArr[i * 3 + 2] + mistDz * dt;

        if (z > 10) {
          z = -140 - Math.random() * 20;
          x = (Math.random() - 0.5) * 38;
        }
        if (x < -22) x += 44;
        else if (x > 22) x -= 44;

        mArr[i * 3] = x;
        mArr[i * 3 + 2] = z;
      }
      this.mistGeo.attributes.position.needsUpdate = true;
    }

    // 4. Update Rear-Wheel Wet Road Spray
    const speedFactor = Math.max(0, Math.min(1, (vehicleSpeed - 20) / 70));
    this.sprayMat.opacity = this.currentSprayIntensity * speedFactor * 0.28;
    if (this.sprayMat.opacity > 0.01) {
      const sArr = this.sprayGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < SPRAY_COUNT; i++) {
        this.sprayAges[i] += dt;
        if (this.sprayAges[i] >= 0.42) {
          this.sprayAges[i] = 0;
          const side = i % 2 === 0 ? -0.94 : 0.94;
          sArr[i * 3] = playerX + side + (Math.random() - 0.5) * 0.18;
          sArr[i * 3 + 1] = 0.24 + Math.random() * 0.14;
          sArr[i * 3 + 2] = 1.65 + Math.random() * 0.35;
          this.sprayVelX[i] = side * (0.9 + Math.random() * 1.1);
          this.sprayVelY[i] = 0.9 + Math.random() * 1.6 * speedFactor;
        } else {
          sArr[i * 3] += this.sprayVelX[i] * dt;
          sArr[i * 3 + 1] += this.sprayVelY[i] * dt;
          sArr[i * 3 + 2] += vehicleSpeed * 0.38 * dt;
          this.sprayVelY[i] -= 2.2 * dt;
        }
      }
      this.sprayGeo.attributes.position.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.rainGeo.dispose();
    this.rainMat.dispose();
    this.flurryGeo.dispose();
    this.flurryMat.dispose();
    this.mistGeo.dispose();
    this.mistMat.dispose();
    this.sprayGeo.dispose();
    this.sprayMat.dispose();
    this.spriteTex.dispose();
  }
}
