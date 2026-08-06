import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { STATUS_DESCRIPTORS, isDebuff, seedEffectSnapshot, stretchNewEffects } from '../../combat/StatusEffects';
import { Sfx } from '../../audio';
import {
  FOR, FortuneAvatar, FortuneColorFn, FortuneFx, bulletShape, daggerShape,
  goldBeam, muzzleOf, pepperFlame, roombaShape, stall, turnstile,
} from './FortuneVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── Passive: Shopkeeper ──────────────────────────────────────────────────────
/** Damage anybody deals, per blood coin it is worth. */
const DAMAGE_PER_COIN = 20;
/** How close you have to stand to the counter to be served. */
const SHOP_RANGE = 132;
/** What an enemy's purchase kicks back to the shopkeeper. */
const KICKBACK = 0.5;
/** How often a bot or a husk wanders up and buys something. */
const BOT_BUY_MS = 9000;

// ── Weapons ──────────────────────────────────────────────────────────────────
const BULLET_LIFE_MS = 1600;
const BULLET_R = 8;
/** Attachments are capped at two. The gun is capped at one. That is the whole loadout. */
const MAX_ATTACHMENTS = 2;

// ── Safe Investment (E) ──────────────────────────────────────────────────────
const DEPOSIT = 5;
const SETTLE_MS = 10_000;
const CAPITAL_GAINS = 0.10;
/** However small the balance, a bank pays *something*. */
const CAPITAL_FLOOR = 1;

// ── Risky Investment (R) ─────────────────────────────────────────────────────
const RISK_DEAL_BAR = 50;
const RISK_TAKE_BAR = 100;
const RISK_UP = 0.20;
const RISK_DOWN = -0.20;
/** Did well and got hit: the market splits the difference rather than picking a side. */
const RISK_MIXED = 0.10;

// ── Paywall (F) ──────────────────────────────────────────────────────────────
const WALL_MS = 5000;
/** Half-width of the band a shot or a body has to be inside to be charged. */
const WALL_HALF = 15;
const TOLL_SHOT = 1;
const TOLL_BODY = 3;

// ── Pay-to-Win (Q) ───────────────────────────────────────────────────────────
const BEAM_MS = 8000;
const BEAM_LEN = 520;
const BEAM_HALF = 15;
const BEAM_DPS = 95;
const BEAM_COINS_PER_SEC = 6;
/** Radians per second the beam is allowed to turn. Deliberately slow — it is walked, not aimed. */
const BEAM_TURN = 1.15;

// ── Items ────────────────────────────────────────────────────────────────────

const PEPPER_MS = 5000;
const PEPPER_DROP_MS = 70;
const PEPPER_LIFE_MS = 2600;
const PEPPER_R = 22;
const PEPPER_DPS = 26;

const POUCH_CHARGES = 5;
const POUCH_R = 96;
/** Minimum gap between two pouch blasts, so a blast can't detonate the next charge itself. */
const POUCH_GATE_MS = 260;

const CURE_MS = 20_000;
const MIRACLE_MS = 20_000;

const DAGGER_VOLLEYS = 3;
const DAGGER_PER_VOLLEY = 8;
const DAGGER_DAMAGE = 2;
const DAGGER_GAP_MS = 170;
const DAGGER_SPEED = 620;
const DAGGER_SPREAD = 0.62;

const ROOMBA_MAX = 3;
const ROOMBA_DAMAGE = 25;
const ROOMBA_SPEED = 96;
/** Per-victim immunity, or one roomba parked on somebody is a blender. */
const ROOMBA_GATE_MS = 1400;

// ── Shop tables ──────────────────────────────────────────────────────────────

type Page = 'shop' | 'arms' | 'mods';
const PAGES: Page[] = ['shop', 'arms', 'mods'];
const PAGE_NAME: Record<Page, string> = { shop: 'GENERAL', arms: 'ARMS ☠', mods: 'MODS ☠' };

interface ShopEntry {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  page: Page;
  /** One line, shown on the counter. */
  desc: string;
}

/**
 * The legal page. Both sides can see it and both sides can buy off it, which is the whole
 * passive: every one of these that an enemy takes hands half its price back to the shopkeeper.
 */
const GENERAL: ShopEntry[] = [
  { id: 'bandages', name: 'Bandages', emoji: '🩹', cost: 4, page: 'shop', desc: 'Heal 20 HP.' },
  { id: 'pepper', name: 'Spicy Pepper', emoji: '🌶️', cost: 3, page: 'shop', desc: 'Burn a fire trail behind you for 5s.' },
  { id: 'pouch', name: 'Explosives Pouch', emoji: '🧨', cost: 3, page: 'shop', desc: 'Next 5 hits blast everyone ELSE nearby.' },
  { id: 'cureall', name: 'Cure-All', emoji: '🧪', cost: 10, page: 'shop', desc: 'Cleanse, heal 50, no new debuffs for 20s.' },
  { id: 'daggers', name: 'Ornate Daggers', emoji: '🗡️', cost: 5, page: 'shop', desc: '3 volleys of 8 daggers, 2 dmg each.' },
  { id: 'roomba', name: 'Death Machine', emoji: '🤖', cost: 8, page: 'shop', desc: 'A knife on a vacuum. 25 dmg on touch, max 3.' },
  { id: 'miracle', name: 'The Miracle', emoji: '🏺', cost: 12, page: 'shop', desc: 'Double every good thing for 20s.' },
  { id: 'donation', name: 'Donation', emoji: '💝', cost: 20, page: 'shop', desc: 'Thank you for your generous support.' },
];

/** Guns. One at a time; buying a second replaces the first. */
const ARMS: ShopEntry[] = [
  { id: 'pistol', name: 'Pistol', emoji: '🔫', cost: 0, page: 'arms', desc: '10 dmg · 10 rounds · fast.' },
  { id: 'revolver', name: 'Revolver', emoji: '🎯', cost: 5, page: 'arms', desc: '20 dmg · 6 rounds.' },
  { id: 'rifle', name: 'Rifle', emoji: '🪖', cost: 10, page: 'arms', desc: '30 dmg · 1 round · begging for a mag.' },
  { id: 'ar', name: 'AR', emoji: '💥', cost: 15, page: 'arms', desc: '3-round burst · 8 dmg each · 30 rounds.' },
  { id: 'golden', name: 'Golden Pistol', emoji: '🌟', cost: 30, page: 'arms', desc: 'Hitscan · 20 dmg +1 per 2 coins held.' },
];

/** Attachments. Two at a time. */
const MODS: ShopEntry[] = [
  { id: 'silencer', name: 'Silencer', emoji: '🤫', cost: 3, page: 'mods', desc: 'Hits silence for 2s.' },
  { id: 'biggermag', name: 'Bigger Mag', emoji: '📦', cost: 3, page: 'mods', desc: '+3 magazine.' },
  { id: 'drummag', name: 'Drum Mag', emoji: '🥁', cost: 12, page: 'mods', desc: '+10 magazine.' },
  { id: 'hollow', name: 'Hollow Point', emoji: '🔩', cost: 8, page: 'mods', desc: '+5 bullet damage.' },
  { id: 'fiftycal', name: '50 Cal.', emoji: '🛢️', cost: 15, page: 'mods', desc: '+10 bullet damage.' },
  { id: 'scope', name: 'Sniper Scope', emoji: '🔭', cost: 3, page: 'mods', desc: 'Bullets +100% speed and pierce.' },
  { id: 'prop', name: 'Action Movie Prop', emoji: '🎬', cost: 10, page: 'mods', desc: 'Every shot launches you backwards.' },
];

const CATALOGUE: Record<Page, ShopEntry[]> = { shop: GENERAL, arms: ARMS, mods: MODS };
const ENTRY_BY_ID = new Map<string, ShopEntry>(
  [...GENERAL, ...ARMS, ...MODS].map((e) => [e.id, e]),
);

interface GunDef {
  damage: number;
  mag: number;
  reloadMs: number;
  /** Minimum gap between trigger pulls. */
  fireMs: number;
  speed: number;
  size: number;
  burst?: number;
  hitscan?: boolean;
  /** Golden pistol: the purse is the damage stat. */
  coinScaled?: boolean;
  sfx: string;
  rate: number;
}

const GUNS: Record<string, GunDef> = {
  pistol:   { damage: 10, mag: 10, reloadMs: 1150, fireMs: 190, speed: 900, size: 5, sfx: 'musket', rate: 1.55 },
  revolver: { damage: 20, mag: 6, reloadMs: 1500, fireMs: 380, speed: 880, size: 6, sfx: 'musket', rate: 1.15 },
  rifle:    { damage: 30, mag: 1, reloadMs: 1250, fireMs: 420, speed: 1120, size: 7, sfx: 'shotgun', rate: 0.85 },
  ar:       { damage: 8, mag: 30, reloadMs: 1700, fireMs: 340, speed: 980, size: 4.4, burst: 3, sfx: 'musket', rate: 1.9 },
  golden:   { damage: 20, mag: 10, reloadMs: 1400, fireMs: 300, speed: 0, size: 5, hitscan: true, sfx: 'light-beam', rate: 1.2 },
};

// ── World objects ────────────────────────────────────────────────────────────

interface Bullet {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: boolean;
  silencer: boolean;
  size: number;
  seed: number;
  diesAt: number;
  hit: Set<Fighter>;
  reg: RegisteredProjectile | null;
}

interface Dagger {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  diesAt: number;
  hit: Set<Fighter>;
}

/** One scheduled volley of Ornate Daggers still to be thrown. */
interface Volley {
  owner: Owner;
  at: number;
  ang: number;
}

interface Flame {
  owner: Owner;
  x: number;
  y: number;
  seed: number;
  bornAt: number;
  diesAt: number;
}

