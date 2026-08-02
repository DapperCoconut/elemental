import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  RAD, RadiationAvatar, RadiationColorFn, RadiationFx, boneOverlay, dropFootprint,
  flareRound, geigerTracer, radPuddle, trefoil, wasteDrum,
} from './RadiationVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

// ── Critical Mission (passive) ───────────────────────────────────────────────
/** How long each tier of the buff lasts before both halves are halved again. */
const HALVE_MS = 12_000;
const SPEED_BONUS = 0.5;
const DAMAGE_BONUS = 0.25;
/**
 * Tiers past this are worth less than a percent and only cost float precision, so the ladder
 * simply stops — the character is spent, which is the point of the passive.
 */
const MAX_TIERS = 8;

// ── Irradiated ───────────────────────────────────────────────────────────────
const IRRADIATED_MS = 10_000;

// ── Radiation Railgun (Click) ────────────────────────────────────────────────
const TRACERS_TO_CONFIRM = 3;
const TRACER_SPEED = 950;
const TRACER_HIT_R = 17;
const TRACER_RANGE = 700;
const RAIL_DAMAGE = 50;

// ── Rod Baton (E) ────────────────────────────────────────────────────────────
const BATON_DAMAGE = 15;
const BATON_REACH = 104;
/** Half-angle of the swing. A little over a right angle in total. */
const BATON_ARC = 0.95;
const BATON_DASH_SPEED = 760;
const BATON_DASH_MS = 190;
const BATON_STUN_MS = 1500;

// ── X-Ray Vision (R) ─────────────────────────────────────────────────────────
const XRAY_MS = 8000;
const XRAY_HITBOX = 1.25;

// ── Waste Disposal (F) ───────────────────────────────────────────────────────
const DRUM_SPEED = 340;
const DRUM_TRAVEL_MS = 520;
const DRUM_BLAST_R = 132;
const DRUM_DAMAGE = 30;
const KNOCK_SPEED = 620;
const KNOCK_MS = 720;
const PUDDLE_COUNT = 7;
const PUDDLE_R = 42;
const PUDDLE_BLAST_R = 74;
const PUDDLE_BLAST_DAMAGE = 15;
/** Gap between two puddle snipes. Seven of these is just under a second of shooting. */
const PUDDLE_SHOT_GAP = 120;
/** Per victim, per puddle — standing in one is a dose every second, not every frame. */
const PUDDLE_DOSE_GAP = 1000;

// ── Extermination (Q) ────────────────────────────────────────────────────────
const FLARE_AMMO = 5;
const FLARE_SPEED = 1350;
const FLARE_HIT_R = 15;
const FLARE_RANGE = 900;
/** How long the flare gun stays out. Run it dry or it goes back in the holster. */
const FLARE_WINDOW_MS = 12_000;
const AIRDROP_TELL_MS = 1700;
const AIRDROP_DAMAGE = 200;

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
  seed: number;
}

/** A puddle of waste on the floor, waiting to be shot. */
interface Puddle {
  owner: Owner;
  x: number;
  y: number;
  r: number;
  seed: number;
  /** Per-victim throttle for the walk-in dose. */
  dosed: Map<Fighter, number>;
}

