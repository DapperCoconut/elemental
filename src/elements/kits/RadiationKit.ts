import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import { isDebuff, seedEffectSnapshot, stretchNewEffects } from '../../combat/StatusEffects';
import {
  RAD, RadiationAvatar, RadiationColorFn, RadiationFx, afterimageLance, boneOverlay, cancerArm,
  criticalAura, doseTicks, dropFootprint, flareRound, geigerTracer, leadArmour, radPuddle,
  redshift, revolver, sustainedBeam, trefoil, wasteDrum,
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
/** How long a dose holds, by level. Level 2 is twice the window, level 3 is four times it. */
const IRRADIATED_SCALE = [0, 1, 2, 4];
/** Level 2+: a flat bleed on top of the healing lock. */
const IRR2_TICK_MS = 1000;
const IRR2_TICK_DAMAGE = 3;
/** Level 2+: everything good that lands on the victim from here runs out twice as fast. */
const IRR2_DECAY_MULT = 0.5;
/** Exposure (E+) at level 3: the swing launches rather than pins. */
const EXPOSURE_KNOCK_SPEED = 900;
const EXPOSURE_KNOCK_MS = 420;
/** Level 3: the arm. */
const IRR3_SLASH_MS = 3000;
const IRR3_SLASH_DAMAGE = 10;
const IRR3_SLASH_STUN_MS = 500;
/** How long the arm spends winding up before each slash, purely so the hit is telegraphed. */
const IRR3_WIND_MS = 700;

// ── Heart Stopper (Click+) ───────────────────────────────────────────────────
/** A perfectly centred set is worth this much on top of the railgun's base damage. */
const HEART_MAX_BONUS = 1.5;
/** Mean precision at or above this leaves the afterimage burning behind the shot. */
const HEART_AFTERIMAGE_AT = 0.85;
const AFTERIMAGE_MS = 4000;
const AFTERIMAGE_TICK_MS = 400;
const AFTERIMAGE_DAMAGE = 6;
/** How far off the line still counts as standing in it. */
const AFTERIMAGE_R = 18;

// ── Final Vision (R+) ────────────────────────────────────────────────────────
/** The operative shrinks by a third instead of the target swelling by one. */
const VISION_SHRINK = 0.67;
const BEAM_MS = 5000;
const BEAM_TICK_MS = 200;
/**
 * Deliberately worth more than the railgun it replaces (50, or 125 under a perfect Heart Stopper
 * set): under Final Vision every enemy is a third smaller, so a confirm costs more misses to
 * reach and has to pay accordingly.
 */
const BEAM_DPS = 22;
/** Every third of the beam's run adds a rung to the dose it is holding on the victim. */
const BEAM_STEP_MS = BEAM_MS / 3;

// ── Cutdown (F+) ─────────────────────────────────────────────────────────────
/** Inside this of the drum's own centre is a direct hit; outside it is only the blast. */
const DIRECT_HIT_R = 30;
const REVOLVER_SHOTS = 6;
const REVOLVER_DAMAGE = 5;
const REVOLVER_GAP = 110;
const SUPER_MS = 8000;
/** How long the lead armour takes to re-clamp after it has eaten a hit. */
const SUPER_ARMOUR_REGEN_MS = 3000;
const SUPER_AURA_R = 130;
const SUPER_AURA_DOSE_MS = 1000;
/** …and how often being inside it adds a rung rather than just refreshing one. */
const SUPER_AURA_STEP_MS = 3000;
/** Below this much charge left, the come-down is a meltdown rather than a shrug. */
const MELTDOWN_CHARGE = 0.25;
const MELTDOWN_MS = 4000;
const MELTDOWN_TICK_MS = 400;
const MELTDOWN_DAMAGE = 6;

// ── Finality (Q+) ────────────────────────────────────────────────────────────
const FINALITY_PUDDLES = 40;

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
const XRAY_HITBOX = 1.33;
/** `Fighter.applySizeMult`'s base body radius. Kept in step so `swell` means the same thing here. */
const BODY_R = 22;

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
  seed: number;
}

/**
 * Heart Stopper (Click+): a dose still burning along the line of a perfect shot.
 *
 * Fixed in world space rather than tracking the victim — it is the *shot* that is left behind,
 * not a debuff on anybody, so walking off the line is how you stop taking it.
 */
interface Afterimage {
  owner: Owner;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  until: number;
  nextTickAt: number;
}

/** Final Vision (R+): the sustained lance a confirm fires instead of the railgun. */
interface Beam {
  owner: Owner;
  victim: Fighter;
  startedAt: number;
  until: number;
  nextTickAt: number;
  /** Rungs of the dose already handed over, so each third of the run only escalates once. */
  steps: number;
}

/** Cutdown (F+): the sidearm, emptying itself into whoever the drum landed on. */
interface Revolver {
  owner: Owner;
  victim: Fighter;
  left: number;
  nextAt: number;
  /** 0–1, decayed per frame — drives the kick on the drawn gun. */
  recoil: number;
  ang: number;
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
  /**
   * Tracers currently clamped to a body, by victim — one entry per tracer, holding how close to
   * that body's centre it landed (0–1). The length is the count; the values are Heart Stopper.
   * Cleared wholesale by a miss.
   */
  stuck: Map<Fighter, number[]>;
  xrayUntil: number;
  /** True while the running X-ray is the R+ version: the operative shrank instead. */
  finalVision: boolean;
  beam: Beam | null;
  revolver: Revolver | null;
  waste: Waste | null;
  flares: Flares | null;
  swing: Swing | null;
  // ── Supercritical (F+) ──
  superUntil: number;
  /** 0 while the lead armour is clamped on; otherwise when it finishes re-clamping. */
  armourAt: number;
  /** The absorber this kit installed, so it is only ever handed back if nobody replaced it. */
  absorber: ((amount: number) => boolean) | null;
  /** Whatever was on the fighter before Supercritical claimed the slot. */
  prevAbsorber: ((amount: number) => boolean) | null;
  /** Per-victim throttles for the bare-core aura. */
  auraDose: Map<Fighter, number>;
  auraStep: Map<Fighter, number>;
  // ── The come-down ──
  meltdownUntil: number;
  meltdownNextAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, startedAt: 0, lastTier: 0, stuck: new Map(),
    xrayUntil: 0, finalVision: false, beam: null, revolver: null,
    waste: null, flares: null, swing: null,
    superUntil: 0, armourAt: 0, absorber: null, prevAbsorber: null,
    auraDose: new Map(), auraStep: new Map(),
    meltdownUntil: 0, meltdownNextAt: 0,
  };
}

/**
 * A dose, and how far up the ladder it is.
 *
 * Level 1 is the shipped status and nothing about it changed. Level 2 doubles the window, bleeds
 * three a second and halves the life of every good thing that lands on the victim afterwards.
 * Level 3 quadruples the window and grows the arm.
 */
