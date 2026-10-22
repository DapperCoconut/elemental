import Phaser from 'phaser';
import type { HuskVariantDef } from '../invasion/HuskVariants';
import { BOSS_MINIONS, DECOY_HUSK } from '../invasion/HuskVariants';
import type { DamageType } from './StrongholdTypes';
import type { RoadHusk } from './RoadHusk';
import type { Tower, TowerSabotage } from './Tower';

/**
 * What each husk brand does on the road.
 *
 * The invasion gives every elemental family one trick against a player (HuskEffects); a road
 * has no player to bite, so each family gets a Stronghold trick instead — chosen to be the
 * same idea pointed at towers: Metal is plated against sharp shots, Air floats over traps,
 * Silence walks unseen, Technology hacks a tower, Growth splits, Soul rises again. The
 * tenth-wave bosses get road moves of their own.
 *
 * Traits come in three flavours, all dispatched here by family id:
 *   - passive defences read by the combat engine (`resistFor`, `immune`, `dodge`, `shell`);
 *   - per-frame behaviour (`update`) — sprints, blinks, heals, sabotage;
 *   - death tricks (`onDeath`) — splits, echoes, bursts.
 */

export interface HuskTrait {
  /** Family id: the element (or boss kind / 'decoy'). */
  id: string;
  name: string;
  desc: string;
  /** Variant tier 1–3; scales the trick. */
  power: number;
  color: number;
}

interface TraitInfo {
  name: string;
  desc: string;
  /** Damage-type multipliers. */
  resist?: Partial<Record<DamageType, number>>;
  /** Tower elements that hit it ×1.5. */
  weak?: string[];
  /** Riders that never take. */
  immune?: Array<'burn' | 'frost' | 'freeze' | 'toxic' | 'knockback' | 'slow' | 'stun' | 'sleep' | 'confuse'>;
}

