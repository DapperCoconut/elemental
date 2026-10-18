import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { MUTATIONS, MutationDef } from '../../data/Mutations';
import * as PlayerData from '../../data/PlayerData';
import { Husk } from '../Husk';

/**
 * Mutations, City-style. In a duel a mutation is a curse on your one enemy; in
 * the City it is something *you* catch and carry for the rest of the run. Each
 * one is read as a handful of player primitives that keep its spirit — Titanic
 * makes you huge, tanky and slow, Molten burns the street behind you, Parasitic
 * feeds you off every hit, Chaos makes you pulse. Most are a trade, not a gift.
 * Taking the same mutation twice stars it: every number on it grows by 75%.
 *
 * Each human carries their own (co-op guests run their own copy against their
 * husk replicas — damage they deal there is relayed like any other hit).
 */

/** Never drafted: built around a single duel, or ruinous on the player in a horde. */
const EXCLUDED = new Set(['clot', 'honor', 'golf']);

interface PlayerMutation {
  /** What it does to you, for the card and the pop-up. */
  desc: string;
  /** Max-HP fraction. */
  hp?: number;
  /** Walk speed fraction. */
  speed?: number;
  /** Damage you deal to husks, fraction. */
  dmg?: number;
  /** Body size fraction. */
  size?: number;
  /** HP per second. */
  regen?: number;
  /** Fraction of the damage you deal healed back. */
  lifesteal?: number;
  /** Husks you finish off burst, hurting the husks around them. */
  explode?: boolean;
  /** A burning trail behind you that hurts husks (colour). */
  trail?: number;
  /** Your hits slow husks (multiplier, 1 = none). */
  slowOnHit?: number;
  /** Below a third of your health you hit harder and move faster. */
  enrage?: boolean;
  /** Every 3 s you blow up, hurting husks around you (and yourself a little). */
  pulse?: boolean;
  /** A husk that hurts you takes this fraction of it back. */
  thorns?: number;
  /** Colour for the pop-up and the trail/pulse art. */
  tint: number;
}

