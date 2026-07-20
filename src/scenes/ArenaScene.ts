import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Player } from '../entities/Player';
import { NpcOpponent, NpcAiState, DIFFICULTY_PRESETS, DifficultyConfig } from '../entities/NpcOpponent';
import { Husk } from '../invasion/Husk';
import { InvasionKit, InvasionArenaApi, getInvasionDifficulty } from '../invasion/InvasionKit';
import { InvasionCoopKit, InvasionCoopArenaApi } from '../invasion/InvasionCoopKit';
import { Projectile } from '../combat/Projectile';
import { OnlineKit, OnlineArenaApi } from '../network/OnlineKit';
import { Net } from '../network/NetworkManager';
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
import { CrystalKit, CrystalArenaApi } from '../elements/kits/CrystalKit';
import { EarthKit, EarthArenaApi } from '../elements/kits/EarthKit';
import { ElectricityKit, ElectricityArenaApi } from '../elements/kits/ElectricityKit';
import { VoidKit, VoidArenaApi } from '../elements/kits/VoidKit';
import { TechnologyKit, TechArenaApi } from '../elements/kits/TechnologyKit';
import { SlimeKit, SlimeArenaApi } from '../elements/kits/SlimeKit';
import { WaterKit, WaterArenaApi, Geyser } from '../elements/kits/WaterKit';
import { LifeKit, LifeArenaApi } from '../elements/kits/LifeKit';
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
import { AirKit, AirArenaApi } from '../elements/kits/AirKit';
import { DeathKit, DeathArenaApi } from '../elements/kits/DeathKit';
import { MagicKit, MagicArenaApi } from '../elements/kits/MagicKit';
import { TimeKit, TimeArenaApi } from '../elements/kits/TimeKit';
import { PlasmaKit, PlasmaArenaApi } from '../elements/kits/PlasmaKit';
import { MetalKit, MetalArenaApi } from '../elements/kits/MetalKit';
import { dummyElement } from '../elements/dummy';
import * as PlayerData from '../data/PlayerData';
import { getEnhancement } from '../data/Mastery';
import { getTotalRewardMult, MUTATIONS, getBossMutationIds } from '../data/Mutations';
import { consumedItemIds, clearConsumedItems } from '../data/Items';
import { HP_SCALE } from '../data/Balance';
import { ItemsKit } from '../elements/kits/ItemsKit';
import { computeCurseShardMult } from '../data/GauntletBoosts';
import { INFINITY_GAUNTLET_ID, infinityHpMult, infinityDmgMult, infinityFightShards, infinityDifficulty, GauntletState, getEffectiveStacks } from '../data/GauntletData';
import { drawCampaignBackground } from './CampaignBackground';
import { BASE_GROWTH_MUTATIONS, ADVANCED_GROWTH_MUTATIONS, INFECT_GROWTH_MUTATION_IDS } from '../data/GrowthMutations';

/** Air's Tracking Vortex (R upgrade): how fast the Wind Trap chases the cursor, px/sec. */
const TRACKING_VORTEX_SPEED = 120;

interface AbilityBarEntry {
  fill: Phaser.GameObjects.Rectangle;
  abilityId: string;
  maxWidth: number;
  lbl?: Phaser.GameObjects.Text;
  baseFillColor?: number;
  lockedIcon?: Phaser.GameObjects.Text;
}

interface Puddle {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Graphics;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
  kind?: 'puddle' | 'stalagmite' | 'poison' | 'lava' | 'abyss' | 'toxic';
  lavaFinal?: boolean;
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
  skater?: boolean;
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

interface ClotTree {
  trunk: Phaser.GameObjects.Rectangle;
  canopy: Phaser.GameObjects.Arc;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  x: number; y: number;
  /** Invisible Fighter registered in enemies/enemyGroup so every damage path can hurt the tree. */
  hitbox: Fighter;
}

interface AmberDino {
  sprite: Phaser.GameObjects.Arc;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  hp: number;
  maxHp: number;
  speed: number;
}

interface TinkerBuilding {
  kind: 'turret' | 'dispenser' | 'turret+' | 'dispenser+' | 'shredder';
  sprite: Phaser.GameObjects.Rectangle;
  aura: Phaser.GameObjects.Arc | null;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  x: number; y: number;
  hp: number; maxHp: number;
  bulletAccum: number;
  rocketAccum: number;
  tickAccum: number;
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

// Speed the Hawk perk (Air) drags a snatched enemy toward the cursor.
const HAWK_DRAG_SPEED = 1200;

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private npc!: Fighter;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private playerElement!: Element;
  private npcElement!: Element;
  private elementId = 'fire';
  private npcElementId = 'water';
  private npcDifficulty!: DifficultyConfig;
  private isInvasion = false;

