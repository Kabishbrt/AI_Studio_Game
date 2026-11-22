import * as THREE from 'three';
import { NepaliTextureSet } from './textures';
import { OUTFIT_CONFIGS, OutfitId, PowerUpType, TRACK_SEGMENT_LENGTH } from './types';

export interface BalenRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  khadaPivot: THREE.Group;
  jetpackGroup: THREE.Group;
  jetFlameLeft: THREE.Mesh;
  jetFlameRight: THREE.Mesh;
  shieldMesh: THREE.Mesh;
  contactShadow: THREE.Mesh;
  applyOutfit: (outfit: OutfitId) => void;
}

export function createBalenCharacter(textures: NepaliTextureSet, initialOutfit: OutfitId): BalenRig {
  const root = new THREE.Group();

  // Grounded contact shadow disc
  const shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  root.add(contactShadow);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const cfg = OUTFIT_CONFIGS[initialOutfit];

  // Shared materials (updated dynamically by applyOutfit)
  const coatMat = new THREE.MeshStandardMaterial({
    color: cfg.coatColor,
    roughness: 0.78,
    metalness: 0.05,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: cfg.shirtColor,
    roughness: 0.85,
    metalness: 0.02,
  });
  const topiMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.dhakaPattern,
    roughness: 0.72,
    metalness: 0.04,
  });
  const topiTrimMat = new THREE.MeshStandardMaterial({
    color: cfg.topiBase,
    roughness: 0.65,
    metalness: 0.1,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: cfg.scarfColor,
    roughness: 0.45,
    metalness: 0.12,
    side: THREE.DoubleSide,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xe3b43c,
    roughness: 0.25,
    metalness: 0.88,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc98e67,
    roughness: 0.62,
    metalness: 0.02,
  });
  const hairBeardMat = new THREE.MeshStandardMaterial({
    color: 0x161414,
    roughness: 0.88,
    metalness: 0.03,
  });
  const sunglassFrameMat = new THREE.MeshStandardMaterial({
    color: 0x111114,
    roughness: 0.22,
    metalness: 0.45,
  });
  const sunglassLensMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0e14,
    roughness: 0.08,
    metalness: 0.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x1c1715,
    roughness: 0.32,
    metalness: 0.18,
  });

  // --- LEGS (Hips at y = 0.88) ---
  const createLeg = (side: -1 | 1): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.17, 0.88, 0);

    // Suruwal / trouser thigh + shin
    const pantGeo = new THREE.CylinderGeometry(0.125, 0.09, 0.78, 12);
    const pant = new THREE.Mesh(pantGeo, coatMat);
    pant.position.y = -0.39;
    pant.castShadow = true;
    legPivot.add(pant);

    // Tapered Daura-Suruwal ankle cuff
    const cuffGeo = new THREE.CylinderGeometry(0.092, 0.082, 0.14, 10);
    const cuff = new THREE.Mesh(cuffGeo, shirtMat);
    cuff.position.y = -0.72;
    legPivot.add(cuff);

    // Polished leather shoe (toe pointing -Z)
    const shoeGeo = new THREE.BoxGeometry(0.18, 0.11, 0.32);
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, -0.82, -0.05);
    shoe.castShadow = true;
    legPivot.add(shoe);

    return legPivot;
  };

  const leftLegPivot = createLeg(-1);
  const rightLegPivot = createLeg(1);
  bodyPivot.add(leftLegPivot, rightLegPivot);

  // --- TORSO (Tailored Nepali Coat + Daura Shirt + Lapel Pin) ---
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.88, 0);
  bodyPivot.add(torsoGroup);

  // Main jacket chest
  const jacketGeo = new THREE.BoxGeometry(0.58, 0.72, 0.34);
  const jacket = new THREE.Mesh(jacketGeo, coatMat);
  jacket.position.y = 0.38;
  jacket.castShadow = true;
  torsoGroup.add(jacket);

  // Tailored coat lower skirt/flare
  const coatTailGeo = new THREE.BoxGeometry(0.61, 0.24, 0.36);
  const coatTail = new THREE.Mesh(coatTailGeo, coatMat);
  coatTail.position.y = 0.08;
  coatTail.castShadow = true;
  torsoGroup.add(coatTail);

  // Daura Shirt V-front & high collar (facing -Z)
  const shirtFrontGeo = new THREE.BoxGeometry(0.24, 0.56, 0.04);
  const shirtFront = new THREE.Mesh(shirtFrontGeo, shirtMat);
  shirtFront.position.set(0, 0.44, -0.165);
  torsoGroup.add(shirtFront);

  // High Nepali Daura collar
  const collarGeo = new THREE.CylinderGeometry(0.14, 0.15, 0.11, 14);
  const collar = new THREE.Mesh(collarGeo, shirtMat);
  collar.position.set(0, 0.76, 0);
  torsoGroup.add(collar);

  // Brass coat buttons & Khukuri/Nepal emblem lapel pin
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 10), brassMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0.06, 0.24 + i * 0.14, -0.185);
    torsoGroup.add(btn);
  }
  const lapelPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), brassMat);
  lapelPin.position.set(-0.16, 0.56, -0.185);
  torsoGroup.add(lapelPin);

  // --- CEREMONIAL KHADA / SASH (Trailing behind back +Z) ---
  const khadaPivot = new THREE.Group();
  khadaPivot.position.set(0, 0.72, 0.16);
  torsoGroup.add(khadaPivot);

  const scarfGeo = new THREE.BoxGeometry(0.24, 0.04, 0.85);
  const scarfMain = new THREE.Mesh(scarfGeo, scarfMat);
  scarfMain.position.set(0, -0.05, 0.42);
  scarfMain.rotation.x = -0.25;
  scarfMain.castShadow = true;
  khadaPivot.add(scarfMain);

  // Gold fringe tip on Khada
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.09), brassMat);
  fringe.position.set(0, -0.15, 0.84);
  fringe.rotation.x = -0.25;
  khadaPivot.add(fringe);

  // --- ARMS ---
  const createArm = (side: -1 | 1): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.37, 1.56, 0);

    // Shoulder cap
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), coatMat);
    armPivot.add(shoulder);

    // Sleeve
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.56, 10), coatMat);
    sleeve.position.y = -0.28;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    // Shirt cuff
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.08, 0.06, 10), shirtMat);
    cuff.position.y = -0.56;
    armPivot.add(cuff);

    // Hand
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), skinMat);
    hand.position.y = -0.63;
    armPivot.add(hand);

    return armPivot;
  };

  const leftArmPivot = createArm(-1);
  const rightArmPivot = createArm(1);
  bodyPivot.add(leftArmPivot, rightArmPivot);

  // --- HEAD GROUP (Head, Beard, Iconic Balen Sunglasses, Dhaka Topi) ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.69, 0);
  bodyPivot.add(headGroup);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.14, 12), skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  // Head
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.39, 0.36), skinMat);
  headMesh.position.y = 0.25;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Hair (back & sides)
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.14), hairBeardMat);
  hairBack.position.set(0, 0.28, 0.13);
  headGroup.add(hairBack);

  // Signature neatly trimmed Balen Beard & Mustache (facing -Z)
  const beardJaw = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.15, 0.22), hairBeardMat);
  beardJaw.position.set(0, 0.13, -0.09);
  headGroup.add(beardJaw);

  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), hairBeardMat);
  mustache.position.set(0, 0.195, -0.19);
  headGroup.add(mustache);

  // Nose bridge
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.06), skinMat);
  nose.position.set(0, 0.255, -0.19);
  headGroup.add(nose);

  // Iconic Rectangular Dark Sunglasses
  const frameBar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.06), sunglassFrameMat);
  frameBar.position.set(0, 0.325, -0.185);
  headGroup.add(frameBar);

  const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.095, 0.05), sunglassLensMat);
  leftLens.position.set(-0.09, 0.295, -0.19);
  const rightLens = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.095, 0.05), sunglassLensMat);
  rightLens.position.set(0.09, 0.295, -0.19);
  headGroup.add(leftLens, rightLens);

  // --- TRADITIONAL DHAKA TOPI (Authentic slanted silhouette!) ---
  const topiGroup = new THREE.Group();
  topiGroup.position.set(0.01, 0.47, 0.01);
  topiGroup.rotation.z = -0.09; // Classic jaunty Nepali Topi tilt!
  topiGroup.rotation.x = 0.07;
  headGroup.add(topiGroup);

  const topiBody = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.225, 0.22, 16), topiMat);
  topiBody.castShadow = true;
  topiGroup.add(topiBody);

  // Topi folded ridge / rim band
  const topiBand = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.232, 0.055, 16), topiTrimMat);
  topiBand.position.y = -0.09;
  topiGroup.add(topiBand);

  const topiCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.04, 16), topiTrimMat);
  topiCrown.position.y = 0.11;
  topiGroup.add(topiCrown);

  // --- GARUDA JETPACK (Akash Udan Power-Up Attachment) ---
  const jetpackGroup = new THREE.Group();
  jetpackGroup.position.set(0, 1.28, 0.23);
  jetpackGroup.visible = false;
  bodyPivot.add(jetpackGroup);

  const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.18), topiTrimMat);
  const tankL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.46, 12), brassMat);
  tankL.position.set(-0.15, 0, 0.06);
  const tankR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.46, 12), brassMat);
  tankR.position.set(0.15, 0, 0.06);

  // Garuda stylized golden wings
  const wingGeo = new THREE.BoxGeometry(0.62, 0.16, 0.04);
  const wingL = new THREE.Mesh(wingGeo, brassMat);
  wingL.position.set(-0.46, 0.08, 0.05);
  wingL.rotation.z = 0.28;
  const wingR = new THREE.Mesh(wingGeo, brassMat);
  wingR.position.set(0.46, 0.08, 0.05);
  wingR.rotation.z = -0.28;

  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8c1a });
  const jetFlameLeft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 10), flameMat);
  jetFlameLeft.rotation.x = Math.PI;
  jetFlameLeft.position.set(-0.15, -0.42, 0.06);
  const jetFlameRight = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 10), flameMat);
  jetFlameRight.rotation.x = Math.PI;
  jetFlameRight.position.set(0.15, -0.42, 0.06);

  jetpackGroup.add(packBody, tankL, tankR, wingL, wingR, jetFlameLeft, jetFlameRight);

  // --- BHIMSEN SHIELD AURA ---
  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 20, 16),
    new THREE.MeshBasicMaterial({
      color: 0xf5b82e,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    })
  );
  shieldMesh.position.y = 1.05;
  shieldMesh.visible = false;
  root.add(shieldMesh);

  const applyOutfit = (outfit: OutfitId) => {
    const c = OUTFIT_CONFIGS[outfit];
    coatMat.color.setHex(c.coatColor);
    shirtMat.color.setHex(c.shirtColor);
    topiTrimMat.color.setHex(c.topiBase);
    scarfMat.color.setHex(c.scarfColor);
    topiMat.map = outfit === 'heritage' ? null : textures.dhakaPattern;
    topiMat.color.setHex(outfit === 'heritage' ? 0x1a191c : 0xffffff);
    topiMat.needsUpdate = true;
  };

  return {
    root,
    bodyPivot,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    khadaPivot,
    jetpackGroup,
    jetFlameLeft,
    jetFlameRight,
    shieldMesh,
    contactShadow,
    applyOutfit,
  };
}

