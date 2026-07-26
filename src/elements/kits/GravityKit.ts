import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  GRAVITY, GravityAvatar, GravityColorFn, GravityFx, GravityTones, GravityWell, METEOR_TONES,
  MOON_TONES, NPC_TONES, VOID_TONES, tonesFor,
} from './GravityVisuals';

/**
 * Every gravity ability — the player's and the NPC's alike — is cast through this kit, so each
 * one drives its own arm gesture right where it fires. That covers the local player, the AI
 * opponent and an online peer's replayed casts from one place, which is why this kit has no
 * separate npc-cast-id gesture table.
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface GravSlash {
  x1: number; y1: number; x2: number; y2: number;
  fireAt: number;
  owner: 'player' | 'npc';
  damage: number;
  knockback: number;
}

export interface GravMeteorShadow {
  /** Repainted every frame — the ground shadow plus the rock visibly falling into it. */
  sprite: Phaser.GameObjects.Graphics;
  fireAt: number;
  /** When the shadow was placed, so the approach can be drawn as a real countdown. */
  spawnAt: number;
  t: number;
  x: number; y: number;
  owner: 'player' | 'npc';
  damage: number;
  radius: number;
  /** How big the rock itself is drawn — Moon Rider's colossal meteors dwarf the normal ones. */
  visualRadius: number;
  directHitRadius: number;
  directBonus: number;
  frozen: boolean;
}