/** The family table. Keyed by the variant's elementId. */
const TRAITS: Record<string, TraitInfo> = {
  // ── Normal ──
  fire: { name: 'Fireproof', desc: 'Burns never take. Water and ice put it out ×1.5.', immune: ['burn'], weak: ['water', 'ice', 'depths', 'tempest'] },
  water: { name: 'Waterlogged', desc: 'Always soaked: douses burns, but electric hits land ×1.5.', immune: ['burn'], weak: ['electricity', 'tempest', 'life'] },
  life: { name: 'Medic', desc: 'Mends the husks around it every two seconds.', weak: ['fire', 'gluttony', 'growth'] },
  air: { name: 'Airborne', desc: 'Floats over traps, walls, minions and ground zones. Flyers hit it hard.', weak: ['electricity', 'tempest'] },
  earth: { name: 'Stoneskin', desc: 'Blasts land at 60%, and it cannot be shoved.', resist: { blast: 0.6 }, immune: ['knockback'], weak: ['water', 'growth', 'ruin'] },
  oil: { name: 'Slick', desc: 'Husks behind it slide 20% faster. Set it alight and it bursts over the pack.', weak: ['fire', 'magma'] },
  shadow: { name: 'Shadowstep', desc: 'Blinks 90px up the road every four seconds.', weak: ['light', 'passion'] },
  ice: { name: 'Frozen', desc: 'Frost never takes. Dies in a burst that chills nearby towers.', immune: ['frost', 'freeze'], weak: ['fire', 'magma', 'plasma'] },
  growth: { name: 'Mitosis', desc: 'Splits into two buds when it dies.', weak: ['fire', 'gluttony', 'slime'] },
  crystal: { name: 'Faceted', desc: 'Shrugs off its first few sharp hits. Blasts shatter it.', weak: ['earth', 'gunpowder', 'sound'] },
  soul: { name: 'Undying', desc: 'Rises once more as a ghost at 40% health.', weak: ['light', 'passion', 'justice'] },
  hunt: { name: 'Pounce', desc: 'Sprints at double speed for a second, every five.', weak: ['earth', 'bind'] },
  sand: { name: 'Quicken', desc: 'Hastes every husk on the road for 2.5s, every seven.', weak: ['gravity', 'dream'] },
  gravity: { name: 'Event Horizon', desc: 'Orbiting rocks swallow tower shots that pass close.', weak: ['magic', 'psychic'] },
  creation: { name: 'Forge', desc: 'Shields the nearest husk every five seconds.', weak: ['ruin', 'slime'] },
  // ── Abstract ──
  electricity: { name: 'Overload', desc: 'Zaps the nearest tower in reach — stunned for a second, every five.', resist: { energy: 0.5 }, weak: ['earth', 'rubber'] },
  slime: { name: 'Corrosive', desc: 'Chews through walls three times faster. Poison never takes.', immune: ['toxic'], weak: ['earth', 'crystal'] },
  fate: { name: 'Lucky', desc: 'One hit in five misses it entirely.', weak: ['justice', 'psychic'] },
  sound: { name: 'Feedback', desc: 'Shrieks every six seconds: towers near it can only Click for 2s.', weak: ['silence', 'echo'] },
  light: { name: 'Dazzle', desc: 'Dashes in bursts and blinds towers it passes — 35% less range.', weak: ['shadow', 'silence'] },
  magnet: { name: 'Lodestone', desc: 'Sharp shots passing near it swerve into it instead.', weak: ['electricity', 'rubber'] },
  metal: { name: 'Plated', desc: 'Sharp hits land at 25%. Energy cuts through ×1.4.', resist: { sharp: 0.25, energy: 1.4 }, immune: ['knockback'], weak: ['electricity', 'slime', 'ruin'] },
  plasma: { name: 'Plasma Skin', desc: 'Energy hits land at 30%. Dies in a nova that stuns towers.', resist: { energy: 0.3 }, weak: ['water', 'ice'] },
  gunpowder: { name: 'Powder Keg', desc: 'Explodes when it dies — blasts the pack, and stuns towers near it.', weak: ['water', 'depths'] },
  rubber: { name: 'Elastic', desc: 'Shoves spring it forward, not back. Bounces straight over walls.', resist: { blast: 0.7 }, weak: ['fire', 'metal'] },
  magic: { name: 'Blink', desc: 'Below half health, teleports 120px up the road — once.', weak: ['silence', 'ruin'] },
  technology: { name: 'Hack', desc: 'Every six seconds, disables the best tower in reach for 2s.', weak: ['water', 'electricity'] },
  silence: { name: 'Hidden', desc: 'Towers need detection to pick it out.', weak: ['sound', 'echo'] },
  echo: { name: 'Reverb', desc: 'Splits into two fading echoes when it dies.', weak: ['silence'] },
  subterfuge: { name: 'Impostor', desc: 'Wears a plain face until halfway down the road, then sprints.', weak: ['psychic', 'justice'] },
  // ── Corrupt ──
  chalk: { name: 'Restorer', desc: 'Repaints the most hurt husk nearby for 15% health.', weak: ['water', 'slime'] },
  magma: { name: 'Molten', desc: 'Burns and frost never take; slows hold half as long.', immune: ['burn', 'frost'], weak: ['water', 'depths'] },
  illusion: { name: 'Decoys', desc: 'Arrives with two lookalikes. They pay nothing and never breach.', weak: ['psychic', 'light'] },
  depths: { name: 'Dive', desc: 'Submerges for 1.5s every five — nothing can target it under.', weak: ['electricity', 'life'] },
  ruin: { name: 'Rust Armour', desc: 'Armour builds as it walks, to half damage. Corrosion strips it.', weak: ['water', 'life'] },
  dune: { name: 'Burrow', desc: 'Tunnels unseen at double speed for 1.2s, every six.', weak: ['water', 'tempest'] },
  conquest: { name: 'War Banner', desc: 'Husks within its banner take 25% less damage.', weak: ['passion', 'justice'] },
  passion: { name: 'Devotion', desc: 'Every six seconds enthralls a husk: hasted and unstoppable for 4s.', weak: ['shadow', 'death'] },
  paper: { name: 'Gliding', desc: 'Airborne, and unfolds into two scraps when killed.', weak: ['fire', 'water'] },
  death: { name: 'Reaper', desc: 'Drinks 20% health every time a husk near it dies.', weak: ['life', 'passion'] },
  fortune: { name: 'Gilded', desc: 'Pays triple — but slips ahead when struck.', weak: ['subterfuge', 'gravity'] },
  marrow: { name: 'Regrowth', desc: 'Regenerates 2% of its health every second.', weak: ['fire', 'slime'] },
  cloth: { name: 'Wound Tight', desc: 'Every hit shrinks it and quickens it.', weak: ['fire', 'cloth'] },
  psychic: { name: 'Mind Game', desc: 'Every seven seconds flips nearby towers to target the LAST husk.', weak: ['silence', 'dream'] },
  radiation: { name: 'Fallout', desc: 'Towers near it fire 30% slower.', weak: ['earth', 'metal'] },
  bind: { name: 'Shackle', desc: 'Chains the nearest tower in reach: stunned 1.5s, every five.', weak: ['metal', 'subterfuge'] },
  gum: { name: 'Gummy', desc: 'Shots stop dead in it — no pierce. Slows hold half as long.', resist: { sharp: 0.8 }, weak: ['fire', 'ice'] },
  gluttony: { name: 'Devour', desc: 'Grows bigger and tougher eating the corpses that fall near it.', weak: ['fire', 'life'] },
  myth: { name: 'Applause', desc: 'A heavy hit rallies nearby husks into a sprint.', weak: ['justice', 'paper'] },
  // ── Bosses and their courts ──
  arbiter: { name: 'Verdict', desc: 'Sentences the deadliest tower to 3s of silence, and calls Bailiffs.', resist: { sharp: 0.85 }, immune: ['knockback', 'sleep', 'confuse'] },
  dreamer: { name: 'Lullaby', desc: 'Sings towers around it to half speed, and calls Night Wisps.', immune: ['knockback', 'sleep', 'confuse'] },
  paradox: { name: 'Phase', desc: 'Slips out of reality for 1.5s every six and blinks ahead.', immune: ['knockback', 'sleep', 'confuse'] },
  decoy: { name: 'Lookalike', desc: 'A fake. Pops at a touch, pays nothing and never breaches.' },
};

