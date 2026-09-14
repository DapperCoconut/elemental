import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Husk, HuskWorld } from '../invasion/Husk';
import { HuskVariantDef, ELEMENTAL_HUSK_VARIANTS } from '../invasion/HuskVariants';
import { REALITY_BLUE, REALITY_WHITE } from './RealityTypes';

/**
 * The dungeon's husk harness — the seventh implementer of `HuskWorld`, in the
 * SecretMapKit/DisgracedKingKit mould: real `Husk`es with real variant defs and
 * their baked textures, driven outside invasion mode, plus the one thing
 * invasion never gave them: the **glitch**. A glitched husk periodically tears
 * a short distance forward toward its prey, flickering like a dropped frame.
 *
 * Used by trial room three's wave and by Reality's summon attack.
 */

export interface RealityHuskApi {
  scene: Phaser.Scene;
  player: Fighter;
  width: number;
  height: number;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
}

/** One in-flight husk shot — the ranged variants need somewhere to put them. */
interface HuskShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: number;
}

interface Telegraph {
  x1: number; y1: number; x2: number; y2: number;
  color: number;
  until: number;
}

const GLITCH_MIN_MS = 2500;
const GLITCH_MAX_MS = 4000;
const GLITCH_STEP_MIN = 60;
const GLITCH_STEP_MAX = 90;
const SHOT_SPEED = 240;
const SHOT_RADIUS = 7;

export class RealityHusks {
  private api: RealityHuskApi;
  private husks: Husk[] = [];
  private shots: HuskShot[] = [];
  private telegraphs: Telegraph[] = [];
  private g: Phaser.GameObjects.Graphics | null = null;
  private nextGlitchAt = new WeakMap<Husk, number>();

  /** The minimal world: shots and charge lanes are real, the pack politics are not. */
  private readonly world: HuskWorld = {
    fireShot: (from, tx, ty, damage) => {
      const d = Math.hypot(tx - from.x, ty - from.y) || 1;
      this.shots.push({
        x: from.x, y: from.y,
        vx: ((tx - from.x) / d) * SHOT_SPEED,
        vy: ((ty - from.y) / d) * SHOT_SPEED,
        damage,
        color: from.variant.color,
      });
    },
    summon: () => {},
    healNearbyHusks: () => {},
    telegraph: (x1, y1, x2, y2, color, durationMs) => {
      this.telegraphs.push({ x1, y1, x2, y2, color, until: this.api.scene.time.now + durationMs });
    },
    findPossessTarget: () => null,
    possess: () => {},
  };

  constructor(api: RealityHuskApi) {
    this.api = api;
  }

  /** Fresh match. Last run's objects died with the scene — only drop references. */
  reset(): void {
    this.husks = [];
    this.shots = [];
    this.telegraphs = [];
    this.g = this.api.scene.add.graphics().setDepth(7);
  }

  aliveCount(): number {
    return this.husks.length;
  }

