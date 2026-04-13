import Phaser from 'phaser';
import { processP2Abilities, P2Scene } from '../combat/P2AbilityHandler';
import { Fighter } from '../entities/Fighter';
import { Player } from '../entities/Player';
import { NpcOpponent, NpcAiState, DIFFICULTY_PRESETS, DifficultyConfig } from '../entities/NpcOpponent';
import { Projectile } from '../combat/Projectile';
import { CastContext } from '../elements/Ability';
import { Element } from '../elements/Element';
import { HealthBar } from '../combat/HealthBar';
import { fireElement } from '../elements/fire';
import { waterElement } from '../elements/water';
import { lifeElement } from '../elements/life';
import { airElement, fireHitscan, fireBounceHitscan } from '../elements/air';
import { earthElement } from '../elements/earth';
import { oilElement } from '../elements/oil';
import { shadowElement } from '../elements/shadow';
import { iceElement } from '../elements/ice';
import { growthElement } from '../elements/growth';
import { crystalElement } from '../elements/crystal';
import { soulElement } from '../elements/soul';
import { huntElement } from '../elements/hunt';
import { sandElement } from '../elements/sand';
import { gravityElement } from '../elements/gravity';
import { creationElement } from '../elements/creation';
import { P2InputState, emptyP2Input } from '../network/P2InputState';
import * as PlayerData from '../data/PlayerData';
import { getTotalRewardMult } from '../data/Mutations';

interface AbilityBarEntry {
  fill: Phaser.GameObjects.Rectangle;
  abilityId: string;
  maxWidth: number;
}

interface Puddle {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface Geyser {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
}

interface PainRainShadow {
  sprite: Phaser.GameObjects.Arc;
  fireAt: number;
  x: number;
  y: number;
  fired: boolean;
  owner: 'player' | 'npc';
  damage: number;
  hitRadius: number;
  color: number;
}

interface Plant {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  healthBar: HealthBar;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  owner: 'player' | 'npc';
  type: 'normal' | 'life' | 'thorn';
  accum: number; // timer accumulator for life/thorn plant special effects
}

interface Drone {
  sprite: Phaser.GameObjects.Arc;
  shotsLeft: number;        // 3 = full, 1 = critical, 0 = spent (destroyed)
  orbitAngle: number;
  shielded: boolean;
  healedByFirewall: boolean; // F upgrade: can only be healed once per drone
  meleeCooldownUntil: number; // E upgrade: per-drone melee cooldown timestamp
  owner: 'player' | 'npc';
}

interface OilPuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  expiresAt: number;
  ignited: boolean;
  igniteTickAccum: number;
  radius: number;
  owner: 'player' | 'npc';
}

interface DarkCloud {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface SnapTrap {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  expiresAt: number;
  x: number;
  y: number;
  triggered: boolean;
  radius: number;
  owner: 'player' | 'npc';
}

interface CrystalNode {
  sprite: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  owner: 'player' | 'npc';
  vx: number;
  vy: number;
  moving: boolean;
  targetX: number; // destination to stop at (non-E+); Infinity = keep going
  targetY: number;
  lastPortalTime: number; // prevents re-entry on same portal frame
}

interface CrystalPortalGate {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  owner: 'player' | 'npc';
}

interface CrystalClone {
  sprite: Phaser.GameObjects.Arc;
  hp: number;
  maxHp: number;
  baseOffsetX: number; // offset in "player-faces-up" local space
  baseOffsetY: number;
  offsetX: number;     // current world-space offset (updated per frame)
  offsetY: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  dirIndicator: Phaser.GameObjects.Rectangle;
}

interface CrystalBeamMine {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  expiresAt: number;
  owner: 'player' | 'npc';
}

interface SoulOrb {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  lastContactTick: number;
}

interface SoulSummon {
  sprite: Phaser.GameObjects.Arc;
  hp: number;
  maxHp: number;
  type: 'basic' | 'ghoul' | 'banshee' | 'knight' | 'corpse' | 'necromancer';
  owner: 'player' | 'npc';
  lastContactTick: number;
  ghoulShootAccum: number;
  dx: number;
  dy: number;
  healAccum: number;        // corpse: self-heal tick accumulator
  necroSummonAccum: number; // necromancer: summon timer
  enhanced: boolean;        // F+ necro enhancement: gold tint + boosted stats
  speedMult: number;        // knight: speed multiplier (Q+ collision stacking)
  slamAccum: number;        // enhanced banshee: slam accumulator
}

interface IcyTrail {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  frostTickAccum: number;
  owner: 'player' | 'npc';
}

interface HuntGrenade {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  startX: number; startY: number;
  vx: number; vy: number;
  explodeAt: number;
  selfDamage: boolean;
  owner: 'player' | 'npc';
  stopped: boolean;
  isHealGrenade?: boolean;
}

interface GarlicTrap {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  owner: 'player' | 'npc';
  nextPulseAt: number;
  expiresAt: number;
}

interface HuntTrailCircle {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  expiresAt: number;
}

interface TimePuddle {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
}

interface GravSlash {
  line: Phaser.GameObjects.Line;
  x1: number; y1: number; x2: number; y2: number;
  fireAt: number;
  owner: 'player' | 'npc';
  damage: number;
  knockback: number;
}

interface GravMeteorShadow {
  sprite: Phaser.GameObjects.Arc;
  fireAt: number;
  x: number; y: number;
  owner: 'player' | 'npc';
  damage: number;
  radius: number;
  directHitRadius: number;
  directBonus: number;
  frozen: boolean;
}

interface GravFirePuddle {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number; y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface PosSnapshot {
  x: number;
  y: number;
  t: number;
}

interface CreationCrucibleBolt {
  tier: 'copper' | 'silver' | 'gold';
  icon: Phaser.GameObjects.Rectangle;
}

interface CreationDagger {
  sprite: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  damage: number;
  owner: 'player' | 'npc';
  hitSet: Set<string>;
  cutSet: Set<CreationBlocker>; // blocks already cut by this dagger
}

interface CreationBoltInFlight {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  tier: 'copper' | 'silver' | 'gold';
  damage: number;
  owner: 'player' | 'npc';
  isRocket?: boolean;
  targetX?: number;
  targetY?: number;
}

interface CreationScythe {
  sprite: Phaser.GameObjects.Rectangle;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  lastContactTick: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
}

interface CreationBlocker {
  rect: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  owner: 'player' | 'npc';
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
}

interface CreationMazeWall {
  rect: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  w: number;
  h: number;
  owner: 'player' | 'npc';
  expireAt: number;
  spiked?: boolean;
  spikeAccum?: number;
}

interface CreationMedkit {
  sprite: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  expireAt: number;
  owner: 'player' | 'npc';
}

interface CreationPulse {
  x: number;
  y: number;
  remaining: number;
  lastPulseAt: number;
  intervalMs: number;
  range: number;
  kind: 'heal' | 'damage';
  magnitude: number;
  owner: 'player' | 'npc';
}

interface CreationSpeedPad {
  rect: Phaser.GameObjects.Rectangle;
  x: number; y: number; w: number; h: number;
  hp: number; maxHp: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  owner: 'player' | 'npc';
}

interface CreationSpikedBlock {
  rect: Phaser.GameObjects.Rectangle;
  x: number; y: number; w: number; h: number;
  hp: number; maxHp: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  owner: 'player' | 'npc';
  tickAccum: number;
  invincible: boolean; // true for maze-spawned spiked blocks
}

interface CreationMech {
  sprite: Phaser.GameObjects.Rectangle;
  stage: 1 | 2 | 3;
  hp: number;
  maxHp: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  rocketAccum: number;
  dodgeCdUntil: number;
}

interface GravMeteorRushShadow {
  rect: Phaser.GameObjects.Rectangle;
  fireAt: number;
  clickX: number;
  clickY: number;
  edge: 'top' | 'bottom' | 'left' | 'right';
}

const ELEMENT_MAP: Record<string, Element> = {
  fire:   fireElement,
  water:  waterElement,
  life:   lifeElement,
  air:    airElement,
  earth:  earthElement,
  oil:    oilElement,
  shadow: shadowElement,
  ice:     iceElement,
  growth:  growthElement,
  crystal: crystalElement,
  soul:    soulElement,
  hunt:    huntElement,
  sand:    sandElement,
  gravity: gravityElement,
  creation: creationElement,
};

const ELEMENT_TEXTURES: Record<string, string> = {
  fire:   'elem-fire',
  water:  'elem-water',
  life:   'elem-life',
  air:    'elem-air',
  earth:  'elem-earth',
  oil:    'elem-oil',
  shadow: 'elem-shadow',
  ice:     'elem-ice',
  growth:  'elem-growth',
  crystal: 'elem-crystal',
  soul:    'elem-soul',
  hunt:    'elem-hunt',
  sand:    'elem-sand',
  gravity: 'elem-gravity',
  creation: 'elem-creation',
};

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private npc!: Fighter;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private playerElement!: Element;
  private npcElement!: Element;
  private elementId = 'fire';
  private npcElementId = 'water';
  private npcDifficulty!: DifficultyConfig;
  private isPvP = false;

  // Network PvP
  private isNetworkPvP = false;
  private networkRole: 'host' | 'guest' | null = null;
  private networkManager: import('../network/NetworkManager').NetworkManager | null = null;
  private stateSendAccum = 0;
  private readonly STATE_SEND_INTERVAL = 50; // ms (20 Hz)
  private networkTick = 0;
  private p2NetworkAimX = 0.5;
  private p2NetworkAimY = 0.5;
  private guestInputSeq = 0;

  // P2 input keys (PvP only)
  private p2UpKey!: Phaser.Input.Keyboard.Key;
  private p2DownKey!: Phaser.Input.Keyboard.Key;
  private p2LeftKey!: Phaser.Input.Keyboard.Key;
  private p2RightKey!: Phaser.Input.Keyboard.Key;
  private p2AimUpKey!: Phaser.Input.Keyboard.Key;
  private p2AimDownKey!: Phaser.Input.Keyboard.Key;
  private p2AimLeftKey!: Phaser.Input.Keyboard.Key;
  private p2AimRightKey!: Phaser.Input.Keyboard.Key;
  private p2ClickKey!: Phaser.Input.Keyboard.Key;
  private p2EKey!: Phaser.Input.Keyboard.Key;
  private p2RKey!: Phaser.Input.Keyboard.Key;
  private p2FKey!: Phaser.Input.Keyboard.Key;
  private p2QKey!: Phaser.Input.Keyboard.Key;
  private p2DodgeKey!: Phaser.Input.Keyboard.Key;

  // P2 aim reticle
  private p2Reticle!: Phaser.GameObjects.Arc;
  private p2ReticleX = 0;
  private p2ReticleY = 0;

  // P2 HUD
  private p2AbilityBars: AbilityBarEntry[] = [];

  // P2 combat state
  private p2DodgeOnCooldown = false;
  private p2IsDodging = false;
  private p2Input: P2InputState = emptyP2Input();
  private p2PrevInput: P2InputState = emptyP2Input();
  private p2ActiveUpgrades: string[] = [];

  // P2 fire-specific state (mirrors player fire state, used when P2 picks fire)
  private p2FlamethrowerHoldMs = 0;
  private p2FlamethrowerTickAccum = 0;
  private p2PressureCharging = false;
  private p2PressureChargeStart = 0;
  private p2PressureTremorAccum = 0;
  private p2PressureChargeVisual: Phaser.GameObjects.Arc | null = null;
  private p2PressureLastTargetX = 0;
  private p2PressureLastTargetY = 0;
  private p2FKeyHeldSince = 0;

  // P2 shared aim — persisted each frame for use in per-frame blocks
  private p2LastAimX = 0;
  private p2LastAimY = 0;

  // P2 water-specific state
  private p2PainRainHolding = false;
  private p2PainRainHoldAccum = 0;

  // P2 earth-specific state
  private p2EarthShieldShedHolding = false;
  private p2EarthShieldShedStart = 0;

  // NPC earth shield shed state (needed when P2 picks earth with F upgrade)
  private npcEarthShieldShedActive = false;
  private npcEarthShieldShedEnd = 0;
  private npcEarthShieldShedBonus = 0;
  private npcEarthShieldShedAura: Phaser.GameObjects.Arc | null = null;

  // P2 soul-specific state
  private p2SoulEHolding = false;
  private p2SoulEHoldStart = 0;
  private p2SoulEHoldVisual: Phaser.GameObjects.Arc | null = null;

  // P2 air-specific state
  private p2AirElectroHolding = false;
  private p2AirElectroHeldSince = 0;
  private p2AirElectroChargeVisual: Phaser.GameObjects.Arc | null = null;

  // NPC air state (needed when P2 picks air with E/Q upgrades)
  private npcAirElectroCharged = false;
  private npcAirBeamWalking = false;   // allow NPC movement during air beam channel

  // P2 shadow-specific state
  private p2ShadowDrainHoldAccum = 0;
  private p2ShadowDrainCloudAccum = 0;

  // NPC shadow dance charge (needed when P2 picks shadow — NPC context is a no-op)
  private npcShadowDanceCharge = 0;

  // NPC shadow black hole state (needed when P2 picks shadow — NPC context is a no-op)
  private npcShadowBlackHoleCharging = false;
  private npcShadowBlackHoleChargeStart = 0;
  private npcShadowBlackHoleChargeVisual: Phaser.GameObjects.Arc | null = null;
  private npcShadowBlackHoleActive = false;
  private npcShadowBlackHoleEnd = 0;
  private npcShadowBlackHoleSprite: Phaser.GameObjects.Graphics | null = null;

  // P2 life-specific state
  private p2LifeRHolding = false;
  private p2LifeRHoldStart = 0;
  private p2LifeRChargeVisual: Phaser.GameObjects.Arc | null = null;
  private p2LifeFHolding = false;
  private p2LifeFHoldStart = 0;
  private p2LifeFChargeVisual: Phaser.GameObjects.Arc | null = null;
  private p2LifeQHolding = false;
  private p2LifeQHoldStart = 0;
  private p2LifeQChargeVisual: Phaser.GameObjects.Arc | null = null;

  // P2 hunt-specific state
  private p2HuntGrenadeHolding = false;
  private p2HuntGrenadeHoldStart = 0;
  private p2HuntGrenadeVisual: Phaser.GameObjects.Arc | null = null;

  // P2 sand-specific state
  private p2TimeBarrageActive = false;

  // NPC oil state — needed when P2 picks oil (firewall + overdrive are no-ops in buildNpcContext)
  private npcFirewallSprite: Phaser.GameObjects.Rectangle | null = null;
  private npcFirewallHp = 0;
  private npcFirewallX = 0;
  private npcFirewallY = 0;
  private npcOverdriveActive = false;
  private npcOverdriveEnd = 0;
  private npcOverdriveAngle = 0;
  private npcOverdriveTickAccum = 0;
  private npcOverdriveGraphics: Phaser.GameObjects.Graphics | null = null;

  // Input keys
  private wKey!: Phaser.Input.Keyboard.Key;
  private aKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;
  private qKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private rKey!: Phaser.Input.Keyboard.Key;
  private fKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Shared state — reset in create()
  private abilityBars: AbilityBarEntry[] = [];
  private dodgeOnCooldown = false;
  private isDodging = false;
  private gameEnded = false;
  private playerSpeedMult = 1;
  private gauntletState: import('../data/GauntletData').GauntletState | null = null;
  private gauntletSpeedMult = 1;

  // Player fire-specific state
  private flameBodyActive = false;
  private flameBodyTickAccum = 0;
  private flameBodyAura: Phaser.GameObjects.Arc | null = null;
  private flamethrowerHoldMs = 0;
  private flamethrowerTickAccum = 0;
  private pointerWasDown = false;
  private nukeChanneling = false;
  private nukeChannelEnd = 0;

  // Player water-specific state
  private splashActiveUntil = 0;
  private splashDropAccum = 0;
  private splashDropCount = 0;         // E upgrade: tracks puddle index in splash sequence
  private painRainHolding = false;     // Q upgrade: hold-to-channel monsoon
  private painRainHoldAccum = 0;       // Q upgrade: accumulator for hold drops
  private playerGeyserBuffUntil = 0;
  private shieldAura: Phaser.GameObjects.Arc | null = null;

  // Player life-specific state
  private playerPlants: Plant[] = [];
  private thornDragActiveUntil = 0;
  private thornDragTickAccum = 0;
  private thornDragAura: Phaser.GameObjects.Arc | null = null;
  // Life upgrade charge tracking
  private lifeRPrevDown = false;
  private lifeRHolding = false;
  private lifeRHoldStart = 0;
  private lifeRChargeVisual: Phaser.GameObjects.Arc | null = null;
  private lifeFPrevDown = false;
  private lifeFHolding = false;
  private lifeFHoldStart = 0;
  private lifeFChargeVisual: Phaser.GameObjects.Arc | null = null;
  private lifeQPrevDown = false;
  private lifeQHolding = false;
  private lifeQHoldStart = 0;
  private lifeQChargeVisual: Phaser.GameObjects.Arc | null = null;

  // Player air-specific state
  private grappleDodgeCharges = 0;
  private grappleDodgeAura: Phaser.GameObjects.Arc | null = null;
  private quickShotCharged = false;
  private airConsecutiveHits = 0;
  private playerWindTrapX = 0;
  private playerWindTrapY = 0;
  private playerWindTrapExpiry = 0;
  private playerWindTrapSprite: Phaser.GameObjects.Arc | null = null;
  // Air upgrade state
  private airElectroHolding = false;
  private airElectroHeldSince = 0;
  private airElectroCharged = false;
  private airElectroChargeVisual: Phaser.GameObjects.Arc | null = null;
  private isGrappling = false;
  private airBeamWalking = false;

  // NPC mirror state
  private npcSpeedMult = 1;
  private npcFlameBodyActive = false;
  private npcFlameBodyTickAccum = 0;
  private npcFlameBodyAura: Phaser.GameObjects.Arc | null = null;
  private npcNukeChanneling = false;
  private npcNukeChannelEnd = 0;
  private npcArmageddonActive = false;
  private npcEnhancedFlameBody = false;
  private npcSplashActiveUntil = 0;
  private npcSplashDropAccum = 0;
  private npcGeyserBuffUntil = 0;
  private npcShieldAura: Phaser.GameObjects.Arc | null = null;
  private npcPlants: Plant[] = [];
  private npcThornDragActiveUntil = 0;
  private npcThornDragTickAccum = 0;
  private npcThornDragAura: Phaser.GameObjects.Arc | null = null;
  private npcQuickShotCharged = false;
  private npcAirConsecutiveHits = 0;
  private npcWindTrapX = 0;
  private npcWindTrapY = 0;
  private npcWindTrapExpiry = 0;
  private npcWindTrapSprite: Phaser.GameObjects.Arc | null = null;

  // Player earth-specific state
  private earthShieldAura: Phaser.GameObjects.Arc | null = null;
  private earthShieldLabel: Phaser.GameObjects.Text | null = null;
  private npcEarthShieldLabel: Phaser.GameObjects.Text | null = null;
  private earthSlamActive = false;
  private earthSlamEnd = 0;
  private earthSlamBouncing = false;
  private earthSlamBounceEnd = 0;
  private earthSlamHitDealt = false;
  private earthSlamLastWallHit = 0;
  // Bull Rush
  private earthBullRushActive = false;
  private earthBullRushEnd = 0;
  private earthBullRushSpeed = 0;
  private earthBullRushLastHit = 0;
  private earthBullRushWallHitLast = 0;
  private earthBullRushDrApplied = false;
  private earthBullRushAura: Phaser.GameObjects.Arc | null = null;
  // Shield Shed (F upgrade)
  private earthShieldShedHolding = false;
  private earthShieldShedStart = 0;
  private earthShieldShedActive = false;
  private earthShieldShedEnd = 0;
  private earthShieldShedBonus = 0;
  private earthShieldShedAura: Phaser.GameObjects.Arc | null = null;

  // Mutations
  private mutations: Set<string> = new Set();
  // Rebirth
  private npcRebirthUsed = false;
  private npcRebirthGlow: Phaser.GameObjects.Arc | null = null;
  // Clone
  private clone: NpcOpponent | null = null;
  private cloneProjectiles: Phaser.Physics.Arcade.Group | null = null;
  private cloneDefeated = false;
  private cloneSpeedMult = 1;
  private cloneNukeChanneling = false;
  private cloneNukeChannelEnd = 0;
  private cloneFlameBodyActive = false;
  private cloneFlameBodyTickAccum = 0;
  private cloneFlameBodyAura: Phaser.GameObjects.Arc | null = null;
  private cloneSplashActiveUntil = 0;
  private cloneSplashDropAccum = 0;
  private cloneGeyserBuffUntil = 0;
  private cloneThornDragActiveUntil = 0;
  private cloneThornDragTickAccum = 0;
  private cloneThornDragAura: Phaser.GameObjects.Arc | null = null;
  private cloneQuickShotCharged = false;
  private cloneAirConsecutiveHits = 0;
  private cloneWindTrapX = 0;
  private cloneWindTrapY = 0;
  private cloneWindTrapExpiry = 0;
  private cloneWindTrapSprite: Phaser.GameObjects.Arc | null = null;
  private cloneEarthSlamActive = false;
  private cloneEarthSlamEnd = 0;
  private cloneEarthSlamHitDealt = false;

  // NPC earth-specific state
  private npcEarthShieldTickAccum = 0;
  private npcEarthShieldAura: Phaser.GameObjects.Arc | null = null;
  private npcEarthSlamActive = false;
  private npcEarthSlamEnd = 0;
  private npcEarthSlamBouncing = false;
  private npcEarthSlamBounceEnd = 0;
  private npcEarthSlamHitDealt = false;
  private npcEarthSlamLastWallHit = 0;
  private npcBullRushActive = false;
  private npcBullRushEnd = 0;
  private npcBullRushSpeed = 0;
  private npcBullRushLastHit = 0;
  private npcBullRushDrApplied = false;
  private npcBullRushAura: Phaser.GameObjects.Arc | null = null;

  // Player oil state
  private playerDrones: Drone[] = [];
  private playerFirewallSprite: Phaser.GameObjects.Rectangle | null = null;
  private playerFirewallHp = 0;
  private playerFirewallX = 0;
  private playerFirewallY = 0;
  private playerFirewallAngle = 0;
  private playerOverdriveActive = false;
  private playerOverdriveEnd = 0;
  private playerOverdriveAngle = 0;
  private playerOverdriveTickAccum = 0;
  private playerOverdriveGraphics: Phaser.GameObjects.Graphics | null = null;
  private playerOverdriveDroneCount = 0;
  private playerOilPuddles: OilPuddle[] = [];
  // NPC oil state
  private npcDrones: Drone[] = [];
  private npcFirewallAngle = 0;
  private npcOilPuddles: OilPuddle[] = [];

  // Shadow state (shared cloud/trap arrays)
  private shadowDarkClouds: DarkCloud[] = [];
  private shadowSnapTraps: SnapTrap[] = [];
  // Player shadow
  private shadowDrainHoldAccum = 0;
  private shadowDrainCloudAccum = 0;
  private shadowTentacleActive = false;
  private shadowTentacleEnd = 0;
  private shadowTentacleX = 0;
  private shadowTentacleY = 0;
  private shadowTentacleHooked = false; // true when NPC is hooked and being dragged
  private shadowTentacleSprite: Phaser.GameObjects.Graphics | null = null;
  private shadowNpcSnaredUntil = 0;
  private shadowNpcStunnedUntil = 0;
  private shadowNpcThrowUntil = 0;
  private shadowDanceCharge = 0;
  private shadowDanceChargeBar: Phaser.GameObjects.Rectangle | null = null;
  private shadowBlackHoleCharging = false;
  private shadowBlackHoleChargeStart = 0;
  private shadowBlackHoleChargeVisual: Phaser.GameObjects.Arc | null = null;
  private shadowBlackHoleActive = false;
  private shadowBlackHoleEnd = 0;
  private shadowBlackHoleSprite: Phaser.GameObjects.Graphics | null = null;
  // NPC shadow
  private npcShadowTentacleActive = false;
  private npcShadowTentacleHooked = false;
  private npcShadowTentacleEnd = 0;
  private npcShadowTentacleX = 0;
  private npcShadowTentacleY = 0;
  private npcShadowTentacleSprite: Phaser.GameObjects.Graphics | null = null;
  private npcShadowDragTargetX = 0;
  private npcShadowDragTargetY = 0;
  private npcShadowDragNextChangeAt = 0;
  private shadowPlayerSnaredUntil = 0;
  private shadowPlayerStunnedUntil = 0;
  // Shadow — upgrade state
  private shadowConsumeActive = false;
  private shadowConsumeEnd = 0;
  private shadowConsumeTickAccum = 0;
  private shadowConsumeAura: Phaser.GameObjects.Arc | null = null;
  private shadowConfusionUntil = 0;
  private shadowConfusionAngle = 0;
  private shadowConfusionNextChange = 0;
  private shadowCloudExposureAccum = 0;
  private shadowDanceUpgradeDodgeUntil = 0;
  private shadowDanceUpgradeCooldownUntil = 0;
  private shadowBHPuddleAccum = 0;

  // Ice — frost stacks (both fighters)
  private npcFrostStacks = 0;
  private playerFrostStacks = 0;
  private npcFrostVisual: Phaser.GameObjects.Text | null = null;
  private playerFrostVisual: Phaser.GameObjects.Text | null = null;
  // Ice — player
  private playerBlockUpActive = false;
  private playerBlockUpAura: Phaser.GameObjects.Arc | null = null;
  private playerFrozenUntil = 0;
  // Ice — NPC
  private npcBlockUpActive = false;
  private npcBlockUpAura: Phaser.GameObjects.Arc | null = null;
  private npcFrozenUntil = 0;
  // Ice — shared
  private icyTrails: IcyTrail[] = [];
  // Ice upgrades state
  private playerBlackIceMorphActive = false;
  private playerBlackIceAura: Phaser.GameObjects.Arc | null = null;
  private npcVoidFrostStacks = 0;
  private npcVoidFrostVisual: Phaser.GameObjects.Text | null = null;
  private npcVoidFrostTickAccum = 0;
  private npcVoidFrostThawAccum = 0;
  private npcVoidedUntil = 0;
  private npcVoidedDps = 0;
  private npcVoidedTickAccum = 0;
  private npcVoidedVisual: Phaser.GameObjects.Text | null = null;
  private playerIceConsecHits = 0;
  private playerNextIcePowered = false;
  private playerIcePendingSet: Set<Projectile> = new Set();
  private playerIceSpeedBoostUntil = 0;
  private npcFrozenSolidAmpReady = false;

  // Growth — player
  private growthMorphType: 'spores' | 'claws' | 'virus' | 'plague-bomb' | 'bacterium' = 'spores';
  private growthDamageMult = 1.0;
  private growthLingerBonus = 0;
  private growthViralBonus = 0;
  private growthBloatCdMs = 10000;
  private growthInfectExtraProj = 0;
  private growthInfectCdMs = 8000;
  private growthRegenRate = 0;
  private growthRegenAccum = 0;
  private growthScaleBonus = 0;
  private growthBloatActive = false;
  private growthBloatEnd = 0;
  private growthBloatAura: Phaser.GameObjects.Arc | null = null;
  private growthMutateMenuOpen = false;
  private growthMutateButtons: Phaser.GameObjects.GameObject[] = [];
  private lastPlayerInfectCast = -99999;
  private lastPlayerBloatCast = -99999;
  // Growth — upgrade/mutation extra state
  private growthBloatAoeRadius = 120;
  private growthInfectBounces = 0;
  private growthInfectHitboxMult = 1.0;
  private growthFungalStacks = 0;
  private growthGreedBonus = 0;
  private growthSneezeStacks = 0;
  private growthCoughStacks = 0;
  private growthSneezeAura: Phaser.GameObjects.Arc | null = null;
  private growthCoughAura: Phaser.GameObjects.Arc | null = null;
  private growthSneezeAccum = 0;
  private growthSpreadStacks = 0;
  private growthBacteriaList: Array<{ sprite: Phaser.GameObjects.Arc; hp: number; lastContactTime: number }> = [];
  private growthInfectBouncers: Array<{ proj: Projectile; bouncesDone: number }> = [];
  // Growth — NPC
  private npcGrowthMorphType: 'spores' | 'claws' | 'virus' = 'spores';
  private npcGrowthDamageMult = 1.0;
  private npcGrowthLingerBonus = 0;
  private npcGrowthViralBonus = 0;
  private npcGrowthBloatCdMs = 10000;
  private npcGrowthInfectExtraProj = 0;
  private npcGrowthRegenRate = 0;
  private npcGrowthRegenAccum = 0;
  private npcGrowthScaleBonus = 0;
  private npcGrowthBloatActive = false;
  private npcGrowthBloatEnd = 0;
  private npcGrowthBloatAura: Phaser.GameObjects.Arc | null = null;
  private lastNpcInfectCast = -99999;
  private lastNpcBloatCast = -99999;
  // Growth — toxic DOT
  private npcToxicUntil = 0;
  private npcToxicDps = 0;
  private npcToxicTickAccum = 0;
  private npcToxicAura: Phaser.GameObjects.Arc | null = null;
  private playerToxicUntil = 0;
  private playerToxicDps = 0;
  private playerToxicTickAccum = 0;
  private playerToxicAura: Phaser.GameObjects.Arc | null = null;

  // Crystal — player
  private crystalNodes: CrystalNode[] = [];
  private crystalPortals: CrystalPortalGate[] = [];
  private crystalClones: CrystalClone[] = [];
  private crystalTrickEnd = 0;
  private crystalBarrageActive = false;
  private crystalBarrageEnd = 0;
  private crystalBarrageAccum = 0;
  private crystalBarrageShots = 0;
  private crystalBarrageTX = 0;
  private crystalBarrageTY = 0;
  private crystalPortalCooldown = 0;
  // Crystal — NPC
  private npcCrystalNodes: CrystalNode[] = [];
  private npcCrystalPortals: CrystalPortalGate[] = [];
  private npcCrystalClones: CrystalClone[] = [];
  private npcCrystalTrickEnd = 0;
  private npcCrystalBarrageActive = false;
  private npcCrystalBarrageEnd = 0;
  private npcCrystalBarrageAccum = 0;
  private npcCrystalBarrageShots = 0;
  private npcCrystalBarrageTX = 0;
  private npcCrystalBarrageTY = 0;
  private npcCrystalPortalCooldown = 0;
  // Crystal — upgrade state
  private crystalShredderActive = false;          // Click+: beam shredder mode
  private crystalShredderTickAccum = 0;            // Click+: tick accumulator
  private crystalClickHoldStart = -99999;          // Click+: hold timer for tap vs hold detection
  private crystalPortalLaserCooldown = -99999;     // 1.5s cooldown for shooting through portal
  private npcCrystalPortalLaserCooldown = -99999;
  private crystalPortalShredderGraceUntil = -99999; // Click+ grace: portal open for beam
  private crystalPortalBarrageGraceUntil = -99999;  // F+ grace: portal open for shards
  private crystalPortalSpeedBuffUntil = -99999;     // F+: speed boost after teleport
  private crystalBeamMines: CrystalBeamMine[] = []; // E+: explosive mines from moving-crystal bounce
  private crystalLaserPreviewGfx: Phaser.GameObjects.Graphics | null = null; // faint aim line

  // Soul — player
  private soulGhosts = 0;
  private soulGhostText: Phaser.GameObjects.Text | null = null;
  private playerSoulOrbs: SoulOrb[] = [];
  private playerSoulSummons: SoulSummon[] = [];
  private soulEHolding = false;
  private soulEHoldStart = 0;
  private soulEHoldVisual: Phaser.GameObjects.Arc | null = null;
  private lastPlayerSoulOrbCast = -99999;
  private lastPlayerSummon = -99999;
  private lastPlayerSacrifice = -99999;
  private lastPlayerConsume = -99999;
  // Soul — haunt mode (Click+ upgrade)
  private soulHauntActive = false;
  private soulHauntDrainAccum = 0;
  private soulHauntVisual: Phaser.GameObjects.Arc | null = null;
  private soulHauntStunUntil = -99999;
  private soulClickHoldStart = -99999;
  // Soul — drain hold (R+ upgrade)
  private soulDrainHolding = false;
  private soulDrainHoldStart = 0;
  private soulDrainLastTick = -99999;
  private soulDrainExplosionDmg = 0;
  private soulDrainVisual: Phaser.GameObjects.Arc | null = null;
  // Soul — F+ buff timers
  private soulGhoulSpeedBuffUntil = -99999;
  private soulBansheeResistUntil = -99999;
  private soulCorpseArmorActive = false;
  private soulCorpseArmorVisual: Phaser.GameObjects.Arc | null = null;
  private soulNecroEnhancedUntil = -99999;
  private soulKnightSpeedBuffUntil = -99999;
  // Soul — NPC scared status
  private npcScaredUntil = -99999;
  // Soul — NPC
  private npcSoulGhosts = 0;
  private npcSoulOrbs: SoulOrb[] = [];
  private npcSoulSummons: SoulSummon[] = [];
  private lastNpcSoulOrbCast = -99999;
  private lastNpcSummon = -99999;
  private lastNpcSacrifice = -99999;
  private lastNpcConsume = -99999;

  // Hunt — player
  private huntBeastForm = false;
  private huntGrenadeHolding = false;
  private huntGrenadeHoldStart = 0;
  private huntGrenadeVisual: Phaser.GameObjects.Arc | null = null;
  private huntGrenades: HuntGrenade[] = [];
  private huntTrailActive = false;
  private huntTrailEnd = 0;
  private huntTrailAccum = 0;
  private huntTrailCircles: HuntTrailCircle[] = [];
  private huntBloodPactActive = false;
  private huntBloodPactEnd = 0;
  private huntBloodPactAura: Phaser.GameObjects.Arc | null = null;
  private huntLeapActive = false;
  private huntLeapEnd = 0;
  private huntLeapTargetX = 0;
  private huntLeapTargetY = 0;
  private npcBleeding = false;
  private npcBleedingUntil = 0;
  private npcBleedAura: Phaser.GameObjects.Arc | null = null;
  private npcHuntSlowUntil = 0;
  private huntBloodMoonActive = false;
  private huntBloodMoonEnd = 0;
  private huntBloodMoonFilter: Phaser.GameObjects.Rectangle | null = null;
  private huntBloodMoonTickAccum = 0;
  private huntNormalHudCards: Phaser.GameObjects.GameObject[] = [];
  private huntBeastHudCards: Phaser.GameObjects.GameObject[] = [];
  private huntNormalFills: AbilityBarEntry[] = [];
  private huntBeastFills: AbilityBarEntry[] = [];
  // Hunt upgrade state — player
  private huntPermTrailActive = false;
  private huntBloodHuntInvincUntil = 0;
  private huntBloodHuntCharging = false;
  private huntBloodHuntChargeEnd = 0;
  private huntLeapTeleported = false;
  private huntVampireForm = false;
  private huntGarlicTraps: GarlicTrap[] = [];
  private huntBatFormActive = false;
  private huntBatFormEnd = 0;
  private huntVampireDrainActive = false;
  private huntVampireDrainEnd = 0;
  private huntVampireDrainAura: Phaser.GameObjects.Arc | null = null;
  private huntVampireDrainAccum = 0;
  private huntVampireHudCards: Phaser.GameObjects.GameObject[] = [];
  private huntVampireFills: AbilityBarEntry[] = [];
  private npcHuntConfusedUntil = 0;
  private npcHuntConfuseVx = 0;
  private npcHuntConfuseVy = 0;
  private npcHuntConfuseDirUntil = 0;
  // Hunt — NPC
  private npcHuntBeastForm = false;
  private npcHuntGrenades: HuntGrenade[] = [];
  private npcHuntTrailActive = false;
  private npcHuntTrailEnd = 0;
  private npcHuntTrailAccum = 0;
  private npcHuntTrailCircles: HuntTrailCircle[] = [];
  private npcHuntBloodPactActive = false;
  private npcHuntBloodPactEnd = 0;
  private npcHuntBloodPactAura: Phaser.GameObjects.Arc | null = null;
  private npcHuntLeapActive = false;
  private npcHuntLeapEnd = 0;
  private npcHuntLeapTargetX = 0;
  private npcHuntLeapTargetY = 0;
  private playerBleeding = false;
  private playerBleedingUntil = 0;
  private playerBleedAura: Phaser.GameObjects.Arc | null = null;
  private playerHuntSlowUntil = 0;
  private npcHuntBloodMoonActive = false;
  private npcHuntBloodMoonEnd = 0;
  private npcHuntBloodMoonFilter: Phaser.GameObjects.Rectangle | null = null;
  private npcHuntBloodMoonTickAccum = 0;

  // Time (replaces Sand) — shared
  private timePuddles: TimePuddle[] = [];
  private playerPosHistory: PosSnapshot[] = [];
  private npcPosHistory: PosSnapshot[] = [];
  private posHistoryAccum = 0;
  // Time — player
  private timeBarrageActive = false;
  private timeBarrageStart = 0;
  private timeBarrageAccum = 0;
  private lastTimeWarpCast = -99999;
  private timeNpcTeleporting = false;
  private timeNpcTeleportStart = 0;
  private timeNpcTeleportFromX = 0;
  private timeNpcTeleportFromY = 0;
  private timeNpcTeleportToX = 0;
  private timeNpcTeleportToY = 0;
  private timeNpcTeleportPuddleAccum = 0;
  private timeRemainActive = false;
  private timeRemainEnd = 0;
  private timeRemainAbsorbed = 0;
  private timeRemainAura: Phaser.GameObjects.Arc | null = null;
  private timeHaltActive = false;
  private timeHaltEnd = 0;
  private timeHaltAura: Phaser.GameObjects.Arc | null = null;
  private timeSlowedProjs: Map<Projectile, { vx: number; vy: number }> = new Map();
  private timeTimelessActive = false;
  private timeTimelessEnd = 0;
  private timeTimelessCharge = 0;
  private timeTimelessChargeBar: Phaser.GameObjects.Rectangle | null = null;
  // Time — NPC
  private npcTimeBarrageAccum = 0;
  private npcTimeBarrageStart = 0;
  private npcPlayerTeleporting = false;
  private npcPlayerTeleportStart = 0;
  private npcPlayerTeleportFromX = 0;
  private npcPlayerTeleportFromY = 0;
  private npcPlayerTeleportToX = 0;
  private npcPlayerTeleportToY = 0;
  private npcPlayerTeleportPuddleAccum = 0;
  private npcTimeRemainActive = false;
  private npcTimeRemainEnd = 0;
  private npcTimeRemainAbsorbed = 0;
  private npcTimeRemainAura: Phaser.GameObjects.Arc | null = null;
  private npcTimeHaltActive = false;
  private npcTimeHaltEnd = 0;
  private npcTimeHaltAura: Phaser.GameObjects.Arc | null = null;
  private npcTimeSlowedProjs: Map<Projectile, { vx: number; vy: number }> = new Map();
  private npcTimeTimelessActive = false;
  private npcTimeTimelessEnd = 0;
  private npcTimeTimelessCharge = 0;

  // Time upgrades — player
  private timeBarrageOverheatTriggered = false;
  private timeWarpSavedPos: { x: number; y: number } | null = null;
  private timeWarpSavedMarker: Phaser.GameObjects.Arc | null = null;
  private timeWarpTriggerPending = false; // E+ second press
  private timeGlassMode = false;
  private timeGlassHoldStart = 0;
  private timeGlassHolding = false;
  private timeGlassModeAura: Phaser.GameObjects.Arc | null = null;
  private timeGlassChargeCircle: Phaser.GameObjects.Arc | null = null;
  private timeGlassChargeText: Phaser.GameObjects.Text | null = null;
  private timeHaltZoomMode = false;
  private timeHpHistory: Array<{ t: number; hp: number }> = [];
  private timeHpHistoryAccum = 0;
  // Time Q rework: freeze state
  private timeFreezeFrozenVelocities: Map<Phaser.GameObjects.GameObject, { vx: number; vy: number }> = new Map();
  private timeFreezeNpcVelX = 0;
  private timeFreezeNpcVelY = 0;

  // Player upgrade state
  private activeUpgrades: string[] = [];
  // Flameshredder (Click upgrade) — NPC burns from player fireballs
  private npcBurningUntil = 0;
  private npcBurnTickAccum = 0;
  private npcBurnAura: Phaser.GameObjects.Arc | null = null;
  // Mastered Flameshredder — player burns from NPC fireballs
  private playerBurningUntil = 0;
  private playerBurnTickAccum = 0;
  private playerBurnAura: Phaser.GameObjects.Arc | null = null;
  // Pressure Charge (R upgrade)
  private pressureCharging = false;
  private pressureChargeStart = 0;
  private pressureChargeVisual: Phaser.GameObjects.Arc | null = null;
  private pressureTremorAccum = 0;
  private pressureLastMouseX = 0;
  private pressureLastMouseY = 0;
  // Flame Affinity (F upgrade)
  private enhancedFlameBody = false;
  private fKeyHeldSince = 0;
  private fKeyWasDown = false;
  // Armageddon (Q upgrade)
  private armageddonActive = false;
  private armageddonChargeVisual: Phaser.GameObjects.Arc | null = null;

  // Gravity-specific state
  private gravPointerDownX = 0;
  private gravPointerDownY = 0;
  private gravClickArmed = false;
  private gravEKeyWasDown = false;
  private gravEKeyHeldSince = 0;
  private gravMeteorRainHolding = false;
  private gravMeteorRainAura: Phaser.GameObjects.Arc | null = null;
  private gravMeteorRainRecorded: { x: number; y: number }[] = [];
  private gravMeteorRainLiveCount = 0;
  private gravBombHolding = false;
  private gravBombHoldStart = 0;
  private gravBombVisual: Phaser.GameObjects.Arc | null = null;
  private gravBombLastX = 0;
  private gravBombLastY = 0;
  private gravSpaceSlamLockUntil = 0;
  private gravLunarShadow: Phaser.GameObjects.Arc | null = null;
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
  private gravAnchor: { x: number; y: number; sprite: Phaser.GameObjects.Arc; line: Phaser.GameObjects.Line; expireAt: number } | null = null;
  private gravMeteorRushShadows: GravMeteorRushShadow[] = [];
  private gravMoonActive = false;
  private gravMoonHolding = false;
  private gravMoonHoldStart = 0;
  private gravMoonHp = 0;
  private gravMoonSprite: Phaser.GameObjects.Arc | null = null;
  private gravMoonHpBar: Phaser.GameObjects.Rectangle | null = null;
  private gravMoonHpBg: Phaser.GameObjects.Rectangle | null = null;
  private gravMoonRamCooldown = 0;
  private gravQWasDown = false;
  private gravMoonChargeCircle: Phaser.GameObjects.Arc | null = null;
  private gravMoonChargeText: Phaser.GameObjects.Text | null = null;

  // Creation-specific state
  // Crucible (shared world object, one per match)
  private crucibleSprite: Phaser.GameObjects.Rectangle | null = null;
  private crucibleLabel: Phaser.GameObjects.Text | null = null;
  private crucibleX = 0;
  private crucibleY = 0;
  private crucibleBolts: CreationCrucibleBolt[] = [];
  // Crafting
  private creatCraftInProgress = false;
  private creatCraftStartTime = 0;
  private creatCraftDuration = 5000;
  private creatCraftOwner: 'player' | 'npc' = 'player';
  // Dagger click-hold
  private creatDaggerHolding = false;
  private creatDaggerHoldStart = 0;
  private creatDaggerHoldX = 0;
  private creatDaggerHoldY = 0;
  private creatDaggerPreviews: Phaser.GameObjects.Line[] = [];
  // Bolt E-charge
  private creatBoltHolding = false;
  private creatBoltHoldStart = 0;
  private creatBoltChargeOrb: Phaser.GameObjects.Arc | null = null;
  // F-block drag
  private creatBlockDragging = false;
  private creatBlockDragStartX = 0;
  private creatBlockDragStartY = 0;
  private creatBlockPreview: Phaser.GameObjects.Rectangle | null = null;
  // Shared in-flight arrays (owner field distinguishes sides)
  private creatDaggers: CreationDagger[] = [];
  private creatBolts: CreationBoltInFlight[] = [];
  private creatScythes: CreationScythe[] = [];
  private creatPulses: CreationPulse[] = [];
  // Persistent world objects
  private creatBlockers: CreationBlocker[] = [];
  private creatMazeWalls: CreationMazeWall[] = [];
  private creatMedkit: CreationMedkit | null = null;
  // Buff timers
  private creatDamageReductionEnd = 0;
  private creatPrevIncomingDamageMult = 1;
  private creatSpeedBoostEnd = 0;
  private creatPrevSpeedMult = -1;

  // Creation upgrades
  private creatLastCraftKey: string | null = null;
  private creatBoltElectroMode = false;
  private creatBuildMode = false;
  private creatBuildBlockDragging = false;
  private creatBuildBlockDragStartX = 0;
  private creatBuildBlockDragStartY = 0;
  private creatBuildBlockPreview: CreationBlocker | null = null;
  private creatBuildNewBlockPreview: Phaser.GameObjects.Rectangle | null = null;
  private creatBuildNewBlockCdUntil = 0;
  private creatBuildLaunchCdUntil = 0;
  private creatBuildLaunchArrows: Phaser.GameObjects.Text[] = [];
  private creatSpeedPads: CreationSpeedPad[] = [];
  private creatSpikedBlocks: CreationSpikedBlock[] = [];
  private creatBuildSpeedPadDragging = false;
  private creatBuildSpeedPadDragStartX = 0;
  private creatBuildSpeedPadDragStartY = 0;
  private creatBuildSpeedPadPreview: Phaser.GameObjects.Rectangle | null = null;
  private creatBuildSpeedPadDragRef: CreationSpeedPad | null = null;
  private creatBuildSpeedPadCdUntil = 0;
  private creatBuildSpikedDragging = false;
  private creatBuildSpikedDragStartX = 0;
  private creatBuildSpikedDragStartY = 0;
  private creatBuildSpikedPreview: Phaser.GameObjects.Rectangle | null = null;
  private creatBuildSpikedDragRef: CreationSpikedBlock | null = null;
  private creatBuildSpikedCdUntil = 0;
  private creatPlayerSpeedPadEnd = 0;
  private creatNpcSlowEnd = 0;
  private creatNpcSlowMult = 1;
  private creatMechHolding = false;
  private creatMechHoldStart = 0;
  private creatMechStageVisual: Phaser.GameObjects.Text | null = null;
  private creatMech: CreationMech | null = null;

  // Shared world effects (owner-aware)
  private puddles: Puddle[] = [];
  private geysers: Geyser[] = [];
  private painRainShadows: PainRainShadow[] = [];

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(data: { elementId: string; enemyElementId?: string; difficulty?: number; mutations?: string[]; isPvP?: boolean; isNetworkPvP?: boolean; networkRole?: 'host' | 'guest'; gauntlet?: import('../data/GauntletData').GauntletState }): void {
    this.elementId = data.elementId ?? 'fire';
    this.isPvP = data.isPvP ?? false;
    this.isNetworkPvP = data.isNetworkPvP ?? false;
    this.networkRole = data.networkRole ?? null;
    const enemyElementId = data.enemyElementId ?? (this.elementId === 'fire' ? 'water' : 'fire');
    this.npcElementId = enemyElementId;
    const difficultyLevel = Math.max(1, Math.min(5, data.difficulty ?? 3));
    const difficultyConfig = DIFFICULTY_PRESETS[difficultyLevel - 1];
    this.npcDifficulty = difficultyConfig;

    this.playerElement = ELEMENT_MAP[this.elementId] ?? fireElement;
    this.npcElement    = ELEMENT_MAP[enemyElementId] ?? waterElement;

    // Reset all mutable state
    this.gameEnded = false;
    this.dodgeOnCooldown = false;
    this.isDodging = false;
    this.abilityBars = [];
    this.playerSpeedMult = 1;
    this.gauntletState = data.gauntlet ?? null;
    this.gauntletSpeedMult = 1;
    this.p2DodgeOnCooldown = false;
    this.p2IsDodging = false;
    this.p2Input = emptyP2Input();
    this.p2PrevInput = emptyP2Input();
    this.p2ActiveUpgrades = [];
    this.p2AbilityBars = [];
    this.p2ReticleX = 0;
    this.p2ReticleY = 0;
    this.p2FlamethrowerHoldMs = 0;
    this.p2FlamethrowerTickAccum = 0;
    this.p2PressureCharging = false;
    this.p2PressureChargeStart = 0;
    this.p2PressureTremorAccum = 0;
    this.p2PressureChargeVisual = null;
    this.p2PressureLastTargetX = 0;
    this.p2PressureLastTargetY = 0;
    this.p2FKeyHeldSince = 0;
    this.stateSendAccum = 0;
    this.networkTick = 0;
    this.p2NetworkAimX = 0.5;
    this.p2NetworkAimY = 0.5;
    this.guestInputSeq = 0;

    this.flameBodyActive = false;
    this.flameBodyTickAccum = 0;
    this.flameBodyAura = null;
    this.flamethrowerHoldMs = 0;
    this.flamethrowerTickAccum = 0;
    this.pointerWasDown = false;
    this.nukeChanneling = false;
    this.nukeChannelEnd = 0;

    this.splashActiveUntil = 0;
    this.splashDropAccum = 0;
    this.splashDropCount = 0;
    this.painRainHolding = false;
    this.painRainHoldAccum = 0;
    this.playerGeyserBuffUntil = 0;
    this.shieldAura = null;

    this.npcSpeedMult = 1;
    this.npcFlameBodyActive = false;
    this.npcFlameBodyTickAccum = 0;
    this.npcFlameBodyAura = null;
    this.npcNukeChanneling = false;
    this.npcNukeChannelEnd = 0;
    this.npcArmageddonActive = false;
    this.npcEnhancedFlameBody = false;
    this.npcSplashActiveUntil = 0;
    this.npcSplashDropAccum = 0;
    this.npcGeyserBuffUntil = 0;
    this.npcShieldAura = null;
    this.npcPlants = [];
    this.npcThornDragActiveUntil = 0;
    this.npcThornDragTickAccum = 0;
    this.npcThornDragAura = null;
    this.npcQuickShotCharged = false;
    this.npcAirConsecutiveHits = 0;
    this.npcWindTrapX = 0;
    this.npcWindTrapY = 0;
    this.npcWindTrapExpiry = 0;
    this.npcWindTrapSprite = null;

    this.playerPlants = [];
    this.thornDragActiveUntil = 0;
    this.thornDragTickAccum = 0;
    this.thornDragAura = null;
    this.lifeRPrevDown = false;
    this.lifeRHolding = false;
    this.lifeRHoldStart = 0;
    this.lifeRChargeVisual = null;
    this.lifeFPrevDown = false;
    this.lifeFHolding = false;
    this.lifeFHoldStart = 0;
    this.lifeFChargeVisual = null;
    this.lifeQPrevDown = false;
    this.lifeQHolding = false;
    this.lifeQHoldStart = 0;
    this.lifeQChargeVisual = null;
    this.grappleDodgeCharges = 0;
    this.grappleDodgeAura = null;
    this.quickShotCharged = false;
    this.airConsecutiveHits = 0;
    this.playerWindTrapX = 0;
    this.playerWindTrapY = 0;
    this.playerWindTrapExpiry = 0;
    this.playerWindTrapSprite = null;
    this.airElectroHolding = false;
    this.airElectroHeldSince = 0;
    this.airElectroCharged = false;
    this.airElectroChargeVisual = null;
    this.isGrappling = false;
    this.airBeamWalking = false;

    this.earthShieldAura = null;
    this.earthShieldLabel = null;
    this.npcEarthShieldLabel = null;
    this.earthSlamActive = false;
    this.earthSlamEnd = 0;
    this.earthSlamBouncing = false;
    this.earthSlamBounceEnd = 0;
    this.earthSlamHitDealt = false;
    this.earthSlamLastWallHit = 0;
    this.earthBullRushActive = false;
    this.earthBullRushEnd = 0;
    this.earthBullRushSpeed = 0;
    this.earthBullRushLastHit = 0;
    this.earthBullRushWallHitLast = 0;
    this.earthBullRushDrApplied = false;
    this.earthBullRushAura = null;
    this.earthShieldShedHolding = false;
    this.earthShieldShedStart = 0;
    this.earthShieldShedActive = false;
    this.earthShieldShedEnd = 0;
    this.earthShieldShedBonus = 0;
    this.earthShieldShedAura = null;

    this.npcEarthShieldTickAccum = 0;
    this.npcEarthShieldAura = null;
    this.npcEarthSlamActive = false;
    this.npcEarthSlamEnd = 0;
    this.npcEarthSlamBouncing = false;
    this.npcEarthSlamBounceEnd = 0;
    this.npcEarthSlamHitDealt = false;
    this.npcEarthSlamLastWallHit = 0;
    this.npcBullRushActive = false;
    this.npcBullRushEnd = 0;
    this.npcBullRushSpeed = 0;
    this.npcBullRushLastHit = 0;
    this.npcBullRushDrApplied = false;
    this.npcBullRushAura = null;

    this.playerDrones = [];
    this.playerFirewallSprite = null;
    this.playerFirewallHp = 0;
    this.playerFirewallX = 0;
    this.playerFirewallY = 0;
    this.playerFirewallAngle = 0;
    this.playerOverdriveActive = false;
    this.playerOverdriveEnd = 0;
    this.playerOverdriveAngle = 0;
    this.playerOverdriveTickAccum = 0;
    this.playerOverdriveGraphics = null;
    this.playerOverdriveDroneCount = 0;
    this.playerOilPuddles = [];
    this.npcDrones = [];
    this.npcFirewallSprite = null;
    this.npcFirewallHp = 0;
    this.npcFirewallX = 0;
    this.npcFirewallY = 0;
    this.npcFirewallAngle = 0;
    this.npcOverdriveActive = false;
    this.npcOverdriveEnd = 0;
    this.npcOverdriveAngle = 0;
    this.npcOverdriveTickAccum = 0;
    this.npcOverdriveGraphics = null;
    this.npcOilPuddles = [];
    this.p2LastAimX = 0;
    this.p2LastAimY = 0;
    this.p2PainRainHolding = false;
    this.p2PainRainHoldAccum = 0;
    this.p2EarthShieldShedHolding = false;
    this.p2EarthShieldShedStart = 0;
    this.npcEarthShieldShedActive = false;
    this.npcEarthShieldShedEnd = 0;
    this.npcEarthShieldShedBonus = 0;
    this.npcEarthShieldShedAura = null;
    this.p2SoulEHolding = false;
    this.p2SoulEHoldStart = 0;
    this.p2SoulEHoldVisual = null;
    this.p2AirElectroHolding = false;
    this.p2AirElectroHeldSince = 0;
    this.p2AirElectroChargeVisual = null;
    this.npcAirElectroCharged = false;
    this.npcAirBeamWalking = false;
    this.p2ShadowDrainHoldAccum = 0;
    this.p2ShadowDrainCloudAccum = 0;
    this.npcShadowDanceCharge = 0;
    this.npcShadowBlackHoleCharging = false;
    this.npcShadowBlackHoleChargeStart = 0;
    this.npcShadowBlackHoleChargeVisual = null;
    this.npcShadowBlackHoleActive = false;
    this.npcShadowBlackHoleEnd = 0;
    this.npcShadowBlackHoleSprite = null;
    this.p2LifeRHolding = false;
    this.p2LifeRHoldStart = 0;
    this.p2LifeRChargeVisual = null;
    this.p2LifeFHolding = false;
    this.p2LifeFHoldStart = 0;
    this.p2LifeFChargeVisual = null;
    this.p2LifeQHolding = false;
    this.p2LifeQHoldStart = 0;
    this.p2LifeQChargeVisual = null;
    this.p2HuntGrenadeHolding = false;
    this.p2HuntGrenadeHoldStart = 0;
    this.p2HuntGrenadeVisual = null;
    this.p2TimeBarrageActive = false;

    this.shadowDarkClouds = [];
    this.shadowSnapTraps = [];
    this.shadowDrainHoldAccum = 0;
    this.shadowDrainCloudAccum = 0;
    this.shadowTentacleActive = false;
    this.shadowTentacleHooked = false;
    this.shadowTentacleEnd = 0;
    this.shadowTentacleX = 0;
    this.shadowTentacleY = 0;
    this.shadowTentacleSprite = null;
    this.shadowNpcSnaredUntil = 0;
    this.shadowNpcStunnedUntil = 0;
    this.shadowNpcThrowUntil = 0;
    this.shadowDanceCharge = 0;
    this.shadowDanceChargeBar = null;
    this.shadowBlackHoleCharging = false;
    this.shadowBlackHoleChargeStart = 0;
    this.shadowBlackHoleChargeVisual = null;
    this.shadowBlackHoleActive = false;
    this.shadowBlackHoleEnd = 0;
    this.shadowBlackHoleSprite = null;
    this.npcShadowTentacleActive = false;
    this.npcShadowTentacleHooked = false;
    this.npcShadowTentacleEnd = 0;
    this.npcShadowTentacleX = 0;
    this.npcShadowTentacleY = 0;
    this.npcShadowTentacleSprite = null;
    this.npcShadowDragTargetX = 0;
    this.npcShadowDragTargetY = 0;
    this.npcShadowDragNextChangeAt = 0;
    this.shadowPlayerSnaredUntil = 0;
    this.shadowPlayerStunnedUntil = 0;
    this.shadowConsumeActive = false;
    this.shadowConsumeEnd = 0;
    this.shadowConsumeTickAccum = 0;
    if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
    this.shadowConfusionUntil = 0;
    this.shadowConfusionAngle = 0;
    this.shadowConfusionNextChange = 0;
    this.shadowCloudExposureAccum = 0;
    this.shadowDanceUpgradeDodgeUntil = 0;
    this.shadowDanceUpgradeCooldownUntil = 0;
    this.shadowBHPuddleAccum = 0;

    this.npcFrostStacks = 0;
    this.playerFrostStacks = 0;
    this.npcFrostVisual = null;
    this.playerFrostVisual = null;
    this.playerBlockUpActive = false;
    this.playerBlockUpAura = null;
    this.playerFrozenUntil = 0;
    this.npcBlockUpActive = false;
    this.npcBlockUpAura = null;
    this.npcFrozenUntil = 0;
    this.icyTrails = [];
    this.playerBlackIceMorphActive = false;
    this.playerBlackIceAura = null;
    this.npcVoidFrostStacks = 0;
    this.npcVoidFrostVisual = null;
    this.npcVoidFrostTickAccum = 0;
    this.npcVoidFrostThawAccum = 0;
    this.npcVoidedUntil = 0;
    this.npcVoidedDps = 0;
    this.npcVoidedTickAccum = 0;
    this.npcVoidedVisual = null;
    this.playerIceConsecHits = 0;
    this.playerNextIcePowered = false;
    this.playerIcePendingSet = new Set();
    this.playerIceSpeedBoostUntil = 0;
    this.npcFrozenSolidAmpReady = false;

    for (const n of this.crystalNodes) n.sprite.destroy();
    for (const p of this.crystalPortals) { p.sprite.destroy(); p.label.destroy(); }
    for (const c of this.crystalClones) { c.sprite.destroy(); c.hpBar.destroy(); c.hpBg.destroy(); c.dirIndicator.destroy(); }
    for (const m of this.crystalBeamMines) m.sprite.destroy();
    this.crystalNodes = []; this.crystalPortals = []; this.crystalClones = []; this.crystalBeamMines = [];
    this.crystalTrickEnd = 0; this.crystalBarrageActive = false;
    this.crystalPortalCooldown = 0;
    this.crystalShredderActive = false; this.crystalShredderTickAccum = 0; this.crystalClickHoldStart = -99999;
    this.crystalPortalLaserCooldown = -99999; this.crystalPortalShredderGraceUntil = -99999;
    this.crystalPortalBarrageGraceUntil = -99999; this.crystalPortalSpeedBuffUntil = -99999;
    if (this.crystalLaserPreviewGfx) { this.crystalLaserPreviewGfx.destroy(); this.crystalLaserPreviewGfx = null; }

    for (const n of this.npcCrystalNodes) n.sprite.destroy();
    for (const p of this.npcCrystalPortals) { p.sprite.destroy(); p.label.destroy(); }
    for (const c of this.npcCrystalClones) { c.sprite.destroy(); c.hpBar.destroy(); c.hpBg.destroy(); c.dirIndicator.destroy(); }
    this.npcCrystalNodes = []; this.npcCrystalPortals = []; this.npcCrystalClones = [];
    this.npcCrystalTrickEnd = 0; this.npcCrystalBarrageActive = false;
    this.npcCrystalPortalCooldown = 0; this.npcCrystalPortalLaserCooldown = -99999;

    for (const o of this.playerSoulOrbs) o.sprite.destroy();
    for (const s of this.playerSoulSummons) s.sprite.destroy();
    for (const o of this.npcSoulOrbs) o.sprite.destroy();
    for (const s of this.npcSoulSummons) s.sprite.destroy();
    this.playerSoulOrbs = []; this.playerSoulSummons = [];
    this.npcSoulOrbs = []; this.npcSoulSummons = [];
    this.soulGhosts = 0; this.npcSoulGhosts = 0;
    this.soulGhostText = null;
    this.soulEHolding = false; this.soulEHoldStart = 0;
    if (this.soulEHoldVisual) { this.soulEHoldVisual.destroy(); this.soulEHoldVisual = null; }
    this.lastPlayerSoulOrbCast = -99999; this.lastPlayerSummon = -99999;
    this.lastPlayerSacrifice = -99999; this.lastPlayerConsume = -99999;
    this.lastNpcSoulOrbCast = -99999; this.lastNpcSummon = -99999;
    this.soulHauntActive = false; this.soulHauntDrainAccum = 0; this.soulHauntStunUntil = -99999; this.soulClickHoldStart = -99999;
    if (this.soulHauntVisual) { this.soulHauntVisual.destroy(); this.soulHauntVisual = null; }
    this.soulDrainHolding = false; this.soulDrainHoldStart = 0; this.soulDrainLastTick = -99999; this.soulDrainExplosionDmg = 0;
    if (this.soulDrainVisual) { this.soulDrainVisual.destroy(); this.soulDrainVisual = null; }
    this.soulGhoulSpeedBuffUntil = -99999; this.soulBansheeResistUntil = -99999;
    this.soulNecroEnhancedUntil = -99999; this.soulKnightSpeedBuffUntil = -99999;
    this.soulCorpseArmorActive = false;
    if (this.soulCorpseArmorVisual) { this.soulCorpseArmorVisual.destroy(); this.soulCorpseArmorVisual = null; }
    this.npcScaredUntil = -99999;
    this.lastNpcSacrifice = -99999; this.lastNpcConsume = -99999;

    for (const g of this.huntGrenades) g.sprite.destroy();
    for (const c of this.huntTrailCircles) c.sprite.destroy();
    for (const g of this.npcHuntGrenades) g.sprite.destroy();
    for (const c of this.npcHuntTrailCircles) c.sprite.destroy();
    this.huntGrenades = []; this.huntTrailCircles = [];
    this.npcHuntGrenades = []; this.npcHuntTrailCircles = [];
    this.huntBeastForm = false; this.npcHuntBeastForm = false;
    this.huntGrenadeHolding = false;
    if (this.huntGrenadeVisual) { this.huntGrenadeVisual.destroy(); this.huntGrenadeVisual = null; }
    this.huntTrailActive = false; this.npcHuntTrailActive = false;
    this.huntBloodPactActive = false; this.npcHuntBloodPactActive = false;
    if (this.huntBloodPactAura) { this.huntBloodPactAura.destroy(); this.huntBloodPactAura = null; }
    if (this.npcHuntBloodPactAura) { this.npcHuntBloodPactAura.destroy(); this.npcHuntBloodPactAura = null; }
    this.huntLeapActive = false; this.npcHuntLeapActive = false;
    this.npcBleeding = false; this.playerBleeding = false;
    if (this.npcBleedAura) { this.npcBleedAura.destroy(); this.npcBleedAura = null; }
    if (this.playerBleedAura) { this.playerBleedAura.destroy(); this.playerBleedAura = null; }
    this.npcHuntSlowUntil = 0; this.playerHuntSlowUntil = 0;
    this.huntBloodMoonActive = false; this.npcHuntBloodMoonActive = false;
    if (this.huntBloodMoonFilter) { this.huntBloodMoonFilter.destroy(); this.huntBloodMoonFilter = null; }
    if (this.npcHuntBloodMoonFilter) { this.npcHuntBloodMoonFilter.destroy(); this.npcHuntBloodMoonFilter = null; }
    this.huntNormalHudCards = []; this.huntBeastHudCards = [];
    this.huntNormalFills = []; this.huntBeastFills = [];
    this.huntPermTrailActive = false;
    this.huntBloodHuntInvincUntil = 0;
    this.huntBloodHuntCharging = false;
    this.huntBloodHuntChargeEnd = 0;
    this.huntLeapTeleported = false;
    this.huntVampireForm = false;
    for (const t of this.huntGarlicTraps) t.sprite.destroy();
    this.huntGarlicTraps = [];
    this.huntBatFormActive = false; this.huntBatFormEnd = 0;
    this.huntVampireDrainActive = false; this.huntVampireDrainEnd = 0;
    this.huntVampireDrainAccum = 0;
    if (this.huntVampireDrainAura) { this.huntVampireDrainAura.destroy(); this.huntVampireDrainAura = null; }
    this.huntVampireHudCards = []; this.huntVampireFills = [];
    this.npcHuntConfusedUntil = 0; this.npcHuntConfuseDirUntil = 0;
    if (this.npc) { this.npc.npcHuntRoarLocked = false; }

    // Time reset
    for (const p of this.timePuddles) p.sprite.destroy();
    this.timePuddles = [];
    this.playerPosHistory = []; this.npcPosHistory = []; this.posHistoryAccum = 0;
    this.timeBarrageActive = false; this.timeBarrageStart = 0; this.timeBarrageAccum = 0;
    this.lastTimeWarpCast = -99999;
    this.timeNpcTeleporting = false;
    this.timeRemainActive = false; this.timeRemainAbsorbed = 0;
    if (this.timeRemainAura) { this.timeRemainAura.destroy(); this.timeRemainAura = null; }
    this.timeHaltActive = false;
    if (this.timeHaltAura) { this.timeHaltAura.destroy(); this.timeHaltAura = null; }
    this.timeSlowedProjs.clear();
    this.timeTimelessActive = false; this.timeTimelessCharge = 0;
    this.timeTimelessChargeBar = null;
    this.npcTimeBarrageAccum = 0; this.npcTimeBarrageStart = 0;
    this.npcPlayerTeleporting = false;
    this.npcTimeRemainActive = false; this.npcTimeRemainAbsorbed = 0;
    if (this.npcTimeRemainAura) { this.npcTimeRemainAura.destroy(); this.npcTimeRemainAura = null; }
    this.npcTimeHaltActive = false;
    if (this.npcTimeHaltAura) { this.npcTimeHaltAura.destroy(); this.npcTimeHaltAura = null; }
    this.npcTimeSlowedProjs.clear();
    this.npcTimeTimelessActive = false; this.npcTimeTimelessCharge = 0;

    // Time upgrade reset
    this.timeBarrageOverheatTriggered = false;
    this.timeWarpSavedPos = null;
    if (this.timeWarpSavedMarker) { this.timeWarpSavedMarker.destroy(); this.timeWarpSavedMarker = null; }
    this.timeWarpTriggerPending = false;
    this.timeGlassMode = false; this.timeGlassHolding = false; this.timeGlassHoldStart = 0;
    if (this.timeGlassModeAura) { this.timeGlassModeAura.destroy(); this.timeGlassModeAura = null; }
    if (this.timeGlassChargeCircle) { this.timeGlassChargeCircle.destroy(); this.timeGlassChargeCircle = null; }
    if (this.timeGlassChargeText) { this.timeGlassChargeText.destroy(); this.timeGlassChargeText = null; }
    this.timeHaltZoomMode = false;
    this.timeHpHistory = []; this.timeHpHistoryAccum = 0;
    this.timeFreezeFrozenVelocities.clear();
    this.timeFreezeNpcVelX = 0; this.timeFreezeNpcVelY = 0;

    // Creation reset
    if (this.crucibleSprite) { this.crucibleSprite.destroy(); this.crucibleSprite = null; }
    if (this.crucibleLabel) { this.crucibleLabel.destroy(); this.crucibleLabel = null; }
    for (const b of this.crucibleBolts) b.icon.destroy();
    this.crucibleBolts = [];
    this.creatCraftInProgress = false; this.creatCraftStartTime = 0;
    this.creatDaggerHolding = false; this.creatDaggerHoldStart = 0;
    for (const l of this.creatDaggerPreviews) l.destroy();
    this.creatDaggerPreviews = [];
    this.creatBoltHolding = false;
    if (this.creatBoltChargeOrb) { this.creatBoltChargeOrb.destroy(); this.creatBoltChargeOrb = null; }
    this.creatBlockDragging = false;
    if (this.creatBlockPreview) { this.creatBlockPreview.destroy(); this.creatBlockPreview = null; }
    for (const d of this.creatDaggers) d.sprite.destroy();
    this.creatDaggers = [];
    for (const b of this.creatBolts) b.sprite.destroy();
    this.creatBolts = [];
    for (const s of this.creatScythes) { s.sprite.destroy(); s.hpBar.destroy(); s.hpBg.destroy(); }
    this.creatScythes = [];
    this.creatPulses = [];
    for (const bl of this.creatBlockers) { bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy(); }
    this.creatBlockers = [];
    for (const w of this.creatMazeWalls) w.rect.destroy();
    this.creatMazeWalls = [];
    if (this.creatMedkit) { this.creatMedkit.sprite.destroy(); this.creatMedkit.label.destroy(); this.creatMedkit = null; }
    this.creatDamageReductionEnd = 0; this.creatPrevIncomingDamageMult = 1;
    this.creatSpeedBoostEnd = 0; this.creatPrevSpeedMult = -1;

    // Creation upgrade reset
    this.creatLastCraftKey = null; this.creatBoltElectroMode = false;
    this.creatBuildMode = false; this.creatBuildBlockDragging = false;
    if (this.creatBuildBlockPreview) { this.creatBuildBlockPreview = null; }
    if (this.creatBuildNewBlockPreview) { this.creatBuildNewBlockPreview.destroy(); this.creatBuildNewBlockPreview = null; }
    this.creatBuildNewBlockCdUntil = 0;
    this.creatBuildLaunchCdUntil = 0;
    for (const a of this.creatBuildLaunchArrows) a.destroy();
    this.creatBuildLaunchArrows = [];
    for (const sp of this.creatSpeedPads) { sp.rect.destroy(); sp.hpBar.destroy(); sp.hpBg.destroy(); }
    this.creatSpeedPads = [];
    for (const sb of this.creatSpikedBlocks) { sb.rect.destroy(); sb.hpBar.destroy(); sb.hpBg.destroy(); }
    this.creatSpikedBlocks = [];
    this.creatBuildSpeedPadDragging = false; this.creatBuildSpeedPadDragRef = null;
    if (this.creatBuildSpeedPadPreview) { this.creatBuildSpeedPadPreview.destroy(); this.creatBuildSpeedPadPreview = null; }
    this.creatBuildSpeedPadCdUntil = 0;
    this.creatBuildSpikedDragging = false; this.creatBuildSpikedDragRef = null;
    if (this.creatBuildSpikedPreview) { this.creatBuildSpikedPreview.destroy(); this.creatBuildSpikedPreview = null; }
    this.creatBuildSpikedCdUntil = 0;
    this.creatPlayerSpeedPadEnd = 0; this.creatNpcSlowEnd = 0; this.creatNpcSlowMult = 1;
    this.creatMechHolding = false; this.creatMechHoldStart = 0;
    if (this.creatMechStageVisual) { this.creatMechStageVisual.destroy(); this.creatMechStageVisual = null; }
    if (this.creatMech) { this.creatMech.sprite.destroy(); this.creatMech.hpBar.destroy(); this.creatMech.hpBg.destroy(); this.creatMech = null; }

    // Gravity reset
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
    for (const s of this.gravSlashes) { s.line.destroy(); }
    this.gravSlashes = [];
    for (const s of this.gravMeteorShadows) { s.sprite.destroy(); }
    this.gravMeteorShadows = [];
    for (const p of this.gravFirePuddles) { p.sprite.destroy(); }
    this.gravFirePuddles = [];

    // Gravity upgrade reset
    this.gravMeteorStormAccum = 0;
    if (this.gravAnchor) { this.gravAnchor.sprite.destroy(); this.gravAnchor.line.destroy(); this.gravAnchor = null; }
    for (const rs of this.gravMeteorRushShadows) rs.rect.destroy();
    this.gravMeteorRushShadows = [];
    this.gravMoonActive = false; this.gravMoonHolding = false; this.gravMoonHoldStart = 0; this.gravMoonHp = 0;
    if (this.gravMoonSprite) { this.gravMoonSprite.destroy(); this.gravMoonSprite = null; }
    if (this.gravMoonHpBar) { this.gravMoonHpBar.destroy(); this.gravMoonHpBar = null; }
    if (this.gravMoonHpBg) { this.gravMoonHpBg.destroy(); this.gravMoonHpBg = null; }
    this.gravMoonRamCooldown = 0; this.gravQWasDown = false;
    if (this.gravMoonChargeCircle) { this.gravMoonChargeCircle.destroy(); this.gravMoonChargeCircle = null; }
    if (this.gravMoonChargeText) { this.gravMoonChargeText.destroy(); this.gravMoonChargeText = null; }

    // Growth reset
    this.growthMorphType = 'spores';
    this.growthDamageMult = 1.0;
    this.growthLingerBonus = 0;
    this.growthViralBonus = 0;
    this.growthBloatCdMs = 10000;
    this.growthInfectExtraProj = 0;
    this.growthInfectCdMs = 8000;
    this.growthRegenRate = 0;
    this.growthRegenAccum = 0;
    this.growthScaleBonus = 0;
    this.growthBloatActive = false;
    this.growthBloatEnd = 0;
    if (this.growthBloatAura) { this.growthBloatAura.destroy(); this.growthBloatAura = null; }
    for (const btn of this.growthMutateButtons) (btn as unknown as { destroy(): void }).destroy();
    this.growthMutateButtons = [];
    this.growthMutateMenuOpen = false;
    this.lastPlayerInfectCast = -99999;
    this.lastPlayerBloatCast = -99999;
    this.growthBloatAoeRadius = 120;
    this.growthInfectBounces = 0;
    this.growthInfectHitboxMult = 1.0;
    this.growthFungalStacks = 0;
    this.growthGreedBonus = 0;
    this.growthSneezeStacks = 0;
    this.growthCoughStacks = 0;
    if (this.growthSneezeAura) { this.growthSneezeAura.destroy(); this.growthSneezeAura = null; }
    if (this.growthCoughAura) { this.growthCoughAura.destroy(); this.growthCoughAura = null; }
    this.growthSneezeAccum = 0;
    this.growthSpreadStacks = 0;
    for (const b of this.growthBacteriaList) b.sprite.destroy();
    this.growthBacteriaList = [];
    this.growthInfectBouncers = [];
    this.npcGrowthMorphType = 'spores';
    this.npcGrowthDamageMult = 1.0;
    this.npcGrowthLingerBonus = 0;
    this.npcGrowthViralBonus = 0;
    this.npcGrowthBloatCdMs = 10000;
    this.npcGrowthInfectExtraProj = 0;
    this.npcGrowthRegenRate = 0;
    this.npcGrowthRegenAccum = 0;
    this.npcGrowthScaleBonus = 0;
    this.npcGrowthBloatActive = false;
    this.npcGrowthBloatEnd = 0;
    if (this.npcGrowthBloatAura) { this.npcGrowthBloatAura.destroy(); this.npcGrowthBloatAura = null; }
    this.lastNpcInfectCast = -99999;
    this.lastNpcBloatCast = -99999;
    this.npcToxicUntil = 0; this.npcToxicDps = 0; this.npcToxicTickAccum = 0;
    if (this.npcToxicAura) { this.npcToxicAura.destroy(); this.npcToxicAura = null; }
    this.playerToxicUntil = 0; this.playerToxicDps = 0; this.playerToxicTickAccum = 0;
    if (this.playerToxicAura) { this.playerToxicAura.destroy(); this.playerToxicAura = null; }

    this.activeUpgrades = PlayerData.getActiveUpgrades(this.elementId);
    this.npcBurningUntil = 0;
    this.npcBurnTickAccum = 0;
    this.npcBurnAura = null;
    this.playerBurningUntil = 0;
    this.playerBurnTickAccum = 0;
    this.playerBurnAura = null;
    this.pressureCharging = false;
    this.pressureChargeStart = 0;
    this.pressureChargeVisual = null;
    this.pressureTremorAccum = 0;
    this.pressureLastMouseX = 0;
    this.pressureLastMouseY = 0;
    this.enhancedFlameBody = false;
    this.fKeyHeldSince = 0;
    this.fKeyWasDown = false;
    this.armageddonActive = false;
    this.armageddonChargeVisual = null;

    this.mutations = new Set();
    this.npcRebirthUsed = false;
    this.npcRebirthGlow = null;
    this.clone = null;
    this.cloneProjectiles = null;
    this.cloneDefeated = false;
    this.cloneSpeedMult = 1;
    this.cloneNukeChanneling = false;
    this.cloneNukeChannelEnd = 0;
    this.cloneFlameBodyActive = false;
    this.cloneFlameBodyTickAccum = 0;
    this.cloneFlameBodyAura = null;
    this.cloneSplashActiveUntil = 0;
    this.cloneSplashDropAccum = 0;
    this.cloneGeyserBuffUntil = 0;
    this.cloneThornDragActiveUntil = 0;
    this.cloneThornDragTickAccum = 0;
    this.cloneThornDragAura = null;
    this.cloneQuickShotCharged = false;
    this.cloneAirConsecutiveHits = 0;
    this.cloneWindTrapX = 0;
    this.cloneWindTrapY = 0;
    this.cloneWindTrapExpiry = 0;
    this.cloneWindTrapSprite = null;
    this.cloneEarthSlamActive = false;
    this.cloneEarthSlamEnd = 0;
    this.cloneEarthSlamHitDealt = false;

    this.puddles = [];
    this.geysers = [];
    this.painRainShadows = [];

    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;
    const cy = H / 2;
    const pad = 32;

    // ── Background ────────────────────────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x0d0d1a);
    this.add.rectangle(cx, cy, W - pad * 2, H - pad * 2, 0x181828);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x202038, 1);
    for (let x = pad; x < W - pad; x += 80) grid.lineBetween(x, pad, x, H - pad);
    for (let y = pad; y < H - pad; y += 80) grid.lineBetween(pad, y, W - pad, y);

    const border = this.add.graphics();
    border.lineStyle(3, 0x3a3a5a, 1);
    border.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

    // ── Physics ───────────────────────────────────────────────────
    this.physics.world.setBounds(pad, pad, W - pad * 2, H - pad * 2);
    this.projectiles = this.physics.add.group();

    // ── Fighters — texture driven by element choice ────────────────
    const playerTexture = ELEMENT_TEXTURES[this.elementId] ?? 'elem-fire';
    const npcTexture    = ELEMENT_TEXTURES[enemyElementId]  ?? 'elem-water';
    this.player = new Player(this, 180, cy, this.playerElement, playerTexture);
    if (this.isPvP) {
      this.npc = new Player(this, W - 180, cy, this.npcElement, npcTexture);
      this.p2ActiveUpgrades = PlayerData.getActiveUpgrades(this.npcElementId);
    } else {
      this.npc = new NpcOpponent(this, W - 180, cy, this.npcElement, npcTexture, difficultyConfig);
    }

    // ── Apply mutations ──────────────────────────────────────────────
    this.mutations = new Set(this.isPvP ? [] : (data.mutations ?? []));
    if (this.mutations.has('healthy')) {
      const bonus = Math.round(this.npc.maxHp * 0.5);
      this.npc.maxHp += bonus; this.npc.hp = this.npc.maxHp;
    }
    if (this.mutations.has('swift')) { this.npc.speed *= 2; }
    if (this.mutations.has('deadly')) { this.player.incomingDamageMultiplier = 1.5; }
    if (this.mutations.has('mini')) {
      this.npc.setScale(0.5);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(11, 13, 13);
      this.npc.speed *= 2;
      this.npc.maxHp = Math.round(this.npc.maxHp * 0.75);
      this.npc.hp = this.npc.maxHp;
    }
    if (this.mutations.has('giant')) {
      this.npc.setScale(1.5);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
      this.npc.speed = Math.round(this.npc.speed * 0.7);
      const giantBonus = Math.round(this.npc.maxHp * 1.25);
      this.npc.maxHp += giantBonus; this.npc.hp = this.npc.maxHp;
    }
    if (this.mutations.has('mastered')) { this.npc.isMastered = true; }

    if (this.mutations.has('clone')) {
      this.cloneProjectiles = this.physics.add.group();
      this.clone = new NpcOpponent(this, cx, cy / 2, this.npcElement, npcTexture, difficultyConfig);
      if (this.mutations.has('healthy')) {
        const b = Math.round(this.clone.maxHp * 0.5);
        this.clone.maxHp += b; this.clone.hp = this.clone.maxHp;
      }
      if (this.mutations.has('swift')) { this.clone.speed *= 2; }
      if (this.mutations.has('mini')) {
        this.clone.setScale(0.5);
        (this.clone.body as Phaser.Physics.Arcade.Body).setCircle(11, 13, 13);
        this.clone.speed *= 2;
        this.clone.maxHp = Math.round(this.clone.maxHp * 0.75);
        this.clone.hp = this.clone.maxHp;
      }
      if (this.mutations.has('giant')) {
        this.clone.setScale(1.5);
        (this.clone.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
        this.clone.speed = Math.round(this.clone.speed * 0.7);
        const gb = Math.round(this.clone.maxHp * 1.25);
        this.clone.maxHp += gb; this.clone.hp = this.clone.maxHp;
      }
      if (this.mutations.has('mastered')) { this.clone.isMastered = true; }
      this.add.text(cx, cy / 2 - 38, `CLONE ${this.npcElement.emoji}`, {
        fontSize: '12px', color: '#888888',
      }).setOrigin(0.5).setDepth(20);
    }

    // ── Gauntlet boosts & boss modifications ───────────────────────
    if (this.gauntletState) {
      const gs = this.gauntletState;

      // Player HP boost
      const healthBoosts = gs.boosts.filter((b) => b === 'health').length;
      if (healthBoosts > 0) {
        this.player.setMaxHp(200 + healthBoosts * 50);
      }

      // Player speed + cooldown boost
      const speedBoosts = gs.boosts.filter((b) => b === 'speed').length;
      if (speedBoosts > 0) {
        this.gauntletSpeedMult = Math.pow(1.25, speedBoosts);
        this.player.cooldownMult = Math.pow(0.9, speedBoosts);
      }

      // NPC incoming damage boost (Strength+)
      const strengthBoosts = gs.boosts.filter((b) => b === 'strength').length;
      if (strengthBoosts > 0) {
        this.npc.gauntletDamageTakenMult = Math.pow(1.2, strengthBoosts);
        if (this.clone) this.clone.gauntletDamageTakenMult = Math.pow(1.2, strengthBoosts);
      }

      // Boss fight modifications (fight 6)
      if (gs.currentFight === 6) {
        this.npc.setScale(2);
        (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(44, -20, -20);
        this.npc.maxHp = this.npc.maxHp * 5;
        this.npc.hp = this.npc.maxHp;
      }
    }

    // ── Overlap callbacks ─────────────────────────────────────────
    this.physics.add.overlap(
      this.projectiles,
      this.npc,
      (a, b) => {
        const proj = (a instanceof Projectile ? a : b) as Projectile;
        if (!proj.active || !proj.isFromPlayer) return;
        // Time Warp orb: deal 20 damage + teleport NPC back 3 seconds (or save pos with E+)
        if (proj.texture.key === 'proj-time-orb') {
          // E+ Delayed Warp: save position, don't teleport yet
          if (this.elementId === 'sand' && this.hasUpgrade('e')) {
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xffdd44);
            this.showFloatingText(this.npc.x, this.npc.y - 24, '20', '#ffdd44');
            if (this.npcPosHistory.length > 0) {
              const targetT = this.time.now - 3000;
              let best = this.npcPosHistory[0];
              for (const snap of this.npcPosHistory) {
                if (Math.abs(snap.t - targetT) < Math.abs(best.t - targetT)) best = snap;
              }
              if (this.timeWarpSavedMarker) this.timeWarpSavedMarker.destroy();
              this.timeWarpSavedPos = { x: best.x, y: best.y };
              this.timeWarpSavedMarker = this.add.circle(best.x, best.y, 18, 0xffdd44, 0.4)
                .setStrokeStyle(2, 0xffffff, 0.7).setDepth(6);
              this.tweens.add({ targets: this.timeWarpSavedMarker, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
              this.showFloatingText(this.player.x, this.player.y - 32, '⏱ Saved!', '#ffdd44');
            }
          } else if (!this.timeNpcTeleporting && this.npcPosHistory.length > 0) {
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xffdd44);
            this.showFloatingText(this.npc.x, this.npc.y - 24, '20', '#ffdd44');
            const targetT = this.time.now - 3000;
            let best = this.npcPosHistory[0];
            for (const snap of this.npcPosHistory) {
              if (Math.abs(snap.t - targetT) < Math.abs(best.t - targetT)) best = snap;
            }
            this.timeNpcTeleporting = true;
            this.timeNpcTeleportStart = this.time.now;
            this.timeNpcTeleportFromX = this.npc.x;
            this.timeNpcTeleportFromY = this.npc.y;
            this.timeNpcTeleportToX = best.x;
            this.timeNpcTeleportToY = best.y;
            this.timeNpcTeleportPuddleAccum = 0;
          }
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        let _npcDmg = proj.damage;
        // Q+: Shatter Strike — next hit on frozen enemy deals 25% more
        if (this.npcFrozenSolidAmpReady && this.npcFrozenUntil > this.time.now) {
          _npcDmg = Math.round(_npcDmg * 1.25);
          this.npcFrozenSolidAmpReady = false;
          const st = this.add.text(this.npc.x, this.npc.y - 30, 'SHATTER!', { fontSize: '11px', color: '#88ccff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
          this.tweens.add({ targets: st, y: st.y - 20, alpha: 0, duration: 1200, onComplete: () => st.destroy() });
        }
        this.npc.takeDamage(_npcDmg);
        this.spawnHitFlash(proj.x, proj.y, 0xff6600);
        // Hunt Blood Pact: heal player for 50% of damage dealt
        if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(_npcDmg * 0.5));
        // Hunt Blood Moon F+: 50% lifesteal from all damage dealt to bleeding enemy
        if (this.huntBloodMoonActive && this.hasUpgrade('f') && this.npcBleeding) this.player.heal(Math.ceil(_npcDmg * 0.5));
        // Hunt Vampire Stake: proj-hunt-stake applies bleed
        if (proj.texture.key === 'proj-hunt-stake') {
          const stakeBonus = this.hasUpgrade('click') && this.npcBleeding ? 1.25 : 1;
          if (stakeBonus > 1) { this.npc.takeDamage(Math.round(15 * 0.25)); } // +25% extra dmg
          this.npcBleeding = true;
          this.npcBleedingUntil = Math.max(this.npcBleedingUntil, this.time.now + 6000);
          this.applyNpcBleedVisual();
        }
        // Flameshredder: fireball hit also applies burning DOT
        if (proj.texture.key === 'proj-fire' && this.hasUpgrade('click')) {
          this.npcBurningUntil = Math.max(this.npcBurningUntil, this.time.now + 3000);
        }
        // Knockback: water-cut hit pushes NPC in projectile travel direction
        if (proj.texture.key === 'proj-water' && this.hasUpgrade('click')) {
          const projBody = proj.body as Phaser.Physics.Arcade.Body;
          const vx = projBody.velocity.x;
          const vy = projBody.velocity.y;
          const len = Math.sqrt(vx * vx + vy * vy) || 1;
          const nb = this.npc.body as Phaser.Physics.Arcade.Body;
          nb.setVelocity(nb.velocity.x + (vx / len) * 180, nb.velocity.y + (vy / len) * 180);
        }
        // Ice spike: frost stacks + unfreeze bonus + Click+ tracking
        if (proj.texture.key === 'proj-ice') {
          // Click+: consecutive hit tracking
          if (this.hasUpgrade('click') && this.playerIcePendingSet.has(proj)) {
            this.playerIcePendingSet.delete(proj);
            this.playerIceConsecHits++;
            if (this.playerIceConsecHits >= 3) {
              this.playerNextIcePowered = true;
              this.playerIceConsecHits = 0;
              const pt = this.add.text(this.player.x, this.player.y - 36, 'POWERED!', { fontSize: '11px', color: '#cceeff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
              this.tweens.add({ targets: pt, y: pt.y - 20, alpha: 0, duration: 1200, onComplete: () => pt.destroy() });
            }
          }
          if (this.npcFrozenUntil > this.time.now) {
            this.npcFrozenUntil = 0;
            for (let fi = 0; fi < 3; fi++) this.addFrostStack('npc');
          } else {
            this.addFrostStack('npc');
            // Powered shot: apply extra frost stack
            if (proj.isPowered) this.addFrostStack('npc');
          }
        }
        // Growth infect dagger: apply toxic DOT to NPC, R+ bonus on already-infected
        if (proj.texture.key === 'proj-growth-dagger') {
          if (this.hasUpgrade('r') && this.npcToxicUntil > this.time.now) {
            const bonus = Math.round(proj.damage * 0.25);
            this.npc.takeDamage(bonus);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xccff44);
            const ft = this.add.text(this.npc.x, this.npc.y - 35, `+${bonus} EXPLOIT`, { fontSize: '10px', color: '#ccff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
            this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
          }
          this.npcToxicUntil = this.time.now + 5000 + this.growthLingerBonus;
          this.npcToxicDps = 2 + this.growthViralBonus;
          this.npcToxicTickAccum = 0;
        }
        // NPC bloat: NPC hit triggers AOE on player
        if (this.npcGrowthBloatActive) {
          this.npcGrowthBloatActive = false;
          this.npcGrowthBloatEnd = 0;
          if (this.npcGrowthBloatAura) { this.npcGrowthBloatAura.destroy(); this.npcGrowthBloatAura = null; }
          const bloatDmg = Math.round(20 * this.npcGrowthDamageMult);
          if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y) <= 120) {
            this.player.takeDamage(bloatDmg);
            this.spawnHitFlash(this.player.x, this.player.y, 0xdddd00);
          }
          const bloatExp = this.add.circle(this.npc.x, this.npc.y, 120, 0xdddd00, 0.3).setDepth(8);
          this.tweens.add({ targets: bloatExp, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 350, onComplete: () => bloatExp.destroy() });
        }
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
      },
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.projectiles,
      this.player,
      (a, b) => {
        const proj = (a instanceof Projectile ? a : b) as Projectile;
        if (!proj.active || proj.isFromPlayer) return;
        // Time Warp orb (NPC fires): teleport player back 3 seconds
        if (proj.texture.key === 'proj-time-orb') {
          if (!this.npcPlayerTeleporting && this.playerPosHistory.length > 0) {
            const targetT = this.time.now - 3000;
            let best = this.playerPosHistory[0];
            for (const snap of this.playerPosHistory) {
              if (Math.abs(snap.t - targetT) < Math.abs(best.t - targetT)) best = snap;
            }
            this.npcPlayerTeleporting = true;
            this.npcPlayerTeleportStart = this.time.now;
            this.npcPlayerTeleportFromX = this.player.x;
            this.npcPlayerTeleportFromY = this.player.y;
            this.npcPlayerTeleportToX = best.x;
            this.npcPlayerTeleportToY = best.y;
            this.npcPlayerTeleportPuddleAccum = 0;
            this.spawnHitFlash(this.player.x, this.player.y, 0xffdd44);
          }
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // E+ shadow consume: immune to damage while consuming
        if (this.elementId === 'shadow' && this.shadowConsumeActive) {
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // F+ shadow dance: 25% dodge for 8s after full-bar use
        if (this.elementId === 'shadow' && this.time.now < this.shadowDanceUpgradeDodgeUntil && Math.random() < 0.25) {
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Q+ shadow black hole: 25% dodge while charging
        if (this.elementId === 'shadow' && this.shadowBlackHoleCharging && this.hasUpgrade('q') && Math.random() < 0.25) {
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // F upgrade: 50% dodge while mid-grapple
        if (this.isGrappling && this.hasUpgrade('f') && Math.random() < 0.5) {
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Grapple dodge (player only) — 50% per charge, up to 2 charges
        const grappleDodge = this.grappleDodgeCharges > 0 && Math.random() < 0.50;
        if (grappleDodge) {
          this.grappleDodgeCharges--;
          if (this.grappleDodgeCharges === 0 && this.grappleDodgeAura) {
            this.grappleDodgeAura.destroy();
            this.grappleDodgeAura = null;
          }
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        let _playerDmg = proj.damage;
        // Glass Mode: 100x damage = instant death (unless Remain is absorbing)
        if (this.elementId === 'sand' && this.timeGlassMode && !this.timeRemainActive) {
          _playerDmg = _playerDmg * 100;
        }
        this.player.takeDamage(_playerDmg);
        this.spawnHitFlash(proj.x, proj.y, 0x00aaff);
        // NPC Hunt Blood Pact: heal NPC for 50% of damage dealt
        if (this.npcHuntBloodPactActive && this.time.now < this.npcHuntBloodPactEnd) this.npc.heal(Math.ceil(_playerDmg * 0.5));
        // Mastered Flameshredder: NPC fireballs apply burning DOT to player
        if (proj.texture.key === 'proj-fire' && this.npc.isMastered) {
          this.playerBurningUntil = Math.max(this.playerBurningUntil, this.time.now + 3000);
        }
        // Ice spike: frost stacks + unfreeze bonus
        if (proj.texture.key === 'proj-ice') {
          if (this.playerFrozenUntil > this.time.now) {
            this.playerFrozenUntil = 0;
            for (let fi = 0; fi < 3; fi++) this.addFrostStack('player');
          } else {
            this.addFrostStack('player');
          }
        }
        // Growth infect dagger (NPC): apply toxic DOT to player
        if (proj.texture.key === 'proj-growth-dagger') {
          this.playerToxicUntil = this.time.now + 5000 + this.npcGrowthLingerBonus;
          this.playerToxicDps = 2 + this.npcGrowthViralBonus;
          this.playerToxicTickAccum = 0;
        }
        // Player bloat: player hit triggers AOE on NPC (F+ hold prevents trigger)
        if (this.growthBloatActive) {
          const fLocked = this.hasUpgrade('f') && this.fKey.isDown;
          if (!fLocked) {
            this.growthBloatActive = false;
            this.growthBloatEnd = 0;
            if (this.growthBloatAura) { this.growthBloatAura.destroy(); this.growthBloatAura = null; }
            const bloatDmg = Math.round(20 * this.growthDamageMult);
            const aoeR = this.growthBloatAoeRadius;
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= aoeR) {
              this.npc.takeDamage(bloatDmg);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xdddd00);
              const ft = this.add.text(this.npc.x, this.npc.y - 30, `💥 ${bloatDmg}`, { fontSize: '11px', color: '#ffff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
              this.tweens.add({ targets: ft, y: ft.y - 25, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
            }
            const bloatExp = this.add.circle(this.player.x, this.player.y, aoeR, 0xdddd00, 0.3).setDepth(8);
            this.tweens.add({ targets: bloatExp, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 350, onComplete: () => bloatExp.destroy() });
            // Fungal Flourish: heal on bloat trigger
            if (this.growthFungalStacks > 0) {
              const healAmt = this.growthFungalStacks * 10;
              this.player.heal(healAmt);
              const hft = this.add.text(this.player.x, this.player.y - 40, `🍄 +${healAmt}`, { fontSize: '11px', color: '#88ff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
              this.tweens.add({ targets: hft, y: hft.y - 25, alpha: 0, duration: 900, onComplete: () => hft.destroy() });
            }
          }
        }
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
      },
      undefined,
      this,
    );

    // ── Clone overlaps ────────────────────────────────────────────
    if (this.clone && this.cloneProjectiles) {
      // Clone projectiles hit player
      this.physics.add.overlap(
        this.cloneProjectiles,
        this.player,
        (a, b) => {
          const proj = (a instanceof Projectile ? a : b) as Projectile;
          if (!proj.active) return;
          this.player.takeDamage(proj.damage);
          this.spawnHitFlash(proj.x, proj.y, 0x00aaff);
          if (proj.texture.key === 'proj-fire' && this.clone?.isMastered) {
            this.playerBurningUntil = Math.max(this.playerBurningUntil, this.time.now + 3000);
          }
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
        },
        undefined, this,
      );
      // Player projectiles hit clone (NPC projectiles excluded via isFromPlayer check)
      this.physics.add.overlap(
        this.projectiles,
        this.clone,
        (a, b) => {
          const proj = (a instanceof Projectile ? a : b) as Projectile;
          if (!proj.active || !proj.isFromPlayer) return;
          this.clone!.takeDamage(proj.damage);
          this.spawnHitFlash(proj.x, proj.y, 0xff6600);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
        },
        undefined, this,
      );
    }

    // ── Network PvP wiring ────────────────────────────────────────
    if (this.isNetworkPvP) {
      this.networkManager = this.registry.get('networkManager') ?? null;
      if (this.networkManager) {
        if (this.networkRole === 'host') {
          this.networkManager.onInputReceived((input) => {
            this.p2Input = input;
            if (input.aimX !== undefined) this.p2NetworkAimX = input.aimX;
            if (input.aimY !== undefined) this.p2NetworkAimY = input.aimY;
          });
        } else if (this.networkRole === 'guest') {
          this.networkManager.onStateReceived((state) => this.reconcileNetworkState(state));
        }
        this.networkManager.onDisconnected(() => this.handleNetworkDisconnect());
      }
    }

    // ── Defeat + damage events ────────────────────────────────────
    this.player.once('defeated', () => {
      if (this.networkRole === 'guest') return; // guest waits for host's gameOver packet
      this.endGame(false);
    });

    const registerNpcDefeat = () => {
      this.npc.once('defeated', () => {
        if (this.networkRole === 'guest') return; // guest waits for host's gameOver packet
        if (!this.isPvP && this.mutations.has('rebirth') && !this.npcRebirthUsed) {
          this.npcRebirthUsed = true;
          this.npc.isInvincible = true;
          const flash = this.add.circle(this.npc.x, this.npc.y, 50, 0x00ffff, 0.8).setDepth(15);
          this.tweens.add({ targets: flash, scaleX: 5, scaleY: 5, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
          this.time.delayedCall(400, () => {
            if (!this.npc.active) return;
            this.npc.hp = Math.round(this.npc.maxHp * 0.5);
            this.npc.speed *= 1.2;
            this.player.incomingDamageMultiplier *= 1.2;
            this.npc.isInvincible = false;
            if (this.npcRebirthGlow) this.npcRebirthGlow.destroy();
            this.npcRebirthGlow = this.add.circle(this.npc.x, this.npc.y, 36, 0x00ffff, 0.15).setDepth(4);
            this.npcRebirthGlow.setStrokeStyle(3, 0x00ffff, 0.9);
            this.tweens.add({ targets: this.npcRebirthGlow, alpha: 0.45, yoyo: true, repeat: -1, duration: 400 });
            registerNpcDefeat();
          });
        } else {
          this.endGame(true);
        }
      });
    };
    registerNpcDefeat();

    if (this.clone) {
      this.clone.once('defeated', () => {
        this.cloneDefeated = true;
        const lbl = this.add.text(cx, cy - 40, 'CLONE DEFEATED', {
          fontSize: '26px', fontFamily: '"Arial Black", sans-serif',
          color: '#ffaa00', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: lbl, alpha: 0, y: cy - 80, delay: 500, duration: 1000, onComplete: () => lbl.destroy() });
        if (this.clone) { this.clone.setActive(false).setVisible(false); }
        this.clone = null;
      });
    }

    this.player.on('damaged', (n: number) => {
      if (n === 0 && this.elementId === 'water' && this.hasUpgrade('f')) {
        const dmg = this.player.lastIncomingDamage;
        if (dmg > 0) {
          this.npc.takeDamage(dmg);
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -2); // REFLECTED
          return;
        }
      }
      this.spawnDamageNumber(this.player.x, this.player.y - 34, n);
    });
    this.npc.on('damaged', (n: number) =>
      this.spawnDamageNumber(this.npc.x, this.npc.y - 34, n),
    );

    // ── Input ──────────────────────────────────────────────────────
    const kb = this.input.keyboard!;
    this.wKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.qKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.eKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.rKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.fKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    if (this.isPvP && !this.isNetworkPvP) {
      // Local PvP: bind P2 keyboard controls
      this.p2UpKey    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      this.p2DownKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      this.p2LeftKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.p2RightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
      this.p2AimUpKey    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.I);
      this.p2AimDownKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K);
      this.p2AimLeftKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
      this.p2AimRightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.L);
      this.p2ClickKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.U);
      this.p2EKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.O);
      this.p2RKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      this.p2FKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SEMICOLON);
      this.p2QKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.QUOTES);
      this.p2DodgeKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH);

      this.p2ReticleX = W - 180;
      this.p2ReticleY = cy;
      this.p2Reticle = this.add.circle(this.p2ReticleX, this.p2ReticleY, 12, 0x000000, 0)
        .setStrokeStyle(2, this.npcElement.color, 0.8)
        .setDepth(30);
    }

    // ── Creation: spawn crucible ───────────────────────────────────
    if (this.elementId === 'creation' || this.npcElementId === 'creation') {
      this.crucibleX = cx;
      this.crucibleY = cy;
      this.crucibleSprite = this.add.rectangle(cx, cy, 48, 48, 0x660066, 0.7)
        .setStrokeStyle(2, 0xaa44cc, 0.9).setDepth(3);
      this.crucibleLabel = this.add.text(cx, cy + 36, 'Crucible',
        { fontSize: '11px', fontFamily: 'Arial', color: '#ddaaff' }).setOrigin(0.5).setDepth(4);
    }

    // ── HUD ────────────────────────────────────────────────────────
    // Online PvP: each tab only shows its own player's HUD.
    // Host controls P1 → bottom HUD only. Guest controls P2 → top HUD only.
    if (this.isNetworkPvP) {
      if (this.networkRole === 'host') this.createHUD(W, H);
      else this.createP2HUD(W, H);
    } else {
      this.createHUD(W, H);
      if (this.isPvP) this.createP2HUD(W, H);
    }

    // ── Arena labels ───────────────────────────────────────────────
    if (this.isPvP) {
      this.add.text(180, 20, `${this.playerElement.emoji} P1`, {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(20);
      this.add.text(W - 180, 20, `P2 ${this.npcElement.emoji}`, {
        fontSize: '14px', color: '#aaddff',
      }).setOrigin(0.5).setDepth(20);
    } else {
      this.add.text(180, 20, `${this.playerElement.emoji} YOU`, {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(20);
      this.add.text(W - 180, 20, `ENEMY ${this.npcElement.emoji}`, {
        fontSize: '14px', color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(20);
    }

    if (this.elementId === 'soul') {
      this.soulGhostText = this.add.text(cx, 52, '👻 0', {
        fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#ccaaff',
        stroke: '#220044', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }
    // Time element: charge bar rendered per-frame above player; no separate HUD text needed
  }

  // ── HUD ─────────────────────────────────────────────────────────

  private createHUD(W: number, H: number): void {
    const hudY = H - 30;
    const cardW = 130;
    const cardH = 48;
    // Hunt has 10 abilities (5 normal + 5 beast); only show 5 at a time
    const abilities = this.elementId === 'hunt'
      ? this.playerElement.abilities.slice(0, 5)
      : this.playerElement.abilities;

    this.add.rectangle(W / 2, hudY, W, cardH + 4, 0x0a0a18, 0.95).setDepth(20);

    const totalWidth = 5 * cardW; // always 5-wide layout for consistency
    const startX = W / 2 - totalWidth / 2 + cardW / 2;

    const fillColors: Record<string, number> = {
      'fireball':       0xff6600,
      'flame-dash':     0xff3300,
      'pressure-bomb':  0xff8800,
      'flame-body':     0xff9900,
      'flame-nuke':     0xcc2200,
      'water-cut':      0x0099ff,
      'splash':         0x00aadd,
      'geyser':         0x00ffcc,
      'water-shield':   0x4488ff,
      'pain-rain':      0x0033aa,
      'petal-shotgun':  0x66dd44,
      'plant':          0x22aa22,
      'grow':           0x44ff88,
      'thorns':         0xcc2222,
      'thorn-drag':     0x116611,
      'air-snipe':      0xccddff,
      'quick-shot':     0x88ddff,
      'wind-trap':      0x44aacc,
      'grapple':        0x6699cc,
      'charged-beam':   0x2255aa,
      'stab':           0xaa8844,
      'shield-up':      0x997744,
      'shield-slam':    0xbb9955,
      'shield-break':   0xcc8833,
      'bull-rush':      0xcc4400,
      'drone-command':  0xffaa00,
      'drone-summon':   0xcc7700,
      'drone-destroy':  0xff6600,
      'firewall':       0xff8800,
      'overdrive':      0xff4400,
      'dark-drain':     0x660088,
      'tentacle':       0x440066,
      'snap-trap':      0x550077,
      'shadow-dance':   0x220044,
      'black-hole':     0x110033,
      'soul-orb':         0xccaaff,
      'soul-summon':      0x9966cc,
      'soul-sacrifice':   0x7722aa,
      'soul-consume':     0x553388,
      'undead-charge':    0x440066,
      'hunt-shotgun':     0xff4400,
      'hunt-grenade':     0xff6600,
      'hunt-trail':       0xcc3300,
      'hunt-blood-pact':  0xaa0022,
      'hunt-transform':   0x882200,
      'hunt-slash':             0xff2200,
      'hunt-leap':              0xdd4400,
      'hunt-blood-hunt':        0xbb0011,
      'hunt-blood-moon':        0x880000,
      'hunt-untransform':       0x664422,
      'hunt-vampire-stake':     0x880033,
      'hunt-garlic-trap':       0x446600,
      'hunt-bat-form':          0x333388,
      'hunt-vampire-drain':     0x660022,
      'hunt-vampire-untransform': 0x442244,
      'time-barrage':     0xffdd44,
      'time-warp':        0xffffaa,
      'time-remain':      0xffee66,
      'time-halt':        0xddcc00,
      'time-timeless':    0xffffff,
      'space-slash':      0x8844cc,
      'meteor-rain':      0xaa66ee,
      'space-slam':       0x6622aa,
      'grav-bomb':        0xcc88ff,
      'lunar-landing':    0x4422aa,
      'dagger-spray':     0xcc6622,
      'charged-bolt':     0xddaa44,
      'scythe-of-doom':   0xcc44aa,
      'creation-block':   0x884422,
      'maze-of-doom':     0x882288,
    };

    abilities.forEach((ab, i) => {
      const x = startX + i * cardW;

      const bg = this.add
        .rectangle(x, hudY, cardW - 4, cardH - 4, 0x1a1a30)
        .setStrokeStyle(1, 0x333355)
        .setDepth(21);

      const fill = this.add
        .rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, fillColors[ab.id] ?? 0x4466aa, 0.45)
        .setOrigin(0, 0.5)
        .setDepth(22);

      const lbl = this.add.text(x, hudY - 6, `[${ab.displayKey}] ${ab.name}`, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#dddddd',
      }).setOrigin(0.5, 0.5).setDepth(23);

      const desc = this.add.text(x, hudY + 8, ab.description, {
        fontSize: '9px',
        color: '#000000',
        wordWrap: { width: cardW - 12 },
        maxLines: 2,
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(23);

      this.abilityBars.push({ fill, abilityId: ab.id, maxWidth: cardW - 4 });

      if (this.elementId === 'hunt') {
        this.huntNormalHudCards.push(bg, fill, lbl, desc);
      }
    });

    // Hunt beast-form HUD (hidden until transform)
    if (this.elementId === 'hunt') {
      this.huntNormalFills = [...this.abilityBars];
      const beastAbilities = this.playerElement.abilities.slice(5, 10);
      beastAbilities.forEach((ab, i) => {
        const x = startX + i * cardW;
        const bg = this.add.rectangle(x, hudY, cardW - 4, cardH - 4, 0x220011)
          .setStrokeStyle(1, 0x882233).setDepth(21).setVisible(false);
        const fill = this.add.rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, fillColors[ab.id] ?? 0xaa2233, 0.5)
          .setOrigin(0, 0.5).setDepth(22).setVisible(false);
        const lbl = this.add.text(x, hudY - 6, `[${ab.displayKey}] ${ab.name}`, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffaaaa',
        }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
        const desc = this.add.text(x, hudY + 8, ab.description, {
          fontSize: '9px', color: '#000000', wordWrap: { width: cardW - 12 }, maxLines: 2, align: 'center',
        }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
        this.huntBeastFills.push({ fill, abilityId: ab.id, maxWidth: cardW - 4 });
        this.huntBeastHudCards.push(bg, fill, lbl, desc);
      });
      // Hunt vampire-form HUD (hidden until Q+ transform)
      const vampireAbilities = this.playerElement.abilities.slice(10, 15);
      vampireAbilities.forEach((ab, i) => {
        const x = startX + i * cardW;
        const bg = this.add.rectangle(x, hudY, cardW - 4, cardH - 4, 0x110022)
          .setStrokeStyle(1, 0x441166).setDepth(21).setVisible(false);
        const fill = this.add.rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, fillColors[ab.id] ?? 0x660033, 0.5)
          .setOrigin(0, 0.5).setDepth(22).setVisible(false);
        const lbl = this.add.text(x, hudY - 6, `[${ab.displayKey}] ${ab.name}`, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ddaaff',
        }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
        const desc = this.add.text(x, hudY + 8, ab.description, {
          fontSize: '9px', color: '#000000', wordWrap: { width: cardW - 12 }, maxLines: 2, align: 'center',
        }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
        this.huntVampireFills.push({ fill, abilityId: ab.id, maxWidth: cardW - 4 });
        this.huntVampireHudCards.push(bg, fill, lbl, desc);
      });
    }

    this.add.text(W - 50, hudY, '[SPC]\nDodge', {
      fontSize: '11px',
      color: '#888888',
      align: 'center',
    }).setOrigin(0.5).setDepth(23);
  }

  private createP2HUD(W: number, _H: number): void {
    const hudY = 30;
    const cardW = 130;
    const cardH = 48;
    const abilities = this.npcElement.id === 'hunt'
      ? this.npcElement.abilities.slice(0, 5)
      : this.npcElement.abilities;

    this.add.rectangle(W / 2, hudY, W, cardH + 4, 0x0a0a18, 0.95).setDepth(20);

    const totalWidth = 5 * cardW;
    const startX = W / 2 - totalWidth / 2 + cardW / 2;

    // In Local PvP, P2 uses U/O/P/;/' for abilities and / for dodge.
    // In Online PvP, P2 uses the same keys as P1 (Click/E/R/F/Q and Space).
    const p2KeyLabels = this.isNetworkPvP
      ? null  // use ab.displayKey
      : ['U', 'O', 'P', ';', '\''];

    abilities.forEach((ab, i) => {
      const x = startX + i * cardW;

      this.add
        .rectangle(x, hudY, cardW - 4, cardH - 4, 0x1a1a30)
        .setStrokeStyle(1, 0x333355)
        .setDepth(21);

      const fill = this.add
        .rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, 0x4488ff, 0.45)
        .setOrigin(0, 0.5)
        .setDepth(22);

      const keyLabel = p2KeyLabels ? p2KeyLabels[i] : ab.displayKey;
      this.add.text(x, hudY - 6, `[${keyLabel}] ${ab.name}`, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaddff',
      }).setOrigin(0.5, 0.5).setDepth(23);

      this.add.text(x, hudY + 8, ab.description, {
        fontSize: '9px',
        color: '#000000',
        wordWrap: { width: cardW - 12 },
        maxLines: 2,
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(23);

      this.p2AbilityBars.push({ fill, abilityId: ab.id, maxWidth: cardW - 4 });
    });

    const dodgeLabel = this.isNetworkPvP ? '[SPC]' : '[/]';
    this.add.text(W - 50, hudY, `${dodgeLabel}\nDodge`, {
      fontSize: '11px',
      color: '#666688',
      align: 'center',
    }).setOrigin(0.5).setDepth(23);
  }

  // ── P2 input reading ─────────────────────────────────────────────

  private readLocalP2Input(): P2InputState {
    return {
      up:       this.p2UpKey.isDown,
      down:     this.p2DownKey.isDown,
      left:     this.p2LeftKey.isDown,
      right:    this.p2RightKey.isDown,
      aimUp:    this.p2AimUpKey.isDown,
      aimDown:  this.p2AimDownKey.isDown,
      aimLeft:  this.p2AimLeftKey.isDown,
      aimRight: this.p2AimRightKey.isDown,
      click:    this.p2ClickKey.isDown,
      e:        this.p2EKey.isDown,
      r:        this.p2RKey.isDown,
      f:        this.p2FKey.isDown,
      q:        this.p2QKey.isDown,
      dodge:    this.p2DodgeKey.isDown,
      seq:      this.p2Input.seq + 1,
    };
  }

  // ── P2 ability input (PvP mode, Fire element only in v1) ─────────

  // ── P2 ability dispatch — implementation lives in src/combat/P2AbilityHandler.ts ──
  private processP2Abilities(
    time: number,
    delta: number,
    p2Ctx: CastContext,
    p2TargetX: number,
    p2TargetY: number,
  ): string | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return processP2Abilities(this as unknown as P2Scene, time, delta, p2Ctx, p2TargetX, p2TargetY);
  }


  // ── Context builders ────────────────────────────────────────────

  private buildPlayerContext(targetX: number, targetY: number): CastContext {
    return {
      scene: this,
      casterX: this.player.x,
      casterY: this.player.y,
      targetX,
      targetY,
      isPlayerCaster: true,
      projectiles: this.projectiles,
      dealAoeDamage: (cx, cy, radius, damage) => {
        if (Phaser.Math.Distance.Between(cx, cy, this.npc.x, this.npc.y) <= radius) {
          this.npc.takeDamage(damage);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
          if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(damage * 0.5));
        }
      },
      dashCaster: (vx, vy) => {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
        this.isDodging = true;
        this.player.isInvincible = true;
        this.time.delayedCall(280, () => {
          if (this.player.active) {
            this.player.isInvincible = false;
            this.isDodging = false;
          }
        });
      },
      healCaster: (amount) => this.player.heal(amount),
      damageCaster: (amount) => this.player.applySelfDamage(amount),
      setCasterSpeedMultiplier: (mult) => { this.playerSpeedMult = mult; },
      lockCaster: (durationMs) => {
        this.nukeChanneling = true;
        this.nukeChannelEnd = this.time.now + durationMs;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      },
      addShieldCharge: () => { this.player.shieldCharges += 1; },
      spawnPuddle: (_x, _y) => { /* drops managed by ArenaScene per splashActiveUntil */ },
      spawnGeyser: (x, y) => this.createGeyser(x, y, 'player'),
      spawnPainRain: () => {
        if (this.hasUpgrade('q')) {
          this.createPainRain('player', 500, 150, 2400); // 5× drops, 3× duration
        } else {
          this.createPainRain('player');
        }
      },
      spawnPlant: (x, y) => this.createPlant(x, y, 'player'),
      growPlants: () => {
        for (const p of this.playerPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0x44ff44, 0.6).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
      },
      thornPlants: () => {
        for (const p of this.playerPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0xcc2222, 0.75).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
          if (Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius) {
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc2222);
          }
        }
      },
      startThornDrag: () => { /* state set in player input handler */ },
      activateQuickShot: () => { this.quickShotCharged = true; },
      placeWindTrap: (x, y) => {
        this.playerWindTrapX = x;
        this.playerWindTrapY = y;
        this.playerWindTrapExpiry = this.time.now + 5000;
        if (this.playerWindTrapSprite) this.playerWindTrapSprite.destroy();
        this.playerWindTrapSprite = this.add.circle(x, y, 80, 0xaaddff, 0).setDepth(3);
        this.playerWindTrapSprite.setStrokeStyle(3, 0xaaddff, 0.9);
        this.tweens.add({ targets: this.playerWindTrapSprite, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
      },
      grappleTo: (x, y) => {
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 1200;
        const travelTime = Math.min(350, (len / speed) * 1000);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
        this.isDodging = true;
        if (this.hasUpgrade('f')) {
          this.isGrappling = true;
          this.player.setAlpha(0.5);
        }
        this.time.delayedCall(travelTime, () => {
          if (this.player.active) {
            this.isDodging = false;
            this.isGrappling = false;
            this.player.setAlpha(1);
            body.setVelocity(0, 0);
            this.grappleDodgeCharges = 2;
            if (this.grappleDodgeAura) this.grappleDodgeAura.destroy();
            this.grappleDodgeAura = this.add.circle(this.player.x, this.player.y, 26, 0x6699cc, 0.35).setDepth(6);
            this.tweens.add({ targets: this.grappleDodgeAura, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });
          }
        });
        const trail = this.add.circle(this.player.x, this.player.y, 8, 0xaaddff, 0.5);
        this.tweens.add({ targets: trail, alpha: 0, duration: 300, onComplete: () => trail.destroy() });
      },
      reportAirSnipeResult: (hit) => {
        if (hit) { this.airConsecutiveHits = Math.min(this.airConsecutiveHits + 1, 3); }
        else { this.airConsecutiveHits = 0; }
      },
      quickShotActive: this.quickShotCharged,
      addShieldHp: (amount) => { this.player.shieldHp = Math.min(100, this.player.shieldHp + amount); },
      getShieldHp: () => this.player.shieldHp,
      setShieldHp: (amount) => { this.player.shieldHp = Math.max(0, amount); },
      slamCaster: () => {
        let dx = (this.dKey.isDown ? 1 : 0) - (this.aKey.isDown ? 1 : 0);
        let dy = (this.sKey.isDown ? 1 : 0) - (this.wKey.isDown ? 1 : 0);
        if (dx === 0 && dy === 0) {
          const pointer = this.input.activePointer;
          const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
          dx = Math.cos(ang); dy = Math.sin(ang);
        } else {
          const len = Math.sqrt(dx * dx + dy * dy); dx /= len; dy /= len;
        }
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(dx * 600, dy * 600);
        this.earthSlamActive = true;
        this.earthSlamEnd = this.time.now + 400;
        this.earthSlamHitDealt = false;
        this.isDodging = true;
      },
      dealMeleeDamage: (range, damage, knockback = 0) => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        if (dist > range) return;
        const pointer = this.input.activePointer;
        const dirX = pointer.worldX - this.player.x;
        const dirY = pointer.worldY - this.player.y;
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        const toNpcX = this.npc.x - this.player.x;
        const toNpcY = this.npc.y - this.player.y;
        const dot = (dirX / dirLen) * (toNpcX / dist) + (dirY / dirLen) * (toNpcY / dist);
        if (dot > 0.4) {
          this.npc.takeDamage(damage);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xaa8844);
          if (knockback > 0) {
            const nb = this.npc.body as Phaser.Physics.Arcade.Body;
            nb.setVelocity((toNpcX / dist) * knockback, (toNpcY / dist) * knockback);
          }
        }
      },
      startBullRush: () => {
        this.earthBullRushActive = true;
        this.earthBullRushEnd = this.time.now + 6000;
        this.earthBullRushSpeed = 100;
        this.earthBullRushLastHit = 0;
        this.earthBullRushDrApplied = false;
        this.isDodging = true;
        this.player.incomingDamageMultiplier *= 0.8;
        this.earthBullRushDrApplied = true;
        if (this.earthBullRushAura) this.earthBullRushAura.destroy();
        this.earthBullRushAura = this.add.circle(this.player.x, this.player.y, 36, 0xcc4400, 0.4).setDepth(6);
        this.tweens.add({ targets: this.earthBullRushAura, alpha: 0.15, yoyo: true, repeat: -1, duration: 220 });
      },
      spawnDrone: () => {
        if (this.playerDrones.length >= 6) return;
        const count = this.playerDrones.length;
        const spawnAngle = (count / 6) * Math.PI * 2;
        const sprite = this.add.circle(
          this.player.x + Math.cos(spawnAngle) * 60,
          this.player.y + Math.sin(spawnAngle) * 60,
          8, 0xffaa00, 0.9,
        ).setDepth(8);
        this.playerDrones.push({
          sprite, shotsLeft: 3, orbitAngle: spawnAngle,
          shielded: false, healedByFirewall: false, meleeCooldownUntil: 0, owner: 'player',
        });
      },
      commandDrones: (x, y) => {
        // All drones fire, each expending one shot
        for (const drone of this.playerDrones) {
          const laser = this.add.graphics().setDepth(8);
          laser.lineStyle(2, 0xffaa00, 0.8);
          laser.lineBetween(drone.sprite.x, drone.sprite.y, x, y);
          this.tweens.add({ targets: laser, alpha: 0, duration: 220, onComplete: () => laser.destroy() });
          if (Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) <= 40) {
            this.npc.takeDamage(3);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xffaa00);
          }
          drone.shotsLeft -= 1;
          // Destroy enemy projectiles along this laser's path
          for (const go of this.projectiles.getChildren()) {
            const proj = go as Projectile;
            if (!proj.active || proj.isFromPlayer) continue;
            if (this.pointToSegmentDist(proj.x, proj.y, drone.sprite.x, drone.sprite.y, x, y) <= 14) {
              proj.setActive(false).setVisible(false);
              (proj.body as Phaser.Physics.Arcade.Body).stop();
            }
          }
        }
        // R upgrade: ignite oil puddles near cursor
        if (this.hasUpgrade('r')) {
          for (const p of this.playerOilPuddles) {
            if (!p.ignited && Phaser.Math.Distance.Between(x, y, p.x, p.y) <= p.radius + 20) {
              p.ignited = true;
              const remaining = p.expiresAt - this.time.now;
              p.expiresAt = this.time.now + remaining * 0.5;
              p.sprite.setFillStyle(0xff4400, 0.65);
            }
          }
        }
        // Destroy drones with 0 shots; Click+ launches them as bombs instead of disappearing
        for (let di = this.playerDrones.length - 1; di >= 0; di--) {
          if (this.playerDrones[di].shotsLeft <= 0) {
            const dead = this.playerDrones[di];
            const spawnX = dead.sprite.x, spawnY = dead.sprite.y;
            dead.sprite.destroy();
            this.playerDrones.splice(di, 1);
            if (this.hasUpgrade('click')) {
              const bx = x, by = y;
              // Spawn a fresh projectile circle so the original sprite's lifecycle doesn't matter
              const bomb = this.add.circle(spawnX, spawnY, 7, 0xff6600, 0.9).setDepth(9);
              this.tweens.add({
                targets: bomb, x: bx, y: by, duration: 400, ease: 'Power2',
                onComplete: () => {
                  const boom = this.add.circle(bx, by, 8, 0xff6600, 0.9).setDepth(8);
                  this.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
                  bomb.destroy();
                  if (Phaser.Math.Distance.Between(bx, by, this.npc.x, this.npc.y) <= 60) {
                    this.npc.takeDamage(5);
                    this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
                  }
                },
              });
            }
          }
        }
      },
      launchDrone: (x, y) => {
        if (this.playerDrones.length === 0) return;
        const drone = this.playerDrones.pop()!;
        const dmg = Math.max(5, drone.shotsLeft * 5);
        this.tweens.add({
          targets: drone.sprite, x, y, duration: 500, ease: 'Power2',
          onComplete: () => {
            const boom = this.add.circle(x, y, 8, 0xff6600, 0.9).setDepth(8);
            this.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
            drone.sprite.destroy();
            if (Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) <= 60) {
              this.npc.takeDamage(dmg);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
            }
            if (this.hasUpgrade('r')) this.spawnOilPuddle(x, y, 'player');
          },
        });
      },
      placeFirewall: (x, y) => {
        if (this.playerFirewallSprite) this.playerFirewallSprite.destroy();
        // Rotate so the long side (120px) faces the player
        const angle = Math.atan2(this.player.y - y, this.player.x - x) - Math.PI / 2;
        this.playerFirewallAngle = angle;
        const fwHp = this.hasUpgrade('f') ? 200 : 100;
        this.playerFirewallSprite = this.add.rectangle(x, y, 120, 60, 0xff6600, 0.45)
          .setStrokeStyle(2, 0xff8800).setDepth(3).setRotation(angle);
        this.playerFirewallHp = fwHp;
        this.playerFirewallX = x;
        this.playerFirewallY = y;
      },
      startOverdrive: (x, y) => {
        if (this.playerDrones.length === 0) return;
        const angle = Math.atan2(y - this.player.y, x - this.player.x);
        const duration = 500 * this.playerDrones.length;
        this.playerOverdriveDroneCount = this.playerDrones.length;
        this.playerOverdriveActive = true;
        this.playerOverdriveEnd = this.time.now + duration;
        this.playerOverdriveAngle = angle;
        this.playerOverdriveTickAccum = 0;
        this.nukeChanneling = true;
        this.nukeChannelEnd = this.playerOverdriveEnd;
        if (!this.playerOverdriveGraphics) {
          this.playerOverdriveGraphics = this.add.graphics().setDepth(7);
        }
      },
      launchDarkBomb: (x, y) => {
        const bomb = this.add.circle(this.player.x, this.player.y, 10, 0x660088, 0.95)
          .setStrokeStyle(2, 0xcc44ff).setDepth(8);
        this.tweens.add({
          targets: bomb, x, y, duration: 380, ease: 'Power2',
          onComplete: () => {
            const boom = this.add.circle(x, y, 8, 0x8800cc, 0.8).setDepth(8);
            this.tweens.add({ targets: boom, scaleX: 7, scaleY: 7, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
            bomb.destroy();
            if (Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) <= 50) {
              this.npc.takeDamage(10);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x8800cc);
            }
            this.spawnShadowDarkCloud(x, y, 'player');
          },
        });
      },
      activateTentacle: (x, y) => {
        // Close-range hook: only hooks if NPC is within 110px
        const hookDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        this.shadowTentacleActive = true;
        this.shadowTentacleHooked = hookDist <= 110;
        // R+: check if a trap is near cursor — extend duration for drag
        const hasTrapNearby = this.hasUpgrade('r') && this.shadowSnapTraps.some(
          t => t.owner === 'player' && !t.triggered &&
               Phaser.Math.Distance.Between(t.x, t.y, x, y) <= 55,
        );
        this.shadowTentacleEnd = this.time.now + (this.shadowTentacleHooked ? 3000 : hasTrapNearby ? 3000 : 600);
        // Tentacle endpoint: toward cursor but clamped to 100px range
        const angle = Math.atan2(y - this.player.y, x - this.player.x);
        const reach = Math.min(100, Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y));
        this.shadowTentacleX = this.player.x + Math.cos(angle) * reach;
        this.shadowTentacleY = this.player.y + Math.sin(angle) * reach;
        if (!this.shadowTentacleSprite) {
          this.shadowTentacleSprite = this.add.graphics().setDepth(6);
        }
        if (this.shadowTentacleHooked) {
          this.npc.takeDamage(10);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0x8800cc);
        }
      },
      placeSnapTrap: () => {
        const trapRadius = this.hasUpgrade('r') ? 27 : 18;
        const spr = this.add.circle(this.player.x, this.player.y, trapRadius, 0x440066, 0.85)
          .setStrokeStyle(2, 0xcc44ff).setDepth(3);
        const lbl = this.add.text(this.player.x, this.player.y, '⚡', { fontSize: '10px' }).setOrigin(0.5).setDepth(4);
        this.shadowSnapTraps.push({
          sprite: spr, label: lbl,
          expiresAt: this.time.now + 12000,
          x: this.player.x, y: this.player.y,
          triggered: false, radius: trapRadius, owner: 'player',
        });
      },
      activateShadowDance: () => {
        if (this.hasUpgrade('f')) {
          if (this.shadowDanceCharge <= 0 || this.time.now < this.shadowDanceUpgradeCooldownUntil) return;
          this.shadowDanceUpgradeCooldownUntil = this.time.now + 2000;
          const ratio = Math.min(1, this.shadowDanceCharge / 35);
          const wasFull = this.shadowDanceCharge >= 35;
          this.shadowDanceCharge = 0;
          const healAmt = wasFull ? 38 : Math.round((5 + ratio * 15) * 1.5);
          this.player.heal(healAmt);
          if (wasFull) {
            this.shadowDanceUpgradeDodgeUntil = this.time.now + 8000;
            const dTxt = this.add.text(this.player.x, this.player.y - 44, '👻 PHANTOM STEP', { fontSize: '10px', color: '#cc44ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
            this.tweens.add({ targets: dTxt, y: dTxt.y - 18, alpha: 0, duration: 1400, onComplete: () => dTxt.destroy() });
          }
        } else {
          if (this.shadowDanceCharge < 35) return;
          this.shadowDanceCharge = 0;
          this.player.heal(38);
        }
        const flash = this.add.circle(this.player.x, this.player.y, 40, 0x8800cc, 0.5).setDepth(8);
        this.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
      },
      startBlackHole: () => {
        this.shadowBlackHoleCharging = true;
        this.shadowBlackHoleChargeStart = this.time.now;
        if (this.shadowBlackHoleChargeVisual) this.shadowBlackHoleChargeVisual.destroy();
        this.shadowBlackHoleChargeVisual = this.add.circle(this.player.x, this.player.y, 24, 0xffcc00, 0.6).setDepth(9);
        this.tweens.add({ targets: this.shadowBlackHoleChargeVisual, scaleX: 1.3, scaleY: 1.3, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
        this.nukeChanneling = true;
        this.nukeChannelEnd = this.time.now + 3100;
      },
      // Ice
      fireIceSpike: (tx, ty) => {
        const dx = tx - this.player.x;
        const dy = ty - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const isPowered = this.playerNextIcePowered;
        if (isPowered) this.playerNextIcePowered = false;
        const proj = new Projectile(this, this.player.x, this.player.y, 'proj-ice', 8, true);
        if (isPowered) { proj.setScale(1.2); proj.isPowered = true; }
        this.projectiles.add(proj);
        proj.launch((dx / len) * 520, (dy / len) * 520);
        if (this.hasUpgrade('click')) this.playerIcePendingSet.add(proj);
      },
      fireFrostBlast: (tx, ty) => {
        const isBlackIce = this.playerBlackIceMorphActive;
        const targetStacks = isBlackIce ? this.npcVoidFrostStacks : this.npcFrostStacks;
        if (targetStacks === 0) return;
        const dx = tx - this.player.x;
        const dy = ty - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy / len, dx / len);
        const endX = this.player.x + Math.cos(angle) * 1200;
        const endY = this.player.y + Math.sin(angle) * 1200;
        this.spawnFrostBeamVisual(this.player.x, this.player.y, endX, endY);
        const d = this.pointToSegmentDist(this.npc.x, this.npc.y, this.player.x, this.player.y, endX, endY);
        if (d <= 32) {
          this.npc.takeDamage(Math.round(targetStacks * 7.5));
          this.spawnHitFlash(this.npc.x, this.npc.y, isBlackIce ? 0x9900ff : 0x88ccff);
          if (isBlackIce) {
            // Apply voided debuff
            const voidedDps = targetStacks >= 5 ? 3 : targetStacks >= 3 ? 2 : 1;
            this.npcVoidedUntil = this.time.now + 5000;
            this.npcVoidedDps = voidedDps;
            this.npcVoidedTickAccum = 0;
            this.npcVoidFrostStacks = 0;
            this.npc.incomingDamageMultiplier = 1;
            const vt = this.add.text(this.npc.x, this.npc.y - 30, 'VOIDED', { fontSize: '11px', color: '#cc88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
            this.tweens.add({ targets: vt, y: vt.y - 20, alpha: 0, duration: 1200, onComplete: () => vt.destroy() });
          } else {
            // E+: keep residual frost stacks
            if (this.hasUpgrade('e')) {
              const stacks = this.npcFrostStacks;
              this.clearFrostStacks('npc');
              if (stacks >= 5) {
                this.npcFrostStacks = 2;
                this.npc.incomingDamageMultiplier = this.frostDamageMultiplier(2);
              } else if (stacks >= 3) {
                this.npcFrostStacks = 1;
                this.npc.incomingDamageMultiplier = this.frostDamageMultiplier(1);
              }
            } else {
              this.clearFrostStacks('npc');
            }
          }
        }
      },
      toggleBlockUp: () => {
        if (this.hasUpgrade('r')) {
          // R+: Black Ice Morph replaces Block Up
          this.playerBlackIceMorphActive = !this.playerBlackIceMorphActive;
          if (this.playerBlackIceMorphActive) {
            this.player.incomingDamageMultiplier = this.frostDamageMultiplier(this.playerFrostStacks) * 1.20;
            if (!this.playerBlackIceAura) {
              this.playerBlackIceAura = this.add.circle(this.player.x, this.player.y, 30, 0x220044, 0.4)
                .setStrokeStyle(2, 0x9900ff, 0.9).setDepth(3);
            }
            const mt = this.add.text(this.player.x, this.player.y - 36, 'BLACK ICE', { fontSize: '11px', color: '#cc88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
            this.tweens.add({ targets: mt, y: mt.y - 20, alpha: 0, duration: 1200, onComplete: () => mt.destroy() });
          } else {
            this.player.incomingDamageMultiplier = this.frostDamageMultiplier(this.playerFrostStacks);
            if (this.playerBlackIceAura) { this.playerBlackIceAura.destroy(); this.playerBlackIceAura = null; }
          }
        } else {
          this.playerBlockUpActive = !this.playerBlockUpActive;
          this.player.incomingDamageMultiplier = this.playerBlockUpActive
            ? this.frostDamageMultiplier(this.playerFrostStacks) * 0.75
            : this.frostDamageMultiplier(this.playerFrostStacks);
          if (this.playerBlockUpActive) {
            if (!this.playerBlockUpAura) {
              this.playerBlockUpAura = this.add.circle(this.player.x, this.player.y, 28, 0x88ccff, 0.25)
                .setStrokeStyle(2, 0xcceeff, 0.8).setDepth(3);
            }
          } else {
            if (this.playerBlockUpAura) { this.playerBlockUpAura.destroy(); this.playerBlockUpAura = null; }
          }
        }
      },
      startSkate: () => {
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        let dx = (this.dKey.isDown ? 1 : 0) - (this.aKey.isDown ? 1 : 0);
        let dy = (this.sKey.isDown ? 1 : 0) - (this.wKey.isDown ? 1 : 0);
        if (dx === 0 && dy === 0) {
          const ptr = this.input.activePointer;
          const a = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
          dx = Math.cos(a); dy = Math.sin(a);
        } else {
          const l = Math.sqrt(dx * dx + dy * dy); dx /= l; dy /= l;
        }
        playerBody.setVelocity(dx * 650, dy * 650);
        this.player.isInvincible = true;
        for (let i = 0; i < 5; i++) {
          this.time.delayedCall(i * 55, () => {
            if (this.player.active) this.spawnIcyTrail(this.player.x, this.player.y, 'player');
          });
        }
        this.time.delayedCall(275, () => { if (this.player.active) this.player.isInvincible = false; });
      },
      fireFrozenSolid: (tx, ty) => {
        const angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        this.spawnFrozenSolidVisual(this.player.x, this.player.y, angle);
        const npcAngle = Math.atan2(this.npc.y - this.player.y, this.npc.x - this.player.x);
        const diff = Math.abs(Phaser.Math.Angle.Wrap(npcAngle - angle));
        if (diff <= Math.PI / 8) {
          if (this.npcFrozenUntil > this.time.now) {
            this.npcFrozenUntil = 0;
            for (let fi = 0; fi < 3; fi++) this.addFrostStack('npc');
          } else {
            this.npcFrozenUntil = this.time.now + 3000;
            this.spawnHitFlash(this.npc.x, this.npc.y, 0x88ccff);
            if (this.hasUpgrade('q')) this.npcFrozenSolidAmpReady = true;
          }
        }
      },
      // Growth
      fireGrowthClick: (tx, ty) => {
        const angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        const fireBonus = this.hasUpgrade('click') && Math.random() < 0.15;
        const fireSpores = (ox: number, oy: number) => {
          const sporeSpeed = 400 * (1 + this.growthSpreadStacks * 0.2);
          const sporeAngles = [-12, -6, 0, 6, 12];
          for (const deg of sporeAngles) {
            const a = angle + deg * (Math.PI / 180);
            const proj = new Projectile(this, ox, oy, 'proj-growth', Math.round(5 * this.growthDamageMult), true);
            this.projectiles.add(proj);
            const vx = Math.cos(a) * sporeSpeed;
            const vy = Math.sin(a) * sporeSpeed;
            proj.launch(vx, vy);
            const pb = proj.body as Phaser.Physics.Arcade.Body;
            this.tweens.add({ targets: pb.velocity, x: 0, y: 0, duration: 600,
              onComplete: () => { this.time.delayedCall(200, () => { if (proj.active) { proj.setActive(false).setVisible(false); } }); } });
          }
        };
        if (this.growthMorphType === 'spores') {
          fireSpores(this.player.x, this.player.y);
        } else if (this.growthMorphType === 'claws') {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (dist <= 120) {
            const ptr = this.input.activePointer;
            const dx = ptr.worldX - this.player.x; const dy = ptr.worldY - this.player.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const toNx = this.npc.x - this.player.x; const toNy = this.npc.y - this.player.y;
            const dot = (dx / len) * (toNx / dist) + (dy / len) * (toNy / dist);
            if (dot > 0.4) {
              const clawDmg = Math.round((15 + this.growthSpreadStacks * 5) * this.growthDamageMult);
              this.npc.takeDamage(clawDmg);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x88bb22);
            }
          }
          const slashAngle = Math.atan2(ty - this.player.y, tx - this.player.x);
          const slash = this.add.rectangle(
            this.player.x + Math.cos(slashAngle) * 50, this.player.y + Math.sin(slashAngle) * 50,
            50, 10, 0x88bb22, 0.8,
          ).setRotation(slashAngle).setDepth(6);
          this.tweens.add({ targets: slash, scaleX: 0.3, alpha: 0, duration: 140, onComplete: () => slash.destroy() });
        } else if (this.growthMorphType === 'virus') {
          const virusCount = 3 + this.growthSpreadStacks;
          const spreadStep = virusCount > 1 ? 30 / (virusCount - 1) : 0;
          for (let vi = 0; vi < virusCount; vi++) {
            const degOffset = virusCount > 1 ? -15 + vi * spreadStep : 0;
            const a = angle + degOffset * (Math.PI / 180);
            const proj = new Projectile(this, this.player.x, this.player.y, 'proj-growth', Math.round(8 * this.growthDamageMult), true);
            this.projectiles.add(proj);
            proj.launch(Math.cos(a) * 480, Math.sin(a) * 480);
          }
        } else if (this.growthMorphType === 'plague-bomb') {
          const bombRadius = Math.round(80 * (1 + this.growthSpreadStacks * 0.2));
          const bomb = this.add.circle(this.player.x, this.player.y, 10, 0x88bb22, 0.9)
            .setStrokeStyle(2, 0xccff44).setDepth(8);
          this.tweens.add({
            targets: bomb, x: tx, y: ty, duration: 420, ease: 'Power2',
            onComplete: () => {
              const boom = this.add.circle(tx, ty, 8, 0x88bb22, 0.8).setDepth(8);
              this.tweens.add({ targets: boom, scaleX: bombRadius / 8, scaleY: bombRadius / 8, alpha: 0, duration: 380, onComplete: () => boom.destroy() });
              bomb.destroy();
              const dmg = Math.round(15 * this.growthDamageMult);
              if (Phaser.Math.Distance.Between(tx, ty, this.npc.x, this.npc.y) <= bombRadius) {
                this.npc.takeDamage(dmg);
                this.spawnHitFlash(this.npc.x, this.npc.y, 0x88bb22);
                const ft = this.add.text(this.npc.x, this.npc.y - 30, `💥 ${dmg}`, { fontSize: '11px', color: '#aadd44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
                this.tweens.add({ targets: ft, y: ft.y - 25, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
              }
            },
          });
        } else if (this.growthMorphType === 'bacterium') {
          const bacteriumHp = 10 + this.growthSpreadStacks * 5;
          const bSprite = this.add.circle(this.player.x, this.player.y, 8, 0x55cc22, 0.9)
            .setStrokeStyle(2, 0xaaff44).setDepth(4);
          this.growthBacteriaList.push({ sprite: bSprite, hp: bacteriumHp, lastContactTime: -99999 });
        }
        // Click+: 15% chance to fire 3 bonus spores regardless of evolution
        if (fireBonus) {
          const bAngles = [-8, 0, 8];
          const bonusSpeed = 400 * (1 + this.growthSpreadStacks * 0.2);
          for (const deg of bAngles) {
            const a = angle + deg * (Math.PI / 180);
            const proj = new Projectile(this, this.player.x, this.player.y, 'proj-growth', Math.round(5 * this.growthDamageMult), true);
            this.projectiles.add(proj);
            proj.launch(Math.cos(a) * bonusSpeed, Math.sin(a) * bonusSpeed);
            const pb = proj.body as Phaser.Physics.Arcade.Body;
            this.tweens.add({ targets: pb.velocity, x: 0, y: 0, duration: 600,
              onComplete: () => { this.time.delayedCall(200, () => { if (proj.active) { proj.setActive(false).setVisible(false); } }); } });
          }
        }
      },
      openMutateMenu: () => {
        if (this.growthMutateMenuOpen) return;
        this.growthMutateMenuOpen = true;
        const BASE_MUTATIONS = [
          { id: 'healthier',    name: 'Healthier',    description: '+10 max HP',             emoji: '💚' },
          { id: 'deadly',       name: 'Deadly',       description: '+15% damage',             emoji: '💀' },
          { id: 'linger',       name: 'Linger',       description: '+3s toxic duration',      emoji: '⏳' },
          { id: 'viral',        name: 'Viral',        description: '+2 toxic DPS',            emoji: '🧬' },
          { id: 'grow',         name: 'Grow',         description: '+20 HP, +20% size',       emoji: '📈' },
          { id: 'shrink',       name: 'Shrink',       description: '-20 HP, -20% size',       emoji: '📉' },
          { id: 'buffer',       name: 'Buffer',       description: '-0.5s bloat CD',          emoji: '🛡️' },
          { id: 'spray',        name: 'Spray',        description: '+1 infect projectile',    emoji: '🗡️' },
          { id: 'quick',        name: 'Quick',        description: '-0.5s infect CD',         emoji: '⚡' },
          { id: 'regenerative', name: 'Regenerative', description: '+1 HP/s regen',           emoji: '♻️' },
        ];
        const ADVANCED_MUTATIONS = [
          { id: 'chunk',          name: 'Chunk',          description: '+10% bloat AOE radius',               emoji: '💥' },
          { id: 'relapse',        name: 'Relapse',        description: 'Infect bounces off +1 wall',          emoji: '↩️' },
          { id: 'gene-enhance',   name: 'Gene Enhance',   description: 'Remove 20s from Q cooldown now',      emoji: '🧪' },
          { id: 'spread',         name: 'Spread',         description: 'Evo bonus (spores: +20% range, virus: +1 shot, claws: +5 dmg, plague: +20% AOE, bacterium: +5 HP)', emoji: '🌿' },
          { id: 'uber-infect',    name: 'Uber-Infect',    description: '+20% infect hitbox',                  emoji: '🔬' },
          { id: 'fungal-flourish',name: 'Fungal Flourish',description: 'Heal 10 HP (+10 per stack) when bloat explodes', emoji: '🍄' },
          { id: 'greed',          name: 'Greed',          description: '+1 option in future Mutate menus',    emoji: '🤑' },
          { id: 'sneeze',         name: 'Sneeze',         description: 'Green aura deals +1 tick dmg/s to nearby enemy', emoji: '🤧' },
          { id: 'cough',          name: 'Cough',          description: 'Yellow aura slows nearby enemy by 5% more', emoji: '😷' },
        ];
        const pool = this.hasUpgrade('e') ? [...BASE_MUTATIONS, ...ADVANCED_MUTATIONS] : [...BASE_MUTATIONS];
        const picks: typeof pool = [];
        const numPicks = 3 + this.growthGreedBonus;
        const poolCopy = [...pool];
        for (let p = 0; p < numPicks && poolCopy.length > 0; p++) {
          const idx = Math.floor(Math.random() * poolCopy.length);
          picks.push(poolCopy.splice(idx, 1)[0]);
        }
        const W = this.scale.width;
        const H = this.scale.height;
        const btnW = 220; const btnH = 58; const gap = 10;
        const startY = H / 2 - ((btnH + gap) * (picks.length - 1)) / 2;
        for (let p = 0; p < picks.length; p++) {
          const mut = picks[p];
          const by = startY + p * (btnH + gap);
          const bg = this.add.rectangle(W / 2, by, btnW, btnH, 0x223322, 1)
            .setStrokeStyle(2, 0x88bb22).setDepth(30).setInteractive({ useHandCursor: true });
          const lbl = this.add.text(W / 2, by - 10, `${mut.emoji} ${mut.name}`, { fontSize: '14px', fontFamily: '"Arial Black"', color: '#aadd44' }).setOrigin(0.5).setDepth(31);
          const desc = this.add.text(W / 2, by + 12, mut.description, { fontSize: '10px', color: '#888888' }).setOrigin(0.5).setDepth(31);
          bg.on('pointerover', () => bg.setFillStyle(0x334433));
          bg.on('pointerout', () => bg.setFillStyle(0x223322));
          bg.on('pointerdown', () => {
            this.applyGrowthMutation(mut.id, 'player');
            for (const obj of this.growthMutateButtons) {
              if ((obj as Phaser.GameObjects.GameObject).active) (obj as unknown as { destroy(): void }).destroy();
            }
            this.growthMutateButtons = [];
            this.growthMutateMenuOpen = false;
          });
          this.growthMutateButtons.push(bg, lbl, desc);
        }
      },
      fireInfect: (tx, ty) => {
        const effectiveCd = Math.max(1000, this.growthInfectCdMs);
        if (this.time.now - this.lastPlayerInfectCast < effectiveCd) return;
        this.lastPlayerInfectCast = this.time.now;
        const baseAngle = Math.atan2(ty - this.player.y, tx - this.player.x);
        const count = 1 + this.growthInfectExtraProj;
        for (let i = 0; i < count; i++) {
          const spread = count > 1 ? (i - (count - 1) / 2) * 8 * (Math.PI / 180) : 0;
          const a = baseAngle + spread;
          const proj = new Projectile(this, this.player.x, this.player.y, 'proj-growth-dagger', Math.round(5 * this.growthDamageMult), true);
          this.projectiles.add(proj);
          proj.launch(Math.cos(a) * 520, Math.sin(a) * 520);
          // Uber-infect: scale hitbox
          if (this.growthInfectHitboxMult > 1) {
            const body = proj.body as Phaser.Physics.Arcade.Body;
            body.setSize(Math.round(12 * this.growthInfectHitboxMult), Math.round(8 * this.growthInfectHitboxMult));
          }
          // Relapse: enable wall bounce tracking
          if (this.growthInfectBounces > 0) {
            this.growthInfectBouncers.push({ proj, bouncesDone: 0 });
          }
        }
      },
      activateBloat: () => {
        const effectiveBloatCd = Math.max(1000, this.growthBloatCdMs);
        if (this.time.now - this.lastPlayerBloatCast < effectiveBloatCd) return;
        this.lastPlayerBloatCast = this.time.now;
        this.growthBloatActive = true;
        this.growthBloatEnd = this.time.now + 5000;
        if (this.growthBloatAura) this.growthBloatAura.destroy();
        this.growthBloatAura = this.add.circle(this.player.x, this.player.y, 30, 0xdddd00, 0.3)
          .setStrokeStyle(2, 0xffff44, 0.8).setDepth(5);
        this.tweens.add({ targets: this.growthBloatAura, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
      },
      triggerMutantMorph: () => {
        const morphPool: Array<'spores' | 'claws' | 'virus' | 'plague-bomb' | 'bacterium'> = ['spores', 'claws', 'virus'];
        if (this.hasUpgrade('q')) { morphPool.push('plague-bomb', 'bacterium'); }
        this.growthMorphType = morphPool[Math.floor(Math.random() * morphPool.length)];
        const morphNames: Record<string, string> = { spores: 'SPORES', claws: 'CLAWS', virus: 'VIRUS', 'plague-bomb': 'PLAGUE BOMB', bacterium: 'BACTERIUM' };
        const txt = this.add.text(this.player.x, this.player.y - 50, morphNames[this.growthMorphType],
          { fontSize: '14px', fontFamily: '"Arial Black"', color: '#88bb22', stroke: '#003300', strokeThickness: 3 }).setOrigin(0.5).setDepth(15);
        this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
      },
      // Crystal
      fireCrystalLaser: (tx, ty) => {
        this.fireCrystalLaserFrom(this.player.x, this.player.y, tx, ty, 4, true);
        for (const cl of this.crystalClones) {
          this.fireCrystalLaserFrom(this.player.x + cl.offsetX, this.player.y + cl.offsetY, tx, ty, 4, true);
        }
      },
      placeCrystalNode: (tx, ty) => {
        const playerNodes = this.crystalNodes.filter((n) => n.owner === 'player');
        if (playerNodes.length >= 3) {
          playerNodes[0].sprite.destroy();
          this.crystalNodes.splice(this.crystalNodes.indexOf(playerNodes[0]), 1);
        }
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
        if (this.hasUpgrade('e')) {
          // E+: crystal glides from player toward cursor and keeps moving
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const speed = 67;
          const vx = (dx / dist) * speed, vy = (dy / dist) * speed;
          const spr = this.add.rectangle(this.player.x, this.player.y, 6, 28, 0xaaeeff, 0.9)
            .setStrokeStyle(1, 0xeeffff, 1).setDepth(4).setAngle(angleDeg);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
          this.crystalNodes.push({ sprite: spr, x: this.player.x, y: this.player.y, owner: 'player', vx, vy, moving: true, targetX: Infinity, targetY: Infinity, lastPortalTime: -99999 });
        } else {
          // Base: place instantly at cursor position
          const spr = this.add.rectangle(tx, ty, 6, 28, 0xaaeeff, 0.9)
            .setStrokeStyle(1, 0xeeffff, 1).setDepth(4).setAngle(angleDeg);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
          this.crystalNodes.push({ sprite: spr, x: tx, y: ty, owner: 'player', vx: 0, vy: 0, moving: false, targetX: tx, targetY: ty, lastPortalTime: -99999 });
        }
      },
      startCrystalBarrage: (tx, ty) => {
        this.crystalBarrageActive = true;
        this.crystalBarrageEnd = this.time.now + 1500; // half as long
        this.crystalBarrageAccum = 0;
        this.crystalBarrageShots = 0;
        this.crystalBarrageTX = tx;
        this.crystalBarrageTY = ty;
      },
      placeCrystalPortal: (tx, ty) => {
        const playerPortals = this.crystalPortals.filter((p) => p.owner === 'player');
        if (playerPortals.length >= 2) {
          playerPortals[0].sprite.destroy(); playerPortals[0].label.destroy();
          this.crystalPortals.splice(this.crystalPortals.indexOf(playerPortals[0]), 1);
        }
        const idx = this.crystalPortals.filter((p) => p.owner === 'player').length;
        const color = idx === 0 ? 0xaa44ff : 0xff44aa;
        const lbl = idx === 0 ? 'A' : 'B';
        const spr = this.add.circle(tx, ty, 18, color, 0.5)
          .setStrokeStyle(3, color, 0.9).setDepth(4);
        this.tweens.add({ targets: spr, alpha: 0.2, yoyo: true, repeat: -1, duration: 700 });
        const lblObj = this.add.text(tx, ty, lbl, {
          fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
        }).setOrigin(0.5).setDepth(5);
        this.crystalPortals.push({ sprite: spr, label: lblObj, x: tx, y: ty, owner: 'player' });
      },
      activateCrystalTrick: () => {
        for (const cl of this.crystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
        this.crystalClones = [];
        this.crystalTrickEnd = this.time.now + 12000;
        // Base offsets in "player-faces-up" local space (y-up = forward)
        // Q+: 3 forward-shield clones; base: 2 side-flanking clones
        const baseOffsets = this.hasUpgrade('q')
          ? [{ x: 0, y: -50 }, { x: -40, y: -30 }, { x: 40, y: -30 }]
          : [{ x: -58, y: 0 }, { x: 58, y: 0 }];
        const cx = this.player.x, cy = this.player.y;
        for (const off of baseOffsets) {
          const hpBg = this.add.rectangle(cx, cy - 28, 30, 5, 0x222222).setDepth(12);
          const hpBar = this.add.rectangle(cx - 15, cy - 28, 30, 5, 0x44ff88).setDepth(13).setOrigin(0, 0.5);
          const spr = this.add.circle(cx, cy, 16, 0x88ccff, 0.85)
            .setStrokeStyle(2, 0xaaeeff).setDepth(11);
          const dir = this.add.rectangle(cx, cy - 20, 4, 10, 0xffffff, 0.8).setDepth(14);
          this.crystalClones.push({ sprite: spr, hp: 50, maxHp: 50, baseOffsetX: off.x, baseOffsetY: off.y, offsetX: off.x, offsetY: off.y, hpBar, hpBg, dirIndicator: dir });
        }
      },
      // Soul
      fireSoulOrb: (tx, ty) => {
        if (this.time.now - this.lastPlayerSoulOrbCast < 800) return;
        this.lastPlayerSoulOrbCast = this.time.now;
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speedMult = this.hasUpgrade('f') && this.time.now < this.soulGhoulSpeedBuffUntil ? 1.5 : 1;
        const speed = 104 * speedMult;
        const ox = this.player.x + (dx / dist) * 32;
        const oy = this.player.y + (dy / dist) * 32;
        const spr = this.add.circle(ox, oy, 12, 0xccaaff, 0.7)
          .setStrokeStyle(2, 0xeeddff, 0.9).setDepth(7);
        this.tweens.add({ targets: spr, alpha: 0.4, yoyo: true, repeat: -1, duration: 400 });
        this.playerSoulOrbs.push({ sprite: spr, expiresAt: this.time.now + 3000, x: ox, y: oy, vx: (dx / dist) * speed, vy: (dy / dist) * speed, owner: 'player', lastContactTick: -99999 });
      },
      summonGhost: (ghostType) => {
        const cost = ghostType === 'basic' ? 1 : ghostType === 'ghoul' ? 2 : ghostType === 'banshee' ? 3 : ghostType === 'corpse' ? 4 : ghostType === 'necromancer' ? 5 : 5;
        if (this.soulGhosts < cost) return;
        if (this.time.now - this.lastPlayerSummon < 2000) return;
        this.lastPlayerSummon = this.time.now;
        this.soulGhosts -= cost;
        if (this.soulGhostText) this.soulGhostText.setText(`👻 ${this.soulGhosts}`);
        const enhanced = this.time.now < this.soulNecroEnhancedUntil;
        if (ghostType === 'corpse') {
          // Summon 6 corpses
          for (let i = 0; i < 6; i++) {
            const ox = this.player.x + (Math.random() - 0.5) * 60;
            const oy = this.player.y + (Math.random() - 0.5) * 60;
            this.spawnSoulGhost('corpse', ox, oy, 'player', enhanced);
          }
        } else {
          this.spawnSoulGhost(ghostType, this.player.x, this.player.y, 'player', enhanced);
        }
      },
      soulSacrifice: () => {
        if (this.time.now - this.lastPlayerSacrifice < 3000) return;
        this.lastPlayerSacrifice = this.time.now;
        this.player.applySelfDamage(10);
        this.soulGhosts++;
        if (this.soulGhostText) this.soulGhostText.setText(`👻 ${this.soulGhosts}`);
        const flash = this.add.circle(this.player.x, this.player.y, 20, 0x9944ff, 0.6).setDepth(8);
        this.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      },
      soulConsume: () => {
        if (this.time.now - this.lastPlayerConsume < 3000) return;
        this.lastPlayerConsume = this.time.now;
        const consumeR = 150;
        const hasFUpgrade = this.hasUpgrade('f');
        for (let i = this.playerSoulSummons.length - 1; i >= 0; i--) {
          const gs = this.playerSoulSummons[i];
          if (Phaser.Math.Distance.Between(gs.sprite.x, gs.sprite.y, this.player.x, this.player.y) <= consumeR) {
            if (!hasFUpgrade) {
              this.player.heal(Math.floor(gs.hp / 2));
            } else {
              switch (gs.type) {
                case 'basic':
                  this.player.heal(Math.floor(gs.hp / 2));
                  break;
                case 'ghoul':
                  this.player.heal(Math.floor(gs.hp / 2));
                  this.soulGhoulSpeedBuffUntil = this.time.now + 5000;
                  this.showFloatingText(this.player.x, this.player.y - 20, '+Speed', '#88aaff');
                  break;
                case 'banshee':
                  this.player.heal(gs.hp); // increased healing
                  this.soulBansheeResistUntil = this.time.now + 5000;
                  this.showFloatingText(this.player.x, this.player.y - 20, 'Resist', '#ddaaff');
                  break;
                case 'corpse': {
                  const shieldAmt = gs.enhanced ? 20 : 10;
                  this.player.shieldHp += shieldAmt;
                  this.soulCorpseArmorActive = true;
                  if (this.soulCorpseArmorVisual) this.soulCorpseArmorVisual.destroy();
                  this.soulCorpseArmorVisual = this.add.circle(this.player.x, this.player.y, 28, 0x88aa66, 0.35).setDepth(4);
                  this.tweens.add({ targets: this.soulCorpseArmorVisual, alpha: 0.15, yoyo: true, repeat: -1, duration: 500 });
                  this.showFloatingText(this.player.x, this.player.y - 20, `+${shieldAmt} Armor`, '#88aa66');
                  break;
                }
                case 'necromancer':
                  this.soulNecroEnhancedUntil = this.time.now + 5000;
                  this.showFloatingText(this.player.x, this.player.y - 20, 'Enhanced!', '#ffcc44');
                  break;
                case 'knight':
                  this.player.heal(Math.floor(gs.hp / 2));
                  this.soulKnightSpeedBuffUntil = this.time.now + 5000;
                  this.showFloatingText(this.player.x, this.player.y - 20, '+Speed', '#ffaacc');
                  break;
              }
            }
            gs.sprite.destroy();
            this.playerSoulSummons.splice(i, 1);
          }
        }
        const ring = this.add.circle(this.player.x, this.player.y, 10, 0xccaaff, 0.5).setDepth(8);
        this.tweens.add({ targets: ring, scaleX: 15, scaleY: 15, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
      },
      // Hunt
      huntThrowGrenade: (tx, ty, holdMs) => {
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 500;
        const ox = this.player.x, oy = this.player.y;
        const fuseDur = this.hasUpgrade('e') ? 1500 : 3000;
        const isHeal = this.hasUpgrade('f') && this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd;
        const spr = this.add.circle(ox, oy, 10, isHeal ? 0x44cc44 : 0xff6600, 0.9)
          .setStrokeStyle(2, isHeal ? 0x88ff88 : 0xffaa00, 1).setDepth(8);
        this.huntGrenades.push({
          sprite: spr, x: ox, y: oy, startX: ox, startY: oy,
          vx: (dx / dist) * speed, vy: (dy / dist) * speed,
          explodeAt: this.time.now + (fuseDur - Math.min(holdMs, fuseDur - 100)),
          selfDamage: false, owner: 'player', stopped: false, isHealGrenade: isHeal,
        });
      },
      huntHuntersTrail: () => {
        this.huntTrailActive = true;
        this.huntPermTrailActive = false;
        this.huntTrailEnd = this.time.now + 4500;
        this.huntTrailAccum = 0;
        const flash = this.add.circle(this.player.x, this.player.y, 24, 0xcc3300, 0.5).setDepth(6);
        this.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      },
      huntBloodPact: () => {
        this.huntBloodPactActive = true;
        this.huntBloodPactEnd = this.time.now + 5000;
        if (this.huntBloodPactAura) this.huntBloodPactAura.destroy();
        this.huntBloodPactAura = this.add.circle(this.player.x, this.player.y, 36, 0xaa0022, 0.45)
          .setStrokeStyle(2, 0xff2244, 0.7).setDepth(4);
        this.tweens.add({ targets: this.huntBloodPactAura, alpha: 0.15, yoyo: true, repeat: -1, duration: 500 });
        this.showFloatingText(this.player.x, this.player.y - 24, '🩸 Blood Pact', '#ff2244');
      },
      huntTransform: () => {
        if (this.hasUpgrade('q')) {
          // Q+ upgrade: transform to vampire form
          this.huntVampireForm = true;
          this.player.incomingDamageMultiplier = 0.65;
          this.huntToggleVampireHud(true);
          const burst = this.add.circle(this.player.x, this.player.y, 20, 0x660033, 0.9).setDepth(8);
          this.tweens.add({ targets: burst, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 400, onComplete: () => burst.destroy() });
          this.showFloatingText(this.player.x, this.player.y - 24, '🧛 Vampire Form', '#cc44ff');
        } else {
          this.huntBeastForm = true;
          this.player.setScale(1.2);
          (this.player.body as Phaser.Physics.Arcade.Body).setCircle(26, 3, 3);
          this.player.incomingDamageMultiplier = 0.65;
          this.huntToggleBeastHud(true);
          const burst = this.add.circle(this.player.x, this.player.y, 20, 0xcc2200, 0.8).setDepth(8);
          this.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
        }
      },
      huntSlash: (tx, ty) => {
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pb = this.player.body as Phaser.Physics.Arcade.Body;
        pb.setVelocity((dx / dist) * 500, (dy / dist) * 500);
        this.isDodging = true;
        this.time.delayedCall(160, () => {
          if (!this.player.active) return;
          pb.setVelocity(0, 0);
          this.isDodging = false;
          const slashDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (slashDist <= 85) {
            const bleedBonus = this.hasUpgrade('click') && this.npcBleeding ? 1.5 : 1;
            const slashDmg = Math.round(20 * bleedBonus);
            this.npc.takeDamage(slashDmg);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xff2200);
            if (this.huntBloodMoonActive && this.hasUpgrade('f')) this.player.heal(Math.ceil(slashDmg * 0.5));
            if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(10);
            // Apply bleeding
            this.npcBleeding = true;
            this.npcBleedingUntil = this.time.now + 8000;
            this.applyNpcBleedVisual();
            const kb = this.npc.body as Phaser.Physics.Arcade.Body;
            const toNx = this.npc.x - this.player.x, toNy = this.npc.y - this.player.y;
            const nd2 = Math.sqrt(toNx * toNx + toNy * toNy) || 1;
            kb.setVelocity((toNx / nd2) * 500, (toNy / nd2) * 500);
          }
          const arc = this.add.circle(this.player.x + (dx / dist) * 45, this.player.y + (dy / dist) * 45, 18, 0xff3300, 0.7).setDepth(8);
          this.tweens.add({ targets: arc, scaleX: 3.5, scaleY: 0.8, alpha: 0, duration: 200, onComplete: () => arc.destroy() });
        });
      },
      huntLeap: (tx, ty) => {
        this.huntLeapActive = true;
        this.huntLeapEnd = this.time.now + 2000;
        this.huntLeapTeleported = false;
        this.huntLeapTargetX = tx;
        this.huntLeapTargetY = ty;
        this.player.isInvincible = true;
        this.player.setAlpha(0.08);
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.nukeChanneling = true;
        this.nukeChannelEnd = this.time.now + 2000;
      },
      huntBloodHunt: () => {
        if (!this.npcBleeding) return;
        this.player.isInvincible = true;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        if (this.hasUpgrade('r')) {
          // R+: charge 1s while invincible+locked, then teleport; total invincibility = 2s
          this.huntBloodHuntCharging = true;
          this.huntBloodHuntChargeEnd = this.time.now + 1000;
          this.huntBloodHuntInvincUntil = this.time.now + 2000;
          this.nukeChanneling = true;
          this.nukeChannelEnd = this.time.now + 1000; // movement unlocks after 1s; invincibility continues
          const chargeArc = this.add.circle(this.player.x, this.player.y, 12, 0xff4400, 0.6).setDepth(9);
          this.tweens.add({ targets: chargeArc, scaleX: 3, scaleY: 3, alpha: 0, duration: 900, onComplete: () => chargeArc.destroy() });
        } else {
          // Base: instant teleport beside NPC, 1s stun + 1s invincibility
          const angle = Math.random() * Math.PI * 2;
          this.player.setPosition(this.npc.x + Math.cos(angle) * 60, this.npc.y + Math.sin(angle) * 60);
          this.nukeChanneling = true;
          this.nukeChannelEnd = this.time.now + 1000;
          this.huntBloodHuntInvincUntil = this.time.now + 1000;
          this.npcHuntSlowUntil = this.time.now + 3000;
          const roar = this.add.circle(this.player.x, this.player.y, 18, 0xff0000, 0.8).setDepth(9);
          this.tweens.add({ targets: roar, scaleX: 4, scaleY: 4, alpha: 0, duration: 800, onComplete: () => roar.destroy() });
          const roar2 = this.add.circle(this.player.x, this.player.y, 10, 0xffffff, 1).setDepth(10);
          this.tweens.add({ targets: roar2, scaleX: 3, scaleY: 3, alpha: 0, duration: 500, onComplete: () => roar2.destroy() });
        }
      },
      huntBloodMoon: () => {
        this.huntBloodMoonActive = true;
        this.huntBloodMoonEnd = this.time.now + 12000;
        this.huntBloodMoonTickAccum = 0;
        if (this.huntBloodMoonFilter) this.huntBloodMoonFilter.destroy();
        const { width, height } = this.scale;
        this.huntBloodMoonFilter = this.add.rectangle(width / 2, height / 2, width, height, 0x440000, 0.12).setDepth(50);
      },
      huntUntransform: () => {
        this.player.incomingDamageMultiplier = 1.0;
        if (this.huntVampireForm) {
          this.huntVampireForm = false;
          // Clean up active vampire abilities
          this.huntBatFormActive = false;
          this.player.setScale(1.0);
          (this.player.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
          this.huntVampireDrainActive = false;
          if (this.huntVampireDrainAura) { this.huntVampireDrainAura.destroy(); this.huntVampireDrainAura = null; }
          this.huntToggleVampireHud(false);
          const burst = this.add.circle(this.player.x, this.player.y, 20, 0x660033, 0.8).setDepth(8);
          this.tweens.add({ targets: burst, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
        } else {
          this.huntBeastForm = false;
          this.player.setScale(1.0);
          (this.player.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
          this.huntToggleBeastHud(false);
          const burst = this.add.circle(this.player.x, this.player.y, 20, 0x664422, 0.7).setDepth(8);
          this.tweens.add({ targets: burst, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
        }
        this.player.triggerCooldown('hunt-transform');
      },
      // Hunt Vampire form
      huntVampireStake: (tx, ty) => {
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 350;
        const proj = new Projectile(this, this.player.x, this.player.y, 'proj-hunt-stake', 15, true);
        this.projectiles.add(proj);
        proj.launch((dx / len) * speed, (dy / len) * speed);
        // Apply bleed on hit — handled in collision with applyNpcBleedVisual
        this.time.delayedCall(1400, () => {
          if (proj.active) { proj.setActive(false).setVisible(false); (proj.body as Phaser.Physics.Arcade.Body).stop(); }
        });
        const flash = this.add.circle(this.player.x, this.player.y, 12, 0x880033, 0.8).setDepth(9);
        this.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
      },
      huntGarlicTrap: (tx, ty) => {
        const spr = this.add.circle(tx, ty, 22, 0x44aa00, 0.55)
          .setStrokeStyle(2, 0x88ff00, 0.8).setDepth(4);
        this.huntGarlicTraps.push({
          sprite: spr, x: tx, y: ty, owner: 'player',
          nextPulseAt: this.time.now + 2000,
          expiresAt: this.time.now + 8000,
        });
      },
      huntBatForm: () => {
        this.huntBatFormActive = true;
        const dur = this.hasUpgrade('r') ? 6000 : 3000;
        this.huntBatFormEnd = this.time.now + dur;
        this.player.setScale(0.35);
        (this.player.body as Phaser.Physics.Arcade.Body).setCircle(8, 14, 14);
        // Bat form DR stacks with vampire DR: 0.65 * 0.8 = 0.52
        this.player.incomingDamageMultiplier = 0.52;
        const flash = this.add.circle(this.player.x, this.player.y, 16, 0x4444aa, 0.8).setDepth(9);
        this.tweens.add({ targets: flash, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
        this.showFloatingText(this.player.x, this.player.y - 20, '🦇 Bat Form', '#8888ff');
      },
      huntVampireDrain: () => {
        this.huntVampireDrainActive = true;
        this.huntVampireDrainEnd = this.time.now + 6000;
        this.huntVampireDrainAccum = 0;
        if (this.huntVampireDrainAura) this.huntVampireDrainAura.destroy();
        this.huntVampireDrainAura = this.add.circle(this.player.x, this.player.y, 90, 0x880022, 0.15)
          .setStrokeStyle(2, 0xcc0033, 0.4).setDepth(3);
        this.tweens.add({ targets: this.huntVampireDrainAura, alpha: 0.05, yoyo: true, repeat: -1, duration: 500 });
        this.showFloatingText(this.player.x, this.player.y - 20, '🩸 Drain', '#cc0033');
      },
      // Time
      timeBarrage: () => { /* firing handled per-frame in the input section */ },
      timeWarp: (tx, ty) => {
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 208 * (this.timeHaltActive ? 2 : 1);
        const orb = new Projectile(this, this.player.x, this.player.y, 'proj-time-orb', 0, true);
        this.projectiles.add(orb);
        orb.launch((dx / len) * speed, (dy / len) * speed);
        this.time.delayedCall(4000, () => { if (orb.active) { orb.setActive(false).setVisible(false); (orb.body as Phaser.Physics.Arcade.Body).stop(); } });
        const flash = this.add.circle(this.player.x, this.player.y, 16, 0xffdd44, 0.6).setDepth(9);
        this.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      },
      timeRemain: () => {
        this.timeRemainActive = true;
        this.timeRemainEnd = this.time.now + 3000;
        this.timeRemainAbsorbed = 0;
        if (this.timeRemainAura) this.timeRemainAura.destroy();
        this.timeRemainAura = this.add.circle(this.player.x, this.player.y, 40, 0xffdd44, 0.35).setDepth(4);
        this.tweens.add({ targets: this.timeRemainAura, alpha: 0.6, yoyo: true, repeat: -1, duration: 350 });
        this.player.damageAbsorber = (amount: number) => {
          // Glass Mode R+: absorb fully, no delayed damage
          if (this.timeGlassMode && this.hasUpgrade('r')) {
            // Just absorb, spawn puddles, don't accumulate for later
            const prev10 = Math.floor(this.timeRemainAbsorbed / 10);
            this.timeRemainAbsorbed += amount;
            const new10 = Math.floor(this.timeRemainAbsorbed / 10);
            for (let p = prev10; p < new10; p++) {
              const angle = Math.random() * Math.PI * 2;
              const r = 20 + Math.random() * 40;
              this.spawnTimePuddle(this.player.x + Math.cos(angle) * r, this.player.y + Math.sin(angle) * r, 'player');
            }
            return true;
          }
          const prev10 = Math.floor(this.timeRemainAbsorbed / 10);
          this.timeRemainAbsorbed += amount;
          const new10 = Math.floor(this.timeRemainAbsorbed / 10);
          for (let p = prev10; p < new10; p++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * 40;
            this.spawnTimePuddle(this.player.x + Math.cos(angle) * r, this.player.y + Math.sin(angle) * r, 'player');
          }
          return true;
        };
      },
      timeHalt: () => {
        this.timeHaltActive = true;
        this.timeHaltEnd = this.time.now + 6000;
        if (this.timeHaltAura) this.timeHaltAura.destroy();
        this.timeHaltAura = this.add.circle(this.player.x, this.player.y, 120, 0xffdd44, 0.06)
          .setStrokeStyle(2, 0xffdd44, 0.5).setDepth(3);
        const hFlash = this.add.circle(this.player.x, this.player.y, 30, 0xffdd44, 0.5).setDepth(10);
        this.tweens.add({ targets: hFlash, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => hFlash.destroy() });
      },
      timeTimeless: () => {
        if (this.timeTimelessActive) return;
        if (this.timeTimelessCharge < 10000) return;
        this.timeTimelessActive = true;
        // Q+: HP Rewind — restore HP to 5s ago
        if (this.hasUpgrade('q')) {
          const targetT = this.time.now - 5000;
          let best = this.timeHpHistory[0];
          for (const entry of this.timeHpHistory) {
            if (Math.abs(entry.t - targetT) < Math.abs((best?.t ?? 0) - targetT)) best = entry;
          }
          if (best) {
            const diff = best.hp - this.player.hp;
            const oldHp = this.player.hp;
            this.player.hp = Math.max(1, Math.min(this.player.maxHp, best.hp));
            (this.player as unknown as { updateHealthBar?: () => void }).updateHealthBar?.();
            const label = diff > 0 ? `+${diff} HP REWIND` : `${diff} HP REWIND`;
            const col = diff >= 0 ? '#44ff88' : '#ff4444';
            this.showFloatingText(this.player.x, this.player.y - 30, label, col);
            const rwFlash = this.add.circle(this.player.x, this.player.y, 30, diff >= 0 ? 0x44ff88 : 0xff4444, 0.5).setDepth(12);
            this.tweens.add({ targets: rwFlash, scaleX: 3, scaleY: 3, alpha: 0, duration: 500, onComplete: () => rwFlash.destroy() });
            void oldHp;
          }
        }
        this.timeTimelessEnd = this.time.now + 8000;
        this.timeTimelessCharge = 0;
        // Freeze all projectiles
        this.timeFreezeFrozenVelocities.clear();
        for (const child of this.projectiles.getChildren()) {
          const proj = child as Projectile;
          if (!proj.active) continue;
          const body = proj.body as Phaser.Physics.Arcade.Body;
          this.timeFreezeFrozenVelocities.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
          body.setVelocity(0, 0);
        }
        // Freeze NPC
        const npcBody = this.npc.body as Phaser.Physics.Arcade.Body;
        this.timeFreezeNpcVelX = npcBody.velocity.x;
        this.timeFreezeNpcVelY = npcBody.velocity.y;
        const tFlash = this.add.circle(this.player.x, this.player.y, 50, 0xffdd44, 0.55).setDepth(12);
        this.tweens.add({ targets: tFlash, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 600, onComplete: () => tFlash.destroy() });
        this.showFloatingText(this.player.x, this.player.y - 40, 'TIME FROZEN', '#ffdd44');
      },
      // Gravity
      gravitySlash: (x1, y1, x2, y2) => {
        const line = this.add.line(0, 0, x1, y1, x2, y2, 0xaa44ff, 0.85).setLineWidth(4).setDepth(6).setOrigin(0, 0);
        this.tweens.add({ targets: line, alpha: 0, duration: 500, onComplete: () => line.destroy() });
        this.gravSlashes.push({ line, x1, y1, x2, y2, fireAt: this.time.now + 500, owner: 'player', damage: 18, knockback: 400 });
      },
      gravityMeteorShadow: (x, y) => {
        this.spawnGravMeteorShadow(x, y, 'player', false);
      },
      gravityMeteorRainNpcBurst: () => { /* player no-op */ },
      gravitySpaceSlam: () => {
        const H = this.scale.height;
        const targetY = H - 40;
        this.npc.takeDamage(25);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0x8844cc);
        // Slam line visual
        const slamLine = this.add.line(0, 0, this.npc.x, this.npc.y, this.npc.x, targetY, 0xaa44ff, 0.7).setLineWidth(6).setDepth(7).setOrigin(0, 0);
        this.tweens.add({ targets: slamLine, alpha: 0, duration: 300, onComplete: () => slamLine.destroy() });
        // Impact ring
        const ring = this.add.circle(this.npc.x, targetY, 10, 0x8844cc, 0.8).setDepth(7);
        this.tweens.add({ targets: ring, scaleX: 8, scaleY: 8, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
        // Force enemy to floor
        const slamX = this.npc.x;
        this.npc.y = targetY;
        const nb = this.npc.body as Phaser.Physics.Arcade.Body;
        nb.setVelocity(0, 0);
        this.gravSpaceSlamLockUntil = this.time.now + 300;
        // R+: Gravity Anchor
        if (this.hasUpgrade('r')) {
          if (this.gravAnchor) { this.gravAnchor.sprite.destroy(); this.gravAnchor.line.destroy(); }
          const anchorSpr = this.add.circle(slamX, targetY, 10, 0x5511aa, 0.9)
            .setStrokeStyle(3, 0xaa44ff, 0.9).setDepth(8);
          this.tweens.add({ targets: anchorSpr, scaleX: 1.4, scaleY: 1.4, yoyo: true, repeat: -1, duration: 400 });
          const anchorLine = this.add.line(0, 0, slamX, targetY, this.npc.x, this.npc.y, 0x8844cc, 0.5)
            .setLineWidth(2).setDepth(7).setOrigin(0, 0);
          this.gravAnchor = { x: slamX, y: targetY, sprite: anchorSpr, line: anchorLine, expireAt: this.time.now + 3000 };
          this.showFloatingText(slamX, targetY - 24, '⚓ Anchored!', '#aa44ff');
        }
      },
      gravityGravBombSnap: (x, y) => {
        if (Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) <= 120) {
          this.npc.x = x; this.npc.y = y;
          (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          const ring = this.add.circle(x, y, 10, 0x8844cc, 0.85).setDepth(6);
          this.tweens.add({ targets: ring, scaleX: 13, scaleY: 13, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
          const core = this.add.circle(x, y, 6, 0xffffff, 0.9).setDepth(7);
          this.tweens.add({ targets: core, scaleX: 3, scaleY: 3, alpha: 0, duration: 180, onComplete: () => core.destroy() });
        }
      },
      gravityLunarLanding: () => {
        if (this.gravLunarShadow) { this.gravLunarShadow.destroy(); this.gravLunarShadow = null; }
        const W = this.scale.width; const H = this.scale.height;
        const lRadius = Math.min(W, H) * 0.44;
        this.gravLunarRadius = lRadius;
        this.gravLunarShadow = this.add.circle(W / 2, H / 2, lRadius, 0x221144, 0.55).setDepth(3);
        this.gravLunarFireAt = this.time.now + 3000;
        this.gravLunarOwner = 'player';
        // Pulsing tween on the shadow
        this.tweens.add({ targets: this.gravLunarShadow, alpha: 0.75, yoyo: true, repeat: -1, duration: 600 });
      },
      // Legacy sand no-ops (keep for compiler compatibility)
      sandFlintlock: () => {},
      sandBlindingSand: () => {},
      sandToggleTornado: () => {},
      sandMirage: () => {},
      sandActivateGlass: () => {},
      // Creation
      creationDaggerSpray: (tx, ty, count) => {
        this.spawnCreationDaggers(this.player.x, this.player.y, tx, ty, count, 'player');
      },
      creationBolt: (tx, ty, tier) => {
        this.spawnCreationBolt(this.player.x, this.player.y, tx, ty, tier, 'player');
      },
      creationScytheLaunch: (_tx, _ty) => {
        this.spawnCreationScythe(this.player.x, this.player.y, this.npc.x, this.npc.y, 'player');
      },
      creationBlock: (x, y, w, h) => { this.spawnCreationBlocker(x, y, w, h, 'player'); },
      creationMaze: () => { this.spawnCreationMaze('player'); },
    };
  }

  private buildNpcContext(targetX: number, targetY: number): CastContext {
    return {
      scene: this,
      casterX: this.npc.x,
      casterY: this.npc.y,
      targetX,
      targetY,
      isPlayerCaster: false,
      projectiles: this.projectiles,
      dealAoeDamage: (cx, cy, radius, damage) => {
        if (Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) <= radius) {
          this.player.takeDamage(damage);
          if (this.npcHuntBloodPactActive && this.time.now < this.npcHuntBloodPactEnd) this.npc.heal(Math.ceil(damage * 0.5));
        }
      },
      dashCaster: (vx, vy) => {
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
      },
      healCaster: (amount) => this.npc.heal(amount),
      damageCaster: (amount) => this.npc.applySelfDamage(amount),
      setCasterSpeedMultiplier: (mult) => { this.npcSpeedMult = mult; },
      lockCaster: (durationMs) => {
        this.npcNukeChanneling = true;
        this.npcNukeChannelEnd = this.time.now + durationMs;
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      },
      addShieldCharge: () => { this.npc.shieldCharges += 1; },
      spawnPuddle: (_x, _y) => { /* managed via npcSplashActiveUntil */ },
      spawnGeyser: (x, y) => this.createGeyser(x, y, 'npc'),
      spawnPainRain: () => this.npc.isMastered
        ? this.createPainRain('npc', 500, 150, 2400)
        : this.createPainRain('npc'),
      spawnPlant: (x, y) => this.createPlant(x, y, 'npc'),
      growPlants: () => {
        for (const p of this.npcPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0x44ff44, 0.6).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
      },
      thornPlants: () => {
        for (const p of this.npcPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0xcc2222, 0.75).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
          if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius) {
            this.player.takeDamage(20);
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc2222);
          }
        }
      },
      startThornDrag: () => { /* state set in NPC cast reaction */ },
      activateQuickShot: () => { this.npcQuickShotCharged = true; },
      placeWindTrap: (x, y) => {
        this.npcWindTrapX = x;
        this.npcWindTrapY = y;
        this.npcWindTrapExpiry = this.time.now + 5000;
        if (this.npcWindTrapSprite) this.npcWindTrapSprite.destroy();
        this.npcWindTrapSprite = this.add.circle(x, y, 80, 0xaaddff, 0).setDepth(3);
        this.npcWindTrapSprite.setStrokeStyle(3, 0xaaddff, 0.9);
        this.tweens.add({ targets: this.npcWindTrapSprite, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
      },
      grappleTo: (x, y) => {
        const dx = x - this.npc.x;
        const dy = y - this.npc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 1200;
        const travelTime = Math.min(350, (len / speed) * 1000);
        const body = this.npc.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
        this.time.delayedCall(travelTime, () => {
          if (this.npc.active) body.setVelocity(0, 0);
        });
      },
      reportAirSnipeResult: (hit) => {
        if (hit) { this.npcAirConsecutiveHits = Math.min(this.npcAirConsecutiveHits + 1, 3); }
        else { this.npcAirConsecutiveHits = 0; }
      },
      quickShotActive: this.npcQuickShotCharged,
      addShieldHp: (amount) => { if (this.npcElement.id !== 'earth') this.npc.shieldHp = Math.min(100, this.npc.shieldHp + amount); },
      getShieldHp: () => this.npc.shieldHp,
      setShieldHp: (amount) => { this.npc.shieldHp = Math.max(0, amount); },
      slamCaster: () => {
        const dx = this.player.x - this.npc.x;
        const dy = this.player.y - this.npc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 600, (dy / len) * 600);
        this.npcEarthSlamActive = true;
        this.npcEarthSlamEnd = this.time.now + 400;
        this.npcEarthSlamHitDealt = false;
      },
      dealMeleeDamage: (range, damage, knockback = 0) => {
        const dist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
        if (dist > range) return;
        this.player.takeDamage(damage);
        this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
        if (knockback > 0) {
          const toPlayerX = this.player.x - this.npc.x;
          const toPlayerY = this.player.y - this.npc.y;
          const pb = this.player.body as Phaser.Physics.Arcade.Body;
          pb.setVelocity((toPlayerX / dist) * knockback, (toPlayerY / dist) * knockback);
        }
      },
      startBullRush: () => {
        this.npcBullRushActive = true;
        this.npcBullRushEnd = this.time.now + 6000;
        this.npcBullRushSpeed = 100;
        this.npcBullRushLastHit = 0;
        this.npcBullRushDrApplied = false;
        this.npc.incomingDamageMultiplier *= 0.8;
        this.npcBullRushDrApplied = true;
        if (this.npcBullRushAura) this.npcBullRushAura.destroy();
        this.npcBullRushAura = this.add.circle(this.npc.x, this.npc.y, 36, 0xcc4400, 0.4).setDepth(6);
        this.tweens.add({ targets: this.npcBullRushAura, alpha: 0.15, yoyo: true, repeat: -1, duration: 220 });
      },
      spawnDrone: () => {
        if (this.npcDrones.length >= 4) return;
        const count = this.npcDrones.length;
        const angle = (count / 4) * Math.PI * 2;
        const sprite = this.add.circle(
          this.npc.x + Math.cos(angle) * 60,
          this.npc.y + Math.sin(angle) * 60,
          8, 0xffaa00, 0.7,
        ).setDepth(8);
        this.npcDrones.push({
          sprite, shotsLeft: 3, orbitAngle: angle,
          shielded: false, healedByFirewall: false, meleeCooldownUntil: 0, owner: 'npc',
        });
      },
      commandDrones: (x, y) => {
        for (const drone of this.npcDrones) {
          const laser = this.add.graphics().setDepth(8);
          laser.lineStyle(2, 0xffaa00, 0.65);
          laser.lineBetween(drone.sprite.x, drone.sprite.y, x, y);
          this.tweens.add({ targets: laser, alpha: 0, duration: 220, onComplete: () => laser.destroy() });
          if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= 40) {
            this.player.takeDamage(3);
            this.spawnHitFlash(this.player.x, this.player.y, 0xffaa00);
          }
          drone.shotsLeft -= 1;
        }
      },
      launchDrone: (x, y) => {
        if (this.npcDrones.length === 0) return;
        const drone = this.npcDrones.pop()!;
        const dmg = Math.max(5, drone.shotsLeft * 5);
        this.tweens.add({
          targets: drone.sprite, x, y, duration: 500, ease: 'Power2',
          onComplete: () => {
            const boom = this.add.circle(x, y, 8, 0xff6600, 0.8).setDepth(8);
            this.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
            drone.sprite.destroy();
            if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= 60) {
              this.player.takeDamage(dmg);
              this.spawnHitFlash(this.player.x, this.player.y, 0xff6600);
            }
          },
        });
      },
      placeFirewall: () => { /* NPC does not use firewall */ },
      startOverdrive: () => { /* NPC does not use overdrive */ },
      launchDarkBomb: (x, y) => {
        const bomb = this.add.circle(this.npc.x, this.npc.y, 10, 0x440066, 0.85)
          .setStrokeStyle(2, 0x8800cc).setDepth(8);
        this.tweens.add({
          targets: bomb, x, y, duration: 380, ease: 'Power2',
          onComplete: () => {
            const boom = this.add.circle(x, y, 8, 0x440066, 0.7).setDepth(8);
            this.tweens.add({ targets: boom, scaleX: 7, scaleY: 7, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
            bomb.destroy();
            if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= 50) {
              this.player.takeDamage(10);
              this.spawnHitFlash(this.player.x, this.player.y, 0x8800cc);
            }
            this.spawnShadowDarkCloud(x, y, 'npc');
          },
        });
      },
      activateTentacle: (_x, _y) => {
        const hookDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
        this.npcShadowTentacleActive = true;
        this.npcShadowTentacleHooked = hookDist <= 110;
        this.npcShadowTentacleEnd = this.time.now + (this.npcShadowTentacleHooked ? 3000 : 600);
        if (!this.npcShadowTentacleSprite) {
          this.npcShadowTentacleSprite = this.add.graphics().setDepth(6);
        }
        if (this.npcShadowTentacleHooked) {
          this.player.takeDamage(10);
          this.spawnHitFlash(this.player.x, this.player.y, 0x440066);
          // Pick initial random drag target
          const { width, height } = this.scale;
          this.npcShadowDragTargetX = Phaser.Math.Between(80, width - 80);
          this.npcShadowDragTargetY = Phaser.Math.Between(80, height - 80);
          this.npcShadowDragNextChangeAt = this.time.now + 700;
        }
      },
      placeSnapTrap: () => {
        const spr = this.add.circle(this.npc.x, this.npc.y, 18, 0x220033, 0.75)
          .setStrokeStyle(2, 0x8800cc).setDepth(3);
        const lbl = this.add.text(this.npc.x, this.npc.y, '⚡', { fontSize: '10px' }).setOrigin(0.5).setDepth(4);
        this.shadowSnapTraps.push({
          sprite: spr, label: lbl,
          expiresAt: this.time.now + 12000,
          x: this.npc.x, y: this.npc.y,
          triggered: false, radius: 18, owner: 'npc',
        });
      },
      activateShadowDance: () => { /* NPC does not track shadow dance charge */ },
      startBlackHole: () => { /* NPC does not use black hole */ },
      // Ice
      fireIceSpike: (tx, ty) => {
        const dx = tx - this.npc.x;
        const dy = ty - this.npc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-ice', 8, false);
        this.projectiles.add(proj);
        proj.launch((dx / len) * 480, (dy / len) * 480);
      },
      fireFrostBlast: (tx, ty) => {
        if (this.playerFrostStacks === 0) return;
        const dx = tx - this.npc.x;
        const dy = ty - this.npc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy / len, dx / len);
        const endX = this.npc.x + Math.cos(angle) * 1200;
        const endY = this.npc.y + Math.sin(angle) * 1200;
        this.spawnFrostBeamVisual(this.npc.x, this.npc.y, endX, endY);
        const d = this.pointToSegmentDist(this.player.x, this.player.y, this.npc.x, this.npc.y, endX, endY);
        if (d <= 32) {
          this.player.takeDamage(Math.round(this.playerFrostStacks * 7.5));
          this.spawnHitFlash(this.player.x, this.player.y, 0x88ccff);
          this.clearFrostStacks('player');
        }
      },
      toggleBlockUp: () => {
        this.npcBlockUpActive = !this.npcBlockUpActive;
        this.npc.incomingDamageMultiplier = this.npcBlockUpActive
          ? this.frostDamageMultiplier(this.npcFrostStacks) * 0.75
          : this.frostDamageMultiplier(this.npcFrostStacks);
        if (this.npcBlockUpActive) {
          if (!this.npcBlockUpAura) {
            this.npcBlockUpAura = this.add.circle(this.npc.x, this.npc.y, 28, 0x88ccff, 0.25)
              .setStrokeStyle(2, 0xcceeff, 0.8).setDepth(3);
          }
        } else {
          if (this.npcBlockUpAura) { this.npcBlockUpAura.destroy(); this.npcBlockUpAura = null; }
        }
      },
      startSkate: () => {
        // NPC skate: dash away from player + leave trail
        const dx = this.npc.x - this.player.x;
        const dy = this.npc.y - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nBody = this.npc.body as Phaser.Physics.Arcade.Body;
        nBody.setVelocity((dx / len) * 620, (dy / len) * 620);
        this.npc.isInvincible = true;
        for (let i = 0; i < 4; i++) {
          this.time.delayedCall(i * 55, () => {
            if (this.npc.active) this.spawnIcyTrail(this.npc.x, this.npc.y, 'npc');
          });
        }
        this.time.delayedCall(220, () => { if (this.npc.active) this.npc.isInvincible = false; });
      },
      fireFrozenSolid: (tx, ty) => {
        const angle = Math.atan2(ty - this.npc.y, tx - this.npc.x);
        this.spawnFrozenSolidVisual(this.npc.x, this.npc.y, angle);
        const playerAngle = Math.atan2(this.player.y - this.npc.y, this.player.x - this.npc.x);
        const diff = Math.abs(Phaser.Math.Angle.Wrap(playerAngle - angle));
        if (diff <= Math.PI / 8) {
          if (this.playerFrozenUntil > this.time.now) {
            this.playerFrozenUntil = 0;
            for (let fi = 0; fi < 3; fi++) this.addFrostStack('player');
          } else {
            this.playerFrozenUntil = this.time.now + 3000;
            this.spawnHitFlash(this.player.x, this.player.y, 0x88ccff);
          }
        }
      },
      // Growth
      fireGrowthClick: (tx, ty) => {
        const angle = Math.atan2(ty - this.npc.y, tx - this.npc.x);
        if (this.npcGrowthMorphType === 'spores') {
          const angles = [-12, -6, 0, 6, 12];
          for (const deg of angles) {
            const a = angle + deg * (Math.PI / 180);
            const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-growth', Math.round(5 * this.npcGrowthDamageMult), false);
            this.projectiles.add(proj);
            proj.launch(Math.cos(a) * 380, Math.sin(a) * 380);
            const pb = proj.body as Phaser.Physics.Arcade.Body;
            this.tweens.add({ targets: pb.velocity, x: 0, y: 0, duration: 600,
              onComplete: () => { this.time.delayedCall(200, () => { if (proj.active) { proj.setActive(false).setVisible(false); } }); } });
          }
        } else if (this.npcGrowthMorphType === 'claws') {
          const dist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
          if (dist <= 120) {
            this.player.takeDamage(Math.round(15 * this.npcGrowthDamageMult));
            this.spawnHitFlash(this.player.x, this.player.y, 0x88bb22);
          }
        } else {
          const spreadAngles = [-15, 0, 15];
          for (const deg of spreadAngles) {
            const a = angle + deg * (Math.PI / 180);
            const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-growth', Math.round(8 * this.npcGrowthDamageMult), false);
            this.projectiles.add(proj);
            proj.launch(Math.cos(a) * 460, Math.sin(a) * 460);
          }
        }
      },
      openMutateMenu: () => {
        // NPC auto-picks one random mutation
        const mutations = ['healthier','deadly','linger','viral','grow','shrink','buffer','spray','quick','regenerative'];
        this.applyGrowthMutation(mutations[Math.floor(Math.random() * mutations.length)], 'npc');
      },
      fireInfect: (tx, ty) => {
        if (this.time.now - this.lastNpcInfectCast < 8000) return;
        this.lastNpcInfectCast = this.time.now;
        const baseAngle = Math.atan2(ty - this.npc.y, tx - this.npc.x);
        const count = 1 + this.npcGrowthInfectExtraProj;
        for (let i = 0; i < count; i++) {
          const spread = count > 1 ? (i - (count - 1) / 2) * 8 * (Math.PI / 180) : 0;
          const a = baseAngle + spread;
          const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-growth-dagger', Math.round(5 * this.npcGrowthDamageMult), false);
          this.projectiles.add(proj);
          proj.launch(Math.cos(a) * 490, Math.sin(a) * 490);
        }
      },
      activateBloat: () => {
        if (this.time.now - this.lastNpcBloatCast < this.npcGrowthBloatCdMs) return;
        this.lastNpcBloatCast = this.time.now;
        this.npcGrowthBloatActive = true;
        this.npcGrowthBloatEnd = this.time.now + 5000;
        if (this.npcGrowthBloatAura) this.npcGrowthBloatAura.destroy();
        this.npcGrowthBloatAura = this.add.circle(this.npc.x, this.npc.y, 30, 0xdddd00, 0.3)
          .setStrokeStyle(2, 0xffff44, 0.8).setDepth(5);
        this.tweens.add({ targets: this.npcGrowthBloatAura, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
      },
      triggerMutantMorph: () => {
        const morphTypes: Array<'spores' | 'claws' | 'virus'> = ['spores', 'claws', 'virus'];
        this.npcGrowthMorphType = morphTypes[Math.floor(Math.random() * morphTypes.length)];
      },
      // Crystal
      fireCrystalLaser: (tx, ty) => {
        this.fireCrystalLaserFrom(this.npc.x, this.npc.y, tx, ty, 4, false);
        for (const cl of this.npcCrystalClones) {
          this.fireCrystalLaserFrom(this.npc.x + cl.offsetX, this.npc.y + cl.offsetY, tx, ty, 4, false);
        }
      },
      placeCrystalNode: (tx, ty) => {
        if (this.npcCrystalNodes.length >= 3) {
          this.npcCrystalNodes[0].sprite.destroy();
          this.npcCrystalNodes.shift();
        }
        // NPC crystals also travel from NPC toward target
        const ndx = tx - this.npc.x, ndy = ty - this.npc.y;
        const ndist = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
        const nvx = (ndx / ndist) * 60, nvy = (ndy / ndist) * 60;
        const ntAngleDeg = Math.atan2(ndy, ndx) * 180 / Math.PI;
        const spr = this.add.rectangle(this.npc.x, this.npc.y, 6, 28, 0x99ccee, 0.7)
          .setStrokeStyle(1, 0xaaeeff, 0.7).setDepth(4).setAngle(ntAngleDeg);
        this.npcCrystalNodes.push({ sprite: spr, x: this.npc.x, y: this.npc.y, owner: 'npc', vx: nvx, vy: nvy, moving: true, targetX: tx, targetY: ty, lastPortalTime: -99999 });
      },
      startCrystalBarrage: (tx, ty) => {
        this.npcCrystalBarrageActive = true;
        this.npcCrystalBarrageEnd = this.time.now + 1500;
        this.npcCrystalBarrageAccum = 0;
        this.npcCrystalBarrageShots = 0;
        this.npcCrystalBarrageTX = tx;
        this.npcCrystalBarrageTY = ty;
      },
      placeCrystalPortal: (tx, ty) => {
        if (this.npcCrystalPortals.length >= 2) {
          this.npcCrystalPortals[0].sprite.destroy(); this.npcCrystalPortals[0].label.destroy();
          this.npcCrystalPortals.shift();
        }
        const idx = this.npcCrystalPortals.length;
        const color = idx === 0 ? 0xaa44ff : 0xff44aa;
        const lbl = idx === 0 ? 'A' : 'B';
        const spr = this.add.circle(tx, ty, 18, color, 0.35)
          .setStrokeStyle(3, color, 0.7).setDepth(4);
        this.tweens.add({ targets: spr, alpha: 0.1, yoyo: true, repeat: -1, duration: 700 });
        const lblObj = this.add.text(tx, ty, lbl, {
          fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#888888',
        }).setOrigin(0.5).setDepth(5);
        this.npcCrystalPortals.push({ sprite: spr, label: lblObj, x: tx, y: ty, owner: 'npc' });
      },
      activateCrystalTrick: () => {
        for (const cl of this.npcCrystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
        this.npcCrystalClones = [];
        this.npcCrystalTrickEnd = this.time.now + 12000;
        const ncx = this.npc.x, ncy = this.npc.y;
        for (const off of [{ x: -58, y: 0 }, { x: 58, y: 0 }]) {
          const hpBg = this.add.rectangle(ncx, ncy - 28, 30, 4, 0x333333).setDepth(12);
          const hpBar = this.add.rectangle(ncx - 15, ncy - 28, 30, 4, 0x44aaff).setDepth(13).setOrigin(0, 0.5);
          const spr = this.add.circle(ncx, ncy, 16, 0x88ccff, 0.65)
            .setStrokeStyle(2, 0xaaeeff).setDepth(11);
          const dir = this.add.rectangle(ncx, ncx - 20, 4, 10, 0x88ccff, 0.6).setDepth(14);
          this.npcCrystalClones.push({ sprite: spr, hp: 50, maxHp: 50, baseOffsetX: off.x, baseOffsetY: off.y, offsetX: off.x, offsetY: off.y, hpBar, hpBg, dirIndicator: dir });
        }
      },
      // Soul
      fireSoulOrb: (tx, ty) => {
        if (this.time.now - this.lastNpcSoulOrbCast < 800) return;
        this.lastNpcSoulOrbCast = this.time.now;
        const dx = tx - this.npc.x, dy = ty - this.npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 104;
        const ox = this.npc.x + (dx / dist) * 32;
        const oy = this.npc.y + (dy / dist) * 32;
        const spr = this.add.circle(ox, oy, 12, 0x9966cc, 0.6)
          .setStrokeStyle(2, 0xbb88ee, 0.8).setDepth(7);
        this.tweens.add({ targets: spr, alpha: 0.3, yoyo: true, repeat: -1, duration: 400 });
        this.npcSoulOrbs.push({ sprite: spr, expiresAt: this.time.now + 3000, x: ox, y: oy, vx: (dx / dist) * speed, vy: (dy / dist) * speed, owner: 'npc', lastContactTick: -99999 });
      },
      summonGhost: (ghostType) => {
        // NPC auto-upgrades to best affordable ghost type (NPCs only use base 4 types)
        let actualType: 'basic' | 'ghoul' | 'banshee' | 'knight' = 'basic';
        if (ghostType === 'knight') {
          actualType = 'knight';
        } else {
          if (this.npcSoulGhosts >= 3) actualType = 'banshee';
          else if (this.npcSoulGhosts >= 2) actualType = 'ghoul';
          else if (this.npcSoulGhosts >= 1) actualType = 'basic';
          else return;
        }
        const cost = actualType === 'basic' ? 1 : actualType === 'ghoul' ? 2 : actualType === 'banshee' ? 3 : 5;
        if (this.npcSoulGhosts < cost) return;
        if (this.time.now - this.lastNpcSummon < 2000) return;
        this.lastNpcSummon = this.time.now;
        this.npcSoulGhosts -= cost;
        this.spawnSoulGhost(actualType, this.npc.x, this.npc.y, 'npc');
      },
      soulSacrifice: () => {
        if (this.time.now - this.lastNpcSacrifice < 3000) return;
        this.lastNpcSacrifice = this.time.now;
        this.npc.applySelfDamage(10);
        this.npcSoulGhosts++;
      },
      soulConsume: () => {
        if (this.time.now - this.lastNpcConsume < 3000) return;
        this.lastNpcConsume = this.time.now;
        const consumeR = 150;
        for (let i = this.npcSoulSummons.length - 1; i >= 0; i--) {
          const gs = this.npcSoulSummons[i];
          if (Phaser.Math.Distance.Between(gs.sprite.x, gs.sprite.y, this.npc.x, this.npc.y) <= consumeR) {
            this.npc.heal(Math.floor(gs.hp / 2));
            gs.sprite.destroy();
            this.npcSoulSummons.splice(i, 1);
          }
        }
      },
      // Hunt
      huntThrowGrenade: (tx, ty, holdMs) => {
        const dx = tx - this.npc.x, dy = ty - this.npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 500;
        const ox = this.npc.x, oy = this.npc.y;
        const spr = this.add.circle(ox, oy, 10, 0xcc4400, 0.9).setStrokeStyle(2, 0xff8800, 1).setDepth(8);
        this.npcHuntGrenades.push({
          sprite: spr, x: ox, y: oy, startX: ox, startY: oy,
          vx: (dx / dist) * speed, vy: (dy / dist) * speed,
          explodeAt: this.time.now + (3000 - holdMs),
          selfDamage: false, owner: 'npc', stopped: false,
        });
      },
      huntHuntersTrail: () => {
        this.npcHuntTrailActive = true;
        this.npcHuntTrailEnd = this.time.now + 4500;
        this.npcHuntTrailAccum = 0;
      },
      huntBloodPact: () => {
        this.npcHuntBloodPactActive = true;
        this.npcHuntBloodPactEnd = this.time.now + 5000;
        if (this.npcHuntBloodPactAura) this.npcHuntBloodPactAura.destroy();
        this.npcHuntBloodPactAura = this.add.circle(this.npc.x, this.npc.y, 28, 0xaa0022, 0.25).setDepth(4);
        this.tweens.add({ targets: this.npcHuntBloodPactAura, alpha: 0.08, yoyo: true, repeat: -1, duration: 600 });
      },
      huntTransform: () => {
        this.npcHuntBeastForm = true;
        this.npc.setScale(1.2);
        (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(26, 3, 3);
        this.npc.incomingDamageMultiplier = 0.65;
        const burst = this.add.circle(this.npc.x, this.npc.y, 20, 0xcc2200, 0.8).setDepth(8);
        this.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
      },
      huntSlash: (tx, ty) => {
        const dx = tx - this.npc.x, dy = ty - this.npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nb = this.npc.body as Phaser.Physics.Arcade.Body;
        nb.setVelocity((dx / dist) * 500, (dy / dist) * 500);
        this.time.delayedCall(160, () => {
          if (!this.npc.active) return;
          nb.setVelocity(0, 0);
          const slashDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
          if (slashDist <= 85) {
            this.player.takeDamage(20);
            this.spawnHitFlash(this.player.x, this.player.y, 0xff2200);
            if (this.npcHuntBloodPactActive && this.time.now < this.npcHuntBloodPactEnd) this.npc.heal(10);
            // Apply bleeding to player
            this.playerBleeding = true;
            this.playerBleedingUntil = this.time.now + 8000;
            this.applyPlayerBleedVisual();
            const pb2 = this.player.body as Phaser.Physics.Arcade.Body;
            const toPx = this.player.x - this.npc.x, toPy = this.player.y - this.npc.y;
            const pd2 = Math.sqrt(toPx * toPx + toPy * toPy) || 1;
            pb2.setVelocity((toPx / pd2) * 500, (toPy / pd2) * 500);
          }
        });
      },
      huntLeap: (tx, ty) => {
        this.npcHuntLeapActive = true;
        this.npcHuntLeapEnd = this.time.now + 2000;
        this.npcHuntLeapTargetX = tx;
        this.npcHuntLeapTargetY = ty;
        this.npc.isInvincible = true;
        this.npc.setAlpha(0.15);
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      },
      huntBloodHunt: () => {
        if (!this.playerBleeding) return;
        const angle = Math.random() * Math.PI * 2;
        this.npc.setPosition(this.player.x + Math.cos(angle) * 60, this.player.y + Math.sin(angle) * 60);
        // Lock NPC 1s (roar)
        this.npc.npcHuntRoarLocked = true;
        this.time.delayedCall(1000, () => { this.npc.npcHuntRoarLocked = false; });
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        // Slow player
        this.playerHuntSlowUntil = this.time.now + 3000;
        // Roar visual
        const roar = this.add.circle(this.npc.x, this.npc.y, 18, 0xff0000, 0.8).setDepth(9);
        this.tweens.add({ targets: roar, scaleX: 4, scaleY: 4, alpha: 0, duration: 800, onComplete: () => roar.destroy() });
      },
      huntBloodMoon: () => {
        this.npcHuntBloodMoonActive = true;
        this.npcHuntBloodMoonEnd = this.time.now + 12000;
        this.npcHuntBloodMoonTickAccum = 0;
        if (this.npcHuntBloodMoonFilter) this.npcHuntBloodMoonFilter.destroy();
        const { width, height } = this.scale;
        this.npcHuntBloodMoonFilter = this.add.rectangle(width / 2, height / 2, width, height, 0x440000, 0.10).setDepth(49);
      },
      huntUntransform: () => {
        this.npcHuntBeastForm = false;
        this.npc.setScale(1.0);
        (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
        this.npc.incomingDamageMultiplier = 1.0;
        this.npc.triggerCooldown('hunt-transform');
      },
      // NPC has no Q+ upgrade — vampire methods are no-ops
      huntVampireStake: () => {},
      huntGarlicTrap: () => {},
      huntBatForm: () => {},
      huntVampireDrain: () => {},
      // Time (NPC)
      timeBarrage: () => { /* NPC barrage handled per-frame */ },
      timeWarp: (tx, ty) => {
        const dx = tx - this.npc.x, dy = ty - this.npc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 208 * (this.npcTimeHaltActive ? 2 : 1);
        const orb = new Projectile(this, this.npc.x, this.npc.y, 'proj-time-orb', 0, false);
        this.projectiles.add(orb);
        orb.launch((dx / len) * speed, (dy / len) * speed);
        this.time.delayedCall(4000, () => { if (orb.active) { orb.setActive(false).setVisible(false); (orb.body as Phaser.Physics.Arcade.Body).stop(); } });
        const flash = this.add.circle(this.npc.x, this.npc.y, 16, 0xffdd44, 0.6).setDepth(9);
        this.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      },
      timeRemain: () => {
        this.npcTimeRemainActive = true;
        this.npcTimeRemainEnd = this.time.now + 3000;
        this.npcTimeRemainAbsorbed = 0;
        if (this.npcTimeRemainAura) this.npcTimeRemainAura.destroy();
        this.npcTimeRemainAura = this.add.circle(this.npc.x, this.npc.y, 40, 0xffdd44, 0.35).setDepth(4);
        this.tweens.add({ targets: this.npcTimeRemainAura, alpha: 0.6, yoyo: true, repeat: -1, duration: 350 });
        this.npc.damageAbsorber = (amount: number) => {
          const prev10 = Math.floor(this.npcTimeRemainAbsorbed / 10);
          this.npcTimeRemainAbsorbed += amount;
          const new10 = Math.floor(this.npcTimeRemainAbsorbed / 10);
          for (let p = prev10; p < new10; p++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * 40;
            this.spawnTimePuddle(this.npc.x + Math.cos(angle) * r, this.npc.y + Math.sin(angle) * r, 'npc');
          }
          return true;
        };
      },
      timeHalt: () => {
        this.npcTimeHaltActive = true;
        this.npcTimeHaltEnd = this.time.now + 6000;
        if (this.npcTimeHaltAura) this.npcTimeHaltAura.destroy();
        this.npcTimeHaltAura = this.add.circle(this.npc.x, this.npc.y, 120, 0xffdd44, 0.06)
          .setStrokeStyle(2, 0xffdd44, 0.5).setDepth(3);
        const hFlash = this.add.circle(this.npc.x, this.npc.y, 30, 0xffdd44, 0.5).setDepth(10);
        this.tweens.add({ targets: hFlash, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => hFlash.destroy() });
      },
      timeTimeless: () => {
        if (this.npcTimeTimelessActive) return;
        if (this.npcTimeTimelessCharge < 10000) return;
        this.npcTimeTimelessActive = true;
        this.npcTimeTimelessEnd = this.time.now + 3000;
        this.npcTimeTimelessCharge = 0;
        this.npc.cooldownMult = 0.001;
        const tFlash = this.add.circle(this.npc.x, this.npc.y, 50, 0xffdd44, 0.55).setDepth(12);
        this.tweens.add({ targets: tFlash, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 600, onComplete: () => tFlash.destroy() });
      },
      // Gravity (NPC)
      gravitySlash: (x1, y1, x2, y2) => {
        const line = this.add.line(0, 0, x1, y1, x2, y2, 0xaa44ff, 0.85).setLineWidth(4).setDepth(6).setOrigin(0, 0);
        this.tweens.add({ targets: line, alpha: 0, duration: 500, onComplete: () => line.destroy() });
        this.gravSlashes.push({ line, x1, y1, x2, y2, fireAt: this.time.now + 500, owner: 'npc', damage: 18, knockback: 400 });
      },
      gravityMeteorShadow: (x, y) => {
        this.spawnGravMeteorShadow(x, y, 'npc', false);
      },
      gravityMeteorRainNpcBurst: (tx, ty) => {
        for (let i = 0; i < 4; i++) {
          const ox = (Math.random() - 0.5) * 160;
          const oy = (Math.random() - 0.5) * 160;
          this.spawnGravMeteorShadow(tx + ox, ty + oy, 'npc', false);
        }
      },
      gravitySpaceSlam: () => {
        const H = this.scale.height;
        const targetY = H - 40;
        this.player.takeDamage(25);
        this.spawnHitFlash(this.player.x, this.player.y, 0x8844cc);
        const slamLine = this.add.line(0, 0, this.player.x, this.player.y, this.player.x, targetY, 0xaa44ff, 0.7).setLineWidth(6).setDepth(7).setOrigin(0, 0);
        this.tweens.add({ targets: slamLine, alpha: 0, duration: 300, onComplete: () => slamLine.destroy() });
        const ring = this.add.circle(this.player.x, targetY, 10, 0x8844cc, 0.8).setDepth(7);
        this.tweens.add({ targets: ring, scaleX: 8, scaleY: 8, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
        this.player.y = targetY;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.npcGravSpaceSlamLockUntil = this.time.now + 300;
      },
      gravityGravBombSnap: (x, y) => {
        if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= 120) {
          this.player.x = x; this.player.y = y;
          (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          const ring = this.add.circle(x, y, 10, 0x8844cc, 0.85).setDepth(6);
          this.tweens.add({ targets: ring, scaleX: 13, scaleY: 13, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
          const core = this.add.circle(x, y, 6, 0xffffff, 0.9).setDepth(7);
          this.tweens.add({ targets: core, scaleX: 3, scaleY: 3, alpha: 0, duration: 180, onComplete: () => core.destroy() });
        }
      },
      gravityLunarLanding: () => {
        if (this.gravLunarShadow) { this.gravLunarShadow.destroy(); this.gravLunarShadow = null; }
        const W = this.scale.width; const H = this.scale.height;
        const lRadius = Math.min(W, H) * 0.44;
        this.gravLunarRadius = lRadius;
        this.gravLunarShadow = this.add.circle(W / 2, H / 2, lRadius, 0x221144, 0.55).setDepth(3);
        this.gravLunarFireAt = this.time.now + 3000;
        this.gravLunarOwner = 'npc';
        this.tweens.add({ targets: this.gravLunarShadow, alpha: 0.75, yoyo: true, repeat: -1, duration: 600 });
      },
      // Legacy sand no-ops
      sandFlintlock: () => {},
      sandBlindingSand: () => {},
      sandToggleTornado: () => {},
      sandMirage: () => {},
      sandActivateGlass: () => {},
      // Creation (NPC)
      creationDaggerSpray: (tx, ty, count) => {
        this.spawnCreationDaggers(this.npc.x, this.npc.y, tx, ty, count, 'npc');
      },
      creationBolt: (tx, ty, tier) => {
        this.spawnCreationBolt(this.npc.x, this.npc.y, tx, ty, tier, 'npc');
      },
      creationScytheLaunch: (_tx, _ty) => {
        this.spawnCreationScythe(this.npc.x, this.npc.y, this.player.x, this.player.y, 'npc');
      },
      creationBlock: (x, y, w, h) => { this.spawnCreationBlocker(x, y, w, h, 'npc'); },
      creationMaze: () => { this.spawnCreationMaze('npc'); },
    };
  }

  // ── Clone context ────────────────────────────────────────────────

  private buildCloneContext(targetX: number, targetY: number): CastContext {
    const clone = this.clone!;
    return {
      scene: this,
      casterX: clone.x,
      casterY: clone.y,
      targetX,
      targetY,
      isPlayerCaster: false,
      projectiles: this.cloneProjectiles!,
      dealAoeDamage: (cx, cy, radius, damage) => {
        if (Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) <= radius) {
          this.player.takeDamage(damage);
        }
      },
      dashCaster: (vx, vy) => { (clone.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy); },
      healCaster: (amount) => clone.heal(amount),
      damageCaster: (amount) => clone.applySelfDamage(amount),
      setCasterSpeedMultiplier: (mult) => { this.cloneSpeedMult = mult; },
      lockCaster: (durationMs) => {
        this.cloneNukeChanneling = true;
        this.cloneNukeChannelEnd = this.time.now + durationMs;
        (clone.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      },
      addShieldCharge: () => { clone.shieldCharges += 1; },
      spawnPuddle: () => { /* managed via cloneSplashActiveUntil */ },
      spawnGeyser: (x, y) => this.createGeyser(x, y, 'npc'),
      spawnPainRain: () => clone.isMastered
        ? this.createPainRain('npc', 500, 150, 2400)
        : this.createPainRain('npc'),
      spawnPlant: (x, y) => this.createPlant(x, y, 'npc'),
      growPlants: () => {
        for (const p of this.npcPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0x44ff44, 0.6).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
      },
      thornPlants: () => {
        for (const p of this.npcPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0xcc2222, 0.75).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
          if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius) {
            this.player.takeDamage(20);
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc2222);
          }
        }
      },
      startThornDrag: () => { /* managed via clone reaction */ },
      activateQuickShot: () => { this.cloneQuickShotCharged = true; },
      placeWindTrap: (x, y) => {
        this.cloneWindTrapX = x; this.cloneWindTrapY = y;
        this.cloneWindTrapExpiry = this.time.now + 5000;
        if (this.cloneWindTrapSprite) this.cloneWindTrapSprite.destroy();
        this.cloneWindTrapSprite = this.add.circle(x, y, 80, 0xaaddff, 0).setDepth(3);
        this.cloneWindTrapSprite.setStrokeStyle(3, 0xaaddff, 0.9);
        this.tweens.add({ targets: this.cloneWindTrapSprite, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
      },
      grappleTo: (x, y) => {
        const dx = x - clone.x;
        const dy = y - clone.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 1200;
        const travelTime = Math.min(350, (len / speed) * 1000);
        const body = clone.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
        this.time.delayedCall(travelTime, () => { if (clone.active) body.setVelocity(0, 0); });
      },
      reportAirSnipeResult: (hit) => {
        if (hit) { this.cloneAirConsecutiveHits = Math.min(this.cloneAirConsecutiveHits + 1, 3); }
        else { this.cloneAirConsecutiveHits = 0; }
      },
      quickShotActive: this.cloneQuickShotCharged,
      addShieldHp: (amount) => { clone.shieldHp = Math.min(100, clone.shieldHp + amount); },
      getShieldHp: () => clone.shieldHp,
      setShieldHp: (amount) => { clone.shieldHp = Math.max(0, amount); },
      slamCaster: () => {
        const dx = this.player.x - clone.x;
        const dy = this.player.y - clone.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        (clone.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 600, (dy / len) * 600);
        this.cloneEarthSlamActive = true;
        this.cloneEarthSlamEnd = this.time.now + 400;
        this.cloneEarthSlamHitDealt = false;
      },
      dealMeleeDamage: (range, damage, knockback = 0) => {
        const dist = Phaser.Math.Distance.Between(clone.x, clone.y, this.player.x, this.player.y);
        if (dist > range) return;
        this.player.takeDamage(damage);
        this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
        if (knockback > 0) {
          const toPlayerX = this.player.x - clone.x;
          const toPlayerY = this.player.y - clone.y;
          const pb = this.player.body as Phaser.Physics.Arcade.Body;
          pb.setVelocity((toPlayerX / dist) * knockback, (toPlayerY / dist) * knockback);
        }
      },
      startBullRush: () => { /* clone does not use bull rush */ },
      spawnDrone: () => {},
      commandDrones: () => {},
      launchDrone: () => {},
      placeFirewall: () => {},
      startOverdrive: () => {},
      launchDarkBomb: () => {},
      activateTentacle: () => {},
      placeSnapTrap: () => {},
      activateShadowDance: () => {},
      startBlackHole: () => {},
      // Ice — no-ops for clone
      fireIceSpike: () => {},
      fireFrostBlast: () => {},
      toggleBlockUp: () => {},
      startSkate: () => {},
      fireFrozenSolid: () => {},
      // Growth — no-ops for clone
      fireGrowthClick: () => {},
      openMutateMenu: () => {},
      fireInfect: () => {},
      activateBloat: () => {},
      triggerMutantMorph: () => {},
      // Crystal — no-ops for clone
      fireCrystalLaser: () => {},
      placeCrystalNode: () => {},
      startCrystalBarrage: () => {},
      placeCrystalPortal: () => {},
      activateCrystalTrick: () => {},
      // Soul — no-ops for clone
      fireSoulOrb: () => {},
      summonGhost: () => {},
      soulSacrifice: () => {},
      soulConsume: () => {},
      // Hunt — no-ops for clone
      huntThrowGrenade: () => {},
      huntHuntersTrail: () => {},
      huntBloodPact: () => {},
      huntTransform: () => {},
      huntSlash: () => {},
      huntLeap: () => {},
      huntBloodHunt: () => {},
      huntBloodMoon: () => {},
      huntUntransform: () => {},
      huntVampireStake: () => {},
      huntGarlicTrap: () => {},
      huntBatForm: () => {},
      huntVampireDrain: () => {},
      // Time — no-ops for clone
      timeBarrage: () => {},
      timeWarp: () => {},
      timeRemain: () => {},
      timeHalt: () => {},
      timeTimeless: () => {},
      sandFlintlock: () => {},
      sandBlindingSand: () => {},
      sandToggleTornado: () => {},
      sandMirage: () => {},
      sandActivateGlass: () => {},
      // Gravity — no-ops for clone
      gravitySlash: () => {},
      gravityMeteorShadow: () => {},
      gravityMeteorRainNpcBurst: () => {},
      gravitySpaceSlam: () => {},
      gravityGravBombSnap: () => {},
      gravityLunarLanding: () => {},
      // Creation (clone stubs)
      creationDaggerSpray: () => {},
      creationBolt: () => {},
      creationScytheLaunch: () => {},
      creationBlock: () => {},
      creationMaze: () => {},
    };
  }

  // ── World effect helpers ─────────────────────────────────────────

  private createGeyser(x: number, y: number, owner: 'player' | 'npc'): void {
    // Permanent Geysers upgrade: cap at 2, remove oldest when placing a 3rd
    if (owner === 'player' && this.hasUpgrade('r')) {
      const mine = this.geysers.filter(g => g.owner === 'player');
      if (mine.length >= 2) {
        const oldest = mine[0];
        oldest.sprite.destroy();
        this.geysers.splice(this.geysers.indexOf(oldest), 1);
      }
    }
    const sprite = this.add.circle(x, y, 40, 0x00ccaa, 0.45).setDepth(2);
    this.tweens.add({
      targets: sprite,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.2,
      yoyo: true,
      repeat: -1,
      duration: 800,
    });
    const expiresAt = (owner === 'player' && this.hasUpgrade('r')) ? Infinity : this.time.now + 5000;
    this.geysers.push({ sprite, expiresAt, x, y, radius: 40, owner });
  }

  private createPainRain(
    owner: 'player' | 'npc',
    count = 100,
    minDelay = 50,
    maxDelay = 800,
    damage = 5,
    color = 0x001155,
    shadowRadius = 14,
    hitRadius = 55,
  ): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const pad = 50;
    for (let i = 0; i < count; i++) {
      const sx = Phaser.Math.Between(pad, W - pad);
      const sy = Phaser.Math.Between(pad, H - pad);
      const fireAt = this.time.now + Phaser.Math.Between(minDelay, maxDelay);
      const shadow = this.add.circle(sx, sy, shadowRadius, color, 0.6).setDepth(7);
      this.painRainShadows.push({ sprite: shadow, fireAt, x: sx, y: sy, fired: false, owner, damage, hitRadius, color });
    }
  }

  private createPlant(x: number, y: number, owner: 'player' | 'npc'): void {
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    // Cap at 5 normal plants per owner — remove oldest normal plant if over limit
    const normalCount = list.filter((p) => p.type === 'normal').length;
    if (normalCount >= 5) {
      const oldestNormalIdx = list.findIndex((p) => p.type === 'normal');
      if (oldestNormalIdx !== -1) {
        const oldest = list.splice(oldestNormalIdx, 1)[0];
        oldest.sprite.destroy(); oldest.label.destroy(); oldest.healthBar.destroy();
      }
    }
    // E upgrade: double HP and purple color for player plants
    const isUpgradedE = owner === 'player' && this.hasUpgrade('e');
    const maxHp = isUpgradedE ? 50 : 25;
    const fillColor = isUpgradedE ? 0x9922cc : 0x22aa22;
    const fillAlpha = isUpgradedE ? 0.6 : 0.55;
    const sprite = this.add.circle(x, y, 24, fillColor, fillAlpha).setDepth(2);
    const label = this.add.text(x, y, '🌱', { fontSize: '20px' }).setOrigin(0.5).setDepth(3);
    const healthBar = new HealthBar(this, maxHp);
    this.tweens.add({
      targets: sprite,
      scaleX: 1.08, scaleY: 1.08, alpha: 0.35,
      yoyo: true, repeat: -1, duration: 1200,
    });
    list.push({ sprite, label, healthBar, expiresAt: Infinity, x, y, radius: 120, hp: maxHp, maxHp, owner, type: 'normal', accum: 0 });
  }

  private convertToLifePlant(): void {
    if (this.playerPlants.some((p) => p.type === 'life')) return; // already one life plant
    let closest: Plant | null = null;
    let closestDist = Infinity;
    for (const p of this.playerPlants) {
      if (p.type !== 'normal') continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    if (!closest) return;
    closest.type = 'life';
    closest.hp = 100;
    closest.maxHp = 100;
    closest.accum = 0;
    closest.sprite.setFillStyle(0xaaffaa, 0.75);
    closest.label.setText('🌼');
    closest.healthBar.destroy();
    closest.healthBar = new HealthBar(this, 100);
    const bloom = this.add.circle(closest.x, closest.y, 12, 0xaaffaa, 0.9).setDepth(6);
    this.tweens.add({ targets: bloom, scaleX: 8, scaleY: 8, alpha: 0, duration: 600, onComplete: () => bloom.destroy() });
  }

  private convertToThornPlant(): void {
    if (this.playerPlants.filter((p) => p.type === 'thorn').length >= 2) return; // max 2 thorn plants
    let closest: Plant | null = null;
    let closestDist = Infinity;
    for (const p of this.playerPlants) {
      if (p.type !== 'normal') continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    if (!closest) return;
    closest.type = 'thorn';
    closest.hp = 50;
    closest.maxHp = 50;
    closest.accum = 0;
    closest.sprite.setFillStyle(0xff2222, 0.75);
    closest.label.setText('🌵');
    closest.healthBar.destroy();
    closest.healthBar = new HealthBar(this, 50);
    const burst = this.add.circle(closest.x, closest.y, 12, 0xff2222, 0.9).setDepth(6);
    this.tweens.add({ targets: burst, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => burst.destroy() });
  }

  private triggerOvergrowth(): void {
    const plants = [...this.playerPlants];
    this.playerPlants = [];
    for (const p of plants) {
      const boom = this.add.circle(p.x, p.y, 12, 0x44ff44, 0.8).setDepth(6);
      this.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 450, onComplete: () => boom.destroy() });
      p.sprite.destroy(); p.label.destroy(); p.healthBar.destroy();
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const speed = 480;
        const proj = new Projectile(this, p.x + Math.cos(angle) * 20, p.y + Math.sin(angle) * 20, 'proj-life', 8, true);
        this.projectiles.add(proj);
        proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }
    }
  }

  // NPC variants of life plant helpers — used when P2 picks life with R/F/Q upgrades
  private npcConvertToLifePlant(): void {
    if (this.npcPlants.some((p) => p.type === 'life')) return;
    let closest: Plant | null = null;
    let closestDist = Infinity;
    for (const p of this.npcPlants) {
      if (p.type !== 'normal') continue;
      const d = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, p.x, p.y);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    if (!closest) return;
    closest.type = 'life';
    closest.hp = 100;
    closest.maxHp = 100;
    closest.accum = 0;
    closest.sprite.setFillStyle(0xaaffaa, 0.75);
    closest.label.setText('🌼');
    closest.healthBar.destroy();
    closest.healthBar = new HealthBar(this, 100);
    const bloom = this.add.circle(closest.x, closest.y, 12, 0xaaffaa, 0.9).setDepth(6);
    this.tweens.add({ targets: bloom, scaleX: 8, scaleY: 8, alpha: 0, duration: 600, onComplete: () => bloom.destroy() });
  }

  private npcConvertToThornPlant(): void {
    if (this.npcPlants.filter((p) => p.type === 'thorn').length >= 2) return;
    let closest: Plant | null = null;
    let closestDist = Infinity;
    for (const p of this.npcPlants) {
      if (p.type !== 'normal') continue;
      const d = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, p.x, p.y);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    if (!closest) return;
    closest.type = 'thorn';
    closest.hp = 50;
    closest.maxHp = 50;
    closest.accum = 0;
    closest.sprite.setFillStyle(0xff2222, 0.75);
    closest.label.setText('🌵');
    closest.healthBar.destroy();
    closest.healthBar = new HealthBar(this, 50);
    const burst = this.add.circle(closest.x, closest.y, 12, 0xff2222, 0.9).setDepth(6);
    this.tweens.add({ targets: burst, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => burst.destroy() });
  }

  private npcTriggerOvergrowth(): void {
    const plants = [...this.npcPlants];
    this.npcPlants = [];
    for (const p of plants) {
      const boom = this.add.circle(p.x, p.y, 12, 0x44ff44, 0.8).setDepth(6);
      this.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 450, onComplete: () => boom.destroy() });
      p.sprite.destroy(); p.label.destroy(); p.healthBar.destroy();
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const speed = 480;
        const proj = new Projectile(this, p.x + Math.cos(angle) * 20, p.y + Math.sin(angle) * 20, 'proj-life', 8, false);
        this.projectiles.add(proj);
        proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }
    }
  }

  // ── Game over ────────────────────────────────────────────────────

  private hasUpgrade(slot: string): boolean {
    return this.activeUpgrades.includes(slot);
  }

  private hasP2Upgrade(slot: string): boolean {
    return this.p2ActiveUpgrades.includes(slot);
  }

  private endGame(playerWon: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;

    // Network host: send final gameOver state packet now, before update() stops ticking
    if (this.isNetworkPvP && this.networkRole === 'host' && this.networkManager) {
      this.networkManager.sendState({
        type: 'state',
        tick: ++this.networkTick,
        player: { x: this.player.x, y: this.player.y, vx: 0, vy: 0, hp: this.player.hp, maxHp: this.player.maxHp, shieldCharges: this.player.shieldCharges, shieldHp: this.player.shieldHp, chargeRatio: this.player.chargeRatio, isInvincible: this.player.isInvincible, cooldownMult: this.player.cooldownMult },
        npc:    { x: this.npc.x,    y: this.npc.y,    vx: 0, vy: 0, hp: this.npc.hp,    maxHp: this.npc.maxHp,    shieldCharges: this.npc.shieldCharges,    shieldHp: this.npc.shieldHp,    chargeRatio: this.npc.chargeRatio,    isInvincible: this.npc.isInvincible,    cooldownMult: this.npc.cooldownMult },
        gameOver: { playerWon },
      });
    }

    this.cameras.main.flash(
      350,
      playerWon ? 255 : 0,
      playerWon ? 140 : 80,
      playerWon ? 0 : 255,
    );

    this.time.delayedCall(700, () => {
      if (this.gauntletState) {
        if (playerWon) {
          this.scene.start('GauntletIntermediaryScene', { gauntlet: this.gauntletState });
        } else {
          this.scene.start('GameOverScene', {
            playerWon: false,
            difficulty: this.npcDifficulty.level,
            isGauntlet: true,
          });
        }
      } else {
        this.scene.start('GameOverScene', {
          playerWon,
          difficulty: this.isPvP ? 0 : this.npcDifficulty.level,
          rewardMult: (!this.isPvP && playerWon) ? getTotalRewardMult() : undefined,
          isPvP: this.isPvP,
          isNetworkPvP: this.isNetworkPvP,
        });
      }
    });
  }

  // ── Oil helpers ──────────────────────────────────────────────────

  private spawnOilPuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const sprite = this.add.circle(x, y, 30, 0x332200, 0.55).setDepth(2);
    const puddle: OilPuddle = {
      sprite, x, y, expiresAt: this.time.now + 12000,
      ignited: false, igniteTickAccum: 0, radius: 30, owner,
    };
    if (owner === 'player') this.playerOilPuddles.push(puddle);
    else this.npcOilPuddles.push(puddle);
  }

  private fireOverdriveSalvoBomb(tx: number, ty: number): void {
    const ox = this.player.x, oy = this.player.y;
    const bomb = this.add.circle(ox, oy, 7, 0xffaa00, 0.9).setDepth(8);
    this.tweens.add({
      targets: bomb, x: tx, y: ty, duration: 450, ease: 'Power2',
      onComplete: () => {
        const boom = this.add.circle(tx, ty, 7, 0xff6600, 0.9).setDepth(8);
        this.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
        bomb.destroy();
        if (Phaser.Math.Distance.Between(tx, ty, this.npc.x, this.npc.y) <= 50) {
          this.npc.takeDamage(10);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
        }
      },
    });
  }

  // ── Visual helpers ───────────────────────────────────────────────

  private spawnHitFlash(x: number, y: number, color: number): void {
    const flash = this.add.circle(x, y, 8, color, 0.9);
    this.tweens.add({
      targets: flash,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const ft = this.add.text(x, y, text, { fontSize: '14px', color, fontFamily: 'Arial', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: ft, y: y - 30, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
  }

  /** amount=0 → BLOCKED, amount=-1 → DODGED, amount>0 → damage */
  private spawnDamageNumber(x: number, y: number, amount: number): void {
    const isBlocked = amount === 0;
    const isDodged = amount === -1;
    const isReflected = amount === -2;
    const label = isReflected ? 'REFLECTED' : isBlocked ? 'BLOCKED' : isDodged ? 'DODGED' : `-${amount}`;
    const color = isReflected ? '#ff66ff' : isBlocked ? '#66ddff' : isDodged ? '#aaeeff' : '#ffffff';
    const stroke = isReflected ? '#660066' : isBlocked ? '#003344' : isDodged ? '#002244' : '#880000';

    const txt = this.add.text(x, y, label, {
      fontSize: (isBlocked || isDodged || isReflected) ? '13px' : `${Math.min(20, 12 + Math.floor(amount / 10))}px`,
      fontFamily: '"Arial Black", sans-serif',
      color,
      stroke,
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 700,
      ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  private spawnFlamethrowerCone(px: number, py: number, tx: number, ty: number): void {
    const angle = Phaser.Math.Angle.Between(px, py, tx, ty);
    const cone = this.add.triangle(
      px + Math.cos(angle) * 60,
      py + Math.sin(angle) * 60,
      0, -14,
      90, 0,
      0, 14,
      0xff5500, 0.55,
    );
    cone.setRotation(angle);
    cone.setDepth(4);
    this.tweens.add({
      targets: cone,
      alpha: 0,
      scaleX: 0.4,
      duration: 120,
      onComplete: () => cone.destroy(),
    });
  }

  private frostDamageMultiplier(stacks: number): number {
    if (stacks >= 5) return 1.45;
    if (stacks >= 4) return 1.30;
    if (stacks >= 3) return 1.20;
    return 1.0;
  }

  private addFrostStack(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      if (this.playerBlackIceMorphActive) {
        // Black Ice Morph: add void frost instead of regular frost (no slow, but DOT)
        this.npcVoidFrostStacks = Math.min(5, this.npcVoidFrostStacks + 1);
        this.npc.incomingDamageMultiplier = this.frostDamageMultiplier(this.npcVoidFrostStacks);
      } else {
        this.npcFrostStacks = Math.min(5, this.npcFrostStacks + 1);
        this.npc.incomingDamageMultiplier = this.frostDamageMultiplier(this.npcFrostStacks);
      }
    } else {
      this.playerFrostStacks = Math.min(5, this.playerFrostStacks + 1);
      const baseMult = this.frostDamageMultiplier(this.playerFrostStacks);
      this.player.incomingDamageMultiplier = this.playerBlackIceMorphActive ? baseMult * 1.20 : baseMult;
    }
  }

  private clearFrostStacks(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      this.npcFrostStacks = 0;
      this.npc.incomingDamageMultiplier = 1;
    } else {
      this.playerFrostStacks = 0;
      this.player.incomingDamageMultiplier = this.playerBlackIceMorphActive ? 1.20 : 1;
    }
  }

  private spawnIcyTrail(x: number, y: number, owner: 'player' | 'npc'): void {
    const isVoid = owner === 'player' && this.playerBlackIceMorphActive;
    const fillColor = isVoid ? 0x440066 : 0x88ccff;
    const strokeColor = isVoid ? 0x9900ff : 0xcceeff;
    const spr = this.add.circle(x, y, 32, fillColor, 0.35).setDepth(2)
      .setStrokeStyle(1, strokeColor, 0.5);
    this.tweens.add({ targets: spr, alpha: 0.15, duration: 4800, yoyo: true, repeat: 0 });
    this.icyTrails.push({ sprite: spr, expiresAt: this.time.now + 5000, x, y, radius: 32, frostTickAccum: 0, owner });
  }

  private spawnFrozenSolidVisual(x: number, y: number, angle: number): void {
    const gfx = this.add.graphics().setDepth(7);
    const half = Math.PI / 8; // 22.5° half-angle
    const len = 1200;
    gfx.fillStyle(0x88ccff, 0.25);
    gfx.lineStyle(2, 0xcceeff, 0.8);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x + Math.cos(angle - half) * len, y + Math.sin(angle - half) * len);
    gfx.lineTo(x + Math.cos(angle + half) * len, y + Math.sin(angle + half) * len);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
    this.tweens.add({ targets: gfx, alpha: 0, duration: 450, onComplete: () => gfx.destroy() });
  }

  private spawnFrostBeamVisual(x1: number, y1: number, x2: number, y2: number): void {
    const gfx = this.add.graphics().setDepth(8);
    gfx.lineStyle(10, 0x88ccff, 0.7);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(3, 0xffffff, 0.9);
    gfx.lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: gfx, alpha: 0, duration: 280, onComplete: () => gfx.destroy() });
  }

  // ── Crystal helpers ──────────────────────────────────────────────

  /** Returns the distance t along the ray (ox+t*dx, oy+t*dy) where it first intersects the circle. Returns null if no hit. */
  private rayCircleIntersect(ox: number, oy: number, dx: number, dy: number, cx: number, cy: number, r: number): number | null {
    const fx = ox - cx, fy = oy - cy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    const disc = b * b - 4 * c; // a = 1 (direction normalized)
    if (disc < 0) return null;
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b - sqrtDisc) / 2;
    const t2 = (-b + sqrtDisc) / 2;
    if (t1 > 1) return t1;
    if (t2 > 1) return t2;
    return null;
  }

  /**
   * Fire a hitscan laser from (startX,startY) toward (toX,toY).
   * Reflects off crystal nodes (±22.5°, ×2 damage per bounce).
   * Redirects through own portal gates toward nearest enemy.
   */
  private fireCrystalLaserFrom(startX: number, startY: number, toX: number, toY: number, baseDamage: number, isFromPlayer: boolean, isShredder = false): void {
    const len0 = Math.sqrt((toX - startX) ** 2 + (toY - startY) ** 2) || 1;
    let dx = (toX - startX) / len0;
    let dy = (toY - startY) / len0;
    let ox = startX, oy = startY;
    let dmg = baseDamage;

    const target = isFromPlayer ? this.npc : this.player;
    const allCrystals = [...this.crystalNodes, ...this.npcCrystalNodes];
    const ownPortals = isFromPlayer ? this.crystalPortals : this.npcCrystalPortals;
    const CRYSTAL_R = 14, ENEMY_R = 22, PORTAL_R = 20;
    const MAX_DIST = this.scale.width + this.scale.height;
    const MAX_BOUNCES = 5;

    const segments: {x1: number, y1: number, x2: number, y2: number}[] = [];
    let lastBounced: CrystalNode | null = null;
    let portalUsed = false;
    let nextSegFromMoving = false; // true when last bounce was off a moving crystal

    for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
      let minT = MAX_DIST;
      let hitType: 'crystal' | 'portal' | 'enemy' | 'none' = 'none';
      let hitCrystal: CrystalNode | null = null;
      let hitPortal: CrystalPortalGate | null = null;

      for (const c of allCrystals) {
        if (c === lastBounced) continue;
        const t = this.rayCircleIntersect(ox, oy, dx, dy, c.x, c.y, CRYSTAL_R);
        if (t !== null && t > 2 && t < minT) { minT = t; hitType = 'crystal'; hitCrystal = c; hitPortal = null; }
      }

      if (!portalUsed && ownPortals.length === 2) {
        for (const p of ownPortals) {
          const t = this.rayCircleIntersect(ox, oy, dx, dy, p.x, p.y, PORTAL_R);
          if (t !== null && t > 2 && t < minT) { minT = t; hitType = 'portal'; hitPortal = p; hitCrystal = null; }
        }
      }

      const tEnemy = this.rayCircleIntersect(ox, oy, dx, dy, target.x, target.y, ENEMY_R);
      if (tEnemy !== null && tEnemy > 2 && tEnemy < minT) { minT = tEnemy; hitType = 'enemy'; hitCrystal = null; hitPortal = null; }

      // Clamp to nearest wall if nothing hit
      if (hitType === 'none') {
        let wallT = MAX_DIST;
        if (dx > 0.001) wallT = Math.min(wallT, (this.scale.width  - ox) / dx);
        else if (dx < -0.001) wallT = Math.min(wallT, -ox / dx);
        if (dy > 0.001) wallT = Math.min(wallT, (this.scale.height - oy) / dy);
        else if (dy < -0.001) wallT = Math.min(wallT, -oy / dy);
        minT = Math.max(0, Math.min(minT, wallT));
      }

      const endX = ox + dx * minT;
      const endY = oy + dy * minT;
      segments.push({ x1: ox, y1: oy, x2: endX, y2: endY });

      // If the previous bounce was off a moving crystal (click laser only, not shredder), trigger 20 instant AOE explosions along this segment
      if (nextSegFromMoving && isFromPlayer && !isShredder) {
        for (let mi = 0; mi < 20; mi++) {
          const t = (mi + 0.5) / 20;
          const mx = ox + (endX - ox) * t;
          const my = oy + (endY - oy) * t;
          const AOE_R = 70;
          if (Phaser.Math.Distance.Between(mx, my, target.x, target.y) <= AOE_R) {
            target.takeDamage(8);
            this.spawnHitFlash(target.x, target.y, 0xffcc44);
          }
          const exp = this.add.circle(mx, my, AOE_R * 0.15, 0xffcc44, 0.7).setDepth(9);
          this.tweens.add({ targets: exp, scaleX: AOE_R / (AOE_R * 0.15), scaleY: AOE_R / (AOE_R * 0.15), alpha: 0, duration: 280, onComplete: () => exp.destroy() });
        }
        nextSegFromMoving = false;
      }

      if (hitType === 'enemy') {
        target.takeDamage(dmg);
        this.spawnHitFlash(target.x, target.y, 0x88eeff);
        break;
      } else if (hitType === 'crystal' && hitCrystal) {
        dmg *= 2;
        // Reflect direction off crystal surface normal
        const nx = (endX - hitCrystal.x) / CRYSTAL_R;
        const ny = (endY - hitCrystal.y) / CRYSTAL_R;
        const dot = dx * nx + dy * ny;
        dx = dx - 2 * dot * nx;
        dy = dy - 2 * dot * ny;
        const rlen = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= rlen; dy /= rlen;
        ox = endX + dx * 3;
        oy = endY + dy * 3;
        lastBounced = hitCrystal;
        this.tweens.add({ targets: hitCrystal.sprite, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 80, yoyo: true });
        if (hitCrystal.moving && isFromPlayer) nextSegFromMoving = true;
      } else if (hitType === 'portal' && hitPortal) {
        const other = ownPortals.find((p) => p !== hitPortal)!;
        const portalCd = isFromPlayer ? this.crystalPortalLaserCooldown : this.npcCrystalPortalLaserCooldown;
        if (this.time.now - portalCd >= 2000) {
          // Auto-aim toward enemy — 2s cooldown
          const tdx = target.x - other.x, tdy = target.y - other.y;
          const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
          dx = tdx / tlen; dy = tdy / tlen;
          if (isFromPlayer) this.crystalPortalLaserCooldown = this.time.now;
          else this.npcCrystalPortalLaserCooldown = this.time.now;
        } else {
          // Cooldown active — portal teleports exit but keeps current direction
        }
        ox = other.x + dx * 3;
        oy = other.y + dy * 3;
        portalUsed = true;
        lastBounced = null;
      } else {
        break;
      }
    }

    // Draw beam segments (color shifts from cyan → white → gold with each bounce)
    const gfx = this.add.graphics();
    gfx.setDepth(15);
    const beamColors = [0x88eeff, 0xaaffff, 0xffffff, 0xffee88, 0xffcc44];
    for (let si = 0; si < segments.length; si++) {
      gfx.lineStyle(3, beamColors[Math.min(si, beamColors.length - 1)], 1);
      gfx.lineBetween(segments[si].x1, segments[si].y1, segments[si].x2, segments[si].y2);
    }
    this.tweens.add({ targets: gfx, alpha: 0, duration: 160, onComplete: () => gfx.destroy() });
  }

  // Returns beam segments for preview drawing (no damage, no side effects)
  private computeCrystalPreviewSegments(startX: number, startY: number, toX: number, toY: number, isFromPlayer: boolean): {x1: number, y1: number, x2: number, y2: number}[] {
    const len0 = Math.sqrt((toX - startX) ** 2 + (toY - startY) ** 2) || 1;
    let dx = (toX - startX) / len0;
    let dy = (toY - startY) / len0;
    let ox = startX, oy = startY;

    const target = isFromPlayer ? this.npc : this.player;
    const allCrystals = [...this.crystalNodes, ...this.npcCrystalNodes];
    const ownPortals = isFromPlayer ? this.crystalPortals : this.npcCrystalPortals;
    const CRYSTAL_R = 14, ENEMY_R = 22, PORTAL_R = 20;
    const MAX_DIST = this.scale.width + this.scale.height;
    const MAX_BOUNCES = 5;

    const segments: {x1: number, y1: number, x2: number, y2: number}[] = [];
    let lastBounced: CrystalNode | null = null;
    let portalUsed = false;

    for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
      let minT = MAX_DIST;
      let hitType: 'crystal' | 'portal' | 'enemy' | 'none' = 'none';
      let hitCrystal: CrystalNode | null = null;
      let hitPortal: CrystalPortalGate | null = null;

      for (const c of allCrystals) {
        if (c === lastBounced) continue;
        const t = this.rayCircleIntersect(ox, oy, dx, dy, c.x, c.y, CRYSTAL_R);
        if (t !== null && t > 2 && t < minT) { minT = t; hitType = 'crystal'; hitCrystal = c; hitPortal = null; }
      }

      if (!portalUsed && ownPortals.length === 2) {
        for (const p of ownPortals) {
          const t = this.rayCircleIntersect(ox, oy, dx, dy, p.x, p.y, PORTAL_R);
          if (t !== null && t > 2 && t < minT) { minT = t; hitType = 'portal'; hitPortal = p; hitCrystal = null; }
        }
      }

      const tEnemy = this.rayCircleIntersect(ox, oy, dx, dy, target.x, target.y, ENEMY_R);
      if (tEnemy !== null && tEnemy > 2 && tEnemy < minT) { minT = tEnemy; hitType = 'enemy'; hitCrystal = null; hitPortal = null; }

      if (hitType === 'none') {
        let wallT = MAX_DIST;
        if (dx > 0.001) wallT = Math.min(wallT, (this.scale.width  - ox) / dx);
        else if (dx < -0.001) wallT = Math.min(wallT, -ox / dx);
        if (dy > 0.001) wallT = Math.min(wallT, (this.scale.height - oy) / dy);
        else if (dy < -0.001) wallT = Math.min(wallT, -oy / dy);
        minT = Math.max(0, Math.min(minT, wallT));
      }

      const endX = ox + dx * minT;
      const endY = oy + dy * minT;
      segments.push({ x1: ox, y1: oy, x2: endX, y2: endY });

      if (hitType === 'enemy') {
        break;
      } else if (hitType === 'crystal' && hitCrystal) {
        const nx = (endX - hitCrystal.x) / CRYSTAL_R;
        const ny = (endY - hitCrystal.y) / CRYSTAL_R;
        const dot = dx * nx + dy * ny;
        dx = dx - 2 * dot * nx;
        dy = dy - 2 * dot * ny;
        const rlen = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= rlen; dy /= rlen;
        ox = endX + dx * 3;
        oy = endY + dy * 3;
        lastBounced = hitCrystal;
      } else if (hitType === 'portal' && hitPortal) {
        const other = ownPortals.find((p) => p !== hitPortal)!;
        const portalCd = isFromPlayer ? this.crystalPortalLaserCooldown : this.npcCrystalPortalLaserCooldown;
        if (this.time.now - portalCd >= 2000) {
          const tdx = target.x - other.x, tdy = target.y - other.y;
          const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
          dx = tdx / tlen; dy = tdy / tlen;
        }
        ox = other.x + dx * 3;
        oy = other.y + dy * 3;
        portalUsed = true;
        lastBounced = null;
      } else {
        break;
      }
    }
    return segments;
  }

  private applyGrowthMutation(id: string, target: 'player' | 'npc'): void {
    const fighter = target === 'player' ? this.player : this.npc;
    const isPlayer = target === 'player';
    switch (id) {
      case 'healthier':
        fighter.maxHp += 10;
        fighter.heal(10);
        break;
      case 'deadly':
        if (isPlayer) this.growthDamageMult += 0.15;
        else this.npcGrowthDamageMult += 0.15;
        break;
      case 'linger':
        if (isPlayer) this.growthLingerBonus += 3000;
        else this.npcGrowthLingerBonus += 3000;
        break;
      case 'viral':
        if (isPlayer) this.growthViralBonus += 2;
        else this.npcGrowthViralBonus += 2;
        break;
      case 'grow': {
        fighter.maxHp += 20;
        fighter.heal(20);
        const newScaleG = 1 + Math.max(-0.6, (isPlayer ? this.growthScaleBonus : this.npcGrowthScaleBonus) + 0.2);
        if (isPlayer) { this.growthScaleBonus += 0.2; } else { this.npcGrowthScaleBonus += 0.2; }
        fighter.setScale(newScaleG);
        break;
      }
      case 'shrink': {
        fighter.maxHp = Math.max(20, fighter.maxHp - 20);
        if (fighter.hp > fighter.maxHp) fighter.hp = fighter.maxHp;
        const newScaleS = Math.max(0.4, 1 + (isPlayer ? this.growthScaleBonus : this.npcGrowthScaleBonus) - 0.2);
        if (isPlayer) { this.growthScaleBonus -= 0.2; } else { this.npcGrowthScaleBonus -= 0.2; }
        fighter.setScale(newScaleS);
        break;
      }
      case 'buffer':
        if (isPlayer) this.growthBloatCdMs = Math.max(1000, this.growthBloatCdMs - 500);
        else this.npcGrowthBloatCdMs = Math.max(1000, this.npcGrowthBloatCdMs - 500);
        break;
      case 'spray':
        if (isPlayer) this.growthInfectExtraProj += 1;
        else this.npcGrowthInfectExtraProj += 1;
        break;
      case 'quick':
        if (isPlayer) this.growthInfectCdMs = Math.max(1000, this.growthInfectCdMs - 500);
        break;
      case 'regenerative':
        if (isPlayer) this.growthRegenRate += 1;
        else this.npcGrowthRegenRate += 1;
        break;
      // E+ advanced mutations (player only)
      case 'chunk':
        if (isPlayer) this.growthBloatAoeRadius = Math.round(this.growthBloatAoeRadius * 1.1);
        break;
      case 'relapse':
        if (isPlayer) this.growthInfectBounces += 1;
        break;
      case 'gene-enhance':
        if (isPlayer) {
          this.player.reduceCooldown('mutant-morph', 20000);
          const ft = this.add.text(fighter.x, fighter.y - 40, '🧪 Q -20s!', { fontSize: '12px', color: '#aadd44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(15);
          this.tweens.add({ targets: ft, y: ft.y - 30, alpha: 0, duration: 1200, onComplete: () => ft.destroy() });
        }
        break;
      case 'spread':
        if (isPlayer) this.growthSpreadStacks += 1;
        break;
      case 'uber-infect':
        if (isPlayer) this.growthInfectHitboxMult += 0.2;
        break;
      case 'fungal-flourish':
        if (isPlayer) this.growthFungalStacks += 1;
        break;
      case 'greed':
        if (isPlayer) this.growthGreedBonus += 1;
        break;
      case 'sneeze':
        if (isPlayer) this.growthSneezeStacks += 1;
        break;
      case 'cough':
        if (isPlayer) this.growthCoughStacks += 1;
        break;
    }
    // Flash to confirm
    const flash = this.add.circle(fighter.x, fighter.y, 22, 0x88bb22, 0.7).setDepth(12);
    this.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
  }

  private spawnGravMeteorShadow(x: number, y: number, owner: 'player' | 'npc', frozen: boolean): void {
    // Cap frozen player shadows (FIFO — remove oldest frozen player shadow)
    if (frozen && owner === 'player') {
      const frozenPlayerShadows = this.gravMeteorShadows.filter(s => s.frozen && s.owner === 'player');
      const maxFrozen = this.hasUpgrade('e') ? 10 : 5;
      if (frozenPlayerShadows.length >= maxFrozen) {
        const oldest = frozenPlayerShadows[0];
        oldest.sprite.destroy();
        this.gravMeteorShadows.splice(this.gravMeteorShadows.indexOf(oldest), 1);
      }
    }
    const spr = this.add.circle(x, y, 22, 0x221144, 0.7).setDepth(5)
      .setStrokeStyle(2, 0x8844cc, 0.8);
    if (frozen) {
      // Pulsing while waiting for record-release
      this.tweens.add({ targets: spr, alpha: 0.4, yoyo: true, repeat: -1, duration: 500 });
    }
    this.gravMeteorShadows.push({ sprite: spr, fireAt: frozen ? Infinity : this.time.now + 1500, x, y, owner, damage: 14, radius: 70, directHitRadius: 28, directBonus: 16, frozen });
  }

  private spawnTimePuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const spr = this.add.circle(x, y, 28, 0xffdd44, 0.32).setDepth(2)
      .setStrokeStyle(2, 0xffffaa, 0.5);
    this.tweens.add({ targets: spr, alpha: 0.14, yoyo: true, repeat: -1, duration: 900 });
    this.timePuddles.push({ sprite: spr, expiresAt: this.time.now + 5000, x, y, radius: 28, owner });
  }

  private spawnShadowDarkCloud(x: number, y: number, owner: 'player' | 'npc'): void {
    const spr = this.add.circle(x, y, 36, 0x330044, 0.55).setDepth(3);
    spr.setStrokeStyle(1, 0x8800cc, 0.5);
    this.tweens.add({ targets: spr, scaleX: 1.2, scaleY: 1.2, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 });
    this.shadowDarkClouds.push({ sprite: spr, expiresAt: this.time.now + 6000, x, y, radius: 36, tickAccum: 0, owner });
  }

  private spawnSoulGhost(type: 'basic' | 'ghoul' | 'banshee' | 'knight' | 'corpse' | 'necromancer', x: number, y: number, owner: 'player' | 'npc', enhanced = false): void {
    let baseHp: number;
    if (type === 'basic')      baseHp = enhanced ? 40 : 25;
    else if (type === 'ghoul') baseHp = 20;
    else if (type === 'banshee') baseHp = enhanced ? 150 : 100;
    else if (type === 'knight') baseHp = 125;
    else if (type === 'corpse') baseHp = enhanced ? 30 : 15;
    else /* necromancer */      baseHp = 50;

    const r = type === 'banshee' ? 31 : type === 'knight' ? 30 : type === 'necromancer' ? 24 : 21;
    const baseColors: Record<string, number> = { basic: 0xaaaaff, ghoul: 0x8844aa, banshee: 0xddaaff, knight: 0xffaacc, corpse: 0x88aa66, necromancer: 0x6622aa };
    const color = enhanced ? 0xffcc44 : baseColors[type];
    const spr = this.add.circle(x, y, r, color, 0.75)
      .setStrokeStyle(2, enhanced ? 0xffee88 : 0xeeeeff, 0.6).setDepth(8);
    this.tweens.add({ targets: spr, scaleX: 0.88, scaleY: 0.88, yoyo: true, repeat: -1, duration: 600 });

    const angle = Math.random() * Math.PI * 2;
    const dx = type === 'knight' ? Math.cos(angle) : 0;
    const dy = type === 'knight' ? Math.sin(angle) : 0;

    const summon: SoulSummon = { sprite: spr, hp: baseHp, maxHp: baseHp, type, owner, lastContactTick: -99999, ghoulShootAccum: 0, dx, dy, healAccum: 0, necroSummonAccum: 0, enhanced, speedMult: 1, slamAccum: 0 };
    if (owner === 'player') this.playerSoulSummons.push(summon);
    else this.npcSoulSummons.push(summon);
  }

  private updateSoulSummon(
    gs: SoulSummon,
    enemy: { x: number; y: number; takeDamage(n: number): void },
    time: number,
    delta: number,
    isPlayerOwned: boolean,
  ): void {
    const pad = 34;
    const W = this.scale.width, H = this.scale.height;
    const baseSpeed = gs.type === 'basic' ? 90 : gs.type === 'banshee' ? 75 : gs.type === 'knight' ? 750 : gs.type === 'corpse' ? 55 : gs.type === 'necromancer' ? 50 : 60;
    const speed = gs.type === 'knight' ? baseSpeed * gs.speedMult : baseSpeed;
    const sx = gs.sprite.x, sy = gs.sprite.y;

    if (gs.type === 'basic' || gs.type === 'banshee' || gs.type === 'corpse') {
      const dx = enemy.x - sx, dy = enemy.y - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      gs.sprite.setPosition(sx + (dx / len) * speed * (delta / 1000), sy + (dy / len) * speed * (delta / 1000));

      // Enhanced banshee: periodic slam AOE
      if (gs.type === 'banshee' && gs.enhanced) {
        gs.slamAccum += delta;
        if (gs.slamAccum >= 3000) {
          gs.slamAccum = 0;
          const slamDmg = 15;
          if (Phaser.Math.Distance.Between(sx, sy, enemy.x, enemy.y) <= 100) {
            enemy.takeDamage(slamDmg);
            this.spawnHitFlash(enemy.x, enemy.y, 0xffcc44);
          }
          const ring = this.add.circle(sx, sy, 10, 0xffcc44, 0.5).setDepth(8);
          this.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
        }
      }
    } else if (gs.type === 'ghoul') {
      const dx = enemy.x - sx, dy = enemy.y - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = 250;
      if (len > targetDist + 40) {
        gs.sprite.setPosition(sx + (dx / len) * speed * (delta / 1000), sy + (dy / len) * speed * (delta / 1000));
      } else if (len < targetDist - 40) {
        gs.sprite.setPosition(sx - (dx / len) * speed * (delta / 1000), sy - (dy / len) * speed * (delta / 1000));
      }
      gs.ghoulShootAccum += delta;
      if (gs.ghoulShootAccum >= 2000) {
        gs.ghoulShootAccum = 0;
        const blen = len || 1;
        if (gs.enhanced) {
          // Enhanced ghoul: 3 bolts in a cone
          const baseAngle = Math.atan2(dy, dx);
          for (const spread of [-0.25, 0, 0.25]) {
            const bolt = new Projectile(this, gs.sprite.x, gs.sprite.y, 'proj-soul-bolt', 10, isPlayerOwned);
            this.projectiles.add(bolt);
            bolt.launch(Math.cos(baseAngle + spread) * 380, Math.sin(baseAngle + spread) * 380);
          }
        } else {
          const bolt = new Projectile(this, gs.sprite.x, gs.sprite.y, 'proj-soul-bolt', 10, isPlayerOwned);
          this.projectiles.add(bolt);
          bolt.launch((dx / blen) * 380, (dy / blen) * 380);
        }
      }
    } else if (gs.type === 'necromancer') {
      // Necromancer: stay back from enemy
      const dx = enemy.x - sx, dy = enemy.y - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = 300;
      if (len < targetDist - 30) {
        gs.sprite.setPosition(sx - (dx / len) * speed * (delta / 1000), sy - (dy / len) * speed * (delta / 1000));
      } else if (len > targetDist + 30) {
        gs.sprite.setPosition(sx + (dx / len) * speed * (delta / 1000), sy + (dy / len) * speed * (delta / 1000));
      }
      // Summon a corpse every 3s
      gs.necroSummonAccum += delta;
      const summonInterval = 3000;
      if (gs.necroSummonAccum >= summonInterval) {
        gs.necroSummonAccum = 0;
        const count = gs.enhanced ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const ox = gs.sprite.x + (Math.random() - 0.5) * 40;
          const oy = gs.sprite.y + (Math.random() - 0.5) * 40;
          this.spawnSoulGhost('corpse', ox, oy, gs.owner);
        }
      }
    } else {
      // knight: bounce off walls
      let nx = sx + gs.dx * speed * (delta / 1000);
      let ny = sy + gs.dy * speed * (delta / 1000);
      if (nx < pad || nx > W - pad) { gs.dx *= -1; nx = Math.max(pad, Math.min(W - pad, nx)); }
      if (ny < pad || ny > H - pad) { gs.dy *= -1; ny = Math.max(pad, Math.min(H - pad, ny)); }
      gs.sprite.setPosition(nx, ny);
    }

    // Corpse self-heal
    if (gs.type === 'corpse') {
      gs.healAccum += delta;
      const healInterval = gs.enhanced ? 1000 : 2000;
      const healAmt = gs.enhanced ? 2 : 1;
      if (gs.healAccum >= healInterval) {
        gs.healAccum -= healInterval;
        gs.hp = Math.min(gs.maxHp, gs.hp + healAmt);
      }
    }

    // Clamp to arena
    gs.sprite.setPosition(
      Math.max(pad, Math.min(W - pad, gs.sprite.x)),
      Math.max(pad, Math.min(H - pad, gs.sprite.y)),
    );

    // Contact damage (ghoul/necromancer: no contact, uses bolts/summons)
    if (gs.type !== 'ghoul' && gs.type !== 'necromancer' && time - gs.lastContactTick >= 1000) {
      const contactRange = gs.type === 'banshee' ? 60 : gs.type === 'knight' ? 60 : 43;
      const contactDmg = gs.type === 'basic' ? (gs.enhanced ? 8 : 5) : gs.type === 'banshee' ? 12 : gs.type === 'corpse' ? 3 : 15;
      if (Phaser.Math.Distance.Between(gs.sprite.x, gs.sprite.y, enemy.x, enemy.y) <= contactRange) {
        enemy.takeDamage(contactDmg);
        this.spawnHitFlash(enemy.x, enemy.y, gs.enhanced ? 0xffcc44 : 0xccaaff);
        gs.lastContactTick = time;
      }
    }

    // Check if hit by enemy projectiles
    for (const go of this.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active) continue;
      const isEnemyProj = isPlayerOwned ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!isEnemyProj) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, gs.sprite.x, gs.sprite.y) <= 20) {
        gs.hp -= proj.damage;
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        break;
      }
    }
  }

  // ── Creation helpers ─────────────────────────────────────────────

  private spawnCreationDaggers(fromX: number, fromY: number, tx: number, ty: number, count: number, owner: 'player' | 'npc'): void {
    const dx = tx - fromX, dy = ty - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const perp = { x: -dy / len, y: dx / len };
    const speed = 620;
    const angle = Math.atan2(dy, dx); // long axis aligns with travel direction
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 10;
      const ox = fromX + perp.x * offset;
      const oy = fromY + perp.y * offset;
      const spr = this.add.rectangle(ox, oy, 18, 4, 0xeeeeff, 0.9).setRotation(angle).setDepth(7);
      this.creatDaggers.push({ sprite: spr, vx: (dx / len) * speed, vy: (dy / len) * speed, damage: 8, owner, hitSet: new Set(), cutSet: new Set() });
    }
  }

  private spawnCreationBolt(fromX: number, fromY: number, tx: number, ty: number, tier: 'copper' | 'silver' | 'gold', owner: 'player' | 'npc'): void {
    const dx = tx - fromX, dy = ty - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 380;
    const colors: Record<string, number> = { copper: 0xcc6622, silver: 0xccccdd, gold: 0xffdd22 };
    const damages: Record<string, number> = { copper: 5, silver: 10, gold: 15 };
    const spr = this.add.circle(fromX + (dx / len) * 24, fromY + (dy / len) * 24, 7, colors[tier], 0.9)
      .setStrokeStyle(1, 0xffffff, 0.5).setDepth(7);
    this.creatBolts.push({ sprite: spr, vx: (dx / len) * speed, vy: (dy / len) * speed, tier, damage: damages[tier], owner });
  }

  private spawnCreationScythe(fromX: number, fromY: number, tx: number, ty: number, owner: 'player' | 'npc'): void {
    const dx = tx - fromX, dy = ty - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const maxHp = 25;
    const spr = this.add.rectangle(fromX + (dx / len) * 30, fromY + (dy / len) * 30, 20, 12, 0xcc22aa, 0.9)
      .setStrokeStyle(2, 0xff44ee, 0.9).setDepth(8);
    const hpBg = this.add.rectangle(fromX, fromY - 20, 28, 4, 0x333333).setDepth(9);
    const hpBar = this.add.rectangle(fromX - 14, fromY - 20, 28, 4, 0xcc22aa).setDepth(10).setOrigin(0, 0.5);
    this.creatScythes.push({ sprite: spr, hp: maxHp, maxHp, vx: (dx / len) * 87, vy: (dy / len) * 87, owner, lastContactTick: -99999, hpBar, hpBg });
  }

  private spawnCreationBlocker(cx: number, cy: number, w: number, h: number, owner: 'player' | 'npc'): void {
    const maxHp = 125;
    const rect = this.add.rectangle(cx, cy, w, h, 0xcc8844, 0.55)
      .setStrokeStyle(2, 0xff9955, 0.9).setDepth(4);
    const hpBg = this.add.rectangle(cx, cy - h / 2 - 6, w, 4, 0x333333).setDepth(5);
    const hpBar = this.add.rectangle(cx - w / 2, cy - h / 2 - 6, w, 4, 0xcc8844).setDepth(6).setOrigin(0, 0.5);
    this.creatBlockers.push({ rect, x: cx, y: cy, w, h, hp: maxHp, maxHp, owner, hpBar, hpBg });
  }

  private spawnCreationMech(stage: 1 | 2 | 3): void {
    if (this.creatMech) { this.creatMech.sprite.destroy(); this.creatMech.hpBar.destroy(); this.creatMech.hpBg.destroy(); this.creatMech = null; }
    const mechHp = stage === 3 ? 60 : stage === 2 ? 40 : 20;
    const mechColor = stage === 3 ? 0x5511aa : stage === 2 ? 0x8844cc : 0xbb88ee;
    const mSpr = this.add.rectangle(this.player.x, this.player.y + 28, 32, 32, mechColor, 0.9).setStrokeStyle(2, 0xffffff, 0.5).setDepth(3);
    const mHpBg = this.add.rectangle(this.player.x, this.player.y + 50, 34, 5, 0x333333, 0.8).setDepth(4);
    const mHpBar = this.add.rectangle(this.player.x - 17, this.player.y + 50, 34, 5, 0x8844cc, 0.9).setDepth(5).setOrigin(0, 0.5);
    this.creatMech = { sprite: mSpr, stage, hp: mechHp, maxHp: mechHp, hpBar: mHpBar, hpBg: mHpBg, rocketAccum: 0, dodgeCdUntil: 0 };
    if (!this.player.damageAbsorber) {
      this.player.damageAbsorber = (amt: number) => {
        if (!this.creatMech) return false;
        this.creatMech.hp -= amt;
        const ratio = Math.max(0, this.creatMech.hp / this.creatMech.maxHp);
        this.creatMech.hpBar.setScale(ratio, 1);
        this.spawnHitFlash(this.creatMech.sprite.x, this.creatMech.sprite.y, 0x8844cc);
        if (this.creatMech.hp <= 0) {
          const ex = this.add.circle(this.creatMech.sprite.x, this.creatMech.sprite.y, 30, 0x8844cc, 0.7).setDepth(8);
          this.tweens.add({ targets: ex, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => ex.destroy() });
          this.creatMech.sprite.destroy(); this.creatMech.hpBar.destroy(); this.creatMech.hpBg.destroy(); this.creatMech = null;
          this.player.damageAbsorber = null;
          this.showFloatingText(this.player.x, this.player.y - 40, 'MECH DESTROYED', '#ff4422');
        }
        return true;
      };
    }
    this.showFloatingText(this.player.x, this.player.y - 40, `MECH STAGE ${stage}`, '#bb88ee');
    this.player.triggerCooldown('scythe-of-doom');
  }

  private spawnCreationMaze(owner: 'player' | 'npc'): void {
    const W = this.scale.width, H = this.scale.height;
    const caster = owner === 'player' ? this.player : this.npc;
    const expireAt = this.time.now + 10000;
    const enhanced = owner === 'player' && this.hasUpgrade('q');
    const targetCount = enhanced ? 36 : 18;
    const maxAttempts = enhanced ? 400 : 200;
    let placed = 0;
    for (let attempt = 0; attempt < maxAttempts && placed < targetCount; attempt++) {
      const w = 30 + Math.random() * 90;
      const h = 30 + Math.random() * 90;
      const x = 50 + Math.random() * (W - 100);
      const y = 50 + Math.random() * (H - 100);
      if (Math.abs(x - caster.x) < w / 2 + 50 && Math.abs(y - caster.y) < h / 2 + 50) continue;
      if (this.crucibleSprite && Math.abs(x - this.crucibleX) < w / 2 + 40 && Math.abs(y - this.crucibleY) < h / 2 + 40) continue;
      const isSpiked = enhanced && Math.random() < 0.25;
      const wallColor = isSpiked ? 0xcc2222 : 0x882288;
      const strokeColor = isSpiked ? 0xff4444 : 0xcc55cc;
      const rect = this.add.rectangle(x, y, w, h, wallColor, 0.5).setStrokeStyle(2, strokeColor, 0.9).setDepth(4);
      this.creatMazeWalls.push({ rect, x, y, w, h, owner, expireAt, spiked: isSpiked, spikeAccum: 0 });
      placed++;
    }
  }

  private resolveCrucibleCraft(time: number, forceKey?: string, forceOwner?: 'player' | 'npc'): void {
    const tiers = forceKey ? [] : this.crucibleBolts.map((b) => b.tier).sort();
    const key = forceKey ?? tiers.map((t) => t[0]).join(''); // e.g. 'ccg', 'sss', 'ggg'
    const owner = forceOwner ?? this.creatCraftOwner;
    // Save last craft key for E+ Electro Bolt
    if (!forceKey) this.creatLastCraftKey = key;
    const caster = owner === 'player' ? this.player : this.npc;
    const enemy = owner === 'player' ? this.npc : this.player;
    const cx = this.crucibleX, cy = this.crucibleY;

    // Clear bolt icons and craft state (skip when re-crafting via Electro Bolt)
    if (!forceKey) {
      for (const b of this.crucibleBolts) b.icon.destroy();
      this.crucibleBolts = [];
      this.creatCraftInProgress = false;
    }

    // Craft resolution flash
    const craftBurst = this.add.circle(cx, cy, 12, 0xffdd44, 0.9).setDepth(8);
    this.tweens.add({ targets: craftBurst, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => craftBurst.destroy() });

    if (key === 'ccc') {
      // 3 copper: 8 copper bolts radiate from crucible
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 380;
        const spr = this.add.circle(cx, cy, 7, 0xcc6622, 0.9).setStrokeStyle(1, 0xffffff, 0.4).setDepth(7);
        this.creatBolts.push({ sprite: spr, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, tier: 'copper', damage: 5, owner });
      }
    } else if (key === 'ccs') {
      // 2 copper + 1 silver: scythe from crucible
      this.spawnCreationScythe(cx, cy, enemy.x, enemy.y, owner);
    } else if (key === 'css') {
      // 1 copper + 2 silver: medkit
      const mkSpr = this.add.rectangle(cx + 40, cy, 20, 20, 0x44ff88, 0.85)
        .setStrokeStyle(2, 0xaaffcc, 0.9).setDepth(5);
      const mkLabel = this.add.text(cx + 40, cy, '+25', { fontSize: '11px', color: '#ffffff' }).setOrigin(0.5).setDepth(6);
      this.creatMedkit = { sprite: mkSpr, label: mkLabel, x: cx + 40, y: cy, expireAt: time + 5000, owner };
    } else if (key === 'sss') {
      // 3 silver: heal pulses (3x, 10 HP, range 110)
      this.creatPulses.push({ x: cx, y: cy, remaining: 3, lastPulseAt: time - 1666, intervalMs: 1666, range: 110, kind: 'heal', magnitude: 10, owner });
    } else if (key === 'ggg') {
      // 3 gold: 4 beams in + shape, then 25% damage reduction 15s
      const beamLength = 200;
      const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      for (const ang of angles) {
        const bx = cx + Math.cos(ang) * beamLength / 2;
        const by = cy + Math.sin(ang) * beamLength / 2;
        const bw = Math.abs(Math.cos(ang)) > 0.5 ? beamLength : 6;
        const bh = Math.abs(Math.sin(ang)) > 0.5 ? beamLength : 6;
        const beam = this.add.rectangle(bx, by, bw, bh, 0xffdd22, 0.8).setDepth(8);
        this.tweens.add({ targets: beam, alpha: 0, duration: 400, onComplete: () => beam.destroy() });
        if (Math.abs(enemy.x - bx) <= bw / 2 + 22 && Math.abs(enemy.y - by) <= bh / 2 + 22) {
          enemy.takeDamage(35);
          this.spawnHitFlash(enemy.x, enemy.y, 0xffdd22);
        }
      }
      this.creatPrevIncomingDamageMult = caster.incomingDamageMultiplier;
      caster.incomingDamageMultiplier *= 0.75;
      this.creatDamageReductionEnd = time + 15000;
    } else if (key === 'ccg') {
      // 2 copper + 1 gold: robot (ghoul)
      this.spawnSoulGhost('ghoul', cx, cy, owner);
    } else if (key === 'cgg') {
      // 1 copper + 2 gold: damage pulses (3x, 15 dmg, range 110)
      this.creatPulses.push({ x: cx, y: cy, remaining: 3, lastPulseAt: time - 1666, intervalMs: 1666, range: 110, kind: 'damage', magnitude: 15, owner });
    } else if (key === 'gss') {
      // 1 gold + 2 silver: 5 fire DOT pools at random positions
      const W = this.scale.width, H = this.scale.height;
      const pad = 50;
      for (let fi = 0; fi < 5; fi++) {
        let px = pad + Math.random() * (W - pad * 2);
        let py = pad + Math.random() * (H - pad * 2);
        // Retry to avoid walls
        for (let r = 0; r < 10; r++) {
          if (px > pad && px < W - pad && py > pad && py < H - pad) break;
          px = pad + Math.random() * (W - pad * 2);
          py = pad + Math.random() * (H - pad * 2);
        }
        const puddleSpr = this.add.circle(px, py, 35, 0xff4422, 0.55).setDepth(2).setStrokeStyle(1, 0xff8844, 0.5);
        this.tweens.add({ targets: puddleSpr, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 });
        this.gravFirePuddles.push({ sprite: puddleSpr, expiresAt: time + 8000, x: px, y: py, radius: 35, tickAccum: 0, owner });
      }
    } else if (key === 'ggs') {
      // 2 gold + 1 silver: 30% speed boost 15s
      this.creatPrevSpeedMult = owner === 'player' ? this.playerSpeedMult : this.npcSpeedMult;
      if (owner === 'player') this.playerSpeedMult = (this.creatPrevSpeedMult !== -1 ? this.creatPrevSpeedMult : 1) * 1.3;
      else this.npcSpeedMult = (this.creatPrevSpeedMult !== -1 ? this.creatPrevSpeedMult : 1) * 1.3;
      this.creatSpeedBoostEnd = time + 15000;
      const speedFlash = this.add.circle(caster.x, caster.y, 20, 0x44aaff, 0.6).setDepth(9);
      this.tweens.add({ targets: speedFlash, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => speedFlash.destroy() });
    }
  }

  private pushFighterOutOfRect(body: Phaser.Physics.Arcade.Body, bx: number, by: number, bw: number, bh: number): void {
    const cx = body.x + body.width / 2;
    const cy = body.y + body.height / 2;
    const dx = cx - bx;
    const dy = cy - by;
    const halfW = bw / 2 + body.width / 2;
    const halfH = bh / 2 + body.height / 2;
    if (Math.abs(dx) >= halfW || Math.abs(dy) >= halfH) return;
    const ox = halfW - Math.abs(dx);
    const oy = halfH - Math.abs(dy);
    if (ox < oy) body.x += (dx < 0 ? -ox : ox);
    else body.y += (dy < 0 ? -oy : oy);
  }

  private pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
  }

  // ── Hunt helpers ─────────────────────────────────────────────────

  private huntToggleBeastHud(toBeast: boolean): void {
    for (const o of this.huntNormalHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(!toBeast);
    for (const o of this.huntBeastHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(toBeast);
    this.abilityBars = toBeast ? this.huntBeastFills : this.huntNormalFills;
  }

  private huntToggleVampireHud(toVampire: boolean): void {
    for (const o of this.huntNormalHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(!toVampire);
    for (const o of this.huntVampireHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(toVampire);
    this.abilityBars = toVampire ? this.huntVampireFills : this.huntNormalFills;
  }

  private spawnGrenadeExplosion(x: number, y: number, selfDamage: boolean, owner: 'player' | 'npc', isHeal = false): void {
    const radius = 130;
    const dmg = 35;
    const healAmt = 15;
    if (isHeal) {
      // Heal grenade: heal both fighters within radius
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= radius) {
        this.player.heal(healAmt);
        this.showFloatingText(this.player.x, this.player.y - 20, `+${healAmt}`, '#44ff44');
      }
      if (Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) <= radius) {
        this.npc.heal(healAmt);
        this.showFloatingText(this.npc.x, this.npc.y - 20, `+${healAmt}`, '#44ff44');
      }
      const ring = this.add.circle(x, y, 10, 0x44cc44, 0.9).setDepth(8);
      this.tweens.add({ targets: ring, scaleX: 13, scaleY: 13, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
      const core = this.add.circle(x, y, 6, 0x88ff88, 1).setDepth(9);
      this.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 210, onComplete: () => core.destroy() });
      return;
    }
    if (owner === 'player') {
      const nd = Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y);
      if (nd <= radius) {
        this.npc.takeDamage(dmg);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
        if (this.huntBloodMoonActive && this.hasUpgrade('f')) this.player.heal(Math.ceil(dmg * 0.5));
        if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(dmg * 0.5));
      }
      if (selfDamage && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= radius) {
        this.player.applySelfDamage(20);
      }
    } else {
      const pd = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
      if (pd <= radius) {
        this.player.takeDamage(dmg);
        this.spawnHitFlash(this.player.x, this.player.y, 0xff6600);
        if (this.npcHuntBloodPactActive && this.time.now < this.npcHuntBloodPactEnd) this.npc.heal(Math.ceil(dmg * 0.5));
      }
      if (selfDamage && Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) <= radius) {
        this.npc.applySelfDamage(20);
      }
    }
    const ring = this.add.circle(x, y, 10, 0xff6600, 0.9).setDepth(8);
    this.tweens.add({ targets: ring, scaleX: 13, scaleY: 13, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    const core = this.add.circle(x, y, 6, 0xffcc44, 1).setDepth(9);
    this.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 210, onComplete: () => core.destroy() });
  }

  private applyNpcBleedVisual(): void {
    if (!this.npcBleedAura) {
      this.npcBleedAura = this.add.circle(this.npc.x, this.npc.y, 26, 0xcc0000, 0.3)
        .setStrokeStyle(2, 0xff2222, 0.5).setDepth(3);
      this.tweens.add({ targets: this.npcBleedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
    }
    // Drip particles
    for (let i = 0; i < 3; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = this.add.circle(
        this.npc.x + Math.cos(ang) * 18, this.npc.y + Math.sin(ang) * 18,
        3, 0xcc0000, 1,
      ).setDepth(8);
      this.tweens.add({ targets: d, y: d.y + 20, alpha: 0, duration: 600, onComplete: () => d.destroy() });
    }
    this.showFloatingText(this.npc.x, this.npc.y - 28, '🩸 Bleeding!', '#ff2222');
  }

  private applyPlayerBleedVisual(): void {
    if (!this.playerBleedAura) {
      this.playerBleedAura = this.add.circle(this.player.x, this.player.y, 26, 0xcc0000, 0.3)
        .setStrokeStyle(2, 0xff2222, 0.5).setDepth(3);
      this.tweens.add({ targets: this.playerBleedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
    }
    for (let i = 0; i < 3; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = this.add.circle(
        this.player.x + Math.cos(ang) * 18, this.player.y + Math.sin(ang) * 18,
        3, 0xcc0000, 1,
      ).setDepth(8);
      this.tweens.add({ targets: d, y: d.y + 20, alpha: 0, duration: 600, onComplete: () => d.destroy() });
    }
    this.showFloatingText(this.player.x, this.player.y - 28, '🩸 Bleeding!', '#ff2222');
  }

  // ── Update loop ──────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.gameEnded) return;

    const pointer = this.input.activePointer;
    const mouseX = pointer.worldX;
    const mouseY = pointer.worldY;

    // ── P2 input (PvP) ───────────────────────────────────────────
    if (this.isPvP && !this.isNetworkPvP) {
      // Local PvP: read from keyboard
      this.p2PrevInput = this.p2Input;
      this.p2Input = this.readLocalP2Input();
    } else if (this.isNetworkPvP && this.networkRole === 'guest') {
      // Network guest: read P1 keys/mouse and send to host
      this.p2PrevInput = this.p2Input;
      const inp = this.buildGuestInput(mouseX, mouseY);
      this.p2Input = inp;
      this.networkManager?.sendInput(inp);
    }
    // Network host: p2Input is set by onInputReceived callback — nothing to do here

    // ── P2 aim reticle (PvP) ─────────────────────────────────────
    let p2TargetX = 0;
    let p2TargetY = 0;
    if (this.isPvP && !this.isNetworkPvP) {
      // Local PvP: IJKL-driven reticle
      const reticleSpeed = 400;
      let rx = 0, ry = 0;
      if (this.p2Input.aimLeft)  rx -= reticleSpeed;
      if (this.p2Input.aimRight) rx += reticleSpeed;
      if (this.p2Input.aimUp)    ry -= reticleSpeed;
      if (this.p2Input.aimDown)  ry += reticleSpeed;
      this.p2ReticleX = Phaser.Math.Clamp(this.p2ReticleX + rx * (delta / 1000), 0, this.scale.width);
      this.p2ReticleY = Phaser.Math.Clamp(this.p2ReticleY + ry * (delta / 1000), 0, this.scale.height);
      this.p2Reticle.setPosition(this.p2ReticleX, this.p2ReticleY);
      p2TargetX = this.p2ReticleX;
      p2TargetY = this.p2ReticleY;
    } else if (this.isNetworkPvP && this.networkRole === 'host') {
      // Host: use aim coords received from guest
      p2TargetX = this.p2NetworkAimX * this.scale.width;
      p2TargetY = this.p2NetworkAimY * this.scale.height;
    } else if (this.isNetworkPvP && this.networkRole === 'guest') {
      // Guest: use own mouse as aim for local prediction
      p2TargetX = mouseX;
      p2TargetY = mouseY;
    }
    this.p2LastAimX = p2TargetX;
    this.p2LastAimY = p2TargetY;

    // ── Channel expiry ────────────────────────────────────────────
    if (this.nukeChanneling && time >= this.nukeChannelEnd) { this.nukeChanneling = false; this.player.chargeRatio = 0; }
    if (this.npcNukeChanneling && time >= this.npcNukeChannelEnd) this.npcNukeChanneling = false;

    // Standard nuke charge bar (non-Armageddon, non-air-beam-walk)
    if (this.nukeChanneling && !this.armageddonActive && !this.airBeamWalking) {
      const elapsed = time - (this.nukeChannelEnd - 2000);
      this.player.chargeRatio = Math.min(1, elapsed / 2000);
    }
    // Air Q upgrade charge bar while walking
    if (this.airBeamWalking) {
      this.player.chargeRatio = Math.min(1, (time - (this.nukeChannelEnd - 1500)) / 1500);
    }
    // Air E upgrade charge bar
    if (this.airElectroHolding) {
      this.player.chargeRatio = Math.min(1, (time - this.airElectroHeldSince) / 1500);
    } else if (this.airElectroCharged && !this.airBeamWalking && !this.nukeChanneling) {
      this.player.chargeRatio = 1;
    }

    // ── Flame Body ticks (player) ────────────────────────────────
    if (this.elementId === 'fire' && this.flameBodyActive) {
      this.flameBodyTickAccum += delta;
      if (this.flameBodyTickAccum >= 250) {
        this.flameBodyTickAccum -= 250;
        const fbDmg = this.enhancedFlameBody ? 4 : 2;
        this.player.applySelfDamage(fbDmg);
      }
      if (this.flameBodyAura) this.flameBodyAura.setPosition(this.player.x, this.player.y);
    }

    // ── Armageddon charge visual tracking ─────────────────────────
    if (this.armageddonActive && this.nukeChanneling) {
      if (this.armageddonChargeVisual) this.armageddonChargeVisual.setPosition(this.player.x, this.player.y);
      const elapsed = time - (this.nukeChannelEnd - 2000);
      this.player.chargeRatio = Math.min(1, elapsed / 2000);
    } else if (!this.pressureCharging) {
      this.player.chargeRatio = this.enhancedFlameBody ? 1 : 0;
      if (this.armageddonChargeVisual && !this.nukeChanneling) {
        this.armageddonChargeVisual.destroy();
        this.armageddonChargeVisual = null;
        this.armageddonActive = false;
      }
    }

    // ── Burning DOT (Flameshredder upgrade) ───────────────────────
    if (this.npcBurningUntil > time) {
      if (!this.npcBurnAura) {
        this.npcBurnAura = this.add.circle(this.npc.x, this.npc.y, 26, 0xff4400, 0.3).setDepth(7);
      }
      this.npcBurnAura.setPosition(this.npc.x, this.npc.y);
      this.npcBurnTickAccum += delta;
      if (this.npcBurnTickAccum >= 500) {
        this.npcBurnTickAccum -= 500;
        this.npc.takeDamage(1);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0xff4400);
      }
    } else {
      this.npcBurnTickAccum = 0;
      if (this.npcBurnAura) { this.npcBurnAura.destroy(); this.npcBurnAura = null; }
    }

    // ── Burning DOT on player (Mastered Flameshredder) ────────────
    if (this.playerBurningUntil > time) {
      if (!this.playerBurnAura) {
        this.playerBurnAura = this.add.circle(this.player.x, this.player.y, 26, 0xff4400, 0.3).setDepth(7);
      }
      this.playerBurnAura.setPosition(this.player.x, this.player.y);
      this.playerBurnTickAccum += delta;
      if (this.playerBurnTickAccum >= 500) {
        this.playerBurnTickAccum -= 500;
        this.player.applySelfDamage(1);
        this.spawnHitFlash(this.player.x, this.player.y, 0xff4400);
      }
    } else {
      this.playerBurnTickAccum = 0;
      if (this.playerBurnAura) { this.playerBurnAura.destroy(); this.playerBurnAura = null; }
    }

    // ── NPC Flame Body tick ───────────────────────────────────────
    if (this.npcFlameBodyActive) {
      // No self-damage for the NPC (only cosmetic / speed effect)
      this.npcFlameBodyTickAccum += delta;
      if (this.npcFlameBodyTickAccum >= 250) this.npcFlameBodyTickAccum -= 250;
      if (this.npcFlameBodyAura) this.npcFlameBodyAura.setPosition(this.npc.x, this.npc.y);
    }

    // ── Geyser buff checks ────────────────────────────────────────
    for (const g of this.geysers) {
      if (g.owner === 'player') {
        if (Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) <= g.radius) {
          this.playerGeyserBuffUntil = time + 2000;
        }
      } else {
        if (Phaser.Math.Distance.Between(g.x, g.y, this.npc.x, this.npc.y) <= g.radius) {
          this.npcGeyserBuffUntil = time + 2000;
        }
      }
    }

    // ── Speed multipliers ─────────────────────────────────────────
    if (this.elementId === 'fire') {
      this.playerSpeedMult = this.flameBodyActive ? 2 : 1;
    } else if (this.elementId === 'hunt') {
      if (this.huntBeastForm) this.playerSpeedMult = 1.5;
      else if (this.huntVampireForm) {
        this.playerSpeedMult = 1.0;
        if (this.huntBatFormActive) this.playerSpeedMult *= 1.5;
        if (this.huntVampireDrainActive && this.hasUpgrade('f')) this.playerSpeedMult *= 1.15;
      } else this.playerSpeedMult = 1;
    } else if (this.elementId === 'sand') {
      this.playerSpeedMult = 1;
    } else if (this.elementId === 'earth') {
      this.playerSpeedMult = this.hasUpgrade('e') ? 1 + this.player.shieldHp / 100 : 1;
      if (this.earthShieldShedActive) {
        if (time > this.earthShieldShedEnd) {
          this.earthShieldShedActive = false;
          this.earthShieldShedBonus = 0;
          if (this.earthShieldShedAura) { this.earthShieldShedAura.destroy(); this.earthShieldShedAura = null; }
        } else {
          this.playerSpeedMult += this.earthShieldShedBonus;
          if (this.earthShieldShedAura) this.earthShieldShedAura.setPosition(this.player.x, this.player.y);
        }
      }
    } else if (this.elementId === 'crystal') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // F+: 20% speed boost for 3s after portal teleport
      if (time < this.crystalPortalSpeedBuffUntil) this.playerSpeedMult *= 1.2;
    } else if (this.elementId === 'soul') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // F+ Knight speed buff: +45%
      if (time < this.soulKnightSpeedBuffUntil) this.playerSpeedMult *= 1.45;
      // F+ Ghoul buff: +50% soul orb projectile speed (not movement — handled in fireSoulOrb)
    } else if (this.elementId === 'creation') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // Speed pad boost (F+ Build Mode)
      if (time < this.creatPlayerSpeedPadEnd) this.playerSpeedMult *= 1.25;
      // Mech stage 3 speed bonus
      if (this.creatMech && this.creatMech.stage === 3) this.playerSpeedMult = Math.max(this.playerSpeedMult, 1.4);
    } else {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
    }

    this.npcSpeedMult = 1;
    if (this.npcFlameBodyActive) this.npcSpeedMult = 2;
    else if (time < this.npcGeyserBuffUntil) this.npcSpeedMult = 1.5;
    if (this.npcEarthShieldShedActive) {
      if (time > this.npcEarthShieldShedEnd) {
        this.npcEarthShieldShedActive = false;
        this.npcEarthShieldShedBonus = 0;
        if (this.npcEarthShieldShedAura) { this.npcEarthShieldShedAura.destroy(); this.npcEarthShieldShedAura = null; }
      } else {
        this.npcSpeedMult += this.npcEarthShieldShedBonus;
        if (this.npcEarthShieldShedAura) this.npcEarthShieldShedAura.setPosition(this.npc.x, this.npc.y);
      }
    }
    // (Time element NPC has no speed buff of its own)

    // Oil puddle slows (20%) — player's puddles slow NPC
    if (this.elementId === 'oil' && this.playerOilPuddles.length > 0) {
      const npcOnOilPuddle = this.playerOilPuddles.some(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius,
      );
      if (npcOnOilPuddle) this.npcSpeedMult *= 0.8;
    }
    // Time puddle slows (25%)
    if (this.timePuddles.length > 0) {
      const npcInPuddle = this.timePuddles.some(
        (p) => p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius,
      );
      if (npcInPuddle) this.npcSpeedMult *= 0.75;
      const playerInNpcPuddle = this.timePuddles.some(
        (p) => p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
      );
      if (playerInNpcPuddle) this.playerSpeedMult *= 0.75;
    }
    // Halt zone slows (50%) or Zoom mode (+50% NPC speed + player speed)
    if (this.timeHaltActive) {
      const inZone = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y) <= 120;
      if (this.timeHaltZoomMode) {
        if (inZone) this.npcSpeedMult *= 1.5;
        this.playerSpeedMult *= 1.5;
      } else if (inZone) {
        this.npcSpeedMult *= 0.5;
      }
    }
    if (this.npcTimeHaltActive) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 120) {
        this.playerSpeedMult *= 0.5;
      }
    }
    // Glass Mode: +25% player speed
    if (this.elementId === 'sand' && this.timeGlassMode) {
      this.playerSpeedMult *= 1.25;
    }
    // Ice frost slow on NPC
    if (this.npcFrostStacks > 0) this.npcSpeedMult *= (1 - this.npcFrostStacks * 0.1);
    if (this.npcBlockUpActive) this.npcSpeedMult *= 0.5;
    // Ice frost slow on player
    if (this.playerFrostStacks > 0) {
      this.playerSpeedMult *= (1 - this.playerFrostStacks * 0.1);
    }
    if (this.playerBlockUpActive) this.playerSpeedMult *= 0.5;
    // Ice F+: speed boost from stepping on own skate trail
    if (this.elementId === 'ice' && this.playerIceSpeedBoostUntil > time) this.playerSpeedMult *= 1.2;

    // Hunt trail boost on player
    if (this.elementId === 'hunt') {
      const onTrail = this.huntTrailCircles.some(
        (c) => Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) <= 30,
      );
      if (onTrail) this.playerSpeedMult *= 1.5;
      // NPC blood hunt slow on player
      if (time < this.playerHuntSlowUntil) this.playerSpeedMult *= 0.5;
    }
    // NPC hunt speed adjustments
    if (this.npc.element.id === 'hunt' && this.npcHuntBeastForm) this.npcSpeedMult = Math.max(this.npcSpeedMult, 1.5);
    if (time < this.npcHuntSlowUntil) this.npcSpeedMult *= 0.5;
    // Growth Cough aura slow
    if (this.elementId === 'growth' && this.growthCoughStacks > 0) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 120) {
        this.npcSpeedMult *= Math.max(0.1, 1 - this.growthCoughStacks * 0.05);
      }
    }
    // NPC trail boost
    if (this.npc.element.id === 'hunt') {
      const npcOnTrail = this.npcHuntTrailCircles.some(
        (c) => Phaser.Math.Distance.Between(this.npc.x, this.npc.y, c.x, c.y) <= 30,
      );
      if (npcOnTrail) this.npcSpeedMult *= 1.5;
    }

    // ── Player movement ─────────────────────────────────────────
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.networkRole === 'guest') {
      // Guest does not control P1 — position is reconciled from host state
    } else if (this.nukeChanneling && !this.armageddonActive && !this.airBeamWalking) {
      // Standard nuke: fully locked
      playerBody.setVelocity(0, 0);
    } else if (!this.isDodging) {
      let vx = 0;
      let vy = 0;
      if (this.aKey.isDown) vx -= this.player.speed;
      if (this.dKey.isDown) vx += this.player.speed;
      if (this.wKey.isDown) vy -= this.player.speed;
      if (this.sKey.isDown) vy += this.player.speed;

      if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

      let moveMult = this.playerSpeedMult * this.gauntletSpeedMult;
      if (this.armageddonActive) moveMult *= 0.2;          // Armageddon: 20% speed
      else if (this.pressureCharging) moveMult *= 0.75;    // Pressure Charge: 75% speed

      playerBody.setVelocity(vx * moveMult, vy * moveMult);
    }

    // ── NPC tentacle drag on player ───────────────────────────────
    if (this.npcShadowTentacleHooked && this.npcShadowTentacleActive && !this.isDodging) {
      // In PvP, drag toward P2's aim position; in AI mode, drag toward random AI target
      const dragTargetX = this.isPvP ? this.p2LastAimX : this.npcShadowDragTargetX;
      const dragTargetY = this.isPvP ? this.p2LastAimY : this.npcShadowDragTargetY;
      const dragDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, dragTargetX, dragTargetY);
      if (dragDist > 20) {
        const dragAngle = Math.atan2(dragTargetY - this.player.y, dragTargetX - this.player.x);
        playerBody.setVelocity(Math.cos(dragAngle) * 200, Math.sin(dragAngle) * 200);
      }
    }

    // ── Frozen player ─────────────────────────────────────────────
    if (this.playerFrozenUntil > time && !this.isDodging) {
      playerBody.setVelocity(0, 0);
    }

    // ── Soul haunt stun ────────────────────────────────────────────
    if (this.elementId === 'soul' && time < this.soulHauntStunUntil && !this.isDodging) {
      playerBody.setVelocity(0, 0);
    }

    // ── P2 movement (PvP) ─────────────────────────────────────────
    if (this.isPvP) {
      const npcBody = this.npc.body as Phaser.Physics.Arcade.Body;
      if (!this.p2IsDodging && !(this.npcFrozenUntil > time) && !(this.npcNukeChanneling && !this.npcAirBeamWalking)) {
        let nvx = 0, nvy = 0;
        if (this.p2Input.left)  nvx -= this.npc.speed;
        if (this.p2Input.right) nvx += this.npc.speed;
        if (this.p2Input.up)    nvy -= this.npc.speed;
        if (this.p2Input.down)  nvy += this.npc.speed;
        if (nvx !== 0 && nvy !== 0) { nvx *= 0.7071; nvy *= 0.7071; }
        npcBody.setVelocity(nvx * this.npcSpeedMult, nvy * this.npcSpeedMult);
      } else if (this.npcFrozenUntil > time && !this.p2IsDodging) {
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    }

    // ── Player abilities ─────────────────────────────────────────
    const playerCtx = this.buildPlayerContext(mouseX, mouseY);

    if (this.networkRole !== 'guest') { // guest does not control P1

    if (this.elementId === 'fire') {
      if (!this.nukeChanneling || this.armageddonActive) {
        // ── Click: Fireball / Flamethrower ────────────────────────
        if (pointer.isDown) {
          const justPressed = !this.pointerWasDown;
          this.flamethrowerHoldMs += delta;
          if (justPressed) {
            this.player.castAbility('fireball', playerCtx);
          } else if (this.flamethrowerHoldMs > 120) {
            this.flamethrowerTickAccum += delta;
            if (this.flamethrowerTickAccum >= 100) {
              this.flamethrowerTickAccum -= 100;
              const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
              if (dist <= 180) {
                const dirX = mouseX - this.player.x;
                const dirY = mouseY - this.player.y;
                const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
                const dot = (dirX / dirLen) * ((this.npc.x - this.player.x) / dist)
                          + (dirY / dirLen) * ((this.npc.y - this.player.y) / dist);
                if (dot > 0.866) {
                  const ftDmg = this.enhancedFlameBody ? 8 : 4;
                  this.npc.takeDamage(ftDmg);
                  this.spawnHitFlash(this.npc.x, this.npc.y, 0xff5500);
                  // Flameshredder: apply burning DOT on flamethrower hit
                  if (this.hasUpgrade('click')) {
                    this.npcBurningUntil = Math.max(this.npcBurningUntil, time + 3000);
                  }
                }
              }
              this.spawnFlamethrowerCone(this.player.x, this.player.y, mouseX, mouseY);
            }
          }
        } else {
          this.flamethrowerHoldMs = 0;
          this.flamethrowerTickAccum = 0;
        }

        // ── E: Flame Dash (+ Propulsion upgrade) ──────────────────
        if (!this.armageddonActive && Phaser.Input.Keyboard.JustDown(this.eKey)) {
          const dashStartX = this.player.x;
          const dashStartY = this.player.y;
          if (this.player.castAbility('flame-dash', playerCtx) && this.hasUpgrade('e')) {
            // Spawn 4 explosions sampled during the 280ms dash
            for (let i = 1; i <= 4; i++) {
              this.time.delayedCall(i * 70, () => {
                if (!this.player.active) return;
                const t = i / 4;
                const ex = dashStartX + (this.player.x - dashStartX) * t;
                const ey = dashStartY + (this.player.y - dashStartY) * t;
                const distToNpc = Phaser.Math.Distance.Between(ex, ey, this.npc.x, this.npc.y);
                if (distToNpc <= 50) {
                  this.npc.takeDamage(Phaser.Math.Between(5, 8));
                  this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
                }
                const ring = this.add.circle(ex, ey, 8, 0xff6600, 0.8).setDepth(4);
                this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
              });
            }
          }
        }

        // ── R: Pressure Bomb / Pressure Charge upgrade ────────────
        if (!this.armageddonActive) {
          if (this.hasUpgrade('r')) {
            if (this.rKey.isDown) {
              if (!this.pressureCharging && this.player.getCooldownRatio('pressure-bomb') >= 1) {
                // Start charging
                this.pressureCharging = true;
                this.pressureChargeStart = time;
                this.pressureTremorAccum = 0;
                this.player.incomingDamageMultiplier = 1.5; // vulnerable while charging
                const cv = this.add.circle(this.player.x, this.player.y, 12, 0xff8800, 0.6).setDepth(4);
                this.tweens.add({ targets: cv, scaleX: 0.5, scaleY: 0.5, yoyo: true, repeat: -1, duration: 300 });
                this.pressureChargeVisual = cv;
              }
              if (this.pressureCharging) {
                if (this.pressureChargeVisual) this.pressureChargeVisual.setPosition(this.player.x, this.player.y);
                this.pressureLastMouseX = mouseX;
                this.pressureLastMouseY = mouseY;
                const heldMs = time - this.pressureChargeStart;
                const chargeLevel = heldMs >= 6000 ? 2 : heldMs >= 3000 ? 1 : 0;
                // Update charge bar ratio (max 6s = full bar)
                this.player.chargeRatio = Math.min(1, heldMs / 6000);
                // Tremors during charge (every 1s, after 3s threshold)
                if (chargeLevel >= 1) {
                  this.pressureTremorAccum += delta;
                  if (this.pressureTremorAccum >= 1000) {
                    this.pressureTremorAccum -= 1000;
                    const tremorDmg = chargeLevel === 2 ? 6 : 3;
                    for (let ti = 0; ti < 5; ti++) {
                      const ang = (Math.PI * 2 / 5) * ti;
                      const tx = mouseX + Math.cos(ang) * 70;
                      const ty = mouseY + Math.sin(ang) * 70;
                      if (Phaser.Math.Distance.Between(tx, ty, this.npc.x, this.npc.y) <= 40) {
                        this.npc.takeDamage(tremorDmg);
                      }
                      const tremor = this.add.circle(tx, ty, 6, 0xff6600, 0.7).setDepth(4);
                      this.tweens.add({ targets: tremor, scaleX: 4, scaleY: 4, alpha: 0, duration: 300, onComplete: () => tremor.destroy() });
                    }
                  }
                } else {
                  this.pressureTremorAccum = 0;
                }
              }
            } else if (this.pressureCharging) {
              // Released — fire the charged bomb
              this.pressureCharging = false;
              this.player.chargeRatio = 0;
              this.player.incomingDamageMultiplier = 1;
              if (this.pressureChargeVisual) { this.pressureChargeVisual.destroy(); this.pressureChargeVisual = null; }
              const heldMs = time - this.pressureChargeStart;
              const chargeLevel = heldMs >= 6000 ? 2 : heldMs >= 3000 ? 1 : 0;
              const dmgMult = chargeLevel === 2 ? 2 : chargeLevel === 1 ? 1.5 : 1;
              const finalDmg = Math.round(32 * dmgMult);
              const mx = this.pressureLastMouseX;
              const my = this.pressureLastMouseY;
              if (Phaser.Math.Distance.Between(mx, my, this.npc.x, this.npc.y) <= 100) {
                this.npc.takeDamage(finalDmg);
                this.spawnHitFlash(this.npc.x, this.npc.y, 0xff8800);
              }
              // Explosion visual
              const ring = this.add.circle(mx, my, 10, 0xff8800, 0.9).setDepth(4);
              this.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
              const core = this.add.circle(mx, my, 6, 0xffffff, 0.95).setDepth(5);
              this.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => core.destroy() });
              this.player.triggerCooldown('pressure-bomb');
            }
          } else {
            if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
              this.player.castAbility('pressure-bomb', playerCtx);
            }
          }
        }

        // ── F: Flame Body / Flame Affinity upgrade ────────────────
        if (!this.armageddonActive) {
          if (this.hasUpgrade('f')) {
            const fDown = this.fKey.isDown;
            if (fDown) {
              if (!this.fKeyWasDown) this.fKeyHeldSince = time;
              const held = time - this.fKeyHeldSince;
              if (held >= 1000 && !this.enhancedFlameBody) {
                // Hold 1s → activate enhanced flame body
                this.enhancedFlameBody = true;
                this.flameBodyActive = true;
                this.flameBodyTickAccum = 0;
                if (this.flameBodyAura) this.flameBodyAura.destroy();
                this.flameBodyAura = this.add.circle(this.player.x, this.player.y, 40, 0xff2200, 0.4).setDepth(3);
              } else if (!this.enhancedFlameBody) {
                // Show charge progress toward enhanced activation
                this.player.chargeRatio = Math.min(1, held / 1000);
              }
            } else {
              if (this.fKeyWasDown) {
                const held = time - this.fKeyHeldSince;
                if (held < 1000) {
                  // Short press: toggle on/off (works for both normal and enhanced)
                  const wasActive = this.flameBodyActive;
                  this.flameBodyActive = !wasActive;
                  this.enhancedFlameBody = false;
                  this.flameBodyTickAccum = 0;
                  if (this.flameBodyAura) { this.flameBodyAura.destroy(); this.flameBodyAura = null; }
                  if (this.flameBodyActive) {
                    this.flameBodyAura = this.add.circle(this.player.x, this.player.y, 30, 0xff6600, 0.25).setDepth(3);
                  }
                }
                // Long press release: enhanced stays active until next short press
              }
            }
            this.fKeyWasDown = fDown;
          } else {
            // No upgrade: original toggle
            if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
              this.flameBodyActive = !this.flameBodyActive;
              this.flameBodyTickAccum = 0;
              if (this.flameBodyActive) {
                this.flameBodyAura = this.add.circle(this.player.x, this.player.y, 30, 0xff6600, 0.25).setDepth(3);
              } else {
                if (this.flameBodyAura) { this.flameBodyAura.destroy(); this.flameBodyAura = null; }
              }
            }
          }
        }

        // ── Q: Flame Nuke / Armageddon upgrade ────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          if (this.hasUpgrade('q') && this.player.getCooldownRatio('flame-nuke') >= 1) {
            // Armageddon: move during channel, 264 range, burn bonus damage
            this.player.triggerCooldown('flame-nuke');
            this.nukeChanneling = true;
            this.nukeChannelEnd = time + 2000;
            this.armageddonActive = true;

            const charge = this.add.circle(this.player.x, this.player.y, 10, 0xff2200, 0.6).setDepth(6);
            this.tweens.add({ targets: charge, scaleX: 22, scaleY: 22, alpha: 0.15, duration: 2000, onComplete: () => charge.destroy() });
            this.armageddonChargeVisual = charge;

            this.time.delayedCall(2000, () => {
              this.armageddonActive = false;
              this.nukeChanneling = false;
              const isBurning = this.npcBurningUntil > this.time.now;
              const dmg = isBurning ? 120 : 80;
              const radius = 264;
              const distToNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
              if (distToNpc <= radius) {
                this.npc.takeDamage(dmg);
                this.spawnHitFlash(this.npc.x, this.npc.y, 0xff4400);
              }
              const boom = this.add.circle(this.player.x, this.player.y, 12, 0xff4400, 0.9).setDepth(5);
              this.tweens.add({ targets: boom, scaleX: 22, scaleY: 22, alpha: 0, duration: 700, onComplete: () => boom.destroy() });
              const boomCore = this.add.circle(this.player.x, this.player.y, 8, 0xffffff, 1).setDepth(6);
              this.tweens.add({ targets: boomCore, scaleX: 9, scaleY: 9, alpha: 0, duration: 320, onComplete: () => boomCore.destroy() });
            });
          } else if (!this.hasUpgrade('q')) {
            this.player.castAbility('flame-nuke', this.buildPlayerContext(this.player.x, this.player.y));
          }
        }
      }

    } else if (this.elementId === 'water') {
      if (pointer.isDown) {
        this.player.castAbility('water-cut', playerCtx);
      }
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        if (this.player.castAbility('splash', playerCtx)) {
          this.splashActiveUntil = time + 2000;
          this.splashDropAccum = 0;
          this.splashDropCount = 0;
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
        this.player.castAbility('geyser', playerCtx);
      }
      if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
        this.player.castAbility('water-shield', playerCtx);
      }
      if (this.hasUpgrade('q')) {
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          if (this.player.castAbility('pain-rain', playerCtx)) {
            this.painRainHolding = true;
            this.painRainHoldAccum = 0;
          }
        }
        if (this.qKey.isDown && this.painRainHolding) {
          this.painRainHoldAccum += delta;
          if (this.painRainHoldAccum >= 250) {
            this.painRainHoldAccum -= 250;
            this.createPainRain('player', 15, 0, 100); // 15 drops, near-instant detonation
          }
        }
        if (!this.qKey.isDown) this.painRainHolding = false;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('pain-rain', playerCtx);
        }
      }

    } else if (this.elementId === 'life') {
      // ── Click: Petal Shotgun (or Petal Burst upgrade) ─────────────
      if (pointer.isDown) {
        if (this.hasUpgrade('click')) {
          if (this.player.getCooldownRatio('petal-shotgun') >= 1) {
            this.player.triggerCooldown('petal-shotgun');
            const FIVE_ANGLES = [-30, -15, 0, 15, 30];
            const dx = mouseX - this.player.x;
            const dy = mouseY - this.player.y;
            const baseAngle = Math.atan2(dy, dx);
            const speed = 480;
            const spawnDist = 32;
            for (const deg of FIVE_ANGLES) {
              const angle = baseAngle + deg * (Math.PI / 180);
              const proj = new Projectile(
                this,
                this.player.x + Math.cos(angle) * spawnDist,
                this.player.y + Math.sin(angle) * spawnDist,
                'proj-life', 5, true,
              );
              this.projectiles.add(proj);
              proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
            }
          }
        } else {
          this.player.castAbility('petal-shotgun', playerCtx);
        }
      }

      // ── E: Plant ──────────────────────────────────────────────────
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        this.player.castAbility('plant', playerCtx);
      }

      // ── R: Grow / Life Root upgrade ───────────────────────────────
      if (this.hasUpgrade('r')) {
        const rDown = this.rKey.isDown;
        if (rDown && !this.lifeRPrevDown) {
          this.lifeRHolding = true;
          this.lifeRHoldStart = time;
          this.lifeRChargeVisual = this.add.circle(this.player.x, this.player.y, 28, 0x88ffaa, 0.4).setDepth(4);
        }
        if (rDown && this.lifeRHolding) {
          if (this.lifeRChargeVisual) this.lifeRChargeVisual.setPosition(this.player.x, this.player.y);
          this.player.chargeRatio = Math.min(1, (time - this.lifeRHoldStart) / 3000);
          if (time - this.lifeRHoldStart >= 3000) {
            this.lifeRHolding = false;
            if (this.lifeRChargeVisual) { this.lifeRChargeVisual.destroy(); this.lifeRChargeVisual = null; }
            this.player.chargeRatio = 0;
            this.convertToLifePlant();
            this.player.triggerCooldown('grow');
          }
        }
        if (!rDown && this.lifeRPrevDown && this.lifeRHolding) {
          this.lifeRHolding = false;
          if (this.lifeRChargeVisual) { this.lifeRChargeVisual.destroy(); this.lifeRChargeVisual = null; }
          this.player.chargeRatio = 0;
          this.player.castAbility('grow', playerCtx);
        }
        this.lifeRPrevDown = rDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('grow', playerCtx);
        }
      }

      // ── F: Thorns / Thorn Trap upgrade ───────────────────────────
      if (this.hasUpgrade('f')) {
        const fDown = this.fKey.isDown;
        if (fDown && !this.lifeFPrevDown) {
          this.lifeFHolding = true;
          this.lifeFHoldStart = time;
          this.lifeFChargeVisual = this.add.circle(this.player.x, this.player.y, 28, 0xff4444, 0.4).setDepth(4);
        }
        if (fDown && this.lifeFHolding) {
          if (this.lifeFChargeVisual) this.lifeFChargeVisual.setPosition(this.player.x, this.player.y);
          this.player.chargeRatio = Math.min(1, (time - this.lifeFHoldStart) / 3000);
          if (time - this.lifeFHoldStart >= 3000) {
            this.lifeFHolding = false;
            if (this.lifeFChargeVisual) { this.lifeFChargeVisual.destroy(); this.lifeFChargeVisual = null; }
            this.player.chargeRatio = 0;
            this.convertToThornPlant();
            this.player.triggerCooldown('thorns');
          }
        }
        if (!fDown && this.lifeFPrevDown && this.lifeFHolding) {
          this.lifeFHolding = false;
          if (this.lifeFChargeVisual) { this.lifeFChargeVisual.destroy(); this.lifeFChargeVisual = null; }
          this.player.chargeRatio = 0;
          this.player.castAbility('thorns', playerCtx);
        }
        this.lifeFPrevDown = fDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('thorns', playerCtx);
        }
      }

      // ── Q: Thorn Drag / Overgrowth upgrade ───────────────────────
      if (this.hasUpgrade('q')) {
        const qDown = this.qKey.isDown;
        if (qDown && !this.lifeQPrevDown) {
          if (this.player.getCooldownRatio('thorn-drag') >= 1) {
            this.lifeQHolding = true;
            this.lifeQHoldStart = time;
            this.lifeQChargeVisual = this.add.circle(this.player.x, this.player.y, 35, 0x44ff44, 0.3).setDepth(4);
          }
        }
        if (qDown && this.lifeQHolding) {
          if (this.lifeQChargeVisual) this.lifeQChargeVisual.setPosition(this.player.x, this.player.y);
          this.player.chargeRatio = Math.min(1, (time - this.lifeQHoldStart) / 8000);
          if (time - this.lifeQHoldStart >= 8000) {
            this.lifeQHolding = false;
            if (this.lifeQChargeVisual) { this.lifeQChargeVisual.destroy(); this.lifeQChargeVisual = null; }
            this.player.chargeRatio = 0;
            this.triggerOvergrowth();
            this.player.triggerCooldown('thorn-drag');
          }
        }
        if (!qDown && this.lifeQPrevDown && this.lifeQHolding) {
          this.lifeQHolding = false;
          if (this.lifeQChargeVisual) { this.lifeQChargeVisual.destroy(); this.lifeQChargeVisual = null; }
          this.player.chargeRatio = 0;
          if (this.player.castAbility('thorn-drag', playerCtx)) {
            this.thornDragActiveUntil = time + 2000;
            this.thornDragTickAccum = 0;
            this.thornDragAura = this.add.circle(this.player.x, this.player.y, 30, 0x44ff44, 0.3).setDepth(3);
          }
        }
        this.lifeQPrevDown = qDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          if (this.player.castAbility('thorn-drag', playerCtx)) {
            this.thornDragActiveUntil = time + 2000;
            this.thornDragTickAccum = 0;
            this.thornDragAura = this.add.circle(this.player.x, this.player.y, 30, 0x44ff44, 0.3).setDepth(3);
          }
        }
      }

    } else if (this.elementId === 'air') {
      if (!this.nukeChanneling) {
        // ── Click: Air Snipe ─────────────────────────────────────
        if (pointer.isDown) {
          const snipeBase = this.buildPlayerContext(mouseX, mouseY);
          if (this.airElectroCharged && this.player.getCooldownRatio('air-snipe') >= 1) {
            // Electro charged shot: instant, 1.5× damage, miss = 20 self-damage
            this.player.triggerCooldown('air-snipe');
            this.airElectroCharged = false;
            if (this.airElectroChargeVisual) { this.airElectroChargeVisual.destroy(); this.airElectroChargeVisual = null; }
            this.player.chargeRatio = 0;
            const electroCtx: typeof snipeBase = {
              ...snipeBase,
              lockCaster: () => {},
              quickShotActive: true,
              reportAirSnipeResult: (hit) => {
                if (hit) { this.airConsecutiveHits = Math.min(this.airConsecutiveHits + 1, 3); }
                else {
                  this.airConsecutiveHits = 0;
                  this.player.applySelfDamage(20);
                  this.spawnHitFlash(this.player.x, this.player.y, 0xaaddff);
                }
              },
            };
            fireHitscan(electroCtx, 45, 0xffee44, true);
          } else {
            // Normal snipe — Click upgrade removes the 0.5s movement lock
            const noLockCtx = this.hasUpgrade('click')
              ? { ...snipeBase, lockCaster: (_d: number) => {} }
              : snipeBase;
            if (this.player.castAbility('air-snipe', noLockCtx)) {
              if (this.quickShotCharged) this.quickShotCharged = false;
            }
          }
        }

        // ── E: Quick Shot / Electro Charge (upgrade) ─────────────
        if (this.hasUpgrade('e')) {
          if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.airElectroHolding = true;
            this.airElectroHeldSince = time;
            if (this.airElectroChargeVisual) this.airElectroChargeVisual.destroy();
            this.airElectroChargeVisual = this.add.circle(this.player.x, this.player.y, 10, 0xffee44, 0.9).setDepth(8);
          }
          if (this.airElectroHolding) {
            if (this.airElectroChargeVisual) this.airElectroChargeVisual.setPosition(this.player.x, this.player.y);
            if (!this.eKey.isDown) {
              // Released early → normal quick-shot
              this.airElectroHolding = false;
              if (this.airElectroChargeVisual) { this.airElectroChargeVisual.destroy(); this.airElectroChargeVisual = null; }
              this.player.chargeRatio = 0;
              this.player.castAbility('quick-shot', playerCtx);
            } else if (time - this.airElectroHeldSince >= 1500) {
              // Fully charged
              this.airElectroHolding = false;
              this.airElectroCharged = true;
              if (this.airElectroChargeVisual) { this.airElectroChargeVisual.destroy(); this.airElectroChargeVisual = null; }
              this.airElectroChargeVisual = this.add.circle(this.player.x, this.player.y, 22, 0xffee44, 0.7).setDepth(8);
              this.tweens.add({ targets: this.airElectroChargeVisual, alpha: 0.2, yoyo: true, repeat: -1, duration: 280 });
            }
          }
          if (this.airElectroCharged && this.airElectroChargeVisual) {
            this.airElectroChargeVisual.setPosition(this.player.x, this.player.y);
          }
        } else {
          if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.player.castAbility('quick-shot', playerCtx);
          }
        }

        // ── R: Wind Trap ──────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('wind-trap', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── F: Grapple ────────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('grapple', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── Q: Charged Beam (upgrade: bounce + walk) ──────────────
        if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.airConsecutiveHits >= 3) {
          if (this.hasUpgrade('q')) {
            if (this.player.getCooldownRatio('charged-beam') >= 1) {
              this.player.triggerCooldown('charged-beam');
              this.airConsecutiveHits = 0;
              this.nukeChanneling = true;
              this.airBeamWalking = true;
              this.nukeChannelEnd = time + 1500;
              const { width: W, height: H } = this.scale;
              const capX = mouseX, capY = mouseY;
              const chargeVis = this.add.circle(this.player.x, this.player.y, 14, 0x88ccff, 0.8).setDepth(8);
              this.tweens.add({ targets: chargeVis, scaleX: 5, scaleY: 5, alpha: 0.1, duration: 1500, onComplete: () => chargeVis.destroy() });
              this.time.delayedCall(1500, () => {
                this.airBeamWalking = false;
                this.nukeChanneling = false;
                this.player.chargeRatio = 0;
                fireBounceHitscan(
                  this.buildPlayerContext(capX, capY),
                  100, 3, W, H,
                );
              });
            }
          } else {
            if (this.player.castAbility('charged-beam', this.buildPlayerContext(mouseX, mouseY))) {
              this.airConsecutiveHits = 0;
            }
          }
        }
      }
    } else if (this.elementId === 'earth') {
      if (!this.earthSlamActive && !this.earthSlamBouncing && !this.earthBullRushActive) {
        // E: Shield Up — hold to charge at 8.75 shield/s; blocks all other abilities while held
        if (this.eKey.isDown && this.player.shieldHp < 100) {
          this.player.shieldHp = Math.min(100, this.player.shieldHp + 8.75 * (delta / 1000));
        }

        if (!this.eKey.isDown) {
          // Click: stab (damage scales with speed if upgraded)
          if (pointer.isDown) {
            if (this.hasUpgrade('click')) {
              const speedScale = this.playerSpeedMult;
              const scaledCtx = { ...playerCtx, dealMeleeDamage: (range: number, dmg: number, kb = 0) => playerCtx.dealMeleeDamage(range, Math.round(dmg * speedScale), kb) };
              this.player.castAbility('stab', scaledCtx);
            } else {
              this.player.castAbility('stab', playerCtx);
            }
          }
          // R: Shield Slam
          if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.player.castAbility('shield-slam', playerCtx);
          }
          // F: Shield Break / Shield Shed (hold upgrade)
          if (this.hasUpgrade('f')) {
            if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
              this.earthShieldShedHolding = true;
              this.earthShieldShedStart = time;
              this.player.chargeRatio = 0;
            }
            if (this.earthShieldShedHolding) {
              this.player.chargeRatio = Math.min(1, (time - this.earthShieldShedStart) / 2000);
              if (!this.fKey.isDown) {
                this.earthShieldShedHolding = false;
                this.player.chargeRatio = 0;
                this.player.castAbility('shield-break', playerCtx);
              } else if (time - this.earthShieldShedStart >= 2000) {
                this.earthShieldShedHolding = false;
                this.player.chargeRatio = 0;
                const shedAmount = this.player.shieldHp;
                this.player.shieldHp = 0;
                const bonus = shedAmount * 0.03;
                this.earthShieldShedActive = true;
                this.earthShieldShedEnd = time + 6000;
                this.earthShieldShedBonus = bonus;
                if (this.earthShieldShedAura) this.earthShieldShedAura.destroy();
                this.earthShieldShedAura = this.add.circle(this.player.x, this.player.y, 32, 0xffcc44, 0.5).setDepth(6);
                this.tweens.add({ targets: this.earthShieldShedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
                this.spawnHitFlash(this.player.x, this.player.y, 0xffcc44);
              }
            }
          } else {
            if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
              this.player.castAbility('shield-break', playerCtx);
            }
          }
          // Q: Bull Rush
          if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.player.castAbility('bull-rush', playerCtx);
          }
        } // end !eKey.isDown
      }
    } else if (this.elementId === 'oil') {
      if (!this.nukeChanneling) {
        // Click: Drone Command (fire at cursor)
        if (pointer.isDown) {
          this.player.castAbility('drone-command', playerCtx);
        }
        // E: Drone Summon
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('drone-summon', playerCtx);
        }
        // R: Drone Destroy (launch drone bomb at cursor)
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('drone-destroy', this.buildPlayerContext(mouseX, mouseY));
        }
        // F: Firewall at cursor
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('firewall', this.buildPlayerContext(mouseX, mouseY));
        }
        // Q: Overdrive
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('overdrive', this.buildPlayerContext(mouseX, mouseY));
        }
      }
    } else if (this.elementId === 'shadow') {
      if (!this.nukeChanneling) {
        if (pointer.isDown) {
          this.shadowDrainHoldAccum += delta;
          if (this.shadowDrainHoldAccum >= 300) {
            // Cloud mode: spawn dark cloud every 600ms
            this.shadowDrainCloudAccum += delta;
            if (this.shadowDrainCloudAccum >= 600) {
              this.shadowDrainCloudAccum -= 600;
              this.spawnShadowDarkCloud(mouseX, mouseY, 'player');
            }
          }
        } else {
          if (this.pointerWasDown && this.shadowDrainHoldAccum < 300) {
            // Tap: launch dark bomb
            this.player.castAbility('dark-drain', this.buildPlayerContext(mouseX, mouseY));
          }
          this.shadowDrainHoldAccum = 0;
          this.shadowDrainCloudAccum = 0;
        }
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          if (this.shadowConsumeActive && this.hasUpgrade('e')) {
            // Throw NPC toward cursor — stun briefly so AI doesn't cancel velocity
            this.shadowConsumeActive = false;
            if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
            const throwAngle = Math.atan2(mouseY - this.player.y, mouseX - this.player.x);
            (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(
              Math.cos(throwAngle) * 800, Math.sin(throwAngle) * 800,
            );
            this.shadowNpcThrowUntil = Math.max(this.shadowNpcThrowUntil, this.time.now + 600);
          } else {
            this.player.castAbility('tentacle', this.buildPlayerContext(mouseX, mouseY));
          }
        }
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('snap-trap', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          if (this.hasUpgrade('f')) {
            if (this.shadowDanceCharge > 0 && this.time.now >= this.shadowDanceUpgradeCooldownUntil) {
              this.player.castAbility('shadow-dance', playerCtx);
            }
          } else if (this.shadowDanceCharge >= 35) {
            this.player.castAbility('shadow-dance', playerCtx);
          }
        }
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('black-hole', playerCtx);
        }
      }
    } else if (this.elementId === 'ice') {
      if (!this.nukeChanneling) {
        // Click — Ice Spike
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('frost-blast', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('block-up', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('skate', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('frozen-solid', playerCtx);
        }
        if (pointer.isDown) {
          this.player.castAbility('ice-spike', playerCtx);
        }
      }
    } else if (this.elementId === 'crystal') {
      if (!this.nukeChanneling) {
        if (this.hasUpgrade('click')) {
          // Click+: hold ≥200ms = shredder; quick tap = single laser (same as base)
          if (pointer.isDown && !this.pointerWasDown) {
            this.crystalClickHoldStart = time;
          }
          if (pointer.isDown && !this.crystalShredderActive && this.crystalClickHoldStart > 0 && time - this.crystalClickHoldStart >= 200) {
            this.crystalShredderActive = true;
          }
          if (!pointer.isDown && this.pointerWasDown) {
            if (this.crystalShredderActive) {
              // Exiting shredder — no extra beam
              this.crystalShredderActive = false;
              this.crystalShredderTickAccum = 0;
            } else if (this.crystalClickHoldStart > 0 && time - this.crystalClickHoldStart < 200) {
              // Quick tap — fire single beam
              this.player.castAbility('crystal-laser', playerCtx);
            }
            this.crystalClickHoldStart = -99999;
          }
        } else {
          if (pointer.isDown) {
            this.player.castAbility('crystal-laser', playerCtx);
          }
        }
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          // E+: if any moving crystals exist, halt them; otherwise place new crystal
          if (this.hasUpgrade('e') && this.crystalNodes.some((n) => n.moving)) {
            for (const n of this.crystalNodes) { n.vx = 0; n.vy = 0; n.moving = false; }
          } else {
            this.player.castAbility('crystal-place', playerCtx);
          }
        }
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('crystal-barrage', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('crystal-portal', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('crystal-trick', playerCtx);
        }
      }
    } else if (this.elementId === 'growth') {
      if (!this.nukeChanneling && !this.growthMutateMenuOpen) {
        if (pointer.isDown) {
          this.player.castAbility('growth-click', playerCtx);
        }
        // E: Mutate (press opens manual menu; E+ hold auto-picks in per-frame)
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('mutate', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          playerCtx.fireInfect(mouseX, mouseY);
        }
        // F: Bloat activate on press (F+ hold-to-lock handled in collision handler)
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          playerCtx.activateBloat();
        }
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('mutant-morph', playerCtx);
        }
      }
    } else if (this.elementId === 'soul') {
      if (time < this.soulHauntStunUntil) {
        // Stunned after exiting haunt — no input
      } else if (this.soulHauntActive) {
        // In haunt mode: release to exit (stun 1.5s)
        if (!pointer.isDown) {
          this.soulHauntActive = false;
          this.player.isInvincible = false;
          this.player.setAlpha(1);
          if (this.soulHauntVisual) { this.soulHauntVisual.destroy(); this.soulHauntVisual = null; }
          this.soulHauntStunUntil = time + 1500;
          (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          this.showFloatingText(this.player.x, this.player.y - 20, 'Stunned!', '#ccaaff');
        }
        // Dodge during haunt: ghostly explosion + scared
        // (handled in dodge section via soulHauntActive flag)
      } else {
        // Click: hold for Haunt (Click+), tap for Spirit Propel
        if (this.hasUpgrade('click')) {
          if (pointer.isDown && !this.pointerWasDown) {
            this.soulClickHoldStart = time;
          }
          if (pointer.isDown && this.soulClickHoldStart > 0 && time - this.soulClickHoldStart >= 350 && this.soulGhosts > 0) {
            // Enter haunt mode
            this.soulHauntActive = true;
            this.soulHauntDrainAccum = 0;
            this.soulClickHoldStart = -99999;
            this.player.isInvincible = true;
            this.player.setAlpha(0.15);
            if (this.soulHauntVisual) this.soulHauntVisual.destroy();
            this.soulHauntVisual = this.add.circle(this.player.x, this.player.y, 30, 0xccaaff, 0.25).setDepth(4);
            this.tweens.add({ targets: this.soulHauntVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 500 });
          } else if (!pointer.isDown && this.pointerWasDown && this.soulClickHoldStart > 0 && time - this.soulClickHoldStart < 350) {
            // Quick tap → Spirit Propel
            playerCtx.fireSoulOrb(mouseX, mouseY);
            this.soulClickHoldStart = -99999;
          } else if (!pointer.isDown) {
            this.soulClickHoldStart = -99999;
          }
        } else {
          // No upgrade: click always fires orb
          if (pointer.isDown && !this.pointerWasDown) {
            playerCtx.fireSoulOrb(mouseX, mouseY);
          }
        }

        // R: tap = Sacrifice; hold (R+ upgrade) = Drain Life
        if (this.hasUpgrade('r')) {
          if (this.rKey.isDown && !this.soulDrainHolding) {
            // R just pressed — start hold timer
            this.soulDrainHolding = true;
            this.soulDrainHoldStart = time;
            this.soulDrainLastTick = time;
            this.soulDrainExplosionDmg = 0;
          } else if (!this.rKey.isDown && this.soulDrainHolding) {
            this.soulDrainHolding = false;
            const holdMs = time - this.soulDrainHoldStart;
            if (this.soulDrainVisual) { this.soulDrainVisual.destroy(); this.soulDrainVisual = null; }
            if (holdMs < 200) {
              // Quick tap → Sacrifice (base behavior)
              playerCtx.soulSacrifice();
              this.soulDrainExplosionDmg = 0;
            } else if (this.soulDrainExplosionDmg > 0) {
              // Release explosion (charged past 5s)
              this.npc.takeDamage(this.soulDrainExplosionDmg);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x9944ff);
              const boom = this.add.circle(this.player.x, this.player.y, 10, 0x9944ff, 0.7).setDepth(9);
              this.tweens.add({ targets: boom, scaleX: 14, scaleY: 14, alpha: 0, duration: 500, onComplete: () => boom.destroy() });
              this.showFloatingText(this.player.x, this.player.y - 20, `Soul Burst! ${this.soulDrainExplosionDmg}`, '#cc66ff');
              this.soulDrainExplosionDmg = 0;
            }
          }
          // Spawn visual once we're past the tap threshold
          if (this.soulDrainHolding && !this.soulDrainVisual && time - this.soulDrainHoldStart >= 200) {
            this.soulDrainVisual = this.add.circle(this.player.x, this.player.y, 14, 0x9944ff, 0.5).setDepth(8);
            this.tweens.add({ targets: this.soulDrainVisual, scaleX: 1.4, scaleY: 1.4, alpha: 0.2, yoyo: true, repeat: -1, duration: 400 });
          }
        } else {
          if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            playerCtx.soulSacrifice();
          }
        }

        // F: Consume
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          playerCtx.soulConsume();
        }

        // Q: Undead Charge (costs 5 ghosts; Q+ always summons 2 knights for same cost)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          if (this.hasUpgrade('q') && this.soulGhosts >= 5) {
            this.soulGhosts -= 5;
            if (this.soulGhostText) this.soulGhostText.setText(`👻 ${this.soulGhosts}`);
            this.lastPlayerSummon = time;
            this.spawnSoulGhost('knight', this.player.x - 20, this.player.y, 'player');
            this.spawnSoulGhost('knight', this.player.x + 20, this.player.y, 'player');
          } else if (this.soulGhosts >= 5) {
            playerCtx.summonGhost('knight');
          }
        }

        // E: Summon — hold mechanic (E+ adds corpse/necromancer tiers)
        const eDown = this.eKey.isDown;
        if (eDown && !this.soulEHolding) {
          this.soulEHolding = true;
          this.soulEHoldStart = time;
          if (this.soulEHoldVisual) this.soulEHoldVisual.destroy();
          this.soulEHoldVisual = this.add.circle(this.player.x, this.player.y - 36, 8, 0xccaaff, 0.6).setDepth(15);
          this.tweens.add({ targets: this.soulEHoldVisual, scaleX: 1.5, scaleY: 1.5, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
        } else if (!eDown && this.soulEHolding) {
          this.soulEHolding = false;
          if (this.soulEHoldVisual) { this.soulEHoldVisual.destroy(); this.soulEHoldVisual = null; }
          const holdMs = time - this.soulEHoldStart;
          const hasEUpgrade = this.hasUpgrade('e');
          // Determine tier by hold duration
          if (holdMs < 200) {
            // Quick tap: basic ghost, costs 1 ghost
            playerCtx.summonGhost('basic');
          } else if (hasEUpgrade && holdMs >= 5000 && this.soulGhosts >= 5) {
            playerCtx.summonGhost('necromancer');
          } else if (hasEUpgrade && holdMs >= 4000 && this.soulGhosts >= 4) {
            playerCtx.summonGhost('corpse');
          } else if (holdMs >= 2000 && this.soulGhosts >= 3) {
            playerCtx.summonGhost('banshee');
          } else if (holdMs >= 1000 && this.soulGhosts >= 2) {
            playerCtx.summonGhost('ghoul');
          } else {
            playerCtx.summonGhost('basic');
          }
        }
      }
    } else if (this.elementId === 'hunt') {
      if (!this.huntBeastForm && !this.huntVampireForm) {
        // ── Normal form ──────────────────────────────────────────
        // Click: Shotgun (Click+ = double shot, 900ms CD)
        if (pointer.isDown && !this.pointerWasDown) {
          if (this.player.castAbility('hunt-shotgun', playerCtx)) {
            if (this.hasUpgrade('click')) {
              // Second shot immediately
              const ab = this.playerElement.abilities.find((a) => a.id === 'hunt-shotgun')!;
              ab.cast(playerCtx);
              // Extend CD from 500ms to 900ms (add 400ms)
              this.player.reduceCooldown('hunt-shotgun', -400);
              this.showFloatingText(this.player.x, this.player.y - 30, '×2!', '#ff8800');
            }
          }
        }
        // E: Grenade hold mechanic (E+ = 1.5s fuse)
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          if (this.player.getCooldownRatio('hunt-grenade') >= 1) {
            this.player.triggerCooldown('hunt-grenade');
            this.huntGrenadeHoldStart = time;
            this.huntGrenadeHolding = true;
            if (this.huntGrenadeVisual) this.huntGrenadeVisual.destroy();
            const isHealNow = this.hasUpgrade('f') && this.huntBloodPactActive && time < this.huntBloodPactEnd;
            this.huntGrenadeVisual = this.add.circle(this.player.x, this.player.y, 10, isHealNow ? 0x44cc44 : 0xff6600, 0.9).setDepth(12);
          }
        }
        const maxFuse = this.hasUpgrade('e') ? 1500 : 3000;
        if (!this.eKey.isDown && this.huntGrenadeHolding) {
          const holdMs = time - this.huntGrenadeHoldStart;
          if (holdMs < maxFuse) {
            playerCtx.huntThrowGrenade(mouseX, mouseY, holdMs);
          }
          this.huntGrenadeHolding = false;
          if (this.huntGrenadeVisual) { this.huntGrenadeVisual.destroy(); this.huntGrenadeVisual = null; }
        }
        // R: Hunter's Trail (R+ 2nd press = freeze existing circles, no new ones)
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          if (this.hasUpgrade('r') && this.huntTrailActive && !this.huntPermTrailActive) {
            // Stop spawning new circles; freeze existing ones so they never expire
            this.huntPermTrailActive = true;
            this.huntTrailActive = false;
            for (const c of this.huntTrailCircles) c.expiresAt = Infinity;
            this.showFloatingText(this.player.x, this.player.y - 30, '🐾 Frozen!', '#ff6600');
          } else if (this.hasUpgrade('r') && this.huntPermTrailActive) {
            // Press again to clear all frozen circles
            this.huntPermTrailActive = false;
            for (const c of this.huntTrailCircles) c.sprite.destroy();
            this.huntTrailCircles = [];
            this.showFloatingText(this.player.x, this.player.y - 30, 'Trail cleared', '#cc3300');
          } else {
            this.player.castAbility('hunt-trail', playerCtx);
          }
        }
        // F: Blood Pact
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('hunt-blood-pact', playerCtx);
        }
        // Q: Transform (Q+ = Vampire, else Beast)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('hunt-transform', playerCtx);
        }
      } else if (this.huntBeastForm) {
        // ── Beast form ───────────────────────────────────────────
        // Click: Slash (Click+ = +50% dmg to bleeding)
        if (pointer.isDown && !this.pointerWasDown) {
          this.player.castAbility('hunt-slash', playerCtx);
        }
        // E: Explosive Leap (E+ = teleport at 1s)
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('hunt-leap', playerCtx);
        }
        // R: Blood Hunt (R+ = confuse 3s)
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          if (this.npcBleeding) this.player.castAbility('hunt-blood-hunt', playerCtx);
        }
        // F: Blood Moon (F+ = 50% lifesteal)
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('hunt-blood-moon', playerCtx);
        }
        // Q: Untransform
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('hunt-untransform', playerCtx);
        }
      } else {
        // ── Vampire form (Q+ upgrade) ────────────────────────────
        // Click: Stake
        if (pointer.isDown && !this.pointerWasDown) {
          this.player.castAbility('hunt-vampire-stake', playerCtx);
        }
        // E: Garlic Trap
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('hunt-garlic-trap', playerCtx);
        }
        // R: Bat Form (R+ = 6s, cancelable)
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          if (this.huntBatFormActive && this.hasUpgrade('r')) {
            // Cancel bat form
            this.huntBatFormActive = false;
            this.player.setScale(1.0);
            this.player.incomingDamageMultiplier = 0.65; // restore vampire DR
            (this.player.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
          } else if (!this.huntBatFormActive) {
            this.player.castAbility('hunt-bat-form', playerCtx);
          }
        }
        // F: Vampire Drain
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('hunt-vampire-drain', playerCtx);
        }
        // Q: Untransform
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('hunt-vampire-untransform', playerCtx);
        }
      }
    } else if (this.elementId === 'sand') {
      // Click: Barrage (hold to fire, accelerates over 3s; 5s with Overdrive upgrade)
      if (pointer.isDown) {
        if (!this.timeBarrageActive) {
          this.timeBarrageActive = true;
          this.timeBarrageStart = time;
          this.timeBarrageAccum = 0;
          this.timeBarrageOverheatTriggered = false;
        }
        const barrageElapsed = (time - this.timeBarrageStart) / 1000;
        const rampDuration = this.hasUpgrade('click') ? 5 : 3;
        const interval = Math.max(60, 200 - 140 * Math.min(1, barrageElapsed / rampDuration));
        this.timeBarrageAccum += delta;
        while (this.timeBarrageAccum >= interval) {
          this.timeBarrageAccum -= interval;
          const dx = mouseX - this.player.x, dy = mouseY - this.player.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const baseSpeed = 300 + 350 * Math.min(1, barrageElapsed / rampDuration);
          const speed = baseSpeed * (this.timeHaltActive && !this.timeHaltZoomMode ? 2 : 1);
          const spread = (Math.random() - 0.5) * 0.28;
          const cos = Math.cos(spread), sn = Math.sin(spread);
          const vx = (dx / len * cos - dy / len * sn) * speed;
          const vy = (dx / len * sn + dy / len * cos) * speed;
          const shardDmg = this.timeHaltActive && !this.timeHaltZoomMode ? 2 : 1;
          const shard = new Projectile(this, this.player.x, this.player.y, 'proj-time-shard', shardDmg, true);
          this.projectiles.add(shard);
          shard.launch(vx, vy);
        }
        // Overdrive overheat: trigger after 5s of continuous barrage
        if (this.hasUpgrade('click') && barrageElapsed >= 5 && !this.timeBarrageOverheatTriggered) {
          this.timeBarrageOverheatTriggered = true;
          this.timeBarrageActive = false;
          // AOE explosion — damages self AND nearby enemy
          const ohRing = this.add.circle(this.player.x, this.player.y, 12, 0xff8822, 0.9).setDepth(11);
          this.tweens.add({ targets: ohRing, scaleX: 7, scaleY: 7, alpha: 0, duration: 450, onComplete: () => ohRing.destroy() });
          this.player.takeDamage(20);
          this.spawnHitFlash(this.player.x, this.player.y, 0xff8822);
          const ohDistToNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (ohDistToNpc <= 84) {
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xff8822);
          }
          // Set self on fire (reuse npc burn pattern but on player)
          this.playerBurningUntil = Math.max(this.playerBurningUntil, time + 4000);
        }
      } else {
        this.timeBarrageActive = false;
      }
      // E/R/F/Q blocked while barrage is held (unless Glass Mode)
      const barrageBlocked = this.timeBarrageActive && !this.timeGlassMode;
      if (!barrageBlocked) {
        // E: Time Warp (or trigger Delayed Warp if saved pos exists)
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          if (this.hasUpgrade('e') && this.timeWarpSavedPos) {
            // Trigger the drag to saved position
            this.timeWarpTriggerPending = true;
          } else {
            this.player.castAbility('time-warp', playerCtx);
          }
        }
        // R: Remain (or Glass Mode toggle with upgrade)
        if (this.hasUpgrade('r')) {
          if (this.rKey.isDown && !this.timeGlassHolding) {
            this.timeGlassHolding = true;
            this.timeGlassHoldStart = time;
            if (!this.timeGlassChargeCircle) {
              this.timeGlassChargeCircle = this.add.circle(this.player.x, this.player.y, 36, 0xffffff, 0.12)
                .setStrokeStyle(2, 0xaaaaff, 0.7).setDepth(12);
              this.tweens.add({ targets: this.timeGlassChargeCircle, scaleX: 1.2, scaleY: 1.2, alpha: 0.3, yoyo: true, repeat: -1, duration: 200 });
            }
            if (!this.timeGlassChargeText) {
              this.timeGlassChargeText = this.add.text(this.player.x, this.player.y - 52, 'Charging 0%', { fontSize: '11px', color: '#aaaaff' }).setOrigin(0.5).setDepth(13);
            }
          }
          if (this.timeGlassHolding && this.timeGlassChargeCircle && this.timeGlassChargeText) {
            const chargePct = Math.min(100, Math.round((time - this.timeGlassHoldStart) / 3000 * 100));
            this.timeGlassChargeText.setText(`Charging ${chargePct}%`).setPosition(this.player.x, this.player.y - 52);
            this.timeGlassChargeCircle.setPosition(this.player.x, this.player.y);
          }
          if (!this.rKey.isDown && this.timeGlassHolding) {
            this.timeGlassHolding = false;
            if (this.timeGlassChargeCircle) { this.timeGlassChargeCircle.destroy(); this.timeGlassChargeCircle = null; }
            if (this.timeGlassChargeText) { this.timeGlassChargeText.destroy(); this.timeGlassChargeText = null; }
            const heldMs = time - this.timeGlassHoldStart;
            if (heldMs >= 3000) {
              // Toggle glass mode
              this.timeGlassMode = !this.timeGlassMode;
              if (this.timeGlassMode) {
                if (this.timeGlassModeAura) this.timeGlassModeAura.destroy();
                this.timeGlassModeAura = this.add.circle(this.player.x, this.player.y, 32, 0xffffff, 0.15)
                  .setStrokeStyle(2, 0xffffff, 0.6).setDepth(4);
                this.tweens.add({ targets: this.timeGlassModeAura, alpha: 0.35, yoyo: true, repeat: -1, duration: 300 });
                this.showFloatingText(this.player.x, this.player.y - 36, 'GLASS MODE', '#ffffff');
              } else {
                if (this.timeGlassModeAura) { this.timeGlassModeAura.destroy(); this.timeGlassModeAura = null; }
                this.showFloatingText(this.player.x, this.player.y - 36, 'Glass Off', '#888888');
              }
            } else {
              // Short press → normal Remain
              this.player.castAbility('time-remain', playerCtx);
            }
          }
        } else {
          if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.player.castAbility('time-remain', playerCtx);
          }
        }
        // F: Halt (or zoom toggle)
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          if (this.hasUpgrade('f') && this.timeHaltActive) {
            // Toggle zoom mode
            this.timeHaltZoomMode = !this.timeHaltZoomMode;
            const modeLabel = this.timeHaltZoomMode ? 'ZOOM MODE' : 'HALT MODE';
            const modeColor = this.timeHaltZoomMode ? '#44aaff' : '#ffdd44';
            if (this.timeHaltAura) {
              this.timeHaltAura.setStrokeStyle(2, this.timeHaltZoomMode ? 0x44aaff : 0xffdd44, 0.5);
            }
            this.showFloatingText(this.player.x, this.player.y - 36, modeLabel, modeColor);
          } else {
            this.player.castAbility('time-halt', playerCtx);
          }
        }
        // Q: Timeless (charge-gated, no CD)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          playerCtx.timeTimeless();
        }
      }
    } else if (this.elementId === 'gravity') {
      // ── GRAVITY INPUT ─────────────────────────────────────────────

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
          const maxShadows = this.hasUpgrade('e') ? 10 : 5;
          const frozenCount = this.gravMeteorShadows.filter(s => s.frozen && s.owner === 'player').length;
          if (frozenCount < maxShadows) {
            this.spawnGravMeteorShadow(mouseX, mouseY, 'player', true);
            this.gravMeteorRainLiveCount++;
          }
        } else if (this.gravBombHolding && this.hasUpgrade('f')) {
          // F+ Meteor Rush: click inside grav bomb radius spawns a rush shadow
          const distToBomb = Math.hypot(mouseX - this.gravBombLastX, mouseY - this.gravBombLastY);
          if (distToBomb <= 120 && dragDist < DRAG_THRESHOLD) {
            const W = this.scale.width, H = this.scale.height;
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
            const rushRect = this.add.rectangle(shadowCx, shadowCy, rw, rh, 0x221144, 0.55)
              .setStrokeStyle(2, 0x8844cc, 0.7).setDepth(5);
            this.tweens.add({ targets: rushRect, alpha: 0.2, yoyo: true, repeat: 2, duration: 250 });
            this.gravMeteorRushShadows.push({ rect: rushRect, fireAt: time + 1500, clickX: mouseX, clickY: mouseY, edge });
          } else if (this.player.getCooldownRatio('space-slash') >= 1 && dragDist >= DRAG_THRESHOLD) {
            playerCtx.gravitySlash(this.gravPointerDownX, this.gravPointerDownY, mouseX, mouseY);
            this.player.triggerCooldown('space-slash');
          }
        } else if (this.player.getCooldownRatio('space-slash') >= 1) {
          if (dragDist >= DRAG_THRESHOLD) {
            // Space Slash
            playerCtx.gravitySlash(this.gravPointerDownX, this.gravPointerDownY, mouseX, mouseY);
            this.player.triggerCooldown('space-slash');
          } else {
            // Single tap meteor
            playerCtx.gravityMeteorShadow(mouseX, mouseY);
            this.player.triggerCooldown('space-slash');
          }
        }
      }

      // Meteor Storm (Click+): auto-spawn shadows near cursor while holding
      if (pointer.isDown && this.hasUpgrade('click')) {
        this.gravMeteorStormAccum += delta;
        while (this.gravMeteorStormAccum >= 1000) {
          this.gravMeteorStormAccum -= 1000;
          const ox = (Math.random() - 0.5) * 100;
          const oy = (Math.random() - 0.5) * 100;
          this.spawnGravMeteorShadow(mouseX + ox, mouseY + oy, 'player', false);
        }
      } else {
        this.gravMeteorStormAccum = 0;
      }

      // E: Meteor Rain — hold to record, tap to replay
      if (this.eKey.isDown && !this.gravEKeyWasDown) {
        // Rising edge: start recording session (E+ allows up to 10 shadows)
        this.gravEKeyHeldSince = time;
        this.gravMeteorRainHolding = true;
        this.gravMeteorRainLiveCount = 0;
        if (this.gravMeteorRainAura) this.gravMeteorRainAura.destroy();
        this.gravMeteorRainAura = this.add.circle(this.player.x, this.player.y, 30, 0x8844cc, 0.35).setDepth(4);
        this.tweens.add({ targets: this.gravMeteorRainAura, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });
      }
      if (this.gravMeteorRainHolding && this.gravMeteorRainAura) {
        this.gravMeteorRainAura.setPosition(this.player.x, this.player.y);
      }
      if (!this.eKey.isDown && this.gravEKeyWasDown) {
        // Falling edge
        const heldMs = time - this.gravEKeyHeldSince;
        if (this.gravMeteorRainAura) { this.gravMeteorRainAura.destroy(); this.gravMeteorRainAura = null; }

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
          if (this.player.getCooldownRatio('meteor-rain') >= 1 && this.gravMeteorRainRecorded.length > 0) {
            for (const pos of this.gravMeteorRainRecorded) {
              this.spawnGravMeteorShadow(pos.x, pos.y, 'player', false);
            }
            this.player.triggerCooldown('meteor-rain');
          }
        }
        this.gravMeteorRainHolding = false;
        this.gravMeteorRainLiveCount = 0;
      }
      this.gravEKeyWasDown = this.eKey.isDown;

      // R: Space Slam
      if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
        this.player.castAbility('space-slam', playerCtx);
      }

      // F: Grav Bomb — tap / short-hold = snap; hold ≥2s + release = explosion
      if (this.fKey.isDown) {
        if (!this.gravBombHolding && this.player.getCooldownRatio('grav-bomb') >= 1) {
          this.gravBombHolding = true;
          this.gravBombHoldStart = time;
          this.gravBombLastX = mouseX;
          this.gravBombLastY = mouseY;
          if (this.gravBombVisual) this.gravBombVisual.destroy();
          this.gravBombVisual = this.add.circle(mouseX, mouseY, 120, 0x8844cc, 0.18)
            .setStrokeStyle(2, 0xaa66ff, 0.6).setDepth(4);
        }
        if (this.gravBombHolding) {
          this.gravBombLastX = mouseX;
          this.gravBombLastY = mouseY;
          if (this.gravBombVisual) this.gravBombVisual.setPosition(mouseX, mouseY);
          this.player.chargeRatio = Math.min(1, (time - this.gravBombHoldStart) / 2000);
        }
      } else if (this.gravBombHolding) {
        // Released
        const heldMs = time - this.gravBombHoldStart;
        this.gravBombHolding = false;
        this.player.chargeRatio = 0;
        if (this.gravBombVisual) { this.gravBombVisual.destroy(); this.gravBombVisual = null; }
        const mx = this.gravBombLastX;
        const my = this.gravBombLastY;
        if (heldMs >= 2000) {
          // Charged explosion
          if (Phaser.Math.Distance.Between(mx, my, this.npc.x, this.npc.y) <= 100) {
            this.npc.takeDamage(40);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0x8844cc);
          }
          const exRing = this.add.circle(mx, my, 10, 0x8844cc, 0.9).setDepth(6);
          this.tweens.add({ targets: exRing, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => exRing.destroy() });
          const exCore = this.add.circle(mx, my, 6, 0xffffff, 0.95).setDepth(7);
          this.tweens.add({ targets: exCore, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => exCore.destroy() });
        } else {
          // Tap snap
          playerCtx.gravityGravBombSnap(mx, my);
        }
        this.player.triggerCooldown('grav-bomb');
      }

      // Q: Lunar Landing (or Moon Rider with Q+)
      if (this.hasUpgrade('q')) {
        if (this.qKey.isDown && !this.gravQWasDown && !this.gravMoonActive) {
          this.gravMoonHolding = true;
          this.gravMoonHoldStart = time;
          if (!this.gravMoonChargeCircle) {
            this.gravMoonChargeCircle = this.add.circle(this.player.x, this.player.y + 32, 28, 0xccbbee, 0.18)
              .setStrokeStyle(2, 0xccbbee, 0.6).setDepth(12);
            this.tweens.add({ targets: this.gravMoonChargeCircle, scaleX: 1.3, scaleY: 1.3, alpha: 0.4, yoyo: true, repeat: -1, duration: 250 });
          }
          if (!this.gravMoonChargeText) {
            this.gravMoonChargeText = this.add.text(this.player.x, this.player.y - 50, 'Mounting 0%', { fontSize: '11px', color: '#ccbbee' }).setOrigin(0.5).setDepth(13);
          }
        }
        if (this.gravMoonHolding && this.gravMoonChargeCircle && this.gravMoonChargeText) {
          const mountPct = Math.min(100, Math.round((time - this.gravMoonHoldStart) / 3000 * 100));
          this.gravMoonChargeText.setText(`Mounting ${mountPct}%`).setPosition(this.player.x, this.player.y - 50);
          this.gravMoonChargeCircle.setPosition(this.player.x, this.player.y + 32);
        }
        if (!this.qKey.isDown && this.gravQWasDown) {
          if (this.gravMoonChargeCircle) { this.gravMoonChargeCircle.destroy(); this.gravMoonChargeCircle = null; }
          if (this.gravMoonChargeText) { this.gravMoonChargeText.destroy(); this.gravMoonChargeText = null; }
          if (this.gravMoonHolding) {
            this.gravMoonHolding = false;
            const heldMs = time - this.gravMoonHoldStart;
            if (heldMs >= 3000 && this.player.getCooldownRatio('lunar-landing') >= 1 && !this.gravMoonActive) {
              // Mount the moon
              this.gravMoonActive = true;
              this.gravMoonHp = 100;
              const moonR = 24; // 50% bigger than player (~16px)
              if (this.gravMoonHpBg) this.gravMoonHpBg.destroy();
              if (this.gravMoonHpBar) this.gravMoonHpBar.destroy();
              if (this.gravMoonSprite) this.gravMoonSprite.destroy();
              this.gravMoonSprite = this.add.circle(this.player.x, this.player.y + moonR + 8, moonR, 0xccbbee, 0.85)
                .setStrokeStyle(3, 0xffffff, 0.5).setDepth(3);
              this.gravMoonHpBg = this.add.rectangle(this.player.x, this.player.y + moonR * 2 + 16, 40, 4, 0x333333).setDepth(9);
              this.gravMoonHpBar = this.add.rectangle(this.player.x - 20, this.player.y + moonR * 2 + 16, 40, 4, 0xccbbee).setDepth(10).setOrigin(0, 0.5);
              this.player.triggerCooldown('lunar-landing');
              this.showFloatingText(this.player.x, this.player.y - 30, '🌕 Moon Rider!', '#ccbbee');
            } else {
              // Short press: regular lunar landing
              if (this.player.getCooldownRatio('lunar-landing') >= 1) {
                this.player.castAbility('lunar-landing', playerCtx);
              }
            }
          }
        }
        this.gravQWasDown = this.qKey.isDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('lunar-landing', playerCtx);
        }
      }
    } else if (this.elementId === 'creation') {
      // ── CREATION INPUT ────────────────────────────────────────────

      if (!this.creatBuildMode) {
      // Click — Dagger Spray: hold to add more daggers (up to 5), release to fire
      if (pointer.isDown && !this.creatDaggerHolding) {
        if (this.player.getCooldownRatio('dagger-spray') >= 1) {
          this.creatDaggerHolding = true;
          this.creatDaggerHoldStart = time;
          this.creatDaggerHoldX = this.player.x;
          this.creatDaggerHoldY = this.player.y;
        }
      }
      if (this.creatDaggerHolding) {
        const count = Math.min(5, 1 + Math.floor((time - this.creatDaggerHoldStart) / 600));
        // Redraw preview lines
        while (this.creatDaggerPreviews.length < count) {
          this.creatDaggerPreviews.push(this.add.line(0, 0, 0, 0, 0, 0, 0xeeeeff, 0.35).setOrigin(0, 0).setDepth(5));
        }
        while (this.creatDaggerPreviews.length > count) {
          this.creatDaggerPreviews.pop()!.destroy();
        }
        const dx = mouseX - this.creatDaggerHoldX;
        const dy = mouseY - this.creatDaggerHoldY;
        const len = Math.hypot(dx, dy) || 1;
        const perp = { x: -dy / len, y: dx / len };
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * 10;
          const ox = this.player.x + perp.x * offset;
          const oy = this.player.y + perp.y * offset;
          this.creatDaggerPreviews[i].setTo(ox, oy, mouseX + perp.x * offset, mouseY + perp.y * offset);
        }
      }
      if (!pointer.isDown && this.creatDaggerHolding) {
        this.creatDaggerHolding = false;
        const count = Math.min(5, 1 + Math.floor((time - this.creatDaggerHoldStart) / 600));
        for (const l of this.creatDaggerPreviews) l.destroy();
        this.creatDaggerPreviews = [];
        playerCtx.creationDaggerSpray(mouseX, mouseY, count);
        this.player.triggerCooldown('dagger-spray');
      }

      // E — Charged Bolt: hold to charge tier
      if (this.eKey.isDown && !this.creatBoltHolding) {
        if (this.player.getCooldownRatio('charged-bolt') >= 1) {
          this.creatBoltHolding = true;
          this.creatBoltHoldStart = time;
          if (this.creatBoltChargeOrb) this.creatBoltChargeOrb.destroy();
          this.creatBoltChargeOrb = this.add.circle(this.player.x, this.player.y - 38, 8, 0xcc6622, 0.9).setDepth(15);
          this.tweens.add({ targets: this.creatBoltChargeOrb, scaleX: 1.4, scaleY: 1.4, alpha: 0.5, yoyo: true, repeat: -1, duration: 250 });
        }
      }
      if (this.creatBoltHolding && this.creatBoltChargeOrb) {
        // Update orb color by charge
        const held = time - this.creatBoltHoldStart;
        const electroThresh = 3000; // 2s past gold (gold at 1000ms)
        if (this.hasUpgrade('e') && held >= electroThresh) {
          this.creatBoltElectroMode = true;
          this.creatBoltChargeOrb.setFillStyle(0x44ddff, 0.9);
        } else {
          const tierColor = held >= 1000 ? 0xffdd22 : held >= 500 ? 0xccccdd : 0xcc6622;
          this.creatBoltChargeOrb.setFillStyle(tierColor, 0.9);
        }
        this.creatBoltChargeOrb.setPosition(this.player.x, this.player.y - 38);
      }
      if (!this.eKey.isDown && this.creatBoltHolding) {
        this.creatBoltHolding = false;
        if (this.creatBoltChargeOrb) { this.creatBoltChargeOrb.destroy(); this.creatBoltChargeOrb = null; }
        const held = time - this.creatBoltHoldStart;
        if (this.creatBoltElectroMode && this.creatLastCraftKey) {
          // E+ Electro Bolt: re-craft last recipe
          this.creatBoltElectroMode = false;
          const flash = this.add.circle(this.player.x, this.player.y, 40, 0x44ddff, 0.7).setDepth(15);
          this.tweens.add({ targets: flash, scaleX: 3, scaleY: 3, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
          this.showFloatingText(this.player.x, this.player.y - 40, 'ELECTRO!', '#44ddff');
          this.resolveCrucibleCraft(time, this.creatLastCraftKey, 'player');
          this.player.triggerCooldown('charged-bolt');
        } else {
          this.creatBoltElectroMode = false;
          const tier: 'copper' | 'silver' | 'gold' = held >= 1000 ? 'gold' : held >= 500 ? 'silver' : 'copper';
          playerCtx.creationBolt(mouseX, mouseY, tier);
          this.player.triggerCooldown('charged-bolt');
        }
      }

      // R — Scythe of Doom (or Mech Constructor with R+ upgrade)
      if (this.hasUpgrade('r')) {
        if (this.rKey.isDown && !this.creatMechHolding) {
          this.creatMechHolding = true;
          this.creatMechHoldStart = time;
          if (this.creatMechStageVisual) this.creatMechStageVisual.destroy();
          this.creatMechStageVisual = this.add.text(this.player.x, this.player.y - 55, 'Building... 0%', { fontSize: '12px', color: '#bb88ee' }).setOrigin(0.5).setDepth(15);
        }
        if (this.creatMechHolding && this.creatMechStageVisual) {
          const mechHeld = time - this.creatMechHoldStart;
          // Show which stage is being built (1 during 0-3s, 2 during 3-6s, 3 during 6-9s)
          const buildingStage = Math.min(3, Math.floor(mechHeld / 3000) + 1);
          const stagePct = Math.min(100, Math.round((mechHeld % 3000) / 3000 * 100));
          const stageColor = buildingStage === 3 ? '#9966ff' : buildingStage === 2 ? '#cc88ff' : '#bb88ee';
          this.creatMechStageVisual.setStyle({ color: stageColor }).setText(`Stage ${buildingStage} ${stagePct}%`).setPosition(this.player.x, this.player.y - 55);
          // Auto-activate at 9s (stage 3 complete)
          if (mechHeld >= 9000) {
            this.creatMechHolding = false;
            if (this.creatMechStageVisual) {
              const sv = this.creatMechStageVisual;
              sv.setStyle({ color: '#ffdd44' }).setText('FINISHED!');
              this.time.delayedCall(900, () => { if (sv.active) sv.destroy(); });
              this.creatMechStageVisual = null;
            }
            this.spawnCreationMech(3);
          }
        }
        if (!this.rKey.isDown && this.creatMechHolding) {
          this.creatMechHolding = false;
          if (this.creatMechStageVisual) { this.creatMechStageVisual.destroy(); this.creatMechStageVisual = null; }
          const mechHeld = time - this.creatMechHoldStart;
          // Stage is determined by full 3s periods completed
          const stage = Math.min(3, Math.floor(mechHeld / 3000)) as 0 | 1 | 2 | 3;
          if (stage >= 1) {
            this.spawnCreationMech(stage as 1 | 2 | 3);
          } else {
            // Short press: normal scythe
            this.player.castAbility('scythe-of-doom', playerCtx);
          }
        }
        // Mech explosive dodge (stage 2+): space bar when mech is active
        if (this.creatMech && this.creatMech.stage >= 2 && Phaser.Input.Keyboard.JustDown(this.spaceKey) && time >= this.creatMech.dodgeCdUntil) {
          this.creatMech.dodgeCdUntil = time + 3000;
          const exRing = this.add.circle(this.player.x, this.player.y, 10, 0xbb88ee, 0.8).setDepth(9);
          this.tweens.add({ targets: exRing, scaleX: 6, scaleY: 6, alpha: 0, duration: 350, onComplete: () => exRing.destroy() });
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 80) {
            this.npc.takeDamage(15);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xbb88ee);
          }
          this.showFloatingText(this.player.x, this.player.y - 40, 'MECH DODGE', '#bb88ee');
        }
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('scythe-of-doom', playerCtx);
        }
      }
      } // end !creatBuildMode

      if (this.hasUpgrade('f') && this.creatBuildMode) {
        // ── Build Mode ──────────────────────────────────────────────
        // Click: create/drag blocks, speed pads, spiked blocks
        if (pointer.isDown && !this.creatBuildBlockDragging && !this.creatBuildSpeedPadDragging && !this.creatBuildSpikedDragging && !this.pointerWasDown) {
          // Check existing blocks first, then speed pads, then spiked blocks
          let foundBlock: CreationBlocker | null = null;
          for (const b of this.creatBlockers) {
            if (b.owner === 'player' && Math.abs(mouseX - b.x) <= b.w / 2 + 5 && Math.abs(mouseY - b.y) <= b.h / 2 + 5) {
              foundBlock = b; break;
            }
          }
          let foundSpeedPad: CreationSpeedPad | null = null;
          if (!foundBlock) {
            for (const b of this.creatSpeedPads) {
              if (b.owner === 'player' && Math.abs(mouseX - b.x) <= b.w / 2 + 5 && Math.abs(mouseY - b.y) <= b.h / 2 + 5) {
                foundSpeedPad = b; break;
              }
            }
          }
          let foundSpiked: CreationSpikedBlock | null = null;
          if (!foundBlock && !foundSpeedPad) {
            for (const b of this.creatSpikedBlocks) {
              if (b.owner === 'player' && Math.abs(mouseX - b.x) <= b.w / 2 + 5 && Math.abs(mouseY - b.y) <= b.h / 2 + 5) {
                foundSpiked = b; break;
              }
            }
          }
          if (foundBlock) {
            this.creatBuildBlockDragging = true;
            this.creatBuildBlockDragStartX = mouseX - foundBlock.x;
            this.creatBuildBlockDragStartY = mouseY - foundBlock.y;
            this.creatBuildBlockPreview = foundBlock;
          } else if (foundSpeedPad) {
            this.creatBuildSpeedPadDragging = true;
            this.creatBuildSpeedPadDragStartX = mouseX - foundSpeedPad.x;
            this.creatBuildSpeedPadDragStartY = mouseY - foundSpeedPad.y;
            this.creatBuildSpeedPadDragRef = foundSpeedPad;
          } else if (foundSpiked) {
            this.creatBuildSpikedDragging = true;
            this.creatBuildSpikedDragStartX = mouseX - foundSpiked.x;
            this.creatBuildSpikedDragStartY = mouseY - foundSpiked.y;
            this.creatBuildSpikedDragRef = foundSpiked;
          } else if (time >= this.creatBuildNewBlockCdUntil) {
            // New block creation (gated by 2s cooldown)
            this.creatBuildBlockDragging = true;
            this.creatBuildBlockDragStartX = mouseX;
            this.creatBuildBlockDragStartY = mouseY;
            this.creatBuildBlockPreview = null; // null = creating new
            if (this.creatBuildNewBlockPreview) this.creatBuildNewBlockPreview.destroy();
            this.creatBuildNewBlockPreview = this.add.rectangle(mouseX, mouseY, 0, 0, 0xcc8844, 0.3)
              .setStrokeStyle(2, 0xff9955, 0.8).setDepth(5);
          }
        }
        // Dragging existing block
        if (pointer.isDown && this.creatBuildBlockDragging) {
          if (this.creatBuildBlockPreview) {
            const nx = mouseX - this.creatBuildBlockDragStartX;
            const ny = mouseY - this.creatBuildBlockDragStartY;
            this.creatBuildBlockPreview.x = nx; this.creatBuildBlockPreview.y = ny;
            this.creatBuildBlockPreview.rect.setPosition(nx, ny);
            this.creatBuildBlockPreview.hpBar.setPosition(nx - this.creatBuildBlockPreview.w / 2, ny - this.creatBuildBlockPreview.h / 2 - 8);
            this.creatBuildBlockPreview.hpBg.setPosition(nx, ny - this.creatBuildBlockPreview.h / 2 - 8);
          } else if (this.creatBuildNewBlockPreview) {
            // Creating new block: update preview size
            const rw = Math.min(200, Math.abs(mouseX - this.creatBuildBlockDragStartX));
            const rh = Math.min(200, Math.abs(mouseY - this.creatBuildBlockDragStartY));
            const rx = this.creatBuildBlockDragStartX + (mouseX > this.creatBuildBlockDragStartX ? 1 : -1) * rw / 2;
            const ry = this.creatBuildBlockDragStartY + (mouseY > this.creatBuildBlockDragStartY ? 1 : -1) * rh / 2;
            this.creatBuildNewBlockPreview.setPosition(rx, ry).setSize(rw, rh);
          }
        }
        // Dragging speed pad
        if (pointer.isDown && this.creatBuildSpeedPadDragging && this.creatBuildSpeedPadDragRef) {
          const sp = this.creatBuildSpeedPadDragRef;
          const nx = mouseX - this.creatBuildSpeedPadDragStartX;
          const ny = mouseY - this.creatBuildSpeedPadDragStartY;
          sp.x = nx; sp.y = ny;
          sp.rect.setPosition(nx, ny);
          sp.hpBar.setPosition(nx - sp.w / 2, ny - sp.h / 2 - 6);
          sp.hpBg.setPosition(nx, ny - sp.h / 2 - 6);
        }
        // Dragging spiked block
        if (pointer.isDown && this.creatBuildSpikedDragging && this.creatBuildSpikedDragRef) {
          const sb = this.creatBuildSpikedDragRef;
          const nx = mouseX - this.creatBuildSpikedDragStartX;
          const ny = mouseY - this.creatBuildSpikedDragStartY;
          sb.x = nx; sb.y = ny;
          sb.rect.setPosition(nx, ny);
          sb.hpBar.setPosition(nx - sb.w / 2, ny - sb.h / 2 - 6);
          sb.hpBg.setPosition(nx, ny - sb.h / 2 - 6);
        }
        if (!pointer.isDown && this.creatBuildBlockDragging) {
          this.creatBuildBlockDragging = false;
          if (!this.creatBuildBlockPreview) {
            // Create new block
            const rw = Math.min(200, Math.abs(mouseX - this.creatBuildBlockDragStartX));
            const rh = Math.min(200, Math.abs(mouseY - this.creatBuildBlockDragStartY));
            if (this.creatBuildNewBlockPreview) { this.creatBuildNewBlockPreview.destroy(); this.creatBuildNewBlockPreview = null; }
            if (rw >= 12 && rh >= 12) {
              const rx = this.creatBuildBlockDragStartX + (mouseX > this.creatBuildBlockDragStartX ? 1 : -1) * rw / 2;
              const ry = this.creatBuildBlockDragStartY + (mouseY > this.creatBuildBlockDragStartY ? 1 : -1) * rh / 2;
              playerCtx.creationBlock(rx, ry, rw, rh);
              this.creatBuildNewBlockCdUntil = time + 2000;
            }
          }
          this.creatBuildBlockPreview = null;
        }
        if (!pointer.isDown && this.creatBuildSpeedPadDragging) {
          this.creatBuildSpeedPadDragging = false;
          this.creatBuildSpeedPadDragRef = null;
        }
        if (!pointer.isDown && this.creatBuildSpikedDragging) {
          this.creatBuildSpikedDragging = false;
          this.creatBuildSpikedDragRef = null;
        }
        // E — Launch all player blocks toward cursor
        if (Phaser.Input.Keyboard.JustDown(this.eKey) && time >= this.creatBuildLaunchCdUntil) {
          this.creatBuildLaunchCdUntil = time + 5000;
          // Show arrows for 1.5s then move
          const arrows: Phaser.GameObjects.Text[] = [];
          for (const b of this.creatBlockers) {
            if (b.owner !== 'player') continue;
            const arr = this.add.text(b.x, b.y, '→', { fontSize: '18px', color: '#ffcc44' }).setOrigin(0.5).setDepth(12)
              .setRotation(Math.atan2(mouseY - b.y, mouseX - b.x));
            arrows.push(arr);
            this.creatBuildLaunchArrows.push(arr);
          }
          for (const b of this.creatSpeedPads) {
            if (b.owner !== 'player') continue;
            const arr = this.add.text(b.x, b.y, '→', { fontSize: '18px', color: '#44aaff' }).setOrigin(0.5).setDepth(12)
              .setRotation(Math.atan2(mouseY - b.y, mouseX - b.x));
            arrows.push(arr);
            this.creatBuildLaunchArrows.push(arr);
          }
          for (const b of this.creatSpikedBlocks) {
            if (b.owner !== 'player') continue;
            const arr = this.add.text(b.x, b.y, '→', { fontSize: '18px', color: '#ff4422' }).setOrigin(0.5).setDepth(12)
              .setRotation(Math.atan2(mouseY - b.y, mouseX - b.x));
            arrows.push(arr);
            this.creatBuildLaunchArrows.push(arr);
          }
          this.time.delayedCall(1500, () => {
            for (const a of arrows) a.destroy();
            const W = this.scale.width, H = this.scale.height;
            // Launch blocks: fast movement toward cursor each frame (handled via vx/vy in per-frame section)
            for (const b of this.creatBlockers) {
              if (b.owner !== 'player') continue;
              const dx = mouseX - b.x, dy = mouseY - b.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              (b as any).launchVx = (dx / len) * 600; (b as any).launchVy = (dy / len) * 600;
              (b as any).launchUntil = this.time.now + 2000;
            }
            for (const b of this.creatSpeedPads) {
              if (b.owner !== 'player') continue;
              const dx = mouseX - b.x, dy = mouseY - b.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              (b as any).launchVx = (dx / len) * 600; (b as any).launchVy = (dy / len) * 600;
              (b as any).launchUntil = this.time.now + 2000;
            }
            for (const b of this.creatSpikedBlocks) {
              if (b.owner !== 'player') continue;
              const dx = mouseX - b.x, dy = mouseY - b.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              (b as any).launchVx = (dx / len) * 600; (b as any).launchVy = (dy / len) * 600;
              (b as any).launchUntil = this.time.now + 2000;
            }
          });
        }
        // R — Speed pad
        if (Phaser.Input.Keyboard.JustDown(this.rKey) && time >= this.creatBuildSpeedPadCdUntil) {
          this.creatBuildSpeedPadCdUntil = time + 6000;
          const pw = 60, ph = 20;
          const padSpr = this.add.rectangle(mouseX, mouseY, pw, ph, 0x44aaff, 0.75).setStrokeStyle(2, 0x88ddff, 0.9).setDepth(4);
          const padHpBg = this.add.rectangle(mouseX, mouseY - ph / 2 - 6, pw, 4, 0x333333, 0.8).setDepth(5);
          const padHpBar = this.add.rectangle(mouseX - pw / 2, mouseY - ph / 2 - 6, pw, 4, 0x44aaff, 0.9).setDepth(6).setOrigin(0, 0.5);
          this.creatSpeedPads.push({ rect: padSpr, x: mouseX, y: mouseY, w: pw, h: ph, hp: 40, maxHp: 40, hpBar: padHpBar, hpBg: padHpBg, owner: 'player' });
          this.showFloatingText(mouseX, mouseY - 30, 'SPEED PAD', '#44aaff');
        }
        // F — Exit build mode
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.creatBuildMode = false;
          this.showFloatingText(this.player.x, this.player.y - 40, 'Build Mode OFF', '#aaaaaa');
        }
        // Q — Spike block
        if (Phaser.Input.Keyboard.JustDown(this.qKey) && time >= this.creatBuildSpikedCdUntil) {
          this.creatBuildSpikedCdUntil = time + 20000;
          const sw = 50, sh = 50;
          const spkSpr = this.add.rectangle(mouseX, mouseY, sw, sh, 0xcc2222, 0.8).setStrokeStyle(2, 0xff4444, 0.9).setDepth(4);
          const spkHpBg = this.add.rectangle(mouseX, mouseY - sh / 2 - 6, sw, 4, 0x333333, 0.8).setDepth(5);
          const spkHpBar = this.add.rectangle(mouseX - sw / 2, mouseY - sh / 2 - 6, sw, 4, 0xcc2222, 0.9).setDepth(6).setOrigin(0, 0.5);
          this.creatSpikedBlocks.push({ rect: spkSpr, x: mouseX, y: mouseY, w: sw, h: sh, hp: 50, maxHp: 50, hpBar: spkHpBar, hpBg: spkHpBg, owner: 'player', tickAccum: 0, invincible: false });
          this.showFloatingText(mouseX, mouseY - 30, 'SPIKE BLOCK', '#cc2222');
        }
      } else {
        // ── Normal F — Create: drag to define rectangle, release to spawn
        if (this.hasUpgrade('f') && Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.creatBuildMode = true;
          this.showFloatingText(this.player.x, this.player.y - 40, 'Build Mode ON', '#bb88ff');
        } else {
          if (this.fKey.isDown && !this.creatBlockDragging) {
            if (this.player.getCooldownRatio('creation-block') >= 1) {
              this.creatBlockDragging = true;
              this.creatBlockDragStartX = mouseX;
              this.creatBlockDragStartY = mouseY;
              if (this.creatBlockPreview) this.creatBlockPreview.destroy();
              this.creatBlockPreview = this.add.rectangle(mouseX, mouseY, 0, 0, 0xcc8844, 0.3)
                .setStrokeStyle(2, 0xff9955, 0.8).setDepth(5);
            }
          }
          if (this.creatBlockDragging && this.creatBlockPreview) {
            const rw = Math.min(200, Math.abs(mouseX - this.creatBlockDragStartX));
            const rh = Math.min(200, Math.abs(mouseY - this.creatBlockDragStartY));
            const rx = this.creatBlockDragStartX + (mouseX > this.creatBlockDragStartX ? 1 : -1) * rw / 2;
            const ry = this.creatBlockDragStartY + (mouseY > this.creatBlockDragStartY ? 1 : -1) * rh / 2;
            this.creatBlockPreview.setPosition(rx, ry).setSize(rw, rh);
          }
          if (!this.fKey.isDown && this.creatBlockDragging) {
            this.creatBlockDragging = false;
            const rw = Math.min(200, Math.abs(mouseX - this.creatBlockDragStartX));
            const rh = Math.min(200, Math.abs(mouseY - this.creatBlockDragStartY));
            if (this.creatBlockPreview) { this.creatBlockPreview.destroy(); this.creatBlockPreview = null; }
            if (rw >= 12 && rh >= 12) {
              const rx = this.creatBlockDragStartX + (mouseX > this.creatBlockDragStartX ? 1 : -1) * rw / 2;
              const ry = this.creatBlockDragStartY + (mouseY > this.creatBlockDragStartY ? 1 : -1) * rh / 2;
              playerCtx.creationBlock(rx, ry, rw, rh);
              this.player.triggerCooldown('creation-block');
            }
          }
        }
        // Q — Maze of Doom
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('maze-of-doom', playerCtx);
        }
      }
    }
    this.pointerWasDown = pointer.isDown;

    // ── Player water world effects ────────────────────────────────
    if (this.elementId === 'water') {
      if (time < this.splashActiveUntil) {
        this.splashDropAccum += delta;
        if (this.splashDropAccum >= 150) {
          this.splashDropAccum -= 150;
          this.splashDropCount++;
          const isFinal = this.hasUpgrade('e') && (time + 150 >= this.splashActiveUntil);
          const puddleRadius = isFinal ? 54 : 36;
          const puddleAlpha = isFinal ? 0.7 : 0.5;
          const puddleDuration = isFinal ? 5000 : 1000;
          const spr = this.add.circle(mouseX, mouseY, puddleRadius, 0x0066bb, puddleAlpha).setDepth(2);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, alpha: 0.25, duration: 800 });
          this.puddles.push({ sprite: spr, expiresAt: time + puddleDuration, x: mouseX, y: mouseY, radius: puddleRadius, tickAccum: 0, owner: 'player' });
        }
      }

      // Shield aura maintenance
      if (this.player.shieldCharges > 0 && !this.shieldAura) {
        this.shieldAura = this.add.circle(this.player.x, this.player.y, 32, 0x44aaff, 0.35).setDepth(6);
      } else if (this.player.shieldCharges === 0 && this.shieldAura) {
        this.shieldAura.destroy();
        this.shieldAura = null;
      }
      if (this.shieldAura) this.shieldAura.setPosition(this.player.x, this.player.y);
    }

    // ── Grapple dodge aura ────────────────────────────────────────
    if (this.grappleDodgeAura) {
      if (this.grappleDodgeCharges > 0) {
        this.grappleDodgeAura.setPosition(this.player.x, this.player.y);
      } else {
        this.grappleDodgeAura.destroy();
        this.grappleDodgeAura = null;
      }
    }

    // ── Earth element per-frame ───────────────────────────────────
    if (this.elementId === 'earth') {
      // Player slam — dash phase
      if (this.earthSlamActive) {
        if (time > this.earthSlamEnd) {
          this.earthSlamActive = false;
          this.isDodging = false;
          playerBody.setVelocity(0, 0);
        } else if (!this.earthSlamHitDealt) {
          const slamDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (slamDist <= 60) {
            const shieldDmg = Math.max(5, Math.floor(this.player.shieldHp / 2));
            this.npc.takeDamage(shieldDmg);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xbb9955);
            this.earthSlamHitDealt = true;
            this.earthSlamActive = false;
            this.isDodging = false;
            playerBody.setVelocity(0, 0);
          } else if (playerBody.blocked.left || playerBody.blocked.right || playerBody.blocked.up || playerBody.blocked.down) {
            // Entered bounce phase
            this.earthSlamActive = false;
            this.earthSlamBouncing = true;
            this.earthSlamBounceEnd = time + 5000;
            this.earthSlamLastWallHit = time - 9999; // allow immediate re-bounce
            // Nudge out of wall, then launch
            if (playerBody.blocked.left)  this.player.x += 14;
            if (playerBody.blocked.right) this.player.x -= 14;
            if (playerBody.blocked.up)    this.player.y += 14;
            if (playerBody.blocked.down)  this.player.y -= 14;
            let bounceAng: number;
            if (this.hasUpgrade('r')) {
              const ptr = this.input.activePointer;
              bounceAng = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
            } else {
              let awayX = 0, awayY = 0;
              if (playerBody.blocked.left)  awayX += 1;
              if (playerBody.blocked.right) awayX -= 1;
              if (playerBody.blocked.up)    awayY += 1;
              if (playerBody.blocked.down)  awayY -= 1;
              bounceAng = Math.atan2(awayY || 0, awayX || 1) + (Math.random() - 0.5) * (Math.PI * 0.38);
            }
            playerBody.setVelocity(Math.cos(bounceAng) * 950, Math.sin(bounceAng) * 950);
            if (this.player.shieldHp === 0) {
              this.player.takeDamage(5);
              this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
            }
          }
        }
      }

      // Player slam — bounce phase
      if (this.earthSlamBouncing) {
        if (time > this.earthSlamBounceEnd) {
          this.earthSlamBouncing = false;
          this.isDodging = false;
          playerBody.setVelocity(0, 0);
        } else {
          const bl = playerBody.blocked;
          const wallHit = bl.left || bl.right || bl.up || bl.down;
          if (wallHit && time - this.earthSlamLastWallHit > 60) {
            this.earthSlamLastWallHit = time;
            // Nudge out of wall to prevent sticking
            if (bl.left)  this.player.x += 14;
            if (bl.right) this.player.x -= 14;
            if (bl.up)    this.player.y += 14;
            if (bl.down)  this.player.y -= 14;
            // Compute bounce angle — cursor-guided if R upgrade, else away from wall ±35°
            let wallAng: number;
            if (this.hasUpgrade('r')) {
              const ptr = this.input.activePointer;
              wallAng = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
            } else {
              let awayX = 0, awayY = 0;
              if (bl.left)  awayX += 1;
              if (bl.right) awayX -= 1;
              if (bl.up)    awayY += 1;
              if (bl.down)  awayY -= 1;
              wallAng = Math.atan2(awayY || 0, awayX || 1) + (Math.random() - 0.5) * (Math.PI * 0.38);
            }
            playerBody.setVelocity(Math.cos(wallAng) * 950, Math.sin(wallAng) * 950);
            if (this.player.shieldHp === 0) {
              this.player.takeDamage(5);
              this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
            }
          }
          // Can still hit NPC once during bounce (half shield damage)
          if (!this.earthSlamHitDealt) {
            const bounceDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
            if (bounceDist <= 60) {
              const shieldDmg = Math.max(5, Math.floor(this.player.shieldHp / 2));
              this.npc.takeDamage(shieldDmg);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xbb9955);
              this.earthSlamHitDealt = true;
            }
          }
        }
      }

      // Player earth shield aura + counter label
      if (this.player.shieldHp > 0 && !this.earthShieldAura) {
        this.earthShieldAura = this.add.circle(this.player.x, this.player.y, 30, 0x997744, 0.3).setDepth(6);
        this.earthShieldLabel = this.add.text(this.player.x, this.player.y, '', {
          fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaddff',
        }).setOrigin(0.5).setDepth(11);
      } else if (this.player.shieldHp === 0 && this.earthShieldAura) {
        this.earthShieldAura.destroy(); this.earthShieldAura = null;
        if (this.earthShieldLabel) { this.earthShieldLabel.destroy(); this.earthShieldLabel = null; }
      }
      if (this.earthShieldAura) this.earthShieldAura.setPosition(this.player.x, this.player.y);
      if (this.earthShieldLabel) {
        this.earthShieldLabel.setText(`🛡${Math.floor(this.player.shieldHp)}`);
        this.earthShieldLabel.setPosition(this.player.x, this.player.y);
      }

      // Bull Rush — player
      if (this.earthBullRushActive) {
        if (time > this.earthBullRushEnd) {
          // Expired — clean up
          this.earthBullRushActive = false;
          this.isDodging = false;
          if (this.earthBullRushDrApplied) { this.player.incomingDamageMultiplier /= 0.8; this.earthBullRushDrApplied = false; }
          if (this.earthBullRushAura) { this.earthBullRushAura.destroy(); this.earthBullRushAura = null; }
          playerBody.setVelocity(0, 0);
        } else {
          // Accelerate toward cursor
          const ptr = this.input.activePointer;
          const rdx = ptr.worldX - this.player.x;
          const rdy = ptr.worldY - this.player.y;
          const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
          this.earthBullRushSpeed = Math.min(700, this.earthBullRushSpeed + delta * 0.4);
          playerBody.setVelocity((rdx / rlen) * this.earthBullRushSpeed, (rdy / rlen) * this.earthBullRushSpeed);
          if (this.earthBullRushAura) this.earthBullRushAura.setPosition(this.player.x, this.player.y);

          // Hit NPC (multi-hit with debounce)
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 60
            && time - this.earthBullRushLastHit > 500) {
            this.earthBullRushLastHit = time;
            this.npc.takeDamage(25);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc4400);
            const toNx = this.npc.x - this.player.x;
            const toNy = this.npc.y - this.player.y;
            const nd = Math.sqrt(toNx * toNx + toNy * toNy) || 1;
            (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity((toNx / nd) * 500, (toNy / nd) * 500);
          }

          // Wall collision
          if (playerBody.blocked.left || playerBody.blocked.right || playerBody.blocked.up || playerBody.blocked.down) {
            if (this.hasUpgrade('q') && time - this.earthBullRushWallHitLast >= 3000) {
              this.earthBullRushWallHitLast = time;
              this.player.applySelfDamage(15);
              this.spawnHitFlash(this.player.x, this.player.y, 0x887755);
              // Upgrade DR to 45%: currently at ×0.8 (20% DR). Multiply by another ×0.65 → ×0.52 ≈ 45% DR total
              if (this.earthBullRushDrApplied) {
                this.player.incomingDamageMultiplier /= 0.8;
                this.player.incomingDamageMultiplier *= (1 - 0.45);
              }
              this.createPainRain('player', 40, 200, 1500, 10, 0x554422, 20, 70);
            }
            // Bounce off wall
            if (playerBody.blocked.left || playerBody.blocked.right) this.earthBullRushSpeed *= 0.5;
            if (playerBody.blocked.up || playerBody.blocked.down) this.earthBullRushSpeed *= 0.5;
          }
        }
      }
    }

    // ── NPC earth slam + aura ─────────────────────────────────────
    if (this.npcElement.id === 'earth') {
      const npcBody = this.npc.body as Phaser.Physics.Arcade.Body;

      // NPC slam — dash phase
      if (this.npcEarthSlamActive) {
        if (time > this.npcEarthSlamEnd) {
          this.npcEarthSlamActive = false;
          npcBody.setVelocity(0, 0);
        } else if (!this.npcEarthSlamHitDealt) {
          const slamDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
          if (slamDist <= 60) {
            const shieldDmg = Math.max(5, Math.floor(this.npc.shieldHp / 2));
            this.player.takeDamage(shieldDmg);
            this.spawnHitFlash(this.player.x, this.player.y, 0xbb9955);
            this.npcEarthSlamHitDealt = true;
            this.npcEarthSlamActive = false;
            npcBody.setVelocity(0, 0);
          } else if (npcBody.blocked.left || npcBody.blocked.right || npcBody.blocked.up || npcBody.blocked.down) {
            this.npcEarthSlamActive = false;
            this.npcEarthSlamBouncing = true;
            this.npcEarthSlamBounceEnd = time + 5000;
            this.npcEarthSlamLastWallHit = time - 9999;
            if (npcBody.blocked.left)  this.npc.x += 14;
            if (npcBody.blocked.right) this.npc.x -= 14;
            if (npcBody.blocked.up)    this.npc.y += 14;
            if (npcBody.blocked.down)  this.npc.y -= 14;
            let npcAwayX = 0, npcAwayY = 0;
            if (npcBody.blocked.left)  npcAwayX += 1;
            if (npcBody.blocked.right) npcAwayX -= 1;
            if (npcBody.blocked.up)    npcAwayY += 1;
            if (npcBody.blocked.down)  npcAwayY -= 1;
            const npcBaseAng = Math.atan2(npcAwayY || 0, npcAwayX || 1);
            const npcAng = npcBaseAng + (Math.random() - 0.5) * (Math.PI * 0.38);
            npcBody.setVelocity(Math.cos(npcAng) * 950, Math.sin(npcAng) * 950);
            if (this.npc.shieldHp === 0) {
              this.npc.takeDamage(5);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xaa8844);
            }
          }
        }
      }

      // NPC slam — bounce phase
      if (this.npcEarthSlamBouncing) {
        if (time > this.npcEarthSlamBounceEnd) {
          this.npcEarthSlamBouncing = false;
          npcBody.setVelocity(0, 0);
        } else {
          const nbl = npcBody.blocked;
          const npcWallHit = nbl.left || nbl.right || nbl.up || nbl.down;
          if (npcWallHit && time - this.npcEarthSlamLastWallHit > 60) {
            this.npcEarthSlamLastWallHit = time;
            if (nbl.left)  this.npc.x += 14;
            if (nbl.right) this.npc.x -= 14;
            if (nbl.up)    this.npc.y += 14;
            if (nbl.down)  this.npc.y -= 14;
            let npcAwayX2 = 0, npcAwayY2 = 0;
            if (nbl.left)  npcAwayX2 += 1;
            if (nbl.right) npcAwayX2 -= 1;
            if (nbl.up)    npcAwayY2 += 1;
            if (nbl.down)  npcAwayY2 -= 1;
            const npcBase2 = Math.atan2(npcAwayY2 || 0, npcAwayX2 || 1);
            const npcWallAng = npcBase2 + (Math.random() - 0.5) * (Math.PI * 0.38);
            npcBody.setVelocity(Math.cos(npcWallAng) * 950, Math.sin(npcWallAng) * 950);
            if (this.npc.shieldHp === 0) {
              this.npc.takeDamage(5);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xaa8844);
            }
          }
          if (!this.npcEarthSlamHitDealt) {
            const bounceDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
            if (bounceDist <= 60) {
              const shieldDmg = Math.max(5, Math.floor(this.npc.shieldHp / 2));
              this.player.takeDamage(shieldDmg);
              this.spawnHitFlash(this.player.x, this.player.y, 0xbb9955);
              this.npcEarthSlamHitDealt = true;
            }
          }
        }
      }

      // NPC earth shield passive regen: +10 every 2s
      this.npcEarthShieldTickAccum += delta;
      if (this.npcEarthShieldTickAccum >= 2000) {
        this.npcEarthShieldTickAccum -= 2000;
        this.npc.shieldHp = Math.min(100, this.npc.shieldHp + 10);
      }

      // NPC earth shield aura + counter label
      if (this.npc.shieldHp > 0 && !this.npcEarthShieldAura) {
        this.npcEarthShieldAura = this.add.circle(this.npc.x, this.npc.y, 30, 0x997744, 0.3).setDepth(6);
        this.npcEarthShieldLabel = this.add.text(this.npc.x, this.npc.y, '', {
          fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaddff',
        }).setOrigin(0.5).setDepth(11);
      } else if (this.npc.shieldHp === 0 && this.npcEarthShieldAura) {
        this.npcEarthShieldAura.destroy(); this.npcEarthShieldAura = null;
        if (this.npcEarthShieldLabel) { this.npcEarthShieldLabel.destroy(); this.npcEarthShieldLabel = null; }
      }
      if (this.npcEarthShieldAura) this.npcEarthShieldAura.setPosition(this.npc.x, this.npc.y);
      if (this.npcEarthShieldLabel) {
        this.npcEarthShieldLabel.setText(`🛡${Math.floor(this.npc.shieldHp)}`);
        this.npcEarthShieldLabel.setPosition(this.npc.x, this.npc.y);
      }

      // NPC Bull Rush
      if (this.npcBullRushActive) {
        if (time > this.npcBullRushEnd) {
          this.npcBullRushActive = false;
          if (this.npcBullRushDrApplied) { this.npc.incomingDamageMultiplier /= 0.8; this.npcBullRushDrApplied = false; }
          if (this.npcBullRushAura) { this.npcBullRushAura.destroy(); this.npcBullRushAura = null; }
          npcBody.setVelocity(0, 0);
        } else {
          // Accelerate toward player
          const rdx = this.player.x - this.npc.x;
          const rdy = this.player.y - this.npc.y;
          const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
          this.npcBullRushSpeed = Math.min(700, this.npcBullRushSpeed + delta * 0.4);
          npcBody.setVelocity((rdx / rlen) * this.npcBullRushSpeed, (rdy / rlen) * this.npcBullRushSpeed);
          if (this.npcBullRushAura) this.npcBullRushAura.setPosition(this.npc.x, this.npc.y);

          // Hit player
          if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y) <= 60
            && time - this.npcBullRushLastHit > 500) {
            this.npcBullRushLastHit = time;
            this.player.takeDamage(25);
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc4400);
            const toPx = this.player.x - this.npc.x;
            const toPy = this.player.y - this.npc.y;
            const pd = Math.sqrt(toPx * toPx + toPy * toPy) || 1;
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity((toPx / pd) * 500, (toPy / pd) * 500);
          }
        }
      }
    }

    // ── NPC world effects (water) ─────────────────────────────────
    if (this.npcElement.id === 'water') {
      if (time < this.npcSplashActiveUntil) {
        this.npcSplashDropAccum += delta;
        if (this.npcSplashDropAccum >= 150) {
          this.npcSplashDropAccum -= 150;
          // In PvP, drop puddle at P2 aim position; in AI mode, drop near player with aim scatter
          let splashX: number, splashY: number;
          if (this.isPvP) {
            splashX = this.p2LastAimX;
            splashY = this.p2LastAimY;
          } else {
            const splashMissRange = this.npcDifficulty.aimOffsetDeg * 2.2; // ~0 on Nightmare, ~110 on Easy
            splashX = this.player.x + Phaser.Math.Between(-splashMissRange, splashMissRange);
            splashY = this.player.y + Phaser.Math.Between(-splashMissRange, splashMissRange);
          }
          const spr = this.add.circle(splashX, splashY, 36, 0x0066bb, 0.5).setDepth(2);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, alpha: 0.25, duration: 800 });
          this.puddles.push({ sprite: spr, expiresAt: time + 1000, x: splashX, y: splashY, radius: 36, tickAccum: 0, owner: 'npc' });
        }
      }

      // NPC shield aura maintenance
      if (this.npc.shieldCharges > 0 && !this.npcShieldAura) {
        this.npcShieldAura = this.add.circle(this.npc.x, this.npc.y, 32, 0x44aaff, 0.35).setDepth(6);
      } else if (this.npc.shieldCharges === 0 && this.npcShieldAura) {
        this.npcShieldAura.destroy();
        this.npcShieldAura = null;
      }
      if (this.npcShieldAura) this.npcShieldAura.setPosition(this.npc.x, this.npc.y);
    }

    // ── Shared puddle ticks + expiry ──────────────────────────────
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (time > p.expiresAt) {
        p.sprite.destroy();
        this.puddles.splice(i, 1);
        continue;
      }
      const target = p.owner === 'player' ? this.npc : this.player;
      if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) <= p.radius) {
        p.tickAccum += delta;
        if (p.tickAccum >= 250) {
          p.tickAccum -= 250;
          target.takeDamage(2);
          this.spawnHitFlash(target.x, target.y, 0x0099ff);
        }
      }
      // NPC heals double when standing in its own puddles
      if (p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius) {
        this.npc.heal(4 * delta / 250);
      }
    }

    // ── Geyser expiry ─────────────────────────────────────────────
    for (let i = this.geysers.length - 1; i >= 0; i--) {
      if (time > this.geysers[i].expiresAt) {
        this.geysers[i].sprite.destroy();
        this.geysers.splice(i, 1);
      }
    }

    // ── Plant expiry ──────────────────────────────────────────────
    // ── Plant health bar updates + projectile damage + expiry ─────
    const allActiveProj = this.projectiles.getChildren() as Projectile[];

    for (let i = this.playerPlants.length - 1; i >= 0; i--) {
      const p = this.playerPlants[i];
      if (time > p.expiresAt || p.hp <= 0) {
        p.sprite.destroy(); p.label.destroy(); p.healthBar.destroy();
        this.playerPlants.splice(i, 1);
        continue;
      }
      p.healthBar.update(p.x, p.y, p.hp);

      // E upgrade: normal plants slowly follow cursor
      if (p.type === 'normal' && this.hasUpgrade('e')) {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const distToCursor = Math.sqrt(dx * dx + dy * dy);
        if (distToCursor > 5) {
          const moveAmount = Math.min(60 * delta / 1000, distToCursor);
          p.x += (dx / distToCursor) * moveAmount;
          p.y += (dy / distToCursor) * moveAmount;
          p.sprite.setPosition(p.x, p.y);
          p.label.setPosition(p.x, p.y);
        }
      }

      // Life plant: heal player 10 HP every 2 seconds
      if (p.type === 'life') {
        p.accum += delta;
        if (p.accum >= 2000) {
          p.accum -= 2000;
          this.player.heal(10);
          const apple = this.add.text(p.x, p.y, '🍎', { fontSize: '18px' }).setOrigin(0.5).setDepth(6);
          this.tweens.add({ targets: apple, y: p.y - 50, alpha: 0, duration: 900, onComplete: () => apple.destroy() });
        }
      }

      // Thorn plant: fire petal at enemy every 1 second
      if (p.type === 'thorn') {
        p.accum += delta;
        if (p.accum >= 1000) {
          p.accum -= 1000;
          const dx = this.npc.x - p.x;
          const dy = this.npc.y - p.y;
          const dist2 = Math.sqrt(dx * dx + dy * dy) || 1;
          const thornProj = new Projectile(this, p.x, p.y, 'proj-life', 8, true);
          this.projectiles.add(thornProj);
          thornProj.launch((dx / dist2) * 480, (dy / dist2) * 480);
        }
      }

      // NPC projectiles damage player plants
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.isFromPlayer) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, p.x, p.y) <= 30) {
          p.hp -= proj.damage;
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          proj.setActive(false).setVisible(false);
        }
      }
    }
    for (let i = this.npcPlants.length - 1; i >= 0; i--) {
      const p = this.npcPlants[i];
      if (time > p.expiresAt || p.hp <= 0) {
        p.sprite.destroy(); p.label.destroy(); p.healthBar.destroy();
        this.npcPlants.splice(i, 1);
        continue;
      }
      p.healthBar.update(p.x, p.y, p.hp);
      // Player projectiles damage NPC plants
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || !proj.isFromPlayer) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, p.x, p.y) <= 30) {
          p.hp -= proj.damage;
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          proj.setActive(false).setVisible(false);
        }
      }
    }

    // ── Pain Rain drops ───────────────────────────────────────────
    for (let i = this.painRainShadows.length - 1; i >= 0; i--) {
      const s = this.painRainShadows[i];
      if (!s.fired && time >= s.fireAt) {
        s.fired = true;
        s.sprite.destroy();

        const wave = this.add.circle(s.x, s.y, 10, s.color, 0.7).setDepth(8);
        this.tweens.add({ targets: wave, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => wave.destroy() });
        const core = this.add.circle(s.x, s.y, 7, 0xffffff, 1).setDepth(9);
        this.tweens.add({ targets: core, scaleX: 3, scaleY: 3, alpha: 0, duration: 220, onComplete: () => core.destroy() });

        const target = s.owner === 'player' ? this.npc : this.player;
        if (Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y) <= s.hitRadius) {
          target.takeDamage(s.damage);
          this.spawnHitFlash(target.x, target.y, s.color);
        }
      }
      if (s.fired) this.painRainShadows.splice(i, 1);
    }

    // ── Oil per-frame (player) ────────────────────────────────────
    if (this.elementId === 'oil') {
      // Orbit drones evenly around player, spaced to avoid overlap
      const pCount = this.playerDrones.length;
      const orbitR = Math.max(60, 40 + pCount * 8);
      for (let di = 0; di < pCount; di++) {
        const drone = this.playerDrones[di];
        drone.orbitAngle += delta * 0.0025;
        const angle = drone.orbitAngle + (di * Math.PI * 2 / Math.max(1, pCount));
        drone.sprite.setPosition(
          this.player.x + Math.cos(angle) * orbitR,
          this.player.y + Math.sin(angle) * orbitR,
        );
        // Visual indicator: color + radius reflect remaining shots
        const col = drone.shotsLeft >= 3 ? 0xffaa00 : drone.shotsLeft === 2 ? 0xff6600 : 0xff2200;
        const rad = drone.shotsLeft >= 3 ? 8 : drone.shotsLeft === 2 ? 7 : 5;
        drone.sprite.setFillStyle(col, 0.9);
        drone.sprite.setRadius(rad);
      }
      // Destroy drones whose shots are exhausted (no puddle — only Drone Destroy and Overdrive spawn puddles)
      for (let di = this.playerDrones.length - 1; di >= 0; di--) {
        if (this.playerDrones[di].shotsLeft <= 0) {
          this.playerDrones[di].sprite.destroy();
          this.playerDrones.splice(di, 1);
        }
      }
      // E upgrade: drone melee attack
      if (this.hasUpgrade('e')) {
        for (const drone of this.playerDrones) {
          if (time >= drone.meleeCooldownUntil) {
            const md = Phaser.Math.Distance.Between(drone.sprite.x, drone.sprite.y, this.npc.x, this.npc.y);
            if (md <= 25) {
              this.npc.takeDamage(5);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xffaa00);
              drone.meleeCooldownUntil = time + 1000;
            }
          }
        }
      }
      // F upgrade: drone heals 1 shot when passing through firewall (once per drone)
      if (this.hasUpgrade('f') && this.playerFirewallSprite && this.playerFirewallHp > 0) {
        const fwCos = Math.cos(-this.playerFirewallAngle);
        const fwSin = Math.sin(-this.playerFirewallAngle);
        for (const drone of this.playerDrones) {
          if (!drone.healedByFirewall) {
            const relX = drone.sprite.x - this.playerFirewallX;
            const relY = drone.sprite.y - this.playerFirewallY;
            const localX = fwCos * relX - fwSin * relY;
            const localY = fwSin * relX + fwCos * relY;
            if (Math.abs(localX) <= 60 && Math.abs(localY) <= 30) {
              drone.shotsLeft = Math.min(3, drone.shotsLeft + 1);
              drone.healedByFirewall = true;
            }
          }
        }
      }
      // Firewall absorbs NPC projectiles (rotated bounds check)
      if (this.playerFirewallSprite && this.playerFirewallHp > 0) {
        const fwCos = Math.cos(-this.playerFirewallAngle);
        const fwSin = Math.sin(-this.playerFirewallAngle);
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || proj.isFromPlayer) continue;
          const relX = proj.x - this.playerFirewallX;
          const relY = proj.y - this.playerFirewallY;
          const localX = fwCos * relX - fwSin * relY;
          const localY = fwSin * relX + fwCos * relY;
          if (Math.abs(localX) <= 60 && Math.abs(localY) <= 30) {
            this.playerFirewallHp -= proj.damage;
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            if (this.playerFirewallHp <= 0) {
              this.playerFirewallSprite.destroy();
              this.playerFirewallSprite = null;
              break;
            }
          }
        }
      }
      // R upgrade: oil puddle ticks and expiry
      if (this.hasUpgrade('r')) {
        for (let pi = this.playerOilPuddles.length - 1; pi >= 0; pi--) {
          const p = this.playerOilPuddles[pi];
          if (time >= p.expiresAt) {
            p.sprite.destroy();
            this.playerOilPuddles.splice(pi, 1);
            continue;
          }
          if (p.ignited) {
            p.igniteTickAccum += delta;
            if (p.igniteTickAccum >= 300) {
              p.igniteTickAccum -= 300;
              if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, p.x, p.y) <= p.radius) {
                this.npc.takeDamage(2);
                this.spawnHitFlash(this.npc.x, this.npc.y, 0xff4400);
              }
            }
          }
        }
      }
      // Overdrive beam
      if (this.playerOverdriveActive) {
        if (time >= this.playerOverdriveEnd) {
          this.playerOverdriveActive = false;
          this.nukeChanneling = false;
          // Destroy all remaining drones when overdrive ends
          for (const drone of this.playerDrones) {
            if (this.hasUpgrade('r')) this.spawnOilPuddle(drone.sprite.x, drone.sprite.y, 'player');
            drone.sprite.destroy();
          }
          // Q upgrade: fire salvo bombs toward cursor, one per original drone
          if (this.hasUpgrade('q')) {
            const salvoCX = mouseX, salvoCY = mouseY;
            for (let i = 0; i < this.playerOverdriveDroneCount; i++) {
              this.time.delayedCall(i * 500, () => {
                this.fireOverdriveSalvoBomb(salvoCX, salvoCY);
              });
            }
          }
          this.playerDrones = [];
          if (this.playerOverdriveGraphics) {
            this.playerOverdriveGraphics.destroy();
            this.playerOverdriveGraphics = null;
          }
        } else {
          // Slowly rotate toward cursor
          const tgtAng = Math.atan2(mouseY - this.player.y, mouseX - this.player.x);
          const diff = Phaser.Math.Angle.Wrap(tgtAng - this.playerOverdriveAngle);
          const rotSpeed = (18 * Math.PI / 180) * delta / 1000;
          this.playerOverdriveAngle += Math.sign(diff) * Math.min(Math.abs(diff), rotSpeed);
          const beamEndX = this.player.x + Math.cos(this.playerOverdriveAngle) * 1000;
          const beamEndY = this.player.y + Math.sin(this.playerOverdriveAngle) * 1000;
          if (this.playerOverdriveGraphics) {
            this.playerOverdriveGraphics.clear();
            this.playerOverdriveGraphics.lineStyle(22, 0xff6600, 0.6);
            this.playerOverdriveGraphics.lineBetween(this.player.x, this.player.y, beamEndX, beamEndY);
          }
          this.playerOverdriveTickAccum += delta;
          if (this.playerOverdriveTickAccum >= 100) {
            this.playerOverdriveTickAccum -= 100;
            const d = this.pointToSegmentDist(this.npc.x, this.npc.y, this.player.x, this.player.y, beamEndX, beamEndY);
            if (d <= 30) {
              this.npc.takeDamage(15);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
            }
          }
        }
      }
    }

    // ── Oil per-frame (NPC) ───────────────────────────────────────
    if (this.npcElement.id === 'oil') {
      const nCount = this.npcDrones.length;
      const nOrbitR = Math.max(60, 40 + nCount * 8);
      for (let di = 0; di < nCount; di++) {
        const drone = this.npcDrones[di];
        drone.orbitAngle += delta * 0.0025;
        const angle = drone.orbitAngle + (di * Math.PI * 2 / Math.max(1, nCount));
        drone.sprite.setPosition(
          this.npc.x + Math.cos(angle) * nOrbitR,
          this.npc.y + Math.sin(angle) * nOrbitR,
        );
        // Visual indicator
        const col = drone.shotsLeft >= 3 ? 0xffaa00 : drone.shotsLeft === 2 ? 0xff6600 : 0xff2200;
        const rad = drone.shotsLeft >= 3 ? 8 : drone.shotsLeft === 2 ? 7 : 5;
        drone.sprite.setFillStyle(col, 0.7);
        drone.sprite.setRadius(rad);
      }
      // Remove 0-shot NPC drones
      for (let di = this.npcDrones.length - 1; di >= 0; di--) {
        if (this.npcDrones[di].shotsLeft <= 0) {
          this.npcDrones[di].sprite.destroy();
          this.npcDrones.splice(di, 1);
        }
      }
      // NPC firewall absorbs player projectiles (P2 oil F ability, rotated bounds)
      if (this.npcFirewallSprite && this.npcFirewallHp > 0) {
        const fwCos = Math.cos(-this.npcFirewallAngle);
        const fwSin = Math.sin(-this.npcFirewallAngle);
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer) continue;
          const relX = proj.x - this.npcFirewallX;
          const relY = proj.y - this.npcFirewallY;
          const localX = fwCos * relX - fwSin * relY;
          const localY = fwSin * relX + fwCos * relY;
          if (Math.abs(localX) <= 60 && Math.abs(localY) <= 30) {
            this.npcFirewallHp -= proj.damage;
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            if (this.npcFirewallHp <= 0) {
              this.npcFirewallSprite.destroy();
              this.npcFirewallSprite = null;
              break;
            }
          }
        }
      }
      // NPC overdrive beam (P2 oil Q ability) — rotates toward P2 aim
      if (this.npcOverdriveActive) {
        if (time >= this.npcOverdriveEnd) {
          this.npcOverdriveActive = false;
          this.npcNukeChanneling = false;
          for (const drone of this.npcDrones) drone.sprite.destroy();
          this.npcDrones = [];
          if (this.npcOverdriveGraphics) { this.npcOverdriveGraphics.destroy(); this.npcOverdriveGraphics = null; }
        } else {
          const tgtAng = Math.atan2(this.p2LastAimY - this.npc.y, this.p2LastAimX - this.npc.x);
          const diff = Phaser.Math.Angle.Wrap(tgtAng - this.npcOverdriveAngle);
          const rotSpeed = (18 * Math.PI / 180) * delta / 1000;
          this.npcOverdriveAngle += Math.sign(diff) * Math.min(Math.abs(diff), rotSpeed);
          const beamEndX = this.npc.x + Math.cos(this.npcOverdriveAngle) * 1000;
          const beamEndY = this.npc.y + Math.sin(this.npcOverdriveAngle) * 1000;
          if (this.npcOverdriveGraphics) {
            this.npcOverdriveGraphics.clear();
            this.npcOverdriveGraphics.lineStyle(22, 0xff6600, 0.6);
            this.npcOverdriveGraphics.lineBetween(this.npc.x, this.npc.y, beamEndX, beamEndY);
          }
          this.npcOverdriveTickAccum += delta;
          if (this.npcOverdriveTickAccum >= 100) {
            this.npcOverdriveTickAccum -= 100;
            const d = this.pointToSegmentDist(this.player.x, this.player.y, this.npc.x, this.npc.y, beamEndX, beamEndY);
            if (d <= 30) {
              this.player.takeDamage(15);
              this.spawnHitFlash(this.player.x, this.player.y, 0xff6600);
            }
          }
        }
      }
    }

    // ── Shadow per-frame ─────────────────────────────────────────
    if (this.elementId === 'shadow' || this.npcElement.id === 'shadow') {
      // Dark cloud ticks (both owners)
      for (let ci = this.shadowDarkClouds.length - 1; ci >= 0; ci--) {
        const cloud = this.shadowDarkClouds[ci];
        if (time >= cloud.expiresAt) {
          cloud.sprite.destroy();
          this.shadowDarkClouds.splice(ci, 1);
          continue;
        }
        cloud.tickAccum += delta;
        if (cloud.tickAccum >= 400) {
          cloud.tickAccum -= 400;
          if (cloud.owner === 'player') {
            // Heal player, damage NPC
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, this.player.x, this.player.y) <= cloud.radius + 14) {
              const prevHp = this.player.hp;
              this.player.heal(1.5);
              const healed = this.player.hp - prevHp;
              if (healed > 0) {
                this.shadowDanceCharge = Math.min(35, this.shadowDanceCharge + healed);
              }
            }
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, this.npc.x, this.npc.y) <= cloud.radius + 14) {
              this.npc.takeDamage(1);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x660088);
            }
          } else {
            // NPC cloud: heal NPC, damage player
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, this.npc.x, this.npc.y) <= cloud.radius + 14) {
              const prevNpcHp = this.npc.hp;
              this.npc.heal(1.5);
              const npcHealed = this.npc.hp - prevNpcHp;
              if (npcHealed > 0) {
                this.npcShadowDanceCharge = Math.min(35, this.npcShadowDanceCharge + npcHealed);
              }
            }
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, this.player.x, this.player.y) <= cloud.radius + 14) {
              this.player.takeDamage(1);
            }
          }
        }
      }

      // Snap trap checks
      for (let ti = this.shadowSnapTraps.length - 1; ti >= 0; ti--) {
        const trap = this.shadowSnapTraps[ti];
        if (time >= trap.expiresAt || trap.triggered) {
          trap.sprite.destroy(); trap.label.destroy();
          this.shadowSnapTraps.splice(ti, 1);
          continue;
        }
        if (trap.owner === 'player') {
          if (Phaser.Math.Distance.Between(trap.x, trap.y, this.npc.x, this.npc.y) <= trap.radius + 10) {
            trap.triggered = true;
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc44ff);
            this.shadowNpcStunnedUntil = time + 2000;
          }
        } else {
          if (Phaser.Math.Distance.Between(trap.x, trap.y, this.player.x, this.player.y) <= trap.radius + 10) {
            trap.triggered = true;
            this.player.takeDamage(20);
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc44ff);
            this.shadowPlayerStunnedUntil = time + 2000;
          }
        }
      }

      // Player shadow per-frame
      if (this.elementId === 'shadow') {
        // Tentacle draw + drag
        if (this.shadowTentacleActive) {
          if (time >= this.shadowTentacleEnd) {
            this.shadowTentacleActive = false;
            this.shadowTentacleHooked = false;
            if (this.shadowTentacleSprite) { this.shadowTentacleSprite.destroy(); this.shadowTentacleSprite = null; }
          } else {
            const tSpr = this.shadowTentacleSprite;
            if (tSpr) {
              tSpr.clear();
              if (this.shadowTentacleHooked) {
                // Hooked: draw from player to NPC, show drag chain
                tSpr.lineStyle(6, 0x8800cc, 0.85);
                tSpr.lineBetween(this.player.x, this.player.y, this.npc.x, this.npc.y);
                tSpr.lineStyle(2, 0xcc44ff, 0.5);
                tSpr.lineBetween(this.player.x, this.player.y, this.npc.x, this.npc.y);
              } else {
                // Miss/drag: track cursor for trap drag (R+)
                if (this.hasUpgrade('r')) {
                  const ptr = this.input.activePointer;
                  this.shadowTentacleX = ptr.worldX;
                  this.shadowTentacleY = ptr.worldY;
                }
                tSpr.lineStyle(4, 0x8800cc, 0.6);
                tSpr.lineBetween(this.player.x, this.player.y, this.shadowTentacleX, this.shadowTentacleY);
              }
            }
          }
        }

        // (NPC drag + stun handled after doAI in "Shadow NPC overrides" section)

        // Shadow dance charge bar (small bar above player)
        if (!this.shadowDanceChargeBar) {
          this.shadowDanceChargeBar = this.add.rectangle(
            this.player.x, this.player.y - 40, 0, 5, 0x8800cc, 0.8,
          ).setDepth(12).setOrigin(0, 0.5);
        }
        const barMaxW = 40;
        const barX = this.player.x - barMaxW / 2;
        this.shadowDanceChargeBar.setPosition(barX, this.player.y - 40);
        this.shadowDanceChargeBar.setSize(Math.min(barMaxW, (this.shadowDanceCharge / 35) * barMaxW), 5);

        // Black hole chargeup → activation
        if (this.shadowBlackHoleCharging) {
          if (this.shadowBlackHoleChargeVisual) {
            this.shadowBlackHoleChargeVisual.setPosition(this.player.x, this.player.y - 40);
          }
          if (time >= this.shadowBlackHoleChargeStart + 3000) {
            this.shadowBlackHoleCharging = false;
            this.nukeChanneling = false;
            if (this.shadowBlackHoleChargeVisual) { this.shadowBlackHoleChargeVisual.destroy(); this.shadowBlackHoleChargeVisual = null; }
            // Activate black hole at player position
            this.shadowBlackHoleActive = true;
            this.shadowBlackHoleEnd = time + 10000;
            this.shadowBlackHoleSprite = this.add.graphics().setDepth(5);
          }
        }

        // Black hole active: draw + pull NPC
        if (this.shadowBlackHoleActive) {
          if (time >= this.shadowBlackHoleEnd) {
            this.shadowBlackHoleActive = false;
            if (this.shadowBlackHoleSprite) { this.shadowBlackHoleSprite.destroy(); this.shadowBlackHoleSprite = null; }
          } else {
            if (this.shadowBlackHoleSprite) {
              const pulse = 18 + Math.sin(time * 0.006) * 4;
              this.shadowBlackHoleSprite.clear();
              this.shadowBlackHoleSprite.fillStyle(0x000000, 0.6);
              this.shadowBlackHoleSprite.fillCircle(this.player.x, this.player.y, pulse);
              this.shadowBlackHoleSprite.lineStyle(3, 0x8800cc, 0.85);
              this.shadowBlackHoleSprite.strokeCircle(this.player.x, this.player.y, pulse + 8);
            }
            // NPC velocity override handled after doAI (see "Black hole pull" section)
            // Q+ puddle rain every 1.5s while active
            if (this.hasUpgrade('q')) {
              this.shadowBHPuddleAccum += delta;
              if (this.shadowBHPuddleAccum >= 1500) {
                this.shadowBHPuddleAccum -= 1500;
                this.spawnShadowDarkCloud(this.player.x, this.player.y, 'player');
              }
            }
          }
        }

        // Click+ confusion: track NPC exposure to player clouds
        if (this.hasUpgrade('click')) {
          const npcInCloud = this.shadowDarkClouds.some(
            c => c.owner === 'player' && Phaser.Math.Distance.Between(c.x, c.y, this.npc.x, this.npc.y) <= c.radius + 14,
          );
          if (npcInCloud) {
            this.shadowCloudExposureAccum += delta;
            if (this.shadowCloudExposureAccum >= 3000 && time > this.shadowConfusionUntil) {
              this.shadowConfusionUntil = time + 6000;
              this.shadowCloudExposureAccum = 0;
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x8800cc);
              const confTxt = this.add.text(this.npc.x, this.npc.y - 30, '😵 CONFUSED', { fontSize: '11px', color: '#cc44ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
              this.tweens.add({ targets: confTxt, y: confTxt.y - 20, alpha: 0, duration: 1200, onComplete: () => confTxt.destroy() });
            }
          } else {
            this.shadowCloudExposureAccum = Math.max(0, this.shadowCloudExposureAccum - delta * 0.5);
          }
        }

        // R+ snap trap drag: traps near tentacle endpoint follow it
        if (this.hasUpgrade('r') && this.shadowTentacleActive) {
          const tipX = this.shadowTentacleHooked ? this.npc.x : this.shadowTentacleX;
          const tipY = this.shadowTentacleHooked ? this.npc.y : this.shadowTentacleY;
          for (const trap of this.shadowSnapTraps) {
            if (trap.owner !== 'player' || trap.triggered) continue;
            if (Phaser.Math.Distance.Between(trap.x, trap.y, tipX, tipY) <= 55) {
              trap.x = tipX;
              trap.y = tipY;
              trap.sprite.setPosition(tipX, tipY);
              trap.label.setPosition(tipX, tipY);
            }
          }
        }
      }

      // NPC shadow per-frame
      if (this.npcElement.id === 'shadow') {
        // NPC tentacle
        if (this.npcShadowTentacleActive) {
          if (time >= this.npcShadowTentacleEnd) {
            this.npcShadowTentacleActive = false;
            this.npcShadowTentacleHooked = false;
            if (this.npcShadowTentacleSprite) { this.npcShadowTentacleSprite.destroy(); this.npcShadowTentacleSprite = null; }
          } else {
            if (this.npcShadowTentacleSprite) {
              this.npcShadowTentacleSprite.clear();
              if (this.npcShadowTentacleHooked) {
                // Draw tentacle from NPC to player
                this.npcShadowTentacleSprite.lineStyle(6, 0x440066, 0.9);
                this.npcShadowTentacleSprite.lineBetween(this.npc.x, this.npc.y, this.player.x, this.player.y);
                this.npcShadowTentacleSprite.lineStyle(2, 0x8800cc, 0.5);
                this.npcShadowTentacleSprite.lineBetween(this.npc.x, this.npc.y, this.player.x, this.player.y);
              } else {
                // Miss whip
                const angle = Math.atan2(this.player.y - this.npc.y, this.player.x - this.npc.x);
                this.npcShadowTentacleSprite.lineStyle(4, 0x440066, 0.6);
                this.npcShadowTentacleSprite.lineBetween(
                  this.npc.x, this.npc.y,
                  this.npc.x + Math.cos(angle) * 100,
                  this.npc.y + Math.sin(angle) * 100,
                );
              }
            }

            // Periodically pick a new random drag target
            if (this.npcShadowTentacleHooked && time >= this.npcShadowDragNextChangeAt) {
              const { width, height } = this.scale;
              this.npcShadowDragTargetX = Phaser.Math.Between(80, width - 80);
              this.npcShadowDragTargetY = Phaser.Math.Between(80, height - 80);
              this.npcShadowDragNextChangeAt = time + 700;
            }
          }
        }

        // Player stun from NPC snap trap
        if (time < this.shadowPlayerStunnedUntil) {
          (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }

        // NPC black hole (P2 shadow Q ability): chargeup → activation
        if (this.npcShadowBlackHoleCharging) {
          if (this.npcShadowBlackHoleChargeVisual) {
            this.npcShadowBlackHoleChargeVisual.setPosition(this.npc.x, this.npc.y);
          }
          if (time >= this.npcShadowBlackHoleChargeStart + 3000) {
            this.npcShadowBlackHoleCharging = false;
            this.npcNukeChanneling = false;
            if (this.npcShadowBlackHoleChargeVisual) { this.npcShadowBlackHoleChargeVisual.destroy(); this.npcShadowBlackHoleChargeVisual = null; }
            this.npcShadowBlackHoleActive = true;
            this.npcShadowBlackHoleEnd = time + 10000;
            this.npcShadowBlackHoleSprite = this.add.graphics().setDepth(5);
          }
        }

        // NPC black hole active: draw + pull player toward NPC
        if (this.npcShadowBlackHoleActive) {
          if (time >= this.npcShadowBlackHoleEnd) {
            this.npcShadowBlackHoleActive = false;
            if (this.npcShadowBlackHoleSprite) { this.npcShadowBlackHoleSprite.destroy(); this.npcShadowBlackHoleSprite = null; }
          } else {
            if (this.npcShadowBlackHoleSprite) {
              const pulse = 18 + Math.sin(time * 0.006) * 4;
              this.npcShadowBlackHoleSprite.clear();
              this.npcShadowBlackHoleSprite.fillStyle(0x000000, 0.6);
              this.npcShadowBlackHoleSprite.fillCircle(this.npc.x, this.npc.y, pulse);
              this.npcShadowBlackHoleSprite.lineStyle(3, 0x8800cc, 0.85);
              this.npcShadowBlackHoleSprite.strokeCircle(this.npc.x, this.npc.y, pulse + 8);
            }
            // Pull player toward NPC
            const bDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
            if (bDist > 12) {
              const bAngle = Math.atan2(this.npc.y - this.player.y, this.npc.x - this.player.x);
              (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(bAngle) * 67, Math.sin(bAngle) * 67);
            }
          }
        }
      }

    }

    } // end if (this.networkRole !== 'guest')

    // ── Dodge (Space) ────────────────────────────────────────────
    if (this.networkRole !== 'guest' && Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dodgeOnCooldown && !this.isDodging && !this.nukeChanneling && time >= this.soulHauntStunUntil) {
      this.dodgeOnCooldown = true;
      this.isDodging = true;
      this.player.isInvincible = true;

      let dx = (this.dKey.isDown ? 1 : 0) - (this.aKey.isDown ? 1 : 0);
      let dy = (this.sKey.isDown ? 1 : 0) - (this.wKey.isDown ? 1 : 0);
      if (dx === 0 && dy === 0) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mouseX, mouseY);
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      } else {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      playerBody.setVelocity(dx * 520, dy * 520);

      // Soul haunt dodge: ghostly explosion + scare NPC
      if (this.elementId === 'soul' && this.soulHauntActive && this.hasUpgrade('click')) {
        const boom = this.add.circle(this.player.x, this.player.y, 10, 0xccaaff, 0.7).setDepth(9);
        this.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 120) {
          this.npc.takeDamage(5);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xccaaff);
        }
        this.npcScaredUntil = time + 3000;
        this.showFloatingText(this.npc.x, this.npc.y - 24, 'Scared!', '#ccaaff');
      }

      const trail = this.add.circle(this.player.x, this.player.y, 18, 0x8844ff, 0.4);
      this.tweens.add({ targets: trail, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 300, onComplete: () => trail.destroy() });

      this.time.delayedCall(280, () => {
        if (this.player.active) {
          if (!this.soulHauntActive) this.player.isInvincible = false;
          this.isDodging = false;
        }
      });
      this.time.delayedCall(1000, () => { this.dodgeOnCooldown = false; });
    }

    // ── P2 dodge (PvP) ────────────────────────────────────────────
    if (this.isPvP && this.p2Input.dodge && !this.p2PrevInput.dodge && !this.p2DodgeOnCooldown && !this.p2IsDodging && !this.npcNukeChanneling) {
      this.p2DodgeOnCooldown = true;
      this.p2IsDodging = true;
      this.npc.isInvincible = true;

      let dx = (this.p2Input.right ? 1 : 0) - (this.p2Input.left ? 1 : 0);
      let dy = (this.p2Input.down ? 1 : 0) - (this.p2Input.up ? 1 : 0);
      if (dx === 0 && dy === 0) {
        const angle = Phaser.Math.Angle.Between(this.npc.x, this.npc.y, p2TargetX, p2TargetY);
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      } else {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(dx * 520, dy * 520);

      const p2Trail = this.add.circle(this.npc.x, this.npc.y, 18, 0x4488ff, 0.4);
      this.tweens.add({ targets: p2Trail, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 300, onComplete: () => p2Trail.destroy() });

      this.time.delayedCall(280, () => {
        if (this.npc.active) { this.npc.isInvincible = false; this.p2IsDodging = false; }
      });
      this.time.delayedCall(1000, () => { this.p2DodgeOnCooldown = false; });
    }

    // ── NPC AI / P2 abilities ─────────────────────────────────────
    if (this.isPvP) {
      const p2Ctx = this.buildNpcContext(p2TargetX, p2TargetY);
      const p2CastId = this.processP2Abilities(time, delta, p2Ctx, p2TargetX, p2TargetY);
      if (p2CastId === 'flame-body') {
        this.npcFlameBodyActive = !this.npcFlameBodyActive;
        this.npcFlameBodyTickAccum = 0;
        if (this.npcFlameBodyActive) {
          this.npcFlameBodyAura = this.add.circle(this.npc.x, this.npc.y, 30, 0xff6600, 0.25).setDepth(3);
        } else {
          if (this.npcFlameBodyAura) { this.npcFlameBodyAura.destroy(); this.npcFlameBodyAura = null; }
        }
      }
    } else {
    // ── NPC AI ───────────────────────────────────────────────────
    const aiState: NpcAiState = {
      isLocked: this.npcNukeChanneling || this.npcEarthSlamActive || this.npcEarthSlamBouncing || this.npcFrozenUntil > time,
      hasActiveGeyser: this.geysers.some((g) => g.owner === 'npc'),
      flameBodyActive: this.npcFlameBodyActive,
      projectiles: this.projectiles,
      plantCount: this.npcPlants.length,
      thornDragActive: time < this.npcThornDragActiveUntil,
      enemyNearPlant: this.npcPlants.some(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
      ),
      windTrapActive: time < this.npcWindTrapExpiry,
      chargedBeamReady: this.npcAirConsecutiveHits >= 3,
      earthShieldHp: this.npc.shieldHp,
      oilDroneCount: this.npcDrones.length,
      shadowPlayerSnared: time < this.shadowPlayerSnaredUntil || time < this.shadowPlayerStunnedUntil,
      playerFrostStacks: this.playerFrostStacks,
      iceBlockActive: this.npcBlockUpActive,
      npcGrowthBloatActive: this.npcGrowthBloatActive,
      crystalNodeCount: this.npcCrystalNodes.length,
      npcSoulGhosts: this.npcSoulGhosts,
      npcHuntBeastForm: this.npcHuntBeastForm,
      npcHuntTrailActive: this.npcHuntTrailActive,
      playerBleeding: this.playerBleeding,
      huntBloodMoonActive: this.huntBloodMoonActive,
      npcTimeRemainActive: this.npcTimeRemainActive,
      npcTimeHaltActive: this.npcTimeHaltActive,
      npcTimeTimelessReady: this.npcTimeTimelessCharge >= 10000,
    };

    const npcPreDashX = this.npc.x;
    const npcPreDashY = this.npc.y;
    const npcCastId = (this.shadowConsumeActive || this.time.now < this.shadowNpcThrowUntil) ? null : (this.npc as NpcOpponent).doAI(
      this.player,
      (tx: number, ty: number) => this.buildNpcContext(tx, ty),
      time,
      aiState,
    );

    // React to NPC casts that need ArenaScene state
    if (npcCastId === 'splash') {
      this.npcSplashActiveUntil = time + 2000;
      this.npcSplashDropAccum = 0;
    }
    if ((npcCastId === 'flame-dash' || npcCastId === 'flame-dash-charged') && this.npc.isMastered) {
      for (let i = 1; i <= 4; i++) {
        this.time.delayedCall(i * 70, () => {
          if (!this.npc.active) return;
          const t = i / 4;
          const ex = npcPreDashX + (this.npc.x - npcPreDashX) * t;
          const ey = npcPreDashY + (this.npc.y - npcPreDashY) * t;
          const expl = this.add.circle(ex, ey, 22, 0xff4400, 0.7).setDepth(8);
          this.tweens.add({ targets: expl, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => expl.destroy() });
          if (Phaser.Math.Distance.Between(ex, ey, this.player.x, this.player.y) <= 50) {
            this.player.takeDamage(Phaser.Math.Between(5, 8));
            this.spawnHitFlash(this.player.x, this.player.y, 0xff4400);
          }
        });
      }
    }
    if (npcCastId === 'flame-body') {
      this.npcFlameBodyActive = !this.npcFlameBodyActive;
      this.npcFlameBodyTickAccum = 0;
      if (this.npcFlameBodyActive) {
        this.npcFlameBodyAura = this.add.circle(this.npc.x, this.npc.y, 30, 0xff6600, 0.25).setDepth(3);
      } else {
        if (this.npcFlameBodyAura) { this.npcFlameBodyAura.destroy(); this.npcFlameBodyAura = null; }
      }
    }
    if (npcCastId === 'thorn-drag') {
      this.npcThornDragActiveUntil = time + 2000;
      this.npcThornDragTickAccum = 0;
      this.npcThornDragAura = this.add.circle(this.npc.x, this.npc.y, 30, 0x44ff44, 0.3).setDepth(3);
    }
    if (npcCastId === 'quick-shot') {
      this.npcQuickShotCharged = true;
    }
    if (npcCastId === 'charged-beam') {
      this.npcAirConsecutiveHits = 0;
    }
    } // end !isPvP else

    // ── Ice per-frame ─────────────────────────────────────────────
    if (this.elementId === 'ice' || this.npcElement.id === 'ice') {
      // Icy trail ticks: slow enemy + inflict frost/void-frost stacks + F+ owner speed boost
      for (let ti = this.icyTrails.length - 1; ti >= 0; ti--) {
        const trail = this.icyTrails[ti];
        if (time >= trail.expiresAt) {
          trail.sprite.destroy();
          this.icyTrails.splice(ti, 1);
          continue;
        }
        // Slow the enemy standing in the trail
        const enemyTarget = trail.owner === 'player' ? this.npc : this.player;
        const trailDist = Phaser.Math.Distance.Between(trail.x, trail.y, enemyTarget.x, enemyTarget.y);
        if (trailDist <= trail.radius) {
          if (trail.owner === 'player') {
            // Void frost trails don't slow — regular frost trails do
            if (!this.playerBlackIceMorphActive) this.npcSpeedMult *= 0.8;
            // Frost/void-frost tick every 1200ms
            trail.frostTickAccum += delta;
            if (trail.frostTickAccum >= 1200) {
              trail.frostTickAccum -= 1200;
              this.addFrostStack('npc');
            }
          } else {
            // Player slow — movement already applied, directly scale current velocity
            const trailPlayerBody = this.player.body as Phaser.Physics.Arcade.Body;
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
        if (this.hasUpgrade('f') && trail.owner === 'player') {
          const ownerDist = Phaser.Math.Distance.Between(trail.x, trail.y, this.player.x, this.player.y);
          if (ownerDist <= trail.radius) {
            this.playerIceSpeedBoostUntil = Math.max(this.playerIceSpeedBoostUntil, time + 3000);
          }
        }
      }

      // Void frost DOT + thaw (black ice morph)
      if (this.npcVoidFrostStacks > 0) {
        const vfDps = this.npcVoidFrostStacks >= 5 ? 4 : this.npcVoidFrostStacks >= 3 ? 2 : 1;
        this.npcVoidFrostTickAccum += delta;
        if (this.npcVoidFrostTickAccum >= 1000) {
          this.npcVoidFrostTickAccum -= 1000;
          this.npc.takeDamage(vfDps);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0x9900ff);
        }
        // Thaw: 1 stack every 3 seconds
        this.npcVoidFrostThawAccum += delta;
        if (this.npcVoidFrostThawAccum >= 3000) {
          this.npcVoidFrostThawAccum -= 3000;
          this.npcVoidFrostStacks = Math.max(0, this.npcVoidFrostStacks - 1);
          this.npc.incomingDamageMultiplier = this.npcVoidFrostStacks > 0
            ? this.frostDamageMultiplier(this.npcVoidFrostStacks) : 1;
        }
      }

      // Voided debuff DOT
      if (this.npcVoidedUntil > time) {
        this.npcVoidedTickAccum += delta;
        if (this.npcVoidedTickAccum >= 1000) {
          this.npcVoidedTickAccum -= 1000;
          this.npc.takeDamage(this.npcVoidedDps);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0x6600cc);
        }
      }

      // Frost visual indicators above fighters
      const frostNpcLabel = this.npcFrostStacks > 0 ? `❄️×${this.npcFrostStacks}` : '';
      if (frostNpcLabel) {
        if (!this.npcFrostVisual) {
          this.npcFrostVisual = this.add.text(this.npc.x, this.npc.y - 42, frostNpcLabel,
            { fontSize: '12px', fontFamily: 'Arial', color: '#aaddff' }).setOrigin(0.5).setDepth(10);
        } else {
          this.npcFrostVisual.setText(frostNpcLabel).setPosition(this.npc.x, this.npc.y - 42);
        }
      } else if (this.npcFrostVisual) {
        this.npcFrostVisual.destroy(); this.npcFrostVisual = null;
      }

      // Void frost visual
      const vfLabel = this.npcVoidFrostStacks > 0 ? `☠️×${this.npcVoidFrostStacks}` : '';
      if (vfLabel) {
        if (!this.npcVoidFrostVisual) {
          this.npcVoidFrostVisual = this.add.text(this.npc.x, this.npc.y - 54, vfLabel,
            { fontSize: '12px', fontFamily: 'Arial', color: '#cc88ff' }).setOrigin(0.5).setDepth(10);
        } else {
          this.npcVoidFrostVisual.setText(vfLabel).setPosition(this.npc.x, this.npc.y - 54);
        }
      } else if (this.npcVoidFrostVisual) {
        this.npcVoidFrostVisual.destroy(); this.npcVoidFrostVisual = null;
      }

      // Voided status visual
      const voidedLabel = this.npcVoidedUntil > time ? '🔮 VOIDED' : '';
      if (voidedLabel) {
        if (!this.npcVoidedVisual) {
          this.npcVoidedVisual = this.add.text(this.npc.x, this.npc.y - 66, voidedLabel,
            { fontSize: '10px', fontFamily: 'Arial', color: '#cc66ff' }).setOrigin(0.5).setDepth(10);
        } else {
          this.npcVoidedVisual.setPosition(this.npc.x, this.npc.y - 66);
        }
      } else if (this.npcVoidedVisual) {
        this.npcVoidedVisual.destroy(); this.npcVoidedVisual = null;
      }

      const frostPlayerLabel = this.playerFrostStacks > 0 ? `❄️×${this.playerFrostStacks}` : '';
      if (frostPlayerLabel) {
        if (!this.playerFrostVisual) {
          this.playerFrostVisual = this.add.text(this.player.x, this.player.y - 42, frostPlayerLabel,
            { fontSize: '12px', fontFamily: 'Arial', color: '#aaddff' }).setOrigin(0.5).setDepth(10);
        } else {
          this.playerFrostVisual.setText(frostPlayerLabel).setPosition(this.player.x, this.player.y - 42);
        }
      } else if (this.playerFrostVisual) {
        this.playerFrostVisual.destroy(); this.playerFrostVisual = null;
      }

      // Block up aura positions
      if (this.playerBlockUpAura) this.playerBlockUpAura.setPosition(this.player.x, this.player.y);
      if (this.npcBlockUpAura) this.npcBlockUpAura.setPosition(this.npc.x, this.npc.y);
      if (this.playerBlackIceAura) this.playerBlackIceAura.setPosition(this.player.x, this.player.y);

      // Frozen overlays (blue tint flash)
      if (this.playerFrozenUntil > 0 && time >= this.playerFrozenUntil) {
        this.playerFrozenUntil = 0;
      }
      if (this.npcFrozenUntil > 0 && time >= this.npcFrozenUntil) {
        this.npcFrozenUntil = 0;
      }
    }

    // ── Shadow NPC overrides (after doAI so they take effect) ──────
    if (this.elementId === 'shadow') {
      const nBody = this.npc.body as Phaser.Physics.Arcade.Body;

      // Black hole: pull NPC toward player
      if (this.shadowBlackHoleActive && time < this.shadowBlackHoleEnd) {
        const bDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        if (bDist > 12) {
          const bAngle = Math.atan2(this.player.y - this.npc.y, this.player.x - this.npc.x);
          nBody.setVelocity(Math.cos(bAngle) * 67, Math.sin(bAngle) * 67);
        } else {
          nBody.setVelocity(0, 0);
        }
      }

      // Tentacle: drag NPC toward cursor
      if (this.shadowTentacleHooked && this.shadowTentacleActive) {
        // E+ consume trigger: NPC dragged to player
        if (this.hasUpgrade('e') && !this.shadowConsumeActive) {
          const cDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (cDist <= 22) {
            this.shadowConsumeActive = true;
            this.shadowConsumeEnd = time + 3000;
            this.shadowConsumeTickAccum = 0;
            this.shadowTentacleActive = false;
            this.shadowTentacleHooked = false;
            if (this.shadowTentacleSprite) { this.shadowTentacleSprite.destroy(); this.shadowTentacleSprite = null; }
            if (this.shadowConsumeAura) this.shadowConsumeAura.destroy();
            this.shadowConsumeAura = this.add.circle(this.player.x, this.player.y, 30, 0x8800cc, 0.4).setDepth(7);
            this.tweens.add({ targets: this.shadowConsumeAura, alpha: 0.85, yoyo: true, repeat: -1, duration: 180 });
          }
        }
        if (!this.shadowConsumeActive) {
          const tMx = this.input.activePointer.worldX;
          const tMy = this.input.activePointer.worldY;
          const dragDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, tMx, tMy);
          if (dragDist > 20) {
            const dragAngle = Math.atan2(tMy - this.npc.y, tMx - this.npc.x);
            nBody.setVelocity(Math.cos(dragAngle) * 200, Math.sin(dragAngle) * 200);
          } else {
            nBody.setVelocity(0, 0);
          }
        }
      }

      // E+ consume: NPC held at player position, taking damage
      if (this.shadowConsumeActive) {
        const cBody = this.npc.body as Phaser.Physics.Arcade.Body;
        if (time >= this.shadowConsumeEnd) {
          this.shadowConsumeActive = false;
          if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
        } else {
          cBody.reset(this.player.x, this.player.y);
          cBody.setVelocity(0, 0);
          if (this.shadowConsumeAura) this.shadowConsumeAura.setPosition(this.player.x, this.player.y);
          this.shadowConsumeTickAccum += delta;
          if (this.shadowConsumeTickAccum >= 1000) {
            this.shadowConsumeTickAccum -= 1000;
            this.npc.takeDamage(2);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0x8800cc);
          }
        }
      }

      // Stun from snap trap
      if (time < this.shadowNpcStunnedUntil) nBody.setVelocity(0, 0);

      // Click+ confusion: random movement
      if (this.hasUpgrade('click') && time < this.shadowConfusionUntil) {
        if (time >= this.shadowConfusionNextChange) {
          this.shadowConfusionAngle = Math.random() * Math.PI * 2;
          this.shadowConfusionNextChange = time + Phaser.Math.Between(400, 800);
        }
        const confBody = this.npc.body as Phaser.Physics.Arcade.Body;
        confBody.setVelocity(
          Math.cos(this.shadowConfusionAngle) * 130 * this.npcSpeedMult,
          Math.sin(this.shadowConfusionAngle) * 130 * this.npcSpeedMult,
        );
      }
    }

    // ── Frozen NPC override (ice element) ────────────────────────
    if (this.npcFrozenUntil > time) {
      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }

    // ── Growth per-frame ─────────────────────────────────────────
    if (this.elementId === 'growth' || this.npcElement.id === 'growth') {
      // Toxic DOT — NPC
      if (this.npcToxicUntil > time) {
        if (!this.npcToxicAura) {
          this.npcToxicAura = this.add.circle(this.npc.x, this.npc.y, 26, 0x88bb22, 0.3).setDepth(7);
        }
        this.npcToxicAura.setPosition(this.npc.x, this.npc.y);
        this.npcToxicTickAccum += delta;
        if (this.npcToxicTickAccum >= 1000) {
          this.npcToxicTickAccum -= 1000;
          this.npc.takeDamage(this.npcToxicDps);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0x88bb22);
        }
      } else {
        this.npcToxicTickAccum = 0;
        if (this.npcToxicAura) { this.npcToxicAura.destroy(); this.npcToxicAura = null; }
      }

      // Toxic DOT — player
      if (this.playerToxicUntil > time) {
        if (!this.playerToxicAura) {
          this.playerToxicAura = this.add.circle(this.player.x, this.player.y, 26, 0x88bb22, 0.3).setDepth(7);
        }
        this.playerToxicAura.setPosition(this.player.x, this.player.y);
        this.playerToxicTickAccum += delta;
        if (this.playerToxicTickAccum >= 1000) {
          this.playerToxicTickAccum -= 1000;
          this.player.applySelfDamage(this.playerToxicDps);
          this.spawnHitFlash(this.player.x, this.player.y, 0x88bb22);
        }
      } else {
        this.playerToxicTickAccum = 0;
        if (this.playerToxicAura) { this.playerToxicAura.destroy(); this.playerToxicAura = null; }
      }

      // Bloat aura positions + expiry
      if (this.growthBloatActive) {
        if (time >= this.growthBloatEnd) {
          this.growthBloatActive = false;
          if (this.growthBloatAura) { this.growthBloatAura.destroy(); this.growthBloatAura = null; }
        } else if (this.growthBloatAura) {
          this.growthBloatAura.setPosition(this.player.x, this.player.y);
        }
      }
      if (this.npcGrowthBloatActive) {
        if (time >= this.npcGrowthBloatEnd) {
          this.npcGrowthBloatActive = false;
          if (this.npcGrowthBloatAura) { this.npcGrowthBloatAura.destroy(); this.npcGrowthBloatAura = null; }
        } else if (this.npcGrowthBloatAura) {
          this.npcGrowthBloatAura.setPosition(this.npc.x, this.npc.y);
        }
      }

      // Regeneration — player
      if (this.growthRegenRate > 0) {
        this.growthRegenAccum += delta;
        const regenInterval = 1000 / this.growthRegenRate;
        while (this.growthRegenAccum >= regenInterval) {
          this.growthRegenAccum -= regenInterval;
          this.player.heal(1);
        }
      }
      // Regeneration — NPC
      if (this.npcGrowthRegenRate > 0) {
        this.npcGrowthRegenAccum += delta;
        const npcRegenInterval = 1000 / this.npcGrowthRegenRate;
        while (this.npcGrowthRegenAccum >= npcRegenInterval) {
          this.npcGrowthRegenAccum -= npcRegenInterval;
          this.npc.heal(1);
        }
      }

      // Player-only growth upgrade effects
      if (this.elementId === 'growth') {
        // E+ auto-pick: hold E to auto-select mutation when off cooldown
        if (this.hasUpgrade('e') && this.eKey.isDown && !this.growthMutateMenuOpen) {
          if (this.player.getCooldownRatio('mutate') >= 1) {
            const autoPool = [
              { id: 'healthier', name: 'Healthier', emoji: '💚' },
              { id: 'deadly', name: 'Deadly', emoji: '💀' },
              { id: 'linger', name: 'Linger', emoji: '⏳' },
              { id: 'viral', name: 'Viral', emoji: '🧬' },
              { id: 'grow', name: 'Grow', emoji: '📈' },
              { id: 'shrink', name: 'Shrink', emoji: '📉' },
              { id: 'buffer', name: 'Buffer', emoji: '🛡️' },
              { id: 'spray', name: 'Spray', emoji: '🗡️' },
              { id: 'quick', name: 'Quick', emoji: '⚡' },
              { id: 'regenerative', name: 'Regenerative', emoji: '♻️' },
              { id: 'chunk', name: 'Chunk', emoji: '💥' },
              { id: 'relapse', name: 'Relapse', emoji: '↩️' },
              { id: 'gene-enhance', name: 'Gene Enhance', emoji: '🧪' },
              { id: 'spread', name: 'Spread', emoji: '🌿' },
              { id: 'uber-infect', name: 'Uber-Infect', emoji: '🔬' },
              { id: 'fungal-flourish', name: 'Fungal Flourish', emoji: '🍄' },
              { id: 'greed', name: 'Greed', emoji: '🤑' },
              { id: 'sneeze', name: 'Sneeze', emoji: '🤧' },
              { id: 'cough', name: 'Cough', emoji: '😷' },
            ];
            const picked = autoPool[Math.floor(Math.random() * autoPool.length)];
            this.applyGrowthMutation(picked.id, 'player');
            this.player.triggerCooldown('mutate');
            const ft = this.add.text(this.player.x, this.player.y - 45, `${picked.emoji} ${picked.name}!`, { fontSize: '12px', color: '#aadd44', fontFamily: 'Arial Black', stroke: '#003300', strokeThickness: 2 }).setOrigin(0.5).setDepth(15);
            this.tweens.add({ targets: ft, y: ft.y - 30, alpha: 0, duration: 1200, onComplete: () => ft.destroy() });
          }
        }

        // Sneeze aura — tick damage to nearby NPC
        if (this.growthSneezeStacks > 0) {
          if (!this.growthSneezeAura) {
            this.growthSneezeAura = this.add.circle(this.player.x, this.player.y, 120, 0x44cc22, 0.12)
              .setStrokeStyle(1, 0x88ff44, 0.4).setDepth(3);
          }
          this.growthSneezeAura.setPosition(this.player.x, this.player.y);
          this.growthSneezeAccum += delta;
          if (this.growthSneezeAccum >= 1000) {
            this.growthSneezeAccum -= 1000;
            const sneezeDmg = this.growthSneezeStacks;
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 120) {
              this.npc.takeDamage(sneezeDmg);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x88ff44);
              const ft = this.add.text(this.npc.x, this.npc.y - 20, `🤧 ${sneezeDmg}`, { fontSize: '10px', color: '#88ff44' }).setOrigin(0.5).setDepth(12);
              this.tweens.add({ targets: ft, y: ft.y - 15, alpha: 0, duration: 700, onComplete: () => ft.destroy() });
            }
          }
        } else if (this.growthSneezeAura) {
          this.growthSneezeAura.destroy(); this.growthSneezeAura = null;
        }

        // Cough aura — position update
        if (this.growthCoughStacks > 0) {
          if (!this.growthCoughAura) {
            this.growthCoughAura = this.add.circle(this.player.x, this.player.y, 120, 0xdddd00, 0.12)
              .setStrokeStyle(1, 0xffff44, 0.4).setDepth(3);
          }
          this.growthCoughAura.setPosition(this.player.x, this.player.y);
        } else if (this.growthCoughAura) {
          this.growthCoughAura.destroy(); this.growthCoughAura = null;
        }

        // Bacteria — move toward NPC, contact damage, take damage from NPC projectiles
        for (let bi = this.growthBacteriaList.length - 1; bi >= 0; bi--) {
          const bac = this.growthBacteriaList[bi];
          if (!bac.sprite.active || bac.hp <= 0) {
            if (bac.sprite.active) bac.sprite.destroy();
            this.growthBacteriaList.splice(bi, 1);
            continue;
          }
          const bdist = Phaser.Math.Distance.Between(bac.sprite.x, bac.sprite.y, this.npc.x, this.npc.y);
          if (bdist > 18) {
            const speed = 150 * (delta / 1000);
            bac.sprite.x += ((this.npc.x - bac.sprite.x) / bdist) * speed;
            bac.sprite.y += ((this.npc.y - bac.sprite.y) / bdist) * speed;
          } else if (time - bac.lastContactTime >= 1000) {
            bac.lastContactTime = time;
            this.npc.takeDamage(5);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0x55cc22);
            const ft = this.add.text(this.npc.x, this.npc.y - 20, '🦠 5', { fontSize: '10px', color: '#88ff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
            this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 700, onComplete: () => ft.destroy() });
          }
          // NPC projectile hits bacteria
          for (const child of this.projectiles.getChildren()) {
            const p = child as Projectile;
            if (!p.active || p.isFromPlayer) continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, bac.sprite.x, bac.sprite.y) <= 12) {
              bac.hp -= p.damage;
              p.setActive(false).setVisible(false);
              (p.body as Phaser.Physics.Arcade.Body).stop();
              this.spawnHitFlash(bac.sprite.x, bac.sprite.y, 0xff4444);
              if (bac.hp <= 0) {
                bac.sprite.destroy();
                this.growthBacteriaList.splice(bi, 1);
              }
              break;
            }
          }
        }

        // Infect wall bounce (Relapse)
        if (this.growthInfectBouncers.length > 0) {
          const W = this.scale.width;
          const H = this.scale.height;
          for (let ri = this.growthInfectBouncers.length - 1; ri >= 0; ri--) {
            const entry = this.growthInfectBouncers[ri];
            if (!entry.proj.active) { this.growthInfectBouncers.splice(ri, 1); continue; }
            const body = entry.proj.body as Phaser.Physics.Arcade.Body;
            const atLeft  = entry.proj.x <= 12 && body.velocity.x < 0;
            const atRight = entry.proj.x >= W - 12 && body.velocity.x > 0;
            const atTop   = entry.proj.y <= 12 && body.velocity.y < 0;
            const atBot   = entry.proj.y >= H - 12 && body.velocity.y > 0;
            if (atLeft || atRight || atTop || atBot) {
              if (atLeft || atRight) body.velocity.x *= -1;
              if (atTop || atBot) body.velocity.y *= -1;
              entry.bouncesDone++;
              if (entry.bouncesDone >= this.growthInfectBounces) {
                this.growthInfectBouncers.splice(ri, 1);
              }
            }
          }
        }
      }
    }

    // ── Crystal per-frame ─────────────────────────────────────────
    if (this.elementId === 'crystal' || this.npcElement.id === 'crystal') {
      const BARRAGE_INTERVAL = 100; // 15 shots over 1.5s
      const allCrystals = [...this.crystalNodes, ...this.npcCrystalNodes];
      const allActiveProj = this.projectiles.getChildren();

      // Move crystal nodes (all nodes travel from spawn, stop at target unless E+)
      for (const node of [...this.crystalNodes, ...this.npcCrystalNodes]) {
        if (node.moving) {
          node.x += node.vx * (delta / 1000);
          node.y += node.vy * (delta / 1000);
          node.sprite.setPosition(node.x, node.y);
          // Stop at target (non-E+ base behavior)
          if (isFinite(node.targetX)) {
            const toTargetX = node.targetX - node.x, toTargetY = node.targetY - node.y;
            const pastTarget = (toTargetX * node.vx + toTargetY * node.vy) <= 0;
            if (pastTarget) {
              node.x = node.targetX; node.y = node.targetY;
              node.sprite.setPosition(node.x, node.y);
              node.vx = 0; node.vy = 0; node.moving = false;
            }
          }
          // Stop at arena bounds
          const W = this.scale.width, H = this.scale.height;
          if (node.x < 10 || node.x > W - 10 || node.y < 10 || node.y > H - 10) {
            node.x = Phaser.Math.Clamp(node.x, 10, W - 10);
            node.y = Phaser.Math.Clamp(node.y, 10, H - 10);
            node.sprite.setPosition(node.x, node.y);
            node.vx = 0; node.vy = 0; node.moving = false;
          }
        }
      }

      // Moving crystal nodes teleport through portals
      for (const node of this.crystalNodes) {
        if (!node.moving || this.crystalPortals.length < 2 || time - node.lastPortalTime < 500) continue;
        for (let pi = 0; pi < 2; pi++) {
          const gate = this.crystalPortals[pi];
          if (Phaser.Math.Distance.Between(node.x, node.y, gate.x, gate.y) <= 22) {
            const other = this.crystalPortals[1 - pi];
            node.x = other.x; node.y = other.y;
            node.sprite.setPosition(node.x, node.y);
            node.lastPortalTime = time;
            const flash = this.add.circle(other.x, other.y, 16, 0xcc88ff, 0.6).setDepth(9);
            this.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
            break;
          }
        }
      }
      for (const node of this.npcCrystalNodes) {
        if (!node.moving || this.npcCrystalPortals.length < 2 || time - node.lastPortalTime < 500) continue;
        for (let pi = 0; pi < 2; pi++) {
          const gate = this.npcCrystalPortals[pi];
          if (Phaser.Math.Distance.Between(node.x, node.y, gate.x, gate.y) <= 22) {
            const other = this.npcCrystalPortals[1 - pi];
            node.x = other.x; node.y = other.y;
            node.sprite.setPosition(node.x, node.y);
            node.lastPortalTime = time;
            break;
          }
        }
      }

      // Update player clone positions (rotated with player facing direction)
      const playerFacing = Math.atan2(mouseY - this.player.y, mouseX - this.player.x);
      const pfCos = Math.cos(playerFacing + Math.PI / 2), pfSin = Math.sin(playerFacing + Math.PI / 2);
      for (const cl of this.crystalClones) {
        cl.offsetX = cl.baseOffsetX * pfCos - cl.baseOffsetY * pfSin;
        cl.offsetY = cl.baseOffsetX * pfSin + cl.baseOffsetY * pfCos;
      }
      // Update NPC clone positions (rotated to face player)
      if (this.npcCrystalClones.length > 0) {
        const npcFacing = Math.atan2(this.player.y - this.npc.y, this.player.x - this.npc.x);
        const nfCos = Math.cos(npcFacing + Math.PI / 2), nfSin = Math.sin(npcFacing + Math.PI / 2);
        for (const cl of this.npcCrystalClones) {
          cl.offsetX = cl.baseOffsetX * nfCos - cl.baseOffsetY * nfSin;
          cl.offsetY = cl.baseOffsetX * nfSin + cl.baseOffsetY * nfCos;
        }
      }

      // Laser aim preview: faint line showing beam path from player toward cursor
      if (this.elementId === 'crystal') {
        if (!this.crystalLaserPreviewGfx) {
          this.crystalLaserPreviewGfx = this.add.graphics().setDepth(14);
        }
        this.crystalLaserPreviewGfx.clear();
        const previewSegs = this.computeCrystalPreviewSegments(this.player.x, this.player.y, mouseX, mouseY, true);
        for (let si = 0; si < previewSegs.length; si++) {
          const alpha = Math.max(0.08, 0.22 - si * 0.04);
          this.crystalLaserPreviewGfx.lineStyle(1.5, 0x88eeff, alpha);
          this.crystalLaserPreviewGfx.lineBetween(previewSegs[si].x1, previewSegs[si].y1, previewSegs[si].x2, previewSegs[si].y2);
        }
      }

      // Click+ shredder: continuous laser toward cursor (1 dmg/tick, 100ms interval)
      if (this.elementId === 'crystal' && this.crystalShredderActive) {
        this.crystalShredderTickAccum += delta;
        if (this.crystalShredderTickAccum >= 100) {
          this.crystalShredderTickAccum -= 100;
          this.fireCrystalLaserFrom(this.player.x, this.player.y, mouseX, mouseY, 1, true, true);
          for (const cl of this.crystalClones) {
            this.fireCrystalLaserFrom(this.player.x + cl.offsetX, this.player.y + cl.offsetY, mouseX, mouseY, 1, true, true);
          }
        }
      }

      // Expire beam mines
      for (let mi = this.crystalBeamMines.length - 1; mi >= 0; mi--) {
        const mine = this.crystalBeamMines[mi];
        if (time >= mine.expiresAt) {
          mine.sprite.destroy();
          this.crystalBeamMines.splice(mi, 1);
        } else {
          const tgt = mine.owner === 'player' ? this.npc : this.player;
          if (Phaser.Math.Distance.Between(mine.x, mine.y, tgt.x, tgt.y) <= 28) {
            tgt.takeDamage(4);
            this.spawnHitFlash(tgt.x, tgt.y, 0x88eeff);
            mine.sprite.destroy();
            this.crystalBeamMines.splice(mi, 1);
          }
        }
      }

      // Player barrage ticks
      if (this.crystalBarrageActive) {
        if (time >= this.crystalBarrageEnd || this.crystalBarrageShots >= 15) {
          this.crystalBarrageActive = false;
        } else {
          this.crystalBarrageAccum += delta;
          while (this.crystalBarrageAccum >= BARRAGE_INTERVAL && this.crystalBarrageShots < 15) {
            this.crystalBarrageAccum -= BARRAGE_INTERVAL;
            this.crystalBarrageShots++;
            // Q+: also shoot from 4th source (far right)
            const sources: { x: number; y: number }[] = [{ x: this.player.x, y: this.player.y }];
            for (const cl of this.crystalClones) sources.push({ x: this.player.x + cl.offsetX, y: this.player.y + cl.offsetY });
            if (this.hasUpgrade('q') && this.crystalClones.length > 0) {
              sources.push({ x: this.player.x + 80, y: this.player.y });
            }
            for (const src of sources) {
              const baseAngle = Math.atan2(this.crystalBarrageTY - src.y, this.crystalBarrageTX - src.x);
              const angle = baseAngle + (Math.random() - 0.5) * 0.85;
              const proj = new Projectile(this, src.x, src.y, 'proj-crystal-shard', 4, true);
              this.projectiles.add(proj);
              proj.launch(Math.cos(angle) * 430, Math.sin(angle) * 430);
              // R+: 1s after shard fires, explode in fireworks at its current position
              if (this.hasUpgrade('r')) {
                const trackedProj = proj;
                this.time.delayedCall(1000, () => {
                  if (!this.scene.isActive() || !trackedProj.active) return;
                  const fx = trackedProj.x, fy = trackedProj.y;
                  trackedProj.setActive(false).setVisible(false);
                  for (let fwi = 0; fwi < 4; fwi++) {
                    const fwa = (fwi / 4) * Math.PI * 2;
                    const fwp = new Projectile(this, fx, fy, 'proj-crystal-shard', 1, true);
                    this.projectiles.add(fwp);
                    fwp.launch(Math.cos(fwa) * 200, Math.sin(fwa) * 200);
                  }
                  const fwExp = this.add.circle(fx, fy, 8, 0xffee88, 0.8).setDepth(10);
                  this.tweens.add({ targets: fwExp, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => fwExp.destroy() });
                });
              }
            }
          }
        }
      }

      // NPC barrage ticks
      if (this.npcCrystalBarrageActive) {
        if (time >= this.npcCrystalBarrageEnd || this.npcCrystalBarrageShots >= 15) {
          this.npcCrystalBarrageActive = false;
        } else {
          this.npcCrystalBarrageAccum += delta;
          while (this.npcCrystalBarrageAccum >= BARRAGE_INTERVAL && this.npcCrystalBarrageShots < 15) {
            this.npcCrystalBarrageAccum -= BARRAGE_INTERVAL;
            this.npcCrystalBarrageShots++;
            const baseAngle = Math.atan2(this.npcCrystalBarrageTY - this.npc.y, this.npcCrystalBarrageTX - this.npc.x);
            const angle = baseAngle + (Math.random() - 0.5) * 0.85;
            const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-crystal-shard', 4, false);
            this.projectiles.add(proj);
            proj.launch(Math.cos(angle) * 430, Math.sin(angle) * 430);
            for (const cl of this.npcCrystalClones) {
              const cx = this.npc.x + cl.offsetX, cy = this.npc.y + cl.offsetY;
              const ca = Math.atan2(this.npcCrystalBarrageTY - cy, this.npcCrystalBarrageTX - cx) + (Math.random() - 0.5) * 0.85;
              const cp = new Projectile(this, cx, cy, 'proj-crystal-shard', 4, false);
              this.projectiles.add(cp);
              cp.launch(Math.cos(ca) * 430, Math.sin(ca) * 430);
            }
          }
        }
      }

      // Crystal shard hits crystal node → explosion
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.texture.key !== 'proj-crystal-shard') continue;
        for (const node of allCrystals) {
          if (Phaser.Math.Distance.Between(proj.x, proj.y, node.x, node.y) <= 18) {
            const tgt = proj.isFromPlayer ? this.npc : this.player;
            // R+ doubles the AOE range and damage when a barrage shard hits a crystal
            const isRUpgrade = proj.isFromPlayer && this.hasUpgrade('r');
            const aoeRange = isRUpgrade ? 120 : 60;
            const aoeDmg   = isRUpgrade ? 20  : 10;
            if (Phaser.Math.Distance.Between(node.x, node.y, tgt.x, tgt.y) <= aoeRange) {
              tgt.takeDamage(aoeDmg);
              this.spawnHitFlash(tgt.x, tgt.y, 0x88eeff);
            }
            const expScale = isRUpgrade ? 12 : 6;
            const exp = this.add.circle(node.x, node.y, 10, 0x88eeff, 0.5).setDepth(8);
            this.tweens.add({ targets: exp, scaleX: expScale, scaleY: expScale, alpha: 0, duration: 260, onComplete: () => exp.destroy() });
            this.tweens.add({ targets: node.sprite, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 90, yoyo: true });
            proj.setActive(false).setVisible(false);
            break;
          }
        }
      }

      // Portal teleportation — player
      if (this.crystalPortals.length === 2 && time - this.crystalPortalCooldown > 1000) {
        for (let pi = 0; pi < 2; pi++) {
          const gate = this.crystalPortals[pi];
          const other = this.crystalPortals[1 - pi];
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, gate.x, gate.y) <= 22) {
            this.player.setPosition(other.x, other.y);
            (playerBody).setVelocity(0, 0);
            this.crystalPortalCooldown = time;
            // F+: 20% speed boost for 3s
            if (this.hasUpgrade('f')) this.crystalPortalSpeedBuffUntil = time + 3000;
            const flash = this.add.circle(other.x, other.y, 22, 0xcc88ff, 0.7).setDepth(15);
            this.tweens.add({ targets: flash, scaleX: 2.5, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
            break;
          }
        }
      }

      // Portal teleportation — NPC
      if (this.npcCrystalPortals.length === 2 && time - this.npcCrystalPortalCooldown > 1000) {
        for (let pi = 0; pi < 2; pi++) {
          const gate = this.npcCrystalPortals[pi];
          const other = this.npcCrystalPortals[1 - pi];
          if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, gate.x, gate.y) <= 22) {
            this.npc.setPosition(other.x, other.y);
            (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            this.npcCrystalPortalCooldown = time;
            const flash = this.add.circle(other.x, other.y, 22, 0xcc88ff, 0.6).setDepth(15);
            this.tweens.add({ targets: flash, scaleX: 2.5, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
            break;
          }
        }
      }

      // Portal auto-aim cooldown tint: gray when on cooldown, original color when ready
      if (this.elementId === 'crystal') {
        const portalColors = [0xaa44ff, 0xff44aa];
        const onCd = time - this.crystalPortalLaserCooldown < 2000;
        for (let pi = 0; pi < this.crystalPortals.length; pi++) {
          const spr = this.crystalPortals[pi].sprite;
          if (onCd) {
            spr.setFillStyle(0x888888, 0.4).setStrokeStyle(3, 0x888888, 0.6);
          } else {
            spr.setFillStyle(portalColors[pi % 2], 0.5).setStrokeStyle(3, portalColors[pi % 2], 0.9);
          }
        }
      }

      // Player crystal clones — follow player, update HP bars, dir indicator, check incoming projectiles
      if (time > this.crystalTrickEnd && this.crystalClones.length > 0) {
        for (const cl of this.crystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
        this.crystalClones = [];
      } else {
        for (let ci = this.crystalClones.length - 1; ci >= 0; ci--) {
          const cl = this.crystalClones[ci];
          const cx = this.player.x + cl.offsetX, cy = this.player.y + cl.offsetY;
          cl.sprite.setPosition(cx, cy);
          cl.hpBg.setPosition(cx, cy - 28);
          const barW = Math.max(0, (cl.hp / cl.maxHp) * 30);
          cl.hpBar.setSize(barW, 4).setPosition(cx - 15 + barW / 2, cy - 28);
          // Dir indicator: rotate to face cursor
          const dirAngle = Math.atan2(mouseY - cy, mouseX - cx) * 180 / Math.PI + 90;
          cl.dirIndicator.setPosition(cx + Math.cos((dirAngle - 90) * Math.PI / 180) * 18, cy + Math.sin((dirAngle - 90) * Math.PI / 180) * 18).setAngle(dirAngle);
          // Check NPC projectile hits
          for (const go of allActiveProj) {
            const proj = go as Projectile;
            if (!proj.active || proj.isFromPlayer) continue;
            if (Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy) <= 20) {
              cl.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              if (cl.hp <= 0) {
                cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy();
                this.crystalClones.splice(ci, 1);
              }
              break;
            }
          }
        }
      }

      // NPC crystal clones — follow NPC, update dir indicator, check player projectile hits
      if (time > this.npcCrystalTrickEnd && this.npcCrystalClones.length > 0) {
        for (const cl of this.npcCrystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
        this.npcCrystalClones = [];
      } else {
        for (let ci = this.npcCrystalClones.length - 1; ci >= 0; ci--) {
          const cl = this.npcCrystalClones[ci];
          const cx = this.npc.x + cl.offsetX, cy = this.npc.y + cl.offsetY;
          cl.sprite.setPosition(cx, cy);
          cl.hpBg.setPosition(cx, cy - 28);
          const barW = Math.max(0, (cl.hp / cl.maxHp) * 30);
          cl.hpBar.setSize(barW, 4).setPosition(cx - 15 + barW / 2, cy - 28);
          // Dir indicator: face player
          const ndAngle = Math.atan2(this.player.y - cy, this.player.x - cx) * 180 / Math.PI + 90;
          cl.dirIndicator.setPosition(cx + Math.cos((ndAngle - 90) * Math.PI / 180) * 18, cy + Math.sin((ndAngle - 90) * Math.PI / 180) * 18).setAngle(ndAngle);
          for (const go of allActiveProj) {
            const proj = go as Projectile;
            if (!proj.active || !proj.isFromPlayer) continue;
            if (proj.texture.key === 'proj-crystal-shard') continue; // handled in shard-vs-node check
            if (Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy) <= 20) {
              cl.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              if (cl.hp <= 0) {
                cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy();
                this.npcCrystalClones.splice(ci, 1);
              }
              break;
            }
          }
        }
      }
    }

    // ── Soul per-frame ─────────────────────────────────────────────
    if (this.elementId === 'soul' || this.npcElement.id === 'soul') {
      // Update ghost counter UI
      if (this.soulGhostText) this.soulGhostText.setText(`👻 ${this.soulGhosts}`);

      // ── Haunt mode (Click+ upgrade) ───────────────────────────
      if (this.elementId === 'soul' && this.soulHauntActive) {
        // Update haunt visual position
        if (this.soulHauntVisual) this.soulHauntVisual.setPosition(this.player.x, this.player.y);
        // Drain 1 ghost every 2 seconds
        this.soulHauntDrainAccum += delta;
        if (this.soulHauntDrainAccum >= 2000) {
          this.soulHauntDrainAccum -= 2000;
          this.soulGhosts--;
          if (this.soulGhostText) this.soulGhostText.setText(`👻 ${this.soulGhosts}`);
          if (this.soulGhosts <= 0) {
            // Auto-exit haunt, no stun (ran out of souls)
            this.soulHauntActive = false;
            this.player.isInvincible = false;
            this.player.setAlpha(1);
            if (this.soulHauntVisual) { this.soulHauntVisual.destroy(); this.soulHauntVisual = null; }
            this.showFloatingText(this.player.x, this.player.y - 20, 'No Souls!', '#ccaaff');
          }
        }
      }

      // ── R+ drain hold logic ────────────────────────────────────
      if (this.elementId === 'soul' && this.soulDrainHolding) {
        if (this.soulDrainVisual) this.soulDrainVisual.setPosition(this.player.x, this.player.y);
        const holdMs = time - this.soulDrainHoldStart;
        // Drain 15 HP over 1.5s (10 HP/s), gain 1 ghost every 1.5s
        const tickInterval = 1500;
        if (time - this.soulDrainLastTick >= tickInterval) {
          this.soulDrainLastTick = time;
          const drain = 15;
          this.player.applySelfDamage(drain);
          this.soulGhosts++;
          if (this.soulGhostText) this.soulGhostText.setText(`👻 ${this.soulGhosts}`);
          this.showFloatingText(this.player.x, this.player.y - 20, '+1 👻', '#9944ff');
          // After 5s, start accumulating explosion damage from each drain tick
          if (holdMs >= 5000) {
            this.soulDrainExplosionDmg += drain;
          }
        }
        // Show explosion charge indicator after 5s
        if (holdMs >= 5000 && this.soulDrainVisual) {
          const chargeFrac = Math.min(1, (holdMs - 5000) / 4000);
          this.soulDrainVisual.setRadius(14 + chargeFrac * 20);
        }
      }

      // ── F+ corpse armor — remove when shield gone ──────────────
      if (this.elementId === 'soul' && this.soulCorpseArmorActive) {
        if (this.player.shieldHp <= 0) {
          this.soulCorpseArmorActive = false;
          if (this.soulCorpseArmorVisual) { this.soulCorpseArmorVisual.destroy(); this.soulCorpseArmorVisual = null; }
        } else if (this.soulCorpseArmorVisual) {
          this.soulCorpseArmorVisual.setPosition(this.player.x, this.player.y);
        }
      }

      // ── F+ banshee damage resistance (25% DR) ────────────────
      if (this.elementId === 'soul') {
        if (time < this.soulBansheeResistUntil) {
          // Only set if not already reduced by this buff
          if (this.player.incomingDamageMultiplier > 0.75) {
            this.player.incomingDamageMultiplier = 0.75;
          }
        } else if (this.soulBansheeResistUntil > 0 && this.player.incomingDamageMultiplier === 0.75) {
          // Restore when buff expires (only if we set it)
          this.player.incomingDamageMultiplier = 1;
        }
      }

      // ── NPC scared (fleeing) behavior ─────────────────────────
      if (this.elementId === 'soul' && time < this.npcScaredUntil && !this.isPvP) {
        const dx = this.npc.x - this.player.x;
        const dy = this.npc.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nBody = this.npc.body as Phaser.Physics.Arcade.Body;
        nBody.setVelocity((dx / dist) * this.npc.speed * this.npcSpeedMult * 1.1, (dy / dist) * this.npc.speed * this.npcSpeedMult * 1.1);
      }

      // ── E hold visual position + color by tier ─────────────────
      if (this.soulEHolding && this.soulEHoldVisual) {
        const holdMs = time - this.soulEHoldStart;
        const hasEUpgrade = this.hasUpgrade('e');
        const maxTierMs = hasEUpgrade ? 5000 : 2000;
        const holdFrac = Math.min(1, holdMs / maxTierMs);
        this.soulEHoldVisual.setPosition(this.player.x, this.player.y - 36);
        this.soulEHoldVisual.setRadius(8 + holdFrac * 14);
        let tierColor = 0xccaaff;
        if (hasEUpgrade && holdMs >= 5000)      tierColor = 0xffdd00; // necromancer: gold
        else if (hasEUpgrade && holdMs >= 4000)  tierColor = 0x88aa66; // corpse: green
        else if (holdMs >= 2000)                 tierColor = 0xffffff; // banshee
        else if (holdMs >= 1000)                 tierColor = 0x440077; // ghoul
        this.soulEHoldVisual.setFillStyle(tierColor, 0.6);
      }

      // ── Spirit Propel orbs — player ────────────��───────────────
      for (let i = this.playerSoulOrbs.length - 1; i >= 0; i--) {
        const orb = this.playerSoulOrbs[i];
        if (time >= orb.expiresAt) {
          orb.sprite.destroy();
          this.playerSoulOrbs.splice(i, 1);
          continue;
        }
        orb.x += orb.vx * delta / 1000;
        orb.y += orb.vy * delta / 1000;
        orb.sprite.setPosition(orb.x, orb.y);
        if (time - orb.lastContactTick >= 1000) {
          if (Phaser.Math.Distance.Between(orb.x, orb.y, this.npc.x, this.npc.y) <= 34) {
            this.npc.takeDamage(10);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xccaaff);
            this.soulGhosts++;
            orb.lastContactTick = time;
            this.showFloatingText(this.player.x, this.player.y - 30, '+1 👻', '#ccaaff');
          }
        }
      }

      // ── Spirit Propel orbs — NPC ───────────────────────────────
      for (let i = this.npcSoulOrbs.length - 1; i >= 0; i--) {
        const orb = this.npcSoulOrbs[i];
        if (time >= orb.expiresAt) {
          orb.sprite.destroy();
          this.npcSoulOrbs.splice(i, 1);
          continue;
        }
        orb.x += orb.vx * delta / 1000;
        orb.y += orb.vy * delta / 1000;
        orb.sprite.setPosition(orb.x, orb.y);
        if (time - orb.lastContactTick >= 1000) {
          if (Phaser.Math.Distance.Between(orb.x, orb.y, this.player.x, this.player.y) <= 34) {
            this.player.takeDamage(10);
            this.spawnHitFlash(this.player.x, this.player.y, 0x9966cc);
            this.npcSoulGhosts++;
            orb.lastContactTick = time;
          }
        }
      }

      // ── Soul summons — player ──────────────────────────────────
      for (let i = this.playerSoulSummons.length - 1; i >= 0; i--) {
        const gs = this.playerSoulSummons[i];
        if (gs.hp <= 0) { gs.sprite.destroy(); this.playerSoulSummons.splice(i, 1); continue; }
        this.updateSoulSummon(gs, this.npc, time, delta, true);
      }

      // ── Q+ knight collision check ──────────────────────────────
      if (this.elementId === 'soul' && this.hasUpgrade('q')) {
        const knights = this.playerSoulSummons.filter((s) => s.type === 'knight');
        for (let a = 0; a < knights.length; a++) {
          for (let b = a + 1; b < knights.length; b++) {
            const ka = knights[a], kb = knights[b];
            if (Phaser.Math.Distance.Between(ka.sprite.x, ka.sprite.y, kb.sprite.x, kb.sprite.y) <= 60) {
              // Explosion AOE
              const ex = (ka.sprite.x + kb.sprite.x) / 2;
              const ey = (ka.sprite.y + kb.sprite.y) / 2;
              const boom = this.add.circle(ex, ey, 10, 0xffaacc, 0.8).setDepth(9);
              this.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
              if (Phaser.Math.Distance.Between(ex, ey, this.npc.x, this.npc.y) <= 80) {
                this.npc.takeDamage(20);
                this.spawnHitFlash(this.npc.x, this.npc.y, 0xffaacc);
              }
              // Each knight gains +25% speed (stacking)
              ka.speedMult += 0.25;
              kb.speedMult += 0.25;
              this.showFloatingText(ex, ey - 20, 'Collision!', '#ffaacc');
              // Bounce away from each other to prevent repeated triggers
              const ang = Math.atan2(kb.sprite.y - ka.sprite.y, kb.sprite.x - ka.sprite.x);
              ka.dx = -Math.cos(ang);
              ka.dy = -Math.sin(ang);
              kb.dx = Math.cos(ang);
              kb.dy = Math.sin(ang);
            }
          }
        }
      }

      // ── Soul summons — NPC ─────────────────────────────────────
      for (let i = this.npcSoulSummons.length - 1; i >= 0; i--) {
        const gs = this.npcSoulSummons[i];
        if (gs.hp <= 0) { gs.sprite.destroy(); this.npcSoulSummons.splice(i, 1); continue; }
        this.updateSoulSummon(gs, this.player, time, delta, false);
      }
    }

    // ── Hunt per-frame ───────────────────────────────────────────
    if (this.elementId === 'hunt' || this.npc.element.id === 'hunt') {
      // Grenade hold visual (player)
      if (this.huntGrenadeHolding && this.huntGrenadeVisual) {
        const holdMs = time - this.huntGrenadeHoldStart;
        const gMaxFuse = this.hasUpgrade('e') ? 1500 : 3000;
        const holdFrac = Math.min(1, holdMs / gMaxFuse);
        const isHealGrenade = this.hasUpgrade('f') && this.huntBloodPactActive && time < this.huntBloodPactEnd;
        this.huntGrenadeVisual.setPosition(this.player.x, this.player.y);
        this.huntGrenadeVisual.setRadius(10 + holdFrac * 8);
        this.huntGrenadeVisual.setFillStyle(isHealGrenade ? 0x44cc44 : 0xff6600, 0.9);
        if (holdMs >= gMaxFuse) {
          // Auto-explode: heal grenade heals you, regular grenade self-damages
          if (isHealGrenade) {
            this.player.heal(10);
            this.showFloatingText(this.player.x, this.player.y - 20, '+10', '#44ff44');
            const ring = this.add.circle(this.player.x, this.player.y, 10, 0x44cc44, 0.8).setDepth(8);
            this.tweens.add({ targets: ring, scaleX: 8, scaleY: 8, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
          } else {
            this.spawnGrenadeExplosion(this.player.x, this.player.y, true, 'player');
          }
          this.huntGrenadeHolding = false;
          this.huntGrenadeVisual.destroy(); this.huntGrenadeVisual = null;
        }
      }

      // Grenade hold visual (P2 in PvP)
      if (this.isPvP && this.p2HuntGrenadeHolding && this.p2HuntGrenadeVisual) {
        const p2HoldMs = time - this.p2HuntGrenadeHoldStart;
        const p2HoldFrac = Math.min(1, p2HoldMs / 3000);
        this.p2HuntGrenadeVisual.setPosition(this.npc.x, this.npc.y);
        this.p2HuntGrenadeVisual.setRadius(10 + p2HoldFrac * 8);
        if (p2HoldMs >= 3000) {
          // Auto-explode with self-damage
          this.spawnGrenadeExplosion(this.npc.x, this.npc.y, true, 'npc');
          this.p2HuntGrenadeHolding = false;
          this.p2HuntGrenadeVisual.destroy(); this.p2HuntGrenadeVisual = null;
        }
      }

      // Grenades in flight — player
      for (let i = this.huntGrenades.length - 1; i >= 0; i--) {
        const g = this.huntGrenades[i];
        if (!g.stopped) {
          g.x += g.vx * delta / 1000;
          g.y += g.vy * delta / 1000;
          if (Phaser.Math.Distance.Between(g.startX, g.startY, g.x, g.y) >= 145) g.stopped = true;
          g.sprite.setPosition(g.x, g.y);
          // E+: shotgun pellet detonates grenade early
          if (this.hasUpgrade('e') && g.owner === 'player') {
            const projs = this.projectiles.getChildren();
            for (const go of projs) {
              const proj = go as unknown as Projectile;
              if (proj.active && proj.texture.key === 'proj-hunt-pellet') {
                if (Phaser.Math.Distance.Between(proj.x, proj.y, g.x, g.y) <= 20) {
                  g.explodeAt = time;
                  break;
                }
              }
            }
          }
        }
        if (time >= g.explodeAt) {
          this.spawnGrenadeExplosion(g.x, g.y, g.selfDamage, g.owner, g.isHealGrenade);
          g.sprite.destroy(); this.huntGrenades.splice(i, 1);
        }
      }

      // Grenades in flight — NPC
      for (let i = this.npcHuntGrenades.length - 1; i >= 0; i--) {
        const g = this.npcHuntGrenades[i];
        if (!g.stopped) {
          g.x += g.vx * delta / 1000;
          g.y += g.vy * delta / 1000;
          if (Phaser.Math.Distance.Between(g.startX, g.startY, g.x, g.y) >= 145) g.stopped = true;
          g.sprite.setPosition(g.x, g.y);
        }
        if (time >= g.explodeAt) {
          this.spawnGrenadeExplosion(g.x, g.y, g.selfDamage, g.owner);
          g.sprite.destroy(); this.npcHuntGrenades.splice(i, 1);
        }
      }

      // Hunter's Trail — enemy drops circles while trail active (player trail tracks NPC)
      if (this.huntTrailActive) {
        if (time > this.huntTrailEnd) {
          this.huntTrailActive = false;
        } else {
          this.huntTrailAccum += delta;
          if (this.huntTrailAccum >= 150) {
            this.huntTrailAccum -= 150;
            const s = this.add.circle(this.npc.x, this.npc.y, 30, 0xff4400, 0.18).setDepth(2);
            this.huntTrailCircles.push({ sprite: s, x: this.npc.x, y: this.npc.y, expiresAt: time + 3000 });
          }
        }
      }
      for (let i = this.huntTrailCircles.length - 1; i >= 0; i--) {
        const c = this.huntTrailCircles[i];
        if (time > c.expiresAt) { c.sprite.destroy(); this.huntTrailCircles.splice(i, 1); }
      }

      // NPC trail tracks player
      if (this.npcHuntTrailActive) {
        if (time > this.npcHuntTrailEnd) {
          this.npcHuntTrailActive = false;
        } else {
          this.npcHuntTrailAccum += delta;
          if (this.npcHuntTrailAccum >= 150) {
            this.npcHuntTrailAccum -= 150;
            const s = this.add.circle(this.player.x, this.player.y, 30, 0xcc4400, 0.15).setDepth(2);
            this.npcHuntTrailCircles.push({ sprite: s, x: this.player.x, y: this.player.y, expiresAt: time + 3000 });
          }
        }
      }
      for (let i = this.npcHuntTrailCircles.length - 1; i >= 0; i--) {
        const c = this.npcHuntTrailCircles[i];
        if (time > c.expiresAt) { c.sprite.destroy(); this.npcHuntTrailCircles.splice(i, 1); }
      }

      // Blood Pact aura — player
      if (this.huntBloodPactActive) {
        if (time > this.huntBloodPactEnd) {
          this.huntBloodPactActive = false;
          if (this.huntBloodPactAura) { this.huntBloodPactAura.destroy(); this.huntBloodPactAura = null; }
        } else if (this.huntBloodPactAura) {
          this.huntBloodPactAura.setPosition(this.player.x, this.player.y);
        }
      }
      // Blood Pact aura — NPC
      if (this.npcHuntBloodPactActive) {
        if (time > this.npcHuntBloodPactEnd) {
          this.npcHuntBloodPactActive = false;
          if (this.npcHuntBloodPactAura) { this.npcHuntBloodPactAura.destroy(); this.npcHuntBloodPactAura = null; }
        } else if (this.npcHuntBloodPactAura) {
          this.npcHuntBloodPactAura.setPosition(this.npc.x, this.npc.y);
        }
      }

      // Bleeding auras
      if (this.npcBleeding) {
        if (time > this.npcBleedingUntil) {
          this.npcBleeding = false;
          if (this.npcBleedAura) { this.npcBleedAura.destroy(); this.npcBleedAura = null; }
        } else if (this.npcBleedAura) {
          this.npcBleedAura.setPosition(this.npc.x, this.npc.y);
        }
      }
      if (this.playerBleeding) {
        if (time > this.playerBleedingUntil) {
          this.playerBleeding = false;
          if (this.playerBleedAura) { this.playerBleedAura.destroy(); this.playerBleedAura = null; }
        } else if (this.playerBleedAura) {
          this.playerBleedAura.setPosition(this.player.x, this.player.y);
        }
      }

      // Blood Moon — player (NPC bleeding gets chip damage + attack penalty tracked via aiState)
      if (this.huntBloodMoonActive) {
        if (time > this.huntBloodMoonEnd) {
          this.huntBloodMoonActive = false;
          if (this.huntBloodMoonFilter) { this.huntBloodMoonFilter.destroy(); this.huntBloodMoonFilter = null; }
        } else if (this.npcBleeding) {
          this.huntBloodMoonTickAccum += delta;
          if (this.huntBloodMoonTickAccum >= 2000) {
            this.huntBloodMoonTickAccum -= 2000;
            this.npc.takeDamage(5);
            if (this.hasUpgrade('f')) this.player.heal(3); // 50% lifesteal from blood moon ticks
            if (this.huntBloodPactActive && time < this.huntBloodPactEnd) this.player.heal(3);
          }
        }
      }
      // Blood Moon — NPC
      if (this.npcHuntBloodMoonActive) {
        if (time > this.npcHuntBloodMoonEnd) {
          this.npcHuntBloodMoonActive = false;
          if (this.npcHuntBloodMoonFilter) { this.npcHuntBloodMoonFilter.destroy(); this.npcHuntBloodMoonFilter = null; }
        } else if (this.playerBleeding) {
          this.npcHuntBloodMoonTickAccum += delta;
          if (this.npcHuntBloodMoonTickAccum >= 2000) {
            this.npcHuntBloodMoonTickAccum -= 2000;
            this.player.takeDamage(5);
            if (this.npcHuntBloodPactActive && time < this.npcHuntBloodPactEnd) this.npc.heal(3);
          }
        }
      }

      // Blood Hunt invincibility restore
      if (this.huntBloodHuntInvincUntil > 0 && time >= this.huntBloodHuntInvincUntil) {
        this.player.isInvincible = false;
        this.huntBloodHuntInvincUntil = 0;
      }

      // Blood Hunt R+: delayed teleport at 1s charge mark
      if (this.huntBloodHuntCharging && time >= this.huntBloodHuntChargeEnd) {
        this.huntBloodHuntCharging = false;
        const angle = Math.random() * Math.PI * 2;
        this.player.setPosition(this.npc.x + Math.cos(angle) * 60, this.npc.y + Math.sin(angle) * 60);
        this.npcHuntSlowUntil = time + 3000;
        this.npcHuntConfusedUntil = time + 3000;
        this.showFloatingText(this.npc.x, this.npc.y - 20, '😵 Confused!', '#ff8800');
        const roar = this.add.circle(this.player.x, this.player.y, 18, 0xff0000, 0.8).setDepth(9);
        this.tweens.add({ targets: roar, scaleX: 4, scaleY: 4, alpha: 0, duration: 800, onComplete: () => roar.destroy() });
        const roar2 = this.add.circle(this.player.x, this.player.y, 10, 0xffffff, 1).setDepth(10);
        this.tweens.add({ targets: roar2, scaleX: 3, scaleY: 3, alpha: 0, duration: 500, onComplete: () => roar2.destroy() });
      }

      // Explosive Leap — player (E+ = teleport at 1s mark)
      if (this.huntLeapActive) {
        if (this.hasUpgrade('e') && !this.huntLeapTeleported && time >= this.huntLeapEnd - 1000) {
          this.huntLeapTeleported = true;
          this.player.setPosition(this.huntLeapTargetX, this.huntLeapTargetY);
          // AoE explosion at 1s teleport mark
          const td = Phaser.Math.Distance.Between(this.huntLeapTargetX, this.huntLeapTargetY, this.npc.x, this.npc.y);
          if (td <= 120) {
            this.npc.takeDamage(30);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xff4400);
            if (this.huntBloodMoonActive && this.hasUpgrade('f')) this.player.heal(15);
            if (this.huntBloodPactActive && time < this.huntBloodPactEnd) this.player.heal(15);
          }
          const boomE = this.add.circle(this.huntLeapTargetX, this.huntLeapTargetY, 10, 0xff4400, 0.9).setDepth(9);
          this.tweens.add({ targets: boomE, scaleX: 12, scaleY: 12, alpha: 0, duration: 400, onComplete: () => boomE.destroy() });
        }
        if (time >= this.huntLeapEnd) {
          this.huntLeapActive = false;
          if (!this.huntLeapTeleported) {
            this.player.setPosition(this.huntLeapTargetX, this.huntLeapTargetY);
            const landDist = Phaser.Math.Distance.Between(this.huntLeapTargetX, this.huntLeapTargetY, this.npc.x, this.npc.y);
            if (landDist <= 120) {
              this.npc.takeDamage(30);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xff4400);
              if (this.huntBloodMoonActive && this.hasUpgrade('f')) this.player.heal(15);
              if (this.huntBloodPactActive && time < this.huntBloodPactEnd) this.player.heal(15);
            }
            const boom = this.add.circle(this.huntLeapTargetX, this.huntLeapTargetY, 10, 0xff4400, 0.9).setDepth(9);
            this.tweens.add({ targets: boom, scaleX: 12, scaleY: 12, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
            const boomC = this.add.circle(this.huntLeapTargetX, this.huntLeapTargetY, 6, 0xffcc00, 1).setDepth(10);
            this.tweens.add({ targets: boomC, scaleX: 4, scaleY: 4, alpha: 0, duration: 200, onComplete: () => boomC.destroy() });
          }
          this.player.isInvincible = false;
          this.player.setAlpha(1);
          this.nukeChanneling = false;
        }
      }

      // Explosive Leap — NPC lands
      if (this.npcHuntLeapActive && time >= this.npcHuntLeapEnd) {
        this.npcHuntLeapActive = false;
        this.npc.setPosition(this.npcHuntLeapTargetX, this.npcHuntLeapTargetY);
        this.npc.isInvincible = false;
        this.npc.setAlpha(1);
        const landDist2 = Phaser.Math.Distance.Between(this.npcHuntLeapTargetX, this.npcHuntLeapTargetY, this.player.x, this.player.y);
        if (landDist2 <= 120) {
          this.player.takeDamage(30);
          this.spawnHitFlash(this.player.x, this.player.y, 0xff4400);
          if (this.npcHuntBloodPactActive && time < this.npcHuntBloodPactEnd) this.npc.heal(15);
        }
        const boom2 = this.add.circle(this.npcHuntLeapTargetX, this.npcHuntLeapTargetY, 10, 0xff4400, 0.9).setDepth(9);
        this.tweens.add({ targets: boom2, scaleX: 12, scaleY: 12, alpha: 0, duration: 400, onComplete: () => boom2.destroy() });
      }

      // NPC confusion (R+ Blood Hunt)
      if (time < this.npcHuntConfusedUntil) {
        if (time > this.npcHuntConfuseDirUntil) {
          const confAngle = Math.random() * Math.PI * 2;
          this.npcHuntConfuseVx = Math.cos(confAngle) * this.npc.speed;
          this.npcHuntConfuseVy = Math.sin(confAngle) * this.npc.speed;
          this.npcHuntConfuseDirUntil = time + 450;
        }
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(
          this.npcHuntConfuseVx * this.npcSpeedMult,
          this.npcHuntConfuseVy * this.npcSpeedMult,
        );
      }

      // Bat Form per-frame
      if (this.huntBatFormActive) {
        if (time >= this.huntBatFormEnd) {
          this.huntBatFormActive = false;
          this.player.setScale(1.0);
          this.player.incomingDamageMultiplier = 0.65; // restore vampire DR
          (this.player.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
        }
      }

      // Vampire Drain per-frame
      if (this.huntVampireDrainActive) {
        if (time >= this.huntVampireDrainEnd) {
          this.huntVampireDrainActive = false;
          if (this.huntVampireDrainAura) { this.huntVampireDrainAura.destroy(); this.huntVampireDrainAura = null; }
        } else {
          if (this.huntVampireDrainAura) this.huntVampireDrainAura.setPosition(this.player.x, this.player.y);
          const drainDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (drainDist <= 90) {
            this.huntVampireDrainAccum += delta;
            if (this.huntVampireDrainAccum >= 1000) {
              this.huntVampireDrainAccum -= 1000;
              this.npc.takeDamage(6);
              this.player.heal(4);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc0033);
              this.showFloatingText(this.player.x, this.player.y - 16, '+4', '#ff6666');
            }
          } else {
            this.huntVampireDrainAccum = 0;
          }
        }
      }

      // Garlic Traps per-frame
      for (let i = this.huntGarlicTraps.length - 1; i >= 0; i--) {
        const trap = this.huntGarlicTraps[i];
        trap.sprite.setPosition(trap.x, trap.y);
        if (time >= trap.expiresAt) {
          trap.sprite.destroy();
          this.huntGarlicTraps.splice(i, 1);
          continue;
        }
        if (time >= trap.nextPulseAt) {
          trap.nextPulseAt = time + 2000;
          // Pulse visual
          const pulse = this.add.circle(trap.x, trap.y, 22, 0x44aa00, 0.4).setDepth(5);
          this.tweens.add({ targets: pulse, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 400, onComplete: () => pulse.destroy() });
          // Apply damage to opponent in range
          const target = trap.owner === 'player' ? this.npc : this.player;
          const trapDist = Phaser.Math.Distance.Between(trap.x, trap.y, target.x, target.y);
          if (trapDist <= 80) {
            const isBleed = trap.owner === 'player' ? this.npcBleeding : this.playerBleeding;
            const trapDmg = isBleed ? 16 : 8;
            target.takeDamage(trapDmg);
            this.spawnHitFlash(target.x, target.y, 0x88ff00);
            // E+: 25% slow for 3s
            if (this.hasUpgrade('e') && trap.owner === 'player') {
              this.npcHuntSlowUntil = Math.max(this.npcHuntSlowUntil, time + 3000);
              this.showFloatingText(this.npc.x, this.npc.y - 16, '🧄 Slowed!', '#88ff00');
            }
          }
        }
      }
    }

    // ── Time per-frame ───────────────────────────────────────────
    if (this.elementId === 'sand' || this.npcElement.id === 'sand') {
      // Record position snapshots every 100ms (keep last 4 seconds = 40 entries)
      this.posHistoryAccum += delta;
      while (this.posHistoryAccum >= 100) {
        this.posHistoryAccum -= 100;
        this.npcPosHistory.push({ x: this.npc.x, y: this.npc.y, t: time });
        this.playerPosHistory.push({ x: this.player.x, y: this.player.y, t: time });
        while (this.npcPosHistory.length > 40) this.npcPosHistory.shift();
        while (this.playerPosHistory.length > 40) this.playerPosHistory.shift();
      }

      // ── Player time ──
      if (this.elementId === 'sand') {
        // Timeless timeout — restore frozen projectiles and NPC
        if (this.timeTimelessActive && time >= this.timeTimelessEnd) {
          this.timeTimelessActive = false;
          // Restore frozen projectile velocities
          for (const [go, vel] of this.timeFreezeFrozenVelocities) {
            const proj = go as Projectile;
            if (proj.active) {
              (proj.body as Phaser.Physics.Arcade.Body).setVelocity(vel.vx, vel.vy);
            }
          }
          this.timeFreezeFrozenVelocities.clear();
        }

        // Keep projectiles frozen while Timeless is active (including newly-spawned ones)
        if (this.timeTimelessActive) {
          for (const child of this.projectiles.getChildren()) {
            const proj = child as Projectile;
            if (!proj.active) continue;
            const body = proj.body as Phaser.Physics.Arcade.Body;
            // Store velocity if not yet frozen (new projectile spawned after freeze start)
            if (!this.timeFreezeFrozenVelocities.has(proj)) {
              this.timeFreezeFrozenVelocities.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
            }
            body.setVelocity(0, 0);
          }
          // Keep NPC frozen in place
          const frozenNpcBody = this.npc.body as Phaser.Physics.Arcade.Body;
          frozenNpcBody.setVelocity(0, 0);
        }

        // Remain timeout: deal 80% of absorbed damage (0 if Glass Mode R+)
        if (this.timeRemainActive && time >= this.timeRemainEnd) {
          this.timeRemainActive = false;
          this.player.damageAbsorber = null;
          if (this.timeRemainAura) { this.timeRemainAura.destroy(); this.timeRemainAura = null; }
          if (!(this.timeGlassMode && this.hasUpgrade('r'))) {
            const finalDmg = Math.round(this.timeRemainAbsorbed * 0.8);
            if (finalDmg > 0) this.player.takeDamage(finalDmg);
          }
          this.timeRemainAbsorbed = 0;
        }
        if (this.timeRemainActive && this.timeRemainAura) this.timeRemainAura.setPosition(this.player.x, this.player.y);

        // Halt timeout + aura + projectile slowing
        if (this.timeHaltActive) {
          if (time >= this.timeHaltEnd) {
            this.timeHaltActive = false;
            this.timeHaltZoomMode = false;
            if (this.timeHaltAura) { this.timeHaltAura.destroy(); this.timeHaltAura = null; }
            // Restore all slowed/boosted projectiles
            for (const [proj, vel] of this.timeSlowedProjs) {
              if (proj.active) (proj.body as Phaser.Physics.Arcade.Body).setVelocity(vel.vx, vel.vy);
            }
            this.timeSlowedProjs.clear();
          } else {
            if (this.timeHaltAura) this.timeHaltAura.setPosition(this.player.x, this.player.y);
            if (this.timeHaltZoomMode) {
              // Zoom mode: boost projectiles by 50%, restore those that leave
              for (const child of this.projectiles.getChildren()) {
                const proj = child as Projectile;
                if (!proj.active) continue;
                const body = proj.body as Phaser.Physics.Arcade.Body;
                const inZone = Phaser.Math.Distance.Between(proj.x, proj.y, this.player.x, this.player.y) <= 120;
                if (inZone) {
                  if (!this.timeSlowedProjs.has(proj)) {
                    this.timeSlowedProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
                  }
                  const orig = this.timeSlowedProjs.get(proj)!;
                  body.setVelocity(orig.vx * 1.5, orig.vy * 1.5);
                } else if (this.timeSlowedProjs.has(proj)) {
                  const orig = this.timeSlowedProjs.get(proj)!;
                  body.setVelocity(orig.vx, orig.vy);
                  this.timeSlowedProjs.delete(proj);
                }
              }
            } else {
              // Halt mode: slow projectiles to 15%
              for (const child of this.projectiles.getChildren()) {
                const proj = child as Projectile;
                if (!proj.active) continue;
                const body = proj.body as Phaser.Physics.Arcade.Body;
                const inZone = Phaser.Math.Distance.Between(proj.x, proj.y, this.player.x, this.player.y) <= 120;
                if (inZone) {
                  if (!this.timeSlowedProjs.has(proj)) {
                    this.timeSlowedProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
                  }
                  const orig = this.timeSlowedProjs.get(proj)!;
                  body.setVelocity(orig.vx * 0.15, orig.vy * 0.15);
                } else if (this.timeSlowedProjs.has(proj)) {
                  const orig = this.timeSlowedProjs.get(proj)!;
                  body.setVelocity(orig.vx, orig.vy);
                  this.timeSlowedProjs.delete(proj);
                }
              }
            }
          }
        }

        // NPC teleporting back (from player's Time Warp)
        if (this.timeNpcTeleporting) {
          const elapsed = time - this.timeNpcTeleportStart;
          const progress = Math.min(1, elapsed / 1000);
          const nx = this.timeNpcTeleportFromX + (this.timeNpcTeleportToX - this.timeNpcTeleportFromX) * progress;
          const ny = this.timeNpcTeleportFromY + (this.timeNpcTeleportToY - this.timeNpcTeleportFromY) * progress;
          this.npc.setPosition(nx, ny);
          this.timeNpcTeleportPuddleAccum += delta;
          while (this.timeNpcTeleportPuddleAccum >= 200) {
            this.timeNpcTeleportPuddleAccum -= 200;
            this.spawnTimePuddle(nx, ny, 'player');
          }
          if (progress >= 1) this.timeNpcTeleporting = false;
        }

        // Timeless charge bar (above player)
        if (!this.timeTimelessChargeBar) {
          this.timeTimelessChargeBar = this.add.rectangle(
            this.player.x, this.player.y - 40, 0, 5, 0xffdd44, 0.85,
          ).setDepth(12).setOrigin(0, 0.5);
        }
        const tBarMaxW = 40;
        this.timeTimelessChargeBar.setPosition(this.player.x - tBarMaxW / 2, this.player.y - 40);
        this.timeTimelessChargeBar.setSize(Math.min(tBarMaxW, (this.timeTimelessCharge / 10000) * tBarMaxW), 5);

        // Charge Q from standing in player-owned time puddles
        if (!this.timeTimelessActive) {
          const inPuddle = this.timePuddles.some(
            (p) => p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
          );
          if (inPuddle) this.timeTimelessCharge = Math.min(10000, this.timeTimelessCharge + delta);
        }

        // Glass Mode aura follows player
        if (this.timeGlassMode && this.timeGlassModeAura) {
          this.timeGlassModeAura.setPosition(this.player.x, this.player.y);
        }

        // HP history for Q+ HP Rewind (record every 500ms, keep 8s)
        this.timeHpHistoryAccum += delta;
        while (this.timeHpHistoryAccum >= 500) {
          this.timeHpHistoryAccum -= 500;
          this.timeHpHistory.push({ t: time, hp: this.player.hp });
          while (this.timeHpHistory.length > 0 && time - this.timeHpHistory[0].t > 8000) {
            this.timeHpHistory.shift();
          }
        }

        // E+ Delayed Warp: drag NPC to saved position
        if (this.timeWarpTriggerPending && this.timeWarpSavedPos && !this.timeNpcTeleporting) {
          this.timeWarpTriggerPending = false;
          this.timeNpcTeleporting = true;
          this.timeNpcTeleportStart = time;
          this.timeNpcTeleportFromX = this.npc.x;
          this.timeNpcTeleportFromY = this.npc.y;
          this.timeNpcTeleportToX = this.timeWarpSavedPos.x;
          this.timeNpcTeleportToY = this.timeWarpSavedPos.y;
          this.timeNpcTeleportPuddleAccum = 0;
          this.timeWarpSavedPos = null;
          if (this.timeWarpSavedMarker) { this.timeWarpSavedMarker.destroy(); this.timeWarpSavedMarker = null; }
          this.showFloatingText(this.player.x, this.player.y - 32, '⏩ Drag!', '#ffdd44');
        }
      }

      // ── NPC time ──
      if (this.npcElement.id === 'sand') {
        // Timeless timeout
        if (this.npcTimeTimelessActive && time >= this.npcTimeTimelessEnd) {
          this.npcTimeTimelessActive = false;
          this.npc.cooldownMult = 1;
        }

        // Remain timeout
        if (this.npcTimeRemainActive && time >= this.npcTimeRemainEnd) {
          this.npcTimeRemainActive = false;
          this.npc.damageAbsorber = null;
          if (this.npcTimeRemainAura) { this.npcTimeRemainAura.destroy(); this.npcTimeRemainAura = null; }
          const npcFinalDmg = Math.round(this.npcTimeRemainAbsorbed * 0.8);
          if (npcFinalDmg > 0) this.npc.takeDamage(npcFinalDmg);
          this.npcTimeRemainAbsorbed = 0;
        }
        if (this.npcTimeRemainActive && this.npcTimeRemainAura) this.npcTimeRemainAura.setPosition(this.npc.x, this.npc.y);

        // Halt timeout + aura + projectile slowing (NPC zone)
        if (this.npcTimeHaltActive) {
          if (time >= this.npcTimeHaltEnd) {
            this.npcTimeHaltActive = false;
            if (this.npcTimeHaltAura) { this.npcTimeHaltAura.destroy(); this.npcTimeHaltAura = null; }
            for (const [proj, vel] of this.npcTimeSlowedProjs) {
              if (proj.active) (proj.body as Phaser.Physics.Arcade.Body).setVelocity(vel.vx, vel.vy);
            }
            this.npcTimeSlowedProjs.clear();
          } else {
            if (this.npcTimeHaltAura) this.npcTimeHaltAura.setPosition(this.npc.x, this.npc.y);
            for (const child of this.projectiles.getChildren()) {
              const proj = child as Projectile;
              if (!proj.active) continue;
              const body = proj.body as Phaser.Physics.Arcade.Body;
              const inZone = Phaser.Math.Distance.Between(proj.x, proj.y, this.npc.x, this.npc.y) <= 120;
              if (inZone) {
                if (!this.npcTimeSlowedProjs.has(proj)) {
                  this.npcTimeSlowedProjs.set(proj, { vx: body.velocity.x, vy: body.velocity.y });
                }
                const orig = this.npcTimeSlowedProjs.get(proj)!;
                body.setVelocity(orig.vx * 0.15, orig.vy * 0.15);
              } else if (this.npcTimeSlowedProjs.has(proj)) {
                const orig = this.npcTimeSlowedProjs.get(proj)!;
                body.setVelocity(orig.vx, orig.vy);
                this.npcTimeSlowedProjs.delete(proj);
              }
            }
          }
        }

        // Player teleporting back (from NPC's Time Warp)
        if (this.npcPlayerTeleporting) {
          const pElapsed = time - this.npcPlayerTeleportStart;
          const pProgress = Math.min(1, pElapsed / 1000);
          const px = this.npcPlayerTeleportFromX + (this.npcPlayerTeleportToX - this.npcPlayerTeleportFromX) * pProgress;
          const py = this.npcPlayerTeleportFromY + (this.npcPlayerTeleportToY - this.npcPlayerTeleportFromY) * pProgress;
          this.player.setPosition(px, py);
          this.npcPlayerTeleportPuddleAccum += delta;
          while (this.npcPlayerTeleportPuddleAccum >= 200) {
            this.npcPlayerTeleportPuddleAccum -= 200;
            this.spawnTimePuddle(px, py, 'npc');
          }
          if (pProgress >= 1) this.npcPlayerTeleporting = false;
        }

        // NPC barrage: fire time shards toward player (accelerates over 3s of continuous firing)
        // In PvP: driven by p2TimeBarrageActive (click held); in AI: auto-fires within range
        const npcBarrageReady = this.isPvP ? this.p2TimeBarrageActive && !this.npcTimeRemainActive
          : Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y) <= 400 && !this.npcTimeRemainActive;
        if (npcBarrageReady) {
          const nbElapsed = (time - this.npcTimeBarrageStart) / 1000;
          // PvP uses same acceleration curve as player (200→60ms over 3s); AI uses 200→80ms
          const nbInterval = this.isPvP ? Math.max(60, 200 - 140 * Math.min(1, nbElapsed / 3))
            : Math.max(80, 200 - 120 * Math.min(1, nbElapsed / 3));
          this.npcTimeBarrageAccum += delta;
          while (this.npcTimeBarrageAccum >= nbInterval) {
            this.npcTimeBarrageAccum -= nbInterval;
            const ndx = this.player.x - this.npc.x, ndy = this.player.y - this.npc.y;
            const nlen = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
            const nbSpeed = (300 + 200 * Math.min(1, nbElapsed / 3)) * (this.npcTimeHaltActive ? 2 : 1);
            const aimOff = this.isPvP ? 0 : (Math.random() * 2 - 1) * this.npcDifficulty.aimOffsetDeg * 0.6 * (Math.PI / 180);
            const spread = this.isPvP ? (Math.random() - 0.5) * 0.28 : (Math.random() - 0.5) * 0.18;
            const nAngle = Math.atan2(ndy, ndx) + aimOff + spread;
            const shardDmg = this.isPvP ? (this.npcTimeHaltActive ? 2 : 1) : 4;
            const nShard = new Projectile(this, this.npc.x, this.npc.y, 'proj-time-shard', shardDmg, false);
            this.projectiles.add(nShard);
            nShard.launch(Math.cos(nAngle) * nbSpeed, Math.sin(nAngle) * nbSpeed);
          }
        } else if (!this.isPvP) {
          // Reset barrage ramp when AI is out of range
          this.npcTimeBarrageStart = time;
          this.npcTimeBarrageAccum = 0;
        }

        // NPC timeless charge from standing in NPC puddles
        if (!this.npcTimeTimelessActive) {
          const npcInOwnPuddle = this.timePuddles.some(
            (p) => p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius,
          );
          if (npcInOwnPuddle) this.npcTimeTimelessCharge = Math.min(10000, this.npcTimeTimelessCharge + delta);
        }
      }

      // ── Time puddle tick/expire ──
      for (let i = this.timePuddles.length - 1; i >= 0; i--) {
        const p = this.timePuddles[i];
        if (time >= p.expiresAt) {
          p.sprite.destroy();
          this.timePuddles.splice(i, 1);
        }
      }
    }

    // ── Rebirth glow follows NPC ─────────────────────────────────
    if (this.npcRebirthGlow && this.npc.active) {
      this.npcRebirthGlow.setPosition(this.npc.x, this.npc.y);
    }

    // ── Clone AI ─────────────────────────────────────────────────
    if (this.clone && this.clone.active && !this.cloneDefeated) {
      // Speed mult for clone
      this.cloneSpeedMult = 1;
      if (this.cloneFlameBodyActive) this.cloneSpeedMult = 2;
      else if (time < this.cloneGeyserBuffUntil) this.cloneSpeedMult = 1.5;

      const cloneAiState: NpcAiState = {
        isLocked: this.cloneNukeChanneling || this.cloneEarthSlamActive,
        hasActiveGeyser: this.geysers.some((g) => g.owner === 'npc'),
        flameBodyActive: this.cloneFlameBodyActive,
        projectiles: this.projectiles,
        plantCount: this.npcPlants.length,
        thornDragActive: time < this.cloneThornDragActiveUntil,
        enemyNearPlant: this.npcPlants.some(
          (p) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
        ),
        windTrapActive: time < this.cloneWindTrapExpiry,
        chargedBeamReady: this.cloneAirConsecutiveHits >= 3,
        earthShieldHp: this.clone.shieldHp,
      };

      const cloneCastId = this.clone.doAI(
        this.player,
        (tx, ty) => this.buildCloneContext(tx, ty),
        time,
        cloneAiState,
      );

      if (cloneCastId === 'splash') { this.cloneSplashActiveUntil = time + 2000; this.cloneSplashDropAccum = 0; }
      if (cloneCastId === 'flame-body') {
        this.cloneFlameBodyActive = !this.cloneFlameBodyActive;
        this.cloneFlameBodyTickAccum = 0;
        if (this.cloneFlameBodyActive) {
          this.cloneFlameBodyAura = this.add.circle(this.clone.x, this.clone.y, 30, 0xff6600, 0.25).setDepth(3);
        } else if (this.cloneFlameBodyAura) {
          this.cloneFlameBodyAura.destroy(); this.cloneFlameBodyAura = null;
        }
      }
      if (cloneCastId === 'thorn-drag') {
        this.cloneThornDragActiveUntil = time + 2000;
        this.cloneThornDragTickAccum = 0;
        this.cloneThornDragAura = this.add.circle(this.clone.x, this.clone.y, 30, 0x44ff44, 0.3).setDepth(3);
      }
      if (cloneCastId === 'quick-shot') { this.cloneQuickShotCharged = true; }
      if (cloneCastId === 'charged-beam') { this.cloneAirConsecutiveHits = 0; }

      // Post-AI clone velocity
      if (this.cloneNukeChanneling) {
        if (time >= this.cloneNukeChannelEnd) this.cloneNukeChanneling = false;
        else (this.clone.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      } else if (this.cloneSpeedMult !== 1) {
        const cb = this.clone.body as Phaser.Physics.Arcade.Body;
        cb.velocity.x *= this.cloneSpeedMult;
        cb.velocity.y *= this.cloneSpeedMult;
      }

      // Clone flame body aura position
      if (this.cloneFlameBodyActive && this.cloneFlameBodyAura) {
        this.cloneFlameBodyAura.setPosition(this.clone.x, this.clone.y);
      }

      // Clone geyser buff check
      for (const g of this.geysers) {
        if (g.owner === 'npc' && Phaser.Math.Distance.Between(g.x, g.y, this.clone.x, this.clone.y) <= g.radius) {
          this.cloneGeyserBuffUntil = time + 2000;
        }
      }

      // Clone earth slam
      if (this.cloneEarthSlamActive) {
        if (time >= this.cloneEarthSlamEnd) {
          this.cloneEarthSlamActive = false;
        } else if (!this.cloneEarthSlamHitDealt) {
          const dist = Phaser.Math.Distance.Between(this.clone.x, this.clone.y, this.player.x, this.player.y);
          if (dist <= 60) {
            this.cloneEarthSlamHitDealt = true;
            const slamDmg = Math.max(10, Math.round(this.clone.shieldHp * 0.4));
            this.player.takeDamage(slamDmg);
            this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
            this.clone.shieldHp = Math.max(0, this.clone.shieldHp - slamDmg);
          }
        }
      }

      // Clone thorn drag on player
      if (time < this.cloneThornDragActiveUntil && !this.isDodging) {
        const tdx = this.clone.x - this.player.x;
        const tdy = this.clone.y - this.player.y;
        const tdLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const pb2 = this.player.body as Phaser.Physics.Arcade.Body;
        pb2.setVelocity((tdx / tdLen) * 220, (tdy / tdLen) * 220);
        this.cloneThornDragTickAccum += delta;
        if (this.cloneThornDragTickAccum >= 250) {
          this.cloneThornDragTickAccum -= 250;
          this.player.takeDamage(3);
          this.spawnHitFlash(this.player.x, this.player.y, 0x44cc44);
        }
        if (this.cloneThornDragAura) this.cloneThornDragAura.setPosition(this.clone.x, this.clone.y);
      } else if (this.cloneThornDragAura && time >= this.cloneThornDragActiveUntil) {
        this.cloneThornDragAura.destroy(); this.cloneThornDragAura = null;
      }

      // Clone wind trap on player
      if (time < this.cloneWindTrapExpiry && !this.isDodging) {
        const trapR = 80;
        const d = Phaser.Math.Distance.Between(this.cloneWindTrapX, this.cloneWindTrapY, this.player.x, this.player.y);
        if (d > trapR) {
          const ang = Phaser.Math.Angle.Between(this.cloneWindTrapX, this.cloneWindTrapY, this.player.x, this.player.y);
          this.player.setPosition(
            this.cloneWindTrapX + Math.cos(ang) * trapR,
            this.cloneWindTrapY + Math.sin(ang) * trapR,
          );
          const playerBodyWind = this.player.body as Phaser.Physics.Arcade.Body;
          const vDotN = playerBodyWind.velocity.x * Math.cos(ang) + playerBodyWind.velocity.y * Math.sin(ang);
          if (vDotN > 0) {
            playerBodyWind.velocity.x -= vDotN * Math.cos(ang);
            playerBodyWind.velocity.y -= vDotN * Math.sin(ang);
          }
        }
      } else if (this.cloneWindTrapSprite && time >= this.cloneWindTrapExpiry) {
        this.cloneWindTrapSprite.destroy(); this.cloneWindTrapSprite = null;
      }

      // Clone water splash drops near player
      if (this.npcElement.id === 'water' && time < this.cloneSplashActiveUntil) {
        this.cloneSplashDropAccum += delta;
        if (this.cloneSplashDropAccum >= 150) {
          this.cloneSplashDropAccum -= 150;
          const missRange = this.npcDifficulty.aimOffsetDeg * 2.2;
          const sx = this.player.x + Phaser.Math.Between(-missRange, missRange);
          const sy = this.player.y + Phaser.Math.Between(-missRange, missRange);
          const spr = this.add.circle(sx, sy, 36, 0x0066bb, 0.5).setDepth(2);
          this.puddles.push({ sprite: spr, expiresAt: time + 1000, x: sx, y: sy, radius: 36, tickAccum: 0, owner: 'npc' });
        }
      }
    }

    // ── Gravity per-frame ────────────────────────────────────────
    if (this.elementId === 'gravity' || this.npcElement.id === 'gravity') {
      // Space Slash telegraphs: resolve damage + knockback after 500ms delay
      for (let i = this.gravSlashes.length - 1; i >= 0; i--) {
        const sl = this.gravSlashes[i];
        if (time >= sl.fireAt) {
          sl.line.destroy();
          this.gravSlashes.splice(i, 1);
          const target = sl.owner === 'player' ? this.npc : this.player;
          const d = this.pointToSegmentDist(target.x, target.y, sl.x1, sl.y1, sl.x2, sl.y2);
          if (d <= 40) {
            target.takeDamage(sl.damage);
            this.spawnHitFlash(target.x, target.y, 0x8844cc);
            // Knockback in drag direction
            const kx = sl.x2 - sl.x1;
            const ky = sl.y2 - sl.y1;
            const klen = Math.hypot(kx, ky) || 1;
            (target.body as Phaser.Physics.Arcade.Body).setVelocity((kx / klen) * sl.knockback, (ky / klen) * sl.knockback);
          }
        }
      }

      // Meteor shadows: resolve when fireAt reached (skip frozen ones)
      for (let i = this.gravMeteorShadows.length - 1; i >= 0; i--) {
        const ms = this.gravMeteorShadows[i];
        if (ms.frozen) continue;
        if (time >= ms.fireAt) {
          ms.sprite.destroy();
          this.gravMeteorShadows.splice(i, 1);
          // Falling meteor visual
          const impactRing = this.add.circle(ms.x, ms.y, 10, 0xff8822, 0.9).setDepth(8);
          this.tweens.add({ targets: impactRing, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => impactRing.destroy() });
          const impactCore = this.add.circle(ms.x, ms.y, 7, 0xffffff, 0.95).setDepth(9);
          this.tweens.add({ targets: impactCore, scaleX: 3, scaleY: 3, alpha: 0, duration: 200, onComplete: () => impactCore.destroy() });
          // Small purple flash
          const gravFlash = this.add.circle(ms.x, ms.y, 8, 0x8844cc, 0.7).setDepth(7);
          this.tweens.add({ targets: gravFlash, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => gravFlash.destroy() });
          const target = ms.owner === 'player' ? this.npc : this.player;
          const dist = Phaser.Math.Distance.Between(ms.x, ms.y, target.x, target.y);
          if (dist <= ms.radius) {
            const dmg = dist <= ms.directHitRadius ? ms.damage + ms.directBonus : ms.damage;
            target.takeDamage(dmg);
            this.spawnHitFlash(target.x, target.y, 0xaa66ff);
          }
          // E+: 15% chance to leave a fire pool on impact
          if (ms.owner === 'player' && this.hasUpgrade('e') && Math.random() < 0.15) {
            const puddleSpr = this.add.circle(ms.x, ms.y, 35, 0xff4422, 0.55).setDepth(2)
              .setStrokeStyle(1, 0xff8844, 0.5);
            this.tweens.add({ targets: puddleSpr, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 });
            this.gravFirePuddles.push({ sprite: puddleSpr, expiresAt: time + 8000, x: ms.x, y: ms.y, radius: 35, tickAccum: 0, owner: 'player' });
          }
        }
      }

      // Grav Bomb hold drag: pull enemy toward cursor only if inside the vortex circle (runs after doAI)
      if (this.gravBombHolding) {
        const distToVortex = Phaser.Math.Distance.Between(this.gravBombLastX, this.gravBombLastY, this.npc.x, this.npc.y);
        if (distToVortex <= 120) {
          const gdx = this.gravBombLastX - this.npc.x;
          const gdy = this.gravBombLastY - this.npc.y;
          const gd = Math.hypot(gdx, gdy) || 1;
          const nb2 = this.npc.body as Phaser.Physics.Arcade.Body;
          nb2.velocity.x += (gdx / gd) * 55;
          nb2.velocity.y += (gdy / gd) * 55;
        }
      }

      // Space Slam: keep target locked at floor for a brief window
      if (time < this.gravSpaceSlamLockUntil) {
        const H = this.scale.height;
        this.npc.y = H - 40;
        const nb3 = this.npc.body as Phaser.Physics.Arcade.Body;
        nb3.velocity.y = Math.min(nb3.velocity.y, 0);
      }
      if (time < this.npcGravSpaceSlamLockUntil) {
        const H = this.scale.height;
        this.player.y = H - 40;
        const pb3 = this.player.body as Phaser.Physics.Arcade.Body;
        pb3.velocity.y = Math.min(pb3.velocity.y, 0);
      }

      // Lunar Landing: detonate when fireAt reached
      if (this.gravLunarShadow && time >= this.gravLunarFireAt) {
        const lsX = this.gravLunarShadow.x;
        const lsY = this.gravLunarShadow.y;
        const lsR = this.gravLunarRadius;
        this.gravLunarShadow.destroy();
        this.gravLunarShadow = null;

        // Massive impact visuals
        const bigRing = this.add.circle(lsX, lsY, 10, 0xff8822, 0.9).setDepth(9);
        this.tweens.add({ targets: bigRing, scaleX: lsR / 5, scaleY: lsR / 5, alpha: 0, duration: 600, onComplete: () => bigRing.destroy() });
        const bigCore = this.add.circle(lsX, lsY, 10, 0xffffff, 0.95).setDepth(10);
        this.tweens.add({ targets: bigCore, scaleX: 12, scaleY: 12, alpha: 0, duration: 300, onComplete: () => bigCore.destroy() });
        const gravPulse = this.add.circle(lsX, lsY, 12, 0x8844cc, 0.7).setDepth(8);
        this.tweens.add({ targets: gravPulse, scaleX: lsR / 6, scaleY: lsR / 6, alpha: 0, duration: 500, onComplete: () => gravPulse.destroy() });

        // Deal damage to enemy inside the shadow circle
        const target = this.gravLunarOwner === 'player' ? this.npc : this.player;
        if (Phaser.Math.Distance.Between(lsX, lsY, target.x, target.y) <= lsR) {
          target.takeDamage(60);
          this.spawnHitFlash(target.x, target.y, 0xaa66ff);
        }

        // Spawn 20 fire puddles randomly inside the shadow circle
        for (let pi = 0; pi < 20; pi++) {
          // Uniform random point in circle: use sqrt of uniform random for radius
          const r = lsR * 0.9 * Math.sqrt(Math.random());
          const angle = Math.random() * Math.PI * 2;
          const px = lsX + Math.cos(angle) * r;
          const py = lsY + Math.sin(angle) * r;
          const puddleSpr = this.add.circle(px, py, 35, 0xff4422, 0.55).setDepth(2)
            .setStrokeStyle(1, 0xff8844, 0.5);
          this.tweens.add({ targets: puddleSpr, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 });
          this.gravFirePuddles.push({ sprite: puddleSpr, expiresAt: time + 8000, x: px, y: py, radius: 35, tickAccum: 0, owner: this.gravLunarOwner });
        }
      }

      // Gravity Anchor (R+): tether enemy near anchor point
      if (this.gravAnchor) {
        const anc = this.gravAnchor;
        if (time >= anc.expireAt) {
          anc.sprite.destroy(); anc.line.destroy(); this.gravAnchor = null;
        } else {
          anc.line.setTo(anc.x, anc.y, this.npc.x, this.npc.y);
          const distToAnc = Phaser.Math.Distance.Between(anc.x, anc.y, this.npc.x, this.npc.y);
          const maxDist = 150;
          if (distToAnc > maxDist) {
            const pullDx = anc.x - this.npc.x;
            const pullDy = anc.y - this.npc.y;
            const pullLen = Math.hypot(pullDx, pullDy) || 1;
            const nb = this.npc.body as Phaser.Physics.Arcade.Body;
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
          const W = this.scale.width, H = this.scale.height;
          // Determine start position and velocity based on edge
          let startX = rs.clickX, startY = rs.clickY;
          let vx = 0, vy = 0;
          const rushSpeed = 900;
          if (rs.edge === 'top') { startX = rs.clickX; startY = -30; vy = rushSpeed; }
          else if (rs.edge === 'bottom') { startX = rs.clickX; startY = H + 30; vy = -rushSpeed; }
          else if (rs.edge === 'left') { startX = -30; startY = rs.clickY; vx = rushSpeed; }
          else { startX = W + 30; startY = rs.clickY; vx = -rushSpeed; }
          // Spawn as a fast-moving meteor projectile (manual movement)
          const rushSpr = this.add.circle(startX, startY, 23, 0xff8822, 0.9).setDepth(8)
            .setStrokeStyle(2, 0xffffff, 0.5);
          this.tweens.add({ targets: rushSpr, alpha: 0.7, yoyo: true, repeat: -1, duration: 100 });
          // Add to gravMeteorShadows as a fake live meteor that immediately impacts from its position
          // We'll track it manually with a special marker: use existing shadow with offset
          const fakeMs = { sprite: rushSpr as unknown as Phaser.GameObjects.Arc, fireAt: time + (rs.edge === 'top' || rs.edge === 'bottom' ? H / rushSpeed * 1000 : W / rushSpeed * 1000), x: startX, y: startY, owner: 'player' as const, damage: 14, radius: 70, directHitRadius: 28, directBonus: 16, frozen: false, vx, vy };
          // Move it manually each frame until it hits or leaves screen
          // Use a timer to move and check
          const rushInterval = this.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
              if (!rushSpr.active) { rushInterval.remove(); return; }
              rushSpr.x += vx * 0.016;
              rushSpr.y += vy * 0.016;
              if (rushSpr.x < -60 || rushSpr.x > W + 60 || rushSpr.y < -60 || rushSpr.y > H + 60) {
                rushSpr.destroy(); rushInterval.remove(); return;
              }
              const rushDist = Phaser.Math.Distance.Between(rushSpr.x, rushSpr.y, this.npc.x, this.npc.y);
              if (rushDist <= fakeMs.radius) {
                const dmg = rushDist <= fakeMs.directHitRadius ? fakeMs.damage + fakeMs.directBonus : fakeMs.damage;
                this.npc.takeDamage(dmg);
                this.spawnHitFlash(this.npc.x, this.npc.y, 0xaa66ff);
                // Impact visual
                const impRing = this.add.circle(rushSpr.x, rushSpr.y, 12, 0xff8822, 0.9).setDepth(8);
                this.tweens.add({ targets: impRing, scaleX: 6, scaleY: 6, alpha: 0, duration: 300, onComplete: () => impRing.destroy() });
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
        this.gravMoonSprite.setPosition(this.player.x, this.player.y + moonR + 8);
        if (this.gravMoonHpBg) this.gravMoonHpBg.setPosition(this.player.x, this.player.y + moonR * 2 + 18);
        if (this.gravMoonHpBar) {
          this.gravMoonHpBar.setPosition(this.player.x - 20, this.player.y + moonR * 2 + 18);
          this.gravMoonHpBar.setSize(40 * Math.max(0, this.gravMoonHp / 100), 4);
        }
        // Speed boost
        this.playerSpeedMult *= 1.25;
        // Ram: if moon overlaps enemy, launch them
        const moonDist = Phaser.Math.Distance.Between(this.gravMoonSprite.x, this.gravMoonSprite.y, this.npc.x, this.npc.y);
        if (moonDist <= moonR + 18 && time > this.gravMoonRamCooldown) {
          this.gravMoonRamCooldown = time + 800;
          this.npc.takeDamage(15);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xccbbee);
          this.showFloatingText(this.npc.x, this.npc.y - 24, '15', '#ccbbee');
          // Launch enemy toward nearest wall but cap
          const W2 = this.scale.width, H2 = this.scale.height;
          const launchDx = this.npc.x - this.player.x;
          const launchDy = this.npc.y - this.player.y;
          const launchLen = Math.hypot(launchDx, launchDy) || 1;
          const targetWallX = launchDx > 0 ? W2 - 60 : 60;
          const targetWallY = launchDy > 0 ? H2 - 60 : 60;
          const capX = Math.abs(launchDx) > Math.abs(launchDy) ? targetWallX : this.npc.x + (launchDx / launchLen) * 200;
          const capY = Math.abs(launchDy) > Math.abs(launchDx) ? targetWallY : this.npc.y + (launchDy / launchLen) * 200;
          const nb = this.npc.body as Phaser.Physics.Arcade.Body;
          nb.setVelocity((capX - this.npc.x) * 4, (capY - this.npc.y) * 4);
        }
        // Moon absorbs incoming hits (damage absorber on player)
        if (!this.player.damageAbsorber) {
          this.player.damageAbsorber = (amount: number) => {
            if (!this.gravMoonActive || !this.gravMoonSprite) return false;
            this.gravMoonHp -= amount;
            if (this.gravMoonHpBar) this.gravMoonHpBar.setSize(40 * Math.max(0, this.gravMoonHp / 100), 4);
            this.spawnHitFlash(this.gravMoonSprite.x, this.gravMoonSprite.y, 0xccbbee);
            if (this.gravMoonHp <= 0) {
              // Moon destroyed
              this.gravMoonActive = false;
              if (this.gravMoonSprite) { this.gravMoonSprite.destroy(); this.gravMoonSprite = null; }
              if (this.gravMoonHpBar) { this.gravMoonHpBar.destroy(); this.gravMoonHpBar = null; }
              if (this.gravMoonHpBg) { this.gravMoonHpBg.destroy(); this.gravMoonHpBg = null; }
              this.player.damageAbsorber = null;
              this.showFloatingText(this.player.x, this.player.y - 30, 'Moon Destroyed!', '#ff8888');
              const moonBurst = this.add.circle(this.player.x, this.player.y, 14, 0xccbbee, 0.8).setDepth(9);
              this.tweens.add({ targets: moonBurst, scaleX: 5, scaleY: 5, alpha: 0, duration: 400, onComplete: () => moonBurst.destroy() });
            }
            return true;
          };
        }
      } else if (!this.gravMoonActive && this.player.damageAbsorber && this.elementId === 'gravity') {
        // Clear moon absorber if moon died
        this.player.damageAbsorber = null;
      }

      // Gravity fire puddle tick + expiry
      for (let i = this.gravFirePuddles.length - 1; i >= 0; i--) {
        const fp = this.gravFirePuddles[i];
        if (time > fp.expiresAt) {
          fp.sprite.destroy();
          this.gravFirePuddles.splice(i, 1);
          continue;
        }
        const fTarget = fp.owner === 'player' ? this.npc : this.player;
        if (Phaser.Math.Distance.Between(fp.x, fp.y, fTarget.x, fTarget.y) <= fp.radius) {
          fp.tickAccum += delta;
          if (fp.tickAccum >= 300) {
            fp.tickAccum -= 300;
            fTarget.takeDamage(4);
            this.spawnHitFlash(fTarget.x, fTarget.y, 0xff6633);
          }
        }
      }
    }

    // ── Creation per-frame ────────────────────────────────────────
    if (this.elementId === 'creation' || this.npcElement.id === 'creation') {
      // 1. Craft timer
      if (this.creatCraftInProgress && time >= this.creatCraftStartTime + this.creatCraftDuration) {
        this.resolveCrucibleCraft(time);
      }

      // 2. Bolt charge orb position update (if E held by player, handled in input block but orb may drift)
      // (already done in input block)

      // 3. Daggers in flight
      const W2 = this.scale.width, H2 = this.scale.height;
      for (let i = this.creatDaggers.length - 1; i >= 0; i--) {
        const d = this.creatDaggers[i];
        d.sprite.x += d.vx * (delta / 1000);
        d.sprite.y += d.vy * (delta / 1000);
        if (d.sprite.x < 0 || d.sprite.x > W2 || d.sprite.y < 0 || d.sprite.y > H2) {
          d.sprite.destroy();
          this.creatDaggers.splice(i, 1);
          continue;
        }
        const dTarget = d.owner === 'player' ? this.npc : this.player;
        const targetId = d.owner === 'player' ? 'npc' : 'player';
        if (!d.hitSet.has(targetId) && Phaser.Math.Distance.Between(d.sprite.x, d.sprite.y, dTarget.x, dTarget.y) <= 20) {
          dTarget.takeDamage(d.damage);
          this.spawnHitFlash(dTarget.x, dTarget.y, 0xeeeeff);
          d.hitSet.add(targetId);
          // Daggers pierce — don't destroy
        }
      }

      // 4. Bolts in flight
      for (let i = this.creatBolts.length - 1; i >= 0; i--) {
        const b = this.creatBolts[i];
        b.sprite.x += b.vx * (delta / 1000);
        b.sprite.y += b.vy * (delta / 1000);
        if (b.sprite.x < 0 || b.sprite.x > W2 || b.sprite.y < 0 || b.sprite.y > H2) {
          b.sprite.destroy();
          this.creatBolts.splice(i, 1);
          continue;
        }
        // Rockets: explode at target position instead of entering crucible
        if (b.isRocket && b.targetX !== undefined && b.targetY !== undefined) {
          if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, b.targetX, b.targetY) <= 20) {
            const rktRing = this.add.circle(b.sprite.x, b.sprite.y, 10, 0xee8800, 0.85).setDepth(8);
            this.tweens.add({ targets: rktRing, scaleX: 5, scaleY: 5, alpha: 0, duration: 300, onComplete: () => rktRing.destroy() });
            const rktTarget = b.owner === 'player' ? this.npc : this.player;
            if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, rktTarget.x, rktTarget.y) <= 50) {
              rktTarget.takeDamage(b.damage);
              this.spawnHitFlash(rktTarget.x, rktTarget.y, 0xee8800);
            }
            b.sprite.destroy();
            this.creatBolts.splice(i, 1);
            continue;
          }
        }
        // Check crucible hit (skip rockets)
        if (!b.isRocket && this.crucibleSprite && Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, this.crucibleX, this.crucibleY) <= 30) {
          if (this.creatCraftInProgress) {
            // Discard during craft
            const puff = this.add.circle(b.sprite.x, b.sprite.y, 6, 0x888888, 0.5).setDepth(6);
            this.tweens.add({ targets: puff, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 200, onComplete: () => puff.destroy() });
          } else if (this.crucibleBolts.length < 3) {
            const iconColors: Record<string, number> = { copper: 0xcc6622, silver: 0xccccdd, gold: 0xffdd22 };
            const iconX = this.crucibleX - 16 + this.crucibleBolts.length * 16;
            const iconY = this.crucibleY - 28;
            const icon = this.add.rectangle(iconX, iconY, 12, 12, iconColors[b.tier], 0.9)
              .setStrokeStyle(1, 0xffffff, 0.5).setDepth(5);
            this.crucibleBolts.push({ tier: b.tier, icon });
            if (this.crucibleBolts.length === 3) {
              this.creatCraftInProgress = true;
              this.creatCraftStartTime = time;
              this.creatCraftOwner = b.owner;
              // Crafting indicator on crucible
              const craftFlash = this.add.circle(this.crucibleX, this.crucibleY, 28, 0xffdd44, 0.3).setDepth(6);
              this.tweens.add({ targets: craftFlash, alpha: 0.7, scaleX: 1.2, scaleY: 1.2, yoyo: true, repeat: -1, duration: 400 });
              this.time.delayedCall(this.creatCraftDuration + 50, () => craftFlash.destroy());
            }
          }
          b.sprite.destroy();
          this.creatBolts.splice(i, 1);
          continue;
        }
        // Check enemy hit
        const bTarget = b.owner === 'player' ? this.npc : this.player;
        if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, bTarget.x, bTarget.y) <= 18) {
          bTarget.takeDamage(b.damage);
          this.spawnHitFlash(bTarget.x, bTarget.y, 0xffaa44);
          b.sprite.destroy();
          this.creatBolts.splice(i, 1);
        }
      }

      // 5. Scythe steering + contact + absorption
      for (let i = this.creatScythes.length - 1; i >= 0; i--) {
        const sc = this.creatScythes[i];
        const scTarget = sc.owner === 'player' ? this.npc : this.player;
        const sdx = scTarget.x - sc.sprite.x;
        const sdy = scTarget.y - sc.sprite.y;
        const slen = Math.hypot(sdx, sdy) || 1;
        const scytheSpeed = 87; // slowed 3x from original 260
        sc.vx = (sdx / slen) * scytheSpeed;
        sc.vy = (sdy / slen) * scytheSpeed;
        sc.sprite.x += sc.vx * (delta / 1000);
        sc.sprite.y += sc.vy * (delta / 1000);
        // Update HP bar
        const hpFrac = Math.max(0, sc.hp / sc.maxHp);
        sc.hpBg.setPosition(sc.sprite.x, sc.sprite.y - 16);
        sc.hpBar.setPosition(sc.sprite.x - 14, sc.sprite.y - 16).setSize(28 * hpFrac, 4);
        // Contact damage — destroy on hit
        if (Phaser.Math.Distance.Between(sc.sprite.x, sc.sprite.y, scTarget.x, scTarget.y) <= 28) {
          scTarget.takeDamage(32);
          this.spawnHitFlash(scTarget.x, scTarget.y, 0xcc22aa);
          sc.hp = 0; // triggers destruction below
        }
        // Absorb enemy projectiles
        for (const go of this.projectiles.getChildren()) {
          const proj = go as Projectile;
          if (!proj.active) continue;
          const isEnemyProj = sc.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
          if (!isEnemyProj) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, sc.sprite.x, sc.sprite.y) <= 20) {
            sc.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            break;
          }
        }
        if (sc.hp <= 0) {
          sc.sprite.destroy(); sc.hpBar.destroy(); sc.hpBg.destroy();
          this.creatScythes.splice(i, 1);
        }
      }

      // 6. Pulse tick
      for (let i = this.creatPulses.length - 1; i >= 0; i--) {
        const pu = this.creatPulses[i];
        if (pu.remaining <= 0) { this.creatPulses.splice(i, 1); continue; }
        if (time - pu.lastPulseAt >= pu.intervalMs) {
          pu.lastPulseAt = time;
          pu.remaining--;
          const ring = this.add.circle(pu.x, pu.y, 10, pu.kind === 'heal' ? 0x44ff88 : 0xff4422, 0.6).setDepth(7);
          this.tweens.add({ targets: ring, scaleX: pu.range / 10, scaleY: pu.range / 10, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
          if (pu.kind === 'heal') {
            const healer = pu.owner === 'player' ? this.player : this.npc;
            healer.heal(pu.magnitude);
          } else {
            const puTarget = pu.owner === 'player' ? this.npc : this.player;
            if (Phaser.Math.Distance.Between(pu.x, pu.y, puTarget.x, puTarget.y) <= pu.range) {
              puTarget.takeDamage(pu.magnitude);
              this.spawnHitFlash(puTarget.x, puTarget.y, 0xff4422);
            }
          }
        }
      }

      // 7. Medkit expiry + pickup
      if (this.creatMedkit) {
        const mk = this.creatMedkit;
        const mkOwner = mk.owner === 'player' ? this.player : this.npc;
        if (Phaser.Math.Distance.Between(mk.x, mk.y, mkOwner.x, mkOwner.y) <= 30) {
          mkOwner.heal(25);
          const healFlash = this.add.circle(mkOwner.x, mkOwner.y, 20, 0x44ff88, 0.6).setDepth(9);
          this.tweens.add({ targets: healFlash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => healFlash.destroy() });
          mk.sprite.destroy(); mk.label.destroy();
          this.creatMedkit = null;
        } else if (time > mk.expireAt) {
          mk.sprite.destroy(); mk.label.destroy();
          this.creatMedkit = null;
        }
      }

      // 8 & 9. Blocker and maze wall projectile absorption + movement push-out
      const allProj = this.projectiles.getChildren() as Projectile[];
      for (let bi = this.creatBlockers.length - 1; bi >= 0; bi--) {
        const bl = this.creatBlockers[bi];
        // Handle launched movement (from Build Mode E)
        const blLaunch = bl as any;
        if (blLaunch.launchUntil && time < blLaunch.launchUntil) {
          bl.x += blLaunch.launchVx * (delta / 1000);
          bl.y += blLaunch.launchVy * (delta / 1000);
          bl.rect.setPosition(bl.x, bl.y);
          bl.hpBg.setPosition(bl.x, bl.y - bl.h / 2 - 8);
          bl.hpBar.setPosition(bl.x - bl.w / 2, bl.y - bl.h / 2 - 8);
          // Delete if offscreen
          const W3 = this.scale.width, H3 = this.scale.height;
          if (bl.x < -bl.w || bl.x > W3 + bl.w || bl.y < -bl.h || bl.y > H3 + bl.h) {
            bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy();
            this.creatBlockers.splice(bi, 1);
            continue;
          }
          // Deal contact damage to enemy while launched
          if (bl.owner === 'player' && Math.abs(this.npc.x - bl.x) <= bl.w / 2 + 18 && Math.abs(this.npc.y - bl.y) <= bl.h / 2 + 18) {
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc88ff);
            bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy();
            this.creatBlockers.splice(bi, 1);
            continue;
          }
        } else if (blLaunch.launchUntil && time >= blLaunch.launchUntil) {
          delete blLaunch.launchUntil; delete blLaunch.launchVx; delete blLaunch.launchVy;
        }
        // Absorb enemy projectiles
        for (const proj of allProj) {
          if (!proj.active) continue;
          const isEnemyProj = bl.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
          if (!isEnemyProj) continue;
          if (Math.abs(proj.x - bl.x) <= bl.w / 2 && Math.abs(proj.y - bl.y) <= bl.h / 2) {
            bl.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            bl.hpBar.setSize(Math.max(0, (bl.hp / bl.maxHp)) * bl.w, 4);
            if (bl.hp <= 0) {
              bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy();
              this.creatBlockers.splice(bi, 1);
              break;
            }
          }
        }
        if (bi < this.creatBlockers.length) {
          // Push both fighters out
          this.pushFighterOutOfRect(this.player.body as Phaser.Physics.Arcade.Body, bl.x, bl.y, bl.w, bl.h);
          this.pushFighterOutOfRect(this.npc.body as Phaser.Physics.Arcade.Body, bl.x, bl.y, bl.w, bl.h);
        }
      }
      // Maze walls
      const casterBody = (this.elementId === 'creation' ? this.player : this.npc).body as Phaser.Physics.Arcade.Body;
      for (let mi = this.creatMazeWalls.length - 1; mi >= 0; mi--) {
        const mw = this.creatMazeWalls[mi];
        // Absorb enemy projectiles
        const mwEnemyIsPlayer = mw.owner !== 'player';
        for (const proj of allProj) {
          if (!proj.active) continue;
          const isEnemyProj = mw.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
          if (!isEnemyProj) continue;
          if (Math.abs(proj.x - mw.x) <= mw.w / 2 && Math.abs(proj.y - mw.y) <= mw.h / 2) {
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
          }
        }
        // Spiked walls: tick damage BEFORE pushout (while enemy is still potentially in range)
        if (mw.spiked) {
          mw.spikeAccum = (mw.spikeAccum ?? 0) + delta;
          if (mw.spikeAccum >= 500) {
            mw.spikeAccum -= 500;
            const spikeTarget = mwEnemyIsPlayer ? this.player : this.npc;
            if (Math.abs(spikeTarget.x - mw.x) <= mw.w / 2 + 30 && Math.abs(spikeTarget.y - mw.y) <= mw.h / 2 + 30) {
              spikeTarget.takeDamage(8);
              this.spawnHitFlash(spikeTarget.x, spikeTarget.y, 0xcc2222);
            }
          }
        }
        // Push non-caster fighter out
        const nonCasterBody = mwEnemyIsPlayer
          ? (this.player.body as Phaser.Physics.Arcade.Body)
          : (this.npc.body as Phaser.Physics.Arcade.Body);
        if (nonCasterBody !== casterBody) {
          this.pushFighterOutOfRect(nonCasterBody, mw.x, mw.y, mw.w, mw.h);
        } else {
          // If somehow same, push npc
          this.pushFighterOutOfRect(this.npc.body as Phaser.Physics.Arcade.Body, mw.x, mw.y, mw.w, mw.h);
        }
        // Expiry
        if (time >= mw.expireAt) {
          mw.rect.destroy();
          this.creatMazeWalls.splice(mi, 1);
        }
      }

      // 10. Speed boost expiry
      if (this.creatPrevSpeedMult !== -1 && time >= this.creatSpeedBoostEnd) {
        const boostOwner = this.creatCraftOwner; // last craft owner who got the boost
        if (boostOwner === 'player') this.playerSpeedMult = this.creatPrevSpeedMult;
        else this.npcSpeedMult = this.creatPrevSpeedMult;
        this.creatPrevSpeedMult = -1;
      }

      // 11. Damage reduction expiry
      if (this.creatDamageReductionEnd > 0 && time >= this.creatDamageReductionEnd) {
        const drOwner = this.creatCraftOwner;
        if (drOwner === 'player') this.player.incomingDamageMultiplier = this.creatPrevIncomingDamageMult;
        else this.npc.incomingDamageMultiplier = this.creatPrevIncomingDamageMult;
        this.creatDamageReductionEnd = 0;
      }

      if (this.elementId === 'creation') {
        // 12. (Spiked maze wall damage is handled inline in the shared maze wall loop above)

        // 13. Mech per-frame (R+)
        if (this.creatMech) {
          const mech = this.creatMech;
          // Follow player
          mech.sprite.setPosition(this.player.x, this.player.y + 32);
          mech.hpBg.setPosition(this.player.x, this.player.y + 52);
          mech.hpBar.setPosition(this.player.x - 17, this.player.y + 52);
          // Auto rocket (toward cursor)
          mech.rocketAccum += delta;
          if (mech.rocketAccum >= 2000) {
            mech.rocketAccum -= 2000;
            const ptr = this.input.activePointer;
            const rCount = mech.stage === 3 ? 2 : 1;
            for (let ri = 0; ri < rCount; ri++) {
              const rOffX = ri === 0 ? 0 : 20;
              const rtx = ptr.worldX + rOffX;
              const rty = ptr.worldY;
              const rdx = rtx - mech.sprite.x;
              const rdy = rty - mech.sprite.y;
              const rlen = Math.hypot(rdx, rdy) || 1;
              const rSpr = this.add.circle(mech.sprite.x, mech.sprite.y, 6, 0xee8800, 0.9).setDepth(7);
              this.creatBolts.push({ sprite: rSpr, vx: (rdx / rlen) * 420, vy: (rdy / rlen) * 420, tier: 'gold', damage: 10, owner: 'player', isRocket: true, targetX: rtx, targetY: rty });
            }
          }
        }

        // 14. Speed pads (F+ Build Mode)
        for (let spi = this.creatSpeedPads.length - 1; spi >= 0; spi--) {
          const sp = this.creatSpeedPads[spi];
          // Handle launched movement
          const spLaunch = sp as any;
          if (spLaunch.launchUntil && time < spLaunch.launchUntil) {
            sp.x += spLaunch.launchVx * (delta / 1000);
            sp.y += spLaunch.launchVy * (delta / 1000);
            sp.rect.setPosition(sp.x, sp.y);
            sp.hpBg.setPosition(sp.x, sp.y - sp.h / 2 - 6);
            sp.hpBar.setPosition(sp.x - sp.w / 2, sp.y - sp.h / 2 - 6);
            // Delete if offscreen
            const spW3 = this.scale.width, spH3 = this.scale.height;
            if (sp.x < -sp.w || sp.x > spW3 + sp.w || sp.y < -sp.h || sp.y > spH3 + sp.h) {
              sp.rect.destroy(); sp.hpBar.destroy(); sp.hpBg.destroy();
              this.creatSpeedPads.splice(spi, 1);
              continue;
            }
            // Check NPC hit
            if (sp.owner === 'player' && Math.abs(this.npc.x - sp.x) <= sp.w / 2 + 18 && Math.abs(this.npc.y - sp.y) <= sp.h / 2 + 18) {
              this.npc.takeDamage(12);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x44aaff);
              // Apply slow to NPC
              this.creatNpcSlowMult = 0.8; this.creatNpcSlowEnd = time + 3000;
              sp.rect.destroy(); sp.hpBar.destroy(); sp.hpBg.destroy();
              this.creatSpeedPads.splice(spi, 1);
              continue;
            }
          } else if (spLaunch.launchUntil && time >= spLaunch.launchUntil) {
            delete spLaunch.launchUntil; delete spLaunch.launchVx; delete spLaunch.launchVy;
          }
          // Player overlap: +25% speed for 3s
          if (sp.owner === 'player' && Math.abs(this.player.x - sp.x) <= sp.w / 2 + 16 && Math.abs(this.player.y - sp.y) <= sp.h / 2 + 16) {
            this.creatPlayerSpeedPadEnd = time + 3000;
          }
        }
        // Apply NPC slow (from launched speed pad)
        if (time < this.creatNpcSlowEnd) this.npcSpeedMult *= this.creatNpcSlowMult;

        // 15. Spiked blocks (F+ Build Mode)
        for (let sbi = this.creatSpikedBlocks.length - 1; sbi >= 0; sbi--) {
          const sb = this.creatSpikedBlocks[sbi];
          // Handle launched movement
          const sbLaunch = sb as any;
          if (sbLaunch.launchUntil && time < sbLaunch.launchUntil) {
            sb.x += sbLaunch.launchVx * (delta / 1000);
            sb.y += sbLaunch.launchVy * (delta / 1000);
            sb.rect.setPosition(sb.x, sb.y);
            sb.hpBg.setPosition(sb.x, sb.y - sb.h / 2 - 6);
            sb.hpBar.setPosition(sb.x - sb.w / 2, sb.y - sb.h / 2 - 6);
            // Delete if offscreen
            const sbW3 = this.scale.width, sbH3 = this.scale.height;
            if (sb.x < -sb.w || sb.x > sbW3 + sb.w || sb.y < -sb.h || sb.y > sbH3 + sb.h) {
              sb.rect.destroy(); sb.hpBar.destroy(); sb.hpBg.destroy();
              this.creatSpikedBlocks.splice(sbi, 1);
              continue;
            }
            if (sb.owner === 'player' && Math.abs(this.npc.x - sb.x) <= sb.w / 2 + 18 && Math.abs(this.npc.y - sb.y) <= sb.h / 2 + 18) {
              this.npc.takeDamage(25);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc2222);
              this.showFloatingText(this.npc.x, this.npc.y - 30, '25', '#cc2222');
              if (!sb.invincible) { sb.rect.destroy(); sb.hpBar.destroy(); sb.hpBg.destroy(); this.creatSpikedBlocks.splice(sbi, 1); continue; }
            }
          } else if (sbLaunch.launchUntil && time >= sbLaunch.launchUntil) {
            delete sbLaunch.launchUntil; delete sbLaunch.launchVx; delete sbLaunch.launchVy;
          }
          // Stationary: tick damage to adjacent enemy
          sb.tickAccum += delta;
          if (sb.tickAccum >= 300) {
            sb.tickAccum -= 300;
            const sbTarget = sb.owner === 'player' ? this.npc : this.player;
            if (Math.abs(sbTarget.x - sb.x) <= sb.w / 2 + 22 && Math.abs(sbTarget.y - sb.y) <= sb.h / 2 + 22) {
              sbTarget.takeDamage(5);
              this.spawnHitFlash(sbTarget.x, sbTarget.y, 0xcc2222);
            }
          }
        }

        // 16. Click+ Blade Split: each dagger can cut any number of different blocks, but not the same block twice
        if (this.hasUpgrade('click')) {
          for (const d of this.creatDaggers) {
            if (d.owner !== 'player') continue;
            for (let bi = this.creatBlockers.length - 1; bi >= 0; bi--) {
              const bl = this.creatBlockers[bi];
              if (d.cutSet.has(bl)) continue; // this dagger already cut this block
              if (Math.abs(d.sprite.x - bl.x) <= bl.w / 2 + 20 && Math.abs(d.sprite.y - bl.y) <= bl.h / 2 + 20) {
                // Split block: determine cut axis based on dagger direction
                const absDx = Math.abs(d.vx), absDy = Math.abs(d.vy);
                const splitH = absDx >= absDy; // moving mostly horizontal → split top/bottom halves
                const halfHp = bl.hp;
                const ox = bl.x, oy = bl.y, ow = bl.w, oh = bl.h, oOwner = bl.owner;
                const gap = 6;
                // Remove original
                bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy();
                this.creatBlockers.splice(bi, 1);
                // Spawn two halves, add them to this dagger's cutSet so it won't re-cut them
                if (splitH) {
                  this.spawnCreationBlocker(ox, oy - oh / 4 - gap, ow, oh / 2, oOwner);
                  const h1 = this.creatBlockers[this.creatBlockers.length - 1]; h1.hp = halfHp; d.cutSet.add(h1);
                  this.spawnCreationBlocker(ox, oy + oh / 4 + gap, ow, oh / 2, oOwner);
                  const h2 = this.creatBlockers[this.creatBlockers.length - 1]; h2.hp = halfHp; d.cutSet.add(h2);
                } else {
                  this.spawnCreationBlocker(ox - ow / 4 - gap, oy, ow / 2, oh, oOwner);
                  const h1 = this.creatBlockers[this.creatBlockers.length - 1]; h1.hp = halfHp; d.cutSet.add(h1);
                  this.spawnCreationBlocker(ox + ow / 4 + gap, oy, ow / 2, oh, oOwner);
                  const h2 = this.creatBlockers[this.creatBlockers.length - 1]; h2.hp = halfHp; d.cutSet.add(h2);
                }
                break; // move to next dagger after one cut
              }
            }
          }
        }
      }
    }

    // ── Post-AI NPC velocity multiplier ──────────────────────────
    if (this.npcNukeChanneling) {
      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    } else if (this.npcSpeedMult !== 1) {
      const nb = this.npc.body as Phaser.Physics.Arcade.Body;
      nb.velocity.x *= this.npcSpeedMult;
      nb.velocity.y *= this.npcSpeedMult;
    }

    // ── Wind Trap — player's trap constrains NPC ─────────────────
    if (time < this.playerWindTrapExpiry) {
      // R upgrade: trap follows cursor
      if (this.hasUpgrade('r')) {
        const ptr = this.input.activePointer;
        this.playerWindTrapX = ptr.worldX;
        this.playerWindTrapY = ptr.worldY;
        if (this.playerWindTrapSprite) this.playerWindTrapSprite.setPosition(ptr.worldX, ptr.worldY);
      }
      const trapR = 80;
      const d = Phaser.Math.Distance.Between(this.playerWindTrapX, this.playerWindTrapY, this.npc.x, this.npc.y);
      if (d > trapR) {
        const ang = Phaser.Math.Angle.Between(this.playerWindTrapX, this.playerWindTrapY, this.npc.x, this.npc.y);
        this.npc.setPosition(
          this.playerWindTrapX + Math.cos(ang) * trapR,
          this.playerWindTrapY + Math.sin(ang) * trapR,
        );
        // Don't zero velocity — let the AI keep moving so it slides along the boundary
        const nb = this.npc.body as Phaser.Physics.Arcade.Body;
        // Reflect the outward component of velocity so NPC bounces along the edge
        const vDotN = nb.velocity.x * Math.cos(ang) + nb.velocity.y * Math.sin(ang);
        if (vDotN > 0) {
          nb.velocity.x -= vDotN * Math.cos(ang);
          nb.velocity.y -= vDotN * Math.sin(ang);
        }
      }
    } else if (this.playerWindTrapSprite) {
      this.playerWindTrapSprite.destroy();
      this.playerWindTrapSprite = null;
    }

    // ── Wind Trap — NPC's trap constrains player ──────────────────
    if (time < this.npcWindTrapExpiry && !this.isDodging) {
      const trapR = 80;
      const d = Phaser.Math.Distance.Between(this.npcWindTrapX, this.npcWindTrapY, this.player.x, this.player.y);
      if (d > trapR) {
        const ang = Phaser.Math.Angle.Between(this.npcWindTrapX, this.npcWindTrapY, this.player.x, this.player.y);
        this.player.setPosition(
          this.npcWindTrapX + Math.cos(ang) * trapR,
          this.npcWindTrapY + Math.sin(ang) * trapR,
        );
        // Cancel only the outward velocity so the player can still move inside
        const vDotN = playerBody.velocity.x * Math.cos(ang) + playerBody.velocity.y * Math.sin(ang);
        if (vDotN > 0) {
          playerBody.velocity.x -= vDotN * Math.cos(ang);
          playerBody.velocity.y -= vDotN * Math.sin(ang);
        }
      }
    } else if (this.npcWindTrapSprite && time >= this.npcWindTrapExpiry) {
      this.npcWindTrapSprite.destroy();
      this.npcWindTrapSprite = null;
    }

    // ── Thorn Drag (player drags NPC) ────────────────────────────
    if (time < this.thornDragActiveUntil) {
      const tdx = mouseX - this.npc.x;
      const tdy = mouseY - this.npc.y;
      const tdLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const npcDragBody = this.npc.body as Phaser.Physics.Arcade.Body;
      npcDragBody.setVelocity((tdx / tdLen) * 220, (tdy / tdLen) * 220);

      this.thornDragTickAccum += delta;
      if (this.thornDragTickAccum >= 250) {
        this.thornDragTickAccum -= 250;
        this.npc.takeDamage(3);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0x44cc44);
      }
      if (this.thornDragAura) this.thornDragAura.setPosition(this.player.x, this.player.y);
    } else if (this.thornDragAura) {
      this.thornDragAura.destroy();
      this.thornDragAura = null;
    }

    // ── Thorn Drag (NPC drags player) ────────────────────────────
    if (time < this.npcThornDragActiveUntil && !this.isDodging) {
      const tdx = this.npc.x - this.player.x;
      const tdy = this.npc.y - this.player.y;
      const tdLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const playerDragBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerDragBody.setVelocity((tdx / tdLen) * 220, (tdy / tdLen) * 220);

      this.npcThornDragTickAccum += delta;
      if (this.npcThornDragTickAccum >= 250) {
        this.npcThornDragTickAccum -= 250;
        this.player.takeDamage(3);
        this.spawnHitFlash(this.player.x, this.player.y, 0x44cc44);
      }
      if (this.npcThornDragAura) this.npcThornDragAura.setPosition(this.npc.x, this.npc.y);
    } else if (this.npcThornDragAura && time >= this.npcThornDragActiveUntil) {
      this.npcThornDragAura.destroy();
      this.npcThornDragAura = null;
    }

    // ── Puddle slow (post-AI) ─────────────────────────────────────
    if (this.puddles.length > 0) {
      const playerInPuddle = this.puddles.some(
        (p) => p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
      );
      if (playerInPuddle) {
        const pb = this.player.body as Phaser.Physics.Arcade.Body;
        pb.velocity.x *= 0.5;
        pb.velocity.y *= 0.5;
      }

      const npcInPuddle = this.puddles.some(
        (p) => p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius,
      );
      if (npcInPuddle) {
        const nb = this.npc.body as Phaser.Physics.Arcade.Body;
        nb.velocity.x *= 0.5;
        nb.velocity.y *= 0.5;
      }
    }

    // ── Clean up projectiles ──────────────────────────────────────
    const wb = this.physics.world.bounds;
    const allProj = this.projectiles.getChildren().slice() as Projectile[];
    for (const p of allProj) {
      if (!p.active) {
        // Click+: if a tracked ice spike is deactivated without being in pending set, it hit already — no action
        if (this.playerIcePendingSet.has(p)) {
          this.playerIcePendingSet.delete(p);
          this.playerIceConsecHits = 0; // inactive without hit means it was destroyed by something else
        }
        p.destroy(); continue;
      }
      if (p.x < wb.left - 60 || p.x > wb.right + 60 || p.y < wb.top - 60 || p.y > wb.bottom + 60) {
        // Click+: ice spike went off-screen = miss
        if (this.playerIcePendingSet.has(p)) {
          this.playerIcePendingSet.delete(p);
          this.playerIceConsecHits = 0;
        }
        p.destroy();
      }
    }
    if (this.cloneProjectiles) {
      const cloneProjs = this.cloneProjectiles.getChildren().slice() as Projectile[];
      for (const p of cloneProjs) {
        if (!p.active) { p.destroy(); continue; }
        if (p.x < wb.left - 60 || p.x > wb.right + 60 || p.y < wb.top - 60 || p.y > wb.bottom + 60) {
          p.destroy();
        }
      }
    }

    // ── Host: broadcast authoritative state to guest at 20 Hz ────
    if (this.isNetworkPvP && this.networkRole === 'host' && this.networkManager) {
      this.stateSendAccum += delta;
      if (this.stateSendAccum >= this.STATE_SEND_INTERVAL) {
        this.stateSendAccum -= this.STATE_SEND_INTERVAL;
        this.networkManager.sendState(this.buildStatePacket());
      }
    }

    // ── Update HUD cooldown bars ─────────────────────────────────
    for (const entry of this.abilityBars) {
      if (entry.abilityId === 'flame-body') {
        entry.fill.setSize(this.flameBodyActive ? entry.maxWidth : 0, entry.fill.height);
      } else if (entry.abilityId === 'water-shield') {
        entry.fill.setSize(this.player.shieldCharges > 0 ? entry.maxWidth : 0, entry.fill.height);
      } else if (entry.abilityId === 'splash') {
        if (time < this.splashActiveUntil) {
          entry.fill.setSize(entry.maxWidth, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('splash'), entry.fill.height);
        }
      } else if (entry.abilityId === 'thorn-drag') {
        if (time < this.thornDragActiveUntil) {
          entry.fill.setSize(entry.maxWidth, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('thorn-drag'), entry.fill.height);
        }
      } else if (entry.abilityId === 'quick-shot') {
        // Full when charged, otherwise shows cooldown
        if (this.quickShotCharged) {
          entry.fill.setSize(entry.maxWidth, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('quick-shot'), entry.fill.height);
        }
      } else if (entry.abilityId === 'charged-beam') {
        // Shows hit progress (0-3) when not ready, shows CD progress when ready
        if (this.airConsecutiveHits >= 3) {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('charged-beam'), entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * (this.airConsecutiveHits / 3), entry.fill.height);
        }
      } else if (entry.abilityId === 'grav-bomb') {
        if (this.gravBombHolding) {
          entry.fill.setSize(entry.maxWidth * this.player.chargeRatio, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('grav-bomb'), entry.fill.height);
        }
      } else if (entry.abilityId === 'infect') {
        const infectCd = Math.max(1000, this.growthInfectCdMs);
        const infectRatio = Math.min(1, (this.time.now - this.lastPlayerInfectCast) / infectCd);
        entry.fill.setSize(entry.maxWidth * infectRatio, entry.fill.height);
      } else if (entry.abilityId === 'bloat') {
        const bloatCd = Math.max(1000, this.growthBloatCdMs);
        const bloatRatio = Math.min(1, (this.time.now - this.lastPlayerBloatCast) / bloatCd);
        entry.fill.setSize(entry.maxWidth * bloatRatio, entry.fill.height);
      } else {
        entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio(entry.abilityId), entry.fill.height);
      }
    }

    // P2 HUD cooldown bars (PvP)
    if (this.isPvP) {
      for (const entry of this.p2AbilityBars) {
        if (entry.abilityId === 'flame-body') {
          entry.fill.setSize(this.npcFlameBodyActive ? entry.maxWidth : 0, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.npc.getCooldownRatio(entry.abilityId), entry.fill.height);
        }
      }
    }
  }

  // ── Network PvP helpers ──────────────────────────────────────────

  private buildGuestInput(mouseX: number, mouseY: number): import('../network/P2InputState').P2InputState {
    const pointer = this.input.activePointer;
    return {
      up:    this.wKey.isDown,
      down:  this.sKey.isDown,
      left:  this.aKey.isDown,
      right: this.dKey.isDown,
      aimUp: false, aimDown: false, aimLeft: false, aimRight: false,
      click: pointer.isDown,
      e:     this.eKey.isDown,
      r:     this.rKey.isDown,
      f:     this.fKey.isDown,
      q:     this.qKey.isDown,
      dodge: this.spaceKey.isDown,
      aimX:  mouseX / this.scale.width,
      aimY:  mouseY / this.scale.height,
      seq:   ++this.guestInputSeq,
    };
  }

  private buildStatePacket(): import('../network/NetworkTypes').StatePacket {
    const snap = (f: Fighter): import('../network/NetworkTypes').FighterSnapshot => {
      const body = f.body as Phaser.Physics.Arcade.Body;
      return {
        x: f.x, y: f.y,
        vx: body.velocity.x, vy: body.velocity.y,
        hp: f.hp, maxHp: f.maxHp,
        shieldCharges: f.shieldCharges,
        shieldHp: f.shieldHp,
        chargeRatio: f.chargeRatio,
        isInvincible: f.isInvincible,
        cooldownMult: f.cooldownMult,
      };
    };
    const packet: import('../network/NetworkTypes').StatePacket = {
      type: 'state',
      tick: ++this.networkTick,
      player: snap(this.player),
      npc: snap(this.npc),
    };
    if (this.gameEnded) {
      // Note: player won = npc was defeated; derive from NPC hp
      packet.gameOver = { playerWon: this.npc.hp <= 0 };
    }
    return packet;
  }

  private reconcileNetworkState(state: import('../network/NetworkTypes').StatePacket): void {
    // Apply authoritative velocity — Phaser physics will extrapolate at 60fps between 20Hz updates
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(state.player.vx, state.player.vy);
    (this.npc.body    as Phaser.Physics.Arcade.Body).setVelocity(state.npc.vx,    state.npc.vy);

    // Snap position if drift is significant; ignore tiny differences to avoid jitter
    const SNAP_THRESHOLD = 8;
    if (Math.abs(this.player.x - state.player.x) > SNAP_THRESHOLD || Math.abs(this.player.y - state.player.y) > SNAP_THRESHOLD) {
      this.player.x = state.player.x;
      this.player.y = state.player.y;
    }
    if (Math.abs(this.npc.x - state.npc.x) > SNAP_THRESHOLD || Math.abs(this.npc.y - state.npc.y) > SNAP_THRESHOLD) {
      this.npc.x = state.npc.x;
      this.npc.y = state.npc.y;
    }

    // Directly set HP and shield state
    this.player.hp = state.player.hp;
    this.npc.hp    = state.npc.hp;
    this.player.shieldCharges = state.player.shieldCharges;
    this.npc.shieldCharges    = state.npc.shieldCharges;
    this.player.shieldHp = state.player.shieldHp;
    this.npc.shieldHp    = state.npc.shieldHp;
    this.player.chargeRatio = state.player.chargeRatio;
    this.npc.chargeRatio    = state.npc.chargeRatio;
    this.player.isInvincible = state.player.isInvincible;
    this.npc.isInvincible    = state.npc.isInvincible;

    // Handle game over from host
    if (state.gameOver && !this.gameEnded) {
      // From guest's perspective: playerWon (host's player won) means guest (npc) lost
      this.endGame(!state.gameOver.playerWon);
    }
  }

  private handleNetworkDisconnect(): void {
    if (this.gameEnded) return;
    this.gameEnded = true; // prevent further processing

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(50);
    const msg = this.add.text(width / 2, height / 2, 'OPPONENT DISCONNECTED', {
      fontSize: '32px', fontFamily: '"Arial Black", sans-serif',
      color: '#ff4444', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    // suppress lint warning
    void overlay; void msg;

    this.time.delayedCall(3000, () => {
      this.registry.remove('networkManager');
      this.scene.start('TitleScene');
    });
  }
}
