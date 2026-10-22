import Phaser from 'phaser';
import { Projectile } from '../combat/Projectile';
import { Sfx } from '../audio';
import { mix } from '../ui';
import {
  DamageType, MinionLook, Rider, SentryLook, TowerAbilityDef, TowerSlot, TrapLook, ZoneShape, damageTypeOf,
} from './StrongholdTypes';
import { Tower } from './Tower';
import { RoadHusk } from './RoadHusk';
import { HuskRoadTraits } from './HuskRoadTraits';
import { nearestRoad, track } from './StrongholdMap';

/** What the combat engine needs from the scene. */
export interface TowerCombatApi {
  readonly scene: Phaser.Scene;
  husks(): RoadHusk[];
  towers(): Tower[];
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly traits: HuskRoadTraits;
  floatText(x: number, y: number, text: string, color: string, size?: number): void;
  addGold(amount: number, x: number, y: number): void;
  /** Take a husk off the road as if killed (conversions). Pays its bounty. */
  claimHusk(h: RoadHusk): void;
}

/** A tower's shot. Carries everything the hit needs so the overlap handler stays dumb. */
export class TowerShot extends Projectile {
  tower!: Tower;
  rider?: Rider;
  dtype: DamageType = 'sharp';
  pierce = 0;
  readonly hit = new Set<RoadHusk>();
  startX = 0;
  startY = 0;
  maxDist = 600;
  homing: RoadHusk | null = null;
  speed = 500;
  splash = 0;
  splashMult = 0.5;
  color = 0xffffff;
  lob: { x: number; y: number } | null = null;
  returns = false;
  returning = false;
  bounces = 0;
  /** Fired by a sentry rather than the tower's own hands. */
  fromSentry = false;
}

interface Zone { x: number; y: number; radius: number; until: number; dps: number; color: number; rider?: Rider; shape: ZoneShape; accum: number; tower: Tower; born: number; pull: number; dtype: DamageType }
interface Beam { tower: Tower; target: RoadHusk; until: number; born: number; dps: number; color: number; width: number; rider?: Rider; accum: number; ramp: number }
interface Flash { kind: 'line' | 'ring' | 'poly'; pts: number[]; color: number; width: number; until: number; born: number; radius?: number }
interface Summon { x: number; y: number; until: number; attackMs: number; nextAt: number; range: number; damage: number; rider?: Rider; color: number; label: Phaser.GameObjects.Text; tower: Tower; born: number }
interface Barrier { track: number; pathDist: number; x: number; y: number; hp: number; maxHp: number; until: number; color: number; damage: number; label: Phaser.GameObjects.Text; tower: Tower }
interface Telegraph { x: number; y: number; radius: number; at: number; born: number; color: number; shape: string }
interface Trap { x: number; y: number; hits: number; until: number; born: number; damage: number; rider?: Rider; color: number; look: TrapLook; blast: number; tower: Tower; seed: number; dtype: DamageType }
interface Minion {
  track: number; pathDist: number; x: number; y: number; hits: number; maxHits: number; speed: number; until: number; born: number;
  damage: number; rider?: Rider; color: number; look: MinionLook; size: number; tower: Tower; struck: Set<RoadHusk>; lateral: number; phase: number;
}
interface Sentry { x: number; y: number; until: number; born: number; attackMs: number; nextAt: number; range: number; damage: number; rider?: Rider; color: number; look: SentryLook; tower: Tower; facing: number }
interface Fence { track: number; pathDist: number; x: number; y: number; nx: number; ny: number; until: number; born: number; damage: number; rider?: Rider; color: number; width: number; tower: Tower; struck: Set<RoadHusk> }

const STATUS_TEXT_GAP_MS = 1800;
const MAX_TRAPS = 70;
const MAX_MINIONS = 30;

/** Something a cast can be aimed at: a husk, or a bare point (a mortar's reticle). */
type Aim = { x: number; y: number };

/**
 * Turns a resolved tower ability into things on the field: projectiles, instant hits, zones,
 * beams, traps, minions, sentries, barriers, fences and rallies. Also ticks every lingering
 * object and paints them, so the scene only has to call `update` and `draw`.
 */
export class TowerCombat {
  private zones: Zone[] = [];
  private beams: Beam[] = [];
  private flashes: Flash[] = [];
  private summons: Summon[] = [];
  private barriers: Barrier[] = [];
  private telegraphs: Telegraph[] = [];
  private traps: Trap[] = [];
  private minions: Minion[] = [];
  private sentries: Sentry[] = [];
  private fences: Fence[] = [];
  private pending: Array<{ at: number; fn: () => void }> = [];
  private gfx: Phaser.GameObjects.Graphics;
  private groundGfx: Phaser.GameObjects.Graphics;
  private auraGfx: Phaser.GameObjects.Graphics;
  private nextLinkId = 1;

  constructor(private api: TowerCombatApi) {
    this.gfx = api.scene.add.graphics().setDepth(7);
    this.groundGfx = api.scene.add.graphics().setDepth(1.7);
    this.auraGfx = api.scene.add.graphics().setDepth(1.8);
  }

  reset(): void {
    for (const s of this.summons) s.label.destroy();
    for (const b of this.barriers) b.label.destroy();
    this.zones = []; this.beams = []; this.flashes = []; this.summons = []; this.barriers = [];
    this.telegraphs = []; this.pending = []; this.traps = []; this.minions = []; this.sentries = []; this.fences = [];
    this.gfx.clear(); this.auraGfx.clear(); this.groundGfx.clear();
  }

  destroy(): void {
    this.reset();
    this.gfx.destroy();
    this.auraGfx.destroy();
    this.groundGfx.destroy();
  }

  /** Sentries a tower currently has standing — sold with it. */
  dropTower(t: Tower): void {
    this.sentries = this.sentries.filter((s) => s.tower !== t);
  }

  /** The barrier (if any) standing within `ahead` px in front of a husk. Airborne husks float over. */
  barrierAhead(h: RoadHusk, ahead = 26): Barrier | null {
    if (h.airborne) return null;
    if (h.trait?.id === 'rubber') {
      // Elastic husks spring clean over whatever is in front of them.
      for (const b of this.barriers) {
        if (b.track !== h.trackIndex) continue;
        const d = b.pathDist - h.pathDist;
        if (d > -6 && d <= ahead) { h.pathDist = b.pathDist + 12; h.place(); return null; }
      }
      return null;
    }
    for (const b of this.barriers) {
      if (b.track !== h.trackIndex) continue;
      const d = b.pathDist - h.pathDist;
      if (d > -6 && d <= ahead) return b;
    }
    return null;
  }

  /** A husk chewing on a barrier this frame. */
  chew(h: RoadHusk, b: Barrier, delta: number): void {
    const acid = h.trait?.id === 'slime' ? 3 : 1;
    b.hp -= (h.biteDamage * h.effectDamageMult * acid) * (delta / 950);
    if (b.damage > 0) this.hitHusk(h, b.damage * (delta / 1000), undefined, b.tower, false, false, 'sharp');
    if (b.hp <= 0) { this.removeBarrier(b); this.ring(b.x, b.y, 40, b.color, 300); }
  }

  // ── Casting ───────────────────────────────────────────────────────

