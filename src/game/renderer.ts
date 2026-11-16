import type {
  LevelData,
  PlayerState,
  PuzzleSwitch,
  GoldenGate,
  Enemy,
  Projectile,
  DroppedItem,
  GameParticle
} from '../types/game';
import { ADVENTURER_DEF } from './characters';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  level: LevelData;
  player: PlayerState;
  switchesState: Record<string, boolean>;
  gatesState: Record<string, boolean>;
  items: DroppedItem[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: GameParticle[];
  portalActive: boolean;
  keysCollected: number;
  enemiesRemaining: number;
  gameTime: number;
  transitionProgress: number;
  transitionTitle: string | null;
}

export class GameRenderer {
  private cloudParticles: Array<{ x: number; y: number; size: number; speed: number; opacity: number }> = [];

  constructor() {
    for (let i = 0; i < 28; i++) {
      this.cloudParticles.push({
        x: Math.random() * 1200,
        y: Math.random() * 900,
        size: 45 + Math.random() * 70,
        speed: 0.12 + Math.random() * 0.25,
        opacity: 0.15 + Math.random() * 0.2
      });
    }
  }

  public render(args: RenderContext) {
    const {
      ctx,
      canvas,
      level,
      player,
      switchesState,
      gatesState,
      items,
      enemies,
      projectiles,
      particles,
      portalActive,
      keysCollected,
      enemiesRemaining,
      gameTime,
      transitionProgress,
      transitionTitle
    } = args;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center camera smoothly on the single Male Angel
    const camX = player.x;
    const camY = player.y;

    const zoom = Math.min(canvas.width / 880, canvas.height / 700);
    const scale = Math.max(0.58, Math.min(1.2, zoom));

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);

    // 1. Sanctuary Floor & Patterned Tiles
    this.drawSanctuaryFloor(ctx, level, gameTime);

    // 2. Scenic Features
    this.drawScenicFeatures(ctx, level, gameTime);

    // 3. Wall Drop Shadows
    this.drawWallShadows(ctx, level);

    // 4. Walls & Columns
    this.drawWalls(ctx, level, gameTime);

    // 5. Runic Puzzle Switches
    this.drawSwitches(ctx, level.switches, switchesState, gameTime);

    // 6. Connecting Energy Beams from Switches to Gate
    this.drawPuzzleBeams(ctx, level, switchesState, gameTime);

    // 7. Golden Gates
    this.drawGates(ctx, level.gates, gatesState, player);

    // 8. Collectible Items (Golden Keys, Tokens, Ammo Crystals, Healing Orbs)
    this.drawItems(ctx, items, gameTime);

    // 9. Exit Zone Portal (Always visible; activates when requirements met)
    this.drawExitZone(ctx, level, portalActive, keysCollected, enemiesRemaining, gameTime);

    // 11. Dark Shadow Enemies
    this.drawEnemies(ctx, enemies, gameTime);

    // 12. Magic Projectiles
    this.drawProjectiles(ctx, projectiles);

    // 13. Sparkle & Combat Particles
    this.drawParticles(ctx, particles);

    // 14. The Single Male Angel ("The Adventurer")
    this.drawAdventurer(ctx, player, gameTime);

    // 15. Drifting Over-World Clouds
    this.drawForegroundClouds(ctx, level, gameTime);

    ctx.restore();

