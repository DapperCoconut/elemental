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

export interface GravMeteorRushShadow {
  rect: Phaser.GameObjects.Rectangle;
  fireAt: number;
  clickX: number;
  clickY: number;
  edge: 'top' | 'bottom' | 'left' | 'right';
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
  readonly wKey: Phaser.Input.Keyboard.Key;
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
  get playerSpeedMult(): number;
  set playerSpeedMult(v: number);
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
  private gravMeteorRushShadows: GravMeteorRushShadow[] = [];
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
  private gravMoonRamCooldown = 0;
  private gravQWasDown = false;
  private gravMoonChargeCircle: GravityWell | null = null;
  private gravMoonChargeText: Phaser.GameObjects.Text | null = null;

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
      av.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
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
    for (const rs of this.gravMeteorRushShadows) rs.rect.destroy();
    this.gravMeteorRushShadows = [];
    this.gravMoonActive = false; this.gravMoonHolding = false; this.gravMoonHoldStart = 0; this.gravMoonHp = 0;
    if (this.gravMoonSprite) { this.gravMoonSprite.destroy(); this.gravMoonSprite = null; }
    if (this.gravMoonHpBar) { this.gravMoonHpBar.destroy(); this.gravMoonHpBar = null; }
    if (this.gravMoonHpBg) { this.gravMoonHpBg.destroy(); this.gravMoonHpBg = null; }
    this.gravMoonRamCooldown = 0; this.gravQWasDown = false;
    if (this.gravMoonChargeCircle) { this.gravMoonChargeCircle.destroy(); this.gravMoonChargeCircle = null; }
    if (this.gravMoonChargeText) { this.gravMoonChargeText.destroy(); this.gravMoonChargeText = null; }

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
    // A seam opening in space that stays open for the half-second before it snaps shut on them.
    this.avatar(owner)?.play('sweep', Math.atan2(y2 - y1, x2 - x1));
    this.fx(owner).rift(x1, y1, x2, y2, 620, 6, tonesFor(owner));
    this.gravSlashes.push({ x1, y1, x2, y2, fireAt: scene.time.now + 500, owner, damage: 18, knockback: 400 });
  }

  /** Was `spawnGravMeteorShadow` on ArenaScene. */
  doMeteorShadow(x: number, y: number, owner: 'player' | 'npc', frozen: boolean): void {
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
    const spr = scene.add.graphics().setDepth(5);
    this.gravMeteorShadows.push({
      sprite: spr, fireAt: frozen ? Infinity : scene.time.now + 1500,
      spawnAt: scene.time.now, t: Math.random() * 6,
      x, y, owner, damage: 14, radius: 70, directHitRadius: 28, directBonus: 16, frozen,
    });
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
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Gravity Mastery — Starfall may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const sfSlot = this.arena.masteryActive ? this.starfallSlot() : null;

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
      } else if (this.gravBombHolding && this.arena.hasUpgrade('f')) {
        // F+ Meteor Rush: click inside grav bomb radius spawns a rush shadow
        const distToBomb = Math.hypot(mouseX - this.gravBombLastX, mouseY - this.gravBombLastY);
        if (distToBomb <= 120 && dragDist < DRAG_THRESHOLD) {
          const W = this.arena.width, H = this.arena.height;
          const edges: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
          const edge = edges[Math.floor(Math.random() * 4)];
          // Bar orientation matches meteor travel direction:
          // top/bottom → meteor travels vertically → vertical bar strip at x=clickX
          // left/right → meteor travels horizontally → horizontal bar strip at y=clickY
          let rw = 0, rh = 0, shadowCx = 0, shadowCy = 0;
          if (edge === 'top') { rw = 24; rh = mouseY; shadowCx = mouseX; shadowCy = mouseY / 2; }
          else if (edge === 'bottom') { rw = 24; rh = H - mouseY; shadowCx = mouseX; shadowCy = mouseY + (H - mouseY) / 2; }
          else if (edge === 'left') { rw = mouseX; rh = 24; shadowCx = mouseX / 2; shadowCy = mouseY; }
          else { rw = W - mouseX; rh = 24; shadowCx = mouseX + (W - mouseX) / 2; shadowCy = mouseY; }
          const rushRect = this.arena.scene.add.rectangle(shadowCx, shadowCy, rw, rh, 0x0a0614, 0.55)
            .setStrokeStyle(2, 0xaa44ff, 0.8).setDepth(5);
          this.arena.scene.tweens.add({ targets: rushRect, alpha: 0.2, yoyo: true, repeat: 2, duration: 250 });
          // The lane it is coming down: a rift torn along the meteor's path.
          this.pfx.rift(
            edge === 'top' || edge === 'bottom' ? shadowCx : shadowCx - rw / 2,
            edge === 'top' || edge === 'bottom' ? shadowCy - rh / 2 : shadowCy,
            edge === 'top' || edge === 'bottom' ? shadowCx : shadowCx + rw / 2,
            edge === 'top' || edge === 'bottom' ? shadowCy + rh / 2 : shadowCy,
            1400, 5, VOID_TONES,
          );
          this.gravMeteorRushShadows.push({ rect: rushRect, fireAt: time + 1500, clickX: mouseX, clickY: mouseY, edge });
        } else if (player.getCooldownRatio('space-slash') >= 1 && dragDist >= DRAG_THRESHOLD) {
          playerCtx.gravitySlash(this.gravPointerDownX, this.gravPointerDownY, mouseX, mouseY);
          player.triggerCooldown('space-slash');
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

    // Meteor Storm (Click+): auto-spawn shadows near cursor while holding
    if (pointer.isDown && this.arena.hasUpgrade('click')) {
      this.gravMeteorStormAccum += delta;
      while (this.gravMeteorStormAccum >= 1000) {
        this.gravMeteorStormAccum -= 1000;
        const ox = (Math.random() - 0.5) * 100;
        const oy = (Math.random() - 0.5) * 100;
        this.doMeteorShadow(mouseX + ox, mouseY + oy, 'player', false);
      }
    } else {
      this.gravMeteorStormAccum = 0;
    }

    // E: Meteor Rain — hold to record, tap to replay (or Starfall if bound)
    if (sfSlot === 'e') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) this.tryCastStarfall(time);
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
      if (this.arena.qKey.isDown && !this.gravQWasDown && !this.gravMoonActive) {
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
          if (heldMs >= 3000 && player.getCooldownRatio('lunar-landing') >= 1 && !this.gravMoonActive) {
            // Mount the moon
            this.gravMoonActive = true;
            this.gravMoonHp = 100;
            const moonR = 24; // 50% bigger than player (~16px)
            if (this.gravMoonHpBg) this.gravMoonHpBg.destroy();
            if (this.gravMoonHpBar) this.gravMoonHpBar.destroy();
            if (this.gravMoonSprite) this.gravMoonSprite.destroy();
            this.gravMoonSprite = this.arena.scene.add.graphics().setDepth(3);
            this.gravMoonX = player.x; this.gravMoonY = player.y + moonR + 8; this.gravMoonT = 0;
            this.playerAvatar?.play('raise');
            this.pfx.bloom(player.x, player.y + moonR + 8, moonR * 1.6, 10, 4, MOON_TONES);
            this.gravMoonHpBg = this.arena.scene.add.rectangle(player.x, player.y + moonR * 2 + 16, 40, 4, 0x333333).setDepth(9);
            this.gravMoonHpBar = this.arena.scene.add.rectangle(player.x - 20, player.y + moonR * 2 + 16, 40, 4, 0xccbbee).setDepth(10).setOrigin(0, 0.5);
            player.triggerCooldown('lunar-landing');
            this.arena.showFloatingText(player.x, player.y - 30, '🌕 Moon Rider!', '#ccbbee');
          } else {
            // Short press: regular lunar landing
            if (player.getCooldownRatio('lunar-landing') >= 1) {
              player.castAbility('lunar-landing', playerCtx);
            }
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
        ms.sprite, this.col(ms.owner), tonesFor(ms.owner), ms.x, ms.y, 22, ms.t,
        ms.frozen ? 0 : (time - ms.spawnAt) / Math.max(1, ms.fireAt - ms.spawnAt), ms.frozen,
      );
      if (ms.frozen) continue;
      if (time >= ms.fireAt) {
        ms.sprite.destroy();
        this.gravMeteorShadows.splice(i, 1);
        this.fx(ms.owner).impact(ms.x, ms.y, ms.radius, {
          tones: METEOR_TONES, rocks: 9, dust: 2, duration: 460,
        });
        scene.cameras.main.shake(120, 0.004);
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

    // Meteor Rush shadows (F+): resolve when fireAt reached
    for (let i = this.gravMeteorRushShadows.length - 1; i >= 0; i--) {
      const rs = this.gravMeteorRushShadows[i];
      if (time >= rs.fireAt) {
        rs.rect.destroy();
        this.gravMeteorRushShadows.splice(i, 1);
        const W = scene.scale.width, H = scene.scale.height;
        // Determine start position and velocity based on edge
        let startX = rs.clickX, startY = rs.clickY;
        let vx = 0, vy = 0;
        const rushSpeed = 900;
        if (rs.edge === 'top') { startX = rs.clickX; startY = -30; vy = rushSpeed; }
        else if (rs.edge === 'bottom') { startX = rs.clickX; startY = H + 30; vy = -rushSpeed; }
        else if (rs.edge === 'left') { startX = -30; startY = rs.clickY; vx = rushSpeed; }
        else { startX = W + 30; startY = rs.clickY; vx = -rushSpeed; }
        // Spawn as a fast-moving meteor projectile (manual movement)
        const rushSpr = scene.add.graphics().setDepth(8).setPosition(startX, startY);
        const rushAngle = Math.atan2(vy, vx);
        // Add to gravMeteorShadows as a fake live meteor that immediately impacts from its position
        // We'll track it manually with a special marker: use existing shadow with offset
        const fakeMs = { sprite: rushSpr as unknown as Phaser.GameObjects.Arc, fireAt: time + (rs.edge === 'top' || rs.edge === 'bottom' ? H / rushSpeed * 1000 : W / rushSpeed * 1000), x: startX, y: startY, owner: 'player' as const, damage: 14, radius: 70, directHitRadius: 28, directBonus: 16, frozen: false, vx, vy };
        // Move it manually each frame until it hits or leaves screen
        // Use a timer to move and check
        const rushInterval = scene.time.addEvent({
          delay: 16,
          loop: true,
          callback: () => {
            if (!rushSpr.active) { rushInterval.remove(); return; }
            rushSpr.x += vx * 0.016;
            rushSpr.y += vy * 0.016;
            // Repainted in its own local space, so the rock and its tail travel as one body.
            rushSpr.clear();
            rushSpr.rotation = rushAngle + Math.PI / 2;
            GravityFx.drawShadow(rushSpr, this.pcol, METEOR_TONES, 0, 0, 23, scene.time.now / 1000, 1, false);
            if (rushSpr.x < -60 || rushSpr.x > W + 60 || rushSpr.y < -60 || rushSpr.y > H + 60) {
              rushSpr.destroy(); rushInterval.remove(); return;
            }
            const rushDist = Phaser.Math.Distance.Between(rushSpr.x, rushSpr.y, npc.x, npc.y);
            if (rushDist <= fakeMs.radius) {
              const dmg = rushDist <= fakeMs.directHitRadius ? fakeMs.damage + fakeMs.directBonus : fakeMs.damage;
              npc.takeDamage(dmg);
              this.arena.recordMasteryStat('meteorHits', 1);
              this.noteTetherDamage(npc, dmg);
              this.arena.spawnHitFlash(npc.x, npc.y, 0xaa66ff);
              this.pfx.impact(rushSpr.x, rushSpr.y, 74, { tones: METEOR_TONES, rocks: 8, dust: 2, duration: 420, crater: false });
              scene.cameras.main.shake(150, 0.005);
              // Quake perk: spawn mini wave at rush impact
              if (this.arena.hasPerk('player', 'quake')) this.arena.spawnQuakeWave('player', rushSpr.x, rushSpr.y);
              rushSpr.destroy(); rushInterval.remove();
            }
          },
        });
        void fakeMs;
      }
    }

    // Moon Rider (Q+): update moon position, handle ramming and damage absorption
    if (this.gravMoonActive && this.gravMoonSprite) {
      const moonR = 24;
      this.gravMoonT += delta / 1000;
      this.gravMoonX = player.x; this.gravMoonY = player.y + moonR + 8;
      this.gravMoonSprite.clear();
      GravityFx.drawMoon(this.gravMoonSprite, this.pcol, this.gravMoonX, this.gravMoonY, moonR,
        this.gravMoonT, Math.max(0, this.gravMoonHp / 100));
      if (this.gravMoonHpBg) this.gravMoonHpBg.setPosition(player.x, player.y + moonR * 2 + 18);
      if (this.gravMoonHpBar) {
        this.gravMoonHpBar.setPosition(player.x - 20, player.y + moonR * 2 + 18);
        this.gravMoonHpBar.setSize(40 * Math.max(0, this.gravMoonHp / 100), 4);
      }
      // Speed boost
      this.arena.playerSpeedMult *= 1.25;
      // Ram: if moon overlaps enemy, launch them
      const moonDist = Phaser.Math.Distance.Between(this.gravMoonX, this.gravMoonY, npc.x, npc.y);
      if (moonDist <= moonR + 18 && time > this.gravMoonRamCooldown) {
        this.gravMoonRamCooldown = time + 800;
        npc.takeDamage(15);
        this.arena.recordMasteryStat('moonRams', 1);
        this.noteTetherDamage(npc, 15);
        this.arena.spawnHitFlash(npc.x, npc.y, 0xccbbee);
        this.arena.showFloatingText(npc.x, npc.y - 24, '15', '#ccbbee');
        // Launch enemy toward nearest wall but cap
        const W2 = scene.scale.width, H2 = scene.scale.height;
        const launchDx = npc.x - player.x;
        const launchDy = npc.y - player.y;
        const launchLen = Math.hypot(launchDx, launchDy) || 1;
        const targetWallX = launchDx > 0 ? W2 - 60 : 60;
        const targetWallY = launchDy > 0 ? H2 - 60 : 60;
        const capX = Math.abs(launchDx) > Math.abs(launchDy) ? targetWallX : npc.x + (launchDx / launchLen) * 200;
        const capY = Math.abs(launchDy) > Math.abs(launchDx) ? targetWallY : npc.y + (launchDy / launchLen) * 200;
        const nb = npc.body as Phaser.Physics.Arcade.Body;
        nb.setVelocity((capX - npc.x) * 4, (capY - npc.y) * 4);
        // A body the size of a moon hitting you is not a tap.
        this.pfx.impact(npc.x, npc.y, 66, { tones: MOON_TONES, rocks: 6, dust: 2, duration: 400, crater: false });
        scene.cameras.main.shake(160, 0.005);
      }
      // Moon absorbs incoming hits (damage absorber on player)
      if (!player.damageAbsorber) {
        player.damageAbsorber = (amount: number) => {
          if (!this.gravMoonActive || !this.gravMoonSprite) return false;
          this.gravMoonHp -= amount;
          if (this.gravMoonHpBar) this.gravMoonHpBar.setSize(40 * Math.max(0, this.gravMoonHp / 100), 4);
          this.arena.spawnHitFlash(this.gravMoonX, this.gravMoonY, 0xccbbee);
          if (this.gravMoonHp <= 0) {
            // Moon destroyed
            this.gravMoonActive = false;
            if (this.gravMoonSprite) { this.gravMoonSprite.destroy(); this.gravMoonSprite = null; }
            if (this.gravMoonHpBar) { this.gravMoonHpBar.destroy(); this.gravMoonHpBar = null; }
            if (this.gravMoonHpBg) { this.gravMoonHpBg.destroy(); this.gravMoonHpBg = null; }
            player.damageAbsorber = null;
            this.arena.showFloatingText(player.x, player.y - 30, 'Moon Destroyed!', '#ff8888');
            this.pfx.impact(this.gravMoonX, this.gravMoonY, 90, { tones: MOON_TONES, rocks: 16, dust: 4, duration: 620, crater: false });
            scene.cameras.main.shake(300, 0.008);
          }
          return true;
        };
      }
    } else if (!this.gravMoonActive && player.damageAbsorber && this.arena.elementId === 'gravity') {
      // Clear moon absorber if moon died
      player.damageAbsorber = null;
    }

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