interface Dose {
  until: number;
  by: Owner;
  level: number;
  /** Level 2+: next bleed tick. */
  nextTickAt: number;
  /** Level 3: when the arm next comes through, and when it started winding up for it. */
  nextSlashAt: number;
  /** Level 2+: the effect-expiry snapshot the decay halving diffs against. */
  snapshot: Map<string, number>;
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
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded tricks reproduce on this sim. */
  hasNpcUpgrade(slot: string): boolean;
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
 *
 * ## The shop upgrades
 *
 * All five hang off one new spine: the **irradiation ladder**. Base irradiated is a flat window;
 * with upgrades it becomes three rungs, and every rung is worse in a different way (a bleed and
 * halved buff durations at 2, a cancerous arm at 3). Four of the five upgrades are routes up it.
 *
 * - **Click+ Heart Stopper** — tracers are graded on how centred they land, the confirmed shot is
 *   scaled by their average, and a near-perfect set leaves the beam lying on the floor burning.
 * - **E+ Exposure** — the baton promotes a dosed target a rung per swing, and each rung pays the
 *   stun back with interest, ending in a hard launch.
 * - **R+ Final Vision** — the X-ray shrinks the operative instead of swelling the target, and a
 *   confirm under it fires a held five-second beam rather than the railgun.
 * - **F+ Cutdown** — a *direct* drum buys a six-shot revolver, and a direct drum under Final
 *   Vision opens Supercritical: double passive, lead armour, a contamination aura when it breaks,
 *   and a meltdown on the way out if the mission has already burned down.
 * - **Q+ Finality** — the airdrop leaves forty pools across the whole floor and level 3 on
 *   everybody, the caster included.
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
  /** Heart Stopper's leftovers, shared by both sides — each one knows who fired it. */
  private afterimages: Afterimage[] = [];
  /** Victim → the dose they are carrying, its level and who gave it to them. */
  private irradiated = new Map<Fighter, Dose>();
  /** Victim → game-clock expiry of a baton stun. */
  private stunned = new Map<Fighter, number>();
  /**
   * Victim → a live Exposure launch: when it ends and which way it is throwing them.
   *
   * Re-asserted every frame from `update`, which runs after both movement paths have written
   * their own velocity — the same arrangement Waste Disposal's fall relies on. Without it the
   * victim's own WASD (or the bot's chase) simply overwrites the launch on the next tick.
   */
  private knocked = new Map<Fighter, { until: number; vx: number; vy: number }>();
  /** Everything this kit has written an outgoing multiplier onto, and what it last wrote. */
  private appliedOut = new Map<Fighter, number>();
  /**
   * Everything currently wearing an X-ray hitbox — swollen under the base ability, tightened
   * under Final Vision — so whichever it is can always be handed back.
   */
  private xrayed = new Set<Fighter>();
  /** Everything Final Vision has shrunk, and the factor this kit multiplied into `sizeMult`. */
  private shrunk = new Map<Fighter, number>();

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

