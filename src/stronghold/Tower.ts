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
  Rider, TowerAbilityDef, TowerDef, TowerMod, TowerSlot, TOWER_SLOTS, TOWER_SLOT_KEYS,
  TIER_COOLDOWN_MULT, TIER_COST_MULT, TIER_DAMAGE_MULT, TIER_RANGE_MULT,
} from './StrongholdTypes';
import { TOWER_RADIUS } from './StrongholdMap';

/** A timed buff a Rally put on this tower. */
export interface TowerBuff { until: number; fireRateMult: number; damageMult: number }

/** What the panel prints about one slot. */
export interface SlotInfo {
  slot: TowerSlot;
  key: string;
  name: string;
  desc: string;
  unlocked: boolean;
  /** Tier name that unlocks it, for locked rows. */
  unlocksAt: string;
  /** Owned shop upgrade folded in, if any. */
  upgradeName: string | null;
  upgradeNote: string | null;
}

const GESTURE_FOR_SLOT: Record<TowerSlot, ArmGesture> = {
  click: 'punch', e: 'sweep', r: 'slam', f: 'flex', q: 'raise',
};

/** Generic bonus an equipped perk gives a tower. Flavour comes from the perk's own name. */
const PERK_BONUS: TowerMod = { damageMult: 1.1, rangeMult: 1.06, cooldownMult: 0.94, note: '' };

function mergeRider(a: Rider | undefined, b: Rider | undefined): Rider | undefined {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}

