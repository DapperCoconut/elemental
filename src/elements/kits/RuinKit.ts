import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  RUI, RuinAvatar, RuinColorFn, RuinFx, chainRun, crackWeb, decayCoat, jitter,
  padlock, rubyJewel, ruinCluster, ruinRing, rustySpike, shrapnelShard, shredWedge,
} from './RuinVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;

// ── Shred Slice (Click) ──────────────────────────────────────────────────────
const SHRED_SPEED = 720;
const SHRED_DAMAGE = 15;
const SHRED_LEN = 34;
/** Deliberately fat: this thing is supposed to plough through a lane, not thread it. */
const SHRED_HIT_R = 30;
/** How close a shot has to pass to be torn apart. Wider than the body hitbox on purpose. */
const SHRED_EAT_R = 34;
const SHRED_LIFE_MS = 2400;

// ── Lockdown (E) ─────────────────────────────────────────────────────────────
const LOCK_RANGE = 460;
const LOCK_MS = 20000;

// ── Rusty Skewer (R) ─────────────────────────────────────────────────────────
const SKEWER_SPEED = 620;
const SKEWER_LEN = 150;
const SKEWER_HALF_WIDTH = 13;
const SKEWER_HIT_R = 40;
const SKEWER_DAMAGE = 10;
/** Share of current HP rusted into weak HP — grey, and draining at 3/s from the moment it lands. */
const SKEWER_RUST_FRACTION = 0.1;
const SKEWER_MAX_RIDERS = 3;
/** A skewer that somehow never finds a wall still has to end. */
const SKEWER_LIFE_MS = 5000;
const RIDER_FIRST_OFFSET = 26;
const RIDER_SPACING = 34;

// ── Spikes of Ruin (F) ───────────────────────────────────────────────────────
const RING_R = 122;
const RING_FUSE_MS = 2000;
const RING_DAMAGE = 15;
/**
 * How long a victim's buffs stay turned inside out. The one-shot flip below catches every
 * plain field on `Fighter`; this window is what catches the boosts that live inside other
 * kits, which can only be felt at the speed and mitigation chokepoints.
 */
const INVERT_MS = 8000;

// ── Unstoppable Decay (Q) ────────────────────────────────────────────────────
const DECAY_SLOW = 0.9;
const DECAY_VULN = 1.1;
const DECAY_WEAKEN = 0.9;
/** It never expires, so it has to stop somewhere: ten stacks is 2.6× damage taken. */
const MAX_DECAY = 10;

// ── Shatter Starter (Click upgrade) ──────────────────────────────────────────
/**
 * The ruin crystal. Red, half see-through, and the seed of every other Ruin upgrade: the
 * skewer drinks them, the spikes chain off them, the cracks charge them. Buying anything else
 * on this element without buying this first is buying a hook with nothing to hang on it.
 */
const CRYSTAL_R = 15;
const CRYSTAL_TOUCH_DAMAGE = 10;
/** Per victim, so walking over one costs a bite rather than a frame's worth of them. */
const CRYSTAL_TOUCH_MS = 800;
/** However many shots get shredded, the floor stops taking more than this. */
const CRYSTAL_MAX = 14;
/** Shred Slice grows one of its own every time it has dealt this much. */
const CRYSTAL_PER_DAMAGE = 50;
/** How close a shot has to pass to come out the other side rusted. */
const RUST_R = CRYSTAL_R + 7;
/** A rusted shot is half the size it was, and reads that way. */
const RUST_SCALE = 0.5;

// ── Lockjaw (E upgrade) ──────────────────────────────────────────────────────
/** Per stack, every single time the ability is used — for the rest of the match. */
const LOCKJAW_DAMAGE = 12;

// ── Ruin Transfusion (R upgrade) ─────────────────────────────────────────────
/** What a fed skewer takes instead of the rust: real damage, off whatever health they have. */
const TRANSFUSION_FRACTION = 0.15;

// ── Chain Reaction (F upgrade) ───────────────────────────────────────────────
const BLAST_R = 150;
const BLAST_DAMAGE = 25;
/** A beat between links, so six crystals going up reads as a chain rather than one bang. */
const CHAIN_DELAY_MS = 110;
const SPIKE_COUNT = 12;
const SPIKE_DAMAGE = 15;
const SPIKE_SPEED = 440;
const SPIKE_LIFE_MS = 1000;
const SPIKE_HIT_R = 16;
const SPIKE_LEN = 14;
/** What one spike takes off the attack its victim last used, permanently. */
const BLUNT_STEP = 0.1;
const BLUNT_MAX = 7;

// ── Ruin Cracks (Q upgrade) ──────────────────────────────────────────────────
const CRACKS_PER_CAST = 2;
const CRACK_R = 46;
const CRACK_DPS = 12;
const CRACK_TICK_MS = 500;
/** Every crystal that goes off widens every crack. Deliberately uncapped. */
const CRACK_GROWTH = 0.03;
/** A crystal grown on top of a crack lashes out on this beat. */
const BOLT_MS = 1500;
const BOLT_DAMAGE = 15;
const BOLT_RANGE = 200;

// ── World objects ────────────────────────────────────────────────────────────

/** A shredding wedge in flight. `hits` is per-fighter so it pierces without double-dipping. */
interface Wedge {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  spin: number;
  seed: number;
  hits: Set<Fighter>;
  /** How many shots it has eaten — drives the "SHREDDED" callout when it finally dies. */
  eaten: number;
}

/** The thrown spike, and whoever is currently threaded onto it. */
interface Skewer {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  vx: number;
  vy: number;
  diesAt: number;
  riders: Fighter[];
  seed: number;
  /** Ruin Transfusion: it has drunk a crystal, so it glows and takes health instead of rust. */
  fed: boolean;
}

/**
 * A ruin crystal: the thing Shred Slice leaves where it tore a shot out of the air.
 *
 * It is a hazard, a filter and a fuse all at once — it bites whoever touches it, it rusts
 * whatever flies through it, and the R, F and Q upgrades all read it rather than adding
 * anything of their own to the board.
 */
interface Crystal {
  owner: Owner;
  x: number;
  y: number;
  seed: number;
  bornAt: number;
  /** Per-victim contact cooldown, so standing in one isn't instant death. */
  bitAt: Map<Fighter, number>;
  /** Grown on top of one of your cracks, so it throws ruinic lightning. */
  charged: boolean;
  nextBoltAt: number;
  /** Chain Reaction: queued to go off at this timestamp. 0 while it is just sitting there. */
  blowAt: number;
}

/** A ruin crack: a permanent sore on the floor that eats whoever stands in it. */
interface Crack {
  owner: Owner;
  x: number;
  y: number;
  /** Starts at CRACK_R and grows 3% every time a crystal goes off. Nothing shrinks it. */
  r: number;
  seed: number;
}

/** One ruin spike thrown out of a detonating crystal. Pierces, so it remembers who it hit. */
interface Spike {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  seed: number;
  hits: Set<Fighter>;
}

/** A bolt of ruinic lightning, drawn for a few frames after it has already landed. */
interface Bolt {
  owner: Owner;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  until: number;
  seed: number;
}

/** The red circle, still following its caster and counting down. */
interface SpikeRing {
  owner: Owner;
  x: number;
  y: number;
  startedAt: number;
  seed: number;
}

/** A padlock hanging on somebody, purely so the lock can be seen as well as felt. */
interface Lock {
  owner: Owner;
  victim: Fighter;
  abilityId: string;
  abilityName: string;
  until: number;
  seed: number;
  /** 0–1 — the shackle closing over the first fifth of a second. */
  snap: number;
}

/** A fleck of somebody shed onto the floor by the decay. Pure decoration, and short-lived. */
interface Fleck {
  x: number;
  y: number;
  until: number;
  seed: number;
}

interface Side {
  owner: Owner;
  /** Latched from the last cast so the NPC's rig faces what it is doing. */
  aimX: number;
  aimY: number;
  /** How many stacks of rot this side has put on the arena. Never goes down. */
  decay: number;
  /** Damage Shred Slice has dealt since it last grew a crystal, counting down from 50. */
  shredDamage: number;
}

