import Phaser from 'phaser';
import { CastContext } from '../Ability';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { AIR, AirAvatar, AirColorFn, AirFx, ArmGesture, drawAirKnife } from './AirVisuals';
import {
  FieldKnife, SparkPoint,
  beyBurst, coverBurst, drawBey, drawCloud, drawCover, drawDaggerField, drawLevitation, drawScar,
  drawSparkTrail, drawStealthGauge, drawStealthWisps, drawTimingRing, drawWinded, flipBurst, jabFlick,
  knifeHit, knockBlast, pierceBurst, ringVerdict, shredSparks,
} from './AirBladeVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { SakuraFx } from './skins/SakuraFx';
import { meterGain } from '../../combat/Meters';
import { Sfx } from '../../audio';

type Owner = 'player' | 'npc';
type Body = Phaser.Physics.Arcade.Body;
const BOTH: Owner[] = ['player', 'npc'];

// ── Passive: clouds and stealth ───────────────────────────────────────────────

const STEALTH_MAX = 100;
/** Stealth a second while standing in one of your own clouds (doubled under Cloud Cover). */
const STEALTH_PER_S = 12;
/** Dodge chance at full stealth; it scales straight down to nothing at none. */
const DODGE_AT_MAX = 0.33;
/** Past this, Pierce the Skies is the big one — and the clouds leave when it is used. */
const BIG_STEALTH = 50;
const CLOUD_COUNT = 4;
const CLOUD_R_MIN = 95;
const CLOUD_R_MAX = 130;
const CLOUD_SPEED_MIN = 14;
const CLOUD_SPEED_MAX = 24;
/** A cloud is wider than it is tall: its footprint is an ellipse this much flatter. */
const CLOUD_FLAT = 0.62;
/** How fast scattered clouds leave, and how long the sky stays empty before more crawl in. */
const CLOUD_FLEE_SPEED = 900;
const CLOUD_RETURN_MS = 5000;
/** Enemy projectiles inside a cloud keep only this share of their speed. */
const CLOUD_SHOT_SPEED = 0.25;
/** Stealth at which the Sharpshooter achievement (and the Sand skin) unlocks. */
const PERFECT_STEALTH = STEALTH_MAX;

// ── Click: Pierce the Skies ───────────────────────────────────────────────────

const PIERCE_ID = 'pierce-the-skies';
const PIERCE_DAMAGE = 14;
const PIERCE_DAMAGE_PER_STEALTH = 0.36;
const PIERCE_LUNGE = 50;
const PIERCE_LUNGE_PER_STEALTH = 2.3;
const PIERCE_LUNGE_SPEED = 1500;
/** How far the knife reaches past where the lunge ends, and how wide the thrust is. */
const PIERCE_REACH = 62;
const PIERCE_HALF_W = 24;
const BACKSTAB_MULT = 2;
/** Attacker must be inside this half-angle of dead behind the target. */
const BACKSTAB_HALF = Math.PI / 3;
const SCAR_MS = 2600;
/** The held barrage: how long the button must be down, then one small stab this often. */
const JAB_HOLD_MS = 260;
const JAB_EVERY_MS = 110;
const JAB_DAMAGE = 3;
const JAB_REACH = 82;
const JAB_HALF = 0.34;
const JAB_SPEED_MULT = 0.6;

// ── E: Knock ──────────────────────────────────────────────────────────────────

const KNOCK_ID = 'air-knock';
const KNOCK_RANGE = 100;
const KNOCK_HALF = 0.62;
const KNOCK_DAMAGE = 10;
const KNOCK_SHOVE = 380;
const KNOCK_SHOVE_MS = 170;
const WINDED_MS = 6000;
/** "200% slower": a third of an ordinary turn. An unwinded fighter turns instantly. */
const WINDED_TURN_RAD_PER_S = 1.6;
/** Stamina is 0–1: seconds of walking to empty it, seconds of standing to fill it. */
const STAMINA_DRAIN_S = 2.2;
const STAMINA_REFILL_S = 1.6;
const MOVING_SPEED = 20;

// ── R: Cloud Cover ────────────────────────────────────────────────────────────

const COVER_ID = 'cloud-cover';
const COVER_HP = 25;
const COVER_DECAY = 5;
const COVER_DECAY_MS = 3000;
/** How much of herself the wearer still sees. Everyone else sees nothing. */
const COVER_SELF_ALPHA = 0.42;

// ── F: Combo ──────────────────────────────────────────────────────────────────

const COMBO_ID = 'air-combo';
const VOLLEY_KNIVES = 6;
const VOLLEY_SPREAD = 0.2;
const VOLLEY_SPEED = 900;
const VOLLEY_RANGE = 640;
const VOLLEY_DAMAGE = 6;
const VOLLEY_STAGGER_MS = 40;
/** The ring: how long after the volley it appears, how long it takes to close, and from where to where. */
const RING_DELAY_MS = 280;
const RING_MS = 560;
const RING_R0 = 96;
const RING_MARK_R = 26;
/** A press this long before the ring lands, or this long after, counts. */
const RING_EARLY_MS = 150;
const RING_LATE_MS = 110;
const LEVITATE_MS = 3000;
const LEVITATE_LIFT = 78;
/** The second ring lands this long before she would come down on her own. */
const RING2_BEFORE_LANDING_MS = 800;
/** The rain: twelve knives in four files of three. */
const FIELD_COLS = 4;
const FIELD_ROWS = 3;
const FIELD_HALF_W = 80;
const FIELD_HALF_H = 54;
const FIELD_STRIKE_DAMAGE = 16;
const FIELD_STRIKE_AT_MS = 240;
const FIELD_STEP_DAMAGE = 5;
const FIELD_STEP_MS = 350;
const FIELD_MS = 7000;

// ── Q: Tornado Blade ──────────────────────────────────────────────────────────

const BEY_ID = 'tornado-blade';
/** Stamina is in seconds: it drains one a second, and faster when she is hit. */
const BEY_STAMINA = 6;
const BEY_STAMINA_PER_STEALTH = 0.04;
const BEY_HIT_DRAIN_PER_DAMAGE = 0.04;
const BEY_ACCEL = 1700;
const BEY_MAX_SPEED = 640;
/** Drag per second, as an exponent: low, which is what makes it skate. */
const BEY_DRAG = 1.2;
const BEY_RADIUS = 30;
const BEY_WALL_BOUNCE = 0.8;
const BEY_SHRED_MS = 900;
const BEY_TICK_MS = 100;
const BEY_TICK_DAMAGE = 4;
/** Storm perk (divine): the lightning each grinding tick carries. */
const STORM_BOLT_DAMAGE = 2;
/** Speed kept while grinding inside somebody. */
const BEY_SHRED_SPEED = 0.12;
const BEY_LAUNCH_SPEED = 720;
/** How long after being thrown off somebody before it can bite them again. */
const BEY_REHIT_MS = 600;
/** How long each grinding tick leaves its victim attacking at half speed. */
const BEY_SLOW_ATTACK_MS = 300;
const BEY_ORBIT_R = 46;
const BEY_ORBIT_DAMAGE = 6;
const BEY_TRAIL_MS = 650;
/** The close-up: how far the camera pushes in, and how slow the world gets (offline only). */
const DRAMA_ZOOM = 0.28;
const DRAMA_SLOW = 0.45;

// ── Net ───────────────────────────────────────────────────────────────────────

/** Pseudo-cast prefix for everything that is a press or a state rather than an ability cast. */
const NET = 'airx-';
const NET_SKY_MS = 600;

/** Which arm gesture the opponent's rig plays when the NPC lands each ability. */
const GESTURES: Record<string, ArmGesture> = {
  [PIERCE_ID]: 'punch',
  [KNOCK_ID]: 'clap',
  [COVER_ID]: 'flex',
  [COMBO_ID]: 'sweep',
  [BEY_ID]: 'raise',
};

// ── Arena API interface ────────────────────────────────────────────────────────

export interface AirArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group | null;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  /** True when the local player's element is air. */
  readonly isPlayerAir: boolean;
  /** True when the opponent's element is air. */
  readonly isNpcAir: boolean;
  readonly isOnline: boolean;
  readonly isInvasion: boolean;
  /** How often this difficulty's bot fumbles: 0 for the best, towards 1 for the worst. */
  readonly npcSlack: number;
  /** World-space cursor: the Tornado Blade chases it, and the rain of knives lands on it. */
  readonly pointerX: number;
  readonly pointerY: number;
  readonly worldBounds: Phaser.Geom.Rectangle;
  /**
   * The lunge and the Tornado Blade place the player's body themselves, so WASD has to stand
   * down for them — the same flag Hunt's pounce and Gunpowder's retreat use.
   */
  isDodging: boolean;
  buildPlayerContext(x: number, y: number): CastContext;
  isTargetable(f: Fighter): boolean;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  /** Skins: maps an air visual color through the owner's skin. */
  airColor(owner: Owner, base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: Owner): string | null;
  /** Idempotent achievement unlock with in-arena popup. */
  unlockAchievement(id: string): void;
  /** Online: send a press or a state to the other machine (`replayNet` there). */
  broadcast(id: string): void;
  hasPerk(owner: Owner, perkId: string): boolean;
}

// ── Internal world objects ─────────────────────────────────────────────────────

interface Cloud {
  x: number;
  y: number;
  r: number;
  vx: number;
  seed: number;
  /** Torn away by a big stab: flying off, and no longer a cloud anybody can stand in. */
  fleeing: boolean;
}

interface Knife {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  /** ms until it leaves the hand. */
  delay: number;
  t: number;
}

interface Field {
  id: number;
  owner: Owner;
  x: number;
  y: number;
  knives: FieldKnife[];
  bornAt: number;
  until: number;
  struck: boolean;
  lastStep: Map<Fighter, number>;
}