/** Waste Disposal's three acts: the drum, the fall, and the clean-up. */
interface Waste {
  phase: 'drum' | 'knock' | 'sweep';
  x: number;
  y: number;
  vx: number;
  vy: number;
  roll: number;
  /** When the current phase ends (`drum`/`knock`) — unused by `sweep`, which counts puddles. */
  endsAt: number;
  /** Direction the caster is being thrown, latched at the blast. */
  kx: number;
  ky: number;
  nextShotAt: number;
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

/** One swing of the baton, purely for the arc that gets drawn behind the hit. */
interface Swing {
  x: number;
  y: number;
  ang: number;
  start: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** Game-clock time the mission started, i.e. when this side's buff ladder began. */
  startedAt: number;
  /** Last tier announced, so the halving gets exactly one pop-up rather than one per frame. */
  lastTier: number;
  /** Tracers currently clamped to a body, by victim. Cleared wholesale by a miss. */
  stuck: Map<Fighter, number>;
  xrayUntil: number;
  waste: Waste | null;
  flares: Flares | null;
  swing: Swing | null;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, startedAt: 0, lastTier: 0, stuck: new Map(),
    xrayUntil: 0, waste: null, flares: null, swing: null,
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
  /** Waste Disposal throws the player's own body, so WASD has to stand down for the fall. */
  get isDodging(): boolean;
  set isDodging(v: boolean);
  /** Skins: maps a Radiation visual colour through that side's equipped skin. */
  radiationColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── RadiationKit ─────────────────────────────────────────────────────────────

/**
 * Radiation.
 *
 * Two mechanisms, and every ability is one of them wearing a different hat.
 *
 * The first is the **clock**. Critical Mission opens the match at +50% speed and +25% damage and
 * then halves both every twelve seconds, forever. Nothing in the kit refreshes it, nothing
 * extends it, and there is no way to spend anything to get it back — the element is a fuse, and
 * the only correct way to play it is to be finished before it burns out. That single fact is why
 * the numbers here are as large as they are: 50 on a confirmed railgun and 200 on the airdrop are
 * affordable precisely because the man delivering them is getting weaker while he does it.
 *
 * The second is the **chain**. The click does no damage; it plants a tracer. Three tracers on one
 * body confirm a shot the kit fires itself, and a single tracer that hits nothing scrubs the whole
 * board. The Q is the same shape with the stakes moved: five flares into one enemy calls the
 * airdrop, four flares and one stray does nothing at all. Neither of these is a rotation — both
 * are procedures, and both of them fail loudly rather than quietly, which is the only way a
 * combo element stays honest.
 *
 * The status the element sells is **irradiated**, a ten-second window in which every heal aimed at
 * the victim lands as a hit instead. It is applied by four of the five abilities and by simply
 * standing in the wrong puddle, it stacks with nothing, and it is worth exactly as much as the
 * healing the victim was going to do — which against some elements is everything and against
 * others is nothing at all.
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
  /** Puddles and the airdrop's footprint — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Skeletons, drawn over the bodies they belong to so an invisible enemy still shows. */
  private boneGfx: Phaser.GameObjects.Graphics | null = null;
  /** Rounds in the air, stuck tracers, the drum and the tracer pips — over everything. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The X-ray wash. Screen-space, so it survives anything that moves the camera. */
  private tintRect: Phaser.GameObjects.Rectangle | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private rounds: Round[] = [];
  private puddles: Puddle[] = [];
  private airdrop: Airdrop | null = null;
  /** Victim → when the dose wears off, and who gave it to them. */
  private irradiated = new Map<Fighter, { until: number; by: Owner }>();
  /** Victim → game-clock expiry of a baton stun. */
  private stunned = new Map<Fighter, number>();
  /** Everything this kit has written an outgoing multiplier onto, and what it last wrote. */
  private appliedOut = new Map<Fighter, number>();
  /** Everything currently wearing an inflated hitbox, so it can always be handed back. */
  private swollen = new Set<Fighter>();

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

  /** Everything this kit ever writes a field on, so a stale multiplier can always be cleared. */
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

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const f of this.allFighters()) {
      if (!f) continue;
      f.healInvertedUntil = 0;
      f.onHealInverted = null;
      this.shrink(f);
    }
    // The outgoing multiplier is shared with half a dozen other systems, so it is handed back
    // by dividing out exactly what this kit put in rather than by writing 1 over the top.
    for (const [f] of this.appliedOut) this.setOutgoing(f, 1);
    this.appliedOut.clear();
    this.swollen.clear();

    this.releaseBody('player');
    this.releaseBody('npc');
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.rounds = [];
    this.puddles = [];
    this.airdrop = null;
    this.irradiated.clear();
    this.stunned.clear();
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.boneGfx?.destroy(); this.boneGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.tintRect?.destroy(); this.tintRect = null;

