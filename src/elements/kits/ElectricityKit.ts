import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  ArmGesture, ELECTRIC, ElectricColorFn, ElectricityAura, ElectricityAvatar, ElectricityFx,
  LIVE_TONES, NPC_TONES, PHOENIX_TONES, PLASMA_TONES, STORM_TONES,
} from './ElectricityVisuals';

interface StormCloud {
  /** Redrawn every frame — the boiling mass, its interior flicker and its sagging underside. */
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  expiresAt: number;
  pulseAccum: number;
  owner: 'player';
}

interface BallLightning {
  /** Redrawn every frame: the orb, its cage of arcs and whatever it is earthing into. */
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tier: 1 | 2 | 3 | 4; // 1=25k, 2=50k, 3=75k, 4=100k
  expiresAt: number;
  shockAccum: number;
  lastHitByEnemy: Map<Fighter, number>;
}

/** Electricity Mastery — Kinetic Bomb: travels until it latches onto an enemy, then tracks damage taken toward its explosion. */
interface KineticBomb {
  /** Redrawn every frame — in flight it trails an arc, latched it fills a charge meter. */
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  attached: boolean;
  target: Fighter | null;
  detonateAt: number;
  lastHp: number;
  damageTaken: number;
  /** 'player' bombs seek/hit enemies; 'npc' bombs (online replay) seek/hit the local player. */
  owner: 'player' | 'npc';
}

/** Phoenix perk: a flame dropped in the player's wake that can be picked back up for regen. */
interface PhoenixFlame {
  x: number;
  y: number;
  expiresAt: number;
  /** Own phase so a field of flames flickers out of step. */
  phase: number;
}

const KINETIC_BOMB_COOLDOWN_MS = 14000;
const KINETIC_BOMB_SPEED = 460;
const KINETIC_BOMB_HIT_RADIUS = 26;
const KINETIC_BOMB_ATTACH_MS = 10000;
const KINETIC_BOMB_BASE_DAMAGE = 10;
const KINETIC_BOMB_EXPLOSION_RADIUS = 150;
/** Damage a latched bomb has to soak for its meter to read full. */
const KINETIC_BOMB_METER_FULL = 120;

const BALL_LIGHTNING_SPEED = 55;
const BALL_LIGHTNING_LIFE_MS = 6000;

/** Gap between spark puffs shed out of the back of a live electro ball. */
const TRAIL_INTERVAL_MS = 45;

