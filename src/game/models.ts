import * as THREE from 'three';
import { CONFIG, SECTORS } from './constants';

export interface WheelRig {
  assembly: THREE.Group;
  spinner: THREE.Group;
  isFront: boolean;
  side: -1 | 1;
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
  roadMat: THREE.MeshStandardMaterial;
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

interface ObstacleGeometryBank {
  // Sedan
  sedanHull: THREE.BufferGeometry;
  sedanSpine: THREE.BufferGeometry;
  sedanCanopy: THREE.BufferGeometry;
  sedanSplitter: THREE.BufferGeometry;
  sedanSpoiler: THREE.BufferGeometry;
  sedanDiffuser: THREE.BufferGeometry;
  // Cyber-Truck
  truckCabHull: THREE.BufferGeometry;
  truckVisor: THREE.BufferGeometry;
  truckBedFloor: THREE.BufferGeometry;
  truckBedSideWall: THREE.BufferGeometry;
  truckCargoCell: THREE.BufferGeometry;
  truckBumper: THREE.BufferGeometry;
  // Interceptor
  intHull: THREE.BufferGeometry;
  intSpine: THREE.BufferGeometry;
  intCanopy: THREE.BufferGeometry;
  intWing: THREE.BufferGeometry;
  intFin: THREE.BufferGeometry;
  // Sweeper
  sweeperHull: THREE.BufferGeometry;
  sweeperPod: THREE.BufferGeometry;
  // Shared vehicle parts
  archFlare: THREE.BufferGeometry;
  truckArchFlare: THREE.BufferGeometry;
  wheelTire: THREE.BufferGeometry;
  wheelRim: THREE.BufferGeometry;
  wheelNeonRing: THREE.BufferGeometry;
  truckTire: THREE.BufferGeometry;
  truckRim: THREE.BufferGeometry;
  truckNeonRing: THREE.BufferGeometry;
  exhaustPipe: THREE.BufferGeometry;
  beamPlane: THREE.BufferGeometry;
  shadowPlane: THREE.BufferGeometry;
  // Cached light bars & trim strips
  sweeperFrontBlade: THREE.BufferGeometry;
  sweeperRearBar: THREE.BufferGeometry;
  sweeperTopStrip: THREE.BufferGeometry;
  truckTailgate: THREE.BufferGeometry;
  truckCellStrip: THREE.BufferGeometry;
  truckRailNeon: THREE.BufferGeometry;
  truckHeadBar: THREE.BufferGeometry;
  truckTailBar: THREE.BufferGeometry;
  truckTailPillar: THREE.BufferGeometry;
  intSideBlade: THREE.BufferGeometry;
  intTailBar: THREE.BufferGeometry;
  sedanSillNeon: THREE.BufferGeometry;
  sedanTailBar: THREE.BufferGeometry;
  carHeadlightBar: THREE.BufferGeometry;
}

export interface ObstacleSharedMaterials {
  obsBodyMat: THREE.MeshStandardMaterial;
  obsInterceptorMat: THREE.MeshStandardMaterial;
  obsHaulerMat: THREE.MeshStandardMaterial;
  obsTrimMat: THREE.MeshStandardMaterial;
  obsGlassMat: THREE.MeshPhysicalMaterial;
  obsTailMat: THREE.MeshStandardMaterial;
  obsHeadMat: THREE.MeshStandardMaterial;
  sweeperAccentMat: THREE.MeshStandardMaterial;
  obsNeonCyanMat: THREE.MeshStandardMaterial;
  obsNeonMagentaMat: THREE.MeshStandardMaterial;
  obsNeonAmberMat: THREE.MeshStandardMaterial;
  obsTireMat: THREE.MeshStandardMaterial;
  obsAlloyMat: THREE.MeshStandardMaterial;
  obsBeamMat: THREE.MeshBasicMaterial;
  obsShadowMat: THREE.MeshBasicMaterial;
  geometries: ObstacleGeometryBank;
}

/**
 * Helper to create a side-profile ExtrudeGeometry centered on X.
 * Shape coords: x = Z_world (-Z is front, +Z is rear), y = Y_world (height).
 */
function createSideExtrusion(
  shape: THREE.Shape,
  width: number,
  bevelThickness = 0.08,
  bevelSize = 0.05,
  bevelSegments = 2
): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: width,
    bevelEnabled: bevelThickness > 0 && bevelSize > 0,
    bevelThickness,
    bevelSize,
    bevelSegments,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(width / 2, 0, 0);
  return geo;
}

/**
 * Helper to create a top-down tapered ExtrudeGeometry starting at Y=0 and extruding upward.
 * Shape coords: x = X_world, y = -Z_world (+y points forward toward -Z).
 */
function createPlanExtrusion(
  shape: THREE.Shape,
  height: number,
  bevelThickness = 0.05,
  bevelSize = 0.04,
  bevelSegments = 2
): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: height,
    bevelEnabled: bevelThickness > 0 && bevelSize > 0,
    bevelThickness,
    bevelSize,
    bevelSegments,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/**
 * Creates a flared wheel arch shell wrapping over a wheel cutout.
 */
