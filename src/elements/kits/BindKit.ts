import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  BND, BindAvatar, BindColorFn, BindFx, arenaBinding, chainLink, chainRun, cosmicVeil, cultistFigure,
  darkMark, eviscerateCharge, faithRing, godBeam, hexWard, idolStatue, oblivionShard, overrageAura,
  patronEye, spreadReticle, vesselHalo,
} from './BindVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

// ── The patron (passive) ─────────────────────────────────────────────────────
const ANGER_MAX = 100;
/** Per second. The only thing that ever lowers the bar. */
const ANGER_DECAY = 2;
const WRATH_MS = 5000;
/** Where the eye hangs. Near enough the top edge that its beams always come *down*. */
const EYE_Y = 54;

// ── Summon (Click) ───────────────────────────────────────────────────────────
/** Seconds of continuous fire to reach maximum heat, and to bleed it all off again. */
const HEAT_RISE_S = 3.2;
const HEAT_FALL_S = 4.5;
const BEAM_TICK_COLD_MS = 460;
const BEAM_TICK_HOT_MS = 120;
const BEAM_DAMAGE = 7;
const BEAM_HIT_R = 26;
const OVERHEAT_ANGER = 20;
/** How long one cast keeps the beam alive — long enough to bridge the click's own cooldown. */
const BEAM_HOLD_MS = 420;

// ── Over-rage (Click+) ───────────────────────────────────────────────────────
/** Damage a second, taken by the person holding the button, in 1-point bites. */
const OVERRAGE_SELF_DPS = 2;
/** Anger a second while over-raging — flat, unlike everything else in the kit. */
const OVERRAGE_ANGER_RATE = 7;

// ── Shards of Oblivion (E) ───────────────────────────────────────────────────
const SHARD_COUNT = 25;
const SHARD_DAMAGE = 10;
const SHARD_SPEED = 720;
const SHARD_BLAST_R = 34;
/**
 * How far around the cursor the barrage lands. Twenty-five shards landing on one pixel would be
 * a 250-damage point blank rather than a barrage, so they are scattered across a footprint and a
 * body standing in the middle of it realistically eats five or six.
 */
const SHARD_SPREAD = 96;
const SHARD_STAGGER_MS = 26;
/** Each cast costs one of these, permanently, and the god picks. */
const TAX_STEP = 0.9;
const TAX_VULN_STEP = 1.1;

// ── Eviscerate (E+) ──────────────────────────────────────────────────────────
const EVIS_CHARGE_MS = 1500;
/** The tightest the barrage will ever land. Below the blast radius, so a full charge is a spear. */
const EVIS_TIGHT_SPREAD = 18;
/** Anger a second for standing there winding it up. The god is not paid in patience. */
const EVIS_ANGER_RATE = 4;

// ── Summon Idol (R) ──────────────────────────────────────────────────────────
const IDOL_R = 118;
const IDOL_FAITH_MAX = 10;
const IDOL_TICK_MS = 1000;
const IDOL_VOLLEY = 5;
const IDOL_SHARD_DAMAGE = 6;
const IDOL_STARVE_ANGER = 5;
/** How long an idol is allowed to sit empty before the patron takes it back. */
const IDOL_CRUMBLE_MS = 6000;

// ── Cult of the Broken God (R+) ──────────────────────────────────────────────
const CULT_MAX = 3;
/** Anger *gain* is cut by this per linked cultist, and speed raised by the next one. */
const CULT_ANGER_CUT = 0.12;
const CULT_SPEED = 0.10;
/**
 * Faith a cultist standing in the ring puts back per tick. Exactly a third, so three of them
 * cancel the one-a-second drain and the idol becomes self-dependent — and two do not.
 */
const CULT_FAITH_SHARE = 1 / 3;
const CULT_SPEED_PX = 190;
/** How far off its post a cultist mills, so three of them never stack into one shape. */
const CULT_ORBIT = 52;

// ── Prophet's Protection (F) ─────────────────────────────────────────────────
const WARD_CHARGES = 3;
const WARD_ANGER_SHARE = 0.5;
/** Chosen Vessel (F+): speed and damage, per hex still standing. */
const VESSEL_STEP = 0.15;

// ── God of Treachery (Q) ─────────────────────────────────────────────────────
const AWAKE_MS = 15_000;
const AWAKE_VOLLEY_MS = 1200;
const AWAKE_VOLLEY_SHARDS = 7;
const AWAKE_SWIPE_MS = 2100;
const AWAKE_SWIPE_DAMAGE = 24;
const AWAKE_SWIPE_R = 96;
const AWAKE_LASER_MS = 620;
const AWAKE_LASER_DAMAGE = 8;
const AWAKE_LASER_HIT_R = 20;
const AWAKE_BLAST_MS = 3000;
const AWAKE_BLAST_TELL_MS = 900;
const AWAKE_BLAST_R = 122;
const AWAKE_BLAST_DAMAGE = 38;
/** A slot given up is gone for the match; this is simply longer than any match can be. */
const SACRIFICE_MS = 900_000;
/**
 * How long the prompt stands there before it will accept an answer. Q is cast mid-fight with a
 * hand on every key, so without this the reflex press that follows it — usually the attack
 * button — pays the price before the player has seen the question.
 */
const SACRIFICE_GRACE_MS = 800;

/** How hard the corner chains hold the summoner in the middle of the room. */
const CHAIN_LERP_MS = 130;

// ── Awakening (Q+) ───────────────────────────────────────────────────────────
const AWK_VOLLEY_MS = 1600;
const AWK_SHARDS = 3;
const AWK_SHARD_DAMAGE = 9;
/** They are converts, not marksmen. This is deliberately wider than the player's own barrage. */
const AWK_SHARD_SPREAD = 130;
const AWK_DASH_MS = 2900;
const AWK_DASH_SPEED = 780;
const AWK_DASH_DAMAGE = 18;
const AWK_DASH_HIT_R = 34;
/** How far past the target the run carries, so the dash goes *through* rather than up to. */
const AWK_DASH_OVERSHOOT = 120;

const SACRIFICE_SLOTS: { id: string; key: string }[] = [
  { id: 'bind-summon', key: 'Click' },
  { id: 'bind-shards', key: 'E' },
  { id: 'bind-idol', key: 'R' },
  { id: 'bind-protection', key: 'F' },
];

// ── World objects ────────────────────────────────────────────────────────────

/** One shard in the air, on its way to the point it will burst at. */
interface Shard {
  owner: Owner;
  x: number;
  y: number;
  tx: number;
  ty: number;
  ang: number;
  damage: number;
  /** Game-clock time it is allowed to start moving — staggers a volley into a barrage. */
  liveAt: number;
  /** Wall on the flight, so a shard aimed at a corpse still burst somewhere. */
  diesAt: number;
  /** True while the patron is aiming this at the person who summoned it. */
  turned: boolean;
  seed: number;
}

interface Idol {
  owner: Owner;
  x: number;
  y: number;
  faith: number;
  nextTickAt: number;
  /** Game-clock time it first ran dry, or 0. Six seconds of this and it crumbles. */
  emptySince: number;
}

/** A patch of arena a dark-light beam is about to fall on. */
interface Mark {
  owner: Owner;
  x: number;
  y: number;
  landsAt: number;
  turned: boolean;
}

/** One of the awakened god's spray lasers, alive for a couple of frames. */
interface Spray {
  owner: Owner;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  until: number;
  turned: boolean;
}

/**
 * One convert. Not a Fighter and not damageable — a cultist is a piece of the summoner's economy
 * that happens to have a body, which is why nothing in the game can take one away except the
 * ultimate they are spent on.
 */
interface Cultist {
  owner: Owner;
  x: number;
  y: number;
  /** Fixed per convert: its wander phase and the seed its face is drawn from. */
  seed: number;
  /** Q+ — hood off, eyes out, taking orders from the cursor. */
  awakened: boolean;
  nextVolleyAt: number;
  nextDashAt: number;
  /** Non-null for the length of one charge across the room. */
  dash: {
    tx: number;
    ty: number;
    /** Everyone it has already gone through on this run — a dash hits each body once. */
    hit: Fighter[];
    lastX: number;
    lastY: number;
  } | null;
}

interface Ward {
  charges: number;
  /** Whatever absorber the fighter was already wearing, handed back when the ward is spent. */
  prev: ((amount: number) => boolean) | null;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** 0–100. The whole element. */
  anger: number;
  /** Game-clock expiry of the five seconds in which the god is pointing the other way. */
  wrathUntil: number;

  heat: number;
  overheated: boolean;
  /** Click+ — the button is being held past the top of the bar, and it is being paid for. */
  overrage: boolean;
  /** Fractional self-damage owed by the over-rage, cashed in whole points so it reads as hits. */
  overrageDebt: number;
  /** Game-clock time the beam stops, refreshed by every cast while the button is held. */
  firingUntil: number;
  nextBeamTickAt: number;
  /** Rate-limits the "it is not listening" refusal so a held button doesn't spam it. */
  lastRefusalAt: number;

  /** E+ — game-clock time the key went down, or 0 when nothing is winding up. */
  chargeStartedAt: number;
  /** 0–1, latched on release so the cast that follows knows how tight to throw. */
  chargeAtCast: number;

  taxSpeed: number;
  taxVuln: number;
  taxWeak: number;

  ward: Ward | null;

  awakeUntil: number;
  nextVolleyAt: number;
  nextSwipeAt: number;
  nextLaserAt: number;
  nextBlastAt: number;

