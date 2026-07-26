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
import { remainingMs } from '../combat/StatusEffects';
import { Ability, CastContext } from '../elements/Ability';
import { Element } from '../elements/Element';
import { HealthBar } from '../combat/HealthBar';
import { fireElement } from '../elements/fire';
import { waterElement } from '../elements/water';
import { lifeElement } from '../elements/life';
import { airElement, fireHitscan, fireBounceHitscan } from '../elements/air';
import { AIR } from '../elements/kits/AirVisuals';
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
import { MagnetKit, MagnetArenaApi } from '../elements/kits/MagnetKit';
import { LightKit, LightArenaApi } from '../elements/kits/LightKit';
import { IceKit, IceArenaApi } from '../elements/kits/IceKit';
import { CrystalKit, CrystalArenaApi } from '../elements/kits/CrystalKit';
import { EarthKit, EarthArenaApi } from '../elements/kits/EarthKit';
import { ShadowKit, ShadowArenaApi } from '../elements/kits/ShadowKit';
import { ElectricityKit, ElectricityArenaApi } from '../elements/kits/ElectricityKit';
import { TechnologyKit, TechArenaApi } from '../elements/kits/TechnologyKit';
import { ProjectileRegistry } from '../combat/ProjectileRegistry';
import { SlimeKit, SlimeArenaApi } from '../elements/kits/SlimeKit';
import { WaterKit, WaterArenaApi, Geyser } from '../elements/kits/WaterKit';
import { LifeKit, LifeArenaApi } from '../elements/kits/LifeKit';
import { GrowthKit, GrowthArenaApi } from '../elements/kits/GrowthKit';
import { metalElement } from '../elements/metal';
import { plasmaElement } from '../elements/plasma';
import { gunpowderElement } from '../elements/gunpowder';
import { rubberElement } from '../elements/rubber';
import { magicElement } from '../elements/magic';
import { technologyElement } from '../elements/technology';
import { silenceElement } from '../elements/silence';
import { echoElement } from '../elements/quantum';
import { EchoKit, EchoArenaApi } from '../elements/kits/EchoKit';
import { quantumElement } from '../elements/quantum-element';
import { SubterfugeKit, SubterfugeArenaApi } from '../elements/kits/SubterfugeKit';
import { OilKit, OilArenaApi } from '../elements/kits/OilKit';
import { FateKit, FateArenaApi } from '../elements/kits/FateKit';
import { SoundKit, SoundArenaApi } from '../elements/kits/SoundKit';
import { RubberKit, RubberArenaApi } from '../elements/kits/RubberKit';
import { SilenceKit, SilenceArenaApi } from '../elements/kits/SilenceKit';
import { FireKit, FireArenaApi } from '../elements/kits/FireKit';
import { AirKit, AirArenaApi } from '../elements/kits/AirKit';
import { GunpowderKit, GunpowderArenaApi } from '../elements/kits/GunpowderKit';
import { HuntKit, HuntArenaApi } from '../elements/kits/HuntKit';
import { HuntFx } from '../elements/kits/HuntVisuals';
import { MagicKit, MagicArenaApi } from '../elements/kits/MagicKit';
import { TimeKit, TimeArenaApi } from '../elements/kits/TimeKit';
import { PlasmaKit, PlasmaArenaApi } from '../elements/kits/PlasmaKit';
import { MetalKit, MetalArenaApi } from '../elements/kits/MetalKit';
import { GravityKit, GravityArenaApi } from '../elements/kits/GravityKit';
import { CreationKit, CreationArenaApi } from '../elements/kits/CreationKit';
import { SoulKit, SoulArenaApi } from '../elements/kits/SoulKit';
import { CosmeticsKit, CosmeticsArenaApi } from '../elements/kits/CosmeticsKit';
import { StatusHudKit, StatusHudArenaApi, CustomStatus } from '../elements/kits/StatusHudKit';
import { getAchievementDef } from '../data/Achievements';
import { getCosmeticDef } from '../data/Cosmetics';
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
import * as UI from '../ui';


interface AbilityBarEntry {
  fill: Phaser.GameObjects.Rectangle;
  abilityId: string;
  maxWidth: number;
  lbl?: Phaser.GameObjects.Text;
  /** Sub-label under the name — kits that swap the whole bar (Earth's Titan Form) rewrite it too. */
  desc?: Phaser.GameObjects.Text;
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

interface PainRainShadow {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Graphics;
  fireAt: number;
  x: number;
  y: number;
  fired: boolean;
  owner: 'player' | 'npc';
  damage: number;
  hitRadius: number;
  color: number;
}

interface GarlicTrap {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  owner: 'player' | 'npc';
  nextPulseAt: number;
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

// GravSlash, GravMeteorShadow, GravFirePuddle, GravMeteorRushShadow moved into GravityKit

interface PosSnapshot {
  x: number;
  y: number;
  t: number;
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
  gunpowder: gunpowderElement,
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
  gunpowder: 'elem-gunpowder',
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
  /** Kit-local projectiles shared for cross-cutting effects (goose bullet theft). */
  private techProjReg = new ProjectileRegistry();
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
  private campaign: { slot: 0 | 1 | 2; worldId: string; fightId: string; isChallenge: boolean; hardMode?: boolean } | null = null;
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
  private hpBarClotted?: Phaser.GameObjects.Rectangle;
  private hpBarText?: Phaser.GameObjects.Text;
  private readonly hpBarY = 18;
  private readonly hpBarW = 420;
  private readonly hpBarH = 24;
  private dodgeOnCooldown = false;
  private isDodging = false;
  private echoHypersenseNextDodgeAt = 0; // Echo Q+ Hypersense: internal auto-dodge throttle
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
  // Set true at match start if the mouse button that clicked the MenuScene
  // difficulty/start button is still physically held. While set, all pointer-down
  // input is suppressed until the button is released once, so no click-bound
  // ability auto-fires on the opening frames. Cleared by a one-shot pointerup.
  private pointerInputLatched = false;
  private nukeChanneling = false;
  private nukeChannelEnd = 0;
  private nukeLockStartTime = 0;

  // WaterKit
  private waterKit!: WaterKit;
  private lifeKit!: LifeKit;

  // Player water-specific state (Splash's downpour window lives in WaterKit)
  private playerGeyserBuffUntil = 0;

  // Life state lives in LifeKit — see src/elements/kits/LifeKit.ts

  // Player air-specific state. Every air world object (traps, hawks, lingering beams, the
  // character rig and its drafts) lives in AirKit — what stays here is the gameplay flags
  // other systems read.
  private grappleDodgeCharges = 0;
  private quickShotCharged = false;
  private airConsecutiveHits = 0;
  // Air upgrade state
  private airElectroHolding = false;
  private airElectroHeldSince = 0;
  private airElectroCharged = false;
  private isGrappling = false;
  private airBeamWalking = false;

  // NPC mirror state
  private npcSpeedMult = 1;
  // (NPC fire state moved to FireKit)
  private npcNukeChanneling = false;
  private npcNukeChannelEnd = 0;
  private npcGeyserBuffUntil = 0;
  private npcQuickShotCharged = false;
  private npcAirConsecutiveHits = 0;

  // SoundKit (manages all sound state)
  private soundKit!: SoundKit;
  // Air F upgrade extended dodge
  private grappleDodgeUntil = 0;
  private tornadoGrappleSlowUntil = 0;

  // Earth kit
  private earthKit!: EarthKit;

  // Shadow kit
  private shadowKit!: ShadowKit;

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

  // Growth — managed by GrowthKit
  private growthKit!: GrowthKit;
  // Generic toxic DOT status applied to the player (used by Death/Life kits)
  private playerToxicUntil = 0;
  private playerToxicDps = 0;
  private playerToxicTickAccum = 0;
  private playerToxicAura: Phaser.GameObjects.Arc | null = null;

  /**
   * Hunt's HUD only. Everything else about the element — all three forms, their abilities and
   * every world object they leave behind — lives in HuntKit; the scene keeps the three card
   * sets because the ability tray is its own furniture.
   */
  private huntNormalHudCards: Phaser.GameObjects.GameObject[] = [];
  private huntBeastHudCards: Phaser.GameObjects.GameObject[] = [];
  private huntHybridHudCards: Phaser.GameObjects.GameObject[] = [];
  private huntNormalFills: AbilityBarEntry[] = [];
  private huntBeastFills: AbilityBarEntry[] = [];
  private huntHybridFills: AbilityBarEntry[] = [];

  // ── Silence — managed by SilenceKit ──────────────────────────────
  private silenceKit!: SilenceKit;
  private silencePlayerYankUntil = 0; // read by movement lock, written by kit via api
  /** Bleed is a generic status (Amber mutation, husk statuses) — Hunt no longer applies it. */
  private playerBleeding = false;
  private playerBleedingUntil = 0;
  private playerBleedAura: Phaser.GameObjects.Arc | null = null;

  // Time kit (replaces all inline sand/Time state)
  private timeKit!: TimeKit;

  // Player upgrade state
  private activeUpgrades: string[] = [];
  /** Online: the remote player's owned upgrade slots (from the lobby handshake). */
  private npcUpgrades: string[] = [];
  /** Online: the remote player's mastery slot binds (from the lobby handshake). */
  private npcMasteryBinds: Record<string, string> = {};
  /** Online: whether the remote player has Element Mastery enabled. */
  private npcMasteryOn = false;
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
  private iceKit!: IceKit;
  private crystalKit!: CrystalKit;
  private techKit!: TechnologyKit;
  // Shared NPC cast ID field — set each frame after doAI() returns
  private npcCastId: string | null = null;

  // Slime kit
  private slimeKit!: SlimeKit;

  // (Fate state is now managed by FateKit)

  // Gravity kit
  private gravityKit!: GravityKit;

  // Creation — managed by CreationKit
  private creationKit!: CreationKit;

  // ── Magnet (electricity + slime abstract combined) ───────────────────
  private magnetKit!: MagnetKit;

  // ── Metal (electricity + fate abstract combined) — managed by MetalKit ─
  private metalKit!: MetalKit;

  // ── Soul — managed by SoulKit ─────────────────────────────────────────
  private soulKit!: SoulKit;

  // ── Plasma (electricity + light abstract combined) — managed by PlasmaKit ─
  private plasmaKit!: PlasmaKit;

  // ── Gunpowder — managed by GunpowderKit ──────────────────────────
  private gunpowderKit!: GunpowderKit;

  /**
   * Hunt Mastery only (Weak Points + Beastling). Base Hunt is still inline above —
   * the kit reads the state it needs through its adapter.
   */
  private huntKit!: HuntKit;
  private huntMasteryOn = false;

  // ── Rubber — managed by RubberKit ────────────────────────────────
  private rubberKit!: RubberKit;

  // ── Magic (abstract combined: slime + light) — managed by MagicKit ──
  private magicKit!: MagicKit;


  // ── Echo (abstract combined: fate + light) kit ───────────────────────
  private echoKit!: EchoKit;

  // ── Quantum (abstract combined: slime + fate) kit ─────────────────────
  private subterfugeKit!: SubterfugeKit;
  /** True while Dark Treachery replays a foreign element's Q — hasUpgrade() reports
   * false so copied ultimates never pick up Q+/upgrade behavior. */
  private foreignCastSuppress = false;

  // ── Oil kit ───────────────────────────────────────────────────────────
  private oilKit!: OilKit;

  // ── Fire kit ──────────────────────────────────────────────────────────
  private fireKit!: FireKit;
  private cosmeticsKit!: CosmeticsKit;
  /** Top-right status effect tray. Reads the local player's Fighter, so it works in every mode. */
  private statusHudKit!: StatusHudKit;
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
  // ── Metal mastery ─────────────────────────────────────────────────────
  private metalMasteryOn = false;
  // ── Acid (slime) mastery ──────────────────────────────────────────────
  private slimeMasteryOn = false;
  // ── Magnet mastery ────────────────────────────────────────────────────
  private magnetMasteryOn = false;
  // ── Time (sand) mastery ───────────────────────────────────────────────
  private timeMasteryOn = false;
  // ── Echo mastery ──────────────────────────────────────────────────────
  private echoMasteryOn = false;
  // ── Soul mastery ──────────────────────────────────────────────────────
  private soulMasteryOn = false;
  // ── Light mastery ─────────────────────────────────────────────────────
  private lightMasteryOn = false;

  // ── Shadow mastery ─────────────────────────────────────────────────────
  private shadowMasteryOn = false;
  private iceMasteryOn = false;
  private shadowMasteryTrackedEnemies = new WeakSet<Fighter>();

  // ── Crystal mastery ──────────────────────────────────────────────────
  private crystalMasteryOn = false;

  // ── Electricity mastery ────────────────────────────────────────────────
  private electricityMasteryOn = false;

  // ── Gravity mastery ─────────────────────────────────────────────────────
  private gravityMasteryOn = false;

  // ── Magic mastery ────────────────────────────────────────────────────────
  private magicMasteryOn = false;

  // ── Life mastery ──────────────────────────────────────────────────────
  private lifeMasteryOn = false;

  // ── Creation mastery ──────────────────────────────────────────────────
  private creationMasteryOn = false;
  private rubberMasteryOn = false;
  private technologyMasteryOn = false;
  private gunpowderMasteryOn = false;
  private growthMasteryOn = false;
  private subterfugeMasteryOn = false;
  private plasmaMasteryOn = false;
  private soundMasteryOn = false;
  private silenceMasteryOn = false;

  // ── Items kit ─────────────────────────────────────────────────────────
  private itemsKit!: ItemsKit;

  // ── Fate kit ──────────────────────────────────────────────────────────
  private fateKit!: FateKit;
  private fateMasteryOn = false;

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

  create(data: { elementId: string; enemyElementId?: string; difficulty?: number; mutations?: string[]; starredMutations?: string[]; mode?: string; invasionDifficulty?: string; gauntlet?: import('../data/GauntletData').GauntletState; playerPerk?: string | null; npcPerk?: string | null; campaign?: { slot: 0 | 1 | 2; worldId: string; fightId: string; isChallenge: boolean; hardMode?: boolean }; hpMult?: number; npcOutgoingDamageMult?: number; online?: { isHost: boolean; npcUpgrades?: string[]; npcMasteryBinds?: Record<string, string>; npcMasteryOn?: boolean; npcCosmetics?: Record<string, string> } }): void {
    this.elementId = data.elementId ?? 'fire';
    this.isInvasion = data.mode === 'invasion';
    this.isOnline = !!data.online;
    this.npcUpgrades = data.online?.npcUpgrades ?? [];
    this.npcMasteryBinds = data.online?.npcMasteryBinds ?? {};
    this.npcMasteryOn = data.online?.npcMasteryOn ?? false;
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
    this.techProjReg.clear();
    this.gameEnded = false;
    this.dodgeOnCooldown = false;
    this.isDodging = false;
    this.echoHypersenseNextDodgeAt = 0;
    this.abilityBars = [];
    this.hpBarFill = undefined;
    this.hpBarShield = undefined;
    this.hpBarClotted = undefined;
    this.hpBarText = undefined;
    // Reset perk-specific state
    this.purgePriorCooldownMult = 1;
    if (this.purgePulseTween) { this.purgePulseTween.stop(); this.purgePulseTween = null; }

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
    // Seed from the real pointer state rather than hardcoding false: the mouse button used to
    // click the difficulty/start button in MenuScene can still be physically down on the very
    // first Arena frame, and a hardcoded false reads that as a fresh click — instantly firing a
    // click-bound ability (e.g. Musket Shot) the moment the match starts.
    this.pointerWasDown = this.input.activePointer.isDown;
    this.rightPointerWasDown = this.input.activePointer.rightButtonDown();
    // If the mouse button is still down from clicking the difficulty/start button,
    // latch it out until released so continuous-fire click abilities (which check a
    // bare pointer.isDown / leftButtonDown() with no just-pressed guard) don't
    // auto-cast on the opening frames. Cleared by the first pointerup.
    this.pointerInputLatched = this.input.activePointer.leftButtonDown();
    if (this.pointerInputLatched) {
      this.input.once('pointerup', () => { this.pointerInputLatched = false; });
    }
    this.nukeChanneling = false;
    this.nukeChannelEnd = 0;

    this.playerGeyserBuffUntil = 0;

    this.npcSpeedMult = 1;
    this.npcNukeChanneling = false;
    this.npcNukeChannelEnd = 0;
    this.npcGeyserBuffUntil = 0;
    this.npcQuickShotCharged = false;
    this.npcAirConsecutiveHits = 0;

    this.grappleDodgeCharges = 0;
    this.quickShotCharged = false;
    this.airConsecutiveHits = 0;
    this.airElectroHolding = false;
    this.airElectroHeldSince = 0;
    this.airElectroCharged = false;
    this.isGrappling = false;
    this.airBeamWalking = false;

    this.npcCastId = null;

    this.npcAirElectroCharged = false;
    this.npcAirBeamWalking = false;

    // Soul kit construction / reset
    if (this.soulKit) {
      this.soulKit.reset();
    } else {
      const arena = this;
      const soulApi: SoulArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene() { return arena as Phaser.Scene; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElementId; },
        get isInvasion() { return arena.isInvasion; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        soulColor: (owner, base) => arena.cosmeticsKit.soulColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        dealAoeDamageFromOwner: (x, y, r, d, owner) => arena.dealAoeDamageFromOwner(x, y, r, d, owner),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        get masteryActive() { return arena.soulMasteryOn && arena.elementId === 'soul'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'soul'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'soul') PlayerData.addMasteryStat('soul', key, amount);
        },
      };
      this.soulKit = new SoulKit(soulApi);
    }

    this.playerBleeding = false;
    if (this.playerBleedAura) { this.playerBleedAura.destroy(); this.playerBleedAura = null; }
    this.huntNormalHudCards = []; this.huntBeastHudCards = []; this.huntHybridHudCards = [];
    this.huntNormalFills = []; this.huntBeastFills = []; this.huntHybridFills = [];

    // Hunt kit construction / reset — all three forms plus the mastery layer
    if (this.huntKit) {
      this.huntKit.reset();
    } else {
      const arena = this;
      const huntApi: HuntArenaApi = {
        get scene() { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElementId; },
        get isDodging() { return arena.isDodging; },
        set isDodging(v: boolean) { arena.isDodging = v; },
        get aimX() { return arena.input.activePointer.worldX; },
        get aimY() { return arena.input.activePointer.worldY; },
        huntColor: (owner, base) => arena.cosmeticsKit.huntColor(owner, base),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        dealAoeDamageFromOwner: (x, y, r, d, o, ex) => arena.dealAoeDamageFromOwner(x, y, r, d, o, ex),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setHudForm: (form) => arena.huntSetHudForm(form),
        get masteryActive() { return arena.huntMasteryOn && arena.elementId === 'hunt'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'hunt'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'hunt') PlayerData.addMasteryStat('hunt', key, amount);
        },
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
      };
      this.huntKit = new HuntKit(huntApi);
    }

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
        get spaceKey() { return arena.spaceKey; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get wKey() { return arena.wKey; },
        get aKey() { return arena.aKey; },
        get sKey() { return arena.sKey; },
        get dKey() { return arena.dKey; },
        get enemies() { return arena.enemies; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get isOnline() { return arena.isOnline; },
        get isInvasion() { return arena.isInvasion; },
        get masteryActive() { return arena.silenceMasteryOn && arena.elementId === 'silence'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'silence') PlayerData.addMasteryStat('silence', key, amount);
        },
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        sendHuskPuppet: (id, on, x, y) => arena.invasionCoopKit?.sendHuskPuppet(id, on, x, y),
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        setPlayerYankUntil: (t) => { arena.silencePlayerYankUntil = t; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        hasUpgrade: (owner, slot) => owner === 'player'
          ? arena.elementId === 'silence' && arena.hasUpgrade(slot)
          : arena.isOnline && arena.npcElement.id === 'silence' && arena.npcUpgrades.includes(slot),
        sendSilenceMsg: (msg) => { if (arena.isOnline) Net.send(msg); },
        silenceColor: (owner, base) => arena.cosmeticsKit.silenceColor(owner, base),
      };
      this.silenceKit = new SilenceKit(silenceApi);
    }