  /**
   * Cast a resolved ability. `aim` overrides where ground effects land (a mortar's reticle).
   * Echo towers get their cast repeated by the scene through `castEcho`.
   */
  cast(tower: Tower, slot: TowerSlot | 'mastery', a: TowerAbilityDef, target: RoadHusk, time: number, aim?: Aim): void {
    const fx = a.fx;
    const at: Aim = aim ?? { x: target.x, y: target.y };
    tower.lookAt(at.x, at.y);
    tower.gesture(slot);
    const range = tower.range * (a.range ?? 1);
    const dtype = damageTypeOf(a);
    const reap = this.consumeReap(tower);
    const dmg = a.damage * reap;
    const ox = tower.x, oy = tower.y - (tower.flies ? 22 : 0);
    switch (fx.kind) {
      case 'bolt': {
        const count = fx.count ?? 1;
        const spread = fx.spread ?? 0;
        const lead = aim ?? this.leadPoint(target, fx.speed, ox, oy);
        const baseAng = Math.atan2(lead.y - oy, lead.x - ox);
        const volleys = fx.broadside ? [baseAng, baseAng + Math.PI] : [baseAng];
        for (const base of volleys) {
          for (let i = 0; i < count; i++) {
            const off = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
            const ang = base + off;
            const tex = fx.texture ?? (fx.look ? `sh-${fx.look}` : 'sh-orb');
            const shot = new TowerShot(this.api.scene, ox, oy, this.api.scene.textures.exists(tex) ? tex : 'sh-orb', dmg, true);
            shot.tower = tower; shot.rider = a.rider; shot.pierce = fx.pierce ?? 0; shot.speed = fx.speed;
            shot.splash = fx.splash ?? 0; shot.splashMult = fx.splashMult ?? 0.5; shot.color = fx.color;
            shot.dtype = dtype; shot.returns = !!fx.returns; shot.bounces = fx.bounces ?? 0;
            shot.maxDist = fx.returns ? range : range * 1.35 + 60;
            if (!fx.texture) shot.setTint(fx.color);
            shot.setScale(fx.size ?? 1);
            shot.setRotation(ang);
            shot.setDepth(tower.flies ? 8.4 : 6.8);
            this.api.projectiles.add(shot);
            if (fx.lob) {
              const land = this.spread(lead, off * 60);
              shot.setPosition(land.x, land.y - 230);
              shot.lob = land;
              shot.startX = land.x; shot.startY = land.y - 230; shot.maxDist = 260;
              shot.launch(0, fx.speed);
            } else {
              shot.startX = ox; shot.startY = oy;
              if (fx.homing) shot.homing = target;
              shot.launch(Math.cos(ang) * fx.speed, Math.sin(ang) * fx.speed);
            }
          }
        }
        Sfx.playAt('projectile-impact', tower.x, { volume: 0.22, rate: 1.4 });
        break;
      }
      case 'splash': {
        const go = (): void => {
          this.aoe(at.x, at.y, fx.radius, dmg, a.rider, tower, dtype);
          this.burst(at.x, at.y, fx.radius, fx.color, fx.shape ?? 'burst');
        };
        if (fx.delayMs && fx.delayMs > 0) {
          this.telegraphs.push({ x: at.x, y: at.y, radius: fx.radius, at: time + fx.delayMs, born: time, color: fx.color, shape: fx.shape ?? 'burst' });
          this.pending.push({ at: time + fx.delayMs, fn: go });
        } else go();
        break;
      }
      case 'line': {
        const ang = Math.atan2(at.y - oy, at.x - ox);
        const x2 = ox + Math.cos(ang) * fx.length, y2 = oy + Math.sin(ang) * fx.length;
        const link = a.rider?.link ? this.nextLinkId++ : 0;
        for (const h of this.api.husks()) {
          if (this.segDist(h.x, h.y, ox, oy, x2, y2) <= fx.width / 2 + 20 * h.sizeMult) {
            this.hitHusk(h, dmg, a.rider, tower, true, false, dtype, link);
          }
        }
        this.flashes.push({ kind: 'line', pts: [ox, oy, x2, y2], color: fx.color, width: fx.width, until: time + 260, born: time });
        Sfx.playAt('whoosh', tower.x, { volume: 0.45 });
        break;
      }
      case 'zone': {
        this.zones.push({ x: at.x, y: at.y, radius: fx.radius, until: time + fx.ms, dps: dmg, color: fx.color, rider: a.rider, shape: fx.shape ?? 'puddle', accum: 0, tower, born: time, pull: fx.pull ?? 0, dtype });
        break;
      }
      case 'aura': {
        const r = fx.radius * (a.range ?? 1);
        for (const h of this.api.husks()) {
          if (Math.hypot(h.x - tower.x, h.y - tower.y) <= r + 20 * h.sizeMult) {
            this.hitHusk(h, dmg * (a.cooldown / 1000), a.rider, tower, false, false, dtype);
          }
        }
        break;
      }
      case 'beam': {
        this.beams.push({ tower, target, until: time + fx.ms, born: time, dps: dmg, color: fx.color, width: fx.width, rider: a.rider, accum: 0, ramp: fx.ramp ?? 0 });
        Sfx.playAt('beam-fire', tower.x, { volume: 0.3 });
        break;
      }
      case 'chain': {
        const visited = new Set<RoadHusk>();
        let cur: RoadHusk | null = target;
        const pts: number[] = [ox, oy];
        let d = dmg;
        for (let i = 0; i <= fx.jumps && cur; i++) {
          visited.add(cur);
          pts.push(cur.x, cur.y);
          this.hitHusk(cur, d, a.rider, tower, true, false, dtype);
          d *= fx.falloff ?? 0.85;
          let next: RoadHusk | null = null, best = fx.jumpRange;
          for (const h of this.api.husks()) {
            if (visited.has(h) || h.untargetable) continue;
            const dd = Math.hypot(h.x - cur.x, h.y - cur.y);
            if (dd < best) { best = dd; next = h; }
          }
          cur = next;
        }
        this.flashes.push({ kind: 'poly', pts, color: fx.color, width: 3, until: time + 220, born: time });
        Sfx.playAt('zap', tower.x, { volume: 0.35 });
        break;
      }
      case 'nova': {
        this.aoe(tower.x, tower.y, fx.radius, dmg, a.rider, tower, dtype);
        this.burst(tower.x, tower.y, fx.radius, fx.color, 'ring');
        break;
      }
      case 'rally': {
        const self = fx.radius <= 1;
        for (const t of this.api.towers()) {
          if (!self && Math.hypot(t.x - tower.x, t.y - tower.y) > fx.radius) continue;
          if (self && t !== tower) continue;
          t.addBuff({ until: time + fx.ms, fireRateMult: fx.fireRateMult ?? 1, damageMult: fx.damageMult ?? 1, rangeMult: fx.rangeMult });
          this.flashes.push({ kind: 'ring', pts: [t.x, t.y], radius: 34, color: fx.color, width: 3, until: time + 600, born: time });
        }
        if (!self) this.flashes.push({ kind: 'ring', pts: [tower.x, tower.y], radius: fx.radius, color: fx.color, width: 2, until: time + 500, born: time });
        this.api.floatText(tower.x, tower.y - 44, self ? 'EMPOWERED' : 'RALLY', '#' + fx.color.toString(16).padStart(6, '0'), 11);
        Sfx.playAt('status-buff', tower.x, { volume: 0.45 });
        break;
      }
      case 'summon': {
        const road = nearestRoad(at.x, at.y);
        const tr = track(road.track);
        const p = tr.pointAlong(Math.min(tr.length - 30, road.along + 30));
        const label = this.api.scene.add.text(p.x, p.y - 2, fx.label, { fontSize: '22px' }).setOrigin(0.5).setDepth(6);
        this.summons.push({ x: p.x, y: p.y, until: time + fx.ms, attackMs: fx.attackMs, nextAt: time + 300, range: fx.attackRange, damage: dmg, rider: a.rider, color: fx.color, label, tower, born: time });
        this.ring(p.x, p.y, 30, fx.color, 400);
        break;
      }
      case 'barrier': {
        const tr = target.track;
        const pd = Math.min(tr.length - 40, Math.max(40, target.pathDist + 48));
        const p = tr.pointAlong(pd);
        const label = this.api.scene.add.text(p.x, p.y - 30, fx.label, { fontSize: '18px' }).setOrigin(0.5).setDepth(6.5);
        this.barriers.push({ track: target.trackIndex, pathDist: pd, x: p.x, y: p.y, hp: fx.hp, maxHp: fx.hp, until: time + fx.ms, color: fx.color, damage: dmg, label, tower });
        this.barriers.sort((x, y) => x.pathDist - y.pathDist);
        Sfx.playAt('shield-up', p.x, { volume: 0.5 });
        break;
      }
      case 'execute': {
        if (!target.variant.isBoss && target.hp <= target.maxHp * fx.thresholdFrac) {
          this.api.floatText(target.x, target.y - 34, 'EXECUTED', '#ffffff', 12);
          this.hitHusk(target, target.hp + target.shieldHp + 999, undefined, tower, true, true, dtype);
        } else {
          this.hitHusk(target, dmg, a.rider, tower, true, false, dtype);
        }
        this.flashes.push({ kind: 'line', pts: [ox, oy, target.x, target.y], color: fx.color, width: 3, until: time + 200, born: time });
        Sfx.playAt('judgement', tower.x, { volume: 0.45 });
        break;
      }
      case 'gold': {
        this.api.addGold(fx.amount, tower.x, tower.y - 40);
        this.flashes.push({ kind: 'ring', pts: [tower.x, tower.y], radius: 28, color: fx.color, width: 2, until: time + 400, born: time });
        break;
      }
      case 'trap': {
        const road = nearestRoad(at.x, at.y);
        const tr = track(road.track);
        for (let i = 0; i < fx.count; i++) {
          if (this.traps.length >= MAX_TRAPS) this.traps.shift();
          // Scatter them along the road ahead of the target, inside the tower's reach.
          let pd = road.along + 20 + Math.random() * 90;
          let p = tr.pointAlong(pd);
          for (let tries = 0; tries < 4 && Math.hypot(p.x - tower.x, p.y - tower.y) > range; tries++) {
            pd = road.along - 20 + Math.random() * 60; p = tr.pointAlong(pd);
          }
          const h = tr.headingAlong(pd);
          const lat = (Math.random() - 0.5) * 36;
          const x = p.x - h.y * lat, y = p.y + h.x * lat;
          // Toss arc: the trap lands after a beat.
          const land = time + 220 + i * 40;
          this.flashes.push({ kind: 'line', pts: [tower.x, tower.y, x, y], color: fx.color, width: 1, until: land, born: time });
          this.traps.push({ x, y, hits: fx.hits, until: land + fx.ms, born: land, damage: dmg, rider: a.rider, color: fx.color, look: fx.look, blast: fx.blast ?? 0, tower, seed: Math.random() * 10, dtype });
        }
        Sfx.playAt('ui-drag', tower.x, { volume: 0.4 });
        break;
      }
      case 'minion': {
        if (this.minions.length >= MAX_MINIONS) break;
        const road = nearestRoad(tower.padX, tower.padY);
        const tr = track(road.track);
        const pd = Math.min(tr.length - 10, road.along + 80);
        this.spawnMinion(road.track, pd, fx.hits, fx.speed, fx.ms, dmg, a.rider, fx.color, fx.look, fx.size ?? 1, tower, time);
        break;
      }
      case 'sentry': {
        const mine = this.sentries.filter((s) => s.tower === tower);
        if (mine.length >= fx.max) { mine[0].until = 0; }
        let x = tower.padX, y = tower.padY;
        for (let tries = 0; tries < 10; tries++) {
          const ang = Math.random() * Math.PI * 2, d = 34 + Math.random() * 26;
          x = tower.padX + Math.cos(ang) * d; y = tower.padY + Math.sin(ang) * d;
          if (nearestRoad(x, y).dist > 34) break;
        }
        this.sentries.push({ x, y, until: time + fx.ms, born: time, attackMs: fx.attackMs, nextAt: time + 400, range: fx.range, damage: dmg, rider: a.rider, color: fx.color, look: fx.look, tower, facing: 0 });
        this.ring(x, y, 22, fx.color, 360);
        Sfx.playAt('stone-rise', x, { volume: 0.35 });
        break;
      }
      case 'convert': {
        if (target.variant.isBoss || target.hp > target.maxHp * fx.thresholdFrac || target.trait?.id === 'decoy') {
          this.hitHusk(target, dmg, a.rider, tower, true, false, dtype);
          break;
        }
        const hits = 3 + (target.variant.tier ?? 0) * 2;
        const pd = target.pathDist;
        const tr = target.trackIndex;
        this.api.floatText(target.x, target.y - 40, 'CONVERTED', '#' + fx.color.toString(16).padStart(6, '0'), 12);
        this.ring(target.x, target.y, 30, fx.color, 500);
        tower.kills++;
        this.api.claimHusk(target);
        this.spawnMinion(tr, pd, hits, 70, 14000, Math.max(dmg, target.maxHp * 0.35), undefined, fx.color, fx.look, target.sizeMult, tower, time);
        Sfx.playAt('status-buff', tower.x, { volume: 0.5 });
        break;
      }
      case 'fence': {
        const tr = target.track;
        const pd = Math.min(tr.length - 30, target.pathDist + 40);
        const p = tr.pointAlong(pd);
        const hd = tr.headingAlong(pd);
        this.fences.push({ track: target.trackIndex, pathDist: pd, x: p.x, y: p.y, nx: -hd.y, ny: hd.x, until: time + fx.ms, born: time, damage: dmg, rider: a.rider, color: fx.color, width: fx.width, tower, struck: new Set() });
        this.flashes.push({ kind: 'line', pts: [ox, oy, p.x, p.y], color: fx.color, width: 2, until: time + 240, born: time });
        break;
      }
      case 'overclock': {
        let best: Tower | null = null;
        for (const t of this.api.towers()) {
          if (t === tower || Math.hypot(t.x - tower.x, t.y - tower.y) > range) continue;
          if (t.buffs.some((b) => b.until > time && b.fireRateMult >= fx.fireRateMult)) continue;
          if (!best || t.damageDealt + t.tier * 500 > best.damageDealt + best.tier * 500) best = t;
        }
        if (best) {
          best.addBuff({ until: time + fx.ms, fireRateMult: fx.fireRateMult, damageMult: fx.damageMult });
          this.flashes.push({ kind: 'poly', pts: [ox, oy, best.x, best.y], color: fx.color, width: 3, until: time + 300, born: time });
          this.flashes.push({ kind: 'ring', pts: [best.x, best.y], radius: 36, color: fx.color, width: 3, until: time + 700, born: time });
          this.api.floatText(best.x, best.y - 46, 'OVERCLOCKED', '#' + fx.color.toString(16).padStart(6, '0'), 11);
          Sfx.playAt('status-buff', best.x, { volume: 0.5 });
        }
        break;
      }
    }
  }

