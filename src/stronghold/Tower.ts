import Phaser from 'phaser';
import { findElementDef } from '../data/ElementRoster';
import { makeElementAvatar, elementBodyTexture } from '../elements/kits/ElementAvatars';
import { ArmGesture, BaseAvatar } from '../elements/kits/ElementVisuals';
import { fillHex, strokeHex, mix } from '../ui';
import {
  FxPatch, Rider, TargetMode, TowerAbilityDef, TowerActive, TowerBody, TowerDef, TowerMod, TowerSlot, TowerTraits,
  TowerUpgrade, pathBlock, PATH_MAX_TIER,
} from './StrongholdTypes';
import { TOWER_RADIUS } from './StrongholdMap';
import { OwnedDeco, collapseDecos, paintBaseDecos, paintLiveDecos } from './TowerDecos';

/** A timed buff a Rally, Overclock or ability put on this tower. */
export interface TowerBuff { until: number; fireRateMult: number; damageMult: number; rangeMult?: number }

/** What a husk can do to a tower. */
export type TowerSabotage = 'stun' | 'slow' | 'blind' | 'silence' | 'confuse';

const GESTURE_FOR_SLOT: Record<TowerSlot, ArmGesture> = {
  click: 'punch', e: 'sweep', r: 'slam', f: 'flex', q: 'raise',
};

/** The arm move an attack plays when it says nothing itself. */
function gestureFor(a: TowerAbilityDef): ArmGesture {
  if (a.gesture) return GESTURE_FOR_SLOT[a.gesture];
  switch (a.fx.kind) {
    case 'bolt': case 'chain': case 'execute': return 'punch';
    case 'line': case 'beam': return 'sweep';
    case 'splash': case 'nova': case 'trap': return 'slam';
    case 'rally': case 'overclock': case 'gold': case 'mend': return 'flex';
    default: return 'raise';
  }
}

/** Path accent colours: the plinth trim each path paints once it is past tier 2. */
export const PATH_TINT = [0xff9a3c, 0x7ad0ff, 0xc08bff];

/** How high a flyer hangs over its shadow. */
const FLY_LIFT = 22;

function mergeRider(a: Rider | undefined, b: Rider | undefined): Rider | undefined {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}

const AREA_KEYS = ['radius', 'length', 'jumpRange', 'splash', 'attackRange', 'blast', 'width'] as const;

/** Fold a modifier onto an attack. Returns a new object; never mutates the table. */
export function applyMod(def: TowerAbilityDef, mod: TowerMod): TowerAbilityDef {
  const fx = { ...def.fx, ...(mod.fx ?? {}) } as TowerAbilityDef['fx'] & Record<string, unknown>;
  if (mod.fx) (fx as { kind: string }).kind = def.fx.kind;
  if (mod.areaMult) {
    for (const k of AREA_KEYS) {
      if (k === 'width' && fx.kind !== 'line') continue;
      if (typeof fx[k] === 'number') (fx as Record<string, number>)[k] = (fx[k] as number) * mod.areaMult;
    }
  }
  if (mod.countAdd) {
    if (fx.kind === 'bolt') fx.count = (fx.count ?? 1) + mod.countAdd;
    else if (fx.kind === 'chain') fx.jumps += mod.countAdd;
    else if (fx.kind === 'trap') fx.count += mod.countAdd;
    else if (fx.kind === 'sentry') fx.max += mod.countAdd;
    else if (fx.kind === 'minion') fx.hits += mod.countAdd;
  }
  if (mod.pierceAdd) {
    if (fx.kind === 'bolt') fx.pierce = (fx.pierce ?? 0) + mod.pierceAdd;
    else if (fx.kind === 'trap') fx.hits += mod.pierceAdd;
    else if (fx.kind === 'minion') fx.hits += mod.pierceAdd;
  }
  return {
    ...def,
    fx: fx as TowerAbilityDef['fx'],
    damage: (def.damage + (mod.damageAdd ?? 0)) * (mod.damageMult ?? 1),
    cooldown: def.cooldown * (mod.cooldownMult ?? 1),
    range: (def.range ?? 1) * (mod.rangeMult ?? 1),
    rider: mergeRider(def.rider, mod.rider),
    dtype: mod.dtype ?? def.dtype,
    charge: mod.charge ?? def.charge,
  };
}