// --- OBSTACLE TYPES & MODELS ---
export type ObstacleKind =
  | 'bus'
  | 'bus_ramp'
  | 'chariot'
  | 'barricade_low'
  | 'torana_high'
  | 'bell_cart';

export interface ObstacleInstance {
  group: THREE.Group;
  kind: ObstacleKind;
  lane: number; // 0, 1, 2
  zCenter: number;
  length: number;
  width: number;
  height: number;
  minClearanceY: number; // > 0 means can slide underneath!
  hasRamp: boolean;
  rampStartZ: number; // Z closer to player (+Z) where ramp begins at y=0
  deckTopY: number; // Roof height when riding on top
  passed: boolean;
  nearMissAwarded: boolean;
  destroyed: boolean;
}

export function createObstacleMesh(kind: ObstacleKind, textures: NepaliTextureSet): THREE.Group {
  const group = new THREE.Group();

  const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3b2216, roughness: 0.8, metalness: 0.05 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xdca832, roughness: 0.25, metalness: 0.88 });
  const crimsonMat = new THREE.MeshStandardMaterial({ color: 0xc21e2f, roughness: 0.58, metalness: 0.08 });
  const marigoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.72, metalness: 0.05 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.85, metalness: 0.08 });

  if (kind === 'bus' || kind === 'bus_ramp') {
    // Kathmandu Sajha Yatayat Bus (length 8.6m, height 2.95m, width 2.15m)
    const bodyMat = new THREE.MeshStandardMaterial({
      map: textures.busSide,
      roughness: 0.38,
      metalness: 0.15,
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 0.5, metalness: 0.1 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b2b3b,
      roughness: 0.1,
      metalness: 0.2,
      clearcoat: 0.9,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.36, 8.4), tireMat);
    chassis.position.y = 0.42;
    group.add(chassis);

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.16, 2.22, 8.4), bodyMat);
    body.position.y = 1.66;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.18, 8.2), roofMat);
    roof.position.y = 2.86;
    roof.receiveShadow = true;
    group.add(roof);

    // Front windshield & headlights facing +Z (toward approaching Balen)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.95, 0.08), glassMat);
    windshield.position.set(0, 1.98, 4.19);
    group.add(windshield);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.08), brassMat);
    grille.position.set(0, 0.95, 4.19);
    group.add(grille);

    const headLightGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff0b3 });
    const hlL = new THREE.Mesh(headLightGeo, hlMat);
    hlL.rotation.x = Math.PI / 2;
    hlL.position.set(-0.75, 0.9, 4.21);
    const hlR = new THREE.Mesh(headLightGeo, hlMat);
    hlR.rotation.x = Math.PI / 2;
    hlR.position.set(0.75, 0.9, 4.21);
    group.add(hlL, hlR);

    // 4 wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.24, 14);
    [
      [-1.02, 0.42, 2.5],
      [1.02, 0.42, 2.5],
      [-1.02, 0.42, -2.5],
      [1.02, 0.42, -2.5],
    ].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      group.add(w);
    });

    // Optional front wooden climb ramp (+Z side)
    if (kind === 'bus_ramp') {
      const rampLen = 4.6;
      const rampH = 2.95;
      const hyp = Math.hypot(rampLen, rampH);
      const angle = Math.atan2(rampH, rampLen);
      const rampPlank = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.18, hyp), woodDarkMat);
      rampPlank.position.set(0, rampH / 2 - 0.05, 4.2 + rampLen / 2);
      rampPlank.rotation.x = angle;
      rampPlank.castShadow = true;
      rampPlank.receiveShadow = true;
      group.add(rampPlank);

      // Marigold/crimson chevron guide stripes on ramp
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, hyp * 0.85), marigoldMat);
      stripe.position.set(0, rampH / 2 - 0.03, 4.2 + rampLen / 2);
      stripe.rotation.x = angle;
      group.add(stripe);
    }
  } else if (kind === 'chariot') {
    // Traditional Nepali Festival Rath (Temple Chariot)
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 4.4), woodDarkMat);
    base.position.y = 0.85;
    base.castShadow = true;
    group.add(base);

    // 4 giant carved wooden chariot wheels
    const wheelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.22, 16);
    [
      [-1.12, 0.75, 1.3],
      [1.12, 0.75, 1.3],
      [-1.12, 0.75, -1.3],
      [1.12, 0.75, -1.3],
    ].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, woodDarkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 10), brassMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, wy, wz);
      group.add(w, hub);
    });

    // Stepped pagoda tower on chariot
    const midCabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 3.2), crimsonMat);
    midCabin.position.y = 1.85;
    midCabin.castShadow = true;
    group.add(midCabin);

    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.75, 4), marigoldMat);
    roof1.rotation.y = Math.PI / 4;
    roof1.position.y = 2.85;
    group.add(roof1);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 8), brassMat);
    spire.position.y = 3.55;
    group.add(spire);
  } else if (kind === 'barricade_low') {
    // Low Jumpable Bamboo & Marigold Festival Road Barricade (height 1.08m)
    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.05, 8);
    const postL = new THREE.Mesh(postGeo, woodDarkMat);
    postL.position.set(-0.95, 0.52, 0);
    const postR = new THREE.Mesh(postGeo, woodDarkMat);
    postR.position.set(0.95, 0.52, 0);
    group.add(postL, postR);

    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.34, 0.16), crimsonMat);
    plank.position.set(0, 0.82, 0);
    plank.castShadow = true;
    group.add(plank);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.1, 0.18), marigoldMat);
    stripe.position.set(0, 0.82, 0);
    group.add(stripe);

    // Hanging marigold puffs
    for (let x = -0.8; x <= 0.81; x += 0.4) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), marigoldMat);
      puff.position.set(x, 0.62, 0.08);
      group.add(puff);
    }
  } else if (kind === 'torana_high') {
    // High Carved Wooden Torana Arch (Slide underneath! Clearance 1.25m, top 3.2m)
    const pillarGeo = new THREE.BoxGeometry(0.26, 3.1, 0.32);
    const pilL = new THREE.Mesh(pillarGeo, woodDarkMat);
    pilL.position.set(-1.12, 1.55, 0);
    pilL.castShadow = true;
    const pilR = new THREE.Mesh(pillarGeo, woodDarkMat);
    pilR.position.set(1.12, 1.55, 0);
    pilR.castShadow = true;
    group.add(pilL, pilR);

    // Overhead carved beam (bottom at y = 1.25m, so standing Balen hits it, sliding Balen clears!)
    const beamMat = new THREE.MeshStandardMaterial({
      map: textures.woodCarving,
      roughness: 0.72,
      metalness: 0.08,
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.55, 0.42), beamMat);
    beam.position.set(0, 2.08, 0);
    beam.castShadow = true;
    group.add(beam);

    // Crimson & gold lower warning trim
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.46), crimsonMat);
    trim.position.set(0, 1.34, 0);
    group.add(trim);

    // Three brass temple bells hanging lightly along the bottom edge
    for (const bx of [-0.6, 0, 0.6]) {
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 10), brassMat);
      bell.position.set(bx, 1.2, 0);
      group.add(bell);
    }
  } else if (kind === 'bell_cart') {
    // Low/Medium Stone & Brass Temple Bell Stand (Jump over: height 1.15m)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7c746c, roughness: 0.88, metalness: 0.05 });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.1), stoneMat);
    plinth.position.y = 0.275;
    plinth.castShadow = true;
    group.add(plinth);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.25), woodDarkMat);
    frame.position.y = 0.82;
    group.add(frame);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.42, 12), brassMat);
    bell.position.y = 0.76;
    group.add(bell);
  }

  return group;
}

