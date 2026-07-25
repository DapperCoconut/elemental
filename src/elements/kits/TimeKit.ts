import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { CustomStatus } from './StatusHudKit';
import {
  FROZEN_TONES, HEAT_TONES, MINT_TONES, NOON_TONES, NPC_TONES, TIME, TimeAvatar, TimeColorFn,
  TimeDial, TimeFx, TimeTones, tonesFor,
} from './TimeVisuals';

/**
 * Every time ability — the player's and the NPC's alike — is cast through this kit, so each one
 * drives its own arm gesture right where it fires. That covers the local player, the AI opponent
 * and an online peer's replayed casts from one place, which is why this kit has no separate
 * npc-cast-id gesture table.
 */

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
  /** Repainted every frame — a sundial pressed into the ground with its shadow sweeping. */
  sprite: Phaser.GameObjects.Graphics;
  expiresAt: number; x: number; y: number; radius: number;
  owner: 'player' | 'npc';
  /** Own clock, so neighbouring dials aren't in lockstep. */
  t: number;
  /** Total lifetime, so the face can fade over its own span. */
  lifeMs: number;
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
  /** Aim point the player's rig faces — ArenaScene already tracks the cursor. */
  readonly aimX: number;
  readonly aimY: number;
  hasUpgrade(slot: string): boolean;
  /** Cosmetics: maps a time visual color through the owner's color cosmetic. */
  sandColor(owner: 'player' | 'npc', base: number): number;
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
  /** Online: tell the peer's sim a bindable mastery ability just fired here. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  /** Show/clear an element-specific effect in the top-right status tray (player-side only). */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

// ── Mastery: Passive Manipulation (focus/rush) ────────────────────────────────
const RUSH_FACTOR = 1.5;   // rush: the world runs 1.5x faster
const FOCUS_FACTOR = 0.5;  // focus: the world runs at half speed
const MODE_SWITCH_CD_MS = 5000;

// ── Mastery: Time Bomb ────────────────────────────────────────────────────────
const BOMB_SPEED = 430;
const BOMB_RANGE = 560;          // dies unspent if it gets this far without landing
const BOMB_STICK_RADIUS = 26;
const BOMB_BODY_RADIUS = 13;
const BOMB_BASE_DMG = 10;
const BOMB_MAX_DMG = 50;
const BOMB_RAMP_MS = 30000;      // base → max as it ripens on the victim
const BOMB_AOE_RADIUS = 72;
const BOMB_ARM_MS = 1400;        // how long the white ring takes to close in
const BOMB_RING_START_R = 130;
/** How close the ring has to be to the casing for a re-cast to count as on the beat. */
const BOMB_PERFECT_TOL = 12;
const BOMB_PERFECT_MULT = 1.5;
const BOMB_COOLDOWN_MS = 14000;

interface TimeBomb {
  owner: 'player' | 'npc';
  /** `flight` → still travelling, `stuck` → riding the victim, `armed` → ring closing in. */
  phase: 'flight' | 'stuck' | 'armed';
  gfx: Phaser.GameObjects.Graphics;
  ringGfx: Phaser.GameObjects.Graphics | null;
  x: number; y: number;
  vx: number; vy: number;
  travelled: number;
  /** When it landed — the damage ramp runs from here. */
  stuckAt: number;
  armedAt: number;
  /** Where on the victim's body it landed, so it rides a shoulder rather than dead centre. */
  ox: number; oy: number;
  /** Own clock for the face and the tick beat. */
  t: number;
  tickAccum: number;
}

// ── TimeKit ───────────────────────────────────────────────────────────────────

export class TimeKit {
  // ── Visuals ───────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a colour cosmetic recolours one side. */
  private readonly pcol: TimeColorFn;
  private readonly ncol: TimeColorFn;
  private readonly pfx: TimeFx;
  private readonly nfx: TimeFx;
  /** The gunslinger rig (brass fists, eyes, wide-brim hat) for each time fighter. */
  private playerAvatar: TimeAvatar | null = null;
  private npcAvatar: TimeAvatar | null = null;

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
  /** Repainted every frame — the revolver cylinder swung out, chambers filling as it reloads. */
  private playerChamberSprite: Phaser.GameObjects.Graphics | null = null;
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
  private npcChamberSprite: Phaser.GameObjects.Graphics | null = null;
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
  private timeRemainAura: TimeDial | null = null;
  private timeRemainPurgeUsed = false;
  // R+ Frozen Field
  private timeFrozenFieldActive = false;
  private timeFrozenFieldEnd = 0;
  private timeFrozenFieldAura: TimeDial | null = null;
  private timeFrozenFieldProjs: Map<Projectile, { vx: number; vy: number }> = new Map();

