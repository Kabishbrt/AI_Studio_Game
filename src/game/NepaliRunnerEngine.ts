import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { NepaliAudioEngine } from './audio';
import {
  BalenRig,
  ObstacleInstance,
  ObstacleKind,
  createBalenCharacter,
  createHimalayanHorizon,
  createMoharCoinMesh,
  createObstacleMesh,
  createPowerUpMesh,
  createTrackSegment,
} from './models';
import { NepaliTextureSet, createNepaliTextures } from './textures';
import {
  ActivePowerUpState,
  GameHudState,
  GameStatus,
  LANE_X,
  NUM_TRACK_SEGMENTS,
  OutfitId,
  PowerUpType,
  TRACK_SEGMENT_LENGTH,
} from './types';

// Pre-allocated math helpers (zero GC inside animation loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();

interface CoinItem {
  mesh: THREE.Group;
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  attracted: boolean;
}

interface PowerUpItem {
  mesh: THREE.Group;
  type: PowerUpType;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

const STORAGE_BEST_KEY = 'kathmandu_dash_best_v1';
const STORAGE_COINS_KEY = 'kathmandu_dash_coins_v1';
const STORAGE_OUTFIT_KEY = 'kathmandu_dash_outfit_v1';

const POWERUP_DURATIONS: Record<PowerUpType, number> = {
  magnet: 10,
  jetpack: 6.5,
  multiplier: 12,
  shield: 18,
};

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class NepaliRunnerEngine {
  private container: HTMLElement;
  private onStateChange: (state: GameHudState) => void;
  private onContextLostChange?: (lost: boolean) => void;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private keyLight: THREE.DirectionalLight;
  private textures: NepaliTextureSet;
  private audio = new NepaliAudioEngine();

  private balen: BalenRig;
  private horizonGroup: THREE.Group;
  private trackSegments: THREE.Group[] = [];
  private obstacles: ObstacleInstance[] = [];
  private coins: CoinItem[] = [];
  private powerUps: PowerUpItem[] = [];
  private particles: SparkParticle[] = [];
  private particleGeo: THREE.OctahedronGeometry;

  // Game State
  private status: GameStatus = 'menu';
  private outfit: OutfitId = 'classic';
  private score = 0;
  private bestScore = 0;
  private runCoins = 0;
  private totalCoins = 0;
  private distance = 0;
  private speed = 18.5;
  private isNewBest = false;
  private crashReason = '';
  private noticeText = '';
  private noticeTimer = 0;
  private coinStreak = 0;
  private coinStreakTimer = 0;

  // Player Kinematics
  private targetLane = 1; // 0 = left, 1 = center, 2 = right
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;
  private velY = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private queuedLaneDelta = 0;
  private queuedJump = false;
  private queuedSlide = false;
  private runAnimPhase = 0;
  private laneTilt = 0;
  private cameraShake = 0;

  // Spawner & Power-Ups
  private nextSpawnZ = -28;
  private activePowerUps: Map<PowerUpType, number> = new Map();
  private jetpackCoinsSpawnedZ = 0;

  // Loop & Timers
  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private hudEmitAccum = 0;
  private elapsedTotal = 0;

  constructor(
    container: HTMLElement,
    onStateChange: (state: GameHudState) => void,
    onContextLostChange?: (lost: boolean) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onContextLostChange = onContextLostChange;

    // Load persisted stats
    try {
      this.bestScore = Number(localStorage.getItem(STORAGE_BEST_KEY) || '0') || 0;
      this.totalCoins = Number(localStorage.getItem(STORAGE_COINS_KEY) || '0') || 0;
      const savedOutfit = localStorage.getItem(STORAGE_OUTFIT_KEY) as OutfitId | null;
      if (savedOutfit && (savedOutfit === 'classic' || savedOutfit === 'heritage' || savedOutfit === 'festival')) {
        this.outfit = savedOutfit;
      }
    } catch {
      // Ignore storage failures
    }

    this.isSoftwareGl = detectSoftwareGl();

    // Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    container.appendChild(this.renderer.domElement);

    // WebGL context safety handlers
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    // Scene & Himalayan Golden-Hour Atmosphere
    this.scene = new THREE.Scene();
    const skyColor = 0xe9d8c0; // Warm golden Himalayan morning mist
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(skyColor, 0.0085);

    // Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera
    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.2, 260);
    this.camera.position.set(1.8, 2.2, -4.4);

    // 3-Point Warm/Cool Lighting Rig
    const hemi = new THREE.HemisphereLight(0xbcd8f5, 0x6b4c35, 0.72);
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight(0xfff0d4, 1.85);
    this.keyLight.position.set(18, 28, 16);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    const d = 18;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 70;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    const rimLight = new THREE.DirectionalLight(0xf6c27a, 0.55);
    rimLight.position.set(-14, 12, -24);
    this.scene.add(rimLight);

    // Procedural Textures & Models
    this.textures = createNepaliTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.particleGeo = new THREE.OctahedronGeometry(0.11, 0);

    // Build Street Segments
    for (let i = 0; i < NUM_TRACK_SEGMENTS; i++) {
      const seg = createTrackSegment(this.textures, i);
      seg.position.z = -i * TRACK_SEGMENT_LENGTH;
      this.scene.add(seg);
      this.trackSegments.push(seg);
    }

    // Build Distant Himalayan Horizon
    this.horizonGroup = createHimalayanHorizon();
    this.scene.add(this.horizonGroup);

    // Build Balen Shah Character
    this.balen = createBalenCharacter(this.textures, this.outfit);
    this.scene.add(this.balen.root);

    // Pre-warm shaders on GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.emitHudState();

    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.onContextLostChange?.(true);
    if (this.status === 'playing') {
      this.pauseGame();
    }
  };

