export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';

export type OutfitId = 'classic' | 'heritage' | 'festival';

export type PowerUpType = 'magnet' | 'jetpack' | 'multiplier' | 'shield';

export interface ActivePowerUpState {
  type: PowerUpType;
  remaining: number;
  duration: number;
}

export interface GameHudState {
  status: GameStatus;
  score: number;
  bestScore: number;
  coins: number;
  totalCoins: number;
  distance: number;
  speed: number;
  multiplier: number;
  activePowerUps: ActivePowerUpState[];
  isNewBest: boolean;
  crashReason: string;
  outfit: OutfitId;
  muted: boolean;
  noticeText: string;
}

export const LANE_WIDTH = 2.75;
export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH] as const;
export const TRACK_SEGMENT_LENGTH = 36;
export const NUM_TRACK_SEGMENTS = 6;

export const OUTFIT_CONFIGS: Record<
  OutfitId,
  {
    name: string;
    subtitle: string;
    coatColor: number;
    shirtColor: number;
    topiBase: number;
    topiAccent: number;
    scarfColor: number;
  }
> = {
  classic: {
    name: 'Mayor Classic',
    subtitle: 'Black Coat · Dhaka Topi',
    coatColor: 0x1a1b20,
    shirtColor: 0xf4f0e8,
    topiBase: 0x9e1b22,
    topiAccent: 0xf0c24b,
    scarfColor: 0xdc143c,
  },
  heritage: {
    name: 'Durbar Heritage',
    subtitle: 'Ivory Daura · Bhadgaunle',
    coatColor: 0xeae2d2,
    shirtColor: 0xfaf6ee,
    topiBase: 0x1c1b1e,
    topiAccent: 0xd4af37,
    scarfColor: 0xe69f24,
  },
  festival: {
    name: 'Indra Jatra',
    subtitle: 'Crimson Coat · Gold Dhaka',
    coatColor: 0x7c1922,
    shirtColor: 0xf7efe1,
    topiBase: 0x1b3b6f,
    topiAccent: 0xf5b82e,
    scarfColor: 0xf59e0b,
  },
};