export function traitFor(v: HuskVariantDef): HuskTrait | null {
  let id: string | undefined;
  if (v.id === 'decoy') id = 'decoy';
  else if (v.bossKind) id = v.bossKind;
  else if (v.id.startsWith('boss-')) id = undefined;
  else id = v.elementId;
  if (!id || !TRAITS[id]) return null;
  const t = TRAITS[id];
  return { id, name: t.name, desc: t.desc, power: v.tier ?? 1, color: v.color };
}

export function traitInfo(id: string): TraitInfo | undefined { return TRAITS[id]; }

export interface TraitWorld {
  readonly scene: Phaser.Scene;
  husks(): RoadHusk[];
  towers(): Tower[];
  /** Spawn a husk on `track` at `pathDist`. Null if the field is full. */
  spawnChild(variant: HuskVariantDef, track: number, pathDist: number, opts: { hp: number; noReward?: boolean; alpha?: number }): RoadHusk | null;
  floatText(x: number, y: number, text: string, color: string, size?: number): void;
  /** Swallow tower shots within r of (x, y). */
  eatShots(x: number, y: number, r: number): number;
  /** Bend sharp shots within r of the husk into it. */
  bendShots(h: RoadHusk, r: number): void;
  /** A husk-side hit on another husk (bursts that hurt the pack). */
  hurtHusk(h: RoadHusk, amount: number): void;
  ring(x: number, y: number, r: number, color: number, ms: number): void;
  zap(x1: number, y1: number, x2: number, y2: number, color: number): void;
}

const hexOf = (c: number): string => '#' + c.toString(16).padStart(6, '0');

/**
 * Runs every husk's road trait. Owned by the scene; reads and writes the RoadHusk trait
 * fields, sabotages towers through `Tower.sabotage`.
 */
export class HuskRoadTraits {
  private g: Phaser.GameObjects.Graphics;

  constructor(private world: TraitWorld) {
    this.g = world.scene.add.graphics().setDepth(6.6);
  }

  destroy(): void { this.g.destroy(); }

  /** A newly spawned husk: set up its standing defences. */
  onSpawn(h: RoadHusk): void {
    const t = h.trait;
    if (!t) return;
    const p = t.power;
    switch (t.id) {
      case 'air': case 'paper': h.airborne = true; break;
      case 'silence': h.hidden = true; h.setAlpha(0.4); break;
      case 'crystal': h.shellHits = 2 + p; break;
      case 'water': h.soakedUntil = Number.MAX_SAFE_INTEGER; break;
      case 'subterfuge': h.setDisguise(true); break;
      case 'fortune': h.bounty *= 3; break;
      case 'illusion':
        if (!h.isChild) {
          for (const off of [-26, 26]) {
            const d = this.world.spawnChild(DECOY_HUSK, h.trackIndex, Math.max(0, h.pathDist + off), { hp: 1, noReward: true });
            if (d) { d.isChild = true; d.setDisguise(true); }
          }
        }
        break;
      default: break;
    }
  }

