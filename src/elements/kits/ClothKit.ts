import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import {
  ARTWORK_MAP, ArtworkDef, TAPESTRY_SIZE, TapestryEffects, TapestryState, baseEffects,
  canPlace, cloneTapestry, emptyTapestry, fitsAt, place, rollOffers, summarise, usedCells,
} from './ClothTapestry';
import {
  CLT, ClothAvatar, ClothColorFn, ClothFx, OUTFITS, OUTFIT_COLOR, OUTFIT_EMOJI, OUTFIT_NAME,
  Outfit, anchorGlyph, jitter, loomCell, longpinGlyph, nailGlyph, pinGlyph, scarfRibbon, webGlyph,
} from './ClothVisuals';

type Owner = 'player' | 'npc';
type MasterySlotId = 'e' | 'r' | 'f' | 'q';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── The scarf ────────────────────────────────────────────────────────────────
/**
 * The passive, and the reason the element exists. The tailor's body is a small core; the thing
 * that actually gets shot is the wool dragging behind them, sampled from where they have walked.
 */
const SCARF_MAX_SEGMENTS = 17;
/** Distance between sampled knots. Segments × spacing is the scarf's reach behind you. */
const SCARF_SPACING = 13;
/** How wide the ribbon is at the collar. It tapers to a third of this at the fringe. */
const SCARF_WIDTH = 13;
/** How close a shot has to pass to a segment to catch it. */
const SCARF_HIT_R = 9;
/**
 * A scarf at full health is this many segments; at death's door it is the floor. Being nearly
 * dead genuinely makes you harder to hit, which is the trade the passive is built on.
 */
const SCARF_MIN_K = 0.3;
/** The body core the tailor keeps. Small — the scarf is supposed to be what catches shots. */
const CLOTH_HITBOX = 0.52;
/**
 * The scarf *is* the health bar, and it is a far larger thing to hit than anybody else's body —
 * every knot of it is live. So it is worth double a normal fighter's pool: 800 where the player
 * would otherwise have 400. Applied once, on top of whatever the difficulty or the campaign
 * already handed the fighter, so an NPC tailor scales the same way every other NPC does.
 */
const SCARF_HP_MULT = 2;
/** Split: two scarves, each this fraction of the length, thrown out to either side. */
const SPLIT_LEN = 0.62;
const SPLIT_OFFSET = 11;

// ── Pin (Click) ──────────────────────────────────────────────────────────────
const PIN_DAMAGE = 4;
const PIN_RANGE = 62;
const PIN_ARC = 1.1;
/** Landing this many pins on one body grapples you to it and spins you round it once. */
const SPIN_MS = 780;
const SPIN_RADIUS = 44;

// ── Longpin (E) ──────────────────────────────────────────────────────────────
const LONGPIN_DAMAGE = 15;
const LONGPIN_THROUGH = 10;
const LONGPIN_RAM = 10;
const LONGPIN_SPEED = 700;
const LONGPIN_R = 11;
/** How long a planted pin waits to be recalled before the thread rots off it. */
const LONGPIN_LIFE_MS = 9000;
const REEL_SPEED = 1150;
const RAM_KNOCKBACK = 620;

// ── Cloth Hold (E+) ──────────────────────────────────────────────────────────
const WEB_HP = 50;
const WEB_R = 40;
/** A hard ceiling so a web can never be a permanent stun against a target that cannot break it. */
const WEB_MAX_MS = 6000;

// ── Safety Line (R) ──────────────────────────────────────────────────────────
const SAFETY_TRIGGER_DAMAGE = 75;
const SAFETY_PULL_SPEED = 1400;
const SAFETY_LIFE_MS = 20000;
/** R+ — what surviving the trip is worth. */
const SAFETY_SPEED_MS = 5000;
const SAFETY_SPEED_BONUS = 0.2;
const SAFETY_PINNED_PER_SEC = 5;

// ── Pin Cushion (F) ──────────────────────────────────────────────────────────
const CUSHION_CONVERT = 50;
/** F+ — every hit taken sprays this many pins back out. */
const PUSH_PINS = 8;
const PUSH_DAMAGE = 2;
const PUSH_SPEED = 430;

// ── Tapestry (Q) ─────────────────────────────────────────────────────────────
/** How long the draft stays open before it picks for you. The arena does not stop. */
const DRAFT_MS = 9000;

// ── Right-click artworks ─────────────────────────────────────────────────────
const RC_COOLDOWNS: Record<string, number> = {
  'scarf-switch': 3600,
  'burn-it-down': 14000,
  'heavy-coat': 12000,
  'nail-storm': 15000,
  clothstorm: 8000,
  're-knit': 13000,
  'location-pin': 7000,
  'scarf-slice': 9000,
};

const SWITCH_DAMAGE = 5;
const SWITCH_RANGE = 78;
const SWITCH_STUN_MS = 1200;
const BURN_MS = 9000;
/** Damage bonus per second of burning, and the scarf it costs per second. */
const BURN_RAMP = 0.09;
const BURN_SCARF_PER_SEC = 4;
const COAT_CHARGES = 3;
const NAILSTORM_MS = 2600;
const NAILSTORM_RATE_MS = 70;
const NAILSTORM_DAMAGE = 4;
const NAILSTORM_SPEED = 400;
const STORM_DAMAGE = 12;
const STORM_R = 170;
const STORM_SLOW = 0.3;
const STORM_SLOW_MS = 3000;
const KNIT_MS = 3000;
const KNIT_SCARF = 35;
const KNIT_PINNED = 25;
const SLICE_FREEZE_MS = 2000;
const SLICE_DAMAGE = 15;

// ── Mastery ──────────────────────────────────────────────────────────────────
const WRETCHED_MS = 3000;
const WRETCHED_CD = 18000;
const WRETCHED_R = 190;
/** Wretched Scarf pays back this share of what it swallowed. */
const WRETCHED_RETURN = 0.9;
const OUTFIT_SWAP_CD = 900;

// ── Sim types ────────────────────────────────────────────────────────────────

interface Knot { x: number; y: number }

interface PlantedPin {
  x: number;
  y: number;
  ang: number;
  /** The body it is stuck in, or null for a wall. */
  victim: Fighter | null;
  diesAt: number;
}

interface FlyingPin {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  diesAt: number;
}

interface Reel {
  owner: Owner;
  toX: number;
  toY: number;
  /** Bodies already ploughed through this trip — each pays once. */
  hit: Set<Fighter>;
  /** The pinned body we are arriving at, if any. Rammed on contact. */
  ram: Fighter | null;
  /** True while the safety line rather than the long pin is doing the hauling. */
  safety: boolean;
}

interface Web {
  owner: Owner;
  victim: Fighter;
  hp: number;
  maxHp: number;
  endsAt: number;
  dotAccum: number;
}

interface Nail {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  damage: number;
  diesAt: number;
}

interface Slice {
  owner: Owner;
  /** The frozen scarf, in world space. It stays exactly here while the tailor walks off. */
  pts: Knot[];
  snapsAt: number;
  snapped: boolean;
}

interface Draft {
  owner: Owner;
  offers: ArtworkDef[];
  picked: ArtworkDef | null;
  gx: number;
  gy: number;
  openedAt: number;
  /** 1 / 2 / 3, registered once when the draft opens rather than per frame. */
  keys: Phaser.Input.Keyboard.Key[];
}

interface Side {
  aimX: number;
  aimY: number;

  // ── The scarf ──
  trail: Knot[];
  lastSampleX: number;
  lastSampleY: number;

  // ── Click ──
  nextPinAt: number;
  /** Consecutive pins landed on the current victim — the Click+ spin counter. */
  streak: number;
  streakOn: Fighter | null;
  spinUntil: number;
  spinTarget: Fighter | null;
  spinFrom: number;

  // ── Longpin ──
  pin: PlantedPin | null;
  flying: FlyingPin | null;

  // ── Safety line ──
  anchorX: number;
  anchorY: number;
  anchorSet: boolean;
  anchorDiesAt: number;
  /** `rawDamageTaken` when the anchor went down — the 75-damage trigger reads off this. */
  anchorRaw: number;
  safetySpeedUntil: number;
  safetyPinnedUntil: number;
  safetyPinnedAccum: number;

  // ── Tapestry ──
  tap: TapestryState;
  fx: TapestryEffects;
  /** Scarf added by Survive artworks. Applied to maxHp once, tracked so it is never double-paid. */
  grantedScarf: number;

  // ── Right click ──
  rcReadyAt: number;
  rcWasDown: boolean;
  burnUntil: number;
  burnStartedAt: number;
  burnAccum: number;
  coatCharges: number;
  stormUntil: number;
  stormNextAt: number;
  knitUntil: number;
  locX: number;
  locY: number;
  locSet: boolean;

  // ── Mastery ──
  outfit: Outfit;
  nextSwapAt: number;
  wretchedUntil: number;
  wretchedStored: number;
  wretchedReadyAt: number;

  // ── Bookkeeping ──
  lastRaw: number;
  /**
   * What the fighter already had in the four shared stat fields before Cloth touched them.
   * Captured once per match: items, mutations and campaign relics all write dodge, crit, flat
   * reduction and status duration, and stamping our own number over the top would delete them.
   */
  baseDodge: number;
  baseCrit: number;
  baseFlat: number;
  baseStatusDur: number;
  baseCaptured: boolean;
  /** Damage this side has dealt while it had Pinned HP — a mastery requirement. */
  pinnedDamageAccum: number;
  webDamageAccum: number;
  retreats: number;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0,
    trail: [],
    lastSampleX: 0, lastSampleY: 0,
    nextPinAt: 0, streak: 0, streakOn: null, spinUntil: 0, spinTarget: null, spinFrom: 0,
    pin: null, flying: null,
    anchorX: 0, anchorY: 0, anchorSet: false, anchorDiesAt: 0, anchorRaw: 0,
    safetySpeedUntil: 0, safetyPinnedUntil: 0, safetyPinnedAccum: 0,
    tap: emptyTapestry(), fx: baseEffects(), grantedScarf: 0,
    rcReadyAt: 0, rcWasDown: false,
    burnUntil: 0, burnStartedAt: 0, burnAccum: 0,
    coatCharges: 0, stormUntil: 0, stormNextAt: 0, knitUntil: 0,
    locX: 0, locY: 0, locSet: false,
    outfit: 'suit', nextSwapAt: 0, wretchedUntil: 0, wretchedStored: 0, wretchedReadyAt: 0,
    baseDodge: 0, baseCrit: 0, baseFlat: 0, baseStatusDur: 1, baseCaptured: false,
    lastRaw: -1, pinnedDamageAccum: 0, webDamageAccum: 0, retreats: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface ClothArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  /** The shared physics group — this is what the scarf catches. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get spaceKey(): Phaser.Input.Keyboard.Key;
  get rightPointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Cloth visual colour through that side's equipped skin. */
  clothColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  purgeSummons(x: number, y: number, radius: number, exceptOwner: Owner): number;
  /** Shop upgrades, per side — the npc half is the online opponent's loadout. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  addMasteryStat(key: string, amount: number): void;
  recordMasteryBest(key: string, amount: number): void;
  broadcastMasteryCast(enhId: string): void;
}

// ── ClothKit ─────────────────────────────────────────────────────────────────

export class ClothKit implements SummonPurgeTarget {
  private api: ClothArenaApi;

  // ── Visuals ──
  private readonly pcol: ClothColorFn;
  private readonly ncol: ClothColorFn;
  private readonly pfx: ClothFx;
  private readonly nfx: ClothFx;
  private playerAvatar: ClothAvatar | null = null;
  private npcAvatar: ClothAvatar | null = null;
  /** Anchors, location pins and webs on the floor — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** The scarves themselves — above the floor, but under the tailor wearing them. */
  private scarfGfx: Phaser.GameObjects.Graphics | null = null;
  /** Pins, nails and tethers — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The scarf bar and the loom. Screen space. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private rcLabel: Phaser.GameObjects.Text | null = null;
  private draftGfx: Phaser.GameObjects.Graphics | null = null;
  private draftTexts: Phaser.GameObjects.Text[] = [];
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private reels: Reel[] = [];
  private webs: Web[] = [];
  private nails: Nail[] = [];
  private slices: Slice[] = [];
  private draft: Draft | null = null;
  /** Guards the re-entrant path where thorns damage triggers another absorb. */
  private inThorns = false;

