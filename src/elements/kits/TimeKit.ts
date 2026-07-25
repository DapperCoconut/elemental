import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { CustomStatus } from './StatusHudKit';

// ── Helpers ───────────────────────────────────────────────────────────────────

function ptSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function lerpN(a: number, b: number, t: number): number { return Math.round(a + (b - a) * t); }

// ── Local interfaces ──────────────────────────────────────────────────────────

interface TimePuddle {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number; x: number; y: number; radius: number;
  owner: 'player' | 'npc';
}

interface PosSnapshot { x: number; y: number; t: number; }

interface RevolverBullet {
  proj: Projectile; spawnAt: number;
  baseDmg: number; maxDmg: number; rampMs: number;
}

interface RifleBeam {
  fromX: number; fromY: number; toX: number; toY: number;
  npcFrozenX: number; npcFrozenY: number; damage: number;
  gfx: Phaser.GameObjects.Graphics;
  coreGfx: Phaser.GameObjects.Graphics;
}

// ── TimeArenaApi ──────────────────────────────────────────────────────────────

export interface TimeArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly spaceKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  dealAoeDamageFromOwner(cx: number, cy: number, radius: number, damage: number, owner: 'player' | 'npc'): void;
  /** True only when the player is time (sand) AND Time Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is time AND has Time Mastery on. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  /** Show/clear an element-specific effect in the top-right status tray (player-side only). */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

// ── Mastery: Passive Manipulation (focus/rush) + Fan the Hammer ───────────────
const RUSH_FACTOR = 1.5;   // rush: the world runs 1.5x faster
const FOCUS_FACTOR = 0.5;  // focus: the world runs at half speed
const MODE_SWITCH_CD_MS = 5000;
const FAN_BULLET_SPEED = 360;
const FAN_STAGGER_MS = 200;
const FAN_HALT_SPEED = 40;      // below this a fan bullet is considered halted
const FAN_BULLET_RADIUS = 14;
const FAN_DETONATE_RADIUS = 44;
const FAN_PUDDLE_CHANCE_PER_SEC = 0.05;
const FAN_SLOW_MULT = 0.5;
const FAN_COOLDOWN_MS = 10000;

interface FanBullet {
  proj: Projectile;
  owner: 'player' | 'npc';
  spawnAt: number;
  baseDmg: number;
  maxDmg: number;
  rampMs: number;
  vx: number;
  vy: number;
  halted: boolean;
  puddleAccum: number;
}

// ── TimeKit ───────────────────────────────────────────────────────────────────

export class TimeKit {
  // ── Shared world ──────────────────────────────────────────────────
  private timePuddles: TimePuddle[] = [];
  private playerPosHistory: PosSnapshot[] = [];
  private npcPosHistory: PosSnapshot[] = [];
  private posHistoryAccum = 0;

  // ── Player revolver ───────────────────────────────────────────────
  private playerAmmo = 6;
  private playerLastShotAt = -99999;
  private playerShotInterval = 250;
  private playerReloading = false;
  private playerReloadStart = 0;
  private playerReloadDuration = 3000;
  private playerChamberSprite: Phaser.GameObjects.Arc | null = null;
  private playerChamberAngle = 0;
  private playerRevolverBullets: RevolverBullet[] = [];
  private playerPointerWasDown = false;
  private playerReloadFailed = false;   // true after a miss-click during reload (bars go red)
  // Click+ reload bar UI
  private playerReloadBarBg: Phaser.GameObjects.Rectangle | null = null;
  private playerReloadBarFill: Phaser.GameObjects.Rectangle | null = null;
  private playerReloadPerfectZone: Phaser.GameObjects.Rectangle | null = null;
  private playerReloadIndicator: Phaser.GameObjects.Rectangle | null = null;

  // ── NPC revolver ──────────────────────────────────────────────────
  private npcAmmo = 6;
  private npcLastShotAt = -99999;
  private npcShotInterval = 250;
  private npcReloading = false;
  private npcReloadStart = 0;
  private npcChamberSprite: Phaser.GameObjects.Arc | null = null;
  private npcChamberAngle = 0;
  private npcRevolverBullets: RevolverBullet[] = [];

  // ── Player lasso (E / E+) ─────────────────────────────────────────
  private playerLassoProj: Projectile | null = null;
  private playerLassoRope: Phaser.GameObjects.Graphics | null = null;
  private timeNpcTeleporting = false;
  private timeNpcTeleportStart = 0;
  private timeNpcTeleportFromX = 0; private timeNpcTeleportFromY = 0;
  private timeNpcTeleportToX = 0;   private timeNpcTeleportToY = 0;
  private timeNpcTeleportPuddleAccum = 0;
  private playerDragRope: Phaser.GameObjects.Graphics | null = null;
  private lastTimeWarpCast = -99999;
  // E+ Delayed Warp
  private timeWarpSavedPos: { x: number; y: number } | null = null;
  private timeWarpSavedMarker: Phaser.GameObjects.Graphics | null = null;
  private timeWarpTriggerPending = false;

  // ── NPC lasso (E) ─────────────────────────────────────────────────
  private npcLassoProj: Projectile | null = null;
  private npcLassoRope: Phaser.GameObjects.Graphics | null = null;
  private npcPlayerTeleporting = false;
  private npcPlayerTeleportStart = 0;
  private npcPlayerTeleportFromX = 0; private npcPlayerTeleportFromY = 0;
  private npcPlayerTeleportToX = 0;   private npcPlayerTeleportToY = 0;
  private npcPlayerTeleportPuddleAccum = 0;
  private npcDragRope: Phaser.GameObjects.Graphics | null = null;

  // ── Remain (R) — player ───────────────────────────────────────────
  private timeRemainActive = false;
  private timeRemainEnd = 0;
  private timeRemainAbsorbed = 0;
  private timeRemainAura: Phaser.GameObjects.Arc | null = null;
  private timeRemainPurgeUsed = false;
  // R+ Frozen Field
  private timeFrozenFieldActive = false;
  private timeFrozenFieldEnd = 0;
  private timeFrozenFieldAura: Phaser.GameObjects.Arc | null = null;
  private timeFrozenFieldProjs: Map<Projectile, { vx: number; vy: number }> = new Map();

  // ── Remain (R) — NPC ──────────────────────────────────────────────
  private npcRemainActive = false;
  private npcRemainEnd = 0;
  private npcRemainAbsorbed = 0;
  private npcRemainAura: Phaser.GameObjects.Arc | null = null;

  // ── Bounty (F) — player side ──────────────────────────────────────
  private playerBountyFloat = 0;         // fractional accumulator
  private playerBountyAccum = 0;         // synced floor(float)
  private playerHighestBountyEver = 0;
  private playerBountyLabel: Phaser.GameObjects.Text | null = null;
  private playerBountyAuraActive = false;
  private playerBountyAuraEnd = 0;
  private playerBountyAura: Phaser.GameObjects.Arc | null = null;
  private playerBountySlowedProjs: Map<Projectile, { vx: number; vy: number }> = new Map();
  // F+ Bounty Hunter player speed aura
  private playerSpeedAuraActive = false;
  private playerSpeedAuraEnd = 0;
  private playerSpeedAura: Phaser.GameObjects.Arc | null = null;
  private playerSpeedAuraSpedProjs: Map<Projectile, { vx: number; vy: number }> = new Map();
  private npcBountyHunterSlowUntil = 0;

  // ── Bounty (F) — NPC side ─────────────────────────────────────────
  private npcBountyFloat = 0;
  private npcBountyAccum = 0;
  private npcHighestBountyEver = 0;
  private npcBountyLabel: Phaser.GameObjects.Text | null = null;
  private npcBountyAuraActive = false;
  private npcBountyAuraEnd = 0;
  private npcBountyAura: Phaser.GameObjects.Arc | null = null;
  private npcBountySlowedProjs: Map<Projectile, { vx: number; vy: number }> = new Map();
  private playerBountyHunterSlowUntil = 0;

  // ── Always Noon (Q) ───────────────────────────────────────────────
  private timelessActive = false;
  private timelessEnd = 0;
  private timelessCharge = 0;
  private timelessChargeBar: Phaser.GameObjects.Rectangle | null = null;
  private timelessFrozenProjs: Map<Projectile, { vx: number; vy: number }> = new Map();
  private timelessFrozenNpcVelX = 0;
  private timelessFrozenNpcVelY = 0;
  private rifleShotsRemaining = 0;
  private rifleBeams: RifleBeam[] = [];
  private timelessOverlay: Phaser.GameObjects.Rectangle | null = null;
  // Q+: Rifle.Reload minigame
  private rifleReloading = false;
  private rifleReloadStart = 0;
  private readonly rifleReloadDuration = 1500;
  private rifleReloadBarsHit: [boolean, boolean, boolean] = [false, false, false];
  private rifleReloadBarBg: Phaser.GameObjects.Rectangle | null = null;
  private rifleReloadBarFill: Phaser.GameObjects.Rectangle | null = null;
  private rifleReloadZones: Phaser.GameObjects.Rectangle[] = [];
  private rifleReloadIndicator: Phaser.GameObjects.Rectangle | null = null;

  // ── NPC Q ─────────────────────────────────────────────────────────
  private npcTimelessActive = false;
  private npcTimelessEnd = 0;
  private npcTimelessCharge = 0;