    // 16. Room Transition Curtain
    if (transitionProgress > 0) {
      this.drawRoomTransition(ctx, canvas, transitionProgress, transitionTitle);
    }
  }

  private drawSanctuaryFloor(ctx: CanvasRenderingContext2D, level: LevelData, gameTime: number) {
    const bgGrad = ctx.createLinearGradient(0, 0, level.width, level.height);
    if (level.floorTheme === 'cloister') {
      bgGrad.addColorStop(0, '#312e81');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#3b0764');
    } else if (level.floorTheme === 'haven') {
      bgGrad.addColorStop(0, '#fef3c7');
      bgGrad.addColorStop(0.5, '#d1fae5');
      bgGrad.addColorStop(1, '#bae6fd');
    } else {
      bgGrad.addColorStop(0, '#bae6fd');
      bgGrad.addColorStop(0.5, '#e0f2fe');
      bgGrad.addColorStop(1, '#fef3c7');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(-350, -350, level.width + 700, level.height + 700);

    const tileSize = 64;
    ctx.save();
    for (let x = 60; x < level.width - 60; x += tileSize) {
      for (let y = 60; y < level.height - 60; y += tileSize) {
        const isAlt = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
        if (level.floorTheme === 'cloister') {
          ctx.fillStyle = isAlt ? 'rgba(51, 65, 85, 0.72)' : 'rgba(30, 41, 59, 0.65)';
        } else if (level.floorTheme === 'haven') {
          ctx.fillStyle = isAlt ? 'rgba(255, 255, 255, 0.85)' : 'rgba(254, 249, 195, 0.55)';
        } else {
          ctx.fillStyle = isAlt ? 'rgba(255, 255, 255, 0.75)' : 'rgba(240, 249, 255, 0.52)';
        }
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, tileSize - 4, tileSize - 4, 8);
        ctx.fill();

        if (isAlt) {
          ctx.strokeStyle =
            level.floorTheme === 'cloister' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(253, 224, 71, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 8, y + 8, tileSize - 16, tileSize - 16);

          ctx.fillStyle =
            level.floorTheme === 'cloister' ? 'rgba(192, 132, 252, 0.22)' : 'rgba(234, 179, 8, 0.25)';
          ctx.fillRect(x + tileSize / 2 - 1, y + tileSize / 2 - 4, 2, 8);
          ctx.fillRect(x + tileSize / 2 - 4, y + tileSize / 2 - 1, 8, 2);
        }
      }
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 215, 0, 0.38)';
    for (let i = 0; i < 20; i++) {
      const px = ((i * 73 + gameTime * 16) % (level.width - 120)) + 60;
      const py = ((i * 59 + Math.sin(gameTime + i) * 20) % (level.height - 120)) + 60;
      ctx.beginPath();
      ctx.arc(px, py, 2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWallShadows(ctx: CanvasRenderingContext2D, level: LevelData) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
    level.walls.forEach((w) => {
      ctx.beginPath();
      ctx.roundRect(w.x + 8, w.y + 12, w.width, w.height, 8);
      ctx.fill();
    });
    ctx.restore();
  }

  private drawWalls(ctx: CanvasRenderingContext2D, level: LevelData, gameTime: number) {
    level.walls.forEach((w) => {
      ctx.save();
      if (w.type === 'hedge') {
        ctx.fillStyle = '#34D399';
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(w.x, w.y, w.width, w.height, 8);
        ctx.fill();
        ctx.stroke();
      } else if (w.type === 'marble') {
        const wallGrad = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.height);
        wallGrad.addColorStop(0, '#FFFFFF');
        wallGrad.addColorStop(0.7, '#F1F5F9');
        wallGrad.addColorStop(1, '#CBD5E1');

        ctx.fillStyle = wallGrad;
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(w.x, w.y, w.width, w.height, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(w.x + 2, w.y + 2, w.width - 4, 3);
        ctx.fillRect(w.x + 2, w.y + w.height - 5, w.width - 4, 3);

        if (Math.abs(w.width - w.height) < 15 && w.width >= 30) {
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(w.x + w.width / 2, w.y + w.height / 2, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(w.x, w.y, w.width, w.height, 12);
        ctx.fill();
        ctx.stroke();

        const puffCount = Math.max(2, Math.floor(w.width / 24));
        ctx.fillStyle = '#FFFFFF';
        for (let p = 0; p < puffCount; p++) {
          const px = w.x + 12 + p * 22;
          const py = w.y + Math.sin(gameTime * 2 + p) * 2;
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });
  }

  private drawSwitches(
    ctx: CanvasRenderingContext2D,
    switches: PuzzleSwitch[],
    switchesState: Record<string, boolean>,
    gameTime: number
  ) {
    switches.forEach((sw) => {
      const isPressed = !!switchesState[sw.id];
      ctx.save();
      ctx.translate(sw.x, sw.y);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.beginPath();
      ctx.arc(2, 6, sw.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isPressed ? '#F59E0B' : 'rgba(203, 213, 225, 0.9)';
      ctx.lineWidth = 4;
      ctx.fillStyle = isPressed ? '#FEF9C3' : '#F8FAFC';
      ctx.beginPath();
      ctx.arc(0, 0, sw.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isPressed) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.38)';
        ctx.beginPath();
        const pulse = 4 + Math.sin(gameTime * 6) * 3;
        ctx.arc(0, 0, sw.radius + pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = isPressed ? '#10B981' : sw.color;
      ctx.beginPath();
      ctx.arc(0, 0, sw.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isPressed ? '✓' : sw.label, 0, 1);

      ctx.restore();
    });
  }

  private drawPuzzleBeams(
    ctx: CanvasRenderingContext2D,
    level: LevelData,
    switchesState: Record<string, boolean>,
    gameTime: number
  ) {
    level.switches.forEach((sw) => {
      const gate = level.gates.find((g) => g.id === sw.gateId);
      if (!gate) return;
      const isActive = !!switchesState[sw.id];
      if (!isActive) return;

      ctx.save();
      const gateCenter = { x: gate.x + gate.width / 2, y: gate.y + gate.height / 2 };
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.y);
      ctx.lineTo(gateCenter.x, gateCenter.y);
      ctx.stroke();

      const t = (gameTime * 1.8) % 1;
      const px = sw.x + (gateCenter.x - sw.x) * t;
      const py = sw.y + (gateCenter.y - sw.y) * t;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawGates(
    ctx: CanvasRenderingContext2D,
    gates: GoldenGate[],
    gatesState: Record<string, boolean>,
    player: PlayerState
  ) {
    gates.forEach((g) => {
      const isOpen = !!gatesState[g.id];
      ctx.save();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
      ctx.fillRect(g.x, g.y + g.height, g.width, 10);

      const pillarWidth = 18;
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(g.x - pillarWidth, g.y - 10, pillarWidth, g.height + 20, 4);
      ctx.roundRect(g.x + g.width, g.y - 10, pillarWidth, g.height + 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(g.x - pillarWidth / 2, g.y - 12, 10, 0, Math.PI * 2);
      ctx.arc(g.x + g.width + pillarWidth / 2, g.y - 12, 10, 0, Math.PI * 2);
      ctx.fill();

      if (isOpen) {
        const openGrad = ctx.createLinearGradient(g.x, g.y, g.x, g.y + g.height);
        openGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        openGrad.addColorStop(1, 'rgba(186, 230, 253, 0.4)');

        ctx.fillStyle = openGrad;
        ctx.fillRect(g.x, g.y, g.width, g.height);

        ctx.fillStyle = '#059669';
        ctx.font = 'bold 12px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText('OPEN', g.x + g.width / 2, g.y - 18);
      } else {
        const gateGrad = ctx.createLinearGradient(g.x, g.y, g.x + g.width, g.y + g.height);
        gateGrad.addColorStop(0, '#FFD700');
        gateGrad.addColorStop(0.5, '#F59E0B');
        gateGrad.addColorStop(1, '#B45309');

        ctx.fillStyle = gateGrad;
        ctx.shadowColor = '#FBBF24';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(g.x, g.y, g.width, g.height, 4);
        ctx.fill();

        ctx.strokeStyle = '#FEF3C7';
        ctx.lineWidth = 3;
        for (let bx = g.x + 15; bx < g.x + g.width - 10; bx += 18) {
          ctx.beginPath();
          ctx.moveTo(bx, g.y + 2);
          ctx.lineTo(bx, g.y + g.height - 2);
          ctx.stroke();
        }

        const cx = g.x + g.width / 2;
        const cy = g.y + g.height / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#D97706';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(g.requiresKey ? '🗝️' : '🔒', cx, cy);

        const nearGate = Math.hypot(player.x - cx, player.y - cy) < 110;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx - 64, g.y - 34, 128, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 10px Montserrat, sans-serif';
        ctx.fillText(
          nearGate && player.keys > 0
            ? 'Walk Through to Unseal'
            : g.requiresKey
            ? 'Locked · Key Required'
            : 'Activate Seal',
          cx,
          g.y - 23
        );
      }
      ctx.restore();
    });
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[], gameTime: number) {
    enemies.forEach((enemy) => {
      if (enemy.isDefeated) return;

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Ground shadow scaled to enemy size
      ctx.fillStyle = enemy.type === 'boss' ? 'rgba(127, 29, 29, 0.36)' : 'rgba(76, 29, 149, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, enemy.radius + 3, enemy.radius * 0.95, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      const hoverSpeed = enemy.type === 'rusher' ? 9 : enemy.type === 'tank' ? 2.5 : 5;
      const hover = Math.sin(gameTime * hoverSpeed + enemy.x) * (enemy.type === 'tank' ? 2 : 4);
      ctx.translate(0, hover);

      const pulse = Math.sin(gameTime * 6) * 4;
      const auraColor =
        enemy.type === 'boss'
          ? 'rgba(225, 29, 72, 0.38)'
          : enemy.type === 'ranged'
          ? 'rgba(16, 185, 129, 0.28)'
          : enemy.type === 'rusher'
          ? 'rgba(244, 63, 94, 0.3)'
          : enemy.type === 'tank'
          ? 'rgba(51, 65, 85, 0.42)'
          : 'rgba(88, 28, 135, 0.35)';

      ctx.fillStyle = auraColor;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 6 + pulse, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.hitFlash > 0) {
        ctx.fillStyle = '#FFFFFF';
      } else {
        const bodyGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, enemy.radius);
        if (enemy.type === 'boss') {
          bodyGrad.addColorStop(0, '#F43F5E');
          bodyGrad.addColorStop(0.55, '#881337');
          bodyGrad.addColorStop(1, '#0F172A');
        } else if (enemy.type === 'tank') {
          bodyGrad.addColorStop(0, '#64748B');
          bodyGrad.addColorStop(0.65, '#1E293B');
          bodyGrad.addColorStop(1, '#090D16');
        } else if (enemy.type === 'rusher') {
          bodyGrad.addColorStop(0, '#FB7185');
          bodyGrad.addColorStop(0.65, '#BE123C');
          bodyGrad.addColorStop(1, '#3B0764');
        } else if (enemy.type === 'ranged') {
          bodyGrad.addColorStop(0, '#34D399');
          bodyGrad.addColorStop(0.55, '#4C1D95');
          bodyGrad.addColorStop(1, '#0F172A');
        } else {
          bodyGrad.addColorStop(0, enemy.type === 'shadow_wraith' ? '#9333EA' : '#7C3AED');
          bodyGrad.addColorStop(0.7, '#4C1D95');
          bodyGrad.addColorStop(1, '#0F172A');
        }
        ctx.fillStyle = bodyGrad;
      }

      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      // Archetype visual details
      if (enemy.type === 'tank') {
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (enemy.type === 'ranged') {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 4, gameTime * 2, gameTime * 2 + Math.PI * 1.4);
        ctx.stroke();
      } else if (enemy.type === 'boss') {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      const wispCount = enemy.type === 'boss' ? 6 : 4;
      for (let t = 0; t < wispCount; t++) {
        const a = (t * Math.PI * 2) / wispCount + gameTime * (enemy.type === 'rusher' ? 6 : 3);
        const tx = Math.cos(a) * (enemy.radius * 0.92);
        const ty = Math.sin(a) * (enemy.radius * 0.92);
        ctx.fillStyle =
          enemy.type === 'boss'
            ? 'rgba(251, 191, 36, 0.65)'
            : enemy.type === 'ranged'
            ? 'rgba(52, 211, 153, 0.55)'
            : 'rgba(147, 51, 234, 0.5)';
        ctx.beginPath();
        ctx.arc(tx, ty, enemy.type === 'boss' ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes
      const eyeOffset = enemy.type === 'boss' ? 8 : 5;
      ctx.fillStyle = enemy.type === 'ranged' ? '#34D399' : '#F43F5E';
      ctx.beginPath();
      ctx.arc(-eyeOffset, -2, enemy.type === 'boss' ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.arc(eyeOffset, -2, enemy.type === 'boss' ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-eyeOffset, -2, 1.2, 0, Math.PI * 2);
      ctx.arc(eyeOffset, -2, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // HP Bar
      const barW = enemy.type === 'boss' ? 58 : enemy.type === 'tank' ? 44 : 34;
      const barH = enemy.type === 'boss' ? 7 : 5;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-barW / 2, -enemy.radius - 16, barW, barH);

      const healthPct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = enemy.type === 'boss' ? '#F43F5E' : healthPct > 0.4 ? '#EF4444' : '#F59E0B';
      ctx.fillRect(-barW / 2 + 1, -enemy.radius - 15, (barW - 2) * healthPct, barH - 2);

      if (enemy.isBoss) {
        ctx.fillStyle = '#FDE047';
        ctx.font = 'bold 10px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name.toUpperCase(), 0, -enemy.radius - 23);
      }

      if (enemy.dropsKey) {
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🗝️', 0, -enemy.radius - (enemy.isBoss ? 36 : 24));
      }

      ctx.restore();
    });
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
    projectiles.forEach((p) => {
      ctx.save();

      // 1. Tapered luminous motion trail across recent positions
      if (p.trail && p.trail.length > 1) {
        for (let i = 1; i < p.trail.length; i++) {
          const prev = p.trail[i - 1];
          const curr = p.trail[i];
          const ratio = i / p.trail.length;

          ctx.strokeStyle = p.isEnemy
            ? `rgba(192, 38, 211, ${(ratio * 0.72).toFixed(2)})`
            : p.isOneShot
            ? `rgba(244, 63, 94, ${(ratio * 0.72).toFixed(2)})`
            : `rgba(56, 189, 248, ${(ratio * 0.65).toFixed(2)})`;
          ctx.lineWidth = (p.isOneShot ? 8 : p.isEnemy ? 6 : 5) * ratio;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
      }

      // 2. Oriented aerodynamic bolt / high-velocity energy round
      const angle = p.angle ?? Math.atan2(p.vy, p.vx);
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      const boltLen = p.isOneShot ? 24 : p.isEnemy ? 16 : 17;
      const boltWidth = p.isOneShot ? 7.5 : p.isEnemy ? 6 : 5;

      // Outer plasma wake
      ctx.shadowColor = p.isEnemy ? '#D946EF' : p.isOneShot ? '#F59E0B' : '#38BDF8';
      ctx.shadowBlur = p.isOneShot ? 16 : 10;
      const wakeGrad = ctx.createLinearGradient(-boltLen, 0, boltLen * 0.6, 0);
      if (p.isEnemy) {
        wakeGrad.addColorStop(0, 'rgba(147, 51, 234, 0)');
        wakeGrad.addColorStop(0.55, 'rgba(217, 70, 239, 0.95)');
        wakeGrad.addColorStop(1, '#FDA4AF');
      } else if (p.isOneShot) {
        wakeGrad.addColorStop(0, 'rgba(244, 63, 94, 0)');
        wakeGrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.95)');
        wakeGrad.addColorStop(1, '#FEF08A');
      } else {
        wakeGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        wakeGrad.addColorStop(0.55, 'rgba(96, 165, 250, 0.95)');
        wakeGrad.addColorStop(1, '#E0F2FE');
      }

      ctx.fillStyle = wakeGrad;
      ctx.beginPath();
      ctx.moveTo(boltLen * 0.65, 0);
      ctx.lineTo(-boltLen * 0.35, -boltWidth * 0.55);
      ctx.lineTo(-boltLen * 0.9, 0);
      ctx.lineTo(-boltLen * 0.35, boltWidth * 0.55);
      ctx.closePath();
      ctx.fill();

      // Solid incandescent core
      ctx.fillStyle = p.isEnemy ? '#FFE4E6' : p.isOneShot ? '#FFFFFF' : '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(boltLen * 0.62, 0);
      ctx.lineTo(0, -boltWidth * 0.28);
      ctx.lineTo(-boltLen * 0.25, 0);
      ctx.lineTo(0, boltWidth * 0.28);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  }

  private drawItems(ctx: CanvasRenderingContext2D, items: DroppedItem[], gameTime: number) {
    items.forEach((item) => {
      if (item.collected) return;

      ctx.save();
      const floatY = item.y + Math.sin(gameTime * 4 + item.x) * 4;
      ctx.translate(item.x, floatY);

      if (item.type === 'key') {
        const ringPulse = 18 + Math.sin(gameTime * 5) * 4;
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, 10, ringPulse, ringPulse * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🗝️', 0, -4);

        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 10px Cinzel, serif';
        ctx.fillText('GOLDEN KEY', 0, -24);
      } else if (item.type === 'token') {
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 11px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T', 0, 1);
      } else if (item.type === 'ammo') {
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#0EA5E9';
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 13);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AMMO', 0, -18);
      } else if (item.type === 'heal') {
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);

        ctx.font = 'bold 9px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+HP', 0, -18);
      }

      ctx.restore();
    });
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: GameParticle[]) {
    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawAdventurer(ctx: CanvasRenderingContext2D, player: PlayerState, gameTime: number) {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Invulnerability flicker after taking enemy collision damage
    if (player.invulnerableTimer > 0 && Math.floor(gameTime * 18) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Holy Aura
    const auraPulse = Math.sin(gameTime * 4) * 3;
    ctx.fillStyle = ADVENTURER_DEF.auraGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 23 + auraPulse, 0, Math.PI * 2);
    ctx.fill();

    // Hover bob
    const bob = player.isSeated ? 0 : Math.sin(gameTime * 4.5) * 3;
    ctx.translate(0, bob);

    // Feathered Wings (Blue & White)
    const flapSpeed = player.isMoving ? 15 : 4.5;
    const flapAngle = Math.sin(gameTime * flapSpeed) * 0.34;

    ctx.save();
    ctx.translate(-14, 0);
    ctx.rotate(-0.35 + flapAngle);
    this.drawFeatheredWing(ctx, true);
    ctx.restore();

    ctx.save();
    ctx.translate(14, 0);
    ctx.rotate(0.35 - flapAngle);
    this.drawFeatheredWing(ctx, false);
    ctx.restore();

    // Silver-Blue Armor Body
    ctx.fillStyle = ADVENTURER_DEF.secondaryColor;
    ctx.strokeStyle = ADVENTURER_DEF.primaryColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 28, 12);
    ctx.fill();
    ctx.stroke();

    // Blue Armor Chestplate Trim
    ctx.fillStyle = ADVENTURER_DEF.primaryColor;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(9, 4);
    ctx.lineTo(0, 12);
    ctx.lineTo(-9, 4);
    ctx.closePath();
    ctx.fill();

    // Eyes facing direction
    let ex = 0;
    let ey = 0;
    if (player.facing === 'left') ex = -4;
    if (player.facing === 'right') ex = 4;
    if (player.facing === 'up') ey = -3;
    if (player.facing === 'down') ey = 2;

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-4 + ex, -2 + ey, 2.2, 0, Math.PI * 2);
    ctx.arc(4 + ex, -2 + ey, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Golden Headband / Halo
    ctx.save();
    ctx.translate(0, -21);
    ctx.strokeStyle = ADVENTURER_DEF.haloColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private drawFeatheredWing(ctx: CanvasRenderingContext2D, isLeft: boolean) {
    ctx.fillStyle = ADVENTURER_DEF.wingColor;
    ctx.strokeStyle = ADVENTURER_DEF.wingTrim;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    const dir = isLeft ? -1 : 1;
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(dir * 20, -18, dir * 30, -6);
    ctx.quadraticCurveTo(dir * 23, 8, dir * 15, 14);
    ctx.quadraticCurveTo(dir * 6, 8, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawScenicFeatures(ctx: CanvasRenderingContext2D, level: LevelData, gameTime: number) {
    const sc = level.scenicFeatures;
    if (!sc) return;

    if (sc.flowerPads) {
      sc.flowerPads.forEach((pad) => {
        ctx.save();
        ctx.fillStyle = 'rgba(167, 243, 208, 0.65)';
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6EE7B7';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    if (sc.fountains) {
      sc.fountains.forEach((f) => {
        ctx.save();
        ctx.fillStyle = '#E0F2FE';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const wave = (gameTime * 2) % 1;
        ctx.strokeStyle = `rgba(56, 189, 248, ${1 - wave})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 10 + wave * 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }
  }

  private drawExitZone(
    ctx: CanvasRenderingContext2D,
    level: LevelData,
    portalActive: boolean,
    keysCollected: number,
    enemiesRemaining: number,
    gameTime: number
  ) {
    const ez = level.exitZone;
    if (ez.width <= 0) return;

    const cx = ez.x + ez.width / 2;
    const cy = ez.y + ez.height / 2;

    ctx.save();

    if (portalActive) {
      // Radiant active swirling Golden-Cyan Exit Portal
      const pulse = 1 + Math.sin(gameTime * 5) * 0.08;
      const outerR = Math.max(ez.width, ez.height) * 0.65 * pulse;

      const pGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, outerR);
      pGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      pGrad.addColorStop(0.35, 'rgba(253, 224, 71, 0.85)');
      pGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.55)');
      pGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Rotating golden portal ring
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ez.width * 0.42, ez.height * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Orbiting star motes
      for (let i = 0; i < 4; i++) {
        const ang = gameTime * 3 + (i * Math.PI) / 2;
        const ox = cx + Math.cos(ang) * (ez.width * 0.42);
        const oy = cy + Math.sin(ang) * (ez.height * 0.36);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ox, oy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 6;
      const portalText =
        level.level === 10 && level.chapter === 3
          ? 'CLAIM HAVEN'
          : level.chapter === 3
          ? `LEVEL ${level.level + 1}-1`
          : `CHAPTER ${level.level}-${level.chapter + 1}`;
      ctx.fillText(portalText, cx, cy);
    } else {
      // Dormant / Locked Exit Portal
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ez.width * 0.42, ez.height * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', cx, cy - 2);

      // Requirement label below locked portal
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 72, ez.y + ez.height + 6, 144, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.font = 'bold 10px Montserrat, sans-serif';
      ctx.fillText(
        `Keys: ${keysCollected}/${level.requiredKeys}`,
        cx,
        ez.y + ez.height + 17
      );
    }
    ctx.restore();
  }

  private drawForegroundClouds(ctx: CanvasRenderingContext2D, level: LevelData, gameTime: number) {
    this.cloudParticles.forEach((c) => {
      ctx.save();
      const currentX = ((c.x + gameTime * c.speed * 25) % (level.width + 300)) - 150;
      const currentY = c.y + Math.sin(gameTime + c.size) * 8;
      ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity})`;
      ctx.beginPath();
      ctx.arc(currentX, currentY, c.size, 0, Math.PI * 2);
      ctx.arc(currentX + c.size * 0.6, currentY - c.size * 0.2, c.size * 0.7, 0, Math.PI * 2);
      ctx.arc(currentX - c.size * 0.5, currentY - c.size * 0.1, c.size * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawRoomTransition(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    progress: number,
    title: string | null
  ) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (title && progress > 0.2) {
      ctx.fillStyle = `rgba(30, 41, 59, ${Math.min(1, progress * 1.5)})`;
      ctx.font = '900 30px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 15;
      ctx.fillText(title, canvas.width / 2, canvas.height / 2);
    }
    ctx.restore();
  }
}
