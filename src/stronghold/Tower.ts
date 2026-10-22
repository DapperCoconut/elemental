import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ELEMENT_DATA_MAP, findElementDef } from '../data/ElementRoster';
import { ALL_UPGRADES } from '../data/Upgrades';
import { perkLoadoutLabel } from '../data/Perks';
import { getMasteryDef, isMasteryComplete } from '../data/Mastery';
import { makeElementAvatar, elementBodyTexture } from '../elements/kits/ElementAvatars';
import { ArmGesture, BaseAvatar } from '../elements/kits/ElementVisuals';
import { fillHex, strokeHex, mix } from '../ui';
import {
  Rider, TargetMode, TowerAbilityDef, TowerDef, TowerMod, TowerSlot, TOWER_SLOTS, TOWER_SLOT_KEYS,
  TIER_COOLDOWN_MULT, TIER_COST_MULT, TIER_DAMAGE_MULT, TIER_RANGE_MULT,
} from './StrongholdTypes';
import { TOWER_RADIUS } from './StrongholdMap';

/** A timed buff a Rally or Overclock put on this tower. */
export interface TowerBuff { until: number; fireRateMult: number; damageMult: number; rangeMult?: number }

/** What a husk can do to a tower. */
export type TowerSabotage = 'stun' | 'slow' | 'blind' | 'silence' | 'confuse';

/** What the panel prints about one slot. */
export interface SlotInfo {
  slot: TowerSlot;
  key: string;
  name: string;
  desc: string;
  unlocked: boolean;
  unlocksAt: string;
  upgradeName: string | null;
  upgradeNote: string | null;
}

const GESTURE_FOR_SLOT: Record<TowerSlot, ArmGesture> = {
  click: 'punch', e: 'sweep', r: 'slam', f: 'flex', q: 'raise',
};

/** Generic bonus an equipped perk gives a tower. Flavour comes from the perk's own name. */
const PERK_BONUS: TowerMod = { damageMult: 1.1, rangeMult: 1.06, cooldownMult: 0.94, note: '' };

/** How high a flyer hangs over its shadow. */
const FLY_LIFT = 22;

function mergeRider(a: Rider | undefined, b: Rider | undefined): Rider | undefined {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}