  constructor(api: ClothArenaApi) {
    this.api = api;
    this.pcol = (base) => api.clothColor('player', base);
    this.ncol = (base) => api.clothColor('npc', base);
    this.pfx = new ClothFx(api.scene, this.pcol);
    this.nfx = new ClothFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): ClothFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): ClothColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }
  private avatar(owner: Owner): ClothAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isCloth(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'cloth' : this.api.npcElementId === 'cloth';
  }

  /** A shop upgrade, but only for a side that is actually playing Cloth. */
  private up(owner: Owner, slot: string): boolean {
    return this.isCloth(owner) && this.api.hasUpgrade(owner, slot);
  }

  private mastered(owner: Owner): boolean {
    return this.isCloth(owner) && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  /** A cast that cannot happen: hand the cooldown back and say why, once, out loud. */
  private deny(owner: Owner, abilityId: string, text: string): void {
    const f = this.fighter(owner);
    this.refund(f, abilityId);
    if (owner !== 'player' || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 46, text, this.hex(CLT.clothPale));
    Sfx.playAt('ui-denied', f.x, { volume: 0.5 });
  }

  /**
   * The single door every point of Cloth damage goes through.
   *
   * It is a method rather than a scatter of `takeDamage` calls because three of the tapestry's
   * artworks — Sharpness, Technique's crit, and Burn It Down's ramp — modify *everything* the
   * element deals, and a cast that forgot to ask would silently opt out of a third of the deck.
   */
  private hit(owner: Owner, victim: Fighter, amount: number, opts?: { pierce?: boolean; aoe?: boolean }): number {
    if (!this.alive(victim) || amount <= 0) return 0;
    const s = this.side(owner);
    let dmg = amount * s.fx.damageMult * this.burnBonus(owner);
    dmg = Math.max(1, Math.round(dmg));
    if (s.fx.crit > 0) victim.setIncomingCritContext(s.fx.crit, 2);
    victim.takeDamage(dmg, opts);
    // Mastery: damage dealt while pins are in you, and damage dealt into a web.
    const self = this.fighter(owner);
    if (self.pinnedHp > 0) s.pinnedDamageAccum += dmg;
    if (this.webs.some((w) => w.victim === victim && w.owner === owner)) s.webDamageAccum += dmg;
    return dmg;
  }

  /** Burn It Down's ramp: how much harder everything hits right now. */
  private burnBonus(owner: Owner): number {
    const s = this.side(owner);
    if (this.now >= s.burnUntil) return 1;
    return 1 + ((this.now - s.burnStartedAt) / 1000) * BURN_RAMP;
  }

  // ── The scarf ──────────────────────────────────────────────────────────────

  /** How many knots this side's scarf is currently worth. Health, then Braid, then Split. */
  private scarfSegments(owner: Owner): number {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const k = f.maxHp > 0 ? Phaser.Math.Clamp(f.hp / f.maxHp, 0, 1) : 0;
    const burn = this.now < s.burnUntil ? 1 - Math.min(0.55, s.burnAccum / Math.max(1, f.maxHp)) : 1;
    const len = SCARF_MAX_SEGMENTS * (SCARF_MIN_K + (1 - SCARF_MIN_K) * k)
      * (1 - s.fx.scarfShorter) * burn * (s.fx.split ? SPLIT_LEN : 1);
    return Phaser.Math.Clamp(Math.round(len), 2, SCARF_MAX_SEGMENTS);
  }

  /**
   * Sample where the tailor has been. Knots are laid at a fixed spacing rather than per frame,
   * so the scarf's shape is the *path* walked and not a function of the frame rate — which
   * matters a great deal when the same geometry is the hitbox.
   */
  private updateScarf(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isCloth(owner) || !this.alive(f)) { s.trail = []; continue; }

      if (s.trail.length === 0) {
        s.trail = [{ x: f.x, y: f.y }];
        s.lastSampleX = f.x;
        s.lastSampleY = f.y;
      }
      const moved = Phaser.Math.Distance.Between(f.x, f.y, s.lastSampleX, s.lastSampleY);
      if (moved >= SCARF_SPACING) {
        s.trail.unshift({ x: f.x, y: f.y });
        s.lastSampleX = f.x;
        s.lastSampleY = f.y;
      } else {
        // Standing still: keep the head glued to the collar so the ribbon never detaches.
        s.trail[0] = { x: f.x, y: f.y };
      }
      const want = this.scarfSegments(owner) + 1;
      if (s.trail.length > want) s.trail.length = want;
      // Standing perfectly still would leave a stub. Pay out slack behind the last knot so an
      // idle tailor still trails a full scarf rather than a bobble.
      while (s.trail.length < want) {
        const tail = s.trail[s.trail.length - 1];
        const prev = s.trail[s.trail.length - 2] ?? { x: tail.x, y: tail.y + 1 };
        const ang = Math.atan2(tail.y - prev.y, tail.x - prev.x);
        s.trail.push({
          x: tail.x + Math.cos(ang) * SCARF_SPACING,
          y: tail.y + Math.sin(ang) * SCARF_SPACING,
        });
      }
    }
  }

  /** The two ribbons Split draws, or the one everybody else has. In world coordinates. */
  private scarfStrands(owner: Owner): Knot[][] {
    const s = this.side(owner);
    if (s.trail.length < 2) return [];
    // Scarf Slice pins the wool in place: the strand stops following and stays where it was.
    const frozen = this.slices.find((sl) => sl.owner === owner && !sl.snapped);
    if (frozen) return [frozen.pts];
    if (!s.fx.split) return [s.trail];

    const out: Knot[][] = [[], []];
    for (let i = 0; i < s.trail.length; i++) {
      const a = s.trail[i];
      const b = s.trail[Math.min(s.trail.length - 1, i + 1)];
      const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      const spread = SPLIT_OFFSET * Math.min(1, i / 2);
      out[0].push({ x: a.x + Math.cos(ang) * spread, y: a.y + Math.sin(ang) * spread });
      out[1].push({ x: a.x - Math.cos(ang) * spread, y: a.y - Math.sin(ang) * spread });
    }
    return out;
  }

  /**
   * The passive doing its job: an enemy shot that touches any knot of the scarf hits the tailor,
   * even though it never came near their body. This is what makes the scarf a hitbox rather than
   * a decoration.
   *
   * Both shot systems have to be checked — the physics group everything fires into, and the
   * registry the kits with hand-drawn projectiles use.
   */
  private scarfCatchesShots(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.isCloth(owner) || !this.alive(f)) continue;
      // Wrapped up, the scarf is not out there to be hit — that is the whole ability.
      if (this.now < this.side(owner).wretchedUntil) continue;
      const strands = this.scarfStrands(owner);
      if (strands.length === 0) continue;
      const mineIsPlayer = owner === 'player';

      // A snapshot: `destroy()` splices the group's live array, and walking that while
      // mutating it silently skips every other shot.
      for (const obj of [...this.api.projectiles.getChildren()]) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        // A shot already inside the body core is ArenaScene's business, not ours.
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < 24) continue;
        if (!this.nearAnyStrand(strands, p.x, p.y)) continue;
        this.takeScarfHit(owner, Math.max(1, p.damage ?? 8), p.x, p.y);
        p.destroy();
      }

      for (const strand of strands) {
        for (let i = 1; i < strand.length; i += 2) {
          const k = strand[i];
          if (Phaser.Math.Distance.Between(k.x, k.y, f.x, f.y) < 24) continue;
          const found = this.api.projectileRegistry.within(this.other(owner), k.x, k.y, SCARF_HIT_R);
          for (const rp of found) {
            this.takeScarfHit(owner, Math.max(1, rp.damage), k.x, k.y);
            this.api.projectileRegistry.steal(rp);
          }
        }
      }
    }
  }

  private nearAnyStrand(strands: Knot[][], x: number, y: number): boolean {
    for (const strand of strands) {
      for (let i = 0; i < strand.length - 1; i++) {
        if (this.distToSegment(x, y, strand[i], strand[i + 1]) <= SCARF_HIT_R) return true;
      }
    }
    return false;
  }

  private distToSegment(px: number, py: number, a: Knot, b: Knot): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 0.001) return Phaser.Math.Distance.Between(px, py, a.x, a.y);
    let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
    t = Phaser.Math.Clamp(t, 0, 1);
    return Phaser.Math.Distance.Between(px, py, a.x + dx * t, a.y + dy * t);
  }

  /** A shot caught by the wool. The tailor pays for it; the wool shows it. */
  private takeScarfHit(owner: Owner, damage: number, x: number, y: number): void {
    const f = this.fighter(owner);
    f.takeDamage(damage);
    this.fx(owner).lint(x, y, 5, 14, 380);
    this.api.spawnHitFlash(x, y, CLT.cloth);
  }

  // ── The stat block ─────────────────────────────────────────────────────────

  /**
   * Everything the tapestry, the outfits and the live buffs are worth, pushed onto the Fighter
   * once a frame. Rewritten from scratch each tick rather than adjusted, so nothing can drift
   * and no ability has to remember to undo itself.
   */
  private applyStats(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (!this.isCloth(owner) || !this.alive(f)) {
        if (f?.active) this.clearStats(f);
        continue;
      }
      s.fx = summarise(s.tap);
      if (!s.baseCaptured) {
        s.baseCaptured = true;
        s.baseDodge = f.dodgeChance;
        s.baseCrit = f.critChance;
        s.baseFlat = f.flatDamageReduction;
        s.baseStatusDur = f.statusDurMult;
        // The scarf's own pool, paid before any Survive artwork adds to it.
        const extra = Math.round(f.maxHp * (SCARF_HP_MULT - 1));
        if (extra > 0) { f.increaseMaxHp(extra); f.heal(extra); }
      }

      // Survive: bought scarf is real max HP, paid exactly once per point granted.
      const wantScarf = s.fx.bonusScarf;
      if (wantScarf > s.grantedScarf) {
        const delta = wantScarf - s.grantedScarf;
        f.increaseMaxHp(delta);
        f.heal(delta);
        s.grantedScarf = wantScarf;
      }

      // The body core. The scarf is the hitbox; the tailor themselves is barely one.
      // `applySizeMult` rebuilds the physics body, so it is only called when it changes.
      const wantHitbox = this.now < s.wretchedUntil ? 0.62 : CLOTH_HITBOX;
      if (f.hitboxMult !== wantHitbox) { f.hitboxMult = wantHitbox; f.applySizeMult(); }

      // The scarf *is* the health bar. The floating pip over the tailor's head is replaced by
      // the wool behind them and by the kit's own bar in the corner, so it is taken away — for
      // the player only, so an opponent's health stays readable the usual way.
      if (owner === 'player') f.setHealthBarVisible(false);

      f.clothCooldownMult = s.fx.cooldownMult;
      // Layered onto whatever the fighter already had rather than stamped over it.
      f.dodgeChance = 1 - (1 - s.baseDodge) * (1 - s.fx.dodge);
      f.critChance = Math.min(1, s.baseCrit + s.fx.crit);
      f.pierceImmune = s.fx.thickSkin;
      f.pinnedVulnMult = s.fx.pinnedNoVuln ? 1 : 1.25;
      if (!f.onPinnedAbsorb) f.onPinnedAbsorb = (spent) => this.payThorns(owner, spent);

      // ── Armour ──
      let armour = s.fx.incomingMult;
      if (this.mastered(owner) && s.outfit === 'coat') armour *= 0.9;
      if (this.now < s.wretchedUntil) armour = 0;
      f.clothIncomingMult = armour;

      // ── The wardrobe ──
      const suited = this.mastered(owner);
      f.flatDamageReduction = s.baseFlat + (suited && s.outfit === 'suit' ? 3 : 0);
      f.statusDurMult = s.baseStatusDur * (suited && s.outfit === 'silk' ? 0.67 : 1);
      f.clothAoeMult = suited && s.outfit === 'hoodie' ? 0.8 : 1;

      // R+ pays pinned HP by the second for the length of the sprint.
      if (this.now < s.safetyPinnedUntil) {
        s.safetyPinnedAccum += SAFETY_PINNED_PER_SEC / 60;
        if (s.safetyPinnedAccum >= 1) {
          const whole = Math.floor(s.safetyPinnedAccum);
          s.safetyPinnedAccum -= whole;
          f.pinnedHp += whole;
        }
      }

      // Thick Skin: a cut of everything that gets through becomes pins instead.
      if (s.lastRaw < 0) s.lastRaw = f.rawDamageTaken;
      const took = Math.max(0, f.rawDamageTaken - s.lastRaw);
      s.lastRaw = f.rawDamageTaken;
      if (took > 0) this.onHurt(owner, took);
    }
  }

  private clearStats(f: Fighter): void {
    if (f.active) f.setHealthBarVisible(true);
    f.clothCooldownMult = 1;
    f.clothIncomingMult = 1;
    f.clothAoeMult = 1;
    f.pierceImmune = false;
    f.pinnedHp = 0;
    f.pinnedVulnMult = 1.25;
    f.onPinnedAbsorb = null;
    if (f.hitboxMult === CLOTH_HITBOX || f.hitboxMult === 0.62) {
      f.hitboxMult = 1;
      if (f.active) f.applySizeMult();
    }
  }

  /** Everything that keys off "the tailor was just hurt", in one place. */
  private onHurt(owner: Owner, raw: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    // Wretched Scarf banks here rather than in its own updater, because this is the only place
    // the raw delta exists — `applyStats` has already consumed it by the time anything else runs.
    if (this.now < s.wretchedUntil) { s.wretchedStored += raw; return; }

    // Thick Skin converts a slice of the hit into pins rather than preventing it.
    if (s.fx.thickSkin) {
      f.pinnedHp += raw * 0.15;
      this.fx(owner).lint(f.x, f.y, 3, 10, 300, CLT.pinned);
    }

    // F+ Pin Push: a hit sprays the pincushion back out.
    if (this.up(owner, 'f') && f.pinnedHp > 0) this.pinPush(owner);

    // The safety line's own trigger: 75 damage taken with an anchor down hauls you back.
    if (s.anchorSet && f.rawDamageTaken - s.anchorRaw >= SAFETY_TRIGGER_DAMAGE) {
      this.fireSafetyLine(owner);
    }
  }

  /** Thorns: a share of whatever the pins ate goes back the way it came. */
  private payThorns(owner: Owner, spent: number): void {
    if (this.inThorns) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    const back = spent * s.fx.thorns;
    if (back < 1 || !this.alive(f)) return;
    const victim = this.nearestTarget(owner, f.x, f.y);
    if (!victim) return;
    this.inThorns = true;
    try {
      this.hit(owner, victim, back);
      const ang = Math.atan2(victim.y - f.y, victim.x - f.x);
      this.fx(owner).thorns(f.x, f.y, ang, 5);
    } finally {
      this.inThorns = false;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (f?.active) this.clearStats(f);
    }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.reels = [];
    this.webs = [];
    this.nails = [];
    this.slices = [];
    this.draft = null;
    this.inThorns = false;
    this.vizT = 0;

    // Q+ Salvage: a few pieces of the last tapestry are still on the loom. Only for a player
    // who actually bought the upgrade — everybody else starts on an empty grid.
    if (this.up('player', 'q')) this.sides.player.tap = salvagedTapestry();

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.scarfGfx?.destroy(); this.scarfGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.rcLabel?.destroy(); this.rcLabel = null;
    this.closeDraft();
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'cloth') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;

    // The draft eats the mouse while it is open — a click is a pick, not a stab.
    if (this.draft && this.draft.owner === 'player') {
      this.handleDraftInput(pointer, mouseX, mouseY);
      return;
    }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // ── Click ── auto-fires while held; the ability's own 145ms is the rate limit.
    if (pointer.isDown && !pointer.rightButtonDown() && this.now >= s.nextPinAt) {
      p.castAbility('cloth-pin', ctx);
    }

    // ── Right click ── whatever the tapestry has sewn onto it, if anything.
    this.handleRightClick(pointer, mouseX, mouseY);

    // ── Space ── the mastery wardrobe.
    if (this.mastered('player') && Phaser.Input.Keyboard.JustDown(this.api.spaceKey)) {
      this.cycleOutfit('player');
    }

    // ── E / R / F / Q ──
    // ArenaScene's input chain hands Cloth the whole keyboard, so the four ability keys are this
    // kit's job. Each key is read with `JustDown` exactly once per frame: it consumes the flag,
    // so a second read anywhere (the mastery branch below used to be one) silently eats presses.
    const slots: Array<[MasterySlotId, string, Phaser.Input.Keyboard.Key]> = [
      ['e', 'cloth-longpin', this.api.eKey],
      ['r', 'cloth-safety-line', this.api.rKey],
      ['f', 'cloth-pin-cushion', this.api.fKey],
      ['q', 'cloth-tapestry', this.api.qKey],
    ];
    const bound = this.wretchedSlot();
    for (const [slot, abilityId, key] of slots) {
      if (!Phaser.Input.Keyboard.JustDown(key)) continue;
      // The mastery has taken this key: it is Wretched Scarf now, not the base ability.
      if (slot === bound) { this.tryCastWretched('player'); continue; }
      p.castAbility(abilityId, ctx);
    }
  }

  /** The slot Wretched Scarf is bound over this match, or null if it is not bound. */
  private wretchedSlot(owner: Owner = 'player'): string | null {
    if (!this.mastered(owner)) return null;
    for (const slot of ['e', 'r', 'f', 'q']) {
      const bind = owner === 'player' ? this.api.masteryBindFor(slot) : this.api.npcMasteryBindFor(slot);
      if (bind === 'wretched-scarf') return slot;
    }
    return null;
  }

  /** True while a base ability's key has been given away to the mastery. */
  private slotTaken(owner: Owner, slot: string): boolean {
    return this.wretchedSlot(owner) === slot;
  }

  // ── Click: Pin ─────────────────────────────────────────────────────────────

  doPin(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    s.nextPinAt = this.now + 40;
    this.stab(owner, tx, ty, false);
    // Echo: one click in five is two.
    if (s.fx.echoChance > 0 && Math.random() < s.fx.echoChance) {
      this.api.scene.time.delayedCall(110, () => {
        if (this.alive(this.fighter(owner))) this.stab(owner, s.aimX, s.aimY, true);
      });
    }
  }

  /**
   * One jab. Short, cheap, constant — and the only thing in the kit that counts toward the
   * grapple spin, which is what the whole click is really for.
   */
  private stab(owner: Owner, tx: number, ty: number, isEcho: boolean): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const reach = PIN_RANGE * s.fx.reachMult;
    this.avatar(owner)?.play('punch', ang, 130);
    if (!isEcho) Sfx.playAt('stab', f.x, { volume: 0.32, rate: 1.8 + Math.random() * 0.3 });

    let landed: Fighter | null = null;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > reach + 14 * t.sizeMult) continue;
      const to = Math.atan2(t.y - f.y, t.x - f.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(to - ang)) > PIN_ARC) continue;
      this.hit(owner, t, PIN_DAMAGE + s.fx.pinBonus);
      landed = t;
      break;
    }

    this.fx(owner).stab(
      f.x + Math.cos(ang) * reach * 0.8, f.y + Math.sin(ang) * reach * 0.8, ang,
      isEcho ? 0.7 : 1,
    );
    if (!landed) { return; }
    this.api.spawnHitFlash(landed.x, landed.y, CLT.steelLit);

    // ── The spin counter ──
    if (s.streakOn !== landed) { s.streakOn = landed; s.streak = 0; }
    if (this.now < s.spinUntil) return;
    s.streak++;
    if (owner === 'player') {
      const left = s.fx.comboAt - s.streak;
      if (left > 0 && left <= 2) {
        this.api.showFloatingText(landed.x, landed.y - 34, `🧵 ${left}`, this.hex(CLT.clothPale));
      }
    }
    if (s.streak >= s.fx.comboAt) { s.streak = 0; this.startSpin(owner, landed); }
  }

  /**
   * Click+ — the tenth pin drags you onto them and whips you round their body once. It is not a
   * damage button: it is a *positioning* button that parks you inside your own pin range for the
   * whole revolution, which is worth far more than the hit would have been.
   */
  private startSpin(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.spinUntil = this.now + SPIN_MS;
    s.spinTarget = victim;
    s.spinFrom = Math.atan2(f.y - victim.y, f.x - victim.x);
    this.fx(owner).reel(f.x, f.y, victim.x, victim.y);
    this.avatar(owner)?.play('dash', s.spinFrom);
    Sfx.playAt('whip', f.x, { volume: 0.6 });
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 50, '🧵 COMBO!', this.hex(CLT.brassLit));
    }
  }

  private updateSpins(delta: number): void {
    void delta;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.now >= s.spinUntil || !this.alive(s.spinTarget)) { s.spinTarget = null; continue; }
      const f = this.fighter(owner);
      const t = s.spinTarget!;
      if (!this.alive(f)) { s.spinUntil = 0; continue; }
      const k = 1 - (s.spinUntil - this.now) / SPIN_MS;
      const ang = s.spinFrom + k * Math.PI * 2;
      // Position override rather than a dash: a dash undershoots a moving anchor, and the whole
      // point is to stay glued at exactly stabbing distance.
      f.x = Phaser.Math.Clamp(t.x + Math.cos(ang) * SPIN_RADIUS, this.left, this.right);
      f.y = Phaser.Math.Clamp(t.y + Math.sin(ang) * SPIN_RADIUS, this.top, this.bottom);
      (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  /** True while the kit is steering this fighter — ArenaScene must not fight it for the body. */
  isControlled(owner: Owner): boolean {
    const s = this.side(owner);
    return this.now < s.spinUntil || this.now < s.knitUntil
      || this.reels.some((r) => r.owner === owner);
  }

  // ── E: Longpin ─────────────────────────────────────────────────────────────

  doLongpin(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (this.slotTaken(owner, 'e')) { this.deny(owner, 'cloth-longpin', '🧣 SLOT SEWN OVER'); return; }

    // A pin already in something: this press is the recall, not a throw. The throw handed the
    // cooldown back when it planted (see `updateLongpins`), which is the only reason this press
    // was allowed through `castAbility` at all — so the recall is what actually pays for it.
    if (s.pin) { this.recallToPin(owner); return; }
    // Location Pin gives the recall somewhere to go with nothing thrown at all.
    if (s.locSet && Phaser.Math.Distance.Between(f.x, f.y, s.locX, s.locY) > 60) {
      this.reelTo(owner, s.locX, s.locY, null, false);
      return;
    }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.flying = {
      owner,
      x: f.x + Math.cos(ang) * 20,
      y: f.y + Math.sin(ang) * 20,
      vx: Math.cos(ang) * LONGPIN_SPEED,
      vy: Math.sin(ang) * LONGPIN_SPEED,
      ang,
      diesAt: this.now + 1600,
    };
    this.avatar(owner)?.play('punch', ang, 240);
    Sfx.playAt('nail', f.x, { volume: 0.7, rate: 0.85 });
  }

  private updateLongpins(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const fly = s.flying;
      if (!fly) continue;
      fly.x += fly.vx * dt;
      fly.y += fly.vy * dt;

      let planted: PlantedPin | null = null;
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(fly.x, fly.y, t.x, t.y) > LONGPIN_R + 14 * t.sizeMult) continue;
        this.hit(owner, t, LONGPIN_DAMAGE);
        planted = { x: t.x, y: t.y, ang: fly.ang, victim: t, diesAt: this.now + LONGPIN_LIFE_MS };
        break;
      }

      const offEdge = fly.x <= this.left || fly.x >= this.right || fly.y <= this.top || fly.y >= this.bottom;
      if (!planted && offEdge) {
        // A wall is just as good a thing to be pinned to as a body.
        planted = {
          x: Phaser.Math.Clamp(fly.x, this.left + 6, this.right - 6),
          y: Phaser.Math.Clamp(fly.y, this.top + 6, this.bottom - 6),
          ang: fly.ang,
          victim: null,
          diesAt: this.now + LONGPIN_LIFE_MS,
        };
      }

      if (planted) {
        s.pin = planted;
        s.flying = null;
        // The throw was only half the cast. Hand E straight back so the recall is pressable —
        // `castAbility` refuses anything still on cooldown, so without this the second press
        // could never reach `doLongpin` at all.
        this.refund(this.fighter(owner), 'cloth-longpin');
        this.fx(owner).plant(planted.x, planted.y);
        Sfx.playAt('stab', planted.x, { volume: 0.8, rate: 0.7 });
        if (owner === 'player') {
          this.api.showFloatingText(planted.x, planted.y - 40, '📌 PLANTED — E to reel', this.hex(CLT.brassLit));
        }
        continue;
      }
      if (this.now >= fly.diesAt) s.flying = null;
    }

    // A planted pin follows the body it is in, and rots on its own clock.
    for (const owner of BOTH) {
      const s = this.side(owner);
      const pin = s.pin;
      if (!pin) continue;
      if (pin.victim) {
        if (!this.alive(pin.victim)) { s.pin = null; continue; }
        pin.x = pin.victim.x;
        pin.y = pin.victim.y;
      }
      if (this.now >= pin.diesAt) s.pin = null;
    }
  }

  private recallToPin(owner: Owner): void {
    const s = this.side(owner);
    const pin = s.pin;
    if (!pin) return;
    this.reelTo(owner, pin.x, pin.y, pin.victim, false);
    s.pin = null;
  }

  private reelTo(owner: Owner, x: number, y: number, ram: Fighter | null, safety: boolean): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.reels = this.reels.filter((r) => r.owner !== owner);
    this.reels.push({ owner, toX: x, toY: y, hit: new Set(), ram, safety });
    this.fx(owner).reel(f.x, f.y, x, y, safety ? CLT.line : CLT.cloth);
    this.avatar(owner)?.play('dash', Math.atan2(y - f.y, x - f.x));
    Sfx.playAt('whip', f.x, { volume: 0.65, rate: safety ? 1.2 : 0.95 });
  }

  /**
   * The thread hauling somebody across the arena — used by both the E recall and the R bail-out.
   *
   * Position is lerped rather than handed to a dash: a dash undershoots a moving destination and
   * this one has to *arrive*, because arriving on a pinned body is the ram.
   */
  private updateReels(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.reels.length - 1; i >= 0; i--) {
      const r = this.reels[i];
      const f = this.fighter(r.owner);
      const s = this.side(r.owner);
      if (!this.alive(f)) {
        // Never leave the safety trip's invincibility switched on behind us.
        if (r.safety && f?.active) f.isInvincible = false;
        this.reels.splice(i, 1);
        continue;
      }

      // R+ makes the trip itself safe — you cannot be shot off your own safety line.
      if (r.safety && this.up(r.owner, 'r')) f.isInvincible = true;

      const tx = r.ram && this.alive(r.ram) ? r.ram.x : r.toX;
      const ty = r.ram && this.alive(r.ram) ? r.ram.y : r.toY;
      const dist = Phaser.Math.Distance.Between(f.x, f.y, tx, ty);
      const step = (r.safety ? SAFETY_PULL_SPEED : REEL_SPEED) * dt;
      const ang = Math.atan2(ty - f.y, tx - f.x);

      // Anybody ploughed through on the way pays once.
      for (const t of this.targetsOf(r.owner)) {
        if (r.hit.has(t) || t === r.ram) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > 34 + 14 * t.sizeMult) continue;
        r.hit.add(t);
        this.hit(r.owner, t, LONGPIN_THROUGH);
        this.fx(r.owner).lint(t.x, t.y, 6, 20, 380);
      }

      if (dist <= step + 6) {
        f.x = Phaser.Math.Clamp(tx, this.left, this.right);
        f.y = Phaser.Math.Clamp(ty, this.top, this.bottom);
        this.arriveReel(r);
        this.reels.splice(i, 1);
        if (r.safety) {
          f.isInvincible = false;
          s.retreats++;
          this.api.addMasteryStat('safetyRetreats', 1);
        }
        continue;
      }
      f.x = Phaser.Math.Clamp(f.x + Math.cos(ang) * step, this.left, this.right);
      f.y = Phaser.Math.Clamp(f.y + Math.sin(ang) * step, this.top, this.bottom);
      (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  /** Landing. On a pinned body this is the ram; on a wall it is just a stop. */
  private arriveReel(r: Reel): void {
    const f = this.fighter(r.owner);
    if (r.safety) {
      this.fx(r.owner).snap(f.x, f.y, r.toX, r.toY);
      return;
    }
    const ram = r.ram;
    if (!ram || !this.alive(ram)) {
      this.fx(r.owner).lint(f.x, f.y, 8, 22, 420);
      return;
    }
    this.hit(r.owner, ram, LONGPIN_RAM);
    const ang = Math.atan2(ram.y - f.y, ram.x - f.x);
    if (!ram.knockbackImmune) {
      (ram.body as Phaser.Physics.Arcade.Body).setVelocity(
        Math.cos(ang) * RAM_KNOCKBACK, Math.sin(ang) * RAM_KNOCKBACK,
      );
    }
    this.fx(r.owner).burst(ram.x, ram.y, 66);
    Sfx.playAt('whip', ram.x, { volume: 0.85, rate: 0.7 });

    // E+ — arriving on a pinned body wraps them up.
    if (this.up(r.owner, 'e')) this.spinWeb(r.owner, ram);
  }

  // ── E+: Cloth Hold ─────────────────────────────────────────────────────────

  /**
   * A cage of wool with its own health bar. It is not a timed stun — it is a *damage check*, and
   * how long the victim is held is entirely a function of how fast they can cut fifty HP of
   * fabric off themselves. The ceiling exists only so somebody with no way to damage a web at
   * all is not held forever.
   */
  private spinWeb(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    this.webs = this.webs.filter((w) => w.victim !== victim);
    const hp = WEB_HP * s.fx.webHpMult;
    this.webs.push({
      owner, victim, hp, maxHp: hp, endsAt: this.now + WEB_MAX_MS, dotAccum: 0,
    });
    this.fx(owner).wrap(victim.x, victim.y, WEB_R);
    Sfx.playAt('whip', victim.x, { volume: 0.7, rate: 1.35 });
    if (owner === 'player') {
      this.api.showFloatingText(victim.x, victim.y - 44, '🕸️ HELD', this.hex(CLT.web));
    }
  }

  private updateWebs(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.webs.length - 1; i >= 0; i--) {
      const w = this.webs[i];
      const s = this.side(w.owner);
      if (!this.alive(w.victim) || this.now >= w.endsAt || w.hp <= 0) {
        if (this.alive(w.victim)) {
          this.fx(w.owner).lint(w.victim.x, w.victim.y, 9, 26, 460, CLT.web);
          w.victim.knockbackImmune = false;
        }
        this.webs.splice(i, 1);
        continue;
      }
      // Held: pinned in place, and every point of damage cuts the cage down.
      const v = w.victim;
      (v.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      v.earthStunnedUntil = Math.max(v.earthStunnedUntil, this.now + 120);

      // Slicing Hold: the wool has needles in it.
      if (s.fx.webDps > 0) {
        w.dotAccum += s.fx.webDps * dt;
        if (w.dotAccum >= 1) {
          const whole = Math.floor(w.dotAccum);
          w.dotAccum -= whole;
          this.hit(w.owner, v, whole);
        }
      }
    }
  }

  /** Any damage the victim takes eats the cage. Called from `hit` via the arena's damage watch. */
  private feedWebs(): void {
    for (const w of this.webs) {
      const v = w.victim;
      if (!this.alive(v)) continue;
      const raw = v.rawDamageTaken;
      const seen = (w as Web & { seenRaw?: number }).seenRaw ?? raw;
      const took = Math.max(0, raw - seen);
      (w as Web & { seenRaw?: number }).seenRaw = raw;
      if (took <= 0) continue;
      w.hp -= took;
      if (w.hp <= 0 && this.alive(v)) {
        this.fx(w.owner).lint(v.x, v.y, 12, 30, 500, CLT.web);
        this.api.showFloatingText(v.x, v.y - 40, '🕸️ TORN FREE', this.hex(CLT.webDark));
      }
    }
  }

  // ── R: Safety Line ─────────────────────────────────────────────────────────

  doSafetyLine(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (this.slotTaken(owner, 'r')) { this.deny(owner, 'cloth-safety-line', '🧣 SLOT SEWN OVER'); return; }

    // Anchor already down: this press is the bail-out. Planting handed the cooldown back (see
    // below), so this press got through `castAbility` — and this is the one that pays for it.
    if (s.anchorSet) { this.fireSafetyLine(owner); return; }

    // Location Pin: the anchor goes to the marker rather than to your feet.
    const ax = s.locSet ? s.locX : f.x;
    const ay = s.locSet ? s.locY : f.y;
    s.anchorX = ax;
    s.anchorY = ay;
    s.anchorSet = true;
    s.anchorRaw = f.rawDamageTaken;
    s.anchorDiesAt = this.now + SAFETY_LIFE_MS;
    // Same two-press shape as the long pin: planting is free, retreating is what costs.
    this.refund(f, 'cloth-safety-line');
    this.avatar(owner)?.play('slam', Math.PI / 2, 260);
    this.fx(owner).plant(ax, ay);
    Sfx.playAt('nail', ax, { volume: 0.6, rate: 1.3 });
    if (owner === 'player') {
      this.api.showFloatingText(ax, ay - 34, '⚓ ANCHORED', this.hex(CLT.lineLit));
    }
  }

  /** The line going taut — from the recast, or from the 75 damage doing it for you. */
  private fireSafetyLine(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.anchorSet || !this.alive(f)) return;
    s.anchorSet = false;
    // Whether this was the recast or the 75-damage trigger firing it, the retreat is what the
    // cooldown is for — stamped here so the automatic path cannot hand out a free re-anchor.
    if (f.active) f.startCooldown('cloth-safety-line');
    this.reelTo(owner, s.anchorX, s.anchorY, null, true);

    // R+ — the sprint out of trouble, and pins for the trip.
    if (this.up(owner, 'r')) {
      s.safetySpeedUntil = this.now + SAFETY_SPEED_MS;
      s.safetyPinnedUntil = this.now + SAFETY_SPEED_MS;
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 52, '⚓ SLACK!', this.hex(CLT.lineLit));
      }
    }
  }

  private updateSafety(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.anchorSet && this.now >= s.anchorDiesAt) s.anchorSet = false;
    }
  }

  // ── F: Pin Cushion ─────────────────────────────────────────────────────────

  doPinCushion(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (this.slotTaken(owner, 'f')) { this.deny(owner, 'cloth-pin-cushion', '🧣 SLOT SEWN OVER'); return; }
    // Converting health you do not have would be a suicide button rather than a cost.
    if (f.hp <= 6) { this.deny(owner, 'cloth-pin-cushion', '🧣 NOTHING LEFT TO PIN'); return; }

    const take = Math.min(CUSHION_CONVERT, f.hp - 1);
    f.hp -= take;
    f.pinnedHp += take;
    f.emit('damaged', 0);
    this.avatar(owner)?.play('clap', 0, 220);
    this.fx(owner).thorns(f.x, f.y, -Math.PI / 2, 6);
    this.fx(owner).lint(f.x, f.y, 8, 18, 420, CLT.pinned);
    Sfx.playAt('stab', f.x, { volume: 0.7, rate: 0.9 });
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 46, `📍 ${Math.round(take)} PINNED`, this.hex(CLT.pinnedLit));
    }
  }

  /** F+ Pin Push: a hit taken sprays the cushion outward. */
  private pinPush(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < PUSH_PINS; i++) {
      const ang = base + (i / PUSH_PINS) * Math.PI * 2;
      this.nails.push({
        owner,
        x: f.x + Math.cos(ang) * 16,
        y: f.y + Math.sin(ang) * 16,
        vx: Math.cos(ang) * PUSH_SPEED,
        vy: Math.sin(ang) * PUSH_SPEED,
        ang,
        damage: PUSH_DAMAGE + s.fx.pinBonus,
        diesAt: this.now + 900,
      });
    }
    Sfx.playAt('nail', f.x, { volume: 0.45, rate: 1.5 });
  }

  private updateNails(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.nails.length - 1; i >= 0; i--) {
      const n = this.nails[i];
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      let done = this.now >= n.diesAt
        || n.x < this.left || n.x > this.right || n.y < this.top || n.y > this.bottom;
      if (!done) {
        for (const t of this.targetsOf(n.owner)) {
          if (Phaser.Math.Distance.Between(n.x, n.y, t.x, t.y) > 8 + 13 * t.sizeMult) continue;
          this.hit(n.owner, t, n.damage);
          this.api.spawnHitFlash(t.x, t.y, CLT.steelLit);
          done = true;
          break;
        }
      }
      if (done) this.nails.splice(i, 1);
    }
  }

  // ── Q: Tapestry ────────────────────────────────────────────────────────────

  doTapestry(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (this.slotTaken(owner, 'q')) { this.deny(owner, 'cloth-tapestry', '🧣 SLOT SEWN OVER'); return; }
    if (this.draft) { this.deny(owner, 'cloth-tapestry', '🧵 ALREADY WEAVING'); return; }

    const offers = rollOffers(s.tap, this.up(owner, 'q'));
    if (offers.length === 0) { this.deny(owner, 'cloth-tapestry', '🧵 LOOM FULL'); return; }

    this.avatar(owner)?.play('raise', 0, 700);
    Sfx.playAt('whip', f.x, { volume: 0.5, rate: 1.4 });

    // The bot has no UI: it takes the best card it is offered and sews it at the first fit.
    if (owner === 'npc') { this.npcDraft(owner, offers); return; }
    const kb = this.api.scene.input.keyboard;
    const keys = offers.map((_, i) => kb?.addKey(Phaser.Input.Keyboard.KeyCodes.ONE + i, false))
      .filter((k): k is Phaser.Input.Keyboard.Key => !!k);
    this.draft = { owner, offers, picked: null, gx: 0, gy: 0, openedAt: this.now, keys };
    // Q is a key, but the click may well already be held down auto-firing pins. Start latched so
    // the draft needs a *fresh* press, or the held button picks a card the instant it opens.
    this.pointerWasDownForDraft = true;
  }

  private npcDraft(owner: Owner, offers: ArtworkDef[]): void {
    const s = this.side(owner);
    // Prefer the biggest thing that fits — the bot cannot plan a loom, so it takes value now.
    const ranked = [...offers].sort((a, b) => b.cells.length - a.cells.length);
    for (const def of ranked) {
      const spots = fitsAt(s.tap, def);
      if (spots.length === 0) continue;
      const [gx, gy] = spots[Math.floor(Math.random() * spots.length)];
      this.sew(owner, def, gx, gy);
      return;
    }
  }

  private sew(owner: Owner, def: ArtworkDef, gx: number, gy: number): void {
    const s = this.side(owner);
    if (!place(s.tap, def, gx, gy)) return;
    s.fx = summarise(s.tap);
    const f = this.fighter(owner);
    this.fx(owner).sew(f.x, f.y - 10, def.color);
    Sfx.playAt('stab', f.x, { volume: 0.5, rate: 1.1 });
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 54, `🧵 ${def.name}`, this.hex(def.color));
      this.api.recordMasteryBest('tapestryPieces', s.tap.placed.length);
      if (this.up(owner, 'q')) saveSalvage(s.tap);
    }
    // A right-click artwork is a new button — say so loudly, it is easy to miss.
    if (def.kind === 'rightclick' && owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 74, '🖱️ RIGHT CLICK UNLOCKED', this.hex(CLT.brassLit));
    }
  }

  // ── The draft overlay ──────────────────────────────────────────────────────

  private handleDraftInput(pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const d = this.draft;
    if (!d) return;
    const clicked = pointer.isDown && !pointer.rightButtonDown() && !this.pointerWasDownForDraft;
    this.pointerWasDownForDraft = pointer.isDown;

    if (!d.picked) {
      // Number keys are the fast path; clicking a card does the same thing.
      for (let i = 0; i < d.keys.length && i < d.offers.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(d.keys[i])) { d.picked = d.offers[i]; return; }
      }
      if (clicked) {
        const idx = this.draftCardAt(mouseX, mouseY);
        if (idx >= 0) d.picked = d.offers[idx];
      }
      return;
    }

    // Placing. The ghost follows the cursor over the loom; a click sews it.
    const cell = this.loomCellAt(mouseX, mouseY, d.picked);
    if (cell) { d.gx = cell[0]; d.gy = cell[1]; }
    if (clicked && canPlace(this.sides.player.tap, d.picked, d.gx, d.gy)) {
      this.sew('player', d.picked, d.gx, d.gy);
      this.closeDraft();
    }
  }

  private pointerWasDownForDraft = false;

  /** Where the loom lives on screen while the draft is open. */
  private loomOrigin(): { x: number; y: number; cell: number } {
    const cell = 44;
    return { x: this.api.width / 2 - (TAPESTRY_SIZE * cell) / 2, y: 168, cell };
  }

  private loomCellAt(mx: number, my: number, def: ArtworkDef): [number, number] | null {
    const { x, y, cell } = this.loomOrigin();
    const gx = Math.floor((mx - x) / cell);
    const gy = Math.floor((my - y) / cell);
    if (gx < -2 || gy < -2 || gx > TAPESTRY_SIZE + 2 || gy > TAPESTRY_SIZE + 2) return null;
    // Nudge the ghost so its bounding box stays on the loom rather than hanging off it.
    const w = Math.max(...def.cells.map((c) => c[0])) + 1;
    const h = Math.max(...def.cells.map((c) => c[1])) + 1;
    return [
      Phaser.Math.Clamp(gx, 0, TAPESTRY_SIZE - w),
      Phaser.Math.Clamp(gy, 0, TAPESTRY_SIZE - h),
    ];
  }

  private draftCardAt(mx: number, my: number): number {
    const cw = 210;
    const gap = 18;
    const total = 3 * cw + 2 * gap;
    const x0 = this.api.width / 2 - total / 2;
    const y0 = 396;
    for (let i = 0; i < 3; i++) {
      const cx = x0 + i * (cw + gap);
      if (mx >= cx && mx <= cx + cw && my >= y0 && my <= y0 + 168) return i;
    }
    return -1;
  }

  private updateDraft(): void {
    const d = this.draft;
    if (!d) return;
    // The arena has not stopped, so the draft cannot be allowed to hang. Out of time, it takes
    // the first card and the first fit for you.
    if (this.now - d.openedAt < DRAFT_MS && this.alive(this.fighter(d.owner))) return;
    const def = d.picked ?? d.offers[0];
    const spots = fitsAt(this.sides[d.owner].tap, def);
    if (spots.length > 0) this.sew(d.owner, def, spots[0][0], spots[0][1]);
    this.closeDraft();
  }

  private closeDraft(): void {
    this.draft = null;
    this.pointerWasDownForDraft = false;
    this.draftGfx?.destroy(); this.draftGfx = null;
    for (const t of this.draftTexts) t.destroy();
    this.draftTexts = [];
  }

  // ── The right-click artworks ───────────────────────────────────────────────

  private handleRightClick(pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const s = this.sides.player;
    const id = s.fx.rightClick;
    const down = pointer.rightButtonDown();
    const justDown = down && !s.rcWasDown;
    s.rcWasDown = down;
    if (!id) return;

    // Burn It Down is the one that reads the button rather than the press.
    if (id === 'burn-it-down') {
      if (down && this.now >= s.rcReadyAt && this.now >= s.burnUntil) this.castRightClick('player', id, mouseX, mouseY);
      return;
    }
    if (justDown && this.now >= s.rcReadyAt) this.castRightClick('player', id, mouseX, mouseY);
  }

  private castRightClick(owner: Owner, id: string, mx: number, my: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    s.rcReadyAt = this.now + (RC_COOLDOWNS[id] ?? 8000) * s.fx.cooldownMult;
    const ang = Math.atan2(my - f.y, mx - f.x);

    switch (id) {
      case 'scarf-switch': {
        this.avatar(owner)?.play('sweep', ang, 220);
        let any = false;
        for (const t of this.targetsOf(owner)) {
          if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > SWITCH_RANGE + 14 * t.sizeMult) continue;
          this.hit(owner, t, SWITCH_DAMAGE);
          t.earthStunnedUntil = Math.max(t.earthStunnedUntil, this.now + SWITCH_STUN_MS * (t.statusDurMult || 1));
          this.fx(owner).lint(t.x, t.y, 7, 20, 420);
          if (owner === 'player') this.api.showFloatingText(t.x, t.y - 40, '💫 STUNNED', this.hex(CLT.clothPale));
          any = true;
        }
        this.fx(owner).burst(f.x, f.y, SWITCH_RANGE);
        Sfx.playAt('whip', f.x, { volume: 0.7, rate: 1.25 });
        if (!any && owner === 'player') this.api.showFloatingText(f.x, f.y - 44, 'MISS', this.hex(CLT.clothDeep));
        break;
      }
      case 'burn-it-down': {
        s.burnUntil = this.now + BURN_MS;
        s.burnStartedAt = this.now;
        s.burnAccum = 0;
        this.avatar(owner)?.play('flex', 0, 400);
        Sfx.playAt('flame-burst', f.x, { volume: 0.6 });
        if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, '🔥 BURN IT DOWN', this.hex(CLT.ember));
        break;
      }
      case 'heavy-coat': {
        s.coatCharges = COAT_CHARGES;
        f.shieldCharges = Math.max(f.shieldCharges, COAT_CHARGES);
        this.avatar(owner)?.play('flex', 0, 320);
        this.fx(owner).burst(f.x, f.y, 62, CLT.coat);
        if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, '🧥 ×3 BLOCKS', this.hex(CLT.brassLit));
        break;
      }
      case 'nail-storm': {
        s.stormUntil = this.now + NAILSTORM_MS;
        s.stormNextAt = this.now;
        this.avatar(owner)?.play('raise', 0, 700);
        Sfx.playAt('nail', f.x, { volume: 0.7, rate: 0.9 });
        if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, '🌪️ NAIL STORM', this.hex(CLT.steelLit));
        break;
      }
      case 'clothstorm': {
        this.avatar(owner)?.play('slam', ang, 300);
        this.fx(owner).burst(f.x, f.y, STORM_R);
        for (const t of this.targetsOf(owner)) {
          if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > STORM_R) continue;
          this.hit(owner, t, STORM_DAMAGE, { aoe: true });
          t.purgeSpeedMult = 1 - STORM_SLOW;
          t.purgedUntil = Math.max(t.purgedUntil, this.now + STORM_SLOW_MS * (t.statusDurMult || 1));
          if (owner === 'player') this.api.showFloatingText(t.x, t.y - 38, '🌀 -30%', this.hex(CLT.cloth));
        }
        Sfx.playAt('whip', f.x, { volume: 0.85, rate: 0.75 });
        break;
      }
      case 're-knit': {
        s.knitUntil = this.now + KNIT_MS;
        this.avatar(owner)?.play('clap', 0, KNIT_MS);
        if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, '🧶 RE-KNITTING', this.hex(CLT.clothPale));
        break;
      }
      case 'location-pin': {
        s.locX = mx;
        s.locY = my;
        s.locSet = true;
        this.avatar(owner)?.play('punch', ang, 220);
        this.fx(owner).plant(mx, my);
        if (owner === 'player') this.api.showFloatingText(mx, my - 34, '📍 MARKED', this.hex(CLT.brassLit));
        break;
      }
      case 'scarf-slice': {
        const strands = this.scarfStrands(owner);
        if (strands.length === 0 || strands[0].length < 2) break;
        this.slices = this.slices.filter((sl) => sl.owner !== owner);
        this.slices.push({
          owner,
          pts: strands[0].map((k) => ({ x: k.x, y: k.y })),
          snapsAt: this.now + SLICE_FREEZE_MS,
          snapped: false,
        });
        this.avatar(owner)?.play('sweep', ang, 300);
        if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, '✂️ SCARF PINNED', this.hex(CLT.clothPale));
        break;
      }
      default: break;
    }
  }

  private updateRightClick(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isCloth(owner) || !this.alive(f)) continue;

      // ── Burn It Down: the scarf pays for the ramp, by the second. ──
      if (this.now < s.burnUntil) {
        const cost = BURN_SCARF_PER_SEC * dt;
        s.burnAccum += cost;
        if (f.hp > 1) f.hp = Math.max(1, f.hp - cost);
      }

      // ── Nail Storm: a stream of nails in every direction while it runs. ──
      if (this.now < s.stormUntil && this.now >= s.stormNextAt) {
        s.stormNextAt = this.now + NAILSTORM_RATE_MS;
        const spin = (this.now / 90) % (Math.PI * 2);
        for (let i = 0; i < 3; i++) {
          const ang = spin + (i / 3) * Math.PI * 2;
          this.nails.push({
            owner,
            x: f.x + Math.cos(ang) * 18,
            y: f.y + Math.sin(ang) * 18,
            vx: Math.cos(ang) * NAILSTORM_SPEED,
            vy: Math.sin(ang) * NAILSTORM_SPEED,
            ang,
            damage: NAILSTORM_DAMAGE + s.fx.pinBonus,
            diesAt: this.now + 1400,
          });
        }
      }

      // ── Re-Knit: rooted, and paid out at the end rather than up front. ──
      if (this.now < s.knitUntil) {
        (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        if (Math.random() < 0.2) this.fx(owner).lint(f.x, f.y - 6, 2, 12, 340, CLT.clothPale);
      } else if (s.knitUntil > 0) {
        s.knitUntil = 0;
        f.heal(KNIT_SCARF);
        f.pinnedHp += KNIT_PINNED;
        this.fx(owner).burst(f.x, f.y, 70, CLT.clothPale);
        if (owner === 'player') {
          this.api.showFloatingText(f.x, f.y - 50, `🧶 +${KNIT_SCARF} / +${KNIT_PINNED}`, this.hex(CLT.clothPale));
        }
      }

      // ── Heavy Coat: the engine's counter is the truth. We only ever follow it down, never
      // push it back up — re-asserting the 3 each frame would make the block permanent. ──
      if (s.coatCharges > 0) s.coatCharges = Math.min(s.coatCharges, f.shieldCharges);
    }

    // ── Scarf Slice: the wool sits still, then snaps home through everything on the line. ──
    for (let i = this.slices.length - 1; i >= 0; i--) {
      const sl = this.slices[i];
      if (this.now < sl.snapsAt) continue;
      if (!sl.snapped) {
        sl.snapped = true;
        const f = this.fighter(sl.owner);
        for (const t of this.targetsOf(sl.owner)) {
          if (!this.nearAnyStrand([sl.pts], t.x, t.y)) continue;
          this.hit(sl.owner, t, SLICE_DAMAGE);
          this.fx(sl.owner).stab(t.x, t.y, Math.atan2(f.y - t.y, f.x - t.x));
        }
        if (this.alive(f)) this.fx(sl.owner).reel(sl.pts[sl.pts.length - 1].x, sl.pts[sl.pts.length - 1].y, f.x, f.y);
        Sfx.playAt('whip', f.x, { volume: 0.8, rate: 1.1 });
      }
      this.slices.splice(i, 1);
    }
  }

  // ── Mastery ────────────────────────────────────────────────────────────────

  /** Space: shed what you are wearing and step out in the next thing. */
  private cycleOutfit(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || this.now < s.nextSwapAt) return;
    s.nextSwapAt = this.now + OUTFIT_SWAP_CD;
    const from = OUTFIT_COLOR[s.outfit];
    s.outfit = OUTFITS[(OUTFITS.indexOf(s.outfit) + 1) % OUTFITS.length];
    this.avatar(owner)?.setOutfit(s.outfit);
    this.fx(owner).shed(f.x, f.y, from, OUTFIT_COLOR[s.outfit]);
    Sfx.playAt('whip', f.x, { volume: 0.5, rate: 1.5 });
    if (owner === 'player') {
      this.api.showFloatingText(
        f.x, f.y - 52, `${OUTFIT_EMOJI[s.outfit]} ${OUTFIT_NAME[s.outfit]}`, this.hex(CLT.clothPale),
      );
    }
  }

  private tryCastWretched(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || this.now < s.wretchedReadyAt) return;
    s.wretchedReadyAt = this.now + WRETCHED_CD * s.fx.cooldownMult;
    s.wretchedUntil = this.now + WRETCHED_MS;
    s.wretchedStored = 0;
    this.avatar(owner)?.play('clap', 0, 400);
    this.fx(owner).burst(f.x, f.y, 60, CLT.clothDeep);
    Sfx.playAt('whip', f.x, { volume: 0.7, rate: 0.8 });
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 52, '🧣 WRETCHED SCARF', this.hex(CLT.clothPale));
      this.api.broadcastMasteryCast('wretched-scarf');
    }
  }

  doNpcWretched(): void { this.tryCastWretched('npc'); }

  /** 0–1 fill for the Wretched Scarf HUD card. */
  getBarRatio(abilityId: string, time: number): number {
    if (abilityId !== 'wretched-scarf') return 1;
    const s = this.sides.player;
    const cd = WRETCHED_CD * s.fx.cooldownMult;
    return Phaser.Math.Clamp(1 - (s.wretchedReadyAt - time) / cd, 0, 1);
  }

  /**
   * Wretched Scarf, while it runs and when it ends.
   *
   * Everything aimed at the tailor is eaten by `clothIncomingMult` being zero, but the fever
   * bookkeeping still sees the raw figure — so the ability can bank exactly what it swallowed and
   * hand it back as a blast. Nothing is invented and nothing is lost.
   */
  private updateWretched(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isCloth(owner) || !this.alive(f)) continue;
      // While it is up, `onHurt` is doing the banking — see the note there.
      if (this.now < s.wretchedUntil) continue;
      if (s.wretchedStored <= 0) continue;
      const payload = Math.round(s.wretchedStored * WRETCHED_RETURN);
      s.wretchedStored = 0;
      if (payload < 1) continue;
      this.fx(owner).burst(f.x, f.y, WRETCHED_R, CLT.clothDeep);
      Sfx.playAt('flame-burst', f.x, { volume: 0.9, rate: 0.7 });
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > WRETCHED_R) continue;
        this.hit(owner, t, payload, { aoe: true });
      }
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 56, `🧣 ${payload} RETURNED`, this.hex(CLT.clothPale));
      }
    }
  }

  // ── SummonPurgeTarget ──────────────────────────────────────────────────────

  /** Ruin's spikes and anything else that razes a board: pins and anchors are things on the floor. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    let n = 0;
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      report?.(px, py);
      n++;
      return true;
    };
    for (const owner of BOTH) {
      if (owner === exceptOwner) continue;
      const s = this.side(owner);
      // A planted pin, an anchor and a location marker are all things somebody put on the
      // floor. The scarf is not — it is the tailor's body, and razing it would be razing them.
      if (s.pin && near(s.pin.x, s.pin.y)) s.pin = null;
      if (s.anchorSet && near(s.anchorX, s.anchorY)) s.anchorSet = false;
      if (s.locSet && near(s.locX, s.locY)) s.locSet = false;
    }
    return n;
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    this.vizT += delta / 1000;
    const live = this.isCloth('player') || this.isCloth('npc');
    if (!live && !this.hasLiveState()) { this.teardown(); return; }

    this.applyStats();
    this.updateScarf();
    this.scarfCatchesShots();
    this.updateSpins(delta);
    this.updateLongpins(delta);
    this.updateReels(delta);
    this.feedWebs();
    this.updateWebs(delta);
    this.updateSafety();
    this.updateNails(delta);
    this.updateRightClick(delta);
    this.updateWretched();
    this.updateDraft();
    this.npcRightClick();
    this.flushMasteryStats();

    this.ensureLayers();
    this.paintGround();
    this.paintScarves();
    this.paintAir();
    this.paintHud();
    this.paintDraft();
    this.updateAvatars(delta);
  }

  private hasLiveState(): boolean {
    return this.reels.length > 0 || this.webs.length > 0 || this.nails.length > 0
      || this.slices.length > 0 || this.draft !== null;
  }

  private teardown(): void {
    if (!this.groundGfx && !this.scarfGfx && !this.airGfx && !this.hudGfx) return;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.scarfGfx?.destroy(); this.scarfGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.rcLabel?.destroy(); this.rcLabel = null;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.api.setStatusIndicator('cloth-pinned', null);
    this.api.setStatusIndicator('cloth-burn', null);
    this.api.setStatusIndicator('cloth-wretched', null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5 and the rig's torso paints at 5.5. Anchors are floor; the scarf is
    // worn *under* the tailor, so it sits in the half step between the two rather than over
    // them — a scarf painted on top of its own wearer reads as a scarf thrown at them.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.scarfGfx) this.scarfGfx = scene.add.graphics().setDepth(4.5);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      const isMine = this.isCloth(owner);
      let av = this.avatar(owner);
      if (!isMine || !this.alive(f)) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new ClothAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.side(owner);
      av.setMastered(this.mastered(owner));
      av.setOutfit(s.outfit);
      av.setWound(f.maxHp > 0 ? f.hp / f.maxHp : 0);
      av.setPinned(f.maxHp > 0 ? Math.min(1, f.pinnedHp / f.maxHp) : 0);
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    for (const owner of BOTH) {
      const s = this.side(owner);
      const tint = this.col(owner);
      if (!this.isCloth(owner)) continue;
      const f = this.fighter(owner);

      // Safety anchor, with the line running back to the tailor.
      if (s.anchorSet) {
        const f2 = this.fighter(owner);
        const armed = this.alive(f2)
          ? Phaser.Math.Clamp((f2.rawDamageTaken - s.anchorRaw) / SAFETY_TRIGGER_DAMAGE, 0, 1) : 0;
        anchorGlyph(g, tint, s.anchorX, s.anchorY, 0.95, t, armed);
        if (this.alive(f2)) {
          // The slack in the line is the damage tally: it pulls straight as the trigger nears.
          const mx = (s.anchorX + f2.x) / 2;
          const my = (s.anchorY + f2.y) / 2 + (1 - armed) * 26;
          g.lineStyle(1.8, tint(CLT.line), 0.35 + armed * 0.5);
          g.beginPath();
          g.moveTo(s.anchorX, s.anchorY - 11);
          g.lineTo(mx, my);
          g.lineTo(f2.x, f2.y);
          g.strokePath();
        }
      }

      // Location Pin marker.
      if (s.locSet) {
        g.lineStyle(2, tint(CLT.brass), 0.5 + Math.sin(t * 4) * 0.15);
        g.strokeEllipse(s.locX, s.locY + 4, 24, 10);
        pinGlyph(g, tint, s.locX, s.locY - 8, -Math.PI / 2, 22, 0.9, { head: 3 });
      }

      // Re-Knit's working circle.
      if (this.now < s.knitUntil && this.alive(f)) {
        const k = 1 - (s.knitUntil - this.now) / KNIT_MS;
        g.lineStyle(3, tint(CLT.clothPale), 0.6);
        g.beginPath();
        g.arc(f.x, f.y + 6, 30, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
        g.strokePath();
      }
    }

    // Webs are floor: whoever is in one is standing in it.
    for (const w of this.webs) {
      if (!this.alive(w.victim)) continue;
      webGlyph(g, this.col(w.owner), w.victim.x, w.victim.y, WEB_R, w.hp / w.maxHp, 0.95, t);
    }
  }

  /**
   * The wool, on its own layer under the fighters. Everything here is worn rather than thrown,
   * so it must never cover the character it belongs to.
   */
  private paintScarves(): void {
    const g = this.scarfGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    for (const owner of BOTH) {
      if (!this.isCloth(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      // Wrapped up, the tail is gone — the cocoon is painted over the tailor by `paintAir`,
      // because being wrapped is the one time the wool is meant to hide them.
      if (this.now < s.wretchedUntil) continue;
      // A pinned scarf is drawn by the slice loop below, as a ghost. Drawing it here as well
      // would paint the same wool twice at two different opacities.
      if (this.slices.some((sl) => sl.owner === owner && !sl.snapped)) continue;
      const tint = this.col(owner);
      const burn = this.now < s.burnUntil
        ? Phaser.Math.Clamp((this.now - s.burnStartedAt) / BURN_MS, 0, 0.7) : 0;
      const pinned = f.maxHp > 0 ? Math.min(1, f.pinnedHp / (f.maxHp * 0.4)) : 0;
      for (const strand of this.scarfStrands(owner)) {
        scarfRibbon(g, tint, strand, SCARF_WIDTH, 0.97, { t, burn, pinned });
      }
    }

    // ── A frozen scarf, waiting to snap ──
    for (const sl of this.slices) {
      const tint = this.col(sl.owner);
      scarfRibbon(g, tint, sl.pts, SCARF_WIDTH, 0.8, { t, ghost: true });
      // Pins holding it to the floor.
      for (let i = 1; i < sl.pts.length; i += 3) {
        pinGlyph(g, tint, sl.pts[i].x, sl.pts[i].y, -Math.PI / 2, 14, 0.85, { head: 2 });
      }
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    // ── Wrapped up: the scarf is a tight cocoon on the body instead of a tail behind it ──
    for (const owner of BOTH) {
      if (!this.isCloth(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f) || this.now >= s.wretchedUntil) continue;
      const tint = this.col(owner);
      const k = (s.wretchedUntil - this.now) / WRETCHED_MS;
      for (let i = 0; i < 5; i++) {
        const a = t * 3 + (i / 5) * Math.PI * 2;
        g.lineStyle(4.5, tint(i % 2 ? CLT.clothDeep : CLT.cloth), 0.9);
        g.strokeEllipse(f.x, f.y, 34 - i * 2 + Math.sin(a) * 2, 38 - i * 2.4);
      }
      g.fillStyle(tint(CLT.clothPale), 0.2 + (1 - k) * 0.4);
      g.fillCircle(f.x, f.y, 17);
    }

    // ── Pins in flight and pins planted ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      const tint = this.col(owner);
      if (s.flying) longpinGlyph(g, tint, s.flying.x, s.flying.y, s.flying.ang, 1, t);
      if (s.pin) {
        longpinGlyph(g, tint, s.pin.x, s.pin.y, s.pin.ang, 0.95, t);
        // The thread still running back to the tailor — this is what the recall pulls on.
        const f = this.fighter(owner);
        if (this.alive(f)) {
          g.lineStyle(1.4, tint(CLT.cloth), 0.4 + Math.sin(t * 5) * 0.12);
          const mx = (s.pin.x + f.x) / 2;
          const my = (s.pin.y + f.y) / 2 + 18;
          g.beginPath();
          g.moveTo(s.pin.x, s.pin.y);
          g.lineTo(mx, my);
          g.lineTo(f.x, f.y);
          g.strokePath();
        }
      }
    }

    // ── Nails ──
    for (const n of this.nails) {
      nailGlyph(g, this.col(n.owner), n.x, n.y, n.ang, 13, 0.95);
    }

    // ── The spin's tether ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.now >= s.spinUntil || !this.alive(s.spinTarget)) continue;
      const f = this.fighter(owner);
      const tgt = s.spinTarget!;
      g.lineStyle(2.6, this.col(owner)(CLT.cloth), 0.85);
      g.lineBetween(f.x, f.y, tgt.x, tgt.y);
      g.lineStyle(1.1, this.col(owner)(CLT.clothPale), 0.7);
      g.lineBetween(f.x, f.y - 1, tgt.x, tgt.y - 1);
    }
  }

  /** The scarf bar, the pin bar, and a thumbnail of the loom. Screen space. */
  private paintHud(): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!this.isCloth('player')) {
      this.hudLabel?.setVisible(false);
      this.rcLabel?.setVisible(false);
      return;
    }
    const s = this.sides.player;
    const f = this.api.player;
    const tint = this.pcol;
    const t = this.vizT;

    const x = 18;
    const y = 96;
    const w = 216;
    const h = 15;

    // ── The scarf bar ──
    // Drawn as a length of wool rather than as a rectangle: this is the health bar for this
    // element, and it should not look like anybody else's.
    g.fillStyle(tint(CLT.ink), 0.72);
    g.fillRoundedRect(x - 5, y - 5, w + 10, h + 32, 6);
    const k = f.maxHp > 0 ? Phaser.Math.Clamp(f.hp / f.maxHp, 0, 1) : 0;
    g.fillStyle(tint(CLT.deep), 0.9);
    g.fillRoundedRect(x, y, w, h, h / 2);
    // The wool itself, with knit rungs down it.
    g.fillStyle(tint(CLT.clothDeep), 1);
    g.fillRoundedRect(x, y, Math.max(h, w * k), h, h / 2);
    g.fillStyle(tint(this.now < s.burnUntil ? CLT.ember : CLT.cloth), 1);
    g.fillRoundedRect(x, y + 1.5, Math.max(h, w * k) - 2, h - 5, (h - 5) / 2);
    for (let i = 0; i < Math.floor(w * k / 9); i++) {
      g.lineStyle(1, tint(CLT.clothPale), 0.22);
      g.lineBetween(x + 5 + i * 9, y + 2, x + 5 + i * 9, y + h - 2);
    }
    // The fringe at the live end, so the bar reads as a scarf being paid out.
    const ex = x + Math.max(h, w * k);
    for (let i = -1; i <= 1; i++) {
      g.lineStyle(1.2, tint(CLT.clothDeep), 0.85);
      g.lineBetween(ex, y + h / 2, ex + 6, y + h / 2 + i * 4 + Math.sin(t * 6 + i) * 1.2);
    }

    // ── The pin bar, underneath ──
    const py = y + h + 4;
    const pk = f.maxHp > 0 ? Phaser.Math.Clamp(f.pinnedHp / f.maxHp, 0, 1) : 0;
    g.fillStyle(tint(CLT.deep), 0.85);
    g.fillRoundedRect(x, py, w, 7, 3.5);
    if (pk > 0) {
      g.fillStyle(tint(CLT.pinnedDark), 1);
      g.fillRoundedRect(x, py, w * pk, 7, 3.5);
      g.fillStyle(tint(CLT.pinned), 1);
      g.fillRoundedRect(x, py + 1, Math.max(2, w * pk - 2), 4, 2);
      // A needle sticking out of the live end.
      pinGlyph(g, tint, x + w * pk, py + 3.5, 0, 13, 0.95, { head: 2 });
    }

    // ── The loom thumbnail ──
    const lc = 11;
    const lx = x + w + 16;
    const ly = y - 2;
    g.fillStyle(tint(CLT.ink), 0.72);
    g.fillRoundedRect(lx - 4, ly - 4, TAPESTRY_SIZE * lc + 8, TAPESTRY_SIZE * lc + 8, 4);
    for (let gy = 0; gy < TAPESTRY_SIZE; gy++) {
      for (let gx = 0; gx < TAPESTRY_SIZE; gx++) {
        const id = s.tap.grid[gy * TAPESTRY_SIZE + gx];
        loomCell(g, tint, lx + gx * lc, ly + gy * lc, lc - 1, id ? ARTWORK_MAP[id]?.color ?? CLT.cloth : null, 1);
      }
    }

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(0, 0, '', {
        fontSize: '11px', color: '#f7c3cc', fontStyle: 'bold',
      }).setDepth(21).setScrollFactor(0);
    }
    this.hudLabel.setVisible(true);
    this.hudLabel.setPosition(x, y + h + 13);
    const used = usedCells(s.tap);
    const outfit = this.mastered('player') ? `  ${OUTFIT_EMOJI[s.outfit]} ${OUTFIT_NAME[s.outfit]}` : '';
    this.hudLabel.setText(
      `🧣 ${Math.round(f.hp)}/${Math.round(f.maxHp)}`
      + (f.pinnedHp > 0 ? `   📍 ${Math.round(f.pinnedHp)}` : '')
      + `   🧵 ${used}/25${outfit}`,
    );

    // ── The right-click card ──
    const rcId = s.fx.rightClick;
    if (!this.rcLabel) {
      this.rcLabel = this.api.scene.add.text(0, 0, '', {
        fontSize: '11px', color: '#ffd98a', fontStyle: 'bold',
      }).setDepth(21).setScrollFactor(0);
    }
    if (!rcId) {
      this.rcLabel.setVisible(false);
    } else {
      const def = ARTWORK_MAP[rcId];
      const cdLeft = Math.max(0, s.rcReadyAt - this.now);
      const cd = (RC_COOLDOWNS[rcId] ?? 8000) * s.fx.cooldownMult;
      const ready = cdLeft <= 0;
      const bx = lx + TAPESTRY_SIZE * lc + 18;
      g.fillStyle(tint(CLT.ink), 0.75);
      g.fillRoundedRect(bx - 4, ly - 4, 136, 30, 5);
      g.fillStyle(tint(CLT.deep), 1);
      g.fillRoundedRect(bx, ly + 14, 128, 7, 3.5);
      g.fillStyle(tint(ready ? CLT.brass : CLT.clothDeep), 1);
      g.fillRoundedRect(bx, ly + 14, 128 * (cd > 0 ? 1 - cdLeft / cd : 1), 7, 3.5);
      this.rcLabel.setVisible(true);
      this.rcLabel.setPosition(bx + 2, ly);
      this.rcLabel.setColor(ready ? '#ffd98a' : '#8a2135');
      this.rcLabel.setText(`🖱️ ${def?.name ?? rcId}`);
    }

    // ── Status tray ──
    this.api.setStatusIndicator('cloth-pinned', f.pinnedHp > 0 ? {
      name: 'Pinned', emoji: '📍', color: CLT.pinned,
      description: `${Math.round(f.pinnedHp)} health made of pins. Spent first, ${
        s.fx.pinnedNoVuln ? 'at normal rate' : '25% faster'}, and reflects ${
        Math.round(s.fx.thorns * 100)}% of what it eats.`,
      count: Math.round(f.pinnedHp),
    } : null);
    this.api.setStatusIndicator('cloth-burn', this.now < s.burnUntil ? {
      name: 'Burn It Down', emoji: '🔥', color: CLT.ember,
      description: 'The scarf is alight. Damage climbs every second, and so does what it costs.',
      until: s.burnUntil,
      count: Math.round((this.burnBonus('player') - 1) * 100),
      suffix: '%',
    } : null);
    this.api.setStatusIndicator('cloth-wretched', this.now < s.wretchedUntil ? {
      name: 'Wretched Scarf', emoji: '🧣', color: CLT.clothDeep,
      description: 'Wrapped up. Nothing gets through, and all of it comes back out at the end.',
      until: s.wretchedUntil,
      count: Math.round(s.wretchedStored),
    } : null);
  }

  /** The draft: three cards and a loom, drawn over the arena while the match keeps running. */
  private paintDraft(): void {
    const d = this.draft;
    if (!d || d.owner !== 'player') {
      if (this.draftGfx) { this.draftGfx.destroy(); this.draftGfx = null; }
      for (const t of this.draftTexts) t.destroy();
      this.draftTexts = [];
      return;
    }
    if (!this.draftGfx) {
      this.draftGfx = this.api.scene.add.graphics().setDepth(30).setScrollFactor(0);
    }
    const g = this.draftGfx;
    g.clear();
    const tint = this.pcol;
    const s = this.sides.player;

    // A dimmer, but a light one — the arena underneath is still live and still dangerous.
    g.fillStyle(CLT.ink, 0.52);
    g.fillRect(0, 0, this.api.width, this.api.height);

    const need = 4 + d.offers.length;
    while (this.draftTexts.length < need) {
      this.draftTexts.push(this.api.scene.add.text(0, 0, '', {
        fontSize: '13px', color: '#f7c3cc', wordWrap: { width: 190 },
      }).setDepth(31).setScrollFactor(0));
    }

    const left = Math.max(0, DRAFT_MS - (this.now - d.openedAt));
    const title = this.draftTexts[0];
    title.setStyle({ fontSize: '20px', color: '#ffd98a', fontStyle: 'bold' });
    title.setText(d.picked ? `🧵 SEW  ${d.picked.name}` : '🧵 CHOOSE AN ARTWORK');
    title.setPosition(this.api.width / 2 - title.width / 2, 108);

    const sub = this.draftTexts[1];
    sub.setStyle({ fontSize: '12px', color: '#c9b3bb' });
    sub.setText(d.picked
      ? 'Move the mouse over the loom, click to sew.'
      : `Click a card or press 1 / 2 / 3.     ${(left / 1000).toFixed(1)}s`);
    sub.setPosition(this.api.width / 2 - sub.width / 2, 134);

    // ── The loom ──
    const { x: lx, y: ly, cell } = this.loomOrigin();
    g.fillStyle(tint(CLT.loom), 0.9);
    g.fillRoundedRect(lx - 8, ly - 8, TAPESTRY_SIZE * cell + 16, TAPESTRY_SIZE * cell + 16, 7);
    for (let gy = 0; gy < TAPESTRY_SIZE; gy++) {
      for (let gx = 0; gx < TAPESTRY_SIZE; gx++) {
        const id = s.tap.grid[gy * TAPESTRY_SIZE + gx];
        loomCell(g, tint, lx + gx * cell + 1, ly + gy * cell + 1, cell - 2,
          id ? ARTWORK_MAP[id]?.color ?? CLT.cloth : null, 1);
      }
    }
    // The ghost of what is about to be sewn.
    if (d.picked) {
      const ok = canPlace(s.tap, d.picked, d.gx, d.gy);
      for (const [cx, cy] of d.picked.cells) {
        const px = lx + (d.gx + cx) * cell + 1;
        const py = ly + (d.gy + cy) * cell + 1;
        g.fillStyle(ok ? tint(d.picked.color) : 0x882222, 0.55 + Math.sin(this.vizT * 8) * 0.12);
        g.fillRect(px, py, cell - 2, cell - 2);
        g.lineStyle(2, ok ? tint(CLT.clothPale) : 0xff5555, 0.9);
        g.strokeRect(px, py, cell - 2, cell - 2);
      }
    }

    // ── The three cards ──
    const cw = 210;
    const gap = 18;
    const total = d.offers.length * cw + (d.offers.length - 1) * gap;
    const x0 = this.api.width / 2 - total / 2;
    const y0 = 396;
    for (let i = 0; i < d.offers.length; i++) {
      const def = d.offers[i];
      const cx = x0 + i * (cw + gap);
      const chosen = d.picked === def;
      g.fillStyle(tint(CLT.deep), chosen ? 1 : 0.92);
      g.fillRoundedRect(cx, y0, cw, 168, 8);
      g.lineStyle(chosen ? 3 : 2, tint(chosen ? CLT.brassLit : def.color), 0.95);
      g.strokeRoundedRect(cx, y0, cw, 168, 8);

      // The piece's shape, drawn full size so the player is choosing a shape as much as a stat.
      const sc = 17;
      const w = Math.max(...def.cells.map((c) => c[0])) + 1;
      const h = Math.max(...def.cells.map((c) => c[1])) + 1;
      const sx = cx + cw / 2 - (w * sc) / 2;
      const sy = y0 + 30;
      for (const [ccx, ccy] of def.cells) {
        loomCell(g, tint, sx + ccx * sc, sy + ccy * sc, sc - 2, def.color, 1);
      }

      const label = this.draftTexts[4 + i];
      label.setStyle({ fontSize: '12px', color: '#f7c3cc', wordWrap: { width: cw - 22 } });
      label.setText(`${def.name}${def.kind === 'rightclick' ? '  🖱️' : ''}\n${def.blurb}`);
      label.setPosition(cx + 11, sy + h * sc + 10);
    }

    // The number hints sit on the cards themselves.
    const hint = this.draftTexts[2];
    hint.setStyle({ fontSize: '15px', color: '#ffd98a', fontStyle: 'bold' });
    hint.setText(d.picked ? '' : '1                              2                              3');
    hint.setPosition(x0 + 10, y0 + 8);
    this.draftTexts[3].setText('');
  }

  // ── Public accessors ArenaScene reads ──────────────────────────────────────

  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    if (!this.isCloth(owner)) return 1;
    const s = this.side(owner);
    let m = s.fx.speedMult;
    if (this.now < s.safetySpeedUntil) m *= 1 + SAFETY_SPEED_BONUS;
    // Re-Knit and the grapple spin both take the legs away entirely.
    if (this.now < s.knitUntil) m = 0;
    return m;
  }

  /** Whether this side currently has a right-click ability, and which. For the bot and the HUD. */
  rightClickOf(owner: Owner): string | null { return this.side(owner).fx.rightClick; }
  pinnedOf(owner: Owner): number { return this.fighter(owner)?.pinnedHp ?? 0; }
  hasPlantedPin(owner: Owner): boolean { return this.side(owner).pin !== null; }
  hasAnchor(owner: Owner): boolean { return this.side(owner).anchorSet; }
  /** How close the anchor is to firing itself, 0–1. The bot bails out before it is dragged. */
  anchorPressure(owner: Owner): number {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.anchorSet || !this.alive(f)) return 0;
    return Phaser.Math.Clamp((f.rawDamageTaken - s.anchorRaw) / SAFETY_TRIGGER_DAMAGE, 0, 1);
  }
  /** Pins landed toward the grapple spin, and how many it takes. */
  comboProgress(owner: Owner): number {
    const s = this.side(owner);
    return s.fx.comboAt > 0 ? s.streak / s.fx.comboAt : 0;
  }
  webbedTarget(owner: Owner): boolean {
    return this.webs.some((w) => w.owner === owner && this.alive(w.victim));
  }
  tapestryPieces(owner: Owner): number { return this.side(owner).tap.placed.length; }

  /**
   * The two damage-counting mastery requirements, flushed once a second rather than per hit —
   * both of them tick on every point of damage the element deals, and `addMasteryStat` writes
   * through to localStorage.
   */
  private nextStatFlushAt = 0;

  private flushMasteryStats(): void {
    if (this.now < this.nextStatFlushAt) return;
    this.nextStatFlushAt = this.now + 1000;
    const s = this.sides.player;
    const pinned = Math.floor(s.pinnedDamageAccum);
    if (pinned > 0) { s.pinnedDamageAccum -= pinned; this.api.addMasteryStat('pinnedDamage', pinned); }
    const web = Math.floor(s.webDamageAccum);
    if (web > 0) { s.webDamageAccum -= web; this.api.addMasteryStat('webDamage', web); }
  }

  // ── The bot's right click ──────────────────────────────────────────────────

  /**
   * The bot has no mouse, so its right-click artwork is driven from here rather than from
   * `doClothAbilities`. Each one has the single condition it is actually for — the AI is not
   * asked to understand eight different buttons, only to be handed the one it drafted.
   */
  private npcRightClick(): void {
    const s = this.sides.npc;
    const id = s.fx.rightClick;
    const f = this.api.npc;
    if (!id || !this.isCloth('npc') || !this.alive(f) || this.now < s.rcReadyAt) return;
    const target = this.nearestTarget('npc', f.x, f.y);
    if (!target) return;
    const dist = Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y);
    const hurt = f.maxHp > 0 ? f.hp / f.maxHp : 1;

    const want = (() => {
      switch (id) {
        case 'scarf-switch': return dist < SWITCH_RANGE;
        case 'clothstorm': return dist < STORM_R * 0.8;
        case 'nail-storm': return dist < 320;
        case 'burn-it-down': return dist < 260 && hurt > 0.5;
        case 'heavy-coat': return dist < 300 || hurt < 0.6;
        case 're-knit': return dist > 340 && hurt < 0.7;
        case 'location-pin': return !s.locSet || dist > 400;
        case 'scarf-slice': return dist < 200;
        default: return false;
      }
    })();
    if (!want) return;
    // Re-Knit roots the bot — never start one with somebody in its face.
    if (id === 're-knit' && dist < 260) return;
    this.castRightClick('npc', id, target.x, target.y);
  }

  // ── Context entry points ───────────────────────────────────────────────────

  doPinAt(owner: Owner, tx: number, ty: number): void { this.doPin(owner, tx, ty); }
}