  /** Every tier-3 elemental variant is fair game for the dungeon. */
  private rollVariant(): HuskVariantDef {
    const pool = ELEMENTAL_HUSK_VARIANTS.filter((v) => v.tier === 3);
    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  /**
   * One glitched husk, torn out of the wall at (x, y). Stats sit near invasion's
   * late waves; the glitch itself is the real threat.
   */
  spawnAt(x: number, y: number): Husk {
    const variant = this.rollVariant();
    const hp = Math.round(40 * variant.hpMult);
    const speed = 96 * variant.speedMult;
    const bite = Math.round(9 * variant.damageMult);
    const husk = new Husk(this.api.scene, x, y, hp, speed, bite, 950, variant);
    husk.world = this.world;
    husk.noRewardKill = true;
    husk.onBite = (damage, target) => {
      target.takeDamage(damage);
      this.api.spawnHitFlash(target.x, target.y, variant.color);
      this.api.showFloatingText(target.x, target.y - 26, `${variant.emoji ?? '👾'} ${damage}`, '#ff6b85');
    };
    husk.once('defeated', () => {
      this.api.spawnHitFlash(husk.x, husk.y, REALITY_BLUE);
      this.api.showFloatingText(husk.x, husk.y - 20, '⌦ DELETED', '#9fc2ff');
      this.api.removeEnemy(husk);
      this.husks = this.husks.filter((h) => h !== husk);
    });
    this.api.addEnemy(husk);
    this.husks.push(husk);
    this.nextGlitchAt.set(husk, this.api.scene.time.now + Phaser.Math.Between(GLITCH_MIN_MS, GLITCH_MAX_MS));

    // Arrival: a burst of static where the wall gave way.
    this.api.spawnHitFlash(x, y, REALITY_WHITE);
    this.api.showFloatingText(x, y - 26, `${variant.emoji ?? '👾'} GLITCHED`, '#9fc2ff');
    return husk;
  }

  /** Rip `count` husks out of the walls around the arena edge. */
  spawnWave(count: number): void {
    const { width: W, height: H } = this.api;
    for (let i = 0; i < count; i++) {
      const side = i % 4;
      const x = side === 0 ? 60 : side === 1 ? W - 60 : Phaser.Math.Between(90, W - 90);
      const y = side === 2 ? 60 : side === 3 ? H - 60 : Phaser.Math.Between(90, H - 90);
      this.spawnAt(x, y);
    }
  }

  /** Remove everything still standing (phase changes, room teardown). */
  clear(): void {
    for (const husk of this.husks) {
      this.api.removeEnemy(husk);
      husk.destroy();
    }
    this.husks = [];
    this.shots = [];
  }

  update(time: number, delta: number): void {
    const g = this.g;
    if (!g) return;
    g.clear();
    const dtSec = delta / 1000;
    const p = this.api.player;

    for (const husk of this.husks) {
      husk.update([p], time, delta);

      // The glitch: a short forward tear on its own clock, telegraphed only by
      // a single flicker frame — the thing the room is named for.
      const at = this.nextGlitchAt.get(husk) ?? 0;
      if (time >= at && husk.active && husk.hp > 0) {
        this.nextGlitchAt.set(husk, time + Phaser.Math.Between(GLITCH_MIN_MS, GLITCH_MAX_MS));
        const dx = p.x - husk.x;
        const dy = p.y - husk.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 70) {
          const step = Math.min(dist - 55, Phaser.Math.Between(GLITCH_STEP_MIN, GLITCH_STEP_MAX));
          const nx = husk.x + (dx / dist) * step;
          const ny = husk.y + (dy / dist) * step;
          // Departure and arrival ghosts.
          g.fillStyle(REALITY_WHITE, 0.5);
          g.fillRect(husk.x - 14, husk.y - 2, 28, 4);
          (husk.body as Phaser.Physics.Arcade.Body).reset(nx, ny);
          this.api.spawnHitFlash(nx, ny, REALITY_BLUE);
          this.api.showFloatingText(nx, ny - 24, '⚡ glitch', '#9fc2ff');
        }
      }
    }

    // Shots: simple ballistic points; only the local player can be hit.
    this.shots = this.shots.filter((s) => {
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      if (s.x < 20 || s.x > this.api.width - 20 || s.y < 20 || s.y > this.api.height - 20) return false;
      g.fillStyle(s.color, 0.35);
      g.fillCircle(s.x, s.y, SHOT_RADIUS + 3);
      g.fillStyle(s.color, 1);
      g.fillCircle(s.x, s.y, SHOT_RADIUS - 2);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(s.x - 1, s.y - 1, 1.6);
      if (p.active && p.hp > 0 && Math.hypot(s.x - p.x, s.y - p.y) < SHOT_RADIUS + 14) {
        p.takeDamage(s.damage);
        this.api.spawnHitFlash(p.x, p.y, s.color);
        this.api.showFloatingText(p.x, p.y - 26, `💢 ${s.damage}`, '#ff6b85');
        return false;
      }
      return true;
    });

    // Charge lanes.
    this.telegraphs = this.telegraphs.filter((tl) => {
      if (time > tl.until) return false;
      g.lineStyle(3, tl.color, 0.5);
      g.lineBetween(tl.x1, tl.y1, tl.x2, tl.y2);
      return true;
    });
  }
}
