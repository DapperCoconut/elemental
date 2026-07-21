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
  state: 'hot' | 'cool';
  nextTickAt: number;
}

interface HuskLikeVariant {
  hpMult?: number;
  speedMult?: number;
}

// ── SlimeArenaApi ─────────────────────────────────────────────────────────

export interface SlimeArenaApi {
  readonly player: Fighter;
  readonly enemies: readonly Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
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

const RAIN_DURATION_MS = 8000;
const RAIN_TICK_MS = 500;
const RAIN_TICK_DAMAGE = 6;
const RAIN_DROP_INTERVAL_MS = 150;

// ── SlimeKit ──────────────────────────────────────────────────────────────

export class SlimeKit {
  private acidPools: AcidPool[] = [];
  private burrowed = false;
  private purgeHpStripped: WeakSet<Fighter> = new WeakSet();

  private acidRainActiveUntil = 0;
  private acidRainTickAccum = 0;
  private acidRainDropAccum = 0;

  constructor(private arena: SlimeArenaApi) {}

  // ── Public accessors ────────────────────────────────────────────────

  getBurrowSpeedMult(): number { return this.burrowed ? BURROW_SPEED_MULT : 1; }
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
  }

  startMatch(_W: number, _H: number, _isPlayerSlime: boolean): void { /* no per-match setup needed */ }

  // ── Shared hooks (called from ArenaScene's projectile hit pipeline) ──

  /** Called for both the player-fires / enemy-fires directions when a Purge ball lands. */
  onPurgeHit(target: Fighter, proj: Projectile, time: number): void {
    const durationMs = (proj as unknown as { purgeDurationMs?: number }).purgeDurationMs ?? PURGE_STAGES[0].purgeMs;
    target.purgedUntil = Math.max(target.purgedUntil, time + durationMs);
    this.arena.showFloatingText(target.x, target.y - 26, '☠️ Purged!', '#66ff33');

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

  private unburrow(reason: string): void {
    this.burrowed = false;
    this.arena.player.isInvincible = false;
    this.arena.player.setAlpha(1);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, reason, '#99ff66');
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

  private spawnAcidPools(): void {
    const { player, scene } = this.arena;
    const ptr = scene.input.activePointer;
    const ang = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    for (const dist of POOL_DISTANCES) {
      const x = player.x + Math.cos(ang) * dist;
      const y = player.y + Math.sin(ang) * dist;
      const sprite = scene.add.circle(x, y, POOL_RADIUS, POOL_HOT_COLOR, 0.55)
        .setStrokeStyle(2, POOL_HOT_STROKE, 0.9).setDepth(3);
      this.acidPools.push({ sprite, x, y, radius: POOL_RADIUS, state: 'hot', nextTickAt: 0 });
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
            t.takeDamage(POOL_HOT_DAMAGE);
            this.arena.spawnHitFlash(t.x, t.y, POOL_HOT_COLOR);
            this.arena.showFloatingText(t.x, t.y - 20, String(POOL_HOT_DAMAGE), '#66ff33');
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
            t.takeDamage(POOL_COOL_TICK_DAMAGE);
            this.arena.spawnHitFlash(t.x, t.y, POOL_COOL_COLOR);
          }
        }
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
              t.takeDamage(RAIN_TICK_DAMAGE);
              this.arena.spawnHitFlash(t.x, t.y, 0x66ff33);
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
    }
  }

  // ── handleInput ───────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    void time;

    // Click: Poison Whip
    if (pointer.isDown && !pointerWasDown) {
      if (player.castAbility('poison-whip', playerCtx)) {
        const count = this.isPointInAcid(player.x, player.y) ? WHIP_COUNT_ENHANCED : WHIP_COUNT_BASE;
        this.fireWhipBarrage(count);
      }
    }

    // E: Vile Spray
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (player.castAbility('vile-spray', playerCtx)) this.spawnAcidPools();
    }

    // R: Snake Burrow — toggle, only enterable while standing in acid
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
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
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (player.castAbility('purge', playerCtx)) this.fireBurst();
    }

    // Q: Acid Apocalypse
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (player.castAbility('acid-apocalypse', playerCtx)) {
        this.acidRainActiveUntil = time + RAIN_DURATION_MS;
        this.acidRainTickAccum = 0;
        this.acidRainDropAccum = 0;
        const { width: W, height: H } = this.arena.scene.scale;
        this.arena.showFloatingText(W / 2, H / 2 - 60, '☠️ Acid Apocalypse!', '#66ff33');
      }
    }
  }
}