// ── Q+ Salvage ───────────────────────────────────────────────────────────────

/**
 * Q+ turns the loom into something that outlives a match. On a win or a loss a couple of the
 * artworks that were on it are kept, chosen at random, and the next Cloth run starts part-woven.
 *
 * Stored under the kit's own key rather than through the upgrade tables, because it is match
 * state that happens to persist rather than something the player bought.
 */
const SALVAGE_KEY = 'elemental_cloth_salvage';
const SALVAGE_KEEP = 2;

function saveSalvage(t: TapestryState): void {
  try {
    const keep = [...t.placed];
    // Take the *last* few sewn, so a salvage is what the run was building toward.
    const kept = keep.slice(-SALVAGE_KEEP);
    localStorage.setItem(SALVAGE_KEY, JSON.stringify(kept));
  } catch { /* storage is a nicety here, never a requirement */ }
}

function salvagedTapestry(): TapestryState {
  const t = emptyTapestry();
  try {
    const raw = localStorage.getItem(SALVAGE_KEY);
    if (!raw) return t;
    const kept = JSON.parse(raw) as Array<{ id: string; gx: number; gy: number }>;
    if (!Array.isArray(kept)) return t;
    // Randomised down to "a few pieces" rather than all of them — Salvage is a head start, not
    // a saved loadout, so a run never simply resumes the last one.
    const take = kept.filter(() => Math.random() < 0.7);
    for (const p of take) {
      const def = ARTWORK_MAP[p.id];
      if (!def) continue;
      if (!canPlace(t, def, p.gx, p.gy)) {
        const spots = fitsAt(t, def);
        if (spots.length === 0) continue;
        place(t, def, spots[0][0], spots[0][1]);
        continue;
      }
      place(t, def, p.gx, p.gy);
    }
  } catch { /* a corrupt salvage is simply an empty loom */ }
  return t;
}

/** Exposed for the previews, which build a loom without a match around it. */
export { cloneTapestry, summarise as summariseTapestry };
