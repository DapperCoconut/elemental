import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk, HuskWorld } from '../../invasion/Husk';
import { getHuskVariant, HuskVariantDef } from '../../invasion/HuskVariants';
import { Sfx } from '../../audio';

/**
 * Narrow surface the Summoner mutation needs from ArenaScene.
 *
 * Deliberately the same shape the secret maps use to put husks on the floor:
 * the horde is registered in the arena's enemy list, so every damage path the
 * player already owns — projectiles, AoE, DOTs, freezes, masteries — reaches it
 * without the mutation knowing any of them exist.
 */
export interface SummonerArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Life's plants pull minion aggro off the player while any are standing. */
  plantTargets(): Fighter[];
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  /** Drop an npc-owned toxic puddle into the arena's shared pool. */
  spawnToxicPuddle(x: number, y: number, radius: number, durationMs: number): void;
}

const WAVE_MS = 10_000;
const WAVE_SIZE = 5;
/** How many risen may stand on the floor at once (zombielings counted apart). */
const HORDE_CAP = 14;

const HUSK_HP = 26;
const HUSK_SPEED = 88;
const HUSK_BITE = 5;
/** A speedster is 3× base; past this it stops being dodgeable and starts being unfair. */
const MAX_HUSK_SPEED = 240;

/**
 * The mix hardens with the clock rather than with a wave counter — a Summoner
 * fight has no waves to count, so the pool widens by one every 20 seconds and a
 * fight you drag out is the fight that meets a Life medic and a Gunpowder husk.
 * Drawn from the elemental variant table (the old bespoke variants are gone).
 */
const VARIANT_POOL = ['basic', 'basic', 'elem-air-t1', 'elem-earth-t1', 'elem-electricity-t1', 'elem-hunt-t1', 'elem-life-t1', 'elem-gunpowder-t1'];
const POOL_UNLOCK_MS = 20_000;

const LING_HP = 12;
const LING_SPEED = 168;
const LING_BITE = 2;
const LING_SIZE = 0.55;
const LING_TINT = 0xb6ff5a;
const LING_CAP = 14;
const LING_PUDDLE_RADIUS = 24;
const LING_PUDDLE_MS = 3200;

const BLASTER_RADIUS = 112;
/** Blaster damage to other risen, as a fraction of its damage to the player. */
const BLASTER_HUSK_DAMAGE_FRAC = 1.5;

const HEAL_CHECK_MS = 12_000;
const HEAL_THRESHOLD = 12;
const HEAL_AMOUNT = 15;

const SHOT_SPEED = 270;
const SHOT_LIFETIME_MS = 3000;
const SHOT_RADIUS = 6;
const SHOT_HIT_RADIUS = 20;

const GRAVE_GREEN = 0x6fd18a;
const GRAVE_HEX = '#6fd18a';

interface SummonShot {
  gfx: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  expiresAt: number;
}

/**
 * The Summoner boss mutation.
 *
 * The boss itself is still the arena's npc — this kit owns only what it raises.
 * The horde is built out of real invasion husks (`Husk` + the variant table),
 * so the risen shamble, kite, spit, charge, heal each other and blow up exactly
 * as they do in the Corrupt Realm, wear their own variant art and health bars,
 * and can be frozen, burned and shattered like anything else on the field.
 */
export class SummonerKit implements HuskWorld {
  private active = false;
  private startedAt = 0;
  private nextWaveAt = 0;
  private phase2 = false;
  private nextHealCheckAt = 0;

  private husks: Husk[] = [];
  private lings: Husk[] = [];
  private shots: SummonShot[] = [];

  constructor(private api: SummonerArenaApi) {}

  // ── Lifecycle ──────────────────────────────────────────────────────