  /** Lives a husk of this trait takes when it breaches (decoys take none). */
  breachFor(h: RoadHusk): number {
    return h.trait?.id === 'decoy' ? 0 : h.breach;
  }

  /** Damage multiplier for a hit of this type from a tower of this element. */
  resistFor(h: RoadHusk, dtype: DamageType, towerElement: string | null, time: number): number {
    const t = h.trait;
    let m = 1;
    if (t) {
      const info = TRAITS[t.id];
      const corroded = h.corrodedUntil > time;
      const r = info?.resist?.[dtype];
      if (r !== undefined && !(corroded && r < 1)) m *= r;
      if (towerElement && info?.weak?.includes(towerElement)) m *= 1.5;
      if (t.id === 'ruin' && !corroded) m *= Math.max(0.5, 1 - h.traitStacks * 0.03);
    }
    if (h.wardUntil > time && h.corrodedUntil <= time) m *= h.wardMult;
    if (dtype === 'energy' && h.soakedUntil > time) m *= 1.5;
    if (dtype === 'blast' && h.encasedUntil > time) m *= 1.6;
    return m;
  }

  /** True when this rider kind never takes on this husk. */
  immune(h: RoadHusk, kind: NonNullable<TraitInfo['immune']>[number], time: number): boolean {
    if ((kind === 'stun' || kind === 'slow' || kind === 'sleep' || kind === 'confuse' || kind === 'knockback' || kind === 'freeze') && h.ccImmuneUntil > time) return true;
    const t = h.trait;
    if (!t) return false;
    return !!TRAITS[t.id]?.immune?.includes(kind);
  }

  /** Slow durations for husks that shrug them off faster. */
  slowScale(h: RoadHusk): number {
    const id = h.trait?.id;
    return id === 'magma' || id === 'gum' ? 0.5 : 1;
  }

  /** Before a hit lands: may dodge or crack a shell. Returns false when the hit is lost. */
  preHit(h: RoadHusk, dtype: DamageType, time: number): boolean {
    const t = h.trait;
    if (!t) return true;
    if (t.id === 'fate' && Math.random() < 0.2) {
      this.pop(h, 'dodge', 'MISS', '#88eecc', time);
      return false;
    }
    if (t.id === 'crystal' && dtype === 'sharp' && h.shellHits > 0 && h.corrodedUntil <= time) {
      h.shellHits--;
      this.pop(h, 'shell', h.shellHits > 0 ? 'DEFLECTED' : 'SHELL CRACKED', '#a8e4ff', time, h.shellHits > 0 ? 900 : 0);
      return false;
    }
    if (dtype === 'blast' && t.id === 'crystal') h.shellHits = 0;
    return true;
  }

  /** After a hit lands. */
  postHit(h: RoadHusk, dealt: number, time: number): void {
    const t = h.trait;
    if (!t || dealt <= 0 || !h.active) return;
    const p = t.power;
    switch (t.id) {
      case 'cloth':
        if (h.traitStacks < 8) {
          h.traitStacks++;
          h.sizeMult = Math.max(0.6, h.sizeMult * 0.95);
          h.applySizeMult();
          h.roadSpeed *= 1.06;
        }
        break;
      case 'fortune':
        if (Math.random() < 0.3) {
          h.pathDist = Math.min(h.track.length - 30, h.pathDist + 60);
          h.place();
          this.pop(h, 'slip', 'SLIPPED AWAY', '#ffd76a', time);
        }
        break;
      case 'magic':
        if (h.traitPhase === 0 && h.hp < h.maxHp * 0.5) {
          h.traitPhase = 1;
          this.world.ring(h.x, h.y, 22, 0x9944ff, 300);
          h.pathDist = Math.min(h.track.length - 30, h.pathDist + 120);
          h.place();
          this.world.ring(h.x, h.y, 22, 0x9944ff, 300);
          this.pop(h, 'blink', 'BLINK', '#bb88ff', time);
        }
        break;
      case 'myth':
        if (dealt >= h.maxHp * 0.15 && time >= h.traitNextAt) {
          h.traitNextAt = time + 3000;
          for (const o of this.world.husks()) {
            if (Math.hypot(o.x - h.x, o.y - h.y) > 150) continue;
            o.traitSpeedMult = 1.5; o.traitSpeedUntil = time + 2000;
          }
          this.pop(h, 'applause', 'APPLAUSE', '#b39dff', time);
        }
        break;
      default: break;
    }
    void p;
  }