  /** Q has been paid for but not yet priced — the next slot pressed is the one that dies. */
  pendingSacrifice: boolean;
  /** Game-clock time the prompt went up. Nothing may be given up for the first moment of it. */
  sacrificeAskedAt: number;
  /** Which slots have been given up, in order, for the HUD. Two ultimates cost two of them. */
  sacrificed: string[];
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, anger: 0, wrathUntil: 0,
    heat: 0, overheated: false, overrage: false, overrageDebt: 0,
    firingUntil: 0, nextBeamTickAt: 0, lastRefusalAt: 0,
    chargeStartedAt: 0, chargeAtCast: 0,
    taxSpeed: 0, taxVuln: 0, taxWeak: 0, ward: null,
    awakeUntil: 0, nextVolleyAt: 0, nextSwipeAt: 0, nextLaserAt: 0, nextBlastAt: 0,
    pendingSacrifice: false, sacrificeAskedAt: 0, sacrificed: [],
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface BindArenaApi {
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
  /** Skins: maps a Bind visual colour through that side's equipped skin. */
  bindColor(owner: Owner, base: number): number;
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

// ── BindKit ──────────────────────────────────────────────────────────────────

/**
 * Bind.
 *
 * There is only one system here and it is the **anger bar**. Every ability in the kit is a way of
 * asking the patron for something, and three of the five have a price that is paid in anger
 * rather than in cooldown: overheating the beam costs 20, an idol left to starve costs 5 a
 * second, and every hit the ward eats hands half of itself over. Anger falls at 2 a second and
 * nothing in the element lowers it faster, so the bar is a straight readout of how much of the
 * god's patience the player has spent — and at 100 the god spends five seconds using this exact
 * same kit, pointed the other way. The whole element is therefore a resource game in which the
 * resource is somebody else's mood.
 *
 * The second rule is that **nothing here is free and nothing here is refundable**. The barrage
 * charges a permanent debuff per cast and the god chooses which one. The idol is a gift that
 * starts billing the moment you walk away from it. The ultimate opens the sky for fifteen seconds
 * and takes one of the other four abilities away for the rest of the match. None of these can be
 * undone, which is what stops the element from being "press the good buttons" — every good button
 * makes the next minute worse, and the skill is in deciding how much worse you can afford.
 *
 * Mechanically the interesting piece is that the awakened god and the wrathful god are the *same
 * routine*: `runGod` fires volleys, swipes, laser sprays and dark-light beams, and a single
 * `turned` boolean decides whether it points at the enemy or at the person who summoned it.
 * That is not an economy — it is the reason the fantasy holds together at all.
 */
export class BindKit {
  private api: BindArenaApi;

  // ── Visuals ──
  private readonly pcol: BindColorFn;
  private readonly ncol: BindColorFn;
  private readonly pfx: BindFx;
  private readonly nfx: BindFx;
  private playerAvatar: BindAvatar | null = null;
  private npcAvatar: BindAvatar | null = null;
  /** Faith rings and the footprints of falling beams — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Idols, shards, wards and the heat bar — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The patron itself, its bar and every beam it fires — over everything. */
  private godGfx: Phaser.GameObjects.Graphics | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  /** The slots the prompt is currently offering, and whether it has stopped stalling yet. */
  private promptKeys = '';
  private promptReady = false;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private idols: Record<Owner, Idol | null> = { player: null, npc: null };
  private shards: Shard[] = [];
  private marks: Mark[] = [];
  private sprays: Spray[] = [];
  /** Both sides' converts in one list — they carry their own owner, like every other relic here. */
  private cultists: Cultist[] = [];
  /** Everything this kit has written an outgoing multiplier onto, and what it last wrote. */
  private appliedOut = new Map<Fighter, number>();
  /**
   * The mouse has been let go of at least once since the sacrifice prompt appeared. Without
   * this, casting Q while holding the beam down would give the Click slot away on the very next
   * frame, before the player had read a word of the prompt.
   */
  private sacrificeClickArmed = false;

  constructor(api: BindArenaApi) {
    this.api = api;
    this.pcol = (base) => api.bindColor('player', base);
    this.ncol = (base) => api.bindColor('npc', base);
    this.pfx = new BindFx(api.scene, this.pcol);
    this.nfx = new BindFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): BindFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): BindColorFn { return owner === 'player' ? this.pcol : this.ncol; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }
  private get eyeX(): number { return this.api.width / 2; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isBind(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'bind' : this.api.npcElementId === 'bind';
  }

  private avatar(owner: Owner): BindAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** True during the five seconds the patron is pointed at the person who summoned it. */
  private turned(owner: Owner): boolean {
    return this.now < this.side(owner).wrathUntil;
  }

  /** Shop upgrades, for whichever side is asking. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /**
   * The sky is open and the summoner is bolted to the middle of the floor by four chains. Nothing
   * in the kit answers while this is true — the god has the hands, and that is the point of it.
   */
  private chained(owner: Owner): boolean {
    return this.now < this.side(owner).awakeUntil;
  }

  private cult(owner: Owner): Cultist[] {
    return this.cultists.filter((c) => c.owner === owner);
  }

  private cultCount(owner: Owner): number {
    let n = 0;
    for (const c of this.cultists) if (c.owner === owner) n++;
    return n;
  }

  /** Hexes still standing, capped at what Chosen Vessel is willing to pay for. */
  private vesselHexes(owner: Owner): number {
    if (!this.up(owner, 'f')) return 0;
    return Math.min(3, this.side(owner).ward?.charges ?? 0);
  }

  /** The centre of the room — where the corner chains put you, and hold you. */
  private get centreX(): number { return this.api.width / 2; }
  private get centreY(): number { return this.api.height / 2; }

  private corners(): [number, number][] {
    return [
      [this.left, this.top], [this.right, this.top],
      [this.right, this.bottom], [this.left, this.bottom],
    ];
  }

  /**
   * Who the god is actually hurting right now. Every attack it makes goes through this, which is
   * the entire implementation of "it uses all of its attacks against you instead".
   */
  private godVictims(owner: Owner, turned: boolean): Fighter[] {
    if (!turned) return this.targetsOf(owner);
    const f = this.fighter(owner);
    return this.alive(f) ? [f] : [];
  }

  private refund(f: Fighter, abilityId: string): void {
    f.resetCooldown(abilityId);
  }

  /** Distance from a point to a segment — the beam and the spray lasers both need it. */
  private distToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    if (len2 < 0.0001) return Phaser.Math.Distance.Between(px, py, x0, y0);
    const t = Phaser.Math.Clamp(((px - x0) * dx + (py - y0) * dy) / len2, 0, 1);
    return Phaser.Math.Distance.Between(px, py, x0 + dx * t, y0 + dy * t);
  }

  private addAnger(owner: Owner, amount: number, why?: string): void {
    const s = this.side(owner);
    if (this.turned(owner)) return;
    // The cult prays on your behalf. Every convert takes 12% off the bill — never off the bar,
    // which is why this is applied to the *gain* rather than to the decay.
    const cut = 1 - CULT_ANGER_CUT * this.cultCount(owner);
    amount *= Math.max(0, cut);
    if (amount <= 0) return;
    const before = s.anger;
    s.anger = Math.min(ANGER_MAX, s.anger + amount);
    if (why && amount >= 3 && s.anger > before) {
      const f = this.fighter(owner);
      if (this.alive(f)) {
        this.api.showFloatingText(f.x + (Math.random() - 0.5) * 20, f.y - 62,
          `+${Math.round(amount)} ANGER · ${why}`, this.hex(BND.wrath));
      }
    }
    if (s.anger >= ANGER_MAX) this.beginWrath(owner);
  }

  /**
   * Nudge a fighter's shared outgoing multiplier by dividing out whatever this kit last put
   * there — writing it straight in would delete anything else running on the same body.
   */
  private setOutgoing(f: Fighter, mult: number): void {
    const prev = this.appliedOut.get(f) ?? 1;
    if (Math.abs(prev - mult) < 0.0005) return;
    f.outgoingDamageMult = (f.outgoingDamageMult / prev) * mult;
    if (Math.abs(mult - 1) < 0.0005) this.appliedOut.delete(f);
    else this.appliedOut.set(f, mult);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) this.dropWard(owner, false);
    for (const [f] of this.appliedOut) this.setOutgoing(f, 1);
    this.appliedOut.clear();
    for (const f of this.allFighters()) {
      if (f) f.bindIncomingMult = 1;
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.idols = { player: null, npc: null };
    this.shards = [];
    this.marks = [];
    this.sprays = [];
    this.cultists = [];
    this.sacrificeClickArmed = false;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.godGfx?.destroy(); this.godGfx = null;
    this.prompt?.destroy(); this.prompt = null;
    this.promptKeys = '';
    this.promptReady = false;

    this.api.setStatusIndicator('bind-anger', null);
    this.api.setStatusIndicator('bind-wrath', null);
    this.api.setStatusIndicator('bind-ward', null);
    this.api.setStatusIndicator('bind-awake', null);
    this.api.setStatusIndicator('bind-tithe', null);
    this.api.setStatusIndicator('bind-cult', null);
    this.api.setStatusIndicator('bind-vessel', null);
    this.api.setStatusIndicator('bind-overrage', null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5. The ring goes under them, the relics just over, and the patron
    // above everything — it is standing outside the arena rather than in it.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
    if (!this.godGfx) this.godGfx = scene.add.graphics().setDepth(18);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isBind('player') && !this.playerAvatar) this.playerAvatar = new BindAvatar(scene, this.pcol);
    if (this.isBind('npc') && !this.npcAvatar) this.npcAvatar = new BindAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'bind') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;

    // The price of the ultimate is paid before anything else can happen: the next slot pressed
    // is the one that dies, and nothing casts until one of them has been.
    if (s.pendingSacrifice) {
      // Presses inside the grace are drained rather than banked — JustDown has to be consumed
      // every frame or a key tapped while the prompt was still going up would pay the moment
      // the grace expired, which is the accident the grace exists to stop.
      const ready = this.now - s.sacrificeAskedAt >= SACRIFICE_GRACE_MS;
      this.setPromptReady(ready);
      // Click doubles as the attack button, so it takes a full release-and-press *after* the
      // grace to count. Holding the beam through the prompt must never cost you the beam.
      if (!pointer.isDown) this.sacrificeClickArmed = ready;
      for (const slot of SACRIFICE_SLOTS) {
        const pressed = slot.key === 'Click'
          ? (pointer.isDown && this.sacrificeClickArmed)
          : Phaser.Input.Keyboard.JustDown(this.keyFor(slot.key));
        // A slot the god already owns is not a price; it has to be one of the ones still alive.
        if (!ready || !pressed || s.sacrificed.includes(slot.key)) continue;
        this.takeSacrifice('player', slot.id, slot.key);
        return;
      }
      return;
    }

    // Chained to the middle of the room with the sky open: the god is using the hands, so there
    // is nothing to press. Every key is drained rather than ignored, or the whole fifteen seconds
    // would come out at once the frame the chains fall off.
    if (this.chained('player')) {
      s.chargeStartedAt = 0;
      Phaser.Input.Keyboard.JustDown(this.api.eKey);
      Phaser.Input.Keyboard.JustDown(this.api.rKey);
      Phaser.Input.Keyboard.JustDown(this.api.fKey);
      Phaser.Input.Keyboard.JustDown(this.api.qKey);
      return;
    }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown) p.castAbility('bind-summon', ctx);

