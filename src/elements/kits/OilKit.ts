import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import {
  ArmGesture, DroneArrayLattice, OilAvatar, OilCoat, OilColorFn, OilFx, oilFlame, OIL,
} from './OilVisuals';

// ── Oil Mastery constants ────────────────────────────────────────────────────

/** Drone Array: damage resistance each orbiting drone is worth. */
const DRONE_ARRAY_RESIST_PER_DRONE = 0.1;

/** Which arm gesture the opponent's rig plays when the NPC lands each ability. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'drone-command': 'punch',
  'barrel-roll': 'sweep',
  'drone-destroy': 'punch',
  'shield-gen': 'slam',
  'train-morph': 'raise',
};

const TURRET_COOLDOWN_MS = 20000;
const TURRET_DURATION_MS = 10000;
const TURRET_MAX_HP = 150;
/** Drones sacrificed to bolt the turret down. */
const TURRET_DRONE_COST = 3;
/** Body radius — still larger than the player's 22 so it screens them while mounted. */
const TURRET_RADIUS = 24;
/** How close the player must stand to mount — measured from the turret's edge, not its centre. */
const TURRET_MOUNT_RANGE = TURRET_RADIUS + 40;
/** Enemy projectiles touching the turret body hit it instead of flying on. */
const TURRET_BLOCK_RADIUS = TURRET_RADIUS + 4;
const TURRET_FIRE_INTERVAL_MS = 100;
const TURRET_LASER_DAMAGE = 2;
const TURRET_LASER_RADIUS = 20;
const TURRET_COLOR = OIL.teal;
/** Field radius of the Shield Generator's point defence — also the radius it paints. */
const SHIELD_GEN_RANGE = 150;

// ── Arena API ────────────────────────────────────────────────────────────────

export interface OilArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get scene(): Phaser.Scene;
  get pointer(): Phaser.Input.Pointer;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get wKey(): Phaser.Input.Keyboard.Key;
  get aKey(): Phaser.Input.Keyboard.Key;
  get sKey(): Phaser.Input.Keyboard.Key;
  get dKey(): Phaser.Input.Keyboard.Key;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get nukeChanneling(): boolean;
  set nukeChanneling(v: boolean);
  get nukeChannelEnd(): number;
  set nukeChannelEnd(v: number);
  get npcNukeChanneling(): boolean;
  set npcNukeChanneling(v: boolean);
  get npcNukeChannelEnd(): number;
  set npcNukeChannelEnd(v: number);
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  damagePlayerTargets(cx: number, cy: number, radius: number, damage: number, color: number): void;
  /** Same AoE as damagePlayerTargets, but reports what it hit and what it killed. */
  damagePlayerTargetsCounted(
    cx: number, cy: number, radius: number, damage: number, color: number,
  ): { hits: number; kills: number };
  damageNpcTarget(cx: number, cy: number, radius: number, damage: number): void;
  pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number;
  getSceneWidth(): number;
  getSceneHeight(): number;
  /** True only when the player is oil AND Oil Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  /** Skins: maps an oil visual color through the owner's skin. */
  oilColor(owner: 'player' | 'npc', base: number): number;
}

// ── Internal types ───────────────────────────────────────────────────────────

/**
 * One quadcopter. The art lives in the drone's own Graphics and is drawn in local space, so
 * every tween, distance check and `.x`/`.y` read works exactly as it did on the old plain
 * circle while the body itself is a rotor-blurred chassis instead of a dot.
 */
/**
 * Gasoline perk (divine): the workshop sometimes turns out a special instead of a standard
 * airframe. Every kind still orbits, still spends shots and still dies at zero — what changes
 * is what it does with a shot, and what a Drone Destroy leaves of it.
 */
type DroneKind = 'standard' | 'med' | 'bash' | 'blast' | 'prime';

/** Roll table for the specials. Whatever is left over is a standard drone. */
const GASOLINE_ODDS: Array<{ kind: DroneKind; chance: number }> = [
  { kind: 'med', chance: 0.14 },
  { kind: 'bash', chance: 0.14 },
  { kind: 'blast', chance: 0.14 },
  { kind: 'prime', chance: 0.08 },
];
const DRONE_KIND_TAG: Record<DroneKind, string> = {
  standard: '🛩️ Drone',
  med: '💊 Med-Drone',
  bash: '🥊 Bash-Drone',
  blast: '💣 Blast-Drone',
  prime: '⭐ Drone-Prime',
};
const MED_DRONE_HPS = 2;
const BASH_DRONE_DAMAGE = 10;
const BASH_DRONE_KNOCKBACK = 620;
const BASH_DRONE_KNOCK_MS = 220;
const BASH_DRONE_MS = 420;
const BLAST_DRONE_DAMAGE = 10;

interface Drone {
  gfx: Phaser.GameObjects.Graphics;
  shotsLeft: number;
  /** Magazine size, so the pip strip can show spent rounds as well as loaded ones. */
  maxShots: number;
  orbitAngle: number;
  /** Where the camera lens is pointing — the foe while orbiting, the cursor while firing. */
  aim: number;
  /** Rotor phase, advanced every frame. */
  spin: number;
  /** R+ Overclock has taken this drone over: teal shell, arcing containment. */
  overcharged: boolean;
  meleeCooldownUntil: number;
  healCdUntil: number;
  owner: 'player' | 'npc';
  /** Gasoline: which special this one rolled, or 'standard'. */
  kind: DroneKind;
  /** Med-Drone: fractional HP carried between frames so 2 HP/s is exactly 2 HP/s. */
  healAccum: number;
  /** While this is in the future the drone is flying itself — the orbit lets go of it. */
  busyUntil: number;
}

interface OilPuddle {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  expiresAt: number;
  ignited: boolean;
  igniteTickAccum: number;
  radius: number;
  /** Fixes this pool's rim wobble and film drift so a field of puddles doesn't pulse in sync. */
  seed: number;
  owner: 'player' | 'npc';
}

interface OilFirewall {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  angle: number;
  hp: number;
  owner: 'player' | 'npc';
}

interface OilBarrel {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  distTraveled: number;
  lastPuddleDist: number;
  owner: 'player' | 'npc';
  active: boolean;
  /** E+ Barrel Roll: the caster is standing on it right now (E still held). */
  ridden: boolean;
  rideDustAccum: number;
  /** Radians of drum rotation, so the staves scroll and the barrel visibly rolls. */
  roll: number;
  /** Where the last skid mark was laid, so the track is continuous rather than dotted. */
  trailX: number;
  trailY: number;
  trailAccum: number;
}

interface ShieldGenerator {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  charged: boolean;
  chargedUntil: number;
  /** When the current charge started — the lens dims across the window, not just at the end. */
  chargedFrom: number;
  scrap: number;
  blockCount: number;
  owner: 'player' | 'npc';
}

interface TrainSegment {
  x: number;
  y: number;
  lastHitAt: number;
  /** Heading of this car, so wheels, hopper and coupling all point down the track. */
  angle: number;
}

interface CoalPickup {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  collected: boolean;
  seed: number;
}

// ── OilKit ───────────────────────────────────────────────────────────────────

export class OilKit {
  private arena: OilArenaApi;

  // ── Visuals ─────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a future skin recolours one side. */
  private readonly pcol: OilColorFn;
  private readonly ncol: OilColorFn;
  private readonly pfx: OilFx;
  private readonly nfx: OilFx;
  /** The oil character rig (crude hands, lamp eyes, wellhead/stacks) for each oil fighter. */
  private playerAvatar: OilAvatar | null = null;
  private npcAvatar: OilAvatar | null = null;
  /** The Oily coating, built for whichever fighter is currently wearing the debuff. */
  private playerCoat: OilCoat | null = null;
  private npcCoat: OilCoat | null = null;
  /** Drone Array mastery passive — an armour plate per orbiting drone. */
  private arrayLattice: DroneArrayLattice | null = null;
  /** Seconds since reset — drives every surface that ripples rather than tweens. */
  private worldT = 0;
  private projTrailAccum = 0;
  /** Last known aim, cached in handleInput so update() can steer the rig and the drones. */
  private lastMouseX = 0;
  private lastMouseY = 0;
  /** 0–1 barrel heat on the turret, decaying between bursts so sustained fire glows. */
  private turretHeat = 0;
  private turretRecoil = 0;

  // Drones
  private playerDrones: Drone[] = [];
  private npcDrones: Drone[] = [];
  /** Gasoline — Bash-Drone shoves, enforced per frame the way every knockback here is. */
  private droneKnocks = new Map<Fighter, { vx: number; vy: number; until: number }>();

  // Firewalls (legacy F — kept for NPC, replaced for player by shield gen)
  private npcFirewall: OilFirewall | null = null;

  // Overdrive (legacy Q)
  private playerOverdriveActive = false;
  private playerOverdriveEnd = 0;
  private playerOverdriveAngle = 0;
  private playerOverdriveTickAccum = 0;
  private playerOverdriveGfx: Phaser.GameObjects.Graphics | null = null;
  private playerOverdriveDroneCount = 0;
  private npcOverdriveActive = false;
  private npcOverdriveEnd = 0;
  private npcOverdriveAngle = 0;
  private npcOverdriveTickAccum = 0;
  private npcOverdriveGfx: Phaser.GameObjects.Graphics | null = null;

  // Oil puddles
  private playerOilPuddles: OilPuddle[] = [];
  private npcOilPuddles: OilPuddle[] = [];

  // Click hold detection
  private pointerWasDown = false;
  private pointerDownAt = 0;
  private holdDroneAccum = 0;
  private holdModeActive = false;
  private playerCommandCooldownUntil = 0;

  // Drone orbit shared angles
  private playerDroneBaseAngle = 0;
  private npcDroneBaseAngle = 0;

  // Barrel (E revamp)
  private playerBarrel: OilBarrel | null = null;
  private npcBarrel: OilBarrel | null = null;

  /**
   * Drones that have left the orbit — a kamikaze run or an Overclock volley. They are no
   * longer in the owner's array, so nothing else would repaint them and their rotors would
   * freeze mid-flight; this list is what keeps them animating until they detonate.
   */
  private detachedDrones: Drone[] = [];

  // Shield Generator (F revamp)
  private playerShieldGen: ShieldGenerator | null = null;

  // Turret (Oil Mastery)
  private turretLastCastAt = -Infinity;
  private turret: {
    gfx: Phaser.GameObjects.Graphics;
    x: number;
    y: number;
    hp: number;
    expiresAt: number;
    mounted: boolean;
    /** Milliseconds banked toward the next laser pulse while click is held. */
    fireAccum: number;
  } | null = null;
  /** Online mirror: the opponent's Turret replayed on this victim sim (auto-fires at the local player). */
  private npcTurret: {
    gfx: Phaser.GameObjects.Graphics;
    x: number; y: number; hp: number; expiresAt: number; mounted: boolean; fireAccum: number;
  } | null = null;

  // Train Morph (Q revamp)
  private playerTrainActive = false;
  private playerTrainEndsAt = 0;
  private playerTrainDirX = 1;
  private playerTrainDirY = 0;
  private playerTrainSegments: TrainSegment[] = [];
  private playerTrainPosHistory: { x: number; y: number }[] = [];
  private playerTrainPuddleAccum = 0;
  private playerTrainHitAccum = 0;
  private playerTrainDamageMult = 1;
  private playerTrainCollectedCoal = 0;
  private coalPickups: CoalPickup[] = [];
  private playerTrainGfx: Phaser.GameObjects.Graphics | null = null;
  private trainSpeedBonus = 1;
  private trainDamageMult = 1;
  private trainQPlusActive = false;

  // Oily burn tracking
  private npcOilyBurnAccum = 0;
  private playerOilyBurnAccum = 0;

  constructor(arena: OilArenaApi) {
    this.arena = arena;
    // Built in the constructor body, not as field initializers, so both see the injected arena.
    this.pcol = (base) => arena.oilColor('player', base);
    this.ncol = (base) => arena.oilColor('npc', base);
    this.pfx = new OilFx(arena.scene, this.pcol);
    this.nfx = new OilFx(arena.scene, this.ncol);
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.playerCoat) { this.playerCoat.destroy(); this.playerCoat = null; }
    if (this.npcCoat) { this.npcCoat.destroy(); this.npcCoat = null; }
    if (this.arrayLattice) { this.arrayLattice.destroy(); this.arrayLattice = null; }
    this.worldT = 0;
    this.projTrailAccum = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.turretHeat = 0;
    this.turretRecoil = 0;

    // Destroy all sprites
    for (const d of this.playerDrones) d.gfx.destroy();
    for (const d of this.npcDrones) d.gfx.destroy();
    this.playerDrones = [];
    this.npcDrones = [];
    this.droneKnocks.clear();

    for (const p of this.playerOilPuddles) p.gfx.destroy();
    for (const p of this.npcOilPuddles) p.gfx.destroy();
    this.playerOilPuddles = [];
    this.npcOilPuddles = [];

    if (this.npcFirewall) { this.npcFirewall.gfx.destroy(); this.npcFirewall = null; }

    if (this.playerOverdriveGfx) { this.playerOverdriveGfx.destroy(); this.playerOverdriveGfx = null; }
    if (this.npcOverdriveGfx) { this.npcOverdriveGfx.destroy(); this.npcOverdriveGfx = null; }
    this.playerOverdriveActive = false;
    this.npcOverdriveActive = false;

