import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import { Sfx } from '../../audio';
import {
  LIFT, SND, SandAvatar, SandColorFn, SandFx, crown, flintlock, goldOrb, grains, laneDivider,
  lavaTide, pillar, poisonPatch, pyramidIdol, sandBeam, sandBridge,
} from './SandVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const TAU = Math.PI * 2;

// ── The height sim ───────────────────────────────────────────────────────────
/**
 * Height is a plain 1-D sim in `z`, entirely separate from the arena's 2-D physics: a fighter's
 * (x, y) never changes because of it. That is the whole trick that lets a parkour element live
 * in a top-down game — every other kit's collision, aim and AoE keep working untouched, and the
 * only thing that reads `z` is this file (plus the shadow that draws it).
 */
const GRAVITY = 900;
const JUMP_V = 384;
/** Apex of a standing jump, for reference when spacing a course: v²/2g ≈ 82. */
const JUMP_APEX = (JUMP_V * JUMP_V) / (2 * GRAVITY);
/** How close under a platform's lip you have to be, falling, for it to catch you. */
const LAND_GRACE = 26;
/** Above this counts as "in the air" for the Striker's damage tiers. */
const AIRBORNE_Z = 6;

// ── Sand Striker (Click) ─────────────────────────────────────────────────────
/**
 * The three tiers are *additive*, not exclusive, and that is the whole design of the button:
 * being off the floor is always worth something, and the top of the curve is being off the
 * floor *and* having built the thing you left. 30 flat-footed, 35 hopping, 40 stood on a
 * platform, 45 in the air off one.
 */
const SHOT_BASE = 30;
const SHOT_BONUS_PLATFORM = 10;
const SHOT_BONUS_AIR = 5;
const RELOAD_MS = 2000;
const RELOAD_GOLDEN_MS = 1000;

// ── Sandstone Ruins (E) ──────────────────────────────────────────────────────
const GOLDEN_MS = 8000;
/** The one price the short course charges: miss a pillar and you pay for it. */
const FALL_DAMAGE = 20;
const RUINS_LIFE_MS = 22000;

// ── Cursed Pyramid (R) ───────────────────────────────────────────────────────
const PYRAMID_LIFE_MS = 34000;
const PYRAMID_AWAKE_MS = 15000;
const PYRAMID_SHOT_MS = 900;
const PYRAMID_SHOT_DAMAGE = 16;
/**
 * The poison is meant to be the price of taking the *floor* between two pillars, so it charges
 * the moment you step in rather than on a timer you can outrun. Jumping it is still free, and
 * that is the only free route.
 */
const POISON_BITE = 12;
const POISON_DAMAGE = 9;
const POISON_TICK_MS = 600;
const COLLAPSE_DAMAGE = 35;
const COLLAPSE_RADIUS = 110;

// ── Sandwalk (F) ─────────────────────────────────────────────────────────────
const BRIDGE_LIFE_MS = 6000;
/** Adjacency, in pixels. Anything further than this is not a neighbour and gets no bridge. */
const BRIDGE_MAX_LEN = 180;
/** A bridge cast with no neighbouring platform: a plain conveyor strip on the floor. */
const BRIDGE_FLOOR_LEN = 170;
const BRIDGE_HALF_W = 26;
const BRIDGE_SPEED_MULT = 1.25;
const BRIDGE_CONVEYOR = 110;

// ── Final Trail (Q) ──────────────────────────────────────────────────────────
const TRAIL_DAMAGE = 70;
const TRAIL_STEPS_MIN = 10;
const TRAIL_STEPS_MAX = 12;
/**
 * How high the lava starts (below the floor) and how fast it climbs.
 *
 * Tuned against the bot, which is the pace the whole ability is balanced around: one slab every
 * ~1.17s (0.72s of flight plus its dwell), each slab ~32 units up, so it climbs at about 27
 * units a second. The lava at 20 is deliberately slower than that — it never beats a runner who
 * is actually *moving*, and it takes roughly five slabs' worth of hesitation before it has you.
 * It reaches the starting slab five and a half seconds in, so standing at the bottom reading the
 * course is not an option either.
 */
const LAVA_START_Z = -70;
const LAVA_RISE = 20;
/** The bot walks a shade under full speed: a clean run beats it, a sloppy one does not. */
const TRAIL_BOT_PACE = 0.9;
/** How long a bot gathers itself on a slab before hopping. The whole race is this number. */
const TRAIL_BOT_DWELL_MS = 450;
/** A dead man's switch. No trail outlives this, however badly both sides stall. */
const TRAIL_MAX_MS = 40000;

// ── Board ────────────────────────────────────────────────────────────────────

interface Platform {
  owner: Owner;
  courseId: number;
  /** Index along the course chain — the autopilot and the goal check both walk this. */
  idx: number;
  /** Screen position of the *top face*: you stand exactly where this is drawn. */
  x: number;
  y: number;
  r: number;
  z: number;
  grey: boolean;
  goal: boolean;
  seed: number;
  /** Cursed Pyramid only: a slow patrol the platform rides between two points. */
  move: { x0: number; y0: number; x1: number; y1: number; period: number; phase: number } | null;
}

interface Poison {
  owner: Owner;
  courseId: number;
  x: number;
  y: number;
  r: number;
  seed: number;
}

interface Course {
  id: number;
  owner: Owner;
  kind: 'ruins' | 'pyramid';
  expiresAt: number;
  claimed: boolean;
  /** Highest platform index the owner has actually stood on — the progress bar reads this. */
  reached: number;
  total: number;
}

/**
 * A Sandwalk deck. Held as a segment between two *points at two heights* rather than as a chain
 * of platforms: the whole thing — the ride, the slope, the shadow — falls out of a projection
 * onto that one segment, and a bridge to a slab 90 up is the same object as a strip on the floor.
 */
interface Bridge {
  owner: Owner;
  x1: number; y1: number; z1: number;
  x2: number; y2: number; z2: number;
  halfW: number;
  expiresAt: number;
  seed: number;
}

/** One runner's half of a Final Trail. */
interface TrailLane {
  fighter: Fighter;
  /** Bottom-to-top. `courseId` is negative, so no course teardown can ever reach these. */
  platforms: Platform[];
  /** Highest index this runner has stood on; also what the bot walks. */
  reached: number;
  /** The slab the bot has committed to landing on. This is why a bot cannot fall. */
  botTarget: Platform | null;
  /** Earliest the bot may hop again. Its dwell on each slab is the pace you are racing. */
  nextHopAt: number;
  /** Bots only. The player's lane is driven by the player. */
  bot: boolean;
  lost: boolean;
}

interface FinalTrail {
  caster: Owner;
  /** [caster's lane, rival's lane]. */
  lanes: TrailLane[];
  startedAt: number;
  /** Height of the lava's surface. Anything at or below it is caught. */
  lavaZ: number;
  crownTaken: Fighter | null;
  /** Set when somebody has won or fallen; the rig lingers a beat so the payoff is readable. */
  endsAt: number | null;
  courseId: number;
}

interface Beam {
  owner: Owner;
  x1: number; y1: number; x2: number; y2: number;
  bornAt: number;
  golden: boolean;
  seed: number;
}

interface Side {
  owner: Owner;
  z: number;
  vz: number;
  standing: Platform | null;
  /**
   * The course id of the last platform you left without landing on another one, or -1 for "you
   * are not falling off anything". This — not the height — is what makes a fall a *fall*: a hop
   * from the floor and back costs nothing, and neither does stepping off an orphaned slab.
   */
  fellFromCourse: number;
  /**
   * The deck you are currently riding, or null. A bridge is not a platform — it has no `idx`,
   * it never counts as course progress, and stepping off the side of one is never a fall.
   */
  onBridge: Bridge | null;
  /**
   * Whether the jump you are in the middle of left from a platform. This is what lets the
   * Striker's platform bonus survive the hop that earned it, so the two tiers can stack.
   */
  launchedFromPlatform: boolean;
  goldenUntil: number;
  nextShotAt: number;
  pyramidUntil: number;
  pyramidX: number;
  pyramidY: number;
  pyramidNextShotAt: number;
  /**
   * The slab the awakened idol is standing on, held by reference rather than by course id: the
   * course it came from is over, and re-casting R while the idol is still up starts a *new*
   * course that must not be torn down when this one's fifteen seconds run out.
   */
  pyramidPlatform: Platform | null;
  course: Course | null;
  aimX: number;
  aimY: number;
  poisonNextTickAt: number;
  /**
   * The patch you are currently standing in. Held by reference rather than as a timer, because
   * "have you *entered* one" is the question the bite asks — leaving and returning is two bites.
   */
  poisonIn: Poison | null;
}