    this.api.setStatusIndicator('radiation-mission', null);
    this.api.setStatusIndicator('radiation-irradiated', null);
    this.api.setStatusIndicator('radiation-xray', null);
    this.api.setStatusIndicator('radiation-flares', null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5. Puddles go under them, skeletons directly over them (an X-ray
    // that renders behind a body is no X-ray at all), and everything airborne well above.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.boneGfx) this.boneGfx = scene.add.graphics().setDepth(6.5);
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

  // ── Critical Mission ───────────────────────────────────────────────────────

  /** How many times the buff has already been halved on that side. */
  private tier(owner: Owner): number {
    const s = this.side(owner);
    if (!s.startedAt) return 0;
    return Math.min(MAX_TIERS, Math.floor((this.now - s.startedAt) / HALVE_MS));
  }

  /** What is left of the opening buff, 0–1. Feeds the seams on the suit as well as the numbers. */
  private charge(owner: Owner): number {
    return this.isRadiation(owner) ? 0.5 ** this.tier(owner) : 0;
  }

  /**
   * Nudge a fighter's shared outgoing multiplier to `mult` by dividing out whatever this kit
   * last put there. Writing the value straight in would silently delete a Lust payload or a
   * gauntlet card that happened to be running on the same body.
   */
  private setOutgoing(f: Fighter, mult: number): void {
    const prev = this.appliedOut.get(f) ?? 1;
    if (Math.abs(prev - mult) < 0.0005) return;
    f.outgoingDamageMult = (f.outgoingDamageMult / prev) * mult;
    if (Math.abs(mult - 1) < 0.0005) this.appliedOut.delete(f);
    else this.appliedOut.set(f, mult);
  }

  private updateMission(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isRadiation(owner) || !this.alive(f)) {
        if (f) this.setOutgoing(f, 1);
        continue;
      }
      if (!s.startedAt) s.startedAt = this.now;
      const before = Math.min(MAX_TIERS, Math.max(0, Math.floor((this.now - s.startedAt) / HALVE_MS)));
      this.setOutgoing(f, 1 + DAMAGE_BONUS * this.charge(owner));
      // The tell for the halving is drawn where the buff lives — on the suit — plus one
      // pop-up, because a silent nerf every twelve seconds is a bug as far as the player
      // is concerned.
      if (before > s.lastTier) {
        s.lastTier = before;
        this.fx(owner).dose(f.x, f.y);
        this.api.showFloatingText(f.x, f.y - 54,
          `☢ DOSE SPENT · ${Math.round(this.charge(owner) * 100)}%`, this.hex(RAD.hazard));
        Sfx.playAt('status-expire', f.x, { rate: 0.75, volume: 0.7 });
      }
    }
  }

  // ── Irradiated ─────────────────────────────────────────────────────────────

  /**
   * Put a dose on someone. Refreshes rather than stacks — the value of the status is the window
   * it holds open, and a stacking version would simply be a longer window with extra bookkeeping.
   */
  private irradiate(victim: Fighter, by: Owner, quiet = false): void {
    if (!this.alive(victim)) return;
    const fresh = !this.irradiated.has(victim);
    this.irradiated.set(victim, { until: this.now + IRRADIATED_MS, by });
    victim.healInvertedUntil = Date.now() + IRRADIATED_MS;
    // The inversion is silent inside `Fighter.heal`, and a heal that quietly hurt would read as
    // a bug — so the pop-up is hung off the fighter for as long as the dose lasts.
    victim.onHealInverted = (harm) => {
      this.api.showFloatingText(victim.x, victim.y - 40, `☢ ${harm} REJECTED`, this.hex(RAD.neon));
    };
    if (quiet) return;
    this.fx(by).dose(victim.x, victim.y);
    if (fresh) {
      this.api.showFloatingText(victim.x, victim.y - 48, '☢ IRRADIATED', this.hex(RAD.neon));
      Sfx.playAt('status-poison', victim.x, { rate: 1.25, volume: 0.75 });
    }
  }

