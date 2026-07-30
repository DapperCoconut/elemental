import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  GLA, GlassAvatar, GlassColorFn, GlassFx, caustic, crackLace, flyingShard, glassPane,
  hueOf, jitter, mosaicDisc, orbitRing, shade,
} from './GlassVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const TAU = Math.PI * 2;

// ── Passive ──────────────────────────────────────────────────────────────────
/** The price of being made of glass: everything hits you a quarter harder. */
const FRAGILE_VULN = 0.25;
/** And again as much while nothing is orbiting you — Shard Splinter's real cost. */
const BARE_VULN = 0.25;
const PASSIVE_SHARDS = 15;
const PASSIVE_DAMAGE = 5;
const PASSIVE_SPEED = 440;
/**
 * Minimum gap between two passive bursts. Not a balance number — it is what stops two Glass
 * fighters standing next to each other from answering each other's shards forever.
 */
const PASSIVE_GATE_MS = 260;

// ── Shard Orbit (Click) ──────────────────────────────────────────────────────
const ORBIT_COUNT = 6;
const ORBIT_R_MIN = 44;
const ORBIT_R_MAX = 102;
/** Radians per second at rest and at full stretch. */
const ORBIT_SPIN_MIN = 2.2;
const ORBIT_SPIN_MAX = 5.6;
const ORBIT_DAMAGE_MIN = 4;
const ORBIT_DAMAGE_MAX = 8;
const ORBIT_HIT_R = 15;
/** Per shard, per victim — six shards on one body is six independent clocks, not one. */
const ORBIT_GATE_MS = 500;
/** Seconds from held to fully extended, and from released back in. */
const EXTEND_MS = 900;
const RETRACT_MS = 450;

// ── Shard Splinter (E) ───────────────────────────────────────────────────────
const SPLINTER_DAMAGE = 8;
const SPLINTER_SPEED = 800;
const SPLINTER_OUT_MS = 520;
const SPLINTER_HOME_SPEED = 700;
/** However far they get, they are never lost — this is the wall on the round trip. */
const SPLINTER_MAX_MS = 4000;

// ── Mosaic Twirl (R) ─────────────────────────────────────────────────────────
const TWIRL_SPEED = 760;
const TWIRL_MAX_MS = 1300;
const TWIRL_ARRIVE = 20;
const TWIRL_SPIN_MULT = 3;
/** The spin is triple, so the shards are allowed to land triple as often. */
const TWIRL_GATE_MS = Math.round(ORBIT_GATE_MS / 3);

// ── Temper (F) ───────────────────────────────────────────────────────────────
const TEMPER_MS = 5000;
const TEMPER_BONUS = 2;

// ── Glass Blow (Q) ───────────────────────────────────────────────────────────
const BLOW_CHARGE_MS = 2000;
const BLOW_SHARDS = 15;
const BLOW_DAMAGE = 10;
const BLOW_SPEED = 540;
/** Panes that peel off the walls to rebuild him. Six, so they land as the new orbit. */
const BLOW_PIECES = 6;
const BLOW_PIECE_STAGGER_MS = 340;
const BLOW_PIECE_SPEED = 640;
const BLOW_PIECE_DAMAGE = 8;
const BLOW_PIECE_ARRIVE = 16;

const FLIER_HIT_R = 14;
const FLIER_RANGE = 400;

// ── World objects ────────────────────────────────────────────────────────────

/** One of the six panes riding the ring. `gate` is per-victim, so it never double-dips. */
interface OrbitShard {
  /** Slot around the ring — its phase is `idx / ORBIT_COUNT` of a turn. */
  idx: number;
  hue: number;
  seed: number;
  /** Live world position, so the painter and the hit test can never disagree. */
  x: number;
  y: number;
  spin: number;
  gate: Map<Fighter, number>;
}

/** A shard that has left: the passive burst and the Q detonation both make these. */
interface Flier {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  hue: number;
  seed: number;
  diesAt: number;
  hits: Set<Fighter>;
}

/** A splintered orbit shard: out, then home, then back into its old slot. */
interface Splinter {
  owner: Owner;
  slot: number;
  hue: number;
  seed: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** When the outward leg ends and it turns for home. */
  turnAt: number;
  /** Wall on the whole round trip — a shard chasing a corpse still has to come back. */
  diesAt: number;
  homing: boolean;
  /** Cleared at the turn, so the return leg is allowed to cut the same body again. */
  hits: Set<Fighter>;
}

/** A pane peeling off the arena wall to rebuild an exploded Glass. */
interface Piece {
  owner: Owner;
  idx: number;
  hue: number;
  seed: number;
  x: number;
  y: number;
  ang: number;
  /** True once it has reached the cursor and is waiting for its siblings. */
  parked: boolean;
  hits: Set<Fighter>;
}

/** Glass Blow's state machine. `charge` is the invincible wind-up; `reform` is the rebuild. */
interface Blow {
  phase: 'charge' | 'reform';
  startedAt: number;
  nextPieceAt: number;
  spawned: number;
}