export interface GravFirePuddle {
  /** Repainted every frame — a crusted magma pool with plates floating on it. */
  sprite: Phaser.GameObjects.Graphics;
  t: number;
  expiresAt: number;
  x: number; y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

/** A firefly drifting through the Moon Rider night. */
interface Firefly {
  x: number; y: number;
  vx: number; vy: number;
  /** Blink phase and rate, so no two fireflies pulse together. */
  phase: number;
  rate: number;
}

/** What Crushing Field flattened on a fighter, so it can be handed back when the field lifts. */
interface CrushedState {
  sizeMult: number;
  walkSpeedMult: number;
}

// ── GravityArenaApi ────────────────────────────────────────────────────────

export interface GravityArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  /** WASD — Moon Rider steers the orbit with them, and Grounded hops on W. */
  readonly wKey: Phaser.Input.Keyboard.Key;
  readonly aKey: Phaser.Input.Keyboard.Key;
  readonly sKey: Phaser.Input.Keyboard.Key;
  readonly dKey: Phaser.Input.Keyboard.Key;
  readonly elementId: string;
  readonly npcElementId: string;
  /** Aim point the player's rig faces — ArenaScene already tracks the cursor. */
  readonly aimX: number;
  readonly aimY: number;
  /** Cosmetics: maps a gravity visual color through the owner's color cosmetic. */
  gravityColor(owner: 'player' | 'npc', base: number): number;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** Delegates to EarthKit — quake perk spawns a mini tsunami wave on gravity impacts. */
  spawnQuakeWave(owner: 'player' | 'npc', x: number, y: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  getNearestEnemy(x: number, y: number): Fighter;
  /** True only when the player is gravity AND Gravity Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
}

const AURA_ORBIT_RADIUS = 46;
const AURA_DURATION_MS = 10000;
const AURA_MAX_ORBS = 4;
const STARFALL_COOLDOWN_MS = 18000;
const STARFALL_FALL_SPEED = 480; // px/s
const GROUNDED_DURATION_MS = 10000;
const GROUNDED_JUMP_DURATION_MS = 420;
const GROUNDED_JUMP_HEIGHT = 34;

// ── Anti-Grav (F+) ──
/** How long the caster spends in the sky before the slam lands. */
const ANTIGRAV_FLIGHT_MS = 3000;
/** Cursor must be this close to the caster on release for the charge to launch them instead of detonating. */
const ANTIGRAV_SELF_RADIUS = 70;
const ANTIGRAV_SLAM_RADIUS = 120;
const ANTIGRAV_SLAM_DAMAGE = 25;
/** Every application of High Gravity in this kit runs this long. */
const HIGH_GRAVITY_MS = 8000;

// ── Moon Rider (Q+) ──
/** Distance the flight path is held off each wall. */
const MOON_ORBIT_INSET = 78;
const MOON_ORBIT_SPEED = 300;      // px/s along the perimeter
const MOON_RIDE_RADIUS = 34;
/** Where the rider sits relative to the moon's centre. */
const MOON_SEAT_OFFSET = MOON_RIDE_RADIUS + 15;
const MOON_TOUCH_DAMAGE = 25;
const MOON_TOUCH_COOLDOWN_MS = 900;
const MOON_NIGHT_FADE_MS = 700;
const FIREFLY_COUNT = 34;
/** Meteor Storm's spawn interval while riding — a barrage, not a drizzle. */
const MOON_STORM_INTERVAL_MS = 150;
const MOON_BARRAGE_COUNT = 30;
const MOON_SLAM_COUNT = 4;
const MOON_SLAM_DAMAGE = 8;
const MOON_SLAM_INTERVAL_MS = 260;
const MOON_CRUSH_MS = 8000;
/** Crushing Field strips every point of max HP past this. */
const MOON_CRUSH_HP_CEILING = 400;
const MOON_DISMOUNT_SLAM_DAMAGE = 20;
const MOON_DISMOUNT_IMPACT_DAMAGE = 40;
const MOON_DISMOUNT_CRUSH_DAMAGE = 90;

interface AuraOrb {
  /** Repainted every frame — the caught round inside a cage of bent space. */
  sprite: Phaser.GameObjects.Graphics;
  angle: number;
  until: number;
  damage: number;
  textureKey: string;
}

interface StarfallOrb {
  /** Repainted every frame — a dark star with its own tail. */
  sprite: Phaser.GameObjects.Graphics;
  hitSet: Set<Fighter>;
  /** Who owns this orb — 'player' orbs hit enemies, 'npc' orbs (online replay) hit the local player. */
  owner: 'player' | 'npc';
}

interface GroundedState {
  until: number;
  floorY: number;
  jumpUntil: number;
  jumpStartAt: number;
  nextAutoJumpAt: number;
}

// ── GravityKit ─────────────────────────────────────────────────────────────

export class GravityKit {
  // ── Visuals ──
  /** Colour mappers + effect painters, one per owner so a colour cosmetic recolours one side. */
  private readonly pcol: GravityColorFn;
  private readonly ncol: GravityColorFn;
  private readonly pfx: GravityFx;
  private readonly nfx: GravityFx;
  /** The gravity character rig (dark-star fists, eyes, ring system) for each gravity fighter. */
  private playerAvatar: GravityAvatar | null = null;
  private npcAvatar: GravityAvatar | null = null;

  // Player input/state
  private gravPointerDownX = 0;
  private gravPointerDownY = 0;
  private gravClickArmed = false;
  private gravEKeyWasDown = false;
  private gravEKeyHeldSince = 0;
  private gravMeteorRainHolding = false;
  private gravMeteorRainAura: GravityWell | null = null;
  private gravMeteorRainRecorded: { x: number; y: number }[] = [];
  private gravMeteorRainLiveCount = 0;
  private gravBombHolding = false;
  private gravBombHoldStart = 0;
  private gravBombVisual: GravityWell | null = null;
  private gravBombLastX = 0;
  private gravBombLastY = 0;
  private gravSpaceSlamLockUntil = 0;
  private gravLunarShadow: Phaser.GameObjects.Graphics | null = null;
  private gravLunarX = 0;
  private gravLunarY = 0;
  private gravLunarT = 0;
  private gravLunarRadius = 0;
  private gravLunarFireAt = 0;
  private gravLunarOwner: 'player' | 'npc' = 'player';
  private gravSlashes: GravSlash[] = [];
  private gravMeteorShadows: GravMeteorShadow[] = [];
  private gravFirePuddles: GravFirePuddle[] = [];
  // NPC gravity state
  private npcGravSpaceSlamLockUntil = 0;

  // Gravity upgrades
  private gravMeteorStormAccum = 0;
  private gravAnchor: { x: number; y: number; gfx: Phaser.GameObjects.Graphics; t: number; expireAt: number } | null = null;
  private gravMoonActive = false;
  private gravMoonHolding = false;
  private gravMoonHoldStart = 0;
  private gravMoonHp = 0;
  private gravMoonSprite: Phaser.GameObjects.Graphics | null = null;
  private gravMoonX = 0;
  private gravMoonY = 0;
  private gravMoonT = 0;
  private gravMoonHpBar: Phaser.GameObjects.Rectangle | null = null;
  private gravMoonHpBg: Phaser.GameObjects.Rectangle | null = null;
  private gravQWasDown = false;
  private gravMoonChargeCircle: GravityWell | null = null;
  private gravMoonChargeText: Phaser.GameObjects.Text | null = null;

  // ── Anti-Grav (F+) ──
  /** `scene.time.now` the slam lands, or 0 when the caster is on the ground. */
  private antiGravLandAt = 0;
  private antiGravShadow: Phaser.GameObjects.Graphics | null = null;
  private antiGravT = 0;
  /** Live landing point — tracks the cursor for the whole flight. */
  private antiGravX = 0;
  private antiGravY = 0;
  /** Whether the caster was already invincible when they launched, so it isn't cleared on landing. */
  private antiGravWasInvincible = false;

  // ── Moon Rider (Q+) ──
  /** 0→1 position along the perimeter loop, and which way round it is travelling. */
  private moonRideT = 0;
  private moonRideDir = 1;
  private moonHeading = 0;
  /** Per-target ram cooldowns for the flying moon. */
  private moonTouchAt: Map<Fighter, number> = new Map();
  /** Night wash, the ADD-blended light layer over it, and the crushing-field overlay. */
  private moonNightGfx: Phaser.GameObjects.Graphics | null = null;
  private moonLightGfx: Phaser.GameObjects.Graphics | null = null;
  private moonCrushGfx: Phaser.GameObjects.Graphics | null = null;
  private moonNightT = 0;
  /** 0→1 night ramp, so dusk and dawn are not a hard cut. */
  private moonNightFade = 0;
  private fireflies: Firefly[] = [];
  /** Q+ R: the remaining slams in the chain and when the next one lands. */
  private moonSlamRemaining = 0;
  private moonSlamNextAt = 0;
  /** Q+ F: when the Crushing Field lifts, and who it flattened. */
  private moonCrushUntil = 0;
  private moonCrushed: Map<Fighter, CrushedState> = new Map();
  /** Q+ Q: the dismount finale — phase index and when the phase advances. */
  private moonDismountPhase = -1;
  private moonDismountAt = 0;
  private moonDismountVictim: Fighter | null = null;
  private moonDismountFromX = 0;
  private moonDismountFromY = 0;
  /** Set once the dismount finale runs — the ultimate is spent for the rest of the match. */
  private moonUltimateSpent = false;

  // Gravity Mastery — Gravity Aura (passive)
  private auraOrbs: AuraOrb[] = [];

  // Gravity Mastery — Starfall (bindable)
  private starfallOrbs: StarfallOrb[] = [];
  private starfallLastCastAt = -Infinity;

  // Gravity Mastery — Grounded status applied by Starfall
  private grounded: Map<Fighter, GroundedState> = new Map();

  constructor(private arena: GravityArenaApi) {
    this.pcol = (base) => arena.gravityColor('player', base);
    this.ncol = (base) => arena.gravityColor('npc', base);
    this.pfx = new GravityFx(arena.scene, this.pcol);
    this.nfx = new GravityFx(arena.scene, this.ncol);
  }

  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): GravityColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): GravityFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Character rig for a side, if that side is gravity this match. */
  private avatar(owner: 'player' | 'npc'): GravityAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * Builds (on first frame) and drives the void-walker avatar for whichever fighters are
   * gravity. The player faces the cursor; the NPC faces whoever it is fighting.
   */
  private updateAvatars(delta: number): void {
    const { scene, player, npc } = this.arena;

    if (this.arena.elementId === 'gravity' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new GravityAvatar(scene, this.pcol, VOID_TONES);
      const av = this.playerAvatar;
      av.setFacing(Math.atan2(this.arena.aimY - player.y, this.arena.aimX - player.x));
      av.setRiding(this.gravMoonActive);
      // Riding the moon, or holding a charged well, is the character at full stretch.
      av.setIntensity(this.gravMoonActive ? 1.4 : this.gravBombHolding ? 1.2 : 1);
      av.setMastered(this.arena.masteryActive);
      // Mid Anti-Grav the character is genuinely not on the board — the rig goes with them.
      const rigAlpha = this.antiGravLandAt > 0 || player.forceInvisible ? 0 : player.alpha;
      av.update(delta, player.x, player.y, rigAlpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.arena.npcElementId === 'gravity' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new GravityAvatar(scene, this.ncol, NPC_TONES);
      const av = this.npcAvatar;
      av.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      av.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Public accessors ───────────────────────────────────────────────────

  /** Used by the ability bar to show hold-charge progress instead of cooldown for grav-bomb. */
  isGravBombHolding(): boolean {
    return this.gravBombHolding;
  }

  /**
   * True while the kit is placing the player's body itself — mid Anti-Grav flight, riding the
   * moon's orbit, or partway through the dismount finale. ArenaScene skips its WASD movement
   * block entirely for these, otherwise the two would fight over the same body every frame.
   */
  drivesPlayerBody(): boolean {
    return this.antiGravLandAt > 0 || this.gravMoonActive || this.moonDismountPhase >= 0;
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.gravPointerDownX = 0; this.gravPointerDownY = 0; this.gravClickArmed = false;
    this.gravEKeyWasDown = false; this.gravEKeyHeldSince = 0;
    this.gravMeteorRainHolding = false;
    if (this.gravMeteorRainAura) { this.gravMeteorRainAura.destroy(); this.gravMeteorRainAura = null; }
    this.gravMeteorRainRecorded = []; this.gravMeteorRainLiveCount = 0;
    this.gravBombHolding = false; this.gravBombHoldStart = 0;
    if (this.gravBombVisual) { this.gravBombVisual.destroy(); this.gravBombVisual = null; }
    this.gravBombLastX = 0; this.gravBombLastY = 0;
    this.gravSpaceSlamLockUntil = 0; this.npcGravSpaceSlamLockUntil = 0;
    if (this.gravLunarShadow) { this.gravLunarShadow.destroy(); this.gravLunarShadow = null; }
    this.gravLunarFireAt = 0; this.gravLunarRadius = 0;
    this.gravSlashes = [];
    for (const s of this.gravMeteorShadows) { s.sprite.destroy(); }
    this.gravMeteorShadows = [];
    for (const p of this.gravFirePuddles) { p.sprite.destroy(); }
    this.gravFirePuddles = [];

    // Gravity upgrade reset
    this.gravMeteorStormAccum = 0;
    if (this.gravAnchor) { this.gravAnchor.gfx.destroy(); this.gravAnchor = null; }
    this.gravMoonActive = false; this.gravMoonHolding = false; this.gravMoonHoldStart = 0; this.gravMoonHp = 0;
    if (this.gravMoonSprite) { this.gravMoonSprite.destroy(); this.gravMoonSprite = null; }
    if (this.gravMoonHpBar) { this.gravMoonHpBar.destroy(); this.gravMoonHpBar = null; }
    if (this.gravMoonHpBg) { this.gravMoonHpBg.destroy(); this.gravMoonHpBg = null; }
    this.gravQWasDown = false;
    if (this.gravMoonChargeCircle) { this.gravMoonChargeCircle.destroy(); this.gravMoonChargeCircle = null; }
    if (this.gravMoonChargeText) { this.gravMoonChargeText.destroy(); this.gravMoonChargeText = null; }

    // Anti-Grav (F+)
    this.antiGravLandAt = 0; this.antiGravT = 0; this.antiGravWasInvincible = false;
    this.antiGravX = 0; this.antiGravY = 0;
    if (this.antiGravShadow) { this.antiGravShadow.destroy(); this.antiGravShadow = null; }

    // Moon Rider (Q+) — the night, the flight and everything it flattened
    this.moonRideT = 0; this.moonRideDir = 1; this.moonHeading = 0;
    this.moonTouchAt.clear();
    if (this.moonNightGfx) { this.moonNightGfx.destroy(); this.moonNightGfx = null; }
    if (this.moonLightGfx) { this.moonLightGfx.destroy(); this.moonLightGfx = null; }
    if (this.moonCrushGfx) { this.moonCrushGfx.destroy(); this.moonCrushGfx = null; }
    this.moonNightT = 0; this.moonNightFade = 0;
    this.fireflies = [];
    this.moonSlamRemaining = 0; this.moonSlamNextAt = 0;
    this.moonCrushUntil = 0;
    // The fighters themselves are rebuilt every match, so drop the records rather than
    // restoring onto stale objects.
    this.moonCrushed.clear();
    this.moonDismountPhase = -1; this.moonDismountAt = 0; this.moonDismountVictim = null;
    this.moonDismountFromX = 0; this.moonDismountFromY = 0;
    this.moonUltimateSpent = false;

    // Gravity Mastery reset
    for (const orb of this.auraOrbs) orb.sprite.destroy();
    this.auraOrbs = [];
    for (const orb of this.starfallOrbs) orb.sprite.destroy();
    this.starfallOrbs = [];
    this.starfallLastCastAt = -Infinity;
    this.grounded.clear();
  }

  // ── Cast-context delegate methods (called from buildPlayerContext / buildNpcContext) ──

  doGravitySlash(x1: number, y1: number, x2: number, y2: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    let damage = 18;
    let knockback = 400;
    // Riding the moon, a slash isn't a swipe any more — the seam is torn clean across the arena.
    if (owner === 'player' && this.gravMoonActive) {
      const W = this.arena.width, H = this.arena.height;
      const reach = Math.hypot(W, H);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      x1 = mx - Math.cos(ang) * reach; y1 = my - Math.sin(ang) * reach;
      x2 = mx + Math.cos(ang) * reach; y2 = my + Math.sin(ang) * reach;
      damage = 36;
      knockback = 620;
    }
    // A seam opening in space that stays open for the half-second before it snaps shut on them.
    this.avatar(owner)?.play('sweep', Math.atan2(y2 - y1, x2 - x1));
    this.fx(owner).rift(x1, y1, x2, y2, 620, 6, tonesFor(owner));
    this.gravSlashes.push({ x1, y1, x2, y2, fireAt: scene.time.now + 500, owner, damage, knockback });
  }

  /**
   * Was `spawnGravMeteorShadow` on ArenaScene.
   *
   * `colossal` defaults to "riding the moon", which is what makes a Moon Rider's aimed tap a
   * screen-eating rock. The two *volume* attacks — Meteor Storm and the Q+ barrage — pass false
   * explicitly: their upgrade is how many fall, not how big each one is, and a colossal one every
   * 150ms would be absurd.
   */
  doMeteorShadow(x: number, y: number, owner: 'player' | 'npc', frozen: boolean, colossalOverride?: boolean): void {
    const scene = this.arena.scene;
    // Cap frozen player shadows (FIFO — remove oldest frozen player shadow)
    if (frozen && owner === 'player') {
      const frozenPlayerShadows = this.gravMeteorShadows.filter(s => s.frozen && s.owner === 'player');
      const maxFrozen = this.arena.hasUpgrade('e') ? 10 : 5;
      if (frozenPlayerShadows.length >= maxFrozen) {
        const oldest = frozenPlayerShadows[0];
        oldest.sprite.destroy();
        this.gravMeteorShadows.splice(this.gravMeteorShadows.indexOf(oldest), 1);
      }
    }
    // Moon Rider drops something far bigger and far worse than a normal rock.
    const colossal = colossalOverride ?? (owner === 'player' && this.gravMoonActive);
    const spr = scene.add.graphics().setDepth(5);
    this.gravMeteorShadows.push({
      sprite: spr, fireAt: frozen ? Infinity : scene.time.now + 1500,
      spawnAt: scene.time.now, t: Math.random() * 6,
      x, y, owner,
      damage: colossal ? 30 : 14,
      radius: colossal ? 130 : 70,
      visualRadius: colossal ? 44 : 22,
      directHitRadius: colossal ? 54 : 28,
      directBonus: colossal ? 28 : 16,
      frozen,
    });
  }

  /** Q+ E: a barrage of meteors seeded over the whole playfield, landing in a ragged wave. */
  private doMoonMeteorBarrage(time: number): void {
    const W = this.arena.width, H = this.arena.height;
    for (let i = 0; i < MOON_BARRAGE_COUNT; i++) {
      const x = 40 + Math.random() * (W - 80);
      const y = 40 + Math.random() * (H - 80);
      this.doMeteorShadow(x, y, 'player', false, false);
      // Stagger the fuses so the sky comes apart over a second and a half, not all at once.
      const ms = this.gravMeteorShadows[this.gravMeteorShadows.length - 1];
      ms.fireAt = time + 700 + Math.random() * 1500;
    }
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '☄️ BARRAGE!', '#ffcc44');
    this.arena.scene.cameras.main.shake(400, 0.004);
  }

  /** Player side is always a no-op; only the NPC context bursts extra shadows around (tx, ty). */
  doMeteorRainNpcBurst(tx: number, ty: number, owner: 'player' | 'npc'): void {
    if (owner !== 'npc') return;
    for (let i = 0; i < 4; i++) {
      const ox = (Math.random() - 0.5) * 160;
      const oy = (Math.random() - 0.5) * 160;
      this.doMeteorShadow(tx + ox, ty + oy, 'npc', false);
    }
  }

  doSpaceSlam(owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    // Riding the moon, one slam becomes four — thrown a different way each time.
    if (owner === 'player' && this.gravMoonActive) {
      this.moonSlamRemaining = MOON_SLAM_COUNT;
      this.moonSlamNextAt = scene.time.now;
      this.avatar('player')?.play('slam', Math.atan2(target.y - this.arena.player.y, target.x - this.arena.player.x));
      this.arena.showFloatingText(target.x, target.y - 40, '🌀 RAGDOLL!', '#ccbbee');
      return;
    }
    const H = scene.scale.height;
    const targetY = H - 40;
    target.takeDamage(25);
    this.arena.spawnHitFlash(target.x, target.y, 0x8844cc);
    // Driven straight down: the column of bent space they fall through, then the floor impact.
    this.avatar(owner)?.play('slam', Math.PI / 2);
    const fx = this.fx(owner);
    fx.rift(target.x, target.y, target.x, targetY, 380, 7, tonesFor(owner));
    fx.impact(target.x, targetY, 78, { tones: tonesFor(owner), rocks: 8, dust: 2, duration: 420, crater: false });
    scene.cameras.main.shake(180, 0.005);
    // Force enemy to floor
    const slamX = target.x;
    target.y = targetY;
    const tb = target.body as Phaser.Physics.Arcade.Body;
    tb.setVelocity(0, 0);
    if (owner === 'player') {
      this.gravSpaceSlamLockUntil = scene.time.now + 300;
      // R+: Gravity Anchor
      if (this.arena.hasUpgrade('r')) {
        if (this.gravAnchor) this.gravAnchor.gfx.destroy();
        this.gravAnchor = { x: slamX, y: targetY, gfx: scene.add.graphics().setDepth(7), t: 0, expireAt: scene.time.now + 3000 };
        this.pfx.bloom(slamX, targetY, 30, 8, 6, VOID_TONES);
        this.arena.showFloatingText(slamX, targetY - 24, '⚓ Anchored!', '#aa44ff');
      }
    } else {
      this.npcGravSpaceSlamLockUntil = scene.time.now + 300;
    }
  }

  doGravBombSnap(x: number, y: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    if (Phaser.Math.Distance.Between(x, y, target.x, target.y) <= 120) {
      target.x = x; target.y = y;
      (target.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      // They are yanked to the point: a short-lived well closing on where they landed.
      this.avatar(owner)?.play('punch', Math.atan2(y - (owner === 'player' ? this.arena.player.y : this.arena.npc.y), x - (owner === 'player' ? this.arena.player.x : this.arena.npc.x)));
      const fx = this.fx(owner);
      fx.well(x, y, 60, 420, undefined, 6, tonesFor(owner));
      fx.flash(x, y, 24, 8, tonesFor(owner));
      fx.ring(x, y, 12, 100, GRAVITY.violet, 380, 4, 6);
    }
    void scene;
  }

  doLunarLanding(owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    if (this.gravLunarShadow) { this.gravLunarShadow.destroy(); this.gravLunarShadow = null; }
    const W = scene.scale.width; const H = scene.scale.height;
    const lRadius = Math.min(W, H) * 0.44;
    this.gravLunarRadius = lRadius;
    this.gravLunarShadow = scene.add.graphics().setDepth(3);
    this.gravLunarX = W / 2; this.gravLunarY = H / 2; this.gravLunarT = 0;
    this.gravLunarFireAt = scene.time.now + 3000;
    this.gravLunarOwner = owner;
    // Both arms thrown up, and something the size of the stage starts coming down.
    this.avatar(owner)?.play('raise');
  }

  // ── High Gravity ───────────────────────────────────────────────────────

  /**
   * Pins a fighter under High Gravity. Everything that moves them faster — speed buffs, the
   * Space dodge, every dash ability — is dead for the duration; ArenaScene owns those
   * chokepoints, this just sets the clock.
   */
  private applyHighGravity(target: Fighter, time: number): void {
    if (!target.active || target.hp <= 0) return;
    const until = time + HIGH_GRAVITY_MS;
    if (target.highGravityUntil < until) target.highGravityUntil = until;
    this.arena.showFloatingText(target.x, target.y - 40, '⬇️ HIGH GRAVITY', '#ccbbee');
  }

  // ── Anti-Grav (F+) ─────────────────────────────────────────────────────

  /** True while the caster is off the board — used to hide the rig and refuse a second launch. */
  private get antiGravAirborne(): boolean { return this.antiGravLandAt > 0; }

  /**
   * Launches the caster straight up out of the fight. They keep no hitbox worth speaking of
   * (invincible), no silhouette (hidden, health bar and all) and no control over anything but
   * where they come back down.
   */
  private startAntiGrav(time: number): void {
    const player = this.arena.player;
    const scene = this.arena.scene;
    this.antiGravLandAt = time + ANTIGRAV_FLIGHT_MS;
    this.antiGravT = 0;
    this.antiGravX = player.x;
    this.antiGravY = player.y;
    this.antiGravWasInvincible = player.isInvincible;
    player.isInvincible = true;
    player.setVisible(false);
    player.setHealthBarVisible(false);
    (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    if (this.antiGravShadow) this.antiGravShadow.destroy();
    this.antiGravShadow = scene.add.graphics().setDepth(3);

    // Everything under them is dragged up and after them as they go.
    this.playerAvatar?.play('raise');
    this.pfx.well(player.x, player.y, 90, 420, undefined, 6, VOID_TONES);
    this.pfx.arms(player.x, player.y, 16, {
      speed: 320, angle: -Math.PI / 2, spread: 0.9, size: 4.4, life: 700, depth: 8, tones: VOID_TONES,
    });
    this.pfx.ring(player.x, player.y, 14, 130, GRAVITY.violet, 520, 5, 6);
    this.pfx.flash(player.x, player.y, 34, 8, VOID_TONES);
    scene.cameras.main.shake(200, 0.005);
    this.arena.showFloatingText(player.x, player.y - 34, '🚀 ANTI-GRAV', '#ccbbee');
  }

  /** Drives the flight: the landing point tracks the cursor, then the slam resolves. */
  private updateAntiGrav(time: number, delta: number): void {
    if (!this.antiGravAirborne) return;
    const player = this.arena.player;
    const scene = this.arena.scene;
    const W = this.arena.width, H = this.arena.height;
    const pad = 40;

    this.antiGravT += delta / 1000;
    this.antiGravX = Phaser.Math.Clamp(this.arena.aimX, pad, W - pad);
    this.antiGravY = Phaser.Math.Clamp(this.arena.aimY, pad, H - pad);

    // The body rides the landing point so nothing (AI, projectiles, world bounds) sees it
    // teleport on touchdown — it was simply never anywhere else.
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.antiGravX, this.antiGravY);
    body.setVelocity(0, 0);
    // Re-asserted every frame: a dodge started just before the launch would otherwise drop
    // invincibility mid-flight when its own 280ms timer fires.
    player.isInvincible = true;

    const progress = 1 - (this.antiGravLandAt - time) / ANTIGRAV_FLIGHT_MS;
    if (this.antiGravShadow) {
      this.antiGravShadow.clear();
      GravityFx.drawLandingShadow(this.antiGravShadow, this.pcol, VOID_TONES,
        this.antiGravX, this.antiGravY, this.antiGravT, progress);
    }

    if (time < this.antiGravLandAt) return;

    // ── Touchdown ──
    const lx = this.antiGravX, ly = this.antiGravY;
    this.antiGravLandAt = 0;
    if (this.antiGravShadow) { this.antiGravShadow.destroy(); this.antiGravShadow = null; }
    if (!this.antiGravWasInvincible) player.isInvincible = false;
    player.setVisible(true);
    player.setHealthBarVisible(true);

    this.playerAvatar?.play('slam', Math.PI / 2);
    this.pfx.impact(lx, ly, ANTIGRAV_SLAM_RADIUS, {
      tones: VOID_TONES, rocks: 14, dust: 4, duration: 700,
    });
    this.pfx.ring(lx, ly, 20, ANTIGRAV_SLAM_RADIUS * 1.7, GRAVITY.violet, 620, 6, 7);
    this.pfx.arms(lx, ly, 14, { speed: 260, size: 5, life: 640, depth: 8, tones: VOID_TONES });
    this.pfx.well(lx, ly, ANTIGRAV_SLAM_RADIUS, 520, undefined, 4, VOID_TONES);
    scene.cameras.main.shake(320, 0.011);

    for (const target of this.arena.enemies) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(lx, ly, target.x, target.y) > ANTIGRAV_SLAM_RADIUS) continue;
      target.takeDamage(ANTIGRAV_SLAM_DAMAGE);
      this.noteTetherDamage(target, ANTIGRAV_SLAM_DAMAGE);
      this.arena.spawnHitFlash(target.x, target.y, 0xaa66ff);
      this.applyHighGravity(target, time);
    }
    if (this.arena.hasPerk('player', 'quake')) this.arena.spawnQuakeWave('player', lx, ly);
  }

  // ── Moon Rider (Q+) ────────────────────────────────────────────────────

  /**
   * A point on the flight path: the arena rectangle held `MOON_ORBIT_INSET` off every wall,
   * parameterised 0→1 clockwise from the top-left corner.
   */
  private perimeterPoint(t: number): { x: number; y: number } {
    const W = this.arena.width, H = this.arena.height;
    const x0 = MOON_ORBIT_INSET, y0 = MOON_ORBIT_INSET;
    const x1 = Math.max(x0 + 1, W - MOON_ORBIT_INSET), y1 = Math.max(y0 + 1, H - MOON_ORBIT_INSET);
    const w = x1 - x0, h = y1 - y0;
    const per = 2 * (w + h);
    let d = ((t % 1) + 1) % 1 * per;
    if (d < w) return { x: x0 + d, y: y0 };
    d -= w;
    if (d < h) return { x: x1, y: y0 + d };
    d -= h;
    if (d < w) return { x: x1 - d, y: y1 };
    d -= w;
    return { x: x0, y: y1 - d };
  }

  /** Length of the perimeter loop, so a px/s speed can be turned into a 0→1 step. */
  private perimeterLength(): number {
    const W = this.arena.width, H = this.arena.height;
    const w = Math.max(1, W - MOON_ORBIT_INSET * 2);
    const h = Math.max(1, H - MOON_ORBIT_INSET * 2);
    return 2 * (w + h);
  }

  /** Mounts the moon and turns the arena over to night. */
  private mountMoon(): void {
    const player = this.arena.player;
    const scene = this.arena.scene;
    this.gravMoonActive = true;
    this.gravMoonHp = 100;
    this.moonTouchAt.clear();

    // Join the loop at whichever point on it is nearest, so the ride starts where you stood.
    const steps = 96;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < steps; i++) {
      const p = this.perimeterPoint(i / steps);
      const d = Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y);
      if (d < bestD) { bestD = d; best = i / steps; }
    }
    this.moonRideT = best;
    this.moonRideDir = 1;
    this.gravMoonT = 0;

