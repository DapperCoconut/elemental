import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { AIR, AirAvatar, AirColorFn, AirDraft, AirFx, ArmGesture, ArmHold } from './AirVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';

// ── Air Mastery constants ─────────────────────────────────────────────────────

/** Swift as the Wind: each connecting snipe is worth this much move speed and dodge. */
const SWIFT_PER_STACK = 0.05;
const SWIFT_MAX_STACKS = 10;          // caps both bonuses at +50%
/** Snipes in a row needed to bank one "Deadeye" mastery streak. */
const SNIPE_STREAK_LEN = 5;
/** Snipes in a row needed for the Sharpshooter achievement (and the Sand skin). */
const SHARPSHOOTER_STREAK_LEN = 8;
/** Enemies a single Charged Beam must run through to score a multi-hit. */
const BEAM_MULTI_HIT = 2;

const TORNADO_COOLDOWN_MS = 12000;
const TORNADO_SPEED = 260;
const TORNADO_RADIUS = 95;
/** How fast captured enemies are reeled in toward the eye, in px/sec. */
const TORNADO_PULL_SPEED = 320;
/** Captured enemies orbit the eye at this rate (radians/sec) while being reeled in. */
const TORNADO_ORBIT_SPEED = 4;

// ── Base ability constants ────────────────────────────────────────────────────

const WIND_TRAP_RADIUS = 80;
const WIND_TRAP_MS = 5000;
/** R upgrade: px/sec the Tracking Vortex trails the cursor at. */
const TRACKING_VORTEX_SPEED = 120;

/** Hawk perk (Air): flight speed of the bird, and the speed it hauls its catch at. */
const HAWK_SPEED = 1200;
const HAWK_DRAG_SPEED = 1200;
const HAWK_LIFE_MS = 1500;

/** Q upgrade: how long the beam stands, what it ticks for, and the per-target re-hit gate. */
const LINGER_MS = 5000;
const LINGER_DAMAGE = 25;
const LINGER_TICK_MS = 1000;

/** Which arm gesture the opponent's rig plays when the NPC lands each ability. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'air-snipe': 'punch',
  'quick-shot': 'flex',
  'wind-trap': 'slam',
  'grapple': 'dash',
  'charged-beam': 'punch',
};

// ── Arena API interface ────────────────────────────────────────────────────────

export interface AirArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly width: number;
  readonly height: number;
  /** True when the local player's element is air. */
  readonly isPlayerAir: boolean;
  /** True when the opponent's element is air. */
  readonly isNpcAir: boolean;
  /** True only when the player is air AND Air Mastery is switched on. */
  readonly masteryActive: boolean;
  /** The player is mid-dash/grapple — the opponent's Wind Trap can't hold them through it. */
  readonly isDodging: boolean;
  /** World-space cursor: the Tracking Vortex trails it and the Hawk drops its catch on it. */
  readonly pointerX: number;
  readonly pointerY: number;
  readonly worldBounds: Phaser.Geom.Rectangle;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  /** Skins: maps an air visual color through the owner's skin. */
  airColor(owner: 'player' | 'npc', base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: 'player' | 'npc'): string | null;
  /** Idempotent achievement unlock with in-arena popup. */
  unlockAchievement(id: string): void;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
}

// ── Internal world objects ─────────────────────────────────────────────────────

interface Tornado {
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  /** Each captive's polar offset from the eye, reeled inward every frame. */
  captured: Map<Fighter, { angle: number; dist: number }>;
  /** 'player' tornadoes sweep enemies; 'npc' (online replay) sweeps the local player. */
  owner: 'player' | 'npc';
}

interface WindTrap {
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  expiresAt: number;
  /** Seconds since placement — drives the cage's rotation. */
  t: number;
}

interface Hawk {
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expireAt: number;
  t: number;
}

interface LingeringBeam {
  g: Phaser.GameObjects.Graphics;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  expiresAt: number;
  owner: 'player' | 'npc';
  lastHitAt: Map<Fighter, number>;
  t: number;
}

// ── AirKit ────────────────────────────────────────────────────────────────────

/**
 * Everything air draws and most of what it leaves lying around the arena: the wind character
 * rig for both sides, the Wind Trap cages, the Hawk perk's bird, the lingering beams, the
 * mastery passive and the Sweeping Tornado.
 *
 * The base abilities' *cast* logic still lives in ArenaScene and air.ts — what moved here is
 * every world object air owns, so ArenaScene holds no air Graphics and no air timers.
 */
export class AirKit {
  // ── Visuals ─────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a future skin recolours one side. */
  private readonly pcol: AirColorFn;
  private readonly ncol: AirColorFn;
  private readonly pfx: AirFx;
  private readonly nfx: AirFx;
  /**
   * The character rig for each air-element fighter — air's own by default, or whatever that
   * side's equipped skin installs instead. Typed as the base rig because the kit only ever
   * drives it through poses and gestures, which every rig has.
   */
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Sustained rig pose and when it lapses — set by ArenaScene when a channel starts. */
  private playerHold: ArmHold = null;
  private playerHoldUntil = 0;
  private playerHoldAngle = 0;