const PLAYER_MUTATIONS: Record<string, PlayerMutation> = {
  molten:     { desc: '+50% damage, and you burn the street behind you.', dmg: 0.5, trail: 0xff5a1e, tint: 0xff8844 },
  blustery:   { desc: '+30% speed, but 10% less health.', speed: 0.3, hp: -0.1, tint: 0xeaf6ff },
  titanic:    { desc: 'Half again your size, double health, 35% slower.', size: 0.5, hp: 1.0, speed: -0.35, tint: 0xa89c88 },
  parasitic:  { desc: 'Regenerate 2 HP/s and heal 10% of the damage you deal.', regen: 2, lifesteal: 0.1, tint: 0xaa55cc },
  chaos:      { desc: 'Smaller, +30% damage, and you explode every 3 seconds.', size: -0.3, dmg: 0.3, pulse: true, tint: 0xff3355 },
  order:      { desc: '+25% damage, 10% slower.', dmg: 0.25, speed: -0.1, tint: 0xf4f1e6 },
  abyss:      { desc: '+40% max health.', hp: 0.4, tint: 0x6a4a8a },
  tinker:     { desc: 'Regenerate 1 HP/s, +15% max health.', regen: 1, hp: 0.15, tint: 0xccaa44 },
  phantom:    { desc: '+20% speed and +20% damage.', speed: 0.2, dmg: 0.2, tint: 0x9988cc },
  pain:       { desc: 'Below a third of your health you hit 50% harder and move 30% faster.', enrage: true, tint: 0xcc2233 },
  encroach:   { desc: 'Your hits slow husks by 30%.', slowOnHit: 0.7, tint: 0x887766 },
  nuclear:    { desc: 'Husks you kill burst and hurt the husks around them. +15% max health.', explode: true, hp: 0.15, tint: 0x7cff3d },
  amber:      { desc: '+50% max health.', hp: 0.5, tint: 0xffaa22 },
  wither:     { desc: 'Heal 15% of the damage you deal, +15% damage.', lifesteal: 0.15, dmg: 0.15, tint: 0x8a74a6 },
  doppel:     { desc: '+15% speed and +15% max health.', speed: 0.15, hp: 0.15, tint: 0xccccff },
  frostbite:  { desc: 'Your hits slow husks by 40%.', slowOnHit: 0.6, tint: 0x88ccff },
  feast:      { desc: 'Bigger, +30% max health, regenerate 1 HP/s.', size: 0.2, hp: 0.3, regen: 1, tint: 0xcc6644 },
  bramble:    { desc: 'Husks that hurt you take 40% of it back. +30% max health.', thorns: 0.4, hp: 0.3, tint: 0x7c8f4a },
  maelstrom:  { desc: '+20% speed.', speed: 0.2, tint: 0x4466cc },
  inversion:  { desc: '+10% speed and +10% damage.', speed: 0.1, dmg: 0.1, tint: 0xee88ff },
  contagion:  { desc: 'You leave a poisoned trail that hurts husks.', trail: 0x66cc44, tint: 0x88cc44 },
  duel:       { desc: '+60% damage and +20% speed, but 25% less health.', dmg: 0.6, speed: 0.2, hp: -0.25, tint: 0xffcc44 },
  hydra:      { desc: '+60% max health, regenerate 1.5 HP/s.', hp: 0.6, regen: 1.5, tint: 0x338855 },
  rewind:     { desc: 'Regenerate 3 HP/s.', regen: 3, tint: 0xffdd77 },
  quicksand:  { desc: 'Your hits slow husks by 35%. +10% max health.', slowOnHit: 0.65, hp: 0.1, tint: 0xe8c87a },
  overload:   { desc: '+30% speed, but 15% less health.', speed: 0.3, hp: -0.15, tint: 0x44ccff },
  fragile:    { desc: '+75% damage, but 40% less health.', dmg: 0.75, hp: -0.4, tint: 0xffeeee },
  swarm:      { desc: 'Smaller and 35% faster.', speed: 0.35, size: -0.15, tint: 0xffcc22 },
  tempest:    { desc: '+15% speed and +15% damage.', speed: 0.15, dmg: 0.15, tint: 0xddddff },
  bulwark:    { desc: '+70% max health, 15% slower.', hp: 0.7, speed: -0.15, tint: 0x8899aa },
  vault:      { desc: '+25% max health and +10% damage.', hp: 0.25, dmg: 0.1, tint: 0xd8a531 },
  roulette:   { desc: '+20% health, +20% damage, +10% speed.', hp: 0.2, dmg: 0.2, speed: 0.1, tint: 0xff66aa },
};

const FALLBACK: PlayerMutation = { desc: '+20% max health and +15% damage.', hp: 0.2, dmg: 0.15, tint: 0xcc8888 };

/** A second take multiplies every number on the mutation by this. */
const STAR_SCALE = 1.75;

const TRAIL_DROP_MS = 300;
const TRAIL_LIFE_MS = 2600;
const TRAIL_RADIUS = 34;
const TRAIL_TICK_MS = 400;
const TRAIL_TICK_DMG = 6;
const PULSE_EVERY_MS = 3000;
const PULSE_RADIUS = 115;
const PULSE_DMG = 24;
const PULSE_SELF_DMG = 5;
const BURST_RADIUS = 85;
const BURST_DMG = 28;
const THORN_REACH = 80;

/** Every mutation the player could be offered: unlocked in normal play, not one of the excluded ones. */
export function draftableMutations(): MutationDef[] {
  return MUTATIONS.filter((m) => !m.bossOnly && !EXCLUDED.has(m.id)
    && (m.unlockedByDefault || PlayerData.isMutationUnlocked(m.id)));
}

/** The card text for a mutation, as the player carries it. */
export function playerMutationDesc(id: string): string {
  return (PLAYER_MUTATIONS[id] ?? FALLBACK).desc;
}

