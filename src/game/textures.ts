import * as THREE from 'three';

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export interface NepaliTextureSet {
  cobblestoneRoad: THREE.CanvasTexture;
  brickWall: THREE.CanvasTexture;
  woodCarving: THREE.CanvasTexture;
  roofTiles: THREE.CanvasTexture;
  dhakaPattern: THREE.CanvasTexture;
  busSide: THREE.CanvasTexture;
  coinFace: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

export function createNepaliTextures(maxAnisotropy: number): NepaliTextureSet {
  const aniso = Math.min(maxAnisotropy, 8);

  // 1. Cobblestone 3-Lane Kathmandu Heritage Road
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext('2d')!;
  rctx.fillStyle = '#5a524a';
  rctx.fillRect(0, 0, 512, 512);

  // Stone block grid
  const rows = 16;
  const cols = 12;
  const cellW = 512 / cols;
  const cellH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cellW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 78 + ((r * 17 + c * 31) % 24);
      const warm = ((r * 7 + c * 13) % 10) - 5;
      rctx.fillStyle = `rgb(${shade + 12 + warm}, ${shade + 4}, ${shade - 4})`;
      rctx.fillRect(c * cellW + offset + 2, r * cellH + 2, cellW - 4, cellH - 4);
    }
  }

  // Reddish Newari brick curb borders on far left & right
  rctx.fillStyle = '#8b3a2b';
  rctx.fillRect(0, 0, 22, 512);
  rctx.fillRect(490, 0, 22, 512);
  rctx.fillStyle = '#d4af37';
  rctx.fillRect(22, 0, 4, 512);
  rctx.fillRect(486, 0, 4, 512);

  // Subtle brass & stone lane inlay lines separating 3 lanes
  const laneDividers = [170, 342];
  for (const dx of laneDividers) {
    rctx.fillStyle = '#3b332c';
    rctx.fillRect(dx - 5, 0, 10, 512);
    for (let y = 0; y < 512; y += 64) {
      rctx.fillStyle = '#d4a63a';
      rctx.fillRect(dx - 2, y + 10, 4, 38);
    }
  }
  const cobblestoneRoad = finalizeColorTexture(roadCanvas, aniso, 1, 3);

  // 2. Traditional Dachi Appa Red Brick Masonry
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 256;
  brickCanvas.height = 256;
  const bctx = brickCanvas.getContext('2d')!;
  bctx.fillStyle = '#4a2b22';
  bctx.fillRect(0, 0, 256, 256);

  for (let r = 0; r < 16; r++) {
    const off = (r % 2) * 16;
    for (let c = -1; c < 9; c++) {
      const v = (r * 19 + c * 23) % 22;
      bctx.fillStyle = `rgb(${145 + v}, ${58 + Math.floor(v * 0.5)}, ${42 + Math.floor(v * 0.4)})`;
      bctx.fillRect(c * 32 + off + 1.5, r * 16 + 1.5, 29, 13);
    }
  }
  // Carved dark timber lintel band
  bctx.fillStyle = '#2d1c14';
  bctx.fillRect(0, 118, 256, 20);
  bctx.fillStyle = '#4f3122';
  for (let x = 8; x < 256; x += 24) {
    bctx.fillRect(x, 122, 12, 12);
  }
  const brickWall = finalizeColorTexture(brickCanvas, aniso, 2, 2);

  // 3. Carved Newari Ankhi Jhyal Lattice Wood
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wctx = woodCanvas.getContext('2d')!;
  wctx.fillStyle = '#2b1911';
  wctx.fillRect(0, 0, 256, 256);
  wctx.strokeStyle = '#5c3824';
  wctx.lineWidth = 6;
  wctx.strokeRect(10, 10, 236, 236);
  wctx.strokeRect(24, 24, 208, 208);

  // Diagonal lattice
  wctx.strokeStyle = '#45281a';
  wctx.lineWidth = 3;
  for (let i = -256; i < 512; i += 24) {
    wctx.beginPath();
    wctx.moveTo(i, 24);
    wctx.lineTo(i + 208, 232);
    wctx.stroke();
    wctx.beginPath();
    wctx.moveTo(i + 208, 24);
    wctx.lineTo(i, 232);
    wctx.stroke();
  }
  // Central brass stud
  wctx.fillStyle = '#c89b3c';
  wctx.beginPath();
  wctx.arc(128, 128, 12, 0, Math.PI * 2);
  wctx.fill();
  const woodCarving = finalizeColorTexture(woodCanvas, aniso);

  // 4. Terracotta Jhingati Roof Tiles
  const roofCanvas = document.createElement('canvas');
  roofCanvas.width = 256;
  roofCanvas.height = 256;
  const rfctx = roofCanvas.getContext('2d')!;
  rfctx.fillStyle = '#743123';
  rfctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 20) {
    rfctx.fillStyle = y % 40 === 0 ? '#8c3d2c' : '#6b2c1f';
    rfctx.fillRect(0, y, 256, 17);
    for (let x = 0; x < 256; x += 24) {
      rfctx.fillStyle = '#4d1e15';
      rfctx.fillRect(x, y, 3, 20);
    }
  }
  const roofTiles = finalizeColorTexture(roofCanvas, aniso, 2, 2);

  // 5. Traditional Nepali Dhaka Topi Geometric Weave
  const dhakaCanvas = document.createElement('canvas');
  dhakaCanvas.width = 256;
  dhakaCanvas.height = 128;
  const dctx = dhakaCanvas.getContext('2d')!;
  dctx.fillStyle = '#9e1b22';
  dctx.fillRect(0, 0, 256, 128);

  // Geometric diamonds and chevrons
  for (let x = 0; x < 256; x += 32) {
    // Cream diamond
    dctx.fillStyle = '#f5eedc';
    dctx.beginPath();
    dctx.moveTo(x + 16, 14);
    dctx.lineTo(x + 30, 64);
    dctx.lineTo(x + 16, 114);
    dctx.lineTo(x + 2, 64);
    dctx.closePath();
    dctx.fill();

    // Inner crimson + gold + navy diamond
    dctx.fillStyle = '#182438';
    dctx.beginPath();
    dctx.moveTo(x + 16, 30);
    dctx.lineTo(x + 24, 64);
    dctx.lineTo(x + 16, 98);
    dctx.lineTo(x + 8, 64);
    dctx.closePath();
    dctx.fill();

    dctx.fillStyle = '#eab308';
    dctx.beginPath();
    dctx.moveTo(x + 16, 46);
    dctx.lineTo(x + 20, 64);
    dctx.lineTo(x + 16, 82);
    dctx.lineTo(x + 12, 64);
    dctx.closePath();
    dctx.fill();
  }
  // Top and bottom black/gold border stripes
  dctx.fillStyle = '#191716';
  dctx.fillRect(0, 0, 256, 12);
  dctx.fillRect(0, 116, 256, 12);
  dctx.fillStyle = '#eab308';
  dctx.fillRect(0, 12, 256, 4);
  dctx.fillRect(0, 112, 256, 4);
  const dhakaPattern = finalizeColorTexture(dhakaCanvas, aniso, 2, 1);

  // 6. Kathmandu Sajha Bus Side Livery
  const busCanvas = document.createElement('canvas');
  busCanvas.width = 512;
  busCanvas.height = 256;
  const bsctx = busCanvas.getContext('2d')!;
  bsctx.fillStyle = '#1e6b43'; // Classic Sajha Kathmandu green
  bsctx.fillRect(0, 0, 512, 256);
  // Cream upper window band
  bsctx.fillStyle = '#f3ebd9';
  bsctx.fillRect(0, 28, 512, 108);
  // Crimson & gold accent stripe
  bsctx.fillStyle = '#dc143c';
  bsctx.fillRect(0, 136, 512, 14);
  bsctx.fillStyle = '#f59e0b';
  bsctx.fillRect(0, 150, 512, 8);
  // Windows
  bsctx.fillStyle = '#1e2b38';
  for (let wx = 26; wx < 480; wx += 76) {
    bsctx.fillRect(wx, 42, 60, 74);
    // Window sheen
    bsctx.fillStyle = '#364d63';
    bsctx.fillRect(wx + 4, 46, 18, 66);
    bsctx.fillStyle = '#1e2b38';
  }
  const busSide = finalizeColorTexture(busCanvas, aniso);

  // 7. Gold Mohar Coin Face
  const coinCanvas = document.createElement('canvas');
  coinCanvas.width = 128;
  coinCanvas.height = 128;
  const cctx = coinCanvas.getContext('2d')!;
  cctx.fillStyle = '#f5b82e';
  cctx.fillRect(0, 0, 128, 128);
  cctx.strokeStyle = '#9c680a';
  cctx.lineWidth = 8;
  cctx.beginPath();
  cctx.arc(64, 64, 52, 0, Math.PI * 2);
  cctx.stroke();

  cctx.strokeStyle = '#ffe58f';
  cctx.lineWidth = 3;
  cctx.beginPath();
  cctx.arc(64, 64, 42, 0, Math.PI * 2);
  cctx.stroke();

  // Traditional 8-petal lotus / sun emblem in center
  cctx.fillStyle = '#b4780d';
  for (let i = 0; i < 8; i++) {
    cctx.save();
    cctx.translate(64, 64);
    cctx.rotate((i * Math.PI) / 4);
    cctx.beginPath();
    cctx.ellipse(0, -22, 6, 13, 0, 0, Math.PI * 2);
    cctx.fill();
    cctx.restore();
  }
  cctx.fillStyle = '#ffe073';
  cctx.beginPath();
  cctx.arc(64, 64, 11, 0, Math.PI * 2);
  cctx.fill();
  const coinFace = finalizeColorTexture(coinCanvas, aniso);

  // 8. Soft Radial Contact Shadow Blob
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const sctx = shCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 10, 8, 0.58)');
  grad.addColorStop(0.55, 'rgba(15, 10, 8, 0.25)');
  grad.addColorStop(1, 'rgba(15, 10, 8, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const contactShadow = finalizeColorTexture(shCanvas, 1);

  return {
    cobblestoneRoad,
    brickWall,
    woodCarving,
    roofTiles,
    dhakaPattern,
    busSide,
    coinFace,
    contactShadow,
    dispose: () => {
      cobblestoneRoad.dispose();
      brickWall.dispose();
      woodCarving.dispose();
      roofTiles.dispose();
      dhakaPattern.dispose();
      busSide.dispose();
      coinFace.dispose();
      contactShadow.dispose();
    },
  };
}
