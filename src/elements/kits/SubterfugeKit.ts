import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import type { CustomStatus } from './StatusHudKit';
import {
  ArmGesture, SUB, SubAuraStyle, SubColorFn, SubterfugeAura, SubterfugeAvatar, SubterfugeFx,
  banknoteLayered, smokeBank, stiletto,
} from './SubterfugeVisuals';
import {
  CrewType, MoneyIcon, drawBomb, drawBomber, drawCrew, drawCrewRank, drawDropMarker, drawFlare,
  drawGrenade, drawHelicopter, drawMoneyBag, drawMoneyButton, drawSelectRing, drawStrikeZone,
} from './SubterfugeCrewVisuals';
import { RIDE_BY_TIER, RIDE_SPECS, SubterfugeRides } from './SubterfugeRide';
import { RideKind, drawHijackCharge } from './SubterfugeRideVisuals';
import { FONT_DISPLAY } from '../../ui/Theme';
import { meterGain } from '../../combat/Meters';

// ── Arena API ────────────────────────────────────────────────────────────────

export interface SubterfugeArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get scene(): Phaser.Scene;
  get pointer(): Phaser.Input.Pointer;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** Space — climbs in and out of a Hijack ride. */
  get spaceKey(): Phaser.Input.Keyboard.Key;
  /** WASD as an axis pair: x = right minus left, y = down minus up. Steers a Hijack ride. */
  moveAxis(): { x: number; y: number };
  /** Everyone the local player's attacks can reach (the opponent, or every husk in Invasion). */
  get enemies(): Fighter[];
  /**
   * The tray's visible cards, in order, with the ability each one currently carries. The money
   * bars sit on top of these, so a card a mastery ability has taken over simply has none.
   */
  cardRects(): Array<{ abilityId: string; x: number; y: number; w: number; h: number }>;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get nukeChanneling(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get sceneWidth(): number;
  get sceneHeight(): number;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamage(owner: 'player' | 'npc', cx: number, cy: number, radius: number, damage: number): void;
  // ── Dark Treachery routing ──
  /** Cast the given element's Q through the owner's regular CastContext. Returns false if the element has no ultimate. */
  castForeignQ(elementId: string, owner: 'player' | 'npc'): boolean;
  earthBiomeBuilder(owner: 'player' | 'npc'): void;
  oilTrain(owner: 'player' | 'npc'): void;
  iceFrozenSolidNoFrost(owner: 'player' | 'npc', tx: number, ty: number): void;
  timeAlwaysNoonForced(owner: 'player' | 'npc'): void;
  lightSupernova(owner: 'player' | 'npc'): void;
  echoEclipseDirect(owner: 'player' | 'npc'): void;
  magicNecronomicon(owner: 'player' | 'npc'): void;
  crystalClonePositions(owner: 'player' | 'npc'): Array<{ x: number; y: number }>;
  // ── Mastery ──
  /** The local player is running Subterfuge with Element Mastery enabled. */
  get masteryActive(): boolean;
  /** Online only: the opponent is running Subterfuge with Element Mastery enabled. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  recordMasteryBestStat(key: string, value: number): void;
  getMasteryStat(key: string): number;
  /** Every registered element id — the denominator for "steal 10 different ultimates". */
  allElementIds(): string[];
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Owner's skin applied to one Subterfuge palette value. */
  subterfugeColor(owner: 'player' | 'npc', base: number): number;
}

// ── Internal types ───────────────────────────────────────────────────────────

// ── Sonic Boom (perk) — the crack a recalled blade leaves where it launched from ──
const BOOM_RADIUS = 96;
const BOOM_DAMAGE = 10;
const BOOM_KNOCKBACK = 420;
const BOOM_KNOCK_MS = 160;
const BOOM_STAGGER_MS = 240;
const BOOM_DRAW_MS = 420;

interface SubDagger {
  owner: 'player' | 'npc';
  color: 'red' | 'black';
  x: number;
  y: number;
  destX: number;
  destY: number;
  dirX: number;
  dirY: number;
  state: 'flying' | 'planted' | 'returning';
  hitSet: Set<Fighter>;
  /** Sonic Boom perk: where this blade was standing when the recall pulled it. */
  recallFromX?: number;
  recallFromY?: number;
  /** Sonic Boom perk: set once this blade's one boom has gone off. */
  boomed?: boolean;
}

/**
 * Who can be on the payroll. R hires a Thug; the Rolodex (R+) adds the three specialists.
 * 'bard' is a fifth, and only exists when the Moral perk (divine) is equipped.
 */
type RecruitType = CrewType | 'bard';

interface Lackey {
  /**
   * Payroll number, handed out by the machine that owns the hire and carried in every online
   * message about him. The two sims lose men at different moments, so a position in the crew
   * list means nothing across the wire; this does.
   */
  nid: number;
  owner: 'player' | 'npc';
  type: RecruitType;
  x: number;
  y: number;
  /** Which way it is looking — drives the gun hands and the eyes. */
  facing: number;
  /** 0–3. Every bribe under F+ is one promotion. */
  level: number;
  loyaltyMs: number;
  loyaltyMaxMs: number;
  bullets: number;
  reloadingUntil: number;
  nextShotAt: number;
  lastShotAt: number;
  ignited: boolean;
  /** Seat index in the owner's Hijack ride, or -1 when standing on the floor. */
  seat: number;
  /** Hanging off a helicopter hook: nothing shoots, nothing drains, nothing moves it but the hook. */
  lifted: boolean;
  /** Medic: currently patching its boss up. */
  healing: boolean;
  healAccumMs: number;
  /** When this hire's level-3 favour can be bought again. */
  favourReadyAt: number;
  // ── Bard scratch ──
  wanderX: number;
  wanderY: number;
}

/** A thug's Active Reload grenade (level 2), lobbed while the drum is out. */
interface Grenade {
  owner: 'player' | 'npc';
  sx: number; sy: number;
  tx: number; ty: number;
  bornAt: number;
}

/** The Enforcer's helicopter (level 3): flies in, hooks one recruit, sets them down elsewhere. */
interface HeliLift {
  owner: 'player' | 'npc';
  crew: Lackey;
  x: number; y: number;
  destX: number; destY: number;
  phase: 'inbound' | 'carry' | 'leave';
  angle: number;
}

/** The Sniper's air strike (level 3): a flare, five seconds, then the bombs. */
interface AirStrike {
  owner: 'player' | 'npc';
  flareX: number; flareY: number;
  calledAt: number;
  /** Filled in the moment the plane arrives; empty until then. */
  bombs: Array<{ x: number; y: number; dropAt: number; done: boolean }>;
  planeFrom: { x: number; y: number };
  planeTo: { x: number; y: number };
}

/** F+ — Laundering: a bag of money that pays out if you stay out of trouble. */
interface StashBag {
  owner: 'player' | 'npc';
  bornAt: number;
  damageTaken: number;
}

/** A clickable money bar, rebuilt every frame: where it is, what it costs, what it does. */
interface MoneyButton {
  id: string;
  x: number; y: number; w: number; h: number;
  cost: number;
  icon: MoneyIcon;
  /** -1 idle, else 0–1 of something running down. */
  progress: number;
  /** Greyed out for a reason other than the price. */
  blocked?: boolean;
  open?: boolean;
  act: () => void;
}

interface DiscoBall {
  owner: 'player' | 'npc';
  x: number;
  y: number;
  endsAt: number;
  nextShotAt: number;
}

/** Mastery — Smoke Break: the lit cigarette one side is currently nursing. */
interface Cigarette {
  owner: 'player' | 'npc';
  /** Burn time left in ms — drains in real time and loses a whole second per hit taken. */
  msLeft: number;
  smokeAccumMs: number;
}

/** Mastery — Smoke Break: the cloud a flicked cigarette leaves behind. */
interface SmokeCloud {
  owner: 'player' | 'npc';
  x: number;
  y: number;
  radius: number;
  endsAt: number;
  /** Per-puff drift so the blob roils instead of sitting as a flat disc. */
  puffs: Array<{ ox: number; oy: number; r: number; phase: number; speed: number }>;
  wispAccumMs: number;
}

/** Preserved Atom-Nhilego state (see note at the nhilego section below). */
interface NhilegoShadow {
  bornAt: number;
  x: number;
  y: number;
  radius: number;
  fireAt: number;
  owner: 'player' | 'npc';
}

// ── Constants ────────────────────────────────────────────────────────────────

const MONEY_MAX = 3;
const MONEY_MAX_MASTERY = 4;  // Mastery passive: Big Pockets
const MONEY_START = 2;
const MONEY_TICK_MS = 5000;

const DAGGER_SPEED = 1350;
const DAGGER_THROW_DMG = 8;
const DAGGER_RETURN_DMG = 18;
const DAGGER_MAX = 3;
const DAGGER_ARRIVE_R = 14;
const DAGGER_FILL: Record<'red' | 'black', number> = { red: 0xdd2233, black: 0x1a1a1a };
/** The hand has to come back before it can throw again. */
const DAGGER_GAP_MS = 380;
/** Calling the set home leaves you empty-handed for most of a second. */
const DAGGER_RECALL_LOCK_MS = 850;

// ── Click+ Full Set ─────────────────────────────────────────────────────────
const FIVE_DAGGER_MAX = 5;
const FIVE_COST = 2;
const FIVE_MS = 10000;

const SPRAY_CONE_HALF = Phaser.Math.DegToRad(7.5); // 15° total cone
const SPRAY_DMG = 2;
const SPRAY_INTERVAL_MS = 80;
const SPRAY_RANGE = 520;
const BULLETS_MAX = 50;
const BULLETS_START = 25;
const BULLETS_RELOAD = 25;
const AMMO_PER_10_DMG = 3;

// E+ Steady Hands: sustained fire walks the cone down to nothing over 8s; a gap
// of half a second in the trigger loses the whole sight picture.
const SPRAY_FOCUS_FULL_MS = 8000;
const SPRAY_FOCUS_GAP_MS = 450;

// ── E+ Luxury Rounds ────────────────────────────────────────────────────────
const LUX_COST = 2;
const LUX_ROUNDS = 35;
const LUX_DMG = 3;

// ── Recruits (R) ────────────────────────────────────────────────────────────
const CREW_MAX = 3;
const CREW_LOYALTY_MS = 40000;
const LACKEY_BRIBE_BONUS = 1.2; // bribe refills to 120% of base
const LACKEY_PROJ_HIT_LOSS_MS = 2000;
const LACKEY_IGNITE_EXTRA_PER_SEC = 2000; // Soul copy: +2s loyalty lost per second
const CREW_SPAWN_REACH = 46;
const CREW_SEAT_RANGE = 96;     // hired this close to your ride, they climb straight in
const CREW_MAX_LEVEL = 3;

const RECRUIT_COST: Record<RecruitType, number> = { thug: 1, enforcer: 2, sniper: 2, medic: 2, bard: 1 };
const RECRUIT_LOYALTY_MS: Record<RecruitType, number> = {
  thug: CREW_LOYALTY_MS, enforcer: CREW_LOYALTY_MS, sniper: CREW_LOYALTY_MS, medic: CREW_LOYALTY_MS, bard: 12000,
};
const RECRUIT_ICON: Record<RecruitType, MoneyIcon> = {
  thug: 'crew', enforcer: 'enforcer', sniper: 'sniper', medic: 'medic', bard: 'bard',
};
/** The specialists the Rolodex (R+) puts on its money bar. */
const ROLODEX: RecruitType[] = ['enforcer', 'sniper', 'medic'];

// Thug — a Tommy gun and nowhere to be.
const THUG_DMG = 1;
const THUG_MAG = 25;
const THUG_MAG_L3 = 40;               // Suppressing Fire
const THUG_RELOAD_MS = 5000;
const THUG_INTERVAL = 140;
const THUG_INTERVAL_L1 = 100;         // More Gun
const THUG_CONE_HALF_L1 = Phaser.Math.DegToRad(3.5);
const THUG_RANGE = 560;
const GRENADE_FLIGHT_MS = 750;        // Active Reload
const GRENADE_RADIUS = 72;
const GRENADE_DMG = 10;
const SUPPRESS_MS = 2000;             // Suppressing Fire: the target takes more from everyone
const SUPPRESS_MULT = 1.15;
const THUG_RELOAD_COST = 1;

// Enforcer — a shotgun and a shield.
const ENF_PELLETS = 5;
const ENF_PELLET_DMG = 2;
const ENF_PELLET_DMG_L3 = 3;          // Protector
const ENF_INTERVAL = 900;
const ENF_INTERVAL_L1 = 600;          // Pump Action
const ENF_MAG = 5;
const ENF_RELOAD_MS = 4000;
const ENF_RANGE = 230;
const ENF_RANGE_L2 = 330;             // Juggernaut
const ENF_DRAIN_L2 = 0.75;
const ENF_CONE_HALF = Phaser.Math.DegToRad(11);
const ENF_COVER_RADIUS = 165;         // Protector: his shield covers the men beside him
const HELI_COST = 1;
const HELI_SPEED = 520;
const HELI_CD_MS = 4000;

// Sniper — one round, a long way, not often.
const SNIPER_DMG = 14;
const SNIPER_DMG_L1 = 18;             // High Caliber
const SNIPER_TRUE_DMG_L1 = 4;
const SNIPER_DMG_L3 = 24;             // Bounty Hunter
const SNIPER_HEADSHOT_CHANCE = 0.25;
const SNIPER_HEADSHOT_MULT = 2;
const SNIPER_INTERVAL = 3500;
const SNIPER_INTERVAL_L2 = 2400;      // Professional
const SNIPER_RANGE = 1400;
const STRIKE_COST = 1;
const STRIKE_DELAY_MS = 5000;
const STRIKE_BOMBS = 10;
const STRIKE_BOMB_DMG = 14;
const STRIKE_BOMB_RADIUS = 62;
const STRIKE_FALL_MS = 520;
const STRIKE_STAGGER_MS = 110;
const STRIKE_PLANE_MS = 1500;
const STRIKE_SPREAD_ONE = 175;        // one dagger: still mostly guesswork
const STRIKE_SPREAD_LINE = 26;
const STRIKE_SPREAD_AREA = 14;
const STRIKE_CD_MS = 8000;

// Medic — a pistol he would rather not use.
const MEDIC_DMG = 1;
const MEDIC_DMG_L1 = 2;               // More Supplies
const MEDIC_INTERVAL = 900;
const MEDIC_RANGE = 420;
const MEDIC_HEAL_PER_S = 2;
const MEDIC_HEAL_PER_S_L1 = 3;
const MEDIC_RADIUS = 150;
const MEDIC_DRAIN = 0.85;
const MEDIC_DRAIN_L2 = 0.7;           // Triage
const MEDIC_TRIAGE_BONUS = 1.5;       // up to +150% healing at death's door
const MEDIC_SPEED_L3 = 1.2;           // Savior
const SAVIOR_COST = 2;
const SAVIOR_MS = 5000;

// ── Moral perk (divine) ─────────────────────────────────────────────────────
/** Every hire is signed on for a quarter longer. */
const MORAL_LOYALTY_MULT = 1.25;
/** What a Bard on the payroll does to everyone else's loyalty drain. */
const BARD_DRAIN_MULT = 0.25;
const BARD_SPEED = 240;

// ── F+ Laundering ───────────────────────────────────────────────────────────
const STASH_COST = 1;
const STASH_PAYOUT = 2;
const STASH_MS = 3000;
/** Take this much while the bag is out and the deal is off. */
const STASH_FAIL_DMG = 50;

// ── Q+ On Retainer ──────────────────────────────────────────────────────────
const RETAINER_MS = 8000;
const RETAINER_COST = 2;

// ── Mastery: Hijack ─────────────────────────────────────────────────────────
const HIJACK_COOLDOWN_MS = 15000;
/** Hold time at which each tier is reached: car, motorcycle, sports car, tank. */
const HIJACK_TIER_MS = [0, 450, 950, 1500];

// ── Money bars ──────────────────────────────────────────────────────────────
const BAR_H = 16;
const BAR_GAP = 4;
const HEAD_BTN_W = 30;
const HEAD_BTN_H = 14;

const BRIBE_MS = 8000;
const BRIBE_DMG_MULT = 0.75; // bribed enemy deals 25% less

const TREACHERY_DELAY_MS = 2000;

const DISCO_MS = 12000;
const DISCO_SHOT_INTERVAL = 3000;
const DISCO_DMG = 10;

const LINK_MS = 5000;                 // Life copy: lackey damage-link duration
const LINK_LOYALTY_MS_PER_DMG = 150;  // each split damage point costs a lackey 0.15s loyalty

// ── Mastery: Smoke Break ────────────────────────────────────────────────────
const SMOKE_COOLDOWN_MS = 20000;
const CIG_BURN_MS = 25000;
const CIG_HIT_COST_MS = 1000;         // every hit taken burns a second off the cigarette
const CIG_DAMAGE_MULT = 0.75;
const SMOKE_CLOUD_MS = 8000;
const SMOKE_CLOUD_RADIUS = 132;
const SMOKE_TOSS_SPEED = 900;
const SMOKE_EXPOSE_MS = 3000;         // attacking from inside the cloud gives you away
const SMOKE_LOYALTY_DRAIN_MULT = 0.4; // recruits in the cloud hold on far longer
const SMOKE_PUFF_COUNT = 11;
const SMOKE_DEPTH_OWN = 6;            // your own cloud sits under the fighters — a thin haze
const SMOKE_DEPTH_ENEMY = 24;         // theirs sits over everything and blinds you

const OVERCHARGE_MS = 5000;           // Electricity copy
const ACID_RAIN_MS = 8000;            // Acid copy: whole screen, ¼ damage (6 dmg/0.5s → 1.5)
const ACID_RAIN_TICK_MS = 500;
const ACID_RAIN_TICK_DMG = 1.5;

// ── Kit ──────────────────────────────────────────────────────────────────────

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'sub-cutter': 'punch',
  'sub-spray': 'punch',
  'sub-recruit': 'clap',
  'sub-bribe': 'sweep',
  'sub-treachery': 'raise',
};

/** Depths for the kit's shared paint layers. */
const D_GROUND = 3;    // scorches, cloud shadows, nhilego marks
const D_RIDE = 4;      // Hijack bodywork and the laundering bag — under the fighters
const D_WORLD = 7;     // recruits, planted daggers, disco balls
const D_AIR = 11;      // daggers in flight, orbiters, cigarettes

export class SubterfugeKit {
  private api: SubterfugeArenaApi;

  // ── Visuals ──────────────────────────────────────────────────────────────
  // One colour mapper and one effect painter per side, because the two fighters can have
  // different skins equipped.
  private readonly pcol: SubColorFn;
  private readonly ncol: SubColorFn;
  private readonly pfx: SubterfugeFx;
  private readonly nfx: SubterfugeFx;
  private playerAvatar: SubterfugeAvatar | null = null;
  private npcAvatar: SubterfugeAvatar | null = null;
  private auras = new Map<string, SubterfugeAura>();
  /** Shared per-frame paint layers, one per depth band. Rebuilt lazily after a reset. */
  private layers = new Map<number, Phaser.GameObjects.Graphics>();

  // ── Money ────────────────────────────────────────────────────────────────
  private money = MONEY_START;
  private npcMoney = MONEY_START;
  private moneyAccumMs = 0;
  private npcMoneyAccumMs = 0;

  // ── Molecular Cutter daggers (Click — unchanged since the Quantum-era kit) ─
  private playerDaggers: SubDagger[] = [];
  private npcDaggers: SubDagger[] = [];
  private npcDaggerNextThrowAt = 0;
  private pointerWasDown = false;
  /** When each side's hand is free to throw again (the gap between blades, and the recall lock). */
  private daggerNextAt = { player: 0, npc: 0 };
  /** How long the current wait was, so the Click card can draw it as a bar. */
  private daggerWaitMs = { player: DAGGER_GAP_MS, npc: DAGGER_GAP_MS };
  /** Click+ Full Set: five blades instead of three until this passes. */
  private fiveUntil = { player: 0, npc: 0 };
  /** Sonic Boom perk: shockwaves currently drawing themselves out. */
  private booms: Array<{ x: number; y: number; owner: 'player' | 'npc'; bornAt: number }> = [];

  // ── Spray (E) ────────────────────────────────────────────────────────────
  private bullets = BULLETS_START;
  private npcBullets = BULLETS_START;
  private nextSprayShotAt = 0;
  private sprayHeld = false;
  private sprayDmgAccum = 0;
  private npcSprayDmgAccum = 0;
  private bulletCounterText: Phaser.GameObjects.Text | null = null;
  /** Over-head tags behind the ammo counter and the retainer label, repainted per frame. */
  private tagGfx: Phaser.GameObjects.Graphics | null = null;
  private lastSprayShotAt = 0;
  private npcLastSprayShotAt = 0;
  private sprayFocusMs = 0;             // E+ Steady Hands
  private npcSprayFocusMs = 0;
  /** E+ Luxury Rounds: bought separately, fired first, never missed with. */
  private lux = { player: 0, npc: 0 };

  // ── Lackeys (R) ──────────────────────────────────────────────────────────
  private lackeys: Lackey[] = [];
  /** Last payroll number issued on this machine (see `Lackey.nid`). */
  private crewSeq = 0;

  /** R+ The Rolodex: the specialist fan above the R card is open. */
  private rolodexOpen = false;
  private grenades: Grenade[] = [];
  private heliLifts: HeliLift[] = [];
  private strikes: AirStrike[] = [];
  /** Suppressing Fire: who is currently taking extra damage, and until when. */
  private suppressed = new Map<Fighter, number>();
  /** Savior: bought invincibility. `on` records that the flag on the fighter is ours to clear. */
  private saviorUntil = { player: 0, npc: 0 };
  private saviorOn = { player: false, npc: false };
  /** Enforcer helicopter targeting: first click picks a recruit, second picks where he lands. */
  private heliAim: { enforcer: Lackey; crew: Lackey | null } | null = null;