    // ── E, with or without Eviscerate ──
    // Charged, the key is a hold: winding up costs anger by the second and buys accuracy, and
    // the cast itself only happens on the release, so the barrage lands where you finished
    // aiming rather than where you started.
    if (this.up('player', 'e')) {
      const held = this.api.eKey.isDown;
      const ready = p.getCooldownRatio('bind-shards') >= 1;
      if (held && !s.chargeStartedAt && ready && !this.turned('player')) {
        s.chargeStartedAt = this.now;
        Sfx.playAt('beam-charge', p.x, { rate: 0.55, volume: 0.5 });
      }
      if (s.chargeStartedAt && !held) {
        s.chargeAtCast = this.chargeOf('player');
        s.chargeStartedAt = 0;
        p.castAbility('bind-shards', ctx);
      }
      Phaser.Input.Keyboard.JustDown(this.api.eKey);
    } else if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      p.castAbility('bind-shards', ctx);
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('bind-idol', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('bind-protection', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('bind-treachery', ctx);
  }

  /** 0–1 of the Eviscerate wind-up, or 0 when nothing is being held. */
  private chargeOf(owner: Owner): number {
    const s = this.side(owner);
    if (!s.chargeStartedAt) return 0;
    return Phaser.Math.Clamp((this.now - s.chargeStartedAt) / EVIS_CHARGE_MS, 0, 1);
  }

  private keyFor(displayKey: string): Phaser.Input.Keyboard.Key {
    switch (displayKey) {
      case 'E': return this.api.eKey;
      case 'R': return this.api.rKey;
      default: return this.api.fKey;
    }
  }

  /**
   * A cast the patron simply refuses. Used for the five seconds it is angry: the abilities are
   * all *its*, so while it is pointed at you none of them answers — and the cooldown is handed
   * back, because being ignored should not also cost you the button.
   */
  private refuse(owner: Owner, abilityId: string, why = '⛓ IT IS NOT LISTENING'): void {
    const f = this.fighter(owner);
    this.refund(f, abilityId);
    const s = this.side(owner);
    if (this.now - s.lastRefusalAt < 900) return;
    s.lastRefusalAt = this.now;
    if (!this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 50, why, this.hex(BND.wrath));
    Sfx.playAt('ui-denied', f.x, { rate: 0.6, volume: 0.8 });
  }

  /**
   * The two states in which the kit answers nothing: the patron pointed inward, and the patron
   * using the body. Both hand the cooldown back, because neither of them is your fault twice.
   */
  private refused(owner: Owner, abilityId: string): boolean {
    if (this.turned(owner)) { this.refuse(owner, abilityId); return true; }
    if (this.chained(owner)) { this.refuse(owner, abilityId, '⛓ THE CHAINS HOLD YOU'); return true; }
    return false;
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — the beam.
   *
   * A cast only ever *renews* the beam; the damage is ticked by `updateBeam`, which is the only
   * place that knows about heat. Doing it this way means a held button and a bot spamming the
   * ability on its cooldown produce exactly the same beam, and neither of them can tick faster
   * than the heat says they may.
   */
  doSummon(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-summon'); return; }
    if (this.refused(owner, 'bind-summon')) return;
    const s = this.side(owner);
    // Over-rage: the button no longer stops at the top of the bar. The beam simply keeps going,
    // and `updateBeam` starts charging blood for it — see the OVERRAGE constants.
    if (s.overheated && !this.up(owner, 'click')) {
      // Refused, loudly and only once a second — the bar over the head is the real explanation.
      this.refund(f, 'bind-summon');
      if (this.now - s.lastRefusalAt >= 900) {
        s.lastRefusalAt = this.now;
        this.api.showFloatingText(f.x, f.y - 50, '🔥 OVERHEATED', this.hex(BND.heat));
        Sfx.playAt('ui-denied', f.x, { rate: 1.3, volume: 0.6 });
      }
      return;
    }
    this.ensureLayers();
    this.ensureAvatars();
    s.aimX = tx;
    s.aimY = ty;
    const opening = this.now >= s.firingUntil;
    s.firingUntil = this.now + BEAM_HOLD_MS;
    if (opening) {
      s.nextBeamTickAt = this.now;
      this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x));
      Sfx.playAt('beam-charge', f.x, { rate: 0.8, volume: 0.55 });
    }
  }

  /**
   * E — the barrage, and the tithe.
   *
   * The shards are staggered so twenty-five of them read as a downpour rather than a wall, and
   * the cost is rolled *here* rather than on impact: the god is charging for the favour, not for
   * the result, so a barrage that hits nothing costs exactly as much as one that kills.
   */
  doShards(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-shards'); return; }
    if (this.refused(owner, 'bind-shards')) return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    // Eviscerate: the wind-up is spent here and nowhere else. Twenty-five shards inside a
    // eighteen-pixel footprint is the whole barrage landing on one body instead of six of it.
    const charge = s.chargeAtCast;
    s.chargeAtCast = 0;
    const spread = Phaser.Math.Linear(SHARD_SPREAD, EVIS_TIGHT_SPREAD, charge);
    this.throwVolley(owner, tx, ty, SHARD_COUNT, SHARD_DAMAGE, spread, false);
    this.avatar(owner)?.play('slam', Math.atan2(ty - f.y, tx - f.x));
    Sfx.playAt('crystal-shatter', f.x, { rate: 0.85 + charge * 0.4, volume: 0.9 });
    if (charge > 0.15) {
      this.api.showFloatingText(f.x, f.y - 78,
        charge >= 0.995 ? '⛓ EVISCERATE' : `⛓ EVISCERATE ${Math.round(charge * 100)}%`,
        this.hex(BND.goldLit));
    }

    // The tithe. Three prices, chosen by the god, and none of them ever comes off again.
    const roll = Math.floor(Math.random() * 3);
    if (roll === 0) {
      s.taxSpeed++;
      this.api.showFloatingText(f.x, f.y - 66, '⛓ TITHE: −10% SPEED', this.hex(BND.wrath));
    } else if (roll === 1) {
      s.taxVuln++;
      this.api.showFloatingText(f.x, f.y - 66, '⛓ TITHE: +10% DAMAGE TAKEN', this.hex(BND.wrath));
    } else {
      s.taxWeak++;
      this.api.showFloatingText(f.x, f.y - 66, '⛓ TITHE: −10% DAMAGE DEALT', this.hex(BND.wrath));
    }
    Sfx.playAt('curse-cast', f.x, { rate: 0.75, volume: 0.7 });
  }

  /**
   * R — the idol.
   *
   * Deliberately not a turret. It is a contract: it pays out in shard volleys for exactly as long
   * as somebody keeps standing next to it, and the moment nobody does it starts charging 5 anger
   * a second until either they come back or it gives up. Re-casting moves it, which is the only
   * way to walk away from one without paying.
   */
  doIdol(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-idol'); return; }
    if (this.refused(owner, 'bind-idol')) return;
    this.ensureLayers();
    this.ensureAvatars();

    // Cult of the Broken God. Once there is something to worship, the key stops raising idols
    // and starts finding people to stand in front of them — which is the only way the idol's
    // bill ever gets paid by somebody other than you.
    if (this.up(owner, 'r') && this.idols[owner] && this.cultCount(owner) < CULT_MAX) {
      this.summonCultist(owner);
      return;
    }

    this.idols[owner] = {
      owner,
      x: Phaser.Math.Clamp(tx, this.left + 40, this.right - 40),
      y: Phaser.Math.Clamp(ty, this.top + 40, this.bottom - 40),
      faith: 0,
      nextTickAt: this.now + IDOL_TICK_MS,
      emptySince: this.now,
    };
    this.avatar(owner)?.play('raise');
    this.api.showFloatingText(tx, ty - 40, '⛓ IDOL RAISED · FEED IT', this.hex(BND.gold));
    Sfx.playAt('holy-chord', tx, { rate: 0.7, volume: 0.9 });
  }

