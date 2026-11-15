import * as THREE from 'three';
import { CONFIG, SECTORS } from './constants';

export interface WheelRig {
  assembly: THREE.Group;
  spinner: THREE.Group;
  isFront: boolean;
}

export interface PlayerSupercarRig {
  root: THREE.Group;
  carVisual: THREE.Group;
  wheels: WheelRig[];
  tailMat: THREE.MeshStandardMaterial;
  tailGlowLight: THREE.PointLight;
  caliperMat: THREE.MeshStandardMaterial;
  nitroMat: THREE.MeshBasicMaterial;
  nitroCoreMat: THREE.MeshBasicMaterial;
  exhaustLeft: THREE.Group;
  exhaustRight: THREE.Group;
}

export interface HighwayEnvironmentRig {
  roadGroup: THREE.Group;
  laneDashes: THREE.Mesh[];
  gantries: Array<{ group: THREE.Group; poolMat: THREE.MeshBasicMaterial }>;
  monoliths: THREE.Group[];
  railEdgeMat: THREE.MeshStandardMaterial;
  gantryLightStripMat: THREE.MeshStandardMaterial;
  monolithMat: THREE.MeshStandardMaterial;
  monolithSlitMat: THREE.MeshStandardMaterial;
  gantryCount: number;
  gantrySpacing: number;
}

export interface ObstacleSharedMaterials {
  obsBodyMat: THREE.MeshStandardMaterial;
  obsHaulerMat: THREE.MeshStandardMaterial;
  obsGlassMat: THREE.MeshPhysicalMaterial;
  obsTailMat: THREE.MeshStandardMaterial;
  obsHeadMat: THREE.MeshStandardMaterial;
  sweeperAccentMat: THREE.MeshStandardMaterial;
  obsRimMat: THREE.MeshStandardMaterial;
}

