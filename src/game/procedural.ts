import type { LevelData, Enemy, EnemyArchetype, DroppedItem } from '../types/game';

const TILE_SIZE = 64;
const ARENA_OFFSET = 50;

export const MAX_CAMPAIGN_LEVEL = 10;
export const CHAPTERS_PER_LEVEL = 3;

const LEVEL_BIOME_NAMES = [
  'Sunlit Courtyard',     // Level 1
  'Clouded Gardens',      // Level 2
  'Windward Bastion',     // Level 3
  'Gilded Watchtower',    // Level 4
  'Dusky Labyrinth',      // Level 5
  'Obsidian Cloister',    // Level 6
  'Whispering Nave',      // Level 7
  'Arcane Reliquary',     // Level 8
  'Twilight Citadel',     // Level 9
  'Abyssal Threshold'     // Level 10
];

interface TileCoord {
  c: number;
  r: number;
}

function createArchetypeEnemy(
  id: string,
  archetype: EnemyArchetype,
  pos: { x: number; y: number },
  waypoints: { x: number; y: number }[],
  levelNum: number,
  chapterNum: number,
  dropsKey: boolean
): Enemy {
  const stage = (levelNum - 1) * CHAPTERS_PER_LEVEL + chapterNum; // 1..30
  const chapterBoost = (chapterNum - 1) * 0.15;

  if (archetype === 'boss') {
    const bossHp = Math.round(18 + levelNum * 1.4 + chapterNum * 2);
    return {
      id,
      name: levelNum === 10 ? 'Dreadlord of Haven' : 'Archon of Shadow',
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: 29,
      hp: bossHp,
      maxHp: bossHp,
      damage: 28,
      speed: 98 + levelNum * 2,
      waypoints,
      currentWaypoint: 0,
      isDefeated: false,
      dropsKey,
      tokenDropCount: 10,
      hitFlash: 0,
      type: 'boss',
      isBoss: true,
      shootCooldown: 1.65,
      shootTimer: 0.9
    };
  }

  if (archetype === 'tank') {
    const tankHp = Math.round(6 + levelNum * 0.8 + chapterNum);
    return {
      id,
      name: 'Obsidian Warden',
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: 24,
      hp: tankHp,
      maxHp: tankHp,
      damage: Math.min(34, 18 + levelNum),
      speed: 68 + Math.min(35, stage * 1.1),
      waypoints,
      currentWaypoint: 0,
      isDefeated: false,
      dropsKey,
      tokenDropCount: 5,
      hitFlash: 0,
      type: 'tank'
    };
  }

  if (archetype === 'rusher') {
    const rusherHp = Math.max(2, Math.round(2 + levelNum * 0.35 + chapterBoost));
    return {
      id,
      name: 'Swift Shade',
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: 15,
      hp: rusherHp,
      maxHp: rusherHp,
      damage: Math.min(28, 12 + levelNum),
      speed: Math.min(210, 138 + stage * 2.2),
      waypoints,
      currentWaypoint: 0,
      isDefeated: false,
      dropsKey,
      tokenDropCount: 3,
      hitFlash: 0,
      type: 'rusher'
    };
  }

  if (archetype === 'ranged') {
    const rangedHp = Math.max(3, Math.round(2 + levelNum * 0.45 + chapterBoost));
    return {
      id,
      name: 'Void Acolyte',
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: 18,
      hp: rangedHp,
      maxHp: rangedHp,
      damage: Math.min(26, 14 + levelNum),
      speed: Math.min(120, 74 + stage * 1.2),
      waypoints,
      currentWaypoint: 0,
      isDefeated: false,
      dropsKey,
      tokenDropCount: 4,
      hitFlash: 0,
      type: 'ranged',
      shootCooldown: Math.max(1.45, 2.5 - levelNum * 0.08),
      shootTimer: 0.6 + Math.random() * 1.0
    };
  }

  // Default basic Shadow
  const baseHp = Math.max(2, Math.round(1.5 + levelNum * 0.45 + chapterBoost));
  return {
    id,
    name: 'Shadow Spirit',
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    radius: 17,
    hp: baseHp,
    maxHp: baseHp,
    damage: Math.min(28, 12 + levelNum * 1.2),
    speed: Math.min(165, 82 + stage * 2.4),
    waypoints,
    currentWaypoint: 0,
    isDefeated: false,
    dropsKey,
    tokenDropCount: 3,
    hitFlash: 0,
    type: 'dark_spirit'
  };
}

/**
 * Generates a unique, BFS-verified procedural room for Level (1-10) & Chapter (1-3).
 */
