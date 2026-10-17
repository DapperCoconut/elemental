import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import {
  FOR, FortuneAvatar, FortuneColorFn, FortuneFx, Jewel, StatKind, advanceCard, glitterCloak, glitterMotes,
  goldCoin, goldFloor, goldFuse, goldPlume, goldStatue, goldStatueShell, goldenHeart, grassBlade, jewelGem,
  midasGilt, powderBag, statueRays,
} from './FortuneVisuals';
import { FONT_DISPLAY, FONT_UI } from '../../ui/Theme';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── The purse ────────────────────────────────────────────────────────────────
/** Gold pops are pooled over this long, so a plume ticking 2/s is one "+2" rather than eight. */
const POP_MS = 600;

// ── Click: Fray ──────────────────────────────────────────────────────────────
const FRAY_BLADES = 7;
/** Half-angle of the clump as it leaves the hand. */
const FRAY_SPREAD = 0.24;
const FRAY_SPEED_MIN = 430;
const FRAY_SPEED_MAX = 540;
/** Pixels per second per second, straight down the screen. */
const FRAY_GRAVITY = 900;
/** How long the grass is grass. After this every blade is solid gold. */
const FRAY_GILD_MS = 180;
const FRAY_LIFE_MS = 1800;
const FRAY_DAMAGE = 3;
const FRAY_HIT_R = 7;
const FRAY_BLADE_LEN = 15;

// ── E: Advance ───────────────────────────────────────────────────────────────
const ADVANCE_COST = 10;
const OFFER_COUNT = 3;
/** An offer nobody answers is answered for them — the gold is already spent. */
const OFFER_MS = 10_000;
const CARD_W = 58;
const CARD_H = 70;
const CARD_GAP = 8;
/** How far above the alchemist's centre the middle of the cards sits. */
const CARD_LIFT = 96;
/** The bot reads the cards for about this long before it takes one. */
const NPC_PICK_MS = 700;
/** Online: a replica's offer is shown for this long; which card they took never crosses the wire. */
const REPLICA_OFFER_MS = 1200;

interface StatDef { kind: StatKind; name: string; line: string; color: number }
const STATS: StatDef[] = [
  { kind: 'might', name: 'MIGHT', line: '+10% damage', color: 0xff9a3c },
  { kind: 'hide', name: 'GILDED HIDE', line: '-7% dmg taken', color: 0xd8c27a },
  { kind: 'stride', name: 'STRIDE', line: '+7% speed', color: 0x9fe28a },
  { kind: 'haste', name: 'HASTE', line: '-8% cooldowns', color: 0x8fd3ff },
  { kind: 'vigor', name: 'VIGOR', line: '+30 max HP', color: 0xff6b6b },
  { kind: 'greed', name: 'GREED', line: '+25% gold', color: 0xffe066 },
  { kind: 'sheaf', name: 'SHEAF', line: '+2 blades', color: 0x7ccf5a },
  { kind: 'mend', name: 'MEND', line: '+1.5 HP/s', color: 0x6fe3b0 },
];
const STAT_BY_KIND = new Map(STATS.map((s) => [s.kind, s]));
const MIGHT_STEP = 0.10;
const HIDE_STEP = 0.93;
const STRIDE_STEP = 0.07;
const HASTE_STEP = 0.92;
const VIGOR_HP = 30;
const GREED_STEP = 0.25;
const SHEAF_BLADES = 2;
const MEND_HPS = 1.5;

// ── R: Gold Plume ────────────────────────────────────────────────────────────
const PLUME_RANGE = 380;
const BAG_MS = 450;
const PLUME_R = 105;
const PLUME_MS = 6000;
const PLUME_DPS = 9;
const PLUME_TICK_MS = 250;
const PLUME_GOLD_PER_SEC = 2;

// ── F: Heart of Gold ─────────────────────────────────────────────────────────
const LUNGE_DIST = 150;
const LUNGE_MS = 180;
/** From the alchemist's centre to the tip of the cane. */
const CANE_REACH = 46;
const CANE_HIT_R = 20;
const LUNGE_DAMAGE = 16;
const HEART_MS = 6000;
/** Pixels of travel it takes to fill the heart from calm to a heart attack. */
const HEART_TRAVEL = 420;
/** Standing still lets the heart settle, a little. Per second, out of 1. */
const HEART_CALM_PER_SEC = 0.12;
/** A single frame of movement is clamped to this, so one teleport is not a death sentence. */
const HEART_STEP_CAP = 60;
const HEART_ATTACK_DAMAGE = 28;
const HEART_STUN_MS = 1400;
const DAMAGE_PER_GOLD = 20;

// ── Q: Midas Curse ───────────────────────────────────────────────────────────
const MIDAS_MS = 10_000;
/** Within this of the cursor, the curse goes to whoever is nearest it; otherwise nearest the caster. */
const MIDAS_PICK_R = 260;
/** Every this many pixels the cursed walk, another patch of floor turns. */
const FLOOR_STEP = 26;
const FLOOR_R = 30;
const FLOOR_MAX = 260;
const FLOOR_SPEED = 1.5;
const FLOOR_GOLD_MS = 3000;
const COIN_VALUE = 1;
const STATUE_VALUE = 2;
const LOOT_PICK_R = 28;
const LOOT_LIFE_MS = 25_000;
const COIN_DROP_MS = 360;
/** Invasion: a husk's shot is only "theirs" if it is first seen this close to them. */
const SHOT_OWNER_R = 70;
const PURGE_EVERY_MS = 100;

// ── Shop upgrades ────────────────────────────────────────────────────────────
// Click+ Accumulation — blades that reach the floor stay there, and the pile bursts.
const PILE_MAX = 90;
/** Fewer than this lying on the floor and the pile never stirs. */
const PILE_MIN = 6;
/** How often the pile rolls for a burst: every 1.5s with a small pile, down to 0.35s with a big one. */
const PILE_ROLL_MS_MAX = 1500;
const PILE_ROLL_MS_MIN = 350;
const PILE_ROLL_MS_PER = 14;
/** The chance a roll bursts is n / (n + this), for n blades lying on the floor. */
const PILE_CHANCE_K = 30;
/** A burst lifts this many blades, plus a share of the pile. */
const BURST_BASE = 5;
const BURST_SHARE = 0.35;
/** The pile stirs this long before the burst leaves the floor — a beat to step out of the way. */
const BURST_WARN_MS = 280;
const BURST_STAGGER_MS = 14;
/** Seconds a burst blade takes to reach where the target was. */
const BURST_FLIGHT_MIN = 0.5;
const BURST_FLIGHT_MAX = 0.75;
const BURST_SCATTER = 22;
const PILE_BLADE_LEN = 13;

// E+ Artisan — two jeweled cards on every offer, each with a price of its own.
const JEWELED_CARDS = 2;
const JEWELS: Jewel[] = ['pearl', 'diamond', 'ruby', 'sapphire', 'jade'];
const JEWEL_NAME: Record<Jewel, string> = { pearl: 'PEARL', diamond: 'DIAMOND', ruby: 'RUBY', sapphire: 'SAPPHIRE', jade: 'JADE' };
const JEWEL_PRICE: Record<Jewel, number> = { pearl: 8, diamond: 20, ruby: 10, sapphire: 8, jade: 12 };
const PEARL_WORTH = 2;
const DIAMOND_WORTH = 4;
/** A sapphire pick starts at one pick's worth and grows by one more every 20 seconds, up to six. */
const SAPPHIRE_GROW_MS = 20_000;
const SAPPHIRE_MAX = 6;
/** Ruby turns a card on the enemy. Greed and Sheaf have nothing to turn, so they never carry one. */
const RUBY_KINDS: StatKind[] = ['might', 'hide', 'stride', 'haste', 'vigor', 'mend'];
const RUBY_MIGHT = 0.9;
const RUBY_HIDE = 1.07;
const RUBY_STRIDE = 0.93;
const RUBY_HASTE = 1.08;
const RUBY_VIGOR = 30;
const RUBY_BLEED_HPS = 1.5;

// R+ Glittery Cloak
const CLOAK_R_MULT = 1.2;
const CLOAK_DODGE = 0.15;
/** Bots and husks in the glitter aim this much worse. */
const CLOAK_AIM_DEG = 24;
/** A player's own shots fired from inside the glitter leave up to this far off line. */
const CLOAK_JITTER = 0.32;
/** A shot is "fired from inside" if it is first seen this close to the shooter. */
const CLOAK_SHOT_R = 60;

// F+ Gold Hex
const HEX_TAIL_MS = 5000;
/** The share of every frame the hexed body's cooldowns lose: half speed. */
const HEX_DRAG = 0.5;

// Q+ Full Metal Alchemy
const STATUE_MS = 3000;
const STATUE_MELT_MS = 1000;
const STATUE_VULN = 2;
const STATUE_COINS = 3;

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_PLUME_SEEK_R = 280;
const NPC_LOOT_SEEK_R = 300;
const NPC_FLOOR_SEEK_R = 220;

// ── Types ────────────────────────────────────────────────────────────────────

interface Blade {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  seed: number;
  dmg: number;
}

/** Click+: a blade lying on the arena floor. `launchAt` > 0 once a burst has picked it. */
interface PileBlade {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  seed: number;
  born: number;
  launchAt: number;
  tx: number;
  ty: number;
}

interface Bag {
  owner: Owner;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  start: number;
  /** R+ Glittery Cloak, decided when the bag is thrown. */
  cloak: boolean;
}

interface Plume {
  owner: Owner;
  x: number;
  y: number;
  r: number;
  cloak: boolean;
  born: number;
  until: number;
  seed: number;
  tickAt: number;
}

interface Lunge {
  owner: Owner;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  start: number;
  /** The cane tip last frame, so the hit test sweeps instead of sampling. */
  tipX: number;
  tipY: number;
  hit: Set<Fighter>;
  /** Online replica lunges are drawn, never resolved — the attacker's own machine does that. */
  ghost: boolean;
}

interface Heart {
  by: Owner;
  lx: number;
  ly: number;
  stress: number;
  raw: number;
  acc: number;
  /** True when this sim decides the heart (stress, attacks, gold); false for a mirror we only draw. */
  live: boolean;
  /** Mirror only: last stress we were told, to spot a heart attack on the far machine. */
  seen: number;
}

interface Curse {
  by: Owner;
  start: number;
  lx: number;
  ly: number;
  /** Cast on this sim — false for a curse we were only told about, which never turns to a statue here. */
  live: boolean;
}