  /**
   * F — the ward.
   *
   * Installed as a `damageAbsorber`, which is the one hook that sees a hit *before* any shield
   * layer decides what to do with it — so the ward really does eat the whole instance however
   * large it was, and the half it hands to the patron is measured off the same number.
   */
  doProtection(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-protection'); return; }
    if (this.refused(owner, 'bind-protection')) return;
    this.ensureLayers();
    this.ensureAvatars();

    // A second cast replaces the first rather than stacking — three charges is the ability.
    this.dropWard(owner, false);
    const ward: Ward = { charges: WARD_CHARGES, prev: f.damageAbsorber };
    this.sides[owner].ward = ward;
    f.damageAbsorber = (amount: number) => {
      if (ward.charges <= 0) return false;
      ward.charges--;
      this.fx(owner).wardBlock(f.x, f.y);
      this.api.showFloatingText(f.x, f.y - 44, `✦ WARDED (${ward.charges})`, this.hex(BND.goldLit));
      Sfx.playAt('shield-block', f.x, { rate: 0.75, volume: 0.9 });
      this.addAnger(owner, amount * WARD_ANGER_SHARE, 'WARD');
      if (ward.charges <= 0) this.dropWard(owner, true);
      return true;
    };

    this.avatar(owner)?.play('flex');
    this.api.showFloatingText(f.x, f.y - 52, '✦ PROPHET\'S PROTECTION', this.hex(BND.gold));
    Sfx.playAt('incantation', f.x, { rate: 0.7, volume: 0.95 });
  }

  private dropWard(owner: Owner, announce: boolean): void {
    const s = this.sides[owner];
    const ward = s.ward;
    if (!ward) return;
    s.ward = null;
    const f = this.fighter(owner);
    if (f) f.damageAbsorber = ward.prev;
    if (!announce || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 44, '✦ WARD SPENT', this.hex(BND.goldDeep));
    Sfx.playAt('shield-break', f.x, { rate: 0.8, volume: 0.8 });
  }

  /**
   * Q — fifteen seconds of the sky being open, bought with an ability.
   *
   * The sacrifice is armed rather than taken: the player picks which of the other four dies by
   * pressing it, which makes the price a decision rather than a dice roll. A bot has nobody to
   * ask, so it gives up whichever of the four it has used least — see `takeSacrifice`.
   */
  doTreachery(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-treachery'); return; }
    if (this.refused(owner, 'bind-treachery')) return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);

    s.awakeUntil = this.now + AWAKE_MS;
    s.nextVolleyAt = this.now + 300;
    s.nextSwipeAt = this.now + 700;
    s.nextLaserAt = this.now + 200;
    s.nextBlastAt = this.now + 1200;
    // The beam and the wind-up both die on the press — the hands are not yours for fifteen seconds.
    s.firingUntil = 0;
    s.chargeStartedAt = 0;

    this.avatar(owner)?.play('raise');
    this.avatar(owner)?.setChannelling(true);
    this.fx(owner).wrath(this.eyeX, EYE_Y);
    this.fx(owner).chainDown(this.centreX, this.centreY, this.corners());
    this.api.scene.cameras.main.shake(700, 0.008);
    this.api.showFloatingText(f.x, f.y - 70, '⛓ THE GOD IS AWAKE', this.hex(BND.goldLit));
    Sfx.playAt('ghost-wail', f.x, { rate: 0.55, volume: 1 });
    Sfx.playAt('judgement', f.x, { rate: 0.7, volume: 0.85 });
    Sfx.playAt('chain', f.x, { rate: 0.5, volume: 1 });

    // Awakening: every convert this side owns comes out from under its hood at once.
    if (this.up(owner, 'q')) this.awakenCult(owner);

    // Whatever is still alive to be taken. A second ultimate cannot be bought with a limb the
    // god removed the first time.
    const left = SACRIFICE_SLOTS.filter((slot) => !s.sacrificed.includes(slot.key));
    if (!left.length) return;