  // ── Remain (R) — NPC ──────────────────────────────────────────────
  private npcRemainActive = false;
  private npcRemainEnd = 0;
  private npcRemainAbsorbed = 0;
  private npcRemainAura: TimeDial | null = null;

  // ── Bounty (F) — player side ──────────────────────────────────────
  private playerBountyFloat = 0;         // fractional accumulator
  private playerBountyAccum = 0;         // synced floor(float)
  private playerHighestBountyEver = 0;
  private playerBountyLabel: Phaser.GameObjects.Text | null = null;
  private playerBountyAuraActive = false;
  private playerBountyAuraEnd = 0;
  /** Cast timestamp, so the dial can show what fraction of the sentence is left. */
  private playerBountyAuraStart = 0;
  private playerBountyAura: TimeDial | null = null;
  private playerBountySlowedProjs: Map<Projectile, { vx: number; vy: number }> = new Map();
  // F+ Bounty Hunter player speed aura
  private playerSpeedAuraActive = false;
  private playerSpeedAuraEnd = 0;
  private playerSpeedAuraStart = 0;
  private playerSpeedAura: TimeDial | null = null;
  private playerSpeedAuraSpedProjs: Map<Projectile, { vx: number; vy: number }> = new Map();
  private npcBountyHunterSlowUntil = 0;

  // ── Bounty (F) — NPC side ─────────────────────────────────────────
  private npcBountyFloat = 0;
  private npcBountyAccum = 0;
  private npcHighestBountyEver = 0;
  private npcBountyLabel: Phaser.GameObjects.Text | null = null;
  private npcBountyAuraActive = false;
  private npcBountyAuraEnd = 0;
  private npcBountyAuraStart = 0;
  private npcBountyAura: TimeDial | null = null;
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

  // ── Mastery: Passive Manipulation + Time Bomb ─────────────────────────
  private timeMode: 'rush' | 'focus' = 'focus';
  private lastModeSwitchAt = -MODE_SWITCH_CD_MS;
  private prevSpaceDown = false;
  private timeScaleApplied = false;
  /** One bomb per side at a time — a second cast is always an arm or a detonation. */
  private bombs: { player: TimeBomb | null; npc: TimeBomb | null } = { player: null, npc: null };
  private bombLastCastAt = -BOMB_COOLDOWN_MS;