  /**
   * Called every match start, whether or not the mutation is on. The scene
   * restart has already destroyed last match's husks, their shots and the old
   * enemy group, so this only drops the stale references — reaching back into
   * the arena here would be poking at bodies that no longer exist.
   */
  reset(): void {
    this.husks = [];
    this.lings = [];
    this.shots = [];
    this.active = false;
    this.startedAt = 0;
    this.nextWaveAt = 0;
    this.phase2 = false;
    this.nextHealCheckAt = 0;
  }

  /** The mutation is on for this match — start the clock. */
  begin(time: number): void {
    this.active = true;
    this.startedAt = time;
    this.nextWaveAt = time + WAVE_MS;
    this.phase2 = false;
    this.nextHealCheckAt = 0;
  }

  update(time: number, delta: number): void {
    if (!this.active) return;

    const npc = this.api.npc;
    // The thing holding them up is gone. So are they.
    if (!npc.active || npc.hp <= 0) {
      if (this.husks.length || this.lings.length) this.collapse();
      return;
    }

    if (!this.phase2 && npc.hp <= npc.maxHp * 0.5) this.enterPhase2(time);

    if (time >= this.nextWaveAt) {
      this.nextWaveAt = time + WAVE_MS;
      this.raiseWave(time);
    }

    const targets = this.currentTargets();
    for (const h of [...this.husks, ...this.lings]) {
      if (!h.active || h.hp <= 0) continue;
      h.update(targets, time, delta);
    }

    this.updateShots(time, delta, targets);

    // Phase 2: a floor that is theirs feeds the thing that filled it.
    if (this.phase2 && time >= this.nextHealCheckAt) {
      this.nextHealCheckAt = time + HEAL_CHECK_MS;
      if (this.husks.length >= HEAL_THRESHOLD) {
        npc.hp = Math.min(npc.maxHp, npc.hp + HEAL_AMOUNT);
        this.api.showFloatingText(npc.x, npc.y - 28, `💀 +${HEAL_AMOUNT}`, GRAVE_HEX);
      }
    }
  }

  private enterPhase2(time: number): void {
    this.phase2 = true;
    const npc = this.api.npc;
    npc.incomingDamageMultiplier *= 0.92;
    this.nextHealCheckAt = time + HEAL_CHECK_MS;
    Sfx.play('boss-phase');
    this.api.showFloatingText(npc.x, npc.y - 40, '💀 PHASE 2', GRAVE_HEX);
    // Everything already standing shudders as the second half takes hold.
    for (const h of this.husks) {
      this.api.scene.tweens.add({
        targets: h, scaleX: h.sizeMult * 1.2, scaleY: h.sizeMult * 1.2,
        duration: 140, yoyo: true,
      });
    }
  }

