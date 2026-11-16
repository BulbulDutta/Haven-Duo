/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type {
  PlayerState,
  Enemy,
  Projectile,
  DroppedItem,
  GameParticle,
  LevelData
} from './types/game';
import {
  generateProceduralRoom,
  MAX_CAMPAIGN_LEVEL,
  CHAPTERS_PER_LEVEL
} from './game/procedural';
import { GameRenderer } from './game/renderer';
import { sounds } from './services/sound';

import { Lobby } from './components/Lobby';
import { VirtualControls } from './components/VirtualControls';
import { ShopModal, SNAP_COST, BLASTER_COST } from './components/ShopModal';
import { VictoryModal } from './components/VictoryModal';
import { RpgHealthBar } from './components/RpgHealthBar';
import {
  Wand2,
  RefreshCw,
  Flame,
  Zap,
  KeyRound,
  Pause,
  Play,
  LogOut,
  Clock,
  Smartphone,
  RotateCcw
} from 'lucide-react';

const MAX_HP = 100;
const MAX_AMMO = 12;
const SAVE_STORAGE_KEY = 'haven_sanctuary_save_v1';

function formatSurvivalTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

interface SavedProgress {
  tokens: number;
  snapCount: number;
  hasOneShotBlaster: boolean;
  bestLevel: number;
  bestChapter: number;
}

function loadSavedProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      return { tokens: 0, snapCount: 0, hasOneShotBlaster: false, bestLevel: 1, bestChapter: 1 };
    }
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      tokens: typeof parsed.tokens === 'number' && parsed.tokens >= 0 ? Math.floor(parsed.tokens) : 0,
      snapCount: typeof parsed.snapCount === 'number' && parsed.snapCount >= 0 ? Math.floor(parsed.snapCount) : 0,
      hasOneShotBlaster: Boolean(parsed.hasOneShotBlaster),
      bestLevel:
        typeof parsed.bestLevel === 'number' && parsed.bestLevel >= 1 && parsed.bestLevel <= MAX_CAMPAIGN_LEVEL
          ? Math.floor(parsed.bestLevel)
          : 1,
      bestChapter:
        typeof parsed.bestChapter === 'number' && parsed.bestChapter >= 1 && parsed.bestChapter <= CHAPTERS_PER_LEVEL
          ? Math.floor(parsed.bestChapter)
          : 1
    };
  } catch {
    return { tokens: 0, snapCount: 0, hasOneShotBlaster: false, bestLevel: 1, bestChapter: 1 };
  }
}