  constructor(private arena: TimeArenaApi) {
    this.pcol = (base) => arena.sandColor('player', base);
    this.ncol = (base) => arena.sandColor('npc', base);
    this.pfx = new TimeFx(arena.scene, this.pcol);
    this.nfx = new TimeFx(arena.scene, this.ncol);
  }

  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): TimeColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): TimeFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Character rig for a side, if that side is time this match. */
  private avatar(owner: 'player' | 'npc'): TimeAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

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

    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }

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

    // Mastery — Passive Manipulation + Time Bomb
    this.timeMode = 'focus';
    this.lastModeSwitchAt = -MODE_SWITCH_CD_MS;
    this.prevSpaceDown = false;
    this.restoreTimeScale();
    for (const owner of ['player', 'npc'] as const) this.discardBomb(owner);
    this.bombLastCastAt = -BOMB_COOLDOWN_MS;
    this.arena.setStatusIndicator('time-bomb', null);
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
    const bombSlot = this.arena.masteryActive ? this.bombSlot() : null;
    const spaceDown = this.arena.spaceKey.isDown;
    if (this.arena.masteryActive && spaceDown && !this.prevSpaceDown) this.switchTimeMode(time);
    this.prevSpaceDown = spaceDown;
    // Time Bomb takes over its bound slot (throw, arm, then detonate).
    if (bombSlot && Phaser.Input.Keyboard.JustDown(this.keyFor(bombSlot))) this.tryCastBomb(time, mouseX, mouseY);
    /** True when this slot still belongs to Time's own ability rather than the mastery one. */
    const own = (slot: 'e' | 'r' | 'f' | 'q'): boolean => bombSlot !== slot;

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
    if (own('e') && Phaser.Input.Keyboard.JustDown(this.arena.eKey)) this.castLasso(mouseX, mouseY, playerCtx);
    // R: Remain (or Purge recast while active)
    if (own('r') && Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      if (this.timeRemainActive && this.arena.hasPerk('player', 'purge') && !this.timeRemainPurgeUsed) {
        // Purge recast: extend duration 3s, turn the dial red, lock for rest of match
        this.timeRemainEnd += 3000;
        this.timeRemainAura?.setTones(HEAT_TONES);
        this.playerAvatar?.play('flex');
        this.pfx.ring(this.arena.player.x, this.arena.player.y, 12, 76, TIME.heat, 460, 4, 5);
        this.timeRemainPurgeUsed = true;
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '⏳ PURGE — locked', '#ff4444');
      } else if (!this.timeRemainPurgeUsed) {
        this.arena.player.castAbility('time-remain', playerCtx);
      }
    }
    // F: Bounty / Bounty Hunter recast
    if (own('f') && Phaser.Input.Keyboard.JustDown(this.arena.fKey)) this.castBountyOrRecast(time, playerCtx);
    // Q: Always Noon
    if (own('q') && Phaser.Input.Keyboard.JustDown(this.arena.qKey)) this.doTimeAlwaysNoon('player');
  }

  private keyFor(slot: 'e' | 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'e' ? this.arena.eKey
      : slot === 'r' ? this.arena.rKey
        : slot === 'f' ? this.arena.fKey : this.arena.qKey;
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
    this.updateAvatars(delta, isPlayer, isNpc);

    // Position snapshot every 100ms
    this.posHistoryAccum += delta;
    while (this.posHistoryAccum >= 100) {
      this.posHistoryAccum -= 100;
      this.npcPosHistory.push({ x: this.arena.npc.x, y: this.arena.npc.y, t: time });
      this.playerPosHistory.push({ x: this.arena.player.x, y: this.arena.player.y, t: time });
      while (this.npcPosHistory.length > 40) this.npcPosHistory.shift();
      while (this.playerPosHistory.length > 40) this.playerPosHistory.shift();
    }

    // Mastery — Passive Manipulation time-scale + Time Bombs (both owners).
    this.updatePassiveManipulation();
    this.updateTimeBombs(time, delta);

    if (isPlayer) {
      this.updatePlayerRevolver(time, delta);
      this.updateBulletRamp(this.playerRevolverBullets, time);
      this.updatePlayerLasso(time, delta);
      this.updatePlayerRemain(time, delta);
      this.updateFrozenField(time, delta);
      this.updatePlayerBountyAura(time, delta);
      this.updatePlayerSpeedAura(time, delta);
      this.updateTimeless(time, delta);
      this.updateTimelessCharge(time, delta);
    }

    if (isNpc) {
      this.updateNpcRevolver(time, delta);
      this.updateBulletRamp(this.npcRevolverBullets, time);
      this.updateNpcLasso(time, delta);
      this.updateNpcRemain(time, delta);
      this.updateNpcBountyAura(time, delta);
      this.updateNpcTimeless(time, delta);
    }

    // Puddle expiry, and the sundial face each one wears.
    for (let i = this.timePuddles.length - 1; i >= 0; i--) {
      const p = this.timePuddles[i];
      if (time >= p.expiresAt) { p.sprite.destroy(); this.timePuddles.splice(i, 1); continue; }
      p.t += delta / 1000;
      const life = Phaser.Math.Clamp((p.expiresAt - time) / p.lifeMs, 0, 1);
      p.sprite.clear();
      TimeFx.drawPuddle(p.sprite, this.col(p.owner), tonesFor(p.owner), p.x, p.y, p.radius, p.t, 0.4 + life * 0.6);
    }
  }

  // ── Character rig ─────────────────────────────────────────────────

  /**
   * Builds (on first frame) and drives the gunslinger avatar for whichever fighters are time.
   * The player faces the cursor; the NPC faces whoever it is fighting. The mastery passive's
   * focus/rush mode is fed straight into the rig, so which way your clock is running is legible
   * off the character rather than off a floating label that has already faded.
   */
  private updateAvatars(delta: number, isPlayer: boolean, isNpc: boolean): void {
    const { scene, player, npc } = this.arena;

    if (isPlayer && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new TimeAvatar(scene, this.pcol, NOON_TONES);
      const av = this.playerAvatar;
      av.setFacing(Math.atan2(this.arena.aimY - player.y, this.arena.aimX - player.x));
      av.setMode(this.arena.masteryActive ? this.timeMode : null);
      av.setFrozen(this.timelessActive);
      av.setIntensity(this.timelessActive ? 1.4 : this.playerSpeedAuraActive ? 1.25 : 1);
      av.setMastered(this.arena.masteryActive);
      av.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpc && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new TimeAvatar(scene, this.ncol, NPC_TONES);
      const av = this.npcAvatar;
      av.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      av.setFrozen(this.npcTimelessActive);
      av.setIntensity(this.npcTimelessActive ? 1.35 : 1);
      av.setMastered(this.arena.npcMasteryActive);
      av.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
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
    // The cylinder swung out beside the hand, chambers filling as the reload runs.
    if (!this.playerChamberSprite) this.playerChamberSprite = scene.add.graphics().setDepth(13);
    this.playerChamberAngle += delta * 0.006;
    const cR = 22;
    const cx = player.x + Math.cos(this.playerChamberAngle) * cR;
    const cy = player.y + Math.sin(this.playerChamberAngle) * cR;
    this.playerChamberSprite.clear();
    TimeFx.drawCylinder(this.playerChamberSprite, this.pcol, NOON_TONES, cx, cy, 9,
      this.playerChamberAngle * 2, Math.floor(progress * 6));
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
      TimeFx.drawRope(this.playerLassoRope, this.pcol, NOON_TONES,
        player.x, player.y, this.playerLassoProj.x, this.playerLassoProj.y, time / 1000, true);
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
      TimeFx.drawRope(this.playerDragRope, this.pcol, NOON_TONES, player.x, player.y, nx, ny, time / 1000, false);
      if (progress >= 1) {
        this.timeNpcTeleporting = false;
        this.playerDragRope.destroy(); this.playerDragRope = null;
      }
    } else {
      this.playerDragRope?.clear();
    }
  }

  private updatePlayerRemain(time: number, delta: number): void {
    const { player } = this.arena;
    // The dial counts the 3s down on the caster's body, so the window is readable at a glance.
    this.timeRemainAura?.update(delta, player.x, player.y,
      Phaser.Math.Clamp((this.timeRemainEnd - time) / 3000, 0, 1), player.alpha);
    if (this.timeRemainActive && time >= this.timeRemainEnd) {
      this.timeRemainActive = false;
      player.damageAbsorber = null;
      this.timeRemainAura?.destroy(); this.timeRemainAura = null;
      if (!this.timeRemainPurgeUsed) {
        const dmg = Math.round(this.timeRemainAbsorbed * 0.8);
        if (dmg > 0) {
          player.takeDamage(dmg);
          // Everything it swallowed comes back out at once.
          this.pfx.detonate(player.x, player.y, 46 + Math.min(70, dmg), {
            tones: HEAT_TONES, shells: 4, smoke: 2, duration: 460, burn: false,
          });
        }
      }
      this.timeRemainAbsorbed = 0;
    }
  }

  private updateFrozenField(time: number, delta: number): void {
    const { player, projectiles } = this.arena;
    if (!this.timeFrozenFieldActive) return;
    this.timeFrozenFieldAura?.update(delta, player.x, player.y,
      Phaser.Math.Clamp((this.timeFrozenFieldEnd - time) / 3000, 0, 1), player.alpha);
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

  private updatePlayerBountyAura(time: number, delta: number): void {
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
    // The bounty dial rides the marked fighter and counts their sentence down.
    this.playerBountyAura?.update(delta, npc.x, npc.y,
      Phaser.Math.Clamp((this.playerBountyAuraEnd - time) / Math.max(1, this.playerBountyAuraEnd - this.playerBountyAuraStart), 0, 1), npc.alpha);
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

  private updatePlayerSpeedAura(time: number, delta: number): void {
    const { player, projectiles } = this.arena;
    if (!this.playerSpeedAuraActive) return;
    this.playerSpeedAura?.update(delta, player.x, player.y,
      Phaser.Math.Clamp((this.playerSpeedAuraEnd - time) / Math.max(1, this.playerSpeedAuraEnd - this.playerSpeedAuraStart), 0, 1), player.alpha);
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
      if (!this.npcChamberSprite) this.npcChamberSprite = scene.add.graphics().setDepth(13);
      this.npcChamberAngle += delta * 0.006;
      this.npcChamberSprite.clear();
      TimeFx.drawCylinder(this.npcChamberSprite, this.ncol, NPC_TONES,
        npc.x + Math.cos(this.npcChamberAngle) * 22, npc.y + Math.sin(this.npcChamberAngle) * 22,
        9, this.npcChamberAngle * 2, Math.floor(progress * 6));
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
      TimeFx.drawRope(this.npcLassoRope, this.ncol, NPC_TONES,
        npc.x, npc.y, this.npcLassoProj.x, this.npcLassoProj.y, time / 1000, true);
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
      TimeFx.drawRope(this.npcDragRope, this.ncol, NPC_TONES, npc.x, npc.y, px, py, time / 1000, false);
      if (progress >= 1) {
        this.npcPlayerTeleporting = false;
        this.npcDragRope.destroy(); this.npcDragRope = null;
      }
    } else {
      this.npcDragRope?.clear();
    }
  }

  private updateNpcRemain(time: number, delta: number): void {
    const { npc } = this.arena;
    this.npcRemainAura?.update(delta, npc.x, npc.y,
      Phaser.Math.Clamp((this.npcRemainEnd - time) / 3000, 0, 1), npc.alpha);
    if (this.npcRemainActive && time >= this.npcRemainEnd) {
      this.npcRemainActive = false;
      npc.damageAbsorber = null;
      this.npcRemainAura?.destroy(); this.npcRemainAura = null;
      const dmg = Math.round(this.npcRemainAbsorbed * 0.8);
      if (dmg > 0) npc.takeDamage(dmg);
      this.npcRemainAbsorbed = 0;
    }
  }

  private updateNpcBountyAura(time: number, delta: number): void {
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
    this.npcBountyAura?.update(delta, player.x, player.y,
      Phaser.Math.Clamp((this.npcBountyAuraEnd - time) / Math.max(1, this.npcBountyAuraEnd - this.npcBountyAuraStart), 0, 1), player.alpha);
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
    // The throw: an overhand cast, and the rope leaving the hand.
    this.avatar(owner)?.play('sweep', Math.atan2(dy, dx));
    this.fx(owner).bloom(caster.x, caster.y, 22, 7, 5, tonesFor(owner));
  }

  doTimeRemain(owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    const fighter = owner === 'player' ? player : npc;
    if (owner === 'player') {
      this.timeRemainActive = true;
      this.timeRemainEnd = scene.time.now + 3000;
      this.timeRemainAbsorbed = 0;
      this.timeRemainAura?.destroy();
      this.timeRemainAura = new TimeDial(scene, this.pcol, NOON_TONES, 40, 4);
      // Arms slammed together in front: the guard that swallows the next three seconds.
      this.avatar('player')?.play('clap');
      this.pfx.bloom(fighter.x, fighter.y, 40, 10, 5, NOON_TONES);
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
        this.timeFrozenFieldAura = new TimeDial(scene, this.pcol, FROZEN_TONES, 60, 3, false);
        this.pfx.ring(fighter.x, fighter.y, 8, 60, TIME.frost, 420, 3.5, 4);
      }
    } else {
      this.npcRemainActive = true;
      this.npcRemainEnd = scene.time.now + 3000;
      this.npcRemainAbsorbed = 0;
      this.npcRemainAura?.destroy();
      this.npcRemainAura = new TimeDial(scene, this.ncol, NPC_TONES, 40, 4);
      this.avatar('npc')?.play('clap');
      this.nfx.bloom(fighter.x, fighter.y, 40, 10, 5, NPC_TONES);
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
      this.playerBountyAura = new TimeDial(scene, this.pcol, NOON_TONES, 120, 3, false);
      this.playerBountyAuraStart = scene.time.now;
      target.cooldownMult = 2.0;
      // The warrant landing on them: a dial slamming shut around the mark.
      this.avatar('player')?.play('punch', Math.atan2(target.y - player.y, target.x - player.x));
      this.pfx.bloom(target.x, target.y, 60, 12, 6, NOON_TONES);
      this.pfx.ring(target.x, target.y, 20, 120, TIME.gold, 480, 4.5, 6);
      this.arena.showFloatingText(player.x, player.y - 36, 'BOUNTY!', '#ffdd44');
      // Bounty is spent on cast; reset after
      this.playerBountyFloat = 0; this.playerBountyAccum = 0;
    } else {
      this.npcBountyAuraActive = true;
      this.npcBountyAuraEnd = scene.time.now + durationMs;
      this.npcBountySlowedProjs.clear();
      this.npcBountyAura?.destroy();
      this.npcBountyAura = new TimeDial(scene, this.ncol, NPC_TONES, 120, 3, false);
      this.npcBountyAuraStart = scene.time.now;
      target.cooldownMult = 2.0;
      this.avatar('npc')?.play('punch');
      this.nfx.bloom(target.x, target.y, 60, 12, 6, NPC_TONES);
      this.nfx.ring(target.x, target.y, 20, 120, TIME.gold, 480, 4.5, 6);
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
      // The sun stopping overhead: the dial sweeps out, then locks.
      this.avatar('player')?.play('raise');
      this.pfx.sunstop(player.x, player.y, 150, 12, NOON_TONES);
      scene.cameras.main.shake(260, 0.005);
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
      this.avatar('npc')?.play('raise');
      this.nfx.sunstop(npc.x, npc.y, 130, 12, NPC_TONES);
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

    this.pfx.detonate(npc.x, npc.y, 40, { tones: NOON_TONES, shells: 2, smoke: 1, duration: 320, burn: false });
    if (this.arena.hasUpgrade('e') && this.npcPosHistory.length > 0) {
      // E+ Delayed Warp: save position
      const best = this.bestSnapshot(this.npcPosHistory, scene.time.now - 3000);
      this.timeWarpSavedPos = { x: best.x, y: best.y };
      this.timeWarpSavedMarker?.destroy();
      this.timeWarpSavedMarker = scene.add.graphics().setDepth(6);
      // A dial pinned to the moment you saved, so the mark is unmistakably a *time*.
      TimeFx.drawDial(this.timeWarpSavedMarker, this.pcol, NOON_TONES, best.x, best.y, 18, 0, 1, 0.85);
      scene.tweens.add({ targets: this.timeWarpSavedMarker, alpha: 0.35, yoyo: true, repeat: -1, duration: 600 });
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
    this.pfx.detonate(x, y, 48, { tones: HEAT_TONES, shells: 5, smoke: 2, duration: 460 });
    this.arena.scene.cameras.main.shake(160, 0.005);
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
    // Recoil at the barrel, brass out the side.
    const ang = Math.atan2(dy, dx);
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).muzzleFire(caster.x + Math.cos(ang) * 18, caster.y + Math.sin(ang) * 18, ang, 1, 9, HEAT_TONES);
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
    // A perfect reload flings the whole loaded cylinder downrange.
    this.avatar('player')?.play('slam', Math.atan2(dy, dx));
    this.pfx.muzzleFire(player.x, player.y, Math.atan2(dy, dx), 1.3, 9, NOON_TONES);
    this.pfx.ring(player.x, player.y, 8, 54, TIME.noon, 380, 3.5, 8);
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
      this.playerSpeedAura = new TimeDial(scene, this.pcol, MINT_TONES, 120, 3, false);
      this.playerSpeedAuraStart = time;
      this.avatar('player')?.play('flex');
      this.pfx.bloom(player.x, player.y, 52, 10, 5, MINT_TONES);
      this.pfx.ring(player.x, player.y, 14, 120, TIME.mint, 460, 4, 5);
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
    // Time is stopped, so the shot hangs in the air until it resumes: a held beam with the
    // dust it knocked loose still sitting in the channel.
    const gfx = scene.add.graphics().setDepth(8);
    TimeFx.drawBeam(gfx, this.pcol, FROZEN_TONES, player.x, player.y, endX, endY, 0, 1);
    const coreGfx = scene.add.graphics().setDepth(9);
    TimeFx.drawBeam(coreGfx, this.pcol, HEAT_TONES, player.x, player.y, endX, endY, 0, 0.5);
    this.pfx.muzzleFire(player.x, player.y, Math.atan2(dy, dx), 1.5, 10, FROZEN_TONES);
    this.avatar('player')?.play('punch', Math.atan2(dy, dx));
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
        // Time resumes and the round arrives all at once.
        this.pfx.detonate(npc.x, npc.y, 54, { tones: HEAT_TONES, shells: 3, smoke: 2, duration: 420, burn: false });
        this.arena.recordMasteryStat('rifleHits', 1);
      }
      scene.tweens.add({ targets: [beam.gfx, beam.coreGfx], alpha: 0, duration: 350, onComplete: () => { beam.gfx.destroy(); beam.coreGfx.destroy(); } });
    }
    this.rifleBeams = [];
  }

  private spawnTimePuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    this.timePuddles.push({
      sprite: scene.add.graphics().setDepth(2),
      expiresAt: scene.time.now + 5000, x, y, radius: 28, owner,
      t: Math.random() * 10, lifeMs: 5000,
    });
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
    const { player } = this.arena;
    // The rig carries the mode from here on; this is just the moment it flips over.
    this.playerAvatar?.play('flex');
    this.pfx.bloom(player.x, player.y, 34, 8, 5, rush ? HEAT_TONES : FROZEN_TONES);
    this.pfx.ring(player.x, player.y, 10, 70, rush ? TIME.powder : TIME.frost, 420, 4, 5);
    this.arena.showFloatingText(player.x, player.y - 44,
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

  // ── Mastery — Time Bomb ───────────────────────────────────────────────
  //
  // Three presses, one key. Throw it, arm it, then land the third press on the beat as the
  // white ring closes onto the casing for 1.5x. The bomb itself is happy to be forgotten —
  // its damage climbs from 10 to 50 over 30 seconds and the cooldown runs from the throw, so
  // the real decision is how long you dare leave it on someone.

  private bombSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'time-bomb') return s;
    }
    return null;
  }

  getBombCooldownRatio(time: number): number {
    // A live bomb means the slot is armed for the next press, so the bar reads full.
    if (this.bombs.player) return 1;
    return Math.min(1, (time - this.bombLastCastAt) / BOMB_COOLDOWN_MS);
  }

  /** Damage the bomb has ripened into, before any on-the-beat bonus. */
  private bombDamage(b: TimeBomb, time: number): number {
    if (b.phase === 'flight') return BOMB_BASE_DMG;
    const t = clamp01((time - b.stuckAt) / BOMB_RAMP_MS);
    return Math.round(BOMB_BASE_DMG + (BOMB_MAX_DMG - BOMB_BASE_DMG) * t);
  }

  /** Radius of the closing ring — collapses from BOMB_RING_START_R onto the casing. */
  private bombRingRadius(b: TimeBomb, time: number): number {
    const t = clamp01((time - b.armedAt) / BOMB_ARM_MS);
    return BOMB_RING_START_R + (BOMB_BODY_RADIUS - BOMB_RING_START_R) * t;
  }

  private bombOnBeat(b: TimeBomb, time: number): boolean {
    return b.phase === 'armed' && Math.abs(this.bombRingRadius(b, time) - BOMB_BODY_RADIUS) <= BOMB_PERFECT_TOL;
  }

  private tryCastBomb(time: number, mouseX: number, mouseY: number): void {
    const b = this.bombs.player;
    if (b) {
      if (b.phase === 'flight') return;                 // still in the air — nothing to press yet
      if (b.phase === 'stuck') {
        this.armBomb('player', time);
        this.arena.broadcastMasteryCast('time-bomb-arm');
        return;
      }
      this.detonateBomb('player', time, this.bombOnBeat(b, time));
      return;
    }
    if (time - this.bombLastCastAt < BOMB_COOLDOWN_MS) return;
    this.bombLastCastAt = time;
    this.throwBomb('player', mouseX, mouseY, time);
    this.arena.broadcastMasteryCast('time-bomb');
  }

  /** Online replay: the remote time player lobbed a bomb at us. */
  doNpcTimeBomb(tx: number, ty: number): void {
    this.discardBomb('npc');
    this.throwBomb('npc', tx, ty, this.arena.scene.time.now);
  }

  /** Online replay: they armed the bomb riding us — start the ring closing on our sim too. */
  doNpcTimeBombArm(): void {
    const b = this.bombs.npc;
    if (b && b.phase === 'stuck') this.armBomb('npc', this.arena.scene.time.now);
  }

  /** Online replay: they detonated. Whether it landed on the beat is their call, not ours. */
  doNpcTimeBombDetonate(onBeat: boolean): void {
    if (this.bombs.npc) this.detonateBomb('npc', this.arena.scene.time.now, onBeat);
  }

  private throwBomb(owner: 'player' | 'npc', aimX: number, aimY: number, time: number): void {
    const { scene } = this.arena;
    const origin = owner === 'player' ? this.arena.player : this.arena.npc;
    const ang = Math.atan2(aimY - origin.y, aimX - origin.x);
    this.bombs[owner] = {
      owner, phase: 'flight',
      gfx: scene.add.graphics().setDepth(11),
      ringGfx: null,
      x: origin.x + Math.cos(ang) * 20, y: origin.y + Math.sin(ang) * 20,
      vx: Math.cos(ang) * BOMB_SPEED, vy: Math.sin(ang) * BOMB_SPEED,
      travelled: 0, stuckAt: time, armedAt: 0, ox: 0, oy: 0,
      t: 0, tickAccum: 0,
    };
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).muzzleFire(origin.x + Math.cos(ang) * 18, origin.y + Math.sin(ang) * 18, ang, 0.9, 9, NOON_TONES);
    this.arena.showFloatingText(origin.x, origin.y - 40, '⏱️ TIME BOMB', '#ffcc44');
  }

  private armBomb(owner: 'player' | 'npc', time: number): void {
    const b = this.bombs[owner];
    if (!b) return;
    b.phase = 'armed';
    b.armedAt = time;
    b.ringGfx = this.arena.scene.add.graphics().setDepth(12);
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(b.x, b.y, BOMB_RING_START_R, BOMB_RING_START_R + 20, TIME.white, 260, 2, 12);
    const origin = owner === 'player' ? this.arena.player : this.arena.npc;
    this.arena.showFloatingText(origin.x, origin.y - 44, '⏱️ ARMED — time it!', '#ffffff');
  }

  private updateTimeBombs(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const b = this.bombs[owner];
      if (!b) continue;
      const victim = owner === 'player' ? this.arena.npc : this.arena.player;
      b.t += delta / 1000;

      if (b.phase === 'flight') {
        // Your own bomb rides the world clock your passive is running, like everything else
        // you throw. The peer's mode isn't synced, so theirs flies at face value.
        const scale = owner === 'player' && this.arena.masteryActive
          ? (this.timeMode === 'rush' ? RUSH_FACTOR : FOCUS_FACTOR) : 1;
        const step = (delta / 1000) * scale;
        b.x += b.vx * step; b.y += b.vy * step;
        b.travelled += Math.hypot(b.vx, b.vy) * step;

        if (victim.active && victim.hp > 0
            && Phaser.Math.Distance.Between(b.x, b.y, victim.x, victim.y) <= BOMB_STICK_RADIUS) {
          this.stickBomb(b, victim, time);
        } else if (b.travelled >= BOMB_RANGE) {
          this.fx(owner).smoke(b.x, b.y, 3, 16);
          const origin = owner === 'player' ? this.arena.player : this.arena.npc;
          this.arena.showFloatingText(origin.x, origin.y - 40, 'MISSED', '#886644');
          this.discardBomb(owner);
          continue;
        }
      } else {
        // Riding the victim: if they died the bomb goes with them.
        if (!victim.active || victim.hp <= 0) { this.discardBomb(owner); continue; }
        b.x = victim.x + b.ox;
        b.y = victim.y + b.oy;
      }

      const heat = b.phase === 'flight' ? 0 : clamp01((time - b.stuckAt) / BOMB_RAMP_MS);

      // A tick of clock hands every second, faster as it ripens — it is audibly running.
      if (b.phase !== 'flight') {
        b.tickAccum += delta;
        const period = 1000 - 600 * heat;
        if (b.tickAccum >= period) {
          b.tickAccum -= period;
          this.fx(owner).hands(b.x, b.y, 1, {
            speed: 40, size: 2, life: 420, depth: 11, fall: 10,
            tones: heat > 0.5 ? HEAT_TONES : tonesFor(owner),
          });
        }
      }

      b.gfx.clear();
      TimeFx.drawBomb(b.gfx, this.col(owner), tonesFor(owner), b.x, b.y, BOMB_BODY_RADIUS, b.t, heat, 1);

      if (b.phase === 'armed' && b.ringGfx) {
        b.ringGfx.clear();
        TimeFx.drawTimingRing(b.ringGfx, this.col(owner), b.x, b.y,
          this.bombRingRadius(b, time), b.t, this.bombOnBeat(b, time));
        // Left alone, the ring lands and the bomb goes off by itself — no bonus for waiting.
        if (time - b.armedAt >= BOMB_ARM_MS) { this.detonateBomb(owner, time, false); continue; }
      }

      // Only the bomb strapped to *you* belongs in your status tray.
      if (owner === 'npc' && b.phase !== 'flight') {
        this.arena.setStatusIndicator('time-bomb', {
          name: 'Time Bomb', emoji: '⏱️', color: TIME.heat, priority: 108,
          count: this.bombDamage(b, time), suffix: ' dmg',
          description: 'A time bomb is strapped to you. The longer it rides, the harder it hits when it goes off.',
        });
      }
    }
  }

  private stickBomb(b: TimeBomb, victim: Fighter, time: number): void {
    b.phase = 'stuck';
    b.stuckAt = time;
    b.tickAccum = 0;
    // Lands where it hit, so it reads as stuck to that side of them rather than centred.
    const ang = Math.atan2(b.y - victim.y, b.x - victim.x);
    b.ox = Math.cos(ang) * 14;
    b.oy = Math.sin(ang) * 14 - 6;
    const fx = this.fx(b.owner);
    fx.flash(b.x, b.y, 16, 11, NOON_TONES);
    fx.ring(b.x, b.y, 8, 40, TIME.gold, 320, 2, 11);
    this.arena.spawnHitFlash(victim.x, victim.y, TIME.gold);
    this.arena.showFloatingText(victim.x, victim.y - 40, '⏱️ STUCK!', '#ffdd44');
  }

  private detonateBomb(owner: 'player' | 'npc', time: number, onBeat: boolean): void {
    const b = this.bombs[owner];
    if (!b) return;
    const damage = Math.round(this.bombDamage(b, time) * (onBeat ? BOMB_PERFECT_MULT : 1));
    const heat = clamp01((time - b.stuckAt) / BOMB_RAMP_MS);
    const fx = this.fx(owner);

    this.arena.dealAoeDamageFromOwner(b.x, b.y, BOMB_AOE_RADIUS, damage, owner);
    fx.detonate(b.x, b.y, BOMB_AOE_RADIUS, {
      tones: HEAT_TONES, shells: 3, smoke: 2, duration: 460 + Math.round(heat * 220),
    });
    fx.hands(b.x, b.y, 6 + Math.round(heat * 8), { speed: 190, size: 3.6, life: 620, depth: 12, tones: HEAT_TONES });
    if (onBeat) {
      // The bonus gets its own read: a second front snapping out on the beat you hit.
      fx.ring(b.x, b.y, BOMB_BODY_RADIUS, BOMB_AOE_RADIUS * 1.5, TIME.white, 420, 5, 13);
      fx.flash(b.x, b.y, BOMB_AOE_RADIUS * 0.6, 13, NOON_TONES);
    }
    this.arena.showFloatingText(b.x, b.y - 46,
      onBeat ? '⏱️ ON THE BEAT! ×1.5' : '💥 TIME BOMB', onBeat ? '#ffffff' : '#ff6633');

    if (owner === 'player') this.arena.broadcastMasteryCast(onBeat ? 'time-bomb-boom-perfect' : 'time-bomb-boom');
    this.discardBomb(owner);
  }

  /** Tears a bomb down without setting it off — miss, victim death, or match restart. */
  private discardBomb(owner: 'player' | 'npc'): void {
    const b = this.bombs[owner];
    if (!b) return;
    b.gfx.destroy();
    b.ringGfx?.destroy();
    this.bombs[owner] = null;
    if (owner === 'npc') this.arena.setStatusIndicator('time-bomb', null);
  }
}
