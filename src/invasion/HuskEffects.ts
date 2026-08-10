import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Husk } from './Husk';
import { HuskVariantDef, DECOY_HUSK, BASIC_HUSK, huskTextureKey } from './HuskVariants';

/**
 * The elemental husk effect engine.
 *
 * Every elemental variant's "one simple trick" lives here, dispatched by
 * `variant.elementId` and scaled by tier and category. The engine is owned by
 * InvasionKit and speaks to the arena only through the narrow EffectWorld
 * surface below, so all damage it deals rides the kit's own room-aware
 * damage path (and therefore forwards to a co-op ally correctly).
 *
 * Behaviour-shaped tricks (kiting, charging, medic pulses) stay on the husk's
 * `variant.behavior` — the engine only adds the elemental toppings.
 */

export interface EffectWorld {
  readonly scene: Phaser.Scene;
  /** Players/plants a husk in `room` may hurt right now — already room-filtered. */
  targetsInRoom(room: number): Fighter[];
  /** Route damage to a target (handles the co-op ally forwarding). */
  damageTarget(target: Fighter, amount: number): void;
  livingHusks(): Husk[];
  roomOf(husk: Husk): number;
  /** The room the local player is currently looking at — gates all drawing. */
  currentRoom(): number;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** Slow the local player's movement (mult < 1) for a short window. */
  slowPlayer(mult: number, ms: number): void;
  /**
   * Spawn a child husk (splits, echoes, ghosts, decoys). Returns null when
   * the field is too crowded to allow it.
   */
  spawnChild(
    variant: HuskVariantDef,
    x: number,
    y: number,
    room: number,
    opts?: { hpFrac?: number; alpha?: number; noReward?: boolean },
  ): Husk | null;
  /** Mirror a ground zone to the co-op guest (cosmetic). */
  mirrorZone(x: number, y: number, r: number, color: number, ms: number, room: number): void;
}

interface Zone {
  x: number;
  y: number;
  r: number;
  color: number;
  room: number;
  until: number;
  /** Damage per tick (600ms) to targets inside, if any. */
  tickDamage: number;
  /** Movement multiplier applied to the player while inside, if < 1. */
  slowMult: number;
  nextTickAt: number;
}

interface PlayerDot {
  target: Fighter;
  kind: string;
  dps: number;
  until: number;
  nextTickAt: number;
  emoji: string;
  color: string;
}

interface EState {
  husk: Husk;
  elementId: string;
  /** Tier × category scaling — 1 for a normal t1, ~4.5 for a corrupt t3. */
  power: number;
  nextActionAt: number;
  orbitAngle: number;
  /** Per-target contact cooldown for orbitals/auras. */
  contactCooldown: Map<Fighter, number>;
  revealed: boolean;
  risen: boolean;
  armorTicks: number;
  feedStacks: number;
  bounceUntil: number;
  bounceVx: number;
  bounceVy: number;
  buffUntil: number;
  burrowPhase: 'idle' | 'under';
}

const ZONE_TICK_MS = 600;
const DOT_TICK_MS = 1000;
const MAX_ZONES = 60;
const MAX_FEED_STACKS = 6;

/** Tier/category → one scalar the magnitudes below multiply. */
function powerOf(v: HuskVariantDef): number {
  const tier = v.tier ?? 1;
  const cat = v.category === 'corrupt' ? 1.5 : v.category === 'abstract' ? 1.25 : 1;
  return tier * cat;
}

export class HuskEffectEngine {
  private states = new Map<Husk, EState>();
  private zones: Zone[] = [];
  private dots: PlayerDot[] = [];
  private g: Phaser.GameObjects.Graphics | null = null;

  constructor(private world: EffectWorld) {}

  reset(): void {
    this.states.clear();
    this.zones = [];
    this.dots = [];
    this.g?.destroy();
    this.g = this.world.scene.add.graphics().setDepth(3.5);
  }

  destroy(): void {
    this.states.clear();
    this.zones = [];
    this.dots = [];
    this.g?.destroy();
    this.g = null;
  }