function makeSide(owner: Owner): Side {
  return { owner, aimX: 0, aimY: 0, decay: 0, shredDamage: 0 };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface RuinArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** The shared projectile group. Shred Slice eats whatever of it belongs to the other side. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Ruin visual colour through that side's equipped skin. */
  ruinColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /**
   * Spikes of Ruin: kill every structure, building and summon inside the circle that isn't
   * `exceptOwner`'s, and return how many died. ArenaScene owns the dispatch because it is the
   * only object that holds every kit.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number;
  /** Shred Slice: tear up the kit-local registered projectiles owned by `owner` in range. */
  shredRegisteredProjectiles(owner: Owner, x: number, y: number, radius: number): number;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── RuinKit ──────────────────────────────────────────────────────────────────

export class RuinKit {
  private api: RuinArenaApi;

  // ── Visuals ──
  private readonly pcol: RuinColorFn;
  private readonly ncol: RuinColorFn;
  private readonly pfx: RuinFx;
  private readonly nfx: RuinFx;
  private playerAvatar: RuinAvatar | null = null;
  private npcAvatar: RuinAvatar | null = null;
  /** Rings, cracks and shed flecks: on the floor, under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Wedges, the skewer, padlocks and the rot on a body — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private wedges: Wedge[] = [];
  private skewers: Skewer[] = [];
  private rings: SpikeRing[] = [];
  private locks: Lock[] = [];
  private flecks: Fleck[] = [];
  private crystals: Crystal[] = [];
  private cracks: Crack[] = [];
  private spikes: Spike[] = [];
  private bolts: Bolt[] = [];
  /** Accumulates toward CRACK_TICK_MS, so the cracks bite on a beat rather than every frame. */
  private crackTick = 0;
  /**
   * Chain Reaction's blunting. Attacker → ability → how many ruin spikes have taken a bite out
   * of it. Like Lockjaw it never expires, so it outlives everything else here.
   */
  private blunt = new Map<Fighter, { owner: Owner; stacks: Map<string, number> }>();
  /**
   * Lockjaw. Victim → ability → how many padlocks that ability has worn. It never expires and
   * never comes off, so this outlives every lock in `locks`.
   */
  private lockjaw = new Map<Fighter, Map<string, number>>();
  /** The `'cast'` listener attached to each lockjawed victim, kept so `reset()` can take it off. */
  private lockjawHooks = new Map<Fighter, (abilityId: string) => void>();
  /** Everyone this kit has written `ruinIncomingMult` / `buffsInvertedUntil` onto. */
  private touched = new Set<Fighter>();
  private fleckAccum = 0;

  constructor(api: RuinArenaApi) {
    this.api = api;
    this.pcol = (base) => api.ruinColor('player', base);
    this.ncol = (base) => api.ruinColor('npc', base);
    this.pfx = new RuinFx(api.scene, this.pcol);
    this.nfx = new RuinFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): RuinFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): RuinColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

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

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /** Whether `f` is on the receiving end of `owner`'s rot. */
  private isEnemyOf(owner: Owner, f: Fighter): boolean {
    return owner === 'player' ? this.api.enemies.includes(f) : f === this.api.player;
  }

  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') return this.alive(this.api.player) ? this.api.player : null;
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return this.alive(t) ? t : null;
  }

  /** Every fighter in the match, for the effects that don't care whose side anybody is on. */
  private everyone(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (this.alive(f) && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private avatar(owner: Owner): RuinAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private isRuin(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'ruin' : this.api.npcElementId === 'ruin';
  }

  /** Whether that side has bought the shop upgrade in `slot`. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /** True while `f` is threaded onto somebody's skewer. */
  private isRidden(f: Fighter): boolean {
    return this.skewers.some((s) => s.riders.includes(f));
  }

  private nameOfAbility(f: Fighter, abilityId: string): string {
    return f.element.abilities.find((a) => a.id === abilityId)?.name ?? abilityId;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Everything written onto a fighter is handed back here, or the next match opens with
    // somebody permanently rotted, permanently locked or permanently stuck on a spike.
    for (const f of this.touched) {
      f.ruinIncomingMult = 1;
      f.buffsInvertedUntil = 0;
    }
    this.touched.clear();
    for (const s of this.skewers) {
      for (const r of s.riders) r.skeweredUntil = 0;
    }
    for (const l of this.locks) {
      if (l.victim.active) l.victim.clearLocks();
    }
    // Lockjaw's bite is an event listener rather than a field, so it is the one thing here that
    // would survive a match on its own if it weren't unhooked by hand.
    for (const [victim, hook] of this.lockjawHooks) victim.off('cast', hook);
    this.lockjawHooks.clear();
    this.lockjaw.clear();
    this.blunt.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.wedges = [];
    this.skewers = [];
    this.rings = [];
    this.locks = [];
    this.flecks = [];
    this.crystals = [];
    this.cracks = [];
    this.spikes = [];
    this.bolts = [];
    this.crackTick = 0;
    this.fleckAccum = 0;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'ruin') return;
    void time;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (clicked) p.castAbility('ruin-shred', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('ruin-lockdown', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('ruin-skewer', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('ruin-spikes', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('ruin-decay', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Shred Slice. The damage is ordinary; what the wedge is really for is the lane it
   * clears, since it keeps going through bodies *and* through whatever the other side had in
   * the air on the same line.
   *
   * With Shatter Starter, the lane it clears doesn't stay clear: every shot it tears apart
   * leaves a ruin crystal standing where the shot died, and every fifty damage it deals grows
   * one more. Nothing else on the element makes crystals, so this is where all four upgrades
   * actually start.
   */
  doShred(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.wedges.push({
      owner,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * SHRED_SPEED,
      vy: Math.sin(ang) * SHRED_SPEED,
      diesAt: this.now + SHRED_LIFE_MS,
      spin: Math.random() * 6,
      seed: Math.random() * 999,
      hits: new Set<Fighter>(),
      eaten: 0,
    });

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).rustPuff(f.x + Math.cos(ang) * 20, f.y + Math.sin(ang) * 20, 4, 12, 380, 9);
  }

  /**
   * E — Lockdown. Aimed at a *fighter*, not a point: the padlock goes on whoever is nearest to
   * the cursor inside its reach, and takes away the last thing they did. Both ways of missing
   * — nobody in range, or nobody who has cast anything yet — hand the cooldown straight back,
   * because a twenty-five second wall for zero effect is not a trade anyone would ever take.
   */
  doLockdown(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    let victim: Fighter | null = null;
    let best = Infinity;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > LOCK_RANGE) continue;
      const d = Phaser.Math.Distance.Between(tx, ty, t.x, t.y);
      if (d < best) { best = d; victim = t; }
    }

    if (!victim) {
      f.resetCooldown('ruin-lockdown');
      this.api.showFloatingText(f.x, f.y - 46, '🔒 NOTHING IN REACH', this.hex(RUI.ash));
      return;
    }

    const abilityId = victim.lastCastAbilityId;
    if (!abilityId) {
      f.resetCooldown('ruin-lockdown');
      this.api.showFloatingText(victim.x, victim.y - 46, '🔒 NOTHING TO LOCK', this.hex(RUI.ash));
      return;
    }

    const abilityName = this.nameOfAbility(victim, abilityId);
    victim.lockAbility(abilityId, LOCK_MS);
    // Only one padlock per victim is drawn; a second lock replaces the picture, not the effect.
    const existing = this.locks.findIndex((l) => l.victim === victim);
    if (existing >= 0) this.locks.splice(existing, 1);
    this.locks.push({
      owner, victim, abilityId, abilityName,
      until: this.now + LOCK_MS, seed: Math.random() * 999, snap: 0,
    });

    this.avatar(owner)?.play('sweep', Math.atan2(victim.y - f.y, victim.x - f.x));
    this.fx(owner).lockSnap(f.x, f.y, victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 52, `🔒 ${abilityName.toUpperCase()}`, this.hex(RUI.rust));
    this.api.showFloatingText(victim.x, victim.y - 32, 'LOCKED 20s', this.hex(RUI.red));
    Sfx.playAt('chain', victim.x, { volume: 0.9, rate: 0.8 });

    if (this.up(owner, 'e')) this.addLockjaw(owner, victim, abilityId, abilityName);
  }

  /**
   * Lockjaw. The padlock comes off after twenty seconds; the teeth marks don't. From here on
   * that ability costs its owner 12 HP every single time they use it, and locking it again
   * simply adds another set of teeth — there is no cap and no expiry, so a Ruin player who
   * keeps picking the same ability turns it into a self-inflicted wound.
   *
   * Hung off `Fighter`'s `'cast'` event because that is the only place *every* route into an
   * ability passes through: charge-and-release abilities stamp via `triggerCooldown`, and
   * Psychic's delayed casts announce two seconds after they were paid for.
   */
  private addLockjaw(owner: Owner, victim: Fighter, abilityId: string, abilityName: string): void {
    let byAbility = this.lockjaw.get(victim);
    if (!byAbility) { byAbility = new Map<string, number>(); this.lockjaw.set(victim, byAbility); }
    const stacks = (byAbility.get(abilityId) ?? 0) + 1;
    byAbility.set(abilityId, stacks);

    if (!this.lockjawHooks.has(victim)) {
      const hook = (castId: string): void => this.biteLockjaw(owner, victim, castId);
      this.lockjawHooks.set(victim, hook);
      victim.on('cast', hook);
    }

    this.fx(owner).shatter(victim.x, victim.y - 20, 6, 22, RUI.rust, 420, 11);
    this.api.showFloatingText(victim.x, victim.y - 68,
      `🦷 LOCKJAW ×${stacks} — ${abilityName.toUpperCase()}`, this.hex(RUI.ember));
  }

  /** Somebody used an ability the jaws are still on. */
  private biteLockjaw(owner: Owner, victim: Fighter, abilityId: string): void {
    const stacks = this.lockjaw.get(victim)?.get(abilityId) ?? 0;
    if (stacks <= 0 || !this.alive(victim)) return;
    const cost = LOCKJAW_DAMAGE * stacks;
    // The teeth belong to whoever set them, so this is not self-inflicted damage — it still has
    // to land on a co-op ally carrying `allyDamageBlocked`.
    Fighter.asNonAllyDamage(() => victim.takeDamage(cost));
    this.fx(owner).bite(victim.x, victim.y, 24, RUI.rust);
    this.api.showFloatingText(victim.x, victim.y - 56, `🦷 LOCKJAW ×${stacks}`, this.hex(RUI.ember));
    Sfx.playAt('chain', victim.x, { volume: 0.55, rate: 1.35 });
  }

  /**
   * R — Rusty Skewer. The ten damage is almost beside the point: what it really does is take a
   * tenth of the target's health out of the pool that heals and put it in the one that rots,
   * then drag them across the arena while it drains.
   */
  doSkewer(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    // One in the air per side. A second would only steal the first one's riders.
    if (this.skewers.some((sk) => sk.owner === owner)) return;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.skewers.push({
      owner,
      x: f.x + Math.cos(ang) * 34,
      y: f.y + Math.sin(ang) * 34,
      ang,
      vx: Math.cos(ang) * SKEWER_SPEED,
      vy: Math.sin(ang) * SKEWER_SPEED,
      diesAt: this.now + SKEWER_LIFE_MS,
      riders: [],
      seed: Math.random() * 999,
      fed: false,
    });

    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).rustPuff(f.x, f.y, 8, 26, 480, 9);
    this.api.showFloatingText(f.x, f.y - 46, '🩸 RUSTY SKEWER', this.hex(RUI.rust));
    Sfx.playAt('whoosh', f.x, { volume: 0.8, rate: 0.7 });
  }

  /**
   * F — Spikes of Ruin. The ring is not placed, it is *worn*: it tracks the caster for its whole
   * two-second fuse, so the question it asks the other side is whether they can afford to be
   * near you at all — and the answer for anything they have built is no, because a structure
   * caught by the eruption doesn't take damage, it stops existing.
   */
  doSpikes(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (this.rings.some((r) => r.owner === owner)) return;

    this.rings.push({ owner, x: f.x, y: f.y, startedAt: this.now, seed: Math.random() * 999 });
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 12, RING_R, RUI.red, 520);
    this.api.showFloatingText(f.x, f.y - 46, '🔻 SPIKES OF RUIN', this.hex(RUI.red));
    Sfx.playAt('trap-set', f.x, { volume: 0.85, rate: 0.7 });
  }

  /**
   * Q — Unstoppable Decay. The only permanent status in the game: it is never checked against a
   * timestamp, only against a stack count that goes one way. Fifteen seconds is a short leash
   * for something that never comes off, which is exactly why it caps.
   */
  doDecay(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);

    if (s.decay >= MAX_DECAY) {
      this.api.showFloatingText(f.x, f.y - 46, '☠️ NOTHING LEFT TO ROT', this.hex(RUI.decay));
      return;
    }
    s.decay++;

    this.avatar(owner)?.play('raise');
    const fx = this.fx(owner);
    fx.ring(f.x, f.y, 20, Math.max(this.api.width, this.api.height) * 0.75, RUI.decay, 900);
    for (const t of this.targetsOf(owner)) {
      fx.rustPuff(t.x, t.y, 12, 34, 700, 10);
      this.api.showFloatingText(t.x, t.y - 44, `🦠 DECAY ×${s.decay}`, this.hex(RUI.decay));
    }
    this.api.showFloatingText(f.x, f.y - 56, '☠️ UNSTOPPABLE DECAY', this.hex(RUI.decay));
    Sfx.playAt('curse-cast', f.x, { volume: 0.95, rate: 0.65 });

    if (this.up(owner, 'q')) this.openCracks(owner);
  }

  /**
   * Ruin Cracks. Two more sores torn into the floor with every cast of the rot — they hurt
   * whoever stands in them, they never close, and every crystal that goes off anywhere on the
   * board widens all of them by another three percent.
   *
   * The other half is what they do to a crystal grown on top of one: the crack feeds it, and
   * a fed crystal stops being a thing you have to walk into and starts shooting at you.
   */
  private openCracks(owner: Owner): void {
    const fx = this.fx(owner);
    for (let i = 0; i < CRACKS_PER_CAST; i++) {
      const spot = this.findCrackSpot(owner);
      this.cracks.push({ owner, x: spot.x, y: spot.y, r: CRACK_R, seed: Math.random() * 999 });
      fx.crack(spot.x, spot.y, CRACK_R * 1.2);
      fx.ring(spot.x, spot.y, 6, CRACK_R, RUI.ancient, 620);
      Sfx.playAt('quake', spot.x, { volume: 0.75, rate: 1.1 });
    }
    this.api.showFloatingText(this.fighter(owner).x, this.fighter(owner).y - 74,
      `🕳️ ${CRACKS_PER_CAST} RUIN CRACKS`, this.hex(RUI.ancient));
  }

  /**
   * Somewhere to tear the next crack open. Sampled rather than solved: twenty throws, keep the
   * one furthest from every crack already down, so a long match spreads them over the floor
   * instead of stacking a tower of them on one spot.
   */
  private findCrackSpot(owner: Owner): { x: number; y: number } {
    const pad = CRACK_R + 24;
    let best = { x: (this.left + this.right) / 2, y: (this.top + this.bottom) / 2 };
    let bestScore = -1;
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(this.left + pad, this.right - pad);
      const y = Phaser.Math.Between(this.top + pad, this.bottom - pad);
      let score = Infinity;
      for (const c of this.cracks) {
        if (c.owner !== owner) continue;
        score = Math.min(score, Phaser.Math.Distance.Between(x, y, c.x, c.y));
      }
      if (score === Infinity) return { x, y };
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    return best;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'ruin';
    const npcIs = this.api.npcElementId === 'ruin';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateWedges(time, delta);
    this.updateSkewers(time, delta);
    this.updateRings(time);
    this.updateCrystals(time, delta);
    this.rustProjectiles();
    this.updateCracks(time, delta);
    this.updateSpikes(time, delta);
    this.updateLocks(time, delta);
    this.updateDecay(time, delta);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround(time);
    this.paintAir(time);
    this.pushStatuses(time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Cracked ground goes under them; everything with a point on it
    // goes over, because a spike that passes behind a body reads as a decal.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
  }

  // ── Ruin crystals (Shatter Starter) ────────────────────────────────────────

  private crystalsOf(owner: Owner): Crystal[] {
    return this.crystals.filter((c) => c.owner === owner);
  }

  /**
   * Grow a crystal. The board is capped per side, and the cap is enforced by shattering the
   * *oldest* one — a Ruin player who keeps shredding gets a moving field of them rather than a
   * floor that silently stops accepting new ones.
   */
  private spawnCrystal(owner: Owner, x: number, y: number): void {
    const mine = this.crystalsOf(owner);
    if (mine.length >= CRYSTAL_MAX) {
      const oldest = mine.reduce((a, b) => (a.bornAt <= b.bornAt ? a : b));
      this.removeCrystal(oldest);
      this.fx(owner).shatter(oldest.x, oldest.y, 5, 20, RUI.ruby, 340, 9);
    }
    this.crystals.push({
      owner,
      x: Phaser.Math.Clamp(x, this.left + CRYSTAL_R, this.right - CRYSTAL_R),
      y: Phaser.Math.Clamp(y, this.top + CRYSTAL_R, this.bottom - CRYSTAL_R),
      seed: Math.random() * 999,
      bornAt: this.now,
      bitAt: new Map<Fighter, number>(),
      charged: false,
      nextBoltAt: this.now + BOLT_MS,
      blowAt: 0,
    });
    this.fx(owner).shatter(x, y, 6, 20, RUI.ruby, 380, 9);
    Sfx.playAt('crystal-shatter', x, { volume: 0.45, rate: 1.15 });
  }

  private removeCrystal(c: Crystal): void {
    const i = this.crystals.indexOf(c);
    if (i >= 0) this.crystals.splice(i, 1);
  }

  /** Shred Slice's other tally: fifty damage dealt is one more crystal, wherever it landed. */
  private creditShredDamage(owner: Owner, amount: number, x: number, y: number): void {
    if (!this.up(owner, 'click')) return;
    const s = this.side(owner);
    s.shredDamage += amount;
    while (s.shredDamage >= CRYSTAL_PER_DAMAGE) {
      s.shredDamage -= CRYSTAL_PER_DAMAGE;
      this.spawnCrystal(owner, x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
    }
  }

  private updateCrystals(time: number, delta: number): void {
    void delta;
    if (this.crystals.length === 0) return;

    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const c = this.crystals[i];

      // Sitting on one of your own cracks: the crack feeds it, and it starts shooting.
      c.charged = this.cracks.some((k) => k.owner === c.owner
        && Phaser.Math.Distance.Between(c.x, c.y, k.x, k.y) <= k.r);

      // Contact. Cheap enough to be an accident and slow enough not to be a wall.
      for (const t of this.targetsOf(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > CRYSTAL_R + 16) continue;
        if (time - (c.bitAt.get(t) ?? -Infinity) < CRYSTAL_TOUCH_MS) continue;
        c.bitAt.set(t, time);
        t.takeDamage(CRYSTAL_TOUCH_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, RUI.ruby);
        this.fx(c.owner).bite(t.x, t.y, 22, RUI.ruby);
      }

      if (c.charged && time >= c.nextBoltAt) this.lash(c, time);

      if (c.blowAt > 0 && time >= c.blowAt) {
        this.crystals.splice(i, 1);
        this.blowCrystal(c, time);
      }
    }
  }

  /**
   * Ruinic lightning off a crystal standing in a crack. It picks the nearest thing it can
   * reach and hits it — there is no dodging it and no line of sight to break, which is the
   * reward for having built a crystal on top of a crack in the first place.
   */
  private lash(c: Crystal, time: number): void {
    c.nextBoltAt = time + BOLT_MS;
    let victim: Fighter | null = null;
    let best = BOLT_RANGE;
    for (const t of this.targetsOf(c.owner)) {
      const d = Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y);
      if (d < best) { best = d; victim = t; }
    }
    if (!victim) return;

    victim.takeDamage(BOLT_DAMAGE);
    this.bolts.push({
      owner: c.owner, x0: c.x, y0: c.y, x1: victim.x, y1: victim.y,
      until: time + 180, seed: Math.random() * 999,
    });
    this.api.spawnHitFlash(victim.x, victim.y, RUI.ancient);
    this.api.showFloatingText(victim.x, victim.y - 50, '⚡ RUINIC LIGHTNING', this.hex(RUI.ancient));
    Sfx.playAt('zap', victim.x, { volume: 0.7, rate: 0.85 });
  }

  /**
   * Every shot in the air, checked against every crystal on the floor.
   *
   * Deliberately blind to whose shot it is: a crystal field is a filter over a piece of the
   * arena, not a shield, so shooting through your own is as much of a decision as walking
   * through it. What comes out the far side is half the size and no longer does damage at all
   * — it moves health into the weak pool instead, which walks past shields but can never
   * finish anybody off.
   *
   * The first half of the sweep is housekeeping: a spent shot hands its rust back, because the
   * projectile group recycles dead members and a stale flag would rust the next thing fired
   * out of the same object.
   */
  private rustProjectiles(): void {
    for (const obj of this.api.projectiles.getChildren()) {
      const p = obj as Projectile;
      if (!p.active) {
        if (!p.ruinRusted) continue;
        p.ruinRusted = false;
        p.setScale(p.scaleX / RUST_SCALE, p.scaleY / RUST_SCALE);
        continue;
      }
      if (p.isHeal || p.ruinRusted) continue;
      for (const c of this.crystals) {
        if (Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) > RUST_R) continue;
        p.ruinRusted = true;
        p.setScale(p.scaleX * RUST_SCALE, p.scaleY * RUST_SCALE);
        this.fx(c.owner).rustPuff(p.x, p.y, 4, 12, 300, 9);
        break;
      }
    }
  }

  /**
   * A rusted shot landing, called from ArenaScene's two projectile chokepoints before the
   * ordinary damage is worked out. Returns true when it has handled the hit outright.
   *
   * The move between the two health pools is not damage, so it goes around shields the same
   * way the skewer's rust does — and for the same reason it is skipped for a body whose HP
   * isn't ours to write, which falls back to the shot simply landing normally.
   */
  applyRustedHit(proj: Projectile, victim: Fighter): boolean {
    if (!proj.ruinRusted) return false;
    if (victim.netGhost || victim.allyDamageBlocked || !this.alive(victim)) return false;

    const want = Math.max(1, Math.round(proj.damage));
    const moved = Math.min(want, Math.max(0, victim.hp - 1));
    victim.hp -= moved;
    victim.weakHp += moved;
    const owner: Owner = this.isEnemyOf('player', victim) ? 'player' : 'npc';
    this.fx(owner).rustPuff(victim.x, victim.y, 8, 24, 480, 10);
    this.api.spawnHitFlash(proj.x, proj.y, RUI.rust);
    this.api.showFloatingText(victim.x, victim.y - 40, `⚙️ ${Math.round(moved)} RUSTED`, this.hex(RUI.rust));
    Sfx.playAt('crystal-shatter', victim.x, { volume: 0.5, rate: 0.9 });
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body | null)?.stop();
    return true;
  }

  // ── Chain Reaction ─────────────────────────────────────────────────────────

  /** Line a crystal up to go off. First writer wins, which is what stops a chain looping. */
  private queueBlast(c: Crystal, at: number): void {
    if (c.blowAt > 0) return;
    c.blowAt = at;
  }

  /**
   * One link of the chain: a blast, a full turn of spikes, three percent onto every crack, and
   * a fuse lit under every other crystal in reach. Nothing here recurses — neighbours are
   * *queued*, so a field of a dozen goes off as a run of bangs rather than one stack overflow.
   */
  private blowCrystal(c: Crystal, time: number): void {
    const fx = this.fx(c.owner);
    fx.shatter(c.x, c.y, 18, BLAST_R * 0.5, RUI.ruby, 640, 11);
    fx.ring(c.x, c.y, 16, BLAST_R, RUI.ruby, 560);
    fx.crack(c.x, c.y, BLAST_R * 0.6);
    Sfx.playAt('explosion-medium', c.x, { volume: 0.85, rate: 1 });

    for (const t of this.targetsOf(c.owner)) {
      if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > BLAST_R) continue;
      t.takeDamage(BLAST_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, RUI.ruby);
    }

    // The spikes. Fanned off a random offset so two crystals going up together don't throw
    // their spikes down identical lines.
    const off = Math.random() * Math.PI * 2;
    for (let i = 0; i < SPIKE_COUNT; i++) {
      const a = off + (i / SPIKE_COUNT) * Math.PI * 2;
      this.spikes.push({
        owner: c.owner,
        x: c.x + Math.cos(a) * 12,
        y: c.y + Math.sin(a) * 12,
        vx: Math.cos(a) * SPIKE_SPEED,
        vy: Math.sin(a) * SPIKE_SPEED,
        diesAt: time + SPIKE_LIFE_MS,
        seed: Math.random() * 999,
        hits: new Set<Fighter>(),
      });
    }

    for (const k of this.cracks) {
      if (k.owner === c.owner) k.r *= 1 + CRACK_GROWTH;
    }

    for (const other of this.crystals) {
      if (other.owner !== c.owner) continue;
      if (Phaser.Math.Distance.Between(c.x, c.y, other.x, other.y) > BLAST_R) continue;
      this.queueBlast(other, time + CHAIN_DELAY_MS);
    }
  }

  private updateSpikes(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const sp = this.spikes[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;

      for (const t of this.targetsOf(sp.owner)) {
        if (sp.hits.has(t)) continue;
        if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > SPIKE_HIT_R) continue;
        sp.hits.add(t);
        t.takeDamage(SPIKE_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, RUI.ruby);
        this.addBlunt(sp.owner, t);
      }

      // A spike into another crystal keeps the chain running past the blast radius.
      for (const c of this.crystals) {
        if (c.owner !== sp.owner || c.blowAt > 0) continue;
        if (Phaser.Math.Distance.Between(sp.x, sp.y, c.x, c.y) > CRYSTAL_R + 6) continue;
        this.queueBlast(c, time + CHAIN_DELAY_MS);
      }

      const gone = time >= sp.diesAt
        || sp.x < this.left - 12 || sp.x > this.right + 12
        || sp.y < this.top - 12 || sp.y > this.bottom + 12;
      if (gone) this.spikes.splice(i, 1);
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      if (time >= this.bolts[i].until) this.bolts.splice(i, 1);
    }
  }

  /**
   * A spike's real payload: it takes a permanent bite out of whatever attack its victim used
   * last. Seven bites is the floor, at which point that one ability is doing 48% of what it
   * used to — and since nothing here ever expires, a long fight against Ruin is a fight where
   * everything you like using slowly stops working.
   */
  private addBlunt(owner: Owner, victim: Fighter): void {
    const abilityId = victim.lastCastAbilityId;
    if (!abilityId) return;
    let rec = this.blunt.get(victim);
    if (!rec) { rec = { owner, stacks: new Map<string, number>() }; this.blunt.set(victim, rec); }
    const stacks = Math.min(BLUNT_MAX, (rec.stacks.get(abilityId) ?? 0) + 1);
    if (stacks === rec.stacks.get(abilityId)) return;
    rec.stacks.set(abilityId, stacks);
    this.api.showFloatingText(victim.x, victim.y - 70,
      `🪓 ${this.nameOfAbility(victim, abilityId).toUpperCase()} −${stacks * 10}%`, this.hex(RUI.ruby));
  }

  /**
   * What the blunting is worth, seen from the receiving end.
   *
   * `takeDamage` has no attacker reference, so — exactly like the decay's "they deal 10% less"
   * — the cut is applied to whoever the blunted attacker is aimed at rather than to the
   * attacker themselves. The ability it reads is `lastCastAbilityId`, which is the same
   * "whatever they just used" that the spikes bit into.
   */
  private bluntAgainst(victim: Fighter): number {
    if (this.blunt.size === 0) return 1;
    let m = 1;
    for (const [attacker, rec] of this.blunt) {
      // Only the side that planted the spikes gets the benefit.
      if (this.isEnemyOf(rec.owner, victim) || !this.alive(attacker)) continue;
      const id = attacker.lastCastAbilityId;
      if (!id) continue;
      const n = rec.stacks.get(id) ?? 0;
      if (n > 0) m = Math.min(m, Math.pow(1 - BLUNT_STEP, n));
    }
    return m;
  }

  // ── Ruin cracks ────────────────────────────────────────────────────────────

  private updateCracks(time: number, delta: number): void {
    if (this.cracks.length === 0) return;
    void time;
    this.crackTick += delta;
    if (this.crackTick < CRACK_TICK_MS) return;
    this.crackTick = 0;

    const bite = Math.round(CRACK_DPS * (CRACK_TICK_MS / 1000));
    for (const owner of ['player', 'npc'] as Owner[]) {
      const mine = this.cracks.filter((k) => k.owner === owner);
      if (mine.length === 0) continue;
      for (const t of this.targetsOf(owner)) {
        if (!mine.some((k) => Phaser.Math.Distance.Between(k.x, k.y, t.x, t.y) <= k.r)) continue;
        t.takeDamage(bite);
        this.fx(owner).rustPuff(t.x, t.y + 8, 4, 14, 320, 4);
      }
    }
  }

  // ── Shred Slice ────────────────────────────────────────────────────────────

  private updateWedges(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.wedges.length - 1; i >= 0; i--) {
      const w = this.wedges[i];
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      w.spin += dt * 5;

      // Bodies: each one is hit once, and the wedge carries on regardless.
      for (const t of this.targetsOf(w.owner)) {
        if (w.hits.has(t)) continue;
        if (Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y) > SHRED_HIT_R) continue;
        w.hits.add(t);
        t.takeDamage(SHRED_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, RUI.red);
        this.fx(w.owner).bite(t.x, t.y, 26, RUI.red);
        this.creditShredDamage(w.owner, SHRED_DAMAGE, t.x, t.y);
      }

      w.eaten += this.shredProjectilesAt(w.owner, w.x, w.y);

      const gone = time >= w.diesAt
        || w.x < this.left - 20 || w.x > this.right + 20
        || w.y < this.top - 20 || w.y > this.bottom + 20;
      if (!gone) continue;

      if (w.eaten > 0) {
        this.api.showFloatingText(
          Phaser.Math.Clamp(w.x, this.left + 20, this.right - 20),
          Phaser.Math.Clamp(w.y, this.top + 20, this.bottom - 20),
          `✂️ SHREDDED ×${w.eaten}`, this.hex(RUI.bright),
        );
      }
      this.fx(w.owner).rustPuff(w.x, w.y, 4, 14, 340, 9);
      this.wedges.splice(i, 1);
    }
  }

  /**
   * Tear apart every one of the other side's shots near a point. Two pools have to be swept:
   * the shared physics group (where most elements' projectiles live) and the kit-local
   * registry, which is the only handle on the ones that never join a group.
   *
   * With Shatter Starter every kill leaves a crystal standing where the shot died. The
   * kit-local pool only reports a count rather than positions, so those crystals grow around
   * the wedge instead — close enough, since that is where the shot was.
   */
  private shredProjectilesAt(owner: Owner, x: number, y: number): number {
    let eaten = 0;
    const eatR = SHRED_EAT_R;
    const mineIsPlayer = owner === 'player';
    const shatters = this.up(owner, 'click');
    // Copied first: `getChildren()` hands back the group's live array, and destroying out of
    // it mid-loop would step over the shot that slid into the gap.
    for (const obj of this.api.projectiles.getChildren().slice()) {
      const p = obj as Projectile;
      if (!p.active) continue;
      // `isHeal` shots are somebody's medicine, not an attack — leave them alone.
      if (p.isFromPlayer === mineIsPlayer || p.isHeal) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, x, y) > eatR) continue;
      this.fx(owner).shatter(p.x, p.y, 5, 20, RUI.bone, 380, 10);
      Sfx.playAt('crystal-shatter', p.x, { volume: 0.4, rate: 1.4 });
      const px = p.x;
      const py = p.y;
      p.destroy();
      eaten++;
      if (shatters) this.spawnCrystal(owner, px, py);
    }
    const registered = this.api.shredRegisteredProjectiles(mineIsPlayer ? 'npc' : 'player', x, y, eatR);
    for (let i = 0; shatters && i < registered; i++) {
      this.spawnCrystal(owner, x + (Math.random() - 0.5) * 34, y + (Math.random() - 0.5) * 34);
    }
    return eaten + registered;
  }

  // ── Rusty Skewer ───────────────────────────────────────────────────────────

  private updateSkewers(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.skewers.length - 1; i >= 0; i--) {
      const s = this.skewers[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const tipX = s.x + Math.cos(s.ang) * SKEWER_LEN * 0.5;
      const tipY = s.y + Math.sin(s.ang) * SKEWER_LEN * 0.5;

      // Ruin Transfusion: a crystal in the spike's path is drunk rather than passed, and the
      // shaft comes out the far side lit. It only ever needs one.
      if (this.up(s.owner, 'r') && !s.fed) this.drinkCrystal(s, tipX, tipY);

      if (s.riders.length < SKEWER_MAX_RIDERS) {
        for (const t of this.targetsOf(s.owner)) {
          if (s.riders.includes(t) || this.isRidden(t)) continue;
          if (Phaser.Math.Distance.Between(tipX, tipY, t.x, t.y) > SKEWER_HIT_R) continue;
          this.impale(s, t);
          if (s.riders.length >= SKEWER_MAX_RIDERS) break;
        }
      }

      // Riders hang off the shaft behind the point, in the order they were caught.
      s.riders = s.riders.filter((f) => this.alive(f));
      for (let r = 0; r < s.riders.length; r++) {
        const f = s.riders[r];
        const d = SKEWER_LEN * 0.5 - RIDER_FIRST_OFFSET - r * RIDER_SPACING;
        const rx = s.x + Math.cos(s.ang) * d;
        const ry = s.y + Math.sin(s.ang) * d;
        f.setPosition(rx, ry);
        this.body(f).reset(rx, ry);
        f.skeweredUntil = time + 300;
        // Re-applied in short bursts, so a release frees them without clearing a disarm
        // that might have come from somewhere else.
        f.applyDisarm(250);
      }

      const hitWall = tipX <= this.left || tipX >= this.right || tipY <= this.top || tipY >= this.bottom;
      if (!hitWall && time < s.diesAt) continue;

      this.releaseSkewer(s, hitWall);
      this.skewers.splice(i, 1);
    }
  }

  /**
   * Ruin Transfusion. The spike runs through one of your own crystals on the way out and comes
   * back lit with what was inside it.
   *
   * What it changes is the *kind* of harm: an ordinary skewer moves a tenth of somebody into
   * the grey pool, where it drains slowly and soaks the hits behind it on the way. A fed one
   * skips all of that and takes fifteen percent of them outright, which is worse for anybody
   * who was ever going to survive the ride.
   */
  private drinkCrystal(s: Skewer, tipX: number, tipY: number): void {
    for (const c of this.crystals) {
      if (c.owner !== s.owner || c.blowAt > 0) continue;
      if (Phaser.Math.Distance.Between(tipX, tipY, c.x, c.y) > CRYSTAL_R + SKEWER_HALF_WIDTH) continue;
      this.removeCrystal(c);
      s.fed = true;
      const fx = this.fx(s.owner);
      fx.shatter(c.x, c.y, 12, 34, RUI.ruby, 480, 11);
      fx.ring(c.x, c.y, 6, 40, RUI.ruby, 380);
      this.api.showFloatingText(c.x, c.y - 30, '🩸 TRANSFUSION', this.hex(RUI.ruby));
      Sfx.playAt('crystal-shatter', c.x, { volume: 0.9, rate: 0.6 });
      return;
    }
  }

  /** Somebody goes onto the spike: ten damage, and a tenth of them turned to rust. */
  private impale(s: Skewer, victim: Fighter): void {
    s.riders.push(victim);
    victim.takeDamage(SKEWER_DAMAGE);
    victim.skeweredUntil = this.now + 300;
    victim.applyDisarm(250);

    if (s.fed) {
      // A fed spike deals it instead of moving it, so this one goes through the ordinary
      // damage path — shields, mitigation and all — rather than around it.
      const bled = Math.max(1, Math.round(victim.hp * TRANSFUSION_FRACTION));
      victim.takeDamage(bled);
      this.api.showFloatingText(victim.x, victim.y - 56, `🩸 ${bled} TRANSFUSED`, this.hex(RUI.ruby));
    } else if (!victim.netGhost && !victim.allyDamageBlocked) {
      // The conversion is a straight move between two health pools rather than damage, so it
      // walks past shields on purpose — and is skipped for a fighter whose HP isn't ours to
      // write (an online replica, or an ally under co-op friendly fire).
      const rusted = Math.max(1, Math.round(victim.hp * SKEWER_RUST_FRACTION));
      victim.hp = Math.max(1, victim.hp - rusted);
      victim.weakHp += rusted;
      this.api.showFloatingText(victim.x, victim.y - 56, `⚙️ ${rusted} RUSTED`, this.hex(RUI.rust));
    }

    const fx = this.fx(s.owner);
    fx.bite(victim.x, victim.y, 32, s.fed ? RUI.ruby : RUI.blood);
    fx.rustPuff(victim.x, victim.y, 8, 26, 520, 10);
    this.api.spawnHitFlash(victim.x, victim.y, RUI.blood);
    this.api.showFloatingText(victim.x, victim.y - 38, '🩸 SKEWERED', this.hex(RUI.red));
    Sfx.playAt('stab', victim.x, { volume: 0.9, rate: 0.75 });
  }

  private releaseSkewer(s: Skewer, onWall: boolean): void {
    const fx = this.fx(s.owner);
    for (const f of s.riders) {
      f.skeweredUntil = 0;
      if (!this.alive(f)) continue;
      const px = Phaser.Math.Clamp(f.x, this.left + 30, this.right - 30);
      const py = Phaser.Math.Clamp(f.y, this.top + 30, this.bottom - 30);
      this.body(f).reset(px, py);
      fx.shatter(px, py, 7, 34, RUI.blood, 460, 10);
      this.api.showFloatingText(px, py - 42, onWall ? '🧱 TORN OFF' : '🩸 SLID FREE', this.hex(RUI.rust));
    }
    const ex = Phaser.Math.Clamp(s.x, this.left, this.right);
    const ey = Phaser.Math.Clamp(s.y, this.top, this.bottom);
    fx.shatter(ex, ey, 9, 40, RUI.iron, 520, 10);
    if (onWall) {
      fx.crack(ex, ey, 54);
      Sfx.playAt('clang', ex, { volume: 0.85, rate: 0.6 });
    }
    s.riders = [];
  }

  // ── Spikes of Ruin ─────────────────────────────────────────────────────────

  private updateRings(time: number): void {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      const caster = this.fighter(r.owner);
      if (!this.alive(caster)) { this.rings.splice(i, 1); continue; }
      // Worn, not placed: the circle is wherever its caster is, right up to the eruption.
      r.x = caster.x;
      r.y = caster.y;
      if (time - r.startedAt < RING_FUSE_MS) continue;
      this.erupt(r);
      this.rings.splice(i, 1);
    }
  }

  private erupt(r: SpikeRing): void {
    const fx = this.fx(r.owner);
    fx.spikeBurst(r.x, r.y, 16, RING_R, 560, 10, r.seed);
    fx.ring(r.x, r.y, RING_R * 0.4, RING_R * 1.15, RUI.red, 520);
    fx.crack(r.x, r.y, RING_R);
    Sfx.playAt('quake', r.x, { volume: 1, rate: 1.15 });

    for (const t of this.targetsOf(r.owner)) {
      if (Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) > RING_R) continue;
      t.takeDamage(RING_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, RUI.red);
      fx.shatter(t.x, t.y, 6, 26, RUI.red, 420, 11);
      const converted = this.invertBuffs(t);
      this.api.showFloatingText(t.x, t.y - 44,
        converted > 0 ? `🔻 ${converted} BUFFS TURNED` : '🔻 RUINED', this.hex(RUI.bright));
    }

    // Anything either side built inside the circle is simply gone. Structures don't take
    // damage from this — they stop existing, which is the whole reason the ability is worth
    // its cooldown against the elements that put things on the board.
    const razed = this.api.purgeSummons(r.x, r.y, RING_R, r.owner);
    if (razed > 0) {
      this.api.showFloatingText(r.x, r.y - 60, `🏚️ ${razed} RAZED`, this.hex(RUI.rust));
      Sfx.playAt('explosion-medium', r.x, { volume: 0.8, rate: 0.6 });
    }

    // Chain Reaction: the eruption is also a detonator. Every crystal it reaches goes off, and
    // every crystal *those* reach goes off behind it — the ring is only ever the first link.
    if (!this.up(r.owner, 'f')) return;
    let lit = 0;
    for (const c of this.crystals) {
      if (c.owner !== r.owner || c.blowAt > 0) continue;
      if (Phaser.Math.Distance.Between(r.x, r.y, c.x, c.y) > RING_R) continue;
      this.queueBlast(c, this.now + lit * CHAIN_DELAY_MS);
      lit++;
    }
    if (lit > 0) {
      this.api.showFloatingText(r.x, r.y - 78, `💥 CHAIN REACTION ×${lit}`, this.hex(RUI.ruby));
      Sfx.playAt('crystal-shatter', r.x, { volume: 0.8, rate: 0.7 });
    }
  }

  /**
   * Turn a victim's buffs into their own opposites.
   *
   * Two halves, because buffs live in two places. Everything plain enough to be a field on
   * `Fighter` is flipped here and now — a 25% damage boost comes back as a 25% cut, armour
   * becomes fragility, and anything that can only be on or off is simply taken away. The
   * boosts that live inside other kits (a stance's haste, a form's speed) can't be reached
   * from here at all, so `buffsInvertedUntil` catches those where they are actually felt: the
   * speed aggregate in ArenaScene and the mitigation product in `takeDamage`.
   *
   * Returns how many concrete buffs were found, for the callout.
   */
  private invertBuffs(f: Fighter): number {
    let n = 0;
    const flip = (v: number): number => Math.max(0.1, 2 - v);

    if (f.outgoingDamageMult > 1.001) { f.outgoingDamageMult = flip(f.outgoingDamageMult); n++; }
    if (f.cardOutgoingDamageMult > 1.001) { f.cardOutgoingDamageMult = flip(f.cardOutgoingDamageMult); n++; }
    if (f.incomingDamageMultiplier < 0.999) { f.incomingDamageMultiplier = flip(f.incomingDamageMultiplier); n++; }
    if (f.cooldownMult < 0.999) { f.cooldownMult = flip(f.cooldownMult); n++; }
    if (f.walkSpeedMult > 1.001) { f.walkSpeedMult = flip(f.walkSpeedMult); n++; }
    if (f.critChance > 0) { f.critChance = 0; n++; }
    if (f.dodgeChance > 0) { f.dodgeChance = 0; n++; }
    if (f.regenPerSecond > 0) { f.regenPerSecond = 0; n++; }
    if (f.reflectFraction > 0) { f.reflectFraction = 0; n++; }
    if (f.flatDamageReduction > 0) { f.flatDamageReduction = 0; n++; }
    if (f.hardDamageCap > 0) { f.hardDamageCap = 0; n++; }
    if (f.shieldCharges > 0) { f.shieldCharges = 0; n++; }
    if (f.shieldHp > 0) { f.shieldHp = 0; n++; }
    if (f.clottedHp > 0) { f.clottedHp = 0; n++; }
    if (f.unstoppable) { f.unstoppable = false; n++; }
    if (f.levitating) { f.levitating = false; n++; }
    if (f.selfDamageImmune) { f.selfDamageImmune = false; n++; }
    if (f.isInvincible) { f.isInvincible = false; n++; }

    f.buffsInvertedUntil = Math.max(f.buffsInvertedUntil, this.now + INVERT_MS);
    this.touched.add(f);
    this.fx(this.isEnemyOf('player', f) ? 'player' : 'npc').rustPuff(f.x, f.y, 10, 30, 620, 10);
    return n;
  }

  // ── Lockdown ───────────────────────────────────────────────────────────────

  private updateLocks(time: number, delta: number): void {
    for (let i = this.locks.length - 1; i >= 0; i--) {
      const l = this.locks[i];
      l.snap = Math.min(1, l.snap + delta / 220);
      if (time >= l.until || !this.alive(l.victim) || l.victim.lockRemaining(l.abilityId) <= 0) {
        if (this.alive(l.victim)) {
          this.fx(l.owner).shatter(l.victim.x, l.victim.y - 34, 5, 20, RUI.iron, 380, 11);
          this.api.showFloatingText(l.victim.x, l.victim.y - 44, '🔓 UNLOCKED', this.hex(RUI.ash));
        }
        this.locks.splice(i, 1);
      }
    }
  }

  // ── Unstoppable Decay ──────────────────────────────────────────────────────

  /**
   * Rewrite the rot from scratch every frame. Both halves of "they deal 10% less" and "they
   * take 10% more" land on the same field, because `takeDamage` has no attacker reference: a
   * decayed fighter takes 1.1× per stack, and whoever put the rot on them takes 0.9× per
   * stack from everything, which is the same trade seen from the other end.
   */
  private updateDecay(time: number, delta: number): void {
    const anyDecay = this.sides.player.decay > 0 || this.sides.npc.decay > 0;

    for (const f of this.everyone()) {
      let m = 1;
      for (const owner of ['player', 'npc'] as Owner[]) {
        const st = this.sides[owner].decay;
        if (!st) continue;
        const curve = this.decayCurve(owner);
        m *= this.isEnemyOf(owner, f) ? curve.vuln : curve.weaken;
      }
      // Chain Reaction's blunting rides the same field, for the same reason.
      m *= this.bluntAgainst(f);
      f.ruinIncomingMult = m;
      this.touched.add(f);
    }

    // Anything that has left the fight (or was never in it) gets its multiplier handed back.
    for (const f of [...this.touched]) {
      if (this.alive(f)) continue;
      f.ruinIncomingMult = 1;
      f.buffsInvertedUntil = 0;
      this.touched.delete(f);
    }

    if (!anyDecay) { this.flecks.length = 0; return; }

    // Flakes coming off whoever is rotting, dropped where they walk.
    this.fleckAccum += delta;
    if (this.fleckAccum >= 110) {
      this.fleckAccum = 0;
      for (const f of this.everyone()) {
        if (this.decayStacksOn(f) <= 0) continue;
        const b = this.body(f);
        if (Math.hypot(b.velocity.x, b.velocity.y) < 20) continue;
        this.flecks.push({
          x: f.x + (Math.random() - 0.5) * 16,
          y: f.y + 10 + (Math.random() - 0.5) * 8,
          until: time + 900,
          seed: Math.random() * 999,
        });
      }
    }
    for (let i = this.flecks.length - 1; i >= 0; i--) {
      if (time >= this.flecks[i].until) this.flecks.splice(i, 1);
    }
  }

  /** How many stacks of rot are working against `f` right now. */
  private decayStacksOn(f: Fighter): number {
    let n = 0;
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.sides[owner].decay && this.isEnemyOf(owner, f)) n += this.sides[owner].decay;
    }
    return n;
  }

  /** What one side's rot is worth, as three products — a flat 10% a stack, compounded. */
  private decayCurve(owner: Owner): { vuln: number; weaken: number; slow: number } {
    const n = this.sides[owner].decay;
    return {
      vuln: Math.pow(DECAY_VULN, n),
      weaken: Math.pow(DECAY_WEAKEN, n),
      slow: Math.pow(DECAY_SLOW, n),
    };
  }

  /** Everything of this kit's that makes `f` walk slower, as one number. */
  private ruinSpeedMult(f: Fighter): number {
    let m = 1;
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isEnemyOf(owner, f)) continue;
      if (this.sides[owner].decay) m *= this.decayCurve(owner).slow;
    }
    return m;
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs) {
      const f = this.api.player;
      const s = this.sides.player;
      if (!this.playerAvatar) this.playerAvatar = new RuinAvatar(scene, this.pcol);
      this.playerAvatar.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      this.playerAvatar.setIntensity(this.rings.some((r) => r.owner === 'player') ? 1.3 : 1);
      // He cracks apart as he loses health — the one honest thing about him.
      this.playerAvatar.setRuinLevel(1 - Phaser.Math.Clamp(f.hp / f.maxHp, 0, 1));
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs) {
      const f = this.api.npc;
      const s = this.sides.npc;
      if (!this.npcAvatar) this.npcAvatar = new RuinAvatar(scene, this.ncol);
      this.npcAvatar.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      this.npcAvatar.setIntensity(this.rings.some((r) => r.owner === 'npc') ? 1.3 : 1);
      this.npcAvatar.setRuinLevel(1 - Phaser.Math.Clamp(f.hp / f.maxHp, 0, 1));
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** Rings and shed rust — everything that lives on the floor. */
  private paintGround(time: number): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    // ── Ruin cracks ──
    // Under everything: an open sore in the floor with the bedrock showing through it and a
    // teal seam of ruin running along the bottom, which is where a charged crystal is drinking.
    for (const k of this.cracks) {
      const tint = this.col(k.owner);
      const pulse = 0.9 + Math.sin(this.vizT * 2 + k.seed) * 0.05;
      g.fillStyle(tint(RUI.voidDark), 0.55);
      g.fillEllipse(k.x, k.y, k.r * 2 * pulse, k.r * 1.24 * pulse);
      g.fillStyle(tint(RUI.stone), 0.3);
      g.fillEllipse(k.x, k.y + 2, k.r * 1.5, k.r * 0.86);
      g.lineStyle(2, tint(RUI.ancient), 0.35 + Math.sin(this.vizT * 3 + k.seed) * 0.12);
      g.strokeEllipse(k.x, k.y, k.r * 2 * pulse, k.r * 1.24 * pulse);
      crackWeb(g, tint, k.x, k.y, k.r * 1.05, k.seed, 0.7, 1,
        { runs: 9, squash: 0.62, width: 2.2, color: RUI.voidDark });
      crackWeb(g, tint, k.x, k.y, k.r * 0.7, k.seed + 4, 0.4, 1,
        { runs: 5, squash: 0.62, width: 1.2, color: RUI.ancient });
    }

    // ── Ruin crystals ──
    // Painted at 70% so the floor reads through them — they are meant to look like something
    // that grew out of the ground rather than something standing on it. A crystal with a fuse
    // lit under it swells and brightens; a charged one wears a teal core it did not grow.
    for (const c of this.crystals) {
      const tint = this.col(c.owner);
      const grow = Phaser.Math.Clamp((time - c.bornAt) / 260, 0, 1);
      const fuse = c.blowAt > 0
        ? Phaser.Math.Clamp(1 - (c.blowAt - time) / CHAIN_DELAY_MS, 0, 1)
        : 0.25 + Math.sin(this.vizT * 2 + c.seed) * 0.06;
      ruinCluster(g, tint, c.x, c.y, CRYSTAL_R * (0.6 + grow * 0.4), fuse, this.vizT, 0.7, c.seed);
      if (!c.charged) continue;
      rubyJewel(g, tint, c.x, c.y - 4, CRYSTAL_R * 0.36, this.vizT, 0.85, c.seed);
      g.fillStyle(tint(RUI.ancient), 0.16 + Math.sin(this.vizT * 6 + c.seed) * 0.07);
      g.fillCircle(c.x, c.y, CRYSTAL_R * 1.7);
    }

    for (const r of this.rings) {
      const charge = Phaser.Math.Clamp((time - r.startedAt) / RING_FUSE_MS, 0, 1);
      ruinRing(g, this.col(r.owner), r.x, r.y, RING_R, this.vizT, 1, charge, r.seed);
    }

    for (const f of this.flecks) {
      const fade = Phaser.Math.Clamp((f.until - time) / 900, 0, 1);
      g.fillStyle(this.pcol(RUI.decay), fade * 0.5);
      g.fillRect(f.x, f.y, 2.6, 2.6);
      g.fillStyle(this.pcol(RUI.rust), fade * 0.35);
      g.fillRect(f.x + 3 * jitter(f.seed, 1), f.y + 2, 1.8, 1.8);
    }
  }

  /** Wedges, the skewer, padlocks and the rot on a body. */
  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── The rot ──
    for (const f of this.everyone()) {
      const stacks = this.decayStacksOn(f);
      if (stacks <= 0) continue;
      const r = 24 * f.sizeMult * f.shapeSizeMult;
      // Painted through the skin of whoever put it there, so a Ruin skin recolours its own rot.
      const owner: Owner = this.isEnemyOf('player', f) ? 'player' : 'npc';
      decayCoat(g, this.col(owner), f.x, f.y, r, this.vizT, 1, stacks, f.x + f.y);
    }

    // ── Buffs turned inside out ──
    for (const f of this.everyone()) {
      if (time >= f.buffsInvertedUntil) continue;
      const fade = Phaser.Math.Clamp((f.buffsInvertedUntil - time) / 600, 0, 1);
      crackWeb(g, this.pcol, f.x, f.y, 30, f.x, fade * 0.5, 1, { runs: 5, width: 1.6, color: RUI.bright });
    }

    // ── Ruin spikes in flight ──
    for (const sp of this.spikes) {
      shrapnelShard(g, this.col(sp.owner), sp.x, sp.y, Math.atan2(sp.vy, sp.vx), SPIKE_LEN, 1, sp.seed);
    }

    // ── Ruinic lightning ──
    // Drawn for a fifth of a second after the hit already landed, and rebuilt off the seed each
    // frame so the bolt crawls rather than sitting there as a straight line.
    for (const b of this.bolts) {
      const tint = this.col(b.owner);
      const fade = Phaser.Math.Clamp((b.until - time) / 180, 0, 1);
      const segs = 7;
      let px = b.x0;
      let py = b.y0;
      for (let i = 1; i <= segs; i++) {
        const s = i / segs;
        const kink = i === segs ? 0 : (jitter(b.seed, i + Math.floor(this.vizT * 30)) - 0.5) * 22;
        const nx = b.x0 + (b.x1 - b.x0) * s - (b.y1 - b.y0) / SKEWER_LEN * kink;
        const ny = b.y0 + (b.y1 - b.y0) * s + (b.x1 - b.x0) / SKEWER_LEN * kink;
        g.lineStyle(4, tint(RUI.ancient), fade * 0.35);
        g.lineBetween(px, py, nx, ny);
        g.lineStyle(1.6, tint(RUI.bone), fade * 0.9);
        g.lineBetween(px, py, nx, ny);
        px = nx;
        py = ny;
      }
    }

    // ── Wedges ──
    for (const w of this.wedges) {
      shredWedge(g, this.col(w.owner), w.x, w.y, Math.atan2(w.vy, w.vx),
        SHRED_LEN, 1, w.spin, w.seed);
    }

    // ── The skewer, and whoever is on it ──
    for (const s of this.skewers) {
      const tint = this.col(s.owner);
      const buttX = s.x - Math.cos(s.ang) * SKEWER_LEN * 0.5;
      const buttY = s.y - Math.sin(s.ang) * SKEWER_LEN * 0.5;
      // Drawn from the butt so the point lands where the tip maths says it does.
      rustySpike(g, tint, buttX, buttY,
        s.ang, SKEWER_LEN, SKEWER_HALF_WIDTH, 1, { seed: s.seed, wear: 0.85, barbs: 4 });
      // Fed on a crystal: the whole shaft burns red down its length, which is the only tell
      // that this one is going to take fifteen percent rather than move ten.
      if (s.fed) {
        g.lineStyle(7, tint(RUI.ruby), 0.22 + Math.sin(this.vizT * 11) * 0.08);
        g.lineBetween(buttX, buttY, buttX + Math.cos(s.ang) * SKEWER_LEN, buttY + Math.sin(s.ang) * SKEWER_LEN);
        g.lineStyle(2.2, tint(RUI.bright), 0.7 + Math.sin(this.vizT * 14) * 0.25);
        g.lineBetween(buttX, buttY, buttX + Math.cos(s.ang) * SKEWER_LEN, buttY + Math.sin(s.ang) * SKEWER_LEN);
      }
      for (const f of s.riders) {
        // Blood at the entry point, and the shaft passing visibly through them.
        g.fillStyle(tint(RUI.blood), 0.55);
        g.fillCircle(f.x, f.y, 10 + Math.sin(this.vizT * 9) * 1.4);
        g.lineStyle(3, tint(RUI.blood), 0.4);
        g.lineBetween(f.x - Math.cos(s.ang) * 22, f.y - Math.sin(s.ang) * 22,
          f.x + Math.cos(s.ang) * 22, f.y + Math.sin(s.ang) * 22);
      }
    }

    // ── Padlocks ──
    for (const l of this.locks) {
      if (!this.alive(l.victim)) continue;
      const tint = this.col(l.owner);
      const y = l.victim.y - 42;
      const fade = Phaser.Math.Clamp((l.until - time) / 600, 0, 1);
      // A short length of chain still hanging off it, so the lock reads as clamped *on*.
      chainRun(g, tint, l.victim.x - 14, y - 8, l.victim.x + 14, y - 8, fade * 0.7, 4, l.seed);
      padlock(g, tint, l.victim.x, y, 13, fade, l.snap, this.vizT * 2 + l.seed);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(time: number): void {
    const p = this.api.player;
    const playerIsRuin = this.api.elementId === 'ruin';
    const ring = this.rings.find((r) => r.owner === 'player');

    this.api.setStatusIndicator('ruin-ring', playerIsRuin && ring ? {
      name: 'Spikes of Ruin', emoji: '🔻', color: RUI.red,
      description: 'A ring of broken ground is following you. When it erupts, anything inside loses its buffs and anything built inside stops existing.',
      until: ring.startedAt + RING_FUSE_MS, priority: 116,
    } : null);

    const myDecay = this.sides.player.decay;
    this.api.setStatusIndicator('ruin-spread', playerIsRuin && myDecay > 0 ? {
      name: 'Rotting the Arena', emoji: '☠️', color: RUI.decay,
      description: 'Your decay is on every enemy for the rest of the match. Each stack slows them 10%, makes them take 10% more and deal 10% less.',
      count: myDecay, priority: 114,
    } : null);

    // ── Ruin crystals on the board ──
    const mine = this.crystalsOf('player');
    const charged = mine.filter((c) => c.charged).length;
    this.api.setStatusIndicator('ruin-crystals', playerIsRuin && this.api.hasUpgrade('click') ? {
      name: 'Ruin Crystals', emoji: '💎', color: RUI.ruby,
      description: `Grown wherever Shred Slice killed a shot, and one more for every ${CRYSTAL_PER_DAMAGE} damage it deals. They bite for ${CRYSTAL_TOUCH_DAMAGE}, they rust anything that flies through them, and ${CRYSTAL_MAX} is as many as the floor will hold.${charged > 0 ? ` ${charged} of them are standing in a crack and throwing lightning.` : ''}`,
      count: mine.length, priority: 112,
    } : null);

    // ── Ruin cracks ──
    const myCracks = this.cracks.filter((k) => k.owner === 'player');
    this.api.setStatusIndicator('ruin-cracks', playerIsRuin && myCracks.length > 0 ? {
      name: 'Ruin Cracks', emoji: '🕳️', color: RUI.ancient,
      description: `Open floor that eats anyone standing in it for ${CRACK_DPS}/s. Every crystal that goes off widens all of them, and a crystal grown on top of one throws ${BOLT_DAMAGE} lightning at whoever comes near.`,
      count: myCracks.length, priority: 110,
    } : null);

    // ── Victim side: all of this can be on the player whoever is playing Ruin. ──
    const stacks = this.decayStacksOn(p);
    let worstVuln = 1;
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.sides[owner].decay && this.isEnemyOf(owner, p)) {
        worstVuln = Math.max(worstVuln, this.decayCurve(owner).vuln);
      }
    }
    this.api.setStatusIndicator('ruin-decayed', stacks > 0 ? {
      name: 'Unstoppable Decay', emoji: '🦠', color: RUI.decay,
      description: `Rotting, and it never wears off. You are taking ${worstVuln.toFixed(2)}× damage, moving at ${Math.round(this.ruinSpeedMult(p) * 100)}% speed, and dealing less of everything.`,
      count: stacks, priority: 4,
    } : null);

    // ── Victim side: Chain Reaction's blunting ──
    const blunted = this.blunt.get(p);
    let worstBlunt = 0;
    let bluntName = '';
    for (const [id, n] of blunted?.stacks ?? []) {
      if (n <= worstBlunt) continue;
      worstBlunt = n;
      bluntName = this.nameOfAbility(p, id);
    }
    this.api.setStatusIndicator('ruin-blunted', worstBlunt > 0 ? {
      name: 'Blunted', emoji: '🪓', color: RUI.ruby,
      description: `Ruin spikes have taken a permanent bite out of the attacks you use. Worst hit is ${bluntName}, down ${Math.round((1 - Math.pow(1 - BLUNT_STEP, worstBlunt)) * 100)}%. It never comes back.`,
      count: worstBlunt, priority: 7,
    } : null);

    const locked = this.locks.find((l) => l.victim === p);
    this.api.setStatusIndicator('ruin-locked', locked ? {
      name: `Locked: ${locked.abilityName}`, emoji: '🔒', color: RUI.rust,
      description: 'A rusted padlock is on that ability. It will not fire however ready its cooldown looks.',
      until: locked.until, priority: 10,
    } : null);

    let teeth = 0;
    for (const n of this.lockjaw.get(p)?.values() ?? []) teeth += n;
    this.api.setStatusIndicator('ruin-lockjaw', teeth > 0 ? {
      name: 'Lockjaw', emoji: '🦷', color: RUI.ember,
      description: `Abilities that have worn a Ruin padlock keep the teeth marks. Each one costs you ${LOCKJAW_DAMAGE} HP every time you use it, for the rest of the match.`,
      count: teeth, priority: 9,
    } : null);

    this.api.setStatusIndicator('ruin-inverted', time < p.buffsInvertedUntil ? {
      name: 'Turned Inside Out', emoji: '🔻', color: RUI.bright,
      description: 'The spikes took your buffs and handed them back backwards. Every boost you are wearing is working against you.',
      until: p.buffsInvertedUntil, priority: 11,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * The decay's slow. Pulled by ArenaScene rather than pushed from `update()`, which runs
   * after the frame's movement has already resolved.
   */
  getPlayerSpeedMult(): number {
    return this.ruinSpeedMult(this.api.player);
  }

  getNpcSpeedMult(): number {
    return this.ruinSpeedMult(this.api.npc);
  }

  /** True while a ring is already counting down for that side — a second cast is wasted. */
  hasRing(owner: Owner): boolean { return this.rings.some((r) => r.owner === owner); }
  hasSkewer(owner: Owner): boolean { return this.skewers.some((s) => s.owner === owner); }
  decayStacks(owner: Owner): number { return this.sides[owner].decay; }
  /** Whether the AI has anything to lock — an untouched target is a wasted twenty-five seconds. */
  canLock(target: Fighter): boolean {
    return !!target.lastCastAbilityId && target.lockRemaining(target.lastCastAbilityId) <= 0;
  }

  /**
   * Ability tray fill. Only F counts something other than a cooldown: the two-second fuse is
   * longer than anything the card could usefully say about the eighteen behind it.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    if (abilityId === 'ruin-spikes') {
      const ring = this.rings.find((r) => r.owner === 'player');
      if (ring) return Phaser.Math.Clamp((time - ring.startedAt) / RING_FUSE_MS, 0, 1);
    }
    if (abilityId === 'ruin-decay' && this.sides.player.decay >= MAX_DECAY) return 1;
    return p.getCooldownRatio(abilityId);
  }
}