/** Q+ Full Metal Alchemy: a body the curse finished with. `Fighter.goldStatueUntil` is the truth. */
interface Statue {
  by: Owner;
  /** Raw damage taken when it was made, so a hit can be noticed. */
  raw: number;
  hit: boolean;
  /** Decided on this sim (vulnerability, coins); false for a mirrored statue we only draw. */
  live: boolean;
}

interface Patch { x: number; y: number; r: number; seed: number; born: number }

interface Loot {
  kind: 'coin' | 'statue';
  /** Who may pick it up — the curse's caster. */
  by: Owner;
  x: number;
  y: number;
  fx: number;
  fy: number;
  born: number;
  r: number;
  seed: number;
}

/** One card on an offer. A jeweled card (E+ Artisan) has a stone and a price of its own. */
interface Card {
  kind: StatKind;
  jewel: Jewel | null;
  price: number;
}

/** A jeweled pick, kept as a pick so Sapphire can grow and Jade can count its siblings. */
interface Gem {
  kind: StatKind;
  jewel: Jewel;
  at: number;
}

interface Offer {
  cards: Card[];
  opened: number;
  until: number;
  /** Bot: when it takes a card. Replica: when the cards are put away unanswered. */
  decideAt: number;
  /** A replica's cards — drawn, never applied. */
  ghost: boolean;
}

interface Side {
  owner: Owner;
  gold: number;
  /** The fractional part of the purse, so 2 gold a second is not rounded away at 60fps. */
  frac: number;
  aimX: number;
  aimY: number;
  /** What the picks are worth right now — plain picks plus every jewel. Recomputed each frame. */
  stats: Record<StatKind, number>;
  /** Plain picks, one per card. */
  plain: Record<StatKind, number>;
  gems: Gem[];
  /** Ruby picks: these land on whoever this side is fighting, inverted. */
  ruby: Record<StatKind, number>;
  /** Max HP already granted for Vigor, so a growing Sapphire grants only the difference. */
  vigorApplied: number;
  /** Click+: when the pile next rolls for a burst. */
  pileRollAt: number;
  /** R+: standing in its own glittery plume this frame. */
  cloaked: boolean;
  offer: Offer | null;
  floorMs: number;
  onFloor: boolean;
  pop: number;
  popAt: number;
  lunge: Lunge | null;
  glow: number;
}

function emptyStats(): Record<StatKind, number> {
  return { might: 0, hide: 0, stride: 0, haste: 0, vigor: 0, greed: 0, sheaf: 0, mend: 0 };
}