  /** The boss fell — let the horde fall with it rather than leaving it mid-stride. */
  private collapse(): void {
    const scene = this.api.scene;
    for (const h of [...this.husks, ...this.lings]) {
      this.api.removeEnemy(h);
      h.hideHealthBar();
      (h.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
      scene.tweens.add({
        targets: h, alpha: 0, scaleX: h.sizeMult * 0.4, scaleY: h.sizeMult * 0.4,
        duration: 420, ease: 'Power2',
        onComplete: () => { if (h.scene) h.destroy(); },
      });
    }
    this.husks = [];
    this.lings = [];
    for (const s of this.shots) s.gfx.destroy();
    this.shots = [];
  }

  // ── Raising ────────────────────────────────────────────────────────

  private raiseWave(time: number): void {
    const room = Math.max(0, HORDE_CAP - this.husks.length);
    const count = Math.min(WAVE_SIZE, room);
    if (count === 0) return;

    const elapsedMs = time - this.startedAt;
    const poolTop = Math.min(VARIANT_POOL.length, 2 + Math.floor(elapsedMs / POOL_UNLOCK_MS));
    for (let i = 0; i < count; i++) {
      const id = VARIANT_POOL[Math.floor(Math.random() * poolTop)];
      this.raise(getHuskVariant(id), this.pickEdgeSpawn());
    }

    const npc = this.api.npc;
    this.api.showFloatingText(npc.x, npc.y - 50, '💀 THE DEAD RISE', GRAVE_HEX);
    this.api.scene.cameras.main.shake(180, 0.003);
  }

  private raise(variant: HuskVariantDef, at: { x: number; y: number }): Husk {
    const scene = this.api.scene;
    const husk = new Husk(
      scene, at.x, at.y,
      Math.round(HUSK_HP * variant.hpMult),
      Math.min(MAX_HUSK_SPEED, Math.round(HUSK_SPEED * variant.speedMult)),
      Math.round(HUSK_BITE * variant.damageMult),
      950, variant,
    );
    husk.world = this;
    husk.onBite = (dmg, target) => this.bite(target, dmg);
    husk.on('damaged', (amount: number) => {
      if (amount > 0 && husk.active) this.api.spawnDamageNumber(husk.x, husk.y - 20, amount);
    });
    husk.once('defeated', () => this.onHuskDown(husk));
    this.api.addEnemy(husk);
    this.husks.push(husk);

    this.riseFx(at.x, at.y, variant.color);
    // Clawing its way up: faded and low, then it is simply standing there.
    husk.setAlpha(0);
    scene.tweens.add({ targets: husk, alpha: 1, duration: 320 });
    return husk;
  }

  private onHuskDown(husk: Husk): void {
    this.husks = this.husks.filter((h) => h !== husk);
    this.api.removeEnemy(husk);
    if (husk.variant.explodes) this.detonate(husk);
    // Phase 2: nothing this thing raised ever really stops.
    if (this.phase2 && this.lings.length < LING_CAP) this.raiseLing(husk.x, husk.y);
    this.fadeOut(husk);
  }

  /** A zombieling — small, fast, and it leaves the ground poisoned where it bursts. */
  private raiseLing(x: number, y: number): void {
    const scene = this.api.scene;
    const variant = getHuskVariant('basic');
    const ling = new Husk(
      scene,
      x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12),
      LING_HP, LING_SPEED, LING_BITE, 850, variant,
    );
    ling.sizeMult = LING_SIZE;
    ling.applySizeMult();
    ling.setTint(LING_TINT);
    ling.world = this;
    ling.onBite = (dmg, target) => this.bite(target, dmg);
    ling.on('damaged', (amount: number) => {
      if (amount > 0 && ling.active) this.api.spawnDamageNumber(ling.x, ling.y - 14, amount);
    });
    ling.once('defeated', () => {
      this.lings = this.lings.filter((l) => l !== ling);
      this.api.removeEnemy(ling);
      this.api.spawnToxicPuddle(ling.x, ling.y, LING_PUDDLE_RADIUS, LING_PUDDLE_MS);
      this.api.spawnHitFlash(ling.x, ling.y, 0x77ee44);
      this.fadeOut(ling);
    });
    this.api.addEnemy(ling);
    this.lings.push(ling);
  }