    if (this.gravMoonSprite) this.gravMoonSprite.destroy();
    if (this.gravMoonHpBg) this.gravMoonHpBg.destroy();
    if (this.gravMoonHpBar) this.gravMoonHpBar.destroy();
    // Above the night wash (16), its own light (17) and the crushing field (18): the moon is the
    // one thing in the arena that nothing else gets to dim.
    this.gravMoonSprite = scene.add.graphics().setDepth(18.5);
    const seat = this.perimeterPoint(this.moonRideT);
    this.gravMoonX = seat.x; this.gravMoonY = seat.y;
    this.gravMoonHpBg = scene.add.rectangle(seat.x, seat.y, 56, 5, 0x333333).setDepth(19);
    this.gravMoonHpBar = scene.add.rectangle(seat.x - 28, seat.y, 56, 5, 0xccbbee).setDepth(20).setOrigin(0, 0.5);

    this.startNight();

    this.playerAvatar?.play('raise');
    this.pfx.bloom(seat.x, seat.y, MOON_RIDE_RADIUS * 1.8, 14, 7, MOON_TONES);
    this.pfx.ring(seat.x, seat.y, 20, 200, GRAVITY.moonlit, 700, 5, 7);
    scene.cameras.main.shake(280, 0.006);
    player.triggerCooldown('lunar-landing');
    this.arena.showFloatingText(player.x, player.y - 34, '🌕 MOON RIDER!', '#ccbbee');
  }

  /** Builds the night layers and seeds the firefly swarm. */
  private startNight(): void {
    const scene = this.arena.scene;
    const W = this.arena.width, H = this.arena.height;
    if (!this.moonNightGfx) this.moonNightGfx = scene.add.graphics().setDepth(16);
    if (!this.moonLightGfx) {
      this.moonLightGfx = scene.add.graphics().setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
    }
    this.moonNightT = 0;
    this.fireflies = Array.from({ length: FIREFLY_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 26,
      vy: (Math.random() - 0.5) * 20,
      phase: Math.random() * Math.PI * 2,
      rate: 0.9 + Math.random() * 1.6,
    }));
  }

  /** Fades the night out; the layers are torn down once it has actually gone. */
  private endNight(): void {
    this.fireflies = [];
  }

  /**
   * The night layers. Runs whenever `moonNightFade` is above zero — including on the way out —
   * so dawn is a fade rather than the sky vanishing between frames.
   */
  private updateNight(time: number, delta: number): void {
    // The finale *is* the moon dying, so the sky stays dark right through it.
    const moonUp = this.gravMoonActive || this.moonDismountPhase >= 0;
    const target = moonUp ? 1 : 0;
    const step = delta / MOON_NIGHT_FADE_MS;
    this.moonNightFade = target > this.moonNightFade
      ? Math.min(1, this.moonNightFade + step)
      : Math.max(0, this.moonNightFade - step);

    if (this.moonNightFade <= 0.001) {
      if (this.moonNightGfx) { this.moonNightGfx.destroy(); this.moonNightGfx = null; }
      if (this.moonLightGfx) { this.moonLightGfx.destroy(); this.moonLightGfx = null; }
      return;
    }
    if (!this.moonNightGfx || !this.moonLightGfx) return;

    this.moonNightT += delta / 1000;
    const W = this.arena.width, H = this.arena.height;

    this.moonNightGfx.clear();
    GravityFx.drawNight(this.moonNightGfx, this.pcol, W, H, this.moonNightT, this.moonNightFade);

    // Light layer: the moon's pool plus every firefly, all additive over the wash.
    const lg = this.moonLightGfx;
    lg.clear();
    lg.setAlpha(this.moonNightFade);
    if (moonUp) {
      GravityFx.drawMoonlight(lg, this.pcol, this.gravMoonX, this.gravMoonY, MOON_RIDE_RADIUS, this.moonNightT);
    }
    for (const f of this.fireflies) {
      // Lazy drift with a slow wander, bounced off the edges rather than wrapped.
      f.vx += (Math.random() - 0.5) * 14 * (delta / 1000);
      f.vy += (Math.random() - 0.5) * 12 * (delta / 1000);
      f.vx = Phaser.Math.Clamp(f.vx, -34, 34);
      f.vy = Phaser.Math.Clamp(f.vy, -26, 26);
      f.x += f.vx * (delta / 1000);
      f.y += f.vy * (delta / 1000) + Math.sin(this.moonNightT * 2 + f.phase) * 6 * (delta / 1000);
      if (f.x < 8 || f.x > W - 8) { f.vx *= -1; f.x = Phaser.Math.Clamp(f.x, 8, W - 8); }
      if (f.y < 8 || f.y > H - 8) { f.vy *= -1; f.y = Phaser.Math.Clamp(f.y, 8, H - 8); }
      const glow = Math.max(0, Math.sin(this.moonNightT * f.rate + f.phase));
      GravityFx.drawFirefly(lg, this.pcol, f.x, f.y, glow * glow);
    }
    void time;
  }

  /** Flies the moon around the perimeter, carries the rider, and runs anything it hits over. */
  private updateMoonRide(time: number, delta: number): void {
    if (!this.gravMoonActive || !this.gravMoonSprite) return;
    const player = this.arena.player;
    const scene = this.arena.scene;

    // WASD nudges which way round the loop it is going: push against the travel direction to reverse.
    const inX = (this.arena.dKey.isDown ? 1 : 0) - (this.arena.aKey.isDown ? 1 : 0);
    const inY = (this.arena.sKey.isDown ? 1 : 0) - (this.arena.wKey.isDown ? 1 : 0);
    if (inX !== 0 || inY !== 0) {
      const ahead = this.perimeterPoint(this.moonRideT + this.moonRideDir * 0.01);
      const tanX = ahead.x - this.gravMoonX, tanY = ahead.y - this.gravMoonY;
      if (inX * tanX + inY * tanY < 0) this.moonRideDir = -this.moonRideDir;
    }

    const prevX = this.gravMoonX, prevY = this.gravMoonY;
    this.gravMoonT += delta / 1000;
    this.moonRideT += this.moonRideDir * (MOON_ORBIT_SPEED * (delta / 1000)) / this.perimeterLength();
    const pos = this.perimeterPoint(this.moonRideT);
    this.gravMoonX = pos.x; this.gravMoonY = pos.y;
    if (Math.hypot(pos.x - prevX, pos.y - prevY) > 0.01) {
      this.moonHeading = Math.atan2(pos.y - prevY, pos.x - prevX);
    }

    // The rider sits on top of it, wherever on the loop it happens to be.
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.gravMoonX, this.gravMoonY - MOON_SEAT_OFFSET);
    body.setVelocity(0, 0);

    this.gravMoonSprite.clear();
    GravityFx.drawFlyingMoon(this.gravMoonSprite, this.pcol, this.gravMoonX, this.gravMoonY,
      MOON_RIDE_RADIUS, this.gravMoonT, Math.max(0, this.gravMoonHp / 100), this.moonHeading);

    const hpFrac = Math.max(0, this.gravMoonHp / 100);
    if (this.gravMoonHpBg) this.gravMoonHpBg.setPosition(this.gravMoonX, this.gravMoonY + MOON_RIDE_RADIUS + 12);
    if (this.gravMoonHpBar) {
      this.gravMoonHpBar.setPosition(this.gravMoonX - 28, this.gravMoonY + MOON_RIDE_RADIUS + 12);
      this.gravMoonHpBar.setSize(56 * hpFrac, 5);
    }

    // Anything that touches a moving moon gets run over.
    for (const target of this.arena.enemies) {
      if (!target.active || target.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(this.gravMoonX, this.gravMoonY, target.x, target.y);
      if (d > MOON_RIDE_RADIUS + 20) continue;
      if (time < (this.moonTouchAt.get(target) ?? 0)) continue;
      this.moonTouchAt.set(target, time + MOON_TOUCH_COOLDOWN_MS);
      target.takeDamage(MOON_TOUCH_DAMAGE);
      this.arena.recordMasteryStat('moonRams', 1);
      this.noteTetherDamage(target, MOON_TOUCH_DAMAGE);
      this.arena.spawnHitFlash(target.x, target.y, 0xccbbee);
      // Flung off the front of it, not merely bumped.
      const away = Math.atan2(target.y - this.gravMoonY, target.x - this.gravMoonX);
      const tb = target.body as Phaser.Physics.Arcade.Body;
      tb.setVelocity(Math.cos(away) * 620 + Math.cos(this.moonHeading) * 260,
        Math.sin(away) * 620 + Math.sin(this.moonHeading) * 260);
      this.pfx.impact(target.x, target.y, 70, { tones: MOON_TONES, rocks: 7, dust: 2, duration: 420, crater: false });
      scene.cameras.main.shake(170, 0.005);
    }
  }

  /** Q+ R: hurls the enemy off in a fresh random direction, one throw per call. */
  private updateMoonSlams(time: number): void {
    if (this.moonSlamRemaining <= 0 || time < this.moonSlamNextAt) return;
    const target = this.arena.npc;
    this.moonSlamRemaining--;
    this.moonSlamNextAt = time + MOON_SLAM_INTERVAL_MS;
    if (!target.active || target.hp <= 0) { this.moonSlamRemaining = 0; return; }

    const scene = this.arena.scene;
    const pad = 56;
    const ang = Math.random() * Math.PI * 2;
    const dist = 200 + Math.random() * 160;
    const tx = Phaser.Math.Clamp(target.x + Math.cos(ang) * dist, pad, this.arena.width - pad);
    const ty = Phaser.Math.Clamp(target.y + Math.sin(ang) * dist, pad, this.arena.height - pad);
    const fromX = target.x, fromY = target.y;

    const tb = target.body as Phaser.Physics.Arcade.Body;
    tb.reset(tx, ty);
    tb.setVelocity(0, 0);
    target.takeDamage(MOON_SLAM_DAMAGE);
    this.noteTetherDamage(target, MOON_SLAM_DAMAGE);
    this.arena.spawnHitFlash(tx, ty, 0xaa66ff);
    this.pfx.rift(fromX, fromY, tx, ty, 340, 7, VOID_TONES);
    this.pfx.impact(tx, ty, 62, { tones: VOID_TONES, rocks: 6, dust: 2, duration: 380, crater: false });
    scene.cameras.main.shake(140, 0.005);
  }

  /**
   * Q+ F — Crushing Field: eight seconds of the whole arena pulled down. Applied once here and
   * then held every frame by `updateMoonCrush`, so nothing they do can shrug it off early.
   */
  private startMoonCrush(time: number): void {
    this.moonCrushUntil = time + MOON_CRUSH_MS;
    if (!this.moonCrushGfx) {
      this.moonCrushGfx = this.arena.scene.add.graphics().setDepth(18);
    }
    this.playerAvatar?.play('slam', Math.PI / 2);
    this.arena.scene.cameras.main.shake(600, 0.012);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '🪐 CRUSHING FIELD', '#ccbbee');

    for (const target of this.arena.enemies) {
      if (!target.active || target.hp <= 0) continue;
      if (!this.moonCrushed.has(target)) {
        this.moonCrushed.set(target, { sizeMult: target.sizeMult, walkSpeedMult: target.walkSpeedMult });
      }
      // Flattened: wider, and barely able to drag themselves anywhere.
      target.sizeMult = this.moonCrushed.get(target)!.sizeMult * 1.6;
      target.applySizeMult();
      target.walkSpeedMult = 0.2;
      this.applyHighGravity(target, time);
      this.pfx.impact(target.x, target.y, 90, { tones: VOID_TONES, rocks: 9, dust: 3, duration: 560, crater: false });
      this.pfx.well(target.x, target.y, 90, 700, undefined, 4, VOID_TONES);
    }
  }

  /** Holds the field on for its duration, then hands back everything but the stripped health. */
  private updateMoonCrush(time: number, delta: number): void {
    const active = time < this.moonCrushUntil;

    if (active) {
      for (const target of this.arena.enemies) {
        if (!target.active || target.hp <= 0) continue;
        // Nothing survives down here: bonus health is squeezed out as fast as it appears,
        // and any inflated max HP is pressed back to the ceiling for good.
        target.shieldHp = 0;
        target.weakHp = 0;
        if (target.maxHp > MOON_CRUSH_HP_CEILING) target.reduceMaxHp(target.maxHp - MOON_CRUSH_HP_CEILING);
        if (target.hp > MOON_CRUSH_HP_CEILING) target.hp = MOON_CRUSH_HP_CEILING;
        target.walkSpeedMult = Math.min(target.walkSpeedMult, 0.2);
        if (time >= target.highGravityUntil) target.highGravityUntil = Math.min(this.moonCrushUntil, time + HIGH_GRAVITY_MS);
      }
    } else if (this.moonCrushed.size > 0) {
      // Field lifted: shape and footspeed come back, the health it crushed out does not.
      for (const [target, saved] of this.moonCrushed) {
        if (target.active) {
          target.sizeMult = saved.sizeMult;
          target.applySizeMult();
          target.walkSpeedMult = saved.walkSpeedMult;
        }
      }
      this.moonCrushed.clear();
    }

    // The overlay outlives the field by a beat so it can ramp back out.
    if (!this.moonCrushGfx) return;
    const remaining = this.moonCrushUntil - time;
    const strength = active
      ? Math.min(1, Math.min((MOON_CRUSH_MS - remaining) / 400, remaining / 500))
      : 0;
    this.moonCrushGfx.clear();
    if (strength <= 0.01) {
      this.moonCrushGfx.destroy();
      this.moonCrushGfx = null;
      return;
    }
    GravityFx.drawCrushField(this.moonCrushGfx, this.pcol, this.arena.width, this.arena.height,
      time / 1000, strength);
    void delta;
  }

  /**
   * Q+ Q — the dismount finale. Four beats: drop into the middle of the arena, haul the enemy
   * up to the moon, put them through it, then collapse the moon on top of them. Spends the
   * ultimate permanently.
   */
  private startMoonDismount(time: number): void {
    const player = this.arena.player;
    const scene = this.arena.scene;
    const W = this.arena.width, H = this.arena.height;
    const cx = W / 2, cy = H / 2;

    this.gravMoonActive = false;
    this.moonUltimateSpent = true;
    this.moonDismountPhase = 0;
    this.moonDismountAt = time + 800;
    this.moonDismountVictim = this.arena.getNearestEnemy(cx, cy);
    this.moonDismountFromX = this.gravMoonX;
    this.moonDismountFromY = this.gravMoonY;
    player.damageAbsorber = null;
    if (this.gravMoonHpBar) { this.gravMoonHpBar.destroy(); this.gravMoonHpBar = null; }
    if (this.gravMoonHpBg) { this.gravMoonHpBg.destroy(); this.gravMoonHpBg = null; }

    // The rider comes off it hard, straight into the middle of the floor.
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(cx, cy);
    body.setVelocity(0, 0);
    this.playerAvatar?.play('slam', Math.PI / 2);
    this.pfx.impact(cx, cy, 130, { tones: VOID_TONES, rocks: 16, dust: 4, duration: 720 });
    this.pfx.ring(cx, cy, 20, 200, GRAVITY.violet, 620, 6, 7);
    scene.cameras.main.shake(340, 0.012);
    this.arena.showFloatingText(cx, cy - 46, '🌑 DISMOUNT', '#ccbbee');

    for (const target of this.arena.enemies) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(cx, cy, target.x, target.y) > 130) continue;
      target.takeDamage(MOON_DISMOUNT_SLAM_DAMAGE);
      this.noteTetherDamage(target, MOON_DISMOUNT_SLAM_DAMAGE);
      this.arena.spawnHitFlash(target.x, target.y, 0xaa66ff);
    }
  }

  /** Steps the dismount finale. Each phase sets the next deadline; phase 3 ends it. */
  private updateMoonDismount(time: number, delta: number): void {
    if (this.moonDismountPhase < 0) return;
    const scene = this.arena.scene;
    const W = this.arena.width;
    const moonX = W / 2;
    const moonY = 96;
    const victim = this.moonDismountVictim;

    this.gravMoonT += delta / 1000;
    // The caster is planted where they landed for the whole finale — nothing shoves them off it.
    (this.arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    // The moon climbs to the top of the screen over the first two beats and hangs there.
    if (this.gravMoonSprite) {
      const climb = Phaser.Math.Clamp((time - (this.moonDismountAt - 800)) / 800, 0, 1);
      const mx = this.moonDismountPhase === 0
        ? Phaser.Math.Linear(this.moonDismountFromX, moonX, climb)
        : moonX;
      const my = this.moonDismountPhase === 0
        ? Phaser.Math.Linear(this.moonDismountFromY, moonY, climb)
        : moonY;
      this.gravMoonX = mx; this.gravMoonY = my;
      const bigR = MOON_RIDE_RADIUS * (1 + 0.6 * (this.moonDismountPhase >= 2 ? 1 : climb));
      this.gravMoonSprite.clear();
      GravityFx.drawMoon(this.gravMoonSprite, this.pcol, mx, my, bigR, this.gravMoonT,
        this.moonDismountPhase >= 2 ? 0.25 : 1);
    }

    // Phase 1: the enemy is dragged up off the floor toward it.
    if (this.moonDismountPhase === 1 && victim?.active && victim.hp > 0) {
      const f = Phaser.Math.Clamp(1 - (this.moonDismountAt - time) / 700, 0, 1);
      const vb = victim.body as Phaser.Physics.Arcade.Body;
      vb.reset(
        Phaser.Math.Linear(this.moonDismountFromX, this.gravMoonX, f),
        Phaser.Math.Linear(this.moonDismountFromY, this.gravMoonY + 26, f),
      );
      vb.setVelocity(0, 0);
    }

    if (time < this.moonDismountAt) return;

    if (this.moonDismountPhase === 0) {
      // Grab: whoever is nearest is picked up off the ground.
      this.moonDismountPhase = 1;
      this.moonDismountAt = time + 700;
      if (victim?.active && victim.hp > 0) {
        this.moonDismountFromX = victim.x;
        this.moonDismountFromY = victim.y;
        this.pfx.rift(victim.x, victim.y, this.gravMoonX, this.gravMoonY, 700, 7, VOID_TONES);
        this.arena.showFloatingText(victim.x, victim.y - 40, '🌌 UP YOU GO', '#ccbbee');
      }
      return;
    }

    if (this.moonDismountPhase === 1) {
      // Impact: thrown through the moon itself.
      this.moonDismountPhase = 2;
      this.moonDismountAt = time + 550;
      if (victim?.active && victim.hp > 0) {
        victim.takeDamage(MOON_DISMOUNT_IMPACT_DAMAGE);
        this.noteTetherDamage(victim, MOON_DISMOUNT_IMPACT_DAMAGE);
        this.arena.recordMasteryStat('moonHits', 1);
        this.arena.spawnHitFlash(victim.x, victim.y, 0xf2ecff);
        this.applyHighGravity(victim, time);
      }
      this.pfx.impact(this.gravMoonX, this.gravMoonY, 120, {
        tones: MOON_TONES, rocks: 18, dust: 5, duration: 700, crater: false,
      });
      this.pfx.ring(this.gravMoonX, this.gravMoonY, 24, 190, GRAVITY.moonlit, 620, 6, 8);
      scene.cameras.main.shake(340, 0.012);
      return;
    }

    // Phase 2 → the moon is crushed on top of them, and that is the end of it.
    this.moonDismountPhase = -1;
    const mx = this.gravMoonX, my = this.gravMoonY;
    if (this.gravMoonSprite) { this.gravMoonSprite.destroy(); this.gravMoonSprite = null; }

    this.pfx.arms(mx, my, 26, { speed: -420, size: 7, life: 620, depth: 9, tones: MOON_TONES });
    scene.time.delayedCall(360, () => {
      this.pfx.impact(mx, my, 210, { tones: MOON_TONES, rocks: 46, dust: 12, duration: 1200, crater: false });
      this.pfx.ring(mx, my, 30, 420, GRAVITY.violet, 1000, 8, 9);
      this.pfx.starBurst(mx, my, 150, 9, MOON_TONES);
      this.pfx.arms(mx, my, 24, { speed: 520, size: 7, life: 900, depth: 9, tones: VOID_TONES });
      scene.cameras.main.shake(800, 0.02);
    });

    if (victim?.active && victim.hp > 0) {
      victim.takeDamage(MOON_DISMOUNT_CRUSH_DAMAGE);
      this.noteTetherDamage(victim, MOON_DISMOUNT_CRUSH_DAMAGE);
      this.arena.recordMasteryStat('moonHits', 1);
      this.arena.spawnHitFlash(victim.x, victim.y, 0xffffff);
      this.applyHighGravity(victim, time);
      // Whatever is left of them comes back down with the debris.
      const vb = victim.body as Phaser.Physics.Arcade.Body;
      vb.reset(mx, Math.min(this.arena.height - 40, my + 220));
      vb.setVelocity(0, 0);
      this.arena.showFloatingText(victim.x, victim.y - 46, '🌑 MOONFALL!', '#f2ecff');
    }
    this.moonDismountVictim = null;
    this.endNight();
  }

  /** Tears down the ride when the moon is destroyed under fire (as opposed to dismounted). */
  private destroyMoon(): void {
    const player = this.arena.player;
    this.gravMoonActive = false;
    if (this.gravMoonSprite) { this.gravMoonSprite.destroy(); this.gravMoonSprite = null; }
    if (this.gravMoonHpBar) { this.gravMoonHpBar.destroy(); this.gravMoonHpBar = null; }
    if (this.gravMoonHpBg) { this.gravMoonHpBg.destroy(); this.gravMoonHpBg = null; }
    player.damageAbsorber = null;
    this.endNight();
    this.arena.showFloatingText(player.x, player.y - 30, 'Moon Destroyed!', '#ff8888');
    this.pfx.impact(this.gravMoonX, this.gravMoonY, 110, {
      tones: MOON_TONES, rocks: 20, dust: 5, duration: 700, crater: false,
    });
    this.arena.scene.cameras.main.shake(320, 0.009);
  }

  // ── Gravity Mastery ────────────────────────────────────────────────────

  /** Credits damage dealt to the npc toward the "tetherDamage" requirement while Gravity Anchor holds it. */
  private noteTetherDamage(target: Fighter, amount: number): void {
    if (this.gravAnchor && target === this.arena.npc) this.arena.recordMasteryStat('tetherDamage', amount);
  }

  /** Gravity Aura (passive): 20% chance to catch an incoming projectile instead of taking the hit. */
  tryCatchProjectile(proj: Projectile): boolean {
    if (!this.arena.masteryActive) return false;
    if (this.auraOrbs.length >= AURA_MAX_ORBS) return false;
    if (Math.random() >= 0.2) return false;
    const scene = this.arena.scene;
    const player = this.arena.player;
    const sprite = scene.add.graphics().setDepth(9).setPosition(proj.x, proj.y);
    this.auraOrbs.push({ sprite, angle: Math.random() * Math.PI * 2, until: scene.time.now + AURA_DURATION_MS, damage: proj.damage, textureKey: proj.texture.key });
    this.pfx.bloom(proj.x, proj.y, 22, 6, 9, VOID_TONES);
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
    this.arena.showFloatingText(player.x, player.y - 30, '🌌 CAUGHT', '#ccbbee');
    return true;
  }

  private updateAura(time: number, delta: number): void {
    if (this.auraOrbs.length === 0) return;
    const scene = this.arena.scene;
    const player = this.arena.player;
    for (let i = this.auraOrbs.length - 1; i >= 0; i--) {
      const orb = this.auraOrbs[i];
      if (time >= orb.until) {
        orb.sprite.destroy();
        this.auraOrbs.splice(i, 1);
        const ptr = scene.input.activePointer;
        const dx = ptr.worldX - player.x;
        const dy = ptr.worldY - player.y;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 420;
        const outProj = new Projectile(scene, player.x, player.y, orb.textureKey, orb.damage, true);
        this.arena.projectiles.add(outProj);
        outProj.launch((dx / len) * speed, (dy / len) * speed);
        // Slung back out: the cage lets go where the shot leaves.
        this.pfx.arms(player.x, player.y, 4, {
          speed: 120, angle: Math.atan2(dy, dx), spread: 0.7, size: 2.6, life: 380, depth: 8, tones: VOID_TONES,
        });
        continue;
      }
      orb.angle += delta * 0.0022;
      orb.sprite.setPosition(player.x + Math.cos(orb.angle) * AURA_ORBIT_RADIUS, player.y + Math.sin(orb.angle) * AURA_ORBIT_RADIUS);
      orb.sprite.clear();
      GravityFx.drawCaughtOrb(orb.sprite, this.pcol, VOID_TONES, 0, 0, time / 1000 + orb.angle);
      // Any other (enemy-fired) projectile that touches an orbiting one destroys both.
      for (const other of this.arena.projectiles.getChildren() as Projectile[]) {
        if (!other.active || other.isFromPlayer) continue;
        if (Phaser.Math.Distance.Between(orb.sprite.x, orb.sprite.y, other.x, other.y) < 16) {
          other.setActive(false).setVisible(false);
          (other.body as Phaser.Physics.Arcade.Body).stop();
          orb.sprite.destroy();
          this.auraOrbs.splice(i, 1);
          break;
        }
      }
    }
  }

  /** The slot Starfall is bound over this match, or null when it isn't bound anywhere. */
  private starfallSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'starfall') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Starfall is bound to a slot. */
  getStarfallCooldownRatio(time: number): number {
    return Math.min(1, (time - this.starfallLastCastAt) / STARFALL_COOLDOWN_MS);
  }

  private tryCastStarfall(time: number): void {
    if (time - this.starfallLastCastAt < STARFALL_COOLDOWN_MS) return;
    this.starfallLastCastAt = time;
    this.spawnStarfall('player');
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '🌙 STARFALL', '#ccbbee');
    // Online: the opponent's sim owns their HP, so replay Starfall there to damage them.
    this.arena.broadcastMasteryCast('starfall');
  }

  /** Online replay: the remote gravity player cast Starfall — rain orbs that damage the local player. */
  doNpcStarfall(_tx: number, _ty: number): void {
    this.spawnStarfall('npc');
  }

  private spawnStarfall(owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const W = this.arena.width;
    for (let i = 0; i < 20; i++) {
      const x = 20 + Math.random() * (W - 40);
      const sprite = scene.add.graphics().setDepth(8).setPosition(x, -20);
      this.starfallOrbs.push({ sprite, hitSet: new Set(), owner });
    }
  }

  /** Grounds a target for 10s: pinned to the arena floor, only able to move left/right, hopping occasionally. */
  private applyGrounded(target: Fighter, time: number): void {
    const floorY = this.arena.height - 40;
    const existing = this.grounded.get(target);
    if (existing) {
      existing.until = time + GROUNDED_DURATION_MS;
    } else {
      this.grounded.set(target, {
        until: time + GROUNDED_DURATION_MS,
        floorY,
        jumpUntil: 0,
        jumpStartAt: 0,
        nextAutoJumpAt: time + 2000 + Math.random() * 1500,
      });
      this.arena.showFloatingText(target.x, target.y - 30, '⬇️ GROUNDED', '#ccbbee');
    }
  }

  private updateStarfall(time: number, delta: number): void {
    if (this.starfallOrbs.length === 0) return;
    const scene = this.arena.scene;
    const H = this.arena.height;
    for (let i = this.starfallOrbs.length - 1; i >= 0; i--) {
      const orb = this.starfallOrbs[i];
      // 'npc' orbs are the opponent's Starfall replayed on this victim sim — they
      // target the local player; 'player' orbs target the local enemy list.
      const targets = orb.owner === 'npc' ? [this.arena.player] : this.arena.enemies;
      orb.sprite.y += STARFALL_FALL_SPEED * (delta / 1000);
      orb.sprite.clear();
      GravityFx.drawStar(orb.sprite, this.col(orb.owner), tonesFor(orb.owner), 0, 0, time / 1000 + orb.sprite.x);
      for (const target of targets) {
        if (!target.active || target.hp <= 0 || orb.hitSet.has(target)) continue;
        if (Phaser.Math.Distance.Between(orb.sprite.x, orb.sprite.y, target.x, target.y) <= 20) {
          target.takeDamage(10);
          this.arena.spawnHitFlash(target.x, target.y, 0x8844cc);
          this.applyGrounded(target, time);
          orb.hitSet.add(target);
        }
      }
      if (orb.sprite.y >= H - 20) {
        const ix = orb.sprite.x;
        const iy = H - 20;
        orb.sprite.destroy();
        this.starfallOrbs.splice(i, 1);
        this.fx(orb.owner).impact(ix, iy, 52, {
          tones: tonesFor(orb.owner), rocks: 4, dust: 1, duration: 380, crater: false,
        });
        // The star itself coming apart, in the same flare it fell as.
        this.fx(orb.owner).starBurst(ix, iy, 46, 9, tonesFor(orb.owner));
        for (const target of targets) {
          if (!target.active || target.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(ix, iy, target.x, target.y) <= 45) {
            target.takeDamage(15);
            this.arena.spawnHitFlash(target.x, target.y, 0xaa66ff);
            this.applyGrounded(target, time);
          }
        }
      }
    }
  }

  private updateGrounded(time: number): void {
    if (this.grounded.size === 0) return;
    for (const [target, g] of this.grounded) {
      if (!target.active || target.hp <= 0 || time >= g.until) {
        this.grounded.delete(target);
        continue;
      }
      if (time >= g.jumpUntil) {
        // Local player: jump on their own W press. Anyone else (bots/husks/remote replicas): auto-jump.
        const wantsJump = target === this.arena.player
          ? Phaser.Input.Keyboard.JustDown(this.arena.wKey)
          : time >= g.nextAutoJumpAt;
        if (wantsJump) {
          g.jumpStartAt = time;
          g.jumpUntil = time + GROUNDED_JUMP_DURATION_MS;
          g.nextAutoJumpAt = time + 2000 + Math.random() * 1500;
        }
      }
      const body = target.body as Phaser.Physics.Arcade.Body;
      if (time < g.jumpUntil) {
        const t = Math.min(1, (time - g.jumpStartAt) / GROUNDED_JUMP_DURATION_MS);
        target.y = g.floorY - Math.sin(t * Math.PI) * GROUNDED_JUMP_HEIGHT;
      } else {
        target.y = g.floorY;
      }
      body.velocity.y = 0;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number, delta: number): void {
    const player = this.arena.player;
    // Off the board (Anti-Grav) or mid-finale (dismount): the only input that matters is the
    // cursor, and `updateAntiGrav` reads that itself. Everything else is on hold.
    if (this.antiGravAirborne || this.moonDismountPhase >= 0) {
      this.gravClickArmed = pointer.isDown;
      this.gravEKeyWasDown = this.arena.eKey.isDown;
      this.gravQWasDown = this.arena.qKey.isDown;
      return;
    }
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Gravity Mastery — Starfall may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const sfSlot = this.arena.masteryActive ? this.starfallSlot() : null;
    // Riding the moon rewrites every slot; `hasUpgrade('q')` is implied by being up there at all.
    const riding = this.gravMoonActive;

    // Click: tap = single meteor shadow; drag = space slash
    // Track pointer down/up (separate from global pointerWasDown so we don't interfere)
    if (pointer.isDown && !this.gravClickArmed) {
      this.gravPointerDownX = mouseX;
      this.gravPointerDownY = mouseY;
      this.gravClickArmed = true;
    }
    if (!pointer.isDown && this.gravClickArmed) {
      this.gravClickArmed = false;
      const dx = mouseX - this.gravPointerDownX;
      const dy = mouseY - this.gravPointerDownY;
      const dragDist = Math.hypot(dx, dy);
      const DRAG_THRESHOLD = 24;

      if (this.gravMeteorRainHolding) {
        // In record mode: place a frozen meteor shadow
        const maxShadows = this.arena.hasUpgrade('e') ? 10 : 5;
        const frozenCount = this.gravMeteorShadows.filter(s => s.frozen && s.owner === 'player').length;
        if (frozenCount < maxShadows) {
          this.doMeteorShadow(mouseX, mouseY, 'player', true);
          this.gravMeteorRainLiveCount++;
        }
      } else if (player.getCooldownRatio('space-slash') >= 1) {
        if (dragDist >= DRAG_THRESHOLD) {
          // Space Slash
          playerCtx.gravitySlash(this.gravPointerDownX, this.gravPointerDownY, mouseX, mouseY);
          player.triggerCooldown('space-slash');
        } else {
          // Single tap meteor
          playerCtx.gravityMeteorShadow(mouseX, mouseY);
          player.triggerCooldown('space-slash');
        }
      }
    }

    // Meteor Storm (Click+): auto-spawn shadows near cursor while holding.
    // From the moon it stops being a drizzle and becomes a relentless barrage.
    if (pointer.isDown && this.arena.hasUpgrade('click')) {
      const interval = riding ? MOON_STORM_INTERVAL_MS : 1000;
      const spread = riding ? 190 : 100;
      this.gravMeteorStormAccum += delta;
      while (this.gravMeteorStormAccum >= interval) {
        this.gravMeteorStormAccum -= interval;
        const ox = (Math.random() - 0.5) * spread;
        const oy = (Math.random() - 0.5) * spread;
        this.doMeteorShadow(mouseX + ox, mouseY + oy, 'player', false, false);
      }
    } else {
      this.gravMeteorStormAccum = 0;
    }

    // E: Meteor Rain — hold to record, tap to replay (or Starfall if bound)
    if (sfSlot === 'e') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) this.tryCastStarfall(time);
    } else if (riding) {
      // Q+ E: no recording, no replay — the entire sky comes down at once.
      if (Phaser.Input.Keyboard.JustDown(this.arena.eKey) && player.getCooldownRatio('meteor-rain') >= 1) {
        this.doMoonMeteorBarrage(time);
        player.triggerCooldown('meteor-rain');
      }
    } else {
      if (this.arena.eKey.isDown && !this.gravEKeyWasDown) {
        // Rising edge: start recording session (E+ allows up to 10 shadows)
        this.gravEKeyHeldSince = time;
        this.gravMeteorRainHolding = true;
        this.gravMeteorRainLiveCount = 0;
        if (this.gravMeteorRainAura) this.gravMeteorRainAura.destroy();
        this.gravMeteorRainAura = new GravityWell(this.arena.scene, this.pcol, VOID_TONES, 30, 4);
        this.playerAvatar?.setHold('charge');
      }
      if (this.gravMeteorRainHolding && this.gravMeteorRainAura) {
        // The well tightens as more shadows go down — the plan getting heavier.
        const charge = Math.min(1, this.gravMeteorRainLiveCount / (this.arena.hasUpgrade('e') ? 10 : 5));
        this.gravMeteorRainAura.update(delta, player.x, player.y, charge, player.alpha);
      }
      if (!this.arena.eKey.isDown && this.gravEKeyWasDown) {
        // Falling edge
        const heldMs = time - this.gravEKeyHeldSince;
        if (this.gravMeteorRainAura) { this.gravMeteorRainAura.destroy(); this.gravMeteorRainAura = null; }
        this.playerAvatar?.setHold(null);

        if (this.gravMeteorRainLiveCount > 0) {
          // Recording session with shadows placed: save pattern + convert frozen to live
          this.gravMeteorRainRecorded = this.gravMeteorShadows
            .filter(s => s.frozen && s.owner === 'player')
            .map(s => ({ x: s.x, y: s.y }));
          for (const s of this.gravMeteorShadows) {
            if (s.frozen && s.owner === 'player') {
              s.frozen = false;
              s.fireAt = time + 1500;
            }
          }
        } else if (heldMs < 150) {
          // Quick tap with no shadows placed: replay saved pattern
          if (player.getCooldownRatio('meteor-rain') >= 1 && this.gravMeteorRainRecorded.length > 0) {
            for (const pos of this.gravMeteorRainRecorded) {
              this.doMeteorShadow(pos.x, pos.y, 'player', false);
            }
            player.triggerCooldown('meteor-rain');
          }
        }
        this.gravMeteorRainHolding = false;
        this.gravMeteorRainLiveCount = 0;
      }
    }
    this.gravEKeyWasDown = this.arena.eKey.isDown;

    // R: Space Slam (or Starfall if bound)
    if (sfSlot === 'r') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) this.tryCastStarfall(time);
    } else if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      player.castAbility('space-slam', playerCtx);
    }

    // F: Grav Bomb — tap / short-hold = snap; hold ≥2s + release = explosion (or Starfall if bound)
    if (sfSlot === 'f') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.fKey)) this.tryCastStarfall(time);
    } else if (riding) {
      // Q+ F: no charge, no aiming — the whole arena is pulled down at once.
      if (Phaser.Input.Keyboard.JustDown(this.arena.fKey) && player.getCooldownRatio('grav-bomb') >= 1) {
        this.startMoonCrush(time);
        player.triggerCooldown('grav-bomb');
      }
    } else if (this.arena.fKey.isDown) {
      if (!this.gravBombHolding && player.getCooldownRatio('grav-bomb') >= 1) {
        this.gravBombHolding = true;
        this.gravBombHoldStart = time;
        this.gravBombLastX = mouseX;
        this.gravBombLastY = mouseY;
        if (this.gravBombVisual) this.gravBombVisual.destroy();
        this.gravBombVisual = new GravityWell(this.arena.scene, this.pcol, VOID_TONES, 120, 4);
        this.playerAvatar?.setHold('charge');
      }
      if (this.gravBombHolding) {
        this.gravBombLastX = mouseX;
        this.gravBombLastY = mouseY;
        player.chargeRatio = Math.min(1, (time - this.gravBombHoldStart) / 2000);
        // The horizon only opens once it is charged enough to actually detonate.
        this.gravBombVisual?.update(delta, mouseX, mouseY, player.chargeRatio, 1);
      }
    } else if (this.gravBombHolding) {
      // Released
      const heldMs = time - this.gravBombHoldStart;
      this.gravBombHolding = false;
      player.chargeRatio = 0;
      if (this.gravBombVisual) { this.gravBombVisual.destroy(); this.gravBombVisual = null; }
      this.playerAvatar?.setHold(null);
      const mx = this.gravBombLastX;
      const my = this.gravBombLastY;
      // F+ Anti-Grav: a full charge aimed at *yourself* launches instead of detonating.
      if (heldMs >= 2000 && this.arena.hasUpgrade('f')
          && Phaser.Math.Distance.Between(mx, my, player.x, player.y) <= ANTIGRAV_SELF_RADIUS) {
        this.startAntiGrav(time);
        player.triggerCooldown('grav-bomb');
        this.gravQWasDown = this.arena.qKey.isDown;
        return;
      }
      if (heldMs >= 2000) {
        // Charged explosion
        if (Phaser.Math.Distance.Between(mx, my, this.arena.npc.x, this.arena.npc.y) <= 100) {
          this.arena.npc.takeDamage(40);
          this.noteTetherDamage(this.arena.npc, 40);
          this.arena.spawnHitFlash(this.arena.npc.x, this.arena.npc.y, 0x8844cc);
        }
        // The charged release: a full well collapsing, then everything it held blown out.
        this.playerAvatar?.play('slam', Math.atan2(my - player.y, mx - player.x));
        this.pfx.well(mx, my, 100, 320, undefined, 6, VOID_TONES);
        this.pfx.impact(mx, my, 100, { tones: VOID_TONES, rocks: 12, dust: 3, duration: 520, crater: false });
        this.arena.scene.cameras.main.shake(240, 0.007);
      } else {
        // Tap snap
        playerCtx.gravityGravBombSnap(mx, my);
      }
      player.triggerCooldown('grav-bomb');
    }

    // Q: Lunar Landing (or Moon Rider with Q+) — or Starfall if bound
    if (sfSlot === 'q') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) this.tryCastStarfall(time);
      this.gravQWasDown = this.arena.qKey.isDown;
      return;
    }
    if (this.arena.hasUpgrade('q')) {
      // The dismount finale is one-and-done: after it, Q is dead for the rest of the match.
      if (this.moonUltimateSpent) {
        if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
          this.arena.showFloatingText(player.x, player.y - 34, '🌑 The moon is gone', '#8877aa');
        }
        this.gravQWasDown = this.arena.qKey.isDown;
        return;
      }
      // Riding: Q is the dismount, on the press, with no hold.
      if (riding) {
        if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) this.startMoonDismount(time);
        this.gravQWasDown = this.arena.qKey.isDown;
        return;
      }
      if (this.arena.qKey.isDown && !this.gravQWasDown) {
        this.gravMoonHolding = true;
        this.gravMoonHoldStart = time;
        if (!this.gravMoonChargeCircle) {
          this.gravMoonChargeCircle = new GravityWell(this.arena.scene, this.pcol, MOON_TONES, 28, 12);
        }
        if (!this.gravMoonChargeText) {
          this.gravMoonChargeText = this.arena.scene.add.text(player.x, player.y - 50, 'Mounting 0%', { fontSize: '11px', color: '#ccbbee' }).setOrigin(0.5).setDepth(13);
        }
      }
      if (this.gravMoonHolding && this.gravMoonChargeCircle && this.gravMoonChargeText) {
        const mountPct = Math.min(100, Math.round((time - this.gravMoonHoldStart) / 3000 * 100));
        this.gravMoonChargeText.setText(`Mounting ${mountPct}%`).setPosition(player.x, player.y - 50);
        this.gravMoonChargeCircle.update(delta, player.x, player.y + 32, mountPct / 100, 1);
      }
      if (!this.arena.qKey.isDown && this.gravQWasDown) {
        if (this.gravMoonChargeCircle) { this.gravMoonChargeCircle.destroy(); this.gravMoonChargeCircle = null; }
        if (this.gravMoonChargeText) { this.gravMoonChargeText.destroy(); this.gravMoonChargeText = null; }
        if (this.gravMoonHolding) {
          this.gravMoonHolding = false;
          const heldMs = time - this.gravMoonHoldStart;
          if (heldMs >= 3000 && player.getCooldownRatio('lunar-landing') >= 1) {
            this.mountMoon();
          } else if (player.getCooldownRatio('lunar-landing') >= 1) {
            // Short press: regular lunar landing
            player.castAbility('lunar-landing', playerCtx);
          }
        }
      }
      this.gravQWasDown = this.arena.qKey.isDown;
    } else {
      if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
        player.castAbility('lunar-landing', playerCtx);
      }
    }
  }

  // ── Per-frame update ───────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const player = this.arena.player;
    const npc = this.arena.npc;
    const scene = this.arena.scene;
    this.updateAvatars(delta);

    // Space Slash telegraphs: resolve damage + knockback after 500ms delay
    for (let i = this.gravSlashes.length - 1; i >= 0; i--) {
      const sl = this.gravSlashes[i];
      if (time >= sl.fireAt) {
        this.gravSlashes.splice(i, 1);
        for (const target of (sl.owner === 'player' ? this.arena.enemies : [player])) {
          if (!target.active || target.hp <= 0) continue;
          const d = this.pointToSegmentDist(target.x, target.y, sl.x1, sl.y1, sl.x2, sl.y2);
          if (d <= 40) {
            target.takeDamage(sl.damage);
            if (sl.owner === 'player') this.noteTetherDamage(target, sl.damage);
            this.arena.spawnHitFlash(target.x, target.y, 0x8844cc);
            const kx = sl.x2 - sl.x1;
            const ky = sl.y2 - sl.y1;
            const klen = Math.hypot(kx, ky) || 1;
            (target.body as Phaser.Physics.Arcade.Body).setVelocity((kx / klen) * sl.knockback, (ky / klen) * sl.knockback);
          }
        }
      }
    }

    // Meteor shadows: resolve when fireAt reached (skip frozen ones)
    for (let i = this.gravMeteorShadows.length - 1; i >= 0; i--) {
      const ms = this.gravMeteorShadows[i];
      // The shadow tightens and the rock grows out of the sky as the fuse runs down.
      ms.t += delta / 1000;
      ms.sprite.clear();
      GravityFx.drawShadow(
        ms.sprite, this.col(ms.owner), tonesFor(ms.owner), ms.x, ms.y, ms.visualRadius, ms.t,
        ms.frozen ? 0 : (time - ms.spawnAt) / Math.max(1, ms.fireAt - ms.spawnAt), ms.frozen,
      );
      if (ms.frozen) continue;
      if (time >= ms.fireAt) {
        const colossal = ms.visualRadius > 30;
        ms.sprite.destroy();
        this.gravMeteorShadows.splice(i, 1);
        this.fx(ms.owner).impact(ms.x, ms.y, ms.radius, {
          tones: METEOR_TONES, rocks: colossal ? 22 : 9, dust: colossal ? 5 : 2, duration: colossal ? 700 : 460,
        });
        if (colossal) this.fx(ms.owner).ring(ms.x, ms.y, 24, ms.radius * 1.5, GRAVITY.magma, 620, 6, 7);
        scene.cameras.main.shake(colossal ? 260 : 120, colossal ? 0.009 : 0.004);
        for (const target of (ms.owner === 'player' ? this.arena.enemies : [player])) {
          if (!target.active || target.hp <= 0) continue;
          const dist = Phaser.Math.Distance.Between(ms.x, ms.y, target.x, target.y);
          if (dist <= ms.radius) {
            const dmg = dist <= ms.directHitRadius ? ms.damage + ms.directBonus : ms.damage;
            target.takeDamage(dmg);
            if (ms.owner === 'player') {
              this.arena.recordMasteryStat('meteorHits', 1);
              this.noteTetherDamage(target, dmg);
            }
            this.arena.spawnHitFlash(target.x, target.y, 0xaa66ff);
          }
        }
        // E+: 15% chance to leave a fire pool on impact
        if (ms.owner === 'player' && this.arena.hasUpgrade('e') && Math.random() < 0.15) {
          this.gravFirePuddles.push({
            sprite: scene.add.graphics().setDepth(2), t: Math.random() * 8,
            expiresAt: time + 8000, x: ms.x, y: ms.y, radius: 35, tickAccum: 0, owner: 'player',
          });
        }
        // Quake perk: spawn a mini tsunami wave on impact
        if (this.arena.hasPerk(ms.owner, 'quake')) this.arena.spawnQuakeWave(ms.owner, ms.x, ms.y);
      }
    }

    // Grav Bomb hold drag: pull enemy toward cursor only if inside the vortex circle (runs after doAI)
    if (this.gravBombHolding) {
      const distToVortex = Phaser.Math.Distance.Between(this.gravBombLastX, this.gravBombLastY, npc.x, npc.y);
      if (distToVortex <= 120) {
        const gdx = this.gravBombLastX - npc.x;
        const gdy = this.gravBombLastY - npc.y;
        const gd = Math.hypot(gdx, gdy) || 1;
        const nb2 = npc.body as Phaser.Physics.Arcade.Body;
        nb2.velocity.x += (gdx / gd) * 55;
        nb2.velocity.y += (gdy / gd) * 55;
      }
    }

    // Space Slam: keep target locked at floor for a brief window
    if (time < this.gravSpaceSlamLockUntil) {
      const H = scene.scale.height;
      npc.y = H - 40;
      const nb3 = npc.body as Phaser.Physics.Arcade.Body;
      nb3.velocity.y = Math.min(nb3.velocity.y, 0);
    }
    if (time < this.npcGravSpaceSlamLockUntil) {
      const H = scene.scale.height;
      player.y = H - 40;
      const pb3 = player.body as Phaser.Physics.Arcade.Body;
      pb3.velocity.y = Math.min(pb3.velocity.y, 0);
    }

    // Lunar Landing: the stage-wide shadow, then the thing that was casting it
    if (this.gravLunarShadow) {
      this.gravLunarT += delta / 1000;
      const p = Phaser.Math.Clamp(1 - (this.gravLunarFireAt - time) / 3000, 0, 1);
      this.gravLunarShadow.clear();
      GravityFx.drawShadow(this.gravLunarShadow, this.col(this.gravLunarOwner), tonesFor(this.gravLunarOwner),
        this.gravLunarX, this.gravLunarY, this.gravLunarRadius, this.gravLunarT, p, false);
    }
    if (this.gravLunarShadow && time >= this.gravLunarFireAt) {
      const lsX = this.gravLunarX;
      const lsY = this.gravLunarY;
      const lsR = this.gravLunarRadius;
      this.gravLunarShadow.destroy();
      this.gravLunarShadow = null;

      // The ultimate: everything scales with it — ejecta, dust, duration and the shake.
      const fx = this.fx(this.gravLunarOwner);
      fx.impact(lsX, lsY, lsR, { tones: METEOR_TONES, rocks: 40, dust: 10, duration: 1100 });
      fx.ring(lsX, lsY, lsR * 0.2, lsR * 1.6, GRAVITY.violet, 900, 7, 9);
      fx.arms(lsX, lsY, 18, { speed: lsR * 2.2, size: 6, life: 900, depth: 9, tones: VOID_TONES });
      scene.cameras.main.shake(700, 0.016);

      // Deal damage to enemies inside the shadow circle
      for (const target of (this.gravLunarOwner === 'player' ? this.arena.enemies : [player])) {
        if (!target.active || target.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(lsX, lsY, target.x, target.y) <= lsR) {
          target.takeDamage(60);
          if (this.gravLunarOwner === 'player') {
            this.arena.recordMasteryStat('moonHits', 1);
            this.noteTetherDamage(target, 60);
          }
          this.arena.spawnHitFlash(target.x, target.y, 0xaa66ff);
        }
      }

      // Spawn 20 fire puddles randomly inside the shadow circle
      for (let pi = 0; pi < 20; pi++) {
        // Uniform random point in circle: use sqrt of uniform random for radius
        const r = lsR * 0.9 * Math.sqrt(Math.random());
        const angle = Math.random() * Math.PI * 2;
        const px = lsX + Math.cos(angle) * r;
        const py = lsY + Math.sin(angle) * r;
        this.gravFirePuddles.push({
          sprite: scene.add.graphics().setDepth(2), t: Math.random() * 8,
          expiresAt: time + 8000, x: px, y: py, radius: 35, tickAccum: 0, owner: this.gravLunarOwner,
        });
      }
      // Quake perk: spawn a mini tsunami wave at lunar landing impact
      if (this.arena.hasPerk(this.gravLunarOwner, 'quake')) this.arena.spawnQuakeWave(this.gravLunarOwner, lsX, lsY);
    }

    // Gravity Anchor (R+): tether enemy near anchor point
    if (this.gravAnchor) {
      const anc = this.gravAnchor;
      if (time >= anc.expireAt) {
        anc.gfx.destroy(); this.gravAnchor = null;
      } else {
        anc.t += delta / 1000;
        const distToAnc = Phaser.Math.Distance.Between(anc.x, anc.y, npc.x, npc.y);
        const maxDist = 150;
        // The tether goes taut as they pull against it, which is exactly when it starts pulling back.
        anc.gfx.clear();
        GravityFx.drawAnchor(anc.gfx, this.pcol, VOID_TONES, anc.x, anc.y, npc.x, npc.y, anc.t,
          Phaser.Math.Clamp(distToAnc / maxDist, 0, 1));
        if (distToAnc > maxDist) {
          const pullDx = anc.x - npc.x;
          const pullDy = anc.y - npc.y;
          const pullLen = Math.hypot(pullDx, pullDy) || 1;
          const nb = npc.body as Phaser.Physics.Arcade.Body;
          const pullStr = (distToAnc - maxDist) * 5;
          nb.velocity.x += (pullDx / pullLen) * pullStr;
          nb.velocity.y += (pullDy / pullLen) * pullStr;
        }
      }
    }

    // Moon Rider (Q+): the perimeter flight, everything it runs over, and the moon soaking hits
    if (this.gravMoonActive && this.gravMoonSprite) {
      this.updateMoonRide(time, delta);
      // Moon absorbs incoming hits (damage absorber on player)
      if (!player.damageAbsorber) {
        player.damageAbsorber = (amount: number) => {
          if (!this.gravMoonActive || !this.gravMoonSprite) return false;
          this.gravMoonHp -= amount;
          if (this.gravMoonHpBar) this.gravMoonHpBar.setSize(56 * Math.max(0, this.gravMoonHp / 100), 5);
          this.arena.spawnHitFlash(this.gravMoonX, this.gravMoonY, 0xccbbee);
          if (this.gravMoonHp <= 0) this.destroyMoon();
          return true;
        };
      }
    } else if (!this.gravMoonActive && this.moonDismountPhase < 0
               && player.damageAbsorber && this.arena.elementId === 'gravity') {
      // Clear moon absorber if moon died
      player.damageAbsorber = null;
    }

    // Q+ R chain, Q+ F field, the dismount finale, and the night that frames all three.
    this.updateMoonSlams(time);
    this.updateMoonCrush(time, delta);
    this.updateMoonDismount(time, delta);
    this.updateNight(time, delta);

    // Gravity fire puddle tick + expiry
    for (let i = this.gravFirePuddles.length - 1; i >= 0; i--) {
      const fp = this.gravFirePuddles[i];
      if (time > fp.expiresAt) {
        fp.sprite.destroy();
        this.gravFirePuddles.splice(i, 1);
        continue;
      }
      fp.t += delta / 1000;
      fp.sprite.clear();
      GravityFx.drawFirePool(fp.sprite, this.col(fp.owner), fp.x, fp.y, fp.radius, fp.t,
        Phaser.Math.Clamp((fp.expiresAt - time) / 8000, 0, 1) * 0.5 + 0.5);
      const fpTargets = (fp.owner === 'player' ? this.arena.enemies : [player])
        .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(fp.x, fp.y, t.x, t.y) <= fp.radius);
      if (fpTargets.length > 0) {
        fp.tickAccum += delta;
        if (fp.tickAccum >= 300) {
          fp.tickAccum -= 300;
          for (const fTarget of fpTargets) {
            fTarget.takeDamage(4, { source: fp, sourceX: fp.x, sourceY: fp.y });
            if (fp.owner === 'player') this.noteTetherDamage(fTarget, 4);
            this.arena.spawnHitFlash(fTarget.x, fTarget.y, 0xff6633);
          }
        }
      }
    }

    // Anti-Grav (F+): the flight and the slam that ends it
    this.updateAntiGrav(time, delta);

    // Gravity Mastery: aura orbit/mutual-destroy/refire, Starfall orb fall/impact, Grounded status
    this.updateAura(time, delta);
    this.updateStarfall(time, delta);
    this.updateGrounded(time);
  }

  private pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
  }
}