  // ── Mastery: Passive Manipulation + Fan the Hammer ────────────────────
  private timeMode: 'rush' | 'focus' = 'focus';
  private lastModeSwitchAt = -MODE_SWITCH_CD_MS;
  private prevSpaceDown = false;
  private timeScaleApplied = false;
  private fanBullets: FanBullet[] = [];
  private fanningUntil = 0;
  private fanLastCastAt = -FAN_COOLDOWN_MS;

  constructor(private arena: TimeArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────

  isTimelessActive(): boolean { return this.timelessActive; }
  isNpcTimelessActive(): boolean { return this.npcTimelessActive; }
  isPlayerReloading(): boolean { return this.playerReloading; }
  getPlayerAmmo(): number { return this.playerAmmo; }
  isNpcRemainActive(): boolean { return this.npcRemainActive; }
  isRemainPurgeLocked(): boolean { return this.timeRemainPurgeUsed; }
  isNpcBountyAuraActive(): boolean { return this.npcBountyAuraActive; }
  getNpcBounty(): number { return Math.floor(this.npcBountyAccum); }
  getPlayerBounty(): number { return Math.floor(this.playerBountyAccum); }
  getNpcTimelessCharge(): number { return this.npcTimelessCharge; }
  getTimePuddles(): TimePuddle[] { return this.timePuddles; }

  getPlayerSpeedMult(): number {
    let m = 1;
    if (this.playerSpeedAuraActive) m *= 1.5;
    if (this.npcBountyAuraActive) m *= 0.5; // NPC's bounty aura slows player
    if (this.arena.scene.time.now < this.playerBountyHunterSlowUntil) m *= 0.75;
    const { player } = this.arena;
    if (this.timePuddles.some(p => p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) <= p.radius)) m *= 0.75;
    return m;
  }