  private fadeOut(husk: Husk): void {
    husk.hideHealthBar();
    husk.setTint(0x334411);
    (husk.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    this.api.scene.tweens.add({
      targets: husk,
      scaleX: husk.sizeMult * 0.3, scaleY: husk.sizeMult * 0.3, alpha: 0,
      duration: 320, ease: 'Power2',
      onComplete: () => { if (husk.scene) husk.destroy(); },
    });
  }

  /** Random point just inside one of the four arena edges. */
  private pickEdgeSpawn(): { x: number; y: number } {
    const wb = this.bounds();
    const inset = 24;
    switch (Phaser.Math.Between(0, 3)) {
      case 0:  return { x: Phaser.Math.Between(wb.x + inset, wb.right - inset), y: wb.y + inset };
      case 1:  return { x: Phaser.Math.Between(wb.x + inset, wb.right - inset), y: wb.bottom - inset };
      case 2:  return { x: wb.x + inset, y: Phaser.Math.Between(wb.y + inset, wb.bottom - inset) };
      default: return { x: wb.right - inset, y: Phaser.Math.Between(wb.y + inset, wb.bottom - inset) };
    }
  }

  // ── Targeting and damage ───────────────────────────────────────────

  /** Who the risen walk at. Life's plants take priority, exactly as for every other minion. */
  private currentTargets(): Fighter[] {
    const plants = this.api.plantTargets().filter((p) => p.active && p.hp > 0);
    if (plants.length > 0) return plants;
    const player = this.api.player;
    return player.active && player.hp > 0 ? [player] : [];
  }

  private bite(target: Fighter, damage: number): void {
    const dmg = Math.max(1, Math.round(damage * this.api.npc.outgoingDamageMult));
    // Husk damage is the one thing that reaches a fighter through a friendly-fire block.
    Fighter.asNonAllyDamage(() => target.takeDamage(dmg));
    this.api.spawnHitFlash(target.x, target.y, 0x88cc44);
  }

  /** Blaster death blast — catches the player *and* whatever else was crowding it. */
  private detonate(blaster: Husk): void {
    const dmg = blaster.biteDamage * 2;
    this.boomVisual(blaster.x, blaster.y, BLASTER_RADIUS, 0xff5522);
    for (const t of this.currentTargets()) {
      if (Phaser.Math.Distance.Between(blaster.x, blaster.y, t.x, t.y) <= BLASTER_RADIUS) this.bite(t, dmg);
    }
    for (const other of this.living()) {
      if (other === blaster) continue;
      if (Phaser.Math.Distance.Between(blaster.x, blaster.y, other.x, other.y) <= BLASTER_RADIUS) {
        other.takeDamage(Math.round(dmg * BLASTER_HUSK_DAMAGE_FRAC));
      }
    }
  }

  private living(): Husk[] {
    return [...this.husks, ...this.lings].filter((h) => h.active && h.hp > 0);
  }

  private bounds(): Phaser.Geom.Rectangle {
    const scene = this.api.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics };
    return scene.physics.world.bounds;
  }

  // ── HuskWorld (the variant world-effects) ──────────────────────────

  fireShot(from: Husk, tx: number, ty: number, damage: number): void {
    const scene = this.api.scene;
    const ang = Math.atan2(ty - from.y, tx - from.x);
    const vx = Math.cos(ang) * SHOT_SPEED;
    const vy = Math.sin(ang) * SHOT_SPEED;
    const gfx = scene.add.circle(from.x, from.y, SHOT_RADIUS, from.variant.color, 1)
      .setDepth(7).setStrokeStyle(2, 0x18240c, 0.85);
    this.shots.push({ gfx, vx, vy, damage, expiresAt: scene.time.now + SHOT_LIFETIME_MS });
  }

  /** No titans in a Summoner fight — the boss does its own summoning. */
  summon(): void {}