  // ── Laundering (F+) ──────────────────────────────────────────────────────
  private stashes: StashBag[] = [];

  // ── Money bars ───────────────────────────────────────────────────────────
  private buttons: MoneyButton[] = [];
  private hudGfx: Phaser.GameObjects.Graphics | null = null;

  // ── Mastery: Hijack ──────────────────────────────────────────────────────
  private readonly rides: SubterfugeRides;
  private hijackLastAt = -HIJACK_COOLDOWN_MS;
  /** When the Hijack key went down, or 0 when it is not being held. */
  private hijackChargeAt = 0;

  // Shoves and staggers (Sonic Boom, a rammed car): this codebase's earthStunnedUntil is inert,
  // so — like FateKit and GunpowderKit — they are enforced here by driving velocity.
  private playerStunUntil = 0;
  private npcStunUntil = 0;
  private knocks = new Map<Fighter, { vx: number; vy: number; until: number }>();

  // ── Bribe (F) ────────────────────────────────────────────────────────────
  private npcBribedUntil = 0;      // player bribed the npc
  private playerBribedUntil = 0;   // npc bribed the player
  private npcCensorBar: Phaser.GameObjects.Rectangle | null = null;
  private playerCensorBar: Phaser.GameObjects.Rectangle | null = null;

  // ── Dark Treachery (Q) ───────────────────────────────────────────────────
  private treacheryFiresAt = 0;        // player channel
  private npcTreacheryFiresAt = 0;     // npc channel
  private treacheryFogNextAt = 0;
  private npcTreacheryFogNextAt = 0;

  // Q+ On Retainer — the contract stays open for 8s after a resolve
  private retainerElementId: string | null = null;
  private retainerUntil = 0;
  private npcRetainerElementId: string | null = null;
  private npcRetainerUntil = 0;
  private npcRetainerNextTryAt = 0;

  // Copied-Q states
  private discoBalls: DiscoBall[] = [];
  private linkUntil = 0;               // Life copy (player)
  private npcLinkUntil = 0;
  private overchargeUntil = 0;         // Electricity copy (player)
  private npcOverchargeUntil = 0;
  private acidRainUntil = 0;           // Acid copy (player-owned rain)
  private npcAcidRainUntil = 0;
  private acidRainTickAccum = 0;
  private npcAcidRainTickAccum = 0;
  private acidRainDmgAccum = 0;
  private npcAcidRainDmgAccum = 0;
  private acidRainDropAccum = 0;

  // ── Mastery: Smoke Break ─────────────────────────────────────────────────
  // Absolute timestamps against scene.time.now, so they start at -COOLDOWN: the kit's
  // very first match runs the constructor and not reset(), and a plain 0 would lock the
  // ability out for the first 20 seconds of it.
  private smokeLastCastAt = -SMOKE_COOLDOWN_MS;
  private cigarettes: Cigarette[] = [];
  private smokeClouds: SmokeCloud[] = [];
  /** Flicked cigarette in flight, before it lands and blooms into a cloud. */
  private smokeTosses: Array<{ owner: 'player' | 'npc'; x: number; y: number; destX: number; destY: number }> = [];
  /** Attacking from cover gives you away — invisibility is suppressed until this passes. */
  private smokeExposedUntil = { player: 0, npc: 0 };
  /** Whether *we* are the ones currently hiding this fighter, so we only ever unhide our own. */
  private smokeHidden = { player: false, npc: false };
  private smokeStatusShown = false;

  // ── Atom-Nhilego (preserved from the Quantum-era kit — NOT bound to any input.
  //    Kept intact per request: it will return as a new ability soon. Call
  //    doPlayerAtomNhilego()/doNpcAtomNhilego() to activate. ────────────────
  private playerNhilegoActive = false;
  private playerNhilegoRadius = 70;
  private playerNhilegoSuccessCount = 0;
  private playerNhilegoShadow: NhilegoShadow | null = null;
  private npcNhilegoActive = false;
  private npcNhilegoRadius = 70;
  private npcNhilegoSuccessCount = 0;
  private npcNhilegoShadow: NhilegoShadow | null = null;

  constructor(api: SubterfugeArenaApi) {
    this.api = api;
    // Built here, not as field initialisers, so they see the injected api.
    this.pcol = (base) => api.subterfugeColor('player', base);
    this.ncol = (base) => api.subterfugeColor('npc', base);
    this.pfx = new SubterfugeFx(api.scene, this.pcol);
    this.nfx = new SubterfugeFx(api.scene, this.ncol);
    this.rides = new SubterfugeRides({
      get scene() { return api.scene; },
      get projectiles() { return api.projectiles; },
      get width() { return api.sceneWidth; },
      get height() { return api.sceneHeight; },
      fighter: (owner) => (owner === 'player' ? api.player : api.npc),
      foes: (owner) => this._foes(owner),
      col: (owner) => this.col(owner),
      fx: (owner) => this.fx(owner),
      moveAxis: () => api.moveAxis(),
      pointer: () => ({ x: api.pointer.worldX, y: api.pointer.worldY }),
      dealAoe: (owner, x, y, r, d) => api.dealAoeDamage(owner, x, y, r, d),
      spawnHitFlash: (x, y, c) => api.spawnHitFlash(x, y, c),
      knock: (f, vx, vy, ms) => this.knocks.set(f, { vx, vy, until: api.scene.time.now + ms }),
      authoritative: (owner) => !this._ghost(owner),
      onRideGone: (owner) => { for (const l of this.lackeys) if (l.owner === owner) l.seat = -1; },
      onPlayerRideDestroyed: () => api.broadcastMasteryCast('subx-ride-boom'),
      restoreAbsorber: (owner) => this._rearmAbsorbers(owner),
    });
  }

  // ── Visual helpers ───────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): SubterfugeFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): SubColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Subterfuge. */
  private avatarFor(owner: 'player' | 'npc'): SubterfugeAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Fire one arm gesture on the rig of whichever side cast. */
  private gesture(owner: 'player' | 'npc', abilityId: string, angle?: number): void {
    const g = CAST_GESTURES[abilityId];
    if (g) this.avatarFor(owner)?.play(g, angle);
  }

  /** A shared paint layer at one depth. Cleared and repainted every frame by paintWorld. */
  private layer(depth: number): Phaser.GameObjects.Graphics {
    let g = this.layers.get(depth);
    if (!g || !g.active) {
      g = this.api.scene.add.graphics().setDepth(depth);
      this.layers.set(depth, g);
    }
    return g;
  }

  /**
   * A persistent aura on one fighter, keyed by id. Built on first use and torn down by
   * `dropAura` — a scene restart kills the Graphics, so both rebuild lazily.
   */
  private aura(id: string, style: SubAuraStyle, tint: SubColorFn, radius: number, depth: number): SubterfugeAura {
    let a = this.auras.get(id);
    if (!a) {
      a = new SubterfugeAura(this.api.scene, tint, style, radius, depth);
      this.auras.set(id, a);
    }
    return a;
  }

  private dropAura(id: string): void {
    const a = this.auras.get(id);
    if (!a) return;
    a.destroy();
    this.auras.delete(id);
  }

