import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import {
  RAD, RadiationAvatar, RadiationColorFn, RadiationFx, barrageCone, dropFootprint, falloutBunker,
  flareRound, geigerTracer, lockReticle, trefoil, uraniumRod,
} from './RadiationVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ── Irradiated ───────────────────────────────────────────────────────────────
const IRRADIATED_MS = 10_000;

// ── Click: Radiation Railgun ────────────────────────────────────────────────
const TRACERS_TO_CONFIRM = 3;
const TRACER_SPEED = 950;
const TRACER_HIT_R = 17;
const TRACER_RANGE = 700;
const RAIL_DAMAGE = 50;

// ── E: Barrage ───────────────────────────────────────────────────────────────
/** The cone's full width when it opens, and the width at which the burst fires. */
const BARRAGE_OPEN_DEG = 45;
const BARRAGE_CLOSED_DEG = 5;
/** How long a held lock takes to close the cone from 45° to 5°. */
const BARRAGE_LOCK_MS = 3000;
const BARRAGE_RANGE = 560;
/** The cone gives up if it has not found anybody to close on in this long. */
const BARRAGE_SEEK_MS = 1200;
/**
 * How much of a body counts as "in the cone". A bit over half the body radius, so at 5° a
 * target is held by keeping the cone on their middle — not by grazing their edge.
 */
const BARRAGE_BODY_R = 13;
const BARRAGE_SHOTS = 5;
const BARRAGE_SHOT_GAP = 60;
const BARRAGE_DAMAGE = 5;
const BARRAGE_HOT_DAMAGE = 8;
/** The bot swings its cone at this rate — fast enough to track a walk, not a dash. */
const NPC_CONE_TURN = 2.6;

// ── R: Fallout Bunker ────────────────────────────────────────────────────────
const BUNKER_R = 72;
const BUNKER_HP = 75;
const BUNKER_MS = 10_000;
const BUNKER_BUILD_MS = 260;
/** Fighters are ~22px round; an enemy is held out at the wall plus this. */
const BUNKER_BODY_R = 22;
/** Invasion husk shots carry no damage figure the kit can read, so each one costs this. */
const BUNKER_HUSK_SHOT = 6;

// ── F: Rod Baton ─────────────────────────────────────────────────────────────
const ROD_REACH = 92;
/** Half-width of the strike, in radians. */
const ROD_ARC = 0.8;
const ROD_DAMAGE = 8;
const ROD_HOT_DAMAGE = 16;
const ROD_DOSE_MS = 4000;
const ROD_STUN_MS = 2000;
const ROD_SWING_MS = 300;

// ── Q: Extermination ─────────────────────────────────────────────────────────
const FLARE_AMMO = 5;
const FLARE_SPEED = 1350;
const FLARE_HIT_R = 15;
const FLARE_RANGE = 900;
/** The gun goes back in the holster after this long, spent or not. */
const FLARE_WINDOW_MS = 12_000;
const AIRDROP_TELL_MS = 1700;
const AIRDROP_DAMAGE = 200;

const BODY_R = 22;

/**
 * Closest point on the segment (ax,ay)→(bx,by) to (px,py).
 *
 * Everything this kit fires is hand-rolled rather than a `Projectile`, so nothing else sweeps
 * these for it — see `updateRounds`.
 */
function nearestOnSegment(
  ax: number, ay: number, bx: number, by: number, px: number, py: number,
): { x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return { x: ax, y: ay };
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t };
}

// ── World objects ────────────────────────────────────────────────────────────

/** A tracer or a flare in the air. The two differ only in what they do on contact. */
interface Round {
  owner: Owner;
  kind: 'tracer' | 'flare';
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  /** Distance still allowed before it counts as a miss. */
  left: number;
}

/**
 * Barrage, from the moment the cone opens to the last round of the burst.
 *
 * `victim` is null while the cone is still looking for somebody; `lockedAt` is when it found
 * them. Once the lock closes the cone is gone and `shotsLeft` counts the burst down.
 */
interface Barrage {
  startedAt: number;
  ang: number;
  victim: Fighter | null;
  lockedAt: number;
  shotsLeft: number;
  nextShotAt: number;
}

interface Bunker {
  x: number;
  y: number;
  hp: number;
  builtAt: number;
  until: number;
  /** 0–1, decayed per frame — the wall flashing where it last stopped something. */
  hit: number;
  seed: number;
}

/** The flare gun, out and loaded. `hits` is the whole ability: five on one body or nothing. */
interface Flares {
  ammo: number;
  hits: Map<Fighter, number>;
  /** Rounds still in the air, so the verdict waits for the last one to land. */
  inFlight: number;
  expiresAt: number;
}

interface Airdrop {
  owner: Owner;
  x: number;
  y: number;
  landsAt: number;
}

/** One swing of the rod, purely for what gets drawn behind the hit. */
interface Swing {
  x: number;
  y: number;
  ang: number;
  start: number;
  hot: boolean;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /**
   * Tracers currently clamped to a body, by victim. Cleared wholesale by a miss.
   */
  stuck: Map<Fighter, number>;
  barrage: Barrage | null;
  bunker: Bunker | null;
  /** The absorber this kit installed for the bunker, so it is only handed back if nobody replaced it. */
  absorber: ((amount: number) => boolean) | null;
  /** Whatever was on the fighter before the bunker claimed the slot. */
  prevAbsorber: ((amount: number) => boolean) | null;
  flares: Flares | null;
  swing: Swing | null;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, stuck: new Map(),
    barrage: null, bunker: null, absorber: null, prevAbsorber: null,
    flares: null, swing: null,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface RadiationArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Online: the npc is a replica of a real player, so its cone follows their relayed facing. */
  get isOnline(): boolean;
  /** The bot's difficulty aim error, so its Barrage cone wobbles like the rest of its aim. */
  get npcAimOffsetDeg(): number;
  /** The arena's shared projectile group — the bunker wall stops enemy shots in it. */
  get projectiles(): Phaser.Physics.Arcade.Group | null;
  /** Invasion: husk shots live outside the projectile group. True if one near (x,y) was eaten. */
  blockHuskShot(x: number, y: number, r: number): boolean;
  /** Skins: maps a Radiation visual colour through that side's equipped skin. */
  radiationColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

// ── RadiationKit ─────────────────────────────────────────────────────────────

/**
 * Radiation — a sniper in lead plate.
 *
 * The click is a **chain**: it plants a tracer that does no damage, three tracers on one body
 * confirm a 50-damage railgun the kit fires itself, and a single tracer that hits nothing scrubs
 * the board. The Q is the same shape with the stakes moved: five flares into one enemy calls the
 * airdrop, anything less calls nothing.
 *
 * The status the element sells is **irradiated**: while it lasts, every heal aimed at the victim
 * lands as a hit instead. The railgun and the airdrop put ten seconds of it on, the Rod Baton
 * four — and the kit's other two damage keys are worth more against somebody already carrying it:
 * Barrage's rounds go from 5 to 8, and the rod stops dosing and starts stunning.
 *
 * - **E Barrage** — a 45° sighting cone. Hold it on an enemy and it closes to 5° over three
 *   seconds; let them out and it is gone. Closed, it fires a five-round hitscan burst.
 * - **R Fallout Bunker** — a 75 HP lead ring where you stand. Enemy shots stop in the wall,
 *   enemies cannot get in, and while you are inside nothing can hurt you; the bunker takes it.
 * - **F Rod Baton** — a close strike with a uranium rod. A clean target is dosed; a dosed one
 *   takes double and is stunned for two seconds.
 */
export class RadiationKit {
  private api: RadiationArenaApi;

