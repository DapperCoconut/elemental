import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import {
  FOR, FortuneAvatar, FortuneColorFn, FortuneFx, StatKind, advanceCard, goldCoin, goldFloor,
  goldPlume, goldStatue, goldenHeart, grassBlade, midasGilt, powderBag,
} from './FortuneVisuals';

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

interface Bag {
  owner: Owner;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  start: number;
}

interface Plume {
  owner: Owner;
  x: number;
  y: number;
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

interface Offer {
  kinds: StatKind[];
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
  stats: Record<StatKind, number>;
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
    owner, gold: 0, frac: 0, aimX: 0, aimY: 0, stats: emptyStats(), offer: null,
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
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private blades: Blade[] = [];
  private bags: Bag[] = [];
  private plumes: Plume[] = [];
  private hearts = new Map<Fighter, Heart>();
  private curses = new Map<Fighter, Curse>();
  private stuns = new Map<Fighter, number>();
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
    this.bags = [];
    this.plumes = [];
    this.hearts.clear();
    this.curses.clear();
    this.stuns.clear();
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
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.floorGfx, this.plumeGfx, this.giltGfx, this.airGfx, this.hudGfx]) g?.destroy();
    this.floorGfx = this.plumeGfx = this.giltGfx = this.airGfx = this.hudGfx = null;
    for (const t of this.labels) t.destroy();
    this.labels = [];

    this.api.setStatusIndicator('gold-purse', null);
    this.api.setStatusIndicator('gold-floor', null);
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
        this.pick('player', s.offer.kinds[i]);
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
    const n = FRAY_BLADES + SHEAF_BLADES * s.stats.sheaf;
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
    s.offer = {
      kinds: pool.slice(0, OFFER_COUNT),
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
      start: this.now,
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
    this.curses.set(v, { by, start: this.now, lx: v.x, ly: v.y });
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
    const n = offer.kinds.length;
    const span = n * CARD_W + (n - 1) * CARD_GAP;
    const cy = Math.max(this.top + CARD_H / 2 + 4, f.y - CARD_LIFT);
    const x0 = Phaser.Math.Clamp(f.x, this.left + span / 2, this.right - span / 2) - span / 2 + CARD_W / 2;
    return offer.kinds.map((_, i) => ({ x: x0 + i * (CARD_W + CARD_GAP), y: cy }));
  }

  private cardUnder(owner: Owner, x: number, y: number): number {
    const cs = this.cardCentres(owner);
    for (let i = 0; i < cs.length; i++) {
      if (Math.abs(x - cs[i].x) <= CARD_W / 2 + 2 && Math.abs(y - cs[i].y) <= CARD_H / 2 + 2) return i;
    }
    return -1;
  }

  private pick(owner: Owner, kind: StatKind): void {
    const s = this.side(owner);
    const offer = s.offer;
    if (!offer) return;
    const at = this.cardCentres(owner)[offer.kinds.indexOf(kind)];
    s.offer = null;
    s.stats[kind]++;
    const f = this.fighter(owner);
    if (kind === 'vigor') {
      f.increaseMaxHp(VIGOR_HP);
      f.heal(VIGOR_HP);
    }
    const def = STAT_BY_KIND.get(kind)!;
    this.fx(owner).advancePick(at?.x ?? f.x, at?.y ?? f.y - CARD_LIFT);
    this.announce(f.x, f.y - 52, `${def.name}  ${def.line}`, def.color, 12);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('ui-click', f.x, { rate: 1.4, volume: 0.6 });
    Sfx.playAt('money', f.x, { rate: 1.1, volume: 0.5 });
  }

  /** The bot reads its three cards and takes the one it wants most right now. */
  private npcChoose(kinds: StatKind[]): StatKind {
    const f = this.api.npc;
    const hurt = f.hp / Math.max(1, f.maxHp);
    const s = this.sides.npc;
    const score = (k: StatKind): number => {
      const own = s.stats[k];
      const base: Record<StatKind, number> = {
        might: 1.2, hide: 1.0, stride: 0.8, haste: 1.1, vigor: 0.9, greed: 0.9, sheaf: 1.1, mend: 0.8,
      };
      let v = base[k] / (1 + own * 0.35);
      if (hurt < 0.5 && (k === 'vigor' || k === 'mend' || k === 'hide')) v += 0.8;
      return v + Math.random() * 0.3;
    };
    return kinds.reduce((a, b) => (score(b) > score(a) ? b : a));
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
      if (owner === 'npc' && this.now >= o.decideAt) { this.pick('npc', this.npcChoose(o.kinds)); continue; }
      if (this.now >= o.until) this.pick(owner, Phaser.Utils.Array.GetRandom(o.kinds));
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isGold('player');
    const npcIs = this.isGold('npc');
    const anyState = this.blades.length || this.bags.length || this.plumes.length || this.hearts.size
      || this.curses.size || this.stuns.size || this.patches.length || this.loot.length
      || this.api.player?.goldHeartUntil || this.api.player?.midasUntil;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateLunges();
    this.updateBlades(dt);
    this.updateBags();
    this.updatePlumes(dt);
    this.updateHearts(dt);
    this.updateStuns();
    this.updateCurses();
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
      if (gone) this.blades.splice(i, 1);
    }
  }

  private updateBags(): void {
    for (let i = this.bags.length - 1; i >= 0; i--) {
      const b = this.bags[i];
      if (this.now - b.start < BAG_MS) continue;
      this.bags.splice(i, 1);
      this.plumes.push({
        owner: b.owner, x: b.tx, y: b.ty, born: this.now, until: this.now + PLUME_MS,
        seed: Math.random() * 999, tickAt: this.now + PLUME_TICK_MS,
      });
      this.fx(b.owner).bagBurst(b.tx, b.ty, PLUME_R);
      Sfx.playAt('explosion-small', b.tx, { rate: 1.5, volume: 0.45 });
    }
  }

  private updatePlumes(dt: number): void {
    for (let i = this.plumes.length - 1; i >= 0; i--) {
      const pl = this.plumes[i];
      if (this.now >= pl.until) { this.plumes.splice(i, 1); continue; }
      // The owner, standing in it, is paid.
      const f = this.fighter(pl.owner);
      if (this.alive(f) && this.isGold(pl.owner)
        && Phaser.Math.Distance.Between(f.x, f.y, pl.x, pl.y) <= PLUME_R) {
        this.earn(pl.owner, PLUME_GOLD_PER_SEC * dt);
      }
      if (this.now < pl.tickAt) continue;
      pl.tickAt += PLUME_TICK_MS;
      const dmg = PLUME_DPS * (PLUME_TICK_MS / 1000) * this.might(pl.owner);
      for (const t of this.targetsOf(pl.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, pl.x, pl.y) > PLUME_R + this.bodyR(t) * 0.5) continue;
        t.takeDamage(dmg);
      }
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
          by: f === this.api.player ? 'npc' : 'player', start: this.now, lx: f.x, ly: f.y,
        });
      }
    }
    const purge = this.now >= this.purgeAt;
    if (purge) this.purgeAt = this.now + PURGE_EVERY_MS;
    for (const [v, c] of this.curses) {
      if (!v.active || v.hp <= 0 || this.now >= v.midasUntil) {
        this.curses.delete(v);
        v.midasUntil = 0;
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

  /** The alchemist's own standing effects: hide, mend, and the transmuting hand's afterglow. */
  private updateSelf(dt: number): void {
    for (const f of this.allFighters()) {
      if (f !== this.api.player && f !== this.api.npc) f.fortuneIncomingMult = 1;
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      s.glow = Math.max(0, s.glow - dt * 2.2);
      if (!f) continue;
      const gold = this.isGold(owner);
      f.fortuneIncomingMult = gold ? Math.pow(HIDE_STEP, s.stats.hide) : 1;
      if (gold && this.alive(f) && s.stats.mend > 0 && !this.isReplica(owner)) {
        f.heal(MEND_HPS * s.stats.mend * dt);
      }
    }
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

    for (const pl of this.plumes) {
      const born = Phaser.Math.Clamp((this.now - pl.born) / 260, 0, 1);
      const life = Phaser.Math.Clamp((pl.until - this.now) / 700, 0, 1);
      goldPlume(pg, this.col(pl.owner), pl.x, pl.y, PLUME_R * (0.7 + 0.3 * born), 0.9 * born * life, this.vizT, pl.seed);
    }

    for (const [v, c] of this.curses) {
      if (!v.active || v.alpha <= 0.05) continue;
      const prog = Phaser.Math.Clamp((this.now - c.start) / MIDAS_MS, 0, 1);
      midasGilt(gg, this.col(c.by), v.x, v.y, 0.15 + prog * 0.85, this.vizT, v.alpha);
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
      for (let i = 0; i < cs.length; i++) {
        const kind = offer.kinds[i];
        const rise = (1 - appear) * 14;
        advanceCard(g, this.col(owner), cs[i].x, cs[i].y + rise, CARD_W, CARD_H, kind, hover === i, a);
        const def = STAT_BY_KIND.get(kind)!;
        const name = this.label(used++);
        name.setText(def.name).setPosition(cs[i].x, cs[i].y + rise + 16).setAlpha(a).setVisible(true);
        const line = this.label(used++);
        line.setText(def.line).setPosition(cs[i].x, cs[i].y + rise + 27).setAlpha(a).setVisible(true);
      }
      // The fuse on an unanswered offer, under the cards.
      if (!offer.ghost && owner === 'player') {
        const left = Phaser.Math.Clamp((offer.until - this.now) / OFFER_MS, 0, 1);
        const span = cs.length * CARD_W + (cs.length - 1) * CARD_GAP;
        const x0 = cs[0].x - CARD_W / 2;
        const y0 = cs[0].y + CARD_H / 2 + 5;
        g.fillStyle(this.col(owner)(FOR.ink), 0.6 * a);
        g.fillRect(x0, y0, span, 3);
        g.fillStyle(this.col(owner)(FOR.gold), 0.9 * a);
        g.fillRect(x0, y0, span * left, 3);
      }
    }
    for (let i = used; i < this.labels.length; i++) this.labels[i].setVisible(false);
  }

  private label(i: number): Phaser.GameObjects.Text {
    while (this.labels.length <= i) {
      const big = this.labels.length % 2 === 0;
      this.labels.push(this.api.scene.add.text(0, 0, '', {
        fontSize: big ? '8px' : '7px', fontFamily: 'Arial Black',
        color: big ? '#fff3c4' : '#e6c46a', align: 'center',
      }).setOrigin(0.5).setDepth(17).setVisible(false));
    }
    return this.labels[i];
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
      this.api.setStatusIndicator(`gold-stat-${st.kind}`, n > 0 ? {
        name: `Advance: ${st.name[0]}${st.name.slice(1).toLowerCase()}`, emoji: '⬆️', color: st.color, priority: 152,
        description: `${st.line} per pick, for the rest of the match. Picked ${n}×.`,
        count: n,
      } : null);
    }
  }

  // ── Public accessors (read by ArenaScene / the AI) ─────────────────────────

  private speedFor(owner: Owner): number {
    const s = this.side(owner);
    return (1 + STRIDE_STEP * s.stats.stride) * (s.onFloor ? FLOOR_SPEED : 1);
  }

  /** Stride, the gold floor and a heart attack, pulled by ArenaScene's speed block. */
  getPlayerSpeedMult(): number {
    const p = this.api.player;
    if (p && this.stunned(p)) return 0;
    return this.isGold('player') ? this.speedFor('player') : 1;
  }

  getNpcSpeedMult(): number {
    const n = this.api.npc;
    if (n && this.stunned(n)) return 0;
    // An online replica's motion is streamed; its own boosts already happened on its machine.
    if (!this.isGold('npc') || this.api.isOnline) return 1;
    return this.speedFor('npc');
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
      if (d < PLUME_R * 0.6) return undefined;
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