  /** A burn just landed on this husk (Oil bursts). */
  onIgnite(h: RoadHusk, time: number): void {
    if (h.trait?.id !== 'oil' || h.traitPhase === 1) return;
    h.traitPhase = 1;
    const x = h.x, y = h.y;
    this.world.scene.time.delayedCall(450, () => {
      this.world.ring(x, y, 80, 0xff7a22, 360);
      for (const o of this.world.husks()) {
        if (Math.hypot(o.x - x, o.y - y) > 80) continue;
        this.world.hurtHusk(o, Math.max(6, o.maxHp * 0.12));
        o.burningUntil = Math.max(o.burningUntil, this.world.scene.time.now + 2500);
      }
    });
    this.pop(h, 'ignite', 'IGNITED!', '#ff9944', time);
  }

  /** The husk died. */
  onDeath(h: RoadHusk): void {
    const now = this.world.scene.time.now;
    // Death and Harvest husks feed on anyone who falls near them.
    for (const o of this.world.husks()) {
      if (o === h || !o.active || o.hp <= 0) continue;
      const id = o.trait?.id;
      if (id !== 'death' && id !== 'gluttony') continue;
      if (Math.hypot(o.x - h.x, o.y - h.y) > 140) continue;
      if (id === 'death') {
        o.heal(Math.round(o.maxHp * 0.2));
        this.pop(o, 'reap', 'DRINKS', '#8a80b0', now);
      } else if (o.traitStacks < 6) {
        o.traitStacks++;
        o.setMaxHp(Math.round(o.maxHp * 1.12));
        o.heal(Math.round(o.maxHp * 0.2));
        o.sizeMult *= 1.05;
        o.applySizeMult();
        this.pop(o, 'devour', 'DEVOURED', '#c48aff', now);
      }
    }
    const t = h.trait;
    if (!t) return;
    const p = t.power;
    const split = (variant: HuskVariantDef, n: number, hpFrac: number, alpha: number, text: string, color: string): void => {
      if (h.isChild) return;
      for (let i = 0; i < n; i++) {
        const c = this.world.spawnChild(variant, h.trackIndex, Math.max(0, h.pathDist - 10 + i * 20), { hp: Math.max(4, h.maxHp * hpFrac), noReward: true, alpha });
        if (c) c.isChild = true;
      }
      this.world.floatText(h.x, h.y - 34, text, color, 11);
    };
    switch (t.id) {
      case 'growth': split(h.variant, 2, 0.3, 1, 'IT SPLITS', '#aadd44'); break;
      case 'echo': split(h.variant, 2, 0.35, 0.55, '...echo...', '#ccccff'); break;
      case 'paper': split(h.variant, 2, 0.25, 0.85, 'UNFOLDS', '#f2ead6'); break;
      case 'soul': split(h.variant, 1, 0.4, 0.5, 'IT RISES AGAIN', '#ccaaff'); break;
      case 'ice':
        this.world.ring(h.x, h.y, 90, 0xaaddff, 400);
        for (const tw of this.world.towers()) if (Math.hypot(tw.x - h.x, tw.y - h.y) <= 90) tw.sabotage('slow', 2500);
        break;
      case 'plasma':
        this.world.ring(h.x, h.y, 80 + p * 10, 0xcc66ff, 360);
        for (const tw of this.world.towers()) if (Math.hypot(tw.x - h.x, tw.y - h.y) <= 80 + p * 10) tw.sabotage('stun', 1000);
        break;
      case 'gunpowder': {
        const r = 90 + p * 10;
        this.world.ring(h.x, h.y, r, 0xff9944, 420);
        for (const tw of this.world.towers()) if (Math.hypot(tw.x - h.x, tw.y - h.y) <= r) tw.sabotage('stun', 1200);
        for (const o of this.world.husks()) if (o !== h && Math.hypot(o.x - h.x, o.y - h.y) <= r) this.world.hurtHusk(o, o.maxHp * 0.15);
        break;
      }
      default: break;
    }
  }