  healNearbyHusks(source: Husk, radius: number, frac: number): void {
    const scene = this.api.scene;
    const ring = scene.add.circle(source.x, source.y, radius, 0x66ff88, 0.16)
      .setDepth(3).setScale(0.4);
    scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 500, onComplete: () => ring.destroy() });

    for (const other of this.living()) {
      if (other === source || other.hp >= other.maxHp) continue;
      if (scene.time.now < other.purgedUntil) continue;
      if (Phaser.Math.Distance.Between(source.x, source.y, other.x, other.y) > radius) continue;
      other.heal(Math.max(1, Math.round(other.maxHp * frac)));
      this.api.showFloatingText(other.x, other.y - 26, '+', '#66ff88');
    }
  }

  telegraph(x1: number, y1: number, x2: number, y2: number, color: number, durationMs: number): void {
    const scene = this.api.scene;
    const line = scene.add.line(0, 0, x1, y1, x2, y2, color, 0.5)
      .setOrigin(0, 0).setLineWidth(6).setDepth(3);
    scene.tweens.add({
      targets: line, alpha: { from: 0.2, to: 0.8 }, duration: durationMs / 2, yoyo: true,
      onComplete: () => line.destroy(),
    });
  }

  /** Possession is a Corrupt-Realm boss trick; nothing here is big enough to ride. */
  findPossessTarget(): Husk | null { return null; }
  possess(): void {}

  // ── Husk projectiles ───────────────────────────────────────────────

  private updateShots(time: number, delta: number, targets: Fighter[]): void {
    if (this.shots.length === 0) return;
    const dt = delta / 1000;
    const wb = this.bounds();

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.gfx.x += s.vx * dt;
      s.gfx.y += s.vy * dt;

      let done = time >= s.expiresAt
        || s.gfx.x < wb.x || s.gfx.x > wb.right || s.gfx.y < wb.y || s.gfx.y > wb.bottom;

      if (!done) {
        for (const t of targets) {
          if (!t.active || t.hp <= 0 || t.downed) continue;
          // Illusion Dance: a husk shot is a projectile like any other, so it passes through.
          if (t.projectilePhase) continue;
          if (Phaser.Math.Distance.Between(s.gfx.x, s.gfx.y, t.x, t.y)
              <= SHOT_HIT_RADIUS + 22 * t.sizeMult * t.shapeSizeMult) {
            this.bite(t, s.damage);
            done = true;
            break;
          }
        }
      }

      if (done) {
        s.gfx.destroy();
        this.shots.splice(i, 1);
      }
    }
  }

  // ── Art ────────────────────────────────────────────────────────────

  /**
   * The ground opening. A scorched scar, a rotating grave-sigil of two rings and
   * an inverted triangle, eight rune ticks around the rim, and clods of earth
   * thrown clear — drawn once per risen and torn down with its own tween.
   */
  private riseFx(x: number, y: number, tint: number): void {
    const scene = this.api.scene;
    const g = scene.add.graphics({ x, y: y + 6 }).setDepth(3);

    g.fillStyle(0x1b2a10, 0.85);
    g.fillEllipse(0, 0, 46, 16);
    g.fillStyle(0x0b1206, 0.9);
    g.fillEllipse(0, 1, 30, 10);

    g.lineStyle(2, GRAVE_GREEN, 0.95);
    g.strokeCircle(0, 0, 22);
    g.lineStyle(1, tint, 0.7);
    g.strokeCircle(0, 0, 15);

    // Rune ticks around the rim.
    g.lineStyle(2, GRAVE_GREEN, 0.8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(Math.cos(a) * 18, Math.sin(a) * 18, Math.cos(a) * 26, Math.sin(a) * 26);
    }
    // Inverted triangle in the middle — the mark of something coming up, not down.
    g.lineStyle(1.5, GRAVE_GREEN, 0.85);
    g.beginPath();
    g.moveTo(-11, -7); g.lineTo(11, -7); g.lineTo(0, 12); g.closePath();
    g.strokePath();

    scene.tweens.add({
      targets: g, rotation: 0.9, scaleX: 1.35, scaleY: 0.55, alpha: 0,
      duration: 560, ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });

    // Clods of earth thrown clear of the hole.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI + Math.random() * Math.PI; // upward arc only
      const clod = scene.add.ellipse(x, y + 4, 7, 5, 0x3a2b1c, 0.9).setDepth(4);
      scene.tweens.add({
        targets: clod,
        x: x + Math.cos(a) * (26 + Math.random() * 18),
        y: y + Math.sin(a) * (20 + Math.random() * 14),
        alpha: 0, scaleX: 0.4, scaleY: 0.4,
        duration: 420, ease: 'Quad.easeOut',
        onComplete: () => clod.destroy(),
      });
    }
  }

  private boomVisual(x: number, y: number, radius: number, color: number): void {
    const scene = this.api.scene;
    const ring = scene.add.circle(x, y, radius, color, 0.42).setDepth(6).setScale(0.25);
    scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    scene.cameras.main.shake(160, 0.004);
  }
}
