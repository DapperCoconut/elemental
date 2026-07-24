import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── Ice type definitions ────────────────────────────────────────────────────

export interface IcyTrail {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  frostTickAccum: number;
  owner: 'player' | 'npc';
  rink?: boolean;
  skater?: boolean;
}

export interface IceArenaZone {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number; radius: number;
  expiresAt: number; tickAccum: number;
  isVoid: boolean; owner: 'player' | 'npc';
}

/** Ice Mastery — Icicle Impale: a live icicle tracking damage taken by its host toward the shatter threshold. */
interface IceIcicle {
  target: Fighter;
  sprite: Phaser.GameObjects.Graphics;
  lastHp: number;
  damageTaken: number;
  isVoid: boolean;
}

const ICICLE_IMPALE_COOLDOWN_MS = 6000;
const ICICLE_DASH_SPEED = 900;
const ICICLE_DASH_DURATION_MS = 150;
const ICICLE_HIT_RADIUS = 34;
const ICICLE_SHATTER_DAMAGE_THRESHOLD = 50;
const ICICLE_EXTENDED_STACK_MS = 10000;
const ICICLE_STACK_HARD_CAP = 7;
const BIG_HIT_THRESHOLD = 50;

// ── IceArenaApi ──────────────────────────────────────────────────────────────