interface Side {
  owner: Owner;
  /** Latched from input (player) or from the last cast (npc) — the aim, and Q's rally point. */
  aimX: number;
  aimY: number;
  /** 0–1 — how far the ring is pushed out. */
  extend: number;
  /** The npc has no button to hold, so its push is a timed intent instead. */
  npcHoldUntil: number;
  spinPhase: number;
  shards: OrbitShard[];
  /** Rotates the mosaic's starting colour, so a rebuilt ring isn't the same six every time. */
  hue0: number;
  temperUntil: number;
  lastPassiveAt: number;
  twirl: { tx: number; ty: number; endsAt: number } | null;
  blow: Blow | null;
  /** True between the detonation and the last pane landing — there is no body at all. */
  hidden: boolean;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, extend: 0, npcHoldUntil: 0, spinPhase: Math.random() * TAU,
    shards: [], hue0: 0, temperUntil: 0, lastPassiveAt: -PASSIVE_GATE_MS,
    twirl: null, blow: null, hidden: false,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface GlassArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /**
   * Mosaic Twirl and Glass Blow both place the player's body themselves, so WASD has to be
   * told to stand down for the duration — same flag Hunt's pounce and Gunpowder's retreat use.
   */
  isDodging: boolean;
  /** Skins: maps a Glass visual colour through that side's equipped skin. */
  glassColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── GlassKit ─────────────────────────────────────────────────────────────────

export class GlassKit {
  private api: GlassArenaApi;

  // ── Visuals ──
  private readonly pcol: GlassColorFn;
  private readonly ncol: GlassColorFn;
  private readonly pfx: GlassFx;
  private readonly nfx: GlassFx;
  private playerAvatar: GlassAvatar | null = null;
  private npcAvatar: GlassAvatar | null = null;
  /** Caustics and the Q's rally mark: on the floor, under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Every shard, orbiting or otherwise — over the fighters, because glass catches the light. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private fliers: Flier[] = [];
  private splinters: Splinter[] = [];
  private pieces: Piece[] = [];
  /** Everyone this kit has written `glassIncomingMult` onto. */
  private touched = new Set<Fighter>();
  /** True while *this* kit is the one holding the arena's dodge flag down. */
  private claimsDodge = false;

  constructor(api: GlassArenaApi) {
    this.api = api;
    this.pcol = (base) => api.glassColor('player', base);
    this.ncol = (base) => api.glassColor('npc', base);
    this.pfx = new GlassFx(api.scene, this.pcol);
    this.nfx = new GlassFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): GlassFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): GlassColorFn { return owner === 'player' ? this.pcol : this.ncol; }
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