// --- COLLECTIBLE MOHAR COIN ---
export function createMoharCoinMesh(textures: NepaliTextureSet): THREE.Group {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    map: textures.coinFace,
    color: 0xffd15c,
    roughness: 0.22,
    metalness: 0.85,
    emissive: 0x5c3c04,
    emissiveIntensity: 0.25,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe6a825,
    roughness: 0.25,
    metalness: 0.9,
  });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), goldMat);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 8, 18), rimMat);
  group.add(rim);

  return group;
}

// --- POWER-UP MESHES ---
export function createPowerUpMesh(type: PowerUpType): THREE.Group {
  const group = new THREE.Group();

  const colorMap: Record<PowerUpType, number> = {
    magnet: 0xdc143c,
    jetpack: 0xf59e0b,
    multiplier: 0x38bdf8,
    shield: 0x10b981,
  };

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.045, 10, 24),
    new THREE.MeshBasicMaterial({ color: colorMap[type] })
  );
  group.add(halo);

  const coreMat = new THREE.MeshStandardMaterial({
    color: colorMap[type],
    roughness: 0.2,
    metalness: 0.75,
    emissive: colorMap[type],
    emissiveIntensity: 0.35,
  });

  if (type === 'magnet') {
    const uShape = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 10, 16, Math.PI), coreMat);
    uShape.rotation.z = Math.PI;
    group.add(uShape);
  } else if (type === 'jetpack') {
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), coreMat);
    wingL.position.set(-0.2, 0.05, 0);
    wingL.rotation.z = 0.35;
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), coreMat);
    wingR.position.set(0.2, 0.05, 0);
    wingR.rotation.z = -0.35;
    group.add(wingL, wingR);
  } else if (type === 'multiplier') {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), coreMat);
    group.add(star);
  } else {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.18, 0.44, 6), coreMat);
    group.add(shield);
  }

  return group;
}