  // ── Per frame ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const g = this.g;
    g.clear();
    const husks = this.world.husks();
    for (const h of husks) {
      if (!h.active || h.hp <= 0 || !h.trait) continue;
      this.tick(h, h.trait, time, delta, husks, g);
    }
  }

  private tick(h: RoadHusk, t: HuskTrait, time: number, delta: number, husks: RoadHusk[], g: Phaser.GameObjects.Graphics): void {
    const p = t.power;
    const towers = this.world.towers();
    const nearestTower = (r: number): Tower | null => {
      let best: Tower | null = null, bd = r;
      for (const tw of towers) { const d = Math.hypot(tw.x - h.x, tw.y - h.y); if (d < bd) { bd = d; best = tw; } }
      return best;
    };
    const towersIn = (r: number): Tower[] => towers.filter((tw) => Math.hypot(tw.x - h.x, tw.y - h.y) <= r);
    const every = (ms: number): boolean => {
      if (h.traitNextAt === 0) { h.traitNextAt = time + ms * (0.4 + Math.random() * 0.6); return false; }
      if (time < h.traitNextAt) return false;
      h.traitNextAt = time + ms;
      return true;
    };
    const sabotage = (kind: TowerSabotage, ms: number, r: number, color: number, label: string): void => {
      for (const tw of towersIn(r)) { if (tw.sabotage(kind, ms)) this.world.zap(h.x, h.y, tw.x, tw.y, color); }
      this.world.ring(h.x, h.y, r, color, 420);
      this.pop(h, 'sab', label, hexOf(color), time, 0);
    };

    switch (t.id) {
      case 'life':
        if (every(2000)) {
          let any = false;
          for (const o of husks) {
            if (o === h || o.hp >= o.maxHp || Math.hypot(o.x - h.x, o.y - h.y) > 120) continue;
            o.heal(Math.round(o.maxHp * (0.05 + p * 0.02)));
            any = true;
          }
          if (any) { this.world.ring(h.x, h.y, 120, 0x66ff88, 500); }
        }
        break;
      case 'chalk':
        if (every(2500)) {
          let worst: RoadHusk | null = null;
          for (const o of husks) {
            if (o === h || Math.hypot(o.x - h.x, o.y - h.y) > 150) continue;
            if (!worst || o.hp / o.maxHp < worst.hp / worst.maxHp) worst = o;
          }
          if (worst && worst.hp < worst.maxHp) {
            worst.heal(Math.round(worst.maxHp * 0.15));
            this.world.zap(h.x, h.y, worst.x, worst.y, 0xe0457b);
            this.pop(worst, 'paint', 'REPAINTED', '#ff7aa8', time);
          }
        }
        break;
      case 'oil':
        for (const o of husks) {
          if (o === h || o.trackIndex !== h.trackIndex) continue;
          const d = h.pathDist - o.pathDist;
          if (d > 0 && d < 60) { o.traitSpeedMult = Math.max(o.traitSpeedUntil > time ? o.traitSpeedMult : 1, 1.2); o.traitSpeedUntil = time + 200; }
        }
        g.fillStyle(0x221505, 0.45); g.fillEllipse(h.x - 10, h.y + 10, 30, 10);
        break;
      case 'shadow':
        if (every(4000)) this.blink(h, 90, 0x552277);
        break;
      case 'hunt':
        if (every(5000)) { h.traitSpeedMult = 2.2; h.traitSpeedUntil = time + 1000; this.pop(h, 'pounce', 'POUNCE', '#ff8844', time); }
        break;
      case 'light':
        if (every(4500)) { h.traitSpeedMult = 2.5; h.traitSpeedUntil = time + 700; }
        if (h.traitSpeedUntil > time) {
          for (const tw of towersIn(120)) tw.sabotage('blind', 2000);
          g.fillStyle(0xfff4a8, 0.25); g.fillCircle(h.x, h.y, 26);
        }
        break;
      case 'sand':
        if (every(7000)) {
          for (const o of husks) { o.traitSpeedMult = Math.max(o.traitSpeedUntil > time ? o.traitSpeedMult : 1, 1.25 + p * 0.05); o.traitSpeedUntil = time + 2500; }
          this.pop(h, 'quicken', 'TIME QUICKENS', '#ffdd44', time, 0);
        }
        break;
      case 'gravity': {
        h.traitPhase = (h.traitPhase + delta / 1000 * 2.4) % (Math.PI * 2);
        const r = 34 + p * 4;
        for (let i = 0; i < 2; i++) {
          const a = h.traitPhase + i * Math.PI;
          const ox = h.x + Math.cos(a) * r, oy = h.y + Math.sin(a) * r;
          g.fillStyle(0x8844cc, 0.9); g.fillCircle(ox, oy, 6 + p);
          g.lineStyle(1, 0xffffff, 0.4); g.strokeCircle(ox, oy, 8 + p);
          if (this.world.eatShots(ox, oy, 14 + p) > 0) this.pop(h, 'eat', 'SWALLOWED', '#bb88ff', time, 700);
        }
        break;
      }
      case 'magnet':
        this.world.bendShots(h, 80 + p * 8);
        g.lineStyle(1.5, 0xcc2244, 0.25 + Math.sin(time / 160) * 0.1); g.strokeCircle(h.x, h.y, 80 + p * 8);
        break;
      case 'creation':
        if (every(5000)) {
          let best: RoadHusk | null = null, bd = 200;
          for (const o of husks) { if (o === h || o.shieldHp > 0) continue; const d = Math.hypot(o.x - h.x, o.y - h.y); if (d < bd) { bd = d; best = o; } }
          if (best) { best.shieldHp = Math.round(best.maxHp * (0.2 + p * 0.05)); this.pop(best, 'forge', 'FORGED', '#ffbb66', time); }
        }
        break;
      case 'electricity':
        if (every(5000)) {
          const tw = nearestTower(150);
          if (tw && tw.sabotage('stun', 1000)) { this.world.zap(h.x, h.y, tw.x, tw.y, 0xffee00); this.pop(h, 'zap', 'OVERLOAD', '#ffee44', time, 0); }
        }
        break;
      case 'sound':
        if (every(6000)) sabotage('silence', 2000, 130, 0xc0304f, 'FEEDBACK');
        break;
      case 'technology':
        if (every(6000)) {
          let best: Tower | null = null;
          for (const tw of towersIn(180)) if (!best || tw.damageDealt > best.damageDealt) best = tw;
          if (best && best.sabotage('stun', 2000)) { this.world.zap(h.x, h.y, best.x, best.y, 0x44ccaa); this.pop(h, 'hack', 'HACKED', '#66ffcc', time, 0); }
        }
        break;
      case 'bind':
        if (every(5000)) {
          const tw = nearestTower(160);
          if (tw && tw.sabotage('stun', 1500)) { this.world.zap(h.x, h.y, tw.x, tw.y, 0xe0b743); this.pop(h, 'chain', 'SHACKLED', '#e0b743', time, 0); }
        }
        break;
      case 'psychic':
        if (every(7000)) sabotage('confuse', 3000, 160, 0xe8e4d8, 'MIND GAME');
        break;
      case 'radiation':
        for (const tw of towersIn(90)) tw.sabotage('slow', 400);
        g.lineStyle(2, 0x7cff3d, 0.22 + Math.sin(time / 200) * 0.1); g.strokeCircle(h.x, h.y, 90);
        break;
      case 'subterfuge':
        if (h.traitPhase === 0 && h.pathDist > h.track.length * 0.5) {
          h.traitPhase = 1;
          h.setDisguise(false);
          h.roadSpeed *= 1.6;
          this.pop(h, 'reveal', 'AN IMPOSTOR!', '#ff6677', time, 0);
        }
        break;
      case 'depths':
        if (h.traitPhase === 0 && every(5000)) { h.traitPhase = 1; h.untargetable = true; h.setAlpha(0.25); h.traitSpeedMult = 1.3; h.traitSpeedUntil = time + 1500; h.traitStacks = time + 1500; }
        else if (h.traitPhase === 1 && time >= h.traitStacks) { h.traitPhase = 0; h.untargetable = false; h.setAlpha(1); }
        if (h.traitPhase === 1) { g.lineStyle(1.5, 0x0e8f9c, 0.6); g.strokeEllipse(h.x, h.y + 6, 34, 12); }
        break;
      case 'dune':
        if (h.traitPhase === 0 && every(6000)) { h.traitPhase = 1; h.untargetable = true; h.setAlpha(0.15); h.traitSpeedMult = 2; h.traitSpeedUntil = time + 1200; h.traitStacks = time + 1200; }
        else if (h.traitPhase === 1 && time >= h.traitStacks) { h.traitPhase = 0; h.untargetable = false; h.setAlpha(1); this.world.ring(h.x, h.y, 26, 0xe8c87a, 300); }
        if (h.traitPhase === 1) { g.fillStyle(0xe8c87a, 0.5); g.fillEllipse(h.x, h.y + 8, 28, 10); }
        break;
      case 'ruin':
        if (every(1000) && h.traitStacks < 16) h.traitStacks++;
        if (h.traitStacks > 0) { g.lineStyle(1 + h.traitStacks / 6, 0xc4392c, 0.45); g.strokeCircle(h.x, h.y, 18 * h.sizeMult); }
        break;
      case 'conquest':
        for (const o of husks) {
          if (Math.hypot(o.x - h.x, o.y - h.y) > 120) continue;
          o.wardMult = 0.75; o.wardUntil = time + 250;
        }
        g.lineStyle(2, 0xc23a2e, 0.3); g.strokeCircle(h.x, h.y, 120);
        g.lineStyle(2, 0x3a2a1a, 1); g.lineBetween(h.x + 10, h.y - 4, h.x + 10, h.y - 34);
        g.fillStyle(0xc23a2e, 1); g.fillTriangle(h.x + 10, h.y - 34, h.x + 10, h.y - 22, h.x + 24, h.y - 28);
        break;
      case 'passion':
        if (every(6000)) {
          const pool = husks.filter((o) => o !== h && o.active);
          const c = pool[Math.floor(Math.random() * pool.length)];
          if (c) {
            c.traitSpeedMult = 1.4; c.traitSpeedUntil = time + 4000; c.ccImmuneUntil = time + 4000;
            this.world.zap(h.x, h.y, c.x, c.y, 0xf5e08a);
            this.pop(c, 'thrall', 'ENTHRALLED', '#ffe08a', time);
          }
        }
        break;
      case 'marrow':
        if (every(1000) && h.hp < h.maxHp) h.heal(Math.max(1, Math.round(h.maxHp * 0.02)));
        break;
      case 'silence':
        h.setAlpha(h.revealedUntil > time ? 0.85 : 0.35);
        break;
      // ── Bosses ──
      case 'arbiter':
        if (every(8000)) {
          let best: Tower | null = null;
          for (const tw of towers) if (!best || tw.damageDealt > best.damageDealt) best = tw;
          if (best && best.sabotage('silence', 3000) && best.sabotage('stun', 1500)) {
            this.world.zap(h.x, h.y, best.x, best.y, 0xe8c24a);
            this.world.floatText(best.x, best.y - 50, 'SENTENCED', '#ffe08a', 13);
          }
          this.summonCourt(h, 'boss-bailiff', 2);
        }
        break;
      case 'dreamer':
        if (every(7000)) { sabotage('slow', 3000, 200, 0x8f7cff, 'LULLABY'); this.summonCourt(h, 'boss-wisp', 3); }
        break;
      case 'paradox':
        if (h.traitPhase === 0 && every(6000)) {
          h.traitPhase = 1; h.untargetable = true; h.setAlpha(0.3); h.traitStacks = time + 1500;
          this.blink(h, 100, 0x3ad6c8);
        } else if (h.traitPhase === 1 && time >= h.traitStacks) { h.traitPhase = 0; h.untargetable = false; h.setAlpha(1); }
        break;
      default: break;
    }
  }

  private summonCourt(h: RoadHusk, variantId: string, n: number): void {
    const v = BOSS_MINIONS.find((m) => m.id === variantId);
    if (!v) return;
    for (let i = 0; i < n; i++) {
      const c = this.world.spawnChild(v, h.trackIndex, Math.max(0, h.pathDist - 20 - i * 18), { hp: Math.max(8, h.maxHp * 0.12), noReward: false });
      if (c) c.isChild = true;
    }
  }

  private blink(h: RoadHusk, dist: number, color: number): void {
    this.world.ring(h.x, h.y, 18, color, 260);
    h.pathDist = Math.min(h.track.length - 30, h.pathDist + dist);
    h.place();
    this.world.ring(h.x, h.y, 22, color, 260);
  }

  private pop(h: RoadHusk, key: string, text: string, color: string, time: number, gap = 1800): void {
    const last = h.lastStatusText.get('t-' + key) ?? -Infinity;
    if (time - last < gap) return;
    h.lastStatusText.set('t-' + key, time);
    this.world.floatText(h.x, h.y - 44, text, color, 11);
  }
}