export function buildHighwayEnvironment(
  scene: THREE.Scene,
  asphaltTextures: { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }
): HighwayEnvironmentRig {
  const roadGroup = new THREE.Group();
  scene.add(roadGroup);

  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTextures.map,
    roughnessMap: asphaltTextures.roughnessMap,
    color: 0xffffff,
    roughness: 0.44,
    metalness: 0.25,
  });

  const roadGeo = new THREE.PlaneGeometry(CONFIG.ROAD_WIDTH, CONFIG.SEGMENT_LENGTH);
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.z = -CONFIG.SEGMENT_LENGTH / 2 + 40;
  roadMesh.receiveShadow = true;
  roadGroup.add(roadMesh);

  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x07080c,
    roughness: 0.92,
    metalness: 0.05,
  });
  const apronMesh = new THREE.Mesh(new THREE.PlaneGeometry(460, CONFIG.SEGMENT_LENGTH), apronMat);
  apronMesh.rotation.x = -Math.PI / 2;
  apronMesh.position.set(0, -0.04, -CONFIG.SEGMENT_LENGTH / 2 + 40);
  roadGroup.add(apronMesh);

  const railEdgeMat = new THREE.MeshStandardMaterial({
    color: SECTORS[0].accent,
    emissive: SECTORS[0].accent,
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });
  const guardrailBodyMat = new THREE.MeshStandardMaterial({
    color: 0x161922,
    roughness: 0.35,
    metalness: 0.78,
  });

  const railGeo = new THREE.BoxGeometry(0.16, 0.12, CONFIG.SEGMENT_LENGTH);
  const barrierBodyGeo = new THREE.BoxGeometry(0.45, 0.65, CONFIG.SEGMENT_LENGTH);

  const leftBarrier = new THREE.Mesh(barrierBodyGeo, guardrailBodyMat);
  leftBarrier.position.set(-CONFIG.ROAD_WIDTH / 2 - 0.35, 0.32, -CONFIG.SEGMENT_LENGTH / 2 + 40);
  const rightBarrier = new THREE.Mesh(barrierBodyGeo, guardrailBodyMat);
  rightBarrier.position.set(CONFIG.ROAD_WIDTH / 2 + 0.35, 0.32, -CONFIG.SEGMENT_LENGTH / 2 + 40);

  const leftRail = new THREE.Mesh(railGeo, railEdgeMat);
  leftRail.position.set(-CONFIG.ROAD_WIDTH / 2 - 0.12, 0.56, -CONFIG.SEGMENT_LENGTH / 2 + 40);
  const rightRail = new THREE.Mesh(railGeo, railEdgeMat);
  rightRail.position.set(CONFIG.ROAD_WIDTH / 2 + 0.12, 0.56, -CONFIG.SEGMENT_LENGTH / 2 + 40);
  roadGroup.add(leftBarrier, rightBarrier, leftRail, rightRail);

  const laneDashes: THREE.Mesh[] = [];
  const dashGeo = new THREE.PlaneGeometry(0.13, 3.6);
  const dashMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.34,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const laneXOffsets = [-CONFIG.LANE_WIDTH, 0, CONFIG.LANE_WIDTH];
  const dashSpacing = 14;
  const dashCount = Math.ceil(CONFIG.SEGMENT_LENGTH / dashSpacing);

  for (let i = 0; i < dashCount; i++) {
    const zPos = 30 - i * dashSpacing;
    laneXOffsets.forEach((lx) => {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(lx, 0.02, zPos);
      roadGroup.add(dash);
      laneDashes.push(dash);
    });
  }

  const gantries: Array<{ group: THREE.Group; poolMat: THREE.MeshBasicMaterial }> = [];
  const gantryMaterial = new THREE.MeshStandardMaterial({
    color: 0x10131a,
    roughness: 0.3,
    metalness: 0.85,
  });
  const gantryLightStripMat = new THREE.MeshStandardMaterial({
    color: SECTORS[0].accent,
    emissive: SECTORS[0].accent,
    emissiveIntensity: 2.2,
  });
  const gantrySpanWidth = CONFIG.ROAD_WIDTH + 1.8;
  const gantryHeight = 6.8;
  const gantryCount = 6;
  const gantrySpacing = 68;

  const pillarGeo = new THREE.BoxGeometry(0.45, gantryHeight, 0.65);
  const beamGeo = new THREE.BoxGeometry(gantrySpanWidth + 0.5, 0.42, 0.65);
  const topLightGeo = new THREE.BoxGeometry(gantrySpanWidth - 1.2, 0.08, 0.24);
  const pLightGeo = new THREE.BoxGeometry(0.08, gantryHeight - 1.0, 0.14);
  const poolGeo = new THREE.PlaneGeometry(CONFIG.ROAD_WIDTH * 0.92, 5.5);

  for (let i = 0; i < gantryCount; i++) {
    const gGroup = new THREE.Group();

    const pLeft = new THREE.Mesh(pillarGeo, gantryMaterial);
    pLeft.position.set(-gantrySpanWidth / 2, gantryHeight / 2, 0);
    const pRight = new THREE.Mesh(pillarGeo, gantryMaterial);
    pRight.position.set(gantrySpanWidth / 2, gantryHeight / 2, 0);

    const beam = new THREE.Mesh(beamGeo, gantryMaterial);
    beam.position.set(0, gantryHeight, 0);

    const topLight = new THREE.Mesh(topLightGeo, gantryLightStripMat);
    topLight.position.set(0, gantryHeight - 0.22, 0);

    const pLightL = new THREE.Mesh(pLightGeo, gantryLightStripMat);
    pLightL.position.set(-gantrySpanWidth / 2 + 0.24, gantryHeight / 2, 0);
    const pLightR = new THREE.Mesh(pLightGeo, gantryLightStripMat);
    pLightR.position.set(gantrySpanWidth / 2 - 0.24, gantryHeight / 2, 0);

    const poolMat = new THREE.MeshBasicMaterial({
      color: SECTORS[0].accent,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.014, 0);

    gGroup.add(pLeft, pRight, beam, topLight, pLightL, pLightR, pool);
    gGroup.position.z = -25 - i * gantrySpacing;
    scene.add(gGroup);
    gantries.push({ group: gGroup, poolMat });
  }

  const monoliths: THREE.Group[] = [];
  const monolithMat = new THREE.MeshStandardMaterial({
    color: SECTORS[0].monolith,
    roughness: 0.65,
    metalness: 0.35,
  });
  const monolithSlitMat = new THREE.MeshStandardMaterial({
    color: SECTORS[0].accent,
    emissive: SECTORS[0].accent,
    emissiveIntensity: 1.5,
  });

  const monolithCount = 34;
  for (let i = 0; i < monolithCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const width = 2.6 + Math.random() * 4.5;
    const height = 10 + Math.random() * 28;
    const depth = 2.8 + Math.random() * 5.5;

    const mGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), monolithMat);
    bodyMesh.position.y = height / 2;
    mGroup.add(bodyMesh);

    const capMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.92, 0.45, depth * 0.92),
      gantryMaterial
    );
    capMesh.position.y = height + 0.2;
    mGroup.add(capMesh);

    if (i % 2 === 0) {
      const slitH = height * (0.45 + Math.random() * 0.35);
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.1, slitH, 0.14), monolithSlitMat);
      slit.position.set(
        -side * (width / 2 + 0.02),
        height * 0.52 + (Math.random() - 0.5) * height * 0.16,
        depth * 0.22
      );
      mGroup.add(slit);
    }

    const xOffset = side * (CONFIG.ROAD_WIDTH / 2 + 5.5 + Math.random() * 22);
    const zPos = 25 - (i / monolithCount) * CONFIG.SEGMENT_LENGTH;
    mGroup.position.set(xOffset, -0.04, zPos);
    scene.add(mGroup);
    monoliths.push(mGroup);
  }

  const skylineGroup = new THREE.Group();
  const skylineMat = new THREE.MeshBasicMaterial({
    color: 0x06080f,
    fog: true,
  });
  for (let i = 0; i < 42; i++) {
    const angle = (i / 41 - 0.5) * Math.PI * 0.72;
    const radius = 290 + (i % 3) * 18;
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius;
    if (Math.abs(x) < 18) continue;
    const w = 16 + (i % 5) * 9;
    const h = 24 + ((i * 17) % 58);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 18), skylineMat);
    tower.position.set(x, h / 2 - 2, z);
    skylineGroup.add(tower);
  }
  scene.add(skylineGroup);

  return {
    roadGroup,
    laneDashes,
    gantries,
    monoliths,
    railEdgeMat,
    gantryLightStripMat,
    monolithMat,
    monolithSlitMat,
    gantryCount,
    gantrySpacing,
  };
}