/** Patch an fx without a mod (journal previews use it too). */
export function patchFx(def: TowerAbilityDef, fx: FxPatch): TowerAbilityDef { return applyMod(def, { fx }); }

/** Display name of an attack: its own name, or its id title-cased. */
export function attackName(id: string, a: TowerAbilityDef): string {
  if (a.name) return a.name;
  return id.replace(/(^|-)([a-z])/g, (_m, sep: string, ch: string) => (sep ? ' ' : '') + ch.toUpperCase());
}

/** The tower as its upgrades have built it. */
interface Build {
  attacks: Record<string, TowerAbilityDef>;
  order: string[];
  traits: TowerTraits;
  rangeMult: number;
  active: TowerActive | null;
  body: TowerBody;
  decos: OwnedDeco[];
}

/** Resolve a def + path tiers into a build. Pure — the journal uses it for previews. */
export function buildTower(def: TowerDef, tiers: readonly number[]): Build {
  const attacks: Record<string, TowerAbilityDef> = { ...def.attacks };
  let order = Object.keys(def.attacks);
  const traits: TowerTraits = { ...def.traits };
  let rangeMult = 1;
  let active: TowerActive | null = null;
  const body: TowerBody = { ...def.body };
  const decos: OwnedDeco[] = [];
  const apply = (u: TowerUpgrade, path: number, tier: number): void => {
    for (const id of u.remove ?? []) { delete attacks[id]; order = order.filter((o) => o !== id); }
    for (const [id, a] of Object.entries(u.add ?? {})) {
      if (!attacks[id]) order.push(id);
      attacks[id] = a;
    }
    for (const [key, m] of Object.entries(u.mods ?? {})) {
      const ids = key === '*' ? order : [key];
      for (const id of ids) if (attacks[id]) attacks[id] = applyMod(attacks[id], m);
    }
    if (u.range) rangeMult *= u.range;
    if (u.traits) Object.assign(traits, u.traits);
    if (u.active) active = u.active;
    if (u.body) Object.assign(body, u.body);
    decos.push({ deco: u.deco, path, tier });
  };
  // Lower tiers first across all paths, so a tier-4 '*' mod reaches what tier 3 added.
  for (let tier = 0; tier < PATH_MAX_TIER; tier++) {
    for (let p = 0; p < 3; p++) {
      if (tiers[p] > tier) apply(def.paths[p].upgrades[tier], p, tier + 1);
    }
  }
  return { attacks, order, traits, rangeMult, active, body, decos: collapseDecos(decos) };
}

/** Hull style for naval towers. */
const NAVAL_STYLE: Record<string, 'ship' | 'sub' | 'lily' | 'raft'> = {
  magma: 'ship', depths: 'sub', water: 'lily',
};

let NEXT_ID = 1;

/**
 * One placed tower: an element's rig standing on its base (a hex plinth, a hull, a helipad),
 * three path tiers, the cooldowns of whatever its build carries, and whatever the husks are
 * doing to it. Casting itself happens in TowerCombat — the tower only decides *where it is*
 * and hands over fully resolved attacks.
 */
export class Tower {
  readonly id = NEXT_ID++;
  /** Tiers bought on the top, middle and bottom paths. */
  readonly tiers: [number, number, number] = [0, 0, 0];
  invested: number;
  kills = 0;
  damageDealt = 0;
  /** Waves cleared while it stood (Veteran). */
  wavesSurvived = 0;
  buffs: TowerBuff[] = [];
  readonly readyAt = new Map<string, number>();
  readonly lastCastAt = new Map<string, number>();
  activeReadyAt = 0;
  readonly color: number;
  readonly name: string;
  private build: Build;

  /** Where it was built. Flyers roam around it; everything else stays on it. */
  readonly padX: number;
  readonly padY: number;
  targetMode: TargetMode = 'first';
  /** Mortar-style aim point, when the player has set one. */
  aimPoint: { x: number; y: number } | null = null;

