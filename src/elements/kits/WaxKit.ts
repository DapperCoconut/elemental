import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { SummonPurgeTarget } from '../../combat/SummonPurge';
import { Sfx } from '../../audio';
import {
  WAX, WaxAvatar, WaxColorFn, WaxFx, combCell, strokeComb, drawStrapGauge, drawBee, drawCandle, drawCandleAura, drawDart, drawGrapple,
  drawHive, drawHoneyShell, drawPoisonTell, drawPuddle, drawSmokeCloud, drawSmokerStream, drawStickyBomb,
} from './WaxVisuals';

/**
 * Wax — the apiarist's kit.
 *
 * Five keys, all feeding one another:
 * - **Click** fences: six foil thrusts along the cursor line, and a stinger if all six land.
 * - **E** looses fifteen bees that latch on and make the victim a little softer each.
 * - **R** plants a candle: armour for whoever stands in its light, and longer-lived bees.
 * - **F** builds a hive that stores bees flown into it and pays them back five to one.
 * - **Q** lobs sticky bombs, and the second press is the detonation.
 *
 * The shop upgrades reach into every one of those (ranged darts, elite bees, melting armour,
 * honey, and strapping the bombs to yourself), and the bombs reach back into the candles and
 * hives: a bomb that hits your own candle banks its aura; one that hits your own hive cashes
 * it in violently.
 *
 * The mastery (2026-10-18) is the "Mastery" block: Honey Shell, a passive dome that eats the next
 * hit of 30 or more and re-forms eight seconds later, and Smoke-out, a held smoker that grows a
 * cloud in front of you — invisible and 20% evasive while you stand in it, opaque to everyone else.
 *
 * Nothing here is a sprite. Bees, bombs, darts, candles and hives are records painted every
 * frame into three Graphics layers (floor, objects, air) through the painters in WaxVisuals,
 * so the codex showcase can draw the same art from the same calls.
 */

type Owner = 'player' | 'npc';
type Slot = 'click' | 'e' | 'r' | 'f' | 'q';

const ARENA_PAD = 32;

const STINGER_COUNT = 6;
const STINGER_DAMAGE = 4;
const STINGER_FINAL_DAMAGE = 12;
const STINGER_RANGE = 190;
const STINGER_HALF_WIDTH = 19;
const STINGER_GAP_MS = 70;
const STINGER_FINAL_DELAY_MS = 110;
const STINGER_OFFSETS = [-7.5, -5, -2.5, 2.5, 5, 7.5].map(Phaser.Math.DegToRad);
const STINGER_SHOVE_SPEED = 285;
const SHOVE_MS = 260;

const DART_COUNT = 5;
const DART_DAMAGE = 3;
const DART_SPEED = 650;
const DART_LIFE_MS = 1200;
const DART_HIT_R = 24;
const DART_OFFSETS = [-3, -1.5, 0, 1.5, 3].map(Phaser.Math.DegToRad);
const GRAPPLE_DAMAGE = 12;
const GRAPPLE_SPEED = 760;
const GRAPPLE_LIFE_MS = 1100;
const GRAPPLE_HIT_R = 30;
const GRAPPLE_PULL_RANGE = 92;
const GRAPPLE_PULL_SPEED = 720;
const GRAPPLE_PULL_MS = 750;

const POISON_MS = 8000;
const POISON_TICK_MS = 1000;
const POISON_DAMAGE = 1;
const POISON_MAX_STACKS = 8;

const SWARM_COUNT = 15;
const SWARM_HALF_ANGLE = Phaser.Math.DegToRad(24);
const BEE_SPEED = 350;
/** Bees hunt: a flying bee bends toward the nearest enemy inside this range, at this turn rate. */
const BEE_SEEK_RANGE = 230;
const BEE_TURN_RATE = 4.2;
const BEE_HIT_R = 24;
const BEE_FLIGHT_MS = 2600;
const BEE_LATCH_MS = 3000;
const BEE_TICK_MS = 1000;
const BEE_DAMAGE = 2;
const ELITE_COUNT = 3;
const ELITE_DAMAGE = 3;
const ELITE_LATCH_MS = 5000;

const CANDLE_RADIUS = 125;
const CANDLE_MS = 12000;
const CANDLE_BANK_MS = 15000;
const CANDLE_RESIST = 0.15;
const CANDLE_RESIST_CAP = 0.45;
const CANDLE_BEE_BONUS_MS = 2000;
const MELTING_PER_HIT = 0.02;
const MELTING_MS = 5000;
const MELTING_CAP = 10;
const HOT_WAX_R = 44;
const HOT_WAX_MS = 6000;
const HOT_WAX_TICK_MS = 1000;
const HOT_WAX_DAMAGE = 3;

const HIVE_R = 29;
const HIVE_REDEEM_R = 92;
const HIVE_CELLS = 5;
const HIVE_MAX = 2;
const HIVE_BUFF_MS = 12000;
const HONEY_MAX = 50;
const HONEY_BASE_PER_SEC = 0.35;
const HONEY_PER_CELL_PER_SEC = 0.23;
const HONEY_PUDDLE_R = 34;
const HONEY_PUDDLE_MS = 10000;
const HONEY_HEAL_PER_TICK = 3;

const BOMB_COUNT = 8;
const BOMB_HALF_ANGLE = Phaser.Math.DegToRad(11);
const BOMB_SPEED = 315;
const BOMB_HIT_R = 24;
const BOMB_FLIGHT_MS = 1500;
const BOMB_STICK_MS = 20000;
const BOMB_DAMAGE = 10;
const BOMB_PER_STACK = 0.1;
const BOMB_VULN = 0.1;
const BOMB_HOLD_MS = 2000;
const SELF_BOMB_VULN = 0.25;
const SELF_BOMB_SHARE = 0.33;
const SELF_BOMB_RADIUS = 165;
const SELF_BOMB_ARM_MS = 650;

// ── Mastery ──
const SMOKE_ID = 'wax-smoke-out';
const SMOKE_END_ID = 'wax-smoke-end';
const SHELL_POP_ID = 'wax-honey-pop';
const SHELL_UP_ID = 'wax-honey-up';
/** Honey Shell: re-forms this long after it cracks. The 30-damage floor lives in `Fighter.takeDamage`. */
const SHELL_REGROW_MS = 8000;
/** Smoke-out: seconds of smoke in the smoker, how much a press needs, and how fast it refills. */
const SMOKE_FUEL_MAX = 5;
const SMOKE_FUEL_MIN = 1;
const SMOKE_FUEL_REGEN = 0.4;
const SMOKE_START_R = 34;
const SMOKE_MAX_R = 170;
const SMOKE_GROW_PER_SEC = 42;
/** A new cloud is started this far ahead of the smoker, along the aim. */
const SMOKE_AHEAD = 70;
/** Walk further than this past a cloud's edge and the smoke starts a new cloud instead. */
const SMOKE_LEASH = 50;
const SMOKE_LINGER_MS = 9000;
const SMOKE_FADE_MS = 1500;
const SMOKE_MAX_CLOUDS = 4;
/** Inside this share of a cloud's radius, you are in it. */
const SMOKE_HIDE_FRAC = 0.85;
/** A sight line passing within this share of a cloud's radius is blocked by it. */
const SMOKE_SIGHT_FRAC = 0.7;
const SMOKE_DODGE = 0.2;
const NPC_SMOKE_HP = 0.55;

interface Barrage {
  owner: Owner;
  angle: number;
  nextAt: number;
  index: number;
  hits: Map<Fighter, number>;
  finalAt: number;
  finalTargets: Fighter[];
}

interface DartVolley {
  hits: Map<Fighter, number>;
  grappled: Set<Fighter>;
}

interface Dart {
  owner: Owner;
  kind: 'stinger' | 'grapple';
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  volley: DartVolley | null;
}

interface Poison {
  owner: Owner;
  target: Fighter;
  until: number;
  tickAt: number;
  stacks: number;
}

interface Bee {
  owner: Owner;
  state: 'flying' | 'orbit' | 'attached';
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  until: number;
  latchMs: number;
  target: Fighter | null;
  offsetX: number;
  offsetY: number;
  tickAt: number;
  orbitIndex: number;
  orbitTotal: number;
  orbitRadius: number;
  seed: number;
  elite: boolean;
}

interface Candle {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  until: number;
  seed: number;
  nextMeltAt: number;
}

interface Hive {
  owner: Owner;
  x: number;
  y: number;
  cells: number;
  honey: number;
  seed: number;
  bornAt: number;
}

interface Bomb {
  owner: Owner;
  state: 'flying' | 'attached' | 'self';
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  target: Fighter | null;
  offsetX: number;
  offsetY: number;
  seed: number;
  index: number;
  armedAt: number;
  launchedAt: number;
}

/** Mastery — a Smoke-out cloud. Grows while it is the one being fed; lingers once it is not. */
interface Cloud { owner: Owner; x: number; y: number; r: number; fedAt: number; seed: number }

interface Shove { target: Fighter; vx: number; vy: number; until: number }
interface Pull { owner: Owner; target: Fighter; until: number }
interface Puddle { owner: Owner; kind: 'hot' | 'honey'; x: number; y: number; r: number; until: number; tickAt: number; seed: number }

interface SideState {
  /** Banked candle auras (a bomb cashed a candle in), as expiry stamps. */
  bankedAuras: number[];
  /** Bee shields from redeemed hives: each pays `beesPerHit` on every hit taken, until expiry. */
  shields: Array<{ until: number; beesPerHit: number }>;
  /** Melting Point stacks, as expiry stamps. */
  melting: number[];
  qHolding: boolean;
  qHoldStart: number;
  qHoldFired: boolean;
  lastBombLaunchAt: number;
  // ── Mastery ──
  /** Smoke-out: the smoker is going, what is left in it, and the cloud it is feeding. */
  smoking: boolean;
  fuel: number;
  feeding: Cloud | null;
  /** How far ahead of the body a new cloud starts. The bot shortens it to smoke its own feet. */
  smokeAhead: number;
  npcSmokeUntil: number;
  /** The body is hidden in its own smoke this frame — so the hide can be undone on the way out. */
  hidden: boolean;
  dodgesSeen: number;
  /** Honey Shell: armed once per match, then re-formed off `shellReadyAt` after every crack. */
  shellSeeded: boolean;
  shellReadyAt: number;
  shellPopsSeen: number;
  /** An online replica's shell, as the owner last said it was. Paint only — it blocks nothing here. */
  shellUp: boolean;
  /** Mastery stat: milliseconds stood in candlelight, banked a whole second at a time. */
  candleMs: number;
}