  // ── Online multiplayer ─────────────────────────────────────────
  private isOnline = false;
  private onlineKit: OnlineKit | null = null;
  private onlineEndReason: string | null = null;
  private onlineForfeitArmedUntil = 0;
  private onlinePingText: Phaser.GameObjects.Text | null = null;
  private campaign: { slot: 0 | 1 | 2; worldId: string; fightId: string; isChallenge: boolean } | null = null;
  private enemies: Fighter[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private invasionKit!: InvasionKit;
  private invasionCoopKit: InvasionCoopKit | null = null;


  // Dummy mode keys (arrow keys + P for dummy control)
  private dummyUpKey!: Phaser.Input.Keyboard.Key;
  private dummyDownKey!: Phaser.Input.Keyboard.Key;
  private dummyLeftKey!: Phaser.Input.Keyboard.Key;
  private dummyRightKey!: Phaser.Input.Keyboard.Key;
  private dummyFireKey!: Phaser.Input.Keyboard.Key;
  private dummyBackBtn: Phaser.GameObjects.Text | null = null;

  // NPC air state
  private npcAirElectroCharged = false;
  private npcAirBeamWalking = false;

  // NPC shadow dance charge
  private npcShadowDanceCharge = 0;

  // NPC shadow black hole state
  private npcShadowBlackHoleCharging = false;
  private npcShadowBlackHoleChargeStart = 0;
  private npcShadowBlackHoleChargeVisual: Phaser.GameObjects.Arc | null = null;
  private npcShadowBlackHoleActive = false;
  private npcShadowBlackHoleEnd = 0;
  private npcShadowBlackHoleSprite: Phaser.GameObjects.Graphics | null = null;

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
  /** slot ('e'/'r'/'f'/'q') -> mastery enhancement id bound over that ability this match. */
  private masterySlotBinds: Record<string, string> = {};
  private pausedAt = 0;

  // Shared state — reset in create()
  private abilityBars: AbilityBarEntry[] = [];
  // Top-of-screen player health bar
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private hpBarShield?: Phaser.GameObjects.Rectangle;
  private hpBarText?: Phaser.GameObjects.Text;
  private readonly hpBarW = 420;
  private readonly hpBarH = 24;
  private dodgeOnCooldown = false;
  private isDodging = false;
  private gameEnded = false;
  private playerSpeedMult = 1;
  private gauntletState: import('../data/GauntletData').GauntletState | null = null;
  private gauntletSpeedMult = 1;
  // Card-system state (reset each match start)
  private cardCrippleActive = false;
  private cardCrippleSlowUntil = 0;
  private cardSluggishDisableDodge = false;
  private cardDodgeLengthMult = 1;
  private cardDodgeCdMult = 1;
  private cardPsychoActive = false;
  private cardBomberStacks = 0;

  // (Player fire state moved to FireKit)
  private pointerWasDown = false;
  private rightPointerWasDown = false;
  private nukeChanneling = false;
  private nukeChannelEnd = 0;
  private nukeLockStartTime = 0;

  // WaterKit
  private waterKit!: WaterKit;
  private lifeKit!: LifeKit;

  // Player water-specific state
  private splashActiveUntil = 0;
  private splashDropAccum = 0;
  private splashDropCount = 0;         // E upgrade: tracks puddle index in splash sequence
  private playerGeyserBuffUntil = 0;

  // Life state lives in LifeKit — see src/elements/kits/LifeKit.ts

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
  private tornadoGrappleSlowUntil = 0;

  // Earth kit
  private earthKit!: EarthKit;

  // Mutations
  private mutations: Set<string> = new Set();
  private starredMutations: Set<string> = new Set();
  // Molten mutation state
  private moltenSpawnAccum = 0;
  private moltenLastNpcX = 0;
  private moltenLastNpcY = 0;
  // Blustery mutation state
  private blusteryProximityAccum = 0;
  private blusteryBonusSpeedMult = 1;
  private blusteryDodgeChanceTarget = 0;
  // Titanic mutation state
  private titanicShields: Array<{ sprite: Phaser.GameObjects.Arc }> = [];
  private titanicOrbitAngle = 0;
  // Parasitic mutation state
  private parasiticRegenAccum = 0;
  private parasiticLastPlayerHp = 0;
  // Chaos mutation state
  private chaosExplodeAccum = 0;
  // Abyss mutation state
  private abyssInvincibleUntil = 0;
  private abyssNextActivateAt = 0;
  private abyssTrailSpawnAccum = 0;
  // Tinker mutation state
  private tinkerSpawnAccum = 0;
  private tinkerBuildings: TinkerBuilding[] = [];
  // Phantom mutation state
  private phantomNextTeleportAt = 0;
  private phantomInvisibleUntil = 0;
  // Pain mutation state
  private painTriggered = false;
  private painInvincUntil = 0;
  private painLabel: Phaser.GameObjects.Text | null = null;
  // Clot mutation state
  private clotTree: ClotTree | null = null;
  private clotLink: Phaser.GameObjects.Graphics | null = null;
  private clotProjectiles: Array<{ sprite: Phaser.GameObjects.Arc; vx: number; vy: number; active: boolean }> = [];
  private clotBurstAccum = 0;
  // Encroach mutation state
  private encroachMines: Array<{ sprite: Phaser.GameObjects.Arc; inner: Phaser.GameObjects.Arc; x: number; y: number; armed: boolean }> = [];
  private encroachSlowStacks: number[] = [];
  private encroachLastPlayerHp = 0;
  private encroachWallGfx: Phaser.GameObjects.Graphics | null = null;
  // Empyreon boss mutation state
  private empyreonNextBeamAt = 0;
  private empyreonBeamOrientation: 'h' | 'v' = 'h';
  private empyreonBeams: Array<{ sprite: Phaser.GameObjects.Rectangle; expiresAt: number; lastTickAt: number; isH: boolean; fixedCoord: number; halfThick: number }> = [];
  private empyreonPhase2 = false;
  private empyreonNextTeleportAt = 0;
  // Archfiend boss mutation state
  private archfiendNextBarrageAt = 0;
  private archfiendTridents: Array<{ sprite: Phaser.GameObjects.Rectangle; vx: number; vy: number; stuck: boolean; returnsAt: number }> = [];
  private archfiendPhase2 = false;
  private archfiendFirePoolAccum = 0;
  // Summoner boss mutation state
  private summonerNextWaveAt = 0;
  private summonerZombies: Array<{ sprite: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text; hp: number; attackCdUntil: number }> = [];
  private summonerZombielings: Array<{ sprite: Phaser.GameObjects.Arc; hp: number; attackCdUntil: number }> = [];
  private summonerPhase2 = false;
  private summonerNextHealCheckAt = 0;
  // Nuclear mutation state
  private nuclearStartedAt = 0;
  private nuclearDurationMs = 0;
  private nuclearText: Phaser.GameObjects.Text | null = null;
  private nuclearDetonated = false;
  // Amber mutation state
  private amberDino: AmberDino | null = null;
  private amberMountRing: Phaser.GameObjects.Arc | null = null;
  private amberAttackAccum = 0;
  private amberAttackKind = 0; // 0=claw, 1=bite, 2=breath(starred)
  private amberBreathActive = false;
  private amberBreathEndAt = 0;
  private amberBreathTickAccum = 0;
  private amberBreathGfx: Phaser.GameObjects.Graphics | null = null;
  private amberSlowStacks: number[] = [];
  private amberPlayerBleedUntil = 0;
  private amberPlayerBleedTickAccum = 0;
  // Apprehension boss mutation state
  private apprehensionMazeWalls: Array<{ rect: Phaser.GameObjects.Rectangle; x: number; y: number; w: number; h: number }> = [];
  private apprehensionFogRT: Phaser.GameObjects.RenderTexture | null = null;
  private apprehensionFogEraser: Phaser.GameObjects.Graphics | null = null;
  private apprehensionPhase2 = false;
  private apprehensionNextTeleportAt = 0;
  private apprehensionNpcLitByFlashlight = false;
  private apprehensionEyeSprite: Phaser.GameObjects.Arc | null = null;
  // Wither mutation state
  private playerWitherStacks = 0;
  private playerWitherTickAccum = 0;
  private playerWitherAura: Phaser.GameObjects.Arc | null = null;
  private witherTickInProgress = false;
  // Honor mutation state
  private honorPlayerTally = 0;
  private honorNpcTally = 0;
  private honorPlayerCdUntil = 0;
  private honorNpcCdUntil = 0;
  private honorPlayerTallyTexts: Phaser.GameObjects.Text[] = [];
  private honorNpcTallyTexts: Phaser.GameObjects.Text[] = [];
  // Golf mutation state
  private golfBall: { sprite: Phaser.Physics.Arcade.Image; vx: number; vy: number; lastEnemyHitAt: number; radius: number } | null = null;
  private golfBallSpeedLabel: Phaser.GameObjects.Text | null = null;

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
  private playerPermafrostVisual: Phaser.GameObjects.Text | null = null;
  private playerPermavoidVisual: Phaser.GameObjects.Text | null = null;
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
  private growthMorphMenuOpen = false;
  private growthMorphMenuButtons: Phaser.GameObjects.GameObject[] = [];
  private growthSlowMorphLastCast = -99999;
  private growthDefSpores: Array<{ sprite: Phaser.GameObjects.Arc; vel: { x: number; y: number }; destroyAt: number }> = [];
  private growthDamageReductionUntil = 0;
  private growthDamageReductionActive = false;
  private growthCancerousGrowths: Array<{ img: Phaser.GameObjects.Arc; target: Fighter; offsetX: number; offsetY: number }> = [];
  private npcCancerousSlowUntil = 0;
  private growthRBonusInProgress = false;
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

  // Time kit (replaces all inline sand/Time state)
  private timeKit!: TimeKit;

  // Player upgrade state
  private activeUpgrades: string[] = [];
  // Mastered Flameshredder — player burns from NPC fireballs
  private playerBurningUntil = 0;
  private playerBurnTickAccum = 0;
  private playerBurnAura: Phaser.GameObjects.Arc | null = null;
  private playerIntoxicationBar: Phaser.GameObjects.Rectangle | null = null;
  // (Pressure Charge / Flame Body / Flame Charge state moved to FireKit)
  private fKeyHeldSince = 0;
  private fKeyWasDown = false;

  // Electricity kit
  private electricityKit!: ElectricityKit;

  private lightKit!: LightKit;
  private crystalKit!: CrystalKit;
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

  // ── Metal (electricity + fate abstract combined) — managed by MetalKit ─
  private metalKit!: MetalKit;

  // ── Plasma (electricity + light abstract combined) — managed by PlasmaKit ─
  private plasmaKit!: PlasmaKit;

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
  private fireMasteryOn = false;
  private fireBurstWindow: { time: number; dmg: number }[] = [];
  private fireMasteryTrackedEnemies = new WeakSet<Fighter>();

  // ── Water mastery ─────────────────────────────────────────────────────
  private waterMasteryOn = false;
  /** Rolling kill timestamps for the Riptide challenge (5 kills inside 3s). */
  private waterKillWindow: number[] = [];
  private waterMasteryTrackedEnemies = new WeakSet<Fighter>();

  // ── Air kit (mastery only — base air abilities still live in this scene) ──
  private airKit!: AirKit;
  private airMasteryOn = false;

  // ── Oil mastery ───────────────────────────────────────────────────────
  private oilMasteryOn = false;

  // ── Earth mastery ─────────────────────────────────────────────────────
  private earthMasteryOn = false;
  /** Screen-blur guard for Dust Screen hitting the local human — only the latest call may clear it. */
  private screenBlurUntil = 0;

  // ── Life mastery ──────────────────────────────────────────────────────
  private lifeMasteryOn = false;

  // ── Items kit ─────────────────────────────────────────────────────────
  private itemsKit!: ItemsKit;

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
  private npcHawkDragX = 0;
  private npcHawkDragY = 0;
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
  // Skater mode (Ice F revamp)
  private playerSkaterActive = false;
  private playerSkaterCancelableAt = 0;
  private playerSkaterHeading = 0;
  private playerSkaterTrailAccum = 0;
  private readonly playerSkaterSpeed = 220;
  private readonly playerSkaterTurnRate = 3.0;
  // Ice arenas (Ice F+ Skate-in-BlockUp / Skate-in-BlackIce)
  private iceArenas: Array<{
    sprite: Phaser.GameObjects.Arc;
    x: number; y: number; radius: number;
    expiresAt: number; tickAccum: number;
    isVoid: boolean; owner: 'player' | 'npc';
  }> = [];
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

  create(data: { elementId: string; enemyElementId?: string; difficulty?: number; mutations?: string[]; starredMutations?: string[]; mode?: string; invasionDifficulty?: string; gauntlet?: import('../data/GauntletData').GauntletState; playerPerk?: string | null; npcPerk?: string | null; campaign?: { slot: 0 | 1 | 2; worldId: string; fightId: string; isChallenge: boolean }; hpMult?: number; npcOutgoingDamageMult?: number; online?: { isHost: boolean } }): void {
    this.elementId = data.elementId ?? 'fire';
    this.isInvasion = data.mode === 'invasion';
    this.isOnline = !!data.online;
    this.onlineEndReason = null;
    this.onlineForfeitArmedUntil = 0;
    this.campaign = data.campaign ?? null;
    this.playerPerkId = data.playerPerk ?? null;
    this.npcPerkId = data.npcPerk ?? null;
    const enemyElementId = data.enemyElementId ?? (this.elementId === 'fire' ? 'water' : 'fire');
    this.npcElementId = enemyElementId;
    const difficultyLevel = Math.max(1, Math.min(5, data.difficulty ?? 3));
    // Online: the "NPC" is a remote human replica — neutral stats matching a Player, no AI fuzz.
    const difficultyConfig: DifficultyConfig = this.isOnline
      ? { level: 3, label: 'PvP', hp: 200 * HP_SCALE, speed: 200, aimOffsetDeg: 0, dodgeRange: 0, castSkipChance: 0 }
      : DIFFICULTY_PRESETS[difficultyLevel - 1];
    this.npcDifficulty = difficultyConfig;

    this.playerElement = ELEMENT_MAP[this.elementId] ?? fireElement;
    this.npcElement    = ELEMENT_MAP[enemyElementId] ?? waterElement;

    // Reset all mutable state
    this.gameEnded = false;
    this.dodgeOnCooldown = false;
    this.isDodging = false;
    this.abilityBars = [];
    this.hpBarFill = undefined;
    this.hpBarShield = undefined;
    this.hpBarText = undefined;
    // Reset perk-specific state
    this.purgePriorCooldownMult = 1;
    if (this.purgePulseTween) { this.purgePulseTween.stop(); this.purgePulseTween = null; }
    this.hawkProjectiles.forEach((h) => h.sprite.destroy());
    this.hawkProjectiles = [];
    this.npcHawkDragUntil = 0;
    this.npcHawkDragX = 0;
    this.npcHawkDragY = 0;
    this.automatons.forEach((a) => a.sprite.destroy());
    this.automatons = [];
    this.playerSkateRecentUntil = 0;
    this.npcSkateRecentUntil = 0;
    this.playerSkaterActive = false;
    this.playerSkaterCancelableAt = 0;
    this.playerSkaterHeading = 0;
    this.playerSkaterTrailAccum = 0;
    this.iceArenas.forEach(a => a.sprite.destroy());
    this.iceArenas = [];
    this.soulWardHexes.forEach((w) => {
      w.gfx.destroy(); w.ownerAura?.destroy();
      w.summonAuras.forEach((sa) => sa.arc.destroy());
    });
    this.soulWardHexes = [];

    this.playerHuntRage = 0; this.npcHuntRage = 0;
    this.playerHuntRageBar?.destroy(); this.playerHuntRageBar = null;
    this.npcHuntRageBar?.destroy();    this.npcHuntRageBar = null;
    this.playerHuntRageTriggeredBeast = false;
    this.npcHuntRageTriggeredBeast    = false;
    this.playerSpeedMult = 1;
    this.gauntletState = data.gauntlet ?? null;
    this.gauntletSpeedMult = 1;
    this.cardCrippleActive = false;
    this.cardCrippleSlowUntil = 0;
    this.cardSluggishDisableDodge = false;
    this.cardDodgeLengthMult = 1;
    this.cardDodgeCdMult = 1;
    this.cardPsychoActive = false;
    this.cardBomberStacks = 0;
    this.pointerWasDown = false;
    this.rightPointerWasDown = false;
    this.nukeChanneling = false;
    this.nukeChannelEnd = 0;

    this.splashActiveUntil = 0;
    this.splashDropAccum = 0;
    this.splashDropCount = 0;
    this.playerGeyserBuffUntil = 0;

    this.npcSpeedMult = 1;
    this.npcNukeChanneling = false;
    this.npcNukeChannelEnd = 0;
    this.npcSplashActiveUntil = 0;
    this.npcSplashDropAccum = 0;
    this.npcGeyserBuffUntil = 0;
    this.npcQuickShotCharged = false;
    this.npcAirConsecutiveHits = 0;
    this.npcWindTrapX = 0;
    this.npcWindTrapY = 0;
    this.npcWindTrapExpiry = 0;
    this.npcWindTrapSprite = null;

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

    this.npcCastId = null;

    this.npcAirElectroCharged = false;
    this.npcAirBeamWalking = false;
    this.npcShadowDanceCharge = 0;
    this.npcShadowBlackHoleCharging = false;
    this.npcShadowBlackHoleChargeStart = 0;
    this.npcShadowBlackHoleChargeVisual = null;
    this.npcShadowBlackHoleActive = false;
    this.npcShadowBlackHoleEnd = 0;
    this.npcShadowBlackHoleSprite = null;
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
    this.playerPermafrostVisual = null;
    this.playerPermavoidVisual = null;
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

    // Time kit reset
    if (this.timeKit) { this.timeKit.reset(); }

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
    for (const btn of this.growthMorphMenuButtons) (btn as unknown as { destroy(): void }).destroy();
    this.growthMorphMenuButtons = [];
    this.growthMorphMenuOpen = false;
    this.growthSlowMorphLastCast = -99999;
    for (const ds of this.growthDefSpores) ds.sprite.destroy();
    this.growthDefSpores = [];
    this.growthDamageReductionUntil = 0;
    if (this.growthDamageReductionActive) { this.player.incomingDamageMultiplier = 1; this.growthDamageReductionActive = false; }
    for (const cg of this.growthCancerousGrowths) cg.img.destroy();
    this.growthCancerousGrowths = [];
    this.npcCancerousSlowUntil = 0;
    this.growthRBonusInProgress = false;
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

    // Online: shop upgrades are disabled so both simulations stay symmetric.
    this.activeUpgrades = this.isOnline ? [] : PlayerData.getActiveUpgrades(this.elementId);
    this.playerBurningUntil = 0;
    this.playerBurnTickAccum = 0;
    this.playerBurnAura = null;
    this.playerIntoxicationBar = null;
    this.fKeyHeldSince = 0;
    this.fKeyWasDown = false;
    this.fireMasteryOn = PlayerData.isMasteryEnabled('fire');
    this.masterySlotBinds = PlayerData.isMasteryEnabled(this.elementId)
      ? PlayerData.getMasteryBinds(this.elementId)
      : {};
    this.fireBurstWindow = [];
    this.fireMasteryTrackedEnemies = new WeakSet<Fighter>();
    this.waterMasteryOn = PlayerData.isMasteryEnabled('water');
    this.airMasteryOn = PlayerData.isMasteryEnabled('air');
    this.oilMasteryOn = PlayerData.isMasteryEnabled('oil');
    this.lifeMasteryOn = PlayerData.isMasteryEnabled('life');
    this.earthMasteryOn = PlayerData.isMasteryEnabled('earth');
    this.waterKillWindow = [];
    this.waterMasteryTrackedEnemies = new WeakSet<Fighter>();
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
        get masteryActive() { return arena.fireMasteryOn && arena.elementId === 'fire'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        lockCaster: (ms) => { arena.nukeChanneling = true; arena.nukeChannelEnd = arena.time.now + ms; (arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0); },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        spawnFlamethrowerCone: (px, py, tx, ty) => arena.spawnFlamethrowerCone(px, py, tx, ty),
        damagePlayerTargets: (cx, cy, r, d, col) => arena.damagePlayerTargets(cx, cy, r, d, col),
        dealFlameNukeDamage: (cx, cy, r, d) => arena.dealFlameNukeDamage(cx, cy, r, d),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'fire') PlayerData.addMasteryStat('fire', key, amount);
        },
        clearPlayerDots: () => {
          arena.playerBurningUntil = 0;
          arena.playerToxicUntil = 0;
          arena.playerBleeding = false;
          arena.playerBleedingUntil = 0;
        },
      };
      this.fireKit = new FireKit(fireApi);
    }
    // WaterKit adapter
    if (this.waterKit) {
      this.waterKit.reset();
    } else {
      const arena = this;
      const waterApi: WaterArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get geysers() { return arena.geysers; },
        get puddles() { return arena.puddles; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get masteryActive() { return arena.waterMasteryOn && arena.elementId === 'water'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'water') PlayerData.addMasteryStat('water', key, amount);
        },
        isPlayerWater: () => arena.elementId === 'water',
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        lockCaster: (ms) => { arena.nukeChanneling = true; arena.nukeChannelEnd = arena.time.now + ms; (arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0); },
        releaseCaster: () => { arena.nukeChanneling = false; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        damagePlayerTargets: (cx, cy, r, d, col) => arena.damagePlayerTargets(cx, cy, r, d, col),
        removeGeyser: (g) => {
          const idx = arena.geysers.indexOf(g);
          if (idx !== -1) { g.sprite.destroy(); arena.geysers.splice(idx, 1); }
        },
        setPlayerGeyserBuffUntil: (t) => { arena.playerGeyserBuffUntil = t; },
        setNpcGeyserBuffUntil: (t) => { arena.npcGeyserBuffUntil = t; },
      };
      this.waterKit = new WaterKit(waterApi);
    }
    // AirKit adapter
    if (this.airKit) {
      this.airKit.reset();
    } else {
      const arena = this;
      const airApi: AirArenaApi = {
        get player() { return arena.player; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get masteryActive() { return arena.airMasteryOn && arena.elementId === 'air'; },
        get windTrap() {
          return arena.time.now < arena.playerWindTrapExpiry
            ? { x: arena.playerWindTrapX, y: arena.playerWindTrapY }
            : null;
        },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'air') PlayerData.addMasteryStat('air', key, amount);
        },
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
      };
      this.airKit = new AirKit(airApi);
    }
    // LifeKit adapter
    if (this.lifeKit) {
      this.lifeKit.reset();
    } else {
      const arena = this;
      const lifeApi: LifeArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        isPlayerLife: () => arena.elementId === 'life',
        get masteryActive() { return arena.lifeMasteryOn && arena.elementId === 'life'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'life') PlayerData.addMasteryStat('life', key, amount);
        },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
      };
      this.lifeKit = new LifeKit(lifeApi);
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
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
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
        hasPerk: (perkId) => arena.hasPerk('player', perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
      };
      this.lightKit = new LightKit(lightApi);
    }

    // CrystalKit adapter
    if (this.crystalKit) {
      this.crystalKit.reset();
    } else {
      const arena = this;
      const crystalApi: CrystalArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
      };
      this.crystalKit = new CrystalKit(crystalApi);
    }

    // EarthKit adapter
    if (this.earthKit) {
      this.earthKit.reset();
    } else {
      const arena = this;
      const earthApi: EarthArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get npcCastId() { return arena.npcCastId; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get playerAbilities() { return arena.playerElement.abilities; },
        get abilityBars() { return arena.abilityBars; },
        get isDodging() { return arena.isDodging; },
        set isDodging(v: boolean) { arena.isDodging = v; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        get masteryActive() { return arena.earthMasteryOn && arena.elementId === 'earth'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'earth') PlayerData.addMasteryStat('earth', key, amount);
        },
        applyScreenBlur: (ms) => arena.applyScreenBlur(ms),
      };
      this.earthKit = new EarthKit(earthApi);
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
    this.tornadoGrappleSlowUntil = 0;

    this.mutations = new Set();
    this.starredMutations = new Set();
    this.moltenSpawnAccum = 0;
    this.moltenLastNpcX = 0;
    this.moltenLastNpcY = 0;
    this.blusteryProximityAccum = 0;
    this.blusteryBonusSpeedMult = 1;
    this.blusteryDodgeChanceTarget = 0;
    for (const sh of this.titanicShields) sh.sprite.destroy();
    this.titanicShields = [];
    this.titanicOrbitAngle = 0;
    this.parasiticRegenAccum = 0;
    this.parasiticLastPlayerHp = 0;
    this.chaosExplodeAccum = 0;
    this.abyssInvincibleUntil = 0;
    this.abyssNextActivateAt = 0;
    this.abyssTrailSpawnAccum = 0;
    this.tinkerSpawnAccum = 0;
    for (const b of this.tinkerBuildings) this.destroyTinkerBuilding(b);
    this.tinkerBuildings = [];
    this.phantomNextTeleportAt = 0;
    this.phantomInvisibleUntil = 0;
    this.painTriggered = false;
    this.painInvincUntil = 0;
    if (this.painLabel) { this.painLabel.destroy(); this.painLabel = null; }
    // Scene restart already destroyed the tree's display objects, hitbox, and
    // the old enemyGroup — just drop the stale reference (don't touch the group).
    this.clotTree = null;
    if (this.clotLink) { this.clotLink.destroy(); this.clotLink = null; }
    for (const p of this.clotProjectiles) p.sprite.destroy();
    this.clotProjectiles = [];
    this.clotBurstAccum = 0;
    for (const m of this.encroachMines) { m.sprite.destroy(); m.inner.destroy(); }
    this.encroachMines = [];
    this.encroachSlowStacks = [];
    this.encroachLastPlayerHp = 0;
    if (this.encroachWallGfx) { this.encroachWallGfx.destroy(); this.encroachWallGfx = null; }
    for (const b of this.empyreonBeams) b.sprite.destroy();
    this.empyreonBeams = [];
    this.empyreonNextBeamAt = 0;
    this.empyreonBeamOrientation = 'h';
    this.empyreonPhase2 = false;
    this.empyreonNextTeleportAt = 0;
    for (const t of this.archfiendTridents) t.sprite.destroy();
    this.archfiendTridents = [];
    this.archfiendNextBarrageAt = 0;
    this.archfiendPhase2 = false;
    this.archfiendFirePoolAccum = 0;
    for (const z of this.summonerZombies) { z.sprite.destroy(); z.label.destroy(); }
    this.summonerZombies = [];
    for (const zl of this.summonerZombielings) zl.sprite.destroy();
    this.summonerZombielings = [];
    this.summonerNextWaveAt = 0;
    this.summonerPhase2 = false;
    this.summonerNextHealCheckAt = 0;
    if (this.nuclearText) { this.nuclearText.destroy(); this.nuclearText = null; }
    this.nuclearStartedAt = 0;
    this.nuclearDurationMs = 0;
    this.nuclearDetonated = false;
    if (this.amberDino) {
      this.amberDino.sprite.destroy();
      this.amberDino.hpBg.destroy();
      this.amberDino.hpBar.destroy();
      this.amberDino.hpLabel.destroy();
      this.amberDino = null;
    }
    if (this.amberMountRing) { this.amberMountRing.destroy(); this.amberMountRing = null; }
    if (this.amberBreathGfx) { this.amberBreathGfx.destroy(); this.amberBreathGfx = null; }
    this.amberAttackAccum = 0;
    this.amberAttackKind = 0;
    this.amberBreathActive = false;
    this.amberBreathEndAt = 0;
    this.amberBreathTickAccum = 0;
    this.amberSlowStacks = [];
    this.amberPlayerBleedUntil = 0;
    this.amberPlayerBleedTickAccum = 0;
    for (const w of this.apprehensionMazeWalls) w.rect.destroy();
    this.apprehensionMazeWalls = [];
    if (this.apprehensionFogRT) { this.apprehensionFogRT.destroy(); this.apprehensionFogRT = null; }
    if (this.apprehensionFogEraser) { this.apprehensionFogEraser.destroy(); this.apprehensionFogEraser = null; }
    if (this.apprehensionEyeSprite) { this.apprehensionEyeSprite.destroy(); this.apprehensionEyeSprite = null; }
    this.apprehensionPhase2 = false;
    this.apprehensionNpcLitByFlashlight = false;
    this.apprehensionNextTeleportAt = 0;
    // Wither mutation reset
    this.playerWitherStacks = 0;
    this.playerWitherTickAccum = 0;
    this.witherTickInProgress = false;
    if (this.playerWitherAura) { this.playerWitherAura.destroy(); this.playerWitherAura = null; }
    // Honor mutation reset
    this.honorPlayerTally = 0;
    this.honorNpcTally = 0;
    this.honorPlayerCdUntil = 0;
    this.honorNpcCdUntil = 0;
    for (const t of this.honorPlayerTallyTexts) t.destroy();
    this.honorPlayerTallyTexts = [];
    for (const t of this.honorNpcTallyTexts) t.destroy();
    this.honorNpcTallyTexts = [];
    // Golf mutation reset
    if (this.golfBall) { this.golfBall.sprite.destroy(); this.golfBall = null; }
    if (this.golfBallSpeedLabel) { this.golfBallSpeedLabel.destroy(); this.golfBallSpeedLabel = null; }

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
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        setIsDodging: (v) => { arena.isDodging = v; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
      };
      this.magnetKit = new MagnetKit(magnetApi);
    }

    // Metal kit
    if (this.metalKit) {
      this.metalKit.reset();
    } else {
      const arena = this;
      const metalApi: MetalArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (perkId) => arena.hasPerk('player', perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        dealAoeDamage: (cx, cy, radius, damage, owner) => arena.dealAoeDamageFromOwner(cx, cy, radius, damage, owner),
      };
      this.metalKit = new MetalKit(metalApi);
    }

    // Plasma kit
    if (this.plasmaKit) {
      this.plasmaKit.reset();
    } else {
      const arena = this;
      const plasmaApi: PlasmaArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getPlayerSpeedMult: () => arena.playerSpeedMult,
        setPlayerSpeedMult: (v) => { arena.playerSpeedMult = v; },
        setNpcSpeedMult: (v) => { arena.npcSpeedMult = v; },
        buildPlayerContext: (mx, my) => arena.buildPlayerContext(mx, my),
        dealAoeDamage: (cx, cy, radius, damage, owner) => arena.dealAoeDamageFromOwner(cx, cy, radius, damage, owner),
      };
      this.plasmaKit = new PlasmaKit(plasmaApi);
    }

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
        getNpcPlasmaIncarnateActive: () => arena.plasmaKit.getNpcIncarnateActive(),
        setNpcPlasmaIncarnateActive: v => { arena.plasmaKit.setNpcIncarnateActive(v); },
        getNpcDeathSoulSplitUntil: () => arena.npcDeathSoulSplitUntil,
        setNpcDeathSoulSplitUntil: v => { arena.npcDeathSoulSplitUntil = v; },
        getHuntBloodMoonActive: () => arena.huntBloodMoonActive,
        setHuntBloodMoonActive: v => { arena.huntBloodMoonActive = v; },
        getPlasmaIncarnateActive: () => arena.plasmaKit.getIncarnateActive(),
        setPlasmaIncarnateActive: v => { arena.plasmaKit.setIncarnateActive(v); },
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
        getNpcMetalChainTetherEnd: () => arena.metalKit.getNpcMetalChainTetherEnd(),
        setNpcMetalChainTetherEnd: v => { arena.metalKit.setNpcMetalChainTetherEnd(v); },
        getNpcMetalArmorEnd: () => arena.metalKit.getNpcMetalArmorEnd(),
        setNpcMetalArmorEnd: v => { arena.metalKit.setNpcMetalArmorEnd(v); },
        getNpcHuntSlowUntil: () => arena.npcHuntSlowUntil,
        setNpcHuntSlowUntil: v => { arena.npcHuntSlowUntil = v; },
        getNpcHuntConfusedUntil: () => arena.npcHuntConfusedUntil,
        setNpcHuntConfusedUntil: v => { arena.npcHuntConfusedUntil = v; },
        getNpcSlimeSlowUntil: () => arena.slimeKit.getNpcSlimeSlowUntil(),
        setNpcSlimeSlowUntil: v => { arena.slimeKit.setNpcSlimeSlowUntil(v); },
        getNpcAggressiveBleedUntil: () => arena.metalKit.getNpcAggressiveBleedUntil(),
        setNpcAggressiveBleedUntil: v => { arena.metalKit.setNpcAggressiveBleedUntil(v); },
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
        hasPerk: (perkId) => arena.hasPerk('player', perkId),
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
    // Time kit
    if (!this.timeKit) {
      const arena = this;
      const timeApi: TimeArenaApi = {
        get player() { return arena.player as Fighter; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement?.id ?? ''; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        dealAoeDamageFromOwner: (x, y, r, d, o) => arena.dealAoeDamageFromOwner(x, y, r, d, o),
      };
      this.timeKit = new TimeKit(timeApi);
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
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (perkId) => arena.hasPerk('player', perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
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
        stunNpc: (ms) => { arena.npc.earthStunnedUntil = Math.max(arena.npc.earthStunnedUntil, arena.time.now + ms); },
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
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        damagePlayerTargets: (cx, cy, r, d, color) => arena.damagePlayerTargets(cx, cy, r, d, color),
        damagePlayerTargetsCounted: (cx, cy, r, d, color) => arena.damagePlayerTargetsCounted(cx, cy, r, d, color),
        damageNpcTarget: (cx, cy, r, d) => arena.dealAoeDamageFromOwner(cx, cy, r, d, 'npc'),
        pointToSegmentDist: (px, py, ax, ay, bx, by) => arena.pointToSegmentDist(px, py, ax, ay, bx, by),
        getSceneWidth: () => arena.scale.width,
        getSceneHeight: () => arena.scale.height,
        get masteryActive() { return arena.oilMasteryOn && arena.elementId === 'oil'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'oil') PlayerData.addMasteryStat('oil', key, amount);
        },
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
        get rightPointerWasDown() { return arena.rightPointerWasDown; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (perkId) => arena.hasPerk('player', perkId),
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

    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const W = screenW;
    const H = screenH;
    const cx = W / 2;
    const cy = H / 2;
    const pad = 32;

    // ── Background ────────────────────────────────────────────────
    if (this.campaign?.worldId) {
      drawCampaignBackground(this, this.campaign.worldId, W, H).setDepth(-100);
    } else {
      this.add.rectangle(cx, cy, W, H, 0x0d0d1a);
      this.add.rectangle(cx, cy, W - pad * 2, H - pad * 2, 0x181828);

      const grid = this.add.graphics();
      grid.lineStyle(1, 0x202038, 1);
      for (let x = pad; x < W - pad; x += 80) grid.lineBetween(x, pad, x, H - pad);
      for (let y = pad; y < H - pad; y += 80) grid.lineBetween(pad, y, W - pad, y);
    }

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
    this.player.incomingDamageMultiplier = 1;
    this.player.onHeal = (amt) => {
      this.showFloatingText(this.player.x, this.player.y - 30, `+${Math.round(amt)}`, '#44ff44');
      if (this.elementId === 'life') PlayerData.addMasteryStat('life', 'selfHealed', Math.round(amt));
    };
    this.npc = new NpcOpponent(this, W - 180, cy, this.npcElement, npcTexture, difficultyConfig);
    // In 1v1 the single opponent is tracked in enemies; invasion starts empty and fills via the InvasionKit
    this.enemies = this.isInvasion ? [] : [this.npc];

    // ── Apply mutations ──────────────────────────────────────────────
    this.mutations = new Set(data.mutations ?? []);
    this.starredMutations = new Set(data.starredMutations ?? []);

    if (!this.isInvasion) {
      if (this.npcElement.id === 'dummy') {
        this.npc.maxHp = 5000;
        this.npc.hp = 5000;
        (this.npc as NpcOpponent).stationary = true;
      } else {
        this.applyMutationsToNpc();
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
        // Explicit {} (not omitted) — Phaser only overwrites scene data when the
        // argument is truthy, so omitting it here would leak a stale { mode: 'invasion' }.
        .on('pointerdown', () => this.scene.start('MenuScene', {}));
    } else {
      this.dummyBackBtn = null;
    }

    // ── Unified enemy physics group ────────────────────────────────
    this.enemyGroup = this.physics.add.group();
    if (!this.isInvasion) {
      this.enemyGroup.add(this.npc, true);
    }
    // Clot mutation: the blood tree's hitbox spawned during applyMutationsToNpc,
    // before this group existed — register it now so projectiles can hit it.
    if (this.clotTree) {
      this.enemyGroup.add(this.clotTree.hitbox);
    }

    // ── Display mutation label at top of battlefield ──────────────────
    if (this.mutations.size > 0) {
      const active = MUTATIONS.filter((m) => this.mutations.has(m.id));
      if (active.length > 0) {
        const label = active.map((m) => {
          const star = this.starredMutations.has(m.id) ? '★' : '';
          return `${m.emoji}${star} ${m.name.toUpperCase()}`;
        }).join('  +  ');
        const fontSize = active.length > 2 ? '12px' : '15px';
        this.add.text(cx, pad + 14, label, {
          fontSize,
          fontFamily: '"Arial Black", sans-serif',
          color: '#ffcc00',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(20);
      }
    }

    // ── Gauntlet boosts ───────────────────────────────────────────────
    if (this.gauntletState) {
      this.applyGauntletBoosts(this.gauntletState);
    }

    // ── Item buffs ────────────────────────────────────────────────────
    {
      const arena = this;
      if (this.itemsKit) {
        this.itemsKit.reset();
      } else {
        this.itemsKit = new ItemsKit({
          get player() { return arena.player; },
          applySelfDamage: (n) => arena.player.applySelfDamage(n),
          applyPlayerSpeedMult: (f) => { arena.gauntletSpeedMult *= f; },
          bumpMaxHp: (n) => arena.player.setMaxHp(arena.player.maxHp + n),
          addShieldCharges: (n) => { arena.player.shieldCharges += n; },
          showFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        });
      }
      this.itemsKit.applyConsumed(consumedItemIds);
      clearConsumedItems();
    }

    // ── Infinity scaling — apply after boosts and mutations ──────────
    if (data.hpMult && data.hpMult > 1) {
      this.npc.setMaxHp(Math.round(this.npc.maxHp * data.hpMult));
    }
    if (data.npcOutgoingDamageMult && data.npcOutgoingDamageMult > 1) {
      this.npc.outgoingDamageMult *= data.npcOutgoingDamageMult;
    }

    // ── Unified player-projectile vs enemy overlap ─────────────────
    this.physics.add.overlap(
      this.projectiles,
      this.enemyGroup,
      (a, b) => {
        // `a` is always the this.projectiles member and `b` the enemyGroup member —
        // Phaser's overlap(group1, group2, cb) always calls back as (group1Member, group2Member).
        // (Projectiles obtained via group.get() are plain ArcadeSprites, not `instanceof Projectile`,
        // so an instanceof-based swap here would silently misidentify proj/target and eat the hit.)
        const proj = a as Projectile;
        const target = b as Fighter;
        if (!proj.active || !proj.isFromPlayer) return;
        if (!target.active || target.hp <= 0) return;
        if (target instanceof Husk) {
          // A possessing demon is untouchable — shots pass straight through it.
          if (target.possessing) return;
          if (target.netGhost) {
            // Co-op guest: replicas never simulate — report damage/statuses to the host.
            this.invasionKit.onProjectileHitHusk(proj, target);
          } else {
            // Solo / co-op host: full on-hit pipeline, same as hitting the 1v1 npc.
            this.applyProjectileToEnemy(proj, target);
          }
        } else if (this.clotTree && target === this.clotTree.hitbox) {
          if (!proj.isHeal) {
            target.setIncomingCritContext(this.player.critChance, this.player.critMult);
            target.takeDamage(Math.round(proj.damage * this.player.cardOutgoingDamageMult));
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
          }
        } else {
          // Note: deliberately this.npc, not `target` — preserves the original
          // routing where any non-husk, non-clot overlap applied to the npc.
          this.applyProjectileToEnemy(proj, this.npc);
        }
      },
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.projectiles,
      this.player,
      (a, b) => {
        // Unlike the group-vs-group overlap above, Phaser's dispatcher swaps argument
        // order when one side is a single body instead of a group: since `this.player`
        // is a lone sprite and `this.projectiles` is a group, it internally calls
        // collideSpriteVsGroup(this.player, this.projectiles, ...), so the callback
        // always receives (this.player, projectileMember) — `b` is the projectile here.
        const proj = b as Projectile;
        if (!proj.active || proj.isFromPlayer) return;
        // Time lasso orb (NPC fires): route to TimeKit
        if (proj.texture.key === 'proj-time-lasso-orb') {
          this.timeKit.onLassoHitPlayer(proj);
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
        // Diamond Shard (crystal kite) that rebounded off a moving mirror: pierces enemies
        if (proj.texture.key === 'proj-crystal-kite' && (proj as any).kitePierce) {
          this.crystalKit.onKiteHitEnemy(proj, this.player);
          return; // proj NOT deactivated — keeps flying through
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
          this.airKit.onGrappleDodge();
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Grapple dodge (player only) — 100% on 1 charge
        const grappleDodge = this.grappleDodgeCharges > 0;
        if (grappleDodge) {
          this.grappleDodgeCharges--;
          if (this.grappleDodgeCharges === 0 && this.grappleDodgeAura) {
            this.grappleDodgeAura.destroy();
            this.grappleDodgeAura = null;
          }
          if (this.elementId === 'air') this.airKit.onGrappleDodge();
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Air Mastery — Swift as the Wind: dodge chance built up from the snipe streak.
        if (this.elementId === 'air' && this.airKit.rollMasteryDodge()) {
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
        // Phantom: back-hit multiplier (2× base, 3× starred)
        if (this.mutations.has('phantom')) {
          const ptr = this.input.activePointer;
          const facingAngle = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
          const npcAngle = Math.atan2(this.npc.y - this.player.y, this.npc.x - this.player.x);
          const angDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
            Phaser.Math.RadToDeg(npcAngle), Phaser.Math.RadToDeg(facingAngle),
          ));
          if (angDiff > 90) {
            const mult = this.starredMutations.has('phantom') ? 3 : 2;
            _playerDmg = Math.round(_playerDmg * mult);
            this.showFloatingText(this.player.x, this.player.y - 38, `👻 BACK HIT ×${mult}`, '#ccccff');
          }
        }
        this.player.takeDamage(_playerDmg);
        this.spawnHitFlash(proj.x, proj.y, 0x00aaff);
        // Honor parry: if this was a parried player projectile, force-tally
        this.applyHonorParriedHit(proj);
        // Molten★: 20% chance to apply Fire DOT on hit
        if (this.mutations.has('molten') && this.starredMutations.has('molten') && Math.random() < 0.20) {
          this.playerBurningUntil = Math.max(this.playerBurningUntil, this.time.now + 3000);
        }
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
          this.playerToxicUntil = this.time.now + 10000 + this.npcGrowthLingerBonus;
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

    // ── Defeat + damage events ────────────────────────────────────
    this.player.once('defeated', () => {
      // Invasion co-op: dying doesn't end the run — InvasionCoopKit handles downed/revive.
      if (this.isInvasion && this.isOnline) return;
      this.endGame(false);
    });

    // Electricity: gain kinetic power on any damage; overcharge/auto-restart prevents death
    this.player.on('damaged', (amount: number) => {
      if (this.elementId !== 'electricity' || amount <= 0) return;
      this.electricityKit.onDamageReceived(amount, this.time.now);
    });
    // Time: accrue bounty when player takes damage (NPC is the time element)
    this.player.on('damaged', (amount: number) => {
      if (amount <= 0) return;
      this.timeKit.onDamageReceived('player', amount);
    });
    // Time: accrue bounty when NPC takes damage (player is the time element)
    this.npc.on('damaged', (amount: number) => {
      if (amount <= 0) return;
      this.timeKit.onDamageReceived('npc', amount);
    });

    // Wither + Honor: react to player taking damage from enemy
    this.player.on('damaged', (amount: number) => {
      if (amount <= 0) return;
      if (this.mutations.has('wither') && !this.witherTickInProgress) {
        this.playerWitherStacks += 1;
        this.showFloatingText(this.player.x, this.player.y - 30, `Wither x${this.playerWitherStacks}`, '#88ee44');
      }
      if (this.mutations.has('honor') && !this.witherTickInProgress && this.time.now >= this.honorNpcCdUntil) {
        this.addHonorTally('npc');
        this.honorNpcCdUntil = this.time.now + 2000;
      }
    });
    // Honor: react to NPC taking damage from player
    this.npc.on('damaged', (amount: number) => {
      if (amount <= 0) return;
      if (this.mutations.has('honor') && this.time.now >= this.honorPlayerCdUntil) {
        this.addHonorTally('player');
        this.honorPlayerCdUntil = this.time.now + 2000;
      }
    });

    // Card — Thorns: reflect fraction of damage taken back to enemy
    this.player.on('damaged', (amount: number) => {
      if (amount <= 0 || this.player.reflectFraction <= 0) return;
      if (!this.npc.active || this.npc.hp <= 0) return;
      const reflected = Math.max(1, Math.round(amount * this.player.reflectFraction));
      this.npc.takeDamage(reflected);
      this.showFloatingText(this.npc.x, this.npc.y - 20, `🌵 ${reflected}`, '#88cc44');
    });
    // Card — Cripple: slow NPC for 2s on any hit dealt by player
    this.npc.on('damaged', (amount: number) => {
      if (amount <= 0 || !this.cardCrippleActive) return;
      this.cardCrippleSlowUntil = this.time.now + 2000;
    });

    // Invasion husks manage their own defeat handlers in the InvasionKit; skip here
    if (!this.isInvasion) {
      this.npc.once('defeated', () => {
        this.endGame(true);
      });
    }
    this.npc.once('defeated', () => { this.waterKit.onFighterDefeated(this.npc); });

    // ── Online multiplayer wiring ─────────────────────────────────
    // PvP uses OnlineKit; invasion co-op uses InvasionCoopKit (wired further
    // below, alongside the rest of the invasion mode setup).
    if (this.isOnline && !this.isInvasion) {
      if (!this.onlineKit) {
        const arena = this;
        const api: OnlineArenaApi = {
          get player() { return arena.player; },
          get npc() { return arena.npc; },
          get worldW() { return arena.scale.width; },
          buildNpcContext: (tx, ty) => arena.buildNpcContext(tx, ty),
          aim: () => {
            const p = arena.input.activePointer;
            return { x: p.worldX, y: p.worldY };
          },
          spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
          showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
          endOnlineMatch: (won, reason) => arena.endOnlineMatch(won, reason),
        };
        this.onlineKit = new OnlineKit(api);
      }
      this.onlineKit.reset();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onlineKit?.detach());
    }
    if (this.isOnline) {
      this.onlinePingText = this.add.text(this.scale.width - 12, 40, '', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#88ccbb',
      }).setOrigin(1, 0).setDepth(30);
      this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          if (this.onlinePingText?.active) this.onlinePingText.setText(`📶 ${Net.latencyMs} ms`);
        },
      });
    }

    this.player.on('damaged', (n: number) => {
      this.spawnDamageNumber(this.player.x, this.player.y - 34, n);
    });
    // Growth bloat: trigger AOE on any hit (projectile or melee contact)
    this.player.on('damaged', (amount: number) => {
      if (amount <= 0 || !this.growthBloatActive) return;
      const fLocked = this.hasUpgrade('f') && this.fKey.isDown;
      if (fLocked) {
        // Spawn 12 red defensive spores that burst outward
        for (let si = 0; si < 12; si++) {
          const a = (si / 12) * Math.PI * 2;
          const vel = { x: Math.cos(a) * 300, y: Math.sin(a) * 300 };
          const spr = this.add.circle(this.player.x, this.player.y, 5, 0xff3322, 0.9)
            .setStrokeStyle(1, 0xff8866).setDepth(6);
          this.tweens.add({ targets: vel, x: 0, y: 0, duration: 700, ease: 'Power2' });
          this.growthDefSpores.push({ sprite: spr, vel, destroyAt: this.time.now + 2000 });
        }
        // 20% damage reduction for 3s (cannot stack)
        if (!this.growthDamageReductionActive) {
          this.growthDamageReductionUntil = this.time.now + 3000;
          this.player.incomingDamageMultiplier *= 0.8;
          this.growthDamageReductionActive = true;
          this.showFloatingText(this.player.x, this.player.y - 50, '🔴 -20% DMG TAKEN', '#ff4444');
        }
        return;
      }
      this.growthBloatActive = false;
      this.growthBloatEnd = 0;
      if (this.growthBloatAura) { this.growthBloatAura.destroy(); this.growthBloatAura = null; }
      const bloatDmg = Math.round(20 * this.growthDamageMult);
      const aoeR = this.growthBloatAoeRadius;
      this.damagePlayerTargets(this.player.x, this.player.y, aoeR, bloatDmg, 0xdddd00);
      // Trigger cancerous growths within bloat AOE
      for (let ci = this.growthCancerousGrowths.length - 1; ci >= 0; ci--) {
        const cg = this.growthCancerousGrowths[ci];
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, cg.img.x, cg.img.y) <= aoeR) {
          this.triggerCancerousGrowthAt(ci);
        }
      }
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
    // Growth R+: 15% bonus damage to infected enemies from ALL attacks
    this.npc.on('damaged', (amount: number) => {
      if (amount <= 0 || !this.hasUpgrade('r') || this.elementId !== 'growth' || this.growthRBonusInProgress) return;
      if (this.npc.toxicUntil <= this.time.now) return;
      const bonus = Math.round(amount * 0.15);
      if (bonus > 0) {
        this.growthRBonusInProgress = true;
        this.npc.takeDamage(bonus);
        this.growthRBonusInProgress = false;
      }
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

    // Pause menu: Esc opens PauseMenuScene overlay.
    // Online: pausing would desync the peers, so ESC-ESC forfeits instead.
    kb.on('keydown-ESC', () => {
      if (this.isOnline) {
        if (this.gameEnded) return;
        if (this.time.now < this.onlineForfeitArmedUntil) {
          if (this.isInvasion) this.invasionCoopKit?.leaveRun();
          else this.onlineKit?.forfeit();
        } else {
          this.onlineForfeitArmedUntil = this.time.now + 2000;
          this.showFloatingText(this.player.x, this.player.y - 46, 'Press ESC again to leave', '#ffcc00');
        }
        return;
      }
      this.openPauseMenu();
    });
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
    this.createHUD(screenW, screenH);

    // ── Invasion mode setup ────────────────────────────────────────
    if (this.isInvasion) {
      const invasionDifficulty = getInvasionDifficulty(data.invasionDifficulty);

      // InvasionKit itself is cheap to construct (no side effects until
      // reset()/update() run), so it's always built — an invasion co-op guest
      // never resets/updates it, but still needs it for onProjectileHitHusk().
      if (!this.invasionKit) {
        const arena = this;
        const invasionApi: InvasionArenaApi = {
          get scene() { return arena as Phaser.Scene; },
          get player() { return arena.player; },
          get enemies() { return arena.enemies; },
          addEnemy: (h) => { arena.enemies.push(h); arena.enemyGroup.add(h, true); },
          removeEnemy: (h) => {
            arena.enemies = arena.enemies.filter((e) => e !== h);
            arena.enemyGroup.remove(h, false, false);
          },
          showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
          spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
          spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
          endRun: () => { if (arena.isOnline) arena.invasionCoopKit?.leaveRun(); else arena.endGame(false); },
          plantTargets: () => arena.lifeKit.getPlantTargets('player'),
          hasUpgrade: (slot) => arena.hasUpgrade(slot),
          get growthLingerBonus() { return arena.growthLingerBonus; },
          get growthViralBonus() { return arena.growthViralBonus; },
          addFrostStackTo: (t) => arena.addFrostStackTo(t),
          applyBleedVisual: (t) => arena.applyBleedVisualTo(t),
        };
        this.invasionKit = new InvasionKit(invasionApi);
      }

      if (this.isOnline) {
        // Co-op: the ally replica lives in the 1v1 `npc` slot (parked in solo
        // invasion), kept active here and driven by InvasionCoopKit.
        if (!this.invasionCoopKit) {
          const arena = this;
          const coopApi: InvasionCoopArenaApi = {
            get scene() { return arena as Phaser.Scene; },
            get player() { return arena.player; },
            get npc() { return arena.npc; },
            get enemies() { return arena.enemies; },
            get invasionKit() { return arena.invasionKit; },
            addEnemy: (h) => { arena.enemies.push(h); arena.enemyGroup.add(h, true); },
            removeEnemy: (h) => {
              arena.enemies = arena.enemies.filter((e) => e !== h);
              arena.enemyGroup.remove(h, false, false);
            },
            buildNpcContext: (tx, ty) => arena.buildNpcContext(tx, ty),
            aim: () => {
              const p = arena.input.activePointer;
              return { x: p.worldX, y: p.worldY };
            },
            spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
            showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
            spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
            endCoopRun: (waves, shards) => arena.endCoopRun(waves, shards),
          };
          this.invasionCoopKit = new InvasionCoopKit(coopApi);
        }
        this.invasionCoopKit.reset(Net.isHost, invasionDifficulty);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.invasionCoopKit?.detach());
      } else {
        // Solo: park the unused 1v1 opponent — invasion enemies are wave-spawned husks.
        this.npc.setHealthBarVisible(false);
        this.npc.setActive(false).setVisible(false);
        (this.npc.body as Phaser.Physics.Arcade.Body).enable = false;
        this.invasionKit.reset(invasionDifficulty);
      }

      // Husks shove each other and the player instead of stacking
      this.physics.add.collider(this.enemyGroup, this.enemyGroup);
      this.physics.add.collider(this.player, this.enemyGroup);
    }

    // ── Arena labels ───────────────────────────────────────────────
    if (!this.isInvasion) {
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
      const isSword = this.hasPerk(owner, 'blade');
      const cornerPad = 80;
      const corners = [
        { x: cornerPad, y: cornerPad },
        { x: W - cornerPad, y: cornerPad },
        { x: cornerPad, y: H - cornerPad },
        { x: W - cornerPad, y: H - cornerPad },
      ];
      for (const c of corners) {
        const spr = isSword
          ? this.add.rectangle(c.x, c.y, 22, 6, 0x99aadd).setDepth(7)
          : this.add.circle(c.x, c.y, 12, 0x99aacc, 0.9).setStrokeStyle(2, 0xddeeff).setDepth(4);
        this.magnetKit.pushRod({
          sprite: spr, trail: [],
          x: c.x, y: c.y, vx: 0, vy: 0,
          contactCooldownPlayer: 0, contactCooldownNpc: 0,
          bouncing: false, bounceUntil: 0, owner, permDamageBonus: 0,
          isSword,
        });
      }
    }
    // Time element: charge bar rendered per-frame above player; no separate HUD text needed
    // Metal: arsenal HUD bar
    if (this.elementId === 'metal') {
      this.metalKit.initHud();
    }
    if (this.elementId === 'death') {
      this.deathKit.initKillsHud(cx);
    }
    if (this.elementId === 'void') {
      this.voidKit.initHud(cx);
    }
  }

  /** The mastery enhancement id bound over the given ability slot this match, or null. */
  private masteryBindFor(slot: string): string | null {
    return this.masterySlotBinds[slot] ?? null;
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
      'pressure-dagger': 0x0044bb,
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

      // A bound mastery ability takes over this slot's card entirely — name, blurb, and cooldown id.
      const boundEnh = getEnhancement(this.elementId, this.masteryBindFor(ab.displayKey.toLowerCase()) ?? '');
      const cardId = boundEnh ? boundEnh.id : ab.id;
      const cardColor = boundEnh ? 0xffaa00 : (fillColors[ab.id] ?? 0x4466aa);

      const bg = this.add
        .rectangle(x, hudY, cardW - 4, cardH - 4, boundEnh ? 0x2a1a05 : 0x1a1a30)
        .setStrokeStyle(1, boundEnh ? 0x775522 : 0x333355)
        .setDepth(21);

      const fill = this.add
        .rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, cardColor, 0.45)
        .setOrigin(0, 0.5)
        .setDepth(22);

      const lbl = this.add.text(x, hudY - 6, `[${ab.displayKey}] ${boundEnh ? boundEnh.name : ab.name}`, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: boundEnh ? '#ffcc00' : '#dddddd',
      }).setOrigin(0.5, 0.5).setDepth(23);

      const desc = this.add.text(x, hudY + 8, boundEnh ? (boundEnh.hudDescription ?? boundEnh.description) : ab.description, {
        fontSize: '9px',
        color: '#000000',
        wordWrap: { width: cardW - 12 },
        maxLines: 2,
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(23);

      this.abilityBars.push({ fill, abilityId: cardId, maxWidth: cardW - 4, lbl, baseFillColor: cardColor });

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

    this.createPlayerHpBar(W);
  }

  /** Large player health bar pinned to the top-centre of the screen, with a numeric HP readout. */
  private createPlayerHpBar(W: number): void {
    const barY = 18;
    const left = W / 2 - this.hpBarW / 2;

    this.add.rectangle(W / 2, barY, this.hpBarW + 6, this.hpBarH + 6, 0x0a0a18, 0.9)
      .setStrokeStyle(2, 0x445577)
      .setDepth(20);

    this.hpBarFill = this.add
      .rectangle(left, barY, this.hpBarW, this.hpBarH, 0x22dd55, 1)
      .setOrigin(0, 0.5)
      .setDepth(21);

    this.hpBarShield = this.add
      .rectangle(left + this.hpBarW, barY, 0, this.hpBarH, 0x4488ff, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(21);

    this.hpBarText = this.add
      .text(W / 2, barY, '', {
        fontSize: '15px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.updatePlayerHpBar();
  }

  /** Refresh the top health bar's width, colour, shield overlay and numeric readout. */
  private updatePlayerHpBar(): void {
    if (!this.hpBarFill || !this.hpBarShield || !this.hpBarText) return;

    const maxHp = Math.max(1, this.player.maxHp);
    const hp = Math.max(0, this.player.hp);
    const ratio = Math.min(1, hp / maxHp);

    this.hpBarFill.setSize(this.hpBarW * ratio, this.hpBarH);
    this.hpBarFill.setFillStyle(ratio > 0.5 ? 0x22dd55 : ratio > 0.25 ? 0xffcc00 : 0xff3300, 1);

    // Shield rides just past the end of the HP fill, capped at the bar's remaining space.
    const shieldHp = this.player.shieldHp;
    const shieldRatio = shieldHp > 0 ? Math.min(shieldHp / maxHp, 1 - ratio) : 0;
    this.hpBarShield.x = this.hpBarFill.x + this.hpBarW * ratio;
    this.hpBarShield.setSize(this.hpBarW * shieldRatio, this.hpBarH);

    const shieldLabel = shieldHp > 0 ? `  +${Math.ceil(shieldHp)} 🛡` : '';
    const chargeLabel = this.player.shieldCharges > 0 ? `  ✦${this.player.shieldCharges}` : '';
    this.hpBarText.setText(`${Math.ceil(hp)} / ${Math.ceil(maxHp)}${shieldLabel}${chargeLabel}`);
  }

  // ── Context builders ────────────────────────────────────────────

  /** Fire Mastery — Nuclear Cleansing: same AoE as dealAoeDamage, but tracks the best single-detonation husk kill count. */
  private dealFlameNukeDamage(cx: number, cy: number, radius: number, damage: number): void {
    let kills = 0;
    for (const t of this.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
        t.takeDamage(damage);
        this.spawnHitFlash(t.x, t.y, 0xff6600);
        if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(damage * 0.5));
        if (t.hp <= 0) kills++;
      }
    }
    if (this.isInvasion && this.elementId === 'fire' && kills > 0) {
      PlayerData.recordMasteryBest('fire', 'nukeZombieBest', kills);
    }
  }

  /**
   * Who a melee minion should walk at. Life's plants pull aggro off the player
   * entirely — while any are standing, minions chew on the nearest one instead.
   */
  private aggroTargetFor(x: number, y: number): Fighter {
    const plants = this.lifeKit.getPlantTargets('player');
    if (plants.length === 0) return this.player;
    let best = plants[0];
    let bestD = Phaser.Math.Distance.Between(x, y, best.x, best.y);
    for (let i = 1; i < plants.length; i++) {
      const d = Phaser.Math.Distance.Between(x, y, plants[i].x, plants[i].y);
      if (d < bestD) { bestD = d; best = plants[i]; }
    }
    return best;
  }

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
      },
      dealFlameNukeDamage: (cx, cy, radius, damage) => this.dealFlameNukeDamage(cx, cy, radius, damage),
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
      healCaster: (amount) => { this.player.heal(amount); },
      damageCaster: (amount) => this.player.applySelfDamage(amount),
      setCasterSpeedMultiplier: (mult) => { this.playerSpeedMult = mult; },
      lockCaster: (durationMs) => {
        this.nukeChanneling = true;
        this.nukeLockStartTime = this.time.now;
        this.nukeChannelEnd = this.time.now + durationMs;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      },
      addShieldCharge: () => { this.player.shieldCharges += 1; },
      spawnPuddle: (_x, _y) => { /* drops managed by ArenaScene per splashActiveUntil */ },
      spawnGeyser: (x, y) => this.createGeyser(x, y, 'player'),
      spawnPainRain: () => {
        this.createPainRain('player', 200);
      },
      spawnPlant: (x, y) => this.lifeKit.createPlant(x, y, 'player'),
      growPlants: () => this.lifeKit.doFertilize('player'),
      thornPlants: () => this.lifeKit.doRootShield('player', targetX, targetY),
      startThornDrag: () => this.lifeKit.doThrive(),
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
          // F+: Tornado grapple — slow enemy if path passes through them
          if (this.npc.active && this.npc.hp > 0) {
            const t = Math.max(0, Math.min(1, ((this.npc.x - this.player.x) * dx + (this.npc.y - this.player.y) * dy) / (len * len)));
            const distToPath = Math.hypot(this.npc.x - (this.player.x + t * dx), this.npc.y - (this.player.y + t * dy));
            if (distToPath <= 40) {
              this.tornadoGrappleSlowUntil = this.time.now + 2000;
              this.showFloatingText(this.npc.x, this.npc.y - 30, 'SLOWED', '#aaddff');
            }
          }
        }
        this.time.delayedCall(travelTime, () => {
          if (this.player.active) {
            this.isDodging = false;
            this.isGrappling = false;
            body.setVelocity(0, 0);
            this.grappleDodgeCharges = 1;
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
      reportAirSnipeResult: (hit, hitTargets) => {
        if (hit) { this.airConsecutiveHits = Math.min(this.airConsecutiveHits + 1, 3); }
        else { this.airConsecutiveHits = 0; }
        this.airKit.onSnipeResult(hit, hitTargets);
      },
      reportAirBeamHits: (count) => this.airKit.onBeamHits(count),
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
            // 3s immunity to new frost/void stacks (permafrost/permavoid/voided unaffected)
            t.frostImmuneUntil = Math.max(t.frostImmuneUntil, this.time.now + 3000);
            t.voidImmuneUntil  = Math.max(t.voidImmuneUntil,  this.time.now + 3000);
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
            this.player.setTint(0x9900ff);
            if (!this.playerBlackIceAura) {
              this.playerBlackIceAura = this.add.circle(this.player.x, this.player.y, 30, 0x220044, 0.4)
                .setStrokeStyle(2, 0x9900ff, 0.9).setDepth(3);
            }
            const mt = this.add.text(this.player.x, this.player.y - 36, 'BLACK ICE', { fontSize: '11px', color: '#cc88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
            this.tweens.add({ targets: mt, y: mt.y - 20, alpha: 0, duration: 1200, onComplete: () => mt.destroy() });
          } else {
            this.player.incomingDamageMultiplier = this.frostDamageMultiplier(this.playerFrostStacks);
            this.player.clearTint();
            if (this.playerBlackIceAura) { this.playerBlackIceAura.destroy(); this.playerBlackIceAura = null; }
            this.player.applySelfDamage(15);
            this.player.sizeMult = Math.max(0.3, this.player.sizeMult * 0.85);
            this.player.applySizeMult();
            this.showFloatingText(this.player.x, this.player.y - 30, '💢 SHATTERED', '#cc88ff');
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
        if (this.playerSkaterActive) {
          // Recast cancels skater mode and starts cooldown
          if (this.time.now >= this.playerSkaterCancelableAt) {
            this.playerSkaterActive = false;
            this.player.startCooldown('skate');
          }
          return;
        }
        // Determine initial heading toward cursor
        const ptr = this.input.activePointer;
        this.playerSkaterHeading = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
        this.playerSkaterTrailAccum = 0;
        this.playerSkaterActive = true;
        this.playerSkaterCancelableAt = this.time.now + 300;
        // F+ synergies: spawn ice arena based on current state
        if (this.hasUpgrade('f')) {
          if (this.playerBlackIceMorphActive) {
            this.spawnIceArena('player', true);
          } else if (this.playerBlockUpActive) {
            this.spawnIceArena('player', false);
          }
        }
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
        // Plague-bomb and bacterium attack at half speed (1000ms effective CD)
        if (this.growthMorphType === 'plague-bomb' || this.growthMorphType === 'bacterium') {
          if (this.time.now - this.growthSlowMorphLastCast < 1000) return;
          this.growthSlowMorphLastCast = this.time.now;
        }
        const tryCancerous = this.hasUpgrade('click') && Math.random() < 0.10;
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
              if (this.growthCancerousGrowths.length > 0) this.tryTriggerCancerousGrowthOn(t);
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
                  if (this.growthCancerousGrowths.length > 0) this.tryTriggerCancerousGrowthOn(t);
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
        // Click+: 10% chance to attach a cancerous growth to the nearest enemy
        if (tryCancerous) {
          const nearestEnemy = this.enemies.find(t => t.active && t.hp > 0);
          if (nearestEnemy) {
            const gAngle = Math.random() * Math.PI * 2;
            const gDist = 28 + Math.random() * 6;
            const offsetX = Math.cos(gAngle) * gDist;
            const offsetY = Math.sin(gAngle) * gDist;
            const gImg = this.add.circle(nearestEnemy.x + offsetX, nearestEnemy.y + offsetY, 6, 0xaa44ff, 0.9)
              .setStrokeStyle(1, 0xdd88ff, 0.8).setDepth(6);
            this.growthCancerousGrowths.push({ img: gImg, target: nearestEnemy, offsetX, offsetY });
          }
        }
      },
      openMutateMenu: () => {
        if (this.growthMutateMenuOpen) return;
        this.growthMutateMenuOpen = true;
        let pool = this.hasUpgrade('e') ? [...BASE_GROWTH_MUTATIONS, ...ADVANCED_GROWTH_MUTATIONS] : [...BASE_GROWTH_MUTATIONS];
        if (this.hasPerk('player', 'virus')) pool = pool.filter((m) => INFECT_GROWTH_MUTATION_IDS.includes(m.id));
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
        const menuCX = W / 2;
        const menuCY = H / 2;
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
          const proj = new Projectile(this, this.player.x, this.player.y, 'proj-growth-dagger', Math.round(15 * this.growthDamageMult), true);
          this.projectiles.add(proj);
          proj.launch(Math.cos(a) * 520, Math.sin(a) * 520);
          proj.setRotation(a);
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
        const morphNames: Record<string, string> = { spores: 'SPORES', claws: 'CLAWS', virus: 'VIRUS', 'plague-bomb': 'PLAGUE BOMB', bacterium: 'BACTERIUM' };
        if (this.hasUpgrade('q')) {
          // Q+: show weapon selection menu
          const morphPool: Array<'spores' | 'claws' | 'virus' | 'plague-bomb' | 'bacterium'> = ['spores', 'claws', 'virus', 'plague-bomb', 'bacterium'];
          this.growthMorphMenuOpen = true;
          const W = this.scale.width; const H = this.scale.height;
          const btnW = 180; const btnH = 50; const gap = 8;
          const menuCX = W / 2;
          const menuCY = H / 2;
          const startY = menuCY - ((btnH + gap) * (morphPool.length - 1)) / 2;
          for (let mi = 0; mi < morphPool.length; mi++) {
            const morph = morphPool[mi];
            const by = startY + mi * (btnH + gap);
            const bg = this.add.rectangle(menuCX, by, btnW, btnH, 0x223322, 1)
              .setStrokeStyle(2, 0x88bb22).setDepth(30).setInteractive({ useHandCursor: true });
            const lbl = this.add.text(menuCX, by, `🦠 ${morphNames[morph]}`, { fontSize: '13px', fontFamily: '"Arial Black"', color: '#aadd44' }).setOrigin(0.5).setDepth(31);
            this.growthMorphMenuButtons.push(bg, lbl);
            bg.on('pointerover', () => bg.setFillStyle(0x334433));
            bg.on('pointerout', () => bg.setFillStyle(0x223322));
            bg.on('pointerdown', () => {
              this.growthMorphType = morph;
              for (const obj of this.growthMorphMenuButtons) {
                if ((obj as Phaser.GameObjects.GameObject).active) (obj as unknown as { destroy(): void }).destroy();
              }
              this.growthMorphMenuButtons = [];
              this.growthMorphMenuOpen = false;
              const txt = this.add.text(this.player.x, this.player.y - 50, morphNames[morph],
                { fontSize: '14px', fontFamily: '"Arial Black"', color: '#88bb22', stroke: '#003300', strokeThickness: 3 }).setOrigin(0.5).setDepth(15);
              this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
            });
          }
        } else {
          const morphPool: Array<'spores' | 'claws' | 'virus'> = ['spores', 'claws', 'virus'];
          this.growthMorphType = morphPool[Math.floor(Math.random() * morphPool.length)];
          const txt = this.add.text(this.player.x, this.player.y - 50, morphNames[this.growthMorphType],
            { fontSize: '14px', fontFamily: '"Arial Black"', color: '#88bb22', stroke: '#003300', strokeThickness: 3 }).setOrigin(0.5).setDepth(15);
          this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
        }
      },
      // Crystal
      fireCrystalLaser: (tx, ty) => this.crystalKit.fireCrystalLaser(true, tx, ty),
      placeCrystalNode: (tx, ty) => this.crystalKit.placeCrystalNode(true, tx, ty),
      startCrystalBarrage: (tx, ty) => this.crystalKit.startCrystalBarrage(true, tx, ty),
      placeCrystalPortal: (tx, ty) => this.crystalKit.placeCrystalPortal(true, tx, ty),
      activateCrystalTrick: () => this.crystalKit.activateCrystalTrick(true),
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
              if (!t.knockbackImmune) {
                const kb = t.body as Phaser.Physics.Arcade.Body;
                const toTx = t.x - this.player.x, toTy = t.y - this.player.y;
                const td2 = Math.sqrt(toTx * toTx + toTy * toTy) || 1;
                kb.setVelocity((toTx / td2) * 500, (toTy / td2) * 500);
              }
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
      timeBarrage: () => { /* firing handled in TimeKit.handleInput */ },
      timeWarp: (tx, ty) => this.timeKit.doTimeLasso(tx, ty, 'player'),
      timeRemain: () => this.timeKit.doTimeRemain('player'),
      timeHalt: () => this.timeKit.doTimeBounty('player'),
      timeTimeless: () => this.timeKit.doTimeAlwaysNoon('player'),
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
      metalSlash: (tx, ty) => { this.metalKit.doMetalSlash(tx, ty, 'player'); },
      metalFireAtWill: () => { this.metalKit.doMetalFireAtWill('player'); },
      metalOpenReinforcementMenu: () => { this.metalKit.doMetalOpenReinforcementMenu(); },
      metalChainTether: (tx, ty) => { this.metalKit.doMetalChainTether(tx, ty, 'player'); },
      metalBloodClot: () => { this.metalKit.doMetalBloodClot('player'); },
      // Plasma
      plasmaBurst: (tx, ty) => { this.plasmaKit.doPlasmaBurst(tx, ty, 'player'); },
      plasmaUnstableArena: (tx, ty) => { this.plasmaKit.doPlasmaUnstableArena(tx, ty, 'player'); },
      plasmaCurrentLaunch: (tx, ty) => { this.plasmaKit.doPlasmaCurrentLaunch(tx, ty, 'player'); },
      plasmaChaosBlades: () => { this.plasmaKit.doPlasmaChaosBlades('player'); },
      plasmaChaosIncarnate: () => { this.plasmaKit.doPlasmaChaosIncarnate('player'); },
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
      dealFlameNukeDamage: (cx, cy, radius, damage) => {
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
      spawnPlant: (x, y) => this.lifeKit.createPlant(x, y, 'npc'),
      growPlants: () => this.lifeKit.doFertilize('npc'),
      thornPlants: () => this.lifeKit.doRootShield('npc', targetX, targetY),
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
      reportAirBeamHits: () => {},
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
        const allMuts = BASE_GROWTH_MUTATIONS.map((m) => m.id);
        const mutations = this.hasPerk('npc', 'virus') ? allMuts.filter((m) => INFECT_GROWTH_MUTATION_IDS.includes(m)) : allMuts;
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
          proj.setRotation(a);
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
      fireCrystalLaser: (tx, ty) => this.crystalKit.fireCrystalLaser(false, tx, ty),
      placeCrystalNode: (tx, ty) => this.crystalKit.placeCrystalNode(false, tx, ty),
      startCrystalBarrage: (tx, ty) => this.crystalKit.startCrystalBarrage(false, tx, ty),
      placeCrystalPortal: (tx, ty) => this.crystalKit.placeCrystalPortal(false, tx, ty),
      activateCrystalTrick: () => this.crystalKit.activateCrystalTrick(false),
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
            if (!this.player.knockbackImmune) {
              const pb2 = this.player.body as Phaser.Physics.Arcade.Body;
              const toPx = this.player.x - this.npc.x, toPy = this.player.y - this.npc.y;
              const pd2 = Math.sqrt(toPx * toPx + toPy * toPy) || 1;
              pb2.setVelocity((toPx / pd2) * 500, (toPy / pd2) * 500);
            }
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
      timeBarrage: () => { /* NPC revolver handled in TimeKit.update */ },
      timeWarp: (tx, ty) => this.timeKit.doTimeLasso(tx, ty, 'npc'),
      timeRemain: () => this.timeKit.doTimeRemain('npc'),
      timeHalt: () => this.timeKit.doTimeBounty('npc'),
      timeTimeless: () => this.timeKit.doTimeAlwaysNoon('npc'),
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
      metalSlash: (tx, ty) => { this.metalKit.doMetalSlash(tx, ty, 'npc'); },
      metalFireAtWill: () => { this.metalKit.doMetalFireAtWill('npc'); },
      metalOpenReinforcementMenu: () => { this.metalKit.doMetalNpcPickGun(); },
      metalChainTether: (tx, ty) => { this.metalKit.doMetalChainTether(tx, ty, 'npc'); },
      metalBloodClot: () => { this.metalKit.doMetalBloodClot('npc'); },
      // Plasma
      plasmaBurst: (tx, ty) => { this.plasmaKit.doPlasmaBurst(tx, ty, 'npc'); },
      plasmaUnstableArena: (tx, ty) => { this.plasmaKit.doPlasmaUnstableArena(tx, ty, 'npc'); },
      plasmaCurrentLaunch: (tx, ty) => { this.plasmaKit.doPlasmaCurrentLaunch(tx, ty, 'npc'); },
      plasmaChaosBlades: () => { this.plasmaKit.doPlasmaChaosBlades('npc'); },
      plasmaChaosIncarnate: () => { this.plasmaKit.doPlasmaChaosIncarnate('npc'); },
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
      dealFlameNukeDamage: (cx, cy, radius, damage) => {
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
      reportAirBeamHits: () => {},
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
    const ownerIsWater = (owner === 'player' && this.elementId === 'water') ||
                         (owner === 'npc' && this.npcElement.id === 'water');
    // Water geysers are always permanent; cap at 2, remove oldest when placing a 3rd
    if (ownerIsWater) {
      const mine = this.geysers.filter(g => g.owner === owner);
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
    const expiresAt = ownerIsWater ? Infinity : this.time.now + 5000;
    const g: Geyser = { sprite, expiresAt, x, y, radius: 40, owner };
    this.geysers.push(g);
    if (ownerIsWater) {
      this.waterKit.registerGeyser(g);
    }
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
    for (let i = 0; i < count; i++) {
      const sx = Phaser.Math.Between(wb.x, wb.right);
      const sy = Phaser.Math.Between(wb.y, wb.bottom);
      const fireAt = this.time.now + Phaser.Math.Between(minDelay, maxDelay);
      const shadow = this.add.circle(sx, sy, shadowRadius, color, 0.6).setDepth(7);
      this.painRainShadows.push({ sprite: shadow, fireAt, x: sx, y: sy, fired: false, owner, damage, hitRadius, color });
    }
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

  // Steers a snatched enemy to the stored cursor point, snapping on arrival.
  private updateHawkDrag(dt: number): void {
    if (this.npcHawkDragUntil <= 0) return;
    const target = this.npc;
    const ebody = target?.body as Phaser.Physics.Arcade.Body | undefined;
    if (!target || !target.active || !ebody) { this.npcHawkDragUntil = 0; return; }

    const dx = this.npcHawkDragX - target.x;
    const dy = this.npcHawkDragY - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = HAWK_DRAG_SPEED * (dt / 1000);

    // Arrived (or the safety timeout fired) — land exactly on the spot.
    if (dist <= step || this.time.now >= this.npcHawkDragUntil) {
      target.setPosition(this.npcHawkDragX, this.npcHawkDragY);
      ebody.reset(this.npcHawkDragX, this.npcHawkDragY);
      this.npcHawkDragUntil = 0;
      return;
    }
    ebody.setVelocity((dx / dist) * HAWK_DRAG_SPEED, (dy / dist) * HAWK_DRAG_SPEED);
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
          // Hit: drag enemy all the way to the cursor position. The drag is
          // steered per-frame in updateHawkDrag() so it lands on the exact
          // spot instead of stopping short on a fixed timer.
          const ptr = this.input.activePointer;
          ptr.updateWorldPoint(this.cameras.main);
          const wb = this.physics.world.bounds;
          const ebody = target.body as Phaser.Physics.Arcade.Body;
          const halfW = ebody.halfWidth, halfH = ebody.halfHeight;
          // Clamp inside the world so the body can actually reach the target
          // rather than grinding against a wall until the timeout expires.
          this.npcHawkDragX = Phaser.Math.Clamp(ptr.worldX, wb.x + halfW, wb.right - halfW);
          this.npcHawkDragY = Phaser.Math.Clamp(ptr.worldY, wb.y + halfH, wb.bottom - halfH);
          const elen = Phaser.Math.Distance.Between(target.x, target.y, this.npcHawkDragX, this.npcHawkDragY);
          // Timeout is a safety net only (+250ms slack), not the arrival cue.
          this.npcHawkDragUntil = this.time.now + (elen / HAWK_DRAG_SPEED) * 1000 + 250;
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

  hasPerk(owner: 'player' | 'npc', perkId: string): boolean {
    return (owner === 'player' ? this.playerPerkId : this.npcPerkId) === perkId;
  }

  private applyMutationsToNpc(): void {
    if (this.mutations.has('molten')) {
      const starred = this.starredMutations.has('molten');
      this.npc.setTint(starred ? 0xff5511 : 0xff8844);
      this.player.incomingDamageMultiplier *= starred ? 2 : 1.5;
      this.moltenLastNpcX = this.npc.x;
      this.moltenLastNpcY = this.npc.y;
    }
    if (this.mutations.has('blustery')) {
      const starred = this.starredMutations.has('blustery');
      this.npc.setTint(starred ? 0xeeffff : 0xddddff);
      this.npc.speed *= starred ? 1.5 : 1.25;
      this.blusteryDodgeChanceTarget = starred ? 0.35 : 0.20;
      this.npc.dodgeChance = this.blusteryDodgeChanceTarget;
    }
    if (this.mutations.has('titanic')) {
      const starred = this.starredMutations.has('titanic');
      this.npc.setTint(starred ? 0x884422 : 0xaa6644);
      const scale = starred ? 1.75 : 1.5;
      this.npc.setScale(scale);
      if (starred) {
        (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(38, -14, -14);
      } else {
        (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
      }
      const hpMult = starred ? 3 : 2;
      this.npc.maxHp = Math.round(this.npc.maxHp * hpMult);
      this.npc.hp = this.npc.maxHp;
      this.npc.speed = Math.round(this.npc.speed * (starred ? 0.25 : 0.5));
      const count = starred ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const spr = this.add.circle(this.npc.x, this.npc.y, 18, 0x88aaff, 0.85)
          .setDepth(6).setStrokeStyle(2, 0xffffff, 0.5);
        this.titanicShields.push({ sprite: spr });
      }
    }
    if (this.mutations.has('parasitic')) {
      const starred = this.starredMutations.has('parasitic');
      this.npc.setTint(starred ? 0xaa44aa : 0x884488);
      this.parasiticLastPlayerHp = this.player.hp;
      if (starred) {
        this.player.healStopUntil = Number.MAX_SAFE_INTEGER;
      }
    }
    if (this.mutations.has('chaos')) {
      const starred = this.starredMutations.has('chaos');
      this.npc.setTint(starred ? 0xff66cc : 0xff3399);
      const scale = starred ? 0.3 : 0.5;
      this.npc.setScale(scale);
      if (starred) {
        (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(7, 17, 17);
      } else {
        (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(11, 13, 13);
      }
      if (starred) this.npc.speed = Math.round(this.npc.speed * 1.3);
    }
    if (this.mutations.has('order')) {
      const starred = this.starredMutations.has('order');
      this.npc.setTint(starred ? 0x66aaff : 0x4488ff);
      (this.npc as any).difficulty.aimOffsetDeg = starred ? 0 : 2;
    }
    if (this.mutations.has('abyss')) {
      const starred = this.starredMutations.has('abyss');
      this.npc.setTint(starred ? 0x110033 : 0x222244);
      if (starred) {
        this.abyssInvincibleUntil = Number.MAX_SAFE_INTEGER;
        this.npc.setAlpha(0);
      } else {
        this.abyssNextActivateAt = this.time.now + 10000;
      }
    }
    if (this.mutations.has('tinker')) {
      this.tinkerSpawnAccum = 0;
    }
    if (this.mutations.has('phantom')) {
      const starred = this.starredMutations.has('phantom');
      void starred;
      this.phantomNextTeleportAt = this.time.now + 6000;
      this.phantomInvisibleUntil = 0;
    }
    if (this.mutations.has('pain')) {
      this.painTriggered = false;
      this.painInvincUntil = 0;
    }
    if (this.mutations.has('clot')) {
      const starred = this.starredMutations.has('clot');
      const wb = this.physics.world.bounds;
      const tx = wb.x + wb.width / 2;
      const ty = wb.y + 56;
      const maxHp = starred ? 100 : 50;
      this.spawnClotTree(tx, ty, maxHp);
      this.npc.isInvincible = true;
      this.clotLink = this.add.graphics().setDepth(4);
      this.clotBurstAccum = 0;
    }
    if (this.mutations.has('encroach')) {
      const starred = this.starredMutations.has('encroach');
      if (starred) this.applyEncroachShrink();
      for (let i = 0; i < 5; i++) this.spawnEncroachMine();
      this.encroachLastPlayerHp = this.player.hp;
    }
    if (this.mutations.has('empyreon')) {
      this.npc.setTint(0xfff4a8);
      this.npc.setScale(1.5);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
      this.npc.maxHp = Math.round(this.npc.maxHp * 2);
      this.npc.hp = this.npc.maxHp;
      this.npc.speed = Math.round(this.npc.speed * 1.25);
      this.empyreonNextBeamAt = this.time.now + 8000;
      this.empyreonBeamOrientation = 'h';
      this.empyreonPhase2 = false;
    }
    if (this.mutations.has('archfiend')) {
      this.npc.setTint(0xff3311);
      this.npc.setScale(1.5);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
      this.npc.maxHp = Math.round(this.npc.maxHp * 2);
      this.npc.hp = this.npc.maxHp;
      this.npc.outgoingDamageMult *= 1.25;
      this.archfiendNextBarrageAt = this.time.now + 12000;
      this.archfiendPhase2 = false;
    }
    if (this.mutations.has('summoner')) {
      this.npc.setTint(0x55cc44);
      this.npc.setScale(1.5);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
      this.npc.maxHp = Math.round(this.npc.maxHp * 2);
      this.npc.hp = this.npc.maxHp;
      this.npc.incomingDamageMultiplier *= 0.85;
      this.summonerNextWaveAt = this.time.now + 8000;
      this.summonerPhase2 = false;
    }
    if (this.mutations.has('nuclear')) {
      const starred = this.starredMutations.has('nuclear');
      this.nuclearDurationMs = starred ? 30_000 : 60_000;
      this.nuclearStartedAt = this.time.now;
      this.nuclearDetonated = false;
      this.nuclearText = this.add.text(this.npc.x, this.npc.y - 40, '60', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif',
        color: '#ffaa00', stroke: '#220000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(20);
    }
    if (this.mutations.has('amber')) {
      const starred = this.starredMutations.has('amber');
      const maxHp = starred ? 100 : 50;
      const speed = starred ? 240 : 160;
      this.amberMountRing = this.add.circle(this.npc.x, this.npc.y, 32, 0x33cc55, 0)
        .setStrokeStyle(3, 0x33cc55, 0.9).setDepth(6);
      const sprite = this.add.circle(this.npc.x, this.npc.y + 14, 22, 0x2a8a3a, 0.9)
        .setStrokeStyle(2, 0x114d20).setDepth(5);
      const hpBg = this.add.rectangle(this.npc.x, this.npc.y + 38, 44, 5, 0x440000).setDepth(7);
      const hpBar = this.add.rectangle(this.npc.x - 22, this.npc.y + 38, 44, 5, 0x33cc55)
        .setOrigin(0, 0.5).setDepth(8);
      const hpLabel = this.add.text(this.npc.x, this.npc.y + 48, `${maxHp}`, {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif',
        color: '#dfffd0', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(8);
      this.amberDino = { sprite, hpBg, hpBar, hpLabel, hp: maxHp, maxHp, speed };
      this.amberAttackKind = 0;
    }
    if (this.mutations.has('apprehension')) {
      this.npc.setTint(0x6644aa);
      this.npc.setScale(0.75);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(16, 8, 8);
      this.npc.maxHp = Math.round(this.npc.maxHp * 1.10);
      this.npc.hp = this.npc.maxHp;
      this.spawnApprehensionMaze();
      this.initApprehensionFog();
      this.apprehensionPhase2 = false;
      this.apprehensionNextTeleportAt = this.time.now + 5000;
    }
    if (this.mutations.has('wither')) {
      this.npc.setTint(0x88ee44);
      if (this.starredMutations.has('wither')) {
        this.player.healStopUntil = Number.MAX_SAFE_INTEGER;
      }
    }
    if (this.mutations.has('honor')) {
      this.player.setHealthBarVisible(false);
      this.npc.setHealthBarVisible(false);
      this.spawnHonorTallyHud();
      if (this.starredMutations.has('honor')) {
        this.npc.speed = Math.round(this.npc.speed * 1.5);
      }
    }
    if (this.mutations.has('golf')) {
      (this.npc as NpcOpponent).stationary = true;
      this.npc.damageAbsorber = (_amt) => true;
      this.spawnGolfBall(this.starredMutations.has('golf'));
    }
  }

  private updateMutationEffects(time: number, delta: number): void {
    if (this.gameEnded) return;

    // Recompute player incoming damage multiplier when Order adds a distance component
    if (this.mutations.has('order') && this.npc.active && this.player.active) {
      let _damageMult = 1;
      if (this.mutations.has('molten')) _damageMult *= this.starredMutations.has('molten') ? 2 : 1.5;
      const dist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
      const t = Math.min(dist / 600, 1);
      const cap = this.starredMutations.has('order') ? 2.0 : 1.5;
      _damageMult *= 1 + (cap - 1) * t;
      this.player.incomingDamageMultiplier = _damageMult;
    }

    if (this.mutations.has('molten') && this.npc.active) {
      const starred = this.starredMutations.has('molten');
      this.npc.setTint(starred ? 0xff5511 : 0xff8844);

      this.moltenSpawnAccum += delta;
      if (this.moltenSpawnAccum >= 1500) {
        this.moltenSpawnAccum -= 1500;
        if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.moltenLastNpcX, this.moltenLastNpcY) > 4) {
          this.spawnLavaPuddle(this.npc.x, this.npc.y, starred);
        }
        this.moltenLastNpcX = this.npc.x;
        this.moltenLastNpcY = this.npc.y;
      }
    }

    if (this.mutations.has('blustery') && this.npc.active) {
      const starred = this.starredMutations.has('blustery');
      this.npc.setTint(starred ? 0xeeffff : 0xddddff);
      this.npc.dodgeChance = this.blusteryDodgeChanceTarget;

      if (starred && this.blusteryBonusSpeedMult > 1) {
        this.npcSpeedMult *= this.blusteryBonusSpeedMult;
      }

      const distToPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
      if (distToPlayer < 130) {
        this.blusteryProximityAccum += delta;
        if (this.blusteryProximityAccum >= 2000) {
          this.blusteryProximityAccum = 0;
          this.doBlusteryTeleport(starred);
        }
      } else {
        this.blusteryProximityAccum = Math.max(0, this.blusteryProximityAccum - delta * 0.5);
      }
    }

    if (this.mutations.has('titanic') && this.npc.active) {
      const starred = this.starredMutations.has('titanic');
      this.npc.setTint(starred ? 0x884422 : 0xaa6644);
      const count = starred ? 2 : 1;
      const orbitR = starred ? 75 : 60;
      this.titanicOrbitAngle += delta * 0.0025;
      for (let i = 0; i < this.titanicShields.length && i < count; i++) {
        const ang = this.titanicOrbitAngle + i * (Math.PI * 2 / count);
        this.titanicShields[i].sprite.setPosition(
          this.npc.x + Math.cos(ang) * orbitR,
          this.npc.y + Math.sin(ang) * orbitR,
        );
      }
    }

    if (this.mutations.has('parasitic') && this.npc.active) {
      const starred = this.starredMutations.has('parasitic');
      this.npc.setTint(starred ? 0xaa44aa : 0x884488);
      this.parasiticRegenAccum += delta;
      while (this.parasiticRegenAccum >= 1000) {
        this.parasiticRegenAccum -= 1000;
        this.npc.heal(starred ? 5 : 2);
      }
      if (this.player.active) {
        const dmg = this.parasiticLastPlayerHp - this.player.hp;
        if (dmg > 0) this.npc.heal(Math.round(dmg * (starred ? 0.25 : 0.10)));
        this.parasiticLastPlayerHp = this.player.hp;
      }
    }

    if (this.mutations.has('chaos') && this.npc.active) {
      const starred = this.starredMutations.has('chaos');
      this.npc.setTint(starred ? 0xff66cc : 0xff3399);
      if (this.player.active) {
        const dx = this.player.x - this.npc.x;
        const dy = this.player.y - this.npc.y;
        const len = Math.hypot(dx, dy) || 1;
        const spd = this.npc.speed * this.npcSpeedMult;
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * spd, (dy / len) * spd);
      }
      this.chaosExplodeAccum += delta;
      if (this.chaosExplodeAccum >= 3000) {
        this.chaosExplodeAccum -= 3000;
        const radius = starred ? 200 : 140;
        const ring = this.add.circle(this.npc.x, this.npc.y, radius, 0xff3399, 0.45).setDepth(8);
        this.tweens.add({ targets: ring, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        this.npc.takeDamage(starred ? 10 : 20);
        this.showFloatingText(this.npc.x, this.npc.y - 30, '💥 CHAOS', '#ff3399');
        if (this.player.active && Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y) <= radius) {
          this.player.takeDamage(starred ? 30 : 20);
          this.spawnHitFlash(this.player.x, this.player.y, 0xff3399);
        }
      }
    }

    if (this.mutations.has('order') && this.npc.active && this.player.active) {
      const starred = this.starredMutations.has('order');
      this.npc.setTint(starred ? 0x66aaff : 0x4488ff);
      const dist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
      if (dist < 380) {
        const dx = this.npc.x - this.player.x;
        const dy = this.npc.y - this.player.y;
        const len = Math.hypot(dx, dy) || 1;
        const spd = this.npc.speed * this.npcSpeedMult;
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * spd, (dy / len) * spd);
      } else {
        const body = this.npc.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(body.velocity.x * 0.1, body.velocity.y * 0.1);
      }
      if (starred) {
        for (const go of this.projectiles.getChildren() as Projectile[]) {
          if (!go.active || go.isFromPlayer || (go as any)._orderSpeedApplied) continue;
          (go as any)._orderSpeedApplied = true;
          const pb = go.body as Phaser.Physics.Arcade.Body;
          pb.setVelocity(pb.velocity.x * 3, pb.velocity.y * 3);
        }
      }
    }

    if (this.mutations.has('abyss') && this.npc.active) {
      const starred = this.starredMutations.has('abyss');
      this.npc.setTint(starred ? 0x110033 : 0x222244);
      if (starred) {
        this.npc.setAlpha(0);
      } else {
        if (time >= this.abyssNextActivateAt && this.abyssInvincibleUntil <= time) {
          this.abyssInvincibleUntil = time + 7000;
          this.abyssNextActivateAt = time + 17000;
          this.showFloatingText(this.npc.x, this.npc.y - 30, '🌑 ABYSS', '#8866ff');
        }
        this.npc.setAlpha(time < this.abyssInvincibleUntil ? 0.4 : 1.0);
      }
      if (time < this.abyssInvincibleUntil) {
        this.abyssTrailSpawnAccum += delta;
        if (this.abyssTrailSpawnAccum >= 120) {
          this.abyssTrailSpawnAccum -= 120;
          this.spawnAbyssTrail(this.npc.x, this.npc.y);
        }
      }
    }

    // ── Tinker ─────────────────────────────────────────────────────────
    if (this.mutations.has('tinker') && this.npc.active) {
      const starred = this.starredMutations.has('tinker');
      this.tinkerSpawnAccum += delta;
      if (this.tinkerSpawnAccum >= 5000) {
        this.tinkerSpawnAccum -= 5000;
        this.spawnTinkerBuilding(starred);
      }
      this.updateTinkerBuildings(time, delta);
    }

    // ── Phantom ────────────────────────────────────────────────────────
    if (this.mutations.has('phantom') && this.npc.active && this.player.active) {
      const starred = this.starredMutations.has('phantom');
      // Teleport timer
      if (time >= this.phantomNextTeleportAt) {
        this.phantomNextTeleportAt = time + 6000;
        this.doPhantomTeleport(starred);
      }
      // Invisibility: keep alpha at 0 during window; restore after
      if (time < this.phantomInvisibleUntil) {
        this.npc.setAlpha(0);
        this.npc.forceInvisible = true;
      } else if (this.npc.forceInvisible) {
        this.npc.forceInvisible = false;
        this.npc.setAlpha(1);
      }
    }

    // ── Pain ───────────────────────────────────────────────────────────
    if (this.mutations.has('pain') && this.npc.active) {
      const starred = this.starredMutations.has('pain');
      const t = Math.max(0, 1 - this.npc.hp / this.npc.maxHp);
      // Damage + speed ramp (applied each frame; use base values scaled by t)
      this.npc.outgoingDamageMult = 1 + t;
      this.npcSpeedMult *= (1 + 0.5 * t);
      // Trigger 1-HP invincibility
      if (this.npc.hp <= 1 && !this.painTriggered) {
        this.painTriggered = true;
        const duration = starred ? 5000 : 3000;
        this.painInvincUntil = time + duration;
        if (starred) {
          // Starred: redirect all damage back to player via absorber
          const arena = this;
          this.npc.damageAbsorber = (amt) => {
            if (!arena.player.active) return true;
            arena.player.takeDamage(amt);
            arena.spawnHitFlash(arena.player.x, arena.player.y, 0xff3344);
            arena.showFloatingText(arena.player.x, arena.player.y - 28, '↩ REFLECTED', '#ff6677');
            return true;
          };
        } else {
          this.npc.isInvincible = true;
        }
        // Floating label pinned to NPC
        if (this.painLabel) this.painLabel.destroy();
        this.painLabel = this.add.text(this.npc.x, this.npc.y - 50, 'I WONT DIE', {
          fontSize: '18px', fontFamily: '"Arial Black", sans-serif',
          color: '#ff3344', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(25);
        this.showFloatingText(this.npc.x, this.npc.y - 30, '😣 PAIN', '#ff3344');
      }
      // During window: pin label, keep NPC at 1 HP
      if (time < this.painInvincUntil) {
        this.npc.hp = 1;
        if (this.painLabel) this.painLabel.setPosition(this.npc.x, this.npc.y - 50);
      } else if (this.painTriggered && this.painInvincUntil > 0 && time >= this.painInvincUntil) {
        // Expire window once
        this.painInvincUntil = 0;
        this.npc.isInvincible = false;
        this.npc.damageAbsorber = null;
        if (this.painLabel) { this.painLabel.destroy(); this.painLabel = null; }
      }
    }

    if (this.mutations.has('clot') && this.npc.active) {
      this.updateClotTree(time, delta);
    }

    if (this.mutations.has('encroach') && this.npc.active) {
      this.updateEncroachMines(time);
      this.updateEncroachSlow(time);
    }

    // ── Empyreon boss mutation ────────────────────────────────────────
    if (this.mutations.has('empyreon') && this.npc.active) {
      // Phase 2 latch at 50% HP
      if (!this.empyreonPhase2 && this.npc.hp <= this.npc.maxHp * 0.5) {
        this.empyreonPhase2 = true;
        this.npc.speed = Math.round(this.npc.speed * 1.5);
        this.empyreonNextTeleportAt = time + 5000;
        this.showFloatingText(this.npc.x, this.npc.y - 40, '☀️ PHASE 2', '#fff4a8');
      }
      // Phase 2 teleport
      if (this.empyreonPhase2 && time >= this.empyreonNextTeleportAt) {
        this.empyreonNextTeleportAt = time + 5000;
        const wb = this.physics.world.bounds;
        const tx = Phaser.Math.Between(wb.x + 70, wb.x + wb.width - 70);
        const ty = Phaser.Math.Between(wb.y + 70, wb.y + wb.height - 70);
        const fromX = this.npc.x;
        const fromY = this.npc.y;
        for (const [rx, ry] of [[fromX, fromY], [tx, ty]] as [number, number][]) {
          const ring = this.add.circle(rx, ry, 28, 0xfff4a8, 0.7).setDepth(9);
          this.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
        }
        (this.npc.body as Phaser.Physics.Arcade.Body).reset(tx, ty);
        this.showFloatingText(tx, ty - 30, '☀️ TELEPORT', '#fff4a8');
      }
      // Beam attack
      const beamCooldown = this.empyreonPhase2 ? 5000 : 8000;
      if (time >= this.empyreonNextBeamAt) {
        this.empyreonNextBeamAt = time + beamCooldown;
        const wb = this.physics.world.bounds;
        const count = 8;
        const orientation = this.empyreonBeamOrientation;
        this.empyreonBeamOrientation = orientation === 'h' ? 'v' : 'h';
        const halfThick = 14;
        const beamDuration = 2000;
        for (let i = 0; i < count; i++) {
          let bx: number, by: number, bw: number, bh: number;
          const isH = orientation === 'h';
          if (isH) {
            const spacing = wb.height / (count + 1);
            bx = wb.x + wb.width / 2;
            by = wb.y + spacing * (i + 1);
            bw = wb.width;
            bh = halfThick * 2;
          } else {
            const spacing = wb.width / (count + 1);
            bx = wb.x + spacing * (i + 1);
            by = wb.y + wb.height / 2;
            bw = halfThick * 2;
            bh = wb.height;
          }
          const spr = this.add.rectangle(bx, by, bw, bh, 0xfff4a8, 0.1).setDepth(5);
          this.tweens.add({ targets: spr, fillAlpha: 0.65, duration: 400 });
          this.empyreonBeams.push({ sprite: spr, expiresAt: time + beamDuration, lastTickAt: 0, isH, fixedCoord: isH ? by : bx, halfThick });
        }
        this.showFloatingText(this.npc.x, this.npc.y - 50, '☀️ LIGHT BEAMS', '#fff4a8');
      }
      // Tick beam damage + expire
      for (let i = this.empyreonBeams.length - 1; i >= 0; i--) {
        const b = this.empyreonBeams[i];
        if (time > b.expiresAt) {
          this.tweens.add({ targets: b.sprite, fillAlpha: 0, duration: 300, onComplete: () => b.sprite.destroy() });
          this.empyreonBeams.splice(i, 1);
          continue;
        }
        if (!this.player.active) continue;
        const inBeam = b.isH
          ? Math.abs(this.player.y - b.fixedCoord) <= b.halfThick
          : Math.abs(this.player.x - b.fixedCoord) <= b.halfThick;
        if (inBeam && time - b.lastTickAt >= 250) {
          b.lastTickAt = time;
          this.player.takeDamage(12);
          this.spawnHitFlash(this.player.x, this.player.y, 0xfff4a8);
        }
      }
    }

    // ── Archfiend boss mutation ───────────────────────────────────────
    if (this.mutations.has('archfiend') && this.npc.active) {
      // Phase 2 latch
      if (!this.archfiendPhase2 && this.npc.hp <= this.npc.maxHp * 0.5) {
        this.archfiendPhase2 = true;
        this.npc.outgoingDamageMult *= 1.25;
        this.archfiendFirePoolAccum = 0;
        this.showFloatingText(this.npc.x, this.npc.y - 40, '🔱 PHASE 2', '#ff4422');
      }
      // Trident barrage
      const tridentCooldown = this.archfiendPhase2 ? 10000 : 12000;
      if (time >= this.archfiendNextBarrageAt) {
        this.archfiendNextBarrageAt = time + tridentCooldown;
        const count = 5;
        const spreadRad = Math.PI / 3;
        const baseAngle = Math.atan2(this.player.y - this.npc.y, this.player.x - this.npc.x);
        for (let i = 0; i < count; i++) {
          const angle = baseAngle + spreadRad * (i / (count - 1) - 0.5);
          const speed = 320;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          const spr = this.add.rectangle(this.npc.x, this.npc.y, 28, 8, 0xcc4422, 1)
            .setDepth(5).setRotation(angle);
          this.archfiendTridents.push({ sprite: spr, vx, vy, stuck: false, returnsAt: time + 3000 });
        }
        this.showFloatingText(this.npc.x, this.npc.y - 50, '🔱 TRIDENTS', '#ff4422');
      }
      // Update tridents
      const wb2 = this.physics.world.bounds;
      for (let i = this.archfiendTridents.length - 1; i >= 0; i--) {
        const t = this.archfiendTridents[i];
        if (time >= t.returnsAt) {
          // Returning toward npc
          const dx = this.npc.x - t.sprite.x;
          const dy = this.npc.y - t.sprite.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 22) {
            this.npc.hp = Math.min(this.npc.maxHp, this.npc.hp + 5);
            this.showFloatingText(this.npc.x, this.npc.y - 28, '+5', '#ff8866');
            t.sprite.destroy();
            this.archfiendTridents.splice(i, 1);
            continue;
          }
          const returnSpeed = 420;
          t.vx = (dx / dist) * returnSpeed;
          t.vy = (dy / dist) * returnSpeed;
          t.sprite.x += t.vx * (delta / 1000);
          t.sprite.y += t.vy * (delta / 1000);
          t.sprite.setRotation(Math.atan2(t.vy, t.vx));
          // Damage player if returning trident hits
          if (this.player.active && Phaser.Math.Distance.Between(t.sprite.x, t.sprite.y, this.player.x, this.player.y) < 20) {
            this.player.takeDamage(Math.round(12 * this.npc.outgoingDamageMult));
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc4422);
            this.showFloatingText(this.player.x, this.player.y - 28, '🔱 TRIDENT', '#ff4422');
            t.sprite.destroy();
            this.archfiendTridents.splice(i, 1);
          }
        } else if (!t.stuck) {
          // Flying outward
          t.sprite.x += t.vx * (delta / 1000);
          t.sprite.y += t.vy * (delta / 1000);
          // Stick to wall
          if (t.sprite.x < wb2.x + 14 || t.sprite.x > wb2.x + wb2.width - 14 ||
              t.sprite.y < wb2.y + 14 || t.sprite.y > wb2.y + wb2.height - 14) {
            t.sprite.x = Phaser.Math.Clamp(t.sprite.x, wb2.x + 14, wb2.x + wb2.width - 14);
            t.sprite.y = Phaser.Math.Clamp(t.sprite.y, wb2.y + 14, wb2.y + wb2.height - 14);
            t.stuck = true;
          }
          // Damage player on contact
          if (this.player.active && Phaser.Math.Distance.Between(t.sprite.x, t.sprite.y, this.player.x, this.player.y) < 20) {
            this.player.takeDamage(Math.round(12 * this.npc.outgoingDamageMult));
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc4422);
            this.showFloatingText(this.player.x, this.player.y - 28, '🔱 TRIDENT', '#ff4422');
            t.sprite.destroy();
            this.archfiendTridents.splice(i, 1);
          }
        }
      }
      // Phase 2: fire pools around the arena
      if (this.archfiendPhase2) {
        this.archfiendFirePoolAccum += delta;
        if (this.archfiendFirePoolAccum >= 1500) {
          this.archfiendFirePoolAccum -= 1500;
          const wb3 = this.physics.world.bounds;
          const px = Phaser.Math.Between(wb3.x + 40, wb3.x + wb3.width - 40);
          const py = Phaser.Math.Between(wb3.y + 40, wb3.y + wb3.height - 40);
          const spr = this.add.circle(px, py, 35, 0xff4422, 0.55).setDepth(2)
            .setStrokeStyle(1, 0xff8844, 0.6);
          this.tweens.add({ targets: spr, fillAlpha: 0.3, yoyo: true, repeat: -1, duration: 800 });
          this.puddles.push({ sprite: spr, expiresAt: time + 6000, x: px, y: py, radius: 35, tickAccum: 0, owner: 'npc', kind: 'lava' });
        }
      }
    }

    // ── Summoner boss mutation ────────────────────────────────────────
    if (this.mutations.has('summoner') && this.npc.active) {
      // Phase 2 latch
      if (!this.summonerPhase2 && this.npc.hp <= this.npc.maxHp * 0.5) {
        this.summonerPhase2 = true;
        this.npc.incomingDamageMultiplier *= 0.85;
        this.summonerNextHealCheckAt = time + 12000;
        this.showFloatingText(this.npc.x, this.npc.y - 40, '💀 PHASE 2', '#55cc44');
      }
      // Spawn zombie wave
      if (time >= this.summonerNextWaveAt) {
        this.summonerNextWaveAt = time + 8000;
        const wb = this.physics.world.bounds;
        for (let i = 0; i < 10; i++) {
          const edge = Phaser.Math.Between(0, 3);
          let sx: number, sy: number;
          switch (edge) {
            case 0:  sx = Phaser.Math.Between(wb.x, wb.x + wb.width); sy = wb.y + 8; break;
            case 1:  sx = Phaser.Math.Between(wb.x, wb.x + wb.width); sy = wb.y + wb.height - 8; break;
            case 2:  sx = wb.x + 8; sy = Phaser.Math.Between(wb.y, wb.y + wb.height); break;
            default: sx = wb.x + wb.width - 8; sy = Phaser.Math.Between(wb.y, wb.y + wb.height); break;
          }
          const spr = this.add.circle(sx, sy, 14, 0x448822, 0.9).setDepth(4)
            .setStrokeStyle(1, 0x66cc44, 1);
          const lbl = this.add.text(sx, sy, '🧟', { fontSize: '11px' }).setOrigin(0.5).setDepth(5);
          this.summonerZombies.push({ sprite: spr, label: lbl, hp: 25, attackCdUntil: 0 });
        }
        this.showFloatingText(this.npc.x, this.npc.y - 50, '💀 ZOMBIES', '#55cc44');
      }
      // Update zombies
      for (let i = this.summonerZombies.length - 1; i >= 0; i--) {
        const z = this.summonerZombies[i];
        if (z.hp <= 0) {
          z.sprite.destroy(); z.label.destroy();
          this.summonerZombies.splice(i, 1);
          if (this.summonerPhase2) {
            for (let k = 0; k < 2; k++) {
              const zx = z.sprite.x + Phaser.Math.Between(-12, 12);
              const zy = z.sprite.y + Phaser.Math.Between(-12, 12);
              const zlSpr = this.add.circle(zx, zy, 7, 0x33aa22, 0.9).setDepth(4)
                .setStrokeStyle(1, 0x77ee44, 1);
              this.summonerZombielings.push({ sprite: zlSpr, hp: 15, attackCdUntil: 0 });
            }
          }
          continue;
        }
        const zTarget = this.aggroTargetFor(z.sprite.x, z.sprite.y);
        if (zTarget.active) {
          const dx = zTarget.x - z.sprite.x;
          const dy = zTarget.y - z.sprite.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            z.sprite.x += (dx / dist) * 110 * (delta / 1000);
            z.sprite.y += (dy / dist) * 110 * (delta / 1000);
            z.label.setPosition(z.sprite.x, z.sprite.y);
          }
          if (dist <= 28 && time >= z.attackCdUntil) {
            z.attackCdUntil = time + 800;
            const zDmg = Math.round(8 * this.npc.outgoingDamageMult);
            zTarget.takeDamage(zDmg);
            this.spawnHitFlash(zTarget.x, zTarget.y, 0x66cc44);
            this.showFloatingText(zTarget.x, zTarget.y - 20, '🧟 -' + zDmg, '#66cc44');
          }
        }
      }
      // Update zombielings
      for (let i = this.summonerZombielings.length - 1; i >= 0; i--) {
        const zl = this.summonerZombielings[i];
        if (zl.hp <= 0) {
          const sx2 = zl.sprite.x, sy2 = zl.sprite.y;
          const puddleSpr = this.add.circle(sx2, sy2, 22, 0x33cc22, 0.5).setDepth(2)
            .setStrokeStyle(1, 0x77ee44, 0.5);
          this.tweens.add({ targets: puddleSpr, fillAlpha: 0.15, duration: 3000, onComplete: () => puddleSpr.destroy() });
          this.puddles.push({ sprite: puddleSpr, expiresAt: time + 3000, x: sx2, y: sy2, radius: 22, tickAccum: 0, owner: 'npc', kind: 'toxic' });
          zl.sprite.destroy();
          this.summonerZombielings.splice(i, 1);
          continue;
        }
        const zlTarget = this.aggroTargetFor(zl.sprite.x, zl.sprite.y);
        if (zlTarget.active) {
          const dx = zlTarget.x - zl.sprite.x;
          const dy = zlTarget.y - zl.sprite.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            zl.sprite.x += (dx / dist) * 220 * (delta / 1000);
            zl.sprite.y += (dy / dist) * 220 * (delta / 1000);
          }
          if (dist <= 18 && time >= zl.attackCdUntil) {
            zl.attackCdUntil = time + 800;
            zlTarget.takeDamage(Math.round(4 * this.npc.outgoingDamageMult));
            this.spawnHitFlash(zlTarget.x, zlTarget.y, 0x66cc44);
          }
        }
      }
      // Phase 2: heal check (20+ zombies)
      if (this.summonerPhase2 && time >= this.summonerNextHealCheckAt) {
        this.summonerNextHealCheckAt = time + 12000;
        if (this.summonerZombies.length >= 20) {
          this.npc.hp = Math.min(this.npc.maxHp, this.npc.hp + 25);
          this.showFloatingText(this.npc.x, this.npc.y - 28, '💀 +25', '#55cc44');
        }
      }
    }

    // ── Nuclear mutation ─────────────────────────────────────────────
    if (this.mutations.has('nuclear') && !this.nuclearDetonated && this.nuclearText && this.npc.active) {
      this.nuclearText.setPosition(this.npc.x, this.npc.y - 40);
      const elapsed = time - this.nuclearStartedAt;
      const remainMs = Math.max(0, this.nuclearDurationMs - elapsed);
      const secs = Math.ceil(remainMs / 1000);
      this.nuclearText.setText(`☢ ${secs}`);
      if (remainMs <= 5000) this.nuclearText.setColor('#ff3333');
      else if (remainMs <= 15000) this.nuclearText.setColor('#ffcc33');
      else this.nuclearText.setColor('#ffaa00');
      if (remainMs <= 0) {
        this.nuclearDetonated = true;
        this.nuclearText.setText('');
        const blast = this.add.circle(this.npc.x, this.npc.y, 40, 0xffffff, 0.9).setDepth(30);
        this.tweens.add({ targets: blast, scale: 30, alpha: 0, duration: 700, onComplete: () => blast.destroy() });
        this.cameras.main.flash(400, 255, 240, 200);
        this.cameras.main.shake(400, 0.02);
        this.showFloatingText(this.npc.x, this.npc.y - 60, '☢️ MELTDOWN', '#ffffff');
        this.player.applySelfDamage(99999);
      }
    }

    // ── Amber mutation ───────────────────────────────────────────────
    if (this.mutations.has('amber')) {
      // Dino movement + NPC position pin
      if (this.amberDino && this.npc.active) {
        const dino = this.amberDino;
        const starred = this.starredMutations.has('amber');
        const dx = this.player.x - dino.sprite.x;
        const dy = this.player.y - dino.sprite.y;
        const dist = Math.hypot(dx, dy) || 1;
        dino.sprite.x += (dx / dist) * dino.speed * (delta / 1000);
        dino.sprite.y += (dy / dist) * dino.speed * (delta / 1000);
        const wb = this.physics.world.bounds;
        dino.sprite.x = Phaser.Math.Clamp(dino.sprite.x, wb.x + 22, wb.x + wb.width - 22);
        dino.sprite.y = Phaser.Math.Clamp(dino.sprite.y, wb.y + 22, wb.y + wb.height - 22);
        (this.npc.body as Phaser.Physics.Arcade.Body).reset(dino.sprite.x, dino.sprite.y - 14);
        this.amberMountRing!.setPosition(this.npc.x, this.npc.y);
        dino.hpBg.setPosition(dino.sprite.x, dino.sprite.y + 26);
        dino.hpBar.setPosition(dino.sprite.x - 22, dino.sprite.y + 26);
        dino.hpLabel.setPosition(dino.sprite.x, dino.sprite.y + 36)
          .setText(`${Math.max(0, Math.round(dino.hp))}`);
        this.amberAttackAccum += delta;
        if (this.amberAttackAccum >= 1800 && dist < 48 && this.player.active) {
          this.amberAttackAccum = 0;
          this.executeAmberAttack(time, starred);
        }
        // Breath visual and tick
        if (this.amberBreathActive) {
          if (time < this.amberBreathEndAt) {
            if (!this.amberBreathGfx) this.amberBreathGfx = this.add.graphics().setDepth(9);
            const aimDx = this.player.x - dino.sprite.x;
            const aimDy = this.player.y - dino.sprite.y;
            const aimAngle = Math.atan2(aimDy, aimDx);
            const half = Phaser.Math.DegToRad(28);
            this.amberBreathGfx.clear();
            this.amberBreathGfx.fillStyle(0xff6600, 0.35);
            this.amberBreathGfx.beginPath();
            this.amberBreathGfx.moveTo(dino.sprite.x, dino.sprite.y);
            this.amberBreathGfx.arc(dino.sprite.x, dino.sprite.y, 110, aimAngle - half, aimAngle + half, false);
            this.amberBreathGfx.closePath();
            this.amberBreathGfx.fillPath();
            this.amberBreathTickAccum += delta;
            if (this.amberBreathTickAccum >= 200) {
              this.amberBreathTickAccum -= 200;
              const pAngle = Math.atan2(this.player.y - dino.sprite.y, this.player.x - dino.sprite.x);
              const angleDiff = Phaser.Math.Angle.Wrap(pAngle - aimAngle);
              if (Math.abs(angleDiff) <= half && dist < 110 && this.player.active) {
                this.player.applySelfDamage(4);
                this.spawnHitFlash(this.player.x, this.player.y, 0xff6600);
                if (this.playerBurningUntil < time + 3000) {
                  this.playerBurningUntil = time + 3000;
                }
              }
            }
          } else {
            this.amberBreathActive = false;
            if (this.amberBreathGfx) this.amberBreathGfx.clear();
          }
        }
      } else {
        // Dino gone — clear breath gfx
        if (this.amberBreathGfx) this.amberBreathGfx.clear();
      }
      // Claw slow stacks (apply regardless of dino state)
      this.amberSlowStacks = this.amberSlowStacks.filter((t) => t > time);
      if (this.amberSlowStacks.length > 0) {
        this.playerSpeedMult *= Math.pow(0.9, this.amberSlowStacks.length);
      }
      // Bleed DOT tick (applies regardless of dino state)
      if (this.amberPlayerBleedUntil > time && this.player.active) {
        this.amberPlayerBleedTickAccum += delta;
        if (this.amberPlayerBleedTickAccum >= 500) {
          this.amberPlayerBleedTickAccum -= 500;
          this.player.applySelfDamage(3);
          this.spawnHitFlash(this.player.x, this.player.y, 0xcc0000);
        }
      } else {
        this.amberPlayerBleedTickAccum = 0;
      }
    }

    // ── Apprehension boss mutation ───────────────────────────────────
    if (this.mutations.has('apprehension') && this.npc.active) {
      this.updateApprehensionFog();
      // Phase 2 latch
      if (!this.apprehensionPhase2 && this.npc.hp <= this.npc.maxHp * 0.5) {
        this.apprehensionPhase2 = true;
        for (const w of this.apprehensionMazeWalls) w.rect.destroy();
        this.apprehensionMazeWalls = [];
        this.npc.setTint(0x111111);
        this.apprehensionEyeSprite = this.add.circle(this.npc.x, this.npc.y, 7, 0xffffff, 1).setDepth(11);
        this.npc.speed = Math.round(this.npc.speed * 3);
        this.npc.outgoingDamageMult *= 1.5;
        this.apprehensionNextTeleportAt = time + 5000;
        this.showFloatingText(this.npc.x, this.npc.y - 44, '👁️ AWAKENED', '#ff5577');
        this.cameras.main.shake(300, 0.015);
        this.npc.cooldownMult = 1;
      }
      // Phase 1: restrict NPC to near-player + LOS attacks only
      if (!this.apprehensionPhase2) {
        const distToPlayer = Phaser.Math.Distance.Between(
          this.npc.x, this.npc.y, this.player.x, this.player.y,
        );
        const losClear = !this.apprehensionLosBlocked(
          this.npc.x, this.npc.y, this.player.x, this.player.y,
        );
        if (distToPlayer < 200 && losClear) this.npc.cooldownMult = 1;
        else this.npc.cooldownMult = 999;
        // Maze wall push-out and projectile blocking (phase 1 only)
        const allProjApp = this.projectiles.getChildren() as Projectile[];
        for (const mw of this.apprehensionMazeWalls) {
          // Block all projectiles (both sides)
          for (const proj of allProjApp) {
            if (!proj.active) continue;
            if (Math.abs(proj.x - mw.x) <= mw.w / 2 && Math.abs(proj.y - mw.y) <= mw.h / 2) {
              proj.setActive(false).setVisible(false);
              (proj.body as Phaser.Physics.Arcade.Body).stop();
            }
          }
          // Push both fighters out of walls
          this.pushFighterOutOfRect(this.player.body as Phaser.Physics.Arcade.Body, mw.x, mw.y, mw.w, mw.h);
          this.pushFighterOutOfRect(this.npc.body as Phaser.Physics.Arcade.Body, mw.x, mw.y, mw.w, mw.h);
        }
      }
      // Phase 2: check flashlight + eye sprite + border teleport
      if (this.apprehensionPhase2) {
        this.apprehensionNpcLitByFlashlight = this.isInPlayerFlashlightCone(this.npc.x, this.npc.y);
        if (this.apprehensionEyeSprite) {
          this.apprehensionEyeSprite.setPosition(this.npc.x, this.npc.y);
        }
        if (time >= this.apprehensionNextTeleportAt) {
          this.apprehensionNextTeleportAt = time + 5000;
          this.doApprehensionBorderTeleport();
        }
      }
    }

    // Wither: tick DOT proportional to stacks
    if (this.mutations.has('wither') && this.playerWitherStacks > 0 && this.player.active) {
      if (!this.playerWitherAura) {
        this.playerWitherAura = this.add.circle(this.player.x, this.player.y, 28, 0x44bb22, 0.25).setDepth(7);
      }
      this.playerWitherAura.setPosition(this.player.x, this.player.y);
      this.playerWitherTickAccum += delta;
      const interval = this.starredMutations.has('wither') ? 1000 : 2000;
      if (this.playerWitherTickAccum >= interval) {
        this.playerWitherTickAccum -= interval;
        this.witherTickInProgress = true;
        this.player.applySelfDamage(this.playerWitherStacks);
        this.witherTickInProgress = false;
        this.spawnHitFlash(this.player.x, this.player.y, 0x44bb22);
        this.spawnDamageNumber(this.player.x, this.player.y - 20, this.playerWitherStacks);
      }
    } else if (this.playerWitherAura && this.playerWitherStacks === 0) {
      this.playerWitherAura.destroy();
      this.playerWitherAura = null;
    }

    // Honor: update tally HUD positions + starred parry check
    if (this.mutations.has('honor')) {
      this.updateHonorTallyPositions();
      if (this.starredMutations.has('honor') && this.npc.active) {
        this.checkHonorParry(time);
      }
    }

    // Golf: update ball physics + player projectile kicks + enemy collision
    if (this.mutations.has('golf') && this.golfBall) {
      this.updateGolfBall(time, delta);
    }
  }

  private spawnTinkerBuilding(starred: boolean): void {
    const kinds: Array<TinkerBuilding['kind']> = starred
      ? ['turret+', 'dispenser+', 'shredder']
      : ['turret', 'dispenser'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const x = this.npc.x;
    const y = this.npc.y;
    const maxHp = (kind === 'turret+' || kind === 'dispenser+') ? 50 : 25;
    const barW = 40;

    const color = kind === 'turret' || kind === 'turret+' ? 0x885522
      : kind === 'dispenser' || kind === 'dispenser+' ? 0x224488
      : 0x882244;
    const stroke = kind === 'turret' || kind === 'turret+' ? 0xff9944
      : kind === 'dispenser' || kind === 'dispenser+' ? 0x44aaff
      : 0xff4488;

    const sprite = this.add.rectangle(x, y, 28, 28, color, 0.9)
      .setStrokeStyle(2, stroke, 1).setDepth(4);
    const hpBg = this.add.rectangle(x, y - 20, barW, 4, 0x333333, 0.8).setDepth(5);
    const hpBar = this.add.rectangle(x - barW / 2, y - 20, barW, 4, stroke, 0.9).setDepth(6).setOrigin(0, 0.5);
    const hpLabel = this.add.text(x, y - 28, this.tinkerBuildingLabel(kind), {
      fontSize: '8px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
    }).setOrigin(0.5).setDepth(7);

    let aura: Phaser.GameObjects.Arc | null = null;
    if (kind === 'dispenser' || kind === 'dispenser+') {
      const auraR = kind === 'dispenser+' ? 120 : 80;
      aura = this.add.circle(x, y, auraR, 0x44ff88, 0.15).setDepth(2)
        .setStrokeStyle(1, 0x44ff88, 0.5);
    } else if (kind === 'shredder') {
      aura = this.add.circle(x, y, 140, 0xff4488, 0.10).setDepth(2)
        .setStrokeStyle(1, 0xff4488, 0.4);
    }

    this.tinkerBuildings.push({
      kind, sprite, aura, hpBar, hpBg, hpLabel,
      x, y, hp: maxHp, maxHp, bulletAccum: 0, rocketAccum: 0, tickAccum: 0,
    });

    const kindName = { turret: 'TURRET', dispenser: 'DISPENSER', 'turret+': 'TURRET+', 'dispenser+': 'DISPENSER+', shredder: 'SHREDDER' }[kind];
    this.showFloatingText(x, y - 36, `🛠️ ${kindName}`, '#dddddd');
  }

  private tinkerBuildingLabel(kind: TinkerBuilding['kind']): string {
    const m: Record<TinkerBuilding['kind'], string> = {
      turret: '🗡', dispenser: '✚', 'turret+': '🗡+', 'dispenser+': '✚+', shredder: '⚙',
    };
    return m[kind];
  }

  private destroyTinkerBuilding(b: TinkerBuilding): void {
    b.sprite.destroy(); b.hpBar.destroy(); b.hpBg.destroy(); b.hpLabel.destroy();
    if (b.aura) b.aura.destroy();
  }

  // ── Clot mutation helpers ─────────────────────────────────────────────

  private spawnClotTree(x: number, y: number, maxHp: number): void {
    const barW = 50;
    const trunk = this.add.rectangle(x, y + 10, 12, 38, 0x661111, 1).setDepth(5);
    const canopy = this.add.circle(x, y - 18, 26, 0xaa0033, 0.95)
      .setStrokeStyle(2, 0xff2255, 0.9).setDepth(6);
    const hpBg = this.add.rectangle(x, y - 54, barW, 6, 0x330011, 0.9).setDepth(7);
    const hpBar = this.add.rectangle(x - barW / 2, y - 54, barW, 6, 0xff2244, 0.95)
      .setOrigin(0, 0.5).setDepth(8);
    const hpLabel = this.add.text(x, y - 64, '🩸 BLOOD TREE', {
      fontSize: '9px', fontFamily: '"Arial Black", sans-serif', color: '#ff6688',
    }).setOrigin(0.5).setDepth(9);

    // Invisible Fighter hitbox: registering it in enemies/enemyGroup lets every
    // player damage path (projectiles, AoE, melee, kit abilities) hurt the tree.
    const hitbox = new Fighter(this, x, y, 'husk', {
      id: 'clot-tree', name: 'Blood Tree', color: 0xaa0033, emoji: '🩸', abilities: [],
    }, maxHp, 0);
    hitbox.setAlpha(0);
    hitbox.forceInvisible = true;
    hitbox.hideHealthBar();
    const hb = hitbox.body as Phaser.Physics.Arcade.Body;
    hb.setCircle(34, -10, -18); // cover canopy + trunk
    hb.setImmovable(true);
    hb.moves = false;
    hitbox.on('damaged', (amount: number) => {
      if (amount <= 0 || !this.clotTree) return;
      this.syncClotTreeHpBar();
      this.spawnHitFlash(x, y - 10, 0xaa0033);
      this.spawnDamageNumber(x, y - 30, amount);
    });
    hitbox.once('defeated', () => this.fellClotTree());
    // Registered in this.enemies here; enemyGroup registration happens in create()
    // right after the group is built (mutations are applied before it exists).
    this.enemies.push(hitbox);

    this.clotTree = { trunk, canopy, hpBar, hpBg, hpLabel, x, y, hitbox };
    this.showFloatingText(x, y - 72, '🩸 BLOOD TREE', '#ff4477');
  }

  private syncClotTreeHpBar(): void {
    if (!this.clotTree) return;
    const ratio = Math.max(0, this.clotTree.hitbox.hp / this.clotTree.hitbox.maxHp);
    this.clotTree.hpBar.setSize(50 * ratio, 6);
  }

  private fellClotTree(): void {
    if (!this.clotTree) return;
    this.showFloatingText(this.clotTree.x, this.clotTree.y - 20, '🩸 TREE FELLED!', '#ff4477');
    this.destroyClotTree();
    if (this.clotLink) { this.clotLink.destroy(); this.clotLink = null; }
    for (const p of this.clotProjectiles) p.sprite.destroy();
    this.clotProjectiles = [];
    this.npc.isInvincible = false;
  }

  private destroyClotTree(): void {
    if (!this.clotTree) return;
    this.clotTree.trunk.destroy();
    this.clotTree.canopy.destroy();
    this.clotTree.hpBar.destroy();
    this.clotTree.hpBg.destroy();
    this.clotTree.hpLabel.destroy();
    this.enemies = this.enemies.filter((e) => e !== this.clotTree!.hitbox);
    this.enemyGroup.remove(this.clotTree.hitbox, false, false);
    this.clotTree.hitbox.destroy();
    this.clotTree = null;
  }

  private updateClotTree(time: number, delta: number): void {
    const tree = this.clotTree;
    // If tree already gone, ensure NPC invincibility is off
    if (!tree) {
      if (this.npc.isInvincible) this.npc.isInvincible = false;
      if (this.clotLink) { this.clotLink.destroy(); this.clotLink = null; }
      return;
    }

    // Redraw tether from tree to NPC
    if (this.clotLink) {
      this.clotLink.clear();
      this.clotLink.lineStyle(2, 0xaa0033, 0.7);
      this.clotLink.lineBetween(tree.x, tree.y, this.npc.x, this.npc.y);
    }

    // Projectile hits are handled by the projectiles-vs-enemyGroup overlap
    // (the tree's hitbox Fighter is an enemyGroup member).

    // Starred: fire blood projectile bursts every 5s
    const starred = this.starredMutations.has('clot');
    if (starred) {
      this.clotBurstAccum += delta;
      if (this.clotBurstAccum >= 5000) {
        this.clotBurstAccum -= 5000;
        const baseAngle = Phaser.Math.Angle.Between(tree.x, tree.y, this.player.x, this.player.y);
        for (let i = 0; i < 5; i++) {
          const angle = baseAngle + Phaser.Math.DegToRad(-30 + i * 15);
          const spd = 240;
          const sprite = this.add.circle(tree.x, tree.y, 6, 0xcc0033, 0.9)
            .setStrokeStyle(1, 0xff6688, 0.8).setDepth(7) as unknown as Phaser.GameObjects.Arc;
          this.clotProjectiles.push({ sprite, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, active: true });
        }
        this.showFloatingText(tree.x, tree.y - 20, '💢 BURST', '#ff4477');
      }
    }

    // Move blood projectiles and check player collision
    const wb = this.physics.world.bounds;
    for (let i = this.clotProjectiles.length - 1; i >= 0; i--) {
      const p = this.clotProjectiles[i];
      if (!p.active) { this.clotProjectiles.splice(i, 1); continue; }
      p.sprite.x += p.vx * (delta / 1000);
      p.sprite.y += p.vy * (delta / 1000);
      // Out of bounds
      if (p.sprite.x < wb.x || p.sprite.x > wb.right || p.sprite.y < wb.y || p.sprite.y > wb.bottom) {
        p.sprite.destroy();
        this.clotProjectiles.splice(i, 1);
        continue;
      }
      // Hit player
      if (this.player.active && Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, this.player.x, this.player.y) <= 18) {
        this.player.takeDamage(10);
        this.spawnHitFlash(this.player.x, this.player.y, 0xcc0033);
        this.showFloatingText(this.player.x, this.player.y - 20, '🩸 -10', '#ff4477');
        // Heal tree
        if (this.clotTree) {
          this.clotTree.hitbox.heal(10);
          this.syncClotTreeHpBar();
          this.showFloatingText(this.clotTree.x, this.clotTree.y - 20, '🩸 +10', '#ff4477');
        }
        p.sprite.destroy();
        this.clotProjectiles.splice(i, 1);
      }
    }
    void time;
  }

  // ── Encroach mutation helpers ─────────────────────────────────────────

  private applyEncroachShrink(): void {
    const wb = this.physics.world.bounds;
    const insetX = Math.round(wb.width * 0.067);
    const insetY = Math.round(wb.height * 0.067);
    const newX = wb.x + insetX;
    const newY = wb.y + insetY;
    const newW = wb.width - insetX * 2;
    const newH = wb.height - insetY * 2;

    // Draw black wall strips (top, bottom, left, right)
    this.encroachWallGfx = this.add.graphics().setDepth(5);
    this.encroachWallGfx.fillStyle(0x000000, 1);
    this.encroachWallGfx.fillRect(wb.x, wb.y, wb.width, insetY);                          // top
    this.encroachWallGfx.fillRect(wb.x, wb.y + wb.height - insetY, wb.width, insetY);     // bottom
    this.encroachWallGfx.fillRect(wb.x, wb.y + insetY, insetX, newH);                     // left
    this.encroachWallGfx.fillRect(wb.x + wb.width - insetX, wb.y + insetY, insetX, newH); // right
    // Red inner border line
    this.encroachWallGfx.lineStyle(2, 0x990000, 0.8);
    this.encroachWallGfx.strokeRect(newX, newY, newW, newH);

    this.physics.world.setBounds(newX, newY, newW, newH);

    // Clamp fighters that might be outside new bounds
    for (const f of [this.player, this.npc] as Fighter[]) {
      if (!f.active) continue;
      const clampedX = Phaser.Math.Clamp(f.x, newX, newX + newW);
      const clampedY = Phaser.Math.Clamp(f.y, newY, newY + newH);
      if (clampedX !== f.x || clampedY !== f.y) {
        (f.body as Phaser.Physics.Arcade.Body).reset(clampedX, clampedY);
      }
    }
  }

  private spawnEncroachMine(): void {
    const wb = this.physics.world.bounds;
    let x = 0;
    let y = 0;
    let attempts = 0;
    const margin = 40;
    do {
      x = wb.x + margin + Math.random() * (wb.width - margin * 2);
      y = wb.y + margin + Math.random() * (wb.height - margin * 2);
      attempts++;
    } while (
      attempts < 30 && (
        Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 100 ||
        Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) < 100 ||
        this.encroachMines.some((m) => Phaser.Math.Distance.Between(x, y, m.x, m.y) < 80)
      )
    );

    const sprite = this.add.circle(x, y, 28, 0x553300, 0.12).setDepth(3)
      .setStrokeStyle(1, 0x886600, 0.15);
    const inner = this.add.circle(x, y, 8, 0x885500, 0.12).setDepth(4);
    this.encroachMines.push({ sprite, inner, x, y, armed: true });
  }

  private updateEncroachMines(time: number): void {
    for (let i = this.encroachMines.length - 1; i >= 0; i--) {
      const mine = this.encroachMines[i];
      if (!mine.armed) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, mine.x, mine.y) > 26) continue;

      mine.armed = false;
      // Detonation flash
      const flash = this.add.circle(mine.x, mine.y, 80, 0xff8800, 0.6).setDepth(8);
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 300, onComplete: () => flash.destroy() });
      this.showFloatingText(mine.x, mine.y - 30, '💥 MINE', '#ffaa33');
      // Damage: player always, NPC if in radius
      if (this.player.active) {
        this.player.takeDamage(30);
        this.spawnHitFlash(this.player.x, this.player.y, 0xff8800);
      }
      if (this.npc.active && Phaser.Math.Distance.Between(mine.x, mine.y, this.npc.x, this.npc.y) <= 80) {
        this.npc.takeDamage(30);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0xff8800);
      }
      mine.sprite.destroy();
      mine.inner.destroy();
      this.encroachMines.splice(i, 1);
    }
    void time;
  }

  private updateEncroachSlow(time: number): void {
    const currentHp = this.player.hp;
    if (this.player.active && currentHp < this.encroachLastPlayerHp) {
      this.encroachSlowStacks.push(time + 3000);
      this.showFloatingText(this.player.x, this.player.y - 20, '🐌 SLOWED', '#aaffaa');
    }
    this.encroachLastPlayerHp = currentHp;
    // Prune expired stacks
    this.encroachSlowStacks = this.encroachSlowStacks.filter((t) => t > time);
    // Apply stacking slow to playerSpeedMult
    if (this.encroachSlowStacks.length > 0) {
      this.playerSpeedMult *= Math.pow(0.9, this.encroachSlowStacks.length);
    }
  }

  private updateTinkerBuildings(time: number, delta: number): void {
    const { width: W, height: H } = this.scale;
    for (let i = this.tinkerBuildings.length - 1; i >= 0; i--) {
      const b = this.tinkerBuildings[i];
      // Damage from player projectiles
      let destroyed = false;
      for (const go of this.projectiles.getChildren() as Projectile[]) {
        if (!go.active || !go.isFromPlayer) continue;
        if (Phaser.Math.Distance.Between(go.x, go.y, b.x, b.y) <= 20) {
          b.hp -= go.damage;
          go.setActive(false).setVisible(false);
          (go.body as Phaser.Physics.Arcade.Body).stop();
          this.spawnHitFlash(b.x, b.y, 0xffffff);
          this.spawnDamageNumber(b.x, b.y - 18, go.damage);
          if (b.hp <= 0) {
            this.destroyTinkerBuilding(b);
            this.tinkerBuildings.splice(i, 1);
            destroyed = true;
            break;
          }
          // Update HP bar
          const ratio = Math.max(0, b.hp / b.maxHp);
          b.hpBar.setSize(40 * ratio, 4);
        }
      }
      if (destroyed) continue;

      // Per-building behaviour
      if (b.kind === 'turret' || b.kind === 'turret+') {
        b.bulletAccum += delta;
        if (b.bulletAccum >= 500 && this.player.active) {
          b.bulletAccum -= 500;
          const dx = this.player.x - b.x;
          const dy = this.player.y - b.y;
          const len = Math.hypot(dx, dy) || 1;
          const proj = new Projectile(this, b.x, b.y, 'proj-tinker-bullet', 5, false);
          this.projectiles.add(proj);
          proj.launch((dx / len) * 280, (dy / len) * 280);
        }
        if (b.kind === 'turret+') {
          b.rocketAccum += delta;
          if (b.rocketAccum >= 5000 && this.player.active) {
            b.rocketAccum -= 5000;
            this.spawnTinkerRocket(b.x, b.y);
          }
        }
      } else if (b.kind === 'dispenser' || b.kind === 'dispenser+') {
        b.tickAccum += delta;
        const auraR = b.kind === 'dispenser+' ? 120 : 80;
        const healPerSec = b.kind === 'dispenser+' ? 5 : 3;
        if (b.tickAccum >= 1000) {
          b.tickAccum -= 1000;
          if (this.npc.active && Phaser.Math.Distance.Between(this.npc.x, this.npc.y, b.x, b.y) <= auraR) {
            this.npc.heal(healPerSec);
          }
        }
        if (b.aura) b.aura.setPosition(b.x, b.y);
      } else if (b.kind === 'shredder') {
        // Pull player in if within range
        const pullR = 140;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
        if (dist <= pullR && this.player.active) {
          const pdx = b.x - this.player.x;
          const pdy = b.y - this.player.y;
          const plen = Math.hypot(pdx, pdy) || 1;
          const pull = 900;
          const pb = this.player.body as Phaser.Physics.Arcade.Body;
          pb.setVelocity(pb.velocity.x + (pdx / plen) * pull * (delta / 1000), pb.velocity.y + (pdy / plen) * pull * (delta / 1000));
        }
        // Contact damage
        b.tickAccum += delta;
        if (b.tickAccum >= 500 && this.player.active && dist <= 24) {
          b.tickAccum -= 500;
          this.player.takeDamage(5);
          this.spawnHitFlash(this.player.x, this.player.y, 0xff4488);
        }
        if (b.aura) b.aura.setPosition(b.x, b.y);
      }

      void W; void H; void time;
    }
  }

  private spawnTinkerRocket(fromX: number, fromY: number): void {
    const proj = new Projectile(this, fromX, fromY, 'proj-tinker-rocket', 10, false);
    this.projectiles.add(proj);
    (proj as any)._isTinkerRocket = true;
    const dx = this.player.x - fromX;
    const dy = this.player.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    proj.launch((dx / len) * 160, (dy / len) * 160);
    this.showFloatingText(fromX, fromY - 20, '🚀', '#ff9944');
    // Homing: each frame steer slightly toward player (handled in update)
    (proj as any)._homingTarget = this.player;
  }

  private doPhantomTeleport(starred: boolean): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const ptr = this.input.activePointer;
    const facingAngle = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
    const behindAngle = facingAngle + Math.PI;
    const spread = (15 * Math.PI) / 180;
    const angle = behindAngle + (Math.random() - 0.5) * 2 * spread;
    const dist = 260;
    const tx = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 30, W - 30);
    const ty = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 30, H - 30);

    // Teleport flash at old pos
    const ring = this.add.circle(this.npc.x, this.npc.y, 22, 0xaaaaff, 0.5).setDepth(9);
    this.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 500, onComplete: () => ring.destroy() });

    (this.npc.body as Phaser.Physics.Arcade.Body).reset(tx, ty);
    this.phantomInvisibleUntil = this.time.now + 3000;
    this.showFloatingText(tx, ty - 30, '👻 PHANTOM', '#ccccff');

    if (starred) {
      // Stab effect at player pos + deal 10 dmg
      const sx = this.player.x + (Math.random() - 0.5) * 20;
      const sy = this.player.y + (Math.random() - 0.5) * 20;
      const slashGfx = this.add.graphics().setDepth(12);
      slashGfx.lineStyle(4, 0xffffff, 1);
      slashGfx.lineBetween(sx - 12, sy - 12, sx + 12, sy + 12);
      slashGfx.lineBetween(sx + 12, sy - 12, sx - 12, sy + 12);
      this.tweens.add({ targets: slashGfx, alpha: 0, duration: 180, onComplete: () => slashGfx.destroy() });
      if (this.player.active) {
        this.player.takeDamage(10);
        this.spawnHitFlash(this.player.x, this.player.y, 0xccccff);
        this.showFloatingText(this.player.x, this.player.y - 28, '👻 STAB -10', '#ccccff');
      }
    }
  }

  private spawnLavaPuddle(x: number, y: number, starred: boolean): void {
    const radius  = starred ? 52 : 35;
    const lifetime = starred ? 4500 : 3000;
    const spr = this.add.circle(x, y, radius, 0xff4422, 0.55).setDepth(2)
      .setStrokeStyle(1, 0xff8844, 0.6);
    this.tweens.add({ targets: spr, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 });
    this.puddles.push({ sprite: spr, expiresAt: this.time.now + lifetime, x, y, radius, tickAccum: 0, owner: 'npc', kind: 'lava' });
  }

  private doBlusteryTeleport(starred: boolean): void {
    const dx  = this.npc.x - this.player.x;
    const dy  = this.npc.y - this.player.y;
    const len = Math.hypot(dx, dy) || 1;
    const W = this.scale.width;
    const H = this.scale.height;
    const targetX = Phaser.Math.Clamp(this.player.x + (dx / len) * 260, 30, W - 30);
    const targetY = Phaser.Math.Clamp(this.player.y + (dy / len) * 260, 30, H - 30);
    const fromX = this.npc.x;
    const fromY = this.npc.y;

    for (const [vx, vy] of [[fromX, fromY], [targetX, targetY]] as [number, number][]) {
      const ring = this.add.circle(vx, vy, 24, 0xaaddff, 0.7).setDepth(9);
      this.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
    }
    this.showFloatingText(fromX, fromY - 30, '💨 BLUSTERY', '#aaddff');
    (this.npc.body as Phaser.Physics.Arcade.Body).reset(targetX, targetY);

    if (starred) {
      const aoeR = 110;
      const aoeRing = this.add.circle(fromX, fromY, aoeR, 0xccffff, 0.35).setDepth(8);
      this.tweens.add({ targets: aoeRing, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 500, onComplete: () => aoeRing.destroy() });
      if (Phaser.Math.Distance.Between(fromX, fromY, this.player.x, this.player.y) <= aoeR) {
        this.player.takeDamage(12);
        const kdx = this.player.x - fromX;
        const kdy = this.player.y - fromY;
        const kl  = Math.hypot(kdx, kdy) || 1;
        const pb  = this.player.body as Phaser.Physics.Arcade.Body;
        pb.setVelocity((kdx / kl) * 480, (kdy / kl) * 480);
        this.showFloatingText(this.player.x, this.player.y - 28, '💨 WIND BURST', '#aaddff');
      }
    }
  }

  // ── Honor helpers ──────────────────────────────────────────────────────────

  private spawnHonorTallyHud(): void {
    const W = this.scale.width;
    for (let i = 0; i < 3; i++) {
      const pt = this.add.text(W / 2 - 80 + i * 28, 60, '|', {
        fontSize: '28px', fontFamily: '"Arial Black", sans-serif',
        color: '#444444', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20).setAlpha(0.85);
      this.honorPlayerTallyTexts.push(pt);

      const nt = this.add.text(W / 2 + 80 - i * 28, 60, '|', {
        fontSize: '28px', fontFamily: '"Arial Black", sans-serif',
        color: '#444444', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20).setAlpha(0.85);
      this.honorNpcTallyTexts.push(nt);
    }
    const label = this.add.text(W / 2, 38, '⚔️ HONOR', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);
    this.honorPlayerTallyTexts.push(label);
  }

  private addHonorTally(side: 'player' | 'npc'): void {
    if (side === 'player') {
      this.honorPlayerTally = Math.min(3, this.honorPlayerTally + 1);
      for (let i = 0; i < 3; i++) {
        if (this.honorPlayerTallyTexts[i]) {
          this.honorPlayerTallyTexts[i].setColor(i < this.honorPlayerTally ? '#ff4444' : '#444444');
        }
      }
      this.showFloatingText(this.player.x, this.player.y - 40, '⚔️ TALLY', '#ff4444');
      if (this.honorPlayerTally >= 3) this.endGame(true);
    } else {
      this.honorNpcTally = Math.min(3, this.honorNpcTally + 1);
      for (let i = 0; i < 3; i++) {
        if (this.honorNpcTallyTexts[i]) {
          this.honorNpcTallyTexts[i].setColor(i < this.honorNpcTally ? '#ff4444' : '#444444');
        }
      }
      this.showFloatingText(this.npc.x, this.npc.y - 40, '⚔️ TALLY', '#ff4444');
      if (this.honorNpcTally >= 3) this.endGame(false);
    }
  }

  private updateHonorTallyPositions(): void {
    // HUD is fixed-position; no update needed. No-op placeholder.
  }

  private checkHonorParry(time: number): void {
    const PARRY_RADIUS = 80;
    for (const go of this.projectiles.getChildren()) {
      const proj = go as import('../combat/Projectile').Projectile;
      if (!proj.active || !proj.isFromPlayer) continue;
      if ((proj as unknown as Record<string, unknown>)['_honorParried']) continue;
      const dist = Phaser.Math.Distance.Between(proj.x, proj.y, this.npc.x, this.npc.y);
      if (dist > PARRY_RADIUS) continue;
      if (Math.random() >= 0.5) continue;
      // Parry: flip ownership and double speed toward player
      (proj as unknown as Record<string, unknown>)['_honorParried'] = true;
      (proj as unknown as Record<string, unknown>)['isFromPlayer'] = false;
      const dx = this.player.x - proj.x;
      const dy = this.player.y - proj.y;
      const len = Math.hypot(dx, dy) || 1;
      const spd = 600;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      body.setVelocity((dx / len) * spd, (dy / len) * spd);
      this.spawnHitFlash(proj.x, proj.y, 0xffcc44);
      this.showFloatingText(this.npc.x, this.npc.y - 36, '⚔️ PARRY', '#ffcc44');
      // Listen for this parried shot hitting the player — force-tally regardless of cooldown
      const onHit = () => {
        if (this.mutations.has('honor')) {
          this.addHonorTally('npc');
          this.honorNpcCdUntil = this.time.now + 2000;
        }
      };
      (proj as unknown as Record<string, unknown>)['_honorParryHitCb'] = onHit;
    }
  }

  private applyHonorParriedHit(proj: import('../combat/Projectile').Projectile): void {
    const cb = (proj as unknown as Record<string, unknown>)['_honorParryHitCb'] as (() => void) | undefined;
    if (cb) { cb(); delete (proj as unknown as Record<string, unknown>)['_honorParryHitCb']; }
  }

  // ── Golf helpers ────────────────────────────────────────────────────────────

  private spawnGolfBall(starred: boolean): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const radius = starred ? 15 : 20;
    const textureKey = starred ? 'proj-golf-ball-starred' : 'proj-golf-ball';
    const sprite = this.physics.add.image(W / 2, H / 2, textureKey)
      .setDepth(8).setDisplaySize(radius * 2, radius * 2);
    (sprite.body as Phaser.Physics.Arcade.Body).setCircle(radius);
    this.golfBall = { sprite, vx: 0, vy: 0, lastEnemyHitAt: -9999, radius };

    const labelText = this.add.text(W / 2, H / 2 - radius - 16, 'Hit the ball!', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif',
      color: '#ffffff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(9);
    this.golfBallSpeedLabel = labelText;

    this.showFloatingText(W / 2, H / 2 - 60, '⛳ GOLF!', '#ffffff');
  }

  private updateGolfBall(time: number, delta: number): void {
    const ball = this.golfBall!;
    if (!ball.sprite.active) return;

    const dt = delta / 1000;
    const KICK_SCALE = 3.5;
    const DAMPING = 0.998;
    const SPEED_TO_DMG = 0.04;
    const HIT_RADIUS = ball.radius + 24;

    // Player projectiles kick the ball
    for (const go of this.projectiles.getChildren()) {
      const proj = go as import('../combat/Projectile').Projectile;
      if (!proj.active || !proj.isFromPlayer) continue;
      const dist = Phaser.Math.Distance.Between(proj.x, proj.y, ball.sprite.x, ball.sprite.y);
      if (dist > ball.radius + 12) continue;
      // Kick the ball in the projectile's direction
      const body = proj.body as Phaser.Physics.Arcade.Body;
      const pvx = body.velocity.x;
      const pvy = body.velocity.y;
      const plen = Math.hypot(pvx, pvy) || 1;
      ball.vx += (pvx / plen) * proj.damage * KICK_SCALE;
      ball.vy += (pvy / plen) * proj.damage * KICK_SCALE;
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      this.spawnHitFlash(proj.x, proj.y, 0xffffff);
    }

    // Physics: move + bounce off world bounds
    ball.sprite.x += ball.vx * dt;
    ball.sprite.y += ball.vy * dt;

    const wb = this.physics.world.bounds;
    if (ball.sprite.x <= wb.x + ball.radius) {
      ball.sprite.x = wb.x + ball.radius;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.sprite.x >= wb.right - ball.radius) {
      ball.sprite.x = wb.right - ball.radius;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.sprite.y <= wb.y + ball.radius) {
      ball.sprite.y = wb.y + ball.radius;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.sprite.y >= wb.bottom - ball.radius) {
      ball.sprite.y = wb.bottom - ball.radius;
      ball.vy = -Math.abs(ball.vy);
    }

    ball.vx *= DAMPING;
    ball.vy *= DAMPING;

    // Speed label
    const speed = Math.hypot(ball.vx, ball.vy);
    if (this.golfBallSpeedLabel) {
      this.golfBallSpeedLabel.setPosition(ball.sprite.x, ball.sprite.y - ball.radius - 16);
      this.golfBallSpeedLabel.setText(speed > 10 ? `⚡ ${Math.round(speed)}` : '');
    }

    // Sync physics body to manual position
    const body = ball.sprite.body as Phaser.Physics.Arcade.Body;
    body.reset(ball.sprite.x, ball.sprite.y);

    // Ball-on-enemy hit
    if (time - ball.lastEnemyHitAt < 500) return;
    const distToNpc = Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, this.npc.x, this.npc.y);
    if (distToNpc <= HIT_RADIUS + 24) {
      const dmg = Math.max(1, Math.round(speed * SPEED_TO_DMG));
      ball.lastEnemyHitAt = time;
      this.npc.hp = Math.max(0, this.npc.hp - dmg);
      this.spawnHitFlash(this.npc.x, this.npc.y, 0xffffff);
      this.spawnDamageNumber(this.npc.x, this.npc.y - 28, dmg);
      this.showFloatingText(this.npc.x, this.npc.y - 55, `⛳ ${dmg} dmg`, '#ffffff');
      // Reflect ball away from NPC
      const nx = ball.sprite.x - this.npc.x;
      const ny = ball.sprite.y - this.npc.y;
      const nl = Math.hypot(nx, ny) || 1;
      ball.vx = (nx / nl) * speed;
      ball.vy = (ny / nl) * speed;
      if (this.npc.hp <= 0 && !this.gameEnded) {
        this.endGame(true);
      }
    }
  }

  private executeAmberAttack(time: number, starred: boolean): void {
    const dino = this.amberDino!;
    const maxKind = starred ? 3 : 2;
    const kind = this.amberAttackKind % maxKind;
    this.amberAttackKind = (this.amberAttackKind + 1) % maxKind;
    if (kind === 0) {
      // Claw: 10 dmg + 10% slow for 3s
      this.player.takeDamage(Math.round(10 * this.npc.outgoingDamageMult));
      this.spawnHitFlash(this.player.x, this.player.y, 0x33cc55);
      this.showFloatingText(this.player.x, this.player.y - 28, '🦖 CLAW', '#66ee66');
      this.amberSlowStacks.push(time + 3000);
    } else if (kind === 1) {
      // Bite: 15 dmg + bleed DOT 3s
      this.player.takeDamage(Math.round(15 * this.npc.outgoingDamageMult));
      this.spawnHitFlash(this.player.x, this.player.y, 0xcc0000);
      this.showFloatingText(this.player.x, this.player.y - 28, '🦖 BITE', '#ff4444');
      this.amberPlayerBleedUntil = time + 3000;
      this.amberPlayerBleedTickAccum = 0;
      this.playerBleeding = true;
      this.playerBleedingUntil = Math.max(this.playerBleedingUntil, this.amberPlayerBleedUntil);
      this.applyPlayerBleedVisual();
    } else {
      // Scalding Breath (starred): 2s cone fire DOT
      this.amberBreathActive = true;
      this.amberBreathEndAt = time + 2000;
      this.amberBreathTickAccum = 0;
      this.showFloatingText(dino.sprite.x, dino.sprite.y - 28, '🦖 BREATH', '#ff8833');
    }
  }

  private spawnApprehensionMaze(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const wallCount = 22;
    const maxAttempts = 400;
    let placed = 0;
    for (let attempt = 0; attempt < maxAttempts && placed < wallCount; attempt++) {
      const w = 30 + Math.random() * 80;
      const h = 30 + Math.random() * 80;
      const x = 60 + Math.random() * (W - 120);
      const y = 60 + Math.random() * (H - 120);
      // Keep clear of both fighters' spawn areas
      if (Math.abs(x - this.player.x) < w / 2 + 60 && Math.abs(y - this.player.y) < h / 2 + 60) continue;
      if (Math.abs(x - this.npc.x) < w / 2 + 60 && Math.abs(y - this.npc.y) < h / 2 + 60) continue;
      const rect = this.add.rectangle(x, y, w, h, 0x110022, 0.85)
        .setStrokeStyle(2, 0x441166, 0.9).setDepth(4);
      this.apprehensionMazeWalls.push({ rect, x, y, w, h });
      placed++;
    }
  }

  private initApprehensionFog(): void {
    const { width: W, height: H } = this.scale;
    this.apprehensionFogRT = this.add.renderTexture(0, 0, W, H)
      .setDepth(16).setScrollFactor(0).setOrigin(0, 0);
    this.apprehensionFogEraser = this.add.graphics({ x: 0, y: 0 }).setVisible(false);
  }

  private updateApprehensionFog(): void {
    if (!this.apprehensionFogRT || !this.apprehensionFogEraser) return;
    const rt = this.apprehensionFogRT;
    rt.clear();
    rt.fill(0x000000, 0.92);
    this.apprehensionFogEraser.clear();
    this.apprehensionFogEraser.fillStyle(0xffffff, 1);
    // Small reveal circle around the player (can't see own feet in pitch darkness)
    this.apprehensionFogEraser.fillCircle(this.player.x, this.player.y, 28);
    // Flashlight cone aimed at cursor
    const ptr = this.input.activePointer;
    const aim = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
    const range = 230;
    const halfAngle = Phaser.Math.DegToRad(35);
    this.apprehensionFogEraser.beginPath();
    this.apprehensionFogEraser.moveTo(this.player.x, this.player.y);
    this.apprehensionFogEraser.arc(this.player.x, this.player.y, range, aim - halfAngle, aim + halfAngle, false);
    this.apprehensionFogEraser.closePath();
    this.apprehensionFogEraser.fillPath();
    rt.erase(this.apprehensionFogEraser, 0, 0);
  }

  private isInPlayerFlashlightCone(x: number, y: number): boolean {
    const ptr = this.input.activePointer;
    const aim = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
    const angleToTarget = Math.atan2(y - this.player.y, x - this.player.x);
    const angleDiff = Phaser.Math.Angle.Wrap(angleToTarget - aim);
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
    return dist <= 230 && Math.abs(angleDiff) <= Phaser.Math.DegToRad(35);
  }

  private apprehensionLosBlocked(ax: number, ay: number, bx: number, by: number): boolean {
    const line = new Phaser.Geom.Line(ax, ay, bx, by);
    for (const mw of this.apprehensionMazeWalls) {
      const rect = new Phaser.Geom.Rectangle(mw.x - mw.w / 2, mw.y - mw.h / 2, mw.w, mw.h);
      if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) return true;
    }
    return false;
  }

  private doApprehensionBorderTeleport(): void {
    const wb = this.physics.world.bounds;
    const edge = Phaser.Math.Between(0, 3);
    let tx: number, ty: number;
    switch (edge) {
      case 0:  tx = Phaser.Math.Between(wb.x + 40, wb.x + wb.width - 40);  ty = wb.y + 30; break;
      case 1:  tx = Phaser.Math.Between(wb.x + 40, wb.x + wb.width - 40);  ty = wb.y + wb.height - 30; break;
      case 2:  tx = wb.x + 30; ty = Phaser.Math.Between(wb.y + 40, wb.y + wb.height - 40); break;
      default: tx = wb.x + wb.width - 30; ty = Phaser.Math.Between(wb.y + 40, wb.y + wb.height - 40); break;
    }
    const fromX = this.npc.x;
    const fromY = this.npc.y;
    for (const [rx, ry] of [[fromX, fromY], [tx, ty]] as [number, number][]) {
      const ring = this.add.circle(rx, ry, 24, 0x6644aa, 0.7).setDepth(9);
      this.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
    }
    (this.npc.body as Phaser.Physics.Arcade.Body).reset(tx, ty);
    this.showFloatingText(tx, ty - 28, '👁️ HUNT', '#ff5577');
  }

  private spawnAbyssTrail(x: number, y: number): void {
    const spr = this.add.circle(x, y, 28, 0x4422aa, 0.45).setDepth(2)
      .setStrokeStyle(1, 0x8866ff, 0.5);
    this.tweens.add({ targets: spr, alpha: 0.1, duration: 2800, onComplete: () => spr.destroy() });
    this.puddles.push({ sprite: spr, expiresAt: this.time.now + 3000, x, y, radius: 28, tickAccum: 0, owner: 'npc', kind: 'abyss' });
  }

  private playerOnAbyssTrail(): boolean {
    for (const p of this.puddles) {
      if (p.kind !== 'abyss') continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius) return true;
    }
    return false;
  }

  private applyGauntletBoosts(gs: GauntletState): void {
    const b = gs.boosts;
    const sac = b.sacrificeActive;

    // ── Cards ───────────────────────────────────────────────────────
    const quick = getEffectiveStacks(b, 'quick');
    if (quick > 0) this.gauntletSpeedMult *= Math.pow(1.15, quick);

    const dodgy = getEffectiveStacks(b, 'dodgy');
    if (dodgy > 0) this.player.dodgeChance += 0.10 * dodgy;

    const deadly = getEffectiveStacks(b, 'deadly');
    if (deadly > 0) this.player.cardOutgoingDamageMult *= Math.pow(1.15, deadly);

    const healthy = getEffectiveStacks(b, 'healthy');
    if (healthy > 0) this.player.setMaxHp(this.player.maxHp + 20 * healthy);

    const regenerative = getEffectiveStacks(b, 'regenerative');
    if (regenerative > 0) this.player.regenPerSecond += 3 * regenerative;

    const aggressive = getEffectiveStacks(b, 'aggressive');
    if (aggressive > 0) this.player.cooldownMult *= Math.pow(0.9, aggressive);

    const technique = getEffectiveStacks(b, 'technique');
    if (technique > 0) this.cardDodgeLengthMult = Math.pow(1.30, technique);

    const protected_ = getEffectiveStacks(b, 'protected');
    if (protected_ > 0) this.player.cardDamageTakenMult *= Math.pow(0.9, protected_);

    const thorns = getEffectiveStacks(b, 'thorns');
    if (thorns > 0) this.player.reflectFraction = 1 - Math.pow(0.95, thorns);

    const bomber = getEffectiveStacks(b, 'bomber');
    if (bomber > 0) this.cardBomberStacks = bomber;

    const painful = getEffectiveStacks(b, 'painful');
    if (painful > 0) {
      this.npc.statusDurMult *= Math.pow(1.15, painful);
      this.npc.statusDmgMult *= Math.pow(1.15, painful);
    }

    // Rare cards
    const finality = getEffectiveStacks(b, 'finality');
    if (finality > 0) this.player.ultimateCooldownMult *= Math.pow(0.5, finality);

    const cripple = getEffectiveStacks(b, 'cripple');
    if (cripple > 0) this.cardCrippleActive = true;

    const psycho = getEffectiveStacks(b, 'psycho');
    if (psycho >= 1) {
      this.cardPsychoActive = true;
      if (psycho > 1) this.cardDodgeCdMult *= Math.pow(0.85, psycho - 1);
    }

    // ── Curses ──────────────────────────────────────────────────────
    const sluggish = getEffectiveStacks(b, 'sluggish');
    if (sluggish > 0) {
      if (sac) {
        this.gauntletSpeedMult *= Math.pow(1.20, sluggish);
      } else {
        this.gauntletSpeedMult *= Math.pow(0.80, sluggish);
        this.cardSluggishDisableDodge = true;
      }
    }

    const pathetic = getEffectiveStacks(b, 'pathetic');
    if (pathetic > 0) {
      if (sac) {
        this.player.cardOutgoingDamageMult *= Math.pow(1.25, pathetic);
      } else {
        this.player.cardOutgoingDamageMult *= Math.pow(0.75, pathetic);
      }
    }

    const weak = getEffectiveStacks(b, 'weak');
    if (weak > 0) {
      if (sac) {
        this.player.setMaxHp(this.player.maxHp + 25 * weak);
      } else {
        this.player.setMaxHp(Math.max(10, this.player.maxHp - 25 * weak));
      }
    }

    const unfortunate = getEffectiveStacks(b, 'unfortunate');
    if (unfortunate > 0) {
      if (sac) {
        this.player.critChance = (this.player.critChance ?? 0) + 0.10 * unfortunate;
        this.player.critMult = 2;
      } else {
        this.npc.critChance = (this.npc.critChance ?? 0) + 0.10 * unfortunate;
        this.npc.critMult = 2;
      }
    }

    const fat = getEffectiveStacks(b, 'fat');
    if (fat > 0) {
      if (sac) {
        this.player.sizeMult *= Math.pow(0.85, fat);
      } else {
        this.player.sizeMult *= Math.pow(1.15, fat);
      }
      this.player.applySizeMult();
    }
    // 'petri' is handled at fight-launch time in GauntletIntermediaryScene
  }

  /** Online: end the match locally (death, forfeit, or opponent disconnect). */
  endOnlineMatch(playerWon: boolean, reason?: string): void {
    if (this.gameEnded) return;
    this.onlineEndReason = reason ?? null;
    this.endGame(playerWon);
  }

  /** Invasion co-op: end the run locally (team wipe, a leave, or a disconnect) and show results. */
  endCoopRun(wavesCompleted: number, shardsEarned: number): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.invasionCoopKit?.onMatchEnded();
    if (shardsEarned > 0) PlayerData.addCorruptShards(shardsEarned);

    this.cameras.main.flash(350, 0, 80, 255);
    this.time.delayedCall(700, () => {
      this.scene.start('GameOverScene', {
        playerWon: false,
        difficulty: 0,
        mode: 'invasion',
        online: true,
        wavesCompleted,
        corruptShardsEarned: shardsEarned,
      });
    });
  }

  private endGame(playerWon: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    if (this.isOnline) this.onlineKit?.onMatchEnded();

    this.cameras.main.flash(
      350,
      playerWon ? 255 : 0,
      playerWon ? 140 : 80,
      playerWon ? 0 : 255,
    );

    this.time.delayedCall(700, () => {
      if (this.isOnline) {
        this.scene.start('GameOverScene', {
          playerWon,
          difficulty: this.npcDifficulty.level,
          online: true,
          onlineReason: this.onlineEndReason ?? undefined,
        });
      } else if (this.gauntletState) {
        const gs = this.gauntletState;
        const isInfinity = gs.gauntletElement === INFINITY_GAUNTLET_ID;
        if (playerWon) {
          // Accumulate per-fight shards for Infinity runs
          if (isInfinity) {
            const isBoss = gs.currentFight % 10 === 0;
            const fightShards = Math.round(
              infinityFightShards(gs.currentFight, gs.hardMode, isBoss) *
              computeCurseShardMult(gs.boosts)
            );
            gs.infinityShards = (gs.infinityShards ?? 0) + fightShards;
          }
          this.scene.start('GauntletIntermediaryScene', { gauntlet: gs });
        } else {
          const curseShardMult = computeCurseShardMult(gs.boosts);
          this.scene.start('GameOverScene', {
            playerWon: false,
            difficulty: this.npcDifficulty.level,
            isGauntlet: true,
            isInfinityRun: isInfinity,
            infinityFightsCleared: isInfinity ? gs.currentFight - 1 : undefined,
            infinityShards: isInfinity ? gs.infinityShards : undefined,
            curseShardMult: isInfinity ? undefined : curseShardMult,
            gauntletId: gs.gauntletElement,
            hardMode: gs.hardMode,
            campaign: gs.campaignContext ? { slot: gs.campaignContext.slot, worldId: gs.campaignContext.worldId, fightId: gs.gauntletElement, isChallenge: false } : undefined,
          });
        }
      } else if (this.isInvasion) {
        PlayerData.addCorruptShards(this.invasionKit.shardsEarned);
        this.scene.start('GameOverScene', {
          playerWon: false,
          difficulty: 0,
          mode: 'invasion',
          wavesCompleted: this.invasionKit.wavesCompleted,
          corruptShardsEarned: this.invasionKit.shardsEarned,
        });
      } else {
        this.scene.start('GameOverScene', {
          playerWon,
          difficulty: this.npcDifficulty.level,
          rewardMult: playerWon ? getTotalRewardMult() : undefined,
          campaign: this.campaign ?? undefined,
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

  /** Earth Mastery — Dust Screen hitting the local human: blur the canvas for `durationMs`, extending an existing blur rather than letting an earlier call clear it early. */
  applyScreenBlur(durationMs: number): void {
    const until = this.time.now + durationMs;
    this.screenBlurUntil = Math.max(this.screenBlurUntil, until);
    const canvas = this.game.canvas as HTMLCanvasElement | undefined;
    if (canvas) canvas.style.filter = 'blur(5px)';
    this.time.delayedCall(durationMs, () => {
      if (this.time.now >= this.screenBlurUntil) {
        const c = this.game.canvas as HTMLCanvasElement | undefined;
        if (c) c.style.filter = '';
      }
    });
  }

  private openPauseMenu(): void {
    if (this.gameEnded) return;
    if (this.scene.isPaused()) return;
    this.pausedAt = Date.now();
    this.scene.launch('PauseMenuScene', { parentSceneKey: this.scene.key });
    this.scene.pause();
  }

  /**
   * Disabled: the ~700 ability/status flavour pop-ups were cluttering the screen.
   * Kept as a no-op so every existing call site still compiles.
   */
  private showFloatingText(_x: number, _y: number, _text: string, _color: string): void {
    /* intentionally empty */
  }

  /** amount=0 → BLOCKED, amount=-1 → DODGED, amount>0 → damage */
  private spawnDamageNumber(x: number, y: number, amount: number): void {
    const isBlocked = amount === 0;
    const isDodged = amount === -1;
    const isReflected = amount === -2;
    const label = isReflected ? 'REFLECTED' : isBlocked ? 'BLOCKED' : isDodged ? 'DODGED' : `-${amount}`;
    const color = isReflected ? '#ff66ff' : isBlocked ? '#66ddff' : isDodged ? '#aaeeff' : '#ffffff';
    const stroke = isReflected ? '#660066' : isBlocked ? '#003344' : isDodged ? '#002244' : '#880000';

    // Scatter around the target's circle so stacked hits don't overlap in one spot
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 14 + Math.random() * 14;
    const sx = x + Math.cos(angle) * spawnRadius;
    const sy = y + Math.sin(angle) * spawnRadius;

    const txt = this.add.text(sx, sy, label, {
      fontSize: (isBlocked || isDodged || isReflected) ? '13px' : `${Math.min(20, 12 + Math.floor(amount / 10))}px`,
      fontFamily: '"Arial Black", sans-serif',
      color,
      stroke,
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txt,
      x: sx + Math.cos(angle) * 26,
      y: sy + Math.sin(angle) * 14 - 34,
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
      if (Date.now() < f.voidImmuneUntil) return;
      f.voidFrostStacks = Math.min(5, f.voidFrostStacks + 1);
      f.incomingDamageMultiplier = this.frostDamageMultiplier(f.voidFrostStacks);
    } else {
      if (Date.now() < f.frostImmuneUntil) return;
      f.frostStacks = Math.min(5, f.frostStacks + 1);
      f.incomingDamageMultiplier = this.frostDamageMultiplier(f.frostStacks);
    }
  }

  private addFrostStack(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      this.addFrostStackTo(this.npc);
    } else {
      if (Date.now() < this.player.frostImmuneUntil) return;
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

  private spawnIcyTrail(x: number, y: number, owner: 'player' | 'npc', opts?: { skater?: boolean }): void {
    const isVoid = owner === 'player' && this.playerBlackIceMorphActive;
    const fillColor = isVoid ? 0x440066 : 0x88ccff;
    const strokeColor = isVoid ? 0x9900ff : 0xcceeff;
    const spr = this.add.circle(x, y, 32, fillColor, 0.35).setDepth(2)
      .setStrokeStyle(1, strokeColor, 0.5);
    this.tweens.add({ targets: spr, alpha: 0.15, duration: 4800, yoyo: true, repeat: 0 });
    this.icyTrails.push({ sprite: spr, expiresAt: this.time.now + 5000, x, y, radius: 32, frostTickAccum: 0, owner, skater: opts?.skater });
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

  private spawnIceArena(owner: 'player' | 'npc', isVoid: boolean): void {
    const fighter = owner === 'player' ? this.player : this.npc;
    const radius = isVoid ? 60 : 120;
    const fill = isVoid ? 0x440066 : 0x88ccff;
    const stroke = isVoid ? 0x9900ff : 0xcceeff;
    const sprite = this.add.circle(fighter.x, fighter.y, radius, fill, 0.20)
      .setStrokeStyle(2, stroke, 0.8).setDepth(2);
    this.iceArenas.push({
      sprite, x: fighter.x, y: fighter.y, radius,
      expiresAt: this.time.now + 5000, tickAccum: 0, isVoid, owner,
    });
    // Initial creation: permafrost or permavoid on any enemy inside the radius
    const targets = owner === 'player' ? (this.enemies as Fighter[]) : [this.player as Fighter];
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(fighter.x, fighter.y, t.x, t.y);
      if (d > radius) continue;
      if (isVoid) {
        t.permavoidStacks = Math.min(3, t.permavoidStacks + 1);
        this.showFloatingText(t.x, t.y - 30, '🟣 PERMAVOID', '#cc88ff');
      } else {
        t.permafrostStacks = Math.min(3, t.permafrostStacks + 1);
        this.showFloatingText(t.x, t.y - 30, '❄️ PERMAFROST', '#aaddff');
      }
    }
    this.showFloatingText(fighter.x, fighter.y - 30, isVoid ? '🖤 DARK ICE ARENA' : '❄️ ICE ARENA', isVoid ? '#9900ff' : '#88ccff');
  }

  private spawnFrostBeamVisual(x1: number, y1: number, x2: number, y2: number): void {
    const gfx = this.add.graphics().setDepth(8);
    gfx.lineStyle(10, 0x88ccff, 0.7);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(3, 0xffffff, 0.9);
    gfx.lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: gfx, alpha: 0, duration: 280, onComplete: () => gfx.destroy() });
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
    this.applyBleedVisualTo(this.npc);
  }

  /** Bleed aura + drips on any enemy Fighter. The per-frame enemies loop repositions and expires the aura. */
  private applyBleedVisualTo(t: Fighter): void {
    if (!t.bleedVisual) {
      t.bleedVisual = this.add.circle(t.x, t.y, 26, 0xcc0000, 0.3)
        .setStrokeStyle(2, 0xff2222, 0.5).setDepth(3);
      this.tweens.add({ targets: t.bleedVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
    }
    // Drip particles
    for (let i = 0; i < 3; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = this.add.circle(
        t.x + Math.cos(ang) * 18, t.y + Math.sin(ang) * 18,
        3, 0xcc0000, 1,
      ).setDepth(8);
      this.tweens.add({ targets: d, y: d.y + 20, alpha: 0, duration: 600, onComplete: () => d.destroy() });
    }
    this.showFloatingText(t.x, t.y - 28, '🩸 Bleeding!', '#ff2222');
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

    // Phaser sets `isDown` for any button, so a right-click would otherwise
    // also fire the basic click attack — mask it out for this frame.
    if (pointer.rightButtonDown() && !pointer.leftButtonDown()) pointer.isDown = false;

    // Online: broadcast our state and interpolate the remote replica
    if (this.isOnline) this.onlineKit?.update();

    // ── Channel expiry ────────────────────────────────────────────
    if (this.nukeChanneling && time >= this.nukeChannelEnd) { this.nukeChanneling = false; this.player.chargeRatio = 0; }
    if (this.npcNukeChanneling && time >= this.npcNukeChannelEnd) this.npcNukeChanneling = false;

    // Standard nuke charge bar (non-air-beam-walk)
    if (this.nukeChanneling && !this.airBeamWalking) {
      const lockDur = this.nukeChannelEnd - this.nukeLockStartTime;
      this.player.chargeRatio = lockDur > 0 ? Math.min(1, (time - this.nukeLockStartTime) / lockDur) : 1;
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

    // ── Fire Mastery progress tracking (accrues even before unlock) ──
    if (this.elementId === 'fire') {
      for (const t of this.enemies) {
        if (!t.active || this.fireMasteryTrackedEnemies.has(t)) continue;
        this.fireMasteryTrackedEnemies.add(t);
        t.on('damaged', (amount: number) => {
          if (amount <= 0) return;
          const now = this.time.now;
          this.fireBurstWindow.push({ time: now, dmg: amount });
          while (this.fireBurstWindow.length && now - this.fireBurstWindow[0].time > 3000) this.fireBurstWindow.shift();
          const sum = this.fireBurstWindow.reduce((s, e) => s + e.dmg, 0);
          if (sum >= 200) {
            PlayerData.addMasteryStat('fire', 'burstBursts', 1);
            this.fireBurstWindow = [];
          }
        });
        t.once('defeated', () => {
          if (this.fireKit.isFlameBodyActive() || this.fireKit.isEnhancedFlameBody()) {
            PlayerData.addMasteryStat('fire', 'flameBodyKills', 1);
          }
        });
      }
    }

    // ── Water Mastery progress tracking (accrues even before unlock) ──
    if (this.elementId === 'water') {
      for (const t of this.enemies) {
        if (!t.active || this.waterMasteryTrackedEnemies.has(t)) continue;
        this.waterMasteryTrackedEnemies.add(t);
        t.once('defeated', () => {
          const now = this.time.now;
          this.waterKillWindow.push(now);
          while (this.waterKillWindow.length && now - this.waterKillWindow[0] > 3000) this.waterKillWindow.shift();
          if (this.waterKillWindow.length >= 5) {
            PlayerData.addMasteryStat('water', 'killSprees', 1);
            this.waterKillWindow = [];
          }
        });
      }
    }

    // ── Electricity per-frame ─────────────────────────────────────
    if (this.elementId === 'electricity') {
      this.electricityKit.update(time, delta);
    }

    // ── Slime per-frame ───────────────────────────────────────────
    if (this.elementId === 'slime') {
      this.slimeKit.update(time, delta);
    }

    // ── Burning DOT (Flameshredder upgrade / Fire Mastery stoke) ──
    for (const t of this.enemies) {
      if (!t.active) continue;
      if (t.burningUntil > time) {
        const stoked = t.fireStokeBonus > 0;
        const auraColor = stoked ? 0xcc1100 : 0xff4400;
        if (!t.burnAura) {
          t.burnAura = this.add.circle(t.x, t.y, 26, auraColor, 0.3).setDepth(7);
        } else {
          t.burnAura.setFillStyle(auraColor, 0.3);
        }
        t.burnAura.setPosition(t.x, t.y);
        t.burnTickAccum += delta;
        if (t.burnTickAccum >= 500) {
          t.burnTickAccum -= 500;
          t.takeDamage(Math.round((3 + t.fireStokeBonus) * t.statusDmgMult), { fireDot: true }); this.spawnHitFlash(t.x, t.y, auraColor);
        }
      } else {
        t.burnTickAccum = 0;
        t.fireStokeBonus = 0;
        if (t.burnAura) { t.burnAura.destroy(); t.burnAura = null; }
      }
    }

    // ── Card — Regenerative: passive HP regen per second ─────────
    if (this.player.regenPerSecond > 0) {
      this.player.regenAccumMs += delta;
      const regenTick = 1000 / this.player.regenPerSecond;
      while (this.player.regenAccumMs >= regenTick) {
        this.player.regenAccumMs -= regenTick;
        this.player.heal(1);
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
        this.player.applySelfDamage(3); this.spawnHitFlash(this.player.x, this.player.y, 0xff4400);
      }
    } else {
      this.playerBurnTickAccum = 0;
      if (this.playerBurnAura) { this.playerBurnAura.destroy(); this.playerBurnAura = null; }
    }

    // ── Alcohol intoxication bar (brown, below player) ───────────
    if (this.player.intoxicatedUntil > time) {
      const ratio = Math.min(1, (this.player.intoxicatedUntil - time) / 6000);
      const barW = 44;
      if (!this.playerIntoxicationBar) {
        this.playerIntoxicationBar = this.add.rectangle(0, 0, barW, 7, 0xc97a3a, 1).setDepth(9);
      }
      // anchor left edge fixed, shrink from right
      this.playerIntoxicationBar.setPosition(this.player.x - barW / 2 + (barW * ratio) / 2, this.player.y + 32);
      this.playerIntoxicationBar.setSize(barW * ratio, 7);
    } else {
      if (this.playerIntoxicationBar) { this.playerIntoxicationBar.destroy(); this.playerIntoxicationBar = null; }
    }

    // ── Geyser buff checks ────────────────────────────────────────
    // Water geysers: entry events + charge depletion handled by WaterKit.update()
    if (this.elementId !== 'water') {
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
    }

    // ── Speed multipliers ─────────────────────────────────────────
    if (this.elementId === 'fire') {
      this.playerSpeedMult = this.fireKit.isFlameBodyActive() ? 2 : 1;
      if (this.player.intoxicationSlowUntil > time) this.playerSpeedMult *= 0.5;
    } else if (this.elementId === 'hunt') {
      if (this.huntBeastForm) this.playerSpeedMult = 1.5;
      else if (this.huntHybridForm) {
        this.playerSpeedMult = 1.25;
        if (time < this.huntHybridLeapBoostUntil) this.playerSpeedMult *= 1.3;
      } else this.playerSpeedMult = 1;
    } else if (this.elementId === 'life') {
      // Speed Cotton pads give a short 50% burst when the player walks over one.
      this.playerSpeedMult = this.lifeKit.getPlayerSpeedMult();
    } else if (this.elementId === 'silence') {
      this.playerSpeedMult = 1;
      // Kit applies enrage speed boost and watch-channel freeze via applyPlayerSpeedMult
    } else if (this.elementId === 'sand') {
      this.playerSpeedMult = this.timeKit.getPlayerSpeedMult();
    } else if (this.elementId === 'earth') {
      this.playerSpeedMult = 1;
      if (this.earthKit.isRepairActive()) this.playerSpeedMult *= 0.2;
      if (this.earthKit.isGolemFusedRepairSlowing()) this.playerSpeedMult *= 0.2;
      if (this.hasPerk('player', 'obsidian')) this.playerSpeedMult *= 0.85;
    } else if (this.elementId === 'crystal') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // F+: 20% speed boost for 3s after portal teleport
      if (time < this.crystalKit.getPortalSpeedBuffUntil()) this.playerSpeedMult *= 1.2;
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
      if (time < this.soundKit.getHarmonyMoveSpeedUntil()) this.playerSpeedMult *= (1 + this.soundKit.getHarmonyMoveSpeedBonus());
    } else if (this.elementId === 'quantum') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      this.playerSpeedMult *= this.quantumElementKit.getPlayerSpeedMult();
    } else if (this.elementId === 'water') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // Water Mastery — Slipstream: +25% while standing in your own water.
      this.playerSpeedMult *= this.waterKit.getPlayerSpeedMult();
    } else if (this.elementId === 'air') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // Air Mastery — Swift as the Wind: up to +50% from an unbroken snipe streak.
      this.playerSpeedMult *= this.airKit.getPlayerSpeedMult();
    } else {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
    }

    this.npcSpeedMult = 1;
    if (this.fireKit.isNpcFlameBodyActive()) this.npcSpeedMult = 2;
    else if (time < this.npcGeyserBuffUntil) this.npcSpeedMult = 1.5;
    // Time kit speed mults (puddles, bounty aura, speed aura)
    if (this.elementId === 'sand' || this.npcElement.id === 'sand') {
      if (this.elementId !== 'sand') this.playerSpeedMult *= this.timeKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.timeKit.getNpcSpeedMult();
    }

    // Oil puddle slows — managed by OilKit
    if (this.elementId === 'oil' || this.npcElement.id === 'oil') {
      this.npcSpeedMult *= this.oilKit.getNpcSpeedMult();
    }
    // Echo NPC speed (bat form, attach)
    if (this.npcElement.id === 'echo') {
      this.npcSpeedMult *= this.echoKit.getNpcSpeedMult();
    }
    // Tornado grapple slow on NPC
    if (time < this.tornadoGrappleSlowUntil) this.npcSpeedMult *= 0.5;
    // Ice frost slow on NPC
    if (this.npc.frostStacks > 0) this.npcSpeedMult *= (1 - this.npc.frostStacks * 0.1);
    if (this.npc.permafrostStacks > 0) this.npcSpeedMult *= (1 - this.npc.permafrostStacks * 0.10);
    if (this.npcBlockUpActive) this.npcSpeedMult *= 0.5;
    // Growth cancerous growth slow (25% for 2s on explosion)
    if (time < this.npcCancerousSlowUntil) this.npcSpeedMult *= 0.75;
    // Ice frost slow on player
    if (this.playerFrostStacks > 0) {
      this.playerSpeedMult *= (1 - this.playerFrostStacks * 0.1);
    }
    if (this.player.permafrostStacks > 0) this.playerSpeedMult *= (1 - this.player.permafrostStacks * 0.10);
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
    // Card — Cripple: 15% slow on NPC for 2s after any player hit
    if (this.cardCrippleActive && time < this.cardCrippleSlowUntil) this.npcSpeedMult *= 0.85;
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
    } else if (this.nukeChanneling && !this.airBeamWalking &&
               !(this.elementId === 'water' && this.waterKit.isDaggerCharging()) &&
               !(this.elementId === 'air' && this.hasUpgrade('click'))) {
      // Standard nuke: fully locked
      playerBody.setVelocity(0, 0);
    } else if (time < this.silencePlayerYankUntil) {
      // NPC silence yank in progress — keep yank velocity, block WASD override
    } else if (this.elementId === 'ice' && this.playerSkaterActive && !this.isDodging) {
      // Skater mode: cursor-following movement overrides WASD
      const moveMult = this.playerSpeedMult * this.gauntletSpeedMult;
      playerBody.setVelocity(
        Math.cos(this.playerSkaterHeading) * this.playerSkaterSpeed * moveMult,
        Math.sin(this.playerSkaterHeading) * this.playerSkaterSpeed * moveMult,
      );
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
      const dragTargetX = this.npcShadowDragTargetX;
      const dragTargetY = this.npcShadowDragTargetY;
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

    // ── Invasion co-op: downed, awaiting revive ────────────────────
    if (this.invasionCoopKit?.isPlayerDowned()) {
      playerBody.setVelocity(0, 0);
    }

    // ── Magic thorn bind / prison (NPC cast) ─────────────────────
    if ((this.elementId === 'magic' || this.npcElement.id === 'magic') && this.magicKit.isPlayerBound(time) && !this.isDodging) {
      playerBody.setVelocity(0, 0);
    }

    // ── Metal taser stun ─────────────────────────────────────────
    if (this.metalKit.getPlayerMetalTaseredUntil() > time && !this.isDodging) {
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


    // ── Player abilities ─────────────────────────────────────────
    const playerCtx = this.buildPlayerContext(mouseX, mouseY);

    if (this.invasionCoopKit?.isPlayerDowned()) {
      // Downed: no ability input while awaiting revive.
    } else if (this.elementId === 'fire') {
      this.fireKit.handleInput(time, delta, pointer, mouseX, mouseY);

    } else if (this.elementId === 'electricity') {
      this.electricityKit.handleInput(time, delta, mouseX, mouseY, pointer);

    } else if (this.elementId === 'slime') {
      this.slimeKit.handleInput(time, pointer, mouseX, mouseY);

    } else if (this.elementId === 'water') {
      if (!this.nukeChanneling) {
        if (pointer.isDown) {
          if (this.player.castAbility('water-cut', playerCtx) && this.hasUpgrade('click')) {
            // Tint the just-created proj-water white for Dehydration visual
            const children = this.projectiles.getChildren() as Projectile[];
            for (let ci = children.length - 1; ci >= 0; ci--) {
              if (children[ci].isFromPlayer && children[ci].texture.key === 'proj-water') {
                children[ci].setTint(0xffffff);
                break;
              }
            }
          }
        }
        // A slot bound to Siphon is handled by WaterKit — the normal ability there is displaced.
        // The bind check must come first: JustDown() clears the flag, so testing it here would
        // swallow the keypress before WaterKit.handleInput ever sees it.
        if (this.masteryBindFor('e') !== 'siphon' && Phaser.Input.Keyboard.JustDown(this.eKey)) {
          if (this.player.castAbility('splash', playerCtx)) {
            this.splashActiveUntil = time + 2000;
            this.splashDropAccum = 0;
            this.splashDropCount = 0;
          }
        }
        if (this.masteryBindFor('r') !== 'siphon' && Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('geyser', playerCtx);
        }
        if (this.masteryBindFor('q') !== 'siphon' && Phaser.Input.Keyboard.JustDown(this.qKey)) {
          if (this.player.castAbility('pain-rain', playerCtx)) {
            this.waterKit.replenishGeyserCharges(time);
          }
        }
      }
      this.waterKit.handleInput(time, delta, mouseX, mouseY);

    } else if (this.elementId === 'life') {
      // The seed bar and E+ plant dragging swallow the pointer before it becomes an attack.
      this.lifeKit.handleInput(pointer, mouseX, mouseY);

      // ── Click: Petal Shotgun (or Sakura Shots upgrade) ───────────
      if (pointer.isDown && !this.lifeKit.consumedPointer()) {
        if (this.hasUpgrade('click')) {
          if (this.player.getCooldownRatio('petal-shotgun') >= 1) {
            this.player.triggerCooldown('petal-shotgun');
            // Petal Burst: 5 petals at 5 dmg (25 total vs the base 3×8=24), wider cone.
            const SAKURA_ANGLES = [-24, -12, 0, 12, 24];
            const dx = mouseX - this.player.x;
            const dy = mouseY - this.player.y;
            const baseAngle = Math.atan2(dy, dx);
            const speed = 480;
            const spawnDist = 32;
            for (const deg of SAKURA_ANGLES) {
              const angle = baseAngle + deg * (Math.PI / 180);
              const proj = new Projectile(
                this,
                this.player.x + Math.cos(angle) * spawnDist,
                this.player.y + Math.sin(angle) * spawnDist,
                'proj-sakura', 5, true,
              );
              proj.setTint(0xff88aa);
              (proj as any).isSakura = true;
              this.projectiles.add(proj);
              proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
            }
            this.lifeKit.onPetalShotgunFired();
          }
        } else {
          if (this.player.castAbility('petal-shotgun', playerCtx)) {
            this.lifeKit.onPetalShotgunFired();
          }
        }
      }

      // A slot bound to Reap is handled by LifeKit.handleInput above — the
      // normal ability there is displaced, so its cast must be skipped here.
      // ── E: plant the selected seed ───────────────────────────────
      if (this.masteryBindFor('e') !== 'reap' && Phaser.Input.Keyboard.JustDown(this.eKey)) {
        if (this.lifeKit.isPlantCooldownFree('player')) {
          // Mycology drops the cooldown; createPlant charges 15 HP instead.
          this.lifeKit.createPlant(mouseX, mouseY, 'player');
        } else {
          this.player.castAbility('plant', playerCtx);
        }
      }

      // ── R: Fertilize ─────────────────────────────────────────────
      if (this.masteryBindFor('r') !== 'reap' && Phaser.Input.Keyboard.JustDown(this.rKey)) {
        this.player.castAbility('grow', playerCtx);
      }

      // ── F: Root Shield ───────────────────────────────────────────
      if (this.masteryBindFor('f') !== 'reap' && Phaser.Input.Keyboard.JustDown(this.fKey)) {
        this.player.castAbility('thorns', playerCtx);
      }

      // ── Q: Thrive! ───────────────────────────────────────────────
      if (this.masteryBindFor('q') !== 'reap' && Phaser.Input.Keyboard.JustDown(this.qKey)) {
        this.player.castAbility('thorn-drag', playerCtx);
      }

    } else if (this.elementId === 'fate') {
      this.fateKit.handleInput(time, pointer, mouseX, mouseY);
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) this.fateKit.onEKey(mouseX, mouseY);
      if (Phaser.Input.Keyboard.JustDown(this.rKey)) this.fateKit.onRKey();

    } else if (this.elementId === 'air') {
      this.airKit.handleInput(time, mouseX, mouseY);
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
              reportAirSnipeResult: (hit, hitTargets) => {
                if (hit) { this.airConsecutiveHits = Math.min(this.airConsecutiveHits + 1, 3); }
                else {
                  this.airConsecutiveHits = 0;
                  this.player.applySelfDamage(20);
                  this.spawnHitFlash(this.player.x, this.player.y, 0xaaddff);
                }
                this.airKit.onSnipeResult(hit, hitTargets);
              },
            };
            fireHitscan(electroCtx, 45, 0xffee44, true);
          } else {
            // Normal snipe — Click upgrade removes movement lock but keeps charge bar
            const noLockCtx = this.hasUpgrade('click')
              ? { ...snipeBase, lockCaster: (ms: number) => {
                  this.nukeChanneling = true;
                  this.nukeLockStartTime = this.time.now;
                  this.nukeChannelEnd = this.time.now + ms;
                }}
              : snipeBase;
            if (this.player.castAbility('air-snipe', noLockCtx)) {
              if (this.quickShotCharged) this.quickShotCharged = false;
            }
          }
        }

        // ── E: Quick Shot / Electro Charge (upgrade: instant charge on press) ───
        if (this.masteryBindFor('e') !== 'sweeping-tornado' && Phaser.Input.Keyboard.JustDown(this.eKey)) {
          if (this.hasUpgrade('e')) {
            if (this.player.getCooldownRatio('quick-shot') >= 1) {
              // Upgrade: pressing E immediately readies the powerful electro shot
              this.player.triggerCooldown('quick-shot');
              this.airElectroCharged = true;
              if (this.airElectroChargeVisual) this.airElectroChargeVisual.destroy();
              this.airElectroChargeVisual = this.add.circle(this.player.x, this.player.y, 18, 0xffee44, 0.75).setDepth(8);
              this.tweens.add({ targets: this.airElectroChargeVisual, alpha: 0.2, yoyo: true, repeat: -1, duration: 280 });
              const pulse = this.add.circle(this.player.x, this.player.y, 14, 0xffee44, 0.6).setDepth(8);
              this.tweens.add({ targets: pulse, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 300, onComplete: () => pulse.destroy() });
            }
          } else {
            this.player.castAbility('quick-shot', playerCtx);
          }
        }
        if (this.airElectroCharged && this.airElectroChargeVisual) {
          this.airElectroChargeVisual.setPosition(this.player.x, this.player.y);
        }

        // ── R: Wind Trap ──────────────────────────────────────────
        if (this.masteryBindFor('r') !== 'sweeping-tornado' && Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('wind-trap', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── F: Grapple ────────────────────────────────────────────
        if (this.masteryBindFor('f') !== 'sweeping-tornado' && Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('grapple', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── Q: Charged Beam (upgrade: lingering 5s beam) ─────────
        if (this.masteryBindFor('q') !== 'sweeping-tornado' && Phaser.Input.Keyboard.JustDown(this.qKey) && this.airConsecutiveHits >= 3) {
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
                this.airKit.onBeamHits(fireHitscan(ctx, 100, 0x88ccff, false).length);
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
      this.metalKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'plasma') {
      this.plasmaKit.handleInput(time, delta, pointer, mouseX, mouseY);
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
      this.earthKit.handleInput(time, delta, pointer, mouseX, mouseY);
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
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('skate', playerCtx);
        }
        if (!this.playerSkaterActive) {
          if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.player.castAbility('frost-blast', playerCtx);
          }
          if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.player.castAbility('block-up', playerCtx);
          }
          if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.player.castAbility('frozen-solid', playerCtx);
          }
          if (pointer.isDown) {
            this.player.castAbility('ice-spike', playerCtx);
          }
        }
      }
    } else if (this.elementId === 'crystal') {
      this.crystalKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'growth') {
      if (!this.nukeChanneling && !this.growthMutateMenuOpen && !this.growthMorphMenuOpen) {
        if (pointer.isDown) {
          this.player.castAbility('growth-click', playerCtx);
        }
        // E: Mutate — click opens menu; with E+, holding >300ms closes menu and auto-picks
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('mutate', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          playerCtx.fireInfect(mouseX, mouseY);
        }
        // F: Bloat activate on press (F+ hold-to-release-spores handled in damaged listener)
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
      this.timeKit.handleInput(time, pointer, mouseX, mouseY);
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
            const stalImpactDmg = isLava ? 7 : 4;
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

      this.waterKit.update(time, delta);
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
          const splashMissRange = this.npcDifficulty.aimOffsetDeg * 2.2; // ~0 on Nightmare, ~110 on Easy
          const splashX = this.player.x + Phaser.Math.Between(-splashMissRange, splashMissRange);
          const splashY = this.player.y + Phaser.Math.Between(-splashMissRange, splashMissRange);
          const spr = this.add.circle(splashX, splashY, 36, 0x0066bb, 0.5).setDepth(2);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, alpha: 0.25, duration: 800 });
          this.puddles.push({ sprite: spr, expiresAt: time + 1000, x: splashX, y: splashY, radius: 36, tickAccum: 0, owner: 'npc' });
        }
      }

    }

    // ── Shared puddle ticks + expiry ──────────────────────────────
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (time > p.expiresAt) {
        p.sprite.destroy();
        this.puddles.splice(i, 1);
        continue;
      }
      if (p.kind === 'abyss') continue; // Abyss trail: visual/zone only, no damage
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
            const launchDmg = p.lavaFinal ? 11 : 7;
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
          const dmg = p.kind === 'poison' ? 4 : p.kind === 'lava' ? 3 : p.kind === 'toxic' ? 4 : 2;
          const flashColor = p.kind === 'poison' ? 0x66cc22 : p.kind === 'lava' ? 0xff5522 : p.kind === 'toxic' ? 0x33cc22 : 0x0099ff;
          for (const target of _puddleTargets) {
            target.takeDamage(dmg); this.spawnHitFlash(target.x, target.y, flashColor);
            if (p.kind === 'lava' && target === this.player) {
              this.playerBurningUntil = Math.max(this.playerBurningUntil, time + 1500);
            }
          }
        }
      }
      // NPC heals double when standing in its own puddles (skip for lava/toxic — owned by npc, don't self-heal)
      if (p.owner === 'npc' && p.kind !== 'lava' && p.kind !== 'toxic' && Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius) {
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

    // ── Life plants (LifeKit owns all plant state and rendering) ──
    this.lifeKit.update(time, delta);

    const allActiveProj = this.projectiles.getChildren() as Projectile[];

    // ── Summoner: player projectiles damage zombies and zombielings ──
    if (this.mutations.has('summoner')) {
      for (let zi = this.summonerZombies.length - 1; zi >= 0; zi--) {
        const z = this.summonerZombies[zi];
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, z.sprite.x, z.sprite.y) <= 18) {
            z.hp -= proj.damage;
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            proj.setActive(false).setVisible(false);
            this.spawnHitFlash(z.sprite.x, z.sprite.y, 0x66cc44);
            break;
          }
        }
      }
      for (let zi = this.summonerZombielings.length - 1; zi >= 0; zi--) {
        const zl = this.summonerZombielings[zi];
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, zl.sprite.x, zl.sprite.y) <= 11) {
            zl.hp -= proj.damage;
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            proj.setActive(false).setVisible(false);
            this.spawnHitFlash(zl.sprite.x, zl.sprite.y, 0x66cc44);
            break;
          }
        }
      }
    }

    // ── Archfiend: player projectiles can destroy tridents ───────────
    if (this.mutations.has('archfiend')) {
      for (let ti = this.archfiendTridents.length - 1; ti >= 0; ti--) {
        const t = this.archfiendTridents[ti];
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, t.sprite.x, t.sprite.y) <= 18) {
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            proj.setActive(false).setVisible(false);
            this.spawnHitFlash(t.sprite.x, t.sprite.y, 0xcc4422);
            this.showFloatingText(t.sprite.x, t.sprite.y - 16, '🔱 DESTROYED', '#ff4422');
            t.sprite.destroy();
            this.archfiendTridents.splice(ti, 1);
            break;
          }
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
          // Boiling Point: while boiling, rain drops evaporate into steam blasts
          if (this.elementId === 'water' && this.waterKit.onPainRainDropImpact(s.x, s.y)) {
            // handled by kit (steam blast + dehydration AoE)
          } else {
            // Water Mastery — Downpour: snapshot who this drop could kill, then count who died to it.
            const inBlast = this.elementId === 'water'
              ? this.enemies.filter((t) => t.active && t.hp > 0
                  && Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= s.hitRadius)
              : [];
            this.damagePlayerTargets(s.x, s.y, s.hitRadius, s.damage, s.color);
            const rainKills = inBlast.filter((t) => t.hp <= 0).length;
            if (rainKills > 0) PlayerData.addMasteryStat('water', 'painRainKills', rainKills);
            // Squall Splashes upgrade: 25% chance to leave a tidal puddle on impact
            if (this.hasUpgrade('q') && Math.random() < 0.25) {
              const splash = this.add.circle(s.x, s.y, 54, 0x0066bb, 0.7).setDepth(2);
              this.puddles.push({ sprite: splash, expiresAt: this.time.now + 5000, x: s.x, y: s.y, radius: 54, tickAccum: 0, owner: 'player' });
            }
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
                t.takeDamage(2);
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
              this.player.takeDamage(2);
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
        this.shadowDanceChargeBar.setFillStyle(this.shadowDanceCharge >= 35 ? 0x888888 : 0x8800cc, 0.8);

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

    // ── Dodge (Space) ────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dodgeOnCooldown && !this.isDodging && !this.nukeChanneling && time >= this.soulHauntStunUntil && !this.cardSluggishDisableDodge && !(this.elementId === 'slime' && this.slimeKit.shouldSuppressDodge()) && !(this.elementId === 'rubber' && this.rubberKit.shouldSuppressUberGearDodge(mouseX, mouseY, time))) {
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

      // Card — Psycho: teleport to cursor; Card — Technique: extended dash length
      if (this.cardPsychoActive) {
        const { width, height } = this.scale;
        const pad = 44;
        playerBody.reset(Math.max(pad, Math.min(width - pad, mouseX)), Math.max(pad, Math.min(height - pad, mouseY)));
        playerBody.setVelocity(0, 0);
      } else {
        playerBody.setVelocity(dx * 520 * this.cardDodgeLengthMult, dy * 520 * this.cardDodgeLengthMult);
      }

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

      // Card — Bomber: AoE explosion at dodge origin
      if (this.cardBomberStacks > 0) {
        const bx = this.player.x;
        const by = this.player.y;
        this.dealAoeDamageFromOwner(bx, by, 70, Math.round(10 * this.cardBomberStacks * this.player.cardOutgoingDamageMult), 'player');
        const boom = this.add.circle(bx, by, 10, 0xff8800, 0.8).setDepth(9);
        this.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 300, onComplete: () => boom.destroy() });
        this.showFloatingText(bx, by - 20, `💥 ${10 * this.cardBomberStacks}`, '#ffaa44');
      }

      const trail = this.add.circle(this.player.x, this.player.y, 18, 0x8844ff, 0.4);
      this.tweens.add({ targets: trail, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 300, onComplete: () => trail.destroy() });

      this.time.delayedCall(280, () => {
        if (this.player.active) {
          if (!this.soulHauntActive) this.player.isInvincible = false;
          this.isDodging = false;
        }
      });
      this.time.delayedCall(Math.round(1000 * this.cardDodgeCdMult), () => { this.dodgeOnCooldown = false; });
    }

    // ── NPC AI ───────────────────────────────────────────────────
    const aiState: NpcAiState = {
      isLocked: this.npcNukeChanneling || this.npc.frozenUntil > time || this.metalKit.getNpcMetalTaseredUntil() > time || (this.elementId === 'silence' && time < this.npc.silencePossessedUntil) || this.magnetKit.getNailPullUntil() > time || (this.npc.magicChainBound && time < this.npc.magicChainBoundEnd) || time < this.silenceKit.getNpcYankUntil() || time < this.npcHawkDragUntil || (this.npcElement.id === 'rubber' && (this.rubberKit.isBounceFormActive('npc') || this.rubberKit.isBounceBackActive('npc') || this.rubberKit.isSpringActive('npc'))) || this.waterKit.isNpcSplit(),
      hasActiveGeyser: this.geysers.some((g) => g.owner === 'npc'),
      flameBodyActive: this.fireKit.isNpcFlameBodyActive(),
      projectiles: this.projectiles,
      plantCount: this.lifeKit.getPlantCount('npc'),
      thornDragActive: false,
      enemyNearPlant: this.lifeKit.getPlantCount('npc') > 0,
      windTrapActive: time < this.npcWindTrapExpiry,
      chargedBeamReady: this.npcAirConsecutiveHits >= 3,
      earthShieldHp: this.earthKit.getNpcShieldHp(),
      npcEarthRocksActive: this.earthKit.getNpcRocksActive(),
      oilDroneCount: this.oilKit.getNpcDroneCount(),
      shadowPlayerSnared: time < this.shadowPlayerSnaredUntil || time < this.shadowPlayerStunnedUntil,
      playerFrostStacks: this.playerFrostStacks,
      iceBlockActive: this.npcBlockUpActive,
      npcGrowthBloatActive: this.npc.growthBloatActive,
      crystalNodeCount: this.crystalKit.getNpcCrystalNodeCount(),
      npcSoulGhosts: this.npcSoulGhosts,
      npcHuntBeastForm: this.npcHuntBeastForm,
      npcHuntTrailActive: this.npcHuntTrailActive,
      playerBleeding: this.playerBleeding,
      huntBloodMoonActive: this.huntBloodMoonActive,
      npcTimeRemainActive: this.timeKit.isNpcRemainActive(),
      npcTimeHaltActive: this.timeKit.isNpcBountyAuraActive(),
      npcTimeBountyAuraActive: this.timeKit.isNpcBountyAuraActive(),
      npcTimeBounty: this.timeKit.getNpcBounty(),
      npcTimeTimelessReady: this.timeKit.getNpcTimelessCharge() >= 10000,
      // Fate
      fateSlotMachineCount: this.npcElement.id === 'fate' ? this.fateKit.getNpcSlotMachines().length : 0,
      fateCoinCount: this.npcElement.id === 'fate' ? this.fateKit.getNpcCoins() : 0,
      fateNpcLucky: this.npcElement.id === 'fate' ? this.fateKit.isNpcLucky() : false,
      npcMetalArsenal: this.metalKit.getNpcMetalArsenal(),
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
    const npcCastId = this.isOnline
      ? (this.isInvasion ? (this.invasionCoopKit?.consumeNpcCast() ?? null) : (this.onlineKit?.consumeNpcCast() ?? null))
      : (this.isInvasion || this.shadowConsumeActive || this.time.now < this.shadowNpcThrowUntil) ? null : (this.npc as NpcOpponent).doAI(
        this.player,
        (tx: number, ty: number) => this.buildNpcContext(tx, ty),
        time,
        aiState,
      );
    this.npcCastId = npcCastId;

    // ── Invasion mode update ──────────────────────────────────────
    if (this.isInvasion) {
      if (this.isOnline) this.invasionCoopKit?.update(time, delta);
      else this.invasionKit.update(time, delta);
    }

    // Earth and Light kit updates (after npcCastId is known)
    if (this.elementId === 'earth' || this.npcElement.id === 'earth') {
      this.earthKit.update(time, delta);
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
    this.waterKit.handleNpcCastId(npcCastId, time);
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
          const trailInterval = trail.skater ? 2000 : 1200;
          if (enemiesInTrail.length > 0) {
            trail.frostTickAccum += delta;
            if (trail.frostTickAccum >= trailInterval) {
              trail.frostTickAccum -= trailInterval;
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

      // Skater per-frame heading update (Ice F revamp)
      if (this.elementId === 'ice' && this.playerSkaterActive) {
        const ptr = this.input.activePointer;
        const desired = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
        const diff = Phaser.Math.Angle.Wrap(desired - this.playerSkaterHeading);
        const maxTurn = this.playerSkaterTurnRate * (delta / 1000);
        this.playerSkaterHeading += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
        this.playerSkaterTrailAccum += delta;
        if (this.playerSkaterTrailAccum >= 80) {
          this.playerSkaterTrailAccum -= 80;
          this.spawnIcyTrail(this.player.x, this.player.y, 'player', { skater: true });
        }
      }

      // Ice arena ticks (Skate-in-BlockUp / Skate-in-BlackIce)
      for (let ai = this.iceArenas.length - 1; ai >= 0; ai--) {
        const arena = this.iceArenas[ai];
        arena.sprite.setPosition(arena.x, arena.y);
        if (time >= arena.expiresAt) {
          arena.sprite.destroy();
          this.iceArenas.splice(ai, 1);
          continue;
        }
        arena.tickAccum += delta;
        if (arena.tickAccum >= 2000) {
          arena.tickAccum -= 2000;
          const arenaTargets = arena.owner === 'player' ? (this.enemies as Fighter[]) : [this.player as Fighter];
          for (const t of arenaTargets) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(arena.x, arena.y, t.x, t.y) > arena.radius) continue;
            if (arena.isVoid) {
              if (Date.now() >= t.voidImmuneUntil) {
                t.voidFrostStacks = Math.min(5, t.voidFrostStacks + 1);
                t.incomingDamageMultiplier = this.frostDamageMultiplier(t.voidFrostStacks);
              }
            } else {
              if (Date.now() >= t.frostImmuneUntil) {
                t.frostStacks = Math.min(5, t.frostStacks + 1);
                t.incomingDamageMultiplier = this.frostDamageMultiplier(t.frostStacks);
              }
            }
          }
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
          t.takeDamage(t.voidedDps + t.permavoidStacks); this.spawnHitFlash(t.x, t.y, 0x6600cc);
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

        const pfLabel = t.permafrostStacks > 0 ? `🧊×${t.permafrostStacks}` : '';
        if (pfLabel) {
          if (!t.permafrostVisual) {
            t.permafrostVisual = this.add.text(t.x, t.y - 78, pfLabel,
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
            t.permavoidVisual = this.add.text(t.x, t.y - 90, pvLabel,
              { fontSize: '11px', fontFamily: 'Arial', color: '#cc44ff' }).setOrigin(0.5).setDepth(10);
          } else {
            t.permavoidVisual.setText(pvLabel).setPosition(t.x, t.y - 90);
          }
        } else if (t.permavoidVisual) {
          t.permavoidVisual.destroy(); t.permavoidVisual = null;
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

      const playerPfLabel = this.player.permafrostStacks > 0 ? `🧊×${this.player.permafrostStacks}` : '';
      if (playerPfLabel) {
        if (!this.playerPermafrostVisual) {
          this.playerPermafrostVisual = this.add.text(this.player.x, this.player.y - 54, playerPfLabel,
            { fontSize: '11px', fontFamily: 'Arial', color: '#88eeff' }).setOrigin(0.5).setDepth(10);
        } else {
          this.playerPermafrostVisual.setText(playerPfLabel).setPosition(this.player.x, this.player.y - 54);
        }
      } else if (this.playerPermafrostVisual) {
        this.playerPermafrostVisual.destroy(); this.playerPermafrostVisual = null;
      }

      const playerPvLabel = this.player.permavoidStacks > 0 ? `💜×${this.player.permavoidStacks}` : '';
      if (playerPvLabel) {
        if (!this.playerPermavoidVisual) {
          this.playerPermavoidVisual = this.add.text(this.player.x, this.player.y - 66, playerPvLabel,
            { fontSize: '11px', fontFamily: 'Arial', color: '#cc44ff' }).setOrigin(0.5).setDepth(10);
        } else {
          this.playerPermavoidVisual.setText(playerPvLabel).setPosition(this.player.x, this.player.y - 66);
        }
      } else if (this.playerPermavoidVisual) {
        this.playerPermavoidVisual.destroy(); this.playerPermavoidVisual = null;
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
    if (this.earthKit.getPlayerStunnedUntil() > time) {
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
            t.takeDamage(Math.round(t.toxicDps * t.statusDmgMult)); this.spawnHitFlash(t.x, t.y, 0x88bb22);
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

      // Bloat aura positions + expiry (F+ hold extends timer indefinitely)
      if (this.growthBloatActive) {
        if (this.hasUpgrade('f') && this.fKey.isDown) {
          this.growthBloatEnd = Math.max(this.growthBloatEnd, time + 5000);
        }
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
        // E+ hold-to-close: if menu open and E held >300ms, close and let auto-pick fire
        if (this.hasUpgrade('e') && this.growthMutateMenuOpen && this.eKey.isDown && time - this.eKey.timeDown > 300) {
          for (const obj of this.growthMutateButtons) {
            if ((obj as Phaser.GameObjects.GameObject).active) (obj as unknown as { destroy(): void }).destroy();
          }
          this.growthMutateButtons = [];
          this.growthMutateMenuOpen = false;
        }
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
                if (this.growthCancerousGrowths.length > 0) this.tryTriggerCancerousGrowthOn(t);
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
            if (this.growthCancerousGrowths.length > 0) this.tryTriggerCancerousGrowthOn(nearestEnemy);
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

        // Defensive spores: move, damage enemies, block NPC projectiles
        for (let dsi = this.growthDefSpores.length - 1; dsi >= 0; dsi--) {
          const ds = this.growthDefSpores[dsi];
          if (!ds.sprite.active || time > ds.destroyAt) {
            if (ds.sprite.active) ds.sprite.destroy();
            this.growthDefSpores.splice(dsi, 1);
            continue;
          }
          ds.sprite.x += ds.vel.x * (delta / 1000);
          ds.sprite.y += ds.vel.y * (delta / 1000);
          // Damage enemies on contact
          let sporeDead = false;
          for (const t of this.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(ds.sprite.x, ds.sprite.y, t.x, t.y) <= 20) {
              t.takeDamage(1);
              this.spawnHitFlash(t.x, t.y, 0xff3322);
              ds.sprite.destroy();
              this.growthDefSpores.splice(dsi, 1);
              sporeDead = true;
              break;
            }
          }
          if (sporeDead) continue;
          // Block NPC projectiles on contact
          for (const child of this.projectiles.getChildren()) {
            const p = child as Projectile;
            if (!p.active || p.isFromPlayer) continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, ds.sprite.x, ds.sprite.y) <= 12) {
              p.setActive(false).setVisible(false);
              (p.body as Phaser.Physics.Arcade.Body).stop();
              ds.sprite.destroy();
              this.growthDefSpores.splice(dsi, 1);
              break;
            }
          }
        }
        // Damage reduction timer expiry
        if (this.growthDamageReductionActive && time > this.growthDamageReductionUntil) {
          this.player.incomingDamageMultiplier /= 0.8;
          this.growthDamageReductionActive = false;
        }

        // Cancerous growths: follow enemy + check player projectile proximity (before physics step)
        for (let ci = this.growthCancerousGrowths.length - 1; ci >= 0; ci--) {
          const cg = this.growthCancerousGrowths[ci];
          if (!cg.target.active || cg.target.hp <= 0) {
            cg.img.destroy();
            this.growthCancerousGrowths.splice(ci, 1);
            continue;
          }
          cg.img.setPosition(cg.target.x + cg.offsetX, cg.target.y + cg.offsetY);
          // Check player projectiles — runs before physics step so this intercepts them first
          for (const child of this.projectiles.getChildren()) {
            const p = child as Projectile;
            if (!p.active || !p.isFromPlayer) continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, cg.img.x, cg.img.y) <= 12) {
              this.triggerCancerousGrowthAt(ci);
              p.setActive(false).setVisible(false);
              (p.body as Phaser.Physics.Arcade.Body).stop();
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
    this.crystalKit.update(time, delta, mouseX, mouseY);

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
      if (this.elementId === 'soul' && time < this.npcScaredUntil) {
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

    // ── Mutation effects per-frame ───────────────────────────────
    this.updateMutationEffects(time, delta);

    // ── Item effects per-frame ────────────────────────────────────
    this.itemsKit?.update(delta);

    // ── Tinker homing rockets ────────────────────────────────────
    if (this.mutations.has('tinker')) {
      for (const go of this.projectiles.getChildren() as Projectile[]) {
        if (!go.active || !(go as any)._isTinkerRocket) continue;
        const target: Fighter = (go as any)._homingTarget;
        if (!target || !target.active) continue;
        const pb = go.body as Phaser.Physics.Arcade.Body;
        const spd = Math.hypot(pb.velocity.x, pb.velocity.y) || 160;
        const dx = target.x - go.x;
        const dy = target.y - go.y;
        const len = Math.hypot(dx, dy) || 1;
        const turnRate = 2.5 * (delta / 1000);
        const curAngle = Math.atan2(pb.velocity.y, pb.velocity.x);
        const targetAngle = Math.atan2(dy, dx);
        const diff = Phaser.Math.Angle.Wrap(targetAngle - curAngle);
        const newAngle = curAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnRate);
        pb.setVelocity(Math.cos(newAngle) * spd, Math.sin(newAngle) * spd);
        void len;
      }
    }

    // ── Time per-frame ───────────────────────────────────────────
    if (this.elementId === 'sand' || this.npcElement.id === 'sand') {
      this.timeKit.update(time, delta);
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
          if (this.hasPerk(ms.owner, 'quake')) this.earthKit.spawnQuakeWave(ms.owner, ms.x, ms.y);
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
        if (this.hasPerk(this.gravLunarOwner, 'quake')) this.earthKit.spawnQuakeWave(this.gravLunarOwner, lsX, lsY);
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
                if (this.hasPerk('player', 'quake')) this.earthKit.spawnQuakeWave('player', rushSpr.x, rushSpr.y);
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
      this.metalKit.update(time, delta);
    }

    // ── Plasma per-frame ─────────────────────────────────────────
    if (this.elementId === 'plasma' || this.npcElement.id === 'plasma') {
      this.plasmaKit.update(time, delta);
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

    // Air Mastery tornado holds captured enemies by position, so it has to run after
    // NPC AI and husk movement have written their velocities for this frame.
    if (this.elementId === 'air') this.airKit.update(time, delta);

    // ── Wind Trap — player's trap constrains NPC ─────────────────
    if (time < this.playerWindTrapExpiry) {
      // R upgrade: trap drifts toward the cursor at a capped speed — it trails the
      // aim rather than snapping to it, so enemies can outrun the vortex.
      if (this.hasUpgrade('r')) {
        const ptr = this.input.activePointer;
        const step = TRACKING_VORTEX_SPEED * (delta / 1000);
        const dx = ptr.worldX - this.playerWindTrapX;
        const dy = ptr.worldY - this.playerWindTrapY;
        const d = Math.hypot(dx, dy);
        if (d > step) {
          this.playerWindTrapX += (dx / d) * step;
          this.playerWindTrapY += (dy / d) * step;
        } else {
          this.playerWindTrapX = ptr.worldX;
          this.playerWindTrapY = ptr.worldY;
        }
        if (this.playerWindTrapSprite) {
          this.playerWindTrapSprite.setPosition(this.playerWindTrapX, this.playerWindTrapY);
        }
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

    // ── Clamp all enemies to arena bounds ────────────────────────
    {
      const wb = this.physics.world.bounds;
      const allEnemies: Fighter[] = [this.npc];
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
    this.updateHawkDrag(delta);
    this.updateAutomatons(delta);

    // ── Update HUD cooldown bars ─────────────────────────────────
    this.updatePlayerHpBar();

    for (const entry of this.abilityBars) {
      if (entry.abilityId === 'heatwave') {
        entry.fill.setSize(entry.maxWidth * this.fireKit.getHeatwaveCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'siphon') {
        entry.fill.setSize(entry.maxWidth * this.waterKit.getSiphonCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'sweeping-tornado') {
        entry.fill.setSize(entry.maxWidth * this.airKit.getTornadoCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'turret') {
        entry.fill.setSize(entry.maxWidth * this.oilKit.getTurretCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'reap') {
        entry.fill.setSize(entry.maxWidth * this.lifeKit.getReapCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'dust-screen') {
        entry.fill.setSize(entry.maxWidth * this.earthKit.getDustScreenCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'flame-body') {
        entry.fill.setSize(this.fireKit.isFlameBodyActive() ? entry.maxWidth : 0, entry.fill.height);
      } else if (entry.abilityId === 'splash') {
        if (time < this.splashActiveUntil) {
          entry.fill.setSize(entry.maxWidth, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('splash'), entry.fill.height);
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
      } else if (entry.abilityId === 'time-remain' && this.timeKit.isRemainPurgeLocked()) {
        entry.fill.setFillStyle(0x555555, 0.6);
        entry.fill.setSize(entry.maxWidth, entry.fill.height);
        if (!entry.lockedIcon) {
          entry.lockedIcon = this.add.text(
            entry.fill.x, entry.fill.y, '🔒',
            { fontSize: '10px', fontFamily: 'Arial' },
          ).setOrigin(0.5).setDepth(entry.fill.depth + 1);
        }
        entry.lockedIcon.setPosition(entry.fill.x, entry.fill.y);
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

  private triggerCancerousGrowthAt(ci: number): void {
    const cg = this.growthCancerousGrowths[ci];
    if (!cg) return;
    const bx = cg.img.x; const by = cg.img.y;
    const boom = this.add.circle(bx, by, 6, 0xcc44ff, 0.8).setDepth(10);
    this.tweens.add({ targets: boom, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
    cg.target.takeDamage(10);
    this.spawnHitFlash(cg.target.x, cg.target.y, 0xcc44ff);
    if (cg.target === this.npc) this.npcCancerousSlowUntil = this.time.now + 2000;
    const ft = this.add.text(bx, by - 20, '💜 10', { fontSize: '10px', color: '#dd88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
    cg.img.destroy();
    this.growthCancerousGrowths.splice(ci, 1);
  }

  private tryTriggerCancerousGrowthOn(target: Fighter): void {
    const ci = this.growthCancerousGrowths.findIndex(cg => cg.target === target);
    if (ci >= 0) this.triggerCancerousGrowthAt(ci);
  }

  /**
   * Full on-hit pipeline for a player projectile striking an enemy — the 1v1
   * npc or an invasion husk. Blocks that only make sense against the real npc
   * (mutation gates, kit mechanics that internally target `arena.npc`) are
   * gated on `isNpc` and preserve their exact 1v1 behaviour; everything else
   * applies to whichever Fighter was actually hit.
   */
  private applyProjectileToEnemy(proj: Projectile, target: Fighter): void {
    const isNpc = target === this.npc;
    if (proj.isHeal) return; // heal projectiles don't damage the enemy
    // Amber: route damage to dinosaur mount first
    if (isNpc && this.mutations.has('amber') && this.amberDino && this.amberDino.hp > 0) {
      const dmg = proj.damage;
      this.amberDino.hp -= dmg;
      const ratio = Math.max(0, this.amberDino.hp / this.amberDino.maxHp);
      this.amberDino.hpBar.setSize(44 * ratio, 5);
      this.spawnHitFlash(proj.x, proj.y, 0x33cc55);
      this.spawnDamageNumber(proj.x, proj.y, dmg);
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      if (this.amberDino.hp <= 0) {
        this.amberDino.sprite.destroy();
        this.amberDino.hpBg.destroy();
        this.amberDino.hpBar.destroy();
        this.amberDino.hpLabel.destroy();
        this.amberDino = null;
        if (this.amberMountRing) { this.amberMountRing.destroy(); this.amberMountRing = null; }
        this.showFloatingText(this.npc.x, this.npc.y - 40, '🦖 DOWN!', '#33cc55');
      }
      return;
    }
    // Golf: enemy immune to all projectile damage — only the golf ball can hurt them
    if (isNpc && this.mutations.has('golf')) {
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      this.spawnHitFlash(proj.x, proj.y, 0xdddddd);
      return;
    }
    // Apprehension phase 2: invincible unless flashlit
    if (isNpc && this.mutations.has('apprehension') && this.apprehensionPhase2 && !this.apprehensionNpcLitByFlashlight) {
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      this.spawnHitFlash(proj.x, proj.y, 0x6644aa);
      this.showFloatingText(this.npc.x, this.npc.y - 30, '👁️ HIDDEN', '#aa66cc');
      return;
    }
    // Clot: enemy shielded until blood tree is destroyed
    if (isNpc && this.mutations.has('clot') && this.clotTree && this.clotTree.hitbox.hp > 0) {
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      this.spawnHitFlash(proj.x, proj.y, 0xaa0033);
      this.showFloatingText(this.npc.x, this.npc.y - 30, '🩸 SHIELDED', '#ff4477');
      return;
    }
    // Abyss: enemy invincible unless player is standing on an abyss trail
    if (isNpc && this.mutations.has('abyss') && this.time.now < this.abyssInvincibleUntil && !this.playerOnAbyssTrail()) {
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      this.spawnHitFlash(proj.x, proj.y, 0x4422aa);
      this.showFloatingText(this.npc.x, this.npc.y - 30, '🌑 IMMUNE', '#8866ff');
      return;
    }
    // Titanic: orbiting shield(s) physically block player projectiles
    if (isNpc && this.mutations.has('titanic')) {
      for (const sh of this.titanicShields) {
        if (Phaser.Math.Distance.Between(proj.x, proj.y, sh.sprite.x, sh.sprite.y) < 24) {
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          this.spawnHitFlash(sh.sprite.x, sh.sprite.y, 0x88aaff);
          this.showFloatingText(sh.sprite.x, sh.sprite.y - 16, '🛡️ BLOCKED', '#88aaff');
          return;
        }
      }
    }
    // Time lasso orb (player fires): route to TimeKit. The kit's lasso CC is
    // written around the 1v1 npc — against a husk the orb falls through to
    // the generic damage path instead.
    if (isNpc && proj.texture.key === 'proj-time-lasso-orb') {
      this.timeKit.onLassoHitNpc(proj);
      return;
    }
    // Silence possess eye / hook: delegate to kit (possession targets the npc;
    // against a husk these fall through to plain damage)
    if (isNpc && (proj.texture.key === 'proj-silence-eye' || proj.texture.key === 'proj-silence-hook')) {
      if (proj.texture.key === 'proj-silence-eye') this.silenceKit.onSilenceEyeHitEnemy(proj, 'player');
      else this.silenceKit.onSilenceHookHitEnemy(proj, 'player');
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      return;
    }
    // Fate dice: all damage handled in onDiceHitEnemy — skip generic damage path
    if (proj.texture.key === 'proj-fate-dice' && (proj as any).fateDiceOwner === 'player') {
      this.fateKit.onDiceHitEnemy(proj, proj.x, proj.y, 'player', target);
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      return;
    }
    // Pressure Dagger: pierce through all defenses and enemies; kit owns lifetime
    if (proj.texture.key === 'proj-pressure-dagger' && proj.isFromPlayer) {
      this.waterKit.onDaggerHitNpc(proj, target);
      return; // proj NOT deactivated — kit deactivates on out-of-bounds
    }
    // Diamond Shard (crystal kite) that rebounded off a moving mirror: pierces enemies
    if (proj.texture.key === 'proj-crystal-kite' && (proj as any).kitePierce) {
      this.crystalKit.onKiteHitEnemy(proj, target);
      return; // proj NOT deactivated — keeps flying through
    }
    // Fighter.dodgeChance roll (NPC side — e.g. Fate R+ Oozing Luck, Blustery mutation)
    if (target.rollDodge()) {
      this.spawnDamageNumber(target.x, target.y - 34, -1); // DODGED
      // Blustery★: each dodge grants permanent +5% speed bonus
      if (isNpc && this.mutations.has('blustery') && this.starredMutations.has('blustery')) {
        this.blusteryBonusSpeedMult += 0.05;
        this.showFloatingText(target.x, target.y - 28, '💨 +5% SPD', '#aaddff');
      }
      // Restore dodgeChance so the Blustery target chance isn't permanently consumed
      if (isNpc) target.dodgeChance = this.blusteryDodgeChanceTarget;
      proj.setActive(false).setVisible(false);
      (proj.body as Phaser.Physics.Arcade.Body).stop();
      return;
    }
    // Apply attacker's crit context before damage
    target.setIncomingCritContext(this.player.critChance, this.player.critMult);
    let _npcDmg = Math.round(proj.damage * this.player.cardOutgoingDamageMult);
    // Q+: Shatter Strike — next hit on frozen enemy deals 25% more
    if (target.frozenSolidAmpReady && target.frozenUntil > this.time.now) {
      _npcDmg = Math.round(_npcDmg * 1.25);
      target.frozenSolidAmpReady = false;
      const st = this.add.text(target.x, target.y - 30, 'SHATTER!', { fontSize: '11px', color: '#88ccff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: st, y: st.y - 20, alpha: 0, duration: 1200, onComplete: () => st.destroy() });
    }
    // Chaos: damage reduced the closer the player is to the enemy
    if (isNpc && this.mutations.has('chaos')) {
      const dist = Phaser.Math.Distance.Between(target.x, target.y, this.player.x, this.player.y);
      const t = Math.min(dist / 280, 1);
      const minMult = this.starredMutations.has('chaos') ? 0.15 : 0.25;
      _npcDmg = Math.max(1, Math.round(_npcDmg * (minMult + (1 - minMult) * t)));
    }
    // Water: apply dehydration + boiling damage multiplier
    if (this.elementId === 'water') {
      _npcDmg = Math.round(_npcDmg * this.waterKit.computeOutgoingMultiplier(target, 'player'));
    }
    target.takeDamage(_npcDmg);
    if (this.elementId === 'water') this.waterKit.noteDamageDealtByPlayer(_npcDmg);
    if (this.elementId === 'life') this.lifeKit.onPlayerProjectileHit(proj, target, _npcDmg);
    this.spawnHitFlash(proj.x, proj.y, 0xff6600);
    // Hunt Blood Pact: heal player for 50% of damage dealt
    if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(_npcDmg * 0.5));
    // Hunt Blood Moon F+: 50% lifesteal from all damage dealt to bleeding enemy
    if (this.huntBloodMoonActive && this.hasUpgrade('f') && target.bleeding) this.player.heal(Math.ceil(_npcDmg * 0.5));
    // Hunt silver bullets (hybrid): apply bleed and Click+ bonus damage
    if (proj.texture.key === 'proj-hunt-silver' || this.huntSilverPellets.has(proj)) {
      if (this.hasUpgrade('click') && target.bleeding) {
        target.takeDamage(Math.round(proj.damage * 0.5));
      }
      target.bleeding = true;
      target.bleedingUntil = Math.max(target.bleedingUntil, this.time.now + Math.round(8000 * target.statusDurMult));
      this.applyBleedVisualTo(target);
    }
    // Hunt shrapnel (hybrid F+ shriek): apply bleed
    if (this.huntShrapnelSet.has(proj)) {
      target.bleeding = true;
      target.bleedingUntil = Math.max(target.bleedingUntil, this.time.now + Math.round(8000 * target.statusDurMult));
      this.applyBleedVisualTo(target);
    }
    // Flameshredder: fireball hit also applies burning DOT
    if (proj.texture.key === 'proj-fire' && this.hasUpgrade('click')) {
      target.burningUntil = Math.max(target.burningUntil, this.time.now + Math.round(3000 * target.statusDurMult));
    }
    // Water-cut hit: apply dehydration (Click+ upgrade)
    if (proj.texture.key === 'proj-water' && proj.isFromPlayer && this.elementId === 'water') {
      this.waterKit.onWaterCutHit(target, 'player');
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
      if (target.frozenUntil > this.time.now) {
        target.frozenUntil = 0;
        for (let fi = 0; fi < 3; fi++) this.addFrostStackTo(target);
      } else {
        this.addFrostStackTo(target);
        if (proj.isPowered) this.addFrostStackTo(target);
      }
    }
    // Growth infect dagger: apply toxic DOT (R+ 15% bonus to all attacks handled via 'damaged' listener)
    if (proj.texture.key === 'proj-growth-dagger') {
      target.toxicUntil = this.time.now + 10000 + this.growthLingerBonus;
      target.toxicDps = 2 + this.growthViralBonus;
      target.toxicTickAccum = 0;
    }
    // NPC bloat: NPC hit triggers AOE on player (only the 1v1 npc ever bloats)
    if (target.growthBloatActive) {
      target.growthBloatActive = false;
      target.growthBloatEnd = 0;
      if (target.growthBloatAura) { target.growthBloatAura.destroy(); target.growthBloatAura = null; }
      const bloatDmg = Math.round(20 * this.npcGrowthDamageMult);
      if (Phaser.Math.Distance.Between(target.x, target.y, this.player.x, this.player.y) <= 120) {
        this.player.takeDamage(bloatDmg);
        this.spawnHitFlash(this.player.x, this.player.y, 0xdddd00);
      }
      const bloatExp = this.add.circle(target.x, target.y, 120, 0xdddd00, 0.3).setDepth(8);
      this.tweens.add({ targets: bloatExp, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 350, onComplete: () => bloatExp.destroy() });
    }
    // Fate coin toss: give player +1 coin on hit
    if (proj.texture.key === 'proj-fate-coin' && (proj as any).fateCoinOwner === 'player') {
      this.fateKit.onCoinHitEnemy('player');
    }
    // Light Fallen Angel dagger: apply disarm on hit
    if ((proj as any).isFallenAngelDagger && this.elementId === 'light') {
      this.lightKit.onFallenAngelDaggerHit(target, this.time.now);
    }
    // Magic (player) thorn vine hit
    if ((proj as any).isMagicThornVine && (proj as any).thornVineOwner === 'player') {
      this.magicKit.onThornVineHit(target, 'player');
    }
    // Magic (player) thorn prison hit
    if ((proj as any).isMagicThornPrison && (proj as any).thornPrisonOwner === 'player') {
      this.magicKit.onThornPrisonHit(target.x, target.y, 'player');
    }
    // R+ Powerful Parry: fire DOT on NPC from rubber-reflected projectile
    // (kit-internal to the npc; reflected projectiles only exist in 1v1)
    const rubberParryFireDot = (proj as any).rubberParryFireDot as number | undefined;
    if (isNpc && rubberParryFireDot && this.elementId === 'rubber') {
      this.rubberKit.applyNpcFireDot(rubberParryFireDot);
    }
    // Demon perk dagger: pierce up to 2 additional enemies before being destroyed
    if (typeof (proj as any).demonPierceLeft === 'number' && (proj as any).demonPierceLeft > 0) {
      (proj as any).demonPierceLeft--;
      return;
    }
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

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
  }

  /** Same AoE as damagePlayerTargets, but reports how many targets it hit and killed. */
  private damagePlayerTargetsCounted(
    cx: number, cy: number, radius: number, damage: number, color: number,
  ): { hits: number; kills: number } {
    let hits = 0;
    let kills = 0;
    for (const t of this.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) > radius) continue;
      t.takeDamage(damage);
      this.spawnHitFlash(t.x, t.y, color);
      hits++;
      if (t.hp <= 0) kills++;
    }
    return { hits, kills };
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