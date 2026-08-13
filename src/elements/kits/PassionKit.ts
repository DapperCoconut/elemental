import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  GarmentKind, PASSION_SKIN_TINT, PSN, PassionAvatar, PassionColorFn, PassionFx,
  attractionRebound, attractionRing, bed as drawBed, blush, censorBar, garment, heart, heartEyes,
  heartOutline, jitter, kissMark, loveBar, perfumeAura, perfumeCloud, rose as drawRose,
} from './PassionVisuals';
import { meterGain } from '../../combat/Meters';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;

// ── Passive: the love bar ────────────────────────────────────────────────────
/**
 * The bar's ceiling is the victim's max HP at the moment Passion first lays eyes on them, and
 * it is latched there for the rest of the match. A boss with 2000 HP is a long project; an
 * Invasion husk with 40 is two clicks.
 */
const LOVE_BAR_W = 52;
const LOVE_BAR_H = 5;
/** Sits above the health bar (y-38) and above the charge bar that can appear over it. */
const LOVE_BAR_Y = -54;
const STAGE_MARKS = [0.25, 0.5, 0.75];
const STAGE_LABEL = ['', '💗 BLUSHING', '💓 SMITTEN', '💞 LOVESTRUCK'];

// ── Loveshot (Click) ─────────────────────────────────────────────────────────
const SHOT_SPEED = 720;
const SHOT_LIFE_MS = 1500;
const SHOT_HIT_R = 20;
const SHOT_DAMAGE = 12;
const SHOT_LOVE = 15;
/** +2 damage per this much love already on the target. */
const SHOT_LOVE_PER_BONUS = 80;
const SHOT_BONUS_DAMAGE = 2;

// ── Flirt (E) ────────────────────────────────────────────────────────────────
const FLIRT_REACH = 200;
const FLIRT_HALF_ANGLE = 0.66; // ~38°
const FLIRT_LOVE = 30;
/** One extra step of love for each stage the target has already reached. Caps at 45. */
const FLIRT_STAGE_BONUS = 5;

// ── Smooch (R) ───────────────────────────────────────────────────────────────
const SMOOCH_SPEED = 820;
const SMOOCH_MS = 260;
const SMOOCH_REACH = 36;
/** Below this fraction of the bar, the kiss simply doesn't land. */
const SMOOCH_MIN_RATIO = 0.5;
const SMOOCH_LOVE = 30;
const SMOOCH_LOVE_FRACTION = 0.15;

// ── Manipulate (F) ───────────────────────────────────────────────────────────
const ROSE_HOLD_MS = 15000;
/** Each hit taken while the rose is held. Multiplicative, so infinite stacking never hits zero. */
const ROSE_STACK_MULT = 0.95;
const ROSE_STACK_MS = 5000;
const ROSE_THROW_SPEED = 620;
const ROSE_THROW_LIFE_MS = 1700;
const ROSE_THROW_HIT_R = 24;
const ROSE_LOVE_MIN = 20;
const ROSE_LOVE_MAX = 60;
/** At or below this much HP, a thrown rose is worth the full 60. */
const ROSE_LOVE_HP_FLOOR = 50;
/** The bot has no recast key, so the kit throws for it once it has milked the hold. */
const ROSE_NPC_HOLD_MS = 5200;

// ── Exhibition (Q) ───────────────────────────────────────────────────────────
const POSE_MS = 5000;
const POSE_LOVE_PER_SEC = 15;
/** How far off dead-on a victim can be looking and still be counted as watching. */
const POSE_VIEW_HALF_ANGLE = 1.05; // ~60°
const FLASH_INTERVAL_MS = 210;
const CHEER_INTERVAL_MS = 900;
const POSE_TEXT_INTERVAL_MS = 1000;

// ── Exhibition, censored: the clothes ────────────────────────────────────────
/** The order they leave in — hat first, and the trousers last for obvious reasons. */
const GARMENTS: GarmentKind[] = ['hat', 'jacket', 'shirt', 'tie', 'trousers'];
/** Gravity on a tumbling garment. Well under a real one: cloth is supposed to hang. */
const CLOTH_GRAVITY = 620;
const CLOTH_SPEED_MIN = 165;
const CLOTH_SPEED_MAX = 235;
/** How far below the caster's feet a garment comes to rest. */
const CLOTH_FLOOR_DROP = 16;
/** They lie there for the whole pose, then go — the fade is how long "then go" takes. */
const CLOTH_FADE_MS = 500;

// ── Shop upgrades ────────────────────────────────────────────────────────────
/** Click, "Show-off" — how many Loveshots have to connect back-to-back. */
const SHOWOFF_STREAK = 3;
const IMPRESSED_MS = 5000;
const IMPRESSED_MULT = 1.5;
/** E, "Dating" — extra love per Flirt already performed. Uncapped, by design. */
const DATING_STEP = 4;
/** R, "Make-out" — the bar has to be this full before the kiss turns into the finisher. */
const MAKEOUT_MIN_RATIO = 0.9;
const MAKEOUT_MS = 2400;
const MAKEOUT_KISSES = 5;
const MAKEOUT_FIRST_KISS_MS = 320;
/** How far apart the two are held while it plays out. */
const MAKEOUT_GAP = 15;
/** F, "Spare" — every enemy has to be at least this far along, and you this close to dead. */
const SPARE_MIN_LOVE = 0.5;
const SPARE_HP_RATIO = 0.1;
const SPARE_MS = 5000;
/** Q, "Seduce" — everything love-related, for as long as the pose is up. */
const SEDUCE_MULT = 1.5;

// ── Mastery ──────────────────────────────────────────────────────────────────
/**
 * Attraction. The ring is deliberately wider than Flirt's reach and narrower than the arena:
 * a caught enemy is never in the cone for free, but they are never out of the fight either.
 */
const ATTRACT_RADIUS = 260;
/** A caught body pressed against the wall shows the shove for this long. */
const REBOUND_MS = 240;
const REBOUND_CAP = 20;

/** Perfume — the cloud. */
const PERFUME_COOLDOWN_MS = 18000;
const PERFUME_MS = 6000;
const PERFUME_RADIUS = 110;
/** How far ahead of the caster the cloud can be placed. Aim at your own feet and it lands there. */
const PERFUME_CAST_DIST = 150;
const PERFUME_LOVE_PER_SEC = 12;
/** Perfume — the dose you carry away. Every second stood in the cloud banks two of these. */
const PERFUME_CHARGE_RATE = 2;
const PERFUME_AURA_MAX_MS = 12000;
const AURA_RADIUS = 96;
const AURA_LOVE_PER_SEC = 10;
const PERFUME_TEXT_INTERVAL_MS = 1000;
/** The bot sprays once the target is inside this, aiming halfway so it stands in its own cloud. */
const NPC_PERFUME_RANGE = 210;

// ── World objects ────────────────────────────────────────────────────────────

/** A heart bullet or a thrown rose. The two share every field but what they do on arrival. */
interface Shot {
  owner: Owner;
  kind: 'heart' | 'rose';
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  spin: number;
  /** Roses only: the love they were worth at the moment they left the caster's teeth. */
  love: number;
}

/** One victim's meter. `max` is latched on first sight and never rewritten. */
interface Love {
  cur: number;
  max: number;
  /** How many of the three thresholds have been announced, so each fires once. */
  stage: number;
  charmed: boolean;
  /** Show-off: while this is in the future, everything landing on them is worth 1.5×. */
  impressedUntil: number;
}

/**
 * A garment thrown off at the start of a censored Exhibition. It tumbles, lands, and lies where
 * it landed until the pose ends — the caster can walk away from their own trousers, which is
 * the whole joke and so the piece deliberately does not follow them.
 */
interface Cloth {
  owner: Owner;
  kind: GarmentKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  spin: number;
  /** Where the floor is for this piece, chosen at launch so the pile has depth to it. */
  restY: number;
  /** The angle it slumps to once it is down. */
  restAng: number;
  landed: boolean;
  /** 0–1 flatten, eased in after the landing rather than snapped. */
  settle: number;
  /** The end of the pose: it starts fading here and is gone `CLOTH_FADE_MS` later. */
  fadeAt: number;
}

/**
 * A cloud of perfume hanging where it was sprayed. It never follows the caster — walking out of
 * your own cloud is how the aura's clock starts running down, and that choice is the ability.
 */
interface Cloud {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  diesAt: number;
  /** Its own pop-up throttle: the cloud and the aura are two effects and say so separately. */
  nextTextAt: number;
  /** Fixes the lobes and the mist, so the shape breathes rather than boiling frame to frame. */
  seed: number;
}

/** One frame of somebody being held against Attraction's boundary. */
interface Rebound {
  x: number;
  y: number;
  ang: number;
  until: number;
}

/** A heart dropped on the floor by a Smooch dash. */
interface Mark {
  x: number;
  y: number;
  ang: number;
  until: number;
  size: number;
}