/** What the mutations need from whichever side owns the local player. */
export interface CityMutationWorld {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  /** The room the local player stands in. */
  currentRoom(): number;
  /** Husks the local sim can hit (real ones on the host, replicas on a guest). */
  livingHusks(): Husk[];
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** True where husks are real — only there can a slow stick to one. */
  readonly authoritative: boolean;
}

interface Patch { x: number; y: number; room: number; bornAt: number; nextTickAt: number; color: number }
interface Ring { x: number; y: number; room: number; r: number; t: number; color: number }

export class CityMutations {
  /** Drafted mutation id → starred. */
  private taken = new Map<string, boolean>();
  private hpApplied = 0;
  private sizeApplied = 1;
  private baseMaxHp = 0;
  private patches: Patch[] = [];
  private rings: Ring[] = [];
  private bursts: Array<{ x: number; y: number }> = [];
  private lastDropAt = 0;
  private lastDropX = 0;
  private lastDropY = 0;
  private nextPulseAt = 0;
  private lastHp = -1;
  private g: Phaser.GameObjects.Graphics | null = null;

  constructor(private world: CityMutationWorld) {}

  reset(): void {
    this.taken.clear();
    this.hpApplied = 0;
    this.sizeApplied = 1;
    this.baseMaxHp = 0;
    this.patches = [];
    this.rings = [];
    this.bursts = [];
    this.lastHp = -1;
    this.nextPulseAt = 0;
    this.g?.destroy();
    this.g = null;
  }

  destroy(): void {
    this.g?.destroy();
    this.g = null;
  }

  has(id: string): boolean { return this.taken.has(id); }
  isStarred(id: string): boolean { return this.taken.get(id) === true; }
  get active(): Array<{ id: string; starred: boolean }> {
    return [...this.taken.entries()].map(([id, starred]) => ({ id, starred }));
  }

  /** Take a mutation; a second take stars it. Returns true when this take was the star. */
  take(id: string): boolean {
    const starred = this.taken.has(id);
    this.taken.set(id, starred);
    this.applyStats();
    const p = this.world.player;
    this.rings.push({ x: p.x, y: p.y, room: this.world.currentRoom(), r: 70, t: 0, color: this.of(id).tint });
    return starred;
  }

  private of(id: string): PlayerMutation {
    return PLAYER_MUTATIONS[id] ?? FALLBACK;
  }

  private scaled(id: string, v: number | undefined): number {
    if (!v) return 0;
    return v * (this.taken.get(id) ? STAR_SCALE : 1);
  }

  private product(field: 'hp' | 'speed' | 'dmg' | 'size', floor: number): number {
    let m = 1;
    for (const id of this.taken.keys()) m *= Math.max(floor, 1 + this.scaled(id, this.of(id)[field]));
    return m;
  }

  private sum(field: 'regen' | 'lifesteal' | 'thorns'): number {
    let s = 0;
    for (const id of this.taken.keys()) s += this.scaled(id, this.of(id)[field]);
    return s;
  }

  private any(field: 'explode' | 'enrage' | 'pulse'): boolean {
    for (const id of this.taken.keys()) if (this.of(id)[field]) return true;
    return false;
  }

  /** Health and size are set once per take, as deltas, so Vigor boons and the rest survive. */
  private applyStats(): void {
    const p = this.world.player;
    if (this.baseMaxHp <= 0) this.baseMaxHp = p.maxHp;
    const wantHp = Math.round(this.baseMaxHp * (this.product('hp', 0.3) - 1));
    const dHp = wantHp - this.hpApplied;
    this.hpApplied = wantHp;
    if (dHp > 0) { p.increaseMaxHp(dHp); p.heal(dHp); }
    else if (dHp < 0) p.reduceMaxHp(-dHp);

    const wantSize = this.product('size', 0.5);
    if (wantSize !== this.sizeApplied) {
      p.sizeMult *= wantSize / this.sizeApplied;
      this.sizeApplied = wantSize;
      p.applySizeMult();
    }
  }

  private enraged(): boolean {
    const p = this.world.player;
    return this.any('enrage') && p.hp > 0 && p.hp < p.maxHp / 3;
  }