export default function App() {
  const initialSave = useRef<SavedProgress>(loadSavedProgress());

  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'gameover' | 'victory'>('lobby');
  const [levelNum, setLevelNum] = useState(1);
  const [chapterNum, setChapterNum] = useState(1);

  // Persistent Economy & Campaign Best (saved to localStorage)
  const [tokens, setTokens] = useState(initialSave.current.tokens);
  const [snapCount, setSnapCount] = useState(initialSave.current.snapCount);
  const [hasOneShotBlaster, setHasOneShotBlaster] = useState(initialSave.current.hasOneShotBlaster);
  const [bestLevel, setBestLevel] = useState(initialSave.current.bestLevel);
  const [bestChapter, setBestChapter] = useState(initialSave.current.bestChapter);

  // Lobby-only Shop state & Pause state
  const [showLobbyShop, setShowLobbyShop] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Live Gameplay HUD state
  const [hp, setHp] = useState(MAX_HP);
  const [ammo, setAmmo] = useState(MAX_AMMO);
  const [keys, setKeys] = useState(0);
  const [enemiesRemaining, setEnemiesRemaining] = useState(0);
  const [portalActive, setPortalActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [roomMeta, setRoomMeta] = useState<{ name: string; hintText: string; requiredKeys: number }>({
    name: 'Level 1-1 · Sunlit Courtyard',
    hintText: '',
    requiredKeys: 1
  });

  // Sync save data to localStorage
  useEffect(() => {
    try {
      const payload: SavedProgress = {
        tokens,
        snapCount,
        hasOneShotBlaster,
        bestLevel,
        bestChapter
      };
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [tokens, snapCount, hasOneShotBlaster, bestLevel, bestChapter]);

  // Refs synced for 60fps loop
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const elapsedSecondsRef = useRef(0);
  const displaySecondsRef = useRef(0);
  const snapCountRef = useRef(snapCount);
  snapCountRef.current = snapCount;
  const hasOneShotBlasterRef = useRef(hasOneShotBlaster);
  hasOneShotBlasterRef.current = hasOneShotBlaster;

  // Canvas & Renderer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GameRenderer>(new GameRenderer());
  const requestFrameId = useRef<number | null>(null);

  const levelRef = useRef<LevelData>(generateProceduralRoom(1, 1));

  // Single-player state ref (60fps simulation)
  const playerRef = useRef<PlayerState>({
    name: 'The Adventurer',
    x: levelRef.current.spawn.x,
    y: levelRef.current.spawn.y,
    vx: 0,
    vy: 0,
    facing: 'up',
    isMoving: false,
    hp: MAX_HP,
    maxHp: MAX_HP,
    ammo: MAX_AMMO,
    maxAmmo: MAX_AMMO,
    keys: 0,
    invulnerableTimer: 0,
    isSeated: false
  });

  const switchesStateRef = useRef<Record<string, boolean>>({});
  const gatesStateRef = useRef<Record<string, boolean>>({});
  const itemsRef = useRef<DroppedItem[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<GameParticle[]>([]);
  const portalUnlockedRef = useRef(false);
  const lastEnemiesCountRef = useRef(0);

  const transitionRef = useRef<{ progress: number; title: string | null; active: boolean }>({
    progress: 0,
    title: null,
    active: false
  });

  const keysDown = useRef<Record<string, boolean>>({});
  const touchVector = useRef({ x: 0, y: 0 });

  const showBanner = useCallback((text: string) => {
    setNotification(text);
    setTimeout(() => {
      setNotification((prev) => (prev === text ? null : prev));
    }, 3200);
  }, []);

  // Render helper (also used after resize / orientationchange)
  const renderSnapshot = useCallback((renderTimeSec: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const lvl = levelRef.current;
    const remaining = enemiesRef.current.filter((e) => !e.isDefeated).length;
    const isOpen =
      lvl.gates.every((g) => gatesStateRef.current[g.id]) &&
      playerRef.current.keys >= lvl.requiredKeys;

    rendererRef.current.render({
      ctx,
      canvas: canvasRef.current,
      level: lvl,
      player: playerRef.current,
      switchesState: switchesStateRef.current,
      gatesState: gatesStateRef.current,
      items: itemsRef.current,
      enemies: enemiesRef.current,
      projectiles: projectilesRef.current,
      particles: particlesRef.current,
      portalActive: isOpen,
      keysCollected: playerRef.current.keys,
      enemiesRemaining: remaining,
      gameTime: renderTimeSec,
      transitionProgress: transitionRef.current.progress,
      transitionTitle: transitionRef.current.title
    });
  }, []);

  // Enemy defeat drops & particles helper
  const handleEnemyDefeated = useCallback(
    (enemy: Enemy, currentPlayer: PlayerState) => {
      enemy.isDefeated = true;
      sounds.playEnemyDefeated();

      const particleCount = enemy.isBoss ? 36 : 20;
      for (let k = 0; k < particleCount; k++) {
        particlesRef.current.push({
          x: enemy.x,
          y: enemy.y,
          vx: (Math.random() - 0.5) * (enemy.isBoss ? 280 : 210),
          vy: (Math.random() - 0.5) * (enemy.isBoss ? 280 : 210),
          radius: enemy.isBoss ? 4 : 2.5 + Math.random() * 3,
          color: k % 2 === 0 ? '#FFD700' : '#7C3AED',
          alpha: 1,
          life: 0,
          maxLife: 0.65
        });
      }

      const tokenValue = 5 + Math.floor((levelRef.current.depth - 1) * 0.6);
      for (let t = 0; t < enemy.tokenDropCount; t++) {
        const angle = (t / enemy.tokenDropCount) * Math.PI * 2;
        itemsRef.current.push({
          id: `drop_tok_${enemy.id}_${t}_${Date.now()}_${Math.random()}`,
          type: 'token',
          x: enemy.x + Math.cos(angle) * 24,
          y: enemy.y + Math.sin(angle) * 24,
          value: tokenValue,
          collected: false
        });
      }

      if (enemy.dropsKey) {
        itemsRef.current.push({
          id: `drop_key_${enemy.id}`,
          type: 'key',
          x: enemy.x,
          y: enemy.y,
          value: 1,
          collected: false,
          label: 'Sanctuary Key'
        });
        showBanner(`${enemy.name} banished — Sanctuary Key dropped.`);
      } else if (currentPlayer.ammo <= 5) {
        itemsRef.current.push({
          id: `drop_ammo_${enemy.id}`,
          type: 'ammo',
          x: enemy.x,
          y: enemy.y,
          value: 4,
          collected: false
        });
      }
    },
    [showBanner]
  );

  // Enter a specific Level (1-10) & Chapter (1-3)
  const enterStage = useCallback(
    (targetLevel: number, targetChapter: number, resetVitals = false, bannerOverride?: string) => {
      const generated = generateProceduralRoom(targetLevel, targetChapter);
      levelRef.current = generated;

      setLevelNum(targetLevel);
      setChapterNum(targetChapter);

      // Persist best Level-Chapter progress
      const newScore = (targetLevel - 1) * CHAPTERS_PER_LEVEL + targetChapter;
      setBestLevel((prevBestLvl) => {
        const currentBestScore = (prevBestLvl - 1) * CHAPTERS_PER_LEVEL + bestChapter;
        if (newScore > currentBestScore) {
          setBestChapter(targetChapter);
          return targetLevel;
        }
        return prevBestLvl;
      });

      setRoomMeta({
        name: generated.name,
        hintText: generated.hintText,
        requiredKeys: generated.requiredKeys
      });

      transitionRef.current = {
        progress: 0.85,
        title: `Level ${targetLevel}-${targetChapter} · ${generated.subtitle}`,
        active: true
      };

      switchesStateRef.current = {};
      gatesStateRef.current = {};
      projectilesRef.current = [];
      particlesRef.current = [];
      portalUnlockedRef.current = false;
      setPortalActive(false);

      enemiesRef.current = generated.enemies.map((e) => ({ ...e }));
      lastEnemiesCountRef.current = enemiesRef.current.length;
      setEnemiesRemaining(enemiesRef.current.length);

      itemsRef.current = generated.items.map((item) => ({ ...item }));

      const p = playerRef.current;
      p.x = generated.spawn.x;
      p.y = generated.spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.facing = 'up';
      p.isMoving = false;
      p.isSeated = false;
      p.invulnerableTimer = 0.85;
      p.keys = 0;
      setKeys(0);

      if (resetVitals) {
        p.hp = MAX_HP;
        p.ammo = MAX_AMMO;
        setHp(MAX_HP);
        setAmmo(MAX_AMMO);
      } else if (p.ammo < 8) {
        p.ammo = 8;
        setAmmo(8);
      }

      sounds.playGateUnlock();
      showBanner(bannerOverride || `Level ${targetLevel}-${targetChapter} · ${generated.subtitle}`);
    },
    [bestChapter, showBanner]
  );

  // Global anti-scroll / anti-pull-to-refresh touchmove lock
  useEffect(() => {
    const preventTouchScroll = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    window.addEventListener('touchmove', preventTouchScroll, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventTouchScroll);
      window.removeEventListener('touchmove', preventTouchScroll);
    };
  }, []);

  // Enter Fullscreen & lock orientation to Landscape (Free Fire style)
  const enterFullscreenAndLandscape = useCallback(async () => {
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };
      if (!document.fullscreenElement) {
        if (typeof docEl.requestFullscreen === 'function') {
          await docEl.requestFullscreen();
        } else if (typeof docEl.webkitRequestFullscreen === 'function') {
          await docEl.webkitRequestFullscreen();
        }
      }
    } catch {
      // Fullscreen may be declined or unsupported by browser/iframe
    }

    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (
          orientation: 'landscape' | 'landscape-primary' | 'landscape-secondary' | 'portrait' | 'any'
        ) => Promise<void>;
      };
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape');
      }
    } catch {
      // Orientation lock requires mobile fullscreen context
    }
  }, []);

  // Start Run from Lobby (Level 1-1)
  const handleStartGame = useCallback(() => {
    void enterFullscreenAndLandscape();
    setShowLobbyShop(false);
    setIsPaused(false);
    elapsedSecondsRef.current = 0;
    displaySecondsRef.current = 0;
    setElapsedTime(0);
    sounds.startAmbientBgm();
    enterStage(1, 1, true);
    setGameState('playing');
  }, [enterFullscreenAndLandscape, enterStage]);

  // Toggle Pause cleanly (stops rAF via effect cleanup and clears held inputs)
  const handleTogglePause = useCallback(() => {
    if (gameState !== 'playing') return;
    keysDown.current = {};
    touchVector.current = { x: 0, y: 0 };
    sounds.playSwitchPress();
    setIsPaused((prev) => !prev);
  }, [gameState]);

  // Exit to Lobby: safely cancel animation frame, reset run progress, retain saved Tokens
  const handleExitToLobby = useCallback(() => {
    if (requestFrameId.current !== null) {
      cancelAnimationFrame(requestFrameId.current);
      requestFrameId.current = null;
    }

    sounds.stopAmbientBgm();
    sounds.playSwitchPress();

    keysDown.current = {};
    touchVector.current = { x: 0, y: 0 };

    projectilesRef.current = [];
    particlesRef.current = [];
    enemiesRef.current = [];
    itemsRef.current = [];
    switchesStateRef.current = {};
    gatesStateRef.current = {};
    portalUnlockedRef.current = false;
    lastEnemiesCountRef.current = 0;

    elapsedSecondsRef.current = 0;
    displaySecondsRef.current = 0;
    setElapsedTime(0);

    const p = playerRef.current;
    p.vx = 0;
    p.vy = 0;
    p.keys = 0;
    p.hp = MAX_HP;
    p.ammo = MAX_AMMO;
    p.isMoving = false;
    p.invulnerableTimer = 0;

    setLevelNum(1);
    setChapterNum(1);
    setKeys(0);
    setHp(MAX_HP);
    setAmmo(MAX_AMMO);
    setEnemiesRemaining(0);
    setPortalActive(false);
    setNotification(null);
    setIsPaused(false);
    setGameState('lobby');
  }, []);

  // Lobby Shop Purchases
  const handleBuySnap = useCallback(() => {
    if (tokens < SNAP_COST) return;
    setTokens((prev) => prev - SNAP_COST);
    setSnapCount((prev) => prev + 1);
    sounds.playShopPurchase();
  }, [tokens]);

  const handleBuyBlaster = useCallback(() => {
    if (hasOneShotBlaster || tokens < BLASTER_COST) return;
    setTokens((prev) => prev - BLASTER_COST);
    setHasOneShotBlaster(true);
    sounds.playShopPurchase();
  }, [tokens, hasOneShotBlaster]);

  // Consumable Trigger: "The Snap of Doom" [F]
  const handleSnapOfDoom = useCallback(() => {
    if (gameState !== 'playing' || isPausedRef.current) return;
    if (snapCountRef.current <= 0) {
      showBanner('No Snap charges left — visit the Shop in the Main Menu.');
      return;
    }

    const activeEnemies = enemiesRef.current.filter((e) => !e.isDefeated);
    if (activeEnemies.length === 0) {
      showBanner('No Shadows remain in this chamber.');
      return;
    }

    const p = playerRef.current;
    let nearest = activeEnemies[0];
    let minDist = Math.hypot(nearest.x - p.x, nearest.y - p.y);
    for (const enemy of activeEnemies) {
      const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }

    setSnapCount((prev) => Math.max(0, prev - 1));

    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      particlesRef.current.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(ang) * 180,
        vy: Math.sin(ang) * 180,
        radius: 3.5,
        color: i % 2 === 0 ? '#A855F7' : '#FDE047',
        alpha: 1,
        life: 0,
        maxLife: 0.45
      });
    }

    nearest.hp = 0;
    nearest.hitFlash = 0.25;
    handleEnemyDefeated(nearest, p);
    showBanner(`The Snap of Doom erased ${nearest.name}.`);
  }, [gameState, handleEnemyDefeated, showBanner]);

  // Fire High-Speed Tracer Bolt or One-Shot Blaster
  const handleShoot = useCallback(() => {
    if (gameState !== 'playing' || isPausedRef.current) return;
    const p = playerRef.current;
    if (p.isSeated) return;

    if (p.ammo <= 0) {
      sounds.playEnemyHit();
      showBanner('Out of bolts — gather blue crystals.');
      return;
    }

    p.ammo -= 1;
    setAmmo(p.ammo);
    sounds.playShoot();

    let dirX = 0;
    let dirY = 0;
    if (p.facing === 'left') dirX = -1;
    else if (p.facing === 'right') dirX = 1;
    else if (p.facing === 'up') dirY = -1;
    else dirY = 1;

    const isBlaster = hasOneShotBlasterRef.current;
    const projSpeed = isBlaster ? 720 : 540;
    const startX = p.x + dirX * 18;
    const startY = p.y + dirY * 18;

    projectilesRef.current.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      x: startX,
      y: startY,
      vx: dirX * projSpeed,
      vy: dirY * projSpeed,
      angle: Math.atan2(dirY, dirX),
      radius: isBlaster ? 8 : 6,
      life: 0,
      maxLife: 1.35,
      color: isBlaster ? '#F59E0B' : '#38BDF8',
      damage: isBlaster ? 999 : 1,
      isOneShot: isBlaster,
      isEnemy: false,
      trail: [{ x: startX, y: startY }]
    });

    for (let i = 0; i < (isBlaster ? 8 : 4); i++) {
      particlesRef.current.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 90 + dirX * 80,
        vy: (Math.random() - 0.5) * 90 + dirY * 80,
        radius: isBlaster ? 2.8 : 2,
        color: isBlaster ? '#F43F5E' : '#BAE6FD',
        alpha: 1,
        life: 0,
        maxLife: 0.22
      });
    }
  }, [gameState, showBanner]);

  // Interact Action: Unseal Gate manually when nearby
  const handleInteract = useCallback(() => {
    if (gameState !== 'playing' || isPausedRef.current) return;
    const lvl = levelRef.current;
    const p = playerRef.current;

    for (const gate of lvl.gates) {
      if (gatesStateRef.current[gate.id]) continue;
      const cx = gate.x + gate.width / 2;
      const cy = gate.y + gate.height / 2;
      const dist = Math.hypot(p.x - cx, p.y - cy);

      if (dist < 130) {
        if (gate.requiresKey && p.keys < lvl.requiredKeys) {
          const needed = lvl.requiredKeys - p.keys;
          showBanner(`Requires ${needed} more Sanctuary Key${needed > 1 ? 's' : ''}.`);
          return;
        }
        gatesStateRef.current[gate.id] = true;
        sounds.playGateUnlock();
        showBanner('Sanctuary Gate unsealed.');
        return;
      }
    }
  }, [gameState, showBanner]);

  // Keyboard bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (gameState !== 'playing') return;

      if (e.code === 'Escape' || e.code === 'KeyP') {
        handleTogglePause();
        return;
      }

      if (isPausedRef.current) return;
      keysDown.current[e.code] = true;

      if (e.code === 'Space') {
        handleShoot();
      } else if (e.code === 'KeyE') {
        handleInteract();
      } else if (e.code === 'KeyF') {
        handleSnapOfDoom();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;
    };

    const onBlur = () => {
      keysDown.current = {};
      touchVector.current = { x: 0, y: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [gameState, handleTogglePause, handleShoot, handleInteract, handleSnapOfDoom]);

  // Sub-stepped circle-vs-AABB collision solver (100% corner-snag & tunnel free)
  const moveWithCollision = (
    player: PlayerState,
    dx: number,
    dy: number,
    lvl: LevelData,
    gatesState: Record<string, boolean>
  ) => {
    const pr = 14;
    const totalDist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(totalDist / 5));
    const stepX = dx / steps;
    const stepY = dy / steps;

    const obstacles = [...lvl.walls];
    lvl.gates.forEach((g) => {
      if (!gatesState[g.id]) {
        obstacles.push({ x: g.x, y: g.y, width: g.width, height: g.height });
      }
    });

    const resolveAxis = (cx: number, cy: number) => {
      let rx = cx;
      let ry = cy;
      for (let pass = 0; pass < 2; pass++) {
        for (const w of obstacles) {
          const closestX = Math.max(w.x, Math.min(rx, w.x + w.width));
          const closestY = Math.max(w.y, Math.min(ry, w.y + w.height));
          const distX = rx - closestX;
          const distY = ry - closestY;
          const distSq = distX * distX + distY * distY;

          if (distSq < pr * pr) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const overlap = pr - dist;
              rx += (distX / dist) * overlap;
              ry += (distY / dist) * overlap;
            } else {
              const leftPen = Math.abs(rx - w.x);
              const rightPen = Math.abs(w.x + w.width - rx);
              const topPen = Math.abs(ry - w.y);
              const botPen = Math.abs(w.y + w.height - ry);
              const minPen = Math.min(leftPen, rightPen, topPen, botPen);
              if (minPen === leftPen) rx = w.x - pr;
              else if (minPen === rightPen) rx = w.x + w.width + pr;
              else if (minPen === topPen) ry = w.y - pr;
              else ry = w.y + w.height + pr;
            }
          }
        }
      }
      return {
        x: Math.max(114 + pr, Math.min(lvl.width - 114 - pr, rx)),
        y: Math.max(114 + pr, Math.min(lvl.height - 114 - pr, ry))
      };
    };

    let curX = player.x;
    let curY = player.y;
    for (let s = 0; s < steps; s++) {
      const afterX = resolveAxis(curX + stepX, curY);
      const afterY = resolveAxis(afterX.x, afterX.y + stepY);
      curX = afterY.x;
      curY = afterY.y;
    }

    player.x = curX;
    player.y = curY;
  };

  // 60FPS Game Loop — safely stops requestAnimationFrame whenever paused or outside 'playing'
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) {
      if (requestFrameId.current !== null) {
        cancelAnimationFrame(requestFrameId.current);
        requestFrameId.current = null;
      }
      return;
    }

    let lastTime = performance.now();

    const loop = (time: number) => {
      const rawDt = (time - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = time;

      // Hold simulation safely if viewport is currently in portrait orientation
      if (window.innerHeight > window.innerWidth) {
        requestFrameId.current = requestAnimationFrame(loop);
        return;
      }

      // Update survival timer cleanly without per-frame React re-renders
      elapsedSecondsRef.current += dt;
      const wholeSeconds = Math.floor(elapsedSecondsRef.current);
      if (wholeSeconds !== displaySecondsRef.current) {
        displaySecondsRef.current = wholeSeconds;
        setElapsedTime(wholeSeconds);
      }

      const lvl = levelRef.current;
      const p = playerRef.current;

      if (transitionRef.current.active) {
        transitionRef.current.progress -= dt * 1.65;
        if (transitionRef.current.progress <= 0) {
          transitionRef.current.progress = 0;
          transitionRef.current.active = false;
        }
      }

      if (p.invulnerableTimer > 0) {
        p.invulnerableTimer = Math.max(0, p.invulnerableTimer - dt);
      }

      // 1. Movement
      let vx = 0;
      let vy = 0;
      if (!p.isSeated) {
        if (keysDown.current['KeyA'] || keysDown.current['ArrowLeft']) vx -= 1;
        if (keysDown.current['KeyD'] || keysDown.current['ArrowRight']) vx += 1;
        if (keysDown.current['KeyW'] || keysDown.current['ArrowUp']) vy -= 1;
        if (keysDown.current['KeyS'] || keysDown.current['ArrowDown']) vy += 1;
        vx += touchVector.current.x;
        vy += touchVector.current.y;

        const len = Math.hypot(vx, vy);
        const speed = 220;
        if (len > 0) {
          const nx = (vx / len) * speed;
          const ny = (vy / len) * speed;
          p.vx = nx;
          p.vy = ny;
          p.isMoving = true;

          if (Math.abs(nx) > Math.abs(ny)) {
            p.facing = nx < 0 ? 'left' : 'right';
          } else {
            p.facing = ny < 0 ? 'up' : 'down';
          }
          moveWithCollision(p, nx * dt, ny * dt, lvl, gatesStateRef.current);
        } else {
          p.vx = 0;
          p.vy = 0;
          p.isMoving = false;
        }
      }

      // 2. Enemy Patrol, Ranged/Boss Shooting & Contact Damage
      for (const enemy of enemiesRef.current) {
        if (enemy.isDefeated) continue;
        if (enemy.hitFlash > 0) enemy.hitFlash -= dt;

        if (enemy.waypoints.length > 0) {
          const target = enemy.waypoints[enemy.currentWaypoint];
          const edx = target.x - enemy.x;
          const edy = target.y - enemy.y;
          const dist = Math.hypot(edx, edy);

          if (dist < 8) {
            enemy.currentWaypoint = (enemy.currentWaypoint + 1) % enemy.waypoints.length;
          } else {
            enemy.vx = (edx / dist) * enemy.speed;
            enemy.vy = (edy / dist) * enemy.speed;
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
          }
        }

        const pDist = Math.hypot(p.x - enemy.x, p.y - enemy.y);

        // Ranged & Mini-Boss firing logic (Levels 7-10)
        if ((enemy.type === 'ranged' || enemy.type === 'boss') && enemy.shootCooldown) {
          enemy.shootTimer = (enemy.shootTimer ?? enemy.shootCooldown) - dt;
          const aggroRange = enemy.isBoss ? 540 : 440;
          if (enemy.shootTimer <= 0 && pDist < aggroRange) {
            enemy.shootTimer = enemy.shootCooldown;
            const baseAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
            const angles = enemy.isBoss
              ? [baseAngle - 0.24, baseAngle, baseAngle + 0.24]
              : [baseAngle];
            const boltSpeed = enemy.isBoss ? 310 : 270;

            for (const ang of angles) {
              const sx = enemy.x + Math.cos(ang) * (enemy.radius + 6);
              const sy = enemy.y + Math.sin(ang) * (enemy.radius + 6);
              projectilesRef.current.push({
                id: `eproj_${enemy.id}_${Date.now()}_${Math.random()}`,
                x: sx,
                y: sy,
                vx: Math.cos(ang) * boltSpeed,
                vy: Math.sin(ang) * boltSpeed,
                angle: ang,
                radius: enemy.isBoss ? 7 : 5.5,
                life: 0,
                maxLife: 2.1,
                damage: enemy.isBoss ? 18 : 14,
                isEnemy: true,
                color: '#D946EF',
                trail: [{ x: sx, y: sy }]
              });
            }
          }
        }

        // Contact damage
        if (pDist < enemy.radius + 14 && p.invulnerableTimer <= 0) {
          p.hp = Math.max(0, p.hp - enemy.damage);
          p.invulnerableTimer = 1.0;
          setHp(p.hp);
          sounds.playEnemyHit();

          const kx = pDist > 0 ? ((p.x - enemy.x) / pDist) * 32 : 0;
          const ky = pDist > 0 ? ((p.y - enemy.y) / pDist) * 32 : 32;
          moveWithCollision(p, kx, ky, lvl, gatesStateRef.current);

          for (let k = 0; k < 10; k++) {
            particlesRef.current.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 160,
              vy: (Math.random() - 0.5) * 160,
              radius: 3,
              color: '#F43F5E',
              alpha: 1,
              life: 0,
              maxLife: 0.35
            });
          }

          if (p.hp <= 0) {
            setGameState('gameover');
            return;
          }
        }
      }

      // 3. Player & Enemy Projectiles + Motion Trails
      const activeProjectiles: Projectile[] = [];
      for (const proj of projectilesRef.current) {
        proj.life += dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        proj.trail.push({ x: proj.x, y: proj.y });
        if (proj.trail.length > (proj.isOneShot ? 9 : 7)) {
          proj.trail.shift();
        }

        let hit = false;
        if (proj.x < 50 || proj.x > lvl.width - 50 || proj.y < 50 || proj.y > lvl.height - 50) {
          hit = true;
        }

        if (!hit) {
          for (const w of lvl.walls) {
            if (proj.x >= w.x && proj.x <= w.x + w.width && proj.y >= w.y && proj.y <= w.y + w.height) {
              hit = true;
              break;
            }
          }
        }

        if (!hit) {
          for (const g of lvl.gates) {
            if (
              !gatesStateRef.current[g.id] &&
              proj.x >= g.x &&
              proj.x <= g.x + g.width &&
              proj.y >= g.y &&
              proj.y <= g.y + g.height
            ) {
              hit = true;
              break;
            }
          }
        }

        if (!hit && proj.isEnemy) {
          // Enemy projectile hits player
          if (Math.hypot(proj.x - p.x, proj.y - p.y) < proj.radius + 14) {
            hit = true;
            if (p.invulnerableTimer <= 0) {
              p.hp = Math.max(0, p.hp - proj.damage);
              p.invulnerableTimer = 0.75;
              setHp(p.hp);
              sounds.playEnemyHit();
              if (p.hp <= 0) {
                setGameState('gameover');
                return;
              }
            }
          }
        } else if (!hit && !proj.isEnemy) {
          // Player projectile hits enemies
          for (const enemy of enemiesRef.current) {
            if (enemy.isDefeated) continue;
            if (Math.hypot(proj.x - enemy.x, proj.y - enemy.y) < enemy.radius + proj.radius) {
              hit = true;
              enemy.hp -= proj.damage;
              enemy.hitFlash = 0.14;
              sounds.playEnemyHit();

              for (let i = 0; i < 8; i++) {
                particlesRef.current.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: (Math.random() - 0.5) * 140,
                  vy: (Math.random() - 0.5) * 140,
                  radius: 2.5,
                  color: proj.isOneShot ? '#F59E0B' : '#A855F7',
                  alpha: 1,
                  life: 0,
                  maxLife: 0.35
                });
              }

              if (enemy.hp <= 0) {
                handleEnemyDefeated(enemy, p);
              }
              break;
            }
          }
        }

        if (hit) {
          for (let s = 0; s < 5; s++) {
            particlesRef.current.push({
              x: proj.x,
              y: proj.y,
              vx: (Math.random() - 0.5) * 90,
              vy: (Math.random() - 0.5) * 90,
              radius: proj.isOneShot ? 3 : 2,
              color: proj.color,
              alpha: 0.9,
              life: 0,
              maxLife: 0.2
            });
          }
        } else if (proj.life < proj.maxLife) {
          activeProjectiles.push(proj);
        }
      }
      projectilesRef.current = activeProjectiles;

      // 4. Collectible Pickups
      for (const item of itemsRef.current) {
        if (item.collected) continue;
        if (Math.hypot(p.x - item.x, p.y - item.y) < 32) {
          item.collected = true;
          if (item.type === 'key') {
            p.keys += item.value;
            setKeys(p.keys);
            sounds.playKeyPickup();
            if (p.keys >= lvl.requiredKeys) {
              showBanner('All Sanctuary Keys claimed — Gate unsealed.');
            } else {
              showBanner(`Sanctuary Key ${p.keys}/${lvl.requiredKeys} claimed.`);
            }
          } else if (item.type === 'token') {
            sounds.playCoin();
            setTokens((prev) => prev + item.value);
          } else if (item.type === 'ammo') {
            p.ammo = Math.min(p.maxAmmo, p.ammo + item.value);
            setAmmo(p.ammo);
            sounds.playCoin();
            showBanner(`+${item.value} Bolts`);
          } else if (item.type === 'heal') {
            p.hp = Math.min(p.maxHp, p.hp + item.value);
            setHp(p.hp);
            sounds.playSwitchPress();
            showBanner(`+${item.value} Vitality`);
          }
        }
      }

      // 5. Auto-Unseal Sanctuary Gate once Required Keys are Collected
      for (const gate of lvl.gates) {
        if (gatesStateRef.current[gate.id]) continue;
        const keysMet = !gate.requiresKey || p.keys >= lvl.requiredKeys;
        if (keysMet) {
          gatesStateRef.current[gate.id] = true;
          sounds.playGateUnlock();
          const gcx = gate.x + gate.width / 2;
          const gcy = gate.y + gate.height / 2;
          for (let i = 0; i < 16; i++) {
            particlesRef.current.push({
              x: gcx,
              y: gcy,
              vx: (Math.random() - 0.5) * 160,
              vy: (Math.random() - 0.5) * 160,
              radius: 3.5,
              color: '#FDE047',
              alpha: 1,
              life: 0,
              maxLife: 0.5
            });
          }
        }
      }

      // 6. Particles Update
      const activeParticles: GameParticle[] = [];
      for (const part of particlesRef.current) {
        part.life += dt;
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.alpha = Math.max(0, 1 - part.life / part.maxLife);
        if (part.life < part.maxLife) activeParticles.push(part);
      }
      particlesRef.current = activeParticles;

      // 7. Portal Activation & 10-Level × 3-Chapter Progression
      const remainingEnemies = enemiesRef.current.filter((e) => !e.isDefeated).length;
      if (remainingEnemies !== lastEnemiesCountRef.current) {
        lastEnemiesCountRef.current = remainingEnemies;
        setEnemiesRemaining(remainingEnemies);
      }

      const allGatesOpen = lvl.gates.every((g) => gatesStateRef.current[g.id]);
      const keysMet = p.keys >= lvl.requiredKeys;
      const isPortalNowActive = allGatesOpen && keysMet;

      if (isPortalNowActive && !portalUnlockedRef.current) {
        portalUnlockedRef.current = true;
        setPortalActive(true);
        sounds.playGateUnlock();
        showBanner('North Sanctuary Gate unsealed — step into the threshold.');
      }

      const ez = lvl.exitZone;
      if (isPortalNowActive && ez.width > 0) {
        const closestX = Math.max(ez.x, Math.min(p.x, ez.x + ez.width));
        const closestY = Math.max(ez.y, Math.min(p.y, ez.y + ez.height));
        if (Math.hypot(p.x - closestX, p.y - closestY) < 18) {
          if (lvl.chapter < CHAPTERS_PER_LEVEL) {
            enterStage(lvl.level, lvl.chapter + 1, false);
          } else if (lvl.level < MAX_CAMPAIGN_LEVEL) {
            enterStage(
              lvl.level + 1,
              1,
              false,
              `Level ${lvl.level} Cleared! Entering Level ${lvl.level + 1}-1`
            );
          } else {
            sounds.playHavenAscension();
            setGameState('victory');
            return;
          }
        }
      }

      // 8. Render Scene
      renderSnapshot(time / 1000);

      requestFrameId.current = requestAnimationFrame(loop);
    };

    requestFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (requestFrameId.current !== null) {
        cancelAnimationFrame(requestFrameId.current);
        requestFrameId.current = null;
      }
    };
  }, [gameState, isPaused, enterStage, handleEnemyDefeated, renderSnapshot, showBanner]);

  // Keep Canvas dynamically resized & redrawn across window resize and mobile orientation change
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        if (gameState === 'playing') {
          renderSnapshot(elapsedSecondsRef.current);
        }
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('orientationchange', updateCanvasSize);
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('orientationchange', updateCanvasSize);
    };
  }, [gameState, renderSnapshot]);

  return (
    <div className="game-container relative w-screen h-[100dvh] overflow-hidden bg-[#0a1829] select-none font-sans">
      {/* 1. LOBBY (Includes Persistent Token Counter & Lobby-Only Shop) */}
      {gameState === 'lobby' && (
        <>
          <Lobby
            tokens={tokens}
            bestLevel={bestLevel}
            bestChapter={bestChapter}
            snapCount={snapCount}
            hasOneShotBlaster={hasOneShotBlaster}
            onStartGame={handleStartGame}
            onOpenShop={() => setShowLobbyShop(true)}
          />
          <ShopModal
            isOpen={showLobbyShop}
            onClose={() => setShowLobbyShop(false)}
            tokens={tokens}
            snapCount={snapCount}
            hasOneShotBlaster={hasOneShotBlaster}
            onBuySnap={handleBuySnap}
            onBuyBlaster={handleBuyBlaster}
          />
        </>
      )}

      {/* 2. ACTIVE GAMEPLAY VIEWPORT (Responsive HUD + Dynamic Canvas + Touch Controls) */}
      {gameState !== 'lobby' && (
        <div className="game-landscape-stage relative w-full h-full">
          <canvas ref={canvasRef} className="game-canvas absolute inset-0 w-full h-full block bg-[#bae6fd]" />

          {/* Top-Left Crafted Indie HUD */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none flex flex-col gap-1.5 sm:gap-2 max-w-[calc(100vw-160px)] sm:max-w-lg">
            <div className="flex items-start gap-2 sm:gap-3 flex-wrap">
              {/* Zelda-Style RPG Hearts & Metallic Frame */}
              <RpgHealthBar hp={hp} maxHp={MAX_HP} />

              {/* Clean Chamber, Chapter & Survival Timer Readout */}
              <div className="bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-lg px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-lg flex flex-col gap-1">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs flex-wrap">
                  <span className="font-cinzel font-bold text-amber-200">{roomMeta.name}</span>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-slate-200">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Time: {formatSurvivalTime(elapsedTime)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] sm:text-xs font-mono tabular-nums text-slate-200 flex-wrap">
                  <span className={portalActive ? 'text-emerald-300 font-bold' : 'text-slate-300 font-sans font-medium'}>
                    {portalActive ? 'Threshold Open' : `Shadows: ${enemiesRemaining}`}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sky-300 font-bold">
                    <Wand2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {ammo}/{MAX_AMMO}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      keys >= roomMeta.requiredKeys ? 'text-amber-300' : 'text-slate-300'
                    }`}
                  >
                    <KeyRound className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                    {keys}/{roomMeta.requiredKeys}
                  </span>
                  {hasOneShotBlaster && (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
                      Blaster
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active Relics / Quick Trigger */}
            {snapCount > 0 && (
              <div className="pointer-events-auto">
                <button
                  type="button"
                  onClick={handleSnapOfDoom}
                  className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-950/88 hover:bg-purple-950/90 border border-amber-400/60 text-amber-100 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>The Snap of Doom [F] · x{snapCount}</span>
                </button>
              </div>
            )}

            {roomMeta.hintText && (
              <div className="hidden sm:block max-w-md bg-slate-950/75 px-3 py-1 rounded-lg border border-white/10 text-[11px] text-slate-300">
                {roomMeta.hintText}
              </div>
            )}

            {notification && (
              <div className="bg-amber-400 text-slate-950 font-bold text-[11px] sm:text-xs px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg shadow-lg border border-amber-200 max-w-xs sm:max-w-sm">
                {notification}
              </div>
            )}
          </div>

          {/* Top-Right Pause Button & Persistent Token Counter */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
            {gameState === 'playing' && (
              <button
                type="button"
                onClick={handleTogglePause}
                aria-label="Pause Game"
                title="Pause [Esc]"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950/88 hover:bg-slate-900 border border-amber-400/60 hover:border-amber-300 text-amber-200 flex items-center justify-center shadow-lg transition cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-amber-200/20" />
              </button>
            )}

            <div className="token-pill-badge pointer-events-none">
              <div className="token-coin-icon">
                <span>T</span>
              </div>
              <span className="token-text tabular-nums">TOKENS {tokens}</span>
            </div>
          </div>

          {/* Mobile Touch Controls (hidden when paused) */}
          {gameState === 'playing' && !isPaused && (
            <VirtualControls
              onMoveVector={(vx, vy) => {
                touchVector.current = { x: vx, y: vy };
              }}
              onInteract={handleInteract}
              onShoot={handleShoot}
              onSnap={handleSnapOfDoom}
              ammo={ammo}
              maxAmmo={MAX_AMMO}
              snapCount={snapCount}
              hasOneShotBlaster={hasOneShotBlaster}
            />
          )}
        </div>
      )}

      {/* 3. FROSTED-GLASS PAUSE SCREEN OVERLAY */}
      {gameState === 'playing' && isPaused && (
        <div className="game-landscape-stage fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md pointer-events-auto">
          <div className="w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-amber-400/50 rounded-2xl p-6 sm:p-7 text-center space-y-5 shadow-2xl">
            <div className="space-y-1.5">
              <h2 className="font-cinzel text-2xl font-black text-amber-100 tracking-wider">
                Paused
              </h2>
              <p className="text-xs text-slate-300 font-mono tabular-nums">
                {roomMeta.name} · Time: {formatSurvivalTime(elapsedTime)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleTogglePause}
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-cinzel font-black text-sm tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                RESUME
              </button>

              <button
                type="button"
                onClick={handleExitToLobby}
                className="w-full py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-100 font-cinzel font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-amber-300" />
                EXIT TO LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className="game-landscape-stage fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/82 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0d192b] border border-rose-500/50 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
            <div className="space-y-1.5">
              <h2 className="font-cinzel text-2xl font-black text-rose-400">Light Extinguished</h2>
              <p className="text-xs text-slate-300 font-mono tabular-nums">
                Reached Level {levelNum}-{chapterNum} · Time: {formatSurvivalTime(elapsedTime)} · {tokens} Tokens saved
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleExitToLobby}
                className="flex-1 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-xs cursor-pointer"
              >
                Main Menu & Shop
              </button>
              <button
                type="button"
                onClick={() => {
                  void enterFullscreenAndLandscape();
                  elapsedSecondsRef.current = 0;
                  displaySecondsRef.current = 0;
                  setElapsedTime(0);
                  setIsPaused(false);
                  enterStage(1, 1, true);
                  setGameState('playing');
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Level 1-1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CAMPAIGN VICTORY OVERLAY (Completing Level 10-3) */}
      <VictoryModal
        isOpen={gameState === 'victory'}
        timeElapsed={elapsedTime}
        tokensCollected={tokens}
        onRestart={handleStartGame}
        onReturnLobby={handleExitToLobby}
      />

      {/* 6. FORCE LANDSCAPE PORTRAIT WARNING OVERLAY */}
      <div
        className="portrait-warning-overlay fixed inset-0 z-[9999] flex-col items-center justify-center p-6 text-center bg-[#050b14] text-slate-100 select-none"
        role="alert"
        aria-live="assertive"
      >
        <div className="relative mb-6 flex items-center justify-center w-24 h-24 rounded-2xl bg-slate-900/90 border border-amber-400/50 shadow-[0_0_32px_rgba(245,158,11,0.28)]">
          <div className="rotate-phone-icon flex items-center justify-center">
            <Smartphone className="w-11 h-11 text-amber-300" />
          </div>
          <RotateCcw className="absolute -top-2.5 -right-2.5 w-6 h-6 text-sky-300 bg-[#050b14] rounded-full p-1 border border-sky-400/50" />
        </div>
        <h2 className="font-cinzel text-xl font-black tracking-wider text-amber-200 mb-2">
          Landscape Required
        </h2>
        <p className="max-w-xs text-sm font-medium text-slate-300 leading-relaxed">
          Please rotate your device to Landscape mode to play.
        </p>
      </div>
    </div>
  );
}