/** Fold a modifier onto a resolved ability. Returns a new object; never mutates the table. */
export function applyMod(def: TowerAbilityDef, mod: TowerMod): TowerAbilityDef {
  const fx = { ...def.fx } as TowerAbilityDef['fx'] & Record<string, unknown>;
  if (mod.areaMult) {
    for (const k of ['radius', 'length', 'jumpRange', 'splash', 'attackRange'] as const) {
      if (typeof fx[k] === 'number') (fx as Record<string, number>)[k] = (fx[k] as number) * mod.areaMult;
    }
  }
  if (mod.countAdd) {
    if (fx.kind === 'bolt') fx.count = (fx.count ?? 1) + mod.countAdd;
    else if (fx.kind === 'chain') fx.jumps += mod.countAdd;
  }
  if (mod.pierceAdd && fx.kind === 'bolt') fx.pierce = (fx.pierce ?? 0) + mod.pierceAdd;
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

let NEXT_ID = 1;

/**
 * One placed tower: an element's rig standing on a hex plinth, a tier, and the cooldowns of
 * whatever it has unlocked. Casting itself happens in TowerCombat — the tower only decides
 * *when* and hands over a fully resolved ability.
 */
export class Tower {
  readonly id = NEXT_ID++;
  tier = 0;
  /** Gold spent on this tower so far — the sell price comes off it. */
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

  // Visuals
  private plinth: Phaser.GameObjects.Graphics;
  private bodyImg: Phaser.GameObjects.Image | null = null;
  private avatar: BaseAvatar | null = null;
  private rangeRing: Phaser.GameObjects.Graphics;
  private facing = -Math.PI / 2;
  private destroyed = false;

  constructor(
    private scene: Phaser.Scene,
    public readonly elementId: string,
    public readonly def: TowerDef,
    public x: number,
    public y: number,
  ) {
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

    this.plinth = scene.add.graphics().setDepth(2);
    this.rangeRing = scene.add.graphics().setDepth(2.5).setVisible(false);
    this.paintPlinth();

    const tex = elementBodyTexture(scene, elementId);
    if (tex) this.bodyImg = scene.add.image(x, y, tex).setDepth(5).setScale(0.82);
    this.avatar = makeElementAvatar(elementId, scene, (c) => c);
    if (this.avatar) {
      this.avatar.setRigScale(0.82);
      this.avatar.setMastered(this.masteryOn);
      this.avatar.setFacing(this.facing);
    }
    this.paintRangeRing();
  }

  // ── Stats ─────────────────────────────────────────────────────────

  get tierName(): string { return this.def.tiers[this.tier]; }
  get isMaxed(): boolean { return this.tier >= 4; }
  get nextTierCost(): number {
    return this.isMaxed ? 0 : Math.round(this.def.cost * TIER_COST_MULT[this.tier + 1]);
  }
  get sellValue(): number { return Math.round(this.invested * 0.7); }
  get range(): number {
    return this.def.range * TIER_RANGE_MULT[this.tier] * (this.perkName ? PERK_BONUS.rangeMult! : 1);
  }

  /** Current rally multipliers (the strongest of each kind). */
  buffMults(time: number): { fireRate: number; damage: number } {
    this.buffs = this.buffs.filter((b) => b.until > time);
    let fireRate = 1, damage = 1;
    for (const b of this.buffs) { fireRate = Math.max(fireRate, b.fireRateMult); damage = Math.max(damage, b.damageMult); }
    return { fireRate, damage };
  }

  addBuff(b: TowerBuff): void {
    this.buffs.push(b);
  }

  unlockedSlots(): TowerSlot[] {
    return TOWER_SLOTS.slice(0, this.tier + 1);
  }

  /** The ability on `slot` with tier, upgrade, perk and rally folded in. */
  resolve(slot: TowerSlot, time: number): TowerAbilityDef {
    let a = this.def.abilities[slot];
    const up = this.ownedUpgrades.has(slot) ? this.def.upgrades[slot] : undefined;
    if (up) a = applyMod(a, up);
    if (this.perkName) a = applyMod(a, PERK_BONUS);
    const b = this.buffMults(time);
    return applyMod(a, {
      damageMult: TIER_DAMAGE_MULT[this.tier] * b.damage,
      cooldownMult: TIER_COOLDOWN_MULT[this.tier] / b.fireRate,
      note: '',
    });
  }

  /** The mastery ability, resolved the same way, or null when mastery is off. */
  resolveMastery(time: number): (TowerAbilityDef & { name: string }) | null {
    if (!this.masteryOn || !this.def.mastery) return null;
    const b = this.buffMults(time);
    const a = applyMod(this.def.mastery, {
      damageMult: TIER_DAMAGE_MULT[this.tier] * b.damage,
      cooldownMult: TIER_COOLDOWN_MULT[this.tier] / b.fireRate,
      note: '',
    });
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

  // ── Per frame ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.destroyed) return;
    this.avatar?.update(delta, this.x, this.y, 1);
  }

  /** Turn toward a point; the hands and eyes follow. */
  lookAt(x: number, y: number): void {
    this.facing = Math.atan2(y - this.y, x - this.x);
    this.avatar?.setFacing(this.facing);
  }

  /** Called by combat when a cast lands, for the gesture. */
  gesture(slot: TowerSlot | 'mastery'): void {
    this.avatar?.play(slot === 'mastery' ? 'clap' : GESTURE_FOR_SLOT[slot], this.facing);
  }

  setSelected(on: boolean): void {
    this.rangeRing.setVisible(on);
  }

  contains(px: number, py: number): boolean {
    return Math.hypot(px - this.x, py - this.y) <= TOWER_RADIUS + 6;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.plinth.destroy();
    this.rangeRing.destroy();
    this.bodyImg?.destroy();
    this.avatar?.destroy();
    this.avatar = null;
  }

  // ── Paint ─────────────────────────────────────────────────────────

  private paintPlinth(): void {
    const g = this.plinth;
    g.clear();
    const r = TOWER_RADIUS + 4;
    // Shadow, slab, lit rim, then the tier pips around the front edge.
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(this.x + 2, this.y + 10, r * 2.2, r * 1.1);
    fillHex(g, this.x, this.y + 4, r, mix(0x1a1a28, this.color, 0.25), 1);
    fillHex(g, this.x, this.y + 1, r, mix(0x2a2a3c, this.color, 0.35), 1);
    strokeHex(g, this.x, this.y + 1, r, mix(this.color, 0xffffff, 0.25), 0.9, 2);
    strokeHex(g, this.x, this.y + 1, r - 5, this.color, 0.35, 1);
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 2 + (i - 1.5) * 0.42;
      const px = this.x + Math.cos(ang) * (r - 2);
      const py = this.y + 1 + Math.sin(ang) * (r - 2);
      const lit = i < this.tier;
      g.fillStyle(lit ? this.color : 0x0a0a14, lit ? 1 : 0.8);
      g.fillCircle(px, py, 3.2);
      if (lit) { g.fillStyle(0xffffff, 0.6); g.fillCircle(px - 0.8, py - 0.8, 1.2); }
    }
  }

  private paintRangeRing(): void {
    const g = this.rangeRing;
    g.clear();
    g.fillStyle(this.color, 0.07);
    g.fillCircle(this.x, this.y, this.range);
    g.lineStyle(1.5, this.color, 0.45);
    g.strokeCircle(this.x, this.y, this.range);
  }
}
