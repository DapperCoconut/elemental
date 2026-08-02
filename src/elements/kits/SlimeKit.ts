import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  ACID, AcidAura, AcidAvatar, AcidColorFn, AcidFx, ArmGesture,
  NPC_TONES, STING_TONES, VILE_TONES,
} from './AcidVisuals';

// ── Interfaces ────────────────────────────────────────────────────────────

/**
 * Acid's world objects carry no sprites. Pools creep, bubble and eat outward at their rims, and
 * a tweened Arc can do none of that — every one of them is repainted from scratch each frame in
 * `drawWorld`.
 */
interface AcidPool {
  x: number;
  y: number;
  radius: number;
  /** Radius at creation — Acid Flood (Q+) grows `radius` but caps relative to this. */
  baseRadius: number;
  state: 'hot' | 'cool';
  nextTickAt: number;
  /** Spray Spread (E+): next time this pool rolls its 20% chance to bud off a smaller pool. */
  nextSpreadCheckAt: number;
  /** Fixes this pool's lobe pattern so its edge churns without crawling across the floor. */
  seed: number;
}

/**
 * Murk (divine perk): the acid toad that squats on the surface while its summoner is under it.
 * Pure data — the hop is drawn from the clock across `hopStart → hopEnd` rather than tweened,
 * so the arc, the squash on landing and the puddle it drops all stay in step.
 */
interface MurkToad {
  x: number; y: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  hopStart: number;
  hopEnd: number;
  /** Set when the hop lands; the toad sits still until this, then picks a new spot. */
  restUntil: number;
  facing: number;
}

const TOAD_HOP_MS = 480;
const TOAD_REST_MS = 340;
const TOAD_HOP_DIST = 130;
const TOAD_PUDDLE_RADIUS = 26;
const TOAD_HOP_HEIGHT = 34;

interface HuskLikeVariant {
  hpMult?: number;
  speedMult?: number;
}

/** Rattling Strike (R+): a target dripping small acid puddles for a few seconds after being hit by the un-burrow AOE. */
interface DrippingStatus {
  until: number;
  nextDripAt: number;
}

/** Meltdown (F+): a generic buff Fighter field that can be snapshotted off a melting target and re-granted to the acid user. */
interface BuffFieldDef {
  key: 'walkSpeedMult' | 'outgoingDamageMult' | 'critChance' | 'dodgeChance' | 'cooldownMult' | 'regenPerSecond';
  neutral: number;
  better: 'higher' | 'lower';
  label(v: number): string;
}

const MELT_BUFF_FIELDS: BuffFieldDef[] = [
  { key: 'walkSpeedMult', neutral: 1, better: 'higher', label: (v) => `+${Math.round((v - 1) * 100)}% Speed` },
  { key: 'outgoingDamageMult', neutral: 1, better: 'higher', label: (v) => `+${Math.round((v - 1) * 100)}% Damage` },
  { key: 'critChance', neutral: 0, better: 'higher', label: (v) => `+${Math.round(v * 100)}% Crit` },
  { key: 'dodgeChance', neutral: 0, better: 'higher', label: (v) => `+${Math.round(v * 100)}% Dodge` },
  { key: 'cooldownMult', neutral: 1, better: 'lower', label: (v) => `-${Math.round((1 - v) * 100)}% Cooldown` },
  { key: 'regenPerSecond', neutral: 0, better: 'higher', label: (v) => `+${v.toFixed(1)}/s Regen` },
];

interface BuffSnapshotEntry {
  key: BuffFieldDef['key'];
  value: number;
  label: string;
}

interface MeltStatus {
  until: number;
  nextDripAt: number;
  buffs: BuffSnapshotEntry[];
  /** The melting target's element color — melt puddles are dyed to match ("skin color"). */
  color: number;
}

interface MeltPuddle {
  x: number;
  y: number;
  radius: number;
  buffs: BuffSnapshotEntry[];
  /** The melting target's element colour — melt puddles are dyed to match ("skin color"). */
  color: number;
  seed: number;
}

/** Acid Mastery — Acid Walker: a short-lived acid puddle left in the player's tracks. */
interface AcidFootprint {
  x: number;
  y: number;
  radius: number;
  damage: number;
  expiresAt: number;
  nextTickAt: number;
  /** Boosted prints (dropped just after surfacing) are bigger and read hotter. */
  boosted: boolean;
  seed: number;
}

// ── SlimeArenaApi ─────────────────────────────────────────────────────────

export interface SlimeArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: readonly Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly elementId: string;
  readonly npcElementId: string;
  /** The ability the opponent cast this frame, or null — drives their rig's gestures. */
  readonly npcCastId: string | null;
  /** Skins: maps an acid visual color through the owner's skin. */
  acidColor(owner: 'player' | 'npc', base: number): number;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** True only when the player is acid (slime) AND Acid Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is acid AND has Acid Mastery on. Drives npc-side Breakdown. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  recordMasteryBest(key: string, value: number): void;
}

// ── Tunables ──────────────────────────────────────────────────────────────

const WHIP_COUNT_BASE = 15;
const WHIP_COUNT_ENHANCED = 20;
const WHIP_DAMAGE = 1;
const WHIP_SPEED = 650;
const WHIP_STAGGER_MS = 25;
const WHIP_SPREAD_DEG = 5;

const POOL_RADIUS = 56;
const POOL_DISTANCES = [110, 180, 250];
const POOL_HOT_DAMAGE = 5;
const POOL_COOL_TICK_DAMAGE = 2;
const POOL_COOL_TICK_MS = 2000;
const POOL_HOT_COLOR = ACID.hot;
const POOL_COOL_COLOR = ACID.cool;

/** Gap between droplet puffs shed out of the back of a live acid shot. */
const TRAIL_INTERVAL_MS = 45;

/** NPC casts mirrored onto the opponent's rig. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'poison-whip': 'punch',
  'vile-spray': 'sweep',
  'snake-burrow': 'flex',
  'purge': 'punch',
  'acid-apocalypse': 'raise',
  'breakdown': 'flex',
};

const BURROW_SPEED_MULT = 1.25;

const PURGE_BASE_SPEED = 220;
const PURGE_STAGES = [
  { maxCoverage: 0.24, damage: 15, purgeMs: 3000, sizeSpeedMult: 1 },
  { maxCoverage: 0.50, damage: 30, purgeMs: 8000, sizeSpeedMult: 1.25 },
  { maxCoverage: Infinity, damage: 45, purgeMs: 15000, sizeSpeedMult: 1.5 },
];
/** Purge is "fully charged" (Meltdown trigger) once acid coverage pushes it to this stage. */
const PURGE_MELT_STAGE = 3;

const RAIN_DURATION_MS = 8000;
const RAIN_TICK_MS = 500;
const RAIN_TICK_DAMAGE = 6;
const RAIN_DROP_INTERVAL_MS = 150;

// Spray Spread (E+)
const SPREAD_CHECK_MS = 2000;
const SPREAD_CHANCE = 0.2;
const SPREAD_RADIUS_MULT = 0.55;
const SPREAD_MIN_RADIUS = 18;
const SPREAD_OFFSET_MIN = 20;
const SPREAD_OFFSET_MAX = 50;
const MAX_ACID_POOLS = 60;

// Rattling Strike (R+)
const RATTLING_RADIUS = 90;
const RATTLING_DAMAGE = 20;
const RATTLING_DRIP_MS = 5000;
const RATTLING_DRIP_INTERVAL_MS = 1000;
const RATTLING_DRIP_POOL_RADIUS = 22;