  /** Walk speed, pulled by the arena's movement each frame. */
  speedMult(): number {
    if (this.taken.size === 0) return 1;
    return this.product('speed', 0.4) * (this.enraged() ? (this.isStarred('pain') ? 1.5 : 1.3) : 1);
  }

  /** Damage the local player deals to husks. */
  damageMult(): number {
    if (this.taken.size === 0) return 1;
    return this.product('dmg', 0.3) * (this.enraged() ? (this.isStarred('pain') ? 1.85 : 1.5) : 1);
  }

  /**
   * One of the local player's hits landed on `h` (post-mitigation `amount`). Bot
   * hits and relayed hits never arrive here — see `Husk.takeForeignDamage`.
   */
  onHuskHit(h: Husk, amount: number): void {
    if (this.taken.size === 0 || amount <= 0) return;
    const p = this.world.player;
    const steal = this.sum('lifesteal');
    if (steal > 0 && p.hp > 0 && !p.downed) p.heal(amount * steal);
    if (this.world.authoritative) {
      let slow = 1;
      for (const id of this.taken.keys()) {
        const s = this.of(id).slowOnHit;
        if (s !== undefined) slow = Math.min(slow, this.taken.get(id) ? s * 0.8 : s);
      }
      if (slow < 1 && h.active && h.effectHasteUntil !== Number.MAX_SAFE_INTEGER) {
        h.effectSpeedMult = Math.min(h.effectSpeedMult >= 1 ? 1 : h.effectSpeedMult, slow);
        h.effectHasteUntil = this.world.scene.time.now + 1500;
      }
    }
    // A killing blow (a replica's health only moves when the host says so).
    const dead = this.world.authoritative ? h.hp <= 0 : amount >= h.hp;
    if (dead && this.any('explode')) this.bursts.push({ x: h.x, y: h.y });
  }

  update(time: number, delta: number): void {
    if (this.taken.size === 0) return;
    const w = this.world;
    const p = w.player;
    const room = w.currentRoom();
    const husks = w.livingHusks();
    const dt = delta / 1000;
    const alive = p.active && p.hp > 0 && !p.downed;

    // Damage rides on the husks' own intake, so every kit's hit is covered without
    // touching a kit. Bots and relayed hits divide it back out.
    const dmg = this.damageMult();
    for (const h of husks) h.mutationIncomingMult = dmg;

    if (alive) {
      const regen = this.sum('regen');
      if (regen > 0 && p.hp < p.maxHp) p.heal(regen * dt);

      // Thorns: whatever you just lost, the closest husk pays part of.
      const thorns = this.sum('thorns');
      if (thorns > 0 && this.lastHp > p.hp) {
        const near = this.nearest(husks, p.x, p.y, room, THORN_REACH);
        if (near) near.takeDamage(Math.max(1, Math.round((this.lastHp - p.hp) * thorns)));
      }

      // Trails.
      let trail: number | null = null;
      for (const id of this.taken.keys()) { const t = this.of(id).trail; if (t !== undefined) trail = t; }
      if (trail !== null && time - this.lastDropAt >= TRAIL_DROP_MS
          && Phaser.Math.Distance.Between(p.x, p.y, this.lastDropX, this.lastDropY) > 20) {
        this.lastDropAt = time;
        this.lastDropX = p.x;
        this.lastDropY = p.y;
        this.patches.push({ x: p.x, y: p.y, room, bornAt: time, nextTickAt: time + TRAIL_TICK_MS, color: trail });
      }

      // Chaos: a heartbeat of an explosion.
      if (this.any('pulse')) {
        if (this.nextPulseAt === 0) this.nextPulseAt = time + PULSE_EVERY_MS;
        if (time >= this.nextPulseAt) {
          this.nextPulseAt = time + PULSE_EVERY_MS;
          const star = this.isStarred('chaos');
          const r = PULSE_RADIUS * (star ? 1.3 : 1);
          for (const h of husks) {
            if (h.roomIndex === room && Phaser.Math.Distance.Between(p.x, p.y, h.x, h.y) <= r) {
              h.takeDamage(Math.round(PULSE_DMG * (star ? 1.5 : 1)));
            }
          }
          if (p.hp > PULSE_SELF_DMG * 3) Fighter.asNonAllyDamage(() => p.takeDamage(PULSE_SELF_DMG, { selfInflicted: true }));
          this.rings.push({ x: p.x, y: p.y, room, r, t: 0, color: 0xff3355 });
          w.scene.cameras.main.shake(90, 0.003);
        }
      }
    }
    this.lastHp = p.hp;

    // Trail ticks.
    const trailStar = this.isStarred('molten') || this.isStarred('contagion');
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const pt = this.patches[i];
      if (time - pt.bornAt >= TRAIL_LIFE_MS * (trailStar ? 1.5 : 1)) { this.patches.splice(i, 1); continue; }
      if (time < pt.nextTickAt) continue;
      pt.nextTickAt = time + TRAIL_TICK_MS;
      const r = TRAIL_RADIUS * (trailStar ? 1.4 : 1);
      for (const h of husks) {
        if (h.roomIndex === pt.room && Phaser.Math.Distance.Between(pt.x, pt.y, h.x, h.y) <= r) h.takeDamage(TRAIL_TICK_DMG);
      }
    }