function createWheelArchGeometry(
  innerR: number,
  outerR: number,
  width: number,
  angularSpan = Math.PI * 0.92
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const startA = Math.PI / 2 - angularSpan / 2;
  const endA = Math.PI / 2 + angularSpan / 2;
  const steps = 10;

  for (let i = 0; i <= steps; i++) {
    const a = startA + (i / steps) * (endA - startA);
    const x = Math.cos(a) * outerR;
    const y = Math.sin(a) * outerR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const a = startA + (i / steps) * (endA - startA);
    shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
  }
  shape.closePath();

  return createSideExtrusion(shape, width, 0.03, 0.025, 1);
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
    roadMat,
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
  shadowTexture: THREE.CanvasTexture,
  beamTexture: THREE.CanvasTexture
): PlayerSupercarRig {
  const root = new THREE.Group();
  root.position.set(0, 0, CONFIG.PLAYER_Z);
  scene.add(root);

  const carVisual = new THREE.Group();
  root.add(carVisual);

  const playerShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 5.3),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    })
  );
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.025;
  root.add(playerShadow);

  const carBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x151822,
    roughness: 0.22,
    metalness: 0.78,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const carTrimMat = new THREE.MeshStandardMaterial({
    color: 0x090b10,
    roughness: 0.56,
    metalness: 0.35,
  });
  const exhaustMetalMat = new THREE.MeshStandardMaterial({
    color: 0x8d97a8,
    roughness: 0.24,
    metalness: 0.94,
  });
  const canopyGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x040914,
    roughness: 0.05,
    metalness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.75,
  });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: SECTORS[0].accent,
    emissive: SECTORS[0].accent,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  // 1. Tapered, Sculpted Lower Fuselage (plan-view extrusion so nose & waist taper dynamically)
  const hullPlan = new THREE.Shape();
  hullPlan.moveTo(-0.56, 2.20); // sharp front nose left
  hullPlan.lineTo(0.56, 2.20);  // sharp front nose right
  hullPlan.lineTo(0.84, 1.80);  // tapered front bumper corner
  hullPlan.lineTo(0.95, 1.32);  // front wheel arch shoulder
  hullPlan.lineTo(0.84, 0.55);  // waisted door intake channel
  hullPlan.lineTo(0.99, -0.82); // muscular rear haunch
  hullPlan.lineTo(0.97, -1.58); // rear wheel shoulder
  hullPlan.lineTo(0.85, -2.06); // tapered rear bumper corner
  hullPlan.lineTo(-0.85, -2.06);
  hullPlan.lineTo(-0.97, -1.58);
  hullPlan.lineTo(-0.99, -0.82);
  hullPlan.lineTo(-0.84, 0.55);
  hullPlan.lineTo(-0.95, 1.32);
  hullPlan.lineTo(-0.84, 1.80);
  hullPlan.closePath();

  const lowerHullGeo = createPlanExtrusion(hullPlan, 0.34, 0.07, 0.05, 2);
  const lowerHull = new THREE.Mesh(lowerHullGeo, carBodyMat);
  lowerHull.position.y = 0.23;
  lowerHull.castShadow = true;
  carVisual.add(lowerHull);

  // 2. Sculpted Sloped Central Spine & Fastback Deck
  const spineProfile = new THREE.Shape();
  spineProfile.moveTo(-2.14, 0.32);
  spineProfile.lineTo(-1.82, 0.52);
  spineProfile.lineTo(-1.05, 0.68);
  spineProfile.lineTo(-0.34, 1.05);
  spineProfile.lineTo(0.50, 1.05);
  spineProfile.lineTo(1.66, 0.77);
  spineProfile.lineTo(2.08, 0.70);
  spineProfile.lineTo(2.00, 0.28);
  spineProfile.closePath();

  const spineGeo = createSideExtrusion(spineProfile, 1.18, 0.1, 0.06, 3);
  const spineMesh = new THREE.Mesh(spineGeo, carBodyMat);
  spineMesh.castShadow = true;
  carVisual.add(spineMesh);

  // Sculpted Roof Frame Rails (create a recessed pocket for the glass cabin)
  const roofFrameProfile = new THREE.Shape();
  roofFrameProfile.moveTo(-1.02, 0.67);
  roofFrameProfile.lineTo(-0.34, 1.07);
  roofFrameProfile.lineTo(0.52, 1.07);
  roofFrameProfile.lineTo(1.38, 0.80);
  roofFrameProfile.lineTo(1.18, 0.73);
  roofFrameProfile.lineTo(0.45, 0.99);
  roofFrameProfile.lineTo(-0.28, 0.99);
  roofFrameProfile.lineTo(-0.88, 0.67);
  roofFrameProfile.closePath();

  const railSideGeo = createSideExtrusion(roofFrameProfile, 0.10, 0.02, 0.02, 1);
  const railL = new THREE.Mesh(railSideGeo, carBodyMat);
  railL.position.x = -0.60;
  const railR = new THREE.Mesh(railSideGeo, carBodyMat);
  railR.position.x = 0.60;
  carVisual.add(railL, railR);

  // 3. Recessed Dark-Tinted Glass Cabin & Windshield
  const canopyProfile = new THREE.Shape();
  canopyProfile.moveTo(-1.04, 0.66);
  canopyProfile.lineTo(-0.36, 1.03);
  canopyProfile.lineTo(0.48, 1.03);
  canopyProfile.lineTo(1.32, 0.78);
  canopyProfile.lineTo(-1.04, 0.66);

  const canopyGeo = createSideExtrusion(canopyProfile, 1.12, 0.04, 0.03, 2);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyGlassMat);
  carVisual.add(canopyMesh);

  // Recessed side window dark glass panels
  const sideWinGeo = new THREE.BoxGeometry(0.05, 0.22, 1.32);
  const sideWinL = new THREE.Mesh(sideWinGeo, canopyGlassMat);
  sideWinL.position.set(-0.57, 0.81, 0.05);
  sideWinL.rotation.z = -0.24;
  const sideWinR = new THREE.Mesh(sideWinGeo, canopyGlassMat);
  sideWinR.position.set(0.57, 0.81, 0.05);
  sideWinR.rotation.z = 0.24;
  carVisual.add(sideWinL, sideWinR);

  // Fastback Engine Louver Slats
  const louverGeo = new THREE.BoxGeometry(0.86, 0.035, 0.14);
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(louverGeo, carTrimMat);
    slat.position.set(0, 0.88 - i * 0.045, 1.04 + i * 0.20);
    slat.rotation.x = 0.22;
    carVisual.add(slat);
  }

  // 4. Sculpted Front Chin Splitter, Intake Grille & Side Aero Canards
  const splitterPlan = new THREE.Shape();
  splitterPlan.moveTo(-0.62, 2.34);
  splitterPlan.lineTo(0.62, 2.34);
  splitterPlan.lineTo(0.98, 1.88);
  splitterPlan.lineTo(0.86, 1.65);
  splitterPlan.lineTo(-0.86, 1.65);
  splitterPlan.lineTo(-0.98, 1.88);
  splitterPlan.closePath();
  const splitter = new THREE.Mesh(createPlanExtrusion(splitterPlan, 0.045, 0.015, 0.015, 1), carTrimMat);
  splitter.position.y = 0.16;
  carVisual.add(splitter);

  const frontIntake = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.15, 0.14), carTrimMat);
  frontIntake.position.set(0, 0.27, -2.20);
  const frontNeonLip = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.028, 0.05), caliperMat);
  frontNeonLip.position.set(0, 0.21, -2.28);
  carVisual.add(frontIntake, frontNeonLip);

  const canardGeo = new THREE.BoxGeometry(0.18, 0.03, 0.34);
  const canardL = new THREE.Mesh(canardGeo, carTrimMat);
  canardL.position.set(-0.92, 0.26, -1.92);
  canardL.rotation.y = 0.24;
  canardL.rotation.z = 0.12;
  const canardR = new THREE.Mesh(canardGeo, carTrimMat);
  canardR.position.set(0.92, 0.26, -1.92);
  canardR.rotation.y = -0.24;
  canardR.rotation.z = -0.12;
  carVisual.add(canardL, canardR);

  // Side Skirts & Glowing Neon Sill Blades
  const skirtGeo = new THREE.BoxGeometry(0.15, 0.07, 2.18);
  const sillNeonGeo = new THREE.BoxGeometry(0.035, 0.028, 1.98);
  const skirtL = new THREE.Mesh(skirtGeo, carTrimMat);
  skirtL.position.set(-0.93, 0.19, -0.02);
  const skirtR = new THREE.Mesh(skirtGeo, carTrimMat);
  skirtR.position.set(0.93, 0.19, -0.02);
  const sillNeonL = new THREE.Mesh(sillNeonGeo, caliperMat);
  sillNeonL.position.set(-0.99, 0.21, -0.02);
  const sillNeonR = new THREE.Mesh(sillNeonGeo, caliperMat);
  sillNeonR.position.set(0.99, 0.21, -0.02);
  carVisual.add(skirtL, skirtR, sillNeonL, sillNeonR);

  // 5. Flared Wheel Arches (4x)
  const frontArchGeo = createWheelArchGeometry(0.41, 0.51, 0.26);
  const rearArchGeo = createWheelArchGeometry(0.43, 0.54, 0.30);
  const archSpecs: Array<[number, number, number, THREE.BufferGeometry]> = [
    [-0.95, 0.36, -1.36, frontArchGeo],
    [0.95, 0.36, -1.36, frontArchGeo],
    [-0.97, 0.38, 1.34, rearArchGeo],
    [0.97, 0.38, 1.34, rearArchGeo],
  ];
  archSpecs.forEach(([ax, ay, az, geo]) => {
    const arch = new THREE.Mesh(geo, carBodyMat);
    arch.position.set(ax, ay, az);
    carVisual.add(arch);
  });

  // 6. Raised Swept Rear Spoiler Wing + Swan-Neck Pylons + Endplates
  const wingPlan = new THREE.Shape();
  wingPlan.moveTo(-0.98, 0.16);
  wingPlan.lineTo(0.98, 0.16);
  wingPlan.lineTo(0.90, -0.14);
  wingPlan.lineTo(-0.90, -0.14);
  wingPlan.closePath();
  const wingBlade = new THREE.Mesh(
    createPlanExtrusion(wingPlan, 0.045, 0.015, 0.015, 1),
    carTrimMat
  );
  wingBlade.position.set(0, 0.99, 2.04);
  wingBlade.rotation.x = 0.12;

  const endplateGeo = new THREE.BoxGeometry(0.035, 0.18, 0.34);
  const endplateL = new THREE.Mesh(endplateGeo, carTrimMat);
  endplateL.position.set(-0.98, 0.98, 2.04);
  endplateL.rotation.y = 0.08;
  const endplateR = new THREE.Mesh(endplateGeo, carTrimMat);
  endplateR.position.set(0.98, 0.98, 2.04);
  endplateR.rotation.y = -0.08;

  const wingNeonGeo = new THREE.BoxGeometry(0.02, 0.09, 0.24);
  const wingNeonL = new THREE.Mesh(wingNeonGeo, caliperMat);
  wingNeonL.position.set(-1.0, 0.98, 2.04);
  const wingNeonR = new THREE.Mesh(wingNeonGeo, caliperMat);
  wingNeonR.position.set(1.0, 0.98, 2.04);

  const pylonGeo = new THREE.BoxGeometry(0.055, 0.29, 0.18);
  const pylonL = new THREE.Mesh(pylonGeo, carTrimMat);
  pylonL.position.set(-0.50, 0.85, 1.94);
  pylonL.rotation.x = -0.22;
  const pylonR = new THREE.Mesh(pylonGeo, carTrimMat);
  pylonR.position.set(0.50, 0.85, 1.94);
  pylonR.rotation.x = -0.22;
  carVisual.add(wingBlade, endplateL, endplateR, wingNeonL, wingNeonR, pylonL, pylonR);

  // 7. Detailed Rear Diffuser & Sculpted Rear Bumper
  const rearFascia = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.32, 0.12), carTrimMat);
  rearFascia.position.set(0, 0.45, 2.07);
  carVisual.add(rearFascia);

  const diffuserTray = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.06, 0.34), carTrimMat);
  diffuserTray.position.set(0, 0.19, 2.02);
  diffuserTray.rotation.x = -0.14;
  carVisual.add(diffuserTray);

  const finGeo = new THREE.BoxGeometry(0.04, 0.16, 0.28);
  [-0.64, -0.32, 0, 0.32, 0.64].forEach((fx) => {
    const fin = new THREE.Mesh(finGeo, carTrimMat);
    fin.position.set(fx, 0.22, 2.07);
    carVisual.add(fin);
  });

  // Dual Metallic Exhaust Pipes
  const exhaustOuterGeo = new THREE.CylinderGeometry(0.092, 0.098, 0.24, 16);
  const exhaustBoreGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.25, 14);
  const exhaustRingGeo = new THREE.TorusGeometry(0.075, 0.012, 8, 20);
  [-0.44, 0.44].forEach((ex) => {
    const pipe = new THREE.Mesh(exhaustOuterGeo, exhaustMetalMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.31, 2.08);

    const bore = new THREE.Mesh(exhaustBoreGeo, carTrimMat);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(ex, 0.31, 2.085);

    const heatRing = new THREE.Mesh(exhaustRingGeo, caliperMat);
    heatRing.position.set(ex, 0.31, 2.205);

    carVisual.add(pipe, bore, heatRing);
  });

  // 8. Rotating 3D Wheels with Glowing Neon Rim Rings & Calipers
  const wheels: WheelRig[] = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.84, metalness: 0.08 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb6c0ce, roughness: 0.20, metalness: 0.94 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x565d68, roughness: 0.35, metalness: 0.85 });

  const wheelCoords: Array<[number, number, number, -1 | 1]> = [
    [-0.95, 0.36, -1.36, -1],
    [0.95, 0.36, -1.36, 1],
    [-0.97, 0.38, 1.34, -1],
    [0.97, 0.38, 1.34, 1],
  ];

  wheelCoords.forEach(([wx, wy, wz, side], idx) => {
    const isRear = idx >= 2;
    const radius = isRear ? 0.38 : 0.36;
    const width = isRear ? 0.32 : 0.27;

    const wheelAssembly = new THREE.Group();
    wheelAssembly.position.set(wx, wy, wz);

    const spinGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 24), tireMat);
    tire.rotation.z = Math.PI / 2;
    spinGroup.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width + 0.012, 18),
      carTrimMat
    );
    rim.rotation.z = Math.PI / 2;
    spinGroup.add(rim);

    // 5-Spoke Metallic Alloy Pattern
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.022, radius * 0.68, 0.042),
        rimMat
      );
      spoke.rotation.x = (s / 5) * Math.PI * 2;
      spoke.position.y = Math.cos(spoke.rotation.x) * radius * 0.32;
      spoke.position.z = Math.sin(spoke.rotation.x) * radius * 0.32;
      spinGroup.add(spoke);
    }

    const hubCap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.20, radius * 0.20, width + 0.032, 12),
      caliperMat
    );
    hubCap.rotation.z = Math.PI / 2;
    spinGroup.add(hubCap);

    // Glowing Neon Rim Ring on outer wheel face
    const neonRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.70, 0.02, 8, 28),
      caliperMat
    );
    neonRing.rotation.y = Math.PI / 2;
    neonRing.position.x = side * (width * 0.5 + 0.008);
    spinGroup.add(neonRing);

    // Brake disc + caliper inside wheel assembly
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.54, radius * 0.54, width * 0.45, 16),
      discMat
    );
    disc.rotation.z = Math.PI / 2;
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, 0.16, 0.14), caliperMat);
    caliper.position.set(side * 0.03, 0.08, isRear ? -0.14 : 0.14);

    wheelAssembly.add(spinGroup, disc, caliper);
    carVisual.add(wheelAssembly);
    wheels.push({ assembly: wheelAssembly, spinner: spinGroup, isFront: !isRear, side });
  });

  // 9. Recessed Headlights + Volumetric Road Beams
  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xdff8ff,
    emissiveIntensity: 3.4,
  });
  const hlBucketGeo = new THREE.BoxGeometry(0.46, 0.10, 0.14);
  const hlBladeGeo = new THREE.BoxGeometry(0.42, 0.045, 0.08);

  [-1, 1].forEach((side) => {
    const bucket = new THREE.Mesh(hlBucketGeo, carTrimMat);
    bucket.position.set(side * 0.64, 0.44, -2.06);
    bucket.rotation.y = -side * 0.20;

    const blade = new THREE.Mesh(hlBladeGeo, headLightMat);
    blade.position.set(side * 0.65, 0.44, -2.09);
    blade.rotation.y = -side * 0.20;
    carVisual.add(bucket, blade);
  });

  // Volumetric road projection beams (soft gradient additive fans on asphalt)
  const beamGroundMat = new THREE.MeshBasicMaterial({
    map: beamTexture,
    color: 0xbef2ff,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamAirMat = new THREE.MeshBasicMaterial({
    map: beamTexture,
    color: 0x99e8ff,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const groundBeamGeo = new THREE.PlaneGeometry(3.2, 22);
  const airBeamGeo = new THREE.PlaneGeometry(1.75, 11.5);
  [-1, 1].forEach((side) => {
    // Road-skimming volumetric pool
    const gBeam = new THREE.Mesh(groundBeamGeo, beamGroundMat);
    gBeam.rotation.x = -Math.PI / 2;
    gBeam.rotation.z = -side * 0.045;
    gBeam.position.set(side * 0.85, 0.042, -13.1);
    root.add(gBeam);

    // Angled volumetric air-cone plane from recessed headlight
    const aBeam = new THREE.Mesh(airBeamGeo, beamAirMat);
    aBeam.rotation.x = -Math.PI / 2 + 0.04;
    aBeam.rotation.z = -side * 0.04;
    aBeam.position.set(side * 0.78, 0.34, -7.8);
    carVisual.add(aBeam);
  });

  const headSpotL = new THREE.SpotLight(0xd8f3ff, 2.8, 60, Math.PI / 5.0, 0.55, 1.2);
  headSpotL.position.set(-0.62, 0.50, -2.05);
  headSpotL.target.position.set(-1.2, 0.0, -26);
  carVisual.add(headSpotL, headSpotL.target);

  const headSpotR = new THREE.SpotLight(0xd8f3ff, 2.8, 60, Math.PI / 5.0, 0.55, 1.2);
  headSpotR.position.set(0.62, 0.50, -2.05);
  headSpotR.target.position.set(1.2, 0.0, -26);
  carVisual.add(headSpotR, headSpotR.target);

  // 10. Sculpted LED Tail Light Bar + Side Claws + F1 Rain Light
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1e42,
    emissive: 0xff1e42,
    emissiveIntensity: 3.0,
  });
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.052, 0.08), tailMat);
  tailBar.position.set(0, 0.67, 2.11);
  const tailClawGeo = new THREE.BoxGeometry(0.18, 0.13, 0.09);
  const tailClawL = new THREE.Mesh(tailClawGeo, tailMat);
  tailClawL.position.set(-0.76, 0.63, 2.09);
  tailClawL.rotation.z = 0.25;
  const tailClawR = new THREE.Mesh(tailClawGeo, tailMat);
  tailClawR.position.set(0.76, 0.63, 2.09);
  tailClawR.rotation.z = -0.25;
  const f1RainLight = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.075, 0.06), tailMat);
  f1RainLight.position.set(0, 0.25, 2.14);
  carVisual.add(tailBar, tailClawL, tailClawR, f1RainLight);

  const tailGlowLight = new THREE.PointLight(0xff1e42, 1.35, 6.8);
  tailGlowLight.position.set(0, 0.65, 2.45);
  carVisual.add(tailGlowLight);

  // 11. Multi-Layered Dual Nitro Thruster Flames (shooting from dual exhaust pipes)
  const nitroMat = new THREE.MeshBasicMaterial({
    color: 0x00d8ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nitroCoreMat = new THREE.MeshBasicMaterial({
    color: 0xe8fdff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const createThrusterCone = (xPos: number): THREE.Group => {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.145, 2.15, 14, 1, true), nitroMat);
    outer.rotation.x = Math.PI / 2;
    outer.position.z = 1.08;

    const mid = new THREE.Mesh(new THREE.ConeGeometry(0.095, 1.45, 12, 1, true), nitroMat);
    mid.rotation.x = Math.PI / 2;
    mid.position.z = 0.72;

    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.95, 10, 1, true), nitroCoreMat);
    inner.rotation.x = Math.PI / 2;
    inner.position.z = 0.48;

    g.add(outer, mid, inner);
    g.position.set(xPos, 0.31, 2.18);
    return g;
  };
  const exhaustLeft = createThrusterCone(-0.44);
  const exhaustRight = createThrusterCone(0.44);
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