export function generateProceduralRoom(levelNum: number, chapterNum: number): LevelData {
  const safeLevel = Math.max(1, Math.min(MAX_CAMPAIGN_LEVEL, levelNum));
  const safeChapter = Math.max(1, Math.min(CHAPTERS_PER_LEVEL, chapterNum));
  const stage = (safeLevel - 1) * CHAPTERS_PER_LEVEL + safeChapter; // 1..30

  // Arena geometry: open in Levels 1-2, expanding & tightening into mazes in deeper tiers
  const cols = safeLevel <= 2 ? 15 : safeLevel <= 6 ? 17 : 19;
  const rows = safeLevel <= 2 ? 11 : safeLevel <= 6 ? 12 : 13;

  const width = ARENA_OFFSET * 2 + cols * TILE_SIZE;
  const height = ARENA_OFFSET * 2 + rows * TILE_SIZE;

  const gateCol = Math.floor(cols / 2);
  const spawnCol = gateCol;
  const spawnRow = rows - 2;

  const theme: LevelData['floorTheme'] =
    safeLevel <= 2
      ? 'courtyard'
      : safeLevel <= 4
      ? safeChapter === 3
        ? 'haven'
        : 'courtyard'
      : safeLevel <= 8
      ? 'cloister'
      : safeChapter === 3
      ? 'haven'
      : 'cloister';

  const wallPalette: ('marble' | 'hedge' | 'cloud')[] =
    safeLevel <= 2
      ? ['hedge', 'cloud', 'marble']
      : safeLevel <= 4
      ? ['marble', 'hedge', 'cloud']
      : safeLevel <= 8
      ? ['marble', 'marble', 'cloud']
      : ['marble'];

  let grid: number[][] = [];
  let wallTypes: ('marble' | 'hedge' | 'cloud')[][] = [];
  let reachableTiles: TileCoord[] = [];

  for (let attempt = 0; attempt < 30; attempt++) {
    grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    wallTypes = Array.from({ length: rows }, () => Array(cols).fill('marble'));

    // Perimeter walls
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          grid[r][c] = 1;
          wallTypes[r][c] = 'marble';
        }
      }
    }

    // North Gate Chamber framing
    for (let c = 1; c < cols - 1; c++) {
      if (c === gateCol - 2 || c === gateCol + 2) {
        grid[1][c] = 1;
        grid[2][c] = 1;
      }
    }
    grid[2][gateCol] = 2; // Gate tile
    grid[2][gateCol - 1] = 1;
    grid[2][gateCol + 1] = 1;

    // Obstacle density scales by Level Tier
    const baseDensity =
      safeLevel <= 2
        ? 0.08 + safeChapter * 0.015 // Open spaces
        : safeLevel <= 4
        ? 0.14 + safeChapter * 0.02 // Moderate tactical cover
        : safeLevel <= 6
        ? 0.21 + safeChapter * 0.02 // Maze-like corridors
        : safeLevel <= 8
        ? 0.22 + safeChapter * 0.02
        : 0.25 + safeChapter * 0.02; // Extreme tight corridors

    const useSymmetric = attempt % 2 === 0 && safeLevel < 5;

    for (let r = 3; r < rows - 2; r++) {
      for (let c = 2; c < cols - 2; c++) {
        const nearSpawn = r >= spawnRow - 1 && Math.abs(c - spawnCol) <= 1;
        const nearGateApproach = r === 3 && Math.abs(c - gateCol) <= 1;
        if (nearSpawn || nearGateApproach) continue;

        if (useSymmetric && c > gateCol) continue;

        if (Math.random() < baseDensity) {
          const wType = wallPalette[Math.floor(Math.random() * wallPalette.length)];
          grid[r][c] = 1;
          wallTypes[r][c] = wType;

          if (useSymmetric) {
            const mirrorC = cols - 1 - c;
            if (Math.abs(mirrorC - spawnCol) > 1 || r < spawnRow - 1) {
              grid[r][mirrorC] = 1;
              wallTypes[r][mirrorC] = wType;
            }
          }
        }
      }
    }

    // Levels 5-10: Maze-like horizontal corridor wings (with guaranteed side/center openings)
    if (safeLevel >= 5) {
      const mazeRows = safeLevel >= 9 ? [4, 7, rows - 4] : [Math.floor(rows * 0.5)];
      for (const mr of mazeRows) {
        if (mr <= 3 || mr >= rows - 2) continue;
        const gapA = 2 + Math.floor(Math.random() * 3);
        const gapB = cols - 3 - Math.floor(Math.random() * 3);
        for (let c = 2; c < cols - 2; c++) {
          if (c === gapA || c === gapB || Math.abs(c - gateCol) <= 0) continue;
          if (Math.random() < 0.72) {
            grid[mr][c] = 1;
            wallTypes[mr][c] = 'marble';
          }
        }
      }
    }

    // BFS reachability verification from spawn
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue: TileCoord[] = [{ c: spawnCol, r: spawnRow }];
    visited[spawnRow][spawnCol] = true;
    reachableTiles = [];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      reachableTiles.push(curr);
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const nc = curr.c + dc;
        const nr = curr.r + dr;
        if (nr >= 1 && nr < rows - 1 && nc >= 1 && nc < cols - 1 && !visited[nr][nc] && grid[nr][nc] === 0) {
          visited[nr][nc] = true;
          queue.push({ c: nc, r: nr });
        }
      }
    }

    const gateApproachReachable = visited[3][gateCol];
    if (gateApproachReachable && reachableTiles.length >= Math.floor((cols - 2) * (rows - 3) * 0.48)) {
      break;
    }
  }

  const tileCenter = (c: number, r: number) => ({
    x: ARENA_OFFSET + c * TILE_SIZE + TILE_SIZE / 2,
    y: ARENA_OFFSET + r * TILE_SIZE + TILE_SIZE / 2
  });

  // Merge contiguous horizontal walls
  const walls: LevelData['walls'] = [];
  const consumed = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 1 || consumed[r][c]) continue;
      const type = wallTypes[r][c];
      let runEnd = c;
      while (runEnd + 1 < cols && grid[r][runEnd + 1] === 1 && !consumed[r][runEnd + 1] && wallTypes[r][runEnd + 1] === type) {
        runEnd++;
      }
      for (let k = c; k <= runEnd; k++) consumed[r][k] = true;

      const isPerimeter = r === 0 || r === rows - 1 || c === 0 || runEnd === cols - 1;
      const inset = isPerimeter ? 0 : 4;
      walls.push({
        x: ARENA_OFFSET + c * TILE_SIZE + inset,
        y: ARENA_OFFSET + r * TILE_SIZE + inset,
        width: (runEnd - c + 1) * TILE_SIZE - inset * 2,
        height: TILE_SIZE - inset * 2,
        type
      });
    }
  }

  const candidates = reachableTiles.filter((t) => {
    const distSpawn = Math.hypot(t.c - spawnCol, t.r - spawnRow);
    return t.r >= 3 && distSpawn >= 2.7;
  });
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);

  const buildPatrolWaypoints = (start: TileCoord) => {
    const pts: { x: number; y: number }[] = [tileCenter(start.c, start.r)];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ].sort(() => Math.random() - 0.5);

    for (const [dc, dr] of dirs) {
      let step = 1;
      while (
        step <= 3 &&
        start.r + dr * step >= 3 &&
        start.r + dr * step < rows - 1 &&
        start.c + dc * step >= 1 &&
        start.c + dc * step < cols - 1 &&
        grid[start.r + dr * step][start.c + dc * step] === 0
      ) {
        step++;
      }
      if (step > 1) {
        pts.push(tileCenter(start.c + dc * (step - 1), start.r + dr * (step - 1)));
        break;
      }
    }
    return pts;
  };

  // Determine enemy roster based on Level tier & Chapter
  const isMiniBossChapter = safeLevel >= 9 && safeChapter === 3;
  const enemyCount = Math.min(10, 2 + Math.floor(safeLevel * 0.6) + (safeChapter - 1));
  const requiredKeys = safeLevel <= 2 ? 1 : safeLevel <= 6 ? 2 : 3;
  const keysFromEnemies = Math.min(requiredKeys, Math.max(1, Math.ceil(requiredKeys / 2)));
  const keysInAlcoves = requiredKeys - keysFromEnemies;

  const roster: EnemyArchetype[] = [];
  if (isMiniBossChapter) roster.push('boss');

  while (roster.length < enemyCount) {
    const idx = roster.length;
    if (safeLevel <= 2) {
      roster.push('dark_spirit');
    } else if (safeLevel <= 4) {
      roster.push(idx % 2 === 0 ? 'rusher' : 'dark_spirit');
    } else if (safeLevel <= 6) {
      if (idx === 0 || idx % 3 === 1) roster.push('tank');
      else if (idx % 2 === 0) roster.push('rusher');
      else roster.push('dark_spirit');
    } else if (safeLevel <= 8) {
      if (idx % 3 === 0) roster.push('ranged');
      else if (idx % 3 === 1) roster.push('tank');
      else roster.push('rusher');
    } else {
      // Levels 9-10: Combined elite roster
      const pool: EnemyArchetype[] = ['ranged', 'tank', 'rusher', 'dark_spirit'];
      roster.push(pool[idx % pool.length]);
    }
  }

  const enemies: Enemy[] = [];
  const usedEnemyTiles = new Set<string>();

  for (let i = 0; i < roster.length && shuffled.length > 0; i++) {
    const tile = shuffled.pop()!;
    usedEnemyTiles.add(`${tile.c},${tile.r}`);
    const pos = tileCenter(tile.c, tile.r);
    const waypoints = buildPatrolWaypoints(tile);
    const dropsKey = i < keysFromEnemies;

    enemies.push(
      createArchetypeEnemy(
        `lvl${safeLevel}_ch${safeChapter}_e${i}`,
        roster[i],
        pos,
        waypoints,
        safeLevel,
        safeChapter,
        dropsKey
      )
    );
  }

  // Pickups
  const items: DroppedItem[] = [];
  const remainingTiles = candidates
    .filter((t) => !usedEnemyTiles.has(`${t.c},${t.r}`))
    .sort(() => Math.random() - 0.5);

  const takeTile = (): TileCoord =>
    remainingTiles.pop() || { c: spawnCol + (Math.random() > 0.5 ? 1 : -1), r: spawnRow };

  for (let k = 0; k < keysInAlcoves; k++) {
    const t = takeTile();
    const pos = tileCenter(t.c, t.r);
    items.push({
      id: `l${safeLevel}_c${safeChapter}_key_${k}`,
      type: 'key',
      x: pos.x,
      y: pos.y,
      value: 1,
      collected: false,
      label: 'Sanctuary Key'
    });
  }

  const ammoCount = 2 + (safeLevel >= 5 ? 1 : 0);
  for (let a = 0; a < ammoCount; a++) {
    const t = takeTile();
    const pos = tileCenter(t.c, t.r);
    items.push({
      id: `l${safeLevel}_c${safeChapter}_ammo_${a}`,
      type: 'ammo',
      x: pos.x,
      y: pos.y,
      value: 6,
      collected: false
    });
  }

  const healTile = takeTile();
  const healPos = tileCenter(healTile.c, healTile.r);
  items.push({
    id: `l${safeLevel}_c${safeChapter}_heal`,
    type: 'heal',
    x: healPos.x,
    y: healPos.y,
    value: 35,
    collected: false
  });

  const tokenValue = 5 + Math.floor(stage * 0.6);
  const tokenSpots = 2 + (safeLevel >= 4 ? 1 : 0);
  for (let tok = 0; tok < tokenSpots; tok++) {
    const t = takeTile();
    const pos = tileCenter(t.c, t.r);
    items.push({
      id: `l${safeLevel}_c${safeChapter}_tok_${tok}`,
      type: 'token',
      x: pos.x,
      y: pos.y,
      value: tokenValue,
      collected: false
    });
  }

  const flowerPads = remainingTiles.slice(0, 4).map((t) => {
    const p = tileCenter(t.c, t.r);
    return { x: p.x, y: p.y, radius: 22 };
  });

  const gateX = ARENA_OFFSET + gateCol * TILE_SIZE;
  const gateY = ARENA_OFFSET + 2 * TILE_SIZE + 14;
  const portalPos = tileCenter(gateCol, 1);
  const spawnPos = tileCenter(spawnCol, spawnRow);
  const biome = LEVEL_BIOME_NAMES[safeLevel - 1] || 'Sanctuary';

  return {
    id: stage,
    level: safeLevel,
    chapter: safeChapter,
    depth: stage,
    name: `Level ${safeLevel}-${safeChapter} · ${biome}`,
    subtitle: biome,
    floorTheme: theme,
    width,
    height,
    spawn: spawnPos,
    walls,
    switches: [],
    gates: [
      {
        id: `gate_${safeLevel}_${safeChapter}`,
        name: 'Sanctuary Gate',
        x: gateX,
        y: gateY,
        width: TILE_SIZE,
        height: 28,
        isOpen: false,
        requiresKey: true,
        requiredSwitches: []
      }
    ],
    enemies,
    items,
    requiredKeys,
    requireAllEnemiesDefeated: false,
    exitZone: {
      x: portalPos.x - 42,
      y: portalPos.y - 26,
      width: 84,
      height: 52
    },
    hintText: isMiniBossChapter
      ? `Mini-Boss Chamber: Banish the ${enemies[0]?.name || 'Archon'} and claim ${requiredKeys} Keys.`
      : requiredKeys === 1
      ? 'Banish the key-bearing Shadow to unseal the north Sanctuary Gate.'
      : `Claim ${requiredKeys} Sanctuary Keys to unseal the north gate.`,
    scenicFeatures: {
      flowerPads
    }
  };
}
