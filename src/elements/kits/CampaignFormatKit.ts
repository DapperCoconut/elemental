import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk, HuskWorld } from '../../invasion/Husk';
import { getHuskVariant } from '../../invasion/HuskVariants';
import { FightFormat } from '../../data/FightFormats';

/**
 * Runs the horde / survival / flood fight formats inside a campaign bout.
 * (Tag-team is a scene-flow concern and lives in ArenaScene ⇄ element select.)
 *
 * Owns every scrap of format state and visuals; ArenaScene only constructs it,
 * calls reset() each match and update() each frame — the usual kit contract.
 */

export interface CampaignFormatArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get width(): number;
  get height(): number;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** Survival ran its clock down — the bout is won. */
  formatVictory(): void;
}

const HORDE_CAP = 5;
const HORDE_VARIANTS = ['basic', 'basic', 'speedster', 'tank', 'spitter'];
const SURVIVAL_TANK_MULT = 0.22;
const FLOOD_SPEED = 9; // px/s of arena eaten from each edge
const FLOOD_TICK_MS = 600;
const FLOOD_BASE_DAMAGE = 6;
/** Flood damage grows the longer it has been pouring — the ramp is the threat. */
const FLOOD_RAMP_PER_SEC = 0.09;

export class CampaignFormatKit {
  private format: FightFormat | null = null;
  private startedAt = 0;

  // Horde
  private nextWaveAt = 0;
  private husks: Husk[] = [];
  private waveCount = 0;

  // Survival
  private hudText: Phaser.GameObjects.Text | null = null;
  private survivalDone = false;

  // Flood
  private floodG: Phaser.GameObjects.Graphics | null = null;
  private floodDepth = 0;
  private lastFloodTickAt = 0;
  private lastNpcFloodTickAt = 0;

  private readonly huskWorld: HuskWorld = {
    fireShot: (from, tx, ty, damage) => {
      // Spitter shots reuse the telegraph line as a crude bolt — the husk class
      // only needs the hit applied; do it as a short-range hitscan with a tell.
      const scene = this.api.scene;
      const g = scene.add.graphics().setDepth(8);
      g.lineStyle(2.5, 0x9944cc, 0.9);
      g.lineBetween(from.x, from.y, tx, ty);
      scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      const p = this.api.player;
      if (p.active && Phaser.Math.Distance.Between(tx, ty, p.x, p.y) < 30) p.takeDamage(damage);
    },
    summon: () => {},
    healNearbyHusks: () => {},
    telegraph: (x1, y1, x2, y2, color, durationMs) => {
      const g = this.api.scene.add.graphics().setDepth(3);
      g.lineStyle(3, color, 0.75);
      g.lineBetween(x1, y1, x2, y2);
      this.api.scene.tweens.add({ targets: g, alpha: 0, duration: durationMs, onComplete: () => g.destroy() });
    },
    findPossessTarget: () => null,
    possess: () => {},
  };

  constructor(private api: CampaignFormatArenaApi) {}