interface Roomba {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  spin: number;
  gate: Map<Fighter, number>;
}

interface Wall {
  owner: Owner;
  x: number;
  diesAt: number;
  seed: number;
  /** Shots already charged, so a slow bullet is not billed every frame it is inside the band. */
  tolledShots: Set<object>;
  /** Which side of the line each body was on last frame. */
  sideOf: Map<Fighter, number>;
  /** Recent payments, for the turnstile slots to light up. */
  flash: number;
}

interface Beam {
  owner: Owner;
  ang: number;
  endsAt: number;
  /** Per-victim tick accumulator, so damage is dealt in readable chunks rather than per frame. */
  tick: number;
}

/** A push that has to survive the movement code, so it is applied as displacement in `update`. */
interface Shove {
  vx: number;
  vy: number;
  until: number;
}

interface Side {
  owner: Owner;
  coins: number;
  /** Damage dealt that has not yet added up to a whole coin. */
  coinFrac: number;
  bank: number;
  bankTimer: number;
  stocks: number;
  stockTimer: number;
  stockDealt: number;
  stockTaken: number;

  gun: string | null;
  attachments: string[];
  ammo: number;
  reloadUntil: number;
  nextShotAt: number;
  burstLeft: number;
  burstAt: number;
  burstAng: number;
  lastShotAt: number;

  /**
   * The body a lingering item was actually bought for. In Invasion the "npc side" is a whole
   * wave, so re-asking `buyerFor` every frame would walk a fire trail between husks — the
   * purchase pins it to whoever swallowed the pepper.
   */
  effectBody: Fighter | null;
  pepperUntil: number;
  pepperDrop: number;
  pouch: number;
  pouchGate: number;
  cureUntil: number;
  miracleUntil: number;
  miracleSnap: Map<string, number>;

  wall: Wall | null;
  beam: Beam | null;
  shove: Shove | null;

  page: Page;
  aimX: number;
  aimY: number;
  botBuyAt: number;
  /** Lifetime spend, purely so the stall's coin stack has something to shrink about. */
  spent: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, coins: 0, coinFrac: 0, bank: 0, bankTimer: 0, stocks: 0, stockTimer: 0,
    stockDealt: 0, stockTaken: 0,
    gun: 'pistol', attachments: [], ammo: GUNS.pistol.mag, reloadUntil: 0, nextShotAt: 0,
    burstLeft: 0, burstAt: 0, burstAng: 0, lastShotAt: 0,
    effectBody: null, pepperUntil: 0, pepperDrop: 0, pouch: 0, pouchGate: 0, cureUntil: 0,
    miracleUntil: 0, miracleSnap: new Map(),
    wall: null, beam: null, shove: null,
    page: 'shop', aimX: 0, aimY: 0, botBuyAt: 0, spent: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface FortuneArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** The shared physics group. The Paywall has to be able to bill every shot in the game. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** ...and the other half of them, which never join a group. */
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  get isInvasion(): boolean;
  /** Skins: maps a Fortune visual colour through that side's equipped skin. */
  fortuneColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter | null;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── FortuneKit ───────────────────────────────────────────────────────────────

export class FortuneKit {
  private api: FortuneArenaApi;

  // ── Visuals ──
  private readonly pcol: FortuneColorFn;
  private readonly ncol: FortuneColorFn;
  private readonly pfx: FortuneFx;
  private readonly nfx: FortuneFx;
  private playerAvatar: FortuneAvatar | null = null;
  private npcAvatar: FortuneAvatar | null = null;
  /** The stall, the paywall footings and the fire trail — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Bullets, daggers, roombas, turnstile heads and the beam — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The counter panel. Its own layer so the shop can sit over everything in the arena. */
  private shopGfx: Phaser.GameObjects.Graphics | null = null;
  private shopTexts: Phaser.GameObjects.Text[] = [];
  /** Last colour pushed to each row. `setColor` re-renders the texture, so it is guarded. */
  private shopColors: string[] = [];
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private bullets: Bullet[] = [];
  private daggers: Dagger[] = [];
  private volleys: Volley[] = [];
  private flames: Flame[] = [];
  private roombas: Roomba[] = [];
  /** Last seen `rawDamageTaken` per body — the only meter the whole economy runs off. */
  private rawSeen = new Map<Fighter, number>();
  /** Bodies whose debuffs this kit is holding down for a Cure-All. */
  private cured = new Set<Fighter>();

  // ── Input ──
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];
  private tabKey: Phaser.Input.Keyboard.Key | null = null;
  private eDownAt = 0;
  private rDownAt = 0;
  private eHeldDone = false;
  private rHeldDone = false;
  private ePrev = false;
  private rPrev = false;

  constructor(api: FortuneArenaApi) {
    this.api = api;
    this.pcol = (base) => api.fortuneColor('player', base);
    this.ncol = (base) => api.fortuneColor('npc', base);
    this.pfx = new FortuneFx(api.scene, this.pcol);
    this.nfx = new FortuneFx(api.scene, this.ncol);
    this.setupKeys();
  }