  /** Shop upgrades, for whichever side is asking. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /**
   * That side's palette, walked onto the hot ladder by `k`.
   *
   * Heart Stopper and Final Vision are the same art in a different colour, so the upgrades buy a
   * wrapped colour function rather than a `red` flag on every painter in the visuals file.
   */
  private hot(owner: Owner, k: number): RadiationColorFn {
    return redshift(this.col(owner), k);
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
    for (const owner of BOTH) this.endSupercritical(owner, true);
    for (const f of this.allFighters()) {
      if (!f) continue;
      f.healInvertedUntil = 0;
      f.onHealInverted = null;
      this.clearHitbox(f);
    }
    // The outgoing multiplier is shared with half a dozen other systems, so it is handed back
    // by dividing out exactly what this kit put in rather than by writing 1 over the top.
    for (const [f] of this.appliedOut) this.setOutgoing(f, 1);
    this.appliedOut.clear();
    this.xrayed.clear();
    // Same reasoning for the body scale: Fate's slots and Illusion's folds own `sizeMult` too,
    // so Final Vision's third is divided back out rather than written over.
    for (const [f] of [...this.shrunk]) this.setSize(f, 1);
    this.shrunk.clear();

    this.releaseBody('player');
    this.releaseBody('npc');
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.rounds = [];
    this.puddles = [];
    this.afterimages = [];
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
    this.api.setStatusIndicator('radiation-supercritical', null);
    this.api.setStatusIndicator('radiation-beam', null);
    this.api.setStatusIndicator('radiation-meltdown', null);
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

  /**
   * How hard the passive is being read right now. 2 while Supercritical is running, which is the
   * whole of "double buffs from its passive" — it doubles what is *left*, so going critical late
   * doubles almost nothing and going critical early is worth the entire opening.
   */
  private passiveMult(owner: Owner): number {
    return this.now < this.side(owner).superUntil ? 2 : 1;
  }

  /** What Critical Mission is currently worth on that side, as a damage multiplier. */
  private outMult(owner: Owner): number {
    return 1 + DAMAGE_BONUS * this.charge(owner) * this.passiveMult(owner);
  }

  /**
   * Every point of damage this kit deals goes through here.
   *
   * `Fighter.outgoingDamageMult` is only consulted on the *npc* side of the arena colliders, and
   * none of this kit's damage is a projectile hit anyway — the railgun, the baton, the drum, the
   * puddle sweep and the airdrop all call `takeDamage` directly. Writing the shared field alone
   * therefore bought the buff a tray entry and nothing else, so the numbers below are scaled here
   * instead. `setOutgoing` still runs so the status tray and any generic reader see the buff.
   */
  private dmg(owner: Owner, base: number): number {
    return Math.round(base * this.outMult(owner));
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
      this.setOutgoing(f, this.outMult(owner));
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

  /** The colour a dose is drawn in, which is the whole read on how bad it is. */
  private doseColor(level: number): number {
    return level >= 3 ? RAD.hot : level === 2 ? RAD.hazard : RAD.neon;
  }

  private doseName(level: number): string {
    return level >= 3 ? 'IRRADIATED III' : level === 2 ? 'IRRADIATED II' : 'IRRADIATED';
  }

  /**
   * Put a dose on someone. Refreshes rather than stacks — the value of the status is the window
   * it holds open, and a stacking version would simply be a longer window with extra bookkeeping.
   *
   * `level` is the rung the upgrades sell. Passing 1 (everything shipped) can never *lower* a
   * dose that is already higher: the shot refreshes the window and leaves the ladder alone,
   * because a Click that quietly cured a level 3 would be the opposite of what the kit is doing.
   */
  private irradiate(victim: Fighter, by: Owner, quiet = false, level = 1): void {
    if (!this.alive(victim)) return;
    const prev = this.irradiated.get(victim);
    const fresh = !prev;
    const lv = Math.max(1, Math.min(3, Math.max(level, prev?.level ?? 1)));
    const rose = !!prev && lv > prev.level;
    const ms = IRRADIATED_MS * IRRADIATED_SCALE[lv];

    const snapshot = prev?.snapshot ?? new Map<string, number>();
    // The decay halving diffs expiries against a snapshot, so the snapshot has to be seeded at
    // the moment the victim reaches level 2 — otherwise everything already on them reads as
    // newly applied on the very first frame and gets cut in half retroactively.
    if (lv >= 2 && (prev?.level ?? 0) < 2) seedEffectSnapshot(victim, snapshot);

    this.irradiated.set(victim, {
      until: this.now + ms,
      by,
      level: lv,
      nextTickAt: prev && !rose ? prev.nextTickAt : this.now + IRR2_TICK_MS,
      nextSlashAt: prev && !rose && prev.level >= 3 ? prev.nextSlashAt : this.now + IRR3_SLASH_MS,
      snapshot,
    });
    victim.healInvertedUntil = Date.now() + ms;
    // The inversion is silent inside `Fighter.heal`, and a heal that quietly hurt would read as
    // a bug — so the pop-up is hung off the fighter for as long as the dose lasts.
    victim.onHealInverted = (harm) => {
      this.api.showFloatingText(victim.x, victim.y - 40, `☢ ${harm} REJECTED`, this.hex(RAD.neon));
    };
    if (quiet && !rose) return;
    this.fx(by).dose(victim.x, victim.y);
    if (fresh || rose) {
      this.api.showFloatingText(victim.x, victim.y - 48, `☢ ${this.doseName(lv)}`,
        this.hex(this.doseColor(lv)));
      Sfx.playAt('status-poison', victim.x, { rate: 1.25 - (lv - 1) * 0.25, volume: 0.75 + lv * 0.08 });
      if (rose) Sfx.playAt('status-stun', victim.x, { rate: 0.6 + lv * 0.15, volume: 0.6 });
    }
  }

  /** One rung up the ladder, refreshing the window at the new level. Exposure's whole job. */
  private escalate(victim: Fighter, by: Owner): number {
    const lv = Math.min(3, (this.irradiated.get(victim)?.level ?? 0) + 1);
    this.irradiate(victim, by, false, lv);
    return lv;
  }

  private doseLevel(victim: Fighter): number {
    return this.irradiated.get(victim)?.level ?? 0;
  }

  private updateIrradiated(): void {
    const wall = Date.now();
    for (const [v, d] of [...this.irradiated]) {
      if (!this.alive(v) || this.now >= d.until) {
        this.irradiated.delete(v);
        if (v) { v.healInvertedUntil = 0; v.onHealInverted = null; }
        continue;
      }
      if (d.level < 2) continue;

      // ── Level 2: the bleed, and everything good on them running out twice as fast ──
      // Debuffs are deliberately exempt: halving the enemy's *own* poison would be a gift.
      stretchNewEffects(v, wall, this.now, IRR2_DECAY_MULT, d.snapshot, (desc) => !isDebuff(desc));
      if (this.now >= d.nextTickAt) {
        d.nextTickAt = this.now + IRR2_TICK_MS;
        v.takeDamage(this.dmg(d.by, IRR2_TICK_DAMAGE));
        this.fx(d.by).mote(v.x + (Math.random() - 0.5) * 20, v.y);
      }
      if (d.level < 3) continue;

      // ── Level 3: the arm ──
      if (this.now >= d.nextSlashAt) {
        d.nextSlashAt = this.now + IRR3_SLASH_MS;
        this.clawSlash(v, d.by);
      }
    }
  }

  /** The cancerous arm coming through. Ten damage and half a second on the floor, every 3s. */
  private clawSlash(victim: Fighter, by: Owner): void {
    if (!this.alive(victim)) return;
    const ang = this.armAngle(victim);
    victim.takeDamage(this.dmg(by, IRR3_SLASH_DAMAGE));
    this.api.spawnHitFlash(victim.x, victim.y, this.col(by)(RAD.flesh));
    this.fx(by).clawSlash(victim.x, victim.y, ang + Math.PI / 2);
    this.stun(victim, by, IRR3_SLASH_STUN_MS, true);
    this.api.showFloatingText(victim.x, victim.y - 34, '🦠 ITS OWN ARM', this.hex(RAD.flesh));
    Sfx.playAt('slash', victim.x, { rate: 0.7, volume: 0.85 });
  }

  /** Which way the arm hangs off a body. Rooted to the victim so it never swims around them. */
  private armAngle(victim: Fighter): number {
    return Math.sin(victim.x * 0.013 + victim.y * 0.017) * 0.9 - 0.5;
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
    // Final Vision's beam owns the trigger for its whole five seconds — the ability is already
    // firing, and a tracer leaving the same muzzle mid-lance would read as two guns.
    if (this.side(owner).beam) { this.refund(f, 'radiation-railgun'); return; }
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
      if (d > BATON_REACH + 22 + this.swell(t)) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > BATON_ARC) continue;

      const alreadyDosed = this.irradiated.has(t);
      t.takeDamage(this.dmg(owner, BATON_DAMAGE));
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(alreadyDosed ? RAD.hazard : RAD.neon));
      if (!alreadyDosed) { this.irradiate(t, owner); continue; }

      if (!this.up(owner, 'e')) { this.stun(t, owner, BATON_STUN_MS); continue; }
      // ── Exposure (E+) ──
      // The swing still takes their legs, but it also walks the dose up a rung — and each rung
      // pays the stun back with interest. Level 3 adds the knockback, which is the only hard
      // displacement anywhere in the kit.
      const lv = this.escalate(t, owner);
      this.stun(t, owner, lv >= 2 ? BATON_STUN_MS * 2 : BATON_STUN_MS);
      if (lv < 3) continue;
      this.knockBack(t, owner, ang);
    }
  }

  /** Exposure's level 3: the swing does not stun so much as launch. */
  private knockBack(victim: Fighter, by: Owner, ang: number): void {
    if (victim.unstoppable) return;
    this.knocked.set(victim, {
      until: this.now + EXPOSURE_KNOCK_MS,
      vx: Math.cos(ang) * EXPOSURE_KNOCK_SPEED,
      vy: Math.sin(ang) * EXPOSURE_KNOCK_SPEED,
    });
    this.fx(by).drumBlast(victim.x, victim.y, 54);
    this.api.showFloatingText(victim.x, victim.y - 66, '☢ EXPOSED', this.hex(RAD.hot));
    Sfx.playAt('explosion-small', victim.x, { rate: 0.7, volume: 0.9 });
    this.api.scene.cameras.main.shake(180, 0.006);
  }

  /**
   * R — eight seconds of looking through the arena.
   *
   * The bones and the wash are cosmetic and the hitbox is not, which is the whole trade: the
   * ability that lets a sniper find a target also makes that target 33% easier to miss badly and
   * still hit. Applied to the *physics body only* through its own multiplier, so nothing that
   * scales a fighter's size — a Fate slots roll, an Illusion fold — is disturbed by it.
   */
  doXray(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-xray'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    const final = this.up(owner, 'r');
    s.xrayUntil = this.now + XRAY_MS;
    s.finalVision = final;
    this.avatar(owner)?.play('flex');
    this.avatar(owner)?.ping();
    this.api.showFloatingText(f.x, f.y - 52, final ? '☢ FINAL VISION' : '☢ X-RAY',
      this.hex(final ? RAD.hot : RAD.neonLit));
    Sfx.playAt('sonic-pulse', f.x, { rate: final ? 0.55 : 0.75, volume: 0.8 });
    if (final) this.fx(owner).heartbeat(f.x, f.y, 1);
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
      const fromX = r.x;
      const fromY = r.y;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.left -= step;

      const out = r.x < this.left || r.x > this.right || r.y < this.top || r.y > this.bottom;
      let landed: Fighter | null = null;
      let reach = 0;
      let contactX = r.x;
      const hitR = r.kind === 'tracer' ? TRACER_HIT_R : FLARE_HIT_R;
      for (const t of this.targetsOf(r.owner)) {
        const rr = hitR + 18 + this.swell(t);
        // Swept, not sampled. A tracer covers ~16px of arena between two frames and a flare
        // ~23px — and twice that on a dropped one — so testing only where the round *ended*
        // let it step clean over a body it went straight through. That got worse the smaller
        // the target was, which is exactly when the chain most needs the hit to count.
        const near = nearestOnSegment(fromX, fromY, r.x, r.y, t.x, t.y);
        if (Phaser.Math.Distance.Between(near.x, near.y, t.x, t.y) > rr) continue;
        landed = t;
        reach = rr;
        contactX = near.x;
        break;
      }

      if (landed) {
        this.rounds.splice(i, 1);
        if (r.kind === 'tracer') {
          // Heart Stopper reads how far off the body's own centre line the tracer clamped on:
          // dead centre is 1, the edge of the catch radius is 0. Horizontal only, because
          // "dead centre" on a body is a left-right thing and a high shot is still a hit.
          // Measured at the contact point on the swept step, not at the frame's end point.
          const off = Math.abs(contactX - landed.x) / Math.max(1, reach);
          this.onTracerHit(r.owner, landed, Phaser.Math.Clamp(1 - off, 0, 1));
        } else this.onFlareHit(r.owner, landed);
        continue;
      }
      if (out || r.left <= 0) {
        this.rounds.splice(i, 1);
        if (r.kind === 'tracer') this.onTracerMiss(r.owner, r.x, r.y);
        else this.onFlareMiss(r.owner);
      }
    }
  }

  private onTracerHit(owner: Owner, victim: Fighter, precision: number): void {
    const s = this.side(owner);
    const heart = this.up(owner, 'click');
    const set = s.stuck.get(victim) ?? [];
    set.push(precision);
    const n = set.length;
    this.fx(owner).stick(victim.x, victim.y);
    if (heart && precision > 0.55) this.fx(owner).heartbeat(victim.x, victim.y, precision);
    Sfx.playAt('nail', victim.x, { rate: 1 + n * 0.18 + (heart ? precision * 0.3 : 0), volume: 0.7 });

    if (n < TRACERS_TO_CONFIRM) {
      s.stuck.set(victim, set);
      const tag = heart
        ? `TRACER ${n}/${TRACERS_TO_CONFIRM} · ${Math.round(precision * 100)}%`
        : `TRACER ${n}/${TRACERS_TO_CONFIRM}`;
      this.api.showFloatingText(victim.x, victim.y - 40, tag,
        this.hex(heart && precision > 0.75 ? RAD.hot : RAD.hazard));
      return;
    }
    // Confirmed. The three are spent on the shot rather than left on the body, so the next
    // railgun costs another three clicks — the ability is a reload, not a stack.
    s.stuck.delete(victim);
    const heat = heart ? set.reduce((a, b) => a + b, 0) / set.length : 0;
    // Final Vision turns the confirm into a held beam instead of a hitscan lance. It is checked
    // before the railgun so R+ and Click+ never both pay out on the same set of three.
    if (s.finalVision && this.now < s.xrayUntil && this.up(owner, 'r')) {
      this.startBeam(owner, victim);
      return;
    }
    this.fireRailgun(owner, victim, heat);
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

  /**
   * The confirmed shot: hitscan from the muzzle, 50 damage, and a dose on the way out.
   *
   * `heat` is Heart Stopper's mean precision across the three tracers, 0 without the upgrade. It
   * buys up to +150% on the shot and, at 85% or better, leaves the line itself behind burning.
   */
  private fireRailgun(owner: Owner, victim: Fighter, heat = 0): void {
    const m = this.muzzle(owner);
    const ang = Math.atan2(victim.y - m.y, victim.x - m.x);
    this.fx(owner).rail(m.x, m.y, victim.x, victim.y);
    this.fx(owner).railHit(victim.x, victim.y, ang);
    this.avatar(owner)?.ping();

    victim.takeDamage(this.dmg(owner, RAIL_DAMAGE * (1 + HEART_MAX_BONUS * heat)));
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(heat > 0.5 ? RAD.hot : RAD.core));
    this.irradiate(victim, owner, true);
    this.api.showFloatingText(victim.x, victim.y - 62,
      heat > 0.02 ? `☢ CONFIRMED · ${Math.round(heat * 100)}%` : '☢ CONFIRMED',
      this.hex(heat > 0.5 ? RAD.hot : RAD.core));
    Sfx.playAt('beam-fire', victim.x, { rate: 0.85 - heat * 0.2, volume: 1 });
    this.api.scene.cameras.main.shake(120 + heat * 140, 0.004 + heat * 0.006);

    if (heat < HEART_AFTERIMAGE_AT) return;
    // Dead centre three times over. The line does not go out.
    const dx = victim.x - m.x;
    const dy = victim.y - m.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    this.afterimages.push({
      owner,
      x0: m.x, y0: m.y,
      // Run it past the victim to the far wall — the beam was never aimed at a person, it was
      // aimed through one, and a line that stops at the body reads as a stick.
      x1: Phaser.Math.Clamp(m.x + (dx / len) * (len + 260), this.left, this.right),
      y1: Phaser.Math.Clamp(m.y + (dy / len) * (len + 260), this.top, this.bottom),
      until: this.now + AFTERIMAGE_MS,
      nextTickAt: this.now + AFTERIMAGE_TICK_MS,
    });
    this.api.showFloatingText(m.x, m.y - 62, '❤ HEART STOPPER', this.hex(RAD.hot));
    Sfx.playAt('heartbeat', victim.x, { rate: 0.7, volume: 0.9 });
    this.api.scene.cameras.main.flash(220, 255, 80, 60);
  }

  /**
   * Heart Stopper's leftover line. Fixed in the world, ticking anybody standing in it — walking
   * off the line is the answer, which is why it is drawn as brightly as the shot that made it.
   */
  private updateAfterimages(): void {
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      if (this.now >= a.until) { this.afterimages.splice(i, 1); continue; }
      if (this.now < a.nextTickAt) continue;
      a.nextTickAt = this.now + AFTERIMAGE_TICK_MS;
      for (const t of this.targetsOf(a.owner)) {
        const line = new Phaser.Geom.Line(a.x0, a.y0, a.x1, a.y1);
        const near = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Geom.Point(t.x, t.y));
        if (Phaser.Math.Distance.Between(near.x, near.y, t.x, t.y) > AFTERIMAGE_R + this.swell(t)) continue;
        t.takeDamage(this.dmg(a.owner, AFTERIMAGE_DAMAGE));
        this.api.spawnHitFlash(t.x, t.y, this.col(a.owner)(RAD.hot));
      }
    }
  }

  // ── Final Vision's beam (R+) ───────────────────────────────────────────────

  /**
   * Five seconds of held lance instead of one hitscan shot.
   *
   * The trade is stated in the ability: it deals more over its run than a railgun does at once,
   * but the trigger is locked for the whole of it, so a confirm under Final Vision is a
   * commitment rather than a spike. The dose climbs a rung every third of the run, which is what
   * makes it the only route in the kit to a level 3 without spending the E.
   */
  private startBeam(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.beam = {
      owner, victim,
      startedAt: this.now,
      until: this.now + BEAM_MS,
      nextTickAt: this.now + BEAM_TICK_MS,
      steps: 0,
    };
    this.irradiate(victim, owner, false, 1);
    f.lockAbility('radiation-railgun', BEAM_MS);
    this.avatar(owner)?.setHold('reach', Math.atan2(victim.y - f.y, victim.x - f.x));
    this.avatar(owner)?.ping();
    this.api.showFloatingText(f.x, f.y - 64, '☢ FINAL VISION', this.hex(RAD.hot));
    Sfx.playAt('beam-fire', f.x, { rate: 0.5, volume: 1 });
    Sfx.playAt('sonic-pulse', f.x, { rate: 0.55, volume: 0.8 });
    this.api.scene.cameras.main.shake(260, 0.005);
  }

  private updateBeams(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const b = s.beam;
      if (!b) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.alive(b.victim) || this.now >= b.until) {
        s.beam = null;
        this.avatar(owner)?.setHold(null);
        // The trigger lock is deliberately left to expire on its own clock rather than cleared:
        // `clearLocks` is wholesale and would drop a Ruin Lockdown running on the same body.
        continue;
      }
      const m = this.muzzle(owner);
      this.avatar(owner)?.setHold('reach', Math.atan2(b.victim.y - m.y, b.victim.x - m.x));

      // A rung of the dose per third of the run — but only while it is still connecting, so a
      // victim who died and was replaced does not inherit somebody else's escalation.
      const step = Math.min(3, Math.floor((this.now - b.startedAt) / BEAM_STEP_MS) + 1);
      if (step > b.steps) {
        b.steps = step;
        if (step > 1) this.escalate(b.victim, owner);
      }
      if (this.now < b.nextTickAt) continue;
      b.nextTickAt = this.now + BEAM_TICK_MS;
      b.victim.takeDamage(this.dmg(owner, (BEAM_DPS * BEAM_TICK_MS) / 1000));
      this.api.spawnHitFlash(b.victim.x, b.victim.y, this.col(owner)(RAD.hot));
    }
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
    // One blast, one yield: the mission buff scales the self-hit too, so "and that includes you"
    // stays literally true however far into the match the drop is called.
    const drop = this.dmg(a.owner, AIRDROP_DAMAGE);
    // Finality (Q+): the crater does not clear. Level 3 on everybody standing in it — including
    // the man who called it — and forty live pools for the F to sweep back up.
    const finality = this.up(a.owner, 'q');
    for (const t of this.targetsOf(a.owner)) {
      t.takeDamage(drop);
      this.api.spawnHitFlash(t.x, t.y, this.col(a.owner)(RAD.core));
      this.irradiate(t, a.owner, !finality, finality ? 3 : 1);
    }
    const caster = this.fighter(a.owner);
    if (this.alive(caster)) {
      caster.applySelfDamage(drop);
      this.api.showFloatingText(caster.x, caster.y - 60, '☢ EXTERMINATED', this.hex(RAD.hazard));
      if (finality) this.irradiate(caster, a.owner, false, 3);
    }
    if (!finality) return;
    this.spillFallout(a.owner, a.x, a.y);
  }

  /**
   * Finality's fallout: forty pools laid across the whole floor rather than rung around a drum.
   *
   * They are ordinary Waste Disposal pools in every respect — they dose whoever stands in one,
   * and the F's sweep picks them up for 15 apiece — which is the entire ability: the ultimate
   * stops being a full stop and becomes forty rounds of ammunition for the next F.
   */
  private spillFallout(owner: Owner, cx: number, cy: number): void {
    const spanX = (this.right - this.left) / 2;
    const spanY = (this.bottom - this.top) / 2;
    for (let i = 0; i < FINALITY_PUDDLES; i++) {
      // A sunflower spiral rather than a plain random scatter: forty random points clump badly
      // and leave bald patches, and the whole floor is meant to be contaminated.
      const k = (i + 0.5) / FINALITY_PUDDLES;
      const a = i * 2.399963;
      const d = Math.sqrt(k);
      this.puddles.push({
        owner,
        x: Phaser.Math.Clamp(cx + Math.cos(a) * spanX * d * 0.98, this.left, this.right),
        y: Phaser.Math.Clamp(cy + Math.sin(a) * spanY * d * 0.98, this.top, this.bottom),
        r: PUDDLE_R * (0.6 + Math.random() * 0.5),
        seed: Math.random() * 999,
        dosed: new Map(),
      });
    }
    this.api.showFloatingText(cx, cy - 96, `☢ ${FINALITY_PUDDLES} POOLS · FALLOUT`, this.hex(RAD.neon));
    Sfx.playAt('status-poison', cx, { rate: 0.5, volume: 1 });
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

    // A direct hit is the drum going off *on* somebody rather than near them, and it is the only
    // thing Cutdown looks at — the 132px blast is generous and would make the upgrade free.
    let direct: Fighter | null = null;
    let directD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y);
      if (d > DRUM_BLAST_R + this.swell(t)) continue;
      t.takeDamage(this.dmg(owner, DRUM_DAMAGE));
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(RAD.neon));
      this.irradiate(t, owner, true);
      if (d <= DIRECT_HIT_R + this.swell(t) && d < directD) { directD = d; direct = t; }
    }
    if (direct && this.up(owner, 'f')) this.drawRevolver(owner, direct);

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
      if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > PUDDLE_BLAST_R + this.swell(t)) continue;
      t.takeDamage(this.dmg(owner, PUDDLE_BLAST_DAMAGE));
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(RAD.neonLit));
      this.irradiate(t, owner, true);
    }
  }

  /** Anything standing in a live pool takes a dose once a second, from whoever spilled it. */
  private updatePuddles(): void {
    for (const p of this.puddles) {
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > p.r + this.swell(t)) continue;
        const last = p.dosed.get(t) ?? 0;
        if (this.now - last < PUDDLE_DOSE_GAP) continue;
        p.dosed.set(t, this.now);
        this.irradiate(t, p.owner);
      }
    }
  }

  // ── Cutdown & Supercritical (F+) ───────────────────────────────────────────

  /**
   * The sidearm. A drum that lands *on* somebody buys six rounds of five, fired one at a time
   * while the operative is still coming down from the blast — which is the point: the fall used
   * to be dead time and now it is the follow-up.
   */
  private drawRevolver(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.revolver = {
      owner, victim,
      left: REVOLVER_SHOTS,
      nextAt: this.now + 180,
      recoil: 0,
      ang: Math.atan2(victim.y - f.y, victim.x - f.x),
    };
    this.api.showFloatingText(f.x, f.y - 60, '🔫 CUTDOWN', this.hex(RAD.hazard));
    Sfx.playAt('reload', f.x, { rate: 1.15, volume: 0.85 });
    // The one branch that turns the whole match: a direct drum, with Final Vision already up.
    if (this.up(owner, 'r') && this.side(owner).finalVision && this.now < s.xrayUntil) {
      this.beginSupercritical(owner);
    }
  }

  private updateRevolvers(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const r = s.revolver;
      if (!r) continue;
      r.recoil = Math.max(0, r.recoil - delta / 140);
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.alive(r.victim) || r.left <= 0) {
        if (r.left <= 0 && r.recoil > 0) continue;
        s.revolver = null;
        continue;
      }
      if (this.now < r.nextAt) continue;
      r.nextAt = this.now + REVOLVER_GAP;
      r.left--;
      r.recoil = 1;
      r.ang = Math.atan2(r.victim.y - f.y, r.victim.x - f.x);
      const m = this.muzzle(owner);
      this.fx(owner).pistolShot(m.x, m.y, r.victim.x, r.victim.y);
      this.fx(owner).casing(m.x, m.y);
      r.victim.takeDamage(this.dmg(owner, REVOLVER_DAMAGE));
      this.api.spawnHitFlash(r.victim.x, r.victim.y, this.col(owner)(RAD.hazard));
      Sfx.playAt('musket', r.victim.x, { rate: 1.35 + (REVOLVER_SHOTS - r.left) * 0.06, volume: 0.55 });
    }
  }

  /**
   * Supercritical.
   *
   * Eight seconds in which the passive is read twice as hard, and a slab of lead that eats one
   * hit outright. Break the lead and the operative *is* the source — a contamination aura that
   * doses whoever is standing in it and walks the ladder up on them — until the plates re-clamp
   * three seconds later. The come-down at the end is only a problem if the mission has already
   * burned down: with a quarter of the charge or less left there is nothing holding the load in
   * and it goes straight through him.
   */
  private beginSupercritical(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const fresh = this.now >= s.superUntil;
    s.superUntil = this.now + SUPER_MS;
    s.armourAt = 0;
    if (fresh) {
      s.prevAbsorber = f.damageAbsorber;
      // Chained rather than assigned: Time's Remain and Air's wind dodge live in this same slot,
      // and a Supercritical that quietly deleted one of them would be a bug nobody could see.
      const mine = (amount: number): boolean => {
        if (this.now < s.superUntil && !s.armourAt) {
          this.breakArmour(owner, amount);
          return true;
        }
        return s.prevAbsorber?.(amount) ?? false;
      };
      s.absorber = mine;
      f.damageAbsorber = mine;
    }
    this.fx(owner).armourOn(f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 74, '☢☢ SUPERCRITICAL ☢☢', this.hex(RAD.core));
    Sfx.playAt('status-invincible', f.x, { rate: 0.65, volume: 1 });
    Sfx.playAt('quake', f.x, { rate: 1.2, volume: 0.7 });
    this.api.scene.cameras.main.shake(420, 0.01);
    this.api.scene.cameras.main.flash(280, 200, 255, 160);
  }

  private breakArmour(owner: Owner, amount: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.armourAt = this.now + SUPER_ARMOUR_REGEN_MS;
    this.fx(owner).armourBreak(f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 58, `🛡 ${Math.round(amount)} BLOCKED`, this.hex(RAD.hazard));
    Sfx.playAt('explosion-medium', f.x, { rate: 1.3, volume: 0.85 });
    this.api.scene.cameras.main.shake(200, 0.008);
  }

  private endSupercritical(owner: Owner, silent = false): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.superUntil = 0;
    s.armourAt = 0;
    s.auraDose.clear();
    s.auraStep.clear();
    if (f && s.absorber && f.damageAbsorber === s.absorber) f.damageAbsorber = s.prevAbsorber;
    s.absorber = null;
    s.prevAbsorber = null;
    if (silent || !this.alive(f)) return;

    // The come-down. Only bites if there was nothing left holding it in.
    if (this.charge(owner) > MELTDOWN_CHARGE) {
      this.api.showFloatingText(f.x, f.y - 58, '☢ STABLE', this.hex(RAD.neonLit));
      Sfx.playAt('status-expire', f.x, { rate: 1, volume: 0.7 });
      return;
    }
    s.meltdownUntil = this.now + MELTDOWN_MS;
    s.meltdownNextAt = this.now;
    this.irradiate(f, owner, false, 3);
    this.api.showFloatingText(f.x, f.y - 70, '☢☢ MELTDOWN ☢☢', this.hex(RAD.hot));
    Sfx.playAt('status-burn', f.x, { rate: 0.55, volume: 1 });
    this.api.scene.cameras.main.shake(600, 0.012);
  }

  private updateSupercritical(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);

      if (s.superUntil && (this.now >= s.superUntil || !this.alive(f))) {
        this.endSupercritical(owner);
      } else if (s.superUntil) {
        if (s.armourAt && this.now >= s.armourAt) {
          s.armourAt = 0;
          this.fx(owner).armourOn(f.x, f.y);
          this.api.showFloatingText(f.x, f.y - 54, '🛡 ARMOUR RESET', this.hex(RAD.hazard));
          Sfx.playAt('status-buff', f.x, { rate: 0.8, volume: 0.7 });
        }
        // Bare core: the aura only exists while the lead is off, which is what makes losing the
        // armour a trade rather than a loss.
        if (s.armourAt) this.runAura(owner, f, s);
      }

      // ── The come-down ──
      if (!s.meltdownUntil) continue;
      if (this.now >= s.meltdownUntil || !this.alive(f)) { s.meltdownUntil = 0; continue; }
      if (this.now < s.meltdownNextAt) continue;
      s.meltdownNextAt = this.now + MELTDOWN_TICK_MS;
      f.applySelfDamage(MELTDOWN_DAMAGE);
      this.fx(owner).meltdown(f.x, f.y);
    }
  }

  /** The contamination halo, while the plates are off. Doses, then walks the ladder up. */
  private runAura(owner: Owner, f: Fighter, s: Side): void {
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > SUPER_AURA_R + this.swell(t)) continue;
      const step = s.auraStep.get(t) ?? 0;
      if (this.now - step >= SUPER_AURA_STEP_MS && this.doseLevel(t) > 0 && this.doseLevel(t) < 3) {
        s.auraStep.set(t, this.now);
        s.auraDose.set(t, this.now);
        this.escalate(t, owner);
        continue;
      }
      const last = s.auraDose.get(t) ?? 0;
      if (this.now - last < SUPER_AURA_DOSE_MS) continue;
      s.auraDose.set(t, this.now);
      if (!s.auraStep.has(t)) s.auraStep.set(t, this.now);
      this.irradiate(t, owner);
    }
  }

  // ── Stun & X-ray ───────────────────────────────────────────────────────────

  private stun(victim: Fighter, by: Owner, ms: number, quiet = false): void {
    if (victim.unstoppable) {
      if (!quiet) this.api.showFloatingText(victim.x, victim.y - 50, 'UNSTOPPABLE', this.hex(RAD.hazard));
      return;
    }
    this.stunned.set(victim, Math.max(this.stunned.get(victim) ?? 0, this.now + ms));
    victim.applyDisarm(ms);
    if (quiet) return;
    this.fx(by).stick(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 52, '⚡ STUNNED', this.hex(RAD.hazard));
    Sfx.playAt('status-stun', victim.x, { rate: 0.85, volume: 0.9 });
  }

  private updateStuns(): void {
    for (const [v, k] of [...this.knocked]) {
      if (!this.alive(v) || this.now >= k.until) { this.knocked.delete(v); continue; }
      // Eased to a stop over the window rather than cut, so the landing is a slide not a stop.
      const left = Phaser.Math.Clamp((k.until - this.now) / EXPOSURE_KNOCK_MS, 0, 1);
      this.body(v).setVelocity(k.vx * left, k.vy * left);
    }
    for (const [v, until] of [...this.stunned]) {
      if (!this.alive(v) || this.now >= until) { this.stunned.delete(v); continue; }
      if (v.unstoppable) { this.stunned.delete(v); continue; }
      if (!this.knocked.has(v)) this.body(v).setVelocity(0, 0);
      v.disarmedUntil = Math.max(v.disarmedUntil, Date.now() + 120);
    }
  }

  /**
   * How much wider than a normal body that target currently is, in pixels. Zero unless something
   * has swelled, folded or tightened it — and **negative** under Final Vision, which takes a
   * third off every enemy hitbox rather than adding one.
   *
   * `hitboxMult` reaches Phaser's colliders through `Fighter.applySizeMult`, but this kit fires no
   * `Projectile`s — tracers, flares, the baton arc, the drum and the puddle sweep are all
   * hand-rolled range checks — so without this term X-Ray resized a body that nothing Radiation
   * owns was ever measuring against. Added rather than multiplied so every tuned constant below
   * keeps its exact unmodified value.
   */
  private swell(t: Fighter): number {
    const scale = t.sizeMult * t.shapeSizeMult * t.oozeSizeMult * t.hitboxMult;
    return BODY_R * (scale - 1);
  }

  /** Give a body its real hitbox back. Safe to call on something that never had one taken. */
  private clearHitbox(f: Fighter): void {
    if (f.hitboxMult === 1) return;
    f.hitboxMult = 1;
    f.applySizeMult();
  }

  /**
   * Nudge a fighter's shared `sizeMult` to `mult` by dividing out whatever this kit last put
   * there — `setOutgoing`'s arrangement, and for the same reason. Final Vision shrinks the
   * *operative*, and a Fate slots roll or an Illusion fold running on that same body owns this
   * field too, so writing the factor straight in would silently delete theirs.
   */
  private setSize(f: Fighter, mult: number): void {
    const prev = this.shrunk.get(f) ?? 1;
    if (Math.abs(prev - mult) < 0.0005) return;
    f.sizeMult = (f.sizeMult / prev) * mult;
    if (Math.abs(mult - 1) < 0.0005) this.shrunk.delete(f);
    else this.shrunk.set(f, mult);
    f.applySizeMult();
  }

  /**
   * Rewritten from scratch every frame — the Justice pattern — so an X-ray that ends between two
   * ticks, or a target that dies mid-window, can never leave a body the wrong size behind.
   *
   * Final Vision (R+) turns the ability round without moving it off the enemy. Base X-Ray swells
   * every enemy 33% so that bad aim lands; the upgrade tightens them by the same third instead,
   * so only good aim does — and what it pays back for the misses is the beam a confirm under it
   * fires. The operative shrinks alongside them, which is the half of the trade that keeps him
   * standing while each chain takes longer.
   */
  private updateXray(): void {
    const want = new Map<Fighter, number>();
    const shrink = new Set<Fighter>();
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (this.now >= s.xrayUntil || !this.alive(f)) { s.xrayUntil = 0; s.finalVision = false; continue; }
      if (s.finalVision) shrink.add(f);
      const mult = s.finalVision ? VISION_SHRINK : XRAY_HITBOX;
      // Two X-rays reading the same body: the tighter one wins, so an ordinary one running on
      // the other side of the fight can never hand a Final Vision's mark its full hitbox back.
      for (const t of this.targetsOf(owner)) want.set(t, Math.min(want.get(t) ?? Infinity, mult));
    }
    for (const f of [...this.xrayed]) {
      if (want.has(f) && this.alive(f)) continue;
      this.xrayed.delete(f);
      if (f) this.clearHitbox(f);
    }
    for (const [f, mult] of want) {
      this.xrayed.add(f);
      if (f.hitboxMult === mult) continue;
      f.hitboxMult = mult;
      f.applySizeMult();
    }
    for (const [f] of [...this.shrunk]) {
      if (shrink.has(f) && this.alive(f)) continue;
      this.setSize(f, 1);
    }
    for (const f of shrink) this.setSize(f, VISION_SHRINK);
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
      || this.stunned.size || this.xrayed.size || this.airdrop || this.appliedOut.size
      || this.afterimages.length || this.shrunk.size || this.knocked.size;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.updateMission();
    this.updateRounds(delta);
    this.updateWaste(delta);
    this.updateRevolvers(delta);
    this.updateSupercritical();
    this.updatePuddles();
    this.updateIrradiated();
    this.updateAfterimages();
    this.updateBeams();
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
      // Final Vision paints the same skeletons on the hot ladder. Nothing else changes about
      // them — an invisible enemy still has bones, and that is the half of R the upgrade keeps.
      const tint = this.hot('player', s.finalVision ? 1 : 0);
      for (const t of this.targetsOf(owner)) {
        boneOverlay(g, tint, t.x, t.y, 0.85 * fade, this.vizT, t.scaleX || 1);
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
      for (const [v, set] of s.stuck) {
        if (!this.alive(v)) continue;
        const n = set.length;
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(this.vizT * (3 + n * 2.6)));
        let heat = 0;
        for (let i = 0; i < n; i++) {
          const a = this.vizT * 1.6 + (i / TRACERS_TO_CONFIRM) * TAU;
          // Heart Stopper: each tracer carries its own precision, so a set can be one red device
          // and two green ones. That is the read the upgrade sells — you can see the bad one.
          heat += set[i] / n;
          geigerTracer(g, this.hot(owner, set[i]), v.x + Math.cos(a) * 20, v.y + Math.sin(a) * 20 - 2,
            a + Math.PI / 2, 0.95, { lamp: blink, legs: true, scale: 0.85 });
        }
        this.pips(g, this.hot(owner, heat), v.x, v.y - 46, n, TRACERS_TO_CONFIRM, blink);
      }
    }

    // ── Heart Stopper's afterimages ──
    for (const a of this.afterimages) {
      const left = Phaser.Math.Clamp((a.until - this.now) / AFTERIMAGE_MS, 0, 1);
      afterimageLance(g, this.col(a.owner), a.x0, a.y0, a.x1, a.y1, 0.95, left, this.vizT);
    }

    // ── Final Vision's beam ──
    for (const owner of BOTH) {
      const b = this.side(owner).beam;
      if (!b || !this.alive(b.victim)) continue;
      const m = this.muzzle(owner);
      const bite = Phaser.Math.Clamp((b.steps - 1) / 2, 0, 1);
      sustainedBeam(g, this.col(owner), m.x, m.y, b.victim.x, b.victim.y, 1, this.vizT, bite);
    }

    // ── Cutdown's sidearm ──
    for (const owner of BOTH) {
      const r = this.side(owner).revolver;
      if (!r) continue;
      const m = this.muzzle(owner);
      revolver(g, this.col(owner), m.x, m.y, r.ang, 1,
        { spent: REVOLVER_SHOTS - r.left, recoil: r.recoil });
    }

    // ── Supercritical ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.now >= s.superUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      if (s.armourAt) {
        // Plates off: the operative is the source, and the ring drawn is the ring that doses.
        criticalAura(g, this.col(owner), f.x, f.y, SUPER_AURA_R, 0.85, this.vizT);
      } else {
        // The seams open over the last 600ms of the whole window — the warning that the eight
        // seconds are nearly up, which is when the come-down matters most.
        const cracked = Phaser.Math.Clamp((600 - (s.superUntil - this.now)) / 600, 0, 1);
        leadArmour(g, this.col(owner), f.x, f.y, 0.95, this.vizT, { clamp: 1, cracked });
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
      const full = IRRADIATED_MS * IRRADIATED_SCALE[d.level];
      const left = Phaser.Math.Clamp((d.until - this.now) / full, 0, 1);
      // Level 2 is yellow and level 3 is red, so the ladder is legible without reading a number.
      const tint = this.hot(d.by, d.level >= 3 ? 1 : d.level === 2 ? 0.45 : 0);
      trefoil(g, tint, v.x, v.y - 34, 6.5 + (d.level - 1) * 1.4,
        0.55 + 0.35 * Math.sin(this.vizT * (5 + d.level * 2)),
        { phase: this.vizT * 1.6 * d.level, color: RAD.neonLit });
      g.fillStyle(tint(RAD.neonDeep), 0.5);
      g.fillRect(v.x - 15, v.y - 26, 30, 2.4);
      g.fillStyle(tint(RAD.neon), 0.95);
      g.fillRect(v.x - 15, v.y - 26, 30 * left, 2.4);
      if (d.level > 1) doseTicks(g, tint, v.x + 22, v.y - 32, d.level, 0.95);

      // ── Level 3: the arm ──
      if (d.level < 3) continue;
      // −1 → 0 is the wind-up behind the body, 0 → 1 is the swing coming through.
      const untilSlash = d.nextSlashAt - this.now;
      const wind = untilSlash > IRR3_WIND_MS
        ? Math.sin(this.vizT * 2.2) * 0.14
        : -Phaser.Math.Clamp(untilSlash / IRR3_WIND_MS, 0, 1);
      cancerArm(g, this.col(d.by), v.x, v.y, this.armAngle(v), 0.95, wind, this.vizT);
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
    // Rebuilt per frame rather than at construction: the same rectangle serves both versions of
    // the ability, and Final Vision's is red.
    this.tintRect.setFillStyle(this.hot('player', s.finalVision ? 1 : 0)(RAD.neon));
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
      // Supercritical reads the passive twice as hard, so the suit lights up as if the load were
      // still there — the seams are the buff, and while it holds they are worth double too.
      av.setDose(Math.min(1, this.charge(owner) * this.passiveMult(owner)));
      // Final Vision shrinks the fighter's own `sizeMult`; the rig has to follow it or the
      // sprite shrinks out from under a full-size character.
      av.setRigScale(this.shrunk.has(f) ? VISION_SHRINK : 1);
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
      name: this.doseName(dose.level).split(' ').map((w, i) => (i ? w : 'Irradiated')).join(' '),
      emoji: '☢️', color: this.doseColor(dose.level), priority: 5,
      description: dose.level >= 3
        ? `Every heal aimed at you lands as damage instead, you bleed ${IRR2_TICK_DAMAGE} a second, every good thing that lands on you runs out twice as fast — and you have grown an arm that opens you up for ${IRR3_SLASH_DAMAGE} and half a second on the floor every ${IRR3_SLASH_MS / 1000} seconds.`
        : dose.level === 2
          ? `Every heal aimed at you lands as damage instead, you bleed ${IRR2_TICK_DAMAGE} a second, and every good thing that lands on you from here runs out twice as fast.`
          : 'Every point of healing aimed at you from any source lands as damage instead. It does nothing else, and it does not have to.',
      until: dose.until,
      count: dose.level > 1 ? dose.level : undefined,
    } : null);

    this.api.setStatusIndicator('radiation-xray', playerIs && this.now < s.xrayUntil ? {
      name: s.finalVision ? 'Final Vision' : 'X-Ray Vision', emoji: '🦴',
      color: s.finalVision ? RAD.hot : RAD.neonLit, priority: 140,
      description: s.finalVision
        ? `Every enemy hitbox is ${Math.round((1 - VISION_SHRINK) * 100)}% *smaller* — nothing lands that was not aimed — and you are a third smaller with them. Every enemy is still drawn as its own skeleton whether it is visible or not, and three tracers on one body fire a held beam worth more than the railgun instead.`
        : `Seeing through lead. Every enemy is drawn as its own skeleton whether it is visible or not, and every enemy hitbox is ${Math.round((XRAY_HITBOX - 1) * 100)}% larger.`,
      until: s.xrayUntil,
    } : null);

    this.api.setStatusIndicator('radiation-beam', playerIs && s.beam ? {
      name: 'Final Vision Beam', emoji: '🔴', color: RAD.hot, priority: 139,
      description: `A held lance rather than a shot: ${BEAM_DPS} damage a second for ${BEAM_MS / 1000} seconds, climbing a rung of irradiation every ${BEAM_STEP_MS / 1000} seconds. Your Click is locked for the whole of it.`,
      until: s.beam.until,
    } : null);

    this.api.setStatusIndicator('radiation-supercritical', playerIs && this.now < s.superUntil ? {
      name: 'Supercritical', emoji: '☢️', color: RAD.core, priority: 142,
      description: s.armourAt
        ? `The lead is off. Everything within ${SUPER_AURA_R}px is irradiated once a second and climbs a rung every ${SUPER_AURA_STEP_MS / 1000} seconds — and the plates re-clamp ${SUPER_ARMOUR_REGEN_MS / 1000} seconds after they broke.`
        : `Critical Mission is read twice as hard, and a slab of lead is eating the next hit outright. Break it and you become the source until it re-clamps ${SUPER_ARMOUR_REGEN_MS / 1000} seconds later.`,
      until: s.superUntil,
    } : null);

    this.api.setStatusIndicator('radiation-meltdown', playerIs && s.meltdownUntil ? {
      name: 'Meltdown', emoji: '💀', color: RAD.hot, priority: 4,
      description: `Supercritical came down with nothing left holding it in. ${MELTDOWN_DAMAGE} damage every ${MELTDOWN_TICK_MS / 1000} seconds, and a level 3 dose on yourself.`,
      until: s.meltdownUntil,
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
    // A launched body is being driven by the kit, so the movement aggregate must not fight it.
    if (f && this.knocked.has(f)) return 0;
    if (f && this.stunned.has(f)) return 0;
    if (!this.isRadiation(owner)) return 1;
    return 1 + SPEED_BONUS * this.charge(owner) * this.passiveMult(owner);
  }

  /** Tracers already on the bot's target — the AI's cue for how badly a miss would hurt. */
  tracersOn(owner: Owner): number {
    const t = this.nearestTarget(owner);
    return t ? (this.side(owner).stuck.get(t)?.length ?? 0) : 0;
  }

  /** True while that side has the flare gun out and rounds left to place. */
  flaresOut(owner: Owner): boolean {
    return !!this.side(owner).flares;
  }

  /** True while the kit is throwing that side around — the AI must not fight it for the body. */
  isBusy(owner: Owner): boolean {
    const w = this.side(owner).waste;
    if (w && w.phase !== 'sweep') return true;
    // Final Vision's beam holds the operative's aim for its whole run; a bot that walked off
    // mid-lance would spend five seconds shooting a line at nothing.
    return !!this.side(owner).beam;
  }

  /** Whether the bot's target is already carrying a dose — decides what the baton is for. */
  targetIrradiated(owner: Owner): boolean {
    const t = this.nearestTarget(owner);
    return !!t && this.irradiated.has(t);
  }
}