  // Husk sabotage
  stunUntil = 0;
  slowUntil = 0;
  blindUntil = 0;
  silenceUntil = 0;
  confuseUntil = 0;

  // Support auras and discounts from other towers, rewritten every frame by the scene.
  auraFireRate = 1;
  auraDamage = 1;
  auraRange = 1;
  auraDetect = false;
  auraPierce = 0;
  discountMult = 1;

  /** Death charges (Reap). */
  charges = 0;
  /** Focus: the husk it hit last and how many times in a row. */
  focusTarget: unknown = null;
  focusStacks = 0;
  /** Gold its hits have paid this wave (goldOnHit cap), and the fraction carried over. */
  hitGoldThisWave = 0;
  hitGoldAccum = 0;
  /** Where a flyer is heading; written by the scene each frame. */
  private goal: { x: number; y: number } | null = null;
  private flyT = Math.random() * Math.PI * 2;

  // Visuals
  private plinth: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Graphics;
  private bodyImg: Phaser.GameObjects.Image | null = null;
  private avatar: BaseAvatar | null = null;
  private rangeRing: Phaser.GameObjects.Graphics;
  private statusText: Phaser.GameObjects.Text;
  private facing = -Math.PI / 2;
  private destroyed = false;
  private selected = false;

  constructor(
    private scene: Phaser.Scene,
    public readonly elementId: string,
    public readonly def: TowerDef,
    public x: number,
    public y: number,
    paid: number = def.cost,
  ) {
    this.padX = x;
    this.padY = y;
    this.invested = paid;
    const ed = findElementDef(elementId);
    this.color = ed?.color ?? 0xffffff;
    this.name = ed?.name ?? elementId;
    this.build = buildTower(def, this.tiers);
    if (def.role === 'sniper' || def.role === 'artillery') this.targetMode = 'strong';

    this.plinth = scene.add.graphics().setDepth(2);
    this.rangeRing = scene.add.graphics().setDepth(2.5).setVisible(false);
    this.overlay = scene.add.graphics().setDepth(this.flies ? 8.6 : 5.6);
    this.statusText = scene.add.text(x, y - 46, '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9);
    this.paintPlinth();

    const depth = this.flies ? 8.5 : 5;
    const tex = elementBodyTexture(scene, elementId);
    if (tex) this.bodyImg = scene.add.image(x, y, tex).setDepth(depth).setScale(0.82);
    this.avatar = makeElementAvatar(elementId, scene, (c) => c);
    if (this.avatar) {
      this.avatar.setRigScale(0.82);
      this.avatar.setMastered(false);
      this.avatar.setFacing(this.facing);
    }
    this.paintRangeRing();
  }

  // ── Build ─────────────────────────────────────────────────────────

  get traits(): TowerTraits { return this.build.traits; }
  get body(): TowerBody { return this.build.body; }
  get active(): TowerActive | null { return this.build.active; }
  /** Attack ids in the order they were gained. */
  get attackIds(): string[] { return this.build.order; }
  attackDef(id: string): TowerAbilityDef | undefined { return this.build.attacks[id]; }
  get totalTier(): number { return this.tiers[0] + this.tiers[1] + this.tiers[2]; }
  /** "3-0-2", BTD-style. */
  get tierCode(): string { return this.tiers.join('-'); }
  get topTier(): number { return Math.max(...this.tiers); }

  /** The upgrade the path would buy next, or null when it is maxed. */
  nextUpgrade(path: number): TowerUpgrade | null {
    const t = this.tiers[path];
    return t >= PATH_MAX_TIER ? null : this.def.paths[path].upgrades[t];
  }
  /** Why the path can't be bought right now, or null. */
  pathBlocked(path: number): string | null { return pathBlock(this.tiers, path); }
  upgradeCost(path: number): number {
    const u = this.nextUpgrade(path);
    return u ? Math.round(u.cost * this.discountMult) : 0;
  }

  buyPath(path: number, paid: number): TowerUpgrade | null {
    if (this.pathBlocked(path)) return null;
    const u = this.nextUpgrade(path);
    if (!u) return null;
    this.tiers[path]++;
    this.invested += paid;
    this.build = buildTower(this.def, this.tiers);
    // A rebuilt list may drop attacks; forget their cooldowns.
    for (const k of [...this.readyAt.keys()]) if (!this.build.attacks[k]) this.readyAt.delete(k);
    this.paintPlinth();
    this.paintRangeRing();
    this.applyRigLook();
    this.avatar?.play('raise', -Math.PI / 2);
    return u;
  }

  /** The rig grows a little with every upgrade, and wears its mastered look at tier 5. */
  private applyRigLook(): void {
    const scale = 0.82 + this.totalTier * 0.018;
    this.avatar?.setRigScale(scale);
    this.bodyImg?.setScale(scale);
    this.avatar?.setMastered(this.topTier >= PATH_MAX_TIER);
  }

  get flies(): boolean { const k = this.def.body.kind; return k === 'ace' || k === 'heli' || k === 'drift'; }
  get sellValue(): number { return Math.round(this.invested * 0.7); }

  /** Base reach before blinds and rallies — what the placement ghost and panel show. */
  get baseRange(): number { return this.def.range * this.build.rangeMult; }

  get range(): number {
    const time = this.scene.time.now;
    let r = this.baseRange * this.auraRange * this.buffMults(time).range;
    if (this.blindUntil > time) r *= 0.65;
    return r;
  }

  /** Can it pick hidden husks out? */
  get detect(): boolean { return !!this.build.traits.detect || this.auraDetect; }

  get stunned(): boolean { return this.stunUntil > this.scene.time.now; }
  get silenced(): boolean { return this.silenceUntil > this.scene.time.now; }
  /** The targeting mode in force — a Psychic husk's mind game overrides the player's pick. */
  get effectiveMode(): TargetMode { return this.confuseUntil > this.scene.time.now ? 'last' : this.targetMode; }

  /** A husk tries to sabotage this tower. Returns false if it shrugs it off. */
  sabotage(kind: TowerSabotage, ms: number): boolean {
    if (this.build.traits.steadfast) return false;
    const until = this.scene.time.now + ms;
    switch (kind) {
      case 'stun': this.stunUntil = Math.max(this.stunUntil, until); break;
      case 'slow': this.slowUntil = Math.max(this.slowUntil, until); break;
      case 'blind': this.blindUntil = Math.max(this.blindUntil, until); break;
      case 'silence': this.silenceUntil = Math.max(this.silenceUntil, until); break;
      case 'confuse': this.confuseUntil = Math.max(this.confuseUntil, until); break;
    }
    return true;
  }

  buffMults(time: number): { fireRate: number; damage: number; range: number } {
    this.buffs = this.buffs.filter((b) => b.until > time);
    let fireRate = 1, damage = 1, range = 1;
    for (const b of this.buffs) {
      fireRate = Math.max(fireRate, b.fireRateMult);
      damage = Math.max(damage, b.damageMult);
      range = Math.max(range, b.rangeMult ?? 1);
    }
    return { fireRate, damage, range };
  }

  addBuff(b: TowerBuff): void { this.buffs.push(b); }

  /** Attacks that may fire right now — a silenced tower keeps only its first. */
  firingIds(): string[] {
    return this.silenced ? this.build.order.slice(0, 1) : this.build.order;
  }

  /** Everything that scales a cast right now: rallies, auras, sabotage, kill ramp, veterancy. */
  private liveMod(time: number): TowerMod {
    const b = this.buffMults(time);
    const t = this.build.traits;
    const ramp = t.killRamp ? 1 + Math.min(t.killRamp.cap, this.kills * t.killRamp.per) : 1;
    const vet = t.veteran ? 1 + Math.min(t.veteran.cap, this.wavesSurvived * t.veteran.per) : 1;
    const slowed = this.slowUntil > time ? 0.65 : 1;
    return {
      damageMult: b.damage * this.auraDamage * ramp * vet,
      cooldownMult: 1 / (b.fireRate * this.auraFireRate * slowed),
      pierceAdd: this.auraPierce || undefined,
    };
  }

  /** The attack with rallies, auras and sabotage folded in. */
  resolve(id: string, time: number): TowerAbilityDef | null {
    const a = this.build.attacks[id];
    if (!a) return null;
    let out = applyMod(a, this.liveMod(time));
    if (a.charge) {
      const since = (time - (this.lastCastAt.get(id) ?? time - 1000)) / 1000;
      out = { ...out, damage: out.damage * Math.min(a.charge.cap, 1 + a.charge.perSec * since) };
    }
    return out;
  }

  /** Resolve someone else's attack as if this tower were casting it (Illusion's mimic). */
  resolveForeign(a: TowerAbilityDef, time: number): TowerAbilityDef {
    return applyMod(a, this.liveMod(time));
  }

  resolveActive(time: number): TowerAbilityDef | null {
    const c = this.build.active?.cast;
    return c ? applyMod(c, this.liveMod(time)) : null;
  }

  activeReady(time: number): boolean { return !!this.build.active && time >= this.activeReadyAt; }

  // ── Movement ──────────────────────────────────────────────────────


  /** Where a hover/drift flyer should head. Ignored by ground, naval and ace bodies. */
  setGoal(p: { x: number; y: number } | null): void { this.goal = p; }

  private move(delta: number): void {
    const body = this.body;
    const dt = delta / 1000;
    if (this.stunned) return;
    if (body.kind === 'ace') {
      // A wide figure-eight around the pad.
      const r = body.leash ?? 120;
      this.flyT += dt * (body.speed ?? 180) / r;
      const nx = this.padX + Math.sin(this.flyT) * r;
      const ny = this.padY + Math.sin(this.flyT * 2) * r * 0.45;
      this.facing = Math.atan2(ny - this.y, nx - this.x);
      this.x = nx; this.y = ny;
      this.avatar?.setFacing(this.facing);
    } else if (body.kind === 'heli' || body.kind === 'drift' || body.kind === 'roam') {
      const leash = body.leash ?? 160;
      const want = this.goal ?? { x: this.padX, y: this.padY };
      let gx = want.x, gy = want.y;
      const dPad = Math.hypot(gx - this.padX, gy - this.padY);
      if (dPad > leash) { gx = this.padX + (gx - this.padX) / dPad * leash; gy = this.padY + (gy - this.padY) / dPad * leash; }
      if (body.kind === 'heli' && this.goal) {
        // Hover off to one side of the target rather than right on top of it.
        this.flyT += dt * 1.6;
        gx += Math.cos(this.flyT) * 46; gy += Math.sin(this.flyT) * 30;
      }
      const dx = gx - this.x, dy = gy - this.y;
      const d = Math.hypot(dx, dy);
      const step = (body.speed ?? 150) * dt;
      if (d > 1) {
        const k = Math.min(1, step / d);
        this.x += dx * k; this.y += dy * k;
      }
    }
  }

  // ── Per frame ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.destroyed) return;
    this.move(delta);
    const lift = this.flies ? FLY_LIFT + Math.sin(time / 300 + this.id) * 2 : 0;
    this.bodyImg?.setPosition(this.x, this.y - lift);
    this.avatar?.update(delta, this.x, this.y - lift, 1);
    this.paintOverlay(time, lift);
    if ((this.flies || this.body.kind === 'roam') && this.selected) this.paintRangeRing();
  }