export interface WaxArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  /** The npc slot is a bot this kit may decide for, not a remote player or an ally. */
  get npcAutonomous(): boolean;
  get width(): number;
  get height(): number;
  /** `SkinsKit.waxColor` — one owner's skin, or the identity. */
  waxColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  /** Online: the player's off-cooldown presses the opponent's sim has to replay. */
  broadcastSpecialCast(id: string): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which mastery enhancement each side dropped over an R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
}

function makeSide(): SideState {
  return {
    bankedAuras: [], shields: [], melting: [], qHolding: false, qHoldStart: 0, qHoldFired: false, lastBombLaunchAt: 0,
    smoking: false, fuel: SMOKE_FUEL_MAX, feeding: null, smokeAhead: SMOKE_AHEAD, npcSmokeUntil: 0, hidden: false, dodgesSeen: 0,
    shellSeeded: false, shellReadyAt: 0, shellPopsSeen: 0, shellUp: false, candleMs: 0,
  };
}

function segmentDistanceSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax, aby = by - ay;
  const lenSq = abx * abx + aby * aby || 1;
  const t = Phaser.Math.Clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
  const dx = px - (ax + abx * t), dy = py - (ay + aby * t);
  return dx * dx + dy * dy;
}

export class WaxKit implements SummonPurgeTarget {
  private readonly pcol: WaxColorFn;
  private readonly ncol: WaxColorFn;
  private readonly pfx: WaxFx;
  private readonly nfx: WaxFx;
  private playerAvatar: WaxAvatar | null = null;
  private npcAvatar: WaxAvatar | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private sides: Record<Owner, SideState> = { player: makeSide(), npc: makeSide() };
  private barrages: Barrage[] = [];
  private darts: Dart[] = [];
  private poisons: Poison[] = [];
  private bees: Bee[] = [];
  private candles: Candle[] = [];
  private hives: Hive[] = [];
  private puddles: Puddle[] = [];
  private bombs: Bomb[] = [];
  private shoves: Shove[] = [];
  private pulls: Pull[] = [];
  private clouds: Cloud[] = [];
  private smokeGfx: Phaser.GameObjects.Graphics | null = null;
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private objectGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private hooked = new Map<Owner, { fighter: Fighter; listener: (amount: number) => void }>();
  private t = 0;

  constructor(private api: WaxArenaApi) {
    this.pcol = (base) => api.waxColor('player', base);
    this.ncol = (base) => api.waxColor('npc', base);
    this.pfx = new WaxFx(api.scene, this.pcol);
    this.nfx = new WaxFx(api.scene, this.ncol);
  }