  /** Mastery passive draft (depth 2) sits under the stance drafts so the two stack, not fight. */
  private swiftDraft: AirDraft | null = null;
  private dodgeDraft: AirDraft | null = null;
  private electroDraft: AirDraft | null = null;
  private dodgeAuraActive = false;
  private electroCharged = false;
  /** Storm perk: a shot taken out of a cage or a funnel is banked and rides the next snipe. */
  private stormCharged = false;

  // -- Swift as the Wind --
  private swiftStacks = 0;

  // -- Deadeye streak (counts toward mastery whether or not mastery is on) --
  private snipeStreak = 0;
  /**
   * Sharpshooter achievement streak. Tracked separately from the Deadeye streak above, which
   * banks and resets itself every 5 — a counter that keeps zeroing can never reach 8.
   */
  private sharpStreak = 0;

  // -- Sweeping Tornado --
  private tornadoLastCastAt = -Infinity;
  private tornado: Tornado | null = null;
  /** Online mirror: the opponent's Sweeping Tornado replayed on this victim sim. */
  private npcTornado: Tornado | null = null;

  // -- Wind Trap (one per side) --
  private playerTrap: WindTrap | null = null;
  private npcTrap: WindTrap | null = null;

  // -- Hawk perk --
  private hawks: Hawk[] = [];
  private hawkDragUntil = 0;
  private hawkDragX = 0;
  private hawkDragY = 0;

  // -- Lingering Beam (Q upgrade) --
  private beams: LingeringBeam[] = [];

  // last known aim, captured in handleInput so update() can steer the rig and the tornado
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(private readonly arena: AirArenaApi) {
    this.pcol = (base) => arena.airColor('player', base);
    this.ncol = (base) => arena.airColor('npc', base);
    this.pfx = new AirFx(arena.scene, this.pcol);
    this.nfx = new AirFx(arena.scene, this.ncol);
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.swiftDraft) { this.swiftDraft.destroy(); this.swiftDraft = null; }
    if (this.dodgeDraft) { this.dodgeDraft.destroy(); this.dodgeDraft = null; }
    if (this.electroDraft) { this.electroDraft.destroy(); this.electroDraft = null; }
    this.playerHold = null;
    this.playerHoldUntil = 0;
    this.playerHoldAngle = 0;
    this.dodgeAuraActive = false;
    this.electroCharged = false;
    this.stormCharged = false;

    this.swiftStacks = 0;
    this.snipeStreak = 0;
    this.sharpStreak = 0;
    this.tornadoLastCastAt = -Infinity;
    this.clearTornado('player');
    this.clearTornado('npc');

    this.clearTrap('player');
    this.clearTrap('npc');

    for (const h of this.hawks) h.g.destroy();
    this.hawks = [];
    this.hawkDragUntil = 0;
    this.hawkDragX = 0;
    this.hawkDragY = 0;

    for (const b of this.beams) b.g.destroy();
    this.beams = [];