function buildObstacleGeometryBank(): ObstacleGeometryBank {
  // --- SEDAN ---
  const sedanPlan = new THREE.Shape();
  sedanPlan.moveTo(-0.58, 2.22);
  sedanPlan.lineTo(0.58, 2.22);
  sedanPlan.lineTo(0.86, 1.84);
  sedanPlan.lineTo(0.92, 1.32);
  sedanPlan.lineTo(0.86, 0.40);
  sedanPlan.lineTo(0.94, -1.28);
  sedanPlan.lineTo(0.84, -2.14);
  sedanPlan.lineTo(-0.84, -2.14);
  sedanPlan.lineTo(-0.94, -1.28);
  sedanPlan.lineTo(-0.86, 0.40);
  sedanPlan.lineTo(-0.92, 1.32);
  sedanPlan.lineTo(-0.86, 1.84);
  sedanPlan.closePath();

  const sedanSpineShape = new THREE.Shape();
  sedanSpineShape.moveTo(-2.14, 0.30);
  sedanSpineShape.lineTo(-1.28, 0.62);
  sedanSpineShape.lineTo(-0.48, 1.14);
  sedanSpineShape.lineTo(0.62, 1.14);
  sedanSpineShape.lineTo(1.56, 0.74);
  sedanSpineShape.lineTo(2.08, 0.68);
  sedanSpineShape.lineTo(2.02, 0.28);
  sedanSpineShape.closePath();

  const sedanCanopyShape = new THREE.Shape();
  sedanCanopyShape.moveTo(-1.14, 0.63);
  sedanCanopyShape.lineTo(-0.44, 1.11);
  sedanCanopyShape.lineTo(0.58, 1.11);
  sedanCanopyShape.lineTo(1.36, 0.76);
  sedanCanopyShape.closePath();

  // --- CYBER-TRUCK (with open cargo bed) ---
  const truckCabPlan = new THREE.Shape();
  truckCabPlan.moveTo(-0.76, 2.95);
  truckCabPlan.lineTo(0.76, 2.95);
  truckCabPlan.lineTo(1.06, 2.48);
  truckCabPlan.lineTo(1.10, -0.15);
  truckCabPlan.lineTo(-1.10, -0.15);
  truckCabPlan.lineTo(-1.06, 2.48);
  truckCabPlan.closePath();

  const truckVisorShape = new THREE.Shape();
  truckVisorShape.moveTo(-2.72, 0.88);
  truckVisorShape.lineTo(-1.82, 1.66);
  truckVisorShape.lineTo(-0.35, 1.66);
  truckVisorShape.lineTo(-0.35, 0.88);
  truckVisorShape.closePath();

  // --- INTERCEPTOR ---
  const intPlan = new THREE.Shape();
  intPlan.moveTo(-0.48, 2.26);
  intPlan.lineTo(0.48, 2.26);
  intPlan.lineTo(0.84, 1.78);
  intPlan.lineTo(0.92, 1.24);
  intPlan.lineTo(0.82, 0.35);
  intPlan.lineTo(1.00, -1.25);
  intPlan.lineTo(0.86, -2.08);
  intPlan.lineTo(-0.86, -2.08);
  intPlan.lineTo(-1.00, -1.25);
  intPlan.lineTo(-0.82, 0.35);
  intPlan.lineTo(-0.92, 1.24);
  intPlan.lineTo(-0.84, 1.78);
  intPlan.closePath();

  const intSpineShape = new THREE.Shape();
  intSpineShape.moveTo(-2.18, 0.24);
  intSpineShape.lineTo(-1.10, 0.56);
  intSpineShape.lineTo(-0.32, 0.96);
  intSpineShape.lineTo(0.55, 0.96);
  intSpineShape.lineTo(1.75, 0.64);
  intSpineShape.lineTo(2.06, 0.58);
  intSpineShape.lineTo(1.98, 0.24);
  intSpineShape.closePath();

  const intCanopyShape = new THREE.Shape();
  intCanopyShape.moveTo(-0.98, 0.58);
  intCanopyShape.lineTo(-0.30, 0.94);
  intCanopyShape.lineTo(0.50, 0.94);
  intCanopyShape.lineTo(1.18, 0.68);
  intCanopyShape.closePath();

  // --- SWEEPER ---
  const sweeperShape = new THREE.Shape();
  sweeperShape.moveTo(-0.80, 0.22);
  sweeperShape.lineTo(-0.46, 0.95);
  sweeperShape.lineTo(0.42, 1.05);
  sweeperShape.lineTo(0.80, 0.58);
  sweeperShape.lineTo(0.76, 0.22);
  sweeperShape.closePath();

  return {
    sedanHull: createPlanExtrusion(sedanPlan, 0.38, 0.05, 0.04, 2),
    sedanSpine: createSideExtrusion(sedanSpineShape, 1.24, 0.07, 0.04, 2),
    sedanCanopy: createSideExtrusion(sedanCanopyShape, 1.14, 0.04, 0.03, 1),
    sedanSplitter: new THREE.BoxGeometry(1.72, 0.06, 0.36),
    sedanSpoiler: new THREE.BoxGeometry(1.76, 0.05, 0.24),
    sedanDiffuser: new THREE.BoxGeometry(1.56, 0.16, 0.14),

    truckCabHull: createPlanExtrusion(truckCabPlan, 1.28, 0.06, 0.05, 1),
    truckVisor: createSideExtrusion(truckVisorShape, 1.66, 0.03, 0.02, 1),
    truckBedFloor: new THREE.BoxGeometry(2.04, 0.42, 2.95),
    truckBedSideWall: new THREE.BoxGeometry(0.18, 0.58, 2.95),
    truckCargoCell: new THREE.BoxGeometry(0.56, 0.36, 1.85),
    truckBumper: new THREE.BoxGeometry(2.14, 0.24, 0.24),

    intHull: createPlanExtrusion(intPlan, 0.32, 0.06, 0.04, 2),
    intSpine: createSideExtrusion(intSpineShape, 1.06, 0.08, 0.05, 2),
    intCanopy: createSideExtrusion(intCanopyShape, 0.98, 0.03, 0.03, 1),
    intWing: new THREE.BoxGeometry(1.88, 0.045, 0.28),
    intFin: new THREE.BoxGeometry(0.05, 0.26, 0.32),

    sweeperHull: createSideExtrusion(sweeperShape, 2.75, 0.06, 0.05, 1),
    sweeperPod: new THREE.CylinderGeometry(0.32, 0.40, 1.55, 10),

    archFlare: createWheelArchGeometry(0.37, 0.46, 0.24, Math.PI * 0.9),
    truckArchFlare: createWheelArchGeometry(0.44, 0.55, 0.30, Math.PI * 0.85),

    wheelTire: new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16),
    wheelRim: new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12),
    wheelNeonRing: new THREE.TorusGeometry(0.23, 0.018, 6, 20),

    truckTire: new THREE.CylinderGeometry(0.42, 0.42, 0.30, 16),
    truckRim: new THREE.CylinderGeometry(0.27, 0.27, 0.31, 12),
    truckNeonRing: new THREE.TorusGeometry(0.28, 0.022, 6, 20),

    exhaustPipe: new THREE.CylinderGeometry(0.065, 0.072, 0.18, 12),
    beamPlane: new THREE.PlaneGeometry(2.1, 7.5),
    shadowPlane: new THREE.PlaneGeometry(1, 1),

    sweeperFrontBlade: new THREE.BoxGeometry(3.34, 0.12, 0.14),
    sweeperRearBar: new THREE.BoxGeometry(3.30, 0.14, 0.12),
    sweeperTopStrip: new THREE.BoxGeometry(2.30, 0.08, 0.42),
    truckTailgate: new THREE.BoxGeometry(2.08, 0.56, 0.16),
    truckCellStrip: new THREE.BoxGeometry(0.14, 0.06, 1.7),
    truckRailNeon: new THREE.BoxGeometry(0.05, 0.045, 2.7),
    truckHeadBar: new THREE.BoxGeometry(1.94, 0.09, 0.08),
    truckTailBar: new THREE.BoxGeometry(1.96, 0.10, 0.08),
    truckTailPillar: new THREE.BoxGeometry(0.09, 0.56, 0.08),
    intSideBlade: new THREE.BoxGeometry(0.04, 0.035, 1.95),
    intTailBar: new THREE.BoxGeometry(1.68, 0.06, 0.08),
    sedanSillNeon: new THREE.BoxGeometry(0.04, 0.032, 2.05),
    sedanTailBar: new THREE.BoxGeometry(1.64, 0.07, 0.08),
    carHeadlightBar: new THREE.BoxGeometry(0.38, 0.05, 0.08),
  };
}