  // ── Visuals ──
  private readonly pcol: RadiationColorFn;
  private readonly ncol: RadiationColorFn;
  private readonly pfx: RadiationFx;
  private readonly nfx: RadiationFx;
  private playerAvatar: RadiationAvatar | null = null;
  private npcAvatar: RadiationAvatar | null = null;
  /** Bunkers and the airdrop's footprint — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Rounds in the air, stuck tracers, cones, rods and counters — over everything. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private rounds: Round[] = [];
  private airdrop: Airdrop | null = null;
  /** Victim → game-clock expiry of their dose, and who gave it to them. */
  private irradiated = new Map<Fighter, { until: number; full: number; by: Owner }>();
  /** Victim → game-clock expiry of a rod stun. */
  private stunned = new Map<Fighter, number>();

  constructor(api: RadiationArenaApi) {
    this.api = api;
    this.pcol = (base) => api.radiationColor('player', base);
    this.ncol = (base) => api.radiationColor('npc', base);
    this.pfx = new RadiationFx(api.scene, this.pcol);
    this.nfx = new RadiationFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): RadiationFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): RadiationColorFn { return owner === 'player' ? this.pcol : this.ncol; }
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

  private isRadiation(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'radiation' : this.api.npcElementId === 'radiation';
  }

  private avatar(owner: Owner): RadiationAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /** Everything this kit ever writes a field on, so a stale value can always be cleared. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private refund(f: Fighter, abilityId: string): void {
    f.resetCooldown(abilityId);
  }

  private nearestTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** Where the shot leaves from — the weapon hand if the rig is up, the chest otherwise. */
  private muzzle(owner: Owner): { x: number; y: number } {
    const f = this.fighter(owner);
    const av = this.avatar(owner);
    if (!av) return { x: f.x, y: f.y };
    const h = av.castHand();
    return Number.isFinite(h.x) && (h.x || h.y) ? h : { x: f.x, y: f.y };
  }

  /**
   * How much wider than a normal body that target currently is, in pixels. Zero unless
   * something else in the game has swelled, folded or shrunk it — every range check in this
   * kit is hand-rolled, so without this a Fate slots roll would resize a body nothing Radiation
   * owns was measuring against.
   */
  private swell(t: Fighter): number {
    const scale = t.sizeMult * t.shapeSizeMult * t.oozeSizeMult * t.hitboxMult;
    return BODY_R * (scale - 1);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) this.dropBunker(owner, true);
    for (const f of this.allFighters()) {
      if (!f) continue;
      f.healInvertedUntil = 0;
      f.onHealInverted = null;
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.rounds = [];
    this.airdrop = null;
    this.irradiated.clear();
    this.stunned.clear();
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;

    this.api.setStatusIndicator('radiation-irradiated', null);
    this.api.setStatusIndicator('radiation-flares', null);
    this.api.setStatusIndicator('radiation-barrage', null);
    this.api.setStatusIndicator('radiation-bunker', null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5. The bunker slab goes under them; everything airborne well above.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isRadiation('player') && !this.playerAvatar) {
      this.playerAvatar = new RadiationAvatar(scene, this.pcol);
    }
    if (this.isRadiation('npc') && !this.npcAvatar) {
      this.npcAvatar = new RadiationAvatar(scene, this.ncol);
    }
  }

  // ── Irradiated ─────────────────────────────────────────────────────────────

  /**
   * Put a dose on someone. Refreshes rather than stacks, and never shortens: a four-second rod
   * dose landing on somebody with nine seconds of railgun left leaves them on nine.
   */
  private irradiate(victim: Fighter, by: Owner, ms = IRRADIATED_MS, quiet = false): void {
    if (!this.alive(victim)) return;
    const prev = this.irradiated.get(victim);
    const until = Math.max(prev?.until ?? 0, this.now + ms);
    this.irradiated.set(victim, { until, full: Math.max(ms, prev ? prev.until - this.now : 0), by });
    victim.healInvertedUntil = Math.max(victim.healInvertedUntil, Date.now() + (until - this.now));
    // The inversion is silent inside `Fighter.heal`, and a heal that quietly hurt would read as
    // a bug — so the pop-up is hung off the fighter for as long as the dose lasts.
    victim.onHealInverted = (harm) => {
      this.api.showFloatingText(victim.x, victim.y - 40, `☢ ${harm} REJECTED`, this.hex(RAD.neon));
    };
    if (quiet) return;
    this.fx(by).dose(victim.x, victim.y);
    if (!prev) {
      this.api.showFloatingText(victim.x, victim.y - 48, '☢ IRRADIATED', this.hex(RAD.neon));
      Sfx.playAt('status-poison', victim.x, { rate: 1.25, volume: 0.8 });
    }
  }

  private isIrradiated(victim: Fighter): boolean {
    return this.irradiated.has(victim) || Date.now() < victim.healInvertedUntil;
  }