// --- KATHMANDU HERITAGE ENVIRONMENT SEGMENT ---
export function createTrackSegment(textures: NepaliTextureSet, seed: number): THREE.Group {
  const seg = new THREE.Group();

  // 1. Cobblestone 3-Lane Roadway (width 9.2m, length TRACK_SEGMENT_LENGTH)
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.cobblestoneRoad,
    roughness: 0.85,
    metalness: 0.05,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(9.2, TRACK_SEGMENT_LENGTH), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0;
  road.receiveShadow = true;
  seg.add(road);

  // 2. Raised Stone Sidewalks & Outer Ground Apron
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x8a7d71, roughness: 0.88, metalness: 0.04 });
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x5c5145, roughness: 0.95, metalness: 0 });

  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, TRACK_SEGMENT_LENGTH), sidewalkMat);
    walk.position.set(side * 6.2, 0.12, 0);
    walk.receiveShadow = true;
    seg.add(walk);

    const apron = new THREE.Mesh(new THREE.PlaneGeometry(34, TRACK_SEGMENT_LENGTH), groundMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(side * 24, -0.02, 0);
    seg.add(apron);
  }

  // 3. Traditional Newari Pagodas & Brick Houses along both sides
  const brickMat = new THREE.MeshStandardMaterial({
    map: textures.brickWall,
    roughness: 0.82,
    metalness: 0.04,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: textures.roofTiles,
    roughness: 0.72,
    metalness: 0.06,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodCarving,
    roughness: 0.78,
    metalness: 0.05,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xe6b83c,
    roughness: 0.24,
    metalness: 0.88,
  });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffc65c });

  const buildingOffsets = [-12, 0, 12];
  for (const side of [-1, 1]) {
    buildingOffsets.forEach((bz, idx) => {
      const variant = (seed + idx + (side === 1 ? 1 : 0)) % 3;
      const bGroup = new THREE.Group();
      bGroup.position.set(side * 10.6, 0, bz);
      bGroup.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

      if (variant === 0) {
        // 2-Tier Newari Pagoda Temple
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.1, 6.2), sidewalkMat);
        plinth.position.y = 0.55;
        bGroup.add(plinth);

        const lowerHall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.4, 5.0), brickMat);
        lowerHall.position.y = 2.8;
        lowerHall.castShadow = true;
        bGroup.add(lowerHall);

        const roof1 = new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.5, 4), roofMat);
        roof1.rotation.y = Math.PI / 4;
        roof1.position.y = 5.1;
        bGroup.add(roof1);

        const upperHall = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.3, 3.6), brickMat);
        upperHall.position.y = 6.5;
        bGroup.add(upperHall);

        const roof2 = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.3, 4), roofMat);
        roof2.rotation.y = Math.PI / 4;
        roof2.position.y = 8.1;
        bGroup.add(roof2);

        // Golden Gajur pinnacle
        const gajur = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.2, 8), goldMat);
        gajur.position.y = 9.2;
        bGroup.add(gajur);
      } else if (variant === 1) {
        // 3-Story Newari Brick House with Ankhi Jhyal carved windows
        const house = new THREE.Mesh(new THREE.BoxGeometry(8.8, 7.6, 5.4), brickMat);
        house.position.y = 3.8;
        house.castShadow = true;
        bGroup.add(house);

        // Carved wooden balcony & windows facing street (+Z in bGroup local space)
        for (const wx of [-2.4, 0, 2.4]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.25), woodMat);
          win.position.set(wx, 4.4, 2.75);
          bGroup.add(win);
        }
        const colonnade = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.45, 0.6), woodMat);
        colonnade.position.set(0, 2.5, 2.8);
        bGroup.add(colonnade);

        // Sloped tiled roof
        const roof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 2.0, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.scale.set(1.25, 1, 0.85);
        roof.position.y = 8.6;
        bGroup.add(roof);
      } else {
        // Traditional Courtyard Pati Pavilion + Brass Diyo Stand
        const base = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.7, 4.8), sidewalkMat);
        base.position.y = 0.35;
        bGroup.add(base);

        for (const px of [-3.1, -1.0, 1.0, 3.1]) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.4, 0.32), woodMat);
          col.position.set(px, 2.4, 1.8);
          bGroup.add(col);
        }
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.4, 1.2), brickMat);
        backWall.position.set(0, 2.4, -1.2);
        bGroup.add(backWall);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 1.7, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.scale.set(1.3, 1, 0.8);
        roof.position.y = 4.9;
        bGroup.add(roof);
      }

      seg.add(bGroup);
    });

    // Brass Diyo Street Lamp Posts along sidewalks
    for (const lz of [-9, 9]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.6, 8), woodMat);
      post.position.set(side * 5.1, 1.8, lz);
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), lampGlowMat);
      lantern.position.set(side * 5.1, 3.7, lz);
      seg.add(post, lantern);
    }
  }

  // 4. Overhead Lungta Prayer Flag Garland Arch (1 per segment)
  const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 7.6, 8), woodMat);
  poleL.position.set(-5.3, 3.8, 0);
  const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 7.6, 8), woodMat);
  poleR.position.set(5.3, 3.8, 0);
  seg.add(poleL, poleR);

  const flagColors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
  const flagGroup = new THREE.Group();
  flagGroup.name = 'prayerFlags';
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    const fx = THREE.MathUtils.lerp(-4.8, 4.8, t);
    const sag = Math.sin(t * Math.PI) * 0.75;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.55),
      new THREE.MeshStandardMaterial({
        color: flagColors[i % flagColors.length],
        roughness: 0.7,
        side: THREE.DoubleSide,
      })
    );
    flag.position.set(fx, 7.2 - sag, 0);
    flag.rotation.y = 0.18;
    flagGroup.add(flag);
  }
  seg.add(flagGroup);

  return seg;
}

// --- DISTANT HIMALAYAN MOUNTAIN BACKDROP ---
export function createHimalayanHorizon(): THREE.Group {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5c6b7e, roughness: 0.92, metalness: 0.02 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.65, metalness: 0.05 });

  const peaks = [
    { x: -65, w: 38, h: 42, z: -155 },
    { x: -28, w: 34, h: 52, z: -165 },
    { x: 10, w: 42, h: 58, z: -170 },
    { x: 48, w: 36, h: 46, z: -160 },
    { x: 82, w: 40, h: 38, z: -150 },
  ];

  for (const p of peaks) {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(p.w, p.h, 5), rockMat);
    mountain.position.set(p.x, p.h * 0.45 - 4, p.z);
    mountain.rotation.y = p.x * 0.1;
    group.add(mountain);

    const snowCap = new THREE.Mesh(new THREE.ConeGeometry(p.w * 0.44, p.h * 0.44, 5), snowMat);
    snowCap.position.set(p.x, p.h * 0.73 - 4, p.z);
    snowCap.rotation.y = p.x * 0.1;
    group.add(snowCap);
  }

  return group;
}