  private handleContextRestored = (): void => {
    this.onContextLostChange?.(false);
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  // --- PUBLIC ACTIONS ---
  public startNewRun(): void {
    this.audio.unlock();
    this.clearDynamicEntities();

    this.status = 'playing';
    this.score = 0;
    this.runCoins = 0;
    this.distance = 0;
    this.speed = 19.0;
    this.isNewBest = false;
    this.crashReason = '';
    this.noticeText = 'Kathmandu Dash';
    this.noticeTimer = 1.6;
    this.coinStreak = 0;
    this.coinStreakTimer = 0;

    this.targetLane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerZ = 0;
    this.velY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.queuedLaneDelta = 0;
    this.queuedJump = false;
    this.queuedSlide = false;
    this.laneTilt = 0;
    this.cameraShake = 0;

    this.activePowerUps.clear();
    this.balen.jetpackGroup.visible = false;
    this.balen.shieldMesh.visible = false;
    this.balen.root.position.set(0, 0, 0);

    // Reset track segments cleanly around z = 0
    this.trackSegments.forEach((seg, i) => {
      seg.position.z = -i * TRACK_SEGMENT_LENGTH;
    });

    this.nextSpawnZ = -34;
    this.ensureObstaclesAhead();

    this.audio.playStart();
    this.audio.startRhythm();
    this.emitHudState();
  }

  public pauseGame(): void {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.audio.stopRhythm();
    this.emitHudState();
  }

  public resumeGame(): void {
    if (this.status !== 'paused') return;
    this.status = 'playing';
    this.lastTimeMs = performance.now();
    this.audio.startRhythm();
    this.emitHudState();
  }

  public returnToMenu(): void {
    this.clearDynamicEntities();
    this.status = 'menu';
    this.audio.stopRhythm();
    this.targetLane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerZ = 0;
    this.velY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.activePowerUps.clear();
    this.balen.jetpackGroup.visible = false;
    this.balen.shieldMesh.visible = false;
    this.balen.root.position.set(0, 0, 0);
    this.trackSegments.forEach((seg, i) => {
      seg.position.z = -i * TRACK_SEGMENT_LENGTH;
    });
    this.emitHudState();
  }

  public setOutfit(outfit: OutfitId): void {
    this.outfit = outfit;
    this.balen.applyOutfit(outfit);
    try {
      localStorage.setItem(STORAGE_OUTFIT_KEY, outfit);
    } catch {
      // Ignore storage error
    }
    this.emitHudState();
  }

  public toggleMute(): void {
    const next = !this.audio.isMuted();
    this.audio.setMuted(next);
    if (!next && this.status === 'playing') {
      this.audio.startRhythm();
    }
    this.emitHudState();
  }

  public moveLane(delta: -1 | 1): void {
    if (this.status !== 'playing') return;
    const nextLane = THREE.MathUtils.clamp(this.targetLane + delta, 0, 2);
    if (nextLane !== this.targetLane) {
      this.targetLane = nextLane;
      this.audio.playLaneSwitch();
    } else {
      this.queuedLaneDelta = delta;
    }
  }

  public jump(): void {
    if (this.status !== 'playing') return;
    if (this.activePowerUps.has('jetpack')) return;

    if (this.isGrounded) {
      this.slideTimer = 0;
      this.velY = 16.8;
      this.isGrounded = false;
      this.spawnBurst(this.playerX, this.playerY + 0.1, this.playerZ, 0xd6c7b2, 6, 3.2);
      this.audio.playJump();
    } else {
      this.queuedJump = true;
    }
  }

  public slide(): void {
    if (this.status !== 'playing') return;
    if (this.activePowerUps.has('jetpack')) return;

    if (this.isGrounded) {
      if (this.slideTimer <= 0.1) {
        this.audio.playSlide();
      }
      this.slideTimer = 0.68;
      this.queuedSlide = false;
    } else {
      // Fast-fall dive in mid-air (classic Subway Surfer responsiveness)
      this.velY = Math.min(this.velY, -30);
      this.queuedSlide = true;
    }
  }

  // --- GAME LOOP ---
  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTimeMs) / 1000;
    this.lastTimeMs = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsedTotal += dt;