  /** A Death tower spends its charges on the next cast. */
  private consumeReap(t: Tower): number {
    const r = t.def.traits.reap;
    if (!r || t.charges < r.need) return 1;
    t.charges = 0;
    this.api.floatText(t.x, t.y - 50, 'REAPED', '#b8a8ff', 12);
    return r.mult;
  }

  private spawnMinion(trackIdx: number, pathDist: number, hits: number, speed: number, ms: number, damage: number, rider: Rider | undefined, color: number, look: MinionLook, size: number, tower: Tower, time: number): void {
    if (this.minions.length >= MAX_MINIONS) this.minions.shift();
    const tr = track(trackIdx);
    const p = tr.pointAlong(pathDist);
    this.minions.push({
      track: trackIdx, pathDist, x: p.x, y: p.y, hits, maxHits: hits, speed, until: time + ms, born: time,
      damage, rider, color, look, size, tower, struck: new Set(), lateral: (Math.random() - 0.5) * 16, phase: Math.random() * 10,
    });
    this.ring(p.x, p.y, 20, color, 300);
  }

  // ── Hits ──────────────────────────────────────────────────────────

  /**
   * The one place tower damage reaches a husk: armour and weaknesses, dodges and shells, crits,
   * stitches, then the rider. `pop` is false for DOT/aura ticks (no crit, no wake-up).
   */
  hitHusk(h: RoadHusk, amount: number, rider: Rider | undefined, tower: Tower | null, pop = true, pierce = false, dtype: DamageType = 'magic', linkId = 0, shared = false): void {
    if (!h.active || h.hp <= 0) return;
    const time = this.api.scene.time.now;
    const traits = this.api.traits;
    if (pop && !pierce && !traits.preHit(h, dtype, time)) return;
    let dmg = amount;
    if (h.weakenUntil > time) dmg *= h.weakenMult;
    if (!pierce) dmg *= traits.resistFor(h, dtype, tower?.elementId ?? null, time);
    if (tower) {
      const tt = tower.def.traits;
      if (tt.antiAir && h.airborne) dmg *= tt.antiAir;
      if (tt.bossBane && h.variant.isBoss) dmg *= tt.bossBane;
      if (tt.bane && h.variant.elementId && tt.bane.elements.includes(h.variant.elementId)) dmg *= tt.bane.mult;
      if (tt.shatter && (h.frozenUntil > time || h.encasedUntil > time || h.frostStacks >= 4)) dmg *= tt.shatter;
      if (tt.vsHidden && h.hidden) dmg *= tt.vsHidden;
      if (tt.vsCategory && h.variant.category && tt.vsCategory.cats.includes(h.variant.category)) dmg *= tt.vsCategory.mult;
      if (pop && tt.crit && Math.random() < tt.crit.chance) {
        dmg *= tt.crit.mult;
        this.api.floatText(h.x + 14, h.y - 40, 'CRIT', '#ffe066', 11);
      }
    }
    if (pop && h.exposedUntil > time) { dmg *= 1.5; h.exposedUntil = 0; }
    const before = h.hp + h.shieldHp;
    if (dmg > 0) {
      h.lastDamageOwner = 'player';
      h.takeDamage(pop ? Math.max(1, Math.round(dmg)) : dmg, pierce ? { pierce: true } : undefined);
      const dealt = Math.max(0, before - (h.hp + h.shieldHp));
      if (tower) tower.damageDealt += dealt;
      traits.postHit(h, dealt, time);
      if (pop && h.sleepUntil > time && ++h.sleepHits >= 3) h.sleepUntil = 0;
      // Stitched husks share the hurt.
      if (!shared && dealt > 0 && h.linkUntil > time && h.linkId) {
        for (const o of this.api.husks()) {
          if (o !== h && o.linkId === h.linkId && o.linkUntil > time) this.hitHusk(o, dealt * 0.3, undefined, tower, false, true, dtype, 0, true);
        }
      }
    }
    if (rider && h.active && h.hp > 0) this.applyRider(h, rider, time, linkId);
    if (tower && h.hp <= 0) tower.kills++;
  }

  private aoe(x: number, y: number, radius: number, damage: number, rider: Rider | undefined, tower: Tower, dtype: DamageType): void {
    const link = rider?.link ? this.nextLinkId++ : 0;
    for (const h of this.api.husks()) {
      if (Math.hypot(h.x - x, h.y - y) <= radius + 20 * h.sizeMult) this.hitHusk(h, damage, rider, tower, true, false, dtype, link);
    }
    Sfx.playAt(radius >= 140 ? 'explosion-large' : radius >= 80 ? 'explosion-medium' : 'explosion-small', x, { volume: 0.45 });
  }

  applyRider(h: RoadHusk, r: Rider, time: number, linkId = 0): void {
    if (r.chance !== undefined && Math.random() >= r.chance) return;
    const tr = this.api.traits;
    const pop = (key: string, text: string, color: string): void => {
      const last = h.lastStatusText.get(key) ?? -Infinity;
      if (time - last < STATUS_TEXT_GAP_MS) return;
      h.lastStatusText.set(key, time);
      this.api.floatText(h.x, h.y - 44, text, color, 11);
    };
    const boss = !!h.variant.isBoss;
    if (r.burn && !tr.immune(h, 'burn', time)) {
      const was = h.burningUntil > time;
      h.burningUntil = Math.max(h.burningUntil, time + r.burn);
      if (!was) tr.onIgnite(h, time);
      pop('burn', 'BURNING', '#ff8844');
    }
    if (r.toxic && !tr.immune(h, 'toxic', time)) {
      h.toxicDps = Math.max(h.toxicUntil > time ? h.toxicDps : 0, r.toxic.dps);
      h.toxicUntil = Math.max(h.toxicUntil, time + r.toxic.ms);
      if (r.infect) h.infectedUntil = Math.max(h.infectedUntil, time + r.infect);
      pop('toxic', r.infect ? 'INFECTED' : 'POISONED', '#88ff44');
    }
    if (r.frost && !tr.immune(h, 'frost', time)) {
      const n = h.soakedUntil > time ? r.frost * 2 : r.frost;
      h.frostStacks = Math.min(8, h.frostStacks + n);
      pop('frost', `FROST ×${h.frostStacks}`, '#aaddff');
    }
    if (r.freeze && !tr.immune(h, 'freeze', time)) {
      const ms = (boss ? r.freeze * 0.35 : r.freeze) * (h.soakedUntil > time ? 1.5 : 1);
      h.frozenUntil = Math.max(h.frozenUntil, time + ms);
      pop('freeze', 'FROZEN', '#ccf0ff');
    }
    if (r.stun && !tr.immune(h, 'stun', time)) {
      h.stunnedUntil = Math.max(h.stunnedUntil, time + (boss ? r.stun * 0.35 : r.stun));
      pop('stun', 'STUNNED', '#ffee88');
    }
    if (r.sleep && !tr.immune(h, 'sleep', time) && !boss) {
      if (h.sleepUntil <= time) h.sleepHits = 0;
      h.sleepUntil = Math.max(h.sleepUntil, time + r.sleep);
      pop('sleep', 'ASLEEP', '#b8a8ff');
    }
    if (r.encase && !tr.immune(h, 'freeze', time)) {
      h.encasedUntil = Math.max(h.encasedUntil, time + (boss ? r.encase * 0.35 : r.encase));
      pop('encase', 'ENCASED', '#ffd27a');
    }
    if (r.confuse && !tr.immune(h, 'confuse', time) && !boss) {
      h.confusedUntil = Math.max(h.confusedUntil, time + r.confuse);
      pop('confuse', 'CONFUSED', '#e8e4d8');
    }
    if (r.slow && !tr.immune(h, 'slow', time)) {
      if (r.slow.mult <= h.slowMult || h.slowUntil <= time) h.slowMult = r.slow.mult;
      h.slowUntil = Math.max(h.slowUntil, time + r.slow.ms * tr.slowScale(h));
      pop('slow', 'SLOWED', '#88ccff');
    }
    if (r.expose) { h.exposedUntil = Math.max(h.exposedUntil, time + r.expose); pop('expose', 'EXPOSED', '#ffee66'); }
    if (r.weaken) {
      if (r.weaken.mult >= h.weakenMult || h.weakenUntil <= time) h.weakenMult = r.weaken.mult;
      h.weakenUntil = Math.max(h.weakenUntil, time + r.weaken.ms);
      pop('weaken', 'WEAKENED', '#ff88aa');
    }
    if (r.bleed) { h.bleedUntil = Math.max(h.bleedUntil, time + r.bleed); pop('bleed', 'BLEEDING', '#ff4455'); }
    if (r.soak) { h.soakedUntil = Math.max(h.soakedUntil, time + r.soak); pop('soak', 'SOAKED', '#66bbff'); }
    if (r.corrode) {
      h.corrodedUntil = Math.max(h.corrodedUntil, time + r.corrode);
      if (h.shieldHp > 0) h.shieldHp = Math.floor(h.shieldHp * 0.5);
      pop('corrode', 'CORRODED', '#a8ff44');
    }
    if (r.reveal) { h.revealedUntil = Math.max(h.revealedUntil, time + r.reveal); if (h.hidden) pop('reveal', 'REVEALED', '#ffffff'); }
    if (r.gild) { h.goldMarkMult = Math.max(h.goldMarkUntil > time ? h.goldMarkMult : 1, r.gild); h.goldMarkUntil = time + 6000; pop('gild', 'GILDED', '#ffd700'); }
    if (r.link && linkId) { h.linkId = linkId; h.linkUntil = time + r.link; pop('link', 'STITCHED', '#f5788c'); }
    if (r.radiate) {
      h.radStacks = Math.min(12, h.radStacks + r.radiate);
      pop('rad', `RADS ×${h.radStacks}`, '#7cff3d');
    }
    if (r.ruin) {
      h.ruinStacks += r.ruin;
      if (h.ruinStacks >= 5) {
        h.ruinStacks = 0;
        this.api.floatText(h.x, h.y - 50, 'COLLAPSE', '#ff6a4a', 12);
        this.burst(h.x, h.y, 44, 0xc4392c, 'crater');
        this.hitHusk(h, h.maxHp * 0.12 + 10, undefined, null, true, true, 'blast');
      } else pop('ruin', `RUIN ×${h.ruinStacks}`, '#ff8a6a');
    }
    if (r.knockback && !tr.immune(h, 'knockback', time)) {
      const kb = boss ? r.knockback * 0.3 : r.knockback;
      if (h.trait?.id === 'rubber') {
        h.pathDist = Math.min(h.track.length - 20, h.pathDist + kb * 0.5);
        pop('kb', 'BOING', '#ff88aa');
      } else {
        h.pathDist = Math.max(0, h.pathDist - kb);
        pop('kb', 'SHOVED', '#ffffff');
      }
      h.place();
    }
  }