    if (this.playerBarrel) { this.playerBarrel.gfx.destroy(); this.playerBarrel = null; }
    if (this.npcBarrel) { this.npcBarrel.gfx.destroy(); this.npcBarrel = null; }

    for (const d of this.detachedDrones) d.gfx.destroy();
    this.detachedDrones = [];

    if (this.playerShieldGen) { this.playerShieldGen.gfx.destroy(); this.playerShieldGen = null; }

    this.clearTurret();
    this.clearNpcTurret();
    this.turretLastCastAt = -Infinity;
    // droneArmorMult is rewritten every frame by updateDroneArray, and a freshly
    // built Player already defaults to 1 — reset() runs before this match's Player exists.

    this.clearTrain();
    this.pointerWasDown = false;
    this.holdDroneAccum = 0;
    this.holdModeActive = false;
    this.playerCommandCooldownUntil = 0;
    this.playerDroneBaseAngle = 0;
    this.npcDroneBaseAngle = 0;
    this.npcOilyBurnAccum = 0;
    this.playerOilyBurnAccum = 0;
    this.trainSpeedBonus = 1;
    this.trainDamageMult = 1;
    this.trainQPlusActive = false;
  }

  // ── Public accessors ──────────────────────────────────────────────────────

  getPlayerDroneCount(): number { return this.playerDrones.length; }
  getNpcDroneCount(): number { return this.npcDrones.length; }
  isPlayerOverdriving(): boolean { return this.playerOverdriveActive; }
  isPlayerTrainActive(): boolean { return this.playerTrainActive; }

  getPlayerSpeedMult(): number {
    const time = this.arena.scene.time.now;
    let mult = 1;
    // Train bonus
    if (this.playerTrainActive) mult *= this.trainSpeedBonus;
    // Puddle slow on player
    if (this.npcOilPuddles.some(p => Phaser.Math.Distance.Between(p.x, p.y, this.arena.player.x, this.arena.player.y) <= p.radius)) {
      mult *= 0.8;
    }
    // Oily slow
    const player = this.arena.player;
    if (player.oilyUntil > time) mult *= 0.75;
    return mult;
  }

  getNpcSpeedMult(): number {
    const time = this.arena.scene.time.now;
    let mult = 1;
    if (this.playerOilPuddles.some(p => Phaser.Math.Distance.Between(p.x, p.y, this.arena.npc.x, this.arena.npc.y) <= p.radius)) {
      mult *= 0.8;
    }
    const npc = this.arena.npc;
    if (npc.oilyUntil > time) mult *= 0.75;
    return mult;
  }

  // ── Player input ──────────────────────────────────────────────────────────

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mx: number, my: number): void {
    // update() has no pointer, so the rig's aim and the drones' lens direction come from here.
    this.lastMouseX = mx;
    this.lastMouseY = my;

    if (this.arena.masteryActive) {
      this.handleTurretInput(time, delta, pointer, mx, my);
      // Mounted: the turret owns both the movement keys and the mouse button.
      if (this.turret?.mounted) {
        this.pointerWasDown = pointer.isDown;
        return;
      }
    }

    if (this.arena.nukeChanneling && !this.playerOverdriveActive) return;
    if (this.playerTrainActive) {
      this.handleTrainInput();
      return;
    }

    const player = this.arena.player;

    // Click: hold-to-spawn or single tap to commandDrones
    if (pointer.isDown && !this.pointerWasDown) {
      this.pointerDownAt = time;
      this.holdDroneAccum = 0;
      this.holdModeActive = false;
    }
    if (pointer.isDown) {
      const held = time - this.pointerDownAt;
      if (held >= 300) {
        if (!this.holdModeActive) {
          this.holdModeActive = true;
          this.holdDroneAccum = 500; // first spawn at 0.5s after hold threshold
        }
        this.holdDroneAccum += delta;
        if (this.holdDroneAccum >= 1000) {
          this.holdDroneAccum -= 1000;
          this.doSpawnDrone('player');
        }
      }
    }
    if (!pointer.isDown && this.pointerWasDown) {
      const held = time - this.pointerDownAt;
      if (held < 300) {
        // Short tap: command drones or barrel-explode
        if (this.playerBarrel?.active) {
          // Fist clenched on a detonator, not a throw.
          this.playPlayerGesture('clap', this.aimFrom(player, mx, my));
          this.explodeBarrel(this.playerBarrel, 'player', true);
          this.playerBarrel = null;
        } else if (time >= this.playerCommandCooldownUntil) {
          if (this.playerDrones.length > 0) this.playPlayerGesture('punch', this.aimFrom(player, mx, my));
          this.doCommandDrones(mx, my, 'player');
          if (this.playerDrones.length > 0) this.playerCommandCooldownUntil = time + 1000;
        }
      }
    }
    this.pointerWasDown = pointer.isDown;

    // A slot the Turret is bound over no longer fires its base ability.
    const turretSlot = this.arena.masteryActive ? this.turretSlot() : null;

    // E: On a Roll (barrel)
    if (turretSlot !== 'e' && Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
      if (player.getCooldownRatio('barrel-roll') >= 1) {
        if (this.playerBarrel?.active) {
          this.explodeBarrel(this.playerBarrel, 'player', false);
          this.playerBarrel = null;
        }
        // Bowled out along the ground, so the arm swings across rather than jabbing.
        this.playPlayerGesture('sweep', this.aimFrom(player, mx, my));
        this.doLaunchBarrel(mx, my, 'player');
        player.startCooldown('barrel-roll');
      }
    }

    // R: Drone Destroy (unchanged)
    if (turretSlot !== 'r' && Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      if (player.getCooldownRatio('drone-destroy') >= 1 && this.playerDrones.length > 0) {
        this.playPlayerGesture('punch', this.aimFrom(player, mx, my));
        this.doLaunchDrone(mx, my, 'player');
        player.startCooldown('drone-destroy');
      }
    }

    // F: Shield Generator
    if (turretSlot !== 'f' && Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
      if (player.getCooldownRatio('shield-gen') >= 1) {
        // Planted into the ground, so the arms come overhead and drive down.
        this.playPlayerGesture('slam', this.aimFrom(player, mx, my));
        this.doPlaceShieldGen(mx, my, 'player');
        player.startCooldown('shield-gen');
      }
    }

    // Q: Train Morph
    if (turretSlot !== 'q' && Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      if (player.getCooldownRatio('train-morph') >= 1 && !this.playerTrainActive) {
        this.playPlayerGesture('raise', this.aimFrom(player, mx, my), 900);
        this.doStartTrainMorph('player');
      }
    }
  }

  /** Aim from a fighter toward a world point, with a safe fallback when they coincide. */
  private aimFrom(f: Fighter, tx: number, ty: number): number {
    const dx = tx - f.x, dy = ty - f.y;
    return dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);
  }

  private playPlayerGesture(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.playerAvatar?.play(gesture, angle, duration);
  }

  /** The opponent's rig mirrors every ability it lands, so an NPC oil user acts too. */
  handleNpcCastId(id: string | null): void {
    if (!id) return;
    const gesture = NPC_GESTURES[id];
    if (!gesture) return;
    const { npc, player } = this.arena;
    this.npcAvatar?.play(gesture, this.aimFrom(npc, player.x, player.y), id === 'train-morph' ? 900 : undefined);
  }

  private handleTrainInput(): void {
    const wKey = this.arena.wKey;
    const aKey = this.arena.aKey;
    const sKey = this.arena.sKey;
    const dKey = this.arena.dKey;
    if (Phaser.Input.Keyboard.JustDown(wKey)) { this.playerTrainDirX = 0; this.playerTrainDirY = -1; }
    if (Phaser.Input.Keyboard.JustDown(sKey)) { this.playerTrainDirX = 0; this.playerTrainDirY = 1; }
    if (Phaser.Input.Keyboard.JustDown(aKey)) { this.playerTrainDirX = -1; this.playerTrainDirY = 0; }
    if (Phaser.Input.Keyboard.JustDown(dKey)) { this.playerTrainDirX = 1; this.playerTrainDirY = 0; }
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(time: number, delta: number, isPlayer: boolean, isNpc: boolean, mouseX: number, mouseY: number): void {
    const dt = delta / 1000;
    this.worldT += dt;
    // Barrel heat bleeds off between bursts, so a turret that has been hosing the arena glows
    // and one that fired a single shot does not.
    this.turretHeat = Math.max(0, this.turretHeat - dt * 0.9);
    this.turretRecoil = Math.max(0, this.turretRecoil - dt * 7);

    this.updateAvatars(time, delta, isPlayer, isNpc);
    this.updateDetachedDrones(delta);
    this.updateProjectileTrails(delta);

    if (isPlayer) {
      this.updateDroneOrbits(this.playerDrones, this.arena.player, 'player', time, delta);
      this.updateOilPuddles(this.playerOilPuddles, time, delta, 'player');
      this.updatePlayerOverdrive(time, delta, mouseX, mouseY);
      this.updateBarrel(this.playerBarrel, time, dt, 'player');
      this.updateShieldGen(time);
      this.updateTrain(time, delta);
      this.updateDroneArray();
      this.updateTurret(time, mouseX, mouseY);
    }
    if (isNpc) {
      this.updateDroneOrbits(this.npcDrones, this.arena.npc, 'npc', time, delta);
      this.updateOilPuddles(this.npcOilPuddles, time, delta, 'npc');
      this.updateNpcOverdrive(time, delta);
      this.updateBarrel(this.npcBarrel, time, dt, 'npc');
      this.updateNpcFirewall();
    }
    // Gasoline — a bashed fighter is shoved by having their velocity written every frame the
    // shove lasts; anything less loses to whatever wrote velocity after us.
    for (const [victim, k] of this.droneKnocks) {
      if (!victim.active || time >= k.until) { this.droneKnocks.delete(victim); continue; }
      (victim.body as Phaser.Physics.Arcade.Body).setVelocity(k.vx, k.vy);
    }

    // Always tick oily burns and visuals for both fighters regardless of which side uses oil
    this.updateOilyBurn(time, delta, 'player');
    this.updateOilyBurn(time, delta, 'npc');
    this.updateOilyVisual('player', time, delta);
    this.updateOilyVisual('npc', time, delta);
  }

  // ── Character rig ─────────────────────────────────────────────────────────

  /**
   * Builds (on first frame) and drives the crude-hand avatar for whichever fighters are oil,
   * plus the Drone Array lattice underneath the player. The player faces the cursor; the NPC
   * faces whoever it is fighting.
   */
  private updateAvatars(time: number, delta: number, isPlayer: boolean, isNpc: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayer && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new OilAvatar(scene, this.pcol);
      const aim = this.aimFrom(player, this.lastMouseX || player.x + 1, this.lastMouseY || player.y);
      this.playerAvatar.setFacing(aim);
      // Overdrive and the coal-stoked train both visibly swell the rig, so the buff reads off
      // the character alone without hunting for what is underneath it.
      this.playerAvatar.setIntensity(this.playerOverdriveActive || this.trainQPlusActive ? 1.35 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Hold priority: bolted to a turret beats surfing a barrel beats assembling a drone.
      if (this.turret?.mounted) this.playerAvatar.setHold('brace', aim);
      else if (this.playerBarrel?.ridden) this.playerAvatar.setHold('ride', aim);
      else if (this.holdModeActive) this.playerAvatar.setHold('charge', aim);
      else this.playerAvatar.setHold(null);
      // While morphed the player *is* the locomotive, so the rig steps aside for it entirely.
      const hidden = this.playerTrainActive || player.forceInvisible;
      this.playerAvatar.update(delta, player.x, player.y, hidden ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpc && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new OilAvatar(scene, this.ncol);
      this.npcAvatar.setFacing(this.aimFrom(npc, player.x, player.y));
      this.npcAvatar.setIntensity(this.npcOverdriveActive ? 1.35 : 1);
      this.npcAvatar.setHold(this.npcBarrel?.ridden ? 'ride' : null);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }

    // Drone Array passive: one armour plate per drone still flying, at a depth below any
    // stance aura so the two stack into one silhouette instead of fighting.
    if (isPlayer && this.arena.masteryActive && player?.active) {
      if (!this.arrayLattice) this.arrayLattice = new DroneArrayLattice(scene, this.pcol);
      this.arrayLattice.setPlates(this.playerDrones.length);
      this.arrayLattice.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.arrayLattice) {
      this.arrayLattice.destroy();
      this.arrayLattice = null;
    }
    void time;
  }

  /** Keeps rotors turning on drones that have left the orbit and are mid-tween. */
  private updateDetachedDrones(delta: number): void {
    for (let i = this.detachedDrones.length - 1; i >= 0; i--) {
      const d = this.detachedDrones[i];
      if (!d.gfx.active) { this.detachedDrones.splice(i, 1); continue; }
      d.spin += delta * 0.05;
      this.drawDrone(d);
    }
  }

  /** Every live oil shot drags a shrinking tail of crude out of its back end. */
  private updateProjectileTrails(delta: number): void {
    this.projTrailAccum += delta;
    if (this.projTrailAccum < 45) return;
    this.projTrailAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-oil') continue;
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      // Trail streams out of the back of the shot rather than puffing symmetrically.
      const back = body ? Math.atan2(-body.velocity.y, -body.velocity.x) : 0;
      fx.spatter(proj.x, proj.y, 2, {
        angle: back, spread: 0.45, speed: 45, size: 2.4, life: 260, fall: 12, depth: 4,
      });
    }
  }

  // ── Drones ────────────────────────────────────────────────────────────────

  private updateDroneOrbits(drones: Drone[], caster: Fighter, owner: 'player' | 'npc', time: number, delta: number): void {
    const count = drones.length;
    const orbitR = Math.max(60, 40 + count * 8);
    const maxDrones = owner === 'player' ? 6 : 4;

    // Advance shared base angle so all drones rotate together
    if (owner === 'player') {
      this.playerDroneBaseAngle += delta * 0.0025;
    } else {
      this.npcDroneBaseAngle += delta * 0.0025;
    }
    const baseAngle = owner === 'player' ? this.playerDroneBaseAngle : this.npcDroneBaseAngle;

    const foe = owner === 'player' ? this.arena.npc : this.arena.player;

    for (let di = 0; di < count; di++) {
      const drone = drones[di];
      const angle = baseAngle + (di * Math.PI * 2 / Math.max(1, count));
      // A drone in the middle of its own run (a bash lunge, a Prime coming home) flies itself.
      if (time >= drone.busyUntil) {
        drone.gfx.setPosition(
          caster.x + Math.cos(angle) * orbitR,
          caster.y + Math.sin(angle) * orbitR,
        );
      }

      // Gasoline — Med-Drone: patches its owner up for as long as it is on station.
      if (drone.kind === 'med' && caster.hp > 0 && caster.hp < caster.maxHp) {
        drone.healAccum += (delta / 1000) * MED_DRONE_HPS;
        if (drone.healAccum >= 1) {
          const heal = Math.floor(drone.healAccum);
          drone.healAccum -= heal;
          caster.hp = Math.min(caster.maxHp, caster.hp + heal);
          this.pfx.sparks(drone.gfx.x, drone.gfx.y, 2, { speed: 60, life: 260, depth: 9 });
          if (owner === 'player') this.arena.showFloatingText(caster.x, caster.y - 40, `+${heal}`, '#66dd66');
        }
      }
      // Rotors keep turning, and the camera lens keeps the enemy in frame while it orbits.
      drone.spin += delta * 0.05;
      drone.aim = foe.hp > 0
        ? Math.atan2(foe.y - drone.gfx.y, foe.x - drone.gfx.x)
        : angle;

      if (owner === 'player' && this.playerShieldGen) {
        const sg = this.playerShieldGen;
        if (time >= drone.healCdUntil) {
          const dsg = Phaser.Math.Distance.Between(drone.gfx.x, drone.gfx.y, sg.x, sg.y);
          if (dsg < 22) {
            if (sg.scrap > 0) sg.scrap--;
            const until = time + this.shieldGenWindow();
            if (!sg.charged || until > sg.chargedUntil) {
              sg.charged = true;
              sg.chargedFrom = time;
              sg.chargedUntil = until;
            }
            drone.healCdUntil = time + 1500;
            this.flashDroneService(drone, sg);
          }
        }
      }
      this.drawDrone(drone);
    }

    // E upgrade (now bundled in Click+): drone melee
    if (owner === 'player' && this.arena.hasUpgrade('click') && !this.playerTrainActive) {
      for (const drone of drones) {
        if (time >= drone.meleeCooldownUntil) {
          const npc = this.arena.npc;
          if (npc.hp > 0 && Phaser.Math.Distance.Between(drone.gfx.x, drone.gfx.y, npc.x, npc.y) <= 25) {
            // A rotor strike, so it throws sparks off the contact rather than a bare number.
            const ang = Math.atan2(npc.y - drone.gfx.y, npc.x - drone.gfx.x);
            this.pfx.sparks(npc.x, npc.y, 6, { angle: ang + Math.PI, spread: 1, speed: 170, life: 300 });
            this.pfx.ring(npc.x, npc.y, 4, 22, OIL.gold, 240, 3, 8);
            this.arena.damagePlayerTargets(drone.gfx.x, drone.gfx.y, 25, 5, OIL.gold);
            drone.meleeCooldownUntil = time + 1000;
          }
        }
      }
    }

    // Remove 0-shot drones
    for (let di = drones.length - 1; di >= 0; di--) {
      if (drones[di].shotsLeft <= 0) {
        drones[di].gfx.destroy();
        drones.splice(di, 1);
      }
    }

    void maxDrones;
  }

  /** Repaints one drone into its own Graphics, in local space around (0,0). */
  private drawDrone(drone: Drone): void {
    const g = drone.gfx;
    if (!g.active) return;
    g.clear();
    OilFx.drawDrone(
      g, drone.owner === 'player' ? this.pcol : this.ncol,
      drone.aim, drone.spin, drone.shotsLeft, drone.maxShots, 1, drone.overcharged,
    );
    if (drone.kind !== 'standard') {
      OilFx.drawDroneBadge(g, drone.owner === 'player' ? this.pcol : this.ncol, drone.kind, drone.spin);
    }
  }

  /** Gasoline: what came off the line this time. Without the perk it is always a standard. */
  private rollDroneKind(owner: 'player' | 'npc'): DroneKind {
    if (!this.arena.hasPerk(owner, 'gasoline')) return 'standard';
    let roll = Math.random();
    for (const entry of GASOLINE_ODDS) {
      if (roll < entry.chance) return entry.kind;
      roll -= entry.chance;
    }
    return 'standard';
  }

  doSpawnDrone(owner: 'player' | 'npc'): void {
    const drones = owner === 'player' ? this.playerDrones : this.npcDrones;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const maxDrones = owner === 'player' ? 6 : 4;
    if (drones.length >= maxDrones) return;
    const count = drones.length;
    const spawnAngle = (count / maxDrones) * Math.PI * 2;
    const sx = caster.x + Math.cos(spawnAngle) * 60;
    const sy = caster.y + Math.sin(spawnAngle) * 60;
    const gfx = this.arena.scene.add.graphics().setPosition(sx, sy).setDepth(8);
    const kind = this.rollDroneKind(owner);
    // A Prime carries a full five rounds whatever else the workshop has fitted.
    const shotsLeft = kind === 'prime' ? 5 : (this.arena.hasPerk(owner, 'bio-fuel') ? 5 : 3);
    const drone: Drone = {
      gfx, shotsLeft, maxShots: shotsLeft, orbitAngle: spawnAngle,
      aim: spawnAngle, spin: Math.random() * 6, overcharged: false,
      meleeCooldownUntil: 0, healCdUntil: 0, owner,
      kind, healAccum: 0, busyUntil: 0,
    };
    drones.push(drone);
    this.drawDrone(drone);
    if (kind !== 'standard' && owner === 'player') {
      this.arena.showFloatingText(sx, sy - 28, `${DRONE_KIND_TAG[kind]}!`, '#ffaa33');
    }

    // Assembly tell: the airframe spins up out of a puff of exhaust with its rotors biting.
    const fx = owner === 'player' ? this.pfx : this.nfx;
    fx.sparks(sx, sy, 7, { speed: 110, life: 320, fall: 40, depth: 9 });
    fx.smoke(sx, sy, 2, 9, 6);
    fx.ring(sx, sy, 3, 24, OIL.gold, 300, 2.5, 8);
    this.arena.scene.tweens.add({
      targets: gfx, scaleX: { from: 0.2, to: 1 }, scaleY: { from: 0.2, to: 1 },
      duration: 220, ease: 'Back.easeOut',
    });

    if (owner === 'player' && this.arena.masteryActive) {
      this.arena.showFloatingText(
        caster.x, caster.y - 36,
        `🛡️ Array ${Math.round(this.droneArrayResist() * 100)}%`, '#66ddff',
      );
    }
  }

  doCommandDrones(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const drones = owner === 'player' ? this.playerDrones : this.npcDrones;
    const scene = this.arena.scene;
    const hasClickPlus = owner === 'player' && this.arena.hasUpgrade('click');
    const foe = owner === 'player' ? this.arena.npc : this.arena.player;

    const fx = owner === 'player' ? this.pfx : this.nfx;

    for (const drone of drones) {
      // Muzzle flare at the drone, a beam to the mark, and a bloom plus sparks where it lands.
      const shotAngle = Math.atan2(ty - drone.gfx.y, tx - drone.gfx.x);
      drone.aim = shotAngle;

      // Gasoline specials spend their shot on something other than the laser.
      if (drone.kind === 'bash') { this.bashDrone(drone, tx, ty, owner); drone.shotsLeft -= 1; continue; }
      if (drone.kind === 'blast') { this.bombDrone(drone, tx, ty, owner); drone.shotsLeft -= 1; continue; }
      fx.muzzleFlash(
        drone.gfx.x + Math.cos(shotAngle) * 6, drone.gfx.y + Math.sin(shotAngle) * 6,
        shotAngle, 0.55, 9,
      );
      fx.beam(drone.gfx.x, drone.gfx.y, tx, ty, { width: 2.6, duration: 200, impact: 9, depth: 8 });

      // A laser landing on an Oily enemy burns the oil straight off them.
      if (foe.hp > 0 && foe.oilyUntil > scene.time.now &&
          Phaser.Math.Distance.Between(tx, ty, foe.x, foe.y) <= 40) {
        foe.oilyUntil = 0;
        foe.oilyBurnUntil = scene.time.now + 5000;
        foe.oilyBurnAccum = 0;
        this.arena.showFloatingText(foe.x, foe.y - 30, 'Ignited!', '#ff6600');
      }

      // Shooting your own puddle sets it alight — it burns twice as hot, so half as long.
      const ownPuddles = owner === 'player' ? this.playerOilPuddles : this.npcOilPuddles;
      for (const p of ownPuddles) {
        if (!p.ignited && Phaser.Math.Distance.Between(tx, ty, p.x, p.y) <= p.radius + 20) {
          this.ignitePuddle(p);
          const remaining = p.expiresAt - scene.time.now;
          p.expiresAt = scene.time.now + remaining * 0.5;
        }
      }

      if (owner === 'player') {
        this.arena.damagePlayerTargets(tx, ty, 40, 3, OIL.gold);
        // Shield generator recharge check
        if (this.playerShieldGen && !this.playerShieldGen.charged) {
          const genDist = Phaser.Math.Distance.Between(tx, ty, this.playerShieldGen.x, this.playerShieldGen.y);
          if (genDist <= 60) {
            this.rechargeShieldGen(this.playerShieldGen, scene.time.now);
          }
        }
      } else {
        // NPC drones damage player
        const player = this.arena.player;
        if (player.hp > 0 && Phaser.Math.Distance.Between(drone.gfx.x, drone.gfx.y, player.x, player.y) <= 40) {
          player.takeDamage(3);
          this.arena.spawnHitFlash(player.x, player.y, OIL.gold);
        }
      }

      drone.shotsLeft -= 1;

      // Destroy enemy projectiles along laser path
      if (owner === 'player') {
        for (const go of this.arena.projectiles.getChildren()) {
          const proj = go as Projectile;
          if (!proj.active || proj.isFromPlayer) continue;
          if (this.arena.pointToSegmentDist(proj.x, proj.y, drone.gfx.x, drone.gfx.y, tx, ty) <= 14) {
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            fx.sparks(proj.x, proj.y, 5, { speed: 140, life: 260, depth: 9 });
          }
        }
      }

    }

    // Bomb 0-shot drones (Click+ upgrade)
    for (let di = drones.length - 1; di >= 0; di--) {
      if (drones[di].shotsLeft <= 0) {
        const dead = drones[di];
        const spawnX = dead.gfx.x, spawnY = dead.gfx.y;
        if (hasClickPlus && owner === 'player') {
          // Spent frame turned into a bomb: the chassis tumbles to the mark trailing smoke
          // with its fuse lamp strobing, then goes up as a real detonation.
          dead.overcharged = false;
          dead.shotsLeft = 0;
          this.detachedDrones.push(dead);
          drones.splice(di, 1);
          const gfx = dead.gfx;
          this.pfx.smoke(spawnX, spawnY, 2, 8, 6);
          scene.tweens.add({
            targets: gfx, x: tx, y: ty, rotation: Math.PI * 2, duration: 400, ease: 'Power2',
            onUpdate: () => { this.pfx.smoke(gfx.x, gfx.y, 1, 4, 5); },
            onComplete: () => {
              this.dropDetachedDrone(dead);
              gfx.destroy();
              this.pfx.explosion(tx, ty, 60, { debris: 5, smoke: 3 });
              this.arena.damagePlayerTargets(tx, ty, 60, 5, OIL.flame);
            },
          });
        } else {
          dead.gfx.destroy();
          drones.splice(di, 1);
          fx.sparks(spawnX, spawnY, 4, { speed: 90, life: 320, depth: 8 });
          fx.smoke(spawnX, spawnY, 1, 7, 5);
        }
      }
    }
  }

  // ── Gasoline specials ─────────────────────────────────────────────────────

  /**
   * Bash-Drone: no laser — it drops off the orbit, rams the mark, and shoves whatever it hits
   * before climbing back onto station. The orbit leaves it alone while `busyUntil` is running.
   */
  private bashDrone(drone: Drone, tx: number, ty: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const fx = owner === 'player' ? this.pfx : this.nfx;
    const gfx = drone.gfx;
    const ang = Math.atan2(ty - gfx.y, tx - gfx.x);
    drone.busyUntil = scene.time.now + BASH_DRONE_MS;

    fx.muzzleFlash(gfx.x, gfx.y, ang + Math.PI, 0.6, 9);
    scene.tweens.add({
      targets: gfx, x: tx, y: ty, duration: BASH_DRONE_MS * 0.5, ease: 'Power2',
      onUpdate: () => { if (gfx.active) fx.smoke(gfx.x, gfx.y, 1, 4, 5); },
      onComplete: () => {
        if (!gfx.active) return;
        // The hit itself: a rotor-first shunt, not an explosion.
        fx.sparks(tx, ty, 8, { angle: ang + Math.PI, spread: 1.1, speed: 220, life: 320 });
        fx.ring(tx, ty, 6, 40, OIL.gold, 280, 3, 9);
        scene.cameras.main.shake(90, 0.003);
        const victim = owner === 'player' ? this.arena.npc : this.arena.player;
        if (owner === 'player') this.arena.damagePlayerTargets(tx, ty, 46, BASH_DRONE_DAMAGE, OIL.gold);
        else if (victim.hp > 0 && Phaser.Math.Distance.Between(tx, ty, victim.x, victim.y) <= 46) {
          victim.takeDamage(BASH_DRONE_DAMAGE);
          this.arena.spawnHitFlash(victim.x, victim.y, OIL.gold);
        }
        // Knockback lands on the duellist — husks take the damage but keep their footing.
        if (victim.hp > 0 && Phaser.Math.Distance.Between(tx, ty, victim.x, victim.y) <= 60) {
          this.droneKnocks.set(victim, {
            vx: Math.cos(ang) * BASH_DRONE_KNOCKBACK,
            vy: Math.sin(ang) * BASH_DRONE_KNOCKBACK,
            until: scene.time.now + BASH_DRONE_KNOCK_MS,
          });
          this.arena.showFloatingText(victim.x, victim.y - 34, '🥊 BASHED!', '#ffaa33');
        }
      },
    });
  }

  /** Blast-Drone: lobs a bomb at the mark instead of firing, for a small blast. */
  private bombDrone(drone: Drone, tx: number, ty: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const fx = owner === 'player' ? this.pfx : this.nfx;
    const from = { x: drone.gfx.x, y: drone.gfx.y };
    const bomb = scene.add.graphics().setDepth(9);
    OilFx.drawBomb(bomb, owner === 'player' ? this.pcol : this.ncol);
    bomb.setPosition(from.x, from.y);
    fx.muzzleFlash(from.x, from.y, Math.atan2(ty - from.y, tx - from.x), 0.5, 9);

    scene.tweens.add({
      targets: bomb, x: tx, y: ty, rotation: Math.PI * 3, duration: 420, ease: 'Quad.easeOut',
      onUpdate: () => { if (bomb.active) fx.smoke(bomb.x, bomb.y, 1, 3, 5); },
      onComplete: () => {
        bomb.destroy();
        fx.explosion(tx, ty, 52, { debris: 5, smoke: 2 });
        if (owner === 'player') {
          this.arena.damagePlayerTargets(tx, ty, 52, BLAST_DRONE_DAMAGE, OIL.flame);
        } else {
          const player = this.arena.player;
          if (player.hp > 0 && Phaser.Math.Distance.Between(tx, ty, player.x, player.y) <= 52) {
            player.takeDamage(BLAST_DRONE_DAMAGE);
            this.arena.spawnHitFlash(player.x, player.y, OIL.flame);
          }
        }
      },
    });
  }

  /** A Prime that survived its run climbs back onto the orbit with everything it left with. */
  private returnDroneHome(drone: Drone): void {
    const drones = drone.owner === 'player' ? this.playerDrones : this.npcDrones;
    const caster = drone.owner === 'player' ? this.arena.player : this.arena.npc;
    this.dropDetachedDrone(drone);
    if (!drone.gfx.active) return;
    const maxDrones = drone.owner === 'player' ? 6 : 4;
    if (drones.length >= maxDrones) { drone.gfx.destroy(); return; }
    drone.busyUntil = this.arena.scene.time.now + 420;
    drone.overcharged = false;
    drones.push(drone);
    this.arena.scene.tweens.add({
      targets: drone.gfx, x: caster.x, y: caster.y, scaleX: 1, scaleY: 1, duration: 400, ease: 'Power2',
      onUpdate: () => { if (drone.gfx.active) this.pfx.smoke(drone.gfx.x, drone.gfx.y, 1, 3, 5); },
    });
    this.arena.showFloatingText(caster.x, caster.y - 44, '⭐ PRIME RETURNS!', '#ffdd66');
  }

  doLaunchDrone(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const drones = owner === 'player' ? this.playerDrones : this.npcDrones;
    if (drones.length === 0) return;
    const drone = drones.pop()!;
    // Gasoline — a Blast-Drone is packed with ordnance, so the kamikaze run hits twice as hard.
    const dmg = drone.kind === 'blast' ? 40 : 20;
    const scene = this.arena.scene;

    // R+ Overclock takes over the whole launch.
    if (owner === 'player' && this.arena.hasUpgrade('r')) {
      this.overclockDrone(drone);
      return;
    }

    const fx = owner === 'player' ? this.pfx : this.nfx;
    const gfx = drone.gfx;
    this.detachedDrones.push(drone);

    // Thruster kick off the orbit, then a run in under a strobing arming lamp.
    const launchAngle = Math.atan2(ty - gfx.y, tx - gfx.x);
    fx.muzzleFlash(gfx.x, gfx.y, launchAngle + Math.PI, 0.7, 9);
    let lamp = 0;
    scene.tweens.add({
      targets: gfx, x: tx, y: ty, duration: 500, ease: 'Power2',
      onUpdate: (tw) => {
        if (!gfx.active) return;
        // Exhaust out the back, and the arming light beating faster the closer it gets.
        const p = Number(tw.getValue());
        fx.smoke(gfx.x, gfx.y, 1, 4, 5);
        if (++lamp % Math.max(1, Math.round(6 - p * 4)) === 0) {
          fx.sparks(gfx.x, gfx.y, 1, { speed: 40, life: 200, depth: 9 });
        }
      },
      onComplete: () => {
        // A Prime pulls up out of the run — the blast still lands, the airframe doesn't.
        if (drone.kind === 'prime') this.returnDroneHome(drone);
        else { this.dropDetachedDrone(drone); gfx.destroy(); }
        fx.explosion(tx, ty, 68, { debris: 6, smoke: 3 });
        this.arena.scene.cameras.main.shake(120, 0.004);
        if (owner === 'player') {
          this.arena.damagePlayerTargets(tx, ty, 60, dmg, OIL.flame);
        } else {
          const player = this.arena.player;
          if (player.hp > 0 && Phaser.Math.Distance.Between(tx, ty, player.x, player.y) <= 60) {
            player.takeDamage(dmg);
            this.arena.spawnHitFlash(player.x, player.y, OIL.flame);
          }
        }
      },
    });
  }

  /**
   * R+ Overclock. Instead of a plain kamikaze run the drone supercharges, dumps every
   * bullet it has left at the cursor, then flies in and detonates. The blast is sized
   * from the shot count it had *before* the volley, so emptying the magazine is free.
   */
  private overclockDrone(drone: Drone): void {
    const scene = this.arena.scene;
    const shots = Math.max(0, drone.shotsLeft);
    // A Blast-Drone doubles whatever the magazine was worth.
    const blastDmg = (5 * shots + 5) * (drone.kind === 'blast' ? 2 : 1);
    const fx = this.pfx;
    this.detachedDrones.push(drone);

    const gfx = drone.gfx;
    const CHARGE_MS = 340;
    const SHOT_GAP_MS = 90;

    // Live cursor — the drone keeps tracking you through the whole sequence.
    const aim = () => {
      const p = this.arena.pointer;
      return { x: p.worldX, y: p.worldY };
    };
    const alive = () => gfx.active;

    // ── Overcharge tell ───────────────────────────────────────────────────
    // The magazine count is kept until the volley actually spends it, so the pip strip
    // visibly empties round by round instead of blanking the instant R is pressed.
    drone.overcharged = true;
    fx.channelPressure(gfx.x, gfx.y, 30, CHARGE_MS, () => (gfx.active ? { x: gfx.x, y: gfx.y } : null), 9);
    scene.tweens.add({ targets: gfx, scaleX: 1.6, scaleY: 1.6, duration: CHARGE_MS, ease: 'Quad.easeIn' });
    this.arena.showFloatingText(gfx.x, gfx.y - 26, '⚡ Overclock', '#2fd6c0');

    // ── Volley: one shot per remaining bullet ────────────────────────────────
    for (let i = 0; i < shots; i++) {
      scene.time.delayedCall(CHARGE_MS + i * SHOT_GAP_MS, () => {
        if (!alive()) return;
        const c = aim();
        const shotAngle = Math.atan2(c.y - gfx.y, c.x - gfx.x);
        drone.aim = shotAngle;
        drone.shotsLeft = Math.max(0, shots - i - 1);
        fx.muzzleFlash(gfx.x + Math.cos(shotAngle) * 8, gfx.y + Math.sin(shotAngle) * 8, shotAngle, 0.7, 10);
        fx.beam(gfx.x, gfx.y, c.x, c.y, { width: 3.4, color: OIL.teal, duration: 190, impact: 12, depth: 9 });

        // Recoil kick away from the target.
        const restX = gfx.x, restY = gfx.y;
        gfx.setPosition(restX - Math.cos(shotAngle) * 6, restY - Math.sin(shotAngle) * 6);
        scene.tweens.add({ targets: gfx, x: restX, y: restY, duration: 70 });

        this.arena.damagePlayerTargets(c.x, c.y, 40, 4, OIL.teal);
      });
    }

    // ── Then the kamikaze run ────────────────────────────────────────────────
    scene.time.delayedCall(CHARGE_MS + shots * SHOT_GAP_MS + 80, () => {
      if (!alive()) { this.dropDetachedDrone(drone); return; }
      const c = aim();
      scene.tweens.add({
        targets: gfx, x: c.x, y: c.y, scaleX: 1, scaleY: 1, duration: 400, ease: 'Power2',
        onUpdate: () => { if (gfx.active) fx.smoke(gfx.x, gfx.y, 1, 5, 5); },
        onComplete: () => {
          // The blast scales with the magazine it burned, not just its radius: more shots
          // means more spatter, more soot, more shrapnel and a longer, harder shake.
          const tier = Math.min(1, shots / 5);
          fx.explosion(c.x, c.y, 72, {
            spatter: 10 + Math.round(shots * 3),
            smoke: 3 + Math.round(tier * 3),
            debris: 6 + Math.round(shots * 2),
            duration: 420 + shots * 60,
          });
          fx.oilPillar(c.x, c.y, 28, 70 + shots * 26);
          fx.ring(c.x, c.y, 10, 90 + shots * 14, OIL.teal, 420, 4, 9);
          scene.cameras.main.shake(150 + shots * 40, 0.005 + tier * 0.004);
          this.arena.damagePlayerTargets(c.x, c.y, 60, blastDmg, OIL.flame);
          if (drone.kind === 'prime') { drone.shotsLeft = drone.maxShots; this.returnDroneHome(drone); }
          else { this.dropDetachedDrone(drone); gfx.destroy(); }
        },
      });
    });
  }

  private dropDetachedDrone(drone: Drone): void {
    const i = this.detachedDrones.indexOf(drone);
    if (i >= 0) this.detachedDrones.splice(i, 1);
  }

  // ── Barrel (E revamp) ─────────────────────────────────────────────────────

  doLaunchBarrel(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 300;
    // Depth 4 keeps the drum under the fighters, so a ridden barrel never hides its rider.
    const gfx = this.arena.scene.add.graphics()
      .setPosition(caster.x, caster.y)
      .setRotation(angle)
      .setDepth(owner === 'player' && this.arena.hasUpgrade('e') ? 4 : 8);
    // E+ Barrel Roll: you throw it out from under yourself, so the ride starts the
    // instant it launches and lasts exactly as long as E stays held.
    const riding = owner === 'player' && this.arena.hasUpgrade('e');
    const barrel: OilBarrel = {
      gfx, x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      targetX: tx, targetY: ty,
      distTraveled: 0, lastPuddleDist: 0,
      owner, active: true,
      ridden: riding, rideDustAccum: 0,
      roll: 0, trailX: caster.x, trailY: caster.y, trailAccum: 0,
    };
    if (owner === 'player') this.playerBarrel = barrel;
    else this.npcBarrel = barrel;
    this.drawBarrel(barrel);

    // The heave: crude slopping out of the drum as it leaves the hands, and a kick of dust.
    const fx = owner === 'player' ? this.pfx : this.nfx;
    fx.spatter(caster.x, caster.y, 6, { angle: angle + Math.PI, spread: 0.8, speed: 130, size: 3.4, life: 460 });
    fx.ring(caster.x, caster.y, 6, 40, OIL.amber, 320, 3, 5);
    if (riding) this.arena.showFloatingText(caster.x, caster.y - 40, '🛢️ Barrel Roll!', '#c47a2a');
  }

  /** Repaints one barrel into its own Graphics, in local space with the drum axis across travel. */
  private drawBarrel(barrel: OilBarrel): void {
    const g = barrel.gfx;
    if (!g.active) return;
    g.clear();
    OilFx.drawBarrel(g, barrel.owner === 'player' ? this.pcol : this.ncol, barrel.roll, 1, barrel.ridden);
  }

  private updateBarrel(barrel: OilBarrel | null, time: number, dt: number, owner: 'player' | 'npc'): void {
    if (!barrel || !barrel.active) return;
    const MARGIN = 36;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();

    // ── E+ Barrel Roll ────────────────────────────────────────────────────
    // While E is held the barrel curves toward the cursor and drags the caster
    // along with it, which is where the mobility comes from.
    if (barrel.ridden) {
      const rider = owner === 'player' ? this.arena.player : this.arena.npc;
      if (!this.arena.eKey.isDown || rider.hp <= 0 || this.playerTrainActive) {
        barrel.ridden = false;
      } else {
        const ptr = this.arena.pointer;
        const speed = Math.hypot(barrel.vx, barrel.vy) || 300;
        const cur = Math.atan2(barrel.vy, barrel.vx);
        const want = Math.atan2(ptr.worldY - barrel.y, ptr.worldX - barrel.x);
        const diff = Phaser.Math.Angle.Wrap(want - cur);
        const turn = (150 * Math.PI / 180) * dt;
        const ang = cur + Math.sign(diff) * Math.min(Math.abs(diff), turn);
        barrel.vx = Math.cos(ang) * speed;
        barrel.vy = Math.sin(ang) * speed;
      }
    }

    const prevX = barrel.x, prevY = barrel.y;
    barrel.x += barrel.vx * dt;
    barrel.y += barrel.vy * dt;
    const step = Math.sqrt((barrel.x - prevX) ** 2 + (barrel.y - prevY) ** 2);
    barrel.distTraveled += step;
    // A 21px half-drum turns once every 2πr of travel, so the staves scroll at the real rate.
    barrel.roll += step / 21;

    // Continuous skid track laid behind the drum rather than a dotted line of puffs.
    barrel.trailAccum += step;
    if (barrel.trailAccum >= 30) {
      barrel.trailAccum = 0;
      const fx = owner === 'player' ? this.pfx : this.nfx;
      fx.skid(barrel.trailX, barrel.trailY, barrel.x, barrel.y, 2);
      barrel.trailX = barrel.x;
      barrel.trailY = barrel.y;
    }

    if (barrel.ridden) {
      // Glue the rider on. body.reset also kills the WASD velocity ArenaScene set
      // this frame, so the barrel is the only thing moving them.
      const rider = owner === 'player' ? this.arena.player : this.arena.npc;
      (rider.body as Phaser.Physics.Arcade.Body).reset(barrel.x, barrel.y);

      // Crude thrown up off the drum by the rider's weight, out of the back of the roll.
      barrel.rideDustAccum += dt * 1000;
      if (barrel.rideDustAccum >= 110) {
        barrel.rideDustAccum -= 110;
        const back = Math.atan2(barrel.vy, barrel.vx) + Math.PI;
        const fx = owner === 'player' ? this.pfx : this.nfx;
        fx.spatter(
          barrel.x + Math.cos(back) * 20, barrel.y + Math.sin(back) * 20, 3,
          { angle: back, spread: 0.7, speed: 120, size: 3.6, life: 480, fall: 60, depth: 5 },
        );
        fx.sparks(barrel.x + Math.cos(back) * 18, barrel.y + Math.sin(back) * 18, 2,
          { angle: back, spread: 0.6, speed: 110, life: 240, depth: 5 });
      }
    }

    // Explode on wall contact
    if (barrel.x <= MARGIN || barrel.x >= W - MARGIN || barrel.y <= MARGIN || barrel.y >= H - MARGIN) {
      this.explodeBarrel(barrel, owner, false);
      if (owner === 'player') this.playerBarrel = null;
      else this.npcBarrel = null;
      return;
    }

    // Drop puddle every 80px
    if (barrel.distTraveled - barrel.lastPuddleDist >= 80) {
      barrel.lastPuddleDist = barrel.distTraveled;
      this.spawnOilPuddle(barrel.x, barrel.y, owner);
    }

    barrel.gfx.setPosition(barrel.x, barrel.y);
    barrel.gfx.setRotation(Math.atan2(barrel.vy, barrel.vx));
    this.drawBarrel(barrel);

    // Explode on enemy contact
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    if (enemy.hp > 0 && Phaser.Math.Distance.Between(barrel.x, barrel.y, enemy.x, enemy.y) < 30) {
      this.explodeBarrel(barrel, owner, false);
      if (owner === 'player') this.playerBarrel = null;
      else this.npcBarrel = null;
      return;
    }

    // Explode when hit by an enemy projectile
    for (const go of this.arena.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active) continue;
      const isEnemyProj = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!isEnemyProj) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, barrel.x, barrel.y) < 30) {
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        this.explodeBarrel(barrel, owner, false);
        if (owner === 'player') this.playerBarrel = null;
        else this.npcBarrel = null;
        return;
      }
    }

    void time;
  }

  private explodeBarrel(barrel: OilBarrel, owner: 'player' | 'npc', clickExplode: boolean): void {
    barrel.active = false;
    barrel.gfx.destroy();
    const x = barrel.x, y = barrel.y;
    const fx = owner === 'player' ? this.pfx : this.nfx;

    // A drum full of fuel going up: ignition flash, a crude fireball, staves flung out as
    // shrapnel, and a column of soot standing over it. A click-detonation is deliberately the
    // bigger one — you chose the moment, so it gets the pillar and the harder shake.
    fx.explosion(x, y, clickExplode ? 84 : 70, {
      spatter: clickExplode ? 16 : 11,
      smoke: clickExplode ? 5 : 3,
      debris: clickExplode ? 12 : 8,
      duration: clickExplode ? 560 : 440,
    });
    if (clickExplode) fx.oilPillar(x, y, 26, 96);
    this.arena.scene.cameras.main.shake(clickExplode ? 220 : 150, clickExplode ? 0.007 : 0.004);

    // Damage
    if (owner === 'player') this.arena.damagePlayerTargets(x, y, 50, 20, OIL.flame);
    else {
      const player = this.arena.player;
      if (player.hp > 0 && Phaser.Math.Distance.Between(x, y, player.x, player.y) <= 50) {
        player.takeDamage(20);
        this.arena.spawnHitFlash(player.x, player.y, OIL.flame);
      }
    }

    // 2 extra puddles at impact
    for (let i = 0; i < 2; i++) {
      const px = x + Phaser.Math.Between(-25, 25);
      const py = y + Phaser.Math.Between(-25, 25);
      const puddle = this.spawnOilPuddle(px, py, owner);
      // Click-explode: ignite these puddles
      if (clickExplode && puddle) this.ignitePuddle(puddle);
    }
  }

  // ── Oil puddles ───────────────────────────────────────────────────────────

  private spawnOilPuddle(x: number, y: number, owner: 'player' | 'npc'): OilPuddle {
    const gfx = this.arena.scene.add.graphics().setDepth(2);
    const puddle: OilPuddle = {
      gfx, x, y,
      expiresAt: this.arena.scene.time.now + 12000,
      ignited: false, igniteTickAccum: 0, radius: 30,
      seed: Math.random() * 10, owner,
    };
    if (owner === 'player') this.playerOilPuddles.push(puddle);
    else this.npcOilPuddles.push(puddle);
    // The spill itself: crude thrown out from the drop point and welling into the pool.
    (owner === 'player' ? this.pfx : this.nfx).spatter(x, y, 5, {
      speed: 90, size: 3, life: 420, fall: 50, depth: 3,
    });
    return puddle;
  }

  /**
   * Single entry point for lighting a puddle, so Oil Mastery's ignite counter can't
   * drift away from the puddles that actually caught fire.
   */
  private ignitePuddle(puddle: OilPuddle): void {
    if (puddle.ignited) return;
    puddle.ignited = true;
    // Catch: a flash across the surface, a low front running out to the rim, and soot.
    const fx = puddle.owner === 'player' ? this.pfx : this.nfx;
    fx.flash(puddle.x, puddle.y, puddle.radius * 0.5, 4);
    fx.ring(puddle.x, puddle.y, 4, puddle.radius * 1.25, OIL.flame, 340, 4, 3);
    fx.gusher(puddle.x, puddle.y, puddle.radius * 0.8, 8, 3);
    fx.smoke(puddle.x, puddle.y, 2, puddle.radius * 0.7, 3);
    if (puddle.owner === 'player') this.arena.recordMasteryStat('puddleIgnites', 1);
  }

  private updateOilPuddles(puddles: OilPuddle[], time: number, delta: number, owner: 'player' | 'npc'): void {
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    const tint = owner === 'player' ? this.pcol : this.ncol;

    for (let pi = puddles.length - 1; pi >= 0; pi--) {
      const p = puddles[pi];
      if (time >= p.expiresAt) {
        p.gfx.destroy();
        puddles.splice(pi, 1);
        continue;
      }

      // Repaint as a living pool. Puddles fade out over their last 600ms rather than
      // blinking away, so a floor covered in them drains instead of popping.
      const left = p.expiresAt - time;
      p.gfx.clear();
      OilFx.drawPuddle(
        p.gfx, tint, p.x, p.y, p.radius, this.worldT,
        left < 600 ? Math.max(0, left / 600) : 1, p.seed, p.ignited,
      );

      // Ignited: instant fire DOT when enemy steps in, plus slow tick damage
      if (p.ignited) {
        const inPuddle = enemy.hp > 0 && Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y) <= p.radius;
        if (inPuddle && enemy.oilyBurnUntil <= time) {
          enemy.oilyBurnUntil = time + 5000;
          enemy.oilyBurnAccum = 0;
          this.arena.showFloatingText(enemy.x, enemy.y - 30, 'Burning!', '#ff4400');
        }
        p.igniteTickAccum += delta;
        if (p.igniteTickAccum >= 300) {
          p.igniteTickAccum -= 300;
          if (inPuddle) {
            enemy.takeDamage(2, { source: p, sourceX: p.x, sourceY: p.y });
            this.arena.spawnHitFlash(enemy.x, enemy.y, OIL.flame);
          }
        }
      }

      // Oily: apply to any enemy standing in the puddle
      if (enemy.hp > 0 && Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y) <= p.radius) {
        enemy.oilyUntil = time + 8000;
      }
    }
  }

  // ── Oily burn ─────────────────────────────────────────────────────────────

  private updateOilyBurn(time: number, delta: number, owner: 'player' | 'npc'): void {
    const target = owner === 'player' ? this.arena.player : this.arena.npc;
    if (target.oilyBurnUntil > time) {
      if (owner === 'player') {
        this.playerOilyBurnAccum += delta;
        if (this.playerOilyBurnAccum >= 500) {
          this.playerOilyBurnAccum -= 500;
          target.takeDamage(3);
          this.arena.spawnHitFlash(target.x, target.y, OIL.flame);
        }
      } else {
        this.npcOilyBurnAccum += delta;
        if (this.npcOilyBurnAccum >= 500) {
          this.npcOilyBurnAccum -= 500;
          target.takeDamage(3);
          this.arena.spawnHitFlash(target.x, target.y, OIL.flame);
        }
      }
    } else {
      if (owner === 'player') this.playerOilyBurnAccum = 0;
      else this.npcOilyBurnAccum = 0;
    }
  }

  // ── Oily visual aura ─────────────────────────────────────────────────────

  /**
   * The Oily debuff's continuous tell, and the burning one layered on top of it. Both states
   * are the same coating — coated crude and coated crude that has caught — so a victim reads
   * the same whichever fighter is wearing it, and the burn is visibly a consequence of the
   * coat rather than an unrelated effect.
   */
  private updateOilyVisual(owner: 'player' | 'npc', time: number, delta: number): void {
    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    const isOily = fighter.oilyUntil > time;
    const isBurning = fighter.oilyBurnUntil > time;
    const existing = owner === 'player' ? this.playerCoat : this.npcCoat;

    if (!isOily && !isBurning) {
      if (existing) {
        existing.destroy();
        if (owner === 'player') this.playerCoat = null; else this.npcCoat = null;
      }
      return;
    }

    // The coating belongs to whoever *applied* it, so a future oil skin recolours the
    // slick their victim is wearing rather than the victim's own palette.
    let coat = existing;
    if (!coat) {
      coat = new OilCoat(this.arena.scene, owner === 'player' ? this.ncol : this.pcol, 27);
      if (owner === 'player') this.playerCoat = coat; else this.npcCoat = coat;
    }
    coat.setBurning(isBurning);
    coat.update(delta, fighter.x, fighter.y, fighter.forceInvisible ? 0 : fighter.alpha);
  }

  // ── Shield Generator (F revamp) ───────────────────────────────────────────

  doPlaceShieldGen(tx: number, ty: number, owner: 'player' | 'npc'): void {
    if (owner !== 'player') return; // NPC keeps old firewall
    if (this.playerShieldGen) this.playerShieldGen.gfx.destroy();
    const now = this.arena.scene.time.now;
    const gfx = this.arena.scene.add.graphics().setDepth(3);
    const gen: ShieldGenerator = {
      gfx, x: tx, y: ty,
      charged: true,
      chargedUntil: now + this.shieldGenWindow(),
      chargedFrom: now,
      scrap: 0,
      blockCount: 0,
      owner,
    };
    this.playerShieldGen = gen;

    // Landing: the plinth slams into the ground and the field snaps up around it.
    this.pfx.ring(tx, ty, 4, 40, OIL.chrome, 300, 4, 4);
    this.pfx.sparks(tx, ty, 10, { speed: 170, life: 340, depth: 9 });
    this.pfx.smoke(tx, ty, 2, 12, 3);
    this.pfx.ring(tx, ty, 20, SHIELD_GEN_RANGE, OIL.teal, 480, 3, 4);
    this.arena.showFloatingText(tx, ty - 24, 'Shield Gen', '#2fd6c0');
  }

  /** How long one charge lasts — the denominator behind the lens dimming as it runs down. */
  private shieldGenWindow(): number {
    return 5000;
  }

  private rechargeShieldGen(gen: ShieldGenerator, now: number): void {
    gen.charged = true;
    gen.chargedFrom = now;
    gen.chargedUntil = now + this.shieldGenWindow();
    this.pfx.ring(gen.x, gen.y, 6, 34, OIL.teal, 320, 4, 4);
    this.pfx.sparks(gen.x, gen.y, 8, { speed: 150, life: 300, depth: 9 });
    this.arena.showFloatingText(gen.x, gen.y - 20, 'Recharged!', '#2fd6c0');
  }

  /** A drone dropping into the generator to service it: a spark shower and a lift-off puff. */
  private flashDroneService(drone: Drone, gen: ShieldGenerator): void {
    this.pfx.sparks(drone.gfx.x, drone.gfx.y, 6, { speed: 90, life: 340, fall: 60, depth: 9 });
    this.pfx.beam(drone.gfx.x, drone.gfx.y, gen.x, gen.y, {
      width: 2, color: OIL.teal, duration: 240, impact: 7, depth: 8,
    });
  }

  private updateShieldGen(time: number): void {
    const gen = this.playerShieldGen;
    if (!gen) return;

    // Discharge at the end of the window
    if (gen.charged && time > gen.chargedUntil) {
      gen.charged = false;
      this.pfx.smoke(gen.x, gen.y, 2, 10, 3);
      this.pfx.sparks(gen.x, gen.y, 5, { speed: 70, life: 400, depth: 9 });
      this.arena.showFloatingText(gen.x, gen.y - 20, 'Needs Recharge', '#888888');
    }

    // Repaint every frame — the rotor turns, the lattice shimmers and the lens dims across
    // the whole charge window, so the time left is readable off the generator itself.
    const window = Math.max(1, gen.chargedUntil - gen.chargedFrom);
    const chargeRatio = gen.charged ? Phaser.Math.Clamp((gen.chargedUntil - time) / window, 0, 1) : 0;
    gen.gfx.clear();
    OilFx.drawGenerator(
      gen.gfx, this.pcol, gen.x, gen.y, this.worldT,
      gen.charged, gen.scrap, chargeRatio, SHIELD_GEN_RANGE,
    );

    if (!gen.charged) return;

    // Scan enemy projectiles inside the field
    for (const go of this.arena.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active || proj.isFromPlayer) continue;
      const dist = Phaser.Math.Distance.Between(proj.x, proj.y, gen.x, gen.y);
      if (dist <= SHIELD_GEN_RANGE) {
        // Destroy projectile
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        this.arena.recordMasteryStat('shieldBlocks', 1);
        if (this.arena.hasUpgrade('f')) {
          gen.blockCount++;
          if (gen.blockCount % 2 === 0) gen.scrap++;
        }
        // Point defence: a beam out to the interception, then the round coming apart.
        this.pfx.beam(gen.x, gen.y, proj.x, proj.y, {
          width: 3, color: OIL.teal, duration: 200, impact: 12, depth: 9,
        });
        this.pfx.ring(proj.x, proj.y, 3, 30, OIL.teal, 280, 3, 9);
        this.pfx.shrapnel(proj.x, proj.y, 4, 26, 9);
        this.arena.damagePlayerTargets(proj.x, proj.y, 30, 8, OIL.teal);
      }
    }
  }

  // ── Old firewall (NPC) ────────────────────────────────────────────────────

  doPlaceFirewallNpc(tx: number, ty: number): void {
    if (this.npcFirewall) this.npcFirewall.gfx.destroy();
    const npc = this.arena.npc;
    const angle = Math.atan2(npc.y - ty, npc.x - tx) - Math.PI / 2;
    const gfx = this.arena.scene.add.graphics().setPosition(tx, ty).setRotation(angle).setDepth(3);
    this.npcFirewall = { gfx, x: tx, y: ty, angle, hp: 100, owner: 'npc' };
    this.nfx.ring(tx, ty, 8, 70, OIL.flame, 380, 4, 4);
    this.nfx.sparks(tx, ty, 10, { speed: 170, life: 360, depth: 5 });
  }

  private updateNpcFirewall(): void {
    if (!this.npcFirewall || this.npcFirewall.hp <= 0) return;
    const fw = this.npcFirewall;
    const fwCos = Math.cos(-fw.angle);
    const fwSin = Math.sin(-fw.angle);
    for (const go of this.arena.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active || !proj.isFromPlayer) continue;
      const relX = proj.x - fw.x;
      const relY = proj.y - fw.y;
      const localX = fwCos * relX - fwSin * relY;
      const localY = fwSin * relX + fwCos * relY;
      if (Math.abs(localX) <= 60 && Math.abs(localY) <= 30) {
        fw.hp -= (proj as Projectile).damage ?? 5;
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        this.nfx.sparks(proj.x, proj.y, 6, { speed: 150, life: 300, depth: 5 });
        if (fw.hp <= 0) {
          this.nfx.explosion(fw.x, fw.y, 66, { debris: 8, smoke: 3 });
          fw.gfx.destroy();
          this.npcFirewall = null;
          break;
        }
      }
    }
    if (this.npcFirewall) this.drawFirewall(this.npcFirewall);
  }

  /**
   * The NPC's blast barrier: a steel hoarding standing in a trench of burning crude. Drawn in
   * local space so the wall lies across the line of fire, and the burn thins as it is chewed
   * through, which is the only readout of how much of it is left.
   */
  private drawFirewall(fw: OilFirewall): void {
    const g = fw.gfx;
    if (!g.active) return;
    g.clear();
    const health = Phaser.Math.Clamp(fw.hp / 100, 0, 1);
    const t = this.worldT;
    const tint = this.ncol;

    // Trench of crude the wall stands in.
    g.fillStyle(tint(OIL.tar), 0.7);
    g.fillRect(-60, -14, 120, 28);
    for (let i = 0; i < 3; i++) {
      const p = t * (0.4 + i * 0.2) + i * 2.1;
      g.fillStyle(tint(i % 2 ? OIL.teal : OIL.violet), 0.18);
      g.fillEllipse(Math.sin(p) * 34, Math.cos(p) * 6, 34, 7);
    }

    // Hoarding: plate with hazard chevrons, and bolt heads at the posts.
    g.fillStyle(tint(OIL.steel), 0.95);
    g.fillRect(-60, -9, 120, 18);
    g.fillStyle(tint(OIL.gold), 0.85);
    for (let i = 0; i < 8; i++) g.fillRect(-58 + i * 15, -9, 7, 18);
    g.lineStyle(2, tint(OIL.crude), 0.95);
    g.strokeRect(-60, -9, 120, 18);
    for (const bx of [-56, 0, 56]) {
      g.fillStyle(tint(OIL.chrome), 0.8);
      g.fillCircle(bx, -6, 2);
      g.fillCircle(bx, 6, 2);
    }

    // Curtain of flame along the top edge — the height is the wall's remaining HP.
    for (let i = 0; i < 9; i++) {
      const x = -54 + i * 13.5;
      const wob = Math.sin(t * (5 + i * 0.5) + i * 1.3);
      oilFlame(g, tint, x, -8, -Math.PI / 2, (14 + wob * 7) * health + 4, 6, wob * 6, 0.85);
    }
  }

  // ── Overdrive (player legacy Q, NPC still uses this) ─────────────────────

  doStartOverdrive(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const drones = owner === 'player' ? this.playerDrones : this.npcDrones;
    if (drones.length === 0) return;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const duration = 500 * drones.length;
    if (owner === 'player') {
      this.playerOverdriveDroneCount = drones.length;
      this.playerOverdriveActive = true;
      this.playerOverdriveEnd = this.arena.scene.time.now + duration;
      this.playerOverdriveAngle = angle;
      this.playerOverdriveTickAccum = 0;
      this.arena.nukeChanneling = true;
      this.arena.nukeChannelEnd = this.playerOverdriveEnd;
      if (!this.playerOverdriveGfx) this.playerOverdriveGfx = this.arena.scene.add.graphics().setDepth(7);
    } else {
      this.npcOverdriveActive = true;
      this.npcOverdriveEnd = this.arena.scene.time.now + duration;
      this.npcOverdriveAngle = angle;
      this.npcOverdriveTickAccum = 0;
      this.arena.npcNukeChanneling = true;
      this.arena.npcNukeChannelEnd = this.npcOverdriveEnd;
      if (!this.npcOverdriveGfx) this.npcOverdriveGfx = this.arena.scene.add.graphics().setDepth(7);
    }
  }

  private updatePlayerOverdrive(time: number, delta: number, mouseX: number, mouseY: number): void {
    if (!this.playerOverdriveActive) return;
    const player = this.arena.player;
    if (time >= this.playerOverdriveEnd) {
      this.playerOverdriveActive = false;
      this.arena.nukeChanneling = false;
      if (this.arena.hasUpgrade('q')) {
        for (let i = 0; i < this.playerOverdriveDroneCount; i++) {
          const mx = mouseX, my = mouseY;
          this.arena.scene.time.delayedCall(i * 500, () => this.fireSalvoBomb(mx, my));
        }
      }
      for (const d of this.playerDrones) {
        this.pfx.smoke(d.gfx.x, d.gfx.y, 1, 7, 5);
        d.gfx.destroy();
      }
      this.playerDrones = [];
      if (this.playerOverdriveGfx) { this.playerOverdriveGfx.destroy(); this.playerOverdriveGfx = null; }
    } else {
      const tgtAng = Math.atan2(mouseY - player.y, mouseX - player.x);
      const diff = Phaser.Math.Angle.Wrap(tgtAng - this.playerOverdriveAngle);
      const rotSpeed = (18 * Math.PI / 180) * delta / 1000;
      this.playerOverdriveAngle += Math.sign(diff) * Math.min(Math.abs(diff), rotSpeed);
      const endX = player.x + Math.cos(this.playerOverdriveAngle) * 1000;
      const endY = player.y + Math.sin(this.playerOverdriveAngle) * 1000;
      if (this.playerOverdriveGfx) {
        this.drawOverdriveBeam(this.playerOverdriveGfx, this.pcol, player.x, player.y, endX, endY);
      }
      this.playerOverdriveTickAccum += delta;
      if (this.playerOverdriveTickAccum >= 100) {
        this.playerOverdriveTickAccum -= 100;
        this.arena.damagePlayerTargets(
          player.x, player.y, 0, 0, 0xff6600, // sentinel call
        );
        // Direct beam damage
        const npc = this.arena.npc;
        if (npc.hp > 0) {
          const d = this.arena.pointToSegmentDist(npc.x, npc.y, player.x, player.y, endX, endY);
          if (d <= 30) {
            npc.takeDamage(15);
            this.arena.spawnHitFlash(npc.x, npc.y, OIL.flame);
          }
        }
      }
    }
  }

  private updateNpcOverdrive(time: number, delta: number): void {
    if (!this.npcOverdriveActive) return;
    const npc = this.arena.npc;
    if (time >= this.npcOverdriveEnd) {
      this.npcOverdriveActive = false;
      this.arena.npcNukeChanneling = false;
      for (const d of this.npcDrones) {
        this.nfx.smoke(d.gfx.x, d.gfx.y, 1, 7, 5);
        d.gfx.destroy();
      }
      this.npcDrones = [];
      if (this.npcOverdriveGfx) { this.npcOverdriveGfx.destroy(); this.npcOverdriveGfx = null; }
    } else {
      const aimX = this.arena.player.x, aimY = this.arena.player.y;
      const tgtAng = Math.atan2(aimY - npc.y, aimX - npc.x);
      const diff = Phaser.Math.Angle.Wrap(tgtAng - this.npcOverdriveAngle);
      const rotSpeed = (18 * Math.PI / 180) * delta / 1000;
      this.npcOverdriveAngle += Math.sign(diff) * Math.min(Math.abs(diff), rotSpeed);
      const endX = npc.x + Math.cos(this.npcOverdriveAngle) * 1000;
      const endY = npc.y + Math.sin(this.npcOverdriveAngle) * 1000;
      if (this.npcOverdriveGfx) {
        this.drawOverdriveBeam(this.npcOverdriveGfx, this.ncol, npc.x, npc.y, endX, endY);
      }
      this.npcOverdriveTickAccum += delta;
      if (this.npcOverdriveTickAccum >= 100) {
        this.npcOverdriveTickAccum -= 100;
        const player = this.arena.player;
        const d = this.arena.pointToSegmentDist(player.x, player.y, npc.x, npc.y, endX, endY);
        if (d <= 30) {
          player.takeDamage(15);
          this.arena.spawnHitFlash(player.x, player.y, OIL.flame);
        }
      }
    }
  }

  /**
   * The Overdrive lance: a churning column of burning crude rather than a flat orange bar.
   * Repainted every frame off `worldT`, so the beam boils along its length while it sweeps.
   */
  private drawOverdriveBeam(
    g: Phaser.GameObjects.Graphics, tint: OilColorFn,
    x1: number, y1: number, x2: number, y2: number,
  ): void {
    g.clear();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const px = -Math.sin(ang), py = Math.cos(ang);
    const t = this.worldT;

    // Outer soot sleeve, so the lance reads as burning fuel rather than as a laser.
    g.lineStyle(30, tint(OIL.tar), 0.3);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();

    // Flame licks flapping off both flanks along the whole run.
    const steps = Math.max(6, Math.round(dist / 60));
    for (let i = 0; i < steps; i++) {
      const f = (i + 0.5) / steps;
      const cx = x1 + (x2 - x1) * f, cy = y1 + (y2 - y1) * f;
      for (const s of [1, -1]) {
        const wob = Math.sin(t * 9 + i * 1.7 + (s > 0 ? 0 : 2.1));
        oilFlame(
          g, tint, cx + px * s * 5, cy + py * s * 5,
          ang + s * (Math.PI / 2) * (0.55 + wob * 0.12),
          14 + wob * 6, 6, wob * 8, 0.7,
        );
      }
    }

    // Core: crude, then flame, then a white heart running the length of the lance.
    g.lineStyle(20, tint(OIL.ember), 0.55);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    g.lineStyle(12, tint(OIL.flame), 0.8);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    g.lineStyle(5 + Math.sin(t * 22) * 1.5, tint(OIL.gold), 0.95);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();

    // Muzzle bloom where the lance leaves the caster.
    g.fillStyle(tint(OIL.white), 0.75);
    g.fillCircle(x1 + Math.cos(ang) * 14, y1 + Math.sin(ang) * 14, 9 + Math.sin(t * 26) * 2);
  }

  private fireSalvoBomb(tx: number, ty: number): void {
    const player = this.arena.player;
    const scene = this.arena.scene;
    const gfx = scene.add.graphics().setPosition(player.x, player.y).setDepth(8);
    OilFx.drawBarrel(gfx, this.pcol, 0, 1, true);
    gfx.setScale(0.42);
    const launch = Math.atan2(ty - player.y, tx - player.x);
    this.pfx.muzzleFlash(player.x, player.y, launch, 0.8, 9);
    scene.tweens.add({
      targets: gfx, x: tx, y: ty, rotation: Math.PI * 3, duration: 450, ease: 'Power2',
      onUpdate: () => { if (gfx.active) this.pfx.smoke(gfx.x, gfx.y, 1, 5, 5); },
      onComplete: () => {
        gfx.destroy();
        this.pfx.explosion(tx, ty, 58, { debris: 6, smoke: 2 });
        this.arena.damagePlayerTargets(tx, ty, 50, 10, OIL.flame);
      },
    });
  }

  // ── Train Morph (Q revamp) ────────────────────────────────────────────────

  doStartTrainMorph(owner: 'player' | 'npc'): void {
    if (owner !== 'player') return; // NPC doesn't train morph
    const droneCount = this.playerDrones.length;
    const duration = Math.max(1500, 1500 * Math.max(1, droneCount));
    const time = this.arena.scene.time.now;
    this.playerTrainActive = true;
    this.playerTrainEndsAt = time + duration;
    this.playerTrainDirX = 1;
    this.playerTrainDirY = 0;
    this.playerTrainSegments = [];
    this.playerTrainPosHistory = [];
    this.playerTrainPuddleAccum = 0;
    this.playerTrainHitAccum = 0;
    this.playerTrainCollectedCoal = 0;
    this.trainSpeedBonus = 1;
    this.trainDamageMult = 1;
    this.trainQPlusActive = false;
    this.playerTrainGfx = this.arena.scene.add.graphics().setDepth(9);

    // Scatter coal pickups
    this.clearCoal();
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();
    for (let i = 0; i < 5; i++) {
      const cx = Phaser.Math.Between(80, W - 80);
      const cy = Phaser.Math.Between(80, H - 80);
      const gfx = this.arena.scene.add.graphics().setPosition(cx, cy).setDepth(3);
      this.coalPickups.push({ gfx, x: cx, y: cy, collected: false, seed: Math.random() * 10 });
    }

    // The morph itself: steam blasted out of the frame as the locomotive assembles.
    const p = this.arena.player;
    this.pfx.ring(p.x, p.y, 8, 90, OIL.chrome, 420, 5, 8);
    this.pfx.smoke(p.x, p.y, 5, 26, 4);
    this.pfx.sparks(p.x, p.y, 14, { speed: 240, life: 420, depth: 9 });
    this.arena.scene.cameras.main.shake(200, 0.005);
    this.arena.showFloatingText(p.x, p.y - 40, 'Train Morph!', '#ff8800');
  }

  private updateTrain(time: number, delta: number): void {
    if (!this.playerTrainActive) return;

    if (time > this.playerTrainEndsAt) {
      this.endTrainMorph();
      return;
    }

    const player = this.arena.player;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();
    const speed = 200 * this.trainSpeedBonus;

    // Apply direction-based movement (override WASD)
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this.playerTrainDirX * speed, this.playerTrainDirY * speed);

    // Record position history (every frame)
    this.playerTrainPosHistory.unshift({ x: player.x, y: player.y });
    const maxHistory = 300; // cap buffer
    if (this.playerTrainPosHistory.length > maxHistory) this.playerTrainPosHistory.length = maxHistory;

    // Update segment positions (each segment trails by ~30px of history)
    const SEGMENT_SPACING = 12; // history frames between segments
    while (this.playerTrainSegments.length < Math.floor(this.playerTrainPosHistory.length / SEGMENT_SPACING)) {
      this.playerTrainSegments.push({ x: player.x, y: player.y, lastHitAt: 0, angle: 0 });
    }
    for (let i = 0; i < this.playerTrainSegments.length; i++) {
      const seg = this.playerTrainSegments[i];
      const histIdx = Math.min((i + 1) * SEGMENT_SPACING, this.playerTrainPosHistory.length - 1);
      seg.x = this.playerTrainPosHistory[histIdx].x;
      seg.y = this.playerTrainPosHistory[histIdx].y;
      // Each car points at whatever is coupled in front of it, so the rake bends round corners
      // instead of every wagon facing the same way.
      const ahead = i === 0 ? { x: player.x, y: player.y } : this.playerTrainSegments[i - 1];
      const dx = ahead.x - seg.x, dy = ahead.y - seg.y;
      if (dx !== 0 || dy !== 0) seg.angle = Math.atan2(dy, dx);
    }

    // Draw the rake back to front so each car overlaps the one behind it, then the locomotive
    // last of all — the head is the player, so it has to sit on top of its own train.
    if (this.playerTrainGfx) {
      const g = this.playerTrainGfx;
      g.clear();
      for (let i = this.playerTrainSegments.length - 1; i >= 0; i--) {
        const seg = this.playerTrainSegments[i];
        OilFx.drawTrainCar(g, this.pcol, seg.x, seg.y, seg.angle, this.worldT, false, this.trainQPlusActive, i);
      }
      const headAngle = Math.atan2(this.playerTrainDirY, this.playerTrainDirX);
      OilFx.drawTrainCar(g, this.pcol, player.x, player.y, headAngle, this.worldT, true, this.trainQPlusActive, 0);
    }

    // Drop oil puddle every 2s (Q+ halves interval)
    this.playerTrainPuddleAccum += delta;
    const puddleInterval = this.trainQPlusActive ? 1000 : 2000;
    if (this.playerTrainPuddleAccum >= puddleInterval) {
      this.playerTrainPuddleAccum -= puddleInterval;
      const puddle = this.spawnOilPuddle(player.x, player.y, 'player');
      if (this.trainQPlusActive && puddle) this.ignitePuddle(puddle);
    }

    // Contact damage on everything the train runs through
    // Head: shared 500ms cooldown
    this.playerTrainHitAccum += delta;
    if (this.playerTrainHitAccum >= 500) {
      this.playerTrainHitAccum = 0;
      const headDmg = Math.round(8 * this.trainDamageMult);
      const res = this.arena.damagePlayerTargetsCounted(player.x, player.y, 28, headDmg, OIL.gold);
      if (res.hits > 0) {
        // Something went under the cowcatcher: sparks off the rails and a shove of soot.
        const ang = Math.atan2(this.playerTrainDirY, this.playerTrainDirX);
        this.pfx.sparks(player.x, player.y, 8, { angle: ang + Math.PI, spread: 1.1, speed: 220, life: 320 });
        this.pfx.smoke(player.x, player.y, 1, 12, 4);
        this.arena.showFloatingText(player.x, player.y - 30, `${headDmg}`, '#ff8800');
      }
      if (res.kills > 0) this.arena.recordMasteryStat('trainKills', res.kills);
    }
    // Each segment has its own 500ms cooldown
    const segDmg = Math.round(3 * this.trainDamageMult);
    for (const seg of this.playerTrainSegments) {
      if (time - seg.lastHitAt < 500) continue;
      const res = this.arena.damagePlayerTargetsCounted(seg.x, seg.y, 20, segDmg, OIL.gold);
      if (res.hits > 0) {
        seg.lastHitAt = time;
        this.pfx.sparks(seg.x, seg.y, 4, { angle: seg.angle + Math.PI, spread: 1, speed: 150, life: 260 });
        if (res.kills > 0) this.arena.recordMasteryStat('trainKills', res.kills);
      }
    }

    // Coal pickup check
    for (const coal of this.coalPickups) {
      if (coal.collected) continue;
      coal.gfx.clear();
      OilFx.drawCoal(coal.gfx, this.pcol, this.worldT, coal.seed);
      if (Phaser.Math.Distance.Between(player.x, player.y, coal.x, coal.y) <= 20) {
        coal.collected = true;
        coal.gfx.destroy();
        this.playerTrainCollectedCoal++;
        this.trainSpeedBonus = Math.min(2.0, this.trainSpeedBonus + 0.05);
        this.trainDamageMult = Math.min(3.0, this.trainDamageMult + 0.1);
        // Shovelled into the firebox: the lump breaks up and the stack answers.
        this.pfx.sparks(coal.x, coal.y, 9, { speed: 130, life: 380, depth: 9 });
        this.pfx.ring(coal.x, coal.y, 3, 26, OIL.gold, 300, 3, 4);
        this.pfx.smoke(player.x, player.y - 6, 2, 10, 4);
        this.arena.showFloatingText(coal.x, coal.y - 20, '🔥 Coal!', '#ffa500');

        // Q+ upgrade: all 5 collected
        if (this.playerTrainCollectedCoal >= 5 && this.arena.hasUpgrade('q') && !this.trainQPlusActive) {
          this.trainQPlusActive = true;
          this.playerTrainEndsAt += 5000;
          this.trainDamageMult *= 2;
          this.arena.recordMasteryStat('coalOverloads', 1);
          // Overload: the boiler lets go — a pillar out of the stack, a blast ring, a shake.
          this.pfx.oilPillar(player.x, player.y, 26, 110);
          this.pfx.ring(player.x, player.y, 10, 130, OIL.flame, 520, 6, 8);
          this.pfx.smoke(player.x, player.y, 5, 26, 4);
          this.arena.scene.cameras.main.shake(280, 0.008);
          this.arena.showFloatingText(player.x, player.y - 50, 'Train Overload!', '#ff4400');
        }
      }
    }

    void W; void H;
  }

  applyTrainMovement(body: Phaser.Physics.Arcade.Body): void {
    if (!this.playerTrainActive) return;
    const speed = 200 * this.trainSpeedBonus;
    body.setVelocity(this.playerTrainDirX * speed, this.playerTrainDirY * speed);
  }

  private endTrainMorph(): void {
    this.playerTrainActive = false;
    if (this.playerTrainGfx) { this.playerTrainGfx.destroy(); this.playerTrainGfx = null; }
    this.clearCoal();
    // Steam dumped off the frame as the rake breaks up back down the line.
    for (let i = 0; i < this.playerTrainSegments.length; i++) {
      const seg = this.playerTrainSegments[i];
      this.arena.scene.time.delayedCall(i * 55, () => {
        this.pfx.smoke(seg.x, seg.y, 2, 12, 4);
        this.pfx.sparks(seg.x, seg.y, 4, { speed: 110, life: 320, depth: 5 });
      });
    }
    this.playerTrainSegments = [];
    this.playerTrainPosHistory = [];
    for (const d of this.playerDrones) d.gfx.destroy();
    this.playerDrones = [];
    const player = this.arena.player;
    this.pfx.smoke(player.x, player.y, 4, 20, 4);
    player.startCooldown('train-morph');
    this.arena.showFloatingText(player.x, player.y - 40, 'Train Over', '#ff8800');
  }

  private clearTrain(): void {
    if (this.playerTrainGfx) { this.playerTrainGfx.destroy(); this.playerTrainGfx = null; }
    this.clearCoal();
    this.playerTrainActive = false;
    this.playerTrainSegments = [];
    this.playerTrainPosHistory = [];
  }

  private clearCoal(): void {
    for (const c of this.coalPickups) c.gfx.destroy();
    this.coalPickups = [];
    this.playerTrainCollectedCoal = 0;
  }

  // ── Oil Mastery: Drone Array ──────────────────────────────────────────────

  /**
   * Drone Array: 10% damage resistance per orbiting drone, refreshed every frame so
   * the bonus falls off the moment a drone is spent, launched, or eaten by the train.
   */
  private updateDroneArray(): void {
    this.arena.player.droneArmorMult = this.arena.masteryActive
      ? Math.max(0, 1 - DRONE_ARRAY_RESIST_PER_DRONE * this.playerDrones.length)
      : 1;
  }

  /** Resistance the array is currently granting, as a 0–1 fraction (for HUD text). */
  private droneArrayResist(): number {
    return Math.min(1, DRONE_ARRAY_RESIST_PER_DRONE * this.playerDrones.length);
  }

  // ── Oil Mastery: Turret ───────────────────────────────────────────────────

  /** The slot the Turret is bound over this match, or null when it is unbound. */
  private turretSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'turret') return s;
    }
    return null;
  }

  private turretKey(slot: 'e' | 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'e' ? this.arena.eKey
      : slot === 'r' ? this.arena.rKey
      : slot === 'f' ? this.arena.fKey
      : this.arena.qKey;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar for the bound slot. */
  getTurretCooldownRatio(time: number): number {
    return Math.min(1, (time - this.turretLastCastAt) / TURRET_COOLDOWN_MS);
  }

  isTurretMounted(): boolean {
    return this.turret?.mounted ?? false;
  }

  private handleTurretInput(
    time: number, delta: number, pointer: Phaser.Input.Pointer, mx: number, my: number,
  ): void {
    const slot = this.turretSlot();
    if (!slot) return;

    // Recast is a three-way switch: summon → mount → dismount.
    if (Phaser.Input.Keyboard.JustDown(this.turretKey(slot)) && !this.playerTrainActive) {
      if (this.turret) this.toggleTurretMount();
      else this.trySummonTurret(time, mx, my);
    }

    if (!this.turret) return;
    if (this.turret.mounted && pointer.isDown) {
      this.turret.fireAccum += delta;
      while (this.turret.fireAccum >= TURRET_FIRE_INTERVAL_MS) {
        this.turret.fireAccum -= TURRET_FIRE_INTERVAL_MS;
        this.fireTurretLaser(mx, my);
      }
    } else {
      // Bank a full interval so the first shot of a hold lands instantly.
      this.turret.fireAccum = TURRET_FIRE_INTERVAL_MS;
    }
  }

  private trySummonTurret(time: number, tx: number, ty: number): void {
    const player = this.arena.player;
    if (time - this.turretLastCastAt < TURRET_COOLDOWN_MS) return;
    if (this.playerDrones.length < TURRET_DRONE_COST) {
      this.arena.showFloatingText(player.x, player.y - 40, `Need ${TURRET_DRONE_COST} Drones`, '#888888');
      return;
    }

    // Three drones fly in and are cannibalised into the mount, so the cost is visible.
    for (let i = 0; i < TURRET_DRONE_COST; i++) {
      const drone = this.playerDrones.pop();
      if (!drone) continue;
      const from = { x: drone.gfx.x, y: drone.gfx.y };
      drone.gfx.destroy();
      this.pfx.beam(from.x, from.y, tx, ty, { width: 2, color: TURRET_COLOR, duration: 260, impact: 8, depth: 9 });
      this.pfx.shrapnel(from.x, from.y, 3, 22, 8);
    }
    this.turretLastCastAt = time;

    this.turret = {
      // Depth 4 sits under the fighters (depth 5) so walking over the turret never hides you.
      gfx: this.arena.scene.add.graphics().setDepth(4),
      x: tx, y: ty,
      hp: TURRET_MAX_HP,
      expiresAt: time + TURRET_DURATION_MS,
      mounted: false,
      fireAccum: TURRET_FIRE_INTERVAL_MS,
    };
    this.turretHeat = 0;
    this.turretRecoil = 0;
    this.pfx.ring(tx, ty, 6, 56, OIL.chrome, 380, 5, 5);
    this.pfx.sparks(tx, ty, 12, { speed: 190, life: 380, depth: 9 });
    this.pfx.smoke(tx, ty, 2, 14, 3);
    this.arena.showFloatingText(tx, ty - 52, '🔫 Turret!', '#2fd6c0');
    // Online: the placement (not the caster-local mount toggles) is the replayed event.
    this.arena.broadcastMasteryCast('turret');
  }

  /** Online replay: the remote oil player placed a Turret — it auto-fires at our local player. */
  doNpcTurret(tx: number, ty: number): void {
    this.clearNpcTurret();
    const now = this.arena.scene.time.now;
    this.npcTurret = {
      gfx: this.arena.scene.add.graphics().setDepth(4),
      x: tx, y: ty,
      hp: TURRET_MAX_HP,
      expiresAt: now + TURRET_DURATION_MS,
      mounted: true,
      fireAccum: TURRET_FIRE_INTERVAL_MS,
    };
    this.nfx.ring(tx, ty, 6, 56, OIL.chrome, 380, 5, 5);
    this.nfx.sparks(tx, ty, 12, { speed: 190, life: 380, depth: 9 });
    this.arena.showFloatingText(tx, ty - 52, '🔫 Turret!', '#2fd6c0');
  }

  /** Online: opponent is oil — run their replayed turret (auto-fire at us; our shots destroy it). */
  updateNpcTurret(time: number, delta: number): void {
    const t = this.npcTurret;
    if (!t) return;
    if (time > t.expiresAt) { this.clearNpcTurret(); return; }

    // Our own shots destroy the turret — the caster-side 75 HP counterplay, mirrored.
    for (const go of this.arena.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active || !proj.isFromPlayer) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, t.x, t.y) > TURRET_BLOCK_RADIUS) continue;
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      t.hp -= proj.damage;
      this.pfx.sparks(proj.x, proj.y, 6, { speed: 150, life: 300, depth: 9 });
      this.arena.spawnHitFlash(t.x, t.y, TURRET_COLOR);
      this.arena.showFloatingText(t.x, t.y - 52, `-${proj.damage}`, '#ff6666');
      if (t.hp <= 0) { this.clearNpcTurret('Turret Destroyed!'); return; }
    }

    // Auto-fire at the local player (its victim). Caster mount/fire state isn't streamed.
    const player = this.arena.player;
    t.fireAccum += delta;
    let fired = false;
    while (t.fireAccum >= TURRET_FIRE_INTERVAL_MS) {
      t.fireAccum -= TURRET_FIRE_INTERVAL_MS;
      fired = true;
      this.nfx.beam(t.x, t.y, player.x, player.y, {
        width: 2.4, color: TURRET_COLOR, duration: 150, impact: 8, depth: 9,
      });
      if (player.active && player.hp > 0) {
        player.takeDamage(TURRET_LASER_DAMAGE);
        this.arena.spawnHitFlash(player.x, player.y, TURRET_COLOR);
      }
    }
    if (fired) {
      this.turretHeat = Math.min(1, this.turretHeat + 0.14);
      this.turretRecoil = 1;
    }
    t.gfx.clear();
    OilFx.drawTurret(
      t.gfx, this.ncol, t.x, t.y, TURRET_RADIUS,
      Math.atan2(player.y - t.y, player.x - t.x), t.hp / TURRET_MAX_HP,
      t.mounted, this.turretHeat, this.turretRecoil,
    );
  }

  private clearNpcTurret(label?: string): void {
    const t = this.npcTurret;
    if (!t) return;
    if (label) {
      this.arena.showFloatingText(t.x, t.y - 52, label, '#ff6666');
      this.nfx.explosion(t.x, t.y, 56, { debris: 9, smoke: 3, slick: false });
    }
    t.gfx.destroy();
    this.npcTurret = null;
  }

  private toggleTurretMount(): void {
    const t = this.turret;
    if (!t) return;
    const player = this.arena.player;

    if (t.mounted) {
      t.mounted = false;
      this.setMountAbsorber(false);
      this.pfx.sparks(t.x, t.y, 6, { speed: 120, life: 300, depth: 9 });
      this.arena.showFloatingText(player.x, player.y - 40, 'Dismount', '#2fd6c0');
      return;
    }

    if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) > TURRET_MOUNT_RANGE) {
      this.arena.showFloatingText(player.x, player.y - 40, 'Too Far', '#888888');
      return;
    }
    t.mounted = true;
    t.fireAccum = TURRET_FIRE_INTERVAL_MS;
    this.setMountAbsorber(true);
    this.pfx.ring(t.x, t.y, 8, 46, TURRET_COLOR, 320, 4, 5);
    this.pfx.sparks(t.x, t.y, 8, { speed: 150, life: 320, depth: 9 });
    this.arena.showFloatingText(t.x, t.y - 52, 'Mounted!', '#2fd6c0');
  }

  /**
   * While mounted the turret eats every hit aimed at the player and pays for it out of
   * its own HP. This runs through Fighter.damageAbsorber rather than the per-frame
   * projectile scan below: the scan only catches shots on the frames it happens to run,
   * and the physics overlap that damages the player can resolve first. The absorber is
   * the only interception point that can't be raced, and it covers melee and AoE too.
   */
  private setMountAbsorber(on: boolean): void {
    const player = this.arena.player;
    if (!on) {
      player.damageAbsorber = null;
      return;
    }
    player.damageAbsorber = (amount: number) => {
      const t = this.turret;
      if (!t || !t.mounted) return false;
      t.hp -= amount;
      this.pfx.sparks(t.x, t.y, 6, { speed: 150, life: 300, depth: 9 });
      this.arena.spawnHitFlash(t.x, t.y, TURRET_COLOR);
      this.arena.showFloatingText(t.x, t.y - 52, `-${amount}`, '#ff6666');
      if (t.hp <= 0) this.destroyTurret('Turret Destroyed!', '#ff6666');
      return true;
    };
  }

  private fireTurretLaser(mx: number, my: number): void {
    const t = this.turret;
    if (!t) return;
    // Fired from the muzzles, not the centre of the plate, so the recoil kick lines up.
    const ang = Math.atan2(my - t.y, mx - t.x);
    const px = -Math.sin(ang), py = Math.cos(ang);
    const side = this.turretHeat > 0.5 ? 1 : -1;
    const mzx = t.x + Math.cos(ang) * (TURRET_RADIUS + 15) + px * side * 5;
    const mzy = t.y + Math.sin(ang) * (TURRET_RADIUS + 15) + py * side * 5;
    this.pfx.beam(mzx, mzy, mx, my, {
      width: 2.4, color: TURRET_COLOR, duration: 150, impact: 8, depth: 9,
    });
    this.turretHeat = Math.min(1, this.turretHeat + 0.14);
    this.turretRecoil = 1;
    this.arena.damagePlayerTargets(mx, my, TURRET_LASER_RADIUS, TURRET_LASER_DAMAGE, TURRET_COLOR);
  }

  private updateTurret(time: number, mouseX: number, mouseY: number): void {
    const t = this.turret;
    if (!t) return;

    if (time > t.expiresAt) {
      this.destroyTurret('Turret Expired', '#888888');
      return;
    }

    // Enemy fire that reaches the turret stops there — that is what the 75 HP is for.
    for (const go of this.arena.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active || proj.isFromPlayer) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, t.x, t.y) > TURRET_BLOCK_RADIUS) continue;
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      t.hp -= proj.damage;
      this.pfx.sparks(proj.x, proj.y, 6, { speed: 150, life: 300, depth: 9 });
      this.arena.spawnHitFlash(t.x, t.y, TURRET_COLOR);
      this.arena.showFloatingText(t.x, t.y - 52, `-${proj.damage}`, '#ff6666');
      if (t.hp <= 0) {
        this.destroyTurret('Turret Destroyed!', '#ff6666');
        return;
      }
    }

    // Mounted: pinned to the turret, aiming with the mouse.
    if (t.mounted) {
      const player = this.arena.player;
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      player.setPosition(t.x, t.y);
    }

    t.gfx.clear();
    OilFx.drawTurret(
      t.gfx, this.pcol, t.x, t.y, TURRET_RADIUS,
      Math.atan2(mouseY - t.y, mouseX - t.x), t.hp / TURRET_MAX_HP,
      t.mounted, this.turretHeat, this.turretRecoil,
    );
  }

  private destroyTurret(label: string, color: string): void {
    const t = this.turret;
    if (!t) return;
    this.arena.showFloatingText(t.x, t.y - 52, label, color);
    this.pfx.explosion(t.x, t.y, 56, { debris: 9, smoke: 3, slick: false });
    this.arena.scene.cameras.main.shake(130, 0.004);
    this.clearTurret();
  }

  /** Single teardown path — every way the turret can end funnels through here. */
  private clearTurret(): void {
    if (!this.turret) return;
    if (this.turret.mounted) this.setMountAbsorber(false);
    this.turret.gfx.destroy();
    this.turret = null;
  }

  // ── NPC dispatchers (called from buildNpcContext) ─────────────────────────

  doNpcSpawnDrone(): void { this.doSpawnDrone('npc'); }

  doNpcCommandDrones(tx: number, ty: number): void { this.doCommandDrones(tx, ty, 'npc'); }

  doNpcLaunchDrone(tx: number, ty: number): void { this.doLaunchDrone(tx, ty, 'npc'); }
}