interface Side {
  owner: Owner;
  // R — Smooch
  dashUntil: number;
  dashVx: number;
  dashVy: number;
  /** Everyone this dash has already kissed, so one cast is one kiss per body. */
  kissed: Fighter[];
  // F — Manipulate
  roseUntil: number;
  roseTakenAt: number;
  /** `rawDamageTaken` watermark — the honest "was I hit since last frame" test. */
  lastRaw: number;
  /** Expiry timestamps of the 5% cuts, one per hit taken while holding the rose. */
  stacks: number[];
  /** True once this side has written a non-1 `passionIncomingMult`, so reset can hand it back. */
  multOwned: boolean;
  // Q — Exhibition
  poseUntil: number;
  nextFlashAt: number;
  nextCheerAt: number;
  nextPoseTextAt: number;
  flashSide: number;
  // Click upgrade — Show-off
  /** Loveshots landed back-to-back. A shot that expires without touching anyone zeroes it. */
  hitStreak: number;
  // E upgrade — Dating
  /** Flirts cast this match. Every one of them makes the next worth more. */
  flirtCount: number;
  // R upgrade — Make-out
  makeoutUntil: number;
  makeoutStartedAt: number;
  makeoutTarget: Fighter | null;
  makeoutKisses: number;
  nextMakeoutKissAt: number;
  /** Where the pair is held, and which way the bed under them is pointing. */
  makeoutX: number;
  makeoutY: number;
  makeoutAng: number;
  /** Mature mode was on when it started — latched, so toggling mid-animation can't swap the art. */
  makeoutBed: boolean;
  // F upgrade — Spare
  spareUntil: number;
  /** One rose is worth one sparing. Cleared the next time a rose is taken. */
  spareUsedThisRose: boolean;
  // Mastery passive — Attraction
  /**
   * Everyone who has been inside the ring at least once. The boundary only holds what walked
   * into it: without this, an Invasion husk crossing the arena would be snapped onto the circle
   * from the far wall, which is a net, not a room.
   */
  caught: Set<Fighter>;
  // Mastery bindable — Perfume
  /** Seeded to a full cooldown in the past, so the first cast of a match is not a wait. */
  perfumeCastAt: number;
  /** The dose on the caster's own body. Banked by standing in the cloud, spent in real time. */
  auraUntil: number;
  nextPerfumeTextAt: number;
  // Aim
  aimX: number;
  aimY: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    dashUntil: 0, dashVx: 0, dashVy: 0, kissed: [],
    roseUntil: 0, roseTakenAt: 0, lastRaw: 0, stacks: [], multOwned: false,
    poseUntil: 0, nextFlashAt: 0, nextCheerAt: 0, nextPoseTextAt: 0, flashSide: 1,
    hitStreak: 0, flirtCount: 0,
    makeoutUntil: 0, makeoutStartedAt: 0, makeoutTarget: null, makeoutKisses: 0,
    nextMakeoutKissAt: 0, makeoutX: 0, makeoutY: 0, makeoutAng: 0, makeoutBed: false,
    spareUntil: 0, spareUsedThisRose: false,
    caught: new Set<Fighter>(),
    perfumeCastAt: -PERFUME_COOLDOWN_MS, auraUntil: 0, nextPerfumeTextAt: 0,
    aimX: 0, aimY: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PassionArenaApi {
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
  /** Skins: maps a Passion visual colour through that side's equipped skin. */
  passionColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /**
   * Mature mode — the easter egg unlocked and toggled on the element's info panel. It changes
   * how Exhibition and an upgraded Make-out are drawn, and nothing else.
   */
  get matureMode(): boolean;
  /** True if the local player (Passion) has the given shop upgrade slot equipped. */
  hasUpgrade(slot: string): boolean;
  /** True if the online opponent (Passion) has it — their upgraded casts replay on this sim. */
  hasNpcUpgrade(slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /**
   * Online 1v1. The opponent is a replica whose position belongs to their own sim, so Attraction
   * refuses to write it here and lets the boundary hold them on the machine that owns them.
   */
  get isOnline(): boolean;
  /**
   * A boss fight. Bosses drive their own bodies through scripted set pieces, and a boundary
   * that quietly hauls one back mid-teleport would read as the fight being broken rather than
   * as the passive working — so Attraction draws its ring and holds nothing.
   */
  get bossFight(): boolean;
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  /** Perfume is cast off a private timer, so the peer's sim never sees it without this. */
  broadcastMasteryCast(enhId: string): void;
}

// ── PassionKit ───────────────────────────────────────────────────────────────

export class PassionKit {
  private api: PassionArenaApi;

  // ── Visuals ──
  private readonly pcol: PassionColorFn;
  private readonly ncol: PassionColorFn;
  private readonly pfx: PassionFx;
  private readonly nfx: PassionFx;
  private playerAvatar: PassionAvatar | null = null;
  private npcAvatar: PassionAvatar | null = null;
  /** Kiss marks on the floor — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Bullets, roses and cones — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Blush, heart eyes and the meters. Above `HealthBar` (depth 10), because the whole element
   * is unreadable if another element's aura gets to paint over the face it has been working on.
   */
  private faceGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private loves = new Map<Fighter, Love>();
  private shots: Shot[] = [];
  private marks: Mark[] = [];
  private clothes: Cloth[] = [];
  private clouds: Cloud[] = [];
  private rebounds: Rebound[] = [];
  /** Last known heading for anyone without a cursor, so a stationary bot still faces somewhere. */
  private lastFacing = new Map<Fighter, number>();
  /** Both maps are keyed by Fighter, and an Invasion run retires hundreds of them. */
  private nextPruneAt = 0;
  /** Everyone currently wearing the bare-skin tint — see `updateBareSkin`. */
  private bareSkinned = new Set<Fighter>();

  constructor(api: PassionArenaApi) {
    this.api = api;
    this.pcol = (base) => api.passionColor('player', base);
    this.ncol = (base) => api.passionColor('npc', base);
    this.pfx = new PassionFx(api.scene, this.pcol);
    this.nfx = new PassionFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PassionFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PassionColorFn { return owner === 'player' ? this.pcol : this.ncol; }
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

  private isPassion(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'passion' : this.api.npcElementId === 'passion';
  }

  /**
   * Whether the side casting owns a shop upgrade. The NPC half only ever answers true online,
   * where it stands in for a remote player whose upgraded casts have to replay here.
   */
  private ownerHasUpgrade(owner: Owner, slot: string): boolean {
    return owner === 'player'
      ? this.api.elementId === 'passion' && this.api.hasUpgrade(slot)
      : this.api.hasNpcUpgrade(slot);
  }

  /** Whether this side is fighting with Passion Mastery switched on. */
  private masteryOn(owner: Owner): boolean {
    return owner === 'player'
      ? this.api.masteryActive && this.api.elementId === 'passion'
      : this.api.npcMasteryActive && this.api.npcElementId === 'passion';
  }

  /** The slot Perfume is bound over for this side, or null when the side hasn't bound it. */
  private perfumeSlot(owner: Owner): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === 'perfume') return s;
    }
    return null;
  }

  /** Everything this side is allowed to charm. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private avatar(owner: Owner): PassionAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * Which way a fighter is looking. The local player's cursor is the honest answer for them;
   * everyone else is judged on where they are actually walking, latched so that standing still
   * doesn't reset them to facing east.
   *
   * `Fighter.facingAngle` is deliberately not used — it is only maintained while Silence is in
   * the match, and Exhibition would silently stop working in every other matchup.
   */
  private facingOf(f: Fighter): number {
    if (f === this.api.player) {
      const p = this.api.scene.input.activePointer;
      return Math.atan2(p.worldY - f.y, p.worldX - f.x);
    }
    const b = this.body(f);
    if (b && Math.hypot(b.velocity.x, b.velocity.y) > 10) {
      const a = Math.atan2(b.velocity.y, b.velocity.x);
      this.lastFacing.set(f, a);
      return a;
    }
    const stored = this.lastFacing.get(f);
    if (stored !== undefined) return stored;
    // Never seen it move: assume it is looking at whoever it is fighting.
    return Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
  }

  /** Perpendicular distance from a point to the segment a→b — the Smooch dash's hit test. */
  private distToSegment(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return Phaser.Math.Distance.Between(ax, ay, px, py);
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Phaser.Math.Distance.Between(ax + dx * t, ay + dy * t, px, py);
  }

  // ── The love bar ───────────────────────────────────────────────────────────

  /**
   * The meter for one victim, created on first sight. `max` is their max HP *now*, which is why
   * this has to run the frame Passion first sees them rather than lazily on the first hit — a
   * husk that has already been chipped would otherwise get a cheaper bar than one that hasn't.
   */
  private loveOf(f: Fighter): Love {
    let l = this.loves.get(f);
    if (!l) {
      l = { cur: 0, max: Math.max(1, f.maxHp), stage: 0, charmed: false, impressedUntil: 0 };
      this.loves.set(f, l);
    }
    return l;
  }

  /** 0–1 for anyone Passion is working on, or 0 for anyone it isn't. */
  loveRatio(f: Fighter | null | undefined): number {
    if (!f) return 0;
    const l = this.loves.get(f);
    return l ? Phaser.Math.Clamp(l.cur / l.max, 0, 1) : 0;
  }

  /** How many of the three visible stages a victim has passed. 0–3. */
  private stageOf(ratio: number): number {
    let s = 0;
    for (const mark of STAGE_MARKS) if (ratio >= mark) s++;
    return s;
  }

  /**
   * Everything that scales love on its way in: Show-off's Impressed window, which lives on the
   * victim and lifts anything at all that lands on them, and Seduce, which lives on the caster
   * and lifts everything they do while the pose is up. They multiply — a seduced Exhibition
   * pouring into an impressed target is 2.25×, and that is the intended ceiling of the element.
   */
  private loveMult(owner: Owner, victim: Fighter): number {
    let m = 1;
    const l = this.loves.get(victim);
    if (l && l.impressedUntil > this.now) m *= IMPRESSED_MULT;
    if (this.side(owner).poseUntil > this.now && this.ownerHasUpgrade(owner, 'q')) m *= SEDUCE_MULT;
    return m;
  }

  /**
   * The one way love is ever added. Nothing anywhere takes it away — no heal, no cleanse, no
   * shield and no death of the Passion user, which is the entire point of the element.
   *
   * `icon` is the emoji the pop-up is tagged with; the number in it is the amount *after* the
   * multipliers, because a "+30 ❤" over someone who just took 45 is a lie the player will spot.
   */
  private addLove(owner: Owner, victim: Fighter, amount: number, icon?: string): void {
    if (amount <= 0 || !this.alive(victim)) return;
    const l = this.loveOf(victim);
    if (l.charmed) return;

    // Ruin's Combo Breaker halves every meter in the game — the love bar included. It is the
    // caster's meter even though it hangs over the victim, so it is the caster who is taxed.
    const mult = this.loveMult(owner, victim);
    const applied = meterGain(this.fighter(owner), amount * mult);
    l.cur = Math.min(l.max, l.cur + applied);
    const ratio = l.cur / l.max;

    if (icon) {
      const boosted = mult > 1.001;
      this.api.showFloatingText(victim.x, victim.y - 34, `+${Math.round(applied)} ${icon}`,
        this.hex(boosted ? PSN.gold : PSN.hot));
    }

    const stage = this.stageOf(ratio);
    if (stage > l.stage) {
      l.stage = stage;
      this.api.showFloatingText(victim.x, victim.y - 52, STAGE_LABEL[stage], this.hex(PSN.deep));
      this.fx(owner).hearts(victim.x, victim.y, 4 + stage * 2, 22 + stage * 6, PSN.blush, 620);
      Sfx.playAt('heartbeat', victim.x, { volume: 0.5 + stage * 0.12, rate: 0.9 + stage * 0.15 });
    }

    if (l.cur >= l.max) this.charm(owner, victim);
  }