    if (owner === 'player') {
      s.pendingSacrifice = true;
      s.sacrificeAskedAt = this.now;
      this.sacrificeClickArmed = false;
      this.showPrompt(left);
    } else {
      // The bot pays immediately and at random, so the ability costs it the same thing it
      // costs a player: one of the four, gone.
      const slot = left[Math.floor(Math.random() * left.length)];
      this.takeSacrifice('npc', slot.id, slot.key);
    }
  }

  private takeSacrifice(owner: Owner, abilityId: string, key: string): void {
    const s = this.side(owner);
    s.pendingSacrifice = false;
    if (!s.sacrificed.includes(key)) s.sacrificed.push(key);
    this.hidePrompt();
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    f.lockAbility(abilityId, SACRIFICE_MS);
    this.fx(owner).shardBurst(f.x, f.y, true);
    this.api.showFloatingText(f.x, f.y - 56, `⛓ ${key} TAKEN`, this.hex(BND.wrath));
    Sfx.playAt('chain', f.x, { rate: 0.6, volume: 1 });
  }

  private showPrompt(left: { id: string; key: string }[]): void {
    this.hidePrompt();
    const { width, height } = this.api.scene.scale;
    this.promptKeys = left.map((slot) => slot.key).join(' / ');
    this.promptReady = false;
    this.prompt = this.api.scene.add.text(width / 2, height - 96,
      this.promptText(false), {
        fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold',
        color: this.hex(BND.goldLit), backgroundColor: '#160a26', padding: { x: 12, y: 7 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
  }

  private promptText(ready: boolean): string {
    return ready
      ? `THE GOD TAKES A LIMB — press ${this.promptKeys} to give one up`
      : 'THE GOD TAKES A LIMB — it is deciding what to ask for…';
  }

  /** Flips the banner out of its grace wording. Called every frame; only redraws on the change. */
  private setPromptReady(ready: boolean): void {
    if (!this.prompt || ready === this.promptReady) return;
    this.promptReady = ready;
    this.prompt.setText(this.promptText(ready));
  }

  private hidePrompt(): void {
    this.prompt?.destroy();
    this.prompt = null;
    this.promptReady = false;
  }

  // ── The cult ───────────────────────────────────────────────────────────────

  /**
   * A convert, walked in from the edge of the room.
   *
   * They are not a summon in the usual sense: nothing kills them, nothing times them out, and
   * they never touch the enemy until the ultimate. What they do is *stand in the ring*, which is
   * the one job in this element nobody wants, and take a twelfth of the god's bill each while
   * they are at it. Three of them and the idol pays for itself; three of them and the anger bar
   * fills at roughly two-thirds the rate it did.
   */
  private summonCultist(owner: Owner): void {
    const f = this.fighter(owner);
    const idol = this.idols[owner];
    const seed = Math.random() * 999;
    // They arrive at the idol they are being given to, offset so they never land on each other.
    const a = Math.random() * TAU;
    const x = Phaser.Math.Clamp((idol?.x ?? f.x) + Math.cos(a) * CULT_ORBIT, this.left, this.right);
    const y = Phaser.Math.Clamp((idol?.y ?? f.y) + Math.sin(a) * CULT_ORBIT, this.top, this.bottom);
    this.cultists.push({
      owner, x, y, seed,
      awakened: false,
      nextVolleyAt: 0,
      nextDashAt: 0,
      dash: null,
    });

    this.fx(owner).cultistRise(x, y);
    this.avatar(owner)?.play('raise');
    const n = this.cultCount(owner);
    this.api.showFloatingText(f.x, f.y - 66,
      `⛓ CULTIST ${n}/${CULT_MAX} · −${Math.round(CULT_ANGER_CUT * n * 100)}% ANGER`,
      this.hex(BND.goldLit));
    Sfx.playAt('incantation', x, { rate: 0.55, volume: 0.9 });
    Sfx.playAt('chain', x, { rate: 0.9, volume: 0.55 });
  }

  /** Q+ — the hoods come off and the cursor takes over. */
  private awakenCult(owner: Owner): void {
    const cult = this.cult(owner);
    if (!cult.length) return;
    for (let i = 0; i < cult.length; i++) {
      const c = cult[i];
      c.awakened = true;
      c.dash = null;
      c.nextVolleyAt = this.now + 500 + i * 320;
      c.nextDashAt = this.now + 1400 + i * 700;
      this.fx(owner).cultistAwaken(c.x, c.y);
    }
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.api.showFloatingText(f.x, f.y - 88, '👁️ THE CULT AWAKENS', this.hex(BND.goldLit));
    }
    Sfx.playAt('holy-chord', this.eyeX, { rate: 0.5, volume: 1 });
  }

  /**
   * The end of the ultimate. There is no dismissal here and no expiry — every awakened convert
   * puts a shard of oblivion into its own chest, which is the price of having been allowed to
   * see. A cult that never woke up simply keeps standing in the ring.
   */
  private sacrificeCult(owner: Owner): void {
    for (let i = this.cultists.length - 1; i >= 0; i--) {
      const c = this.cultists[i];
      if (c.owner !== owner || !c.awakened) continue;
      this.cultists.splice(i, 1);
      this.fx(owner).cultistStab(c.x, c.y);
      Sfx.playAt('crystal-shatter', c.x, { rate: 0.55, volume: 0.7 });
    }
  }

  private updateCultists(delta: number): void {
    const dt = delta / 1000;
    for (const c of this.cultists) {
      const owner = c.owner;
      const s = this.side(owner);
      const f = this.fighter(owner);
      const idol = this.idols[owner];

      if (c.dash) {
        this.stepCultistDash(c, dt);
        continue;
      }

      // Where it is trying to be. Awakened, that is wherever the cursor is; hooded, it is the
      // faith ring — and only the summoner's own body if there is nothing to worship.
      const wander = Math.sin(this.vizT * 0.9 + c.seed) * CULT_ORBIT * 0.5;
      const wobble = Math.cos(this.vizT * 0.7 + c.seed * 1.4) * CULT_ORBIT * 0.5;
      let gx: number;
      let gy: number;
      if (c.awakened) {
        gx = s.aimX + wander;
        gy = s.aimY + wobble;
      } else if (idol) {
        // Inside the ring on purpose — a cultist standing on the rim feeds nothing.
        gx = idol.x + wander;
        gy = idol.y + wobble;
      } else {
        gx = (this.alive(f) ? f.x : c.x) + wander;
        gy = (this.alive(f) ? f.y : c.y) + wobble;
      }

      const d = Phaser.Math.Distance.Between(c.x, c.y, gx, gy);
      if (d > 4) {
        const step = Math.min(d, CULT_SPEED_PX * dt * (c.awakened ? 1.5 : 1));
        c.x += ((gx - c.x) / d) * step;
        c.y += ((gy - c.y) / d) * step;
      }
      c.x = Phaser.Math.Clamp(c.x, this.left, this.right);
      c.y = Phaser.Math.Clamp(c.y, this.top, this.bottom);

      if (!c.awakened) continue;

      const victims = this.targetsOf(owner);
      if (!victims.length) continue;

      // Three shards, thrown badly. The spread is the ability — a convert with a god's weapon
      // and none of a god's aim is a threat you have to be unlucky to walk into.
      if (this.now >= c.nextVolleyAt) {
        c.nextVolleyAt = this.now + AWK_VOLLEY_MS + Math.random() * 600;
        const v = victims[Math.floor(Math.random() * victims.length)];
        this.throwVolley(owner, v.x, v.y, AWK_SHARDS, AWK_SHARD_DAMAGE, AWK_SHARD_SPREAD, false,
          { x: c.x, y: c.y });
        Sfx.playAt('crystal-shatter', c.x, { rate: 1.25, volume: 0.45 });
      }

      // The charge. It runs *through* the target and out the far side, and the cursor pulls it
      // back afterwards on its own — there is no return leg here because there does not need
      // to be one.
      if (this.now >= c.nextDashAt) {
        c.nextDashAt = this.now + AWK_DASH_MS + Math.random() * 900;
        const v = victims[Math.floor(Math.random() * victims.length)];
        const ang = Math.atan2(v.y - c.y, v.x - c.x);
        c.dash = {
          tx: Phaser.Math.Clamp(v.x + Math.cos(ang) * AWK_DASH_OVERSHOOT, this.left, this.right),
          ty: Phaser.Math.Clamp(v.y + Math.sin(ang) * AWK_DASH_OVERSHOOT, this.top, this.bottom),
          hit: [],
          lastX: c.x,
          lastY: c.y,
        };
        Sfx.playAt('space-slash', c.x, { rate: 1.1, volume: 0.6 });
      }
    }
  }

  private stepCultistDash(c: Cultist, dt: number): void {
    const dash = c.dash;
    if (!dash) return;
    const d = Phaser.Math.Distance.Between(c.x, c.y, dash.tx, dash.ty);
    const step = Math.min(d, AWK_DASH_SPEED * dt);
    if (d > 0.5) {
      c.x += ((dash.tx - c.x) / d) * step;
      c.y += ((dash.ty - c.y) / d) * step;
    }

    // Swept, not sampled: at 780px/s a per-frame circle test would walk straight through
    // somebody standing between two frames' worth of positions.
    for (const t of this.targetsOf(c.owner)) {
      if (dash.hit.includes(t)) continue;
      if (this.distToSegment(t.x, t.y, dash.lastX, dash.lastY, c.x, c.y) > AWK_DASH_HIT_R) continue;
      dash.hit.push(t);
      this.hurt(c.owner, t, AWK_DASH_DAMAGE, false, BND.goldLit);
    }
    this.fx(c.owner).cultistDash(dash.lastX, dash.lastY, c.x, c.y);
    dash.lastX = c.x;
    dash.lastY = c.y;

    if (d <= step + 0.5) c.dash = null;
  }

  // ── The patron ─────────────────────────────────────────────────────────────

  private beginWrath(owner: Owner): void {
    const s = this.side(owner);
    if (this.turned(owner)) return;
    s.anger = 0;
    s.wrathUntil = this.now + WRATH_MS;
    // The god picks up exactly where the ultimate would have: same routine, pointed inward.
    s.nextVolleyAt = this.now + 150;
    s.nextSwipeAt = this.now + 500;
    s.nextLaserAt = this.now;
    s.nextBlastAt = this.now + 800;
    // Everything it was doing on your behalf stops immediately — including, if a starving idol
    // managed to top the bar out mid-ultimate, the ultimate. The converts still pay for having
    // been woken; the god turning around is not a refund.
    s.firingUntil = 0;
    s.chargeStartedAt = 0;
    if (s.awakeUntil) {
      s.awakeUntil = 0;
      this.avatar(owner)?.setChannelling(false);
      this.sacrificeCult(owner);
    }
    this.fx(owner).wrath(this.eyeX, EYE_Y);
    this.api.scene.cameras.main.shake(900, 0.014);
    this.api.scene.cameras.main.flash(220, 190, 40, 30);
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.api.showFloatingText(f.x, f.y - 74, '⛓⛓ THE PATRON HAS TURNED ⛓⛓', this.hex(BND.wrath));
    }
    Sfx.playAt('ghost-wail', this.eyeX, { rate: 0.45, volume: 1 });
    Sfx.playAt('nightmare', this.eyeX, { rate: 0.7, volume: 0.9 });
  }

  private updatePatron(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!this.isBind(owner) && !s.anger && !s.wrathUntil) continue;
      if (this.turned(owner)) continue;
      s.anger = Math.max(0, s.anger - ANGER_DECAY * dt);
    }
  }

  /**
   * Eviscerate winding up. The wind-up is billed by the second rather than on the release, so a
   * charge abandoned halfway still cost something — the god was already listening.
   */
  private updateCharge(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.chargeStartedAt) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.turned(owner) || this.chained(owner)) {
        s.chargeStartedAt = 0;
        continue;
      }
      this.addAnger(owner, EVIS_ANGER_RATE * dt);
    }
  }

  /**
   * The four chains, holding. Applied *after* the scene has already moved the body this frame,
   * which is the only ordering in which a movement lock actually locks anything — pushing on
   * the velocity would just fight the input for the whole fifteen seconds.
   */
  private holdChained(owner: Owner, delta: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const k = Math.min(1, delta / CHAIN_LERP_MS);
    f.x = Phaser.Math.Linear(f.x, this.centreX, k);
    f.y = Phaser.Math.Linear(f.y, this.centreY, k);
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
  }

  /**
   * The god acting. `turned` is the only difference between the ultimate and the punishment,
   * which is deliberate — the player has already seen exactly what is about to happen to them.
   */
  private runGod(owner: Owner, turned: boolean): void {
    const s = this.side(owner);
    const victims = this.godVictims(owner, turned);
    if (!victims.length) return;
    const pick = () => victims[Math.floor(Math.random() * victims.length)];

    if (this.now >= s.nextVolleyAt) {
      s.nextVolleyAt = this.now + AWAKE_VOLLEY_MS;
      const v = pick();
      this.throwVolley(owner, v.x, v.y, AWAKE_VOLLEY_SHARDS, SHARD_DAMAGE, SHARD_SPREAD * 0.7, turned);
    }

    if (this.now >= s.nextSwipeAt) {
      s.nextSwipeAt = this.now + AWAKE_SWIPE_MS;
      const v = pick();
      const ang = Math.random() * TAU;
      this.fx(owner).swipe(v.x, v.y, ang, AWAKE_SWIPE_R, turned);
      Sfx.playAt('space-slash', v.x, { rate: 0.7, volume: 0.9 });
      for (const t of victims) {
        if (Phaser.Math.Distance.Between(v.x, v.y, t.x, t.y) > AWAKE_SWIPE_R) continue;
        this.hurt(owner, t, AWAKE_SWIPE_DAMAGE, turned, BND.goldLit);
      }
    }

    if (this.now >= s.nextLaserAt) {
      s.nextLaserAt = this.now + AWAKE_LASER_MS;
      // Three eyes, three lines, each aimed a little off so they sweep across rather than stack.
      for (let i = 0; i < 3; i++) {
        const v = pick();
        const off = (i - 1) * 46 + (Math.random() - 0.5) * 40;
        const x1 = Phaser.Math.Clamp(v.x + off, this.left, this.right);
        const y1 = v.y + (Math.random() - 0.5) * 30;
        const x0 = this.eyeX + (i - 1) * 34;
        this.sprays.push({ owner, x0, y0: EYE_Y + 20, x1, y1, until: this.now + 180, turned });
        for (const t of victims) {
          if (this.distToSegment(t.x, t.y, x0, EYE_Y + 20, x1, y1) > AWAKE_LASER_HIT_R) continue;
          this.hurt(owner, t, AWAKE_LASER_DAMAGE, turned, BND.gold);
        }
      }
      Sfx.playAt('beam-fire', this.eyeX, { rate: 1.25, volume: 0.45 });
    }

    if (this.now >= s.nextBlastAt) {
      s.nextBlastAt = this.now + AWAKE_BLAST_MS;
      const v = pick();
      this.marks.push({
        owner,
        x: Phaser.Math.Clamp(v.x + (Math.random() - 0.5) * 90, this.left + 30, this.right - 30),
        y: Phaser.Math.Clamp(v.y + (Math.random() - 0.5) * 90, this.top + 30, this.bottom - 30),
        landsAt: this.now + AWAKE_BLAST_TELL_MS,
        turned,
      });
      Sfx.playAt('beam-charge', v.x, { rate: 0.5, volume: 0.7 });
    }
  }

  /** One hit from the patron. Routed through here so a turned god can never be self-inflicted. */
  private hurt(owner: Owner, victim: Fighter, amount: number, turned: boolean, flash: number): void {
    if (!this.alive(victim)) return;
    // A turned god is somebody else's weapon pointed at you, so it goes through the normal
    // damage path rather than `applySelfDamage` — shields and wards are allowed to answer it.
    Fighter.asNonAllyDamage(() => victim.takeDamage(amount));
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(turned ? BND.wrath : flash));
  }

  // ── Shards ─────────────────────────────────────────────────────────────────

  /**
   * `from` overrides where the shards leave: the god throws everything out of the eye, but an
   * awakened cultist throws its own, and a volley that fell out of the sky would read as the
   * patron's rather than as theirs.
   */
  private throwVolley(
    owner: Owner, tx: number, ty: number,
    count: number, damage: number, spread: number, turned: boolean,
    from?: { x: number; y: number },
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const d = Math.sqrt(Math.random()) * spread;
      const px = Phaser.Math.Clamp(tx + Math.cos(a) * d, this.left, this.right);
      const py = Phaser.Math.Clamp(ty + Math.sin(a) * d, this.top, this.bottom);
      // They all leave the eye, fanned across its width, so a volley reads as coming *down*.
      const ox = from ? from.x + (Math.random() - 0.5) * 16 : this.eyeX + (Math.random() - 0.5) * 150;
      const oy = from ? from.y - 8 + (Math.random() - 0.5) * 12 : EYE_Y + 14 + Math.random() * 20;
      this.shards.push({
        owner, x: ox, y: oy, tx: px, ty: py,
        ang: Math.atan2(py - oy, px - ox),
        damage,
        liveAt: this.now + i * SHARD_STAGGER_MS,
        diesAt: this.now + i * SHARD_STAGGER_MS + 2600,
        turned,
        seed: Math.random() * 999,
      });
    }
  }

  private updateShards(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i];
      if (this.now < sh.liveAt) continue;
      const d = Phaser.Math.Distance.Between(sh.x, sh.y, sh.tx, sh.ty);
      if (d <= SHARD_SPEED * dt + 4 || this.now >= sh.diesAt) {
        this.shards.splice(i, 1);
        this.burstShard(sh);
        continue;
      }
      sh.ang = Math.atan2(sh.ty - sh.y, sh.tx - sh.x);
      sh.x += Math.cos(sh.ang) * SHARD_SPEED * dt;
      sh.y += Math.sin(sh.ang) * SHARD_SPEED * dt;
    }
  }

  private burstShard(sh: Shard): void {
    this.fx(sh.owner).shardBurst(sh.tx, sh.ty, sh.turned);
    for (const t of this.godVictims(sh.owner, sh.turned)) {
      if (Phaser.Math.Distance.Between(sh.tx, sh.ty, t.x, t.y) > SHARD_BLAST_R) continue;
      this.hurt(sh.owner, t, sh.damage, sh.turned, BND.gold);
    }
  }

  // ── The beam ───────────────────────────────────────────────────────────────

  private updateBeam(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      const held = this.now < s.firingUntil && this.alive(f)
        && !this.turned(owner) && !this.chained(owner);
      // Over-rage. The heat bar stops being a limit and becomes a meter: the beam keeps its
      // hottest tick rate for as long as the button is down, and the two things it used to be
      // paid for with — the anger and the stop — are replaced by a steady 2 HP a second and an
      // anger climb that does not slow down or top out.
      const overrage = held && s.overheated && this.up(owner, 'click');
      s.overrage = overrage;
      if (overrage) {
        s.heat = 1;
        s.overrageDebt += OVERRAGE_SELF_DPS * dt;
        // Cashed in whole points so it lands as hits rather than as a per-frame trickle.
        if (s.overrageDebt >= 1) {
          const bite = Math.floor(s.overrageDebt);
          s.overrageDebt -= bite;
          f.applySelfDamage(bite);
        }
        this.addAnger(owner, OVERRAGE_ANGER_RATE * dt);
        if (this.now >= s.nextBeamTickAt) {
          s.nextBeamTickAt = this.now + BEAM_TICK_HOT_MS;
          this.beamTick(owner);
        }
        continue;
      }
      s.overrageDebt = 0;
      const firing = held && !s.overheated;

      if (firing) {
        s.heat = Math.min(1, s.heat + dt / HEAT_RISE_S);
        if (s.heat >= 1) {
          // Topped out. Twenty anger, and nothing until the last of it has bled off — unless
          // Over-rage is equipped, in which case the beam is not cut and next frame's held
          // button walks straight into the branch above with no gap in the light.
          s.overheated = true;
          if (!this.up(owner, 'click')) s.firingUntil = 0;
          this.addAnger(owner, OVERHEAT_ANGER, 'OVERHEAT');
          this.api.showFloatingText(f.x, f.y - 58, '🔥 OVERHEATED', this.hex(BND.heat));
          Sfx.playAt('error-popup', f.x, { rate: 0.7, volume: 0.9 });
          continue;
        }
        if (this.now >= s.nextBeamTickAt) {
          const gap = Phaser.Math.Linear(BEAM_TICK_COLD_MS, BEAM_TICK_HOT_MS, s.heat);
          s.nextBeamTickAt = this.now + gap;
          this.beamTick(owner);
        }
        continue;
      }

      s.heat = Math.max(0, s.heat - dt / HEAT_FALL_S);
      if (s.overheated && s.heat <= 0) {
        s.overheated = false;
        if (this.alive(f)) {
          this.api.showFloatingText(f.x, f.y - 50, '✦ COOL', this.hex(BND.gold));
          Sfx.playAt('ability-ready', f.x, { rate: 0.9, volume: 0.6 });
        }
      }
    }
  }

  private beamTick(owner: Owner): void {
    const s = this.side(owner);
    const x1 = Phaser.Math.Clamp(s.aimX, this.left, this.right);
    const y1 = Phaser.Math.Clamp(s.aimY, this.top, this.bottom);
    for (const t of this.targetsOf(owner)) {
      if (this.distToSegment(t.x, t.y, this.eyeX, EYE_Y + 22, x1, y1) > BEAM_HIT_R) continue;
      this.hurt(owner, t, BEAM_DAMAGE, false, s.heat > 0.7 ? BND.heat : BND.gold);
      this.fx(owner).scald(t.x, t.y, s.heat);
    }
    Sfx.playAt('beam-fire', x1, { rate: 0.9 + s.heat * 0.7, volume: 0.28 });
  }

  // ── The idol ───────────────────────────────────────────────────────────────

  private updateIdols(): void {
    for (const owner of BOTH) {
      const idol = this.idols[owner];
      if (!idol) continue;
      if (this.now < idol.nextTickAt) continue;
      idol.nextTickAt += IDOL_TICK_MS;

      // Faith in, faith out. Standing in the ring feeds it; step out and it burns what it stored.
      // A cultist in the ring is worth a third of a body — three of them exactly cancel the
      // drain and the idol stops needing you at all, which is the entire point of the cult.
      const f = this.fighter(owner);
      const fed = this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, idol.x, idol.y) <= IDOL_R;
      let flock = 0;
      for (const c of this.cultists) {
        if (c.owner !== owner) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, idol.x, idol.y) > IDOL_R) continue;
        flock++;
        this.fx(owner).offering(c.x, c.y);
      }
      const swing = (fed ? 1 : -1) + flock * CULT_FAITH_SHARE;
      idol.faith = Phaser.Math.Clamp(idol.faith + swing, 0, IDOL_FAITH_MAX);
      if (fed) this.fx(owner).offering(f.x, f.y);

      // A fraction of a point is neither worship nor neglect: the volleys want a whole one, and
      // the starvation bill only starts once there is nothing left in it at all.
      if (idol.faith >= 1) {
        idol.emptySince = 0;
        const turned = this.turned(owner);
        const victims = this.godVictims(owner, turned);
        if (victims.length) {
          const v = victims[Math.floor(Math.random() * victims.length)];
          this.throwVolley(owner, v.x, v.y, IDOL_VOLLEY, IDOL_SHARD_DAMAGE, SHARD_SPREAD * 0.6, turned);
        }
        continue;
      }

      // The gap. A cult too small to hold the idol drags it down in thirds rather than in whole
      // points, and it would be a lie to start billing for an empty idol that still has faith in
      // it — this band is the "drains a little slower" the cult is actually paying for.
      if (idol.faith > 0) {
        idol.emptySince = 0;
        continue;
      }

      // Empty. It starts billing, and it does not stop until it is fed or it gives up.
      if (!idol.emptySince) idol.emptySince = this.now;
      this.addAnger(owner, IDOL_STARVE_ANGER, 'STARVED IDOL');
      if (this.now - idol.emptySince < IDOL_CRUMBLE_MS) continue;
      this.idols[owner] = null;
      this.fx(owner).shardBurst(idol.x, idol.y, true);
      this.api.showFloatingText(idol.x, idol.y - 40, '⛓ IDOL CRUMBLED', this.hex(BND.wrathDeep));
      Sfx.playAt('crystal-shatter', idol.x, { rate: 0.6, volume: 0.9 });
    }
  }

  // ── Dark light ─────────────────────────────────────────────────────────────

  private updateMarks(): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i];
      if (this.now < m.landsAt) continue;
      this.marks.splice(i, 1);
      this.fx(m.owner).darkBlast(m.x, m.y, AWAKE_BLAST_R);
      this.api.scene.cameras.main.shake(260, 0.009);
      Sfx.playAt('black-hole', m.x, { rate: 0.85, volume: 0.9 });
      for (const t of this.godVictims(m.owner, m.turned)) {
        if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > AWAKE_BLAST_R) continue;
        this.hurt(m.owner, t, AWAKE_BLAST_DAMAGE, m.turned, BND.iris);
      }
    }
    for (let i = this.sprays.length - 1; i >= 0; i--) {
      if (this.now >= this.sprays[i].until) this.sprays.splice(i, 1);
    }
  }

  // ── Tithes ─────────────────────────────────────────────────────────────────

  /**
   * The permanent taxes, rewritten from scratch onto the body every frame — the Justice pattern
   * for the vulnerability, and the divide-out pattern for the outgoing multiplier, which half a
   * dozen other systems also write to.
   */
  private updateTithes(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f) continue;
      if (!this.isBind(owner)) { f.bindIncomingMult = 1; this.setOutgoing(f, 1); continue; }
      f.bindIncomingMult = TAX_VULN_STEP ** s.taxVuln;
      // Chosen Vessel rides on the same multiplier the tithe eats out of — one writer, so a
      // vessel with two debts on it still lands on exactly the number both of them agreed to.
      this.setOutgoing(f, (TAX_STEP ** s.taxWeak) * (1 + VESSEL_STEP * this.vesselHexes(owner)));
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isBind('player');
    const npcIs = this.isBind('npc');
    const anyState = this.shards.length || this.marks.length || this.sprays.length
      || this.cultists.length || this.idols.player || this.idols.npc || this.appliedOut.size;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.updatePatron(delta);
    this.updateCharge(delta);
    this.updateBeam(delta);
    this.updateIdols();
    this.updateCultists(delta);
    this.updateShards(delta);
    this.updateMarks();
    this.updateTithes();

    for (const owner of BOTH) {
      const s = this.side(owner);
      const turned = this.turned(owner);
      if (turned) {
        this.runGod(owner, true);
      } else if (this.now < s.awakeUntil) {
        this.runGod(owner, false);
        this.holdChained(owner, delta);
      } else if (s.awakeUntil) {
        s.awakeUntil = 0;
        this.avatar(owner)?.setChannelling(false);
        // The chains come off, the converts pay for what they were shown, and the bill for
        // fifteen seconds of an open sky comes due all at once: the bar goes straight to the top.
        this.sacrificeCult(owner);
        const f = this.fighter(owner);
        if (this.alive(f)) {
          this.api.showFloatingText(f.x, f.y - 82, '⛓ THE SKY CLOSES', this.hex(BND.wrath));
        }
        this.beginWrath(owner);
      }
      if (!turned && s.wrathUntil && this.now >= s.wrathUntil) {
        s.wrathUntil = 0;
        const f = this.fighter(owner);
        if (this.alive(f)) {
          this.api.showFloatingText(f.x, f.y - 60, '⛓ IT IS CALM', this.hex(BND.gold));
        }
      }
    }

    this.paintGround();
    this.paintAir();
    this.paintGod();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const owner of BOTH) {
      const idol = this.idols[owner];
      if (!idol) continue;
      const hunger = idol.faith <= 0 ? 1 : 1 - idol.faith / IDOL_FAITH_MAX;
      faithRing(g, this.col(owner), idol.x, idol.y + 18, IDOL_R, 0.9, hunger, this.vizT);
    }

    for (const m of this.marks) {
      const k = Phaser.Math.Clamp(1 - (m.landsAt - this.now) / AWAKE_BLAST_TELL_MS, 0, 1);
      darkMark(g, this.col(m.owner), m.x, m.y, AWAKE_BLAST_R, 0.95, k, this.vizT);
    }

    // The leashes. One run of chain per convert, slack while they are worshipping and pulled
    // taut the moment they are awake and taking orders — the link is the ability's whole tell.
    for (const c of this.cultists) {
      const f = this.fighter(c.owner);
      if (!this.alive(f)) continue;
      chainRun(g, this.col(c.owner), f.x, f.y + 6, c.x, c.y + 4,
        0.75, c.awakened ? 0.85 : 0.25, this.vizT, c.seed);
    }

    // The footprint the barrage is currently aimed to land in. Drawn on the floor because the
    // charge buys a *place*, and a bar over the head cannot show a place.
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.chargeStartedAt) continue;
      const k = this.chargeOf(owner);
      spreadReticle(g, this.col(owner),
        Phaser.Math.Clamp(s.aimX, this.left, this.right),
        Phaser.Math.Clamp(s.aimY, this.top, this.bottom),
        Phaser.Math.Linear(SHARD_SPREAD, EVIS_TIGHT_SPREAD, k), 0.95, k, this.vizT);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const owner of BOTH) {
      const idol = this.idols[owner];
      if (!idol) continue;
      // Floored: a cult holding an idol at 3⅓ faith must not light a fourth bead for the third.
      idolStatue(g, this.col(owner), idol.x, idol.y, 1, Math.floor(idol.faith), IDOL_FAITH_MAX, this.vizT);
    }

    // Sorted down the screen so a cultist standing behind another is drawn behind it.
    for (const c of [...this.cultists].sort((a, b) => a.y - b.y)) {
      cultistFigure(g, this.col(c.owner), c.x, c.y, 1,
        { awakened: c.awakened, t: this.vizT, seed: c.seed, lean: c.dash ? 0.6 : 0 });
    }

    for (const sh of this.shards) {
      if (this.now < sh.liveAt) continue;
      oblivionShard(g, this.col(sh.owner), sh.x, sh.y, sh.ang, 1,
        { scale: 1, eye: 1, turned: sh.turned });
    }

    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;

      // Chosen Vessel goes under the hexes, so the rungs read as coming off the ward itself.
      const hexes = this.vesselHexes(owner);
      if (hexes) vesselHalo(g, this.col(owner), f.x, f.y, hexes, 0.9, this.vizT);
      if (s.ward) hexWard(g, this.col(owner), f.x, f.y, 34, 0.9, s.ward.charges, this.vizT);
      if (s.overrage) overrageAura(g, this.col(owner), f.x, f.y, 0.95, this.vizT);
      if (s.chargeStartedAt) {
        eviscerateCharge(g, this.col(owner), f.x, f.y, this.chargeOf(owner), 0.95, this.vizT);
      }

      // The heat bar, sitting above the health bar. Only ever shown when there is heat in it.
      if (s.heat > 0.01 || s.overheated) {
        const tint = this.col(owner);
        const w = 42;
        const by = f.y - 46;
        g.fillStyle(tint(BND.void), 0.8);
        g.fillRect(f.x - w / 2 - 1, by - 1, w + 2, 6);
        g.fillStyle(tint(BND.cosmicDeep), 0.9);
        g.fillRect(f.x - w / 2, by, w, 4);
        const hot = s.overheated || s.heat > 0.75;
        g.fillStyle(tint(s.overheated ? BND.wrath : hot ? BND.heat : BND.gold),
          s.overheated ? 0.6 + 0.4 * Math.sin(this.vizT * 14) : 0.95);
        g.fillRect(f.x - w / 2, by, w * s.heat, 4);
        // A tick at the top of the scale, so "how close am I" is a position rather than a guess.
        g.fillStyle(tint(BND.wrath), 0.9);
        g.fillRect(f.x + w / 2 - 1.4, by - 1.6, 1.6, 7.2);
      }
    }
  }

  /** The patron, its bar, the beam and every spray laser — the whole top of the screen. */
  private paintGod(): void {
    const g = this.godGfx;
    if (!g) return;
    g.clear();

    // Exactly one patron is ever drawn, and the player's own outranks the opponent's: two eyes
    // hanging over the same arena would make it impossible to tell whose anger the bar belongs
    // to. When the *bot* is the one with a patron, drawing its bar is the whole tell for why it
    // is about to be attacked by its own god.
    const hudOwner: Owner | null = this.isBind('player') ? 'player'
      : this.isBind('npc') ? 'npc' : null;
    if (hudOwner) {
      const owner = hudOwner;
      const s = this.side(owner);
      const tint = this.col(owner);
      const anger = s.anger / ANGER_MAX;
      const wrath = this.turned(owner) ? 1 : 0;
      const awake = this.now < s.awakeUntil ? 1 : 0;

      cosmicVeil(g, tint, this.eyeX, EYE_Y - 6, 420, 150, 0.95, this.vizT);
      patronEye(g, tint, this.eyeX, EYE_Y, 46,
        0.28 + anger * 0.34 + awake * 0.38, 1,
        { wrath, drift: Math.sin(this.vizT * 0.7) + (wrath ? Math.sin(this.vizT * 11) : 0), t: this.vizT });

      // The anger bar, hung under the eye like a jaw.
      const w = 220;
      const by = EYE_Y + 44;
      g.fillStyle(tint(BND.void), 0.85);
      g.fillRect(this.eyeX - w / 2 - 3, by - 3, w + 6, 13);
      g.fillStyle(tint(BND.cosmicDeep), 0.95);
      g.fillRect(this.eyeX - w / 2, by, w, 7);
      const hotBar = anger > 0.7;
      g.fillStyle(tint(wrath ? BND.wrath : hotBar ? BND.heat : BND.gold),
        wrath ? 0.55 + 0.45 * Math.sin(this.vizT * 16) : 0.95);
      g.fillRect(this.eyeX - w / 2, by, w * (wrath ? 1 : anger), 7);
      g.lineStyle(1.4, tint(BND.goldDeep), 0.9);
      g.strokeRect(this.eyeX - w / 2, by, w, 7);
      // Quarter ticks, so 75 anger is a place rather than a number.
      for (let i = 1; i < 4; i++) {
        g.fillStyle(tint(BND.goldDeep), 0.8);
        g.fillRect(this.eyeX - w / 2 + (w * i) / 4, by, 1.2, 7);
      }

      // Chains hanging off the bar — the one place the element's own motif touches the HUD.
      for (let i = 0; i < 5; i++) {
        const cx = this.eyeX - w / 2 + (w * (i + 0.5)) / 5;
        const swing = Math.sin(this.vizT * 1.7 + i) * (2 + anger * 5);
        for (let k = 0; k < 3; k++) {
          chainLink(g, tint, cx + swing * (k + 1) * 0.35, by + 14 + k * 8,
            Math.PI / 2, 0.75, 0.9, anger);
        }
      }
    }

    // ── The binding ──
    // Four chains out of the corners of the room, holding the summoner in the middle of it for
    // as long as the sky is open. Drawn over everything, because it is the reason nothing else
    // in the kit is going to answer.
    for (const owner of BOTH) {
      if (!this.chained(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      arenaBinding(g, this.col(owner), f.x, f.y, this.corners(), 0.9, 0.92, this.vizT);
    }

    // ── The beam ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.now >= s.firingUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const x1 = Phaser.Math.Clamp(s.aimX, this.left, this.right);
      const y1 = Phaser.Math.Clamp(s.aimY, this.top, this.bottom);
      godBeam(g, this.col(owner), this.eyeX, EYE_Y + 22, x1, y1, 1, s.heat, this.vizT);
    }

    // ── Spray lasers ──
    for (const sp of this.sprays) {
      const a = Phaser.Math.Clamp((sp.until - this.now) / 180, 0, 1);
      const tint = this.col(sp.owner);
      g.lineStyle(9, tint(BND.cosmic), a * 0.25);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.lineStyle(3.4, tint(sp.turned ? BND.wrath : BND.gold), a * 0.9);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.lineStyle(1.2, tint(BND.goldLit), a);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.fillStyle(tint(sp.turned ? BND.wrath : BND.goldLit), a * 0.6);
      g.fillCircle(sp.x1, sp.y1, 9 * a + 2);
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
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setStrain(this.turned(owner) ? 1 : s.anger / ANGER_MAX);
      av.setChannelling(this.now < s.awakeUntil || this.now < s.firingUntil || this.turned(owner));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('bind-anger', playerIs ? {
      name: 'Patron', emoji: '👁️', color: s.anger > 70 ? BND.wrath : BND.gold, priority: 149,
      description: `How much of the god's patience you have spent. Overheating the beam costs 20, a starved idol costs 5 a second, and the ward hands over half of everything it eats. It falls at ${ANGER_DECAY} a second — and at ${ANGER_MAX} the god spends five seconds using this kit on you.`,
      count: Math.round(s.anger), suffix: `/${ANGER_MAX}`,
    } : null);

    this.api.setStatusIndicator('bind-wrath', playerIs && this.turned('player') ? {
      name: 'Forsaken', emoji: '⛓️', color: BND.wrath, priority: 1,
      description: 'The patron has turned. Every attack it normally makes on your behalf is being made on you instead, and nothing in the kit will answer until it calms down.',
      until: s.wrathUntil,
    } : null);

    this.api.setStatusIndicator('bind-ward', playerIs && s.ward ? {
      name: "Prophet's Protection", emoji: '✦', color: BND.goldLit, priority: 130,
      description: 'Hexes standing around you. The next instances of damage are eaten whole, however large — and half of everything they swallow goes to the patron as anger.',
      count: s.ward.charges,
    } : null);

    this.api.setStatusIndicator('bind-awake', playerIs && this.now < s.awakeUntil ? {
      name: 'God of Treachery', emoji: '🌌', color: BND.iris, priority: 131,
      description: 'The sky is open. Shard volleys, claw swipes, laser sprays and beams of dark light, all of them free — but four chains out of the corners of the arena have you pinned in the middle of it, you cannot cast a thing while it runs, and the moment it closes the patron\'s anger is at the top of the bar.',
      until: s.awakeUntil,
    } : null);

    const cult = this.cultCount('player');
    this.api.setStatusIndicator('bind-cult', playerIs && cult > 0 ? {
      name: 'Cult of the Broken God', emoji: '🕯️', color: BND.goldLit, priority: 132,
      description: `${cult} convert${cult > 1 ? 's' : ''} chained to you. Anger comes ${Math.round(CULT_ANGER_CUT * cult * 100)}% cheaper and you move ${Math.round(CULT_SPEED * cult * 100)}% faster, and each one standing inside a faith ring pays a third of what the idol costs — three of them and it never needs you again.`,
      count: cult, suffix: `/${CULT_MAX}`,
    } : null);

    const hexes = this.vesselHexes('player');
    this.api.setStatusIndicator('bind-vessel', playerIs && hexes > 0 ? {
      name: 'Chosen Vessel', emoji: '✨', color: BND.gold, priority: 133,
      description: `The hexes are not only armour. ${Math.round(VESSEL_STEP * hexes * 100)}% more speed and ${Math.round(VESSEL_STEP * hexes * 100)}% more damage while ${hexes} of them still stand — and it drops a rung with every hit they eat.`,
      count: hexes,
    } : null);

    this.api.setStatusIndicator('bind-overrage', playerIs && s.overrage ? {
      name: 'Over-rage', emoji: '🔥', color: BND.wrath, priority: 5,
      description: `The beam is being held past the point the patron said stop. It keeps its fastest tick rate for as long as the button is down, and it costs ${OVERRAGE_SELF_DPS} HP and ${OVERRAGE_ANGER_RATE} anger every second you keep it there.`,
    } : null);

    const taxes = s.taxSpeed + s.taxVuln + s.taxWeak;
    this.api.setStatusIndicator('bind-tithe', playerIs && (taxes > 0 || s.sacrificed.length) ? {
      name: 'Tithe', emoji: '⛓️', color: BND.wrathDeep, priority: 4,
      description: `What the god has already taken: ${s.taxSpeed} × speed, ${s.taxVuln} × vulnerability, ${s.taxWeak} × damage${s.sacrificed.length ? `, and your ${s.sacrificed.join(' and ')} slot${s.sacrificed.length > 1 ? 's' : ''}` : ''}. None of it comes back.`,
      count: taxes,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** The barrage's speed tithe. Pulled by ArenaScene rather than pushed onto the body. */
  getPlayerSpeedMult(): number {
    return this.speedMult('player');
  }

  getNpcSpeedMult(): number {
    return this.speedMult('npc');
  }

  private speedMult(owner: Owner): number {
    if (!this.isBind(owner)) return 1;
    // The tithe takes, the cult and the hexes give back. All three are read from here so the
    // pulled multiplier is the only place any of them exists.
    return (TAX_STEP ** this.side(owner).taxSpeed)
      * (1 + CULT_SPEED * this.cultCount(owner))
      * (1 + VESSEL_STEP * this.vesselHexes(owner));
  }

  /** 0–100. The bot's whole decision surface. */
  angerOf(owner: Owner): number {
    return Math.round(this.side(owner).anger);
  }

  /** True while the patron is pointed at that side — nothing it presses will answer. */
  isForsaken(owner: Owner): boolean {
    return this.turned(owner);
  }

  /** True while the corner chains have that side pinned to the middle of the room. */
  isChained(owner: Owner): boolean {
    return this.chained(owner);
  }

  /**
   * Converts standing, 0–3 — or **-1** when that side has no Cult of the Broken God at all, which
   * is what the bot reads to tell "R still has somebody to convert" apart from "R only ever
   * moves the idol". Without the distinction it would relocate a perfectly good idol every
   * twenty seconds for a cultist it was never going to get.
   */
  cultSize(owner: Owner): number {
    if (!this.up(owner, 'r')) return -1;
    return this.cultCount(owner);
  }

  /** 0–1. The bot lets go before it tops out, which is the whole skill in the click. */
  heatOf(owner: Owner): number {
    return this.side(owner).heat;
  }

  isOverheated(owner: Owner): boolean {
    return this.side(owner).overheated;
  }

  /** Faith left in that side's idol, or -1 when it has none standing. */
  idolFaith(owner: Owner): number {
    const idol = this.idols[owner];
    return idol ? idol.faith : -1;
  }

  wardCharges(owner: Owner): number {
    return this.side(owner).ward?.charges ?? 0;
  }
}