export function buildPlayerSupercar(
  scene: THREE.Scene,
  shadowTexture: THREE.CanvasTexture
): PlayerSupercarRig {
  const root = new THREE.Group();
  root.position.set(0, 0, CONFIG.PLAYER_Z);
  scene.add(root);

  const carVisual = new THREE.Group();
  root.add(carVisual);

  const playerShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 5.1),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.025;
  root.add(playerShadow);

  const carBodyMat = new THREE.MeshStandardMaterial({
    color: 0x16181f,
    roughness: 0.24,
    metalness: 0.78,
  });
  const carTrimMat = new THREE.MeshStandardMaterial({
    color: 0x090a0e,
    roughness: 0.56,
    metalness: 0.35,
  });
  const canopyGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x050912,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  const carProfile = new THREE.Shape();
  carProfile.moveTo(-2.15, 0.22);
  carProfile.lineTo(-2.12, 0.44);
  carProfile.lineTo(-1.15, 0.68);
  carProfile.lineTo(-0.35, 1.08);
  carProfile.lineTo(0.65, 1.08);
  carProfile.lineTo(1.78, 0.78);
  carProfile.lineTo(2.12, 0.72);
  carProfile.lineTo(2.08, 0.26);
  carProfile.lineTo(-2.15, 0.22);

  const sculptedBodyGeo = new THREE.ExtrudeGeometry(carProfile, {
    steps: 1,
    depth: 1.56,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.09,
    bevelSegments: 3,
  });
  sculptedBodyGeo.rotateY(-Math.PI / 2);
  sculptedBodyGeo.translate(0.78, 0, 0);

  const sculptedBody = new THREE.Mesh(sculptedBodyGeo, carBodyMat);
  sculptedBody.castShadow = true;
  carVisual.add(sculptedBody);

  const canopyProfile = new THREE.Shape();
  canopyProfile.moveTo(-1.05, 0.69);
  canopyProfile.lineTo(-0.32, 1.09);
  canopyProfile.lineTo(0.62, 1.09);
  canopyProfile.lineTo(1.52, 0.8);
  canopyProfile.lineTo(-1.05, 0.69);

  const canopyGeo = new THREE.ExtrudeGeometry(canopyProfile, {
    steps: 1,
    depth: 1.24,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  canopyGeo.rotateY(-Math.PI / 2);
  canopyGeo.translate(0.62, 0.01, 0);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyGlassMat);
  carVisual.add(canopyMesh);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.06, 0.55), carTrimMat);
  splitter.position.set(0, 0.2, -1.98);
  carVisual.add(splitter);

  const sideSkirtGeo = new THREE.BoxGeometry(0.14, 0.08, 2.5);
  const skirtL = new THREE.Mesh(sideSkirtGeo, carTrimMat);
  skirtL.position.set(-0.96, 0.22, 0);
  const skirtR = new THREE.Mesh(sideSkirtGeo, carTrimMat);
  skirtR.position.set(0.96, 0.22, 0);
  carVisual.add(skirtL, skirtR);

  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.05, 0.28), carTrimMat);
  wingBlade.position.set(0, 0.96, 1.98);
  wingBlade.rotation.x = 0.08;
  const strutGeo = new THREE.BoxGeometry(0.05, 0.24, 0.16);
  const strutL = new THREE.Mesh(strutGeo, carTrimMat);
  strutL.position.set(-0.55, 0.84, 1.94);
  const strutR = new THREE.Mesh(strutGeo, carTrimMat);
  strutR.position.set(0.55, 0.84, 1.94);
  carVisual.add(wingBlade, strutL, strutR);

  const wheels: WheelRig[] = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.82, metalness: 0.08 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xa6b0be, roughness: 0.22, metalness: 0.92 });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: SECTORS[0].accent,
    emissive: SECTORS[0].accent,
    emissiveIntensity: 1.2,
  });

  const wheelCoords: Array<[number, number, number]> = [
    [-0.92, 0.36, -1.32],
    [0.92, 0.36, -1.32],
    [-0.94, 0.38, 1.32],
    [0.94, 0.38, 1.32],
  ];

  wheelCoords.forEach(([wx, wy, wz], idx) => {
    const isRear = idx >= 2;
    const radius = isRear ? 0.38 : 0.36;
    const width = isRear ? 0.32 : 0.27;

    const wheelAssembly = new THREE.Group();
    wheelAssembly.position.set(wx, wy, wz);

    const spinGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), tireMat);
    tire.rotation.z = Math.PI / 2;
    spinGroup.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, width + 0.015, 16),
      rimMat
    );
    rim.rotation.z = Math.PI / 2;
    spinGroup.add(rim);

    const spoke1 = new THREE.Mesh(new THREE.BoxGeometry(width + 0.025, radius * 1.22, 0.045), carTrimMat);
    const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(width + 0.025, 0.045, radius * 1.22), carTrimMat);
    spinGroup.add(spoke1, spoke2);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.16, 0.14), caliperMat);
    caliper.position.set(0, 0.08, isRear ? -0.14 : 0.14);

    wheelAssembly.add(spinGroup, caliper);
    carVisual.add(wheelAssembly);
    wheels.push({ assembly: wheelAssembly, spinner: spinGroup, isFront: !isRear });
  });

  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xdff8ff,
    emissiveIntensity: 3.0,
  });
  const hlGeo = new THREE.BoxGeometry(0.46, 0.055, 0.14);
  const hlLeft = new THREE.Mesh(hlGeo, headLightMat);
  hlLeft.position.set(-0.62, 0.44, -2.14);
  hlLeft.rotation.y = 0.16;
  const hlRight = new THREE.Mesh(hlGeo, headLightMat);
  hlRight.position.set(0.62, 0.44, -2.14);
  hlRight.rotation.y = -0.16;
  carVisual.add(hlLeft, hlRight);

  const headSpotL = new THREE.SpotLight(0xd8f3ff, 2.6, 58, Math.PI / 5.2, 0.55, 1.2);
  headSpotL.position.set(-0.6, 0.52, -2.05);
  headSpotL.target.position.set(-1.2, 0.0, -26);
  carVisual.add(headSpotL, headSpotL.target);

  const headSpotR = new THREE.SpotLight(0xd8f3ff, 2.6, 58, Math.PI / 5.2, 0.55, 1.2);
  headSpotR.position.set(0.6, 0.52, -2.05);
  headSpotR.target.position.set(1.2, 0.0, -26);
  carVisual.add(headSpotR, headSpotR.target);

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1e42,
    emissive: 0xff1e42,
    emissiveIntensity: 2.8,
  });
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.065, 0.1), tailMat);
  tailBar.position.set(0, 0.68, 2.11);
  carVisual.add(tailBar);

  const tailGlowLight = new THREE.PointLight(0xff1e42, 1.3, 6.5);
  tailGlowLight.position.set(0, 0.65, 2.45);
  carVisual.add(tailGlowLight);

  const nitroMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nitroCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const createThrusterCone = (xPos: number): THREE.Group => {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.9, 14, 1, true), nitroMat);
    outer.rotation.x = Math.PI / 2;
    outer.position.z = 0.95;

    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.15, 12, 1, true), nitroCoreMat);
    inner.rotation.x = Math.PI / 2;
    inner.position.z = 0.58;

    g.add(outer, inner);
    g.position.set(xPos, 0.34, 2.1);
    return g;
  };
  const exhaustLeft = createThrusterCone(-0.42);
  const exhaustRight = createThrusterCone(0.42);
  carVisual.add(exhaustLeft, exhaustRight);

  return {
    root,
    carVisual,
    wheels,
    tailMat,
    tailGlowLight,
    caliperMat,
    nitroMat,
    nitroCoreMat,
    exhaustLeft,
    exhaustRight,
  };
}