  // ── Small helpers ─────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private side(owner: Owner): SideState { return this.sides[owner]; }
  private fx(owner: Owner): WaxFx { return owner === 'player' ? this.pfx : this.nfx; }
  private tint(owner: Owner): WaxColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): WaxAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private isWax(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'wax' : this.api.npcElementId === 'wax';
  }
  private up(owner: Owner, slot: Slot): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }
  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Squared(x, y, t.x, t.y);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }
  private clampX(x: number): number { return Phaser.Math.Clamp(x, ARENA_PAD, this.api.width - ARENA_PAD); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, ARENA_PAD, this.api.height - ARENA_PAD); }
  private aimOf(owner: Owner): number {
    const f = this.fighter(owner);
    if (owner === 'player') return Math.atan2((this.lastMouseY || f.y) - f.y, (this.lastMouseX || f.x + 1) - f.x);
    const t = this.nearestTarget(owner, f.x, f.y);
    return t ? Math.atan2(t.y - f.y, t.x - f.x) : 0;
  }

  /** The kit's own pop-up: ArenaScene's is a no-op, and these few are worth reading. */
  private announce(x: number, y: number, text: string, color: string, size = 11, ms = 1000): void {
    const scene = this.api.scene;
    const label = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color, stroke: '#1a1208', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(16);
    scene.tweens.add({ targets: label, y: y - 24, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }

  /** Every point of damage the kit deals passes through here, so crits and multipliers apply once. */
  private hit(owner: Owner, target: Fighter, damage: number, source: object, sx: number, sy: number, status = false): void {
    const attacker = this.fighter(owner);
    target.lastDamageOwner = owner;
    target.setIncomingCritContext(attacker.critChance, attacker.critMult);
    const amount = Math.max(0, Math.round(damage * attacker.outgoingDamageMult * attacker.cardOutgoingDamageMult * (status ? target.statusDmgMult : 1)));
    target.takeDamage(amount, { source, sourceX: sx, sourceY: sy });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  reset(): void {
    for (const { fighter, listener } of this.hooked.values()) fighter.off('damaged', listener);
    this.hooked.clear();
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (!f) continue;
      f.waxIncomingMult = 1;
      f.waxSmokeDodge = 0;
      f.waxHoneyShell = false;
      if (this.sides[owner].hidden) this.applyHidden(owner, false);
    }
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.barrages = [];
    this.darts = [];
    this.poisons = [];
    this.bees = [];
    this.candles = [];
    this.hives = [];
    this.puddles = [];
    this.bombs = [];
    this.shoves = [];
    this.pulls = [];
    this.clouds = [];
    this.smokeGfx?.destroy(); this.smokeGfx = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.objectGfx?.destroy(); this.objectGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.t = 0;
    this.clearHud();
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'wax') return;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    const p = this.api.player;
    const s = this.side('player');
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown && !this.api.pointerWasDown) p.castAbility('wax-stinger-strikes', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('wax-swarm', ctx);
    // Mastery: whichever of R/F/Q Smoke-out was dropped on is the smoker's now, held not tapped.
    const smokeSlot = this.smokeSlot('player');
    if (smokeSlot) this.handleSmokeKey(this.slotKey(smokeSlot));
    if (smokeSlot !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('wax-candle-mount', ctx);
    if (smokeSlot !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      // Beside a hive, F is the redemption and costs nothing; otherwise it is the build.
      const near = this.nearestRedeemableHive('player');
      if (near) this.redeemHive(near, false);
      else p.castAbility('wax-hive-hearth', ctx);
    }
    if (smokeSlot === 'q') return;
    if (this.up('player', 'q')) {
      // Rule Beetanica: a two-second hold straps the bombs on; a tap is the ordinary Q.
      if (this.api.qKey.isDown) {
        if (!s.qHolding) { s.qHolding = true; s.qHoldStart = time; s.qHoldFired = false; }
        else if (!s.qHoldFired && time - s.qHoldStart >= BOMB_HOLD_MS && this.bombsOf('player').length === 0
          && p.getCooldownRatio('wax-sticky-bombs') >= 1) {
          s.qHoldFired = true;
          this.strapBombs('player');
          p.triggerCooldown('wax-sticky-bombs');
          this.api.broadcastSpecialCast('wax-rule-beetanica');
        }
      } else if (s.qHolding) {
        if (!s.qHoldFired) this.tapQ('player', ctx);
        s.qHolding = false;
        s.qHoldFired = false;
      }
    } else if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      this.tapQ('player', ctx);
    }
  }

  /** Q: detonate whatever is out; otherwise the launch, through the cooldown. */
  private tapQ(owner: Owner, ctx: CastContext): void {
    if (this.selfBombs(owner).length > 0) {
      if (owner === 'player') this.api.broadcastSpecialCast('wax-detonate-self');
      this.detonateSelf(owner);
    } else if (this.attachedBombs(owner).length > 0) {
      if (owner === 'player') this.api.broadcastSpecialCast('wax-detonate');
      this.detonateAttached(owner);
    } else {
      this.fighter(owner).castAbility('wax-sticky-bombs', ctx);
    }
  }

  // ── Casts (player and npc both arrive here through the CastContext) ────────

  doStingerStrikes(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f?.active) return;
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const near = this.nearestTarget(owner, f.x, f.y);
    if (this.up(owner, 'click') && (!near || Phaser.Math.Distance.Between(f.x, f.y, near.x, near.y) > STINGER_RANGE)) {
      this.launchDarts(owner, angle);
      return;
    }
    this.barrages.push({ owner, angle, nextAt: this.now, index: 0, hits: new Map(), finalAt: 0, finalTargets: [] });
    const av = this.avatar(owner);
    av?.fence(true);
    av?.setHold('reach', angle);
    Sfx.playAt('spear-throw', f.x, { rate: 1.35, volume: 0.6 });
  }

  doSwarm(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f?.active) return;
    const base = Math.atan2(ty - f.y, tx - f.x);
    const elite = this.up(owner, 'e');
    for (let i = 0; i < SWARM_COUNT; i++) {
      const lane = i / (SWARM_COUNT - 1) - 0.5;
      const a = base + lane * SWARM_HALF_ANGLE * 2 + Phaser.Math.FloatBetween(-0.02, 0.02);
      // Three elites ride the middle lanes, where they are most likely to land.
      const isElite = elite && (i === 5 || i === 7 || i === 9);
      this.spawnFlyingBee(owner, f.x + Math.cos(a) * 26, f.y + Math.sin(a) * 26, a, isElite, BEE_FLIGHT_MS);
    }
    this.avatar(owner)?.play('sweep', base);
    this.fx(owner).combRing(f.x + Math.cos(base) * 20, f.y + Math.sin(base) * 20, 34, WAX.honeyLit, 320);
    Sfx.playAt('whoosh', f.x, { rate: 1.65, volume: 0.65 });
  }

  doCandleMount(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const x = this.clampX(tx), y = this.clampY(ty);
    this.candles.push({ owner, x, y, bornAt: this.now, until: this.now + CANDLE_MS, seed: Math.random() * 100, nextMeltAt: this.now + Phaser.Math.Between(3000, 4000) });
    this.avatar(owner)?.play('slam', Math.atan2(y - f.y, x - f.x));
    this.fx(owner).candleBurst(x, y, CANDLE_RADIUS);
    Sfx.playAt('holy-chord', x, { rate: 1.5, volume: 0.5 });
  }

  doHiveHearth(owner: Owner, tx: number, ty: number): void {
    const near = this.nearestRedeemableHive(owner);
    if (near) { this.redeemHive(near, false); return; }
    const f = this.fighter(owner);
    const x = this.clampX(tx), y = this.clampY(ty);
    const mine = this.hives.filter((h) => h.owner === owner);
    if (mine.length >= HIVE_MAX) {
      // The oldest hive is cashed in rather than deleted — nothing stored is ever thrown away.
      const oldest = mine.reduce((a, b) => (a.bornAt < b.bornAt ? a : b));
      this.redeemHive(oldest, false);
    }
    this.hives.push({ owner, x, y, cells: 0, honey: 0, seed: Math.random() * 100, bornAt: this.now });
    this.avatar(owner)?.play('clap', Math.atan2(y - f.y, x - f.x));
    this.fx(owner).combRing(x, y, 60, WAX.honey, 480);
    this.fx(owner).droplets(x, y, 8, 100, WAX.wax, 420);
    Sfx.playAt('stone-rise', x, { rate: 1.35, volume: 0.6 });
  }

  doStickyBombs(owner: Owner, tx: number, ty: number): void {
    if (this.selfBombs(owner).length > 0) { this.detonateSelf(owner); return; }
    if (this.attachedBombs(owner).length > 0) { this.detonateAttached(owner); return; }
    const f = this.fighter(owner);
    if (!f?.active) return;
    // A bot with Rule Beetanica straps up rather than lobs: it is the stronger play at the
    // range a brawling bot already closes to, and the kit walks it in (see `update`).
    if (owner === 'npc' && this.api.npcAutonomous && this.up(owner, 'q') && this.side(owner).bankedAuras.length === 0
      && Math.random() < 0.5) {
      this.strapBombs(owner);
      return;
    }
    const base = Math.atan2(ty - f.y, tx - f.x);
    for (let i = 0; i < BOMB_COUNT; i++) {
      const lane = i / (BOMB_COUNT - 1) - 0.5;
      const a = base + lane * BOMB_HALF_ANGLE * 2;
      this.bombs.push({
        owner, state: 'flying', x: f.x + Math.cos(a) * 28, y: f.y + Math.sin(a) * 28,
        vx: Math.cos(a) * BOMB_SPEED, vy: Math.sin(a) * BOMB_SPEED, until: this.now + BOMB_FLIGHT_MS,
        target: null, offsetX: 0, offsetY: 0, seed: Math.random() * 100, index: i, armedAt: 0, launchedAt: this.now,
      });
    }
    this.side(owner).lastBombLaunchAt = this.now;
    this.avatar(owner)?.play('punch', base);
    this.fx(owner).droplets(f.x + Math.cos(base) * 24, f.y + Math.sin(base) * 24, 6, 120, WAX.honey, 380);
    Sfx.playAt('grenade-launch', f.x, { rate: 1.25, volume: 0.65 });
  }

  // ── Online replay of the player's off-cooldown presses ────────────────────

  doNpcRuleBeetanica(): void {
    // The ordinary Q stamp may already have lobbed a replica cone; the strap replaces it.
    this.bombs = this.bombs.filter((b) => b.owner !== 'npc');
    this.strapBombs('npc');
  }

  doNpcDetonate(self: boolean): void {
    if (self) this.detonateSelf('npc'); else this.detonateAttached('npc');
  }

  // ── Per frame ─────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const live = this.api.elementId === 'wax' || this.api.npcElementId === 'wax'
      || this.barrages.length + this.darts.length + this.poisons.length + this.bees.length + this.candles.length
        + this.hives.length + this.puddles.length + this.bombs.length + this.shoves.length + this.pulls.length + this.clouds.length > 0;
    if (!live) { this.updateAvatars(time, delta); return; }
    const dt = Math.min(delta, 80) / 1000;
    this.t += dt;
    this.ensureLayers();
    this.ensureHooks();
    this.updateAvatars(time, delta);
    this.updateBarrages(time);
    this.updateDarts(time, dt);
    this.updatePoisons(time);
    this.updateCandles(time);
    this.updateHives(dt);
    this.updateBees(time, dt);
    this.updatePuddles(time);
    this.updateBombs(time, dt);
    this.updateShoves(time, dt);
    this.updatePulls(time, dt);
    this.updateBotHands(time);
    this.updateMastery(time, dt);
    this.updateMultipliers(time);
    this.updateHud(time);
    this.paint(time);
  }

  private updateAvatars(time: number, delta: number): void {
    const { player, npc, scene } = this.api;
    void time;
    if (this.api.elementId === 'wax' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new WaxAvatar(scene, this.pcol);
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.setFacing(this.aimOf('player'));
      this.playerAvatar.setIntensity(this.selfBombs('player').length > 0 ? 1.3 : 1);
      if (!this.barrages.some((b) => b.owner === 'player')) { this.playerAvatar.fence(false); this.playerAvatar.releaseLunge(); }
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }
    if (this.api.npcElementId === 'wax' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new WaxAvatar(scene, this.ncol);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.setFacing(this.aimOf('npc'));
      this.npcAvatar.setIntensity(this.selfBombs('npc').length > 0 ? 1.3 : 1);
      if (!this.barrages.some((b) => b.owner === 'npc')) { this.npcAvatar.fence(false); this.npcAvatar.releaseLunge(); }
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Hits taken feed Melting Point and the bee shield. One hook per fighter, re-bound on swap. */
  private ensureHooks(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const fighter = this.fighter(owner);
      const old = this.hooked.get(owner);
      if (old?.fighter === fighter) continue;
      if (old) old.fighter.off('damaged', old.listener);
      const listener = (amount: number) => {
        if (amount <= 0 || !this.isWax(owner) || !fighter.active) return;
        const s = this.side(owner);
        if (this.up(owner, 'r') && this.candleStacks(owner) > 0 && s.melting.length < MELTING_CAP) {
          s.melting.push(this.now + MELTING_MS);
          this.spawnPuddle(owner, 'hot', fighter.x, fighter.y);
          this.fx(owner).spatter(fighter.x, fighter.y);
        }
        const bees = s.shields.filter((sh) => sh.until > this.now).reduce((sum, sh) => sum + sh.beesPerHit, 0);
        if (bees <= 0) return;
        const target = this.nearestTarget(owner, fighter.x, fighter.y);
        if (!target) return;
        for (let i = 0; i < bees; i++) this.attachBee(owner, target, i, bees, false);
        this.fx(owner).beeLand(target.x, target.y);
      };
      fighter.on('damaged', listener);
      this.hooked.set(owner, { fighter, listener });
    }
  }

  // ── Click: the foil ───────────────────────────────────────────────────────

  private updateBarrages(time: number): void {
    for (let i = this.barrages.length - 1; i >= 0; i--) {
      const b = this.barrages[i];
      const f = this.fighter(b.owner);
      if (!f?.active || f.hp <= 0) { this.barrages.splice(i, 1); continue; }
      while (b.index < STINGER_COUNT && time >= b.nextAt) {
        this.thrust(b, f, b.angle + STINGER_OFFSETS[b.index]);
        b.index++;
        b.nextAt += STINGER_GAP_MS;
        if (b.index === STINGER_COUNT) {
          b.finalTargets = [...b.hits.entries()].filter(([, n]) => n === STINGER_COUNT).map(([t]) => t);
          b.finalAt = time + STINGER_FINAL_DELAY_MS;
        }
      }
      if (b.index === STINGER_COUNT && time >= b.finalAt) {
        if (b.finalTargets.length > 0) this.finalStinger(b, f);
        this.barrages.splice(i, 1);
      }
    }
  }

  private thrust(b: Barrage, f: Fighter, angle: number): void {
    const ex = f.x + Math.cos(angle) * STINGER_RANGE, ey = f.y + Math.sin(angle) * STINGER_RANGE;
    this.fx(b.owner).thrust(f.x + Math.cos(angle) * 18, f.y + Math.sin(angle) * 18, ex, ey, false);
    this.avatar(b.owner)?.setHold('reach', angle);
    for (const target of this.targetsOf(b.owner)) {
      const width = STINGER_HALF_WIDTH + 22 * Math.max(0, target.sizeMult - 1);
      if (segmentDistanceSq(target.x, target.y, f.x, f.y, ex, ey) > width * width) continue;
      this.hit(b.owner, target, STINGER_DAMAGE, b, f.x, f.y);
      this.record(b.owner, 'stings');
      this.api.spawnHitFlash(target.x, target.y, WAX.pale);
      b.hits.set(target, (b.hits.get(target) ?? 0) + 1);
    }
  }

  private finalStinger(b: Barrage, f: Fighter): void {
    const reach = STINGER_RANGE + 28;
    const ex = f.x + Math.cos(b.angle) * reach, ey = f.y + Math.sin(b.angle) * reach;
    this.fx(b.owner).thrust(f.x, f.y, ex, ey, true);
    this.avatar(b.owner)?.play('punch', b.angle);
    for (const target of b.finalTargets) {
      if (!target.active || target.hp <= 0) continue;
      if (segmentDistanceSq(target.x, target.y, f.x, f.y, ex, ey) > (STINGER_HALF_WIDTH + 9) ** 2) continue;
      this.hit(b.owner, target, STINGER_FINAL_DAMAGE, b, f.x, f.y);
      this.record(b.owner, 'stings');
      this.applyPoison(b.owner, target);
      this.shoves.push({ target, vx: Math.cos(b.angle) * STINGER_SHOVE_SPEED, vy: Math.sin(b.angle) * STINGER_SHOVE_SPEED, until: this.now + SHOVE_MS });
      this.fx(b.owner).sting(target.x, target.y, b.angle);
      this.api.spawnHitFlash(target.x, target.y, WAX.cream);
      this.announce(target.x, target.y - 44, '🐝 STUNG · POISONED', '#b6e85c');
    }
    Sfx.playAt('spear-hit', f.x, { rate: 1.15, volume: 0.75 });
  }

  private launchDarts(owner: Owner, base: number): void {
    const f = this.fighter(owner);
    const volley: DartVolley = { hits: new Map(), grappled: new Set() };
    for (let i = 0; i < DART_COUNT; i++) {
      const a = base + DART_OFFSETS[i];
      this.darts.push({ owner, kind: 'stinger', x: f.x + Math.cos(a) * 28, y: f.y + Math.sin(a) * 28, vx: Math.cos(a) * DART_SPEED, vy: Math.sin(a) * DART_SPEED, until: this.now + DART_LIFE_MS, volley });
    }
    this.avatar(owner)?.play('punch', base);
    this.fx(owner).droplets(f.x + Math.cos(base) * 26, f.y + Math.sin(base) * 26, 4, 90, WAX.pale, 300);
    Sfx.playAt('spear-throw', f.x, { rate: 1.65, volume: 0.6 });
  }

  private launchGrapple(owner: Owner, target: Fighter): void {
    const f = this.fighter(owner);
    const a = Math.atan2(target.y - f.y, target.x - f.x);
    this.darts.push({ owner, kind: 'grapple', x: f.x + Math.cos(a) * 30, y: f.y + Math.sin(a) * 30, vx: Math.cos(a) * GRAPPLE_SPEED, vy: Math.sin(a) * GRAPPLE_SPEED, until: this.now + GRAPPLE_LIFE_MS, volley: null });
    this.avatar(owner)?.play('dash', a);
    this.announce(f.x, f.y - 48, '🪝 PERFECT VOLLEY', '#ffefad');
    Sfx.playAt('spear-throw', f.x, { rate: 0.82, volume: 0.7 });
  }

  private updateDarts(time: number, dt: number): void {
    for (let i = this.darts.length - 1; i >= 0; i--) {
      const d = this.darts[i];
      if (time >= d.until) { this.darts.splice(i, 1); continue; }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      const r = d.kind === 'grapple' ? GRAPPLE_HIT_R : DART_HIT_R;
      const target = this.targetsOf(d.owner).find((t) => Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) <= r);
      if (target) {
        if (d.kind === 'grapple') {
          this.hit(d.owner, target, GRAPPLE_DAMAGE, d, d.x, d.y);
          this.record(d.owner, 'stings');
          this.pulls.push({ owner: d.owner, target, until: time + GRAPPLE_PULL_MS });
          this.fx(d.owner).sting(target.x, target.y, Math.atan2(d.vy, d.vx));
          this.announce(target.x, target.y - 44, '🪝 GRAPPLED', '#ffefad');
          Sfx.playAt('spear-hit', target.x, { rate: 0.82, volume: 0.75 });
        } else {
          this.hit(d.owner, target, DART_DAMAGE, d, d.x, d.y);
          this.record(d.owner, 'stings');
          const v = d.volley!;
          const n = (v.hits.get(target) ?? 0) + 1;
          v.hits.set(target, n);
          if (n === DART_COUNT && !v.grappled.has(target)) { v.grappled.add(target); this.launchGrapple(d.owner, target); }
        }
        this.api.spawnHitFlash(target.x, target.y, d.kind === 'grapple' ? WAX.soot : WAX.pale);
        this.darts.splice(i, 1);
        continue;
      }
      if (d.x < 0 || d.x > this.api.width || d.y < 0 || d.y > this.api.height) this.darts.splice(i, 1);
    }
  }

  // ── Poison ────────────────────────────────────────────────────────────────

  private applyPoison(owner: Owner, target: Fighter): void {
    const existing = this.poisons.find((p) => p.owner === owner && p.target === target);
    if (existing) {
      existing.until = this.now + POISON_MS;
      existing.tickAt = Math.min(existing.tickAt, this.now + POISON_TICK_MS);
      return;
    }
    this.poisons.push({ owner, target, until: this.now + POISON_MS, tickAt: this.now + POISON_TICK_MS, stacks: 1 });
  }

  private isPoisoned(target: Fighter, time: number): boolean {
    return this.poisons.some((p) => p.target === target && p.until > time);
  }

  private updatePoisons(time: number): void {
    for (let i = this.poisons.length - 1; i >= 0; i--) {
      const p = this.poisons[i];
      if (!p.target.active || p.target.hp <= 0 || time >= p.until) { this.poisons.splice(i, 1); continue; }
      while (time >= p.tickAt && p.tickAt <= p.until) {
        p.tickAt += POISON_TICK_MS;
        p.stacks = Math.min(POISON_MAX_STACKS, p.stacks + 1);
        this.hit(p.owner, p.target, POISON_DAMAGE, p, p.target.x, p.target.y, true);
        this.api.spawnHitFlash(p.target.x, p.target.y, WAX.poison);
      }
    }
  }

  // ── Candles ───────────────────────────────────────────────────────────────

  /** Candle auras covering the owner, plus any banked by a bomb. */
  private candleStacks(owner: Owner): number {
    const f = this.fighter(owner);
    if (!f?.active) return 0;
    const placed = this.candles.filter((c) => c.owner === owner && Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) <= CANDLE_RADIUS).length;
    return placed + this.side(owner).bankedAuras.length;
  }

  private updateCandles(time: number): void {
    for (const c of this.candles) {
      if (!this.up(c.owner, 'r')) continue;
      // Melting Point: a dripping candle leaves hot wax around itself.
      while (time >= c.nextMeltAt && c.nextMeltAt < c.until) {
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(18, 48);
        this.spawnPuddle(c.owner, 'hot', this.clampX(c.x + Math.cos(a) * d), this.clampY(c.y + Math.sin(a) * d));
        c.nextMeltAt += Phaser.Math.Between(3000, 4000);
      }
    }
    for (let i = this.candles.length - 1; i >= 0; i--) {
      const c = this.candles[i];
      if (time < c.until) continue;
      this.fx(c.owner).droplets(c.x, c.y, 5, 60, WAX.pale, 420);
      this.candles.splice(i, 1);
    }
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      s.bankedAuras = s.bankedAuras.filter((u) => u > time);
      s.shields = s.shields.filter((sh) => sh.until > time);
      s.melting = s.melting.filter((u) => u > time);
    }
  }

  private explodeCandle(c: Candle, owner: Owner): void {
    const idx = this.candles.indexOf(c);
    if (idx < 0) return;
    this.candles.splice(idx, 1);
    this.side(owner).bankedAuras.push(this.now + CANDLE_BANK_MS);
    this.fx(owner).candleBurst(c.x, c.y, CANDLE_RADIUS);
    this.fx(owner).droplets(c.x, c.y - 20, 12, 180, WAX.pale, 560);
    this.announce(c.x, c.y - 52, '🕯️ AURA BANKED · 15s', '#ffdf7e');
    Sfx.playAt('explosion-small', c.x, { rate: 1.45, volume: 0.6 });
  }

  // ── Hives ─────────────────────────────────────────────────────────────────

  private updateHives(dt: number): void {
    for (const h of this.hives) {
      if (!this.up(h.owner, 'f') || h.honey >= HONEY_MAX) continue;
      h.honey = Math.min(HONEY_MAX, h.honey + (HONEY_BASE_PER_SEC + h.cells * HONEY_PER_CELL_PER_SEC) * dt);
    }
  }

  private nearestRedeemableHive(owner: Owner): Hive | null {
    const f = this.fighter(owner);
    let best: Hive | null = null;
    let bestD = HIVE_REDEEM_R;
    for (const h of this.hives) {
      if (h.owner !== owner) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, h.x, h.y);
      if (d <= bestD) { best = h; bestD = d; }
    }
    return best;
  }

  private redeemHive(hive: Hive, violent: boolean): void {
    const idx = this.hives.indexOf(hive);
    if (idx < 0) return;
    this.hives.splice(idx, 1);
    const owner = hive.owner;
    // Mastery stat: a full comb harvested, however it was cashed in.
    if (hive.cells >= HIVE_CELLS) this.record(owner, 'fullHives');
    const orbit = Math.max(1, hive.cells) * 5;
    const shield = hive.cells <= 0 ? 0 : hive.cells <= 2 ? 1 : hive.cells <= 4 ? 2 : 3;
    this.spawnOrbitBees(owner, orbit);
    if (shield > 0) this.side(owner).shields.push({ until: this.now + HIVE_BUFF_MS, beesPerHit: shield });
    const honey = this.up(owner, 'f') ? Math.floor(hive.honey) : 0;
    if (honey > 0) {
      this.fighter(owner).heal(honey);
      this.spawnHoneyPuddles(hive, Math.floor(honey / 10));
    }
    if (violent && hive.cells > 0) {
      for (let i = 0; i < 15 * hive.cells; i++) {
        this.spawnFlyingBee(owner, hive.x, hive.y, Math.random() * Math.PI * 2, false, 4000);
      }
    }
    this.fx(owner).hiveRelease(hive.x, hive.y, violent);
    this.avatar(owner)?.play('raise', undefined, 500);
    this.announce(hive.x, hive.y - 56, `🐝 HIVE ×${orbit}${shield ? `  🛡${shield}` : ''}${honey ? `  +${honey}` : ''}`, '#ffd34f', 12, 1300);
    Sfx.playAt(violent ? 'explosion-small' : 'holy-chord', hive.x, { rate: 1.2, volume: 0.7 });
  }

  private spawnHoneyPuddles(hive: Hive, count: number): void {
    const placed = this.puddles.filter((p) => p.kind === 'honey').map((p) => ({ x: p.x, y: p.y }));
    for (let i = 0; i < count; i++) {
      let spot: { x: number; y: number } | null = null;
      for (let attempt = 0; attempt < 32 && !spot; attempt++) {
        const ring = Math.floor(attempt / 8);
        const a = (i / Math.max(1, count)) * Math.PI * 2 + attempt * 2.39996;
        const d = 72 + ring * 72;
        const x = this.clampX(hive.x + Math.cos(a) * d), y = this.clampY(hive.y + Math.sin(a) * d);
        if (placed.every((p) => Phaser.Math.Distance.Between(x, y, p.x, p.y) >= HONEY_PUDDLE_R * 2 + 4)) spot = { x, y };
      }
      if (!spot) continue;
      placed.push(spot);
      this.spawnPuddle(hive.owner, 'honey', spot.x, spot.y);
    }
  }

  // ── Bees ──────────────────────────────────────────────────────────────────

  private latchMs(owner: Owner, elite: boolean): number {
    return (elite ? ELITE_LATCH_MS : BEE_LATCH_MS) + this.candleStacks(owner) * CANDLE_BEE_BONUS_MS;
  }

  private spawnFlyingBee(owner: Owner, x: number, y: number, angle: number, elite: boolean, flightMs: number): void {
    this.bees.push({
      owner, state: 'flying', x, y, vx: Math.cos(angle) * BEE_SPEED, vy: Math.sin(angle) * BEE_SPEED, heading: angle,
      until: this.now + flightMs, latchMs: this.latchMs(owner, elite), target: null, offsetX: 0, offsetY: 0, tickAt: 0,
      orbitIndex: 0, orbitTotal: 1, orbitRadius: 0, seed: Math.random() * 100, elite,
    });
  }

  private spawnOrbitBees(owner: Owner, count: number): void {
    const f = this.fighter(owner);
    for (let i = 0; i < count; i++) {
      this.bees.push({
        owner, state: 'orbit', x: f.x, y: f.y, vx: 0, vy: 0, heading: 0, until: this.now + HIVE_BUFF_MS,
        latchMs: this.latchMs(owner, false), target: null, offsetX: 0, offsetY: 0, tickAt: 0,
        orbitIndex: i, orbitTotal: count, orbitRadius: 46 + (i % 3) * 13, seed: Math.random() * 100, elite: false,
      });
    }
  }

  private attachBee(owner: Owner, target: Fighter, index: number, total: number, elite: boolean): void {
    const a = total <= 1 ? Math.random() * Math.PI * 2 : (index / total) * Math.PI * 2;
    const r = 14 + (index % 3) * 7;
    this.bees.push({
      owner, state: 'attached', x: target.x, y: target.y, vx: 0, vy: 0, heading: a + Math.PI / 2,
      until: this.now + this.latchMs(owner, elite), latchMs: 0, target, offsetX: Math.cos(a) * r, offsetY: Math.sin(a) * r,
      tickAt: this.now + BEE_TICK_MS, orbitIndex: 0, orbitTotal: 1, orbitRadius: 0, seed: Math.random() * 100, elite,
    });
  }

  private latch(bee: Bee, target: Fighter): void {
    const a = Math.random() * Math.PI * 2;
    const r = Phaser.Math.Between(12, 31);
    bee.state = 'attached';
    bee.target = target;
    bee.offsetX = Math.cos(a) * r;
    bee.offsetY = Math.sin(a) * r;
    bee.heading = a + Math.PI / 2;
    bee.until = this.now + bee.latchMs;
    bee.tickAt = this.now + BEE_TICK_MS;
    bee.vx = 0;
    bee.vy = 0;
    if (bee.elite) this.applyPoison(bee.owner, target);
    this.fx(bee.owner).beeLand(target.x + bee.offsetX, target.y + bee.offsetY, bee.elite);
  }

  private updateBees(time: number, dt: number): void {
    for (let i = this.bees.length - 1; i >= 0; i--) {
      const bee = this.bees[i];
      if (time >= bee.until) { this.bees.splice(i, 1); continue; }
      if (bee.state === 'attached') {
        const target = bee.target;
        if (!target?.active || target.hp <= 0) { this.bees.splice(i, 1); continue; }
        bee.x = target.x + bee.offsetX;
        bee.y = target.y + bee.offsetY;
        bee.heading += dt * 0.8;
        while (time >= bee.tickAt && bee.tickAt <= bee.until) {
          bee.tickAt += BEE_TICK_MS;
          const dmg = (bee.elite ? ELITE_DAMAGE : BEE_DAMAGE) + (this.isPoisoned(target, time) ? 1 : 0);
          this.hit(bee.owner, target, dmg, bee, bee.x, bee.y, true);
          this.api.spawnHitFlash(bee.x, bee.y, bee.elite ? WAX.elite : WAX.honeyLit);
        }
        continue;
      }
      if (bee.state === 'orbit') {
        const f = this.fighter(bee.owner);
        if (!f?.active || f.hp <= 0) { this.bees.splice(i, 1); continue; }
        const a = time / 310 + (bee.orbitIndex / Math.max(1, bee.orbitTotal)) * Math.PI * 2;
        bee.x = f.x + Math.cos(a) * bee.orbitRadius;
        bee.y = f.y + Math.sin(a) * bee.orbitRadius * 0.62;
        bee.heading = a + Math.PI / 2;
      } else {
        // A bee is not a bullet: it bends toward whoever is nearest, so a swarm loosed at a
        // moving target curls after them rather than flying past in a neat fan.
        const prey = this.nearestTarget(bee.owner, bee.x, bee.y);
        if (prey && Phaser.Math.Distance.Between(bee.x, bee.y, prey.x, prey.y) <= BEE_SEEK_RANGE) {
          const want = Math.atan2(prey.y - bee.y, prey.x - bee.x);
          const turned = Phaser.Math.Angle.RotateTo(Math.atan2(bee.vy, bee.vx), want, BEE_TURN_RATE * dt);
          bee.vx = Math.cos(turned) * BEE_SPEED;
          bee.vy = Math.sin(turned) * BEE_SPEED;
        }
        bee.x += bee.vx * dt;
        bee.y += bee.vy * dt;
        bee.heading = Math.atan2(bee.vy, bee.vx);
        // A hive of its own with room in it stores the bee instead.
        const hive = this.hives.find((h) => h.owner === bee.owner && h.cells < HIVE_CELLS && Phaser.Math.Distance.Between(bee.x, bee.y, h.x, h.y) <= HIVE_R + 7);
        if (hive) {
          hive.cells++;
          this.bees.splice(i, 1);
          this.fx(bee.owner).combRing(hive.x, hive.y - 36, 16, WAX.honeyLit, 260);
          Sfx.playAt('pickup', hive.x, { rate: 1.2 + hive.cells * 0.06, volume: 0.4 });
          continue;
        }
      }
      const target = this.targetsOf(bee.owner).find((t) => Phaser.Math.Distance.Between(bee.x, bee.y, t.x, t.y) <= BEE_HIT_R);
      if (target) { this.latch(bee, target); continue; }
      if (bee.state === 'flying' && (bee.x < -20 || bee.x > this.api.width + 20 || bee.y < -20 || bee.y > this.api.height + 20)) this.bees.splice(i, 1);
    }
  }

  // ── Puddles ───────────────────────────────────────────────────────────────

  private spawnPuddle(owner: Owner, kind: 'hot' | 'honey', x: number, y: number): void {
    this.puddles.push({ owner, kind, x, y, r: kind === 'hot' ? HOT_WAX_R : HONEY_PUDDLE_R, until: this.now + (kind === 'hot' ? HOT_WAX_MS : HONEY_PUDDLE_MS), tickAt: this.now + 1000, seed: Math.random() * 100 });
  }

  private updatePuddles(time: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (time >= p.until) { this.puddles.splice(i, 1); continue; }
      while (time >= p.tickAt && p.tickAt <= p.until) {
        p.tickAt += p.kind === 'hot' ? HOT_WAX_TICK_MS : 1000;
        if (p.kind === 'honey') {
          const f = this.fighter(p.owner);
          if (f.active && f.hp > 0 && Phaser.Math.Distance.Between(f.x, f.y, p.x, p.y) <= p.r) f.heal(HONEY_HEAL_PER_TICK);
        } else {
          for (const t of this.targetsOf(p.owner)) {
            if (Phaser.Math.Distance.Between(t.x, t.y, p.x, p.y) > p.r) continue;
            this.hit(p.owner, t, HOT_WAX_DAMAGE, p, p.x, p.y, true);
            this.api.spawnHitFlash(t.x, t.y, WAX.flame);
          }
        }
      }
    }
  }

  // ── Bombs ─────────────────────────────────────────────────────────────────

  private bombsOf(owner: Owner): Bomb[] { return this.bombs.filter((b) => b.owner === owner); }
  private attachedBombs(owner: Owner): Bomb[] { return this.bombs.filter((b) => b.owner === owner && b.state === 'attached'); }
  private selfBombs(owner: Owner): Bomb[] { return this.bombs.filter((b) => b.owner === owner && b.state === 'self'); }

  private updateBombs(time: number, dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      if (time >= b.until) {
        if (b.state === 'flying') this.fx(b.owner).droplets(b.x, b.y, 4, 60, WAX.honey, 300);
        this.bombs.splice(i, 1);
        continue;
      }
      if (b.state === 'self') {
        const f = this.fighter(b.owner);
        if (!f.active || f.hp <= 0) { this.bombs.splice(i, 1); continue; }
        const a = time / 280 + (b.index / BOMB_COUNT) * Math.PI * 2;
        b.x = f.x + Math.cos(a) * (27 + (b.index % 2) * 9);
        b.y = f.y + Math.sin(a) * (19 + (b.index % 2) * 7);
        continue;
      }
      if (b.state === 'attached') {
        const target = b.target;
        if (!target?.active || target.hp <= 0) { this.bombs.splice(i, 1); continue; }
        b.x = target.x + b.offsetX;
        b.y = target.y + b.offsetY;
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Your own candle or hive is a target too — and a better one than the enemy.
      const candle = this.candles.find((c) => c.owner === b.owner && Phaser.Math.Distance.Between(b.x, b.y, c.x, c.y) <= 24);
      if (candle) { this.explodeCandle(candle, b.owner); this.bombs.splice(i, 1); continue; }
      const hive = this.hives.find((h) => h.owner === b.owner && Phaser.Math.Distance.Between(b.x, b.y, h.x, h.y) <= HIVE_R + 8);
      if (hive) { this.redeemHive(hive, true); this.bombs.splice(i, 1); continue; }
      const target = this.targetsOf(b.owner).find((t) => Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) <= BOMB_HIT_R);
      if (target) {
        const a = Math.random() * Math.PI * 2;
        const r = Phaser.Math.Between(12, 30);
        b.state = 'attached';
        b.target = target;
        b.offsetX = Math.cos(a) * r;
        b.offsetY = Math.sin(a) * r;
        b.until = time + BOMB_STICK_MS;
        b.vx = 0;
        b.vy = 0;
        this.fx(b.owner).droplets(target.x, target.y, 3, 70, WAX.honey, 260);
        this.api.spawnHitFlash(target.x, target.y, WAX.wax);
        continue;
      }
      if (b.x < -20 || b.x > this.api.width + 20 || b.y < -20 || b.y > this.api.height + 20) this.bombs.splice(i, 1);
    }
  }

  private strapBombs(owner: Owner): void {
    if (this.bombsOf(owner).length > 0) return;
    const f = this.fighter(owner);
    for (let i = 0; i < BOMB_COUNT; i++) {
      this.bombs.push({
        owner, state: 'self', x: f.x, y: f.y, vx: 0, vy: 0, until: this.now + BOMB_STICK_MS, target: f, offsetX: 0, offsetY: 0,
        seed: Math.random() * 100, index: i, armedAt: this.now + SELF_BOMB_ARM_MS, launchedAt: this.now,
      });
    }
    this.avatar(owner)?.play('flex');
    this.fx(owner).combRing(f.x, f.y, 70, WAX.honeyLit, 480);
    this.announce(f.x, f.y - 54, '🐝 RULE BEETANICA', '#ffdf7e', 13, 1300);
    Sfx.playAt('grenade-launch', f.x, { rate: 0.75, volume: 0.75 });
  }

  private detonateAttached(owner: Owner): void {
    const grouped = new Map<Fighter, Bomb[]>();
    for (const b of this.attachedBombs(owner)) {
      if (!b.target) continue;
      grouped.set(b.target, [...(grouped.get(b.target) ?? []), b]);
    }
    // The bombs come off before they go off: the +10% they opened the target by is for the
    // *rest* of the fight, not a second multiplier on their own blast.
    this.bombs = this.bombs.filter((b) => b.owner !== owner || b.state !== 'attached');
    this.updateMultipliers(this.now);
    for (const [target, bombs] of grouped) {
      const damage = Math.round(BOMB_DAMAGE * bombs.length * (1 + BOMB_PER_STACK * bombs.length));
      this.hit(owner, target, damage, bombs[0], target.x, target.y);
      this.fx(owner).bombBlast(target.x, target.y, 48 + bombs.length * 6, bombs.length);
      this.api.spawnHitFlash(target.x, target.y, WAX.cream);
      this.announce(target.x, target.y - 54, `💥 ×${bombs.length}`, '#ffdf7e', 12);
    }
    if (grouped.size > 0) {
      this.avatar(owner)?.play('raise', undefined, 400);
      this.api.scene.cameras.main.shake(120 + grouped.size * 40, 0.004);
      Sfx.playAt('explosion-large', this.fighter(owner).x, { rate: 1.25, volume: 0.75 });
    }
  }

  private detonateSelf(owner: Owner): void {
    const count = this.selfBombs(owner).length;
    if (count <= 0) return;
    const f = this.fighter(owner);
    const damage = Math.round(BOMB_DAMAGE * count * (1 + BOMB_PER_STACK * count));
    this.bombs = this.bombs.filter((b) => b.owner !== owner || b.state !== 'self');
    // The strapped bombs' own +25% must not inflate the one-third share below.
    this.updateMultipliers(this.now);
    let caught = 0;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= SELF_BOMB_RADIUS) { this.hit(owner, t, damage, f, f.x, f.y); caught++; }
    }
    // Mastery stat: one per payload that actually caught someone.
    if (caught > 0) this.record(owner, 'selfBombBlasts');
    for (const c of [...this.candles]) {
      if (c.owner === owner && Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) <= SELF_BOMB_RADIUS) this.explodeCandle(c, owner);
    }
    for (const h of [...this.hives]) {
      if (h.owner === owner && Phaser.Math.Distance.Between(f.x, f.y, h.x, h.y) <= SELF_BOMB_RADIUS) this.redeemHive(h, true);
    }
    // A remote replica never reports this as fresh damage: the owning sim already paid it.
    if (owner === 'player' || this.api.npcAutonomous) {
      Fighter.asNonAllyDamage(() => f.takeDamage(Math.round(damage * SELF_BOMB_SHARE), { source: this, sourceX: f.x, sourceY: f.y, selfInflicted: true }));
    }
    this.fx(owner).bombBlast(f.x, f.y, SELF_BOMB_RADIUS * 0.7, count);
    this.avatar(owner)?.play('raise', undefined, 500);
    this.api.scene.cameras.main.shake(320, 0.012);
    this.announce(f.x, f.y - 62, `💥 ${damage}  ·  SELF ${Math.round(damage * SELF_BOMB_SHARE)}`, '#ffdf7e', 13, 1300);
    Sfx.playAt('explosion-large', f.x, { rate: 0.82, volume: 0.9 });
  }

  // ── Shoves and pulls (played out as position — both movement systems rewrite velocity) ──

  private updateShoves(time: number, dt: number): void {
    for (let i = this.shoves.length - 1; i >= 0; i--) {
      const s = this.shoves[i];
      if (time >= s.until || !s.target.active) { this.shoves.splice(i, 1); continue; }
      if (s.target.knockbackImmune) continue;
      s.target.setPosition(this.clampX(s.target.x + s.vx * dt), this.clampY(s.target.y + s.vy * dt));
      const drag = Math.pow(0.05, dt / (SHOVE_MS / 1000));
      s.vx *= drag;
      s.vy *= drag;
    }
  }

  private updatePulls(time: number, dt: number): void {
    for (let i = this.pulls.length - 1; i >= 0; i--) {
      const p = this.pulls[i];
      const caster = this.fighter(p.owner);
      if (time >= p.until || !caster.active || !p.target.active || p.target.hp <= 0) { this.pulls.splice(i, 1); continue; }
      const d = Phaser.Math.Distance.Between(p.target.x, p.target.y, caster.x, caster.y);
      if (d <= GRAPPLE_PULL_RANGE) { this.pulls.splice(i, 1); continue; }
      if (p.target.knockbackImmune) continue;
      const a = Math.atan2(caster.y - p.target.y, caster.x - p.target.x);
      const step = Math.min(GRAPPLE_PULL_SPEED * dt, d - GRAPPLE_PULL_RANGE);
      p.target.setPosition(this.clampX(p.target.x + Math.cos(a) * step), this.clampY(p.target.y + Math.sin(a) * step));
    }
  }

  // ── The bot's hands ───────────────────────────────────────────────────────

  /**
   * The presses a bot has no key for: the second Q (detonation) and the F beside a hive
   * (redemption), both of which bypass the cooldown for a player. Same kit-side cast path
   * Magma's saw and Depths' kraken use. Everything *decided* stays in `doWaxAbilities`.
   */
  private updateBotHands(time: number): void {
    if (!this.api.npcAutonomous || this.api.npcElementId !== 'wax') return;
    const npc = this.api.npc;
    if (!npc.active || npc.hp <= 0) return;
    const s = this.side('npc');
    const flying = this.bombs.some((b) => b.owner === 'npc' && b.state === 'flying');
    const attached = this.attachedBombs('npc').length;
    // Detonate once the cone has resolved, or at once when three have stuck.
    if (attached > 0 && (attached >= 3 || (!flying && time - s.lastBombLaunchAt > 1200))) this.detonateAttached('npc');
    const strapped = this.selfBombs('npc');
    if (strapped.length > 0 && time >= strapped[0].armedAt) {
      const target = this.nearestTarget('npc', npc.x, npc.y);
      if (target && Phaser.Math.Distance.Between(npc.x, npc.y, target.x, target.y) <= SELF_BOMB_RADIUS * 0.8) this.detonateSelf('npc');
    }
    // Redeem a hive it has walked back to once it is worth cashing in.
    const hive = this.nearestRedeemableHive('npc');
    if (hive && (hive.cells >= 3 || (this.up('npc', 'f') && hive.honey >= 20))) this.redeemHive(hive, false);
  }

  // ── Multipliers, HUD ─────────────────────────────────────────────────────

  private updateMultipliers(time: number): void {
    const fighters = new Set<Fighter>([this.api.player, this.api.npc, ...this.api.enemies]);
    for (const f of fighters) {
      if (!f) continue;
      let vuln = 0;
      vuln += this.bees.filter((b) => b.state === 'attached' && b.target === f && b.until > time).length * 0.01;
      if (this.bombs.some((b) => b.state === 'attached' && b.target === f)) vuln += BOMB_VULN;
      vuln += this.poisons.filter((p) => p.target === f && p.until > time).reduce((sum, p) => sum + p.stacks * 0.01, 0);
      let resist = 1;
      const owner: Owner | null = f === this.api.player ? 'player' : f === this.api.npc ? 'npc' : null;
      if (owner && this.isWax(owner)) {
        const s = this.side(owner);
        const candle = Math.min(CANDLE_RESIST_CAP, CANDLE_RESIST * this.candleStacks(owner));
        const melting = s.melting.filter((u) => u > time).length * MELTING_PER_HIT;
        resist = Math.max(0.3, 1 - candle - melting);
        if (this.selfBombs(owner).length > 0) vuln += SELF_BOMB_VULN;
      }
      f.waxIncomingMult = resist * (1 + vuln);
    }
  }

  private updateHud(time: number): void {
    if (this.api.elementId !== 'wax') { this.clearHud(); return; }
    const s = this.side('player');
    const candles = this.candleStacks('player');
    const resist = Math.round(Math.min(CANDLE_RESIST_CAP, CANDLE_RESIST * candles) * 100);
    this.api.setStatusIndicator('wax-candles', candles > 0 ? {
      name: 'Candlelight', emoji: '🕯️', color: WAX.wax, count: candles, priority: 112,
      description: `${resist}% less damage taken; bees you loose latch ${candles * 2}s longer.`,
    } : null);
    const shields = s.shields.filter((sh) => sh.until > time);
    const bees = shields.reduce((sum, sh) => sum + sh.beesPerHit, 0);
    this.api.setStatusIndicator('wax-shield', bees > 0 ? {
      name: 'Bee Shield', emoji: '🐝', color: WAX.honey, count: bees, priority: 113, until: Math.max(...shields.map((sh) => sh.until)),
      description: `Every hit you take sends ${bees} ${bees === 1 ? 'bee' : 'bees'} at the nearest enemy.`,
    } : null);
    const melting = s.melting.filter((u) => u > time);
    this.api.setStatusIndicator('wax-melting-point', melting.length > 0 ? {
      name: 'Melting Point', emoji: '♨️', color: WAX.flame, count: melting.length, priority: 114, until: Math.max(...melting),
      description: `${melting.length * 2}% extra damage resistance, set by the hits you have taken in the light.`,
    } : null);
    const strapped = this.selfBombs('player').length;
    const charge = s.qHolding && !s.qHoldFired ? Phaser.Math.Clamp((time - s.qHoldStart) / BOMB_HOLD_MS, 0, 1) : 0;
    this.api.setStatusIndicator('wax-beetanica', strapped > 0 ? {
      name: 'Rule Beetanica', emoji: '💣', color: WAX.pale, count: strapped, priority: 115,
      description: `${strapped} bombs strapped on: +25% damage taken until you tap Q and go off.`,
    } : charge > 0 ? {
      name: 'Strapping Bombs', emoji: '⏳', color: WAX.wax, count: Math.max(1, Math.ceil(charge * 10)), priority: 115,
      description: `Hold Q — ${Math.round(charge * 100)}%`,
    } : null);
    // ── The mastery ──
    const p = this.api.player;
    const shellOn = this.masteryOn('player');
    this.api.setStatusIndicator('wax-honey-shell', shellOn && p.waxHoneyShell ? {
      name: 'Honey Shell', emoji: '🍯', color: WAX.honey, count: 1, priority: 116,
      description: 'The next hit of 30 or more breaks on the shell instead of you.',
    } : shellOn && s.shellReadyAt > time ? {
      name: 'Shell Re-forming', emoji: '🍯', color: WAX.deep, count: 1, priority: 116, until: s.shellReadyAt,
      description: 'The Honey Shell sets again when the timer runs out.',
    } : null);
    this.api.setStatusIndicator('wax-smoke', s.hidden ? {
      name: 'Smoke-out', emoji: '🌫️', color: WAX.smoke, count: 1, priority: 117,
      description: `Hidden in your own smoke: enemies cannot see you, and ${Math.round(SMOKE_DODGE * 100)}% of hits are lost in it.`,
    } : null);
  }

  private clearHud(): void {
    for (const id of ['wax-candles', 'wax-shield', 'wax-melting-point', 'wax-beetanica', 'wax-honey-shell', 'wax-smoke']) this.api.setStatusIndicator(id, null);
  }

  // ── Painting ──────────────────────────────────────────────────────────────

  private ensureLayers(): void {
    if (!this.groundGfx?.active) this.groundGfx = this.api.scene.add.graphics().setDepth(3);
    if (!this.objectGfx?.active) this.objectGfx = this.api.scene.add.graphics().setDepth(4.5);
    if (!this.airGfx?.active) this.airGfx = this.api.scene.add.graphics().setDepth(15);
    // Smoke sits over the bees and bodies, so what is in an enemy's cloud is actually covered.
    if (!this.smokeGfx?.active) this.smokeGfx = this.api.scene.add.graphics().setDepth(15.5);
  }

  private paint(time: number): void {
    const ground = this.groundGfx!, obj = this.objectGfx!, air = this.airGfx!;
    ground.clear(); obj.clear(); air.clear();
    const t = this.t;

    for (const p of this.puddles) {
      const life = Phaser.Math.Clamp((p.until - time) / 900, 0, 1);
      drawPuddle(ground, this.tint(p.owner), p.x, p.y, p.r, p.kind, t + p.seed, Math.min(1, life + 0.15), p.seed);
    }
    for (const c of this.candles) {
      const life = Phaser.Math.Clamp((c.until - time) / CANDLE_MS, 0, 1);
      drawCandleAura(ground, this.tint(c.owner), c.x, c.y, CANDLE_RADIUS, t + c.seed, 1);
      drawCandle(obj, this.tint(c.owner), c.x, c.y, life, t, c.seed, true);
    }
    for (const h of this.hives) {
      drawHive(obj, this.tint(h.owner), h.x, h.y, h.cells, HIVE_CELLS, this.up(h.owner, 'f') ? h.honey / HONEY_MAX : null, t, h.seed);
    }
    // Bee shields and banked auras ride the fighter, so they are drawn as a halo on the body.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isWax(owner)) continue;
      const f = this.fighter(owner);
      if (!f.active) continue;
      const tint = this.tint(owner);
      const s = this.side(owner);
      if (s.bankedAuras.some((u) => u > time)) drawCandleAura(ground, tint, f.x, f.y, CANDLE_RADIUS * 0.8, t + 3, 0.8);
      const bees = s.shields.filter((sh) => sh.until > time).reduce((sum, sh) => sum + sh.beesPerHit, 0);
      if (bees > 0) {
        // A lattice of comb outlines hanging round the fighter — the swarm's guard.
        const sr = 30 + Math.sin(t * 3) * 2;
        air.lineStyle(1.2, tint(WAX.honeyLit), 0.35 + Math.sin(t * 4) * 0.12);
        for (let i = 0; i < 14; i++) {
          const a = -t * 0.5 + (i / 14) * Math.PI * 2;
          strokeComb(air, f.x + Math.cos(a) * sr, f.y + Math.sin(a) * sr, 4.2, a);
        }
        for (let i = 0; i < bees * 2; i++) {
          const a = t * 2.2 + (i / (bees * 2)) * Math.PI * 2;
          drawBee(air, tint, f.x + Math.cos(a) * 32, f.y + Math.sin(a) * 30, a + Math.PI / 2, t, i, false, 0.9, 0.6);
        }
      }
      const melting = s.melting.filter((u) => u > time).length;
      for (let i = 0; i < melting; i++) {
        const a = (i / Math.max(1, melting)) * Math.PI * 2 + t * 0.4;
        air.fillStyle(tint(WAX.flame), 0.75);
        combCell(air, f.x + Math.cos(a) * 24, f.y + 6 + Math.sin(a) * 10, 2.8, a);
      }
    }
    for (const d of this.darts) {
      const a = Math.atan2(d.vy, d.vx);
      if (d.kind === 'grapple') { const f = this.fighter(d.owner); drawGrapple(air, this.tint(d.owner), f.x, f.y, d.x, d.y, a, t); }
      else drawDart(air, this.tint(d.owner), d.x, d.y, a);
    }
    for (const b of this.bees) drawBee(air, this.tint(b.owner), b.x, b.y, b.heading, t, b.seed, b.elite);
    for (const b of this.bombs) drawStickyBomb(air, this.tint(b.owner), b.x, b.y, t, b.seed, b.state !== 'flying');
    for (const p of this.poisons) {
      if (p.target.active) drawPoisonTell(air, this.tint(p.owner), p.target.x, p.target.y, t, p.stacks);
    }
    this.paintMastery(time, air);
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!s.qHolding || s.qHoldFired || !this.isWax(owner)) continue;
      const f = this.fighter(owner);
      const ratio = Phaser.Math.Clamp((time - s.qHoldStart) / BOMB_HOLD_MS, 0, 1);
      drawStrapGauge(air, this.tint(owner), f.x, f.y, ratio, t);
    }
  }

  // ── Mastery ───────────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking, and they are Wax. */
  private masteryOn(owner: Owner): boolean {
    return this.isWax(owner) && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** An online opponent (or co-op ally) in the npc slot: its body is played on the other machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && !this.api.npcAutonomous;
  }

  /** Which slot Smoke-out was dropped on, or null. */
  private smokeSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const sl of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(sl) : this.api.npcMasteryBindFor(sl);
      if (bind === SMOKE_ID) return sl;
    }
    return null;
  }

  private slotKey(slot: 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'r' ? this.api.rKey : slot === 'f' ? this.api.fKey : this.api.qKey;
  }

  /**
   * Mastery progress. Only ever the player's — the grind is the human's, not the bot's — and not
   * gated on the mastery being on, since earning it is the point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player' && this.isWax('player')) this.api.recordMasteryStat(key, amount);
  }

  /** The bound key is held, not tapped: the press lights the smoker, letting go puts it out. */
  private handleSmokeKey(key: Phaser.Input.Keyboard.Key): void {
    const s = this.side('player');
    if (key.isDown) {
      if (!s.smoking && Phaser.Input.Keyboard.JustDown(key) && s.fuel >= SMOKE_FUEL_MIN) this.startSmoke('player');
    } else if (s.smoking) {
      this.stopSmoke('player');
    }
  }

  private startSmoke(owner: Owner, ahead = SMOKE_AHEAD, tx?: number, ty?: number): void {
    const s = this.side(owner);
    s.smoking = true;
    s.smokeAhead = ahead;
    this.spawnCloud(owner, tx, ty);
  }

  private stopSmoke(owner: Owner): void {
    const s = this.side(owner);
    if (!s.smoking) return;
    s.smoking = false;
    s.feeding = null;
    if (owner === 'player') this.api.broadcastSpecialCast(SMOKE_END_ID);
  }

  /** A fresh cloud ahead of the smoker. The owner decides when; a replica only ever hears about it. */
  private spawnCloud(owner: Owner, tx?: number, ty?: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const a = tx !== undefined && ty !== undefined ? Math.atan2(ty - f.y, tx - f.x) : this.aimOf(owner);
    const cloud: Cloud = {
      owner, x: this.clampX(f.x + Math.cos(a) * s.smokeAhead), y: this.clampY(f.y + Math.sin(a) * s.smokeAhead),
      r: SMOKE_START_R, fedAt: this.now, seed: Math.random() * 100,
    };
    this.clouds.push(cloud);
    const mine = this.clouds.filter((c) => c.owner === owner);
    if (mine.length > SMOKE_MAX_CLOUDS) this.clouds.splice(this.clouds.indexOf(mine[0]), 1);
    s.feeding = cloud;
    this.avatar(owner)?.play('sweep', a);
    if (owner === 'player') this.api.broadcastSpecialCast(SMOKE_ID);
    Sfx.playAt('whoosh', f.x, { rate: 0.7, volume: 0.45 });
  }

  /** Inside one of its own clouds. Hiding is for Wax only: a cloud outlives an element swap. */
  private inOwnSmoke(owner: Owner): boolean {
    const f = this.fighter(owner);
    if (!this.isWax(owner) || !f?.active || f.hp <= 0) return false;
    return this.clouds.some((c) => c.owner === owner && Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) <= c.r * SMOKE_HIDE_FRAC);
  }

  /** A hidden body is see-through on its owner's screen, and simply gone on everyone else's. */
  private applyHidden(owner: Owner, hidden: boolean): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    // An online replica's visibility is the wire's (OnlineKit applies `inv`).
    if (!f || (owner === 'npc' && f.netGhost)) { s.hidden = hidden; return; }
    if (hidden) {
      if (owner === 'player') {
        f.setAlpha(0.4);
      } else {
        f.forceInvisible = true;
        f.setAlpha(0);
        f.setHealthBarVisible(false);
      }
    } else if (s.hidden && f.active) {
      if (owner === 'npc') { f.forceInvisible = false; f.setHealthBarVisible(true); }
      f.setAlpha(1);
    }
    s.hidden = hidden;
  }

  private updateMastery(time: number, dt: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (!f) continue;
      const alive = f.active && f.hp > 0;
      const on = this.masteryOn(owner) && alive;
      const replica = this.isReplica(owner);

      // ── Smoke-out ──
      if (s.smoking && (!on || (!replica && s.fuel <= 0))) this.stopSmoke(owner);
      if (s.smoking) {
        if (!replica) s.fuel = Math.max(0, s.fuel - dt);
        let c = s.feeding;
        if (c && !this.clouds.includes(c)) c = s.feeding = null;
        // Walked off: the smoke starts a new cloud rather than stretching the old one after you.
        if (!replica && (!c || Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) > c.r + SMOKE_LEASH)) {
          this.spawnCloud(owner);
          c = s.feeding;
        }
        if (c) {
          c.r = Math.min(SMOKE_MAX_R, c.r + SMOKE_GROW_PER_SEC * dt);
          c.fedAt = time;
        }
      } else if (!replica) {
        s.fuel = Math.min(SMOKE_FUEL_MAX, s.fuel + SMOKE_FUEL_REGEN * dt);
      }

      const hidden = this.inOwnSmoke(owner);
      if (hidden || s.hidden) this.applyHidden(owner, hidden);
      if (!replica) f.waxSmokeDodge = hidden ? SMOKE_DODGE : 0;
      if (f.waxSmokeDodges > s.dodgesSeen) {
        this.fx(owner).smokeDodge(f.x, f.y);
        if (owner === 'player') this.announce(f.x, f.y - 44, '🌫️ LOST IN THE SMOKE', '#d8cfbd');
      }
      s.dodgesSeen = f.waxSmokeDodges;

      // ── Honey Shell ──
      if (replica) {
        // The owner's sim does the blocking; this one only paints what it was told.
        if (!s.shellSeeded && on) { s.shellSeeded = true; s.shellUp = true; }
      } else if (!on) {
        f.waxHoneyShell = false;
      } else {
        if (!s.shellSeeded) {
          s.shellSeeded = true;
          s.shellPopsSeen = f.waxHoneyShellPops;
          f.waxHoneyShell = true;
        }
        if (f.waxHoneyShellPops > s.shellPopsSeen) {
          s.shellPopsSeen = f.waxHoneyShellPops;
          s.shellReadyAt = time + SHELL_REGROW_MS;
          this.fx(owner).shellCrack(f.x, f.y);
          this.announce(f.x, f.y - 50, '🍯 HONEY SHELL', '#ffbf3c', 12);
          Sfx.playAt('shield-break', f.x, { rate: 1.3, volume: 0.6 });
          if (owner === 'player') this.api.broadcastSpecialCast(SHELL_POP_ID);
        }
        if (!f.waxHoneyShell && time >= s.shellReadyAt) {
          f.waxHoneyShell = true;
          this.fx(owner).shellForm(f.x, f.y);
          Sfx.playAt('pickup', f.x, { rate: 0.8, volume: 0.45 });
          if (owner === 'player') this.api.broadcastSpecialCast(SHELL_UP_ID);
        }
      }
    }

    for (let i = this.clouds.length - 1; i >= 0; i--) {
      if (time >= this.clouds[i].fedAt + SMOKE_LINGER_MS) this.clouds.splice(i, 1);
    }

    // Mastery stat: time stood in a planted candle's light (a banked aura is not a candle).
    if (this.isWax('player')) {
      const p = this.api.player;
      const s = this.side('player');
      if (p.active && p.hp > 0 && this.candles.some((c) => c.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) <= CANDLE_RADIUS)) {
        s.candleMs += dt * 1000;
        if (s.candleMs >= 1000) {
          const whole = Math.floor(s.candleMs / 1000);
          s.candleMs -= whole * 1000;
          this.record('player', 'candleSeconds', whole);
        }
      }
    }

    this.updateNpcSmoke(time);
  }

  /**
   * The bot's hand on the smoker. Two reasons to light it, both synergies: wearing Rule Beetanica
   * it walks the payload in under cover (the cloud goes ahead, toward the target, and the chase
   * carries it in); losing, it smokes its own feet and stands in it. Driven here, not from
   * `NpcOpponent` — the rotation only has to leave the key alone, and the seek walks it back in.
   */
  private updateNpcSmoke(time: number): void {
    if (!this.api.npcAutonomous || !this.smokeSlot('npc')) return;
    const n = this.api.npc;
    const s = this.side('npc');
    if (!n.active || n.hp <= 0) return;
    if (s.smoking) {
      if (time >= s.npcSmokeUntil) this.stopSmoke('npc');
      return;
    }
    if (s.fuel < 2.5) return;
    const t = this.nearestTarget('npc', n.x, n.y);
    if (!t) return;
    const d = Phaser.Math.Distance.Between(n.x, n.y, t.x, t.y);
    const strapped = this.selfBombs('npc').length > 0;
    if (strapped && d > SELF_BOMB_RADIUS * 0.8) {
      this.startSmoke('npc', SMOKE_AHEAD);
      s.npcSmokeUntil = time + Phaser.Math.Between(2000, 3000);
    } else if (n.hp < n.maxHp * NPC_SMOKE_HP && !this.inOwnSmoke('npc') && d < 380) {
      this.startSmoke('npc', 18);
      s.npcSmokeUntil = time + Phaser.Math.Between(1800, 2800);
    }
  }

  /** Online: the peer's smoker, and their shell, as their own sim decided them. */
  replayNet(id: string, tx: number, ty: number): void {
    const s = this.side('npc');
    if (id === SMOKE_ID) {
      s.smoking = true;
      s.smokeAhead = SMOKE_AHEAD;
      this.spawnCloud('npc', tx, ty);
    } else if (id === SMOKE_END_ID) {
      s.smoking = false;
      s.feeding = null;
    } else if (id === SHELL_POP_ID) {
      s.shellSeeded = true;
      s.shellUp = false;
      s.shellReadyAt = this.now + SHELL_REGROW_MS;
      this.fx('npc').shellCrack(this.api.npc.x, this.api.npc.y);
    } else if (id === SHELL_UP_ID) {
      s.shellSeeded = true;
      s.shellUp = true;
      this.fx('npc').shellForm(this.api.npc.x, this.api.npc.y);
    }
  }

  private paintMastery(time: number, air: Phaser.GameObjects.Graphics): void {
    const sg = this.smokeGfx!;
    sg.clear();
    const t = this.t;
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isWax(owner)) continue;
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (!f.active || f.hp <= 0) continue;
      // The shell is not drawn on a body that is hiding — it would give the body away.
      const shown = owner === 'player' || !s.hidden;
      if (this.masteryOn(owner) && shown) {
        const up = this.isReplica(owner) ? s.shellUp : f.waxHoneyShell;
        const regrow = up ? 1 : Phaser.Math.Clamp(1 - (s.shellReadyAt - time) / SHELL_REGROW_MS, 0, 0.999);
        drawHoneyShell(air, this.tint(owner), f.x, f.y, t, owner === 'player' && s.hidden ? 0.5 : 1, regrow);
      }
      if (s.smoking && s.feeding) {
        const a = Math.atan2(s.feeding.y - f.y, s.feeding.x - f.x);
        drawSmokerStream(sg, this.tint(owner), f.x + Math.cos(a) * 18, f.y + Math.sin(a) * 18, s.feeding.x, s.feeding.y, t, owner === 'player' ? 0.5 : 1);
      }
    }
    for (const c of this.clouds) {
      const life = Phaser.Math.Clamp((c.fedAt + SMOKE_LINGER_MS - time) / SMOKE_FADE_MS, 0, 1);
      // The local screen's own clouds are see-through; everyone else's are a wall.
      drawSmokeCloud(sg, this.tint(c.owner), c.x, c.y, c.r * (0.9 + 0.1 * life), t + c.seed, c.seed, life, c.owner === 'player');
    }
  }

  // ── Cross-cutting contracts ──────────────────────────────────────────────

  purgeSummons(x: number, y: number, radius: number, exceptOwner: Owner, report?: (px: number, py: number) => void): number {
    let razed = 0;
    for (let i = this.candles.length - 1; i >= 0; i--) {
      const c = this.candles[i];
      if (c.owner === exceptOwner || Phaser.Math.Distance.Between(x, y, c.x, c.y) > radius) continue;
      this.fx(c.owner).droplets(c.x, c.y, 8, 120, WAX.pale, 420);
      this.candles.splice(i, 1);
      report?.(c.x, c.y);
      razed++;
    }
    for (let i = this.hives.length - 1; i >= 0; i--) {
      const h = this.hives[i];
      if (h.owner === exceptOwner || Phaser.Math.Distance.Between(x, y, h.x, h.y) > radius) continue;
      this.fx(h.owner).droplets(h.x, h.y, 10, 140, WAX.honey, 480);
      this.hives.splice(i, 1);
      report?.(h.x, h.y);
      razed++;
    }
    return razed;
  }

  // ── Reads for the bot ────────────────────────────────────────────────────

  candleCount(owner: Owner): number { return this.candles.filter((c) => c.owner === owner).length; }
  hiveCount(owner: Owner): number { return this.hives.filter((h) => h.owner === owner).length; }
  inCandle(owner: Owner): boolean { return this.candleStacks(owner) > 0; }
  bombsOut(owner: Owner): number { return this.bombsOf(owner).length; }
  hasStrappedBombs(owner: Owner): boolean { return this.selfBombs(owner).length > 0; }
  targetPoisoned(owner: Owner): boolean {
    const f = this.fighter(owner);
    const t = this.nearestTarget(owner, f.x, f.y);
    return !!t && this.isPoisoned(t, this.now);
  }
  /** An own candle whose light the owner is not standing in — somewhere to go. */
  candlePoint(owner: Owner): { x: number; y: number } | null {
    if (this.inCandle(owner)) return null;
    const f = this.fighter(owner);
    const mine = this.candles.filter((c) => c.owner === owner).sort((a, b) => Phaser.Math.Distance.Squared(f.x, f.y, a.x, a.y) - Phaser.Math.Distance.Squared(f.x, f.y, b.x, b.y));
    return mine[0] ? { x: mine[0].x, y: mine[0].y } : null;
  }
  /** An own hive with room in it, close enough that a Swarm fired at it will fill cells. */
  hiveFeedPoint(owner: Owner): { x: number; y: number } | null {
    const f = this.fighter(owner);
    const h = this.hives.find((hv) => hv.owner === owner && hv.cells < HIVE_CELLS && Phaser.Math.Distance.Between(f.x, f.y, hv.x, hv.y) <= 340);
    return h ? { x: h.x, y: h.y } : null;
  }
  /** An own hive still filling sits in the lane to the target — a bomb lobbed now would cash it in early. */
  bombLaneBlocked(owner: Owner): boolean {
    const f = this.fighter(owner);
    const t = this.nearestTarget(owner, f.x, f.y);
    if (!t) return false;
    return this.hives.some((h) => h.owner === owner && h.cells < HIVE_CELLS
      && segmentDistanceSq(h.x, h.y, f.x, f.y, t.x, t.y) <= (HIVE_R + 30) ** 2);
  }
  /** Mastery — Smoke-out: `owner` is standing in its own smoke, where no enemy can see it. */
  isSmokeHidden(owner: Owner): boolean { return this.inOwnSmoke(owner); }
  /**
   * Mastery — Smoke-out: `viewer` cannot see `owner` — it is in its smoke, or a cloud of its sits
   * on the sight line (and the viewer is not standing in that cloud itself).
   */
  hidesFrom(owner: Owner, viewer: Fighter | null): boolean {
    if (this.inOwnSmoke(owner)) return true;
    const f = this.fighter(owner);
    if (!viewer || !this.isWax(owner) || !f?.active) return false;
    return this.clouds.some((c) => c.owner === owner
      && Phaser.Math.Distance.Between(viewer.x, viewer.y, c.x, c.y) > c.r
      && segmentDistanceSq(c.x, c.y, viewer.x, viewer.y, f.x, f.y) <= (c.r * SMOKE_SIGHT_FRAC) ** 2);
  }
  /** The slot the bot gave up for Smoke-out, so its rotation leaves that key alone. */
  npcSmokeSlot(): 'r' | 'f' | 'q' | undefined { return this.smokeSlot('npc') ?? undefined; }
  /** Wax synergy (mastery): an own cloud a hurt bot is not standing in — somewhere to hide. */
  smokePoint(owner: Owner): { x: number; y: number } | null {
    const f = this.fighter(owner);
    if (!f?.active || this.inOwnSmoke(owner) || f.hp >= f.maxHp * NPC_SMOKE_HP) return null;
    const mine = this.clouds.filter((c) => c.owner === owner && c.r >= 60)
      .sort((a, b) => Phaser.Math.Distance.Squared(f.x, f.y, a.x, a.y) - Phaser.Math.Distance.Squared(f.x, f.y, b.x, b.y));
    return mine[0] ? { x: mine[0].x, y: mine[0].y } : null;
  }
  /** HUD: Smoke-out's card is the smoker's fuel, not a cooldown. */
  getSmokeRatio(): number { return this.side('player').fuel / SMOKE_FUEL_MAX; }

  /** An own hive worth walking back to; the kit redeems it on arrival. */
  hiveRedeemPoint(owner: Owner): { x: number; y: number } | null {
    const h = this.hives.find((hv) => hv.owner === owner && (hv.cells >= 3 || (this.up(owner, 'f') && hv.honey >= 20)));
    return h ? { x: h.x, y: h.y } : null;
  }
}