    // Death bursts, queued so one burst finishing a husk can chain into the next frame.
    if (this.bursts.length > 0) {
      const star = this.isStarred('nuclear');
      const queue = this.bursts;
      this.bursts = [];
      for (const b of queue) {
        for (const h of husks) {
          if (h.hp > 0 && h.roomIndex === room && Phaser.Math.Distance.Between(b.x, b.y, h.x, h.y) <= BURST_RADIUS * (star ? 1.3 : 1)) {
            h.takeDamage(Math.round(BURST_DMG * (star ? 1.5 : 1)));
          }
        }
        this.rings.push({ x: b.x, y: b.y, room, r: BURST_RADIUS, t: 0, color: 0x7cff3d });
      }
    }

    this.paint(time, delta, room);
  }

  private nearest(husks: Husk[], x: number, y: number, room: number, reach: number): Husk | null {
    let best: Husk | null = null;
    let bd = reach;
    for (const h of husks) {
      if (h.roomIndex !== room || h.possessing) continue;
      const d = Phaser.Math.Distance.Between(x, y, h.x, h.y);
      if (d <= bd) { bd = d; best = h; }
    }
    return best;
  }

  private paint(time: number, delta: number, room: number): void {
    if (!this.g) this.g = this.world.scene.add.graphics().setDepth(3);
    const g = this.g;
    g.clear();
    const trailStar = this.isStarred('molten') || this.isStarred('contagion');
    const life = TRAIL_LIFE_MS * (trailStar ? 1.5 : 1);
    const r0 = TRAIL_RADIUS * (trailStar ? 1.4 : 1);
    for (const pt of this.patches) {
      if (pt.room !== room) continue;
      const k = (time - pt.bornAt) / life;
      const fade = 1 - k;
      const flick = 0.85 + 0.15 * Math.sin(time / 90 + pt.x);
      g.fillStyle(pt.color, 0.22 * fade);
      g.fillCircle(pt.x, pt.y, r0 * flick);
      g.fillStyle(pt.color, 0.45 * fade);
      g.fillCircle(pt.x, pt.y, r0 * 0.62 * flick);
      g.fillStyle(0xffffff, 0.25 * fade);
      g.fillCircle(pt.x + Math.sin(time / 120 + pt.y) * 6, pt.y, r0 * 0.2);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      rg.t += delta;
      if (rg.t >= 380) { this.rings.splice(i, 1); continue; }
      if (rg.room !== room) continue;
      const k = rg.t / 380;
      g.lineStyle(4 * (1 - k) + 1, rg.color, 0.9 * (1 - k));
      g.strokeCircle(rg.x, rg.y, rg.r * (0.35 + 0.65 * k));
      g.fillStyle(rg.color, 0.18 * (1 - k));
      g.fillCircle(rg.x, rg.y, rg.r * (0.35 + 0.65 * k));
    }
  }
}