  /** Whether this variant carries an engine effect at all. */
  static hasEffect(v: HuskVariantDef): boolean {
    return !!v.elementId;
  }

  /** External zone drop — used by the kit for shot-impact flavours (Depths). */
  spawnZone(
    x: number, y: number, r: number, color: number, room: number, ms: number,
    opts: { tickDamage?: number; slowMult?: number },
  ): void {
    this.addZone(x, y, r, color, room, this.world.scene.time.now + ms, opts);
  }

  register(husk: Husk): void {
    const v = husk.variant;
    if (!v.elementId) return;
    const st: EState = {
      husk,
      elementId: v.elementId,
      power: powerOf(v),
      nextActionAt: 0,
      orbitAngle: Math.random() * Math.PI * 2,
      contactCooldown: new Map(),
      revealed: false,
      risen: false,
      armorTicks: 0,
      feedStacks: 0,
      bounceUntil: 0,
      bounceVx: 0,
      bounceVy: 0,
      buffUntil: 0,
      burrowPhase: 'idle',
    };
    this.states.set(husk, st);

    switch (v.elementId) {
      case 'earth': husk.incomingDamageMultiplier *= 0.8; break;
      case 'metal': husk.incomingDamageMultiplier *= 0.65; break;
      case 'subterfuge':
        // Wears a plain husk's face until you get close enough to matter.
        if (v.id !== 'decoy') husk.setTexture(huskTextureKey(BASIC_HUSK));
        break;
      case 'illusion':
        if (v.id !== 'decoy') this.spawnDecoys(husk);
        break;
      default: break;
    }
  }

  /** The husk landed a bite on `target` — apply the elemental rider. */
  onBiteLanded(husk: Husk, target: Fighter): void {
    const st = this.states.get(husk);
    if (!st) return;
    const now = this.world.scene.time.now;
    const p = st.power;
    switch (st.elementId) {
      case 'fire':
        this.applyDot(target, 'fire', 2 + p, 3000, '🔥', '#ff8844');
        break;
      case 'magma':
        this.applyDot(target, 'magma', 3 + p * 1.5, 3500, '🌋', '#ff6a33');
        break;
      case 'slime':
        this.applyDot(target, 'slime', 2 + p, 4000, '🟢', '#88dd44');
        break;
      case 'plasma':
        this.applyDot(target, 'plasma', 2 + p, 2500, '🔮', '#cc66ff');
        break;
      case 'ice':
        this.world.slowPlayer(Math.max(0.45, 0.8 - p * 0.06), 1500);
        this.world.showFloatingText(target.x, target.y - 30, '🧊 CHILLED', '#aaddff');
        break;
      case 'fate':
        if (Math.random() < 0.4) {
          const bonus = Math.round(husk.biteDamage * (0.5 + Math.random() * p * 0.5));
          this.world.damageTarget(target, bonus);
          this.world.showFloatingText(target.x, target.y - 42, `🃏 ${bonus}`, '#88eecc');
        }
        break;
      case 'death': {
        const drink = Math.round(husk.biteDamage);
        husk.heal(drink);
        this.world.showFloatingText(husk.x, husk.y - 30, `⚰️ +${drink}`, '#8a80b0');
        break;
      }
      case 'marrow': {
        if (st.feedStacks < MAX_FEED_STACKS) {
          st.feedStacks++;
          husk.setMaxHp(Math.round(husk.maxHp * 1.08));
          husk.sizeMult *= 1.04;
          husk.applySizeMult();
        }
        husk.heal(Math.round(husk.biteDamage * 2));
        this.world.showFloatingText(husk.x, husk.y - 30, '🦴 FED', '#ff8a9a');
        break;
      }
      case 'rubber': {
        // Boing — bites, then flings itself back out of reach.
        const ang = Math.atan2(husk.y - target.y, husk.x - target.x);
        st.bounceUntil = now + 320;
        st.bounceVx = Math.cos(ang) * 400;
        st.bounceVy = Math.sin(ang) * 400;
        break;
      }
      default: break;
    }
  }