    // Time kit reset
    if (this.timeKit) { this.timeKit.reset(); }

    // Creation reset
    if (this.creationKit) {
      this.creationKit.reset();
    } else {
      const arena = this;
      const creationApi: CreationArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get spaceKey() { return arena.spaceKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get isDodging() { return arena.isDodging; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get aimX() { return arena.input.activePointer.worldX; },
        get aimY() { return arena.input.activePointer.worldY; },
        get npcSpeedMult() { return arena.npcSpeedMult; },
        set npcSpeedMult(v: number) { arena.npcSpeedMult = v; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
        pushFighterOutOfRect: (body, bx, by, bw, bh) => arena.pushFighterOutOfRect(body, bx, by, bw, bh),
        creationColor: (owner, base) => arena.cosmeticsKit.creationColor(owner, base),
        get abilityBars() { return arena.abilityBars; },
        get masteryActive() { return arena.creationMasteryOn && arena.elementId === 'creation'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'creation') PlayerData.addMasteryStat('creation', key, amount);
        },
      };
      this.creationKit = new CreationKit(creationApi);
    }

    // Gravity reset
    if (this.gravityKit) {
      this.gravityKit.reset();
    } else {
      const arena = this;
      const gravityApi: GravityArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get wKey() { return arena.wKey; },
        get aKey() { return arena.aKey; },
        get sKey() { return arena.sKey; },
        get dKey() { return arena.dKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElementId; },
        get aimX() { return arena.input.activePointer.worldX; },
        get aimY() { return arena.input.activePointer.worldY; },
        gravityColor: (owner, base) => arena.cosmeticsKit.gravityColor(owner, base),
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnQuakeWave: (owner, x, y) => arena.earthKit.spawnQuakeWave(owner, x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        get masteryActive() { return arena.gravityMasteryOn && arena.elementId === 'gravity'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'gravity') PlayerData.addMasteryStat('gravity', key, amount);
        },
      };
      this.gravityKit = new GravityKit(gravityApi);
    }

