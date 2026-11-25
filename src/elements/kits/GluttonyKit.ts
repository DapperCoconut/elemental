import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Projectile } from '../../combat/Projectile';
import { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Sfx } from '../../audio';
import {
  GluttonyAvatar, WOOD, WoodColorFn, WoodFx, appleShape, birchStump, birchTree, carverangShape, carverangTrail,
  digestAura, sapGoo, sproutCorpse, sproutShape, taintMark,
} from './GluttonyVisuals';

type Owner = 'player' | 'npc';

const BOTH: Owner[] = ['player', 'npc'];

// ── Sap HP ───────────────────────────────────────────────────────────────────
/** Health + Sap HP may reach max health plus this. Q+ Prune raises it. */
const OVERFLOW_BASE = 100;
const OVERFLOW_MAX = 200;
const PRUNE_OVERFLOW_STEP = 50;
/** Sap grows back toward the most this body has held, this fast — until it is cut through to 0. */
const SAP_REGEN_PER_SEC = 2;
/** Whoever chews into Sap HP is gummed up: slowed by this much for this long. */
const SAP_SLOW_MS = 1500;

// ── Haunting Hollows ─────────────────────────────────────────────────────────
const TREE_STEP = 120;
const TREE_REGROW_MS = 25_000;

// ── Click: Carverang ─────────────────────────────────────────────────────────
const CARVE_DAMAGE = 12;
const LOOP_MIN = 150;
const LOOP_MAX = 400;
const LOOP_BASE_MS = 660;
const LOOP_MS_PER_PX = 1.5;
const CARVE_HIT_R = 20;
const CARVE_SIZE = 15;
/** A carverang this far through its loop is "coming home" — a throw now sends it back out. */
const RECARVE_FROM = 0.72;

// ── E: Oakbrew ───────────────────────────────────────────────────────────────
const BREW_MS = 8000;
const BREW_MULT = 0.85;
const BREW_CONVERT = 25;
// E+ Brewmaster: held up to 3s, for up to double the duration and 35 more (free) sap.
const COOK_MAX_MS = 3000;
const COOK_BONUS_MS = 8000;
const COOK_BONUS_SAP = 35;
const BREW_SHARE_R = 150;
/** Co-op: a teammate's Digest healing is sent to their machine in batches this far apart. */
const GIFT_FLUSH_MS = 500;

// ── R: Commensalism ──────────────────────────────────────────────────────────
const COMMENSAL_SAP = 50;
// R+ Mutualism.
const SPROUT_HP = 10;
const SPROUTS_MAX = 4;
const SPROUT_R = 12;
const SPROUT_TRAMPLE_DPS = 25;
const MUTUAL_SHARE = 0.5;

// ── F: Digest ────────────────────────────────────────────────────────────────
const DIGEST_WINDOW_MS = 5000;
const DIGEST_INSTANT = 0.15;
const DIGEST_HOT = 0.25;
const DIGEST_MS = 5000;
const DIGEST_R = 120;
// F+ Friend of the Forest.
const APPLE_EVERY_MS = 7000;
const APPLES_ON_TREES = 3;
const APPLES_HELD = 3;
const APPLE_PICK_R = 52;
const APPLE_LOW_HP = 0.3;
const APPLE_HEAL = 25;
const APPLE_EAT_GAP_MS = 500;
const APPLE_BREW_MULT = 2;
const APPLE_DIGEST_MULT = 1.5;

// ── Q: Final Harvest ─────────────────────────────────────────────────────────
const REAP_WINDUP_MS = 360;
const REAP_REACH = 170;
const REAP_HALF = (80 * Math.PI) / 180;
const REAP_DAMAGE = 35;
/** Execute when the ent's health (Sap HP included) is at least this many times the victim's. */
const EXECUTE_RATIO = 1.6;
/** Tainted: this much Sap HP per point of damage dealt to them (5 per 25). */
const TAINT_SAP_PER_DMG = 5 / 25;
// Q+ Prune.
const PRUNE_SHARE = 0.5;

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_PRUNE_MIN_HP = 40;
const NPC_EXECUTE_SAP_GAP = 60;

// ── Types ────────────────────────────────────────────────────────────────────

interface Carve {
  owner: Owner;
  ox: number;
  oy: number;
  cx: number;
  cy: number;
  R: number;
  start: number;
  phi0: number;
  side: number;
  dur: number;
  x: number;
  y: number;
  hit: Set<Fighter>;
  trail: { x: number; y: number }[];
  /** How many times it has been re-carved back out. */
  loops: number;
}

interface Tree {
  x: number;
  baseY: number;
  h: number;
  seed: number;
  /** Where an ent stepping out of it stands, inside the arena. */
  sx: number;
  sy: number;
  /** Scene time it was taken (Commensalism); 0 = standing. */
  goneAt: number;
  /** F+ Friend of the Forest: whose apple hangs on it. */
  apple: Owner | null;
}

interface Sprout {
  id: number;
  owner: Owner;
  x: number;
  y: number;
  hp: number;
  born: number;
  hurtAt: number;
}

interface Corpse {
  x: number;
  y: number;
  scale: number;
  ang: number;
}

interface Digest {
  until: number;
  /** Health per second still to come back, and the fraction carried between frames. */
  perSec: number;
  frac: number;
  /** Teammates' healing not yet sent to their machines, and when it next goes. */
  allyOwed: Map<Fighter, number>;
  flushAt: number;
}

interface Swing {
  at: number;
  ang: number;
  side: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** Which way the carverang's loop curls: 1 or -1. Right-click flips it. */
  arc: number;
  /** The most Sap HP held since it was last cut through; regen climbs back to it. */
  sapPeak: number;
  sapFrac: number;
  overflow: number;
  brewUntil: number;
  /** E+ Brewmaster: the cup on the boil (scene time it started, and the health it started at). */
  cooking: boolean;
  cookStart: number;
  cookTotal: number;
  /** A bot's planned boil length. */
  cookFor: number;
  /** What the next drink resolves with (the player's release / spill). */
  pendingCook: number;
  pendingSpill: boolean;
  digest: Digest | null;
  /** Health lost, for Digest's look back. */
  hist: { t: number; loss: number }[];
  lastTotal: number;
  apples: number;
  appleTimer: number;
  appleEatAt: number;
  taintFrac: number;
  healFrac: number;
  swing: Swing | null;
  guilt: number;
  sproutSeq: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, arc: 1, sapPeak: 0, sapFrac: 0, overflow: OVERFLOW_BASE, brewUntil: 0,
    cooking: false, cookStart: 0, cookTotal: 0, cookFor: 0, pendingCook: 0, pendingSpill: false,
    digest: null, hist: [], lastTotal: -1, apples: 0, appleTimer: 0, appleEatAt: 0, taintFrac: 0, healFrac: 0,
    swing: null, guilt: 0, sproutSeq: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface GluttonyArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  /** The arena's walls (physics world bounds) — Haunting Hollows stands just inside them. */
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** ArenaScene's shared projectile group — sprouts stop enemy shots that fly into them. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Kit-local projectiles, for the same. */
  get projectileRegistry(): ProjectileRegistry;
  isTargetable(f: Fighter): boolean;
  gluttonyColor(owner: Owner, base: number): number;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /**
   * Online co-op: the teammates in our room and the slot each body belongs to. Their health is
   * theirs, so whatever we give them goes to that slot through `sendWoodGift`. Empty otherwise.
   */
  coopTeammates(): { slot: number; fighter: Fighter }[];
  sendWoodGift(slot: number, sap: number, heal: number, brewMs: number): void;
  /** The player's shop upgrade, or the opponent's (online handshake / Hard+ bot loadout). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── GluttonyKit ──────────────────────────────────────────────────────────────

/**
 * Wood — the birch ent. (The element id is still `gluttony`, so every save keeps working.)
 *
 * The kit's resource is **Sap HP**, a Fighter layer (`sapHp`) spent before health. Health plus
 * sap can reach max health + 100 (+200 with Q+ Prune). Sap grows back slowly toward the most the
 * ent has held — until something cuts it right through to nothing — and whoever chews into it is
 * gummed up (`woodSlowUntil`, a mirrored timer every mover reads).
 *
 * - **Carverang** flies a boomerang loop out to the cursor and back. Throwing again while one is
 *   coming home re-carves that one back out.
 * - **Oakbrew** turns 25 health into sap and armours the ent (`woodIncomingMult`, which travels
 *   online in `dm`). E+ makes it a held, interruptible brew shared with teammates.
 * - **Commensalism** swaps the ent into one of the birches of **Haunting Hollows**, the ring of
 *   trees the arena is drawn inside. R+ leaves a sprout behind, which the rest of the kit feeds.
 * - **Digest** turns the last five seconds' damage into sap now and health over time, in an aura.
 * - **Final Harvest** executes anything the ent out-healths by 60%, and Taints the rest so every
 *   hit on them pays out in sap. Q+ prunes the ent's own sprouts for sap and a higher overflow.
 *
 * Online, everything gameplay is decided on the owner's sim; sprout deaths, apples and re-carves
 * are relayed as `wood-*` pseudo-casts and replayed here as visuals.
 */
export class GluttonyKit {
  private api: GluttonyArenaApi;