  private isGlass(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'glass' : this.api.npcElementId === 'glass';
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /** Every fighter in the match, for the bookkeeping that doesn't care whose side anybody is on. */
  private everyone(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (this.alive(f) && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private avatar(owner: Owner): GlassAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Temper's darkening, as a factor every drawing call for that side takes. */
  private dark(owner: Owner): number {
    return this.now < this.sides[owner].temperUntil ? 0.58 : 1;
  }

  private tempered(owner: Owner): boolean {
    return this.now < this.sides[owner].temperUntil;
  }

  /** Extra damage every shard on that side is carrying right now. */
  private shardBonus(owner: Owner): number {
    return this.tempered(owner) ? TEMPER_BONUS : 0;
  }

  /**
   * Claim or release the arena's WASD override. One boolean rather than a counter because the
   * two things that need it — Twirl and Blow — are mutually exclusive by construction: casting
   * Q cancels a running twirl, and a twirl can't start while a Q is in flight.
   */
  private setDodgeClaim(on: boolean): void {
    this.claimsDodge = on;
    this.api.isDodging = on;
  }

  /**
   * Re-assert the claim every frame. A Space dodge taken mid-twirl owns the same flag and
   * hands it back when *it* finishes — without this, WASD would come back under a twirl that
   * is still running and fight the kit for the body.
   */
  private assertDodgeClaim(): void {
    if (this.claimsDodge) this.api.isDodging = true;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Everything written onto a fighter is handed back here, or the next match opens with an
    // invisible, invincible, permanently fragile player.
    for (const f of this.touched) f.glassIncomingMult = 1;
    this.touched.clear();
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (!s.hidden) continue;
      const f = this.fighter(owner);
      if (!f?.active) continue;
      f.setVisible(true);
      f.setHealthBarVisible(true);
      f.isInvincible = false;
    }
    this.setDodgeClaim(false);

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.fliers = [];
    this.splinters = [];
    this.pieces = [];
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'glass') return;
    void time;
    const s = this.sides.player;
    // The aim is latched even while he is in pieces — during Glass Blow the cursor *is* the
    // rally point, so this is the one thing that must keep updating with no body behind it.
    s.aimX = mouseX;
    s.aimY = mouseY;
    if (s.hidden) return;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (clicked) p.castAbility('glass-orbit', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('glass-splinter', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('glass-twirl', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('glass-temper', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('glass-blow', ctx);

    // The hold itself is read straight off the pointer rather than through an ability: the
    // click's whole job after the first press is "am I still down", and routing that through
    // `castAbility` every frame would stamp a cooldown sixty times a second.
    this.sides.player.extend = this.stepExtend(s.extend, pointer.isDown, this.lastDelta);
  }

  /** Remembered so `handleInput` (which has no delta) can advance the hold at frame rate. */
  private lastDelta = 16.67;

  private stepExtend(cur: number, held: boolean, delta: number): number {
    const step = delta / (held ? EXTEND_MS : -RETRACT_MS);
    return Phaser.Math.Clamp(cur + step, 0, 1);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Shard Orbit. There is nothing to fire: the ring is always up. The cast exists so
   * the press has a gesture, a sound and a card, and so the npc (which has no button to hold)
   * has some way to ask for the shards to be pushed out.
   */
  doOrbit(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    if (s.hidden) return;

    if (owner === 'npc') s.npcHoldUntil = this.now + 1800;
    this.avatar(owner)?.play('flex');
    this.fx(owner).chime(f.x, f.y, ORBIT_R_MIN * 0.6, ORBIT_R_MIN, 300, 9, s.hue0, this.dark(owner));
  }

  /**
   * E — Shard Splinter. Every pane in the ring leaves at once along the aim, in the fan they
   * were already sitting in — so the spread is whatever the ring happened to look like, and a
   * fully extended ring throws a much wider volley than a tucked one.
   */
  doSplinter(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    if (s.hidden) return;
    if (s.shards.length === 0) {
      f.resetCooldown('glass-splinter');
      this.api.showFloatingText(f.x, f.y - 46, '🪟 NOTHING TO THROW', this.hex(GLA.pane));
      return;
    }

    const aim = Math.atan2(ty - f.y, tx - f.x);
    const spread = 0.16 + s.extend * 0.34;
    const n = s.shards.length;
    for (let i = 0; i < n; i++) {
      const sh = s.shards[i];
      // Fanned around the aim in slot order, so the volley reads as the ring unrolled.
      const ang = aim + (i - (n - 1) / 2) * spread;
      this.splinters.push({
        owner, slot: sh.idx, hue: sh.hue, seed: sh.seed,
        x: sh.x, y: sh.y,
        vx: Math.cos(ang) * SPLINTER_SPEED,
        vy: Math.sin(ang) * SPLINTER_SPEED,
        turnAt: this.now + SPLINTER_OUT_MS,
        diesAt: this.now + SPLINTER_MAX_MS,
        homing: false,
        hits: new Set<Fighter>(),
      });
    }
    s.shards = [];

    this.avatar(owner)?.play('dash', aim);
    this.fx(owner).chime(f.x, f.y, 20, ORBIT_R_MAX, 380, 9, s.hue0, this.dark(owner));
    this.api.showFloatingText(f.x, f.y - 46, `🔷 SPLINTER ×${n}`, this.hex(GLA.sapphire));
    Sfx.playAt('crystal-shatter', f.x, { volume: 0.8, rate: 1.1 });
  }

  /**
   * R — Mosaic Twirl. The destination is latched at the moment of the cast, not tracked: the
   * ability is a committed line across the arena, and letting it follow the cursor mid-flight
   * would turn a dash into a homing missile.
   */
  doTwirl(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    if (s.hidden) return;

    s.twirl = {
      tx: Phaser.Math.Clamp(tx, this.left + 16, this.right - 16),
      ty: Phaser.Math.Clamp(ty, this.top + 16, this.bottom - 16),
      endsAt: this.now + TWIRL_MAX_MS,
    };
    if (owner === 'player') this.setDodgeClaim(true);

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).chime(f.x, f.y, 14, ORBIT_R_MAX * 0.9, 420, 9, s.hue0, this.dark(owner));
    this.api.showFloatingText(f.x, f.y - 46, '🌀 MOSAIC TWIRL', this.hex(GLA.amethyst));
    Sfx.playAt('whoosh', f.x, { volume: 0.85, rate: 1.2 });
  }

  /**
   * F — Temper. The only time Glass is tougher than anybody else, and it does it by flipping
   * the sign of the vulnerability rather than by stacking armour on top of it — so the harder
   * the passive is hurting you at that moment, the more Temper is worth.
   */
  doTemper(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.temperUntil = this.now + TEMPER_MS;

    this.avatar(owner)?.play('flex');
    const fx = this.fx(owner);
    fx.fracture(f.x, f.y, 46, 520, 9, 0.58);
    fx.chime(f.x, f.y, 10, 70, 460, 9, s.hue0, 0.58);
    this.api.showFloatingText(f.x, f.y - 46, '🌑 TEMPERED', this.hex(GLA.amethyst));
    this.api.showFloatingText(f.x, f.y - 28,
      s.shards.length === 0 ? '−50% DAMAGE TAKEN' : '−25% DAMAGE TAKEN', this.hex(GLA.emerald));
    Sfx.playAt('shield-up', f.x, { volume: 0.9, rate: 0.7 });
  }

  /**
   * Q — Glass Blow. Two seconds of nothing landing on you, then there is no you: the body is
   * removed from the arena entirely and rebuilt, pane by pane, wherever the cursor is when the
   * last one gets there. The two seconds are the tell, and they are long enough to read.
   */
  doBlow(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    if (s.blow) return;

    // A twirl and an explosion both want to own the body. The explosion wins.
    if (s.twirl) this.endTwirl(owner, false);

    s.blow = { phase: 'charge', startedAt: this.now, nextPieceAt: 0, spawned: 0 };
    f.isInvincible = true;

    this.avatar(owner)?.play('raise');
    const fx = this.fx(owner);
    fx.chime(f.x, f.y, 90, 24, 700, 9, s.hue0, this.dark(owner));
    this.api.showFloatingText(f.x, f.y - 52, '🪟 GLASS BLOW', this.hex(GLA.citrine));
    this.api.showFloatingText(f.x, f.y - 32, 'INVINCIBLE 2s', this.hex(GLA.bright));
    Sfx.playAt('crystal-chime', f.x, { volume: 0.95, rate: 0.6 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'glass';
    const npcIs = this.api.npcElementId === 'glass';
    // The live-state check is not an optimisation, it is a safety catch. A fighter who stops
    // being Glass mid-Glass Blow (Magic borrowing the ultimate, a stance swap) still has a
    // hidden, invincible body parked in the arena, and only this loop ever hands it back.
    if (!playerIs && !npcIs && !this.hasLiveState()) return;

    this.lastDelta = delta;
    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateSides(time, delta, playerIs, npcIs);
    this.updateOrbits(time, delta);
    this.updateFliers(delta);
    this.updateSplinters(time, delta);
    this.updateBlows(time, delta);
    this.updateVuln();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.pushStatuses(time);
  }

  /** Anything of this kit's still standing in the world, whoever is currently Glass. */
  private hasLiveState(): boolean {
    return this.fliers.length > 0 || this.splinters.length > 0 || this.pieces.length > 0
      || (['player', 'npc'] as Owner[]).some((o) => {
        const s = this.sides[o];
        return s.hidden || !!s.blow || !!s.twirl || s.shards.length > 0;
      });
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. The caustic belongs on the floor; every pane belongs over the top,
    // because a shard that passes behind a body stops reading as a solid object.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
  }

  // ── Per-side bookkeeping ───────────────────────────────────────────────────

  private updateSides(time: number, delta: number, playerIs: boolean, npcIs: boolean): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const is = owner === 'player' ? playerIs : npcIs;
      const s = this.sides[owner];
      const f = this.fighter(owner);

      if (is) {
        if (s.shards.length === 0 && !s.blow && !this.splinters.some((sp) => sp.owner === owner)) {
          this.buildRing(owner);
        }
        // The npc has no pointer, so its hold is a timed intent; the player's was already
        // stepped in `handleInput`, which is the only place the pointer is in scope.
        if (owner === 'npc') s.extend = this.stepExtend(s.extend, time < s.npcHoldUntil, delta);
      } else if (!s.blow) {
        // Stopped being Glass mid-match (Magic borrowing an element, a fresh round sharing the
        // kit): drop the ring rather than leave six orphaned shards spinning on somebody
        // else's character. A Glass Blow in progress is exempt — those panes have to land.
        s.shards = [];
      }

      // Below here runs for a non-Glass side too, deliberately: whatever this kit did to a
      // body has to be undone by this kit, whoever that body currently belongs to.
      if (s.twirl) this.driveTwirl(owner, time);
      if (s.hidden && f.active && f.body) {
        // No body means no body: it does not drift, and it does not become targetable again
        // because some other system decided to make it visible.
        this.body(f).setVelocity(0, 0);
        f.setVisible(false);
        f.setHealthBarVisible(false);
        f.isInvincible = true;
      }
    }
    this.assertDodgeClaim();
  }

  /** Six fresh panes in the ring, colours walked off the mosaic from a rotating start. */
  private buildRing(owner: Owner): void {
    const s = this.sides[owner];
    s.hue0 = (s.hue0 + 1) % 7;
    s.shards = Array.from({ length: ORBIT_COUNT }, (_, i) => ({
      idx: i,
      hue: hueOf(s.hue0 + i),
      seed: Math.random() * 999,
      x: this.fighter(owner).x,
      y: this.fighter(owner).y,
      spin: Math.random() * TAU,
      gate: new Map<Fighter, number>(),
    }));
  }

  // ── Shard Orbit ────────────────────────────────────────────────────────────

  private updateOrbits(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (s.shards.length === 0) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;

      const twirling = !!s.twirl;
      const spinRate = (ORBIT_SPIN_MIN + (ORBIT_SPIN_MAX - ORBIT_SPIN_MIN) * s.extend)
        * (twirling ? TWIRL_SPIN_MULT : 1);
      s.spinPhase += spinRate * dt;

      const radius = ORBIT_R_MIN + (ORBIT_R_MAX - ORBIT_R_MIN) * (twirling ? 1 : s.extend);
      const damage = Math.round(ORBIT_DAMAGE_MIN
        + (ORBIT_DAMAGE_MAX - ORBIT_DAMAGE_MIN) * (twirling ? 1 : s.extend)) + this.shardBonus(owner);
      const gateMs = twirling ? TWIRL_GATE_MS : ORBIT_GATE_MS;
      const targets = this.targetsOf(owner);

      for (const sh of s.shards) {
        const a = s.spinPhase + (sh.idx / ORBIT_COUNT) * TAU;
        sh.x = f.x + Math.cos(a) * radius;
        sh.y = f.y + Math.sin(a) * radius * 0.86;
        sh.spin += dt * spinRate * 1.4;

        for (const t of targets) {
          if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > ORBIT_HIT_R + 14 * t.sizeMult) continue;
          if (time < (sh.gate.get(t) ?? 0)) continue;
          sh.gate.set(t, time + gateMs);
          t.takeDamage(damage);
          this.api.spawnHitFlash(t.x, t.y, sh.hue);
          this.fx(owner).ping(sh.x, sh.y, 16, sh.hue, 10, this.dark(owner));
        }
      }
    }
  }

  // ── The passive ────────────────────────────────────────────────────────────

  /**
   * Every hit taken throws the mosaic outward. Spaced evenly with a random phase rather than
   * fired at fifteen random angles: "in a 360 degree radius" is a promise about coverage, and
   * fifteen independent rolls breaks it roughly half the time.
   */
  onDamaged(owner: Owner, amount: number): void {
    if (amount <= 0 || !this.isGlass(owner)) return;
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.hidden) return;
    if (this.now - s.lastPassiveAt < PASSIVE_GATE_MS) return;
    s.lastPassiveAt = this.now;

    const damage = PASSIVE_DAMAGE + this.shardBonus(owner);
    const phase = Math.random() * TAU;
    for (let i = 0; i < PASSIVE_SHARDS; i++) {
      const a = phase + (i / PASSIVE_SHARDS) * TAU + (Math.random() - 0.5) * 0.14;
      this.spawnFlier(owner, f.x, f.y, a, PASSIVE_SPEED, damage, s.hue0 + i);
    }
    this.fx(owner).chime(f.x, f.y, 10, 54, 320, 9, s.hue0, this.dark(owner));
    Sfx.playAt('ice-shatter', f.x, { volume: 0.5, rate: 1.35 });
  }

  private spawnFlier(owner: Owner, x: number, y: number, ang: number, speed: number,
    damage: number, hueIdx: number): void {
    this.fliers.push({
      owner, x, y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      damage, hue: hueOf(hueIdx), seed: Math.random() * 999,
      diesAt: this.now + (FLIER_RANGE / speed) * 1000,
      hits: new Set<Fighter>(),
    });
  }

  private updateFliers(delta: number): void {
    const dt = delta / 1000;
    const time = this.now;
    for (let i = this.fliers.length - 1; i >= 0; i--) {
      const fl = this.fliers[i];
      fl.x += fl.vx * dt;
      fl.y += fl.vy * dt;

      for (const t of this.targetsOf(fl.owner)) {
        if (fl.hits.has(t)) continue;
        if (Phaser.Math.Distance.Between(fl.x, fl.y, t.x, t.y) > FLIER_HIT_R + 12 * t.sizeMult) continue;
        fl.hits.add(t);
        t.takeDamage(fl.damage);
        this.api.spawnHitFlash(t.x, t.y, fl.hue);
        this.fx(fl.owner).ping(fl.x, fl.y, 18, fl.hue, 10, this.dark(fl.owner));
      }

      const gone = time >= fl.diesAt || fl.hits.size > 0
        || fl.x < this.left || fl.x > this.right || fl.y < this.top || fl.y > this.bottom;
      if (!gone) continue;
      this.fx(fl.owner).dust(fl.x, fl.y, 3, 12, 380, 9, 0, this.dark(fl.owner));
      this.fliers.splice(i, 1);
    }
  }

  // ── Shard Splinter ─────────────────────────────────────────────────────────

  private updateSplinters(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.splinters.length - 1; i >= 0; i--) {
      const sp = this.splinters[i];
      const caster = this.fighter(sp.owner);
      const s = this.sides[sp.owner];

      if (!sp.homing && (time >= sp.turnAt
          || sp.x < this.left || sp.x > this.right || sp.y < this.top || sp.y > this.bottom)) {
        sp.homing = true;
        // Cleared at the turn on purpose: the way back is a second pass, and a shard that
        // threaded somebody on the way out should be able to thread them again coming home.
        sp.hits.clear();
        this.fx(sp.owner).dust(sp.x, sp.y, 3, 10, 320, 9, 0, this.dark(sp.owner));
      }

      if (sp.homing) {
        // A caster with no body to come home to (mid-Glass Blow, or dead) is not a reason to
        // hang in the air — the shard rejoins the ring the moment it is close enough.
        const hx = this.alive(caster) ? caster.x : sp.x;
        const hy = this.alive(caster) ? caster.y : sp.y;
        const ang = Math.atan2(hy - sp.y, hx - sp.x);
        sp.vx = Math.cos(ang) * SPLINTER_HOME_SPEED;
        sp.vy = Math.sin(ang) * SPLINTER_HOME_SPEED;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;

      const damage = SPLINTER_DAMAGE + this.shardBonus(sp.owner);
      for (const t of this.targetsOf(sp.owner)) {
        if (sp.hits.has(t)) continue;
        if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > FLIER_HIT_R + 12 * t.sizeMult) continue;
        sp.hits.add(t);
        t.takeDamage(damage);
        this.api.spawnHitFlash(t.x, t.y, sp.hue);
        this.fx(sp.owner).ping(sp.x, sp.y, 20, sp.hue, 10, this.dark(sp.owner));
      }

      const home = sp.homing && this.alive(caster)
        && Phaser.Math.Distance.Between(sp.x, sp.y, caster.x, caster.y) < ORBIT_R_MIN * 0.7;
      if (!home && time < sp.diesAt) continue;

      // Back into the slot it left, unless the ring has been rebuilt underneath it (a Glass
      // Blow while the shards were away), in which case it is simply spent.
      if (!s.blow && !s.shards.some((sh) => sh.idx === sp.slot)) {
        s.shards.push({
          idx: sp.slot, hue: sp.hue, seed: sp.seed,
          x: sp.x, y: sp.y, spin: 0, gate: new Map<Fighter, number>(),
        });
        this.fx(sp.owner).seal(sp.x, sp.y, Math.atan2(sp.vy, sp.vx), 16, 300, 10, sp.hue, this.dark(sp.owner));
      }
      this.splinters.splice(i, 1);
      if (this.splinters.every((o) => o.owner !== sp.owner) && this.alive(caster)) {
        this.api.showFloatingText(caster.x, caster.y - 40, '🔷 REASSEMBLED', this.hex(GLA.pane));
      }
    }
  }

  // ── Mosaic Twirl ───────────────────────────────────────────────────────────

  private driveTwirl(owner: Owner, time: number): void {
    const s = this.sides[owner];
    const tw = s.twirl;
    if (!tw) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.endTwirl(owner, false); return; }

    const d = Phaser.Math.Distance.Between(f.x, f.y, tw.tx, tw.ty);
    if (d <= TWIRL_ARRIVE || time >= tw.endsAt) { this.endTwirl(owner, true); return; }

    const ang = Math.atan2(tw.ty - f.y, tw.tx - f.x);
    this.body(f).setVelocity(Math.cos(ang) * TWIRL_SPEED, Math.sin(ang) * TWIRL_SPEED);
  }