  /** The projectile-vs-husk overlap handler. */
  onShotHit(shot: TowerShot, h: RoadHusk): void {
    if (!shot.active || shot.hit.has(h) || !h.active || h.hp <= 0 || h.untargetable) return;
    if (shot.lob) return;
    shot.hit.add(h);
    this.hitHusk(h, shot.damage, shot.rider, shot.tower, true, false, shot.dtype);
    this.spark(h.x, h.y, shot.color);
    if (shot.splash > 0) {
      for (const o of this.api.husks()) {
        if (o === h || shot.hit.has(o)) continue;
        if (Math.hypot(o.x - h.x, o.y - h.y) <= shot.splash + 20 * o.sizeMult) {
          shot.hit.add(o);
          this.hitHusk(o, shot.damage * shot.splashMult, shot.rider, shot.tower, true, false, shot.dtype);
        }
      }
      this.burst(h.x, h.y, shot.splash, shot.color, 'burst');
    }
    // Gum swallows the shot whole.
    if (h.trait?.id === 'gum') { this.killShot(shot); return; }
    if (shot.bounces > 0) {
      shot.bounces--;
      let next: RoadHusk | null = null, best = 170;
      for (const o of this.api.husks()) {
        if (shot.hit.has(o) || o.untargetable) continue;
        const d = Math.hypot(o.x - h.x, o.y - h.y);
        if (d < best) { best = d; next = o; }
      }
      if (next) {
        const ang = Math.atan2(next.y - h.y, next.x - h.x);
        (shot.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * shot.speed, Math.sin(ang) * shot.speed);
        shot.setRotation(ang);
        shot.startX = h.x; shot.startY = h.y;
        return;
      }
    }
    if (shot.pierce > 0) { shot.pierce--; return; }
    if (shot.returns && !shot.returning) return; // glaives cut through everything on the way out
    this.killShot(shot);
  }

  private killShot(shot: TowerShot): void {
    shot.setActive(false).setVisible(false);
    (shot.body as Phaser.Physics.Arcade.Body | null)?.stop();
    shot.destroy();
  }

  /** Gravity husks' orbiting rocks swallow tower shots. Returns how many. */
  eatShots(x: number, y: number, r: number): number {
    let n = 0;
    for (const s of this.api.projectiles.getChildren() as TowerShot[]) {
      if (!s.active || s.lob) continue;
      if (Math.hypot(s.x - x, s.y - y) <= r) { this.killShot(s); n++; }
    }
    return n;
  }

  /** Magnet husks drag passing sharp shots into themselves. */
  bendShots(h: RoadHusk, r: number): void {
    for (const s of this.api.projectiles.getChildren() as TowerShot[]) {
      if (!s.active || s.lob || s.dtype !== 'sharp' || s.homing === h) continue;
      if (Math.hypot(s.x - h.x, s.y - h.y) <= r) s.homing = h;
    }
  }

  // ── Deaths (signatures that care) ─────────────────────────────────

  /** Called by the scene when a husk dies — wildfire, infection, raised dead, reaping. */
  onHuskDeath(h: RoadHusk): void {
    const time = this.api.scene.time.now;
    const towers = this.api.towers();
    if (h.burningUntil > time && towers.some((t) => t.def.traits.wildfire && Math.hypot(t.x - h.x, t.y - h.y) <= t.range + 60)) {
      for (const o of this.api.husks()) {
        if (o === h || Math.hypot(o.x - h.x, o.y - h.y) > 75) continue;
        this.applyRider(o, { burn: 3000 }, time);
      }
      this.burst(h.x, h.y, 60, 0xff6622, 'burst');
    }
    if (h.infectedUntil > time) {
      for (const o of this.api.husks()) {
        if (o === h || Math.hypot(o.x - h.x, o.y - h.y) > 85) continue;
        this.applyRider(o, { toxic: { ms: 4000, dps: Math.max(3, h.toxicDps) }, infect: 4000 }, time);
        this.flashes.push({ kind: 'line', pts: [h.x, h.y, o.x, o.y], color: 0x88bb22, width: 2, until: time + 260, born: time });
      }
    }
    for (const t of towers) {
      const d = Math.hypot(t.x - h.x, t.y - h.y);
      if (d > t.range + 30) continue;
      const tt = t.def.traits;
      if (tt.reap && t.charges < tt.reap.need) t.charges++;
      if (tt.raiseDead && !h.variant.isBoss && !h.isChild && Math.random() < tt.raiseDead.chance) {
        this.spawnMinion(h.trackIndex, h.pathDist, tt.raiseDead.hits + t.tier, 64, 12000, 10 + t.tier * 8 + h.maxHp * 0.25, undefined, 0xccaaff, 'ghost', h.sizeMult, t, time);
        this.api.floatText(h.x, h.y - 40, 'RISEN', '#ccaaff', 11);
      }
    }
  }

  // ── Per frame ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const husks = this.api.husks();