  getNpcSpeedMult(): number {
    let m = 1;
    if (this.playerBountyAuraActive) m *= 0.5;
    if (this.arena.scene.time.now < this.npcBountyHunterSlowUntil) m *= 0.75;
    const { npc } = this.arena;
    if (this.timePuddles.some(p => p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, npc.x, npc.y) <= p.radius)) m *= 0.75;
    return m;
  }

  getPlayerCooldownMult(): number { return this.playerSpeedAuraActive ? 0.5 : 1; }
  getNpcCooldownMult(): number { return this.playerBountyAuraActive ? 2.0 : 1; }

  // ── Lifecycle ─────────────────────────────────────────────────────

  reset(): void {
    const { player, npc } = this.arena;

    for (const p of this.timePuddles) p.sprite.destroy();
    this.timePuddles = [];
    this.playerPosHistory = []; this.npcPosHistory = []; this.posHistoryAccum = 0;

    this.playerAmmo = 6; this.playerLastShotAt = -99999; this.playerReloading = false;
    this.playerReloadFailed = false; this.playerReloadDuration = 3000; this.playerChamberAngle = 0;
    this.playerChamberSprite?.destroy(); this.playerChamberSprite = null;
    this.playerRevolverBullets = []; this.playerPointerWasDown = false;
    this.playerReloadBarBg?.destroy(); this.playerReloadBarBg = null;
    this.playerReloadBarFill?.destroy(); this.playerReloadBarFill = null;
    this.playerReloadPerfectZone?.destroy(); this.playerReloadPerfectZone = null;
    this.playerReloadIndicator?.destroy(); this.playerReloadIndicator = null;

    this.npcAmmo = 6; this.npcLastShotAt = -99999; this.npcReloading = false;
    this.npcChamberAngle = 0;
    this.npcChamberSprite?.destroy(); this.npcChamberSprite = null;
    this.npcRevolverBullets = [];

    this.playerLassoProj = null;
    this.playerLassoRope?.destroy(); this.playerLassoRope = null;
    this.timeNpcTeleporting = false;
    this.playerDragRope?.destroy(); this.playerDragRope = null;
    this.lastTimeWarpCast = -99999;
    this.timeWarpSavedPos = null;
    this.timeWarpSavedMarker?.destroy(); this.timeWarpSavedMarker = null;
    this.timeWarpTriggerPending = false;

    this.npcLassoProj = null;
    this.npcLassoRope?.destroy(); this.npcLassoRope = null;
    this.npcPlayerTeleporting = false;
    this.npcDragRope?.destroy(); this.npcDragRope = null;

    this.timeRemainActive = false; this.timeRemainAbsorbed = 0;
    this.timeRemainAura?.destroy(); this.timeRemainAura = null;
    this.timeRemainPurgeUsed = false;
    player.damageAbsorber = null;
    this.timeFrozenFieldActive = false;
    for (const [p, v] of this.timeFrozenFieldProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
    this.timeFrozenFieldProjs.clear();
    this.timeFrozenFieldAura?.destroy(); this.timeFrozenFieldAura = null;

    this.npcRemainActive = false; this.npcRemainAbsorbed = 0;
    this.npcRemainAura?.destroy(); this.npcRemainAura = null;
    npc.damageAbsorber = null;

    this.playerBountyFloat = 0; this.playerBountyAccum = 0; this.playerHighestBountyEver = 0;
    this.playerBountyLabel?.destroy(); this.playerBountyLabel = null;
    this.playerBountyAuraActive = false;
    this.playerBountyAura?.destroy(); this.playerBountyAura = null;
    if (npc.cooldownMult > 1) npc.cooldownMult = 1;
    for (const [p, v] of this.playerBountySlowedProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
    this.playerBountySlowedProjs.clear();
    this.playerSpeedAuraActive = false;
    this.playerSpeedAura?.destroy(); this.playerSpeedAura = null;
    for (const [p, v] of this.playerSpeedAuraSpedProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
    this.playerSpeedAuraSpedProjs.clear();
    this.npcBountyHunterSlowUntil = 0;
    if (player.cooldownMult < 1) player.cooldownMult = 1;

    this.npcBountyFloat = 0; this.npcBountyAccum = 0; this.npcHighestBountyEver = 0;
    this.npcBountyLabel?.destroy(); this.npcBountyLabel = null;
    this.npcBountyAuraActive = false;
    this.npcBountyAura?.destroy(); this.npcBountyAura = null;
    if (player.cooldownMult > 1) player.cooldownMult = 1;
    for (const [p, v] of this.npcBountySlowedProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
    this.npcBountySlowedProjs.clear();
    this.playerBountyHunterSlowUntil = 0;

    this.timelessActive = false; this.timelessCharge = 0;
    this.timelessChargeBar?.destroy(); this.timelessChargeBar = null;
    this.timelessOverlay?.destroy(); this.timelessOverlay = null;
    for (const [p, v] of this.timelessFrozenProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
    this.timelessFrozenProjs.clear();
    this.rifleShotsRemaining = 0;
    for (const b of this.rifleBeams) { b.gfx.destroy(); b.coreGfx.destroy(); }
    this.rifleBeams = [];
    this.rifleReloading = false; this.rifleReloadStart = 0;
    this.rifleReloadBarsHit = [false, false, false];
    this.destroyRifleReloadBar();

    this.npcTimelessActive = false; this.npcTimelessCharge = 0;
    if (npc.cooldownMult < 0.01) npc.cooldownMult = 1;

    // Mastery — Passive Manipulation + Fan the Hammer
    this.timeMode = 'focus';
    this.lastModeSwitchAt = -MODE_SWITCH_CD_MS;
    this.prevSpaceDown = false;
    this.restoreTimeScale();
    for (const b of this.fanBullets) if (b.proj.active) b.proj.destroy();
    this.fanBullets = [];
    this.fanningUntil = 0;
    this.fanLastCastAt = -FAN_COOLDOWN_MS;
    player.walkSpeedMult = 1;
  }

  private restoreTimeScale(): void {
    const scene = this.arena.scene as Phaser.Scene & {
      physics: Phaser.Physics.Arcade.ArcadePhysics; tweens: Phaser.Tweens.TweenManager;
    };
    if (scene.physics?.world) scene.physics.world.timeScale = 1;
    scene.tweens.timeScale = 1;
    this.timeScaleApplied = false;
  }

  // ── handleInput ───────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.arena.nukeChanneling) return;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    const pointerJustDown = pointer.isDown && !this.playerPointerWasDown;
    this.playerPointerWasDown = pointer.isDown;

    // ── Mastery — Passive Manipulation: dash (Space) flips focus/rush ────
    // Rising-edge on isDown (NOT JustDown) so we don't consume the flag the generic dodge reads.
    const fanSlot = this.arena.masteryActive ? this.fanSlot() : null;
    const spaceDown = this.arena.spaceKey.isDown;
    if (this.arena.masteryActive && spaceDown && !this.prevSpaceDown) this.switchTimeMode(time);
    this.prevSpaceDown = spaceDown;
    // Fan the Hammer takes over its bound slot (cast, or re-cast to detonate).
    if (fanSlot) {
      const fk = fanSlot === 'e' ? this.arena.eKey : fanSlot === 'r' ? this.arena.rKey : fanSlot === 'f' ? this.arena.fKey : this.arena.qKey;
      if (Phaser.Input.Keyboard.JustDown(fk)) this.tryCastFan(time, mouseX, mouseY);
    }

    // Time-stop mode — rifle replaces click; Q+ allows reloading
    if (this.timelessActive) {
      if (this.rifleReloading) {
        if (pointerJustDown) this.checkRifleReloadHit(time);
      } else if (pointerJustDown && this.rifleShotsRemaining > 0) {
        this.fireRifle(mouseX, mouseY, time);
      }
      return;
    }

    // Revolver click
    if (this.playerReloading) {
      if (pointerJustDown && this.arena.hasUpgrade('click') && time - this.playerReloadStart >= 200) {
        if (this.isInPerfectZone(time)) {
          this.perfectReloadFire(mouseX, mouseY, time);
        } else if (!this.playerReloadFailed) {
          this.playerReloadFailed = true;
        }
      }
    } else if (pointer.isDown && this.playerAmmo > 0 && time - this.playerLastShotAt >= this.playerShotInterval) {
      this.fireRevolverShot('player', mouseX, mouseY, time);
    }

    // E: Lasso
    if (fanSlot !== 'e' && Phaser.Input.Keyboard.JustDown(this.arena.eKey)) this.castLasso(mouseX, mouseY, playerCtx);
    // R: Remain (or Purge recast while active)
    if (fanSlot !== 'r' && Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      if (this.timeRemainActive && this.arena.hasPerk('player', 'purge') && !this.timeRemainPurgeUsed) {
        // Purge recast: extend duration 3s, turn aura red, lock for rest of match
        this.timeRemainEnd += 3000;
        this.timeRemainAura?.setFillStyle(0xff3322, 0.35);
        this.timeRemainPurgeUsed = true;
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '⏳ PURGE — locked', '#ff4444');
      } else if (!this.timeRemainPurgeUsed) {
        this.arena.player.castAbility('time-remain', playerCtx);
      }
    }
    // F: Bounty / Bounty Hunter recast
    if (fanSlot !== 'f' && Phaser.Input.Keyboard.JustDown(this.arena.fKey)) this.castBountyOrRecast(time, playerCtx);
    // Q: Always Noon
    if (fanSlot !== 'q' && Phaser.Input.Keyboard.JustDown(this.arena.qKey)) this.doTimeAlwaysNoon('player');
  }

  private castLasso(mouseX: number, mouseY: number, playerCtx: CastContext): void {
    if (this.arena.hasUpgrade('e') && this.timeWarpSavedPos) {
      this.timeWarpTriggerPending = true;
    } else {
      this.arena.player.castAbility('time-warp', playerCtx);
    }
  }

  private castBountyOrRecast(time: number, playerCtx: CastContext): void {
    if (this.playerBountyAuraActive && this.arena.hasUpgrade('f')) {
      this.doBountyHunterRecast('player', time);
    } else if (!this.playerBountyAuraActive && this.playerBountyAccum >= 1) {
      this.arena.player.castAbility('time-halt', playerCtx);
    }
  }

  // ── update ────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const isPlayer = this.arena.elementId === 'sand';
    const isNpc = this.arena.npcElementId === 'sand';

    // Position snapshot every 100ms
    this.posHistoryAccum += delta;
    while (this.posHistoryAccum >= 100) {
      this.posHistoryAccum -= 100;
      this.npcPosHistory.push({ x: this.arena.npc.x, y: this.arena.npc.y, t: time });
      this.playerPosHistory.push({ x: this.arena.player.x, y: this.arena.player.y, t: time });
      while (this.npcPosHistory.length > 40) this.npcPosHistory.shift();
      while (this.playerPosHistory.length > 40) this.playerPosHistory.shift();
    }

    // Mastery — Passive Manipulation time-scale + Fan the Hammer bullets (both owners).
    this.updatePassiveManipulation();
    this.updateFanBullets(time, delta);
    if (isPlayer) {
      if (time < this.fanningUntil) this.arena.player.walkSpeedMult = FAN_SLOW_MULT;
      else if (this.arena.player.walkSpeedMult === FAN_SLOW_MULT) this.arena.player.walkSpeedMult = 1;
    }

    if (isPlayer) {
      this.updatePlayerRevolver(time, delta);
      this.updateBulletRamp(this.playerRevolverBullets, time);
      this.updatePlayerLasso(time, delta);
      this.updatePlayerRemain(time);
      this.updateFrozenField(time);
      this.updatePlayerBountyAura(time);
      this.updatePlayerSpeedAura(time);
      this.updateTimeless(time, delta);
      this.updateTimelessCharge(time, delta);
    }

    if (isNpc) {
      this.updateNpcRevolver(time, delta);
      this.updateBulletRamp(this.npcRevolverBullets, time);
      this.updateNpcLasso(time, delta);
      this.updateNpcRemain(time);
      this.updateNpcBountyAura(time);
      this.updateNpcTimeless(time, delta);
    }

    // Puddle expiry
    for (let i = this.timePuddles.length - 1; i >= 0; i--) {
      const p = this.timePuddles[i];
      if (time >= p.expiresAt) { p.sprite.destroy(); this.timePuddles.splice(i, 1); }
    }
  }

  // ── Player update helpers ─────────────────────────────────────────

  private updatePlayerRevolver(time: number, delta: number): void {
    const { player, scene } = this.arena;
    if (!this.playerReloading) {
      this.playerChamberSprite?.destroy(); this.playerChamberSprite = null;
      return;
    }
    const progress = Math.min(1, (time - this.playerReloadStart) / this.playerReloadDuration);
    // Spinning grey chamber visual (revolver being swung/reloaded)
    if (!this.playerChamberSprite) {
      this.playerChamberSprite = scene.add.circle(0, 0, 7, 0x888888, 0.9)
        .setStrokeStyle(1, 0xcccccc, 0.7).setDepth(13);
    }
    this.playerChamberAngle += delta * 0.006;
    const cR = 22;
    this.playerChamberSprite.setPosition(
      player.x + Math.cos(this.playerChamberAngle) * cR,
      player.y + Math.sin(this.playerChamberAngle) * cR,
    );
    if (this.arena.hasUpgrade('click')) this.drawReloadBar(time, player.x, player.y);
    if (progress >= 1) this.completeReload('player');
  }

  private updateBulletRamp(bullets: RevolverBullet[], time: number): void {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.proj.active) { bullets.splice(i, 1); continue; }
      const t = clamp01((time - b.spawnAt) / b.rampMs);
      const dmg = Math.round(b.baseDmg + (b.maxDmg - b.baseDmg) * t);
      (b.proj as unknown as { damage: number }).damage = dmg;
      b.proj.setTint(Phaser.Display.Color.GetColor(0xff, lerpN(0xee, 0x22, t), lerpN(0x44, 0x11, t)));
    }
  }

  private updatePlayerLasso(time: number, delta: number): void {
    const { player, npc, scene } = this.arena;

    // Rope from player to in-flight lasso
    if (this.playerLassoProj && this.playerLassoProj.active) {
      if (!this.playerLassoRope) this.playerLassoRope = scene.add.graphics().setDepth(7);
      this.playerLassoRope.clear();
      this.playerLassoRope.lineStyle(2, 0xcc9944, 0.8);
      this.playerLassoRope.beginPath();
      this.playerLassoRope.moveTo(player.x, player.y);
      this.playerLassoRope.lineTo(this.playerLassoProj.x, this.playerLassoProj.y);
      this.playerLassoRope.strokePath();
    } else {
      if (!this.playerLassoProj?.active) { this.playerLassoRope?.clear(); this.playerLassoProj = null; }
    }

    // E+ Delayed Warp: trigger drag to saved position
    if (this.timeWarpTriggerPending && this.timeWarpSavedPos && !this.timeNpcTeleporting) {
      this.timeWarpTriggerPending = false;
      this.timeNpcTeleporting = true;
      this.timeNpcTeleportStart = time;
      this.timeNpcTeleportFromX = npc.x; this.timeNpcTeleportFromY = npc.y;
      this.timeNpcTeleportToX = this.timeWarpSavedPos.x;
      this.timeNpcTeleportToY = this.timeWarpSavedPos.y;
      this.timeNpcTeleportPuddleAccum = 0;
      this.timeWarpSavedPos = null;
      this.timeWarpSavedMarker?.destroy(); this.timeWarpSavedMarker = null;
      this.arena.showFloatingText(player.x, player.y - 32, '⏩ Drag!', '#ffdd44');
    }

    // NPC drag animation
    if (this.timeNpcTeleporting) {
      const progress = Math.min(1, (time - this.timeNpcTeleportStart) / 1000);
      const nx = this.timeNpcTeleportFromX + (this.timeNpcTeleportToX - this.timeNpcTeleportFromX) * progress;
      const ny = this.timeNpcTeleportFromY + (this.timeNpcTeleportToY - this.timeNpcTeleportFromY) * progress;
      npc.setPosition(nx, ny);
      this.timeNpcTeleportPuddleAccum += delta;
      while (this.timeNpcTeleportPuddleAccum >= 200) {
        this.timeNpcTeleportPuddleAccum -= 200;
        this.spawnTimePuddle(nx, ny, 'player');
      }
      if (!this.playerDragRope) this.playerDragRope = scene.add.graphics().setDepth(7);
      this.playerDragRope.clear();
      this.playerDragRope.lineStyle(3, 0xffdd44, 0.75);
      this.playerDragRope.beginPath();
      this.playerDragRope.moveTo(player.x, player.y);
      this.playerDragRope.lineTo(nx, ny);
      this.playerDragRope.strokePath();
      if (progress >= 1) {
        this.timeNpcTeleporting = false;
        this.playerDragRope.destroy(); this.playerDragRope = null;
      }
    } else {
      this.playerDragRope?.clear();
    }
  }

  private updatePlayerRemain(time: number): void {
    const { player } = this.arena;
    if (this.timeRemainAura) this.timeRemainAura.setPosition(player.x, player.y);
    if (this.timeRemainActive && time >= this.timeRemainEnd) {
      this.timeRemainActive = false;
      player.damageAbsorber = null;
      this.timeRemainAura?.destroy(); this.timeRemainAura = null;
      if (!this.timeRemainPurgeUsed) {
        const dmg = Math.round(this.timeRemainAbsorbed * 0.8);
        if (dmg > 0) player.takeDamage(dmg);
      }
      this.timeRemainAbsorbed = 0;
    }
  }

  private updateFrozenField(time: number): void {
    const { player, projectiles } = this.arena;
    if (!this.timeFrozenFieldActive) return;
    if (this.timeFrozenFieldAura) this.timeFrozenFieldAura.setPosition(player.x, player.y);
    if (time >= this.timeFrozenFieldEnd) {
      this.timeFrozenFieldActive = false;
      this.timeFrozenFieldAura?.destroy(); this.timeFrozenFieldAura = null;
      for (const [p, v] of this.timeFrozenFieldProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
      this.timeFrozenFieldProjs.clear();
      return;
    }
    for (const child of projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, player.x, player.y) <= 60) {
        if (!this.timeFrozenFieldProjs.has(proj)) this.timeFrozenFieldProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
        body.setVelocity(0, 0);
      } else if (this.timeFrozenFieldProjs.has(proj)) {
        const v = this.timeFrozenFieldProjs.get(proj)!;
        body.setVelocity(v.vx, v.vy);
        this.timeFrozenFieldProjs.delete(proj);
      }
    }
  }

  private updatePlayerBountyAura(time: number): void {
    const { npc, scene, projectiles } = this.arena;

    // Bounty label above enemy
    const bountyCount = Math.floor(this.playerBountyAccum);
    if (bountyCount >= 1) {
      if (!this.playerBountyLabel) {
        this.playerBountyLabel = scene.add.text(0, 0, '', { fontSize: '11px', color: '#ffdd44' }).setOrigin(0.5).setDepth(20);
      }
      this.playerBountyLabel.setText(`Bounty: ${bountyCount}`).setPosition(npc.x, npc.y - 55);
    } else {
      this.playerBountyLabel?.setText('');
    }

    if (!this.playerBountyAuraActive) return;
    if (this.playerBountyAura) this.playerBountyAura.setPosition(npc.x, npc.y);
    if (time >= this.playerBountyAuraEnd) { this.endBountyAura('player'); return; }

    npc.cooldownMult = 2.0;

    for (const child of projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, npc.x, npc.y) <= 120) {
        if (!this.playerBountySlowedProjs.has(proj)) this.playerBountySlowedProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
        const orig = this.playerBountySlowedProjs.get(proj)!;
        body.setVelocity(orig.vx * 0.15, orig.vy * 0.15);
      } else if (this.playerBountySlowedProjs.has(proj)) {
        const v = this.playerBountySlowedProjs.get(proj)!;
        body.setVelocity(v.vx, v.vy);
        this.playerBountySlowedProjs.delete(proj);
      }
    }
  }

  private updatePlayerSpeedAura(time: number): void {
    const { player, projectiles } = this.arena;
    if (!this.playerSpeedAuraActive) return;
    if (this.playerSpeedAura) this.playerSpeedAura.setPosition(player.x, player.y);
    if (time >= this.playerSpeedAuraEnd) {
      this.playerSpeedAuraActive = false;
      this.playerSpeedAura?.destroy(); this.playerSpeedAura = null;
      for (const [p, v] of this.playerSpeedAuraSpedProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
      this.playerSpeedAuraSpedProjs.clear();
      this.playerReloadDuration = 3000;
      if (player.cooldownMult < 1) player.cooldownMult = 1;
      return;
    }
    for (const child of projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, player.x, player.y) <= 120) {
        if (!this.playerSpeedAuraSpedProjs.has(proj)) this.playerSpeedAuraSpedProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
        const orig = this.playerSpeedAuraSpedProjs.get(proj)!;
        body.setVelocity(orig.vx * 1.5, orig.vy * 1.5);
      } else if (this.playerSpeedAuraSpedProjs.has(proj)) {
        const v = this.playerSpeedAuraSpedProjs.get(proj)!;
        body.setVelocity(v.vx, v.vy);
        this.playerSpeedAuraSpedProjs.delete(proj);
      }
    }
  }

  private updateTimeless(time: number, delta: number): void {
    const { npc, projectiles } = this.arena;
    if (!this.timelessActive) return;

    // Timeless is always player-cast (it freezes the npc), so this only ever shows on your tray.
    // Registered every frame while active; cleared in the expiry branch below.
    this.arena.setStatusIndicator('timeless', {
      name: 'Timeless', emoji: '⏳', color: 0xffdd88, priority: 109, until: this.timelessEnd,
      description: 'Time is stopped. Enemies and projectiles are frozen and your cooldowns are free.',
    });

    // Freeze all projectiles (including newly spawned)
    for (const child of projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (!this.timelessFrozenProjs.has(proj)) this.timelessFrozenProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
      body.setVelocity(0, 0);
    }
    // Keep NPC frozen
    (npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    // Bullet ramp continues during time-stop
    this.updateBulletRamp(this.playerRevolverBullets, time);

    // Q+: rifle reload minigame tick
    if (this.rifleReloading) {
      this.drawRifleReloadBar(time, this.arena.player.x, this.arena.player.y);
      if (time - this.rifleReloadStart >= this.rifleReloadDuration) {
        const allHit = this.rifleReloadBarsHit[0] && this.rifleReloadBarsHit[1] && this.rifleReloadBarsHit[2];
        this.completeRifleReload(allHit);
      }
    }

    if (time >= this.timelessEnd) {
      this.timelessActive = false;
      this.arena.setStatusIndicator('timeless', null);
      if (this.rifleReloading) { this.rifleReloading = false; this.destroyRifleReloadBar(); }
      for (const [p, v] of this.timelessFrozenProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
      this.timelessFrozenProjs.clear();
      (npc.body as Phaser.Physics.Arcade.Body).setVelocity(this.timelessFrozenNpcVelX, this.timelessFrozenNpcVelY);
      this.timelessOverlay?.destroy(); this.timelessOverlay = null;
      this.resolveRifleBeams();
      this.rifleShotsRemaining = 0;
    }
  }

  private updateTimelessCharge(time: number, delta: number): void {
    const { player, scene } = this.arena;
    if (!this.timelessChargeBar) {
      this.timelessChargeBar = scene.add.rectangle(player.x, player.y - 40, 0, 5, 0xffdd44, 0.85)
        .setDepth(12).setOrigin(0, 0.5);
    }
    const maxW = 40;
    this.timelessChargeBar.setPosition(player.x - maxW / 2, player.y - 40);
    this.timelessChargeBar.setSize(Math.min(maxW, (this.timelessCharge / 10000) * maxW), 5);
    const barColor = this.timelessCharge >= 10000 ? 0x4488ff : 0xffdd44;
    this.timelessChargeBar.setFillStyle(barColor, 0.85);

    // Charge from standing in player-owned puddles
    if (!this.timelessActive) {
      const inPuddle = this.timePuddles.some(p => p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) <= p.radius);
      if (inPuddle) this.timelessCharge = Math.min(10000, this.timelessCharge + delta);
    }
  }

  // ── NPC update helpers ────────────────────────────────────────────

  private updateNpcRevolver(time: number, delta: number): void {
    const { npc, player, scene } = this.arena;
    if (this.npcReloading) {
      const progress = Math.min(1, (time - this.npcReloadStart) / 3000);
      if (!this.npcChamberSprite) {
        this.npcChamberSprite = scene.add.circle(0, 0, 7, 0x888888, 0.9)
          .setStrokeStyle(1, 0xcccccc, 0.7).setDepth(13);
      }
      this.npcChamberAngle += delta * 0.006;
      this.npcChamberSprite.setPosition(
        npc.x + Math.cos(this.npcChamberAngle) * 22,
        npc.y + Math.sin(this.npcChamberAngle) * 22,
      );
      if (progress >= 1) this.completeReload('npc');
    } else {
      this.npcChamberSprite?.destroy(); this.npcChamberSprite = null;
      const dist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
      if (dist <= 400 && !this.npcRemainActive && !this.npcTimelessActive && this.npcAmmo > 0) {
        if (time - this.npcLastShotAt >= this.npcShotInterval) {
          // Add aim offset for NPC (slight spread)
          const aimOff = (Math.random() * 2 - 1) * 0.12;
          const baseAngle = Math.atan2(player.y - npc.y, player.x - npc.x);
          const tx = npc.x + Math.cos(baseAngle + aimOff) * 400;
          const ty = npc.y + Math.sin(baseAngle + aimOff) * 400;
          this.fireRevolverShot('npc', tx, ty, time);
        }
      }
    }
  }

  private updateNpcLasso(time: number, delta: number): void {
    const { npc, player, scene } = this.arena;
    if (this.npcLassoProj?.active) {
      if (!this.npcLassoRope) this.npcLassoRope = scene.add.graphics().setDepth(7);
      this.npcLassoRope.clear();
      this.npcLassoRope.lineStyle(2, 0xcc9944, 0.8);
      this.npcLassoRope.beginPath();
      this.npcLassoRope.moveTo(npc.x, npc.y);
      this.npcLassoRope.lineTo(this.npcLassoProj.x, this.npcLassoProj.y);
      this.npcLassoRope.strokePath();
    } else {
      if (this.npcLassoProj && !this.npcLassoProj.active) { this.npcLassoRope?.clear(); this.npcLassoProj = null; }
    }
    if (this.npcPlayerTeleporting) {
      const progress = Math.min(1, (time - this.npcPlayerTeleportStart) / 1000);
      const px = this.npcPlayerTeleportFromX + (this.npcPlayerTeleportToX - this.npcPlayerTeleportFromX) * progress;
      const py = this.npcPlayerTeleportFromY + (this.npcPlayerTeleportToY - this.npcPlayerTeleportFromY) * progress;
      player.setPosition(px, py);
      this.npcPlayerTeleportPuddleAccum += delta;
      while (this.npcPlayerTeleportPuddleAccum >= 200) {
        this.npcPlayerTeleportPuddleAccum -= 200;
        this.spawnTimePuddle(px, py, 'npc');
      }
      if (!this.npcDragRope) this.npcDragRope = scene.add.graphics().setDepth(7);
      this.npcDragRope.clear();
      this.npcDragRope.lineStyle(3, 0xffdd44, 0.75);
      this.npcDragRope.beginPath();
      this.npcDragRope.moveTo(npc.x, npc.y);
      this.npcDragRope.lineTo(px, py);
      this.npcDragRope.strokePath();
      if (progress >= 1) {
        this.npcPlayerTeleporting = false;
        this.npcDragRope.destroy(); this.npcDragRope = null;
      }
    } else {
      this.npcDragRope?.clear();
    }
  }

  private updateNpcRemain(time: number): void {
    const { npc } = this.arena;
    if (this.npcRemainAura) this.npcRemainAura.setPosition(npc.x, npc.y);
    if (this.npcRemainActive && time >= this.npcRemainEnd) {
      this.npcRemainActive = false;
      npc.damageAbsorber = null;
      this.npcRemainAura?.destroy(); this.npcRemainAura = null;
      const dmg = Math.round(this.npcRemainAbsorbed * 0.8);
      if (dmg > 0) npc.takeDamage(dmg);
      this.npcRemainAbsorbed = 0;
    }
  }

  private updateNpcBountyAura(time: number): void {
    const { player, scene, projectiles } = this.arena;

    const bountyCount = Math.floor(this.npcBountyAccum);
    if (bountyCount >= 1) {
      if (!this.npcBountyLabel) {
        this.npcBountyLabel = scene.add.text(0, 0, '', { fontSize: '11px', color: '#ffdd44' }).setOrigin(0.5).setDepth(20);
      }
      this.npcBountyLabel.setText(`Bounty: ${bountyCount}`).setPosition(player.x, player.y - 55);
    } else {
      this.npcBountyLabel?.setText('');
    }

    if (!this.npcBountyAuraActive) return;
    if (this.npcBountyAura) this.npcBountyAura.setPosition(player.x, player.y);
    if (time >= this.npcBountyAuraEnd) { this.endBountyAura('npc'); return; }

    player.cooldownMult = 2.0;

    for (const child of projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, player.x, player.y) <= 120) {
        if (!this.npcBountySlowedProjs.has(proj)) this.npcBountySlowedProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
        const orig = this.npcBountySlowedProjs.get(proj)!;
        body.setVelocity(orig.vx * 0.15, orig.vy * 0.15);
      } else if (this.npcBountySlowedProjs.has(proj)) {
        const v = this.npcBountySlowedProjs.get(proj)!;
        body.setVelocity(v.vx, v.vy);
        this.npcBountySlowedProjs.delete(proj);
      }
    }
  }

  private updateNpcTimeless(time: number, delta: number): void {
    if (this.npcTimelessActive) {
      if (time >= this.npcTimelessEnd) {
        this.npcTimelessActive = false;
        this.arena.npc.cooldownMult = 1;
      }
    } else {
      // Charge from NPC-owned puddles
      const inOwnPuddle = this.timePuddles.some(
        p => p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.arena.npc.x, this.arena.npc.y) <= p.radius,
      );
      if (inOwnPuddle) this.npcTimelessCharge = Math.min(10000, this.npcTimelessCharge + delta);
    }
  }

  // ── Public do* methods (called from CastContext) ──────────────────

  doTimeQuickShot(): void { /* handled in handleInput */ }

  doTimeLasso(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { scene, player, npc, projectiles } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const lasso = new Projectile(scene, caster.x, caster.y, 'proj-time-lasso-orb', 0, owner === 'player');
    projectiles.add(lasso);
    lasso.launch((dx / len) * 260, (dy / len) * 260);
    scene.time.delayedCall(3000, () => {
      if (lasso.active) { lasso.setActive(false).setVisible(false); (lasso.body as Phaser.Physics.Arcade.Body).stop(); }
      if (owner === 'player') { this.playerLassoRope?.clear(); this.playerLassoProj = null; }
      else { this.npcLassoRope?.clear(); this.npcLassoProj = null; }
    });
    if (owner === 'player') this.playerLassoProj = lasso;
    else this.npcLassoProj = lasso;
    const flash = scene.add.circle(caster.x, caster.y, 10, 0xcc9944, 0.6).setDepth(9);
    scene.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
  }

  doTimeRemain(owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    const fighter = owner === 'player' ? player : npc;
    if (owner === 'player') {
      this.timeRemainActive = true;
      this.timeRemainEnd = scene.time.now + 3000;
      this.timeRemainAbsorbed = 0;
      this.timeRemainAura?.destroy();
      this.timeRemainAura = scene.add.circle(fighter.x, fighter.y, 40, 0xffdd44, 0.35).setDepth(4);
      scene.tweens.add({ targets: this.timeRemainAura, alpha: 0.6, yoyo: true, repeat: -1, duration: 350 });
      fighter.damageAbsorber = (amount) => {
        const prev = Math.floor(this.timeRemainAbsorbed / 10);
        this.timeRemainAbsorbed += amount;
        this.arena.recordMasteryStat('remainAbsorbed', amount);
        const next = Math.floor(this.timeRemainAbsorbed / 10);
        for (let i = prev; i < next; i++) {
          const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 40;
          this.spawnTimePuddle(fighter.x + Math.cos(a) * r, fighter.y + Math.sin(a) * r, 'player');
        }
        return true;
      };
      // R+ Frozen Field: also summon a projectile-freeze zone
      if (this.arena.hasUpgrade('r')) {
        this.timeFrozenFieldActive = true;
        this.timeFrozenFieldEnd = scene.time.now + 3000;
        this.timeFrozenFieldProjs.clear();
        this.timeFrozenFieldAura?.destroy();
        this.timeFrozenFieldAura = scene.add.circle(fighter.x, fighter.y, 60, 0x8888ff, 0.08)
          .setStrokeStyle(2, 0x8888ff, 0.4).setDepth(3);
        scene.tweens.add({ targets: this.timeFrozenFieldAura, alpha: 0.2, yoyo: true, repeat: -1, duration: 400 });
      }
    } else {
      this.npcRemainActive = true;
      this.npcRemainEnd = scene.time.now + 3000;
      this.npcRemainAbsorbed = 0;
      this.npcRemainAura?.destroy();
      this.npcRemainAura = scene.add.circle(fighter.x, fighter.y, 40, 0xffdd44, 0.35).setDepth(4);
      scene.tweens.add({ targets: this.npcRemainAura, alpha: 0.6, yoyo: true, repeat: -1, duration: 350 });
      fighter.damageAbsorber = (amount) => {
        const prev = Math.floor(this.npcRemainAbsorbed / 10);
        this.npcRemainAbsorbed += amount;
        const next = Math.floor(this.npcRemainAbsorbed / 10);
        for (let i = prev; i < next; i++) {
          const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 40;
          this.spawnTimePuddle(fighter.x + Math.cos(a) * r, fighter.y + Math.sin(a) * r, 'npc');
        }
        return true;
      };
    }
  }

  doTimeBounty(owner: 'player' | 'npc'): void {
    const { scene, npc, player } = this.arena;
    const bounty = owner === 'player' ? this.playerBountyAccum : this.npcBountyAccum;
    if (bounty < 1) return;
    const target = owner === 'player' ? npc : player;
    const durationMs = Math.max(1000, Math.floor(bounty) * 1000);

    if (owner === 'player') {
      this.playerBountyAuraActive = true;
      this.playerBountyAuraEnd = scene.time.now + durationMs;
      this.playerBountySlowedProjs.clear();
      this.playerBountyAura?.destroy();
      this.playerBountyAura = scene.add.circle(target.x, target.y, 120, 0xffdd44, 0.06)
        .setStrokeStyle(2, 0xffdd44, 0.5).setDepth(3);
      scene.tweens.add({ targets: this.playerBountyAura, alpha: 0.15, yoyo: true, repeat: -1, duration: 500 });
      target.cooldownMult = 2.0;
      const flash = scene.add.circle(target.x, target.y, 30, 0xffdd44, 0.5).setDepth(10);
      scene.tweens.add({ targets: flash, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
      this.arena.showFloatingText(player.x, player.y - 36, 'BOUNTY!', '#ffdd44');
      // Bounty is spent on cast; reset after
      this.playerBountyFloat = 0; this.playerBountyAccum = 0;
    } else {
      this.npcBountyAuraActive = true;
      this.npcBountyAuraEnd = scene.time.now + durationMs;
      this.npcBountySlowedProjs.clear();
      this.npcBountyAura?.destroy();
      this.npcBountyAura = scene.add.circle(target.x, target.y, 120, 0xffdd44, 0.06)
        .setStrokeStyle(2, 0xffdd44, 0.5).setDepth(3);
      scene.tweens.add({ targets: this.npcBountyAura, alpha: 0.15, yoyo: true, repeat: -1, duration: 500 });
      target.cooldownMult = 2.0;
      this.npcBountyFloat = 0; this.npcBountyAccum = 0;
    }
  }

  /** `force` — Subterfuge's Dark Treachery time-Q copy activates without any bounty charge. */
  doTimeAlwaysNoon(owner: 'player' | 'npc', force = false): void {
    const { scene, player, npc, projectiles } = this.arena;
    const time = scene.time.now;

    if (owner === 'player') {
      const wasAtMax = force || this.timelessCharge >= 10000;
      // Convert bounty → energy (overflow discarded)
      this.timelessCharge = Math.min(10000, this.timelessCharge + this.playerBountyFloat * 1000);
      this.playerBountyFloat = 0; this.playerBountyAccum = 0;
      this.playerBountyLabel?.setText('');
      if (!wasAtMax || this.timelessActive) return;
      this.timelessActive = true;
      this.timelessEnd = time + 5000;
      this.timelessCharge = 0;
      this.rifleShotsRemaining = 3;
      this.rifleBeams = [];
      this.timelessFrozenProjs.clear();
      for (const child of projectiles.getChildren()) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const body = proj.body as Phaser.Physics.Arcade.Body;
        this.timelessFrozenProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
        body.setVelocity(0, 0);
      }
      const npcBody = npc.body as Phaser.Physics.Arcade.Body;
      this.timelessFrozenNpcVelX = npcBody.velocity.x;
      this.timelessFrozenNpcVelY = npcBody.velocity.y;
      npcBody.setVelocity(0, 0);
      const flash = scene.add.circle(player.x, player.y, 50, 0xffdd44, 0.55).setDepth(12);
      scene.tweens.add({ targets: flash, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
      this.arena.showFloatingText(player.x, player.y - 40, 'ALWAYS NOON', '#ffdd44');
      // Gray battlefield overlay
      const { width, height } = scene.scale;
      this.timelessOverlay?.destroy();
      this.timelessOverlay = (scene as Phaser.Scene).add
        .rectangle(width / 2, height / 2, width, height, 0x888888, 0.35)
        .setDepth(6).setScrollFactor(0);
    } else {
      const wasAtMax = force || this.npcTimelessCharge >= 10000;
      this.npcTimelessCharge = Math.min(10000, this.npcTimelessCharge + this.npcBountyFloat * 1000);
      this.npcBountyFloat = 0; this.npcBountyAccum = 0;
      if (!wasAtMax || this.npcTimelessActive) return;
      this.npcTimelessActive = true;
      this.npcTimelessEnd = time + 3000;
      this.npcTimelessCharge = 0;
      npc.cooldownMult = 0.001;
      const flash = scene.add.circle(npc.x, npc.y, 50, 0xffdd44, 0.55).setDepth(12);
      scene.tweens.add({ targets: flash, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
    }
  }

  // Called from ArenaScene's damaged event listeners
  onDamageReceived(victim: 'player' | 'npc', amount: number): void {
    if (amount <= 0) return;
    // Victim = player and player is Time → enemy accrues bounty on the player
    if (victim === 'player' && this.arena.elementId === 'sand') {
      const prev = Math.floor(this.playerBountyFloat);
      this.playerBountyFloat += amount / 5.0;
      this.playerBountyAccum = this.playerBountyFloat;
      if (this.playerBountyAccum > this.playerHighestBountyEver) this.playerHighestBountyEver = this.playerBountyAccum;
      if (this.playerBountyLabel && Math.floor(this.playerBountyAccum) > prev) {
        this.arena.scene.tweens.add({ targets: this.playerBountyLabel, scaleX: 1.3, scaleY: 1.3, yoyo: true, duration: 120 });
      }
    }
    // Victim = npc and npc is Time → player accrues bounty on the npc
    if (victim === 'npc' && this.arena.npcElementId === 'sand') {
      this.npcBountyFloat += amount / 5.0;
      this.npcBountyAccum = this.npcBountyFloat;
      if (this.npcBountyAccum > this.npcHighestBountyEver) this.npcHighestBountyEver = this.npcBountyAccum;
    }
  }

  // Called from ArenaScene's applyProjectileToNpc
  onLassoHitNpc(proj: Projectile): void {
    const { npc, player, scene } = this.arena;
    npc.takeDamage(20);
    this.arena.spawnHitFlash(npc.x, npc.y, 0xffdd44);
    this.arena.recordMasteryStat('lassos', 1);
    this.arena.showFloatingText(npc.x, npc.y - 24, '20', '#ffdd44');

    if (this.arena.hasUpgrade('e') && this.npcPosHistory.length > 0) {
      // E+ Delayed Warp: save position
      const best = this.bestSnapshot(this.npcPosHistory, scene.time.now - 3000);
      this.timeWarpSavedPos = { x: best.x, y: best.y };
      this.timeWarpSavedMarker?.destroy();
      this.timeWarpSavedMarker = scene.add.graphics().setDepth(6);
      this.timeWarpSavedMarker.lineStyle(2, 0xffdd44, 0.7);
      this.timeWarpSavedMarker.strokeCircle(best.x, best.y, 14);
      this.timeWarpSavedMarker.strokeCircle(best.x, best.y, 7);
      scene.tweens.add({ targets: this.timeWarpSavedMarker, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
      this.arena.showFloatingText(player.x, player.y - 32, '⏱ Saved!', '#ffdd44');
    } else if (!this.timeNpcTeleporting && this.npcPosHistory.length > 0) {
      const best = this.bestSnapshot(this.npcPosHistory, scene.time.now - 3000);
      this.timeNpcTeleporting = true;
      this.timeNpcTeleportStart = scene.time.now;
      this.timeNpcTeleportFromX = npc.x; this.timeNpcTeleportFromY = npc.y;
      this.timeNpcTeleportToX = best.x; this.timeNpcTeleportToY = best.y;
      this.timeNpcTeleportPuddleAccum = 0;
    }

    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
    this.playerLassoRope?.clear(); this.playerLassoProj = null;
  }

  // Called from ArenaScene's player-hit overlap callback
  onLassoHitPlayer(proj: Projectile): void {
    const { player } = this.arena;
    if (!this.npcPlayerTeleporting && this.playerPosHistory.length > 0) {
      const best = this.bestSnapshot(this.playerPosHistory, this.arena.scene.time.now - 3000);
      this.npcPlayerTeleporting = true;
      this.npcPlayerTeleportStart = this.arena.scene.time.now;
      this.npcPlayerTeleportFromX = player.x; this.npcPlayerTeleportFromY = player.y;
      this.npcPlayerTeleportToX = best.x; this.npcPlayerTeleportToY = best.y;
      this.npcPlayerTeleportPuddleAccum = 0;
      this.arena.spawnHitFlash(player.x, player.y, 0xffdd44);
    }
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
    this.npcLassoRope?.clear(); this.npcLassoProj = null;
  }

  // Called from ArenaScene when proj-time-chamber hits NPC
  detonateChamber(x: number, y: number): void {
    const { scene } = this.arena;
    const ring = scene.add.circle(x, y, 12, 0xff4422, 0.9).setDepth(11);
    scene.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    this.arena.dealAoeDamageFromOwner(x, y, 40, 30, 'player');
    this.arena.showFloatingText(x, y - 20, '30 BOOM', '#ff6633');
  }

  // ── Private helpers ───────────────────────────────────────────────

  private fireRevolverShot(owner: 'player' | 'npc', tx: number, ty: number, time: number): void {
    const { scene, projectiles } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const bullet = new Projectile(scene, caster.x, caster.y, 'proj-time-bullet', 5, owner === 'player');
    projectiles.add(bullet);
    bullet.launch((dx / len) * 380, (dy / len) * 380);
    scene.time.delayedCall(2500, () => {
      if (bullet.active) { bullet.setActive(false).setVisible(false); (bullet.body as Phaser.Physics.Arcade.Body).stop(); }
    });
    const entry: RevolverBullet = { proj: bullet, spawnAt: time, baseDmg: 5, maxDmg: 12, rampMs: 2000 };
    if (owner === 'player') {
      this.playerRevolverBullets.push(entry);
      this.playerLastShotAt = time;
      this.playerAmmo--;
      if (this.playerAmmo <= 0) this.beginReload('player', time);
    } else {
      this.npcRevolverBullets.push(entry);
      this.npcLastShotAt = time;
      this.npcAmmo--;
      if (this.npcAmmo <= 0) this.beginReload('npc', time);
    }
  }

  private beginReload(owner: 'player' | 'npc', time: number): void {
    if (owner === 'player') {
      this.playerReloading = true; this.playerReloadStart = time; this.playerReloadFailed = false;
    } else { this.npcReloading = true; this.npcReloadStart = time; }
  }

  private completeReload(owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      this.playerAmmo = 6; this.playerReloading = false; this.playerReloadFailed = false;
      this.playerReloadBarBg?.destroy(); this.playerReloadBarBg = null;
      this.playerReloadBarFill?.destroy(); this.playerReloadBarFill = null;
      this.playerReloadPerfectZone?.destroy(); this.playerReloadPerfectZone = null;
      this.playerReloadIndicator?.destroy(); this.playerReloadIndicator = null;
    } else {
      this.npcAmmo = 6; this.npcReloading = false;
    }
  }

  private drawReloadBar(time: number, px: number, py: number): void {
    const barW = 50, barH = 7, barX = px - barW / 2, barY = py - 50;
    const progress = Math.min(1, (time - this.playerReloadStart) / this.playerReloadDuration);
    const { scene } = this.arena;
    const failed = this.playerReloadFailed;

    const bgColor = failed ? 0x882222 : 0x44aa44;
    const fillColor = failed ? 0xff3333 : 0x88ff88;
    if (!this.playerReloadBarBg) this.playerReloadBarBg = scene.add.rectangle(px, barY, barW, barH, bgColor, 0.85).setDepth(14);
    this.playerReloadBarBg.setFillStyle(bgColor, 0.85).setPosition(px, barY);

    if (!this.playerReloadBarFill) this.playerReloadBarFill = scene.add.rectangle(barX, barY, 0, barH, fillColor, 0.5).setDepth(15).setOrigin(0, 0.5);
    this.playerReloadBarFill.setFillStyle(fillColor, 0.5).setPosition(barX, barY).setSize(progress * barW, barH);

    if (!failed) {
      const pzStart = barX + barW * 0.45, pzW = barW * 0.1;
      if (!this.playerReloadPerfectZone) this.playerReloadPerfectZone = scene.add.rectangle(pzStart + pzW / 2, barY, pzW, barH, 0xffff00, 0.9).setDepth(16);
      this.playerReloadPerfectZone.setPosition(pzStart + pzW / 2, barY).setVisible(true);
    } else {
      this.playerReloadPerfectZone?.setVisible(false);
    }

    if (!this.playerReloadIndicator) this.playerReloadIndicator = scene.add.rectangle(0, barY, 3, barH + 2, 0xff2222, 1).setDepth(17);
    this.playerReloadIndicator.setPosition(barX + progress * barW, barY);
  }

  private isInPerfectZone(time: number): boolean {
    if (this.playerReloadFailed) return false;
    const progress = Math.min(1, (time - this.playerReloadStart) / this.playerReloadDuration);
    return progress >= 0.45 && progress <= 0.55;
  }

  private perfectReloadFire(tx: number, ty: number, time: number): void {
    const { player, scene, projectiles } = this.arena;
    const dx = tx - player.x, dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const chamber = new Projectile(scene, player.x, player.y, 'proj-time-chamber', 0, true);
    projectiles.add(chamber);
    chamber.launch((dx / len) * 300, (dy / len) * 300);
    scene.time.delayedCall(2000, () => {
      if (chamber.active) {
        this.detonateChamber(chamber.x, chamber.y);
        chamber.setActive(false).setVisible(false);
        (chamber.body as Phaser.Physics.Arcade.Body).stop();
      }
    });
    this.playerChamberSprite?.destroy(); this.playerChamberSprite = null;
    this.completeReload('player');
    this.arena.recordMasteryStat('perfectReloads', 1);
    this.arena.showFloatingText(player.x, player.y - 36, 'PERFECT!', '#ffff44');
  }

  private endBountyAura(owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      this.playerBountyAuraActive = false;
      this.playerBountyAura?.destroy(); this.playerBountyAura = null;
      if (this.arena.npc.cooldownMult > 1) this.arena.npc.cooldownMult = 1.0;
      for (const [p, v] of this.playerBountySlowedProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
      this.playerBountySlowedProjs.clear();
    } else {
      this.npcBountyAuraActive = false;
      this.npcBountyAura?.destroy(); this.npcBountyAura = null;
      if (this.arena.player.cooldownMult > 1) this.arena.player.cooldownMult = 1.0;
      for (const [p, v] of this.npcBountySlowedProjs) if (p.active) (p.body as Phaser.Physics.Arcade.Body).setVelocity(v.vx, v.vy);
      this.npcBountySlowedProjs.clear();
    }
  }

  private doBountyHunterRecast(owner: 'player' | 'npc', time: number): void {
    const { scene, npc, player } = this.arena;
    if (owner === 'player') {
      this.endBountyAura('player');
      this.npcBountyHunterSlowUntil = time + 5000;
      this.arena.showFloatingText(npc.x, npc.y - 24, '-25% slow', '#ffaa44');
      const duration = Math.max(3000, Math.floor(this.playerHighestBountyEver) * 1000);
      this.playerSpeedAuraActive = true;
      this.playerSpeedAuraEnd = time + duration;
      this.playerSpeedAura?.destroy();
      this.playerSpeedAura = scene.add.circle(player.x, player.y, 120, 0x44ffaa, 0.06)
        .setStrokeStyle(2, 0x44ffaa, 0.5).setDepth(3);
      scene.tweens.add({ targets: this.playerSpeedAura, alpha: 0.18, yoyo: true, repeat: -1, duration: 450 });
      player.cooldownMult = 0.5;
      this.playerReloadDuration = 1500;
      this.arena.showFloatingText(player.x, player.y - 40, 'BOUNTY HUNTER!', '#44ffaa');
    } else {
      this.endBountyAura('npc');
      this.playerBountyHunterSlowUntil = time + 5000;
      const duration = Math.max(3000, Math.floor(this.npcHighestBountyEver) * 1000);
      // NPC speed aura: just set cooldownMult buff duration
      npc.cooldownMult = 0.5;
      scene.time.delayedCall(duration, () => { if (npc.cooldownMult < 1) npc.cooldownMult = 1; });
    }
  }

  // ── Q+: Rifle.Reload minigame helpers ─────────────────────────────────

  private startRifleReload(time: number): void {
    this.rifleReloading = true;
    this.rifleReloadStart = time;
    this.rifleReloadBarsHit = [false, false, false];
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, 'Reloading…', '#88ffaa');
  }

  private checkRifleReloadHit(time: number): void {
    if (!this.rifleReloading) return;
    if (time - this.rifleReloadStart < 200) return;
    const progress = (time - this.rifleReloadStart) / this.rifleReloadDuration;
    const zones = [
      { start: 0.10, end: 0.25 },
      { start: 0.42, end: 0.57 },
      { start: 0.72, end: 0.87 },
    ];
    for (let i = 0; i < 3; i++) {
      if (!this.rifleReloadBarsHit[i] && progress >= zones[i].start && progress <= zones[i].end) {
        this.rifleReloadBarsHit[i] = true;
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 42, `✓ ${i + 1}/3`, '#44ff44');
        return;
      }
    }
  }

  private drawRifleReloadBar(time: number, px: number, py: number): void {
    const barW = 66, barH = 8, barX = px - barW / 2, barY = py - 55;
    const progress = Math.min(1, (time - this.rifleReloadStart) / this.rifleReloadDuration);
    const { scene } = this.arena;
    const zoneData = [
      { start: 0.10, end: 0.25 },
      { start: 0.42, end: 0.57 },
      { start: 0.72, end: 0.87 },
    ];

    if (!this.rifleReloadBarBg) {
      this.rifleReloadBarBg = scene.add.rectangle(px, barY, barW, barH, 0x335544, 0.85).setDepth(14);
    }
    this.rifleReloadBarBg.setPosition(px, barY);

    if (!this.rifleReloadBarFill) {
      this.rifleReloadBarFill = scene.add.rectangle(barX, barY, 0, barH, 0x88ffaa, 0.5).setDepth(15).setOrigin(0, 0.5);
    }
    this.rifleReloadBarFill.setPosition(barX, barY).setSize(progress * barW, barH);

    while (this.rifleReloadZones.length < 3) {
      this.rifleReloadZones.push(scene.add.rectangle(0, barY, 0, barH, 0xffff00, 0.9).setDepth(16));
    }
    for (let i = 0; i < 3; i++) {
      const z = this.rifleReloadZones[i];
      const zd = zoneData[i];
      const zX = barX + barW * zd.start;
      const zW = barW * (zd.end - zd.start);
      let color = 0xffff00;
      if (this.rifleReloadBarsHit[i]) color = 0x44ff44;
      else if (progress > zd.end) color = 0xff3333;
      z.setFillStyle(color, 0.9).setPosition(zX + zW / 2, barY).setSize(zW, barH);
    }

    if (!this.rifleReloadIndicator) {
      this.rifleReloadIndicator = scene.add.rectangle(0, barY, 3, barH + 2, 0xff2222, 1).setDepth(17);
    }
    this.rifleReloadIndicator.setPosition(barX + progress * barW, barY);
  }

  private destroyRifleReloadBar(): void {
    this.rifleReloadBarBg?.destroy(); this.rifleReloadBarBg = null;
    this.rifleReloadBarFill?.destroy(); this.rifleReloadBarFill = null;
    for (const z of this.rifleReloadZones) z.destroy();
    this.rifleReloadZones = [];
    this.rifleReloadIndicator?.destroy(); this.rifleReloadIndicator = null;
  }

  private completeRifleReload(success: boolean): void {
    this.rifleReloading = false;
    this.destroyRifleReloadBar();
    if (success) {
      this.rifleShotsRemaining = 3;
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, 'RELOADED! ×3', '#ffdd44');
    } else {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, 'RELOAD FAILED', '#ff4444');
    }
  }

  private fireRifle(tx: number, ty: number, time: number): void {
    if (this.rifleShotsRemaining <= 0) return;
    this.rifleShotsRemaining--;
    const { player, npc, scene } = this.arena;
    const dx = tx - player.x, dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const endX = player.x + (dx / len) * 900, endY = player.y + (dy / len) * 900;
    const gfx = scene.add.graphics().setDepth(8);
    gfx.lineStyle(4, 0xff4444, 0.9);
    gfx.beginPath(); gfx.moveTo(player.x, player.y); gfx.lineTo(endX, endY); gfx.strokePath();
    const coreGfx = scene.add.graphics().setDepth(9);
    coreGfx.lineStyle(2, 0xffffff, 0.8);
    coreGfx.beginPath(); coreGfx.moveTo(player.x, player.y); coreGfx.lineTo(endX, endY); coreGfx.strokePath();
    this.rifleBeams.push({ fromX: player.x, fromY: player.y, toX: endX, toY: endY, npcFrozenX: npc.x, npcFrozenY: npc.y, damage: 25, gfx, coreGfx });
    if (this.rifleShotsRemaining === 0 && this.arena.hasUpgrade('q')) {
      this.startRifleReload(scene.time.now);
    } else {
      this.arena.showFloatingText(player.x, player.y - 24, `${this.rifleShotsRemaining} shot${this.rifleShotsRemaining !== 1 ? 's' : ''} left`, '#ff8888');
    }
  }

  private resolveRifleBeams(): void {
    const { npc, scene } = this.arena;
    for (const beam of this.rifleBeams) {
      if (ptSegDist(npc.x, npc.y, beam.fromX, beam.fromY, beam.toX, beam.toY) <= 30) {
        npc.takeDamage(beam.damage);
        this.arena.spawnHitFlash(npc.x, npc.y, 0xff4444);
        this.arena.recordMasteryStat('rifleHits', 1);
      }
      scene.tweens.add({ targets: [beam.gfx, beam.coreGfx], alpha: 0, duration: 350, onComplete: () => { beam.gfx.destroy(); beam.coreGfx.destroy(); } });
    }
    this.rifleBeams = [];
  }

  private spawnTimePuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const spr = scene.add.circle(x, y, 28, 0xffdd44, 0.32).setDepth(2).setStrokeStyle(2, 0xffffaa, 0.5);
    scene.tweens.add({ targets: spr, alpha: 0.14, yoyo: true, repeat: -1, duration: 900 });
    this.timePuddles.push({ sprite: spr, expiresAt: scene.time.now + 5000, x, y, radius: 28, owner });
  }

  private bestSnapshot(history: PosSnapshot[], targetT: number): PosSnapshot {
    let best = history[0];
    for (const s of history) if (Math.abs(s.t - targetT) < Math.abs(best.t - targetT)) best = s;
    return best;
  }

  // ── Mastery — Passive Manipulation (focus / rush) ─────────────────────

  getTimeMode(): 'rush' | 'focus' { return this.timeMode; }

  private switchTimeMode(time: number): void {
    if (time - this.lastModeSwitchAt < MODE_SWITCH_CD_MS) return;
    this.lastModeSwitchAt = time;
    this.timeMode = this.timeMode === 'rush' ? 'focus' : 'rush';
    const rush = this.timeMode === 'rush';
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 44,
      rush ? '⏩ RUSH' : '⏪ FOCUS', rush ? '#ff8844' : '#44aaff');
  }

  private updatePassiveManipulation(): void {
    const scene = this.arena.scene as Phaser.Scene & {
      physics: Phaser.Physics.Arcade.ArcadePhysics; tweens: Phaser.Tweens.TweenManager;
    };
    if (!this.arena.masteryActive) {
      if (this.timeScaleApplied) this.restoreTimeScale();
      return;
    }
    const factor = this.timeMode === 'rush' ? RUSH_FACTOR : FOCUS_FACTOR;
    // Scale motion (bodies + projectiles) and visual tweens only. We deliberately do NOT
    // scale scene.time — kits mix loop-time and scene.time.now assuming they match, so
    // warping the Clock would drift ramps/expiries codebase-wide.
    // Arcade world.timeScale is a divisor (2 = half speed), so invert the factor.
    if (scene.physics?.world) scene.physics.world.timeScale = 1 / factor;
    scene.tweens.timeScale = factor;
    this.timeScaleApplied = true;
  }

  // ── Mastery — Fan the Hammer ──────────────────────────────────────────

  private fanSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'fan-the-hammer') return s;
    }
    return null;
  }

  getFanCooldownRatio(time: number): number {
    // While bullets are live the slot is "ready to detonate" — show it full.
    if (this.fanBullets.some(b => b.owner === 'player')) return 1;
    return Math.min(1, (time - this.fanLastCastAt) / FAN_COOLDOWN_MS);
  }

  private tryCastFan(time: number, mouseX: number, mouseY: number): void {
    const { player } = this.arena;
    // Re-cast while your bullets hang in the air → detonate them all.
    if (this.fanBullets.some(b => b.owner === 'player')) { this.detonateFan('player'); return; }
    if (time - this.fanLastCastAt < FAN_COOLDOWN_MS) return;
    const ammo = this.playerAmmo;
    if (ammo <= 0) { this.arena.showFloatingText(player.x, player.y - 30, 'NO AMMO', '#ff6666'); return; }
    this.fanLastCastAt = time;
    this.startFan('player', ammo, mouseX, mouseY, time);
    this.playerAmmo = 0;
    this.beginReload('player', time);
  }

  /** Online replay: the remote time player fanned (or re-cast to detonate). */
  doNpcFanTheHammer(tx: number, ty: number): void {
    if (this.fanBullets.some(b => b.owner === 'npc')) { this.detonateFan('npc'); return; }
    this.startFan('npc', 6, tx, ty, this.arena.scene.time.now);
  }

  private startFan(owner: 'player' | 'npc', ammo: number, aimX: number, aimY: number, time: number): void {
    const { scene, projectiles } = this.arena;
    const origin = owner === 'player' ? this.arena.player : this.arena.npc;
    if (owner === 'player') this.fanningUntil = time + ammo * FAN_STAGGER_MS;
    this.arena.showFloatingText(origin.x, origin.y - 40, '🔫 FAN THE HAMMER', '#ffcc44');
    const baseAng = Math.atan2(aimY - origin.y, aimX - origin.x);
    for (let i = 0; i < ammo; i++) {
      scene.time.delayedCall(i * FAN_STAGGER_MS, () => {
        const caster = owner === 'player' ? this.arena.player : this.arena.npc;
        if (!caster.active || caster.hp <= 0) return;
        const ang = baseAng + Phaser.Math.FloatBetween(-0.28, 0.28);
        const bullet = new Projectile(scene, caster.x, caster.y, 'proj-time-bullet', 5, owner === 'player');
        projectiles.add(bullet);
        const vx = Math.cos(ang) * FAN_BULLET_SPEED, vy = Math.sin(ang) * FAN_BULLET_SPEED;
        bullet.launch(vx, vy);
        this.fanBullets.push({ proj: bullet, owner, spawnAt: scene.time.now, baseDmg: 5, maxDmg: 14, rampMs: 2500, vx, vy, halted: false, puddleAccum: 0 });
      });
    }
  }

  private updateFanBullets(time: number, delta: number): void {
    if (this.fanBullets.length === 0) return;
    const { npc, player } = this.arena;
    for (let i = this.fanBullets.length - 1; i >= 0; i--) {
      const b = this.fanBullets[i];
      if (!b.proj.active) { this.fanBullets.splice(i, 1); continue; }
      const body = b.proj.body as Phaser.Physics.Arcade.Body;
      if (!b.halted) {
        b.vx *= 0.9; b.vy *= 0.9;
        body.setVelocity(b.vx, b.vy);
        if (Math.hypot(b.vx, b.vy) < FAN_HALT_SPEED) { b.halted = true; b.vx = 0; b.vy = 0; body.setVelocity(0, 0); }
      }
      // Bullets "age" like the revolver's — damage ramps up the longer they sit.
      const t = clamp01((time - b.spawnAt) / b.rampMs);
      const dmg = Math.round(b.baseDmg + (b.maxDmg - b.baseDmg) * t);
      (b.proj as unknown as { damage: number }).damage = dmg;
      b.proj.setTint(Phaser.Display.Color.GetColor(0xff, lerpN(0xdd, 0x22, t), lerpN(0x44, 0x11, t)));
      // Halted bullets occasionally leak a time puddle. (Enemy contact is resolved by the
      // standard projectile overlap, which consumes the bullet and applies its aged damage.)
      if (b.halted) {
        void npc; void player;
        b.puddleAccum += delta;
        if (b.puddleAccum >= 1000) {
          b.puddleAccum -= 1000;
          if (Math.random() < FAN_PUDDLE_CHANCE_PER_SEC) this.spawnTimePuddle(b.proj.x, b.proj.y, b.owner);
        }
      }
    }
  }

  private detonateFan(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const origin = owner === 'player' ? this.arena.player : this.arena.npc;
    for (const b of this.fanBullets) {
      if (b.owner !== owner || !b.proj.active) continue;
      const t = clamp01((scene.time.now - b.spawnAt) / b.rampMs);
      const dmg = Math.round(b.baseDmg + (b.maxDmg - b.baseDmg) * t);
      this.arena.dealAoeDamageFromOwner(b.proj.x, b.proj.y, FAN_DETONATE_RADIUS, dmg, owner);
      const ring = scene.add.circle(b.proj.x, b.proj.y, 12, 0xff5522, 0.85).setDepth(9);
      scene.tweens.add({ targets: ring, scaleX: FAN_DETONATE_RADIUS / 12, scaleY: FAN_DETONATE_RADIUS / 12, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
      b.proj.destroy();
    }
    this.fanBullets = this.fanBullets.filter(b => b.owner !== owner);
    this.arena.showFloatingText(origin.x, origin.y - 40, '💥 DETONATE!', '#ff6633');
  }
}