export function createObstacleSharedMaterials(
  beamTexture: THREE.CanvasTexture
): ObstacleSharedMaterials {
  return {
    obsBodyMat: new THREE.MeshPhysicalMaterial({
      color: 0x1e222e,
      roughness: 0.28,
      metalness: 0.72,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
    }),
    obsInterceptorMat: new THREE.MeshPhysicalMaterial({
      color: 0x161926,
      roughness: 0.22,
      metalness: 0.82,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    }),
    obsHaulerMat: new THREE.MeshStandardMaterial({
      color: 0x171a22,
      roughness: 0.44,
      metalness: 0.58,
    }),
    obsTrimMat: new THREE.MeshStandardMaterial({
      color: 0x0a0c12,
      roughness: 0.62,
      metalness: 0.3,
    }),
    obsGlassMat: new THREE.MeshPhysicalMaterial({
      color: 0x040812,
      roughness: 0.06,
      metalness: 0.24,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.6,
    }),
    obsTailMat: new THREE.MeshStandardMaterial({
      color: 0xff2a5f,
      emissive: 0xff2a5f,
      emissiveIntensity: 2.5,
    }),
    obsHeadMat: new THREE.MeshStandardMaterial({
      color: 0xebf8ff,
      emissive: 0xdff5ff,
      emissiveIntensity: 2.2,
    }),
    sweeperAccentMat: new THREE.MeshStandardMaterial({
      color: 0xff9e00,
      emissive: 0xff9e00,
      emissiveIntensity: 2.5,
    }),
    obsNeonCyanMat: new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.6,
    }),
    obsNeonMagentaMat: new THREE.MeshStandardMaterial({
      color: 0xe040fb,
      emissive: 0xe040fb,
      emissiveIntensity: 1.6,
    }),
    obsNeonAmberMat: new THREE.MeshStandardMaterial({
      color: 0xffab00,
      emissive: 0xffab00,
      emissiveIntensity: 1.5,
    }),
    obsTireMat: new THREE.MeshStandardMaterial({
      color: 0x090a0e,
      roughness: 0.84,
      metalness: 0.08,
    }),
    obsAlloyMat: new THREE.MeshStandardMaterial({
      color: 0x8e99a8,
      roughness: 0.25,
      metalness: 0.88,
    }),
    obsBeamMat: new THREE.MeshBasicMaterial({
      map: beamTexture,
      color: 0xd8f5ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    obsShadowMat: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    }),
    geometries: buildObstacleGeometryBank(),
  };
}