function makeSide(owner: Owner): Side {
  return {
    owner, gold: 0, frac: 0, aimX: 0, aimY: 0, stats: emptyStats(), plain: emptyStats(), gems: [],
    ruby: emptyStats(), vigorApplied: 0, pileRollAt: 0, cloaked: false, offer: null,
    floorMs: 0, onFloor: false, pop: 0, popAt: 0, lunge: null, glow: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface FortuneArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  /** ArenaScene's shared physics group of `Projectile`s. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Kit-local travelling shots that registered themselves. */
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  isTargetable(f: Fighter): boolean;
  /** Invasion: a husk's shots live in InvasionKit, not the shared group. Empty for anything else. */
  stealHuskShots(f: Fighter): { x: number; y: number }[];
  fortuneColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Ruin's board-wipe dispatch, borrowed: every kit's summons inside the circle, except `except`'s. */
  purgeSummons(x: number, y: number, r: number, except: Owner, report: (x: number, y: number) => void): number;
  /** Shop upgrades: the player's own, or the bot's loadout / the online opponent's handshake. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  /** Online: a pseudo-cast id for an action that never goes through `castAbility`. */
  broadcastMasteryCast(id: string): void;
}

// ── FortuneKit ───────────────────────────────────────────────────────────────

/**
 * Gold — the alchemist. (The element id is still `fortune`, so every save keeps working.)
 *
 * Everything he does turns something into gold, and most of it turns into *his* gold. The purse
 * is the element's one resource: it fills from standing in his own plume, from the blood of a
 * gold-hearted enemy and from the floor Midas leaves behind, and it is spent ten at a time on
 * **Advance**, the only thing in the kit that makes him permanently better at the rest of it.
 *
 * - **Fray** throws a clump of grass that his other hand gilds in flight; the blades then fall
 *   down the screen as though the arena had a floor at the bottom. Small hits, lots of them.
 * - **Advance** spends 10 gold and floats three stat cards over his head. Click one.
 * - **Gold Plume** is a bag of powder: a cloud that burns enemies and pays him to stand in it.
 * - **Heart of Gold** is a lunge with the cane. A struck heart turns to gold, and a gold heart
 *   cannot take exercise — every step fills it, and a full one is a heart attack.
 * - **Midas Curse** turns the target, slowly, and the floor under their feet, permanently. Their
 *   shots drop as coins and their summons stand where they were made as golden statues.
 *
 * The two victim-side states are Fighter fields (`goldHeartUntil`/`goldHeartStress`,
 * `midasUntil`) so the status tray and the online mirror pick them up without help; the kit
 * treats those fields as the truth and keeps only its bookkeeping beside them.
 */
export class FortuneKit {
  private api: FortuneArenaApi;

  // ── Visuals ──
  private readonly pcol: FortuneColorFn;
  private readonly ncol: FortuneColorFn;
  private readonly pfx: FortuneFx;
  private readonly nfx: FortuneFx;
  private playerAvatar: FortuneAvatar | null = null;
  private npcAvatar: FortuneAvatar | null = null;
  /** Gold floor, coins and statues — under everything. */
  private floorGfx: Phaser.GameObjects.Graphics | null = null;
  /** The plumes, just under the fighters. */
  private plumeGfx: Phaser.GameObjects.Graphics | null = null;
  /** The gilt creeping up a cursed body, over its sprite. */
  private giltGfx: Phaser.GameObjects.Graphics | null = null;
  /** Blades and bags in flight, over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Hearts and the Advance cards — over everything. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  /** Pooled card legends: name + line per card, three cards per side. */
  private labels: Phaser.GameObjects.Text[] = [];
  private priceLabels: Phaser.GameObjects.Text[] = [];
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private blades: Blade[] = [];
  /** Click+ Accumulation: blades lying on the floor, both sides'. */
  private pile: PileBlade[] = [];
  private bags: Bag[] = [];
  private plumes: Plume[] = [];
  private hearts = new Map<Fighter, Heart>();
  private curses = new Map<Fighter, Curse>();
  private stuns = new Map<Fighter, number>();
  private statues = new Map<Fighter, Statue>();
  /** Ruby Vigor already taken off each body, so only a change is applied. */
  private vigorCuts = new Map<Fighter, number>();
  /** Ruby Mend: fractional bleed carried between frames. */
  private bleedAcc = new Map<Fighter, number>();
  /** R+: cloak dodges already announced, per body. */
  private dodgesSeen = new Map<Fighter, number>();
  /** R+: bodies inside an enemy's glittery plume this frame. */
  private inGlitter = new Set<Fighter>();
  /** R+: shots already judged for the glitter's wobble. */
  private glitterShots = new WeakSet<object>();
  private patches: Patch[] = [];
  private loot: Loot[] = [];
  /** Shots already looked at, so an Invasion husk's shot is judged once, where it was first seen. */
  private seenShots = new WeakSet<object>();
  private purgeAt = 0;
  private wasDown = false;
  private pressSpent = false;

  constructor(api: FortuneArenaApi) {
    this.api = api;
    this.pcol = (base) => api.fortuneColor('player', base);
    this.ncol = (base) => api.fortuneColor('npc', base);
    this.pfx = new FortuneFx(api.scene, this.pcol);
    this.nfx = new FortuneFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): FortuneFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): FortuneColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private avatar(owner: Owner): FortuneAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }
  private clampX(x: number): number { return Phaser.Math.Clamp(x, this.left, this.right); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, this.top, this.bottom); }

  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }

  private isGold(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'fortune' : this.api.npcElementId === 'fortune';
  }

  /** An online opponent's body: drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side; a co-op ally's attacks resolve on its
    // own machine. Here they must touch nobody.
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  /** Everything this kit ever writes a field on, so a stale value can always be cleared. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    return Phaser.Math.Distance.Between(ax + dx * u, ay + dy * u, px, py);
  }

  private might(owner: Owner): number { return 1 + MIGHT_STEP * this.side(owner).stats.might; }

  /** A shop upgrade, only ever true for an alchemist. */
  private up(owner: Owner, slot: string): boolean {
    return this.isGold(owner) && this.api.hasUpgrade(owner, slot);
  }

  /** A kit-made label: `showFloatingText` is a no-op in this codebase, so the few that matter are ours. */
  private announce(x: number, y: number, text: string, color: number, size = 12): void {
    const { scene } = this.api;
    const t = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color: this.hex(color),
      stroke: '#1a1206', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ── The purse ──────────────────────────────────────────────────────────────

  /** Pay `owner`. Greed multiplies every source. */
  private earn(owner: Owner, amount: number): void {
    if (amount <= 0) return;
    const s = this.side(owner);
    s.frac += amount * (1 + GREED_STEP * s.stats.greed);
    const whole = Math.floor(s.frac);
    if (whole <= 0) return;
    s.frac -= whole;
    s.gold += whole;
    s.pop += whole;
  }

  /** Flush pooled "+N" pops over each alchemist's head. */
  private flushPops(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.pop <= 0 || this.now < s.popAt) continue;
      const f = this.fighter(owner);
      if (this.alive(f) && this.isGold(owner)) {
        this.announce(f.x + 18, f.y - 34, `+${s.pop} 🪙`, FOR.goldLit, 11);
        this.fx(owner).goldGain(f.x, f.y - 10, s.pop);
        Sfx.playAt('money', f.x, { rate: 1.3 + Math.random() * 0.2, volume: 0.35 });
      }
      s.pop = 0;
      s.popAt = this.now + POP_MS;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.blades = [];
    this.pile = [];
    this.bags = [];
    this.plumes = [];
    this.hearts.clear();
    this.curses.clear();
    this.stuns.clear();
    this.statues.clear();
    this.vigorCuts.clear();
    this.bleedAcc.clear();
    this.dodgesSeen.clear();
    this.inGlitter.clear();
    this.glitterShots = new WeakSet();
    this.patches = [];
    this.loot = [];
    this.seenShots = new WeakSet();
    this.purgeAt = 0;
    this.wasDown = false;
    this.pressSpent = false;
    this.vizT = 0;

    for (const f of this.allFighters()) {
      f.fortuneIncomingMult = 1;
      f.goldHeartUntil = 0;
      f.goldHeartStress = 0;
      f.midasUntil = 0;
      f.goldHexUntil = 0;
      f.goldStatueUntil = 0;
      f.goldCooldownMult = 1;
      f.goldVigorCut = 0;
      f.goldSpeedMult = 1;
      f.goldCloakDodge = 0;
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.floorGfx, this.plumeGfx, this.giltGfx, this.airGfx, this.hudGfx]) g?.destroy();
    this.floorGfx = this.plumeGfx = this.giltGfx = this.airGfx = this.hudGfx = null;
    for (const t of this.labels) t.destroy();
    this.labels = [];
    for (const t of this.priceLabels) t.destroy();
    this.priceLabels = [];

    this.api.setStatusIndicator('gold-purse', null);
    this.api.setStatusIndicator('gold-floor', null);
    this.api.setStatusIndicator('gold-cloak', null);
    this.api.setStatusIndicator('gold-ruby', null);
    for (const st of STATS) this.api.setStatusIndicator(`gold-stat-${st.kind}`, null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5.
    if (!this.floorGfx) this.floorGfx = scene.add.graphics().setDepth(2);
    if (!this.plumeGfx) this.plumeGfx = scene.add.graphics().setDepth(3.5);
    if (!this.giltGfx) this.giltGfx = scene.add.graphics().setDepth(5.6);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(16);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isGold('player') && !this.playerAvatar) this.playerAvatar = new FortuneAvatar(scene, this.pcol);
    if (this.isGold('npc') && !this.npcAvatar) this.npcAvatar = new FortuneAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Called for every player regardless of element (the call site predates this element), so it
   * early-outs unless the player is the alchemist.
   *
   * A press that lands on one of the Advance cards takes that card and is spent — it does not
   * also throw grass. Every other held click throws grass on the cooldown.
   */
  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'fortune') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const down = pointer.isDown;
    const pressed = down && !this.wasDown;
    this.wasDown = down;
    if (!down) this.pressSpent = false;
    if (!this.alive(p)) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    if (pressed && s.offer) {
      const i = this.cardUnder('player', mouseX, mouseY);
      if (i >= 0) {
        const card = s.offer.cards[i];
        if (s.gold >= card.price) {
          this.pick('player', i);
        } else {
          this.announce(p.x, p.y - 46, `NEED ${card.price} GOLD`, FOR.blood, 11);
          Sfx.playAt('ui-click', p.x, { rate: 0.7, volume: 0.4 });
        }
        this.pressSpent = true;
      }
    }
    if (down && !this.pressSpent) p.castAbility('fortune-fray', ctx);

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      // Checked before the cast: a refused cast still stamps its cooldown *and voices itself*.
      if (s.offer) {
        // Already choosing.
      } else if (s.gold < ADVANCE_COST) {
        this.announce(p.x, p.y - 46, `NEED ${ADVANCE_COST} GOLD`, FOR.blood, 11);
        Sfx.playAt('ui-click', p.x, { rate: 0.7, volume: 0.4 });
      } else {
        p.castAbility('fortune-advance', ctx);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('fortune-plume', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('fortune-heart', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      if (this.midasTarget('player', mouseX, mouseY)) p.castAbility('fortune-midas', ctx);
      else this.announce(p.x, p.y - 46, 'NO TARGET', FOR.blood, 11);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** After a cast is stamped, Haste trims that cast's cooldown. */
  private hasten(owner: Owner, abilityId: string): void {
    const n = this.side(owner).stats.haste;
    if (n > 0) this.fighter(owner).scaleStampedCooldown(abilityId, Math.pow(HASTE_STEP, n));
  }

  /** Click — Fray. */
  doFray(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-fray');
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const n = FRAY_BLADES + Math.floor(SHEAF_BLADES * s.stats.sheaf);
    const ox = f.x + Math.cos(ang) * 20;
    const oy = f.y + Math.sin(ang) * 20;
    const dmg = FRAY_DAMAGE * this.might(owner);
    for (let i = 0; i < n; i++) {
      const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * 2 * FRAY_SPREAD : 0) + (Math.random() - 0.5) * 0.08;
      const v = Phaser.Math.FloatBetween(FRAY_SPEED_MIN, FRAY_SPEED_MAX);
      this.blades.push({
        owner, x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        born: this.now - Math.random() * 40, seed: Math.random() * 999, dmg,
      });
    }
    s.glow = 1;
    this.avatar(owner)?.play('punch', ang);
    // The other hand does the gilding: the clump leaves one hand and the flare is on the other.
    this.fx(owner).transmute(f.x + Math.cos(ang - 1.25) * 22, f.y + Math.sin(ang - 1.25) * 22);
    Sfx.playAt('whoosh', f.x, { rate: 1.6, volume: 0.35 });
  }

  /** E — Advance. The purse was checked at the press; it is charged here. */
  doAdvance(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-advance');
    const s = this.side(owner);
    const ghost = this.isReplica(owner);
    if (s.offer && !s.offer.ghost) return;
    if (!ghost) {
      if (s.gold < ADVANCE_COST) return;
      s.gold -= ADVANCE_COST;
    }
    const pool = Phaser.Utils.Array.Shuffle(STATS.map((d) => d.kind));
    const cards: Card[] = pool.slice(0, OFFER_COUNT).map((kind) => ({ kind, jewel: null, price: 0 }));
    // E+ Artisan: two more cards, each set with a stone and priced on top of the ten already spent.
    if (this.up(owner, 'e')) {
      for (const kind of pool.slice(OFFER_COUNT, OFFER_COUNT + JEWELED_CARDS)) {
        const stones = RUBY_KINDS.includes(kind) ? JEWELS : JEWELS.filter((j) => j !== 'ruby');
        const jewel = Phaser.Utils.Array.GetRandom(stones);
        cards.push({ kind, jewel, price: JEWEL_PRICE[jewel] });
      }
    }
    s.offer = {
      cards,
      opened: this.now,
      until: this.now + OFFER_MS,
      decideAt: this.now + (ghost ? REPLICA_OFFER_MS : NPC_PICK_MS + Math.random() * 400),
      ghost,
    };
    this.fx(owner).advanceOpen(f.x, f.y - CARD_LIFT);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('money', f.x, { rate: 0.8, volume: 0.6 });
    if (!ghost) this.announce(f.x, f.y - 40, `-${ADVANCE_COST} 🪙`, FOR.gold, 11);
  }

  /** R — Gold Plume: the bag is thrown at the cursor and bursts when it lands. */
  doPlume(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-plume');
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(PLUME_RANGE, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    this.bags.push({
      owner, fx: f.x, fy: f.y,
      tx: this.clampX(f.x + Math.cos(ang) * d), ty: this.clampY(f.y + Math.sin(ang) * d),
      start: this.now, cloak: this.up(owner, 'r'),
    });
    this.avatar(owner)?.play('sweep', ang);
    Sfx.playAt('whoosh', f.x, { rate: 0.9, volume: 0.6 });
  }

  /** F — Heart of Gold: a lunge with the cane. */
  doHeart(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-heart');
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const ex = this.clampX(f.x + Math.cos(ang) * LUNGE_DIST);
    const ey = this.clampY(f.y + Math.sin(ang) * LUNGE_DIST);
    this.side(owner).lunge = {
      owner, fx: f.x, fy: f.y, tx: ex, ty: ey, start: this.now,
      tipX: f.x + Math.cos(ang) * CANE_REACH, tipY: f.y + Math.sin(ang) * CANE_REACH,
      hit: new Set(), ghost: this.isReplica(owner),
    };
    this.fx(owner).caneLunge(f.x, f.y, ex, ey);
    this.avatar(owner)?.play('dash', ang);
    Sfx.playAt('whoosh', f.x, { rate: 1.25, volume: 0.8 });
  }

  /** Q — Midas Curse. */
  doMidas(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-midas');
    const v = this.midasTarget(owner, tx, ty);
    this.fx(owner).midasCast(f.x, f.y);
    this.avatar(owner)?.play('raise');
    if (!v) return;
    this.curse(owner, v);
  }

  private curse(by: Owner, v: Fighter): void {
    v.midasUntil = Math.max(v.midasUntil, this.now + MIDAS_MS);
    this.curses.set(v, { by, start: this.now, lx: v.x, ly: v.y, live: true });
    this.fx(by).midasStrike(v.x, v.y);
    this.announce(v.x, v.y - 50, '👑 MIDAS CURSE', FOR.goldLit, 14);
    Sfx.playAt('money', v.x, { rate: 0.6, volume: 0.9 });
  }

  /** Whoever the curse would land on: nearest the cursor if anyone is near it, else nearest the caster. */
  private midasTarget(owner: Owner, tx: number, ty: number): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = MIDAS_PICK_R;
    const list = this.targetsOf(owner);
    for (const t of list) {
      const d = Phaser.Math.Distance.Between(tx, ty, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    if (best) return best;
    bestD = Infinity;
    for (const t of list) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  // ── Advance ────────────────────────────────────────────────────────────────

  /** Card centres for `owner`'s open offer, following the body. */
  private cardCentres(owner: Owner): { x: number; y: number }[] {
    const f = this.fighter(owner);
    const offer = this.side(owner).offer;
    if (!offer) return [];
    const n = offer.cards.length;
    const span = n * CARD_W + (n - 1) * CARD_GAP;
    const cy = Math.max(this.top + CARD_H / 2 + 4, f.y - CARD_LIFT);
    const x0 = Phaser.Math.Clamp(f.x, this.left + span / 2, this.right - span / 2) - span / 2 + CARD_W / 2;
    return offer.cards.map((_, i) => ({ x: x0 + i * (CARD_W + CARD_GAP), y: cy }));
  }

  private cardUnder(owner: Owner, x: number, y: number): number {
    const cs = this.cardCentres(owner);
    for (let i = 0; i < cs.length; i++) {
      if (Math.abs(x - cs[i].x) <= CARD_W / 2 + 2 && Math.abs(y - cs[i].y) <= CARD_H / 2 + 2) return i;
    }
    return -1;
  }

  /** Take card `i` of the open offer. A jeweled card is paid for here; the caller checked the purse. */
  private pick(owner: Owner, i: number): void {
    const s = this.side(owner);
    const offer = s.offer;
    const card = offer?.cards[i];
    if (!offer || !card) return;
    if (card.price > s.gold) return;
    const at = this.cardCentres(owner)[i];
    const line = this.cardLine(owner, card);
    s.gold -= card.price;
    s.offer = null;
    if (card.jewel) s.gems.push({ kind: card.kind, jewel: card.jewel, at: this.now });
    else s.plain[card.kind]++;
    this.recompute(owner);
    const f = this.fighter(owner);
    const def = STAT_BY_KIND.get(card.kind)!;
    this.fx(owner).advancePick(at?.x ?? f.x, at?.y ?? f.y - CARD_LIFT);
    const head = card.jewel ? `${JEWEL_NAME[card.jewel]} ${def.name}` : def.name;
    this.announce(f.x, f.y - 52, `${head}  ${line}`, card.jewel === 'ruby' ? FOR.bloodLit : def.color, 12);
    if (card.price > 0) this.announce(f.x, f.y - 38, `-${card.price} 🪙`, FOR.gold, 11);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('ui-click', f.x, { rate: 1.4, volume: 0.6 });
    Sfx.playAt('money', f.x, { rate: card.jewel ? 1.5 : 1.1, volume: 0.5 });
  }

  // ── E+ Artisan: what a pick is worth ───────────────────────────────────────

  private gemWorth(g: Gem, jades: number): number {
    switch (g.jewel) {
      case 'pearl': return PEARL_WORTH;
      case 'diamond': return DIAMOND_WORTH;
      case 'sapphire': return Math.min(SAPPHIRE_MAX, 1 + (this.now - g.at) / SAPPHIRE_GROW_MS);
      // Every jade is worth double for every other jade owned: 1, then 2 each, then 4 each...
      case 'jade': return Math.pow(2, Math.max(0, jades - 1));
      case 'ruby': return 0;
    }
  }

  /** Fold plain picks and jewels into what the side's stats are worth this frame. */
  private recompute(owner: Owner): void {
    const s = this.side(owner);
    const stats = { ...s.plain };
    const ruby = emptyStats();
    const jades = s.gems.filter((g) => g.jewel === 'jade').length;
    for (const g of s.gems) {
      if (g.jewel === 'ruby') ruby[g.kind] += 1;
      else stats[g.kind] += this.gemWorth(g, jades);
    }
    s.stats = stats;
    s.ruby = ruby;
  }

  private fmt(v: number): string { return `${Math.round(v * 10) / 10}`; }

  /** The card's second line, at `m` picks' worth. */
  private statLine(kind: StatKind, m: number): string {
    switch (kind) {
      case 'might': return `+${this.fmt(MIGHT_STEP * 100 * m)}% damage`;
      case 'hide': return `-${Math.round((1 - Math.pow(HIDE_STEP, m)) * 100)}% dmg taken`;
      case 'stride': return `+${this.fmt(STRIDE_STEP * 100 * m)}% speed`;
      case 'haste': return `-${Math.round((1 - Math.pow(HASTE_STEP, m)) * 100)}% cooldowns`;
      case 'vigor': return `+${Math.round(VIGOR_HP * m)} max HP`;
      case 'greed': return `+${this.fmt(GREED_STEP * 100 * m)}% gold`;
      case 'sheaf': return `+${Math.floor(SHEAF_BLADES * m)} blades`;
      case 'mend': return `+${this.fmt(MEND_HPS * m)} HP/s`;
    }
  }

  private rubyLine(kind: StatKind): string {
    switch (kind) {
      case 'might': return `foe -${Math.round((1 - RUBY_MIGHT) * 100)}% damage`;
      case 'hide': return `foe +${Math.round((RUBY_HIDE - 1) * 100)}% taken`;
      case 'stride': return `foe -${Math.round((1 - RUBY_STRIDE) * 100)}% speed`;
      case 'haste': return `foe +${Math.round((RUBY_HASTE - 1) * 100)}% cooldowns`;
      case 'vigor': return `foe -${RUBY_VIGOR} max HP`;
      default: return `foe bleeds ${RUBY_BLEED_HPS}/s`;
    }
  }

  private cardLine(owner: Owner, card: Card): string {
    if (!card.jewel) return STAT_BY_KIND.get(card.kind)!.line;
    switch (card.jewel) {
      case 'pearl': return this.statLine(card.kind, PEARL_WORTH);
      case 'diamond': return this.statLine(card.kind, DIAMOND_WORTH);
      case 'sapphire': return `${this.statLine(card.kind, 1)} ▲`;
      case 'ruby': return this.rubyLine(card.kind);
      case 'jade': {
        // Taking it makes one more jade, and each jade is then worth this much.
        const jades = this.side(owner).gems.filter((g) => g.jewel === 'jade').length;
        return this.statLine(card.kind, Math.pow(2, jades));
      }
    }
  }

  /** The bot reads its cards and takes the one it wants most right now — a jewel only if it can pay. */
  private npcChoose(cards: Card[]): number {
    const f = this.api.npc;
    const hurt = f.hp / Math.max(1, f.maxHp);
    const s = this.sides.npc;
    const jades = s.gems.filter((g) => g.jewel === 'jade').length;
    const base: Record<StatKind, number> = {
      might: 1.2, hide: 1.0, stride: 0.8, haste: 1.1, vigor: 0.9, greed: 0.9, sheaf: 1.1, mend: 0.8,
    };
    const score = (c: Card): number => {
      if (c.price > s.gold) return -Infinity;
      const own = s.stats[c.kind];
      let v = base[c.kind] / (1 + own * 0.35);
      if (hurt < 0.5 && (c.kind === 'vigor' || c.kind === 'mend' || c.kind === 'hide')) v += 0.8;
      const worth = !c.jewel ? 1
        : c.jewel === 'pearl' ? PEARL_WORTH
          : c.jewel === 'diamond' ? DIAMOND_WORTH
            : c.jewel === 'sapphire' ? 2.5
              : c.jewel === 'jade' ? Math.pow(2, jades) * 1.2
                : 1.4;
      return v * worth - c.price * 0.02 + Math.random() * 0.3;
    };
    let best = 0;
    for (let i = 1; i < cards.length; i++) if (score(cards[i]) > score(cards[best])) best = i;
    return best;
  }

  private updateOffers(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const o = s.offer;
      if (!o) continue;
      if (!this.alive(this.fighter(owner))) { s.offer = null; continue; }
      if (o.ghost) {
        if (this.now >= o.decideAt) s.offer = null;
        continue;
      }
      if (owner === 'npc' && this.now >= o.decideAt) { this.pick('npc', this.npcChoose(o.cards)); continue; }
      // An unanswered offer takes a plain card for you — never one that costs more.
      if (this.now >= o.until) this.pick(owner, Phaser.Math.Between(0, Math.min(OFFER_COUNT, o.cards.length) - 1));
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isGold('player');
    const npcIs = this.isGold('npc');
    const anyState = this.blades.length || this.bags.length || this.plumes.length || this.hearts.size
      || this.curses.size || this.stuns.size || this.patches.length || this.loot.length
      || this.pile.length || this.statues.size
      || this.api.player?.goldHeartUntil || this.api.player?.midasUntil
      || this.api.player?.goldHexUntil || this.api.player?.goldStatueUntil || this.api.player?.goldVigorCut;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateLunges();
    this.updateBlades(dt);
    this.updatePile();
    this.updateBags();
    this.updatePlumes(dt);
    this.updateGlitterShots();
    this.updateHearts(dt);
    this.updateHex(delta);
    this.updateStuns();
    this.updateCurses();
    this.updateStatues();
    this.updateLoot();
    this.updateFloor(delta);
    this.updateOffers();
    this.updateSelf(dt);
    this.flushPops();

    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  /** The cane: carried along the lunge (post-movement, so it is the last word) and swept for hits. */
  private updateLunges(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const l = s.lunge;
      if (!l) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.lunge = null; continue; }
      const u = Phaser.Math.Clamp((this.now - l.start) / LUNGE_MS, 0, 1);
      const e = 1 - (1 - u) * (1 - u);
      const ang = Math.atan2(l.ty - l.fy, l.tx - l.fx);
      if (!l.ghost) {
        const x = l.fx + (l.tx - l.fx) * e;
        const y = l.fy + (l.ty - l.fy) * e;
        f.setPosition(x, y);
        (f.body as Phaser.Physics.Arcade.Body | null)?.reset(x, y);
      }
      const tipX = f.x + Math.cos(ang) * CANE_REACH;
      const tipY = f.y + Math.sin(ang) * CANE_REACH;
      if (!l.ghost) {
        for (const t of this.targetsOf(owner)) {
          if (l.hit.has(t)) continue;
          if (this.segDist(l.tipX, l.tipY, tipX, tipY, t.x, t.y) > CANE_HIT_R + this.bodyR(t)) continue;
          l.hit.add(t);
          t.takeDamage(LUNGE_DAMAGE * this.might(owner));
          this.installHeart(owner, t);
          this.api.spawnHitFlash(t.x, t.y, this.col(owner)(FOR.gold));
          Sfx.playAt('hit-heavy', t.x, { rate: 1.2, volume: 0.7 });
        }
      }
      l.tipX = tipX;
      l.tipY = tipY;
      if (u >= 1) s.lunge = null;
    }
  }

  private installHeart(by: Owner, t: Fighter): void {
    const was = this.now < t.goldHeartUntil;
    t.goldHeartUntil = this.now + HEART_MS;
    const h = this.hearts.get(t);
    if (h && h.live) {
      h.by = by;
    } else {
      this.hearts.set(t, {
        by, lx: t.x, ly: t.y, stress: was ? t.goldHeartStress : 0, raw: t.rawDamageTaken, acc: 0, live: true, seen: 0,
      });
    }
    this.fx(by).heartApply(t.x, t.y - 34);
    if (!was) this.announce(t.x, t.y - 54, '💛 HEART OF GOLD', FOR.goldLit, 12);
    // F+ Gold Hex: their bars charge at half speed for the heart and five seconds after it.
    if (this.up(by, 'f')) {
      const hexed = this.now < t.goldHexUntil;
      t.goldHexUntil = Math.max(t.goldHexUntil, t.goldHeartUntil + HEX_TAIL_MS);
      if (!hexed) this.announce(t.x, t.y - 68, '⏳ GOLD HEX', FOR.gold, 11);
    }
  }

  /**
   * F+ Gold Hex. The timer is the truth (mirrored online), and the drag is applied on the body's
   * own machine: an online opponent's cooldowns are theirs to slow, from the mirrored timer.
   */
  private updateHex(delta: number): void {
    for (const f of this.allFighters()) {
      if (this.now >= f.goldHexUntil || !this.alive(f)) continue;
      if (this.api.isOnline && f === this.api.npc) continue;
      f.delayCooldowns(delta * HEX_DRAG);
    }
  }

  private updateBlades(dt: number): void {
    const H = this.api.height;
    const W = this.api.width;
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const b = this.blades[i];
      const px = b.x;
      const py = b.y;
      b.vy += FRAY_GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let gone = this.now - b.born > FRAY_LIFE_MS || b.y > H + 20 || b.x < -20 || b.x > W + 20;
      if (!gone) {
        for (const t of this.targetsOf(b.owner)) {
          if (this.segDist(px, py, b.x, b.y, t.x, t.y) > FRAY_HIT_R + this.bodyR(t)) continue;
          t.takeDamage(b.dmg);
          this.fx(b.owner).bladeHit(b.x, b.y, Math.atan2(b.vy, b.vx));
          gone = true;
          break;
        }
      }
      // Click+ Accumulation: a blade that falls as far as the floor stays on it.
      if (!gone && b.vy > 0 && b.y >= this.bottom && this.up(b.owner, 'click')) {
        this.landBlade(b);
        gone = true;
      }
      if (gone) this.blades.splice(i, 1);
    }
  }

  // ── Click+ Accumulation ────────────────────────────────────────────────────

  private landBlade(b: Blade): void {
    const x = this.clampX(b.x);
    const y = this.bottom + (Math.random() - 0.3) * 6;
    this.pile.push({
      owner: b.owner, x, y, ang: (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.5,
      seed: Math.random() * 999, born: this.now, launchAt: 0, tx: 0, ty: 0,
    });
    this.fx(b.owner).bladeLand(x, y, Math.atan2(b.vy, b.vx));
    // The oldest resting blade gives way to a new one past the cap.
    let mine = 0;
    for (const p of this.pile) if (p.owner === b.owner) mine++;
    if (mine > PILE_MAX) {
      const i = this.pile.findIndex((p) => p.owner === b.owner && !p.launchAt);
      if (i >= 0) this.pile.splice(i, 1);
    }
  }

  /**
   * The pile rolls for a burst on a clock that speeds up as it grows, with a chance that grows
   * with it. A burst picks the blades lying nearest the target, stirs them for a beat, then lifts
   * them on arcs that come down through where the target was. An online replica never rolls:
   * its machine does, and the burst arrives as `fortune-burst`.
   */
  private updatePile(): void {
    if (!this.pile.length) return;
    for (let i = this.pile.length - 1; i >= 0; i--) {
      const p = this.pile[i];
      if (!p.launchAt || this.now < p.launchAt) continue;
      this.pile.splice(i, 1);
      this.launchPileBlade(p);
    }
    for (const owner of BOTH) {
      if (this.isReplica(owner) || !this.up(owner, 'click') || !this.alive(this.fighter(owner))) continue;
      const s = this.side(owner);
      if (this.now < s.pileRollAt) continue;
      let n = 0;
      for (const p of this.pile) if (p.owner === owner && !p.launchAt) n++;
      if (n < PILE_MIN) continue;
      s.pileRollAt = this.now + Math.max(PILE_ROLL_MS_MIN, PILE_ROLL_MS_MAX - PILE_ROLL_MS_PER * n);
      if (Math.random() >= n / (n + PILE_CHANCE_K)) continue;
      // Whoever is nearest the floor is the one the floor goes for.
      let t: Fighter | null = null;
      for (const c of this.targetsOf(owner)) if (!t || c.y > t.y) t = c;
      if (!t) continue;
      const count = Math.min(n, BURST_BASE + Math.round(n * BURST_SHARE));
      this.burst(owner, t.x, t.y, count);
      if (owner === 'player' && this.api.isOnline) {
        this.api.broadcastMasteryCast(`fortune-burst:${Math.round(t.x)}:${Math.round(t.y)}:${count}`);
      }
    }
  }

  private burst(owner: Owner, tx: number, ty: number, count: number): void {
    const resting = this.pile.filter((p) => p.owner === owner && !p.launchAt)
      .sort((a, b) => Math.abs(a.x - tx) - Math.abs(b.x - tx))
      .slice(0, count);
    if (!resting.length) return;
    let lo = Infinity;
    let hi = -Infinity;
    resting.forEach((p, i) => {
      p.launchAt = this.now + BURST_WARN_MS + i * BURST_STAGGER_MS;
      p.tx = tx + (Math.random() - 0.5) * 2 * BURST_SCATTER;
      p.ty = ty + (Math.random() - 0.5) * 2 * BURST_SCATTER;
      lo = Math.min(lo, p.x);
      hi = Math.max(hi, p.x);
    });
    this.fx(owner).pileBurst((lo + hi) / 2, this.bottom, Math.max(30, hi - lo));
    Sfx.playAt('whoosh', (lo + hi) / 2, { rate: 0.7, volume: 0.6 });
  }

  /** A lifted blade: thrown on the arc that passes through its aim point after the flight time. */
  private launchPileBlade(p: PileBlade): void {
    const T = Phaser.Math.FloatBetween(BURST_FLIGHT_MIN, BURST_FLIGHT_MAX);
    const vx = (p.tx - p.x) / T;
    const vy = (p.ty - p.y - 0.5 * FRAY_GRAVITY * T * T) / T;
    this.blades.push({
      owner: p.owner, x: p.x, y: p.y - 2, vx, vy,
      // Already gold: it is the gilt that fell.
      born: this.now - FRAY_GILD_MS, seed: p.seed, dmg: FRAY_DAMAGE * this.might(p.owner),
    });
  }

  /** Online: the opponent's pile burst. */
  replayNpcUpgradeAct(id: string): void {
    if (!id.startsWith('fortune-burst:')) return;
    const [, tx, ty, n] = id.split(':').map(Number);
    if (![tx, ty, n].every(Number.isFinite)) return;
    this.ensureLayers();
    this.burst('npc', tx, ty, n);
  }

  private updateBags(): void {
    for (let i = this.bags.length - 1; i >= 0; i--) {
      const b = this.bags[i];
      if (this.now - b.start < BAG_MS) continue;
      this.bags.splice(i, 1);
      const r = PLUME_R * (b.cloak ? CLOAK_R_MULT : 1);
      this.plumes.push({
        owner: b.owner, x: b.tx, y: b.ty, r, cloak: b.cloak, born: this.now, until: this.now + PLUME_MS,
        seed: Math.random() * 999, tickAt: this.now + PLUME_TICK_MS,
      });
      this.fx(b.owner).bagBurst(b.tx, b.ty, r);
      Sfx.playAt('explosion-small', b.tx, { rate: 1.5, volume: 0.45 });
    }
  }

  private updatePlumes(dt: number): void {
    for (const owner of BOTH) this.side(owner).cloaked = false;
    this.inGlitter.clear();
    for (let i = this.plumes.length - 1; i >= 0; i--) {
      const pl = this.plumes[i];
      if (this.now >= pl.until) { this.plumes.splice(i, 1); continue; }
      // The owner, standing in it, is paid.
      const f = this.fighter(pl.owner);
      if (this.alive(f) && this.isGold(pl.owner)
        && Phaser.Math.Distance.Between(f.x, f.y, pl.x, pl.y) <= pl.r) {
        this.earn(pl.owner, PLUME_GOLD_PER_SEC * dt);
        if (pl.cloak) this.side(pl.owner).cloaked = true;
      }
      // R+ Glittery Cloak: anyone of theirs in the glitter cannot see straight.
      if (pl.cloak) {
        for (const t of this.targetsOf(pl.owner)) {
          if (Phaser.Math.Distance.Between(t.x, t.y, pl.x, pl.y) > pl.r + this.bodyR(t) * 0.5) continue;
          this.inGlitter.add(t);
          if (t === this.api.player) continue;
          if (this.now >= t.aimOffsetBonusUntil || t.aimOffsetBonusDeg < CLOAK_AIM_DEG) t.aimOffsetBonusDeg = CLOAK_AIM_DEG;
          t.aimOffsetBonusUntil = Math.max(t.aimOffsetBonusUntil, this.now + 250);
        }
      }
      if (this.now < pl.tickAt) continue;
      pl.tickAt += PLUME_TICK_MS;
      const dmg = PLUME_DPS * (PLUME_TICK_MS / 1000) * this.might(pl.owner);
      for (const t of this.targetsOf(pl.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, pl.x, pl.y) > pl.r + this.bodyR(t) * 0.5) continue;
        t.takeDamage(dmg);
      }
    }
  }

  /**
   * R+ Glittery Cloak, for a player standing in an enemy's glitter: the bot and husks aim through
   * `aimOffsetBonusDeg`, but a player aims with the mouse, so their own shots are knocked off line
   * as they leave the hand. Online this runs on the victim's machine, which replays the plume.
   */
  private updateGlitterShots(): void {
    const p = this.api.player;
    if (!p || !this.inGlitter.has(p)) return;
    const group = this.api.projectiles;
    if (!group) return;
    for (const obj of group.getChildren()) {
      if (!(obj instanceof Projectile) || !obj.active || !obj.isFromPlayer || obj.isHeal) continue;
      if (this.glitterShots.has(obj)) continue;
      this.glitterShots.add(obj);
      if (Phaser.Math.Distance.Between(obj.x, obj.y, p.x, p.y) > CLOAK_SHOT_R) continue;
      const body = obj.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const a = (Math.random() * 2 - 1) * CLOAK_JITTER;
      body.velocity.rotate(a);
      obj.rotation += a;
    }
  }

  /**
   * The gold heart. The Fighter fields are the truth (a cleanse that writes the timer to 0 ends
   * it); this map is the bookkeeping beside them. A heart this sim did not install — an online
   * mirror — is only drawn, and its stress is whatever the far machine says.
   */
  private updateHearts(dt: number): void {
    for (const f of this.allFighters()) {
      if (this.now < f.goldHeartUntil && !this.hearts.has(f)) {
        this.hearts.set(f, {
          by: f === this.api.player ? 'npc' : 'player', lx: f.x, ly: f.y, stress: f.goldHeartStress,
          raw: f.rawDamageTaken, acc: 0, live: false, seen: f.goldHeartStress,
        });
      }
    }
    for (const [f, h] of this.hearts) {
      if (!f.active || f.hp <= 0 || this.now >= f.goldHeartUntil) {
        this.hearts.delete(f);
        f.goldHeartUntil = 0;
        f.goldHeartStress = 0;
        continue;
      }
      if (!h.live) {
        // A mirrored heart that empties from nearly full has just had its attack on the far side.
        if (h.seen > 0.75 && f.goldHeartStress < 0.15) this.fx(h.by).heartAttack(f.x, f.y);
        h.seen = f.goldHeartStress;
        h.stress = f.goldHeartStress;
        continue;
      }
      const moved = Math.min(HEART_STEP_CAP, Phaser.Math.Distance.Between(h.lx, h.ly, f.x, f.y));
      h.lx = f.x;
      h.ly = f.y;
      if (!this.stunned(f)) {
        h.stress = Math.max(0, h.stress + moved / HEART_TRAVEL - HEART_CALM_PER_SEC * dt);
      }
      // Blood is money: every 20 the hearted body takes is a coin to whoever gilded it.
      const took = Math.max(0, f.rawDamageTaken - h.raw);
      h.raw = f.rawDamageTaken;
      h.acc += took;
      if (h.acc >= DAMAGE_PER_GOLD) {
        const coins = Math.floor(h.acc / DAMAGE_PER_GOLD);
        h.acc -= coins * DAMAGE_PER_GOLD;
        if (this.isGold(h.by)) this.earn(h.by, coins);
      }
      if (h.stress >= 1) {
        h.stress = 0;
        this.heartAttack(h.by, f);
      }
      f.goldHeartStress = h.stress;
    }
  }

  private heartAttack(by: Owner, f: Fighter): void {
    f.takeDamage(HEART_ATTACK_DAMAGE * this.might(by));
    this.stun(f, HEART_STUN_MS);
    this.fx(by).heartAttack(f.x, f.y);
    this.announce(f.x, f.y - 56, '💔 HEART ATTACK', FOR.bloodLit, 15);
    Sfx.playAt('hit-heavy', f.x, { rate: 0.7, volume: 1 });
  }

  private stunned(f: Fighter): boolean { return this.now < (this.stuns.get(f) ?? 0); }

  /**
   * A heart attack stops the body dead and stops its hands. The player and the bot are held by
   * this kit's speed mults (pulled by ArenaScene — online that is also what reaches the victim,
   * through the replica's `spd`), husks and bots by the shared `earthStunnedUntil`, and casting
   * by the generic disarm, which the online mirror carries.
   */
  private stun(f: Fighter, ms: number): void {
    this.stuns.set(f, Math.max(this.stuns.get(f) ?? 0, this.now + ms));
    f.applyDisarm(ms);
    if (f !== this.api.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  private updateStuns(): void {
    for (const [f, until] of this.stuns) {
      if (this.now < until && f.active) continue;
      this.stuns.delete(f);
    }
  }

  // ── Midas ──────────────────────────────────────────────────────────────────

  private updateCurses(): void {
    // Mirrors: a curse we were told about rather than cast is still a curse on this sim.
    for (const f of this.allFighters()) {
      if (this.now < f.midasUntil && !this.curses.has(f)) {
        this.curses.set(f, {
          by: f === this.api.player ? 'npc' : 'player', start: this.now, lx: f.x, ly: f.y, live: false,
        });
      }
    }
    const purge = this.now >= this.purgeAt;
    if (purge) this.purgeAt = this.now + PURGE_EVERY_MS;
    for (const [v, c] of this.curses) {
      if (!v.active || v.hp <= 0 || this.now >= v.midasUntil) {
        // Ran its full course (a cleanse writes the timer to 0, a death ends it early).
        const finished = v.midasUntil > 0 && v.active && v.hp > 0;
        this.curses.delete(v);
        v.midasUntil = 0;
        if (finished && c.live && this.up(c.by, 'q')) this.petrify(c.by, v);
        continue;
      }
      // The floor they walk on.
      if (Phaser.Math.Distance.Between(c.lx, c.ly, v.x, v.y) >= FLOOR_STEP) {
        c.lx = v.x;
        c.ly = v.y;
        this.patches.push({
          x: v.x + (Math.random() - 0.5) * 6, y: v.y + 10 + (Math.random() - 0.5) * 6,
          r: FLOOR_R * (0.85 + Math.random() * 0.3), seed: Math.random() * 999, born: this.now,
        });
        if (this.patches.length > FLOOR_MAX) this.patches.shift();
      }
      this.transmuteShots(v, c.by);
      // Summons: nothing a cursed fighter builds survives being made. Invasion is skipped: the
      // npc slot there is an ally, and husks build nothing a kit owns.
      if (purge && !this.api.isInvasion) {
        this.api.purgeSummons(v.x, v.y, 99999, c.by, (x, y) => {
          this.loot.push({
            kind: 'statue', by: c.by, x, y, fx: x, fy: y, born: this.now, r: 15,
            seed: Math.random() * 999,
          });
          this.fx(c.by).transmuteSummon(x, y, 22);
        });
      }
    }
  }

  /**
   * Every shot the cursed fighter fires drops out of the air as a coin. ArenaScene's shared
   * group carries no shooter, only a side: in a duel that side is the cursed body, in an Invasion
   * it is every husk, so there a shot is only theirs if it is first seen close to them.
   */
  private transmuteShots(v: Fighter, by: Owner): void {
    const fromPlayer = v === this.api.player;
    const crowd = this.api.isInvasion && !fromPlayer;
    const coinAt = (x: number, y: number): void => {
      const tx = this.clampX(x + (Math.random() - 0.5) * 16);
      const ty = this.clampY(y + 14 + Math.random() * 10);
      this.loot.push({ kind: 'coin', by, x: tx, y: ty, fx: x, fy: y, born: this.now, r: 6, seed: Math.random() * 999 });
      this.fx(by).coinDrop(x, y, tx, ty);
    };
    const group = this.api.projectiles;
    if (group) {
      for (const obj of group.getChildren().slice()) {
        if (!(obj instanceof Projectile) || !obj.active || obj.isHeal) continue;
        if (obj.isFromPlayer !== fromPlayer) continue;
        if (crowd) {
          if (this.seenShots.has(obj)) continue;
          this.seenShots.add(obj);
          if (Phaser.Math.Distance.Between(obj.x, obj.y, v.x, v.y) > SHOT_OWNER_R) continue;
        }
        const x = obj.x;
        const y = obj.y;
        obj.destroy();
        coinAt(x, y);
      }
    }
    if (crowd) {
      for (const p of this.api.stealHuskShots(v)) coinAt(p.x, p.y);
    } else {
      const reg = this.api.projectileRegistry;
      const side: Owner = fromPlayer ? 'player' : 'npc';
      for (const p of reg?.within(side, v.x, v.y, 99999) ?? []) {
        const x = p.getX();
        const y = p.getY();
        reg.steal(p);
        coinAt(x, y);
      }
    }
  }

  // ── Q+ Full Metal Alchemy ──────────────────────────────────────────────────

  private petrify(by: Owner, v: Fighter): void {
    v.goldStatueUntil = this.now + STATUE_MS;
    this.statues.set(v, { by, raw: v.rawDamageTaken, hit: false, live: true });
    this.stun(v, STATUE_MS);
    this.fx(by).statueForm(v.x, v.y);
    this.announce(v.x, v.y - 56, '🗿 SOLID GOLD', FOR.goldLit, 15);
    Sfx.playAt('money', v.x, { rate: 0.5, volume: 1 });
    Sfx.playAt('hit-heavy', v.x, { rate: 0.6, volume: 0.6 });
  }

  /**
   * A statue stands for three seconds. The one who made it chooses: hit it while it is brittle
   * (double damage), or leave it to melt and take the three coins it leaves. A hit spends the coins.
   * A statue this sim did not make — an online mirror — is drawn and held still, nothing more.
   */
  private updateStatues(): void {
    for (const f of this.allFighters()) {
      if (this.now < f.goldStatueUntil && !this.statues.has(f)) {
        this.statues.set(f, {
          by: f === this.api.player ? 'npc' : 'player', raw: f.rawDamageTaken, hit: false, live: false,
        });
        this.stun(f, f.goldStatueUntil - this.now);
      }
    }
    for (const [v, st] of this.statues) {
      const gone = !v.active || v.hp <= 0;
      if (!gone && st.live && !st.hit && v.rawDamageTaken > st.raw + 0.01) {
        st.hit = true;
        this.fx(st.by).statueCrack(v.x, v.y);
        this.announce(v.x, v.y - 44, 'CRACKED', FOR.brass, 11);
      }
      if (!gone && this.now < v.goldStatueUntil) continue;
      this.statues.delete(v);
      this.stuns.delete(v);
      v.goldStatueUntil = 0;
      if (gone) continue;
      this.fx(st.by).statueMelt(v.x, v.y);
      if (!st.live || st.hit || !this.isGold(st.by)) continue;
      for (let i = 0; i < STATUE_COINS; i++) {
        const tx = this.clampX(v.x + (i - 1) * 16 + (Math.random() - 0.5) * 6);
        const ty = this.clampY(v.y + 22 + Math.random() * 8);
        this.loot.push({ kind: 'coin', by: st.by, x: tx, y: ty, fx: v.x, fy: v.y, born: this.now, r: 6, seed: Math.random() * 999 });
        this.fx(st.by).coinDrop(v.x, v.y, tx, ty);
      }
      Sfx.playAt('money', v.x, { rate: 1.2, volume: 0.7 });
    }
  }

  private updateLoot(): void {
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i];
      if (this.now - l.born > LOOT_LIFE_MS) { this.loot.splice(i, 1); continue; }
      if (l.kind === 'coin' && this.now - l.born < COIN_DROP_MS) continue;
      const f = this.fighter(l.by);
      if (!this.alive(f) || !this.isGold(l.by)) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, l.x, l.y) > LOOT_PICK_R + l.r) continue;
      this.loot.splice(i, 1);
      this.earn(l.by, l.kind === 'coin' ? COIN_VALUE : STATUE_VALUE);
      this.fx(l.by).pickup(l.x, l.y);
      Sfx.playAt('money', l.x, { rate: l.kind === 'coin' ? 1.6 : 1.0, volume: 0.5 });
    }
  }

  /** Gold floor: half again as fast, and a coin every three seconds spent on it. */
  private updateFloor(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      s.onFloor = false;
      if (!this.isGold(owner) || !this.alive(f) || !this.patches.length) continue;
      for (const p of this.patches) {
        if (Math.abs(p.x - f.x) > p.r || Math.abs(p.y - (f.y + 10)) > p.r) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y + 10) <= p.r) { s.onFloor = true; break; }
      }
      if (!s.onFloor) continue;
      s.floorMs += delta;
      while (s.floorMs >= FLOOR_GOLD_MS) {
        s.floorMs -= FLOOR_GOLD_MS;
        this.earn(owner, 1);
      }
    }
  }

  /**
   * Everything the kit writes on bodies every frame, in one place so each field has one writer:
   * the alchemist's own hide, mend and vigor, the Ruby picks landing on whoever he fights, a
   * statue's brittleness and the cloak's dodge. Values from an online replica's picks never
   * reach here (its machine applies them and they arrive through `dm`, `spd`, `cd` and `gvig`), so
   * the local player's slow, cooldown and vigor fields are left to the mirror when online.
   */
  private updateSelf(dt: number): void {
    const incoming = new Map<Fighter, number>();
    const speed = new Map<Fighter, number>();
    const cool = new Map<Fighter, number>();
    const vigor = new Map<Fighter, number>();
    const mul = (m: Map<Fighter, number>, f: Fighter, v: number): void => { m.set(f, (m.get(f) ?? 1) * v); };
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      s.glow = Math.max(0, s.glow - dt * 2.2);
      if (!f || !this.isGold(owner) || this.isReplica(owner)) continue;
      this.recompute(owner);
      mul(incoming, f, Math.pow(HIDE_STEP, s.stats.hide) * Math.pow(RUBY_MIGHT, s.ruby.might));
      if (this.alive(f)) {
        if (s.stats.mend > 0) f.heal(MEND_HPS * s.stats.mend * dt);
        const want = Math.round(VIGOR_HP * s.stats.vigor);
        const d = want - s.vigorApplied;
        if (d !== 0) {
          f.increaseMaxHp(d);
          if (d > 0) f.heal(d);
          else if (f.hp > f.maxHp) f.hp = f.maxHp;
          s.vigorApplied = want;
        }
      }
      const r = s.ruby;
      if (r.hide + r.stride + r.haste + r.vigor + r.mend <= 0) continue;
      for (const t of this.targetsOf(owner)) {
        if (r.hide) mul(incoming, t, Math.pow(RUBY_HIDE, r.hide));
        if (r.stride) mul(speed, t, Math.pow(RUBY_STRIDE, r.stride));
        if (r.haste) mul(cool, t, Math.pow(RUBY_HASTE, r.haste));
        if (r.vigor) vigor.set(t, (vigor.get(t) ?? 0) + RUBY_VIGOR * r.vigor);
        // A statue does not bleed: it would spend the coins it is waiting to drop.
        if (r.mend && !this.statues.has(t)) {
          const acc = (this.bleedAcc.get(t) ?? 0) + RUBY_BLEED_HPS * r.mend * dt;
          const whole = Math.floor(acc);
          this.bleedAcc.set(t, acc - whole);
          if (whole > 0) t.takeDamage(whole);
        }
      }
    }
    for (const [v, st] of this.statues) if (st.live) mul(incoming, v, STATUE_VULN);

    const mirrored = this.api.isOnline ? this.api.player : null;
    for (const f of this.allFighters()) {
      f.fortuneIncomingMult = incoming.get(f) ?? 1;
      if (f !== mirrored) {
        f.goldSpeedMult = speed.get(f) ?? 1;
        f.goldCooldownMult = cool.get(f) ?? 1;
        f.goldVigorCut = vigor.get(f) ?? 0;
      } else {
        f.goldSpeedMult = 1;
        f.goldCooldownMult = 1;
      }
      this.applyVigorCut(f);
      // R+ Glittery Cloak: only on the body's own machine, where its hits are resolved.
      const owner: Owner | null = f === this.api.player ? 'player' : f === this.api.npc ? 'npc' : null;
      const cloaked = !!owner && !this.isReplica(owner) && this.side(owner).cloaked && this.up(owner, 'r');
      f.goldCloakDodge = cloaked ? CLOAK_DODGE : 0;
      const seen = this.dodgesSeen.get(f) ?? f.goldCloakDodges;
      if (f.goldCloakDodges > seen && this.alive(f)) {
        this.fx(owner ?? 'player').cloakDodge(f.x, f.y);
        this.announce(f.x, f.y - 44, '✨ DODGE', FOR.goldLit, 12);
      }
      this.dodgesSeen.set(f, f.goldCloakDodges);
    }
  }

  /** Ruby Vigor: take the cut off max HP as a change, so it can grow and come back. */
  private applyVigorCut(f: Fighter): void {
    const had = this.vigorCuts.get(f) ?? 0;
    const want = Math.max(0, f.goldVigorCut);
    if (want === had) return;
    const d = Math.min(want - had, f.maxHp - 1);
    f.increaseMaxHp(-d);
    if (f.hp > f.maxHp) f.hp = f.maxHp;
    this.vigorCuts.set(f, had + d);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paint(): void {
    const fg = this.floorGfx;
    const pg = this.plumeGfx;
    const gg = this.giltGfx;
    const ag = this.airGfx;
    const hg = this.hudGfx;
    if (!fg || !pg || !gg || !ag || !hg) return;
    fg.clear(); pg.clear(); gg.clear(); ag.clear(); hg.clear();
    const goldSide: Owner = this.isGold('player') ? 'player' : 'npc';

    for (const p of this.patches) {
      const a = Phaser.Math.Clamp((this.now - p.born) / 300, 0, 1);
      goldFloor(fg, this.col(goldSide), p.x, p.y, p.r, 0.85 * a, p.seed, this.vizT);
    }
    for (const l of this.loot) {
      const fade = Phaser.Math.Clamp((LOOT_LIFE_MS - (this.now - l.born)) / 1500, 0, 1);
      if (l.kind === 'statue') {
        goldStatue(fg, this.col(l.by), l.x, l.y, l.r, fade, l.seed, this.vizT);
        continue;
      }
      // A coin still dropping is drawn by its FX; it lands here.
      if (this.now - l.born < COIN_DROP_MS) continue;
      goldCoin(fg, this.col(l.by), l.x, l.y, l.r, this.vizT * 2 + l.seed, fade);
    }

    // Click+: the blades on the floor. A blade a burst has picked shivers and brightens first.
    for (const p of this.pile) {
      const stir = p.launchAt ? Phaser.Math.Clamp(1 - (p.launchAt - this.now) / BURST_WARN_MS, 0, 1) : 0;
      const sx = stir ? (Math.random() - 0.5) * 3 * stir : 0;
      const sy = stir ? -stir * 3 : 0;
      const len = PILE_BLADE_LEN;
      const rx = p.x - Math.cos(p.ang) * len * 0.5 + sx;
      const ry = p.y - Math.sin(p.ang) * len * 0.5 + sy;
      const a = Phaser.Math.Clamp((this.now - p.born) / 200, 0, 1);
      fg.fillStyle(this.col(p.owner)(FOR.ink), 0.3 * a);
      fg.fillEllipse(p.x, p.y + 3, len, 3);
      grassBlade(fg, this.col(p.owner), rx, ry, p.ang, len, 1, a);
      if (stir > 0) {
        fg.fillStyle(this.col(p.owner)(FOR.goldLit), 0.35 * stir);
        fg.fillCircle(p.x, p.y, 6 + stir * 4);
      }
    }

    for (const pl of this.plumes) {
      const born = Phaser.Math.Clamp((this.now - pl.born) / 260, 0, 1);
      const life = Phaser.Math.Clamp((pl.until - this.now) / 700, 0, 1);
      const r = pl.r * (0.7 + 0.3 * born);
      goldPlume(pg, this.col(pl.owner), pl.x, pl.y, r, 0.9 * born * life, this.vizT, pl.seed);
      if (pl.cloak) glitterMotes(pg, this.col(pl.owner), pl.x, pl.y, r, born * life, this.vizT, pl.seed);
    }

    for (const [v, c] of this.curses) {
      if (!v.active || v.alpha <= 0.05) continue;
      const prog = Phaser.Math.Clamp((this.now - c.start) / MIDAS_MS, 0, 1);
      midasGilt(gg, this.col(c.by), v.x, v.y, 0.15 + prog * 0.85, this.vizT, v.alpha);
    }
    for (const [v, st] of this.statues) {
      if (!v.active) continue;
      const left = v.goldStatueUntil - this.now;
      const melt = Phaser.Math.Clamp(1 - left / STATUE_MELT_MS, 0, 1);
      const a = Math.max(0.4, v.alpha);
      statueRays(gg, this.col(st.by), v.x, v.y, a * (1 - melt * 0.7), this.vizT);
      goldStatueShell(gg, this.col(st.by), v.x, v.y, a, this.vizT, melt, st.hit);
    }
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.side(owner).cloaked || !this.alive(f) || !this.up(owner, 'r')) continue;
      glitterCloak(gg, this.col(owner), f.x, f.y, f.alpha, this.vizT);
    }

    for (const b of this.blades) {
      const gild = Phaser.Math.Clamp((this.now - b.born) / FRAY_GILD_MS, 0, 1);
      const fade = Phaser.Math.Clamp((FRAY_LIFE_MS - (this.now - b.born)) / 300, 0, 1);
      grassBlade(ag, this.col(b.owner), b.x, b.y, Math.atan2(b.vy, b.vx), FRAY_BLADE_LEN, gild, fade);
    }
    for (const b of this.bags) {
      const u = Phaser.Math.Clamp((this.now - b.start) / BAG_MS, 0, 1);
      const x = b.fx + (b.tx - b.fx) * u;
      const y = b.fy + (b.ty - b.fy) * u - Math.sin(u * Math.PI) * 60;
      powderBag(ag, this.col(b.owner), x, y, u * 9, 1);
    }

    for (const [f, h] of this.hearts) {
      if (!f.active || f.alpha <= 0.05) continue;
      goldenHeart(hg, this.col(h.by), f.x, f.y - 46, h.stress, this.vizT, Math.max(0.35, f.alpha));
    }

    this.paintOffers(hg);
  }

  private paintOffers(g: Phaser.GameObjects.Graphics): void {
    let used = 0;
    let priced = 0;
    for (const owner of BOTH) {
      const offer = this.side(owner).offer;
      if (!offer) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const cs = this.cardCentres(owner);
      const s = this.side(owner);
      const hover = owner === 'player' ? this.cardUnder('player', s.aimX, s.aimY) : -1;
      const appear = Phaser.Math.Clamp((this.now - offer.opened) / 220, 0, 1);
      const out = offer.ghost ? Phaser.Math.Clamp((offer.decideAt - this.now) / 250, 0, 1) : 1;
      const a = appear * out;
      let jeweled = false;
      for (let i = 0; i < cs.length; i++) {
        const card = offer.cards[i];
        const rise = (1 - appear) * 14;
        const cx = cs[i].x;
        const cy = cs[i].y + rise;
        // Only the alchemist's own purse is known; a replica's jewels are never greyed.
        const short = !offer.ghost && card.price > s.gold;
        advanceCard(g, this.col(owner), cx, cy, CARD_W, CARD_H, card.kind, hover === i && !short, a, this.vizT);
        const def = STAT_BY_KIND.get(card.kind)!;
        const name = this.label(used++);
        name.setText(def.name).setPosition(cx, cy + 16).setAlpha(a).setVisible(true);
        const line = this.label(used++);
        line.setText(this.cardLine(owner, card)).setPosition(cx, cy + 27).setAlpha(a).setVisible(true)
          .setColor(card.jewel === 'ruby' ? '#ff8a8a' : '#e6c46a');
        if (!card.jewel) continue;
        jeweled = true;
        jewelGem(g, this.col(owner), cx, cy - CARD_H / 2 - 1, 6, card.jewel, a, this.vizT + i);
        if (short) {
          g.fillStyle(this.col(owner)(FOR.ink), a * 0.5);
          g.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 6);
        }
        const price = this.priceLabel(priced++);
        price.setText(`${JEWEL_NAME[card.jewel]}  ${card.price}🪙`).setPosition(cx, cy + CARD_H / 2 + 7)
          .setAlpha(a).setVisible(true).setColor(short ? '#ff6b6b' : '#fff0a8');
      }
      // The fuse on an unanswered offer, under the cards (and under the prices, when there are any).
      if (!offer.ghost && owner === 'player') {
        const left = Phaser.Math.Clamp((offer.until - this.now) / OFFER_MS, 0, 1);
        const span = cs.length * CARD_W + (cs.length - 1) * CARD_GAP;
        const x0 = cs[0].x - CARD_W / 2;
        const y0 = cs[0].y + CARD_H / 2 + (jeweled ? 15 : 5);
        goldFuse(g, this.col(owner), x0, y0, span, left, a, this.vizT);
      }
    }
    for (let i = used; i < this.labels.length; i++) this.labels[i].setVisible(false);
    for (let i = priced; i < this.priceLabels.length; i++) this.priceLabels[i].setVisible(false);
  }

  private label(i: number): Phaser.GameObjects.Text {
    while (this.labels.length <= i) {
      const big = this.labels.length % 2 === 0;
      this.labels.push(this.api.scene.add.text(0, 0, '', {
        fontSize: big ? '8px' : '7px', fontFamily: big ? FONT_DISPLAY : FONT_UI, fontStyle: big ? 'normal' : 'bold',
        color: big ? '#fff3c4' : '#e6c46a', align: 'center',
        stroke: '#17110a', strokeThickness: big ? 2.5 : 2,
      }).setOrigin(0.5).setDepth(17).setVisible(false));
    }
    return this.labels[i];
  }

  /** E+ Artisan: the stone and its price, under a jeweled card. */
  private priceLabel(i: number): Phaser.GameObjects.Text {
    while (this.priceLabels.length <= i) {
      this.priceLabels.push(this.api.scene.add.text(0, 0, '', {
        fontSize: '7px', fontFamily: FONT_UI, fontStyle: 'bold', color: '#fff0a8', align: 'center',
        stroke: '#17110a', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(17).setVisible(false));
    }
    return this.priceLabels[i];
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      if (owner === 'npc') {
        const t = this.targetsOf('npc')[0];
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setGlowHand(Math.max(s.glow, s.offer ? 0.7 : 0));
      av.setGold(Math.min(1, s.gold / 30));
      av.setMastered(false);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    this.api.setStatusIndicator('gold-purse', playerIs ? {
      name: 'Gold', emoji: '🪙', color: FOR.gold, priority: 150,
      description: `Your purse. Advance (E) spends ${ADVANCE_COST}. Earned standing in your own Gold Plume (${PLUME_GOLD_PER_SEC}/s), from a gold-hearted enemy (1 per ${DAMAGE_PER_GOLD} damage they take), from Midas gold floor (1 every ${FLOOR_GOLD_MS / 1000}s on it), and from the coins and statues a cursed enemy leaves behind.`,
      count: s.gold,
    } : null);
    this.api.setStatusIndicator('gold-floor', playerIs && s.onFloor ? {
      name: 'Gold Floor', emoji: '✨', color: FOR.goldLit, priority: 151,
      description: `Standing on gilded floor: ${Math.round((FLOOR_SPEED - 1) * 100)}% faster, and 1 gold every ${FLOOR_GOLD_MS / 1000} seconds.`,
    } : null);
    for (const st of STATS) {
      const n = playerIs ? s.stats[st.kind] : 0;
      const shown = Math.round(n * 10) / 10;
      this.api.setStatusIndicator(`gold-stat-${st.kind}`, n > 0 ? {
        name: `Advance: ${st.name[0]}${st.name.slice(1).toLowerCase()}`, emoji: '⬆️', color: st.color, priority: 152,
        description: `${st.line} per pick, for the rest of the match. Worth ${shown} picks right now: ${this.statLine(st.kind, n)}.`,
        count: shown,
      } : null);
    }
    this.api.setStatusIndicator('gold-cloak', playerIs && this.api.player?.goldCloakDodge > 0 ? {
      name: 'Glittery Cloak', emoji: '✨', color: FOR.goldLit, priority: 151.5,
      description: `Standing in your own glittery plume: ${Math.round(CLOAK_DODGE * 100)}% of incoming attacks miss you.`,
    } : null);
    const rubies = RUBY_KINDS.filter((k) => s.ruby[k] > 0);
    this.api.setStatusIndicator('gold-ruby', playerIs && rubies.length ? {
      name: 'Ruby Curses', emoji: '♦️', color: FOR.bloodLit, priority: 152.5,
      description: `Your ruby picks, turned on whoever you fight: ${rubies.map((k) => `${this.rubyLine(k)} ×${s.ruby[k]}`).join(', ')}.`,
      count: rubies.reduce((n, k) => n + s.ruby[k], 0),
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ─────────────────────────

  private speedFor(owner: Owner): number {
    const s = this.side(owner);
    return (1 + STRIDE_STEP * s.stats.stride) * (s.onFloor ? FLOOR_SPEED : 1);
  }

  /** Stride, the gold floor and a heart attack, pulled by ArenaScene's speed block. */
  getPlayerSpeedMult(): number {
    const p = this.api.player;
    if (!p) return 1;
    if (this.stunned(p)) return 0;
    // Ruby Stride, from the bot's picks (online it arrives through `spd` instead, and this is 1).
    return p.goldSpeedMult * (this.isGold('player') ? this.speedFor('player') : 1);
  }

  getNpcSpeedMult(): number {
    const n = this.api.npc;
    if (!n) return 1;
    if (this.stunned(n)) return 0;
    // Ruby Stride on the npc counts online too: it is what `spd` carries to the victim.
    const slow = n.goldSpeedMult;
    // An online replica's motion is streamed; its own boosts already happened on its machine.
    if (!this.isGold('npc') || this.api.isOnline) return slow;
    return slow * this.speedFor('npc');
  }

  coinsOf(owner: Owner): number { return this.side(owner).gold; }

  /** True while the bot can afford Advance and is not already choosing. */
  npcCanAdvance(): boolean {
    const s = this.sides.npc;
    return !s.offer && s.gold >= ADVANCE_COST;
  }

  npcLunging(): boolean { return !!this.sides.npc.lunge; }

  /** The bot's target is wearing the bot's gold heart. */
  npcHeartLive(): boolean {
    const p = this.api.player;
    const h = p ? this.hearts.get(p) : undefined;
    return !!h && h.by === 'npc' && this.now < p.goldHeartUntil;
  }

  /**
   * Q+ Full Metal Alchemy, for the bot: its statue is standing and it would rather have the three
   * coins than the double damage — it is short of an Advance. Side-effect-free.
   */
  npcStatueHold(): boolean {
    const p = this.api.player;
    const st = p ? this.statues.get(p) : undefined;
    return !!st && st.live && st.by === 'npc' && !st.hit && this.sides.npc.gold < ADVANCE_COST;
  }

  npcMidasLive(): boolean {
    const p = this.api.player;
    return !!p && this.curses.get(p)?.by === 'npc' && this.now < p.midasUntil;
  }

  /**
   * Fray falls, so aiming at the body throws under it. The aim point that puts the clump's middle
   * through the target, lifted by the drop over the flight time.
   */
  npcFrayAim(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    const p = this.api.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    const d = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    const v = (FRAY_SPEED_MIN + FRAY_SPEED_MAX) / 2;
    const t = d / v;
    return { x: p.x, y: p.y - 0.5 * FRAY_GRAVITY * t * t };
  }

  /** Where the bot's plume should go: on a gold-hearted target (they have to walk out), else at its own feet toward them. */
  npcPlumeAt(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    const p = this.api.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    if (this.npcHeartLive()) return { x: p.x, y: p.y };
    const a = Math.atan2(p.y - n.y, p.x - n.x);
    const d = Math.min(PLUME_RANGE, Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y) * 0.45);
    return { x: n.x + Math.cos(a) * d, y: n.y + Math.sin(a) * d };
  }

  /**
   * Somewhere worth standing: its own plume while it lasts, loot it can pick up, or gold floor
   * while Midas is laying it. Side-effect-free.
   */
  npcSeekPoint(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    if (!this.alive(n) || !this.isGold('npc')) return undefined;
    const s = this.sides.npc;
    let best: { x: number; y: number } | undefined;
    let bestD = Infinity;
    for (const pl of this.plumes) {
      if (pl.owner !== 'npc' || pl.until - this.now < 1500) continue;
      const d = Phaser.Math.Distance.Between(n.x, n.y, pl.x, pl.y);
      if (d < pl.r * 0.6) return undefined;
      if (d < NPC_PLUME_SEEK_R && d < bestD) { bestD = d; best = { x: pl.x, y: pl.y }; }
    }
    if (best) return best;
    for (const l of this.loot) {
      if (l.by !== 'npc') continue;
      const d = Phaser.Math.Distance.Between(n.x, n.y, l.x, l.y);
      if (d < NPC_LOOT_SEEK_R && d < bestD) { bestD = d; best = { x: l.x, y: l.y }; }
    }
    if (best) return best;
    if (!s.onFloor && this.npcMidasLive()) {
      for (const p of this.patches) {
        const d = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y - 10);
        if (d < NPC_FLOOR_SEEK_R && d < bestD) { bestD = d; best = { x: p.x, y: p.y - 10 }; }
      }
    }
    return best;
  }

  /**
   * Ability tray fill. Advance shows how close the purse is to the price; Midas counts the curse
   * down while it is on someone.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    void time;
    const cd = p.getCooldownRatio(abilityId);
    if (abilityId === 'fortune-advance') {
      return Math.min(cd, Phaser.Math.Clamp(this.sides.player.gold / ADVANCE_COST, 0, 1));
    }
    if (abilityId === 'fortune-midas') {
      for (const [v, c] of this.curses) {
        if (c.by === 'player' && this.now < v.midasUntil) {
          return 0.1 + 0.9 * Phaser.Math.Clamp((v.midasUntil - this.now) / MIDAS_MS, 0, 1);
        }
      }
    }
    return cd;
  }
}