  // ── Visuals ──
  private readonly pcol: WoodColorFn;
  private readonly ncol: WoodColorFn;
  private readonly pfx: WoodFx;
  private readonly nfx: WoodFx;
  private playerAvatar: GluttonyAvatar | null = null;
  private npcAvatar: GluttonyAvatar | null = null;
  /** The ring of birches, under everything. */
  private treeGfx: Phaser.GameObjects.Graphics | null = null;
  /** Sprouts, corpses, the digest aura — on the floor, under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Taint and sap goo on bodies, over their sprites. */
  private veilGfx: Phaser.GameObjects.Graphics | null = null;
  /** Carverangs and apples — over everything that walks. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private carves: Carve[] = [];
  private trees: Tree[] = [];
  private sprouts: Sprout[] = [];
  private corpses: Corpse[] = [];
  private tainted: Record<Owner, Set<Fighter>> = { player: new Set(), npc: new Set() };
  /** A teammate's shared brew on *our* body (it arrived as a gift): armoured until (scene time). */
  private giftedBrewUntil = 0;
  private wasRight = false;
  private wasLeft = false;
  private wasE = false;
  private treesBuilt = false;

  constructor(api: GluttonyArenaApi) {
    this.api = api;
    this.pcol = (base) => api.gluttonyColor('player', base);
    this.ncol = (base) => api.gluttonyColor('npc', base);
    this.pfx = new WoodFx(api.scene, this.pcol);
    this.nfx = new WoodFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): WoodFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): WoodColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): GluttonyAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }

  private isWood(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'gluttony' : this.api.npcElementId === 'gluttony';
  }

  /** An online opponent's body: drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side; a co-op ally's attacks resolve on its
    // own machine. Here they must touch nobody.
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  /**
   * Teammates — the other players of an online co-op Invasion, in our room. Never anyone in a
   * duel; an online opponent's Wood helps its own teammates on its own machine.
   */
  private teammatesOf(owner: Owner): Fighter[] {
    if (owner !== 'player' || !this.api.isInvasion) return [];
    return this.api.coopTeammates().map((t) => t.fighter);
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

  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  private announce(_x: number, _y: number, _text: string, _color: number, _size = 12): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
  }

  /** A shop upgrade, on a side that is actually playing Wood. */
  private up(owner: Owner, slot: string): boolean {
    return this.isWood(owner) && this.api.hasUpgrade(owner, slot);
  }

  /** Online: relay something only the owner's sim decides. */
  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private masteryOn(owner: Owner): boolean {
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
  }

  /** Health with Sap HP on top — what the execute compares, and what Digest watches fall. */
  private total(f: Fighter): number { return Math.max(0, f.hp) + f.sapHp; }

  /** Is anything slowing this body? (Click+ Amber Edge cuts slowed bodies deeper.) */
  private isSlowed(f: Fighter): boolean {
    return f.woodSlowMult() < 1 || f.devotionSlowMult() < 1 || f.despressSlowMult() < 1 || f.premoveSlowMult() < 1
      || f.soundDissonanceSlowMult() < 1 || f.dreamSlowMult < 1 || f.paintSlowMult < 1 || f.magnetSlowMult < 1
      || f.tempestSlowMult < 1 || f.goldSpeedMult < 1 || f.netSpeedMult < 0.999;
  }

  /** How much more Sap HP `f` may take: health + sap stops at max health plus the overflow. */
  private sapRoom(f: Fighter, overflow: number): number {
    return Math.max(0, f.maxHp + overflow - Math.max(0, f.hp) - f.sapHp);
  }

  /** Sap on a Wood side's own body. Raises the regen peak. Returns what actually landed. */
  private addSap(owner: Owner, amount: number): number {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.isReplica(owner) || amount <= 0) return 0;
    const s = this.side(owner);
    s.sapFrac += amount;
    const whole = Math.floor(s.sapFrac);
    if (whole <= 0) return 0;
    s.sapFrac -= whole;
    const add = Math.min(whole, this.sapRoom(f, s.overflow));
    f.sapHp += add;
    s.sapPeak = Math.max(s.sapPeak, f.sapHp);
    return add;
  }

  /**
   * Something for a teammate: Sap HP, healing, a brew's armour. Their body is simulated on their
   * own machine, so it is sent there (`woodGift`) and applied by `receiveGift`.
   */
  private gift(m: Fighter, sap: number, heal: number, brewMs: number): void {
    const t = this.api.coopTeammates().find((c) => c.fighter === m);
    if (!t || (sap < 1 && heal < 1 && brewMs <= 0)) return;
    this.api.sendWoodGift(t.slot, sap, heal, brewMs);
  }

  /** A Wood teammate's brew or digest reached us: apply it to our own body. */
  receiveGift(sap: number, heal: number, brewMs: number): void {
    const p = this.api.player;
    if (!this.alive(p)) return;
    this.ensureLayers();
    if (sap > 0) {
      const add = Math.min(Math.round(sap), this.sapRoom(p, OVERFLOW_BASE));
      if (add > 0) {
        p.sapHp += add;
        this.pfx.sapGain(p.x, p.y, add);
        this.announce(p.x, p.y - 50, `🪵 +${add} SAP HP`, WOOD.amberLit, 11);
      }
    }
    if (heal > 0) {
      p.heal(Math.round(heal));
      this.pfx.healMote(p.x, p.y);
    }
    if (brewMs > 0) {
      this.giftedBrewUntil = Math.max(this.giftedBrewUntil, this.now + brewMs);
      this.announce(p.x, p.y - 64, `🍵 -15% DAMAGE ${Math.round(brewMs / 1000)}s`, WOOD.teaLit, 11);
    }
  }

  /**
   * Every Wood hit goes through here: the hit itself, and the Sap HP a Tainted body pays out. The
   * payout is read off `lastIncomingDamage`, the post-mitigation figure the victim's own
   * `takeDamage` records — which is also what an online ghost reports.
   */
  private hit(owner: Owner, t: Fighter, dmg: number, opts?: DamageOpts): void {
    t.lastIncomingDamage = 0;
    t.takeDamage(dmg, opts);
    const dealt = t.lastIncomingDamage;
    if (dealt <= 0 || this.isReplica(owner) || !this.tainted[owner].has(t)) return;
    const s = this.side(owner);
    s.taintFrac += dealt * TAINT_SAP_PER_DMG;
    const whole = Math.floor(s.taintFrac);
    if (whole <= 0) return;
    s.taintFrac -= whole;
    this.addSap(owner, whole);
  }

  /** A heal on the ent itself, fractional amounts carried. */
  private healSelf(owner: Owner, amount: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.isReplica(owner)) return;
    const s = this.side(owner);
    s.healFrac += amount;
    const whole = Math.floor(s.healFrac);
    if (whole <= 0) return;
    s.healFrac -= whole;
    f.heal(whole);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: Owner): string | null {
    const f = this.fighter(owner);
    const take = Math.ceil(f.sapHp * 0.4);
    if (take <= 0) return null;
    f.sapHp -= take;
    return `−${take} SAP`;
  }

  reset(): void {
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.carves = [];
    this.trees = [];
    this.treesBuilt = false;
    this.sprouts = [];
    this.corpses = [];
    this.tainted = { player: new Set(), npc: new Set() };
    this.giftedBrewUntil = 0;
    this.wasRight = false;
    this.wasLeft = false;
    this.wasE = false;
    this.vizT = 0;

    for (const f of this.allFighters()) {
      f.woodIncomingMult = 1;
      f.woodSlowUntil = 0;
      f.woodTainted = 0;
      f.sapHp = 0;
      f.onSapAbsorb = null;
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.treeGfx, this.groundGfx, this.veilGfx, this.airGfx]) g?.destroy();
    this.treeGfx = this.groundGfx = this.veilGfx = this.airGfx = null;

    for (const id of ['wood-arc', 'wood-brew', 'wood-cook', 'wood-digest', 'wood-apples', 'wood-guilt', 'wood-overflow', 'wood-sprouts']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5.
    if (!this.treeGfx) this.treeGfx = scene.add.graphics().setDepth(2.1);
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3.2);
    if (!this.veilGfx) this.veilGfx = scene.add.graphics().setDepth(5.6);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isWood('player') && !this.playerAvatar) this.playerAvatar = new GluttonyAvatar(scene, this.pcol);
    if (this.isWood('npc') && !this.npcAvatar) this.npcAvatar = new GluttonyAvatar(scene, this.ncol);
  }

  /**
   * Haunting Hollows: birches all the way round, just inside the arena walls. Laid out off the
   * match-start bounds alone, so both machines put every tree in the same place and a tree index
   * means the same tree on both.
   */
  private ensureTrees(): void {
    if (this.treesBuilt) return;
    this.treesBuilt = true;
    const b = this.api.bounds;
    let seed = 1;
    const add = (x: number, baseY: number, h: number, sx: number, sy: number): void => {
      this.trees.push({ x, baseY, h, seed: seed++ * 7.31, sx, sy, goneAt: 0, apple: null });
    };
    const span = b.width - 120;
    const across = Math.max(2, Math.round(span / TREE_STEP));
    for (let i = 0; i <= across; i++) {
      const x = b.x + 60 + (i / across) * span;
      add(x, b.y + 44, 50, x, b.y + 70);
    }
    for (let i = 0; i <= across; i++) {
      const x = b.x + 60 + ((i + 0.5) / (across + 1)) * span;
      add(x, b.bottom - 6, 44, x, b.bottom - 42);
    }
    const tall = b.height - 250;
    const down = Math.max(1, Math.round(tall / TREE_STEP));
    for (let i = 0; i <= down; i++) {
      const y = b.y + 140 + (i / down) * tall;
      add(b.x + 16, y, 62, b.x + 46, y - 12);
      add(b.right - 16, y, 62, b.right - 46, y - 12);
    }
  }

  private treeStanding(tr: Tree): boolean { return tr.goneAt === 0; }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'gluttony') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const right = pointer.rightButtonDown();
    const flip = right && !this.wasRight;
    this.wasRight = right;
    const left = pointer.leftButtonDown();
    const clicked = left && !this.wasLeft;
    this.wasLeft = left;
    const eDown = this.api.eKey.isDown;
    const ePressed = eDown && !this.wasE;
    const eReleased = !eDown && this.wasE;
    this.wasE = eDown;
    if (!this.alive(p)) { s.cooking = false; return; }

    if (flip) this.flipArc('player');

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    // A press, not a hold: the re-carve is about the moment you throw.
    if (clicked) p.castAbility('wood-carverang', ctx);

    if (this.up('player', 'e')) {
      // E+ Brewmaster: press puts the cup on, release drinks it, a hit in between spills it.
      if (ePressed && !s.cooking && p.getCooldownRatio('wood-oakbrew') >= 1) this.startCook('player');
      if (s.cooking && eReleased) {
        s.pendingCook = this.cookLevel(s);
        s.pendingSpill = false;
        s.cooking = false;
        // Ahead of the cast, so the opponent's replay drinks a brew cooked as long as ours.
        this.relay('player', `wood-brewk:${Math.round(s.pendingCook * 100)}`);
        p.castAbility('wood-oakbrew', ctx);
      }
    } else if (ePressed) {
      s.pendingCook = 0;
      s.pendingSpill = false;
      p.castAbility('wood-oakbrew', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('wood-commensalism', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('wood-digest', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('wood-final-harvest', ctx);
  }

  private flipArc(owner: Owner): void {
    const s = this.side(owner);
    s.arc = -s.arc;
    const f = this.fighter(owner);
    if (this.alive(f)) this.fx(owner).arcSwap(f.x, f.y - 44, s.arc);
    if (owner === 'player') {
      Sfx.playAt('ui-click', f.x, { rate: s.arc > 0 ? 1.3 : 1.0, volume: 0.35 });
      this.relay('player', s.arc > 0 ? 'wood-arc-r' : 'wood-arc-l');
    }
  }

  /**
   * Online: the opponent's presses that touch no cooldown, and the events only their sim decides.
   * Everything here is visual or bookkeeping — the owner resolved the gameplay.
   */
  replayNet(id: string): void {
    const s = this.sides.npc;
    const [head, arg] = id.split(':');
    const n = Number(arg);
    if (head === 'wood-arc-r' && s.arc < 0) this.flipArc('npc');
    else if (head === 'wood-arc-l' && s.arc > 0) this.flipArc('npc');
    else if (head === 'wood-recarve') {
      const c = this.homeward('npc', 0.5);
      if (c) this.recarve(c, s.aimX, s.aimY);
    } else if (head === 'wood-sprout-k' || head === 'wood-sprout-p') {
      const i = this.sprouts.findIndex((sp) => sp.owner === 'npc' && sp.id === n);
      if (i >= 0) {
        const sp = this.sprouts[i];
        this.sprouts.splice(i, 1);
        if (head === 'wood-sprout-p') this.corpseOf(sp, 0);
        else this.fx('npc').splinters(sp.x, sp.y - 8, 6, 18, 420, 9);
      }
    } else if (head === 'wood-apple' && this.trees[n]) {
      this.trees[n].apple = 'npc';
    } else if (head === 'wood-pick' && this.trees[n]) {
      const tr = this.trees[n];
      tr.apple = null;
      s.apples = Math.min(APPLES_HELD, s.apples + 1);
      const f = this.api.npc;
      if (this.alive(f)) this.fx('npc').applePick(tr.x + 9, tr.baseY - tr.h * 0.62, f.x, f.y - 40);
    } else if (head === 'wood-eat') {
      s.apples = Math.max(0, s.apples - 1);
      const f = this.api.npc;
      if (this.alive(f)) this.fx('npc').appleEat(f.x, f.y);
    } else if (head === 'wood-boil') {
      s.cooking = true;
      s.cookStart = this.now;
    } else if (head === 'wood-brewk') {
      s.pendingCook = Phaser.Math.Clamp(n / 100, 0, 1);
      s.cooking = false;
    } else if (head === 'wood-spill') {
      // The spilled cast follows; its replay shows the spill instead of a drink.
      s.pendingSpill = true;
      s.cooking = false;
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Carverang. A throw while one of yours is coming home re-carves that one. */
  doCarverang(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    // A bot has no right mouse button: it picks a curl per throw.
    if (owner === 'npc' && !this.isReplica(owner)) s.arc = Math.random() < 0.5 ? 1 : -1;
    if (!this.isReplica(owner)) {
      const home = this.homeward(owner, RECARVE_FROM);
      if (home) {
        this.recarve(home, tx, ty);
        this.relay(owner, 'wood-recarve');
      }
    }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const D = Phaser.Math.Clamp(Phaser.Math.Distance.Between(f.x, f.y, tx, ty), LOOP_MIN, LOOP_MAX);
    const R = D / 2;
    this.carves.push({
      owner, ox: f.x, oy: f.y, cx: f.x + Math.cos(ang) * R, cy: f.y + Math.sin(ang) * R, R,
      start: this.now, phi0: ang + Math.PI, side: s.arc, dur: LOOP_BASE_MS + D * LOOP_MS_PER_PX,
      x: f.x, y: f.y, hit: new Set(), trail: [], loops: 0,
    });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).carveThrow(f.x + Math.cos(ang) * 18, f.y + Math.sin(ang) * 18, ang);
    Sfx.playAt('whoosh', f.x, { rate: 1.15, volume: 0.5 });
  }

  /** The owner's carverang furthest through its loop, if any is at least `from` of the way round. */
  private homeward(owner: Owner, from: number): Carve | null {
    let best: Carve | null = null;
    let bestU = from;
    for (const c of this.carves) {
      if (c.owner !== owner) continue;
      const u = (this.now - c.start) / c.dur;
      if (u >= bestU && u < 1) { bestU = u; best = c; }
    }
    return best;
  }

  /** Send a returning carverang back out: a fresh loop from where it is, to (tx, ty). */
  private recarve(c: Carve, tx: number, ty: number): void {
    const f = this.fighter(c.owner);
    const fromX = this.alive(f) ? f.x : c.x;
    const fromY = this.alive(f) ? f.y : c.y;
    const ang = Math.atan2(ty - fromY, tx - fromX);
    const D = Phaser.Math.Clamp(Phaser.Math.Distance.Between(fromX, fromY, tx, ty), LOOP_MIN, LOOP_MAX);
    const R = D / 2;
    c.loops++;
    c.ox = fromX;
    c.oy = fromY;
    c.cx = fromX + Math.cos(ang) * R;
    c.cy = fromY + Math.sin(ang) * R;
    c.R = R;
    c.start = this.now;
    c.phi0 = ang + Math.PI;
    c.dur = LOOP_BASE_MS + D * LOOP_MS_PER_PX;
    c.hit.clear();
    this.fx(c.owner).recarve(c.x, c.y, c.side);
    this.announce(c.x, c.y - 26, c.loops > 1 ? `RE-CARVE ×${c.loops}` : 'RE-CARVE!', WOOD.amberLit, 12);
    Sfx.playAt('whoosh', c.x, { rate: 1.6, volume: 0.45 });
  }

  /** E — Oakbrew. A bot with E+ puts the cup on here; everyone else drinks at once. */
  doOakbrew(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    if (owner === 'npc' && !this.isReplica(owner) && this.up('npc', 'e') && !s.cooking) {
      this.startCook('npc');
      s.cookFor = 1200 + Math.random() * (COOK_MAX_MS - 1200);
      return;
    }
    const cook = s.pendingCook;
    const spilled = s.pendingSpill;
    s.cooking = false;
    s.pendingCook = 0;
    s.pendingSpill = false;
    this.drink(owner, cook, spilled);
  }

  private startCook(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.cooking = true;
    s.cookStart = this.now;
    s.cookTotal = this.total(f) + f.shieldHp;
    this.avatar(owner)?.setCooking(0);
    Sfx.playAt('ui-click', f.x, { rate: 0.7, volume: 0.4 });
    this.relay(owner, 'wood-boil');
  }

  private cookLevel(s: Side): number {
    return Phaser.Math.Clamp((this.now - s.cookStart) / COOK_MAX_MS, 0, 1);
  }

  private drink(owner: Owner, cook: number, spilled: boolean): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    this.avatar(owner)?.setCooking(null);
    if (spilled) {
      this.fx(owner).brewSpill(f.x, f.y);
      this.announce(f.x, f.y - 50, '☕ BREW LOST', WOOD.teaLit, 12);
      Sfx.playAt('hit', f.x, { rate: 1.6, volume: 0.5 });
      return;
    }
    let durMult = 1;
    if (s.apples > 0 && this.up(owner, 'f')) {
      s.apples--;
      durMult = APPLE_BREW_MULT;
      this.fx(owner).appleEat(f.x, f.y);
      this.announce(f.x, f.y - 64, '🍎 BREW ×2 DURATION', WOOD.appleLit, 11);
    }
    const dur = (BREW_MS + COOK_BONUS_MS * cook) * durMult;
    s.brewUntil = Math.max(s.brewUntil, this.now + dur);
    this.avatar(owner)?.drink();
    this.avatar(owner)?.play('raise', -Math.PI / 2, 520);
    this.fx(owner).brewSip(f.x, f.y, cook);
    Sfx.playAt('heal', f.x, { rate: 0.8, volume: 0.6 });
    if (this.isReplica(owner)) return;
    const convert = Math.max(0, Math.min(BREW_CONVERT, Math.floor(f.hp) - 1));
    f.hp -= convert;
    const bonus = COOK_BONUS_SAP * cook;
    const got = this.addSap(owner, convert + bonus);
    this.announce(f.x, f.y - 50, `🍵 +${got} SAP HP · -15% DAMAGE ${Math.round(dur / 1000)}s`, WOOD.amberLit, 12);
    // E+ Brewmaster: teammates and sprouts nearby get a cup too.
    if (!this.up(owner, 'e')) return;
    const share = BREW_CONVERT + bonus;
    for (const m of this.teammatesOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, m.x, m.y) > BREW_SHARE_R) continue;
      this.gift(m, share, 0, dur);
      this.fx(owner).brewShare(f.x, f.y - 10, m.x, m.y);
    }
    for (const sp of this.sprouts) {
      if (sp.owner !== owner || Phaser.Math.Distance.Between(f.x, f.y, sp.x, sp.y) > BREW_SHARE_R) continue;
      this.feedSprout(sp, share, 'sap');
      this.fx(owner).brewShare(f.x, f.y - 10, sp.x, sp.y - 8);
    }
  }

  /** R — Commensalism: into the ground, out of the tree nearest the aim. */
  doCommensalism(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureTrees();
    let tree: Tree | null = null;
    let bestD = Infinity;
    for (const tr of this.trees) {
      if (!this.treeStanding(tr)) continue;
      const d = Phaser.Math.Distance.Between(tx, ty, tr.x, tr.baseY);
      if (d < bestD) { bestD = d; tree = tr; }
    }
    const ox = f.x;
    const oy = f.y;
    this.fx(owner).rootSink(ox, oy);
    this.avatar(owner)?.play('dash', Math.atan2(ty - oy, tx - ox));
    Sfx.playAt('vine-grow', ox, { rate: 0.6, volume: 0.7 });
    // R+ Mutualism: a sprout comes up where the ent went down.
    if (this.up(owner, 'r')) this.spawnSprout(owner, ox, oy);
    if (tree) {
      tree.goneAt = this.now;
      if (!this.isReplica(owner)) {
        (f.body as Phaser.Physics.Arcade.Body | null)?.reset(tree.sx, tree.sy);
        if (!f.body) f.setPosition(tree.sx, tree.sy);
      }
      this.fx(owner).treeBurst(tree.x, tree.baseY, tree.h);
      // Stepping out of a tree with your own apple on it takes the apple too.
      if (tree.apple === owner) {
        tree.apple = null;
        this.pickApple(owner, tree);
      } else if (tree.apple) {
        tree.apple = null;
      }
    }
    const got = this.addSap(owner, COMMENSAL_SAP);
    if (got > 0) {
      const at = tree ?? { sx: f.x, sy: f.y };
      this.fx(owner).sapGain(at.sx, at.sy, got);
      this.announce(at.sx, at.sy - 50, `🌳 +${got} SAP HP`, WOOD.amberLit, 12);
    }
  }

  /** F — Digest: the last five seconds of damage, back as sap now and health over time. */
  doDigest(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    let mult = 1;
    if (s.apples > 0 && this.up(owner, 'f')) {
      s.apples--;
      mult = APPLE_DIGEST_MULT;
      this.fx(owner).appleEat(f.x, f.y);
      this.announce(f.x, f.y - 64, '🍎 DIGEST ×1.5', WOOD.appleLit, 11);
    }
    const taken = this.recentDamage(owner);
    const instant = taken * DIGEST_INSTANT * mult;
    const later = taken * DIGEST_HOT * mult;
    s.digest = { until: this.now + DIGEST_MS, perSec: later / (DIGEST_MS / 1000), frac: 0, allyOwed: new Map(), flushAt: this.now + GIFT_FLUSH_MS };
    this.fx(owner).digestCast(f.x, f.y, DIGEST_R);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('vine-grow', f.x, { rate: 1.1, volume: 0.6 });
    if (this.isReplica(owner)) return;
    const got = this.addSap(owner, instant);
    this.announce(f.x, f.y - 50, taken > 0
      ? `🍂 DIGEST ${Math.round(taken)}: +${got} SAP · +${Math.round(later)} HP / 5s`
      : '🍂 NOTHING TO DIGEST', WOOD.leafLit, 12);
    if (got > 0) this.fx(owner).sapGain(f.x, f.y, got);
    for (const m of this.teammatesOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, m.x, m.y) > DIGEST_R) continue;
      this.gift(m, instant, 0, 0);
      this.fx(owner).healMote(m.x, m.y);
    }
    for (const sp of this.sprouts) {
      if (sp.owner !== owner || Phaser.Math.Distance.Between(f.x, f.y, sp.x, sp.y) > DIGEST_R) continue;
      this.feedSprout(sp, instant, 'sap');
    }
  }

  /** Q — Final Harvest: wound up, then swung. */
  doFinalHarvest(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const side = this.side(owner).arc;
    this.side(owner).swing = { at: this.now + REAP_WINDUP_MS, ang, side };
    this.fx(owner).reapWindup(f.x, f.y, ang, REAP_WINDUP_MS);
    this.avatar(owner)?.play('raise', ang, REAP_WINDUP_MS);
    Sfx.playAt('roar', f.x, { rate: 0.6, volume: 0.6 });
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isWood('player');
    const npcIs = this.isWood('npc');
    const anyState = this.carves.length || this.sprouts.length || this.corpses.length
      || this.tainted.player.size || this.tainted.npc.size || this.now < this.giftedBrewUntil;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.ensureTrees();
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateSap(dt);
    this.updateCooking();
    this.updateSwings();
    this.updateCarves();
    this.updateTrees();
    this.updateSprouts(dt);
    this.updateDigest(dt);
    this.updateApples(delta);
    this.writeArmour();

    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  /**
   * Sap HP on each Wood body: the absorb callback (which gums up the attacker), the regrowth back
   * toward the peak, and the damage history Digest reads.
   */
  private updateSap(dt: number): void {
    const wall = Date.now();
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!f) continue;
      const s = this.side(owner);
      if (!this.isWood(owner) || this.isReplica(owner)) {
        if (f.onSapAbsorb) f.onSapAbsorb = null;
        continue;
      }
      // `takeDamage` has no attacker, so the source is the hit's own `source` when it is a body,
      // else the nearest enemy.
      f.onSapAbsorb = (spent, opts) => {
        const src = opts?.source instanceof Fighter ? opts.source : this.nearestEnemy(owner);
        if (!src || src === f || spent <= 0) return;
        if (src.woodSlowUntil < wall + 200) this.fx(owner).sapSplash(f.x, f.y, src.x, src.y + 14);
        src.woodSlowUntil = Math.max(src.woodSlowUntil, Date.now() + SAP_SLOW_MS);
      };
      if (!this.alive(f)) { s.hist.length = 0; s.lastTotal = -1; continue; }
      // Cut right through: the regrowth has nothing left to grow back to.
      if (f.sapHp <= 0) s.sapPeak = 0;
      else if (f.sapHp < s.sapPeak) {
        s.sapFrac += SAP_REGEN_PER_SEC * dt;
        const whole = Math.floor(s.sapFrac);
        if (whole > 0) {
          s.sapFrac -= whole;
          f.sapHp = Math.min(s.sapPeak, f.sapHp + whole);
        }
      }
      // Digest's memory.
      const tot = this.total(f);
      if (s.lastTotal >= 0 && tot < s.lastTotal - 0.01) s.hist.push({ t: this.now, loss: s.lastTotal - tot });
      s.lastTotal = tot;
      while (s.hist.length && this.now - s.hist[0].t > DIGEST_WINDOW_MS) s.hist.shift();
    }
  }

  private recentDamage(owner: Owner): number {
    let n = 0;
    for (const h of this.side(owner).hist) if (this.now - h.t <= DIGEST_WINDOW_MS) n += h.loss;
    return n;
  }

  private nearestEnemy(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = 600;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** E+ Brewmaster's cup on the boil: a hit spills it; a bot drinks when its planned boil is done. */
  private updateCooking(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.cooking) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.cooking = false; this.avatar(owner)?.setCooking(null); continue; }
      // A replica's boil is only drawn; its owner decides when it is drunk or spilled.
      if (this.isReplica(owner)) { this.avatar(owner)?.setCooking(this.cookLevel(s)); continue; }
      const tot = this.total(f) + f.shieldHp;
      if (tot < s.cookTotal - 0.5) {
        s.cooking = false;
        if (owner === 'player') {
          // The cup is gone and so is the cooldown: a spilled brew still costs the cast.
          this.relay(owner, 'wood-spill');
          s.pendingSpill = true;
          s.pendingCook = 0;
          f.castAbility('wood-oakbrew', this.api.buildPlayerContext(s.aimX, s.aimY));
          s.pendingSpill = false;
          this.avatar(owner)?.setCooking(null);
        } else {
          this.drink(owner, 0, true);
        }
        continue;
      }
      s.cookTotal = Math.max(s.cookTotal, tot);
      const k = this.cookLevel(s);
      this.avatar(owner)?.setCooking(k);
      if (owner === 'npc' && this.now - s.cookStart >= s.cookFor) {
        s.cooking = false;
        this.drink(owner, k, false);
      }
    }
  }

  private updateSwings(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const sw = s.swing;
      if (!sw || this.now < sw.at) continue;
      s.swing = null;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      this.fx(owner).reapSwing(f.x, f.y, sw.ang, REAP_REACH, REAP_HALF, sw.side);
      this.avatar(owner)?.reap(sw.ang, sw.side);
      Sfx.playAt('slash', f.x, { rate: 0.6, volume: 1 });
      const inArc = (x: number, y: number, r: number): boolean => {
        const d = Phaser.Math.Distance.Between(f.x, f.y, x, y);
        if (d > REAP_REACH + r) return false;
        const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(y - f.y, x - f.x) - sw.ang));
        return d <= r + 10 || off <= REAP_HALF;
      };
      for (const t of this.targetsOf(owner)) {
        if (!inArc(t.x, t.y, this.bodyR(t))) continue;
        this.hit(owner, t, REAP_DAMAGE);
        this.fx(owner).reapHit(t.x, t.y, sw.ang);
        if (!this.alive(t)) continue;
        if (this.total(f) >= EXECUTE_RATIO * this.total(t)) this.execute(owner, t, sw.ang);
        else this.taint(owner, t);
      }
      // Q+ Prune: the ent's own sprouts in the arc are cut down for their sap.
      if (this.up(owner, 'q') && !this.isReplica(owner)) {
        for (let i = this.sprouts.length - 1; i >= 0; i--) {
          const sp = this.sprouts[i];
          if (sp.owner !== owner || !inArc(sp.x, sp.y, SPROUT_R)) continue;
          this.sprouts.splice(i, 1);
          this.prune(owner, sp, sw.ang);
        }
      }
    }
  }

  private execute(owner: Owner, t: Fighter, ang: number): void {
    this.fx(owner).execute(t.x, t.y, ang);
    this.announce(t.x, t.y - 60, '🪓 FINAL HARVEST', WOOD.sapGlow, 16);
    Sfx.playAt('hit-heavy', t.x, { rate: 0.5, volume: 1 });
    // Pierced, and five times what is left: Justice's verdict pattern. Deliberately not wrapped in
    // `asNonAllyDamage`, so a co-op ally in the npc slot can never be executed by its own side.
    t.takeDamage(t.hp * 5 + 50, { pierce: true });
  }

  private taint(owner: Owner, t: Fighter): void {
    if (this.tainted[owner].has(t)) return;
    this.tainted[owner].add(t);
    t.woodTainted = 1;
    this.fx(owner).taint(t.x, t.y);
    this.announce(t.x, t.y - 50, '🍂 TAINTED', WOOD.amberLit, 12);
  }

  private prune(owner: Owner, sp: Sprout, ang: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const was = s.overflow;
    s.overflow = Math.min(OVERFLOW_MAX, s.overflow + PRUNE_OVERFLOW_STEP);
    const got = this.addSap(owner, sp.hp * PRUNE_SHARE);
    s.guilt++;
    this.corpseOf(sp, ang);
    this.fx(owner).prune(sp.x, sp.y, ang);
    this.announce(sp.x, sp.y - 30, `PRUNED · +${got} SAP HP`, WOOD.grayLit, 11);
    if (s.overflow > was && this.alive(f)) this.announce(f.x, f.y - 66, `SAP OVERFLOW +${s.overflow}`, WOOD.amberLit, 11);
    this.relay(owner, `wood-sprout-p:${sp.id}`);
  }

  private corpseOf(sp: Sprout, ang: number): void {
    this.corpses.push({ x: sp.x, y: sp.y, scale: this.sproutScale(sp), ang });
  }

  /**
   * The carverang's loop: a circle of radius R whose far side is the cursor, swept a full turn in
   * `dur`. The return leg is pulled toward the thrower's *current* position.
   */
  private updateCarves(): void {
    for (let i = this.carves.length - 1; i >= 0; i--) {
      const c = this.carves[i];
      const f = this.fighter(c.owner);
      const u = Phaser.Math.Clamp((this.now - c.start) / c.dur, 0, 1);
      const th = c.phi0 + c.side * u * Math.PI * 2;
      const home = u * u * (3 - 2 * u);
      const dx = this.alive(f) ? f.x - c.ox : 0;
      const dy = this.alive(f) ? f.y - c.oy : 0;
      const nx = c.cx + Math.cos(th) * c.R + dx * home;
      const ny = c.cy + Math.sin(th) * c.R + dy * home;
      const px = c.x;
      const py = c.y;
      c.x = nx;
      c.y = ny;
      c.trail.push({ x: nx, y: ny });
      if (c.trail.length > 10) c.trail.shift();

      const amber = this.amberOf(c.owner);
      for (const t of this.targetsOf(c.owner)) {
        if (c.hit.has(t)) continue;
        if (this.segDist(px, py, nx, ny, t.x, t.y) > CARVE_HIT_R + this.bodyR(t)) continue;
        c.hit.add(t);
        // Click+ Amber Edge: more with sap, and more again into a slowed body.
        let dmg = CARVE_DAMAGE * (1 + 0.8 * amber);
        if (amber > 0 && this.isSlowed(t)) dmg *= 1 + 0.6 * amber;
        this.hit(c.owner, t, Math.round(dmg));
        this.fx(c.owner).carveHit(t.x, t.y, Math.atan2(ny - py, nx - px), amber);
        Sfx.playAt('hit', t.x, { rate: 0.9, volume: 0.55 });
      }
      if (u >= 1) {
        this.carves.splice(i, 1);
        if (this.alive(f)) this.fx(c.owner).carveCatch(f.x, f.y);
      }
    }
  }

  /** Click+ Amber Edge: how far the amber has crept over the carverang, 0..1, off Sap HP. */
  private amberOf(owner: Owner): number {
    if (!this.up(owner, 'click')) return 0;
    const f = this.fighter(owner);
    return this.alive(f) ? Phaser.Math.Clamp(f.sapHp / 150, 0, 1) : 0;
  }

  private updateTrees(): void {
    for (const tr of this.trees) {
      if (tr.goneAt && this.now - tr.goneAt >= TREE_REGROW_MS) {
        tr.goneAt = 0;
        this.pfx.leaves(tr.x, tr.baseY - tr.h, 6, 20, 800, 3);
      }
    }
  }

  // ── R+ Mutualism: sprouts ──────────────────────────────────────────────────

  private spawnSprout(owner: Owner, x: number, y: number): void {
    const s = this.side(owner);
    const mine = this.sprouts.filter((sp) => sp.owner === owner);
    if (mine.length >= SPROUTS_MAX) {
      const old = mine[0];
      this.sprouts.splice(this.sprouts.indexOf(old), 1);
      this.fx(owner).leaves(old.x, old.y - 8, 5, 16, 600, 9);
    }
    this.sprouts.push({ id: s.sproutSeq++, owner, x, y: y + 8, hp: SPROUT_HP, born: this.now, hurtAt: 0 });
    this.fx(owner).sproutPop(x, y + 8);
  }

  private sproutScale(sp: Sprout): number { return 0.9 + Math.min(1.3, Math.sqrt(sp.hp) / 9); }

  /** A heal or sap given to a sprout: no ceiling, and half of it comes back to the ent. */
  private feedSprout(sp: Sprout, amount: number, kind: 'heal' | 'sap'): void {
    if (amount <= 0 || this.isReplica(sp.owner)) return;
    sp.hp += amount;
    const back = amount * MUTUAL_SHARE;
    if (kind === 'sap') this.addSap(sp.owner, back);
    else this.healSelf(sp.owner, back);
    if (Math.random() < 0.5 || amount >= 5) this.fx(sp.owner).sproutFed(sp.x, sp.y - 8 * this.sproutScale(sp));
  }

  /**
   * Sprouts are not fighters: they take damage from enemy shots that fly into them (which they
   * stop), and from enemies walking over them.
   */
  private updateSprouts(dt: number): void {
    if (!this.sprouts.length) return;
    const shots = this.api.projectiles?.getChildren() as Projectile[] | undefined;
    for (let i = this.sprouts.length - 1; i >= 0; i--) {
      const sp = this.sprouts[i];
      if (this.isReplica(sp.owner)) continue;
      const r = SPROUT_R * this.sproutScale(sp);
      let dmg = 0;
      for (const t of this.targetsOf(sp.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, sp.x, sp.y) < r + this.bodyR(t) * 0.7) dmg += SPROUT_TRAMPLE_DPS * dt;
      }
      if (shots) {
        for (const pr of shots) {
          if (!pr.active || pr.isHeal || pr.isFromPlayer === (sp.owner === 'player')) continue;
          if (Phaser.Math.Distance.Between(pr.x, pr.y, sp.x, sp.y - r * 0.6) > r + 6) continue;
          dmg += pr.damage;
          pr.destroy();
        }
      }
      const reg = this.api.projectileRegistry;
      if (reg) {
        for (const pr of reg.within(sp.owner === 'player' ? 'npc' : 'player', sp.x, sp.y - r * 0.6, r + 6)) {
          dmg += pr.damage;
          reg.steal(pr);
        }
      }
      if (dmg <= 0) continue;
      sp.hp -= dmg;
      sp.hurtAt = this.now;
      if (sp.hp > 0) continue;
      this.sprouts.splice(i, 1);
      this.fx(sp.owner).splinters(sp.x, sp.y - 8, 6, 18, 420, 9);
      this.fx(sp.owner).leaves(sp.x, sp.y - 8, 4, 14, 600, 9);
      this.announce(sp.x, sp.y - 30, 'SPROUT LOST', WOOD.sproutLit, 10);
      this.relay(sp.owner, `wood-sprout-k:${sp.id}`);
    }
  }

  // ── F: the aura ────────────────────────────────────────────────────────────

  private updateDigest(dt: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const d = s.digest;
      if (!d) continue;
      const f = this.fighter(owner);
      const over = this.now >= d.until || !this.alive(f);
      // Teammates' healing goes to their machines in batches; whatever is owed goes at the end too.
      if (over || this.now >= d.flushAt) {
        d.flushAt = this.now + GIFT_FLUSH_MS;
        for (const [m, owed] of d.allyOwed) {
          const whole = Math.floor(owed);
          if (whole <= 0) continue;
          d.allyOwed.set(m, owed - whole);
          this.gift(m, 0, whole, 0);
        }
      }
      if (over) { s.digest = null; continue; }
      if (this.isReplica(owner) || d.perSec <= 0) continue;
      const amt = d.perSec * dt;
      this.healSelf(owner, amt);
      for (const m of this.teammatesOf(owner)) {
        if (Phaser.Math.Distance.Between(f.x, f.y, m.x, m.y) > DIGEST_R) continue;
        d.allyOwed.set(m, (d.allyOwed.get(m) ?? 0) + amt);
        if (Math.random() < dt * 3) this.fx(owner).healMote(m.x, m.y);
      }
      for (const sp of this.sprouts) {
        if (sp.owner !== owner || Phaser.Math.Distance.Between(f.x, f.y, sp.x, sp.y) > DIGEST_R) continue;
        this.feedSprout(sp, amt, 'heal');
      }
      if (Math.random() < dt * 6) this.fx(owner).healMote(f.x, f.y);
    }
  }

  // ── F+ Friend of the Forest: apples ────────────────────────────────────────

  private updateApples(delta: number): void {
    for (const owner of BOTH) {
      if (!this.up(owner, 'f') || this.isReplica(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      s.appleTimer += delta;
      if (s.appleTimer >= APPLE_EVERY_MS) {
        s.appleTimer = 0;
        const hanging = this.trees.filter((tr) => tr.apple === owner).length;
        const free = this.trees.filter((tr) => this.treeStanding(tr) && !tr.apple);
        if (hanging < APPLES_ON_TREES && free.length) {
          const tr = free[Math.floor(Math.random() * free.length)];
          tr.apple = owner;
          this.fx(owner).leaves(tr.x, tr.baseY - tr.h * 0.62, 4, 12, 500, 3);
          this.relay(owner, `wood-apple:${this.trees.indexOf(tr)}`);
        }
      }
      if (s.apples < APPLES_HELD) {
        for (const tr of this.trees) {
          if (tr.apple !== owner) continue;
          if (Phaser.Math.Distance.Between(f.x, f.y, tr.x, tr.baseY - 10) > APPLE_PICK_R
            && Phaser.Math.Distance.Between(f.x, f.y, tr.sx, tr.sy) > APPLE_PICK_R) continue;
          tr.apple = null;
          this.pickApple(owner, tr);
          if (s.apples >= APPLES_HELD) break;
        }
      }
      // Low on health: an apple goes straight in.
      if (s.apples > 0 && f.hp < f.maxHp * APPLE_LOW_HP && this.now >= s.appleEatAt) {
        s.apples--;
        s.appleEatAt = this.now + APPLE_EAT_GAP_MS;
        f.heal(APPLE_HEAL);
        this.fx(owner).appleEat(f.x, f.y);
        this.announce(f.x, f.y - 50, `🍎 +${APPLE_HEAL} HP`, WOOD.appleLit, 12);
        Sfx.playAt('heal', f.x, { rate: 1.2, volume: 0.6 });
        this.relay(owner, 'wood-eat');
      }
    }
  }

  private pickApple(owner: Owner, tr: Tree): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (this.isReplica(owner) || s.apples >= APPLES_HELD) return;
    s.apples++;
    this.fx(owner).applePick(tr.x + 9, tr.baseY - tr.h * 0.62, f.x, f.y - 40);
    this.announce(f.x, f.y - 50, `🍎 APPLE (${s.apples}/${APPLES_HELD})`, WOOD.appleLit, 11);
    Sfx.playAt('ui-click', f.x, { rate: 1.5, volume: 0.4 });
    this.relay(owner, `wood-pick:${this.trees.indexOf(tr)}`);
  }

  /** Oakbrew's armour, rewritten from scratch every frame on everything it could be on. */
  private writeArmour(): void {
    for (const f of this.allFighters()) f.woodIncomingMult = 1;
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (f && this.isWood(owner) && this.now < this.side(owner).brewUntil) f.woodIncomingMult = BREW_MULT;
    }
    // A teammate's shared cup, on us.
    const p = this.api.player;
    if (p && this.now < this.giftedBrewUntil) p.woodIncomingMult = BREW_MULT;
    // Tainted is permanent; the field is only the tray's (and the mirror's) view of it.
    for (const owner of BOTH) {
      for (const t of this.tainted[owner]) if (!t.active) this.tainted[owner].delete(t);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paint(): void {
    const tg = this.treeGfx;
    const gg = this.groundGfx;
    const vg = this.veilGfx;
    const ag = this.airGfx;
    if (!tg || !gg || !vg || !ag) return;
    tg.clear(); gg.clear(); vg.clear(); ag.clear();

    // Haunting Hollows only stands while a Wood is in the fight.
    if (this.isWood('player') || this.isWood('npc')) {
      const p = this.api.player;
      const n = this.api.npc;
      const tint = this.isWood('player') ? this.pcol : this.ncol;
      for (const tr of this.trees) {
        if (!this.treeStanding(tr)) {
          birchStump(tg, tint, tr.x, tr.baseY, (this.now - tr.goneAt) / TREE_REGROW_MS, this.vizT, 1);
          continue;
        }
        // The eyes find whoever is nearer.
        let look: Fighter | null = null;
        let best = Infinity;
        for (const f of [p, n]) {
          if (!this.alive(f) || f.alpha <= 0.05) continue;
          const d = Phaser.Math.Distance.Between(tr.x, tr.baseY, f.x, f.y);
          if (d < best) { best = d; look = f; }
        }
        const appleTint = tr.apple ? this.col(tr.apple) : tint;
        birchTree(tg, appleTint, tr.x, tr.baseY, tr.h, tr.seed, this.vizT, 1,
          look ? { lookX: look.x, lookY: look.y } : {}, !!tr.apple);
      }
    }

    for (const c of this.corpses) sproutCorpse(gg, this.pcol, c.x, c.y, c.scale, c.ang, 0.95);
    for (const owner of BOTH) {
      const d = this.side(owner).digest;
      const f = this.fighter(owner);
      if (!d || !this.alive(f)) continue;
      const k = Math.min(1, (d.until - this.now) / 400, (this.now - (d.until - DIGEST_MS)) / 200);
      digestAura(gg, this.col(owner), f.x, f.y, DIGEST_R, this.vizT, Phaser.Math.Clamp(k, 0, 1) * f.alpha);
    }
    for (const sp of this.sprouts) {
      const hurt = this.now - sp.hurtAt < 160 ? 1 : 0;
      sproutShape(gg, this.col(sp.owner), sp.x, sp.y, this.sproutScale(sp) * Math.min(1, (this.now - sp.born) / 300), this.vizT + sp.id, 1, hurt);
    }

    const wall = Date.now();
    for (const f of this.allFighters()) {
      if (!f.active || f.alpha <= 0.05 || f.hp <= 0) continue;
      const by: Owner = f === this.api.player ? 'npc' : 'player';
      if (f.woodSlowUntil > wall) sapGoo(vg, this.col(by), f.x, f.y, this.vizT, f.alpha * Math.min(1, (f.woodSlowUntil - wall) / 300));
      if (f.woodTainted > 0) taintMark(vg, this.col(by), f.x, f.y, this.vizT, f.alpha * 0.75);
    }

    for (const c of this.carves) {
      const amber = this.amberOf(c.owner);
      carverangTrail(ag, this.col(c.owner), c.trail, 1, amber);
      carverangShape(ag, this.col(c.owner), c.x, c.y, (this.now - c.start) * 0.022 * c.side, CARVE_SIZE, 1, amber);
    }
    // Apples carried float over the ent's head.
    for (const owner of BOTH) {
      const n = this.side(owner).apples;
      const f = this.fighter(owner);
      if (!n || !this.alive(f) || !this.isWood(owner) || f.alpha <= 0.05) continue;
      for (let i = 0; i < n; i++) {
        const a = this.vizT * 1.6 + (i / n) * Math.PI * 2;
        appleShape(ag, this.col(owner), f.x + Math.cos(a) * 16, f.y - 62 + Math.sin(a) * 4, 4, f.alpha);
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
      if (owner === 'npc') {
        const t = this.targetsOf('npc')[0];
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setSap(f.sapHp / Math.max(1, f.maxHp));
      av.setCarveOut(this.carves.some((c) => c.owner === owner));
      av.setMastered(this.masteryOn(owner));
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const set = this.api.setStatusIndicator.bind(this.api);
    set('wood-arc', playerIs ? {
      name: s.arc > 0 ? 'Carverang: curls right' : 'Carverang: curls left', emoji: s.arc > 0 ? '↻' : '↺', color: WOOD.woodLit, priority: 152,
      description: 'Which way the carverang\'s loop curls. Right-click to swap.',
    } : null);
    const brewUntil = Math.max(playerIs ? s.brewUntil : 0, this.giftedBrewUntil);
    set('wood-brew', this.now < brewUntil ? {
      name: 'Oakbrew', emoji: '🍵', color: WOOD.amberLit, priority: 150,
      description: playerIs ? 'You take 15% less damage.' : 'A Wood teammate shared a cup: you take 15% less damage.',
      until: brewUntil,
    } : null);
    set('wood-cook', playerIs && s.cooking ? {
      name: 'Brewing', emoji: '☕', color: WOOD.teaLit, priority: 149,
      description: `Brewmaster: let go of E to drink. ${Math.round(this.cookLevel(s) * 100)}% cooked. Take any damage and the brew is lost.`,
      count: Math.round(this.cookLevel(s) * 100),
    } : null);
    set('wood-digest', playerIs && s.digest ? {
      name: 'Digesting', emoji: '🍂', color: WOOD.leafLit, priority: 151,
      description: `Healing ${Math.round(s.digest.perSec * 10) / 10} a second — you, and teammates in the aura.`,
      until: s.digest.until,
    } : null);
    set('wood-apples', playerIs && s.apples > 0 ? {
      name: 'Apples', emoji: '🍎', color: WOOD.appleLit, priority: 153,
      description: `Friend of the Forest: your next Oakbrew lasts twice as long, or your next Digest heals 1.5×. Below ${Math.round(APPLE_LOW_HP * 100)}% health one is eaten at once for ${APPLE_HEAL} HP.`,
      count: s.apples,
    } : null);
    const sprouts = this.sprouts.filter((sp) => sp.owner === 'player').length;
    set('wood-sprouts', playerIs && sprouts > 0 ? {
      name: 'Sprouts', emoji: '🌱', color: WOOD.sproutLit, priority: 154,
      description: 'Mutualism: every heal or Sap HP your abilities give a sprout gives you half as much again. Sprouts have no maximum health.',
      count: sprouts,
    } : null);
    set('wood-overflow', playerIs && s.overflow > OVERFLOW_BASE ? {
      name: 'Sap Overflow', emoji: '🪵', color: WOOD.amber, priority: 155,
      description: `Prune: your health and Sap HP together can reach ${s.overflow} past your maximum health.`,
      count: s.overflow,
    } : null);
    set('wood-guilt', playerIs && s.guilt > 0 ? {
      name: 'Guilt', emoji: '🩶', color: WOOD.gray, priority: 156,
      description: 'Sprouts you cut down with the scythe. They are still lying where they fell.',
      count: s.guilt,
    } : null);
  }

  // ── Bot opportunities (read by ArenaScene into NpcAiState; side-effect-free) ──

  /** One of the bot's carverangs is coming home: a throw now re-carves it. */
  npcRecarveReady(): boolean {
    if (!this.isWood('npc')) return false;
    return this.homeward('npc', RECARVE_FROM + 0.04) !== null;
  }

  /** Final Harvest would kill: after the 35, the bot out-healths the target by 60%. */
  npcCanExecute(): boolean {
    const n = this.api.npc;
    const p = this.api.player;
    if (!this.alive(n) || !this.alive(p) || !this.isWood('npc')) return false;
    if (Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y) > REAP_REACH + this.bodyR(p) - 10) return false;
    const after = Math.max(1, this.total(p) - REAP_DAMAGE * p.woodIncomingMult);
    return this.total(n) >= EXECUTE_RATIO * after;
  }

  /** The execute is a little more sap away — worth a brew before the swing. */
  npcExecuteNeedsSap(): boolean {
    const n = this.api.npc;
    const p = this.api.player;
    if (!this.alive(n) || !this.alive(p) || !this.isWood('npc') || this.npcCanExecute()) return false;
    const after = Math.max(1, this.total(p) - REAP_DAMAGE);
    const short = EXECUTE_RATIO * after - this.total(n);
    return short > 0 && short <= NPC_EXECUTE_SAP_GAP && this.sapRoom(n, this.sides.npc.overflow) >= short;
  }

  /** How much the bot has taken in the last five seconds — what a Digest would turn around. */
  npcDigestValue(): number {
    return this.isWood('npc') ? this.recentDamage('npc') : 0;
  }

  /** Is the bot's brew on the boil (E+)? The rotation leaves E alone while it is. */
  npcCooking(): boolean { return this.sides.npc.cooking; }

  /**
   * Where Commensalism should take the bot: hurt, the standing tree furthest from its target;
   * healthy with the target far off, the tree nearest the target. Side-effect-free.
   */
  npcTreeAim(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    const p = this.api.player;
    if (!this.alive(n) || !this.alive(p) || !this.isWood('npc') || !this.trees.length) return undefined;
    const hurt = n.hp / Math.max(1, n.maxHp) < 0.45;
    const far = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y) > 380;
    if (!hurt && !far) return undefined;
    let best: Tree | null = null;
    let bestScore = -Infinity;
    for (const tr of this.trees) {
      if (!this.treeStanding(tr)) continue;
      const d = Phaser.Math.Distance.Between(tr.sx, tr.sy, p.x, p.y);
      const score = hurt ? d : -d;
      if (score > bestScore) { bestScore = score; best = tr; }
    }
    return best ? { x: best.x, y: best.baseY } : undefined;
  }

  /** Q+ Prune: a fat sprout of the bot's in reach of the scythe. */
  npcPruneAim(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    if (!this.alive(n) || !this.up('npc', 'q')) return undefined;
    for (const sp of this.sprouts) {
      if (sp.owner !== 'npc' || sp.hp < NPC_PRUNE_MIN_HP) continue;
      if (Phaser.Math.Distance.Between(n.x, n.y, sp.x, sp.y) < REAP_REACH - 20) return { x: sp.x, y: sp.y };
    }
    return undefined;
  }

  /**
   * Somewhere worth walking: an apple of the bot's own (F+) while it has room for one, or — while
   * its Digest aura runs — onto its own sprouts so the aura feeds them. Side-effect-free.
   */
  npcSeekPoint(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    if (!this.alive(n) || !this.isWood('npc')) return undefined;
    const s = this.sides.npc;
    if (s.digest) {
      for (const sp of this.sprouts) {
        if (sp.owner !== 'npc') continue;
        const d = Phaser.Math.Distance.Between(n.x, n.y, sp.x, sp.y);
        if (d > DIGEST_R * 0.6 && d < 320) return { x: sp.x, y: sp.y };
      }
    }
    if (this.up('npc', 'f') && s.apples < APPLES_HELD) {
      let best: Tree | null = null;
      let bestD = 360;
      for (const tr of this.trees) {
        if (tr.apple !== 'npc') continue;
        const d = Phaser.Math.Distance.Between(n.x, n.y, tr.sx, tr.sy);
        if (d < bestD) { bestD = d; best = tr; }
      }
      if (best) return { x: best.sx, y: best.sy };
    }
    return undefined;
  }
}