function addTrafficWheels(
  g: THREE.Group,
  wheelsOut: THREE.Object3D[],
  coords: Array<[number, number, number, -1 | 1]>,
  isTruck: boolean,
  neonMat: THREE.MeshStandardMaterial,
  mats: ObstacleSharedMaterials
): void {
  const geo = mats.geometries;
  const tireGeo = isTruck ? geo.truckTire : geo.wheelTire;
  const rimGeo = isTruck ? geo.truckRim : geo.wheelRim;
  const ringGeo = isTruck ? geo.truckNeonRing : geo.wheelNeonRing;
  const archGeo = isTruck ? geo.truckArchFlare : geo.archFlare;
  const archBodyMat = isTruck ? mats.obsHaulerMat : mats.obsBodyMat;
  const xRingOffset = isTruck ? 0.156 : 0.126;

  coords.forEach(([wx, wy, wz, side]) => {
    const spinner = new THREE.Group();
    spinner.position.set(wx, wy, wz);

    const tire = new THREE.Mesh(tireGeo, mats.obsTireMat);
    tire.rotation.z = Math.PI / 2;

    const rim = new THREE.Mesh(rimGeo, mats.obsAlloyMat);
    rim.rotation.z = Math.PI / 2;

    const neonRing = new THREE.Mesh(ringGeo, neonMat);
    neonRing.rotation.y = Math.PI / 2;
    neonRing.position.x = side * xRingOffset;

    spinner.add(tire, rim, neonRing);
    g.add(spinner);
    wheelsOut.push(spinner);

    const arch = new THREE.Mesh(archGeo, archBodyMat);
    arch.position.set(wx, wy, wz);
    g.add(arch);
  });
}

