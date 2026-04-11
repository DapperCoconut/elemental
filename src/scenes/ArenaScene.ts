import Phaser from 'phaser';
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
  hp: number;
  maxHp: number;
  orbitAngle: number;
  shielded: boolean;
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
  owner: 'player' | 'npc';
}

interface CrystalNode {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  owner: 'player' | 'npc';
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
  offsetX: number;
  offsetY: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
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
  type: 'basic' | 'ghoul' | 'banshee' | 'knight';
  owner: 'player' | 'npc';
  lastContactTick: number;
  ghoulShootAccum: number;
  dx: number;
  dy: number;
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
}

interface HuntTrailCircle {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  expiresAt: number;
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
};

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private npc!: NpcOpponent;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private playerElement!: Element;
  private npcElement!: Element;
  private elementId = 'fire';
  private npcDifficulty!: DifficultyConfig;

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
  private playerOverdriveActive = false;
  private playerOverdriveEnd = 0;
  private playerOverdriveAngle = 0;
  private playerOverdriveTickAccum = 0;
  private playerOverdriveGraphics: Phaser.GameObjects.Graphics | null = null;
  // NPC oil state
  private npcDrones: Drone[] = [];

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

  // Growth — player
  private growthMorphType: 'spores' | 'claws' | 'virus' = 'spores';
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

  // Sand — player
  private sandHeat = 0;
  private sandHeatDepletionAccum = 0;
  private sandFireAccum = 0;
  private sandTornadoActive = false;
  private sandTornadoAura: Phaser.GameObjects.Arc | null = null;
  private sandGlassForm = false;
  private sandGlassShardAccum = 0;
  private sandDecoy: { sprite: Phaser.GameObjects.Arc; hp: number; x: number; y: number } | null = null;
  private sandHeatText: Phaser.GameObjects.Text | null = null;
  private sandBlindedUntil = 0;
  // Sand — NPC
  private npcSandHeat = 0;
  private npcSandHeatDepletionAccum = 0;
  private npcSandFireAccum = 0;
  private npcSandTornadoActive = false;
  private npcSandTornadoAura: Phaser.GameObjects.Arc | null = null;
  private npcSandGlassForm = false;
  private npcSandGlassShardAccum = 0;
  private npcSandDecoy: { sprite: Phaser.GameObjects.Arc; hp: number; x: number; y: number } | null = null;
  private npcSandBlindedUntil = 0;

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

  // Shared world effects (owner-aware)
  private puddles: Puddle[] = [];
  private geysers: Geyser[] = [];
  private painRainShadows: PainRainShadow[] = [];

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(data: { elementId: string; enemyElementId?: string; difficulty?: number; mutations?: string[] }): void {
    this.elementId = data.elementId ?? 'fire';
    const enemyElementId = data.enemyElementId ?? (this.elementId === 'fire' ? 'water' : 'fire');
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
    this.playerOverdriveActive = false;
    this.playerOverdriveEnd = 0;
    this.playerOverdriveAngle = 0;
    this.playerOverdriveTickAccum = 0;
    this.playerOverdriveGraphics = null;
    this.npcDrones = [];

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

    for (const n of this.crystalNodes) n.sprite.destroy();
    for (const p of this.crystalPortals) { p.sprite.destroy(); p.label.destroy(); }
    for (const c of this.crystalClones) { c.sprite.destroy(); c.hpBar.destroy(); c.hpBg.destroy(); }
    this.crystalNodes = []; this.crystalPortals = []; this.crystalClones = [];
    this.crystalTrickEnd = 0; this.crystalBarrageActive = false;
    this.crystalPortalCooldown = 0;

    for (const n of this.npcCrystalNodes) n.sprite.destroy();
    for (const p of this.npcCrystalPortals) { p.sprite.destroy(); p.label.destroy(); }
    for (const c of this.npcCrystalClones) { c.sprite.destroy(); c.hpBar.destroy(); c.hpBg.destroy(); }
    this.npcCrystalNodes = []; this.npcCrystalPortals = []; this.npcCrystalClones = [];
    this.npcCrystalTrickEnd = 0; this.npcCrystalBarrageActive = false;
    this.npcCrystalPortalCooldown = 0;

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
    if (this.npc) { this.npc.npcHuntRoarLocked = false; }

    this.sandHeat = 0; this.sandHeatDepletionAccum = 0; this.sandFireAccum = 0;
    this.sandTornadoActive = false; this.sandGlassForm = false; this.sandGlassShardAccum = 0;
    this.sandBlindedUntil = 0;
    if (this.sandTornadoAura) { this.sandTornadoAura.destroy(); this.sandTornadoAura = null; }
    if (this.sandDecoy) { this.sandDecoy.sprite.destroy(); this.sandDecoy = null; }
    this.sandHeatText = null;
    this.npcSandHeat = 0; this.npcSandHeatDepletionAccum = 0; this.npcSandFireAccum = 0;
    this.npcSandTornadoActive = false; this.npcSandGlassForm = false; this.npcSandGlassShardAccum = 0;
    this.npcSandBlindedUntil = 0;
    if (this.npcSandTornadoAura) { this.npcSandTornadoAura.destroy(); this.npcSandTornadoAura = null; }
    if (this.npcSandDecoy) { this.npcSandDecoy.sprite.destroy(); this.npcSandDecoy = null; }

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
    this.npc = new NpcOpponent(this, W - 180, cy, this.npcElement, npcTexture, difficultyConfig);

    // ── Apply mutations ──────────────────────────────────────────────
    this.mutations = new Set(data.mutations ?? []);
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

    // ── Overlap callbacks ─────────────────────────────────────────
    this.physics.add.overlap(
      this.projectiles,
      this.npc,
      (a, b) => {
        const proj = (a instanceof Projectile ? a : b) as Projectile;
        if (!proj.active || !proj.isFromPlayer) return;
        // Sand blinding ball: blind NPC, no damage
        if (proj.texture.key === 'proj-sand-ball') {
          this.npcSandBlindedUntil = Math.max(this.npcSandBlindedUntil, this.time.now + 5000);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // NPC sand heat: take more damage at high heat
        let _npcDmg = proj.damage;
        if (this.npcElement.id === 'sand') {
          if (this.npcSandHeat >= 80) _npcDmg = Math.round(_npcDmg * 1.35);
          else if (this.npcSandHeat >= 60) _npcDmg = Math.round(_npcDmg * 1.20);
        }
        this.npc.takeDamage(_npcDmg);
        this.spawnHitFlash(proj.x, proj.y, 0xff6600);
        // Hunt Blood Pact: heal player for 50% of damage dealt
        if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(_npcDmg * 0.5));
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
        // Ice spike: frost stacks + unfreeze bonus
        if (proj.texture.key === 'proj-ice') {
          if (this.npcFrozenUntil > this.time.now) {
            this.npcFrozenUntil = 0;
            for (let fi = 0; fi < 3; fi++) this.addFrostStack('npc');
          } else {
            this.addFrostStack('npc');
          }
        }
        // Growth infect dagger: apply toxic DOT to NPC
        if (proj.texture.key === 'proj-growth-dagger') {
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
        // Sand blinding ball (NPC fires): blind player, no damage
        if (proj.texture.key === 'proj-sand-ball') {
          this.sandBlindedUntil = Math.max(this.sandBlindedUntil, this.time.now + 5000);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Sand tornado evasion (50% dodge while active)
        if (this.elementId === 'sand' && this.sandTornadoActive && Math.random() < 0.5) {
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
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
        // Sand heat: player takes more damage at high heat
        let _playerDmg = proj.damage;
        if (this.elementId === 'sand') {
          if (this.sandHeat >= 80) _playerDmg = Math.round(_playerDmg * 1.35);
          else if (this.sandHeat >= 60) _playerDmg = Math.round(_playerDmg * 1.20);
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
        // Player bloat: player hit triggers AOE on NPC
        if (this.growthBloatActive) {
          this.growthBloatActive = false;
          this.growthBloatEnd = 0;
          if (this.growthBloatAura) { this.growthBloatAura.destroy(); this.growthBloatAura = null; }
          const bloatDmg = Math.round(20 * this.growthDamageMult);
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 120) {
            this.npc.takeDamage(bloatDmg);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xdddd00);
          }
          const bloatExp = this.add.circle(this.player.x, this.player.y, 120, 0xdddd00, 0.3).setDepth(8);
          this.tweens.add({ targets: bloatExp, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 350, onComplete: () => bloatExp.destroy() });
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

    // ── Defeat + damage events ────────────────────────────────────
    this.player.once('defeated', () => this.endGame(false));

    const registerNpcDefeat = () => {
      this.npc.once('defeated', () => {
        if (this.mutations.has('rebirth') && !this.npcRebirthUsed) {
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

    // ── HUD ────────────────────────────────────────────────────────
    this.createHUD(W, H);

    // ── Arena labels ───────────────────────────────────────────────
    this.add.text(180, 20, `${this.playerElement.emoji} YOU`, {
      fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(20);
    this.add.text(W - 180, 20, `ENEMY ${this.npcElement.emoji}`, {
      fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(20);

    if (this.elementId === 'soul') {
      this.soulGhostText = this.add.text(cx, 52, '👻 0', {
        fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#ccaaff',
        stroke: '#220044', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }
    if (this.elementId === 'sand') {
      this.sandHeatText = this.add.text(cx, 52, '🌡️ 0', {
        fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#ffdd99',
        stroke: '#553300', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }
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
      'hunt-slash':       0xff2200,
      'hunt-leap':        0xdd4400,
      'hunt-blood-hunt':  0xbb0011,
      'hunt-blood-moon':  0x880000,
      'hunt-untransform': 0x664422,
      'sand-flintlock':   0xddbb77,
      'sand-blinding':    0xffcc66,
      'sand-tornado':     0xeedd88,
      'sand-mirage':      0xffaa44,
      'sand-glass':       0x88eeff,
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
      const beastAbilities = this.playerElement.abilities.slice(5);
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
    }

    this.add.text(W - 50, hudY, '[SPC]\nDodge', {
      fontSize: '11px',
      color: '#888888',
      align: 'center',
    }).setOrigin(0.5).setDepth(23);
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
        const angle = (this.playerDrones.length / 6) * Math.PI * 2;
        const sprite = this.add.circle(
          this.player.x + Math.cos(angle) * 60,
          this.player.y + Math.sin(angle) * 60,
          8, 0xffaa00, 0.9,
        ).setDepth(8);
        this.playerDrones.push({ sprite, hp: 15, maxHp: 15, orbitAngle: angle, shielded: false, owner: 'player' });
      },
      commandDrones: (x, y) => {
        for (const drone of this.playerDrones) {
          const laser = this.add.graphics().setDepth(8);
          laser.lineStyle(2, 0xffaa00, 0.8);
          laser.lineBetween(drone.sprite.x, drone.sprite.y, x, y);
          this.tweens.add({ targets: laser, alpha: 0, duration: 220, onComplete: () => laser.destroy() });
          if (Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) <= 40) {
            this.npc.takeDamage(3);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xffaa00);
          }
        }
      },
      launchDrone: (x, y) => {
        if (this.playerDrones.length === 0) return;
        const drone = this.playerDrones.pop()!;
        const dmg = Math.max(1, drone.hp);
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
          },
        });
      },
      placeFirewall: (x, y) => {
        if (this.playerFirewallSprite) this.playerFirewallSprite.destroy();
        this.playerFirewallSprite = this.add.rectangle(x, y, 120, 60, 0xff6600, 0.45)
          .setStrokeStyle(2, 0xff8800).setDepth(3);
        this.playerFirewallHp = 100;
        this.playerFirewallX = x;
        this.playerFirewallY = y;
      },
      startOverdrive: (x, y) => {
        if (this.playerDrones.length === 0) return;
        const angle = Math.atan2(y - this.player.y, x - this.player.x);
        const duration = 2000 * this.playerDrones.length;
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
              this.npc.takeDamage(25);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x8800cc);
            }
            this.spawnShadowDarkCloud(x, y, 'player');
          },
        });
      },
      activateTentacle: (x, y) => {
        // Close-range hook: only hooks if NPC is within 220px
        const hookDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        this.shadowTentacleActive = true;
        this.shadowTentacleHooked = hookDist <= 110;
        this.shadowTentacleEnd = this.time.now + (this.shadowTentacleHooked ? 3000 : 600);
        // Tentacle endpoint: toward cursor but clamped to 200px range
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
        const spr = this.add.circle(this.player.x, this.player.y, 18, 0x440066, 0.85)
          .setStrokeStyle(2, 0xcc44ff).setDepth(3);
        const lbl = this.add.text(this.player.x, this.player.y, '⚡', { fontSize: '10px' }).setOrigin(0.5).setDepth(4);
        this.shadowSnapTraps.push({
          sprite: spr, label: lbl,
          expiresAt: this.time.now + 12000,
          x: this.player.x, y: this.player.y,
          triggered: false, owner: 'player',
        });
      },
      activateShadowDance: () => {
        if (this.shadowDanceCharge < 35) return;
        this.shadowDanceCharge = 0;
        this.player.heal(25);
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
        const proj = new Projectile(this, this.player.x, this.player.y, 'proj-ice', 8, true);
        this.projectiles.add(proj);
        proj.launch((dx / len) * 520, (dy / len) * 520);
      },
      fireFrostBlast: (tx, ty) => {
        if (this.npcFrostStacks === 0) return;
        const dx = tx - this.player.x;
        const dy = ty - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy / len, dx / len);
        const endX = this.player.x + Math.cos(angle) * 1200;
        const endY = this.player.y + Math.sin(angle) * 1200;
        this.spawnFrostBeamVisual(this.player.x, this.player.y, endX, endY);
        const d = this.pointToSegmentDist(this.npc.x, this.npc.y, this.player.x, this.player.y, endX, endY);
        if (d <= 32) {
          this.npc.takeDamage(this.npcFrostStacks * 10);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0x88ccff);
          this.clearFrostStacks('npc');
        }
      },
      toggleBlockUp: () => {
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
        playerBody.setVelocity(dx * 500, dy * 500);
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
          }
        }
      },
      // Growth
      fireGrowthClick: (tx, ty) => {
        const angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        if (this.growthMorphType === 'spores') {
          const angles = [-12, -6, 0, 6, 12];
          for (const deg of angles) {
            const a = angle + deg * (Math.PI / 180);
            const proj = new Projectile(this, this.player.x, this.player.y, 'proj-growth', Math.round(3 * this.growthDamageMult), true);
            this.projectiles.add(proj);
            const vx = Math.cos(a) * 400;
            const vy = Math.sin(a) * 400;
            proj.launch(vx, vy);
            const pb = proj.body as Phaser.Physics.Arcade.Body;
            this.tweens.add({ targets: pb.velocity, x: 0, y: 0, duration: 600,
              onComplete: () => { this.time.delayedCall(200, () => { if (proj.active) { proj.setActive(false).setVisible(false); } }); } });
          }
        } else if (this.growthMorphType === 'claws') {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (dist <= 120) {
            const ptr = this.input.activePointer;
            const dx = ptr.worldX - this.player.x; const dy = ptr.worldY - this.player.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const toNx = this.npc.x - this.player.x; const toNy = this.npc.y - this.player.y;
            const dot = (dx / len) * (toNx / dist) + (dy / len) * (toNy / dist);
            if (dot > 0.4) {
              this.npc.takeDamage(Math.round(15 * this.growthDamageMult));
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x88bb22);
            }
          }
          const slashAngle = Math.atan2(ty - this.player.y, tx - this.player.x);
          const slash = this.add.rectangle(
            this.player.x + Math.cos(slashAngle) * 50, this.player.y + Math.sin(slashAngle) * 50,
            50, 10, 0x88bb22, 0.8,
          ).setRotation(slashAngle).setDepth(6);
          this.tweens.add({ targets: slash, scaleX: 0.3, alpha: 0, duration: 140, onComplete: () => slash.destroy() });
        } else {
          // virus: 3 projectiles like life petal shot
          const spreadAngles = [-15, 0, 15];
          for (const deg of spreadAngles) {
            const a = angle + deg * (Math.PI / 180);
            const proj = new Projectile(this, this.player.x, this.player.y, 'proj-growth', Math.round(8 * this.growthDamageMult), true);
            this.projectiles.add(proj);
            proj.launch(Math.cos(a) * 480, Math.sin(a) * 480);
          }
        }
      },
      openMutateMenu: () => {
        if (this.growthMutateMenuOpen) return;
        this.growthMutateMenuOpen = true;
        const GROWTH_MUTATIONS = [
          { id: 'healthier', name: 'Healthier', description: '+10 max HP', emoji: '💚' },
          { id: 'deadly', name: 'Deadly', description: '+15% damage', emoji: '💀' },
          { id: 'linger', name: 'Linger', description: '+3s toxic duration', emoji: '⏳' },
          { id: 'viral', name: 'Viral', description: '+2 toxic DPS', emoji: '🧬' },
          { id: 'grow', name: 'Grow', description: '+20 HP, +20% size', emoji: '📈' },
          { id: 'shrink', name: 'Shrink', description: '-20 HP, -20% size', emoji: '📉' },
          { id: 'buffer', name: 'Buffer', description: '-2s bloat CD', emoji: '🛡️' },
          { id: 'spray', name: 'Spray', description: '+1 infect projectile', emoji: '🗡️' },
          { id: 'quick', name: 'Quick', description: '-1s infect CD', emoji: '⚡' },
          { id: 'regenerative', name: 'Regenerative', description: '+1 HP/s regen', emoji: '♻️' },
        ];
        const pool = [...GROWTH_MUTATIONS];
        const picks: typeof pool = [];
        for (let p = 0; p < 3; p++) {
          picks.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        const W = this.scale.width;
        const H = this.scale.height;
        const btnW = 200; const btnH = 60; const gap = 12;
        const startY = H / 2 - (btnH + gap);
        for (let p = 0; p < 3; p++) {
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
              if ((obj as Phaser.GameObjects.GameObject).active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
            }
            this.growthMutateButtons = [];
            this.growthMutateMenuOpen = false;
          });
          this.growthMutateButtons.push(bg, lbl, desc);
        }
      },
      fireInfect: (tx, ty) => {
        if (this.time.now - this.lastPlayerInfectCast < this.growthInfectCdMs) return;
        this.lastPlayerInfectCast = this.time.now;
        const baseAngle = Math.atan2(ty - this.player.y, tx - this.player.x);
        const count = 1 + this.growthInfectExtraProj;
        for (let i = 0; i < count; i++) {
          const spread = count > 1 ? (i - (count - 1) / 2) * 8 * (Math.PI / 180) : 0;
          const a = baseAngle + spread;
          const proj = new Projectile(this, this.player.x, this.player.y, 'proj-growth-dagger', Math.round(5 * this.growthDamageMult), true);
          this.projectiles.add(proj);
          proj.launch(Math.cos(a) * 520, Math.sin(a) * 520);
        }
      },
      activateBloat: () => {
        if (this.time.now - this.lastPlayerBloatCast < this.growthBloatCdMs) return;
        this.lastPlayerBloatCast = this.time.now;
        this.growthBloatActive = true;
        this.growthBloatEnd = this.time.now + 5000;
        if (this.growthBloatAura) this.growthBloatAura.destroy();
        this.growthBloatAura = this.add.circle(this.player.x, this.player.y, 30, 0xdddd00, 0.3)
          .setStrokeStyle(2, 0xffff44, 0.8).setDepth(5);
        this.tweens.add({ targets: this.growthBloatAura, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
      },
      triggerMutantMorph: () => {
        const morphTypes: Array<'spores' | 'claws' | 'virus'> = ['spores', 'claws', 'virus'];
        this.growthMorphType = morphTypes[Math.floor(Math.random() * morphTypes.length)];
        const morphNames = { spores: 'SPORES', claws: 'CLAWS', virus: 'VIRUS' };
        const txt = this.add.text(this.player.x, this.player.y - 50, morphNames[this.growthMorphType],
          { fontSize: '14px', fontFamily: '"Arial Black"', color: '#88bb22', stroke: '#003300', strokeThickness: 3 }).setOrigin(0.5).setDepth(15);
        this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
      },
      // Crystal
      fireCrystalLaser: (tx, ty) => {
        this.fireCrystalLaserFrom(this.player.x, this.player.y, tx, ty, 8, true);
        for (const cl of this.crystalClones) {
          this.fireCrystalLaserFrom(this.player.x + cl.offsetX, this.player.y + cl.offsetY, tx, ty, 8, true);
        }
      },
      placeCrystalNode: (tx, ty) => {
        const playerNodes = this.crystalNodes.filter((n) => n.owner === 'player');
        if (playerNodes.length >= 3) {
          playerNodes[0].sprite.destroy();
          this.crystalNodes.splice(this.crystalNodes.indexOf(playerNodes[0]), 1);
        }
        const spr = this.add.circle(tx, ty, 14, 0x44aaff, 0.75)
          .setStrokeStyle(2, 0xaaeeff, 0.9).setDepth(4);
        this.tweens.add({ targets: spr, scaleX: 1.4, scaleY: 1.4, duration: 120, yoyo: true });
        this.crystalNodes.push({ sprite: spr, x: tx, y: ty, owner: 'player' });
      },
      startCrystalBarrage: (tx, ty) => {
        this.crystalBarrageActive = true;
        this.crystalBarrageEnd = this.time.now + 3000;
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
        for (const cl of this.crystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); }
        this.crystalClones = [];
        this.crystalTrickEnd = this.time.now + 12000;
        for (const off of [{ x: -58, y: 12 }, { x: 58, y: 12 }]) {
          const cx = this.player.x + off.x, cy = this.player.y + off.y;
          const hpBg = this.add.rectangle(cx, cy - 28, 30, 4, 0x333333).setDepth(12);
          const hpBar = this.add.rectangle(cx - 15, cy - 28, 30, 4, 0x44aaff).setDepth(13).setOrigin(0, 0.5);
          const spr = this.add.circle(cx, cy, 16, 0x88ccff, 0.85)
            .setStrokeStyle(2, 0xaaeeff).setDepth(11);
          this.crystalClones.push({ sprite: spr, hp: 50, maxHp: 50, offsetX: off.x, offsetY: off.y, hpBar, hpBg });
        }
      },
      // Soul
      fireSoulOrb: (tx, ty) => {
        if (this.time.now - this.lastPlayerSoulOrbCast < 800) return;
        this.lastPlayerSoulOrbCast = this.time.now;
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 104;
        const ox = this.player.x + (dx / dist) * 32;
        const oy = this.player.y + (dy / dist) * 32;
        const spr = this.add.circle(ox, oy, 12, 0xccaaff, 0.7)
          .setStrokeStyle(2, 0xeeddff, 0.9).setDepth(7);
        this.tweens.add({ targets: spr, alpha: 0.4, yoyo: true, repeat: -1, duration: 400 });
        this.playerSoulOrbs.push({ sprite: spr, expiresAt: this.time.now + 3000, x: ox, y: oy, vx: (dx / dist) * speed, vy: (dy / dist) * speed, owner: 'player', lastContactTick: -99999 });
      },
      summonGhost: (ghostType) => {
        const cost = ghostType === 'basic' ? 1 : ghostType === 'ghoul' ? 2 : ghostType === 'banshee' ? 3 : 5;
        if (this.soulGhosts < cost) return;
        if (this.time.now - this.lastPlayerSummon < 2000) return;
        this.lastPlayerSummon = this.time.now;
        this.soulGhosts -= cost;
        if (this.soulGhostText) this.soulGhostText.setText(`👻 ${this.soulGhosts}`);
        this.spawnSoulGhost(ghostType, this.player.x, this.player.y, 'player');
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
        for (let i = this.playerSoulSummons.length - 1; i >= 0; i--) {
          const gs = this.playerSoulSummons[i];
          if (Phaser.Math.Distance.Between(gs.sprite.x, gs.sprite.y, this.player.x, this.player.y) <= consumeR) {
            this.player.heal(Math.floor(gs.hp / 2));
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
        const maxDist = 145;
        const ox = this.player.x, oy = this.player.y;
        const spr = this.add.circle(ox, oy, 10, 0xff6600, 0.9).setStrokeStyle(2, 0xffaa00, 1).setDepth(8);
        this.huntGrenades.push({
          sprite: spr, x: ox, y: oy, startX: ox, startY: oy,
          vx: (dx / dist) * speed, vy: (dy / dist) * speed,
          explodeAt: this.time.now + (3000 - holdMs),
          selfDamage: false, owner: 'player', stopped: false,
        });
      },
      huntHuntersTrail: () => {
        this.huntTrailActive = true;
        this.huntTrailEnd = this.time.now + 3000;
        this.huntTrailAccum = 0;
        const flash = this.add.circle(this.player.x, this.player.y, 24, 0xcc3300, 0.5).setDepth(6);
        this.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      },
      huntBloodPact: () => {
        this.huntBloodPactActive = true;
        this.huntBloodPactEnd = this.time.now + 5000;
        if (this.huntBloodPactAura) this.huntBloodPactAura.destroy();
        this.huntBloodPactAura = this.add.circle(this.player.x, this.player.y, 28, 0xaa0022, 0.35).setDepth(4);
        this.tweens.add({ targets: this.huntBloodPactAura, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
      },
      huntTransform: () => {
        this.huntBeastForm = true;
        this.player.setScale(1.2);
        (this.player.body as Phaser.Physics.Arcade.Body).setCircle(26, 3, 3);
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
          const slashDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (slashDist <= 85) {
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xff2200);
            if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(10);
            // Apply bleeding
            this.npcBleeding = true;
            this.npcBleedingUntil = this.time.now + 8000;
            if (!this.npcBleedAura) {
              this.npcBleedAura = this.add.circle(this.npc.x, this.npc.y, 22, 0xcc0000, 0.25).setDepth(3);
              this.tweens.add({ targets: this.npcBleedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 700 });
            }
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
        // Teleport to just beside NPC
        const angle = Math.random() * Math.PI * 2;
        this.player.setPosition(this.npc.x + Math.cos(angle) * 60, this.npc.y + Math.sin(angle) * 60);
        // Lock player 1s (roar)
        this.nukeChanneling = true;
        this.nukeChannelEnd = this.time.now + 1000;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        // Apply slow to NPC
        this.npcHuntSlowUntil = this.time.now + 3000;
        // Roar visual
        const roar = this.add.circle(this.player.x, this.player.y, 18, 0xff0000, 0.8).setDepth(9);
        this.tweens.add({ targets: roar, scaleX: 4, scaleY: 4, alpha: 0, duration: 800, onComplete: () => roar.destroy() });
        const roar2 = this.add.circle(this.player.x, this.player.y, 10, 0xffffff, 1).setDepth(10);
        this.tweens.add({ targets: roar2, scaleX: 3, scaleY: 3, alpha: 0, duration: 500, onComplete: () => roar2.destroy() });
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
        this.huntBeastForm = false;
        this.player.setScale(1.0);
        (this.player.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
        this.huntToggleBeastHud(false);
        this.player.triggerCooldown('hunt-transform');
        const burst = this.add.circle(this.player.x, this.player.y, 20, 0x664422, 0.7).setDepth(8);
        this.tweens.add({ targets: burst, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
      },
      // Sand
      sandFlintlock: (tx, ty) => {
        const px = this.player.x, py = this.player.y;
        const dx = tx - px, dy = ty - py;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const line = new Phaser.Geom.Line(px, py, px + (dx / len) * 650, py + (dy / len) * 650);
        const npcCircle = new Phaser.Geom.Circle(this.npc.x, this.npc.y, 22);
        if (Phaser.Geom.Intersects.LineToCircle(line, npcCircle)) {
          let dmg = 12;
          if (this.npcElement.id === 'sand') {
            if (this.npcSandHeat >= 80) dmg = Math.round(dmg * 1.35);
            else if (this.npcSandHeat >= 60) dmg = Math.round(dmg * 1.20);
          }
          this.npc.takeDamage(dmg);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xffdd99);
          if (this.huntBloodPactActive && this.time.now < this.huntBloodPactEnd) this.player.heal(Math.ceil(dmg * 0.5));
        }
        const flash = this.add.line(0, 0, px, py, px + (dx / len) * 500, py + (dy / len) * 500, 0xffeecc, 0.9)
          .setLineWidth(2).setDepth(12);
        this.tweens.add({ targets: flash, alpha: 0, duration: 120, onComplete: () => flash.destroy() });
      },
      sandBlindingSand: (tx, ty) => {
        const baseAngle = Math.atan2(ty - this.player.y, tx - this.player.x);
        for (const deg of [-20, 0, 20]) {
          const rad = baseAngle + deg * Math.PI / 180;
          const proj = new Projectile(this, this.player.x, this.player.y, 'proj-sand-ball', 0, true);
          this.projectiles.add(proj);
          proj.launch(Math.cos(rad) * 320, Math.sin(rad) * 320);
          this.time.delayedCall(375, () => { if (proj.active) { proj.setActive(false).setVisible(false); (proj.body as Phaser.Physics.Arcade.Body).stop(); } });
        }
      },
      sandToggleTornado: () => {
        this.sandTornadoActive = !this.sandTornadoActive;
        if (this.sandTornadoAura) { this.sandTornadoAura.destroy(); this.sandTornadoAura = null; }
        if (this.sandTornadoActive) {
          this.sandTornadoAura = this.add.circle(this.player.x, this.player.y, 40, 0xddbb77, 0.25).setDepth(3);
          this.tweens.add({ targets: this.sandTornadoAura, scaleX: 1.3, scaleY: 1.3, alpha: 0.15, yoyo: true, repeat: -1, duration: 400 });
        }
      },
      sandMirage: (tx, ty) => {
        if (this.sandDecoy) { this.sandDecoy.sprite.destroy(); }
        const decoySprite = this.add.circle(this.player.x, this.player.y, 22, 0xddbb77, 0.5)
          .setStrokeStyle(2, 0xffdd99, 0.5).setDepth(5);
        this.tweens.add({ targets: decoySprite, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
        this.sandDecoy = { sprite: decoySprite, hp: 75, x: this.player.x, y: this.player.y };
        const dx = tx - this.player.x, dy = ty - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * 640, (dy / dist) * 640);
        this.isDodging = true;
        this.player.isInvincible = true;
        this.time.delayedCall(280, () => { if (this.player.active) { this.player.isInvincible = false; this.isDodging = false; } });
      },
      sandActivateGlass: () => {
        if (this.sandHeat < 90) return;
        this.sandGlassForm = true;
        this.sandGlassShardAccum = 0;
        const glassFlash = this.add.circle(this.player.x, this.player.y, 28, 0x88eeff, 0.7).setDepth(15);
        this.tweens.add({ targets: glassFlash, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 350, onComplete: () => glassFlash.destroy() });
      },
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
        const angle = (this.npcDrones.length / 4) * Math.PI * 2;
        const sprite = this.add.circle(
          this.npc.x + Math.cos(angle) * 60,
          this.npc.y + Math.sin(angle) * 60,
          8, 0xffaa00, 0.7,
        ).setDepth(8);
        this.npcDrones.push({ sprite, hp: 15, maxHp: 15, orbitAngle: angle, shielded: false, owner: 'npc' });
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
        }
      },
      launchDrone: (x, y) => {
        if (this.npcDrones.length === 0) return;
        const drone = this.npcDrones.pop()!;
        const dmg = Math.max(1, drone.hp);
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
              this.player.takeDamage(25);
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
          triggered: false, owner: 'npc',
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
          this.player.takeDamage(this.playerFrostStacks * 10);
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
        nBody.setVelocity((dx / len) * 480, (dy / len) * 480);
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
            const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-growth', Math.round(3 * this.npcGrowthDamageMult), false);
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
        this.fireCrystalLaserFrom(this.npc.x, this.npc.y, tx, ty, 8, false);
        for (const cl of this.npcCrystalClones) {
          this.fireCrystalLaserFrom(this.npc.x + cl.offsetX, this.npc.y + cl.offsetY, tx, ty, 8, false);
        }
      },
      placeCrystalNode: (tx, ty) => {
        if (this.npcCrystalNodes.length >= 3) {
          this.npcCrystalNodes[0].sprite.destroy();
          this.npcCrystalNodes.shift();
        }
        const spr = this.add.circle(tx, ty, 14, 0x44aaff, 0.5)
          .setStrokeStyle(2, 0xaaeeff, 0.7).setDepth(4);
        this.npcCrystalNodes.push({ sprite: spr, x: tx, y: ty, owner: 'npc' });
      },
      startCrystalBarrage: (tx, ty) => {
        this.npcCrystalBarrageActive = true;
        this.npcCrystalBarrageEnd = this.time.now + 3000;
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
        for (const cl of this.npcCrystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); }
        this.npcCrystalClones = [];
        this.npcCrystalTrickEnd = this.time.now + 12000;
        for (const off of [{ x: -58, y: 12 }, { x: 58, y: 12 }]) {
          const cx = this.npc.x + off.x, cy = this.npc.y + off.y;
          const hpBg = this.add.rectangle(cx, cy - 28, 30, 4, 0x333333).setDepth(12);
          const hpBar = this.add.rectangle(cx - 15, cy - 28, 30, 4, 0x44aaff).setDepth(13).setOrigin(0, 0.5);
          const spr = this.add.circle(cx, cy, 16, 0x88ccff, 0.65)
            .setStrokeStyle(2, 0xaaeeff).setDepth(11);
          this.npcCrystalClones.push({ sprite: spr, hp: 50, maxHp: 50, offsetX: off.x, offsetY: off.y, hpBar, hpBg });
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
        // NPC auto-upgrades to best affordable ghost type
        let actualType = ghostType;
        if (actualType !== 'knight') {
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
        this.npcHuntTrailEnd = this.time.now + 3000;
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
            if (!this.playerBleedAura) {
              this.playerBleedAura = this.add.circle(this.player.x, this.player.y, 22, 0xcc0000, 0.25).setDepth(3);
              this.tweens.add({ targets: this.playerBleedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 700 });
            }
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
        this.npc.triggerCooldown('hunt-transform');
      },
      // Sand (NPC)
      sandFlintlock: (tx, ty) => {
        const px = this.npc.x, py = this.npc.y;
        const dx = tx - px, dy = ty - py;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const line = new Phaser.Geom.Line(px, py, px + (dx / len) * 650, py + (dy / len) * 650);
        const playerCircle = new Phaser.Geom.Circle(this.player.x, this.player.y, 22);
        if (Phaser.Geom.Intersects.LineToCircle(line, playerCircle)) {
          // Tornado evasion
          if (this.sandTornadoActive && Math.random() < 0.5) {
            this.spawnDamageNumber(this.player.x, this.player.y - 34, -1);
          } else {
            let dmg = 12;
            if (this.elementId === 'sand') {
              if (this.sandHeat >= 80) dmg = Math.round(dmg * 1.35);
              else if (this.sandHeat >= 60) dmg = Math.round(dmg * 1.20);
            }
            this.player.takeDamage(dmg);
            this.spawnHitFlash(this.player.x, this.player.y, 0xffdd99);
            if (this.npcHuntBloodPactActive && this.time.now < this.npcHuntBloodPactEnd) this.npc.heal(Math.ceil(dmg * 0.5));
          }
        }
        const flash = this.add.line(0, 0, px, py, px + (dx / len) * 500, py + (dy / len) * 500, 0xffeecc, 0.9)
          .setLineWidth(2).setDepth(12);
        this.tweens.add({ targets: flash, alpha: 0, duration: 120, onComplete: () => flash.destroy() });
      },
      sandBlindingSand: (tx, ty) => {
        const baseAngle = Math.atan2(ty - this.npc.y, tx - this.npc.x);
        for (const deg of [-20, 0, 20]) {
          const rad = baseAngle + deg * Math.PI / 180;
          const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-sand-ball', 0, false);
          this.projectiles.add(proj);
          proj.launch(Math.cos(rad) * 320, Math.sin(rad) * 320);
          this.time.delayedCall(375, () => { if (proj.active) { proj.setActive(false).setVisible(false); (proj.body as Phaser.Physics.Arcade.Body).stop(); } });
        }
      },
      sandToggleTornado: () => {
        this.npcSandTornadoActive = !this.npcSandTornadoActive;
        if (this.npcSandTornadoAura) { this.npcSandTornadoAura.destroy(); this.npcSandTornadoAura = null; }
        if (this.npcSandTornadoActive) {
          this.npcSandTornadoAura = this.add.circle(this.npc.x, this.npc.y, 40, 0xddbb77, 0.25).setDepth(3);
          this.tweens.add({ targets: this.npcSandTornadoAura, scaleX: 1.3, scaleY: 1.3, alpha: 0.15, yoyo: true, repeat: -1, duration: 400 });
        }
      },
      sandMirage: (tx, ty) => {
        if (this.npcSandDecoy) { this.npcSandDecoy.sprite.destroy(); }
        const decoySprite = this.add.circle(this.npc.x, this.npc.y, 22, 0xddbb77, 0.5)
          .setStrokeStyle(2, 0xffdd99, 0.5).setDepth(5);
        this.tweens.add({ targets: decoySprite, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
        this.npcSandDecoy = { sprite: decoySprite, hp: 75, x: this.npc.x, y: this.npc.y };
        const dx = tx - this.npc.x, dy = ty - this.npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * 640, (dy / dist) * 640);
        this.time.delayedCall(280, () => { (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0); });
      },
      sandActivateGlass: () => {
        if (this.npcSandHeat < 90) return;
        this.npcSandGlassForm = true;
        this.npcSandGlassShardAccum = 0;
        const glassFlash = this.add.circle(this.npc.x, this.npc.y, 28, 0x88eeff, 0.7).setDepth(15);
        this.tweens.add({ targets: glassFlash, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 350, onComplete: () => glassFlash.destroy() });
      },
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
      // Sand — no-ops for clone
      sandFlintlock: () => {},
      sandBlindingSand: () => {},
      sandToggleTornado: () => {},
      sandMirage: () => {},
      sandActivateGlass: () => {},
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

  // ── Game over ────────────────────────────────────────────────────

  private hasUpgrade(slot: string): boolean {
    return this.activeUpgrades.includes(slot);
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
      this.scene.start('GameOverScene', {
        playerWon,
        difficulty: this.npcDifficulty.level,
        rewardMult: playerWon ? getTotalRewardMult() : undefined,
      });
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
      this.npcFrostStacks = Math.min(5, this.npcFrostStacks + 1);
      this.npc.incomingDamageMultiplier = this.frostDamageMultiplier(this.npcFrostStacks);
    } else {
      this.playerFrostStacks = Math.min(5, this.playerFrostStacks + 1);
      this.player.incomingDamageMultiplier = this.frostDamageMultiplier(this.playerFrostStacks);
    }
  }

  private clearFrostStacks(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      this.npcFrostStacks = 0;
      this.npc.incomingDamageMultiplier = 1;
    } else {
      this.playerFrostStacks = 0;
      this.player.incomingDamageMultiplier = 1;
    }
  }

  private spawnIcyTrail(x: number, y: number, owner: 'player' | 'npc'): void {
    const spr = this.add.circle(x, y, 32, 0x88ccff, 0.35).setDepth(2)
      .setStrokeStyle(1, 0xcceeff, 0.5);
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
  private fireCrystalLaserFrom(startX: number, startY: number, toX: number, toY: number, baseDamage: number, isFromPlayer: boolean): void {
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
        let rdx = dx - 2 * dot * nx;
        let rdy = dy - 2 * dot * ny;
        // Random ±22.5° spread
        const spread = (Math.random() - 0.5) * (Math.PI / 4);
        const cs = Math.cos(spread), sn = Math.sin(spread);
        dx = rdx * cs - rdy * sn;
        dy = rdx * sn + rdy * cs;
        const rlen = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= rlen; dy /= rlen;
        ox = endX + dx * 3;
        oy = endY + dy * 3;
        lastBounced = hitCrystal;
        this.tweens.add({ targets: hitCrystal.sprite, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 80, yoyo: true });
      } else if (hitType === 'portal' && hitPortal) {
        const other = ownPortals.find((p) => p !== hitPortal)!;
        const tdx = target.x - other.x, tdy = target.y - other.y;
        const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        dx = tdx / tlen; dy = tdy / tlen;
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
        if (isPlayer) this.growthBloatCdMs = Math.max(2000, this.growthBloatCdMs - 2000);
        else this.npcGrowthBloatCdMs = Math.max(2000, this.npcGrowthBloatCdMs - 2000);
        break;
      case 'spray':
        if (isPlayer) this.growthInfectExtraProj += 1;
        else this.npcGrowthInfectExtraProj += 1;
        break;
      case 'quick':
        if (isPlayer) this.growthInfectCdMs = Math.max(2000, this.growthInfectCdMs - 1000);
        break;
      case 'regenerative':
        if (isPlayer) this.growthRegenRate += 1;
        else this.npcGrowthRegenRate += 1;
        break;
    }
    // Flash to confirm
    const flash = this.add.circle(fighter.x, fighter.y, 22, 0x88bb22, 0.7).setDepth(12);
    this.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
  }

  private triggerSandExplosion(x: number, y: number, owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      this.player.applySelfDamage(30);
      if (Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y) <= 130) {
        this.npc.takeDamage(30);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0xffdd99);
      }
    } else {
      this.npc.applySelfDamage(30);
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= 130) {
        let dmg = 30;
        if (this.elementId === 'sand') {
          if (this.sandHeat >= 80) dmg = Math.round(dmg * 1.35);
          else if (this.sandHeat >= 60) dmg = Math.round(dmg * 1.20);
        }
        this.player.takeDamage(dmg);
        this.spawnHitFlash(this.player.x, this.player.y, 0xffdd99);
      }
    }
    const boom = this.add.circle(x, y, 12, 0xffdd99, 0.9).setDepth(12);
    this.tweens.add({ targets: boom, scaleX: 10, scaleY: 10, alpha: 0, duration: 500, onComplete: () => boom.destroy() });
    const core = this.add.circle(x, y, 6, 0xffffff, 0.95).setDepth(13);
    this.tweens.add({ targets: core, scaleX: 5, scaleY: 5, alpha: 0, duration: 250, onComplete: () => core.destroy() });
  }

  private spawnShadowDarkCloud(x: number, y: number, owner: 'player' | 'npc'): void {
    const spr = this.add.circle(x, y, 36, 0x330044, 0.55).setDepth(3);
    spr.setStrokeStyle(1, 0x8800cc, 0.5);
    this.tweens.add({ targets: spr, scaleX: 1.2, scaleY: 1.2, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 });
    this.shadowDarkClouds.push({ sprite: spr, expiresAt: this.time.now + 6000, x, y, radius: 36, tickAccum: 0, owner });
  }

  private spawnSoulGhost(type: 'basic' | 'ghoul' | 'banshee' | 'knight', x: number, y: number, owner: 'player' | 'npc'): void {
    const hp = type === 'basic' ? 25 : type === 'ghoul' ? 20 : type === 'banshee' ? 100 : 125;
    const r = type === 'banshee' ? 31 : type === 'knight' ? 20 : 21;
    const colors: Record<string, number> = { basic: 0xaaaaff, ghoul: 0x8844aa, banshee: 0xddaaff, knight: 0xffaacc };
    const spr = this.add.circle(x, y, r, colors[type], 0.75)
      .setStrokeStyle(2, 0xeeeeff, 0.6).setDepth(8);
    this.tweens.add({ targets: spr, scaleX: 0.88, scaleY: 0.88, yoyo: true, repeat: -1, duration: 600 });

    const angle = Math.random() * Math.PI * 2;
    const dx = type === 'knight' ? Math.cos(angle) : 0;
    const dy = type === 'knight' ? Math.sin(angle) : 0;

    const summon: SoulSummon = { sprite: spr, hp, maxHp: hp, type, owner, lastContactTick: -99999, ghoulShootAccum: 0, dx, dy };
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
    const speed = gs.type === 'basic' ? 90 : gs.type === 'banshee' ? 75 : gs.type === 'knight' ? 750 : 60;
    const sx = gs.sprite.x, sy = gs.sprite.y;

    if (gs.type === 'basic' || gs.type === 'banshee') {
      const dx = enemy.x - sx, dy = enemy.y - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      gs.sprite.setPosition(sx + (dx / len) * speed * (delta / 1000), sy + (dy / len) * speed * (delta / 1000));
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
        const bolt = new Projectile(this, gs.sprite.x, gs.sprite.y, 'proj-soul-bolt', 10, isPlayerOwned);
        this.projectiles.add(bolt);
        bolt.launch((dx / blen) * 380, (dy / blen) * 380);
      }
    } else {
      // knight: bounce off walls
      let nx = sx + gs.dx * speed * (delta / 1000);
      let ny = sy + gs.dy * speed * (delta / 1000);
      if (nx < pad || nx > W - pad) { gs.dx *= -1; nx = Math.max(pad, Math.min(W - pad, nx)); }
      if (ny < pad || ny > H - pad) { gs.dy *= -1; ny = Math.max(pad, Math.min(H - pad, ny)); }
      gs.sprite.setPosition(nx, ny);
    }

    // Clamp to arena
    gs.sprite.setPosition(
      Math.max(pad, Math.min(W - pad, gs.sprite.x)),
      Math.max(pad, Math.min(H - pad, gs.sprite.y)),
    );

    // Contact damage (ghoul: no contact, uses bolts)
    if (gs.type !== 'ghoul' && time - gs.lastContactTick >= 1000) {
      const contactRange = gs.type === 'banshee' ? 60 : gs.type === 'knight' ? 42 : 43;
      const contactDmg = gs.type === 'basic' ? 5 : gs.type === 'banshee' ? 12 : 8;
      if (Phaser.Math.Distance.Between(gs.sprite.x, gs.sprite.y, enemy.x, enemy.y) <= contactRange) {
        enemy.takeDamage(contactDmg);
        this.spawnHitFlash(enemy.x, enemy.y, 0xccaaff);
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

  private spawnGrenadeExplosion(x: number, y: number, selfDamage: boolean, owner: 'player' | 'npc'): void {
    const radius = 130;
    const dmg = 35;
    if (owner === 'player') {
      const nd = Phaser.Math.Distance.Between(x, y, this.npc.x, this.npc.y);
      if (nd <= radius) {
        this.npc.takeDamage(dmg);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
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

  // ── Update loop ──────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.gameEnded) return;

    const pointer = this.input.activePointer;
    const mouseX = pointer.worldX;
    const mouseY = pointer.worldY;

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
      this.playerSpeedMult = this.huntBeastForm ? 1.5 : 1;
    } else if (this.elementId === 'sand') {
      this.playerSpeedMult = this.sandTornadoActive ? 1.5 : 1;
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
    } else {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
    }

    this.npcSpeedMult = 1;
    if (this.npcFlameBodyActive) this.npcSpeedMult = 2;
    else if (time < this.npcGeyserBuffUntil) this.npcSpeedMult = 1.5;
    else if (this.npcElement.id === 'sand' && this.npcSandTornadoActive) this.npcSpeedMult = 1.5;

    // Ice frost slow on NPC
    if (this.npcFrostStacks > 0) this.npcSpeedMult *= (1 - this.npcFrostStacks * 0.1);
    if (this.npcBlockUpActive) this.npcSpeedMult *= 0.5;
    // Ice frost slow on player
    if (this.playerFrostStacks > 0) {
      this.playerSpeedMult *= (1 - this.playerFrostStacks * 0.1);
    }
    if (this.playerBlockUpActive) this.playerSpeedMult *= 0.5;

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
    // NPC trail boost
    if (this.npc.element.id === 'hunt') {
      const npcOnTrail = this.npcHuntTrailCircles.some(
        (c) => Phaser.Math.Distance.Between(this.npc.x, this.npc.y, c.x, c.y) <= 30,
      );
      if (npcOnTrail) this.npcSpeedMult *= 1.5;
    }

    // ── Player movement ─────────────────────────────────────────
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.nukeChanneling && !this.armageddonActive && !this.airBeamWalking) {
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

      let moveMult = this.playerSpeedMult;
      if (this.armageddonActive) moveMult *= 0.2;          // Armageddon: 20% speed
      else if (this.pressureCharging) moveMult *= 0.75;    // Pressure Charge: 75% speed

      playerBody.setVelocity(vx * moveMult, vy * moveMult);
    }

    // ── NPC tentacle drag on player ───────────────────────────────
    if (this.npcShadowTentacleHooked && this.npcShadowTentacleActive && !this.isDodging) {
      const dragDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcShadowDragTargetX, this.npcShadowDragTargetY);
      if (dragDist > 20) {
        const dragAngle = Math.atan2(this.npcShadowDragTargetY - this.player.y, this.npcShadowDragTargetX - this.player.x);
        playerBody.setVelocity(Math.cos(dragAngle) * 200, Math.sin(dragAngle) * 200);
      }
    }

    // ── Frozen player ─────────────────────────────────────────────
    if (this.playerFrozenUntil > time && !this.isDodging) {
      playerBody.setVelocity(0, 0);
    }

    // ── Player abilities ─────────────────────────────────────────
    const playerCtx = this.buildPlayerContext(mouseX, mouseY);

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
          this.player.castAbility('tentacle', this.buildPlayerContext(mouseX, mouseY));
        }
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('snap-trap', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          if (this.shadowDanceCharge >= 35) {
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
        if (pointer.isDown) {
          this.player.castAbility('crystal-laser', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('crystal-place', playerCtx);
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
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('mutate', playerCtx);
        }
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          // Manual cooldown handled inside fireInfect callback
          playerCtx.fireInfect(mouseX, mouseY);
        }
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          playerCtx.activateBloat();
        }
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('mutant-morph', playerCtx);
        }
      }
    } else if (this.elementId === 'soul') {
      // Click: Spirit Propel orb
      if (pointer.isDown && !this.pointerWasDown) {
        playerCtx.fireSoulOrb(mouseX, mouseY);
      }

      // R: Sacrifice
      if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
        playerCtx.soulSacrifice();
      }

      // F: Consume
      if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
        playerCtx.soulConsume();
      }

      // Q: Undead Charge (costs 5 ghosts)
      if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
        if (this.soulGhosts >= 5) {
          playerCtx.summonGhost('knight');
        }
      }

      // E: Summon — hold mechanic
      const eDown = this.eKey.isDown;
      if (eDown && !this.soulEHolding) {
        this.soulEHolding = true;
        this.soulEHoldStart = time;
        if (this.soulEHoldVisual) this.soulEHoldVisual.destroy();
        this.soulEHoldVisual = this.add.circle(this.player.x, this.player.y - 36, 8, 0xccaaff, 0.6).setDepth(15);
        this.tweens.add({ targets: this.soulEHoldVisual, scaleX: 1.5, scaleY: 1.5, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
      } else if (!eDown && this.soulEHolding) {
        // Released — determine ghost type by hold duration
        this.soulEHolding = false;
        if (this.soulEHoldVisual) { this.soulEHoldVisual.destroy(); this.soulEHoldVisual = null; }
        const holdMs = time - this.soulEHoldStart;
        // Quick tap (<200ms) → instant basic ghost (no ghost cost)
        if (holdMs < 200) {
          playerCtx.summonGhost('basic');
        } else {
          let ghostType: 'basic' | 'ghoul' | 'banshee' = 'basic';
          if (holdMs >= 2000 && this.soulGhosts >= 3) ghostType = 'banshee';
          else if (holdMs >= 1000 && this.soulGhosts >= 2) ghostType = 'ghoul';
          playerCtx.summonGhost(ghostType);
        }
      }
    } else if (this.elementId === 'hunt') {
      if (!this.huntBeastForm) {
        // ── Normal form ──────────────────────────────────────────
        // Click: Shotgun
        if (pointer.isDown && !this.pointerWasDown) {
          this.player.castAbility('hunt-shotgun', playerCtx);
        }
        // E: Grenade hold mechanic
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          if (this.player.getCooldownRatio('hunt-grenade') >= 1) {
            this.player.triggerCooldown('hunt-grenade');
            this.huntGrenadeHoldStart = time;
            this.huntGrenadeHolding = true;
            if (this.huntGrenadeVisual) this.huntGrenadeVisual.destroy();
            this.huntGrenadeVisual = this.add.circle(this.player.x, this.player.y, 10, 0xff6600, 0.9).setDepth(12);
          }
        }
        if (!this.eKey.isDown && this.huntGrenadeHolding) {
          const holdMs = time - this.huntGrenadeHoldStart;
          if (holdMs < 3000) {
            playerCtx.huntThrowGrenade(mouseX, mouseY, holdMs);
          }
          this.huntGrenadeHolding = false;
          if (this.huntGrenadeVisual) { this.huntGrenadeVisual.destroy(); this.huntGrenadeVisual = null; }
        }
        // R: Hunter's Trail
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('hunt-trail', playerCtx);
        }
        // F: Blood Pact
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('hunt-blood-pact', playerCtx);
        }
        // Q: Transform
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('hunt-transform', playerCtx);
        }
      } else {
        // ── Beast form ───────────────────────────────────────────
        // Click: Slash
        if (pointer.isDown && !this.pointerWasDown) {
          this.player.castAbility('hunt-slash', playerCtx);
        }
        // E: Explosive Leap
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('hunt-leap', playerCtx);
        }
        // R: Blood Hunt (requires bleed)
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          if (this.npcBleeding) this.player.castAbility('hunt-blood-hunt', playerCtx);
        }
        // F: Blood Moon
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('hunt-blood-moon', playerCtx);
        }
        // Q: Untransform
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('hunt-untransform', playerCtx);
        }
      }
    } else if (this.elementId === 'sand') {
      if (!this.sandGlassForm) {
        // Click: Flintlock (manual CD; firing early costs +20 heat)
        if (pointer.isDown && !this.pointerWasDown) {
          // Blinded: 50% chance to fumble
          if (this.sandBlindedUntil > time && Math.random() < 0.5) {
            // miss — play visual anyway
            const blink = this.add.circle(this.player.x, this.player.y, 10, 0xddbb77, 0.4).setDepth(12);
            this.tweens.add({ targets: blink, alpha: 0, scaleX: 2, scaleY: 2, duration: 200, onComplete: () => blink.destroy() });
          } else {
            const ready = this.player.getCooldownRatio('sand-flintlock') >= 1;
            this.player.triggerCooldown('sand-flintlock');
            if (!ready) this.sandHeat = Math.min(100, this.sandHeat + 20);
            playerCtx.sandFlintlock(mouseX, mouseY);
          }
        }
        // E: Blinding Sand
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.player.castAbility('sand-blinding', playerCtx);
        }
        // R: Tornado Force toggle
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          playerCtx.sandToggleTornado();
        }
        // F: Mirage
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('sand-mirage', playerCtx);
        }
        // Q: Glass Meld (condition: heat >= 90)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          playerCtx.sandActivateGlass();
        }
      }
      // Glass form: minigun shard fire is handled in per-frame
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
          // Drop puddle near player with aim scatter based on difficulty
          const splashMissRange = this.npcDifficulty.aimOffsetDeg * 2.2; // ~0 on Nightmare, ~110 on Easy
          const splashX = this.player.x + Phaser.Math.Between(-splashMissRange, splashMissRange);
          const splashY = this.player.y + Phaser.Math.Between(-splashMissRange, splashMissRange);
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
      // Orbit drones evenly around player
      const pCount = this.playerDrones.length;
      for (let di = 0; di < pCount; di++) {
        const drone = this.playerDrones[di];
        drone.orbitAngle += delta * 0.0025;
        const angle = drone.orbitAngle + (di * Math.PI * 2 / Math.max(1, pCount));
        drone.sprite.setPosition(
          this.player.x + Math.cos(angle) * 60,
          this.player.y + Math.sin(angle) * 60,
        );
      }
      // Drones absorb NPC projectiles
      for (let di = this.playerDrones.length - 1; di >= 0; di--) {
        const drone = this.playerDrones[di];
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, drone.sprite.x, drone.sprite.y) <= 20) {
            drone.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            break;
          }
        }
        if (drone.hp <= 0) {
          drone.sprite.destroy();
          this.playerDrones.splice(di, 1);
        }
      }
      // Firewall absorbs NPC projectiles
      if (this.playerFirewallSprite && this.playerFirewallHp > 0) {
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || proj.isFromPlayer) continue;
          if (Math.abs(proj.x - this.playerFirewallX) <= 60 && Math.abs(proj.y - this.playerFirewallY) <= 30) {
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
      // Overdrive beam
      if (this.playerOverdriveActive) {
        if (time >= this.playerOverdriveEnd) {
          this.playerOverdriveActive = false;
          this.nukeChanneling = false;
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
      for (let di = 0; di < nCount; di++) {
        const drone = this.npcDrones[di];
        drone.orbitAngle += delta * 0.0025;
        const angle = drone.orbitAngle + (di * Math.PI * 2 / Math.max(1, nCount));
        drone.sprite.setPosition(
          this.npc.x + Math.cos(angle) * 60,
          this.npc.y + Math.sin(angle) * 60,
        );
      }
      // NPC drones absorb player projectiles
      for (let di = this.npcDrones.length - 1; di >= 0; di--) {
        const drone = this.npcDrones[di];
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, drone.sprite.x, drone.sprite.y) <= 20) {
            drone.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            break;
          }
        }
        if (drone.hp <= 0) {
          drone.sprite.destroy();
          this.npcDrones.splice(di, 1);
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
        if (cloud.tickAccum >= 1000) {
          cloud.tickAccum -= 1000;
          if (cloud.owner === 'player') {
            // Heal player, damage NPC
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, this.player.x, this.player.y) <= cloud.radius + 14) {
              const prevHp = this.player.hp;
              this.player.heal(3);
              const healed = this.player.hp - prevHp;
              if (healed > 0) {
                this.shadowDanceCharge = Math.min(35, this.shadowDanceCharge + healed);
              }
            }
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, this.npc.x, this.npc.y) <= cloud.radius + 14) {
              this.npc.takeDamage(2);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0x660088);
            }
          } else {
            // NPC cloud: heal NPC, damage player
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, this.npc.x, this.npc.y) <= cloud.radius + 14) {
              this.npc.heal(3);
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
          if (Phaser.Math.Distance.Between(trap.x, trap.y, this.npc.x, this.npc.y) <= 28) {
            trap.triggered = true;
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc44ff);
            this.shadowNpcStunnedUntil = time + 1000;
          }
        } else {
          if (Phaser.Math.Distance.Between(trap.x, trap.y, this.player.x, this.player.y) <= 28) {
            trap.triggered = true;
            this.player.takeDamage(20);
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc44ff);
            this.shadowPlayerStunnedUntil = time + 1000;
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
                // Miss: draw short whip toward endpoint and expire
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
      }

    }

    // ── Dodge (Space) ────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dodgeOnCooldown && !this.isDodging && !this.nukeChanneling) {
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

      const trail = this.add.circle(this.player.x, this.player.y, 18, 0x8844ff, 0.4);
      this.tweens.add({ targets: trail, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 300, onComplete: () => trail.destroy() });

      this.time.delayedCall(280, () => {
        if (this.player.active) { this.player.isInvincible = false; this.isDodging = false; }
      });
      this.time.delayedCall(1000, () => { this.dodgeOnCooldown = false; });
    }

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
      npcSandBlinded: this.npcSandBlindedUntil > time,
      npcSandGlassForm: this.npcSandGlassForm,
      npcSandHeat: this.npcSandHeat,
      npcSandTornadoActive: this.npcSandTornadoActive,
      playerSandDecoyX: this.sandDecoy?.x,
      playerSandDecoyY: this.sandDecoy?.y,
    };

    const npcPreDashX = this.npc.x;
    const npcPreDashY = this.npc.y;
    const npcCastId = this.npc.doAI(
      this.player,
      (tx, ty) => this.buildNpcContext(tx, ty),
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

    // ── Ice per-frame ─────────────────────────────────────────────
    if (this.elementId === 'ice' || this.npcElement.id === 'ice') {
      // Icy trail ticks: slow enemy + inflict frost stacks
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
            // NPC slow — npcSpeedMult is applied after this section in post-AI velocity multiplier
            this.npcSpeedMult *= 0.8;
            // Frost tick every 1200ms
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

      // Stun from snap trap
      if (time < this.shadowNpcStunnedUntil) nBody.setVelocity(0, 0);
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
    }

    // ── Crystal per-frame ─────────────────────────────────────────
    if (this.elementId === 'crystal' || this.npcElement.id === 'crystal') {
      const BARRAGE_INTERVAL = 100; // 30 shots over 3s
      const allCrystals = [...this.crystalNodes, ...this.npcCrystalNodes];
      const allActiveProj = this.projectiles.getChildren();

      // Player barrage ticks
      if (this.crystalBarrageActive) {
        if (time >= this.crystalBarrageEnd || this.crystalBarrageShots >= 30) {
          this.crystalBarrageActive = false;
        } else {
          this.crystalBarrageAccum += delta;
          while (this.crystalBarrageAccum >= BARRAGE_INTERVAL && this.crystalBarrageShots < 30) {
            this.crystalBarrageAccum -= BARRAGE_INTERVAL;
            this.crystalBarrageShots++;
            const baseAngle = Math.atan2(this.crystalBarrageTY - this.player.y, this.crystalBarrageTX - this.player.x);
            const angle = baseAngle + (Math.random() - 0.5) * 0.85;
            const proj = new Projectile(this, this.player.x, this.player.y, 'proj-crystal-shard', 4, true);
            this.projectiles.add(proj);
            proj.launch(Math.cos(angle) * 430, Math.sin(angle) * 430);
            for (const cl of this.crystalClones) {
              const cx = this.player.x + cl.offsetX, cy = this.player.y + cl.offsetY;
              const ca = Math.atan2(this.crystalBarrageTY - cy, this.crystalBarrageTX - cx) + (Math.random() - 0.5) * 0.85;
              const cp = new Projectile(this, cx, cy, 'proj-crystal-shard', 4, true);
              this.projectiles.add(cp);
              cp.launch(Math.cos(ca) * 430, Math.sin(ca) * 430);
            }
          }
        }
      }

      // NPC barrage ticks
      if (this.npcCrystalBarrageActive) {
        if (time >= this.npcCrystalBarrageEnd || this.npcCrystalBarrageShots >= 30) {
          this.npcCrystalBarrageActive = false;
        } else {
          this.npcCrystalBarrageAccum += delta;
          while (this.npcCrystalBarrageAccum >= BARRAGE_INTERVAL && this.npcCrystalBarrageShots < 30) {
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
            if (Phaser.Math.Distance.Between(node.x, node.y, tgt.x, tgt.y) <= 60) {
              tgt.takeDamage(10);
              this.spawnHitFlash(tgt.x, tgt.y, 0x88eeff);
            }
            const exp = this.add.circle(node.x, node.y, 10, 0x88eeff, 0.5).setDepth(8);
            this.tweens.add({ targets: exp, scaleX: 6, scaleY: 6, alpha: 0, duration: 260, onComplete: () => exp.destroy() });
            this.tweens.add({ targets: node.sprite, alpha: 1, scaleX: 1.45, scaleY: 1.45, duration: 90, yoyo: true });
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

      // Player crystal clones — follow player, update HP bars, check incoming projectiles
      if (time > this.crystalTrickEnd && this.crystalClones.length > 0) {
        for (const cl of this.crystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); }
        this.crystalClones = [];
      } else {
        for (let ci = this.crystalClones.length - 1; ci >= 0; ci--) {
          const cl = this.crystalClones[ci];
          const cx = this.player.x + cl.offsetX, cy = this.player.y + cl.offsetY;
          cl.sprite.setPosition(cx, cy);
          cl.hpBg.setPosition(cx, cy - 28);
          const barW = Math.max(0, (cl.hp / cl.maxHp) * 30);
          cl.hpBar.setSize(barW, 4).setPosition(cx - 15 + barW / 2, cy - 28);
          // Check NPC projectile hits
          for (const go of allActiveProj) {
            const proj = go as Projectile;
            if (!proj.active || proj.isFromPlayer) continue;
            if (Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy) <= 20) {
              cl.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              if (cl.hp <= 0) {
                cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy();
                this.crystalClones.splice(ci, 1);
              }
              break;
            }
          }
        }
      }

      // NPC crystal clones — follow NPC, check player projectile hits
      if (time > this.npcCrystalTrickEnd && this.npcCrystalClones.length > 0) {
        for (const cl of this.npcCrystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); }
        this.npcCrystalClones = [];
      } else {
        for (let ci = this.npcCrystalClones.length - 1; ci >= 0; ci--) {
          const cl = this.npcCrystalClones[ci];
          const cx = this.npc.x + cl.offsetX, cy = this.npc.y + cl.offsetY;
          cl.sprite.setPosition(cx, cy);
          cl.hpBg.setPosition(cx, cy - 28);
          const barW = Math.max(0, (cl.hp / cl.maxHp) * 30);
          cl.hpBar.setSize(barW, 4).setPosition(cx - 15 + barW / 2, cy - 28);
          for (const go of allActiveProj) {
            const proj = go as Projectile;
            if (!proj.active || !proj.isFromPlayer) continue;
            if (proj.texture.key === 'proj-crystal-shard') continue; // handled in shard-vs-node check
            if (Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy) <= 20) {
              cl.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              if (cl.hp <= 0) {
                cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy();
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

      // E hold visual position + color by tier
      if (this.soulEHolding && this.soulEHoldVisual) {
        const holdMs = time - this.soulEHoldStart;
        const holdFrac = Math.min(1, holdMs / 2000);
        this.soulEHoldVisual.setPosition(this.player.x, this.player.y - 36);
        this.soulEHoldVisual.setRadius(8 + holdFrac * 10);
        // Tier colors: basic=light purple, ghoul=dark purple, banshee=bright lavender
        const tierColor = holdMs >= 2000 ? 0xffffff : holdMs >= 1000 ? 0x440077 : 0xccaaff;
        this.soulEHoldVisual.setFillStyle(tierColor, 0.6);
      }

      // Spirit Propel orbs — player
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
            const ft = this.add.text(this.player.x, this.player.y - 30, '+1 👻', { fontSize: '14px', color: '#ccaaff' }).setDepth(20);
            this.tweens.add({ targets: ft, y: ft.y - 28, alpha: 0, duration: 800, onComplete: () => ft.destroy() });
          }
        }
      }

      // Spirit Propel orbs — NPC
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

      // Soul summons — player
      for (let i = this.playerSoulSummons.length - 1; i >= 0; i--) {
        const gs = this.playerSoulSummons[i];
        if (gs.hp <= 0) { gs.sprite.destroy(); this.playerSoulSummons.splice(i, 1); continue; }
        this.updateSoulSummon(gs, this.npc, time, delta, true);
      }

      // Soul summons — NPC
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
        const holdFrac = Math.min(1, holdMs / 3000);
        this.huntGrenadeVisual.setPosition(this.player.x, this.player.y);
        this.huntGrenadeVisual.setRadius(10 + holdFrac * 8);
        if (holdMs >= 3000) {
          // Auto-explode with self-damage
          this.spawnGrenadeExplosion(this.player.x, this.player.y, true, 'player');
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
        if (time >= g.explodeAt) {
          this.spawnGrenadeExplosion(g.x, g.y, g.selfDamage, g.owner);
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
            this.huntTrailCircles.push({ sprite: s, x: this.npc.x, y: this.npc.y, expiresAt: time + 2000 });
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
            this.npcHuntTrailCircles.push({ sprite: s, x: this.player.x, y: this.player.y, expiresAt: time + 2000 });
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

      // Explosive Leap — player lands
      if (this.huntLeapActive && time >= this.huntLeapEnd) {
        this.huntLeapActive = false;
        this.player.setPosition(this.huntLeapTargetX, this.huntLeapTargetY);
        this.player.isInvincible = false;
        this.player.setAlpha(1);
        this.nukeChanneling = false;
        // AoE explosion on landing
        const landDist = Phaser.Math.Distance.Between(this.huntLeapTargetX, this.huntLeapTargetY, this.npc.x, this.npc.y);
        if (landDist <= 120) {
          this.npc.takeDamage(30);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xff4400);
          if (this.huntBloodPactActive && time < this.huntBloodPactEnd) this.player.heal(15);
        }
        const boom = this.add.circle(this.huntLeapTargetX, this.huntLeapTargetY, 10, 0xff4400, 0.9).setDepth(9);
        this.tweens.add({ targets: boom, scaleX: 12, scaleY: 12, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
        const boomC = this.add.circle(this.huntLeapTargetX, this.huntLeapTargetY, 6, 0xffcc00, 1).setDepth(10);
        this.tweens.add({ targets: boomC, scaleX: 4, scaleY: 4, alpha: 0, duration: 200, onComplete: () => boomC.destroy() });
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
    }

    // ── Sand per-frame ───────────────────────────────────────────
    if (this.elementId === 'sand' || this.npcElement.id === 'sand') {
      // ── Player sand ──
      if (this.elementId === 'sand') {
        // Heat depletion: 2/s
        this.sandHeatDepletionAccum += delta;
        const depleteTicks = Math.floor(this.sandHeatDepletionAccum / 500);
        if (depleteTicks > 0) {
          this.sandHeat = Math.max(0, this.sandHeat - depleteTicks);
          this.sandHeatDepletionAccum -= depleteTicks * 500;
        }
        // Tornado: +10 heat/s, aura follows player
        if (this.sandTornadoActive) {
          this.sandHeat = Math.min(100, this.sandHeat + 10 * delta / 1000);
          if (this.sandTornadoAura) this.sandTornadoAura.setPosition(this.player.x, this.player.y);
        }
        // Glass form: drain 5 heat/s, fire shards on hold-click, cancel at ≤30 heat
        if (this.sandGlassForm) {
          this.sandHeat = Math.max(0, this.sandHeat - 5 * delta / 1000);
          if (this.sandHeat <= 30) {
            this.sandGlassForm = false;
            this.sandGlassShardAccum = 0;
          } else if (this.input.activePointer.isDown) {
            this.sandGlassShardAccum += delta;
            while (this.sandGlassShardAccum >= 80) {
              this.sandGlassShardAccum -= 80;
              const gPtr = this.input.activePointer;
              const gdx = gPtr.x - this.player.x, gdy = gPtr.y - this.player.y;
              const glen = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
              const spread = (Math.random() - 0.5) * 0.35;
              const gcos = Math.cos(spread), gsin = Math.sin(spread);
              const gvx = (gdx / glen * gcos - gdy / glen * gsin) * 650;
              const gvy = (gdx / glen * gsin + gdy / glen * gcos) * 650;
              const shard = new Projectile(this, this.player.x, this.player.y, 'proj-sand-shard', 3, true);
              this.projectiles.add(shard);
              shard.launch(gvx, gvy);
            }
          } else {
            this.sandGlassShardAccum = 0;
          }
        }
        // Fire DOT at 90+ heat: 3 dmg/s
        if (this.sandHeat >= 90) {
          this.sandFireAccum += delta;
          while (this.sandFireAccum >= 1000) {
            this.sandFireAccum -= 1000;
            this.player.applySelfDamage(3);
          }
        } else {
          this.sandFireAccum = 0;
        }
        // Overheat explosion at 100
        if (this.sandHeat >= 100) {
          this.sandHeat = 50;
          this.triggerSandExplosion(this.player.x, this.player.y, 'player');
        }
        // Update heat UI
        if (this.sandHeatText) this.sandHeatText.setText(`🌡️ ${Math.floor(this.sandHeat)}`);
        // Decoy cleanup
        if (this.sandDecoy && this.sandDecoy.hp <= 0) {
          this.sandDecoy.sprite.destroy();
          this.sandDecoy = null;
        }
      }

      // ── NPC sand ──
      if (this.npcElement.id === 'sand') {
        this.npcSandHeatDepletionAccum += delta;
        const npcDeplete = Math.floor(this.npcSandHeatDepletionAccum / 500);
        if (npcDeplete > 0) {
          this.npcSandHeat = Math.max(0, this.npcSandHeat - npcDeplete);
          this.npcSandHeatDepletionAccum -= npcDeplete * 500;
        }
        if (this.npcSandTornadoActive) {
          this.npcSandHeat = Math.min(100, this.npcSandHeat + 10 * delta / 1000);
          if (this.npcSandTornadoAura) this.npcSandTornadoAura.setPosition(this.npc.x, this.npc.y);
        }
        if (this.npcSandGlassForm) {
          this.npcSandHeat = Math.max(0, this.npcSandHeat - 5 * delta / 1000);
          if (this.npcSandHeat <= 30) {
            this.npcSandGlassForm = false;
            this.npcSandGlassShardAccum = 0;
          } else {
            // NPC glass minigun toward player
            this.npcSandGlassShardAccum += delta;
            while (this.npcSandGlassShardAccum >= 100) {
              this.npcSandGlassShardAccum -= 100;
              const ndx = this.player.x - this.npc.x, ndy = this.player.y - this.npc.y;
              const nlen = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
              const aimOff = (Math.random() * 2 - 1) * this.npcDifficulty.aimOffsetDeg * 0.5 * (Math.PI / 180);
              const nAngle = Math.atan2(ndy, ndx) + aimOff + (Math.random() - 0.5) * 0.3;
              void nlen;
              const nShard = new Projectile(this, this.npc.x, this.npc.y, 'proj-sand-shard', 3, false);
              this.projectiles.add(nShard);
              nShard.launch(Math.cos(nAngle) * 650, Math.sin(nAngle) * 650);
            }
          }
        }
        if (this.npcSandHeat >= 90) {
          this.npcSandFireAccum += delta;
          while (this.npcSandFireAccum >= 1000) {
            this.npcSandFireAccum -= 1000;
            this.npc.applySelfDamage(3);
          }
        } else {
          this.npcSandFireAccum = 0;
        }
        if (this.npcSandHeat >= 100) {
          this.npcSandHeat = 50;
          this.triggerSandExplosion(this.npc.x, this.npc.y, 'npc');
        }
        if (this.npcSandDecoy && this.npcSandDecoy.hp <= 0) {
          this.npcSandDecoy.sprite.destroy();
          this.npcSandDecoy = null;
        }
      }

      // ── Decoy hit detection ──
      // NPC projectiles intercepted by player decoy
      if (this.sandDecoy) {
        for (const go of this.projectiles.getChildren()) {
          const proj = go as Projectile;
          if (!proj.active || proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, this.sandDecoy.x, this.sandDecoy.y) <= 22) {
            this.sandDecoy.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            this.spawnHitFlash(this.sandDecoy.x, this.sandDecoy.y, 0xddbb77);
            break;
          }
        }
      }
      // Player projectiles intercepted by NPC decoy
      if (this.npcSandDecoy) {
        for (const go of this.projectiles.getChildren()) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, this.npcSandDecoy.x, this.npcSandDecoy.y) <= 22) {
            this.npcSandDecoy.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            this.spawnHitFlash(this.npcSandDecoy.x, this.npcSandDecoy.y, 0xddbb77);
            break;
          }
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
      if (!p.active) { p.destroy(); continue; }
      if (p.x < wb.left - 60 || p.x > wb.right + 60 || p.y < wb.top - 60 || p.y > wb.bottom + 60) {
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
      } else {
        entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio(entry.abilityId), entry.fill.height);
      }
    }
  }
}