    // Shots: range limit, homing, artillery landing, glaives coming home.
    const children = this.api.projectiles.getChildren().slice() as TowerShot[];
    for (const s of children) {
      if (!s.active) continue;
      const body = s.body as Phaser.Physics.Arcade.Body;
      if (s.lob) {
        if (s.y >= s.lob.y) {
          const r = Math.max(26, s.splash);
          for (const h of husks) {
            if (Math.hypot(h.x - s.lob.x, h.y - s.lob.y) <= r + 20 * h.sizeMult) this.hitHusk(h, s.damage, s.rider, s.tower, true, false, s.dtype);
          }
          Sfx.playAt(r >= 80 ? 'explosion-medium' : 'explosion-small', s.lob.x, { volume: 0.4 });
          this.burst(s.lob.x, s.lob.y, r, s.color, 'crater');
          this.killShot(s);
        }
        continue;
      }
      if (s.homing) {
        const t = s.homing;
        if (t.active && t.hp > 0 && !t.untargetable) {
          const want = Math.atan2(t.y - s.y, t.x - s.x);
          const cur = Math.atan2(body.velocity.y, body.velocity.x);
          const ang = Phaser.Math.Angle.RotateTo(cur, want, 4.6 * (delta / 1000));
          body.setVelocity(Math.cos(ang) * s.speed, Math.sin(ang) * s.speed);
          s.setRotation(ang);
        } else {
          s.homing = null;
        }
      }
      if (s.returns) {
        s.setRotation(s.rotation + delta / 50);
        if (!s.returning && Math.hypot(s.x - s.startX, s.y - s.startY) > s.maxDist) {
          s.returning = true;
          s.hit.clear();
        }
        if (s.returning) {
          const tx = s.tower.x, ty = s.tower.y - (s.tower.flies ? 22 : 0);
          const ang = Math.atan2(ty - s.y, tx - s.x);
          body.setVelocity(Math.cos(ang) * s.speed, Math.sin(ang) * s.speed);
          if (Math.hypot(tx - s.x, ty - s.y) < 18) this.killShot(s);
        }
        continue;
      }
      if (Math.hypot(s.x - s.startX, s.y - s.startY) > s.maxDist || s.x < -60 || s.x > 1020 || s.y < -60 || s.y > 700) {
        this.killShot(s);
      }
    }

    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= time);
      this.pending = this.pending.filter((p) => p.at > time);
      for (const p of due) p.fn();
      this.telegraphs = this.telegraphs.filter((t) => t.at > time);
    }

    // Zones tick four times a second; airborne husks float over them.
    for (const z of this.zones) {
      z.accum += delta;
      while (z.accum >= 250) {
        z.accum -= 250;
        for (const h of husks) {
          if (h.airborne || Math.hypot(h.x - z.x, h.y - z.y) > z.radius + 16 * h.sizeMult) continue;
          this.hitHusk(h, z.dps * 0.25, z.rider, z.tower, false, false, z.dtype);
          if (z.pull > 0 && !this.api.traits.immune(h, 'knockback', time) && h.active) {
            h.pathDist = Math.max(0, h.pathDist - z.pull * 0.25 * (h.variant.isBoss ? 0.3 : 1));
            h.place();
          }
        }
      }
    }
    this.zones = this.zones.filter((z) => z.until > time);

    for (const b of this.beams) {
      const t = b.target;
      if (!t.active || t.hp <= 0 || t.untargetable || Math.hypot(t.x - b.tower.x, t.y - b.tower.y) > b.tower.range * 1.4 || b.tower.stunned) { b.until = 0; continue; }
      b.tower.lookAt(t.x, t.y);
      b.accum += delta;
      while (b.accum >= 100) {
        b.accum -= 100;
        const ramp = 1 + b.ramp * ((time - b.born) / 1000);
        this.hitHusk(t, b.dps * 0.1 * ramp, b.rider, b.tower, false, false, 'energy');
      }
    }
    this.beams = this.beams.filter((b) => b.until > time);

    // Guardians strike whatever walks past.
    for (const s of this.summons) {
      if (time < s.nextAt) continue;
      let best: RoadHusk | null = null, bestD = s.range;
      for (const h of husks) {
        if (h.airborne || h.untargetable) continue;
        const d = Math.hypot(h.x - s.x, h.y - s.y);
        if (d <= bestD) { bestD = d; best = h; }
      }
      if (best) {
        s.nextAt = time + s.attackMs;
        this.hitHusk(best, s.damage, s.rider, s.tower, true, false, 'sharp');
        this.flashes.push({ kind: 'line', pts: [s.x, s.y - 6, best.x, best.y], color: s.color, width: 2, until: time + 140, born: time });
        this.api.scene.tweens.add({ targets: s.label, scale: { from: 1.3, to: 1 }, duration: 160 });
      }
    }
    for (const s of this.summons) if (s.until <= time) { s.label.destroy(); this.ring(s.x, s.y, 24, s.color, 300); }
    this.summons = this.summons.filter((s) => s.until > time);

    // Traps: the first husks to step on them take the hit.
    for (const t of this.traps) {
      if (time < t.born || t.hits <= 0) continue;
      for (const h of husks) {
        if (h.airborne || h.untargetable || Math.hypot(h.x - t.x, h.y - t.y) > 16 + 14 * h.sizeMult) continue;
        if (t.blast > 0) {
          for (const o of husks) if (Math.hypot(o.x - t.x, o.y - t.y) <= t.blast + 16 * o.sizeMult) this.hitHusk(o, t.damage, t.rider, t.tower, true, false, 'blast');
          this.burst(t.x, t.y, t.blast, t.color, 'burst');
          Sfx.playAt('explosion-small', t.x, { volume: 0.35 });
          t.hits = 0;
          break;
        }
        this.hitHusk(h, t.damage, t.rider, t.tower, true, false, t.dtype);
        t.hits--;
        if (t.hits <= 0) break;
      }
    }
    this.traps = this.traps.filter((t) => t.until > time && t.hits > 0);

    // Minions march back up the road, striking each husk they meet once.
    for (const m of this.minions) {
      const tr = track(m.track);
      m.pathDist -= m.speed * (delta / 1000);
      const p = tr.pointAlong(m.pathDist);
      const hd = tr.headingAlong(m.pathDist);
      m.x = p.x - hd.y * m.lateral; m.y = p.y + hd.x * m.lateral;
      for (const h of husks) {
        if (m.hits <= 0) break;
        if (h.airborne || h.untargetable || m.struck.has(h)) continue;
        if (Math.hypot(h.x - m.x, h.y - m.y) > 20 + 14 * h.sizeMult) continue;
        m.struck.add(h);
        m.hits--;
        this.hitHusk(h, m.damage, m.rider, m.tower, true, false, 'sharp');
        this.spark(h.x, h.y, m.color);
      }
      if (m.pathDist <= 0) m.hits = 0;
    }
    for (const m of this.minions) if (m.hits <= 0 || m.until <= time) this.ring(m.x, m.y, 18, m.color, 260);
    this.minions = this.minions.filter((m) => m.hits > 0 && m.until > time);

    // Sentries fire at the closest husk they can see.
    for (const s of this.sentries) {
      if (time < s.nextAt || s.tower.stunned) continue;
      let best: RoadHusk | null = null, bd = s.range;
      for (const h of husks) {
        if (!h.targetable(time, s.tower.detect)) continue;
        const d = Math.hypot(h.x - s.x, h.y - s.y);
        if (d < bd) { bd = d; best = h; }
      }
      if (!best) continue;
      s.nextAt = time + s.attackMs;
      s.facing = Math.atan2(best.y - s.y, best.x - s.x);
      const shot = new TowerShot(this.api.scene, s.x, s.y - 6, 'sh-orb', s.damage, true);
      shot.tower = s.tower; shot.rider = s.rider; shot.speed = 560; shot.color = s.color; shot.fromSentry = true;
      shot.startX = s.x; shot.startY = s.y; shot.maxDist = s.range * 1.3;
      shot.setTint(s.color).setScale(0.7).setDepth(6.8);
      this.api.projectiles.add(shot);
      shot.launch(Math.cos(s.facing) * 560, Math.sin(s.facing) * 560);
    }
    this.sentries = this.sentries.filter((s) => s.until > time);

    // Fences: everything that crosses takes the hit once.
    for (const f of this.fences) {
      for (const h of husks) {
        if (h.trackIndex !== f.track || f.struck.has(h)) continue;
        if (Math.abs(h.pathDist - f.pathDist) > 10) continue;
        f.struck.add(h);
        this.hitHusk(h, f.damage, f.rider, f.tower, true, false, 'energy');
      }
    }
    this.fences = this.fences.filter((f) => f.until > time);

    for (const b of this.barriers) if (b.until <= time) this.removeBarrier(b);
    this.barriers = this.barriers.filter((b) => b.until > time && b.hp > 0);

    this.flashes = this.flashes.filter((f) => f.until > time);

    // Bleed and radiation are Stronghold statuses, so they tick here rather than in the husk.
    for (const h of husks) {
      if (h.bleedUntil > time) {
        h.bleedAccum += delta;
        while (h.bleedAccum >= 500 && h.hp > 0) {
          h.bleedAccum -= 500;
          this.hitHusk(h, Math.max(1, h.maxHp * 0.01), undefined, null, false, true);
        }
      } else h.bleedAccum = 0;
      if (h.radStacks > 0 && h.hp > 0) {
        h.radAccum += delta;
        while (h.radAccum >= 500 && h.hp > 0) {
          h.radAccum -= 500;
          this.hitHusk(h, Math.max(0.5, h.maxHp * 0.002 * h.radStacks), undefined, null, false, true);
        }
      }
    }
  }

  private removeBarrier(b: Barrier): void {
    b.label.destroy();
    b.until = 0; b.hp = 0;
  }

  // ── Paint ─────────────────────────────────────────────────────────

  draw(time: number): void {
    const g = this.gfx;
    g.clear();
    const ag = this.auraGfx;
    ag.clear();
    const gg = this.groundGfx;
    gg.clear();

    // Permanent auras (heat haze, orbiting rocks, frost rings) around the towers that have one.
    for (const t of this.api.towers()) {
      for (const slot of t.unlockedSlots()) {
        const fx = t.def.abilities[slot].fx;
        if (fx.kind !== 'aura') continue;
        this.drawAura(ag, g, t, fx.radius * (t.def.abilities[slot].range ?? 1), fx.color, fx.look ?? 'pulse', time);
      }
    }

    for (const z of this.zones) this.drawZone(ag, z, time);

    for (const t of this.telegraphs) {
      const p = Phaser.Math.Clamp((time - t.born) / Math.max(1, t.at - t.born), 0, 1);
      ag.lineStyle(2, t.color, 0.35 + p * 0.5);
      ag.strokeCircle(t.x, t.y, t.radius);
      ag.fillStyle(t.color, 0.08 + p * 0.18);
      ag.fillCircle(t.x, t.y, t.radius * p);
      if (t.shape === 'strike' || t.shape === 'meteor') { ag.lineStyle(1, t.color, 0.6); ag.lineBetween(t.x, t.y - t.radius - 30 * (1 - p), t.x, t.y); }
      if (t.shape === 'meteor') {
        const my = t.y - 260 * (1 - p), mx = t.x - 120 * (1 - p);
        g.fillStyle(0x3a2a20, 1); g.fillCircle(mx, my, 10 + p * 6);
        g.fillStyle(t.color, 0.7); g.fillCircle(mx - 4, my - 4, 6 + p * 3);
        g.lineStyle(4, t.color, 0.35); g.lineBetween(mx, my, mx - 40, my - 60);
      }
    }

    for (const tr of this.traps) this.drawTrap(gg, tr, time);
    for (const f of this.fences) this.drawFence(g, f, time);

    for (const b of this.beams) {
      const t = b.target;
      const ox = b.tower.x, oy = b.tower.y - (b.tower.flies ? 22 : 8);
      const jitter = Math.sin(time / 40) * 1.5;
      const heat = Math.min(1, b.ramp * ((time - b.born) / 1000) / 2);
      const w = b.width * (1 + heat);
      g.lineStyle(w + 4, b.color, 0.18);
      g.lineBetween(ox, oy, t.x, t.y + jitter);
      g.lineStyle(w, b.color, 0.85);
      g.lineBetween(ox, oy, t.x, t.y + jitter);
      g.lineStyle(Math.max(1, w * 0.35), 0xffffff, 0.8);
      g.lineBetween(ox, oy, t.x, t.y + jitter);
      g.fillStyle(b.color, 0.6); g.fillCircle(t.x, t.y + jitter, w * 0.9 + 2);
    }

    for (const s of this.summons) {
      const life = (s.until - time) / Math.max(1, s.until - s.born);
      g.fillStyle(s.color, 0.22); g.fillEllipse(s.x, s.y + 10, 40, 16);
      g.lineStyle(2, s.color, 0.7); g.strokeEllipse(s.x, s.y + 10, 40, 16);
      g.lineStyle(2, 0xffffff, 0.5);
      g.beginPath(); g.arc(s.x, s.y + 10, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life, false); g.strokePath();
    }

    for (const m of this.minions) this.drawMinion(g, m, time);
    for (const s of this.sentries) this.drawSentry(g, s, time);

    for (const b of this.barriers) {
      const tr = track(b.track);
      const h = tr.headingAlong(b.pathDist);
      const hw = 34;
      const x1 = b.x - h.y * hw, y1 = b.y + h.x * hw, x2 = b.x + h.y * hw, y2 = b.y - h.x * hw;
      g.lineStyle(14, 0x000000, 0.35); g.lineBetween(x1, y1 + 4, x2, y2 + 4);
      g.lineStyle(12, b.color, 0.9); g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(4, 0xffffff, 0.35); g.lineBetween(x1, y1 - 3, x2, y2 - 3);
      const ratio = Phaser.Math.Clamp(b.hp / b.maxHp, 0, 1);
      g.fillStyle(0x000000, 0.7); g.fillRect(b.x - 24, b.y - 44, 48, 5);
      g.fillStyle(b.color, 1); g.fillRect(b.x - 24, b.y - 44, 48 * ratio, 5);
    }

    for (const f of this.flashes) {
      const life = (f.until - time) / Math.max(1, f.until - f.born);
      if (f.kind === 'line') {
        g.lineStyle(f.width + 6, f.color, 0.18 * life);
        g.lineBetween(f.pts[0], f.pts[1], f.pts[2], f.pts[3]);
        g.lineStyle(f.width, f.color, 0.85 * life);
        g.lineBetween(f.pts[0], f.pts[1], f.pts[2], f.pts[3]);
        g.lineStyle(Math.max(1, f.width * 0.3), 0xffffff, 0.8 * life);
        g.lineBetween(f.pts[0], f.pts[1], f.pts[2], f.pts[3]);
      } else if (f.kind === 'ring') {
        const r = (f.radius ?? 30) * (1.1 - 0.1 * life);
        g.lineStyle(f.width, f.color, 0.6 * life);
        g.strokeCircle(f.pts[0], f.pts[1], r);
        g.fillStyle(f.color, 0.06 * life);
        g.fillCircle(f.pts[0], f.pts[1], r);
      } else {
        g.lineStyle(f.width + 4, f.color, 0.25 * life);
        g.beginPath(); g.moveTo(f.pts[0], f.pts[1]);
        for (let i = 2; i < f.pts.length; i += 2) {
          const mx = (f.pts[i - 2] + f.pts[i]) / 2 + (Math.random() - 0.5) * 12;
          const my = (f.pts[i - 1] + f.pts[i + 1]) / 2 + (Math.random() - 0.5) * 12;
          g.lineTo(mx, my); g.lineTo(f.pts[i], f.pts[i + 1]);
        }
        g.strokePath();
        g.lineStyle(f.width, 0xffffff, 0.8 * life);
        g.beginPath(); g.moveTo(f.pts[0], f.pts[1]);
        for (let i = 2; i < f.pts.length; i += 2) g.lineTo(f.pts[i], f.pts[i + 1]);
        g.strokePath();
      }
    }
  }

  private drawAura(ag: Phaser.GameObjects.Graphics, g: Phaser.GameObjects.Graphics, t: Tower, r: number, color: number, look: string, time: number): void {
    const x = t.x, y = t.y;
    if (look === 'orbit') {
      const n = 4 + t.tier;
      for (let i = 0; i < n; i++) {
        const a = time / 520 + (i / n) * Math.PI * 2;
        const rx = x + Math.cos(a) * r * 0.85, ry = y + Math.sin(a) * r * 0.55;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(rx + 2, ry + 6, 14, 6);
        g.fillStyle(mix(color, 0x000000, 0.25), 1);
        g.fillPoints([{ x: rx - 7, y: ry - 2 }, { x: rx - 2, y: ry - 7 }, { x: rx + 6, y: ry - 4 }, { x: rx + 7, y: ry + 3 }, { x: rx, y: ry + 6 }, { x: rx - 6, y: ry + 4 }], true);
        g.fillStyle(mix(color, 0xffffff, 0.3), 1); g.fillCircle(rx - 2, ry - 3, 2);
      }
    } else if (look === 'heat') {
      ag.fillStyle(color, 0.06 + Math.sin(time / 240) * 0.02); ag.fillCircle(x, y, r);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + time / 1400;
        const fx = x + Math.cos(a) * r * 0.7, fy = y + Math.sin(a) * r * 0.5;
        const h = 8 + Math.sin(time / 120 + i) * 3;
        ag.fillStyle(0xffcc55, 0.35); ag.fillTriangle(fx - 4, fy + 3, fx + 4, fy + 3, fx, fy - h);
      }
    } else if (look === 'frost') {
      ag.fillStyle(color, 0.07); ag.fillCircle(x, y, r);
      ag.lineStyle(1, 0xffffff, 0.3);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + time / 3000;
        const sx = x + Math.cos(a) * r * 0.8, sy = y + Math.sin(a) * r * 0.8;
        ag.lineBetween(sx - 4, sy, sx + 4, sy); ag.lineBetween(sx, sy - 4, sx, sy + 4);
        ag.lineBetween(sx - 3, sy - 3, sx + 3, sy + 3); ag.lineBetween(sx + 3, sy - 3, sx - 3, sy + 3);
      }
      ag.lineStyle(1.5, color, 0.35); ag.strokeCircle(x, y, r);
    } else if (look === 'rad') {
      const p = (time / 1600) % 1;
      ag.lineStyle(2, color, 0.4 * (1 - p)); ag.strokeCircle(x, y, r * p);
      ag.lineStyle(1, color, 0.25); ag.strokeCircle(x, y, r);
    } else {
      const p = (time / 1200) % 1;
      ag.lineStyle(2, color, 0.35 * (1 - p)); ag.strokeCircle(x, y, r * (0.4 + 0.6 * p));
      ag.lineStyle(1, color, 0.18); ag.strokeCircle(x, y, r);
    }
  }

  private drawZone(ag: Phaser.GameObjects.Graphics, z: Zone, time: number): void {
    const life = (z.until - time) / Math.max(1, z.until - z.born);
    const birth = Math.min(1, (time - z.born) / 200);
    const r = z.radius * (0.86 + Math.sin((time - z.born) / 180) * 0.05) * birth;
    const a = 0.18 + 0.1 * Math.min(1, life * 3);
    const fade = Math.min(1, life * 4);
    switch (z.shape) {
      case 'puddle': case 'glue': case 'acid': case 'paint': case 'lava': {
        const base = z.shape === 'glue' ? 0xd8f0c8 : z.color;
        ag.fillStyle(base, a + (z.shape === 'paint' ? 0.15 : 0)); ag.fillEllipse(z.x, z.y, r * 2, r * 1.4);
        ag.lineStyle(1.5, mix(base, 0xffffff, 0.3), 0.5 * fade); ag.strokeEllipse(z.x, z.y, r * 2, r * 1.4);
        if (z.shape === 'acid' || z.shape === 'lava') {
          for (let i = 0; i < 5; i++) {
            const p = ((time / 900 + i * 0.21) % 1);
            const bx = z.x + Math.cos(i * 2.3) * r * 0.6, by = z.y + Math.sin(i * 2.3) * r * 0.4;
            ag.fillStyle(z.shape === 'lava' ? 0xffd27a : 0xd0ff88, 0.6 * (1 - p) * fade); ag.fillCircle(bx, by - p * 6, 2 + p * 3);
          }
        } else if (z.shape === 'paint') {
          for (let i = 0; i < 4; i++) { ag.fillStyle(mix(z.color, 0xffffff, i * 0.15), 0.5 * fade); ag.fillCircle(z.x + Math.cos(i * 1.7) * r * 0.5, z.y + Math.sin(i * 1.7) * r * 0.3, r * 0.22); }
        } else if (z.shape === 'glue') {
          ag.lineStyle(1, 0xffffff, 0.4 * fade); ag.strokeEllipse(z.x - r * 0.2, z.y - r * 0.1, r * 0.6, r * 0.3);
        } else {
          ag.lineStyle(1, 0xffffff, 0.25 * fade); ag.strokeEllipse(z.x, z.y, r * 1.2 * ((time / 700) % 1 + 0.3), r * 0.8 * ((time / 700) % 1 + 0.3));
        }
        break;
      }
      case 'sand': {
        ag.fillStyle(z.color, a + 0.1); ag.fillCircle(z.x, z.y, r);
        ag.lineStyle(1.5, mix(z.color, 0x000000, 0.4), 0.6 * fade);
        for (let k = 0; k < 3; k++) {
          ag.beginPath();
          for (let i = 0; i <= 24; i++) {
            const ang = i / 24 * Math.PI * 2 + time / (600 + k * 200);
            const rr = r * (0.25 + k * 0.25) * (1 - i / 60);
            const px = z.x + Math.cos(ang) * rr, py = z.y + Math.sin(ang) * rr * 0.7;
            if (i === 0) ag.moveTo(px, py); else ag.lineTo(px, py);
          }
          ag.strokePath();
        }
        break;
      }
      case 'storm': case 'smoke': {
        for (let i = 0; i < 7; i++) {
          const ang = i / 7 * Math.PI * 2 + time / 2000;
          ag.fillStyle(z.shape === 'storm' ? 0x55607a : 0x77777f, 0.22 * fade);
          ag.fillCircle(z.x + Math.cos(ang) * r * 0.55, z.y + Math.sin(ang) * r * 0.4, r * 0.45);
        }
        if (z.shape === 'storm' && Math.sin(time / 70 + z.x) > 0.85) {
          ag.lineStyle(2, 0xffee66, 0.9);
          const lx = z.x + (Math.random() - 0.5) * r;
          ag.lineBetween(lx, z.y - r, lx + 6, z.y - r * 0.3); ag.lineBetween(lx + 6, z.y - r * 0.3, lx - 4, z.y + r * 0.4);
        }
        ag.lineStyle(1, z.color, 0.4 * fade); ag.strokeCircle(z.x, z.y, r);
        break;
      }
      case 'mold': {
        ag.fillStyle(z.color, a); ag.fillCircle(z.x, z.y, r);
        for (let i = 0; i < 9; i++) {
          const ang = i * 0.7 + z.born;
          const d = r * (0.3 + (i % 3) * 0.22);
          ag.fillStyle(mix(z.color, 0xffffff, 0.2), 0.5 * fade); ag.fillCircle(z.x + Math.cos(ang) * d, z.y + Math.sin(ang) * d * 0.7, 3 + (i % 3));
        }
        break;
      }
      case 'holy': {
        ag.fillStyle(z.color, a * 0.8); ag.fillCircle(z.x, z.y, r);
        ag.lineStyle(2, 0xffffff, 0.5 * fade); ag.strokeCircle(z.x, z.y, r);
        ag.lineStyle(3, mix(z.color, 0xffffff, 0.5), 0.6 * fade);
        ag.lineBetween(z.x, z.y - r * 0.5, z.x, z.y + r * 0.5); ag.lineBetween(z.x - r * 0.3, z.y - r * 0.15, z.x + r * 0.3, z.y - r * 0.15);
        break;
      }
      default: {
        ag.fillStyle(z.color, a); ag.fillCircle(z.x, z.y, r);
        ag.lineStyle(z.shape === 'rune' ? 2 : 1.5, z.color, 0.45 + 0.2 * life); ag.strokeCircle(z.x, z.y, r);
        if (z.shape === 'rune') {
          ag.lineStyle(1, z.color, 0.5);
          const rot = (time - z.born) / 900;
          for (let i = 0; i < 6; i++) {
            const a1 = rot + i * Math.PI / 3, a2 = a1 + Math.PI / 3 * 2;
            ag.lineBetween(z.x + Math.cos(a1) * r * 0.8, z.y + Math.sin(a1) * r * 0.8, z.x + Math.cos(a2) * r * 0.8, z.y + Math.sin(a2) * r * 0.8);
          }
        } else if (z.shape === 'fire') {
          for (let i = 0; i < 5; i++) {
            const a1 = (time / 300 + i * 1.3) % (Math.PI * 2);
            const fx = z.x + Math.cos(a1) * r * 0.5, fy = z.y + Math.sin(a1) * r * 0.4;
            ag.fillStyle(0xffee88, 0.5); ag.fillTriangle(fx - 5, fy + 4, fx + 5, fy + 4, fx, fy - 9 - Math.sin(time / 90 + i) * 3);
          }
        } else if (z.shape === 'ice') {
          ag.lineStyle(1.5, 0xffffff, 0.35);
          for (let i = 0; i < 3; i++) { const a1 = i * 1.05; ag.lineBetween(z.x - Math.cos(a1) * r * 0.7, z.y - Math.sin(a1) * r * 0.5, z.x + Math.cos(a1) * r * 0.7, z.y + Math.sin(a1) * r * 0.5); }
        }
        if (z.pull > 0) {
          // A spiral drawn inward so the drag reads.
          ag.lineStyle(1.5, mix(z.color, 0xffffff, 0.4), 0.5 * fade);
          ag.beginPath();
          for (let i = 0; i <= 30; i++) {
            const ang = i * 0.42 - time / 260;
            const rr = r * (1 - i / 32);
            const px = z.x + Math.cos(ang) * rr, py = z.y + Math.sin(ang) * rr * 0.75;
            if (i === 0) ag.moveTo(px, py); else ag.lineTo(px, py);
          }
          ag.strokePath();
        }
      }
    }
  }

  private drawTrap(g: Phaser.GameObjects.Graphics, t: Trap, time: number): void {
    if (time < t.born) return;
    const life = Math.min(1, (t.until - time) / 800);
    const x = t.x, y = t.y;
    const c = t.color;
    g.fillStyle(0x000000, 0.25 * life); g.fillEllipse(x + 1, y + 3, 14, 5);
    switch (t.look) {
      case 'spike': {
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + t.seed;
          g.fillStyle(mix(c, 0x000000, 0.2), life);
          g.fillTriangle(x, y, x + Math.cos(a - 0.4) * 4, y + Math.sin(a - 0.4) * 3, x + Math.cos(a) * 9, y + Math.sin(a) * 6);
        }
        g.fillStyle(mix(c, 0xffffff, 0.4), life); g.fillTriangle(x - 2, y, x + 2, y, x, y - 8);
        break;
      }
      case 'mine': {
        g.fillStyle(0x2a2a2a, life); g.fillCircle(x, y, 6);
        g.fillStyle(c, life); g.fillCircle(x, y - 1, 3.5);
        if (Math.sin(time / 120 + t.seed) > 0) { g.fillStyle(0xff3333, life); g.fillCircle(x, y - 6, 1.6); }
        break;
      }
      case 'rune': {
        g.lineStyle(1.5, c, 0.8 * life); g.strokeCircle(x, y, 9);
        const rot = time / 700 + t.seed;
        for (let i = 0; i < 3; i++) { const a = rot + i * 2.09; g.lineBetween(x + Math.cos(a) * 9, y + Math.sin(a) * 6, x + Math.cos(a + 2.09) * 9, y + Math.sin(a + 2.09) * 6); }
        break;
      }
      case 'seed': {
        g.fillStyle(0x5a3a1e, life); g.fillEllipse(x, y + 1, 9, 6);
        g.lineStyle(1.5, c, life); g.lineBetween(x, y, x - 2, y - 8); g.lineBetween(x, y, x + 3, y - 7);
        g.fillStyle(c, life); g.fillEllipse(x - 3, y - 8, 5, 3); g.fillEllipse(x + 4, y - 7, 5, 3);
        break;
      }
      case 'glue': {
        g.fillStyle(c, 0.75 * life); g.fillEllipse(x, y, 16, 9);
        g.fillStyle(0xffffff, 0.4 * life); g.fillEllipse(x - 3, y - 2, 5, 2);
        break;
      }
      case 'coin': {
        g.fillStyle(0x8a6a10, life); g.fillCircle(x, y + 1, 5);
        g.fillStyle(0xffd700, life); g.fillCircle(x, y, 5);
        g.lineStyle(1, 0x8a6a10, life); g.strokeCircle(x, y, 3);
        break;
      }
      case 'bone': {
        g.lineStyle(3, 0xeee6d0, life); g.lineBetween(x - 6, y + 3, x + 6, y - 3);
        g.fillStyle(0xeee6d0, life); g.fillCircle(x - 7, y + 4, 2.5); g.fillCircle(x - 6, y + 1, 2.5); g.fillCircle(x + 7, y - 4, 2.5); g.fillCircle(x + 6, y - 1, 2.5);
        g.fillStyle(c, life); g.fillTriangle(x - 2, y, x + 2, y, x, y - 9);
        break;
      }
      case 'pin': {
        g.lineStyle(1.5, 0xdddddd, life); g.lineBetween(x, y + 2, x + 2, y - 9);
        g.fillStyle(c, life); g.fillCircle(x + 2, y - 10, 3);
        break;
      }
      case 'hive': {
        g.fillStyle(0xd8a531, life); g.fillEllipse(x, y - 2, 12, 14);
        g.lineStyle(1, 0x7a5a10, life); for (let i = -1; i <= 1; i++) g.lineBetween(x - 5, y - 2 + i * 4, x + 5, y - 2 + i * 4);
        g.fillStyle(0x221a00, life); g.fillCircle(x, y + 2, 1.6);
        break;
      }
    }
  }

  private drawFence(g: Phaser.GameObjects.Graphics, f: Fence, time: number): void {
    const life = Math.min(1, (f.until - time) / 500);
    const hw = 36;
    const x1 = f.x - f.nx * hw, y1 = f.y - f.ny * hw, x2 = f.x + f.nx * hw, y2 = f.y + f.ny * hw;
    g.lineStyle(f.width + 6, f.color, 0.15 * life); g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(f.width, f.color, 0.8 * life); g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1, 0xffffff, 0.8 * life); g.lineBetween(x1, y1, x2, y2);
    // Star anchors at both ends.
    for (const [sx, sy] of [[x1, y1], [x2, y2]]) {
      const r = 6 + Math.sin(time / 150) * 1.5;
      g.fillStyle(0xffffff, life);
      g.fillPoints([{ x: sx, y: sy - r }, { x: sx + r * 0.3, y: sy - r * 0.3 }, { x: sx + r, y: sy }, { x: sx + r * 0.3, y: sy + r * 0.3 }, { x: sx, y: sy + r }, { x: sx - r * 0.3, y: sy + r * 0.3 }, { x: sx - r, y: sy }, { x: sx - r * 0.3, y: sy - r * 0.3 }], true);
      g.fillStyle(f.color, life); g.fillCircle(sx, sy, 2);
    }
  }

  private drawMinion(g: Phaser.GameObjects.Graphics, m: Minion, time: number): void {
    const s = m.size;
    const bob = Math.sin(time / 120 + m.phase) * 1.5;
    const x = m.x, y = m.y + bob;
    const c = m.color;
    const tr = track(m.track);
    const hd = tr.headingAlong(m.pathDist);
    const face = -Math.sign(hd.x || 1); // walks against the road
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, m.y + 10 * s, 20 * s, 6 * s);
    switch (m.look) {
      case 'soldier': {
        g.fillStyle(mix(c, 0x000000, 0.35), 1); g.fillRect(x - 5 * s, y - 4 * s, 10 * s, 12 * s);
        g.fillStyle(0xe8c8a0, 1); g.fillCircle(x, y - 8 * s, 4.5 * s);
        g.fillStyle(0x8a8a9a, 1); g.fillEllipse(x, y - 11 * s, 11 * s, 5 * s);
        g.lineStyle(1.5 * s, 0xcccccc, 1); g.lineBetween(x + face * 7 * s, y + 8 * s, x + face * 7 * s, y - 16 * s);
        g.fillStyle(0xdddddd, 1); g.fillTriangle(x + face * 7 * s - 2 * s, y - 16 * s, x + face * 7 * s + 2 * s, y - 16 * s, x + face * 7 * s, y - 21 * s);
        g.fillStyle(c, 1); g.fillRect(x - face * 9 * s, y - 4 * s, 4 * s, 9 * s);
        break;
      }
      case 'ghost': case 'convert': {
        const alpha = m.look === 'ghost' ? 0.7 : 0.9;
        g.fillStyle(c, alpha * 0.35); g.fillCircle(x, y - 4 * s, 13 * s);
        g.fillStyle(m.look === 'ghost' ? 0xe8e0ff : mix(c, 0xffffff, 0.5), alpha);
        g.fillCircle(x, y - 6 * s, 8 * s);
        g.fillRect(x - 8 * s, y - 6 * s, 16 * s, 10 * s);
        for (let i = 0; i < 3; i++) g.fillTriangle(x - 8 * s + i * 5.3 * s, y + 4 * s, x - 2.7 * s + i * 5.3 * s, y + 4 * s, x - 5.3 * s + i * 5.3 * s, y + (8 + Math.sin(time / 90 + i) * 2) * s);
        g.fillStyle(0x221a33, 1); g.fillCircle(x - 3 * s, y - 7 * s, 1.6 * s); g.fillCircle(x + 3 * s, y - 7 * s, 1.6 * s);
        if (m.look === 'convert') { g.lineStyle(1.5, 0xffffff, 0.8); g.strokeEllipse(x, y - 18 * s, 10 * s, 3 * s); }
        break;
      }
      case 'golem': case 'stone': {
        g.fillStyle(mix(c, 0x000000, 0.3), 1); g.fillRect(x - 9 * s, y - 10 * s, 18 * s, 18 * s);
        g.fillStyle(c, 1); g.fillRect(x - 7 * s, y - 14 * s, 14 * s, 10 * s);
        g.fillStyle(0xffcc55, 1); g.fillRect(x - 4 * s, y - 11 * s, 2.5 * s, 2 * s); g.fillRect(x + 1.5 * s, y - 11 * s, 2.5 * s, 2 * s);
        g.lineStyle(1, 0x000000, 0.4); g.lineBetween(x - 9 * s, y - 2 * s, x + 9 * s, y - 2 * s);
        break;
      }
      case 'car': {
        const ang = Math.atan2(-hd.y, -hd.x);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const pt = (lx: number, ly: number): { x: number; y: number } => ({ x: x + (lx * ca - ly * sa) * s, y: y + (lx * sa + ly * ca) * s });
        g.fillStyle(mix(c, 0x000000, 0.3), 1);
        g.fillPoints([pt(-12, -7), pt(12, -7), pt(14, 0), pt(12, 7), pt(-12, 7)], true);
        g.fillStyle(c, 1); g.fillPoints([pt(-6, -5), pt(6, -5), pt(8, 0), pt(6, 5), pt(-6, 5)], true);
        g.fillStyle(0xffffcc, 1); const h1 = pt(14, -4), h2 = pt(14, 4); g.fillCircle(h1.x, h1.y, 2 * s); g.fillCircle(h2.x, h2.y, 2 * s);
        g.fillStyle(0xffffcc, 0.18); const b1 = pt(40, -10), b2 = pt(40, 10); g.fillTriangle(h1.x, h1.y, b1.x, b1.y, b2.x, b2.y);
        break;
      }
      case 'wolf': {
        g.fillStyle(mix(c, 0x000000, 0.3), 1); g.fillEllipse(x, y - 2 * s, 20 * s, 9 * s);
        g.fillStyle(c, 1); g.fillCircle(x + face * 9 * s, y - 6 * s, 5 * s);
        g.fillTriangle(x + face * 7 * s, y - 10 * s, x + face * 10 * s, y - 10 * s, x + face * 8 * s, y - 15 * s);
        g.fillStyle(0xffee66, 1); g.fillCircle(x + face * 11 * s, y - 7 * s, 1.3 * s);
        g.lineStyle(2 * s, mix(c, 0x000000, 0.3), 1); g.lineBetween(x - face * 10 * s, y - 3 * s, x - face * 15 * s, y - 8 * s);
        break;
      }
      case 'curling': {
        g.fillStyle(0x7a7d8c, 1); g.fillEllipse(x, y, 20 * s, 13 * s);
        g.fillStyle(0xaab0c0, 1); g.fillEllipse(x, y - 2 * s, 18 * s, 10 * s);
        g.fillStyle(c, 1); g.fillRect(x - 2 * s, y - 9 * s, 4 * s, 6 * s); g.fillRect(x - 2 * s, y - 9 * s, 8 * s, 2.5 * s);
        g.lineStyle(1, 0xffffff, 0.5); g.strokeEllipse(x, y + 4 * s, 26 * s, 8 * s);
        break;
      }
      case 'piece': {
        g.fillStyle(0x1a1a1a, 1); g.fillEllipse(x, y + 6 * s, 14 * s, 5 * s);
        g.fillStyle(0xe8e4d8, 1); g.fillTriangle(x - 6 * s, y + 6 * s, x + 6 * s, y + 6 * s, x, y - 6 * s);
        g.fillCircle(x, y - 8 * s, 4 * s);
        g.lineStyle(1, 0x333333, 0.8); g.strokeCircle(x, y - 8 * s, 4 * s);
        break;
      }
      case 'shark': {
        const ang = Math.atan2(-hd.y, -hd.x);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const pt = (lx: number, ly: number): { x: number; y: number } => ({ x: x + (lx * ca - ly * sa) * s, y: m.y + (lx * sa + ly * ca) * s });
        g.lineStyle(1.5, 0xa8e8e0, 0.5); g.strokeEllipse(x, m.y + 2, 34 * s, 10 * s);
        g.fillStyle(mix(c, 0x000000, 0.35), 1);
        g.fillPoints([pt(-16, 0), pt(-6, -6), pt(10, -5), pt(18, 0), pt(10, 5), pt(-6, 6)], true);
        g.fillTriangle(pt(-14, 0).x, pt(-14, 0).y, pt(-22, -7).x, pt(-22, -7).y, pt(-22, 7).x, pt(-22, 7).y);
        const fin = pt(0, 0);
        g.fillStyle(mix(c, 0x000000, 0.5), 1); g.fillTriangle(fin.x - 5, fin.y, fin.x + 5, fin.y, fin.x - 2, fin.y - 12 * s);
        g.fillStyle(0xffffff, 1); const e = pt(12, -2); g.fillCircle(e.x, e.y, 1.4 * s);
        break;
      }
      case 'crow': {
        const flap = Math.sin(time / 70 + m.phase) * 6 * s;
        g.fillStyle(0x15121a, 1); g.fillEllipse(x, y - 10 * s, 12 * s, 7 * s);
        g.fillTriangle(x - 2 * s, y - 10 * s, x - 14 * s, y - 14 * s - flap, x - 6 * s, y - 8 * s);
        g.fillTriangle(x + 2 * s, y - 10 * s, x + 14 * s, y - 14 * s - flap, x + 6 * s, y - 8 * s);
        g.fillStyle(0xffaa22, 1); g.fillTriangle(x + face * 5 * s, y - 11 * s, x + face * 9 * s, y - 10 * s, x + face * 5 * s, y - 9 * s);
        g.fillStyle(c, 1); g.fillCircle(x + face * 3 * s, y - 12 * s, 1.2 * s);
        break;
      }
    }
    if (m.maxHits > 1) {
      const ratio = m.hits / m.maxHits;
      g.fillStyle(0x000000, 0.6); g.fillRect(x - 10, y - 24 * s, 20, 3);
      g.fillStyle(c, 1); g.fillRect(x - 10, y - 24 * s, 20 * ratio, 3);
    }
  }

  private drawSentry(g: Phaser.GameObjects.Graphics, s: Sentry, time: number): void {
    const x = s.x, y = s.y, c = s.color;
    const birth = Math.min(1, (time - s.born) / 250);
    const life = Math.min(1, (s.until - time) / 600);
    const a = birth * life;
    g.fillStyle(0x000000, 0.3 * a); g.fillEllipse(x + 1, y + 7, 22, 8);
    switch (s.look) {
      case 'turret': {
        g.fillStyle(0x3a3a48, a); g.fillRect(x - 8, y - 2, 16, 9);
        g.fillStyle(mix(c, 0x000000, 0.2), a); g.fillCircle(x, y - 3, 7);
        g.lineStyle(3, 0x22222a, a); g.lineBetween(x, y - 3, x + Math.cos(s.facing) * 12, y - 3 + Math.sin(s.facing) * 12);
        g.fillStyle(0xffffff, 0.5 * a); g.fillCircle(x - 2, y - 5, 2);
        break;
      }
      case 'drone': {
        const hy = y - 14 + Math.sin(time / 160 + x) * 2;
        g.fillStyle(0x2a2a30, a); g.fillRect(x - 6, hy - 3, 12, 6);
        g.lineStyle(1, 0xffffff, 0.4 * a);
        const r = time / 30;
        for (const ox of [-9, 9]) g.lineBetween(x + ox + Math.cos(r) * 5, hy - 4, x + ox - Math.cos(r) * 5, hy - 4);
        g.fillStyle(c, a); g.fillCircle(x, hy + 2, 2);
        break;
      }
      case 'idol': {
        g.fillStyle(0x6a5a3a, a); g.fillRect(x - 6, y - 14, 12, 20);
        g.fillStyle(c, a); g.fillCircle(x, y - 14, 6);
        g.fillStyle(0x000000, a); g.fillCircle(x - 2, y - 15, 1.2); g.fillCircle(x + 2, y - 15, 1.2);
        g.lineStyle(1.5, c, 0.5 * a * (0.6 + Math.sin(time / 200) * 0.4)); g.strokeCircle(x, y - 14, 10);
        break;
      }
      case 'crystal': {
        g.fillStyle(mix(c, 0x000000, 0.2), a); g.fillTriangle(x - 6, y + 4, x + 6, y + 4, x, y - 18);
        g.fillStyle(mix(c, 0xffffff, 0.4), a); g.fillTriangle(x - 1, y + 2, x + 4, y + 2, x, y - 14);
        break;
      }
      case 'barracks': {
        g.fillStyle(0x5a4632, a); g.fillRect(x - 10, y - 8, 20, 14);
        g.fillStyle(c, a); g.fillTriangle(x - 12, y - 8, x + 12, y - 8, x, y - 18);
        g.fillStyle(0x1a1208, a); g.fillRect(x - 3, y - 2, 6, 8);
        break;
      }
      case 'pawn': {
        g.fillStyle(0x1a1a1a, a); g.fillEllipse(x, y + 5, 16, 6);
        g.fillStyle(c, a); g.fillTriangle(x - 7, y + 5, x + 7, y + 5, x, y - 8); g.fillCircle(x, y - 10, 5);
        break;
      }
      case 'hive': {
        g.fillStyle(0xd8a531, a); g.fillEllipse(x, y - 4, 16, 18);
        g.lineStyle(1, 0x7a5a10, a); for (let i = -1; i <= 1; i++) g.lineBetween(x - 7, y - 4 + i * 5, x + 7, y - 4 + i * 5);
        for (let i = 0; i < 3; i++) { const ang = time / 300 + i * 2.1; g.fillStyle(0xffdd33, a); g.fillCircle(x + Math.cos(ang) * 13, y - 6 + Math.sin(ang) * 6, 1.6); }
        break;
      }
    }
  }

  // ── Small effects ─────────────────────────────────────────────────

  burst(x: number, y: number, radius: number, color: number, shape: string): void {
    const scene = this.api.scene;
    const g = scene.add.graphics().setDepth(7.5);
    const draw = (p: number): void => {
      g.clear();
      const r = radius * (0.4 + 0.6 * p);
      if (shape === 'ring') {
        g.lineStyle(6 * (1 - p) + 1, color, 1 - p); g.strokeCircle(x, y, r);
      } else if (shape === 'crater' || shape === 'meteor') {
        g.fillStyle(0x221108, 0.5 * (1 - p)); g.fillEllipse(x, y + 4, radius * 2, radius * 1.3);
        g.fillStyle(color, 0.7 * (1 - p)); g.fillCircle(x, y, r * 0.8);
        g.fillStyle(0xffffff, 0.6 * (1 - p)); g.fillCircle(x, y, r * 0.3);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.fillStyle(color, 0.8 * (1 - p)); g.fillCircle(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, 4 * (1 - p) + 1); }
      } else if (shape === 'strike') {
        g.fillStyle(0xffffff, 0.8 * (1 - p)); g.fillRect(x - 6 * (1 - p), 0, 12 * (1 - p), y);
        g.fillStyle(color, 0.6 * (1 - p)); g.fillCircle(x, y, r);
        g.lineStyle(3, 0xffffff, 1 - p); g.strokeCircle(x, y, r * 1.1);
      } else if (shape === 'geyser') {
        g.fillStyle(color, 0.5 * (1 - p)); g.fillEllipse(x, y, radius * 1.6, radius * 0.7);
        g.fillStyle(0xffffff, 0.7 * (1 - p)); g.fillRect(x - 8 * (1 - p * 0.5), y - radius * 1.4 * p, 16 * (1 - p * 0.5), radius * 1.4 * p);
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.4; g.fillStyle(color, 0.8 * (1 - p)); g.fillCircle(x + Math.cos(a) * r, y - radius * p + Math.sin(a) * r * 0.6, 4); }
      } else {
        g.fillStyle(color, 0.55 * (1 - p)); g.fillCircle(x, y, r);
        g.fillStyle(0xffffff, 0.5 * (1 - p)); g.fillCircle(x, y, r * 0.45);
        g.lineStyle(2, color, 1 - p); g.strokeCircle(x, y, r * 1.15);
      }
    };
    draw(0);
    scene.tweens.addCounter({ from: 0, to: 1, duration: shape === 'crater' || shape === 'geyser' ? 520 : 380, ease: 'Cubic.easeOut', onUpdate: (tw) => draw(tw.getValue() ?? 0), onComplete: () => g.destroy() });
  }

  ring(x: number, y: number, r: number, color: number, ms: number): void {
    const time = this.api.scene.time.now;
    this.flashes.push({ kind: 'ring', pts: [x, y], radius: r, color, width: 2, until: time + ms, born: time });
  }

  zap(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const time = this.api.scene.time.now;
    this.flashes.push({ kind: 'poly', pts: [x1, y1, (x1 + x2) / 2, (y1 + y2) / 2, x2, y2], color, width: 2, until: time + 260, born: time });
  }

  private spark(x: number, y: number, color: number): void {
    const scene = this.api.scene;
    const g = scene.add.graphics().setDepth(7.5);
    g.fillStyle(color, 0.9); g.fillCircle(x, y, 7);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, 3);
    scene.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 160, onComplete: () => g.destroy() });
  }

  // ── Geometry ──────────────────────────────────────────────────────

  private leadPoint(h: RoadHusk, speed: number, fromX: number, fromY: number): { x: number; y: number } {
    const dist = Math.hypot(h.x - fromX, h.y - fromY);
    const t = dist / Math.max(60, speed);
    const time = this.api.scene.time.now;
    const v = h.roadSpeed * h.modeSpeedMult(time) * (h.frozenUntil > time ? 0 : 1) * (h.frostStacks > 0 ? Math.max(0.2, 1 - h.frostStacks * 0.1) : 1);
    const dir = h.confusedUntil > time ? -0.6 : 1;
    const ahead = h.track.pointAlong(h.pathDist + v * t * 0.9 * dir);
    const hd = h.track.headingAlong(h.pathDist);
    return { x: ahead.x - hd.y * h.lateral, y: ahead.y + hd.x * h.lateral };
  }

  private spread(p: { x: number; y: number }, off: number): { x: number; y: number } {
    return { x: p.x + off + (Math.random() - 0.5) * 20, y: p.y + (Math.random() - 0.5) * 20 };
  }

  private segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }
}