  lookAt(x: number, y: number): void {
    if (this.body.kind === 'ace') return; // a plane faces where it flies
    this.facing = Math.atan2(y - this.y, x - this.x);
    this.avatar?.setFacing(this.facing);
  }

  get facingAngle(): number { return this.facing; }

  gesture(a: TowerAbilityDef | 'active'): void {
    this.avatar?.play(a === 'active' ? 'clap' : gestureFor(a), this.facing);
  }

  setSelected(on: boolean): void {
    this.selected = on;
    this.rangeRing.setVisible(on);
    if (on) this.paintRangeRing();
  }

  contains(px: number, py: number): boolean {
    if (Math.hypot(px - this.padX, py - this.padY) <= TOWER_RADIUS + 6) return true;
    if (this.body.kind === 'roam') return Math.hypot(px - this.x, py - this.y) <= TOWER_RADIUS + 4;
    return this.flies && Math.hypot(px - this.x, py - (this.y - FLY_LIFT)) <= TOWER_RADIUS + 4;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.plinth.destroy();
    this.overlay.destroy();
    this.rangeRing.destroy();
    this.statusText.destroy();
    this.bodyImg?.destroy();
    this.avatar?.destroy();
    this.avatar = null;
  }

  // ── Paint ─────────────────────────────────────────────────────────