export function createObstacleSharedMaterials(): ObstacleSharedMaterials {
  return {
    obsBodyMat: new THREE.MeshStandardMaterial({
      color: 0x1e212b,
      roughness: 0.32,
      metalness: 0.68,
    }),
    obsHaulerMat: new THREE.MeshStandardMaterial({
      color: 0x15171e,
      roughness: 0.48,
      metalness: 0.52,
    }),
    obsGlassMat: new THREE.MeshPhysicalMaterial({
      color: 0x05070b,
      roughness: 0.1,
      metalness: 0.25,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
    }),
    obsTailMat: new THREE.MeshStandardMaterial({
      color: 0xff2a5f,
      emissive: 0xff2a5f,
      emissiveIntensity: 2.2,
    }),
    obsHeadMat: new THREE.MeshStandardMaterial({
      color: 0xfff3d6,
      emissive: 0xfff3d6,
      emissiveIntensity: 1.6,
    }),
    sweeperAccentMat: new THREE.MeshStandardMaterial({
      color: 0xff9e00,
      emissive: 0xff9e00,
      emissiveIntensity: 2.4,
    }),
    obsRimMat: new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      roughness: 0.72,
      metalness: 0.2,
    }),
  };
}

export function createObstacleMesh(
  type: 'TRAFFIC' | 'SWEEPER',
  shadowTexture: THREE.CanvasTexture,
  mats: ObstacleSharedMaterials
): { mesh: THREE.Group; halfW: number; halfD: number; isHauler: boolean } {
  const g = new THREE.Group();

  if (type === 'SWEEPER') {
    const w = 3.2;
    const h = 1.15;
    const d = 1.6;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.obsHaulerMat);
    body.position.y = h / 2 + 0.18;
    g.add(body);

    const sidePodGeo = new THREE.BoxGeometry(0.28, h * 0.72, d * 1.12);
    const podL = new THREE.Mesh(sidePodGeo, mats.obsBodyMat);
    podL.position.set(-w / 2 - 0.08, h * 0.45 + 0.16, 0);
    const podR = new THREE.Mesh(sidePodGeo, mats.obsBodyMat);
    podR.position.set(w / 2 + 0.08, h * 0.45 + 0.16, 0);
    g.add(podL, podR);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.16, 0.14), mats.sweeperAccentMat);
    bumper.position.set(0, 0.58, d / 2 + 0.05);
    g.add(bumper);

    const topStrip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.08, d * 0.6), mats.sweeperAccentMat);
    topStrip.position.set(0, h + 0.2, 0);
    g.add(topStrip);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.24, d * 1.45),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.8, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    g.add(shadow);

    return { mesh: g, halfW: w * 0.46, halfD: d * 0.46, isHauler: false };
  }

  const variant = Math.random();
  let w = 1.94;
  let h = 1.36;
  let d = 4.6;
  let isHauler = false;

  if (variant < 0.34) {
    w = 1.88;
    h = 1.16;
    d = 4.2;
  } else if (variant >= 0.72) {
    w = 2.26;
    h = 2.45;
    d = 6.6;
    isHauler = true;
  }

  const lowerBody = new THREE.Mesh(
    new THREE.BoxGeometry(w, isHauler ? h * 0.88 : h * 0.52, d),
    isHauler ? mats.obsHaulerMat : mats.obsBodyMat
  );
  lowerBody.position.y = (isHauler ? h * 0.44 : h * 0.26) + 0.22;
  g.add(lowerBody);

  if (!isHauler) {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, h * 0.44, d * 0.52), mats.obsGlassMat);
    cabin.position.set(0, h * 0.7 + 0.16, 0.12);
    g.add(cabin);
  } else {
    const visor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.38, 0.12), mats.obsGlassMat);
    visor.position.set(0, h * 0.72, -d / 2 - 0.02);
    g.add(visor);

    const markerGeo = new THREE.BoxGeometry(0.08, h * 0.72, 0.12);
    const mL = new THREE.Mesh(markerGeo, mats.obsTailMat);
    mL.position.set(-w / 2 + 0.1, h * 0.5, d / 2 + 0.03);
    const mR = new THREE.Mesh(markerGeo, mats.obsTailMat);
    mR.position.set(w / 2 - 0.1, h * 0.5, d / 2 + 0.03);
    g.add(mL, mR);
  }

  // 4 grounded wheel arches / tires
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
  const wheelZ = d * 0.32;
  const wheelX = w * 0.48;
  const wheelPos: Array<[number, number]> = [
    [-wheelX, -wheelZ],
    [wheelX, -wheelZ],
    [-wheelX, wheelZ],
    [wheelX, wheelZ],
  ];
  wheelPos.forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(wheelGeo, mats.obsRimMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, 0.34, wz);
    g.add(tire);
  });

  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.11, 0.08), mats.obsTailMat);
  tailBar.position.set(0, isHauler ? 0.82 : 0.66, d / 2 + 0.03);
  g.add(tailBar);

  const frontBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.09, 0.08), mats.obsHeadMat);
  frontBar.position.set(0, 0.56, -d / 2 - 0.03);
  g.add(frontBar);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 1.32, d * 1.18),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.84, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  g.add(shadow);

  return { mesh: g, halfW: w * 0.44, halfD: d * 0.45, isHauler };
}