  /** Destroy every GameObject the visuals own. Called from reset(); update() rebuilds. */
  private teardownVisuals(): void {
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const a of this.auras.values()) a.destroy();
    this.auras.clear();
    for (const g of this.layers.values()) g.destroy();
    this.layers.clear();
    if (this.hudGfx?.active) this.hudGfx.destroy();
    this.hudGfx = null;
  }

  // ── Public getters (NPC AI / ArenaScene) ─────────────────────────────────

  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: 'player' | 'npc'): string | null {
    const have = owner === 'player' ? this.money : this.npcMoney;
    const take = Math.ceil(have * 0.4);
    if (take <= 0) return null;
    if (owner === 'player') this.money -= take; else this.npcMoney -= take;
    return `−$${take}`;
  }

  getNpcMoney(): number { return this.npcMoney; }
  getNpcBullets(): number { return this.npcBullets; }
  getNpcLackeyCount(): number { return this.lackeys.filter(l => l.owner === 'npc').length; }
  getPlayerMoney(): number { return this.money; }

  // ── Reset ────────────────────────────────────────────────────────────────

  reset(): void {
    this.money = MONEY_START;
    this.npcMoney = MONEY_START;
    this.moneyAccumMs = 0;
    this.npcMoneyAccumMs = 0;

    this.playerDaggers = [];
    this.npcDaggers = [];
    this.npcDaggerNextThrowAt = 0;
    this.pointerWasDown = false;
    this.daggerNextAt = { player: 0, npc: 0 };
    this.daggerWaitMs = { player: DAGGER_GAP_MS, npc: DAGGER_GAP_MS };
    this.fiveUntil = { player: 0, npc: 0 };
    this.booms = [];

    this.bullets = BULLETS_START;
    this.npcBullets = BULLETS_START;
    this.nextSprayShotAt = 0;
    this.sprayHeld = false;
    this.sprayDmgAccum = 0;
    this.npcSprayDmgAccum = 0;
    this.lastSprayShotAt = 0;
    this.npcLastSprayShotAt = 0;
    this.sprayFocusMs = 0;
    this.npcSprayFocusMs = 0;
    this.lux = { player: 0, npc: 0 };
    if (this.bulletCounterText?.active) this.bulletCounterText.destroy();
    this.bulletCounterText = null;
    if (this.tagGfx?.active) this.tagGfx.destroy();
    this.tagGfx = null;

    this.lackeys = [];
    this.crewSeq = 0;
    this.rolodexOpen = false;
    this.grenades = [];
    this.heliLifts = [];
    this.strikes = [];
    for (const f of this.suppressed.keys()) f.bribeIncomingMult = 1;
    this.suppressed.clear();
    for (const owner of ['player', 'npc'] as const) {
      if (this.saviorOn[owner]) (owner === 'player' ? this.api.player : this.api.npc).isInvincible = false;
    }
    this.saviorUntil = { player: 0, npc: 0 };
    this.saviorOn = { player: false, npc: false };
    this.api.setStatusIndicator('sub-savior', null);
    this.heliAim = null;
    this.stashes = [];
    this.buttons = [];
    this.rides.reset();
    this.hijackLastAt = -HIJACK_COOLDOWN_MS;
    this.hijackChargeAt = 0;
    this.npcBrainNextAt = 0;
    this.playerStunUntil = 0;
    this.npcStunUntil = 0;
    this.knocks.clear();

    this.npcBribedUntil = 0;
    this.playerBribedUntil = 0;
    this.api.player.bribeIncomingMult = 1;
    this.api.npc.bribeIncomingMult = 1;

    this.treacheryFiresAt = 0;
    this.npcTreacheryFiresAt = 0;
    this.treacheryFogNextAt = 0;
    this.npcTreacheryFogNextAt = 0;
    this.retainerElementId = null;
    this.retainerUntil = 0;
    this.npcRetainerElementId = null;
    this.npcRetainerUntil = 0;
    this.npcRetainerNextTryAt = 0;

    this.discoBalls = [];
    this.linkUntil = 0;
    this.npcLinkUntil = 0;
    this.overchargeUntil = 0;
    this.npcOverchargeUntil = 0;
    this.acidRainUntil = 0;
    this.npcAcidRainUntil = 0;
    this.acidRainTickAccum = 0;
    this.npcAcidRainTickAccum = 0;
    this.acidRainDmgAccum = 0;
    this.npcAcidRainDmgAccum = 0;
    this.acidRainDropAccum = 0;

    this.smokeLastCastAt = -SMOKE_COOLDOWN_MS;
    this.cigarettes = [];
    this.smokeClouds = [];
    this.smokeTosses = [];
    this.smokeExposedUntil = { player: 0, npc: 0 };
    this.smokeHidden = { player: false, npc: false };
    this.api.player.smokeIncomingMult = 1;
    this.api.npc.smokeIncomingMult = 1;
    if (this.smokeStatusShown) {
      this.api.setStatusIndicator('smoke-break', null);
      this.smokeStatusShown = false;
    }

    this.playerNhilegoActive = false;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    this.playerNhilegoShadow = null;
    this.npcNhilegoActive = false;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    this.npcNhilegoShadow = null;

    this.teardownVisuals();
  }

  // ── Upgrades ─────────────────────────────────────────────────────────────

  /** True if the given side (player/npc, Subterfuge) has the shop upgrade `slot`. */
  private _up(owner: 'player' | 'npc', slot: string): boolean {
    return owner === 'player'
      ? this.api.elementId === 'subterfuge' && this.api.hasUpgrade(slot)
      : this.api.hasNpcUpgrade(slot);
  }

  /** The magazine. E+ used to widen it; it only steadies the aim now. */
  private _bulletsMax(_owner: 'player' | 'npc'): number {
    return BULLETS_MAX;
  }

  /** An online replica: its owner's machine decides what it bought and what it took. */
  private _ghost(owner: 'player' | 'npc'): boolean {
    return owner === 'npc' && !!this.api.npc.netGhost;
  }

  /** Everyone this side's attacks can land on. */
  private _foes(owner: 'player' | 'npc'): Fighter[] {
    return owner === 'player' ? this.api.enemies : this.api.player.bodies();
  }

  /** The nearest living foe to a point, or null. */
  private _nearestFoe(owner: 'player' | 'npc', x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const f of this._foes(owner)) {
      if (!f.active || f.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(x, y, f.x, f.y);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  }

  private _money(owner: 'player' | 'npc'): number {
    return owner === 'player' ? this.money : this.npcMoney;
  }

  /** Can this side pay? A replica always can — its owner already did. */
  private _canPay(owner: 'player' | 'npc', cost: number): boolean {
    return this._ghost(owner) || this._money(owner) >= cost;
  }

  private _pay(owner: 'player' | 'npc', cost: number): void {
    if (!this._ghost(owner)) this._spendMoney(owner, cost);
  }

  // ── Input (player only) ──────────────────────────────────────────────────

  handleInput(time: number, _delta: number, pointer: Phaser.Input.Pointer): void {
    const { api } = this;
    if (api.elementId !== 'subterfuge') return;
    if (api.nukeChanneling) return;

    const { player } = api;

    // ── Space: in and out of a Hijack ride ───────────────────────────────
    if (this.claimsSpace() && Phaser.Input.Keyboard.JustDown(api.spaceKey) && this.rides.toggle('player')) {
      api.broadcastMasteryCast(this.rides.isRiding('player') ? 'subx-ride-in' : 'subx-ride-out');
      this.heliAim = null;
      this.rolodexOpen = false;
      this.hijackChargeAt = 0;
    }
    const riding = this.rides.isRiding('player');

    // ── A press goes to a money bar first, then to helicopter targeting ──
    // Whatever takes it here, it never also becomes a dagger.
    const pressed = pointer.isDown && !this.pointerWasDown;
    this.pointerWasDown = pointer.isDown;
    let clickFree = pressed;
    if (pressed && this._clickButtons(pointer.worldX, pointer.worldY)) {
      clickFree = false;
    } else if (pressed && this.heliAim) {
      this._clickHeliAim(pointer.worldX, pointer.worldY);
      clickFree = false;
    } else if (pressed) {
      this.rolodexOpen = false;
    }

    // ── Mastery: Hijack / Smoke Break take over whichever slot they are bound to ──
    const hijackSlot = this._bindSlot('hijack');
    if (hijackSlot) this._hijackInput(time, this._keyOf(hijackSlot), pointer);
    const smokeSlot = this._bindSlot('smoke-break');
    if (smokeSlot && !riding && Phaser.Input.Keyboard.JustDown(this._keyOf(smokeSlot))) {
      this._trySmokeBreak(time, pointer.worldX, pointer.worldY);
    }
    const bound = (slot: string): boolean => hijackSlot === slot || smokeSlot === slot;

    // ── E: Spray — hold to fire; press with nothing loaded to buy a reload ──
    // The one thing you can still do from the driver's seat.
    if (!bound('e')) {
      const loaded = this.bullets + this.lux.player;
      if (Phaser.Input.Keyboard.JustDown(api.eKey) && loaded <= 0 && player.getCooldownRatio('sub-spray') >= 1
          && this.money >= 1) {
        this._spendMoney('player', 1);
        this.bullets = Math.min(this._bulletsMax('player'), BULLETS_RELOAD);
        player.startCooldown('sub-spray');
      }
      if (api.eKey.isDown && this.bullets + this.lux.player > 0) {
        if (!this.sprayHeld && player.getCooldownRatio('sub-spray') < 1) {
          // still cooling down from the previous burst
        } else {
          this.sprayHeld = true;
          if (time >= this.nextSprayShotAt) {
            this.nextSprayShotAt = time + SPRAY_INTERVAL_MS;
            this._fireSprayShot('player', pointer.worldX, pointer.worldY);
          }
        }
      } else if (this.sprayHeld) {
        this.sprayHeld = false;
        player.startCooldown('sub-spray');
      }
    }

    if (riding) {
      // The tank's gun is the only other thing a driver has: a click fires it.
      if (clickFree && this.rides.fireCannon('player', pointer.worldX, pointer.worldY, time)) {
        api.broadcastMasteryCast('subx-shell');
      }
      return;
    }

    // ── R: Recruit — a Thug, standing where you stand ────────────────────
    if (!bound('r') && Phaser.Input.Keyboard.JustDown(api.rKey) && player.getCooldownRatio('sub-recruit') >= 1) {
      if (this._tryHire('player', 'thug', pointer.worldX, pointer.worldY)) player.startCooldown('sub-recruit');
    }

    // ── F: Bribe ─────────────────────────────────────────────────────────
    if (!bound('f') && Phaser.Input.Keyboard.JustDown(api.fKey)
        && player.getCooldownRatio('sub-bribe') >= 1 && this.money >= 1) {
      if (this._doBribe('player', pointer.worldX, pointer.worldY, time)) {
        this._spendMoney('player', 1);
        player.startCooldown('sub-bribe');
      }
    }

    // ── Q: Dark Treachery — or a retainer recast while the contract is open ──
    if (!bound('q') && Phaser.Input.Keyboard.JustDown(api.qKey) && this.treacheryFiresAt === 0) {
      if (this.retainerElementId && time < this.retainerUntil) {
        if (this._buyRetainer('player')) api.broadcastMasteryCast('subx-retainer');
      } else if (player.getCooldownRatio('sub-treachery') >= 1) {
        player.startCooldown('sub-treachery');
        this.treacheryFiresAt = time + TREACHERY_DELAY_MS;
        this.treacheryFogNextAt = time;
      }
    }

    // ── Click: Molecular Cutter — throw, or recall once the max are out ──
    if (clickFree) this._playerClickDaggers(pointer.worldX, pointer.worldY);
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { api } = this;
    const dt = delta / 1000;
    const isPlayerSub = api.elementId === 'subterfuge';
    const isNpcSub = api.npcElementId === 'subterfuge';

    if (isPlayerSub) {
      this._tickMoney('player', delta);
      this._renderBulletCounter(time);
      this._tickTreacheryChannel('player', time);
      this._tickRetainerWindow(time);
      this._buildButtons(time);
    } else {
      this.buttons = [];
    }
    if (isNpcSub) {
      this._tickMoney('npc', delta);
      this._tickTreacheryChannel('npc', time);
      this._tickNpcRetainer(time);
      this._tickNpcBrain(time);
    }

    this._updateSmokeBreak(time, delta, dt);

    this._updateDaggers(this.playerDaggers, 'player', dt);
    this._updateDaggers(this.npcDaggers, 'npc', dt);
    this._updateBooms(time);
    this._updateLackeys(time, delta);
    this._updateGrenades(time);
    this._updateHeli(dt);
    this._updateStrikes(time);
    this._updateSavior(time);
    this._updateStashes(time);
    // Rides before the shoves: a car steers its driver by velocity, and a stagger has to win.
    this.rides.update(time, delta);
    this._updateStunsAndKnocks(time);
    this._updateSuppression(time);
    this._updateBribes(time);
    this._updateDiscoBalls(time);
    this._updateOvercharge(time);
    this._updateAcidRain(time, delta);
    this._updateLinks(time);

    if (this.playerNhilegoActive) this._tickNhilego(time, 'player');
    if (this.npcNhilegoActive) this._tickNhilego(time, 'npc');

    // Everything the kit owns is repainted from scratch here, after the sim has moved it.
    this._paintWorld(time, isPlayerSub, isNpcSub);
    this._paintHud(time, isPlayerSub);
    this._updateAuras(delta, time);
    this._updateAvatars(delta, isPlayerSub, isNpcSub);
  }

  // ── Painting ───────────────────────────────────────────────────────────────
  //
  // Every world object this kit owns is plain data, drawn per frame into three shared Graphics
  // layers. That is what lets a recruit turn to face what it is shooting, a dagger quiver where
  // it landed and a cigarette visibly burn down — none of which a static sprite can do.

  private _paintWorld(time: number, isPlayerSub: boolean, isNpcSub: boolean): void {
    const t = time / 1000;
    const ground = this.layer(D_GROUND);
    const world = this.layer(D_WORLD);
    const air = this.layer(D_AIR);
    ground.clear();
    world.clear();
    air.clear();

    const under = this.layer(D_RIDE);
    under.clear();

    this._paintNhilego(ground, t);
    this._paintSmokeClouds(time);
    this.rides.paintUnder(under, time);
    this._paintStashes(under, time);
    this.rides.paintOver(world, time);
    this._paintRecruits(world, t);
    this._paintDaggers(world, air, t);
    this._paintOps(ground, air, time);
    this._paintBooms(air, time);
    this._paintDisco(air, t);
    this._paintCigarettes(air, t);
    this._paintMoney(air, time, isPlayerSub, isNpcSub);
  }

  /** The bag of money each launderer has sitting behind them, and how its three seconds are going. */
  private _paintStashes(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const b of this.stashes) {
      const p = this._stashPos(b.owner);
      drawMoneyBag(g, this.col(b.owner), p.x, p.y, time / 1000,
        Phaser.Math.Clamp((time - b.bornAt) / STASH_MS, 0, 1),
        Phaser.Math.Clamp(b.damageTaken / STASH_FAIL_DMG, 0, 1), 1);
    }
  }

  /** Grenades in the air, the helicopter, the air strike and a bought halo. */
  private _paintOps(ground: Phaser.GameObjects.Graphics, air: Phaser.GameObjects.Graphics, time: number): void {
    const t = time / 1000;
    for (const n of this.grenades) {
      const k = Phaser.Math.Clamp((time - n.bornAt) / GRENADE_FLIGHT_MS, 0, 1);
      drawGrenade(air, this.col(n.owner), Phaser.Math.Linear(n.sx, n.tx, k), Phaser.Math.Linear(n.sy, n.ty, k),
        Math.sin(k * Math.PI) * 70, t, 1);
    }
    for (const s of this.strikes) {
      const tint = this.col(s.owner);
      if (s.bombs.length === 0) {
        // Inbound: the flare climbing, and red on every blade the plane will aim by.
        const k = Phaser.Math.Clamp((time - s.calledAt) / STRIKE_DELAY_MS, 0, 1);
        drawFlare(air, tint, s.flareX, s.flareY, Math.min(1, k * 2.5), t, 1);
        drawStrikeZone(ground, tint, this._plantedDaggers(s.owner).map((d) => ({ x: d.x, y: d.y })),
          STRIKE_SPREAD_ONE, this.api.sceneWidth, this.api.sceneHeight, k, t, 1);
        continue;
      }
      for (const b of s.bombs) {
        if (b.done || time < b.dropAt) continue;
        drawBomb(air, tint, b.x, b.y, STRIKE_BOMB_RADIUS, Phaser.Math.Clamp((time - b.dropAt) / STRIKE_FALL_MS, 0, 1), t, 1);
      }
      const k = (time - (s.calledAt + STRIKE_DELAY_MS)) / STRIKE_PLANE_MS;
      if (k >= 0 && k <= 1) {
        drawBomber(air, tint, Phaser.Math.Linear(s.planeFrom.x, s.planeTo.x, k), Phaser.Math.Linear(s.planeFrom.y, s.planeTo.y, k),
          Math.atan2(s.planeTo.y - s.planeFrom.y, s.planeTo.x - s.planeFrom.x), t, 1);
      }
    }
    for (const h of this.heliLifts) {
      drawHelicopter(air, this.col(h.owner), h.x, h.y, h.angle, t, 1, h.phase === 'carry');
    }
    // Savior: a gold halo that closes in as the five seconds run out.
    for (const owner of ['player', 'npc'] as const) {
      if (!this.saviorOn[owner]) continue;
      const f = owner === 'player' ? this.api.player : this.api.npc;
      const left = Phaser.Math.Clamp((this.saviorUntil[owner] - time) / SAVIOR_MS, 0, 1);
      const tint = this.col(owner);
      air.lineStyle(3, tint(SUB.gold), 0.55 + 0.25 * Math.sin(t * 9));
      air.strokeCircle(f.x, f.y, 24 + 8 * left);
      air.lineStyle(1.4, tint(SUB.paper), 0.7);
      air.beginPath();
      air.arc(f.x, f.y, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, false);
      air.strokePath();
    }
  }

  private _paintNhilego(g: Phaser.GameObjects.Graphics, t: number): void {
    const now = this.api.scene.time.now;
    for (const s of [this.playerNhilegoShadow, this.npcNhilegoShadow]) {
      if (!s) continue;
      const charge = Phaser.Math.Clamp(1 - (s.fireAt - now) / 3000, 0, 1);
      SubterfugeFx.drawNhilego(g, this.col(s.owner), s.x, s.y, s.radius, charge, t, 1);
    }
  }

  /**
   * Every live cloud. A cloud you laid down is a thin haze *under* the fighters; the enemy's is
   * a solid bank *over* everything — the same object doing opposite jobs, which is why the two
   * go into different depth layers rather than differing only by alpha.
   */
  private _paintSmokeClouds(time: number): void {
    const own = this.layer(SMOKE_DEPTH_OWN);
    const theirs = this.layer(SMOKE_DEPTH_ENEMY);
    own.clear();
    theirs.clear();
    const t = time / 1000;
    for (const c of this.smokeClouds) {
      const mine = c.owner === 'player';
      const age = SMOKE_CLOUD_MS - (c.endsAt - time);
      // Bloom out over the first 400ms, thin away over the last second.
      const grow = Phaser.Math.Clamp(age / 400, 0.35, 1);
      const fade = Phaser.Math.Clamp((c.endsAt - time) / 1000, 0, 1);
      const g = mine ? own : theirs;
      SubterfugeFx.drawSmokeCloud(g, this.col(c.owner), c.x, c.y, c.radius * grow, t, mine, fade,
        c.puffs.map((p) => ({ ...p, r: p.r * grow, speed: p.speed * 1000 })));
      if (!mine) continue;
      // Your own cover is thin enough to see through, so it gets a rim: without it you cannot
      // tell where the cloud stops hiding you.
      g.lineStyle(2, this.pcol(SUB.paperShade), 0.28 * fade);
      g.strokeCircle(c.x, c.y, c.radius * grow);
    }
  }

  private _paintRecruits(g: Phaser.GameObjects.Graphics, t: number): void {
    const now = this.api.scene.time.now;
    for (const l of this.lackeys) {
      const tint = this.col(l.owner);
      if (l.type === 'bard') {
        SubterfugeFx.drawRecruit(g, tint, l.x, l.y, l.facing, 13, t, 1, {
          type: 'bard', inverted: false, reloading: false, ignited: l.ignited, enemy: l.owner === 'npc',
        });
      } else {
        // What each one reaches: the Medic's care and a Protector's cover are both worth
        // standing inside, so both get a faint ring on the floor.
        if (l.type === 'medic' && !l.lifted) {
          g.lineStyle(1, tint(SUB.moneyGreen), 0.16);
          g.strokeCircle(l.x, l.y, MEDIC_RADIUS);
          if (l.healing) {
            const boss = l.owner === 'player' ? this.api.player : this.api.npc;
            g.lineStyle(2, tint(SUB.moneyGreen), 0.4 + 0.2 * Math.sin(t * 8));
            g.lineBetween(l.x, l.y, boss.x, boss.y);
          }
        } else if (l.type === 'enforcer' && l.level >= 3 && !l.lifted) {
          g.lineStyle(1, tint(SUB.haze), 0.2);
          g.strokeCircle(l.x, l.y, ENF_COVER_RADIUS);
        }
        // A sniper spends most of his time working the bolt.
        const cycling = l.type === 'sniper' && now < l.nextShotAt - 500;
        drawCrew(g, tint, l.x, l.y, l.facing, t, 1, {
          type: l.type, level: l.level,
          reloading: l.reloadingUntil > now || cycling,
          ignited: l.ignited,
          enemy: l.owner === 'npc',
          firedAgoMs: now - l.lastShotAt,
          shielded: this._crewShielded(l),
          healing: l.healing,
          seated: l.seat >= 0,
        });
      }
      drawCrewRank(g, tint, l.x, l.y - 35, l.level, t, 1);
      // Loyalty as a banknote laid over the head: the paper is what is left of his pay, the
      // torn-off grey end is what has run out, and the seal turns red in the last quarter.
      const ratio = Phaser.Math.Clamp(l.loyaltyMs / l.loyaltyMaxMs, 0, 1);
      const c = this.col(l.owner);
      const bx = l.x - 17, by = l.y - 27;
      g.fillStyle(c(SUB.ink), 0.55);
      g.fillRect(bx + 1, by + 1.5, 34, 7);
      g.fillStyle(c(SUB.slate), 0.85);
      g.fillRect(bx, by, 34, 7);
      if (ratio > 0) {
        const fw = 34 * ratio;
        g.fillStyle(c(SUB.paper), 0.97);
        g.fillRect(bx, by, fw, 7);
        g.fillStyle(c(SUB.moneyGreen), 0.35);
        g.fillRect(bx + 1, by + 1, Math.max(0, fw - 2), 5);
        g.lineStyle(0.8, c(SUB.olive), 0.7);
        g.strokeRect(bx + 1.5, by + 1.5, Math.max(0, fw - 3), 4);
        if (fw > 10) {
          g.fillStyle(c(ratio < 0.25 ? SUB.crimson : SUB.gold), 1);
          g.fillCircle(bx + Math.min(fw - 4, 17), by + 3.5, 2);
        }
      }
      g.lineStyle(1, c(SUB.ink), 0.9);
      g.strokeRect(bx, by, 34, 7);
    }
  }

  private _paintDaggers(
    world: Phaser.GameObjects.Graphics, air: Phaser.GameObjects.Graphics, t: number,
  ): void {
    for (const list of [this.playerDaggers, this.npcDaggers]) {
      for (const d of list) {
        // A planted dagger is scenery on the floor; one in the air is over everything.
        const g = d.state === 'planted' ? world : air;
        SubterfugeFx.drawDagger(g, this.col(d.owner), d.x, d.y, Math.atan2(d.dirY, d.dirX),
          d.state, d.color === 'red' ? SUB.blood : SUB.ink, t, 1);
      }
    }
  }

  private _paintDisco(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const b of this.discoBalls) SubterfugeFx.drawDisco(g, this.col(b.owner), b.x, b.y, t, 1);
  }

  private _paintCigarettes(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const c of this.cigarettes) {
      const f = c.owner === 'player' ? this.api.player : this.api.npc;
      if (!f.active) continue;
      // Held at the corner of the mouth, bobbing with the idle sway.
      SubterfugeFx.drawCigarette(g, this.col(c.owner), f.x + 13, f.y - 3 + Math.sin(t * 3) * 1.2,
        f.facingAngle, c.msLeft / CIG_BURN_MS, t, 1);
    }
    // Flicked cigarettes, still in the air.
    for (const s of this.smokeTosses) {
      const ang = Math.atan2(s.destY - s.y, s.destX - s.x) + t * 14;
      SubterfugeFx.drawCigarette(g, this.col(s.owner), s.x, s.y, ang, 0.6, t, 1);
    }
  }

  /**
   * The wallet, drawn over each Subterfuge fighter's head as a row of notes rather than as a
   * row of emoji: spent slots stay as a faint outline, so what you *had* is as readable as what
   * you have left. Big Pockets widens the row to four.
   */
  private _paintMoney(
    g: Phaser.GameObjects.Graphics, time: number, isPlayerSub: boolean, isNpcSub: boolean,
  ): void {
    const t = time / 1000;
    const row = (owner: 'player' | 'npc'): void => {
      const f = owner === 'player' ? this.api.player : this.api.npc;
      if (!f?.active || f.hp <= 0) return;
      const amount = owner === 'player' ? this.money : this.npcMoney;
      const cap = this._moneyMax(owner);
      const tint = this.col(owner);
      // An open leather billfold the notes sit in: dark hide, a stitched seam and a gold clip.
      const ww = cap * 17 + 8;
      g.fillStyle(tint(SUB.ink), 0.4);
      g.fillRoundedRect(f.x - ww / 2 + 1, f.y - 50, ww, 14, 4);
      g.fillStyle(tint(SUB.wine), 0.85);
      g.fillRoundedRect(f.x - ww / 2, f.y - 51.5, ww, 14, 4);
      g.fillStyle(tint(SUB.paperShade), 0.45);
      for (let sx = f.x - ww / 2 + 4; sx < f.x + ww / 2 - 4; sx += 4) g.fillRect(sx, f.y - 39.5, 2, 0.8);
      g.fillStyle(tint(SUB.gold), 0.95);
      g.fillRect(f.x - 2, f.y - 53, 4, 4);
      for (let i = 0; i < cap; i++) {
        const x = f.x + (i - (cap - 1) / 2) * 17;
        const y = f.y - 44 + Math.sin(t * 2.4 + i * 0.7) * 1.4;
        if (i < amount) {
          banknoteLayered(g, tint, x, y, Math.sin(t * 1.6 + i) * 0.12, 15, 5.2, 0.95, 0.1, SUB.gold);
        } else {
          // An empty slot: the note-shaped hole it left.
          g.lineStyle(1, tint(SUB.slate), 0.5);
          g.strokeRect(x - 7.5, y - 5.2, 15, 10.4);
        }
      }
    };
    if (isPlayerSub) row('player');
    if (isNpcSub) row('npc');
  }

  // ── Auras + rig ────────────────────────────────────────────────────────────

  /**
   * The persistent tells. Every one is keyed and dropped the frame its condition lapses, so
   * several can stack into one silhouette without leaking Graphics.
   */
  private _updateAuras(delta: number, time: number): void {
    const live = new Set<string>();
    const run = (id: string, style: SubAuraStyle, f: Fighter, tint: SubColorFn,
      radius: number, depth: number, intensity: number, angle: number): void => {
      if (!f?.active || f.hp <= 0) return;
      live.add(id);
      const a = this.aura(id, style, tint, radius, depth);
      a.setIntensity(intensity);
      a.setAngle(angle);
      a.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
    };

    // Bribes ride on whoever was bought off, in the colours of whoever paid.
    if (time < this.npcBribedUntil) {
      run('npc-bribed', 'bribed', this.api.npc, this.pcol, 26, 13,
        (this.npcBribedUntil - time) / BRIBE_MS, 0);
    }
    if (time < this.playerBribedUntil) {
      run('player-bribed', 'bribed', this.api.player, this.ncol, 26, 13,
        (this.playerBribedUntil - time) / BRIBE_MS, 0);
    }
    if (time < this.overchargeUntil) {
      run('player-overcharge', 'overcharge', this.api.player, this.pcol, 30, 6,
        (this.overchargeUntil - time) / OVERCHARGE_MS, 0);
    }
    if (time < this.npcOverchargeUntil) {
      run('npc-overcharge', 'overcharge', this.api.npc, this.ncol, 30, 6,
        (this.npcOverchargeUntil - time) / OVERCHARGE_MS, 0);
    }
    if (this.retainerElementId && time < this.retainerUntil) {
      run('player-retainer', 'retainer', this.api.player, this.pcol, 24, 13,
        (this.retainerUntil - time) / RETAINER_MS, 0);
    }
    if (this.npcRetainerElementId && time < this.npcRetainerUntil) {
      run('npc-retainer', 'retainer', this.api.npc, this.ncol, 24, 13,
        (this.npcRetainerUntil - time) / RETAINER_MS, 0);
    }
    if (time < this.playerStunUntil) {
      run('player-stunned', 'stunned', this.api.player, this.ncol, 22, 13, 1, 0);
    }
    if (time < this.npcStunUntil) {
      run('npc-stunned', 'stunned', this.api.npc, this.pcol, 22, 13, 1, 0);
    }
    // Cover: only ever shown for your own cloud, because the enemy's hides them from you.
    if (this.smokeHidden.player && this._inOwnSmoke('player', this.api.player.x, this.api.player.y)) {
      run('player-covered', 'covered', this.api.player, this.pcol, 28, SMOKE_DEPTH_OWN + 1, 1, 0);
    }
    for (const l of this.lackeys) {
      if (!l.ignited) continue;
      // A burning hire gets its flames from the painter; this is the heat haze under it.
      live.add(`lackey-${l.owner}-${l.x.toFixed(0)}`);
    }

    for (const id of [...this.auras.keys()]) if (!live.has(id)) this.dropAura(id);
  }

  /** Drive the rig for whichever sides are playing Subterfuge. Built lazily; torn down otherwise. */
  private _updateAvatars(delta: number, isPlayerSub: boolean, isNpcSub: boolean): void {
    const { player, npc, scene } = this.api;
    const now = scene.time.now;

    if (isPlayerSub && player?.active && player.hp > 0) {
      if (!this.playerAvatar) this.playerAvatar = new SubterfugeAvatar(scene, this.pcol, 'player');
      const av = this.playerAvatar;
      const p = this.api.pointer;
      av.setFacing(Math.atan2(p.worldY - player.y, p.worldX - player.x));
      av.setMastered(this.api.masteryActive);
      av.setWallet(this.money / this._moneyMax('player'));
      const cig = this._cigaretteOf('player');
      av.setCigarette(cig ? cig.msLeft / CIG_BURN_MS : -1);
      // A live Q channel visibly swells the rig, so "mid-deal" reads off the character alone.
      av.setIntensity(this.treacheryFiresAt > now ? 1.35 : 1);
      av.setHold(this.hijackChargeAt > 0 ? 'brace' : this.sprayHeld ? 'spray' : null,
        Math.atan2(p.worldY - player.y, p.worldX - player.x));
      av.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcSub && npc?.active && npc.hp > 0) {
      if (!this.npcAvatar) this.npcAvatar = new SubterfugeAvatar(scene, this.ncol, 'npc');
      const av = this.npcAvatar;
      const aim = Math.atan2(player.y - npc.y, player.x - npc.x);
      av.setFacing(aim);
      av.setMastered(this.api.npcMasteryActive);
      av.setWallet(this.npcMoney / this._moneyMax('npc'));
      const cig = this._cigaretteOf('npc');
      av.setCigarette(cig ? cig.msLeft / CIG_BURN_MS : -1);
      av.setIntensity(this.npcTreacheryFiresAt > now ? 1.35 : 1);
      av.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Money ────────────────────────────────────────────────────────────────

  /** Wallet size — Mastery's Big Pockets passive widens it from 3 to 4. */
  private _moneyMax(owner: 'player' | 'npc'): number {
    const mastered = owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
    return mastered ? MONEY_MAX_MASTERY : MONEY_MAX;
  }

  private _tickMoney(owner: 'player' | 'npc', delta: number): void {
    const cap = this._moneyMax(owner);
    // Ruin's Combo Breaker halves every meter in the game. This one fills on a clock rather
    // than on an amount, so what is halved is how fast the clock runs.
    delta = meterGain(owner === 'player' ? this.api.player : this.api.npc, delta);
    if (owner === 'player') {
      if (this.money >= cap) { this.moneyAccumMs = 0; return; }
      this.moneyAccumMs += delta;
      if (this.moneyAccumMs >= MONEY_TICK_MS) {
        this.moneyAccumMs -= MONEY_TICK_MS;
        this.money = Math.min(cap, this.money + 1);
      }
    } else {
      if (this.npcMoney >= cap) { this.npcMoneyAccumMs = 0; return; }
      this.npcMoneyAccumMs += delta;
      if (this.npcMoneyAccumMs >= MONEY_TICK_MS) {
        this.npcMoneyAccumMs -= MONEY_TICK_MS;
        this.npcMoney = Math.min(cap, this.npcMoney + 1);
      }
    }
  }

  private _addMoney(owner: 'player' | 'npc', amount: number): void {
    const cap = this._moneyMax(owner);
    if (owner === 'player') this.money = Math.min(cap, this.money + amount);
    else this.npcMoney = Math.min(cap, this.npcMoney + amount);
  }

  /** Single chokepoint for money leaving a wallet, so the mastery "spend 50" stat can't drift. */
  private _spendMoney(owner: 'player' | 'npc', amount: number): void {
    if (owner === 'player') {
      this.money -= amount;
      this.api.recordMasteryStat('moneySpent', amount);
    } else {
      this.npcMoney -= amount;
    }
  }

  // ── Spray ────────────────────────────────────────────────────────────────

  private _fireSprayShot(owner: 'player' | 'npc', tx: number, ty: number): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    this.gesture(owner, 'sub-spray', Math.atan2(ty - caster.y, tx - caster.x));
    // Luxury Rounds go first: they were paid for, and they do not miss.
    const luxe = this.lux[owner] > 0;
    if (luxe) {
      this.lux[owner] -= 1;
    } else if (owner === 'player') {
      if (this.bullets <= 0) return;
      this.bullets -= 1;
    } else {
      if (this.npcBullets <= 0) return;
      this.npcBullets -= 1;
    }
    if (owner === 'player') this.api.recordMasteryStat('bulletsFired', 1);
    const now = this.api.scene.time.now;
    const cone = luxe ? 0 : this._sprayCone(owner, now);
    if (owner === 'player') this.lastSprayShotAt = now;
    else this.npcLastSprayShotAt = now;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const dmg = luxe ? LUX_DMG : SPRAY_DMG;
    this._hitscanBeam(owner, caster.x, caster.y, baseAngle + Phaser.Math.FloatBetween(-cone, cone), dmg, luxe ? SUB.gold : 0xff3333);

    // Crystal copy: active clones also shoot guns with E
    for (const pos of this.api.crystalClonePositions(owner)) {
      const cloneAngle = Math.atan2(ty - pos.y, tx - pos.x);
      this._hitscanBeam(owner, pos.x, pos.y, cloneAngle + Phaser.Math.FloatBetween(-cone, cone), dmg, 0xff8888);
    }
  }

  /**
   * Half-angle of the spray cone for this shot. E+ Steady Hands walks it down to
   * zero over 8s of continuous fire; a pause of SPRAY_FOCUS_GAP_MS resets it.
   */
  private _sprayCone(owner: 'player' | 'npc', now: number): number {
    if (!this._up(owner, 'e')) return SPRAY_CONE_HALF;
    const lastAt = owner === 'player' ? this.lastSprayShotAt : this.npcLastSprayShotAt;
    const gap = lastAt > 0 ? now - lastAt : Infinity;
    let focus = owner === 'player' ? this.sprayFocusMs : this.npcSprayFocusMs;
    focus = gap > SPRAY_FOCUS_GAP_MS ? 0 : Math.min(SPRAY_FOCUS_FULL_MS, focus + gap);
    if (owner === 'player') this.sprayFocusMs = focus;
    else this.npcSprayFocusMs = focus;
    return SPRAY_CONE_HALF * (1 - focus / SPRAY_FOCUS_FULL_MS);
  }

  /** Hitscan beam: damages the first enemy near the ray, draws a fading tracer. */
  private _hitscanBeam(owner: 'player' | 'npc', sx: number, sy: number, angle: number, dmg: number, color: number): void {
    const ex = sx + Math.cos(angle) * SPRAY_RANGE;
    const ey = sy + Math.sin(angle) * SPRAY_RANGE;
    for (const t of this._foes(owner)) {
      if (!t.active || t.hp <= 0) continue;
      if (this._pointToSegmentDist(t.x, t.y, sx, sy, ex, ey) <= 24) {
        t.takeDamage(dmg);
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(color));
        this._addSprayAmmoFromDamage(owner, dmg);
        this._noteSmokeAttack(owner);
      }
    }
    // A player's spray also stings enemy lackeys (NPC subterfuge mirror)
    const enemyLackeys = this.lackeys.filter(l => l.owner !== owner);
    for (const l of enemyLackeys) {
      if (this._pointToSegmentDist(l.x, l.y, sx, sy, ex, ey) <= 20) {
        // Behind a shield, bullets rattle off without shaking anyone's loyalty.
        if (!this._crewShielded(l)) l.loyaltyMs -= 500;
        this.api.spawnHitFlash(l.x, l.y, color);
      }
    }
    this.fx(owner).tracer(sx, sy, ex, ey, { color, depth: D_AIR });
  }

  /** Every 10 damage dealt (daggers + spray) grants 3 bullets. */
  private _addSprayAmmoFromDamage(owner: 'player' | 'npc', dmg: number): void {
    const cap = this._bulletsMax(owner);
    if (owner === 'player') {
      this.sprayDmgAccum += dmg;
      while (this.sprayDmgAccum >= 10) {
        this.sprayDmgAccum -= 10;
        this.bullets = Math.min(cap, this.bullets + AMMO_PER_10_DMG);
      }
    } else {
      this.npcSprayDmgAccum += dmg;
      while (this.npcSprayDmgAccum >= 10) {
        this.npcSprayDmgAccum -= 10;
        this.npcBullets = Math.min(cap, this.npcBullets + AMMO_PER_10_DMG);
      }
    }
  }

  /** The over-head tag layer: cleared here once a frame, then each tag paints into it. */
  private _tags(): Phaser.GameObjects.Graphics {
    if (!this.tagGfx || !this.tagGfx.active) this.tagGfx = this.api.scene.add.graphics().setDepth(21);
    return this.tagGfx;
  }

  /**
   * A black-and-gold price tag: a dark card with a notched left end, a punched eyelet and a
   * thin gold rule. Shared by the ammo counter and the retainer label.
   */
  private _paintTag(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, rule: number): void {
    const c = this.pcol;
    const x = cx - w / 2, y = cy - h / 2;
    g.fillStyle(c(SUB.ink), 0.45);
    g.fillRoundedRect(x + 1.5, y + 2.5, w, h, 3);
    g.fillStyle(c(SUB.charcoal), 0.92);
    g.beginPath();
    g.moveTo(x + 6, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + 6, y + h); g.lineTo(x, cy);
    g.closePath(); g.fillPath();
    g.lineStyle(1.2, c(rule), 0.9);
    g.strokePath();
    g.fillStyle(c(SUB.paperShade), 0.9);
    g.fillCircle(x + 6, cy, 1.6);
  }

  private _renderBulletCounter(time: number): void {
    const { player, scene } = this.api;
    const visible = this.api.eKey.isDown || time - this.lastSprayShotAt < 800;
    if (!this.bulletCounterText || !this.bulletCounterText.active) {
      this.bulletCounterText = scene.add.text(player.x, player.y - 58, '', {
        fontSize: '14px', fontFamily: FONT_DISPLAY, color: '#ff4455',
        stroke: '#0a0a0a', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(22);
    }
    this._tags().clear();
    this.bulletCounterText.setVisible(visible);
    if (visible) {
      const luxe = this.lux.player > 0;
      this.bulletCounterText.setText(`${luxe ? this.lux.player : this.bullets}`)
        .setColor(luxe ? '#ffdd33' : '#ff4455').setPosition(player.x + 6, player.y - 58);
      // A tag behind the number, with a brass cartridge laid on its left end.
      const g = this._tags();
      const w = this.bulletCounterText.width + 26;
      this._paintTag(g, player.x, player.y - 58, w, 18, this.bullets > 0 ? SUB.crimson : SUB.ashDark);
      const bx = player.x - w / 2 + 12, by = player.y - 58;
      g.fillStyle(this.pcol(this.bullets > 0 ? SUB.brass : SUB.ashDark), 1);
      g.fillRect(bx - 3, by - 2.4, 5, 4.8);
      g.fillStyle(this.pcol(this.bullets > 0 ? SUB.gold : SUB.ash), 1);
      g.fillRect(bx - 3, by - 2.4, 5, 1.4);
      g.fillStyle(this.pcol(SUB.steel), 1);
      g.fillCircle(bx + 3, by, 2.4);
      g.fillRect(bx + 1.5, by - 2.4, 1.6, 4.8);
    }
  }

  private _pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  // ── Recruits ─────────────────────────────────────────────────────────────

  private _crewOf(owner: 'player' | 'npc'): Lackey[] {
    return this.lackeys.filter((l) => l.owner === owner);
  }

  /**
   * Pay for and place a recruit beside the caster, facing (tx, ty). Refused — and nothing is
   * spent — when the payroll is already three deep or the wallet is short.
   */
  private _tryHire(owner: 'player' | 'npc', type: RecruitType, tx?: number, ty?: number): boolean {
    if (this._crewOf(owner).length >= CREW_MAX) return false;
    const cost = RECRUIT_COST[type];
    if (!this._canPay(owner, cost)) return false;
    this._pay(owner, cost);
    this.gesture(owner, 'sub-recruit');
    this._spawnLackey(owner, type, tx, ty);
    return true;
  }

  /** First empty seat in this side's ride, or -1. */
  private _freeSeat(owner: 'player' | 'npc'): number {
    const n = this.rides.seatCount(owner);
    for (let i = 0; i < n; i++) {
      if (!this.lackeys.some((l) => l.owner === owner && l.seat === i)) return i;
    }
    return -1;
  }

  private _mag(l: Lackey): number {
    if (l.type === 'thug') return l.level >= 3 ? THUG_MAG_L3 : THUG_MAG;
    if (l.type === 'enforcer') return ENF_MAG;
    return Infinity;
  }

  private _spawnLackey(
    owner: 'player' | 'npc', type: RecruitType = 'thug', tx?: number, ty?: number,
    net?: { nid: number; x: number; y: number },
  ): void {
    // A replica's payroll is whatever its owner's machine says it is (`subx-crew`): it never
    // takes a man on by its own reckoning, or the two crews stop matching.
    if (this._ghost(owner) && !net) return;
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const foe = this._nearestFoe(owner, caster.x, caster.y);
    const aimX = tx ?? foe?.x ?? caster.x + 1;
    const aimY = ty ?? foe?.y ?? caster.y;
    // He steps out from beside the boss, on the side the boss is looking — and shuffles round
    // if one of the others is already standing there.
    let angle = Math.atan2(aimY - caster.y, aimX - caster.x);
    let x = caster.x, y = caster.y;
    for (let tries = 0; tries < 7; tries++) {
      x = Phaser.Math.Clamp(caster.x + Math.cos(angle) * CREW_SPAWN_REACH, 22, this.api.sceneWidth - 22);
      y = Phaser.Math.Clamp(caster.y + Math.sin(angle) * CREW_SPAWN_REACH, 22, this.api.sceneHeight - 22);
      const px = x, py = y;
      if (!this.lackeys.some((l) => Phaser.Math.Distance.Between(l.x, l.y, px, py) < 28)) break;
      angle += 0.9;
    }
    if (net) { x = net.x; y = net.y; }
    // Moral perk: the whole payroll signs on for a quarter longer, Bards included.
    const loyalty = RECRUIT_LOYALTY_MS[type]
      * (this.api.hasPerk(owner, 'moral') ? MORAL_LOYALTY_MULT : 1);
    const l: Lackey = {
      nid: net?.nid ?? ++this.crewSeq,
      owner, type, x, y,
      facing: Math.atan2(aimY - y, aimX - x),
      level: 0,
      loyaltyMs: loyalty, loyaltyMaxMs: loyalty,
      bullets: 0, reloadingUntil: 0, nextShotAt: 0, lastShotAt: -99999,
      ignited: false,
      seat: -1, lifted: false,
      healing: false, healAccumMs: 0,
      favourReadyAt: 0,
      wanderX: x, wanderY: y,
    };
    l.bullets = this._mag(l);
    // Hired right beside your ride, he gets in — if there is a seat going.
    if (type !== 'bard' && this.rides.near(owner, caster.x, caster.y, CREW_SEAT_RANGE)) l.seat = this._freeSeat(owner);
    this.lackeys.push(l);
    if (owner === 'player') this.api.broadcastMasteryCast(`subx-crew:${type}:${l.nid}:${Math.round(x)}:${Math.round(y)}`);
    // Hired on the spot: cash changes hands from the caster to the new man.
    this.fx(owner).payment(caster.x, caster.y, x, y, { count: RECRUIT_COST[type] * 2, depth: D_AIR });
    this.fx(owner).smoke(x, y, 4, { speed: 40, size: 6, life: 520, depth: D_WORLD - 1 });
  }

  /** Is a Bard of this side on the payroll? Its buff never reaches another Bard. */
  private _hasBard(owner: 'player' | 'npc'): boolean {
    return this.lackeys.some((l) => l.owner === owner && l.type === 'bard');
  }

  /**
   * Does anything stop this hire's loyalty being shot off him? An Enforcer's own shield does,
   * and a level-3 Enforcer (Protector) holds it over everyone standing near him.
   */
  private _crewShielded(l: Lackey): boolean {
    if (l.type === 'enforcer') return true;
    return this.lackeys.some((o) => o.owner === l.owner && o.type === 'enforcer' && o.level >= 3 && !o.lifted
      && Phaser.Math.Distance.Between(o.x, o.y, l.x, l.y) <= ENF_COVER_RADIUS);
  }

  /** Everything that speeds up or slows down how fast one hire's loyalty runs out. */
  private _drainMult(l: Lackey): number {
    // Soul copy: ignited hires lose an extra 2s per second. Mastery smoke gives the ones
    // standing in it somewhere pleasant to loiter, a Bard keeps everyone but the Bards happy
    // for four times as long, a Juggernaut simply does not care, and a Medic looks after the
    // men around him (but not himself).
    let m = (l.ignited ? 1 + LACKEY_IGNITE_EXTRA_PER_SEC / 1000 : 1)
      * (this._inOwnSmoke(l.owner, l.x, l.y) ? SMOKE_LOYALTY_DRAIN_MULT : 1)
      * (l.type !== 'bard' && this._hasBard(l.owner) ? BARD_DRAIN_MULT : 1)
      * (l.type === 'enforcer' && l.level >= 2 ? ENF_DRAIN_L2 : 1);
    let care = 1;
    for (const o of this.lackeys) {
      if (o === l || o.owner !== l.owner || o.type !== 'medic' || o.lifted) continue;
      if (Phaser.Math.Distance.Between(o.x, o.y, l.x, l.y) > MEDIC_RADIUS) continue;
      care = Math.min(care, o.level >= 2 ? MEDIC_DRAIN_L2 : MEDIC_DRAIN);
    }
    m *= care;
    return m;
  }

  /** Loyalty ran out: he pockets what he was owed and walks — or, lit, goes up where he stands. */
  private _crewLeaves(l: Lackey): void {
    if (l.ignited) this._lackeyBurnout(l);
    else this.fx(l.owner).smoke(l.x, l.y, 4, { speed: 50, size: 6, life: 480, depth: D_WORLD });
  }

  private _updateLackeys(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;

    for (let i = this.lackeys.length - 1; i >= 0; i--) {
      const l = this.lackeys[i];
      // On the helicopter's hook he is cargo: the lift moves him and nothing else touches him.
      if (l.lifted) continue;

      if (l.seat >= 0) {
        const p = this.rides.seatPos(l.owner, l.seat);
        if (p) { l.x = p.x; l.y = p.y; } else l.seat = -1;
      }

      l.loyaltyMs -= delta * this._drainMult(l);

      // Enemy projectile hits: -2s loyalty each, projectile consumed. Behind a shield the
      // round still stops; the loyalty does not move.
      for (const go of [...this.api.projectiles.getChildren()]) {
        const p = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean };
        if (!p.active) continue;
        if ((l.owner === 'player') === (p.isFromPlayer === true)) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, l.x, l.y) <= 18) {
          p.destroy();
          if (this._crewShielded(l)) {
            this.api.spawnHitFlash(l.x, l.y, this.col(l.owner)(SUB.haze));
          } else {
            this.api.spawnHitFlash(l.x, l.y, this.col(l.owner)(SUB.gold));
            l.loyaltyMs -= LACKEY_PROJ_HIT_LOSS_MS;
          }
        }
      }

      // A replica's man stays until his owner's machine says he walked (`subx-gone`).
      if (l.loyaltyMs <= 0 && this._ghost(l.owner)) l.loyaltyMs = 1;
      if (l.loyaltyMs <= 0) {
        if (l.owner === 'player') this.api.broadcastMasteryCast(`subx-gone:${l.nid}:${l.ignited ? 1 : 0}`);
        this._crewLeaves(l);
        this.lackeys.splice(i, 1);
        continue;
      }

      if (l.type === 'bard') {
        this._moveBard(l, dt, W, H);
        continue;
      }

      const enemy = this._nearestFoe(l.owner, l.x, l.y);
      if (enemy) l.facing = Math.atan2(enemy.y - l.y, enemy.x - l.x);
      if (l.type === 'medic') this._medicTend(l, delta);
      if (enemy) this._fireRecruit(l, enemy, time);
    }
  }

  /** The Bard strolls between random points — it is here to be heard, not to be anywhere. */
  private _moveBard(l: Lackey, dt: number, W: number, H: number): void {
    if (Phaser.Math.Distance.Between(l.x, l.y, l.wanderX, l.wanderY) <= 24) {
      l.wanderX = 40 + Math.random() * (W - 80);
      l.wanderY = 40 + Math.random() * (H - 80);
    }
    const dx = l.wanderX - l.x, dy = l.wanderY - l.y;
    const d = Math.hypot(dx, dy) || 1;
    l.x = Phaser.Math.Clamp(l.x + (dx / d) * BARD_SPEED * dt, 20, W - 20);
    l.y = Phaser.Math.Clamp(l.y + (dy / d) * BARD_SPEED * dt, 20, H - 20);
    l.facing = Math.atan2(dy, dx);
  }

  /** A Medic patches up his own boss while the boss is hurt and standing close. */
  private _medicTend(l: Lackey, delta: number): void {
    const boss = l.owner === 'player' ? this.api.player : this.api.npc;
    l.healing = boss.active && boss.hp > 0 && boss.hp < boss.maxHp
      && Phaser.Math.Distance.Between(l.x, l.y, boss.x, boss.y) <= MEDIC_RADIUS;
    if (!l.healing) { l.healAccumMs = 0; return; }
    // A replica's health is its owner's business; the stitches are only drawn here.
    if (this._ghost(l.owner)) return;
    l.healAccumMs += delta;
    if (l.healAccumMs < 1000) return;
    l.healAccumMs -= 1000;
    let amount = l.level >= 1 ? MEDIC_HEAL_PER_S_L1 : MEDIC_HEAL_PER_S;
    // Triage: the worse it looks, the faster he works.
    if (l.level >= 2) amount *= 1 + MEDIC_TRIAGE_BONUS * (1 - boss.hp / boss.maxHp);
    boss.heal(Math.round(amount));
    this.fx(l.owner).ring(boss.x, boss.y, 6, 26, SUB.moneyGreen, 320, D_AIR, 2);
  }

  /** Per-type offence. Nobody on the payroll walks anywhere: they shoot from where they stand. */
  private _fireRecruit(l: Lackey, enemy: Fighter, time: number): void {
    const dist = Phaser.Math.Distance.Between(l.x, l.y, enemy.x, enemy.y);
    if (l.reloadingUntil > 0) {
      if (time < l.reloadingUntil) return;
      l.reloadingUntil = 0;
      l.bullets = this._mag(l);
    }
    if (time < l.nextShotAt) return;
    const aim = Math.atan2(enemy.y - l.y, enemy.x - l.x);

    switch (l.type) {
      case 'thug': {
        if (dist > THUG_RANGE) return;
        // More Gun: faster and tighter.
        l.nextShotAt = time + (l.level >= 1 ? THUG_INTERVAL_L1 : THUG_INTERVAL);
        l.lastShotAt = time;
        l.bullets -= 1;
        const cone = l.level >= 1 ? THUG_CONE_HALF_L1 : SPRAY_CONE_HALF;
        const hit = this._crewHitscan(l, aim + Phaser.Math.FloatBetween(-cone, cone), THUG_DMG, THUG_RANGE, SUB.rust, false);
        // Suppressing Fire: whoever he is hosing down takes more from everybody.
        if (l.level >= 3) for (const f of hit) this.suppressed.set(f, time + SUPPRESS_MS);
        if (l.bullets <= 0) {
          l.reloadingUntil = time + THUG_RELOAD_MS;
          // Active Reload: the drum comes out and a grenade goes over.
          if (l.level >= 2) this.grenades.push({ owner: l.owner, sx: l.x, sy: l.y, tx: enemy.x, ty: enemy.y, bornAt: time });
        }
        return;
      }
      case 'enforcer': {
        // Juggernaut: the same shotgun, somehow reaching half as far again.
        const range = l.level >= 2 ? ENF_RANGE_L2 : ENF_RANGE;
        if (dist > range) return;
        l.nextShotAt = time + (l.level >= 1 ? ENF_INTERVAL_L1 : ENF_INTERVAL);
        l.lastShotAt = time;
        l.bullets -= 1;
        const dmg = l.level >= 3 ? ENF_PELLET_DMG_L3 : ENF_PELLET_DMG;
        for (let p = 0; p < ENF_PELLETS; p++) {
          const spread = (p / (ENF_PELLETS - 1) - 0.5) * 2 * ENF_CONE_HALF;
          this._crewHitscan(l, aim + spread, dmg, range, SUB.haze, false);
        }
        if (l.bullets <= 0) l.reloadingUntil = time + ENF_RELOAD_MS;
        return;
      }
      case 'sniper': {
        if (dist > SNIPER_RANGE) return;
        l.nextShotAt = time + (l.level >= 2 ? SNIPER_INTERVAL_L2 : SNIPER_INTERVAL);
        l.lastShotAt = time;
        let dmg = l.level >= 3 ? SNIPER_DMG_L3 : l.level >= 1 ? SNIPER_DMG_L1 : SNIPER_DMG;
        // Bounty Hunter: one in four is between the eyes.
        const headshot = l.level >= 3 && Math.random() < SNIPER_HEADSHOT_CHANCE;
        if (headshot) dmg *= SNIPER_HEADSHOT_MULT;
        // Professional: the round keeps going through whoever it hits.
        const hit = this._crewHitscan(l, aim, dmg, SNIPER_RANGE, headshot ? SUB.gold : SUB.steelHi, l.level >= 2, 3.2);
        for (const f of hit) {
          // High Caliber: a little of it nothing can stop.
          if (l.level >= 1 && f.active && f.hp > 0) f.takeDamage(SNIPER_TRUE_DMG_L1, { trueDamage: true });
          if (headshot) this.fx(l.owner).ring(f.x, f.y, 6, 40, SUB.gold, 360, D_AIR, 3);
        }
        return;
      }
      case 'medic': {
        if (dist > MEDIC_RANGE) return;
        l.nextShotAt = time + MEDIC_INTERVAL;
        l.lastShotAt = time;
        this._crewHitscan(l, aim, l.level >= 1 ? MEDIC_DMG_L1 : MEDIC_DMG, MEDIC_RANGE, SUB.moneyGreen, false);
        return;
      }
      default:
        return;
    }
  }

  /**
   * One round from a hire. Hits the nearest foe on the line — every foe on it when `pierce` —
   * and returns who it hit.
   */
  private _crewHitscan(
    l: Lackey, angle: number, dmg: number, range: number, color: number, pierce: boolean, width = 1.4,
  ): Fighter[] {
    const sx = l.x, sy = l.y;
    const ex = sx + Math.cos(angle) * range;
    const ey = sy + Math.sin(angle) * range;
    const onLine = this._foes(l.owner)
      .filter((f) => f.active && f.hp > 0 && this._pointToSegmentDist(f.x, f.y, sx, sy, ex, ey) <= 24)
      .sort((a, b) => Phaser.Math.Distance.Between(sx, sy, a.x, a.y) - Phaser.Math.Distance.Between(sx, sy, b.x, b.y));
    const hit = pierce ? onLine : onLine.slice(0, 1);
    for (const f of hit) {
      f.takeDamage(dmg);
      this.api.spawnHitFlash(f.x, f.y, this.col(l.owner)(color));
    }
    this.fx(l.owner).tracer(sx, sy, ex, ey, { color, depth: D_WORLD, duration: width > 2 ? 240 : 110, width });
    return hit;
  }

  /** Enforces shoves and staggers: this codebase drives those from update(). */
  private _updateStunsAndKnocks(time: number): void {
    if (time < this.playerStunUntil) (this.api.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (time < this.npcStunUntil) (this.api.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    for (const [target, k] of this.knocks) {
      if (time >= k.until || !target.active) { this.knocks.delete(target); continue; }
      (target.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(k.vx, k.vy);
    }
  }

  // ── Recruit favours (F+ level 3) ─────────────────────────────────────────

  /** Thug — pay to skip the reload. */
  private _buyReload(l: Lackey): boolean {
    if (l.type !== 'thug' || l.level < 3 || l.reloadingUntil <= 0) return false;
    if (!this._canPay(l.owner, THUG_RELOAD_COST)) return false;
    this._pay(l.owner, THUG_RELOAD_COST);
    l.reloadingUntil = 0;
    l.bullets = this._mag(l);
    const boss = l.owner === 'player' ? this.api.player : this.api.npc;
    this.fx(l.owner).payment(boss.x, boss.y, l.x, l.y, { count: 2, depth: D_AIR });
    return true;
  }

  /** Enforcer — a helicopter picks `crew` up and sets him down at (x, y). */
  private _callHeli(enforcer: Lackey, crew: Lackey, x: number, y: number): boolean {
    const time = this.api.scene.time.now;
    if (enforcer.type !== 'enforcer' || enforcer.level < 3 || time < enforcer.favourReadyAt) return false;
    if (crew.owner !== enforcer.owner || crew.lifted || this.heliLifts.some((h) => h.crew === crew)) return false;
    if (!this._canPay(enforcer.owner, HELI_COST)) return false;
    this._pay(enforcer.owner, HELI_COST);
    enforcer.favourReadyAt = time + HELI_CD_MS;
    this.heliLifts.push({
      owner: enforcer.owner, crew,
      // It comes in over the nearest edge of the arena.
      x: crew.x, y: -70,
      destX: Phaser.Math.Clamp(x, 24, this.api.sceneWidth - 24),
      destY: Phaser.Math.Clamp(y, 24, this.api.sceneHeight - 24),
      phase: 'inbound', angle: Math.PI / 2,
    });
    return true;
  }

  private _updateHeli(dt: number): void {
    for (let i = this.heliLifts.length - 1; i >= 0; i--) {
      const h = this.heliLifts[i];
      const gone = !this.lackeys.includes(h.crew);
      if (gone && h.phase !== 'leave') h.phase = 'leave';
      // The hook hangs 34px under the airframe, so the heli hovers that far above its cargo.
      const goal = h.phase === 'inbound' ? { x: h.crew.x, y: h.crew.y - 34 }
        : h.phase === 'carry' ? { x: h.destX, y: h.destY - 34 }
          : { x: h.x, y: -90 };
      const dx = goal.x - h.x, dy = goal.y - h.y;
      const dist = Math.hypot(dx, dy);
      const step = HELI_SPEED * dt;
      if (dist > 1) h.angle = Phaser.Math.Angle.RotateTo(h.angle, Math.atan2(dy, dx), 5 * dt);
      if (dist <= step) {
        h.x = goal.x; h.y = goal.y;
        if (h.phase === 'inbound') {
          h.phase = 'carry';
          h.crew.lifted = true;
          h.crew.seat = -1;
          this.fx(h.owner).smoke(h.crew.x, h.crew.y, 5, { speed: 80, size: 6, life: 420, depth: D_WORLD });
        } else if (h.phase === 'carry') {
          h.phase = 'leave';
          h.crew.lifted = false;
          h.crew.x = h.destX; h.crew.y = h.destY;
          // Set down beside the boss's ride, he takes a seat in it.
          if (this.rides.near(h.owner, h.destX, h.destY, CREW_SEAT_RANGE * 0.6)) h.crew.seat = this._freeSeat(h.owner);
          this.fx(h.owner).smoke(h.destX, h.destY, 6, { speed: 90, size: 7, life: 460, depth: D_WORLD });
        } else {
          this.heliLifts.splice(i, 1);
          continue;
        }
      } else {
        h.x += (dx / dist) * step;
        h.y += (dy / dist) * step;
      }
      if (h.phase === 'carry' && h.crew.lifted) { h.crew.x = h.x; h.crew.y = h.y + 34; }
    }
  }

  /** This side's daggers that are standing in the floor — the Sniper's air strike aims by them. */
  private _plantedDaggers(owner: 'player' | 'npc'): SubDagger[] {
    return (owner === 'player' ? this.playerDaggers : this.npcDaggers).filter((d) => d.state === 'planted');
  }

  private _strikeInbound(owner: 'player' | 'npc'): AirStrike | undefined {
    return this.strikes.find((s) => s.owner === owner && s.bombs.length === 0);
  }

  /** Sniper — a flare goes up; five seconds later a plane bombs wherever the daggers say. */
  private _callStrike(sniper: Lackey): boolean {
    const time = this.api.scene.time.now;
    if (sniper.type !== 'sniper' || sniper.level < 3 || time < sniper.favourReadyAt) return false;
    if (this._strikeInbound(sniper.owner)) return false;
    if (!this._canPay(sniper.owner, STRIKE_COST)) return false;
    this._pay(sniper.owner, STRIKE_COST);
    sniper.favourReadyAt = time + STRIKE_CD_MS;
    this.strikes.push({
      owner: sniper.owner, flareX: sniper.x, flareY: sniper.y, calledAt: time, bombs: [],
      planeFrom: { x: 0, y: 0 }, planeTo: { x: 0, y: 0 },
    });
    this.fx(sniper.owner).flash(sniper.x, sniper.y - 10, 12, D_AIR, SUB.scarlet);
    return true;
  }

  /**
   * Where the bombs go. The same ten every time — the daggers only decide how tightly they
   * land: none is the whole arena, one is a wide scatter around it, two is the line between
   * them, three or more is the patch of floor they fence off.
   */
  private _strikeTargets(owner: 'player' | 'npc'): Array<{ x: number; y: number }> {
    const W = this.api.sceneWidth, H = this.api.sceneHeight;
    const pts = this._plantedDaggers(owner);
    const out: Array<{ x: number; y: number }> = [];
    const jitter = (spread: number): { x: number; y: number } => {
      const a = Math.random() * Math.PI * 2;
      const r = spread * Math.sqrt(Math.random());
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    };
    for (let i = 0; i < STRIKE_BOMBS; i++) {
      let x: number, y: number;
      if (pts.length === 0) {
        x = 50 + Math.random() * (W - 100);
        y = 50 + Math.random() * (H - 100);
      } else if (pts.length === 1) {
        const j = jitter(STRIKE_SPREAD_ONE);
        x = pts[0].x + j.x; y = pts[0].y + j.y;
      } else if (pts.length === 2) {
        // Evenly down the line, so the whole length of it goes up.
        const k = (i + 0.5) / STRIKE_BOMBS;
        const j = jitter(STRIKE_SPREAD_LINE);
        x = Phaser.Math.Linear(pts[0].x, pts[1].x, k) + j.x;
        y = Phaser.Math.Linear(pts[0].y, pts[1].y, k) + j.y;
      } else {
        // A random blend of the corners always lands inside the shape they make.
        const w = pts.map(() => -Math.log(1 - Math.random()));
        const sum = w.reduce((a, b) => a + b, 0) || 1;
        const j = jitter(STRIKE_SPREAD_AREA);
        x = j.x; y = j.y;
        pts.forEach((p, k) => { x += p.x * (w[k] / sum); y += p.y * (w[k] / sum); });
      }
      out.push({ x: Phaser.Math.Clamp(x, 16, W - 16), y: Phaser.Math.Clamp(y, 16, H - 16) });
    }
    return out;
  }

  private _updateStrikes(time: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      if (s.bombs.length === 0) {
        if (time < s.calledAt + STRIKE_DELAY_MS) continue;
        // The plane is here: fix the targets and the line it flies.
        const targets = this._strikeTargets(s.owner);
        s.bombs = targets.map((p, k) => ({ x: p.x, y: p.y, dropAt: time + 200 + k * STRIKE_STAGGER_MS, done: false }));
        const cx = targets.reduce((a, p) => a + p.x, 0) / targets.length;
        const cy = targets.reduce((a, p) => a + p.y, 0) / targets.length;
        const pts = this._plantedDaggers(s.owner);
        const dir = pts.length === 2 ? Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) : 0;
        s.planeFrom = { x: cx - Math.cos(dir) * 760, y: cy - Math.sin(dir) * 760 };
        s.planeTo = { x: cx + Math.cos(dir) * 760, y: cy + Math.sin(dir) * 760 };
        s.calledAt = time - STRIKE_DELAY_MS;
        continue;
      }
      let live = false;
      for (const b of s.bombs) {
        if (b.done) continue;
        if (time < b.dropAt + STRIKE_FALL_MS) { live = true; continue; }
        b.done = true;
        this.api.dealAoeDamage(s.owner, b.x, b.y, STRIKE_BOMB_RADIUS, STRIKE_BOMB_DMG);
        const fx = this.fx(s.owner);
        fx.flash(b.x, b.y, 30, D_AIR, SUB.flame);
        fx.deal(b.x, b.y, STRIKE_BOMB_RADIUS, { notes: 0, rings: 2, duration: 420, color: SUB.ember });
        fx.smoke(b.x, b.y, 5, { speed: 110, size: 9, life: 760, depth: D_AIR, color: SUB.ashDark });
        fx.scorch(b.x, b.y, 26);
        this.api.scene.cameras.main.shake(110, 0.005);
      }
      if (!live && time > s.calledAt + STRIKE_DELAY_MS + STRIKE_PLANE_MS) this.strikes.splice(i, 1);
    }
  }

  /** Medic — five seconds in which nothing can touch the boss. */
  private _buySavior(medic: Lackey): boolean {
    const time = this.api.scene.time.now;
    if (medic.type !== 'medic' || medic.level < 3 || time < this.saviorUntil[medic.owner]) return false;
    if (!this._canPay(medic.owner, SAVIOR_COST)) return false;
    this._pay(medic.owner, SAVIOR_COST);
    this.saviorUntil[medic.owner] = time + SAVIOR_MS;
    const boss = medic.owner === 'player' ? this.api.player : this.api.npc;
    this.fx(medic.owner).payment(medic.x, medic.y, boss.x, boss.y, { count: 4, depth: D_AIR });
    this.fx(medic.owner).ring(boss.x, boss.y, 10, 54, SUB.gold, 420, D_AIR, 3);
    return true;
  }

  private _updateSavior(time: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const f = owner === 'player' ? this.api.player : this.api.npc;
      const active = time < this.saviorUntil[owner] && f.active && f.hp > 0;
      // Re-asserted every frame: other kits flip this flag too, and ours has to outlast them.
      if (active) { f.isInvincible = true; this.saviorOn[owner] = true; }
      else if (this.saviorOn[owner]) { f.isInvincible = false; this.saviorOn[owner] = false; }
    }
    if (this.saviorOn.player) {
      this.api.setStatusIndicator('sub-savior', {
        name: 'Savior', emoji: '⛑️', color: 0xffdd33,
        description: 'Your Medic has you covered: nothing can damage you until this runs out.',
        until: this.saviorUntil.player, priority: 108,
      });
    } else {
      this.api.setStatusIndicator('sub-savior', null);
    }
  }

  private _updateGrenades(time: number): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const n = this.grenades[i];
      if (time < n.bornAt + GRENADE_FLIGHT_MS) continue;
      this.grenades.splice(i, 1);
      this.api.dealAoeDamage(n.owner, n.tx, n.ty, GRENADE_RADIUS, GRENADE_DMG);
      const fx = this.fx(n.owner);
      fx.flash(n.tx, n.ty, 26, D_AIR, SUB.flame);
      fx.deal(n.tx, n.ty, GRENADE_RADIUS, { notes: 0, rings: 2, duration: 380, color: SUB.ember });
      fx.smoke(n.tx, n.ty, 5, { speed: 100, size: 8, life: 620, depth: D_AIR, color: SUB.ashDark });
    }
  }

  /**
   * Suppressing Fire rides the kit's own victim-side field: whoever is being hosed down takes
   * 15% more from everything. `_updateBribes` folds the same map into the two duellists, so
   * this only has to look after everyone else (Invasion's husks) and let lapsed marks go.
   */
  private _updateSuppression(time: number): void {
    for (const [f, until] of this.suppressed) {
      const live = time < until && f.active && f.hp > 0;
      if (f !== this.api.player && f !== this.api.npc) f.bribeIncomingMult = live ? SUPPRESS_MULT : 1;
      if (!live) this.suppressed.delete(f);
    }
  }

  private _suppressMult(f: Fighter, time: number): number {
    return time < (this.suppressed.get(f) ?? 0) ? SUPPRESS_MULT : 1;
  }

  // ── Laundering (F+) ──────────────────────────────────────────────────────

  private _stashOf(owner: 'player' | 'npc'): StashBag | undefined {
    return this.stashes.find((b) => b.owner === owner);
  }

  /** Put a note in a bag behind you. Stay out of trouble for three seconds and it comes back as two. */
  private _buyStash(owner: 'player' | 'npc'): boolean {
    if (this._stashOf(owner) || !this._canPay(owner, STASH_COST)) return false;
    this._pay(owner, STASH_COST);
    this.stashes.push({ owner, bornAt: this.api.scene.time.now, damageTaken: 0 });
    const f = owner === 'player' ? this.api.player : this.api.npc;
    this.fx(owner).cash(f.x, f.y, 2, { speed: 60, size: 11, life: 420, depth: D_AIR, seal: SUB.gold });
    return true;
  }

  /** Where a side's bag sits: on the floor behind them, away from whatever they are facing. */
  private _stashPos(owner: 'player' | 'npc'): { x: number; y: number } {
    const f = owner === 'player' ? this.api.player : this.api.npc;
    const facing = f.facingAngle;
    return { x: f.x - Math.cos(facing) * 26, y: f.y - Math.sin(facing) * 20 + 8 };
  }

  private _updateStashes(time: number): void {
    for (let i = this.stashes.length - 1; i >= 0; i--) {
      const b = this.stashes[i];
      const p = this._stashPos(b.owner);
      if (b.damageTaken >= STASH_FAIL_DMG) {
        // Shot to ribbons: the bag and the note in it are both gone.
        this.stashes.splice(i, 1);
        this.fx(b.owner).cash(p.x, p.y, 6, { speed: 190, size: 12, life: 620, depth: D_AIR, seal: SUB.ashDark });
        this.fx(b.owner).smoke(p.x, p.y, 4, { speed: 70, size: 6, life: 520, depth: D_AIR });
        continue;
      }
      if (time - b.bornAt < STASH_MS) continue;
      this.stashes.splice(i, 1);
      // A replica's wallet belongs to its owner's machine; only the show plays here.
      if (!this._ghost(b.owner)) this._addMoney(b.owner, STASH_PAYOUT);
      const f = b.owner === 'player' ? this.api.player : this.api.npc;
      this.fx(b.owner).payment(p.x, p.y, f.x, f.y - 44, { count: 6, depth: D_AIR });
      this.fx(b.owner).ring(p.x, p.y, 6, 30, SUB.gold, 360, D_AIR, 2.4);
    }
  }

  /** Soul copy: an ignited lackey erupts in a burning AoE when it expires. */
  private _lackeyBurnout(l: Lackey): void {
    this.api.dealAoeDamage(l.owner, l.x, l.y, 90, 20);
    // He goes up, and everything he was carrying goes up with him.
    this.fx(l.owner).deal(l.x, l.y, 90, { notes: 10, rings: 2, duration: 520, color: SUB.ember });
    this.fx(l.owner).smoke(l.x, l.y, 8, { speed: 130, size: 9, life: 900, depth: D_AIR, color: SUB.ashDark });
    this.api.showFloatingText(l.x, l.y - 24, '🔥 Burnout!', '#ff5522');
  }

  private _igniteLackeys(owner: 'player' | 'npc'): void {
    let any = false;
    for (const l of this.lackeys) {
      if (l.owner !== owner || l.ignited) continue;
      l.ignited = true;
      any = true;
      // The painter reads `ignited` for the standing flames; this is the moment it catches.
      this.fx(owner).smoke(l.x, l.y, 4, { speed: 70, size: 6, life: 620, depth: D_AIR, color: SUB.ember, drift: -50 });
    }
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    this.api.showFloatingText(caster.x, caster.y - 40, any ? '🔥 Lackeys Ignited!' : 'No lackeys to ignite', '#ff5522');
  }

  // ── Bribe ────────────────────────────────────────────────────────────────

  /** Returns true if a target was bribed (money is only spent on success). */
  private _doBribe(owner: 'player' | 'npc', cursorX: number, cursorY: number, time: number): boolean {
    const enemy = owner === 'player' ? this.api.npc : this.api.player;
    const ownLackeys = this.lackeys.filter(l => l.owner === owner);

    // Direct cursor hits first, else nearest of enemy / own lackey to the cursor.
    let target: 'enemy' | Lackey | null = null;
    if (enemy.active && enemy.hp > 0 && Phaser.Math.Distance.Between(cursorX, cursorY, enemy.x, enemy.y) <= 36) {
      target = 'enemy';
    } else {
      const hovered = ownLackeys.find(l => Phaser.Math.Distance.Between(cursorX, cursorY, l.x, l.y) <= 30);
      if (hovered) target = hovered;
    }
    if (!target) {
      let best: { kind: 'enemy' | Lackey; d: number } | null = null;
      if (enemy.active && enemy.hp > 0) best = { kind: 'enemy', d: Phaser.Math.Distance.Between(cursorX, cursorY, enemy.x, enemy.y) };
      for (const l of ownLackeys) {
        const d = Phaser.Math.Distance.Between(cursorX, cursorY, l.x, l.y);
        if (!best || d < best.d) best = { kind: l, d };
      }
      target = best ? best.kind : null;
    }
    if (!target) return false;

    const caster = owner === 'player' ? this.api.player : this.api.npc;
    if (target === 'enemy') {
      if (owner === 'player') this.npcBribedUntil = time + BRIBE_MS;
      else this.playerBribedUntil = time + BRIBE_MS;
      this.gesture(owner, 'sub-bribe', Math.atan2(enemy.y - caster.y, enemy.x - caster.x));
      // The money physically crosses the gap. That is the whole ability.
      this.fx(owner).payment(caster.x, caster.y, enemy.x, enemy.y, { count: 6, depth: D_AIR });
      this.api.showFloatingText(enemy.x, enemy.y - 34, '💵 Bribed! -25% dmg', '#66dd66');
    } else {
      target.loyaltyMs = target.loyaltyMaxMs * LACKEY_BRIBE_BONUS;
      this.gesture(owner, 'sub-bribe', Math.atan2(target.y - caster.y, target.x - caster.x));
      this.fx(owner).payment(caster.x, caster.y, target.x, target.y, { count: 6, depth: D_AIR });
      // F+ Hardened Criminals: nothing teaches like being paid. One bribe, one promotion.
      if (this._up(owner, 'f') && target.type !== 'bard' && target.level < CREW_MAX_LEVEL) {
        target.level += 1;
        if (owner === 'player') {
          this.api.recordMasteryBestStat('recruitBestLevel', target.level);
          this.api.broadcastMasteryCast(`subx-lvl:${target.nid}:${target.level}`);
        }
        // A bigger drum is a bigger drum straight away.
        if (target.reloadingUntil <= 0 && target.bullets > 0) target.bullets = Math.max(target.bullets, this._mag(target));
        this.fx(owner).cash(target.x, target.y, 4 + target.level * 2, { speed: 170, size: 14, life: 700, depth: D_AIR, seal: SUB.gold });
        this.fx(owner).ring(target.x, target.y, 8, 30 + target.level * 6, SUB.gold, 380, D_AIR, 2.6);
      }
    }
    return true;
  }

  private _updateBribes(time: number): void {
    // Bribed enemies deal 25% less damage — applied victim-side (1v1: identical outcome).
    // Suppressing Fire shares the field: the same fighter can be bought off and pinned down.
    const npcBribed = time < this.npcBribedUntil;
    const playerBribed = time < this.playerBribedUntil;
    this.api.player.bribeIncomingMult = (npcBribed ? BRIBE_DMG_MULT : 1) * this._suppressMult(this.api.player, time);
    this.api.npc.bribeIncomingMult = (playerBribed ? BRIBE_DMG_MULT : 1) * this._suppressMult(this.api.npc, time);

    // The censor bar and the money raining down on them are the 'bribed' aura's job.
  }

  // ── Dark Treachery ───────────────────────────────────────────────────────

  private _tickTreacheryChannel(owner: 'player' | 'npc', time: number): void {
    const firesAt = owner === 'player' ? this.treacheryFiresAt : this.npcTreacheryFiresAt;
    if (firesAt === 0) return;
    const caster = owner === 'player' ? this.api.player : this.api.npc;

    // Black fog accumulating around the caster during the 2s channel
    const fogNextAt = owner === 'player' ? this.treacheryFogNextAt : this.npcTreacheryFogNextAt;
    if (time >= fogNextAt) {
      if (owner === 'player') this.treacheryFogNextAt = time + 130;
      else this.npcTreacheryFogNextAt = time + 130;
      // Fog and cash spiralling *inward* onto the caster — a deal being struck, not a blast.
      this.fx(owner).shakedown(caster.x, caster.y, 62, 340, {
        depth: 9, follow: () => ({ x: caster.x, y: caster.y }),
      });
    }

    if (time >= firesAt) {
      if (owner === 'player') this.treacheryFiresAt = 0;
      else this.npcTreacheryFiresAt = 0;
      // The deal closes: everything that gathered comes back out at once.
      this.gesture(owner, 'sub-treachery');
      this.fx(owner).deal(caster.x, caster.y, 110, {
        notes: 16, rings: 3, duration: 700, color: SUB.neon, mark: false,
      });
      this.api.scene.cameras.main.shake(280, 0.006);
      this._executeTreachery(owner, time);
    }
  }

  /** NPC AI entry: begin the 2s channel. */
  doNpcTreachery(): void {
    if (this.npcTreacheryFiresAt > 0) return;
    const time = this.api.scene.time.now;
    this.npcTreacheryFiresAt = time + TREACHERY_DELAY_MS;
    this.npcTreacheryFogNextAt = time;
    this.api.showFloatingText(this.api.npc.x, this.api.npc.y - 44, '🌫️ Dark Treachery...', '#552255');
  }

  /**
   * Q+ for the NPC. The AI reaches Dark Treachery through castAbility, which is
   * still sitting on its 40s cooldown, so the retainer recast is driven here:
   * while the contract is open the NPC cashes it in as soon as it can afford to.
   */
  private _tickNpcRetainer(time: number): void {
    if (!this.npcRetainerElementId) return;
    if (time >= this.npcRetainerUntil) { this.npcRetainerElementId = null; return; }
    if (this.npcTreacheryFiresAt > 0) return;
    // A replica recasts when its owner's machine says it did (`subx-retainer`), not on a guess.
    if (this._ghost('npc')) return;
    if (time < this.npcRetainerNextTryAt) return;
    if (this.npcMoney < RETAINER_COST) return;
    this.npcRetainerNextTryAt = time + 1500;
    this._buyRetainer('npc');
  }

  /**
   * Steal and fire the enemy's ultimate. `forcedId` is the Q+ retainer recast —
   * it replays an already-stolen contract without re-opening the 8s window.
   */
  private _executeTreachery(owner: 'player' | 'npc', time: number, forcedId?: string): void {
    const { api } = this;
    const caster = owner === 'player' ? api.player : api.npc;
    const enemyId = forcedId ?? (owner === 'player' ? api.npcElementId : api.elementId);

    // Q+ On Retainer: a fresh theft puts the contract on the books for 8s.
    if (!forcedId && this._up(owner, 'q')) {
      if (owner === 'player') { this.retainerElementId = enemyId; this.retainerUntil = time + RETAINER_MS; }
      else { this.npcRetainerElementId = enemyId; this.npcRetainerUntil = time + RETAINER_MS; }
      api.showFloatingText(caster.x, caster.y - 58, `🤝 On Retainer — Q for ${RETAINER_COST}💵`, '#ff8888');
    }

    // Cleared by the branches that find nothing to steal, so an empty contract doesn't
    // count toward "steal 10 different ultimates".
    let stole = true;

    switch (enemyId) {
      // ── Fully custom copies ──
      case 'subterfuge': // mirror match: gain 3 money instantly
        this._addMoney(owner, 3);
        api.showFloatingText(caster.x, caster.y - 40, '💵💵💵 Insider Trading!', '#ff5555');
        break;
      case 'metal': // just gain an extra 50 shield health
        caster.shieldHp += 50;
        api.showFloatingText(caster.x, caster.y - 40, '🛡️ +50 Shield', '#aaaacc');
        break;
      case 'growth': { // two free Thugs — or, with the payroll full, a raise for everyone on it
        let grown = 0;
        for (let k = 0; k < 2; k++) {
          if (this._crewOf(owner).length >= CREW_MAX) break;
          this._spawnLackey(owner, 'thug');
          grown++;
        }
        if (grown === 0) {
          for (const l of this._crewOf(owner)) l.loyaltyMs = l.loyaltyMaxMs * LACKEY_BRIBE_BONUS;
        }
        break;
      }
      case 'soul': // ignite lackeys: extra loyalty drain + burning AoE on burnout
        this._igniteLackeys(owner);
        break;
      case 'life': // link to all lackeys: incoming damage split across them instead
        if (owner === 'player') this.linkUntil = time + LINK_MS;
        else this.npcLinkUntil = time + LINK_MS;
        this._armLinkAbsorber(owner);
        api.showFloatingText(caster.x, caster.y - 40, '🔗 Linked to Lackeys!', '#66ff66');
        break;
      case 'sound': // just the disco ball: 12s, shoots every 3s for 10
        this._spawnDiscoBall(owner);
        break;
      case 'electricity': // overcharge: die within 5s → respawn at 25% health
        if (owner === 'player') this.overchargeUntil = time + OVERCHARGE_MS;
        else this.npcOverchargeUntil = time + OVERCHARGE_MS;
        this._armOvercharge(owner);
        break;
      case 'slime': // acid pours over the entire screen at ¼ damage
        if (owner === 'player') { this.acidRainUntil = time + ACID_RAIN_MS; this.acidRainTickAccum = 0; }
        else { this.npcAcidRainUntil = time + ACID_RAIN_MS; this.npcAcidRainTickAccum = 0; }
        api.showFloatingText(api.sceneWidth / 2, 80, '☠️ Acid Downpour!', '#66ff33');
        break;

      // ── Kit-routed copies ──
      case 'earth': api.earthBiomeBuilder(owner); break;
      case 'oil': api.oilTrain(owner); break;
      case 'ice': {
        const target = owner === 'player' ? api.npc : api.player;
        api.iceFrozenSolidNoFrost(owner, target.x, target.y);
        break;
      }
      case 'time': api.timeAlwaysNoonForced(owner); break;
      case 'light': api.lightSupernova(owner); break;
      case 'echo': api.echoEclipseDirect(owner); break;
      case 'magic': api.magicNecronomicon(owner); break;

      // ── Not yet supported ──
      case 'gunpowder':
      case 'rubber':
        api.showFloatingText(caster.x, caster.y - 40, '🚫 No Contract', '#888888');
        stole = false;
        break;

      // ── Everything else: cast the enemy's Q through the normal context ──
      default:
        if (!api.castForeignQ(enemyId, owner)) {
          api.showFloatingText(caster.x, caster.y - 40, '🚫 No Contract', '#888888');
          stole = false;
        }
        break;
    }

    if (stole && owner === 'player') this._noteStolenUltimate(enemyId);
  }

  /**
   * "Steal 10 different ultimates" is a set, not a counter, so each element gets its own
   * persisted flag and the requirement key is re-derived as their sum — monotonic, so it
   * rides the existing best-value ratchet (same shape as Gunpowder's weapon set).
   */
  private _noteStolenUltimate(elementId: string): void {
    this.api.recordMasteryBestStat(`subSteal_${elementId}`, 1);
    let distinct = 0;
    for (const id of this.api.allElementIds()) {
      if (this.api.getMasteryStat(`subSteal_${id}`) > 0) distinct++;
    }
    this.api.recordMasteryBestStat('stolenElements', distinct);
  }

  // ── Life copy: damage-link to lackeys ────────────────────────────────────

  private _armLinkAbsorber(owner: 'player' | 'npc'): void {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    fighter.damageAbsorber = (amount: number) => {
      const until = owner === 'player' ? this.linkUntil : this.npcLinkUntil;
      if (this.api.scene.time.now >= until) return false;
      const own = this.lackeys.filter(l => l.owner === owner);
      if (own.length === 0) return false;
      const share = amount / own.length;
      for (const l of own) {
        l.loyaltyMs -= share * LINK_LOYALTY_MS_PER_DMG;
        this.api.spawnHitFlash(l.x, l.y, this.col(l.owner)(0x66ff66));
      }
      this.api.showFloatingText(fighter.x, fighter.y - 30, 'Linked!', '#66ff66');
      return true;
    };
  }

  private _updateLinks(time: number): void {
    // A ride borrows the same slot while its owner is driving, and gives it back itself.
    if (this.linkUntil > 0 && time >= this.linkUntil) {
      this.linkUntil = 0;
      if (this.api.player.damageAbsorber && !this.rides.isRiding('player')) this.api.player.damageAbsorber = null;
    }
    if (this.npcLinkUntil > 0 && time >= this.npcLinkUntil) {
      this.npcLinkUntil = 0;
      if (this.api.npc.damageAbsorber && !this.rides.isRiding('npc')) this.api.npc.damageAbsorber = null;
    }
  }

  // ── Electricity copy: overcharge revive ──────────────────────────────────

  private _armOvercharge(owner: 'player' | 'npc'): void {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    this.api.showFloatingText(fighter.x, fighter.y - 40, '⚡ OVERCHARGED', '#ffee00');
    // The standing cage of arcs is the 'overcharge' aura; this is the moment it kicks in.
    this.fx(owner).ring(fighter.x, fighter.y, 8, 46, SUB.volt, 380, D_AIR, 3);
    fighter.damageAbsorber = (amount: number) => {
      const until = owner === 'player' ? this.overchargeUntil : this.npcOverchargeUntil;
      if (this.api.scene.time.now >= until) return false;
      if (fighter.hp - amount > 0) return false;
      // Lethal hit while overcharged → respawn at 25% health instead.
      fighter.hp = Math.ceil(fighter.maxHp * 0.25);
      if (owner === 'player') this.overchargeUntil = 0;
      else this.npcOverchargeUntil = 0;
      fighter.damageAbsorber = null;
      this.api.showFloatingText(fighter.x, fighter.y - 40, '⚡ RESTART!', '#ffee00');
      // Cheating death is the biggest thing this element can do, so it gets the biggest bang.
      this.fx(owner).deal(fighter.x, fighter.y, 90, {
        notes: 12, rings: 3, duration: 640, color: SUB.volt, mark: false,
      });
      this.api.scene.cameras.main.shake(300, 0.007);
      return true;
    };
  }

  /** Clears the revive absorber once the window lapses. The cage of arcs is drawn by the aura. */
  private _updateOvercharge(time: number): void {
    if (this.overchargeUntil > 0 && time >= this.overchargeUntil) {
      this.overchargeUntil = 0;
      if (this.api.player.damageAbsorber && !this.rides.isRiding('player')) this.api.player.damageAbsorber = null;
    }
    if (this.npcOverchargeUntil > 0 && time >= this.npcOverchargeUntil) {
      this.npcOverchargeUntil = 0;
      if (this.api.npc.damageAbsorber && !this.rides.isRiding('npc')) this.api.npc.damageAbsorber = null;
    }
  }

  // ── Sound copy: disco ball ───────────────────────────────────────────────

  private _spawnDiscoBall(owner: 'player' | 'npc'): void {
    const { scene } = this.api;
    const time = scene.time.now;
    const x = this.api.sceneWidth / 2;
    const y = 90;
    this.discoBalls.push({ owner, x, y, endsAt: time + DISCO_MS, nextShotAt: time + DISCO_SHOT_INTERVAL });
    void scene;
    this.api.showFloatingText(x, y - 36, '🪩 Disco!', '#ff66cc');
  }

  private _updateDiscoBalls(time: number): void {
    for (let i = this.discoBalls.length - 1; i >= 0; i--) {
      const b = this.discoBalls[i];
      if (time >= b.endsAt) {
        // It drops off the wire and shatters into its own tiles.
        this.fx(b.owner).deal(b.x, b.y, 44, { notes: 0, rings: 1, duration: 400, mark: false, color: SUB.neon });
        this.discoBalls.splice(i, 1);
        continue;
      }
      if (time >= b.nextShotAt) {
        b.nextShotAt = time + DISCO_SHOT_INTERVAL;
        const enemy = b.owner === 'player' ? this.api.npc : this.api.player;
        if (enemy.active && enemy.hp > 0) {
          enemy.takeDamage(DISCO_DMG);
          // The beam it picks you out with, and the light that lands on you.
          const hue = (time * 0.15) % 360;
          const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.8, 0.6).color;
          this.api.spawnHitFlash(enemy.x, enemy.y, color);
          this.fx(b.owner).tracer(b.x, b.y, enemy.x, enemy.y, { color, depth: D_AIR, duration: 260, width: 3.4 });
          this.fx(b.owner).ring(enemy.x, enemy.y, 6, 34, color, 340, D_AIR, 2.4);
        }
      }
    }
  }

  // ── Acid copy: whole-screen rain at ¼ damage ─────────────────────────────

  private _updateAcidRain(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const until = owner === 'player' ? this.acidRainUntil : this.npcAcidRainUntil;
      if (time >= until) continue;
      const enemy = owner === 'player' ? this.api.npc : this.api.player;

      let tickAccum = (owner === 'player' ? this.acidRainTickAccum : this.npcAcidRainTickAccum) + delta;
      if (tickAccum >= ACID_RAIN_TICK_MS) {
        tickAccum -= ACID_RAIN_TICK_MS;
        if (enemy.active && enemy.hp > 0) {
          let dmgAccum = (owner === 'player' ? this.acidRainDmgAccum : this.npcAcidRainDmgAccum) + ACID_RAIN_TICK_DMG;
          const whole = Math.floor(dmgAccum);
          dmgAccum -= whole;
          if (whole > 0) {
            enemy.takeDamage(whole);
            this.api.spawnHitFlash(enemy.x, enemy.y, this.col(owner)(0x66ff33));
          }
          if (owner === 'player') this.acidRainDmgAccum = dmgAccum;
          else this.npcAcidRainDmgAccum = dmgAccum;
        }
      }
      if (owner === 'player') this.acidRainTickAccum = tickAccum;
      else this.npcAcidRainTickAccum = tickAccum;

      // Falling drops across the whole screen
      this.acidRainDropAccum += delta;
      if (this.acidRainDropAccum >= 60) {
        this.acidRainDropAccum -= 60;
        const dx = Math.random() * this.api.sceneWidth;
        const dy = Math.random() * this.api.sceneHeight;
        // Each drop falls, then spatters where it lands.
        this.fx(owner).anim(D_GROUND + 3, 380, (g, t) => {
          const y2 = dy - 90 + 90 * t * t;
          g.fillStyle(this.col(owner)(SUB.acid), 0.9 * (1 - t * 0.5));
          g.fillEllipse(dx, y2, 3, 3 + 7 * t);
          if (t < 0.75) return;
          const k = (t - 0.75) / 0.25;
          g.lineStyle(1.4, this.col(owner)(SUB.acid), (1 - k) * 0.8);
          g.strokeCircle(dx, dy, 4 + k * 12);
        });
      }
    }
  }

  // ── Molecular Cutter daggers (Click) ─────────────────────────────────────

  private _pickBalancedColor(owner: 'player' | 'npc'): 'red' | 'black' {
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    let r = 0, b = 0;
    for (const d of list) { if (d.state === 'returning') continue; if (d.color === 'red') r++; else b++; }
    return r <= b ? 'red' : 'black';
  }

  private _throwDagger(owner: 'player' | 'npc', tx: number, ty: number, color: 'red' | 'black', originX?: number, originY?: number): void {
    const { scene } = this.api;
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    this.gesture(owner, 'sub-cutter', Math.atan2(ty - caster.y, tx - caster.x));
    const ox = originX ?? caster.x;
    const oy = originY ?? caster.y;
    const dx = tx - ox, dy = ty - oy;
    const d = Math.hypot(dx, dy) || 1;
    void scene;
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    // Thrown, not fired: a puff off the hand and a flash off the blade.
    this.fx(owner).smoke(ox, oy, 2, { angle: Math.atan2(dy, dx), spread: 0.5, speed: 60, size: 3, life: 300, depth: D_AIR - 1 });
    list.push({
      owner, color,
      x: ox, y: oy,
      destX: tx, destY: ty, dirX: dx / d, dirY: dy / d,
      state: 'flying', hitSet: new Set<Fighter>(),
    });
  }

  // ── Sonic Boom (perk) ────────────────────────────────────────────────────

  /**
   * The crack a recalled blade leaves behind: a flat AoE that shoves and staggers rather
   * than killing, so the perk is about controlling the room the daggers just crossed.
   */
  private _sonicBoom(x: number, y: number, owner: 'player' | 'npc'): void {
    const time = this.api.scene.time.now;
    this.api.dealAoeDamage(owner, x, y, BOOM_RADIUS, BOOM_DAMAGE);

    for (const f of this._foes(owner)) {
      if (!f || !f.active || f.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(x, y, f.x, f.y);
      if (d > BOOM_RADIUS) continue;
      const ang = Math.atan2(f.y - y, f.x - x);
      this.knocks.set(f, {
        vx: Math.cos(ang) * BOOM_KNOCKBACK, vy: Math.sin(ang) * BOOM_KNOCKBACK,
        until: time + BOOM_KNOCK_MS,
      });
      // The stagger runs on from the shove, so being caught close is a real tempo loss.
      if (f === this.api.player) this.playerStunUntil = Math.max(this.playerStunUntil, time + BOOM_KNOCK_MS + BOOM_STAGGER_MS);
      else this.npcStunUntil = Math.max(this.npcStunUntil, time + BOOM_KNOCK_MS + BOOM_STAGGER_MS);
      this.api.showFloatingText(f.x, f.y - 40, '💥 SONIC BOOM', '#ffcc66');
    }

    this.booms.push({ x, y, owner, bornAt: time });
    this.api.scene.cameras.main.shake(140, 0.004);
  }

  private _updateBooms(time: number): void {
    for (let i = this.booms.length - 1; i >= 0; i--) {
      if (time - this.booms[i].bornAt >= BOOM_DRAW_MS) this.booms.splice(i, 1);
    }
  }

  /**
   * A boom drawn as pressure, not as an explosion: two shock rings racing out at different
   * speeds, a compressed core, and streaks of displaced air torn off the leading edge.
   */
  private _paintBooms(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const b of this.booms) {
      const k = Phaser.Math.Clamp((time - b.bornAt) / BOOM_DRAW_MS, 0, 1);
      const col = this.col(b.owner);
      const fade = 1 - k;

      // Leading shock: thin, fast, nearly gone by the end.
      g.lineStyle(2 + 3 * fade, col(SUB.steelHi), 0.75 * fade);
      g.strokeCircle(b.x, b.y, BOOM_RADIUS * (0.25 + 0.9 * k));
      // Trailing shock: fatter and slower, so the two never overlap.
      g.lineStyle(1.5 + 2 * fade, col(SUB.gold), 0.5 * fade * fade);
      g.strokeCircle(b.x, b.y, BOOM_RADIUS * (0.1 + 0.55 * k));
      // The compressed core collapsing in on itself.
      g.fillStyle(col(SUB.steelHi), 0.35 * fade * fade);
      g.fillCircle(b.x, b.y, 12 * fade);

      // Air torn off the front edge in spokes.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + b.bornAt * 0.001;
        const r0 = BOOM_RADIUS * (0.25 + 0.9 * k);
        const len = 10 * fade + 4;
        g.lineStyle(1.5, col(i % 2 === 0 ? SUB.steelHi : SUB.gold), 0.5 * fade);
        g.beginPath();
        g.moveTo(b.x + Math.cos(a) * (r0 - len), b.y + Math.sin(a) * (r0 - len));
        g.lineTo(b.x + Math.cos(a) * r0, b.y + Math.sin(a) * r0);
        g.strokePath();
      }
    }
  }

  private _recallDaggers(owner: 'player' | 'npc'): void {
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    let any = false;
    for (const d of list) {
      if (d.state !== 'returning') {
        d.state = 'returning'; d.hitSet.clear(); any = true;
        // Sonic Boom perk: the blade leaves a hole in the air where it was standing.
        d.recallFromX = d.x; d.recallFromY = d.y; d.boomed = false;
      }
    }
    if (any) {
      const caster = owner === 'player' ? this.api.player : this.api.npc;
      // A beckon rather than a throw: the hands snap back to the chest and the blades follow.
      this.avatarFor(owner)?.play('clap');
      for (const d of list) {
        this.fx(owner).cut(d.x, d.y, Math.atan2(caster.y - d.y, caster.x - d.x), 20,
          { color: SUB.steelHi, scores: 1, duration: 200, depth: D_AIR });
      }
      this.api.showFloatingText(caster.x, caster.y - 34, 'Recall!', '#ffaaaa');
    }
  }

  private _playerClickDaggers(tx: number, ty: number): void {
    if (this.api.scene.time.now < this.daggerNextAt.player) return;
    const out = this.playerDaggers.filter(d => d.state !== 'returning').length;
    if (out >= this._daggerMax('player')) {
      this._recallDaggers('player');
      this._daggerWait('player', DAGGER_RECALL_LOCK_MS);
      return;
    }
    this._daggerWait('player', DAGGER_GAP_MS);
    this.api.player.onKitCast?.('sub-cutter');
    this._throwDagger('player', tx, ty, this._pickBalancedColor('player'));
    // Crystal copy: active clones also throw daggers (extras beyond the 3-dagger cap)
    for (const pos of this.api.crystalClonePositions('player')) {
      this._throwDagger('player', tx, ty, this._pickBalancedColor('player'), pos.x, pos.y);
    }
  }

  private _updateDaggers(list: SubDagger[], owner: 'player' | 'npc', dt: number): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const enemies = this._foes(owner);
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      if (d.state === 'flying') {
        d.x += d.dirX * DAGGER_SPEED * dt;
        d.y += d.dirY * DAGGER_SPEED * dt;
        const remaining = (d.destX - d.x) * d.dirX + (d.destY - d.y) * d.dirY;
        if (remaining <= 0 || Phaser.Math.Distance.Between(d.x, d.y, d.destX, d.destY) <= DAGGER_ARRIVE_R) {
          d.x = d.destX; d.y = d.destY; d.state = 'planted';
        }
        this._daggerHit(d, enemies, DAGGER_THROW_DMG);
      } else if (d.state === 'returning') {
        const dx = caster.x - d.x, dy = caster.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        d.dirX = dx / dist; d.dirY = dy / dist;
        d.x += d.dirX * DAGGER_SPEED * dt;
        d.y += d.dirY * DAGGER_SPEED * dt;
        this._daggerHit(d, enemies, DAGGER_RETURN_DMG);
        if (dist <= DAGGER_ARRIVE_R + 6) {
          // Sonic Boom perk: it got home ahead of its own noise, which lands where it left.
          if (!d.boomed && this.api.hasPerk(owner, 'sonic-boom')
              && d.recallFromX !== undefined && d.recallFromY !== undefined) {
            this._sonicBoom(d.recallFromX, d.recallFromY, owner);
            d.boomed = true;
          }
          list.splice(i, 1); continue;
        }
      }
    }
  }

  private _daggerHit(d: SubDagger, enemies: Fighter[], dmg: number): void {
    for (const t of enemies) {
      if (!t.active || t.hp <= 0 || d.hitSet.has(t)) continue;
      if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) <= 20) {
        d.hitSet.add(t);
        t.takeDamage(dmg);
        this.api.spawnHitFlash(t.x, t.y, this.col(d.owner)(DAGGER_FILL[d.color]));
        // The recall hits harder and cuts deeper, so it gets the bigger arc.
        this.fx(d.owner).cut(t.x, t.y, Math.atan2(d.dirY, d.dirX), dmg > DAGGER_THROW_DMG ? 42 : 30, {
          color: d.color === 'red' ? SUB.scarlet : SUB.steelHi,
          scores: dmg > DAGGER_THROW_DMG ? 3 : 2, depth: D_AIR,
        });
        this._addSprayAmmoFromDamage(d.owner, dmg);
        this._noteSmokeAttack(d.owner);
        // Sonic Boom perk: a blade that connects on the way back breaks on them instead.
        if (!d.boomed && d.state === 'returning' && this.api.hasPerk(d.owner, 'sonic-boom')) {
          this._sonicBoom(t.x, t.y, d.owner);
          d.boomed = true;
        }
      }
    }
  }

  // ── Purchases (the money bars' wares) ────────────────────────────────────

  private _daggerMax(owner: 'player' | 'npc'): number {
    return this.api.scene.time.now < this.fiveUntil[owner] ? FIVE_DAGGER_MAX : DAGGER_MAX;
  }

  /** Click+ Full Set: five blades instead of three for ten seconds. */
  private _buyFive(owner: 'player' | 'npc'): boolean {
    const time = this.api.scene.time.now;
    if (time < this.fiveUntil[owner] || !this._canPay(owner, FIVE_COST)) return false;
    this._pay(owner, FIVE_COST);
    this.fiveUntil[owner] = time + FIVE_MS;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    // Two more knives out of the coat, fanned.
    for (const off of [-0.5, 0.5]) {
      this.fx(owner).cut(f.x, f.y, f.facingAngle + off, 34, { color: SUB.steelHi, scores: 1, duration: 260, depth: D_AIR });
    }
    return true;
  }

  /** E+ Luxury Rounds: 35 rounds that hit for 3 and go exactly where they are pointed. */
  private _buyLux(owner: 'player' | 'npc'): boolean {
    if (this.lux[owner] > 0 || !this._canPay(owner, LUX_COST)) return false;
    this._pay(owner, LUX_COST);
    this.lux[owner] = LUX_ROUNDS;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    this.fx(owner).cash(f.x, f.y, 4, { speed: 110, size: 12, life: 520, depth: D_AIR, seal: SUB.gold });
    return true;
  }

  /** Q+ On Retainer: pay to run the stolen ultimate again while the contract is open. */
  private _buyRetainer(owner: 'player' | 'npc'): boolean {
    const time = this.api.scene.time.now;
    const id = owner === 'player' ? this.retainerElementId : this.npcRetainerElementId;
    const until = owner === 'player' ? this.retainerUntil : this.npcRetainerUntil;
    const channelling = (owner === 'player' ? this.treacheryFiresAt : this.npcTreacheryFiresAt) > 0;
    if (!id || time >= until || channelling || !this._canPay(owner, RETAINER_COST)) return false;
    this._pay(owner, RETAINER_COST);
    this._executeTreachery(owner, time, id);
    return true;
  }

  /** The specialists a side can pick from: the Rolodex three, plus the Bard when Moral is equipped. */
  private _recruitOrder(owner: 'player' | 'npc'): RecruitType[] {
    return this.api.hasPerk(owner, 'moral') ? [...ROLODEX, 'bard'] : ROLODEX;
  }

  /** Lock a side's throwing hand for `ms`, remembering the length so the card can draw it. */
  private _daggerWait(owner: 'player' | 'npc', ms: number): void {
    this.daggerNextAt[owner] = this.api.scene.time.now + ms;
    this.daggerWaitMs[owner] = ms;
  }

  /** The contract lapses on its own once the window shuts. */
  private _tickRetainerWindow(time: number): void {
    if (this.retainerElementId !== null && time >= this.retainerUntil) this.retainerElementId = null;
  }

  // ── Money bars ───────────────────────────────────────────────────────────
  //
  // Everything an upgrade lets you *buy* is a bar you click: one above each ability card, and
  // one over the head of any recruit who has a favour to sell. They are rebuilt from scratch
  // every frame from live state, so there is nothing to keep in sync and nothing to tear down.

  private _buildButtons(time: number): void {
    const b: MoneyButton[] = [];
    this.buttons = b;
    const { player } = this.api;
    if (!player.active || player.hp <= 0) return;
    const riding = this.rides.isRiding('player');
    const cards = this.api.cardRects();
    const bar = (abilityId: string): { x: number; y: number; w: number; h: number } | null => {
      const c = cards.find((k) => k.abilityId === abilityId);
      return c ? { x: c.x + 3, y: c.y - BAR_H - BAR_GAP, w: c.w - 6, h: BAR_H } : null;
    };
    const tell = (id: string): void => this.api.broadcastMasteryCast(id);
    const full = this._crewOf('player').length >= CREW_MAX;

    // E+ — the one bar that still works from the driver's seat.
    const eBar = this._up('player', 'e') ? bar('sub-spray') : null;
    if (eBar) {
      b.push({
        ...eBar, id: 'lux', cost: LUX_COST, icon: 'luxury',
        progress: this.lux.player > 0 ? this.lux.player / LUX_ROUNDS : -1, blocked: this.lux.player > 0,
        act: () => { if (this._buyLux('player')) tell('subx-lux'); },
      });
    }
    if (riding) return;

    const clickBar = this._up('player', 'click') ? bar('sub-cutter') : null;
    if (clickBar) {
      const on = time < this.fiveUntil.player;
      b.push({
        ...clickBar, id: 'five', cost: FIVE_COST, icon: 'daggers',
        progress: on ? (this.fiveUntil.player - time) / FIVE_MS : -1, blocked: on,
        act: () => { if (this._buyFive('player')) tell('subx-five'); },
      });
    }

    const rBar = this._up('player', 'r') ? bar('sub-recruit') : null;
    if (rBar) {
      b.push({
        ...rBar, id: 'rolodex', cost: RECRUIT_COST.enforcer, icon: 'crew', progress: -1,
        blocked: full, open: this.rolodexOpen,
        act: () => { this.rolodexOpen = !this.rolodexOpen; },
      });
      if (this.rolodexOpen && !full) {
        this._recruitOrder('player').forEach((type, i) => {
          b.push({
            x: rBar.x, y: rBar.y - (BAR_H + 2) * (i + 1), w: rBar.w, h: BAR_H,
            id: `hire:${type}`, cost: RECRUIT_COST[type], icon: RECRUIT_ICON[type], progress: -1,
            act: () => {
              const foe = this._nearestFoe('player', player.x, player.y);
              if (this._tryHire('player', type, foe?.x, foe?.y)) tell(`subx-hire:${type}`);
              this.rolodexOpen = false;
            },
          });
        });
      }
    } else {
      this.rolodexOpen = false;
    }

    const fPlus = this._up('player', 'f');
    const fBar = fPlus ? bar('sub-bribe') : null;
    if (fBar) {
      const bag = this._stashOf('player');
      b.push({
        ...fBar, id: 'stash', cost: STASH_COST, icon: 'stash',
        progress: bag ? 1 - (time - bag.bornAt) / STASH_MS : -1, blocked: !!bag,
        act: () => { if (this._buyStash('player')) tell('subx-stash'); },
      });
    }

    const qBar = this._up('player', 'q') && this.retainerElementId && time < this.retainerUntil
      ? bar('sub-treachery') : null;
    if (qBar) {
      b.push({
        ...qBar, id: 'retainer', cost: RETAINER_COST, icon: 'retainer',
        progress: (this.retainerUntil - time) / RETAINER_MS,
        act: () => { if (this._buyRetainer('player')) tell('subx-retainer'); },
      });
    }

    // Favours: whatever a level-3 recruit has to sell hangs over his head.
    const crew = this._crewOf('player');
    crew.forEach((l, idx) => {
      if (l.level < CREW_MAX_LEVEL || l.lifted) return;
      const at = { x: l.x - HEAD_BTN_W / 2, y: l.y - 55, w: HEAD_BTN_W, h: HEAD_BTN_H };
      if (l.type === 'thug' && l.reloadingUntil > time) {
        b.push({
          ...at, id: `reload:${idx}`, cost: THUG_RELOAD_COST, icon: 'reload',
          progress: (l.reloadingUntil - time) / THUG_RELOAD_MS,
          act: () => { if (this._buyReload(l)) tell(`subx-reload:${l.nid}`); },
        });
      } else if (l.type === 'enforcer') {
        b.push({
          ...at, id: `chopper:${idx}`, cost: HELI_COST, icon: 'chopper', progress: -1,
          blocked: time < l.favourReadyAt, open: this.heliAim?.enforcer === l,
          act: () => {
            if (this.money < HELI_COST) return;
            this.heliAim = this.heliAim?.enforcer === l ? null : { enforcer: l, crew: null };
          },
        });
      } else if (l.type === 'sniper') {
        const inbound = this._strikeInbound('player');
        b.push({
          ...at, id: `airstrike:${idx}`, cost: STRIKE_COST, icon: 'airstrike',
          progress: inbound ? 1 - (time - inbound.calledAt) / STRIKE_DELAY_MS : -1,
          blocked: !!inbound || time < l.favourReadyAt,
          act: () => { if (this._callStrike(l)) tell(`subx-strike:${l.nid}`); },
        });
      } else if (l.type === 'medic') {
        const on = time < this.saviorUntil.player;
        b.push({
          ...at, id: `savior:${idx}`, cost: SAVIOR_COST, icon: 'savior',
          progress: on ? (this.saviorUntil.player - time) / SAVIOR_MS : -1, blocked: on,
          act: () => { if (this._buySavior(l)) tell(`subx-savior:${l.nid}`); },
        });
      }
    });
  }

  /** A press landed on a money bar: it is spent there and never becomes a dagger. */
  private _clickButtons(x: number, y: number): boolean {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) continue;
      if (!b.blocked) b.act();
      return true;
    }
    return false;
  }

  /**
   * The Enforcer's helicopter is aimed in two clicks: a recruit, then the spot to put him.
   * A click on nothing calls it off.
   */
  private _clickHeliAim(x: number, y: number): void {
    const aim = this.heliAim;
    if (!aim) return;
    if (!this.lackeys.includes(aim.enforcer)) { this.heliAim = null; return; }
    if (!aim.crew) {
      const pick = this._crewOf('player')
        .filter((l) => !l.lifted && l.type !== 'bard')
        .find((l) => Phaser.Math.Distance.Between(x, y, l.x, l.y) <= 26);
      if (pick) aim.crew = pick; else this.heliAim = null;
      return;
    }
    // The drop point is the click, which the message already carries as its (mirrored) aim.
    if (this.lackeys.includes(aim.crew) && this._callHeli(aim.enforcer, aim.crew, x, y)) {
      this.api.broadcastMasteryCast(`subx-heli:${aim.enforcer.nid}:${aim.crew.nid}`);
    }
    this.heliAim = null;
  }

  private _paintHud(time: number, isPlayerSub: boolean): void {
    if (!this.hudGfx || !this.hudGfx.active) this.hudGfx = this.api.scene.add.graphics().setDepth(23);
    const g = this.hudGfx;
    g.clear();
    if (!isPlayerSub) return;
    const t = time / 1000;
    const p = this.api.pointer;
    for (const b of this.buttons) {
      const hover = p.worldX >= b.x && p.worldX <= b.x + b.w && p.worldY >= b.y && p.worldY <= b.y + b.h;
      drawMoneyButton(g, this.pcol, b.x, b.y, b.w, b.h, t, {
        cost: b.cost, affordable: this.money >= b.cost && !b.blocked, hover: hover && !b.blocked,
        progress: b.progress < 0 ? -1 : Phaser.Math.Clamp(b.progress, 0, 1), icon: b.icon, open: b.open,
      });
    }
    // Helicopter targeting: who can be picked up, then where he is going.
    if (this.heliAim) {
      if (!this.heliAim.crew) {
        for (const l of this._crewOf('player')) {
          if (!l.lifted && l.type !== 'bard') drawSelectRing(g, this.pcol, l.x, l.y, 22, SUB.gold, t, 1);
        }
      } else {
        drawSelectRing(g, this.pcol, this.heliAim.crew.x, this.heliAim.crew.y, 22, SUB.scarlet, t, 1);
        drawDropMarker(g, this.pcol, p.worldX, p.worldY, t, 1);
      }
    }
    // Hijack, mid-charge: which ride the hold has reached, and which the wallet can reach.
    if (this.hijackChargeAt > 0) {
      const held = time - this.hijackChargeAt;
      const tier = this._hijackTier(time);
      const next = HIJACK_TIER_MS[tier] ?? 0;
      const frac = tier >= 4 || tier >= this.money ? 1
        : Phaser.Math.Clamp((held - HIJACK_TIER_MS[tier - 1]) / Math.max(1, next - HIJACK_TIER_MS[tier - 1]), 0, 1);
      drawHijackCharge(g, this.pcol, this.api.player.x, this.api.player.y - 74, tier,
        Math.min(4, this.money), frac, t, 1);
    }
  }

  // ── Mastery: Hijack (bindable) ───────────────────────────────────────────

  /** The slot a mastery ability is bound over this match, or null when it isn't bound anywhere. */
  private _bindSlot(enhId: string): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.api.masteryActive) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.api.masteryBindFor(s) === enhId) return s;
    }
    return null;
  }

  private _keyOf(slot: 'e' | 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    const { api } = this;
    return slot === 'e' ? api.eKey : slot === 'r' ? api.rKey : slot === 'f' ? api.fKey : api.qKey;
  }

  /** Which ride the current hold has earned: time buys the tier, the wallet caps it. */
  private _hijackTier(time: number): number {
    const held = time - this.hijackChargeAt;
    let tier = 1;
    for (let i = 1; i < HIJACK_TIER_MS.length; i++) if (held >= HIJACK_TIER_MS[i]) tier = i + 1;
    return Math.min(tier, this.money, 4);
  }

  /** Tap for the car; hold for something better, at a note a step. */
  private _hijackInput(time: number, key: Phaser.Input.Keyboard.Key, pointer: Phaser.Input.Pointer): void {
    const { player } = this.api;
    if (this.rides.isRiding('player')) { this.hijackChargeAt = 0; return; }
    if (Phaser.Input.Keyboard.JustDown(key)
        && time - this.hijackLastAt >= HIJACK_COOLDOWN_MS && this.money >= 1) {
      this.hijackChargeAt = time;
    }
    if (this.hijackChargeAt <= 0 || key.isDown) return;
    const tier = this._hijackTier(time);
    this.hijackChargeAt = 0;
    if (tier < 1) return;
    this._spendMoney('player', tier);
    this.hijackLastAt = time;
    const kind = RIDE_BY_TIER[tier - 1];
    const aim = Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x);
    const reach = RIDE_SPECS[kind].radius + 26;
    this.avatarFor('player')?.play('sweep', aim);
    this.rides.spawn('player', kind, player.x + Math.cos(aim) * reach, player.y + Math.sin(aim) * reach, aim);
    this.api.broadcastMasteryCast(`subx-ride:${kind}`);
  }

  /** Space belongs to the ride while you are in one, or standing at the door of one. */
  claimsSpace(): boolean {
    return this.api.elementId === 'subterfuge'
      && (this.rides.isRiding('player') || this.rides.canEnter('player'));
  }

  /** Savior (Medic level 3): a spring in the boss's step while he is being patched up. */
  getPlayerSpeedMult(): number {
    return this.lackeys.some((l) => l.owner === 'player' && l.type === 'medic' && l.level >= 3 && l.healing && !l.lifted)
      ? MEDIC_SPEED_L3 : 1;
  }

  /** Same boost for the other side's body. */
  getNpcSpeedMult(): number {
    return this.lackeys.some((l) => l.owner === 'npc' && l.type === 'medic' && l.level >= 3 && l.healing && !l.lifted)
      ? MEDIC_SPEED_L3 : 1;
  }

  /**
   * Tray bars the kit owns: the Click card shows the hand coming back, and the Hijack card
   * shows its cooldown, the charge while held, or the tank's gun reloading.
   */
  getBarRatio(abilityId: string, time: number): number {
    if (abilityId === 'sub-cutter') {
      return Phaser.Math.Clamp(1 - (this.daggerNextAt.player - time) / this.daggerWaitMs.player, 0, 1);
    }
    if (abilityId === 'hijack') {
      if (this.rides.isRiding('player')) return this.rides.cannonRatio('player', time);
      if (this.hijackChargeAt > 0) return Phaser.Math.Clamp(this._hijackTier(time) / 4, 0, 1);
      return Phaser.Math.Clamp((time - this.hijackLastAt) / HIJACK_COOLDOWN_MS, 0, 1);
    }
    return 1;
  }

  /** Put back whichever damage absorber this kit had on a fighter before a ride borrowed the slot. */
  private _rearmAbsorbers(owner: 'player' | 'npc'): void {
    const time = this.api.scene.time.now;
    if (time < (owner === 'player' ? this.linkUntil : this.npcLinkUntil)) this._armLinkAbsorber(owner);
    else if (time < (owner === 'player' ? this.overchargeUntil : this.npcOverchargeUntil)) this._armOvercharge(owner);
  }

  // ── CastContext dispatchers ──────────────────────────────────────────────

  doPlayerCutter(tx: number, ty: number): void {
    if (this.api.elementId !== 'subterfuge') return;
    if (this.rides.isRiding('player')) return;
    this._playerClickDaggers(tx, ty);
  }

  /** NPC Molecular Cutter — throws daggers on a cadence, recalling once the max are out. */
  doNpcCutter(tx: number, ty: number): void {
    const time = this.api.scene.time.now;
    if (time < this.daggerNextAt.npc) return;
    const out = this.npcDaggers.filter(d => d.state !== 'returning').length;
    if (out >= this._daggerMax('npc')) {
      // Blades standing in the floor are what an inbound air strike aims by: leave them be.
      if (this._strikeInbound('npc')) return;
      if (this.npcDaggers.some(d => d.state === 'planted')) {
        this._recallDaggers('npc');
        this._daggerWait('npc', DAGGER_RECALL_LOCK_MS);
      }
      return;
    }
    this._throwDagger('npc', tx, ty, this._pickBalancedColor('npc'));
    this._daggerWait('npc', DAGGER_GAP_MS);
  }

  /** NPC Spray — a short burst toward the target; buys a reload when dry. */
  doNpcSpray(tx: number, ty: number): void {
    const { scene, npc } = this.api;
    if (this.npcBullets <= 0 && this.lux.npc <= 0) {
      if (this._canPay('npc', 1)) {
        this._pay('npc', 1);
        this.npcBullets = Math.min(this._bulletsMax('npc'), BULLETS_RELOAD);
      }
      return;
    }
    const shots = Math.min(8, this.npcBullets + this.lux.npc);
    for (let i = 0; i < shots; i++) {
      scene.time.delayedCall(i * 60, () => {
        if (!npc.active || npc.hp <= 0) return;
        this._fireSprayShot('npc', tx, ty);
      });
    }
  }

  /**
   * NPC Recruit. A bot with the Rolodex spends up to a specialist when it can afford one,
   * favouring whichever it does not already have; a replica only ever hires what its owner's
   * R press hired, which is a Thug (specialists arrive by their own message).
   */
  doNpcRecruit(tx?: number, ty?: number): void {
    // A replica only makes the call here; the Thug arrives as his own `subx-crew` message.
    if (this._ghost('npc')) { void tx; void ty; this.gesture('npc', 'sub-recruit'); return; }
    const aim = this.api.player;
    if (this._up('npc', 'r') && this.npcMoney >= RECRUIT_COST.enforcer && Math.random() < 0.65) {
      const have = new Set(this._crewOf('npc').map((l) => l.type));
      const fresh = ROLODEX.filter((t) => !have.has(t));
      const pool = fresh.length > 0 ? fresh : ROLODEX;
      if (this._tryHire('npc', pool[Math.floor(Math.random() * pool.length)], aim.x, aim.y)) return;
    }
    this._tryHire('npc', 'thug', aim.x, aim.y);
  }

  doNpcBribe(tx: number, ty: number): void {
    if (!this._canPay('npc', 1)) return;
    if (this._doBribe('npc', tx, ty, this.api.scene.time.now)) this._pay('npc', 1);
  }

  // ── Bot: opportunities and purchases ─────────────────────────────────────

  /**
   * A recruit of the bot's own worth a Bribe right now — one a note would promote (F+), or one
   * about to walk out. Side-effect-free; the AI aims its F here before anything else.
   */
  getNpcBribeAim(): { x: number; y: number } | null {
    if (this.npcMoney < 1) return null;
    const crew = this._crewOf('npc').filter((l) => !l.lifted && l.type !== 'bard');
    if (crew.length === 0) return null;
    const leaving = crew.find((l) => l.loyaltyMs < l.loyaltyMaxMs * 0.25);
    if (leaving) return { x: leaving.x, y: leaving.y };
    if (!this._up('npc', 'f')) return null;
    // Closest to the top first: a favour is worth more than a third level-1.
    const rising = crew.filter((l) => l.level < CREW_MAX_LEVEL).sort((a, b) => b.level - a.level)[0];
    return rising ? { x: rising.x, y: rising.y } : null;
  }

  /** True while the bot has room on the payroll and the note to fill it. */
  getNpcCanRecruit(): boolean {
    return this.npcMoney >= 1 && this._crewOf('npc').length < CREW_MAX;
  }

  /**
   * The money bars, for a bot: nobody clicks for it, so the kit presses them — each only when
   * the thing it pays for is actually set up (blades in the floor for the strike, a dry drum
   * for the reload, an Enforcer out of reach for the helicopter).
   */
  private npcBrainNextAt = 0;
  private _tickNpcBrain(time: number): void {
    if (this._ghost('npc') || time < this.npcBrainNextAt) return;
    this.npcBrainNextAt = time + 600;
    const { npc, player } = this.api;
    if (!npc.active || npc.hp <= 0) return;
    const hpRatio = npc.hp / npc.maxHp;

    // Favours first: they are the dearest things on the payroll.
    if (this._up('npc', 'f')) {
      for (const l of this._crewOf('npc')) {
        if (l.level < CREW_MAX_LEVEL || l.lifted) continue;
        if (l.type === 'medic' && hpRatio < 0.35 && this._buySavior(l)) return;
        if (l.type === 'thug' && l.reloadingUntil > time + 2000 && this._buyReload(l)) return;
        if (l.type === 'sniper' && this._plantedDaggers('npc').length >= 2 && this._callStrike(l)) return;
        if (l.type === 'enforcer' && player.active
            && Phaser.Math.Distance.Between(l.x, l.y, player.x, player.y) > ENF_RANGE_L2 + 60) {
          // Drop him just short of the target, on the bot's side of it.
          const a = Math.atan2(npc.y - player.y, npc.x - player.x);
          if (this._callHeli(l, l, player.x + Math.cos(a) * 130, player.y + Math.sin(a) * 130)) return;
        }
      }
      // Laundering: only when nobody is in its face.
      if (this.npcMoney >= 1 && this.npcMoney < this._moneyMax('npc') && hpRatio > 0.4
          && Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) > 260
          && Math.random() < 0.4 && this._buyStash('npc')) return;
    }
    if (this._up('npc', 'e') && this.npcBullets < 10 && this._buyLux('npc')) return;
    if (this._up('npc', 'click') && this.npcMoney >= FIVE_COST + 1
        && this.npcDaggers.length >= DAGGER_MAX - 1 && this._buyFive('npc')) return;
  }

  // ── Online replay ────────────────────────────────────────────────────────

  /**
   * The remote Subterfuge player bought something off a money bar, or did something with a
   * ride. None of it touches a cooldown, so each arrives as its own `subx-` message.
   */
  replayNet(id: string, tx: number, ty: number): void {
    const [head, ...args] = id.slice('subx-'.length).split(':');
    const crew = this._crewOf('npc');
    // Crew are named by payroll number, never by where they sit in this machine's list.
    const at = (i: string | undefined): Lackey | undefined => crew.find((l) => l.nid === Number(i));
    const { npc } = this.api;
    switch (head) {
      case 'five': this._buyFive('npc'); break;
      case 'lux': this._buyLux('npc'); break;
      case 'stash': this._buyStash('npc'); break;
      case 'retainer': this._buyRetainer('npc'); break;
      // The man himself arrives as `crew`; this is only the boss making the call.
      case 'hire': this.gesture('npc', 'sub-recruit'); break;
      case 'crew': {
        const type = args[0] as RecruitType, nid = Number(args[1]);
        if (!(type in RECRUIT_COST) || !Number.isFinite(nid) || at(args[1])) break;
        // Their payroll has room for him, so ours must: whoever we still hold past the cap
        // already left over there and the word has not reached us.
        for (let over = crew.length - CREW_MAX; over >= 0; over--) {
          const stale = this._crewOf('npc')[0];
          if (stale) this.lackeys.splice(this.lackeys.indexOf(stale), 1);
        }
        // Positions cross the wire mirrored, like every other coordinate.
        this._spawnLackey('npc', type, tx, ty, { nid, x: this.api.sceneWidth - Number(args[2]), y: Number(args[3]) });
        break;
      }
      case 'gone': {
        const l = at(args[0]);
        if (!l) break;
        if (args[1] !== 'x') { l.ignited = args[1] === '1'; this._crewLeaves(l); }
        this.lackeys.splice(this.lackeys.indexOf(l), 1);
        break;
      }
      case 'lvl': {
        const l = at(args[0]);
        const level = Phaser.Math.Clamp(Number(args[1]) || 0, 0, CREW_MAX_LEVEL);
        if (l && l.level !== level) {
          l.level = level;
          if (l.reloadingUntil <= 0 && l.bullets > 0) l.bullets = Math.max(l.bullets, this._mag(l));
        }
        break;
      }
      case 'reload': { const l = at(args[0]); if (l) this._buyReload(l); break; }
      case 'strike': { const l = at(args[0]); if (l) this._callStrike(l); break; }
      case 'savior': { const l = at(args[0]); if (l) this._buySavior(l); break; }
      case 'heli': {
        const enf = at(args[0]), who = at(args[1]);
        if (enf && who) this._callHeli(enf, who, tx, ty);
        break;
      }
      case 'ride': {
        const kind = args[0] as RideKind;
        if (!RIDE_SPECS[kind]) break;
        const aim = Math.atan2(ty - npc.y, tx - npc.x);
        const reach = RIDE_SPECS[kind].radius + 26;
        this.rides.spawn('npc', kind, npc.x + Math.cos(aim) * reach, npc.y + Math.sin(aim) * reach, aim);
        break;
      }
      case 'ride-in': this.rides.mount('npc'); break;
      case 'ride-out': this.rides.dismount('npc', true); break;
      case 'ride-boom': this.rides.destroyRemote('npc'); break;
      case 'shell': this.rides.fireCannon('npc', tx, ty, this.api.scene.time.now); break;
      default: break;
    }
  }

  // ── Mastery: Smoke Break (bindable) ──────────────────────────────────────

  private _cigaretteOf(owner: 'player' | 'npc'): Cigarette | undefined {
    return this.cigarettes.find(c => c.owner === owner);
  }

  /**
   * 0 = just cast, 1 = ready. While a cigarette is lit the bar shows what is left of it
   * instead — the burn time is the number that actually matters, and it shrinks with every
   * hit rather than on a clock.
   */
  getSmokeBreakCooldownRatio(time: number): number {
    const cig = this._cigaretteOf('player');
    if (cig) return Phaser.Math.Clamp(cig.msLeft / CIG_BURN_MS, 0, 1);
    return Math.min(1, (time - this.smokeLastCastAt) / SMOKE_COOLDOWN_MS);
  }

  /** Press: light up, or flick the one already in your mouth at the cursor. */
  private _trySmokeBreak(time: number, tx: number, ty: number): void {
    const { player } = this.api;
    if (this._cigaretteOf('player')) {
      this._tossCigarette('player', tx, ty);
      this.api.broadcastMasteryCast('smoke-break-toss');
      return;
    }
    if (time - this.smokeLastCastAt < SMOKE_COOLDOWN_MS) return;
    this.smokeLastCastAt = time;
    this._lightCigarette('player');
    // Private timer, so this cast never flows through onCastStamp — broadcast it by hand.
    this.api.broadcastMasteryCast('smoke-break');
    this.api.showFloatingText(player.x, player.y - 44, '🚬 Smoke Break', '#cccc99');
  }

  /** Online replay: the remote Subterfuge player lit up. */
  doNpcSmokeBreak(): void {
    if (this._cigaretteOf('npc')) return;
    this._lightCigarette('npc');
  }

  /** Online replay: the remote Subterfuge player flicked their cigarette at us. */
  doNpcSmokeToss(tx: number, ty: number): void {
    this._tossCigarette('npc', tx, ty);
  }

  private _lightCigarette(owner: 'player' | 'npc'): void {
    const f = owner === 'player' ? this.api.player : this.api.npc;
    this.cigarettes.push({ owner, msLeft: CIG_BURN_MS, smokeAccumMs: 0 });
    // The match: a flare at the mouth and the first drag going up.
    this.fx(owner).flash(f.x + 13, f.y - 3, 10, D_AIR, SUB.ember);
    this.fx(owner).smoke(f.x + 13, f.y - 6, 3, { speed: 24, size: 4, life: 700, depth: D_AIR });
  }

  private _tossCigarette(owner: 'player' | 'npc', tx: number, ty: number): void {
    const idx = this.cigarettes.findIndex(c => c.owner === owner);
    if (idx < 0) return;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    this.cigarettes.splice(idx, 1);

    this.smokeTosses.push({ owner, x: f.x, y: f.y, destX: tx, destY: ty });
    this.api.showFloatingText(f.x, f.y - 44, '🚬 Flick!', '#cccc99');
  }

  private _spawnSmokeCloud(owner: 'player' | 'npc', x: number, y: number): void {
    const puffs: SmokeCloud['puffs'] = [];
    for (let i = 0; i < SMOKE_PUFF_COUNT; i++) {
      // First puff sits dead centre so the middle never thins out.
      const a = (i / SMOKE_PUFF_COUNT) * Math.PI * 2 + Math.random();
      const d = i === 0 ? 0 : SMOKE_CLOUD_RADIUS * (0.25 + Math.random() * 0.42);
      puffs.push({
        ox: Math.cos(a) * d, oy: Math.sin(a) * d,
        r: SMOKE_CLOUD_RADIUS * (i === 0 ? 0.72 : 0.42 + Math.random() * 0.22),
        phase: Math.random() * Math.PI * 2,
        speed: 0.0006 + Math.random() * 0.0009,
      });
    }
    this.smokeClouds.push({
      owner, x, y, radius: SMOKE_CLOUD_RADIUS,
      endsAt: this.api.scene.time.now + SMOKE_CLOUD_MS,
      puffs, wispAccumMs: 0,
    });
    // It does not fade in — it bursts, then settles.
    this.fx(owner).smoke(x, y, 10, {
      speed: SMOKE_CLOUD_RADIUS * 1.5, size: 10, life: 700, depth: D_GROUND + 1, drift: -6,
      color: owner === 'player' ? SUB.ash : SUB.ashDark,
    });
    this.api.showFloatingText(x, y - SMOKE_CLOUD_RADIUS * 0.6, '💨 Smoke Screen!', '#bbbbaa');
  }

  /** True while (x, y) sits inside a smoke cloud this owner laid down. */
  private _inOwnSmoke(owner: 'player' | 'npc', x: number, y: number): boolean {
    for (const c of this.smokeClouds) {
      if (c.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y) <= c.radius) return true;
    }
    return false;
  }

  /** Landing a hit from inside your own cloud gives your position away for 3s. */
  private _noteSmokeAttack(owner: 'player' | 'npc'): void {
    if (this.smokeClouds.length === 0) return;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    if (!this._inOwnSmoke(owner, f.x, f.y)) return;
    const now = this.api.scene.time.now;
    if (this.smokeExposedUntil[owner] < now) {
      this.api.showFloatingText(f.x, f.y - 52, '👁️ Exposed!', '#ffcc66');
    }
    this.smokeExposedUntil[owner] = now + SMOKE_EXPOSE_MS;
  }

  /**
   * Every hit that lands costs the smoker a second of burn time. Wired from ArenaScene's
   * `damaged` listeners (the same route Metal, Time and Electricity use) — blocked hits
   * report 0 and are left alone.
   */
  onDamageReceived(owner: 'player' | 'npc', amount: number): void {
    if (amount <= 0) return;
    // Laundering: every point taken while the bag is out counts against it.
    const bag = this._stashOf(owner);
    if (bag) bag.damageTaken += amount;
    const cig = this._cigaretteOf(owner);
    if (!cig) return;
    cig.msLeft -= CIG_HIT_COST_MS;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    this.api.showFloatingText(f.x + 18, f.y - 30, '🚬 -1s', '#998877');
  }

  private _updateSmokeBreak(time: number, delta: number, dt: number): void {
    this._updateCigarettes(time, delta);
    this._updateSmokeTosses(dt);
    this._updateSmokeClouds(time);
    this._updateSmokeStealth(time);
  }

  private _updateCigarettes(time: number, delta: number): void {
    const { scene } = this.api;
    // We are the only writer of smokeIncomingMult, so it is safe to rebuild it each frame.
    this.api.player.smokeIncomingMult = 1;
    this.api.npc.smokeIncomingMult = 1;

    for (let i = this.cigarettes.length - 1; i >= 0; i--) {
      const c = this.cigarettes[i];
      const f = c.owner === 'player' ? this.api.player : this.api.npc;
      c.msLeft -= delta;
      if (c.msLeft <= 0 || !f.active || f.hp <= 0) {
        this.cigarettes.splice(i, 1);
        if (c.owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '🚬 Burnt Out', '#888888');
        continue;
      }
      f.smokeIncomingMult = CIG_DAMAGE_MULT;

      // The cigarette itself is painted by paintCigarettes; this is only the wisp coming
      // off the tip, which has to outlive the frame it was emitted on.
      c.smokeAccumMs += delta;
      const every = 240;
      if (c.smokeAccumMs >= every) {
        c.smokeAccumMs -= every;
        this.fx(c.owner).smoke(f.x + 19, f.y - 6, 1, {
          speed: 18, size: 3.4, life: 1100, depth: D_AIR - 1, drift: -34,
        });
      }
      void time;
    }
    void scene;
  }

  private _updateSmokeTosses(dt: number): void {
    for (let i = this.smokeTosses.length - 1; i >= 0; i--) {
      const t = this.smokeTosses[i];
      const dx = t.destX - t.x, dy = t.destY - t.y;
      const dist = Math.hypot(dx, dy);
      const step = SMOKE_TOSS_SPEED * dt;
      if (dist <= step || dist < 1) {
        this._spawnSmokeCloud(t.owner, t.destX, t.destY);
        this.smokeTosses.splice(i, 1);
        continue;
      }
      t.x += (dx / dist) * step;
      t.y += (dy / dist) * step;
    }
  }

  /**
   * Ages every live cloud. The drawing happens in paintSmokeClouds — the camera is the local
   * player's eye, so a cloud you laid down renders as a thin haze under the fighters while the
   * enemy's renders as a solid bank over the top of everything: same object, opposite jobs.
   */
  private _updateSmokeClouds(time: number): void {
    for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
      const c = this.smokeClouds[i];
      if (time >= c.endsAt) {
        this.smokeClouds.splice(i, 1);
        continue;
      }
      // A wisp peeling off the edge now and then keeps the bank from looking painted on.
      // It has to outlive the frame it was emitted on, so it goes through the Fx runner
      // rather than into the per-frame layer.
      c.wispAccumMs += this.api.scene.game.loop.delta;
      if (c.wispAccumMs >= 200) {
        c.wispAccumMs -= 200;
        const a = Math.random() * Math.PI * 2;
        this.fx(c.owner).smoke(c.x + Math.cos(a) * c.radius * 0.85, c.y + Math.sin(a) * c.radius * 0.85, 1, {
          angle: a, spread: 0.3, speed: 26, size: 7, life: 1300, drift: -14,
          depth: c.owner === 'player' ? SMOKE_DEPTH_OWN : SMOKE_DEPTH_ENEMY,
          color: c.owner === 'player' ? SUB.ash : SUB.ashDark,
        });
      }
    }
  }

  /** Linear blend between two packed RGB colours — used for the smoke's inner gradient. */
  private _smokeShade(from: number, to: number, t: number): number {
    const k = Phaser.Math.Clamp(t, 0, 1);
    const r = Math.round(((from >> 16) & 0xff) + (((to >> 16) & 0xff) - ((from >> 16) & 0xff)) * k);
    const g = Math.round(((from >> 8) & 0xff) + (((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * k);
    const b = Math.round((from & 0xff) + ((to & 0xff) - (from & 0xff)) * k);
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Invisibility while standing in your own cloud. The alpha is only touched on the frames
   * where this actually applies (and once on the way out), so nothing else that flashes a
   * fighter's alpha gets stomped when no cloud is up.
   */
  private _updateSmokeStealth(time: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const f = owner === 'player' ? this.api.player : this.api.npc;
      if (!f.active) continue;
      // Online replicas take their invisibility from the network, not from our sim.
      if (owner === 'npc' && f.netGhost) continue;

      const hidden = f.hp > 0
        && time >= this.smokeExposedUntil[owner]
        && this._inOwnSmoke(owner, f.x, f.y);
      // Only ever unhide a fighter we hid ourselves — the Stealthy mutation and Silence
      // both drive forceInvisible too, and clearing theirs would break them.
      if (!hidden && !this.smokeHidden[owner]) continue;
      this.smokeHidden[owner] = hidden;
      if (!hidden) {
        f.forceInvisible = false;
        f.setAlpha(1);
        if (owner === 'npc') f.setHealthBarVisible(true);
        continue;
      }
      f.forceInvisible = true;
      // You still see a ghost of yourself; the enemy sees nothing at all.
      f.setAlpha(owner === 'player' ? 0.35 : 0);
      if (owner === 'npc') f.setHealthBarVisible(false);
    }

    const cig = this._cigaretteOf('player');
    if (cig) {
      this.api.setStatusIndicator('smoke-break', {
        name: 'Smoke Break', emoji: '🚬', color: 0x998877,
        description: 'A lit cigarette: you take 25% less damage while it burns. Every hit you take costs it a second, and pressing the key again flicks it out as a smoke screen.',
        until: time + cig.msLeft, priority: 106,
      });
      this.smokeStatusShown = true;
    } else if (this.smokeStatusShown) {
      this.api.setStatusIndicator('smoke-break', null);
      this.smokeStatusShown = false;
    }
  }

  // ── Atom-Nhilego (preserved — will be rewired to a new ability soon) ─────

  doPlayerAtomNhilego(): void {
    if (this.playerNhilegoActive) return;
    const t = this.api.scene.time.now;
    this.playerNhilegoActive = true;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    this._spawnNhilegoShadow('player', t);
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 35, 'Atom-Nhilego!', '#8844cc');
  }

  doNpcAtomNhilego(): void {
    if (this.npcNhilegoActive) return;
    const t = this.api.scene.time.now;
    this.npcNhilegoActive = true;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    this._spawnNhilegoShadow('npc', t);
  }

  private _tickNhilego(time: number, owner: 'player' | 'npc'): void {
    const shadow = owner === 'player' ? this.playerNhilegoShadow : this.npcNhilegoShadow;
    if (!shadow) return;
    if (time < shadow.fireAt) return;
    this._nhilegoImpact(shadow, owner, time);
  }

  private _nhilegoImpact(shadow: NhilegoShadow, owner: 'player' | 'npc', time: number): void {
    const { api } = this;
    const { scene } = api;
    const { x, y, radius } = shadow;
    const caster = owner === 'player' ? api.player : api.npc;

    void scene;
    this.fx(owner).deal(x, y, radius, { notes: 8, rings: 2, duration: 480, color: SUB.neon });
    api.dealAoeDamage(owner, x, y, radius, 25);

    const dist = Math.hypot(caster.x - x, caster.y - y);
    if (dist <= radius) {
      if (owner === 'player') {
        this.playerNhilegoRadius *= 1.1;
        this.playerNhilegoSuccessCount++;
      } else {
        this.npcNhilegoRadius *= 1.1;
        this.npcNhilegoSuccessCount++;
      }
      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      api.showFloatingText(x, y - 30, `Hit! (${successCount})`, '#cc88ff');
      this._spawnNhilegoShadow(owner, time);
    } else {
      if (owner === 'player') this.playerNhilegoShadow = null;
      else this.npcNhilegoShadow = null;

      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      if (owner === 'player') this.playerNhilegoActive = false;
      else this.npcNhilegoActive = false;

      const healAmt = successCount * 10;
      if (healAmt > 0) {
        caster.heal(healAmt);
        api.showFloatingText(caster.x, caster.y - 35, `+${healAmt}`, '#aaffaa');
      }
    }
  }

  private _spawnNhilegoShadow(owner: 'player' | 'npc', time: number): void {
    const { scene } = this.api;
    const radius = owner === 'player' ? this.playerNhilegoRadius : this.npcNhilegoRadius;
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;
    const pad = 100;
    const x = pad + Math.random() * (W - pad * 2);
    const y = pad + Math.random() * (H - pad * 2);

    void scene;
    const shadowObj: NhilegoShadow = { bornAt: time, x, y, radius, fireAt: time + 3000, owner };
    if (owner === 'player') this.playerNhilegoShadow = shadowObj;
    else this.npcNhilegoShadow = shadowObj;
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Hired lackeys and the disco ball — both bought and placed, neither a fighter.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      report?.(px, py);
      return true;
    };
    let razed = 0;
    for (let i = this.lackeys.length - 1; i >= 0; i--) {
      const l = this.lackeys[i];
      if (l.owner === exceptOwner || !near(l.x, l.y)) continue;
      if (l.owner === 'player') this.api.broadcastMasteryCast(`subx-gone:${l.nid}:x`);
      this.lackeys.splice(i, 1);
      razed++;
    }
    for (let i = this.discoBalls.length - 1; i >= 0; i--) {
      const b = this.discoBalls[i];
      if (b.owner === exceptOwner || !near(b.x, b.y)) continue;
      this.discoBalls.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
