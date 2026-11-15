import * as THREE from 'three';
import { SECTORS } from './constants';

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export function createAsphaltTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 512;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext('2d')!;

  aCtx.fillStyle = '#181a20';
  aCtx.fillRect(0, 0, width, height);

  const laneCenters = [0.16, 0.39, 0.61, 0.84];
  laneCenters.forEach((cx) => {
    const grad = aCtx.createLinearGradient((cx - 0.08) * width, 0, (cx + 0.08) * width, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.25, 'rgba(200,220,255,0.035)');
    grad.addColorStop(0.5, 'rgba(10,12,16,0.12)');
    grad.addColorStop(0.75, 'rgba(200,220,255,0.035)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    aCtx.fillStyle = grad;
    aCtx.fillRect((cx - 0.09) * width, 0, 0.18 * width, height);
  });

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#8e8e8e';
  rCtx.fillRect(0, 0, width, height);

  laneCenters.forEach((cx) => {
    const rGrad = rCtx.createLinearGradient((cx - 0.07) * width, 0, (cx + 0.07) * width, 0);
    rGrad.addColorStop(0, 'rgba(65,65,65,0)');
    rGrad.addColorStop(0.3, 'rgba(42,42,42,0.75)');
    rGrad.addColorStop(0.7, 'rgba(42,42,42,0.75)');
    rGrad.addColorStop(1, 'rgba(65,65,65,0)');
    rCtx.fillStyle = rGrad;
    rCtx.fillRect((cx - 0.07) * width, 0, 0.14 * width, height);
  });

  const aImg = aCtx.getImageData(0, 0, width, height);
  const rImg = rCtx.getImageData(0, 0, width, height);
  for (let i = 0; i < aImg.data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 22;
    aImg.data[i] = Math.max(0, Math.min(255, aImg.data[i] + grain));
    aImg.data[i + 1] = Math.max(0, Math.min(255, aImg.data[i + 1] + grain));
    aImg.data[i + 2] = Math.max(0, Math.min(255, aImg.data[i + 2] + grain * 1.1));

    const rGrain = (Math.random() - 0.5) * 44;
    const rVal = Math.max(28, Math.min(220, rImg.data[i] + rGrain));
    rImg.data[i] = rVal;
    rImg.data[i + 1] = rVal;
    rImg.data[i + 2] = rVal;
  }
  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  aCtx.fillStyle = 'rgba(235, 242, 255, 0.42)';
  aCtx.fillRect(14, 0, 5, height);
  aCtx.fillRect(width - 19, 0, 5, height);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 28);
  map.anisotropy = Math.min(8, maxAnisotropy);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(1, 28);
  roughnessMap.anisotropy = Math.min(8, maxAnisotropy);

  return { map, roughnessMap };
}

export function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.52)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSkyDomeShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(SECTORS[0].skyTop) },
      horizonColor: { value: new THREE.Color(SECTORS[0].skyHorizon) },
      glowColor: { value: new THREE.Color(SECTORS[0].accent) },
      sunDirection: { value: new THREE.Vector3(0, 0.08, -1).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 glowColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldPosition;
      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = clamp(dir.y * 1.65, 0.0, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(h, 0.68));
        float sunAlign = max(dot(dir, sunDirection), 0.0);
        float horizonBand = exp(-abs(dir.y) * 9.5);
        col += glowColor * pow(sunAlign, 6.0) * horizonBand * 0.42;
        col += glowColor * horizonBand * 0.14;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