interface Scar { owner: Owner; x0: number; y0: number; x1: number; y1: number; until: number }

interface Shove { target: Fighter; vx: number; vy: number; until: number }

interface Lunge { ang: number; left: number }

/** The Combo between presses. */
interface ComboState {
  /** 1 = waiting to flip, 2 = in the air waiting to rain. */
  stage: 1 | 2;
  /** When the ring starts closing, and when it lands on her. */
  ringFrom: number;
  ringAt: number;
  /** Bot only: when the kit presses for it (0 = it will let the ring go). */
  botPressAt: number;
}

interface Shred { target: Fighter; until: number; lastTick: number; inAng: number }

interface Bey {
  stamina: number;
  max: number;
  vx: number;
  vy: number;
  spin: number;
  tilt: number;
  shred: Shred | null;
  /** Who it has just been thrown off, and until when it cannot bite them again. */
  immune: Map<Fighter, number>;
  /** Knives picked up from a dagger field, swinging round it. */
  orbit: number;
  trail: SparkPoint[];
}

/** Everything one assassin owns. Mirrored so an air NPC plays the full kit. */
interface Side {
  owner: Owner;
  stealth: number;
  inCloud: boolean;
  clouds: Cloud[];
  /** While the sky is empty after a scatter: when new clouds start crawling in. */
  cloudsBackAt: number;
  lunge: Lunge | null;
  /** How long the knife stays formed in her hand. */
  knifeUntil: number;
  /** Player: when the button went down. Bot: until when the kit is jabbing for it. */
  holdSince: number;
  jabUntil: number;
  lastJabAt: number;
  coverHp: number;
  coverNextDecayAt: number;
  combo: ComboState | null;
  levFrom: number;
  levUntil: number;
  bey: Bey | null;
  /** Latched, so `forceInvisible` is handed back exactly once. */
  hidden: boolean;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    stealth: 0,
    inCloud: false,
    clouds: [],
    cloudsBackAt: 0,
    lunge: null,
    knifeUntil: 0,
    holdSince: 0,
    jabUntil: 0,
    lastJabAt: 0,
    coverHp: 0,
    coverNextDecayAt: 0,
    combo: null,
    levFrom: 0,
    levUntil: 0,
    bey: null,
    hidden: false,
  };
}

// ── AirKit ────────────────────────────────────────────────────────────────────

/**
 * The hooded assassin, whole: her rig, her clouds, her five abilities and her bot.
 *
 * One number holds the element together: **stealth**, 0–100, earned by standing in her own
 * clouds. It is a dodge chance while it is banked (a third of hits at full), it is how far and how
 * hard Pierce the Skies goes when it is spent, and it is how long the Tornado Blade spins. The
 * rest of the kit is ways to earn it safely (Cloud Cover), ways to make the stab count (Knock
 * leaves them unable to turn, and a stab in the back is doubled), and somewhere to spend the time
 * in between (the Combo and its field of knives, which the Blade can pick up).
 *
 * Who decides what: each machine simulates its own assassin (`simulates`). An online opponent's
 * is drawn from her casts and from the `airx-` relays in `replayNet`, and nothing she does is
 * decided here.
 */
export class AirKit {
  // ── Visuals ─────────────────────────────────────────────────────────────
  private readonly pcol: AirColorFn;
  private readonly ncol: AirColorFn;
  private readonly pfx: AirFx;
  private readonly nfx: AirFx;
  /** Sakura skin: the same bursts drawn as cherry blossom. Visual only. */
  private readonly psak: SakuraFx;
  private readonly nsak: SakuraFx;
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Scars and dagger fields: on the floor, under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Knives, the Blade, rings, gauges: over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The clouds, over everything in the arena. */
  private skyGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ─────────────────────────────────────────────────────────────────
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private knives: Knife[] = [];
  private fields: Field[] = [];
  private scars: Scar[] = [];
  private shoves: Shove[] = [];
  private nextFieldId = 1;
  /** Fighters we installed a damage absorber on, so `reset` can take them back off. */
  private absorbed = new Set<Fighter>();
  /** True while this kit is the one holding `isDodging` down. */
  private drivingPlayer = false;
  private pointerWasDown = false;

  // ── The close-up ────────────────────────────────────────────────────────
  private drama = 0;
  private camRef: Phaser.Cameras.Scene2D.Camera | null = null;
  private camZoomF = 1;
  private camDX = 0;
  private camDY = 0;
  private slowed = false;

  // ── Net ─────────────────────────────────────────────────────────────────
  private netSeq = 0;
  private lastSkyAt = 0;

  constructor(private readonly arena: AirArenaApi) {
    this.pcol = (base) => arena.airColor('player', base);
    this.ncol = (base) => arena.airColor('npc', base);
    this.pfx = new AirFx(arena.scene, this.pcol);
    this.nfx = new AirFx(arena.scene, this.ncol);
    this.psak = new SakuraFx(arena.scene, this.pcol);
    this.nsak = new SakuraFx(arena.scene, this.ncol);
  }

  reset(): void {
    // Every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const g of [this.groundGfx, this.airGfx, this.skyGfx]) g?.destroy();
    this.groundGfx = null;
    this.airGfx = null;
    this.skyGfx = null;
    this.vizT = 0;

    // Hand the absorbers back before the fighters are replaced, or a stale closure keeps
    // answering for a body that no longer exists.
    for (const f of this.absorbed) f.damageAbsorber = null;
    this.absorbed.clear();

    this.restoreDrama();
    if (this.drivingPlayer) { this.arena.isDodging = false; this.drivingPlayer = false; }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.knives = [];
    this.fields = [];
    this.scars = [];
    this.shoves = [];
    this.nextFieldId = 1;
    this.pointerWasDown = false;
    this.netSeq = 0;
    this.lastSkyAt = 0;
  }

  // ── Small helpers ────────────────────────────────────────────────────────