  private updateIrradiated(): void {
    for (const [v, d] of [...this.irradiated]) {
      if (!this.alive(v) || this.now >= d.until) {
        this.irradiated.delete(v);
        if (v) { v.healInvertedUntil = 0; v.onHealInverted = null; }
      }
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
    // A body being thrown by its own drum is not taking orders, and neither is a stunned one.
    if (!this.alive(p) || this.drivesBody('player') || this.stunned.has(p)) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown) p.castAbility('radiation-railgun', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('radiation-baton', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('radiation-xray', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('radiation-waste', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('radiation-extermination', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — a tracer, or a flare while the gun is out.
   *
   * Nothing here deals damage. The tracer is a delivery vehicle for a count, and the count is
   * the ability: three on one body and the kit fires the railgun itself. Aim is taken from the
   * cast rather than from the pointer so the npc's shot leaves at the angle it decided on.
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
      seed: Math.random() * 999,
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
   * E — dash in and whip the rod through everything in the wedge.
   *
   * The branch is the ability: a clean target is irradiated, a dosed one is stunned. That makes
   * the baton the only thing in the kit that wants the status to already be there, which is what
   * stops the element from being five buttons that all say "irradiate".
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

    // The dash is a plain shove rather than a driven body: the swing resolves immediately, so
    // there is nothing here that would break if a wall stopped the movement early.
    this.body(f).setVelocity(Math.cos(ang) * BATON_DASH_SPEED, Math.sin(ang) * BATON_DASH_SPEED);
    if (owner === 'player') {
      this.api.isDodging = true;
      this.api.scene.time.delayedCall(BATON_DASH_MS, () => { this.api.isDodging = false; });
    }

    s.swing = { x: f.x, y: f.y, ang, start: this.now };
    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).batonArc(f.x, f.y, ang, BATON_REACH);

    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > BATON_REACH + 22) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > BATON_ARC) continue;

      const alreadyDosed = this.irradiated.has(t);
      t.takeDamage(BATON_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(alreadyDosed ? RAD.hazard : RAD.neon));
      if (alreadyDosed) {
        this.stun(t, owner, BATON_STUN_MS);
      } else {
        this.irradiate(t, owner);
      }
    }
  }

  /**
   * R — eight seconds of looking through the arena.
   *
   * The bones and the wash are cosmetic and the hitbox is not, which is the whole trade: the
   * ability that lets a sniper find a target also makes that target 25% easier to miss badly and
   * still hit. Applied to the *physics body only* through its own multiplier, so nothing that
   * scales a fighter's size — a Fate slots roll, an Illusion fold — is disturbed by it.
   */
  doXray(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-xray'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    this.side(owner).xrayUntil = this.now + XRAY_MS;
    this.avatar(owner)?.play('flex');
    this.avatar(owner)?.ping();
    this.api.showFloatingText(f.x, f.y - 52, '☢ X-RAY', this.hex(RAD.neonLit));
    Sfx.playAt('sonic-pulse', f.x, { rate: 0.75, volume: 0.8 });
    for (const t of this.targetsOf(owner)) this.fx(owner).stick(t.x, t.y);
  }

  /**
   * F — the drum.
   *
   * A three-act ability, and all three acts are owned by `updateWaste` rather than by a chain of
   * delayed calls: the drum has to be able to hit a wall, the fall has to be able to be cut short
   * by the match ending, and the clean-up has to be able to find puddles that were spawned a
   * moment ago. A `delayedCall` chain survives none of those.
   */
  doWaste(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-waste'); return; }
    const s = this.side(owner);
    // One drum at a time. A second cast mid-fall would strand the body mid-air with the WASD
    // override still claimed, which is the one failure mode worth spending a guard on.
    if (s.waste) { this.refund(f, 'radiation-waste'); return; }
    this.ensureLayers();
    this.ensureAvatars();

    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.aimX = tx;
    s.aimY = ty;
    s.waste = {
      phase: 'drum',
      x: f.x + Math.cos(ang) * 30,
      y: f.y + Math.sin(ang) * 30,
      vx: Math.cos(ang) * DRUM_SPEED,
      vy: Math.sin(ang) * DRUM_SPEED,
      roll: 0,
      endsAt: this.now + DRUM_TRAVEL_MS,
      kx: -Math.cos(ang),
      ky: -Math.sin(ang),
      nextShotAt: 0,
    };
    this.avatar(owner)?.play('slam', ang);
    Sfx.playAt('grenade-throw', f.x, { rate: 0.8, volume: 0.9 });
  }

  /**
   * Q — the flare gun.
   *
   * The ultimate does nothing on its own. It hands over five rounds and twelve seconds, and the
   * payout arrives only if every single one of them lands on the same body — which is why the
   * flares are drawn as brightly as they are and why the hit counter sits over each enemy's head
   * for the whole window. An ultimate the player can fail is only fair if they can see it failing.
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
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.left -= step;

      const out = r.x < this.left || r.x > this.right || r.y < this.top || r.y > this.bottom;
      let landed: Fighter | null = null;
      const hitR = r.kind === 'tracer' ? TRACER_HIT_R : FLARE_HIT_R;
      for (const t of this.targetsOf(r.owner)) {
        if (Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) > hitR + 18) continue;
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
      this.api.showFloatingText(victim.x, victim.y - 40, `TRACER ${n}/${TRACERS_TO_CONFIRM}`,
        this.hex(RAD.hazard));
      return;
    }
    // Confirmed. The three are spent on the shot rather than left on the body, so the next
    // railgun costs another three clicks — the ability is a reload, not a stack.
    s.stuck.delete(victim);
    this.fireRailgun(owner, victim);
  }

  /**
   * A tracer that hit nothing scrubs the board — every tracer this side has planted, on every
   * body, falls off. Deliberately brutal: the click is free, the confirm is not, and without
   * this the ability would be "hold the mouse down and wait".
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
    this.irradiate(victim, owner, true);
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
   * body calls the drop; anything else is simply gone, which is what the ability says it is.
   */
  private settleFlares(owner: Owner): void {
    const s = this.side(owner);
    const fl = s.flares;
    if (!fl || fl.ammo > 0 || fl.inFlight > 0) return;

    let best: Fighter | null = null;
    for (const [v, n] of fl.hits) if (n >= FLARE_AMMO) best = v;
    s.flares = null;

    const f = this.fighter(owner);
    if (!best) {
      this.api.showFloatingText(f.x, f.y - 56, '✖ NO CONFIRMATION', this.hex(RAD.hazard));
      Sfx.playAt('ui-denied', f.x, { rate: 0.7, volume: 0.8 });
      return;
    }
    this.callAirdrop(owner);
  }

  private callAirdrop(owner: Owner): void {
    this.airdrop = {
      owner,
      x: this.api.width / 2,
      y: this.api.height / 2,
      landsAt: this.now + AIRDROP_TELL_MS,
    };
    const f = this.fighter(owner);
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

    // "Everyone on screen" is exactly that, and the caster is standing on it too — the self-hit
    // goes through the self-damage route so a shield can't be spent dodging your own bomb.
    for (const t of this.targetsOf(a.owner)) {
      t.takeDamage(AIRDROP_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(a.owner)(RAD.core));
      this.irradiate(t, a.owner, true);
    }
    const caster = this.fighter(a.owner);
    if (this.alive(caster)) {
      caster.applySelfDamage(AIRDROP_DAMAGE);
      this.api.showFloatingText(caster.x, caster.y - 60, '☢ EXTERMINATED', this.hex(RAD.hazard));
    }
  }

  // ── Waste Disposal ─────────────────────────────────────────────────────────

  private updateWaste(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const w = s.waste;
      if (!w) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { this.releaseBody(owner); s.waste = null; continue; }

      if (w.phase === 'drum') {
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        w.roll += dt * 7;
        const wall = w.x <= this.left || w.x >= this.right || w.y <= this.top || w.y >= this.bottom;
        if (this.now >= w.endsAt || wall) this.detonateDrum(owner, w);
        continue;
      }

      if (w.phase === 'knock') {
        // Re-asserted every frame: the fall owns the body, and half the game clears
        // `isInvincible` on timers of its own.
        f.isInvincible = true;
        if (owner === 'player') this.api.isDodging = true;
        const k = Phaser.Math.Clamp((w.endsAt - this.now) / KNOCK_MS, 0, 1);
        this.body(f).setVelocity(w.kx * KNOCK_SPEED * k, w.ky * KNOCK_SPEED * k);
        if (this.now < w.endsAt) continue;
        this.releaseBody(owner);
        this.body(f).setVelocity(0, 0);
        w.phase = 'sweep';
        w.nextShotAt = this.now + 120;
        continue;
      }

      // ── sweep ──
      const mine = this.puddles.filter((p) => p.owner === owner);
      if (!mine.length) { s.waste = null; continue; }
      if (this.now < w.nextShotAt) continue;
      w.nextShotAt = this.now + PUDDLE_SHOT_GAP;
      // Nearest first, so the sweep reads as working outward from where he landed.
      let best = mine[0];
      let bestD = Infinity;
      for (const p of mine) {
        const d = Phaser.Math.Distance.Between(f.x, f.y, p.x, p.y);
        if (d < bestD) { bestD = d; best = p; }
      }
      this.snipePuddle(owner, best);
    }
  }