  private endTwirl(owner: Owner, landed: boolean): void {
    const s = this.sides[owner];
    if (!s.twirl) return;
    s.twirl = null;
    if (owner === 'player') this.setDodgeClaim(false);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.body(f).setVelocity(0, 0);
    if (!landed) return;
    this.fx(owner).chime(f.x, f.y, ORBIT_R_MAX, ORBIT_R_MIN, 340, 9, s.hue0, this.dark(owner));
    this.fx(owner).dust(f.x, f.y, 6, 26, 420, 9, s.hue0, this.dark(owner));
  }

  // ── Glass Blow ─────────────────────────────────────────────────────────────

  private updateBlows(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      const b = s.blow;
      if (!b) continue;

      if (b.phase === 'charge') {
        if (time - b.startedAt < BLOW_CHARGE_MS) continue;
        this.detonate(owner);
        continue;
      }

      // ── Reform ──
      if (b.spawned < BLOW_PIECES && time >= b.nextPieceAt) {
        this.spawnPiece(owner, b.spawned);
        b.spawned++;
        b.nextPieceAt = time + BLOW_PIECE_STAGGER_MS;
      }
      this.drivePieces(owner, delta);
      if (b.spawned >= BLOW_PIECES && this.pieces.filter((p) => p.owner === owner).every((p) => p.parked)) {
        this.reassemble(owner);
      }
    }
  }

  private detonate(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const dark = this.dark(owner);
    const fx = this.fx(owner);

    fx.burst(f.x, f.y, 110, 760, 11, dark);
    const damage = BLOW_DAMAGE + this.shardBonus(owner);
    const phase = Math.random() * TAU;
    for (let i = 0; i < BLOW_SHARDS; i++) {
      const a = phase + (i / BLOW_SHARDS) * TAU + (Math.random() - 0.5) * 0.5;
      this.spawnFlier(owner, f.x, f.y, a, BLOW_SPEED * (0.85 + Math.random() * 0.3), damage, s.hue0 + i);
    }
    // The ring is part of him, so it goes with him.
    s.shards = [];
    s.hidden = true;
    s.blow = { phase: 'reform', startedAt: this.now, nextPieceAt: this.now + 260, spawned: 0 };

    f.setVisible(false);
    f.setHealthBarVisible(false);
    f.isInvincible = true;
    this.body(f).setVelocity(0, 0);
    if (owner === 'player') this.setDodgeClaim(true);

    this.api.showFloatingText(f.x, f.y - 40, '💥 SHATTERED', this.hex(GLA.bright));
    Sfx.playAt('explosion-medium', f.x, { volume: 1, rate: 1.3 });
    Sfx.playAt('crystal-shatter', f.x, { volume: 0.9, rate: 0.8 });
  }

  /** One pane dislodging from a wall. Sides are walked in order so all four get used. */
  private spawnPiece(owner: Owner, idx: number): void {
    const s = this.sides[owner];
    let x: number;
    let y: number;
    switch (idx % 4) {
      case 0: x = this.left; y = Phaser.Math.Between(this.top, this.bottom); break;
      case 1: x = this.right; y = Phaser.Math.Between(this.top, this.bottom); break;
      case 2: x = Phaser.Math.Between(this.left, this.right); y = this.top; break;
      default: x = Phaser.Math.Between(this.left, this.right); y = this.bottom; break;
    }
    this.pieces.push({
      owner, idx, hue: hueOf(s.hue0 + idx), seed: Math.random() * 999,
      x, y, ang: 0, parked: false, hits: new Set<Fighter>(),
    });
    const fx = this.fx(owner);
    fx.fracture(x, y, 30, 420, 9, this.dark(owner));
    fx.dust(x, y, 5, 18, 420, 9, s.hue0 + idx, this.dark(owner));
    Sfx.playAt('crystal-chime', x, { volume: 0.55, rate: 1.1 + idx * 0.07 });
  }

  private drivePieces(owner: Owner, delta: number): void {
    const dt = delta / 1000;
    const rally = this.rallyPoint(owner);
    const damage = BLOW_PIECE_DAMAGE + this.shardBonus(owner);
    const mine = this.pieces.filter((p) => p.owner === owner);

    for (const p of mine) {
      if (p.parked) {
        // Parked panes are glued to the rally point, hanging in the ring they are about to
        // become — so a cursor that keeps moving drags the half-built body along with it.
        const a = (p.idx / BLOW_PIECES) * TAU + this.vizT * 2.2;
        p.x = rally.x + Math.cos(a) * 22;
        p.y = rally.y + Math.sin(a) * 22 * 0.8;
        p.ang = a + Math.PI / 2;
        continue;
      }

      // Homing on the *live* rally point every frame, not on where it was when the pane left.
      const ang = Math.atan2(rally.y - p.y, rally.x - p.x);
      p.ang = ang;
      p.x += Math.cos(ang) * BLOW_PIECE_SPEED * dt;
      p.y += Math.sin(ang) * BLOW_PIECE_SPEED * dt;

      for (const t of this.targetsOf(owner)) {
        if (p.hits.has(t)) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > FLIER_HIT_R + 12 * t.sizeMult) continue;
        p.hits.add(t);
        t.takeDamage(damage);
        this.api.spawnHitFlash(t.x, t.y, p.hue);
        this.fx(owner).ping(p.x, p.y, 20, p.hue, 10, this.dark(owner));
      }

      if (Phaser.Math.Distance.Between(p.x, p.y, rally.x, rally.y) > BLOW_PIECE_ARRIVE) continue;
      p.parked = true;
      this.fx(owner).seal(rally.x, rally.y, ang, 24, 320, 11, p.hue, this.dark(owner));
      Sfx.playAt('crystal-chime', rally.x, { volume: 0.6, rate: 1.4 });
    }
  }

  /**
   * Where the pieces are heading. The player's is the live cursor; the npc has no cursor, so
   * it re-forms just short of whoever it was fighting — which is the same decision a player
   * makes with the mouse, and keeps the ultimate from being a free disengage for the bot.
   */
  private rallyPoint(owner: Owner): { x: number; y: number } {
    const s = this.sides[owner];
    if (owner === 'player') {
      return {
        x: Phaser.Math.Clamp(s.aimX, this.left + 20, this.right - 20),
        y: Phaser.Math.Clamp(s.aimY, this.top + 20, this.bottom - 20),
      };
    }
    const t = this.api.player;
    if (!this.alive(t)) return { x: s.aimX, y: s.aimY };
    const ang = Math.atan2(this.api.npc.y - t.y, this.api.npc.x - t.x);
    return {
      x: Phaser.Math.Clamp(t.x + Math.cos(ang) * 120, this.left + 20, this.right - 20),
      y: Phaser.Math.Clamp(t.y + Math.sin(ang) * 120, this.top + 20, this.bottom - 20),
    };
  }

  private reassemble(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const rally = this.rallyPoint(owner);

    this.pieces = this.pieces.filter((p) => p.owner !== owner);
    s.blow = null;
    s.hidden = false;
    s.extend = 0;

    f.setVisible(true);
    f.setHealthBarVisible(true);
    f.isInvincible = false;
    f.setPosition(rally.x, rally.y);
    this.body(f).reset(rally.x, rally.y);
    if (owner === 'player') this.setDodgeClaim(false);
    this.buildRing(owner);

    const fx = this.fx(owner);
    fx.chime(rally.x, rally.y, 8, 96, 520, 10, s.hue0, this.dark(owner));
    fx.dust(rally.x, rally.y, 10, 34, 620, 9, s.hue0, this.dark(owner));
    this.api.showFloatingText(rally.x, rally.y - 46, '🪟 RE-FORMED', this.hex(GLA.citrine));
    Sfx.playAt('crystal-chime', rally.x, { volume: 1, rate: 0.75 });
  }

  // ── Vulnerability ──────────────────────────────────────────────────────────

  /**
   * The passive, and Temper flipping its sign.
   *
   * Rewritten from scratch every frame onto a field of its own rather than folded into
   * `incomingDamageMultiplier`, for the same reason Justice, Magma and Ruin each have one: a
   * shared field would stomp whatever else had written armour that tick. The bonuses are added
   * before the sign is chosen, so 25% + 25% is 50% either way round — which is exactly what
   * "replaced with equal amounts of damage resistance" has to mean.
   */
  private updateVuln(): void {
    for (const f of [...this.touched]) {
      f.glassIncomingMult = 1;
      if (!this.alive(f)) this.touched.delete(f);
    }
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isGlass(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      f.glassIncomingMult = this.vulnMult(owner);
      this.touched.add(f);
    }
  }

  private vulnBonus(owner: Owner): number {
    const s = this.sides[owner];
    // Mid-Glass Blow there is no body and nothing can land anyway, so the bare penalty is not
    // charged for the seconds he spends as a cloud of panes.
    const bare = s.shards.length === 0 && !s.hidden ? BARE_VULN : 0;
    return FRAGILE_VULN + bare;
  }

  private vulnMult(owner: Owner): number {
    const bonus = this.vulnBonus(owner);
    return this.tempered(owner) ? 1 - bonus : 1 + bonus;
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    for (const owner of ['player', 'npc'] as Owner[]) {
      const is = owner === 'player' ? playerIs : npcIs;
      let av = this.avatar(owner);
      if (!is) {
        if (av) { av.destroy(); }
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        continue;
      }
      const f = this.fighter(owner);
      const s = this.sides[owner];
      if (!av) {
        av = new GlassAvatar(scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setIntensity(s.twirl ? 1.4 : 1 + s.extend * 0.3);
      av.setTemper(this.tempered(owner));
      // The mosaic pulls apart over the two-second fuse, so the explosion is telegraphed by
      // the body itself rather than by a countdown printed over it.
      const b = s.blow;
      av.setOpen(b && b.phase === 'charge'
        ? Phaser.Math.Clamp((this.now - b.startedAt) / BLOW_CHARGE_MS, 0, 1) * 0.55 : 0);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, this.alive(f) && !s.hidden ? 1 : 0);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** Caustics and the rally mark — everything that lives on the floor. */
  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (!this.isGlass(owner)) continue;
      const tint = this.col(owner);
      const dark = this.dark(owner);

      // The pool of colour the orbit throws down, wider the further the ring is pushed out.
      const f = this.fighter(owner);
      if (this.alive(f) && !s.hidden && s.shards.length > 0) {
        const r = ORBIT_R_MIN + (ORBIT_R_MAX - ORBIT_R_MIN) * s.extend;
        caustic(g, tint, f.x, f.y + 12, r * 0.7, this.vizT, 0.7,
          { blots: 5, seed: 11, dark, hue0: s.hue0 });
      }

      // Where he is going to come back together. Drawn as a break in the floor, because the
      // rally point is the one thing a Glass Blow victim needs to be able to read.
      if (!s.blow || s.blow.phase !== 'reform') continue;
      const rally = this.rallyPoint(owner);
      crackLace(g, tint, rally.x, rally.y, 40, 7, 0.55, 1,
        { runs: 8, width: 1.6, squash: 0.6, dark });
      orbitRing(g, tint, rally.x, rally.y, 26, this.vizT * 1.6, 0.8, { dark, hue0: s.hue0 });
    }
  }

  /** Every pane in the match — orbiting, thrown, coming home, or rebuilding a body. */
  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── The rings ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (s.shards.length === 0) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || s.hidden) continue;
      const tint = this.col(owner);
      const dark = this.dark(owner);
      const radius = ORBIT_R_MIN + (ORBIT_R_MAX - ORBIT_R_MIN) * (s.twirl ? 1 : s.extend);

      orbitRing(g, tint, f.x, f.y, radius, s.spinPhase, 0.5 + s.extend * 0.5, { dark, hue0: s.hue0 });
      for (const sh of s.shards) {
        // Long axis tangential to the ring: a shard held edge-on to its own travel is what
        // makes the orbit read as a blade circle rather than as six beads on a wire.
        const a = s.spinPhase + (sh.idx / ORBIT_COUNT) * TAU;
        glassPane(g, tint, sh.x, sh.y, a + Math.PI / 2 + Math.sin(sh.spin) * 0.25,
          18 + s.extend * 8, 8 + s.extend * 3, 0.95, { color: sh.hue, seed: sh.seed, dark });
      }
    }

    // ── Thrown shards ──
    for (const fl of this.fliers) {
      flyingShard(g, this.col(fl.owner), fl.x, fl.y, Math.atan2(fl.vy, fl.vx), 17, 0.95,
        { color: fl.hue, seed: fl.seed, dark: this.dark(fl.owner) });
    }
    for (const sp of this.splinters) {
      flyingShard(g, this.col(sp.owner), sp.x, sp.y, Math.atan2(sp.vy, sp.vx), 22, 1,
        { color: sp.hue, seed: sp.seed, dark: this.dark(sp.owner), trail: sp.homing ? 0.6 : 1.2 });
    }

    // ── Glass Blow ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      const b = s.blow;
      if (!b || b.phase !== 'charge') continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      // The charge tell: a mosaic disc winding up around him, brightening as the fuse runs out.
      const k = Phaser.Math.Clamp((this.now - b.startedAt) / BLOW_CHARGE_MS, 0, 1);
      mosaicDisc(g, this.col(owner), f.x, f.y, 30 + k * 26, 0.35 + k * 0.45, {
        seed: 5, wedges: 7, spin: -this.vizT * (1 + k * 5), open: k * 0.5,
        dark: this.dark(owner), hue0: s.hue0,
      });
    }
    for (const p of this.pieces) {
      const tint = this.col(p.owner);
      const dark = this.dark(p.owner);
      flyingShard(g, tint, p.x, p.y, p.ang, p.parked ? 20 : 26, 1,
        { color: p.hue, seed: p.seed, dark, trail: p.parked ? 0 : 1.4 });
      if (!p.parked) continue;
      g.fillStyle(shade(tint(GLA.bright), dark), 0.25 + 0.15 * Math.sin(this.vizT * 8 + p.idx));
      g.fillCircle(p.x, p.y, 3 + jitter(p.seed, 1) * 1.5);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(time: number): void {
    const isGlass = this.api.elementId === 'glass';
    const s = this.sides.player;
    const bonusPct = Math.round(this.vulnBonus('player') * 100);
    const tempered = time < s.temperUntil;

    this.api.setStatusIndicator('glass-fragile', isGlass && !tempered ? {
      name: 'Fragile', emoji: '🪟', color: GLA.rose,
      description: 'Made of glass: everything hits you harder, and every hit you take fires 15 shards in all directions. Throwing your shards away adds another 25%.',
      count: bonusPct, suffix: '%', priority: 6,
    } : null);

    this.api.setStatusIndicator('glass-tempered', isGlass && tempered ? {
      name: 'Tempered', emoji: '🌑', color: GLA.amethyst,
      description: `Dark and dense. Every shard hits for ${TEMPER_BONUS} more, and your fragility is running backwards — you are taking ${bonusPct}% less damage instead of ${bonusPct}% more.`,
      until: s.temperUntil, count: bonusPct, suffix: '%', priority: 116,
    } : null);

    this.api.setStatusIndicator('glass-shards', isGlass && !s.hidden ? {
      name: 'Shard Orbit', emoji: '🔷', color: GLA.sapphire,
      description: s.shards.length > 0
        ? 'Shards circling you, cutting anything they touch. Hold the click to push them out wider, faster and harder.'
        : 'Every shard is away from you. Until they are back you take an extra 25% from everything.',
      count: s.shards.length, priority: 118,
    } : null);

    this.api.setStatusIndicator('glass-blow', isGlass && s.blow ? {
      name: s.blow?.phase === 'charge' ? 'Glass Blow' : 'Re-forming', emoji: '💠', color: GLA.citrine,
      description: s.blow?.phase === 'charge'
        ? 'Nothing can touch you. In a moment you burst, and 15 shards go everywhere.'
        : 'You are in pieces. Panes are peeling off the walls one at a time — you come back where your cursor is when the last one lands.',
      until: s.blow?.phase === 'charge' ? s.blow.startedAt + BLOW_CHARGE_MS : undefined,
      count: s.blow?.phase === 'reform' ? this.pieces.filter((p) => p.owner === 'player' && p.parked).length : undefined,
      priority: 3,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** True while that side has no body in the arena — the npc must not be aimed at, or aim. */
  isBodyGone(owner: Owner): boolean { return this.sides[owner].hidden; }
  /** False while every shard is away, which is the one thing that makes E a real cost. */
  hasShards(owner: Owner): boolean { return this.sides[owner].shards.length > 0; }
  isTempered(owner: Owner): boolean { return this.tempered(owner); }
  isTwirling(owner: Owner): boolean { return !!this.sides[owner].twirl; }

  /**
   * Ability tray fill. Three of the five spend most of their life showing something other than
   * a cooldown — how far the ring is pushed out, how much Temper is left, and how far through
   * being a cloud of glass he is.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === 'glass-orbit') return s.extend;
    if (abilityId === 'glass-temper' && time < s.temperUntil) {
      return Phaser.Math.Clamp((s.temperUntil - time) / TEMPER_MS, 0, 1);
    }
    if (abilityId === 'glass-blow' && s.blow) {
      if (s.blow.phase === 'charge') {
        return Phaser.Math.Clamp((time - s.blow.startedAt) / BLOW_CHARGE_MS, 0, 1) * 0.4;
      }
      const parked = this.pieces.filter((pc) => pc.owner === 'player' && pc.parked).length;
      return 0.4 + 0.6 * (parked / BLOW_PIECES);
    }
    return p.getCooldownRatio(abilityId);
  }
}