  /**
   * The bar filled. They are charmed, covered in hearts, and dead in the same frame.
   *
   * `pierce` + `netApplied` together are the only combination in `takeDamage` that means
   * "exactly this number, no mitigation and no absorb layer" — every armour multiplier, shield
   * charge, clotted pool and damage absorber is skipped. That is the requirement: a meter that
   * cannot be lowered would be worth nothing if the kill it pays out could be shielded.
   *
   * Deliberately *not* wrapped in `asNonAllyDamage`: this originates from whoever is playing
   * Passion, which in co-op can be your ally, and their friendly fire has to stay blocked.
   */
  private charm(owner: Owner, victim: Fighter, via?: 'makeout'): void {
    const l = this.loveOf(victim);
    if (l.charmed) return;
    l.charmed = true;
    l.cur = l.max;

    // Mastery progress. Both of these are "which tool finished them", so they are read here
    // rather than at the tool — a bar topped out by a stray Loveshot mid-pose still counts as
    // the pose's, which is what the requirement is asking about.
    if (owner === 'player') {
      if (this.side(owner).poseUntil > this.now) this.api.recordMasteryStat('poseCharms', 1);
      if (via === 'makeout') this.api.recordMasteryStat('makeoutCharms', 1);
    }

    this.fx(owner).charm(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 56, '💘 CHARMED', this.hex(PSN.hot));
    this.api.spawnHitFlash(victim.x, victim.y, PSN.hot);
    Sfx.playAt('heartbeat', victim.x, { volume: 1, rate: 0.6 });
    Sfx.playAt('crystal-chime', victim.x, { volume: 0.85, rate: 1.35 });

    victim.takeDamage(Math.max(1, victim.hp), { pierce: true, netApplied: true });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // The rose's damage cut is written onto a Fighter, so it has to be handed back or the next
    // match starts with somebody permanently armoured.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (f && this.sides[owner].multOwned) f.passionIncomingMult = 1;
    }
    // The bare-skin tint is written onto the sprite, so a match that ended mid-scene would
    // otherwise start the next one with a tan fighter.
    for (const f of this.bareSkinned) if (f.active) f.clearTint();
    this.bareSkinned.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.loves.clear();
    this.lastFacing.clear();
    this.shots = [];
    this.marks = [];
    this.clothes = [];
    this.clouds = [];
    this.rebounds = [];
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.faceGfx?.destroy(); this.faceGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'passion') return;
    void time;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    // Make-out runs itself to the end. Nothing is castable out of it — it is a cutscene the
    // player has already won, and letting them cancel it would only ever be a misclick.
    if (s.makeoutUntil > this.now) return;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    // Mastery: Perfume takes over whichever slot it was bound to. Read before the base keys,
    // because `JustDown` consumes the flag — testing the bind afterwards eats the press.
    const perf = this.perfumeSlot('player');
    if (perf) {
      const key = perf === 'e' ? this.api.eKey : perf === 'r' ? this.api.rKey
        : perf === 'f' ? this.api.fKey : this.api.qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryCastPerfume('player', mouseX, mouseY);
    }

    if (clicked) p.castAbility('passion-loveshot', ctx);
    if (perf !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('passion-flirt', ctx);
    if (perf !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('passion-smooch', ctx);
    if (perf !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      // The throw is a recast, not a second cast: the rose has already paid the cooldown, and
      // routing it back through `castAbility` would strand it in your teeth for ten seconds.
      if (s.roseUntil > this.now) this.throwRose('player', mouseX, mouseY);
      else p.castAbility('passion-manipulate', ctx);
    }
    if (perf !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('passion-exhibition', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Loveshot. The only thing in the kit that deals damage, and it scales off the meter. */
  doLoveshot(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const av = this.avatar(owner);
    // Fired from the muzzle of the pistol, not from the middle of the body.
    const tip = av?.pistolTip();
    const sx = tip && Number.isFinite(tip.x) ? tip.x : f.x + Math.cos(ang) * 22;
    const sy = tip && Number.isFinite(tip.y) ? tip.y : f.y + Math.sin(ang) * 22;

    this.shots.push({
      owner, kind: 'heart', x: sx, y: sy,
      vx: Math.cos(ang) * SHOT_SPEED, vy: Math.sin(ang) * SHOT_SPEED,
      diesAt: this.now + SHOT_LIFE_MS, spin: 0, love: 0,
    });

    av?.play('punch', ang);
    av?.recoil();
    this.fx(owner).muzzle(sx, sy, ang);
  }

  /**
   * E — Flirt. A cone that does nothing at all except move the meter, and moves it further the
   * further along it already is: the element's snowball, and the reason a Passion user who has
   * survived to 50% is usually going to reach 100%.
   */
  doFlirt(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const dating = this.ownerHasUpgrade(owner, 'e') ? s.flirtCount * DATING_STEP : 0;
    let caught = 0;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > FLIRT_REACH) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > FLIRT_HALF_ANGLE) continue;
      // Read the stage *before* this cast lands, so the bonus is what they walked in with.
      const bonus = this.stageOf(this.loveRatio(t)) * FLIRT_STAGE_BONUS;
      this.addLove(owner, t, FLIRT_LOVE + bonus + dating, '❤');
      caught++;
    }

    // Dating: every Flirt performed pays into the *next* one, so this lands after the cast it
    // was cast for. Counted even when the cone caught nobody — the practice is the point.
    if (this.ownerHasUpgrade(owner, 'e')) {
      s.flirtCount++;
      this.api.showFloatingText(f.x, f.y - 60, `💌 DATING +${s.flirtCount * DATING_STEP}`,
        this.hex(PSN.gold));
    }

    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).flirtCone(f.x, f.y, ang, FLIRT_REACH, FLIRT_HALF_ANGLE);
    this.api.showFloatingText(f.x, f.y - 46, caught ? '😘 FLIRT' : '😐 NOBODY THERE',
      this.hex(caught ? PSN.hot : PSN.wine));
  }

  /** R — Smooch. A gap-closer that refuses to pay out on anyone who isn't already halfway gone. */
  doSmooch(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.dashUntil = this.now + SMOOCH_MS;
    s.dashVx = Math.cos(ang) * SMOOCH_SPEED;
    s.dashVy = Math.sin(ang) * SMOOCH_SPEED;
    s.kissed = [];

    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).heartRing(f.x, f.y, 10, 54, PSN.pink, 420);
  }

  /** F — Manipulate. The first press arms the rose; the recast is handled in `handleInput`. */
  doManipulate(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    if (s.roseUntil > this.now) return;

    s.roseUntil = this.now + ROSE_HOLD_MS;
    s.roseTakenAt = this.now;
    s.lastRaw = f.rawDamageTaken;
    // A fresh rose is a fresh sparing (see `updateSpare`).
    s.spareUsedThisRose = false;

    this.avatar(owner)?.play('flex');
    this.avatar(owner)?.setRose(true, 0);
    this.fx(owner).petals(f.x, f.y - 10, 6);
    this.api.showFloatingText(f.x, f.y - 46, '🌹 MANIPULATE', this.hex(PSN.deep));
  }

  /** Q — Exhibition. Five seconds of standing there being looked at. */
  doExhibition(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);

    s.poseUntil = this.now + POSE_MS;
    s.nextFlashAt = this.now;
    s.nextCheerAt = this.now;
    s.nextPoseTextAt = this.now + POSE_TEXT_INTERVAL_MS;

    this.avatar(owner)?.play('raise');
    this.fx(owner).heartRing(f.x, f.y, 14, 120, PSN.hot, 700);
    this.api.showFloatingText(f.x, f.y - 56, '📸 EXHIBITION', this.hex(PSN.gold));

    // The easter-egg version of the pose, and the only one that needs undressing.
    if (owner === 'player' && this.api.matureMode) this.stripClothes(owner, POSE_MS);
  }

  /**
   * The suit leaving, all five pieces at once, fanned upward and outward. The avatar stops
   * drawing them the same frame (`setStripped`), so from `holdMs` here the clothes exist only
   * as these world objects — which is why the caller has to say how long its own scene runs.
   */
  private stripClothes(owner: Owner, holdMs: number): void {
    const f = this.fighter(owner);
    const fadeAt = this.now + holdMs;

    GARMENTS.forEach((kind, i) => {
      // Fanned about straight up, alternating sides so the pile lands spread out rather
      // than stacked on one spot.
      const spread = (i - (GARMENTS.length - 1) / 2) * 0.44;
      const ang = -Math.PI / 2 + spread + (Math.random() - 0.5) * 0.18;
      const speed = Phaser.Math.Linear(CLOTH_SPEED_MIN, CLOTH_SPEED_MAX, Math.random());
      const drop = CLOTH_FLOOR_DROP + (i - 2) * 3 + Math.random() * 6;

      this.clothes.push({
        owner,
        kind,
        x: f.x + Math.cos(ang) * 6,
        y: f.y - 4 + Math.sin(ang) * 6,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        ang: Math.random() * Math.PI * 2,
        spin: (Math.random() < 0.5 ? -1 : 1) * (3.4 + Math.random() * 3.4),
        restY: Phaser.Math.Clamp(f.y + drop, this.top + 6, this.bottom - 6),
        restAng: (Math.random() - 0.5) * 1.1,
        landed: false,
        settle: 0,
        fadeAt,
      });
    });

    this.fx(owner).hearts(f.x, f.y - 8, 8, 34, PSN.blush, 760);
    this.api.showFloatingText(f.x, f.y - 72, '👔 CLOTHES OFF', this.hex(PSN.hot));
    Sfx.playAt('whoosh', f.x, { volume: 0.6, rate: 1.25 });
  }

  /** The rose leaving the caster's teeth. Worth more the closer they are to dying. */
  private throwRose(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || s.roseUntil <= this.now) return;

    // Full health is worth the floor; at or under 50 HP it is worth the ceiling.
    const span = Math.max(1, f.maxHp - ROSE_LOVE_HP_FLOOR);
    const hurt = Phaser.Math.Clamp((f.maxHp - f.hp) / span, 0, 1);
    const love = Math.round(ROSE_LOVE_MIN + (ROSE_LOVE_MAX - ROSE_LOVE_MIN) * hurt);

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.shots.push({
      owner, kind: 'rose', x: f.x + Math.cos(ang) * 20, y: f.y + Math.sin(ang) * 20,
      vx: Math.cos(ang) * ROSE_THROW_SPEED, vy: Math.sin(ang) * ROSE_THROW_SPEED,
      diesAt: this.now + ROSE_THROW_LIFE_MS, spin: 0, love,
    });

    s.roseUntil = 0;
    this.avatar(owner)?.setRose(false, 0);
    this.avatar(owner)?.play('punch', ang);
    this.api.showFloatingText(f.x, f.y - 46, `🌹 ${love}`, this.hex(PSN.deep));
    Sfx.playAt('whoosh', f.x, { volume: 0.55, rate: 1.3 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'passion';
    const npcIs = this.api.npcElementId === 'passion';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isPassion(owner)) continue;
      // Sighting the enemy is what latches their bar's ceiling — see `loveOf`.
      for (const t of this.targetsOf(owner)) this.loveOf(t);
      this.updateDash(owner, time);
      this.updateMakeout(owner, time);
      this.updateRose(owner, time);
      this.updateSpare(owner, time);
      this.updatePose(owner, time, delta);
      // After the two abilities that own the body outright, so neither is dragged off its
      // anchor by a boundary the pair is standing on.
      this.updateAttraction(owner, time);
      this.updatePerfume(owner, time, delta);
    }

    this.updateNpcPerfume(time);
    this.updateShots(time, delta);
    this.updateClouds(time, delta);
    this.updateClothes(time, delta);
    this.updateMarks(time);
    this.updateRebounds(time);
    this.updateStacks(time);
    this.prune(time);
    // Before the avatars: `updateAvatars` reads its `stripped` flag straight off the result.
    this.updateBareSkin();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.paintFaces();
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5 and their health bars at 10.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.faceGfx) this.faceGfx = scene.add.graphics().setDepth(11);
  }

  /** The Smooch dash. Applied post-movement, so WASD can't cancel it mid-flight. */
  private updateDash(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.dashUntil <= time) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.dashUntil = 0; return; }

    const b = this.body(f);
    const fromX = f.x;
    const fromY = f.y;
    b.setVelocity(s.dashVx, s.dashVy);

    // A trail of prints, so the path a kiss travelled is on the floor afterwards.
    if (this.marks.length < 90) {
      this.marks.push({
        x: fromX, y: fromY, ang: Math.atan2(s.dashVy, s.dashVx),
        until: time + 1400, size: 9 + Math.random() * 3,
      });
    }

    const ahead = 1 + SMOOCH_REACH / Math.max(1, Math.hypot(s.dashVx, s.dashVy));
    const toX = fromX + s.dashVx * 0.05 * ahead;
    const toY = fromY + s.dashVy * 0.05 * ahead;

    for (const t of this.targetsOf(owner)) {
      if (s.kissed.includes(t)) continue;
      if (this.distToSegment(fromX, fromY, toX, toY, t.x, t.y) > SMOOCH_REACH) continue;
      s.kissed.push(t);
      this.kiss(owner, t);
    }
  }

  /** A kiss arriving. Refuses anyone under half a bar — that gate is the whole ability. */
  private kiss(owner: Owner, victim: Fighter): void {
    const l = this.loveOf(victim);
    const ratio = l.cur / l.max;
    const ang = Math.atan2(victim.y - this.fighter(owner).y, victim.x - this.fighter(owner).x);

    if (ratio < SMOOCH_MIN_RATIO) {
      this.api.showFloatingText(victim.x, victim.y - 40, '💔 NOT YET', this.hex(PSN.wine));
      Sfx.playAt('ui-denied', victim.x, { volume: 0.5 });
      return;
    }

    // Make-out: past 90% the kiss stops being a kiss and becomes the finisher.
    if (ratio >= MAKEOUT_MIN_RATIO && this.ownerHasUpgrade(owner, 'r')
      && this.side(owner).makeoutUntil <= this.now) {
      this.startMakeout(owner, victim);
      return;
    }

    const gain = Math.round(SMOOCH_LOVE + l.cur * SMOOCH_LOVE_FRACTION);
    this.fx(owner).smooch(victim.x, victim.y - 6, ang);
    this.marks.push({ x: victim.x, y: victim.y + 12, ang, until: this.now + 3000, size: 13 });
    Sfx.playAt('bubble', victim.x, { volume: 0.9, rate: 0.62 });
    this.addLove(owner, victim, gain, '💋');
  }

  // ── R upgrade: Make-out ────────────────────────────────────────────────────

  /**
   * The grab. Both fighters are pinned either side of a point between them for the whole
   * animation, five kisses land on a timer, and then the victim is charmed — which, since a
   * filled bar is lethal and unshieldable, is the match.
   *
   * The dash is cancelled on the spot: sliding out from under your own finisher looks like a
   * bug even though the hold below would drag you back.
   */
  private startMakeout(owner: Owner, victim: Fighter): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const ang = Math.atan2(victim.y - f.y, victim.x - f.x);

    s.dashUntil = 0;
    s.makeoutUntil = this.now + MAKEOUT_MS;
    s.makeoutStartedAt = this.now;
    s.makeoutTarget = victim;
    s.makeoutKisses = 0;
    s.nextMakeoutKissAt = this.now + MAKEOUT_FIRST_KISS_MS;
    s.makeoutX = Phaser.Math.Clamp((f.x + victim.x) / 2, this.left + 60, this.right - 60);
    s.makeoutY = Phaser.Math.Clamp((f.y + victim.y) / 2, this.top + 70, this.bottom - 70);
    // The pair stands across the bed's width, so the head end runs off at a right angle to them.
    s.makeoutAng = ang - Math.PI / 2;
    s.makeoutBed = owner === 'player' && this.api.matureMode;

    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).heartRing(s.makeoutX, s.makeoutY, 12, 96, PSN.hot, 700);
    this.api.showFloatingText(f.x, f.y - 60, s.makeoutBed ? '🛏️ TO BED' : '💞 MAKE-OUT',
      this.hex(PSN.gold));
    Sfx.playAt('whoosh', f.x, { volume: 0.7, rate: 0.8 });
    // Same undressing as the pose, on the scene's own clock rather than the pose's.
    if (s.makeoutBed) {
      this.stripClothes(owner, MAKEOUT_MS);
      Sfx.playAt('bubble', s.makeoutX, { volume: 0.7, rate: 0.45 });
    }
  }

  /**
   * The hold. Positions are written outright rather than driven by velocity — this runs after
   * movement, and a five-kiss animation that the victim can walk out of isn't a finisher.
   */
  private updateMakeout(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.makeoutUntil <= 0) return;
    const f = this.fighter(owner);
    const victim = s.makeoutTarget;

    // Either of them gone (a husk cleaned up, the caster killed by something else) and it ends
    // with nothing paid out — the charm below is the only way the bar ever finishes here.
    if (!this.alive(f) || !this.alive(victim)) {
      s.makeoutUntil = 0;
      s.makeoutTarget = null;
      return;
    }

    const dir = s.makeoutAng + Math.PI / 2;
    const hold = (target: Fighter, sign: number): void => {
      const tx = s.makeoutX + Math.cos(dir) * MAKEOUT_GAP * sign;
      const ty = s.makeoutY + Math.sin(dir) * MAKEOUT_GAP * sign;
      const nx = Phaser.Math.Linear(target.x, tx, 0.32);
      const ny = Phaser.Math.Linear(target.y, ty, 0.32);
      target.setPosition(nx, ny);
      this.body(target).reset(nx, ny);
    };
    hold(f, -1);
    hold(victim!, 1);

    // Five kisses on a timer, alternating which side of the pair they land on.
    if (time >= s.nextMakeoutKissAt && s.makeoutKisses < MAKEOUT_KISSES) {
      s.makeoutKisses++;
      s.nextMakeoutKissAt = time + (MAKEOUT_MS - MAKEOUT_FIRST_KISS_MS) / MAKEOUT_KISSES;
      const spin = s.makeoutKisses * 1.7;
      const kx = s.makeoutX + Math.cos(spin) * 12;
      const ky = s.makeoutY + Math.sin(spin) * 8 - 6;
      this.fx(owner).smooch(kx, ky, dir);
      this.fx(owner).hearts(kx, ky, 5, 26, PSN.hot, 640);
      this.marks.push({ x: kx, y: ky + 16, ang: spin, until: time + 4000, size: 12 });
      this.api.showFloatingText(s.makeoutX, s.makeoutY - 44 - s.makeoutKisses * 4,
        `💋 ${s.makeoutKisses}/${MAKEOUT_KISSES}`, this.hex(PSN.gold));
      Sfx.playAt('bubble', kx, { volume: 0.95, rate: 0.6 + s.makeoutKisses * 0.07 });
      // Mature mode: the hearts come up off the bed rather than off the pair.
      if (s.makeoutBed) this.fx(owner).hearts(s.makeoutX, s.makeoutY + 18, 4, 30, PSN.blush, 900);
    }

    if (time < s.makeoutUntil) return;

    // The animation is over, so the bar is. Fill it and let `charm` do the rest.
    const target = victim!;
    s.makeoutUntil = 0;
    s.makeoutTarget = null;
    this.api.showFloatingText(target.x, target.y - 68, '💞 HEAD OVER HEELS', this.hex(PSN.gold));
    const l = this.loveOf(target);
    l.cur = l.max;
    this.charm(owner, target, 'makeout');
  }

  // ── Click upgrade: Show-off ────────────────────────────────────────────────

  /** A Loveshot connected. Three in a row and whoever caught the third is Impressed. */
  private landStreakHit(owner: Owner, victim: Fighter, time: number): void {
    if (!this.ownerHasUpgrade(owner, 'click')) return;
    const s = this.side(owner);
    s.hitStreak++;
    if (s.hitStreak < SHOWOFF_STREAK) {
      this.api.showFloatingText(victim.x, victim.y - 46, `😏 ${s.hitStreak}/${SHOWOFF_STREAK}`,
        this.hex(PSN.pink));
      return;
    }

    s.hitStreak = 0;
    const l = this.loveOf(victim);
    l.impressedUntil = time + IMPRESSED_MS;
    if (owner === 'player') this.api.recordMasteryStat('impressed', 1);
    this.fx(owner).heartRing(victim.x, victim.y, 8, 62, PSN.gold, 620);
    this.fx(owner).hearts(victim.x, victim.y, 8, 34, PSN.gold, 820);
    this.api.showFloatingText(victim.x, victim.y - 62, '😍 IMPRESSED', this.hex(PSN.gold));
    Sfx.playAt('sparkle', victim.x, { volume: 0.8, rate: 1.15 });
  }

  /** A Loveshot that hit nothing. Silent unless there was a run worth mourning. */
  private breakStreak(owner: Owner, x: number, y: number): void {
    const s = this.side(owner);
    if (s.hitStreak <= 0) return;
    s.hitStreak = 0;
    if (!this.ownerHasUpgrade(owner, 'click')) return;
    this.api.showFloatingText(x, y, '💔 MISSED', this.hex(PSN.wine));
  }

  // ── F upgrade: Spare ───────────────────────────────────────────────────────

  /**
   * The moment the people trying to kill you can't. It needs all three conditions at once —
   * rose in your teeth, every living enemy at least half-charmed, and you inside the last tenth
   * of your health — and it is worth exactly one window per rose, so the rose has to be armed
   * *before* the fight gets desperate rather than as a reaction to it.
   */
  private updateSpare(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (!this.ownerHasUpgrade(owner, 'f')) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    if (s.spareUntil > time) return;
    // The window closing is worth announcing: it is the frame damage starts landing again.
    if (s.spareUntil > 0) {
      s.spareUntil = 0;
      this.api.showFloatingText(f.x, f.y - 52, '🥀 THEY OVERCOME IT', this.hex(PSN.wine));
      Sfx.playAt('thorn', f.x, { volume: 0.6, rate: 0.85 });
      return;
    }

    if (s.spareUsedThisRose || s.roseUntil <= time) return;
    if (f.hp > f.maxHp * SPARE_HP_RATIO) return;
    const targets = this.targetsOf(owner);
    if (!targets.length || targets.some((t) => this.loveRatio(t) < SPARE_MIN_LOVE)) return;

    s.spareUntil = time + SPARE_MS;
    s.spareUsedThisRose = true;
    this.api.showFloatingText(f.x, f.y - 58, '🌹 SPARED', this.hex(PSN.gold));
    this.fx(owner).heartRing(f.x, f.y, 10, 110, PSN.gold, 820);
    this.fx(owner).petals(f.x, f.y - 6, 10);
    Sfx.playAt('heartbeat', f.x, { volume: 0.9, rate: 0.7 });
    // Every one of them stops, and says so.
    for (const t of targets) {
      this.fx(owner).hearts(t.x, t.y, 6, 30, PSN.blush, 900);
      this.api.showFloatingText(t.x, t.y - 46, '💘 I CAN\'T…', this.hex(PSN.hot));
    }
  }

  /**
   * The rose. Holding it converts every hit you take into a permanent-feeling tax on whoever
   * threw it, which is why the ability is worth casting even in a match where it never gets
   * thrown at all.
   */
  private updateRose(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.roseUntil <= 0) return;

    if (!this.alive(f) || s.roseUntil <= time) {
      if (s.roseUntil > 0 && this.alive(f)) {
        this.api.showFloatingText(f.x, f.y - 44, '🥀 WITHERED', this.hex(PSN.wine));
      }
      s.roseUntil = 0;
      this.avatar(owner)?.setRose(false, 0);
      return;
    }

    // Every point of damage aimed at the holder buys another cut, whether or not it landed.
    if (f.rawDamageTaken > s.lastRaw) {
      s.lastRaw = f.rawDamageTaken;
      s.stacks.push(time + ROSE_STACK_MS);
      if (owner === 'player') this.api.recordMasteryStat('roseHits', 1);
      this.fx(owner).petals(f.x, f.y - 6, 3);
      const e = this.api.getNearestEnemy(f.x, f.y);
      if (this.alive(e)) {
        this.api.showFloatingText(e.x, e.y - 46, `🥀 -${s.stacks.length * 5}% DMG`, this.hex(PSN.deep));
      }
      Sfx.playAt('thorn', f.x, { volume: 0.5, rate: 1.2 });
    } else {
      s.lastRaw = f.rawDamageTaken;
    }

    // The bot has no recast key. It milks the hold, then throws at whoever is nearest.
    if (owner === 'npc' && time - s.roseTakenAt > ROSE_NPC_HOLD_MS) {
      const e = this.api.getNearestEnemy(f.x, f.y);
      if (this.alive(e)) this.throwRose('npc', e.x, e.y);
      else s.roseUntil = 0;
    }
  }

  /**
   * Prunes expired cuts and rewrites the holder's armour from scratch, every frame. Spare and
   * Make-out ride the same field rather than a second one: both mean "nothing lands on this
   * fighter right now", and one writer per frame is the only way that stays true when a rose is
   * being held through either of them.
   */
  private updateStacks(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f) continue;
      if (s.stacks.length) s.stacks = s.stacks.filter((until) => until > time);
      const untouchable = s.spareUntil > time || s.makeoutUntil > time;
      if (untouchable) {
        f.passionIncomingMult = 0;
        s.multOwned = true;
      } else if (s.stacks.length > 0) {
        // Multiplicative: "stacks infinitely" has to mean approaching zero, never reaching it.
        f.passionIncomingMult = ROSE_STACK_MULT ** s.stacks.length;
        s.multOwned = true;
      } else if (s.multOwned) {
        f.passionIncomingMult = 1;
        s.multOwned = false;
      }
    }
  }

  // ── Mastery passive: Attraction ────────────────────────────────────────────

  /**
   * The ring, and the rule it enforces.
   *
   * Only bodies that have *been* inside it are held by it. Without that latch the boundary
   * would read as a net rather than as a room: an Invasion husk crossing the far side of the
   * level would be snapped onto the circle from wherever it happened to be standing.
   *
   * Position is written outright rather than pushed with velocity, for the same reason Make-out
   * writes it — this runs after movement, and a wall you can walk through if you lean on it hard
   * enough is not a wall. The velocity that got them there is dropped with it, which costs
   * nothing: both WASD and the AI rewrite velocity from scratch every frame, so the only motion
   * this actually removes is the outward part they were not allowed to keep.
   */
  private updateAttraction(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (!this.masteryOn(owner)) {
      if (s.caught.size) s.caught.clear();
      return;
    }
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    for (const t of this.targetsOf(owner)) {
      // A boss drives its own body through scripted set pieces. The ring is drawn around it and
      // holds nothing — and so does not get to claim it caught anything either.
      if (this.api.bossFight && t === this.api.npc) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d <= ATTRACT_RADIUS) {
        if (!s.caught.has(t)) {
          s.caught.add(t);
          this.fx(owner).heartRing(t.x, t.y, 8, 44, PSN.pink, 480);
          this.api.showFloatingText(t.x, t.y - 44, '💞 CAUGHT', this.hex(PSN.hot));
          Sfx.playAt('heartbeat', t.x, { volume: 0.5, rate: 1.3 });
        }
        continue;
      }
      if (!s.caught.has(t)) continue;
      // Online the opponent is a replica: their body belongs to the sim they are playing on,
      // and that sim is running this same passive against them. Drawing the wall is ours; the
      // holding is theirs.
      if (owner === 'player' && this.api.isOnline && t === this.api.npc) continue;
      // Anything that already refuses to be moved keeps refusing — the ring is a shove like any
      // other, and Unbreakable and Unstoppable both outrank it.
      if (t.knockbackImmune || t.unstoppable) continue;

      const a = Math.atan2(t.y - f.y, t.x - f.x);
      const nx = f.x + Math.cos(a) * ATTRACT_RADIUS;
      const ny = f.y + Math.sin(a) * ATTRACT_RADIUS;
      t.setPosition(nx, ny);
      this.body(t).reset(nx, ny);
      if (this.rebounds.length < REBOUND_CAP) {
        this.rebounds.push({ x: nx, y: ny, ang: a, until: time + REBOUND_MS });
      }
    }
  }

  // ── Mastery bindable: Perfume ──────────────────────────────────────────────

  /** The bound key, or the bot's own decision. Answers whether the spray actually went out. */
  private tryCastPerfume(owner: Owner, tx: number, ty: number): boolean {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    if (this.now - s.perfumeCastAt < PERFUME_COOLDOWN_MS) return false;
    s.perfumeCastAt = this.now;
    this.castPerfume(owner, tx, ty);
    // Cast off a private timer rather than through `castAbility`, so the peer only learns about
    // it here.
    if (owner === 'player') this.api.broadcastMasteryCast('perfume');
    return true;
  }

  /** Online: the opponent sprayed on their machine, and it has to hang in the air on ours too. */
  doNpcPerfume(tx: number, ty: number): void {
    this.sides.npc.perfumeCastAt = this.now;
    this.castPerfume('npc', tx, ty);
  }

  private castPerfume(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    // Placed along the aim, capped — aim at your own feet and the cloud lands on you, which is
    // the whole of the "trap or coat" decision the ability is built around.
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const reach = Math.min(PERFUME_CAST_DIST, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    const cx = Phaser.Math.Clamp(f.x + Math.cos(ang) * reach, this.left, this.right);
    const cy = Phaser.Math.Clamp(f.y + Math.sin(ang) * reach, this.top, this.bottom);

    this.clouds.push({
      owner, x: cx, y: cy, bornAt: this.now, diesAt: this.now + PERFUME_MS,
      nextTextAt: this.now + PERFUME_TEXT_INTERVAL_MS, seed: Math.random() * 999,
    });

    const av = this.avatar(owner);
    av?.play('punch', ang);
    const hand = av?.pistolTip();
    this.fx(owner).spray(
      hand && Number.isFinite(hand.x) ? hand.x : f.x + Math.cos(ang) * 18,
      hand && Number.isFinite(hand.y) ? hand.y : f.y + Math.sin(ang) * 18,
      ang, Math.max(30, reach),
    );
    this.fx(owner).hearts(cx, cy, 6, 40, PSN.blush, 780);
    this.api.showFloatingText(f.x, f.y - 52, '🌸 PERFUME', this.hex(PSN.pink));
    Sfx.playAt('whoosh', f.x, { volume: 0.55, rate: 1.6 });
    Sfx.playAt('sparkle', cx, { volume: 0.5, rate: 0.9 });
  }

  /**
   * The dose. Standing in your own cloud banks two seconds of aura for every one spent in it —
   * and because the bank is spent in real time while it fills, a caster who never leaves the
   * cloud gains a net second a second and walks out of a six-second cloud wearing up to twelve.
   */
  private updatePerfume(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    const inCloud = this.clouds.some((c) => c.owner === owner
      && Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) <= PERFUME_RADIUS);
    if (inCloud) {
      const banked = Math.max(s.auraUntil, time) + delta * PERFUME_CHARGE_RATE;
      s.auraUntil = Math.min(time + PERFUME_AURA_MAX_MS, banked);
    }

    if (s.auraUntil <= time) return;
    const dt = delta / 1000;
    const say = time >= s.nextPerfumeTextAt;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > AURA_RADIUS) continue;
      // Quote the figure before the tick goes in, so the number on screen is what the next
      // second is actually worth.
      const perSec = AURA_LOVE_PER_SEC * this.loveMult(owner, t);
      this.addLove(owner, t, AURA_LOVE_PER_SEC * dt);
      if (say) {
        this.api.showFloatingText(t.x, t.y - 40, `+${Math.round(perSec)} 💐`,
          this.hex(perSec > AURA_LOVE_PER_SEC + 0.01 ? PSN.gold : PSN.blush));
      }
    }
    if (say) s.nextPerfumeTextAt = time + PERFUME_TEXT_INTERVAL_MS;
  }

  /** The clouds themselves: they age, they pay, and they never follow anybody. */
  private updateClouds(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      if (time >= c.diesAt) {
        this.clouds.splice(i, 1);
        continue;
      }
      const say = time >= c.nextTextAt;
      for (const t of this.targetsOf(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > PERFUME_RADIUS) continue;
        const perSec = PERFUME_LOVE_PER_SEC * this.loveMult(c.owner, t);
        this.addLove(c.owner, t, PERFUME_LOVE_PER_SEC * dt);
        if (say) {
          this.api.showFloatingText(t.x, t.y - 34, `+${Math.round(perSec)} 🌸`,
            this.hex(perSec > PERFUME_LOVE_PER_SEC + 0.01 ? PSN.gold : PSN.pink));
        }
      }
      if (say) c.nextTextAt = time + PERFUME_TEXT_INTERVAL_MS;
    }
  }

  /**
   * The bot's spray.
   *
   * It lives here rather than in `doPassionAbilities` because enhancement ids are not in
   * `element.abilities` — `castAbility('perfume')` would do nothing at all — so the kit is the
   * only thing that can pull the trigger. What the AI *does* get is the synergy: the kit hands
   * it the cloud's centre through `npcCloudPoint`, and the bot walks into its own cloud to bank
   * the aura, which is the play the ability is built around.
   *
   * The point is chosen halfway to the target so that a single cast covers both of them: the
   * enemy is charmed by the cloud while the bot is dosed by it.
   */
  private updateNpcPerfume(time: number): void {
    // Online the npc is a remote player: their own client casts it and it arrives via replay.
    if (this.api.isOnline) return;
    if (!this.perfumeSlot('npc')) return;
    const f = this.api.npc;
    const target = this.api.player;
    if (!this.alive(f) || !this.alive(target)) return;
    if (time - this.sides.npc.perfumeCastAt < PERFUME_COOLDOWN_MS) return;
    const d = Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y);
    if (d > NPC_PERFUME_RANGE) return;
    this.tryCastPerfume('npc', (f.x + target.x) / 2, (f.y + target.y) / 2);
  }

  /**
   * Exhibition. The love only flows out of people who are looking, which is the one piece of
   * counterplay in the element that costs the victim nothing but their aim.
   */
  private updatePose(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    if (s.poseUntil <= time) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.poseUntil = 0; return; }

    const dt = delta / 1000;
    let watching = 0;
    for (const t of this.targetsOf(owner)) {
      const toward = Math.atan2(f.y - t.y, f.x - t.x);
      const off = Math.abs(Phaser.Math.Angle.Wrap(this.facingOf(t) - toward));
      if (off > POSE_VIEW_HALF_ANGLE) continue;
      watching++;
      // Read the multiplier for the caption before the tick goes in, so the number quoted is
      // the one the next second is actually worth.
      const perSec = POSE_LOVE_PER_SEC * this.loveMult(owner, t);
      this.addLove(owner, t, POSE_LOVE_PER_SEC * dt);
      if (time >= s.nextPoseTextAt) {
        this.api.showFloatingText(t.x, t.y - 34, `+${Math.round(perSec)} ❤`,
          this.hex(perSec > POSE_LOVE_PER_SEC + 0.01 ? PSN.gold : PSN.hot));
      }
    }
    if (time >= s.nextPoseTextAt) s.nextPoseTextAt = time + POSE_TEXT_INTERVAL_MS;

    // Flashbulbs alternating along the two side walls, aimed inward at the poser.
    if (time >= s.nextFlashAt) {
      s.nextFlashAt = time + FLASH_INTERVAL_MS;
      s.flashSide = -s.flashSide;
      const fx = s.flashSide > 0 ? this.api.width - 14 : 14;
      const fy = Phaser.Math.Between(Math.round(this.top + 30), Math.round(this.bottom - 30));
      this.fx(owner).cameraFlash(fx, fy, Math.atan2(f.y - fy, f.x - fx));
      Sfx.playAt('sparkle', fx, { volume: 0.4, rate: 1.5 });
    }
    // The crowd underneath it all.
    if (time >= s.nextCheerAt) {
      s.nextCheerAt = time + CHEER_INTERVAL_MS;
      Sfx.playAt('rain', f.x, { volume: 0.3, rate: 1.7 });
      if (!watching) {
        this.api.showFloatingText(f.x, f.y - 60, '👀 NOBODY IS LOOKING', this.hex(PSN.wine));
      }
    }
  }

  /** Heart bullets and thrown roses. */
  private updateShots(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.spin += dt * (sh.kind === 'rose' ? 9 : 3);

      if (time >= sh.diesAt || sh.x < this.left - 40 || sh.x > this.right + 40
        || sh.y < this.top - 40 || sh.y > this.bottom + 40) {
        this.shots.splice(i, 1);
        // Show-off: a heart that touched nobody is the miss that ends the run.
        if (sh.kind === 'heart') this.breakStreak(sh.owner, sh.x, sh.y);
        continue;
      }

      const r = sh.kind === 'rose' ? ROSE_THROW_HIT_R : SHOT_HIT_R;
      let hit: Fighter | null = null;
      for (const t of this.targetsOf(sh.owner)) {
        if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > r + 18) continue;
        hit = t;
        break;
      }
      if (!hit) continue;

      this.shots.splice(i, 1);
      const ang = Math.atan2(sh.vy, sh.vx);
      if (sh.kind === 'rose') {
        this.fx(sh.owner).petals(hit.x, hit.y, 12);
        this.api.spawnHitFlash(hit.x, hit.y, PSN.deep);
        this.addLove(sh.owner, hit, sh.love, '🌹');
      } else {
        // The meter feeds the gun: every 80 already on the bar is another two damage.
        const bonus = Math.floor(this.loveOf(hit).cur / SHOT_LOVE_PER_BONUS) * SHOT_BONUS_DAMAGE;
        hit.takeDamage(SHOT_DAMAGE + bonus);
        this.api.spawnHitFlash(hit.x, hit.y, PSN.hot);
        this.fx(sh.owner).hearts(hit.x, hit.y, 4, 18, PSN.hot, 480);
        this.marks.push({ x: hit.x, y: hit.y + 14, ang, until: time + 1600, size: 8 });
        // Love first, streak second: the shot that completes a run pays at 1× and everything
        // after it at 1.5×. The reward is the window, not the hit that opened it.
        this.addLove(sh.owner, hit, SHOT_LOVE, '❤');
        this.landStreakHit(sh.owner, hit, time);
      }
    }
  }

  /**
   * Drops the meters of anyone who is gone. A wave-based Invasion run retires husks by the
   * hundred, and these maps hold a strong reference to every Fighter they have ever seen.
   */
  private prune(time: number): void {
    if (time < this.nextPruneAt) return;
    this.nextPruneAt = time + 3000;
    for (const f of [...this.loves.keys()]) if (!f.active) this.loves.delete(f);
    for (const f of [...this.lastFacing.keys()]) if (!f.active) this.lastFacing.delete(f);
    // Attraction's roll of who is inside the ring holds the same strong references.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const caught = this.sides[owner].caught;
      if (!caught.size) continue;
      for (const f of [...caught]) if (!f.active) caught.delete(f);
    }
  }

  /**
   * The clothes: tumble, land, lie still, fade. Nothing here touches the fight — a garment is
   * scenery, and it is the only thing in the element that is purely that.
   */
  private updateClothes(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.clothes.length - 1; i >= 0; i--) {
      const c = this.clothes[i];
      if (time >= c.fadeAt + CLOTH_FADE_MS) {
        this.clothes.splice(i, 1);
        continue;
      }

      if (c.landed) {
        c.settle = Math.min(1, c.settle + dt * 4.5);
        // Ease the last of the tumble out into the slump angle instead of snapping to it.
        c.ang += Phaser.Math.Angle.Wrap(c.restAng - c.ang) * Math.min(1, dt * 7);
        continue;
      }

      // Air drag on the horizontal only: cloth keeps falling but stops travelling.
      c.vy += CLOTH_GRAVITY * dt;
      c.vx *= 1 - Math.min(1, dt * 1.6);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.ang += c.spin * dt;
      c.spin *= 1 - Math.min(1, dt * 0.9);
      c.x = Phaser.Math.Clamp(c.x, this.left + 8, this.right - 8);

      if (c.vy > 0 && c.y >= c.restY) {
        c.y = c.restY;
        c.landed = true;
        this.fx(c.owner).hearts(c.x, c.y, 2, 12, PSN.blush, 500, 4);
        Sfx.playAt('whoosh', c.x, { volume: 0.18, rate: 1.9 });
      }
    }
  }

  /** 1 for the whole pose, then down to 0 across the fade. */
  private clothAlpha(c: Cloth, time: number): number {
    return Phaser.Math.Clamp((c.fadeAt + CLOTH_FADE_MS - time) / CLOTH_FADE_MS, 0, 1);
  }

  private updateMarks(time: number): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      if (this.marks[i].until <= time) this.marks.splice(i, 1);
    }
  }

  private updateRebounds(time: number): void {
    for (let i = this.rebounds.length - 1; i >= 0; i--) {
      if (this.rebounds[i].until <= time) this.rebounds.splice(i, 1);
    }
  }

  /**
   * Who is bare this frame, and the tint that says so.
   *
   * The head is the Fighter sprite rather than part of the rig, so bare skin has to be a repaint
   * of the sprite as well as of the rig — otherwise a character goes tan from the neck down and
   * keeps a pink face. A mature Make-out strips *both* of them, and the other fighter's rig
   * belongs to whatever element they picked and can't be undressed, so for them the sprite tint
   * is the whole of it.
   */
  private updateBareSkin(): void {
    const bare = new Map<Fighter, PassionColorFn>();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isPassion(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      const posing = s.poseUntil > this.now && owner === 'player' && this.api.matureMode;
      const bedding = s.makeoutBed && s.makeoutUntil > this.now;
      if (!posing && !bedding) continue;
      // Both are painted through the Passion side's colour map, so a skinned Passion and
      // whoever they dragged into the bed come out of it the same colour.
      if (this.alive(f)) bare.set(f, this.col(owner));
      if (bedding && this.alive(s.makeoutTarget)) bare.set(s.makeoutTarget!, this.col(owner));
    }

    for (const [f, col] of bare) {
      // `setTintFill`, not `setTint` — a multiplicative tint over a sprite's own colours can
      // only darken them, and tan over pink comes out red. The pair is top/bottom, so the flat
      // repaint keeps a little vertical shading instead of reading as a silhouette.
      //
      // Rewritten every frame rather than on the transition: `SkinsKit` repaints equipped-skin
      // bodies on its own per-frame pass, and a one-shot tint would simply lose that race.
      const top = col(PASSION_SKIN_TINT[0]);
      const bottom = col(PASSION_SKIN_TINT[1]);
      f.setTintFill(top, top, bottom, bottom);
    }
    for (const f of this.bareSkinned) {
      if (!bare.has(f) && f.active) f.clearTint();
    }
    this.bareSkinned = new Set(bare.keys());
  }

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;
    if (playerIs && !this.playerAvatar) this.playerAvatar = new PassionAvatar(scene, this.pcol);
    if (npcIs && !this.npcAvatar) this.npcAvatar = new PassionAvatar(scene, this.ncol);

    for (const owner of ['player', 'npc'] as Owner[]) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!f || !f.active) { av.update(delta, -999, -999, 0); continue; }

      const s = this.side(owner);
      // Mid-finisher there is only one thing worth looking at, whatever the cursor says.
      const target = s.makeoutTarget && s.makeoutUntil > this.now
        ? { x: s.makeoutTarget.x, y: s.makeoutTarget.y }
        : owner === 'player'
          ? { x: s.aimX, y: s.aimY }
          : { x: this.api.player.x, y: this.api.player.y };
      av.setFacing(Math.atan2(target.y - f.y, target.x - f.x));

      const roseLeft = Math.max(0, s.roseUntil - this.now);
      av.setRose(s.roseUntil > this.now, 1 - Phaser.Math.Clamp(roseLeft / ROSE_HOLD_MS, 0, 1));

      const posing = s.poseUntil > this.now;
      const censored = owner === 'player' && this.api.matureMode;
      av.setPosing(posing ? 1 : 0);
      av.setCensored(censored);
      // Undressed for exactly as long as the scene runs — the garments on the floor outlive it
      // only by their fade, by which point the suit is back on. `updateBareSkin` ran first and
      // has already decided who that is, so the rig and the sprite can't disagree.
      av.setStripped(this.bareSkinned.has(f));
      // A pose is a held stance, not a gesture — the arms have to stay put for five seconds.
      av.setHold(posing ? 'ride' : null);
      av.setIntensity(posing ? 1.25 : 1);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const now = this.now;
    const t = this.vizT;

    // Attraction's boundary goes down under everything: it is the shape of the room the rest of
    // the fight happens inside.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.masteryOn(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      attractionRing(g, this.col(owner), f.x, f.y, ATTRACT_RADIUS, t,
        owner === 'player' ? 1 : 0.85, owner === 'player' ? 3 : 17);
    }

    // The bed goes down first — everything else on this layer, and both fighters, stand on it.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!s.makeoutBed || s.makeoutUntil <= now) continue;
      const rise = Phaser.Math.Clamp((now - s.makeoutStartedAt) / 260, 0, 1);
      const fade = Phaser.Math.Clamp((s.makeoutUntil - now) / 300, 0, 1);
      drawBed(g, this.col(owner), s.makeoutX, s.makeoutY, s.makeoutAng, fade, rise);
    }

    for (const m of this.marks) {
      const life = Phaser.Math.Clamp((m.until - now) / 1400, 0, 1);
      heartOutline(g, this.pcol, m.x, m.y, m.size * (0.7 + life * 0.4), m.ang, PSN.deep, life * 0.5, 2);
      g.fillStyle(this.pcol(PSN.hot), life * 0.16);
      g.fillEllipse(m.x, m.y, m.size * 2.2, m.size * 1.1);
    }
    // Clothes that have landed belong under the fighters — you can stand on your own jacket.
    for (const c of this.clothes) {
      if (!c.landed) continue;
      garment(g, this.col(c.owner), c.kind, c.x, c.y, c.ang, this.clothAlpha(c, now), 1, c.settle);
    }

    // Perfume last on this layer, so the mist reads as hanging over the floor rather than
    // painted onto it. Both ends fade: it blooms out over 300ms and thins out over the last 700.
    for (const c of this.clouds) {
      const rise = Phaser.Math.Clamp((now - c.bornAt) / 300, 0, 1);
      const fade = Phaser.Math.Clamp((c.diesAt - now) / 700, 0, 1);
      perfumeCloud(g, this.col(c.owner), c.x, c.y, PERFUME_RADIUS * (0.55 + rise * 0.45),
        t, Math.min(rise, fade), c.seed);
    }
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (s.auraUntil <= now || !this.alive(f)) continue;
      perfumeAura(g, this.col(owner), f.x, f.y, AURA_RADIUS, t,
        Phaser.Math.Clamp((s.auraUntil - now) / 700, 0, 1));
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    // Somebody leaning on Attraction's boundary. Drawn up here rather than on the ring itself
    // because the shove happens on a body, and it has to be legible over the top of one.
    for (const r of this.rebounds) {
      const left = Phaser.Math.Clamp((r.until - this.now) / REBOUND_MS, 0, 1);
      attractionRebound(g, this.pcol, r.x, r.y, r.ang, left, left);
    }
    // Garments still in flight pass in front of everything, so the strip is unmissable.
    for (const c of this.clothes) {
      if (c.landed) continue;
      garment(g, this.col(c.owner), c.kind, c.x, c.y, c.ang, this.clothAlpha(c, this.now));
    }
    for (const sh of this.shots) {
      const tint = this.col(sh.owner);
      const ang = Math.atan2(sh.vy, sh.vx);
      if (sh.kind === 'rose') {
        // Tumbling end over end, with petals shaking loose behind it.
        drawRose(g, tint, sh.x, sh.y, sh.spin, 0.95, 1, 0);
        for (let i = 1; i <= 3; i++) {
          g.fillStyle(tint(PSN.deep), 0.28 / i);
          g.fillEllipse(sh.x - sh.vx * 0.012 * i, sh.y - sh.vy * 0.012 * i, 5 - i, 3.4 - i * 0.5);
        }
      } else {
        // A trail of shrinking hearts, then the bullet itself over the top of them.
        for (let i = 3; i >= 1; i--) {
          heart(g, tint, sh.x - sh.vx * 0.014 * i, sh.y - sh.vy * 0.014 * i,
            9 - i * 1.9, ang, PSN.blush, 0.42 / i);
        }
        g.fillStyle(tint(PSN.hot), 0.22);
        g.fillCircle(sh.x, sh.y, 13);
        heart(g, tint, sh.x, sh.y, 10 + Math.sin(sh.spin * 2.4) * 0.9, ang, PSN.hot, 1, true);
      }
    }
  }

  /**
   * The passive, drawn on everyone Passion is working on: the meter, the blush stage, and the
   * heart eyes at the top end. Everything here is on the *victim*, which is the only place the
   * element's progress is ever visible.
   */
  private paintFaces(): void {
    const g = this.faceGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isPassion(owner)) continue;
      const tint = this.col(owner);
      for (const victim of this.targetsOf(owner)) {
        const l = this.loves.get(victim);
        if (!l) continue;
        const ratio = Phaser.Math.Clamp(l.cur / l.max, 0, 1);
        const stage = this.stageOf(ratio);

        loveBar(g, tint, victim.x, victim.y + LOVE_BAR_Y, LOVE_BAR_W, LOVE_BAR_H, ratio, t);

        // Show-off: a gold frame around the meter for as long as they are Impressed, because
        // the effect is a multiplier on a bar and so has to be readable *on* that bar.
        if (l.impressedUntil > this.now) {
          const beat = 0.6 + Math.abs(Math.sin(t * 6)) * 0.4;
          g.lineStyle(1.6, tint(PSN.gold), beat);
          g.strokeRect(victim.x - LOVE_BAR_W / 2 - 2.5, victim.y + LOVE_BAR_Y - 2.5,
            LOVE_BAR_W + 5, LOVE_BAR_H + 5);
          for (let i = 0; i < 3; i++) {
            const a = t * 2.2 + (i / 3) * Math.PI * 2;
            heart(g, tint, victim.x + Math.cos(a) * (LOVE_BAR_W / 2 + 7),
              victim.y + LOVE_BAR_Y + LOVE_BAR_H / 2 + Math.sin(a) * 5,
              3.4, Math.PI / 2, PSN.gold, beat * 0.9);
          }
        }

        if (stage >= 1) {
          blush(g, tint, victim.x, victim.y, Math.min(stage, 3) as 1 | 2 | 3, victim.alpha, t);
        }
        if (stage >= 3) {
          heartEyes(g, tint, victim.x, victim.y, victim.alpha, t);
        }
      }

      this.paintSpare(g, owner, tint, t);
      this.paintMakeout(g, owner, tint, t);
    }
  }

  /**
   * Spare, on the people it is happening to. They are drawn hesitating — a heart welling up
   * over each of them and their own weapon-hand shaking — because the player's only clue that
   * five seconds of immunity just started is what the enemies do about it.
   */
  private paintSpare(
    g: Phaser.GameObjects.Graphics, owner: Owner, tint: PassionColorFn, t: number,
  ): void {
    const s = this.side(owner);
    if (s.spareUntil <= this.now) return;
    const left = (s.spareUntil - this.now) / SPARE_MS;
    // The whole thing tightens as the window runs out: they are visibly getting over it.
    const wobble = (1 - left) * 3.4;

    for (const victim of this.targetsOf(owner)) {
      const shake = Math.sin(this.now / 34) * wobble;
      const hy = victim.y - 40 - left * 6;
      g.fillStyle(tint(PSN.hot), 0.16 * left);
      g.fillCircle(victim.x, victim.y, 30 + Math.sin(t * 5) * 3);
      heart(g, tint, victim.x + shake, hy, 11 + Math.sin(t * 7) * 1.6, Math.PI / 2,
        PSN.hot, 0.55 + left * 0.4, true);
      // A crack across the heart once they are more than halfway to shaking it off.
      if (left < 0.5) {
        g.lineStyle(1.6, tint(PSN.ink), (0.5 - left) * 1.8);
        g.lineBetween(victim.x + shake - 1, hy - 9, victim.x + shake + 2, hy);
        g.lineBetween(victim.x + shake + 2, hy, victim.x + shake - 2, hy + 8);
      }
    }

    // And on the one being spared: petals raining off the rose that bought it.
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.9 + i * 0.2) % 1;
      g.fillStyle(tint(i % 2 ? PSN.deep : PSN.hot), (1 - ph) * 0.6 * left);
      g.fillEllipse(f.x + Math.sin(ph * 6 + i) * 14, f.y - 26 + ph * 44, 5.4, 3.4);
    }
  }

  /**
   * Make-out. The pair is already held in place by the sim; this is the bloom of hearts around
   * them and the prints coming off it, drawn over everything so a finisher never ends up behind
   * somebody else's aura.
   */
  private paintMakeout(
    g: Phaser.GameObjects.Graphics, owner: Owner, tint: PassionColorFn, t: number,
  ): void {
    const s = this.side(owner);
    if (s.makeoutUntil <= this.now) return;
    const done = Phaser.Math.Clamp(1 - (s.makeoutUntil - this.now) / MAKEOUT_MS, 0, 1);
    const { makeoutX: x, makeoutY: y } = s;

    // The halo, opening wider with every kiss that has landed.
    g.fillStyle(tint(PSN.hot), 0.1 + done * 0.14);
    g.fillCircle(x, y, 34 + done * 26 + Math.sin(t * 6) * 3);
    const ring = 12;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + t * 1.1;
      const r = 30 + done * 22 + Math.sin(t * 4 + i) * 4;
      heart(g, tint, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.72,
        4.4 + done * 3, a + Math.PI / 2, PSN.pink, 0.5 + done * 0.45);
    }
    // One print per kiss so far, laid out in an arc above them — the counter, drawn.
    for (let i = 0; i < s.makeoutKisses; i++) {
      const a = -Math.PI / 2 + (i - (MAKEOUT_KISSES - 1) / 2) * 0.34;
      kissMark(g, tint, x + Math.cos(a) * 40, y + Math.sin(a) * 34,
        a + Math.PI / 2, 11, 0.85);
    }

    // Mature mode: both of them get bars, not just the one whose element this is. The enemy's
    // rig belongs to whatever they picked and can't be undressed, so the bars are painted here
    // over both bodies rather than on either avatar.
    if (!s.makeoutBed) return;
    const f = this.fighter(owner);
    const pair = [f, s.makeoutTarget].filter((b): b is Fighter => this.alive(b));
    for (const b of pair) {
      const j = Math.floor(this.now / 110) + (b === f ? 0 : 7);
      censorBar(g, b.x + (jitter(b.x, j) - 0.5) * 1.4, b.y + 15, 22, 10,
        (jitter(b.x, j + 1) - 0.5) * 0.07, 1);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsPassion: boolean, time: number): void {
    const s = this.sides.player;
    const p = this.api.player;

    this.api.setStatusIndicator('passion-rose', playerIsPassion && s.roseUntil > time ? {
      name: 'Rose', emoji: '🌹', color: PSN.deep,
      description: 'Held in your teeth. Every hit you take cuts the attacker\'s damage by another '
        + '5% for 5s. Press F again to throw it.',
      until: s.roseUntil, priority: 110,
    } : null);

    this.api.setStatusIndicator('passion-pose', playerIsPassion && s.poseUntil > time ? {
      name: 'Exhibition', emoji: '📸', color: PSN.gold,
      description: 'Posing. Anyone facing you is gaining 15 love a second.',
      until: s.poseUntil, priority: 100,
    } : null);

    // Whoever is holding the rose is the one carrying its armour, so this is not player-gated.
    const holder = playerIsPassion ? s : this.sides.npc;
    const mine = playerIsPassion ? s.stacks.length : 0;
    const against = playerIsPassion ? 0 : holder.stacks.length;
    this.api.setStatusIndicator('passion-thorns', mine > 0 ? {
      name: 'Thorns', emoji: '🥀', color: PSN.wine,
      description: `Everything hitting you is dealing ${Math.round((1 - ROSE_STACK_MULT ** mine) * 100)}% less damage.`,
      count: mine, priority: 96,
    } : null);
    this.api.setStatusIndicator('passion-weakened', against > 0 ? {
      name: 'Weakened', emoji: '🥀', color: PSN.wine,
      description: `Their rose has taken ${Math.round((1 - ROSE_STACK_MULT ** against) * 100)}% off everything you deal.`,
      count: against, priority: 30,
    } : null);

    // ── Shop upgrades ──
    this.api.setStatusIndicator('passion-spare', playerIsPassion && s.spareUntil > time ? {
      name: 'Spared', emoji: '🌹', color: PSN.gold,
      description: 'They are too in love with you to land a blow. Nothing they do hurts you until '
        + 'they get over it.',
      until: s.spareUntil, priority: 130,
    } : null);

    const streak = playerIsPassion && this.api.hasUpgrade('click') ? s.hitStreak : 0;
    this.api.setStatusIndicator('passion-showoff', streak > 0 ? {
      name: 'Show-off', emoji: '😏', color: PSN.pink,
      description: `${streak} of ${SHOWOFF_STREAK} Loveshots landed in a row. Land the rest without `
        + 'missing and they are Impressed for 5s — all love worth 1.5×.',
      count: streak, priority: 60,
    } : null);

    const dates = playerIsPassion && this.api.hasUpgrade('e') ? s.flirtCount : 0;
    this.api.setStatusIndicator('passion-dating', dates > 0 ? {
      name: 'Dating', emoji: '💌', color: PSN.deep,
      description: `Every Flirt so far has made the next one land harder. The next is worth `
        + `+${dates * DATING_STEP} love.`,
      count: dates, priority: 58,
    } : null);

    // ── Mastery ──
    this.api.setStatusIndicator('passion-perfume', playerIsPassion && s.auraUntil > time ? {
      name: 'Perfume', emoji: '💐', color: PSN.blush,
      description: `You are wearing it. Everything within ${AURA_RADIUS}px of you is gaining `
        + `${AURA_LOVE_PER_SEC} love a second. Stand in the cloud to bank more — every second in `
        + 'it is worth two of this.',
      until: s.auraUntil, priority: 104,
    } : null);

    const held = playerIsPassion && this.masteryOn('player') ? s.caught.size : 0;
    this.api.setStatusIndicator('passion-attraction', held > 0 ? {
      name: 'Attraction', emoji: '💞', color: PSN.hot,
      description: `${held === 1 ? 'Somebody is' : `${held} of them are`} inside your ring and `
        + 'cannot get back out of it. It moves with you — walking away only drags them along.',
      count: held, priority: 102,
    } : null);

    // ── Victim side: the player's own meter, when the bot is the one playing Passion. ──
    const l = this.api.npcElementId === 'passion' ? this.loves.get(p) : undefined;
    this.api.setStatusIndicator('passion-love', l ? {
      name: 'In Love', emoji: '💘', color: PSN.hot,
      description: 'Their love for you fills a bar the size of your starting health. Nothing lowers '
        + 'it, and it kills you outright when it fills. Stop looking at them while they pose.',
      count: Math.round((l.cur / l.max) * 100), suffix: '%', priority: 4,
    } : null);

    this.api.setStatusIndicator('passion-impressed', l && l.impressedUntil > time ? {
      name: 'Impressed', emoji: '😍', color: PSN.gold,
      description: 'Three Loveshots in a row landed on you. Everything they do to that bar is '
        + 'worth 1.5× until it wears off.',
      until: l!.impressedUntil, priority: 5,
    } : null);

    this.api.setStatusIndicator('passion-attracted',
      this.masteryOn('npc') && this.sides.npc.caught.has(p) ? {
        name: 'Attracted', emoji: '💞', color: PSN.hot,
        description: `You are inside their ring and cannot leave it. The boundary sits ${ATTRACT_RADIUS}px `
          + 'out and follows them, so there is no distance to be made — kill them or be charmed.',
        priority: 6,
      } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** True while the bot already has a rose in its teeth — a second F would do nothing. */
  hasRose(owner: Owner): boolean {
    return this.sides[owner].roseUntil > this.now;
  }

  isPosing(owner: Owner): boolean {
    return this.sides[owner].poseUntil > this.now;
  }

  /**
   * Where the bot's own cloud is, while it is still worth standing in — the one Passion synergy
   * the movement half of the AI needs, since the aura is only ever banked by being inside it.
   * Side-effect free: it reads the cloud list and nothing else.
   */
  /**
   * The slot the bot gave up for Perfume, so its AI can stop casting what is no longer there.
   * The kit is the only thing that knows: the bind lives on the scene, but whether Passion is
   * even the element wearing it does not.
   */
  npcPerfumeSlot(): 'e' | 'r' | 'f' | 'q' | null {
    return this.perfumeSlot('npc');
  }

  npcCloudPoint(): { x: number; y: number } | null {
    if (!this.masteryOn('npc')) return null;
    const s = this.sides.npc;
    // Already fully dosed — there is nothing left to bank and the fight is worth more.
    if (s.auraUntil - this.now >= PERFUME_AURA_MAX_MS - 500) return null;
    const c = this.clouds.find((cl) => cl.owner === 'npc' && cl.diesAt > this.now + 200);
    return c ? { x: c.x, y: c.y } : null;
  }

  /**
   * The HUD cards. The rose's fifteen seconds and the pose's five both outlast their own
   * cooldowns, so those two slots count the ability rather than the wait.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    if (abilityId === 'passion-manipulate' && s.roseUntil > time) {
      return Phaser.Math.Clamp((s.roseUntil - time) / ROSE_HOLD_MS, 0, 1);
    }
    if (abilityId === 'passion-exhibition' && s.poseUntil > time) {
      return Phaser.Math.Clamp((s.poseUntil - time) / POSE_MS, 0, 1);
    }
    // Perfume counts its cloud down while one is hanging, then its own cooldown up afterwards —
    // the same two-phase card the rose uses, for the same reason: the cloud outlives nothing but
    // it is the thing the player is actually watching.
    if (abilityId === 'perfume') {
      const cloud = this.clouds.find((c) => c.owner === 'player' && c.diesAt > time);
      if (cloud) return Phaser.Math.Clamp((cloud.diesAt - time) / PERFUME_MS, 0, 1);
      return Phaser.Math.Clamp((time - s.perfumeCastAt) / PERFUME_COOLDOWN_MS, 0, 1);
    }
    return this.api.player.getCooldownRatio(abilityId);
  }
}