  private detonateDrum(owner: Owner, w: Waste): void {
    const f = this.fighter(owner);
    const m = this.muzzle(owner);
    this.fx(owner).rail(m.x, m.y, w.x, w.y);
    this.fx(owner).drumBlast(w.x, w.y, DRUM_BLAST_R);
    this.api.scene.cameras.main.shake(360, 0.012);
    Sfx.playAt('explosion-medium', w.x, { rate: 0.8, volume: 1 });

    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y) > DRUM_BLAST_R) continue;
      t.takeDamage(DRUM_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(RAD.neon));
      this.irradiate(t, owner, true);
    }

    // The spray: a ring of pools around the drum, jittered so it never reads as a pattern.
    for (let i = 0; i < PUDDLE_COUNT; i++) {
      const a = (i / PUDDLE_COUNT) * TAU + Math.random() * 0.6;
      const d = 30 + Math.random() * (DRUM_BLAST_R * 0.95);
      this.puddles.push({
        owner,
        x: Phaser.Math.Clamp(w.x + Math.cos(a) * d, this.left, this.right),
        y: Phaser.Math.Clamp(w.y + Math.sin(a) * d, this.top, this.bottom),
        r: PUDDLE_R * (0.75 + Math.random() * 0.5),
        seed: Math.random() * 999,
        dosed: new Map(),
      });
    }

    w.phase = 'knock';
    w.endsAt = this.now + KNOCK_MS;
    if (this.alive(f)) {
      f.isInvincible = true;
      if (owner === 'player') this.api.isDodging = true;
      this.avatar(owner)?.play('dash', Math.atan2(w.ky, w.kx));
    }
  }

  private snipePuddle(owner: Owner, p: Puddle): void {
    const idx = this.puddles.indexOf(p);
    if (idx >= 0) this.puddles.splice(idx, 1);
    const m = this.muzzle(owner);
    this.fx(owner).rail(m.x, m.y, p.x, p.y);
    this.fx(owner).puddleShot(p.x, p.y, p.r);
    Sfx.playAt('explosion-small', p.x, { rate: 1.15, volume: 0.7 });

    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > PUDDLE_BLAST_R) continue;
      t.takeDamage(PUDDLE_BLAST_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(RAD.neonLit));
      this.irradiate(t, owner, true);
    }
  }

  /** Anything standing in a live pool takes a dose once a second, from whoever spilled it. */
  private updatePuddles(): void {
    for (const p of this.puddles) {
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > p.r) continue;
        const last = p.dosed.get(t) ?? 0;
        if (this.now - last < PUDDLE_DOSE_GAP) continue;
        p.dosed.set(t, this.now);
        this.irradiate(t, p.owner);
      }
    }
  }

  // ── Stun & X-ray ───────────────────────────────────────────────────────────

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
      if (!this.alive(v) || this.now >= until) { this.stunned.delete(v); continue; }
      if (v.unstoppable) { this.stunned.delete(v); continue; }
      this.body(v).setVelocity(0, 0);
      v.disarmedUntil = Math.max(v.disarmedUntil, Date.now() + 120);
    }
  }

  /** Give a body its real hitbox back. Safe to call on something that never had one taken. */
  private shrink(f: Fighter): void {
    if (f.hitboxMult === 1) return;
    f.hitboxMult = 1;
    f.applySizeMult();
  }

  /**
   * Rewritten from scratch every frame — the Justice pattern — so an X-ray that ends between two
   * ticks, or a target that dies mid-window, can never leave a permanently inflated hitbox behind.
   */
  private updateXray(): void {
    const want = new Set<Fighter>();
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.now >= s.xrayUntil) { s.xrayUntil = 0; continue; }
      if (!this.alive(this.fighter(owner))) { s.xrayUntil = 0; continue; }
      for (const t of this.targetsOf(owner)) want.add(t);
    }
    for (const f of [...this.swollen]) {
      if (want.has(f) && this.alive(f)) continue;
      this.swollen.delete(f);
      if (f) this.shrink(f);
    }
    for (const f of want) {
      if (this.swollen.has(f)) continue;
      this.swollen.add(f);
      f.hitboxMult = XRAY_HITBOX;
      f.applySizeMult();
    }
  }

  // ── Body ownership ─────────────────────────────────────────────────────────

  /** True while the kit is throwing that side's body around and WASD must stand down. */
  private drivesBody(owner: Owner): boolean {
    return this.side(owner).waste?.phase === 'knock';
  }

  private releaseBody(owner: Owner): void {
    const f = this.fighter(owner);
    if (owner === 'player') this.api.isDodging = false;
    if (f && f.active) f.isInvincible = false;
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isRadiation('player');
    const npcIs = this.isRadiation('npc');
    const anyState = this.rounds.length || this.puddles.length || this.irradiated.size
      || this.stunned.size || this.swollen.size || this.airdrop || this.appliedOut.size;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.updateMission();
    this.updateRounds(delta);
    this.updateWaste(delta);
    this.updatePuddles();
    this.updateIrradiated();
    this.updateStuns();
    this.updateXray();
    this.updateFlareWindow();
    this.updateAirdrop();

    this.paintGround();
    this.paintBones();
    this.paintAir();
    this.updateTint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs, npcIs);
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

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const p of this.puddles) {
      radPuddle(g, this.col(p.owner), p.x, p.y, p.r, 0.9, p.seed, this.vizT);
    }

    const a = this.airdrop;
    if (a) {
      const k = Phaser.Math.Clamp(1 - (a.landsAt - this.now) / AIRDROP_TELL_MS, 0, 1);
      const r = Math.max(this.api.width, this.api.height) * 0.62;
      dropFootprint(g, this.col(a.owner), a.x, a.y, r, 0.95, k, this.vizT);
    }
  }

  /**
   * The skeletons. Drawn from the fighter's position rather than parented to its sprite, and
   * with no reference at all to its alpha — an invisible enemy still has bones, which is the one
   * thing this ability promises that nothing else in the game does.
   */
  private paintBones(): void {
    const g = this.boneGfx;
    if (!g) return;
    g.clear();
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.xrayUntil || owner !== 'player') continue;
      const fade = Phaser.Math.Clamp((s.xrayUntil - this.now) / 600, 0, 1);
      for (const t of this.targetsOf(owner)) {
        boneOverlay(g, this.pcol, t.x, t.y, 0.85 * fade, this.vizT, t.scaleX || 1);
      }
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── Drums ──
    for (const owner of BOTH) {
      const w = this.side(owner).waste;
      if (!w || w.phase !== 'drum') continue;
      const arm = Phaser.Math.Clamp(1 - (w.endsAt - this.now) / DRUM_TRAVEL_MS, 0, 1);
      wasteDrum(g, this.col(owner), w.x, w.y, w.roll, 0.98, { arm });
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

    // ── The baton, mid-swing ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.swing) continue;
      const t = (this.now - s.swing.start) / 300;
      if (t >= 1) { s.swing = null; continue; }
      const a = s.swing.ang - BATON_ARC + t * BATON_ARC * 2;
      const tint = this.col(owner);
      const ex = s.swing.x + Math.cos(a) * BATON_REACH;
      const ey = s.swing.y + Math.sin(a) * BATON_REACH;
      g.lineStyle(6, tint(RAD.leadDeep), 0.95 * (1 - t * 0.4));
      g.lineBetween(s.swing.x, s.swing.y, ex, ey);
      g.lineStyle(2.4, tint(RAD.neon), 0.9 * (1 - t * 0.4));
      g.lineBetween(s.swing.x + Math.cos(a) * 30, s.swing.y + Math.sin(a) * 30, ex, ey);
      trefoil(g, tint, ex, ey, 7, 0.9 * (1 - t), { phase: t * 8 });
    }

    // ── Irradiated markers ──
    for (const [v, d] of this.irradiated) {
      if (!this.alive(v)) continue;
      const left = Phaser.Math.Clamp((d.until - this.now) / IRRADIATED_MS, 0, 1);
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

  /** The X-ray wash. One screen-space rectangle, alpha-driven so it can fade rather than pop. */
  private updateTint(): void {
    const s = this.sides.player;
    const on = this.isRadiation('player') && this.now < s.xrayUntil;
    if (!on) {
      if (this.tintRect) { this.tintRect.destroy(); this.tintRect = null; }
      return;
    }
    if (!this.tintRect) {
      const { width, height } = this.api.scene.scale;
      this.tintRect = this.api.scene.add
        .rectangle(width / 2, height / 2, width, height, this.pcol(RAD.neon), 0.14)
        .setScrollFactor(0)
        .setDepth(19);
    }
    // Breathes rather than sitting flat, so eight seconds of it never becomes wallpaper.
    const fade = Phaser.Math.Clamp((s.xrayUntil - this.now) / 600, 0, 1);
    this.tintRect.setAlpha((0.1 + 0.05 * Math.sin(this.vizT * 3)) * fade);
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setDose(this.charge(owner));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean, npcIs: boolean): void {
    void npcIs;
    const p = this.api.player;

    const s = this.sides.player;
    this.api.setStatusIndicator('radiation-mission', playerIs && s.startedAt ? {
      name: 'Critical Mission', emoji: '☢️', color: RAD.hazard, priority: 150,
      description: `Opened the match at +${Math.round(SPEED_BONUS * 100)}% speed and +${Math.round(DAMAGE_BONUS * 100)}% damage. Both halve every ${HALVE_MS / 1000} seconds and never come back — finish the job before the suit does.`,
      count: Math.round(this.charge('player') * 100), suffix: '%',
      until: this.now + (HALVE_MS - ((this.now - s.startedAt) % HALVE_MS)),
    } : null);

    const dose = this.irradiated.get(p);
    this.api.setStatusIndicator('radiation-irradiated', dose ? {
      name: 'Irradiated', emoji: '☢️', color: RAD.neon, priority: 5,
      description: 'Every point of healing aimed at you from any source lands as damage instead. It does nothing else, and it does not have to.',
      until: dose.until,
    } : null);

    this.api.setStatusIndicator('radiation-xray', playerIs && this.now < s.xrayUntil ? {
      name: 'X-Ray Vision', emoji: '💀', color: RAD.neonLit, priority: 140,
      description: 'Seeing through lead. Every enemy is drawn as its own skeleton whether it is visible or not, and every enemy hitbox is 25% larger.',
      until: s.xrayUntil,
    } : null);

    const fl = s.flares;
    this.api.setStatusIndicator('radiation-flares', playerIs && fl ? {
      name: 'Extermination', emoji: '🔫', color: RAD.neon, priority: 141,
      description: 'The flare gun is out. Every one of these rounds has to land on the same enemy — five on one body calls the airdrop, and anything else calls nothing at all.',
      until: fl.expiresAt, count: fl.ammo,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** Critical Mission's speed half, plus a full stop for a body the baton has pinned. */
  getPlayerSpeedMult(): number {
    return this.speedMult('player');
  }

  getNpcSpeedMult(): number {
    return this.speedMult('npc');
  }

  private speedMult(owner: Owner): number {
    const f = this.fighter(owner);
    if (f && this.stunned.has(f)) return 0;
    if (!this.isRadiation(owner)) return 1;
    return 1 + SPEED_BONUS * this.charge(owner);
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

  /** True while the kit is throwing that side around — the AI must not fight it for the body. */
  isBusy(owner: Owner): boolean {
    const w = this.side(owner).waste;
    return !!w && w.phase !== 'sweep';
  }

  /** Whether the bot's target is already carrying a dose — decides what the baton is for. */
  targetIrradiated(owner: Owner): boolean {
    const t = this.nearestTarget(owner);
    return !!t && this.irradiated.has(t);
  }
}