export function createObstacleMesh(
  type: 'TRAFFIC' | 'SWEEPER',
  shadowTexture: THREE.CanvasTexture,
  mats: ObstacleSharedMaterials
): {
  mesh: THREE.Group;
  halfW: number;
  halfD: number;
  isHauler: boolean;
  wheels: THREE.Object3D[];
} {
  const g = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const geo = mats.geometries;

  if (!mats.obsShadowMat.map) {
    mats.obsShadowMat.map = shadowTexture;
    mats.obsShadowMat.needsUpdate = true;
  }

  if (type === 'SWEEPER') {
    const w = 3.2;
    const d = 1.6;

    const hull = new THREE.Mesh(geo.sweeperHull, mats.obsHaulerMat);
    g.add(hull);

    [-1.48, 1.48].forEach((px) => {
      const pod = new THREE.Mesh(geo.sweeperPod, mats.obsBodyMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(px, 0.58, 0);
      g.add(pod);
    });

    const frontBlade = new THREE.Mesh(geo.sweeperFrontBlade, mats.sweeperAccentMat);
    frontBlade.position.set(0, 0.30, -d / 2 - 0.05);
    const rearBar = new THREE.Mesh(geo.sweeperRearBar, mats.sweeperAccentMat);
    rearBar.position.set(0, 0.62, d / 2 + 0.04);
    const topStrip = new THREE.Mesh(geo.sweeperTopStrip, mats.sweeperAccentMat);
    topStrip.position.set(0, 1.08, 0.06);
    g.add(frontBlade, rearBar, topStrip);

    const shadow = new THREE.Mesh(geo.shadowPlane, mats.obsShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(w * 1.24, d * 1.45, 1);
    shadow.position.y = 0.025;
    g.add(shadow);

    return { mesh: g, halfW: w * 0.46, halfD: d * 0.46, isHauler: false, wheels };
  }

  const roll = Math.random();
  const silhouette: 'INTERCEPTOR' | 'SEDAN' | 'TRUCK' =
    roll < 0.34 ? 'INTERCEPTOR' : roll < 0.72 ? 'SEDAN' : 'TRUCK';

  if (silhouette === 'TRUCK') {
    // Wide Cyber-Truck with open cargo bed
    const cabHull = new THREE.Mesh(geo.truckCabHull, mats.obsHaulerMat);
    cabHull.position.y = 0.38;
    g.add(cabHull);

    const visor = new THREE.Mesh(geo.truckVisor, mats.obsGlassMat);
    g.add(visor);

    // Open Cargo Bed
    const bedFloor = new THREE.Mesh(geo.truckBedFloor, mats.obsTrimMat);
    bedFloor.position.set(0, 0.56, 1.56);
    const bedWallL = new THREE.Mesh(geo.truckBedSideWall, mats.obsHaulerMat);
    bedWallL.position.set(-1.02, 0.88, 1.56);
    const bedWallR = new THREE.Mesh(geo.truckBedSideWall, mats.obsHaulerMat);
    bedWallR.position.set(1.02, 0.88, 1.56);
    const tailgate = new THREE.Mesh(geo.truckTailgate, mats.obsHaulerMat);
    tailgate.position.set(0, 0.86, 2.98);
    g.add(bedFloor, bedWallL, bedWallR, tailgate);

    // Glowing Cyber-Cargo Energy Cells inside the open bed
    [-0.44, 0.44].forEach((cx) => {
      const cell = new THREE.Mesh(geo.truckCargoCell, mats.obsTrimMat);
      cell.position.set(cx, 0.92, 1.55);
      const cellStrip = new THREE.Mesh(geo.truckCellStrip, mats.obsNeonAmberMat);
      cellStrip.position.set(cx, 1.12, 1.55);
      g.add(cell, cellStrip);
    });

    // Side bed neon trim rails
    const railL = new THREE.Mesh(geo.truckRailNeon, mats.obsNeonAmberMat);
    railL.position.set(-1.12, 1.15, 1.54);
    const railR = new THREE.Mesh(geo.truckRailNeon, mats.obsNeonAmberMat);
    railR.position.set(1.12, 1.15, 1.54);
    g.add(railL, railR);

    // Heavy front & rear bumpers + LED light bars
    const frontBumper = new THREE.Mesh(geo.truckBumper, mats.obsTrimMat);
    frontBumper.position.set(0, 0.42, -2.96);
    const rearBumper = new THREE.Mesh(geo.truckBumper, mats.obsTrimMat);
    rearBumper.position.set(0, 0.42, 3.04);
    const headBar = new THREE.Mesh(geo.truckHeadBar, mats.obsHeadMat);
    headBar.position.set(0, 0.92, -3.00);
    const tailBar = new THREE.Mesh(geo.truckTailBar, mats.obsTailMat);
    tailBar.position.set(0, 0.96, 3.07);
    const pillarL = new THREE.Mesh(geo.truckTailPillar, mats.obsTailMat);
    pillarL.position.set(-1.02, 0.92, 3.06);
    const pillarR = new THREE.Mesh(geo.truckTailPillar, mats.obsTailMat);
    pillarR.position.set(1.02, 0.92, 3.06);
    g.add(frontBumper, rearBumper, headBar, tailBar, pillarL, pillarR);

    // Forward volumetric road beam fan
    const beam = new THREE.Mesh(geo.beamPlane, mats.obsBeamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0.05, -6.7);
    g.add(beam);

    addTrafficWheels(
      g,
      wheels,
      [
        [-1.02, 0.42, -1.96, -1],
        [1.02, 0.42, -1.96, 1],
        [-1.02, 0.42, 1.98, -1],
        [1.02, 0.42, 1.98, 1],
      ],
      true,
      mats.obsNeonAmberMat,
      mats
    );

    const shadow = new THREE.Mesh(geo.shadowPlane, mats.obsShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(2.9, 7.2, 1);
    shadow.position.y = 0.025;
    g.add(shadow);

    return { mesh: g, halfW: 1.02, halfD: 2.8, isHauler: true, wheels };
  }

  if (silhouette === 'INTERCEPTOR') {
    // Low-Slung Cyberpunk Interceptor
    const hull = new THREE.Mesh(geo.intHull, mats.obsInterceptorMat);
    hull.position.y = 0.22;
    const spine = new THREE.Mesh(geo.intSpine, mats.obsInterceptorMat);
    const canopy = new THREE.Mesh(geo.intCanopy, mats.obsGlassMat);
    g.add(hull, spine, canopy);

    // Sculpted front splitter, rear diffuser & twin-fin split wing
    const splitter = new THREE.Mesh(geo.sedanSplitter, mats.obsTrimMat);
    splitter.position.set(0, 0.18, -2.14);
    const diffuser = new THREE.Mesh(geo.sedanDiffuser, mats.obsTrimMat);
    diffuser.position.set(0, 0.24, 2.08);
    const wing = new THREE.Mesh(geo.intWing, mats.obsTrimMat);
    wing.position.set(0, 0.88, 1.96);
    wing.rotation.x = 0.1;
    const finL = new THREE.Mesh(geo.intFin, mats.obsTrimMat);
    finL.position.set(-0.74, 0.78, 1.88);
    finL.rotation.z = 0.16;
    const finR = new THREE.Mesh(geo.intFin, mats.obsTrimMat);
    finR.position.set(0.74, 0.78, 1.88);
    finR.rotation.z = -0.16;
    g.add(splitter, diffuser, wing, finL, finR);

    // Neon magenta side-blade trim + twin exhausts
    const bladeL = new THREE.Mesh(geo.intSideBlade, mats.obsNeonMagentaMat);
    bladeL.position.set(-0.91, 0.28, -0.08);
    const bladeR = new THREE.Mesh(geo.intSideBlade, mats.obsNeonMagentaMat);
    bladeR.position.set(0.91, 0.28, -0.08);
    g.add(bladeL, bladeR);

    [-0.36, 0.36].forEach((ex) => {
      const pipe = new THREE.Mesh(geo.exhaustPipe, mats.obsAlloyMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, 0.28, 2.12);
      g.add(pipe);
    });

    // Sculpted LED tail bar & angled recessed headlights
    const tailBar = new THREE.Mesh(geo.intTailBar, mats.obsTailMat);
    tailBar.position.set(0, 0.58, 2.12);
    const hlL = new THREE.Mesh(geo.carHeadlightBar, mats.obsHeadMat);
    hlL.position.set(-0.56, 0.40, -2.14);
    hlL.rotation.y = 0.22;
    const hlR = new THREE.Mesh(geo.carHeadlightBar, mats.obsHeadMat);
    hlR.position.set(0.56, 0.40, -2.14);
    hlR.rotation.y = -0.22;
    g.add(tailBar, hlL, hlR);

    const beam = new THREE.Mesh(geo.beamPlane, mats.obsBeamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0.045, -5.8);
    g.add(beam);

    addTrafficWheels(
      g,
      wheels,
      [
        [-0.90, 0.34, -1.28, -1],
        [0.90, 0.34, -1.28, 1],
        [-0.93, 0.34, 1.28, -1],
        [0.93, 0.34, 1.28, 1],
      ],
      false,
      mats.obsNeonMagentaMat,
      mats
    );

    const shadow = new THREE.Mesh(geo.shadowPlane, mats.obsShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(2.5, 5.1, 1);
    shadow.position.y = 0.025;
    g.add(shadow);

    return { mesh: g, halfW: 0.86, halfD: 1.98, isHauler: false, wheels };
  }

  // Sleek Cyberpunk Sedan (default)
  const hull = new THREE.Mesh(geo.sedanHull, mats.obsBodyMat);
  hull.position.y = 0.24;
  const spine = new THREE.Mesh(geo.sedanSpine, mats.obsBodyMat);
  const canopy = new THREE.Mesh(geo.sedanCanopy, mats.obsGlassMat);
  g.add(hull, spine, canopy);

  const splitter = new THREE.Mesh(geo.sedanSplitter, mats.obsTrimMat);
  splitter.position.set(0, 0.19, -2.14);
  const diffuser = new THREE.Mesh(geo.sedanDiffuser, mats.obsTrimMat);
  diffuser.position.set(0, 0.24, 2.12);
  const lipSpoiler = new THREE.Mesh(geo.sedanSpoiler, mats.obsTrimMat);
  lipSpoiler.position.set(0, 0.78, 2.02);
  g.add(splitter, diffuser, lipSpoiler);

  // Cyan neon side-sill trim
  const sillL = new THREE.Mesh(geo.sedanSillNeon, mats.obsNeonCyanMat);
  sillL.position.set(-0.90, 0.27, 0);
  const sillR = new THREE.Mesh(geo.sedanSillNeon, mats.obsNeonCyanMat);
  sillR.position.set(0.90, 0.27, 0);
  g.add(sillL, sillR);

  const tailBar = new THREE.Mesh(geo.sedanTailBar, mats.obsTailMat);
  tailBar.position.set(0, 0.65, 2.15);
  const hlL = new THREE.Mesh(geo.carHeadlightBar, mats.obsHeadMat);
  hlL.position.set(-0.60, 0.45, -2.14);
  hlL.rotation.y = 0.18;
  const hlR = new THREE.Mesh(geo.carHeadlightBar, mats.obsHeadMat);
  hlR.position.set(0.60, 0.45, -2.14);
  hlR.rotation.y = -0.18;
  g.add(tailBar, hlL, hlR);

  const beam = new THREE.Mesh(geo.beamPlane, mats.obsBeamMat);
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(0, 0.045, -5.8);
  g.add(beam);

  addTrafficWheels(
    g,
    wheels,
    [
      [-0.89, 0.34, -1.32, -1],
      [0.89, 0.34, -1.32, 1],
      [-0.90, 0.34, 1.32, -1],
      [0.90, 0.34, 1.32, 1],
    ],
    false,
    mats.obsNeonCyanMat,
    mats
  );

  const shadow = new THREE.Mesh(geo.shadowPlane, mats.obsShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(2.55, 5.2, 1);
  shadow.position.y = 0.025;
  g.add(shadow);

  return { mesh: g, halfW: 0.86, halfD: 2.04, isHauler: false, wheels };
}