// Meltdown (F+)
const MELT_DURATION_MS = 3000;
const MELT_TICK_MS = 1000;
const MELT_HP_LOSS_PCT = 0.1;
const MELT_SIZE_LOSS_PCT = 0.1;
const MELT_MIN_SIZE_MULT = 0.3;
const MELT_PUDDLE_RADIUS = 24;
const MELT_BUFF_GRANT_MS = 8000;

// Acid Flood (Q+)
const FLOOD_GROWTH_PER_SEC = 6;
const FLOOD_MAX_RADIUS_MULT = 2.2;

// ── Mastery: Acid Walker passive + Breakdown bindable ─────────────────────────
const FOOTPRINT_TRAIL_MS = 5000;      // window after leaving acid during which footprints drop
const FOOTPRINT_LIFETIME_MS = 3000;   // each footprint lasts ~3s
const FOOTPRINT_TICK_MS = 500;
const FOOTPRINT_SPACING = 34;         // min distance walked before dropping the next print
const FOOTPRINT_RADIUS = 15;
const FOOTPRINT_DAMAGE = 2;
const FOOTPRINT_BOOST_MS = 3000;      // footprints boosted if dropped within this of an un-burrow
const FOOTPRINT_BOOST_RADIUS = 26;
const FOOTPRINT_BOOST_DAMAGE = 4;
const BREAKDOWN_DURATION_MS = 3000;
const BREAKDOWN_COOLDOWN_MS = 12000;
const BREAKDOWN_LASH_COUNT = 200;
const BREAKDOWN_LEAK_COUNT = 12;
const BREAKDOWN_LEAK_RADIUS = 20;
const BREAKDOWN_MIN_COVERAGE = 0.5;   // needs the screen at least half covered in acid

// ── SlimeKit ──────────────────────────────────────────────────────────────