/** NPC casts mirrored onto the opponent's rig. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'electro-ball': 'punch',
  'electro-dash': 'dash',
  'kinetic-discharge': 'slam',
  'pain-battery': 'clap',
  'restart': 'raise',
  'kinetic-bomb': 'punch',
};

// ── ElectricityArenaApi ───────────────────────────────────────────────────

export interface ElectricityArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly elementId: string;
  readonly npcElementId: string;
  /** The ability the opponent cast this frame, or null — drives their rig's gestures. */
  readonly npcCastId: string | null;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** Cosmetics: maps an electric visual color through the owner's color cosmetic. */
  electricityColor(owner: 'player' | 'npc', base: number): number;
  get playerSpeedMult(): number;
  set playerSpeedMult(v: number);
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  /** True only when the player is electricity AND Electricity Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── ElectricityKit ────────────────────────────────────────────────────────

export class ElectricityKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a colour cosmetic recolours one side. */
  private readonly pcol: ElectricColorFn;
  private readonly ncol: ElectricColorFn;
  private readonly pfx: ElectricityFx;
  private readonly nfx: ElectricityFx;
  /** The live-wire character rig (plasma arms, eyes, lightning rod) for each electric fighter. */
  private playerAvatar: ElectricityAvatar | null = null;
  private npcAvatar: ElectricityAvatar | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  /** Kinetic Shield (mastery passive) — a standing field that thickens as the battery fills. */
  private shieldAura: ElectricityAura | null = null;
  private batteryAura: ElectricityAura | null = null;
  private overchargeAura: ElectricityAura | null = null;
  private phoenixAura: ElectricityAura | null = null;
  /** All live Phoenix flames share one Graphics — they are drawn, never tweened. */
  private phoenixGfx: Phaser.GameObjects.Graphics | null = null;
  private trailAccum = 0;
  /** Edge-detects the opponent's cast so a gesture fires once, not every frame it is held. */
  private lastNpcCastId: string | null = null;

  // HUD
  private kineticPowerText: Phaser.GameObjects.Text | null = null;

  // Kinetic power
  private kineticPower = 0;

  // Electro dash recast
  private electroDashCanRecast = false;
  private electroDashRecastExpiry = 0;

  // Pain battery
  private painBatteryHolding = false;
  private painBatteryHoldStart = 0;
  private painBatterySelfDmgDealt = 0;
  private painBatteryTickAccum = 0;

  // Overcharge (Q ability)
  private overchargeActive = false;
  private overchargeUntil = 0;

  // Regen (repurposed by F+ jumpstart; no longer used by base Restart revive)
  private electricRegenActive = false;
  private electricRegenSecondsLeft = 0;
  private electricRegenAccum = 0;

  // Per-projectile shock tracking
  private electroShockTimers: Map<Projectile, { count: number; last: number }> = new Map();

  // Click+ ball lightning
  private clickHoldStart = 0;
  private clickHolding = false;
  private clickKineticDrained = 0;
  private ballLightnings: BallLightning[] = [];

  // E+ storm clouds
  private stormClouds: StormCloud[] = [];

  // Electricity Mastery — Kinetic Bomb
  private kineticBombs: KineticBomb[] = [];
  private kineticBombLastCastAt = -999999;

  // Phoenix perk
  private playerPhoenixUntil = 0;
  private playerPhoenixSpeedBaseline = 1;
  private playerPhoenixFlames: PhoenixFlame[] = [];
  private playerPhoenixFlameAccum = 0;

  constructor(private arena: ElectricityArenaApi) {
    this.pcol = (base) => arena.electricityColor('player', base);
    this.ncol = (base) => arena.electricityColor('npc', base);
    this.pfx = new ElectricityFx(arena.scene, this.pcol);
    this.nfx = new ElectricityFx(arena.scene, this.ncol);
  }

  // ── Public accessors ──────────────────────────────────────────────────

  getKineticPower(): number { return this.kineticPower; }
  isOverchargeActive(): boolean { return this.overchargeActive; }

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): ElectricityFx { return owner === 'player' ? this.pfx : this.nfx; }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  // isPlayerElement: only true when the player picked electricity
  reset(isPlayerElement: boolean): void {
    // Destroy any lingering game objects from the previous match. Every GameObject dies with the
    // old scene run, so the visuals below are rebuilt lazily in update().
    if (this.kineticPowerText) { this.kineticPowerText.destroy(); this.kineticPowerText = null; }
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.shieldAura) { this.shieldAura.destroy(); this.shieldAura = null; }
    if (this.batteryAura) { this.batteryAura.destroy(); this.batteryAura = null; }
    if (this.overchargeAura) { this.overchargeAura.destroy(); this.overchargeAura = null; }
    if (this.phoenixAura) { this.phoenixAura.destroy(); this.phoenixAura = null; }
    if (this.phoenixGfx) { this.phoenixGfx.destroy(); this.phoenixGfx = null; }
    this.aimX = 0;
    this.aimY = 0;
    this.trailAccum = 0;
    this.lastNpcCastId = null;

    this.kineticPower = 0;
    this.electroDashCanRecast = false;
    this.electroDashRecastExpiry = 0;
    this.painBatteryHolding = false;
    this.painBatteryHoldStart = 0;
    this.painBatterySelfDmgDealt = 0;
    this.painBatteryTickAccum = 0;
    this.overchargeActive = false;
    this.overchargeUntil = 0;
    this.electricRegenActive = false;
    this.electricRegenSecondsLeft = 0;
    this.electricRegenAccum = 0;
    this.electroShockTimers = new Map();
    this.clickHolding = false;
    this.clickHoldStart = 0;
    this.clickKineticDrained = 0;
    for (const bl of this.ballLightnings) bl.gfx.destroy();
    this.ballLightnings = [];
    for (const sc of this.stormClouds) sc.gfx.destroy();
    this.stormClouds = [];
    for (const kb of this.kineticBombs) kb.gfx.destroy();
    this.kineticBombs = [];
    this.kineticBombLastCastAt = -999999;

    this.playerPhoenixUntil = 0;
    this.playerPhoenixSpeedBaseline = 1;
    this.playerPhoenixFlames = [];
    this.playerPhoenixFlameAccum = 0;

    if (isPlayerElement) {
      const scene = this.arena.scene;
      const cx = scene.scale.width / 2;
      const cap = this.arena.hasUpgrade('r') ? 100 : 50;
      this.kineticPowerText = scene.add.text(cx, 52, `⚡ 0/${cap}`, {
        fontSize: '18px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffee00',
        stroke: '#664400', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }
  }

  // Called from ArenaScene's player 'damaged' event
  onDamageReceived(amount: number, time: number): void {
    if (amount <= 0) return;
    const cap = this.arena.hasUpgrade('r') ? 100 : 50;
    this.kineticPower = Math.min(cap, this.kineticPower + amount);
    this.updateHud(cap);

    const player = this.arena.player;
    // Every point of damage is charge going in, so it earns a visible intake.
    this.pfx.sparks(player.x, player.y, Math.min(8, 2 + Math.floor(amount / 6)), {
      speed: 90, size: 2, life: 320, depth: 6, tones: LIVE_TONES,
    });

    // Cancel regen if hit while regenerating
    if (this.electricRegenActive) {
      this.electricRegenActive = false;
      this.arena.showFloatingText(player.x, player.y - 20, 'Regen cancelled', '#ffee00');
    }

    // Overcharge: prevent death (intercept before 'defeated' fires)
    if (this.overchargeActive && player.hp <= 0) {
      this.overchargeActive = false;
      if (this.overchargeAura) { this.overchargeAura.destroy(); this.overchargeAura = null; }
      // Revive to HP equal to kinetic power, consuming all kinetic
      player.hp = Math.max(1, Math.min(player.maxHp, this.kineticPower));
      this.kineticPower = 0;
      this.updateHud(cap);
      this.arena.recordMasteryStat('revives', 1);
      this.arena.showFloatingText(player.x, player.y - 30, 'RESTARTED!', '#ffee00');
      this.paintRevive(player.x, player.y);
      if (this.arena.hasPerk('player', 'phoenix')) this._activatePhoenix(time);
      return;
    }

    // Q+ auto-restart on death (if Q+ upgrade owned, overcharge not yet active, Q on cooldown)
    if (this.arena.hasUpgrade('q') && player.hp <= 0 && !this.overchargeActive) {
      if (player.getCooldownRatio('restart') >= 1) {
        player.triggerCooldown('restart');
        player.hp = Math.max(1, Math.min(player.maxHp, Math.floor(this.kineticPower / 2)));
        this.kineticPower = 0;
        this.updateHud(cap);
        this.arena.recordMasteryStat('revives', 1);
        this.arena.showFloatingText(player.x, player.y - 30, 'AUTO-RESTARTED!', '#ffee00');
        this.paintRevive(player.x, player.y);
        if (this.arena.hasPerk('player', 'phoenix')) this._activatePhoenix(time);
      }
    }
  }

  /** A body coming back online: current slams into it from above and earths out around it. */
  private paintRevive(x: number, y: number): void {
    this.pfx.skyStrike(x, y, 320, 9, LIVE_TONES);
    this.pfx.ignite(x, y, 46, 6, LIVE_TONES);
    this.pfx.discharge(x, y, 90, { arms: 12, sparks: 22, depth: 7, tones: LIVE_TONES });
    this.playerAvatar?.play('raise', -Math.PI / 2, 900);
    this.arena.scene.cameras.main.shake(220, 0.008);
  }

  // ── Per-frame update ──────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { player, enemies } = this.arena;
    const cap = this.arena.hasUpgrade('r') ? 100 : 50;
    this.updateHud(cap);

    // Electricity Mastery — Kinetic Shield: +1% damage resistance per 3% kinetic power, capped at 33%.
    let shieldFill = 0;
    if (this.arena.masteryActive) {
      const kineticPercent = (this.kineticPower / cap) * 100;
      const resistPercent = Math.min(33, Math.floor(kineticPercent / 3));
      player.kineticShieldMult = Math.max(0, 1 - resistPercent / 100);
      shieldFill = resistPercent / 33;
    } else {
      player.kineticShieldMult = 1;
    }

    this.updateKineticBombs(time, delta);

    // Overcharge expiry
    if (this.overchargeActive && time >= this.overchargeUntil) {
      this.overchargeActive = false;
      if (this.overchargeAura) { this.overchargeAura.destroy(); this.overchargeAura = null; }
      this.pfx.ring(player.x, player.y, 40, 8, ELECTRIC.amber, 320, 3, 4);
    }

    // Regen ticks (5 HP/sec when active)
    if (this.electricRegenActive && this.electricRegenSecondsLeft > 0) {
      this.electricRegenAccum += delta;
      const tickMs = 200; // 5 HP/s
      while (this.electricRegenAccum >= tickMs) {
        this.electricRegenAccum -= tickMs;
        player.heal(1);
        this.electricRegenSecondsLeft = Math.max(0, this.electricRegenSecondsLeft - (tickMs / 1000));
        if (this.electricRegenSecondsLeft <= 0) { this.electricRegenActive = false; break; }
      }
    }

    // Electro dash recast window expiry
    if (this.electroDashCanRecast && time >= this.electroDashRecastExpiry) {
      this.electroDashCanRecast = false;
    }

    // Shock logic: electro balls near enemies
    // 20+ kinetic: shocks once; 50+ kinetic: shocks twice (300ms apart)
    const shockRadius = this.kineticPower >= 50 ? 120 : 80;
    const maxShocks = this.kineticPower >= 50 ? 2 : 1;
    if (this.kineticPower >= 20) {
      for (const go of this.arena.projectiles.getChildren()) {
        const proj = go as Projectile;
        if (!proj.active || proj.texture.key !== 'proj-electro' || !proj.isFromPlayer) continue;
        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          const dist = Phaser.Math.Distance.Between(proj.x, proj.y, t.x, t.y);
          if (dist <= shockRadius) {
            const shockData = this.electroShockTimers.get(proj) ?? { count: 0, last: 0 };
            if (shockData.count < maxShocks && (shockData.count === 0 || time - shockData.last >= 300)) {
              shockData.count++;
              shockData.last = time;
              this.electroShockTimers.set(proj, shockData);
              t.takeDamage(4);
              this.arena.spawnHitFlash(t.x, t.y, ELECTRIC.volt);
              this.arena.showFloatingText(t.x, t.y - 20, '4', '#ffee00');
              this.pfx.chain(proj.x, proj.y, t.x, t.y, LIVE_TONES);
            }
          }
        }
      }
    }
    // Clean up shock timer map for destroyed projectiles
    for (const [proj] of this.electroShockTimers) {
      if (!proj.active) this.electroShockTimers.delete(proj);
    }

    this.updateBallLightning(time, delta, enemies);
    this.updateStormClouds(time, delta, enemies);
    this.updatePhoenix(time, delta);

    // ── Auras ────────────────────────────────────────────────────────
    this.driveAura('shield', this.arena.masteryActive, shieldFill, delta);
    this.driveAura('battery', this.painBatteryHolding,
      Math.min(2, 0.7 + this.painBatterySelfDmgDealt / 40), delta);
    this.driveAura('overcharge', this.overchargeActive, 1, delta);
    this.driveAura('phoenix', this.playerPhoenixUntil > 0, 1, delta);

    this.updateVisuals(delta);
  }

  /** Online: opponent is electricity — advance only the systems that can affect our local fighter. */
  updateNpc(time: number, delta: number): void {
    this.updateKineticBombs(time, delta);
    this.updateVisuals(delta);
  }

  /**
   * Everything that must run for whichever side is electricity: both rigs, the trails coming off
   * live shots, and the opponent's cast gestures.
   */
  private updateVisuals(delta: number): void {
    this.updateAvatars(delta);
    this.updateProjectileTrails(delta);
    const castId = this.arena.npcCastId;
    if (castId !== this.lastNpcCastId) {
      this.lastNpcCastId = castId;
      this.handleNpcCastId(castId);
    }
  }

  /**
   * Builds (on first frame) and drives the live-wire rig for whichever fighters are electricity.
   * The player faces the cursor; the NPC faces whoever it is fighting. Intensity climbs while a
   * stance is up, which widens the arms and speeds the rod's discharge.
   */
  private updateAvatars(delta: number): void {
    const { player, npc, scene, elementId, npcElementId } = this.arena;

    if (elementId === 'electricity' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new ElectricityAvatar(scene, this.pcol, LIVE_TONES);
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      this.playerAvatar.setIntensity(
        this.overchargeActive ? 1.5 : this.painBatteryHolding ? 1.25 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // One place decides the sustained pose. Pain Battery outranks a charging click, because
      // it is the one that is actively costing HP.
      this.playerAvatar.setHold(
        this.painBatteryHolding ? 'brace' : this.clickHolding ? 'charge' : null,
        Math.atan2(aimY - player.y, aimX - player.x),
      );
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcElementId === 'electricity' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new ElectricityAvatar(scene, this.ncol, NPC_TONES);
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
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
    // The opponent's shot leaves a body too — without a muzzle it just appears in mid-air.
    if (id === 'electro-ball') this.nfx.muzzleArc(npc.x, npc.y, ang, 1, 7, NPC_TONES);
  }

  /**
   * Live shots shed sparks out of their *back*, which is what makes a bead of light read as
   * something travelling rather than something sliding. Scanned off the shared projectile group
   * on an accumulator so a screen full of shots stays cheap.
   */
  private updateProjectileTrails(delta: number): void {
    this.trailAccum += delta;
    if (this.trailAccum < TRAIL_INTERVAL_MS) return;
    this.trailAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-electro') continue;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const back = Math.atan2(-body.velocity.y, -body.velocity.x);
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      const tones = proj.isFromPlayer ? LIVE_TONES : NPC_TONES;
      fx.sparks(proj.x, proj.y, 2, {
        speed: 60, spread: 0.5, angle: back, size: 1.8, life: 240, fall: 8, depth: 5, tones,
      });
    }
  }

  /** Lazily builds, drives and tears down one of the four persistent fields. */
  private driveAura(style: 'shield' | 'battery' | 'overcharge' | 'phoenix', on: boolean, intensity: number, delta: number): void {
    const player = this.arena.player;
    const get = () => (
      style === 'shield' ? this.shieldAura
        : style === 'battery' ? this.batteryAura
          : style === 'overcharge' ? this.overchargeAura : this.phoenixAura);
    const set = (a: ElectricityAura | null) => {
      if (style === 'shield') this.shieldAura = a;
      else if (style === 'battery') this.batteryAura = a;
      else if (style === 'overcharge') this.overchargeAura = a;
      else this.phoenixAura = a;
    };

    let aura = get();
    if (!on) {
      if (aura) { aura.destroy(); set(null); }
      return;
    }
    if (!aura) {
      const scene = this.arena.scene;
      // The mastery passive sits at the lowest depth, so a stance layers over it into one
      // silhouette rather than fighting it for the same band of pixels.
      aura = style === 'shield' ? new ElectricityAura(scene, this.pcol, 'shield', LIVE_TONES, 40, 2)
        : style === 'battery' ? new ElectricityAura(scene, this.pcol, 'charge', LIVE_TONES, 34, 3)
          : style === 'overcharge' ? new ElectricityAura(scene, this.pcol, 'overcharge', LIVE_TONES, 36, 4)
            : new ElectricityAura(scene, this.pcol, 'phoenix', PHOENIX_TONES, 34, 4);
      set(aura);
    }
    aura.setIntensity(intensity);
    aura.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
  }

  // ── Ball lightning ────────────────────────────────────────────────────

  /**
   * Ball lightning moves and hits entirely through the kit, so it needs no physics body — it is
   * a position plus a Graphics that redraws its cage of arcs every frame.
   */
  private updateBallLightning(time: number, delta: number, enemies: Fighter[]): void {
    const t = time / 1000;
    for (let i = this.ballLightnings.length - 1; i >= 0; i--) {
      const bl = this.ballLightnings[i];
      if (time >= bl.expiresAt) {
        // A dying orb collapses rather than blinking out.
        this.pfx.discharge(bl.x, bl.y, 46 + bl.tier * 10, {
          arms: 5 + bl.tier, sparks: 10, scorch: false, depth: 6, tones: PLASMA_TONES,
        });
        bl.gfx.destroy();
        this.ballLightnings.splice(i, 1);
        continue;
      }
      bl.x += bl.vx * (delta / 1000);
      bl.y += bl.vy * (delta / 1000);

      const radius = 12 + (bl.tier - 1) * 3;
      bl.gfx.clear();
      ElectricityFx.drawBallLightning(bl.gfx, this.pcol, PLASMA_TONES, bl.x, bl.y, radius, t, bl.tier);

      // Contact damage with 1s per-enemy cooldown
      for (const target of enemies) {
        if (!target.active || target.hp <= 0) continue;
        const dist = Phaser.Math.Distance.Between(bl.x, bl.y, target.x, target.y);
        const hitRadius = 14 + (bl.tier - 1) * 5;
        if (dist <= hitRadius) {
          const lastHit = bl.lastHitByEnemy.get(target) ?? 0;
          if (time - lastHit >= 1000) {
            bl.lastHitByEnemy.set(target, time);
            const dmgTable = [18, 28, 40, 55];
            target.takeDamage(dmgTable[bl.tier - 1]);
            this.arena.spawnHitFlash(target.x, target.y, ELECTRIC.plasma);
            this.arena.showFloatingText(target.x, target.y - 20, `${dmgTable[bl.tier - 1]}`, '#cc88ff');
            this.pfx.discharge(target.x, target.y, 40 + bl.tier * 8, {
              arms: 5 + bl.tier, sparks: 8 + bl.tier * 2, scorch: false, depth: 7, tones: PLASMA_TONES,
            });
          }
        }
      }

      // Shock aura pulse
      const cadenceTable = [1000, 500, 500, 333];
      const shockRadiusTable = [80, 100, 120, 140];
      bl.shockAccum += delta;
      if (bl.shockAccum >= cadenceTable[bl.tier - 1]) {
        bl.shockAccum -= cadenceTable[bl.tier - 1];
        const sRadius = shockRadiusTable[bl.tier - 1];
        this.pfx.ring(bl.x, bl.y, radius, sRadius, ELECTRIC.plasma, 300, 2.5, 5);
        for (const target of enemies) {
          if (!target.active || target.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(bl.x, bl.y, target.x, target.y) <= sRadius) {
            target.takeDamage(4);
            this.arena.spawnHitFlash(target.x, target.y, ELECTRIC.volt);
            this.arena.showFloatingText(target.x, target.y - 20, '4', '#ffee00');
            this.pfx.chain(bl.x, bl.y, target.x, target.y, PLASMA_TONES);
          }
        }
      }
    }
  }

  // ── E+ storm clouds ───────────────────────────────────────────────────

  private updateStormClouds(time: number, delta: number, enemies: Fighter[]): void {
    const t = time / 1000;
    for (let i = this.stormClouds.length - 1; i >= 0; i--) {
      const sc = this.stormClouds[i];
      if (time >= sc.expiresAt) {
        sc.gfx.destroy();
        this.stormClouds.splice(i, 1);
        continue;
      }
      sc.pulseAccum += delta;
      // The cloud visibly winds up: its underside sags and lights as the pulse approaches.
      const charge = Phaser.Math.Clamp(sc.pulseAccum / 2000, 0, 1);
      const fade = Phaser.Math.Clamp((sc.expiresAt - time) / 600, 0, 1);
      sc.gfx.clear();
      ElectricityFx.drawStormCloud(sc.gfx, this.pcol, STORM_TONES, sc.x, sc.y, 40, t, fade, charge);

      if (sc.pulseAccum >= 2000) {
        sc.pulseAccum -= 2000;
        this.pfx.skyStrike(sc.x, sc.y, 200, 7, STORM_TONES);
        for (const target of enemies) {
          if (!target.active || target.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(sc.x, sc.y, target.x, target.y) <= 70) {
            target.takeDamage(18, { source: sc, sourceX: sc.x, sourceY: sc.y });
            this.arena.spawnHitFlash(target.x, target.y, ELECTRIC.sky);
            this.arena.showFloatingText(target.x, target.y - 20, '18', '#88ccff');
            this.pfx.chain(sc.x, sc.y, target.x, target.y, STORM_TONES);
          }
        }
      }
    }
  }

  // ── Phoenix perk ──────────────────────────────────────────────────────

  private updatePhoenix(time: number, delta: number): void {
    const player = this.arena.player;

    if (this.playerPhoenixUntil > 0) {
      if (time >= this.playerPhoenixUntil) {
        this.playerPhoenixUntil = 0;
        player.damageAbsorber = null;
        this.arena.playerSpeedMult = this.playerPhoenixSpeedBaseline;
        this.arena.showFloatingText(player.x, player.y - 30, 'PHOENIX END', '#ff9900');
        this.pfx.ring(player.x, player.y, 44, 10, ELECTRIC.ember, 340, 3, 4);
      } else {
        this.playerPhoenixFlameAccum += delta;
        while (this.playerPhoenixFlameAccum >= 1000) {
          this.playerPhoenixFlameAccum -= 1000;
          this.playerPhoenixFlames.push({
            x: player.x, y: player.y, expiresAt: time + 30000, phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    // Phoenix flames: consume (step on) or expire
    for (let i = this.playerPhoenixFlames.length - 1; i >= 0; i--) {
      const f = this.playerPhoenixFlames[i];
      if (time >= f.expiresAt) {
        this.playerPhoenixFlames.splice(i, 1);
        continue;
      }
      if (this.playerPhoenixUntil <= 0
        && Phaser.Math.Distance.Between(player.x, player.y, f.x, f.y) <= 28) {
        this.playerPhoenixFlames.splice(i, 1);
        this.pfx.ignite(f.x, f.y, 26, 5, PHOENIX_TONES);
        let remaining = 3;
        const tick = () => {
          if (remaining <= 0 || !player.active) return;
          player.heal(5);
          this.arena.showFloatingText(player.x, player.y - 24, '🔥 +5', '#ff6600');
          remaining--;
          if (remaining > 0) this.arena.scene.time.delayedCall(1000, tick);
        };
        this.arena.scene.time.delayedCall(0, tick);
      }
    }

    // One Graphics for the whole field — a guttering flame is drawn, never tweened.
    if (this.playerPhoenixFlames.length === 0) {
      if (this.phoenixGfx) { this.phoenixGfx.destroy(); this.phoenixGfx = null; }
      return;
    }
    if (!this.phoenixGfx) this.phoenixGfx = this.arena.scene.add.graphics().setDepth(3);
    const g = this.phoenixGfx;
    const t = time / 1000;
    g.clear();
    for (const f of this.playerPhoenixFlames) {
      // Fade out over the last second of life so a field of flames thins rather than popping.
      const a = Phaser.Math.Clamp((f.expiresAt - time) / 1000, 0, 1);
      const flick = 0.82 + 0.18 * Math.sin(t * 9 + f.phase);
      g.fillStyle(this.pcol(PHOENIX_TONES.glow), 0.28 * a);
      g.fillCircle(f.x, f.y, 13 * flick);
      // Three tongues leaning off the same root — a single disc reads as a token, not a fire.
      for (let i = 0; i < 3; i++) {
        const lean = -Math.PI / 2 + (i - 1) * 0.55 + Math.sin(t * 4 + f.phase + i) * 0.22;
        const len = (11 + i % 2 * 4) * flick;
        g.fillStyle(this.pcol(i === 1 ? PHOENIX_TONES.hot : PHOENIX_TONES.body), 0.85 * a);
        g.fillEllipse(f.x + Math.cos(lean) * len * 0.5, f.y + Math.sin(lean) * len * 0.5, 6, len);
      }
      g.fillStyle(this.pcol(PHOENIX_TONES.core), 0.9 * a);
      g.fillCircle(f.x, f.y - 2, 2.4 * flick);
    }
  }

  // ── Input handling ────────────────────────────────────────────────────

  handleInput(
    time: number,
    delta: number,
    mouseX: number,
    mouseY: number,
    pointer: Phaser.Input.Pointer,
  ): void {
    const { player, enemies } = this.arena;
    const scene = this.arena.scene;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;
    const aim = Math.atan2(mouseY - player.y, mouseX - player.x);
    // Electricity Mastery — Kinetic Bomb may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const bombSlot = this.arena.masteryActive ? this.kineticBombSlot() : null;

    // ── Click: Electro Ball / Ball Lightning (Click+) ────────────────
    if (this.arena.hasUpgrade('click')) {
      if (pointer.isDown) {
        if (!this.clickHolding) {
          this.clickHolding = true;
          this.clickHoldStart = time;
          this.clickKineticDrained = 0;
        } else {
          // Drain kinetic at 25/sec while held
          const drainRate = 25 / 1000; // per ms
          const prevDrained = this.clickKineticDrained;
          const totalDrained = Math.min(
            this.kineticPower + prevDrained,
            (time - this.clickHoldStart) * drainRate,
          );
          const newDrain = totalDrained - prevDrained;
          if (newDrain > 0) {
            this.clickKineticDrained = totalDrained;
            const cap = this.arena.hasUpgrade('r') ? 100 : 50;
            this.kineticPower = Math.max(0, this.kineticPower - newDrain);
            this.updateHud(cap);
          }
        }
      } else if (this.clickHolding) {
        // Released
        this.clickHolding = false;
        const holdDuration = time - this.clickHoldStart;
        const drained = this.clickKineticDrained;
        this.clickKineticDrained = 0;

        if (holdDuration < 200 || drained < 25) {
          // Short tap — fire normal electro-ball
          this.castElectroBall(playerCtx, aim);
        } else {
          // Fire ball lightning based on kinetic consumed
          const cap = this.arena.hasUpgrade('r') ? 100 : 50;
          const tier: 1 | 2 | 3 | 4 =
            drained >= 100 && cap >= 100 ? 4 :
            drained >= 75  && cap >= 100 ? 3 :
            drained >= 50  ? 2 : 1;
          this.spawnBallLightning(player.x, player.y, mouseX, mouseY, tier, time);
        }
      }
    } else {
      // No Click+ — normal electro-ball
      if (pointer.isDown) this.castElectroBall(playerCtx, aim);
    }

    // ── E: Electro Dash ───────────────────────────────────────────────
    if (bombSlot === 'e') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) this.tryCastKineticBomb(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
      const canRecast = this.electroDashCanRecast && time < this.electroDashRecastExpiry && this.kineticPower >= 15;
      const onCooldown = player.getCooldownRatio('electro-dash') < 1;
      if (canRecast || !onCooldown) {
        const cap = this.arena.hasUpgrade('r') ? 100 : 50;
        if (canRecast) {
          this.kineticPower = Math.max(0, this.kineticPower - 15);
          this.updateHud(cap);
          this.electroDashCanRecast = false;
        } else {
          player.triggerCooldown('electro-dash');
          this.electroDashCanRecast = true;
          this.electroDashRecastExpiry = time + 1500;
        }
        // Teleport 215 units toward cursor
        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const startX = player.x;
        const startY = player.y;
        const endX = startX + (dx / len) * 215;
        const endY = startY + (dy / len) * 215;
        const W = scene.scale.width;
        const H = scene.scale.height;
        const clampedX = Phaser.Math.Clamp(endX, 30, W - 30);
        const clampedY = Phaser.Math.Clamp(endY, 30, H - 30);
        (player.body as Phaser.Physics.Arcade.Body).reset(clampedX, clampedY);
        // Path damage
        const segDX = clampedX - startX;
        const segDY = clampedY - startY;
        const segLen = Math.sqrt(segDX * segDX + segDY * segDY) || 1;
        for (const et of enemies) {
          if (!et.active || et.hp <= 0) continue;
          const tParam = Phaser.Math.Clamp(
            ((et.x - startX) * segDX + (et.y - startY) * segDY) / (segLen * segLen), 0, 1,
          );
          const closestX = startX + tParam * segDX;
          const closestY = startY + tParam * segDY;
          if (Phaser.Math.Distance.Between(closestX, closestY, et.x, et.y) <= 45) {
            et.takeDamage(15);
            this.arena.spawnHitFlash(et.x, et.y, ELECTRIC.volt);
            this.arena.showFloatingText(et.x, et.y - 20, '15', '#ffee00');
            this.arena.recordMasteryStat('dashHits', 1);
            // Every body the corridor ran through gets its own earthing arc.
            this.pfx.chain(closestX, closestY, et.x, et.y, LIVE_TONES);
          }
        }
        this.pfx.teleport(startX, startY, clampedX, clampedY, 6, LIVE_TONES);
        this.playerAvatar?.play('dash', Math.atan2(segDY, segDX));

        // E+: spawn storm cloud at landing point
        if (this.arena.hasUpgrade('e')) {
          const gfx = scene.add.graphics().setDepth(2);
          this.stormClouds.push({
            gfx, x: clampedX, y: clampedY,
            expiresAt: time + 8000, pulseAccum: 0, owner: 'player',
          });
          this.pfx.ring(clampedX, clampedY, 60, 20, ELECTRIC.arc, 420, 3, 3);
        }
      }
    }

    // ── R: Kinetic Discharge ──────────────────────────────────────────
    if (bombSlot === 'r') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) this.tryCastKineticBomb(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      if (player.getCooldownRatio('kinetic-discharge') >= 1 && this.kineticPower >= 20) {
        player.triggerCooldown('kinetic-discharge');
        const cap = this.arena.hasUpgrade('r') ? 100 : 50;
        if (this.kineticPower >= 100) this.arena.recordMasteryStat('dischargesAt100', 1);
        // Damage: ½ kinetic power; with R+ and kinetic > 50, scales stronger
        let dmg = Math.floor(this.kineticPower * 0.5);
        if (this.arena.hasUpgrade('r') && this.kineticPower > 50) {
          dmg = Math.floor(50 * 0.5 + (this.kineticPower - 50) * 0.8);
        }
        // How full the battery was is the whole point of the ability, so the blast is built out
        // of that: more earthing arms, more shrapnel, a longer burn and a harder shake.
        const charge = Phaser.Math.Clamp(this.kineticPower / cap, 0, 1);
        this.kineticPower = Math.max(0, this.kineticPower - 20);
        this.updateHud(cap);
        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(mouseX, mouseY, t.x, t.y) <= 100) {
            t.takeDamage(dmg);
            this.arena.spawnHitFlash(t.x, t.y, ELECTRIC.volt);
            if (dmg > 0) this.arena.showFloatingText(t.x, t.y - 20, `${dmg}`, '#ffee00');
            this.pfx.chain(mouseX, mouseY, t.x, t.y, LIVE_TONES);
          }
        }
        this.pfx.discharge(mouseX, mouseY, 100, {
          arms: 8 + Math.round(charge * 10),
          sparks: 14 + Math.round(charge * 22),
          duration: 360 + Math.round(charge * 220),
          tones: LIVE_TONES,
        });
        if (charge > 0.6) this.pfx.skyStrike(mouseX, mouseY, 260, 8, LIVE_TONES);
        this.playerAvatar?.play('slam', aim);
        scene.cameras.main.shake(150 + charge * 130, 0.004 + charge * 0.005);
      }
    }

    // ── F: Pain Battery (hold) / Jumpstart (tap, F+ only) ────────────
    if (bombSlot === 'f') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.fKey)) this.tryCastKineticBomb(time, mouseX, mouseY);
    } else if (this.arena.fKey.isDown) {
      if (!this.painBatteryHolding) {
        this.painBatteryHolding = true;
        this.painBatteryHoldStart = time;
        this.painBatterySelfDmgDealt = 0;
        this.painBatteryTickAccum = 0;
        // The wind-up has to earn the payoff: current visibly crushes inward onto the caster.
        this.pfx.chargeGather(player.x, player.y, 46, 900,
          () => (player.active ? { x: player.x, y: player.y } : null), 4, LIVE_TONES);
      }
      this.painBatteryTickAccum += delta;
      if (this.painBatteryTickAccum >= 250) {
        this.painBatteryTickAccum -= 250;
        this.painBatterySelfDmgDealt += 5;
        player.applySelfDamage(5);
        this.arena.recordMasteryStat('selfDamageDealt', 5);
        // Each tick is charge tearing out of the caster's own body.
        this.pfx.sparks(player.x, player.y, 4, { speed: 100, size: 2, life: 300, depth: 6, tones: LIVE_TONES });
      }
    } else if (this.painBatteryHolding) {
      this.painBatteryHolding = false;
      const holdDuration = time - this.painBatteryHoldStart;

      if (this.arena.hasUpgrade('f') && holdDuration < 200) {
        // Tap F: Jumpstart — 20 dmg to nearest enemy, 5 HP/s regen for 6s
        // (self-damage already dealt is 0 since first tick is 250ms)
        const nearest = this.arena.getNearestEnemy(player.x, player.y);
        if (nearest && nearest.active && Phaser.Math.Distance.Between(player.x, player.y, nearest.x, nearest.y) <= 200) {
          nearest.takeDamage(20);
          this.arena.spawnHitFlash(nearest.x, nearest.y, ELECTRIC.volt);
          this.arena.showFloatingText(nearest.x, nearest.y - 20, '20', '#ffee00');
          this.pfx.chain(player.x, player.y, nearest.x, nearest.y, LIVE_TONES);
          this.pfx.discharge(nearest.x, nearest.y, 44, { arms: 6, sparks: 10, scorch: false, tones: LIVE_TONES });
        }
        this.electricRegenActive = true;
        this.electricRegenSecondsLeft = 6;
        this.electricRegenAccum = 0;
        this.arena.showFloatingText(player.x, player.y - 30, 'JUMPSTART!', '#ffee00');
        this.pfx.ignite(player.x, player.y, 34, 5, LIVE_TONES);
        this.playerAvatar?.play('punch', aim);
      } else {
        // Normal Pain Battery release — AoE blast
        const blastDmg = Math.floor(this.painBatterySelfDmgDealt * 0.75);
        if (blastDmg > 0) {
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 120) {
              t.takeDamage(blastDmg);
              this.arena.spawnHitFlash(t.x, t.y, ELECTRIC.current);
              this.arena.showFloatingText(t.x, t.y - 20, `${blastDmg}`, '#ffaa00');
              this.pfx.chain(player.x, player.y, t.x, t.y, LIVE_TONES);
            }
          }
          // Everything the caster soaked comes back out at once — the longer the hold, the
          // more arms, shrapnel and shake the release carries.
          const heat = Phaser.Math.Clamp(this.painBatterySelfDmgDealt / 80, 0, 1);
          this.pfx.discharge(player.x, player.y, 120, {
            arms: 9 + Math.round(heat * 9),
            sparks: 16 + Math.round(heat * 20),
            duration: 400 + Math.round(heat * 240),
            tones: LIVE_TONES,
          });
          this.playerAvatar?.play('clap', aim);
          scene.cameras.main.shake(160 + heat * 140, 0.004 + heat * 0.005);
        }
      }
      this.painBatterySelfDmgDealt = 0;
      this.painBatteryTickAccum = 0;
    }

    // ── Q: Restart ────────────────────────────────────────────────────
    if (bombSlot === 'q') {
      if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) this.tryCastKineticBomb(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      if (player.getCooldownRatio('restart') >= 1) {
        player.triggerCooldown('restart');
        this.overchargeActive = true;
        this.overchargeUntil = time + 5000;
        this.arena.showFloatingText(player.x, player.y - 30, 'OVERCHARGED!', '#ffee00');
        this.pfx.ignite(player.x, player.y, 44, 5, LIVE_TONES);
        this.pfx.ring(player.x, player.y, 10, 90, ELECTRIC.volt, 460, 5, 5);
        this.playerAvatar?.play('raise', -Math.PI / 2, 900);
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /** Click: fires the shot and paints the recoil at the hand that threw it. */
  private castElectroBall(playerCtx: CastContext, aim: number): void {
    const player = this.arena.player;
    if (!player.castAbility('electro-ball', playerCtx)) return;
    if (this.kineticPower >= 50) {
      const children = this.arena.projectiles.getChildren();
      const last = children[children.length - 1] as Projectile | undefined;
      if (last && last.texture.key === 'proj-electro') last.setScale(1.25);
    }
    this.playerAvatar?.play('punch', aim);
    const hand = this.playerAvatar?.castHand() ?? { x: player.x, y: player.y };
    // A charged shot leaves a bigger hole in the air than a bare one.
    this.pfx.muzzleArc(hand.x, hand.y, aim, this.kineticPower >= 50 ? 1.45 : 1, 7, LIVE_TONES);
  }

  private _activatePhoenix(now: number): void {
    const player = this.arena.player;
    this.playerPhoenixUntil = now + 5000;
    this.playerPhoenixSpeedBaseline = this.arena.playerSpeedMult;
    this.arena.playerSpeedMult = this.playerPhoenixSpeedBaseline * 2;
    player.damageAbsorber = () => true;
    this.playerPhoenixFlameAccum = 0;
    this.pfx.ignite(player.x, player.y, 40, 5, PHOENIX_TONES);
    this.pfx.ring(player.x, player.y, 8, 80, ELECTRIC.ember, 440, 4, 5);
    this.arena.showFloatingText(player.x, player.y - 44, '🔥 PHOENIX MODE', '#ff6600');
  }

  private updateHud(cap: number): void {
    if (this.kineticPowerText) {
      this.kineticPowerText.setText(`⚡ ${Math.floor(this.kineticPower)}/${cap}`);
    }
  }

  private spawnBallLightning(
    fromX: number, fromY: number,
    toX: number, toY: number,
    tier: 1 | 2 | 3 | 4,
    time: number,
  ): void {
    const scene = this.arena.scene;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ang = Math.atan2(dy, dx);

    this.ballLightnings.push({
      gfx: scene.add.graphics().setDepth(6),
      x: fromX, y: fromY,
      vx: (dx / len) * BALL_LIGHTNING_SPEED, vy: (dy / len) * BALL_LIGHTNING_SPEED,
      tier,
      expiresAt: time + BALL_LIGHTNING_LIFE_MS,
      shockAccum: 0,
      lastHitByEnemy: new Map(),
    });

    // Birth: the orb is squeezed out of the caster, so the release scales with the tier.
    this.playerAvatar?.play('slam', ang);
    this.pfx.ignite(fromX, fromY, 26 + tier * 6, 6, PLASMA_TONES);
    this.pfx.ring(fromX, fromY, 6, 40 + tier * 14, ELECTRIC.plasma, 380, 3.5, 5);
    this.pfx.sparks(fromX, fromY, 8 + tier * 4, { speed: 180, size: 2.6, life: 460, depth: 6, tones: PLASMA_TONES });
    this.arena.showFloatingText(fromX, fromY - 34, `⚡ BALL LIGHTNING ${'I'.repeat(tier)}`, '#cc88ff');
  }

  // ── Electricity Mastery: Kinetic Bomb ─────────────────────────────────

  /** The slot Kinetic Bomb is bound over this match, or null when it isn't bound anywhere. */
  private kineticBombSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'kinetic-bomb') return s;
    }
    return null;
  }

  private tryCastKineticBomb(time: number, mouseX: number, mouseY: number): void {
    if (time - this.kineticBombLastCastAt < KINETIC_BOMB_COOLDOWN_MS) return;
    this.kineticBombLastCastAt = time;
    const { player, scene } = this.arena;
    player.triggerCooldown('kinetic-bomb');
    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ang = Math.atan2(dy, dx);
    this.kineticBombs.push({
      gfx: scene.add.graphics().setDepth(6),
      x: player.x, y: player.y,
      vx: (dx / len) * KINETIC_BOMB_SPEED, vy: (dy / len) * KINETIC_BOMB_SPEED,
      attached: false, target: null, detonateAt: 0, lastHp: 0, damageTaken: 0,
      owner: 'player',
    });
    this.playerAvatar?.play('punch', ang);
    const hand = this.playerAvatar?.castHand() ?? { x: player.x, y: player.y };
    this.pfx.muzzleArc(hand.x, hand.y, ang, 1.3, 7, LIVE_TONES);
    this.arena.showFloatingText(player.x, player.y - 30, '⚡ KINETIC BOMB', '#ffaa00');
    // Note: cast is already broadcast online via player.triggerCooldown('kinetic-bomb').
  }

  /** Online replay: the remote electricity player cast Kinetic Bomb — launch one from the npc replica. */
  doNpcKineticBomb(tx: number, ty: number): void {
    const { npc, scene } = this.arena;
    const dx = tx - npc.x;
    const dy = ty - npc.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ang = Math.atan2(dy, dx);
    this.kineticBombs.push({
      gfx: scene.add.graphics().setDepth(6),
      x: npc.x, y: npc.y,
      vx: (dx / len) * KINETIC_BOMB_SPEED, vy: (dy / len) * KINETIC_BOMB_SPEED,
      attached: false, target: null, detonateAt: 0, lastHp: 0, damageTaken: 0,
      owner: 'npc',
    });
    this.npcAvatar?.play('punch', ang);
    this.nfx.muzzleArc(npc.x, npc.y, ang, 1.3, 7, NPC_TONES);
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Kinetic Bomb is bound to a slot. */
  getKineticBombCooldownRatio(time: number): number {
    return Math.min(1, (time - this.kineticBombLastCastAt) / KINETIC_BOMB_COOLDOWN_MS);
  }

  private updateKineticBombs(time: number, delta: number): void {
    const { scene } = this.arena;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const t = time / 1000;
    for (let i = this.kineticBombs.length - 1; i >= 0; i--) {
      const kb = this.kineticBombs[i];
      const tones = kb.owner === 'player' ? LIVE_TONES : NPC_TONES;
      const col = kb.owner === 'player' ? this.pcol : this.ncol;
      const fx = this.fx(kb.owner);
      // 'npc' bombs are the opponent's, replayed on this victim sim — they seek us.
      const seekTargets = kb.owner === 'npc' ? [this.arena.player] : this.arena.enemies;

      if (!kb.attached) {
        kb.x += kb.vx * (delta / 1000);
        kb.y += kb.vy * (delta / 1000);
        kb.gfx.clear();
        ElectricityFx.drawKineticBomb(kb.gfx, col, tones, kb.x, kb.y, t, false, 0);
        if (kb.x < -20 || kb.x > W + 20 || kb.y < -20 || kb.y > H + 20) {
          kb.gfx.destroy();
          this.kineticBombs.splice(i, 1);
          continue;
        }
        let hitTarget: Fighter | null = null;
        for (const target of seekTargets) {
          if (!target.active || target.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(kb.x, kb.y, target.x, target.y) <= KINETIC_BOMB_HIT_RADIUS) {
            hitTarget = target;
            break;
          }
        }
        if (hitTarget) {
          kb.attached = true;
          kb.target = hitTarget;
          kb.detonateAt = time + KINETIC_BOMB_ATTACH_MS;
          kb.lastHp = hitTarget.hp;
          kb.damageTaken = 0;
          this.arena.spawnHitFlash(hitTarget.x, hitTarget.y, ELECTRIC.volt);
          this.arena.showFloatingText(hitTarget.x, hitTarget.y - 30, '⚡ LATCHED', '#ffee00');
          fx.ring(hitTarget.x, hitTarget.y, 34, 12, tones.hot, 300, 3, 6);
          fx.sparks(hitTarget.x, hitTarget.y, 8, { speed: 130, size: 2.2, life: 340, depth: 7, tones });
        }
        continue;
      }

      // Attached: follow the target, track damage it takes, detonate on expiry or its death.
      const target = kb.target!;
      if (!target.active || target.hp <= 0) {
        this.detonateKineticBomb(kb);
        this.kineticBombs.splice(i, 1);
        continue;
      }
      const dmgSinceLast = Math.max(0, kb.lastHp - target.hp);
      kb.lastHp = target.hp;
      if (dmgSinceLast > 0) {
        kb.damageTaken += dmgSinceLast;
        // Each mouthful the bomb swallows arcs into it, so a filling payload is readable.
        fx.arc(target.x, target.y, target.x, target.y - 24,
          { width: 2, duration: 140, depth: 7, branches: 1, tones });
      }
      kb.gfx.clear();
      ElectricityFx.drawKineticBomb(
        kb.gfx, col, tones, target.x, target.y - 24, t, true,
        Phaser.Math.Clamp(kb.damageTaken / KINETIC_BOMB_METER_FULL, 0, 1),
      );
      if (time >= kb.detonateAt) {
        this.detonateKineticBomb(kb);
        this.kineticBombs.splice(i, 1);
      }
    }
  }

  private detonateKineticBomb(kb: KineticBomb): void {
    const x = kb.target ? kb.target.x : kb.x;
    const y = kb.target ? kb.target.y : kb.y;
    const dmg = KINETIC_BOMB_BASE_DAMAGE + Math.floor(kb.damageTaken / 3);
    const tones = kb.owner === 'player' ? LIVE_TONES : NPC_TONES;
    const fx = this.fx(kb.owner);
    const blastTargets = kb.owner === 'npc' ? [this.arena.player] : this.arena.enemies;
    for (const t of blastTargets) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) <= KINETIC_BOMB_EXPLOSION_RADIUS) {
        t.takeDamage(dmg);
        this.arena.spawnHitFlash(t.x, t.y, ELECTRIC.volt);
        this.arena.showFloatingText(t.x, t.y - 20, `${dmg}`, '#ffee00');
        fx.chain(x, y, t.x, t.y, tones);
      }
    }
    // A bomb that soaked a lot throws a correspondingly bigger blast, not just a bigger number.
    const fed = Phaser.Math.Clamp(kb.damageTaken / KINETIC_BOMB_METER_FULL, 0, 1);
    fx.discharge(x, y, KINETIC_BOMB_EXPLOSION_RADIUS, {
      arms: 12 + Math.round(fed * 10),
      sparks: 20 + Math.round(fed * 24),
      duration: 420 + Math.round(fed * 260),
      tones,
    });
    this.arena.scene.cameras.main.shake(180 + fed * 160, 0.005 + fed * 0.005);
    kb.gfx.destroy();
  }
}