  /** Idempotent — `addKey` hands back the existing Key when one is still registered. */
  private setupKeys(): void {
    const kb = this.api.scene.input.keyboard;
    if (!kb) return;
    const codes = [
      Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE, Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN, Phaser.Input.Keyboard.KeyCodes.EIGHT,
    ];
    this.numberKeys = codes.map((c) => kb.addKey(c));
    this.tabKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.T);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): FortuneFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): FortuneColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }
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

  private isFortune(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'fortune' : this.api.npcElementId === 'fortune';
  }

  /** Which side, if any, owns the stall. There is only ever one shop in an arena. */
  private get shopOwner(): Owner | null {
    if (this.isFortune('player')) return 'player';
    if (this.isFortune('npc')) return 'npc';
    return null;
  }

  private avatar(owner: Owner): FortuneAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /**
   * Which side gets paid for hurting `victim`.
   *
   * The player is always the npc side's to bleed, and everything in `enemies` is the player's.
   * The npc slot is the one that changes meaning: in Invasion it is a co-op ally, so a husk
   * chewing on it still pays the husks — but in a plain 1v1 it *is* the enemy, and reading it
   * as an ally there paid the player's own hits to the opponent.
   */
  private creditFor(victim: Fighter): Owner {
    if (victim === this.api.player) return 'npc';
    if (victim === this.api.npc) return this.api.isInvasion ? 'npc' : 'player';
    return 'player';
  }

  /** The body that receives an item bought by `owner`. In Invasion the buyers are the husks. */
  private buyerFor(owner: Owner): Fighter | null {
    if (owner === 'player') return this.alive(this.api.player) ? this.api.player : null;
    if (this.api.isInvasion) {
      let best: Fighter | null = null;
      for (const f of this.api.enemies) if (this.alive(f) && (!best || f.hp > best.hp)) best = f;
      return best;
    }
    return this.alive(this.api.npc) ? this.api.npc : null;
  }

  /** Centre of the stall. Middle of the screen, nudged up so the counter is not under the feet. */
  private get stallX(): number { return this.api.width / 2; }
  private get stallY(): number { return this.api.height / 2 - 12; }

  private distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 <= 0 ? 0 : Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Phaser's KeyboardPlugin destroys every Key in `shutdown()`, so the ones the constructor
    // registered are corpses from the second match on — the counter has to re-claim them here.
    this.setupKeys();
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.bullets = [];
    this.daggers = [];
    this.volleys = [];
    this.flames = [];
    this.roombas = [];
    this.rawSeen.clear();
    this.cured.clear();
    this.vizT = 0;
    this.eDownAt = 0;
    this.rDownAt = 0;
    this.eHeldDone = false;
    this.rHeldDone = false;
    this.ePrev = false;
    this.rPrev = false;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.shopGfx?.destroy(); this.shopGfx = null;
    for (const t of this.shopTexts) t.destroy();
    this.shopTexts = [];
    this.shopColors = [];
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Runs whenever a shop exists, not only when the player is Fortune — an enemy of a Fortune
   * npc is still a customer, and the number keys are how they pay.
   */
  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    const shop = this.shopOwner;
    if (!shop) return;

    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;

    this.handleShopInput(shop);
    if (!this.isFortune('player')) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    // Held-trigger fire, but only when the gun is actually ready: `castAbility` is what plays an
    // ability's voice line, so asking it 60 times a second through a reload would be a machine
    // gun made of UI noise.
    if (pointer.isDown && this.canFireNow('player')) p.castAbility('fortune-fire', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('fortune-paywall', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('fortune-p2w', ctx);

    // ── E and R are tap-to-deposit, hold-to-withdraw ──
    // The tap has to resolve on *release*, because until the key comes back up there is no way
    // to know it was not a hold — so `castAbility` is deliberately not on JustDown here.
    this.investKey(this.api.eKey, 'e', ctx);
    this.investKey(this.api.rKey, 'r', ctx);
  }

  private investKey(key: Phaser.Input.Keyboard.Key, which: 'e' | 'r', ctx: CastContext): void {
    const HOLD_MS = 340;
    const down = key.isDown;
    const prev = which === 'e' ? this.ePrev : this.rPrev;
    const p = this.api.player;

    if (down && !prev) {
      if (which === 'e') { this.eDownAt = this.now; this.eHeldDone = false; }
      else { this.rDownAt = this.now; this.rHeldDone = false; }
    }
    const downAt = which === 'e' ? this.eDownAt : this.rDownAt;
    const done = which === 'e' ? this.eHeldDone : this.rHeldDone;

    if (down && !done && this.now - downAt >= HOLD_MS) {
      if (which === 'e') this.eHeldDone = true; else this.rHeldDone = true;
      this.withdraw('player', which === 'e' ? 'bank' : 'stocks');
    }
    if (!down && prev && !done) {
      p.castAbility(which === 'e' ? 'fortune-safe' : 'fortune-risky', ctx);
    }
    if (which === 'e') this.ePrev = down; else this.rPrev = down;
  }

  /** Number keys buy; T changes tab, but only for the person who owns the stall. */
  private handleShopInput(shop: Owner): void {
    const p = this.api.player;
    const s = this.sides.player;
    const mine = shop === 'player';
    if (!mine) s.page = 'shop';

    if (Phaser.Math.Distance.Between(p.x, p.y, this.stallX, this.stallY) > SHOP_RANGE) return;

    if (mine && this.tabKey && Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      s.page = PAGES[(PAGES.indexOf(s.page) + 1) % PAGES.length];
      Sfx.playAt('ui-tab', p.x, { volume: 0.6 });
    }

    const list = CATALOGUE[s.page];
    for (let i = 0; i < this.numberKeys.length && i < list.length; i++) {
      if (!Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) continue;
      this.buy('player', list[i]);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — fire whatever is in the hand.
   *
   * The ability's own cooldown is deliberately shorter than any gun's cycle: the *gun* is the
   * rate limiter, and refusing here refunds the cast so a held mouse button doesn't quietly
   * burn the cooldown while the slide is still travelling.
   */
  doFire(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'fortune-fire'); return; }
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    if (s.beam) { this.refund(f, 'fortune-fire'); return; }
    const gun = s.gun ? GUNS[s.gun] : null;
    if (!gun) { this.refund(f, 'fortune-fire'); return; }

    if (this.now < s.reloadUntil || this.now < s.nextShotAt) { this.refund(f, 'fortune-fire'); return; }
    if (s.ammo <= 0) { this.beginReload(owner); this.refund(f, 'fortune-fire'); return; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.nextShotAt = this.now + gun.fireMs;
    if (gun.burst && gun.burst > 1) {
      s.burstLeft = Math.min(gun.burst, s.ammo);
      s.burstAt = this.now;
      s.burstAng = ang;
      return;
    }
    this.shoot(owner, ang);
  }

  /** E — put money in the bank. */
  doSafeInvest(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (s.coins <= 0) {
      this.refund(f, 'fortune-safe');
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '🏦 NOTHING TO DEPOSIT', this.hex(FOR.canvasShade));
      return;
    }
    const amount = Math.min(DEPOSIT, s.coins);
    s.coins -= amount;
    s.bank += amount;
    this.fx(owner).cash(f.x, f.y, 30, 420, 12);
    this.api.showFloatingText(f.x, f.y - 44, `🏦 +${amount} BANKED`, this.hex(FOR.gold));
    Sfx.playAt('money', f.x, { volume: 0.6, rate: 1.15 });
  }

  /** R — put money in the market. */
  doRiskyInvest(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (s.coins <= 0) {
      this.refund(f, 'fortune-risky');
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '📈 NOTHING TO INVEST', this.hex(FOR.canvasShade));
      return;
    }
    const amount = Math.min(DEPOSIT, s.coins);
    s.coins -= amount;
    s.stocks += amount;
    // Fresh money resets the window it will be judged on, or a deposit made at 9.9 seconds
    // would settle on somebody else's damage.
    s.stockTimer = 0;
    s.stockDealt = 0;
    s.stockTaken = 0;
    this.fx(owner).cash(f.x, f.y, 30, 420, 12);
    this.api.showFloatingText(f.x, f.y - 44, `📈 +${amount} INVESTED`, this.hex(FOR.contraband));
    Sfx.playAt('money', f.x, { volume: 0.6, rate: 0.85 });
  }

  /** F — the turnstiles. */
  doPaywall(owner: Owner, tx: number, ty: number): void {
    void ty;
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'fortune-paywall'); return; }
    const s = this.side(owner);
    s.wall = {
      owner,
      x: Phaser.Math.Clamp(tx, this.left + 24, this.right - 24),
      diesAt: this.now + WALL_MS,
      seed: Math.random() * 999,
      tolledShots: new Set(),
      sideOf: new Map(),
      flash: 0,
    };
    this.avatar(owner)?.play('slam', Math.atan2(ty - f.y, tx - f.x));
    this.api.showFloatingText(s.wall.x, this.top + 30, '🎫 PAYWALL', this.hex(FOR.gold));
    Sfx.playAt('stone-rise', s.wall.x, { volume: 0.8, rate: 1.2 });
    Sfx.playAt('gear-turn', s.wall.x, { volume: 0.6 });
  }

  /** Q — the golden beam. Refuses outright if the purse cannot pay for a single second of it. */
  doPayToWin(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'fortune-p2w'); return; }
    const s = this.side(owner);
    if (s.beam) { this.refund(f, 'fortune-p2w'); return; }
    if (s.coins < BEAM_COINS_PER_SEC) {
      this.refund(f, 'fortune-p2w');
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 46, '💸 INSUFFICIENT FUNDS', this.hex(FOR.blood));
      Sfx.playAt('ui-denied', f.x, { volume: 0.7 });
      return;
    }
    s.beam = { owner, ang: Math.atan2(ty - f.y, tx - f.x), endsAt: this.now + BEAM_MS, tick: 0 };
    this.avatar(owner)?.play('raise', s.beam.ang);
    this.api.showFloatingText(f.x, f.y - 50, '💰 PAY-TO-WIN', this.hex(FOR.goldLit));
    Sfx.playAt('beam-charge', f.x, { volume: 0.9, rate: 0.9 });
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  /**
   * Whether pulling the trigger right now would produce a bullet. Checked *before* the cast
   * rather than inside it, because a refused cast has already stamped (and voiced) itself.
   */
  canFireNow(owner: Owner): boolean {
    const s = this.side(owner);
    if (s.beam || !s.gun) return false;
    if (this.now < s.reloadUntil || this.now < s.nextShotAt) return false;
    return s.ammo > 0;
  }

  // ── Guns ───────────────────────────────────────────────────────────────────

  /** Every attachment folded into one set of numbers. */
  private loadout(s: Side): {
    def: GunDef; damage: number; mag: number; speed: number; pierce: boolean; silencer: boolean; prop: boolean;
  } | null {
    const def = s.gun ? GUNS[s.gun] : null;
    if (!def) return null;
    const has = (id: string): boolean => s.attachments.includes(id);
    let damage = def.damage;
    if (has('hollow')) damage += 5;
    if (has('fiftycal')) damage += 10;
    let mag = def.mag;
    if (has('biggermag')) mag += 3;
    if (has('drummag')) mag += 10;
    const scope = has('scope');
    return {
      def,
      damage,
      mag,
      speed: def.speed * (scope ? 2 : 1),
      pierce: scope,
      silencer: has('silencer'),
      prop: has('prop'),
    };
  }

  private magSize(s: Side): number { return this.loadout(s)?.mag ?? 0; }

  private beginReload(owner: Owner): void {
    const s = this.side(owner);
    const kit = this.loadout(s);
    if (!kit || this.now < s.reloadUntil) return;
    s.reloadUntil = this.now + kit.def.reloadMs;
    s.burstLeft = 0;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.avatar(owner)?.setGun(null);
      Sfx.playAt('reload', f.x, { volume: 0.65 });
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 40, '🔄 RELOADING', this.hex(FOR.steel));
    }
  }

  private shoot(owner: Owner, ang: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const kit = this.loadout(s);
    if (!kit || !this.alive(f)) return;

    s.ammo = Math.max(0, s.ammo - 1);
    s.lastShotAt = this.now;
    const av = this.avatar(owner);
    av?.play('punch', ang);
    av?.kick(kit.def.hitscan ? 0.6 : 1);
    const mz = muzzleOf(f.x, f.y, ang, s.gun ?? 'pistol');
    const fx = this.fx(owner);
    fx.muzzle(mz.x, mz.y, ang, kit.def.hitscan ? 0.8 : 1);
    fx.brass(f.x, f.y - 4, ang);
    Sfx.playAt(kit.def.sfx, f.x, { volume: kit.silencer ? 0.28 : 0.8, rate: kit.def.rate * (kit.silencer ? 1.5 : 1) });

    // Action Movie Prop: the shot moves the shooter. Applied as displacement in `update`,
    // because ArenaScene rewrites the body's velocity from WASD every frame.
    if (kit.prop) {
      const push = kit.def.hitscan ? 250 : 340;
      s.shove = { vx: -Math.cos(ang) * push, vy: -Math.sin(ang) * push, until: this.now + 260 };
    }

    if (kit.def.hitscan) {
      this.hitscan(owner, ang, kit.damage, kit.silencer, kit.pierce);
    } else {
      const bullet: Bullet = {
        owner,
        x: mz.x, y: mz.y,
        vx: Math.cos(ang) * kit.speed,
        vy: Math.sin(ang) * kit.speed,
        damage: kit.damage,
        pierce: kit.pierce,
        silencer: kit.silencer,
        size: kit.def.size,
        seed: Math.random() * 999,
        diesAt: this.now + BULLET_LIFE_MS,
        hit: new Set(),
        reg: null,
      };
      const reg: RegisteredProjectile = {
        owner,
        getX: () => bullet.x,
        getY: () => bullet.y,
        damage: bullet.damage,
        steal: () => {
          const i = this.bullets.indexOf(bullet);
          if (i >= 0) this.bullets.splice(i, 1);
        },
      };
      bullet.reg = reg;
      this.api.projectileRegistry.add(reg);
      this.bullets.push(bullet);
    }

    if (s.ammo <= 0) this.beginReload(owner);
  }

  /** The Golden Pistol. Instant, and the purse is part of the damage roll. */
  private hitscan(owner: Owner, ang: number, base: number, silencer: boolean, pierce: boolean): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const bonus = Math.floor(s.coins / 2);
    const damage = base + bonus;
    const ex = f.x + Math.cos(ang) * BEAM_LEN;
    const ey = f.y + Math.sin(ang) * BEAM_LEN;

    const fx = this.fx(owner);
    fx.anim(11, 220, (g, t) => {
      const a = (1 - t) * 0.9;
      g.lineStyle(7 * (1 - t) + 1, this.col(owner)(FOR.gold), a * 0.35);
      g.lineBetween(f.x, f.y, ex, ey);
      g.lineStyle(2.6 * (1 - t) + 0.6, this.col(owner)(FOR.hot), a);
      g.lineBetween(f.x, f.y, ex, ey);
    });

    // Nearest first, so a non-piercing laser stops at the body actually in the way.
    const along = this.targetsOf(owner)
      .filter((t) => this.distToSegment(t.x, t.y, f.x, f.y, ex, ey) <= 16 * t.sizeMult + 8)
      .sort((a, b) => Phaser.Math.Distance.Between(f.x, f.y, a.x, a.y)
        - Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y));
    for (const t of along) {
      this.landHit(owner, t, damage, ang, silencer);
      if (!pierce) break;
    }
    if (bonus > 0 && owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 54, `🌟 +${bonus} WEALTH`, this.hex(FOR.goldLit));
    }
  }

  /** One bullet landing on one body: damage, the silencer's gag, and the noise. */
  private landHit(owner: Owner, victim: Fighter, damage: number, ang: number, silencer: boolean): void {
    victim.takeDamage(damage);
    this.fx(owner).impact(victim.x, victim.y, ang);
    this.api.spawnHitFlash(victim.x, victim.y, FOR.gold);
    if (silencer) {
      victim.silencedUntil = Math.max(victim.silencedUntil, Date.now() + 2000);
      this.api.showFloatingText(victim.x, victim.y - 34, '🤫 SILENCED', this.hex(FOR.contraband));
      Sfx.playAt('status-silence', victim.x, { volume: 0.5 });
    }
  }

  // ── The shop ───────────────────────────────────────────────────────────────

  /**
   * A purchase. The kickback is the passive: everything an outsider buys hands the shopkeeper
   * half of what they paid, which is why a Fortune player wants the enemy shopping.
   */
  private buy(buyer: Owner, entry: ShopEntry): boolean {
    const s = this.side(buyer);
    const shop = this.shopOwner;
    if (!shop) return false;
    // The illegal pages exist for exactly one person.
    if (entry.page !== 'shop' && buyer !== shop) return false;

    const body = this.buyerFor(buyer);
    if (!body) return false;

    if (s.coins < entry.cost) {
      if (buyer === 'player') {
        this.api.showFloatingText(body.x, body.y - 44, `💸 NEED ${entry.cost - s.coins} MORE`, this.hex(FOR.blood));
        Sfx.playAt('ui-denied', body.x, { volume: 0.7 });
      }
      return false;
    }
    if (!this.canBuy(buyer, entry)) {
      if (buyer === 'player') {
        this.api.showFloatingText(body.x, body.y - 44, '🚫 ALREADY OWNED', this.hex(FOR.canvasShade));
        Sfx.playAt('ui-denied', body.x, { volume: 0.7 });
      }
      return false;
    }

    s.coins -= entry.cost;
    s.spent += entry.cost;
    s.effectBody = body;
    this.applyItem(buyer, entry, body);

    // Kickback. A Fortune user buying from their own stall is only moving money between
    // pockets, so it is skipped rather than paid to themselves.
    if (buyer !== shop && entry.cost > 0) {
      const cut = Math.floor(entry.cost * KICKBACK);
      if (cut > 0) {
        const keeper = this.side(shop);
        keeper.coins += cut;
        const kf = this.fighter(shop);
        if (this.alive(kf)) {
          this.fx(shop).coinBurst(kf.x, kf.y - 10, Math.min(6, cut), 26);
          this.api.showFloatingText(kf.x, kf.y - 56, `🪙 +${cut} COMMISSION`, this.hex(FOR.goldLit));
        }
      }
    }

    this.fx(buyer).cash(this.stallX, this.stallY, 46, 520, 22);
    this.api.showFloatingText(body.x, body.y - 48, `${entry.emoji} ${entry.name.toUpperCase()}`, this.hex(FOR.gold));
    Sfx.playAt('ui-purchase', this.stallX, { volume: 0.8 });
    return true;
  }

  /** Whether a purchase would actually change anything. */
  private canBuy(buyer: Owner, entry: ShopEntry): boolean {
    const s = this.side(buyer);
    if (entry.page === 'arms') return s.gun !== entry.id;
    if (entry.page === 'mods') {
      if (s.attachments.includes(entry.id)) return false;
      return s.attachments.length < MAX_ATTACHMENTS;
    }
    if (entry.id === 'roomba') return this.roombas.filter((r) => r.owner === buyer).length < ROOMBA_MAX;
    return true;
  }

  private applyItem(buyer: Owner, entry: ShopEntry, body: Fighter): void {
    const s = this.side(buyer);
    const miracle = this.now < s.miracleUntil ? 2 : 1;

    switch (entry.id) {
      case 'bandages':
        body.heal(20 * miracle);
        this.api.showFloatingText(body.x, body.y - 30, `🩹 +${20 * miracle}`, this.hex(FOR.blood));
        Sfx.playAt('heal', body.x, { volume: 0.7 });
        break;
      case 'pepper':
        s.pepperUntil = this.now + PEPPER_MS * miracle;
        Sfx.playAt('flame-burst', body.x, { volume: 0.6, rate: 1.3 });
        break;
      case 'pouch':
        s.pouch += POUCH_CHARGES;
        Sfx.playAt('trap-set', body.x, { volume: 0.7 });
        break;
      case 'cureall':
        this.cleanse(body);
        body.heal(50 * miracle);
        s.cureUntil = this.now + CURE_MS * miracle;
        this.fx(buyer).cash(body.x, body.y, 40, 520, 12);
        Sfx.playAt('potion-drink', body.x, { volume: 0.8 });
        break;
      case 'daggers':
        for (let i = 0; i < DAGGER_VOLLEYS; i++) {
          this.volleys.push({ owner: buyer, at: this.now + i * DAGGER_GAP_MS, ang: this.aimAngle(buyer, body) });
        }
        break;
      case 'roomba':
        this.roombas.push({
          owner: buyer,
          x: Phaser.Math.Clamp(body.x + (Math.random() - 0.5) * 40, this.left + 20, this.right - 20),
          y: Phaser.Math.Clamp(body.y + 22, this.top + 20, this.bottom - 20),
          ang: this.aimAngle(buyer, body),
          spin: Math.random() * 6,
          gate: new Map(),
        });
        Sfx.playAt('robot-power', body.x, { volume: 0.8 });
        break;
      case 'miracle':
        s.miracleUntil = this.now + MIRACLE_MS;
        seedEffectSnapshot(body, s.miracleSnap);
        Sfx.playAt('holy-chord', body.x, { volume: 0.85 });
        break;
      case 'donation':
        // The item is the joke. It is also the single largest source of income in the element,
        // which is why it is priced where somebody might actually be tempted.
        this.api.showFloatingText(body.x, body.y - 32, '💝 THANK YOU', this.hex(FOR.goldLit));
        Sfx.playAt('jackpot', body.x, { volume: 0.75 });
        break;
      default:
        if (entry.page === 'arms') {
          s.gun = entry.id;
          s.ammo = this.magSize(s);
          s.reloadUntil = 0;
          s.burstLeft = 0;
          this.avatar(buyer)?.setGun(entry.id);
          Sfx.playAt('anvil', body.x, { volume: 0.7, rate: 1.2 });
        } else if (entry.page === 'mods') {
          s.attachments.push(entry.id);
          // A bigger magazine that does not go in until you next reload is just a worse item.
          s.ammo = Math.min(this.magSize(s), s.ammo + (entry.id === 'biggermag' ? 3 : entry.id === 'drummag' ? 10 : 0));
          Sfx.playAt('gear-turn', body.x, { volume: 0.7 });
        }
        break;
    }
  }

  private aimAngle(owner: Owner, from: Fighter): number {
    const s = this.side(owner);
    if (owner === 'player') return Math.atan2(s.aimY - from.y, s.aimX - from.x);
    const t = this.targetsOf(owner)[0];
    return t ? Math.atan2(t.y - from.y, t.x - from.x) : 0;
  }

  /**
   * Cure-All. Every writable debuff timer in the descriptor table is set back to zero, plus the
   * handful of stacking effects that have no writer. Re-run every frame for the whole 20
   * seconds, which is what "cannot gain any new negative effects" means in a codebase where
   * statuses are written as bare expiry stamps from forty different places.
   */
  private cleanse(f: Fighter): void {
    for (const desc of STATUS_DESCRIPTORS) {
      if (desc.kind !== 'timer' || !desc.write || !isDebuff(desc)) continue;
      if (desc.read(f) > 0) desc.write(f, 0);
    }
    f.frostStacks = 0;
    f.frostStackTimers = [];
    f.voidFrostStacks = 0;
    f.voidFrostStackTimers = [];
    f.darkVulnStacks = 0;
    f.hopelessness = 0;
    f.bleeding = false;
    f.bleedingUntil = 0;
    f.toxicUntil = 0;
    f.vulnerableNextHit = false;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const shop = this.shopOwner;
    if (!shop && !this.hasLiveState()) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateEconomy(delta);
    this.updateInvestments(delta);
    this.updateBursts();
    this.updateBullets(delta);
    this.updateVolleys();
    this.updateDaggers(delta);
    this.updateFlames(delta);
    this.updateRoombas(delta);
    this.updateWalls(delta);
    this.updateBeams(delta);
    this.updateShoves(delta);
    this.updateItemAuras();
    this.updateBots(delta);
    this.updateAvatars(delta);

    this.paintGround();
    this.paintAir();
    this.paintShop(shop);
    this.pushStatuses(shop);
    void time;
  }

  /** Anything of this kit's still standing, whoever is currently Fortune. */
  private hasLiveState(): boolean {
    return this.bullets.length > 0 || this.daggers.length > 0 || this.volleys.length > 0
      || this.flames.length > 0 || this.roombas.length > 0 || this.cured.size > 0
      || BOTH.some((o) => !!this.sides[o].wall || !!this.sides[o].beam);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. The stall and the fire trail are things you walk in front of; the
    // bullets, the roombas and the beam are things that pass over you.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  // ── The economy ────────────────────────────────────────────────────────────

  /**
   * The entire passive, in one loop.
   *
   * There is no central "damage dealt" hook in the game, so the meter is `rawDamageTaken` on
   * every body in play, diffed each frame. Whatever a body lost, the other side dealt — and
   * every 20 of it is a blood coin. The same diff drives the Explosives Pouch and the risky
   * market's two thresholds, so all three read exactly the same number.
   */
  private updateEconomy(delta: number): void {
    void delta;
    const seen: Fighter[] = [this.api.player, this.api.npc, ...this.api.enemies];
    for (const f of seen) {
      if (!f || !f.active) continue;
      const prev = this.rawSeen.get(f);
      const raw = f.rawDamageTaken;
      this.rawSeen.set(f, raw);
      if (prev === undefined) continue;
      const dealt = raw - prev;
      if (dealt <= 0) continue;

      const earner = this.creditFor(f);
      const s = this.side(earner);
      s.coinFrac += dealt;
      s.stockDealt += dealt;
      this.side(this.other(earner)).stockTaken += dealt;

      const coins = Math.floor(s.coinFrac / DAMAGE_PER_COIN);
      if (coins > 0) {
        s.coinFrac -= coins * DAMAGE_PER_COIN;
        s.coins += coins;
        this.fx(earner).coinBurst(f.x, f.y - 6, Math.min(5, coins), 24);
      }

      this.tryPouch(earner, f, dealt);
    }

    // Bodies that have left the arena stop being metered, or the map grows for the whole match.
    for (const f of [...this.rawSeen.keys()]) if (!f.active) this.rawSeen.delete(f);
  }

  /**
   * The Explosives Pouch. The AOE deliberately spares the body that was hit — the item is a
   * cleave onto everything *else*, not a damage multiplier, which is why it is only three coins.
   */
  private tryPouch(owner: Owner, victim: Fighter, damage: number): void {
    const s = this.side(owner);
    if (s.pouch <= 0 || damage <= 0) return;
    if (this.now < s.pouchGate) return;
    s.pouchGate = this.now + POUCH_GATE_MS;
    s.pouch--;

    this.fx(owner).boom(victim.x, victim.y, POUCH_R * 0.7);
    Sfx.playAt('explosion-small', victim.x, { volume: 0.8 });
    let struck = 0;
    for (const t of this.targetsOf(owner)) {
      if (t === victim) continue;
      if (Phaser.Math.Distance.Between(t.x, t.y, victim.x, victim.y) > POUCH_R) continue;
      t.takeDamage(damage);
      this.api.spawnHitFlash(t.x, t.y, FOR.blood);
      struck++;
    }
    if (owner === 'player') {
      this.api.showFloatingText(victim.x, victim.y - 52,
        struck > 0 ? `🧨 SPLASH ×${struck}` : '🧨 NOBODY ELSE', this.hex(FOR.gold));
    }
  }

  /** The two investment vehicles, both settling on the same 10-second drum. */
  private updateInvestments(delta: number): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      const miracle = this.now < s.miracleUntil ? 2 : 1;

      if (s.bank > 0) {
        s.bankTimer += delta;
        if (s.bankTimer >= SETTLE_MS) {
          s.bankTimer -= SETTLE_MS;
          const gain = Math.max(CAPITAL_FLOOR, Math.floor(s.bank * CAPITAL_GAINS * miracle));
          s.bank += gain;
          if (this.alive(f)) {
            this.fx(owner).coinBurst(f.x, f.y - 14, Math.min(5, gain), 22);
            this.api.showFloatingText(f.x, f.y - 60, `🏦 +${gain} CAPITAL GAINS`, this.hex(FOR.gold));
            Sfx.playAt('money', f.x, { volume: 0.55, rate: 1.35 });
          }
        }
      } else {
        s.bankTimer = 0;
      }

      if (s.stocks > 0) {
        s.stockTimer += delta;
        if (s.stockTimer >= SETTLE_MS) {
          s.stockTimer -= SETTLE_MS;
          const good = s.stockDealt > RISK_DEAL_BAR;
          const bad = s.stockTaken > RISK_TAKE_BAR;
          s.stockDealt = 0;
          s.stockTaken = 0;
          const rate = good && bad ? RISK_MIXED : good ? RISK_UP * miracle : bad ? RISK_DOWN : 0;
          if (rate !== 0) {
            const delta2 = Math.max(1, Math.round(Math.abs(s.stocks * rate))) * Math.sign(rate);
            s.stocks = Math.max(0, s.stocks + delta2);
            if (this.alive(f)) {
              const up = delta2 > 0;
              this.api.showFloatingText(f.x, f.y - 60,
                `${up ? '📈' : '📉'} ${up ? '+' : ''}${delta2} STOCK`,
                this.hex(up ? FOR.contraband : FOR.blood));
              Sfx.playAt(up ? 'money' : 'error-popup', f.x, { volume: 0.6, rate: up ? 1.5 : 1 });
            }
          }
        }
      } else {
        s.stockTimer = 0;
        s.stockDealt = 0;
        s.stockTaken = 0;
      }
    }
  }

  private withdraw(owner: Owner, which: 'bank' | 'stocks'): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const amount = which === 'bank' ? s.bank : s.stocks;
    if (amount <= 0) {
      if (owner === 'player' && this.alive(f)) {
        this.api.showFloatingText(f.x, f.y - 44, which === 'bank' ? '🏦 EMPTY' : '📈 EMPTY', this.hex(FOR.canvasShade));
      }
      return;
    }
    if (which === 'bank') { s.bank = 0; s.bankTimer = 0; }
    else { s.stocks = 0; s.stockTimer = 0; s.stockDealt = 0; s.stockTaken = 0; }
    s.coins += amount;
    if (this.alive(f)) {
      this.fx(owner).coinBurst(f.x, f.y - 10, Math.min(9, amount), 40, 800);
      this.api.showFloatingText(f.x, f.y - 48, `🪙 WITHDREW ${amount}`, this.hex(FOR.goldLit));
      Sfx.playAt('jackpot', f.x, { volume: 0.7 });
    }
  }

  // ── Weapons upkeep ─────────────────────────────────────────────────────────

  private updateBursts(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (s.burstLeft <= 0) continue;
      if (this.now < s.burstAt) continue;
      s.burstLeft--;
      s.burstAt = this.now + 70;
      this.shoot(owner, s.burstAng + (Math.random() - 0.5) * 0.07);
    }
    for (const owner of BOTH) {
      const s = this.sides[owner];
      // An empty magazine reloads itself. `canFireNow` gates the trigger, so nothing else in
      // the kit would ever notice the gun had run dry.
      if (s.gun && s.ammo <= 0 && s.reloadUntil === 0 && this.isFortune(owner)) this.beginReload(owner);
      // A finished reload puts the gun back in the hand.
      if (s.reloadUntil > 0 && this.now >= s.reloadUntil) {
        s.reloadUntil = 0;
        s.ammo = this.magSize(s);
        this.avatar(owner)?.setGun(s.gun);
        const f = this.fighter(owner);
        if (this.alive(f)) Sfx.playAt('ui-click', f.x, { volume: 0.5, rate: 0.8 });
      }
    }
  }

  private updateBullets(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const ang = Math.atan2(b.vy, b.vx);

      let spent = false;
      for (const t of this.targetsOf(b.owner)) {
        if (b.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BULLET_R + 12 * t.sizeMult) continue;
        b.hit.add(t);
        this.landHit(b.owner, t, b.damage, ang, b.silencer);
        if (!b.pierce) { spent = true; break; }
      }

      const gone = spent || this.now >= b.diesAt
        || b.x < this.left || b.x > this.right || b.y < this.top || b.y > this.bottom;
      if (!gone) continue;
      if (!spent) this.fx(b.owner).impact(b.x, b.y, ang + Math.PI, 180);
      if (b.reg) this.api.projectileRegistry.remove(b.reg);
      this.bullets.splice(i, 1);
    }
  }

  // ── Ornate Daggers ─────────────────────────────────────────────────────────

  private updateVolleys(): void {
    for (let i = this.volleys.length - 1; i >= 0; i--) {
      const v = this.volleys[i];
      if (this.now < v.at) continue;
      this.volleys.splice(i, 1);
      const f = this.fighter(v.owner);
      if (!this.alive(f)) continue;
      // Re-aimed at throw time rather than at purchase: three volleys over half a second
      // should follow a target that has moved, not spray where they used to be.
      const ang = this.aimAngle(v.owner, f);
      for (let k = 0; k < DAGGER_PER_VOLLEY; k++) {
        const a = ang + (k / (DAGGER_PER_VOLLEY - 1) - 0.5) * 2 * DAGGER_SPREAD;
        this.daggers.push({
          owner: v.owner,
          x: f.x + Math.cos(a) * 20,
          y: f.y + Math.sin(a) * 20,
          vx: Math.cos(a) * DAGGER_SPEED,
          vy: Math.sin(a) * DAGGER_SPEED,
          ang: a,
          diesAt: this.now + 900,
          hit: new Set(),
        });
      }
      this.avatar(v.owner)?.play('sweep', ang);
      Sfx.playAt('whoosh', f.x, { volume: 0.5, rate: 1.5 });
    }
  }

  private updateDaggers(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.daggers.length - 1; i >= 0; i--) {
      const d = this.daggers[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      let spent = false;
      for (const t of this.targetsOf(d.owner)) {
        if (d.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) > 12 + 12 * t.sizeMult) continue;
        d.hit.add(t);
        t.takeDamage(DAGGER_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, FOR.steel);
        spent = true;
        break;
      }
      const gone = spent || this.now >= d.diesAt
        || d.x < this.left || d.x > this.right || d.y < this.top || d.y > this.bottom;
      if (gone) this.daggers.splice(i, 1);
    }
  }

  // ── Spicy Pepper ───────────────────────────────────────────────────────────

  private updateFlames(delta: number): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (this.now >= s.pepperUntil) continue;
      const f = s.effectBody ?? this.buyerFor(owner);
      if (!this.alive(f)) continue;
      s.pepperDrop += delta;
      if (s.pepperDrop < PEPPER_DROP_MS) continue;
      s.pepperDrop = 0;
      this.flames.push({
        owner, x: f!.x, y: f!.y + 8, seed: Math.random() * 999,
        bornAt: this.now, diesAt: this.now + PEPPER_LIFE_MS,
      });
    }

    const dt = delta / 1000;
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const fl = this.flames[i];
      if (this.now >= fl.diesAt) { this.flames.splice(i, 1); continue; }
      for (const t of this.targetsOf(fl.owner)) {
        if (Phaser.Math.Distance.Between(fl.x, fl.y, t.x, t.y) > PEPPER_R + 8 * t.sizeMult) continue;
        // One patch's worth of dps, not the sum of every patch you are standing in — a doubled
        // back trail is a wider trap, not a hotter one.
        t.takeDamage(PEPPER_DPS * dt * (1 / Math.max(1, this.overlapCount(fl.owner, t))));
        t.burningUntil = Math.max(t.burningUntil, this.now + 900);
      }
    }
  }

  private overlapCount(owner: Owner, t: Fighter): number {
    let n = 0;
    for (const fl of this.flames) {
      if (fl.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(fl.x, fl.y, t.x, t.y) <= PEPPER_R + 8 * t.sizeMult) n++;
    }
    return n;
  }

  // ── Death Machines ─────────────────────────────────────────────────────────

  private updateRoombas(delta: number): void {
    const dt = delta / 1000;
    for (const r of this.roombas) {
      r.spin += dt * 4;
      const targets = this.targetsOf(r.owner);
      let best: Fighter | null = null;
      let bestD = Infinity;
      for (const t of targets) {
        const d = Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y);
        if (d < bestD) { bestD = d; best = t; }
      }
      // No target: potter around the middle of the arena rather than freezing in place.
      const tx = best ? best.x : this.stallX + Math.cos(this.vizT * 0.7) * 90;
      const ty = best ? best.y : this.stallY + Math.sin(this.vizT * 0.9) * 60;
      const want = Math.atan2(ty - r.y, tx - r.x);
      r.ang = Phaser.Math.Angle.RotateTo(r.ang, want, 3.2 * dt);
      r.x = Phaser.Math.Clamp(r.x + Math.cos(r.ang) * ROOMBA_SPEED * dt, this.left + 12, this.right - 12);
      r.y = Phaser.Math.Clamp(r.y + Math.sin(r.ang) * ROOMBA_SPEED * dt, this.top + 12, this.bottom - 12);

      for (const t of targets) {
        if (Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) > 20 + 12 * t.sizeMult) continue;
        const gate = r.gate.get(t) ?? 0;
        if (this.now < gate) continue;
        r.gate.set(t, this.now + ROOMBA_GATE_MS);
        t.takeDamage(ROOMBA_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, FOR.steel);
        this.fx(r.owner).impact(t.x, t.y, r.ang + Math.PI);
        this.api.showFloatingText(t.x, t.y - 36, '🤖 DEATH MACHINE', this.hex(FOR.steel));
        Sfx.playAt('slash', t.x, { volume: 0.7, rate: 1.2 });
      }
    }
  }

  // ── Paywall ────────────────────────────────────────────────────────────────

  private updateWalls(delta: number): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const w = s.wall;
      if (!w) continue;
      w.flash = Math.max(0, w.flash - delta / 260);
      if (this.now >= w.diesAt) { s.wall = null; continue; }

      const theirs = this.other(owner);
      const mineIsPlayer = owner === 'player';

      // Shots in the shared group.
      for (const obj of this.api.projectiles.getChildren()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        if (Math.abs(p.x - w.x) > WALL_HALF) continue;
        if (w.tolledShots.has(p)) continue;
        w.tolledShots.add(p);
        this.toll(owner, theirs, TOLL_SHOT, w.x, p.y, w);
      }
      // ...and the kit-local ones.
      // Radius has to reach the far corners of the arena from the wall's midpoint, or a shot
      // crossing near the top of the screen would slip through unbilled.
      for (const rp of this.api.projectileRegistry.within(theirs, w.x, this.api.height / 2,
        Math.hypot(this.api.width, this.api.height))) {
        if (Math.abs(rp.getX() - w.x) > WALL_HALF) continue;
        if (w.tolledShots.has(rp)) continue;
        w.tolledShots.add(rp);
        this.toll(owner, theirs, TOLL_SHOT, w.x, rp.getY(), w);
      }

      // Bodies. Charged on the crossing, not on standing in the band, so leaning on a turnstile
      // is free and walking through it is not.
      for (const t of this.targetsOf(owner)) {
        const side = Math.sign(t.x - w.x) || 1;
        const prev = w.sideOf.get(t);
        w.sideOf.set(t, side);
        if (prev === undefined || prev === side) continue;
        this.toll(owner, theirs, TOLL_BODY, w.x, t.y, w);
      }
    }
  }

  /** Somebody has just used the turnstile. Take their money and give it to the shopkeeper. */
  private toll(owner: Owner, payer: Owner, amount: number, x: number, y: number, w: Wall): void {
    const from = this.side(payer);
    const to = this.side(owner);
    const paid = Math.min(amount, from.coins);
    w.flash = 1;
    Sfx.playAt(paid > 0 ? 'money' : 'ui-denied', x, { volume: 0.55, rate: paid > 0 ? 1.4 : 1 });
    if (paid <= 0) {
      this.api.showFloatingText(x, y - 18, '🎫 NO FUNDS', this.hex(FOR.canvasShade));
      return;
    }
    from.coins -= paid;
    to.coins += paid;
    this.fx(owner).coinBurst(x, y, Math.min(4, paid), 20, 560);
    this.api.showFloatingText(x, y - 18, `🎫 −${paid}`, this.hex(FOR.gold));
  }

  // ── Pay-to-Win ─────────────────────────────────────────────────────────────

  private updateBeams(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const b = s.beam;
      if (!b) continue;
      const f = this.fighter(owner);

      // Ends on time, on death, or on the money running out — whichever comes first.
      if (!this.alive(f) || this.now >= b.endsAt) { this.endBeam(owner, this.now >= b.endsAt ? 'spent' : 'dead'); continue; }

      const want = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      b.ang = Phaser.Math.Angle.RotateTo(b.ang, want, BEAM_TURN * dt);

      // The bill, taken in whole coins as they come due.
      b.tick += dt * BEAM_COINS_PER_SEC;
      while (b.tick >= 1) {
        b.tick -= 1;
        if (s.coins <= 0) { this.endBeam(owner, 'broke'); break; }
        s.coins--;
      }
      if (!s.beam) continue;

      const ex = f.x + Math.cos(b.ang) * BEAM_LEN;
      const ey = f.y + Math.sin(b.ang) * BEAM_LEN;
      for (const t of this.targetsOf(owner)) {
        if (this.distToSegment(t.x, t.y, f.x, f.y, ex, ey) > BEAM_HALF + 10 * t.sizeMult) continue;
        t.takeDamage(BEAM_DPS * dt);
        if (Math.random() < dt * 8) this.api.spawnHitFlash(t.x, t.y, FOR.goldLit);
      }
    }
  }

  private endBeam(owner: Owner, why: 'spent' | 'broke' | 'dead'): void {
    const s = this.side(owner);
    if (!s.beam) return;
    const f = this.fighter(owner);
    s.beam = null;
    if (!this.alive(f)) return;
    if (why === 'broke') {
      this.api.showFloatingText(f.x, f.y - 50, '💸 OUT OF MONEY', this.hex(FOR.blood));
      Sfx.playAt('ui-denied', f.x, { volume: 0.8 });
    } else if (why === 'spent') {
      Sfx.playAt('beam-fire', f.x, { volume: 0.5, rate: 0.7 });
    }
  }

  // ── Recoil ─────────────────────────────────────────────────────────────────

  /**
   * The Action Movie Prop. Applied here rather than to the body's velocity because ArenaScene
   * rewrites that from WASD every frame — this runs afterwards, so the push actually lands.
   */
  private updateShoves(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const sh = s.shove;
      if (!sh) continue;
      if (this.now >= sh.until) { s.shove = null; continue; }
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.shove = null; continue; }
      const k = Math.max(0, (sh.until - this.now) / 260);
      const nx = Phaser.Math.Clamp(f.x + sh.vx * dt * k, this.left + 10, this.right - 10);
      const ny = Phaser.Math.Clamp(f.y + sh.vy * dt * k, this.top + 10, this.bottom - 10);
      f.setPosition(nx, ny);
      this.body(f).reset(nx, ny);
    }
  }

  // ── Cure-All / Miracle upkeep ──────────────────────────────────────────────

  private updateItemAuras(): void {
    const wall = Date.now();
    const game = this.now;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = s.effectBody ?? this.buyerFor(owner);
      if (!f || !this.alive(f)) continue;

      if (this.now < s.cureUntil) {
        this.cleanse(f);
        this.cured.add(f);
      } else if (this.cured.has(f)) {
        this.cured.delete(f);
      }

      if (this.now < s.miracleUntil) {
        // Only the good half. Doubling the length of everything would hand the enemy's poison
        // twice as long to work, which is the opposite of a miracle.
        stretchNewEffects(f, wall, game, 2, s.miracleSnap, (d) => !isDebuff(d));
      }
    }
  }

  // ── Bots ───────────────────────────────────────────────────────────────────

  /**
   * Bots and husks shopping. They do not walk to the counter and they do not read the prices —
   * they simply spend, occasionally, on whatever they can afford, which is exactly what the
   * spec asks for and is also the whole reason the shopkeeper's commission ever pays out.
   */
  private updateBots(delta: number): void {
    void delta;
    const shop = this.shopOwner;
    if (!shop) return;
    for (const owner of BOTH) {
      // A human never gets bought for; a Fortune npc buys through its own AI branch instead.
      if (owner === 'player') continue;
      if (owner === shop) { this.botStock(owner); continue; }
      const s = this.sides[owner];
      if (s.botBuyAt === 0) s.botBuyAt = this.now + BOT_BUY_MS;
      if (this.now < s.botBuyAt) continue;
      s.botBuyAt = this.now + BOT_BUY_MS * (0.7 + Math.random() * 0.8);

      const affordable = GENERAL.filter((e) => e.cost <= s.coins && e.id !== 'donation' && this.canBuy(owner, e));
      if (affordable.length === 0) continue;
      // Bias toward the expensive end of what they can afford — a husk hoarding 19 coins so it
      // can keep buying bandages is not a threat.
      affordable.sort((a, b) => b.cost - a.cost);
      const pick = affordable[Math.random() < 0.6 ? 0 : Math.floor(Math.random() * affordable.length)];
      this.buy(owner, pick);
    }
  }

  /** A Fortune npc restocking itself: guns first, then whatever keeps it alive. */
  private botStock(owner: Owner): void {
    const s = this.sides[owner];
    if (s.botBuyAt === 0) s.botBuyAt = this.now + 4000;
    if (this.now < s.botBuyAt) return;
    s.botBuyAt = this.now + 5000;

    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    // Upgrade the gun whenever it can afford a better one.
    const ladder = ['golden', 'ar', 'rifle', 'revolver'];
    for (const id of ladder) {
      const e = ENTRY_BY_ID.get(id);
      if (!e || s.coins < e.cost || !this.canBuy(owner, e)) continue;
      if (ladder.indexOf(s.gun ?? 'pistol') <= ladder.indexOf(id) && s.gun !== 'pistol') break;
      this.buy(owner, e);
      return;
    }
    if (s.attachments.length < MAX_ATTACHMENTS) {
      for (const id of ['fiftycal', 'hollow', 'drummag', 'scope']) {
        const e = ENTRY_BY_ID.get(id);
        if (e && s.coins >= e.cost && this.canBuy(owner, e)) { this.buy(owner, e); return; }
      }
    }
    if (f.hp < f.maxHp * 0.55) {
      const e = ENTRY_BY_ID.get('bandages');
      if (e && s.coins >= e.cost) { this.buy(owner, e); return; }
    }
    if (s.coins >= 8) {
      const e = ENTRY_BY_ID.get('roomba');
      if (e && this.canBuy(owner, e)) this.buy(owner, e);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const is = this.isFortune(owner);
      const f = this.fighter(owner);
      let av = this.avatar(owner);

      if (!is || !f || !f.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new FortuneAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
        av.setGun(this.sides[owner].gun);
      }

      const s = this.sides[owner];
      const target = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : (this.targetsOf(owner)[0] ?? { x: s.aimX, y: s.aimY });
      av.setFacing(Math.atan2(target.y - f.y, target.x - f.x));
      av.setWealth(Phaser.Math.Clamp((s.coins + s.bank + s.stocks) / 40, 0, 1));
      av.setGun(this.now < s.reloadUntil ? null : s.gun);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.setIntensity(s.beam ? 1.4 : 1);
      // The beam is cupped in both hands; a gun that has gone off in the last second is held in
      // a two-handed stance. Anything else and the arms go back to the rig's idle sway.
      const aim = Math.atan2(target.y - f.y, target.x - f.x);
      av.setHold(s.beam ? 'ride' : this.now - s.lastShotAt < 900 ? 'brace' : null, s.beam?.ang ?? aim);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    // The fire trail, oldest first so a fresh dab sits on top of a dying one.
    for (const fl of this.flames) {
      const age = (this.now - fl.bornAt) / PEPPER_LIFE_MS;
      const a = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
      pepperFlame(g, this.col(fl.owner), fl.x, fl.y, 15 * (1 - age * 0.4), Math.max(0, a) * 0.9,
        { t: this.vizT, seed: fl.seed });
    }

    // The paywall's footings, which are on the floor even though its heads are not.
    for (const owner of BOTH) {
      const w = this.sides[owner].wall;
      if (!w) continue;
      const left = this.remainingRatio(w.diesAt, WALL_MS);
      g.fillStyle(this.col(owner)(FOR.gold), 0.1 + left * 0.12);
      g.fillRect(w.x - WALL_HALF, this.top, WALL_HALF * 2, this.bottom - this.top);
      g.lineStyle(2, this.col(owner)(FOR.gold), 0.35 + left * 0.35);
      g.lineBetween(w.x - WALL_HALF, this.top, w.x - WALL_HALF, this.bottom);
      g.lineBetween(w.x + WALL_HALF, this.top, w.x + WALL_HALF, this.bottom);
    }

    // The stall itself.
    const shop = this.shopOwner;
    if (shop) {
      const s = this.sides[shop];
      stall(g, this.col(shop), this.stallX, this.stallY, 96, 1, {
        t: this.vizT,
        illegal: shop === 'player' && s.page !== 'shop',
        stock: 5 - Math.min(5, Math.floor(s.spent / 12)),
      });
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const b of this.bullets) {
      bulletShape(g, this.col(b.owner), b.x, b.y, Math.atan2(b.vy, b.vx), b.size, 1,
        { seed: b.seed, color: b.pierce ? FOR.goldLit : FOR.steel, tracer: b.pierce ? 1.6 : 1 });
    }
    for (const d of this.daggers) {
      daggerShape(g, this.col(d.owner), d.x, d.y, d.ang, 1);
    }
    for (const r of this.roombas) {
      const angry = this.targetsOf(r.owner).some(
        (t) => Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) < 90) ? 1 : 0;
      roombaShape(g, this.col(r.owner), r.x, r.y, r.ang, 1, { spin: r.spin, angry });
    }

    // Turnstiles, spaced down the arena with their phases offset so the wall reads as a row of
    // separate machines rather than one long texture.
    for (const owner of BOTH) {
      const w = this.sides[owner].wall;
      if (!w) continue;
      const left = this.remainingRatio(w.diesAt, WALL_MS);
      const span = this.bottom - this.top;
      const n = Math.max(3, Math.round(span / 74));
      for (let i = 0; i < n; i++) {
        const y = this.top + ((i + 0.5) / n) * span;
        turnstile(g, this.col(owner), w.x, y, 0.35 + left * 0.65,
          { spin: this.vizT * 1.4 + i * 1.1 + w.seed, hot: w.flash });
      }
    }

    for (const owner of BOTH) {
      const b = this.sides[owner].beam;
      if (!b) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const mz = { x: f.x + Math.cos(b.ang) * 26, y: f.y + Math.sin(b.ang) * 26 };
      goldBeam(g, this.col(owner), mz.x, mz.y, b.ang, BEAM_LEN, BEAM_HALF, 1,
        { t: this.vizT, seed: owner === 'player' ? 1 : 2 });
    }
  }

  private remainingRatio(diesAt: number, span: number): number {
    return Phaser.Math.Clamp((diesAt - this.now) / span, 0, 1);
  }

  // ── The counter ────────────────────────────────────────────────────────────

  /**
   * The shop panel. Drawn in world space above the stall, and only while somebody is standing
   * close enough to be served — it is a market stall, not a menu, so walking away closes it.
   */
  private paintShop(shop: Owner | null): void {
    const { scene } = this.api;
    const p = this.api.player;
    const near = !!shop && this.alive(p)
      && Phaser.Math.Distance.Between(p.x, p.y, this.stallX, this.stallY) <= SHOP_RANGE;

    if (!near || !shop) {
      this.shopGfx?.setVisible(false);
      for (const t of this.shopTexts) t.setVisible(false);
      return;
    }

    const s = this.sides.player;
    const mine = shop === 'player';
    const page: Page = mine ? s.page : 'shop';
    const list = CATALOGUE[page];
    const accent = page === 'shop' ? FOR.gold : FOR.neon;

    // Sized off the longest row rather than off the stall: an item line is a name, a price and
    // a one-line description, and a description that wraps out of the box is worse than no box.
    const W = 400;
    const rowH = 18;
    const H = 38 + list.length * rowH + 16;
    const x = Phaser.Math.Clamp(this.stallX - W / 2, 8, this.api.width - W - 8);
    const y = Phaser.Math.Clamp(this.stallY - 62 - H, 8, this.api.height - H - 8);

    if (!this.shopGfx) this.shopGfx = scene.add.graphics().setDepth(24);
    const g = this.shopGfx.setVisible(true);
    g.clear();
    g.fillStyle(FOR.ink, 0.9);
    g.fillRect(x, y, W, H);
    g.lineStyle(2, this.col(shop)(accent), 0.9);
    g.strokeRect(x, y, W, H);
    // Tab strip across the top. The two illegal tabs are only drawn for their owner.
    const tabs: Page[] = mine ? PAGES : ['shop'];
    const tw = W / tabs.length;
    for (let i = 0; i < tabs.length; i++) {
      const on = tabs[i] === page;
      g.fillStyle(this.col(shop)(tabs[i] === 'shop' ? FOR.gold : FOR.contraband), on ? 0.85 : 0.2);
      g.fillRect(x + i * tw + 2, y + 2, tw - 4, 16);
    }
    // A row of gutters so the eye can find the number keys.
    for (let i = 0; i < list.length; i++) {
      const ry = y + 36 + i * rowH;
      const owned = !this.canBuy('player', list[i]);
      const poor = s.coins < list[i].cost;
      g.fillStyle(owned ? FOR.soot : poor ? FOR.bloodDark : FOR.timber, owned ? 0.5 : poor ? 0.35 : 0.45);
      g.fillRect(x + 4, ry - 2, W - 8, rowH - 3);
    }

    // Text rows: header, one per item, footer.
    const wanted = list.length + 2;
    while (this.shopTexts.length < wanted) {
      this.shopTexts.push(scene.add.text(0, 0, '', { fontSize: '11px', color: '#ffffff' }).setDepth(25));
    }
    for (const t of this.shopTexts) t.setVisible(false);

    const head = this.shopTexts[0];
    head.setVisible(true).setPosition(x + 8, y + 20)
      .setText(`${PAGE_NAME[page]}  ·  🪙 ${s.coins}${mine ? '   [T] TAB' : ''}`);
    this.tintRow(0, this.hex(accent), '11px', true);

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const t = this.shopTexts[i + 1];
      const owned = !this.canBuy('player', e);
      const poor = s.coins < e.cost;
      t.setVisible(true).setPosition(x + 8, y + 36 + i * rowH)
        .setText(`${i + 1} ${e.emoji} ${e.name} — ${e.cost === 0 ? 'FREE' : `${e.cost}🪙`}  ${e.desc}`);
      this.tintRow(i + 1, owned ? '#7d7466' : poor ? '#b3202e' : '#ffffff', '10px', false);
    }

    const foot = this.shopTexts[list.length + 1];
    const gunName = s.gun ? (ENTRY_BY_ID.get(s.gun)?.name ?? s.gun) : 'none';
    const mods = s.attachments.map((a) => ENTRY_BY_ID.get(a)?.emoji ?? '?').join(' ') || '—';
    foot.setVisible(true).setPosition(x + 8, y + H - 15)
      .setText(mine ? `${gunName} · ${mods} · ${s.ammo}/${this.magSize(s)}` : 'the shopkeeper takes half of everything you spend');
    this.tintRow(list.length + 1, '#c9bda6', '10px', false);
  }

  /**
   * Restyle one row, but only when it has actually changed. `setStyle` rebuilds the text's
   * canvas texture every call, and this panel has eleven rows that are otherwise static — doing
   * it unguarded costs more per frame than everything else the kit draws put together.
   */
  private tintRow(i: number, color: string, size: string, bold: boolean): void {
    const key = `${color}|${size}|${bold}`;
    if (this.shopColors[i] === key) return;
    this.shopColors[i] = key;
    this.shopTexts[i].setStyle({ fontSize: size, color, fontStyle: bold ? 'bold' : 'normal' });
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(shop: Owner | null): void {
    const s = this.sides.player;
    const mine = shop === 'player';

    this.api.setStatusIndicator('fortune-coins', shop ? {
      name: 'Blood Coins', emoji: '🪙', color: FOR.gold,
      description: `Every 20 damage you deal mints 1 blood coin. Spend them at the stall in the middle of the arena — stand next to it and press 1–8.${mine ? ' Press T to reach the illegal pages.' : ' Half of everything you spend goes to the shopkeeper.'}`,
      count: s.coins, priority: 150,
    } : null);

    this.api.setStatusIndicator('fortune-bank', shop && s.bank > 0 ? {
      name: 'Banked', emoji: '🏦', color: FOR.brass,
      description: 'Coins in the bank. Every 10 seconds the balance pays out 10% of itself, never less than 1. Hold E to take it all back.',
      count: s.bank, priority: 151,
    } : null);

    this.api.setStatusIndicator('fortune-stocks', shop && s.stocks > 0 ? {
      name: 'Invested', emoji: '📈', color: FOR.contraband,
      description: 'Coins in the market. Every 10 seconds: +20% if you dealt over 50 damage, −20% if you took over 100, +10% if both. Hold R to cash out.',
      count: s.stocks, priority: 152,
    } : null);

    this.api.setStatusIndicator('fortune-gun', mine ? {
      name: ENTRY_BY_ID.get(s.gun ?? '')?.name ?? 'Unarmed', emoji: '🔫', color: FOR.steel,
      description: `Your loadout: ${ENTRY_BY_ID.get(s.gun ?? '')?.name ?? 'nothing'}${s.attachments.length ? ` with ${s.attachments.map((a) => ENTRY_BY_ID.get(a)?.name).join(' and ')}` : ''}. One gun and two attachments at a time.`,
      count: this.now < s.reloadUntil ? 0 : s.ammo, suffix: `/${this.magSize(s)}`, priority: 153,
    } : null);

    this.api.setStatusIndicator('fortune-pepper', this.now < s.pepperUntil ? {
      name: 'Spicy Pepper', emoji: '🌶️', color: FOR.blood,
      description: 'You are burning a trail wherever you walk. Anything of theirs that stands in it catches fire.',
      until: s.pepperUntil, priority: 121,
    } : null);

    this.api.setStatusIndicator('fortune-pouch', s.pouch > 0 ? {
      name: 'Explosives Pouch', emoji: '🧨', color: FOR.gold,
      description: 'Your next hits each set off a blast around the body you hit, worth the same damage — to everyone ELSE standing near them.',
      count: s.pouch, priority: 122,
    } : null);

    this.api.setStatusIndicator('fortune-cure', this.now < s.cureUntil ? {
      name: 'Cure-All', emoji: '🧪', color: FOR.neon,
      description: 'Nothing negative can stick to you. Every debuff is scrubbed off the moment it lands.',
      until: s.cureUntil, priority: 123,
    } : null);

    this.api.setStatusIndicator('fortune-miracle', this.now < s.miracleUntil ? {
      name: 'The Miracle', emoji: '🏺', color: FOR.goldLit,
      description: 'Every good thing counts double: buffs last twice as long, heals are twice the size, and both investments pay twice the rate.',
      until: s.miracleUntil, priority: 124,
    } : null);

    const mineRoombas = this.roombas.filter((r) => r.owner === 'player').length;
    this.api.setStatusIndicator('fortune-roomba', mineRoombas > 0 ? {
      name: 'Death Machines', emoji: '🤖', color: FOR.steel,
      description: 'Knife-armed vacuums hunting for your enemy. 25 damage to anything they touch.',
      count: mineRoombas, priority: 125,
    } : null);

    this.api.setStatusIndicator('fortune-paywall', s.wall ? {
      name: 'Paywall', emoji: '🎫', color: FOR.gold,
      description: 'Your turnstiles are up. Enemy shots through them cost 1 coin, enemy bodies cost 3, and all of it is paid to you.',
      until: s.wall.diesAt, priority: 126,
    } : null);

    this.api.setStatusIndicator('fortune-beam', s.beam ? {
      name: 'Pay-to-Win', emoji: '💰', color: FOR.goldLit,
      description: 'The golden beam is open. It burns everything it touches and 6 blood coins a second, and it stops the instant you cannot pay.',
      until: s.beam.endsAt, priority: 110,
    } : null);

    // The other side of the counter: what a Fortune npc is holding, so a player can see the
    // commission they are funding.
    const foe = this.sides.npc;
    this.api.setStatusIndicator('fortune-keeper', shop === 'npc' ? {
      name: 'Shopkeeper', emoji: '🏪', color: FOR.blood,
      description: 'Their purse. Half of everything you buy at their stall goes straight into it, and the golden pistol they might be carrying is priced off it.',
      count: foe.coins + foe.bank + foe.stocks, priority: 3,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** Ability tray fill — the two abilities that show a state rather than a cooldown. */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === 'fortune-paywall' && s.wall) {
      return Phaser.Math.Clamp((s.wall.diesAt - time) / WALL_MS, 0, 1);
    }
    if (abilityId === 'fortune-p2w' && s.beam) {
      return Phaser.Math.Clamp((s.beam.endsAt - time) / BEAM_MS, 0, 1);
    }
    if (abilityId === 'fortune-fire' && time < s.reloadUntil) {
      const kit = this.loadout(s);
      return kit ? Phaser.Math.Clamp((s.reloadUntil - time) / kit.def.reloadMs, 0, 1) : 0;
    }
    return p.getCooldownRatio(abilityId);
  }

  /** Coins on that side, for the bot's "can I afford to open the beam" check. */
  coinsOf(owner: Owner): number { return this.sides[owner].coins; }
  bankOf(owner: Owner): number { return this.sides[owner].bank; }
  stocksOf(owner: Owner): number { return this.sides[owner].stocks; }
  /** True while the beam is open — the npc must keep facing its target and stop dodging about. */
  isBeaming(owner: Owner): boolean { return !!this.sides[owner].beam; }
  hasWall(owner: Owner): boolean { return !!this.sides[owner].wall; }
  /**
   * Rounds the bot could actually put downrange this frame. Deliberately zero while the gun is
   * cycling as well as while it is reloading: a refused cast still stamps and voices itself, so
   * the AI has to be told "not yet" rather than be allowed to find out.
   */
  ammoOf(owner: Owner): number {
    return this.canFireNow(owner) ? this.sides[owner].ammo : 0;
  }
}