export class SlimeKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: AcidColorFn;
  private readonly ncol: AcidColorFn;
  private readonly pfx: AcidFx;
  private readonly nfx: AcidFx;
  /** The dripping character rig (globule arms, eyes, running crest) for each acid fighter. */
  private playerAvatar: AcidAvatar | null = null;
  private npcAvatar: AcidAvatar | null = null;
  private burrowAura: AcidAura | null = null;
  private breakdownAura: AcidAura | null = null;
  /** Melt/purge tells riding on their victims — one aura per fighter. */
  private meltAuras = new Map<Fighter, AcidAura>();
  private purgeAuras = new Map<Fighter, AcidAura>();
  /** Every pool, footprint and melt puddle is drawn here, from scratch, every frame. */
  private worldGfx: Phaser.GameObjects.Graphics | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  private trailAccum = 0;
  /** Edge-detects the opponent's cast so a gesture fires once, not every frame it is held. */
  private lastNpcCastId: string | null = null;

  private acidPools: AcidPool[] = [];
  private burrowed = false;
  /** Murk (divine perk): the toad left on the surface while burrowed. Null whenever you aren't. */
  private murkToad: MurkToad | null = null;
  private purgeHpStripped: WeakSet<Fighter> = new WeakSet();

  private acidRainActiveUntil = 0;
  private acidRainTickAccum = 0;
  private acidRainDropAccum = 0;

  // Rattling Strike (R+)
  private drippingEnemies: Map<Fighter, DrippingStatus> = new Map();

  // Meltdown (F+)
  private meltStatuses: Map<Fighter, MeltStatus> = new Map();
  private meltPuddles: MeltPuddle[] = [];
  private activeMeltBuffs: { key: BuffFieldDef['key']; revertValue: number }[] = [];
  private meltBuffExpireAt = 0;

  // ── Mastery: Acid Walker passive ──────────────────────────────────────
  private acidFootprints: AcidFootprint[] = [];
  private wasInAcid = false;
  private footprintTrailUntil = 0;
  private lastFootprintX = 0;
  private lastFootprintY = 0;
  private lastUnburrowAt = -FOOTPRINT_BOOST_MS;
  private coverageAccum = 0;          // batches acidCoverageTotal writes
  private sessionBestCoverage = 0;    // gate for the best-coverage stat write
  private meltKillCounted: WeakSet<Fighter> = new WeakSet();

  // ── Mastery: Breakdown bindable ───────────────────────────────────────
  private breakdownUntil = 0;
  private breakdownLastCastAt = -BREAKDOWN_COOLDOWN_MS;

  constructor(private arena: SlimeArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.acidColor('player', base);
    this.ncol = (base) => arena.acidColor('npc', base);
    this.pfx = new AcidFx(arena.scene, this.pcol);
    this.nfx = new AcidFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ──────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): AcidFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): AcidColorFn { return owner === 'player' ? this.pcol : this.ncol; }

  /** Shared Graphics for everything the kit repaints every frame. Rebuilt lazily after a reset. */
  private world(): Phaser.GameObjects.Graphics {
    if (!this.worldGfx || !this.worldGfx.active) {
      this.worldGfx = this.arena.scene.add.graphics().setDepth(3);
    }
    return this.worldGfx;
  }

  // ── Public accessors ────────────────────────────────────────────────

  getBurrowSpeedMult(): number {
    // Breakdown roots the acid user in place for its duration.
    if (this.arena.scene.time.now < this.breakdownUntil) return 0;
    return this.burrowed ? BURROW_SPEED_MULT : 1;
  }
  isBurrowed(): boolean { return this.burrowed; }

  // ── reset ────────────────────────────────────────────────────────────

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.burrowAura) { this.burrowAura.destroy(); this.burrowAura = null; }
    if (this.breakdownAura) { this.breakdownAura.destroy(); this.breakdownAura = null; }
    for (const a of this.meltAuras.values()) a.destroy();
    this.meltAuras.clear();
    for (const a of this.purgeAuras.values()) a.destroy();
    this.purgeAuras.clear();
    if (this.worldGfx) { this.worldGfx.destroy(); this.worldGfx = null; }
    this.aimX = 0;
    this.aimY = 0;
    this.trailAccum = 0;
    this.lastNpcCastId = null;

    this.acidPools = [];
    if (this.burrowed) {
      this.burrowed = false;
      this.murkToad = null;
      this.arena.player.isInvincible = false;
      this.arena.player.setAlpha(1);
    }
    this.purgeHpStripped = new WeakSet();
    this.acidRainActiveUntil = 0;
    this.acidRainTickAccum = 0;
    this.acidRainDropAccum = 0;
    this.drippingEnemies = new Map();
    this.meltStatuses = new Map();
    this.meltPuddles = [];
    this.activeMeltBuffs = [];
    this.meltBuffExpireAt = 0;
    // Mastery — Acid Walker + Breakdown
    this.acidFootprints = [];
    this.wasInAcid = false;
    this.footprintTrailUntil = 0;
    this.lastUnburrowAt = -FOOTPRINT_BOOST_MS;
    this.coverageAccum = 0;
    this.sessionBestCoverage = 0;
    this.meltKillCounted = new WeakSet();
    this.breakdownUntil = 0;
    this.breakdownLastCastAt = -BREAKDOWN_COOLDOWN_MS;
  }

  startMatch(_W: number, _H: number, _isPlayerSlime: boolean): void { /* no per-match setup needed */ }

  // ── Shared hooks (called from ArenaScene's projectile hit pipeline) ──

  /** Called for both the player-fires / enemy-fires directions when a Purge ball lands. */
  onPurgeHit(target: Fighter, proj: Projectile, time: number): void {
    const durationMs = (proj as unknown as { purgeDurationMs?: number }).purgeDurationMs ?? PURGE_STAGES[0].purgeMs;
    target.purgedUntil = Math.max(target.purgedUntil, time + durationMs);
    this.arena.showFloatingText(target.x, target.y - 26, '☠️ Purged!', '#66ff33');
    // A ball that landed on the local player came from the opponent, so it is painted in their
    // colours — otherwise an npc's purge would splash in the player's own green.
    const fromNpc = target === this.arena.player;
    const fx = fromNpc ? this.nfx : this.pfx;
    const tones = fromNpc ? NPC_TONES : VILE_TONES;
    // Snap on application, then a boiling-off tell so the strip stays readable for its duration.
    fx.splash(target.x, target.y, 52, { droplets: 12, fizz: 4, depth: 8, tones });
    if (!this.purgeAuras.has(target)) {
      this.purgeAuras.set(target, new AcidAura(
        this.arena.scene, fromNpc ? this.ncol : this.pcol, 'purge', tones, 28, 4));
    }

    // Meltdown (F+): only a fully-charged (stage 3) player purge ball melts the target.
    const stage = (proj as unknown as { purgeStage?: number }).purgeStage;
    if (stage === PURGE_MELT_STAGE && this.arena.hasUpgrade('f')) {
      this.startMelt(target, time);
    }

    const variant = (target as unknown as { variant?: HuskLikeVariant }).variant;
    if (!variant) return;
    if (variant.speedMult && variant.speedMult > 1) {
      target.purgeSpeedMult = Math.min(target.purgeSpeedMult, 1 / variant.speedMult);
    }
    if (variant.hpMult && variant.hpMult > 1 && !this.purgeHpStripped.has(target)) {
      this.purgeHpStripped.add(target);
      const baseMax = Math.max(1, Math.round(target.maxHp / variant.hpMult));
      target.reduceMaxHp(target.maxHp - baseMax);
      this.arena.showFloatingText(target.x, target.y - 44, 'Bonus HP stripped!', '#33ff88');
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private isPointInAcid(x: number, y: number): boolean {
    return this.acidPools.some(p => Phaser.Math.Distance.Between(x, y, p.x, p.y) <= p.radius);
  }

  private computeAcidCoveragePct(): number {
    if (this.acidPools.length === 0) return 0;
    const { width: W, height: H } = this.arena.scene.scale;
    const arenaArea = Math.max(1, W * H);
    const coveredArea = this.acidPools.reduce((sum, p) => sum + Math.PI * p.radius * p.radius, 0);
    return Math.min(1, coveredArea / arenaArea);
  }

  /** Single entry point for creating an acid pool, so Spray Spread/Rattling Strike share the same object shape as Vile Spray. */
  private createAcidPool(x: number, y: number, radius: number, time: number): AcidPool {
    const pool: AcidPool = {
      x, y, radius, baseRadius: radius, state: 'hot', nextTickAt: 0,
      nextSpreadCheckAt: time + SPREAD_CHECK_MS,
      seed: Math.random() * Math.PI * 2,
    };
    this.acidPools.push(pool);
    // A pool lands: the surface breaks and fizzes where it hit.
    this.pfx.ring(x, y, radius * 0.3, radius, ACID.hotRim, 340, 3, 4);
    this.pfx.fizz(x, y, Math.max(2, Math.round(radius / 12)), radius * 0.7, 4, VILE_TONES);
    // Mastery — track cumulative acid laid down (batched to keep localStorage writes rare).
    const { width: W, height: H } = this.arena.scene.scale;
    this.coverageAccum += (Math.PI * radius * radius) / Math.max(1, W * H);
    if (this.coverageAccum >= 0.25) {
      this.arena.recordMasteryStat('acidCoverageTotal', this.coverageAccum);
      this.coverageAccum = 0;
    }
    return pool;
  }

  /** Mastery — count an enemy killed by acid ("melt"), once per target. */
  private noteAcidHit(t: Fighter): void {
    if (t.hp <= 0 && !this.meltKillCounted.has(t)) {
      this.meltKillCounted.add(t);
      this.arena.recordMasteryStat('melts', 1);
    }
  }

  // ── Murk (divine perk) ────────────────────────────────────────────────

  /** The toad only exists while its summoner is under the surface. */
  private spawnMurkToad(time: number): void {
    const player = this.arena.player;
    this.murkToad = {
      x: player.x, y: player.y,
      fromX: player.x, fromY: player.y, toX: player.x, toY: player.y,
      hopStart: time, hopEnd: time, restUntil: time + TOAD_REST_MS, facing: 0,
    };
    this.pfx.fizz(player.x, player.y, 5, 24, 5, VILE_TONES);
  }

  private despawnMurkToad(): void {
    const toad = this.murkToad;
    if (!toad) return;
    this.murkToad = null;
    // It doesn't hop away, it melts — back down the hole with whoever called it up.
    this.pfx.splash(toad.x, toad.y, 30, { droplets: 7, fizz: 3, etch: false, depth: 6, tones: VILE_TONES });
  }

  /**
   * The toad's whole behaviour: rest, pick a spot at random, hop, and dribble a small pool
   * wherever it lands. It never chases and never attacks — the pools are the threat, and they
   * are also the acid the burrowed player needs to keep moving through.
   */
  private updateMurkToad(time: number): void {
    const toad = this.murkToad;
    if (!toad) return;
    const { width: W, height: H } = this.arena.scene.scale;
    const pad = 40;

    if (time < toad.hopEnd) {
      // Mid-hop: straight line across the ground, with the arc added at draw time.
      const p = (time - toad.hopStart) / Math.max(1, toad.hopEnd - toad.hopStart);
      toad.x = Phaser.Math.Linear(toad.fromX, toad.toX, p);
      toad.y = Phaser.Math.Linear(toad.fromY, toad.toY, p);
      return;
    }
    // Just landed this frame? The rest timer is set on landing, so an unset one means "land now".
    if (toad.restUntil < toad.hopEnd) {
      toad.x = toad.toX;
      toad.y = toad.toY;
      toad.restUntil = time + TOAD_REST_MS;
      if (this.acidPools.length < MAX_ACID_POOLS) {
        this.createAcidPool(toad.x, toad.y, TOAD_PUDDLE_RADIUS, time);
      }
      return;
    }
    if (time < toad.restUntil) return;

    // Pick somewhere new, biased nowhere in particular — a toad has no plan.
    const ang = Math.random() * Math.PI * 2;
    const dist = TOAD_HOP_DIST * (0.5 + Math.random() * 0.5);
    toad.fromX = toad.x;
    toad.fromY = toad.y;
    toad.toX = Phaser.Math.Clamp(toad.x + Math.cos(ang) * dist, pad, W - pad);
    toad.toY = Phaser.Math.Clamp(toad.y + Math.sin(ang) * dist, pad, H - pad);
    toad.facing = Math.atan2(toad.toY - toad.fromY, toad.toX - toad.fromX);
    toad.hopStart = time;
    toad.hopEnd = time + TOAD_HOP_MS;
  }

  /**
   * The toad itself: a squat body that stretches into the hop and squashes on landing, four legs
   * folded under it, two bulging eyes and a throat that pumps while it sits. Drawn on the world
   * layer above its own pools.
   */
  private drawMurkToad(g: Phaser.GameObjects.Graphics, time: number): void {
    const toad = this.murkToad;
    if (!toad) return;
    const hopping = time < toad.hopEnd;
    const p = hopping ? (time - toad.hopStart) / Math.max(1, toad.hopEnd - toad.hopStart) : 1;
    // Arc: up and back down over the hop, so the shadow and the body separate mid-flight.
    const lift = hopping ? Math.sin(p * Math.PI) * TOAD_HOP_HEIGHT : 0;
    const bx = toad.x, by = toad.y - lift;
    // Stretched along the hop, squat when sitting.
    const stretch = hopping ? 1 + Math.sin(p * Math.PI) * 0.25 : 1;
    const throat = 1 + (hopping ? 0 : Math.sin(time / 260) * 0.12);
    const col = this.pcol;

    // Ground shadow — tightest at the ends of the hop, so the arc reads.
    g.fillStyle(col(ACID.rot), 0.3 * (1 - lift / (TOAD_HOP_HEIGHT * 1.6)));
    g.fillEllipse(toad.x, toad.y + 5, 24, 8);

    // Legs: two folded back, two braced forward.
    g.lineStyle(3, col(ACID.bog), 0.9);
    for (const side of [-1, 1]) {
      const knee = hopping ? 0.9 : 0.3;
      g.beginPath();
      g.moveTo(bx + side * 6, by + 3);
      g.lineTo(bx + side * 13, by + 3 - knee * 6);
      g.lineTo(bx + side * 9, by + 8);
      g.strokePath();
      g.beginPath();
      g.moveTo(bx + side * 5, by + 1);
      g.lineTo(bx + side * 15, by - 2 + knee * 3);
      g.strokePath();
    }

    // Body, then the wetter back over it.
    g.fillStyle(col(ACID.sludge), 0.95);
    g.fillEllipse(bx, by, 26 * stretch, 18 / stretch);
    g.fillStyle(col(ACID.neon), 0.5);
    g.fillEllipse(bx, by - 3, 18 * stretch, 9 / stretch);
    // Warts.
    g.fillStyle(col(ACID.bog), 0.5);
    for (let i = 0; i < 4; i++) {
      const a = toad.facing + 1.2 + i * 0.9;
      g.fillCircle(bx + Math.cos(a) * 7, by + Math.sin(a) * 4 - 2, 1.6);
    }
    // Throat, pumping while it sits.
    g.fillStyle(col(ACID.hotRim), 0.5);
    g.fillEllipse(bx, by + 6, 13 * throat, 6 * throat);

    // Eyes: two bulges on top with dark slits, looking where it is going.
    for (const side of [-1, 1]) {
      const ex = bx + Math.cos(toad.facing) * 7 + Math.cos(toad.facing + Math.PI / 2) * side * 5;
      const ey = by + Math.sin(toad.facing) * 4 + Math.sin(toad.facing + Math.PI / 2) * side * 5 - 7;
      g.fillStyle(col(ACID.glow), 1);
      g.fillCircle(ex, ey, 3.4);
      g.fillStyle(0x120a02, 1);
      g.fillEllipse(ex + Math.cos(toad.facing) * 1.2, ey + Math.sin(toad.facing) * 1.2, 1.6, 3);
    }
  }

  private unburrow(reason: string): void {
    this.burrowed = false;
    this.despawnMurkToad();
    const player = this.arena.player;
    player.isInvincible = false;
    player.setAlpha(1);
    this.arena.showFloatingText(player.x, player.y - 30, reason, '#99ff66');
    // Mastery — Acid Walker: footprints dropped shortly after surfacing are boosted.
    this.lastUnburrowAt = this.arena.scene.time.now;

    // Surfacing: the mound bursts open and throws acid clear.
    this.pfx.splash(player.x, player.y, 56, { droplets: 12, fizz: 4, etch: false, depth: 6, tones: VILE_TONES });
    this.playerAvatar?.play('flex');

    // Rattling Strike (R+): un-burrowing detonates a red AOE and marks hit enemies as dripping.
    if (this.arena.hasUpgrade('r')) {
      const x = player.x, y = player.y, time = this.arena.scene.time.now;
      // The one warm effect in the element, so it can never be mistaken for a normal surface.
      this.pfx.splash(x, y, RATTLING_RADIUS, {
        droplets: 18, fizz: 4, depth: 6, duration: 480, tones: STING_TONES,
      });
      this.arena.scene.cameras.main.shake(180, 0.005);
      let hitAny = false;
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(x, y, t.x, t.y) <= RATTLING_RADIUS) {
          t.takeDamage(RATTLING_DAMAGE);
          this.arena.spawnHitFlash(t.x, t.y, ACID.sting);
          this.pfx.splash(t.x, t.y, 34, { droplets: 6, fizz: 0, etch: false, depth: 8, tones: STING_TONES });
          this.drippingEnemies.set(t, { until: time + RATTLING_DRIP_MS, nextDripAt: time });
          // Mastery — "attack enemies by un-burrowing next to them".
          this.arena.recordMasteryStat('burrowAttacks', 1);
          this.noteAcidHit(t);
          hitAny = true;
        }
      }
      if (hitAny) this.arena.showFloatingText(x, y - 30, '🐍 Rattling Strike!', '#ff6666');
    }
  }

  // ── Meltdown (F+) ─────────────────────────────────────────────────────

  private snapshotBuffs(target: Fighter): BuffSnapshotEntry[] {
    const out: BuffSnapshotEntry[] = [];
    for (const f of MELT_BUFF_FIELDS) {
      const v = target[f.key];
      const isBuffed = f.better === 'higher' ? v > f.neutral : v < f.neutral;
      if (isBuffed) out.push({ key: f.key, value: v, label: f.label(v) });
    }
    return out;
  }

  private startMelt(target: Fighter, time: number): void {
    const buffs = this.snapshotBuffs(target);
    this.meltStatuses.set(target, { until: time + MELT_DURATION_MS, nextDripAt: time + MELT_TICK_MS, buffs, color: target.element.color });
    this.arena.showFloatingText(target.x, target.y - 40, '🤢 Melting!', '#33cc33');
    // A running tell on the victim for the whole melt, not just on the tick frames.
    if (!this.meltAuras.has(target)) {
      this.meltAuras.set(target, new AcidAura(this.arena.scene, this.pcol, 'melt', VILE_TONES, 24, 4));
    }
    this.pfx.splash(target.x, target.y, 40, { droplets: 8, fizz: 3, etch: false, depth: 8, tones: VILE_TONES });
  }

  private spawnMeltPuddle(x: number, y: number, buffs: BuffSnapshotEntry[], color: number): void {
    this.meltPuddles.push({
      x, y, radius: MELT_PUDDLE_RADIUS, buffs, color, seed: Math.random() * Math.PI * 2,
    });
  }

  private updateMeltStatuses(time: number): void {
    for (const [target, status] of this.meltStatuses) {
      if (!target.active || target.hp <= 0) {
        this.meltStatuses.delete(target);
        continue;
      }
      // Guard with `nextDripAt <= until` (not just `time >= until` below) so the final
      // tick at the duration boundary still fires instead of being cut off by expiry.
      if (time >= status.nextDripAt && status.nextDripAt <= status.until) {
        status.nextDripAt += MELT_TICK_MS;
        const hpLoss = Math.max(1, Math.round(target.hp * MELT_HP_LOSS_PCT));
        const maxHpLoss = Math.max(1, Math.round(target.maxHp * MELT_HP_LOSS_PCT));
        target.takeDamage(hpLoss);
        target.reduceMaxHp(maxHpLoss);
        target.sizeMult = Math.max(MELT_MIN_SIZE_MULT, target.sizeMult * (1 - MELT_SIZE_LOSS_PCT));
        target.applySizeMult();
        this.arena.spawnHitFlash(target.x, target.y, status.color);
        this.spawnMeltPuddle(target.x, target.y, status.buffs, status.color);
      }
      if (time >= status.until) this.meltStatuses.delete(target);
    }
  }

  private grantMeltBuffs(recipient: Fighter, buffs: BuffSnapshotEntry[], time: number): void {
    this.revertMeltBuffs(recipient);
    if (buffs.length === 0) {
      this.arena.showFloatingText(recipient.x, recipient.y - 40, 'Empty puddle...', '#888888');
      return;
    }
    const labels: string[] = [];
    for (const b of buffs) {
      this.activeMeltBuffs.push({ key: b.key, revertValue: recipient[b.key] });
      recipient[b.key] = b.value;
      labels.push(b.label);
    }
    this.meltBuffExpireAt = time + MELT_BUFF_GRANT_MS;
    this.arena.showFloatingText(recipient.x, recipient.y - 44, `🤢 ${labels.join(', ')} (8s)`, '#33ff99');
  }

  private revertMeltBuffs(recipient: Fighter): void {
    for (const b of this.activeMeltBuffs) recipient[b.key] = b.revertValue;
    this.activeMeltBuffs = [];
  }

  private updateMeltPuddlePickup(time: number): void {
    const player = this.arena.player;
    for (let i = this.meltPuddles.length - 1; i >= 0; i--) {
      const mp = this.meltPuddles[i];
      if (Phaser.Math.Distance.Between(player.x, player.y, mp.x, mp.y) <= mp.radius) {
        this.grantMeltBuffs(player, mp.buffs, time);
        // Absorbing a puddle: it collapses inward into the player rather than blinking out.
        this.pfx.gather(mp.x, mp.y, mp.radius * 1.6, 380,
          () => (player.active ? { x: player.x, y: player.y } : null), 5, VILE_TONES);
        this.pfx.ring(mp.x, mp.y, mp.radius, 6, mp.color, 340, 3, 5);
        this.meltPuddles.splice(i, 1);
      }
    }
    if (this.activeMeltBuffs.length > 0 && time >= this.meltBuffExpireAt) {
      this.revertMeltBuffs(player);
    }
  }

  private updateDrippingEnemies(time: number): void {
    for (const [target, status] of this.drippingEnemies) {
      if (!target.active || target.hp <= 0 || time >= status.until) {
        this.drippingEnemies.delete(target);
        continue;
      }
      if (time >= status.nextDripAt) {
        status.nextDripAt = time + RATTLING_DRIP_INTERVAL_MS;
        if (this.acidPools.length < MAX_ACID_POOLS) this.createAcidPool(target.x, target.y, RATTLING_DRIP_POOL_RADIUS, time);
      }
    }
  }

  private fireWhipBarrage(count: number): void {
    const { player, scene } = this.arena;
    const ptr = scene.input.activePointer;
    const mouseX = ptr.worldX;
    const mouseY = ptr.worldY;
    const baseAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
    this.playerAvatar?.play('punch', baseAngle);
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(i * WHIP_STAGGER_MS, () => {
        if (!player.active || player.hp <= 0) return;
        const jitter = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-WHIP_SPREAD_DEG, WHIP_SPREAD_DEG));
        const ang = baseAngle + jitter;
        const spawnDist = 30;
        // A lash every few shots, not every one: fifteen muzzle sprays in 375ms is a wall of
        // white, and the barrage reads better as an irregular spit.
        if (i % 3 === 0) this.pfx.muzzleSpray(player.x, player.y, ang, 0.85, 7, VILE_TONES);
        const proj = new Projectile(
          scene,
          player.x + Math.cos(ang) * spawnDist,
          player.y + Math.sin(ang) * spawnDist,
          'proj-acid-whip',
          WHIP_DAMAGE,
          true,
        );
        this.arena.projectiles.add(proj);
        proj.launch(Math.cos(ang) * WHIP_SPEED, Math.sin(ang) * WHIP_SPEED);
        proj.setRotation(ang);
      });
    }
  }

  private spawnAcidPools(time: number): void {
    const { player, scene } = this.arena;
    const ptr = scene.input.activePointer;
    const ang = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    this.playerAvatar?.play('sweep', ang);
    this.pfx.muzzleSpray(player.x, player.y, ang, 1.6, 7, VILE_TONES);
    for (const dist of POOL_DISTANCES) {
      const x = player.x + Math.cos(ang) * dist;
      const y = player.y + Math.sin(ang) * dist;
      this.createAcidPool(x, y, POOL_RADIUS, time);
      // Each pool is thrown out there, so the spray reads as one arcing stream of acid rather
      // than three circles appearing at once.
      this.pfx.droplets(player.x, player.y, 5, {
        speed: dist * 2.2, angle: ang, spread: 0.22, size: 4.4,
        life: 340, fall: 20, depth: 6, tones: VILE_TONES,
      });
    }
    this.arena.showFloatingText(player.x, player.y - 30, '⚗️ Vile Spray!', '#66ff33');
  }

  private fireBurst(): void {
    const { player, scene } = this.arena;
    const ptr = scene.input.activePointer;
    const coverage = this.computeAcidCoveragePct();
    const stage = PURGE_STAGES.find(s => coverage < s.maxCoverage) ?? PURGE_STAGES[PURGE_STAGES.length - 1];
    const stageIndex = PURGE_STAGES.indexOf(stage) + 1;
    const dx = ptr.worldX - player.x;
    const dy = ptr.worldY - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spawnDist = 30;
    const proj = new Projectile(
      scene,
      player.x + (dx / len) * spawnDist,
      player.y + (dy / len) * spawnDist,
      'proj-purge',
      stage.damage,
      true,
    );
    proj.setScale(stage.sizeSpeedMult);
    (proj as unknown as { purgeDurationMs: number }).purgeDurationMs = stage.purgeMs;
    (proj as unknown as { purgeStage: number }).purgeStage = stageIndex;
    this.arena.projectiles.add(proj);
    const speed = PURGE_BASE_SPEED * stage.sizeSpeedMult;
    proj.launch((dx / len) * speed, (dy / len) * speed);
    this.arena.showFloatingText(player.x, player.y - 30, `☠️ Purge (Stage ${stageIndex})`, '#66ff33');
    // The stage is the whole point of the ability, so the throw grows with it rather than the
    // projectile simply being scaled: a bigger spray, a wider front, more thrown acid.
    const ang = Math.atan2(dy, dx);
    this.playerAvatar?.play('slam', ang);
    this.pfx.muzzleSpray(player.x, player.y, ang, 1 + stageIndex * 0.4, 7, VILE_TONES);
    this.pfx.ring(player.x, player.y, 10, 30 + stageIndex * 16, ACID.neon, 300 + stageIndex * 90, 3, 5);
    this.pfx.droplets(player.x, player.y, 4 + stageIndex * 4, {
      speed: 200, angle: ang, spread: 0.5, size: 3.4 + stageIndex,
      life: 420, depth: 6, tones: VILE_TONES,
    });
  }

  // ── update ────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { player, scene } = this.arena;

    // Acid pools: first-touch burst, then permanent cool-state tick damage
    for (const pool of this.acidPools) {
      if (pool.state === 'hot') {
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(t.x, t.y, pool.x, pool.y) <= pool.radius) {
            t.takeDamage(POOL_HOT_DAMAGE, { source: pool, sourceX: pool.x, sourceY: pool.y });
            this.arena.spawnHitFlash(t.x, t.y, POOL_HOT_COLOR);
            this.arena.showFloatingText(t.x, t.y - 20, String(POOL_HOT_DAMAGE), '#66ff33');
            this.noteAcidHit(t);
            pool.state = 'cool';
            pool.nextTickAt = time + POOL_COOL_TICK_MS;
            // The pool spends its bite: it flares, throws acid up the victim, and goes dark.
            this.pfx.splash(t.x, t.y, 40, { droplets: 8, fizz: 3, etch: false, depth: 8, tones: VILE_TONES });
            this.pfx.fizz(pool.x, pool.y, Math.max(3, Math.round(pool.radius / 9)), pool.radius, 4, VILE_TONES);
            break;
          }
        }
      } else if (time >= pool.nextTickAt) {
        pool.nextTickAt = time + POOL_COOL_TICK_MS;
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(t.x, t.y, pool.x, pool.y) <= pool.radius) {
            t.takeDamage(POOL_COOL_TICK_DAMAGE, { source: pool, sourceX: pool.x, sourceY: pool.y });
            this.arena.spawnHitFlash(t.x, t.y, POOL_COOL_COLOR);
            this.noteAcidHit(t);
            // A quiet tick still burns — a couple of drops thrown up off the victim's feet.
            this.pfx.droplets(t.x, t.y + 8, 3, {
              speed: 60, angle: -Math.PI / 2, spread: 1, size: 2.4, life: 380, depth: 5, tones: VILE_TONES,
            });
          }
        }
      }
    }

    // Spray Spread (E+): each pool has a periodic 20% chance to bud off a smaller pool
    if (this.arena.hasUpgrade('e')) {
      for (const pool of this.acidPools.slice()) {
        if (time < pool.nextSpreadCheckAt) continue;
        pool.nextSpreadCheckAt = time + SPREAD_CHECK_MS;
        if (this.acidPools.length >= MAX_ACID_POOLS || Math.random() >= SPREAD_CHANCE) continue;
        const ang = Math.random() * Math.PI * 2;
        const dist = Phaser.Math.Between(SPREAD_OFFSET_MIN, SPREAD_OFFSET_MAX);
        const spreadRadius = Math.max(SPREAD_MIN_RADIUS, pool.radius * SPREAD_RADIUS_MULT);
        this.createAcidPool(pool.x + Math.cos(ang) * dist, pool.y + Math.sin(ang) * dist, spreadRadius, time);
      }
    }

    // Murk: the toad hops on its own clock, before the auto-surface check below — the pool it
    // just dribbled can be the one that keeps a burrowed player under.
    this.updateMurkToad(time);

    // Auto-unburrow if the player has drifted out of every acid pool
    if (this.burrowed) {
      if (!this.isPointInAcid(player.x, player.y)) {
        this.unburrow('🐍 Out of acid — surfaced!');
      } else {
        player.isInvincible = true;
      }
    }

    // Acid Apocalypse: tick damage to enemies standing in any pool, plus falling-rain flair
    if (time < this.acidRainActiveUntil) {
      this.acidRainTickAccum += delta;
      if (this.acidRainTickAccum >= RAIN_TICK_MS) {
        this.acidRainTickAccum -= RAIN_TICK_MS;
        for (const pool of this.acidPools) {
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(t.x, t.y, pool.x, pool.y) <= pool.radius) {
              t.takeDamage(RAIN_TICK_DAMAGE, { source: pool, sourceX: pool.x, sourceY: pool.y });
              this.arena.spawnHitFlash(t.x, t.y, ACID.neon);
              this.noteAcidHit(t);
              this.pfx.splash(t.x, t.y, 30, { droplets: 5, fizz: 0, etch: false, depth: 8, tones: VILE_TONES });
            }
          }
        }
      }
      this.acidRainDropAccum += delta;
      if (this.acidRainDropAccum >= RAIN_DROP_INTERVAL_MS && this.acidPools.length > 0) {
        this.acidRainDropAccum -= RAIN_DROP_INTERVAL_MS;
        // Two or three drops per beat, each a real fall that breaks where it lands.
        for (let i = 0; i < 3; i++) {
          const pool = this.acidPools[Phaser.Math.Between(0, this.acidPools.length - 1)];
          const dx = Phaser.Math.Between(-pool.radius, pool.radius);
          this.pfx.rainDrop(pool.x + dx, pool.y + Phaser.Math.Between(-8, 8), 140, 6, VILE_TONES);
        }
      }

      // Acid Flood (Q+): puddles slowly expand while the rain is active
      if (this.arena.hasUpgrade('q')) {
        const growth = FLOOD_GROWTH_PER_SEC * (delta / 1000);
        for (const pool of this.acidPools) {
          const cap = pool.baseRadius * FLOOD_MAX_RADIUS_MULT;
          if (pool.radius >= cap) continue;
          // drawWorld reads `radius` every frame, so growing the pool is the whole update.
          pool.radius = Math.min(cap, pool.radius + growth);
        }
      }
    }

    // Rattling Strike (R+) drip status
    if (this.drippingEnemies.size > 0) this.updateDrippingEnemies(time);

    // Meltdown (F+): melt ticks, drip puddles, and player pickup
    if (this.meltStatuses.size > 0) this.updateMeltStatuses(time);
    if (this.meltPuddles.length > 0 || this.activeMeltBuffs.length > 0) this.updateMeltPuddlePickup(time);

    // ── Mastery — best-coverage stat (only written on a fresh session high) ──
    const covPct = this.computeAcidCoveragePct() * 100;
    if (covPct > this.sessionBestCoverage) {
      this.sessionBestCoverage = covPct;
      this.arena.recordMasteryBest('acidCoverageBestPct', covPct);
    }

    // ── Mastery — Acid Walker: leave footprints for 5s after leaving acid ──
    if (this.arena.masteryActive) {
      const inAcid = this.isPointInAcid(player.x, player.y);
      if (this.wasInAcid && !inAcid) {
        this.footprintTrailUntil = time + FOOTPRINT_TRAIL_MS;
        this.lastFootprintX = player.x;
        this.lastFootprintY = player.y;
      }
      this.wasInAcid = inAcid;
      if (!inAcid && time < this.footprintTrailUntil) {
        if (Phaser.Math.Distance.Between(player.x, player.y, this.lastFootprintX, this.lastFootprintY) >= FOOTPRINT_SPACING) {
          this.lastFootprintX = player.x;
          this.lastFootprintY = player.y;
          this.spawnFootprint(player.x, player.y, time, time - this.lastUnburrowAt <= FOOTPRINT_BOOST_MS);
        }
      }
    }
    if (this.acidFootprints.length > 0) this.updateFootprints(time);

    this.updateVisuals(time, delta);
  }

  /** Online: opponent is acid — advance only the visuals that can appear on our screen. */
  updateNpc(time: number, delta: number): void {
    this.updateVisuals(time, delta);
  }

  /**
   * Everything that must run for whichever side is acid: both rigs, the persistent tells, the
   * trails coming off live shots, one repaint of every pool, and the opponent's cast gestures.
   */
  private updateVisuals(time: number, delta: number): void {
    this.updateAvatars(delta);
    this.updateAuras(delta, time);
    this.updateProjectileTrails(delta);
    this.drawWorld(time);
    const castId = this.arena.npcCastId;
    if (castId !== this.lastNpcCastId) {
      this.lastNpcCastId = castId;
      this.handleNpcCastId(castId);
    }
  }

  /**
   * Builds (on first frame) and drives the dripping rig for whichever fighters are acid. The
   * player faces the cursor; the NPC faces whoever it is fighting. Burrowed, the rig sinks with
   * the fighter's own alpha, and the burrow aura closes over the top of it.
   */
  private updateAvatars(delta: number): void {
    const { player, npc, scene, elementId, npcElementId } = this.arena;

    if (elementId === 'slime' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new AcidAvatar(scene, this.pcol, VILE_TONES);
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      const breaking = scene.time.now < this.breakdownUntil;
      this.playerAvatar.setIntensity(breaking ? 1.5 : this.acidRainActiveUntil > scene.time.now ? 1.25 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Burrowed, the character works low under the surface rather than standing in it.
      this.playerAvatar.setHold(this.burrowed ? 'brace' : null,
        Math.atan2(aimY - player.y, aimX - player.x));
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcElementId === 'slime' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new AcidAvatar(scene, this.ncol, NPC_TONES);
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Burrow and Breakdown on the caster; melt and purge tells on whoever is carrying them. */
  private updateAuras(delta: number, time: number): void {
    const { player, scene } = this.arena;
    const alive = player?.active ? (player.forceInvisible ? 0 : 1) : 0;

    if (this.burrowed && alive) {
      if (!this.burrowAura) this.burrowAura = new AcidAura(scene, this.pcol, 'burrow', VILE_TONES, 30, 4);
      this.burrowAura.update(delta, player.x, player.y, 1);
    } else if (this.burrowAura) {
      this.burrowAura.destroy();
      this.burrowAura = null;
    }

    if (time < this.breakdownUntil && alive) {
      if (!this.breakdownAura) this.breakdownAura = new AcidAura(scene, this.pcol, 'breakdown', VILE_TONES, 34, 4);
      this.breakdownAura.update(delta, player.x, player.y, 1);
    } else if (this.breakdownAura) {
      this.breakdownAura.destroy();
      this.breakdownAura = null;
    }

    for (const [victim, aura] of this.meltAuras) {
      if (!this.meltStatuses.has(victim) || !victim.active || victim.hp <= 0) {
        aura.destroy();
        this.meltAuras.delete(victim);
        continue;
      }
      aura.update(delta, victim.x, victim.y, victim.forceInvisible ? 0 : victim.alpha);
    }
    for (const [victim, aura] of this.purgeAuras) {
      if (!victim.active || victim.hp <= 0 || time >= victim.purgedUntil) {
        aura.destroy();
        this.purgeAuras.delete(victim);
        continue;
      }
      aura.update(delta, victim.x, victim.y, victim.forceInvisible ? 0 : victim.alpha);
    }
  }

  /**
   * Live lashes and Purge balls shed droplets out of their *back*, which is what makes a bead of
   * green read as something travelling rather than sliding. Scanned off the shared projectile
   * group on an accumulator so a 200-lash Breakdown stays cheap.
   */
  private updateProjectileTrails(delta: number): void {
    this.trailAccum += delta;
    if (this.trailAccum < TRAIL_INTERVAL_MS) return;
    this.trailAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      const key = proj.texture?.key;
      if (!proj.active || (key !== 'proj-acid-whip' && key !== 'proj-purge')) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      // Whip lashes are cheap and numerous; only a fraction of them trail on any given tick.
      if (key === 'proj-acid-whip' && Math.random() > 0.3) continue;
      const back = Math.atan2(-body.velocity.y, -body.velocity.x);
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      const tones = proj.isFromPlayer ? VILE_TONES : NPC_TONES;
      fx.droplets(proj.x, proj.y, key === 'proj-purge' ? 3 : 1, {
        speed: 50, spread: 0.45, angle: back,
        size: key === 'proj-purge' ? 3.4 : 2.2,
        life: 320, fall: 22, depth: 5, tones,
      });
    }
  }

  /** Mirrors the opponent's casts onto their rig. */
  private handleNpcCastId(id: string | null): void {
    if (!id) return;
    const gesture = NPC_GESTURES[id];
    if (!gesture) return;
    const { npc, player } = this.arena;
    if (!npc?.active) return;
    const ang = Math.atan2(player.y - npc.y, player.x - npc.x);
    this.npcAvatar?.play(gesture, ang);
    if (id === 'poison-whip' || id === 'purge') {
      this.nfx.muzzleSpray(npc.x, npc.y, ang, id === 'purge' ? 1.4 : 0.9, 7, NPC_TONES);
    }
  }

  /**
   * One repaint of every pool, footprint and melt puddle the kit owns. All of them creep and
   * bubble, so none of them can be a sprite with a tween on it.
   */
  private drawWorld(time: number): void {
    const g = this.world();
    const t = time / 1000;
    g.clear();

    for (const pool of this.acidPools) {
      AcidFx.drawPool(g, this.pcol, pool.x, pool.y, pool.radius, t, pool.seed, pool.state === 'hot');
    }
    for (const fp of this.acidFootprints) {
      // Prints fade out over their last half-second rather than popping.
      const a = Phaser.Math.Clamp((fp.expiresAt - time) / 600, 0, 1);
      AcidFx.drawPool(g, this.pcol, fp.x, fp.y, fp.radius, t, fp.seed, fp.boosted, a * 0.9);
    }
    for (const mp of this.meltPuddles) {
      AcidFx.drawMeltPuddle(g, this.pcol, mp.x, mp.y, mp.radius, mp.color, t, mp.seed, mp.buffs.length);
    }
    // Above its own pools, so the toad never disappears into the one it just made.
    this.drawMurkToad(g, time);
  }

  private spawnFootprint(x: number, y: number, time: number, boosted: boolean): void {
    const radius = boosted ? FOOTPRINT_BOOST_RADIUS : FOOTPRINT_RADIUS;
    this.acidFootprints.push({
      x, y, radius,
      damage: boosted ? FOOTPRINT_BOOST_DAMAGE : FOOTPRINT_DAMAGE,
      expiresAt: time + FOOTPRINT_LIFETIME_MS,
      nextTickAt: time + FOOTPRINT_TICK_MS,
      boosted, seed: Math.random() * Math.PI * 2,
    });
    // A boosted print is a step out of a burst, so it lands with its own small splash.
    if (boosted) this.pfx.fizz(x, y, 3, radius, 4, VILE_TONES);
  }

  private updateFootprints(time: number): void {
    for (let i = this.acidFootprints.length - 1; i >= 0; i--) {
      const fp = this.acidFootprints[i];
      if (time >= fp.expiresAt) { this.acidFootprints.splice(i, 1); continue; }
      if (time < fp.nextTickAt) continue;
      fp.nextTickAt = time + FOOTPRINT_TICK_MS;
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(t.x, t.y, fp.x, fp.y) <= fp.radius) {
          t.takeDamage(fp.damage, { source: fp, sourceX: fp.x, sourceY: fp.y });
          this.arena.spawnHitFlash(t.x, t.y, 0x66ff33);
          this.noteAcidHit(t);
        }
      }
    }
  }

  // ── handleInput ───────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;

    // ── Mastery — Breakdown takes over whichever slot it's bound to ──────
    const breakdownSlot = this.arena.masteryActive ? this.breakdownSlot() : null;
    if (breakdownSlot) {
      const bdKey = breakdownSlot === 'e' ? eKey : breakdownSlot === 'r' ? rKey : breakdownSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(bdKey)) this.tryCastBreakdown(time);
    }

    // Click: Poison Whip
    if (pointer.isDown && !pointerWasDown) {
      if (player.castAbility('poison-whip', playerCtx)) {
        const count = this.isPointInAcid(player.x, player.y) ? WHIP_COUNT_ENHANCED : WHIP_COUNT_BASE;
        this.fireWhipBarrage(count);
      }
    }

    // E: Vile Spray
    if (breakdownSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) {
      if (player.castAbility('vile-spray', playerCtx)) this.spawnAcidPools(time);
    }

    // R: Snake Burrow — toggle, only enterable while standing in acid
    if (breakdownSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      if (this.burrowed) {
        this.unburrow('🐍 Surfaced!');
      } else if (!this.isPointInAcid(player.x, player.y)) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Need to be standing in acid!', '#ff4444');
      } else if (player.castAbility('snake-burrow', playerCtx)) {
        this.burrowed = true;
        player.isInvincible = true;
        player.setAlpha(0.4);
        this.arena.showFloatingText(player.x, player.y - 30, '🐍 Burrowed!', '#99ff66');
        // Murk: something has to be left on the surface while you are under it.
        if (this.arena.hasPerk('player', 'murk')) {
          this.spawnMurkToad(time);
          this.arena.showFloatingText(player.x, player.y - 48, '🐸 Toad!', '#77aa44');
        }
        // Going under: the surface closes over the caster and swallows them.
        this.playerAvatar?.play('flex');
        this.pfx.gather(player.x, player.y, 46, 400,
          () => (player.active ? { x: player.x, y: player.y } : null), 5, VILE_TONES);
        this.pfx.ring(player.x, player.y, 46, 12, ACID.hotRim, 380, 3.5, 4);
      }
    }

    // F: Purge
    if (breakdownSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      if (player.castAbility('purge', playerCtx)) this.fireBurst();
    }

    // Q: Acid Apocalypse
    if (breakdownSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      if (player.castAbility('acid-apocalypse', playerCtx)) {
        this.acidRainActiveUntil = time + RAIN_DURATION_MS;
        this.acidRainTickAccum = 0;
        this.acidRainDropAccum = 0;
        const { width: W, height: H } = this.arena.scene.scale;
        this.arena.showFloatingText(W / 2, H / 2 - 60, '☠️ Acid Apocalypse!', '#66ff33');
        // The sky opening: the caster throws both arms up and every live pool flares at once.
        this.playerAvatar?.play('raise', -Math.PI / 2, 900);
        this.pfx.ring(player.x, player.y, 12, 160, ACID.neon, 620, 6, 5);
        for (const pool of this.acidPools) {
          this.pfx.ring(pool.x, pool.y, pool.radius * 0.4, pool.radius * 1.3, ACID.hotRim, 460, 3, 4);
          this.pfx.fizz(pool.x, pool.y, 4, pool.radius, 4, VILE_TONES);
        }
        this.arena.scene.cameras.main.shake(320, 0.005);
      }
    }
  }

  // ── Mastery — Breakdown ────────────────────────────────────────────────

  /** The slot Breakdown is bound over this match, or null. */
  private breakdownSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'breakdown') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar for the bound slot. */
  getBreakdownCooldownRatio(time: number): number {
    return Math.min(1, (time - this.breakdownLastCastAt) / BREAKDOWN_COOLDOWN_MS);
  }

  private tryCastBreakdown(time: number): void {
    if (time - this.breakdownLastCastAt < BREAKDOWN_COOLDOWN_MS) return;
    const player = this.arena.player;
    if (this.computeAcidCoveragePct() < BREAKDOWN_MIN_COVERAGE) {
      this.arena.showFloatingText(player.x, player.y - 30, 'NEED 50% ACID', '#ff6666');
      return;
    }
    this.breakdownLastCastAt = time;
    // triggerCooldown broadcasts the cast online; the peer replays via doNpcBreakdown.
    player.triggerCooldown('breakdown');
    this.startBreakdown('player', time);
  }

  /** Online replay: the remote acid player cast Breakdown — spray lashes at the local player. */
  doNpcBreakdown(_tx: number, _ty: number): void {
    this.startBreakdown('npc', this.arena.scene.time.now);
  }

  private startBreakdown(owner: 'player' | 'npc', time: number): void {
    const { scene } = this.arena;
    const origin = owner === 'player' ? this.arena.player : this.arena.npc;
    const fromPlayer = owner === 'player';
    if (owner === 'player') this.breakdownUntil = time + BREAKDOWN_DURATION_MS;
    this.arena.showFloatingText(origin.x, origin.y - 40, '☣️ BREAKDOWN!', '#33ff33');
    // Coming apart: a hard burst on the frame it starts, then the aura carries the 3s of leak.
    const bfx = this.fx(owner);
    const btones = owner === 'player' ? VILE_TONES : NPC_TONES;
    (owner === 'player' ? this.playerAvatar : this.npcAvatar)?.play('flex');
    bfx.splash(origin.x, origin.y, 90, { droplets: 20, fizz: 6, duration: 560, depth: 6, tones: btones });
    scene.cameras.main.shake(280, 0.006);

    // 200 acid lashes sprayed in random directions across the full 360° over 3 seconds.
    for (let i = 0; i < BREAKDOWN_LASH_COUNT; i++) {
      scene.time.delayedCall(Math.floor(i * BREAKDOWN_DURATION_MS / BREAKDOWN_LASH_COUNT), () => {
        const caster = owner === 'player' ? this.arena.player : this.arena.npc;
        if (!caster.active || caster.hp <= 0) return;
        const ang = Math.random() * Math.PI * 2;
        const proj = new Projectile(
          scene,
          caster.x + Math.cos(ang) * 24,
          caster.y + Math.sin(ang) * 24,
          'proj-acid-whip',
          WHIP_DAMAGE,
          fromPlayer,
        );
        this.arena.projectiles.add(proj);
        proj.launch(Math.cos(ang) * WHIP_SPEED, Math.sin(ang) * WHIP_SPEED);
        proj.setRotation(ang);
      });
    }

    // Leaking acid particles occasionally pool up (player sim only — pools damage enemies).
    if (owner === 'player') {
      for (let i = 0; i < BREAKDOWN_LEAK_COUNT; i++) {
        scene.time.delayedCall(Math.floor(i * BREAKDOWN_DURATION_MS / BREAKDOWN_LEAK_COUNT), () => {
          const p = this.arena.player;
          if (!p.active || p.hp <= 0) return;
          const ox = Phaser.Math.Between(-16, 16), oy = Phaser.Math.Between(-16, 16);
          if (this.acidPools.length < MAX_ACID_POOLS) this.createAcidPool(p.x + ox, p.y + oy, BREAKDOWN_LEAK_RADIUS, scene.time.now);
          this.pfx.droplets(p.x + ox, p.y - 6, 3, {
            speed: 40, angle: Math.PI / 2, spread: 0.6, size: 3,
            life: 380, fall: 30, depth: 6, tones: VILE_TONES,
          });
        });
      }
    }
  }
}