  reset(format: FightFormat | null, difficultyLevel: number): void {
    this.clear();
    this.format = format;
    if (!format) return;
    const scene = this.api.scene;
    const now = scene.time.now;
    this.startedAt = now;

    if (format.kind === 'horde') {
      this.nextWaveAt = now + (format.intervalMs ?? 9000) * 0.6;
      this.waveCount = 0;
      this.api.showFloatingText(this.api.width / 2, 120, '👾 THE HORDE IS COMING', '#ff9a66');
    }

    if (format.kind === 'survival') {
      this.survivalDone = false;
      // The foe barely bleeds: the win is the clock, the threat is the pressure.
      this.api.npc.incomingDamageMultiplier *= SURVIVAL_TANK_MULT;
      this.hudText = scene.add.text(this.api.width / 2, 78, '', {
        fontSize: '22px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffe9a8', stroke: '#0a0510', strokeThickness: 5, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(26);
    }

    if (format.kind === 'flood') {
      this.floodDepth = 0;
      this.lastFloodTickAt = 0;
      this.lastNpcFloodTickAt = 0;
      this.floodG = scene.add.graphics().setDepth(2);
      this.api.showFloatingText(this.api.width / 2, 120, `🔴 THE FLOOD COMES IN ${format.graceSeconds}s`, '#ff6a7a');
    }
    void difficultyLevel;
  }

  update(time: number, delta: number): void {
    const f = this.format;
    if (!f) return;
    if (f.kind === 'horde') this.updateHorde(time, f);
    if (f.kind === 'survival') this.updateSurvival(time, f);
    if (f.kind === 'flood') this.updateFlood(time, delta / 1000, f);
  }

  // ── Horde ──────────────────────────────────────────────────────────

  private updateHorde(time: number, f: Extract<FightFormat, { kind: 'horde' }>): void {
    if (time < this.nextWaveAt) return;
    this.nextWaveAt = time + (f.intervalMs ?? 9000);
    this.waveCount++;
    const per = f.perWave ?? 2;
    for (let i = 0; i < per; i++) {
      if (this.husks.length >= HORDE_CAP) break;
      this.spawnHusk();
    }
  }

  private spawnHusk(): void {
    const scene = this.api.scene;
    const W = this.api.width;
    const H = this.api.height;
    // Later waves send nastier mixes; the list is ordered mild → mean.
    const poolTop = Math.min(HORDE_VARIANTS.length, 2 + this.waveCount);
    const variant = getHuskVariant(HORDE_VARIANTS[Math.floor(Math.random() * poolTop)]);
    const edge = Math.floor(Math.random() * 4);
    const x = edge === 0 ? 60 : edge === 1 ? W - 60 : Phaser.Math.Between(80, W - 80);
    const y = edge === 2 ? 70 : edge === 3 ? H - 60 : Phaser.Math.Between(110, H - 80);
    const husk = new Husk(
      scene, x, y,
      Math.round(55 * variant.hpMult), Math.round(95 * variant.speedMult),
      Math.round(14 * variant.damageMult), 950, variant,
    );
    husk.world = this.huskWorld;
    this.api.addEnemy(husk);
    this.husks.push(husk);
    husk.once('defeated', () => {
      this.husks = this.husks.filter((h) => h !== husk);
      this.api.removeEnemy(husk);
      if (husk.scene) husk.destroy();
    });
    const g = scene.add.circle(x, y, 26, 0x4e7a2e, 0.4).setDepth(4);
    scene.tweens.add({ targets: g, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 400, onComplete: () => g.destroy() });
  }

  // ── Survival ───────────────────────────────────────────────────────

  private updateSurvival(time: number, f: Extract<FightFormat, { kind: 'survival' }>): void {
    if (this.survivalDone) return;
    const left = Math.max(0, f.seconds - (time - this.startedAt) / 1000);
    if (this.hudText?.active) {
      this.hudText.setText(`⏳ ${Math.ceil(left)}`);
      this.hudText.setColor(left < 10 ? '#ff8a8a' : '#ffe9a8');
    }
    if (left <= 0) {
      this.survivalDone = true;
      this.api.showFloatingText(this.api.width / 2, this.api.height / 2, 'OUTLASTED', '#ffe9a8');
      this.api.formatVictory();
    }
  }

  // ── Flood ──────────────────────────────────────────────────────────

  private updateFlood(time: number, dt: number, f: Extract<FightFormat, { kind: 'flood' }>): void {
    const elapsed = (time - this.startedAt) / 1000;
    const pouring = elapsed - f.graceSeconds;
    if (pouring <= 0) return;

    const W = this.api.width;
    const H = this.api.height;
    // Never floods the whole arena — a survivable core always remains.
    const maxDepth = Math.min(W, H) * 0.34;
    this.floodDepth = Math.min(maxDepth, pouring * FLOOD_SPEED);

    const g = this.floodG;
    if (g) {
      const d = this.floodDepth;
      const pulse = 0.24 + Math.sin(time / 300) * 0.05;
      g.clear();
      g.fillStyle(0x8a1420, pulse);
      g.fillRect(0, 0, W, d + 60);            // top (HUD strip floods first — it was never safe)
      g.fillRect(0, H - d, W, d);             // bottom
      g.fillRect(0, 0, d, H);                 // left
      g.fillRect(W - d, 0, d, H);             // right
      g.lineStyle(2, 0xff4a5a, 0.7);
      g.strokeRect(d, d + 60, W - d * 2, H - d * 2 - 60);
    }

    const damage = Math.round(FLOOD_BASE_DAMAGE * (1 + pouring * FLOOD_RAMP_PER_SEC));
    const inFlood = (x: number, y: number): boolean =>
      x < this.floodDepth || x > W - this.floodDepth
      || y < this.floodDepth + 60 || y > H - this.floodDepth;

    const p = this.api.player;
    if (p.active && p.hp > 0 && inFlood(p.x, p.y) && time - this.lastFloodTickAt > FLOOD_TICK_MS) {
      this.lastFloodTickAt = time;
      p.takeDamage(damage);
      this.api.showFloatingText(p.x, p.y - 34, '🔴', '#ff6a7a');
    }
    // The corruption is not on your side — it eats the opponent too.
    const n = this.api.npc;
    if (n.active && n.hp > 0 && inFlood(n.x, n.y) && time - this.lastNpcFloodTickAt > FLOOD_TICK_MS) {
      this.lastNpcFloodTickAt = time;
      n.takeDamage(Math.round(damage * 0.6));
    }
    void dt;
  }

  // ── Teardown ───────────────────────────────────────────────────────

  private clear(): void {
    for (const h of [...this.husks]) {
      this.api.removeEnemy(h);
      if (h.scene) h.destroy();
    }
    this.husks = [];
    this.hudText?.destroy();
    this.hudText = null;
    this.floodG?.destroy();
    this.floodG = null;
    this.survivalDone = false;
    this.floodDepth = 0;
  }
}