function makeSide(owner: Owner): Side {
  return {
    owner, z: 0, vz: 0, standing: null, fellFromCourse: -1,
    onBridge: null, launchedFromPlatform: false, goldenUntil: 0, nextShotAt: 0,
    pyramidUntil: 0, pyramidX: 0, pyramidY: 0, pyramidNextShotAt: 0, pyramidPlatform: null,
    course: null, aimX: 0, aimY: 0, poisonNextTickAt: 0, poisonIn: null,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface SandArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /**
   * Sand's Space is a jump, not a dodge — ArenaScene hands the key over rather than running its
   * own dodge block, so the two can never both fire off one press.
   */
  get spaceKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Sand visual colour through that side's equipped skin. */
  duneColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── SandKit ──────────────────────────────────────────────────────────────────

export class SandKit implements SummonPurgeTarget {
  private api: SandArenaApi;

  // ── Visuals ──
  private readonly pcol: SandColorFn;
  private readonly ncol: SandColorFn;
  private readonly pfx: SandFx;
  private readonly nfx: SandFx;
  private playerAvatar: SandAvatar | null = null;
  private npcAvatar: SandAvatar | null = null;
  /** Platforms, poison and courses: under the fighters, because you stand on top of them. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Beams, orbs, worms, storms: over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private platforms: Platform[] = [];
  private poisons: Poison[] = [];
  private bridges: Bridge[] = [];
  private beams: Beam[] = [];
  private courseSeq = 0;
  /** One at a time, arena-wide: the Final Trail owns the whole room while it runs. */
  private trail: FinalTrail | null = null;
  private trailSeq = 0;

  constructor(api: SandArenaApi) {
    this.api = api;
    this.pcol = (base) => api.duneColor('player', base);
    this.ncol = (base) => api.duneColor('npc', base);
    this.pfx = new SandFx(api.scene, this.pcol);
    this.nfx = new SandFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): SandFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): SandColorFn { return owner === 'player' ? this.pcol : this.ncol; }
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

  private isSand(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'dune' : this.api.npcElementId === 'dune';
  }

  private avatar(owner: Owner): SandAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.platforms = [];
    this.poisons = [];
    this.bridges = [];
    this.beams = [];
    this.trail = null;
    this.courseSeq = 0;
    this.trailSeq = 0;
    this.vizT = 0;

    this.playerAvatar?.destroy();
    this.npcAvatar?.destroy();
    this.playerAvatar = null;
    this.npcAvatar = null;
    this.groundGfx?.destroy();
    this.airGfx?.destroy();
    this.groundGfx = null;
    this.airGfx = null;

    for (const id of [
      'dune-height', 'dune-golden', 'dune-bridge', 'dune-pyramid', 'dune-course', 'dune-trail',
    ]) this.api.setStatusIndicator(id, null);
  }

  private ensureLayers(): void {
    if (!this.groundGfx) this.groundGfx = this.api.scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = this.api.scene.add.graphics().setDepth(9);
  }

  // ── Height sim ─────────────────────────────────────────────────────────────

  /** The platform a side is standing over, if any — nearest wins when two overlap. */
  private platformUnder(owner: Owner, x: number, y: number, z: number, grace: number): Platform | null {
    let best: Platform | null = null;
    let bestZ = -Infinity;
    for (const p of this.platforms) {
      if (p.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) > p.r) continue;
      // Only a platform at or below you can catch you, and of those the highest wins.
      if (p.z > z + grace) continue;
      if (p.z <= bestZ) continue;
      bestZ = p.z;
      best = p;
    }
    return best;
  }

  /**
   * The height of a bridge's deck under a point, plus the deck itself — or null if the point is
   * not over one. A bridge is a segment, so this is a projection: `t` along it gives the slope's
   * height at that spot for free, which is what makes a bridge to a tall slab work at all.
   */
  private bridgeUnder(owner: Owner, x: number, y: number): { bridge: Bridge; z: number } | null {
    let best: { bridge: Bridge; z: number } | null = null;
    for (const b of this.bridges) {
      if (b.owner !== owner) continue;
      const dx = b.x2 - b.x1;
      const dy = b.y2 - b.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      const t = Phaser.Math.Clamp(((x - b.x1) * dx + (y - b.y1) * dy) / len2, 0, 1);
      const px = b.x1 + dx * t;
      const py = b.y1 + dy * t;
      if (Phaser.Math.Distance.Between(x, y, px, py) > b.halfW) continue;
      const z = b.z1 + (b.z2 - b.z1) * t;
      if (best && best.z >= z) continue;
      best = { bridge: b, z };
    }
    return best;
  }

  /** Space, or the npc autopilot deciding to hop. Refused in mid-air: there is no double jump. */
  private tryJump(owner: Owner): boolean {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    // A deck is its own kind of standing, and jumping off one just leaves it.
    const grounded = s.standing !== null || s.onBridge !== null || (s.z <= AIRBORNE_Z && s.vz === 0);
    if (!grounded) return false;

    // The Striker's platform bonus rides the jump out. A deck counts if it was itself up in the
    // air — a strip on the floor is the floor.
    s.launchedFromPlatform = s.standing !== null || (s.onBridge !== null && s.z > AIRBORNE_Z);
    if (s.standing) s.fellFromCourse = s.standing.courseId;
    s.standing = null;
    s.onBridge = null;
    s.vz = JUMP_V;
    this.avatar(owner)?.play('dash', s.aimX !== 0 || s.aimY !== 0
      ? Math.atan2(s.aimY - f.y, s.aimX - f.x) : 0);
    // At the feet, not at the shadow: the fighter is drawn standing on the top face, and the
    // top face is where the sprite already is. Height only ever moves shadows.
    this.fx(owner).puff(f.x, f.y + 14, 7, 12, 380);
    Sfx.playAt('jump', f.x, { rate: 1.15, volume: 0.5 });
    return true;
  }

  private updateHeight(owner: Owner, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) {
      s.z = 0; s.vz = 0; s.standing = null; s.onBridge = null; s.fellFromCourse = -1;
      return;
    }
    const dt = delta / 1000;

    // ── Riding a deck ──
    // A bridge catches you from above, holds you at its own sloped height, and — the whole
    // point of the ability — walking off the *side* of one is never a fall, because passage is
    // what the deck promised you.
    const deck = this.bridgeUnder(owner, f.x, f.y);
    if (deck) {
      // A slab level with the deck adopts you off it. That is how a bridge *delivers*: reaching
      // a goal across one still lands on it, still counts, still claims the course.
      const onto = this.platformUnder(owner, f.x, f.y, deck.z + LAND_GRACE, LAND_GRACE);
      if (onto && onto.z >= deck.z - LAND_GRACE) {
        s.onBridge = null;
        if (s.standing !== onto) this.landOn(owner, onto);
        return;
      }
      const eligible = s.onBridge !== null
        || (s.standing !== null && deck.z >= s.standing.z - 2)
        || (s.standing === null && s.vz <= 0 && s.z <= deck.z + LAND_GRACE);
      if (eligible) {
        if (s.onBridge !== deck.bridge && s.vz < -60) {
          this.fx(owner).puff(f.x, f.y + 14, 5, 11, 300, SND.stoneWarmLit);
          Sfx.playAt('land', f.x, { rate: 1.3, volume: 0.4 });
        }
        s.z = deck.z;
        s.vz = 0;
        s.standing = null;
        s.onBridge = deck.bridge;
        s.fellFromCourse = -1;
        s.launchedFromPlatform = false;
        return;
      }
    }
    // Walked off the end, or it expired underneath you: plain physics from here.
    s.onBridge = null;

    // ── Standing ──
    if (s.standing) {
      const p = s.standing;
      // Walked off the edge, or the platform under you was destroyed.
      if (!this.platforms.includes(p) || Phaser.Math.Distance.Between(f.x, f.y, p.x, p.y) > p.r) {
        s.standing = null;
        s.fellFromCourse = p.courseId;
        s.vz = 0;
      } else {
        // Still on it. A sliding platform's own step moved the body for us already — see
        // `updateMovingPlatforms` — so all that is left is to sit at its height.
        s.z = p.z;
        s.vz = 0;
        return;
      }
    }

    // ── Falling / rising ──
    const prevZ = s.z;
    s.vz -= GRAVITY * dt;
    s.z += s.vz * dt;

    if (s.vz <= 0) {
      // A Final Trail bot lands where it aimed, full stop. Its jump was committed to a specific
      // slab, and once it has fallen to that slab's height it is put on it and snapped to the
      // middle — which is what makes "the bots never fall" true by construction rather than by
      // tuning. Nothing gives the player this.
      const aimed = this.trailBotTarget(owner);
      if (aimed && s.z <= aimed.z && this.platforms.includes(aimed)) {
        f.setPosition(aimed.x, aimed.y);
        this.landOn(owner, aimed);
        return;
      }
      const landing = this.platformUnder(owner, f.x, f.y, prevZ + LAND_GRACE, LAND_GRACE);
      if (landing && s.z <= landing.z) {
        this.landOn(owner, landing);
        return;
      }
    }

    if (s.z <= 0) {
      s.z = 0;
      s.vz = 0;
      s.launchedFromPlatform = false;
      const punished = this.fallIsPunished(s);
      s.fellFromCourse = -1;
      if (punished) {
        // The one price the courses charge. Falling *onto the floor* is the fall; landing on
        // another pillar, however ugly, is a landing.
        this.fx(owner).puff(f.x, f.y + 14, 12, 18, 460, SND.dark);
        Sfx.playAt('land', f.x, { rate: 0.8, volume: 0.6 });
        f.takeDamage(FALL_DAMAGE, { selfInflicted: true });
        this.api.showFloatingText(f.x, f.y - 42, 'FELL', this.hex(SND.expire));
      } else if (prevZ > AIRBORNE_Z) {
        this.fx(owner).puff(f.x, f.y + 14, 6, 12, 320);
        Sfx.playAt('land', f.x, { rate: 1.05, volume: 0.4 });
      }
    }
  }

  /**
   * A fall only costs you while the course you fell off is *unfinished*.
   *
   * Once the orb or the idol is in hand the obby has been beaten, and the kit then pulls the
   * whole thing back into the floor on purpose — charging 20 for the drop it just dropped you
   * into would be punishing the player for succeeding. Same for a slab that belongs to no live
   * course at all (the awakened idol's, or wreckage a storm left standing): stepping off one of
   * those is a step, not a mistake.
   */
  private fallIsPunished(s: Side): boolean {
    if (s.fellFromCourse < 0) return false;
    const c = s.course;
    return !!c && c.id === s.fellFromCourse && !c.claimed;
  }

  private landOn(owner: Owner, p: Platform): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.z = p.z;
    s.vz = 0;
    s.standing = p;
    s.onBridge = null;
    s.fellFromCourse = -1;
    s.launchedFromPlatform = false;
    this.fx(owner).puff(f.x, f.y + 14, 6, 13, 320, SND.stoneWarmLit);
    Sfx.playAt('land', f.x, { rate: 1.2, volume: 0.45 });

    // A Final Trail slab belongs to a lane, not to a course — climbing one is progress toward
    // the crown, and standing on the crown's own slab is the win.
    const lane = this.laneOfPlatform(p);
    if (lane) {
      if (lane.fighter === f) {
        if (p.idx > lane.reached) lane.reached = p.idx;
        if (lane.botTarget === p) lane.botTarget = null;
        lane.nextHopAt = this.now + TRAIL_BOT_DWELL_MS;
        if (p.goal) this.takeCrown(lane);
      }
      return;
    }

    const c = s.course;
    if (!c || p.courseId !== c.id) return;
    if (p.idx > c.reached) c.reached = p.idx;
    if (p.goal && !c.claimed) this.claimCourse(owner, c, p);
  }

  // ── Course generation ──────────────────────────────────────────────────────

  /**
   * Both courses are the same walk: start somewhere with room around it, then step out in a
   * direction that wanders, laying one platform per step and lifting each above the last by
   * less than a jump's apex. Nothing here can generate a gap you cannot clear — the step
   * lengths and the rises are both drawn from ranges bounded by the jump arc, which is the
   * only guarantee a random obby actually needs.
   */
  private buildCourse(owner: Owner, kind: 'ruins' | 'pyramid'): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.clearCourse(owner, false);

    const id = ++this.courseSeq;
    const long = kind === 'pyramid';
    const steps = long ? 8 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2);
    const c: Course = {
      id, owner, kind, claimed: false, reached: -1, total: steps + 1,
      expiresAt: this.now + (long ? PYRAMID_LIFE_MS : RUINS_LIFE_MS),
    };
    this.side(owner).course = c;

    // Start next to the caster but not underneath them, and aim the chain into open floor.
    let ang = Math.atan2(this.api.height / 2 - f.y, this.api.width / 2 - f.x)
      + (Math.random() - 0.5) * 1.2;
    let x = Phaser.Math.Clamp(f.x + Math.cos(ang) * 92, this.left + 60, this.right - 60);
    let y = Phaser.Math.Clamp(f.y + Math.sin(ang) * 92, this.top + 60, this.bottom - 60);
    let z = 58;

    // The grey block: the only one you can reach from the floor, and coloured to say so.
    this.addPlatform(owner, id, 0, x, y, 34, z, true, false, null);

    for (let i = 1; i <= steps; i++) {
      ang += (Math.random() - 0.5) * 1.5;
      // The gaps are bounded by the jump arc, not by taste. A hop that rises `d` is only
      // catchable on the way *down*, at t = (v + √(v²−2gd))/g; at the steepest rise this
      // generator will produce that is 0.67s of hang time, or 133px at the player's 200px/s.
      // Every gap below sits under that, with the platform radii as further slack.
      const gap = long ? 92 + Math.random() * 30 : 88 + Math.random() * 24;
      let nx = x + Math.cos(ang) * gap;
      let ny = y + Math.sin(ang) * gap;
      // Bounce off the walls rather than clamping, so a course never bunches up in a corner.
      if (nx < this.left + 50 || nx > this.right - 50) { ang = Math.PI - ang; nx = x + Math.cos(ang) * gap; }
      if (ny < this.top + 50 || ny > this.bottom - 50) { ang = -ang; ny = y + Math.sin(ang) * gap; }
      x = Phaser.Math.Clamp(nx, this.left + 50, this.right - 50);
      y = Phaser.Math.Clamp(ny, this.top + 50, this.bottom - 50);
      // Never rise by more than the jump can carry, with a margin for the landing lip.
      z += 26 + Math.random() * Math.min(30, JUMP_APEX - 40);

      const goal = i === steps;
      const r = goal ? 40 : (long ? 25 + Math.random() * 6 : 29 + Math.random() * 5);
      // Cursed Pyramid only: about a third of the run slides, and the goal never does.
      const moving = long && !goal && Math.random() < 0.34;
      // Amplitude kept well under the jump's horizontal reach: a slab that could wander further
      // than you can throw yourself would make its own course unclearable at the wrong phase.
      const move = moving ? {
        x0: x, y0: y,
        x1: Phaser.Math.Clamp(x + Math.cos(ang + Math.PI / 2) * 52, this.left + 50, this.right - 50),
        y1: Phaser.Math.Clamp(y + Math.sin(ang + Math.PI / 2) * 52, this.top + 50, this.bottom - 50),
        period: 2600 + Math.random() * 1400,
        phase: Math.random() * TAU,
      } : null;
      this.addPlatform(owner, id, i, x, y, r, z, false, goal, move);

      // Poison sunk into the floor *across* the gap, not beside it. Sized to span the ground
      // between the two pillars it sits between, so the floor route is genuinely closed and
      // jumping the pillars is the only way through that costs nothing.
      if (long && !goal) {
        const px = x - Math.cos(ang) * gap * 0.5;
        const py = y - Math.sin(ang) * gap * 0.5;
        this.poisons.push({
          owner, courseId: id, x: px, y: py,
          r: Phaser.Math.Clamp(gap * 0.42, 34, 56), seed: Math.random() * 999,
        });
      }
    }

    Sfx.playAt('stone-rise', f.x, { rate: long ? 0.8 : 1.0, volume: 0.8 });
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 46,
        long ? 'CURSED PYRAMID' : 'SANDSTONE RUINS', this.hex(long ? SND.gold : SND.stoneWarmLit));
    }
  }

  private addPlatform(
    owner: Owner, courseId: number, idx: number,
    x: number, y: number, r: number, z: number,
    grey: boolean, goal: boolean, move: Platform['move'],
  ): void {
    this.platforms.push({ owner, courseId, idx, x, y, r, z, grey, goal, seed: Math.random() * 999, move });
    this.fx(owner).rise(x, y, r, z, grey);
  }

  /** Take everything belonging to a side's course off the board. */
  private clearCourse(owner: Owner, collapse: boolean): void {
    const c = this.side(owner).course;
    if (!c) return;
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      if (p.courseId !== c.id) continue;
      if (collapse) this.fx(owner).collapse(p.x, p.y, p.z, p.r, p.grey);
      this.platforms.splice(i, 1);
    }
    this.poisons = this.poisons.filter((p) => p.courseId !== c.id);
    this.side(owner).course = null;
    this.dropOrphanedRiders();
  }

  /** Reaching the last platform: the orb, or the idol waking up. */
  private claimCourse(owner: Owner, c: Course, goal: Platform): void {
    c.claimed = true;
    const f = this.fighter(owner);
    const time = this.now;

    if (c.kind === 'ruins') {
      const s = this.side(owner);
      s.goldenUntil = time + GOLDEN_MS;
      this.avatar(owner)?.setGolden(true);
      this.fx(owner).blast(goal.x, goal.y, 60, SND.gold);
      Sfx.playAt('reward-big', f.x, { rate: 1.1, volume: 0.8 });
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 46, 'GOLDEN SAND', this.hex(SND.gold));
      // The course has paid out; it goes back into the floor rather than cluttering the arena.
      this.api.scene.time.delayedCall(140, () => { if (this.side(owner).course === c) this.clearCourse(owner, true); });
      return;
    }

    const s = this.side(owner);
    s.pyramidUntil = time + PYRAMID_AWAKE_MS;
    s.pyramidX = goal.x;
    s.pyramidY = goal.y;
    s.pyramidNextShotAt = time + 400;
    // Orphan the idol's slab out of the course before the rest of it comes down, so R can be
    // cast again immediately without the new course inheriting this one's teardown.
    goal.courseId = -1;
    s.pyramidPlatform = goal;
    this.fx(owner).blast(goal.x, goal.y, 90, SND.goldHot);
    Sfx.playAt('holy-chord', f.x, { rate: 0.85, volume: 0.9 });
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 46, 'PYRAMID AWAKENED', this.hex(SND.goldHot));
    // Everything but the idol's own slab comes down — the reward is the turret, not the course,
    // and a course left standing in the way of your own worm is a liability.
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      if (p.courseId !== c.id) continue;
      this.fx(owner).collapse(p.x, p.y, p.z, p.r, p.grey);
      this.platforms.splice(i, 1);
    }
    this.poisons = this.poisons.filter((p) => p.courseId !== c.id);
    s.course = null;
    this.dropOrphanedRiders();
  }

  /**
   * Called after anything leaves `platforms`. Anybody standing on a slab that is no longer on
   * the board is now standing on nothing — and an idol whose slab was knocked out from under it
   * goes quiet, which is the counterplay to the R: knock the thing it is standing on down.
   */
  private dropOrphanedRiders(): void {
    for (const o of ['player', 'npc'] as Owner[]) {
      const s = this.sides[o];
      if (s.standing && !this.platforms.includes(s.standing)) {
        s.fellFromCourse = s.standing.courseId;
        s.standing = null;
      }
      if (s.onBridge && !this.bridges.includes(s.onBridge)) s.onBridge = null;
      if (s.pyramidPlatform && !this.platforms.includes(s.pyramidPlatform)) {
        s.pyramidPlatform = null;
        s.pyramidUntil = 0;
      }
    }
  }

  // ── Collapsing a platform ──────────────────────────────────────────────────

  /**
   * A platform coming down under a storm or a worm. It detonates where it stood and hurts
   * whoever is beside it — including its own builder, who put it there.
   */
  private collapsePlatform(p: Platform, attacker: Owner): void {
    const i = this.platforms.indexOf(p);
    if (i < 0) return;
    this.platforms.splice(i, 1);
    this.fx(attacker).collapse(p.x, p.y, p.z, p.r, p.grey);
    this.fx(attacker).blast(p.x, p.y, COLLAPSE_RADIUS);
    Sfx.playAt('stone-slam', p.x, { rate: 0.9, volume: 0.7 });

    for (const t of this.targetsOf(attacker)) {
      if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > COLLAPSE_RADIUS) continue;
      t.takeDamage(COLLAPSE_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, SND.deep);
    }
    this.dropOrphanedRiders();
  }

  // ── Sand Striker ───────────────────────────────────────────────────────────

  private reloadMs(owner: Owner): number {
    return this.now < this.side(owner).goldenUntil ? RELOAD_GOLDEN_MS : RELOAD_MS;
  }

  /**
   * The two bonuses stack, and stacking them is the element's ceiling: a shot fired in the air
   * off something you built is worth half again what a flat-footed one is. `launchedFromPlatform`
   * is what carries the platform half of it through the jump that left the platform.
   */
  private shotDamage(owner: Owner): number {
    const s = this.side(owner);
    const onPlatform = s.standing !== null || s.launchedFromPlatform
      || (s.onBridge !== null && s.z > AIRBORNE_Z);
    const inAir = s.standing === null && s.onBridge === null && s.z > AIRBORNE_Z;
    return SHOT_BASE + (onPlatform ? SHOT_BONUS_PLATFORM : 0) + (inAir ? SHOT_BONUS_AIR : 0);
  }

  doStriker(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    s.aimX = tx;
    s.aimY = ty;
    if (this.now < s.nextShotAt) return;
    s.nextShotAt = this.now + this.reloadMs(owner);

    const av = this.avatar(owner);
    // Two different angles, and conflating them is what makes a hitscan weapon "sometimes miss".
    // `aim` is where the *character* is pointing — the gesture, the recoil, the drawn barrel.
    const aim = Math.atan2(ty - f.y, tx - f.x);
    av?.play('punch', aim);
    av?.fireRecoil();

    const m = av?.muzzle();
    const mx = m?.x ?? f.x + Math.cos(aim) * 20;
    const my = m?.y ?? f.y + Math.sin(aim) * 20;

    // `ang` is where the *shot* goes, and it is measured from the barrel rather than from the
    // body. The gun is held out to one side on a spring, so firing along `aim` would send the
    // beam down a line merely *parallel* to the one the player drew, offset by however far the
    // hand had swung — which is a clean miss on anything the width of a fighter. Measuring from
    // the muzzle instead makes the beam pass exactly through the cursor, always.
    const toCursor = Math.hypot(tx - mx, ty - my);
    const ang = toCursor > 12 ? Math.atan2(ty - my, tx - mx) : aim;

    // Reach: the far wall. The beam is hitscan, so "range" is only ever about what is in the way.
    const reach = Math.hypot(this.api.width, this.api.height);
    let endX = mx + Math.cos(ang) * reach;
    let endY = my + Math.sin(ang) * reach;

    // First thing on the line wins.
    let bestT = Infinity;
    let hitFighter: Fighter | null = null;

    for (const t of this.targetsOf(owner)) {
      const d = this.rayCircle(mx, my, ang, t.x, t.y, 20 * t.sizeMult * t.hitboxMult + 4);
      if (d !== null && d < bestT) { bestT = d; hitFighter = t; }
    }

    const golden = this.now < s.goldenUntil;
    if (bestT < Infinity) {
      endX = mx + Math.cos(ang) * bestT;
      endY = my + Math.sin(ang) * bestT;
    }
    this.beams.push({ owner, x1: mx, y1: my, x2: endX, y2: endY, bornAt: this.now, golden, seed: Math.random() * 999 });
    Sfx.playAt('musket', f.x, { rate: golden ? 1.15 : 0.95, volume: 0.75 });

    if (hitFighter) {
      const dmg = this.shotDamage(owner);
      hitFighter.takeDamage(dmg);
      this.api.spawnHitFlash(hitFighter.x, hitFighter.y, golden ? SND.gold : SND.sand);
      this.fx(owner).ping(endX, endY, 20, golden ? SND.gold : SND.sand);
    } else {
      this.fx(owner).puff(endX, endY, 5, 9, 300);
    }
  }

  /**
   * Distance along a ray to the first intersection with a circle, or null. Standard quadratic —
   * the ray's direction is a unit vector, so `b` and `c` fall straight out of the dot products
   * and there is nothing to normalise afterwards.
   */
  private rayCircle(
    ox: number, oy: number, ang: number, cx: number, cy: number, r: number,
  ): number | null {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const fx = ox - cx, fy = oy - cy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    const disc = b * b - 4 * c;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / 2;
    const t2 = (-b + sq) / 2;
    if (t1 >= 0) return t1;
    if (t2 >= 0) return 0;
    return null;
  }

  // ── Sandwalk ───────────────────────────────────────────────────────────────

  /**
   * A deck between here and the neighbouring slab under the cursor.
   *
   * Adjacency is the whole restriction: a bridge is a *step*, not a shortcut, so it will only
   * ever reach a platform already within one gap of where you are standing. With nothing in
   * range it lays a plain strip on the floor instead — same conveyor, same 25%, no altitude —
   * which is what makes the button worth pressing before you have built anything at all.
   */
  doSandwalk(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    const from = s.standing;
    const x1 = from ? from.x : f.x;
    const y1 = from ? from.y : f.y;
    const z1 = from ? from.z : (s.onBridge ? s.z : 0);

    // Nearest *to the cursor*, not to the caster: the cursor is how you choose which neighbour.
    let dest: Platform | null = null;
    let bestD = Infinity;
    for (const p of this.platforms) {
      if (p.owner !== owner || p === from) continue;
      if (Phaser.Math.Distance.Between(x1, y1, p.x, p.y) > BRIDGE_MAX_LEN) continue;
      const d = Phaser.Math.Distance.Between(tx, ty, p.x, p.y);
      if (d >= bestD) continue;
      bestD = d;
      dest = p;
    }

    let x2: number, y2: number, z2: number;
    if (dest) {
      x2 = dest.x; y2 = dest.y; z2 = dest.z;
    } else {
      const ang = Math.atan2(ty - y1, tx - x1);
      x2 = Phaser.Math.Clamp(x1 + Math.cos(ang) * BRIDGE_FLOOR_LEN, this.left, this.right);
      y2 = Phaser.Math.Clamp(y1 + Math.sin(ang) * BRIDGE_FLOOR_LEN, this.top, this.bottom);
      z2 = z1;
    }

    // One deck per side. A second cast moves it rather than laying a lattice.
    this.bridges = this.bridges.filter((b) => b.owner !== owner);
    this.bridges.push({
      owner, x1, y1, z1, x2, y2, z2,
      halfW: BRIDGE_HALF_W, expiresAt: this.now + BRIDGE_LIFE_MS, seed: Math.random() * 999,
    });
    this.dropOrphanedRiders();

    this.avatar(owner)?.play('sweep', Math.atan2(y2 - y1, x2 - x1));
    this.fx(owner).puff((x1 + x2) / 2, (y1 + y2) / 2, 14, 26, 460, SND.stoneWarmLit);
    Sfx.playAt('stone-rise', f.x, { rate: 1.25, volume: 0.7 });
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 46, dest ? 'SANDWALK' : 'SAND CONVEYOR',
        this.hex(SND.stoneWarmLit));
    }
  }

  private updateBridges(): void {
    const time = this.now;
    let dropped = false;
    for (let i = this.bridges.length - 1; i >= 0; i--) {
      const b = this.bridges[i];
      if (time < b.expiresAt) continue;
      this.fx(b.owner).puff((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, 18, 34, 520, SND.deep);
      this.bridges.splice(i, 1);
      dropped = true;
    }
    if (dropped) this.dropOrphanedRiders();
  }

  /**
   * The ride. Run from `update()` — which ArenaScene calls *after* WASD and the npc AI have both
   * already written a velocity for the frame — so this is a deliberate override rather than a
   * contribution: whatever you were doing, it is now 25% faster and being carried toward the far
   * end of the deck.
   */
  private applyBridgeMotion(): void {
    for (const o of ['player', 'npc'] as Owner[]) {
      const s = this.sides[o];
      const b = s.onBridge;
      const f = this.fighter(o);
      if (!b || !this.alive(f)) continue;
      const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
      if (len < 1) continue;
      const body = this.body(f);
      body.setVelocity(
        body.velocity.x * BRIDGE_SPEED_MULT + ((b.x2 - b.x1) / len) * BRIDGE_CONVEYOR,
        body.velocity.y * BRIDGE_SPEED_MULT + ((b.y2 - b.y1) / len) * BRIDGE_CONVEYOR,
      );
    }
  }

  // ── Final Trail ────────────────────────────────────────────────────────────

  /** 'player' / 'npc' for the two fighters the height sim can actually carry, else null. */
  private ownerOf(f: Fighter): Owner | null {
    if (f === this.api.player) return 'player';
    if (f === this.api.npc) return 'npc';
    return null;
  }

  private laneOf(f: Fighter): TrailLane | null {
    return this.trail?.lanes.find((l) => l.fighter === f) ?? null;
  }

  private laneOfPlatform(p: Platform): TrailLane | null {
    return this.trail?.lanes.find((l) => l.platforms.includes(p)) ?? null;
  }

  /** The slab a bot has committed to. Read by the height sim to guarantee the landing. */
  private trailBotTarget(owner: Owner): Platform | null {
    const lane = this.laneOf(this.fighter(owner));
    return lane && lane.bot ? lane.botTarget : null;
  }

  /** Whether this side is one of the two runners — the gate that gives a non-Sand rival a jump. */
  private trailInvolves(owner: Owner): boolean {
    return !!this.laneOf(this.fighter(owner));
  }

  /**
   * Two courses, one race, one crown each, and lava coming up under both of them.
   *
   * Nothing else in the kit takes the whole arena, and nothing else can hurt the caster this
   * badly: whoever reaches their crown second — or falls, or lets the lava have them — pays 70.
   * That is deliberately symmetrical. The Sand player is betting they climb better.
   */
  doFinalTrail(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.trail) return;

    // The nearest enemy, and it has to be one the height sim can carry — a lane needs somewhere
    // to keep its runner's `z`, and only the two fighters have that.
    let rival: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d >= bestD) continue;
      bestD = d;
      rival = t;
    }
    if (!rival || this.ownerOf(rival) === null) {
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 46, 'NO RIVAL', this.hex(SND.expire));
      return;
    }

    // Clear the room. Half-built courses, decks and idols would all be cover somebody did not
    // earn inside a race, and a leftover slab in a lane is a step nobody generated.
    for (const o of ['player', 'npc'] as Owner[]) {
      this.clearCourse(o, true);
      this.sides[o].pyramidUntil = 0;
      this.sides[o].pyramidPlatform = null;
    }
    this.bridges = [];
    this.platforms = this.platforms.filter((p) => {
      this.fx(p.owner).collapse(p.x, p.y, p.z, p.r, p.grey);
      return false;
    });
    this.poisons = [];
    this.dropOrphanedRiders();

    const courseId = -(++this.trailSeq) - 1;
    const mid = this.api.width / 2;
    const casterLeft = f.x <= mid;
    const casterLane = this.buildTrailLane(
      f, owner, courseId,
      casterLeft ? this.left + 40 : mid + 30, casterLeft ? mid - 30 : this.right - 40,
      owner === 'npc',
    );
    const rivalOwner = this.ownerOf(rival)!;
    const rivalLane = this.buildTrailLane(
      rival, rivalOwner, courseId,
      casterLeft ? mid + 30 : this.left + 40, casterLeft ? this.right - 40 : mid - 30,
      rivalOwner === 'npc',
    );

    this.trail = {
      caster: owner, lanes: [casterLane, rivalLane], startedAt: this.now,
      lavaZ: LAVA_START_Z, crownTaken: null, endsAt: null, courseId,
    };

    for (const lane of this.trail.lanes) this.placeOnStart(lane);

    Sfx.playAt('holy-chord', f.x, { rate: 0.7, volume: 1 });
    Sfx.playAt('quake', f.x, { rate: 0.5, volume: 0.9 });
    this.api.showFloatingText(this.api.width / 2, this.api.height / 2 - 60,
      'FINAL TRAIL', this.hex(SND.goldHot));
  }

  /**
   * One lane. Same walk as `buildCourse` and bounded by the same jump arc, but confined to a
   * vertical strip of the arena and climbing all the way to a crown. The two lanes roll their
   * own randomness, so they are the same difficulty and never the same course.
   */
  private buildTrailLane(
    fighter: Fighter, owner: Owner, courseId: number,
    minX: number, maxX: number, bot: boolean,
  ): TrailLane {
    const steps = TRAIL_STEPS_MIN + Math.floor(Math.random() * (TRAIL_STEPS_MAX - TRAIL_STEPS_MIN + 1));
    const platforms: Platform[] = [];

    // The lane serpentines *up the screen* rather than wandering: it has a fixed number of
    // slabs and a fixed strip to fit them in, so the vertical budget is divided evenly and
    // each step spends the rest of its gap going sideways, flipping direction at the walls.
    // Wandering freely would pile the last four slabs against the top edge on top of each other.
    const yBottom = this.bottom - 55;
    const yTop = this.top + 60;
    const dyStep = (yBottom - yTop) / steps;

    let x = (minX + maxX) / 2 + (Math.random() - 0.5) * (maxX - minX) * 0.4;
    let y = yBottom;
    let z = 40;
    let dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

    const push = (px: number, py: number, r: number, pz: number, goal: boolean, move: Platform['move']) => {
      const p: Platform = {
        owner, courseId, idx: platforms.length, x: px, y: py, r, z: pz,
        grey: platforms.length === 0, goal, seed: Math.random() * 999, move,
      };
      platforms.push(p);
      this.platforms.push(p);
      this.fx(owner).rise(px, py, r, pz, p.grey);
    };

    push(x, y, 34, z, false, null);

    for (let i = 1; i <= steps; i++) {
      const dy = -dyStep * (0.85 + Math.random() * 0.3);
      // Total gap bounded by the jump arc *and* by how far the bot travels in one hop (~130px),
      // so a lane is always clearable by hand and always clearable by machine. Whatever the
      // vertical step does not spend, the horizontal step does.
      const want = 88 + Math.random() * 27;
      const dx = Math.sqrt(Math.max(400, want * want - dy * dy));
      // Turn at the walls rather than clamping into them: a clamped step is a short hop, and a
      // run of them is a stack of slabs sharing one edge of the strip.
      if (x + dir * dx < minX || x + dir * dx > maxX) dir = dir === 1 ? -1 : 1;
      x = Phaser.Math.Clamp(x + dir * dx, minX, maxX);
      y = Phaser.Math.Clamp(y + dy, yTop, yBottom);
      // Rise per slab, bounded by the jump apex with the landing lip's margin left over. Keep
      // this in step with `LAVA_RISE`: the lava is tuned against the climb rate it implies.
      z += 22 + Math.random() * Math.min(20, JUMP_APEX - 40);

      const goal = i === steps;
      const r = goal ? 38 : 24 + Math.random() * 6;
      // A third of the middle slabs slide. The amplitude stays well under a jump's reach, so a
      // patrol can never phase a lane into being unclearable.
      const moving = !goal && i > 1 && Math.random() < 0.33;
      const move = moving ? {
        x0: x, y0: y,
        x1: Phaser.Math.Clamp(x + (Math.random() < 0.5 ? -1 : 1) * 46, minX, maxX),
        y1: y,
        period: 2400 + Math.random() * 1600,
        phase: Math.random() * TAU,
      } : null;
      push(x, y, r, z, goal, move);
    }

    // A beat before the first hop, so both runners get a moment to read their lane.
    return {
      fighter, platforms, reached: 0, botTarget: null,
      nextHopAt: this.now + 700, bot, lost: false,
    };
  }

  private placeOnStart(lane: TrailLane): void {
    const o = this.ownerOf(lane.fighter);
    const start = lane.platforms[0];
    if (!o || !start) return;
    const s = this.sides[o];
    lane.fighter.setPosition(start.x, start.y);
    this.body(lane.fighter).setVelocity(0, 0);
    s.z = start.z;
    s.vz = 0;
    s.standing = start;
    s.onBridge = null;
    s.fellFromCourse = -1;
    s.launchedFromPlatform = false;
    s.poisonIn = null;
    this.fx(o).rise(start.x, start.y, start.r, start.z, true);
  }

  /** First to their crown is safe; the other one pays for it. */
  private takeCrown(lane: TrailLane): void {
    const tr = this.trail;
    if (!tr || tr.crownTaken || lane.lost) return;
    tr.crownTaken = lane.fighter;

    this.fx(this.ownerOf(lane.fighter) ?? 'player').blast(lane.fighter.x, lane.fighter.y, 110, SND.goldHot);
    Sfx.playAt('reward-big', lane.fighter.x, { rate: 1, volume: 1 });
    this.api.showFloatingText(lane.fighter.x, lane.fighter.y - 52, 'CROWNED', this.hex(SND.gold));

    for (const other of tr.lanes) {
      if (other === lane) continue;
      this.loseTrail(other, 'TOO SLOW');
    }
    this.resolveTrail();
  }

  /** Fell, drowned, or came second. One price for all three. */
  private loseTrail(lane: TrailLane, reason: string): void {
    const tr = this.trail;
    if (!tr || lane.lost) return;
    lane.lost = true;
    const f = lane.fighter;
    if (this.alive(f)) {
      // The caster losing their own minigame is self-inflicted; the rival losing it is an attack.
      f.takeDamage(TRAIL_DAMAGE, { selfInflicted: f === this.fighter(tr.caster) });
      this.api.spawnHitFlash(f.x, f.y, SND.lava);
      this.api.showFloatingText(f.x, f.y - 46, reason, this.hex(SND.lava));
      this.fx(this.ownerOf(f) ?? 'player').blast(f.x, f.y, 120, SND.lava);
      Sfx.playAt('roar', f.x, { rate: 0.55, volume: 0.9 });
    }
    this.resolveTrail();
  }

  /** Somebody has won or lost: hold the picture for a beat, then put the arena back. */
  private resolveTrail(): void {
    const tr = this.trail;
    if (!tr || tr.endsAt !== null) return;
    tr.endsAt = this.now + 900;
  }

  private endTrail(): void {
    const tr = this.trail;
    if (!tr) return;
    for (const lane of tr.lanes) {
      for (const p of lane.platforms) {
        const i = this.platforms.indexOf(p);
        if (i < 0) continue;
        this.fx(p.owner).collapse(p.x, p.y, p.z, p.r, p.grey);
        this.platforms.splice(i, 1);
      }
      const o = this.ownerOf(lane.fighter);
      if (!o) continue;
      // Put them down rather than letting go of them five hundred units up: the race is over,
      // and a half-second of silent falling afterwards reads as a bug.
      const s = this.sides[o];
      s.z = 0;
      s.vz = 0;
      s.standing = null;
      s.onBridge = null;
      s.fellFromCourse = -1;
      s.launchedFromPlatform = false;
      if (this.alive(lane.fighter)) this.fx(o).puff(lane.fighter.x, lane.fighter.y + 14, 10, 18, 420);
    }
    this.bridges = this.bridges.filter((b) => b.z1 <= 0 && b.z2 <= 0);
    this.trail = null;
    this.dropOrphanedRiders();
    this.api.setStatusIndicator('dune-trail', null);
  }

  private updateTrail(delta: number): void {
    const tr = this.trail;
    if (!tr) return;
    const time = this.now;

    if (tr.endsAt !== null) {
      if (time >= tr.endsAt) this.endTrail();
      return;
    }
    // A runner who dies mid-race ends it: there is nobody left to beat.
    if (tr.lanes.some((l) => !this.alive(l.fighter))) { this.endTrail(); return; }
    if (time - tr.startedAt > TRAIL_MAX_MS) { this.endTrail(); return; }

    tr.lavaZ += LAVA_RISE * (delta / 1000);

    const casterFighter = this.fighter(tr.caster);
    for (const lane of tr.lanes) {
      if (lane.lost) continue;
      const o = this.ownerOf(lane.fighter);
      if (!o) continue;
      const s = this.sides[o];
      // The rival did not sign up for this and cannot answer it with their own kit. `isLocked`
      // already silences an npc, but a *player* rival is driven by the keyboard, so the block
      // has to live on the fighter — refreshed each frame, so it lifts the instant the race does.
      if (lane.fighter !== casterFighter) lane.fighter.applyDisarm(250);
      if (lane.bot) this.driveTrailBot(lane, o);

      // Two ways to lose without being second: the lava reaches you, or you are back on the
      // floor with nothing under you. Both are the same 70.
      if (s.z <= tr.lavaZ) { this.loseTrail(lane, 'THE LAVA'); return; }
      if (!s.standing && !s.onBridge && s.z <= 0) { this.loseTrail(lane, 'FELL'); return; }
    }
  }

  /**
   * The bot's climb. It commits to the next slab the moment it is standing on the last one, and
   * the height sim then lands it there by fiat — so it never falls, and the only thing you are
   * racing is its cadence. Beating it is a matter of hesitating less than it does.
   */
  private driveTrailBot(lane: TrailLane, owner: Owner): void {
    const f = lane.fighter;
    const s = this.sides[owner];
    if (!this.alive(f)) return;
    const next = lane.platforms[lane.reached + 1];
    if (!next) return;

    const grounded = s.standing !== null || s.onBridge !== null || (s.z <= AIRBORNE_Z && s.vz === 0);

    // Standing still until it hops is not politeness, it is the guarantee: a bot that walked
    // toward the next slab while waiting out its dwell would stroll straight off the edge of
    // the one it is on — 450ms at its own speed is eighty pixels, and a slab is thirty across.
    if (grounded && this.now < lane.nextHopAt) {
      this.body(f).setVelocity(0, 0);
      return;
    }

    const ang = Math.atan2(next.y - f.y, next.x - f.x);
    const spd = f.speed * TRAIL_BOT_PACE;
    this.body(f).setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);

    if (!grounded || lane.botTarget === next) return;
    // Hop once it has gathered itself. The gap is bounded so the arc always clears it, and the
    // guaranteed landing covers the rest.
    if (this.tryJump(owner)) lane.botTarget = next;
  }

  // ── Poison and the awakened idol ───────────────────────────────────────────

  /**
   * Poison bites the moment you step into it and keeps biting while you stand there.
   *
   * The entry hit is the whole point: on a 600ms timer alone you could simply *walk through* a
   * patch between two pillars and pay nothing, which made the floor route free and the pillars
   * decorative. Charging on entry means the ground between two slabs genuinely costs something,
   * and height is still the complete answer — being off the floor at all is immunity, so
   * jumping the patch is the one free way across.
   */
  private updatePoison(): void {
    const time = this.now;
    for (const o of ['player', 'npc'] as Owner[]) {
      const s = this.sides[o];
      const f = this.fighter(o);
      if (!this.alive(f)) continue;
      if (s.z > AIRBORNE_Z || this.poisons.length === 0) { s.poisonIn = null; continue; }

      const inIt = this.poisons.find((p) => Phaser.Math.Distance.Between(f.x, f.y, p.x, p.y) <= p.r)
        ?? null;
      if (!inIt) { s.poisonIn = null; continue; }

      // Your own course's poison is a cost you chose; somebody else's is an attack.
      const mine = inIt.owner === o;
      if (s.poisonIn !== inIt) {
        s.poisonIn = inIt;
        s.poisonNextTickAt = time + POISON_TICK_MS;
        f.takeDamage(POISON_BITE, { selfInflicted: mine });
        this.api.spawnHitFlash(f.x, f.y, SND.poison);
        this.fx(inIt.owner).ping(f.x, f.y, 22, SND.poison);
        Sfx.playAt('slime-splat', f.x, { rate: 1.1, volume: 0.55 });
        if (o === 'player') this.api.showFloatingText(f.x, f.y - 40, 'POISON', this.hex(SND.poison));
        continue;
      }
      if (time < s.poisonNextTickAt) continue;
      s.poisonNextTickAt = time + POISON_TICK_MS;
      f.takeDamage(POISON_DAMAGE, { selfInflicted: mine });
      this.api.spawnHitFlash(f.x, f.y, SND.poison);
    }
  }

  private updatePyramids(): void {
    const time = this.now;
    for (const o of ['player', 'npc'] as Owner[]) {
      const s = this.sides[o];
      if (time >= s.pyramidUntil) continue;
      if (time < s.pyramidNextShotAt) continue;
      s.pyramidNextShotAt = time + PYRAMID_SHOT_MS;

      // Nearest living enemy, so the idol keeps the pressure on whoever closed the distance.
      let best: Fighter | null = null;
      let bestD = Infinity;
      for (const t of this.targetsOf(o)) {
        const d = Phaser.Math.Distance.Between(s.pyramidX, s.pyramidY, t.x, t.y);
        if (d < bestD) { bestD = d; best = t; }
      }
      if (!best) continue;

      this.beams.push({
        owner: o, x1: s.pyramidX, y1: s.pyramidY - 30, x2: best.x, y2: best.y,
        bornAt: time, golden: true, seed: Math.random() * 999,
      });
      best.takeDamage(PYRAMID_SHOT_DAMAGE);
      this.api.spawnHitFlash(best.x, best.y, SND.goldHot);
      this.fx(o).ping(best.x, best.y, 18, SND.gold);
      Sfx.playAt('beam-fire', s.pyramidX, { rate: 1.25, volume: 0.5 });
    }
  }

  // ── Moving platforms ───────────────────────────────────────────────────────

  private updateMovingPlatforms(): void {
    const time = this.now;
    for (const p of this.platforms) {
      if (!p.move) continue;
      const m = p.move;
      const k = 0.5 + 0.5 * Math.sin((time / m.period) * TAU + m.phase);
      const nx = m.x0 + (m.x1 - m.x0) * k;
      const ny = m.y0 + (m.y1 - m.y0) * k;
      const dx = nx - p.x;
      const dy = ny - p.y;
      p.x = nx;
      p.y = ny;
      // Carry the rider. Without this a moving platform is a trap rather than a ride, since
      // the fighter's own body never learns it is standing on anything.
      for (const o of ['player', 'npc'] as Owner[]) {
        const s = this.sides[o];
        if (s.standing !== p) continue;
        const f = this.fighter(o);
        if (!this.alive(f)) continue;
        f.setPosition(f.x + dx, f.y + dy);
      }
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Whether this kit should be reading the player's keys even though the player is not Sand.
   * True only for a rival stood on a Final Trail course: they need Space to be a jump, and
   * nothing else in ArenaScene is going to give it to them.
   */
  ownsPlayerInput(): boolean {
    return this.api.elementId !== 'dune' && this.laneOf(this.api.player) !== null;
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void pointer;
    const isSand = this.api.elementId === 'dune';
    if (!isSand && !this.ownsPlayerInput()) return;
    const p = this.api.player;
    if (!this.alive(p)) return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    // Space is the jump. ArenaScene's dodge block stands down for Sand — and for anybody on a
    // trail course — so there is no press that could ever mean both.
    if (Phaser.Input.Keyboard.JustDown(this.api.spaceKey)) this.tryJump('player');

    if (!isSand) return;
    const ctx = () => this.api.buildPlayerContext(mouseX, mouseY);

    // Inside a Final Trail the fight is suspended: it is a race, and a race you could shoot your
    // way out of is not one. Space and F survive — the jump because the race *is* jumping, and
    // Sandwalk because a bridge is a legitimate line through a course.
    if (this.trail) {
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('dune-sandwalk', ctx());
      return;
    }

    if (this.api.pointerWasDown && time >= s.nextShotAt) p.castAbility('dune-striker', ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('dune-ruins', ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('dune-pyramid', ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('dune-sandwalk', ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('dune-final-trail', ctx());
  }

  // ── NPC autopilot ──────────────────────────────────────────────────────────

  /**
   * The npc's half of the parkour. It is deliberately simple — walk at the next platform in the
   * chain, hop when you are nearly on top of it — because a machine that never falls would make
   * the element's one real cost invisible. It misses about as often as a player does, and it
   * pays the same 20 for it.
   */
  private driveNpc(): void {
    const s = this.sides.npc;
    const c = s.course;
    const f = this.api.npc;
    if (!c || c.claimed || !this.alive(f)) return;

    // Back on the floor means back to the bottom of the course: from down there the only slab
    // it can reach is the grey one, so aiming at the pillar it fell off would loop forever.
    const grounded = !s.standing && s.z <= AIRBORNE_Z;
    if (grounded) c.reached = -1;

    // Target the next slab after the highest one it has actually stood on — not after whatever
    // it happens to be touching, which is nothing at all while it is in the air.
    const want = this.platforms.find((p) => p.courseId === c.id && p.idx === c.reached + 1);
    if (!want) return;

    const d = Phaser.Math.Distance.Between(f.x, f.y, want.x, want.y);
    const ang = Math.atan2(want.y - f.y, want.x - f.x);
    this.body(f).setVelocity(Math.cos(ang) * f.speed, Math.sin(ang) * f.speed);

    // Jump as the gap closes, and only from something solid: a jump started too early lands
    // short, which is exactly the mistake a player makes.
    if (s.standing && d < 78 && d > 34) this.tryJump('npc');
    else if (grounded && d < 70) this.tryJump('npc');
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'dune';
    const npcIs = this.api.npcElementId === 'dune';
    // Everything this kit owns keeps running even when nobody is Sand any more — a deck still
    // standing after a stance swap has to finish its six seconds and clean itself up.
    if (!playerIs && !npcIs && !this.trail && this.platforms.length === 0
      && this.bridges.length === 0 && this.beams.length === 0) {
      // Nothing of this element is left in the match. Tear the rig down rather than leaving a
      // sand character standing over whoever swapped out of it, and blank the layers once.
      this.updateAvatars(delta);
      this.groundGfx?.clear();
      this.airGfx?.clear();
      this.pushStatuses(time);
      return;
    }
    this.ensureLayers();
    this.vizT += delta / 1000;

    this.updateMovingPlatforms();
    this.updateBridges();
    if (npcIs && !this.trail) this.driveNpc();

    for (const o of ['player', 'npc'] as Owner[]) {
      // A Final Trail hands a jump to whoever it dragged in, Sand or not — that is the only
      // time a fighter of another element has a height at all.
      if (!this.isSand(o) && !this.trailInvolves(o)) continue;
      this.updateHeight(o, delta);
    }

    // After the height sim, so the lava and the fall checks read this frame's `z`, and after
    // ArenaScene's movement pass, so the conveyor is the last word on where anybody is going.
    this.updateTrail(delta);
    this.applyBridgeMotion();

    this.updatePoison();
    if (!this.trail) this.updatePyramids();

    // Courses time out rather than living forever — an abandoned obby is cover, and cover this
    // element did not pay for.
    for (const o of ['player', 'npc'] as Owner[]) {
      const c = this.sides[o].course;
      if (c && !c.claimed && time >= c.expiresAt) this.clearCourse(o, true);
    }
    // The idol's own slab goes down with it, and nothing else does.
    for (const o of ['player', 'npc'] as Owner[]) {
      const s = this.sides[o];
      if (s.pyramidUntil === 0 || time < s.pyramidUntil) continue;
      s.pyramidUntil = 0;
      const p = s.pyramidPlatform;
      s.pyramidPlatform = null;
      if (!p) continue;
      const i = this.platforms.indexOf(p);
      if (i < 0) continue;
      this.fx(o).collapse(p.x, p.y, p.z, p.r, p.grey);
      this.platforms.splice(i, 1);
      this.dropOrphanedRiders();
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      if (time - this.beams[i].bornAt > 190) this.beams.splice(i, 1);
    }

    this.updateAvatars(delta);
    this.draw();
    this.pushStatuses(time);
  }

  private updateAvatars(delta: number): void {
    for (const o of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(o);
      const s = this.sides[o];
      let av = this.avatar(o);

      if (!this.isSand(o) || !this.alive(f)) {
        if (av) { av.destroy(); if (o === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new SandAvatar(this.api.scene, this.col(o));
        if (o === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setElevation(s.z);
      av.setGolden(this.now < s.goldenUntil);
      av.setMastered(o === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  private draw(): void {
    const g = this.groundGfx;
    const a = this.airGfx;
    if (!g || !a) return;
    g.clear();
    a.clear();
    const t = this.vizT;

    // ── Ground layer ──
    // Lava first: it is the floor of the Final Trail, and everything else in the race stands
    // above it. The divider goes down with it so neither runner reads the other lane as a route.
    if (this.trail) {
      lavaTide(g, this.pcol, 0, this.api.height * 0.5, this.api.width, this.api.height * 0.5,
        this.trail.lavaZ, t, 1);
      laneDivider(g, this.pcol, this.api.width / 2, this.top, this.bottom, t, 1);
    }

    for (const p of this.poisons) poisonPatch(g, this.col(p.owner), p.x, p.y, p.r, t, 1, { seed: p.seed });

    for (const b of this.bridges) {
      const k = (b.expiresAt - this.now) / BRIDGE_LIFE_MS;
      sandBridge(g, this.col(b.owner), b.x1, b.y1, b.z1, b.x2, b.y2, b.z2, b.halfW, k, t, 1,
        { seed: b.seed });
    }

    // Tallest last, so a pillar in front of another one genuinely overlaps it.
    const ordered = [...this.platforms].sort((p1, p2) => p1.y - p2.y);
    for (const p of ordered) {
      const lit = (this.sides.player.standing === p || this.sides.npc.standing === p) ? 1 : 0;
      pillar(g, this.col(p.owner), p.x, p.y, p.r, p.z, 1, { seed: p.seed, grey: p.grey, lit, t });
    }

    // ── Air layer ──
    // A crown on the last slab of each lane. Drawn before the course prizes so a trail slab is
    // never mistaken for an orb.
    for (const lane of this.trail?.lanes ?? []) {
      const top = lane.platforms[lane.platforms.length - 1];
      if (!top || !this.platforms.includes(top)) continue;
      crown(a, this.col(top.owner), top.x, top.y, t, 1,
        { taken: this.trail!.crownTaken !== null });
    }

    // The prize at the end of an unclaimed course, and the idol once it has been claimed —
    // which by then has been orphaned out of the course and lives on the side instead.
    for (const p of this.platforms) {
      if (!p.goal || this.laneOfPlatform(p)) continue;
      const s = this.sides[p.owner];
      if (s.pyramidPlatform === p) {
        pyramidIdol(a, this.col(p.owner), p.x, p.y - 4, t, 1,
          { size: 26, awake: this.now < s.pyramidUntil ? 1 : 0 });
        continue;
      }
      const c = s.course;
      if (!c || p.courseId !== c.id || c.claimed) continue;
      if (c.kind === 'ruins') goldOrb(a, this.col(p.owner), p.x, p.y, t, 1);
      else pyramidIdol(a, this.col(p.owner), p.x, p.y - 4, t, 1, { size: 26, awake: 0 });
    }

    for (const b of this.beams) {
      const k = 1 - (this.now - b.bornAt) / 190;
      if (k <= 0) continue;
      sandBeam(a, this.col(b.owner), b.x1, b.y1, b.x2, b.y2, k, 1, { golden: b.golden, seed: b.seed });
    }

    // A held flintlock for a side with no avatar yet (the very first frames of a match).
    for (const o of ['player', 'npc'] as Owner[]) {
      if (!this.isSand(o) || this.avatar(o)) continue;
      const f = this.fighter(o);
      if (!this.alive(f)) continue;
      const s = this.sides[o];
      const ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      flintlock(a, this.col(o), f.x + Math.cos(ang) * 16, f.y + Math.sin(ang) * 16, ang, 1, { t });
    }

    // A rival dragged into a Final Trail is not a Sand character and has no rig to draw their
    // altitude, so the height rule is painted for them here: the same shadow at the same
    // `z * LIFT`, and the same ladder of chevrons counting the gap. Without it the enemy simply
    // appears to stand still while their shadow does all the moving.
    for (const lane of this.trail?.lanes ?? []) {
      const o = this.ownerOf(lane.fighter);
      if (!o || this.isSand(o) || !this.alive(lane.fighter)) continue;
      const s = this.sides[o];
      const drop = s.z * LIFT;
      const k = Math.min(1, s.z / 400);
      g.fillStyle(this.col(o)(SND.shadow), 0.42 - k * 0.2);
      g.fillEllipse(lane.fighter.x, lane.fighter.y + 15 + drop, 40 - k * 16, 14 - k * 6);
      g.fillStyle(this.col(o)(SND.deep), 0.4);
      const rungs = Math.max(0, Math.floor(drop / 12));
      for (let i = 1; i <= rungs; i++) {
        const yy = lane.fighter.y + 15 + (drop * i) / (rungs + 1);
        const w = 5 - (i / (rungs + 1)) * 2.5;
        g.fillPoints([
          new Phaser.Geom.Point(lane.fighter.x - w, yy + 2),
          new Phaser.Geom.Point(lane.fighter.x, yy - 1),
          new Phaser.Geom.Point(lane.fighter.x + w, yy + 2),
          new Phaser.Geom.Point(lane.fighter.x, yy + 0.6),
        ], true);
      }
    }

    // A little grain always drifting across the floor of a Sand match, so the arena reads as
    // desert even between casts.
    if (this.isSand('player') || this.isSand('npc')) {
      grains(g, this.pcol, this.api.width / 2, this.api.height / 2,
        Math.max(this.api.width, this.api.height) / 2, 26, 0.1,
        { seed: 11, color: SND.deep, size: 2, drift: Math.sin(t * 0.6) * 30 });
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(time: number): void {
    const isSand = this.api.elementId === 'dune';
    const s = this.sides.player;
    // The drop only costs you while the course is unfinished, so only warn about it then.
    const c0 = s.course;
    const onLiveCourse = !!c0 && !c0.claimed && !!s.standing && s.standing.courseId === c0.id;

    const shot = this.shotDamage('player');
    const upHigh = s.standing !== null || s.onBridge !== null;
    this.api.setStatusIndicator('dune-height', isSand && (s.z > AIRBORNE_Z || upHigh) ? {
      name: upHigh ? 'Off The Floor' : 'Airborne', emoji: upHigh ? '🧱' : '🪂', color: SND.stoneWarmLit,
      description: upHigh
        ? `Standing ${Math.round(s.z)} up. The flintlock hits for ${shot} from here, and the poison below cannot reach you. Fire it mid-jump off this and it hits for ${SHOT_BASE + SHOT_BONUS_PLATFORM + SHOT_BONUS_AIR}.${onLiveCourse ? ` Drop to the floor before you reach the end and it costs you ${FALL_DAMAGE}.` : ''}`
        : `Off the ground — the flintlock hits for ${shot}. ${SHOT_BASE} is the flat-footed shot; every step up from the floor is worth more.`,
      count: Math.round(s.z), priority: 122,
    } : null);

    this.api.setStatusIndicator('dune-golden', isSand && time < s.goldenUntil ? {
      name: 'Golden Sand', emoji: '🟡', color: SND.gold,
      description: 'The orb is on the barrel. The flintlock reloads in one second instead of two.',
      until: s.goldenUntil, priority: 118,
    } : null);

    const deck = s.onBridge;
    this.api.setStatusIndicator('dune-bridge', isSand && deck ? {
      name: 'Sandwalk', emoji: '🌉', color: SND.stoneWarmLit,
      description: `On the deck. It carries you toward the far end and everything you do on it is ${Math.round((BRIDGE_SPEED_MULT - 1) * 100)}% faster, and you cannot fall off the sides of it. The sand reddens as it runs out.`,
      until: deck.expiresAt, priority: 117,
    } : null);

    this.api.setStatusIndicator('dune-pyramid', isSand && time < s.pyramidUntil ? {
      name: 'Awakened Pyramid', emoji: '🔺', color: SND.goldHot,
      description: `The idol is picking targets on its own — ${PYRAMID_SHOT_DAMAGE} a shot, about one a second, for as long as it stays awake.`,
      until: s.pyramidUntil, priority: 119,
    } : null);

    this.api.setStatusIndicator('dune-course', isSand && c0 && !c0.claimed ? {
      name: c0.kind === 'pyramid' ? 'Cursed Pyramid' : 'Sandstone Ruins', emoji: '🏛️', color: SND.stoneWarm,
      description: c0.kind === 'pyramid'
        ? `A course is standing. Reach the golden pyramid at the end of it and it wakes up. Dropping to the floor before then costs ${FALL_DAMAGE}; once you have it, the fall is free.`
        : `A course is standing. Reach the golden orb at the end of it for a faster flintlock. Dropping to the floor before then costs ${FALL_DAMAGE}; once you have it, the fall is free.`,
      until: c0.expiresAt, count: Math.max(0, c0.total - 1 - c0.reached), priority: 121,
    } : null);

    const lane = this.trail ? this.laneOf(this.api.player) : null;
    this.api.setStatusIndicator('dune-trail', lane ? {
      name: this.trail!.crownTaken === this.api.player ? 'Crowned' : 'Final Trail',
      emoji: this.trail!.crownTaken === this.api.player ? '👑' : '🌋',
      color: this.trail!.crownTaken === this.api.player ? SND.gold : SND.lava,
      description: this.trail!.crownTaken === this.api.player
        ? 'You reached the crown first. The lava can have whoever is still climbing.'
        : `Race for the crown at the top of your lane. Second to it, off the course, or caught by the lava is ${TRAIL_DAMAGE}. Only Space and Sandwalk work up here — and the lava is ${Math.max(0, Math.round(s.z - this.trail!.lavaZ))} below you.`,
      count: Math.max(0, lane.platforms.length - 1 - lane.reached), priority: 124,
    } : null);
  }

  // ── Casts, called from buildPlayerContext / buildNpcContext ────────────────

  doRuins(owner: Owner): void { this.buildCourse(owner, 'ruins'); }
  doPyramid(owner: Owner): void { this.buildCourse(owner, 'pyramid'); }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** The npc is mid-course and has better things to do than chase. */
  isOnCourse(owner: Owner): boolean {
    const c = this.sides[owner].course;
    return !!c && !c.claimed;
  }

  /**
   * ArenaScene ORs this into `aiState.isLocked`. `doAI` bails before it writes a velocity, so
   * one flag both silences the rival's abilities — the race is not a fight — and hands their
   * body to `driveTrailBot`, which is the only thing that should be steering it.
   */
  locksNpcAbilities(): boolean { return this.trail !== null; }

  /** Whether a Final Trail is running at all, whoever called it. */
  isTrailActive(): boolean { return this.trail !== null; }

  isPyramidAwake(owner: Owner): boolean { return this.now < this.sides[owner].pyramidUntil; }
  isReloaded(owner: Owner): boolean { return this.now >= this.sides[owner].nextShotAt; }

  /**
   * Ability tray fill. The click shows its reload rather than its cooldown, the course buttons
   * show how much course is left to climb, and the Q shows how much lane is left to the crown.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;

    if (abilityId === 'dune-striker') {
      const reload = this.reloadMs('player');
      return Phaser.Math.Clamp(1 - (s.nextShotAt - time) / reload, 0, 1);
    }
    const c = s.course;
    if (c && !c.claimed && ((abilityId === 'dune-ruins' && c.kind === 'ruins')
      || (abilityId === 'dune-pyramid' && c.kind === 'pyramid'))) {
      return Phaser.Math.Clamp((c.reached + 1) / c.total, 0, 1);
    }
    if (abilityId === 'dune-pyramid' && time < s.pyramidUntil) {
      return Phaser.Math.Clamp((s.pyramidUntil - time) / PYRAMID_AWAKE_MS, 0, 1);
    }
    if (abilityId === 'dune-sandwalk') {
      const b = this.bridges.find((x) => x.owner === 'player');
      if (b) return Phaser.Math.Clamp((b.expiresAt - time) / BRIDGE_LIFE_MS, 0, 1);
    }
    if (abilityId === 'dune-final-trail') {
      const lane = this.trail ? this.laneOf(p) : null;
      if (lane) return Phaser.Math.Clamp((lane.reached + 1) / lane.platforms.length, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }

  // ── Ruin's Spikes ──────────────────────────────────────────────────────────

  /**
   * Everything Sand puts on the board is a structure: the pillars, the idol's platform, and a
   * Sandwalk deck. Beams are in flight and survive, per the contract.
   *
   * A Final Trail's slabs are the one exemption. They are not a summon anybody is defending —
   * they are the floor of a race both fighters were put into, and razing a step out from under
   * a runner who cannot cast their way out of it would be a kill, not a counter.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    const near = (px: number, py: number) => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      razed++;
      report?.(px, py);
      return true;
    };

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      if (p.owner === exceptOwner || this.laneOfPlatform(p)) continue;
      if (!near(p.x, p.y)) continue;
      this.fx(p.owner).collapse(p.x, p.y, p.z, p.r, p.grey);
      this.platforms.splice(i, 1);
      this.dropOrphanedRiders();
    }
    for (let i = this.bridges.length - 1; i >= 0; i--) {
      const b = this.bridges[i];
      if (b.owner === exceptOwner) continue;
      const mx = (b.x1 + b.x2) / 2;
      const my = (b.y1 + b.y2) / 2;
      if (!near(mx, my)) continue;
      this.fx(b.owner).puff(mx, my, 16, 28, 480, SND.deep);
      this.bridges.splice(i, 1);
      this.dropOrphanedRiders();
    }
    return razed;
  }
}