  /** The husk died. Death tricks, and the neighbours who care about deaths. */
  onHuskDeath(husk: Husk): void {
    const st = this.states.get(husk);
    const room = this.world.roomOf(husk);
    const now = this.world.scene.time.now;

    // Gluttons in the room feed on any corpse that drops near them.
    for (const other of this.world.livingHusks()) {
      const ost = this.states.get(other);
      if (!ost || ost.elementId !== 'gluttony' || other === husk) continue;
      if (this.world.roomOf(other) !== room) continue;
      if (Phaser.Math.Distance.Between(other.x, other.y, husk.x, husk.y) > 150) continue;
      if (ost.feedStacks >= MAX_FEED_STACKS) continue;
      ost.feedStacks++;
      other.setMaxHp(Math.round(other.maxHp * 1.1));
      other.heal(Math.round(other.maxHp * 0.15));
      other.sizeMult *= 1.05;
      other.applySizeMult();
      other.biteDamage = Math.round(other.biteDamage * 1.08);
      this.world.showFloatingText(other.x, other.y - 30, '🍖 DEVOURED', '#ff9a66');
    }

    if (!st) return;
    const p = st.power;
    switch (st.elementId) {
      case 'crystal': {
        const r = 90 + p * 18;
        this.nova(husk.x, husk.y, r, 0xa8e4ff, room, Math.round(6 + p * 4));
        break;
      }
      case 'plasma': {
        const r = 80 + p * 14;
        this.nova(husk.x, husk.y, r, 0xcc66ff, room, Math.round(5 + p * 3));
        break;
      }
      case 'slime':
        this.addZone(husk.x, husk.y, 44 + p * 6, 0x66cc44, room, now + 4200, { tickDamage: Math.round(1 + p) });
        break;
      case 'growth': {
        // Only the original splits — its buds are no-reward and stay dead,
        // or two husks would multiply into an endless (and farmable) bloom.
        if (husk.noRewardKill) break;
        for (let i = 0; i < 2; i++) {
          this.world.spawnChild(husk.variant, husk.x + (i === 0 ? -22 : 22), husk.y + 10, room, {
            hpFrac: 0.3, noReward: true,
          });
        }
        this.world.showFloatingText(husk.x, husk.y - 30, '🦠 IT SPLITS', '#aadd44');
        break;
      }
      case 'echo': {
        if (husk.noRewardKill) break;
        for (let i = 0; i < 2; i++) {
          this.world.spawnChild(husk.variant, husk.x + (i === 0 ? -24 : 24), husk.y, room, {
            hpFrac: 0.35, alpha: 0.55, noReward: true,
          });
        }
        this.world.showFloatingText(husk.x, husk.y - 30, '🦇 ...echo... echo...', '#ccccff');
        break;
      }
      case 'soul': {
        if (!st.risen && !husk.noRewardKill) {
          const ghost = this.world.spawnChild(husk.variant, husk.x, husk.y, room, {
            hpFrac: 0.4, alpha: 0.5, noReward: true,
          });
          if (ghost) {
            const gst = this.states.get(ghost);
            if (gst) gst.risen = true;
            this.world.showFloatingText(husk.x, husk.y - 34, '👻 IT RISES AGAIN', '#ccaaff');
          }
        }
        break;
      }
      default: break;
    }
  }

  /** Forget a husk that left the field (death cleanup path). */
  unregister(husk: Husk): void {
    this.states.delete(husk);
  }

  // ── Per-frame ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const g = this.g;
    const current = this.world.currentRoom();
    g?.clear();

    // Expire haste/rage buffs — they can sit on ANY husk (basic ones too,
    // courtesy of Time/Passion/Conquest husks), so sweep the whole field.
    for (const h of this.world.livingHusks()) {
      if (h.effectHasteUntil > 0 && time >= h.effectHasteUntil) { h.effectSpeedMult = 1; h.effectHasteUntil = 0; }
      if (h.effectRageUntil > 0 && time >= h.effectRageUntil) { h.effectDamageMult = 1; h.effectRageUntil = 0; }
    }