  /** Three little arcs of five pips under the base: the tower's tier code at a glance. */
  private paintPips(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    for (let p = 0; p < 3; p++) {
      const mid = Math.PI / 2 + (p - 1) * 0.78;
      for (let i = 0; i < 5; i++) {
        const ang = mid + (i - 2) * 0.13;
        const px = cx + Math.cos(ang) * (r + 4);
        const py = cy + Math.sin(ang) * (r + 4) * 0.85;
        const lit = i < this.tiers[p];
        g.fillStyle(lit ? PATH_TINT[p] : 0x0a0a14, lit ? 1 : 0.7);
        g.fillCircle(px, py, lit ? 2.4 : 1.8);
        if (lit) { g.fillStyle(0xffffff, 0.55); g.fillCircle(px - 0.6, py - 0.6, 0.9); }
      }
    }
  }

  /** The trim colour: the tower's own, or its leading path's once that path is past tier 2. */
  private trimColor(): number {
    let best = -1, tier = 2;
    for (let p = 0; p < 3; p++) if (this.tiers[p] > tier) { tier = this.tiers[p]; best = p; }
    return best < 0 ? mix(this.color, 0xffffff, 0.25) : mix(PATH_TINT[best], this.color, 0.35);
  }

  private paintPlinth(): void {
    const g = this.plinth;
    g.clear();
    const r = TOWER_RADIUS + 4;
    const x = this.padX, y = this.padY;
    const k = this.body.kind;
    if (k === 'water' || (k === 'amphibious' && NAVAL_STYLE[this.elementId])) {
      const style = NAVAL_STYLE[this.elementId] ?? 'raft';
      // Wake rings under every hull.
      g.lineStyle(1.5, 0xbfe6ff, 0.35); g.strokeEllipse(x, y + 8, r * 2.6, r * 1.2);
      g.lineStyle(1, 0xbfe6ff, 0.2); g.strokeEllipse(x, y + 8, r * 3.1, r * 1.5);
      if (style === 'ship') {
        // A pirate hull: planked, curved bow, a mast behind the captain and a black sail.
        g.fillStyle(0x2a1a0e, 1);
        g.fillPoints([{ x: x - 34, y: y + 2 }, { x: x + 38, y: y + 2 }, { x: x + 26, y: y + 18 }, { x: x - 26, y: y + 18 }], true);
        g.fillStyle(0x5a3a1e, 1);
        g.fillPoints([{ x: x - 32, y: y }, { x: x + 34, y: y }, { x: x + 24, y: y + 13 }, { x: x - 24, y: y + 13 }], true);
        g.lineStyle(1, 0x2a1a0e, 0.8);
        g.lineBetween(x - 28, y + 6, x + 30, y + 6);
        g.fillStyle(0x1a1a1a, 1); for (let i = -2; i <= 2; i++) g.fillCircle(x + i * 11, y + 9, 2);
        g.lineStyle(3, 0x3a2a18, 1); g.lineBetween(x - 14, y + 2, x - 14, y - 40);
        g.fillStyle(0x15151a, 0.95); g.fillTriangle(x - 13, y - 38, x - 13, y - 12, x + 4, y - 22);
        g.fillStyle(0xeeeeee, 0.9); g.fillCircle(x - 8, y - 24, 2.5);
      } else if (style === 'sub') {
        g.fillStyle(0x0a2a30, 1); g.fillEllipse(x, y + 8, r * 2.4, r * 0.9);
        g.fillStyle(0x0e8f9c, 0.9); g.fillEllipse(x, y + 6, r * 2.2, r * 0.7);
        g.fillStyle(0x0a2a30, 1); g.fillRect(x + 14, y - 12, 4, 16); g.fillRect(x + 14, y - 12, 10, 3);
        g.fillStyle(0xffee88, 0.8); g.fillCircle(x - 14, y + 6, 2.5); g.fillCircle(x - 4, y + 6, 2.5);
      } else if (style === 'lily') {
        g.fillStyle(0x1f6a2e, 1); g.fillCircle(x, y + 6, r);
        g.fillStyle(0x2f8f3e, 1); g.fillCircle(x, y + 4, r - 3);
        g.fillStyle(0x1f6a2e, 1); g.fillTriangle(x, y + 4, x + r, y - 6, x + r, y + 10);
        g.lineStyle(1, 0x5fcf6e, 0.6); for (let i = 0; i < 6; i++) { const a = i * 1.05; g.lineBetween(x, y + 4, x + Math.cos(a) * (r - 4), y + 4 + Math.sin(a) * (r - 4)); }
      } else {
        g.fillStyle(0x3a2814, 1); g.fillRoundedRect(x - r, y - 4, r * 2, 18, 4);
        g.lineStyle(1, 0x1a1008, 0.9); for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 10, y - 4, x + i * 10, y + 14);
      }
      paintBaseDecos(g, x, y + 4, r, this.build.decos, this.color);
      this.paintPips(g, x, y + 4, r);
      return;
    }
    if (this.flies || k === 'roam') {
      // A landing pad (or a hunter's den): a ringed disc with a launch arrow.
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + 6, r * 2, r);
      g.fillStyle(mix(0x1a1a28, this.color, 0.2), 1); g.fillCircle(x, y + 2, r - 4);
      g.lineStyle(2, mix(this.color, 0xffffff, 0.3), 0.8); g.strokeCircle(x, y + 2, r - 4);
      g.lineStyle(1, this.color, 0.4); g.strokeCircle(x, y + 2, r - 10);
      g.lineStyle(2, mix(this.color, 0xffffff, 0.5), 0.8);
      g.lineBetween(x - 6, y + 6, x, y - 4); g.lineBetween(x + 6, y + 6, x, y - 4);
      paintBaseDecos(g, x, y + 2, r, this.build.decos, this.color);
      this.paintPips(g, x, y + 2, r);
      return;
    }
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(x + 2, y + 10, r * 2.2, r * 1.1);
    fillHex(g, x, y + 4, r, mix(0x1a1a28, this.color, 0.25), 1);
    fillHex(g, x, y + 1, r, mix(0x2a2a3c, this.color, 0.35), 1);
    strokeHex(g, x, y + 1, r, this.trimColor(), 0.9, this.topTier >= 3 ? 3 : 2);
    if (this.topTier >= 5) strokeHex(g, x, y + 1, r + 4, this.trimColor(), 0.45, 1.5);
    strokeHex(g, x, y + 1, r - 5, this.color, 0.35, 1);
    paintBaseDecos(g, x, y + 1, r, this.build.decos, this.color);
    this.paintPips(g, x, y + 1, r);
  }

  /** Flyer shadow and tether, cloud puffs, and the sabotage tells. */
  private paintOverlay(time: number, lift: number): void {
    const g = this.overlay;
    g.clear();
    const k = this.body.kind;
    if (this.flies) {
      // The shadow stays on the ground; a faint tether ties a flyer to its pad when selected.
      const shadow = this.plinth; void shadow;
      g.fillStyle(0x000000, 0.28); g.fillEllipse(this.x, this.y + 8, 34, 12);
      if (k === 'drift') {
        const y = this.y - lift + 14;
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + time / 2400;
          g.fillStyle(i % 2 ? 0x6b7790 : 0x8b97b0, 0.85);
          g.fillCircle(this.x + Math.cos(a) * 18, y + Math.sin(a) * 6, 11);
        }
        g.fillStyle(0xaab4cc, 0.9); g.fillEllipse(this.x, y - 2, 40, 16);
        if (Math.sin(time / 90) > 0.6) { g.lineStyle(2, 0xffee66, 0.8); g.lineBetween(this.x - 4, y + 8, this.x + 2, y + 18); }
      } else if (k === 'heli') {
        // Rotor blur over a hover flyer.
        const a = time / 40;
        g.lineStyle(2, 0xffffff, 0.35);
        g.lineBetween(this.x + Math.cos(a) * 26, this.y - lift - 26 + Math.sin(a) * 6, this.x - Math.cos(a) * 26, this.y - lift - 26 - Math.sin(a) * 6);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(this.x, this.y - lift - 26, 2.5);
      } else if (k === 'ace') {
        // Contrail.
        const back = this.facing + Math.PI;
        g.lineStyle(3, 0xffffff, 0.18);
        g.lineBetween(this.x, this.y - lift, this.x + Math.cos(back) * 40, this.y - lift + Math.sin(back) * 40);
      }
      if (this.selected) {
        g.lineStyle(1, this.color, 0.35);
        g.lineBetween(this.padX, this.padY, this.x, this.y);
      }
    }
    paintLiveDecos(g, this.x, this.y - lift, time, this.build.decos, this.color);
    if (this.topTier >= 5) {
      // A tier-5 tower glows.
      const p = (time / 1400) % 1;
      g.lineStyle(2, this.trimColor(), 0.35 * (1 - p)); g.strokeCircle(this.x, this.y - lift - 6, 26 + p * 14);
    }
    // Sabotage tells, over the head.
    const hx = this.x, hy = this.y - lift - 52;
    const labels: string[] = [];
    if (this.stunUntil > time) {
      labels.push('STUNNED');
      for (let i = 0; i < 3; i++) {
        const a = time / 200 + i * 2.1;
        g.fillStyle(0xffee66, 0.95); g.fillCircle(hx + Math.cos(a) * 12, hy + Math.sin(a) * 4, 2.6);
      }
    }
    if (this.silenceUntil > time) { labels.push('SILENCED'); g.lineStyle(2, 0xc0304f, 0.8); g.strokeCircle(this.x, this.y - lift, 26); g.lineBetween(this.x - 18, this.y - lift - 18, this.x + 18, this.y - lift + 18); }
    if (this.slowUntil > time) { labels.push('SLOWED'); g.lineStyle(2, 0x88ccff, 0.6); g.strokeCircle(this.x, this.y - lift, 22); }
    if (this.blindUntil > time) { labels.push('BLINDED'); g.fillStyle(0xfff4a8, 0.18); g.fillCircle(this.x, this.y - lift, 26); }
    if (this.confuseUntil > time) labels.push('CONFUSED');
    if (this.charges > 0 && this.traits.reap) {
      for (let i = 0; i < this.traits.reap.need; i++) {
        g.fillStyle(i < this.charges ? 0xb8a8ff : 0x222233, 0.9);
        g.fillCircle(this.padX - 14 + i * (28 / Math.max(1, this.traits.reap.need - 1)), this.padY + 22, 2.5);
      }
    }
    this.statusText.setPosition(hx, hy - 8).setText(labels.join(' '));
  }

  private paintRangeRing(): void {
    const g = this.rangeRing;
    g.clear();
    const k = this.body.kind;
    if (k === 'ace' || k === 'heli' || k === 'drift' || k === 'roam') {
      // Where it may roam, then what it can reach from where it is now.
      const leash = this.body.leash ?? 140;
      g.lineStyle(1, this.color, 0.3);
      if (k === 'ace') g.strokeEllipse(this.padX, this.padY, leash * 2, leash * 0.9);
      else g.strokeCircle(this.padX, this.padY, leash);
    }
    // A mortar reaches the whole map; a ring that size would only wash the field out.
    if (this.range > 900) {
      g.lineStyle(1.5, this.color, 0.45);
      g.strokeCircle(this.x, this.y, 40);
      return;
    }
    g.fillStyle(this.color, 0.07);
    g.fillCircle(this.x, this.y, this.range);
    g.lineStyle(1.5, this.color, 0.45);
    g.strokeCircle(this.x, this.y, this.range);
  }
}