  private updateIrradiated(): void {
    // Online, a dose the opponent put on us arrives as a bare `healInvertedUntil` (relayed by
    // NetStatusSync) rather than through this kit. Adopt it, so the marker, the tray entry and the
    // "REJECTED" pop-up all show on the victim's own screen.
    const p = this.api.player;
    const mirrored = p ? p.healInvertedUntil - Date.now() : 0;
    if (p && mirrored > 0 && this.alive(p)
      && (this.irradiated.get(p)?.until ?? 0) < this.now + mirrored - 100) {
      this.irradiate(p, 'npc', mirrored, this.irradiated.has(p));
    }
    for (const [v, d] of [...this.irradiated]) {
      if (this.alive(v) && this.now < d.until) continue;
      this.irradiated.delete(v);
      if (v) { v.healInvertedUntil = 0; v.onHealInverted = null; }
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'radiation') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p) || this.stunned.has(p)) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown) p.castAbility('radiation-railgun', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('radiation-barrage', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('radiation-bunker', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('radiation-baton', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('radiation-extermination', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — a tracer, or a flare while the gun is out.
   *
   * Nothing here deals damage. The tracer is a delivery vehicle for a count, and the count is
   * the ability: three on one body and the kit fires the railgun itself.
   */
  doRailgun(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-railgun'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const flaring = !!s.flares && s.flares.ammo > 0;
    const m = this.muzzle(owner);
    const ang = Math.atan2(ty - m.y, tx - m.x);
    this.rounds.push({
      owner,
      kind: flaring ? 'flare' : 'tracer',
      x: m.x, y: m.y,
      vx: Math.cos(ang) * (flaring ? FLARE_SPEED : TRACER_SPEED),
      vy: Math.sin(ang) * (flaring ? FLARE_SPEED : TRACER_SPEED),
      ang,
      left: flaring ? FLARE_RANGE : TRACER_RANGE,
    });

    if (flaring && s.flares) {
      s.flares.ammo--;
      s.flares.inFlight++;
      Sfx.playAt('musket', f.x, { rate: 1.6, volume: 0.6 });
    }
    this.avatar(owner)?.play('punch', ang);
    this.avatar(owner)?.ping();
  }

  /**
   * E — open the sighting cone.
   *
   * Everything after this is `updateBarrage`: the cone has to follow the aim every frame, find a
   * target, hold it while it closes, and let go the instant they step out.
   */
  doBarrage(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-barrage'); return; }
    const s = this.side(owner);
    if (s.barrage) { this.refund(f, 'radiation-barrage'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    s.aimX = tx;
    s.aimY = ty;
    s.barrage = {
      startedAt: this.now,
      ang: Math.atan2(ty - f.y, tx - f.x),
      victim: null,
      lockedAt: 0,
      shotsLeft: 0,
      nextShotAt: 0,
    };
    this.avatar(owner)?.setHold('reach', s.barrage.ang);
    Sfx.playAt('sonic-pulse', f.x, { rate: 1.3, volume: 0.6 });
  }

  /** R — the bunker goes up where you are standing. A second one replaces the first. */
  doBunker(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-bunker'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    this.dropBunker(owner, true);
    const s = this.side(owner);
    s.bunker = {
      x: f.x, y: f.y, hp: BUNKER_HP,
      builtAt: this.now, until: this.now + BUNKER_MS,
      hit: 0, seed: Math.random() * 999,
    };
    this.installAbsorber(owner);
    this.avatar(owner)?.play('slam');
    this.fx(owner).bunkerRise(f.x, f.y, BUNKER_R);
    this.api.showFloatingText(f.x, f.y - 58, '☢ FALLOUT BUNKER', this.hex(RAD.neonLit));
    Sfx.playAt('quake', f.x, { rate: 1.4, volume: 0.6 });
    Sfx.playAt('shield-up', f.x, { rate: 0.8, volume: 0.8 });
    this.api.scene.cameras.main.shake(140, 0.004);
  }

  /**
   * F — strike with the rod.
   *
   * The branch is the ability: a clean target is dosed, a dosed one is hit twice as hard and
   * stunned. The rod is the one thing in the kit that wants the status to already be there.
   */
  doBaton(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-baton'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.aimX = tx;
    s.aimY = ty;

    let anyHot = false;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > ROD_REACH + BODY_R + this.swell(t)) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > ROD_ARC) continue;

      const hot = this.isIrradiated(t);
      anyHot = anyHot || hot;
      t.takeDamage(hot ? ROD_HOT_DAMAGE : ROD_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(hot ? RAD.hazard : RAD.neon));
      this.fx(owner).rodStrike(t.x, t.y, ang, hot);
      if (hot) this.stun(t, owner, ROD_STUN_MS);
      else this.irradiate(t, owner, ROD_DOSE_MS);
    }

    s.swing = { x: f.x, y: f.y, ang, start: this.now, hot: anyHot };
    this.avatar(owner)?.play('sweep', ang);
    Sfx.playAt('flail-swing', f.x, { rate: 0.8, volume: 0.9 });
    if (anyHot) Sfx.playAt('explosion-small', f.x, { rate: 1.3, volume: 0.6 });
  }

  /**
   * Q — the flare gun.
   *
   * The ultimate does nothing on its own. It hands over five rounds and twelve seconds, and the
   * payout arrives only if every single one of them lands on the same body.
   */
  doExtermination(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-extermination'); return; }
    const s = this.side(owner);
    if (s.flares) { this.refund(f, 'radiation-extermination'); return; }
    this.ensureLayers();
    this.ensureAvatars();

    s.flares = { ammo: FLARE_AMMO, hits: new Map(), inFlight: 0, expiresAt: this.now + FLARE_WINDOW_MS };
    this.avatar(owner)?.play('raise');
    this.avatar(owner)?.ping();
    this.api.showFloatingText(f.x, f.y - 58, `☢ ${FLARE_AMMO} FLARES · ONE TARGET`, this.hex(RAD.neon));
    Sfx.playAt('reload', f.x, { rate: 0.9, volume: 1 });
  }

  // ── Rounds in the air ──────────────────────────────────────────────────────

  private updateRounds(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.rounds.length - 1; i >= 0; i--) {
      const r = this.rounds[i];
      const step = Math.hypot(r.vx, r.vy) * dt;
      const fromX = r.x;
      const fromY = r.y;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.left -= step;

      const out = r.x < this.left || r.x > this.right || r.y < this.top || r.y > this.bottom;
      let landed: Fighter | null = null;
      const hitR = r.kind === 'tracer' ? TRACER_HIT_R : FLARE_HIT_R;
      for (const t of this.targetsOf(r.owner)) {
        const rr = hitR + 18 + this.swell(t);
        // Swept, not sampled: a tracer covers ~16px between two frames, so testing only where
        // it ended let it step clean over a body it went straight through.
        const near = nearestOnSegment(fromX, fromY, r.x, r.y, t.x, t.y);
        if (Phaser.Math.Distance.Between(near.x, near.y, t.x, t.y) > rr) continue;
        landed = t;
        break;
      }

      if (landed) {
        this.rounds.splice(i, 1);
        if (r.kind === 'tracer') this.onTracerHit(r.owner, landed);
        else this.onFlareHit(r.owner, landed);
        continue;
      }
      if (out || r.left <= 0) {
        this.rounds.splice(i, 1);
        if (r.kind === 'tracer') this.onTracerMiss(r.owner, r.x, r.y);
        else this.onFlareMiss(r.owner);
      }
    }
  }

  private onTracerHit(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    const n = (s.stuck.get(victim) ?? 0) + 1;
    this.fx(owner).stick(victim.x, victim.y);
    Sfx.playAt('nail', victim.x, { rate: 1 + n * 0.18, volume: 0.7 });

    if (n < TRACERS_TO_CONFIRM) {
      s.stuck.set(victim, n);
      this.api.showFloatingText(victim.x, victim.y - 40, `TRACER ${n}/${TRACERS_TO_CONFIRM}`, this.hex(RAD.hazard));
      return;
    }
    // Confirmed. The three are spent on the shot rather than left on the body, so the next
    // railgun costs another three clicks — the ability is a reload, not a stack.
    s.stuck.delete(victim);
    this.fireRailgun(owner, victim);
  }

  /**
   * A tracer that hit nothing scrubs the board — every tracer this side has planted, on every
   * body, falls off. The click is free, the confirm is not.
   */
  private onTracerMiss(owner: Owner, x: number, y: number): void {
    const s = this.side(owner);
    this.fx(owner).shed(x, y);
    if (!s.stuck.size) return;
    for (const [v] of s.stuck) this.fx(owner).shed(v.x, v.y - 8);
    s.stuck.clear();
    const f = this.fighter(owner);
    this.api.showFloatingText(f.x, f.y - 46, '✖ TRACERS LOST', this.hex(RAD.hazard));
    Sfx.playAt('status-expire', f.x, { rate: 1.2, volume: 0.8 });
  }

  /** The confirmed shot: hitscan from the muzzle, 50 damage, and a dose on the way out. */
  private fireRailgun(owner: Owner, victim: Fighter): void {
    const m = this.muzzle(owner);
    const ang = Math.atan2(victim.y - m.y, victim.x - m.x);
    this.fx(owner).rail(m.x, m.y, victim.x, victim.y);
    this.fx(owner).railHit(victim.x, victim.y, ang);
    this.avatar(owner)?.ping();

    victim.takeDamage(RAIL_DAMAGE);
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(RAD.core));
    this.irradiate(victim, owner, IRRADIATED_MS, true);
    this.api.showFloatingText(victim.x, victim.y - 62, '☢ CONFIRMED', this.hex(RAD.core));
    Sfx.playAt('beam-fire', victim.x, { rate: 0.85, volume: 1 });
    this.api.scene.cameras.main.shake(120, 0.004);
  }

  private onFlareHit(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    if (!s.flares) return;
    s.flares.inFlight = Math.max(0, s.flares.inFlight - 1);
    const n = (s.flares.hits.get(victim) ?? 0) + 1;
    s.flares.hits.set(victim, n);
    this.fx(owner).stick(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 44, `${n}/${FLARE_AMMO}`, this.hex(RAD.neonLit));
    Sfx.playAt('sparkle', victim.x, { rate: 0.9 + n * 0.12, volume: 0.7 });
    this.settleFlares(owner);
  }

  private onFlareMiss(owner: Owner): void {
    const s = this.side(owner);
    if (!s.flares) return;
    s.flares.inFlight = Math.max(0, s.flares.inFlight - 1);
    this.settleFlares(owner);
  }

  /**
   * Decide the ultimate, once the magazine is empty and the last round has resolved. Five on one
   * body calls the drop; anything else is simply gone.
   */
  private settleFlares(owner: Owner): void {
    const s = this.side(owner);
    const fl = s.flares;
    if (!fl || fl.ammo > 0 || fl.inFlight > 0) return;

    let confirmed = false;
    for (const [, n] of fl.hits) if (n >= FLARE_AMMO) confirmed = true;
    s.flares = null;

    const f = this.fighter(owner);
    if (!confirmed) {
      this.api.showFloatingText(f.x, f.y - 56, '✖ NO CONFIRMATION', this.hex(RAD.hazard));
      Sfx.playAt('ui-denied', f.x, { rate: 0.7, volume: 0.8 });
      return;
    }
    this.airdrop = {
      owner,
      x: this.api.width / 2,
      y: this.api.height / 2,
      landsAt: this.now + AIRDROP_TELL_MS,
    };
    this.api.showFloatingText(f.x, f.y - 70, '☢☢ AIRDROP INBOUND ☢☢', this.hex(RAD.core));
    Sfx.playAt('countdown-go', f.x, { rate: 0.55, volume: 1 });
    Sfx.playAt('train-horn', f.x, { rate: 0.7, volume: 0.9 });
    this.api.scene.cameras.main.shake(AIRDROP_TELL_MS, 0.0035);
  }

  private updateAirdrop(): void {
    const a = this.airdrop;
    if (!a) return;
    if (this.now < a.landsAt) return;
    this.airdrop = null;

    this.fx(a.owner).airdrop(a.x, a.y);
    this.api.scene.cameras.main.shake(1100, 0.026);
    this.api.scene.cameras.main.flash(360, 200, 255, 160);
    Sfx.playAt('explosion-large', a.x, { rate: 0.55, volume: 1 });
    Sfx.playAt('quake', a.x, { rate: 0.6, volume: 1 });

    for (const t of this.targetsOf(a.owner)) {
      t.takeDamage(AIRDROP_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(a.owner)(RAD.core));
      this.irradiate(t, a.owner, IRRADIATED_MS, true);
    }
    // "Everyone on screen" includes the caster. The self-hit goes through the self-damage route
    // so a shield can't be spent dodging your own bomb — but a caster inside their own bunker is
    // exactly what the bunker is for: it takes the drop, and comes down doing it.
    const caster = this.fighter(a.owner);
    if (!this.alive(caster)) return;
    if (this.sheltered(a.owner)) {
      this.api.showFloatingText(caster.x, caster.y - 60, '☢ THE BUNKER HELD', this.hex(RAD.neonLit));
      this.breakBunker(a.owner);
      return;
    }
    caster.applySelfDamage(AIRDROP_DAMAGE);
    this.api.showFloatingText(caster.x, caster.y - 60, '☢ EXTERMINATED', this.hex(RAD.hazard));
  }

  /** The gun goes back in the holster when the window runs out, spent rounds or not. */
  private updateFlareWindow(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const fl = s.flares;
      if (!fl || this.now < fl.expiresAt) continue;
      s.flares = null;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      this.api.showFloatingText(f.x, f.y - 56, '✖ FLARES EXPIRED', this.hex(RAD.hazard));
      Sfx.playAt('status-expire', f.x, { rate: 0.9, volume: 0.75 });
    }
  }

  // ── Barrage ────────────────────────────────────────────────────────────────

  /** The cone's current half-width, in radians. */
  private coneHalf(b: Barrage): number {
    const k = b.victim ? Phaser.Math.Clamp((this.now - b.lockedAt) / BARRAGE_LOCK_MS, 0, 1) : 0;
    return (Phaser.Math.Linear(BARRAGE_OPEN_DEG, BARRAGE_CLOSED_DEG, k) / 2) * DEG;
  }

  private lockProgress(b: Barrage): number {
    return b.victim ? Phaser.Math.Clamp((this.now - b.lockedAt) / BARRAGE_LOCK_MS, 0, 1) : 0;
  }

  /** Whether a body is inside the cone right now — its middle, not its edge. */
  private inCone(owner: Owner, b: Barrage, t: Fighter): boolean {
    const f = this.fighter(owner);
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    if (d > BARRAGE_RANGE + BARRAGE_BODY_R) return false;
    const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - b.ang));
    return off <= this.coneHalf(b) + Math.atan2(BARRAGE_BODY_R, Math.max(1, d));
  }

  /**
   * Where the cone is pointing this frame.
   *
   * The player's cone is their cursor. The bot's swings toward its target at a capped rate with
   * its difficulty's aim error riding on it, so a strafing player can genuinely walk out of it.
   * Online, the npc is somebody else's cursor — relayed as their facing.
   */
  private aimCone(owner: Owner, b: Barrage, dt: number): void {
    const f = this.fighter(owner);
    if (owner === 'player') {
      const s = this.side(owner);
      b.ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      // Relayed to the peer as the facing angle, which is how their replica's cone follows ours.
      f.facingAngle = b.ang;
      return;
    }
    if (this.api.isOnline) { b.ang = f.facingAngle; return; }
    const t = b.victim ?? this.nearestTarget(owner);
    if (!t) return;
    const wobble = Math.sin(this.vizT * 1.7) * this.api.npcAimOffsetDeg * DEG * 0.6;
    const want = Math.atan2(t.y - f.y, t.x - f.x) + wobble;
    const diff = Phaser.Math.Angle.Wrap(want - b.ang);
    const step = NPC_CONE_TURN * dt;
    b.ang = Phaser.Math.Angle.Wrap(b.ang + Phaser.Math.Clamp(diff, -step, step));
  }

  private updateBarrage(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const b = s.barrage;
      if (!b) continue;
      const f = this.fighter(owner);
      const av = this.avatar(owner);
      if (!this.alive(f) || this.stunned.has(f)) { this.endBarrage(owner, 'quiet'); continue; }

      // ── The burst ──
      if (b.shotsLeft > 0) {
        if (this.now < b.nextShotAt) continue;
        const v = b.victim;
        if (!v || !this.alive(v)) { this.endBarrage(owner, 'quiet'); continue; }
        this.fireBarrageRound(owner, v, BARRAGE_SHOTS - b.shotsLeft);
        b.shotsLeft--;
        b.nextShotAt = this.now + BARRAGE_SHOT_GAP;
        if (b.shotsLeft <= 0) this.endBarrage(owner, 'quiet');
        continue;
      }

      // ── The cone ──
      this.aimCone(owner, b, delta / 1000);
      av?.setHold('reach', b.ang);

      if (!b.victim) {
        // Close on the nearest body inside the cone, if there is one.
        let best: Fighter | null = null;
        let bestD = Infinity;
        for (const t of this.targetsOf(owner)) {
          if (!this.inCone(owner, b, t)) continue;
          const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
          if (d < bestD) { bestD = d; best = t; }
        }
        if (best) {
          b.victim = best;
          b.lockedAt = this.now;
          this.api.showFloatingText(best.x, best.y - 50, '◎ LOCKING', this.hex(RAD.neonLit));
          Sfx.playAt('ui-click', best.x, { rate: 0.8, volume: 0.8 });
        } else if (this.now - b.startedAt >= BARRAGE_SEEK_MS) {
          this.endBarrage(owner, 'nothing');
        }
        continue;
      }

      if (!this.alive(b.victim) || !this.inCone(owner, b, b.victim)) {
        this.endBarrage(owner, 'lost');
        continue;
      }
      if (this.lockProgress(b) < 1) continue;
      // Closed. The cone is spent and the burst begins on the next frame.
      b.shotsLeft = BARRAGE_SHOTS;
      b.nextShotAt = this.now;
      av?.setHold(null);
      this.api.showFloatingText(b.victim.x, b.victim.y - 54, '☢ BARRAGE', this.hex(RAD.hazard));
    }
  }

  /** One round of the burst: hitscan from the hand to wherever the target is right now. */
  private fireBarrageRound(owner: Owner, victim: Fighter, i: number): void {
    const m = this.muzzle(owner);
    const ang = Math.atan2(victim.y - m.y, victim.x - m.x);
    // A little scatter on the drawn end so five rounds read as five, not one thick line.
    const jx = victim.x + (Math.random() - 0.5) * 10;
    const jy = victim.y + (Math.random() - 0.5) * 10;
    this.fx(owner).pistolShot(m.x, m.y, jx, jy);
    this.avatar(owner)?.play('punch', ang, 90);
    const hot = this.isIrradiated(victim);
    victim.takeDamage(hot ? BARRAGE_HOT_DAMAGE : BARRAGE_DAMAGE);
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(hot ? RAD.hazard : RAD.neon));
    Sfx.playAt('musket', victim.x, { rate: 1.5 + i * 0.06, volume: 0.55 });
  }

  private endBarrage(owner: Owner, why: 'quiet' | 'lost' | 'nothing'): void {
    const s = this.side(owner);
    const b = s.barrage;
    if (!b) return;
    s.barrage = null;
    this.avatar(owner)?.setHold(null);
    if (why === 'quiet') return;
    const f = this.fighter(owner);
    this.fx(owner).lockLost(f.x, f.y, b.ang, this.coneHalf(b), BARRAGE_RANGE);
    this.api.showFloatingText(f.x, f.y - 50, why === 'lost' ? '✖ LOCK LOST' : '✖ NO TARGET',
      this.hex(RAD.hazard));
    Sfx.playAt('status-expire', f.x, { rate: 1.3, volume: 0.7 });
  }

  // ── Fallout Bunker ─────────────────────────────────────────────────────────

  /** True while that side has a standing bunker and is inside it. */
  private sheltered(owner: Owner): boolean {
    const bk = this.side(owner).bunker;
    if (!bk || bk.hp <= 0) return false;
    const f = this.fighter(owner);
    return this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, bk.x, bk.y) < BUNKER_R;
  }

  /**
   * Claim the fighter's absorber slot for the bunker. It is a single slot shared with Time's
   * Remain and Air's dodge, so the bunker chains: a hit taken outside the walls falls through to
   * whatever was there before.
   */
  private installAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.absorber) return;
    const prev = f.damageAbsorber;
    const mine = (amount: number): boolean => {
      if (this.sheltered(owner)) {
        this.damageBunker(owner, amount, f.x, f.y - 24);
        return true;
      }
      return prev ? prev(amount) : false;
    };
    s.prevAbsorber = prev;
    s.absorber = mine;
    f.damageAbsorber = mine;
  }

  private damageBunker(owner: Owner, amount: number, x: number, y: number): void {
    const bk = this.side(owner).bunker;
    if (!bk || bk.hp <= 0) return;
    const dmg = Math.max(0, Math.round(amount));
    bk.hp -= dmg;
    bk.hit = 1;
    if (dmg > 0) this.api.showFloatingText(x, y, `🛡 ${dmg}`, this.hex(RAD.leadLit));
    Sfx.playAt('hit-light', x, { rate: 0.7, volume: 0.6 });
    if (bk.hp <= 0) this.breakBunker(owner);
  }

  private breakBunker(owner: Owner): void {
    const bk = this.side(owner).bunker;
    if (!bk) return;
    this.fx(owner).bunkerBreak(bk.x, bk.y, BUNKER_R);
    this.api.showFloatingText(bk.x, bk.y - BUNKER_R - 20, '✖ BUNKER DOWN', this.hex(RAD.hazard));
    Sfx.playAt('explosion-small', bk.x, { rate: 0.8, volume: 0.9 });
    this.api.scene.cameras.main.shake(160, 0.005);
    this.dropBunker(owner, true);
  }

  /** Take the bunker away and hand the absorber slot back if nobody has claimed it since. */
  private dropBunker(owner: Owner, silent = false): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.absorber && f && f.damageAbsorber === s.absorber) f.damageAbsorber = s.prevAbsorber;
    s.absorber = null;
    s.prevAbsorber = null;
    const bk = s.bunker;
    s.bunker = null;
    if (!bk || silent) return;
    this.fx(owner).bunkerBreak(bk.x, bk.y, BUNKER_R);
    Sfx.playAt('status-expire', bk.x, { rate: 0.8, volume: 0.6 });
  }

  /**
   * Per frame: expire, hold enemies outside the wall, and stop enemy shots in it.
   *
   * Runs after both movement paths, so the push is the last word on an enemy's position — the
   * same arrangement every other wall in the game relies on.
   */
  private updateBunkers(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const bk = s.bunker;
      if (!bk) continue;
      bk.hit = Math.max(0, bk.hit - delta / 220);
      const self = this.fighter(owner);
      if (!this.alive(self) || this.now >= bk.until) { this.dropBunker(owner); continue; }

      // The bot sits its own airdrop out inside the walls: its chase would otherwise walk it
      // straight back out between casting the bunker and the drop landing. Written after both
      // movement paths, so it is the last word on the bot's velocity this frame.
      if (owner === 'npc' && !this.api.isOnline && this.airdrop?.owner === 'npc') {
        const d = Phaser.Math.Distance.Between(self.x, self.y, bk.x, bk.y);
        const v = this.body(self);
        if (v) {
          if (d > BUNKER_R * 0.4) {
            const a = Math.atan2(bk.y - self.y, bk.x - self.x);
            v.setVelocity(Math.cos(a) * 220, Math.sin(a) * 220);
          } else v.setVelocity(0, 0);
        }
      }

      // ── Enemies stay out ──
      const hold = BUNKER_R + BUNKER_BODY_R;
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(bk.x, bk.y, t.x, t.y);
        if (d >= hold) continue;
        const a = d < 0.5 ? Math.random() * TAU : Math.atan2(t.y - bk.y, t.x - bk.x);
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        t.setPosition(bk.x + ux * hold, bk.y + uy * hold);
        const v = this.body(t);
        if (v) {
          // Strip only the inward component, so they slide round the wall rather than stick.
          const inward = v.velocity.x * ux + v.velocity.y * uy;
          if (inward < 0) v.setVelocity(v.velocity.x - inward * ux, v.velocity.y - inward * uy);
        }
      }

      // ── Enemy shots stop in the wall ──
      const group = this.api.projectiles;
      if (group) {
        for (const go of group.getChildren()) {
          const p = go as Projectile;
          if (!p.active) continue;
          if (p.isFromPlayer === (owner === 'player')) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, bk.x, bk.y) > BUNKER_R + 6) continue;
          p.setActive(false).setVisible(false);
          this.fx(owner).bunkerHit(p.x, p.y, Math.atan2(p.y - bk.y, p.x - bk.x));
          this.damageBunker(owner, p.damage ?? 0, p.x, p.y);
          if (!s.bunker) break;
        }
      }
      if (owner === 'player' && s.bunker) {
        for (let i = 0; i < 6 && s.bunker && this.api.blockHuskShot(bk.x, bk.y, BUNKER_R + 6); i++) {
          this.fx(owner).bunkerHit(bk.x, bk.y - BUNKER_R, -Math.PI / 2);
          this.damageBunker(owner, BUNKER_HUSK_SHOT, bk.x, bk.y - BUNKER_R);
        }
      }
    }
  }

  // ── Stun ───────────────────────────────────────────────────────────────────

  private stun(victim: Fighter, by: Owner, ms: number): void {
    if (victim.unstoppable) {
      this.api.showFloatingText(victim.x, victim.y - 50, 'UNSTOPPABLE', this.hex(RAD.hazard));
      return;
    }
    this.stunned.set(victim, Math.max(this.stunned.get(victim) ?? 0, this.now + ms));
    victim.applyDisarm(ms);
    this.fx(by).stick(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 52, '⚡ STUNNED', this.hex(RAD.hazard));
    Sfx.playAt('status-stun', victim.x, { rate: 0.85, volume: 0.9 });
  }

  private updateStuns(): void {
    for (const [v, until] of [...this.stunned]) {
      if (!this.alive(v) || this.now >= until || v.unstoppable) { this.stunned.delete(v); continue; }
      this.body(v)?.setVelocity(0, 0);
      v.disarmedUntil = Math.max(v.disarmedUntil, Date.now() + 120);
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isRadiation('player');
    const npcIs = this.isRadiation('npc');
    const anyState = this.rounds.length || this.irradiated.size || this.stunned.size || this.airdrop
      || this.sides.player.bunker || this.sides.npc.bunker;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.updateRounds(delta);
    this.updateBarrage(delta);
    this.updateIrradiated();
    this.updateStuns();
    this.updateBunkers(delta);
    this.updateFlareWindow();
    this.updateAirdrop();

    this.paintGround();
    this.paintAir();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const owner of BOTH) {
      const bk = this.side(owner).bunker;
      if (!bk) continue;
      const fade = Phaser.Math.Clamp((bk.until - this.now) / 500, 0, 1);
      falloutBunker(g, this.col(owner), bk.x, bk.y, BUNKER_R, 0.95 * fade, this.vizT, {
        hp: bk.hp / BUNKER_HP,
        built: Phaser.Math.Clamp((this.now - bk.builtAt) / BUNKER_BUILD_MS, 0, 1),
        occupied: this.sheltered(owner),
        hit: bk.hit,
        seed: bk.seed,
      });
    }

    const a = this.airdrop;
    if (a) {
      const k = Phaser.Math.Clamp(1 - (a.landsAt - this.now) / AIRDROP_TELL_MS, 0, 1);
      const r = Math.max(this.api.width, this.api.height) * 0.62;
      dropFootprint(g, this.col(a.owner), a.x, a.y, r, 0.95, k, this.vizT);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── Barrage cones and their lock ──
    for (const owner of BOTH) {
      const b = this.side(owner).barrage;
      if (!b || b.shotsLeft > 0) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const tint = this.col(owner);
      const lock = this.lockProgress(b);
      barrageCone(g, tint, f.x, f.y, b.ang, this.coneHalf(b), BARRAGE_RANGE, 0.9, this.vizT,
        { lock, locked: !!b.victim });
      if (b.victim && this.alive(b.victim)) lockReticle(g, tint, b.victim.x, b.victim.y, lock, 0.95, this.vizT);
    }

    // ── Rounds in the air ──
    for (const r of this.rounds) {
      const tint = this.col(r.owner);
      if (r.kind === 'flare') flareRound(g, tint, r.x, r.y, r.ang, 1, this.vizT);
      else geigerTracer(g, tint, r.x, r.y, r.ang + this.vizT * 9, 1, { lamp: 0.5 });
    }

    // ── Tracers clamped to a body, and the confirm pips over its head ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      const tint = this.col(owner);
      for (const [v, n] of s.stuck) {
        if (!this.alive(v)) continue;
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(this.vizT * (3 + n * 2.6)));
        for (let i = 0; i < n; i++) {
          const a = this.vizT * 1.6 + (i / TRACERS_TO_CONFIRM) * TAU;
          geigerTracer(g, tint, v.x + Math.cos(a) * 20, v.y + Math.sin(a) * 20 - 2,
            a + Math.PI / 2, 0.95, { lamp: blink, legs: true, scale: 0.85 });
        }
        this.pips(g, tint, v.x, v.y - 46, n, TRACERS_TO_CONFIRM, blink);
      }
    }

    // ── Flare tallies ──
    for (const owner of BOTH) {
      const fl = this.side(owner).flares;
      if (!fl) continue;
      const tint = this.col(owner);
      for (const [v, n] of fl.hits) {
        if (!this.alive(v)) continue;
        this.pips(g, tint, v.x, v.y - 54, n, FLARE_AMMO, 0.9);
      }
      // The magazine, over the shooter's own head.
      const f = this.fighter(owner);
      if (this.alive(f)) this.pips(g, tint, f.x, f.y - 44, fl.ammo, FLARE_AMMO, 0.85);
    }

    // ── The rod, mid-swing ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.swing) continue;
      const t = (this.now - s.swing.start) / ROD_SWING_MS;
      if (t >= 1) { s.swing = null; continue; }
      const f = this.fighter(owner);
      const ox = this.alive(f) ? f.x : s.swing.x;
      const oy = this.alive(f) ? f.y : s.swing.y;
      // Brought down hard across the strike, easing out at the far edge of the arc.
      const e = 1 - (1 - t) * (1 - t);
      const a = s.swing.ang - ROD_ARC + e * ROD_ARC * 2;
      const tint = this.col(owner);
      // A faint trail of where the rod has been this swing.
      g.lineStyle(10, tint(s.swing.hot ? RAD.hazard : RAD.neon), 0.18 * (1 - t));
      g.beginPath();
      g.arc(ox, oy, ROD_REACH * 0.85, s.swing.ang - ROD_ARC, a, false);
      g.strokePath();
      uraniumRod(g, tint, ox + Math.cos(a) * 14, oy + Math.sin(a) * 14,
        ox + Math.cos(a) * ROD_REACH, oy + Math.sin(a) * ROD_REACH, 1 - t * 0.3, this.vizT,
        { heat: s.swing.hot ? 1 : 0.3 });
    }

    // ── Irradiated markers ──
    for (const [v, d] of this.irradiated) {
      if (!this.alive(v)) continue;
      const left = Phaser.Math.Clamp((d.until - this.now) / Math.max(1, d.full), 0, 1);
      const tint = this.col(d.by);
      trefoil(g, tint, v.x, v.y - 34, 6.5, 0.55 + 0.35 * Math.sin(this.vizT * 5),
        { phase: this.vizT * 1.6, color: RAD.neonLit });
      g.fillStyle(tint(RAD.neonDeep), 0.5);
      g.fillRect(v.x - 15, v.y - 26, 30, 2.4);
      g.fillStyle(tint(RAD.neon), 0.95);
      g.fillRect(v.x - 15, v.y - 26, 30 * left, 2.4);
    }
  }

  /** A row of filled/empty lozenges — the one counter shape the element uses everywhere. */
  private pips(
    g: Phaser.GameObjects.Graphics, tint: RadiationColorFn,
    x: number, y: number, filled: number, total: number, glow: number,
  ): void {
    const w = 8;
    const gap = 3;
    const span = total * w + (total - 1) * gap;
    for (let i = 0; i < total; i++) {
      const px = x - span / 2 + w / 2 + i * (w + gap);
      const on = i < filled;
      g.fillStyle(tint(RAD.ink), 0.75);
      g.fillRect(px - w / 2 - 1, y - 4, w + 2, 8);
      g.fillStyle(tint(on ? RAD.neon : RAD.leadDeep), on ? 0.55 + glow * 0.45 : 0.85);
      g.fillRect(px - w / 2, y - 3, w, 6);
      if (on) {
        g.fillStyle(tint(RAD.core), 0.5 + glow * 0.5);
        g.fillRect(px - w / 2 + 1.6, y - 1.4, w - 3.2, 2.8);
      }
    }
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      const b = s.barrage;
      av.setFacing(b && !b.shotsLeft ? b.ang : Math.atan2(s.aimY - f.y, s.aimX - f.x));
      // The suit runs warm at rest and hot while a lock is closing.
      av.setDose(b ? 0.5 + this.lockProgress(b) * 0.5 : 0.5);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const p = this.api.player;
    const s = this.sides.player;

    const dose = this.irradiated.get(p);
    this.api.setStatusIndicator('radiation-irradiated', dose ? {
      name: 'Irradiated', emoji: '☢️', color: RAD.neon, priority: 5,
      description: 'Every point of healing aimed at you from any source lands as damage instead. Radiation\'s Barrage hits you for 8 a round instead of 5, and its Rod Baton stuns you.',
      until: dose.until,
    } : null);

    const b = s.barrage;
    this.api.setStatusIndicator('radiation-barrage', playerIs && b && !b.shotsLeft ? {
      name: 'Barrage', emoji: '🎯', color: RAD.hazard, priority: 141,
      description: b.victim
        ? `Locking. Keep them inside the cone while it closes from ${BARRAGE_OPEN_DEG}° to ${BARRAGE_CLOSED_DEG}° — if they get out, the lock is lost.`
        : 'The cone is open. Put an enemy inside it to start the lock.',
      count: Math.round(this.lockProgress(b) * 100), suffix: '%',
    } : null);

    const bk = s.bunker;
    this.api.setStatusIndicator('radiation-bunker', playerIs && bk ? {
      name: 'Fallout Bunker', emoji: '🛡️', color: RAD.neonLit, priority: 140,
      description: this.sheltered('player')
        ? 'You are inside. Nothing can hurt you — every hit lands on the bunker instead. Enemy shots stop in the wall and enemies cannot get in.'
        : 'Your bunker is standing. Get back inside it to be safe.',
      count: Math.max(0, Math.ceil(bk.hp)), suffix: ' HP',
      until: bk.until,
    } : null);

    const fl = s.flares;
    this.api.setStatusIndicator('radiation-flares', playerIs && fl ? {
      name: 'Extermination', emoji: '🔫', color: RAD.neon, priority: 142,
      description: 'The flare gun is out. Every one of these rounds has to land on the same enemy — five on one body calls the airdrop, and anything else calls nothing at all.',
      until: fl.expiresAt, count: fl.ammo,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** A full stop for a body the rod has stunned. */
  getPlayerSpeedMult(): number {
    return this.stunned.has(this.api.player) ? 0 : 1;
  }

  getNpcSpeedMult(): number {
    return this.stunned.has(this.api.npc) ? 0 : 1;
  }

  /** Tracers already on the bot's target — the AI's cue for how badly a miss would hurt. */
  tracersOn(owner: Owner): number {
    const t = this.nearestTarget(owner);
    return t ? (this.side(owner).stuck.get(t) ?? 0) : 0;
  }

  /** True while that side has the flare gun out and rounds left to place. */
  flaresOut(owner: Owner): boolean {
    return !!this.side(owner).flares;
  }

  /** True while that side's Barrage cone is open or its burst is still firing. */
  isBarraging(owner: Owner): boolean {
    return !!this.side(owner).barrage;
  }

  /**
   * Whether the bot's target is already carrying a dose. That is the whole of two synergies: the
   * rod stops dosing and starts stunning, and Barrage's rounds go from 5 to 8.
   */
  targetIrradiated(owner: Owner): boolean {
    const t = this.nearestTarget(owner);
    return !!t && this.isIrradiated(t);
  }

  /** Whether the bot's target is stunned — the moment a Barrage lock cannot be walked out of. */
  targetStunned(owner: Owner): boolean {
    const t = this.nearestTarget(owner);
    return !!t && this.stunned.has(t);
  }

  /**
   * The airdrop synergy: that side's own airdrop is falling and they are not inside a bunker.
   * A bunker standing round them when it lands takes the self-hit for them.
   */
  needsCover(owner: Owner): boolean {
    return !!this.airdrop && this.airdrop.owner === owner && !this.sheltered(owner);
  }

  /** True while that side is inside its own standing bunker. */
  isSheltered(owner: Owner): boolean {
    return this.sheltered(owner);
  }
}