/** Fold a modifier onto a resolved ability. Returns a new object; never mutates the table. */
export function applyMod(def: TowerAbilityDef, mod: TowerMod): TowerAbilityDef {
  const fx = { ...def.fx } as TowerAbilityDef['fx'] & Record<string, unknown>;
  if (mod.areaMult) {
    for (const k of ['radius', 'length', 'jumpRange', 'splash', 'attackRange', 'blast', 'width'] as const) {
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
    damage: def.damage * (mod.damageMult ?? 1),
    cooldown: def.cooldown * (mod.cooldownMult ?? 1),
    range: (def.range ?? 1) * (mod.rangeMult ?? 1),
    rider: mergeRider(def.rider, mod.rider),
  };
}

/** The element's real ability name on this slot (first of its displayKey), or the tower table's. */
export function towerAbilityName(elementId: string, slot: TowerSlot, def: TowerAbilityDef): string {
  if (def.name) return def.name;
  const key = TOWER_SLOT_KEYS[slot];
  const el = ELEMENT_DATA_MAP[elementId];
  const found = el?.abilities.find((a) => a.displayKey === key);
  return found?.name ?? `${key} Strike`;
}

/** Hull style for naval towers. */
const NAVAL_STYLE: Record<string, 'ship' | 'sub' | 'lily' | 'raft'> = {
  magma: 'ship', depths: 'sub', water: 'lily',
};

let NEXT_ID = 1;

/**
 * One placed tower: an element's rig standing on its base (a hex plinth, a hull, a helipad), a
 * tier, the cooldowns of whatever it has unlocked, and whatever the husks are doing to it.
 * Casting itself happens in TowerCombat — the tower only decides *where it is* and hands over
 * fully resolved abilities.
 */
export class Tower {
  readonly id = NEXT_ID++;
  tier = 0;
  invested: number;
  kills = 0;
  damageDealt = 0;
  buffs: TowerBuff[] = [];
  readonly readyAt: Record<TowerSlot, number> = { click: 0, e: 0, r: 0, f: 0, q: 0 };
  masteryReadyAt = 0;
  readonly color: number;
  readonly name: string;
  readonly masteryOn: boolean;
  readonly perkName: string | null;
  private readonly ownedUpgrades: Set<TowerSlot>;

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

  // Support auras from other towers, rewritten every frame by the scene.
  auraFireRate = 1;
  auraDamage = 1;
  auraRange = 1;
  auraDetect = false;
  auraPierce = 0;

  /** Death charges (Death's Reap signature). */
  charges = 0;
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
  ) {
    this.padX = x;
    this.padY = y;
    this.invested = def.cost;
    const ed = findElementDef(elementId);
    this.color = ed?.color ?? 0xffffff;
    this.name = ed?.name ?? elementId;
    this.masteryOn = PlayerData.isMasteryEnabled(elementId) && !!def.mastery && !!getMasteryDef(elementId)
      // Gold and Harvest replaced elements whose retired masteries may have left the flag on, and
      // Psychic's, Magnet's and Radiation's masteries were redone outright.
      && ((elementId !== 'fortune' && elementId !== 'gluttony' && elementId !== 'psychic' && elementId !== 'magnet' && elementId !== 'radiation' && elementId !== 'passion' && elementId !== 'sound' && elementId !== 'dream') || isMasteryComplete(elementId));
    const perkId = PlayerData.getEquippedPerk(elementId);
    this.perkName = perkLoadoutLabel(perkId);
    this.ownedUpgrades = new Set(
      TOWER_SLOTS.filter((s) => PlayerData.isUpgradeActive(elementId, s) && def.upgrades[s]),
    );
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
      this.avatar.setMastered(this.masteryOn);
      this.avatar.setFacing(this.facing);
    }
    this.paintRangeRing();
  }

  // ── Stats ─────────────────────────────────────────────────────────

  get flies(): boolean { const k = this.def.body.kind; return k === 'ace' || k === 'heli' || k === 'drift'; }
  get tierName(): string { return this.def.tiers[this.tier]; }
  get isMaxed(): boolean { return this.tier >= 4; }
  get nextTierCost(): number {
    return this.isMaxed ? 0 : Math.round(this.def.cost * TIER_COST_MULT[this.tier + 1]);
  }
  get sellValue(): number { return Math.round(this.invested * 0.7); }

  /** Base reach before blinds and rallies — what the placement ghost and panel show. */
  get baseRange(): number {
    return this.def.range * TIER_RANGE_MULT[this.tier] * (this.perkName ? PERK_BONUS.rangeMult! : 1);
  }

  get range(): number {
    const time = this.scene.time.now;
    let r = this.baseRange * this.auraRange * this.buffMults(time).range;
    if (this.blindUntil > time) r *= 0.65;
    return r;
  }

  /** Can it pick hidden husks out? */
  get detect(): boolean {
    const t = this.def.traits;
    return !!t.detect || (t.detectTier !== undefined && this.tier >= t.detectTier) || this.auraDetect;
  }

  get stunned(): boolean { return this.stunUntil > this.scene.time.now; }
  get silenced(): boolean { return this.silenceUntil > this.scene.time.now; }
  /** The targeting mode in force — a Psychic husk's mind game overrides the player's pick. */
  get effectiveMode(): TargetMode { return this.confuseUntil > this.scene.time.now ? 'last' : this.targetMode; }

  /** A husk tries to sabotage this tower. Returns false if it shrugs it off. */
  sabotage(kind: TowerSabotage, ms: number): boolean {
    if (this.def.traits.steadfast) return false;
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

  unlockedSlots(): TowerSlot[] {
    const all = TOWER_SLOTS.slice(0, this.tier + 1);
    return this.silenced ? all.slice(0, 1) : all;
  }

  /** Everything that scales a cast right now: tier, rally, aura, sabotage, kill ramp. */
  private liveMod(time: number): TowerMod {
    const b = this.buffMults(time);
    const kr = this.def.traits.killRamp;
    const ramp = kr ? 1 + Math.min(kr.cap, this.kills * kr.per) : 1;
    const slowed = this.slowUntil > time ? 0.65 : 1;
    return {
      damageMult: TIER_DAMAGE_MULT[this.tier] * b.damage * this.auraDamage * ramp,
      cooldownMult: TIER_COOLDOWN_MULT[this.tier] / (b.fireRate * this.auraFireRate * slowed),
      pierceAdd: this.auraPierce || undefined,
      note: '',
    };
  }

  /** The ability on `slot` with tier, upgrade, perk, rallies and auras folded in. */
  resolve(slot: TowerSlot, time: number): TowerAbilityDef {
    let a = this.def.abilities[slot];
    const up = this.ownedUpgrades.has(slot) ? this.def.upgrades[slot] : undefined;
    if (up) a = applyMod(a, up);
    if (this.perkName) a = applyMod(a, PERK_BONUS);
    return applyMod(a, this.liveMod(time));
  }

  /** Resolve someone else's ability as if this tower were casting it (Illusion's mimic). */
  resolveForeign(a: TowerAbilityDef, time: number): TowerAbilityDef {
    return applyMod(a, this.liveMod(time));
  }

  resolveMastery(time: number): (TowerAbilityDef & { name: string }) | null {
    if (!this.masteryOn || !this.def.mastery) return null;
    const a = applyMod(this.def.mastery, this.liveMod(time));
    return { ...a, name: this.def.mastery.name };
  }

  slotInfo(): SlotInfo[] {
    return TOWER_SLOTS.map((slot, i) => {
      const def = this.def.abilities[slot];
      const up = this.ownedUpgrades.has(slot) ? this.def.upgrades[slot] : undefined;
      const upDef = up
        ? ALL_UPGRADES.find((u) => u.elementId === this.elementId)?.upgrades.find((u) => u.slot === slot)
        : undefined;
      return {
        slot,
        key: TOWER_SLOT_KEYS[slot],
        name: towerAbilityName(this.elementId, slot, def),
        desc: def.desc,
        unlocked: i <= this.tier,
        unlocksAt: this.def.tiers[i],
        upgradeName: upDef?.name ?? null,
        upgradeNote: up?.note ?? null,
      };
    });
  }

  upgrade(): void {
    if (this.isMaxed) return;
    this.invested += this.nextTierCost;
    this.tier++;
    this.paintPlinth();
    this.paintRangeRing();
    this.avatar?.play('raise', -Math.PI / 2);
  }

  // ── Movement ──────────────────────────────────────────────────────

  /** Where a hover/drift flyer should head. Ignored by ground, naval and ace bodies. */
  setGoal(p: { x: number; y: number } | null): void { this.goal = p; }

  private move(delta: number): void {
    const body = this.def.body;
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
    if ((this.flies || this.def.body.kind === 'roam') && this.selected) this.paintRangeRing();
  }

  lookAt(x: number, y: number): void {
    if (this.def.body.kind === 'ace') return; // a plane faces where it flies
    this.facing = Math.atan2(y - this.y, x - this.x);
    this.avatar?.setFacing(this.facing);
  }

  get facingAngle(): number { return this.facing; }

  gesture(slot: TowerSlot | 'mastery'): void {
    this.avatar?.play(slot === 'mastery' ? 'clap' : GESTURE_FOR_SLOT[slot], this.facing);
  }

  setSelected(on: boolean): void {
    this.selected = on;
    this.rangeRing.setVisible(on);
    if (on) this.paintRangeRing();
  }

  contains(px: number, py: number): boolean {
    if (Math.hypot(px - this.padX, py - this.padY) <= TOWER_RADIUS + 6) return true;
    if (this.def.body.kind === 'roam') return Math.hypot(px - this.x, py - this.y) <= TOWER_RADIUS + 4;
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

  private paintPips(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 2 + (i - 1.5) * 0.42;
      const px = cx + Math.cos(ang) * (r - 2);
      const py = cy + Math.sin(ang) * (r - 2);
      const lit = i < this.tier;
      g.fillStyle(lit ? this.color : 0x0a0a14, lit ? 1 : 0.8);
      g.fillCircle(px, py, 3.2);
      if (lit) { g.fillStyle(0xffffff, 0.6); g.fillCircle(px - 0.8, py - 0.8, 1.2); }
    }
  }

  private paintPlinth(): void {
    const g = this.plinth;
    g.clear();
    const r = TOWER_RADIUS + 4;
    const x = this.padX, y = this.padY;
    const k = this.def.body.kind;
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
      this.paintPips(g, x, y + 2, r);
      return;
    }
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(x + 2, y + 10, r * 2.2, r * 1.1);
    fillHex(g, x, y + 4, r, mix(0x1a1a28, this.color, 0.25), 1);
    fillHex(g, x, y + 1, r, mix(0x2a2a3c, this.color, 0.35), 1);
    strokeHex(g, x, y + 1, r, mix(this.color, 0xffffff, 0.25), 0.9, 2);
    strokeHex(g, x, y + 1, r - 5, this.color, 0.35, 1);
    this.paintPips(g, x, y + 1, r);
  }

  /** Flyer shadow and tether, cloud puffs, and the sabotage tells. */
  private paintOverlay(time: number, lift: number): void {
    const g = this.overlay;
    g.clear();
    const k = this.def.body.kind;
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
    // Sabotage tells, over the head.
    const hx = this.x, hy = this.y - lift - 34;
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
    if (this.charges > 0 && this.def.traits.reap) {
      for (let i = 0; i < this.def.traits.reap.need; i++) {
        g.fillStyle(i < this.charges ? 0xb8a8ff : 0x222233, 0.9);
        g.fillCircle(this.padX - 14 + i * (28 / Math.max(1, this.def.traits.reap.need - 1)), this.padY + 22, 2.5);
      }
    }
    this.statusText.setPosition(hx, hy - 8).setText(labels.join(' '));
  }

  private paintRangeRing(): void {
    const g = this.rangeRing;
    g.clear();
    const k = this.def.body.kind;
    if (k === 'ace' || k === 'heli' || k === 'drift' || k === 'roam') {
      // Where it may roam, then what it can reach from where it is now.
      const leash = this.def.body.leash ?? 140;
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