    // Growth reset
    if (this.growthKit) {
      this.growthKit.reset();
    } else {
      const arena = this;
      const growthApi: GrowthArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get hpBarY() { return arena.hpBarY; },
        get hpBarW() { return arena.hpBarW; },
        get hpBarH() { return arena.hpBarH; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get spaceKey() { return arena.spaceKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get abilityBars() { return arena.abilityBars; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        growthColor: (owner, base) => arena.cosmeticsKit.growthColor(owner, base),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'growth') PlayerData.addMasteryStat('growth', key, amount);
        },
        recordMasteryBest: (key, value) => {
          if (arena.elementId === 'growth') PlayerData.recordMasteryBest('growth', key, value);
        },
        getMasteryStat: (key) => PlayerData.getMasteryStat('growth', key),
        get masteryActive() { return arena.growthMasteryOn && arena.elementId === 'growth'; },
        get npcMasteryActive() { return arena.npcMasteryActive && arena.npcElement.id === 'growth'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
      };
      this.growthKit = new GrowthKit(growthApi);
    }
    this.playerToxicUntil = 0; this.playerToxicDps = 0; this.playerToxicTickAccum = 0;
    if (this.playerToxicAura) { this.playerToxicAura.destroy(); this.playerToxicAura = null; }

    // Each player always uses their own equipped upgrades — online too. The peer's
    // sim reproduces the opponent's upgraded abilities via the lobby handshake
    // (npcUpgrades → hasNpcUpgrade, honored in each kit's NPC replay path).
    this.activeUpgrades = PlayerData.getActiveUpgrades(this.elementId);
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
    this.metalMasteryOn = PlayerData.isMasteryEnabled('metal');
    this.slimeMasteryOn = PlayerData.isMasteryEnabled('slime');
    this.magnetMasteryOn = PlayerData.isMasteryEnabled('magnet');
    this.timeMasteryOn = PlayerData.isMasteryEnabled('sand');
    this.echoMasteryOn = PlayerData.isMasteryEnabled('echo');
    this.soulMasteryOn = PlayerData.isMasteryEnabled('soul');
    this.lightMasteryOn = PlayerData.isMasteryEnabled('light');
    this.shadowMasteryOn = PlayerData.isMasteryEnabled('shadow');
    this.iceMasteryOn = PlayerData.isMasteryEnabled('ice');
    this.crystalMasteryOn = PlayerData.isMasteryEnabled('crystal');
    this.electricityMasteryOn = PlayerData.isMasteryEnabled('electricity');
    this.gravityMasteryOn = PlayerData.isMasteryEnabled('gravity');
    this.magicMasteryOn = PlayerData.isMasteryEnabled('magic');
    this.creationMasteryOn = PlayerData.isMasteryEnabled('creation');
    this.fateMasteryOn = PlayerData.isMasteryEnabled('fate');
    this.rubberMasteryOn = PlayerData.isMasteryEnabled('rubber');
    this.technologyMasteryOn = PlayerData.isMasteryEnabled('technology');
    this.gunpowderMasteryOn = PlayerData.isMasteryEnabled('gunpowder');
    this.growthMasteryOn = PlayerData.isMasteryEnabled('growth');
    this.subterfugeMasteryOn = PlayerData.isMasteryEnabled('quantum');
    this.plasmaMasteryOn = PlayerData.isMasteryEnabled('plasma');
    this.huntMasteryOn = PlayerData.isMasteryEnabled('hunt');
    this.soundMasteryOn = PlayerData.isMasteryEnabled('sound');
    this.silenceMasteryOn = PlayerData.isMasteryEnabled('silence');
    this.waterKillWindow = [];
    this.waterMasteryTrackedEnemies = new WeakSet<Fighter>();
    this.shadowMasteryTrackedEnemies = new WeakSet<Fighter>();
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
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get masteryActive() { return arena.fireMasteryOn && arena.elementId === 'fire'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        lockCaster: (ms) => { arena.nukeChanneling = true; arena.nukeChannelEnd = arena.time.now + ms; (arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0); },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        fireColor: (owner, base) => arena.cosmeticsKit.fireColor(owner, base),
        unlockAchievement: (id) => arena.unlockAchievement(id),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        damagePlayerTargets: (cx, cy, r, d, col) => arena.damagePlayerTargets(cx, cy, r, d, col),
        dealFlameNukeDamage: (cx, cy, r, d) => arena.dealFlameNukeDamage(cx, cy, r, d),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'fire') PlayerData.addMasteryStat('fire', key, amount);
        },
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
        clearPlayerDots: () => {
          arena.playerBurningUntil = 0;
          arena.playerToxicUntil = 0;
          arena.playerBleeding = false;
          arena.playerBleedingUntil = 0;
        },
      };
      this.fireKit = new FireKit(fireApi);
    }
    // CosmeticsKit adapter — renders equipped cosmetics for both sides
    if (this.cosmeticsKit) {
      this.cosmeticsKit.reset();
    } else {
      const arena = this;
      const cosmeticsApi: CosmeticsArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
      };
      this.cosmeticsKit = new CosmeticsKit(cosmeticsApi);
    }
    this.cosmeticsKit.setLoadouts(
      PlayerData.getEquippedCosmetics(this.elementId),
      data.online?.npcCosmetics ?? {},
    );
    // StatusHudKit adapter — top-left effect indicator tray
    if (this.statusHudKit) {
      this.statusHudKit.reset();
    } else {
      const arena = this;
      const statusHudApi: StatusHudArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get isInvasion() { return arena.isInvasion; },
      };
      this.statusHudKit = new StatusHudKit(statusHudApi);
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
        get npcAimOffsetDeg() { return arena.npcDifficulty.aimOffsetDeg; },
        get masteryActive() { return arena.waterMasteryOn && arena.elementId === 'water'; },
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'water') PlayerData.addMasteryStat('water', key, amount);
        },
        isPlayerWater: () => arena.elementId === 'water',
        isNpcWater: () => arena.npcElement.id === 'water',
        waterColor: (owner, base) => arena.cosmeticsKit.waterColor(owner, base),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        lockCaster: (ms) => { arena.nukeChanneling = true; arena.nukeChannelEnd = arena.time.now + ms; (arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0); },
        releaseCaster: () => { arena.nukeChanneling = false; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
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
        get npc() { return arena.npc; },
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
        get isPlayerAir() { return arena.elementId === 'air'; },
        get isNpcAir() { return arena.npcElement.id === 'air'; },
        get isDodging() { return arena.isDodging; },
        get pointerX() { return arena.input.activePointer.worldX; },
        get pointerY() { return arena.input.activePointer.worldY; },
        get worldBounds() { return arena.physics.world.bounds; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'air') PlayerData.addMasteryStat('air', key, amount);
        },
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnHitFlash: (x, y, color) => arena.spawnHitFlash(x, y, color),
        airColor: (owner, base) => arena.cosmeticsKit.airColor(owner, base),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
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
        isNpcLife: () => arena.npcElementId === 'life',
        get masteryActive() { return arena.lifeMasteryOn && arena.elementId === 'life'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        lifeColor: (owner, base) => arena.cosmeticsKit.lifeColor(owner, base),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
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
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get npcCastId() { return arena.npcCastId; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        electricityColor: (owner, base) => arena.cosmeticsKit.electricityColor(owner, base),
        get playerSpeedMult() { return arena.playerSpeedMult; },
        set playerSpeedMult(v: number) { arena.playerSpeedMult = v; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        get masteryActive() { return arena.electricityMasteryOn && arena.elementId === 'electricity'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'electricity') PlayerData.addMasteryStat('electricity', key, amount);
        },
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
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        soundColor: (owner, base) => arena.cosmeticsKit.soundColor(owner, base),
        get masteryActive() { return arena.soundMasteryOn && arena.elementId === 'sound'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'sound'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'sound') PlayerData.addMasteryStat('sound', key, amount);
        },
        recordMasteryBestStat: (key, value) => {
          if (arena.elementId === 'sound') PlayerData.recordMasteryBest('sound', key, value);
        },
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
        get hpBarY() { return arena.hpBarY; },
        get hpBarW() { return arena.hpBarW; },
        get hpBarH() { return arena.hpBarH; },
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        lightColor: (owner, base) => arena.cosmeticsKit.lightColor(owner, base),
        get masteryActive() { return arena.lightMasteryOn && arena.elementId === 'light'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'light'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'light') PlayerData.addMasteryStat('light', key, amount);
        },
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
      };
      this.lightKit = new LightKit(lightApi);
    }

    // IceKit adapter
    if (this.iceKit) {
      this.iceKit.reset();
    } else {
      const arena = this;
      const iceApi: IceArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get isInvasion() { return arena.isInvasion; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        pointToSegmentDist: (px, py, ax, ay, bx, by) => arena.pointToSegmentDist(px, py, ax, ay, bx, by),
        iceColor: (owner, base) => arena.cosmeticsKit.iceColor(owner, base),
        get masteryActive() { return arena.iceMasteryOn && arena.elementId === 'ice'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'ice') PlayerData.addMasteryStat('ice', key, amount);
        },
      };
      this.iceKit = new IceKit(iceApi);
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
        crystalColor: (owner, base) => arena.cosmeticsKit.crystalColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        get masteryActive() { return arena.crystalMasteryOn && arena.elementId === 'crystal'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'crystal') PlayerData.addMasteryStat('crystal', key, amount);
        },
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
        earthColor: (owner, base) => arena.cosmeticsKit.earthColor(owner, base),
      };
      this.earthKit = new EarthKit(earthApi);
      this.earthKit.reset();
    }

    // ShadowKit adapter
    if (this.shadowKit) {
      this.shadowKit.reset();
    } else {
      const arena = this;
      const shadowApi: ShadowArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get eKey() { return arena.eKey; },
        get fKey() { return arena.fKey; },
        get rKey() { return arena.rKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get npcSpeedMult() { return arena.npcSpeedMult; },
        get npcNukeChanneling() { return arena.npcNukeChanneling; },
        set npcNukeChanneling(v: boolean) { arena.npcNukeChanneling = v; },
        get hpBarY() { return arena.hpBarY; },
        get hpBarW() { return arena.hpBarW; },
        get hpBarH() { return arena.hpBarH; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        shadowColor: (owner, base) => arena.cosmeticsKit.shadowColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        get masteryActive() { return arena.shadowMasteryOn && arena.elementId === 'shadow'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'shadow') PlayerData.addMasteryStat('shadow', key, amount);
        },
      };
      this.shadowKit = new ShadowKit(shadowApi);
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
        get pointerWasDown() { return arena.pointerWasDown; },
        get projectiles() { return arena.projectiles; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get npcCastId() { return arena.npcCastId; },
        acidColor: (owner, base) => arena.cosmeticsKit.acidColor(owner, base),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        get masteryActive() { return arena.slimeMasteryOn && arena.elementId === 'slime'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'slime'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'slime') PlayerData.addMasteryStat('slime', key, amount);
        },
        recordMasteryBest: (key, value) => {
          if (arena.elementId === 'slime') PlayerData.recordMasteryBest('slime', key, value);
        },
      };
      this.slimeKit = new SlimeKit(slimeApi);
    }

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
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        magnetColor: (owner, base) => arena.cosmeticsKit.magnetColor(owner, base),
        get masteryActive() { return arena.magnetMasteryOn && arena.elementId === 'magnet'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'magnet'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'magnet') PlayerData.addMasteryStat('magnet', key, amount);
        },
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
        get npcElementId() { return arena.npcElement.id; },
        get npcCastId() { return arena.npcCastId; },
        metalColor: (owner, base) => arena.cosmeticsKit.metalColor(owner, base),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (perkId) => arena.hasPerk('player', perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        get projectiles() { return arena.projectiles; },
        get masteryActive() { return arena.metalMasteryOn && arena.elementId === 'metal'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'metal'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'metal') PlayerData.addMasteryStat('metal', key, amount);
        },
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
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get npcCastId() { return arena.npcCastId; },
        plasmaColor: (owner, base) => arena.cosmeticsKit.plasmaColor(owner, base),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (mx, my) => arena.buildPlayerContext(mx, my),
        dealAoeDamage: (cx, cy, radius, damage, owner) => arena.dealAoeDamageFromOwner(cx, cy, radius, damage, owner),
        get masteryActive() { return arena.plasmaMasteryOn && arena.elementId === 'plasma'; },
        get npcMasteryActive() { return arena.npcMasteryActive && arena.npcElement.id === 'plasma'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'plasma') PlayerData.addMasteryStat('plasma', key, amount);
        },
      };
      this.plasmaKit = new PlasmaKit(plasmaApi);
    }

    // ── Gunpowder kit ─────────────────────────────────────────
    if (this.gunpowderKit) {
      this.gunpowderKit.reset();
    } else {
      const arena = this;
      const gunpowderApi: GunpowderArenaApi = {
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
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get npcCastId() { return arena.npcCastId; },
        gunpowderColor: (owner, base) => arena.cosmeticsKit.gunpowderColor(owner, base),
        get isDodging() { return arena.isDodging; },
        set isDodging(v: boolean) { arena.isDodging = v; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        applyPlayerSpeedMult: (f) => { arena.playerSpeedMult *= f; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        dealAoeDamageFromOwner: (x, y, r, d, o, ex) => arena.dealAoeDamageFromOwner(x, y, r, d, o, ex),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        get masteryActive() { return arena.gunpowderMasteryOn && arena.elementId === 'gunpowder'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'gunpowder'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'gunpowder') PlayerData.addMasteryStat('gunpowder', key, amount);
        },
        recordMasteryBestStat: (key, value) => {
          if (arena.elementId === 'gunpowder') PlayerData.recordMasteryBest('gunpowder', key, value);
        },
        getMasteryStat: (key) => PlayerData.getMasteryStat('gunpowder', key),
      };
      this.gunpowderKit = new GunpowderKit(gunpowderApi);
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
        get isPlayerRubber() { return arena.elementId === 'rubber'; },
        get isNpcRubber() { return arena.npcElement?.id === 'rubber'; },
        rubberColor: (owner, base) => arena.cosmeticsKit.rubberColor(owner, base),
        get isDodging() { return arena.isDodging; },
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
        get masteryActive() { return arena.rubberMasteryOn && arena.elementId === 'rubber'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'rubber') PlayerData.addMasteryStat('rubber', key, amount);
        },
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
        get isPlayerMagic() { return arena.elementId === 'magic'; },
        get isNpcMagic() { return arena.npcElement?.id === 'magic'; },
        magicColor: (owner, base) => arena.cosmeticsKit.magicColor(owner, base),
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
        get masteryActive() { return arena.magicMasteryOn && arena.elementId === 'magic'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'magic') PlayerData.addMasteryStat('magic', key, amount);
        },
        getMasteryStat: (key) => PlayerData.getMasteryStat('magic', key),
        recordMasteryBestStat: (key, value) => {
          if (arena.elementId === 'magic') PlayerData.recordMasteryBest('magic', key, value);
        },
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
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get isInvasion() { return arena.isInvasion; },
        get isOnline() { return arena.isOnline; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get projGroup() { return arena.projectiles; },
        get projReg() { return arena.techProjReg; },
        hasUpgrade: (owner, slot) => owner === 'player'
          ? arena.hasUpgrade(slot)
          : arena.isOnline && arena.npcUpgrades.includes(slot),
        sendTechMsg: (msg) => { if (arena.isOnline) Net.send(msg); },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        get masteryActive() { return arena.technologyMasteryOn && arena.elementId === 'technology'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'technology') PlayerData.addMasteryStat('technology', key, amount);
        },
        recordMasteryBest: (key, value) => {
          if (arena.elementId === 'technology') PlayerData.recordMasteryBest('technology', key, value);
        },
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
        technologyColor: (owner, base) => arena.cosmeticsKit.technologyColor(owner, base),
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
        get spaceKey() { return arena.spaceKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get aimX() { return arena.input.activePointer.worldX; },
        get aimY() { return arena.input.activePointer.worldY; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        sandColor: (owner, base) => arena.cosmeticsKit.sandColor(owner, base),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        buildNpcContext: (x, y) => arena.buildNpcContext(x, y),
        dealAoeDamageFromOwner: (x, y, r, d, o) => arena.dealAoeDamageFromOwner(x, y, r, d, o),
        get masteryActive() { return arena.timeMasteryOn && arena.elementId === 'sand'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'sand'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'sand') PlayerData.addMasteryStat('sand', key, amount);
        },
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
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
        get spaceKey() { return arena.spaceKey; },
        get projectiles() { return arena.projectiles; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get npcElementId() { return arena.npcElement?.id ?? ''; },
        get npcCastId() { return arena.npcCastId; },
        get masteryActive() { return arena.echoMasteryOn && arena.elementId === 'echo'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'echo') PlayerData.addMasteryStat('echo', key, amount);
        },
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
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
        isEclipseRevealActive: () => arena.echoKit?.isEclipseRevealActive() ?? false,
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        echoColor: (owner, base) => arena.cosmeticsKit.echoColor(owner, base),
      };
      this.echoKit = new EchoKit(echoApi);
    }
    // The kit owns the fog render texture; it only needs to know whether anyone is playing Echo.
    this.echoKit.reset(this.elementId === 'echo' || this.npcElement?.id === 'echo');

    // Subterfuge kit
    if (this.subterfugeKit) {
      this.subterfugeKit.reset();
    } else {
      const arena = this;
      /** Run a Dark Treachery copy with upgrade lookups suppressed (no Q+ effects). */
      const foreign = (fn: () => void): void => {
        arena.foreignCastSuppress = true;
        try { fn(); } finally { arena.foreignCastSuppress = false; }
      };
      const subterfugeApi: SubterfugeArenaApi = {
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
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get sceneWidth() { return arena.scale.width; },
        get sceneHeight() { return arena.scale.height; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        dealAoeDamage: (owner, cx, cy, r, d) => arena.dealAoeDamageFromOwner(cx, cy, r, d, owner),
        castForeignQ: (elementId, owner) => {
          const el = ELEMENT_MAP[elementId];
          const q = el?.abilities.find((a) => a.isUltimate);
          if (!q) return false;
          foreign(() => {
            if (owner === 'player') {
              const ptr = arena.input.activePointer;
              q.cast(arena.buildPlayerContext(ptr.worldX, ptr.worldY));
            } else {
              q.cast(arena.buildNpcContext(arena.player.x, arena.player.y));
            }
          });
          return true;
        },
        earthGolem: (owner) => foreign(() => arena.earthKit.spawnEarthGolem(owner === 'player')),
        oilTrain: (owner) => foreign(() => arena.oilKit.doStartTrainMorph(owner)),
        iceFrozenSolidNoFrost: (owner, tx, ty) => foreign(() => {
          if (owner === 'player') arena.iceKit.doFireFrozenSolid(tx, ty, true);
          else arena.iceKit.doNpcFireFrozenSolid(tx, ty, true);
        }),
        timeAlwaysNoonForced: (owner) => foreign(() => arena.timeKit.doTimeAlwaysNoon(owner, true)),
        lightSpeedOLight: (owner) => foreign(() => arena.lightKit.startSpeedOLight(owner, arena.time.now)),
        echoEclipseDirect: (owner) => foreign(() => {
          const target = owner === 'player' ? arena.npc : arena.player;
          arena.echoKit.doEclipse(target.x, target.y, owner);
        }),
        magicNecronomicon: (owner) => foreign(() => {
          if (owner === 'player') arena.magicKit.foreignOpenNecronomicon(arena.time.now);
          else arena.magicKit.npcCastNecronomiconWedge(arena.player.x, arena.player.y);
        }),
        crystalClonePositions: (owner) => arena.crystalKit.getClonePositions(owner === 'player'),
        get masteryActive() { return arena.subterfugeMasteryOn && arena.elementId === 'quantum'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'quantum'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'quantum') PlayerData.addMasteryStat('quantum', key, amount);
        },
        recordMasteryBestStat: (key, value) => {
          if (arena.elementId === 'quantum') PlayerData.recordMasteryBest('quantum', key, value);
        },
        getMasteryStat: (key) => PlayerData.getMasteryStat('quantum', key),
        allElementIds: () => Object.keys(ELEMENT_MAP),
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
        subterfugeColor: (owner, base) => arena.cosmeticsKit.subterfugeColor(owner, base),
      };
      this.subterfugeKit = new SubterfugeKit(subterfugeApi);
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
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'oil') PlayerData.addMasteryStat('oil', key, amount);
        },
        oilColor: (owner, base) => arena.cosmeticsKit.oilColor(owner, base),
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
        get enemies() { return arena.enemies; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get nukeChanneling() { return arena.nukeChanneling; },
        get rightPointerWasDown() { return arena.rightPointerWasDown; },
        get isPlayerFate() { return arena.elementId === 'fate'; },
        fateColor: (owner, base) => arena.cosmeticsKit.fateColor(owner, base),
        hasPerk: (perkId) => arena.hasPerk('player', perkId),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        get masteryActive() { return arena.fateMasteryOn && arena.elementId === 'fate'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'fate') PlayerData.addMasteryStat('fate', key, amount);
        },
        applyPlayerSpeedMult: (f) => { arena.playerSpeedMult *= f; },
        applyNpcSpeedMult: (f) => { arena.npcSpeedMult *= f; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
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
    this.playerHealNumAccum = 0; this.npcHealNumAccum = 0;
    this.playerHealNumTimer = 0; this.npcHealNumTimer = 0;
    this.player.onHeal = (amt) => {
      this.playerHealNumAccum += amt;
      if (this.elementId === 'life') PlayerData.addMasteryStat('life', 'selfHealed', Math.round(amt));
      if (this.elementId === 'shadow') PlayerData.addMasteryStat('shadow', 'healedHp', Math.round(amt));
    };
    this.player.onDamaged = (amt) => {
      // Block Up reduces incoming damage by 25% (a 0.75 multiplier folded into incomingDamageMultiplier);
      // the damage that 25% cut avoided is derived from the final post-mitigation amount: amt/0.75*0.25 = amt/3.
      if (this.elementId === 'ice' && this.iceKit.isPlayerBlockUpActive()) {
        PlayerData.addMasteryStat('ice', 'blockUpDamageAvoided', Math.round(amt / 3));
      }
      // Rubber Mastery — Vulcanization cures off damage soaked.
      if (this.elementId === 'rubber') this.rubberKit.onPlayerDamaged(amt);
    };
    this.npc = new NpcOpponent(this, W - 180, cy, this.npcElement, npcTexture, difficultyConfig);
    this.npc.onHeal = (amt) => { this.npcHealNumAccum += amt; };
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
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
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
          fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
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
          get scene() { return arena; },
          get player() { return arena.player; },
          get npc() { return arena.npc; },
          applySelfDamage: (n) => arena.player.applySelfDamage(n),
          applyPlayerSpeedMult: (f) => { arena.gauntletSpeedMult *= f; },
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
          if (this.growthKit.trySporeBlock('npc', proj)) return;
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
        // Invasion co-op: every npc-owned projectile here came out of an ally's
        // replayed cast (husks fire their own shots, not Projectiles). Ignoring it
        // whole stops the on-hit riders — burns, poisons, frost, stuns — as well as
        // the damage, which the block in Fighter.takeDamage alone wouldn't.
        if (this.player.allyDamageBlocked) return;
        if (this.growthKit.trySporeBlock('player', proj)) return;
        // Time lasso orb (NPC fires): route to TimeKit
        if (proj.texture.key === 'proj-time-lasso-orb') {
          this.timeKit.onLassoHitPlayer(proj);
          return;
        }
        // Diamond Shard (crystal kite) that rebounded off a moving mirror: pierces enemies
        if (proj.texture.key === 'proj-crystal-kite' && (proj as any).kitePierce) {
          this.crystalKit.onKiteHitEnemy(proj, this.player);
          return; // proj NOT deactivated — keeps flying through
        }
        // E+ shadow consume: immune to damage while consuming
        if (this.elementId === 'shadow' && this.shadowKit.isConsumeActive()) {
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
          if (this.grappleDodgeCharges === 0) this.airKit.setDodgeAura(false);
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
        // Gravity Mastery — Gravity Aura: 20% chance to catch the projectile instead of taking the hit.
        if (this.elementId === 'gravity' && this.gravityKit.tryCatchProjectile(proj)) {
          return;
        }
        // Fighter.dodgeChance roll (stacks from Light upgrades and other sources)
        if (this.player.rollDodge()) {
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
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
        // Water: the opponent's dehydration (Siphon / Dehydration upgrade) amplifies the hit online.
        if (this.npcElement.id === 'water') {
          _playerDmg = Math.round(_playerDmg * this.waterKit.computeOutgoingMultiplier(this.player, 'npc'));
        }
        this.player.takeDamage(_playerDmg);
        this.spawnHitFlash(proj.x, proj.y, 0x00aaff);
        // Fate Infect: applies the poison DOT on top of the direct hit above
        if ((proj as any).fateInfectDps) {
          this.fateKit.applyPoison(this.player, (proj as any).fateInfectDps, this.time.now, (proj as any).fateInfectDurMs ?? 3000);
        }
        // Honor parry: if this was a parried player projectile, force-tally
        this.applyHonorParriedHit(proj);
        // Molten★: 20% chance to apply Fire DOT on hit
        if (this.mutations.has('molten') && this.starredMutations.has('molten') && Math.random() < 0.20) {
          this.playerBurningUntil = Math.max(this.playerBurningUntil, this.time.now + 3000);
        }
        // Ice spike: frost stacks + unfreeze bonus
        if (proj.texture.key === 'proj-ice') {
          this.iceKit.onIceSpikeHitPlayer(this.time.now);
        }
        // Magic (NPC) thorn vine hit
        if ((proj as any).isMagicThornVine && (proj as any).thornVineOwner === 'npc') {
          this.magicKit.onThornVineHit(this.player, 'npc');
        }
        // Magic (NPC) thorn prison hit
        if ((proj as any).isMagicThornPrison && (proj as any).thornPrisonOwner === 'npc') {
          this.magicKit.onThornPrisonHit(this.player.x, this.player.y, 'npc');
        }
        // Acid Purge ball: apply the stat-strip status on top of the generic damage above
        if (proj.texture.key === 'proj-purge') {
          this.slimeKit.onPurgeHit(this.player, proj, this.time.now);
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

    // Subterfuge Mastery — Smoke Break: every hit taken burns a second off the cigarette
    this.player.on('damaged', (amount: number) => {
      this.subterfugeKit.onDamageReceived('player', amount);
    });
    this.npc.on('damaged', (amount: number) => {
      this.subterfugeKit.onDamageReceived('npc', amount);
    });

    // Plasma Mastery — Unstable Orbital: damage dealt shoves the caster's orbital back out.
    // A hit landing on the NPC is damage the player dealt, and vice versa.
    this.npc.on('damaged', (amount: number) => {
      if (this.npc.damageWasSelfInflicted) return;
      this.plasmaKit.onDamageDealt('player', amount);
    });
    this.player.on('damaged', (amount: number) => {
      if (this.player.damageWasSelfInflicted) return;
      this.plasmaKit.onDamageDealt('npc', amount);
    });

    // Metal: passive blood puddle every 50 damage dealt
    this.npc.on('damaged', (amount: number) => {
      if (this.elementId !== 'metal' || amount <= 0) return;
      this.metalKit.onDamageDealt('player', amount);
    });
    this.player.on('damaged', (amount: number) => {
      if (this.npcElement.id !== 'metal' || amount <= 0) return;
      this.metalKit.onDamageDealt('npc', amount);
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
          isPlayerInvisible: () => (arena.elementId === 'silence' && arena.silenceKit.isInvisible('player'))
            || (arena.elementId === 'technology' && (arena.techKit.isPlayerSheltered() || arena.techKit.isPlayerAdminInvisible())),
          playerStealth: () => arena.elementId === 'silence' ? arena.silenceKit.getStealth('player') : 0,
          setRemoteStealth: (v) => arena.silenceKit.setNetStealth(v),
          onTechMsg: (msg) => arena.techKit.handleNetMsg(msg),
          onSilenceMsg: (msg) => arena.silenceKit.handleNetMsg(msg),
          replayNpcMastery: (enhId, tx, ty) => arena.replayNpcMastery(enhId, tx, ty),
          npcSpeedMult: () => arena.npcSpeedMult,
          gameNow: () => arena.time.now,
        };
        this.onlineKit = new OnlineKit(api);
      }
      this.onlineKit.reset();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onlineKit?.detach());
    }
    if (this.isOnline) {
      this.onlinePingText = this.add.text(this.scale.width - 12, 40, '', {
        fontSize: '12px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#88ccbb',
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
    // Growth: Auxiliary Growth clone — inhabit it instead of dying
    this.player.on('damaged', (amount: number) => {
      if (this.elementId !== 'growth' || amount <= 0) return;
      this.growthKit.onPlayerDamaged();
    });
    this.npc.on('damaged', (n: number) => {
      this.spawnDamageNumber(this.npc.x, this.npc.y - 34, n);
    });
    this.npc.on('damaged', (amount: number) => {
      if (this.npcElement.id !== 'growth' || amount <= 0) return;
      this.growthKit.onNpcDamaged();
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

    // ── Creation: spawn nexus ──────────────────────────────────────
    if (this.elementId === 'creation' || this.npcElementId === 'creation') {
      this.creationKit.spawnNexus(cx, cy);
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
          addFrostStackTo: (t) => arena.iceKit.addFrostStackTo(t),
          applyBleedVisual: (t) => arena.applyBleedVisualTo(t),
          isSilencePlayerHidden: () => arena.elementId === 'silence'
            && (arena.silenceKit.isInvisible('player') || arena.silenceKit.isRunChaseActive()),
          silenceStalkerHunt: () => arena.elementId === 'silence'
            && arena.silenceKit.isInvisible('player') && arena.silenceKit.stalkersAlive('player') > 0,
          tryHitSilenceStalker: (x, y, r) => arena.silenceKit.tryHitStalker(x, y, r, 'husk'),
          notifyHuskDefeated: (h) => { if (arena.elementId === 'soul') arena.soulKit.onRealHuskKilled(h); },
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

    // Soul: corpse-queue HUD is built lazily by SoulKit itself.
    // ElectricityKit creates its own HUD in reset() when isPlayerElement=true
    if (this.elementId === 'slime') {
      this.slimeKit.startMatch(W, H, true);
    }
    // Magnet: spawn 4 rods at corners; NPC magnet also gets rods
    if (this.elementId === 'magnet' || this.npcElement.id === 'magnet') {
      const owner = this.elementId === 'magnet' ? 'player' : 'npc';
      this.magnetKit.spawnCornerRods(W, H, owner, this.hasPerk(owner, 'blade'));
    }
    // Time element: charge bar rendered per-frame above player; no separate HUD text needed
    // Metal: arsenal HUD bar
    if (this.elementId === 'metal') {
      this.metalKit.initHud();
    }
    if (this.elementId === 'gunpowder') {
      this.gunpowderKit.initArsenalHud(cx);
    }
  }

  /**
   * Show (or with `null`, clear) an element-specific effect in the top-right status tray.
   * Only for effects with no generic `Fighter` field behind them — anything in
   * `STATUS_DESCRIPTORS` already appears automatically. Player-side only; the tray shows
   * what is on you, so kits must not register the npc's copy of an effect.
   */
  setStatusIndicator(id: string, status: CustomStatus | null): void {
    this.statusHudKit?.setCustom(id, status);
  }

  /** The mastery enhancement id bound over the given ability slot this match, or null. */
  private masteryBindFor(slot: string): string | null {
    return this.masterySlotBinds[slot] ?? null;
  }

  /** Online: the mastery enhancement the opponent bound over the given slot, or null. */
  npcMasteryBindFor(slot: string): string | null {
    if (!this.isOnline || !this.npcMasteryOn) return null;
    return this.npcMasteryBinds[slot] ?? null;
  }

  /** Online: whether the opponent has Element Mastery enabled (drives their passives). */
  get npcMasteryActive(): boolean {
    return this.isOnline && this.npcMasteryOn;
  }

  /**
   * Broadcast a bindable mastery ability the local player just cast, so the peer's
   * sim can replay it (see {@link replayNpcMastery}). Kits call this on cast.
   */
  broadcastMasteryCast(enhId: string): void {
    if (this.isOnline) this.onlineKit?.sendMasteryCast(enhId);
  }

  /**
   * Online: replay a bindable mastery ability the opponent just cast. Their cast is
   * broadcast as a normal `{t:'cast', id}` with the enhancement id; OnlineKit routes
   * ids it can't find in `element.abilities` here, and we dispatch to the owning kit's
   * NPC-side handler so the effect resolves on this (victim) sim. Unimplemented
   * masteries are a harmless no-op.
   */
  replayNpcMastery(enhId: string, tx: number, ty: number): void {
    switch (enhId) {
      case 'starfall':
        if (this.npcElement.id === 'gravity') this.gravityKit.doNpcStarfall(tx, ty);
        break;
      // Silence Mastery — Puppetmaster. The awakened moveset broadcasts one id per
      // resolved action so this sim, which owns the possessed body, applies the same
      // branch the puppeteer saw rather than re-deriving it from a cursor position.
      case 'puppet-slash':
      case 'puppet-bite':
      case 'puppet-eat':
      case 'puppet-cannibal':
      case 'puppet-raise':
      case 'puppet-slam':
        if (this.npcElement.id === 'silence') this.silenceKit.doNpcPuppetAct(enhId, tx, ty);
        break;
      case 'beastling':
        if (this.npcElement.id === 'hunt') this.huntKit.doNpcBeastling();
        break;
      case 'bugle':
        if (this.npcElement.id === 'sound') this.soundKit.doNpcBugle(tx, ty);
        break;
      case 'heatwave':
        if (this.npcElement.id === 'fire') this.fireKit.doNpcHeatwave(tx, ty);
        break;
      case 'kinetic-bomb':
        if (this.npcElement.id === 'electricity') this.electricityKit.doNpcKineticBomb(tx, ty);
        break;
      case 'siphon':
        if (this.npcElement.id === 'water') this.waterKit.doNpcSiphon(tx, ty);
        break;
      case 'sweeping-tornado':
        if (this.npcElement.id === 'air') this.airKit.doNpcTornado(tx, ty);
        break;
      case 'transmogrify':
        if (this.npcElement.id === 'magic') this.magicKit.doNpcTransmogrify(tx, ty);
        break;
      case 'shadow-beacon':
        if (this.npcElement.id === 'shadow') this.shadowKit.doNpcShadowBeacon(tx, ty);
        break;
      case 'icicle-impale':
        if (this.npcElement.id === 'ice') this.iceKit.doNpcIcicleImpale();
        break;
      case 'curling-stone':
        if (this.npcElement.id === 'ice') this.iceKit.doNpcCurlingStone(tx, ty);
        break;
      case 'crystal-shredder':
        if (this.npcElement.id === 'crystal') this.crystalKit.doNpcShredder(tx, ty);
        break;
      case 'dust-screen':
        if (this.npcElement.id === 'earth') this.earthKit.doNpcDustScreen(tx, ty);
        break;
      case 'turret':
        if (this.npcElement.id === 'oil') this.oilKit.doNpcTurret(tx, ty);
        break;
      case 'steel-shield':
        if (this.npcElement.id === 'metal') this.metalKit.doNpcSteelShield(tx, ty);
        break;
      case 'breakdown':
        if (this.npcElement.id === 'slime') this.slimeKit.doNpcBreakdown(tx, ty);
        break;
      case 'mag-lev':
        if (this.npcElement.id === 'magnet') this.magnetKit.doNpcMagLev();
        break;
      // Time Bomb is three separate signals: throw, arm, detonate (the caster owns the timing).
      case 'time-bomb':
        if (this.npcElement.id === 'sand') this.timeKit.doNpcTimeBomb(tx, ty);
        break;
      case 'time-bomb-arm':
        if (this.npcElement.id === 'sand') this.timeKit.doNpcTimeBombArm();
        break;
      case 'time-bomb-boom':
        if (this.npcElement.id === 'sand') this.timeKit.doNpcTimeBombDetonate(false);
        break;
      case 'time-bomb-boom-perfect':
        if (this.npcElement.id === 'sand') this.timeKit.doNpcTimeBombDetonate(true);
        break;
      // Echo Bloom is four separate signals: plant, shoot, hop, warp.
      case 'echo-bloom':
        if (this.npcElement.id === 'echo') this.echoKit.doNpcEchoBloom(tx, ty);
        break;
      case 'echo-bloom-shot':
        if (this.npcElement.id === 'echo') this.echoKit.doNpcBloomShot(tx, ty);
        break;
      case 'echo-bloom-cycle':
        if (this.npcElement.id === 'echo') this.echoKit.doNpcBloomCycle();
        break;
      case 'echo-bloom-warp':
        if (this.npcElement.id === 'echo') this.echoKit.doNpcBloomWarp();
        break;
      case 'killer-kebab':
        if (this.npcElement.id === 'light') this.lightKit.doNpcKillerKebab();
        break;
      case 'mortar-command':
        if (this.npcElement.id === 'creation') this.creationKit.doNpcMortarCommand(tx, ty);
        break;
      case 'unstable-orbital':
        if (this.npcElement.id === 'plasma') this.plasmaKit.doNpcUnstableOrbital();
        break;
      case 'atom-nhilego':
        if (this.npcElement.id === 'rubber') this.rubberKit.doNpcAtomNhilego();
        break;
      case 'byte-bomb':
        if (this.npcElement.id === 'technology') this.techKit.doNpcByteBomb(tx, ty);
        break;
      case 'overload':
        if (this.npcElement.id === 'gunpowder') this.gunpowderKit.doNpcOverload();
        break;
      case 'syringe-shot':
        if (this.npcElement.id === 'growth') this.growthKit.doNpcSyringeShot(tx, ty);
        break;
      // Smoke Break is two signals: lighting up, then flicking the butt away.
      case 'smoke-break':
        if (this.npcElement.id === 'quantum') this.subterfugeKit.doNpcSmokeBreak();
        break;
      case 'smoke-break-toss':
        if (this.npcElement.id === 'quantum') this.subterfugeKit.doNpcSmokeToss(tx, ty);
        break;
      default:
        break;
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────

  private createHUD(W: number, H: number): void {
    const hudY = H - 30;
    const cardW = 130;
    const cardH = 48;
    // Hunt, Silence, and Gunpowder have extra abilities beyond the first 5; only show 5 at a time
    const abilities = (this.elementId === 'hunt' || this.elementId === 'silence' || this.elementId === 'gunpowder')
      ? this.playerElement.abilities.slice(0, 5)
      : this.playerElement.abilities;

    // Ability tray: a machined band, not a flat strip. Lit rule along the top
    // edge with etched ticks, so the bar reads as part of the same UI as the
    // menus rather than a black box taped to the screen.
    const trayTop = hudY - (cardH + 4) / 2;
    const tray = this.add.graphics().setDepth(20);
    UI.fillNotchedGradient(tray, 0, trayTop, W, cardH + 4,
      UI.mix(UI.C.void_, UI.C.arcane, 0.1), UI.C.void_, 0.96, 0, UI.ALL_CORNERS, 10);
    tray.lineStyle(2, UI.C.arcane, 0.4);
    tray.beginPath(); tray.moveTo(20, trayTop); tray.lineTo(W - 20, trayTop); tray.strokePath();
    tray.lineStyle(1, UI.C.arcane, 0.14);
    for (let tx = 40; tx < W - 40; tx += 14) {
      tray.beginPath(); tray.moveTo(tx, trayTop + 2); tray.lineTo(tx, trayTop + (tx % 70 === 40 ? 9 : 5)); tray.strokePath();
    }

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
      'tentacle-wall':  0x220044,
      'black-hole':     0x110033,
      'soul-lantern-light':   0xccaaff,
      'soul-arise':           0x9966cc,
      'soul-grave':           0x7722aa,
      'soul-death-whistle':   0x553388,
      'soul-hells-torment':   0xff4411,
      // Hunt — human
      'hunt-crossbow':      0xcc4400,
      'hunt-blast':         0xff6600,
      'hunt-grenade':       0xff8822,
      'hunt-trail':         0xcc3300,
      'hunt-release-beast': 0x882200,
      // Hunt — beast
      'hunt-slash':         0xff2200,
      'hunt-pounce':        0xdd4400,
      'hunt-roar':          0xbb0011,
      'hunt-grapple':       0xaa2233,
      'hunt-blood-scent':   0x880000,
      // Hunt — hybrid
      'hunt-hybrid-shotgun': 0xdddde6,
      'hunt-roll':           0x99a3ad,
      'hunt-hook':           0xaab4c0,
      'hunt-adrenaline':     0x66cc88,
      'hunt-give-in':        0x663322,
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
      'wrench-plans':     0xbb8844,
      'creation-block':   0x884422,
      'maze-of-doom':     0x8a5a2a,
      'electro-ball':       0xffee00,
      'electro-dash':       0xffcc00,
      'kinetic-discharge':  0xffaa00,
      'pain-battery':       0xdd8800,
      'restart':            0xffffff,
      'poison-whip':        0x66cc44,
      'vile-spray':         0x33ff33,
      'snake-burrow':       0x448822,
      'purge':              0x66ff33,
      'acid-apocalypse':    0x225511,
      'fate-card-throw':   0x88eecc,
      'fate-reroll':       0x44aacc,
      'fate-preserve':     0xffee44,
      'fate-enchant':      0xaa44ff,
      'fate-all-in':       0xff4400,
      'rhythm-shot':        0xff66cc,
      'flow-mode':          0x9944cc,
      'screech-barrier':    0xff3388,
      'sound-grapple':      0xdd44aa,
      'solo':               0xff44aa,
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
      'plasma-pure-chaos':      0xff88ff,
      // Light
      'light-lance':    0xfff4a8,
      'blink':          0x88ddff,
      'prism-ramp':     0x66ddff,
      'light-trick':    0xffdd66,
      'speed-o-light':  0xff2200,
      // Death (Gunpowder)
      'gunpowder-musket-shot':    0x3a2a1a,
      'gunpowder-explosive-retreat': 0xffaa33,
      'gunpowder-fire-at-will':   0xdd8833,
      'gunpowder-arsenal-expansion': 0xddaa44,
      'gunpowder-blunderblast': 0xcfd4da,
      // Adrenaline
      'rubber-punch':       0xff5577,
      'rubber-sling':       0xff77aa,
      'rubber-bounce-form': 0xffaacc,
      'rubber-band':        0x222222,
      'rubberage':          0xff2244,
      // Magic
      'magic-sparkle-shot':  0xff99ff,
      'magic-grimoire':      0x7a2edd,
      'magic-anchor':        0xbb88ff,
      'magic-meditate':      0xaa66ee,
      'magic-necronomicon':  0x551188,
      // Technology
      'tech-cruncher': 0x33ff88,
      'tech-ads':      0x44ccaa,
      'tech-upload':   0xff3355,
      'tech-webdrag':  0x66eecc,
      'tech-admin':    0xff4444,
      // Echo (abstract combined: fate + light)
      'echo-shot':     0xccccff,
      'echo-guess':    0xaaaadd,
      'echo-lantern':  0xffffaa,
      'echo-bat':      0x8888cc,
      'echo-eclipse':  0xffffff,
      // Subterfuge (abstract combined: slime + fate)
      'sub-cutter':    0xdd2233,
      'sub-spray':     0xff4444,
      'sub-recruit':   0x881122,
      'sub-bribe':     0x66dd66,
      'sub-treachery': 0x330033,
      // Growth (bacterium rework)
      'growth-click':      0x55cc44,
      'growth-evolve':     0x44ddaa,
      'growth-virus':      0x77dd33,
      'spore-spray':       0x338822,
      'auxiliary-growth':  0x88bb22,
      // Silence (horror stealth remaster)
      'silence-stab':   0x442255,
      'silence-watch':  0x220033,
      'silence-ritual': 0x881122,
      'silence-feast':  0x445544,
      'silence-run':    0x110016,
    };

    abilities.forEach((ab, i) => {
      const x = startX + i * cardW;

      // A bound mastery ability takes over this slot's card entirely — name, blurb, and cooldown id.
      const boundEnh = getEnhancement(this.elementId, this.masteryBindFor(ab.displayKey.toLowerCase()) ?? '');
      const cardId = boundEnh ? boundEnh.id : ab.id;
      const cardColor = boundEnh ? 0xffaa00 : (fillColors[ab.id] ?? 0x4466aa);

      // The card is its own accent: a notched plate tinted by the ability
      // colour, gold-framed when a mastery ability has taken the slot.
      const plateAccent = boundEnh ? UI.C.gold : cardColor;
      const bg = this.add.graphics().setDepth(21);
      const px = x - (cardW - 4) / 2;
      const py = hudY - (cardH - 4) / 2;
      UI.fillNotchedGradient(bg, px, py, cardW - 4, cardH - 4,
        UI.mix(UI.tintPlate(plateAccent, 0.18), 0xffffff, 0.05),
        UI.mix(UI.tintPlate(plateAccent, 0.1), 0x000000, 0.5), 1, 8, UI.ALL_CORNERS, 10);
      UI.strokeNotched(bg, px, py, cardW - 4, cardH - 4, plateAccent, boundEnh ? 0.95 : 0.5, 1.5, 8, UI.ALL_CORNERS);
      UI.drawSheen(bg, px, py, cardW - 4, cardH - 4, UI.mix(plateAccent, 0xffffff, 0.7), 0.22, 8);

      const fill = this.add
        .rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, cardColor, 0.45)
        .setOrigin(0, 0.5)
        .setDepth(22);

      const lbl = this.add.text(x, hudY - 7, `${ab.displayKey}  ${boundEnh ? boundEnh.name : ab.name}`, {
        fontSize: '11px',
        fontFamily: UI.FONT_DISPLAY,
        color: boundEnh ? UI.T.gold : UI.T.bright,
        letterSpacing: 0.5,
      }).setOrigin(0.5, 0.5).setDepth(23);

      const desc = this.add.text(x, hudY + 8, boundEnh ? (boundEnh.hudDescription ?? boundEnh.description) : ab.description, {
        fontSize: '9px',
        fontFamily: UI.FONT_UI,
        color: UI.T.dim,
        wordWrap: { width: cardW - 12 },
        maxLines: 2,
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(23);

      this.abilityBars.push({ fill, abilityId: cardId, maxWidth: cardW - 4, lbl, desc, baseFillColor: cardColor });

      if (this.elementId === 'hunt') {
        this.huntNormalHudCards.push(bg, fill, lbl, desc);
      }
    });

    // Hunt's other two forms get their own hidden card rows, built on the same plates as
    // the human row so a transform swaps the tray's contents without changing its look.
    if (this.elementId === 'hunt') {
      this.huntNormalFills = [...this.abilityBars];
      const buildRow = (
        list: Ability[], fills: AbilityBarEntry[], cards: Phaser.GameObjects.GameObject[], fallback: number,
      ) => {
        list.forEach((ab, i) => {
          const x = startX + i * cardW;
          const cardColor = fillColors[ab.id] ?? fallback;
          const bg = this.add.graphics().setDepth(21).setVisible(false);
          const px = x - (cardW - 4) / 2;
          const py = hudY - (cardH - 4) / 2;
          UI.fillNotchedGradient(bg, px, py, cardW - 4, cardH - 4,
            UI.mix(UI.tintPlate(cardColor, 0.18), 0xffffff, 0.05),
            UI.mix(UI.tintPlate(cardColor, 0.1), 0x000000, 0.5), 1, 8, UI.ALL_CORNERS, 10);
          UI.strokeNotched(bg, px, py, cardW - 4, cardH - 4, cardColor, 0.5, 1.5, 8, UI.ALL_CORNERS);
          UI.drawSheen(bg, px, py, cardW - 4, cardH - 4, UI.mix(cardColor, 0xffffff, 0.7), 0.22, 8);
          const fill = this.add.rectangle(px, hudY, 0, cardH - 4, cardColor, 0.45)
            .setOrigin(0, 0.5).setDepth(22).setVisible(false);
          const lbl = this.add.text(x, hudY - 7, `${ab.displayKey}  ${ab.name}`, {
            fontSize: '11px', fontFamily: UI.FONT_DISPLAY, color: UI.T.bright, letterSpacing: 0.5,
          }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
          const desc = this.add.text(x, hudY + 8, ab.description, {
            fontSize: '9px', fontFamily: UI.FONT_UI, color: UI.T.dim,
            wordWrap: { width: cardW - 12 }, maxLines: 2, align: 'center',
          }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
          fills.push({ fill, abilityId: ab.id, maxWidth: cardW - 4, lbl, desc, baseFillColor: cardColor });
          cards.push(bg, fill, lbl, desc);
        });
      };
      buildRow(this.playerElement.abilities.slice(5, 10), this.huntBeastFills, this.huntBeastHudCards, 0xaa2233);
      buildRow(this.playerElement.abilities.slice(10, 15), this.huntHybridFills, this.huntHybridHudCards, 0xcc5522);
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
    const barY = this.hpBarY;
    const left = W / 2 - this.hpBarW / 2;

    // Housing: a notched trough with corner brackets and a hairline scale, so
    // the bar reads as an instrument rather than a coloured rectangle.
    const housing = this.add.graphics().setDepth(20);
    const hx = left - 5;
    const hy = barY - this.hpBarH / 2 - 5;
    const hw = this.hpBarW + 10;
    const hh = this.hpBarH + 10;
    UI.drawGlow(housing, hx, hy, hw, hh, UI.C.frost, 0.22, 3, 3, 8);
    UI.fillNotchedGradient(housing, hx, hy, hw, hh,
      UI.mix(UI.C.void_, UI.C.frost, 0.08), UI.C.void_, 0.94, 8, UI.ALL_CORNERS, 8);
    UI.strokeNotched(housing, hx, hy, hw, hh, UI.C.frost, 0.55, 2, 8, UI.ALL_CORNERS);
    UI.drawCornerBrackets(housing, hx, hy, hw, hh, UI.mix(UI.C.frost, 0xffffff, 0.3), 0.8, 2, 12, 8);
    // Quarter marks across the trough.
    housing.lineStyle(1, UI.C.frost, 0.2);
    for (let q = 1; q < 4; q++) {
      const qx = left + (this.hpBarW / 4) * q;
      housing.beginPath();
      housing.moveTo(qx, barY - this.hpBarH / 2);
      housing.lineTo(qx, barY + this.hpBarH / 2);
      housing.strokePath();
    }

    this.hpBarFill = this.add
      .rectangle(left, barY, this.hpBarW, this.hpBarH, 0x22dd55, 1)
      .setOrigin(0, 0.5)
      .setDepth(21);

    this.hpBarShield = this.add
      .rectangle(left + this.hpBarW, barY, 0, this.hpBarH, 0x4488ff, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(21);

    // Clotted HP (Metal R+): dark-red layer riding past the shield.
    this.hpBarClotted = this.add
      .rectangle(left + this.hpBarW, barY, 0, this.hpBarH, 0x770011, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(21);

    this.hpBarText = this.add
      .text(W / 2, barY, '', {
        fontSize: '14px',
        fontFamily: UI.FONT_DISPLAY,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.updatePlayerHpBar();
  }

  /** Refresh the top health bar's width, colour, shield overlay and numeric readout. */
  private updatePlayerHpBar(): void {
    if (!this.hpBarFill || !this.hpBarShield || !this.hpBarClotted || !this.hpBarText) return;

    const maxHp = Math.max(1, this.player.maxHp);
    const hp = Math.max(0, this.player.hp);
    const ratio = Math.min(1, hp / maxHp);

    this.hpBarFill.setSize(this.hpBarW * ratio, this.hpBarH);
    this.hpBarFill.setFillStyle(ratio > 0.5 ? 0x22dd55 : ratio > 0.25 ? 0xffcc00 : 0xff3300, 1);

    // Clotted HP (Metal R+) turns the right slice of the health fill dark red —
    // it's part of your health total, so it sits right after the green fill.
    const clottedHp = this.player.clottedHp;
    const clottedRatio = clottedHp > 0 ? Math.min(clottedHp / maxHp, 1 - ratio) : 0;
    this.hpBarClotted!.x = this.hpBarFill.x + this.hpBarW * ratio;
    this.hpBarClotted!.setSize(this.hpBarW * clottedRatio, this.hpBarH);

    // Shield rides just past the health total (green + clotted), bonus HP.
    const shieldHp = this.player.shieldHp;
    const shieldRatio = shieldHp > 0 ? Math.min(shieldHp / maxHp, 1 - ratio - clottedRatio) : 0;
    this.hpBarShield.x = this.hpBarFill.x + this.hpBarW * (ratio + clottedRatio);
    this.hpBarShield.setSize(this.hpBarW * shieldRatio, this.hpBarH);

    const shieldLabel = shieldHp > 0 ? `  +${Math.ceil(shieldHp)} 🛡` : '';
    const clottedLabel = clottedHp > 0 ? `  🩸${Math.ceil(clottedHp)}` : '';
    const chargeLabel = this.player.shieldCharges > 0 ? `  ✦${this.player.shieldCharges}` : '';
    this.hpBarText.setText(`${Math.ceil(hp)} / ${Math.ceil(maxHp)}${shieldLabel}${clottedLabel}${chargeLabel}`);
  }

  // ── Context builders ────────────────────────────────────────────

  /** Fire Mastery — Nuclear Cleansing: same AoE as dealAoeDamage, but tracks the best single-detonation husk kill count. */
  private dealFlameNukeDamage(cx: number, cy: number, radius: number, damage: number): void {
    let kills = 0;
    for (const t of this.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
        t.takeDamage(damage);
        this.spawnHitFlash(t.x, t.y, this.cosmeticsKit.fireColor('player', 0xff6600));
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
      fireColor: (base) => this.cosmeticsKit.fireColor('player', base),
      waterColor: (base) => this.cosmeticsKit.waterColor('player', base),
      lifeColor: (base) => this.cosmeticsKit.lifeColor('player', base),
      airColor: (base) => this.cosmeticsKit.airColor('player', base),
      dealAoeDamage: (cx, cy, radius, damage) => {
        for (const t of this.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
            t.takeDamage(damage);
            this.spawnHitFlash(t.x, t.y, 0xff6600);
          }
        }
      },
      dealFlameNukeDamage: (cx, cy, radius, damage) => this.dealFlameNukeDamage(cx, cy, radius, damage),
      dashCaster: (vx, vy) => {
        // High Gravity kills every dash-style movement ability at the one place they all pass through.
        if (this.time.now < this.player.highGravityUntil) return;
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
        this.airKit.placeWindTrap(x, y, 'player');
        this.airKit.playPlayerGesture('slam', Math.atan2(y - this.player.y, x - this.player.x));
      },
      grappleTo: (x, y) => {
        if (this.hasPerk('player', 'hawk')) {
          this.airKit.spawnHawk(x, y);
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
              this.airKit.onGrappleSlow(this.npc.x, this.npc.y);
            }
          }
        }
        this.time.delayedCall(travelTime, () => {
          if (this.player.active) {
            this.isDodging = false;
            this.isGrappling = false;
            body.setVelocity(0, 0);
            this.grappleDodgeCharges = 1;
            this.airKit.setDodgeAura(true);
            this.airKit.onGrappleLand(this.player.x, this.player.y, 'player');
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
        this.airKit.onGrappleLaunch(this.player.x, this.player.y, x, y, 'player');
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
      launchDarkBomb: (x, y) => this.shadowKit.doLaunchDarkBomb(x, y, true),
      activateTentacle: (x, y) => this.shadowKit.doActivateTentacle(x, y, true),
      placeSnapTrap: () => this.shadowKit.doPlaceSnapTrap(true),
      summonTentacleWall: (x, y) => this.shadowKit.doSummonTentacleWall(x, y, true),
      startBlackHole: (x, y) => this.shadowKit.doStartBlackHole(x, y),
      // Ice
      fireIceSpike: (tx, ty) => this.iceKit.doFireIceSpike(tx, ty),
      fireFrostBlast: (tx, ty) => this.iceKit.doFireFrostBlast(tx, ty),
      toggleBlockUp: () => this.iceKit.doToggleBlockUp(),
      startSkate: () => this.iceKit.doStartSkate(),
      fireFrozenSolid: (tx, ty) => this.iceKit.doFireFrozenSolid(tx, ty),
      // Growth
      fireGrowthClick: (tx, ty) => { this.growthKit.doBacterium(tx, ty, 'player'); },
      growthToggleEvolve: () => { this.growthKit.doToggleEvolve('player'); },
      growthVirus: (tx, ty) => { this.growthKit.doVirus(tx, ty, 'player'); },
      growthSporeSpray: (tx, ty) => { this.growthKit.doSporeSpray(tx, ty, 'player'); },
      growthAuxiliaryGrowth: (tx, ty) => { this.growthKit.doAuxiliaryGrowth(tx, ty, 'player'); },
      // Crystal
      fireCrystalLaser: (tx, ty) => this.crystalKit.fireCrystalLaser(true, tx, ty),
      placeCrystalNode: (tx, ty) => this.crystalKit.placeCrystalNode(true, tx, ty),
      activateCrystalAtune: () => this.crystalKit.activateCrystalAtune(true),
      placeCrystalPortal: (tx, ty) => this.crystalKit.placeCrystalPortal(true, tx, ty),
      activateCrystalTrick: () => this.crystalKit.activateCrystalTrick(true),
      // Soul
      soulLanternTick: (tx, ty) => this.soulKit.doLanternTick(tx, ty, 'player'),
      soulArise: () => this.soulKit.doArise('player'),
      soulGrave: (tx, ty) => this.soulKit.doGrave(tx, ty, 'player'),
      soulDeathWhistle: (tx, ty) => this.soulKit.doDeathWhistle(tx, ty, 'player'),
      soulHellsTorment: () => this.soulKit.doHellsTorment('player'),
      // Hunt — every form delegates straight into HuntKit
      huntCrossbow: (tx, ty) => this.huntKit.doCrossbow(tx, ty, 'player'),
      huntBlast: (tx, ty, chargeMs) => this.huntKit.doBlast(tx, ty, chargeMs, 'player'),
      huntGrenade: (tx, ty) => this.huntKit.doGrenade(tx, ty, 'player'),
      huntTrail: () => this.huntKit.doTrail('player'),
      huntReleaseBeast: () => this.huntKit.doReleaseBeast('player'),
      huntSlash: (tx, ty) => this.huntKit.doSlash(tx, ty, 'player'),
      huntPounce: (tx, ty) => this.huntKit.doPounce(tx, ty, 'player'),
      huntRoar: (tx, ty) => this.huntKit.doRoar(tx, ty, 'player'),
      huntGrapple: (tx, ty) => this.huntKit.doGrapple(tx, ty, 'player'),
      huntBloodScent: () => this.huntKit.doBloodScent('player'),
      huntHybridShotgun: (tx, ty) => this.huntKit.doHybridShotgun(tx, ty, 'player'),
      huntRoll: (tx, ty) => this.huntKit.doRoll(tx, ty, 'player'),
      huntHook: (tx, ty) => this.huntKit.doHook(tx, ty, 'player'),
      huntAdrenaline: () => this.huntKit.doAdrenaline('player'),
      huntGiveIn: () => this.huntKit.doGiveIn('player'),
      // Silence
      silenceStab: (tx, ty) => { this.silenceKit.doStab(tx, ty, 'player'); },
      silenceSummonStalker: (tx, ty) => { this.silenceKit.doSummonStalker(tx, ty, 'player'); },
      silenceRitual: (tx, ty) => { this.silenceKit.doRitual(tx, ty, 'player'); },
      silenceFeast: (tx, ty) => { this.silenceKit.doFeast(tx, ty, 'player'); },
      silenceRun: (tx, ty) => { this.silenceKit.doRun(tx, ty, 'player'); },
      // Time
      timeBarrage: () => { /* firing handled in TimeKit.handleInput */ },
      timeWarp: (tx, ty) => this.timeKit.doTimeLasso(tx, ty, 'player'),
      timeRemain: () => this.timeKit.doTimeRemain('player'),
      timeHalt: () => this.timeKit.doTimeBounty('player'),
      timeTimeless: () => this.timeKit.doTimeAlwaysNoon('player'),
      // Gravity
      gravitySlash: (x1, y1, x2, y2) => this.gravityKit.doGravitySlash(x1, y1, x2, y2, 'player'),
      gravityMeteorShadow: (x, y) => this.gravityKit.doMeteorShadow(x, y, 'player', false),
      gravityMeteorRainNpcBurst: (tx, ty) => this.gravityKit.doMeteorRainNpcBurst(tx, ty, 'player'),
      gravitySpaceSlam: () => this.gravityKit.doSpaceSlam('player'),
      gravityGravBombSnap: (x, y) => this.gravityKit.doGravBombSnap(x, y, 'player'),
      gravityLunarLanding: () => this.gravityKit.doLunarLanding('player'),
      // Legacy sand no-ops (keep for compiler compatibility)
      sandFlintlock: () => {},
      sandBlindingSand: () => {},
      sandToggleTornado: () => {},
      sandMirage: () => {},
      sandActivateGlass: () => {},
      // Creation
      creationDaggerSpray: (tx, ty, count) => {
        this.creationKit.spawnDaggers(this.player.x, this.player.y, tx, ty, count, 'player');
      },
      creationBolt: (tx, ty, tier) => {
        this.creationKit.spawnBolt(this.player.x, this.player.y, tx, ty, tier, 'player');
      },
      creationWrench: (tx, ty) => {
        this.creationKit.spawnWrench(this.player.x, this.player.y, tx, ty, 'player');
      },
      creationBlock: (x, y, w, h) => { this.creationKit.spawnBlocker(x, y, w, h, 'player'); },
      creationMaze: () => { this.creationKit.spawnMaze('player'); },
      // Fate
      fateThrowCard: (tx, ty) => this.fateKit.doThrowCard(tx, ty, 'player'),
      fateReroll: () => this.fateKit.doReroll('player'),
      fatePreserve: () => this.fateKit.doPreserve('player'),
      fateEnchant: () => this.fateKit.doEnchant('player'),
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
      metalFlailCraft: () => { this.metalKit.doMetalFlailCraft('player'); },
      metalTriggerFlailSwing: () => { this.metalKit.triggerFlailSwing('player'); },
      metalBloodTransfusionTick: () => { this.metalKit.doMetalBloodTransfusionTick('player'); },
      metalChainTether: (tx, ty) => { this.metalKit.doMetalChainTether(tx, ty, 'player'); },
      metalClotArmor: () => { this.metalKit.doMetalClotArmor('player'); },
      // Plasma
      plasmaBurst: (tx, ty) => { this.plasmaKit.doPlasmaBurst(tx, ty, 'player'); },
      plasmaUnstableArena: (tx, ty) => { this.plasmaKit.doPlasmaUnstableArena(tx, ty, 'player'); },
      plasmaCurrentLaunch: (tx, ty) => { this.plasmaKit.doPlasmaCurrentLaunch(tx, ty, 'player'); },
      plasmaChaosBlades: () => { this.plasmaKit.doPlasmaChaosBlades('player'); },
      plasmaPureChaos: () => { this.plasmaKit.doPlasmaPureChaos('player'); },
      // Gunpowder
      gunpowderMusketShot: (tx, ty) => { this.gunpowderKit.doGunpowderMusketShot(tx, ty, 'player'); },
      gunpowderExplosiveRetreat: (tx, ty) => { this.gunpowderKit.doGunpowderExplosiveRetreat(tx, ty, 'player'); },
      gunpowderFireAtWill: (tx, ty) => { this.gunpowderKit.doGunpowderFireAtWill(tx, ty, 'player'); },
      gunpowderArsenalExpansion: () => { this.gunpowderKit.doGunpowderArsenalExpansion('player'); },
      gunpowderBlunderBlast: (tx, ty) => { this.gunpowderKit.doGunpowderBlunderBlast(tx, ty, 'player'); },
      // Rubber
      rubberPunch: (tx, ty, r) => { this.rubberKit.doRubberPunch(tx, ty, r, 'player'); },
      rubberSlingShotStart: (angle) => { this.rubberKit.doRubberSlingShotStart(angle, 'player'); },
      rubberSlingShotRelease: (vx, vy) => { this.rubberKit.doRubberSlingShotRelease(vx, vy, 'player'); },
      rubberBounceForm: () => { this.rubberKit.doRubberBounceForm('player'); },
      rubberBandStart: () => { this.rubberKit.doRubberBandStart('player'); },
      rubberage: () => { this.rubberKit.doRubberage('player'); },
      // Magic
      magicSparkleShot: (tx, ty) => { this.magicKit.doSparkleShot(tx, ty, 'player'); },
      magicOpenGrimoire: () => { /* handled in magicKit.handleInput */ },
      magicAnchorToggle: (_tx, _ty) => { this.magicKit.doAnchorToggle('player'); },
      magicMeditateBegin: () => { this.magicKit.doMeditateBegin('player'); },
      magicOpenNecronomicon: () => { /* handled in magicKit.handleInput */ },
      // Technology
      techCruncherFire: (tx, ty) => { this.techKit.doTechCruncherFire('player', tx, ty); },
      techAdsCast: () => { this.techKit.doTechAdsCast('player'); },
      techUploadCast: (tx, ty) => { this.techKit.doTechUploadCast('player', tx, ty); },
      techWebDragCast: () => { this.techKit.doTechWebDragCast('player'); },
      techAdminCast: () => { this.techKit.doTechAdminCast('player'); },
      // Echo (player input handled entirely in echoKit.handleInput; these are stubs for ability cast registration)
      echoEcholocation: () => { /* handled in handleInput */ },
      echoGuess: () => { /* handled in handleInput */ },
      echoLantern: () => { /* handled in handleInput */ },
      echoBatForm: () => { /* handled in handleInput */ },
      echoEclipse: () => { /* handled in handleInput */ },
      // Subterfuge (dispatched from kit via handleInput; these are direct entries)
      subterfugeCutter: (tx, ty) => { this.subterfugeKit.doPlayerCutter(tx, ty); },
      subterfugeSpray: () => { /* hold-to-fire handled in SubterfugeKit.handleInput */ },
      subterfugeRecruit: () => { /* handled in SubterfugeKit.handleInput */ },
      subterfugeBribe: () => { /* handled in SubterfugeKit.handleInput */ },
      subterfugeTreachery: () => { /* handled in SubterfugeKit.handleInput */ },
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
      fireColor: (base) => this.cosmeticsKit.fireColor('npc', base),
      waterColor: (base) => this.cosmeticsKit.waterColor('npc', base),
      lifeColor: (base) => this.cosmeticsKit.lifeColor('npc', base),
      airColor: (base) => this.cosmeticsKit.airColor('npc', base),
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
      dashCaster: (vx, vy) => {
        if (this.time.now < this.npc.highGravityUntil) return;
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
      placeWindTrap: (x, y) => this.airKit.placeWindTrap(x, y, 'npc'),
      grappleTo: (x, y) => {
        const dx = x - this.npc.x;
        const dy = y - this.npc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 1200;
        const travelTime = Math.min(350, (len / speed) * 1000);
        const body = this.npc.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
        this.airKit.onGrappleLaunch(this.npc.x, this.npc.y, x, y, 'npc');
        this.time.delayedCall(travelTime, () => {
          if (this.npc.active) {
            body.setVelocity(0, 0);
            this.airKit.onGrappleLand(this.npc.x, this.npc.y, 'npc');
          }
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
      // The AI never picks these two, but an online opponent can — replay them so the
      // wall and the overdrive rig show up on this sim too.
      placeFirewall: (x, y) => this.oilKit.doPlaceFirewallNpc(x, y),
      startOverdrive: (x, y) => this.oilKit.doStartOverdrive(x, y, 'npc'),
      launchDarkBomb: (x, y) => this.shadowKit.doLaunchDarkBomb(x, y, false),
      activateTentacle: (x, y) => this.shadowKit.doActivateTentacle(x, y, false),
      placeSnapTrap: () => this.shadowKit.doPlaceSnapTrap(false),
      summonTentacleWall: (x, y) => this.shadowKit.doSummonTentacleWall(x, y, false),
      startBlackHole: (_x, _y) => { /* NPC does not use black hole */ },
      // Ice
      fireIceSpike: (tx, ty) => this.iceKit.doNpcFireIceSpike(tx, ty),
      fireFrostBlast: (tx, ty) => this.iceKit.doNpcFireFrostBlast(tx, ty),
      toggleBlockUp: () => this.iceKit.doNpcToggleBlockUp(),
      startSkate: () => this.iceKit.doNpcStartSkate(),
      fireFrozenSolid: (tx, ty) => this.iceKit.doNpcFireFrozenSolid(tx, ty),
      // Growth
      fireGrowthClick: (tx, ty) => { this.growthKit.doBacterium(tx, ty, 'npc'); },
      growthToggleEvolve: () => { this.growthKit.doToggleEvolve('npc'); },
      growthVirus: (tx, ty) => { this.growthKit.doVirus(tx, ty, 'npc'); },
      growthSporeSpray: (tx, ty) => { this.growthKit.doSporeSpray(tx, ty, 'npc'); },
      growthAuxiliaryGrowth: (tx, ty) => { this.growthKit.doAuxiliaryGrowth(tx, ty, 'npc'); },
      // Crystal
      fireCrystalLaser: (tx, ty) => this.crystalKit.fireCrystalLaser(false, tx, ty),
      placeCrystalNode: (tx, ty) => this.crystalKit.placeCrystalNode(false, tx, ty),
      activateCrystalAtune: () => this.crystalKit.activateCrystalAtune(false),
      placeCrystalPortal: (tx, ty) => this.crystalKit.placeCrystalPortal(false, tx, ty),
      activateCrystalTrick: () => this.crystalKit.activateCrystalTrick(false),
      // Soul
      soulLanternTick: (tx, ty) => this.soulKit.doLanternTick(tx, ty, 'npc'),
      soulArise: () => this.soulKit.doArise('npc'),
      soulGrave: (tx, ty) => this.soulKit.doGrave(tx, ty, 'npc'),
      soulDeathWhistle: (tx, ty) => this.soulKit.doDeathWhistle(tx, ty, 'npc'),
      soulHellsTorment: () => this.soulKit.doHellsTorment('npc'),
      // Hunt (NPC)
      huntCrossbow: (tx, ty) => this.huntKit.doCrossbow(tx, ty, 'npc'),
      huntBlast: (tx, ty, chargeMs) => this.huntKit.doBlast(tx, ty, chargeMs, 'npc'),
      huntGrenade: (tx, ty) => this.huntKit.doGrenade(tx, ty, 'npc'),
      huntTrail: () => this.huntKit.doTrail('npc'),
      huntReleaseBeast: () => this.huntKit.doReleaseBeast('npc'),
      huntSlash: (tx, ty) => this.huntKit.doSlash(tx, ty, 'npc'),
      huntPounce: (tx, ty) => this.huntKit.doPounce(tx, ty, 'npc'),
      huntRoar: (tx, ty) => this.huntKit.doRoar(tx, ty, 'npc'),
      huntGrapple: (tx, ty) => this.huntKit.doGrapple(tx, ty, 'npc'),
      huntBloodScent: () => this.huntKit.doBloodScent('npc'),
      // The AI never reaches hybrid form — it has no upgrades to unlock the door — but an
      // online opponent does, and their casts replay through here.
      huntHybridShotgun: (tx, ty) => this.huntKit.doHybridShotgun(tx, ty, 'npc'),
      huntRoll: (tx, ty) => this.huntKit.doRoll(tx, ty, 'npc'),
      huntHook: (tx, ty) => this.huntKit.doHook(tx, ty, 'npc'),
      huntAdrenaline: () => this.huntKit.doAdrenaline('npc'),
      huntGiveIn: () => this.huntKit.doGiveIn('npc'),
      // Silence (NPC)
      silenceStab: (tx, ty) => { this.silenceKit.doStab(tx, ty, 'npc'); },
      silenceSummonStalker: (tx, ty) => { this.silenceKit.doSummonStalker(tx, ty, 'npc'); },
      silenceRitual: (tx, ty) => { this.silenceKit.doRitual(tx, ty, 'npc'); },
      silenceFeast: (tx, ty) => { this.silenceKit.doFeast(tx, ty, 'npc'); },
      silenceRun: (tx, ty) => { this.silenceKit.doRun(tx, ty, 'npc'); },
      // Time (NPC)
      timeBarrage: () => { /* NPC revolver handled in TimeKit.update */ },
      timeWarp: (tx, ty) => this.timeKit.doTimeLasso(tx, ty, 'npc'),
      timeRemain: () => this.timeKit.doTimeRemain('npc'),
      timeHalt: () => this.timeKit.doTimeBounty('npc'),
      timeTimeless: () => this.timeKit.doTimeAlwaysNoon('npc'),
      // Gravity (NPC)
      gravitySlash: (x1, y1, x2, y2) => this.gravityKit.doGravitySlash(x1, y1, x2, y2, 'npc'),
      gravityMeteorShadow: (x, y) => this.gravityKit.doMeteorShadow(x, y, 'npc', false),
      gravityMeteorRainNpcBurst: (tx, ty) => this.gravityKit.doMeteorRainNpcBurst(tx, ty, 'npc'),
      gravitySpaceSlam: () => this.gravityKit.doSpaceSlam('npc'),
      gravityGravBombSnap: (x, y) => this.gravityKit.doGravBombSnap(x, y, 'npc'),
      gravityLunarLanding: () => this.gravityKit.doLunarLanding('npc'),
      // Legacy sand no-ops
      sandFlintlock: () => {},
      sandBlindingSand: () => {},
      sandToggleTornado: () => {},
      sandMirage: () => {},
      sandActivateGlass: () => {},
      // Creation (NPC)
      creationDaggerSpray: (tx, ty, count) => {
        this.creationKit.spawnDaggers(this.npc.x, this.npc.y, tx, ty, count, 'npc');
      },
      creationBolt: (tx, ty, tier) => {
        this.creationKit.spawnBolt(this.npc.x, this.npc.y, tx, ty, tier, 'npc');
      },
      creationWrench: (tx, ty) => {
        this.creationKit.spawnWrench(this.npc.x, this.npc.y, tx, ty, 'npc');
      },
      creationBlock: (x, y, w, h) => { this.creationKit.spawnBlocker(x, y, w, h, 'npc'); },
      creationMaze: () => { this.creationKit.spawnMaze('npc'); },
      // Fate
      fateThrowCard: (tx, ty) => this.fateKit.doThrowCard(tx, ty, 'npc'),
      fateReroll: () => this.fateKit.doReroll('npc'),
      fatePreserve: () => this.fateKit.doPreserve('npc'),
      fateEnchant: () => this.fateKit.doEnchant('npc'),
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
      metalFlailCraft: () => { this.metalKit.doMetalFlailCraft('npc'); },
      metalTriggerFlailSwing: () => { this.metalKit.triggerFlailSwing('npc'); },
      metalBloodTransfusionTick: () => { this.metalKit.doMetalBloodTransfusionTick('npc'); },
      metalChainTether: (tx, ty) => { this.metalKit.doMetalChainTether(tx, ty, 'npc'); },
      metalClotArmor: () => { this.metalKit.doMetalClotArmor('npc'); },
      // Plasma
      plasmaBurst: (tx, ty) => { this.plasmaKit.doPlasmaBurst(tx, ty, 'npc'); },
      plasmaUnstableArena: (tx, ty) => { this.plasmaKit.doPlasmaUnstableArena(tx, ty, 'npc'); },
      plasmaCurrentLaunch: (tx, ty) => { this.plasmaKit.doPlasmaCurrentLaunch(tx, ty, 'npc'); },
      plasmaChaosBlades: () => { this.plasmaKit.doPlasmaChaosBlades('npc'); },
      plasmaPureChaos: () => { this.plasmaKit.doPlasmaPureChaos('npc'); },
      // Gunpowder
      gunpowderMusketShot: (tx, ty) => { this.gunpowderKit.doGunpowderMusketShot(tx, ty, 'npc'); },
      gunpowderExplosiveRetreat: (tx, ty) => { this.gunpowderKit.doGunpowderExplosiveRetreat(tx, ty, 'npc'); },
      gunpowderFireAtWill: (tx, ty) => { this.gunpowderKit.doGunpowderFireAtWill(tx, ty, 'npc'); },
      gunpowderArsenalExpansion: () => { this.gunpowderKit.doGunpowderArsenalExpansion('npc'); },
      gunpowderBlunderBlast: (tx, ty) => { this.gunpowderKit.doGunpowderBlunderBlast(tx, ty, 'npc'); },
      // Rubber
      rubberPunch: (tx, ty, r) => { this.rubberKit.doRubberPunch(tx, ty, r, 'npc'); },
      rubberSlingShotStart: (angle) => { this.rubberKit.doRubberSlingShotStart(angle, 'npc'); },
      rubberSlingShotRelease: (vx, vy) => { this.rubberKit.doRubberSlingShotRelease(vx, vy, 'npc'); },
      rubberBounceForm: () => { this.rubberKit.doRubberBounceForm('npc'); },
      rubberBandStart: () => { this.rubberKit.doRubberBandStart('npc'); },
      rubberage: () => { this.rubberKit.doRubberage('npc'); },
      // Magic (NPC mirrors)
      magicSparkleShot: (tx, ty) => { this.magicKit.doSparkleShot(tx, ty, 'npc'); },
      magicOpenGrimoire: () => { this.magicKit.npcCastGrimoireWedge(this.player.x, this.player.y); },
      magicAnchorToggle: (_tx, _ty) => { this.magicKit.doAnchorToggle('npc'); },
      magicMeditateBegin: () => { this.magicKit.doMeditateBegin('npc'); },
      magicOpenNecronomicon: () => { this.magicKit.npcCastNecronomiconWedge(this.player.x, this.player.y); },
      // Technology
      techCruncherFire: (tx, ty) => { this.techKit.doTechCruncherFire('npc', tx, ty); },
      techAdsCast: () => { this.techKit.doTechAdsCast('npc'); },
      techUploadCast: (tx, ty) => { this.techKit.doTechUploadCast('npc', tx, ty); },
      techWebDragCast: () => { this.techKit.doTechWebDragCast('npc'); },
      techAdminCast: () => { this.techKit.doTechAdminCast('npc'); },
      // Echo
      echoEcholocation: (tx, ty) => this.echoKit.doNpcEcholocation(tx, ty),
      echoGuess: (tx, ty) => this.echoKit.doNpcGuess(tx, ty),
      echoLantern: (tx, ty) => this.echoKit.doNpcLantern(tx, ty),
      echoBatForm: (tx, ty) => this.echoKit.doNpcBatForm(tx, ty),
      echoEclipse: (tx, ty) => this.echoKit.doNpcEclipse(tx, ty),
      // Subterfuge
      subterfugeCutter: (tx, ty) => this.subterfugeKit.doNpcCutter(tx, ty),
      subterfugeSpray: (tx, ty) => this.subterfugeKit.doNpcSpray(tx, ty),
      subterfugeRecruit: () => this.subterfugeKit.doNpcRecruit(),
      subterfugeBribe: (tx, ty) => this.subterfugeKit.doNpcBribe(tx, ty),
      subterfugeTreachery: () => this.subterfugeKit.doNpcTreachery(),
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
      fireColor: (base) => base, // raid NPCs have no cosmetics
      waterColor: (base) => base,
      lifeColor: (base) => base,
      airColor: (base) => base,

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
      summonTentacleWall: () => {},
      startBlackHole: () => {},
      fireIceSpike: () => {},
      fireFrostBlast: () => {},
      toggleBlockUp: () => {},
      startSkate: () => {},
      fireFrozenSolid: () => {},
      fireGrowthClick: () => {},
      growthToggleEvolve: () => {},
      growthVirus: () => {},
      growthSporeSpray: () => {},
      growthAuxiliaryGrowth: () => {},
      fireCrystalLaser: () => {},
      placeCrystalNode: () => {},
      activateCrystalAtune: () => {},
      placeCrystalPortal: () => {},
      activateCrystalTrick: () => {},
      soulLanternTick: () => {},
      soulArise: () => {},
      soulGrave: () => {},
      soulDeathWhistle: () => {},
      soulHellsTorment: () => {},
      huntCrossbow: () => {},
      huntBlast: () => {},
      huntGrenade: () => {},
      huntTrail: () => {},
      huntReleaseBeast: () => {},
      huntSlash: () => {},
      huntPounce: () => {},
      huntRoar: () => {},
      huntGrapple: () => {},
      huntBloodScent: () => {},
      huntHybridShotgun: () => {},
      huntRoll: () => {},
      huntHook: () => {},
      huntAdrenaline: () => {},
      huntGiveIn: () => {},
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
      creationWrench: () => {},
      creationBlock: () => {},
      creationMaze: () => {},
      // Fate (raid stubs)
      fateThrowCard: () => {},
      fateReroll: () => {},
      fatePreserve: () => {},
      fateEnchant: () => {},
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
      metalFlailCraft: () => {},
      metalTriggerFlailSwing: () => {},
      metalBloodTransfusionTick: () => {},
      metalChainTether: () => {},
      metalClotArmor: () => {},
      // Plasma stubs (no-ops for clone/raid)
      plasmaBurst: () => {},
      plasmaUnstableArena: () => {},
      plasmaCurrentLaunch: () => {},
      plasmaChaosBlades: () => {},
      plasmaPureChaos: () => {},
      // Gunpowder stubs (no-ops for clone/raid)
      gunpowderMusketShot: () => {},
      gunpowderExplosiveRetreat: () => {},
      gunpowderFireAtWill: () => {},
      gunpowderArsenalExpansion: () => {},
      gunpowderBlunderBlast: () => {},
      // Rubber stubs
      rubberPunch: () => {}, rubberSlingShotStart: () => {}, rubberSlingShotRelease: () => {},
      rubberBounceForm: () => {}, rubberBandStart: () => {}, rubberage: () => {},
      // Magic — no-op stubs for raid
      magicSparkleShot: () => {},
      magicOpenGrimoire: () => {},
      magicAnchorToggle: () => {},
      magicMeditateBegin: () => {},
      magicOpenNecronomicon: () => {},
      techCruncherFire: () => {},
      techAdsCast: () => {},
      techUploadCast: () => {},
      techWebDragCast: () => {},
      techAdminCast: () => {},
      // Silence — no-ops for clone
      silenceStab: () => {},
      silenceSummonStalker: () => {},
      silenceRitual: () => {},
      silenceFeast: () => {},
      silenceRun: () => {},
      subterfugeCutter: () => {},
      subterfugeSpray: () => {},
      subterfugeRecruit: () => {},
      subterfugeBribe: () => {},
      subterfugeTreachery: () => {},
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
    // Empty to start — WaterKit repaints it as a live spring every frame.
    const sprite = this.add.graphics().setDepth(2);
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
      const shadow = this.waterKit.createRainMarker(sx, sy, shadowRadius, owner);
      this.painRainShadows.push({ sprite: shadow, fireAt, x: sx, y: sy, fired: false, owner, damage, hitRadius, color });
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
    if (this.foreignCastSuppress) return false;
    return this.activeUpgrades.includes(slot);
  }

  /**
   * True when the online opponent has the given upgrade slot equipped. Kits call
   * this from their NPC replay paths (do*Abilities / npcCastId handlers) so the
   * remote player's upgraded abilities reproduce correctly on this victim-side sim.
   */
  hasNpcUpgrade(slot: string): boolean {
    return this.isOnline && this.npcUpgrades.includes(slot);
  }

  hasPerk(owner: 'player' | 'npc', perkId: string): boolean {
    return (owner === 'player' ? this.playerPerkId : this.npcPerkId) === perkId;
  }

  /**
   * Idempotent achievement unlock + in-arena popup. Purely local, so it works
   * identically in solo, invasion, and online play.
   */
  unlockAchievement(id: string): void {
    if (!PlayerData.unlockAchievement(id)) return;
    const def = getAchievementDef(id);
    if (!def) return;
    this.showFloatingText(this.player.x, this.player.y - 52, `🏆 Achievement: ${def.name}!`, '#ffcc44');
    const reward = def.cosmeticReward ? getCosmeticDef(def.cosmeticReward) : undefined;
    if (reward) {
      this.showFloatingText(this.player.x, this.player.y - 74, `🎁 Cosmetic unlocked: ${reward.name}`, '#ffee88');
    }
  }

  /**
   * Performs the Space-dodge dash in the given normalized direction. Extracted from
   * the update loop so Echo's Q+ Hypersense can trigger it automatically. When
   * `bypassCooldown` is true the 1s dodge cooldown is skipped — Hypersense gates
   * itself with its own shorter timer (`echoHypersenseNextDodgeAt`).
   */
  private executeDodge(dx: number, dy: number, bypassCooldown = false): void {
    if (!bypassCooldown) this.dodgeOnCooldown = true;
    this.isDodging = true;
    this.player.isInvincible = true;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const mouseX = this.input.activePointer.worldX;
    const mouseY = this.input.activePointer.worldY;

    // Card — Psycho: teleport to cursor; Card — Technique: extended dash length
    if (this.cardPsychoActive) {
      const { width, height } = this.scale;
      const pad = 44;
      playerBody.reset(Math.max(pad, Math.min(width - pad, mouseX)), Math.max(pad, Math.min(height - pad, mouseY)));
      playerBody.setVelocity(0, 0);
    } else {
      playerBody.setVelocity(dx * 520 * this.cardDodgeLengthMult, dy * 520 * this.cardDodgeLengthMult);
    }

    // Echo light trail on dodge (consumes a psychic eye if one is orbiting)
    if (this.elementId === 'echo' && this.echoKit) {
      this.echoKit.tryConsumeEyeForDodge(this.player.x, this.player.y, dx, dy);
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
        this.player.isInvincible = false;
        this.isDodging = false;
      }
    });
    if (!bypassCooldown) this.time.delayedCall(Math.round(1000 * this.cardDodgeCdMult), () => { this.dodgeOnCooldown = false; });
  }

  /**
   * Echo Hypersense: find an imminent incoming attack and return a normalized
   * sidestep/away direction to dodge it, or null if nothing threatens the player.
   * Prioritises enemy projectiles on a collision course, then a closing melee enemy.
   */
  private findHypersenseThreat(): { dx: number; dy: number } | null {
    const px = this.player.x, py = this.player.y;
    // 1) Nearest enemy projectile heading toward us within ~150px.
    let best: Projectile | null = null;
    let bestDist = 150;
    for (const obj of this.projectiles.getChildren() as Projectile[]) {
      if (!obj.active || obj.isFromPlayer) continue;
      const body = obj.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const toPx = px - obj.x, toPy = py - obj.y;
      const dist = Math.sqrt(toPx * toPx + toPy * toPy);
      if (dist > bestDist) continue;
      if (body.velocity.x * toPx + body.velocity.y * toPy <= 0) continue; // not closing in
      bestDist = dist;
      best = obj;
    }
    if (best) {
      const body = best.body as Phaser.Physics.Arcade.Body;
      let perpX = -body.velocity.y, perpY = body.velocity.x;
      const plen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      perpX /= plen; perpY /= plen;
      // Sidestep to whichever perpendicular side moves us further from the shot's path.
      if ((px - best.x) * perpX + (py - best.y) * perpY < 0) { perpX = -perpX; perpY = -perpY; }
      return { dx: perpX, dy: perpY };
    }
    // 2) Melee: a live enemy pressed right up against us — dash straight away.
    const edist = Phaser.Math.Distance.Between(px, py, this.npc.x, this.npc.y);
    if (edist <= 58 && this.npc.hp > 0) {
      const ang = Math.atan2(py - this.npc.y, px - this.npc.x);
      return { dx: Math.cos(ang), dy: Math.sin(ang) };
    }
    return null;
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
        fontSize: '16px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
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
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
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
          fontSize: '18px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
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
      fontSize: '8px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffffff',
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
      fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ff6688',
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
        fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#444444', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20).setAlpha(0.85);
      this.honorPlayerTallyTexts.push(pt);

      const nt = this.add.text(W / 2 + 80 - i * 28, 60, '|', {
        fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#444444', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20).setAlpha(0.85);
      this.honorNpcTallyTexts.push(nt);
    }
    const label = this.add.text(W / 2, 38, '⚔️ HONOR', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
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
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
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
          // Present only when launched from a campaign world's invasion node — it
          // sends the results screen back to that world instead of the title.
          campaign: this.campaign ?? undefined,
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
  // Heal numbers are batched per fighter so smooth (per-frame) healing shows
  // as a few readouts rather than a flood of tiny "+0"s.
  private playerHealNumAccum = 0;
  private npcHealNumAccum = 0;
  private playerHealNumTimer = 0;
  private npcHealNumTimer = 0;

  /** Green heal number, styled like spawnDamageNumber but floating straight up. */
  private spawnHealNumber(x: number, y: number, amount: number): void {
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 14 + Math.random() * 14;
    const sx = x + Math.cos(angle) * spawnRadius;
    const sy = y + Math.sin(angle) * spawnRadius;

    const txt = this.add.text(sx, sy, `+${amount}`, {
      fontSize: `${Math.min(20, 12 + Math.floor(amount / 10))}px`,
      fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#55ff66',
      stroke: '#0a3a12',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txt,
      x: sx + Math.cos(angle) * 16,
      y: sy - 42,
      alpha: 0,
      duration: 750,
      ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  /** Flush batched healing into green heal numbers (~3 per second per fighter). */
  private updateHealNumbers(delta: number): void {
    this.playerHealNumTimer += delta;
    if (this.playerHealNumTimer >= 300) {
      this.playerHealNumTimer = 0;
      if (this.playerHealNumAccum >= 1) {
        this.spawnHealNumber(this.player.x, this.player.y - 20, Math.round(this.playerHealNumAccum));
        this.playerHealNumAccum = 0;
      }
    }
    this.npcHealNumTimer += delta;
    if (this.npcHealNumTimer >= 300) {
      this.npcHealNumTimer = 0;
      if (this.npcHealNumAccum >= 1) {
        this.spawnHealNumber(this.npc.x, this.npc.y - 20, Math.round(this.npcHealNumAccum));
        this.npcHealNumAccum = 0;
      }
    }
  }

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
      fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
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

  // ── Hunt helpers ─────────────────────────────────────────────

  /** Swap the ability tray to whichever of Hunt's three forms the player is wearing. */
  private huntSetHudForm(form: 'human' | 'beast' | 'hybrid'): void {
    const show = (objs: Phaser.GameObjects.GameObject[], on: boolean) => {
      for (const o of objs) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(on);
    };
    show(this.huntNormalHudCards, form === 'human');
    show(this.huntBeastHudCards, form === 'beast');
    show(this.huntHybridHudCards, form === 'hybrid');
    this.abilityBars = form === 'beast' ? this.huntBeastFills
      : form === 'hybrid' ? this.huntHybridFills : this.huntNormalFills;
  }

  /** Bleed aura + drips on any enemy Fighter. The per-frame loop repositions and expires it. */
  private applyBleedVisualTo(t: Fighter): void {
    if (!t.bleedVisual) {
      t.bleedVisual = this.add.circle(t.x, t.y, 26, 0xcc0000, 0.3)
        .setStrokeStyle(2, 0xff2222, 0.5).setDepth(3);
      this.tweens.add({ targets: t.bleedVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
    }
    // The wound opening: a rake on the body and blood thrown off it.
    this.huntKit.fxWeakPoint(t.x, t.y, Math.random() * Math.PI * 2);
    this.showFloatingText(t.x, t.y - 28, '🩸 Bleeding!', '#ff2222');
  }

  private applyPlayerBleedVisual(): void {
    if (!this.playerBleedAura) {
      this.playerBleedAura = this.add.circle(this.player.x, this.player.y, 26, 0xcc0000, 0.3)
        .setStrokeStyle(2, 0xff2222, 0.5).setDepth(3);
      this.tweens.add({ targets: this.playerBleedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
    }
    this.huntKit.fxWeakPoint(this.player.x, this.player.y, Math.random() * Math.PI * 2);
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

    // The button held from the MenuScene difficulty click is latched out until it
    // is released once (see create()). Suppress both isDown and the left-button bit
    // so neither `pointer.isDown` nor `pointer.leftButtonDown()` abilities fire.
    if (this.pointerInputLatched) {
      pointer.isDown = false;
      pointer.buttons &= ~1;
    }

    // Online: broadcast our state and interpolate the remote replica
    if (this.isOnline) this.onlineKit?.update();

    this.updateHealNumbers(delta);

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
    this.cosmeticsKit.update();
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

    // ── Shadow Mastery progress tracking (accrues even before unlock) ──
    if (this.elementId === 'shadow') {
      for (const t of this.enemies) {
        if (!t.active || this.shadowMasteryTrackedEnemies.has(t)) continue;
        this.shadowMasteryTrackedEnemies.add(t);
        t.once('defeated', () => {
          if (this.shadowKit.isBlackHoleActive()) {
            PlayerData.addMasteryStat('shadow', 'blackHoleKills', 1);
          }
        });
      }
    }

    // ── Electricity per-frame ─────────────────────────────────────
    if (this.elementId === 'electricity') {
      this.electricityKit.update(time, delta);
    } else if (this.npcElement.id === 'electricity') {
      // Online: opponent is electricity — advance only npc-owned effects (kinetic bombs).
      this.electricityKit.updateNpc(time, delta);
    }

    // ── Slime per-frame ───────────────────────────────────────────
    if (this.elementId === 'slime') {
      this.slimeKit.update(time, delta);
    } else if (this.npcElement.id === 'slime') {
      // Online: opponent is acid — advance only their rig and the effects we can see.
      this.slimeKit.updateNpc(time, delta);
    }

    // ── Burning DOT (Flameshredder upgrade / Fire Mastery stoke) ──
    for (const t of this.enemies) {
      if (!t.active) continue;
      // Wildfire achievement: 20s of continuous fire (burning or molten) on one enemy.
      if (this.elementId === 'fire' && t.burnContinuousMs >= 20000) this.unlockAchievement('wildfire');
      if (t.burningUntil > time) {
        const stoked = t.fireStokeBonus > 0;
        const auraColor = this.cosmeticsKit.fireColor('player', stoked ? 0xcc1100 : 0xff4400);
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
      // Form, trail, adrenaline and every other hunt contribution arrive together below,
      // through HuntKit.getPlayerSpeedMult().
      this.playerSpeedMult = 1;
    } else if (this.elementId === 'life') {
      // Speed Cotton pads give a short 50% burst when the player walks over one.
      this.playerSpeedMult = this.lifeKit.getPlayerSpeedMult();
    } else if (this.elementId === 'silence') {
      this.playerSpeedMult = 1;
    } else if (this.elementId === 'sand') {
      this.playerSpeedMult = this.timeKit.getPlayerSpeedMult();
    } else if (this.elementId === 'earth') {
      this.playerSpeedMult = 1;
      if (this.earthKit.isRepairActive()) this.playerSpeedMult *= 0.2;
      if (this.earthKit.isTitanActive()) this.playerSpeedMult = 0; // Q+ Titan Form: you are the golem, rooted
      if (this.hasPerk('player', 'obsidian')) this.playerSpeedMult *= 0.85;
    } else if (this.elementId === 'crystal') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // F+: 20% speed boost for 3s after portal teleport
      if (time < this.crystalKit.getPortalSpeedBuffUntil()) this.playerSpeedMult *= 1.2;
      // Mastery — Resonance: 3x speed for 0.2s after getting hit by your own Diamond Shard
      if (time < this.crystalKit.getResonanceSpeedUntil()) this.playerSpeedMult *= 3;
    } else if (this.elementId === 'creation') {
      this.playerSpeedMult = this.creationKit.computePlayerSpeedMult(
        time, time < this.playerGeyserBuffUntil ? 1.5 : 1,
      );
    } else if (this.elementId === 'slime') {
      this.playerSpeedMult = this.slimeKit.getBurrowSpeedMult();
    } else if (this.elementId === 'fate') {
      this.playerSpeedMult = 1;
      // Kit applies Buff/Slots speed mods via applyPlayerSpeedMult
    } else if (this.elementId === 'light') {
      // Light Lance drives the player body directly (car-mode physics) while held —
      // see LightKit.update(). This mult only matters for the moments it isn't.
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
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
    } else if (this.elementId === 'water') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // Water Mastery — Slipstream: +25% while standing in your own water.
      this.playerSpeedMult *= this.waterKit.getPlayerSpeedMult();
    } else if (this.elementId === 'air') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // Air Mastery — Swift as the Wind: up to +50% from an unbroken snipe streak.
      this.playerSpeedMult *= this.airKit.getPlayerSpeedMult();
    } else if (this.elementId === 'technology') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // F+ Wheel of Fortune speed buff
      this.playerSpeedMult *= this.techKit.getPlayerSpeedMult();
    } else if (this.elementId === 'growth') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // Growth Mastery — Viral Consumption: +20% after eating a healthy virus.
      this.playerSpeedMult *= this.growthKit.getPlayerSpeedMult();
    } else {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
    }

    // Silence: hallway/maze dread on a victim, plus Weep on a mastered Silence player.
    // Pulled here rather than pushed from SilenceKit.update(), which runs after player
    // movement has already resolved for the frame — see getPlayerSpeedMult().
    if (this.elementId === 'silence' || this.npcElement.id === 'silence') {
      this.playerSpeedMult *= this.silenceKit.getPlayerSpeedMult(time);
    }

    this.npcSpeedMult = 1;
    if (this.fireKit.isNpcFlameBodyActive()) this.npcSpeedMult = 2;
    else if (time < this.npcGeyserBuffUntil) this.npcSpeedMult = 1.5;
    // Creation NPC: Workshop + Speed Potion
    if (this.npcElement.id === 'creation') {
      this.npcSpeedMult = this.creationKit.computeNpcSpeedMult(time, this.npcSpeedMult);
    }
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
    // Shadow String-perk tripline slows
    if (this.elementId === 'shadow' || this.npcElement.id === 'shadow') {
      this.npcSpeedMult *= this.shadowKit.getNpcSpeedMult(time);
      this.playerSpeedMult *= this.shadowKit.getPlayerSpeedMult(time);
    }
    // Growth Mastery — Sickness/Carrier slows on whoever is carrying the plague
    if (this.elementId === 'growth' || this.npcElement.id === 'growth') {
      this.playerSpeedMult *= this.growthKit.getSickSpeedMult(this.player);
      this.npcSpeedMult *= this.growthKit.getSickSpeedMult(this.npc);
    }
    // Tornado grapple slow on NPC
    if (time < this.tornadoGrappleSlowUntil) this.npcSpeedMult *= 0.5;
    // Ice: frost/permafrost slow, block-up slow, own-trail boost, Rink perk (NPC)
    this.npcSpeedMult *= this.iceKit.getNpcSpeedMultContribution(time);
    // Ice: frost/permafrost slow, block-up slow, skate-trail boost, Rink perk (player)
    this.playerSpeedMult *= this.iceKit.getPlayerSpeedMultContribution(time, this.elementId === 'ice');

    // Hunt: form, trail, adrenaline, roar slows and the Beastling's own roar all arrive
    // as one number per side. Pulled here rather than pushed from HuntKit.update(), which
    // runs after player movement has already resolved for the frame.
    if (this.elementId === 'hunt' || this.npcElement.id === 'hunt') {
      this.playerSpeedMult *= this.huntKit.getPlayerSpeedMult(time);
      if (!this.isInvasion) this.npcSpeedMult *= this.huntKit.getNpcSpeedMult(time);
    }
    // Rage perk: standing in the tracks builds the meter, and 100 forces the beast out early.
    if (this.elementId === 'hunt' && this.hasPerk('player', 'rage')) {
      if (this.huntKit.isPlayerOnOwnTrail()) {
        this.playerHuntRage = Math.min(100, this.playerHuntRage + 10 * (delta / 1000));
      }
      if (this.playerHuntRage >= 100 && !this.huntKit.isBeastForm('player') && !this.huntKit.isHybridForm('player')) {
        this.playerHuntRage = 0;
        this.playerHuntRageTriggeredBeast = true;
        this.huntKit.forceBeast('player');
        const burst = this.add.circle(this.player.x, this.player.y, 20, 0xcc2233, 0.8).setDepth(8);
        this.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
        this.showFloatingText(this.player.x, this.player.y - 30, '🩸 RAGE', '#cc2233');
      }
    }
    // Silence slasher dread aura: kit applies via applyNpcSpeedMult / applyPlayerSpeedMult in update()
    // Card — Cripple: 15% slow on NPC for 2s after any player hit
    if (this.cardCrippleActive && time < this.cardCrippleSlowUntil) this.npcSpeedMult *= 0.85;
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

    // ── Online PvP: the slow the opponent's sim is applying to us ─────
    // Their machine owns every slow they land (see OnlineKit's `fx` mirror), so it is
    // folded in here as one factor rather than relying on each kit's npc-side replay.
    if (this.isOnline && !this.isInvasion) this.playerSpeedMult *= this.player.netSpeedMult;

    // ── Acid Purge: suppress positive speed multipliers while purged ──
    if (time < this.player.purgedUntil) this.playerSpeedMult = Math.min(this.playerSpeedMult, 1);
    if (time < this.npc.purgedUntil) this.npcSpeedMult = Math.min(this.npcSpeedMult, 1);

    // ── Light Mastery — Unstoppable: no slow and no hard control sticks ──
    // Runs after every other speed contribution (Purge included) so it always wins.
    if (this.player.unstoppable) {
      this.playerSpeedMult = Math.max(this.playerSpeedMult, 1);
      this.player.walkSpeedMult = Math.max(this.player.walkSpeedMult, 1);
      this.player.purgeSpeedMult = 1;
      this.player.frozenUntil = 0;
      this.player.magicChainBound = false;
      this.player.earthStunnedUntil = 0;
      this.player.highGravityUntil = 0;
      if (this.iceKit.getPlayerFrozenUntil() > 0) this.iceKit.setPlayerFrozenUntil(0);
    }
    if (this.npc.unstoppable) {
      this.npcSpeedMult = Math.max(this.npcSpeedMult, 1);
      this.npc.walkSpeedMult = Math.max(this.npc.walkSpeedMult, 1);
      this.npc.purgeSpeedMult = 1;
      this.npc.frozenUntil = 0;
      this.npc.magicChainBound = false;
      this.npc.earthStunnedUntil = 0;
      this.npc.highGravityUntil = 0;
    }

    // ── High Gravity (Gravity F+/Q+): every movement *effect* is dead weight ──
    // Runs last so it beats Unstoppable's floor — Unstoppable already cleared the
    // timer above, so anything still crushed here is genuinely crushed.
    if (time < this.player.highGravityUntil) {
      this.playerSpeedMult = Math.min(this.playerSpeedMult, 1);
      this.player.walkSpeedMult = Math.min(this.player.walkSpeedMult, 1);
    }
    if (time < this.npc.highGravityUntil) {
      this.npcSpeedMult = Math.min(this.npcSpeedMult, 1);
      this.npc.walkSpeedMult = Math.min(this.npc.walkSpeedMult, 1);
    }

    // ── Player movement ─────────────────────────────────────────
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.elementId === 'gravity' && this.gravityKit.drivesPlayerBody()) {
      // Anti-Grav flight, the Moon Rider orbit and the dismount finale all place the
      // body themselves — WASD must not fight them for it.
    } else if (this.elementId === 'rubber' && this.rubberKit.isSlingActive() && !this.isDodging) {
      this.rubberKit.applySlingMovement(mouseX, mouseY);
    } else if (this.nukeChanneling && !this.airBeamWalking &&
               !(this.elementId === 'water' && this.waterKit.isDaggerCharging()) &&
               !(this.elementId === 'air' && this.hasUpgrade('click'))) {
      // Standard nuke: fully locked
      playerBody.setVelocity(0, 0);
    } else if (time < this.silencePlayerYankUntil) {
      // NPC silence yank in progress — keep yank velocity, block WASD override
    } else if (this.elementId === 'ice' && this.iceKit.isPlayerSkaterActive() && !this.isDodging) {
      // Skater mode: cursor-following movement overrides WASD
      const moveMult = this.playerSpeedMult * this.gauntletSpeedMult;
      playerBody.setVelocity(
        Math.cos(this.iceKit.getPlayerSkaterHeading()) * this.iceKit.getPlayerSkaterSpeed() * moveMult,
        Math.sin(this.iceKit.getPlayerSkaterHeading()) * this.iceKit.getPlayerSkaterSpeed() * moveMult,
      );
    } else if (!this.isDodging) {
      let vx = 0;
      let vy = 0;
      if (this.aKey.isDown) vx -= this.player.speed;
      if (this.dKey.isDown) vx += this.player.speed;
      if (this.wKey.isDown) vy -= this.player.speed;
      if (this.sKey.isDown) vy += this.player.speed;

      if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

      // Fate Mastery — Confusing curse: every direction key does the opposite.
      if (this.player.invertedControlsUntil > time) { vx = -vx; vy = -vy; }

      let moveMult = this.playerSpeedMult * this.gauntletSpeedMult;
      if (this.fireKit.isPressureCharging()) moveMult *= 0.75;    // Pressure Charge: 75% speed

      playerBody.setVelocity(vx * moveMult, vy * moveMult);
    }

    // ── Online PvP: relayed knockbacks, pulls and hard control ────
    // Runs after WASD so a shove the opponent's sim applied to their replica of us
    // actually moves us, instead of being erased by the next movement frame.
    if (this.isOnline && !this.isInvasion && !this.isDodging) {
      const nowWall = Date.now();
      const rooted = remainingMs(this.player.frozenUntil, nowWall, time) > 0
        || (this.player.magicChainBound && remainingMs(this.player.magicChainBoundEnd, nowWall, time) > 0);
      // A shove outranks a root: being dragged out of place is the whole point of a
      // pull, and it lasts a handful of frames either way.
      if (time < this.player.netShoveUntil) {
        playerBody.setVelocity(this.player.netShoveVx, this.player.netShoveVy);
      } else if (rooted) {
        playerBody.setVelocity(0, 0);
      }
    }

    // ── NPC tentacle drag on player ───────────────────────────────
    if (this.shadowKit.isNpcTentacleDragging() && !this.isDodging) {
      // In PvP, drag toward P2's aim position; in AI mode, drag toward random AI target
      const dragTargetX = this.shadowKit.getNpcDragTargetX();
      const dragTargetY = this.shadowKit.getNpcDragTargetY();
      const dragDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, dragTargetX, dragTargetY);
      if (dragDist > 20) {
        const dragAngle = Math.atan2(dragTargetY - this.player.y, dragTargetX - this.player.x);
        playerBody.setVelocity(Math.cos(dragAngle) * 200, Math.sin(dragAngle) * 200);
      }
    }

    // ── Frozen player ─────────────────────────────────────────────
    if (this.iceKit.getPlayerFrozenUntil() > time && !this.isDodging) {
      playerBody.setVelocity(0, 0);
    }

    // ── Sound Solo: locked on stage while performing ──────────────
    if (this.elementId === 'sound' && this.soundKit.isSoloActive() && !this.isDodging) {
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
      this.waterKit.handleInput(time, delta, pointer, mouseX, mouseY);

    } else if (this.elementId === 'life') {
      // The seed bar and E+ plant dragging swallow the pointer before it becomes an attack.
      this.lifeKit.handleInput(pointer, mouseX, mouseY);

      // ── Click: Petal Shotgun (or Sakura Shots upgrade) ───────────
      if (pointer.isDown && !this.lifeKit.consumedPointer()) {
        this.lifeKit.doPetalShotgun(mouseX, mouseY);
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
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) this.fateKit.onEKey();
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
            this.airKit.setElectroCharged(false);
            this.player.chargeRatio = 0;
            this.airKit.playPlayerGesture('punch');
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
            fireHitscan(electroCtx, 45, AIR.charge, true);
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
              if (this.quickShotCharged) {
                this.quickShotCharged = false;
                this.airKit.playPlayerGesture('punch');
              } else {
                // Charged shot: the rig hauls the air back for half a second, then lets fly.
                this.airKit.setPlayerHold('draw', 500);
                this.time.delayedCall(500, () => this.airKit.playPlayerGesture('punch'));
              }
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
              this.airKit.setElectroCharged(true);
              this.airKit.playPlayerGesture('clap');
            }
          } else {
            if (this.player.castAbility('quick-shot', playerCtx)) this.airKit.playPlayerGesture('flex');
          }
        }

        // ── R: Wind Trap ──────────────────────────────────────────
        if (this.masteryBindFor('r') !== 'sweeping-tornado' && Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('wind-trap', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── F: Grapple ────────────────────────────────────────────
        if (this.masteryBindFor('f') !== 'sweeping-tornado' && Phaser.Input.Keyboard.JustDown(this.fKey)) {
          // The launch/land effects and the dash pose come from grappleTo in the context.
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
              // Lingering Beam leaves the caster free to walk, so the gather tracks them.
              this.airKit.playerChannelCharge(150, 1500);
              this.airKit.setPlayerHold('charge', 1500);
              this.time.delayedCall(1500, () => {
                this.airBeamWalking = false;
                this.nukeChanneling = false;
                this.player.chargeRatio = 0;
                this.airKit.playPlayerGesture('punch', Math.atan2(capY - capPY, capX - capPX), 520);
                // Fire straight hitscan (100 dmg initial)
                const ctx = this.buildPlayerContext(capX, capY);
                this.airKit.onBeamHits(fireHitscan(ctx, 100, AIR.blue, false).length);
                // Compute beam endpoint (direction from player to cursor, extended to screen edge)
                const dx2 = capX - capPX;
                const dy2 = capY - capPY;
                const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                this.airKit.addLingeringBeam(
                  capPX, capPY,
                  capPX + (dx2 / len2) * 900, capPY + (dy2 / len2) * 900,
                  'player',
                );
              });
            }
          } else {
            if (this.player.castAbility('charged-beam', this.buildPlayerContext(mouseX, mouseY))) {
              this.airConsecutiveHits = 0;
              this.airKit.setPlayerHold('charge', 1500);
              this.time.delayedCall(1500, () => this.airKit.playPlayerGesture('punch', undefined, 520));
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
    } else if (this.elementId === 'gunpowder') {
      this.gunpowderKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'rubber') {
      this.rubberKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'magic') {
      this.magicKit.handleInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'technology') {
      this.techKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'echo') {
      this.echoKit.handleInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'quantum') {
      this.subterfugeKit.handleInput(time, delta, pointer);
      // Dark Treachery magic-Q copy: while the stolen necronomicon wheel is open,
      // route input to MagicKit (its handleInput early-returns into wheel-driving).
      if (this.magicKit.isNecroWheelOpen()) this.magicKit.handleInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'earth') {
      this.earthKit.handleInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'light') {
      this.lightKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'oil') {
      this.oilKit.handleInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'shadow') {
      this.shadowKit.handleInput(time, delta, pointer, mouseX, mouseY);
    } else if (this.elementId === 'ice') {
      this.iceKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'crystal') {
      this.crystalKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'growth') {
      this.growthKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'soul') {
      this.soulKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'hunt') {
      this.huntKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'silence') {
      this.silenceKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'sand') {
      this.timeKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'gravity') {
      this.gravityKit.handleInput(time, pointer, mouseX, mouseY, delta);
    } else if (this.elementId === 'creation') {
      this.creationKit.handleInput(time, pointer, mouseX, mouseY, playerCtx);
    }
    this.pointerWasDown = pointer.isDown;
    this.rightPointerWasDown = pointer.rightButtonDown();

    // ── Water world effects (rig, pools, springs, Splash downpour) ───
    if (this.elementId === 'water' || this.npcElement.id === 'water') {
      this.waterKit.update(time, delta);
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
            target.takeDamage(dmg, { source: p, sourceX: p.x, sourceY: p.y }); this.spawnHitFlash(target.x, target.y, flashColor);
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

    // ── Pain Rain drops ───────────────────────────────────────────
    for (let i = this.painRainShadows.length - 1; i >= 0; i--) {
      const s = this.painRainShadows[i];
      if (!s.fired && time >= s.fireAt) {
        s.fired = true;
        s.sprite.destroy();
        this.waterKit.rainImpact(s.x, s.y, s.hitRadius * 0.5, s.owner);

        if (s.owner === 'player') {
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
            this.waterKit.spawnSquallPool(s.x, s.y);
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
      this.shadowKit.update(time, delta, this.elementId === 'shadow', this.npcElement.id === 'shadow');
    }

    // ── Dodge (Space) ────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dodgeOnCooldown && !this.isDodging && !this.nukeChanneling && !this.cardSluggishDisableDodge && !this.silenceKit.isPlayerControlLost() && time >= this.player.highGravityUntil) {
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
      this.executeDodge(dx, dy);
    }

    // ── Echo Q+ Hypersense: auto-dodge incoming attacks during the 4s reveal ──
    if (this.elementId === 'echo' && this.echoKit.isHypersenseActive() && !this.isDodging
        && !this.nukeChanneling && !this.cardSluggishDisableDodge && !this.silenceKit.isPlayerControlLost()
        && time >= this.echoHypersenseNextDodgeAt) {
      const threat = this.findHypersenseThreat();
      if (threat) {
        this.executeDodge(threat.dx, threat.dy, true);
        this.echoHypersenseNextDodgeAt = time + 350;
        PlayerData.addMasteryStat('echo', 'hypersenseDodges', 1);
      }
    }

    // ── NPC AI ───────────────────────────────────────────────────
    const aiState: NpcAiState = {
      isLocked: this.npcNukeChanneling || this.npc.frozenUntil > time || this.magnetKit.getNailPullUntil() > time || (this.npc.magicChainBound && time < this.npc.magicChainBoundEnd) || time < this.silenceKit.getNpcYankUntil() || this.airKit.isNpcHawkDragged() || (this.npcElement.id === 'rubber' && this.rubberKit.isBounceFormActive('npc')) || this.waterKit.isNpcSplit() || this.npc.chickenUntil > Date.now() || this.techKit.isNpcDragged(),
      hasActiveGeyser: this.geysers.some((g) => g.owner === 'npc'),
      flameBodyActive: this.fireKit.isNpcFlameBodyActive(),
      projectiles: this.projectiles,
      plantCount: this.lifeKit.getPlantCount('npc'),
      thornDragActive: false,
      enemyNearPlant: this.lifeKit.getPlantCount('npc') > 0,
      windTrapActive: this.airKit.isNpcTrapActive(time),
      chargedBeamReady: this.npcAirConsecutiveHits >= 3,
      earthShieldHp: this.earthKit.getNpcShieldHp(),
      npcEarthRocksActive: this.earthKit.getNpcRocksActive(),
      oilDroneCount: this.oilKit.getNpcDroneCount(),
      shadowPlayerSnared: this.shadowKit.isPlayerSnared(time),
      playerFrostStacks: this.iceKit.getPlayerFrostStacks(),
      iceBlockActive: this.iceKit.isNpcBlockUpActive(),
      npcGrowthDna: this.growthKit.getDna('npc'),
      npcGrowthHasNestOrClone: this.growthKit.hasNest('npc') || this.growthKit.hasClone('npc'),
      crystalNodeCount: this.crystalKit.getNpcCrystalNodeCount(),
      npcSoulCorpseCount: this.soulKit.corpseCount('npc'),
      npcSoulAmalgamCount: this.soulKit.amalgamCount('npc'),
      npcSoulGraveCount: this.soulKit.graveCount('npc'),
      npcHuntBeastForm: this.huntKit.isBeastForm('npc'),
      npcHuntTrailActive: this.huntKit.isTrailActive('npc'),
      npcHuntBlastCharges: this.huntKit.getBlastCharges('npc'),
      playerBleeding: this.playerBleeding,
      npcTimeRemainActive: this.timeKit.isNpcRemainActive(),
      npcTimeHaltActive: this.timeKit.isNpcBountyAuraActive(),
      npcTimeBountyAuraActive: this.timeKit.isNpcBountyAuraActive(),
      npcTimeBounty: this.timeKit.getNpcBounty(),
      npcTimeTimelessReady: this.timeKit.getNpcTimelessCharge() >= 10000,
      // Fate
      fateNpcHandTypes: this.npcElement.id === 'fate' ? this.fateKit.getNpcHandTypes() : undefined,
      npcMetalHasFlail: this.metalKit.hasFlail('npc'),
      npcMetalFlailSwinging: this.metalKit.isFlailSwinging('npc'),
      npcMetalBlood: this.metalKit.getBlood('npc'),
      npcGunpowderArsenalSize: this.gunpowderKit.getArsenalSize('npc'),
      targetInvisible: (this.elementId === 'silence' && this.silenceKit.isInvisible('player'))
        || (this.elementId === 'technology' && (this.techKit.isPlayerSheltered() || this.techKit.isPlayerAdminInvisible())),
      silenceStalkersPresent: this.elementId === 'silence' && this.silenceKit.stalkersAlive('player') > 0,
      npcSilenceStealth: this.silenceKit.getStealth('npc'),
      npcSilenceStalkers: this.silenceKit.stalkersAlive('npc'),
      npcSilenceMatureStalker: this.silenceKit.getMatureStalkerPos('npc'),
      npcSilenceInvisible: this.npcElement.id === 'silence' && this.silenceKit.isInvisible('npc'),
      echoAttachActive: this.npcElement.id === 'echo' ? this.echoKit.isNpcBatAttaching() : false,
      subMoney: this.npcElement.id === 'quantum' ? this.subterfugeKit.getNpcMoney() : 0,
      subBullets: this.npcElement.id === 'quantum' ? this.subterfugeKit.getNpcBullets() : 0,
      subLackeys: this.npcElement.id === 'quantum' ? this.subterfugeKit.getNpcLackeyCount() : 0,
    };

    const npcPreDashX = this.npc.x;
    const npcPreDashY = this.npc.y;
    const npcCastId = this.isOnline
      ? (this.isInvasion ? (this.invasionCoopKit?.consumeNpcCast() ?? null) : (this.onlineKit?.consumeNpcCast() ?? null))
      : (this.isInvasion || this.shadowKit.isConsumeActive() || this.time.now < this.shadowKit.getNpcThrowUntil()) ? null : (this.npc as NpcOpponent).doAI(
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
    // Shadow post-AI overrides (must run after doAI so drag velocities win)
    if (this.elementId === 'shadow') {
      this.shadowKit.updateAfterAI(time, delta);
    }
    // Magic Mastery — Transmogrify chicken wander (must run after doAI so it wins).
    // Runs for either side so an opponent's chicken bolt wanders our local player online.
    if (this.elementId === 'magic' || this.npcElement.id === 'magic') {
      this.magicKit.updateAfterAI(time, delta);
    }

    // React to NPC casts that need ArenaScene state
    this.fireKit.handleNpcCastId(npcCastId, time);
    this.waterKit.handleNpcCastId(npcCastId, time);
    this.lifeKit.handleNpcCastId(npcCastId);
    this.airKit.handleNpcCastId(npcCastId);
    this.oilKit.handleNpcCastId(npcCastId);
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
    // ── Ice per-frame ─────────────────────────────────────────────
    if (this.elementId === 'ice' || this.npcElement.id === 'ice') {
      this.iceKit.update(time, delta, this.elementId === 'ice', this.npcElement.id === 'ice');
      // Online: opponent is ice — replay their Icicle Impale dash + track its icicle on us.
      if (this.elementId !== 'ice' && this.npcElement.id === 'ice') this.iceKit.updateNpc(time);
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

    // ── Generic toxic DOT (Death / Life kits) ──────────────
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

    // ── Crystal per-frame ─────────────────────────────────────────
    this.crystalKit.update(time, delta, mouseX, mouseY);

    // ── Soul per-frame ─────────────────────────────────────────────
    if (this.elementId === 'soul' || this.npcElement.id === 'soul') {
      this.soulKit.update(time, delta);
    }

    // ── Hunt per-frame ───────────────────────────────────────────
    if (this.elementId === 'hunt' || this.npcElement.id === 'hunt') {
      this.huntKit.update(time, delta);
      // Rage perk: a meter above the HP bar that fills while you stand in the tracks.
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
    }

    // ── Bleeding auras (Amber mutation, husk statuses) ───────────
    for (const t of this.enemies) {
      if (!t.active || !t.bleeding) continue;
      if (time > t.bleedingUntil) {
        t.bleeding = false;
        if (t.bleedVisual) { t.bleedVisual.destroy(); t.bleedVisual = null; }
      } else if (t.bleedVisual) {
        t.bleedVisual.setPosition(t.x, t.y);
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
      this.gravityKit.update(time, delta);
    }

    // ── Creation per-frame ────────────────────────────────────────
    if (this.elementId === 'creation' || this.npcElement.id === 'creation') {
      this.creationKit.update(time, delta);
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
      this.magnetKit.update(time, delta, this.elementId === 'magnet', this.npcElement.id === 'magnet');
    }

    // ── Metal per-frame ───────────────────────────────────────────
    if (this.elementId === 'metal' || this.npcElement.id === 'metal') {
      this.metalKit.update(time, delta);
    }

    // ── Plasma per-frame ─────────────────────────────────────────
    if (this.elementId === 'plasma' || this.npcElement.id === 'plasma') {
      this.plasmaKit.update(time, delta);
    }

    // ── Gunpowder per-frame ──────────────────────────────────────
    if (this.elementId === 'gunpowder' || this.npcElement.id === 'gunpowder') {
      this.gunpowderKit.update(time, delta);
    }

    // ── Growth per-frame ──────────────────────────────────────────
    if (this.elementId === 'growth' || this.npcElement.id === 'growth') {
      this.growthKit.update(time, delta);
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
      this.subterfugeKit.update(time, delta);
    }

    // ── Oil per-frame ─────────────────────────────────────────────
    if (this.elementId === 'oil' || this.npcElement.id === 'oil') {
      this.oilKit.update(time, delta,
        this.elementId === 'oil',
        this.npcElement.id === 'oil',
        mouseX, mouseY);
      // Online: opponent is oil — run their replayed Turret against our local player.
      if (this.npcElement.id === 'oil') this.oilKit.updateNpcTurret(time, delta);
    }

    // ── Fate per-frame ───────────────────────────────────────────
    if (this.elementId === 'fate' || this.npcElement.id === 'fate') {
      this.fateKit.update(time, delta,
        this.elementId === 'fate',
        this.npcElement.id === 'fate');
    }

    // Air's tornado and Wind Trap both hold their catch by position, so the kit has to run
    // after NPC AI and husk movement have written their velocities for this frame.
    if (this.elementId === 'air' || this.npcElement.id === 'air') this.airKit.update(time, delta);

    // ── Puddle slow (post-AI) ─────────────────────────────────────
    if (this.puddles.length > 0) {
      const playerInPuddle = !this.player.levitating && this.puddles.some(
        (p) => p.kind !== 'stalagmite' && p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
      );
      if (playerInPuddle) {
        const pb = this.player.body as Phaser.Physics.Arcade.Body;
        pb.velocity.x *= 0.5;
        pb.velocity.y *= 0.5;
      }

      const npcInPuddle = !this.npc.levitating && this.puddles.some(
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
        p.destroy(); continue;
      }
      if (p.x < wb.left - 60 || p.x > wb.right + 60 || p.y < wb.top - 60 || p.y > wb.bottom + 60) {
        p.destroy();
      }
    }

    // ── Clamp all enemies to arena bounds ────────────────────────
    {
      const wb = this.physics.world.bounds;
      const allEnemies: Fighter[] = [this.npc];
      for (const e of allEnemies) {
        if (!e.active || this.silenceKit.isCarriedByVulture(e)) continue;
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

    // Campaign shop items with a per-second cost (Hot Sauce and friends).
    this.itemsKit?.update(delta);

    // ── Update HUD cooldown bars ─────────────────────────────────
    this.updatePlayerHpBar();
    this.statusHudKit.update(delta);

    for (const entry of this.abilityBars) {
      // Creation's Build Mode borrows all five slots for a second loadout with its own
      // timers, so it gets first refusal on every card before the per-ability chain below.
      const buildRatio = this.elementId === 'creation'
        ? this.creationKit.buildModeBarRatio(entry.abilityId, time) : null;
      if (buildRatio !== null) {
        entry.fill.setSize(entry.maxWidth * buildRatio, entry.fill.height);
      } else if (entry.abilityId === 'heatwave') {
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
      } else if (entry.abilityId === 'shadow-beacon') {
        entry.fill.setSize(entry.maxWidth * this.shadowKit.getShadowBeaconCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'icicle-impale') {
        entry.fill.setSize(entry.maxWidth * this.iceKit.getIcicleImpaleCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'curling-stone') {
        entry.fill.setSize(entry.maxWidth * this.iceKit.getCurlingStoneCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'kinetic-bomb') {
        entry.fill.setSize(entry.maxWidth * this.electricityKit.getKineticBombCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'starfall') {
        entry.fill.setSize(entry.maxWidth * this.gravityKit.getStarfallCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'crystal-shredder') {
        entry.fill.setSize(entry.maxWidth * this.crystalKit.getShredderCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'transmogrify') {
        entry.fill.setSize(entry.maxWidth * this.magicKit.getTransmogrifyCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'steel-shield') {
        entry.fill.setSize(entry.maxWidth * this.metalKit.getSteelShieldCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'breakdown') {
        entry.fill.setSize(entry.maxWidth * this.slimeKit.getBreakdownCooldownRatio(time), entry.fill.height);
      } else if ((entry.abilityId === 'growth-virus' || entry.abilityId === 'spore-spray')
          && this.elementId === 'growth' && this.growthKit.hasSweating()) {
        entry.fill.setSize(entry.maxWidth * this.growthKit.getChargeBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId === 'mag-lev') {
        entry.fill.setSize(entry.maxWidth * this.magnetKit.getMagLevCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'time-bomb') {
        entry.fill.setSize(entry.maxWidth * this.timeKit.getBombCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'echo-bloom') {
        entry.fill.setSize(entry.maxWidth * this.echoKit.getBloomCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'killer-kebab') {
        entry.fill.setSize(entry.maxWidth * this.lightKit.getKebabCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'grave-mistake') {
        entry.fill.setSize(entry.maxWidth * this.soulKit.getGraveMistakeCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'mortar-command') {
        entry.fill.setSize(entry.maxWidth * this.creationKit.getMortarCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'atom-nhilego') {
        entry.fill.setSize(entry.maxWidth * this.rubberKit.getAtomNhilegoCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'byte-bomb') {
        entry.fill.setSize(entry.maxWidth * this.techKit.getByteBombCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'overload') {
        entry.fill.setSize(entry.maxWidth * this.gunpowderKit.getOverloadCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'syringe-shot') {
        entry.fill.setSize(entry.maxWidth * this.growthKit.getSyringeCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'smoke-break') {
        entry.fill.setSize(entry.maxWidth * this.subterfugeKit.getSmokeBreakCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'beastling') {
        entry.fill.setSize(entry.maxWidth * this.huntKit.getBeastlingCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId.startsWith('hunt-')) {
        // Blast counts charges and Q counts the beast's own clock, so the kit owns every hunt bar.
        entry.fill.setSize(entry.maxWidth * this.huntKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId === 'unstable-orbital') {
        entry.fill.setSize(entry.maxWidth * this.plasmaKit.getOrbitalCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'puppetmaster') {
        entry.fill.setSize(entry.maxWidth * this.silenceKit.getPuppetmasterCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'tarot-of-fate') {
        entry.fill.setSize(entry.maxWidth * this.fateKit.getTarotCooldownRatio(time), entry.fill.height);
      } else if ((entry.abilityId === 'fate-preserve' || entry.abilityId === 'fate-enchant')
          && this.elementId === 'fate' && this.fateKit.isCurseLocked(entry.abilityId)) {
        // Purging curse holds these shut for 20s, well past their own cooldowns.
        entry.fill.setSize(entry.maxWidth * this.fateKit.getCurseLockRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId === 'flame-body') {
        entry.fill.setSize(this.fireKit.isFlameBodyActive() ? entry.maxWidth : 0, entry.fill.height);
      } else if (entry.abilityId === 'splash') {
        if (this.waterKit.isSplashActive(time)) {
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
        if (this.gravityKit.isGravBombHolding()) {
          entry.fill.setSize(entry.maxWidth * this.player.chargeRatio, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('grav-bomb'), entry.fill.height);
        }
      } else if (entry.abilityId === 'solo') {
        entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('solo'), entry.fill.height);
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
      } else if (entry.abilityId === 'bugle') {
        entry.fill.setSize(entry.maxWidth * this.soundKit.getBugleCooldownRatio(time), entry.fill.height);
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
    // Crystal Mastery: a normal (non-pierced) shard landing while bounced 2+ times
    if (proj.texture.key === 'proj-crystal-kite' && proj.isFromPlayer) {
      this.crystalKit.recordDoubleBounceHit(proj);
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
    if (this.elementId === 'gunpowder') this.gunpowderKit.onPlayerProjectileHit(proj, target);
    const isVoidIceHit = proj.texture.key === 'proj-ice' && this.iceKit.isPlayerBlackIceMorphActive();
    this.spawnHitFlash(proj.x, proj.y, isVoidIceHit ? 0x9900ff : 0xff6600);
    // Flameshredder: fireball hit also applies burning DOT
    if (proj.texture.key === 'proj-fire' && this.hasUpgrade('click')) {
      target.burningUntil = Math.max(target.burningUntil, this.time.now + Math.round(3000 * target.statusDurMult));
    }
    // Water-cut hit: apply dehydration (Click+ upgrade)
    if (proj.texture.key === 'proj-water' && proj.isFromPlayer && this.elementId === 'water') {
      this.waterKit.onWaterCutHit(target, 'player');
    }
    // Ice spike: frost stacks + unfreeze bonus
    if (proj.texture.key === 'proj-ice') {
      this.iceKit.onIceSpikeHitEnemy(target, this.time.now);
    }
    // Fate card ledger: book this hit against the card that fired the projectile,
    // so the Fate Mastery "Big Hand" requirement sees a card's full damage.
    if ((proj as any).fateLedgerId) {
      this.fateKit.creditCardDamage((proj as any).fateLedgerId, _npcDmg);
    }
    // Fate Infect: applies the poison DOT on top of the direct hit above
    if ((proj as any).fateInfectDps) {
      this.fateKit.applyPoison(target, (proj as any).fateInfectDps, this.time.now, (proj as any).fateInfectDurMs ?? 3000, (proj as any).fateLedgerId ?? 0);
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
    // Acid Purge ball: apply the stat-strip status on top of the generic damage above
    if (proj.texture.key === 'proj-purge') {
      this.slimeKit.onPurgeHit(target, proj, this.time.now);
    }
    // Corrosive Bite: Poison Whip hits also strip max HP equal to the damage dealt
    if (proj.texture.key === 'proj-acid-whip' && this.hasUpgrade('click')) {
      target.reduceMaxHp(_npcDmg);
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

  private dealAoeDamageFromOwner(cx: number, cy: number, radius: number, damage: number, owner: 'player' | 'npc', except?: Fighter): void {
    // Any AoE can wipe silence stalkers caught in the blast.
    this.silenceKit.notifyAoeDamage(cx, cy, radius, owner);
    if (owner === 'player') {
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0 || t === except) continue;
        if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
          t.takeDamage(damage);
          this.spawnHitFlash(t.x, t.y, 0x9944ff);
          this.spawnDamageNumber(t.x, t.y - 28, damage);
        }
      }
    } else {
      if (this.player !== except && Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) <= radius) {
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