export interface PlayerState {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right' | 'up' | 'down';
  isMoving: boolean;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  keys: number;
  invulnerableTimer: number;
  isSeated: boolean;
}

export interface PuzzleSwitch {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  isDown: boolean;
  color: string;
  gateId: string;
}

export interface GoldenGate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  requiredSwitches: string[];
  requiresKey?: boolean;
  name: string;
}

export type EnemyArchetype =
  | 'dark_spirit'
  | 'rusher'
  | 'tank'
  | 'ranged'
  | 'shadow_wraith'
  | 'boss';

export interface Enemy {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  waypoints: { x: number; y: number }[];
  currentWaypoint: number;
  isDefeated: boolean;
  dropsKey: boolean;
  tokenDropCount: number;
  hitFlash: number;
  type: EnemyArchetype;
  shootCooldown?: number;
  shootTimer?: number;
  isBoss?: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  life: number;
  maxLife: number;
  damage: number;
  isOneShot?: boolean;
  isEnemy?: boolean;
  color: string;
  trail: { x: number; y: number }[];
}

export interface DroppedItem {
  id: string;
  type: 'key' | 'token' | 'ammo' | 'heal';
  x: number;
  y: number;
  value: number;
  collected: boolean;
  label?: string;
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface LevelData {
  id: number;
  level: number;
  chapter: number;
  depth: number;
  name: string;
  subtitle: string;
  floorTheme: 'courtyard' | 'cloister' | 'haven';
  width: number;
  height: number;
  spawn: { x: number; y: number };
  walls: { x: number; y: number; width: number; height: number; type?: 'cloud' | 'marble' | 'hedge' }[];
  switches: PuzzleSwitch[];
  gates: GoldenGate[];
  items: DroppedItem[];
  enemies: Enemy[];
  requiredKeys: number;
  requireAllEnemiesDefeated: boolean;
  exitZone: { x: number; y: number; width: number; height: number };
  hintText: string;
  scenicFeatures?: {
    fountains?: { x: number; y: number }[];
    flowerPads?: { x: number; y: number; radius: number }[];
    statues?: { x: number; y: number }[];
  };
}