  private get now(): number { return this.arena.scene.time.now; }
  private sakura(owner: Owner): boolean { return this.arena.skinId(owner) === 'sakura'; }
  private fx(owner: Owner): AirFx {
    const sak = this.sakura(owner);
    return owner === 'player' ? (sak ? this.psak : this.pfx) : (sak ? this.nsak : this.nfx);
  }
  private col(owner: Owner): AirColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.arena.player : this.arena.npc; }
  private avatar(owner: Owner): BaseAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private alive(f: Fighter | null | undefined): f is Fighter {
    return !!f && f.active && f.hp > 0;
  }
  private isAir(owner: Owner): boolean {
    return owner === 'player' ? this.arena.isPlayerAir : this.arena.isNpcAir;
  }
  private body(f: Fighter): Body { return f.body as Body; }
  private bodyR(f: Fighter): number { return Math.max(12, f.displayWidth * 0.42); }

  /**
   * Whether this machine decides what this side's kit does. An online opponent (or a co-op ally
   * in the npc slot of an Invasion) is simulated on its own machine: here it is drawn, nothing more.
   */
  private simulates(owner: Owner): boolean {
    return owner === 'player' || (!this.arena.isOnline && !this.arena.isInvasion);
  }

  /** Whether the other duellist is somebody to hide from, rather than an ally. */
  private hidesFromViewer(owner: Owner): boolean {
    return owner === 'npc' && !this.arena.isInvasion;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc') {
      if (this.arena.isInvasion) return [];
      return this.arena.player.bodies().filter((f) => this.alive(f));
    }
    return this.arena.enemies.filter((e) => this.alive(e) && this.arena.isTargetable(e));
  }

  private mainTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private aimOf(owner: Owner, tx?: number, ty?: number): number {
    const f = this.fighter(owner);
    if (tx !== undefined && ty !== undefined && (tx !== f.x || ty !== f.y)) return Math.atan2(ty - f.y, tx - f.x);
    if (owner === 'player') return this.playerAim();
    const t = this.mainTarget(owner) ?? this.arena.player;
    return Math.atan2(t.y - f.y, t.x - f.x);
  }

  /** Read off the live cursor, so it is right even on a frame `handleInput` did not run (Quantum). */
  private playerAim(): number {
    const { player } = this.arena;
    return Math.atan2(this.arena.pointerY - player.y, this.arena.pointerX - player.x);
  }

  /** Every hit this kit lands goes through here — and only on the machine that decides it. */
  private hit(owner: Owner, t: Fighter, dmg: number, color: number = AIR.frost): void {
    if (!this.simulates(owner) || dmg <= 0) return;
    const f = this.fighter(owner);
    t.takeDamage(Math.max(1, Math.round(dmg)), { source: f, sourceX: f.x, sourceY: f.y });
    this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(color));
  }

  /** True when the attacker is standing in the target's blind spot. */
  private behind(attacker: Fighter, t: Fighter): boolean {
    const toAttacker = Math.atan2(attacker.y - t.y, attacker.x - t.x);
    return Math.abs(Phaser.Math.Angle.Wrap(toAttacker - (t.facingAngle + Math.PI))) <= BACKSTAB_HALF;
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.arena.isOnline) this.arena.broadcast(`${NET}${id}:${this.netSeq++}`);
  }

  private sfx(owner: Owner, name: string, rate = 1, volume = 0.7): void {
    Sfx.playAt(name, this.fighter(owner).x, { rate, volume: owner === 'player' ? volume : volume * 0.7 });
  }

  /** The gates `castAbility` would have applied, for presses that never go through it. */
  private gagged(f: Fighter): boolean {
    const wall = Date.now();
    return wall < f.disarmedUntil || wall < f.silencedUntil || wall < f.chickenUntil;
  }

  // ── Passive: stealth and the dodge ───────────────────────────────────────

  private dodgeChance(owner: Owner): number {
    const f = this.fighter(owner);
    if (!this.isAir(owner) || !f || f.passivesSealed()) return 0;
    return (this.sides[owner].stealth / STEALTH_MAX) * DODGE_AT_MAX;
  }

  /**
   * The one gate every hit on an assassin passes through. Installed as the fighter's
   * `damageAbsorber` so it covers melee, area and tick damage too. In order: nothing reaches her
   * in the air; the cloak takes what would have reached her; the Blade pays for hits in stamina
   * (and still takes them); and otherwise stealth rolls its dodge.
   */
  private absorb(owner: Owner, amount: number): boolean {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || f.damageWasSelfInflicted) return false;

    if (this.now < s.levUntil) {
      this.fx(owner).motes(f.x, f.y, 4, { speed: 120, size: 2.2, life: 260, swirl: 2, depth: 7 });
      return true;
    }
    if (s.coverHp > 0) {
      s.coverHp -= amount;
      this.fx(owner).motes(f.x, f.y, 6, { speed: 170, size: 2.4, life: 320, swirl: 2, depth: 7 });
      if (s.coverHp <= 0) this.endCover(owner, true);
      else this.relay(owner, `cov:${Math.ceil(s.coverHp)}`);
      return true;
    }
    if (s.bey) {
      s.bey.stamina -= amount * BEY_HIT_DRAIN_PER_DAMAGE;
      return false;
    }
    if (Math.random() >= this.dodgeChance(owner)) return false;
    this.arena.spawnDamageNumber(f.x, f.y - 34, -1); // DODGED
    this.fx(owner).motes(f.x, f.y, 7, { speed: 150, size: 2.6, life: 360, swirl: 2.4, depth: 7 });
    this.fx(owner).ring(f.x, f.y, 8, 40, AIR.mist, 260, 2, 7);
    return true;
  }

  private installAbsorbers(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!f) continue;
      if (this.isAir(owner) && this.simulates(owner)) {
        // Install once and leave it: overwriting a foreign absorber would quietly break whoever
        // else set one (Time's Remain uses the same slot).
        if (this.absorbed.has(f) || f.damageAbsorber !== null) continue;
        f.damageAbsorber = (amount) => this.absorb(owner, amount);
        this.absorbed.add(f);
      } else if (this.absorbed.has(f)) {
        f.damageAbsorber = null;
        this.absorbed.delete(f);
      }
    }
  }

  // ── Passive: clouds ──────────────────────────────────────────────────────

  private newCloud(i: number, entering: boolean): Cloud {
    const b = this.arena.worldBounds;
    const r = Phaser.Math.Between(CLOUD_R_MIN, CLOUD_R_MAX);
    // Spread down the arena in lanes, so there is always one within reach.
    const lane = (i + 0.5) / CLOUD_COUNT;
    return {
      x: entering ? b.x - r - i * 150 : b.x + Math.random() * b.width,
      y: b.y + b.height * Phaser.Math.Clamp(lane + (Math.random() - 0.5) * 0.16, 0.1, 0.9),
      r,
      vx: Phaser.Math.Between(CLOUD_SPEED_MIN, CLOUD_SPEED_MAX),
      seed: Math.floor(Math.random() * 1000),
      fleeing: false,
    };
  }

  private cloudAt(owner: Owner, x: number, y: number): Cloud | null {
    for (const c of this.sides[owner].clouds) {
      if (c.fleeing) continue;
      const dx = (x - c.x) / c.r, dy = (y - c.y) / (c.r * CLOUD_FLAT);
      if (dx * dx + dy * dy < 1) return c;
    }
    return null;
  }

  private updateClouds(owner: Owner, dt: number): void {
    const s = this.sides[owner];
    if (!this.isAir(owner)) { s.clouds = []; return; }
    const b = this.arena.worldBounds;

    if (this.simulates(owner)) {
      if (!s.clouds.length && this.now >= s.cloudsBackAt) {
        const entering = s.cloudsBackAt > 0;
        for (let i = 0; i < CLOUD_COUNT; i++) s.clouds.push(this.newCloud(i, entering));
      }
    }
    for (let i = s.clouds.length - 1; i >= 0; i--) {
      const c = s.clouds[i];
      // A replica's sky is mirrored, so its wind — and its fleeing clouds — run the other way.
      const dir = c.vx < 0 ? -1 : 1;
      c.x += (c.fleeing ? CLOUD_FLEE_SPEED * dir : c.vx) * dt;
      if (dir > 0 ? c.x - c.r * 1.9 <= b.right : c.x + c.r * 1.9 >= b.x) continue;
      if (c.fleeing) { s.clouds.splice(i, 1); continue; }
      if (!this.simulates(owner)) continue;
      // Off the far side: come round again on a new line.
      c.x = b.x - c.r;
      c.y = b.y + b.height * (0.1 + Math.random() * 0.8);
    }
  }

  /** Every cloud this side has is torn away. New ones crawl in a few seconds later. */
  private scatterClouds(owner: Owner): void {
    const s = this.sides[owner];
    for (const c of s.clouds) {
      if (c.fleeing) continue;
      c.fleeing = true;
      this.fx(owner).gustBurst(c.x, c.y, c.r * 0.7, { duration: 420, dust: false, depth: 9 });
    }
    s.cloudsBackAt = this.now + CLOUD_RETURN_MS;
  }

  private tickStealth(owner: Owner, dt: number): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.isAir(owner) || !this.alive(f)) { s.inCloud = false; return; }
    s.inCloud = !!this.cloudAt(owner, f.x, f.y);
    if (!this.simulates(owner)) return;
    // Memory's Rebirth: nothing banks while the passive is sealed. Nor from up in the air.
    if (!s.inCloud || f.passivesSealed() || this.now < s.levUntil) return;
    const before = s.stealth;
    const rate = STEALTH_PER_S * (s.coverHp > 0 ? 2 : 1);
    s.stealth = Math.min(STEALTH_MAX, s.stealth + meterGain(f, rate * dt));
    if (before < BIG_STEALTH && s.stealth >= BIG_STEALTH) {
      // Crossing the line that makes the next stab the big one is worth a tell.
      this.fx(owner).ring(f.x, f.y, 10, 46, AIR.white, 320, 3, 7);
      if (owner === 'player') this.sfx(owner, 'gust', 1.5, 0.4);
    }
    if (owner === 'player' && before < PERFECT_STEALTH && s.stealth >= PERFECT_STEALTH) {
      this.arena.unlockAchievement('sharpshooter');
    }
  }

  /** Enemy shots crossing a cloud lose three quarters of their speed for as long as they are in it. */
  private slowShots(dt: number): void {
    const group = this.arena.projectiles;
    if (!group) return;
    const back = (1 - CLOUD_SHOT_SPEED) * dt;
    for (const owner of BOTH) {
      if (!this.sides[owner].clouds.length) continue;
      for (const obj of group.getChildren()) {
        const p = obj as Projectile;
        if (!p.active || p.isFromPlayer === (owner === 'player')) continue;
        if (!this.cloudAt(owner, p.x, p.y)) continue;
        const v = (p.body as Body | null)?.velocity;
        if (!v) continue;
        // Taken off the position rather than the velocity: a homing shot rewrites its velocity
        // every frame, and a shot that leaves the cloud has to get its speed back on its own.
        p.x -= v.x * back;
        p.y -= v.y * back;
      }
    }
  }

  // ── Click: Pierce the Skies ──────────────────────────────────────────────

  /**
   * The stab. Everything about it scales off stealth — how far she is thrown, how hard it lands,
   * how much of a production it is — and it takes all of it. A press with more than half the
   * bar behind it also empties the sky.
   */
  doPierce(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    // A replica's stab arrives whole in `airx-p` — the cast alone does not know her stealth.
    if (!this.alive(f) || !this.simulates(owner)) return;
    const s = this.sides[owner];
    const ang = this.aimOf(owner, tx, ty);
    const stealth = s.stealth;
    const power = stealth / STEALTH_MAX;
    const lunge = PIERCE_LUNGE + stealth * PIERCE_LUNGE_PER_STEALTH;
    const end = this.lungeEnd(f, ang, lunge);
    const len = Phaser.Math.Distance.Between(f.x, f.y, end.x, end.y) + PIERCE_REACH;

    // Everything on the line from where she stands to where the knife ends up, once each.
    const c = Math.cos(ang), sn = Math.sin(ang);
    let backstab = false;
    for (const t of this.targetsOf(owner)) {
      const dx = t.x - f.x, dy = t.y - f.y;
      const along = dx * c + dy * sn;
      const across = Math.abs(-dx * sn + dy * c);
      const r = this.bodyR(t);
      if (along < -r || along > len + r || across > PIERCE_HALF_W + r) continue;
      const bs = this.behind(f, t);
      backstab = backstab || bs;
      this.hit(owner, t, (PIERCE_DAMAGE + stealth * PIERCE_DAMAGE_PER_STEALTH) * (bs ? BACKSTAB_MULT : 1),
        bs ? AIR.charge : AIR.white);
    }

    s.stealth = 0;
    s.lunge = { ang, left: len - PIERCE_REACH };
    if (stealth > BIG_STEALTH) this.scatterClouds(owner);
    this.pierceShow(owner, f.x, f.y, ang, len, power, backstab);
    this.relay(owner, `p:${Math.round(f.x)}:${Math.round(f.y)}:${ang.toFixed(3)}:${Math.round(len)}:${power.toFixed(2)}:${backstab ? 1 : 0}`);
    // A bot follows a stab that got it into range with a short flurry.
    if (owner === 'npc') s.jabUntil = this.now + 500;
  }

  /** Where a lunge of `dist` along `ang` actually ends, with the arena's walls in the way. */
  private lungeEnd(f: Fighter, ang: number, dist: number): { x: number; y: number } {
    const b = this.arena.worldBounds;
    const r = 22;
    return {
      x: Phaser.Math.Clamp(f.x + Math.cos(ang) * dist, b.x + r, b.right - r),
      y: Phaser.Math.Clamp(f.y + Math.sin(ang) * dist, b.y + r, b.bottom - r),
    };
  }

  /** What a stab looks and sounds like, on whichever machine is showing it. */
  private pierceShow(owner: Owner, x: number, y: number, ang: number, len: number, power: number, backstab: boolean): void {
    const s = this.sides[owner];
    const big = power * STEALTH_MAX > BIG_STEALTH;
    s.knifeUntil = this.now + 380;
    this.avatar(owner)?.play('punch', ang, big ? 420 : 300);
    pierceBurst(this.fx(owner), this.col(owner), x, y, ang, len, power, backstab);
    this.sfx(owner, big ? 'slash' : 'air-snipe', big ? 0.7 : 1.3, big ? 1 : 0.7);
    if (!big) return;
    this.sfx(owner, 'gust', 0.8, 0.9);
    this.scars.push({
      owner, x0: x, y0: y, x1: x + Math.cos(ang) * len, y1: y + Math.sin(ang) * len, until: this.now + SCAR_MS,
    });
    this.arena.scene.cameras.main.shake(160 + power * 140, 0.004 + power * 0.006);
  }

  private updateLunge(owner: Owner, dt: number): void {
    const s = this.sides[owner];
    if (!s.lunge) return;
    const f = this.fighter(owner);
    if (!this.alive(f) || s.lunge.left <= 0) {
      if (this.alive(f)) this.body(f).setVelocity(0, 0);
      s.lunge = null;
      return;
    }
    const step = Math.min(s.lunge.left, PIERCE_LUNGE_SPEED * dt);
    // Driven as a velocity, so the arena's walls and blockers stop her like anything else.
    const v = step / Math.max(dt, 0.001);
    this.body(f).setVelocity(Math.cos(s.lunge.ang) * v, Math.sin(s.lunge.ang) * v);
    s.lunge.left -= step;
    if (Math.random() < 0.7) {
      this.fx(owner).motes(f.x, f.y, 1, { angle: s.lunge.ang + Math.PI, spread: 0.5, speed: 90, size: 2.6, life: 300, depth: 5 });
    }
  }

  /** One small stab of the held barrage. Takes no stealth and throws her nowhere. */
  private jab(owner: Owner, ang: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    s.lastJabAt = this.now;
    // A little scatter, so a barrage is a flurry and not one stab drawn eight times.
    const a = ang + (Math.random() - 0.5) * 0.3;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > JAB_REACH + this.bodyR(t)) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > JAB_HALF && d > this.bodyR(t)) continue;
      this.hit(owner, t, JAB_DAMAGE * (this.behind(f, t) ? BACKSTAB_MULT : 1), AIR.mist);
    }
    this.jabShow(owner, a);
    this.relay(owner, `j:${a.toFixed(2)}`);
  }

  private jabShow(owner: Owner, ang: number): void {
    const f = this.fighter(owner);
    this.sides[owner].knifeUntil = this.now + 200;
    this.avatar(owner)?.play('punch', ang, 130);
    jabFlick(this.fx(owner), this.col(owner), f.x, f.y, ang, JAB_REACH);
    this.sfx(owner, 'air-snipe', 1.7 + Math.random() * 0.3, 0.3);
  }

  // ── E: Knock ─────────────────────────────────────────────────────────────

  /** A short, hard blast. Whoever it catches is winded: slow to turn, and on a stamina gauge. */
  doKnock(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = this.aimOf(owner, tx, ty);
    this.avatar(owner)?.play('clap', ang);
    knockBlast(this.fx(owner), this.col(owner), f.x, f.y, ang, KNOCK_RANGE, KNOCK_HALF);
    this.sfx(owner, 'gust', 1.4, 0.9);
    if (!this.simulates(owner)) return;

    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      const r = this.bodyR(t);
      if (d > KNOCK_RANGE + r) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > KNOCK_HALF && d > r) continue;
      this.hit(owner, t, KNOCK_DAMAGE, AIR.white);
      t.airWindedUntil = Date.now() + WINDED_MS;
      t.airStamina = 1;
      t.airExhausted = false;
      // The shove only lands on bodies this machine moves: a remote player walks on their own.
      if (!t.netGhost && t !== this.arena.player) {
        this.shoves.push({ target: t, vx: Math.cos(ang) * KNOCK_SHOVE, vy: Math.sin(ang) * KNOCK_SHOVE, until: this.now + KNOCK_SHOVE_MS });
      }
      this.fx(owner).ring(t.x, t.y, 8, 44, AIR.white, 300, 3, 7);
    }
  }

  private updateShoves(): void {
    for (let i = this.shoves.length - 1; i >= 0; i--) {
      const sh = this.shoves[i];
      if (this.now >= sh.until || !this.alive(sh.target)) { this.shoves.splice(i, 1); continue; }
      this.body(sh.target).setVelocity(sh.vx, sh.vy);
    }
  }

  /**
   * Facing, and what being winded does to it. `Fighter.facingAngle` is what a backstab is judged
   * against, and — for somebody winded — the only way they can aim (`ArenaScene.scatterAim`), so
   * it is kept true here whenever an assassin is in the fight: the player faces the cursor, a bot
   * faces where it is walking. Winded, either one only swings round at a third of a turn.
   */
  private updateFacing(dt: number): void {
    const wall = Date.now();
    const seen = new Set<Fighter>();
    const turn = (f: Fighter | undefined, want: number | null): void => {
      if (!f || seen.has(f) || !this.alive(f) || f.netGhost) return;
      seen.add(f);
      if (want === null) return;
      if (wall < f.airWindedUntil) {
        f.facingAngle = Phaser.Math.Angle.RotateTo(f.facingAngle, want, WINDED_TURN_RAD_PER_S * dt);
      } else {
        f.facingAngle = want;
      }
    };
    const { player, npc } = this.arena;
    turn(player, this.playerAim());
    // A winded bot is trying to look at whoever it is fighting; otherwise it looks where it walks.
    const walking = (f: Fighter): number | null => {
      const v = this.body(f)?.velocity;
      return v && Math.hypot(v.x, v.y) > 12 ? Math.atan2(v.y, v.x) : null;
    };
    if (this.alive(npc)) {
      turn(npc, wall < npc.airWindedUntil && this.alive(player)
        ? Math.atan2(player.y - npc.y, player.x - npc.x) : walking(npc));
    }
    for (const e of this.arena.enemies) if (this.alive(e)) turn(e, walking(e));
  }

  /**
   * The stamina gauge on everybody who is winded. Walking drains it and standing fills it; run it
   * dry and they are exhausted — a crawl (`Fighter.airWindedSpeedMult`) until it is full again.
   */
  private updateWinded(dt: number): void {
    const wall = Date.now();
    const seen = new Set<Fighter>();
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (!f || seen.has(f)) continue;
      seen.add(f);
      if (wall >= f.airWindedUntil || !this.alive(f)) {
        if (f.airExhausted || f.airStamina < 1) { f.airExhausted = false; f.airStamina = 1; }
        continue;
      }
      const v = this.body(f)?.velocity;
      const moving = !!v && Math.hypot(v.x, v.y) > MOVING_SPEED;
      if (f.airExhausted) {
        f.airStamina += dt / STAMINA_REFILL_S;
        if (f.airStamina >= 1) { f.airStamina = 1; f.airExhausted = false; }
      } else if (moving) {
        f.airStamina -= dt / STAMINA_DRAIN_S;
        if (f.airStamina <= 0) {
          f.airStamina = 0;
          f.airExhausted = true;
          this.pfx.ring(f.x, f.y, 6, 34, AIR.slate, 320, 3, 7);
        }
      } else {
        f.airStamina = Math.min(1, f.airStamina + dt / STAMINA_REFILL_S);
      }
    }
  }

  // ── R: Cloud Cover ───────────────────────────────────────────────────────

  /** Wrap up in rain. Gone from sight, and whatever would have hit her hits the cloak. */
  doCloudCover(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    s.coverHp = COVER_HP;
    s.coverNextDecayAt = this.now + COVER_DECAY_MS;
    this.avatar(owner)?.play('flex', undefined, 520);
    coverBurst(this.fx(owner), this.col(owner), f.x, f.y, false);
    this.sfx(owner, 'rain', 1.3, 0.7);
  }

  private endCover(owner: Owner, broke: boolean): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.coverHp = 0;
    if (this.alive(f)) {
      coverBurst(this.fx(owner), this.col(owner), f.x, f.y, true);
      this.sfx(owner, 'gust', broke ? 1.6 : 1.1, 0.6);
    }
    this.relay(owner, 'cov:0');
  }

  private updateCover(owner: Owner): void {
    const s = this.sides[owner];
    if (s.coverHp <= 0 || !this.simulates(owner)) return;
    if (!this.alive(this.fighter(owner))) { s.coverHp = 0; return; }
    if (this.now < s.coverNextDecayAt) return;
    s.coverNextDecayAt += COVER_DECAY_MS;
    s.coverHp -= COVER_DECAY;
    if (s.coverHp <= 0) this.endCover(owner, false);
    else this.relay(owner, `cov:${Math.ceil(s.coverHp)}`);
  }

  // ── F: Combo ─────────────────────────────────────────────────────────────

  /** The opener: six knives down the aim, and the ring starts closing. */
  doCombo(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    const ang = this.aimOf(owner, tx, ty);
    this.avatar(owner)?.play('sweep', ang);
    this.sfx(owner, 'slash', 1.3, 0.8);
    for (let i = 0; i < VOLLEY_KNIVES; i++) {
      const a = ang + ((i / (VOLLEY_KNIVES - 1)) - 0.5) * 2 * VOLLEY_SPREAD;
      // Out from the middle: the centre pair leaves first.
      const order = Math.abs(i - (VOLLEY_KNIVES - 1) / 2);
      this.knives.push({
        owner, x: f.x, y: f.y, vx: Math.cos(a) * VOLLEY_SPEED, vy: Math.sin(a) * VOLLEY_SPEED,
        travelled: 0, delay: order * VOLLEY_STAGGER_MS, t: 0,
      });
    }
    this.openRing(owner, 1, this.now + RING_DELAY_MS);
  }

  private openRing(owner: Owner, stage: 1 | 2, from: number): void {
    const s = this.sides[owner];
    const ringAt = from + RING_MS;
    let botPressAt = 0;
    if (owner === 'npc' && this.simulates(owner)) {
      // A bot's timing is as good as its difficulty: the best ones answer nearly every ring.
      const lands = Math.random() < 0.9 - this.arena.npcSlack * 0.7;
      botPressAt = lands ? ringAt - 40 + Math.random() * 80 : 0;
    }
    s.combo = { stage, ringFrom: from, ringAt, botPressAt };
  }

  /** F pressed with a ring up: on the beat it is the next move, off it the combo is over. */
  private pressCombo(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const cmb = s.combo;
    if (!cmb || !this.alive(f) || this.gagged(f)) return;
    // Before the ring is even on screen there is nothing to answer yet.
    if (this.now < cmb.ringFrom) return;
    const off = this.now - cmb.ringAt;
    if (off < -RING_EARLY_MS || off > RING_LATE_MS) { this.missCombo(owner); return; }
    ringVerdict(this.fx(owner), this.col(owner), f.x, f.y, RING_MARK_R, true);
    if (cmb.stage === 1) {
      this.flip(owner);
      this.relay(owner, 'flip');
    } else {
      const aim = owner === 'player'
        ? { x: this.arena.pointerX, y: this.arena.pointerY }
        : (this.mainTarget(owner) ?? f);
      this.rain(owner, aim.x, aim.y, this.nextFieldId++);
    }
  }

  private missCombo(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!s.combo) return;
    s.combo = null;
    if (this.alive(f)) {
      ringVerdict(this.fx(owner), this.col(owner), f.x, f.y, RING_MARK_R, false);
      this.sfx(owner, 'air-snipe', 0.5, 0.5);
    }
    this.relay(owner, 'miss');
  }

  /** Second beat: off the floor and out of reach for three seconds, with one more ring to come. */
  private flip(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.levFrom = this.now;
    s.levUntil = this.now + LEVITATE_MS;
    this.avatar(owner)?.play('raise', undefined, 700);
    flipBurst(this.fx(owner), this.col(owner), f.x, f.y, LEVITATE_LIFT);
    this.sfx(owner, 'gust', 1.2, 0.9);
    // The last ring lands while she is still well up in the air: answer it and the rain is how
    // she comes down; miss it and she just drifts down at the end of the three seconds.
    this.openRing(owner, 2, s.levUntil - RING2_BEFORE_LANDING_MS - RING_MS);
  }

  /** Third beat: a rank of knives into the floor at the cursor. It stays, and it cuts feet. */
  private rain(owner: Owner, x: number, y: number, id: number): void {
    const s = this.sides[owner];
    s.combo = null;
    // Down she comes, whenever in the three seconds it was called.
    s.levUntil = Math.min(s.levUntil, this.now + 180);
    const knives: FieldKnife[] = [];
    for (let cx = 0; cx < FIELD_COLS; cx++) {
      for (let cy = 0; cy < FIELD_ROWS; cy++) {
        knives.push({
          dx: ((cx + 0.5) / FIELD_COLS - 0.5) * 2 * (FIELD_HALF_W - 14),
          dy: ((cy + 0.5) / FIELD_ROWS - 0.5) * 2 * (FIELD_HALF_H - 12),
          lean: (((cx * 7 + cy * 13) % 5) - 2) * 0.06,
          delay: cx * 35 + cy * 20,
        });
      }
    }
    this.fields.push({
      id, owner, x, y, knives, bornAt: this.now, until: this.now + FIELD_MS, struck: false, lastStep: new Map(),
    });
    this.avatar(owner)?.play('slam', Math.atan2(y - this.fighter(owner).y, x - this.fighter(owner).x));
    this.sfx(owner, 'slash', 0.8, 1);
    this.relay(owner, `rain:${Math.round(x)}:${Math.round(y)}:${id}`);
  }

  private updateCombo(owner: Owner): void {
    const s = this.sides[owner];
    const cmb = s.combo;
    if (!cmb || !this.simulates(owner)) return;
    if (!this.alive(this.fighter(owner))) { s.combo = null; return; }
    if (cmb.botPressAt > 0 && this.now >= cmb.botPressAt) { this.pressCombo(owner); return; }
    // Let go by: the ring closed and nobody answered it.
    if (this.now > cmb.ringAt + RING_LATE_MS) this.missCombo(owner);
  }

  private inField(fd: Field, x: number, y: number, pad = 0): boolean {
    return Math.abs(x - fd.x) <= FIELD_HALF_W + pad && Math.abs(y - fd.y) <= FIELD_HALF_H + pad;
  }

  private updateKnives(dt: number, delta: number): void {
    const b = this.arena.worldBounds;
    for (let i = this.knives.length - 1; i >= 0; i--) {
      const k = this.knives[i];
      if (k.delay > 0) {
        k.delay -= delta;
        // Still in the hand: it leaves from wherever she is now.
        const f = this.fighter(k.owner);
        if (f) { k.x = f.x; k.y = f.y; }
        continue;
      }
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.travelled += VOLLEY_SPEED * dt;
      k.t += dt;
      let done = k.travelled >= VOLLEY_RANGE || !b.contains(k.x, k.y);
      for (const t of this.targetsOf(k.owner)) {
        if (Phaser.Math.Distance.Between(k.x, k.y, t.x, t.y) > this.bodyR(t) + 10) continue;
        this.hit(k.owner, t, VOLLEY_DAMAGE, AIR.mist);
        done = true;
        break;
      }
      if (done) {
        knifeHit(this.fx(k.owner), k.x, k.y, Math.atan2(k.vy, k.vx));
        this.knives.splice(i, 1);
      }
    }
  }

  private updateFields(): void {
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const fd = this.fields[i];
      if (this.now >= fd.until) { this.fields.splice(i, 1); continue; }
      const age = this.now - fd.bornAt;
      if (!fd.struck && age >= FIELD_STRIKE_AT_MS) {
        fd.struck = true;
        this.fx(fd.owner).dustMark(fd.x, fd.y, FIELD_HALF_W);
        this.fx(fd.owner).ring(fd.x, fd.y, 20, FIELD_HALF_W * 1.2, AIR.white, 320, 3, 4);
        this.arena.scene.cameras.main.shake(120, 0.004);
        for (const t of this.targetsOf(fd.owner)) {
          if (!this.inField(fd, t.x, t.y, this.bodyR(t) * 0.5)) continue;
          this.hit(fd.owner, t, FIELD_STRIKE_DAMAGE, AIR.white);
          fd.lastStep.set(t, this.now);
        }
        continue;
      }
      if (!fd.struck) continue;
      // Stepping on it: only feet that are moving get cut.
      for (const t of this.targetsOf(fd.owner)) {
        if (!this.inField(fd, t.x, t.y)) continue;
        const v = this.body(t)?.velocity;
        if (!v || Math.hypot(v.x, v.y) <= MOVING_SPEED) continue;
        if (this.now - (fd.lastStep.get(t) ?? 0) < FIELD_STEP_MS) continue;
        fd.lastStep.set(t, this.now);
        this.hit(fd.owner, t, FIELD_STEP_DAMAGE, AIR.mist);
      }
    }
  }

  // ── Q: Tornado Blade ─────────────────────────────────────────────────────

  /** Fans out, feet off the floor: she is a spinning top until the stamina runs out. */
  doTornadoBlade(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    const max = BEY_STAMINA + s.stealth * BEY_STAMINA_PER_STEALTH;
    const v = this.body(f).velocity;
    s.bey = {
      stamina: max, max, vx: v.x, vy: v.y, spin: 0, tilt: 0, shred: null, immune: new Map(), orbit: 0, trail: [],
    };
    s.combo = null;
    s.lunge = null;
    beyBurst(this.fx(owner), this.col(owner), f.x, f.y, false);
    this.sfx(owner, 'tornado', 1.1, 1);
  }

  private endBey(owner: Owner): void {
    const s = this.sides[owner];
    if (!s.bey) return;
    s.bey = null;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      beyBurst(this.fx(owner), this.col(owner), f.x, f.y, true);
      this.sfx(owner, 'gust', 0.8, 0.8);
      if (this.simulates(owner)) this.body(f).setVelocity(0, 0);
    }
    this.relay(owner, 'bey:0');
  }

  /** Where the Blade is trying to get to: the cursor, or — for a bot — its knives, then its enemy. */
  private beyGoal(owner: Owner): { x: number; y: number } {
    if (owner === 'player') return { x: this.arena.pointerX, y: this.arena.pointerY };
    const f = this.fighter(owner);
    const s = this.sides[owner];
    // Synergy: a field of its own knives within reach is worth collecting before the chase.
    if (s.bey && s.bey.orbit === 0) {
      const fd = this.fields.find((o) => o.owner === owner && o.struck
        && Phaser.Math.Distance.Between(f.x, f.y, o.x, o.y) < 260);
      if (fd) return fd;
    }
    return this.mainTarget(owner) ?? f;
  }

  private updateBey(owner: Owner, dt: number): void {
    const s = this.sides[owner];
    const bey = s.bey;
    if (!bey) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.bey = null; return; }
    bey.spin += dt * (bey.shred ? 44 : 26);

    // The line of sparks, wherever the body is — a replica's too.
    const last = bey.trail[bey.trail.length - 1];
    if (!last || Phaser.Math.Distance.Between(last.x, last.y, f.x, f.y) > 9) {
      bey.trail.push({ x: f.x, y: f.y + 10, at: this.now });
    }
    while (bey.trail.length && this.now - bey.trail[0].at > BEY_TRAIL_MS) bey.trail.shift();

    if (!this.simulates(owner)) return;
    const body = this.body(f);
    const b = this.arena.worldBounds;

    bey.stamina -= dt;
    if (bey.stamina <= 0) { this.endBey(owner); return; }

    for (const [t, until] of bey.immune) if (this.now >= until) bey.immune.delete(t);

    // Knives swinging round it: each one that finds somebody cuts them and is gone.
    for (let i = 0; i < bey.orbit; i++) {
      const a = bey.spin * 0.35 + (i / bey.orbit) * Math.PI * 2;
      const kx = f.x + Math.cos(a) * BEY_ORBIT_R, ky = f.y + Math.sin(a) * BEY_ORBIT_R;
      const t = this.targetsOf(owner).find((o) => Phaser.Math.Distance.Between(kx, ky, o.x, o.y) <= this.bodyR(o) + 8);
      if (!t) continue;
      this.hit(owner, t, BEY_ORBIT_DAMAGE, AIR.white);
      knifeHit(this.fx(owner), kx, ky, a);
      bey.orbit--;
      this.relay(owner, `orb:${bey.orbit}`);
      break;
    }
    // Rolling over her own field takes the knives up out of the floor.
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const fd = this.fields[i];
      if (fd.owner !== owner || !fd.struck || !this.inField(fd, f.x, f.y)) continue;
      bey.orbit += fd.knives.length;
      this.fx(owner).vortexCore(fd.x, fd.y, FIELD_HALF_W * 0.7, 360);
      this.sfx(owner, 'slash', 1.6, 0.7);
      this.fields.splice(i, 1);
      this.relay(owner, `take:${fd.id}:${bey.orbit}`);
    }

    if (bey.shred) {
      const sh = bey.shred;
      const t = sh.target;
      if (!this.alive(t) || this.now >= sh.until) {
        // Thrown off, back the way it came in.
        const out = this.alive(t) ? Math.atan2(f.y - t.y, f.x - t.x) : sh.inAng + Math.PI;
        const away = Math.abs(Phaser.Math.Angle.Wrap(out - (sh.inAng + Math.PI))) < 1.2 ? out : sh.inAng + Math.PI;
        bey.vx = Math.cos(away) * BEY_LAUNCH_SPEED;
        bey.vy = Math.sin(away) * BEY_LAUNCH_SPEED;
        if (this.alive(t)) bey.immune.set(t, this.now + BEY_REHIT_MS);
        bey.shred = null;
        this.fx(owner).gustBurst(f.x, f.y, 60, { duration: 300, dust: false });
        this.sfx(owner, 'slash', 0.6, 1);
        this.relay(owner, 'shred:0');
      } else {
        // Grinding: dragged slowly through them, ticking, and their own attacks slowed.
        if (this.now - sh.lastTick >= BEY_TICK_MS) {
          sh.lastTick = this.now;
          const storm = this.arena.hasPerk(owner, 'storm');
          this.hit(owner, t, BEY_TICK_DAMAGE + (storm ? STORM_BOLT_DAMAGE : 0), AIR.charge);
          if (storm) this.fx(owner).staticSnap(t.x, t.y, 30);
          t.airShredUntil = Date.now() + BEY_SLOW_ATTACK_MS;
          shredSparks(this.fx(owner), (f.x + t.x) / 2, (f.y + t.y) / 2, Math.atan2(f.y - t.y, f.x - t.x));
        }
        bey.vx = Math.cos(sh.inAng) * BEY_MAX_SPEED * BEY_SHRED_SPEED;
        bey.vy = Math.sin(sh.inAng) * BEY_MAX_SPEED * BEY_SHRED_SPEED;
      }
    } else {
      // Skating: pulled at the goal, barely any grip, so it overshoots and swings back.
      const goal = this.beyGoal(owner);
      const gx = goal.x - f.x, gy = goal.y - f.y;
      const gd = Math.hypot(gx, gy);
      if (gd > 6) {
        bey.vx += (gx / gd) * BEY_ACCEL * dt;
        bey.vy += (gy / gd) * BEY_ACCEL * dt;
      }
      const drag = Math.exp(-BEY_DRAG * dt);
      bey.vx *= drag;
      bey.vy *= drag;
      const sp = Math.hypot(bey.vx, bey.vy);
      if (sp > BEY_MAX_SPEED) { bey.vx *= BEY_MAX_SPEED / sp; bey.vy *= BEY_MAX_SPEED / sp; }

      // Walls throw it back.
      const hitX = (f.x <= b.x + BEY_RADIUS && bey.vx < 0) || (f.x >= b.right - BEY_RADIUS && bey.vx > 0);
      const hitY = (f.y <= b.y + BEY_RADIUS && bey.vy < 0) || (f.y >= b.bottom - BEY_RADIUS && bey.vy > 0);
      if (hitX) bey.vx *= -BEY_WALL_BOUNCE;
      if (hitY) bey.vy *= -BEY_WALL_BOUNCE;
      if ((hitX || hitY) && sp > 160) {
        shredSparks(this.fx(owner), f.x, f.y, Math.atan2(bey.vy, bey.vx));
        this.sfx(owner, 'slash', 1.8, 0.4);
      }

      // Contact: bite into the first body it touches.
      for (const t of this.targetsOf(owner)) {
        if (bey.immune.has(t)) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > BEY_RADIUS + this.bodyR(t)) continue;
        const inAng = sp > 40 ? Math.atan2(bey.vy, bey.vx) : Math.atan2(t.y - f.y, t.x - f.x);
        bey.shred = { target: t, until: this.now + BEY_SHRED_MS, lastTick: 0, inAng };
        this.fx(owner).flash(t.x, t.y, 40);
        this.sfx(owner, 'tornado', 1.7, 0.9);
        this.relay(owner, 'shred:1');
        break;
      }
    }
    bey.tilt += (Phaser.Math.Clamp(bey.vx / BEY_MAX_SPEED, -1, 1) - bey.tilt) * Math.min(1, dt * 8);
    body.setVelocity(bey.vx, bey.vy);
  }

  // ── Frame ────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const wasDown = this.pointerWasDown;
    this.pointerWasDown = pointer.isDown;
    if (!this.arena.isPlayerAir || this.arena.nukeChanneling) return;
    const s = this.sides.player;
    const p = this.arena.player;
    if (!this.alive(p)) return;
    // The Blade is steered with the cursor and nothing else.
    if (s.bey || s.lunge) return;

    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
    const down = Phaser.Input.Keyboard.JustDown;

    // F is three presses: the cast, then an answer to each ring.
    if (down(this.arena.fKey)) {
      if (s.combo) this.pressCombo('player');
      else if (time >= s.levUntil) p.castAbility(COMBO_ID, ctx);
    }
    // Up in the air there is nothing to do but wait for the ring.
    if (time < s.levUntil) return;

    if (pointer.isDown) {
      if (!wasDown) {
        s.holdSince = time;
        p.castAbility(PIERCE_ID, ctx);
      } else if (time - s.holdSince >= JAB_HOLD_MS && time - s.lastJabAt >= JAB_EVERY_MS && !this.gagged(p)) {
        this.jab('player', this.playerAim());
      }
    }
    if (down(this.arena.eKey)) p.castAbility(KNOCK_ID, ctx);
    if (down(this.arena.rKey)) p.castAbility(COVER_ID, ctx);
    if (down(this.arena.qKey)) p.castAbility(BEY_ID, ctx);
  }

  /**
   * Runs after NPC AI and husk movement have written their velocities for the frame — the lunge,
   * the shove and the Blade all drive bodies, and have to have the last word on where they go.
   */
  update(time: number, delta: number): void {
    void time;
    const dt = delta / 1000;
    this.vizT += dt;
    this.installAbsorbers();

    for (const owner of BOTH) {
      this.updateClouds(owner, dt);
      this.tickStealth(owner, dt);
      this.updateCover(owner);
      this.updateCombo(owner);
      this.updateLunge(owner, dt);
      this.updateBey(owner, dt);
      this.updateBot(owner);
      this.updateHidden(owner);
    }
    this.slowShots(dt);
    this.updateShoves();
    this.updateFacing(dt);
    this.updateWinded(dt);
    this.updateKnives(dt, delta);
    this.updateFields();
    for (let i = this.scars.length - 1; i >= 0; i--) if (this.now >= this.scars[i].until) this.scars.splice(i, 1);

    // WASD stands down for exactly as long as the kit is the one moving her.
    const ps = this.sides.player;
    const driving = this.arena.isPlayerAir && (!!ps.lunge || !!ps.bey);
    if (driving) { this.arena.isDodging = true; this.drivingPlayer = true; }
    else if (this.drivingPlayer) { this.arena.isDodging = false; this.drivingPlayer = false; }

    // Mirrored onto the fighters so the status tray can read the dodge without knowing air exists.
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (f) f.windDodge = this.dodgeChance(owner);
    }

    this.relaySky();
    this.updateDrama(delta);
    this.updateAvatars(delta);
    this.paint();
  }

  /** Hidden bodies: cloaked, lifted off the floor, or turned into the Blade. Latched. */
  private updateHidden(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!f) return;
    const want = this.isAir(owner) && this.alive(f) && (s.coverHp > 0 || this.now < s.levUntil || !!s.bey);
    if (want === s.hidden) return;
    s.hidden = want;
    // `forceInvisible` exists for exactly this: without it `takeDamage`'s alpha flash would paint
    // the sprite back onto the floor under a body the kit is drawing somewhere else.
    f.forceInvisible = want;
  }

  /** How high off the floor the rig is drawn right now. */
  private liftOf(owner: Owner): number {
    const s = this.sides[owner];
    if (this.now >= s.levUntil) return 0;
    const up = Phaser.Math.Clamp((this.now - s.levFrom) / 320, 0, 1);
    const down = Phaser.Math.Clamp((s.levUntil - this.now) / 180, 0, 1);
    return LEVITATE_LIFT * Math.min(1 - (1 - up) * (1 - up), down) + Math.sin(this.vizT * 3) * 4 * up * down;
  }

  // ── Bot ──────────────────────────────────────────────────────────────────

  /**
   * What the kit does for a bot that the AI's cast list cannot: the held barrage, and walking
   * into a cloud to bank stealth when there is nothing better to do. (The Combo's presses are
   * scheduled in `openRing`, and the Blade steers itself in `beyGoal`.)
   */
  private updateBot(owner: Owner): void {
    if (owner !== 'npc' || !this.isAir(owner) || !this.simulates(owner)) return;
    const s = this.sides.npc;
    const f = this.arena.npc;
    if (!this.alive(f) || s.bey || s.lunge) return;
    const t = this.mainTarget('npc');

    if (this.now < s.jabUntil && this.now - s.lastJabAt >= JAB_EVERY_MS && t && !this.gagged(f)
        && Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= JAB_REACH + this.bodyR(t)) {
      this.jab('npc', Math.atan2(t.y - f.y, t.x - f.x));
    }

    // Stealth is the whole kit's fuel, so a bot with none and nobody on top of it goes and gets
    // some: it keeps the speed the AI chose and is turned toward the nearest cloud.
    if (s.stealth >= 60 || s.inCloud || f.frozenUntil > this.now) return;
    if (t && Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < 230) return;
    let best: Cloud | null = null;
    let bestD = 360;
    for (const c of s.clouds) {
      if (c.fleeing) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) return;
    const v = this.body(f).velocity;
    const sp = Math.hypot(v.x, v.y);
    if (sp < 30) return;
    const a = Math.atan2(best.y - f.y, best.x - f.x);
    this.body(f).setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
  }

  /** Mirrors the opponent's casts onto their rig. */
  handleNpcCastId(id: string | null): void {
    if (!id) return;
    const gesture = GESTURES[id];
    if (!gesture || id === PIERCE_ID) return;
    this.npcAvatar?.play(gesture, this.aimOf('npc'));
  }

  // ── What ArenaScene and the AI are allowed to ask ────────────────────────

  /** The barrage is thrown standing nearly still. */
  getPlayerSpeedMult(): number {
    const s = this.sides.player;
    return this.pointerWasDown && this.now - s.lastJabAt < JAB_EVERY_MS * 2 ? JAB_SPEED_MULT : 1;
  }
  getNpcSpeedMult(): number {
    return this.now < this.sides.npc.jabUntil ? JAB_SPEED_MULT : 1;
  }

  /** True while the bot's body is the kit's to move: shoved by a Knock, lunging, or spinning. */
  locksNpc(): boolean {
    const s = this.sides.npc;
    return !!s.bey || !!s.lunge || this.shoves.some((sh) => sh.target === this.arena.npc);
  }

  /** Wrapped in Cloud Cover. ArenaScene folds the player's answer into `NpcAiState.targetInvisible`. */
  isCloaked(owner: Owner): boolean { return this.isAir(owner) && this.sides[owner].coverHp > 0; }
  isBladeActive(owner: Owner): boolean { return !!this.sides[owner].bey; }
  /** 0–1 for the ability cards: the cloak's health, and the Blade's stamina. */
  getCoverRatio(): number { return Phaser.Math.Clamp(this.sides.player.coverHp / COVER_HP, 0, 1); }
  getBladeRatio(): number {
    const bey = this.sides.player.bey;
    return bey ? Phaser.Math.Clamp(bey.stamina / bey.max, 0, 1) : 0;
  }
  getStealth(owner: Owner): number { return this.sides[owner].stealth; }

  /** Lunging, spinning, or up in the air: nothing else can be cast. */
  npcAirBusy(): boolean {
    const s = this.sides.npc;
    return !!s.bey || !!s.lunge || this.now < s.levUntil;
  }
  /** How far a stab thrown now would reach: the lunge its stealth buys, plus the knife. */
  npcAirPierceReach(): number {
    return PIERCE_LUNGE + this.sides.npc.stealth * PIERCE_LUNGE_PER_STEALTH + PIERCE_REACH;
  }
  /** Synergy: more than half the bar is banked, so the next stab is the big one. */
  npcAirBigStab(): boolean { return this.sides.npc.stealth > BIG_STEALTH; }
  /** Synergy: the bot is in its target's blind spot — a stab now is doubled. */
  npcAirBackstab(): boolean {
    const t = this.mainTarget('npc');
    return !!t && this.alive(this.arena.npc) && this.behind(this.arena.npc, t);
  }
  /** Synergy: the target is winded and cannot turn to face a stab. */
  npcAirTargetWinded(): boolean {
    const t = this.mainTarget('npc');
    return !!t && Date.now() < t.airWindedUntil;
  }
  /** Synergy: standing in its own cloud without the cloak on — Cloud Cover would double the stealth. */
  npcAirCoverPays(): boolean {
    const s = this.sides.npc;
    return s.inCloud && s.coverHp <= 0 && s.stealth < 60;
  }
  /** Synergy: its knives are standing in the floor near enough for the Blade to collect. */
  npcAirFieldLive(): boolean {
    const f = this.arena.npc;
    return this.alive(f) && this.fields.some((o) => o.owner === 'npc' && o.struck
      && Phaser.Math.Distance.Between(f.x, f.y, o.x, o.y) < 260);
  }
  /** A Combo is mid-ring: the F key belongs to the kit until it resolves. */
  npcAirComboLive(): boolean { return !!this.sides.npc.combo; }

  // ── Net ──────────────────────────────────────────────────────────────────

  /** Our sky, for the machine that only draws it: `sky:stealth:x,y,r,vx,seed,fleeing;…`. */
  private relaySky(): void {
    if (!this.arena.isOnline || !this.arena.isPlayerAir || this.now - this.lastSkyAt < NET_SKY_MS) return;
    this.lastSkyAt = this.now;
    const s = this.sides.player;
    const rows = s.clouds.map((c) =>
      [Math.round(c.x), Math.round(c.y), c.r, c.vx, c.seed, c.fleeing ? 1 : 0].join(','));
    this.relay('player', `sky:${Math.round(s.stealth)}:${rows.join(';')}`);
  }

  /** Something the other machine's assassin did. Its coordinates are mirrored, like its body. */
  replayNet(id: string): void {
    if (!this.arena.isNpcAir) return;
    const parts = id.slice(NET.length).split(':');
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    const s = this.sides.npc;
    const f = this.arena.npc;
    const b = this.arena.worldBounds;
    // The other machine's arena is ours seen from the far side.
    const mx = (x: number): number => b.x + b.right - x;
    const ma = (a: number): number => Math.atan2(Math.sin(a), -Math.cos(a));
    switch (parts[0]) {
      case 'sky':
        s.stealth = n(1);
        s.clouds = (parts[2] ?? '').split(';').filter(Boolean).map((row) => {
          const v = row.split(',').map(Number);
          // Mirrored, so their wind blows the other way across our screen.
          return { x: mx(v[0]), y: v[1], r: v[2], vx: -v[3], seed: v[4], fleeing: v[5] === 1 };
        });
        break;
      case 'p':
        this.pierceShow('npc', mx(n(1)), n(2), ma(n(3)), n(4), n(5), n(6) === 1);
        break;
      case 'j':
        if (this.alive(f)) this.jabShow('npc', ma(n(1)));
        break;
      case 'cov':
        if (n(1) > 0) s.coverHp = n(1);
        else if (s.coverHp > 0) { s.coverHp = 0; if (this.alive(f)) coverBurst(this.fx('npc'), this.ncol, f.x, f.y, true); }
        break;
      case 'flip':
        if (this.alive(f)) {
          ringVerdict(this.fx('npc'), this.ncol, f.x, f.y, RING_MARK_R, true);
          this.flip('npc');
        }
        break;
      case 'miss':
        if (s.combo && this.alive(f)) ringVerdict(this.fx('npc'), this.ncol, f.x, f.y, RING_MARK_R, false);
        s.combo = null;
        break;
      case 'rain':
        this.rain('npc', mx(n(1)), n(2), n(3));
        break;
      case 'take': {
        const i = this.fields.findIndex((o) => o.owner === 'npc' && o.id === n(1));
        if (i >= 0) this.fields.splice(i, 1);
        if (s.bey) s.bey.orbit = n(2);
        break;
      }
      case 'orb':
        if (s.bey) s.bey.orbit = n(1);
        break;
      case 'shred':
        if (s.bey) {
          s.bey.shred = n(1) === 1 && this.alive(this.arena.player)
            ? { target: this.arena.player, until: Infinity, lastTick: 0, inAng: 0 } : null;
        }
        break;
      case 'bey':
        if (n(1) === 0) this.endBey('npc');
        break;
    }
  }

  // ── The close-up ─────────────────────────────────────────────────────────

  /** Who the camera should be on, if the local player is in a grind — as the Blade or under it. */
  private dramaFocus(): { x: number; y: number } | null {
    const p = this.arena.player;
    const mine = this.sides.player.bey?.shred;
    if (mine && this.alive(mine.target)) return { x: (p.x + mine.target.x) / 2, y: (p.y + mine.target.y) / 2 };
    const theirs = this.sides.npc.bey?.shred;
    if (theirs && theirs.target === p && this.alive(this.arena.npc)) {
      return { x: (p.x + this.arena.npc.x) / 2, y: (p.y + this.arena.npc.y) / 2 };
    }
    return null;
  }

  /**
   * While the Blade is grinding inside somebody the camera pushes in on the pair and — offline,
   * where there is only one clock to keep — bodies and effects run slow. Both ease in and out as
   * a ratio on whatever else has the camera, and both are handed back exactly.
   */
  private updateDrama(delta: number): void {
    const scene = this.arena.scene;
    const cam = scene.cameras.main;
    if (!cam) return;
    if (this.camRef !== cam) { this.camRef = cam; this.camZoomF = 1; this.camDX = 0; this.camDY = 0; }
    const focus = this.dramaFocus();
    const goal = focus ? 1 : 0;
    if (this.drama === goal && !focus) return;
    const k = 1 - Math.exp(-(delta / 1000) * 9);
    this.drama += (goal - this.drama) * k;
    if (Math.abs(goal - this.drama) < 0.004) this.drama = goal;

    const zf = 1 + DRAMA_ZOOM * this.drama;
    cam.setZoom((cam.zoom / this.camZoomF) * zf);
    this.camZoomF = zf;
    // Lean the view toward the pair, by as much as the zoom has room for.
    cam.scrollX -= this.camDX;
    cam.scrollY -= this.camDY;
    if (focus) {
      const mid = cam.midPoint;
      this.camDX = (focus.x - mid.x) * (1 - 1 / zf) * 2;
      this.camDY = (focus.y - mid.y) * (1 - 1 / zf) * 2;
    } else {
      this.camDX *= this.drama;
      this.camDY *= this.drama;
    }
    cam.scrollX += this.camDX;
    cam.scrollY += this.camDY;
    // The pointer only re-projects on a mouse move; the Blade steers by it regardless.
    scene.input.activePointer.updateWorldPoint(cam);

    if (this.arena.isOnline) return;
    const slow = 1 - DRAMA_SLOW * this.drama;
    if (this.drama > 0) {
      this.slowed = true;
      scene.physics.world.timeScale = 1 / slow;
      scene.tweens.timeScale = slow;
    } else if (this.slowed) {
      this.slowed = false;
      scene.physics.world.timeScale = 1;
      scene.tweens.timeScale = 1;
    }
  }

  private restoreDrama(): void {
    const scene = this.arena.scene;
    const cam = scene.cameras?.main;
    if (cam && cam === this.camRef) {
      if (this.camZoomF !== 1) cam.setZoom(cam.zoom / this.camZoomF);
      cam.scrollX -= this.camDX;
      cam.scrollY -= this.camDY;
    }
    if (this.slowed) {
      if (scene.physics?.world) scene.physics.world.timeScale = 1;
      if (scene.tweens) scene.tweens.timeScale = 1;
    }
    this.slowed = false;
    this.drama = 0;
    this.camZoomF = 1;
    this.camDX = 0;
    this.camDY = 0;
    this.camRef = null;
  }

  // ── Rig ──────────────────────────────────────────────────────────────────

  private makeAvatar(owner: Owner): BaseAvatar {
    const { scene } = this.arena;
    return makeSkinAvatar(this.arena.skinId(owner), scene) ?? new AirAvatar(scene, this.col(owner));
  }

  /** How much of this side's rig this screen shows. */
  private rigAlpha(owner: Owner): number {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (s.bey) return 0;
    if (this.now < s.levUntil) return 1;
    if (s.coverHp > 0) return this.hidesFromViewer(owner) ? 0 : COVER_SELF_ALPHA;
    return f.forceInvisible ? 0 : f.alpha;
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!this.isAir(owner) || !f?.active) {
        if (av) {
          av.destroy();
          if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        }
        continue;
      }
      if (!av) {
        av = this.makeAvatar(owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.sides[owner];
      av.setFacing(owner === 'player' ? this.playerAim() : this.aimOf('npc'));
      // Stealth swells the rig a little, so how hidden she is reads off the character itself.
      av.setIntensity(1 + (s.stealth / STEALTH_MAX) * 0.3);
      if (av instanceof AirAvatar) {
        av.setKnife(this.now < s.knifeUntil ? 1 : 0);
        av.setSolidBody(s.hidden);
      }
      av.setHold(this.now < s.levUntil ? 'ride' : null);
      av.update(delta, f.x, f.y - this.liftOf(owner), this.rigAlpha(owner));
    }
  }

  // ── Painting ─────────────────────────────────────────────────────────────

  private paint(): void {
    const scene = this.arena.scene;
    if (!this.groundGfx || !this.groundGfx.active) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.airGfx || !this.airGfx.active) this.airGfx = scene.add.graphics().setDepth(8.5);
    if (!this.skyGfx || !this.skyGfx.active) this.skyGfx = scene.add.graphics().setDepth(9.5);
    const ground = this.groundGfx, air = this.airGfx, sky = this.skyGfx;
    ground.clear();
    air.clear();
    sky.clear();
    const t = this.vizT;

    for (const sc of this.scars) {
      drawScar(ground, this.col(sc.owner), sc.x0, sc.y0, sc.x1, sc.y1, (sc.until - this.now) / SCAR_MS);
    }
    for (const fd of this.fields) {
      const left = fd.until - this.now;
      drawDaggerField(ground, this.col(fd.owner), fd.x, fd.y, FIELD_HALF_W, FIELD_HALF_H, fd.knives,
        this.now - fd.bornAt, Math.min(1, left / 500), t);
    }
    for (const k of this.knives) {
      if (k.delay > 0) continue;
      drawAirKnife(air, this.col(k.owner), k.x, k.y, Math.atan2(k.vy, k.vx), 26, 1, k.t * 6);
    }

    for (const owner of BOTH) {
      if (!this.isAir(owner)) continue;
      const s = this.sides[owner];
      const f = this.fighter(owner);
      const col = this.col(owner);
      // An enemy's bank is solid; your own — and an ally's — is something you look through.
      const solid = this.hidesFromViewer(owner);
      for (const c of s.clouds) drawCloud(sky, col, c.x, c.y, c.r, t, c.seed, solid, 1, c.fleeing ? 1 : 0);
      if (!this.alive(f)) continue;

      // Whether this screen is allowed to know where she is at all.
      const seen = !(s.coverHp > 0 && this.hidesFromViewer(owner));
      const lift = this.liftOf(owner);

      if (s.bey) {
        drawSparkTrail(ground, col, s.bey.trail, this.now, BEY_TRAIL_MS);
        drawBey(air, col, f.x, f.y, s.bey.spin, t, s.bey.stamina / s.bey.max, s.bey.shred ? 1 : 0, s.bey.tilt, 1);
        for (let i = 0; i < s.bey.orbit; i++) {
          const a = s.bey.spin * 0.35 + (i / s.bey.orbit) * Math.PI * 2;
          drawAirKnife(air, col, f.x + Math.cos(a) * BEY_ORBIT_R, f.y + Math.sin(a) * BEY_ORBIT_R, a + Math.PI / 2, 22, 1, t);
        }
      }
      if (lift > 0) drawLevitation(ground, col, f.x, f.y, lift, t, 1);
      // A skin's rig has no body of its own to paint, so while the sprite is hidden the kit
      // stands a plain orb in for it.
      const rigA = this.rigAlpha(owner);
      if (s.hidden && rigA > 0.02 && !(this.avatar(owner) instanceof AirAvatar)) {
        ground.fillStyle(col(AIR.storm), rigA);
        ground.fillCircle(f.x, f.y - lift, 22);
        ground.fillStyle(col(AIR.sky), rigA);
        ground.fillCircle(f.x - 1, f.y - lift - 1, 19.5);
      }
      if (s.coverHp > 0 && seen) drawCover(air, col, f.x, f.y, t, s.coverHp / COVER_HP, 1);
      if (seen && !s.bey && s.stealth > 0) drawStealthWisps(air, col, f.x, f.y - lift, s.stealth / STEALTH_MAX, t, 1);
      // The gauge is hers alone: the other side reads stealth off the wisps, or not at all.
      if (owner === 'player' && !s.bey) drawStealthGauge(air, col, f.x, f.y, s.stealth / STEALTH_MAX, s.inCloud, t, 1);

      const cmb = s.combo;
      if (cmb && seen && this.now >= cmb.ringFrom) {
        const p = Phaser.Math.Clamp((this.now - cmb.ringFrom) / RING_MS, 0, 1.2);
        const r = RING_R0 + (RING_MARK_R - RING_R0) * p;
        const off = this.now - cmb.ringAt;
        drawTimingRing(air, col, f.x, f.y - lift, r, RING_MARK_R, off >= -RING_EARLY_MS && off <= RING_LATE_MS, 1);
      }
    }

    // Winded: the gauge over everybody who has one, whoever put it there.
    const wall = Date.now();
    const seenF = new Set<Fighter>();
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (!f || seenF.has(f)) continue;
      seenF.add(f);
      if (!this.alive(f) || wall >= f.airWindedUntil || f.forceInvisible) continue;
      drawWinded(air, f === this.arena.player ? this.ncol : this.pcol, f.x, f.y, f.airStamina, f.airExhausted, t, f.x);
    }
  }
}
