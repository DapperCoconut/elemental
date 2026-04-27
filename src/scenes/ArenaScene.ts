import Phaser from 'phaser';
import { processP2Abilities, P2Scene } from '../combat/P2AbilityHandler';
import { Fighter } from '../entities/Fighter';
import { Player } from '../entities/Player';
import { NpcOpponent, NpcAiState, DIFFICULTY_PRESETS, DifficultyConfig } from '../entities/NpcOpponent';
import { BasicCorrupted } from '../entities/corrupted/BasicCorrupted';
import { OverchargedCorrupted } from '../entities/corrupted/OverchargedCorrupted';
import { RusherCorrupted } from '../entities/corrupted/RusherCorrupted';
import { ProtectedCorrupted } from '../entities/corrupted/ProtectedCorrupted';
import { ArchitectCorrupted } from '../entities/corrupted/ArchitectCorrupted';
import { TitanCorrupted } from '../entities/corrupted/TitanCorrupted';
import { CorruptedBase, CorruptedType } from '../entities/corrupted/CorruptedBase';
import { FesteringGrowth } from '../invasion/FesteringGrowth';
import { WaveManager } from '../invasion/WaveManager';
import type { SpawnEntry } from '../invasion/WaveManager';
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
import { electricityElement } from '../elements/electricity';
import { slimeElement } from '../elements/slime';
import { fateElement } from '../elements/fate';
import { soundElement } from '../elements/sound';
import { lightElement } from '../elements/light';
import { magnetElement } from '../elements/magnet';
import { MagnetKit, MagnetArenaApi, MagnetRod } from '../elements/kits/MagnetKit';
import { LightKit, LightArenaApi } from '../elements/kits/LightKit';
import { ElectricityKit, ElectricityArenaApi } from '../elements/kits/ElectricityKit';
import { VoidKit, VoidArenaApi } from '../elements/kits/VoidKit';
import { TechnologyKit, TechArenaApi } from '../elements/kits/TechnologyKit';
import { SlimeKit, SlimeArenaApi } from '../elements/kits/SlimeKit';
import { metalElement } from '../elements/metal';
import { plasmaElement } from '../elements/plasma';
import { deathElement } from '../elements/death';
import { voidElement } from '../elements/void';
import { rubberElement } from '../elements/rubber';
import { magicElement } from '../elements/magic';
import { technologyElement } from '../elements/technology';
import { silenceElement } from '../elements/silence';
import { echoElement } from '../elements/quantum';
import { EchoKit, EchoArenaApi } from '../elements/kits/QuantumKit';
import { quantumElement } from '../elements/quantum-element';
import { QuantumElementKit, QuantumElementArenaApi } from '../elements/kits/QuantumElementKit';
import { OilKit, OilArenaApi } from '../elements/kits/OilKit';
import { FateKit, FateArenaApi } from '../elements/kits/FateKit';
import { SoundKit, SoundArenaApi } from '../elements/kits/SoundKit';
import { RubberKit, RubberArenaApi } from '../elements/kits/RubberKit';
import { SilenceKit, SilenceArenaApi, SilenceBarEntry } from '../elements/kits/SilenceKit';
import { FireKit, FireArenaApi } from '../elements/kits/FireKit';
import { DeathKit, DeathArenaApi } from '../elements/kits/DeathKit';
import { MagicKit, MagicArenaApi } from '../elements/kits/MagicKit';
import { dummyElement } from '../elements/dummy';
import { P2InputState, emptyP2Input } from '../network/P2InputState';
import * as PlayerData from '../data/PlayerData';
import { getTotalRewardMult, MUTATIONS } from '../data/Mutations';

interface AbilityBarEntry {
  fill: Phaser.GameObjects.Rectangle;
  abilityId: string;
  maxWidth: number;
  lbl?: Phaser.GameObjects.Text;
  baseFillColor?: number;
}

interface MetalBloodPuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc'; // who can heal from this puddle
  drainAccum: number;
  draining: boolean;
}

interface MetalGunProjectile {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  type: 'grenade' | 'rpg' | 'taser' | 'flame';
  damage: number;
  explodeRadius?: number;
  active: boolean;
  expiresAt?: number;
}

interface MetalChainProjectile {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  active: boolean;
}

interface PlasmaArena {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc'; // who placed it (but hits both sides)
  playerInAccum: number;
  npcInAccum: number;
  expiresAt: number;
}

interface PlasmaCurrentOrb {
  spriteA: Phaser.GameObjects.Arc;
  spriteB: Phaser.GameObjects.Arc;
  chainGraphic: Phaser.GameObjects.Graphics;
  ax: number; ay: number;
  bx: number; by: number;
  vax: number; vay: number;
  vbx: number; vby: number;
  owner: 'player' | 'npc';
  tickAccum: number;
  active: boolean;
  expiresAt: number;
}

interface PlasmaBlade {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  expiresAt: number;
  spawnedAt: number;
  active: boolean;
}

interface PlasmaChaosEffect {
  target: 'player' | 'npc';
  expiresAt: number;
  tickAccum: number;
  aura: Phaser.GameObjects.Arc | null;
}

interface PlasmaChaosOrb {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc'; // who placed it (damages the OTHER side)
  active: boolean;
}

interface Puddle {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Graphics;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
  kind?: 'puddle' | 'stalagmite' | 'poison';
  lavaFinal?: boolean;
}

interface TreeOfLife {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  spawnCount: number;
  spawnAccum: number;
  expiresAt: number; // time after which tree disappears if all apples spawned
  owner: 'player' | 'npc';
}

interface GoldenApple {
  sprite: Phaser.GameObjects.Text;
  x: number;
  y: number;
  rotsAt: number;
  expiresAt: number;
  rotted: boolean;
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

interface LingeringBeam {
  gfx: Phaser.GameObjects.Graphics;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  expiresAt: number;
  owner: 'player' | 'npc';
  lastHitAt: Map<object, number>; // Fighter reference → timestamp
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
  type: 'normal' | 'life' | 'thorn' | 'mushroom' | 'mini-mushroom' | 'heal-mushroom' | 'poison-mushroom';
  accum: number; // timer accumulator for plant special effects
  plantId?: number;      // unique id for mushroom parent-child links
  parentId?: number;     // set on mini-mushrooms to reference parent's plantId
  miniSpawnAccum?: number; // accumulator for mini-mushroom spawning on parents
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
  isPlume?: boolean;
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
  isGateway?: boolean;    // Gateway quad perk: passthrough + beam-widen instead of bounce
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
  rink?: boolean;
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
  isLeap?: boolean;
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

// MagnetRod, MagnetNail, MagnetShieldOrb, MagnetAtomSmasher imported from MagnetKit

// Quantum and Fate interfaces are defined in their respective kit files

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
  electricity: electricityElement,
  slime: slimeElement,
  fate: fateElement,
  sound: soundElement,
  light: lightElement,
  magnet: magnetElement,
  metal: metalElement,
  plasma: plasmaElement,
  death: deathElement,
  void: voidElement,
  rubber: rubberElement,
  magic: magicElement,
  technology: technologyElement,
  silence: silenceElement,
  echo: echoElement,
  quantum: quantumElement,
  dummy: dummyElement,
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
  electricity: 'elem-electricity',
  slime: 'elem-slime',
  fate: 'elem-fate',
  sound: 'elem-sound',
  light: 'elem-light',
  magnet: 'elem-magnet',
  metal: 'elem-metal',
  plasma: 'elem-plasma',
  death: 'elem-death',
  void: 'elem-void',
  rubber: 'elem-rubber',
  magic: 'elem-magic',
  technology: 'elem-technology',
  silence: 'elem-silence',
  echo: 'elem-echo',
  quantum: 'elem-quantum',
  dummy: 'elem-dummy',
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
  private isInvasion = false;
  private enemies: Fighter[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private festeringGrowths: FesteringGrowth[] = [];
  private waveManager!: WaveManager;
  private invasionShardsEarned = 0;
  private invasionWavesCompleted = 0;
  private invasionBetweenWavesUntil = 0;
  private invasionWaveBanner: Phaser.GameObjects.Text | null = null;
  private invasionCorruptShardLabel: Phaser.GameObjects.Text | null = null;
  private invasionArchitectIdCounter = 0;


  // Dummy mode keys (arrow keys + P for dummy control)
  private dummyUpKey!: Phaser.Input.Keyboard.Key;
  private dummyDownKey!: Phaser.Input.Keyboard.Key;
  private dummyLeftKey!: Phaser.Input.Keyboard.Key;
  private dummyRightKey!: Phaser.Input.Keyboard.Key;
  private dummyFireKey!: Phaser.Input.Keyboard.Key;
  private dummyBackBtn: Phaser.GameObjects.Text | null = null;

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
  private pausedAt = 0;

  // Shared state — reset in create()
  private abilityBars: AbilityBarEntry[] = [];
  private dodgeOnCooldown = false;
  private isDodging = false;
  private gameEnded = false;
  private playerSpeedMult = 1;
  private gauntletState: import('../data/GauntletData').GauntletState | null = null;
  private gauntletSpeedMult = 1;

  // (Player fire state moved to FireKit)
  private pointerWasDown = false;
  private rightPointerWasDown = false;
  private nukeChanneling = false;
  private nukeChannelEnd = 0;

  // Player water-specific state
  private splashActiveUntil = 0;
  private splashDropAccum = 0;
  private splashDropCount = 0;         // E upgrade: tracks puddle index in splash sequence
  private playerGeyserBuffUntil = 0;
  private shieldAura: Phaser.GameObjects.Arc | null = null;

  // Player life-specific state
  private plantIdCounter = 0;
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
  // Tree of Life / Golden Apple state
  private playerTree: TreeOfLife | null = null;
  private npcTree: TreeOfLife | null = null;
  private playerApples: GoldenApple[] = [];
  private npcApples: GoldenApple[] = [];
  private playerAppleCollected = 0;
  private npcAppleCollected = 0;
  private playerPoisonFountainUntil = 0;
  private npcPoisonFountainUntil = 0;
  private playerPoisonDropAccum = 0;
  private npcPoisonDropAccum = 0;

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
  private lingeringBeams: LingeringBeam[] = [];

  // NPC mirror state
  private npcSpeedMult = 1;
  // (NPC fire state moved to FireKit)
  private npcNukeChanneling = false;
  private npcNukeChannelEnd = 0;
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

  // SoundKit (manages all sound state)
  private soundKit!: SoundKit;
  // Air F upgrade extended dodge
  private grappleDodgeUntil = 0;

  // Player earth-specific state (new kit)
  private earthShieldHp = 0;
  private earthShieldMaxHp = 75;
  private earthShieldEnhanced = false;
  private earthShieldSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthShieldAngle = 0;
  private earthShieldRespawnAt = 0;
  private earthShieldBroken = false;
  private earthShieldLabel: Phaser.GameObjects.Text | null = null;
  private earthBashActive = false;
  private earthBashEnd = 0;
  private earthBashDirX = 0;
  private earthBashDirY = 0;
  private earthBashHitDealt = false;
  private earthBashStartX = 0;
  private earthBashStartY = 0;
  private earthRepairActive = false;
  private earthRepairEnd = 0;
  private earthRepairAura: Phaser.GameObjects.Arc | null = null;
  private earthRocks: Array<{ sprite: Phaser.GameObjects.Arc; hitCdUntil: number }> = [];
  private earthRockOrbitAngle = 0;
  private earthLaunchedRocks: Array<{ sprite: Phaser.GameObjects.Arc; vx: number; vy: number; spawnedAt: number }> = [];
  private earthQuakeSprite: Phaser.GameObjects.Arc | null = null;
  private earthQuakeExpiry = 0;
  private earthQuakeX = 0;
  private earthQuakeY = 0;
  private earthQuakeTickAccum = 0;
  private earthQuakeStunUntil = 0;
  private earthGolemActive = false;
  private earthGolemHp = 0;
  private earthGolemMaxHp = 150;
  private earthGolemX = 0;
  private earthGolemY = 0;
  private earthGolemSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthGolemLink: Phaser.GameObjects.Graphics | null = null;
  private earthGolemUntil = 0;
  private earthGolemPunchCdUntil = 0;
  private earthGolemFaultCdUntil = 0;
  private earthGolemPoundCdUntil = 0;
  private earthGolemFaultWallSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthGolemFaultWallUntil = 0;
  private earthGolemHpLabel: Phaser.GameObjects.Text | null = null;
  private playerEarthCastId: string | null = null;
  private playerEarthStunnedUntil = 0;

  // Earth upgrade state (Click+: dual shield)
  private earthBackShieldHp = 0;
  private earthBackShieldMaxHp = 50;
  private earthBackShieldSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthBackShieldLabel: Phaser.GameObjects.Text | null = null;
  // Earth upgrade state (E+: shield splinter)
  private earthSplinterHolding = false;
  private earthSplinterHoldStart = 0;
  private earthSplinterReady = false;
  private earthSplinterAura: Phaser.GameObjects.Rectangle | null = null;
  private earthSplinterRepairFast = false;
  // Earth upgrade state (R+: lava rocks)
  private earthLavaRockFirePools: Array<{ sprite: Phaser.GameObjects.Arc; expiresAt: number }> = [];
  private earthQuakeMagmified = false;
  // Earth upgrade state (F+: tsunami waves)
  private earthTsunamiWaves: Array<{ sprite: Phaser.GameObjects.Rectangle; vx: number; vy: number; expiresAt: number; owner?: 'player' | 'npc' }> = [];
  // Earth upgrade state (Q+: golem fusion)
  private earthGolemFuseHolding = false;
  private earthGolemFuseHoldStart = 0;
  private earthGolemFused = false;
  private earthGolemFusedHp = 0;
  private earthGolemFusedMaxHp = 100;
  private earthGolemFusedUntil = 0;
  private earthGolemFusedPreHp = 0;
  private earthGolemFusedSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthGolemFusedHpLabel: Phaser.GameObjects.Text | null = null;
  private earthGolemFuseChargeVisual: Phaser.GameObjects.Arc | null = null;
  private earthGolemFusedPunchCdUntil = 0;
  private earthGolemFusedRepairHolding = false;
  private earthGolemFusedRepairEnd = 0;
  private earthGolemFusedPoundCdUntil = 0;
  private earthGolemFusedFaultCdUntil = 0;
  private earthGolemFusedFaultWallSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthGolemFusedFaultWallUntil = 0;

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
  // Clone earth state (legacy fields — new kit uses stubs; kept so clone AI doesn't error)
  private cloneEarthSlamActive = false;
  private cloneEarthSlamEnd = 0;
  private cloneEarthSlamHitDealt = false;
  // Win condition tracking for Clone/Raid (allEnemiesMustDie = true)
  private allEnemiesMustDie = false;
  private npcMainDefeated = false;
  // Raid mutation
  private raidEnemies: NpcOpponent[] = [];
  private raidProjectiles: Phaser.Physics.Arcade.Group[] = [];
  private raidDefeated: boolean[] = [];
  // Shielded mutation — totem system
  private shieldTotems: Array<{
    sprite: Phaser.GameObjects.Arc;
    hpBarFill: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
    hp: number;
    maxHp: number;
  }> = [];
  private nextTotemSpawnTime = 0;
  private baseNpcMaxHpForTotem = 0;

  // NPC earth-specific state (new kit)
  private npcEarthShieldHp = 0;
  private npcEarthShieldMaxHp = 75;
  private npcEarthShieldEnhanced = false;
  private npcEarthShieldSprite: Phaser.GameObjects.Rectangle | null = null;
  private npcEarthShieldAngle = 0;
  private npcEarthShieldRespawnAt = 0;
  private npcEarthShieldBroken = false;
  private npcEarthShieldLabel: Phaser.GameObjects.Text | null = null;
  private npcEarthBashActive = false;
  private npcEarthBashEnd = 0;
  private npcEarthBashDirX = 0;
  private npcEarthBashDirY = 0;
  private npcEarthBashHitDealt = false;
  private npcEarthBashStartX = 0;
  private npcEarthBashStartY = 0;
  private npcEarthRepairActive = false;
  private npcEarthRepairEnd = 0;
  private npcEarthRocks: Array<{ sprite: Phaser.GameObjects.Arc; hitCdUntil: number }> = [];
  private npcEarthRockOrbitAngle = 0;
  private npcEarthLaunchedRocks: Array<{ sprite: Phaser.GameObjects.Arc; vx: number; vy: number; spawnedAt: number }> = [];
  private npcEarthQuakeSprite: Phaser.GameObjects.Arc | null = null;
  private npcEarthQuakeExpiry = 0;
  private npcEarthQuakeX = 0;
  private npcEarthQuakeY = 0;
  private npcEarthQuakeTickAccum = 0;
  private npcEarthQuakeStunUntil = 0;
  private npcEarthGolemActive = false;
  private npcEarthGolemHp = 0;
  private npcEarthGolemX = 0;
  private npcEarthGolemY = 0;
  private npcEarthGolemSprite: Phaser.GameObjects.Rectangle | null = null;
  private npcEarthGolemLink: Phaser.GameObjects.Graphics | null = null;
  private npcEarthGolemUntil = 0;
  private npcEarthGolemPunchCdUntil = 0;
  private npcEarthGolemFaultCdUntil = 0;
  private npcEarthGolemPoundCdUntil = 0;
  private npcEarthGolemFaultWallSprite: Phaser.GameObjects.Rectangle | null = null;
  private npcEarthGolemFaultWallUntil = 0;
  private npcEarthGolemHpLabel: Phaser.GameObjects.Text | null = null;


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
  private playerFrostStacks = 0;
  private playerFrostVisual: Phaser.GameObjects.Text | null = null;
  // Ice — player
  private playerBlockUpActive = false;
  private playerBlockUpAura: Phaser.GameObjects.Arc | null = null;
  private playerFrozenUntil = 0;
  // Ice — NPC
  private npcBlockUpActive = false;
  private npcBlockUpAura: Phaser.GameObjects.Arc | null = null;
  // Ice — shared
  private icyTrails: IcyTrail[] = [];
  // Ice upgrades state
  private playerBlackIceMorphActive = false;
  private playerBlackIceAura: Phaser.GameObjects.Arc | null = null;
  private npcVoidedVisual: Phaser.GameObjects.Text | null = null;
  private playerIceConsecHits = 0;
  private playerNextIcePowered = false;
  private playerIcePendingSet: Set<Projectile> = new Set();
  private playerIceSpeedBoostUntil = 0;

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
  private lastNpcInfectCast = -99999;
  private lastNpcBloatCast = -99999;
  // Growth — toxic DOT
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
  private huntBloodHuntTarget: Fighter | null = null;
  private huntBloodHuntInvincUntil = 0;
  private huntBloodHuntCharging = false;
  private huntBloodHuntChargeEnd = 0;
  private huntLeapTeleported = false;
  private huntHybridForm = false;
  private huntBeastEnteredAt = 0;
  private huntHybridTrailStandAccum = 0;
  private huntHybridLeapBoostUntil = 0;
  private huntHybridScreechCdUntil = 0;
  private npcHuntShriekDotUntil = 0;
  private npcHuntShriekDotTick = 0;
  private huntHybridHudCards: Phaser.GameObjects.GameObject[] = [];
  private huntHybridFills: AbilityBarEntry[] = [];
  private huntSilverPellets = new WeakSet<Projectile>();
  private huntShrapnelSet = new WeakSet<Projectile>();
  private npcHuntConfusedUntil = 0;
  private npcHuntConfuseVx = 0;
  private npcHuntConfuseVy = 0;
  private npcHuntConfuseDirUntil = 0;

  // ── Silence — managed by SilenceKit ──────────────────────────────
  private silenceKit!: SilenceKit;
  private silencePlayerYankUntil = 0; // read by movement lock, written by kit via api
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
  // Mastered Flameshredder — player burns from NPC fireballs
  private playerBurningUntil = 0;
  private playerBurnTickAccum = 0;
  private playerBurnAura: Phaser.GameObjects.Arc | null = null;
  // (Pressure Charge / Flame Body / Flame Charge state moved to FireKit)
  private fKeyHeldSince = 0;
  private fKeyWasDown = false;

  // Electricity kit
  private electricityKit!: ElectricityKit;

  private lightKit!: LightKit;
  private voidKit!: VoidKit;
  private techKit!: TechnologyKit;
  // Shared NPC cast ID field — set each frame after doAI() returns
  private npcCastId: string | null = null;

  // Slime kit
  private slimeKit!: SlimeKit;

  // (Fate state is now managed by FateKit)

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

  // ── Magnet (electricity + slime abstract combined) ───────────────────
  private magnetKit!: MagnetKit;

  // ── Metal (electricity + fate abstract combined) ─────────────────────
  private metalArsenal: string[] = [];
  private npcMetalArsenal: string[] = [];
  private npcAggressiveBleeding = false;
  private npcAggressiveBleedUntil = 0;
  private npcAggressiveBleedAura: Phaser.GameObjects.Arc | null = null;
  private npcAggressiveBleedTickAccum = 0;
  private npcAggressiveBleedPuddleAccum = 0;
  private playerAggressiveBleeding = false;
  private playerAggressiveBleedUntil = 0;
  private playerAggressiveBleedAura: Phaser.GameObjects.Arc | null = null;
  private playerAggressiveBleedTickAccum = 0;
  private playerAggressiveBleedPuddleAccum = 0;
  private metalBloodPuddles: MetalBloodPuddle[] = [];
  private metalChainTethered = false;
  private metalChainTetherEnd = 0;
  private metalChainGraphic: Phaser.GameObjects.Graphics | null = null;
  private npcMetalChainTethered = false;
  private npcMetalChainTetherEnd = 0;
  private npcMetalChainGraphic: Phaser.GameObjects.Graphics | null = null;
  private metalArmorActive = false;
  private metalArmorHp = 0;
  private metalArmorEnd = 0;
  private metalArmorAura: Phaser.GameObjects.Arc | null = null;
  private npcMetalArmorActive = false;
  private npcMetalArmorHp = 0;
  private npcMetalArmorEnd = 0;
  private npcMetalArmorAura: Phaser.GameObjects.Arc | null = null;
  private metalArsenalHUD: Phaser.GameObjects.Text | null = null;
  private metalReinforcementMenuOpen = false;
  private metalReinforcementButtons: Phaser.GameObjects.GameObject[] = [];
  private metalChainProjectiles: MetalChainProjectile[] = [];
  private metalGunProjectiles: MetalGunProjectile[] = [];
  private npcMetalTaseredUntil = 0;
  private playerMetalTaseredUntil = 0;
  private metalArmorReflecting = false;
  private npcMetalArmorReflecting = false;
  private metalBloodChainPuddle: MetalBloodPuddle | null = null;
  private metalBloodChainAccum = 0;
  private metalBloodChainGraphic: Phaser.GameObjects.Graphics | null = null;

  // ── Plasma (electricity + light abstract combined) ─────────────────
  private plasmaArenas: PlasmaArena[] = [];
  private plasmaCurrentOrbs: PlasmaCurrentOrb[] = [];
  private plasmaBlades: PlasmaBlade[] = [];
  private plasmaChaosEffects: PlasmaChaosEffect[] = [];
  private plasmaChaosOrbs: PlasmaChaosOrb[] = [];
  private plasmaIncarnateActive = false;
  private plasmaIncarnateEnd = 0;
  private plasmaIncarnateLastChain = 0;
  private plasmaIncarnateLastTouch = 0;
  private plasmaIncarnateAura: Phaser.GameObjects.Arc | null = null;
  private plasmaRHolding = false;
  private plasmaRHeldSince = 0;
  private plasmaRPreviewA: Phaser.GameObjects.Arc | null = null;
  private plasmaRPreviewB: Phaser.GameObjects.Arc | null = null;
  private npcPlasmaIncarnateActive = false;
  private npcPlasmaIncarnateEnd = 0;
  private npcPlasmaIncarnateLastChain = 0;
  private npcPlasmaIncarnateLastTouch = 0;
  private npcPlasmaIncarnateAura: Phaser.GameObjects.Arc | null = null;
  private plasmaVoltPoints: { sprite: Phaser.GameObjects.Arc; x: number; y: number; owner: 'player' | 'npc'; charges: number; expiresAt: number; paired?: { x: number; y: number } }[] = [];

  // ── Death — managed by DeathKit ──────────────────────────────────
  private deathKit!: DeathKit;
  // Kept for VoidKit API compatibility (always 0 in new design)
  private deathSoulSplitUntil = 0;
  private npcDeathSoulSplitUntil = 0;

  // ── Void — managed by VoidKit ─────────────────────────────────────

  // ── Rubber — managed by RubberKit ────────────────────────────────
  private rubberKit!: RubberKit;

  // ── Magic (abstract combined: slime + light) — managed by MagicKit ──
  private magicKit!: MagicKit;


  // ── Echo (abstract combined: fate + light) kit ───────────────────────
  private echoKit!: EchoKit;
  private fogOverlayRT: Phaser.GameObjects.RenderTexture | null = null;

  // ── Quantum (abstract combined: slime + fate) kit ─────────────────────
  private quantumElementKit!: QuantumElementKit;

  // ── Oil kit ───────────────────────────────────────────────────────────
  private oilKit!: OilKit;

  // ── Fire kit ──────────────────────────────────────────────────────────
  private fireKit!: FireKit;

  // ── Fate kit ──────────────────────────────────────────────────────────
  private fateKit!: FateKit;
  private playerFateBaseSpeedMult = 1;
  private playerFateBaseCooldownMult = 1;
  private playerFateBaseIncomingDmgMult = 1;

  // Shared world effects (owner-aware)
  private puddles: Puddle[] = [];
  private geysers: Geyser[] = [];
  private painRainShadows: PainRainShadow[] = [];

  // ── Perk state ───────────────────────────────────────────────
  private playerPerkId: string | null = null;
  private npcPerkId: string | null = null;
  // Purge perk (Time/sand): save prior cooldownMult before halving it
  private purgePriorCooldownMult = 1;
  private purgePulseTween: Phaser.Tweens.Tween | null = null;
  // Hawk perk (Air): eagle projectiles
  private hawkProjectiles: Array<{ sprite: Phaser.GameObjects.Arc; vx: number; vy: number; expireAt: number }> = [];
  private npcHawkDragUntil = 0;
  // Automaton perk (Creation): wandering damage bots
  private automatons: Array<{
    sprite: Phaser.GameObjects.Arc;
    x: number; y: number;
    vx: number; vy: number;
    expireAt: number;
    meleeCooldownUntil: number;
    owner: 'player' | 'npc';
  }> = [];
  // Rink perk (Ice): timestamp until which the skate speed bonus applies
  private playerSkateRecentUntil = 0;
  private npcSkateRecentUntil    = 0;
  // Ward perk (Soul): warding hexes from Consume
  private soulWardHexes: Array<{
    gfx: Phaser.GameObjects.Graphics;
    expiresAt: number;
    x: number; y: number;
    radius: number;
    owner: 'player' | 'npc';
    ownerAura: Phaser.GameObjects.Arc | null;
    summonAuras: Array<{ arc: Phaser.GameObjects.Arc; summon: SoulSummon }>;
  }> = [];
  // (Candle perk golem state moved to FireKit)
  // Rage perk (Hunt): rage meter
  private playerHuntRage = 0;
  private npcHuntRage    = 0;
  private playerHuntRageBar: Phaser.GameObjects.Rectangle | null = null;
  private npcHuntRageBar: Phaser.GameObjects.Rectangle | null = null;
  private playerHuntRageTriggeredBeast = false;
  private npcHuntRageTriggeredBeast    = false;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(data: { elementId: string; enemyElementId?: string; difficulty?: number; mutations?: string[]; isPvP?: boolean; mode?: string; gauntlet?: import('../data/GauntletData').GauntletState; playerPerk?: string | null; npcPerk?: string | null }): void {
    this.elementId = data.elementId ?? 'fire';
    this.isPvP = data.isPvP ?? false;
    this.isInvasion = data.mode === 'invasion';
    this.playerPerkId = data.playerPerk ?? null;
    this.npcPerkId = data.npcPerk ?? null;
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
    // Reset perk-specific state
    this.purgePriorCooldownMult = 1;
    if (this.purgePulseTween) { this.purgePulseTween.stop(); this.purgePulseTween = null; }
    this.hawkProjectiles.forEach((h) => h.sprite.destroy());
    this.hawkProjectiles = [];
    this.npcHawkDragUntil = 0;
    this.automatons.forEach((a) => a.sprite.destroy());
    this.automatons = [];
    this.playerSkateRecentUntil = 0;
    this.npcSkateRecentUntil = 0;
    this.soulWardHexes.forEach((w) => {
      w.gfx.destroy(); w.ownerAura?.destroy();
      w.summonAuras.forEach((sa) => sa.arc.destroy());
    });
    this.soulWardHexes = [];
    // (candleGolems reset handled by fireKit.reset())
    this.playerHuntRage = 0; this.npcHuntRage = 0;
    this.playerHuntRageBar?.destroy(); this.playerHuntRageBar = null;
    this.npcHuntRageBar?.destroy();    this.npcHuntRageBar = null;
    this.playerHuntRageTriggeredBeast = false;
    this.npcHuntRageTriggeredBeast    = false;
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

    this.pointerWasDown = false;
    this.rightPointerWasDown = false;
    this.nukeChanneling = false;
    this.nukeChannelEnd = 0;

    this.splashActiveUntil = 0;
    this.splashDropAccum = 0;
    this.splashDropCount = 0;
    this.playerGeyserBuffUntil = 0;
    this.shieldAura = null;

    this.npcSpeedMult = 1;
    this.npcNukeChanneling = false;
    this.npcNukeChannelEnd = 0;
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

    this.plantIdCounter = 0;
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
    if (this.playerTree) { this.playerTree.sprite.destroy(); this.playerTree.label.destroy(); this.playerTree = null; }
    if (this.npcTree) { this.npcTree.sprite.destroy(); this.npcTree.label.destroy(); this.npcTree = null; }
    for (const a of this.playerApples) a.sprite.destroy();
    this.playerApples = [];
    for (const a of this.npcApples) a.sprite.destroy();
    this.npcApples = [];
    this.playerAppleCollected = 0;
    this.npcAppleCollected = 0;
    this.playerPoisonFountainUntil = 0;
    this.npcPoisonFountainUntil = 0;
    this.playerPoisonDropAccum = 0;
    this.npcPoisonDropAccum = 0;
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
    for (const b of this.lingeringBeams) { b.gfx.destroy(); }
    this.lingeringBeams = [];

    // Earth new kit reset
    // Obsidian perk raises base shield HP: 100 single, or 75 each with Double Shield upgrade
    const obsidianOn = this.hasPerk('player', 'obsidian') && this.elementId === 'earth';
    const baseShieldHp = obsidianOn ? 100 : 75;
    this.earthShieldHp = baseShieldHp;
    this.earthShieldMaxHp = baseShieldHp;
    this.earthShieldEnhanced = false;
    this.earthShieldSprite = null;
    this.earthShieldAngle = 0;
    this.earthShieldRespawnAt = 0;
    this.earthShieldBroken = false;
    this.earthShieldLabel = null;
    this.earthBashActive = false;
    this.earthBashEnd = 0;
    this.earthBashDirX = 0;
    this.earthBashDirY = 0;
    this.earthBashHitDealt = false;
    this.earthBashStartX = 0;
    this.earthBashStartY = 0;
    this.earthRepairActive = false;
    this.earthRepairEnd = 0;
    this.earthRepairAura = null;
    this.earthRocks.forEach(r => r.sprite.destroy());
    this.earthRocks = [];
    this.earthRockOrbitAngle = 0;
    this.earthLaunchedRocks.forEach(r => r.sprite.destroy());
    this.earthLaunchedRocks = [];
    this.earthQuakeSprite = null;
    this.earthQuakeExpiry = 0;
    this.earthQuakeX = 0;
    this.earthQuakeY = 0;
    this.earthQuakeTickAccum = 0;
    this.earthQuakeStunUntil = 0;
    this.earthGolemActive = false;
    this.earthGolemHp = 0;
    this.earthGolemX = 0;
    this.earthGolemY = 0;
    this.earthGolemSprite = null;
    this.earthGolemLink = null;
    this.earthGolemUntil = 0;
    this.earthGolemPunchCdUntil = 0;
    this.earthGolemFaultCdUntil = 0;
    this.earthGolemPoundCdUntil = 0;
    this.earthGolemFaultWallSprite = null;
    this.earthGolemFaultWallUntil = 0;
    this.earthGolemHpLabel = null;
    this.playerEarthCastId = null;
    this.playerEarthStunnedUntil = 0;
    // Earth upgrade resets
    const obsidianBackShieldHp = (this.hasPerk('player', 'obsidian') && this.elementId === 'earth') ? 75 : 50;
    this.earthBackShieldHp = 0;
    this.earthBackShieldMaxHp = obsidianBackShieldHp;
    if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
    if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
    this.earthSplinterHolding = false;
    this.earthSplinterHoldStart = 0;
    this.earthSplinterReady = false;
    if (this.earthSplinterAura) { this.earthSplinterAura.destroy(); this.earthSplinterAura = null; }
    this.earthSplinterRepairFast = false;
    this.earthLavaRockFirePools.forEach(p => p.sprite.destroy());
    this.earthLavaRockFirePools = [];
    this.earthQuakeMagmified = false;
    this.earthTsunamiWaves.forEach(w => w.sprite.destroy());
    this.earthTsunamiWaves = [];
    this.earthGolemFuseHolding = false;
    this.earthGolemFuseHoldStart = 0;
    this.earthGolemFused = false;
    this.earthGolemFusedHp = 0;
    this.earthGolemFusedUntil = 0;
    this.earthGolemFusedPreHp = 0;
    if (this.earthGolemFusedSprite) { this.earthGolemFusedSprite.destroy(); this.earthGolemFusedSprite = null; }
    if (this.earthGolemFusedHpLabel) { this.earthGolemFusedHpLabel.destroy(); this.earthGolemFusedHpLabel = null; }
    if (this.earthGolemFuseChargeVisual) { this.earthGolemFuseChargeVisual.destroy(); this.earthGolemFuseChargeVisual = null; }
    this.earthGolemFusedPunchCdUntil = 0;
    this.earthGolemFusedRepairHolding = false;
    this.earthGolemFusedRepairEnd = 0;
    this.earthGolemFusedPoundCdUntil = 0;
    this.earthGolemFusedFaultCdUntil = 0;
    if (this.earthGolemFusedFaultWallSprite) { this.earthGolemFusedFaultWallSprite.destroy(); this.earthGolemFusedFaultWallSprite = null; }
    this.earthGolemFusedFaultWallUntil = 0;
    this.npcCastId = null;
    // NPC earth new kit reset
    this.npcEarthShieldHp = 75;
    this.npcEarthShieldMaxHp = 75;
    this.npcEarthShieldEnhanced = false;
    this.npcEarthShieldSprite = null;
    this.npcEarthShieldAngle = 0;
    this.npcEarthShieldRespawnAt = 0;
    this.npcEarthShieldBroken = false;
    this.npcEarthShieldLabel = null;
    this.npcEarthBashActive = false;
    this.npcEarthBashEnd = 0;
    this.npcEarthBashDirX = 0;
    this.npcEarthBashDirY = 0;
    this.npcEarthBashHitDealt = false;
    this.npcEarthBashStartX = 0;
    this.npcEarthBashStartY = 0;
    this.npcEarthRepairActive = false;
    this.npcEarthRepairEnd = 0;
    this.npcEarthRocks.forEach(r => r.sprite.destroy());
    this.npcEarthRocks = [];
    this.npcEarthRockOrbitAngle = 0;
    this.npcEarthLaunchedRocks.forEach(r => r.sprite.destroy());
    this.npcEarthLaunchedRocks = [];
    this.npcEarthQuakeSprite = null;
    this.npcEarthQuakeExpiry = 0;
    this.npcEarthQuakeX = 0;
    this.npcEarthQuakeY = 0;
    this.npcEarthQuakeTickAccum = 0;
    this.npcEarthQuakeStunUntil = 0;
    this.npcEarthGolemActive = false;
    this.npcEarthGolemHp = 0;
    this.npcEarthGolemX = 0;
    this.npcEarthGolemY = 0;
    this.npcEarthGolemSprite = null;
    this.npcEarthGolemLink = null;
    this.npcEarthGolemUntil = 0;
    this.npcEarthGolemPunchCdUntil = 0;
    this.npcEarthGolemFaultCdUntil = 0;
    this.npcEarthGolemPoundCdUntil = 0;
    this.npcEarthGolemFaultWallSprite = null;
    this.npcEarthGolemFaultWallUntil = 0;
    this.npcEarthGolemHpLabel = null;

    this.p2LastAimX = 0;
    this.p2LastAimY = 0;
    this.p2PainRainHolding = false;
    this.p2PainRainHoldAccum = 0;
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

    this.playerFrostStacks = 0;
    this.playerFrostVisual = null;
    this.playerBlockUpActive = false;
    this.playerBlockUpAura = null;
    this.playerFrozenUntil = 0;
    this.npcBlockUpActive = false;
    this.npcBlockUpAura = null;
    this.icyTrails = [];
    this.playerBlackIceMorphActive = false;
    this.playerBlackIceAura = null;
    this.npcVoidedVisual = null;
    this.playerIceConsecHits = 0;
    this.playerNextIcePowered = false;
    this.playerIcePendingSet = new Set();
    this.playerIceSpeedBoostUntil = 0;
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
    this.playerBleeding = false;
    if (this.playerBleedAura) { this.playerBleedAura.destroy(); this.playerBleedAura = null; }
    this.npcHuntSlowUntil = 0; this.playerHuntSlowUntil = 0;
    this.huntBloodMoonActive = false; this.npcHuntBloodMoonActive = false;
    if (this.huntBloodMoonFilter) { this.huntBloodMoonFilter.destroy(); this.huntBloodMoonFilter = null; }
    if (this.npcHuntBloodMoonFilter) { this.npcHuntBloodMoonFilter.destroy(); this.npcHuntBloodMoonFilter = null; }
    this.huntNormalHudCards = []; this.huntBeastHudCards = [];
    this.huntNormalFills = []; this.huntBeastFills = [];
    this.huntPermTrailActive = false;
    this.huntBloodHuntTarget = null;
    this.huntBloodHuntInvincUntil = 0;
    this.huntBloodHuntCharging = false;
    this.huntBloodHuntChargeEnd = 0;
    this.huntLeapTeleported = false;
    this.huntHybridForm = false;
    this.huntBeastEnteredAt = 0;
    this.huntHybridTrailStandAccum = 0;
    this.huntHybridLeapBoostUntil = 0;
    this.huntHybridScreechCdUntil = 0;
    this.npcHuntShriekDotUntil = 0;
    this.npcHuntShriekDotTick = 0;
    this.huntHybridHudCards = []; this.huntHybridFills = [];
    this.huntSilverPellets = new WeakSet<Projectile>();
    this.huntShrapnelSet = new WeakSet<Projectile>();
    this.npcHuntConfusedUntil = 0; this.npcHuntConfuseDirUntil = 0;
    if (this.npc) { this.npc.npcHuntRoarLocked = false; }

    // Silence kit construction / reset
    this.silencePlayerYankUntil = 0;
    if (this.silenceKit) {
      this.silenceKit.reset();
    } else {
      const arena = this;
      const silenceApi: SilenceArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene() { return arena as Phaser.Scene; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get enemies() { return arena.enemies; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        setIsDodging: (v) => { arena.isDodging = v; },
        applyPlayerSpeedMult: (f) => { arena.playerSpeedMult *= f; },
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        setAbilityBars: (fills) => { arena.abilityBars = fills as AbilityBarEntry[]; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        setNukeChanneling: (v, endAt) => { arena.nukeChanneling = v; arena.nukeChannelEnd = endAt; },
        setPlayerYankUntil: (t) => { arena.silencePlayerYankUntil = t; },
      };
      this.silenceKit = new SilenceKit(silenceApi);
    }

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
    this.lastNpcInfectCast = -99999;
    this.lastNpcBloatCast = -99999;
    this.playerToxicUntil = 0; this.playerToxicDps = 0; this.playerToxicTickAccum = 0;
    if (this.playerToxicAura) { this.playerToxicAura.destroy(); this.playerToxicAura = null; }

    this.activeUpgrades = PlayerData.getActiveUpgrades(this.elementId);
    this.playerBurningUntil = 0;
    this.playerBurnTickAccum = 0;
    this.playerBurnAura = null;
    this.fKeyHeldSince = 0;
    this.fKeyWasDown = false;
    // FireKit adapter
    if (this.fireKit) {
      this.fireKit.reset();
    } else {
      const arena = this;
      const fireApi: FireArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        spawnFlamethrowerCone: (px, py, tx, ty) => arena.spawnFlamethrowerCone(px, py, tx, ty),
        damagePlayerTargets: (cx, cy, r, d, col) => arena.damagePlayerTargets(cx, cy, r, d, col),
      };
      this.fireKit = new FireKit(fireApi);
    }
    // ElectricityKit adapter
    if (!this.electricityKit) {
      const arena = this;
      const electricityApi: ElectricityArenaApi = {
        get player() { return arena.player; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        get playerSpeedMult() { return arena.playerSpeedMult; },
        set playerSpeedMult(v: number) { arena.playerSpeedMult = v; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
      };
      this.electricityKit = new ElectricityKit(electricityApi);
    }
    this.electricityKit.reset(this.elementId === 'electricity');

    // SoundKit adapter
    const isSoundMatch = this.elementId === 'sound' || this.npcElement.id === 'sound';
    if (this.soundKit) {
      this.soundKit.reset(isSoundMatch);
    } else {
      const arena = this;
      const soundApi: SoundArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get npcCastId() { return arena.npcCastId; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        setIsDodging: (v) => { arena.isDodging = v; },
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
      };
      this.soundKit = new SoundKit(soundApi);
    }

    // LightKit adapter
    if (this.lightKit) {
      this.lightKit.reset();
    } else {
      const arena = this;
      const lightApi: LightArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get npcCastId() { return arena.npcCastId; },
        get enemies() { return arena.enemies; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
      };
      this.lightKit = new LightKit(lightApi);
    }

    if (this.slimeKit) {
      this.slimeKit.reset();
    } else {
      const arena = this;
      const slimeApi: SlimeArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get isInvasion() { return arena.isInvasion; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get spaceKey() { return arena.spaceKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get projectiles() { return arena.projectiles; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
      };
      this.slimeKit = new SlimeKit(slimeApi);
    }

    // Fate resets
    this.playerFateBaseSpeedMult = 1;
    this.playerFateBaseCooldownMult = 1;
    this.playerFateBaseIncomingDmgMult = 1;

    this.soundKit.reset(isSoundMatch);
    this.grappleDodgeUntil = 0;

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
    this.allEnemiesMustDie = false;
    this.npcMainDefeated = false;
    this.raidEnemies = [];
    this.raidProjectiles = [];
    this.raidDefeated = [];
    this.shieldTotems = [];
    this.nextTotemSpawnTime = 0;
    this.baseNpcMaxHpForTotem = 0;

    // Magnet kit
    if (this.magnetKit) {
      this.magnetKit.reset();
    } else {
      const arena = this;
      const magnetApi: MagnetArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get rightPointerWasDown() { return arena.rightPointerWasDown; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        setIsDodging: (v) => { arena.isDodging = v; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
      };
      this.magnetKit = new MagnetKit(magnetApi);
    }

    // Metal resets
    this.metalArsenal = [];
    this.npcMetalArsenal = [];
    this.npcAggressiveBleeding = false; this.npcAggressiveBleedUntil = 0;
    if (this.npcAggressiveBleedAura) { this.npcAggressiveBleedAura.destroy(); this.npcAggressiveBleedAura = null; }
    this.npcAggressiveBleedTickAccum = 0; this.npcAggressiveBleedPuddleAccum = 0;
    this.playerAggressiveBleeding = false; this.playerAggressiveBleedUntil = 0;
    if (this.playerAggressiveBleedAura) { this.playerAggressiveBleedAura.destroy(); this.playerAggressiveBleedAura = null; }
    this.playerAggressiveBleedTickAccum = 0; this.playerAggressiveBleedPuddleAccum = 0;
    for (const p of this.metalBloodPuddles) p.sprite.destroy();
    this.metalBloodPuddles = [];
    this.metalChainTethered = false; this.metalChainTetherEnd = 0;
    if (this.metalChainGraphic) { this.metalChainGraphic.destroy(); this.metalChainGraphic = null; }
    this.npcMetalChainTethered = false; this.npcMetalChainTetherEnd = 0;
    if (this.npcMetalChainGraphic) { this.npcMetalChainGraphic.destroy(); this.npcMetalChainGraphic = null; }
    this.metalArmorActive = false; this.metalArmorHp = 0; this.metalArmorEnd = 0;
    if (this.metalArmorAura) { this.metalArmorAura.destroy(); this.metalArmorAura = null; }
    this.npcMetalArmorActive = false; this.npcMetalArmorHp = 0; this.npcMetalArmorEnd = 0;
    if (this.npcMetalArmorAura) { this.npcMetalArmorAura.destroy(); this.npcMetalArmorAura = null; }
    for (const btn of this.metalReinforcementButtons) (btn as unknown as { destroy(): void }).destroy();
    this.metalReinforcementButtons = []; this.metalReinforcementMenuOpen = false;
    for (const p of this.metalChainProjectiles) p.sprite.destroy();
    this.metalChainProjectiles = [];
    for (const p of this.metalGunProjectiles) p.sprite.destroy();
    this.metalGunProjectiles = [];
    this.npcMetalTaseredUntil = 0; this.playerMetalTaseredUntil = 0;
    this.metalArmorReflecting = false; this.npcMetalArmorReflecting = false;
    this.metalBloodChainPuddle = null; this.metalBloodChainAccum = 0;
    if (this.metalBloodChainGraphic) { this.metalBloodChainGraphic.destroy(); this.metalBloodChainGraphic = null; }
    if (this.metalArsenalHUD) { this.metalArsenalHUD.destroy(); this.metalArsenalHUD = null; }

    // Plasma resets
    for (const a of this.plasmaArenas) a.sprite.destroy();
    this.plasmaArenas = [];
    for (const o of this.plasmaCurrentOrbs) { o.spriteA.destroy(); o.spriteB.destroy(); o.chainGraphic.destroy(); }
    this.plasmaCurrentOrbs = [];
    for (const b of this.plasmaBlades) b.sprite.destroy();
    this.plasmaBlades = [];
    for (const e of this.plasmaChaosEffects) { if (e.aura) e.aura.destroy(); }
    this.plasmaChaosEffects = [];
    for (const o of this.plasmaChaosOrbs) o.sprite.destroy();
    this.plasmaChaosOrbs = [];
    this.plasmaIncarnateActive = false; this.plasmaIncarnateEnd = 0; this.plasmaIncarnateLastChain = 0; this.plasmaIncarnateLastTouch = 0;
    if (this.plasmaIncarnateAura) { this.plasmaIncarnateAura.destroy(); this.plasmaIncarnateAura = null; }
    this.plasmaRHolding = false; this.plasmaRHeldSince = 0;
    if (this.plasmaRPreviewA) { this.plasmaRPreviewA.destroy(); this.plasmaRPreviewA = null; }
    if (this.plasmaRPreviewB) { this.plasmaRPreviewB.destroy(); this.plasmaRPreviewB = null; }
    this.npcPlasmaIncarnateActive = false; this.npcPlasmaIncarnateEnd = 0; this.npcPlasmaIncarnateLastChain = 0; this.npcPlasmaIncarnateLastTouch = 0;
    if (this.npcPlasmaIncarnateAura) { this.npcPlasmaIncarnateAura.destroy(); this.npcPlasmaIncarnateAura = null; }
    for (const vp of this.plasmaVoltPoints) vp.sprite.destroy();
    this.plasmaVoltPoints = [];

    // ── Death kit ─────────────────────────────────────────
    this.deathSoulSplitUntil = 0; this.npcDeathSoulSplitUntil = 0;
    if (this.deathKit) {
      this.deathKit.reset();
    } else {
      const arena = this;
      const deathApi: DeathArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        applyPlayerSpeedMult: (f) => { arena.playerSpeedMult *= f; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        dealAoeDamageFromOwner: (x, y, r, d, o) => arena.dealAoeDamageFromOwner(x, y, r, d, o),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
      };
      this.deathKit = new DeathKit(deathApi);
    }

    // Void kit
    if (this.voidKit) {
      this.voidKit.reset();
    } else {
      const arena = this;
      const voidApi: VoidArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get pointerWasDown() { return arena.pointerWasDown; },
        getNpcHuntBloodMoonActive: () => arena.npcHuntBloodMoonActive,
        setNpcHuntBloodMoonActive: v => { arena.npcHuntBloodMoonActive = v; },
        getNpcPlasmaIncarnateActive: () => arena.npcPlasmaIncarnateActive,
        setNpcPlasmaIncarnateActive: v => { arena.npcPlasmaIncarnateActive = v; },
        getNpcDeathSoulSplitUntil: () => arena.npcDeathSoulSplitUntil,
        setNpcDeathSoulSplitUntil: v => { arena.npcDeathSoulSplitUntil = v; },
        getHuntBloodMoonActive: () => arena.huntBloodMoonActive,
        setHuntBloodMoonActive: v => { arena.huntBloodMoonActive = v; },
        getPlasmaIncarnateActive: () => arena.plasmaIncarnateActive,
        setPlasmaIncarnateActive: v => { arena.plasmaIncarnateActive = v; },
        getDeathSoulSplitUntil: () => arena.deathSoulSplitUntil,
        setDeathSoulSplitUntil: v => { arena.deathSoulSplitUntil = v; },
        getMagnetNpcSpeedBuffUntil: () => arena.magnetKit.getNpcSpeedBuffUntil(),
        setMagnetNpcSpeedBuffUntil: v => arena.magnetKit.setNpcSpeedBuffUntil(v),
        getMagnetPlayerSpeedBuffUntil: () => arena.magnetKit.getPlayerSpeedBuffUntil(),
        setMagnetPlayerSpeedBuffUntil: v => arena.magnetKit.setPlayerSpeedBuffUntil(v),
        getLightNpcPhotonSpeedBoostUntil: () => arena.lightKit.getNpcPhotonSpeedBoostUntil(),
        setLightNpcPhotonSpeedBoostUntil: v => arena.lightKit.setNpcPhotonSpeedBoostUntil(v),
        getLightNpcPhotoAccelUntil: () => arena.lightKit.getNpcPhotoAccelUntil(),
        setLightNpcPhotoAccelUntil: v => arena.lightKit.setNpcPhotoAccelUntil(v),
        getLightNpcPhotoSlowUntil: () => arena.lightKit.getNpcPhotoSlowUntil(),
        setLightNpcPhotoSlowUntil: v => arena.lightKit.setNpcPhotoSlowUntil(v),
        getLightPhotonSpeedBoostUntil: () => arena.lightKit.getPhotonSpeedBoostUntil(),
        setLightPhotonSpeedBoostUntil: v => arena.lightKit.setPhotonSpeedBoostUntil(v),
        getLightPhotoAccelUntil: () => arena.lightKit.getPhotoAccelUntil(),
        setLightPhotoAccelUntil: v => arena.lightKit.setPhotoAccelUntil(v),
        getNpcMetalChainTetherEnd: () => arena.npcMetalChainTetherEnd,
        setNpcMetalChainTetherEnd: v => { arena.npcMetalChainTetherEnd = v; },
        getNpcMetalArmorEnd: () => arena.npcMetalArmorEnd,
        setNpcMetalArmorEnd: v => { arena.npcMetalArmorEnd = v; },
        getNpcHuntSlowUntil: () => arena.npcHuntSlowUntil,
        setNpcHuntSlowUntil: v => { arena.npcHuntSlowUntil = v; },
        getNpcHuntConfusedUntil: () => arena.npcHuntConfusedUntil,
        setNpcHuntConfusedUntil: v => { arena.npcHuntConfusedUntil = v; },
        getNpcSlimeSlowUntil: () => arena.slimeKit.getNpcSlimeSlowUntil(),
        setNpcSlimeSlowUntil: v => { arena.slimeKit.setNpcSlimeSlowUntil(v); },
        getNpcAggressiveBleedUntil: () => arena.npcAggressiveBleedUntil,
        setNpcAggressiveBleedUntil: v => { arena.npcAggressiveBleedUntil = v; },
        getPlayerBleedingUntil: () => arena.playerBleedingUntil,
        setPlayerBleedingUntil: v => { arena.playerBleedingUntil = v; },
        getPlayerFrozenUntil: () => arena.playerFrozenUntil,
        setPlayerFrozenUntil: v => { arena.playerFrozenUntil = v; },
        getPlayerBurningUntil: () => arena.playerBurningUntil,
        setPlayerBurningUntil: v => { arena.playerBurningUntil = v; },
        getPlayerToxicUntil: () => arena.playerToxicUntil,
        setPlayerToxicUntil: v => { arena.playerToxicUntil = v; },
        getPlayerHuntSlowUntil: () => arena.playerHuntSlowUntil,
        setPlayerHuntSlowUntil: v => { arena.playerHuntSlowUntil = v; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
      };
      this.voidKit = new VoidKit(voidApi);
    }
    // Rubber kit construction / reset
    if (this.rubberKit) {
      this.rubberKit.reset();
    } else {
      const arena = this;
      const rubberApi: RubberArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene() { return arena as Phaser.Scene; },
        get projectiles() { return arena.projectiles; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        setIsDodging: (v) => { arena.isDodging = v; },
        applyPlayerSpeedMult: (f) => { arena.playerSpeedMult *= f; },
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        get abilityBars() { return arena.abilityBars; },
      };
      this.rubberKit = new RubberKit(rubberApi);
    }
    // Magic kit
    if (this.magicKit) {
      this.magicKit.reset();
    } else {
      const arena = this;
      const magicApi: MagicArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get qKey() { return arena.qKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get leftKey() { return arena.dummyLeftKey; },
        get rightKey() { return arena.dummyRightKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        set nukeChanneling(v: boolean) { arena.nukeChanneling = v; },
        get nukeChannelEnd() { return arena.nukeChannelEnd; },
        set nukeChannelEnd(v: number) { arena.nukeChannelEnd = v; },
        get npcNukeChanneling() { return arena.npcNukeChanneling; },
        set npcNukeChanneling(v: boolean) { arena.npcNukeChanneling = v; },
        get npcNukeChannelEnd() { return arena.npcNukeChannelEnd; },
        set npcNukeChannelEnd(v: number) { arena.npcNukeChannelEnd = v; },
        get playerSpeedMult() { return arena.playerSpeedMult; },
        set playerSpeedMult(v: number) { arena.playerSpeedMult = v; },
        get npcSpeedMult() { return arena.npcSpeedMult; },
        set npcSpeedMult(v: number) { arena.npcSpeedMult = v; },
        getSceneWidth: () => arena.scale.width,
        getSceneHeight: () => arena.scale.height,
        dealAoeDamageFromOwner: (x, y, r, d, o) => arena.dealAoeDamageFromOwner(x, y, r, d, o),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
      };
      this.magicKit = new MagicKit(magicApi);
    }
    // Technology kit
    if (this.techKit) {
      this.techKit.reset();
    } else {
      const arena = this;
      const techApi: TechArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get mutations() { return arena.mutations; },
        get upKey() { return arena.dummyUpKey; },
        get downKey() { return arena.dummyDownKey; },
        get leftKey() { return arena.dummyLeftKey; },
        get rightKey() { return arena.dummyRightKey; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        dealAoeDamageFromOwner: (x, y, r, d, o) => arena.dealAoeDamageFromOwner(x, y, r, d, o),
        resetPhysicsBounds: () => {
          const { width: W, height: H } = arena.scale;
          arena.physics.world.setBounds(32, 32, W - 64, H - 64);
        },
      };
      this.techKit = new TechnologyKit(techApi);
    }
    // Echo kit
    if (!this.echoKit) {
      const arena = this;
      const echoApi: EchoArenaApi = {
        get player() { return arena.player as Fighter; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get pointer() { return arena.input.activePointer; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get projectiles() { return arena.projectiles; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get isInvasion() { return arena.isInvasion; },
        get npcElementId() { return arena.npcElement?.id ?? ''; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        dealAoeDamageToNpc: (cx, cy, r, d) => arena.dealAoeDamageFromOwner(cx, cy, r, d, 'player'),
        dealAoeDamageToPlayer: (cx, cy, r, d) => arena.dealAoeDamageFromOwner(cx, cy, r, d, 'npc'),
        lockCaster: (owner, ms) => {
          if (owner === 'player') {
            arena.nukeChanneling = true;
            arena.nukeChannelEnd = arena.time.now + ms;
          } else {
            arena.npcNukeChanneling = true;
            arena.npcNukeChannelEnd = arena.time.now + ms;
          }
        },
        healCaster: (owner, amt) => {
          if (owner === 'player') arena.player.heal(amt);
          else arena.npc.heal(amt);
        },
        startCooldown: (owner, abilityId) => {
          if (owner === 'player') arena.player.startCooldown(abilityId);
          else arena.npc.startCooldown(abilityId);
        },
        getSceneWidth: () => arena.scale.width,
        getSceneHeight: () => arena.scale.height,
        fogOverlay: () => arena.fogOverlayRT,
        isEclipseRevealActive: () => arena.echoKit?.isEclipseRevealActive() ?? false,
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
      };
      this.echoKit = new EchoKit(echoApi);
    }
    this.echoKit.reset();
    // Create/recreate fog RT for echo element
    if (this.elementId === 'echo' || this.npcElement?.id === 'echo') {
      if (!this.fogOverlayRT || !this.fogOverlayRT.active) {
        const { width: W, height: H } = this.scale;
        this.fogOverlayRT = this.add.renderTexture(0, 0, W, H)
          .setDepth(16)
          .setScrollFactor(0)
          .setOrigin(0, 0);
      }
    } else if (this.fogOverlayRT) {
      this.fogOverlayRT.destroy();
      this.fogOverlayRT = null;
    }

    // Quantum element kit
    if (this.quantumElementKit) {
      this.quantumElementKit.reset();
    } else {
      const arena = this;
      const quantumApi: QuantumElementArenaApi = {
        get player() { return arena.player as Fighter; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get pointer() { return arena.input.activePointer; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get projectiles() { return arena.projectiles; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get spaceKey() { return arena.spaceKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get sceneWidth() { return arena.scale.width; },
        get sceneHeight() { return arena.scale.height; },
        get isPvP() { return arena.isPvP; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        dealAoeDamage: (owner, cx, cy, r, d) => arena.dealAoeDamageFromOwner(cx, cy, r, d, owner),
        startCooldown: (owner, abilityId) => {
          if (owner === 'player') arena.player.startCooldown(abilityId);
          else arena.npc.startCooldown(abilityId);
        },
        setSpeedMult: (owner, mult) => {
          if (owner === 'player') arena.playerSpeedMult = Math.max(0, mult);
          else arena.npcSpeedMult = Math.max(0, mult);
        },
        lockPlayer: (durationMs) => {
          arena.nukeChanneling = true;
          arena.nukeChannelEnd = arena.time.now + durationMs;
          (arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        },
      };
      this.quantumElementKit = new QuantumElementKit(quantumApi);
    }

    // Oil kit
    if (this.oilKit) {
      this.oilKit.reset();
    } else {
      const arena = this;
      const oilApi: OilArenaApi = {
        get player() { return arena.player as Fighter; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get pointer() { return arena.input.activePointer; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get wKey() { return arena.wKey; },
        get aKey() { return arena.aKey; },
        get sKey() { return arena.sKey; },
        get dKey() { return arena.dKey; },
        get projectiles() { return arena.projectiles; },
        get nukeChanneling() { return arena.nukeChanneling; },
        set nukeChanneling(v: boolean) { arena.nukeChanneling = v; },
        get nukeChannelEnd() { return arena.nukeChannelEnd; },
        set nukeChannelEnd(v: number) { arena.nukeChannelEnd = v; },
        get npcNukeChanneling() { return arena.npcNukeChanneling; },
        set npcNukeChanneling(v: boolean) { arena.npcNukeChanneling = v; },
        get npcNukeChannelEnd() { return arena.npcNukeChannelEnd; },
        set npcNukeChannelEnd(v: number) { arena.npcNukeChannelEnd = v; },
        get p2LastAimX() { return arena.p2LastAimX; },
        get p2LastAimY() { return arena.p2LastAimY; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        damagePlayerTargets: (cx, cy, r, d, color) => arena.damagePlayerTargets(cx, cy, r, d, color),
        damageNpcTarget: (cx, cy, r, d) => arena.dealAoeDamageFromOwner(cx, cy, r, d, 'npc'),
        pointToSegmentDist: (px, py, ax, ay, bx, by) => arena.pointToSegmentDist(px, py, ax, ay, bx, by),
        getSceneWidth: () => arena.scale.width,
        getSceneHeight: () => arena.scale.height,
      };
      this.oilKit = new OilKit(oilApi);
    }

    // Fate kit
    if (this.fateKit) {
      this.fateKit.reset();
    } else {
      const arena = this;
      const fApi: FateArenaApi = {
        get player() { return arena.player as Fighter; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get spaceKey() { return arena.spaceKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        dealAoeDamageToNpc: (cx, cy, r, d) => arena.dealAoeDamageFromOwner(cx, cy, r, d, 'player'),
        dealAoeDamageToPlayer: (cx, cy, r, d) => arena.dealAoeDamageFromOwner(cx, cy, r, d, 'npc'),
        setPlayerFateSpeedMult: (v) => { arena.playerFateBaseSpeedMult = v; },
        getPlayerFateSpeedMult: () => arena.playerFateBaseSpeedMult,
        getNpcBaseHp: () => arena.npcDifficulty.hp,
      };
      this.fateKit = new FateKit(fApi);
    }
    this.puddles = [];
    this.geysers = [];
    this.painRainShadows = [];
    this.festeringGrowths = [];
    this.invasionShardsEarned = 0;
    this.invasionWavesCompleted = 0;
    this.invasionBetweenWavesUntil = 0;

    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const W = this.isInvasion ? 1920 : screenW;
    const H = this.isInvasion ? 1280 : screenH;
    const cx = W / 2;
    const cy = H / 2;
    const pad = 32;

    // ── Background ────────────────────────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x0d0d1a);
    this.add.rectangle(cx, cy, W - pad * 2, H - pad * 2, this.isInvasion ? 0x120018 : 0x181828);

    const grid = this.add.graphics();
    grid.lineStyle(1, this.isInvasion ? 0x3d0060 : 0x202038, 1);
    for (let x = pad; x < W - pad; x += 80) grid.lineBetween(x, pad, x, H - pad);
    for (let y = pad; y < H - pad; y += 80) grid.lineBetween(pad, y, W - pad, y);

    if (this.isInvasion) {
      // Scattered faint corruption nodes as spatial landmarks
      const landmarks = this.add.graphics();
      const rng = Phaser.Math.RND;
      rng.sow(['invasion-landmarks']);
      for (let i = 0; i < 40; i++) {
        const lx = pad + rng.integerInRange(0, W - pad * 2);
        const ly = pad + rng.integerInRange(0, H - pad * 2);
        const r  = rng.integerInRange(6, 18);
        landmarks.lineStyle(1, 0x6600aa, 0.35);
        landmarks.strokeCircle(lx, ly, r);
        landmarks.lineStyle(1, 0x6600aa, 0.15);
        landmarks.strokeCircle(lx, ly, r + 6);
      }
    }

    const border = this.add.graphics();
    border.lineStyle(3, this.isInvasion ? 0x440066 : 0x3a3a5a, 1);
    border.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

    // ── Physics ───────────────────────────────────────────────────
    this.physics.world.setBounds(pad, pad, W - pad * 2, H - pad * 2);

    // ── Camera (invasion uses follow-cam on larger world) ─────────
    if (this.isInvasion) {
      this.cameras.main.setBounds(0, 0, W, H);
      this.cameras.main.roundPixels = true;
    }
    this.projectiles = this.physics.add.group();

    // ── Fighters — texture driven by element choice ────────────────
    const playerTexture = ELEMENT_TEXTURES[this.elementId] ?? 'elem-fire';
    const npcTexture    = ELEMENT_TEXTURES[enemyElementId]  ?? 'elem-water';
    this.player = new Player(this, this.isInvasion ? cx : 180, cy, this.playerElement, playerTexture);
    this.player.incomingDamageMultiplier = 1;
    if (this.isPvP) {
      this.npc = new Player(this, W - 180, cy, this.npcElement, npcTexture);
      this.p2ActiveUpgrades = PlayerData.getActiveUpgrades(this.npcElementId);
    } else if (this.isInvasion) {
      this.npc = new BasicCorrupted(this, W - 180, cy);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    } else {
      this.npc = new NpcOpponent(this, W - 180, cy, this.npcElement, npcTexture, difficultyConfig);
    }
    // In PvP/1v1 the single opponent is tracked in enemies; invasion starts empty and fills via spawnCorrupted
    this.enemies = this.isInvasion ? [] : [this.npc];

    // ── Apply mutations ──────────────────────────────────────────────
    this.mutations = new Set(this.isPvP ? [] : (data.mutations ?? []));

    const applyStatMutations = (target: NpcOpponent) => {
      if (this.mutations.has('healthy')) {
        const newMax = Math.round(target.maxHp * 1.5);
        target.maxHp = newMax;
        target.hp = newMax;
        // HealthBar internal maxHp is updated via setMaxHp on the next setMaxHp call;
        // since we're directly writing maxHp, the bar ratio still computes correctly.
      }
      if (this.mutations.has('swift')) { target.speed *= 2; }
      if (this.mutations.has('mini')) {
        target.setScale(0.5);
        (target.body as Phaser.Physics.Arcade.Body).setCircle(11, 13, 13);
        target.speed *= 2;
        target.maxHp = Math.round(target.maxHp * 0.75);
        target.hp = target.maxHp;
      }
      if (this.mutations.has('giant')) {
        target.setScale(1.5);
        (target.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
        target.speed = Math.round(target.speed * 0.7);
        target.maxHp += Math.round(target.maxHp * 0.5);
        target.hp = target.maxHp;
      }
      if (this.mutations.has('stealthy')) {
        target.setAlpha(0);
        target.forceInvisible = true;
        target.setHealthBarVisible(false);
      }
    };

    if (this.mutations.has('deadly')) { this.player.incomingDamageMultiplier = 1.5; }

    // ── Boss mutation ─────────────────────────────────────────────────
    if (!this.isInvasion) {
      if (this.mutations.has('boss')) {
        this.npc.setPosition(cx, pad);
        this.npc.setScale(4);
        (this.npc.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false);
        // Phaser scales the body circle with the sprite, so the constructor's setCircle(22,2,2)
        // becomes radius 88 in world space at scale 4 — no explicit resize needed.
        this.npc.maxHp = 500;
        this.npc.hp = 500;
        this.npc.cooldownMult = 0.5; // 2× faster ability cooldowns
        (this.npc as NpcOpponent).stationary = true;
      } else if (this.npcElement.id === 'dummy') {
        // Dummy mode: 5000 HP, stands still
        this.npc.maxHp = 5000;
        this.npc.hp = 5000;
        (this.npc as NpcOpponent).stationary = true;
      } else {
        applyStatMutations(this.npc as NpcOpponent);
      }
    }

    // ── Dummy mode back button ────────────────────────────────────────
    if (this.npcElement.id === 'dummy') {
      this.dummyBackBtn = this.add.text(14, 14, '◀ BACK', {
        fontSize: '15px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#aaaaaa',
        backgroundColor: '#222222',
        padding: { x: 8, y: 4 },
      }).setDepth(30).setInteractive({ useHandCursor: true });
      this.dummyBackBtn
        .on('pointerover', () => this.dummyBackBtn!.setColor('#ffffff'))
        .on('pointerout',  () => this.dummyBackBtn!.setColor('#aaaaaa'))
        .on('pointerdown', () => this.scene.start('MenuScene'));
    } else {
      this.dummyBackBtn = null;
    }

    // ── Clone mutation ────────────────────────────────────────────────
    if (this.mutations.has('clone')) {
      this.cloneProjectiles = this.physics.add.group();
      this.clone = new NpcOpponent(this, cx, cy / 2, this.npcElement, npcTexture, difficultyConfig);
      applyStatMutations(this.clone);
      this.allEnemiesMustDie = true;
      this.add.text(cx, cy / 2 - 38, `CLONE ${this.npcElement.emoji}`, {
        fontSize: '12px', color: '#888888',
      }).setOrigin(0.5).setDepth(20);
    }

    // ── Raid mutation ─────────────────────────────────────────────────
    if (this.mutations.has('raid')) {
      const baseMaxHp = this.npc.maxHp;
      // Rescale main NPC to raid size
      this.npc.maxHp = Math.round(baseMaxHp * 0.2);
      this.npc.hp = this.npc.maxHp;
      this.npc.setScale(0.5);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(11, 13, 13);
      // Spawn 3 more raid enemies
      const raidPositions = [
        { x: W - 180, y: cy - 120 },
        { x: W - 180, y: cy + 120 },
        { x: W - 280, y: cy },
      ];
      for (let ri = 0; ri < 3; ri++) {
        const rp = raidPositions[ri];
        const raidNpc = new NpcOpponent(this, rp.x, rp.y, this.npcElement, npcTexture, difficultyConfig);
        raidNpc.maxHp = Math.round(baseMaxHp * 0.2);
        raidNpc.hp = raidNpc.maxHp;
        raidNpc.setScale(0.5);
        (raidNpc.body as Phaser.Physics.Arcade.Body).setCircle(11, 13, 13);
        if (this.mutations.has('stealthy')) { raidNpc.setAlpha(0); raidNpc.forceInvisible = true; raidNpc.setHealthBarVisible(false); }
        const raidProjGroup = this.physics.add.group();
        this.raidEnemies.push(raidNpc);
        this.raidProjectiles.push(raidProjGroup);
        this.raidDefeated.push(false);
        this.add.text(rp.x, rp.y - 38, `${this.npcElement.emoji}`, {
          fontSize: '10px', color: '#888888',
        }).setOrigin(0.5).setDepth(20);
      }
      this.allEnemiesMustDie = true;
      // Set up raid projectile collision with player
      for (let ri = 0; ri < this.raidEnemies.length; ri++) {
        const raidProjGroup = this.raidProjectiles[ri];
        this.physics.add.overlap(
          raidProjGroup,
          this.player,
          (a, b) => {
            const proj = (a instanceof Projectile ? a : b) as Projectile;
            if (!proj.active) return;
            this.player.takeDamage(proj.damage);
            this.spawnHitFlash(proj.x, proj.y, 0x00aaff);
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
          },
          undefined, this,
        );
        const raidNpc = this.raidEnemies[ri];
        this.physics.add.overlap(
          this.projectiles,
          raidNpc,
          (a, b) => {
            const proj = (a instanceof Projectile ? a : b) as Projectile;
            if (!proj.active || !proj.isFromPlayer) return;
            raidNpc.takeDamage(proj.damage);
            this.spawnHitFlash(raidNpc.x, raidNpc.y, 0xff6600);
            this.spawnDamageNumber(raidNpc.x, raidNpc.y - 30, proj.damage);
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
          },
          undefined, this,
        );
      }
    }

    // ── Unified enemy physics group ────────────────────────────────
    this.enemyGroup = this.physics.add.group();
    if (!this.isInvasion) {
      this.enemyGroup.add(this.npc, true);
    }

    // ── Shielded mutation ─────────────────────────────────────────────
    if (this.mutations.has('shielded')) {
      this.baseNpcMaxHpForTotem = this.npc.maxHp;
      this.nextTotemSpawnTime = this.time.now + 10000;
    }

    // ── Display mutation label at top of battlefield ──────────────────
    if (this.mutations.size > 0 && !this.isPvP) {
      const mutDef = MUTATIONS.find((m) => this.mutations.has(m.id));
      if (mutDef) {
        this.add.text(cx, pad + 14, `${mutDef.emoji} ${mutDef.name.toUpperCase()}`, {
          fontSize: '15px',
          fontFamily: '"Arial Black", sans-serif',
          color: '#ffcc00',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(20);
      }
    }

    // ── Gauntlet boosts ───────────────────────────────────────────────
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
        for (const re of this.raidEnemies) re.gauntletDamageTakenMult = Math.pow(1.2, strengthBoosts);
      }
    }

    // ── Unified player-projectile vs enemy overlap ─────────────────
    this.physics.add.overlap(
      this.projectiles,
      this.enemyGroup,
      (a, b) => {
        const proj = (a instanceof Projectile ? a : b) as Projectile;
        const target = (a instanceof Projectile ? b : a) as Fighter;
        if (!proj.active || !proj.isFromPlayer) return;
        if (!target.active || target.hp <= 0) return;
        if (target instanceof CorruptedBase) {
          this.applyProjectileToCorrupted(proj, target);
        } else {
          this.applyProjectileToNpc(proj);
        }
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
        // Silence possess eye / hook (NPC cast): delegate to kit
        if (proj.texture.key === 'proj-silence-eye' || proj.texture.key === 'proj-silence-hook') {
          if (proj.texture.key === 'proj-silence-eye') this.silenceKit.onSilenceEyeHitEnemy(proj, 'npc');
          else this.silenceKit.onSilenceHookHitEnemy(proj, 'npc');
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
        // Air F upgrade: 3s 50% dodge window after grapple lands
        if (this.elementId === 'air' && this.hasUpgrade('f') && this.time.now < this.grappleDodgeUntil && Math.random() < 0.5) {
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
        // Fighter.dodgeChance roll (stacks from Light upgrades and other sources)
        if (this.player.rollDodge()) {
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Fate dice (NPC): all damage handled in onDiceHitEnemy — skip generic damage path
        if (proj.texture.key === 'proj-fate-dice' && (proj as any).fateDiceOwner === 'npc') {
          this.fateKit.onDiceHitEnemy(proj, proj.x, proj.y, 'npc');
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Apply attacker's crit context before damage
        this.player.setIncomingCritContext(this.npc.critChance, this.npc.critMult);
        let _playerDmg = Math.round(proj.damage * this.npc.outgoingDamageMult);
        // Glass Mode: 100x damage = instant death (unless Remain is absorbing)
        if (this.elementId === 'sand' && this.timeGlassMode && !this.timeRemainActive) {
          _playerDmg = _playerDmg * 100;
        }
        this.player.takeDamage(_playerDmg);
        this.spawnHitFlash(proj.x, proj.y, 0x00aaff);
        // NPC Hunt Blood Pact: heal NPC for 50% of damage dealt
        if (this.npcHuntBloodPactActive && this.time.now < this.npcHuntBloodPactEnd) this.npc.heal(Math.ceil(_playerDmg * 0.5));
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
        // Growth bloat: now handled in player 'damaged' listener (fires for melee + projectile hits)
        // Magic (NPC) thorn vine hit
        if ((proj as any).isMagicThornVine && (proj as any).thornVineOwner === 'npc') {
          this.magicKit.onThornVineHit(this.player, 'npc');
        }
        // Magic (NPC) thorn prison hit
        if ((proj as any).isMagicThornPrison && (proj as any).thornPrisonOwner === 'npc') {
          this.magicKit.onThornPrisonHit(this.player.x, this.player.y, 'npc');
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
          if (!proj.active || !proj.isFromPlayer || !this.clone || this.cloneDefeated) return;
          const cloneRef = this.clone;
          cloneRef.takeDamage(proj.damage);
          this.spawnHitFlash(proj.x, proj.y, 0xff6600);
          this.spawnDamageNumber(cloneRef.x, cloneRef.y - 30, proj.damage);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
        },
        undefined, this,
      );
    }


    // ── Defeat + damage events ────────────────────────────────────
    this.player.once('defeated', () => {
      this.endGame(false);
    });

    // Electricity: gain kinetic power on any damage; overcharge/auto-restart prevents death
    this.player.on('damaged', (amount: number) => {
      if (this.elementId !== 'electricity' || amount <= 0) return;
      this.electricityKit.onDamageReceived(amount, this.time.now);
    });

    const checkAllEnemiesDefeated = () => {
      if (!this.allEnemiesMustDie) return;
      const cloneDead = !this.clone || this.cloneDefeated;
      const raidAllDead = this.raidDefeated.every((d) => d);
      if (this.npcMainDefeated && cloneDead && raidAllDead) this.endGame(true);
    };

    // Invasion enemies manage their own defeat handlers in spawnCorrupted(); skip here
    if (!this.isInvasion) {
      const registerNpcDefeat = () => {
        this.npc.once('defeated', () => {
          if (!this.isPvP && this.mutations.has('reborn') && !this.npcRebirthUsed) {
            this.npcRebirthUsed = true;
            this.npc.isInvincible = true;
            const flash = this.add.circle(this.npc.x, this.npc.y, 50, 0x00ffff, 0.8).setDepth(15);
            this.tweens.add({ targets: flash, scaleX: 5, scaleY: 5, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
            this.time.delayedCall(400, () => {
              if (!this.npc.active) return;
              this.npc.hp = Math.round(this.npc.maxHp * 0.25);
              this.npc.speed *= 1.25;
              this.player.incomingDamageMultiplier *= 1.25;
              this.npc.isInvincible = false;
              if (this.npcRebirthGlow) this.npcRebirthGlow.destroy();
              this.npcRebirthGlow = this.add.circle(this.npc.x, this.npc.y, 36, 0x00ffff, 0.15).setDepth(4);
              this.npcRebirthGlow.setStrokeStyle(3, 0x00ffff, 0.9);
              this.tweens.add({ targets: this.npcRebirthGlow, alpha: 0.45, yoyo: true, repeat: -1, duration: 400 });
              this.showFloatingText(this.npc.x, this.npc.y - 30, 'REBORN!', '#00ffff');
              registerNpcDefeat();
            });
          } else if (this.allEnemiesMustDie) {
            this.npcMainDefeated = true;
            if (this.npc.active) { this.npc.setActive(false).setVisible(false); }
            checkAllEnemiesDefeated();
          } else {
            this.endGame(true);
          }
        });
      };
      registerNpcDefeat();
    }

    if (this.clone) {
      this.clone.once('defeated', () => {
        this.cloneDefeated = true;
        const lbl = this.add.text(cx, cy - 40, 'CLONE DEFEATED', {
          fontSize: '26px', fontFamily: '"Arial Black", sans-serif',
          color: '#ffaa00', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: lbl, alpha: 0, y: cy - 80, delay: 500, duration: 1000, onComplete: () => lbl.destroy() });
        if (this.clone) {
          (this.clone.body as Phaser.Physics.Arcade.Body).enable = false;
          this.clone.setActive(false).setVisible(false);
        }
        this.clone = null;
        checkAllEnemiesDefeated();
      });
    }

    // Raid enemy defeat handlers (registered after raidEnemies is populated in mutation setup)
    for (let ri = 0; ri < this.raidEnemies.length; ri++) {
      const raidIdx = ri;
      this.raidEnemies[raidIdx].once('defeated', () => {
        this.raidDefeated[raidIdx] = true;
        this.showFloatingText(cx, cy - 40, `ENEMY ${raidIdx + 2} DEFEATED`, '#ffaa00');
        if (this.raidEnemies[raidIdx].active) this.raidEnemies[raidIdx].setActive(false).setVisible(false);
        checkAllEnemiesDefeated();
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
    // Growth bloat: trigger AOE on any hit (projectile or melee contact)
    this.player.on('damaged', (amount: number) => {
      if (amount <= 0 || !this.growthBloatActive) return;
      const fLocked = this.hasUpgrade('f') && this.fKey.isDown;
      if (fLocked) return;
      this.growthBloatActive = false;
      this.growthBloatEnd = 0;
      if (this.growthBloatAura) { this.growthBloatAura.destroy(); this.growthBloatAura = null; }
      const bloatDmg = Math.round(20 * this.growthDamageMult);
      const aoeR = this.growthBloatAoeRadius;
      this.damagePlayerTargets(this.player.x, this.player.y, aoeR, bloatDmg, 0xdddd00);
      const ft = this.add.text(this.player.x, this.player.y - 30, `💥 ${bloatDmg}`, { fontSize: '11px', color: '#ffff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: ft, y: ft.y - 25, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
      const bloatExp = this.add.circle(this.player.x, this.player.y, aoeR, 0xdddd00, 0.3).setDepth(8);
      this.tweens.add({ targets: bloatExp, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 350, onComplete: () => bloatExp.destroy() });
      if (this.growthFungalStacks > 0) {
        const healAmt = this.growthFungalStacks * 10;
        this.player.heal(healAmt);
        const hft = this.add.text(this.player.x, this.player.y - 40, `🍄 +${healAmt}`, { fontSize: '11px', color: '#88ff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        this.tweens.add({ targets: hft, y: hft.y - 25, alpha: 0, duration: 900, onComplete: () => hft.destroy() });
      }
    });
    this.npc.on('damaged', (n: number) => {
      this.spawnDamageNumber(this.npc.x, this.npc.y - 34, n);
    });

    // ── Crit event listeners ───────────────────────────────────────
    this.npc.on('damaged-crit', (n: number) => {
      this.showFloatingText(this.npc.x, this.npc.y - 42, `CRIT! ${n}`, '#ffcc00');
    });
    this.player.on('damaged-crit', (n: number) => {
      this.showFloatingText(this.player.x, this.player.y - 42, `CRIT! ${n}`, '#ff6666');
    });

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

    // Dummy mode: arrow keys move the dummy; P fires its fireball
    this.dummyUpKey    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.dummyDownKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.dummyLeftKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.dummyRightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.dummyFireKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    if (this.isPvP) {
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

    // Pause menu: Esc opens PauseMenuScene overlay
    kb.on('keydown-ESC', () => this.openPauseMenu());
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      // Shift Date.now()-based cooldowns forward by pause duration so HUD bars stay accurate
      const shift = Date.now() - this.pausedAt;
      this.player.shiftCooldowns(shift);
      this.npc.shiftCooldowns(shift);
    });

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
    // In invasion mode the world is larger than the screen; use screen dimensions for HUD positioning
    const hudListStart = this.children.length;
    this.createHUD(screenW, screenH);
    if (this.isPvP) this.createP2HUD(screenW, screenH);
    if (this.isInvasion) {
      const all = this.children.getAll();
      for (let i = hudListStart; i < all.length; i++) {
        const obj = all[i] as { setScrollFactor?: (n: number) => void };
        if (obj.setScrollFactor) obj.setScrollFactor(0);
      }
    }

    // ── Invasion mode setup ────────────────────────────────────────
    if (this.isInvasion) {
      this.waveManager = new WaveManager();
      this.invasionBetweenWavesUntil = this.time.now + 2000;
      // Disable the BasicCorrupted placeholder — wave 1 will spawn proper enemies
      this.npc.setHealthBarVisible(false);
      if (this.npc.active) { this.npc.setActive(false).setVisible(false); }
      // Show wave banner placeholder
      this.invasionWaveBanner = this.add.text(screenW / 2, 60, '', {
        fontSize: '28px', fontFamily: '"Arial Black", sans-serif',
        color: '#cc44ff', stroke: '#330055', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(25).setScrollFactor(0);
      this.invasionCorruptShardLabel = this.add.text(screenW - 16, 16, '🩸 0', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#cc44ff',
      }).setOrigin(1, 0).setDepth(25).setScrollFactor(0);
    }

    // ── Arena labels ───────────────────────────────────────────────
    if (this.isPvP) {
      this.add.text(180, 20, `${this.playerElement.emoji} P1`, {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(20);
      this.add.text(screenW - 180, 20, `P2 ${this.npcElement.emoji}`, {
        fontSize: '14px', color: '#aaddff',
      }).setOrigin(0.5).setDepth(20);
    } else if (!this.isInvasion) {
      this.add.text(180, 20, `${this.playerElement.emoji} YOU`, {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(20);
      this.add.text(screenW - 180, 20, `ENEMY ${this.npcElement.emoji}`, {
        fontSize: '14px', color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(20);
    }

    if (this.elementId === 'soul') {
      this.soulGhostText = this.add.text(cx, 52, '👻 0', {
        fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#ccaaff',
        stroke: '#220044', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }
    // ElectricityKit creates its own HUD in reset() when isPlayerElement=true
    if (this.elementId === 'slime') {
      this.slimeKit.startMatch(W, H, true);
    }
    // Magnet: spawn 4 rods at corners; NPC magnet also gets rods
    if (this.elementId === 'magnet' || this.npcElement.id === 'magnet') {
      const owner = this.elementId === 'magnet' ? 'player' : 'npc';
      const cornerPad = 80;
      const corners = [
        { x: cornerPad, y: cornerPad },
        { x: W - cornerPad, y: cornerPad },
        { x: cornerPad, y: H - cornerPad },
        { x: W - cornerPad, y: H - cornerPad },
      ];
      for (const c of corners) {
        const spr = this.add.circle(c.x, c.y, 12, 0x99aacc, 0.9)
          .setStrokeStyle(2, 0xddeeff).setDepth(4);
        this.magnetKit.pushRod({
          sprite: spr, trail: [],
          x: c.x, y: c.y, vx: 0, vy: 0,
          contactCooldownPlayer: 0, contactCooldownNpc: 0,
          bouncing: false, bounceUntil: 0, owner, permDamageBonus: 0,
        });
      }
    }
    // Time element: charge bar rendered per-frame above player; no separate HUD text needed
    // Metal: arsenal HUD bar
    if (this.elementId === 'metal') {
      this.metalArsenalHUD = this.add.text(W / 2, H - 68, '[ No Weapons ]', {
        fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#aabbcc',
        stroke: '#223344', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }
    if (this.elementId === 'death') {
      this.deathKit.initKillsHud(cx);
    }
    if (this.elementId === 'void') {
      this.voidKit.initHud(cx);
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────

  private createHUD(W: number, H: number): void {
    const hudY = H - 30;
    const cardW = 130;
    const cardH = 48;
    // Hunt, Silence, and Death have extra abilities beyond the first 5; only show 5 at a time
    const abilities = (this.elementId === 'hunt' || this.elementId === 'silence' || this.elementId === 'death')
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
      'barrel-roll':    0xcc7700,
      'drone-destroy':  0xff6600,
      'shield-gen':     0xff8800,
      'train-morph':    0xff4400,
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
      'hunt-hybrid-shotgun':      0xdddddd,
      'hunt-hybrid-grenade-leap': 0xff8844,
      'hunt-hybrid-instinct':     0xcc4433,
      'hunt-hybrid-shriek':       0xffcc66,
      'hunt-hybrid-untransform':  0x663322,
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
      'electro-ball':       0xffee00,
      'electro-dash':       0xffcc00,
      'kinetic-discharge':  0xffaa00,
      'pain-battery':       0xdd8800,
      'restart':            0xffffff,
      'slime-shot':         0x66cc44,
      'slimey-splash':      0x88dd66,
      'sulpher-spring':     0xeedd44,
      'slime-shield':       0x44aa33,
      'slime-rain':         0x55bb55,
      'fate-coin-toss':    0xddaa00,
      'fate-slots':        0x44aa44,
      'fate-luck':         0x88eecc,
      'fate-dice':         0xffffff,
      'fate-all-in':       0xff4400,
      'rhythm-shot':        0xff66cc,
      'flow-mode':          0x9944cc,
      'screech-barrier':    0xff3388,
      'sound-grapple':      0xdd44aa,
      'accelerando':        0xff44aa,
      // Magnet
      'mag-pulse':          0xcc2244,
      'nail-implant':       0x888899,
      'magnetize':          0xff4488,
      'protect':            0x4488cc,
      'atom-smasher':       0xff2266,
      // Metal
      'metal-slash':        0x8899aa,
      'metal-fire-at-will': 0xffcc66,
      'metal-reinforce':    0x446688,
      'metal-chain-tether': 0x667788,
      'metal-blood-clot':   0x882233,
      // Plasma
      'plasma-burst':           0xcc44ff,
      'plasma-arena':           0xaa22cc,
      'plasma-current':         0xbb33ff,
      'plasma-chaos-blades':    0xdd44ff,
      'plasma-chaos-incarnate': 0xff88ff,
      // Death
      'death-1000-blades':  0x8b4513,
      'death-summon-wisps': 0x880066,
      'death-looming-dread':0xcc44ff,
      'death-wisp-daemon':  0xff3366,
      'death-judgement':    0x330033,
      'death-trail-dash':   0xaa4400,
      // Void
      'void-floater':   0x330044,
      'void-return':    0x550066,
      'void-relapse':   0x440055,
      'void-ash':       0x220033,
      'void-of-hell':   0x660088,
      // Adrenaline
      'rubber-punch':       0xff5577,
      'rubber-sling':       0xff77aa,
      'rubber-bounce-form': 0xffaacc,
      'rubber-spring-slam': 0xff3366,
      'rubber-bounce-back': 0xff2244,
      // Magic
      'magic-sparkle-shot':  0xff99ff,
      'magic-grimoire':      0x7a2edd,
      'magic-anchor':        0xbb88ff,
      'magic-meditate':      0xaa66ee,
      'magic-necronomicon':  0x551188,
      // Technology
      'tech-gear-give':      0x44ccaa,
      'tech-devconsole':     0x33aa88,
      'tech-random-r':       0x66eecc,
      'tech-delete':         0xffffff,
      'tech-domain':         0x44ccaa,
      // Echo (abstract combined: fate + light)
      'echo-shot':     0xccccff,
      'echo-guess':    0xaaaadd,
      'echo-lantern':  0xffffaa,
      'echo-bat':      0x8888cc,
      'echo-eclipse':  0xffffff,
      // Quantum (abstract combined: slime + fate)
      'quantum-wave':      0xaa44ff,
      'chaos-control':     0x8833cc,
      'atom-vibration':    0x66ccff,
      'quantum-mechanic':  0xdd88ff,
      'atom-nhilego':      0x5511bb,
      // Silence (normal + slasher)
      'silence-fade':        0x330044,
      'silence-dont-look':   0x110022,
      'silence-possess':     0x660088,
      'silence-thriller':    0x440055,
      'silence-watch':       0x220033,
      'silence-machete':     0x884422,
      'silence-meat-hook':   0x997733,
      'silence-mortal-wound': 0x553311,
      'silence-retire':      0x331100,
      'silence-slash-em-up': 0x221122,
    };

    const silenceNormalCards: Phaser.GameObjects.GameObject[] = [];
    const silenceNormalFills: SilenceBarEntry[] = [];

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

      this.abilityBars.push({ fill, abilityId: ab.id, maxWidth: cardW - 4, lbl, baseFillColor: fillColors[ab.id] ?? 0x4466aa });

      if (this.elementId === 'hunt') {
        this.huntNormalHudCards.push(bg, fill, lbl, desc);
      }
      if (this.elementId === 'silence') {
        silenceNormalCards.push(bg, fill, lbl, desc);
        silenceNormalFills.push({ fill, abilityId: ab.id, maxWidth: cardW - 4, lbl, baseFillColor: fillColors[ab.id] ?? 0x4466aa });
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
      // Hunt hybrid-form HUD (hidden until Q+ double-tap transform)
      const hybridAbilities = this.playerElement.abilities.slice(10, 15);
      hybridAbilities.forEach((ab, i) => {
        const x = startX + i * cardW;
        const bg = this.add.rectangle(x, hudY, cardW - 4, cardH - 4, 0x221100)
          .setStrokeStyle(1, 0x884422).setDepth(21).setVisible(false);
        const fill = this.add.rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, fillColors[ab.id] ?? 0xcc5522, 0.5)
          .setOrigin(0, 0.5).setDepth(22).setVisible(false);
        const lbl = this.add.text(x, hudY - 6, `[${ab.displayKey}] ${ab.name}`, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffddaa',
        }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
        const desc = this.add.text(x, hudY + 8, ab.description, {
          fontSize: '9px', color: '#000000', wordWrap: { width: cardW - 12 }, maxLines: 2, align: 'center',
        }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
        this.huntHybridFills.push({ fill, abilityId: ab.id, maxWidth: cardW - 4 });
        this.huntHybridHudCards.push(bg, fill, lbl, desc);
      });
    }

    // Silence slasher HUD (hidden until entering slasher mode)
    if (this.elementId === 'silence') {
      this.silenceKit.setNormalCards(silenceNormalCards, silenceNormalFills);
      const slasherAbilities = this.playerElement.abilities.slice(5, 10);
      this.silenceKit.createSlasherHud(startX, hudY, cardW, slasherAbilities, fillColors);
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
    const abilities = (this.npcElement.id === 'hunt' || this.npcElement.id === 'silence')
      ? this.npcElement.abilities.slice(0, 5)
      : this.npcElement.abilities;

    this.add.rectangle(W / 2, hudY, W, cardH + 4, 0x0a0a18, 0.95).setDepth(20);

    const totalWidth = 5 * cardW;
    const startX = W / 2 - totalWidth / 2 + cardW / 2;

    const p2KeyLabels = ['U', 'O', 'P', ';', '\''];

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

    const dodgeLabel = '[/]';
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
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
            t.takeDamage(damage);
            this.spawnHitFlash(t.x, t.y, 0xff6600);
            if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(damage * 0.5));
          }
        }
        for (const g of this.festeringGrowths) {
          if (!g.active) continue;
          if (Phaser.Math.Distance.Between(cx, cy, g.x, g.y) <= radius) {
            g.takeDamage(damage);
            this.spawnHitFlash(g.x, g.y, 0xff6600);
          }
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
        this.createPainRain('player', 200);
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
          this.damagePlayerTargets(p.x, p.y, p.radius, 20, 0xcc2222);
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
        if (this.hasPerk('player', 'hawk')) {
          this.doHawkDive(x, y);
          return;
        }
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
            body.setVelocity(0, 0);
            this.grappleDodgeCharges = 2;
            if (this.grappleDodgeAura) this.grappleDodgeAura.destroy();
            this.grappleDodgeAura = this.add.circle(this.player.x, this.player.y, 26, 0x6699cc, 0.35).setDepth(6);
            this.tweens.add({ targets: this.grappleDodgeAura, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });
            // F upgrade: extra 3s of 50% dodge + transparency after landing
            if (this.hasUpgrade('f')) {
              this.grappleDodgeUntil = this.time.now + 3000;
              this.player.setAlpha(0.5);
              this.time.delayedCall(3000, () => {
                if (this.player.active) this.player.setAlpha(1);
              });
            } else {
              this.player.setAlpha(1);
            }
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
      slamCaster: () => { /* earth kit reworked — no longer used via context */ },
      dealMeleeDamage: (range, damage, knockback = 0) => {
        const pointer = this.input.activePointer;
        const dirX = pointer.worldX - this.player.x;
        const dirY = pointer.worldY - this.player.y;
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
          if (dist > range) continue;
          const toX = t.x - this.player.x;
          const toY = t.y - this.player.y;
          const dot = (dirX / dirLen) * (toX / dist) + (dirY / dirLen) * (toY / dist);
          if (dot > 0.4) {
            t.takeDamage(damage);
            this.spawnHitFlash(t.x, t.y, 0xaa8844);
            if (knockback > 0) {
              const nb = t.body as Phaser.Physics.Arcade.Body;
              nb.setVelocity((toX / dist) * knockback, (toY / dist) * knockback);
            }
          }
        }
        for (const g of this.festeringGrowths) {
          if (!g.active) continue;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y) <= range) {
            g.takeDamage(damage);
            this.spawnHitFlash(g.x, g.y, 0xaa8844);
          }
        }
      },
      startBullRush: () => { /* earth kit reworked — no longer used via context */ },
      spawnDrone: () => { /* oil kit handles via handleInput */ },
      commandDrones: (_x, _y) => { /* oil kit handles via handleInput */ },
      launchDrone: (_x, _y) => { /* oil kit handles via handleInput */ },
      placeFirewall: (_x, _y) => { /* oil kit handles via handleInput */ },
      startOverdrive: (_x, _y) => { /* oil kit handles via handleInput */ },
      launchDarkBomb: (x, y) => {
        const bomb = this.add.circle(this.player.x, this.player.y, 10, 0x660088, 0.95)
          .setStrokeStyle(2, 0xcc44ff).setDepth(8);
        this.tweens.add({
          targets: bomb, x, y, duration: 380, ease: 'Power2',
          onComplete: () => {
            const boom = this.add.circle(x, y, 8, 0x8800cc, 0.8).setDepth(8);
            this.tweens.add({ targets: boom, scaleX: 7, scaleY: 7, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
            bomb.destroy();
            for (const t of this.enemies) {
              if (!t.active || t.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(x, y, t.x, t.y) <= 50) {
                t.takeDamage(10);
                this.spawnHitFlash(t.x, t.y, 0x8800cc);
              }
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
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) <= 110) {
            t.takeDamage(10);
            this.spawnHitFlash(t.x, t.y, 0x8800cc);
          }
        }
      },
      placeSnapTrap: () => {
        const isPlume = this.hasPerk('player', 'plume');
        const baseR = this.hasUpgrade('r') ? 27 : 18;
        const trapRadius = isPlume ? (this.hasUpgrade('r') ? 36 : 25) : baseR;
        const trapColor = isPlume ? 0x6633aa : 0x440066;
        const strokeColor = isPlume ? 0xcc88ff : 0xcc44ff;
        const trapLabel = isPlume ? '☁️' : '⚡';
        const spr = this.add.circle(this.player.x, this.player.y, trapRadius, trapColor, 0.85)
          .setStrokeStyle(2, strokeColor).setDepth(3);
        const lbl = this.add.text(this.player.x, this.player.y, trapLabel, { fontSize: '10px' }).setOrigin(0.5).setDepth(4);
        this.shadowSnapTraps.push({
          sprite: spr, label: lbl,
          expiresAt: this.time.now + 12000,
          x: this.player.x, y: this.player.y,
          triggered: false, radius: trapRadius, owner: 'player',
          isPlume,
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
        const hasTarget = this.enemies.some(t =>
          t.active && t.hp > 0 && (isBlackIce ? t.voidFrostStacks : t.frostStacks) > 0,
        );
        if (!hasTarget) return;
        const dx = tx - this.player.x;
        const dy = ty - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy / len, dx / len);
        const endX = this.player.x + Math.cos(angle) * 1200;
        const endY = this.player.y + Math.sin(angle) * 1200;
        this.spawnFrostBeamVisual(this.player.x, this.player.y, endX, endY);
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const targetStacks = isBlackIce ? t.voidFrostStacks : t.frostStacks;
          if (targetStacks === 0) continue;
          const d = this.pointToSegmentDist(t.x, t.y, this.player.x, this.player.y, endX, endY);
          if (d <= 32) {
            t.takeDamage(Math.round(targetStacks * 7.5));
            this.spawnHitFlash(t.x, t.y, isBlackIce ? 0x9900ff : 0x88ccff);
            if (isBlackIce) {
              const voidedDps = targetStacks >= 5 ? 3 : targetStacks >= 3 ? 2 : 1;
              t.voidedUntil = this.time.now + 5000;
              t.voidedDps = voidedDps;
              t.voidedTickAccum = 0;
              t.voidFrostStacks = 0;
              t.incomingDamageMultiplier = 1;
              const vt = this.add.text(t.x, t.y - 30, 'VOIDED', { fontSize: '11px', color: '#cc88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
              this.tweens.add({ targets: vt, y: vt.y - 20, alpha: 0, duration: 1200, onComplete: () => vt.destroy() });
            } else {
              // E+: keep residual frost stacks
              if (this.hasUpgrade('e')) {
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
        // Rink perk: record recent skate timestamp for bonus speed
        if (this.hasPerk('player', 'rink')) this.playerSkateRecentUntil = this.time.now + 2000;
      },
      fireFrozenSolid: (tx, ty) => {
        const angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        this.spawnFrozenSolidVisual(this.player.x, this.player.y, angle);
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const tAngle = Math.atan2(t.y - this.player.y, t.x - this.player.x);
          const diff = Math.abs(Phaser.Math.Angle.Wrap(tAngle - angle));
          if (diff <= Math.PI / 8) {
            if (t.frozenUntil > this.time.now) {
              t.frozenUntil = 0;
              for (let fi = 0; fi < 3; fi++) this.addFrostStackTo(t);
            } else {
              t.frozenUntil = this.time.now + 3000;
              this.spawnHitFlash(t.x, t.y, 0x88ccff);
              if (this.hasUpgrade('q')) t.frozenSolidAmpReady = true;
            }
          }
        }
        // Rink perk: tile the cone with icy trails lasting 8s
        if (this.hasPerk('player', 'rink')) this.spawnRinkConeTiles(this.player.x, this.player.y, angle, 'player');
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
          const ptr = this.input.activePointer;
          const dx = ptr.worldX - this.player.x; const dy = ptr.worldY - this.player.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const clawDmg = Math.round((15 + this.growthSpreadStacks * 5) * this.growthDamageMult);
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
            if (dist > 120) continue;
            const toTx = t.x - this.player.x; const toTy = t.y - this.player.y;
            const dot = (dx / len) * (toTx / dist) + (dy / len) * (toTy / dist);
            if (dot > 0.4) {
              t.takeDamage(clawDmg);
              this.spawnHitFlash(t.x, t.y, 0x88bb22);
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
              for (const t of this.enemies) {
                if (!t.active || t.hp <= 0) continue;
                if (Phaser.Math.Distance.Between(tx, ty, t.x, t.y) <= bombRadius) {
                  t.takeDamage(dmg);
                  this.spawnHitFlash(t.x, t.y, 0x88bb22);
                  const ft = this.add.text(t.x, t.y - 30, `💥 ${dmg}`, { fontSize: '11px', color: '#aadd44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
                  this.tweens.add({ targets: ft, y: ft.y - 25, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
                }
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
        const INFECT_MUTATION_IDS = ['spray', 'quick', 'relapse', 'uber-infect', 'deadly', 'linger', 'viral'];
        let pool = this.hasUpgrade('e') ? [...BASE_MUTATIONS, ...ADVANCED_MUTATIONS] : [...BASE_MUTATIONS];
        if (this.hasPerk('player', 'virus')) pool = pool.filter((m) => INFECT_MUTATION_IDS.includes(m.id));
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
        const menuCX = this.isInvasion ? this.player.x : W / 2;
        const menuCY = this.isInvasion ? this.player.y + 100 : H / 2;
        const startY = menuCY - ((btnH + gap) * (picks.length - 1)) / 2;
        for (let p = 0; p < picks.length; p++) {
          const mut = picks[p];
          const by = startY + p * (btnH + gap);
          const bg = this.add.rectangle(menuCX, by, btnW, btnH, 0x223322, 1)
            .setStrokeStyle(2, 0x88bb22).setDepth(30).setInteractive({ useHandCursor: true });
          const lbl = this.add.text(menuCX, by - 10, `${mut.emoji} ${mut.name}`, { fontSize: '14px', fontFamily: '"Arial Black"', color: '#aadd44' }).setOrigin(0.5).setDepth(31);
          const desc = this.add.text(menuCX, by + 12, mut.description, { fontSize: '10px', color: '#888888' }).setOrigin(0.5).setDepth(31);
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
        const isGW = this.hasPerk('player', 'gateway');
        const [nW, nH] = isGW ? [9, 42] : [6, 28];
        const gwColor = isGW ? 0xaaeeff : 0xaaeeff;
        if (this.hasUpgrade('e')) {
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const speed = 67;
          const vx = (dx / dist) * speed, vy = (dy / dist) * speed;
          const spr = this.add.rectangle(this.player.x, this.player.y, nW, nH, gwColor, 0.9)
            .setStrokeStyle(isGW ? 2 : 1, 0xeeffff, 1).setDepth(4).setAngle(angleDeg);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
          this.crystalNodes.push({ sprite: spr, x: this.player.x, y: this.player.y, owner: 'player', vx, vy, moving: true, targetX: Infinity, targetY: Infinity, lastPortalTime: -99999, isGateway: isGW });
          if (isGW) this.showFloatingText(this.player.x, this.player.y - 20, '🌀 GATEWAY', '#aaeeff');
        } else {
          const spr = this.add.rectangle(tx, ty, nW, nH, gwColor, 0.9)
            .setStrokeStyle(isGW ? 2 : 1, 0xeeffff, 1).setDepth(4).setAngle(angleDeg);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
          this.crystalNodes.push({ sprite: spr, x: tx, y: ty, owner: 'player', vx: 0, vy: 0, moving: false, targetX: tx, targetY: ty, lastPortalTime: -99999, isGateway: isGW });
          if (isGW) this.showFloatingText(tx, ty - 20, '🌀 GATEWAY', '#aaeeff');
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
        let consumedCount = 0;
        for (let i = this.playerSoulSummons.length - 1; i >= 0; i--) {
          const gs = this.playerSoulSummons[i];
          if (Phaser.Math.Distance.Between(gs.sprite.x, gs.sprite.y, this.player.x, this.player.y) <= consumeR) {
            consumedCount++;
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
        if (this.hasPerk('player', 'ward') && consumedCount > 0) {
          this.spawnWardHex(this.player.x, this.player.y, consumedCount, 'player');
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
        this.huntBeastForm = true;
        this.huntBeastEnteredAt = this.time.now;
        this.player.setScale(1.2);
        (this.player.body as Phaser.Physics.Arcade.Body).setCircle(26, 3, 3);
        this.player.incomingDamageMultiplier = 0.65;
        this.huntToggleBeastHud(true);
        const burst = this.add.circle(this.player.x, this.player.y, 20, 0xcc2200, 0.8).setDepth(8);
        this.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
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
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const slashDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
            if (slashDist <= 85) {
              const bleedBonus = this.hasUpgrade('click') && t.bleeding ? 1.5 : 1;
              const slashDmg = Math.round(20 * bleedBonus);
              t.takeDamage(slashDmg);
              this.spawnHitFlash(t.x, t.y, 0xff2200);
              if (this.huntBloodMoonActive && this.hasUpgrade('f')) this.player.heal(Math.ceil(slashDmg * 0.5));
              if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(10);
              // Apply bleeding
              t.bleeding = true;
              t.bleedingUntil = this.time.now + 8000;
              const kb = t.body as Phaser.Physics.Arcade.Body;
              const toTx = t.x - this.player.x, toTy = t.y - this.player.y;
              const td2 = Math.sqrt(toTx * toTx + toTy * toTy) || 1;
              kb.setVelocity((toTx / td2) * 500, (toTy / td2) * 500);
            }
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
        const bhTarget = this.enemies.find(t => t.active && t.hp > 0 && t.bleeding) ?? null;
        if (!bhTarget) return;
        this.huntBloodHuntTarget = bhTarget;
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
          // Base: instant teleport beside target, 1s stun + 1s invincibility
          const angle = Math.random() * Math.PI * 2;
          this.player.setPosition(bhTarget.x + Math.cos(angle) * 60, bhTarget.y + Math.sin(angle) * 60);
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
        if (this.huntHybridForm) {
          this.huntHybridForm = false;
          this.huntHybridTrailStandAccum = 0;
          this.player.setTexture('elem-hunt');
          this.player.setScale(1.0);
          (this.player.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
          this.huntToggleHybridHud(false);
          const burst = this.add.circle(this.player.x, this.player.y, 20, 0xcc5522, 0.8).setDepth(8);
          this.tweens.add({ targets: burst, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
          this.player.triggerCooldown('hunt-transform');
          // Extend CD to 35s (triggerCooldown records the ability CD of 25s, so add 10s more)
          this.player.reduceCooldown('hunt-transform', -10000);
        } else {
          this.huntBeastForm = false;
          this.playerHuntRageTriggeredBeast = false;
          this.player.clearTint();
          this.player.incomingDamageMultiplier = 1;
          this.player.setScale(1.0);
          (this.player.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
          this.huntToggleBeastHud(false);
          const burst = this.add.circle(this.player.x, this.player.y, 20, 0x664422, 0.7).setDepth(8);
          this.tweens.add({ targets: burst, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
          this.player.triggerCooldown('hunt-transform');
        }
      },
      // Hunt Hybrid form
      huntHybridShotgun: (tx, ty) => {
        const HYBRID_PELLET_COUNT = 6;
        const HYBRID_CONE_HALF_DEG = 25;
        const HYBRID_SPEED = 420;
        const HYBRID_RANGE_PX = 260;
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const baseAngle = Math.atan2(dy, dx);
        const expireMs = Math.round((HYBRID_RANGE_PX / HYBRID_SPEED) * 1000);
        for (let i = 0; i < HYBRID_PELLET_COUNT; i++) {
          const frac = i / (HYBRID_PELLET_COUNT - 1);
          const angleDeg = -HYBRID_CONE_HALF_DEG + frac * HYBRID_CONE_HALF_DEG * 2;
          const angle = baseAngle + angleDeg * (Math.PI / 180);
          const proj = new Projectile(
            this, this.player.x + Math.cos(angle) * 22, this.player.y + Math.sin(angle) * 22,
            'proj-hunt-silver', 4, true,
          );
          this.projectiles.add(proj);
          proj.launch(Math.cos(angle) * HYBRID_SPEED, Math.sin(angle) * HYBRID_SPEED);
          this.huntSilverPellets.add(proj);
          this.time.delayedCall(expireMs, () => {
            if (proj.active) { proj.setActive(false).setVisible(false); (proj.body as Phaser.Physics.Arcade.Body).stop(); }
          });
        }
        const flash = this.add.circle(this.player.x, this.player.y, 14, 0xdddddd, 0.7).setDepth(9);
        this.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
      },
      huntHybridInstinct: () => {
        // Reuse the trail logic: spawn trail circles at NPC position
        this.huntTrailActive = true;
        this.huntPermTrailActive = false;
        this.huntTrailEnd = this.time.now + 4500;
        this.huntTrailAccum = 0;
        this.huntHybridTrailStandAccum = 0;
        const flash = this.add.circle(this.player.x, this.player.y, 24, 0xcc3300, 0.5).setDepth(6);
        this.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      },
      huntHybridShriek: (tx, ty) => {
        // Rectangular shriek (120×60) oriented toward target — same math as placeFirewall
        const angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        const cx = this.player.x + Math.cos(angle) * 70;
        const cy = this.player.y + Math.sin(angle) * 70;
        const shriekRect = this.add.rectangle(cx, cy, 120, 60, 0xffcc66, 0.55)
          .setStrokeStyle(2, 0xffffff, 0.8).setDepth(7).setRotation(angle - Math.PI / 2);
        this.tweens.add({ targets: shriekRect, alpha: 0, duration: 250, onComplete: () => shriekRect.destroy() });
        // Local-space AABB check for all enemies
        const fwCos = Math.cos(-angle);
        const fwSin = Math.sin(-(angle - Math.PI / 2));
        let shriekHit = false;
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const relX = t.x - cx;
          const relY = t.y - cy;
          const localX = fwCos * relX - fwSin * relY;
          const localY = fwSin * relX + fwCos * relY;
          if (Math.abs(localX) <= 60 && Math.abs(localY) <= 30) {
            t.bleeding = true;
            t.bleedingUntil = this.time.now + 8000;
            shriekHit = true;
          }
        }
        if (shriekHit) {
          this.applyNpcBleedVisual();
          // Mark shriek DoT (3 dmg/s + heals caster)
          this.npcHuntShriekDotUntil = this.time.now + 8000;
          this.npcHuntShriekDotTick = 0;
        }
        // F+: shriek rect overlapping a player grenade converts it to shrapnel
        if (this.hasUpgrade('f')) {
          for (let gi = this.huntGrenades.length - 1; gi >= 0; gi--) {
            const g = this.huntGrenades[gi];
            if (g.owner !== 'player') continue;
            const gr = g.x - cx, gy2 = g.y - cy;
            const glx = fwCos * gr - fwSin * gy2;
            const gly = fwSin * gr + fwCos * gy2;
            if (Math.abs(glx) <= 60 && Math.abs(gly) <= 30) {
              const gx = g.x, gy = g.y;
              g.sprite.destroy();
              this.huntGrenades.splice(gi, 1);
              this.spawnHuntShrapnel(gx, gy, 'player');
              this.showFloatingText(gx, gy - 20, '💥 Shrapnel!', '#ffcc66');
            }
          }
        }
        const shriekVfx = this.add.circle(this.player.x, this.player.y, 12, 0xffcc66, 0.8).setDepth(9);
        this.tweens.add({ targets: shriekVfx, scaleX: 2, scaleY: 2, alpha: 0, duration: 200, onComplete: () => shriekVfx.destroy() });
      },
      // Silence
      silenceStartFade: () => { /* handled in input block */ },
      silenceReleaseFade: () => { /* handled in input block */ },
      silenceCastDontLook: (angleRad: number) => { this.silenceKit.doCastDontLook(angleRad, 'player'); },
      silenceFirePossess: (angleRad: number) => { this.silenceKit.doFirePossess(angleRad, 'player'); },
      silenceEnterSlasher: () => { this.silenceKit.doEnterSlasher('player'); },
      silenceExitSlasher: (voluntary: boolean) => { this.silenceKit.doExitSlasher(voluntary, 'player'); },
      silenceStartWatch: () => { this.silenceKit.doStartWatch('player'); },
      silenceWatchTendril: (tx: number, ty: number) => { this.silenceKit.doWatchTendril(tx, ty, 'player'); },
      silenceMachete: (angleRad: number) => { this.silenceKit.doMachete(angleRad, 'player'); },
      silenceThrowHook: (angleRad: number) => { this.silenceKit.doThrowHook(angleRad, 'player'); },
      silenceYankHook: () => { this.silenceKit.doYankHook('player'); },
      silenceMortalWound: (angleRad) => { this.silenceKit.doMortalWound(angleRad, 'player'); },
      silenceSlashEmUp: () => { this.silenceKit.doSlashEmUp('player'); },
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
        if (this.hasPerk('player', 'purge')) {
          this.purgePriorCooldownMult = this.player.cooldownMult;
          this.player.cooldownMult *= 0.5;
          this.startPurgePulse();
        }
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
      // Fate
      fateCoinToss: (tx, ty) => this.fateKit.doCoinToss(tx, ty, 'player'),
      fateSpawnSlotMachine: (x, y) => this.fateKit.doSpawnSlotMachine(x, y, 'player'),
      fateLuck: () => this.fateKit.doLuck('player'),
      fateDice: (tx, ty) => this.fateKit.doDice(tx, ty, 'player'),
      fateAllIn: () => this.fateKit.doAllIn('player'),
      // Magnet
      magnetPulse: (x, y) => { this.magnetKit.doMagnetPulse(x, y, 'player'); },
      magnetNailShoot: (tx, ty) => { this.magnetKit.doMagnetNailAction(tx, ty, 'player'); },
      magnetNailRecall: () => { this.magnetKit.doMagnetNailAction(this.npc.x, this.npc.y, 'player'); },
      magnetMagnetize: (tx, ty) => { this.magnetKit.doMagnetMagnetize(tx, ty, 'player'); },
      magnetProtect: () => { this.magnetKit.doMagnetProtect('player'); },
      magnetAtomSmasher: (x, y) => { this.magnetKit.doMagnetAtomSmasher(x, y, 'player'); },
      // Metal
      metalSlash: (tx, ty) => { this.doMetalSlash(tx, ty, 'player'); },
      metalFireAtWill: () => { this.doMetalFireAtWill('player'); },
      metalOpenReinforcementMenu: () => { this.doMetalOpenReinforcementMenu(); },
      metalChainTether: (tx, ty) => { this.doMetalChainTether(tx, ty, 'player'); },
      metalBloodClot: () => { this.doMetalBloodClot('player'); },
      // Plasma
      plasmaBurst: (tx, ty) => { this.doPlasmaBurst(tx, ty, 'player'); },
      plasmaUnstableArena: (tx, ty) => { this.doPlasmaUnstableArena(tx, ty, 'player'); },
      plasmaCurrentLaunch: (tx, ty) => { this.doPlasmaCurrentLaunch(tx, ty, 'player'); },
      plasmaChaosBlades: () => { this.doPlasmaChaosBlades('player'); },
      plasmaChaosIncarnate: () => { this.doPlasmaChaosIncarnate('player'); },
      // Death
      death1000Blades: (tx, ty) => { this.deathKit.doDeath1000Blades(tx, ty, 'player'); },
      deathSummonWisps: (count) => { this.deathKit.doDeathSummonWisps(count, 'player'); },
      deathLoomingDread: () => { this.deathKit.doDeathLoomingDread('player'); },
      deathWispDaemon: () => { this.deathKit.doDeathWispDaemon('player'); },
      deathTrailDash: (tx, ty) => { this.deathKit.doDeathTrailDash(tx, ty, 'player'); },
      deathJudgement: () => { this.deathKit.doDeathJudgement('player'); },
      // Void
      voidFloater: (_tx, _ty) => { this.voidKit.doVoidFloater('player'); },
      voidReturnToVoid: (tx, ty) => { this.voidKit.doVoidReturnToVoid(tx, ty, 'player'); },
      voidReLapse: (tx, ty) => { this.voidKit.doVoidReLapse(tx, ty, 'player'); },
      voidAsh: (tx, ty) => { this.voidKit.doVoidAsh(tx, ty, 'player'); },
      voidOfHell: () => { this.voidKit.doVoidOfHell('player'); },
      // Rubber
      rubberPunch: (tx, ty, r) => { this.rubberKit.doRubberPunch(tx, ty, r, 'player'); },
      rubberSlingShotStart: (angle) => { this.rubberKit.doRubberSlingShotStart(angle, 'player'); },
      rubberSlingShotRelease: (vx, vy) => { this.rubberKit.doRubberSlingShotRelease(vx, vy, 'player'); },
      rubberBounceForm: () => { this.rubberKit.doRubberBounceForm('player'); },
      rubberSpringSlam: (angle) => { this.rubberKit.doRubberSpringSlam(angle, 'player'); },
      rubberBounceBack: () => { this.rubberKit.doRubberBounceBack('player'); },
      // Magic
      magicSparkleShot: (tx, ty) => { this.magicKit.doSparkleShot(tx, ty, 'player'); },
      magicOpenGrimoire: () => { /* handled in magicKit.handleInput */ },
      magicAnchorToggle: (_tx, _ty) => { this.magicKit.doAnchorToggle('player'); },
      magicMeditateBegin: () => { this.magicKit.doMeditateBegin('player'); },
      magicOpenNecronomicon: () => { /* handled in magicKit.handleInput */ },
      // Technology
      techFlailEmpower: () => {},
      techDevConsoleOpen: () => { this.techKit.doTechDevConsoleOpen('player'); },
      techHackAttribute: () => { this.techKit.doTechHackAttribute('player'); },
      techDeleteArea: (x, y, w, h) => { this.techKit.doTechDeleteArea('player', x, y, w, h); },
      techOpSelfBegin: () => { this.techKit.doTechOpSelfBegin('player'); },
      techStartDomain: () => { this.techKit.doTechStartDomain('player'); },
      techGearGiveActivate: () => { this.techKit.doTechGearGiveActivate('player'); },
      techRandomEffect: () => { this.techKit.doTechRandomEffect('player'); },
      // Echo (player input handled entirely in echoKit.handleInput; these are stubs for ability cast registration)
      echoEcholocation: () => { /* handled in handleInput */ },
      echoGuess: () => { /* handled in handleInput */ },
      echoLantern: () => { /* handled in handleInput */ },
      echoBatForm: () => { /* handled in handleInput */ },
      echoEclipse: () => { /* handled in handleInput */ },
      // Quantum (dispatched from kit via handleInput)
      quantumWave: (tx, ty) => { this.quantumElementKit.doPlayerQuantumWave(tx, ty); },
      quantumChaosControl: (tx, ty) => { this.quantumElementKit.doPlayerChaosControl(tx, ty); },
      quantumAtomVibration: (tx, ty) => { this.quantumElementKit.doPlayerAtomVibration(tx, ty); },
      quantumMechanic: (tx, ty) => { this.quantumElementKit.doPlayerMechanic(tx, ty); },
      quantumAtomNhilego: (tx, ty) => { this.quantumElementKit.doPlayerAtomNhilego(tx, ty); },
      hasPerk: (perkId) => this.hasPerk('player', perkId),
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
      spawnPainRain: () => this.createPainRain('npc', 200),
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
      slamCaster: () => { /* earth kit reworked — no longer used via context */ },
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
      startBullRush: () => { /* earth kit reworked — no longer used via context */ },
      spawnDrone: () => this.oilKit.doNpcSpawnDrone(),
      commandDrones: (x, y) => this.oilKit.doNpcCommandDrones(x, y),
      launchDrone: (x, y) => this.oilKit.doNpcLaunchDrone(x, y),
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
        const isNpcPlume = this.hasPerk('npc', 'plume');
        const npcTrapR = isNpcPlume ? 25 : 18;
        const npcTrapColor = isNpcPlume ? 0x6633aa : 0x220033;
        const npcTrapLabel = isNpcPlume ? '☁️' : '⚡';
        const spr = this.add.circle(this.npc.x, this.npc.y, npcTrapR, npcTrapColor, 0.75)
          .setStrokeStyle(2, isNpcPlume ? 0xcc88ff : 0x8800cc).setDepth(3);
        const lbl = this.add.text(this.npc.x, this.npc.y, npcTrapLabel, { fontSize: '10px' }).setOrigin(0.5).setDepth(4);
        this.shadowSnapTraps.push({
          sprite: spr, label: lbl,
          expiresAt: this.time.now + 12000,
          x: this.npc.x, y: this.npc.y,
          triggered: false, radius: npcTrapR, owner: 'npc', isPlume: isNpcPlume,
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
          ? this.frostDamageMultiplier(this.npc.frostStacks) * 0.75
          : this.frostDamageMultiplier(this.npc.frostStacks);
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
        // Rink perk: record recent skate timestamp for bonus speed
        if (this.hasPerk('npc', 'rink')) this.npcSkateRecentUntil = this.time.now + 2000;
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
        // Rink perk: tile the cone with icy trails lasting 8s
        if (this.hasPerk('npc', 'rink')) this.spawnRinkConeTiles(this.npc.x, this.npc.y, angle, 'npc');
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
        const INFECT_IDS_NPC = ['spray', 'quick', 'relapse', 'uber-infect', 'deadly', 'linger', 'viral'];
        const allMuts = ['healthier','deadly','linger','viral','grow','shrink','buffer','spray','quick','regenerative'];
        const mutations = this.hasPerk('npc', 'virus') ? allMuts.filter((m) => INFECT_IDS_NPC.includes(m)) : allMuts;
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
        this.npc.growthBloatActive = true;
        this.npc.growthBloatEnd = this.time.now + 5000;
        if (this.npc.growthBloatAura) this.npc.growthBloatAura.destroy();
        this.npc.growthBloatAura = this.add.circle(this.npc.x, this.npc.y, 30, 0xdddd00, 0.3)
          .setStrokeStyle(2, 0xffff44, 0.8).setDepth(5);
        this.tweens.add({ targets: this.npc.growthBloatAura, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
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
        const ndx = tx - this.npc.x, ndy = ty - this.npc.y;
        const ndist = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
        const nvx = (ndx / ndist) * 60, nvy = (ndy / ndist) * 60;
        const ntAngleDeg = Math.atan2(ndy, ndx) * 180 / Math.PI;
        const isNpcGW = this.hasPerk('npc', 'gateway');
        const [npcNW, npcNH] = isNpcGW ? [9, 42] : [6, 28];
        const spr = this.add.rectangle(this.npc.x, this.npc.y, npcNW, npcNH, 0x99ccee, 0.7)
          .setStrokeStyle(isNpcGW ? 2 : 1, 0xaaeeff, 0.7).setDepth(4).setAngle(ntAngleDeg);
        this.npcCrystalNodes.push({ sprite: spr, x: this.npc.x, y: this.npc.y, owner: 'npc', vx: nvx, vy: nvy, moving: true, targetX: tx, targetY: ty, lastPortalTime: -99999, isGateway: isNpcGW });
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
        let consumedCount = 0;
        for (let i = this.npcSoulSummons.length - 1; i >= 0; i--) {
          const gs = this.npcSoulSummons[i];
          if (Phaser.Math.Distance.Between(gs.sprite.x, gs.sprite.y, this.npc.x, this.npc.y) <= consumeR) {
            consumedCount++;
            this.npc.heal(Math.floor(gs.hp / 2));
            gs.sprite.destroy();
            this.npcSoulSummons.splice(i, 1);
          }
        }
        if (this.hasPerk('npc', 'ward') && consumedCount > 0) {
          this.spawnWardHex(this.npc.x, this.npc.y, consumedCount, 'npc');
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
      // NPC has no Q+ upgrade — hybrid methods are no-ops
      huntHybridShotgun: () => {},
      huntHybridInstinct: () => {},
      huntHybridShriek: () => {},
      // Silence (NPC)
      silenceStartFade: () => {
        // NPC fade: brief invincibility + random firing
        this.npc.isInvincible = true;
        this.npc.setAlpha(0.12);
        this.time.delayedCall(500, () => {
          if (!this.npc.active) return;
          this.npc.isInvincible = false;
          this.npc.setAlpha(1);
          // Release AOE
          if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y) <= 100) {
            this.player.takeDamage(12);
            this.spawnHitFlash(this.player.x, this.player.y, 0x440066);
          }
          const burst = this.add.circle(this.npc.x, this.npc.y, 10, 0x440066, 0.8).setDepth(8);
          this.tweens.add({ targets: burst, scaleX: 9, scaleY: 9, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
        });
      },
      silenceReleaseFade: () => {},
      silenceCastDontLook: (angleRad: number) => { this.silenceKit.doCastDontLook(angleRad, 'npc'); },
      silenceFirePossess: (angleRad: number) => { this.silenceKit.doFirePossess(angleRad, 'npc'); },
      silenceEnterSlasher: () => { this.silenceKit.doEnterSlasher('npc'); },
      silenceExitSlasher: (voluntary: boolean) => { this.silenceKit.doExitSlasher(voluntary, 'npc'); },
      silenceStartWatch: () => {},
      silenceWatchTendril: () => {},
      silenceMachete: (angleRad: number) => { this.silenceKit.doMachete(angleRad, 'npc'); },
      silenceThrowHook: (angleRad: number) => { this.silenceKit.doThrowHook(angleRad, 'npc'); },
      silenceYankHook: () => { this.silenceKit.doYankHook('npc'); },
      silenceMortalWound: (angleRad: number) => { this.silenceKit.doMortalWound(angleRad, 'npc'); },
      silenceSlashEmUp: () => { /* NPC version handled via npcCastId block */ },
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
      // Fate
      fateCoinToss: (tx, ty) => this.fateKit.doCoinToss(tx, ty, 'npc'),
      fateSpawnSlotMachine: (x, y) => this.fateKit.doSpawnSlotMachine(x, y, 'npc'),
      fateLuck: () => this.fateKit.doLuck('npc'),
      fateDice: (tx, ty) => this.fateKit.doDice(tx, ty, 'npc'),
      fateAllIn: () => this.fateKit.doAllIn('npc'),
      // Magnet
      magnetPulse: (x, y) => { this.magnetKit.doMagnetPulse(x, y, 'npc'); },
      magnetNailShoot: (tx, ty) => { this.magnetKit.doMagnetNailAction(tx, ty, 'npc'); },
      magnetNailRecall: () => { this.magnetKit.doMagnetNailAction(this.player.x, this.player.y, 'npc'); },
      magnetMagnetize: (tx, ty) => { this.magnetKit.doMagnetMagnetize(tx, ty, 'npc'); },
      magnetProtect: () => { this.magnetKit.doMagnetProtect('npc'); },
      magnetAtomSmasher: (x, y) => { this.magnetKit.doMagnetAtomSmasher(x, y, 'npc'); },
      // Metal
      metalSlash: (tx, ty) => { this.doMetalSlash(tx, ty, 'npc'); },
      metalFireAtWill: () => { this.doMetalFireAtWill('npc'); },
      metalOpenReinforcementMenu: () => { this.doMetalNpcPickGun(); },
      metalChainTether: (tx, ty) => { this.doMetalChainTether(tx, ty, 'npc'); },
      metalBloodClot: () => { this.doMetalBloodClot('npc'); },
      // Plasma
      plasmaBurst: (tx, ty) => { this.doPlasmaBurst(tx, ty, 'npc'); },
      plasmaUnstableArena: (tx, ty) => { this.doPlasmaUnstableArena(tx, ty, 'npc'); },
      plasmaCurrentLaunch: (tx, ty) => { this.doPlasmaCurrentLaunch(tx, ty, 'npc'); },
      plasmaChaosBlades: () => { this.doPlasmaChaosBlades('npc'); },
      plasmaChaosIncarnate: () => { this.doPlasmaChaosIncarnate('npc'); },
      // Death
      death1000Blades: (tx, ty) => { this.deathKit.doDeath1000Blades(tx, ty, 'npc'); },
      deathSummonWisps: (count) => { this.deathKit.doDeathSummonWisps(count, 'npc'); },
      deathLoomingDread: () => { this.deathKit.doDeathLoomingDread('npc'); },
      deathWispDaemon: () => { this.deathKit.doDeathWispDaemon('npc'); },
      deathTrailDash: (tx, ty) => { this.deathKit.doDeathTrailDash(tx, ty, 'npc'); },
      deathJudgement: () => { this.deathKit.doDeathJudgement('npc'); },
      // Void
      voidFloater: (_tx, _ty) => { this.voidKit.doVoidFloater('npc'); },
      voidReturnToVoid: (tx, ty) => { this.voidKit.doVoidReturnToVoid(tx, ty, 'npc'); },
      voidReLapse: (tx, ty) => { this.voidKit.doVoidReLapse(tx, ty, 'npc'); },
      voidAsh: (tx, ty) => { this.voidKit.doVoidAsh(tx, ty, 'npc'); },
      voidOfHell: () => { this.voidKit.doVoidOfHell('npc'); },
      // Rubber
      rubberPunch: (tx, ty, r) => { this.rubberKit.doRubberPunch(tx, ty, r, 'npc'); },
      rubberSlingShotStart: (angle) => { this.rubberKit.doRubberSlingShotStart(angle, 'npc'); },
      rubberSlingShotRelease: (vx, vy) => { this.rubberKit.doRubberSlingShotRelease(vx, vy, 'npc'); },
      rubberBounceForm: () => { this.rubberKit.doRubberBounceForm('npc'); },
      rubberSpringSlam: (angle) => { this.rubberKit.doRubberSpringSlam(angle, 'npc'); },
      rubberBounceBack: () => { this.rubberKit.doRubberBounceBack('npc'); },
      // Magic (NPC mirrors)
      magicSparkleShot: (tx, ty) => { this.magicKit.doSparkleShot(tx, ty, 'npc'); },
      magicOpenGrimoire: () => { this.magicKit.npcCastGrimoireWedge(this.player.x, this.player.y); },
      magicAnchorToggle: (_tx, _ty) => { this.magicKit.doAnchorToggle('npc'); },
      magicMeditateBegin: () => { this.magicKit.doMeditateBegin('npc'); },
      magicOpenNecronomicon: () => { this.magicKit.npcCastNecronomiconWedge(this.player.x, this.player.y); },
      // Technology
      techFlailEmpower: () => {},
      techDevConsoleOpen: () => {
        if (this.techKit.getTechRansomwareTarget() === 'npc' && this.time.now < this.techKit.getTechRansomwareExpiry()) return;
        this.techKit.doTechDevConsoleOpen('npc');
      },
      techHackAttribute: () => { this.techKit.doTechHackAttribute('npc'); },
      techDeleteArea: (x, y, w, h) => {
        if (this.techKit.getTechRansomwareTarget() === 'npc' && this.time.now < this.techKit.getTechRansomwareExpiry()) return;
        this.techKit.doTechDeleteArea('npc', x, y, w, h);
      },
      techOpSelfBegin: () => { this.techKit.doTechOpSelfBegin('npc'); },
      techStartDomain: () => {
        if (this.techKit.getTechRansomwareTarget() === 'npc' && this.time.now < this.techKit.getTechRansomwareExpiry()) return;
        this.techKit.doTechStartDomain('npc');
      },
      techGearGiveActivate: () => { this.techKit.doTechNpcGearGiveAttack(); },
      techRandomEffect: () => {
        if (this.techKit.getTechRansomwareTarget() === 'npc' && this.time.now < this.techKit.getTechRansomwareExpiry()) return;
        this.techKit.doTechRandomEffect('npc');
      },
      // Echo
      echoEcholocation: (tx, ty) => this.echoKit.doNpcEcholocation(tx, ty),
      echoGuess: (tx, ty) => this.echoKit.doNpcGuess(tx, ty),
      echoLantern: (tx, ty) => this.echoKit.doNpcLantern(tx, ty),
      echoBatForm: (tx, ty) => this.echoKit.doNpcBatForm(tx, ty),
      echoEclipse: (tx, ty) => this.echoKit.doNpcEclipse(tx, ty),
      // Quantum
      quantumWave: (tx, ty) => this.quantumElementKit.doNpcQuantumWave(tx, ty),
      quantumChaosControl: (tx, ty) => this.quantumElementKit.doNpcChaosControl(tx, ty),
      quantumAtomVibration: (tx, ty) => this.quantumElementKit.doNpcAtomVibration(tx, ty),
      quantumMechanic: (tx, ty) => this.quantumElementKit.doNpcMechanic(tx, ty),
      quantumAtomNhilego: (tx, ty) => this.quantumElementKit.doNpcAtomNhilego(tx, ty),
      hasPerk: (perkId) => this.hasPerk('npc', perkId),
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
      spawnPainRain: () => this.createPainRain('npc', 200),
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
      huntHybridShotgun: () => {},
      huntHybridInstinct: () => {},
      huntHybridShriek: () => {},
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
      // Fate (clone stubs)
      fateCoinToss: () => {},
      fateSpawnSlotMachine: () => {},
      fateLuck: () => {},
      fateDice: () => {},
      fateAllIn: () => {},
      // Echo (clone stubs)
      echoEcholocation: () => {},
      echoGuess: () => {},
      echoLantern: () => {},
      echoBatForm: () => {},
      echoEclipse: () => {},
      // Magnet stubs
      magnetPulse: () => {},
      magnetNailShoot: () => {},
      magnetNailRecall: () => {},
      magnetMagnetize: () => {},
      magnetProtect: () => {},
      magnetAtomSmasher: () => {},
      // Metal stubs
      metalSlash: () => {},
      metalFireAtWill: () => {},
      metalOpenReinforcementMenu: () => {},
      metalChainTether: () => {},
      metalBloodClot: () => {},
      // Plasma stubs
      plasmaBurst: () => {},
      plasmaUnstableArena: () => {},
      plasmaCurrentLaunch: () => {},
      plasmaChaosBlades: () => {},
      plasmaChaosIncarnate: () => {},
      // Death stubs
      death1000Blades: () => {},
      deathSummonWisps: () => {},
      deathLoomingDread: () => {},
      deathWispDaemon: () => {},
      deathTrailDash: () => {},
      deathJudgement: () => {},
      // Void stubs
      voidFloater: () => {},
      voidReturnToVoid: () => {},
      voidReLapse: () => {},
      voidAsh: () => {},
      voidOfHell: () => {},
      // Rubber stubs
      rubberPunch: () => {}, rubberSlingShotStart: () => {}, rubberSlingShotRelease: () => {},
      rubberBounceForm: () => {}, rubberSpringSlam: () => {}, rubberBounceBack: () => {},
      // Magic — no-op stubs for clone
      magicSparkleShot: () => {},
      magicOpenGrimoire: () => {},
      magicAnchorToggle: () => {},
      magicMeditateBegin: () => {},
      magicOpenNecronomicon: () => {},
      techFlailEmpower: () => {},
      techDevConsoleOpen: () => {},
      techHackAttribute: () => {},
      techDeleteArea: () => {},
      techOpSelfBegin: () => {},
      techStartDomain: () => {},
      techGearGiveActivate: () => {},
      techRandomEffect: () => {},
      // Silence — no-ops for clone
      silenceStartFade: () => {},
      silenceReleaseFade: () => {},
      silenceCastDontLook: () => {},
      silenceFirePossess: () => {},
      silenceEnterSlasher: () => {},
      silenceExitSlasher: () => {},
      silenceStartWatch: () => {},
      silenceWatchTendril: () => {},
      silenceMachete: () => {},
      silenceThrowHook: () => {},
      silenceYankHook: () => {},
      silenceMortalWound: (_angleRad: number) => {},
      silenceSlashEmUp: () => {},
      quantumWave: () => {},
      quantumChaosControl: () => {},
      quantumAtomVibration: () => {},
      quantumMechanic: () => {},
      quantumAtomNhilego: () => {},
      hasPerk: () => false,
    };
  }

  private buildRaidContext(raidNpc: NpcOpponent, projGroup: Phaser.Physics.Arcade.Group, targetX: number, targetY: number): CastContext {
    return {
      scene: this,
      casterX: raidNpc.x,
      casterY: raidNpc.y,
      targetX,
      targetY,
      isPlayerCaster: false,
      projectiles: projGroup,
      dealAoeDamage: (cx, cy, radius, damage) => {
        if (Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) <= radius) {
          this.player.takeDamage(damage);
        }
      },
      dashCaster: (vx, vy) => { (raidNpc.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy); },
      healCaster: (amount) => raidNpc.heal(amount),
      damageCaster: (amount) => raidNpc.applySelfDamage(amount),
      setCasterSpeedMultiplier: () => {},
      lockCaster: () => {},
      addShieldCharge: () => {},
      spawnPuddle: () => {},
      spawnGeyser: () => {},
      spawnPainRain: () => {},
      spawnPlant: () => {},
      growPlants: () => {},
      thornPlants: () => {},
      startThornDrag: () => {},
      activateQuickShot: () => {},
      placeWindTrap: () => {},
      grappleTo: () => {},
      reportAirSnipeResult: () => {},
      quickShotActive: false,
      addShieldHp: () => {},
      getShieldHp: () => 0,
      setShieldHp: () => {},
      slamCaster: () => {},
      dealMeleeDamage: (range, damage) => {
        const dist = Phaser.Math.Distance.Between(raidNpc.x, raidNpc.y, this.player.x, this.player.y);
        if (dist <= range) {
          this.player.takeDamage(damage);
          this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
        }
      },
      startBullRush: () => {},
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
      fireIceSpike: () => {},
      fireFrostBlast: () => {},
      toggleBlockUp: () => {},
      startSkate: () => {},
      fireFrozenSolid: () => {},
      fireGrowthClick: () => {},
      openMutateMenu: () => {},
      fireInfect: () => {},
      activateBloat: () => {},
      triggerMutantMorph: () => {},
      fireCrystalLaser: () => {},
      placeCrystalNode: () => {},
      startCrystalBarrage: () => {},
      placeCrystalPortal: () => {},
      activateCrystalTrick: () => {},
      fireSoulOrb: () => {},
      summonGhost: () => {},
      soulSacrifice: () => {},
      soulConsume: () => {},
      huntThrowGrenade: () => {},
      huntHuntersTrail: () => {},
      huntBloodPact: () => {},
      huntTransform: () => {},
      huntSlash: () => {},
      huntLeap: () => {},
      huntBloodHunt: () => {},
      huntBloodMoon: () => {},
      huntUntransform: () => {},
      huntHybridShotgun: () => {},
      huntHybridInstinct: () => {},
      huntHybridShriek: () => {},
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
      gravitySlash: () => {},
      gravityMeteorShadow: () => {},
      gravityMeteorRainNpcBurst: () => {},
      gravitySpaceSlam: () => {},
      gravityGravBombSnap: () => {},
      gravityLunarLanding: () => {},
      creationDaggerSpray: () => {},
      creationBolt: () => {},
      creationScytheLaunch: () => {},
      creationBlock: () => {},
      creationMaze: () => {},
      // Fate (raid stubs)
      fateCoinToss: () => {},
      fateSpawnSlotMachine: () => {},
      fateLuck: () => {},
      fateDice: () => {},
      fateAllIn: () => {},
      // Echo (raid stubs)
      echoEcholocation: () => {},
      echoGuess: () => {},
      echoLantern: () => {},
      echoBatForm: () => {},
      echoEclipse: () => {},
      // Magnet stubs (no-ops for clone/raid)
      magnetPulse: () => {},
      magnetNailShoot: () => {},
      magnetNailRecall: () => {},
      magnetMagnetize: () => {},
      magnetProtect: () => {},
      magnetAtomSmasher: () => {},
      // Metal stubs (no-ops for clone/raid)
      metalSlash: () => {},
      metalFireAtWill: () => {},
      metalOpenReinforcementMenu: () => {},
      metalChainTether: () => {},
      metalBloodClot: () => {},
      // Plasma stubs (no-ops for clone/raid)
      plasmaBurst: () => {},
      plasmaUnstableArena: () => {},
      plasmaCurrentLaunch: () => {},
      plasmaChaosBlades: () => {},
      plasmaChaosIncarnate: () => {},
      // Death stubs (no-ops for clone/raid)
      death1000Blades: () => {},
      deathSummonWisps: () => {},
      deathLoomingDread: () => {},
      deathWispDaemon: () => {},
      deathTrailDash: () => {},
      deathJudgement: () => {},
      // Void stubs (no-ops for clone/raid)
      voidFloater: () => {},
      voidReturnToVoid: () => {},
      voidReLapse: () => {},
      voidAsh: () => {},
      voidOfHell: () => {},
      // Rubber stubs
      rubberPunch: () => {}, rubberSlingShotStart: () => {}, rubberSlingShotRelease: () => {},
      rubberBounceForm: () => {}, rubberSpringSlam: () => {}, rubberBounceBack: () => {},
      // Magic — no-op stubs for raid
      magicSparkleShot: () => {},
      magicOpenGrimoire: () => {},
      magicAnchorToggle: () => {},
      magicMeditateBegin: () => {},
      magicOpenNecronomicon: () => {},
      techFlailEmpower: () => {},
      techDevConsoleOpen: () => {},
      techHackAttribute: () => {},
      techDeleteArea: () => {},
      techOpSelfBegin: () => {},
      techStartDomain: () => {},
      techGearGiveActivate: () => {},
      techRandomEffect: () => {},
      // Silence — no-ops for clone
      silenceStartFade: () => {},
      silenceReleaseFade: () => {},
      silenceCastDontLook: () => {},
      silenceFirePossess: () => {},
      silenceEnterSlasher: () => {},
      silenceExitSlasher: () => {},
      silenceStartWatch: () => {},
      silenceWatchTendril: () => {},
      silenceMachete: () => {},
      silenceThrowHook: () => {},
      silenceYankHook: () => {},
      silenceMortalWound: (_angleRad: number) => {},
      silenceSlashEmUp: () => {},
      quantumWave: () => {},
      quantumChaosControl: () => {},
      quantumAtomVibration: () => {},
      quantumMechanic: () => {},
      quantumAtomNhilego: () => {},
      hasPerk: () => false,
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
    const wb = this.physics.world.bounds;
    const scaledCount = this.isInvasion ? count * 4 : count;
    for (let i = 0; i < scaledCount; i++) {
      const sx = Phaser.Math.Between(wb.x, wb.right);
      const sy = Phaser.Math.Between(wb.y, wb.bottom);
      const fireAt = this.time.now + Phaser.Math.Between(minDelay, maxDelay);
      const shadow = this.add.circle(sx, sy, shadowRadius, color, 0.6).setDepth(7);
      this.painRainShadows.push({ sprite: shadow, fireAt, x: sx, y: sy, fired: false, owner, damage, hitRadius, color });
    }
  }

  private createPlant(x: number, y: number, owner: 'player' | 'npc'): void {
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    const hasMycology = this.hasPerk(owner, 'mycology');

    if (hasMycology) {
      // Mycology: spawn a mushroom instead of a plant
      const mushCount = list.filter((p) => p.type === 'mushroom' || p.type === 'heal-mushroom' || p.type === 'poison-mushroom').length;
      if (mushCount >= 5) {
        // Remove oldest parent mushroom and its minis
        const oldestIdx = list.findIndex((p) => p.type === 'mushroom' || p.type === 'heal-mushroom' || p.type === 'poison-mushroom');
        if (oldestIdx !== -1) {
          const oldest = list[oldestIdx];
          for (let mi = list.length - 1; mi >= 0; mi--) {
            if (list[mi].parentId === oldest.plantId) {
              list[mi].sprite.destroy(); list[mi].label.destroy(); list[mi].healthBar.destroy();
              list.splice(mi, 1);
            }
          }
          oldest.sprite.destroy(); oldest.label.destroy(); oldest.healthBar.destroy();
          list.splice(list.findIndex((p) => p === oldest), 1);
        }
      }
      const isUpgradedE = owner === 'player' && this.hasUpgrade('e');
      const maxHp = isUpgradedE ? 75 : 50;
      const pid = ++this.plantIdCounter;
      const sprite = this.add.circle(x, y, 28, 0xaa66dd, 0.65).setDepth(2);
      const label = this.add.text(x, y, '🍄', { fontSize: '22px' }).setOrigin(0.5).setDepth(3);
      const healthBar = new HealthBar(this, maxHp);
      this.tweens.add({ targets: sprite, scaleX: 1.08, scaleY: 1.08, alpha: 0.4, yoyo: true, repeat: -1, duration: 1400 });
      list.push({ sprite, label, healthBar, expiresAt: Infinity, x, y, radius: 120, hp: maxHp, maxHp, owner, type: 'mushroom', accum: 0, plantId: pid, miniSpawnAccum: 0 });
      return;
    }

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
    if (this.hasPerk('player', 'mycology')) {
      // Mycology: convert nearest mushroom to heal-mushroom
      if (this.playerPlants.some((p) => p.type === 'heal-mushroom')) return;
      let closest: Plant | null = null;
      let closestDist = Infinity;
      for (const p of this.playerPlants) {
        if (p.type !== 'mushroom') continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
        if (d < closestDist) { closestDist = d; closest = p; }
      }
      if (!closest) { this.showFloatingText(this.player.x, this.player.y - 28, 'No mushroom!', '#aaffaa'); return; }
      const newHp = closest.maxHp * 2;
      closest.type = 'heal-mushroom';
      closest.hp = newHp; closest.maxHp = newHp; closest.accum = 0;
      closest.sprite.setFillStyle(0x88ffaa, 0.8);
      closest.label.setText('✨🍄');
      closest.healthBar.destroy(); closest.healthBar = new HealthBar(this, newHp);
      for (const m of this.playerPlants) {
        if (m.parentId === closest.plantId) {
          const mHp = m.maxHp * 2;
          m.hp = mHp; m.maxHp = mHp;
          m.healthBar.destroy(); m.healthBar = new HealthBar(this, mHp);
          m.sprite.setFillStyle(0x88ffaa, 0.7);
        }
      }
      const bloom = this.add.circle(closest.x, closest.y, 12, 0xaaffaa, 0.9).setDepth(6);
      this.tweens.add({ targets: bloom, scaleX: 8, scaleY: 8, alpha: 0, duration: 600, onComplete: () => bloom.destroy() });
      this.showFloatingText(closest.x, closest.y - 28, '✨ Healing Mushroom!', '#aaffaa');
      return;
    }
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
    if (this.hasPerk('player', 'mycology')) {
      // Mycology: convert nearest mushroom to poison-mushroom (max 2)
      if (this.playerPlants.filter((p) => p.type === 'poison-mushroom').length >= 2) return;
      let closest: Plant | null = null;
      let closestDist = Infinity;
      for (const p of this.playerPlants) {
        if (p.type !== 'mushroom') continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
        if (d < closestDist) { closestDist = d; closest = p; }
      }
      if (!closest) { this.showFloatingText(this.player.x, this.player.y - 28, 'No mushroom!', '#44aa22'); return; }
      const newHp = closest.maxHp * 2;
      closest.type = 'poison-mushroom';
      closest.hp = newHp; closest.maxHp = newHp; closest.accum = 0;
      closest.sprite.setFillStyle(0x44aa22, 0.8);
      closest.label.setText('☠️🍄');
      closest.healthBar.destroy(); closest.healthBar = new HealthBar(this, newHp);
      for (const m of this.playerPlants) {
        if (m.parentId === closest.plantId) {
          const mHp = m.maxHp * 2;
          m.hp = mHp; m.maxHp = mHp;
          m.healthBar.destroy(); m.healthBar = new HealthBar(this, mHp);
          m.sprite.setFillStyle(0x44aa22, 0.6);
        }
      }
      const burst = this.add.circle(closest.x, closest.y, 12, 0x44aa22, 0.9).setDepth(6);
      this.tweens.add({ targets: burst, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => burst.destroy() });
      this.showFloatingText(closest.x, closest.y - 28, '☠️ Poison Mushroom!', '#44aa22');
      return;
    }
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

  private fireMycologyProjectiles(owner: 'player' | 'npc', kind: 'heal' | 'damage'): void {
    const plants = owner === 'player' ? this.playerPlants : this.npcPlants;
    const isFromPlayer = owner === 'player';
    const mushTypes: Plant['type'][] = ['mushroom', 'mini-mushroom', 'heal-mushroom', 'poison-mushroom'];
    for (const p of plants) {
      if (!mushTypes.includes(p.type)) continue;
      const count = p.type === 'mini-mushroom' ? 3 : 5;
      const dmg = kind === 'damage' ? 10 : 0;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const proj = new Projectile(this, p.x + Math.cos(angle) * 20, p.y + Math.sin(angle) * 20, 'proj-life', dmg, isFromPlayer);
        if (kind === 'heal') proj.isHeal = true;
        this.projectiles.add(proj);
        proj.launch(Math.cos(angle) * 480, Math.sin(angle) * 480);
        this.time.delayedCall(1000, () => {
          if (proj.active) { (proj.body as Phaser.Physics.Arcade.Body).stop(); proj.setActive(false).setVisible(false); }
        });
      }
    }
  }

  private beginTreeOfLife(owner: 'player' | 'npc'): boolean {
    const existingTree = owner === 'player' ? this.playerTree : this.npcTree;
    if (existingTree) {
      this.showFloatingText(
        owner === 'player' ? this.player.x : this.npc.x,
        (owner === 'player' ? this.player.y : this.npc.y) - 28,
        '🌳 Tree active!', '#44ff44'
      );
      return false;
    }
    const plants = owner === 'player' ? this.playerPlants : this.npcPlants;
    // Find nearest plant or mushroom to transform
    const caster = owner === 'player' ? this.player : this.npc;
    let closest: Plant | null = null;
    let closestDist = Infinity;
    for (const p of plants) {
      const d = Phaser.Math.Distance.Between(caster.x, caster.y, p.x, p.y);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    if (!closest) {
      this.showFloatingText(caster.x, caster.y - 28, '🌳 No plant nearby!', '#44ff44');
      return false;
    }
    const tx = closest.x, ty = closest.y;
    closest.sprite.destroy(); closest.label.destroy(); closest.healthBar.destroy();
    if (owner === 'player') {
      this.playerPlants.splice(this.playerPlants.indexOf(closest), 1);
    } else {
      this.npcPlants.splice(this.npcPlants.indexOf(closest), 1);
    }
    const treeSprite = this.add.circle(tx, ty, 28, 0x886600, 0.7).setDepth(2);
    this.tweens.add({ targets: treeSprite, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: -1, duration: 1000 });
    const treeLabel = this.add.text(tx, ty - 2, '🌳', { fontSize: '28px' }).setOrigin(0.5).setDepth(3);
    const tree: TreeOfLife = {
      sprite: treeSprite,
      label: treeLabel,
      x: tx, y: ty,
      spawnCount: 0,
      spawnAccum: 0,
      expiresAt: this.time.now + 7000, // safety: remove after 7s even if apples still pending
      owner,
    };
    if (owner === 'player') this.playerTree = tree; else this.npcTree = tree;
    this.showFloatingText(tx, ty - 36, '🌳 Tree of Life!', '#88ff44');
    return true;
  }

  private updateTreesAndApples(time: number, delta: number, mouseX: number, mouseY: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const treeRef = owner === 'player' ? this.playerTree : this.npcTree;
      const apples = owner === 'player' ? this.playerApples : this.npcApples;
      const caster = owner === 'player' ? this.player : this.npc;
      const enemies = owner === 'player' ? this.enemies : [this.player];

      // Tree: spawn apples every 1s up to 6, then expire
      if (treeRef) {
        treeRef.spawnAccum += delta;
        if (treeRef.spawnCount < 6 && treeRef.spawnAccum >= 1000) {
          treeRef.spawnAccum -= 1000;
          treeRef.spawnCount++;
          const ox = treeRef.x + Phaser.Math.Between(-70, 70);
          const oy = treeRef.y + Phaser.Math.Between(-70, 70);
          const spr = this.add.text(ox, oy, '🍎', { fontSize: '22px' }).setOrigin(0.5).setDepth(5);
          apples.push({ sprite: spr, x: ox, y: oy, rotsAt: time + 5000, expiresAt: time + 10000, rotted: false, owner });
          if (owner === 'player') this.playerTree = treeRef; else this.npcTree = treeRef;
        }
        if (treeRef.spawnCount >= 6) {
          treeRef.sprite.destroy(); treeRef.label.destroy();
          if (owner === 'player') this.playerTree = null; else this.npcTree = null;
        }
      }

      // Apple updates
      for (let i = apples.length - 1; i >= 0; i--) {
        const a = apples[i];
        if (time >= a.expiresAt) { a.sprite.destroy(); apples.splice(i, 1); continue; }
        if (!a.rotted && time >= a.rotsAt) {
          a.rotted = true;
          a.sprite.setText('🟤');
          this.showFloatingText(a.x, a.y - 18, 'Rotted!', '#886600');
        }
        if (!a.rotted) {
          // Fresh: can be picked up by friendly
          if (Phaser.Math.Distance.Between(a.x, a.y, caster.x, caster.y) <= 30) {
            caster.heal(15);
            this.showFloatingText(a.x, a.y - 18, '+15 ❤️', '#44ff44');
            a.sprite.destroy(); apples.splice(i, 1);
            if (owner === 'player') {
              this.playerAppleCollected++;
              if (this.playerAppleCollected >= 6) {
                this.playerAppleCollected = 0;
                this.playerPoisonFountainUntil = time + 3000;
                this.playerPoisonDropAccum = 0;
                this.showFloatingText(this.player.x, this.player.y - 40, '☠️ Poison Fountain!', '#66cc22');
              }
            } else {
              this.npcAppleCollected++;
              if (this.npcAppleCollected >= 6) {
                this.npcAppleCollected = 0;
                this.npcPoisonFountainUntil = time + 3000;
                this.npcPoisonDropAccum = 0;
              }
            }
          }
        } else {
          // Rotted: can be picked up by enemy to deal 15 dmg
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y) <= 30) {
              t.takeDamage(15);
              this.spawnHitFlash(t.x, t.y, 0x886600);
              this.showFloatingText(a.x, a.y - 18, '💀 -15', '#886600');
              a.sprite.destroy(); apples.splice(i, 1);
              break;
            }
          }
        }
      }

      // Poison fountain: drop puddles at cursor every 150ms for 3s
      if (owner === 'player' && time < this.playerPoisonFountainUntil) {
        this.playerPoisonDropAccum += delta;
        if (this.playerPoisonDropAccum >= 150) {
          this.playerPoisonDropAccum -= 150;
          const spr = this.add.circle(mouseX, mouseY, 36, 0x66cc22, 0.5).setDepth(2);
          this.puddles.push({ sprite: spr, expiresAt: time + 1000, x: mouseX, y: mouseY, radius: 36, tickAccum: 0, owner: 'player', kind: 'poison' });
        }
      } else if (owner === 'npc' && time < this.npcPoisonFountainUntil) {
        this.npcPoisonDropAccum += delta;
        if (this.npcPoisonDropAccum >= 150) {
          this.npcPoisonDropAccum -= 150;
          const dropX = this.npc.x + Phaser.Math.Between(-30, 30);
          const dropY = this.npc.y + Phaser.Math.Between(-30, 30);
          const spr = this.add.circle(dropX, dropY, 36, 0x66cc22, 0.5).setDepth(2);
          this.puddles.push({ sprite: spr, expiresAt: time + 1000, x: dropX, y: dropY, radius: 36, tickAccum: 0, owner: 'npc', kind: 'poison' });
        }
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

  // ── Perk ability helpers ────────────────────────────────────────

  private doHawkDive(targetX: number, targetY: number): void {
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 1200;
    const spr = this.add.circle(this.player.x, this.player.y, 10, 0xcc8833, 0.9)
      .setStrokeStyle(2, 0xffcc44, 1).setDepth(8);
    // Tiny triangle rotated toward target (just a visual arc for simplicity)
    const flash = this.add.text(this.player.x, this.player.y, '🦅', { fontSize: '18px' })
      .setOrigin(0.5).setDepth(9);
    this.hawkProjectiles.push({
      sprite: spr,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      expireAt: this.time.now + 1500,
    });
    // Fly the emoji label along with the sprite every frame (handled in update)
    (spr as Phaser.GameObjects.Arc & { label?: Phaser.GameObjects.Text }).label = flash;
    this.showFloatingText(this.player.x, this.player.y - 30, '🦅 HAWK!', '#ffcc44');
  }

  private updateHawkProjectiles(dt: number): void {
    const time = this.time.now;
    for (let i = this.hawkProjectiles.length - 1; i >= 0; i--) {
      const h = this.hawkProjectiles[i];
      h.sprite.x += h.vx * (dt / 1000);
      h.sprite.y += h.vy * (dt / 1000);
      const label = (h.sprite as Phaser.GameObjects.Arc & { label?: Phaser.GameObjects.Text }).label;
      if (label) { label.setPosition(h.sprite.x, h.sprite.y); }
      // Check hit against NPC
      const target = this.npc;
      if (target && target.active && target.hp > 0) {
        const ddx = h.sprite.x - target.x;
        const ddy = h.sprite.y - target.y;
        if (ddx * ddx + ddy * ddy < 36 * 36) {
          // Hit: drag enemy to cursor position
          const ptr = this.input.activePointer;
          const cx = ptr.worldX, cy = ptr.worldY;
          const edx = cx - target.x, edy = cy - target.y;
          const elen = Math.sqrt(edx * edx + edy * edy) || 1;
          const ebody = target.body as Phaser.Physics.Arcade.Body;
          const travelTime = Math.min(400, (elen / 1200) * 1000);
          this.npcHawkDragUntil = this.time.now + travelTime;
          ebody.setVelocity((edx / elen) * 1200, (edy / elen) * 1200);
          this.time.delayedCall(travelTime, () => {
            if (target.active) ebody.setVelocity(0, 0);
          });
          this.showFloatingText(target.x, target.y - 30, '🦅 SNATCHED!', '#ffcc44');
          this.spawnHitFlash(h.sprite.x, h.sprite.y, 0xffcc44);
          if (label) label.destroy();
          h.sprite.destroy();
          this.hawkProjectiles.splice(i, 1);
          continue;
        }
      }
      // Expire
      if (time >= h.expireAt) {
        if (label) label.destroy();
        h.sprite.destroy();
        this.hawkProjectiles.splice(i, 1);
      }
    }
  }

  private spawnAutomatons(owner: 'player' | 'npc', count: number): void {
    const W = this.scale.width, H = this.scale.height;
    const expireAt = this.time.now + 10000;
    for (let i = 0; i < count; i++) {
      let ax = 0, ay = 0;
      for (let attempt = 0; attempt < 30; attempt++) {
        ax = 60 + Math.random() * (W - 120);
        ay = 60 + Math.random() * (H - 120);
        // Avoid maze wall overlap (simple bounding box check)
        let blocked = false;
        for (const wall of this.creatMazeWalls) {
          if (wall.owner === owner && Math.abs(ax - wall.x) < wall.w / 2 + 20 && Math.abs(ay - wall.y) < wall.h / 2 + 20) {
            blocked = true; break;
          }
        }
        if (!blocked) break;
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 60;
      const spr = this.add.circle(ax, ay, 12, 0x8833cc, 0.85).setStrokeStyle(2, 0xcc55ff, 0.9).setDepth(5);
      this.tweens.add({ targets: spr, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });
      this.automatons.push({
        sprite: spr, x: ax, y: ay,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        expireAt, meleeCooldownUntil: 0, owner,
      });
    }
  }

  private updateAutomatons(dt: number): void {
    const time = this.time.now;
    const W = this.scale.width, H = this.scale.height;
    for (let i = this.automatons.length - 1; i >= 0; i--) {
      const a = this.automatons[i];
      if (time >= a.expireAt) {
        a.sprite.destroy();
        this.automatons.splice(i, 1);
        continue;
      }
      a.x += a.vx * (dt / 1000);
      a.y += a.vy * (dt / 1000);
      // Reflect off maze walls
      for (const wall of this.creatMazeWalls) {
        if (wall.owner !== a.owner) continue;
        const closestX = Math.max(wall.x - wall.w / 2, Math.min(a.x, wall.x + wall.w / 2));
        const closestY = Math.max(wall.y - wall.h / 2, Math.min(a.y, wall.y + wall.h / 2));
        const distSq = (a.x - closestX) ** 2 + (a.y - closestY) ** 2;
        if (distSq < 14 * 14) {
          // Reflect component that is overlapping
          if (Math.abs(a.x - closestX) < Math.abs(a.y - closestY)) a.vy *= -1; else a.vx *= -1;
          break;
        }
      }
      // Bounce off arena edges
      if (a.x < 20 || a.x > W - 20) { a.vx *= -1; a.x = Math.max(20, Math.min(W - 20, a.x)); }
      if (a.y < 20 || a.y > H - 20) { a.vy *= -1; a.y = Math.max(20, Math.min(H - 20, a.y)); }
      a.sprite.setPosition(a.x, a.y);
      // Contact damage
      const enemy = a.owner === 'player' ? this.npc : this.player;
      if (enemy && enemy.active && enemy.hp > 0 && time >= a.meleeCooldownUntil) {
        const ddx = a.x - enemy.x, ddy = a.y - enemy.y;
        if (ddx * ddx + ddy * ddy < 24 * 24) {
          a.meleeCooldownUntil = time + 500;
          enemy.takeDamage(12);
          this.spawnHitFlash(a.x, a.y, 0xcc55ff);
          this.showFloatingText(a.x, a.y - 16, '12', '#cc55ff');
        }
      }
    }
  }

  private startPurgePulse(): void {
    if (this.purgePulseTween) { this.purgePulseTween.stop(); this.purgePulseTween = null; }
    for (const bar of this.abilityBars) bar.fill.setFillStyle(0xff2222, 0.55);
    this.purgePulseTween = this.tweens.add({
      targets: this.abilityBars.map((b) => b.fill),
      alpha: 0.25, yoyo: true, repeat: -1, duration: 350,
    });
  }

  private stopPurgePulse(): void {
    if (this.purgePulseTween) { this.purgePulseTween.stop(); this.purgePulseTween = null; }
    for (const bar of this.abilityBars) {
      bar.fill.setAlpha(1);
      bar.fill.setFillStyle(bar.baseFillColor ?? 0x4466aa, 0.45);
    }
  }

  // ── Game over ────────────────────────────────────────────────────

  private hasUpgrade(slot: string): boolean {
    return this.activeUpgrades.includes(slot);
  }

  private hasP2Upgrade(slot: string): boolean {
    return this.p2ActiveUpgrades.includes(slot);
  }

  hasPerk(owner: 'player' | 'npc', perkId: string): boolean {
    return (owner === 'player' ? this.playerPerkId : this.npcPerkId) === perkId;
  }

  private endGame(playerWon: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;


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
      } else if (this.isInvasion) {
        PlayerData.addCorruptShards(this.invasionShardsEarned);
        this.scene.start('GameOverScene', {
          playerWon: false,
          difficulty: 0,
          mode: 'invasion',
          wavesCompleted: this.invasionWavesCompleted,
          corruptShardsEarned: this.invasionShardsEarned,
        });
      } else {
        this.scene.start('GameOverScene', {
          playerWon,
          difficulty: this.isPvP ? 0 : this.npcDifficulty.level,
          rewardMult: (!this.isPvP && playerWon) ? getTotalRewardMult() : undefined,
          isPvP: this.isPvP,
        });
      }
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

  private openPauseMenu(): void {
    if (this.gameEnded) return;
    if (this.scene.isPaused()) return;
    this.pausedAt = Date.now();
    this.scene.launch('PauseMenuScene', { parentSceneKey: this.scene.key });
    this.scene.pause();
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

  private addFrostStackTo(f: Fighter): void {
    if (this.playerBlackIceMorphActive) {
      f.voidFrostStacks = Math.min(5, f.voidFrostStacks + 1);
      f.incomingDamageMultiplier = this.frostDamageMultiplier(f.voidFrostStacks);
    } else {
      f.frostStacks = Math.min(5, f.frostStacks + 1);
      f.incomingDamageMultiplier = this.frostDamageMultiplier(f.frostStacks);
    }
  }

  private addFrostStack(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      if (this.playerBlackIceMorphActive) {
        // Black Ice Morph: add void frost instead of regular frost (no slow, but DOT)
        this.npc.voidFrostStacks = Math.min(5, this.npc.voidFrostStacks + 1);
        this.npc.incomingDamageMultiplier = this.frostDamageMultiplier(this.npc.voidFrostStacks);
      } else {
        this.npc.frostStacks = Math.min(5, this.npc.frostStacks + 1);
        this.npc.incomingDamageMultiplier = this.frostDamageMultiplier(this.npc.frostStacks);
      }
    } else {
      this.playerFrostStacks = Math.min(5, this.playerFrostStacks + 1);
      const baseMult = this.frostDamageMultiplier(this.playerFrostStacks);
      this.player.incomingDamageMultiplier = this.playerBlackIceMorphActive ? baseMult * 1.20 : baseMult;
    }
  }

  private clearFrostStacks(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      this.npc.frostStacks = 0;
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

  private spawnRinkConeTiles(ox: number, oy: number, angle: number, owner: 'player' | 'npc'): void {
    const half = Math.PI / 8;
    const steps = [0.15, 0.3, 0.45, 0.6, 0.72, 0.84, 0.92, 1.0];
    const offsets = [-0.6, -0.25, 0.25, 0.6];
    for (const t of steps) {
      const r = t * 1200;
      for (const ao of offsets) {
        const a = angle + ao * half;
        const tx = ox + Math.cos(a) * r;
        const ty = oy + Math.sin(a) * r;
        const spr = this.add.circle(tx, ty, 28, 0x55ddff, 0.4).setDepth(2)
          .setStrokeStyle(1, 0xaaffff, 0.7);
        this.tweens.add({ targets: spr, alpha: 0.1, duration: 7000, yoyo: false, repeat: 0 });
        this.icyTrails.push({ sprite: spr, expiresAt: this.time.now + 8000, x: tx, y: ty, radius: 28, frostTickAccum: 0, owner, rink: true });
      }
    }
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

      // Find closest enemy hit by the laser
      let closestEnemyDist = Infinity;
      let closestEnemy: Fighter | null = null;
      if (isFromPlayer) {
        for (const e of this.enemies) {
          if (!e.active || e.hp <= 0) continue;
          const tEnemy = this.rayCircleIntersect(ox, oy, dx, dy, e.x, e.y, ENEMY_R);
          if (tEnemy !== null && tEnemy > 2 && tEnemy < closestEnemyDist) {
            closestEnemyDist = tEnemy;
            closestEnemy = e;
          }
        }
      } else {
        closestEnemyDist = this.rayCircleIntersect(ox, oy, dx, dy, target.x, target.y, ENEMY_R) ?? Infinity;
        if (closestEnemyDist > 2) closestEnemy = target; else closestEnemyDist = Infinity;
      }
      if (closestEnemyDist !== Infinity && closestEnemyDist < minT) { minT = closestEnemyDist; hitType = 'enemy'; hitCrystal = null; hitPortal = null; }

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
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(mx, my, t.x, t.y) <= AOE_R) {
              t.takeDamage(8);
              this.spawnHitFlash(t.x, t.y, 0xffcc44);
            }
          }
          const exp = this.add.circle(mx, my, AOE_R * 0.15, 0xffcc44, 0.7).setDepth(9);
          this.tweens.add({ targets: exp, scaleX: AOE_R / (AOE_R * 0.15), scaleY: AOE_R / (AOE_R * 0.15), alpha: 0, duration: 280, onComplete: () => exp.destroy() });
        }
        nextSegFromMoving = false;
      }

      if (hitType === 'enemy') {
        const enemy = closestEnemy ?? target;
        enemy.takeDamage(dmg);
        this.spawnHitFlash(enemy.x, enemy.y, 0x88eeff);
        break;
      } else if (hitType === 'crystal' && hitCrystal) {
        dmg *= 2;
        this.tweens.add({ targets: hitCrystal.sprite, alpha: 1, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true });
        if (hitCrystal.isGateway) {
          // Gateway: pass through — keep direction, advance origin past the node
          ox = endX + dx * 3;
          oy = endY + dy * 3;
          lastBounced = hitCrystal;
          this.showFloatingText(endX, endY - 18, '+BOOST', '#aaeeff');
        } else {
          // Normal mirror: reflect direction off crystal surface normal
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
          if (hitCrystal.moving && isFromPlayer) nextSegFromMoving = true;
        }
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
    const voidOn = this.hasPerk(owner, 'void-shade');
    const radius = voidOn ? 43 : 36;
    const duration = voidOn ? 9000 : 6000;
    const spr = this.add.circle(x, y, radius, 0x330044, 0.55).setDepth(3);
    spr.setStrokeStyle(1, 0x8800cc, 0.5);
    this.tweens.add({ targets: spr, scaleX: 1.2, scaleY: 1.2, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 });
    this.shadowDarkClouds.push({ sprite: spr, expiresAt: this.time.now + duration, x, y, radius, tickAccum: 0, owner });
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
        const summonOwner = isPlayerOwned ? 'player' : 'npc';
        const wardHex = this.soulWardHexes.find((w) => w.owner === summonOwner &&
          Phaser.Math.Distance.Between(w.x, w.y, gs.sprite.x, gs.sprite.y) <= w.radius);
        gs.hp -= wardHex ? Math.ceil(proj.damage * 0.5) : proj.damage;
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
    // Automaton perk: spawn 3 wandering bots inside the maze
    if (this.hasPerk(owner, 'automaton')) this.spawnAutomatons(owner, 3);
  }

  private resolveCrucibleCraft(time: number, forceKey?: string, forceOwner?: 'player' | 'npc'): void {
    const tiers = forceKey ? [] : this.crucibleBolts.map((b) => b.tier).sort();
    const key = forceKey ?? tiers.map((t) => t[0]).join(''); // e.g. 'ccg', 'sss', 'ggg'
    const owner = forceOwner ?? this.creatCraftOwner;
    // Save last craft key for E+ Electro Bolt
    if (!forceKey) this.creatLastCraftKey = key;
    const caster = owner === 'player' ? this.player : this.npc;
    const cx = this.crucibleX, cy = this.crucibleY;
    const enemy = owner === 'player' ? this.getNearestEnemy(cx, cy) : this.player;
    const _craftEnemies = owner === 'player' ? this.enemies : [this.player];

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
        for (const en of _craftEnemies) {
          if (!en.active || en.hp <= 0) continue;
          if (Math.abs(en.x - bx) <= bw / 2 + 22 && Math.abs(en.y - by) <= bh / 2 + 22) {
            en.takeDamage(35);
            this.spawnHitFlash(en.x, en.y, 0xffdd22);
          }
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

  private updateLingeringBeams(time: number): void {
    for (let i = this.lingeringBeams.length - 1; i >= 0; i--) {
      const b = this.lingeringBeams[i];
      if (time > b.expiresAt) {
        b.gfx.destroy();
        this.lingeringBeams.splice(i, 1);
        continue;
      }
      // Fade as it ages
      const remaining = (b.expiresAt - time) / 5000;
      b.gfx.setAlpha(0.3 + remaining * 0.7);

      const targets = b.owner === 'player' ? this.enemies : [this.player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (this.pointToSegmentDist(t.x, t.y, b.x1, b.y1, b.x2, b.y2) <= 30) {
          const lastHit = (b.lastHitAt.get(t) ?? 0);
          if (time - lastHit >= 1000) {
            t.takeDamage(25);
            b.lastHitAt.set(t, time);
            this.spawnHitFlash(t.x, t.y, 0x88ccff);
            this.showFloatingText(t.x, t.y - 24, '⚡ Lingering!', '#88ccff');
          }
        }
      }
    }
  }

  // ── Hunt helpers ─────────────────────────────────────────────────

  private huntToggleBeastHud(toBeast: boolean): void {
    for (const o of this.huntNormalHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(!toBeast);
    for (const o of this.huntBeastHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(toBeast);
    this.abilityBars = toBeast ? this.huntBeastFills : this.huntNormalFills;
  }

  private huntToggleHybridHud(toHybrid: boolean): void {
    for (const o of this.huntNormalHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(!toHybrid);
    for (const o of this.huntHybridHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(toHybrid);
    this.abilityBars = toHybrid ? this.huntHybridFills : this.huntNormalFills;
  }

  private spawnHuntShrapnel(x: number, y: number, owner: 'player' | 'npc'): void {
    const COUNT = 10;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const shard = new Projectile(this, x, y, 'proj-hunt-shrapnel', 10, owner === 'player');
      this.projectiles.add(shard);
      shard.launch(Math.cos(angle) * 300, Math.sin(angle) * 300);
      if (owner === 'player') this.huntShrapnelSet.add(shard);
      const expireMs = Math.round((200 / 300) * 1000);
      this.time.delayedCall(expireMs, () => {
        if (shard.active) { shard.setActive(false).setVisible(false); (shard.body as Phaser.Physics.Arcade.Body).stop(); }
      });
    }
    const burst = this.add.circle(x, y, 12, 0xffcc66, 0.8).setDepth(9);
    this.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
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
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(x, y, t.x, t.y) <= radius) {
          t.takeDamage(dmg);
          this.spawnHitFlash(t.x, t.y, 0xff6600);
          if (this.huntBloodMoonActive && this.hasUpgrade('f')) this.player.heal(Math.ceil(dmg * 0.5));
          if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(dmg * 0.5));
        }
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
    if (!this.npc.bleedVisual) {
      this.npc.bleedVisual = this.add.circle(this.npc.x, this.npc.y, 26, 0xcc0000, 0.3)
        .setStrokeStyle(2, 0xff2222, 0.5).setDepth(3);
      this.tweens.add({ targets: this.npc.bleedVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
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
    pointer.updateWorldPoint(this.cameras.main);
    const mouseX = pointer.worldX;
    const mouseY = pointer.worldY;

    // ── P2 input (Local PvP) ─────────────────────────────────────
    if (this.isPvP) {
      this.p2PrevInput = this.p2Input;
      this.p2Input = this.readLocalP2Input();
    }

    // ── P2 aim reticle (Local PvP) ───────────────────────────────
    let p2TargetX = 0;
    let p2TargetY = 0;
    if (this.isPvP) {
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
    }
    this.p2LastAimX = p2TargetX;
    this.p2LastAimY = p2TargetY;

    // ── Channel expiry ────────────────────────────────────────────
    if (this.nukeChanneling && time >= this.nukeChannelEnd) { this.nukeChanneling = false; this.player.chargeRatio = 0; }
    if (this.npcNukeChanneling && time >= this.npcNukeChannelEnd) this.npcNukeChanneling = false;

    // Standard nuke charge bar (non-air-beam-walk)
    if (this.nukeChanneling && !this.airBeamWalking) {
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

    // ── Fire per-frame ────────────────────────────────────────────
    if (this.elementId === 'fire' || this.npcElement.id === 'fire') {
      this.fireKit.update(time, delta, this.elementId === 'fire', this.npcElement.id === 'fire');
    }

    // ── Electricity per-frame ─────────────────────────────────────
    if (this.elementId === 'electricity') {
      this.electricityKit.update(time, delta);
    }

    // ── Slime per-frame ───────────────────────────────────────────
    if (this.elementId === 'slime') {
      this.slimeKit.update(time, delta);
    }

    // ── Burning DOT (Flameshredder upgrade) ───────────────────────
    for (const t of this.enemies) {
      if (!t.active) continue;
      if (t.burningUntil > time) {
        if (!t.burnAura) {
          t.burnAura = this.add.circle(t.x, t.y, 26, 0xff4400, 0.3).setDepth(7);
        }
        t.burnAura.setPosition(t.x, t.y);
        t.burnTickAccum += delta;
        if (t.burnTickAccum >= 500) {
          t.burnTickAccum -= 500;
          t.takeDamage(1); this.spawnHitFlash(t.x, t.y, 0xff4400);
        }
      } else {
        t.burnTickAccum = 0;
        if (t.burnAura) { t.burnAura.destroy(); t.burnAura = null; }
      }
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
        this.player.applySelfDamage(1); this.spawnHitFlash(this.player.x, this.player.y, 0xff4400);
      }
    } else {
      this.playerBurnTickAccum = 0;
      if (this.playerBurnAura) { this.playerBurnAura.destroy(); this.playerBurnAura = null; }
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
      this.playerSpeedMult = this.fireKit.isFlameBodyActive() ? 2 : 1;
    } else if (this.elementId === 'hunt') {
      if (this.huntBeastForm) this.playerSpeedMult = 1.5;
      else if (this.huntHybridForm) {
        this.playerSpeedMult = 1.25;
        if (time < this.huntHybridLeapBoostUntil) this.playerSpeedMult *= 1.3;
      } else this.playerSpeedMult = 1;
    } else if (this.elementId === 'silence') {
      this.playerSpeedMult = 1;
      // Kit applies enrage speed boost and watch-channel freeze via applyPlayerSpeedMult
    } else if (this.elementId === 'sand') {
      this.playerSpeedMult = 1;
    } else if (this.elementId === 'earth') {
      this.playerSpeedMult = 1;
      if (this.earthRepairActive) this.playerSpeedMult *= 0.2;
      if (this.earthGolemFused && this.earthGolemFusedRepairHolding) this.playerSpeedMult *= 0.2;
      if (this.hasPerk('player', 'obsidian')) this.playerSpeedMult *= 0.85;
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
    } else if (this.elementId === 'slime') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      const slimes = this.slimeKit.getSlimes();
      const boostCount = slimes.filter(
        s => s.state !== 'deployed' && s.state !== 'flying-out' && s.state !== 'flying-back',
      ).length;
      this.playerSpeedMult *= 1 + 0.1 * boostCount;
      if (slimes.some(s => s.state === 'shield-active' && s.variant === 'volatile')) {
        this.playerSpeedMult *= 1.25;
      }
      if (time < this.slimeKit.getSpeedBoostUntil()) this.playerSpeedMult *= 1.5;
    } else if (this.elementId === 'fate') {
      this.playerSpeedMult = this.playerFateBaseSpeedMult;
    } else if (this.elementId === 'light') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      if (time < this.lightKit.getPhotoAccelUntil()) {
        const t = Math.min(1, (time - this.lightKit.getPhotoAccelStart()) / 5000);
        const peakT = Math.min(t / 0.9, 1);
        this.playerSpeedMult *= 1.15 + (2.0 - 1.15) * peakT;
      }
      if (time < this.lightKit.getPhotonSpeedBoostUntil()) this.playerSpeedMult *= 3;
      if (this.lightKit.isAngelActive()) this.playerSpeedMult *= this.lightKit.getAngelSpeedMult();
      if (time < this.lightKit.getSkewerModeUntil()) this.playerSpeedMult *= 1.15;
    } else if (this.elementId === 'echo') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      this.playerSpeedMult *= this.echoKit.getPlayerSpeedMult();
    } else if (this.elementId === 'oil') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      this.playerSpeedMult *= this.oilKit.getPlayerSpeedMult();
    } else if (this.elementId === 'sound') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      if (time < this.soundKit.getCrescendoSpeedUntil()) this.playerSpeedMult *= (1 + this.soundKit.getCrescendoSpeedBonus());
      if (time < this.soundKit.getComposeSpeedUntil()) this.playerSpeedMult *= (1 + this.soundKit.getComposeSpeedBonus());
    } else if (this.elementId === 'quantum') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      this.playerSpeedMult *= this.quantumElementKit.getPlayerSpeedMult();
    } else {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
    }

    this.npcSpeedMult = 1;
    if (this.fireKit.isNpcFlameBodyActive()) this.npcSpeedMult = 2;
    else if (time < this.npcGeyserBuffUntil) this.npcSpeedMult = 1.5;
    // (Time element NPC has no speed buff of its own)

    // Oil puddle slows — managed by OilKit
    if (this.elementId === 'oil' || this.npcElement.id === 'oil') {
      this.npcSpeedMult *= this.oilKit.getNpcSpeedMult();
    }
    // Echo NPC speed (bat form, attach)
    if (this.npcElement.id === 'echo') {
      this.npcSpeedMult *= this.echoKit.getNpcSpeedMult();
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
    if (this.npc.frostStacks > 0) this.npcSpeedMult *= (1 - this.npc.frostStacks * 0.1);
    if (this.npcBlockUpActive) this.npcSpeedMult *= 0.5;
    // Ice frost slow on player
    if (this.playerFrostStacks > 0) {
      this.playerSpeedMult *= (1 - this.playerFrostStacks * 0.1);
    }
    if (this.playerBlockUpActive) this.playerSpeedMult *= 0.5;
    // Ice F+: speed boost from stepping on own skate trail
    if (this.elementId === 'ice' && this.playerIceSpeedBoostUntil > time) this.playerSpeedMult *= 1.2;
    // Rink perk: +25% on own trail, extra +25% after Skate
    if (this.hasPerk('player', 'rink') && this.icyTrails.some((t) => t.owner === 'player' && Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) <= t.radius)) {
      this.playerSpeedMult *= 1.25;
      if (this.playerSkateRecentUntil > time) this.playerSpeedMult *= 1.25;
    }

    // Hunt trail boost on player
    if (this.elementId === 'hunt') {
      const onTrail = this.huntTrailCircles.some(
        (c) => Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) <= 30,
      );
      if (onTrail) {
        this.playerSpeedMult *= 1.5;
        if (this.hasPerk('player', 'rage')) {
          this.playerHuntRage = Math.min(100, this.playerHuntRage + 10 * (delta / 1000));
        }
      }
      // NPC blood hunt slow on player
      if (time < this.playerHuntSlowUntil) this.playerSpeedMult *= 0.5;
    }
    // Rage perk: trigger forced beast form at 100 rage
    if (this.hasPerk('player', 'rage') && this.playerHuntRage >= 100 && !this.huntBeastForm && !this.huntHybridForm) {
      this.playerHuntRage = 0;
      this.playerHuntRageTriggeredBeast = true;
      this.huntBeastForm = true;
      this.player.setScale(1.2);
      (this.player.body as Phaser.Physics.Arcade.Body).setCircle(26, 3, 3);
      this.player.incomingDamageMultiplier = 0.5;
      this.player.setTint(0xccccee);
      const burst = this.add.circle(this.player.x, this.player.y, 20, 0xcc2233, 0.8).setDepth(8);
      this.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
      this.showFloatingText(this.player.x, this.player.y - 30, '🩸 RAGE', '#cc2233');
    }
    if (this.hasPerk('player', 'rage') && this.huntBeastForm && this.playerHuntRageTriggeredBeast) {
      this.player.incomingDamageMultiplier = 0.5;
    }
    // NPC hunt speed adjustments
    if (this.npc.element.id === 'hunt' && this.npcHuntBeastForm) this.npcSpeedMult = Math.max(this.npcSpeedMult, 1.5);
    if (!this.isInvasion && time < this.npcHuntSlowUntil) this.npcSpeedMult *= 0.5;
    // Silence slasher dread aura: kit applies via applyNpcSpeedMult / applyPlayerSpeedMult in update()
    // Slime level 3 slow (15%) on NPC
    if (!this.isInvasion && this.elementId === 'slime' && time < this.slimeKit.getNpcSlimeSlowUntil()) this.npcSpeedMult *= 0.85;
    // Magic storm cloud slow + upgrade speed effects
    if (this.elementId === 'magic' || this.npcElement.id === 'magic') {
      this.playerSpeedMult *= this.magicKit.getPlayerSlowMult();
      this.npcSpeedMult *= this.magicKit.getNpcSlowMult();
      if (this.elementId === 'magic') {
        this.playerSpeedMult *= this.magicKit.getPlayerSpeedBoostMult();
        this.playerSpeedMult *= this.magicKit.getPlayerMeditateSlowMult();
        this.npcSpeedMult *= this.magicKit.getNpcDark80SlowMult();
      }
    }
    // Growth Cough aura slow (PvP/AI only — invasion handled in updateInvasion)
    if (!this.isInvasion && this.elementId === 'growth' && this.growthCoughStacks > 0) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 120) {
        this.npcSpeedMult *= Math.max(0.1, 1 - this.growthCoughStacks * 0.05);
      }
    }
    // Rink perk: NPC +25% on own trail, extra +25% after Skate
    if (this.hasPerk('npc', 'rink') && this.icyTrails.some((t) => t.owner === 'npc' && Phaser.Math.Distance.Between(this.npc.x, this.npc.y, t.x, t.y) <= t.radius)) {
      this.npcSpeedMult *= 1.25;
      if (this.npcSkateRecentUntil > time) this.npcSpeedMult *= 1.25;
    }

    // NPC trail boost
    if (this.npc.element.id === 'hunt') {
      const npcOnTrail = this.npcHuntTrailCircles.some(
        (c) => Phaser.Math.Distance.Between(this.npc.x, this.npc.y, c.x, c.y) <= 30,
      );
      if (npcOnTrail) this.npcSpeedMult *= 1.5;
    }

    // Technology stacking bonuses and abuse speed penalty
    if (this.elementId === 'technology') {
      this.playerSpeedMult *= 1 + this.techKit.getPlayerTechSpeedBonus();
      // Randomize.Exe phase 2: invis + speed
      if (this.techKit.getPlayerOpSelfPhase() === 2) this.playerSpeedMult *= 1.25;
      // Delete.Area standing bonus
      if (this.techKit.getPlayerOnOwnDeleteArea()) this.playerSpeedMult *= 1.25;
      // Abuse speed penalty
      const pa = this.techKit.getPlayerAbuse();
      if (pa >= 100) this.playerSpeedMult *= 0.70;
      else if (pa >= 70) this.playerSpeedMult *= 0.85;
      else if (pa >= 40) this.playerSpeedMult *= 0.95;
      // Domain Bias speed boost for player
      if (this.techKit.isTechDomainActive() && this.techKit.getTechDomainBias() > 0) this.playerSpeedMult *= (1 + this.techKit.getTechDomainBias() / 100 * 0.5);
    }
    if (this.npcElement.id === 'technology') {
      this.npcSpeedMult *= 1 + this.techKit.getNpcTechSpeedBonus();
      if (this.techKit.getNpcOpSelfPhase() === 2) this.npcSpeedMult *= 1.25;
      if (this.techKit.getNpcOnOwnDeleteArea()) this.npcSpeedMult *= 1.25;
      const na = this.techKit.getNpcAbuse();
      if (na >= 100) this.npcSpeedMult *= 0.70;
      else if (na >= 70) this.npcSpeedMult *= 0.85;
      else if (na >= 40) this.npcSpeedMult *= 0.95;
      // Domain Bias speed boost for NPC
      if (this.techKit.isTechDomainActive() && this.techKit.getTechDomainBias() > 0) this.npcSpeedMult *= (1 + this.techKit.getTechDomainBias() / 100 * 0.5);
    }

    // ── Player movement ─────────────────────────────────────────
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.elementId === 'rubber' && this.rubberKit.isSlingActive() && !this.isDodging) {
      this.rubberKit.applySlingMovement(mouseX, mouseY);
    } else if (this.nukeChanneling && !this.airBeamWalking) {
      // Standard nuke: fully locked
      playerBody.setVelocity(0, 0);
    } else if (time < this.silencePlayerYankUntil) {
      // NPC silence yank in progress — keep yank velocity, block WASD override
    } else if (!this.isDodging) {
      let vx = 0;
      let vy = 0;
      if (this.aKey.isDown) vx -= this.player.speed;
      if (this.dKey.isDown) vx += this.player.speed;
      if (this.wKey.isDown) vy -= this.player.speed;
      if (this.sKey.isDown) vy += this.player.speed;

      if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

      let moveMult = this.playerSpeedMult * this.gauntletSpeedMult;
      if (this.fireKit.isPressureCharging()) moveMult *= 0.75;    // Pressure Charge: 75% speed

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

    // ── Magic thorn bind / prison (NPC cast) ─────────────────────
    if ((this.elementId === 'magic' || this.npcElement.id === 'magic') && this.magicKit.isPlayerBound(time) && !this.isDodging) {
      playerBody.setVelocity(0, 0);
    }

    // ── Metal taser stun ─────────────────────────────────────────
    if (this.playerMetalTaseredUntil > time && !this.isDodging) {
      playerBody.setVelocity(0, 0);
    }

    // ── Soul haunt stun ────────────────────────────────────────────
    if (this.elementId === 'soul' && time < this.soulHauntStunUntil && !this.isDodging) {
      playerBody.setVelocity(0, 0);
    }

    // ── Slime sulpher spring confusion (player) ───────────────────
    if (this.elementId === 'slime' && time < this.slimeKit.getPlayerConfusedUntil() && !this.isDodging) {
      if (time > this.slimeKit.getPlayerConfuseDirUntil()) {
        const a = Math.random() * Math.PI * 2;
        this.slimeKit.setPlayerConfuseVx(Math.cos(a) * this.player.speed);
        this.slimeKit.setPlayerConfuseVy(Math.sin(a) * this.player.speed);
        this.slimeKit.setPlayerConfuseDirUntil(time + 450);
      }
      playerBody.setVelocity(
        this.slimeKit.getPlayerConfuseVx() * this.playerSpeedMult * this.gauntletSpeedMult,
        this.slimeKit.getPlayerConfuseVy() * this.playerSpeedMult * this.gauntletSpeedMult,
      );
    }

    // ── P2 movement (PvP) ─────────────────────────────────────────
    if (this.isPvP) {
      const npcBody = this.npc.body as Phaser.Physics.Arcade.Body;
      if (!this.p2IsDodging && !(this.npc.frozenUntil > time) && !(this.npcNukeChanneling && !this.npcAirBeamWalking)) {
        let nvx = 0, nvy = 0;
        if (this.p2Input.left)  nvx -= this.npc.speed;
        if (this.p2Input.right) nvx += this.npc.speed;
        if (this.p2Input.up)    nvy -= this.npc.speed;
        if (this.p2Input.down)  nvy += this.npc.speed;
        if (nvx !== 0 && nvy !== 0) { nvx *= 0.7071; nvy *= 0.7071; }
        npcBody.setVelocity(nvx * this.npcSpeedMult, nvy * this.npcSpeedMult);
      } else if (this.npc.frozenUntil > time && !this.p2IsDodging) {
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    }

    // ── Player abilities ─────────────────────────────────────────
    const playerCtx = this.buildPlayerContext(mouseX, mouseY);

    if (this.elementId === 'fire') {
      this.fireKit.handleInput(time, delta, pointer, mouseX, mouseY);

    } else if (this.elementId === 'electricity') {
      this.electricityKit.handleInput(time, delta, mouseX, mouseY, pointer);

    } else if (this.elementId === 'slime') {
      this.slimeKit.handleInput(time, pointer, mouseX, mouseY);

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
      if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
        this.player.castAbility('pain-rain', playerCtx);
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
          if (this.hasPerk('player', 'mycology')) {
            this.fireMycologyProjectiles('player', 'heal');
          } else {
            this.player.castAbility('grow', playerCtx);
          }
        }
        this.lifeRPrevDown = rDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          if (this.hasPerk('player', 'mycology')) {
            this.fireMycologyProjectiles('player', 'heal');
          } else {
            this.player.castAbility('grow', playerCtx);
          }
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
          if (this.hasPerk('player', 'mycology')) {
            this.fireMycologyProjectiles('player', 'damage');
          } else {
            this.player.castAbility('thorns', playerCtx);
          }
        }
        this.lifeFPrevDown = fDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          if (this.hasPerk('player', 'mycology')) {
            this.fireMycologyProjectiles('player', 'damage');
          } else {
            this.player.castAbility('thorns', playerCtx);
          }
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
          this.player.chargeRatio = Math.min(1, (time - this.lifeQHoldStart) / 3000);
          if (time - this.lifeQHoldStart >= 3000) {
            this.lifeQHolding = false;
            if (this.lifeQChargeVisual) { this.lifeQChargeVisual.destroy(); this.lifeQChargeVisual = null; }
            this.player.chargeRatio = 0;
            this.beginTreeOfLife('player');
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

    } else if (this.elementId === 'fate') {
      this.fateKit.handleInput(time, pointer, mouseX, mouseY);
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) this.fateKit.onEKey(mouseX, mouseY);
      if (Phaser.Input.Keyboard.JustDown(this.rKey)) this.fateKit.onRKey();

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

        // ── E: Quick Shot / Electro Charge (upgrade: instant charge on press) ───
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          if (this.hasUpgrade('e')) {
            // Upgrade: pressing E immediately readies the powerful electro shot
            this.airElectroCharged = true;
            if (this.airElectroChargeVisual) this.airElectroChargeVisual.destroy();
            this.airElectroChargeVisual = this.add.circle(this.player.x, this.player.y, 18, 0xffee44, 0.75).setDepth(8);
            this.tweens.add({ targets: this.airElectroChargeVisual, alpha: 0.2, yoyo: true, repeat: -1, duration: 280 });
            const pulse = this.add.circle(this.player.x, this.player.y, 14, 0xffee44, 0.6).setDepth(8);
            this.tweens.add({ targets: pulse, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 300, onComplete: () => pulse.destroy() });
          } else {
            this.player.castAbility('quick-shot', playerCtx);
          }
        }
        if (this.airElectroCharged && this.airElectroChargeVisual) {
          this.airElectroChargeVisual.setPosition(this.player.x, this.player.y);
        }

        // ── R: Wind Trap ──────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('wind-trap', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── F: Grapple ────────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('grapple', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── Q: Charged Beam (upgrade: lingering 5s beam) ─────────
        if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.airConsecutiveHits >= 3) {
          if (this.hasUpgrade('q')) {
            if (this.player.getCooldownRatio('charged-beam') >= 1) {
              this.player.triggerCooldown('charged-beam');
              this.airConsecutiveHits = 0;
              this.nukeChanneling = true;
              this.airBeamWalking = true;
              this.nukeChannelEnd = time + 1500;
              const capX = mouseX, capY = mouseY;
              const capPX = this.player.x, capPY = this.player.y;
              const chargeVis = this.add.circle(this.player.x, this.player.y, 14, 0x88ccff, 0.8).setDepth(8);
              this.tweens.add({ targets: chargeVis, scaleX: 5, scaleY: 5, alpha: 0.1, duration: 1500, onComplete: () => chargeVis.destroy() });
              this.time.delayedCall(1500, () => {
                this.airBeamWalking = false;
                this.nukeChanneling = false;
                this.player.chargeRatio = 0;
                // Fire straight hitscan (100 dmg initial)
                const ctx = this.buildPlayerContext(capX, capY);
                fireHitscan(ctx, 100, 0x88ccff, false);
                // Compute beam endpoint (direction from player to cursor, extended to screen edge)
                const dx2 = capX - capPX;
                const dy2 = capY - capPY;
                const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                const endX = capPX + (dx2 / len2) * 900;
                const endY = capPY + (dy2 / len2) * 900;
                const beamGfx = this.add.graphics().setDepth(8);
                beamGfx.lineStyle(4, 0x88ccff, 0.7);
                beamGfx.beginPath();
                beamGfx.moveTo(capPX, capPY);
                beamGfx.lineTo(endX, endY);
                beamGfx.strokePath();
                this.lingeringBeams.push({
                  gfx: beamGfx,
                  x1: capPX, y1: capPY,
                  x2: endX, y2: endY,
                  expiresAt: this.time.now + 5000,
                  owner: 'player',
                  lastHitAt: new Map(),
                });
              });
            }
          } else {
            if (this.player.castAbility('charged-beam', this.buildPlayerContext(mouseX, mouseY))) {
              this.airConsecutiveHits = 0;
            }
          }
        }
      }
    } else if (this.elementId === 'sound') {
      this.soundKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'magnet') {
      this.magnetKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'metal') {
      this.handleMetalInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'plasma') {
      this.handlePlasmaInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'death') {
      this.deathKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'void') {
      this.voidKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'rubber') {
      this.rubberKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'magic') {
      this.magicKit.handleInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'technology') {
      this.techKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'echo') {
      this.echoKit.handleInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'quantum') {
      this.quantumElementKit.handleInput(time, delta, pointer);
    } else if (this.elementId === 'earth') {
      this.handleEarthInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'light') {
      this.lightKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'oil') {
      this.oilKit.handleInput(time, delta, pointer, mouseX, mouseY);
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
      if (!this.huntBeastForm && !this.huntHybridForm) {
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
          if (this.npc.bleeding) this.player.castAbility('hunt-blood-hunt', playerCtx);
        }
        // F: Blood Moon (F+ = 50% lifesteal)
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('hunt-blood-moon', playerCtx);
        }
        // Q: Untransform — with Q+ upgrade, a fast second press enters Hybrid Form
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          const withinWindow = time - this.huntBeastEnteredAt <= 400;
          if (this.hasUpgrade('q') && withinWindow) {
            this.huntBeastForm = false;
            this.huntHybridForm = true;
            this.player.setTexture('elem-hunt-hybrid');
            this.player.setScale(1.1);
            (this.player.body as Phaser.Physics.Arcade.Body).setCircle(24, 2, 2);
            this.player.incomingDamageMultiplier = 1.0;
            this.huntToggleBeastHud(false);
            this.huntToggleHybridHud(true);
            this.showFloatingText(this.player.x, this.player.y - 24, '🐺 Hybrid Form', '#ff8844');
          } else {
            this.player.castAbility('hunt-untransform', playerCtx);
          }
        }
      } else if (this.huntHybridForm) {
        // ── Hybrid form (Q+ upgrade, double-tap) ────────────────
        // Click: Monster Hunter (6 silver bullets)
        if (pointer.isDown && !this.pointerWasDown) {
          if (this.player.castAbility('hunt-hybrid-shotgun', playerCtx)) {
            if (this.hasUpgrade('click')) {
              const ab = this.playerElement.abilities.find((a) => a.id === 'hunt-hybrid-shotgun')!;
              ab.cast(playerCtx);
              this.player.reduceCooldown('hunt-hybrid-shotgun', -300);
              this.showFloatingText(this.player.x, this.player.y - 30, '×2!', '#dddddd');
            }
          }
        }
        // E: Grenade Leap — hold/release (mirrors normal-form grenade logic)
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          if (this.player.getCooldownRatio('hunt-hybrid-grenade-leap') >= 1) {
            this.player.triggerCooldown('hunt-hybrid-grenade-leap');
            this.huntGrenadeHoldStart = time;
            this.huntGrenadeHolding = true;
            if (this.huntGrenadeVisual) this.huntGrenadeVisual.destroy();
            const isHealNow = this.hasUpgrade('f') && this.huntBloodPactActive && time < this.huntBloodPactEnd;
            this.huntGrenadeVisual = this.add.circle(this.player.x, this.player.y, 10, isHealNow ? 0x44cc44 : 0xff6600, 0.9).setDepth(12);
          }
        }
        const hybridMaxFuse = this.hasUpgrade('e') ? 1500 : 3000;
        if (!this.eKey.isDown && this.huntGrenadeHolding) {
          const holdMs = time - this.huntGrenadeHoldStart;
          if (holdMs < hybridMaxFuse) {
            // Tag this grenade as a leap grenade
            const isHealNow2 = this.hasUpgrade('f') && this.huntBloodPactActive && time < this.huntBloodPactEnd;
            const dx = mouseX - this.player.x, dy = mouseY - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 500;
            const ox = this.player.x, oy = this.player.y;
            const fuseDur = hybridMaxFuse;
            const spr = this.add.circle(ox, oy, 10, isHealNow2 ? 0x44cc44 : 0xff6600, 0.9)
              .setStrokeStyle(2, isHealNow2 ? 0x88ff88 : 0xffaa00, 1).setDepth(8);
            this.huntGrenades.push({
              sprite: spr, x: ox, y: oy, startX: ox, startY: oy,
              vx: (dx / dist) * speed, vy: (dy / dist) * speed,
              explodeAt: this.time.now + (fuseDur - Math.min(holdMs, fuseDur - 100)),
              selfDamage: false, owner: 'player', stopped: false,
              isHealGrenade: isHealNow2, isLeap: true,
            });
          }
          this.huntGrenadeHolding = false;
          if (this.huntGrenadeVisual) { this.huntGrenadeVisual.destroy(); this.huntGrenadeVisual = null; }
        }
        // R: Beast Instinct (R+ = same permanent-trail toggle as normal form)
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          if (this.hasUpgrade('r') && this.huntTrailActive && !this.huntPermTrailActive) {
            this.huntPermTrailActive = true;
            this.huntTrailActive = false;
            for (const c of this.huntTrailCircles) c.expiresAt = Infinity;
            this.showFloatingText(this.player.x, this.player.y - 30, '🐾 Frozen!', '#ff6600');
          } else if (this.hasUpgrade('r') && this.huntPermTrailActive) {
            this.huntPermTrailActive = false;
            for (const c of this.huntTrailCircles) c.sprite.destroy();
            this.huntTrailCircles = [];
            this.showFloatingText(this.player.x, this.player.y - 30, 'Trail cleared', '#cc3300');
          } else {
            this.player.castAbility('hunt-hybrid-instinct', playerCtx);
          }
        }
        // F: Shriek
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('hunt-hybrid-shriek', playerCtx);
        }
        // Q: Exhausted Return (35s CD via huntUntransform hybrid branch)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('hunt-hybrid-untransform', playerCtx);
        }
      }
    } else if (this.elementId === 'silence') {
      this.silenceKit.handleInput(time, pointer, mouseX, mouseY);
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
    this.rightPointerWasDown = pointer.rightButtonDown();

    // ── Player water world effects ────────────────────────────────
    if (this.elementId === 'water') {
      if (time < this.splashActiveUntil) {
        this.splashDropAccum += delta;
        if (this.splashDropAccum >= 150) {
          this.splashDropAccum -= 150;
          this.splashDropCount++;
          const isFinal = this.hasUpgrade('e') && (time + 150 >= this.splashActiveUntil);
          if (this.hasPerk('player', 'stalagmite')) {
            const isLava = isFinal;
            const spRadius = isLava ? 54 : 36;
            const spColor = isLava ? 0xff6600 : 0x55ddff;
            const gfxStal = this.add.graphics().setDepth(3);
            gfxStal.fillStyle(spColor, isLava ? 0.8 : 0.7);
            gfxStal.fillTriangle(mouseX, mouseY - spRadius * 0.8, mouseX - spRadius * 0.45, mouseY + spRadius * 0.4, mouseX + spRadius * 0.45, mouseY + spRadius * 0.4);
            const stalDur = isLava ? 8000 : 3000;
            this.puddles.push({ sprite: gfxStal as unknown as Phaser.GameObjects.Arc, expiresAt: time + stalDur, x: mouseX, y: mouseY, radius: spRadius, tickAccum: 0, owner: 'player', kind: 'stalagmite', lavaFinal: isLava });
            // One-time AOE hit on spawn
            const stalImpactDmg = isLava ? 14 : 8;
            for (const enemy of this.enemies) {
              if (!enemy.active || enemy.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(mouseX, mouseY, enemy.x, enemy.y) <= spRadius * 0.8) {
                enemy.takeDamage(stalImpactDmg);
                this.spawnHitFlash(enemy.x, enemy.y, spColor);
              }
            }
            if (isLava) this.showFloatingText(mouseX, mouseY - 20, '🌋 STALAGMITE', '#ff6600');
            else this.showFloatingText(mouseX, mouseY - 20, '⛰️ STALAGMITE', '#55ddff');
          } else {
            const puddleRadius = isFinal ? 54 : 36;
            const puddleAlpha = isFinal ? 0.7 : 0.5;
            const puddleDuration = isFinal ? 5000 : 1000;
            const spr = this.add.circle(mouseX, mouseY, puddleRadius, 0x0066bb, puddleAlpha).setDepth(2);
            this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, alpha: 0.25, duration: 800 });
            this.puddles.push({ sprite: spr, expiresAt: time + puddleDuration, x: mouseX, y: mouseY, radius: puddleRadius, tickAccum: 0, owner: 'player' });
          }
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
      if (p.kind === 'stalagmite') {
        // Stalagmite: check for own water click projectile passing through
        for (const go of (this.projectiles.getChildren() as Projectile[])) {
          if (!go.active) continue;
          const projIsOwn = p.owner === 'player' ? go.isFromPlayer : !go.isFromPlayer;
          if (!projIsOwn || go.texture.key !== 'proj-water') continue;
          if (Phaser.Math.Distance.Between(go.x, go.y, p.x, p.y) <= p.radius * 0.6) {
            const pb2 = go.body as Phaser.Physics.Arcade.Body;
            const vx2 = pb2.velocity.x, vy2 = pb2.velocity.y;
            const vlen = Math.hypot(vx2, vy2) || 1;
            go.setActive(false).setVisible(false);
            pb2.stop();
            const launchDmg = p.lavaFinal ? 22 : 14;
            const projTex = p.lavaFinal ? 'perk-stalagmite-lava' : 'perk-stalagmite';
            const lProj = new Projectile(this, p.x, p.y, projTex, launchDmg, p.owner === 'player');
            this.projectiles.add(lProj);
            lProj.launch((vx2 / vlen) * 500, (vy2 / vlen) * 500);
            p.sprite.destroy();
            this.puddles.splice(i, 1);
            this.showFloatingText(p.x, p.y - 20, '⛰️ LAUNCH!', p.lavaFinal ? '#ff6600' : '#55ddff');
            break;
          }
        }
        continue; // skip normal slow/DoT
      }
      const _puddleTargets = (p.owner === 'player' ? this.enemies : [this.player])
        .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= p.radius);
      if (_puddleTargets.length > 0) {
        p.tickAccum += delta;
        if (p.tickAccum >= 250) {
          p.tickAccum -= 250;
          const dmg = p.kind === 'poison' ? 4 : 2;
          const flashColor = p.kind === 'poison' ? 0x66cc22 : 0x0099ff;
          for (const target of _puddleTargets) {
            target.takeDamage(dmg); this.spawnHitFlash(target.x, target.y, flashColor);
          }
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

      // Thorn plant: fire petal at nearest enemy every 1 second
      if (p.type === 'thorn') {
        p.accum += delta;
        if (p.accum >= 1000) {
          p.accum -= 1000;
          const thornTarget = this.getNearestEnemy(p.x, p.y);
          const dx = thornTarget.x - p.x;
          const dy = thornTarget.y - p.y;
          const dist2 = Math.sqrt(dx * dx + dy * dy) || 1;
          const thornProj = new Projectile(this, p.x, p.y, 'proj-life', 8, true);
          this.projectiles.add(thornProj);
          thornProj.launch((dx / dist2) * 480, (dy / dist2) * 480);
        }
      }

      // Mycology: parent mushroom spawns mini-mushrooms every 2s
      if (p.type === 'mushroom' || p.type === 'heal-mushroom' || p.type === 'poison-mushroom') {
        if (p.miniSpawnAccum === undefined) p.miniSpawnAccum = 0;
        p.miniSpawnAccum! += delta;
        if (p.miniSpawnAccum! >= 2000) {
          p.miniSpawnAccum! -= 2000;
          const miniCap = this.hasUpgrade('e') ? 5 : 3;
          const myMinis = this.playerPlants.filter((m) => m.parentId === p.plantId);
          if (myMinis.length < miniCap) {
            const angle = Math.random() * Math.PI * 2;
            const offset = 45 + Math.random() * 35;
            const mx2 = p.x + Math.cos(angle) * offset;
            const my2 = p.y + Math.sin(angle) * offset;
            const miniPid = ++this.plantIdCounter;
            const miniBaseHp = p.type === 'heal-mushroom' || p.type === 'poison-mushroom' ? 30 : 15;
            const miniSpr = this.add.circle(mx2, my2, 14, 0xaa66dd, 0.55).setDepth(2);
            const miniLabel = this.add.text(mx2, my2, '🍄', { fontSize: '13px' }).setOrigin(0.5).setDepth(3);
            const miniHb = new HealthBar(this, miniBaseHp);
            this.playerPlants.push({ sprite: miniSpr, label: miniLabel, healthBar: miniHb, expiresAt: Infinity, x: mx2, y: my2, radius: 60, hp: miniBaseHp, maxHp: miniBaseHp, owner: 'player', type: 'mini-mushroom', accum: 0, plantId: miniPid, parentId: p.plantId });
          }
        }
      }

      // Mycology: heal-mushroom AOE heals player every 2s
      if (p.type === 'heal-mushroom') {
        p.accum += delta;
        if (p.accum >= 2000) {
          p.accum -= 2000;
          const ring = this.add.circle(p.x, p.y, 8, 0xaaffaa, 0.65).setDepth(5);
          this.tweens.add({ targets: ring, scaleX: 14, scaleY: 14, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) <= 100) {
            this.player.heal(10);
            this.showFloatingText(this.player.x, this.player.y - 20, '+10 🍄', '#aaffaa');
          }
        }
      }

      // Mycology: poison-mushroom AOE damages enemies every 2s
      if (p.type === 'poison-mushroom') {
        p.accum += delta;
        if (p.accum >= 2000) {
          p.accum -= 2000;
          const ring = this.add.circle(p.x, p.y, 8, 0x44aa22, 0.65).setDepth(5);
          this.tweens.add({ targets: ring, scaleX: 14, scaleY: 14, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
          for (const enemy of this.enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y) <= 100) {
              enemy.takeDamage(10);
              this.spawnHitFlash(enemy.x, enemy.y, 0x44aa22);
              this.showFloatingText(enemy.x, enemy.y - 20, '🍄 -10', '#44aa22');
            }
          }
        }
      }

      // NPC projectiles damage player plants (heal projectiles pass through)
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.isFromPlayer || proj.isHeal) continue;
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

      // Mycology NPC: parent mushroom spawns mini-mushrooms every 2s
      if (p.type === 'mushroom' || p.type === 'heal-mushroom' || p.type === 'poison-mushroom') {
        if (p.miniSpawnAccum === undefined) p.miniSpawnAccum = 0;
        p.miniSpawnAccum! += delta;
        if (p.miniSpawnAccum! >= 2000) {
          p.miniSpawnAccum! -= 2000;
          const miniCap = 3;
          const myMinis = this.npcPlants.filter((m) => m.parentId === p.plantId);
          if (myMinis.length < miniCap) {
            const angle = Math.random() * Math.PI * 2;
            const offset = 45 + Math.random() * 35;
            const mx2 = p.x + Math.cos(angle) * offset;
            const my2 = p.y + Math.sin(angle) * offset;
            const miniPid = ++this.plantIdCounter;
            const miniBaseHp = 15;
            const miniSpr = this.add.circle(mx2, my2, 14, 0xaa66dd, 0.55).setDepth(2);
            const miniLabel = this.add.text(mx2, my2, '🍄', { fontSize: '13px' }).setOrigin(0.5).setDepth(3);
            const miniHb = new HealthBar(this, miniBaseHp);
            this.npcPlants.push({ sprite: miniSpr, label: miniLabel, healthBar: miniHb, expiresAt: Infinity, x: mx2, y: my2, radius: 60, hp: miniBaseHp, maxHp: miniBaseHp, owner: 'npc', type: 'mini-mushroom', accum: 0, plantId: miniPid, parentId: p.plantId });
          }
        }
      }

      // Mycology NPC: heal-mushroom AOE every 2s
      if (p.type === 'heal-mushroom') {
        p.accum += delta;
        if (p.accum >= 2000) {
          p.accum -= 2000;
          if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, p.x, p.y) <= 100) {
            this.npc.heal(10);
          }
        }
      }

      // Mycology NPC: poison-mushroom AOE every 2s
      if (p.type === 'poison-mushroom') {
        p.accum += delta;
        if (p.accum >= 2000) {
          p.accum -= 2000;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) <= 100) {
            this.player.takeDamage(10);
            this.spawnHitFlash(this.player.x, this.player.y, 0x44aa22);
            this.showFloatingText(this.player.x, this.player.y - 20, '🍄 -10', '#44aa22');
          }
        }
      }

      // Player projectiles damage NPC plants (heal projectiles pass through)
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || !proj.isFromPlayer || proj.isHeal) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, p.x, p.y) <= 30) {
          p.hp -= proj.damage;
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          proj.setActive(false).setVisible(false);
        }
      }
    }

    // Heal projectiles: heal the friendly caster on contact
    for (const go of allActiveProj) {
      const proj = go as Projectile;
      if (!proj.active || !proj.isHeal) continue;
      const target = proj.isFromPlayer ? this.player : this.npc;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, target.x, target.y) <= 25) {
        target.heal(10);
        this.showFloatingText(target.x, target.y - 20, '+10 🍄', '#aaffaa');
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        proj.setActive(false).setVisible(false);
      }
    }

    // ── Lingering Air Beams ───────────────────────────────────────
    this.updateLingeringBeams(time);

    // ── Tree of Life / Golden Apples ─────────────────────────────
    if (this.elementId === 'life' || this.npcElementId === 'life') {
      this.updateTreesAndApples(time, delta, mouseX, mouseY);
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

        if (s.owner === 'player') {
          this.damagePlayerTargets(s.x, s.y, s.hitRadius, s.damage, s.color);
          // Squall Splashes upgrade: 25% chance to leave a tidal puddle on impact
          if (this.hasUpgrade('q') && Math.random() < 0.25) {
            const splash = this.add.circle(s.x, s.y, 54, 0x0066bb, 0.7).setDepth(2);
            this.puddles.push({ sprite: splash, expiresAt: this.time.now + 5000, x: s.x, y: s.y, radius: 54, tickAccum: 0, owner: 'player' });
          }
        } else {
          if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) <= s.hitRadius) {
            this.player.takeDamage(s.damage);
            this.spawnHitFlash(this.player.x, this.player.y, s.color);
          }
        }
      }
      if (s.fired) this.painRainShadows.splice(i, 1);
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
            for (const t of this.enemies) {
              if (!t.active || t.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(cloud.x, cloud.y, t.x, t.y) <= cloud.radius + 14) {
                t.takeDamage(1);
                this.spawnHitFlash(t.x, t.y, 0x660088);
              }
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
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(trap.x, trap.y, t.x, t.y) <= trap.radius + 10) {
              trap.triggered = true;
              const dmg = trap.isPlume ? 28 : 20;
              t.takeDamage(dmg);
              this.spawnHitFlash(t.x, t.y, trap.isPlume ? 0x9933cc : 0xcc44ff);
              if (trap.isPlume) {
                for (let ci = 0; ci < 5; ci++) {
                  const jx = trap.x + Phaser.Math.Between(-60, 60);
                  const jy = trap.y + Phaser.Math.Between(-60, 60);
                  const cloud = this.add.circle(jx, jy, 28, 0x6633aa, 0.55).setDepth(5);
                  this.tweens.add({ targets: cloud, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 1200, onComplete: () => cloud.destroy() });
                  if (Phaser.Math.Distance.Between(jx, jy, t.x, t.y) <= 50) {
                    t.takeDamage(5);
                    this.spawnHitFlash(t.x, t.y, 0x9933cc);
                  }
                }
                this.showFloatingText(trap.x, trap.y - 20, '💨 PLUME', '#cc88ff');
              } else {
                this.shadowNpcStunnedUntil = time + 2000;
              }
              break;
            }
          }
        } else {
          if (Phaser.Math.Distance.Between(trap.x, trap.y, this.player.x, this.player.y) <= trap.radius + 10) {
            trap.triggered = true;
            const dmg = trap.isPlume ? 28 : 20;
            this.player.takeDamage(dmg);
            this.spawnHitFlash(this.player.x, this.player.y, trap.isPlume ? 0x9933cc : 0xcc44ff);
            if (trap.isPlume) {
              for (let ci = 0; ci < 5; ci++) {
                const jx = trap.x + Phaser.Math.Between(-60, 60);
                const jy = trap.y + Phaser.Math.Between(-60, 60);
                const cloud = this.add.circle(jx, jy, 28, 0x6633aa, 0.55).setDepth(5);
                this.tweens.add({ targets: cloud, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 1200, onComplete: () => cloud.destroy() });
                if (Phaser.Math.Distance.Between(jx, jy, this.player.x, this.player.y) <= 50) {
                  this.player.takeDamage(5);
                  this.spawnHitFlash(this.player.x, this.player.y, 0x9933cc);
                }
              }
              this.showFloatingText(trap.x, trap.y - 20, '💨 PLUME', '#cc88ff');
            } else {
              this.shadowPlayerStunnedUntil = time + 2000;
            }
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

    // ── Q+ Risky.Expansion: Space = teleport to cursor during domain ─────
    if (this.elementId === 'technology' && this.techKit.isTechDomainActive() && this.hasUpgrade('q') && Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dodgeOnCooldown) {
      this.techKit.teleportPlayerToCursor(mouseX, mouseY);
      this.dodgeOnCooldown = true;
      this.time.delayedCall(1000, () => { this.dodgeOnCooldown = false; });
    }

    // ── Dodge (Space) ────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dodgeOnCooldown && !this.isDodging && !this.nukeChanneling && time >= this.soulHauntStunUntil && !(this.elementId === 'slime' && this.slimeKit.shouldSuppressDodge())) {
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

      // Quantum form-swap on dodge
      if (this.elementId === 'quantum') {
        this.quantumElementKit.toggleFormForDodge(time);
      }

      // Echo E+/Q+ light trail on dodge
      if (this.elementId === 'echo' && this.echoKit) {
        this.echoKit.tryConsumeEyeForDodge(this.player.x, this.player.y, dx, dy);
      }

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
      this.fireKit.handleNpcCastId(p2CastId, time);
    } else {
    // ── NPC AI ───────────────────────────────────────────────────
    const aiState: NpcAiState = {
      isLocked: this.npcNukeChanneling || this.npc.frozenUntil > time || this.npcMetalTaseredUntil > time || (this.elementId === 'silence' && time < this.npc.silencePossessedUntil) || this.magnetKit.getNailPullUntil() > time || (this.npc.magicChainBound && time < this.npc.magicChainBoundEnd) || time < this.silenceKit.getNpcYankUntil() || time < this.npcHawkDragUntil || (this.npcElement.id === 'rubber' && (this.rubberKit.isBounceFormActive('npc') || this.rubberKit.isBounceBackActive('npc') || this.rubberKit.isSpringActive('npc'))),
      hasActiveGeyser: this.geysers.some((g) => g.owner === 'npc'),
      flameBodyActive: this.fireKit.isNpcFlameBodyActive(),
      projectiles: this.projectiles,
      plantCount: this.npcPlants.length,
      thornDragActive: time < this.npcThornDragActiveUntil,
      enemyNearPlant: this.npcPlants.some(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
      ),
      windTrapActive: time < this.npcWindTrapExpiry,
      chargedBeamReady: this.npcAirConsecutiveHits >= 3,
      earthShieldHp: this.npcEarthShieldHp,
      npcEarthRocksActive: this.npcEarthRocks.length > 0,
      oilDroneCount: this.oilKit.getNpcDroneCount(),
      shadowPlayerSnared: time < this.shadowPlayerSnaredUntil || time < this.shadowPlayerStunnedUntil,
      playerFrostStacks: this.playerFrostStacks,
      iceBlockActive: this.npcBlockUpActive,
      npcGrowthBloatActive: this.npc.growthBloatActive,
      crystalNodeCount: this.npcCrystalNodes.length,
      npcSoulGhosts: this.npcSoulGhosts,
      npcHuntBeastForm: this.npcHuntBeastForm,
      npcHuntTrailActive: this.npcHuntTrailActive,
      playerBleeding: this.playerBleeding,
      huntBloodMoonActive: this.huntBloodMoonActive,
      npcTimeRemainActive: this.npcTimeRemainActive,
      npcTimeHaltActive: this.npcTimeHaltActive,
      npcTimeTimelessReady: this.npcTimeTimelessCharge >= 10000,
      // Fate
      fateSlotMachineCount: this.npcElement.id === 'fate' ? this.fateKit.getNpcSlotMachines().length : 0,
      fateCoinCount: this.npcElement.id === 'fate' ? this.fateKit.getNpcCoins() : 0,
      fateNpcLucky: this.npcElement.id === 'fate' ? this.fateKit.isNpcLucky() : false,
      npcMetalArsenal: this.npcMetalArsenal,
      deathWispCd: undefined,
      npcSilenceSlasherActive: this.silenceKit.isNpcSlasherActive(),
      npcSilenceSlasherHp: this.silenceKit.getNpcSlasherHp(),
      npcSilenceHookConnected: this.silenceKit.isNpcHookConnected(),
      echoAttachActive: this.npcElement.id === 'echo' ? this.echoKit.isNpcBatAttaching() : false,
      quantumMechanicActive: this.npcElement.id === 'quantum' ? this.quantumElementKit.isNpcMechanicActive() : false,
      quantumNhilegoActive: this.npcElement.id === 'quantum' ? this.quantumElementKit.isNpcNhilegoActive() : false,
    };

    const npcPreDashX = this.npc.x;
    const npcPreDashY = this.npc.y;
    const npcCastId = (this.isInvasion || this.shadowConsumeActive || this.time.now < this.shadowNpcThrowUntil) ? null : (this.npc as NpcOpponent).doAI(
      this.player,
      (tx: number, ty: number) => this.buildNpcContext(tx, ty),
      time,
      aiState,
    );
    this.npcCastId = npcCastId;

    // ── Invasion mode update ──────────────────────────────────────
    if (this.isInvasion) {
      this.updateInvasion(time, delta);
    }

    // Earth and Light kit updates (after npcCastId is known)
    if (this.elementId === 'earth' || this.npcElement.id === 'earth') {
      this.updateEarthKit(time, delta);
    }
    if (this.elementId === 'light' || this.npcElement.id === 'light') {
      this.lightKit.update(time, delta, this.elementId === 'light', this.npcElement.id === 'light');
    }

    // React to NPC casts that need ArenaScene state
    if (npcCastId === 'splash') {
      this.npcSplashActiveUntil = time + 2000;
      this.npcSplashDropAccum = 0;
    }
    this.fireKit.handleNpcCastId(npcCastId, time);
    if (npcCastId === 'thorn-drag') {
      if (this.hasUpgrade('q')) {
        this.beginTreeOfLife('npc');
      } else {
        this.npcThornDragActiveUntil = time + 2000;
        this.npcThornDragTickAccum = 0;
        this.npcThornDragAura = this.add.circle(this.npc.x, this.npc.y, 30, 0x44ff44, 0.3).setDepth(3);
      }
    }
    if (npcCastId === 'grow' && this.hasPerk('npc', 'mycology')) {
      this.fireMycologyProjectiles('npc', 'heal');
    }
    if (npcCastId === 'thorns' && this.hasPerk('npc', 'mycology')) {
      this.fireMycologyProjectiles('npc', 'damage');
    }
    if (npcCastId === 'quick-shot') {
      this.npcQuickShotCharged = true;
    }
    if (npcCastId === 'charged-beam') {
      this.npcAirConsecutiveHits = 0;
    }
    // Sound NPC reactions
    if (this.npcElement.id === 'sound') {
      this.soundKit.handleNpcCast(npcCastId, time);
    }
    // Silence NPC reactions — delegate to kit
    this.silenceKit.handleNpcCastId(npcCastId, time);
    // Slime sulpher spring confusion: override NPC velocity after doAI
    if (this.elementId === 'slime' && time < this.npc.slimeConfusedUntil) {
      if (time > this.npc.slimeConfuseDirUntil) {
        const a = Math.random() * Math.PI * 2;
        this.npc.slimeConfuseVx = Math.cos(a) * this.npc.speed;
        this.npc.slimeConfuseVy = Math.sin(a) * this.npc.speed;
        this.npc.slimeConfuseDirUntil = time + 450;
      }
      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(
        this.npc.slimeConfuseVx * this.npcSpeedMult,
        this.npc.slimeConfuseVy * this.npcSpeedMult,
      );
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
        // Slow enemies standing in the trail
        if (trail.owner === 'player') {
          const enemiesInTrail: Fighter[] = [];
          for (const enemyTarget of this.enemies) {
            if (!enemyTarget.active || enemyTarget.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(trail.x, trail.y, enemyTarget.x, enemyTarget.y) <= trail.radius) {
              // Slow via physics body (works for both PvP npc and invasion enemies)
              if (!this.playerBlackIceMorphActive) {
                const eb = enemyTarget.body as Phaser.Physics.Arcade.Body;
                eb.velocity.x *= 0.8; eb.velocity.y *= 0.8;
              }
              // Also update npcSpeedMult for PvP NPC
              if (!this.isInvasion && !this.playerBlackIceMorphActive) this.npcSpeedMult *= 0.8;
              enemiesInTrail.push(enemyTarget);
            }
          }
          // Tick frost accumulator once per trail, then apply stacks to all enemies in it
          if (enemiesInTrail.length > 0) {
            trail.frostTickAccum += delta;
            if (trail.frostTickAccum >= 1200) {
              trail.frostTickAccum -= 1200;
              for (const enemyTarget of enemiesInTrail) this.addFrostStackTo(enemyTarget);
            }
          }
        } else {
          if (Phaser.Math.Distance.Between(trail.x, trail.y, this.player.x, this.player.y) <= trail.radius) {
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
        // Rink perk: slippery physics — both fighters slide (low friction) on rink tiles
        if (trail.rink) {
          const playerOnRink = Phaser.Math.Distance.Between(trail.x, trail.y, this.player.x, this.player.y) <= trail.radius;
          const npcOnRink    = Phaser.Math.Distance.Between(trail.x, trail.y, this.npc.x, this.npc.y) <= trail.radius;
          if (playerOnRink) {
            const pb = this.player.body as Phaser.Physics.Arcade.Body;
            pb.velocity.x *= 0.985; pb.velocity.y *= 0.985;
          }
          if (npcOnRink) {
            const nb = this.npc.body as Phaser.Physics.Arcade.Body;
            nb.velocity.x *= 0.985; nb.velocity.y *= 0.985;
          }
        }
      }

      // Candle perk golem update
      const candleGolems = this.fireKit.getCandleGolems();
      for (let gi = candleGolems.length - 1; gi >= 0; gi--) {
        const golem = candleGolems[gi];
        if (time >= golem.meltAt || golem.hp <= 0) {
          golem.sprite.destroy();
          if (golem.ignitedAura) golem.ignitedAura.destroy();
          candleGolems.splice(gi, 1);
          continue;
        }
        // Walk toward nearest enemy
        const target = golem.owner === 'player' ? this.npc : this.player;
        const gdx = target.x - golem.x, gdy = target.y - golem.y;
        const gdist = Math.hypot(gdx, gdy) || 1;
        golem.vx = (gdx / gdist) * 80;
        golem.vy = (gdy / gdist) * 80;
        golem.x += golem.vx * (delta / 1000);
        golem.y += golem.vy * (delta / 1000);
        golem.sprite.setPosition(golem.x, golem.y);
        if (golem.ignitedAura) golem.ignitedAura.setPosition(golem.x, golem.y);
        // Absorb enemy projectiles; ignite from own fire/q
        for (const go of this.projectiles.getChildren()) {
          const proj = go as Projectile;
          if (!proj.active) continue;
          const projIsOwn = golem.owner === 'player' ? proj.isFromPlayer : !proj.isFromPlayer;
          const projIsEnemy = !projIsOwn;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, golem.x, golem.y) <= 22) {
            if (projIsEnemy) {
              golem.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              (proj.body as Phaser.Physics.Arcade.Body).stop();
            } else if (golem.ignited === 'none') {
              if (proj.texture.key === 'proj-fire') {
                golem.ignited = 'click';
                golem.sprite.setTint(0xff8800);
                proj.setActive(false).setVisible(false);
                (proj.body as Phaser.Physics.Arcade.Body).stop();
                this.showFloatingText(golem.x, golem.y - 20, '🔥 IGNITED', '#ff8800');
                if (golem.ignitedAura) golem.ignitedAura.destroy();
                golem.ignitedAura = this.add.circle(golem.x, golem.y, 26, 0xff8800, 0.3).setDepth(5);
                this.tweens.add({ targets: golem.ignitedAura, alpha: 0.08, yoyo: true, repeat: -1, duration: 400 });
              }
            }
          }
        }
        // Per-frame AOE when ignited
        if (golem.ignited !== 'none') {
          golem.aoeAccum += delta;
          const interval = golem.ignited === 'q' ? 800 : 1200;
          if (golem.aoeAccum >= interval) {
            golem.aoeAccum -= interval;
            const aoeDmg = golem.ignited === 'q' ? 18 : 10;
            const aoeR = golem.ignited === 'q' ? 80 : 60;
            for (const enemy of this.enemies) {
              if (!enemy.active || enemy.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(golem.x, golem.y, enemy.x, enemy.y) <= aoeR) {
                enemy.takeDamage(aoeDmg);
                this.spawnHitFlash(enemy.x, enemy.y, golem.ignited === 'q' ? 0xff2200 : 0xff8800);
              }
            }
            if (golem.owner === 'npc' && Phaser.Math.Distance.Between(golem.x, golem.y, this.player.x, this.player.y) <= aoeR) {
              this.player.takeDamage(aoeDmg);
              this.spawnHitFlash(this.player.x, this.player.y, golem.ignited === 'q' ? 0xff2200 : 0xff8800);
            }
            const aoeRing = this.add.circle(golem.x, golem.y, 8, golem.ignited === 'q' ? 0xff2200 : 0xff8800, 0.7).setDepth(5);
            this.tweens.add({ targets: aoeRing, scaleX: aoeR / 8, scaleY: aoeR / 8, alpha: 0, duration: 350, onComplete: () => aoeRing.destroy() });
          }
        }
      }

      // Ward hex update (Ward triple perk for Soul)
      for (let wi = this.soulWardHexes.length - 1; wi >= 0; wi--) {
        const wh = this.soulWardHexes[wi];
        if (time >= wh.expiresAt) {
          wh.gfx.destroy();
          if (wh.ownerAura) wh.ownerAura.destroy();
          wh.summonAuras.forEach((sa) => sa.arc.destroy());
          this.soulWardHexes.splice(wi, 1);
          continue;
        }
        const fighter = wh.owner === 'player' ? this.player : this.npc;
        const ownerInHex = Phaser.Math.Distance.Between(wh.x, wh.y, fighter.x, fighter.y) <= wh.radius;
        if (ownerInHex && fighter.incomingDamageMultiplier > 0.5) {
          fighter.incomingDamageMultiplier = 0.5;
        } else if (!ownerInHex && fighter.incomingDamageMultiplier === 0.5) {
          fighter.incomingDamageMultiplier = 1;
        }
        if (wh.ownerAura) {
          wh.ownerAura.setPosition(fighter.x, fighter.y);
          wh.ownerAura.setVisible(ownerInHex);
        }
        wh.summonAuras = wh.summonAuras.filter((sa) => sa.summon.sprite.active);
        for (const sa of wh.summonAuras) {
          sa.arc.setPosition(sa.summon.sprite.x, sa.summon.sprite.y);
          const summonInHex = Phaser.Math.Distance.Between(wh.x, wh.y, sa.summon.sprite.x, sa.summon.sprite.y) <= wh.radius;
          sa.arc.setVisible(summonInHex);
        }
      }

      // Void frost DOT + thaw (black ice morph) — per enemy
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0 || t.voidFrostStacks === 0) continue;
        const vfDps = t.voidFrostStacks >= 5 ? 4 : t.voidFrostStacks >= 3 ? 2 : 1;
        t.voidFrostTickAccum += delta;
        if (t.voidFrostTickAccum >= 1000) {
          t.voidFrostTickAccum -= 1000;
          t.takeDamage(vfDps);
          this.spawnHitFlash(t.x, t.y, 0x9900ff);
        }
        // Thaw: 1 stack every 3 seconds
        t.voidFrostThawAccum += delta;
        if (t.voidFrostThawAccum >= 3000) {
          t.voidFrostThawAccum -= 3000;
          t.voidFrostStacks = Math.max(0, t.voidFrostStacks - 1);
          t.incomingDamageMultiplier = t.voidFrostStacks > 0
            ? this.frostDamageMultiplier(t.voidFrostStacks) : 1;
        }
      }

      // Voided debuff DOT — per enemy
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0 || t.voidedUntil <= time) continue;
        t.voidedTickAccum += delta;
        if (t.voidedTickAccum >= 1000) {
          t.voidedTickAccum -= 1000;
          t.takeDamage(t.voidedDps); this.spawnHitFlash(t.x, t.y, 0x6600cc);
        }
      }

      // Frost visual indicators above enemies
      for (const t of this.enemies) {
        if (!t.active) continue;
        const frostLabel = t.frostStacks > 0 ? `❄️×${t.frostStacks}` : '';
        if (frostLabel) {
          if (!t.frostVisual) {
            t.frostVisual = this.add.text(t.x, t.y - 42, frostLabel,
              { fontSize: '12px', fontFamily: 'Arial', color: '#aaddff' }).setOrigin(0.5).setDepth(10);
          } else {
            t.frostVisual.setText(frostLabel).setPosition(t.x, t.y - 42);
          }
        } else if (t.frostVisual) {
          t.frostVisual.destroy(); t.frostVisual = null;
        }
      }

      // Void frost visual
      const vfLabel = this.npc.voidFrostStacks > 0 ? `☠️×${this.npc.voidFrostStacks}` : '';
      if (vfLabel) {
        if (!this.npc.voidFrostVisual) {
          this.npc.voidFrostVisual = this.add.text(this.npc.x, this.npc.y - 54, vfLabel,
            { fontSize: '12px', fontFamily: 'Arial', color: '#cc88ff' }).setOrigin(0.5).setDepth(10);
        } else {
          this.npc.voidFrostVisual.setText(vfLabel).setPosition(this.npc.x, this.npc.y - 54);
        }
      } else if (this.npc.voidFrostVisual) {
        this.npc.voidFrostVisual.destroy(); this.npc.voidFrostVisual = null;
      }

      // Voided status visual
      const voidedLabel = this.npc.voidedUntil > time ? '🔮 VOIDED' : '';
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
      if (this.npc.frozenUntil > 0 && time >= this.npc.frozenUntil) {
        this.npc.frozenUntil = 0;
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
            for (const t of this.enemies) {
              if (!t.active || t.hp <= 0) continue;
              t.takeDamage(2);
              this.spawnHitFlash(t.x, t.y, 0x8800cc);
            }
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
    if (this.npc.frozenUntil > time) {
      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    // ── Magnet nail pull override ─────────────────────────────────
    if (this.magnetKit.getNailPullUntil() > time) {
      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(this.magnetKit.getNailPullVX(), this.magnetKit.getNailPullVY());
    }
    // ── Magic thorn bind / prison (player cast) ──────────────────
    if (this.npc.magicChainBound && time < this.npc.magicChainBoundEnd) {
      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    // ── Earth stun override ───────────────────────────────────────
    if (this.npc.earthStunnedUntil > time) {
      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    if (this.playerEarthStunnedUntil > time) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }

    // ── Dummy mode: arrow keys move dummy, P fires fireball ──────
    if (this.npcElement.id === 'dummy') {
      const dummyBody = this.npc.body as Phaser.Physics.Arcade.Body;
      const dSpeed = 220;
      let dvx = 0, dvy = 0;
      if (this.dummyUpKey.isDown)    dvy -= dSpeed;
      if (this.dummyDownKey.isDown)  dvy += dSpeed;
      if (this.dummyLeftKey.isDown)  dvx -= dSpeed;
      if (this.dummyRightKey.isDown) dvx += dSpeed;
      dummyBody.setVelocity(dvx, dvy);

      if (Phaser.Input.Keyboard.JustDown(this.dummyFireKey)) {
        const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-fire', 10, false);
        this.projectiles.add(proj);
        proj.launch(-500, 0);
        this.showFloatingText(this.npc.x, this.npc.y - 20, '🔥 PEW!', '#ff8800');
      }
    }

    // ── Growth per-frame ─────────────────────────────────────────
    if (this.elementId === 'growth' || this.npcElement.id === 'growth') {
      // Toxic DOT — enemies
      for (const t of this.enemies) {
        if (!t.active) continue;
        if (t.toxicUntil > time) {
          if (!t.toxicAura) {
            t.toxicAura = this.add.circle(t.x, t.y, 26, 0x88bb22, 0.3).setDepth(7);
          }
          t.toxicAura.setPosition(t.x, t.y);
          t.toxicTickAccum += delta;
          if (t.toxicTickAccum >= 1000) {
            t.toxicTickAccum -= 1000;
            t.takeDamage(t.toxicDps); this.spawnHitFlash(t.x, t.y, 0x88bb22);
          }
        } else {
          t.toxicTickAccum = 0;
          if (t.toxicAura) { t.toxicAura.destroy(); t.toxicAura = null; }
        }
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
          this.player.applySelfDamage(this.playerToxicDps); this.spawnHitFlash(this.player.x, this.player.y, 0x88bb22);
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
      if (this.npc.growthBloatActive) {
        if (time >= this.npc.growthBloatEnd) {
          this.npc.growthBloatActive = false;
          if (this.npc.growthBloatAura) { this.npc.growthBloatAura.destroy(); this.npc.growthBloatAura = null; }
        } else if (this.npc.growthBloatAura) {
          this.npc.growthBloatAura.setPosition(this.npc.x, this.npc.y);
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

        // Sneeze aura — tick damage to nearby enemies
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
            for (const t of this.enemies) {
              if (!t.active || t.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) <= 120) {
                t.takeDamage(sneezeDmg);
                this.spawnHitFlash(t.x, t.y, 0x88ff44);
                const ft = this.add.text(t.x, t.y - 20, `🤧 ${sneezeDmg}`, { fontSize: '10px', color: '#88ff44' }).setOrigin(0.5).setDepth(12);
                this.tweens.add({ targets: ft, y: ft.y - 15, alpha: 0, duration: 700, onComplete: () => ft.destroy() });
              }
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
          const nearestEnemy = this.getNearestEnemy(bac.sprite.x, bac.sprite.y);
          const bdist = Phaser.Math.Distance.Between(bac.sprite.x, bac.sprite.y, nearestEnemy.x, nearestEnemy.y);
          if (bdist > 18) {
            const speed = 150 * (delta / 1000);
            bac.sprite.x += ((nearestEnemy.x - bac.sprite.x) / bdist) * speed;
            bac.sprite.y += ((nearestEnemy.y - bac.sprite.y) / bdist) * speed;
          } else if (time - bac.lastContactTime >= 1000) {
            bac.lastContactTime = time;
            nearestEnemy.takeDamage(5);
            this.spawnHitFlash(nearestEnemy.x, nearestEnemy.y, 0x55cc22);
            const ft = this.add.text(nearestEnemy.x, nearestEnemy.y - 20, '🦠 5', { fontSize: '10px', color: '#88ff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
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
          for (const tgt of (mine.owner === 'player' ? this.enemies : [this.player])) {
            if (!tgt.active || tgt.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(mine.x, mine.y, tgt.x, tgt.y) <= 28) {
              tgt.takeDamage(4);
              this.spawnHitFlash(tgt.x, tgt.y, 0x88eeff);
              mine.sprite.destroy();
              this.crystalBeamMines.splice(mi, 1);
              break;
            }
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

      // Crystal shard hits crystal node → explosion (or gateway passthrough)
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.texture.key !== 'proj-crystal-shard') continue;
        for (const node of allCrystals) {
          if (Phaser.Math.Distance.Between(proj.x, proj.y, node.x, node.y) <= 18) {
            if (node.isGateway && node.owner === (proj.isFromPlayer ? 'player' : 'npc')) {
              // Gateway: shard passes through — boost speed and damage once per node
              const pb = proj.body as Phaser.Physics.Arcade.Body;
              pb.setVelocity(pb.velocity.x * 1.2, pb.velocity.y * 1.2);
              proj.perkBoost = Math.min(proj.perkBoost * 1.3, 5);
              this.tweens.add({ targets: node.sprite, alpha: 1, scaleX: 1.5, scaleY: 1.5, duration: 90, yoyo: true });
              this.showFloatingText(node.x, node.y - 14, '+BOOST', '#aaeeff');
            } else {
              const tgt = proj.isFromPlayer ? this.npc : this.player;
              const isRUpgrade = proj.isFromPlayer && this.hasUpgrade('r');
              const aoeRange = isRUpgrade ? 120 : 60;
              const baseDmg  = isRUpgrade ? 20  : 10;
              const aoeDmg = Math.round(baseDmg * proj.perkBoost);
              if (Phaser.Math.Distance.Between(node.x, node.y, tgt.x, tgt.y) <= aoeRange) {
                tgt.takeDamage(aoeDmg);
                this.spawnHitFlash(tgt.x, tgt.y, 0x88eeff);
              }
              const expScale = isRUpgrade ? 12 : 6;
              const exp = this.add.circle(node.x, node.y, 10, 0x88eeff, 0.5).setDepth(8);
              this.tweens.add({ targets: exp, scaleX: expScale, scaleY: expScale, alpha: 0, duration: 260, onComplete: () => exp.destroy() });
              this.tweens.add({ targets: node.sprite, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 90, yoyo: true });
              proj.setActive(false).setVisible(false);
            }
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
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(orb.x, orb.y, t.x, t.y) <= 34) {
              t.takeDamage(10);
              this.spawnHitFlash(t.x, t.y, 0xccaaff);
              this.soulGhosts++;
              orb.lastContactTick = time;
              this.showFloatingText(this.player.x, this.player.y - 30, '+1 👻', '#ccaaff');
              break;
            }
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
        // Find closest enemy to target
        let closestEnemy: Fighter | null = null;
        let closestDist = Infinity;
        for (const e of this.enemies) {
          if (!e.active || e.hp <= 0) continue;
          const dist = Phaser.Math.Distance.Between(gs.sprite.x, gs.sprite.y, e.x, e.y);
          if (dist < closestDist) {
            closestDist = dist;
            closestEnemy = e;
          }
        }
        if (closestEnemy) this.updateSoulSummon(gs, closestEnemy, time, delta, true);
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
              for (const t of this.enemies) {
                if (!t.active || t.hp <= 0) continue;
                if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) <= 80) {
                  t.takeDamage(20);
                  this.spawnHitFlash(t.x, t.y, 0xffaacc);
                }
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
          // Hybrid Grenade Leap: holding to max fuse grants a speed boost
          if (this.huntHybridForm) {
            this.huntHybridLeapBoostUntil = time + 5000;
            this.showFloatingText(this.player.x, this.player.y - 32, '⚡ Speed!', '#ff8844');
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
        }
        // E+: shotgun pellet detonates grenade (in-flight OR landed)
        if (this.hasUpgrade('e') && g.owner === 'player') {
          const projs = this.projectiles.getChildren();
          for (const go of projs) {
            const proj = go as unknown as Projectile;
            if (proj.active && (proj.texture.key === 'proj-hunt-pellet' || proj.texture.key === 'proj-hunt-silver')) {
              if (Phaser.Math.Distance.Between(proj.x, proj.y, g.x, g.y) <= 20) {
                g.explodeAt = time;
                break;
              }
            }
          }
        }
        if (time >= g.explodeAt) {
          const gx = g.x, gy = g.y;
          this.spawnGrenadeExplosion(gx, gy, g.selfDamage, g.owner, g.isHealGrenade);
          // Grenade Leap (hybrid form E): teleport caster to explosion point
          if (g.isLeap && g.owner === 'player') {
            this.player.setPosition(gx, gy);
            // Speed boost after leap; extra-long boost if it was a self-damage hit
            this.huntHybridLeapBoostUntil = time + (g.selfDamage ? 5000 : 4000);
            this.showFloatingText(gx, gy - 20, '⚡ Leap!', '#ff8844');
          }
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
            const trailTarget = this.getNearestEnemy(this.player.x, this.player.y);
            const trailDur = this.hasPerk('player', 'rage') ? 5000 : 3000;
            const s = this.add.circle(trailTarget.x, trailTarget.y, 30, 0xff4400, 0.18).setDepth(2);
            this.huntTrailCircles.push({ sprite: s, x: trailTarget.x, y: trailTarget.y, expiresAt: time + trailDur });
          }
        }
      }
      for (let i = this.huntTrailCircles.length - 1; i >= 0; i--) {
        const c = this.huntTrailCircles[i];
        if (time > c.expiresAt) { c.sprite.destroy(); this.huntTrailCircles.splice(i, 1); }
      }
      // Rage perk: render rage bar above HP bar
      if (this.hasPerk('player', 'rage')) {
        if (!this.playerHuntRageBar) {
          this.playerHuntRageBar = this.add.rectangle(this.player.x, this.player.y - 44, 52, 4, 0xcc2233, 1).setDepth(20).setOrigin(0.5);
        }
        const barW = Math.max(0, (this.playerHuntRage / 100) * 52);
        this.playerHuntRageBar.setPosition(this.player.x - 26 + barW / 2, this.player.y - 44);
        this.playerHuntRageBar.setSize(barW, 4);
        this.playerHuntRageBar.setVisible(true);
      } else if (this.playerHuntRageBar) {
        this.playerHuntRageBar.setVisible(false);
      }

      // Beast Instinct (hybrid R): on-trail screech after 2s
      if (this.huntHybridForm && this.huntTrailCircles.length > 0) {
        const onTrail = this.huntTrailCircles.some(
          (c) => Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) <= 30,
        );
        if (onTrail) {
          this.huntHybridTrailStandAccum += delta;
          if (this.huntHybridTrailStandAccum >= 2000 && time >= this.huntHybridScreechCdUntil) {
            this.huntHybridTrailStandAccum = 0;
            this.huntHybridScreechCdUntil = time + 4000;
            this.npcHuntSlowUntil = Math.max(this.npcHuntSlowUntil, time + 3000);
            const roar = this.add.circle(this.player.x, this.player.y, 18, 0xff0000, 0.8).setDepth(9);
            this.tweens.add({ targets: roar, scaleX: 4, scaleY: 4, alpha: 0, duration: 800, onComplete: () => roar.destroy() });
            const roar2 = this.add.circle(this.player.x, this.player.y, 10, 0xffffff, 1).setDepth(10);
            this.tweens.add({ targets: roar2, scaleX: 3, scaleY: 3, alpha: 0, duration: 500, onComplete: () => roar2.destroy() });
            this.showFloatingText(this.player.x, this.player.y - 28, '🐺 Screech!', '#ff8844');
          }
        } else {
          this.huntHybridTrailStandAccum = 0;
        }
      }

      // Shriek DoT (hybrid F): 3 dmg/s + heal caster — tick all bleeding enemies
      const shriekBleedTargets = this.enemies.filter(t => t.active && t.hp > 0 && t.bleeding);
      if (this.huntHybridForm && time < this.npcHuntShriekDotUntil && shriekBleedTargets.length > 0) {
        this.npcHuntShriekDotTick += delta;
        if (this.npcHuntShriekDotTick >= 1000) {
          this.npcHuntShriekDotTick -= 1000;
          for (const t of shriekBleedTargets) {
            t.takeDamage(3);
            this.spawnHitFlash(t.x, t.y, 0xffcc66);
          }
          this.player.heal(3);
          this.showFloatingText(this.player.x, this.player.y - 16, '+3', '#ffcc66');
        }
      } else if (shriekBleedTargets.length === 0) {
        // No bleeding enemies — stop DoT
        this.npcHuntShriekDotUntil = 0;
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
      for (const t of this.enemies) {
        if (!t.active) continue;
        if (t.bleeding) {
          if (time > t.bleedingUntil) {
            t.bleeding = false;
            if (t.bleedVisual) { t.bleedVisual.destroy(); t.bleedVisual = null; }
          } else if (t.bleedVisual) {
            t.bleedVisual.setPosition(t.x, t.y);
          }
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

      // Blood Moon — player (bleeding enemies get chip damage)
      if (this.huntBloodMoonActive) {
        if (time > this.huntBloodMoonEnd) {
          this.huntBloodMoonActive = false;
          if (this.huntBloodMoonFilter) { this.huntBloodMoonFilter.destroy(); this.huntBloodMoonFilter = null; }
        } else {
          const bleedingTargets = this.enemies.filter(t => t.active && t.hp > 0 && t.bleeding);
          if (bleedingTargets.length > 0) {
            this.huntBloodMoonTickAccum += delta;
            if (this.huntBloodMoonTickAccum >= 2000) {
              this.huntBloodMoonTickAccum -= 2000;
              for (const t of bleedingTargets) {
                t.takeDamage(5);
                this.spawnHitFlash(t.x, t.y, 0xcc2222);
              }
              if (this.hasUpgrade('f')) this.player.heal(3 * bleedingTargets.length);
              if (this.huntBloodPactActive && time < this.huntBloodPactEnd) this.player.heal(3);
            }
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
        const bhTgt = this.huntBloodHuntTarget ?? this.npc;
        const angle = Math.random() * Math.PI * 2;
        this.player.setPosition(bhTgt.x + Math.cos(angle) * 60, bhTgt.y + Math.sin(angle) * 60);
        this.npcHuntSlowUntil = time + 3000;
        this.npcHuntConfusedUntil = time + 3000;
        this.showFloatingText(bhTgt.x, bhTgt.y - 20, '😵 Confused!', '#ff8800');
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
          let leapHitE = false;
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(this.huntLeapTargetX, this.huntLeapTargetY, t.x, t.y) <= 120) {
              t.takeDamage(30);
              this.spawnHitFlash(t.x, t.y, 0xff4400);
              leapHitE = true;
            }
          }
          if (leapHitE) {
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
            let leapHit = false;
            for (const t of this.enemies) {
              if (!t.active || t.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(this.huntLeapTargetX, this.huntLeapTargetY, t.x, t.y) <= 120) {
                t.takeDamage(30);
                this.spawnHitFlash(t.x, t.y, 0xff4400);
                leapHit = true;
              }
            }
            if (leapHit) {
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

      // NPC confusion (R+ Blood Hunt) — PvP only; invasion handled in updateInvasion
      if (!this.isInvasion && time < this.npcHuntConfusedUntil) {
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

    }

    // ── Silence per-frame ────────────────────────────────────────
    if (this.elementId === 'silence' || this.npcElement.id === 'silence') {
      this.silenceKit.update(time, delta, this.elementId === 'silence', this.npcElement.id === 'silence');
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
          if (this.hasPerk('player', 'purge')) {
            this.player.cooldownMult = this.purgePriorCooldownMult;
            this.stopPurgePulse();
          }
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

    // ── Vigorous mutation: heal NPC 5 HP/sec ─────────────────────
    if (this.mutations.has('vigorous') && !this.gameEnded) {
      if (this.npc.active) this.npc.heal(5 * delta / 1000);
      if (this.clone && this.clone.active) this.clone.heal(5 * delta / 1000);
      for (const re of this.raidEnemies) if (re.active) re.heal(5 * delta / 1000);
    }

    // ── Shielded mutation: totem spawning & hit detection ────────
    if (this.mutations.has('shielded') && !this.gameEnded && this.npc.active && !this.npcMainDefeated) {
      const W2 = this.scale.width;
      const H2 = this.scale.height;
      const arPad = 32;
      if (time >= this.nextTotemSpawnTime) {
        this.nextTotemSpawnTime = time + 10000;
        const tx = Phaser.Math.Between(arPad + 40, W2 - arPad - 40);
        const ty = Phaser.Math.Between(arPad + 40, H2 - arPad - 40);
        const totemMaxHp = Math.round(25 * (this.npc.maxHp / Math.max(1, this.baseNpcMaxHpForTotem)));
        const totemSprite = this.add.circle(tx, ty, 18, 0xccaa00, 0.9).setDepth(6);
        totemSprite.setStrokeStyle(3, 0xffee44, 1);
        const totemFill = this.add.circle(tx, ty - 26, 18, 0x33cc33, 1).setDepth(7);
        const totemLabel = this.add.text(tx, ty, '🛡️', { fontSize: '16px' }).setOrigin(0.5).setDepth(8);
        this.shieldTotems.push({ sprite: totemSprite, hpBarFill: totemFill, label: totemLabel, hp: totemMaxHp, maxHp: totemMaxHp });
        this.npc.isInvincible = true;
        this.showFloatingText(tx, ty - 40, 'TOTEM!', '#ffee44');
      }
      // Update totem HP bars and check for player projectile hits
      for (let ti = this.shieldTotems.length - 1; ti >= 0; ti--) {
        const tot = this.shieldTotems[ti];
        if (!tot.sprite.active) continue;
        tot.sprite.setPosition(tot.sprite.x, tot.sprite.y);
        // HP bar width as fraction
        const hpFrac = Math.max(0, tot.hp / tot.maxHp);
        tot.hpBarFill.setScale(hpFrac, 0.4);
        tot.hpBarFill.setPosition(tot.sprite.x, tot.sprite.y - 26);
        // Check player projectile hits
        const projs2 = this.projectiles.getChildren();
        for (const go of projs2) {
          if (!(go instanceof Projectile)) continue;
          const p2 = go as Projectile;
          if (!p2.active || !p2.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(p2.x, p2.y, tot.sprite.x, tot.sprite.y) <= 22) {
            tot.hp -= p2.damage;
            p2.setActive(false).setVisible(false);
            (p2.body as Phaser.Physics.Arcade.Body).stop();
            this.spawnHitFlash(tot.sprite.x, tot.sprite.y, 0xffee44);
            if (tot.hp <= 0) {
              tot.sprite.destroy();
              tot.hpBarFill.destroy();
              tot.label.destroy();
              this.shieldTotems.splice(ti, 1);
              if (this.shieldTotems.length === 0) this.npc.isInvincible = false;
              this.showFloatingText(tot.sprite.x, tot.sprite.y - 20, 'TOTEM DESTROYED!', '#ff6600');
              break;
            }
          }
        }
      }
    }

    // ── Raid AI ───────────────────────────────────────────────────
    for (let ri = 0; ri < this.raidEnemies.length; ri++) {
      const re = this.raidEnemies[ri];
      if (!re.active || this.raidDefeated[ri]) continue;
      const reAiState: NpcAiState = {
        isLocked: false,
        hasActiveGeyser: false,
        flameBodyActive: false,
        projectiles: this.projectiles,
        plantCount: 0,
        thornDragActive: false,
        enemyNearPlant: false,
        windTrapActive: false,
        chargedBeamReady: false,
        earthShieldHp: 0,
      };
      const raidCastId = re.doAI(
        this.player,
        (tx, ty) => this.buildRaidContext(re, this.raidProjectiles[ri], tx, ty),
        time,
        reAiState,
      );
      void raidCastId; // raid enemies don't need cast-id post-processing
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
          for (const target of (sl.owner === 'player' ? this.enemies : [this.player])) {
            if (!target.active || target.hp <= 0) continue;
            const d = this.pointToSegmentDist(target.x, target.y, sl.x1, sl.y1, sl.x2, sl.y2);
            if (d <= 40) {
              target.takeDamage(sl.damage);
              this.spawnHitFlash(target.x, target.y, 0x8844cc);
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
          for (const target of (ms.owner === 'player' ? this.enemies : [this.player])) {
            if (!target.active || target.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(ms.x, ms.y, target.x, target.y);
            if (dist <= ms.radius) {
              const dmg = dist <= ms.directHitRadius ? ms.damage + ms.directBonus : ms.damage;
              target.takeDamage(dmg);
              this.spawnHitFlash(target.x, target.y, 0xaa66ff);
            }
          }
          // E+: 15% chance to leave a fire pool on impact
          if (ms.owner === 'player' && this.hasUpgrade('e') && Math.random() < 0.15) {
            const puddleSpr = this.add.circle(ms.x, ms.y, 35, 0xff4422, 0.55).setDepth(2)
              .setStrokeStyle(1, 0xff8844, 0.5);
            this.tweens.add({ targets: puddleSpr, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 });
            this.gravFirePuddles.push({ sprite: puddleSpr, expiresAt: time + 8000, x: ms.x, y: ms.y, radius: 35, tickAccum: 0, owner: 'player' });
          }
          // Quake perk: spawn a mini tsunami wave on impact
          if (this.hasPerk(ms.owner, 'quake')) this.spawnQuakeWave(ms.owner, ms.x, ms.y);
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

        // Deal damage to enemies inside the shadow circle
        for (const target of (this.gravLunarOwner === 'player' ? this.enemies : [this.player])) {
          if (!target.active || target.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(lsX, lsY, target.x, target.y) <= lsR) {
            target.takeDamage(60);
            this.spawnHitFlash(target.x, target.y, 0xaa66ff);
          }
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
        // Quake perk: spawn a mini tsunami wave at lunar landing impact
        if (this.hasPerk(this.gravLunarOwner, 'quake')) this.spawnQuakeWave(this.gravLunarOwner, lsX, lsY);
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
                // Quake perk: spawn mini wave at rush impact
                if (this.hasPerk('player', 'quake')) this.spawnQuakeWave('player', rushSpr.x, rushSpr.y);
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
        const _fpTargets = (fp.owner === 'player' ? this.enemies : [this.player])
          .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(fp.x, fp.y, t.x, t.y) <= fp.radius);
        if (_fpTargets.length > 0) {
          fp.tickAccum += delta;
          if (fp.tickAccum >= 300) {
            fp.tickAccum -= 300;
            for (const fTarget of _fpTargets) {
              fTarget.takeDamage(4);
              this.spawnHitFlash(fTarget.x, fTarget.y, 0xff6633);
            }
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
        for (const dTarget of (d.owner === 'player' ? this.enemies : [this.player])) {
          if (!dTarget.active || dTarget.hp <= 0) continue;
          const tId = dTarget === this.player ? 'player' : String(this.enemies.indexOf(dTarget as Fighter));
          if (!d.hitSet.has(tId) && Phaser.Math.Distance.Between(d.sprite.x, d.sprite.y, dTarget.x, dTarget.y) <= 20) {
            dTarget.takeDamage(d.damage);
            this.spawnHitFlash(dTarget.x, dTarget.y, 0xeeeeff);
            d.hitSet.add(tId);
            // Daggers pierce — don't destroy
          }
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
            for (const rktTarget of (b.owner === 'player' ? this.enemies : [this.player])) {
              if (!rktTarget.active || rktTarget.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, rktTarget.x, rktTarget.y) <= 50) {
                rktTarget.takeDamage(b.damage);
                this.spawnHitFlash(rktTarget.x, rktTarget.y, 0xee8800);
              }
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
        let _boltHit = false;
        for (const bTarget of (b.owner === 'player' ? this.enemies : [this.player])) {
          if (!bTarget.active || bTarget.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, bTarget.x, bTarget.y) <= 18) {
            bTarget.takeDamage(b.damage);
            this.spawnHitFlash(bTarget.x, bTarget.y, 0xffaa44);
            _boltHit = true;
            break;
          }
        }
        if (_boltHit) { b.sprite.destroy(); this.creatBolts.splice(i, 1); }
      }

      // 5. Scythe steering + contact + absorption
      for (let i = this.creatScythes.length - 1; i >= 0; i--) {
        const sc = this.creatScythes[i];
        const scTarget = sc.owner === 'player' ? this.getNearestEnemy(sc.sprite.x, sc.sprite.y) : this.player;
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
            for (const puTarget of (pu.owner === 'player' ? this.enemies : [this.player])) {
              if (!puTarget.active || puTarget.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(pu.x, pu.y, puTarget.x, puTarget.y) <= pu.range) {
                puTarget.takeDamage(pu.magnitude);
                this.spawnHitFlash(puTarget.x, puTarget.y, 0xff4422);
              }
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
            for (const sbTarget of (sb.owner === 'player' ? this.enemies : [this.player])) {
              if (!sbTarget.active || sbTarget.hp <= 0) continue;
              if (Math.abs(sbTarget.x - sb.x) <= sb.w / 2 + 22 && Math.abs(sbTarget.y - sb.y) <= sb.h / 2 + 22) {
                sbTarget.takeDamage(5);
                this.spawnHitFlash(sbTarget.x, sbTarget.y, 0xcc2222);
              }
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

    // ── Sound per-frame ──────────────────────────────────────────
    if (this.elementId === 'sound' || this.npcElement.id === 'sound') {
      this.soundKit.update(time, delta, this.elementId === 'sound', this.npcElement.id === 'sound');
    }

    // ── Magnet per-frame ──────────────────────────────────────────
    if (this.elementId === 'magnet' || this.npcElement.id === 'magnet') {
      this.magnetKit.update(time, delta);
    }

    // ── Metal per-frame ───────────────────────────────────────────
    if (this.elementId === 'metal' || this.npcElement.id === 'metal') {
      this.updateMetalState(time, delta);
    }

    // ── Plasma per-frame ─────────────────────────────────────────
    if (this.elementId === 'plasma' || this.npcElement.id === 'plasma') {
      this.updatePlasmaState(time, delta);
    }

    // ── Death per-frame ──────────────────────────────────────────
    if (this.elementId === 'death' || this.npcElement.id === 'death') {
      this.deathKit.update(time, delta);
    }

    // ── Void per-frame ───────────────────────────────────────────
    if (this.elementId === 'void' || this.npcElement.id === 'void') {
      this.voidKit.update(time, delta);
    }

    // ── Rubber per-frame ─────────────────────────────────────────
    if (this.elementId === 'rubber' || this.npcElement.id === 'rubber') {
      this.rubberKit.update(time, delta);
    }

    // ── Magic per-frame ───────────────────────────────────────────
    if (this.elementId === 'magic' || this.npcElement.id === 'magic') {
      this.magicKit.update(time, delta);
    }

    // ── Technology per-frame ──────────────────────────────────────
    if (this.elementId === 'technology' || this.npcElement.id === 'technology') {
      this.techKit.update(time, delta);
    }

    // ── Echo per-frame ────────────────────────────────────────────
    if (this.elementId === 'echo' || this.npcElement.id === 'echo') {
      this.echoKit.update(time, delta,
        this.elementId === 'echo',
        this.npcElement.id === 'echo');
    }

    // ── Quantum per-frame ─────────────────────────────────────────
    if (this.elementId === 'quantum' || this.npcElement.id === 'quantum') {
      this.quantumElementKit.update(time, delta);
    }

    // ── Oil per-frame ─────────────────────────────────────────────
    if (this.elementId === 'oil' || this.npcElement.id === 'oil') {
      this.oilKit.update(time, delta,
        this.elementId === 'oil',
        this.npcElement.id === 'oil',
        mouseX, mouseY);
    }

    // ── Fate per-frame ───────────────────────────────────────────
    if (this.elementId === 'fate' || this.npcElement.id === 'fate') {
      this.fateKit.update(time, delta,
        this.elementId === 'fate',
        this.npcElement.id === 'fate');
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
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0) continue;
        const d = Phaser.Math.Distance.Between(this.playerWindTrapX, this.playerWindTrapY, t.x, t.y);
        if (d > trapR) {
          const ang = Phaser.Math.Angle.Between(this.playerWindTrapX, this.playerWindTrapY, t.x, t.y);
          t.setPosition(
            this.playerWindTrapX + Math.cos(ang) * trapR,
            this.playerWindTrapY + Math.sin(ang) * trapR,
          );
          const nb = t.body as Phaser.Physics.Arcade.Body;
          const vDotN = nb.velocity.x * Math.cos(ang) + nb.velocity.y * Math.sin(ang);
          if (vDotN > 0) {
            nb.velocity.x -= vDotN * Math.cos(ang);
            nb.velocity.y -= vDotN * Math.sin(ang);
          }
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

    // ── Thorn Drag (player drags enemies) ────────────────────────────
    if (time < this.thornDragActiveUntil) {
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0) continue;
        const tdx = mouseX - t.x;
        const tdy = mouseY - t.y;
        const tdLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        (t.body as Phaser.Physics.Arcade.Body).setVelocity((tdx / tdLen) * 220, (tdy / tdLen) * 220);
      }
      this.thornDragTickAccum += delta;
      if (this.thornDragTickAccum >= 250) {
        this.thornDragTickAccum -= 250;
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          t.takeDamage(3);
          this.spawnHitFlash(t.x, t.y, 0x44cc44);
        }
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
        (p) => p.kind !== 'stalagmite' && p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
      );
      if (playerInPuddle) {
        const pb = this.player.body as Phaser.Physics.Arcade.Body;
        pb.velocity.x *= 0.5;
        pb.velocity.y *= 0.5;
      }

      const npcInPuddle = this.puddles.some(
        (p) => p.kind !== 'stalagmite' && p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius,
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


    // ── Clamp all enemies to arena bounds ────────────────────────
    {
      const wb = this.physics.world.bounds;
      const allEnemies: Fighter[] = [this.npc];
      if (this.clone && this.clone.active) allEnemies.push(this.clone);
      for (const re of this.raidEnemies) if (re.active) allEnemies.push(re);
      for (const e of allEnemies) {
        if (!e.active) continue;
        let clamped = false;
        if (e.x < wb.x) { e.x = wb.x; clamped = true; }
        else if (e.x > wb.right) { e.x = wb.right; clamped = true; }
        if (e.y < wb.y) { e.y = wb.y; clamped = true; }
        else if (e.y > wb.bottom) { e.y = wb.bottom; clamped = true; }
        if (clamped) {
          const b = e.body as Phaser.Physics.Arcade.Body;
          b.reset(e.x, e.y);
        }
      }
    }

    // ── Perk updates ────────────────────────────────────────────
    this.updateHawkProjectiles(delta);
    this.updateAutomatons(delta);

    // ── Update HUD cooldown bars ─────────────────────────────────
    for (const entry of this.abilityBars) {
      if (entry.abilityId === 'flame-body') {
        entry.fill.setSize(this.fireKit.isFlameBodyActive() ? entry.maxWidth : 0, entry.fill.height);
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
      } else if (entry.abilityId === 'accelerando') {
        const streak = this.soundKit.getNoteStreak();
        if (streak >= 10) {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('accelerando'), entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * (streak / 10), entry.fill.height);
        }
      } else if (entry.abilityId === 'flow-mode') {
        entry.fill.setSize(this.soundKit.isFlowActive() ? entry.maxWidth : 0, entry.fill.height);
      } else if (entry.abilityId === 'infect') {
        const infectCd = Math.max(1000, this.growthInfectCdMs);
        const infectRatio = Math.min(1, (this.time.now - this.lastPlayerInfectCast) / infectCd);
        entry.fill.setSize(entry.maxWidth * infectRatio, entry.fill.height);
      } else if (entry.abilityId === 'bloat') {
        const bloatCd = Math.max(1000, this.growthBloatCdMs);
        const bloatRatio = Math.min(1, (this.time.now - this.lastPlayerBloatCast) / bloatCd);
        entry.fill.setSize(entry.maxWidth * bloatRatio, entry.fill.height);
      } else if (entry.abilityId === 'magic-grimoire' && this.elementId === 'magic' && this.magicKit.isThunderCharged('e')) {
        entry.fill.setFillStyle(0xffee00, 0.55);
        entry.fill.setSize(entry.maxWidth, entry.fill.height);
      } else if (entry.abilityId === 'magic-necronomicon' && this.elementId === 'magic' && this.magicKit.isThunderCharged('q')) {
        entry.fill.setFillStyle(0xcc44ff, 0.55);
        entry.fill.setSize(entry.maxWidth, entry.fill.height);
      } else {
        if (entry.abilityId === 'magic-grimoire' || entry.abilityId === 'magic-necronomicon') {
          entry.fill.setFillStyle(entry.baseFillColor ?? 0x4466aa, 0.45);
        }
        entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio(entry.abilityId), entry.fill.height);
      }
    }

    // P2 HUD cooldown bars (PvP)
    if (this.isPvP) {
      for (const entry of this.p2AbilityBars) {
        if (entry.abilityId === 'flame-body') {
          entry.fill.setSize(this.fireKit.isNpcFlameBodyActive() ? entry.maxWidth : 0, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.npc.getCooldownRatio(entry.abilityId), entry.fill.height);
        }
      }
    }
  }



  // ═══════════════════════════════════════════════════════════════════
  // NEW EARTH KIT
  // ═══════════════════════════════════════════════════════════════════

  private spawnEarthShield(isPlayer: boolean): void {
    const hasDual = isPlayer && this.hasUpgrade('click');
    // With Click+: base HP = 50 each, enhanced = 100 each; color = gray
    // Without upgrade: base HP = 75, enhanced = 125; color = brown
    if (isPlayer) {
      const hp = hasDual
        ? (this.earthShieldEnhanced ? 100 : (this.hasPerk('player', 'obsidian') ? 75 : 50))
        : this.earthShieldMaxHp;
      this.earthShieldHp = hp;
      if (!hasDual) this.earthShieldMaxHp = hp;
      this.earthShieldBroken = false;
      this.earthShieldRespawnAt = 0;
      if (this.earthShieldSprite) this.earthShieldSprite.destroy();
      const w = this.earthShieldEnhanced ? 55 : 46;
      const h = this.earthShieldEnhanced ? 14 : 12;
      const color = hasDual ? 0x888888 : 0x887755;
      const strokeColor = hasDual ? 0xbbbbbb : 0xccaa66;
      this.earthShieldSprite = this.add.rectangle(this.player.x, this.player.y, w, h, color).setDepth(7);
      this.earthShieldSprite.setStrokeStyle(2, strokeColor);
      if (!this.earthShieldLabel) {
        this.earthShieldLabel = this.add.text(this.player.x, this.player.y - 30, '', {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: hasDual ? '#bbbbbb' : '#ccaa66',
        }).setOrigin(0.5).setDepth(11);
      }
      // Also spawn back shield if Click+
      if (hasDual) {
        this.spawnEarthBackShield();
      }
      // Wire shield as damage absorber — directional: front blocks frontal hits, back blocks rear hits
      this.player.damageAbsorber = (amount: number) => {
        // Determine if hit comes from front (NPC in front of player relative to shield facing)
        const angleToNpc = Math.atan2(this.npc.y - this.player.y, this.npc.x - this.player.x);
        const angDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
          Phaser.Math.RadToDeg(angleToNpc),
          Phaser.Math.RadToDeg(this.earthShieldAngle)
        ));
        const fromFront = angDiff < 90;

        if (fromFront && this.earthShieldHp > 0) {
          // Front shield absorbs frontal hit
          const absorbed = Math.min(this.earthShieldHp, amount);
          this.earthShieldHp -= absorbed;
          if (this.earthShieldHp <= 0) this.breakEarthShield(true);
          const remaining = amount - absorbed;
          if (remaining > 0) {
            this.player.hp = Math.max(0, this.player.hp - remaining);
            if (this.player.hp <= 0) this.player.emit('defeated');
          }
          return true;
        } else if (!fromFront && hasDual && this.earthBackShieldHp > 0) {
          // Back shield absorbs rear hit
          const absorbed = Math.min(this.earthBackShieldHp, amount);
          this.earthBackShieldHp -= absorbed;
          if (this.earthBackShieldHp <= 0) {
            if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
            if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
          }
          const remaining = amount - absorbed;
          if (remaining > 0) {
            this.player.hp = Math.max(0, this.player.hp - remaining);
            if (this.player.hp <= 0) this.player.emit('defeated');
          }
          return true;
        }
        return false;
      };
    } else {
      const hp = this.npcEarthShieldMaxHp;
      this.npcEarthShieldHp = hp;
      this.npcEarthShieldBroken = false;
      this.npcEarthShieldRespawnAt = 0;
      if (this.npcEarthShieldSprite) this.npcEarthShieldSprite.destroy();
      const w = this.npcEarthShieldEnhanced ? 55 : 46;
      const h = this.npcEarthShieldEnhanced ? 14 : 12;
      this.npcEarthShieldSprite = this.add.rectangle(this.npc.x, this.npc.y, w, h, 0x887755).setDepth(7);
      this.npcEarthShieldSprite.setStrokeStyle(2, 0xccaa66);
      if (!this.npcEarthShieldLabel) {
        this.npcEarthShieldLabel = this.add.text(this.npc.x, this.npc.y - 30, '', {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#ccaa66',
        }).setOrigin(0.5).setDepth(11);
      }
      // Wire NPC shield as damage absorber
      this.npc.damageAbsorber = (amount: number) => {
        if (this.npcEarthShieldHp <= 0) return false;
        const absorbed = Math.min(this.npcEarthShieldHp, amount);
        this.npcEarthShieldHp -= absorbed;
        if (this.npcEarthShieldHp <= 0) this.breakEarthShield(false);
        const remaining = amount - absorbed;
        if (remaining > 0) {
          this.npc.hp = Math.max(0, this.npc.hp - remaining);
          if (this.npc.hp <= 0) this.npc.emit('defeated');
        }
        return true;
      };
    }
  }

  private spawnEarthBackShield(): void {
    if (this.earthBackShieldSprite) this.earthBackShieldSprite.destroy();
    const maxHp = this.earthShieldEnhanced ? 100 : (this.hasPerk('player', 'obsidian') ? 75 : 50);
    this.earthBackShieldMaxHp = maxHp;
    if (this.earthBackShieldHp <= 0) this.earthBackShieldHp = maxHp;
    const w = this.earthShieldEnhanced ? 55 : 46;
    const h = this.earthShieldEnhanced ? 14 : 12;
    this.earthBackShieldSprite = this.add.rectangle(this.player.x, this.player.y, w, h, 0x888888).setDepth(6);
    this.earthBackShieldSprite.setStrokeStyle(2, 0xaaaaaa);
    if (!this.earthBackShieldLabel) {
      this.earthBackShieldLabel = this.add.text(this.player.x, this.player.y - 30, '', {
        fontSize: '9px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(10);
    }
  }

  private breakEarthShield(isPlayer: boolean): void {
    const hasDual = isPlayer && this.hasUpgrade('click');
    const respawnAt = this.time.now + (this.earthSplinterRepairFast ? 4000 : 8000);
    if (isPlayer) { this.earthSplinterRepairFast = false; }
    if (isPlayer) {
      if (hasDual && this.earthBackShieldHp > 0) {
        // Back shield replaces front shield
        this.earthShieldHp = this.earthBackShieldHp;
        this.earthBackShieldHp = 0;
        if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
        if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
        if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
        // Spawn new front shield with the transferred HP
        const maxHp = this.earthShieldEnhanced ? 100 : 50;
        const w = this.earthShieldEnhanced ? 55 : 46;
        const h = this.earthShieldEnhanced ? 14 : 12;
        this.earthShieldSprite = this.add.rectangle(this.player.x, this.player.y, w, h, 0x888888).setDepth(7);
        this.earthShieldSprite.setStrokeStyle(2, 0xbbbbbb);
        this.earthShieldBroken = false;
        this.earthShieldRespawnAt = 0;
        void maxHp;
        this.showFloatingText(this.player.x, this.player.y - 30, '🛡 BACK SHIELD ACTIVATED', '#aaaaaa');
        return;
      }
      this.earthShieldHp = 0;
      this.earthShieldBroken = true;
      this.earthShieldRespawnAt = respawnAt;
      if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
      this.player.damageAbsorber = null;
      this.showFloatingText(this.player.x, this.player.y - 30, '💥 SHIELD BROKEN', '#ff8844');
    } else {
      this.npcEarthShieldHp = 0;
      this.npcEarthShieldBroken = true;
      this.npcEarthShieldRespawnAt = respawnAt;
      if (this.npcEarthShieldSprite) { this.npcEarthShieldSprite.destroy(); this.npcEarthShieldSprite = null; }
      this.npc.damageAbsorber = null;
      this.showFloatingText(this.npc.x, this.npc.y - 30, '💥 SHIELD BROKEN', '#ff8844');
    }
  }

  private updateEarthShieldSpritePosition(isPlayer: boolean): void {
    const fighter = isPlayer ? this.player : this.npc;
    const sprite = isPlayer ? this.earthShieldSprite : this.npcEarthShieldSprite;
    const label = isPlayer ? this.earthShieldLabel : this.npcEarthShieldLabel;
    const hp = isPlayer ? this.earthShieldHp : this.npcEarthShieldHp;
    const maxHp = isPlayer && this.hasUpgrade('click')
      ? (this.earthShieldEnhanced ? 100 : (this.hasPerk('player', 'obsidian') ? 75 : 50))
      : (isPlayer ? this.earthShieldMaxHp : this.npcEarthShieldMaxHp);
    const ang = isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle;
    if (sprite) {
      const shieldDist = 28;
      sprite.setPosition(fighter.x + Math.cos(ang) * shieldDist, fighter.y + Math.sin(ang) * shieldDist);
      sprite.setRotation(ang + Math.PI / 2);
    }
    if (label) {
      label.setPosition(fighter.x + Math.cos(ang) * 36, fighter.y + Math.sin(ang) * 36 - 16);
      label.setText(`🛡${Math.floor(hp)}/${maxHp}`);
    }
    // Back shield (Click+ only)
    if (isPlayer && this.earthBackShieldSprite && this.earthBackShieldHp > 0) {
      const backAng = ang + Math.PI;
      const backDist = 28;
      this.earthBackShieldSprite.setPosition(
        fighter.x + Math.cos(backAng) * backDist,
        fighter.y + Math.sin(backAng) * backDist,
      );
      this.earthBackShieldSprite.setRotation(backAng + Math.PI / 2);
      if (this.earthBackShieldLabel) {
        this.earthBackShieldLabel.setPosition(
          fighter.x + Math.cos(backAng) * 36,
          fighter.y + Math.sin(backAng) * 36 - 14,
        );
        const bMaxHp = this.earthShieldEnhanced ? 100 : (this.hasPerk('player', 'obsidian') ? 75 : 50);
        this.earthBackShieldLabel.setText(`🛡${Math.floor(this.earthBackShieldHp)}/${bMaxHp}`);
      }
    }
  }

  /** Returns true if a hit with the given incoming angle is blocked by the shield. */
  private earthShieldBlocks(isPlayer: boolean, fromX: number, fromY: number): boolean {
    const fighter = isPlayer ? this.player : this.npc;
    const hp = isPlayer ? this.earthShieldHp : this.npcEarthShieldHp;
    const ang = isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle;
    if (hp <= 0) return false;
    const incomingAng = Math.atan2(fromY - fighter.y, fromX - fighter.x);
    const diff = Phaser.Math.Angle.Wrap(incomingAng - ang);
    return Math.abs(diff) < Math.PI * (60 / 180);
  }

  private earthAbsorbShieldDamage(isPlayer: boolean, amount: number, fromX: number, fromY: number): number {
    if (!this.earthShieldBlocks(isPlayer, fromX, fromY)) return amount;
    if (isPlayer) {
      const absorbed = Math.min(this.earthShieldHp, amount);
      this.earthShieldHp -= absorbed;
      if (this.earthShieldHp <= 0) this.breakEarthShield(true);
      return amount - absorbed;
    } else {
      const absorbed = Math.min(this.npcEarthShieldHp, amount);
      this.npcEarthShieldHp -= absorbed;
      if (this.npcEarthShieldHp <= 0) this.breakEarthShield(false);
      return amount - absorbed;
    }
  }

  private spawnEarthRock(isPlayer: boolean, _angle: number): void {
    const lava = isPlayer && this.hasUpgrade('r');
    const color = lava ? 0xff4400 : 0x887755;
    const strokeColor = lava ? 0xff8844 : 0xccaa66;
    const r = this.add.circle(0, 0, 8, color).setDepth(8).setStrokeStyle(1, strokeColor);
    const rock = { sprite: r, hitCdUntil: 0 };
    if (isPlayer) this.earthRocks.push(rock); else this.npcEarthRocks.push(rock);
  }

  private launchEarthRock(isPlayer: boolean, idx: number): void {
    const rocks = isPlayer ? this.earthRocks : this.npcEarthRocks;
    const launched = isPlayer ? this.earthLaunchedRocks : this.npcEarthLaunchedRocks;
    const fighter = isPlayer ? this.player : this.npc;
    const ang = isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle;
    const rock = rocks[idx];
    if (!rock) return;
    const lava = isPlayer && this.hasUpgrade('r');
    const speed = 500;
    launched.push({ sprite: rock.sprite, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, spawnedAt: this.time.now });
    if (isPlayer) this.earthRocks.splice(idx, 1); else this.npcEarthRocks.splice(idx, 1);
    if (lava) {
      this.showFloatingText(fighter.x, fighter.y - 30, '🔥 LAVA LAUNCH!', '#ff8844');
    } else {
      this.showFloatingText(fighter.x, fighter.y - 30, '🪨 LAUNCH!', '#ccaa66');
    }
  }

  private performEarthBash(isPlayer: boolean, mouseX: number, mouseY: number): void {
    const fighter = isPlayer ? this.player : this.npc;
    const targetX = isPlayer ? mouseX : this.player.x;
    const targetY = isPlayer ? mouseY : this.player.y;
    const dx = targetX - fighter.x;
    const dy = targetY - fighter.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / len;
    const ndy = dy / len;
    const dashSpeed = 550;

    if (isPlayer) {
      this.earthBashActive = true;
      this.earthBashEnd = this.time.now + 200;
      this.earthBashDirX = ndx;
      this.earthBashDirY = ndy;
      this.earthBashHitDealt = false;
      this.earthBashStartX = fighter.x;
      this.earthBashStartY = fighter.y;
      (fighter.body as Phaser.Physics.Arcade.Body).setVelocity(ndx * dashSpeed, ndy * dashSpeed);
      this.isDodging = true;
    } else {
      this.npcEarthBashActive = true;
      this.npcEarthBashEnd = this.time.now + 200;
      this.npcEarthBashDirX = ndx;
      this.npcEarthBashDirY = ndy;
      this.npcEarthBashHitDealt = false;
      this.npcEarthBashStartX = fighter.x;
      this.npcEarthBashStartY = fighter.y;
      (fighter.body as Phaser.Physics.Arcade.Body).setVelocity(ndx * dashSpeed, ndy * dashSpeed);
    }
  }

  private spawnEarthGolem(isPlayer: boolean): void {
    const fighter = isPlayer ? this.player : this.npc;
    const shieldX = fighter.x + Math.cos(isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle) * 28;
    const shieldY = fighter.y + Math.sin(isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle) * 28;

    // Consume shield first
    if (isPlayer) {
      this.earthShieldHp = 0;
      this.earthShieldBroken = true;
      // No 8s respawn yet — only after golem ends
      this.earthShieldRespawnAt = 0;
      if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
    } else {
      this.npcEarthShieldHp = 0;
      this.npcEarthShieldBroken = true;
      this.npcEarthShieldRespawnAt = 0;
      if (this.npcEarthShieldSprite) { this.npcEarthShieldSprite.destroy(); this.npcEarthShieldSprite = null; }
    }

    const sprite = this.add.rectangle(shieldX, shieldY, 48, 48, 0x665533).setDepth(6).setStrokeStyle(2, 0xbbaa77);
    const link = this.add.graphics().setDepth(5);
    const hpLabel = this.add.text(shieldX, shieldY - 36, '💪 150', {
      fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#ccaa66',
    }).setOrigin(0.5).setDepth(11);

    if (isPlayer) {
      this.earthGolemActive = true;
      this.earthGolemHp = this.earthGolemMaxHp;
      this.earthGolemX = shieldX;
      this.earthGolemY = shieldY;
      this.earthGolemSprite = sprite;
      this.earthGolemLink = link;
      this.earthGolemUntil = this.time.now + 15000;
      this.earthGolemPunchCdUntil = 0;
      this.earthGolemFaultCdUntil = 0;
      this.earthGolemPoundCdUntil = 0;
      this.earthGolemHpLabel = hpLabel;
    } else {
      this.npcEarthGolemActive = true;
      this.npcEarthGolemHp = this.earthGolemMaxHp;
      this.npcEarthGolemX = shieldX;
      this.npcEarthGolemY = shieldY;
      this.npcEarthGolemSprite = sprite;
      this.npcEarthGolemLink = link;
      this.npcEarthGolemUntil = this.time.now + 15000;
      this.npcEarthGolemPunchCdUntil = 0;
      this.npcEarthGolemFaultCdUntil = 0;
      this.npcEarthGolemPoundCdUntil = 0;
      this.npcEarthGolemHpLabel = hpLabel;
    }
    this.showFloatingText(shieldX, shieldY - 40, '🗿 GOLEM RISES', '#ccaa66');
  }

  private endEarthGolem(isPlayer: boolean): void {
    if (isPlayer) {
      if (this.earthGolemSprite) { this.earthGolemSprite.destroy(); this.earthGolemSprite = null; }
      if (this.earthGolemLink) { this.earthGolemLink.destroy(); this.earthGolemLink = null; }
      if (this.earthGolemFaultWallSprite) { this.earthGolemFaultWallSprite.destroy(); this.earthGolemFaultWallSprite = null; }
      if (this.earthGolemHpLabel) { this.earthGolemHpLabel.destroy(); this.earthGolemHpLabel = null; }
      this.earthGolemActive = false;
      this.earthGolemHp = 0;
      this.earthShieldRespawnAt = this.time.now + 8000; // shield respawn starts now
      this.showFloatingText(this.player.x, this.player.y - 30, '🗿 GOLEM FALLS', '#887755');
    } else {
      if (this.npcEarthGolemSprite) { this.npcEarthGolemSprite.destroy(); this.npcEarthGolemSprite = null; }
      if (this.npcEarthGolemLink) { this.npcEarthGolemLink.destroy(); this.npcEarthGolemLink = null; }
      if (this.npcEarthGolemFaultWallSprite) { this.npcEarthGolemFaultWallSprite.destroy(); this.npcEarthGolemFaultWallSprite = null; }
      if (this.npcEarthGolemHpLabel) { this.npcEarthGolemHpLabel.destroy(); this.npcEarthGolemHpLabel = null; }
      this.npcEarthGolemActive = false;
      this.npcEarthGolemHp = 0;
      this.npcEarthShieldRespawnAt = this.time.now + 8000;
      this.showFloatingText(this.npc.x, this.npc.y - 30, '🗿 GOLEM FALLS', '#887755');
    }
  }

  private updateGolemAI(isPlayer: boolean, time: number, delta: number): void {
    const golemX = isPlayer ? this.earthGolemX : this.npcEarthGolemX;
    const golemY = isPlayer ? this.earthGolemY : this.npcEarthGolemY;
    const golemSprite = isPlayer ? this.earthGolemSprite : this.npcEarthGolemSprite;
    const golemLink = isPlayer ? this.earthGolemLink : this.npcEarthGolemLink;
    const golemHpLabel = isPlayer ? this.earthGolemHpLabel : this.npcEarthGolemHpLabel;
    const golemHp = isPlayer ? this.earthGolemHp : this.npcEarthGolemHp;
    const owner = isPlayer ? this.player : this.npc;
    const target = isPlayer ? this.npc : this.player;
    const punchCdUntil = isPlayer ? this.earthGolemPunchCdUntil : this.npcEarthGolemPunchCdUntil;
    const faultCdUntil = isPlayer ? this.earthGolemFaultCdUntil : this.npcEarthGolemFaultCdUntil;
    const poundCdUntil = isPlayer ? this.earthGolemPoundCdUntil : this.npcEarthGolemPoundCdUntil;

    const dist = Phaser.Math.Distance.Between(golemX, golemY, target.x, target.y);
    const speed = 160;

    // Golem movement toward target
    const gdx = target.x - golemX;
    const gdy = target.y - golemY;
    const glen = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
    const moveX = golemX + (gdx / glen) * speed * (delta / 1000);
    const moveY = golemY + (gdy / glen) * speed * (delta / 1000);
    if (isPlayer) { this.earthGolemX = moveX; this.earthGolemY = moveY; }
    else { this.npcEarthGolemX = moveX; this.npcEarthGolemY = moveY; }

    if (golemSprite) golemSprite.setPosition(moveX, moveY);
    if (golemLink) {
      golemLink.clear();
      golemLink.lineStyle(2, 0x887755, 0.7);
      golemLink.lineBetween(owner.x, owner.y, moveX, moveY);
    }
    if (golemHpLabel) {
      golemHpLabel.setPosition(moveX, moveY - 36);
      golemHpLabel.setText(`💪 ${Math.ceil(golemHp)}`);
    }

    // Golem abilities
    if (dist > 260 && time >= faultCdUntil) {
      // Fault Line: spawn wall at midpoint, deal 25 dmg
      const midX = (golemX + target.x) / 2;
      const midY = (golemY + target.y) / 2;
      const wallSprite = this.add.rectangle(midX, midY, 140, 18, 0x887755).setDepth(7).setStrokeStyle(2, 0xccaa66);
      this.showFloatingText(midX, midY - 20, '⛰ FAULT LINE', '#ccaa66');
      target.takeDamage(25);
      this.spawnHitFlash(target.x, target.y, 0x887755);
      const wallExpiry = time + 1500;
      if (isPlayer) {
        if (this.earthGolemFaultWallSprite) this.earthGolemFaultWallSprite.destroy();
        this.earthGolemFaultWallSprite = wallSprite;
        this.earthGolemFaultWallUntil = wallExpiry;
        this.earthGolemFaultCdUntil = time + 5000;
      } else {
        if (this.npcEarthGolemFaultWallSprite) this.npcEarthGolemFaultWallSprite.destroy();
        this.npcEarthGolemFaultWallSprite = wallSprite;
        this.npcEarthGolemFaultWallUntil = wallExpiry;
        this.npcEarthGolemFaultCdUntil = time + 5000;
      }
    } else if (dist < 90 && time >= poundCdUntil) {
      // Pound: heavy AoE close range
      target.takeDamage(45);
      this.spawnHitFlash(target.x, target.y, 0x887755);
      const ring = this.add.circle(moveX, moveY, 10, 0x887755, 0.8).setDepth(6);
      this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
      this.showFloatingText(target.x, target.y - 20, '💥 POUND', '#ccaa66');
      if (isPlayer) this.earthGolemPoundCdUntil = time + 10000; else this.npcEarthGolemPoundCdUntil = time + 10000;
    } else if (dist < 90 && time >= punchCdUntil) {
      // Punch: quick melee hit
      target.takeDamage(18);
      this.spawnHitFlash(target.x, target.y, 0x887755);
      this.showFloatingText(target.x, target.y - 20, '👊 PUNCH', '#ccaa66');
      if (isPlayer) this.earthGolemPunchCdUntil = time + 2000; else this.npcEarthGolemPunchCdUntil = time + 2000;
    }

    // Fault wall cleanup
    const faultWall = isPlayer ? this.earthGolemFaultWallSprite : this.npcEarthGolemFaultWallSprite;
    const faultUntil = isPlayer ? this.earthGolemFaultWallUntil : this.npcEarthGolemFaultWallUntil;
    if (faultWall && time >= faultUntil) {
      faultWall.destroy();
      if (isPlayer) this.earthGolemFaultWallSprite = null; else this.npcEarthGolemFaultWallSprite = null;
    }
  }

  private updateEarthKit(time: number, delta: number): void {
    const { width: W, height: H } = this.scale;
    void H;
    const ptr = this.input.activePointer;

    // ── Player earth ──────────────────────────────────────────────
    if (this.elementId === 'earth') {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

      // Lazy-spawn initial shield (HP starts at 75 from create() but sprite doesn't exist yet)
      if (this.earthShieldHp > 0 && !this.earthShieldSprite && !this.earthShieldBroken && !this.earthGolemActive && !this.earthGolemFused) {
        // With Click+: adjust initial HP to 50
        if (this.hasUpgrade('click') && this.earthShieldMaxHp === 75) {
          this.earthShieldHp = 50;
          this.earthShieldMaxHp = 50;
        }
        this.spawnEarthShield(true);
      }

      // Update shield facing angle toward cursor
      if (this.earthShieldHp > 0) {
        this.earthShieldAngle = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
      }

      // Shield respawn check (only if not golem-active or fused)
      if (!this.earthGolemActive && !this.earthGolemFused && this.earthShieldBroken && this.earthShieldRespawnAt > 0 && time >= this.earthShieldRespawnAt) {
        this.spawnEarthShield(true);
        this.showFloatingText(this.player.x, this.player.y - 30, '🛡 SHIELD RESTORED', '#ccaa66');
      }

      // Update shield sprite position
      if (this.earthShieldSprite) this.updateEarthShieldSpritePosition(true);

      // Repair active — slow + aura
      if (this.earthRepairActive) {
        if (time >= this.earthRepairEnd) {
          this.earthRepairActive = false;
          if (this.earthRepairAura) { this.earthRepairAura.destroy(); this.earthRepairAura = null; }
          // Apply repair effect
          const hasDualShield = this.hasUpgrade('click');
          if (this.earthGolemActive) {
            this.earthGolemHp = Math.min(this.earthGolemMaxHp, this.earthGolemHp + 50);
            this.showFloatingText(this.player.x, this.player.y - 30, '🔧 GOLEM REPAIR +50', '#ccaa66');
          } else if (this.earthShieldBroken) {
            this.spawnEarthShield(true);
            this.showFloatingText(this.player.x, this.player.y - 30, '🔧 SHIELD RESTORED', '#ccaa66');
          } else {
            // Heal front shield
            const fMaxHp = hasDualShield ? (this.earthShieldEnhanced ? 100 : (this.hasPerk('player', 'obsidian') ? 75 : 50)) : this.earthShieldMaxHp;
            if (this.earthShieldHp < fMaxHp) {
              this.earthShieldHp = fMaxHp;
              this.showFloatingText(this.player.x, this.player.y - 30, '🔧 SHIELD HEALED', '#ccaa66');
            }
            // Also heal back shield (Click+)
            if (hasDualShield && this.earthBackShieldHp > 0) {
              const bMaxHp = this.earthShieldEnhanced ? 100 : (this.hasPerk('player', 'obsidian') ? 75 : 50);
              if (this.earthBackShieldHp < bMaxHp) {
                this.earthBackShieldHp = bMaxHp;
                this.showFloatingText(this.player.x, this.player.y - 50, '🔧 BACK SHIELD HEALED', '#aaaaaa');
              }
            } else if (!hasDualShield && !this.earthShieldEnhanced) {
              this.earthShieldEnhanced = true;
              this.earthShieldMaxHp = 125;
              this.earthShieldHp = 125;
              if (this.earthShieldSprite) { this.earthShieldSprite.setSize(55, 14); }
              this.showFloatingText(this.player.x, this.player.y - 30, '⚒ SHIELD ENHANCED!', '#ffcc44');
            }
          }
        } else {
          if (this.earthRepairAura) this.earthRepairAura.setPosition(this.player.x, this.player.y);
        }
      }

      // Bash — dash phase
      if (this.earthBashActive) {
        if (time >= this.earthBashEnd) {
          this.earthBashActive = false;
          this.isDodging = false;
          playerBody.setVelocity(0, 0);
        } else {
          // Check hit against enemies
          if (!this.earthBashHitDealt) {
            for (const t of this.enemies) {
              if (!t.active || t.hp <= 0) continue;
              const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
              if (dist < 70) {
                this.earthBashHitDealt = true;
                if (this.earthShieldHp > 0) {
                  t.takeDamage(30);
                  this.spawnHitFlash(t.x, t.y, 0x887755);
                  this.showFloatingText(t.x, t.y - 20, '🛡 BASH 30', '#ccaa66');
                } else {
                  t.takeDamage(15);
                  this.spawnHitFlash(t.x, t.y, 0x887755);
                  this.showFloatingText(t.x, t.y - 20, '🗡 STAB 15', '#aa8844');
                }
              }
            }
          }
        }
      }

      // Orbiting rocks tick + launched rocks
      const lavaRocks = this.hasUpgrade('r');
      const orbitR = lavaRocks ? 38 : 52; // R+: smaller orbit radius
      const orbitSpeed = lavaRocks ? 0.004375 : 0.0028; // R+: 25% faster than 0.0035
      this.earthRockOrbitAngle += delta * orbitSpeed;
      const rockCount = this.earthRocks.length;
      for (let ri = 0; ri < rockCount; ri++) {
        const rock = this.earthRocks[ri];
        const ang = this.earthRockOrbitAngle + ri * (Math.PI * 2 / rockCount);
        rock.sprite.setPosition(this.player.x + Math.cos(ang) * orbitR, this.player.y + Math.sin(ang) * orbitR);
        if (time >= rock.hitCdUntil) {
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const d = Phaser.Math.Distance.Between(rock.sprite.x, rock.sprite.y, t.x, t.y);
            if (d < 22) {
              t.takeDamage(8);
              this.spawnHitFlash(t.x, t.y, lavaRocks ? 0xff4400 : 0x887755);
              this.showFloatingText(t.x, t.y - 20, '🪨 8', '#aa8844');
              if (lavaRocks) {
                t.lavaRockBurnUntil = Math.max(t.lavaRockBurnUntil, time + 2000);
              }
              rock.hitCdUntil = time + 500;
              break;
            }
          }
        }
      }
      for (let i = this.earthLaunchedRocks.length - 1; i >= 0; i--) {
        const lr = this.earthLaunchedRocks[i];
        lr.sprite.x += lr.vx * (delta / 1000);
        lr.sprite.y += lr.vy * (delta / 1000);
        const hitWall = lr.sprite.x < 20 || lr.sprite.x > W - 20 || lr.sprite.y < 20 || lr.sprite.y > H - 20;
        const expired = time - lr.spawnedAt > 1200;
        let rockHit = false;
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(lr.sprite.x, lr.sprite.y, t.x, t.y);
          if (d < 28) {
            const launchDmg = lavaRocks ? 60 : 40;
            t.takeDamage(launchDmg);
            this.spawnHitFlash(t.x, t.y, lavaRocks ? 0xff4400 : 0x887755);
            this.showFloatingText(t.x, t.y - 20, lavaRocks ? `🔥 LAVA HIT ${launchDmg}` : `🪨 LAUNCH STUN ${launchDmg}`, '#ffcc44');
            t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 3000);
            if (lavaRocks) {
              t.lavaRockBurnUntil = Math.max(t.lavaRockBurnUntil, time + 3000);
              const poolSpr = this.add.circle(t.x, t.y, 32, 0xff4400, 0.4).setDepth(3);
              this.tweens.add({ targets: poolSpr, scaleX: 1.1, scaleY: 1.1, alpha: 0.1, duration: 2500, onComplete: () => poolSpr.destroy() });
              this.earthLavaRockFirePools.push({ sprite: poolSpr, expiresAt: time + 2500 });
              // Magmify quake if enemy is inside quake zone
              if (this.earthQuakeSprite && this.earthQuakeExpiry > time) {
                const qZoneR = this.hasUpgrade('f') ? 100 : 80;
                const qd = Phaser.Math.Distance.Between(t.x, t.y, this.earthQuakeX, this.earthQuakeY);
                if (qd < qZoneR) {
                  this.earthQuakeMagmified = true;
                  this.earthQuakeSprite.setFillStyle(0xff0000, 0.3);
                  this.earthQuakeSprite.setStrokeStyle(2, 0xff2200, 0.9);
                  this.showFloatingText(this.earthQuakeX, this.earthQuakeY - 20, '🌋 MAGMA QUAKE', '#ff2200');
                }
              }
            }
            lr.sprite.destroy();
            this.earthLaunchedRocks.splice(i, 1);
            rockHit = true;
            break;
          }
        }
        if (rockHit) continue;
        if (hitWall || expired) {
          lr.sprite.destroy();
          this.earthLaunchedRocks.splice(i, 1);
        }
      }
      // Lava fire DOT from R+ rocks
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (t.lavaRockBurnUntil > time) {
          t.lavaRockBurnAccum += delta;
          if (t.lavaRockBurnAccum >= 500) {
            t.lavaRockBurnAccum -= 500;
            t.takeDamage(2); this.spawnHitFlash(t.x, t.y, 0xff4400);
          }
        } else {
          t.lavaRockBurnAccum = 0;
        }
      }
      // Lava fire pool cleanup
      for (let i = this.earthLavaRockFirePools.length - 1; i >= 0; i--) {
        if (time >= this.earthLavaRockFirePools[i].expiresAt) {
          this.earthLavaRockFirePools[i].sprite.destroy();
          this.earthLavaRockFirePools.splice(i, 1);
        }
      }

      // Quake zone
      const quakeRadius = this.hasUpgrade('f') ? 100 : 80;
      if (this.earthQuakeSprite && time < this.earthQuakeExpiry) {
        this.earthQuakeTickAccum += delta;
        const tripInterval = this.earthQuakeMagmified ? 500 : 750;
        const tripDmg = this.earthQuakeMagmified ? 10 : 5;
        if (this.earthQuakeTickAccum >= tripInterval) {
          this.earthQuakeTickAccum -= tripInterval;
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const d = Phaser.Math.Distance.Between(this.earthQuakeX, this.earthQuakeY, t.x, t.y);
            if (d < quakeRadius && time > (this.earthQuakeStunUntil ?? 0) && Math.random() < 0.35) {
              t.takeDamage(tripDmg);
              this.spawnHitFlash(t.x, t.y, this.earthQuakeMagmified ? 0xff4400 : 0x887755);
              this.showFloatingText(t.x, t.y - 20, this.earthQuakeMagmified ? `🌋 MAGMA ${tripDmg}` : `⚡ TRIP ${tripDmg}`, '#ccaa66');
              t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 500);
              this.earthQuakeStunUntil = time + 500;
              if (this.earthQuakeMagmified) {
                t.lavaRockBurnUntil = Math.max(t.lavaRockBurnUntil, time + 1500);
              }
            }
          }
        }
      } else if (this.earthQuakeSprite && time >= this.earthQuakeExpiry) {
        this.earthQuakeSprite.destroy(); this.earthQuakeSprite = null;
        this.earthQuakeMagmified = false;
      }

      // Tsunami waves (F+ upgrade)
      for (let ti = this.earthTsunamiWaves.length - 1; ti >= 0; ti--) {
        const wave = this.earthTsunamiWaves[ti];
        wave.sprite.x += wave.vx * (delta / 1000);
        wave.sprite.y += wave.vy * (delta / 1000);
        if (time >= wave.expiresAt || wave.sprite.x < -100 || wave.sprite.x > W + 100 || wave.sprite.y < -100 || wave.sprite.y > H + 100) {
          wave.sprite.destroy();
          this.earthTsunamiWaves.splice(ti, 1);
          continue;
        }
        // Damage enemies on contact (owner-aware: quake waves can hurt the player)
        const waveOwner = wave.owner ?? 'player';
        const waveDamage = wave.owner ? 12 : 35; // quake waves deal less damage
        const waveHitRadius = wave.owner ? 40 : 55;
        const waveTargets = waveOwner === 'player' ? (this.enemies as Fighter[]) : [this.player as Fighter];
        for (const t of waveTargets) {
          if (!t.active || t.hp <= 0) continue;
          const wd = Phaser.Math.Distance.Between(wave.sprite.x, wave.sprite.y, t.x, t.y);
          if (wd < waveHitRadius) {
            t.takeDamage(waveDamage);
            this.spawnHitFlash(t.x, t.y, 0x88ddff);
            if (!wave.owner) this.showFloatingText(t.x, t.y - 20, '🌊 TSUNAMI 35', '#88ddff');
            const tb = t.body as Phaser.Physics.Arcade.Body;
            tb.setVelocity(wave.vx * 0.8, wave.vy * 0.8);
            t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 500);
            wave.sprite.destroy();
            this.earthTsunamiWaves.splice(ti, 1);
            break;
          }
        }
      }

      // Golem AI
      if (this.earthGolemActive) {
        if (this.earthGolemHp <= 0 || time >= this.earthGolemUntil) {
          this.endEarthGolem(true);
        } else {
          // Damage sharing: incoming player damage is intercepted in takeDamage via damageAbsorber
          this.updateGolemAI(true, time, delta);
        }
      }

      // E+ Shield Splinter: throb visual
      if (this.earthSplinterHolding && this.earthSplinterReady && this.earthShieldSprite) {
        const t2 = (Math.sin(time / 100) + 1) / 2; // oscillate 0→1
        const scale = 0.9 + t2 * 0.3;
        this.earthShieldSprite.setScale(scale);
        this.earthShieldSprite.setFillStyle(0xff2222);
      } else if (this.earthShieldSprite && !this.earthSplinterHolding) {
        this.earthShieldSprite.setScale(1);
      }

      // Q+ Golem fusion: charge bar visual
      if (this.earthGolemFuseHolding && this.earthGolemFuseChargeVisual) {
        const holdPct = Math.min(1, (time - this.earthGolemFuseHoldStart) / 5000);
        this.earthGolemFuseChargeVisual.setRadius(10 + holdPct * 20);
        this.earthGolemFuseChargeVisual.setPosition(this.player.x, this.player.y - 36);
      }

      // Q+ Golem Fused: per-frame handling
      if (this.earthGolemFused) {
        if (this.earthGolemFusedHp <= 0 || time >= this.earthGolemFusedUntil) {
          this.exitGolemFusion(time);
        } else {
          // Update fused sprite to player position
          if (this.earthGolemFusedSprite) {
            this.earthGolemFusedSprite.setPosition(this.player.x, this.player.y);
          }
          if (this.earthGolemFusedHpLabel) {
            this.earthGolemFusedHpLabel.setPosition(this.player.x, this.player.y - 36);
            this.earthGolemFusedHpLabel.setText(`🗿 ${Math.ceil(this.earthGolemFusedHp)}/100`);
          }
          // Fused self-repair
          if (this.earthGolemFusedRepairHolding && time >= this.earthGolemFusedRepairEnd) {
            this.earthGolemFusedRepairHolding = false;
            this.earthGolemFusedHp = Math.min(this.earthGolemFusedMaxHp, this.earthGolemFusedHp + 25);
            this.showFloatingText(this.player.x, this.player.y - 30, '🔧 REPAIR +25', '#ccaa66');
          }
          // Fused fault wall cleanup
          if (this.earthGolemFusedFaultWallSprite && time >= this.earthGolemFusedFaultWallUntil) {
            this.earthGolemFusedFaultWallSprite.destroy(); this.earthGolemFusedFaultWallSprite = null;
          }
          // Wire fused HP as damageAbsorber
          this.player.damageAbsorber = (amount: number) => {
            if (!this.earthGolemFused) return false;
            this.earthGolemFusedHp = Math.max(0, this.earthGolemFusedHp - amount);
            this.spawnHitFlash(this.player.x, this.player.y, 0x665533);
            return true;
          };
        }
      }
    }

    // ── NPC earth ─────────────────────────────────────────────────
    if (this.npcElement.id === 'earth') {
      const npcBody = this.npc.body as Phaser.Physics.Arcade.Body;
      void npcBody;

      // Lazy-spawn initial NPC shield
      if (this.npcEarthShieldHp > 0 && !this.npcEarthShieldSprite && !this.npcEarthShieldBroken && !this.npcEarthGolemActive) {
        this.spawnEarthShield(false);
      }

      // Update NPC shield facing toward player
      if (this.npcEarthShieldHp > 0) {
        this.npcEarthShieldAngle = Math.atan2(this.player.y - this.npc.y, this.player.x - this.npc.x);
      }

      // Shield respawn
      if (!this.npcEarthGolemActive && this.npcEarthShieldBroken && this.npcEarthShieldRespawnAt > 0 && time >= this.npcEarthShieldRespawnAt) {
        this.spawnEarthShield(false);
        this.showFloatingText(this.npc.x, this.npc.y - 30, '🛡 SHIELD RESTORED', '#ccaa66');
      }
      if (this.npcEarthShieldSprite) this.updateEarthShieldSpritePosition(false);

      // NPC Repair
      if (this.npcEarthRepairActive) {
        if (time >= this.npcEarthRepairEnd) {
          this.npcEarthRepairActive = false;
          if (this.npcEarthGolemActive) {
            this.npcEarthGolemHp = Math.min(this.earthGolemMaxHp, this.npcEarthGolemHp + 50);
            this.showFloatingText(this.npc.x, this.npc.y - 30, '🔧 GOLEM REPAIR +50', '#ccaa66');
          } else if (this.npcEarthShieldBroken) {
            this.spawnEarthShield(false);
          } else if (this.npcEarthShieldHp < this.npcEarthShieldMaxHp) {
            this.npcEarthShieldHp = this.npcEarthShieldMaxHp;
          } else if (!this.npcEarthShieldEnhanced) {
            this.npcEarthShieldEnhanced = true;
            this.npcEarthShieldMaxHp = 125;
            this.npcEarthShieldHp = 125;
            if (this.npcEarthShieldSprite) this.npcEarthShieldSprite.setSize(55, 14);
          }
        }
      }

      // NPC Bash
      if (this.npcEarthBashActive) {
        if (time >= this.npcEarthBashEnd) {
          this.npcEarthBashActive = false;
          npcBody.setVelocity(0, 0);
        } else if (!this.npcEarthBashHitDealt) {
          const dist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
          if (dist < 70) {
            this.npcEarthBashHitDealt = true;
            if (this.npcEarthShieldHp > 0) {
              this.player.takeDamage(30);
              this.spawnHitFlash(this.player.x, this.player.y, 0x887755);
              this.showFloatingText(this.player.x, this.player.y - 20, '🛡 BASH 30', '#ccaa66');
            } else {
              this.player.takeDamage(15);
              this.spawnHitFlash(this.player.x, this.player.y, 0x887755);
              this.showFloatingText(this.player.x, this.player.y - 20, '🗡 STAB 15', '#aa8844');
            }
          }
        }
      }

      // NPC orbiting rocks
      this.npcEarthRockOrbitAngle += delta * 0.0028;
      const npcRockCount = this.npcEarthRocks.length;
      for (let nri = 0; nri < npcRockCount; nri++) {
        const rock = this.npcEarthRocks[nri];
        const ang = this.npcEarthRockOrbitAngle + nri * (Math.PI * 2 / npcRockCount);
        rock.sprite.setPosition(this.npc.x + Math.cos(ang) * 52, this.npc.y + Math.sin(ang) * 52);
        if (time >= rock.hitCdUntil) {
          const d = Phaser.Math.Distance.Between(rock.sprite.x, rock.sprite.y, this.player.x, this.player.y);
          if (d < 22) {
            this.player.takeDamage(8);
            this.spawnHitFlash(this.player.x, this.player.y, 0x887755);
            this.showFloatingText(this.player.x, this.player.y - 20, '🪨 8', '#aa8844');
            rock.hitCdUntil = time + 500;
          }
        }
      }
      for (let i = this.npcEarthLaunchedRocks.length - 1; i >= 0; i--) {
        const lr = this.npcEarthLaunchedRocks[i];
        lr.sprite.x += lr.vx * (delta / 1000);
        lr.sprite.y += lr.vy * (delta / 1000);
        const d = Phaser.Math.Distance.Between(lr.sprite.x, lr.sprite.y, this.player.x, this.player.y);
        const hitWall = lr.sprite.x < 20 || lr.sprite.x > W - 20 || lr.sprite.y < 20 || lr.sprite.y > H - 20;
        const expired = time - lr.spawnedAt > 1200;
        if (d < 28) {
          this.player.takeDamage(40);
          this.spawnHitFlash(this.player.x, this.player.y, 0x887755);
          this.showFloatingText(this.player.x, this.player.y - 20, '🪨 LAUNCH STUN 40', '#ffcc44');
          this.playerEarthStunnedUntil = Math.max(this.playerEarthStunnedUntil, time + 3000);
          lr.sprite.destroy();
          this.npcEarthLaunchedRocks.splice(i, 1);
        } else if (hitWall || expired) {
          lr.sprite.destroy();
          this.npcEarthLaunchedRocks.splice(i, 1);
        }
      }

      // NPC Quake zone
      if (this.npcEarthQuakeSprite && time < this.npcEarthQuakeExpiry) {
        this.npcEarthQuakeTickAccum += delta;
        if (this.npcEarthQuakeTickAccum >= 750) {
          this.npcEarthQuakeTickAccum -= 750;
          const d = Phaser.Math.Distance.Between(this.npcEarthQuakeX, this.npcEarthQuakeY, this.player.x, this.player.y);
          if (d < 80 && time > (this.npcEarthQuakeStunUntil ?? 0) && Math.random() < 0.35) {
            this.player.takeDamage(5);
            this.spawnHitFlash(this.player.x, this.player.y, 0x887755);
            this.showFloatingText(this.player.x, this.player.y - 20, '⚡ TRIP 5', '#ccaa66');
            this.playerEarthStunnedUntil = Math.max(this.playerEarthStunnedUntil, time + 500);
            this.npcEarthQuakeStunUntil = time + 500;
          }
        }
      } else if (this.npcEarthQuakeSprite && time >= this.npcEarthQuakeExpiry) {
        this.npcEarthQuakeSprite.destroy(); this.npcEarthQuakeSprite = null;
      }

      // NPC Golem AI
      if (this.npcEarthGolemActive) {
        if (this.npcEarthGolemHp <= 0 || time >= this.npcEarthGolemUntil) {
          this.endEarthGolem(false);
        } else {
          this.updateGolemAI(false, time, delta);
        }
      }

      // React to npcCastId for earth abilities (signals from doEarthAbilities)
      if (this.npcCastId === 'bash') {
        // Launch a rock if shield is active and one is within ±45° of shield angle
        let npcLaunchedRock = false;
        if (this.npcEarthShieldHp > 0 && this.npcEarthRocks.length > 0) {
          for (let i = this.npcEarthRocks.length - 1; i >= 0; i--) {
            const rock = this.npcEarthRocks[i];
            const rockAng = Math.atan2(rock.sprite.y - this.npc.y, rock.sprite.x - this.npc.x);
            const diff = Math.abs(Phaser.Math.Angle.ShortestBetween(
              Phaser.Math.RadToDeg(rockAng),
              Phaser.Math.RadToDeg(this.npcEarthShieldAngle)
            ));
            if (diff <= 45) {
              this.launchEarthRock(false, i);
              npcLaunchedRock = true;
              break;
            }
          }
        }
        if (!npcLaunchedRock) {
          const dx = this.player.x - this.npc.x;
          const dy = this.player.y - this.npc.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          this.performEarthBash(false, this.npc.x + (dx / len) * 10, this.npc.y + (dy / len) * 10);
        }
      }
      if (this.npcCastId === 'rock-dance' && this.npcEarthRocks.length === 0) {
        for (let i = 0; i < 4; i++) this.spawnEarthRock(false, i * Math.PI / 2);
        this.showFloatingText(this.npc.x, this.npc.y - 30, '🪨 ROCK DANCE', '#ccaa66');
      }
      if (this.npcCastId === 'quake') {
        const qx = this.player.x + Phaser.Math.Between(-60, 60);
        const qy = this.player.y + Phaser.Math.Between(-60, 60);
        if (this.npcEarthQuakeSprite) this.npcEarthQuakeSprite.destroy();
        this.npcEarthQuakeSprite = this.add.circle(qx, qy, 80, 0x887755, 0.2).setDepth(4).setStrokeStyle(2, 0xccaa66, 0.8);
        this.npcEarthQuakeX = qx; this.npcEarthQuakeY = qy;
        this.npcEarthQuakeExpiry = time + 5000;
        this.npcEarthQuakeTickAccum = 0;
        this.showFloatingText(qx, qy, '⛰ QUAKE', '#ccaa66');
      }
      if (this.npcCastId === 'repair') {
        this.npcEarthRepairActive = true;
        this.npcEarthRepairEnd = time + 3000;
        this.showFloatingText(this.npc.x, this.npc.y - 30, '🔧 REPAIR', '#ccaa66');
      }
      if (this.npcCastId === 'golem-ritual') {
        if (this.npcEarthShieldHp > 0 && !this.npcEarthGolemActive) {
          this.spawnEarthGolem(false);
        }
      }
    }

    // ── NpcCastId earth dispatch (player-cast side) ────────────────
    if (this.elementId === 'earth' && this.playerEarthCastId) {
      if (this.playerEarthCastId === 'rock-dance' && this.earthRocks.length === 0) {
        for (let i = 0; i < 4; i++) this.spawnEarthRock(true, i * Math.PI / 2);
        this.showFloatingText(this.player.x, this.player.y - 30, '🪨 ROCK DANCE', '#ccaa66');
      }
      if (this.playerEarthCastId === 'quake') {
        const ptr2 = this.input.activePointer;
        const hasTectonic = this.hasUpgrade('f');
        const qRadius = hasTectonic ? 100 : 80;
        const qDuration = hasTectonic ? 6000 : 5000;
        const qColor = hasTectonic ? 0xffffff : 0x887755;
        const qStroke = hasTectonic ? 0xdddddd : 0xccaa66;
        if (this.earthQuakeSprite) this.earthQuakeSprite.destroy();
        this.earthQuakeSprite = this.add.circle(ptr2.worldX, ptr2.worldY, qRadius, qColor, 0.15).setDepth(4).setStrokeStyle(2, qStroke, 0.8);
        this.earthQuakeX = ptr2.worldX; this.earthQuakeY = ptr2.worldY;
        this.earthQuakeExpiry = time + qDuration;
        this.earthQuakeTickAccum = 0;
        this.earthQuakeMagmified = false;
        this.showFloatingText(ptr2.worldX, ptr2.worldY, hasTectonic ? '⛰ TECTONIC QUAKE' : '⛰ QUAKE', '#ccaa66');
        if (hasTectonic) {
          this.spawnTsunamiWaves();
        }
      }
      if (this.playerEarthCastId === 'golem-ritual') {
        if (this.earthShieldHp > 0 && !this.earthGolemActive) {
          // Click+: only removes front shield, keeps back shield
          if (this.hasUpgrade('click') && this.earthBackShieldHp > 0) {
            // Front shield consumed, back shield stays
            this.earthShieldHp = 0;
            this.earthShieldBroken = true;
            this.earthShieldRespawnAt = 0;
            if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
          }
          this.spawnEarthGolem(true);
        }
      }
      this.playerEarthCastId = null;
    }
  }

  private exitGolemFusion(time: number): void {
    this.earthGolemFused = false;
    this.player.damageAbsorber = null;
    // Restore pre-transform HP
    this.player.hp = Math.max(1, this.earthGolemFusedPreHp);
    // Restore player appearance
    this.player.setScale(1.0);
    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
    // Destroy fused visuals
    if (this.earthGolemFusedSprite) { this.earthGolemFusedSprite.destroy(); this.earthGolemFusedSprite = null; }
    if (this.earthGolemFusedHpLabel) { this.earthGolemFusedHpLabel.destroy(); this.earthGolemFusedHpLabel = null; }
    if (this.earthGolemFusedFaultWallSprite) { this.earthGolemFusedFaultWallSprite.destroy(); this.earthGolemFusedFaultWallSprite = null; }
    this.earthGolemFusedRepairHolding = false;
    // Shields respawn after 8s
    this.earthShieldBroken = true;
    this.earthShieldHp = 0;
    this.earthShieldRespawnAt = time + 8000;
    this.showFloatingText(this.player.x, this.player.y - 30, '🗿 FUSION ENDED', '#887755');
    // Break AoE on Q+break
    const ring = this.add.circle(this.player.x, this.player.y, 10, 0x887755, 0.8).setDepth(6);
    this.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    // Restore original ability bar labels
    const originalAbilities = this.playerElement.abilities;
    this.abilityBars.forEach((bar, idx) => {
      if (bar.lbl && idx < originalAbilities.length) {
        const ab = originalAbilities[idx];
        bar.lbl.setText(`[${ab.displayKey}] ${ab.name}`);
      }
    });
  }

  private spawnTsunamiWaves(): void {
    const { width: W, height: H } = this.scale;
    for (let ti = 0; ti < 2; ti++) {
      const horizontal = Math.random() < 0.5;
      let wx: number, wy: number, vx: number, vy: number;
      const speed = 420;
      if (horizontal) {
        const fromLeft = Math.random() < 0.5;
        wx = fromLeft ? -60 : W + 60;
        wy = Phaser.Math.Between(60, H - 60);
        vx = fromLeft ? speed : -speed;
        vy = 0;
      } else {
        const fromTop = Math.random() < 0.5;
        wx = Phaser.Math.Between(60, W - 60);
        wy = fromTop ? -60 : H + 60;
        vx = 0;
        vy = fromTop ? speed : -speed;
      }
      const wSpr = horizontal
        ? this.add.rectangle(wx, wy, 80, 200, 0x88ddff, 0.6).setDepth(5).setStrokeStyle(3, 0xaaeeff, 0.9)
        : this.add.rectangle(wx, wy, 200, 80, 0x88ddff, 0.6).setDepth(5).setStrokeStyle(3, 0xaaeeff, 0.9);
      this.earthTsunamiWaves.push({ sprite: wSpr, vx, vy, expiresAt: this.time.now + 4000 });
    }
    this.showFloatingText(W / 2, H / 2 - 80, '🌊 TSUNAMI!', '#88ddff');
  }

  // Quake perk (Gravity): spawn a single smaller tsunami wave radiating from an impact point
  private spawnQuakeWave(owner: 'player' | 'npc', impactX: number, impactY: number): void {
    const { width: W, height: H } = this.scale;
    // Push outward from impact toward either horizontal or vertical edge
    const horizontal = Math.random() < 0.5;
    let vx = 0, vy = 0;
    const speed = 300;
    if (horizontal) { vx = impactX < W / 2 ? speed : -speed; }
    else             { vy = impactY < H / 2 ? speed : -speed; }
    const wSpr = horizontal
      ? this.add.rectangle(impactX, impactY, 60, 120, 0x8844cc, 0.55).setDepth(5).setStrokeStyle(2, 0xcc88ff, 0.8)
      : this.add.rectangle(impactX, impactY, 120, 60, 0x8844cc, 0.55).setDepth(5).setStrokeStyle(2, 0xcc88ff, 0.8);
    this.earthTsunamiWaves.push({ sprite: wSpr, vx, vy, expiresAt: this.time.now + 3000, owner });
    this.showFloatingText(impactX, impactY - 20, '🌊 QUAKE', '#cc88ff');
  }

  private spawnWardHex(cx: number, cy: number, consumedCount: number, owner: 'player' | 'npc'): void {
    const radius = 150;
    const duration = 2000 * consumedCount;
    const gfx = this.add.graphics().setDepth(5);
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      points.push(new Phaser.Geom.Point(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
    }
    gfx.lineStyle(3, 0xccbb55, 0.9);
    gfx.fillStyle(0xccbb55, 0.08);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < 6; i++) gfx.lineTo(points[i].x, points[i].y);
    gfx.closePath();
    gfx.strokePath();
    gfx.fillPath();
    this.tweens.add({ targets: gfx, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
    const ownerSummons = owner === 'player' ? this.playerSoulSummons : this.npcSoulSummons;
    const summonAuras = ownerSummons.map((s) => {
      const arc = this.add.circle(s.sprite.x, s.sprite.y, 14, 0xccbb55, 0.35).setDepth(4);
      this.tweens.add({ targets: arc, alpha: 0.1, yoyo: true, repeat: -1, duration: 500 });
      return { arc, summon: s };
    });
    const ownerAura = this.add.circle(cx, cy, 18, 0xccbb55, 0.35).setDepth(4);
    this.tweens.add({ targets: ownerAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 500 });
    this.soulWardHexes.push({ gfx, expiresAt: this.time.now + duration, x: cx, y: cy, radius, owner, ownerAura, summonAuras });
    this.showFloatingText(cx, cy - 30, `🔶 WARD x${consumedCount}`, '#ccbb55');
  }

  private handleEarthInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void delta;
    const playerCtx = this.buildPlayerContext(mouseX, mouseY);

    // ── Golem Fused Form (Q+ upgrade) ─────────────────────────────
    if (this.earthGolemFused) {
      // Click: Punch (close range, 2s cd)
      if (pointer.isDown && !this.pointerWasDown) {
        if (time >= this.earthGolemFusedPunchCdUntil) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (dist < 90) {
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0x665533);
            this.showFloatingText(this.npc.x, this.npc.y - 20, '👊 GOLEM PUNCH 20', '#ccaa66');
            this.earthGolemFusedPunchCdUntil = time + 2000;
          } else {
            this.showFloatingText(this.player.x, this.player.y - 20, 'Too far!', '#888888');
          }
        }
      }
      // E: Self-Repair (slow 3s, then +25 HP)
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        if (!this.earthGolemFusedRepairHolding) {
          this.earthGolemFusedRepairHolding = true;
          this.earthGolemFusedRepairEnd = time + 3000;
          // 20% speed during repair
          this.showFloatingText(this.player.x, this.player.y - 30, '🔧 REPAIRING...', '#ccaa66');
        }
      }
      // R: Pound (AoE, 10s cd)
      if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
        if (time >= this.earthGolemFusedPoundCdUntil) {
          let poundHit = false;
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
            if (dist < 100) {
              t.takeDamage(45);
              this.spawnHitFlash(t.x, t.y, 0x665533);
              this.showFloatingText(t.x, t.y - 20, '💥 GOLEM POUND 45', '#ccaa66');
              t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 600);
              poundHit = true;
            }
          }
          if (poundHit) {
            const ring = this.add.circle(this.player.x, this.player.y, 10, 0x665533, 0.8).setDepth(6);
            this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
            this.earthGolemFusedPoundCdUntil = time + 10000;
          } else {
            this.showFloatingText(this.player.x, this.player.y - 20, 'Too far!', '#888888');
          }
        }
      }
      // F: Fault (wall + damage, 5s cd)
      if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
        if (time >= this.earthGolemFusedFaultCdUntil) {
          const midX = (this.player.x + this.npc.x) / 2;
          const midY = (this.player.y + this.npc.y) / 2;
          if (this.earthGolemFusedFaultWallSprite) this.earthGolemFusedFaultWallSprite.destroy();
          this.earthGolemFusedFaultWallSprite = this.add.rectangle(midX, midY, 140, 18, 0x665533).setDepth(7).setStrokeStyle(2, 0xbbaa77);
          this.earthGolemFusedFaultWallUntil = time + 1500;
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            t.takeDamage(25);
            this.spawnHitFlash(t.x, t.y, 0x665533);
          }
          this.showFloatingText(midX, midY - 20, '⛰ FAULT LINE 25', '#ccaa66');
          this.earthGolemFusedFaultCdUntil = time + 5000;
        }
      }
      // Q: Break (exit + 25 AoE)
      if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
          if (dist < 120) {
            t.takeDamage(25);
            this.spawnHitFlash(t.x, t.y, 0x665533);
            this.showFloatingText(t.x, t.y - 20, '💥 BREAK 25', '#ccaa66');
          }
        }
        this.exitGolemFusion(time);
      }
      return; // block normal inputs while fused
    }

    // ── Q+ Golem Fusion hold charge ────────────────────────────────
    if (this.hasUpgrade('q')) {
      if (this.qKey.isDown && !this.earthGolemFuseHolding && !this.earthGolemActive && !this.earthGolemFused) {
        this.earthGolemFuseHolding = true;
        this.earthGolemFuseHoldStart = time;
        if (this.earthGolemFuseChargeVisual) this.earthGolemFuseChargeVisual.destroy();
        this.earthGolemFuseChargeVisual = this.add.circle(this.player.x, this.player.y - 36, 10, 0x665533, 0.7).setDepth(14);
        this.tweens.add({ targets: this.earthGolemFuseChargeVisual, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
      }
      if (!this.qKey.isDown && this.earthGolemFuseHolding) {
        const heldMs = time - this.earthGolemFuseHoldStart;
        if (this.earthGolemFuseChargeVisual) { this.earthGolemFuseChargeVisual.destroy(); this.earthGolemFuseChargeVisual = null; }
        this.earthGolemFuseHolding = false;
        if (heldMs >= 5000) {
          // Long hold: enter golem fusion
          // Enter golem fusion
          this.earthGolemFusedPreHp = this.player.hp;
          this.earthGolemFused = true;
          this.earthGolemFusedHp = this.earthGolemFusedMaxHp;
          this.earthGolemFusedUntil = time + 10000;
          this.earthGolemFusedPunchCdUntil = 0;
          this.earthGolemFusedPoundCdUntil = 0;
          this.earthGolemFusedFaultCdUntil = 0;
          this.earthGolemFusedRepairHolding = false;
          // Remove shields
          this.earthShieldHp = 0;
          this.earthShieldBroken = true;
          this.earthShieldRespawnAt = 0; // will be set on exit
          if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
          if (this.earthBackShieldHp > 0) {
            this.earthBackShieldHp = 0;
            if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
          }
          // Make player a square
          (this.player.body as Phaser.Physics.Arcade.Body).setSize(44, 44, true);
          // Spawn fused sprite overlay
          if (this.earthGolemFusedSprite) this.earthGolemFusedSprite.destroy();
          this.earthGolemFusedSprite = this.add.rectangle(this.player.x, this.player.y, 44, 44, 0x665533, 0.9)
            .setDepth(8).setStrokeStyle(2, 0xbbaa77);
          if (this.earthGolemFusedHpLabel) this.earthGolemFusedHpLabel.destroy();
          this.earthGolemFusedHpLabel = this.add.text(this.player.x, this.player.y - 36, '🗿 100/100', {
            fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#ccaa66',
          }).setOrigin(0.5).setDepth(12);
          this.showFloatingText(this.player.x, this.player.y - 50, '🗿 GOLEM FUSION!', '#ccaa66');
          // Update ability bar labels to golem form names
          const golemLabels = ['[Click] Punch', '[E] Repair (Slow)', '[R] Pound', '[F] Fault Line', '[Q] Break'];
          this.abilityBars.forEach((bar, idx) => {
            if (bar.lbl && idx < golemLabels.length) bar.lbl.setText(golemLabels[idx]);
          });
        } else {
          // Short tap: cast normal golem ritual
          if (!this.earthGolemActive && this.earthShieldHp > 0) {
            if (this.player.castAbility('golem-ritual', playerCtx)) {
              this.playerEarthCastId = 'golem-ritual';
            }
          } else if (!this.earthGolemActive) {
            this.showFloatingText(this.player.x, this.player.y - 30, 'NEED SHIELD', '#ff8844');
          }
        }
      }
    }

    // ── Normal input (skip if golem fusion holding) ────────────────

    // Click: Rock Launch (if shield active + rock in front) OR Bash
    if (pointer.isDown && !this.earthBashActive) {
      if (this.player.castAbility('bash', playerCtx)) {
        let didLaunch = false;
        // Click+ back shield cannot launch rocks — only front shield can
        if (this.earthShieldHp > 0 && this.earthRocks.length > 0) {
          for (let i = this.earthRocks.length - 1; i >= 0; i--) {
            const rock = this.earthRocks[i];
            const rockAng = Math.atan2(rock.sprite.y - this.player.y, rock.sprite.x - this.player.x);
            const diff = Math.abs(Phaser.Math.Angle.ShortestBetween(
              Phaser.Math.RadToDeg(rockAng),
              Phaser.Math.RadToDeg(this.earthShieldAngle)
            ));
            if (diff <= 45) {
              this.launchEarthRock(true, i);
              didLaunch = true;
              break;
            }
          }
        }
        if (!didLaunch) {
          this.performEarthBash(true, mouseX, mouseY);
        }
        this.playerEarthCastId = null;
      }
    }

    // E: Repair (E+ hold = Shield Splinter)
    if (this.hasUpgrade('e')) {
      if (this.eKey.isDown && !this.earthSplinterHolding) {
        this.earthSplinterHolding = true;
        this.earthSplinterHoldStart = time;
        this.earthSplinterReady = false;
      }
      if (this.eKey.isDown && this.earthSplinterHolding && !this.earthSplinterReady && time - this.earthSplinterHoldStart >= 2000) {
        this.earthSplinterReady = true;
        this.showFloatingText(this.player.x, this.player.y - 30, '💥 SPLINTER READY', '#ff4444');
      }
      if (!this.eKey.isDown && this.earthSplinterHolding) {
        const heldMs = time - this.earthSplinterHoldStart;
        this.earthSplinterHolding = false;
        this.earthSplinterReady = false;
        if (this.earthShieldSprite) this.earthShieldSprite.setScale(1).setFillStyle(this.hasUpgrade('click') ? 0x888888 : 0x887755);
        if (heldMs >= 2000 && this.earthShieldHp > 0) {
          // Explode: AoE = 1/3 combined shield HP
          const totalHp = this.earthShieldHp + (this.hasUpgrade('click') ? this.earthBackShieldHp : 0);
          const aoeDmg = Math.round(totalHp / 3);
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (dist < 120) {
            this.npc.takeDamage(aoeDmg);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xff2222);
            this.showFloatingText(this.npc.x, this.npc.y - 20, `💥 SPLINTER ${aoeDmg}`, '#ff4444');
          }
          const ring = this.add.circle(this.player.x, this.player.y, 10, 0xff2222, 0.8).setDepth(6);
          this.tweens.add({ targets: ring, scaleX: 14, scaleY: 14, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
          // Launch a shield projectile forward
          const ang = this.earthShieldAngle;
          const projSpr = this.add.rectangle(this.player.x, this.player.y, 20, 8, 0xcccccc).setDepth(8).setRotation(ang + Math.PI / 2);
          const pvx = Math.cos(ang) * 600;
          const pvy = Math.sin(ang) * 600;
          const projSpawnedAt = time;
          const projRef = { x: this.player.x, y: this.player.y, spr: projSpr, hit: false, spawnedAt: projSpawnedAt };
          const projTimer = this.time.addEvent({ delay: 16, loop: true, callback: () => {
            if (projRef.hit || this.time.now - projRef.spawnedAt > 1500) {
              if (!projRef.hit) projSpr.destroy();
              projTimer.remove();
              return;
            }
            projRef.x += pvx * 0.016;
            projRef.y += pvy * 0.016;
            projSpr.setPosition(projRef.x, projRef.y);
            const pd = Phaser.Math.Distance.Between(projRef.x, projRef.y, this.npc.x, this.npc.y);
            if (pd < 28) {
              projRef.hit = true;
              this.npc.takeDamage(20);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xcccccc);
              this.showFloatingText(this.npc.x, this.npc.y - 20, '🛡 SHARD 20', '#cccccc');
              this.earthSplinterRepairFast = true; // next break → 4s repair
              projSpr.destroy();
              projTimer.remove();
            }
          }});
          // Break the shield(s)
          this.breakEarthShield(true);
          if (this.hasUpgrade('click') && this.earthBackShieldHp > 0) {
            this.earthBackShieldHp = 0;
            if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
            if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
          }
        } else {
          // Short hold: trigger Repair as normal
          if (this.player.castAbility('repair', playerCtx)) {
            this.earthRepairActive = true;
            this.earthRepairEnd = time + 3000;
            if (this.earthRepairAura) this.earthRepairAura.destroy();
            this.earthRepairAura = this.add.circle(this.player.x, this.player.y, 28, 0x887755, 0.4).setDepth(6);
            this.tweens.add({ targets: this.earthRepairAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 400 });
            this.showFloatingText(this.player.x, this.player.y - 30, '🔧 REPAIR', '#ccaa66');
          }
        }
      }
    } else {
      // Base E: Repair
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        if (this.player.castAbility('repair', playerCtx)) {
          this.earthRepairActive = true;
          this.earthRepairEnd = time + 3000;
          if (this.earthRepairAura) this.earthRepairAura.destroy();
          this.earthRepairAura = this.add.circle(this.player.x, this.player.y, 28, 0x887755, 0.4).setDepth(6);
          this.tweens.add({ targets: this.earthRepairAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 400 });
          this.showFloatingText(this.player.x, this.player.y - 30, '🔧 REPAIR', '#ccaa66');
        }
      }
    }

    // R: Rock Dance
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      if (this.player.castAbility('rock-dance', playerCtx)) {
        this.playerEarthCastId = 'rock-dance';
      }
    }

    // F: Quake
    if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
      if (this.player.castAbility('quake', playerCtx)) {
        this.playerEarthCastId = 'quake';
      }
    }

    // Q: Golem Ritual (Q+ uses hold mechanic above; base Q is instant)
    if (!this.hasUpgrade('q') && Phaser.Input.Keyboard.JustDown(this.qKey)) {
      if (this.earthShieldHp > 0 && !this.earthGolemActive) {
        if (this.player.castAbility('golem-ritual', playerCtx)) {
          this.playerEarthCastId = 'golem-ritual';
        }
      } else if (!this.earthGolemActive) {
        this.showFloatingText(this.player.x, this.player.y - 30, 'NEED SHIELD', '#ff8844');
      }
    }
  }

  // ══ Metal ability implementations ════════════════════════════════

  private handleMetalInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    if (this.playerMetalTaseredUntil > time) return; // stunned

    const playerCtx = this.buildPlayerContext(mouseX, mouseY);

    // Click: Slash
    if (pointer.isDown && !this.pointerWasDown) {
      this.player.castAbility('metal-slash', playerCtx);
    }

    // E: Fire at Will
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.player.castAbility('metal-fire-at-will', playerCtx);
    }

    // R: Reinforce (weapon picker)
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      if (!this.metalReinforcementMenuOpen) {
        this.player.castAbility('metal-reinforce', playerCtx);
      }
    }

    // F: Chain Tether
    if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
      this.player.castAbility('metal-chain-tether', playerCtx);
    }

    // Q: Blood Clot (or Recast Clot while armor is active)
    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      if (this.hasUpgrade('q') && this.metalArmorActive) {
        // Recast: consume puddles to heal armor (no cooldown)
        const myPuddles = this.metalBloodPuddles.filter(p => p.owner === 'player');
        if (myPuddles.length > 0) {
          for (const p of myPuddles) p.sprite.destroy();
          this.metalBloodPuddles = this.metalBloodPuddles.filter(p => p.owner !== 'player');
          this.metalArmorHp += myPuddles.length * 20;
          this.showFloatingText(this.player.x, this.player.y - 44, `🛡️ ARMOR RECHARGED (+${myPuddles.length * 20})`, '#ff4466');
        }
      } else {
        this.player.castAbility('metal-blood-clot', playerCtx);
      }
    }
  }

  private doMetalSlash(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;
    const _metalSlashTargets = owner === 'player' ? this.enemies : [this.player];

    const dx = tx - caster.x, dy = ty - caster.y;
    const ang = Math.atan2(dy, dx);
    const arcRadius = 80;

    // Sword arc graphic
    const gfx = this.add.graphics().setDepth(9);
    gfx.setPosition(caster.x, caster.y);
    gfx.lineStyle(5, 0xccddee, 0.9);
    gfx.beginPath();
    gfx.arc(0, 0, arcRadius, ang - Math.PI / 2.5, ang + Math.PI / 2.5, false);
    gfx.strokePath();
    // Blade tip flash
    const tipX = caster.x + Math.cos(ang) * arcRadius;
    const tipY = caster.y + Math.sin(ang) * arcRadius;
    const tip = this.add.circle(tipX, tipY, 5, 0xffffff, 0.9).setDepth(9);
    this.tweens.add({ targets: [gfx, tip], alpha: 0, duration: 260, onComplete: () => { gfx.destroy(); tip.destroy(); } });

    // Deal damage if close enough
    for (const target of _metalSlashTargets) {
      if (!target.active || target.hp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
      if (dist <= 90) {
        const dmg = 25;
        target.takeDamage(dmg);
        this.spawnHitFlash(target.x, target.y, 0xaabbcc);
        this.applyMetalAggressiveBleeding(owner, 5000);
        this.showFloatingText(caster.x, caster.y - 36, '🗡️ SLASH', '#aabbcc');
        const kbDx = target.x - caster.x, kbDy = target.y - caster.y;
        const kbLen = Math.sqrt(kbDx * kbDx + kbDy * kbDy) || 1;
        (target.body as Phaser.Physics.Arcade.Body).setVelocity((kbDx / kbLen) * 350, (kbDy / kbLen) * 350);
        this.time.delayedCall(200, () => {
          if (target.active) (target.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        });
      }
    }
  }

  private doMetalFireAtWill(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;
    const arsenal = owner === 'player' ? this.metalArsenal : this.npcMetalArsenal;

    if (arsenal.length === 0) return;

    this.showFloatingText(caster.x, caster.y - 44, '🔫 FIRE AT WILL!', '#ffddaa');

    arsenal.forEach((gunId, i) => {
      this.time.delayedCall(i * 130, () => {
        if (!caster.active) return;
        const target = owner === 'player' ? this.getNearestEnemy(caster.x, caster.y) : this.player;
        if (!target.active) return;
        this.fireMetalGun(gunId, owner, target.x, target.y);
      });
    });
  }

  private fireMetalGun(gunId: string, owner: 'player' | 'npc', targetX: number, targetY: number): void {
    const caster = owner === 'player' ? this.player : this.npc;
    const target = owner === 'player' ? this.getNearestEnemy(caster.x, caster.y) : this.player;
    const dx = targetX - caster.x, dy = targetY - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;

    // Helper: perpendicular-distance hitscan check (30px tolerance)
    const hitscanHit = (sUx: number, sUy: number, tolerance = 30): boolean => {
      const perp = Math.abs((target.x - caster.x) * sUy - (target.y - caster.y) * sUx);
      const dot  = (target.x - caster.x) * sUx + (target.y - caster.y) * sUy;
      return perp <= tolerance && dot > 0;
    };

    const drawLine = (sUx: number, sUy: number, color: number, range = 900, lw = 2): void => {
      const gfx = this.add.graphics().setDepth(8);
      gfx.lineStyle(lw, color, 1);
      gfx.beginPath();
      gfx.moveTo(caster.x, caster.y);
      gfx.lineTo(caster.x + sUx * range, caster.y + sUy * range);
      gfx.strokePath();
      this.tweens.add({ targets: gfx, alpha: 0, duration: 180, onComplete: () => gfx.destroy() });
    };

    switch (gunId) {
      case 'flintlock': {
        drawLine(ux, uy, 0x888877, 900, 3);
        if (hitscanHit(ux, uy)) {
          target.takeDamage(20);
          this.spawnHitFlash(target.x, target.y, 0x887766);
          this.spawnMetalBloodPuddle(target.x, target.y, owner);
        }
        break;
      }
      case 'rifle': {
        for (let i = 0; i < 3; i++) {
          this.time.delayedCall(i * 150, () => {
            if (!caster.active || !target.active) return;
            drawLine(ux, uy, 0xaabb99, 900, 2);
            const perp = Math.abs((target.x - caster.x) * uy - (target.y - caster.y) * ux);
            const dot  = (target.x - caster.x) * ux + (target.y - caster.y) * uy;
            if (perp <= 30 && dot > 0) {
              target.takeDamage(8);
              this.spawnHitFlash(target.x, target.y, 0xaabb99);
            }
          });
        }
        break;
      }
      case 'grenade-launcher': {
        const spr = this.add.circle(caster.x, caster.y, 10, 0x445544, 0.9)
          .setStrokeStyle(2, 0x88aa88).setDepth(8);
        this.metalGunProjectiles.push({
          sprite: spr, x: caster.x, y: caster.y,
          vx: ux * 400, vy: uy * 400 - 80,
          owner, type: 'grenade', damage: 35, explodeRadius: 80, active: true,
        });
        break;
      }
      case 'flamethrower': {
        const baseX = caster.x + ux * 40, baseY = caster.y + uy * 40;
        const baseAng = Math.atan2(uy, ux);
        for (let i = 0; i < 7; i++) {
          const spread = (Math.random() - 0.5) * 1.4;
          const fAng = baseAng + spread;
          const spd = 200 + Math.random() * 120;
          const spr = this.add.circle(baseX, baseY, 7, 0xff5500, 0.85 - Math.random() * 0.3).setDepth(8);
          const expAt = this.time.now + 550 + Math.random() * 150;
          this.metalGunProjectiles.push({
            sprite: spr, x: baseX, y: baseY,
            vx: Math.cos(fAng) * spd, vy: Math.sin(fAng) * spd,
            owner, type: 'flame', damage: 8, active: true, expiresAt: expAt,
          });
        }
        break;
      }
      case 'shotgun': {
        const baseAng = Math.atan2(uy, ux);
        for (let i = 0; i < 5; i++) {
          const spread = (i - 2) * (Math.PI / 8);
          const sAng = baseAng + spread;
          const sUx = Math.cos(sAng), sUy = Math.sin(sAng);
          drawLine(sUx, sUy, 0x998855, 600, 2);
          if (hitscanHit(sUx, sUy, 38)) {
            target.takeDamage(10);
            this.spawnHitFlash(target.x, target.y, 0x998855);
          }
        }
        break;
      }
      case 'rpg': {
        const spr = this.add.circle(caster.x, caster.y, 8, 0xcc5511, 0.9)
          .setStrokeStyle(2, 0xff8844).setDepth(8);
        // Trail smoke
        const trail = this.add.circle(caster.x, caster.y, 5, 0x888888, 0.5).setDepth(7);
        this.tweens.add({ targets: trail, alpha: 0, scaleX: 2, scaleY: 2, duration: 300, onComplete: () => trail.destroy() });
        this.metalGunProjectiles.push({
          sprite: spr, x: caster.x, y: caster.y,
          vx: ux * 700, vy: uy * 700,
          owner, type: 'rpg', damage: 50, explodeRadius: 120, active: true,
        });
        break;
      }
      case 'taser': {
        const spr = this.add.circle(caster.x, caster.y, 8, 0xffee22, 0.9)
          .setStrokeStyle(2, 0xffffff, 0.8).setDepth(8);
        this.metalGunProjectiles.push({
          sprite: spr, x: caster.x, y: caster.y,
          vx: ux * 500, vy: uy * 500,
          owner, type: 'taser', damage: 15, active: true,
        });
        break;
      }
      case 'minigun': {
        const baseAng = Math.atan2(uy, ux);
        for (let i = 0; i < 30; i++) {
          this.time.delayedCall(i * 35, () => {
            if (!caster.active || !target.active) return;
            const spread = (Math.random() - 0.5) * (Math.PI * 2 / 3);
            const mAng = baseAng + spread;
            const mUx = Math.cos(mAng), mUy = Math.sin(mAng);
            const gfx = this.add.graphics().setDepth(8);
            gfx.lineStyle(1, 0xaabbcc, 0.7);
            gfx.beginPath();
            gfx.moveTo(caster.x, caster.y);
            gfx.lineTo(caster.x + mUx * 700, caster.y + mUy * 700);
            gfx.strokePath();
            this.tweens.add({ targets: gfx, alpha: 0, duration: 100, onComplete: () => gfx.destroy() });
            const mPerp = Math.abs((target.x - caster.x) * mUy - (target.y - caster.y) * mUx);
            const mDot  = (target.x - caster.x) * mUx + (target.y - caster.y) * mUy;
            if (mPerp <= 35 && mDot > 0) {
              target.takeDamage(1);
            }
          });
        }
        break;
      }
      case 'sniper': {
        // Charge-up telegraph then fire
        const chargeGfx = this.add.graphics().setDepth(7);
        chargeGfx.lineStyle(1, 0xffee44, 0.35);
        chargeGfx.beginPath();
        chargeGfx.moveTo(caster.x, caster.y);
        chargeGfx.lineTo(caster.x + ux * 1200, caster.y + uy * 1200);
        chargeGfx.strokePath();
        this.tweens.add({ targets: chargeGfx, alpha: 0.7, yoyo: true, repeat: 1, duration: 350, onComplete: () => chargeGfx.destroy() });
        this.showFloatingText(caster.x, caster.y - 30, '🎖️ Charging…', '#ffee44');
        this.time.delayedCall(700, () => {
          if (!caster.active || !target.active) return;
          const dx2 = target.x - caster.x, dy2 = target.y - caster.y;
          const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
          const sUx = dx2 / len2, sUy = dy2 / len2;
          drawLine(sUx, sUy, 0xffee22, 1200, 3);
          if (hitscanHit(sUx, sUy, 18)) {
            target.takeDamage(55);
            this.spawnHitFlash(target.x, target.y, 0xffee22);
            this.showFloatingText(target.x, target.y - 36, '🎖️ SNIPER HIT', '#ffee22');
          }
        });
        break;
      }
    }
  }

  private doMetalExplosion(x: number, y: number, radius: number, damage: number, owner: 'player' | 'npc'): void {
    // Visual ring
    const ring = this.add.circle(x, y, 10, 0xff5500, 0.85).setDepth(9);
    this.tweens.add({ targets: ring, scaleX: radius / 10, scaleY: radius / 10, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    const inner = this.add.circle(x, y, 6, 0xffcc44, 1).setDepth(10);
    this.tweens.add({ targets: inner, scaleX: 3, scaleY: 3, alpha: 0, duration: 200, onComplete: () => inner.destroy() });

    for (const target of (owner === 'player' ? this.enemies : [this.player])) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, target.x, target.y) <= radius) {
        target.takeDamage(damage);
        this.spawnHitFlash(target.x, target.y, 0xff5500);
        this.showFloatingText(x, y - 30, '💥 BOOM', '#ff8844');
      }
    }
  }

  private doMetalOpenReinforcementMenu(): void {
    if (this.metalReinforcementMenuOpen) return;

    const BASE_GUNS = ['flintlock', 'rifle', 'grenade-launcher', 'flamethrower', 'shotgun', 'rpg', 'taser', 'minigun'];
    const ALL_GUNS = this.hasUpgrade('r') ? [...BASE_GUNS, 'sniper'] : BASE_GUNS;
    const GUN_NAMES: Record<string, string> = {
      'flintlock': 'Flintlock', 'rifle': 'Rifle', 'grenade-launcher': 'Grenade Launcher',
      'flamethrower': 'Flamethrower', 'shotgun': 'Shotgun', 'rpg': 'RPG',
      'taser': 'Taser', 'minigun': 'Minigun', 'sniper': 'Sniper',
    };
    const GUN_EMOJIS: Record<string, string> = {
      'flintlock': '🔫', 'rifle': '🎯', 'grenade-launcher': '💣',
      'flamethrower': '🔥', 'shotgun': '🔱', 'rpg': '🚀',
      'taser': '⚡', 'minigun': '🌀', 'sniper': '🎖️',
    };
    const GUN_DESCS: Record<string, string> = {
      'flintlock':        'Hitscan — spawns blood puddle on hit (20 dmg)',
      'rifle':            '3 quick hitscan shots (8 dmg each)',
      'grenade-launcher': 'Arcing grenade — 35 dmg + AoE',
      'flamethrower':     '7 flame bursts in cone — 8 dmg each',
      'shotgun':          '5 shots in spread — 10 dmg each',
      'rpg':              'Fast rocket — 50 dmg + large AoE',
      'taser':            'Stuns enemy 2s — 15 dmg',
      'minigun':          '30 bullets wide cone — 1 dmg each',
      'sniper':           'Charges 0.7s then fires a powerful hitscan (55 dmg)',
    };

    const arsenalCap = this.hasUpgrade('e') ? 5 : 3;
    const notOwned = ALL_GUNS.filter(g => !this.metalArsenal.includes(g));
    const pool = notOwned.length >= 3 ? notOwned : ALL_GUNS;
    const choices = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);

    this.metalReinforcementMenuOpen = true;
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;
    const cardW = 180, cardH = 220, spacing = 200;

    const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0.6).setDepth(30).setInteractive();
    this.metalReinforcementButtons.push(overlay);

    const title = this.add.text(cx, cy - 160, '⚙️ Reinforce Arsenal', {
      fontSize: '22px', color: '#aabbcc', fontFamily: '"Arial Black", sans-serif',
    }).setOrigin(0.5).setDepth(31);
    this.metalReinforcementButtons.push(title);

    const slotsText = this.metalArsenal.length >= arsenalCap ? '(Oldest weapon replaced)' : `(${this.metalArsenal.length}/${arsenalCap} slots used)`;
    const sub = this.add.text(cx, cy - 128, slotsText, {
      fontSize: '13px', color: '#889aaa',
    }).setOrigin(0.5).setDepth(31);
    this.metalReinforcementButtons.push(sub);

    choices.forEach((gunId, i) => {
      const x = cx + (i - 1) * spacing;
      const y = cy;

      const bg = this.add.rectangle(x, y, cardW, cardH, 0x223344)
        .setStrokeStyle(2, 0x446688).setDepth(31).setInteractive();
      bg.on('pointerover', () => bg.setFillStyle(0x334455));
      bg.on('pointerout',  () => bg.setFillStyle(0x223344));

      const emojiLbl = this.add.text(x, y - 75, GUN_EMOJIS[gunId] ?? '?', { fontSize: '36px' }).setOrigin(0.5).setDepth(32);
      const nameLbl  = this.add.text(x, y - 28, GUN_NAMES[gunId] ?? gunId, {
        fontSize: '14px', color: '#ccddee', fontFamily: '"Arial Black", sans-serif',
      }).setOrigin(0.5).setDepth(32);
      const descLbl  = this.add.text(x, y + 16, GUN_DESCS[gunId] ?? '', {
        fontSize: '11px', color: '#8899aa', wordWrap: { width: cardW - 20 }, align: 'center',
      }).setOrigin(0.5).setDepth(32);

      bg.on('pointerdown', () => {
        if (this.metalArsenal.length >= arsenalCap) this.metalArsenal.shift();
        this.metalArsenal.push(gunId);
        this.showFloatingText(this.player.x, this.player.y - 44, `${GUN_EMOJIS[gunId]} ${GUN_NAMES[gunId]} ACQUIRED`, '#aabbcc');
        for (const obj of this.metalReinforcementButtons) {
          if ((obj as Phaser.GameObjects.GameObject).active) (obj as unknown as { destroy(): void }).destroy();
        }
        this.metalReinforcementButtons = [];
        this.metalReinforcementMenuOpen = false;
      });

      this.metalReinforcementButtons.push(bg, emojiLbl, nameLbl, descLbl);
    });
  }

  private doMetalNpcPickGun(): void {
    const ALL_GUNS = ['flintlock', 'rifle', 'grenade-launcher', 'flamethrower', 'shotgun', 'rpg', 'taser', 'minigun'];
    const notOwned = ALL_GUNS.filter(g => !this.npcMetalArsenal.includes(g));
    const pool = notOwned.length > 0 ? notOwned : ALL_GUNS;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (this.npcMetalArsenal.length >= 3) this.npcMetalArsenal.shift();
    this.npcMetalArsenal.push(chosen);
  }

  private doMetalChainTether(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;

    // F+: Blood Siphon — if aiming near an own-owned puddle, tether to it instead
    if (owner === 'player' && this.hasUpgrade('f')) {
      let closestPuddle: MetalBloodPuddle | null = null;
      let closestDist = 240;
      for (const puddle of this.metalBloodPuddles) {
        if (puddle.owner !== 'player') continue;
        const d = Phaser.Math.Distance.Between(tx, ty, puddle.x, puddle.y);
        if (d < closestDist) { closestDist = d; closestPuddle = puddle; }
      }
      if (closestPuddle) {
        this.metalBloodChainPuddle = closestPuddle;
        this.metalBloodChainAccum = 0;
        if (!this.metalBloodChainGraphic) this.metalBloodChainGraphic = this.add.graphics().setDepth(5);
        this.showFloatingText(caster.x, caster.y - 30, '🩸 BLOOD SIPHON', '#cc0000');
        return;
      }
    }

    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const spr = this.add.circle(caster.x, caster.y, 8, 0x889aaa, 0.9)
      .setStrokeStyle(2, 0xccddee).setDepth(8);
    this.metalChainProjectiles.push({
      sprite: spr, x: caster.x, y: caster.y,
      vx: (dx / len) * 520, vy: (dy / len) * 520,
      owner, active: true,
    });
    this.showFloatingText(caster.x, caster.y - 30, '⛓️ CHAIN!', '#aabbcc');
  }

  private doMetalBloodClot(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;

    const myPuddles = this.metalBloodPuddles.filter(p => p.owner === owner);
    const count = myPuddles.length;
    for (const p of myPuddles) p.sprite.destroy();
    this.metalBloodPuddles = this.metalBloodPuddles.filter(p => p.owner !== owner);

    const armorHp = 50 + count * 20;
    const duration = 8000 + count * 2000;

    this.showFloatingText(caster.x, caster.y - 44, `🛡️ BLOOD ARMOR (${armorHp} HP)`, '#ff4466');

    // Blood burst VFX
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const dot = this.add.circle(
        caster.x + Math.cos(ang) * 18, caster.y + Math.sin(ang) * 18,
        5, 0xcc0000, 0.9,
      ).setDepth(7);
      this.tweens.add({ targets: dot, x: dot.x + Math.cos(ang) * 40, y: dot.y + Math.sin(ang) * 40, alpha: 0, duration: 600, onComplete: () => dot.destroy() });
    }

    if (owner === 'player') {
      this.metalArmorActive = true;
      this.metalArmorHp = armorHp;
      this.metalArmorEnd = this.time.now + duration;
      if (this.metalArmorAura) this.metalArmorAura.destroy();
      this.metalArmorAura = this.add.circle(caster.x, caster.y, 40, 0xcc2244, 0.3)
        .setStrokeStyle(3, 0xff4466, 0.7).setDepth(3);
      this.tweens.add({ targets: this.metalArmorAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 500 });
      // Q+: Recast Clot — suspend the cooldown (it starts only when armor ends)
      if (this.hasUpgrade('q')) this.player.resetCooldown('metal-blood-clot');

      this.player.damageAbsorber = (amount: number) => {
        if (this.metalArmorReflecting) return false;
        if (!this.metalArmorActive || this.time.now > this.metalArmorEnd) {
          this.metalArmorActive = false; this.player.damageAbsorber = null; return false;
        }
        this.metalArmorHp -= amount;
        this.spawnDamageNumber(this.player.x, this.player.y - 20, amount);
        const reflected = Math.ceil(amount * 0.5);
        this.metalArmorReflecting = true;
        this.npc.takeDamage(reflected);
        this.metalArmorReflecting = false;
        this.spawnHitFlash(this.npc.x, this.npc.y, 0x882244);
        this.showFloatingText(this.npc.x, this.npc.y - 30, `↩ ${reflected} REFLECT`, '#ff8866');
        if (this.metalArmorHp <= 0) {
          this.metalArmorActive = false; this.player.damageAbsorber = null;
          this.showFloatingText(this.player.x, this.player.y - 36, '💔 ARMOR BROKEN', '#ff4466');
          if (this.metalArmorAura) { this.metalArmorAura.destroy(); this.metalArmorAura = null; }
        }
        return true;
      };
    } else {
      this.npcMetalArmorActive = true;
      this.npcMetalArmorHp = armorHp;
      this.npcMetalArmorEnd = this.time.now + duration;
      if (this.npcMetalArmorAura) this.npcMetalArmorAura.destroy();
      this.npcMetalArmorAura = this.add.circle(caster.x, caster.y, 40, 0xcc2244, 0.3)
        .setStrokeStyle(3, 0xff4466, 0.7).setDepth(3);
      this.tweens.add({ targets: this.npcMetalArmorAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 500 });

      this.npc.damageAbsorber = (amount: number) => {
        if (this.npcMetalArmorReflecting) return false;
        if (!this.npcMetalArmorActive || this.time.now > this.npcMetalArmorEnd) {
          this.npcMetalArmorActive = false; this.npc.damageAbsorber = null; return false;
        }
        this.npcMetalArmorHp -= amount;
        const reflected = Math.ceil(amount * 0.5);
        this.npcMetalArmorReflecting = true;
        this.player.takeDamage(reflected);
        this.npcMetalArmorReflecting = false;
        this.spawnHitFlash(this.player.x, this.player.y, 0x882244);
        this.showFloatingText(this.player.x, this.player.y - 30, `↩ ${reflected} REFLECT`, '#ff8866');
        if (this.npcMetalArmorHp <= 0) {
          this.npcMetalArmorActive = false; this.npc.damageAbsorber = null;
          if (this.npcMetalArmorAura) { this.npcMetalArmorAura.destroy(); this.npcMetalArmorAura = null; }
        }
        return true;
      };
    }
  }

  private applyMetalAggressiveBleeding(appliedBy: 'player' | 'npc', duration: number): void {
    if (appliedBy === 'player') {
      // Player bleeds NPC
      this.npcAggressiveBleeding = true;
      this.npcAggressiveBleedUntil = Math.max(this.npcAggressiveBleedUntil, this.time.now + duration);
      if (!this.npcAggressiveBleedAura) {
        this.npcAggressiveBleedAura = this.add.circle(this.npc.x, this.npc.y, 30, 0x660000, 0.4)
          .setStrokeStyle(2, 0xaa0000, 0.6).setDepth(3);
        this.tweens.add({ targets: this.npcAggressiveBleedAura, alpha: 0.12, yoyo: true, repeat: -1, duration: 380 });
      }
      this.showFloatingText(this.npc.x, this.npc.y - 36, '🩸 BLEEDING', '#cc0000');
      // Drip particles
      for (let i = 0; i < 4; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dot = this.add.circle(
          this.npc.x + Math.cos(ang) * 18, this.npc.y + Math.sin(ang) * 18,
          3, 0x880000, 0.9,
        ).setDepth(6);
        this.tweens.add({ targets: dot, y: dot.y + 22, alpha: 0, duration: 680, onComplete: () => dot.destroy() });
      }
    } else {
      // NPC bleeds player
      this.playerAggressiveBleeding = true;
      this.playerAggressiveBleedUntil = Math.max(this.playerAggressiveBleedUntil, this.time.now + duration);
      if (!this.playerAggressiveBleedAura) {
        this.playerAggressiveBleedAura = this.add.circle(this.player.x, this.player.y, 30, 0x660000, 0.4)
          .setStrokeStyle(2, 0xaa0000, 0.6).setDepth(3);
        this.tweens.add({ targets: this.playerAggressiveBleedAura, alpha: 0.12, yoyo: true, repeat: -1, duration: 380 });
      }
      this.showFloatingText(this.player.x, this.player.y - 36, '🩸 BLEEDING', '#cc0000');
    }
  }

  private spawnMetalBloodPuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const base = 30;
    // Click+: Hemorrhage — puddles spawned by/for the upgraded player are 50% bigger
    const r = (owner === 'player' && this.hasUpgrade('click')) ? Math.round(base * 1.5) : base;
    const spr = this.add.circle(x, y, r, 0x660000, 0.55)
      .setStrokeStyle(2, 0x990000, 0.5).setDepth(2);
    this.metalBloodPuddles.push({ sprite: spr, x, y, radius: r, owner, drainAccum: 0, draining: false });
    // Small spawn VFX
    const burst = this.add.circle(x, y, 6, 0xcc0000, 0.8).setDepth(5);
    this.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
  }

  private drawMetalChainLine(gfx: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    const d = Phaser.Math.Distance.Between(x1, y1, x2, y2) || 1;
    const dx = x2 - x1, dy = y2 - y1;
    const segments = Math.max(4, Math.floor(d / 22));
    const perpX = -dy / d, perpY = dx / d;
    gfx.lineStyle(3, 0x889aaa, 0.75);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t, py = y1 + dy * t;
      const side = i % 2 === 0 ? 1 : -1;
      gfx.lineTo(px + perpX * side * 7, py + perpY * side * 7);
    }
    gfx.strokePath();
  }

  private updateMetalState(time: number, delta: number): void {
    const GUN_EMOJIS: Record<string, string> = {
      'flintlock': '🔫', 'rifle': '🎯', 'grenade-launcher': '💣',
      'flamethrower': '🔥', 'shotgun': '🔱', 'rpg': '🚀',
      'taser': '⚡', 'minigun': '🌀', 'sniper': '🎖️',
    };

    // ── NPC aggressive bleed (player applied) ────────────────────
    if (this.npcAggressiveBleeding) {
      if (time > this.npcAggressiveBleedUntil) {
        this.npcAggressiveBleeding = false;
        if (this.npcAggressiveBleedAura) { this.npcAggressiveBleedAura.destroy(); this.npcAggressiveBleedAura = null; }
      } else {
        if (this.npcAggressiveBleedAura) this.npcAggressiveBleedAura.setPosition(this.npc.x, this.npc.y);
        // Tick damage (2/s)
        this.npcAggressiveBleedTickAccum += delta;
        if (this.npcAggressiveBleedTickAccum >= 1000) {
          this.npcAggressiveBleedTickAccum -= 1000;
          this.npc.takeDamage(2);
          this.spawnDamageNumber(this.npc.x, this.npc.y - 18, 2);
        }
        // Spawn puddle every 3s at NPC's location (player owns it to heal from)
        this.npcAggressiveBleedPuddleAccum += delta;
        if (this.npcAggressiveBleedPuddleAccum >= 3000) {
          this.npcAggressiveBleedPuddleAccum -= 3000;
          this.spawnMetalBloodPuddle(this.npc.x, this.npc.y, 'player');
        }
      }
    }

    // ── Player aggressive bleed (NPC applied) ────────────────────
    if (this.playerAggressiveBleeding) {
      if (time > this.playerAggressiveBleedUntil) {
        this.playerAggressiveBleeding = false;
        if (this.playerAggressiveBleedAura) { this.playerAggressiveBleedAura.destroy(); this.playerAggressiveBleedAura = null; }
      } else {
        if (this.playerAggressiveBleedAura) this.playerAggressiveBleedAura.setPosition(this.player.x, this.player.y);
        this.playerAggressiveBleedTickAccum += delta;
        if (this.playerAggressiveBleedTickAccum >= 1000) {
          this.playerAggressiveBleedTickAccum -= 1000;
          this.player.takeDamage(2);
          this.spawnDamageNumber(this.player.x, this.player.y - 18, 2);
        }
        this.playerAggressiveBleedPuddleAccum += delta;
        if (this.playerAggressiveBleedPuddleAccum >= 3000) {
          this.playerAggressiveBleedPuddleAccum -= 3000;
          this.spawnMetalBloodPuddle(this.player.x, this.player.y, 'npc');
        }
      }
    }

    // ── Blood puddles ─────────────────────────────────────────────
    for (let i = this.metalBloodPuddles.length - 1; i >= 0; i--) {
      const puddle = this.metalBloodPuddles[i];
      const owner = puddle.owner === 'player' ? this.player : this.npc;
      const d = Phaser.Math.Distance.Between(owner.x, owner.y, puddle.x, puddle.y);

      puddle.draining = d <= puddle.radius + 18;

      if (puddle.draining) {
        puddle.drainAccum += delta;
        if (puddle.drainAccum >= 900) {
          puddle.drainAccum -= 900;
          owner.heal(2);
          this.showFloatingText(owner.x, owner.y - 22, '+2 ❤️', '#ff6688');
          puddle.sprite.setScale(puddle.sprite.scaleX * 0.55);
        }
        if (puddle.sprite.scaleX < 0.12) {
          puddle.sprite.destroy();
          this.metalBloodPuddles.splice(i, 1);
        }
      }
    }

    // ── Blood Siphon (F+ drain tether to puddle) ─────────────────
    if (this.metalBloodChainPuddle) {
      const puddle = this.metalBloodChainPuddle;
      if (!puddle.sprite.active || puddle.sprite.scaleX < 0.12) {
        // Puddle consumed
        this.metalBloodChainPuddle = null;
        if (this.metalBloodChainGraphic) { this.metalBloodChainGraphic.clear(); }
      } else {
        this.metalBloodChainAccum += delta;
        if (this.metalBloodChainAccum >= 900) {
          this.metalBloodChainAccum -= 900;
          this.player.heal(3);
          this.showFloatingText(this.player.x, this.player.y - 22, '+3 🩸', '#ff6688');
          puddle.sprite.setScale(puddle.sprite.scaleX * (0.55 / 1.5 < 0.37 ? 0.37 : 0.55 / 1.5));
          if (puddle.sprite.scaleX < 0.12) {
            puddle.sprite.destroy();
            const idx = this.metalBloodPuddles.indexOf(puddle);
            if (idx !== -1) this.metalBloodPuddles.splice(idx, 1);
            this.metalBloodChainPuddle = null;
            if (this.metalBloodChainGraphic) this.metalBloodChainGraphic.clear();
          }
        }
        if (this.metalBloodChainGraphic && puddle.sprite.active) {
          this.metalBloodChainGraphic.clear();
          this.drawMetalChainLine(this.metalBloodChainGraphic, this.player.x, this.player.y, puddle.x, puddle.y);
        }
      }
    }

    // ── Chain tether (player's tether on NPC) ────────────────────
    if (this.metalChainTethered) {
      if (time > this.metalChainTetherEnd) {
        this.metalChainTethered = false;
        if (this.metalChainGraphic) { this.metalChainGraphic.clear(); this.metalChainGraphic.destroy(); this.metalChainGraphic = null; }
      } else {
        const td = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        if (td > 160) {
          const ang = Math.atan2(this.npc.y - this.player.y, this.npc.x - this.player.x);
          this.npc.setPosition(this.player.x + Math.cos(ang) * 160, this.player.y + Math.sin(ang) * 160);
        }
        if (!this.metalChainGraphic) this.metalChainGraphic = this.add.graphics().setDepth(5);
        this.metalChainGraphic.clear();
        this.drawMetalChainLine(this.metalChainGraphic, this.player.x, this.player.y, this.npc.x, this.npc.y);
      }
    }

    // ── Chain tether (NPC's tether on player) ────────────────────
    if (this.npcMetalChainTethered) {
      if (time > this.npcMetalChainTetherEnd) {
        this.npcMetalChainTethered = false;
        if (this.npcMetalChainGraphic) { this.npcMetalChainGraphic.clear(); this.npcMetalChainGraphic.destroy(); this.npcMetalChainGraphic = null; }
      } else {
        const td = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
        if (td > 160) {
          const ang = Math.atan2(this.player.y - this.npc.y, this.player.x - this.npc.x);
          this.player.setPosition(this.npc.x + Math.cos(ang) * 160, this.npc.y + Math.sin(ang) * 160);
        }
        if (!this.npcMetalChainGraphic) this.npcMetalChainGraphic = this.add.graphics().setDepth(5);
        this.npcMetalChainGraphic.clear();
        this.drawMetalChainLine(this.npcMetalChainGraphic, this.npc.x, this.npc.y, this.player.x, this.player.y);
      }
    }

    // ── Chain projectiles ─────────────────────────────────────────
    const W = this.scale.width, H = this.scale.height;
    for (let i = this.metalChainProjectiles.length - 1; i >= 0; i--) {
      const cp = this.metalChainProjectiles[i];
      if (!cp.active) { cp.sprite.destroy(); this.metalChainProjectiles.splice(i, 1); continue; }
      cp.x += cp.vx * (delta / 1000);
      cp.y += cp.vy * (delta / 1000);
      cp.sprite.setPosition(cp.x, cp.y);
      if (cp.x < 0 || cp.x > W || cp.y < 0 || cp.y > H) { cp.active = false; continue; }

      for (const hitTarget of (cp.owner === 'player' ? this.enemies : [this.player])) {
        if (!hitTarget.active || hitTarget.hp <= 0) continue;
        const hitDist = Phaser.Math.Distance.Between(cp.x, cp.y, hitTarget.x, hitTarget.y);
        if (hitDist <= 28) {
          cp.active = false;
          this.spawnHitFlash(hitTarget.x, hitTarget.y, 0x889aaa);
          this.showFloatingText(hitTarget.x, hitTarget.y - 34, '⛓️ TETHERED!', '#aabbcc');
          if (cp.owner === 'player') {
            this.metalChainTethered = true;
            this.metalChainTetherEnd = time + 5000;
            this.applyMetalAggressiveBleeding('player', 3000);
          } else {
            this.npcMetalChainTethered = true;
            this.npcMetalChainTetherEnd = time + 5000;
            this.applyMetalAggressiveBleeding('npc', 3000);
          }
          break;
        }
      }
    }

    // ── Gun projectiles (grenade, rpg, taser, flame) ─────────────
    for (let i = this.metalGunProjectiles.length - 1; i >= 0; i--) {
      const p = this.metalGunProjectiles[i];
      if (!p.active) { p.sprite.destroy(); this.metalGunProjectiles.splice(i, 1); continue; }

      if (p.expiresAt && time > p.expiresAt) { p.active = false; continue; }

      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      // Gravity for grenade arc
      if (p.type === 'grenade') p.vy += 220 * (delta / 1000);
      p.sprite.setPosition(p.x, p.y);

      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        if (p.type === 'grenade' || p.type === 'rpg') this.doMetalExplosion(p.x, p.y, p.explodeRadius ?? 80, p.damage, p.owner);
        p.active = false;
        continue;
      }

      const _gunRadius = p.type === 'flame' ? 36 : 24;
      let hitT: Fighter | null = null;
      for (const t of (p.owner === 'player' ? this.enemies : [this.player])) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= _gunRadius) { hitT = t; break; }
      }
      if (hitT) {
        p.active = false;
        if (p.type === 'grenade') {
          this.doMetalExplosion(p.x, p.y, p.explodeRadius ?? 80, p.damage, p.owner);
        } else if (p.type === 'rpg') {
          this.doMetalExplosion(p.x, p.y, p.explodeRadius ?? 120, p.damage, p.owner);
        } else if (p.type === 'taser') {
          hitT.takeDamage(p.damage);
          this.spawnHitFlash(hitT.x, hitT.y, 0xffee22);
          this.showFloatingText(hitT.x, hitT.y - 36, '⚡ STUNNED', '#ffee22');
          if (p.owner === 'player') {
            this.npcMetalTaseredUntil = time + 2000;
          } else {
            this.playerMetalTaseredUntil = time + 2000;
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          }
        } else if (p.type === 'flame') {
          hitT.takeDamage(p.damage);
          this.spawnHitFlash(hitT.x, hitT.y, 0xff5500);
        }
      }
    }

    // ── Metal armor tracking ─────────────────────────────────────
    if (this.metalArmorActive) {
      if (time > this.metalArmorEnd || this.metalArmorHp <= 0) {
        this.metalArmorActive = false; this.player.damageAbsorber = null;
        if (this.metalArmorAura) { this.metalArmorAura.destroy(); this.metalArmorAura = null; }
        if (this.metalArmorHp > 0) this.showFloatingText(this.player.x, this.player.y - 36, '🛡️ ARMOR EXPIRED', '#aabbcc');
        // Q+: Recast Clot — start cooldown only when armor ends
        if (this.hasUpgrade('q')) this.player.triggerCooldown('metal-blood-clot');
      } else {
        if (this.metalArmorAura) this.metalArmorAura.setPosition(this.player.x, this.player.y);
      }
    }
    if (this.npcMetalArmorActive) {
      if (time > this.npcMetalArmorEnd || this.npcMetalArmorHp <= 0) {
        this.npcMetalArmorActive = false; this.npc.damageAbsorber = null;
        if (this.npcMetalArmorAura) { this.npcMetalArmorAura.destroy(); this.npcMetalArmorAura = null; }
      } else {
        if (this.npcMetalArmorAura) this.npcMetalArmorAura.setPosition(this.npc.x, this.npc.y);
      }
    }

    // ── Arsenal HUD ───────────────────────────────────────────────
    if (this.metalArsenalHUD && this.elementId === 'metal') {
      if (this.metalArsenal.length === 0) {
        this.metalArsenalHUD.setText('[ No Weapons ]');
      } else {
        this.metalArsenalHUD.setText(this.metalArsenal.map(g => GUN_EMOJIS[g] ?? '?').join('  '));
      }
    }

    void W; void H;
  }

  // ══════════════════════════════════════════════════════════════════
  // ── Plasma Implementation ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════

  private handlePlasmaInput(
    time: number,
    delta: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    void delta;
    if (this.nukeChanneling) return;
    if (this.plasmaIncarnateActive) return; // no ability input during Chaos Incarnate

    const playerCtx = this.buildPlayerContext(mouseX, mouseY);

    // Click: Plasma Burst (close-range 3 chains)
    if (pointer.isDown && !this.pointerWasDown) {
      this.player.castAbility('plasma-burst', playerCtx);
    }

    // E: Unstable Arena at cursor
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.player.castAbility('plasma-arena', playerCtx);
    }

    // R: Plasma Current — hold to widen gap, release to fire
    if (this.rKey.isDown && !this.plasmaRHolding) {
      if (this.player.getCooldownRatio('plasma-current') >= 1) {
        this.plasmaRHolding = true;
        this.plasmaRHeldSince = time;
      }
    }
    if (this.plasmaRHolding) {
      // Show preview circles showing orb positions
      const totalHeld = time - this.plasmaRHeldSince;
      const heldMs = Math.min(totalHeld, 1500);
      const voltMode = this.hasUpgrade('r') && totalHeld >= 2500;
      const spread = voltMode ? 96 : 40 + (heldMs / 1500) * 80; // 40 to 120 px spread
      const dx = mouseX - this.player.x;
      const dy = mouseY - this.player.y;
      const ang = Math.atan2(dy, dx);
      const perpX = -Math.sin(ang);
      const perpY = Math.cos(ang);
      const ax = this.player.x + perpX * spread;
      const ay = this.player.y + perpY * spread;
      const bx = this.player.x - perpX * spread;
      const by = this.player.y - perpY * spread;
      if (!this.plasmaRPreviewA) {
        this.plasmaRPreviewA = this.add.circle(ax, ay, 8, 0xcc44ff, 0.5).setDepth(5);
        this.plasmaRPreviewB = this.add.circle(bx, by, 8, 0xcc44ff, 0.5).setDepth(5);
      } else {
        this.plasmaRPreviewA.setPosition(ax, ay);
        this.plasmaRPreviewB!.setPosition(bx, by);
      }
    }
    if (!this.rKey.isDown && this.plasmaRHolding) {
      // Release: fire orbs or volt points depending on hold time
      this.plasmaRHolding = false;
      if (this.plasmaRPreviewA) { this.plasmaRPreviewA.destroy(); this.plasmaRPreviewA = null; }
      if (this.plasmaRPreviewB) { this.plasmaRPreviewB.destroy(); this.plasmaRPreviewB = null; }
      const totalHeldMs = time - this.plasmaRHeldSince;
      // R+: Volt Points — hold past max (1500ms) + 1000ms extra = 2500ms
      if (this.hasUpgrade('r') && totalHeldMs >= 2500) {
        this.doPlasmaSpawnVoltPoints(mouseX, mouseY, 'player');
      } else {
        const heldMs = Math.min(totalHeldMs, 1500);
        const spread = 40 + (heldMs / 1500) * 80;
        this.doPlasmaCurrentLaunchWithSpread(mouseX, mouseY, spread, 'player');
      }
      this.player.triggerCooldown('plasma-current');
    }

    // F: Chaos Blades
    if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
      this.player.castAbility('plasma-chaos-blades', playerCtx);
    }

    // Q: Chaos Incarnate
    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      this.player.castAbility('plasma-chaos-incarnate', playerCtx);
    }
  }

  private doPlasmaBurst(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;
    const _plasmaTargets = owner === 'player' ? this.enemies : [this.player];
    const range = 120;

    for (let i = 0; i < 3; i++) {
      const spreadAngle = ((i - 1) * 18) * (Math.PI / 180);
      const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
      const ang = baseAngle + spreadAngle;
      const endX = caster.x + Math.cos(ang) * range;
      const endY = caster.y + Math.sin(ang) * range;

      const gfx = this.add.graphics().setDepth(8);
      gfx.lineStyle(3, 0xdd66ff, 1.0);
      gfx.lineBetween(caster.x, caster.y, endX, endY);
      // Bolt zigzag
      for (let j = 0; j < 3; j++) {
        const t = (j + 1) / 4;
        const midX = caster.x + (endX - caster.x) * t + (Math.random() - 0.5) * 14;
        const midY = caster.y + (endY - caster.y) * t + (Math.random() - 0.5) * 14;
        gfx.lineStyle(2, 0xffffff, 0.7);
        gfx.lineBetween(
          caster.x + (endX - caster.x) * (t - 0.25), caster.y + (endY - caster.y) * (t - 0.25),
          midX, midY,
        );
      }
      this.tweens.add({ targets: gfx, alpha: 0, duration: 200, onComplete: () => gfx.destroy() });

      // Check hit
      let hitLanded = false;
      for (const target of _plasmaTargets) {
        if (!target.active || target.hp <= 0) continue;
        const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
        if (dist <= range) {
          const targetAngle = Math.atan2(target.y - caster.y, target.x - caster.x);
          const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(targetAngle - ang));
          if (angleDiff < Math.PI / 4) {
            target.takeDamage(5);
            this.spawnHitFlash(target.x, target.y, 0xcc44ff);
            this.spawnDamageNumber(target.x, target.y - 20, 5);
            hitLanded = true;
          }
        }
      }
      // Click+: Mini-Chaos Burst — on hit apply a short 2s chaos effect
      if (hitLanded && owner === 'player' && this.hasUpgrade('click')) {
        this.doPlasmaApplyChaos('npc', 2000);
      } else if (hitLanded && owner === 'npc' && this.hasUpgrade('click')) {
        this.doPlasmaApplyChaos('player', 2000);
      }
      // R+: Volt relay from burst hit point
      if (hitLanded && this.hasUpgrade('r')) {
        this.doPlasmaVoltRelay(endX, endY, owner);
      }
    }

    this.showFloatingText(caster.x, caster.y - 36, '⚡ Plasma Burst', '#dd66ff');
  }

  private doPlasmaUnstableArena(tx: number, ty: number, owner: 'player' | 'npc'): void {
    // E+: Entrenched Arenas — 20% bigger, cap of 2 player arenas (destroy oldest if at cap), no expiry
    const baseRadius = 80;
    const radius = (owner === 'player' && this.hasUpgrade('e')) ? Math.round(baseRadius * 1.2) : baseRadius;
    if (owner === 'player' && this.hasUpgrade('e')) {
      const playerArenas = this.plasmaArenas.filter(a => a.owner === 'player');
      if (playerArenas.length >= 2) {
        const oldest = playerArenas[0];
        oldest.sprite.destroy();
        this.plasmaArenas.splice(this.plasmaArenas.indexOf(oldest), 1);
      }
    }

    const sprite = this.add.circle(tx, ty, radius, 0xaa22ff, 0.15).setDepth(3);
    sprite.setStrokeStyle(3, 0xdd44ff, 0.9);
    this.tweens.add({
      targets: sprite,
      scaleX: 1.08, scaleY: 1.08,
      alpha: 0.25,
      yoyo: true, repeat: -1,
      duration: 600,
    });

    // E+: no expiry for player arenas; NPC arenas still expire at 30s
    const expiresAt = (owner === 'player' && this.hasUpgrade('e')) ? Infinity : this.time.now + 30000;
    this.plasmaArenas.push({
      sprite, x: tx, y: ty, radius,
      owner,
      playerInAccum: 0,
      npcInAccum: 0,
      expiresAt,
    });
    this.showFloatingText(tx, ty - radius - 16, '⚠️ Unstable Arena!', '#aa22ff');
  }

  private doPlasmaCurrentLaunch(tx: number, ty: number, owner: 'player' | 'npc'): void {
    this.doPlasmaCurrentLaunchWithSpread(tx, ty, 60, owner);
  }

  private doPlasmaCurrentLaunchWithSpread(tx: number, ty: number, spread: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;
    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const ang = Math.atan2(dy, dx);
    const perpX = -Math.sin(ang);
    const perpY = Math.cos(ang);
    const speed = 320;

    const ax = caster.x + perpX * spread;
    const ay = caster.y + perpY * spread;
    const bx = caster.x - perpX * spread;
    const by = caster.y - perpY * spread;

    const spriteA = this.add.circle(ax, ay, 9, 0xcc44ff, 0.9).setStrokeStyle(2, 0xffffff, 0.8).setDepth(7);
    const spriteB = this.add.circle(bx, by, 9, 0xcc44ff, 0.9).setStrokeStyle(2, 0xffffff, 0.8).setDepth(7);
    const chainGraphic = this.add.graphics().setDepth(6);

    this.plasmaCurrentOrbs.push({
      spriteA, spriteB, chainGraphic,
      ax, ay, bx, by,
      vax: Math.cos(ang) * speed, vay: Math.sin(ang) * speed,
      vbx: Math.cos(ang) * speed, vby: Math.sin(ang) * speed,
      owner,
      tickAccum: 0,
      active: true,
      expiresAt: this.time.now + 5000,
    });
  }

  private doPlasmaChaosBlades(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;
    // F+: Blade Storm — 6 blades, 25% faster
    const bladeStorm = owner === 'player' && this.hasUpgrade('f');
    const count = bladeStorm ? 6 : 3;
    const speed = bladeStorm ? 475 : 380;

    for (let i = 0; i < count; i++) {
      const ang = (i * 2 * Math.PI) / count;
      const sprite = this.add.circle(caster.x, caster.y, 7, 0xff44ff, 0.95)
        .setStrokeStyle(2, 0xffffff, 0.8).setDepth(8);
      this.plasmaBlades.push({
        sprite,
        x: caster.x, y: caster.y,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        owner,
        expiresAt: this.time.now + 8000,
        spawnedAt: this.time.now,
        active: true,
      });
    }
    this.showFloatingText(caster.x, caster.y - 36, '🔮 Chaos Blades!', '#ff44ff');
  }

  private doPlasmaChaosIncarnate(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;
    const duration = 5000;

    if (owner === 'player') {
      // Q+: Plasma Colossus — teleport to center, scale up
      if (this.hasUpgrade('q')) {
        const cx = this.scale.width / 2, cy = this.scale.height / 2;
        this.player.setPosition(cx, cy);
        caster.setScale(1.6);
        // Center shockwave VFX
        const shock = this.add.circle(cx, cy, 20, 0xff88ff, 0.8).setDepth(9);
        this.tweens.add({ targets: shock, scaleX: 7, scaleY: 7, alpha: 0, duration: 400, onComplete: () => shock.destroy() });
      }

      this.plasmaIncarnateActive = true;
      this.plasmaIncarnateEnd = this.time.now + duration;
      this.plasmaIncarnateLastChain = 0;

      // Q+: retaliation absorber; base absorber just blocks
      if (this.hasUpgrade('q')) {
        this.player.damageAbsorber = () => {
          this.doPlasmaChainLightning(this.npc.x, this.npc.y, this.player.x, this.player.y);
          this.npc.takeDamage(10);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xff2244);
          this.spawnDamageNumber(this.npc.x, this.npc.y - 20, 10);
          this.showFloatingText(this.npc.x, this.npc.y - 36, '⚡ RETALIATION', '#ff4444');
          return true;
        };
      } else {
        this.player.damageAbsorber = () => true;
      }
      this.playerSpeedMult = 0.15;
      if (this.plasmaIncarnateAura) this.plasmaIncarnateAura.destroy();
      this.plasmaIncarnateAura = this.add.circle(caster.x, caster.y, 32, 0xcc44ff, 0.45).setDepth(4);
      this.tweens.add({ targets: this.plasmaIncarnateAura, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 300 });
    } else {
      this.npcPlasmaIncarnateActive = true;
      this.npcPlasmaIncarnateEnd = this.time.now + duration;
      this.npcPlasmaIncarnateLastChain = 0;
      this.npc.damageAbsorber = () => true;
      this.npcSpeedMult = 0.15;
      if (this.npcPlasmaIncarnateAura) this.npcPlasmaIncarnateAura.destroy();
      this.npcPlasmaIncarnateAura = this.add.circle(caster.x, caster.y, 32, 0xcc44ff, 0.45).setDepth(4);
      this.tweens.add({ targets: this.npcPlasmaIncarnateAura, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 300 });
    }
    this.showFloatingText(caster.x, caster.y - 44, '🔮 CHAOS INCARNATE!', '#ff88ff');
  }

  private doPlasmaApplyChaos(target: 'player' | 'npc', durationMs = 15000): void {
    // Remove any existing chaos effect on this target
    const existing = this.plasmaChaosEffects.findIndex(e => e.target === target);
    if (existing >= 0) {
      const old = this.plasmaChaosEffects[existing];
      if (old.aura) old.aura.destroy();
      this.plasmaChaosEffects.splice(existing, 1);
    }
    const fighter = target === 'player' ? this.player : this.npc;
    const aura = this.add.circle(fighter.x, fighter.y, 22, 0xff44ff, 0.3).setDepth(4);
    this.tweens.add({ targets: aura, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
    this.plasmaChaosEffects.push({
      target,
      expiresAt: this.time.now + durationMs,
      tickAccum: 0,
      aura,
    });
    this.showFloatingText(fighter.x, fighter.y - 36, durationMs < 5000 ? '🌀 Mini-Chaos!' : '🌀 CHAOS', '#ff44ff');
  }

  private doPlasmaSpawnChaosOrbs(x: number, y: number, owner: 'player' | 'npc'): void {
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      const sprite = this.add.circle(x + Math.cos(ang) * 20, y + Math.sin(ang) * 20, 6, 0xffaaff, 0.9)
        .setStrokeStyle(1, 0xffffff, 0.7).setDepth(7);
      this.plasmaChaosOrbs.push({
        sprite,
        x: x + Math.cos(ang) * 20,
        y: y + Math.sin(ang) * 20,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        owner,
        active: true,
      });
    }
  }

  private doPlasmaChainLightning(fromX: number, fromY: number, toX: number, toY: number): void {
    const gfx = this.add.graphics().setDepth(8);
    gfx.lineStyle(3, 0xee88ff, 1.0);
    const steps = 5;
    let px = fromX, py = fromY;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const nx = fromX + (toX - fromX) * t + (i < steps ? (Math.random() - 0.5) * 20 : 0);
      const ny = fromY + (toY - fromY) * t + (i < steps ? (Math.random() - 0.5) * 20 : 0);
      gfx.lineBetween(px, py, nx, ny);
      px = nx; py = ny;
    }
    this.tweens.add({ targets: gfx, alpha: 0, duration: 220, onComplete: () => gfx.destroy() });
  }

  private doPlasmaSpawnVoltPoints(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.player : this.npc;
    const dx = tx - caster.x, dy = ty - caster.y;
    const ang = Math.atan2(dy, dx);
    const perpX = -Math.sin(ang), perpY = Math.cos(ang);
    const spread = 96;
    const ax = caster.x + perpX * spread, ay = caster.y + perpY * spread;
    const bx = caster.x - perpX * spread, by = caster.y - perpY * spread;

    const sprA = this.add.circle(ax, ay, 12, 0xdd66ff, 0.8).setStrokeStyle(2, 0xffffff, 0.9).setDepth(7);
    const sprB = this.add.circle(bx, by, 12, 0xdd66ff, 0.8).setStrokeStyle(2, 0xffffff, 0.9).setDepth(7);
    this.tweens.add({ targets: sprA, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });
    this.tweens.add({ targets: sprB, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });

    const expiresAt = this.time.now + 10000;
    const voltA = { sprite: sprA, x: ax, y: ay, owner, charges: 3, expiresAt, paired: { x: bx, y: by } };
    const voltB = { sprite: sprB, x: bx, y: by, owner, charges: 3, expiresAt, paired: { x: ax, y: ay } };
    (voltA as typeof voltA & { pairedRef?: typeof voltB }).pairedRef = voltB;
    (voltB as typeof voltB & { pairedRef?: typeof voltA }).pairedRef = voltA;
    this.plasmaVoltPoints.push(voltA, voltB);
    this.showFloatingText(caster.x, caster.y - 40, '⚡ VOLT POINTS!', '#dd66ff');
  }

  private doPlasmaCurrentExplode(orb: PlasmaCurrentOrb): void {
    const cx = (orb.ax + orb.bx) / 2;
    const cy = (orb.ay + orb.by) / 2;
    const radius = 70;

    const flash = this.add.circle(cx, cy, radius, 0xcc44ff, 0.55).setDepth(8);
    this.tweens.add({ targets: flash, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 350, onComplete: () => flash.destroy() });

    // Hit both fighters
    const playerDist = Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y);
    if (playerDist <= radius) {
      this.player.takeDamage(10);
      this.spawnHitFlash(this.player.x, this.player.y, 0xcc44ff);
      this.spawnDamageNumber(this.player.x, this.player.y - 20, 10);
    }
    const npcDist = Phaser.Math.Distance.Between(cx, cy, this.npc.x, this.npc.y);
    if (npcDist <= radius) {
      this.npc.takeDamage(10);
      this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc44ff);
      this.spawnDamageNumber(this.npc.x, this.npc.y - 20, 10);
    }

    orb.active = false;
  }

  private updatePlasmaState(time: number, delta: number): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const pad = 32;
    const leftBound = pad;
    const rightBound = W - pad;
    const topBound = pad;
    const bottomBound = H - pad;

    // ── Unstable Arenas ───────────────────────────────────────────
    for (let i = this.plasmaArenas.length - 1; i >= 0; i--) {
      const arena = this.plasmaArenas[i];
      if (time > arena.expiresAt) {
        arena.sprite.destroy();
        this.plasmaArenas.splice(i, 1);
        continue;
      }

      const playerIn = Phaser.Math.Distance.Between(arena.x, arena.y, this.player.x, this.player.y) <= arena.radius;
      const npcIn = Phaser.Math.Distance.Between(arena.x, arena.y, this.npc.x, this.npc.y) <= arena.radius;

      if (playerIn) {
        arena.playerInAccum += delta;
        if (arena.playerInAccum >= 3000) {
          // Explode!
          this.doPlasmaArenaExplode(arena);
          this.plasmaArenas.splice(i, 1);
          continue;
        }
      } else {
        arena.playerInAccum = 0;
      }

      if (npcIn) {
        arena.npcInAccum += delta;
        if (arena.npcInAccum >= 3000) {
          this.doPlasmaArenaExplode(arena);
          this.plasmaArenas.splice(i, 1);
          continue;
        }
      } else {
        arena.npcInAccum = 0;
      }

      // Visual urgency: tint redder as timer approaches
      const urgencyRatio = Math.max(arena.playerInAccum, arena.npcInAccum) / 3000;
      if (urgencyRatio > 0.5) {
        arena.sprite.setStrokeStyle(3 + urgencyRatio * 3, 0xff2222, 0.9);
      }
    }

    // ── Plasma Current Orbs ───────────────────────────────────────
    for (let i = this.plasmaCurrentOrbs.length - 1; i >= 0; i--) {
      const orb = this.plasmaCurrentOrbs[i];
      if (!orb.active || time > orb.expiresAt) {
        orb.spriteA.destroy();
        orb.spriteB.destroy();
        orb.chainGraphic.destroy();
        this.plasmaCurrentOrbs.splice(i, 1);
        continue;
      }

      // Move orbs
      const dt = delta / 1000;
      orb.ax += orb.vax * dt;
      orb.ay += orb.vay * dt;
      orb.bx += orb.vbx * dt;
      orb.by += orb.vby * dt;
      orb.spriteA.setPosition(orb.ax, orb.ay);
      orb.spriteB.setPosition(orb.bx, orb.by);

      // Destroy if out of bounds
      if (orb.ax < 0 || orb.ax > W || orb.ay < 0 || orb.ay > H ||
          orb.bx < 0 || orb.bx > W || orb.by < 0 || orb.by > H) {
        orb.active = false;
        continue;
      }

      // Draw chain
      orb.chainGraphic.clear();
      orb.chainGraphic.lineStyle(3, 0xcc44ff, 0.8);
      orb.chainGraphic.lineBetween(orb.ax, orb.ay, orb.bx, orb.by);

      // Check orb collision with enemy (direct orb hit = 10 dmg + explosion)
      const _chainTargets = orb.owner === 'player' ? this.enemies : [this.player];
      let _chainCollapsed = false;
      for (const hitTarget of _chainTargets) {
        if (!hitTarget.active || hitTarget.hp <= 0) continue;
        const dA = Phaser.Math.Distance.Between(orb.ax, orb.ay, hitTarget.x, hitTarget.y);
        const dB = Phaser.Math.Distance.Between(orb.bx, orb.by, hitTarget.x, hitTarget.y);
        if (dA <= 20 || dB <= 20) {
          hitTarget.takeDamage(10);
          this.spawnHitFlash(hitTarget.x, hitTarget.y, 0xcc44ff);
          this.spawnDamageNumber(hitTarget.x, hitTarget.y - 20, 10);
          this.showFloatingText(hitTarget.x, hitTarget.y - 36, '💥 Chain Collapse!', '#cc44ff');
          this.doPlasmaCurrentExplode(orb);
          _chainCollapsed = true;
          break;
        }
      }
      if (_chainCollapsed) continue;

      // Chain damage tick to enemies touching the beam segment
      orb.tickAccum += delta;
      if (orb.tickAccum >= 100) {
        orb.tickAccum -= 100;
        for (const hitTarget of _chainTargets) {
          if (!hitTarget.active || hitTarget.hp <= 0) continue;
          if (this.pointNearSegment(hitTarget.x, hitTarget.y, orb.ax, orb.ay, orb.bx, orb.by, 18)) {
            hitTarget.takeDamage(2);
            this.spawnDamageNumber(hitTarget.x, hitTarget.y - 16, 2);
          }
        }
      }
    }

    // ── Chaos Blades ──────────────────────────────────────────────
    for (let i = this.plasmaBlades.length - 1; i >= 0; i--) {
      const blade = this.plasmaBlades[i];
      if (!blade.active || time > blade.expiresAt) {
        blade.sprite.destroy();
        this.plasmaBlades.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      blade.x += blade.vx * dt;
      blade.y += blade.vy * dt;

      // Bounce off walls
      if (blade.x < leftBound) { blade.x = leftBound; blade.vx = Math.abs(blade.vx); }
      if (blade.x > rightBound) { blade.x = rightBound; blade.vx = -Math.abs(blade.vx); }
      if (blade.y < topBound) { blade.y = topBound; blade.vy = Math.abs(blade.vy); }
      if (blade.y > bottomBound) { blade.y = bottomBound; blade.vy = -Math.abs(blade.vy); }

      blade.sprite.setPosition(blade.x, blade.y);

      // Hit check — blades can hit BOTH player and npc (regardless of owner),
      // but skip the owner for the first 2 s after spawn so they don't self-harm on cast.
      const ownerGrace = time < blade.spawnedAt + 2000;
      const fighterChecks: Array<{ f: Fighter; side: 'player' | 'npc' }> = [
        { f: this.player, side: 'player' },
        { f: this.npc,    side: 'npc' },
      ];
      for (const { f, side } of fighterChecks) {
        if (ownerGrace && side === blade.owner) continue;
        const d = Phaser.Math.Distance.Between(blade.x, blade.y, f.x, f.y);
        if (d <= 20) {
          f.takeDamage(8);
          this.spawnHitFlash(f.x, f.y, 0xff44ff);
          this.spawnDamageNumber(f.x, f.y - 20, 8);
          this.doPlasmaApplyChaos(side);
          // R+: Volt relay from blade hit point
          if (this.hasUpgrade('r')) this.doPlasmaVoltRelay(blade.x, blade.y, blade.owner);
          // Blade continues (just bounces through)
          blade.vx += (Math.random() - 0.5) * 60;
          blade.vy += (Math.random() - 0.5) * 60;
        }
      }
    }

    // ── Chaos Effects (orb spawning) ──────────────────────────────
    for (let i = this.plasmaChaosEffects.length - 1; i >= 0; i--) {
      const effect = this.plasmaChaosEffects[i];
      if (time > effect.expiresAt) {
        if (effect.aura) { effect.aura.destroy(); effect.aura = null; }
        this.plasmaChaosEffects.splice(i, 1);
        continue;
      }
      const fighter = effect.target === 'player' ? this.player : this.npc;
      if (effect.aura) effect.aura.setPosition(fighter.x, fighter.y);

      effect.tickAccum += delta;
      if (effect.tickAccum >= 5000) {
        effect.tickAccum -= 5000;
        // Spawn 5 orbs — these orbit outward and can be "picked up" (touching) by the other side
        this.doPlasmaSpawnChaosOrbs(fighter.x, fighter.y, effect.target);
      }
    }

    // ── Chaos Orbs ────────────────────────────────────────────────
    for (let i = this.plasmaChaosOrbs.length - 1; i >= 0; i--) {
      const orb = this.plasmaChaosOrbs[i];
      if (!orb.active) {
        orb.sprite.destroy();
        this.plasmaChaosOrbs.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      // Drift
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      // Slow down
      orb.vx *= 0.98;
      orb.vy *= 0.98;
      // Bounce off bounds
      if (orb.x < leftBound || orb.x > rightBound) orb.vx *= -1;
      if (orb.y < topBound || orb.y > bottomBound) orb.vy *= -1;
      orb.sprite.setPosition(orb.x, orb.y);

      // The orb damages whoever touches it (both sides can pick it up for 10 dmg)
      const opponents: Array<{ f: Fighter; side: 'player' | 'npc' }> = [
        { f: this.player, side: 'player' },
        { f: this.npc,    side: 'npc' },
      ];
      for (const { f } of opponents) {
        if (Phaser.Math.Distance.Between(orb.x, orb.y, f.x, f.y) <= 20) {
          f.takeDamage(10);
          this.spawnHitFlash(f.x, f.y, 0xffaaff);
          this.spawnDamageNumber(f.x, f.y - 20, 10);
          this.showFloatingText(f.x, f.y - 36, '🌀 Chaos Orb!', '#ffaaff');
          orb.active = false;
          break;
        }
      }
    }

    // ── Incarnate (player) ────────────────────────────────────────
    if (this.plasmaIncarnateActive) {
      if (time > this.plasmaIncarnateEnd) {
        this.plasmaIncarnateActive = false;
        this.player.damageAbsorber = null;
        this.playerSpeedMult = 1;
        if (this.hasUpgrade('q')) this.player.setScale(1); // restore scale from Colossus
        if (this.plasmaIncarnateAura) { this.plasmaIncarnateAura.destroy(); this.plasmaIncarnateAura = null; }
        this.showFloatingText(this.player.x, this.player.y - 36, '🔮 Incarnate ended', '#cc44ff');
      } else {
        if (this.plasmaIncarnateAura) {
          this.plasmaIncarnateAura.setPosition(this.player.x, this.player.y);
        }
        // Q+: lock player to center during incarnate
        if (this.hasUpgrade('q')) {
          this.player.setPosition(this.scale.width / 2, this.scale.height / 2);
        }

        // Touch damage to enemy (50 dmg per hit, 1s cooldown)
        const touchDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        if (touchDist <= 36 && time - this.plasmaIncarnateLastTouch >= 1000) {
          this.plasmaIncarnateLastTouch = time;
          this.npc.takeDamage(50);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc44ff);
          this.spawnDamageNumber(this.npc.x, this.npc.y - 20, 50);
          this.showFloatingText(this.npc.x, this.npc.y - 36, '🔮 Plasma Touch!', '#ff88ff');
        }

        // Auto chain lightning every 0.5s (Q+: no range limit)
        if (time - this.plasmaIncarnateLastChain >= 500) {
          const chainDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (chainDist <= 200 || this.hasUpgrade('q')) {
            this.plasmaIncarnateLastChain = time;
            this.doPlasmaChainLightning(this.player.x, this.player.y, this.npc.x, this.npc.y);
            this.npc.takeDamage(5);
            this.spawnDamageNumber(this.npc.x, this.npc.y - 20, 5);
          }
        }
      }
    }

    // ── Incarnate (NPC) ───────────────────────────────────────────
    if (this.npcPlasmaIncarnateActive) {
      if (time > this.npcPlasmaIncarnateEnd) {
        this.npcPlasmaIncarnateActive = false;
        this.npc.damageAbsorber = null;
        this.npcSpeedMult = 1;
        if (this.npcPlasmaIncarnateAura) { this.npcPlasmaIncarnateAura.destroy(); this.npcPlasmaIncarnateAura = null; }
      } else {
        if (this.npcPlasmaIncarnateAura) this.npcPlasmaIncarnateAura.setPosition(this.npc.x, this.npc.y);

        const touchDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
        if (touchDist <= 36 && time - this.npcPlasmaIncarnateLastTouch >= 1000) {
          this.npcPlasmaIncarnateLastTouch = time;
          this.player.takeDamage(50);
          this.spawnHitFlash(this.player.x, this.player.y, 0xcc44ff);
          this.spawnDamageNumber(this.player.x, this.player.y - 20, 50);
          this.showFloatingText(this.player.x, this.player.y - 36, '🔮 Plasma Touch!', '#ff88ff');
        }

        if (time - this.npcPlasmaIncarnateLastChain >= 500) {
          const chainDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
          if (chainDist <= 200) {
            this.npcPlasmaIncarnateLastChain = time;
            this.doPlasmaChainLightning(this.npc.x, this.npc.y, this.player.x, this.player.y);
            this.player.takeDamage(5);
            this.spawnDamageNumber(this.player.x, this.player.y - 20, 5);
          }
        }
      }
    }

    // ── Volt Points ───────────────────────────────────────────────
    for (let i = this.plasmaVoltPoints.length - 1; i >= 0; i--) {
      const vp = this.plasmaVoltPoints[i];
      if (time > vp.expiresAt || vp.charges <= 0) {
        vp.sprite.destroy();
        this.plasmaVoltPoints.splice(i, 1);
      } else {
        vp.sprite.setPosition(vp.x, vp.y);
      }
    }

    void W; void H;
  }

  /** Called when a plasma damage source lands near a volt point. Triggers relay to paired volt. */
  private doPlasmaVoltRelay(hitX: number, hitY: number, owner: 'player' | 'npc'): void {
    const target = owner === 'player' ? this.npc : this.player;
    const triggerRadius = 60;
    for (const vp of this.plasmaVoltPoints) {
      if (vp.owner !== owner) continue;
      if (vp.charges <= 0) continue;
      const d = Phaser.Math.Distance.Between(hitX, hitY, vp.x, vp.y);
      if (d <= triggerRadius) {
        vp.charges--;
        // Find paired volt
        const pairedVp = (this.plasmaVoltPoints as typeof this.plasmaVoltPoints).find(
          v => v !== vp && v.owner === owner && Phaser.Math.Distance.Between(v.x, v.y, (vp as typeof vp & { paired?: { x: number; y: number } }).paired?.x ?? -9999, (vp as typeof vp & { paired?: { x: number; y: number } }).paired?.y ?? -9999) < 20,
        );
        // Lightning to paired
        const toX = pairedVp?.x ?? (vp.x + (Math.random() - 0.5) * 80);
        const toY = pairedVp?.y ?? (vp.y + (Math.random() - 0.5) * 80);
        this.doPlasmaChainLightning(vp.x, vp.y, toX, toY);
        // Damage enemies near the relay line
        const relayDist = Phaser.Math.Distance.Between(target.x, target.y, toX, toY);
        if (relayDist <= 100) {
          target.takeDamage(8);
          this.spawnHitFlash(target.x, target.y, 0xdd66ff);
          this.spawnDamageNumber(target.x, target.y - 20, 8);
          this.showFloatingText(target.x, target.y - 36, '⚡ VOLT RELAY', '#dd66ff');
        }
        if (pairedVp) pairedVp.charges--;
        break;
      }
    }
  }

  private doPlasmaArenaExplode(arena: PlasmaArena): void {
    const radius = arena.radius + 20;
    const flash = this.add.circle(arena.x, arena.y, radius, 0xaa22ff, 0.6).setDepth(9);
    this.tweens.add({ targets: flash, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    arena.sprite.destroy();

    const pDist = Phaser.Math.Distance.Between(arena.x, arena.y, this.player.x, this.player.y);
    if (pDist <= radius) {
      this.player.takeDamage(80);
      this.spawnHitFlash(this.player.x, this.player.y, 0xaa22ff);
      this.spawnDamageNumber(this.player.x, this.player.y - 20, 80);
    }
    const nDist = Phaser.Math.Distance.Between(arena.x, arena.y, this.npc.x, this.npc.y);
    if (nDist <= radius) {
      this.npc.takeDamage(80);
      this.spawnHitFlash(this.npc.x, this.npc.y, 0xaa22ff);
      this.spawnDamageNumber(this.npc.x, this.npc.y - 20, 80);
    }
    this.showFloatingText(arena.x, arena.y - 30, '💥 ARENA EXPLOSION!', '#ff44ff');
  }

  /** Returns true if point (px, py) is within `threshold` units of the segment (ax,ay)→(bx,by). */
  private pointNearSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number, threshold: number): boolean {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, ax, ay) <= threshold;
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    return Phaser.Math.Distance.Between(px, py, cx, cy) <= threshold;
  }

  private updateInvasion(time: number, delta: number): void {
    // Wave transition
    if (this.waveManager.isWaveComplete() && this.invasionBetweenWavesUntil <= 0) {
      // Wave just cleared — start inter-wave countdown
      this.invasionWavesCompleted = this.waveManager.wave;
      this.invasionShardsEarned += this.waveManager.wave * 5; // wave completion bonus
      this.invasionBetweenWavesUntil = time + 3000;
      this.showFloatingText(this.player.x, this.player.y - 50, `WAVE ${this.waveManager.wave} CLEARED!`, '#cc44ff');
    }
    if (!this.waveManager.waveActive && this.invasionBetweenWavesUntil > 0 && time >= this.invasionBetweenWavesUntil) {
      this.invasionBetweenWavesUntil = 0; // reset sentinel
      const def = this.waveManager.startNextWave(time);
      this.showWaveBanner(def.waveNumber, def.isBossWave);
    }

    // Spawn due enemies
    for (const entry of this.waveManager.collectDueSpawns(time)) {
      this.spawnCorrupted(entry);
    }

    // Run AI for all active enemies
    const allEnemies = this.enemies.filter(e => e.active && e.hp > 0) as CorruptedBase[];
    for (const c of allEnemies) {
      c.aiTick(this.player, this.projectiles, allEnemies, time, delta);
      // Ice: frozen enemies stop; frost-stacked enemies slow
      if (c.frozenUntil > time) {
        (c.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      } else if (c.frostStacks > 0) {
        const cb = c.body as Phaser.Physics.Arcade.Body;
        const slowMult = 1 - c.frostStacks * 0.1;
        cb.velocity.x *= slowMult;
        cb.velocity.y *= slowMult;
      }
      // Growth Cough aura slow
      if (this.elementId === 'growth' && this.growthCoughStacks > 0) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) <= 120) {
          const cb = c.body as Phaser.Physics.Arcade.Body;
          const coughMult = Math.max(0.1, 1 - this.growthCoughStacks * 0.05);
          cb.velocity.x *= coughMult;
          cb.velocity.y *= coughMult;
        }
      }
      // Silence dread aura: slow enemies near the slasher
      if (this.elementId === 'silence' && this.silenceKit.isSlasherActive()) {
        const AURA_RADIUS = 260;
        const silDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
        if (silDist <= AURA_RADIUS) {
          const auraT = 1 - silDist / AURA_RADIUS;
          const cb = c.body as Phaser.Physics.Arcade.Body;
          cb.velocity.x *= 1 - auraT * 0.65;
          cb.velocity.y *= 1 - auraT * 0.65;
        }
      }
      // Hunt: Blood Hunt slow
      if (this.elementId === 'hunt' && time < this.npcHuntSlowUntil) {
        const cb = c.body as Phaser.Physics.Arcade.Body;
        cb.velocity.x *= 0.5;
        cb.velocity.y *= 0.5;
      }
      // Hunt: Blood Hunt R+ confusion — applies only to the targeted enemy
      if (this.elementId === 'hunt' && time < this.npcHuntConfusedUntil && c === (this.huntBloodHuntTarget as unknown as CorruptedBase)) {
        if (time > this.npcHuntConfuseDirUntil) {
          const confAngle = Math.random() * Math.PI * 2;
          this.npcHuntConfuseVx = Math.cos(confAngle) * c.speed;
          this.npcHuntConfuseVy = Math.sin(confAngle) * c.speed;
          this.npcHuntConfuseDirUntil = time + 450;
        }
        (c.body as Phaser.Physics.Arcade.Body).setVelocity(this.npcHuntConfuseVx, this.npcHuntConfuseVy);
      }
      // Slime sulpher spring confusion
      if (this.elementId === 'slime' && time < c.slimeConfusedUntil) {
        if (time > c.slimeConfuseDirUntil) {
          const ca = Math.random() * Math.PI * 2;
          c.slimeConfuseVx = Math.cos(ca) * c.speed;
          c.slimeConfuseVy = Math.sin(ca) * c.speed;
          c.slimeConfuseDirUntil = time + 450;
        }
        (c.body as Phaser.Physics.Arcade.Body).setVelocity(c.slimeConfuseVx, c.slimeConfuseVy);
      }
      // Slime level-3 slow (15%)
      if (this.elementId === 'slime' && this.slimeKit.isEnemySlowed(c, time)) {
        const cb = c.body as Phaser.Physics.Arcade.Body;
        cb.velocity.x *= 0.85;
        cb.velocity.y *= 0.85;
      }
    }

    // Tick festering growths
    this.festeringGrowths = this.festeringGrowths.filter(g => g.active);
    for (const g of this.festeringGrowths) {
      g.tick(this.player, time);
    }
    // Manual projectile-to-growth hit detection (growths have no physics body)
    for (const proj of (this.projectiles.getChildren() as Projectile[])) {
      if (!proj.active || !proj.isFromPlayer) continue;
      for (const g of this.festeringGrowths) {
        if (!g.active) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, g.x, g.y) <= 18) {
          g.takeDamage(proj.damage);
          this.spawnHitFlash(g.x, g.y, 0xff6600);
          this.spawnDamageNumber(g.x, g.y - 28, proj.damage);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          break;
        }
      }
    }

    // Tick Titan shield orbs & rockets against player projectiles
    for (const c of allEnemies) {
      if (c instanceof TitanCorrupted) {
        this.updateTitanShieldVsProjectiles(c);
      }
    }

    // Protected forcefield — absorbs damage for nearby allies
    for (const c of allEnemies) {
      if (c instanceof ProtectedCorrupted && c.forcefieldHp > 0) {
        for (const ally of allEnemies) {
          if (ally === c) continue;
          const dist = Phaser.Math.Distance.Between(c.x, c.y, ally.x, ally.y);
          if (dist <= c.forcefieldRadius) {
            // Swap ally's damageAbsorber to route through forcefield
            ally.damageAbsorber = (amount) => {
              c.forcefieldHp = Math.max(0, c.forcefieldHp - amount);
              this.spawnHitFlash(c.x, c.y, 0x44aaff);
              return true;
            };
          } else {
            ally.damageAbsorber = null;
          }
        }
      }
    }

    // Update corrupt shard display
    if (this.invasionCorruptShardLabel) {
      this.invasionCorruptShardLabel.setText(`🩸 ${this.invasionShardsEarned}`);
    }
  }

  private showWaveBanner(waveNum: number, isBossWave = false): void {
    if (!this.invasionWaveBanner) return;
    const label = isBossWave ? `⚠ WAVE ${waveNum} — BOSS!` : `WAVE ${waveNum}`;
    const color = isBossWave ? '#ff4444' : '#cc44ff';
    this.invasionWaveBanner.setText(label).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.invasionWaveBanner);
    this.tweens.add({
      targets: this.invasionWaveBanner,
      alpha: 0,
      delay: 2000,
      duration: 600,
    });
  }

  private updateTitanShieldVsProjectiles(titan: TitanCorrupted): void {
    // Check each active player projectile against each active shield orb
    const projs = this.projectiles.getChildren() as Projectile[];
    for (const proj of projs) {
      if (!proj.active || !proj.isFromPlayer) continue;
      for (let i = 0; i < titan.shieldOrbs.length; i++) {
        const orb = titan.shieldOrbs[i];
        if (!orb.active) continue;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, orb.sprite.x, orb.sprite.y);
        if (dist <= 22) {
          titan.damageShield(i, proj.damage);
          this.spawnHitFlash(proj.x, proj.y, 0x44ffff);
          this.showFloatingText(orb.sprite.x, orb.sprite.y - 20, `${proj.damage}`, '#44ffff');
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          break;
        }
      }
    }
  }

  private spawnCorrupted(entry: SpawnEntry): void {
    const worldW = 1920;
    const worldH = 1280;
    const pos = CorruptedBase.spawnFromEdge(worldW, worldH);
    let c: CorruptedBase;

    switch (entry.type) {
      case CorruptedType.Overcharged: {
        const oc = new OverchargedCorrupted(this, pos.x, pos.y, entry.baseHp, entry.baseSpeed);
        oc.onDeathExplosion = (x, y) => {
          // Void puddle + AoE damage
          this.spawnVoidPuddle(x, y);
          this.dealAoeDamageFromOwner(x, y, 80, 30, 'npc');
          const boom = this.add.circle(x, y, 80, 0xaa00cc, 0.35).setDepth(7);
          this.tweens.add({ targets: boom, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 500, onComplete: () => boom.destroy() });
        };
        c = oc;
        break;
      }
      case CorruptedType.Rusher:
        c = new RusherCorrupted(this, pos.x, pos.y, entry.baseHp, entry.baseSpeed);
        break;
      case CorruptedType.Protected:
        c = new ProtectedCorrupted(this, pos.x, pos.y, entry.baseHp, entry.baseSpeed);
        break;
      case CorruptedType.Architect: {
        const archId = ++this.invasionArchitectIdCounter;
        const arch = new ArchitectCorrupted(this, pos.x, pos.y, entry.baseHp, entry.baseSpeed);
        arch.onSpawnGrowth = (gx, gy) => {
          const g = new FesteringGrowth(this, gx, gy, archId);
          g.onShoot = (fx, fy, tx, ty) => {
            this.spawnGrowthProjectile(fx, fy, tx, ty, 'npc');
          };
          g.onPoison = () => {
            this.player.toxicUntil = this.time.now + 3000;
            this.player.toxicDps = 3;
            this.player.toxicTickAccum = 0;
            this.showFloatingText(this.player.x, this.player.y - 24, '☠ POISONED', '#99ff44');
          };
          this.festeringGrowths.push(g);
        };
        arch.countMyGrowths = () => this.festeringGrowths.filter(g => g.architectId === archId && g.active).length;
        c = arch;
        break;
      }
      case CorruptedType.Titan: {
        const titan = new TitanCorrupted(this, pos.x, pos.y, entry.baseHp, entry.baseSpeed);
        titan.onFireProjectile = (fx, fy, tx, ty, dmg) => this.spawnTitanProjectile(fx, fy, tx, ty, dmg);
        titan.onSlam = (sx, sy, r, d) => {
          this.dealAoeDamageFromOwner(sx, sy, r, d, 'npc');
          const ring = this.add.circle(sx, sy, r, 0xaa00cc, 0.3).setDepth(7);
          this.tweens.add({ targets: ring, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
          this.showFloatingText(sx, sy, '⚡ SLAM', '#cc44ff');
        };
        titan.onSpawnRocket = (rx, ry) => this.spawnTitanRocket(titan, rx, ry);
        c = titan;
        break;
      }
      default: // Basic
        c = new BasicCorrupted(this, pos.x, pos.y, entry.baseHp, entry.baseSpeed);
        break;
    }

    // Add to unified enemies list and physics group
    this.enemies.push(c);
    this.enemyGroup.add(c, true);
    c.once('defeated', () => {
      this.enemies = this.enemies.filter(e => e !== c);
      this.enemyGroup.remove(c, false, false);
      this.waveManager.onEnemyDefeated();
      const shards = Math.ceil(this.waveManager.wave * 0.5);
      this.invasionShardsEarned += shards;
      this.showFloatingText(c.x, c.y - 30, `+${shards} 🩸`, '#cc44ff');
      if (this.invasionWavesCompleted < this.waveManager.wave && this.waveManager.isWaveComplete()) {
        this.invasionWavesCompleted = this.waveManager.wave;
      }
      c.hideHealthBar();
      c.setTint(0xff4444);
      this.tweens.add({
        targets: c,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => { if (c.scene) c.destroy(); }
      });
    });
    c.on('damaged', (amount: number) => {
      if (amount > 0 && c.active) this.spawnDamageNumber(c.x, c.y - 20, amount);
    });
  }

  private spawnVoidPuddle(x: number, y: number): void {
    const puddle = this.add.circle(x, y, 36, 0x330044, 0.7)
      .setStrokeStyle(2, 0xaa00cc, 0.5).setDepth(2);
    this.time.delayedCall(5000, () => {
      this.tweens.add({ targets: puddle, alpha: 0, duration: 600, onComplete: () => puddle.destroy() });
    });
    // Damage player if in puddle (simple tick)
    const tickInterval = this.time.addEvent({
      delay: 600,
      repeat: 8,
      callback: () => {
        if (!puddle.active) { tickInterval.remove(); return; }
        if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= 36) {
          this.player.takeDamage(5);
          this.spawnHitFlash(this.player.x, this.player.y, 0xaa00cc);
        }
      },
    });
  }

  private spawnGrowthProjectile(fromX: number, fromY: number, toX: number, toY: number, _owner: 'player' | 'npc'): void {
    const proj = this.physics.add.sprite(fromX, fromY, 'proj-corrupted');
    const dmg = 6;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 220, (dy / len) * 220);
    this.time.delayedCall(2500, () => { if (proj.active) proj.setActive(false).setVisible(false); });
    this.physics.add.overlap(proj, this.player, () => {
      if (!proj.active) return;
      this.player.takeDamage(dmg);
      this.spawnHitFlash(this.player.x, this.player.y, 0x44cc44);
      proj.setActive(false).setVisible(false);
    });
  }

  private spawnTitanProjectile(fromX: number, fromY: number, toX: number, toY: number, damage: number): void {
    const proj = this.physics.add.sprite(fromX, fromY, 'proj-corrupted');
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 300, (dy / len) * 300);
    this.time.delayedCall(2000, () => { if (proj.active) proj.setActive(false).setVisible(false); });
    this.physics.add.overlap(proj, this.player, () => {
      if (!proj.active) return;
      this.player.takeDamage(damage);
      this.spawnHitFlash(this.player.x, this.player.y, 0xcc44ff);
      proj.setActive(false).setVisible(false);
    });
  }

  private spawnTitanRocket(titan: TitanCorrupted, startX: number, startY: number): void {
    const sprite = this.add.circle(startX, startY, 8, 0xff4400, 0.9)
      .setStrokeStyle(2, 0xff8800, 1).setDepth(7) as unknown as Phaser.GameObjects.Arc;
    const rocket = { sprite, x: startX, y: startY, vx: 0, vy: -200, active: true, hp: 15 };
    titan.titanRockets.push(rocket);
    // Allow player projectiles to shoot it down
    // (handled in updateTitanShieldVsProjectiles by proximity to rocket.sprite)
  }


  private applyProjectileToNpc(proj: Projectile): void {
    // Time Warp orb: deal 20 damage + teleport NPC back 3 seconds (or save pos with E+)
    if (proj.texture.key === 'proj-time-orb') {
      if (this.elementId === 'sand' && this.hasUpgrade('e')) {
        let hitTarget: Fighter | null = null;
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, t.x, t.y) <= 20) {
            hitTarget = t;
            t.takeDamage(20);
            this.spawnHitFlash(t.x, t.y, 0xffdd44);
            this.showFloatingText(t.x, t.y - 24, '20', '#ffdd44');
            break;
          }
        }
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
        let hitTarget: Fighter | null = null;
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, t.x, t.y) <= 20) {
            hitTarget = t;
            t.takeDamage(20);
            this.spawnHitFlash(t.x, t.y, 0xffdd44);
            this.showFloatingText(t.x, t.y - 24, '20', '#ffdd44');
            break;
          }
        }
        if (hitTarget) {
          const targetT = this.time.now - 3000;
          let best = this.npcPosHistory[0];
          for (const snap of this.npcPosHistory) {
            if (Math.abs(snap.t - targetT) < Math.abs(best.t - targetT)) best = snap;
          }
          this.timeNpcTeleporting = true;
          this.timeNpcTeleportStart = this.time.now;
          this.timeNpcTeleportFromX = hitTarget.x;
          this.timeNpcTeleportFromY = hitTarget.y;
          this.timeNpcTeleportToX = best.x;
          this.timeNpcTeleportToY = best.y;
          this.timeNpcTeleportPuddleAccum = 0;
        }
      }
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      return;
    }
    // Silence possess eye / hook: delegate to kit
    if (proj.texture.key === 'proj-silence-eye' || proj.texture.key === 'proj-silence-hook') {
      if (proj.texture.key === 'proj-silence-eye') this.silenceKit.onSilenceEyeHitEnemy(proj, 'player');
      else this.silenceKit.onSilenceHookHitEnemy(proj, 'player');
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      return;
    }
    // Fate dice: all damage handled in onDiceHitEnemy — skip generic damage path
    if (proj.texture.key === 'proj-fate-dice' && (proj as any).fateDiceOwner === 'player') {
      this.fateKit.onDiceHitEnemy(proj, proj.x, proj.y, 'player');
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      return;
    }
    // Fighter.dodgeChance roll (NPC side — e.g. Fate R+ Oozing Luck)
    if (this.npc.rollDodge()) {
      this.spawnDamageNumber(this.npc.x, this.npc.y - 34, -1); // DODGED
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      return;
    }
    // Apply attacker's crit context before damage
    this.npc.setIncomingCritContext(this.player.critChance, this.player.critMult);
    let _npcDmg = proj.damage;
    // Q+: Shatter Strike — next hit on frozen enemy deals 25% more
    if (this.npc.frozenSolidAmpReady && this.npc.frozenUntil > this.time.now) {
      _npcDmg = Math.round(_npcDmg * 1.25);
      this.npc.frozenSolidAmpReady = false;
      const st = this.add.text(this.npc.x, this.npc.y - 30, 'SHATTER!', { fontSize: '11px', color: '#88ccff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: st, y: st.y - 20, alpha: 0, duration: 1200, onComplete: () => st.destroy() });
    }
    this.npc.takeDamage(_npcDmg);
    this.spawnHitFlash(proj.x, proj.y, 0xff6600);
    // Hunt Blood Pact: heal player for 50% of damage dealt
    if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(_npcDmg * 0.5));
    // Hunt Blood Moon F+: 50% lifesteal from all damage dealt to bleeding enemy
    if (this.huntBloodMoonActive && this.hasUpgrade('f') && this.npc.bleeding) this.player.heal(Math.ceil(_npcDmg * 0.5));
    // Hunt silver bullets (hybrid): apply bleed and Click+ bonus damage
    if (proj.texture.key === 'proj-hunt-silver' || this.huntSilverPellets.has(proj)) {
      if (this.hasUpgrade('click') && this.npc.bleeding) {
        this.npc.takeDamage(Math.round(proj.damage * 0.5));
      }
      this.npc.bleeding = true;
      this.npc.bleedingUntil = Math.max(this.npc.bleedingUntil, this.time.now + 8000);
      this.applyNpcBleedVisual();
    }
    // Hunt shrapnel (hybrid F+ shriek): apply bleed
    if (this.huntShrapnelSet.has(proj)) {
      this.npc.bleeding = true;
      this.npc.bleedingUntil = Math.max(this.npc.bleedingUntil, this.time.now + 8000);
      this.applyNpcBleedVisual();
    }
    // Flameshredder: fireball hit also applies burning DOT
    if (proj.texture.key === 'proj-fire' && this.hasUpgrade('click')) {
      this.npc.burningUntil = Math.max(this.npc.burningUntil, this.time.now + 3000);
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
      if (this.npc.frozenUntil > this.time.now) {
        this.npc.frozenUntil = 0;
        for (let fi = 0; fi < 3; fi++) this.addFrostStack('npc');
      } else {
        this.addFrostStack('npc');
        if (proj.isPowered) this.addFrostStack('npc');
      }
    }
    // Growth infect dagger: apply toxic DOT to NPC, R+ bonus on already-infected
    if (proj.texture.key === 'proj-growth-dagger') {
      if (this.hasUpgrade('r') && this.npc.toxicUntil > this.time.now) {
        const bonus = Math.round(proj.damage * 0.25);
        this.npc.takeDamage(bonus);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0xccff44);
        const ft = this.add.text(this.npc.x, this.npc.y - 35, `+${bonus} EXPLOIT`, { fontSize: '10px', color: '#ccff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
      }
      this.npc.toxicUntil = this.time.now + 5000 + this.growthLingerBonus;
      this.npc.toxicDps = 2 + this.growthViralBonus;
      this.npc.toxicTickAccum = 0;
    }
    // NPC bloat: NPC hit triggers AOE on player
    if (this.npc.growthBloatActive) {
      this.npc.growthBloatActive = false;
      this.npc.growthBloatEnd = 0;
      if (this.npc.growthBloatAura) { this.npc.growthBloatAura.destroy(); this.npc.growthBloatAura = null; }
      const bloatDmg = Math.round(20 * this.npcGrowthDamageMult);
      if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y) <= 120) {
        this.player.takeDamage(bloatDmg);
        this.spawnHitFlash(this.player.x, this.player.y, 0xdddd00);
      }
      const bloatExp = this.add.circle(this.npc.x, this.npc.y, 120, 0xdddd00, 0.3).setDepth(8);
      this.tweens.add({ targets: bloatExp, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 350, onComplete: () => bloatExp.destroy() });
    }
    // Fate coin toss: give player +1 coin on hit
    if (proj.texture.key === 'proj-fate-coin' && (proj as any).fateCoinOwner === 'player') {
      this.fateKit.onCoinHitEnemy('player');
    }
    // Light Fallen Angel dagger: apply disarm on hit
    if ((proj as any).isFallenAngelDagger && this.elementId === 'light') {
      this.lightKit.onFallenAngelDaggerHit(this.npc, this.time.now);
    }
    // Magic (player) thorn vine hit
    if ((proj as any).isMagicThornVine && (proj as any).thornVineOwner === 'player') {
      this.magicKit.onThornVineHit(this.npc, 'player');
    }
    // Magic (player) thorn prison hit
    if ((proj as any).isMagicThornPrison && (proj as any).thornPrisonOwner === 'player') {
      this.magicKit.onThornPrisonHit(this.npc.x, this.npc.y, 'player');
    }
    // R+ Powerful Parry: fire DOT on NPC from rubber-reflected projectile
    const rubberParryFireDot = (proj as any).rubberParryFireDot as number | undefined;
    if (rubberParryFireDot && this.elementId === 'rubber') {
      this.rubberKit.applyNpcFireDot(rubberParryFireDot);
    }
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

  private applyProjectileToCorrupted(proj: Projectile, c: CorruptedBase): void {
    // Silence possess eye / hook: delegate to kit
    if (proj.texture.key === 'proj-silence-eye' || proj.texture.key === 'proj-silence-hook') {
      if (proj.texture.key === 'proj-silence-eye') this.silenceKit.onSilenceEyeHitCorrupted(proj, c.x, c.y);
      else this.silenceKit.onSilenceHookHitCorrupted(proj, c, c.x, c.y);
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      return;
    }
    c.setIncomingCritContext(this.player.critChance, this.player.critMult);
    let dmg = proj.damage;
    // Shatter Strike on frozen enemy
    if (c.frozenSolidAmpReady && c.frozenUntil > this.time.now) {
      dmg = Math.round(dmg * 1.25);
      c.frozenSolidAmpReady = false;
    }
    c.takeDamage(dmg);
    this.spawnHitFlash(proj.x, proj.y, 0xff6600);

    // Hunt Blood Pact: heal player for 50% of damage dealt
    if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(dmg * 0.5));
    // Hunt Blood Moon F+: 50% lifesteal from damage dealt to bleeding enemy
    if (this.huntBloodMoonActive && this.hasUpgrade('f') && c.bleeding) this.player.heal(Math.ceil(dmg * 0.5));
    // Hunt silver bullets (hybrid): apply bleed + Click+ bonus
    if (proj.texture.key === 'proj-hunt-silver' || this.huntSilverPellets.has(proj)) {
      if (this.hasUpgrade('click') && c.bleeding) {
        c.takeDamage(Math.round(proj.damage * 0.5));
      }
      c.bleeding = true;
      c.bleedingUntil = Math.max(c.bleedingUntil, this.time.now + 8000);
      if (!c.bleedVisual) {
        c.bleedVisual = this.add.circle(c.x, c.y, 26, 0xcc0000, 0.3).setStrokeStyle(2, 0xff2222, 0.5).setDepth(3);
        this.tweens.add({ targets: c.bleedVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
      }
    }
    // Hunt shrapnel (hybrid F+ shriek): apply bleed
    if (this.huntShrapnelSet.has(proj)) {
      c.bleeding = true;
      c.bleedingUntil = Math.max(c.bleedingUntil, this.time.now + 8000);
      if (!c.bleedVisual) {
        c.bleedVisual = this.add.circle(c.x, c.y, 26, 0xcc0000, 0.3).setStrokeStyle(2, 0xff2222, 0.5).setDepth(3);
        this.tweens.add({ targets: c.bleedVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
      }
    }
    // Burn (fire projectile + Flameshredder upgrade)
    if (proj.texture.key === 'proj-fire' && this.hasUpgrade('click')) {
      c.burningUntil = Math.max(c.burningUntil, this.time.now + 3000);
    }
    // Frost stacks (ice projectile)
    if (proj.texture.key === 'proj-ice') {
      if (c.frozenUntil > this.time.now) {
        c.frozenUntil = 0;
        for (let fi = 0; fi < 3; fi++) this.addFrostStackTo(c);
      } else {
        this.addFrostStackTo(c);
        if (proj.isPowered) this.addFrostStackTo(c);
      }
    }
    // Toxic DOT (growth dagger) + R+ exploit bonus on already-infected
    if (proj.texture.key === 'proj-growth-dagger') {
      if (this.hasUpgrade('r') && c.toxicUntil > this.time.now) {
        const bonus = Math.round(proj.damage * 0.25);
        c.takeDamage(bonus);
        this.spawnHitFlash(c.x, c.y, 0xccff44);
        const ft = this.add.text(c.x, c.y - 35, `+${bonus} EXPLOIT`, { fontSize: '10px', color: '#ccff44', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
      }
      c.toxicUntil = this.time.now + 5000 + this.growthLingerBonus;
      c.toxicDps = 2 + this.growthViralBonus;
      c.toxicTickAccum = 0;
    }
    // Bleed (hunt stake)
    if (proj.texture.key === 'proj-hunt-stake') {
      c.bleeding = true;
      c.bleedingUntil = Math.max(c.bleedingUntil, this.time.now + 6000);
    }
    // Magic thorn vine: bind corrupted
    if ((proj as any).isMagicThornVine) {
      c.magicChainBound = true;
      c.magicChainBoundEnd = this.time.now + 2000;
      this.showFloatingText(c.x, c.y - 28, '🌿 BOUND', '#33ff66');
    }
    // Water knockback (click upgrade)
    if (proj.texture.key === 'proj-water' && this.hasUpgrade('click')) {
      const projBody = proj.body as Phaser.Physics.Arcade.Body;
      const vx = projBody.velocity.x;
      const vy = projBody.velocity.y;
      const len = Math.sqrt(vx * vx + vy * vy) || 1;
      const cb = c.body as Phaser.Physics.Arcade.Body;
      cb.setVelocity(cb.velocity.x + (vx / len) * 180, cb.velocity.y + (vy / len) * 180);
    }
    // Light Fallen Angel dagger: apply disarm on hit
    if ((proj as any).isFallenAngelDagger && this.elementId === 'light') {
      this.lightKit.onFallenAngelDaggerHit(c, this.time.now);
    }
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

  /** Damages all player-side targets (enemies list + growths) within radius. */
  /** Returns the nearest active enemy to (fromX, fromY), or `this.npc` as a positional fallback. */
  private getNearestEnemy(fromX: number, fromY: number): Fighter {
    let best: Fighter = this.npc;
    let bestDist = Infinity;
    for (const e of this.enemies) {
      if (!e.active || e.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(fromX, fromY, e.x, e.y);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  private damagePlayerTargets(cx: number, cy: number, radius: number, damage: number, color: number): void {
    for (const t of this.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
        t.takeDamage(damage);
        this.spawnHitFlash(t.x, t.y, color);
      }
    }
    for (const g of this.festeringGrowths) {
      if (!g.active) continue;
      if (Phaser.Math.Distance.Between(cx, cy, g.x, g.y) <= radius) {
        g.takeDamage(damage);
        this.spawnHitFlash(g.x, g.y, color);
      }
    }
  }

  private dealAoeDamageFromOwner(cx: number, cy: number, radius: number, damage: number, owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
          t.takeDamage(damage);
          this.spawnHitFlash(t.x, t.y, 0x9944ff);
          this.spawnDamageNumber(t.x, t.y - 28, damage);
        }
      }
      for (const g of this.festeringGrowths) {
        if (!g.active) continue;
        if (Phaser.Math.Distance.Between(cx, cy, g.x, g.y) <= radius) {
          g.takeDamage(damage);
          this.spawnHitFlash(g.x, g.y, 0x9944ff);
          this.spawnDamageNumber(g.x, g.y - 28, damage);
        }
      }
    } else {
      if (Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) <= radius) {
        this.player.takeDamage(damage);
        this.spawnHitFlash(this.player.x, this.player.y, 0x9944ff);
        this.spawnDamageNumber(this.player.x, this.player.y - 28, damage);
      }
    }
  }

  private spawnFloatingText(x: number, y: number, label: string, color: string): void {
    const txt = this.add.text(x, y, label, {
      fontSize: '12px', fontFamily: 'monospace', color, stroke: '#000033', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: txt, y: y - 36, alpha: 0, duration: 1200, ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  public spawnPoisonPuddle(x: number, y: number, owner: 'player' | 'npc', dmgMult = 1): void {
    const radius = Math.round(38 * dmgMult);
    const spr = this.add.circle(x, y, radius, 0x44cc44, 0.5).setDepth(3);
    this.tweens.add({ targets: spr, scaleX: 1.15, scaleY: 1.15, alpha: 0.3, duration: 600 });
    this.puddles.push({ sprite: spr, expiresAt: this.time.now + 5000, x, y, radius, tickAccum: 0, owner });
  }

  public spawnSlowPuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const radius = 36;
    const spr = this.add.circle(x, y, radius, 0x8833cc, 0.45).setDepth(2);
    this.tweens.add({ targets: spr, scaleX: 1.2, scaleY: 1.2, alpha: 0.2, duration: 700 });
    this.puddles.push({ sprite: spr, expiresAt: this.time.now + 6000, x, y, radius, tickAccum: 0, owner });
  }


}