    this.lastMouseX = 0;
    this.lastMouseY = 0;
  }

  handleInput(time: number, mouseX: number, mouseY: number): void {
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (!this.arena.masteryActive) return;

    const slot = this.tornadoSlot();
    if (!slot) return;
    const key = slot === 'e' ? this.arena.eKey
      : slot === 'r' ? this.arena.rKey
      : slot === 'q' ? this.arena.qKey
      : this.arena.fKey;
    if (Phaser.Input.Keyboard.JustDown(key) && !this.arena.nukeChanneling) {
      this.tryCastTornado(time, mouseX, mouseY);
    }
  }

  /**
   * Runs after NPC AI and husk movement have written their velocities for the frame — both
   * the tornado and the Wind Trap hold their catch by position, so anything short of the last
   * word on where a body is loses the tug of war.
   */
  update(time: number, delta: number): void {
    this.updateAvatars(time, delta);
    this.updateDrafts(delta);
    this.tickTornado(this.tornado, delta);
    this.tickTornado(this.npcTornado, delta);
    this.updateTraps(time, delta);
    this.updateHawks(time, delta);
    this.updateBeams(time, delta);
  }

  // ── Reporting hooks (called from ArenaScene) ──────────────────────────────

  /**
   * One resolved Air Snipe. Runs regardless of whether mastery is switched on —
   * the counters are how the player earns the mastery in the first place.
   */
  onSnipeResult(hit: boolean, hitTargets?: Array<{ x: number; y: number }>): void {
    if (hit) {
      this.snipeStreak++;
      // Achievement — Sharpshooter: 8 connecting snipes with nothing missed in between.
      this.sharpStreak++;
      if (this.sharpStreak >= SHARPSHOOTER_STREAK_LEN) {
        this.arena.unlockAchievement('sharpshooter');
      }
      if (this.snipeStreak >= SNIPE_STREAK_LEN) {
        this.snipeStreak = 0;
        this.arena.recordMasteryStat('snipeStreaks', 1);
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 44, '🎯 DEADEYE!', '#ccddff');
        this.pfx.bloom(this.arena.player.x, this.arena.player.y, 60, 10, 5);
      }

      const trap = this.playerTrap;
      if (trap && hitTargets) {
        const ensnared = hitTargets.filter(
          (t) => Phaser.Math.Distance.Between(trap.x, trap.y, t.x, t.y) <= WIND_TRAP_RADIUS,
        );
        if (ensnared.length > 0) {
          this.arena.recordMasteryStat('windTrapSnipes', ensnared.length);
          const t = ensnared[0];
          this.arena.showFloatingText(t.x, t.y - 44, '🌀 CAGED!', '#aaddff');
          // The cage answers the hit: its wall snaps inward around the quarry.
          this.pfx.ring(trap.x, trap.y, WIND_TRAP_RADIUS, WIND_TRAP_RADIUS * 0.4, AIR.frost, 340, 5, 4);
        }
      }

      // Storm perk: shooting into your own weather earths the charge through the shot.
      if (hitTargets && this.arena.hasPerk('player', 'storm') && !this.stormCharged) {
        const struck = hitTargets.find((t) => this.inPlayerStorm(t.x, t.y));
        if (struck) this.chargeStorm(struck.x, struck.y);
      }

      if (this.arena.masteryActive && this.swiftStacks < SWIFT_MAX_STACKS) {
        this.swiftStacks++;
        this.arena.showFloatingText(
          this.arena.player.x, this.arena.player.y - 30,
          `💨 +${Math.round(this.swiftStacks * SWIFT_PER_STACK * 100)}%`, '#ccddff',
        );
      }
    } else {
      this.snipeStreak = 0;
      this.sharpStreak = 0;
      // A single miss blows the whole stack away.
      if (this.arena.masteryActive && this.swiftStacks > 0) {
        this.swiftStacks = 0;
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '💨 SWIFTNESS LOST', '#8899aa');
        // The draft the stacks were riding on is torn off in one gust.
        this.pfx.motes(this.arena.player.x, this.arena.player.y, 14, {
          speed: 220, size: 3, life: 520, swirl: 2, depth: 5,
        });
      }
    }
  }

  /** One resolved Charged Beam, with the number of enemies it ran through. */
  onBeamHits(count: number): void {
    if (count < BEAM_MULTI_HIT) return;
    this.arena.recordMasteryStat('beamMultiHits', 1);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 44, `⚡ ${count} SKEWERED!`, '#88ccff');
  }

  /** The player just spent a grapple dodge (charge or F-upgrade window) to avoid a hit. */
  onGrappleDodge(): void {
    this.arena.recordMasteryStat('grappleDodges', 1);
    // The shot is shoved aside rather than absorbed.
    this.pfx.bloom(this.arena.player.x, this.arena.player.y, 52, 8, 6);
  }

  // ── Public accessors read by ArenaScene ───────────────────────────────────

  /** Swift as the Wind move speed. 1 when the passive isn't earning. */
  getPlayerSpeedMult(): number {
    return this.arena.masteryActive ? 1 + this.swiftStacks * SWIFT_PER_STACK : 1;
  }

  /** Swift as the Wind dodge roll — an independent roll so it stacks with other dodge sources. */
  rollMasteryDodge(): boolean {
    if (!this.arena.masteryActive || this.swiftStacks === 0) return false;
    return Math.random() < this.swiftStacks * SWIFT_PER_STACK;
  }

  /** 0–1 cooldown fill for the Sweeping Tornado HUD card. */
  getTornadoCooldownRatio(time: number): number {
    return Math.min(1, (time - this.tornadoLastCastAt) / TORNADO_COOLDOWN_MS);
  }

  /** NPC AI reads this to know whether its own Wind Trap is still holding the player. */
  isNpcTrapActive(time: number): boolean {
    return this.npcTrap !== null && time < this.npcTrap.expiresAt;
  }

  /** The Hawk has a catch in the air — ArenaScene counts that as the NPC being locked. */
  isNpcHawkDragged(): boolean {
    return this.hawkDragUntil > 0;
  }

  // ── Character rig ────────────────────────────────────────────────────────

  /** One-shot arm gesture on the player's rig, aimed at the cursor unless told otherwise. */
  playPlayerGesture(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.playerAvatar?.play(gesture, angle ?? this.playerAim(), duration);
  }

  /** Sustained pose for the length of a channel. Lapses on its own so nothing can strand it. */
  setPlayerHold(hold: ArmHold, durationMs = 0, angle?: number): void {
    this.playerHold = hold;
    this.playerHoldAngle = angle ?? this.playerAim();
    this.playerHoldUntil = hold ? this.arena.scene.time.now + durationMs : 0;
  }

  /** Wind-up gather on the player, tracking them for channels that leave them free to walk. */
  playerChannelCharge(radius: number, durationMs: number): void {
    const { player } = this.arena;
    this.pfx.channelCharge(player.x, player.y, radius, durationMs,
      () => (player.active ? { x: player.x, y: player.y } : null));
  }

  private playerAim(): number {
    const { player } = this.arena;
    const ax = this.lastMouseX || player.x + 1;
    const ay = this.lastMouseY || player.y;
    return Math.atan2(ay - player.y, ax - player.x);
  }

  /**
   * That side's rig: the skin's if one is equipped, air's living wind otherwise. Built lazily
   * in `updateAvatars` and torn down in `reset`, so changing skin between matches swaps the
   * character.
   */
  private makeAvatar(owner: 'player' | 'npc'): BaseAvatar {
    const { scene } = this.arena;
    const col = owner === 'player' ? this.pcol : this.ncol;
    return makeSkinAvatar(this.arena.skinId(owner), scene) ?? new AirAvatar(scene, col);
  }

  /**
   * Builds (on first frame) and drives the wind avatar for whichever fighters are air. The
   * player faces the cursor; the NPC faces whoever it is fighting.
   */
  private updateAvatars(time: number, delta: number): void {
    const { player, npc, isPlayerAir, isNpcAir } = this.arena;

    if (isPlayerAir && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
      this.playerAvatar.setFacing(this.playerAim());
      // Swift stacks visibly swell the rig, so the passive is readable off the character
      // alone without having to count the draft's curls.
      const swift = this.arena.masteryActive ? this.swiftStacks / SWIFT_MAX_STACKS : 0;
      this.playerAvatar.setIntensity(1 + swift * 0.45);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      if (this.playerHold && time >= this.playerHoldUntil) this.playerHold = null;
      this.playerAvatar.setHold(this.playerHold, this.playerHoldAngle);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcAir && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Mirrors the opponent's casts onto their rig. The effects themselves come from air.ts,
   *  which paints for whichever side is casting. */
  handleNpcCastId(id: string | null): void {
    if (!id) return;
    const gesture = NPC_GESTURES[id];
    if (!gesture) return;
    const { npc, player } = this.arena;
    this.npcAvatar?.play(gesture, Math.atan2(player.y - npc.y, player.x - npc.x));
  }

  // ── Persistent drafts ────────────────────────────────────────────────────

  /** The grapple's dodge charge is banked and ready. */
  setDodgeAura(active: boolean): void {
    if (active && !this.dodgeAuraActive) {
      this.pfx.ring(this.arena.player.x, this.arena.player.y, 8, 46, AIR.frost, 340, 4, 5);
    }
    this.dodgeAuraActive = active;
  }

  /** E upgrade: a shot's worth of static is stored and waiting on the next click. */
  setElectroCharged(charged: boolean): void {
    if (charged && !this.electroCharged) {
      const { player } = this.arena;
      this.pfx.staticSnap(player.x, player.y, 30);
      this.pfx.ring(player.x, player.y, 44, 14, AIR.charge, 320, 4, 6);
    }
    this.electroCharged = charged;
  }

  // ── Storm perk ────────────────────────────────────────────────────────────

  /** The Storm charge is banked and waiting on the next snipe. */
  isStormCharged(): boolean { return this.stormCharged; }

  /** Spent (or wiped) by ArenaScene once the charged snipe has actually gone off. */
  setStormCharged(v: boolean): void { this.stormCharged = v; }

  /** Is this point inside the player's own thunderhead — the cage or the funnel? */
  private inPlayerStorm(x: number, y: number): boolean {
    const trap = this.playerTrap;
    if (trap && Phaser.Math.Distance.Between(trap.x, trap.y, x, y) <= WIND_TRAP_RADIUS) return true;
    const t = this.tornado;
    return !!t && Phaser.Math.Distance.Between(t.x, t.y, x, y) <= TORNADO_RADIUS;
  }

  /** The struck target earths the storm: the bolt jumps back down the shot line to you. */
  private chargeStorm(x: number, y: number): void {
    const { player } = this.arena;
    this.stormCharged = true;
    this.pfx.staticSnap(x, y, 34);
    this.pfx.staticSnap(player.x, player.y, 30);
    this.pfx.ring(player.x, player.y, 46, 14, AIR.charge, 340, 4, 6);
    this.arena.showFloatingText(player.x, player.y - 44, '⛈️ STORM CHARGE!', '#ffee44');
  }

  /**
   * The palette a side's weather is painted in. With Storm equipped the cage and the funnel
   * darken into a thunderhead; everyone else gets air's own blues.
   */
  private weatherCol(owner: 'player' | 'npc'): AirColorFn {
    const col = owner === 'player' ? this.pcol : this.ncol;
    if (!this.arena.hasPerk(owner, 'storm')) return col;
    return (base) => thunderhead(col(base));
  }

  /**
   * Rebuilds and drives the three drafts that ride on the player. The mastery passive sits at
   * the lowest depth so a stance draft layers over it into one silhouette instead of fighting
   * it for the same band of pixels.
   */
  private updateDrafts(delta: number): void {
    const { player, scene, isPlayerAir } = this.arena;
    const alive = isPlayerAir && player?.active;
    const vis = alive && !player.forceInvisible ? player.alpha : 0;

    const swiftOn = alive && this.arena.masteryActive && this.swiftStacks > 0;
    if (swiftOn) {
      if (!this.swiftDraft) this.swiftDraft = new AirDraft(scene, this.pcol, 30, 1, 2, 9, AIR.sky);
      // Stacks widen and speed up the draft, so +50% looks like +50%.
      this.swiftDraft.setIntensity(0.55 + (this.swiftStacks / SWIFT_MAX_STACKS) * 0.95);
      this.swiftDraft.update(delta, player.x, player.y, vis);
    } else if (this.swiftDraft) {
      this.swiftDraft.destroy();
      this.swiftDraft = null;
    }

    if (alive && this.dodgeAuraActive) {
      if (!this.dodgeDraft) this.dodgeDraft = new AirDraft(scene, this.pcol, 24, 1.1, 3, 7, AIR.frost);
      this.dodgeDraft.update(delta, player.x, player.y, vis);
    } else if (this.dodgeDraft) {
      this.dodgeDraft.destroy();
      this.dodgeDraft = null;
    }

    // A banked Storm charge rides in the same draft the E+ static does — both mean
    // "the next shot is loaded", and the player should not have to read two tells.
    if (alive && (this.electroCharged || this.stormCharged)) {
      if (!this.electroDraft) this.electroDraft = new AirDraft(scene, this.pcol, 21, 1.2, 3, 6, AIR.charge);
      this.electroDraft.update(delta, player.x, player.y, vis);
      // A stored charge keeps arcing off the player until it is spent.
      if (Math.random() < 0.04) this.pfx.staticSnap(player.x, player.y, 24);
    } else if (this.electroDraft) {
      this.electroDraft.destroy();
      this.electroDraft = null;
    }
  }

  // ── Grapple ──────────────────────────────────────────────────────────────

  /** The hook goes out and the caster is yanked after it. */
  onGrappleLaunch(x1: number, y1: number, x2: number, y2: number, owner: 'player' | 'npc'): void {
    const fx = owner === 'player' ? this.pfx : this.nfx;
    const flight = Math.min(350, (Phaser.Math.Distance.Between(x1, y1, x2, y2) / 1200) * 1000);
    fx.hookLine(x1, y1, x2, y2, Math.max(160, flight));
    fx.slipstream(x1, y1, x2, y2);
    if (owner === 'player') this.playPlayerGesture('dash', Math.atan2(y2 - y1, x2 - x1));
  }

  /** Both feet down: the air the caster dragged along catches up and blows out around them. */
  onGrappleLand(x: number, y: number, owner: 'player' | 'npc'): void {
    const fx = owner === 'player' ? this.pfx : this.nfx;
    fx.bloom(x, y, 64, 11, 5);
    fx.dustMark(x, y, 44);
    fx.motes(x, y, 10, { speed: 180, size: 2.8, life: 460, swirl: 1.8, depth: 5 });
  }

  /** F+: an enemy the grapple path swept through is left staggering in the wake. */
  onGrappleSlow(x: number, y: number): void {
    this.pfx.gustBurst(x, y, 58, { duration: 320, dust: false });
  }

  // ── Wind Trap ────────────────────────────────────────────────────────────

  /** Drops a cyclone cage at a point, replacing that side's previous one. */
  placeWindTrap(x: number, y: number, owner: 'player' | 'npc'): void {
    this.clearTrap(owner);
    const fx = owner === 'player' ? this.pfx : this.nfx;
    const trap: WindTrap = {
      g: this.arena.scene.add.graphics().setDepth(3),
      x, y,
      expiresAt: this.arena.scene.time.now + WIND_TRAP_MS,
      t: 0,
    };
    if (owner === 'player') this.playerTrap = trap; else this.npcTrap = trap;

    // Ignition: the cage slams up out of the ground.
    fx.updraft(x, y, 26, 74, 4);
    fx.ring(x, y, 10, WIND_TRAP_RADIUS * 1.2, AIR.mist, 420, 5, 4);
    fx.bloom(x, y, WIND_TRAP_RADIUS * 0.8, 12, 4);
    fx.dustMark(x, y, WIND_TRAP_RADIUS * 0.9);
  }

  /**
   * Repaints both cages, drifts the player's toward the cursor when Tracking Vortex is bought,
   * and pins anything caught inside back against the wall.
   */
  private updateTraps(time: number, delta: number): void {
    const { player, enemies, isDodging } = this.arena;

    // -- Player's cage holds the enemies --
    if (this.playerTrap) {
      const trap = this.playerTrap;
      if (time >= trap.expiresAt) {
        this.burstTrap(trap, 'player');
      } else {
        trap.t += delta / 1000;
        // R upgrade: the vortex trails the aim at a capped speed rather than snapping to it,
        // so enemies can still outrun it.
        if (this.arena.hasUpgrade('r')) {
          const step = TRACKING_VORTEX_SPEED * (delta / 1000);
          const dx = this.arena.pointerX - trap.x;
          const dy = this.arena.pointerY - trap.y;
          const d = Math.hypot(dx, dy);
          if (d > step) { trap.x += (dx / d) * step; trap.y += (dy / d) * step; }
          else { trap.x = this.arena.pointerX; trap.y = this.arena.pointerY; }
        }
        this.paintTrap(trap, this.weatherCol('player'), time);
        this.strikeInside(trap.x, trap.y, WIND_TRAP_RADIUS * 0.7, 'player');

        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(trap.x, trap.y, t.x, t.y);
          if (d <= WIND_TRAP_RADIUS) continue;
          const ang = Phaser.Math.Angle.Between(trap.x, trap.y, t.x, t.y);
          t.setPosition(trap.x + Math.cos(ang) * WIND_TRAP_RADIUS, trap.y + Math.sin(ang) * WIND_TRAP_RADIUS);
          const nb = t.body as Phaser.Physics.Arcade.Body;
          const vDotN = nb.velocity.x * Math.cos(ang) + nb.velocity.y * Math.sin(ang);
          if (vDotN > 0) {
            nb.velocity.x -= vDotN * Math.cos(ang);
            nb.velocity.y -= vDotN * Math.sin(ang);
          }
        }
      }
    }

    // -- NPC's cage holds the player --
    if (this.npcTrap) {
      const trap = this.npcTrap;
      if (time >= trap.expiresAt) {
        this.burstTrap(trap, 'npc');
      } else {
        trap.t += delta / 1000;
        this.paintTrap(trap, this.weatherCol('npc'), time);
        this.strikeInside(trap.x, trap.y, WIND_TRAP_RADIUS * 0.7, 'npc');
        if (!isDodging) {
          const d = Phaser.Math.Distance.Between(trap.x, trap.y, player.x, player.y);
          if (d > WIND_TRAP_RADIUS) {
            const ang = Phaser.Math.Angle.Between(trap.x, trap.y, player.x, player.y);
            player.setPosition(trap.x + Math.cos(ang) * WIND_TRAP_RADIUS, trap.y + Math.sin(ang) * WIND_TRAP_RADIUS);
            // Cancel only the outward velocity so the player can still move inside.
            const pb = player.body as Phaser.Physics.Arcade.Body;
            const vDotN = pb.velocity.x * Math.cos(ang) + pb.velocity.y * Math.sin(ang);
            if (vDotN > 0) {
              pb.velocity.x -= vDotN * Math.cos(ang);
              pb.velocity.y -= vDotN * Math.sin(ang);
            }
          }
        }
      }
    }
  }

  private paintTrap(trap: WindTrap, tint: AirColorFn, time: number): void {
    if (!trap.g.active) return;
    trap.g.clear();
    // Fade the last half-second so the cage visibly runs out of air instead of blinking away.
    const left = trap.expiresAt - time;
    const alpha = left < 500 ? Math.max(0, left / 500) : 1;
    AirFx.drawTrapCage(trap.g, tint, trap.x, trap.y, WIND_TRAP_RADIUS, trap.t, alpha);
  }

  /** Storm perk: the odd fork of lightning stepping down inside the weather. */
  private strikeInside(x: number, y: number, radius: number, owner: 'player' | 'npc'): void {
    if (!this.arena.hasPerk(owner, 'storm') || Math.random() >= 0.05) return;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    (owner === 'player' ? this.pfx : this.nfx).staticSnap(x + Math.cos(a) * r, y + Math.sin(a) * r, 22);
  }

  private burstTrap(trap: WindTrap, owner: 'player' | 'npc'): void {
    const fx = owner === 'player' ? this.pfx : this.nfx;
    fx.ring(trap.x, trap.y, WIND_TRAP_RADIUS, WIND_TRAP_RADIUS * 1.6, AIR.steel, 420, 3, 4);
    fx.haze(trap.x, trap.y, 4, WIND_TRAP_RADIUS * 0.7, 3);
    this.clearTrap(owner);
  }

  private clearTrap(owner: 'player' | 'npc'): void {
    const trap = owner === 'player' ? this.playerTrap : this.npcTrap;
    if (!trap) return;
    trap.g.destroy();
    if (owner === 'player') this.playerTrap = null; else this.npcTrap = null;
  }

  // ── Hawk perk ────────────────────────────────────────────────────────────

  /** F becomes a bird: it flies at the cursor and hauls whatever it hits back to the mark. */
  spawnHawk(targetX: number, targetY: number): void {
    const { player } = this.arena;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const len = Math.hypot(dx, dy) || 1;
    this.hawks.push({
      g: this.arena.scene.add.graphics().setDepth(8),
      x: player.x, y: player.y,
      vx: (dx / len) * HAWK_SPEED,
      vy: (dy / len) * HAWK_SPEED,
      expireAt: this.arena.scene.time.now + HAWK_LIFE_MS,
      t: 0,
    });
    this.pfx.muzzleGust(player.x, player.y, Math.atan2(dy, dx), 1.3);
    this.playPlayerGesture('punch', Math.atan2(dy, dx));
    this.arena.showFloatingText(player.x, player.y - 30, '🦅 HAWK!', '#ffcc44');
  }

  private updateHawks(time: number, delta: number): void {
    const dt = delta / 1000;
    const target = this.arena.npc;

    for (let i = this.hawks.length - 1; i >= 0; i--) {
      const h = this.hawks[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.t += dt;
      if (h.g.active) {
        h.g.clear();
        AirFx.drawHawk(h.g, this.pcol, h.x, h.y, Math.atan2(h.vy, h.vx), h.t);
      }

      if (target && target.active && target.hp > 0
        && Phaser.Math.Distance.Between(h.x, h.y, target.x, target.y) < 36) {
        // Hit: drag the catch all the way to the cursor. The drag is steered per-frame in
        // updateHawkDrag so it lands on the exact spot instead of stopping short on a timer.
        const wb = this.arena.worldBounds;
        const ebody = target.body as Phaser.Physics.Arcade.Body;
        // Clamp inside the world so the body can actually reach the mark rather than grinding
        // against a wall until the timeout expires.
        this.hawkDragX = Phaser.Math.Clamp(this.arena.pointerX, wb.x + ebody.halfWidth, wb.right - ebody.halfWidth);
        this.hawkDragY = Phaser.Math.Clamp(this.arena.pointerY, wb.y + ebody.halfHeight, wb.bottom - ebody.halfHeight);
        const elen = Phaser.Math.Distance.Between(target.x, target.y, this.hawkDragX, this.hawkDragY);
        // Timeout is a safety net only (+250ms slack), not the arrival cue.
        this.hawkDragUntil = time + (elen / HAWK_DRAG_SPEED) * 1000 + 250;
        this.arena.showFloatingText(target.x, target.y - 30, '🦅 SNATCHED!', '#ffcc44');
        this.arena.spawnHitFlash(h.x, h.y, AIR.charge);
        this.pfx.gustBurst(h.x, h.y, 64, { duration: 340, dust: false });
        h.g.destroy();
        this.hawks.splice(i, 1);
        continue;
      }

      if (time >= h.expireAt) {
        this.pfx.motes(h.x, h.y, 6, { speed: 90, size: 2.6, life: 420, swirl: 2, depth: 6 });
        h.g.destroy();
        this.hawks.splice(i, 1);
      }
    }

    this.updateHawkDrag(time, delta);
  }

  /** Steers a snatched enemy to the stored cursor point, snapping on arrival. */
  private updateHawkDrag(time: number, delta: number): void {
    if (this.hawkDragUntil <= 0) return;
    const target = this.arena.npc;
    const ebody = target?.body as Phaser.Physics.Arcade.Body | undefined;
    if (!target || !target.active || !ebody) { this.hawkDragUntil = 0; return; }

    const dx = this.hawkDragX - target.x;
    const dy = this.hawkDragY - target.y;
    const dist = Math.hypot(dx, dy);
    const step = HAWK_DRAG_SPEED * (delta / 1000);

    // Arrived (or the safety timeout fired) — land exactly on the spot.
    if (dist <= step || time >= this.hawkDragUntil) {
      target.setPosition(this.hawkDragX, this.hawkDragY);
      ebody.reset(this.hawkDragX, this.hawkDragY);
      this.hawkDragUntil = 0;
      this.pfx.bloom(this.hawkDragX, this.hawkDragY, 58, 10, 5);
      this.pfx.dustMark(this.hawkDragX, this.hawkDragY, 42);
      return;
    }
    ebody.setVelocity((dx / dist) * HAWK_DRAG_SPEED, (dy / dist) * HAWK_DRAG_SPEED);
    // The catch drags a wake behind it the whole way.
    if (Math.random() < 0.35) {
      this.pfx.motes(target.x, target.y, 1, {
        angle: Math.atan2(-dy, -dx), spread: 0.5, speed: 70, size: 2.4, life: 340, depth: 5,
      });
    }
  }

  // ── Lingering Beam (Q upgrade) ───────────────────────────────────────────

  /** Leaves a standing wall of compressed air along the beam's path. */
  addLingeringBeam(x1: number, y1: number, x2: number, y2: number, owner: 'player' | 'npc'): void {
    this.beams.push({
      g: this.arena.scene.add.graphics().setDepth(8),
      x1, y1, x2, y2,
      expiresAt: this.arena.scene.time.now + LINGER_MS,
      owner,
      lastHitAt: new Map(),
      t: 0,
    });
  }

  private updateBeams(time: number, delta: number): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      if (time > b.expiresAt) {
        b.g.destroy();
        this.beams.splice(i, 1);
        continue;
      }
      b.t += delta / 1000;
      const tint = b.owner === 'player' ? this.pcol : this.ncol;
      const fx = b.owner === 'player' ? this.pfx : this.nfx;
      // Bleeds off as it ages, so a beam that is nearly spent looks nearly spent.
      const alpha = 0.35 + ((b.expiresAt - time) / LINGER_MS) * 0.65;
      if (b.g.active) {
        b.g.clear();
        AirFx.drawBeamLine(b.g, tint, b.x1, b.y1, b.x2, b.y2, b.t, alpha);
      }

      const targets = b.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (pointToSegmentDist(t.x, t.y, b.x1, b.y1, b.x2, b.y2) > 30) continue;
        if (time - (b.lastHitAt.get(t) ?? 0) < LINGER_TICK_MS) continue;
        t.takeDamage(LINGER_DAMAGE);
        b.lastHitAt.set(t, time);
        this.arena.spawnHitFlash(t.x, t.y, AIR.blue);
        this.arena.showFloatingText(t.x, t.y - 24, '⚡ Lingering!', '#88ccff');
        fx.gustBurst(t.x, t.y, 44, { duration: 280, dust: false, haze: 0 });
      }
    }
  }

  // ── Sweeping Tornado ──────────────────────────────────────────────────────

  /** The ability slot Sweeping Tornado is bound over this match, or null. */
  private tornadoSlot(): string | null {
    for (const slot of ['e', 'r', 'f', 'q']) {
      if (this.arena.masteryBindFor(slot) === 'sweeping-tornado') return slot;
    }
    return null;
  }

  private tryCastTornado(time: number, mouseX: number, mouseY: number): void {
    if (time - this.tornadoLastCastAt < TORNADO_COOLDOWN_MS) return;
    this.tornadoLastCastAt = time;
    this.spawnTornado(mouseX, mouseY, 'player');
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 28, '🌪️ Sweeping Tornado!', '#c0c8d0');
    this.playPlayerGesture('sweep', Math.atan2(mouseY - this.arena.player.y, mouseX - this.arena.player.x));
    this.arena.broadcastMasteryCast('sweeping-tornado');
  }

  /** Online replay: the remote air player cast Sweeping Tornado — sweep our local fighter. */
  doNpcTornado(tx: number, ty: number): void {
    this.spawnTornado(tx, ty, 'npc');
    this.npcAvatar?.play('sweep', Math.atan2(ty - this.arena.npc.y, tx - this.arena.npc.x));
  }

  private spawnTornado(aimX: number, aimY: number, owner: 'player' | 'npc'): void {
    this.clearTornado(owner);
    const { player, npc, scene } = this.arena;
    const origin = owner === 'player' ? player : npc;
    const fx = owner === 'player' ? this.pfx : this.nfx;
    const ang = Math.atan2(aimY - origin.y, aimX - origin.x);

    const tornado: Tornado = {
      g: scene.add.graphics().setDepth(4),
      x: origin.x, y: origin.y,
      vx: Math.cos(ang) * TORNADO_SPEED,
      vy: Math.sin(ang) * TORNADO_SPEED,
      spin: 0,
      captured: new Map<Fighter, { angle: number; dist: number }>(),
      owner,
    };
    if (owner === 'player') this.tornado = tornado; else this.npcTornado = tornado;

    // Touchdown: the funnel drops out of nothing and bites into the floor.
    fx.updraft(origin.x, origin.y, 34, 120, 5);
    fx.ring(origin.x, origin.y, 12, TORNADO_RADIUS * 1.3, AIR.mist, 460, 5, 5);
    fx.dustMark(origin.x, origin.y, TORNADO_RADIUS * 0.8);
  }

  /**
   * The tornado rolls forward, vacuuming up anything it touches and dragging it along.
   * Reaching any arena edge bursts it and drops everything it was holding.
   */
  private tickTornado(t: Tornado | null, delta: number): void {
    if (!t) return;
    const dt = delta / 1000;

    t.x += t.vx * dt;
    t.y += t.vy * dt;
    t.spin += dt;
    if (t.g.active) {
      t.g.clear();
      AirFx.drawTornado(t.g, this.weatherCol(t.owner), t.x, t.y, TORNADO_RADIUS, t.spin, 1);
    }
    this.strikeInside(t.x, t.y, TORNADO_RADIUS * 0.6, t.owner);

    // 'npc' tornadoes (online replay) sweep the local player; 'player' ones sweep enemies.
    const sweepTargets = t.owner === 'npc' ? [this.arena.player] : this.arena.enemies;
    // Vacuum: anything inside the funnel this frame is caught for the rest of the ride.
    for (const e of sweepTargets) {
      if (!e.active || e.hp <= 0 || t.captured.has(e)) continue;
      const d = Phaser.Math.Distance.Between(t.x, t.y, e.x, e.y);
      if (d > TORNADO_RADIUS) continue;
      t.captured.set(e, { angle: Math.atan2(e.y - t.y, e.x - t.x), dist: d });
      this.arena.showFloatingText(e.x, e.y - 38, '🌪️ SUCKED IN!', '#c0c8d0');
      (t.owner === 'player' ? this.pfx : this.nfx).bloom(e.x, e.y, 54, 9, 5);
    }

    // Drag: captives are pinned by position, not velocity. Enemy AI rewrites its own
    // velocity every frame, so anything short of an outright position write loses the
    // tug of war — this is the same approach the base Wind Trap uses.
    for (const [e, hold] of t.captured) {
      if (!e.active || e.hp <= 0) { t.captured.delete(e); continue; }
      hold.dist = Math.max(0, hold.dist - TORNADO_PULL_SPEED * dt);
      hold.angle += TORNADO_ORBIT_SPEED * dt;
      const body = e.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      // reset() teleports the body with the sprite; a bare setPosition leaves them desynced.
      body.reset(t.x + Math.cos(hold.angle) * hold.dist, t.y + Math.sin(hold.angle) * hold.dist);
    }

    const { width, height } = this.arena;
    if (t.x <= TORNADO_RADIUS || t.x >= width - TORNADO_RADIUS
      || t.y <= TORNADO_RADIUS || t.y >= height - TORNADO_RADIUS) {
      this.burstTornado(t);
    }
  }

  private burstTornado(t: Tornado): void {
    const fx = t.owner === 'player' ? this.pfx : this.nfx;
    for (const e of t.captured.keys()) {
      if (!e.active || e.hp <= 0) continue;
      (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.arena.showFloatingText(e.x, e.y - 38, 'RELEASED', '#8899aa');
    }
    // The funnel comes apart against the wall: everything it was holding is thrown clear.
    fx.gustBurst(t.x, t.y, TORNADO_RADIUS * 1.2, { curls: 22, haze: 5, duration: 520 });
    fx.updraft(t.x, t.y, 40, 150, 6);
    this.arena.scene.cameras.main.shake(220, 0.006);
    this.clearTornado(t.owner);
  }

  private clearTornado(owner: 'player' | 'npc'): void {
    const t = owner === 'player' ? this.tornado : this.npcTornado;
    if (!t) return;
    t.g.destroy();
    if (owner === 'player') this.tornado = null; else this.npcTornado = null;
  }
}

/**
 * Storm perk shading: drags a colour down into thunderhead territory — much darker, and what
 * light is left pushed blue, so a charged cage reads as weather rather than as a dimmed cage.
 */
function thunderhead(c: number): number {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  return (Math.round(r * 0.40) << 16) | (Math.round(g * 0.46) << 8) | Math.round(b * 0.58 + 26);
}

/** Perpendicular distance from a point to a line segment — the lingering beam's hit test. */
function pointToSegmentDist(
  px: number, py: number, ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
}
