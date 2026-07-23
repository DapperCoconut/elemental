import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── Interfaces ────────────────────────────────────────────────────────────

interface AcidPool {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  /** Radius at creation — Acid Flood (Q+) grows `radius` but caps relative to this. */
  baseRadius: number;
  state: 'hot' | 'cool';
  nextTickAt: number;
  /** Spray Spread (E+): next time this pool rolls its 20% chance to bud off a smaller pool. */
  nextSpreadCheckAt: number;
}

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
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  buffs: BuffSnapshotEntry[];
}

/** Acid Mastery — Acid Walker: a short-lived acid puddle left in the player's tracks. */
interface AcidFootprint {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  damage: number;
  expiresAt: number;
  nextTickAt: number;
}

// ── SlimeArenaApi ─────────────────────────────────────────────────────────

export interface SlimeArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: readonly Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  hasUpgrade(slot: string): boolean;
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
const POOL_HOT_COLOR = 0x33ff33;
const POOL_HOT_STROKE = 0x99ff66;
const POOL_COOL_COLOR = 0x225511;
const POOL_COOL_STROKE = 0x448822;

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
  private acidPools: AcidPool[] = [];
  private burrowed = false;
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

  constructor(private arena: SlimeArenaApi) {}

  // ── Public accessors ────────────────────────────────────────────────

  getBurrowSpeedMult(): number {
    // Breakdown roots the acid user in place for its duration.
    if (this.arena.scene.time.now < this.breakdownUntil) return 0;
    return this.burrowed ? BURROW_SPEED_MULT : 1;
  }
  isBurrowed(): boolean { return this.burrowed; }

  // ── reset ────────────────────────────────────────────────────────────

  reset(): void {
    for (const p of this.acidPools) p.sprite.destroy();
    this.acidPools = [];
    if (this.burrowed) {
      this.burrowed = false;
      this.arena.player.isInvincible = false;
      this.arena.player.setAlpha(1);
    }
    this.purgeHpStripped = new WeakSet();
    this.acidRainActiveUntil = 0;
    this.acidRainTickAccum = 0;
    this.acidRainDropAccum = 0;
    this.drippingEnemies = new Map();
    this.meltStatuses = new Map();
    for (const mp of this.meltPuddles) mp.sprite.destroy();
    this.meltPuddles = [];
    this.activeMeltBuffs = [];
    this.meltBuffExpireAt = 0;
    // Mastery — Acid Walker + Breakdown
    for (const fp of this.acidFootprints) fp.sprite.destroy();
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
    const sprite = this.arena.scene.add.circle(x, y, radius, POOL_HOT_COLOR, 0.55)
      .setStrokeStyle(2, POOL_HOT_STROKE, 0.9).setDepth(3);
    const pool: AcidPool = {
      sprite, x, y, radius, baseRadius: radius, state: 'hot', nextTickAt: 0,
      nextSpreadCheckAt: time + SPREAD_CHECK_MS,
    };
    this.acidPools.push(pool);
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

  private unburrow(reason: string): void {
    this.burrowed = false;
    const player = this.arena.player;
    player.isInvincible = false;
    player.setAlpha(1);
    this.arena.showFloatingText(player.x, player.y - 30, reason, '#99ff66');
    // Mastery — Acid Walker: footprints dropped shortly after surfacing are boosted.
    this.lastUnburrowAt = this.arena.scene.time.now;

    // Rattling Strike (R+): un-burrowing detonates a red AOE and marks hit enemies as dripping.
    if (this.arena.hasUpgrade('r')) {
      const x = player.x, y = player.y, time = this.arena.scene.time.now;
      const aoe = this.arena.scene.add.circle(x, y, RATTLING_RADIUS, 0xff3333, 0.35)
        .setStrokeStyle(2, 0xff3333, 0.9).setDepth(4);
      this.arena.scene.tweens.add({ targets: aoe, alpha: 0, duration: 350, onComplete: () => aoe.destroy() });
      let hitAny = false;
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(x, y, t.x, t.y) <= RATTLING_RADIUS) {
          t.takeDamage(RATTLING_DAMAGE);
          this.arena.spawnHitFlash(t.x, t.y, 0xff3333);
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
    this.arena.showFloatingText(target.x, target.y - 40, '🫠 Melting!', '#33cc33');
  }

  private spawnMeltPuddle(x: number, y: number, buffs: BuffSnapshotEntry[], color: number): void {
    const sprite = this.arena.scene.add.circle(x, y, MELT_PUDDLE_RADIUS, color, 0.6)
      .setStrokeStyle(2, color, 0.95).setDepth(3);
    this.meltPuddles.push({ sprite, x, y, radius: MELT_PUDDLE_RADIUS, buffs });
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
    this.arena.showFloatingText(recipient.x, recipient.y - 44, `🫠 ${labels.join(', ')} (8s)`, '#33ff99');
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
        mp.sprite.destroy();
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
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(i * WHIP_STAGGER_MS, () => {
        if (!player.active || player.hp <= 0) return;
        const jitter = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-WHIP_SPREAD_DEG, WHIP_SPREAD_DEG));
        const ang = baseAngle + jitter;
        const spawnDist = 30;
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
    for (const dist of POOL_DISTANCES) {
      const x = player.x + Math.cos(ang) * dist;
      const y = player.y + Math.sin(ang) * dist;
      this.createAcidPool(x, y, POOL_RADIUS, time);
    }
    this.arena.showFloatingText(player.x, player.y - 30, '🧪 Vile Spray!', '#66ff33');
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
            pool.sprite.setFillStyle(POOL_COOL_COLOR, 0.55).setStrokeStyle(2, POOL_COOL_STROKE, 0.9);
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
              this.arena.spawnHitFlash(t.x, t.y, 0x66ff33);
              this.noteAcidHit(t);
            }
          }
        }
      }
      this.acidRainDropAccum += delta;
      if (this.acidRainDropAccum >= RAIN_DROP_INTERVAL_MS && this.acidPools.length > 0) {
        this.acidRainDropAccum -= RAIN_DROP_INTERVAL_MS;
        const pool = this.acidPools[Phaser.Math.Between(0, this.acidPools.length - 1)];
        const dx = Phaser.Math.Between(-pool.radius, pool.radius);
        const drop = scene.add.circle(pool.x + dx, pool.y - 90, 3, 0x66ff33, 0.9).setDepth(6);
        scene.tweens.add({
          targets: drop, y: pool.y, alpha: 0.2, duration: 300,
          onComplete: () => drop.destroy(),
        });
      }

      // Acid Flood (Q+): puddles slowly expand while the rain is active
      if (this.arena.hasUpgrade('q')) {
        const growth = FLOOD_GROWTH_PER_SEC * (delta / 1000);
        for (const pool of this.acidPools) {
          const cap = pool.baseRadius * FLOOD_MAX_RADIUS_MULT;
          if (pool.radius >= cap) continue;
          pool.radius = Math.min(cap, pool.radius + growth);
          pool.sprite.setRadius(pool.radius);
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
  }

  private spawnFootprint(x: number, y: number, time: number, boosted: boolean): void {
    const radius = boosted ? FOOTPRINT_BOOST_RADIUS : FOOTPRINT_RADIUS;
    const color = boosted ? 0x143d0a : 0x2a6b1a;
    const sprite = this.arena.scene.add.circle(x, y, radius, color, 0.6)
      .setStrokeStyle(2, boosted ? 0x2a5511 : 0x448822, 0.9).setDepth(3);
    this.acidFootprints.push({
      sprite, x, y, radius,
      damage: boosted ? FOOTPRINT_BOOST_DAMAGE : FOOTPRINT_DAMAGE,
      expiresAt: time + FOOTPRINT_LIFETIME_MS,
      nextTickAt: time + FOOTPRINT_TICK_MS,
    });
  }

  private updateFootprints(time: number): void {
    for (let i = this.acidFootprints.length - 1; i >= 0; i--) {
      const fp = this.acidFootprints[i];
      if (time >= fp.expiresAt) { fp.sprite.destroy(); this.acidFootprints.splice(i, 1); continue; }
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
          const drip = scene.add.circle(p.x + ox, p.y, 3, 0x66ff33, 0.9).setDepth(6);
          scene.tweens.add({ targets: drip, y: p.y + 14, alpha: 0.1, duration: 300, onComplete: () => drip.destroy() });
        });
      }
    }
  }
}