    if (this.status === 'playing') {
      this.updateGameplay(dt);
    } else if (this.status === 'menu') {
      this.updateMenuIdle(dt);
    }

    this.updateParticles(dt);
    this.updateCameraAndLights(dt);
    this.renderer.render(this.scene, this.camera);

    this.scheduleNextFrame();
  };

  private updateMenuIdle(dt: number): void {
    this.runAnimPhase += dt * 3.0;
    // Gentle confident idle stance breathing & slight Khada sway
    this.balen.bodyPivot.position.set(0, Math.sin(this.runAnimPhase) * 0.035, 0);
    this.balen.bodyPivot.rotation.set(0, 0, 0);
    this.balen.bodyPivot.scale.set(1, 1, 1);
    this.balen.leftArmPivot.rotation.set(Math.sin(this.runAnimPhase) * 0.08, 0, 0.08);
    this.balen.rightArmPivot.rotation.set(-Math.sin(this.runAnimPhase) * 0.08, 0, -0.08);
    this.balen.leftLegPivot.rotation.set(0, 0, 0);
    this.balen.rightLegPivot.rotation.set(0, 0, 0);
    this.balen.khadaPivot.rotation.x = Math.sin(this.runAnimPhase * 1.4) * 0.08;
    this.balen.headGroup.rotation.y = Math.sin(this.runAnimPhase * 0.6) * 0.12;
  }

  private updateGameplay(dt: number): void {
    // 1. Speed progression & distance scoring
    this.speed = Math.min(40, 19.0 + this.distance * 0.011);
    const jetpackBoost = this.activePowerUps.has('jetpack') ? 1.32 : 1.0;
    const effectiveSpeed = this.speed * jetpackBoost;
    const stepZ = effectiveSpeed * dt;

    this.playerZ -= stepZ;
    this.distance += stepZ;

    const multiplier = this.activePowerUps.has('multiplier') ? 2 : 1;
    this.score += stepZ * 2.2 * multiplier;

    // Update timers
    if (this.noticeTimer > 0) {
      this.noticeTimer -= dt;
      if (this.noticeTimer <= 0) this.noticeText = '';
    }
    if (this.coinStreakTimer > 0) {
      this.coinStreakTimer -= dt;
      if (this.coinStreakTimer <= 0) this.coinStreak = 0;
    }
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 3.5);
    }

    // Update Power-Up timers
    for (const [ptype, rem] of Array.from(this.activePowerUps.entries())) {
      const nextRem = rem - dt;
      if (nextRem <= 0) {
        this.activePowerUps.delete(ptype);
        if (ptype === 'jetpack') {
          this.balen.jetpackGroup.visible = false;
        } else if (ptype === 'shield') {
          this.balen.shieldMesh.visible = false;
        }
      } else {
        this.activePowerUps.set(ptype, nextRem);
      }
    }

    // 2. Lane Switching with smooth exponential damping & body tilt
    const targetX = LANE_X[this.targetLane];
    const prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 16, dt);
    const dx = this.playerX - prevX;
    this.laneTilt = THREE.MathUtils.damp(this.laneTilt, THREE.MathUtils.clamp(-dx * 1.4, -0.28, 0.28), 14, dt);

    // 3. Vertical Physics & Ramp / Bus-Roof Surface Support
    const surfaceY = this.getGroundHeightAt(this.playerX, this.playerZ);

    if (this.activePowerUps.has('jetpack')) {
      this.playerY = THREE.MathUtils.damp(this.playerY, 6.3, 6.5, dt);
      this.velY = 0;
      this.isGrounded = false;
      this.slideTimer = 0;

      // Spawn sky coin lines while flying!
      if (this.playerZ - 26 < this.jetpackCoinsSpawnedZ) {
        this.spawnJetpackSkyCoins(this.playerZ - 32);
        this.jetpackCoinsSpawnedZ = this.playerZ - 24;
      }
    } else {
      if (this.slideTimer > 0) {
        this.slideTimer = Math.max(0, this.slideTimer - dt);
      }

      if (!this.isGrounded) {
        this.velY += -46 * dt;
        this.playerY += this.velY * dt;
        if (this.playerY <= surfaceY) {
          this.playerY = surfaceY;
          this.velY = 0;
          this.isGrounded = true;
          this.spawnBurst(this.playerX, this.playerY + 0.08, this.playerZ, 0xc9b9a3, 4, 2.2);

          if (this.queuedJump) {
            this.queuedJump = false;
            this.jump();
          } else if (this.queuedSlide) {
            this.queuedSlide = false;
            this.slide();
          }
        }
      } else {
        // Check if walked off a bus roof or ramp
        if (this.playerY > surfaceY + 0.35) {
          this.isGrounded = false;
          this.velY = 0;
        } else {
          this.playerY = surfaceY;
        }
      }

      if (this.queuedLaneDelta !== 0 && Math.abs(this.playerX - targetX) < 0.25) {
        const d = this.queuedLaneDelta as -1 | 1;
        this.queuedLaneDelta = 0;
        this.moveLane(d);
      }
    }

    // 4. Update Balen Character Rig & Running Animation
    this.balen.root.position.set(this.playerX, this.playerY, this.playerZ);
    const groundBelow = this.getGroundHeightAt(this.playerX, this.playerZ);
    const heightAboveSurface = Math.max(0, this.playerY - groundBelow);
    this.balen.contactShadow.position.y = -heightAboveSurface + 0.03;
    const shadowScale = Math.max(0.35, 1.0 - heightAboveSurface * 0.14);
    this.balen.contactShadow.scale.setScalar(shadowScale);
    (this.balen.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.72 * shadowScale;

    this.animateBalenRun(dt, effectiveSpeed);

    // 5. Recycle Endless Track Segments
    const recycleThreshold = this.playerZ + TRACK_SEGMENT_LENGTH * 1.1;
    let minSegZ = Infinity;
    for (const seg of this.trackSegments) {
      if (seg.position.z < minSegZ) minSegZ = seg.position.z;
    }
    for (const seg of this.trackSegments) {
      if (seg.position.z > recycleThreshold) {
        minSegZ -= TRACK_SEGMENT_LENGTH;
        seg.position.z = minSegZ;
      }
      // Subtle prayer flag flutter
      const flags = seg.getObjectByName('prayerFlags');
      if (flags) {
        flags.rotation.x = Math.sin(this.elapsedTotal * 5.2 + seg.position.z) * 0.14;
      }
    }

    // 6. Spawn Obstacles & Collectibles Ahead & Clean Up Behind
    this.ensureObstaclesAhead();
    this.updateObstaclesAndCollisions(dt, multiplier);
    this.updateCollectibles(dt, multiplier);

    // Emit HUD at ~20Hz to keep React super lean
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.emitHudState();
    }
  }

  private animateBalenRun(dt: number, effectiveSpeed: number): void {
    const isJetpack = this.activePowerUps.has('jetpack');
    const isSliding = this.slideTimer > 0 && this.isGrounded;

    this.balen.bodyPivot.rotation.z = this.laneTilt;
    this.balen.headGroup.rotation.y = -this.laneTilt * 0.7;

    if (isJetpack) {
      this.balen.bodyPivot.position.y = Math.sin(this.elapsedTotal * 10) * 0.06;
      this.balen.bodyPivot.rotation.x = -0.35;
      this.balen.bodyPivot.scale.set(1, 1, 1);
      this.balen.leftLegPivot.rotation.x = 0.35;
      this.balen.rightLegPivot.rotation.x = 0.2;
      this.balen.leftArmPivot.rotation.x = -0.45;
      this.balen.rightArmPivot.rotation.x = -0.45;
      this.balen.jetFlameLeft.scale.y = 0.8 + Math.random() * 0.55;
      this.balen.jetFlameRight.scale.y = 0.8 + Math.random() * 0.55;
      return;
    }

    if (isSliding) {
      this.balen.bodyPivot.position.y = -0.38;
      this.balen.bodyPivot.rotation.x = 0.88; // Low forward/backward baseball-style slide duck!
      this.balen.bodyPivot.scale.set(1, 0.76, 1);
      this.balen.leftLegPivot.rotation.x = -0.9;
      this.balen.rightLegPivot.rotation.x = -0.65;
      this.balen.leftArmPivot.rotation.x = 0.75;
      this.balen.rightArmPivot.rotation.x = 0.75;
      this.balen.khadaPivot.rotation.x = 0.3;
      return;
    }

    this.balen.bodyPivot.scale.set(1, 1, 1);

    if (!this.isGrounded) {
      // Mid-air heroic jump tuck
      this.balen.bodyPivot.position.y = 0;
      this.balen.bodyPivot.rotation.x = -0.14;
      this.balen.leftLegPivot.rotation.x = 0.55;
      this.balen.rightLegPivot.rotation.x = -0.45;
      this.balen.leftArmPivot.rotation.x = -0.85;
      this.balen.rightArmPivot.rotation.x = 0.55;
      this.balen.khadaPivot.rotation.x = 0.28 + Math.sin(this.elapsedTotal * 14) * 0.1;
      return;
    }

    // Crisp running stride synced to forward speed
    this.runAnimPhase += dt * effectiveSpeed * 0.72;
    const s = Math.sin(this.runAnimPhase);
    const bounce = Math.abs(Math.cos(this.runAnimPhase)) * 0.11;

    this.balen.bodyPivot.position.y = bounce;
    this.balen.bodyPivot.rotation.x = -0.16;
    this.balen.leftLegPivot.rotation.x = s * 0.95;
    this.balen.rightLegPivot.rotation.x = -s * 0.95;
    this.balen.leftArmPivot.rotation.x = -s * 0.85;
    this.balen.rightArmPivot.rotation.x = s * 0.85;
    this.balen.khadaPivot.rotation.x = 0.12 + Math.sin(this.runAnimPhase * 2) * 0.14;

    if (this.balen.shieldMesh.visible) {
      this.balen.shieldMesh.rotation.y += dt * 1.8;
      this.balen.shieldMesh.rotation.x += dt * 0.9;
    }
  }

  private getGroundHeightAt(x: number, z: number): number {
    let maxY = 0;
    for (const obs of this.obstacles) {
      if (obs.destroyed) continue;
      if (obs.kind !== 'bus' && obs.kind !== 'bus_ramp') continue;
      const laneX = LANE_X[obs.lane];
      if (Math.abs(x - laneX) > obs.width * 0.52) continue;

      const busFrontZ = obs.zCenter + 4.2;
      const busBackZ = obs.zCenter - 4.2;

      if (z <= busFrontZ && z >= busBackZ) {
        if (this.playerY >= 2.2) {
          maxY = Math.max(maxY, obs.deckTopY);
        }
      } else if (obs.hasRamp && z > busFrontZ && z <= obs.rampStartZ) {
        const t = (obs.rampStartZ - z) / (obs.rampStartZ - busFrontZ);
        maxY = Math.max(maxY, THREE.MathUtils.clamp(t, 0, 1) * obs.deckTopY);
      }
    }
    return maxY;
  }

  // --- OBSTACLE & COLLECTIBLE PROCEDURAL CHUNK SPAWNER ---
  private ensureObstaclesAhead(): void {
    const horizonZ = this.playerZ - 145;
    while (this.nextSpawnZ > horizonZ) {
      this.spawnChunk(this.nextSpawnZ);
      const gap = Math.max(21, 31 - this.speed * 0.22);
      this.nextSpawnZ -= gap;
    }
  }

  private spawnChunk(zBase: number): void {
    // Pick 1 or 2 lanes to occupy (always leaves >= 1 clean or jumpable/slidable path!)
    const lanes = [0, 1, 2];
    const pattern = Math.random();

    if (pattern < 0.25) {
      // Single bus with ramp + coins leading up onto its roof!
      const lane = lanes[Math.floor(Math.random() * 3)];
      this.addObstacle('bus_ramp', lane, zBase);
      this.spawnCoinLine(lane, zBase + 8.5, zBase - 4, 6, 3.35, true);

      // Optional low barrier in another lane
      const otherLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
      this.addObstacle('barricade_low', otherLane, zBase - 2);
    } else if (pattern < 0.5) {
      // 2-lane staggered buses/chariots (must weave through open lane)
      const openLane = Math.floor(Math.random() * 3);
      for (let l = 0; l < 3; l++) {
        if (l === openLane) {
          this.spawnCoinLine(l, zBase + 4, zBase - 6, 5, 0.75, false);
        } else {
          const kind: ObstacleKind = Math.random() < 0.55 ? 'bus' : 'chariot';
          this.addObstacle(kind, l, zBase - (l === 0 ? 1.5 : 0));
        }
      }
    } else if (pattern < 0.75) {
      // Jumpable low barricades / bell carts with coin arcs over them!
      const l1 = Math.floor(Math.random() * 3);
      const l2 = (l1 + 1) % 3;
      this.addObstacle(Math.random() < 0.6 ? 'barricade_low' : 'bell_cart', l1, zBase);
      this.spawnCoinArc(l1, zBase, 5, 2.35);
      this.addObstacle('torana_high', l2, zBase - 2);
      this.spawnCoinLine(l2, zBase + 1, zBase - 5, 4, 0.65, false);
    } else {
      // Overhead Torana arch + open coin trail + occasional Power-Up!
      const lane = Math.floor(Math.random() * 3);
      this.addObstacle('torana_high', lane, zBase);
      const openLane = (lane + 1) % 3;
      this.spawnCoinLine(openLane, zBase + 4, zBase - 5, 5, 0.75, false);

      if (Math.random() < 0.36) {
        const types: PowerUpType[] = ['magnet', 'jetpack', 'multiplier', 'shield'];
        const ptype = types[Math.floor(Math.random() * types.length)];
        const pLane = (lane + 2) % 3;
        this.addPowerUp(ptype, pLane, zBase - 2);
      }
    }
  }

  private addObstacle(kind: ObstacleKind, lane: number, zCenter: number): void {
    const mesh = createObstacleMesh(kind, this.textures);
    mesh.position.set(LANE_X[lane], 0, zCenter);
    this.scene.add(mesh);

    let length = 1.4;
    let width = 2.15;
    let height = 1.1;
    let minClearanceY = 0;
    let hasRamp = false;
    let rampStartZ = zCenter;
    let deckTopY = 0;

    if (kind === 'bus' || kind === 'bus_ramp') {
      length = 8.4;
      width = 2.16;
      height = 2.95;
      deckTopY = 2.95;
      if (kind === 'bus_ramp') {
        hasRamp = true;
        rampStartZ = zCenter + 8.8;
      }
    } else if (kind === 'chariot') {
      length = 4.4;
      width = 2.2;
      height = 3.8;
    } else if (kind === 'barricade_low') {
      length = 0.8;
      width = 2.15;
      height = 1.05;
    } else if (kind === 'bell_cart') {
      length = 1.1;
      width = 1.9;
      height = 1.15;
    } else if (kind === 'torana_high') {
      length = 0.9;
      width = 2.25;
      height = 3.1;
      minClearanceY = 1.25; // Must slide underneath!
    }

    this.obstacles.push({
      group: mesh,
      kind,
      lane,
      zCenter,
      length,
      width,
      height,
      minClearanceY,
      hasRamp,
      rampStartZ,
      deckTopY,
      passed: false,
      nearMissAwarded: false,
      destroyed: false,
    });
  }

  private spawnCoinLine(
    lane: number,
    zStart: number,
    zEnd: number,
    count: number,
    baseY: number,
    rampSlope: boolean
  ): void {
    const x = LANE_X[lane];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const z = THREE.MathUtils.lerp(zStart, zEnd, t);
      const y = rampSlope ? THREE.MathUtils.lerp(0.8, baseY, Math.min(1, t * 1.4)) : baseY;
      this.addCoin(lane, x, y, z);
    }
  }

  private spawnCoinArc(lane: number, zCenter: number, count: number, peakY: number): void {
    const x = LANE_X[lane];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const z = THREE.MathUtils.lerp(zCenter + 3.2, zCenter - 3.2, t);
      const y = 0.75 + Math.sin(t * Math.PI) * (peakY - 0.75);
      this.addCoin(lane, x, y, z);
    }
  }

  private spawnJetpackSkyCoins(zStart: number): void {
    const lane = Math.floor(Math.random() * 3);
    for (let i = 0; i < 6; i++) {
      this.addCoin(lane, LANE_X[lane], 6.7, zStart - i * 2.8);
    }
  }

  private addCoin(lane: number, x: number, y: number, z: number): void {
    const mesh = createMoharCoinMesh(this.textures);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.coins.push({ mesh, lane, x, y, z, collected: false, attracted: false });
  }

  private addPowerUp(type: PowerUpType, lane: number, z: number): void {
    const mesh = createPowerUpMesh(type);
    const x = LANE_X[lane];
    mesh.position.set(x, 1.15, z);
    this.scene.add(mesh);
    this.powerUps.push({ mesh, type, x, y: 1.15, z, collected: false });
  }

  // --- COLLISIONS & COLLECTIBLES ---
  private updateObstaclesAndCollisions(dt: number, multiplier: number): void {
    const isSliding = this.slideTimer > 0 && this.isGrounded;
    const playerHalfW = 0.36;
    const playerHalfD = 0.35;
    const playerBottom = this.playerY;
    const playerTop = this.playerY + (isSliding ? 0.92 : 1.92);

    const cleanupZ = this.playerZ + 18;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (obs.zCenter - obs.length * 0.5 > cleanupZ) {
        this.scene.remove(obs.group);
        this.obstacles.splice(i, 1);
        continue;
      }
      if (obs.destroyed) continue;

      const obsX = LANE_X[obs.lane];
      const obsMinX = obsX - obs.width * 0.44;
      const obsMaxX = obsX + obs.width * 0.44;
      const obsMinZ = obs.zCenter - obs.length * 0.5;
      const obsMaxZ = obs.zCenter + obs.length * 0.5;

      // Near-miss bonus when passing close in adjacent lane
      if (!obs.nearMissAwarded && this.playerZ < obsMinZ) {
        obs.nearMissAwarded = true;
        if (Math.abs(this.playerX - obsX) < 3.1 && Math.abs(this.playerX - obsX) > 1.2) {
          this.score += 25 * multiplier;
        }
      }

      // Check Z overlap
      if (this.playerZ + playerHalfD < obsMinZ || this.playerZ - playerHalfD > obsMaxZ) {
        continue;
      }
      // Check X overlap
      if (this.playerX + playerHalfW < obsMinX || this.playerX - playerHalfW > obsMaxX) {
        continue;
      }

      // On bus ramp or safely riding on top of bus roof
      if ((obs.kind === 'bus' || obs.kind === 'bus_ramp') && playerBottom >= obs.deckTopY - 0.55) {
        continue;
      }

      // Check Y overlap
      if (obs.minClearanceY > 0) {
        // High Torana arch: hits if playerTop > minClearanceY AND playerBottom < obs.height
        if (playerTop > obs.minClearanceY && playerBottom < obs.height) {
          this.handleObstacleImpact(obs, dt);
        }
      } else {
        if (playerBottom < obs.height - 0.14 && playerTop > 0.05) {
          this.handleObstacleImpact(obs, dt);
        }
      }
    }
  }

  private handleObstacleImpact(obs: ObstacleInstance, _dt: number): void {
    // Bhimsen Shield absorbs 1 impact!
    if (this.activePowerUps.has('shield')) {
      this.activePowerUps.delete('shield');
      this.balen.shieldMesh.visible = false;
      obs.destroyed = true;
      this.scene.remove(obs.group);
      this.cameraShake = 0.65;
      this.noticeText = 'Bhimsen Shield Saved You!';
      this.noticeTimer = 1.5;
      this.spawnBurst(LANE_X[obs.lane], 1.2, obs.zCenter, 0x10b981, 18, 8.5);
      this.audio.playShieldBreak();
      return;
    }

    const reasonMap: Record<ObstacleKind, string> = {
      bus: 'Clipped a Sajha Yatayat bus!',
      bus_ramp: 'Hit the side of a Sajha Yatayat bus!',
      chariot: 'Collided with the Festival Rath chariot!',
      barricade_low: 'Tripped over a bamboo festival barricade!',
      torana_high: 'Forgot to duck under the carved Torana arch!',
      bell_cart: 'Stumbled on a temple bell stand!',
    };
    this.triggerGameOver(reasonMap[obs.kind]);
  }

  private triggerGameOver(reason: string): void {
    this.status = 'gameover';
    this.crashReason = reason;
    this.cameraShake = 0.85;
    this.audio.stopRhythm();
    this.audio.playCrash();
    this.spawnBurst(this.playerX, this.playerY + 1.0, this.playerZ, 0xdc143c, 20, 7.5);

    const finalScore = Math.floor(this.score);
    if (finalScore > this.bestScore) {
      this.bestScore = finalScore;
      this.isNewBest = true;
    }
    this.totalCoins += this.runCoins;

    try {
      localStorage.setItem(STORAGE_BEST_KEY, String(this.bestScore));
      localStorage.setItem(STORAGE_COINS_KEY, String(this.totalCoins));
    } catch {
      // Ignore storage error
    }

    this.emitHudState();
  }

  private updateCollectibles(dt: number, multiplier: number): void {
    const hasMagnet = this.activePowerUps.has('magnet');
    const cleanupZ = this.playerZ + 14;

    // Mohar Coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.collected || c.z > cleanupZ) {
        this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
        continue;
      }

      c.mesh.rotation.y += dt * 3.8;

      if (hasMagnet) {
        const dz = this.playerZ - c.z;
        const dx = this.playerX - c.x;
        const distSq = dx * dx + dz * dz;
        if (distSq < 155) {
          c.attracted = true;
        }
      }

      if (c.attracted) {
        c.x = THREE.MathUtils.damp(c.x, this.playerX, 15, dt);
        c.y = THREE.MathUtils.damp(c.y, this.playerY + 1.0, 15, dt);
        c.z = THREE.MathUtils.damp(c.z, this.playerZ, 15, dt);
        c.mesh.position.set(c.x, c.y, c.z);
      }

      const dx = this.playerX - c.x;
      const dy = this.playerY + 0.95 - c.y;
      const dz = this.playerZ - c.z;
      if (dx * dx + dy * dy + dz * dz < 1.35) {
        c.collected = true;
        this.runCoins += multiplier;
        this.score += 10 * multiplier;
        this.coinStreak++;
        this.coinStreakTimer = 0.85;
        this.audio.playCoin(this.coinStreak - 1);
        this.spawnBurst(c.x, c.y, c.z, 0xffd15c, 5, 3.8);
        this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
      }
    }

    // Power-Ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      if (p.collected || p.z > cleanupZ) {
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
        continue;
      }

      p.mesh.rotation.y += dt * 2.5;
      p.mesh.position.y = p.y + Math.sin(this.elapsedTotal * 4 + p.z) * 0.16;

      const dx = this.playerX - p.x;
      const dy = this.playerY + 1.0 - p.mesh.position.y;
      const dz = this.playerZ - p.z;
      if (dx * dx + dy * dy + dz * dz < 1.85) {
        p.collected = true;
        this.activatePowerUp(p.type);
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
      }
    }
  }

  private activatePowerUp(type: PowerUpType): void {
    this.activePowerUps.set(type, POWERUP_DURATIONS[type]);
    this.audio.playPowerUp(type);

    const labels: Record<PowerUpType, string> = {
      magnet: 'Khukuri Magnet Active!',
      jetpack: 'Akash Udan Flight!',
      multiplier: '2x Score Multiplier!',
      shield: 'Bhimsen Shield Ready!',
    };
    this.noticeText = labels[type];
    this.noticeTimer = 1.8;

    if (type === 'jetpack') {
      this.balen.jetpackGroup.visible = true;
      this.jetpackCoinsSpawnedZ = this.playerZ - 14;
    } else if (type === 'shield') {
      this.balen.shieldMesh.visible = true;
    }

    this.spawnBurst(this.playerX, this.playerY + 1.1, this.playerZ, 0xf59e0b, 14, 6.2);
    this.emitHudState();
  }

  // --- PARTICLES ---
  private spawnBurst(x: number, y: number, z: number, color: number, count: number, speed: number): void {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * speed * 1.6,
        vy: Math.random() * speed + 1.5,
        vz: (Math.random() - 0.5) * speed * 1.6,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.65,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const s = Math.max(0.05, p.life / p.maxLife);
      p.mesh.scale.setScalar(s);
    }
  }

  // --- CAMERA & LIGHT TRACKING ---
  private updateCameraAndLights(dt: number): void {
    // Keep directional sun shadow frustum centered near Balen
    this.keyLight.position.set(this.playerX + 18, 28, this.playerZ + 14);
    this.keyLight.target.position.set(this.playerX, 0, this.playerZ - 10);
    this.keyLight.target.updateMatrixWorld();

    // Keep distant Himalayan peaks anchored on the horizon
    this.horizonGroup.position.z = this.playerZ;

    if (this.status === 'menu') {
      // Heroic front-quarter framing showing Balen Shah's sunglasses, beard & Dhaka Topi
      // Offset look target slightly left in camera space (-X in world is right on screen when looking +Z)
      const sway = Math.sin(this.elapsedTotal * 0.55) * 0.35;
      _camTargetPos.set(-1.15 + sway, 1.98, -4.45);
      _camLookTarget.set(0.65, 1.32, 0);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
      this.camera.lookAt(_camLookTarget);
      if (Math.abs(this.camera.fov - 50) > 0.1) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 50, 6, dt);
        this.camera.updateProjectionMatrix();
      }
      return;
    }

    // Dynamic third-person chase camera
    const shakeX = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake * 0.55 : 0;
    const shakeY = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake * 0.45 : 0;

    const targetCamX = this.playerX * 0.68 + shakeX;
    const targetCamY = 3.85 + this.playerY * 0.58 + shakeY;
    const targetCamZ = this.playerZ + 6.5;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 11, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 9, dt);
    this.camera.position.z = targetCamZ;

    _vec3A.set(this.playerX * 0.5, this.playerY + 1.35, this.playerZ - 11.5);
    this.camera.lookAt(_vec3A);

    const desiredFov = this.activePowerUps.has('jetpack')
      ? 68
      : THREE.MathUtils.clamp(58 + (this.speed - 19) * 0.35, 58, 66);
    if (Math.abs(this.camera.fov - desiredFov) > 0.08) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, desiredFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private clearDynamicEntities(): void {
    for (const obs of this.obstacles) this.scene.remove(obs.group);
    this.obstacles = [];
    for (const c of this.coins) this.scene.remove(c.mesh);
    this.coins = [];
    for (const p of this.powerUps) this.scene.remove(p.mesh);
    this.powerUps = [];
    for (const pt of this.particles) this.scene.remove(pt.mesh);
    this.particles = [];
  }

  private emitHudState(): void {
    const activeList: ActivePowerUpState[] = [];
    this.activePowerUps.forEach((remaining, type) => {
      activeList.push({
        type,
        remaining,
        duration: POWERUP_DURATIONS[type],
      });
    });

    this.onStateChange({
      status: this.status,
      score: Math.floor(this.score),
      bestScore: Math.max(this.bestScore, Math.floor(this.score)),
      coins: this.runCoins,
      totalCoins: this.totalCoins,
      distance: Math.floor(this.distance),
      speed: Math.round(this.speed),
      multiplier: this.activePowerUps.has('multiplier') ? 2 : 1,
      activePowerUps: activeList,
      isNewBest: this.isNewBest,
      crashReason: this.crashReason,
      outfit: this.outfit,
      muted: this.audio.isMuted(),
      noticeText: this.noticeText,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.clearDynamicEntities();
    this.particleGeo.dispose();
    this.textures.dispose();
    this.audio.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