export interface IceArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly nukeChanneling: boolean;
  readonly isInvasion: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  applyNpcSpeedMult(factor: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number;
  /** True only when the player is ice AND Ice Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── IceKit ───────────────────────────────────────────────────────────────────

export class IceKit {
  // ── Player state — frost stacks ─────────────────────────────────────────
  private playerFrostStacks = 0;
  /** Expiry timestamps (Date.now()-based) for each individual frost stack — oldest first. */
  private playerFrostStackTimers: number[] = [];
  private playerFrostVisual: Phaser.GameObjects.Text | null = null;
  private playerPermafrostVisual: Phaser.GameObjects.Text | null = null;
  private playerPermavoidVisual: Phaser.GameObjects.Text | null = null;

  // ── Player state — Block Up / Black Ice ─────────────────────────────────
  private playerBlockUpActive = false;
  private playerBlockUpAura: Phaser.GameObjects.Arc | null = null;
  private playerFrozenUntil = 0;
  private playerBlackIceMorphActive = false;
  private playerBlackIceAura: Phaser.GameObjects.Arc | null = null;
  private playerIceSpeedBoostUntil = 0;
  private playerSlushLastTick = 0;

  // ── Player state — Skater mode (Ice F revamp) ───────────────────────────
  private playerSkaterActive = false;
  private playerSkaterHeading = 0;
  private playerSkaterTrailAccum = 0;
  private readonly playerSkaterSpeed = 220;
  private readonly playerSkaterTurnRate = 3.0;

  // ── Rink perk: timestamp until which the skate speed bonus applies ─────
  private playerSkateRecentUntil = 0;
  private npcSkateRecentUntil = 0;

  // ── NPC state ─────────────────────────────────────────────────────────
  private npcBlockUpActive = false;
  private npcBlockUpAura: Phaser.GameObjects.Arc | null = null;

  // ── Shared ────────────────────────────────────────────────────────────
  private icyTrails: IcyTrail[] = [];
  private iceArenas: IceArenaZone[] = [];

  // ── Ice Mastery — Viral Frost passive ───────────────────────────────
  private viralFrostCooldowns: Map<Fighter, number> = new Map();

  // ── Ice Mastery — Icicle Impale ─────────────────────────────────────
  private icicleImpales: IceIcicle[] = [];
  private icicleImpaleLastCastAt = -999999;
  private icicleDashActive = false;
  private icicleDashUntil = 0;
  private icicleDashVx = 0;
  private icicleDashVy = 0;
  private icicleDashHitThisDash = false;
  // Online mirror: the opponent's Icicle Impale dash replayed on this victim sim. We can't
  // drive the dead-reckoned npc's velocity, so we just watch for it to reach us and impale.
  private npcIcicleDashActive = false;
  private npcIcicleDashUntil = 0;
  private npcIcicleDashHit = false;

  constructor(private arena: IceArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  getPlayerFrostStacks(): number { return this.playerFrostStacks; }
  isPlayerBlockUpActive(): boolean { return this.playerBlockUpActive; }
  isNpcBlockUpActive(): boolean { return this.npcBlockUpActive; }
  isPlayerBlackIceMorphActive(): boolean { return this.playerBlackIceMorphActive; }
  getPlayerFrozenUntil(): number { return this.playerFrozenUntil; }
  setPlayerFrozenUntil(v: number): void { this.playerFrozenUntil = v; }
  isPlayerSkaterActive(): boolean { return this.playerSkaterActive; }
  getPlayerSkaterHeading(): number { return this.playerSkaterHeading; }
  getPlayerSkaterSpeed(): number { return this.playerSkaterSpeed; }

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Icicle Impale is bound to a slot. */
  getIcicleImpaleCooldownRatio(time: number): number {
    return Math.min(1, (time - this.icicleImpaleLastCastAt) / ICICLE_IMPALE_COOLDOWN_MS);
  }

  /** Combined multiplier contribution (frost/permafrost slow, block-up slow, own-trail boost, Rink perk) for the NPC. */
  getNpcSpeedMultContribution(time: number): number {
    const npc = this.arena.npc;
    let mult = 1;
    if (npc.frostStacks > 0) mult *= (1 - npc.frostStacks * 0.1);
    if (npc.permafrostStacks > 0) mult *= (1 - npc.permafrostStacks * 0.10);
    if (this.npcBlockUpActive) mult *= 0.5;
    if (this.arena.hasPerk('npc', 'rink') && this.icyTrails.some((t) => t.owner === 'npc' && Phaser.Math.Distance.Between(npc.x, npc.y, t.x, t.y) <= t.radius)) {
      mult *= 1.25;
      if (this.npcSkateRecentUntil > time) mult *= 1.25;
    }
    return mult;
  }

  /** Combined multiplier contribution (frost/permafrost slow, block-up slow, skate-trail boost, Rink perk) for the player. */
  getPlayerSpeedMultContribution(time: number, isPlayerIce: boolean): number {
    const player = this.arena.player;
    let mult = 1;
    if (this.playerFrostStacks > 0) mult *= (1 - this.playerFrostStacks * 0.1);
    if (player.permafrostStacks > 0) mult *= (1 - player.permafrostStacks * 0.10);
    if (this.playerBlockUpActive) mult *= 0.5;
    if (isPlayerIce && this.playerIceSpeedBoostUntil > time) mult *= 1.2;
    if (this.arena.hasPerk('player', 'rink') && this.icyTrails.some((t) => t.owner === 'player' && Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= t.radius)) {
      mult *= 1.25;
      if (this.playerSkateRecentUntil > time) mult *= 1.25;
    }
    return mult;
  }

  reset(): void {
    this.playerFrostStacks = 0;
    this.playerFrostStackTimers = [];
    if (this.playerFrostVisual) { this.playerFrostVisual.destroy(); this.playerFrostVisual = null; }
    if (this.playerPermafrostVisual) { this.playerPermafrostVisual.destroy(); this.playerPermafrostVisual = null; }
    if (this.playerPermavoidVisual) { this.playerPermavoidVisual.destroy(); this.playerPermavoidVisual = null; }
    this.playerBlockUpActive = false;
    if (this.playerBlockUpAura) { this.playerBlockUpAura.destroy(); this.playerBlockUpAura = null; }
    this.playerFrozenUntil = 0;
    this.npcBlockUpActive = false;
    if (this.npcBlockUpAura) { this.npcBlockUpAura.destroy(); this.npcBlockUpAura = null; }
    this.icyTrails.forEach((t) => t.sprite.destroy());
    this.icyTrails = [];
    this.playerBlackIceMorphActive = false;
    if (this.playerBlackIceAura) { this.playerBlackIceAura.destroy(); this.playerBlackIceAura = null; }
    this.playerIceSpeedBoostUntil = 0;
    this.playerSlushLastTick = 0;
    this.playerSkateRecentUntil = 0;
    this.npcSkateRecentUntil = 0;
    this.playerSkaterActive = false;
    this.playerSkaterHeading = 0;
    this.playerSkaterTrailAccum = 0;
    this.iceArenas.forEach((a) => a.sprite.destroy());
    this.iceArenas = [];
    this.viralFrostCooldowns.clear();
    this.icicleImpales.forEach((ic) => ic.sprite.destroy());
    this.icicleImpales = [];
    this.icicleImpaleLastCastAt = -999999;
    this.npcIcicleDashActive = false;
    this.npcIcicleDashUntil = 0;
    this.npcIcicleDashHit = false;
    this.icicleDashActive = false;
    this.icicleDashUntil = 0;
    this.icicleDashVx = 0;
    this.icicleDashVy = 0;
    this.icicleDashHitThisDash = false;
  }

  // ── Per-frame update (called when either side is playing Ice) ─────────

  update(time: number, delta: number, isPlayerIce: boolean): void {
    const { player, npc, enemies, scene } = this.arena;

    // Icy trail ticks: slow enemy + inflict frost/void-frost stacks + F+ owner speed boost
    for (let ti = this.icyTrails.length - 1; ti >= 0; ti--) {
      const trail = this.icyTrails[ti];
      if (time >= trail.expiresAt) {
        trail.sprite.destroy();
        this.icyTrails.splice(ti, 1);
        continue;
      }
      // Slow enemies standing in the trail
      if (trail.owner === 'player') {
        const enemiesInTrail: Fighter[] = [];
        for (const enemyTarget of enemies) {
          if (!enemyTarget.active || enemyTarget.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(trail.x, trail.y, enemyTarget.x, enemyTarget.y) <= trail.radius) {
            // Slow via physics body (works for both PvP npc and invasion enemies)
            if (!this.playerBlackIceMorphActive) {
              const eb = enemyTarget.body as Phaser.Physics.Arcade.Body;
              eb.velocity.x *= 0.8; eb.velocity.y *= 0.8;
            }
            // Also update npcSpeedMult for PvP NPC
            if (!this.arena.isInvasion && !this.playerBlackIceMorphActive) this.arena.applyNpcSpeedMult(0.8);
            enemiesInTrail.push(enemyTarget);
          }
        }
        // Tick frost accumulator once per trail, then apply stacks to all enemies in it
        const trailInterval = trail.skater ? 2000 : 1200;
        if (enemiesInTrail.length > 0) {
          trail.frostTickAccum += delta;
          if (trail.frostTickAccum >= trailInterval) {
            trail.frostTickAccum -= trailInterval;
            for (const enemyTarget of enemiesInTrail) this.addFrostStackTo(enemyTarget);
          }
        }
      } else {
        if (Phaser.Math.Distance.Between(trail.x, trail.y, player.x, player.y) <= trail.radius) {
          // Player slow — movement already applied, directly scale current velocity
          const trailPlayerBody = player.body as Phaser.Physics.Arcade.Body;
          trailPlayerBody.velocity.x *= 0.8;
          trailPlayerBody.velocity.y *= 0.8;
          trail.frostTickAccum += delta;
          if (trail.frostTickAccum >= 1200) {
            trail.frostTickAccum -= 1200;
            this.addFrostStack('player');
          }
        }
      }
      // F+: stepping on own trail grants speed boost
      if (this.arena.hasUpgrade('f') && trail.owner === 'player') {
        const ownerDist = Phaser.Math.Distance.Between(trail.x, trail.y, player.x, player.y);
        if (ownerDist <= trail.radius) {
          this.playerIceSpeedBoostUntil = Math.max(this.playerIceSpeedBoostUntil, time + 3000);
        }
      }
      // Rink perk: slippery physics — both fighters slide (low friction) on rink tiles
      if (trail.rink) {
        const playerOnRink = Phaser.Math.Distance.Between(trail.x, trail.y, player.x, player.y) <= trail.radius;
        const npcOnRink    = Phaser.Math.Distance.Between(trail.x, trail.y, npc.x, npc.y) <= trail.radius;
        if (playerOnRink) {
          const pb = player.body as Phaser.Physics.Arcade.Body;
          pb.velocity.x *= 0.985; pb.velocity.y *= 0.985;
        }
        if (npcOnRink) {
          const nb = npc.body as Phaser.Physics.Arcade.Body;
          nb.velocity.x *= 0.985; nb.velocity.y *= 0.985;
        }
      }
    }

    // Skater per-frame heading update (Ice F revamp)
    if (isPlayerIce && this.playerSkaterActive) {
      const ptr = scene.input.activePointer;
      const desired = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
      const diff = Phaser.Math.Angle.Wrap(desired - this.playerSkaterHeading);
      const maxTurn = this.playerSkaterTurnRate * (delta / 1000);
      this.playerSkaterHeading += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
      this.playerSkaterTrailAccum += delta;
      if (this.playerSkaterTrailAccum >= 80) {
        this.playerSkaterTrailAccum -= 80;
        this.spawnIcyTrail(player.x, player.y, 'player', { skater: true });
      }
    }

    // ── Ice Mastery ──────────────────────────────────────────────────
    if (isPlayerIce) {
      // Viral Frost passive: frost/void stacks spread between enemies on contact
      if (this.arena.masteryActive) {
        const vfNow = Date.now();
        for (const source of enemies) {
          if (!source.active || source.hp <= 0) continue;
          const sourceHasVoid = source.voidFrostStacks > 0;
          if (!sourceHasVoid && source.frostStacks === 0) continue;
          for (const victim of enemies) {
            if (victim === source || !victim.active || victim.hp <= 0) continue;
            if (vfNow < (this.viralFrostCooldowns.get(victim) ?? 0)) continue;
            if (Phaser.Math.Distance.Between(source.x, source.y, victim.x, victim.y) > 40) continue;
            this.viralFrostCooldowns.set(victim, vfNow + 1000);
            this.addFrostStackTo(victim, sourceHasVoid);
          }
        }
      }

      // Icicle Impale: dash movement + on-hit impale
      if (this.icicleDashActive) {
        const dashBody = player.body as Phaser.Physics.Arcade.Body;
        if (time >= this.icicleDashUntil) {
          this.icicleDashActive = false;
          dashBody.setVelocity(0, 0);
        } else {
          dashBody.setVelocity(this.icicleDashVx, this.icicleDashVy);
          if (!this.icicleDashHitThisDash) {
            for (const t of enemies) {
              if (!t.active || t.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= ICICLE_HIT_RADIUS) {
                this.icicleDashHitThisDash = true;
                this.impaleTarget(t);
                break;
              }
            }
          }
        }
      }

      // Icicle Impale: live icicles track damage taken by their host, then shatter at threshold
      this.tickIcicleImpales();
    }

    // Ice arena ticks (Skate-in-BlockUp / Skate-in-BlackIce)
    for (let ai = this.iceArenas.length - 1; ai >= 0; ai--) {
      const arenaZone = this.iceArenas[ai];
      arenaZone.sprite.setPosition(arenaZone.x, arenaZone.y);
      if (time >= arenaZone.expiresAt) {
        arenaZone.sprite.destroy();
        this.iceArenas.splice(ai, 1);
        continue;
      }
      arenaZone.tickAccum += delta;
      if (arenaZone.tickAccum >= 2000) {
        arenaZone.tickAccum -= 2000;
        const arenaTargets = arenaZone.owner === 'player' ? (enemies as Fighter[]) : [player as Fighter];
        for (const t of arenaTargets) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(arenaZone.x, arenaZone.y, t.x, t.y) > arenaZone.radius) continue;
          if (arenaZone.isVoid) {
            if (Date.now() >= t.voidImmuneUntil) {
              t.voidFrostStacks = Math.max(t.voidFrostStacks, Math.min(5, t.voidFrostStacks + 1));
              t.incomingDamageMultiplier = this.frostDamageMultiplier(t.voidFrostStacks);
            }
          } else {
            if (Date.now() >= t.frostImmuneUntil) {
              if (t.frostStacks < 5) t.frostStackTimers.push(Date.now() + (this.isImpaled(t) ? ICICLE_EXTENDED_STACK_MS : 8000));
              t.frostStacks = Math.max(t.frostStacks, Math.min(5, t.frostStacks + 1));
              t.incomingDamageMultiplier = this.frostDamageMultiplier(t.frostStacks);
            }
          }
        }
      }
    }

    // Void frost DOT (black ice morph) — 1 dmg/sec per stack, plus any permavoid bonus
    for (const t of enemies) {
      if (!t.active || t.hp <= 0 || t.voidFrostStacks === 0) continue;
      const vfDps = t.voidFrostStacks + t.permavoidStacks;
      t.voidFrostTickAccum += delta;
      if (t.voidFrostTickAccum >= 1000) {
        t.voidFrostTickAccum -= 1000;
        t.takeDamage(vfDps);
        this.arena.spawnHitFlash(t.x, t.y, 0x9900ff);
        this.arena.recordMasteryStat('voidFrostDamage', vfDps);
        this.recordBigHit(vfDps);
      }
    }

    // Frost / void-frost stack expiry — each individual stack fades 8s after being applied.
    // While frozen solid, the countdown is held: nudge timers forward by the
    // elapsed frame delta so they don't lose ground against Date.now().
    {
      const fnow = Date.now();
      if (this.playerFrostStackTimers.length > 0) {
        if (this.playerFrozenUntil > time) {
          this.playerFrostStackTimers = this.playerFrostStackTimers.map((ts) => ts + delta);
        } else {
          const before = this.playerFrostStackTimers.length;
          this.playerFrostStackTimers = this.playerFrostStackTimers.filter((ts) => ts > fnow);
          if (this.playerFrostStackTimers.length !== before) {
            this.playerFrostStacks = this.playerFrostStackTimers.length;
            const baseMult = this.frostDamageMultiplier(this.playerFrostStacks);
            player.incomingDamageMultiplier = this.playerBlackIceMorphActive
              ? baseMult * 1.25
              : this.playerBlockUpActive ? baseMult * 0.75 : baseMult;
          }
        }
      }
      for (const t of enemies) {
        if (t.frostStackTimers.length === 0) continue;
        if (t.frozenUntil > time) {
          t.frostStackTimers = t.frostStackTimers.map((ts) => ts + delta);
          continue;
        }
        const before = t.frostStackTimers.length;
        t.frostStackTimers = t.frostStackTimers.filter((ts) => ts > fnow);
        if (t.frostStackTimers.length === before) continue;
        t.frostStacks = t.frostStackTimers.length;
        const baseMult = this.frostDamageMultiplier(t.frostStacks);
        t.incomingDamageMultiplier = (t === npc && this.npcBlockUpActive) ? baseMult * 0.75 : baseMult;
      }
      for (const t of enemies) {
        if (t.voidFrostStackTimers.length === 0) continue;
        if (t.frozenUntil > time) {
          t.voidFrostStackTimers = t.voidFrostStackTimers.map((ts) => ts + delta);
          continue;
        }
        const before = t.voidFrostStackTimers.length;
        t.voidFrostStackTimers = t.voidFrostStackTimers.filter((ts) => ts > fnow);
        if (t.voidFrostStackTimers.length === before) continue;
        t.voidFrostStacks = t.voidFrostStackTimers.length;
        const baseMult = this.frostDamageMultiplier(t.voidFrostStacks);
        t.incomingDamageMultiplier = (t === npc && this.npcBlockUpActive) ? baseMult * 0.75 : baseMult;
      }
    }

    // Frost visual indicators above enemies
    for (const t of enemies) {
      if (!t.active) continue;
      const frostLabel = t.frostStacks > 0 ? `❄️×${t.frostStacks}` : '';
      if (frostLabel) {
        if (!t.frostVisual) {
          t.frostVisual = scene.add.text(t.x, t.y - 42, frostLabel,
            { fontSize: '12px', fontFamily: 'Arial', color: '#aaddff' }).setOrigin(0.5).setDepth(10);
        } else {
          t.frostVisual.setText(frostLabel).setPosition(t.x, t.y - 42);
        }
      } else if (t.frostVisual) {
        t.frostVisual.destroy(); t.frostVisual = null;
      }

      const pfLabel = t.permafrostStacks > 0 ? `🧊×${t.permafrostStacks}` : '';
      if (pfLabel) {
        if (!t.permafrostVisual) {
          t.permafrostVisual = scene.add.text(t.x, t.y - 78, pfLabel,
            { fontSize: '11px', fontFamily: 'Arial', color: '#88eeff' }).setOrigin(0.5).setDepth(10);
        } else {
          t.permafrostVisual.setText(pfLabel).setPosition(t.x, t.y - 78);
        }
      } else if (t.permafrostVisual) {
        t.permafrostVisual.destroy(); t.permafrostVisual = null;
      }

      const pvLabel = t.permavoidStacks > 0 ? `💜×${t.permavoidStacks}` : '';
      if (pvLabel) {
        if (!t.permavoidVisual) {
          t.permavoidVisual = scene.add.text(t.x, t.y - 90, pvLabel,
            { fontSize: '11px', fontFamily: 'Arial', color: '#cc44ff' }).setOrigin(0.5).setDepth(10);
        } else {
          t.permavoidVisual.setText(pvLabel).setPosition(t.x, t.y - 90);
        }
      } else if (t.permavoidVisual) {
        t.permavoidVisual.destroy(); t.permavoidVisual = null;
      }
    }

    // Void frost visual
    const vfLabel = npc.voidFrostStacks > 0 ? `☠️×${npc.voidFrostStacks}` : '';
    if (vfLabel) {
      if (!npc.voidFrostVisual) {
        npc.voidFrostVisual = scene.add.text(npc.x, npc.y - 54, vfLabel,
          { fontSize: '12px', fontFamily: 'Arial', color: '#cc88ff' }).setOrigin(0.5).setDepth(10);
      } else {
        npc.voidFrostVisual.setText(vfLabel).setPosition(npc.x, npc.y - 54);
      }
    } else if (npc.voidFrostVisual) {
      npc.voidFrostVisual.destroy(); npc.voidFrostVisual = null;
    }

    const frostPlayerLabel = this.playerFrostStacks > 0 ? `❄️×${this.playerFrostStacks}` : '';
    if (frostPlayerLabel) {
      if (!this.playerFrostVisual) {
        this.playerFrostVisual = scene.add.text(player.x, player.y - 42, frostPlayerLabel,
          { fontSize: '12px', fontFamily: 'Arial', color: '#aaddff' }).setOrigin(0.5).setDepth(10);
      } else {
        this.playerFrostVisual.setText(frostPlayerLabel).setPosition(player.x, player.y - 42);
      }
    } else if (this.playerFrostVisual) {
      this.playerFrostVisual.destroy(); this.playerFrostVisual = null;
    }

    const playerPfLabel = player.permafrostStacks > 0 ? `🧊×${player.permafrostStacks}` : '';
    if (playerPfLabel) {
      if (!this.playerPermafrostVisual) {
        this.playerPermafrostVisual = scene.add.text(player.x, player.y - 54, playerPfLabel,
          { fontSize: '11px', fontFamily: 'Arial', color: '#88eeff' }).setOrigin(0.5).setDepth(10);
      } else {
        this.playerPermafrostVisual.setText(playerPfLabel).setPosition(player.x, player.y - 54);
      }
    } else if (this.playerPermafrostVisual) {
      this.playerPermafrostVisual.destroy(); this.playerPermafrostVisual = null;
    }

    const playerPvLabel = player.permavoidStacks > 0 ? `💜×${player.permavoidStacks}` : '';
    if (playerPvLabel) {
      if (!this.playerPermavoidVisual) {
        this.playerPermavoidVisual = scene.add.text(player.x, player.y - 66, playerPvLabel,
          { fontSize: '11px', fontFamily: 'Arial', color: '#cc44ff' }).setOrigin(0.5).setDepth(10);
      } else {
        this.playerPermavoidVisual.setText(playerPvLabel).setPosition(player.x, player.y - 66);
      }
    } else if (this.playerPermavoidVisual) {
      this.playerPermavoidVisual.destroy(); this.playerPermavoidVisual = null;
    }

    // Block up aura positions
    if (this.playerBlockUpAura) this.playerBlockUpAura.setPosition(player.x, player.y);
    if (this.npcBlockUpAura) this.npcBlockUpAura.setPosition(npc.x, npc.y);
    if (this.playerBlackIceAura) this.playerBlackIceAura.setPosition(player.x, player.y);

    // Frozen overlays (blue tint flash)
    if (this.playerFrozenUntil > 0 && time >= this.playerFrozenUntil) {
      this.playerFrozenUntil = 0;
    }
    if (npc.frozenUntil > 0 && time >= npc.frozenUntil) {
      npc.frozenUntil = 0;
    }
  }

  // ── Input ────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.arena.nukeChanneling) return;
    const { player, fKey, eKey, rKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Ice Mastery — Icicle Impale may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const icicleSlot = this.arena.masteryActive ? this.icicleImpaleSlot() : null;

    if (icicleSlot === 'f') {
      if (Phaser.Input.Keyboard.JustDown(fKey)) this.tryCastIcicleImpale(time);
    } else if (Phaser.Input.Keyboard.JustDown(fKey)) {
      // While active, recast always cancels — even mid-cooldown — so bypass the
      // normal cooldown-gated castAbility() and call the cast fn directly.
      if (this.playerSkaterActive) playerCtx.startSkate();
      else player.castAbility('skate', playerCtx);
    }
    if (!this.playerSkaterActive) {
      if (icicleSlot === 'e') {
        if (Phaser.Input.Keyboard.JustDown(eKey)) this.tryCastIcicleImpale(time);
      } else if (Phaser.Input.Keyboard.JustDown(eKey)) {
        player.castAbility('frost-blast', playerCtx);
      }
      if (icicleSlot === 'r') {
        if (Phaser.Input.Keyboard.JustDown(rKey)) this.tryCastIcicleImpale(time);
      } else if (Phaser.Input.Keyboard.JustDown(rKey)) {
        player.castAbility('block-up', playerCtx);
      }
      if (icicleSlot === 'q') {
        if (Phaser.Input.Keyboard.JustDown(qKey)) this.tryCastIcicleImpale(time);
      } else if (Phaser.Input.Keyboard.JustDown(qKey)) {
        player.castAbility('frozen-solid', playerCtx);
      }
      if (pointer.isDown) {
        if (this.arena.hasUpgrade('click')) {
          if (!this.arena.pointerWasDown) {
            player.castAbility('ice-spike', playerCtx);
            this.playerSlushLastTick = time;
          } else if (time - this.playerSlushLastTick >= 200) {
            this.playerSlushLastTick = time;
            this.fireSlushThrower(mouseX, mouseY);
          }
        } else {
          player.castAbility('ice-spike', playerCtx);
        }
      }
    }
  }

  // ── Projectile hit reactions ────────────────────────────────────────

  /** NPC's ice spike hit the player: frost stack + unfreeze bonus. */
  onIceSpikeHitPlayer(time: number): void {
    if (this.playerFrozenUntil > time) {
      this.playerFrozenUntil = 0;
      for (let fi = 0; fi < 3; fi++) this.addFrostStack('player');
    } else {
      this.addFrostStack('player');
    }
  }

  /** Player's ice spike hit an enemy: frost stack + unfreeze bonus. */
  onIceSpikeHitEnemy(target: Fighter, time: number): void {
    if (target.frozenUntil > time) {
      target.frozenUntil = 0;
      for (let fi = 0; fi < 3; fi++) this.addFrostStackTo(target);
    } else {
      this.addFrostStackTo(target);
    }
  }

  // ── Cast context implementations — player ──────────────────────────

  doFireIceSpike(tx: number, ty: number): void {
    const { player, scene, projectiles } = this.arena;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const proj = new Projectile(scene, player.x, player.y, 'proj-ice', 8, true);
    if (this.playerBlackIceMorphActive) proj.setTint(0x9900ff);
    projectiles.add(proj);
    proj.launch((dx / len) * 520, (dy / len) * 520);
  }

  doFireFrostBlast(tx: number, ty: number): void {
    const { player, enemies, scene } = this.arena;
    const time = scene.time.now;
    const isBlackIce = this.playerBlackIceMorphActive;
    const hasTarget = enemies.some((t) =>
      t.active && t.hp > 0 && (isBlackIce ? t.voidFrostStacks : t.frostStacks) > 0,
    );
    if (!hasTarget) return;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy / len, dx / len);
    const endX = player.x + Math.cos(angle) * 1200;
    const endY = player.y + Math.sin(angle) * 1200;
    this.spawnFrostBeamVisual(player.x, player.y, endX, endY, isBlackIce);
    for (const t of enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (isBlackIce ? t.voidFrostStacks === 0 : t.frostStacks === 0) continue;
      const d = this.arena.pointToSegmentDist(t.x, t.y, player.x, player.y, endX, endY);
      if (d > 32) continue;
      this.arena.spawnHitFlash(t.x, t.y, isBlackIce ? 0x9900ff : 0x88ccff);
      // 3s immunity to new frost/void stacks (permafrost/permavoid unaffected)
      t.frostImmuneUntil = Math.max(t.frostImmuneUntil, time + 3000);
      t.voidImmuneUntil  = Math.max(t.voidImmuneUntil,  time + 3000);
      if (isBlackIce) {
        // Detonate: instantly deal all the DOT damage the remaining void frost duration would have dealt.
        const fnow = Date.now();
        const detonateDamage = Math.round(
          t.voidFrostStackTimers.reduce((sum, ts) => sum + Math.max(0, ts - fnow), 0) / 1000,
        );
        t.takeDamage(detonateDamage);
        if (detonateDamage > 0) {
          this.arena.recordMasteryStat('voidFrostDamage', detonateDamage);
          this.recordBigHit(detonateDamage);
        }
        t.voidFrostStacks = 0;
        t.voidFrostStackTimers = [];
        t.incomingDamageMultiplier = (t === this.arena.npc && this.npcBlockUpActive) ? 0.75 : 1;
        const vt = scene.add.text(t.x, t.y - 30, 'DETONATED', { fontSize: '11px', color: '#cc88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        scene.tweens.add({ targets: vt, y: vt.y - 20, alpha: 0, duration: 1200, onComplete: () => vt.destroy() });
      } else {
        const targetStacks = t.frostStacks;
        if (targetStacks >= 5) this.arena.recordMasteryStat('frostBlast5StackHits', 1);
        const blastDamage = Math.round(targetStacks * 7.5);
        t.takeDamage(blastDamage);
        this.recordBigHit(blastDamage);
        // E+: keep residual frost stacks
        if (this.arena.hasUpgrade('e')) {
          const stacks = t.frostStacks;
          t.frostStacks = 0;
          t.incomingDamageMultiplier = 1;
          if (stacks >= 5) {
            t.frostStacks = 2;
            t.incomingDamageMultiplier = this.frostDamageMultiplier(2);
          } else if (stacks >= 3) {
            t.frostStacks = 1;
            t.incomingDamageMultiplier = this.frostDamageMultiplier(1);
          }
        } else {
          t.frostStacks = 0;
          t.incomingDamageMultiplier = 1;
        }
        t.frostStackTimers = t.frostStacks > 0 ? t.frostStackTimers.slice(-t.frostStacks) : [];
      }
    }
  }

  doToggleBlockUp(): void {
    const { player, scene } = this.arena;
    if (this.arena.hasUpgrade('r')) {
      // R+: Black Ice Morph replaces Block Up
      this.playerBlackIceMorphActive = !this.playerBlackIceMorphActive;
      this.convertEnemyFrostStacks(this.playerBlackIceMorphActive);
      if (this.playerBlackIceMorphActive) {
        player.incomingDamageMultiplier = this.frostDamageMultiplier(this.playerFrostStacks) * 1.25;
        player.setTint(0x9900ff);
        if (!this.playerBlackIceAura) {
          this.playerBlackIceAura = scene.add.circle(player.x, player.y, 30, 0x220044, 0.4)
            .setStrokeStyle(2, 0x9900ff, 0.9).setDepth(3);
        }
        const mt = scene.add.text(player.x, player.y - 36, 'BLACK ICE', { fontSize: '11px', color: '#cc88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        scene.tweens.add({ targets: mt, y: mt.y - 20, alpha: 0, duration: 1200, onComplete: () => mt.destroy() });
      } else {
        player.incomingDamageMultiplier = this.frostDamageMultiplier(this.playerFrostStacks);
        player.clearTint();
        if (this.playerBlackIceAura) { this.playerBlackIceAura.destroy(); this.playerBlackIceAura = null; }
        player.applySelfDamage(15);
        player.sizeMult = Math.max(0.3, player.sizeMult * 0.85);
        player.applySizeMult();
        this.arena.showFloatingText(player.x, player.y - 30, '💢 SHATTERED', '#cc88ff');
      }
    } else {
      this.playerBlockUpActive = !this.playerBlockUpActive;
      player.incomingDamageMultiplier = this.playerBlockUpActive
        ? this.frostDamageMultiplier(this.playerFrostStacks) * 0.75
        : this.frostDamageMultiplier(this.playerFrostStacks);
      if (this.playerBlockUpActive) {
        if (!this.playerBlockUpAura) {
          this.playerBlockUpAura = scene.add.circle(player.x, player.y, 28, 0x88ccff, 0.25)
            .setStrokeStyle(2, 0xcceeff, 0.8).setDepth(3);
        }
      } else {
        if (this.playerBlockUpAura) { this.playerBlockUpAura.destroy(); this.playerBlockUpAura = null; }
      }
    }
  }

  doStartSkate(): void {
    const { player, scene } = this.arena;
    const time = scene.time.now;
    if (this.playerSkaterActive) {
      // Recast cancels skater mode and starts cooldown — always allowed, even mid-cooldown.
      this.playerSkaterActive = false;
      player.startCooldown('skate');
      return;
    }
    // Determine initial heading toward cursor
    const ptr = scene.input.activePointer;
    this.playerSkaterHeading = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    this.playerSkaterTrailAccum = 0;
    this.playerSkaterActive = true;
    // F+ synergies: spawn ice arena based on current state
    if (this.arena.hasUpgrade('f')) {
      if (this.playerBlackIceMorphActive) {
        this.spawnIceArena('player', true);
      } else if (this.playerBlockUpActive) {
        this.spawnIceArena('player', false);
      }
    }
    // Rink perk: record recent skate timestamp for bonus speed
    if (this.arena.hasPerk('player', 'rink')) this.playerSkateRecentUntil = time + 2000;
  }

  /** `noFrostStacks` — Subterfuge's Dark Treachery ice-Q copy freezes without applying frost. */
  doFireFrozenSolid(tx: number, ty: number, noFrostStacks = false): void {
    const { player, enemies, scene } = this.arena;
    const time = scene.time.now;
    const isBlackIce = this.playerBlackIceMorphActive;
    const angle = Math.atan2(ty - player.y, tx - player.x);
    this.spawnFrozenSolidVisual(player.x, player.y, angle, isBlackIce);
    for (const t of enemies) {
      if (!t.active || t.hp <= 0) continue;
      const tAngle = Math.atan2(t.y - player.y, t.x - player.x);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(tAngle - angle));
      if (diff <= Math.PI / 8) {
        if (t.frozenUntil > time) {
          t.frozenUntil = 0;
          this.arena.spawnHitFlash(t.x, t.y, isBlackIce ? 0x9900ff : 0x88ccff);
          if (!noFrostStacks) { for (let fi = 0; fi < 3; fi++) this.addFrostStackTo(t); }
        } else {
          t.frozenUntil = time + 3000;
          this.arena.spawnHitFlash(t.x, t.y, isBlackIce ? 0x9900ff : 0x88ccff);
          if (this.arena.hasUpgrade('q')) t.frozenSolidAmpReady = true;
        }
      }
    }
    // Rink perk: tile the cone with icy trails lasting 8s
    if (this.arena.hasPerk('player', 'rink')) this.spawnRinkConeTiles(player.x, player.y, angle, 'player');
  }

  // ── Cast context implementations — NPC ──────────────────────────────

  doNpcFireIceSpike(tx: number, ty: number): void {
    const { npc, scene, projectiles } = this.arena;
    const dx = tx - npc.x;
    const dy = ty - npc.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const proj = new Projectile(scene, npc.x, npc.y, 'proj-ice', 8, false);
    projectiles.add(proj);
    proj.launch((dx / len) * 480, (dy / len) * 480);
  }

  doNpcFireFrostBlast(tx: number, ty: number): void {
    const { player, npc, scene } = this.arena;
    if (this.playerFrostStacks === 0) return;
    const dx = tx - npc.x;
    const dy = ty - npc.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy / len, dx / len);
    const endX = npc.x + Math.cos(angle) * 1200;
    const endY = npc.y + Math.sin(angle) * 1200;
    this.spawnFrostBeamVisual(npc.x, npc.y, endX, endY);
    const d = this.arena.pointToSegmentDist(player.x, player.y, npc.x, npc.y, endX, endY);
    if (d <= 32) {
      player.takeDamage(Math.round(this.playerFrostStacks * 7.5));
      this.arena.spawnHitFlash(player.x, player.y, 0x88ccff);
      this.clearFrostStacks('player');
    }
    void scene;
  }

  doNpcToggleBlockUp(): void {
    const { npc, scene } = this.arena;
    this.npcBlockUpActive = !this.npcBlockUpActive;
    npc.incomingDamageMultiplier = this.npcBlockUpActive
      ? this.frostDamageMultiplier(npc.frostStacks) * 0.75
      : this.frostDamageMultiplier(npc.frostStacks);
    if (this.npcBlockUpActive) {
      if (!this.npcBlockUpAura) {
        this.npcBlockUpAura = scene.add.circle(npc.x, npc.y, 28, 0x88ccff, 0.25)
          .setStrokeStyle(2, 0xcceeff, 0.8).setDepth(3);
      }
    } else {
      if (this.npcBlockUpAura) { this.npcBlockUpAura.destroy(); this.npcBlockUpAura = null; }
    }
  }

  doNpcStartSkate(): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    // NPC skate: dash away from player + leave trail
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nBody = npc.body as Phaser.Physics.Arcade.Body;
    nBody.setVelocity((dx / len) * 620, (dy / len) * 620);
    npc.isInvincible = true;
    for (let i = 0; i < 4; i++) {
      scene.time.delayedCall(i * 55, () => {
        if (npc.active) this.spawnIcyTrail(npc.x, npc.y, 'npc');
      });
    }
    scene.time.delayedCall(220, () => { if (npc.active) npc.isInvincible = false; });
    // Rink perk: record recent skate timestamp for bonus speed
    if (this.arena.hasPerk('npc', 'rink')) this.npcSkateRecentUntil = time + 2000;
  }

  doNpcFireFrozenSolid(tx: number, ty: number, noFrostStacks = false): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    const angle = Math.atan2(ty - npc.y, tx - npc.x);
    this.spawnFrozenSolidVisual(npc.x, npc.y, angle);
    const playerAngle = Math.atan2(player.y - npc.y, player.x - npc.x);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(playerAngle - angle));
    if (diff <= Math.PI / 8) {
      if (this.playerFrozenUntil > time) {
        this.playerFrozenUntil = 0;
        if (!noFrostStacks) { for (let fi = 0; fi < 3; fi++) this.addFrostStack('player'); }
      } else {
        this.playerFrozenUntil = time + 3000;
        this.arena.spawnHitFlash(player.x, player.y, 0x88ccff);
      }
    }
    // Rink perk: tile the cone with icy trails lasting 8s
    if (this.arena.hasPerk('npc', 'rink')) this.spawnRinkConeTiles(npc.x, npc.y, angle, 'npc');
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private frostDamageMultiplier(stacks: number): number {
    if (stacks >= 7) return 1.75;
    if (stacks >= 6) return 1.60;
    if (stacks >= 5) return 1.45;
    if (stacks >= 4) return 1.30;
    if (stacks >= 3) return 1.20;
    return 1.0;
  }

  /** Ice Mastery — Icicle Impale: true while `f` currently carries a live (unshattered) icicle. */
  private isImpaled(f: Fighter): boolean {
    return this.icicleImpales.some((ic) => ic.target === f);
  }

  /** Ice Mastery requirement: deal over 50 damage in a single hit, 5 times. */
  private recordBigHit(amount: number): void {
    if (amount > BIG_HIT_THRESHOLD) this.arena.recordMasteryStat('bigHits', 1);
  }

  /**
   * Public: applies one frost (or void-frost) stack to any fighter — used by InvasionKit for husk
   * status effects. Defaults to whichever type Black Ice Morph implies; pass `forceVoid` to apply a
   * specific type regardless of morph state (used by Viral Frost to mirror the spreading source).
   * Never stomps a stack count already elevated past 5 by an Icicle Impale shatter.
   */
  addFrostStackTo(f: Fighter, forceVoid?: boolean): void {
    const useVoid = forceVoid ?? this.playerBlackIceMorphActive;
    const stackMs = this.isImpaled(f) ? ICICLE_EXTENDED_STACK_MS : 8000;
    if (useVoid) {
      if (Date.now() < f.voidImmuneUntil) return;
      if (f.voidFrostStacks < 5) f.voidFrostStackTimers.push(Date.now() + stackMs);
      f.voidFrostStacks = Math.max(f.voidFrostStacks, Math.min(5, f.voidFrostStacks + 1));
      f.incomingDamageMultiplier = this.frostDamageMultiplier(f.voidFrostStacks);
    } else {
      if (Date.now() < f.frostImmuneUntil) return;
      if (f.frostStacks < 5) f.frostStackTimers.push(Date.now() + stackMs);
      f.frostStacks = Math.max(f.frostStacks, Math.min(5, f.frostStacks + 1));
      f.incomingDamageMultiplier = this.frostDamageMultiplier(f.frostStacks);
    }
  }

  private addFrostStack(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      this.addFrostStackTo(this.arena.npc);
    } else {
      const player = this.arena.player;
      if (Date.now() < player.frostImmuneUntil) return;
      if (this.playerFrostStacks < 5) this.playerFrostStackTimers.push(Date.now() + 8000);
      this.playerFrostStacks = Math.min(5, this.playerFrostStacks + 1);
      const baseMult = this.frostDamageMultiplier(this.playerFrostStacks);
      player.incomingDamageMultiplier = this.playerBlackIceMorphActive ? baseMult * 1.25 : baseMult;
    }
  }

  /** R+ Black Ice toggle: swaps all of the enemy's frost stacks for void frost (or back), carrying over remaining duration. */
  private convertEnemyFrostStacks(enteringBlackIce: boolean): void {
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (enteringBlackIce) {
        if (t.frostStacks === 0) continue;
        t.voidFrostStackTimers = [...t.voidFrostStackTimers, ...t.frostStackTimers].slice(-5);
        t.voidFrostStacks = t.voidFrostStackTimers.length;
        t.frostStacks = 0;
        t.frostStackTimers = [];
        const baseMult = this.frostDamageMultiplier(t.voidFrostStacks);
        t.incomingDamageMultiplier = (t === this.arena.npc && this.npcBlockUpActive) ? baseMult * 0.75 : baseMult;
        this.arena.showFloatingText(t.x, t.y - 30, '🖤 VOID FROST', '#cc88ff');
      } else {
        if (t.voidFrostStacks === 0) continue;
        t.frostStackTimers = [...t.frostStackTimers, ...t.voidFrostStackTimers].slice(-5);
        t.frostStacks = t.frostStackTimers.length;
        t.voidFrostStacks = 0;
        t.voidFrostStackTimers = [];
        const baseMult = this.frostDamageMultiplier(t.frostStacks);
        t.incomingDamageMultiplier = (t === this.arena.npc && this.npcBlockUpActive) ? baseMult * 0.75 : baseMult;
        this.arena.showFloatingText(t.x, t.y - 30, '❄️ FROST', '#aaddff');
      }
    }
  }

  /** Click+ Slush Thrower: close-range cone, low damage, refreshes (doesn't add) frost stack duration on hit. */
  private fireSlushThrower(tx: number, ty: number): void {
    const { player, enemies, scene } = this.arena;
    const range = 150;
    const halfAngleCos = 0.8; // ~37° half-angle
    const halfAngleRad = Math.acos(halfAngleCos);
    const damage = 2;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const baseAngle = Math.atan2(ny, nx);
    const isBlackIce = this.playerBlackIceMorphActive;

    // Flamethrower-style spray: a burst of small puffs scattered across the cone, each
    // drifting out to its own random distance and fading — not a single static cloud.
    const puffCount = 8;
    for (let i = 0; i < puffCount; i++) {
      const ang = baseAngle + (Math.random() - 0.5) * 2 * halfAngleRad;
      const dist = 36 + Math.random() * (range - 36);
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const startX = player.x + cosA * 16;
      const startY = player.y + sinA * 16;
      const endX = player.x + cosA * dist;
      const endY = player.y + sinA * dist;
      const size = 5 + Math.random() * 7;
      const color = isBlackIce
        ? (Math.random() < 0.5 ? 0x9900ff : 0xcc88ff)
        : (Math.random() < 0.5 ? 0x88ccff : 0xcceeff);
      const puff = scene.add.circle(startX, startY, size, color, 0.85 - Math.random() * 0.25).setDepth(8);
      scene.tweens.add({
        targets: puff, x: endX, y: endY, alpha: 0, scaleX: 1.5, scaleY: 1.5,
        duration: 160 + Math.random() * 120,
        onComplete: () => puff.destroy(),
      });
    }

    for (const t of enemies) {
      if (!t.active || t.hp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
      if (dist > range) continue;
      const dot = (nx * (t.x - player.x) + ny * (t.y - player.y)) / dist;
      if (dot < halfAngleCos) continue;

      t.takeDamage(damage);
      this.arena.spawnHitFlash(t.x, t.y, isBlackIce ? 0x9900ff : 0x88ccff);

      if (isBlackIce) {
        if (t.voidFrostStackTimers.length > 0) {
          const freshExpiry = Date.now() + 8000;
          t.voidFrostStackTimers = t.voidFrostStackTimers.map(() => freshExpiry);
        }
      } else if (t.frostStackTimers.length > 0) {
        const freshExpiry = Date.now() + 8000;
        t.frostStackTimers = t.frostStackTimers.map(() => freshExpiry);
      }
    }
  }

  private clearFrostStacks(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      this.arena.npc.frostStacks = 0;
      this.arena.npc.frostStackTimers = [];
      this.arena.npc.incomingDamageMultiplier = 1;
    } else {
      this.playerFrostStacks = 0;
      this.playerFrostStackTimers = [];
      this.arena.player.incomingDamageMultiplier = this.playerBlackIceMorphActive ? 1.25 : 1;
    }
  }

  // ── Ice Mastery: Icicle Impale ──────────────────────────────────────

  /** The slot Icicle Impale is bound over this match, or null when it isn't bound anywhere. */
  private icicleImpaleSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'icicle-impale') return s;
    }
    return null;
  }

  private tryCastIcicleImpale(time: number): void {
    if (time - this.icicleImpaleLastCastAt < ICICLE_IMPALE_COOLDOWN_MS) return;
    this.icicleImpaleLastCastAt = time;
    const { player, scene } = this.arena;
    player.triggerCooldown('icicle-impale');
    const ptr = scene.input.activePointer;
    const angle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    this.icicleDashActive = true;
    this.icicleDashUntil = time + ICICLE_DASH_DURATION_MS;
    this.icicleDashVx = Math.cos(angle) * ICICLE_DASH_SPEED;
    this.icicleDashVy = Math.sin(angle) * ICICLE_DASH_SPEED;
    this.icicleDashHitThisDash = false;
    this.arena.showFloatingText(player.x, player.y - 30, '🧊 ICICLE IMPALE', '#aaddff');
  }

  /** Live icicles track damage taken by their host and shatter at the threshold. Owner-agnostic. */
  private tickIcicleImpales(): void {
    for (let ii = this.icicleImpales.length - 1; ii >= 0; ii--) {
      const ic = this.icicleImpales[ii];
      if (!ic.target.active || ic.target.hp <= 0) {
        ic.sprite.destroy();
        this.icicleImpales.splice(ii, 1);
        continue;
      }
      this.drawIcicle(ic.sprite, ic.target.x, ic.target.y, ic.isVoid);
      const dmgSinceLast = Math.max(0, ic.lastHp - ic.target.hp);
      ic.lastHp = ic.target.hp;
      if (dmgSinceLast > 0) {
        ic.damageTaken += dmgSinceLast;
        if (ic.damageTaken >= ICICLE_SHATTER_DAMAGE_THRESHOLD) {
          this.shatterIcicle(ic);
          ic.sprite.destroy();
          this.icicleImpales.splice(ii, 1);
        }
      }
    }
  }

  /** Online replay: the remote ice player cast Icicle Impale — impale us as their dash reaches us. */
  doNpcIcicleImpale(): void {
    this.npcIcicleDashActive = true;
    this.npcIcicleDashUntil = this.arena.scene.time.now + ICICLE_DASH_DURATION_MS;
    this.npcIcicleDashHit = false;
  }

  /** Online: opponent is ice — watch their replayed dash for impact and track live icicles on us. */
  updateNpc(time: number): void {
    const { npc, player } = this.arena;
    if (this.npcIcicleDashActive) {
      if (time >= this.npcIcicleDashUntil) {
        this.npcIcicleDashActive = false;
      } else if (!this.npcIcicleDashHit && player.active && player.hp > 0
        && Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) <= ICICLE_HIT_RADIUS) {
        this.npcIcicleDashHit = true;
        this.impaleTarget(player);
      }
    }
    this.tickIcicleImpales();
  }

  private impaleTarget(target: Fighter): void {
    const scene = this.arena.scene;
    // Drop any existing icicle already tracking this target — a fresh impale replaces it.
    const existingIdx = this.icicleImpales.findIndex((ic) => ic.target === target);
    if (existingIdx >= 0) {
      this.icicleImpales[existingIdx].sprite.destroy();
      this.icicleImpales.splice(existingIdx, 1);
    }
    const isVoid = target.voidFrostStacks > 0;
    const sprite = scene.add.graphics().setDepth(11);
    this.drawIcicle(sprite, target.x, target.y, isVoid);
    this.icicleImpales.push({ target, sprite, lastHp: target.hp, damageTaken: 0, isVoid });
    this.arena.spawnHitFlash(target.x, target.y, isVoid ? 0x9900ff : 0x1a4a7a);
    this.arena.showFloatingText(target.x, target.y - 30, '🧊 IMPALED', '#aaddff');
  }

  private drawIcicle(g: Phaser.GameObjects.Graphics, x: number, y: number, isVoid: boolean): void {
    g.clear();
    g.fillStyle(isVoid ? 0x6622aa : 0x1a4a7a, 0.95);
    g.lineStyle(2, isVoid ? 0xcc88ff : 0xaaddff, 0.9);
    g.beginPath();
    g.moveTo(x - 7, y - 46);
    g.lineTo(x + 7, y - 46);
    g.lineTo(x, y - 22);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private shatterIcicle(ic: IceIcicle): void {
    const t = ic.target;
    const useVoid = t.voidFrostStacks > 0 || (t.frostStacks === 0 && ic.isVoid);
    const fresh = Date.now() + ICICLE_EXTENDED_STACK_MS;
    if (useVoid) {
      const add = Math.min(2, Math.max(0, ICICLE_STACK_HARD_CAP - t.voidFrostStacks));
      for (let i = 0; i < add; i++) t.voidFrostStackTimers.push(fresh);
      t.voidFrostStacks = Math.min(ICICLE_STACK_HARD_CAP, t.voidFrostStacks + add);
      t.incomingDamageMultiplier = this.frostDamageMultiplier(t.voidFrostStacks);
    } else {
      const add = Math.min(2, Math.max(0, ICICLE_STACK_HARD_CAP - t.frostStacks));
      for (let i = 0; i < add; i++) t.frostStackTimers.push(fresh);
      t.frostStacks = Math.min(ICICLE_STACK_HARD_CAP, t.frostStacks + add);
      t.incomingDamageMultiplier = this.frostDamageMultiplier(t.frostStacks);
    }
    this.arena.spawnHitFlash(t.x, t.y, useVoid ? 0x9900ff : 0x1a4a7a);
    this.arena.showFloatingText(t.x, t.y - 30, '💥 SHATTER', '#aaddff');
  }

  private spawnIcyTrail(x: number, y: number, owner: 'player' | 'npc', opts?: { skater?: boolean }): void {
    const { scene } = this.arena;
    const isVoid = owner === 'player' && this.playerBlackIceMorphActive;
    const fillColor = isVoid ? 0x440066 : 0x88ccff;
    const strokeColor = isVoid ? 0x9900ff : 0xcceeff;
    const spr = scene.add.circle(x, y, 32, fillColor, 0.35).setDepth(2)
      .setStrokeStyle(1, strokeColor, 0.5);
    scene.tweens.add({ targets: spr, alpha: 0.15, duration: 4800, yoyo: true, repeat: 0 });
    this.icyTrails.push({ sprite: spr, expiresAt: scene.time.now + 5000, x, y, radius: 32, frostTickAccum: 0, owner, skater: opts?.skater });
  }

  private spawnRinkConeTiles(ox: number, oy: number, angle: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const half = Math.PI / 8;
    const steps = [0.15, 0.3, 0.45, 0.6, 0.72, 0.84, 0.92, 1.0];
    const offsets = [-0.6, -0.25, 0.25, 0.6];
    for (const t of steps) {
      const r = t * 1200;
      for (const ao of offsets) {
        const a = angle + ao * half;
        const tx = ox + Math.cos(a) * r;
        const ty = oy + Math.sin(a) * r;
        const spr = scene.add.circle(tx, ty, 28, 0x55ddff, 0.4).setDepth(2)
          .setStrokeStyle(1, 0xaaffff, 0.7);
        scene.tweens.add({ targets: spr, alpha: 0.1, duration: 7000, yoyo: false, repeat: 0 });
        this.icyTrails.push({ sprite: spr, expiresAt: scene.time.now + 8000, x: tx, y: ty, radius: 28, frostTickAccum: 0, owner, rink: true });
      }
    }
  }

  private spawnFrozenSolidVisual(x: number, y: number, angle: number, isVoid = false): void {
    const { scene } = this.arena;
    const gfx = scene.add.graphics().setDepth(7);
    const half = Math.PI / 8; // 22.5° half-angle
    const len = 1200;
    gfx.fillStyle(isVoid ? 0x440066 : 0x88ccff, 0.25);
    gfx.lineStyle(2, isVoid ? 0x9900ff : 0xcceeff, 0.8);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x + Math.cos(angle - half) * len, y + Math.sin(angle - half) * len);
    gfx.lineTo(x + Math.cos(angle + half) * len, y + Math.sin(angle + half) * len);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
    scene.tweens.add({ targets: gfx, alpha: 0, duration: 450, onComplete: () => gfx.destroy() });
  }

  private spawnIceArena(owner: 'player' | 'npc', isVoid: boolean): void {
    const { player, npc, enemies, scene } = this.arena;
    const fighter = owner === 'player' ? player : npc;
    const radius = isVoid ? 60 : 120;
    const fill = isVoid ? 0x440066 : 0x88ccff;
    const stroke = isVoid ? 0x9900ff : 0xcceeff;
    const sprite = scene.add.circle(fighter.x, fighter.y, radius, fill, 0.20)
      .setStrokeStyle(2, stroke, 0.8).setDepth(2);
    this.iceArenas.push({
      sprite, x: fighter.x, y: fighter.y, radius,
      expiresAt: scene.time.now + 5000, tickAccum: 0, isVoid, owner,
    });
    // Initial creation: permafrost or permavoid on any enemy inside the radius
    const targets = owner === 'player' ? (enemies as Fighter[]) : [player as Fighter];
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(fighter.x, fighter.y, t.x, t.y);
      if (d > radius) continue;
      if (isVoid) {
        t.permavoidStacks = Math.min(3, t.permavoidStacks + 1);
        this.arena.showFloatingText(t.x, t.y - 30, '🟣 PERMAVOID', '#cc88ff');
      } else {
        t.permafrostStacks = Math.min(3, t.permafrostStacks + 1);
        this.arena.showFloatingText(t.x, t.y - 30, '❄️ PERMAFROST', '#aaddff');
      }
    }
    this.arena.showFloatingText(fighter.x, fighter.y - 30, isVoid ? '🖤 DARK ICE ARENA' : '❄️ ICE ARENA', isVoid ? '#9900ff' : '#88ccff');
  }

  private spawnFrostBeamVisual(x1: number, y1: number, x2: number, y2: number, isVoid = false): void {
    const { scene } = this.arena;
    const gfx = scene.add.graphics().setDepth(8);
    gfx.lineStyle(10, isVoid ? 0x9900ff : 0x88ccff, 0.7);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(3, 0xffffff, 0.9);
    gfx.lineBetween(x1, y1, x2, y2);
    scene.tweens.add({ targets: gfx, alpha: 0, duration: 280, onComplete: () => gfx.destroy() });
  }
}