    // Zones: tick damage/slow, draw the ones in view, expire the dead.
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (time >= z.until) { this.zones.splice(i, 1); continue; }
      const inView = z.room === current;
      if (inView && g) {
        const fade = Math.min(1, (z.until - time) / 600);
        g.fillStyle(z.color, 0.22 * fade);
        g.fillCircle(z.x, z.y, z.r);
        g.lineStyle(1, z.color, 0.5 * fade);
        g.strokeCircle(z.x, z.y, z.r * (0.75 + Math.sin(time / 300 + z.x) * 0.08));
      }
      if (time >= z.nextTickAt) {
        z.nextTickAt = time + ZONE_TICK_MS;
        for (const t of this.world.targetsInRoom(z.room)) {
          if (Phaser.Math.Distance.Between(z.x, z.y, t.x, t.y) > z.r + 14) continue;
          if (z.tickDamage > 0) this.world.damageTarget(t, z.tickDamage);
        }
      }
      if (z.slowMult < 1) {
        for (const t of this.world.targetsInRoom(z.room)) {
          if (Phaser.Math.Distance.Between(z.x, z.y, t.x, t.y) <= z.r + 14) {
            this.world.slowPlayer(z.slowMult, 150);
          }
        }
      }
    }

    // Player DOTs.
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const dot = this.dots[i];
      if (time >= dot.until || !dot.target.active || dot.target.hp <= 0) {
        this.dots.splice(i, 1);
        continue;
      }
      if (time >= dot.nextTickAt) {
        dot.nextTickAt = time + DOT_TICK_MS;
        this.world.damageTarget(dot.target, Math.round(dot.dps));
        this.world.showFloatingText(dot.target.x + 18, dot.target.y - 24, dot.emoji, dot.color);
      }
    }

    // Per-husk elemental behaviour.
    for (const [husk, st] of [...this.states]) {
      if (!husk.active || husk.hp <= 0) { this.states.delete(husk); continue; }
      this.updateHusk(husk, st, time, delta, current, g);
    }
  }

  private updateHusk(
    husk: Husk,
    st: EState,
    time: number,
    delta: number,
    currentRoom: number,
    g: Phaser.GameObjects.Graphics | null,
  ): void {
    const room = this.world.roomOf(husk);
    const inView = room === currentRoom;
    const p = st.power;
    const targets = this.world.targetsInRoom(room);
    const nearest = this.nearestTarget(husk, targets);

    // Rubber's post-bite fling overrides this frame's walk.
    if (time < st.bounceUntil) {
      (husk.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(st.bounceVx, st.bounceVy);
    }

    switch (st.elementId) {
      case 'water':
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 1000;
          this.addZone(husk.x, husk.y + 8, 26 + p * 4, 0x3399ff, room, time + 3200, { tickDamage: Math.round(1 + p * 0.8) });
        }
        break;
      case 'oil':
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 1100;
          this.addZone(husk.x, husk.y + 8, 28 + p * 4, 0x33260f, room, time + 4200, { slowMult: Math.max(0.5, 0.75 - p * 0.04) });
        }
        break;
      case 'magma':
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 1200;
          this.addZone(husk.x, husk.y + 8, 26 + p * 5, 0xff5a1e, room, time + 3800, { tickDamage: Math.round(2 + p * 1.4) });
        }
        break;
      case 'gum':
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 1000;
          this.addZone(husk.x, husk.y + 8, 30 + p * 5, 0x46b93f, room, time + 4600, { slowMult: Math.max(0.4, 0.65 - p * 0.05) });
        }
        break;
      case 'radiation': {
        const r = 78 + p * 10;
        if (inView && g) {
          g.lineStyle(2, 0x7cff3d, 0.25 + Math.sin(time / 200) * 0.12);
          g.strokeCircle(husk.x, husk.y, r);
        }
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 1000;
          for (const t of targets) {
            if (Phaser.Math.Distance.Between(husk.x, husk.y, t.x, t.y) > r) continue;
            this.world.damageTarget(t, Math.round(1 + p));
            this.world.showFloatingText(t.x + 16, t.y - 22, '☢️', '#7cff3d');
          }
        }
        break;
      }
      case 'gravity':
      case 'magnet': {
        const count = st.elementId === 'magnet' ? 3 : 2;
        const radius = st.elementId === 'magnet' ? 58 + p * 6 : 48 + p * 5;
        const orbR = 7 + p * 1.5;
        st.orbitAngle += delta / 1000 * 2.4;
        for (let i = 0; i < count; i++) {
          const a = st.orbitAngle + (i / count) * Math.PI * 2;
          const ox = husk.x + Math.cos(a) * radius;
          const oy = husk.y + Math.sin(a) * radius;
          if (inView && g) {
            const c = st.elementId === 'magnet' ? 0xcc2244 : 0x8844cc;
            g.fillStyle(c, 0.85);
            g.fillCircle(ox, oy, orbR);
            g.lineStyle(1, 0xffffff, 0.35);
            g.strokeCircle(ox, oy, orbR + 2);
          }
          for (const t of targets) {
            if (Phaser.Math.Distance.Between(ox, oy, t.x, t.y) > orbR + 20) continue;
            const cd = st.contactCooldown.get(t) ?? 0;
            if (time < cd) continue;
            st.contactCooldown.set(t, time + 700);
            this.world.damageTarget(t, Math.round(3 + p * 2));
          }
        }
        break;
      }
      case 'sand': // Time husk
        if (time >= st.nextActionAt && targets.length > 0) {
          st.nextActionAt = time + 7000;
          for (const other of this.world.livingHusks()) {
            if (this.world.roomOf(other) !== room) continue;
            other.effectHasteUntil = time + 2500;
            other.effectSpeedMult = 1.25 + p * 0.08;
          }
          if (inView) this.world.showFloatingText(husk.x, husk.y - 34, '⏳ TIME QUICKENS', '#ffdd44');
        }
        break;
      case 'shadow':
        if (time >= st.nextActionAt && nearest
          && Phaser.Math.Distance.Between(husk.x, husk.y, nearest.x, nearest.y) > 180) {
          st.nextActionAt = time + 4500;
          this.blink(husk, nearest.x, nearest.y, 130 + p * 20, inView, 0x552277);
        }
        break;
      case 'magic':
        if (time >= st.nextActionAt && nearest
          && Phaser.Math.Distance.Between(husk.x, husk.y, nearest.x, nearest.y) < 140) {
          st.nextActionAt = time + 5000;
          const ang = Math.atan2(husk.y - nearest.y, husk.x - nearest.x) + (Math.random() - 0.5);
          this.blinkTo(husk, husk.x + Math.cos(ang) * 130, husk.y + Math.sin(ang) * 130, inView, 0x9944ff);
        }
        break;
      case 'dune':
        if (st.burrowPhase === 'idle' && time >= st.nextActionAt && nearest) {
          st.burrowPhase = 'under';
          st.nextActionAt = time + 900;
          husk.setAlpha(0.25);
          if (inView) this.world.showFloatingText(husk.x, husk.y - 26, '🏜️', '#e8c87a');
        } else if (st.burrowPhase === 'under' && time >= st.nextActionAt) {
          st.burrowPhase = 'idle';
          st.nextActionAt = time + 5200;
          husk.setAlpha(1);
          if (nearest) {
            const ang = Math.random() * Math.PI * 2;
            this.blinkTo(husk, nearest.x + Math.cos(ang) * 90, nearest.y + Math.sin(ang) * 90, inView, 0xe8c87a);
            this.addZone(husk.x, husk.y, 40 + p * 5, 0xe8c87a, room, time + 3000, { slowMult: 0.65 });
          }
        }
        break;
      case 'silence':
        husk.setAlpha(nearest && Phaser.Math.Distance.Between(husk.x, husk.y, nearest.x, nearest.y) < 200 ? 1 : 0.18);
        break;
      case 'subterfuge':
        if (!st.revealed && nearest
          && Phaser.Math.Distance.Between(husk.x, husk.y, nearest.x, nearest.y) < 170) {
          st.revealed = true;
          husk.setTexture(huskTextureKey(husk.variant));
          husk.effectSpeedMult = 1.5;
          husk.effectHasteUntil = Number.MAX_SAFE_INTEGER;
          if (inView) this.world.showFloatingText(husk.x, husk.y - 34, '🕴️ AN IMPOSTOR!', '#ff6677');
        }
        break;
      case 'conquest':
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 3000;
          for (const other of this.world.livingHusks()) {
            if (other === husk || this.world.roomOf(other) !== room) continue;
            if (Phaser.Math.Distance.Between(husk.x, husk.y, other.x, other.y) > 140) continue;
            other.effectDamageMult = 1.25 + p * 0.05;
            other.effectRageUntil = time + 3500;
          }
        }
        if (inView && g) {
          g.lineStyle(2, 0xc23a2e, 0.3);
          g.strokeCircle(husk.x, husk.y, 140);
        }
        break;
      case 'passion':
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 6000;
          const pool = this.world.livingHusks()
            .filter((o) => o !== husk && this.world.roomOf(o) === room);
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          if (chosen) {
            chosen.effectSpeedMult = 1.4;
            chosen.effectHasteUntil = time + 4000;
            chosen.effectDamageMult = 1.35;
            chosen.effectRageUntil = time + 4000;
            if (inView) this.world.showFloatingText(chosen.x, chosen.y - 32, '💘 ENTHRALLED', '#ff8ab0');
          }
        }
        break;
      case 'creation':
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 5000;
          let best: Husk | null = null;
          let bestDist = Infinity;
          for (const other of this.world.livingHusks()) {
            if (other === husk || other.shieldHp > 0 || this.world.roomOf(other) !== room) continue;
            const d = Phaser.Math.Distance.Between(husk.x, husk.y, other.x, other.y);
            if (d < bestDist) { bestDist = d; best = other; }
          }
          if (best && bestDist < 220) {
            best.shieldHp = Math.round(6 + p * 5);
            if (inView) this.world.showFloatingText(best.x, best.y - 30, '⚒️ FORGED', '#ffbb66');
          }
        }
        break;
      case 'ruin':
        if (time >= st.nextActionAt) {
          st.nextActionAt = time + 1000;
          if (st.armorTicks < 16) {
            st.armorTicks++;
            husk.incomingDamageMultiplier = Math.max(0.5, 1 - st.armorTicks * 0.03);
          }
        }
        break;
      case 'bind':
        if (time >= st.nextActionAt && nearest
          && Phaser.Math.Distance.Between(husk.x, husk.y, nearest.x, nearest.y) < 240) {
          st.nextActionAt = time + 4000;
          this.world.slowPlayer(Math.max(0.45, 0.65 - p * 0.04), 1200);
          if (inView) this.world.showFloatingText(nearest.x, nearest.y - 30, '⛓️ SHACKLED', '#e0b743');
          st.buffUntil = time + 500; // chain draws for half a second
        }
        if (inView && g && time < st.buffUntil && nearest) {
          g.lineStyle(2, 0xe0b743, 0.8);
          const seg = 7;
          for (let i = 0; i < seg; i++) {
            const t0 = i / seg, t1 = (i + 0.6) / seg;
            g.lineBetween(
              husk.x + (nearest.x - husk.x) * t0, husk.y + (nearest.y - husk.y) * t0,
              husk.x + (nearest.x - husk.x) * t1, husk.y + (nearest.y - husk.y) * t1,
            );
          }
        }
        break;
      case 'fortune':
        // Slips away from harm; the payout comes when you finally pin it down.
        if (husk.rawDamageTaken > st.armorTicks && time >= st.nextActionAt) {
          st.armorTicks = husk.rawDamageTaken;
          if (Math.random() < 0.35) {
            st.nextActionAt = time + 1200;
            const ang = Math.random() * Math.PI * 2;
            this.blinkTo(husk, husk.x + Math.cos(ang) * 140, husk.y + Math.sin(ang) * 140, inView, 0xd8a531);
          }
        }
        break;
      default: break;
    }
  }

  // ── Primitives ────────────────────────────────────────────────────

  private nearestTarget(husk: Husk, targets: Fighter[]): Fighter | null {
    let best: Fighter | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      if (!t.active || t.hp <= 0 || t.downed) continue;
      const d = Phaser.Math.Distance.Between(husk.x, husk.y, t.x, t.y);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    return best;
  }

  private applyDot(target: Fighter, kind: string, dps: number, ms: number, emoji: string, color: string): void {
    const now = this.world.scene.time.now;
    const existing = this.dots.find((d) => d.kind === kind && d.target === target);
    if (existing) {
      existing.dps = Math.max(existing.dps, dps);
      existing.until = Math.max(existing.until, now + ms);
      return;
    }
    this.dots.push({ target, kind, dps, until: now + ms, nextTickAt: now + DOT_TICK_MS, emoji, color });
  }

  private addZone(
    x: number, y: number, r: number, color: number, room: number, until: number,
    opts: { tickDamage?: number; slowMult?: number },
  ): void {
    if (this.zones.length >= MAX_ZONES) this.zones.shift();
    this.zones.push({
      x, y, r, color, room, until,
      tickDamage: opts.tickDamage ?? 0,
      slowMult: opts.slowMult ?? 1,
      nextTickAt: this.world.scene.time.now + ZONE_TICK_MS,
    });
    this.world.mirrorZone(x, y, r, color, until - this.world.scene.time.now, room);
  }

  /** A one-shot damage ring (crystal/plasma death novas). */
  private nova(x: number, y: number, r: number, color: number, room: number, damage: number): void {
    for (const t of this.world.targetsInRoom(room)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) <= r) this.world.damageTarget(t, damage);
    }
    if (room === this.world.currentRoom()) {
      const scene = this.world.scene;
      const ring = scene.add.circle(x, y, r, color, 0.4).setDepth(6).setScale(0.25);
      scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const shard = scene.add.triangle(x, y, 0, -6, 4, 4, -4, 4, color, 0.9).setDepth(6).setRotation(a);
        scene.tweens.add({
          targets: shard, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0,
          duration: 320, onComplete: () => shard.destroy(),
        });
      }
    }
    this.world.mirrorZone(x, y, r, color, 300, room);
  }

  private blink(husk: Husk, tx: number, ty: number, step: number, inView: boolean, color: number): void {
    const ang = Math.atan2(ty - husk.y, tx - husk.x);
    this.blinkTo(husk, husk.x + Math.cos(ang) * step, husk.y + Math.sin(ang) * step, inView, color);
  }

  private blinkTo(husk: Husk, x: number, y: number, inView: boolean, color: number): void {
    const scene = this.world.scene;
    const wb = (scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics }).physics.world.bounds;
    const nx = Phaser.Math.Clamp(x, wb.x + 40, wb.right - 40);
    const ny = Phaser.Math.Clamp(y, wb.y + 40, wb.bottom - 40);
    if (inView) {
      const from = scene.add.circle(husk.x, husk.y, 16, color, 0.5).setDepth(5);
      scene.tweens.add({ targets: from, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 260, onComplete: () => from.destroy() });
    }
    (husk.body as Phaser.Physics.Arcade.Body | null)?.reset(nx, ny);
    if (inView) {
      const to = scene.add.circle(nx, ny, 16, color, 0.5).setDepth(5).setScale(0.3);
      scene.tweens.add({ targets: to, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 260, onComplete: () => to.destroy() });
    }
  }

  private spawnDecoys(husk: Husk): void {
    const room = this.world.roomOf(husk);
    for (let i = 0; i < 2; i++) {
      const decoy = this.world.spawnChild(
        DECOY_HUSK,
        husk.x + (i === 0 ? -30 : 30),
        husk.y + 14,
        room,
        { noReward: true },
      );
      // The lie only works if the decoy wears the plain husk's face.
      decoy?.setTexture(huskTextureKey(BASIC_HUSK));
    }
  }
}
