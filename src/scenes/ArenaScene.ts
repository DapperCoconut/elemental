import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Player } from '../entities/Player';
import { NpcOpponent, NpcAiState, DIFFICULTY_PRESETS, DifficultyConfig } from '../entities/NpcOpponent';
import { Husk } from '../invasion/Husk';
import { InvasionKit, InvasionArenaApi, getInvasionDifficulty } from '../invasion/InvasionKit';
import { InvasionCoopKit, InvasionCoopArenaApi } from '../invasion/InvasionCoopKit';
import { DisgracedKingKit, DisgracedKingArenaApi, BossOutcome } from '../boss/DisgracedKingKit';
import { WorldBossKit, WorldBossArenaApi } from '../boss/framework/WorldBossKit';
import { getWorldBossDef } from '../boss/bosses';
import { CampaignFormatKit, CampaignFormatArenaApi } from '../elements/kits/CampaignFormatKit';
import { GimmickKit, GimmickArenaApi } from '../elements/kits/GimmickKit';
import { SecretMapKit, SecretMapArenaApi } from '../elements/kits/SecretMapKit';
import { DuoKit, DuoArenaApi } from '../elements/kits/DuoKit';
import { SecretTagState } from '../data/SecretModes';
import { setProgressLocked } from '../data/ProgressLock';
import { TagTeamState, isPledgeFight } from '../data/FightFormats';
import { getEffectiveFightDef } from '../data/CampaignFightsHard';
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
import { airElement } from '../elements/air';
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
import { SummonPurgeTarget } from '../combat/SummonPurge';
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
import { echoElement } from '../elements/echo';
import { EchoKit, EchoArenaApi } from '../elements/kits/EchoKit';
import { subterfugeElement } from '../elements/subterfuge';
import { quantumElement } from '../elements/quantum';
import { ELEMENT_MAP } from '../elements/ElementRegistry';
import * as QuantumBonds from '../data/QuantumBonds';
import { QuantumKit, QuantumArenaApi, DormantTicks } from '../elements/kits/QuantumKit';
import { QuantumCoreKit, QuantumCoreArenaApi } from '../elements/kits/QuantumCoreKit';
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
import { JusticeKit, JusticeArenaApi, JusticeForm } from '../elements/kits/JusticeKit';
import { DreamKit, DreamArenaApi } from '../elements/kits/DreamKit';
import { ChalkKit, ChalkArenaApi } from '../elements/kits/ChalkKit';
import { MagmaKit, MagmaArenaApi } from '../elements/kits/MagmaKit';
import { IllusionKit, IllusionArenaApi } from '../elements/kits/IllusionKit';
import { DepthsKit, DepthsArenaApi } from '../elements/kits/DepthsKit';
import { PassionKit, PassionArenaApi } from '../elements/kits/PassionKit';
import { ConquestKit, ConquestArenaApi } from '../elements/kits/ConquestKit';
import { RuinKit, RuinArenaApi } from '../elements/kits/RuinKit';
import { SandKit, SandArenaApi } from '../elements/kits/SandKit';
import { PaperKit, PaperArenaApi } from '../elements/kits/PaperKit';
import { DeathKit, DeathArenaApi } from '../elements/kits/DeathKit';
import { FortuneKit, FortuneArenaApi } from '../elements/kits/FortuneKit';
import { MarrowKit, MarrowArenaApi } from '../elements/kits/MarrowKit';
import { PsychicKit, PsychicArenaApi } from '../elements/kits/PsychicKit';
import { RadiationKit, RadiationArenaApi } from '../elements/kits/RadiationKit';
import { BindKit, BindArenaApi } from '../elements/kits/BindKit';
import { GumKit, GumArenaApi } from '../elements/kits/GumKit';
import { GluttonyKit, GluttonyArenaApi, GluttonyForm } from '../elements/kits/GluttonyKit';
import { MagicKit, MagicArenaApi } from '../elements/kits/MagicKit';
import { TimeKit, TimeArenaApi } from '../elements/kits/TimeKit';
import { PlasmaKit, PlasmaArenaApi } from '../elements/kits/PlasmaKit';
import { MetalKit, MetalArenaApi } from '../elements/kits/MetalKit';
import { GravityKit, GravityArenaApi } from '../elements/kits/GravityKit';
import { CreationKit, CreationArenaApi } from '../elements/kits/CreationKit';
import { SoulKit, SoulArenaApi } from '../elements/kits/SoulKit';
import { SkinsKit, SkinsArenaApi } from '../elements/kits/SkinsKit';
import { StatusHudKit, StatusHudArenaApi, CustomStatus } from '../elements/kits/StatusHudKit';
import { getAchievementDef } from '../data/Achievements';
import { getSkinDef } from '../data/Skins';
import { dummyElement } from '../elements/dummy';
import { kingElement } from '../elements/king';
import { justiceElement } from '../elements/justice';
import { dreamElement } from '../elements/dream';
import { chalkElement } from '../elements/chalk';
import { magmaElement } from '../elements/magma';
import { illusionElement } from '../elements/illusion';
import { depthsElement } from '../elements/depths';
import { conquestElement } from '../elements/conquest';
import { passionElement } from '../elements/passion';
import { ruinElement } from '../elements/ruin';
import { duneElement } from '../elements/dune';
import { paperElement } from '../elements/paper';
import { deathElement } from '../elements/death';
import { fortuneElement } from '../elements/fortune';
import { marrowElement } from '../elements/marrow';
import { psychicElement } from '../elements/psychic';
import { radiationElement } from '../elements/radiation';
import { bindElement } from '../elements/bind';
import { gumElement } from '../elements/gum';
import { gluttonyElement } from '../elements/gluttony';
import { recordJournalResult } from '../data/PaperJournal';
import * as PlayerData from '../data/PlayerData';
import { getEnhancement } from '../data/Mastery';
import { getTotalRewardMult, MUTATIONS, getBossMutationIds } from '../data/Mutations';
import { consumedItemIds, clearConsumedItems } from '../data/Items';
import { armedArtifactIds, clearArmedArtifacts } from '../data/Artifacts';
import { HP_SCALE } from '../data/Balance';
import { ItemsKit } from '../elements/kits/ItemsKit';
import { ArtifactsKit } from '../elements/kits/ArtifactsKit';
import { computeCurseShardMult } from '../data/GauntletBoosts';
import { INFINITY_GAUNTLET_ID, infinityHpMult, infinityDmgMult, infinityFightShards, infinityDifficulty, GauntletState, getEffectiveStacks } from '../data/GauntletData';
import { drawCampaignBackground } from './CampaignBackground';
import * as UI from '../ui';
import { Sfx, Music } from '../audio';

/** `DIFFICULTY_PRESETS[3]` — the "Expert" rung, named for the achievements that gate on it. */
const EXPERT_DIFFICULTY_LEVEL = 4;

/** Practice range: how long a damage tally runs before it rolls over. */
const DUMMY_COMBO_WINDOW_MS = 5000;

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

// Subterfuge and Fate interfaces are defined in their respective kit files


/**
 * What a Quantum with no bond set falls back to, rather than dropping into a fight as an
 * element with no abilities. Fire and Water because they are the two every save owns.
 */
const DEFAULT_BOND: [string, string] = ['fire', 'water'];

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
  subterfuge: 'elem-subterfuge',
  quantum: 'elem-quantum',
  dummy: 'elem-dummy',
  king: 'elem-king',
  justice: 'elem-justice',
  dream: 'elem-dream',
  chalk: 'elem-chalk',
  illusion: 'elem-illusion',
  depths: 'elem-depths',
  conquest: 'elem-conquest',
  passion: 'elem-passion',
  ruin: 'elem-ruin',
  dune: 'elem-dune',
  paper: 'elem-paper',
  death: 'elem-death',
  fortune: 'elem-fortune',
  amber: 'elem-amber',
  psychic: 'elem-psychic',
  radiation: 'elem-radiation',
  bind: 'elem-bind',
  gum: 'elem-gum',
  gluttony: 'elem-gluttony',
};


export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private npc!: Fighter;
  private projectiles!: Phaser.Physics.Arcade.Group;
  /** Kit-local projectiles shared for cross-cutting effects (goose bullet theft). */
  private techProjReg = new ProjectileRegistry();
  private playerElement!: Element;
  private npcElement!: Element;
  /**
   * The element the player is *being* right now. For everything except Quantum this is
   * simply what they picked; for Quantum it is whichever half of the bond is live, which
   * is why it is not readonly and why `applyPlayerElement` exists. Every per-element gate
   * in this file keys off it, so re-pointing it is the whole of a Quantum swap.
   */
  private elementId = 'fire';
  /** What the player actually chose at the menu — `'quantum'` when they picked Quantum. */
  private selectedElementId = 'fire';
  private npcElementId = 'water';
  /** The same distinction on the npc side. */
  private npcSelectedElementId = 'water';
  private npcDifficulty!: DifficultyConfig;
  private isInvasion = false;
  /** The Disgraced King fight. Drives the npc slot itself — see DisgracedKingKit. */
  private isBossFight = false;
  /** Hard mode: the Devourer of Kings behind the King. */
  private isBossHard = false;
  /** Which ending the player took, once the Devourer offers the choice. */
  private bossOutcome: BossOutcome | null = null;
  private bossKit: DisgracedKingKit | null = null;
  /** A campaign world's Sovereign (mode 'worldboss') — the world id doubles as the boss id. */
  private worldBossId: string | null = null;
  private worldBossKit: WorldBossKit | null = null;
  /** Campaign fight formats (horde/survival/flood) — see CampaignFormatKit. */
  private formatKit: CampaignFormatKit | null = null;
  /** The campaign world's standing arena rule — see GimmickKit. */
  private gimmickKit: GimmickKit | null = null;
  /** Tag-team bout state; non-null only mid-run. */
  private tagTeam: TagTeamState | null = null;
  /** The create() payload, kept for tag-team scene restarts. */
  private bootData: Record<string, unknown> = {};
  /** Bounty contract this fight is settling, if any. Paid out by GameOverScene. */
  private bounty: { key: string; reward: number } | null = null;

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


  // Dummy mode keys (arrow keys move the target, P fires, O wakes its abilities up)
  private dummyUpKey!: Phaser.Input.Keyboard.Key;
  private dummyDownKey!: Phaser.Input.Keyboard.Key;
  private dummyLeftKey!: Phaser.Input.Keyboard.Key;
  private dummyRightKey!: Phaser.Input.Keyboard.Key;
  private dummyFireKey!: Phaser.Input.Keyboard.Key;
  private dummyToggleKey!: Phaser.Input.Keyboard.Key;
  private dummyBackBtn: Phaser.GameObjects.Text | null = null;

  // ── Secret modes ───────────────────────────────────────────────────
  /** Which secret mode this bout is, if any. See `src/data/SecretModes.ts`. */
  private secretMode: string | null = null;
  /**
   * Dummy mode. The opponent is the real element the player picked, standing
   * still and unable to die, with a five-second damage tally over its head.
   */
  private dummyPractice = false;
  /** O toggles the target's abilities back on. It still never moves on its own. */
  private dummyAttacksOn = false;
  private dummyComboDamage = 0;
  private dummyComboResetAt = 0;
  private dummyComboText: Phaser.GameObjects.Text | null = null;
  private dummyBestCombo = 0;
  private dummyHudTexts: Phaser.GameObjects.Text[] = [];
  /** Tag Team: three of yours against three of theirs. */
  private secretTag: SecretTagState | null = null;
  /** Set when this tag chain is settling an unstable forge — see the Disgraced Lab's second tier. */
  private stabilize: { result: string } | null = null;
  /** World Shift's five arenas. Idle (mapId null) in every other mode. */
  private secretMapKit!: SecretMapKit;
  /** Duo's second opponent. */
  private duoKit!: DuoKit;

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

  // Air keeps nothing in this scene: the wind dancer's abilities, upgrades, mastery and world
  // objects all live in AirKit — see src/elements/kits/AirKit.ts.

  // NPC mirror state
  private npcSpeedMult = 1;
  // (NPC fire state moved to FireKit)
  private npcNukeChanneling = false;
  private npcNukeChannelEnd = 0;
  private npcGeyserBuffUntil = 0;

  // SoundKit (manages all sound state)
  private soundKit!: SoundKit;

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

  /**
   * Justice — managed by JusticeKit. Same deal as Hunt: two stances, so two card rows,
   * and the scene owns nothing else about the element.
   */
  private justiceKit!: JusticeKit;
  /** Dream — managed by DreamKit. Sleepiness, the pendulum, the cursor passive and the oasis. */
  private dreamKit!: DreamKit;

  /** Chalk (test element) — managed by ChalkKit. Drawing windows, the chalk on the floor and the shield. */
  private chalkKit!: ChalkKit;
  /** Magma (test element) — managed by MagmaKit. Lava, pressure vessels, the fist and the dragon. */
  private magmaKit!: MagmaKit;
  /** Illusion (test element) — managed by IllusionKit. Panes, folds, corner-hops and the crack. */
  private illusionKit!: IllusionKit;
  /** Depths (test element) — managed by DepthsKit. The lure, the drowning, the fish and the shark. */
  private depthsKit!: DepthsKit;
  /** Gluttony (test element) — managed by GluttonyKit. The grill, the larder and the butcher. */
  private gluttonyKit!: GluttonyKit;
  /** Gluttony's two ability trays: the chef's five keys, and the butcher's. */
  private gluttonyChefHudCards: Phaser.GameObjects.GameObject[] = [];
  private gluttonyButcherHudCards: Phaser.GameObjects.GameObject[] = [];
  private gluttonyChefFills: AbilityBarEntry[] = [];
  private gluttonyButcherFills: AbilityBarEntry[] = [];
  /** Conquest (test element) — managed by ConquestKit. The board, the economy and everything on it. */
  private conquestKit!: ConquestKit;
  /** Passion (test element) — managed by PassionKit. The love bars, the pistol, the rose and the pose. */
  private passionKit!: PassionKit;
  /** Ruin (test element) — managed by RuinKit. The wedge, the locks, the skewer, the spikes and the rot. */
  private ruinKit!: RuinKit;
  /** Sand (test element, id `dune`) — managed by SandKit. The jump, the obbies, the storm and the worm. */
  private sandKit!: SandKit;
  /** Paper (test element) — managed by PaperKit. The three storybooks, and the Journal behind them. */
  private paperKit!: PaperKit;
  /** Death (test element) — managed by DeathKit. The doomsday clock, the katana and the deal. */
  private deathKit!: DeathKit;
  /** Fortune (test element) — managed by FortuneKit. The stall, the blood coins and the guns. */
  private fortuneKit!: FortuneKit;
  /** Marrow (test element) — managed by MarrowKit. The bone bar, the fever and the cells. */
  private marrowKit!: MarrowKit;
  /** Psychic (test element) — managed by PsychicKit. Foreknowledge, stress and the whip. */
  private psychicKit!: PsychicKit;
  /** Radiation (test element) — managed by RadiationKit. The tracer chain and the burning clock. */
  private radiationKit!: RadiationKit;
  /** Bind (test element) — managed by BindKit. The patron, its anger, and everything it charges. */
  private bindKit!: BindKit;
  /** Slime (test element) — managed by GumKit. The hand that is also the legs. */
  private gumKit!: GumKit;
  private justiceGroundHudCards: Phaser.GameObjects.GameObject[] = [];
  private justiceFlightHudCards: Phaser.GameObjects.GameObject[] = [];
  private justiceGroundFills: AbilityBarEntry[] = [];
  private justiceFlightFills: AbilityBarEntry[] = [];

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

  // ── Quantum (bonds two elements; the dodge key swaps between them) kit ─
  private quantumKit!: QuantumKit;
  /** Non-null only when that side picked Quantum. Holds the pair in the chosen order. */
  private playerBond: [string, string] | null = null;
  private npcBond: [string, string] | null = null;
  /** Kept so a mid-match re-key can re-issue skin loadouts without losing the npc's. */
  private npcSkinId: string | null = null;
  /** The dormant half's ability tray, hidden until a swap brings it up. */
  private quantumOtherFills: AbilityBarEntry[] = [];
  private quantumOtherHudCards: Phaser.GameObjects.GameObject[] = [];
  private quantumOwnFills: AbilityBarEntry[] = [];
  private quantumOwnHudCards: Phaser.GameObjects.GameObject[] = [];
  /** Third State's own tray — built only when the player owns Quantum's upgrade. */
  private quantumCoreFills: AbilityBarEntry[] = [];
  private quantumCoreHudCards: Phaser.GameObjects.GameObject[] = [];

  // ── Quantum's Third State (the bond's third stop) — managed by QuantumCoreKit ──
  private quantumCoreKit!: QuantumCoreKit;

  // ── Subterfuge (abstract combined: slime + fate) kit ──────────────────
  private subterfugeKit!: SubterfugeKit;
  /** True while Dark Treachery replays a foreign element's Q — hasUpgrade() reports
   * false so copied ultimates never pick up Q+/upgrade behavior. */
  private foreignCastSuppress = false;

  // ── Oil kit ───────────────────────────────────────────────────────────
  private oilKit!: OilKit;

  // ── Fire kit ──────────────────────────────────────────────────────────
  private fireKit!: FireKit;
  private skinsKit!: SkinsKit;
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
  private artifactsKit!: ArtifactsKit;

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

  create(data: { elementId: string; enemyElementId?: string; difficulty?: number; mutations?: string[]; starredMutations?: string[]; mode?: string; invasionDifficulty?: string; gauntlet?: import('../data/GauntletData').GauntletState; playerPerk?: string | null; npcPerk?: string | null; campaign?: { slot: 0 | 1 | 2; worldId: string; fightId: string; isChallenge: boolean; hardMode?: boolean }; quantumBond?: [string, string]; npcQuantumBond?: [string, string]; hpMult?: number; npcOutgoingDamageMult?: number; bounty?: { key: string; reward: number }; bossHard?: boolean; bossId?: string; tagTeam?: TagTeamState; secretMode?: string; secretMap?: string; duoEnemyElementId?: string; secretTag?: SecretTagState; stabilize?: { result: string }; online?: { isHost: boolean; npcUpgrades?: string[]; npcMasteryBinds?: Record<string, string>; npcMasteryOn?: boolean; npcSkin?: string | null } }): void {
    this.selectedElementId = data.elementId ?? 'fire';
    // ── Secret modes ────────────────────────────────────────────────
    this.secretMode = data.secretMode ?? null;
    this.dummyPractice = this.secretMode === 'dummy';
    this.secretTag = data.secretTag ?? null;
    // A tag chain that is settling an unstable forge. Carried, not acted on:
    // the fight plays out as an ordinary three-on-three and the results screen
    // is what grants (or burns) the element.
    this.stabilize = data.stabilize ?? null;
    this.dummyAttacksOn = false;
    this.dummyComboDamage = 0;
    this.dummyBestCombo = 0;
    this.dummyComboResetAt = 0;
    // Nothing in a practice bout is written to the save. Set on every entry,
    // both ways, so a mode change can never leave the lock stuck on.
    setProgressLocked(this.dummyPractice);
    // Quantum is two elements wearing one body: resolve the bond up front and run the whole
    // of create() as the first half, so every downstream read (upgrades, mastery binds, the
    // skin, the ability tray, every per-element gate) keys off a real kit rather than off
    // Quantum, which has none. `applyPlayerElement` does the same job for mid-match swaps.
    this.playerBond = this.selectedElementId === 'quantum'
      ? (data.quantumBond ?? PlayerData.getQuantumBond() ?? DEFAULT_BOND)
      : null;
    this.elementId = this.playerBond ? this.playerBond[0] : this.selectedElementId;
    this.isInvasion = data.mode === 'invasion';
    this.isBossFight = data.mode === 'boss';
    this.isBossHard = this.isBossFight && data.bossHard === true;
    this.worldBossId = data.mode === 'worldboss' ? (data.bossId ?? null) : null;
    this.tagTeam = data.tagTeam ?? null;
    this.bootData = data as unknown as Record<string, unknown>;
    this.bossOutcome = null;
    this.bounty = data.bounty ?? null;
    this.isOnline = !!data.online;
    this.npcUpgrades = data.online?.npcUpgrades ?? [];
    this.npcMasteryBinds = data.online?.npcMasteryBinds ?? {};
    this.npcMasteryOn = data.online?.npcMasteryOn ?? false;
    this.onlineEndReason = null;
    this.onlineForfeitArmedUntil = 0;
    this.campaign = data.campaign ?? null;
    this.playerPerkId = this.playerBond
      ? PlayerData.getEquippedPerk(this.elementId)
      : (data.playerPerk ?? null);
    this.npcPerkId = data.npcPerk ?? null;
    this.npcSelectedElementId = data.enemyElementId ?? (this.elementId === 'fire' ? 'water' : 'fire');
    this.npcBond = this.npcSelectedElementId === 'quantum'
      ? (data.npcQuantumBond ?? DEFAULT_BOND)
      : null;
    const enemyElementId = this.npcBond ? this.npcBond[0] : this.npcSelectedElementId;
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
    this.quantumOwnFills = []; this.quantumOwnHudCards = [];
    this.quantumOtherFills = []; this.quantumOtherHudCards = [];
    this.quantumCoreFills = []; this.quantumCoreHudCards = [];
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

    this.npcCastId = null;

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
        soulColor: (owner, base) => arena.skinsKit.soulColor(owner, base),
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
    this.justiceGroundHudCards = []; this.justiceFlightHudCards = [];
    this.justiceGroundFills = []; this.justiceFlightFills = [];
    this.huntNormalFills = []; this.huntBeastFills = []; this.huntHybridFills = [];
    this.gluttonyChefHudCards = []; this.gluttonyButcherHudCards = [];
    this.gluttonyChefFills = []; this.gluttonyButcherFills = [];

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
        huntColor: (owner, base) => arena.skinsKit.huntColor(owner, base),
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
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        sendSilenceMsg: (msg) => { if (arena.isOnline) Net.send(msg); },
        silenceColor: (owner, base) => arena.skinsKit.silenceColor(owner, base),
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
        creationColor: (owner, base) => arena.skinsKit.creationColor(owner, base),
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
        gravityColor: (owner, base) => arena.skinsKit.gravityColor(owner, base),
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
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        growthColor: (owner, base) => arena.skinsKit.growthColor(owner, base),
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
    this.subterfugeMasteryOn = PlayerData.isMasteryEnabled('subterfuge');
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
        fireColor: (owner, base) => arena.skinsKit.fireColor(owner, base),
        skinId: (owner) => arena.skinsKit.skinId(owner),
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
    // SkinsKit adapter — renders each side's equipped skin
    if (this.skinsKit) {
      this.skinsKit.reset();
    } else {
      const arena = this;
      const skinsApi: SkinsArenaApi = {
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get scene(): Phaser.Scene { return arena; },
        get projectiles() { return arena.projectiles; },
      };
      this.skinsKit = new SkinsKit(skinsApi);
    }
    this.npcSkinId = data.online?.npcSkin ?? null;
    this.skinsKit.setLoadouts(PlayerData.getEquippedSkin(this.elementId), this.npcSkinId);
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
        waterColor: (owner, base) => arena.skinsKit.waterColor(owner, base),
        skinId: (owner) => arena.skinsKit.skinId(owner),
        unlockAchievement: (id) => arena.unlockAchievement(id),
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
        // Sky Grapple drives the player's body itself, so it has to be able to *set* this.
        get isDodging() { return arena.isDodging; },
        set isDodging(v: boolean) { arena.isDodging = v; },
        get pointerX() { return arena.input.activePointer.worldX; },
        get pointerY() { return arena.input.activePointer.worldY; },
        get worldBounds() { return arena.physics.world.bounds; },
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'air') PlayerData.addMasteryStat('air', key, amount);
        },
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnDamageNumber: (x, y, amount) => arena.spawnDamageNumber(x, y, amount),
        spawnHitFlash: (x, y, color) => arena.spawnHitFlash(x, y, color),
        airColor: (owner, base) => arena.skinsKit.airColor(owner, base),
        skinId: (owner) => arena.skinsKit.skinId(owner),
        unlockAchievement: (id) => arena.unlockAchievement(id),
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
        lifeColor: (owner, base) => arena.skinsKit.lifeColor(owner, base),
        skinId: (owner) => arena.skinsKit.skinId(owner),
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
        electricityColor: (owner, base) => arena.skinsKit.electricityColor(owner, base),
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
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get spaceKey() { return arena.spaceKey; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        setStatusIndicator: (id, s) => arena.setStatusIndicator(id, s),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        soundColor: (owner, base) => arena.skinsKit.soundColor(owner, base),
        get masteryActive() { return arena.soundMasteryOn && arena.elementId === 'sound'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'sound'; },
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
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        lightColor: (owner, base) => arena.skinsKit.lightColor(owner, base),
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
        iceColor: (owner, base) => arena.skinsKit.iceColor(owner, base),
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
        crystalColor: (owner, base) => arena.skinsKit.crystalColor(owner, base),
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
        earthColor: (owner, base) => arena.skinsKit.earthColor(owner, base),
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
        shadowColor: (owner, base) => arena.skinsKit.shadowColor(owner, base),
        skinId: (owner) => arena.skinsKit.skinId(owner),
        unlockAchievement: (id) => arena.unlockAchievement(id),
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
        acidColor: (owner, base) => arena.skinsKit.acidColor(owner, base),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
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
        magnetColor: (owner, base) => arena.skinsKit.magnetColor(owner, base),
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
        metalColor: (owner, base) => arena.skinsKit.metalColor(owner, base),
        skinId: (owner) => arena.skinsKit.skinId(owner),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
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
        plasmaColor: (owner, base) => arena.skinsKit.plasmaColor(owner, base),
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
        gunpowderColor: (owner, base) => arena.skinsKit.gunpowderColor(owner, base),
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

    // ── Justice kit ───────────────────────────────────────────
    if (this.justiceKit) {
      this.justiceKit.reset();
    } else {
      const arena = this;
      const justiceApi: JusticeArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        justiceColor: (owner, base) => arena.skinsKit.justiceColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        dealAoeDamageFromOwner: (x, y, r, d, o, ex) => arena.dealAoeDamageFromOwner(x, y, r, d, o, ex),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setHudForm: (form) => arena.justiceSetHudForm(form),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.justiceKit = new JusticeKit(justiceApi);
    }

    // ── Dream kit ─────────────────────────────────────────────
    if (this.dreamKit) {
      this.dreamKit.reset();
    } else {
      const arena = this;
      const dreamApi: DreamArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        dreamColor: (owner, base) => arena.skinsKit.dreamColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.dreamKit = new DreamKit(dreamApi);
    }

    // ── Chalk kit (test element) ──────────────────────────────
    if (this.chalkKit) {
      this.chalkKit.reset();
    } else {
      const arena = this;
      const chalkApi: ChalkArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        chalkColor: (owner, base) => arena.skinsKit.chalkColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.chalkKit = new ChalkKit(chalkApi);
    }

    // ── Magma kit (test element) ──────────────────────────────
    if (this.magmaKit) {
      this.magmaKit.reset();
    } else {
      const arena = this;
      const magmaApi: MagmaArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        magmaColor: (owner, base) => arena.skinsKit.magmaColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.magmaKit = new MagmaKit(magmaApi);
    }

    // ── Illusion kit (test element) ───────────────────────────
    if (this.illusionKit) {
      this.illusionKit.reset();
    } else {
      const arena = this;
      const illusionApi: IllusionArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get isOnline() { return arena.isOnline && !arena.isInvasion; },
        illusionColor: (owner, base) => arena.skinsKit.illusionColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        sendIllusionMsg: (msg) => Net.send(msg),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.illusionKit = new IllusionKit(illusionApi);
    }

    // ── Depths kit (test element) ─────────────────────────────
    if (this.depthsKit) {
      this.depthsKit.reset();
    } else {
      const arena = this;
      const depthsApi: DepthsArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        depthsColor: (owner, base) => arena.skinsKit.depthsColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.depthsKit = new DepthsKit(depthsApi);
    }

    // ── Gluttony kit (test element) ───────────────────────────
    if (this.gluttonyKit) {
      this.gluttonyKit.reset();
    } else {
      const arena = this;
      const gluttonyApi: GluttonyArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get rightPointerWasDown() { return arena.rightPointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        gluttonyColor: (owner, base) => arena.skinsKit.gluttonyColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        setHudForm: (form) => arena.gluttonySetHudForm(form),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.gluttonyKit = new GluttonyKit(gluttonyApi);
    }

    // ── Passion kit (test element) ────────────────────────────
    if (this.passionKit) {
      this.passionKit.reset();
    } else {
      const arena = this;
      const passionApi: PassionArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        passionColor: (owner, base) => arena.skinsKit.passionColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get matureMode() { return PlayerData.isPassionQCensored(); },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.passionKit = new PassionKit(passionApi);
    }

    // ── Ruin kit (test element) ───────────────────────────────
    if (this.ruinKit) {
      this.ruinKit.reset();
    } else {
      const arena = this;
      const ruinApi: RuinArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        ruinColor: (owner, base) => arena.skinsKit.ruinColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        purgeSummons: (x, y, r, except, report) => arena.purgeSummonsInCircle(x, y, r, except, report),
        shredRegisteredProjectiles: (owner, x, y, r) => {
          const found = arena.techProjReg.within(owner, x, y, r);
          for (const p of found) arena.techProjReg.steal(p);
          return found.length;
        },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.ruinKit = new RuinKit(ruinApi);
    }

    // ── Sand kit (test element, id `dune`) ────────────────────
    if (this.sandKit) {
      this.sandKit.reset();
    } else {
      const arena = this;
      const sandApi: SandArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get spaceKey() { return arena.spaceKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        duneColor: (owner, base) => arena.skinsKit.duneColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.sandKit = new SandKit(sandApi);
    }

    // ── Paper kit (test element) ──────────────────────────────
    if (this.paperKit) {
      this.paperKit.reset();
    } else {
      const arena = this;
      const paperApi: PaperArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get projectileRegistry() { return arena.techProjReg; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get rightPointerWasDown() { return arena.rightPointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get isDodging() { return arena.isDodging; },
        set isDodging(v: boolean) { arena.isDodging = v; },
        paperColor: (owner, base) => arena.skinsKit.paperColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.paperKit = new PaperKit(paperApi);
    }

    // ── Death kit (test element) ──────────────────────────────
    if (this.deathKit) {
      this.deathKit.reset();
    } else {
      const arena = this;
      const deathApi: DeathArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get projectileRegistry() { return arena.techProjReg; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get isInvasion() { return arena.isInvasion; },
        get isDodging() { return arena.isDodging; },
        set isDodging(v: boolean) { arena.isDodging = v; },
        deathColor: (owner, base) => arena.skinsKit.deathColor(owner, base),
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        elementColorOf: (owner) => (owner === 'player' ? arena.playerElement.color : arena.npcElement.color),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.deathKit = new DeathKit(deathApi);
    }

    // ── Fortune kit (test element) ────────────────────────────
    if (this.fortuneKit) {
      this.fortuneKit.reset();
    } else {
      const arena = this;
      const fortuneApi: FortuneArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get projectileRegistry() { return arena.techProjReg; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get rightPointerWasDown() { return arena.rightPointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get isInvasion() { return arena.isInvasion; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        fortuneColor: (owner, base) => arena.skinsKit.fortuneColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.fortuneKit = new FortuneKit(fortuneApi);
    }

    // ── Marrow kit (test element) ─────────────────────────────
    if (this.marrowKit) {
      this.marrowKit.reset();
    } else {
      const arena = this;
      const marrowApi: MarrowArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get projectileRegistry() { return arena.techProjReg; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        marrowColor: (owner, base) => arena.skinsKit.marrowColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        purgeSummons: (x, y, r, except) => arena.purgeSummonsInCircle(x, y, r, except),
        hasUpgrade: (owner, slot) => (owner === 'player'
          ? arena.hasUpgrade(slot)
          : arena.hasNpcUpgrade(slot)),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.marrowKit = new MarrowKit(marrowApi);
    }

    // ── Psychic kit (test element) ────────────────────────────
    if (this.psychicKit) {
      this.psychicKit.reset();
    } else {
      const arena = this;
      const psychicApi: PsychicArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get isOnline() { return arena.isOnline; },
        psychicColor: (owner, base) => arena.skinsKit.psychicColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        sendPsychicMsg: (msg) => Net.send(msg),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.psychicKit = new PsychicKit(psychicApi);
    }

    // ── Radiation kit (test element) ──────────────────────────
    if (this.radiationKit) {
      this.radiationKit.reset();
    } else {
      const arena = this;
      const radiationApi: RadiationArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get isDodging() { return arena.isDodging; },
        set isDodging(v: boolean) { arena.isDodging = v; },
        radiationColor: (owner, base) => arena.skinsKit.radiationColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.radiationKit = new RadiationKit(radiationApi);
    }

    // ── Bind kit (test element) ───────────────────────────────
    if (this.bindKit) {
      this.bindKit.reset();
    } else {
      const arena = this;
      const bindApi: BindArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        bindColor: (owner, base) => arena.skinsKit.bindColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.bindKit = new BindKit(bindApi);
    }

    // ── Slime kit (test element, id `gum`) ────────────────────
    if (this.gumKit) {
      this.gumKit.reset();
    } else {
      const arena = this;
      const gumApi: GumArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get projectileRegistry() { return arena.techProjReg; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get isDodging() { return arena.isDodging; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        gumColor: (owner, base) => arena.skinsKit.gumColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        setStatusIndicator: (id, status) => arena.statusHudKit.setCustom(id, status),
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
      };
      this.gumKit = new GumKit(gumApi);
    }

    // ── Conquest kit (test element) ───────────────────────────
    if (this.conquestKit) {
      this.conquestKit.reset();
    } else {
      const arena = this;
      const conquestApi: ConquestArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get pointerWasDown() { return arena.pointerWasDown; },
        get rightPointerWasDown() { return arena.rightPointerWasDown; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElement.id; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        hasUpgrade: (slot) => arena.hasUpgrade(slot),
        hasNpcUpgrade: (slot) => arena.hasNpcUpgrade(slot),
        conquestColor: (owner, base) => arena.skinsKit.conquestColor(owner, base),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        getNearestEnemy: (x, y) => arena.getNearestEnemy(x, y),
        buildPlayerContext: (x, y) => arena.buildPlayerContext(x, y),
        openUpgradeMenu: () => arena.openConquestMenu(),
        get npcIsNetReplica() { return arena.isOnline; },
        get isCoop() { return arena.isOnline && arena.isInvasion; },
        get masteryActive() { return false; },
        get npcMasteryActive() { return false; },
      };
      this.conquestKit = new ConquestKit(conquestApi);
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
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
        get isPlayerRubber() { return arena.elementId === 'rubber'; },
        get isNpcRubber() { return arena.npcElement?.id === 'rubber'; },
        rubberColor: (owner, base) => arena.skinsKit.rubberColor(owner, base),
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
        magicColor: (owner, base) => arena.skinsKit.magicColor(owner, base),
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
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
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
        technologyColor: (owner, base) => arena.skinsKit.technologyColor(owner, base),
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
        sandColor: (owner, base) => arena.skinsKit.sandColor(owner, base),
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
        echoColor: (owner, base) => arena.skinsKit.echoColor(owner, base),
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
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
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
        get masteryActive() { return arena.subterfugeMasteryOn && arena.elementId === 'subterfuge'; },
        get npcMasteryActive() { return arena.isOnline && arena.npcMasteryOn && arena.npcElement.id === 'subterfuge'; },
        masteryBindFor: (slot) => arena.masteryBindFor(slot),
        broadcastMasteryCast: (enhId) => arena.broadcastMasteryCast(enhId),
        recordMasteryStat: (key, amount) => {
          if (arena.elementId === 'subterfuge') PlayerData.addMasteryStat('subterfuge', key, amount);
        },
        recordMasteryBestStat: (key, value) => {
          if (arena.elementId === 'subterfuge') PlayerData.recordMasteryBest('subterfuge', key, value);
        },
        getMasteryStat: (key) => PlayerData.getMasteryStat('subterfuge', key),
        allElementIds: () => Object.keys(ELEMENT_MAP),
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
        subterfugeColor: (owner, base) => arena.skinsKit.subterfugeColor(owner, base),
      };
      this.subterfugeKit = new SubterfugeKit(subterfugeApi);
    }

    // Quantum's Third State kit. Ahead of QuantumKit because the bond's third stop is one of
    // the things the dormant-tick table below has to be able to reach.
    if (this.quantumCoreKit) {
      this.quantumCoreKit.reset();
    } else {
      const arena = this;
      const quantumCoreApi: QuantumCoreArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player as Fighter; },
        get npc() { return arena.npc; },
        get enemies() { return arena.enemies; },
        get projectiles() { return arena.projectiles; },
        get eKey() { return arena.eKey; },
        get rKey() { return arena.rKey; },
        get fKey() { return arena.fKey; },
        get qKey() { return arena.qKey; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElementId; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
      };
      this.quantumCoreKit = new QuantumCoreKit(quantumCoreApi);
    }

    // QuantumKit adapter. Built last of the element kits on purpose: the dormant-tick table
    // it takes references every other kit, so they all have to exist first.
    if (this.quantumKit) {
      this.quantumKit.reset();
    } else {
      const arena = this;
      const quantumApi: QuantumArenaApi = {
        get scene(): Phaser.Scene { return arena; },
        get player() { return arena.player; },
        get npc() { return arena.npc; },
        get width() { return arena.scale.width; },
        get height() { return arena.scale.height; },
        get elementId() { return arena.elementId; },
        get npcElementId() { return arena.npcElementId; },
        get playerIsQuantum() { return arena.selectedElementId === 'quantum'; },
        get npcIsQuantum() { return arena.npcSelectedElementId === 'quantum'; },
        get npcDifficultyLevel() { return arena.npcDifficulty?.level ?? 3; },
        get playerHasThirdState() { return PlayerData.isUpgradeActive('quantum', 'click'); },
        get isOnline() { return arena.isOnline; },
        applyPlayerElement: (id) => arena.applyPlayerElement(id),
        applyNpcElement: (id) => arena.applyNpcElement(id),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
        setStatusIndicator: (id, status) => arena.setStatusIndicator(id, status),
        elementName: (id) => ELEMENT_MAP[id]?.name ?? id,
        elementColor: (id) => ELEMENT_MAP[id]?.color ?? 0x7df9ff,
        elementEmoji: (id) => ELEMENT_MAP[id]?.emoji ?? '⚛️',
      };
      this.quantumKit = new QuantumKit(quantumApi, this.buildDormantTicks());
    }
    if (this.playerBond) this.quantumKit.setPlayerBond(this.playerBond[0], this.playerBond[1]);
    if (this.npcBond) this.quantumKit.setNpcBond(this.npcBond[0], this.npcBond[1]);

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
        oilColor: (owner, base) => arena.skinsKit.oilColor(owner, base),
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
        fateColor: (owner, base) => arena.skinsKit.fateColor(owner, base),
        hasPerk: (owner, perkId) => arena.hasPerk(owner, perkId),
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
    } else if (this.isBossFight) {
      // The Disgraced King fights in his own throne room — DisgracedKingKit
      // paints it. Drawing the default grid here would sit on top of it.
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
    // Bond research counts casts. A fresh Player is built every match, so this never stacks.
    // `elementId` is read at cast time, not now, so a Quantum's casts land on whichever half
    // actually cast them — which is the only reading that makes sense.
    this.player.on('cast', (abilityId: string) => QuantumBonds.noteCast(this.elementId, abilityId));
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
    // True Nightmare: it dashes out of the way, and one cast in four goes twice.
    (this.npc as NpcOpponent).trueNightmare = this.secretMode === 'truenightmare';
    // In 1v1 the single opponent is tracked in enemies; invasion starts empty and fills via the InvasionKit
    this.enemies = this.isInvasion ? [] : [this.npc];

    // ── Apply mutations ──────────────────────────────────────────────
    this.mutations = new Set(data.mutations ?? []);
    this.starredMutations = new Set(data.starredMutations ?? []);

    // The boss owns its own body outright (HP, position, invincibility windows),
    // so mutations must not touch it.
    if (!this.isInvasion && !this.isBossFight && !this.worldBossId) {
      if (this.npcElement.id === 'dummy') {
        // The Konami-code dummy: still a straw man with a lot of health.
        this.npc.maxHp = 5000;
        this.npc.hp = 5000;
        (this.npc as NpcOpponent).stationary = true;
      } else if (this.dummyPractice) {
        // The secret practice range: a real element, immortal in the literal
        // sense rather than the "very large number" sense.
        this.npc.immortal = true;
        this.npc.hideHealthBar();
      } else {
        this.applyMutationsToNpc();
      }
    }

    // Tag Team: the foe on the floor keeps whatever the last element left it at.
    if (this.secretTag && this.secretTag.enemyHp !== null) {
      this.npc.hp = Math.max(1, Math.min(this.npc.maxHp, this.secretTag.enemyHp));
    }

    // ── Dummy mode furniture ─────────────────────────────────────────
    // The old Konami dummy and the new practice range both want a way out and a
    // control legend; the practice range additionally gets the damage tally.
    if (this.npcElement.id === 'dummy' || this.dummyPractice) {
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
        .on('pointerdown', () => {
          // The lock is per-bout; leaving has to lower it or the whole profile
          // stays frozen until the next fight starts.
          setProgressLocked(false);
          this.scene.start('MenuScene', {});
        });
    } else {
      this.dummyBackBtn = null;
    }

    if (this.dummyPractice) this.buildDummyHud();

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

      // Vault artifacts ride the same arming step but are their own kit — see ArtifactsKit
      // for why a rule-changing relic cannot be expressed as an ItemEffect.
      if (this.artifactsKit) {
        this.artifactsKit.reset();
      } else {
        this.artifactsKit = new ArtifactsKit({
          get scene() { return arena; },
          get player() { return arena.player; },
          get npc() { return arena.npc; },
          get projectiles() { return arena.projectiles; },
          applyPlayerSpeedMult: (f) => { arena.gauntletSpeedMult *= f; },
          showFloatingText: (x, y, t, c) => arena.spawnFloatingText(x, y, t, c),
        });
      }
      this.artifactsKit.arm(armedArtifactIds);
      clearArmedArtifacts();
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
        if (!proj.active || !target.active || target.hp <= 0) return;
        if (!proj.isFromPlayer) {
          // An npc-owned shot normally only ever looks for the player. On a map
          // that puts a third party on the field, it can also hit that — which
          // is what lets a bot earn its own runic charge in the Graveyard.
          if (!this.secretMapKit.ownsBody(target)) return;
          if (target.projectilePhase) return;
          target.lastDamageOwner = 'npc';
          target.takeDamage(proj.damage);
          this.spawnHitFlash(proj.x, proj.y, 0xff6655);
          this.spawnDamageNumber(proj.x, proj.y - 20, proj.damage);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Illusion Dance: shots go straight through. Deliberately before every on-hit rider
        // below, so a phased hit applies nothing at all rather than landing its side effects.
        if (target.projectilePhase) return;
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
        } else if (this.bossKit?.ownsEnemy(target)) {
          // Boss-owned hitboxes (the King's destructible dark orbs). Without this
          // the fall-through below would send the shot into the boss instead.
          this.applyProjectileToEnemy(proj, target);
        } else if (this.duoKit.owns(target) || this.secretMapKit.ownsBody(target)) {
          // Duo's second opponent and the Graveyard's risen have bodies of their
          // own. Without this they would fall through to the `this.npc` route
          // below and quietly damage the front bot instead of themselves.
          this.applyProjectileToEnemy(proj, target);
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
        // Illusion Dance — see the twin check in the enemy overlap above.
        if (this.player.projectilePhase) return;
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
        // Air's wind dodge is not checked here: it is installed as the fighter's damage
        // absorber by AirKit, so it covers area and tick damage too rather than projectiles
        // alone. A dodged projectile is stopped below when takeDamage reports nothing landed.
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
        // Illusion Click+ — see the twin check in the enemy overlap above, dodge roll included.
        if (proj.texture.key === 'proj-illusion-crack' && this.illusionKit.onCrackShotHit(proj, this.player)) {
          return; // proj NOT deactivated — keeps flying through
        }
        // Ruin Click+: see the twin check in applyProjectileToEnemy.
        if (proj.ruinRusted && this.ruinKit.applyRustedHit(proj, this.player)) return;
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
        // Gunpowder Corruption perk: an npc musket ball leaves rot in the player
        if ((proj as any).isMusketShot && this.npcElementId === 'gunpowder') {
          this.gunpowderKit.onNpcMusketHitPlayer(this.player);
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
      // The King is a tag team too, but it is not a campaign fight — it is
      // loaded out at the door, so it goes back there rather than to the
      // campaign's element picker.
      if (this.isBossFight && isPledgeFight(this.tagTeam)) {
        this.bossTagSwapOut();
        return;
      }
      // Tag-team: falling burns this element and offers a fresh one. The
      // opponent keeps every scratch it took.
      if (this.tagTeam && this.campaign) {
        this.tagTeamSwapOut();
        return;
      }
      // Secret Tag Team: the bench was picked up front, so there is nobody to
      // ask — the next element simply walks on.
      if (this.secretTag) {
        this.secretTagSwapIn();
        return;
      }
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

    // Practice range: the five-second tally. Reading the `damaged` event rather
    // than `onDamaged` on purpose — that callback already belongs to other
    // systems, and a combo counter has no business evicting one.
    if (this.dummyPractice) {
      this.npc.on('damaged', (amount: number) => {
        if (amount <= 0) return;
        // The first hit of a window starts its clock, so a tally always measures
        // five seconds of *fighting* rather than five seconds of standing still.
        if (this.dummyComboDamage === 0) this.dummyComboResetAt = this.time.now + DUMMY_COMBO_WINDOW_MS;
        this.dummyComboDamage += amount;
      });
    }

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

    // Invasion husks manage their own defeat handlers in the InvasionKit; skip here.
    // Bosses also skip it — their first "death" is only the end of a phase, so
    // the boss kit decides when the fight is actually over (bossVictory()).
    if (!this.isInvasion && !this.isBossFight && !this.worldBossId) {
      this.npc.once('defeated', () => {
        // Tag-team: this was one head of the hydra, not the bout.
        if (this.tagTeam && this.tagTeam.index + 1 < this.tagTeam.enemies.length) {
          this.tagTeamNextEnemy();
          return;
        }
        // Secret Tag Team: same idea, its own chain — see `secretTagNextEnemy`.
        if (this.secretTag && this.secretTag.enemyIndex + 1 < this.secretTag.enemies.length) {
          this.secretTagNextEnemy();
          return;
        }
        // Duo: the other one is still standing, so this is not the bout either.
        if (this.duoKit.isActive) {
          this.showFloatingText(this.npc.x, this.npc.y - 50, '☠ ONE DOWN', '#ffd27a');
          return;
        }
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
          onIllusionMsg: (msg) => arena.illusionKit.handleNetMsg(msg),
        onPsychicMsg: (msg) => arena.psychicKit.handleNetMsg(msg),
          conquestSnapshot: () => arena.conquestKit.netSnapshot(),
          onConquestSnapshot: (snap) => arena.conquestKit.applyNetSnapshot(snap),
          replayNpcMastery: (enhId, tx, ty) => arena.replayNpcMastery(enhId, tx, ty),
          onNpcQuantumSwap: (elementId, upgrades, masteryBinds, masteryOn, skin) => {
            arena.applyNpcElement(elementId, { upgrades, masteryBinds, masteryOn, skin });
            arena.quantumKit.noteNpcSwapped(elementId);
          },
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
    // Practice range only: wakes the target's abilities back up (it still never walks).
    this.dummyToggleKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.O);

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
          get elementId() { return arena.elementId; },
          unlockAchievement: (id) => arena.unlockAchievement(id),
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

    // ── Disgraced King setup ───────────────────────────────────────
    // Sits after the npc is built, since the fight takes that body over.
    if (this.isBossFight) {
      if (!this.bossKit) {
        const arena = this;
        const bossApi: DisgracedKingArenaApi = {
          get scene() { return arena as Phaser.Scene; },
          get player() { return arena.player; },
          get npc() { return arena.npc; },
          get enemies() { return arena.enemies; },
          get width() { return arena.scale.width; },
          get height() { return arena.scale.height; },
          addEnemy: (f) => { arena.enemies.push(f); arena.enemyGroup.add(f, true); },
          removeEnemy: (f) => {
            arena.enemies = arena.enemies.filter((e) => e !== f);
            arena.enemyGroup.remove(f, false, false);
          },
          showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
          spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
          spawnDamageNumber: (x, y, a) => arena.spawnDamageNumber(x, y, a),
          bossVictory: (outcome) => {
            // Hard mode's ending decides which element is granted; the kit has
            // already written the unlock, this only carries it to the results.
            arena.bossOutcome = outcome ?? null;
            arena.endGame(true);
          },
          setPointerLatched: (latched) => { arena.pointerInputLatched = latched; },
        };
        this.bossKit = new DisgracedKingKit(bossApi);
      }
      // A tag-team switch hands the fight on: the King resumes on the body, at
      // the health, and with the set piece the element that just fell left him.
      this.bossKit.reset(this.isBossHard, this.tagTeam?.bossResume ?? null);
    }

    // ── World Sovereign setup ──────────────────────────────────────
    // Same npc-slot takeover as the King, driven by a WorldBossDef. Hard mode
    // is the campaign's own Hard Mode toggle rather than a separate flag.
    if (this.worldBossId) {
      const bossDef = getWorldBossDef(this.worldBossId);
      if (bossDef) {
        if (!this.worldBossKit) {
          const arena = this;
          const api: WorldBossArenaApi = {
            get scene() { return arena as Phaser.Scene; },
            get player() { return arena.player; },
            get npc() { return arena.npc; },
            get width() { return arena.scale.width; },
            get height() { return arena.scale.height; },
            addEnemy: (f) => { arena.enemies.push(f); arena.enemyGroup.add(f, true); },
            removeEnemy: (f) => {
              arena.enemies = arena.enemies.filter((e) => e !== f);
              arena.enemyGroup.remove(f, false, false);
            },
            showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
            spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
            bossVictory: () => arena.endGame(true),
          };
          this.worldBossKit = new WorldBossKit(api);
        }
        // A pledge fight hands the body on: the Sovereign resumes on the phase and at the
        // HP the last element left it, rather than standing back up whole.
        this.worldBossKit.reset(
          bossDef, this.campaign?.hardMode === true, this.tagTeam?.bossResume ?? null,
        );
      }
    }

    // ── Standing arena rules: formats, gimmicks, secret modes ──────
    // Formats come off the fight def; the gimmick is the world's standing rule
    // and also runs under boss fights. Invasion and gauntlet nodes get neither
    // (their ids resolve to no def, and their modes carry their own machinery).
    // World Shift's map kit and Duo's second opponent are built here too — they
    // are the same shape of thing: a rule the whole arena is playing under.
    {
      const arena = this;
      if (!this.formatKit) {
        const api: CampaignFormatArenaApi = {
          get scene() { return arena as Phaser.Scene; },
          get player() { return arena.player; },
          get npc() { return arena.npc; },
          get width() { return arena.scale.width; },
          get height() { return arena.scale.height; },
          addEnemy: (f) => { arena.enemies.push(f); arena.enemyGroup.add(f, true); },
          removeEnemy: (f) => {
            arena.enemies = arena.enemies.filter((e) => e !== f);
            arena.enemyGroup.remove(f, false, false);
          },
          showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
          formatVictory: () => arena.endGame(true),
        };
        this.formatKit = new CampaignFormatKit(api);
      }
      const fightDef = this.campaign && !this.isInvasion && !this.gauntletState && !this.worldBossId
        ? getEffectiveFightDef(this.campaign.fightId, this.campaign.hardMode === true)
        : undefined;
      this.formatKit.reset(fightDef?.format ?? null, this.npcDifficulty.level);

      if (!this.gimmickKit) {
        const api: GimmickArenaApi = {
          get scene() { return arena as Phaser.Scene; },
          get player() { return arena.player; },
          get npc() { return arena.npc; },
          get width() { return arena.scale.width; },
          get height() { return arena.scale.height; },
          showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        };
        this.gimmickKit = new GimmickKit(api);
      }
      this.gimmickKit.reset(
        this.campaign && !this.isInvasion && !this.gauntletState ? this.campaign.worldId : null,
      );

      // ── World Shift ──────────────────────────────────────────────
      // The kit is built against a roster rather than against the npc slot, so
      // the same five arenas can later be handed a co-op team or an invasion
      // run without anything in SecretMapKit changing. Nothing does that today.
      if (!this.secretMapKit) {
        const api: SecretMapArenaApi = {
          get scene() { return arena as Phaser.Scene; },
          get width() { return arena.scale.width; },
          get height() { return arena.scale.height; },
          get allies() { return [arena.player as Fighter]; },
          get foes() {
            const second = arena.duoKit?.second;
            return second && second.active && second.hp > 0 ? [arena.npc, second] : [arena.npc];
          },
          get projectiles() { return arena.projectiles; },
          addEnemy: (f) => arena.addMapEnemy(f),
          removeEnemy: (f) => arena.removeMapEnemy(f),
          showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
          spawnHitFlash: (x, y, c) => arena.spawnHitFlash(x, y, c),
          get aimX() { return arena.input.activePointer.worldX; },
          get aimY() { return arena.input.activePointer.worldY; },
          get playerDashing() { return arena.isDodging; },
        };
        this.secretMapKit = new SecretMapKit(api);
      }
      this.secretMapKit.reset(data.secretMap ?? null);

      // ── Duo ──────────────────────────────────────────────────────
      if (!this.duoKit) {
        const api: DuoArenaApi = {
          get scene() { return arena as Phaser.Scene; },
          get player() { return arena.player as Fighter; },
          get projectiles() { return arena.projectiles; },
          get width() { return arena.scale.width; },
          get height() { return arena.scale.height; },
          get gameEnded() { return arena.gameEnded; },
          addEnemy: (f) => arena.addMapEnemy(f),
          removeEnemy: (f) => arena.removeMapEnemy(f),
          showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
          withNpcSlot: (f, el, fn) => arena.withNpcSlot(f, el, fn),
          buildNpcContext: (tx, ty) => arena.buildNpcContext(tx, ty),
          mapSeekPointFor: (f) => arena.secretMapKit.seekPointFor(f),
        };
        this.duoKit = new DuoKit(api);
      }
      this.duoKit.reset();
      this.duoKit.destroyNameplate();
      if (this.secretMode === 'duo' && data.duoEnemyElementId) {
        const secondEl = ELEMENT_MAP[data.duoEnemyElementId] ?? waterElement;
        const secondTex = ELEMENT_TEXTURES[data.duoEnemyElementId] ?? 'elem-water';
        const second = this.duoKit.spawn(secondEl, secondTex, difficultyConfig, W - 180, cy + 120);
        second.onHeal = (amt) => { this.npcHealNumAccum += amt; };
        // Both of them have to go down; the first one falling is not the bout.
        second.once('defeated', () => {
          this.duoKit.destroyNameplate();
          if (!this.npc.active || this.npc.hp <= 0) this.endGame(true);
          else this.showFloatingText(second.x, second.y - 50, '☠ ONE DOWN', '#ffd27a');
        });
      }

      // A tag-team enemy carries its wounds across the player's element swap. A boss does
      // too, but through its own kit — its HP is a per-phase pool, not one bar.
      if (this.tagTeam?.enemyHp != null && !this.worldBossId && !this.isBossFight) {
        this.npc.hp = Math.max(1, Math.min(this.npc.maxHp, this.tagTeam.enemyHp));
      }
      if (isPledgeFight(this.tagTeam)) {
        // Every burned element cost exactly one pledge, so the two numbers rebuild the
        // original count without carrying it around.
        const left = this.tagTeam!.pledgesLeft ?? 0;
        const pips = `${'●'.repeat(left)}${'○'.repeat(this.tagTeam!.usedElements.length)}`;
        // Same machinery, two names: the Sovereigns pledge, the King is a tag team.
        const label = this.isBossFight ? '⟳ TAGS' : '🛡 PLEDGES';
        this.showFloatingText(W / 2, 172, `${label}  ${pips}`, '#8ad2ff');
        // …and a standing readout, because how many Sovereigns are left is a decision the
        // player makes all fight, not an announcement they hear once. Only changes on a
        // scene restart, so it never needs a per-frame update.
        this.add.text(24, 46, `${this.isBossFight ? '⟳' : '🛡'} ${pips}`, {
          fontSize: '15px', color: '#8ad2ff', stroke: '#0a0510', strokeThickness: 3,
          letterSpacing: 2,
        }).setOrigin(0, 0.5).setDepth(21);
      } else if (this.tagTeam) {
        const total = this.tagTeam.enemies.length;
        this.showFloatingText(W / 2, 172,
          `⚔ FOE ${this.tagTeam.index + 1} / ${total}`, '#ffd27a');
      }
    }

    // ── Arena labels ───────────────────────────────────────────────
    if (!this.isInvasion && !this.isBossFight && !this.worldBossId) {
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

    // ── Audio ──────────────────────────────────────────────────────
    // The fight opens with a stinger and the groove that matches the mode; the
    // arena track then thickens on its own as the fight turns (see `update`).
    this.startFightAudio();
  }

  /**
   * Picks the music for this fight and plays the opening sting. Boss fights get
   * their own low, slow track and a longer intro so the sting has room.
   */
  private startFightAudio(): void {
    // Scene restarts wipe the timer along with everything else, so this is
    // re-armed per match rather than guarded against double-registration.
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.updateMusicIntensity() });

    if (this.isBossFight || this.worldBossId) {
      Sfx.play('boss-intro');
      Music.play('boss', { intensity: 0.55 });
      return;
    }

    Sfx.play('countdown-go');
    if (this.isInvasion) Music.play('invasion', { intensity: 0.4 });
    else if (this.isOnline) Music.play('online', { intensity: 0.45 });
    else if (this.gauntletState) Music.play('gauntlet', { intensity: 0.45 });
    else Music.play('arena', { intensity: 0.35 });
  }

  /**
   * Drives the music mix from how the fight is actually going: how hurt the
   * player is, how close the opponent is to dying, and how long it has run.
   * Called on a timer rather than every frame — the engine eases toward the
   * value anyway, so sampling it four times a second is plenty.
   */
  private updateMusicIntensity(): void {
    if (this.gameEnded) return;
    const playerHurt = 1 - Math.max(0, this.player.hp) / Math.max(1, this.player.maxHp);
    const foeHurt = this.npc?.active
      ? 1 - Math.max(0, this.npc.hp) / Math.max(1, this.npc.maxHp)
      : 0;
    // Weighted toward the player's own danger — a fight you are losing should
    // sound more urgent than one you are winning.
    const base = (this.isBossFight || this.worldBossId) ? 0.5 : 0.3;
    Music.setIntensity(Math.min(1, base + playerHurt * 0.5 + foeHurt * 0.2));

    // A separate heartbeat under 25% HP, so low health is felt and not just seen.
    if (this.player.active && playerHurt > 0.75) Sfx.play('low-health');
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
      case 'heatwave':
        if (this.npcElement.id === 'fire') this.fireKit.doNpcHeatwave(tx, ty);
        break;
      case 'kinetic-bomb':
        if (this.npcElement.id === 'electricity') this.electricityKit.doNpcKineticBomb(tx, ty);
        break;
      case 'siphon':
        if (this.npcElement.id === 'water') this.waterKit.doNpcSiphon(tx, ty);
        break;
      case 'winds-of-change':
        if (this.npcElement.id === 'air') this.airKit.doWindsOfChange('npc');
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
        if (this.npcElement.id === 'subterfuge') this.subterfugeKit.doNpcSmokeBreak();
        break;
      case 'smoke-break-toss':
        if (this.npcElement.id === 'subterfuge') this.subterfugeKit.doNpcSmokeToss(tx, ty);
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
    // Hunt, Silence, Gunpowder, Justice and Gluttony have extra abilities beyond the first 5;
    // only show 5 at a time.
    const MULTI_FORM_ELEMENTS = ['hunt', 'silence', 'gunpowder', 'justice', 'gluttony'];
    const trayAbilities = (id: string): Ability[] => {
      const el = ELEMENT_MAP[id];
      if (!el) return [];
      return MULTI_FORM_ELEMENTS.includes(id) ? el.abilities.slice(0, 5) : el.abilities;
    };
    const abilities = trayAbilities(this.elementId);

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
      'chalk-ward':        0xf4f1e6,
      'chalk-explosive':   0xff5f4a,
      'chalk-perma':       0x5aa9ff,
      'chalk-shield':      0xcfc9b8,
      'chalk-masterpiece': 0x3fd9d1,
      'magma-plume':       0xff8b22,
      'magma-volcano':     0xff5a1e,
      'magma-bloat':       0xffc44a,
      'magma-fist':        0xff7733,
      'magma-dragon-kin':  0xc07dff,
      'illusion-crack-shot': 0xff3b4a,
      'illusion-veil':       0x8a6cff,
      'illusion-relocate':   0xb45cff,
      'illusion-tesseract':  0x4de8ff,
      'illusion-dance':      0xff4dd2,
      'ruin-shred':            0xc4392c,
      'ruin-lockdown':         0xa4552a,
      'ruin-skewer':           0x6b524a,
      'ruin-spikes':           0xff6a4d,
      'ruin-decay':            0xb08a3a,
      // Paper takes its card colours from the three storybooks: green knight, blue alien,
      // red fantasy — and the three keys that belong to no book stay paper-coloured.
      'paper-storybook':       0x6ef0a8,
      'paper-plane':           0xf2ead6,
      'paper-shuriken':        0xc8324a,
      'paper-mache':           0xa8996f,
      'paper-climax':          0xd45cf0,
      // Sand runs its cards up the course: iron for the gun, grey stone for the short obby,
      // gold for the pyramid at the end of the long one, storm-sand for the F, and the worm.
      'dune-striker':          0x8e8078,
      'dune-ruins':            0x8d8b86,
      'dune-pyramid':          0xffd54a,
      'dune-sandwalk':         0xd9ab63,
      'dune-final-trail':      0xd4441c,
      // Death paints its cards with the things it is allowed to be coloured by: the river, the
      // afterimage, the steel and the clock. Amputate takes the blood, which the kit otherwise
      // spends only on midnight.
      // Fortune: money is gold, the illegal page is green, and the beam is the brightest
      // thing the element owns.
      'fortune-fire':          0xb8c2cc,
      'fortune-safe':          0xf0c33c,
      'fortune-risky':         0x2f8f57,
      'fortune-paywall':       0xa8791e,
      'fortune-p2w':           0xfff6d0,
      // Marrow: bone for the antibody, then each cell's own hue — violet, green, cyan, magenta.
      'marrow-antibody':       0xf1e7d0,
      'marrow-macrosma':       0x7b6cd9,
      'marrow-neutralize':     0x2fc79b,
      'marrow-dendricles':     0x46c8f5,
      'marrow-mastacre':       0xf05fa8,
      // Gluttony: the chef's row is whites and produce, the butcher's is all meat.
      'glut-knife':            0xd6dee6,
      'glut-forage':           0x63a53c,
      'glut-charcoal':         0x4a4048,
      'glut-butcher':          0xa81f2b,
      'glut-feast':            0xc8823a,
      'glut-cleave':           0xe0e6ec,
      'glut-poach':            0x94a1ad,
      'glut-cannibalize':      0x7f3039,
      'glut-return':           0xf6f2e8,
      'glut-maw':              0xd4707b,
      'death-styx':            0x54cbb2,
      'death-disarm':          0xf5e14a,
      'death-riposte':         0xd6dde8,
      'death-amputate':        0xc42a3a,
      'death-deal':            0xd9b23a,
      'depths-piranha':        0xc4243a,
      'depths-lungfish':       0x3fd8e8,
      'depths-eutrophication': 0x7ac64b,
      'depths-angler':         0xc8ffa4,
      'depths-megalodon':      0x4a6672,
      'conquest-banner':       0xe8503c,
      'conquest-barracks':     0x7a5230,
      'conquest-turret':       0x8f9aa6,
      'conquest-barricade':    0xb8b2a4,
      'conquest-expansion':    0xe8c23a,
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
      'wind-splice':    0xccddff,
      'spin-dance':     0x88ddff,
      'gale-glaive':    0xb4854a,
      'sky-grapple':    0x6699cc,
      'wind-breaker':   0x2255aa,
      'winds-of-change': 0xffd2e4,
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
      'staccato':           0xff66cc,
      'disc-dice':          0x44ee88,
      'boombox':            0xff3388,
      'bugle':              0xd9a441,
      'coda':               0xffdd44,
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
      // Justice (divine) — gold on the ground, pale blue in the air
      'justice-stab':           0xc9a13a,
      'justice-coliseum':       0x9c9382,
      'justice-sheer-will':     0x2f7bff,
      'justice-flight':         0xa8ccff,
      'justice-judgement-day':  0xf0d68a,
      'justice-spear-throw':    0xfff3cf,
      'justice-bind':           0x7d5f22,
      'justice-pillar':         0xff7a1f,
      'justice-descend':        0xe6e1d2,
      'justice-seraphim':       0xffffff,
      // Dream (divine) — cosmic violet, with the pillow and the oasis breaking out of it
      'dream-trance':           0x8b5cf6,
      'dream-pillow-fight':     0xbfd0ff,
      'dream-dreamcatcher':     0xa87b52,
      'dream-nightmare':        0xff3b6b,
      'dream-oasis':            0x3fc7d6,
      // Quantum's Third State — cyan for the certain half of each split, violet for the ghost
      'quantum-splicers':       0x7df9ff,
      'quantum-ability-split':  0xb07dff,
      'quantum-arena-split':    0x5fd8ea,
      'quantum-effect-split':   0xeaffff,
      'quantum-parasite':       0x9de8ff,
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
      } else if (this.elementId === 'justice') {
        this.justiceGroundHudCards.push(bg, fill, lbl, desc);
      } else if (this.elementId === 'gluttony') {
        this.gluttonyChefHudCards.push(bg, fill, lbl, desc);
      }
      // Separate from the chain above on purpose: a bonded half can itself be one of those.
      if (this.playerBond) this.quantumOwnHudCards.push(bg, fill, lbl, desc);
    });

    // Form-swapping elements get a hidden card row per extra form, built on the same plates
    // as the first row so a transform swaps the tray's contents without changing its look.
    const buildRow = (
      list: Ability[], fills: AbilityBarEntry[], cards: Phaser.GameObjects.GameObject[], fallback: number,
      elId?: string,
    ) => {
      // A row belonging to another element carries that element's binds, not the live one's —
      // Quantum's dormant half is a different element with its own mastery loadout.
      const binds = elId && PlayerData.isMasteryEnabled(elId) ? PlayerData.getMasteryBinds(elId) : {};
      list.forEach((ab, i) => {
        const x = startX + i * cardW;
        const boundEnh = elId ? getEnhancement(elId, binds[ab.displayKey.toLowerCase()] ?? '') : null;
        const cardColor = boundEnh ? 0xffaa00 : (fillColors[ab.id] ?? fallback);
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
        const lbl = this.add.text(x, hudY - 7, `${ab.displayKey}  ${boundEnh ? boundEnh.name : ab.name}`, {
          fontSize: '11px', fontFamily: UI.FONT_DISPLAY,
          color: boundEnh ? UI.T.gold : UI.T.bright, letterSpacing: 0.5,
        }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
        const desc = this.add.text(x, hudY + 8,
          boundEnh ? (boundEnh.hudDescription ?? boundEnh.description) : ab.description, {
            fontSize: '9px', fontFamily: UI.FONT_UI, color: UI.T.dim,
            wordWrap: { width: cardW - 12 }, maxLines: 2, align: 'center',
          }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
        fills.push({
          fill, abilityId: boundEnh ? boundEnh.id : ab.id,
          maxWidth: cardW - 4, lbl, desc, baseFillColor: cardColor,
        });
        cards.push(bg, fill, lbl, desc);
      });
    };

    if (this.elementId === 'hunt') {
      this.huntNormalFills = [...this.abilityBars];
      buildRow(this.playerElement.abilities.slice(5, 10), this.huntBeastFills, this.huntBeastHudCards, 0xaa2233);
      buildRow(this.playerElement.abilities.slice(10, 15), this.huntHybridFills, this.huntHybridHudCards, 0xcc5522);
    } else if (this.elementId === 'justice') {
      this.justiceGroundFills = [...this.abilityBars];
      buildRow(this.playerElement.abilities.slice(5, 10), this.justiceFlightFills, this.justiceFlightHudCards, 0xa8ccff);
    } else if (this.elementId === 'gluttony') {
      this.gluttonyChefFills = [...this.abilityBars];
      buildRow(this.playerElement.abilities.slice(5, 10), this.gluttonyButcherFills, this.gluttonyButcherHudCards, 0xa81f2b);
    }

    // Quantum: both halves get a full tray, built here and toggled by `quantumSetHudForm`.
    // Rebuilding on each swap would be simpler and wrong — the cards carry the live cooldown
    // fills, and throwing them away mid-fight resets every bar to empty.
    if (this.playerBond) {
      this.quantumOwnFills = [...this.abilityBars];
      const other = this.playerBond[1];
      buildRow(trayAbilities(other), this.quantumOtherFills, this.quantumOtherHudCards,
        ELEMENT_MAP[other]?.color ?? 0x7df9ff, other);
      // Third State adds a stop that is Quantum itself, so it gets a row of its own. Built off
      // `getPlayerForms` rather than the upgrade flag directly, so the tray and the cycle can
      // never disagree about whether the third stop exists.
      if (this.quantumKit.getPlayerForms().length > 2) {
        buildRow(trayAbilities('quantum'), this.quantumCoreFills, this.quantumCoreHudCards,
          quantumElement.color, 'quantum');
      }
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
        this.spawnHitFlash(t.x, t.y, this.skinsKit.fireColor('player', 0xff6600));
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

  /**
   * Psychic's Migraine, applied at the one place in the game every ability takes its aim from.
   *
   * `CastContext.targetX/targetY` is the single point that all ~240 abilities across every
   * element agree on, so rotating it about the caster here is the only way to make "they miss
   * many of their shots" true for a bot, a boss, an online replica and the player alike without
   * touching any of them. Two casts in three go 20–35° wide; the rest land honestly, because a
   * debuff that misses *everything* stops reading as distress and starts reading as a stun.
   */
  private scatterAim(caster: Fighter, tx: number, ty: number): { x: number; y: number } {
    if (!caster || Date.now() >= caster.aimScatterUntil) return { x: tx, y: ty };
    if (Math.random() < 0.34) return { x: tx, y: ty };
    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty);
    if (dist < 1) return { x: tx, y: ty };
    const off = (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.DegToRad(20 + Math.random() * 15);
    const ang = Phaser.Math.Angle.Between(caster.x, caster.y, tx, ty) + off;
    return { x: caster.x + Math.cos(ang) * dist, y: caster.y + Math.sin(ang) * dist };
  }

  private buildPlayerContext(targetX: number, targetY: number): CastContext {
    const aim = this.scatterAim(this.player, targetX, targetY);
    targetX = aim.x;
    targetY = aim.y;
    return {
      scene: this,
      casterX: this.player.x,
      casterY: this.player.y,
      targetX,
      targetY,
      isPlayerCaster: true,
      projectiles: this.projectiles,
      fireColor: (base) => this.skinsKit.fireColor('player', base),
      waterColor: (base) => this.skinsKit.waterColor('player', base),
      lifeColor: (base) => this.skinsKit.lifeColor('player', base),
      airColor: (base) => this.skinsKit.airColor('player', base),
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
      fireMoltenEruption: () => this.fireKit.doMoltenEruption('player'),
      fireScorchCaster: () => this.fireKit.scorchCaster('player'),
      fireLobPressureBomb: (x, y, damage) => this.fireKit.lobPressureBomb(x, y, damage, 'player'),
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
      airSplice: (x, y) => this.airKit.doSplice('player', x, y),
      airSpinDance: (x, y) => this.airKit.doSpinDance('player', x, y),
      airGaleGlaive: (x, y) => this.airKit.doGaleGlaive('player', x, y),
      airSkyGrapple: (x, y) => this.airKit.doSkyGrapple('player', x, y),
      airWindBreaker: (x, y) => this.airKit.doWindBreaker('player', x, y),
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
      // Justice
      justiceStab: (tx, ty) => this.justiceKit.doStab(tx, ty, 'player'),
      justiceColiseum: () => this.justiceKit.doColiseum('player'),
      justiceSheerWill: () => this.justiceKit.doSheerWill('player'),
      justiceFlight: () => this.justiceKit.doFlight('player'),
      justiceJudgementDay: () => this.justiceKit.doJudgementDay('player'),
      justiceSpearThrow: (tx, ty) => this.justiceKit.doSpearThrow(tx, ty, 'player'),
      justiceBind: (tx, ty) => this.justiceKit.doBind(tx, ty, 'player'),
      justicePillar: (tx, ty) => this.justiceKit.doPillar(tx, ty, 'player'),
      justiceDescend: () => this.justiceKit.doDescend('player'),
      justiceSeraphim: () => this.justiceKit.doSeraphim('player'),
      // Dream
      dreamTrance: () => this.dreamKit.doTrance('player'),
      dreamPillowFight: (tx, ty) => this.dreamKit.doPillowFight(tx, ty, 'player'),
      dreamDreamcatcher: () => this.dreamKit.doDreamcatcher('player'),
      dreamNightmare: () => this.dreamKit.doNightmare('player'),
      dreamOasis: () => this.dreamKit.doOasis('player'),
      chalkWard: () => this.chalkKit.doWard('player'),
      chalkExplosive: () => this.chalkKit.doExplosive('player'),
      chalkPerma: () => this.chalkKit.doPerma('player'),
      chalkShield: () => this.chalkKit.doShield('player'),
      chalkMasterpiece: () => this.chalkKit.doMasterpiece('player'),
      magmaPlume: (tx, ty) => this.magmaKit.doPlume('player', tx, ty),
      magmaVolcano: (tx, ty) => this.magmaKit.doVolcano('player', tx, ty),
      magmaBloat: () => this.magmaKit.doBloat('player'),
      magmaFist: (tx, ty) => this.magmaKit.doFist('player', tx, ty),
      magmaDragonKin: (tx, ty) => this.magmaKit.doDragonKin('player', tx, ty),
      illusionCrackShot: (tx, ty) => this.illusionKit.doCrackShot('player', tx, ty),
      illusionVeil: (tx, ty) => this.illusionKit.doVeil('player', tx, ty),
      illusionRelocate: () => this.illusionKit.doRelocate('player'),
      illusionTesseract: (tx, ty) => this.illusionKit.doTesseract('player', tx, ty),
      illusionDance: () => this.illusionKit.doDance('player'),
      ruinShred: (tx, ty) => this.ruinKit.doShred('player', tx, ty),
      ruinLockdown: (tx, ty) => this.ruinKit.doLockdown('player', tx, ty),
      ruinSkewer: (tx, ty) => this.ruinKit.doSkewer('player', tx, ty),
      ruinSpikes: () => this.ruinKit.doSpikes('player'),
      ruinDecay: () => this.ruinKit.doDecay('player'),
      duneStriker: (tx, ty) => this.sandKit.doStriker('player', tx, ty),
      duneRuins: () => this.sandKit.doRuins('player'),
      dunePyramid: () => this.sandKit.doPyramid('player'),
      duneSandwalk: (tx, ty) => this.sandKit.doSandwalk('player', tx, ty),
      duneFinalTrail: () => this.sandKit.doFinalTrail('player'),
      deathStyxShot: (tx, ty) => this.deathKit.doStyxShot('player', tx, ty),
      deathDisarm: (tx, ty) => this.deathKit.doDisarm('player', tx, ty),
      deathRiposte: (tx, ty) => this.deathKit.doRiposte('player', tx, ty),
      deathAmputate: (tx, ty) => this.deathKit.doAmputate('player', tx, ty),
      deathDeal: (tx, ty) => this.deathKit.doDeal('player', tx, ty),
      fortuneFire: (tx, ty) => this.fortuneKit.doFire('player', tx, ty),
      fortuneSafeInvest: () => this.fortuneKit.doSafeInvest('player'),
      fortuneRiskyInvest: () => this.fortuneKit.doRiskyInvest('player'),
      fortunePaywall: (tx, ty) => this.fortuneKit.doPaywall('player', tx, ty),
      fortunePayToWin: (tx, ty) => this.fortuneKit.doPayToWin('player', tx, ty),
      marrowAntibody: (tx, ty) => this.marrowKit.doAntibody('player', tx, ty),
      marrowMacrosma: () => this.marrowKit.doMacrosma('player'),
      marrowNeutralize: () => this.marrowKit.doNeutralize('player'),
      marrowDendricles: (tx, ty) => this.marrowKit.doDendricles('player', tx, ty),
      marrowMastacre: () => this.marrowKit.doMastacre('player'),
      // Psychic
      psychicHeadache: (tx, ty) => this.psychicKit.doHeadache('player', tx, ty),
      psychicMindControl: () => this.psychicKit.doMindControl('player'),
      psychicDodgeDestiny: () => this.psychicKit.doDodgeDestiny('player'),
      psychicMigraine: (tx, ty) => this.psychicKit.doMigraine('player', tx, ty),
      psychicComa: () => this.psychicKit.doComa('player'),
      radiationRailgun: (tx, ty) => this.radiationKit.doRailgun('player', tx, ty),
      radiationBaton: (tx, ty) => this.radiationKit.doBaton('player', tx, ty),
      radiationXray: () => this.radiationKit.doXray('player'),
      radiationWaste: (tx, ty) => this.radiationKit.doWaste('player', tx, ty),
      radiationExtermination: () => this.radiationKit.doExtermination('player'),
      bindSummon: (tx, ty) => this.bindKit.doSummon('player', tx, ty),
      bindShards: (tx, ty) => this.bindKit.doShards('player', tx, ty),
      bindIdol: (tx, ty) => this.bindKit.doIdol('player', tx, ty),
      bindProtection: () => this.bindKit.doProtection('player'),
      bindTreachery: () => this.bindKit.doTreachery('player'),
      // Slime
      gumGrab: (tx, ty) => this.gumKit.doGrab('player', tx, ty),
      gumSurge: (tx, ty) => this.gumKit.doSurge('player', tx, ty),
      gumGumball: (tx, ty) => this.gumKit.doGumball('player', tx, ty),
      gumOozorbtion: () => this.gumKit.doOozorbtion('player'),
      gumSolidify: () => this.gumKit.doSolidify('player'),
      quantumSplicers: () => this.quantumCoreKit.doSplicers('player'),
      quantumAbilitySplit: () => this.quantumCoreKit.doAbilitySplit('player'),
      quantumArenaSplit: () => this.quantumCoreKit.doArenaSplit('player'),
      quantumEffectSplit: () => this.quantumCoreKit.doEffectSplit('player'),
      quantumParasite: (tx, ty) => this.quantumCoreKit.doParasite('player', tx, ty),
      // Gluttony
      gluttonyKnife: (tx, ty) => this.gluttonyKit.doKnife('player', tx, ty),
      gluttonyForage: () => this.gluttonyKit.doForage('player'),
      gluttonyCharcoal: (tx, ty) => this.gluttonyKit.doCharcoal('player', tx, ty),
      gluttonyButcher: () => this.gluttonyKit.doButcher('player'),
      gluttonyFeast: () => this.gluttonyKit.doFeast('player'),
      gluttonyCleave: (tx, ty) => this.gluttonyKit.doCleave('player', tx, ty),
      gluttonyPoach: (tx, ty) => this.gluttonyKit.doPoach('player', tx, ty),
      gluttonyCannibalize: (tx, ty) => this.gluttonyKit.doCannibalize('player', tx, ty),
      gluttonyReturn: () => this.gluttonyKit.doReturn('player'),
      gluttonyMawAwakening: () => this.gluttonyKit.doMawAwakening('player'),
      paperStorybook: (tx, ty) => this.paperKit.doStorybook('player', tx, ty),
      paperPlane: (tx, ty) => this.paperKit.doPlane('player', tx, ty),
      paperShuriken: (tx, ty) => this.paperKit.doShuriken('player', tx, ty),
      paperMache: () => this.paperKit.doMache('player'),
      paperClimax: (tx, ty) => this.paperKit.doClimax('player', tx, ty),
      depthsPiranha: (tx, ty) => this.depthsKit.doPiranha('player', tx, ty),
      depthsLungfish: (tx, ty) => this.depthsKit.doLungfish('player', tx, ty),
      depthsEutrophication: () => this.depthsKit.doEutrophication('player'),
      depthsAngler: (tx, ty) => this.depthsKit.doAngler('player', tx, ty),
      depthsMegalodon: (tx, ty) => this.depthsKit.doMegalodon('player', tx, ty),
      passionLoveshot: (tx, ty) => this.passionKit.doLoveshot('player', tx, ty),
      passionFlirt: (tx, ty) => this.passionKit.doFlirt('player', tx, ty),
      passionSmooch: (tx, ty) => this.passionKit.doSmooch('player', tx, ty),
      passionManipulate: (tx, ty) => this.passionKit.doManipulate('player', tx, ty),
      passionExhibition: () => this.passionKit.doExhibition('player'),
      conquestBanner: () => this.conquestKit.doBanner('player', targetX, targetY),
      conquestBuild: (kind) => this.conquestKit.doBuild('player', kind),
      conquestExpansion: () => this.conquestKit.doExpansion('player'),
      hasPerk: (perkId) => this.hasPerk('player', perkId),
    };
  }

  private buildNpcContext(targetX: number, targetY: number): CastContext {
    const aim = this.scatterAim(this.npc, targetX, targetY);
    targetX = aim.x;
    targetY = aim.y;
    return {
      scene: this,
      casterX: this.npc.x,
      casterY: this.npc.y,
      targetX,
      targetY,
      isPlayerCaster: false,
      projectiles: this.projectiles,
      fireColor: (base) => this.skinsKit.fireColor('npc', base),
      waterColor: (base) => this.skinsKit.waterColor('npc', base),
      lifeColor: (base) => this.skinsKit.lifeColor('npc', base),
      airColor: (base) => this.skinsKit.airColor('npc', base),
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
      fireMoltenEruption: () => this.fireKit.doMoltenEruption('npc'),
      fireScorchCaster: () => this.fireKit.scorchCaster('npc'),
      fireLobPressureBomb: (x, y, damage) => this.fireKit.lobPressureBomb(x, y, damage, 'npc'),
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
      airSplice: (x, y) => this.airKit.doSplice('npc', x, y),
      airSpinDance: (x, y) => this.airKit.doSpinDance('npc', x, y),
      airGaleGlaive: (x, y) => this.airKit.doGaleGlaive('npc', x, y),
      airSkyGrapple: (x, y) => this.airKit.doSkyGrapple('npc', x, y),
      airWindBreaker: (x, y) => this.airKit.doWindBreaker('npc', x, y),
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
      // Justice
      justiceStab: (tx, ty) => this.justiceKit.doStab(tx, ty, 'npc'),
      justiceColiseum: () => this.justiceKit.doColiseum('npc'),
      justiceSheerWill: () => this.justiceKit.doSheerWill('npc'),
      justiceFlight: () => this.justiceKit.doFlight('npc'),
      justiceJudgementDay: () => this.justiceKit.doJudgementDay('npc'),
      justiceSpearThrow: (tx, ty) => this.justiceKit.doSpearThrow(tx, ty, 'npc'),
      justiceBind: (tx, ty) => this.justiceKit.doBind(tx, ty, 'npc'),
      justicePillar: (tx, ty) => this.justiceKit.doPillar(tx, ty, 'npc'),
      justiceDescend: () => this.justiceKit.doDescend('npc'),
      justiceSeraphim: () => this.justiceKit.doSeraphim('npc'),
      // Dream
      dreamTrance: () => this.dreamKit.doTrance('npc'),
      dreamPillowFight: (tx, ty) => this.dreamKit.doPillowFight(tx, ty, 'npc'),
      dreamDreamcatcher: () => this.dreamKit.doDreamcatcher('npc'),
      dreamNightmare: () => this.dreamKit.doNightmare('npc'),
      dreamOasis: () => this.dreamKit.doOasis('npc'),
      chalkWard: () => this.chalkKit.doWard('npc'),
      chalkExplosive: () => this.chalkKit.doExplosive('npc'),
      chalkPerma: () => this.chalkKit.doPerma('npc'),
      chalkShield: () => this.chalkKit.doShield('npc'),
      chalkMasterpiece: () => this.chalkKit.doMasterpiece('npc'),
      magmaPlume: (tx, ty) => this.magmaKit.doPlume('npc', tx, ty),
      magmaVolcano: (tx, ty) => this.magmaKit.doVolcano('npc', tx, ty),
      magmaBloat: () => this.magmaKit.doBloat('npc'),
      magmaFist: (tx, ty) => this.magmaKit.doFist('npc', tx, ty),
      magmaDragonKin: (tx, ty) => this.magmaKit.doDragonKin('npc', tx, ty),
      illusionCrackShot: (tx, ty) => this.illusionKit.doCrackShot('npc', tx, ty),
      illusionVeil: (tx, ty) => this.illusionKit.doVeil('npc', tx, ty),
      illusionRelocate: () => this.illusionKit.doRelocate('npc'),
      illusionTesseract: (tx, ty) => this.illusionKit.doTesseract('npc', tx, ty),
      illusionDance: () => this.illusionKit.doDance('npc'),
      ruinShred: (tx, ty) => this.ruinKit.doShred('npc', tx, ty),
      ruinLockdown: (tx, ty) => this.ruinKit.doLockdown('npc', tx, ty),
      ruinSkewer: (tx, ty) => this.ruinKit.doSkewer('npc', tx, ty),
      ruinSpikes: () => this.ruinKit.doSpikes('npc'),
      ruinDecay: () => this.ruinKit.doDecay('npc'),
      duneStriker: (tx, ty) => this.sandKit.doStriker('npc', tx, ty),
      duneRuins: () => this.sandKit.doRuins('npc'),
      dunePyramid: () => this.sandKit.doPyramid('npc'),
      duneSandwalk: (tx, ty) => this.sandKit.doSandwalk('npc', tx, ty),
      duneFinalTrail: () => this.sandKit.doFinalTrail('npc'),
      deathStyxShot: (tx, ty) => this.deathKit.doStyxShot('npc', tx, ty),
      deathDisarm: (tx, ty) => this.deathKit.doDisarm('npc', tx, ty),
      deathRiposte: (tx, ty) => this.deathKit.doRiposte('npc', tx, ty),
      deathAmputate: (tx, ty) => this.deathKit.doAmputate('npc', tx, ty),
      deathDeal: (tx, ty) => this.deathKit.doDeal('npc', tx, ty),
      fortuneFire: (tx, ty) => this.fortuneKit.doFire('npc', tx, ty),
      fortuneSafeInvest: () => this.fortuneKit.doSafeInvest('npc'),
      fortuneRiskyInvest: () => this.fortuneKit.doRiskyInvest('npc'),
      fortunePaywall: (tx, ty) => this.fortuneKit.doPaywall('npc', tx, ty),
      fortunePayToWin: (tx, ty) => this.fortuneKit.doPayToWin('npc', tx, ty),
      marrowAntibody: (tx, ty) => this.marrowKit.doAntibody('npc', tx, ty),
      marrowMacrosma: () => this.marrowKit.doMacrosma('npc'),
      marrowNeutralize: () => this.marrowKit.doNeutralize('npc'),
      marrowDendricles: (tx, ty) => this.marrowKit.doDendricles('npc', tx, ty),
      marrowMastacre: () => this.marrowKit.doMastacre('npc'),
      // Psychic
      psychicHeadache: (tx, ty) => this.psychicKit.doHeadache('npc', tx, ty),
      psychicMindControl: () => this.psychicKit.doMindControl('npc'),
      psychicDodgeDestiny: () => this.psychicKit.doDodgeDestiny('npc'),
      psychicMigraine: (tx, ty) => this.psychicKit.doMigraine('npc', tx, ty),
      psychicComa: () => this.psychicKit.doComa('npc'),
      radiationRailgun: (tx, ty) => this.radiationKit.doRailgun('npc', tx, ty),
      radiationBaton: (tx, ty) => this.radiationKit.doBaton('npc', tx, ty),
      radiationXray: () => this.radiationKit.doXray('npc'),
      radiationWaste: (tx, ty) => this.radiationKit.doWaste('npc', tx, ty),
      radiationExtermination: () => this.radiationKit.doExtermination('npc'),
      bindSummon: (tx, ty) => this.bindKit.doSummon('npc', tx, ty),
      bindShards: (tx, ty) => this.bindKit.doShards('npc', tx, ty),
      bindIdol: (tx, ty) => this.bindKit.doIdol('npc', tx, ty),
      bindProtection: () => this.bindKit.doProtection('npc'),
      bindTreachery: () => this.bindKit.doTreachery('npc'),
      // Slime
      gumGrab: (tx, ty) => this.gumKit.doGrab('npc', tx, ty),
      gumSurge: (tx, ty) => this.gumKit.doSurge('npc', tx, ty),
      gumGumball: (tx, ty) => this.gumKit.doGumball('npc', tx, ty),
      gumOozorbtion: () => this.gumKit.doOozorbtion('npc'),
      gumSolidify: () => this.gumKit.doSolidify('npc'),
      quantumSplicers: () => this.quantumCoreKit.doSplicers('npc'),
      quantumAbilitySplit: () => this.quantumCoreKit.doAbilitySplit('npc'),
      quantumArenaSplit: () => this.quantumCoreKit.doArenaSplit('npc'),
      quantumEffectSplit: () => this.quantumCoreKit.doEffectSplit('npc'),
      quantumParasite: (tx, ty) => this.quantumCoreKit.doParasite('npc', tx, ty),
      // Gluttony
      gluttonyKnife: (tx, ty) => this.gluttonyKit.doKnife('npc', tx, ty),
      gluttonyForage: () => this.gluttonyKit.doForage('npc'),
      gluttonyCharcoal: (tx, ty) => this.gluttonyKit.doCharcoal('npc', tx, ty),
      gluttonyButcher: () => this.gluttonyKit.doButcher('npc'),
      gluttonyFeast: () => this.gluttonyKit.doFeast('npc'),
      gluttonyCleave: (tx, ty) => this.gluttonyKit.doCleave('npc', tx, ty),
      gluttonyPoach: (tx, ty) => this.gluttonyKit.doPoach('npc', tx, ty),
      gluttonyCannibalize: (tx, ty) => this.gluttonyKit.doCannibalize('npc', tx, ty),
      gluttonyReturn: () => this.gluttonyKit.doReturn('npc'),
      gluttonyMawAwakening: () => this.gluttonyKit.doMawAwakening('npc'),
      paperStorybook: (tx, ty) => this.paperKit.doStorybook('npc', tx, ty),
      paperPlane: (tx, ty) => this.paperKit.doPlane('npc', tx, ty),
      paperShuriken: (tx, ty) => this.paperKit.doShuriken('npc', tx, ty),
      paperMache: () => this.paperKit.doMache('npc'),
      paperClimax: (tx, ty) => this.paperKit.doClimax('npc', tx, ty),
      depthsPiranha: (tx, ty) => this.depthsKit.doPiranha('npc', tx, ty),
      depthsLungfish: (tx, ty) => this.depthsKit.doLungfish('npc', tx, ty),
      depthsEutrophication: () => this.depthsKit.doEutrophication('npc'),
      depthsAngler: (tx, ty) => this.depthsKit.doAngler('npc', tx, ty),
      depthsMegalodon: (tx, ty) => this.depthsKit.doMegalodon('npc', tx, ty),
      passionLoveshot: (tx, ty) => this.passionKit.doLoveshot('npc', tx, ty),
      passionFlirt: (tx, ty) => this.passionKit.doFlirt('npc', tx, ty),
      passionSmooch: (tx, ty) => this.passionKit.doSmooch('npc', tx, ty),
      passionManipulate: (tx, ty) => this.passionKit.doManipulate('npc', tx, ty),
      passionExhibition: () => this.passionKit.doExhibition('npc'),
      conquestBanner: () => this.conquestKit.doBanner('npc', targetX, targetY),
      conquestBuild: (kind) => this.conquestKit.doBuild('npc', kind),
      conquestExpansion: () => this.conquestKit.doExpansion('npc'),
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
      fireColor: (base) => base, // raid NPCs have no skins
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
      airSplice: () => {},
      airSpinDance: () => {},
      airGaleGlaive: () => {},
      airSkyGrapple: () => {},
      airWindBreaker: () => {},
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
      justiceStab: () => {},
      justiceColiseum: () => {},
      justiceSheerWill: () => {},
      justiceFlight: () => {},
      justiceJudgementDay: () => {},
      justiceSpearThrow: () => {},
      justiceBind: () => {},
      justicePillar: () => {},
      justiceDescend: () => {},
      justiceSeraphim: () => {},
      dreamTrance: () => {},
      dreamPillowFight: () => {},
      dreamDreamcatcher: () => {},
      dreamNightmare: () => {},
      dreamOasis: () => {},
      chalkWard: () => {},
      chalkExplosive: () => {},
      chalkPerma: () => {},
      chalkShield: () => {},
      chalkMasterpiece: () => {},
      magmaPlume: () => {},
      magmaVolcano: () => {},
      magmaBloat: () => {},
      magmaFist: () => {},
      magmaDragonKin: () => {},
      illusionCrackShot: () => {},
      illusionVeil: () => {},
      illusionRelocate: () => {},
      illusionTesseract: () => {},
      illusionDance: () => {},
      ruinShred: () => {},
      ruinLockdown: () => {},
      ruinSkewer: () => {},
      ruinSpikes: () => {},
      ruinDecay: () => {},
      duneStriker: () => {},
      duneRuins: () => {},
      dunePyramid: () => {},
      duneSandwalk: () => {},
      duneFinalTrail: () => {},
      paperStorybook: () => {},
      paperPlane: () => {},
      paperShuriken: () => {},
      paperMache: () => {},
      paperClimax: () => {},
      deathStyxShot: () => {},
      deathDisarm: () => {},
      deathRiposte: () => {},
      deathAmputate: () => {},
      deathDeal: () => {},
      fortuneFire: () => {},
      fortuneSafeInvest: () => {},
      fortuneRiskyInvest: () => {},
      fortunePaywall: () => {},
      fortunePayToWin: () => {},
      marrowAntibody: () => {},
      marrowMacrosma: () => {},
      marrowNeutralize: () => {},
      marrowDendricles: () => {},
      marrowMastacre: () => {},
      psychicHeadache: () => {},
      psychicMindControl: () => {},
      psychicDodgeDestiny: () => {},
      psychicMigraine: () => {},
      psychicComa: () => {},
      radiationRailgun: () => {},
      radiationBaton: () => {},
      radiationXray: () => {},
      radiationWaste: () => {},
      radiationExtermination: () => {},
      bindSummon: () => {},
      bindShards: () => {},
      bindIdol: () => {},
      bindProtection: () => {},
      bindTreachery: () => {},
      gumGrab: () => {},
      gumSurge: () => {},
      gumGumball: () => {},
      gumOozorbtion: () => {},
      gumSolidify: () => {},
      quantumSplicers: () => {},
      quantumAbilitySplit: () => {},
      quantumArenaSplit: () => {},
      quantumEffectSplit: () => {},
      quantumParasite: () => {},
      gluttonyKnife: () => {},
      gluttonyForage: () => {},
      gluttonyCharcoal: () => {},
      gluttonyButcher: () => {},
      gluttonyFeast: () => {},
      gluttonyCleave: () => {},
      gluttonyPoach: () => {},
      gluttonyCannibalize: () => {},
      gluttonyReturn: () => {},
      gluttonyMawAwakening: () => {},
      depthsPiranha: () => {},
      depthsLungfish: () => {},
      depthsEutrophication: () => {},
      depthsAngler: () => {},
      depthsMegalodon: () => {},
      passionLoveshot: () => {},
      passionFlirt: () => {},
      passionSmooch: () => {},
      passionManipulate: () => {},
      passionExhibition: () => {},
      conquestBanner: () => {},
      conquestBuild: () => {},
      conquestExpansion: () => {},
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
    Sfx.play('achievement');
    const reward = def.skinReward ? getSkinDef(def.skinReward) : undefined;
    if (reward) {
      this.showFloatingText(this.player.x, this.player.y - 74, `🎁 Skin unlocked: ${reward.name}`, '#ffee88');
      Sfx.play('unlock', { delay: 0.5 });
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

    // A teleport and a dash are different moves and should not share a sound.
    Sfx.playAt(this.cardPsychoActive || this.fortuneKit.isTeleportDash() ? 'teleport' : 'dash', this.player.x);

    // Sound — Coda level 2+: the dash carries twice as far and trails notes behind it.
    const soundDash = this.elementId === 'sound' ? this.soundKit.getDashLengthMult() : 1;

    // Card — Psycho: teleport to cursor; Card — Technique: extended dash length.
    // Fortune's Tele-Core (E+) is the same move bought off a shelf, so it rides the same branch.
    if (this.cardPsychoActive || this.fortuneKit.isTeleportDash()) {
      const { width, height } = this.scale;
      const pad = 44;
      playerBody.reset(Math.max(pad, Math.min(width - pad, mouseX)), Math.max(pad, Math.min(height - pad, mouseY)));
      playerBody.setVelocity(0, 0);
    } else {
      const len = 520 * this.cardDodgeLengthMult * soundDash;
      playerBody.setVelocity(dx * len, dy * len);
    }
    if (this.elementId === 'sound') this.soundKit.onPlayerDash();

    // Quantum: the dodge *is* the swap. The dash still happens either way — a Quantum with
    // no bond dodges like anyone else — and the collapse rides on top of it.
    if (this.playerBond) this.quantumKit.swapPlayer();

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
      // The boss owns its own body across four phases, so a golf hit has to go
      // through `takeDamage` — writing hp directly skips the `defeated` event the
      // kit hands phases over on, and the direct `endGame` below would end the
      // whole fight on the first body.
      if (this.isBossFight) this.npc.takeDamage(dmg);
      else this.npc.hp = Math.max(0, this.npc.hp - dmg);
      this.spawnHitFlash(this.npc.x, this.npc.y, 0xffffff);
      this.spawnDamageNumber(this.npc.x, this.npc.y - 28, dmg);
      this.showFloatingText(this.npc.x, this.npc.y - 55, `⛳ ${dmg} dmg`, '#ffffff');
      // Reflect ball away from NPC
      const nx = ball.sprite.x - this.npc.x;
      const ny = ball.sprite.y - this.npc.y;
      const nl = Math.hypot(nx, ny) || 1;
      ball.vx = (nx / nl) * speed;
      ball.vy = (ny / nl) * speed;
      if (!this.isBossFight && this.npc.hp <= 0 && !this.gameEnded) {
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
    Music.stop(0.5);
    Sfx.play('defeat');
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

  // ── Tag-team transitions ──────────────────────────────────────────

  /** The current foe fell but the chain continues — restart into the next one. */
  private tagTeamNextEnemy(): void {
    if (this.gameEnded || !this.tagTeam) return;
    this.gameEnded = true;
    const next = this.tagTeam.enemies[this.tagTeam.index + 1];
    Sfx.play('victory');
    this.cameras.main.flash(300, 255, 200, 60);
    this.showFloatingText(this.scale.width / 2, this.scale.height / 2 - 40,
      '⚔ NEXT CHALLENGER', '#ffd27a');
    this.time.delayedCall(1300, () => {
      this.scene.restart({
        ...this.bootData,
        enemyElementId: next,
        tagTeam: { ...this.tagTeam!, index: this.tagTeam!.index + 1, enemyHp: null },
      });
    });
  }

  /**
   * The player fell mid-chain: burn this element and send them back to the
   * element picker. The foe keeps its current HP — progress is never wasted,
   * which is what makes the format generous rather than punishing.
   */
  private tagTeamSwapOut(): void {
    if (this.gameEnded || !this.tagTeam || !this.campaign) return;

    // A pledge fight is a bounded number of falls, not the whole roster: when the last
    // Sovereign has already taken the floor, this death is the bout.
    const pledge = isPledgeFight(this.tagTeam);
    if (pledge && (this.tagTeam.pledgesLeft ?? 0) <= 0) {
      this.endGame(false);
      return;
    }

    this.gameEnded = true;
    Music.stop(0.5);
    Sfx.play('defeat');
    this.cameras.main.flash(350, 120, 40, 60);
    this.showFloatingText(this.scale.width / 2, this.scale.height / 2 - 40,
      pledge ? '🛡 A SOVEREIGN ANSWERS' : '⟳ TAG IN A NEW ELEMENT', '#8ad2ff');
    const c = this.campaign;
    const carried: TagTeamState = {
      ...this.tagTeam,
      enemyHp: Math.max(1, this.npc.hp),
      usedElements: [...this.tagTeam.usedElements, this.elementId],
      ...(pledge ? {
        pledgesLeft: (this.tagTeam.pledgesLeft ?? 0) - 1,
        // The Sovereign is left exactly as wounded as this element left it.
        bossResume: this.worldBossKit?.getResumeState() ?? this.tagTeam.bossResume ?? null,
      } : {}),
    };
    this.time.delayedCall(1500, () => {
      this.scene.start('CampaignElementSelectScene', {
        worldId: c.worldId,
        nodeId: c.fightId,
        isChallenge: c.isChallenge,
        kind: 'fight',
        slotIdx: c.slot,
        hardMode: c.hardMode ?? false,
        enemyElementId: this.tagTeam!.enemies[this.tagTeam!.index],
        difficulty: this.npcDifficulty.level,
        mutations: [...this.mutations],
        starredMutations: [...this.starredMutations],
        tagTeam: carried,
      });
    });
  }

  /**
   * The player fell to the Disgraced King with a switch still in hand: burn this
   * element, take the fight's body and health with us, and go back to the door
   * to tag in another.
   *
   * The campaign's pledge fights do the same thing through
   * `CampaignElementSelectScene`; the Disgraced fights are loaded out in
   * MenuScene, so that is where this returns to. The resume state is read *now*
   * rather than inside the delayed call — the fight keeps running underneath the
   * defeat sting, and by the time the scene changes the King has moved on.
   */
  private bossTagSwapOut(): void {
    if (this.gameEnded || !this.tagTeam) return;
    const left = this.tagTeam.pledgesLeft ?? 0;
    if (left <= 0) {
      this.endGame(false);
      return;
    }

    this.gameEnded = true;
    Music.stop(0.5);
    Sfx.play('defeat');
    this.cameras.main.flash(350, 120, 40, 60);
    this.showFloatingText(this.scale.width / 2, this.scale.height / 2 - 40,
      '⟳ TAG IN A NEW ELEMENT', '#8ad2ff');

    const carried: TagTeamState = {
      ...this.tagTeam,
      enemyHp: null,
      usedElements: [...this.tagTeam.usedElements, this.elementId],
      pledgesLeft: left - 1,
      bossResume: this.bossKit?.getResumeState() ?? this.tagTeam.bossResume ?? null,
    };
    this.time.delayedCall(1500, () => {
      this.scene.start('MenuScene', {
        mode: 'boss',
        hard: this.isBossHard,
        tagTeam: carried,
      });
    });
  }

  // ── Dummy mode (the practice range under the Easy plate) ───────────

  /**
   * The tally over the target's head and the control legend under the arena.
   *
   * Deliberately loud: the whole mode is a measuring instrument, and a combo
   * number you have to hunt for is not one.
   */
  private buildDummyHud(): void {
    for (const t of this.dummyHudTexts) t.destroy();
    this.dummyHudTexts = [];

    this.dummyComboText = this.add.text(this.npc.x, this.npc.y - 62, '0', {
      fontSize: '26px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ffd27a', stroke: '#1a1005', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(23);
    this.dummyHudTexts.push(this.dummyComboText);

    // "∞" where the health bar used to be — the bar itself is hidden, and an
    // empty space over an enemy reads as a bug rather than as a rule.
    const inf = this.add.text(this.npc.x, this.npc.y - 38, '∞ HP', {
      fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#8ad2ff', stroke: '#04101a', strokeThickness: 3, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(22);
    this.dummyHudTexts.push(inf);
    inf.setData('follow', true);

    const legend = this.add.text(this.scale.width / 2, this.scale.height - 16,
      '🎯 PRACTICE RANGE     ARROWS move the target     P makes it shoot     O wakes its abilities up     ·     nothing here is recorded', {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#9aa2b8', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(23);
    this.dummyHudTexts.push(legend);

    const state = this.add.text(this.scale.width / 2, this.scale.height - 34, '', {
      fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#7ad48f', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(23);
    state.setData('role', 'state');
    this.dummyHudTexts.push(state);
  }

  /**
   * The practice range, per frame: drive the target, roll the five-second tally
   * over, and keep the readouts glued to the body.
   */
  private updateDummyPractice(time: number, delta: number): void {
    void delta;
    const dummyBody = this.npc.body as Phaser.Physics.Arcade.Body;

    // The target never walks on its own — in either state. `O` buys its
    // abilities back, not its feet.
    const dSpeed = 220;
    let dvx = 0, dvy = 0;
    if (this.dummyUpKey.isDown)    dvy -= dSpeed;
    if (this.dummyDownKey.isDown)  dvy += dSpeed;
    if (this.dummyLeftKey.isDown)  dvx -= dSpeed;
    if (this.dummyRightKey.isDown) dvx += dSpeed;
    dummyBody.setVelocity(dvx, dvy);

    if (Phaser.Input.Keyboard.JustDown(this.dummyToggleKey)) {
      this.dummyAttacksOn = !this.dummyAttacksOn;
      this.showFloatingText(this.npc.x, this.npc.y - 80,
        this.dummyAttacksOn ? '⚔ ABILITIES ON' : '🛑 ABILITIES OFF',
        this.dummyAttacksOn ? '#ff9a66' : '#7ad48f');
    }

    // P: a plain shot at the player, so the range can be used to practise
    // dodging as well as hitting.
    if (Phaser.Input.Keyboard.JustDown(this.dummyFireKey)) {
      const proj = new Projectile(this, this.npc.x, this.npc.y, 'proj-fire', 10, false);
      this.projectiles.add(proj);
      const a = Math.atan2(this.player.y - this.npc.y, this.player.x - this.npc.x);
      proj.launch(Math.cos(a) * 500, Math.sin(a) * 500);
      this.showFloatingText(this.npc.x, this.npc.y - 20, '🔥 PEW!', '#ff8800');
    }

    // ── The tally ──────────────────────────────────────────────────
    if (this.dummyComboDamage > 0 && time >= this.dummyComboResetAt) {
      if (this.dummyComboDamage > this.dummyBestCombo) {
        this.dummyBestCombo = this.dummyComboDamage;
        this.showFloatingText(this.npc.x, this.npc.y - 96, `★ BEST ${this.dummyBestCombo}`, '#ffd27a');
      }
      this.dummyComboDamage = 0;
      this.dummyComboResetAt = 0;
    }

    if (this.dummyComboText?.active) {
      const left = this.dummyComboResetAt > 0 ? Math.max(0, (this.dummyComboResetAt - time) / 1000) : 0;
      this.dummyComboText
        .setText(this.dummyComboDamage > 0 ? `${this.dummyComboDamage}  ·  ${left.toFixed(1)}s` : '0')
        .setPosition(this.npc.x, this.npc.y - 62)
        .setColor(this.dummyComboDamage > 0 && this.dummyComboDamage >= this.dummyBestCombo ? '#ffe9a8' : '#ffd27a');
    }
    for (const t of this.dummyHudTexts) {
      if (t.getData('follow')) t.setPosition(this.npc.x, this.npc.y - 38);
      if (t.getData('role') === 'state') {
        t.setText(this.dummyAttacksOn
          ? `⚔ ABILITIES ON  ·  BEST 5s: ${this.dummyBestCombo}`
          : `🛑 ABILITIES OFF  ·  BEST 5s: ${this.dummyBestCombo}`)
          .setColor(this.dummyAttacksOn ? '#ff9a66' : '#7ad48f');
      }
    }
  }

  // ── Secret Tag Team transitions ───────────────────────────────────

  /**
   * A foe fell and there are more of them. Straight into the next one — this
   * chain was chosen up front, so unlike the campaign's tag team there is no
   * picker to go back to.
   */
  private secretTagNextEnemy(): void {
    if (this.gameEnded || !this.secretTag) return;
    this.gameEnded = true;
    const tag = this.secretTag;
    const nextIdx = tag.enemyIndex + 1;
    Sfx.play('victory');
    this.cameras.main.flash(300, 255, 200, 60);
    this.showFloatingText(this.scale.width / 2, this.scale.height / 2 - 40,
      `⚔ ${tag.enemies.length - nextIdx} LEFT`, '#ffd27a');
    this.time.delayedCall(1300, () => {
      this.scene.restart({
        ...this.bootData,
        elementId: tag.playerTeam[tag.playerIndex],
        enemyElementId: tag.enemies[nextIdx],
        // A fresh foe arrives whole; only a foe you were mid-way through keeps its wounds.
        secretTag: { ...tag, enemyIndex: nextIdx, enemyHp: null },
      });
    });
  }

  /**
   * You fell. The next element on your bench takes the floor and the foe keeps
   * every wound you put in it. Run out of bench and the bout is lost.
   */
  private secretTagSwapIn(): void {
    if (this.gameEnded || !this.secretTag) return;
    const tag = this.secretTag;
    const nextIdx = tag.playerIndex + 1;
    if (nextIdx >= tag.playerTeam.length) {
      this.endGame(false);
      return;
    }

    this.gameEnded = true;
    Music.stop(0.5);
    Sfx.play('defeat');
    this.cameras.main.flash(350, 120, 40, 60);
    const next = ELEMENT_MAP[tag.playerTeam[nextIdx]];
    this.showFloatingText(this.scale.width / 2, this.scale.height / 2 - 40,
      `🔁 ${next ? next.name.toUpperCase() : 'NEXT ELEMENT'} STEPS UP`, '#8ad2ff');

    const carriedHp = Math.max(1, this.npc.hp);
    this.time.delayedCall(1500, () => {
      this.scene.restart({
        ...this.bootData,
        elementId: tag.playerTeam[nextIdx],
        enemyElementId: tag.enemies[tag.enemyIndex],
        playerPerk: PlayerData.getEquippedPerk(tag.playerTeam[nextIdx]),
        secretTag: { ...tag, playerIndex: nextIdx, enemyHp: carriedHp },
      });
    });
  }

  private endGame(playerWon: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    if (this.isOnline) this.onlineKit?.onMatchEnded();

    // The fight music drops out under the sting so the result lands cleanly.
    Music.stop(0.5);
    Sfx.play(playerWon ? 'victory' : 'defeat');

    // Paper's Journal: write the fight up. Only as Paper, and only where there is one enemy
    // element to learn about — Invasion is mixed-element husk waves, so there is nothing to file
    // it under. Everything else counts, including online: a human Fire teaches you about Fire.
    // `recordJournalResult` ignores anything it has no entries for (the King, a dummy husk), so
    // the mode check is the only gate that has to live here.
    if (this.elementId === 'paper' && !this.isInvasion) {
      const learned = recordJournalResult(this.npcElement.id, playerWon);
      learned.forEach((entry, i) => {
        this.time.delayedCall(220 + i * 420, () => {
          this.showFloatingText(this.player.x, this.player.y - 60 - i * 18,
            `📖 ${entry.name.toUpperCase()}`, '#e8c65c');
        });
      });
    }

    // Achievement — Swoon: put down an Expert Life bot while playing Metal. Bots only, so a
    // human opponent who happens to be Life can't hand it over.
    if (playerWon && !this.isOnline && !this.isInvasion
        && this.elementId === 'metal' && this.npcElement.id === 'life'
        && this.npcDifficulty.level === EXPERT_DIFFICULTY_LEVEL) {
      this.unlockAchievement('swoon');
    }

    // Bond research: a win over a named element. Invasion has no single opponent element to
    // credit, and online wins are over a human rather than the element being studied.
    if (playerWon && !this.isInvasion && !this.isOnline) {
      QuantumBonds.noteWin(this.elementId, this.npcElement.id);
      // Fired here rather than from the results screen, which is where the clear is *recorded*:
      // this is the only place that knows which element was carrying it.
      if (this.campaign?.isChallenge) {
        QuantumBonds.noteChallengeCleared(this.elementId, this.campaign.worldId);
      }
    }

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
      } else if (this.isBossFight) {
        this.scene.start('GameOverScene', {
          playerWon,
          difficulty: this.npcDifficulty.level,
          mode: 'boss',
          bossHard: this.isBossHard,
          devourerChoice: this.bossOutcome ?? undefined,
        });
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
          bounty: this.bounty ?? undefined,
          // A secret mode pays its own flat purse instead of the difficulty table's.
          secretMode: this.secretMode ?? undefined,
          // An unstable forge is settled on the results screen, win or lose.
          stabilize: this.stabilize ?? undefined,
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
   * Conquest's building upgrade menu. Freezes the match exactly the way the pause menu does —
   * same `pausedAt` stamp, so the RESUME handler shifts every cooldown forward by however long
   * the player spent reading a four-tier tree.
   */
  private openConquestMenu(): void {
    if (this.gameEnded) return;
    if (this.scene.isPaused()) return;
    this.pausedAt = Date.now();
    this.scene.launch('ConquestMenuScene', { parentSceneKey: this.scene.key, host: this.conquestKit });
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

  // ── Justice helpers ──────────────────────────────────────────

  /** Swap the ability tray between Justice's ground and flight stances. */
  private justiceSetHudForm(form: JusticeForm): void {
    const show = (objs: Phaser.GameObjects.GameObject[], on: boolean) => {
      for (const o of objs) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(on);
    };
    show(this.justiceGroundHudCards, form === 'ground');
    show(this.justiceFlightHudCards, form === 'flight');
    this.abilityBars = form === 'flight' ? this.justiceFlightFills : this.justiceGroundFills;
  }

  // ── Gluttony helpers ─────────────────────────────────────────

  /** Swap the ability tray between the chef's five keys and the butcher's. */
  private gluttonySetHudForm(form: GluttonyForm): void {
    // Guarded because the kit calls this whenever *either* side transforms, and an npc
    // butcher must not touch the player's tray — or the row it does not own.
    if (this.elementId !== 'gluttony' || !this.gluttonyChefFills.length) return;
    const show = (objs: Phaser.GameObjects.GameObject[], on: boolean) => {
      for (const o of objs) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(on);
    };
    show(this.gluttonyChefHudCards, form === 'chef');
    show(this.gluttonyButcherHudCards, form === 'butcher');
    this.abilityBars = form === 'butcher' ? this.gluttonyButcherFills : this.gluttonyChefFills;
  }

  // ── Quantum helpers ──────────────────────────────────────────

  /**
   * The per-frame tick for a bonded half that is *not* currently being played, keyed by
   * element id. Built once and handed to {@link QuantumKit}, which calls at most one entry
   * per side per frame.
   *
   * A dormant half still has things in the world — pools, turrets, summons, projectiles —
   * and they have to keep running, but its character rig and its HUD must stay torn down or
   * the player would be wearing two faces at once. Kits that already take an `isPlayerX`
   * flag do exactly that when it is false, so their entry is just a normal update with the
   * flag forced off.
   *
   * Two kinds of element are deliberately absent:
   *  - those whose main dispatch is unconditional (Illusion, Paper, Death, Fortune, Amber,
   *    Psychic, Radiation, Bind, Slime, Crystal, Life) — already ticking every frame;
   *  - those with no `isPlayerX` split yet, which freeze while dormant. Splitting the
   *    remainder is its own pass.
   *
   * Every entry guards on the npc's element: if the opponent is already that element the
   * main dispatch ran the kit this frame, and running it again would double-speed
   * everything owner-agnostic inside it.
   */
  /**
   * The per-frame tick for a bonded half that is *not* currently being played, keyed by
   * element id. Built once and handed to {@link QuantumKit}, which calls at most one entry
   * per side per frame.
   *
   * A dormant half still has things in the world — pools, turrets, summons, projectiles —
   * and they have to keep running. Its character rig and its HUD must not, and they do not:
   * every kit re-derives "am I the player's element" from `elementId` (directly, or through
   * an adapter getter that reads it), and during a dormant tick `elementId` points at the
   * *other* half. So a dormant kit tears its own rig down and skips its own player HUD
   * without being told to, and a dormant tick is simply that kit's ordinary update.
   *
   * This is the same state those kits already run in whenever the opponent is that element
   * and the player is not, so it is a well-worn path rather than a new one.
   *
   * Absent on purpose: elements whose main dispatch is unconditional (Illusion, Paper, Death,
   * Fortune, Amber, Psychic, Radiation, Bind, Slime-as-`gum`, Crystal, Life). They are
   * already ticking every frame, and a second call would double-advance them.
   *
   * Every entry skips when the opponent is that element: the main dispatch already ran the
   * kit this frame, and running it again would double-speed everything owner-agnostic inside
   * it. The one gap that leaves is Electricity and Acid, whose dispatch splits into a
   * narrower `updateNpc` — if the opponent is one of those, a dormant half of the same
   * element pauses until it is swapped back in.
   */
  private buildDormantTicks(): DormantTicks {
    const skip = (id: string): boolean => this.npcElement.id === id;
    return {
      fire: (t, d) => { if (!skip('fire')) this.fireKit.update(t, d, false, false); },
      shadow: (t, d) => { if (!skip('shadow')) this.shadowKit.update(t, d, false, false); },
      light: (t, d) => { if (!skip('light')) this.lightKit.update(t, d, false, false); },
      ice: (t, d) => { if (!skip('ice')) this.iceKit.update(t, d, false, false); },
      silence: (t, d) => { if (!skip('silence')) this.silenceKit.update(t, d, false, false); },
      sound: (t, d) => { if (!skip('sound')) this.soundKit.update(t, d, false, false); },
      magnet: (t, d) => { if (!skip('magnet')) this.magnetKit.update(t, d, false, false); },
      echo: (t, d) => { if (!skip('echo')) this.echoKit.update(t, d, false, false); },
      fate: (t, d) => { if (!skip('fate')) this.fateKit.update(t, d, false, false); },
      oil: (t, d) => {
        if (skip('oil')) return;
        const ptr = this.input.activePointer;
        this.oilKit.update(t, d, false, false, ptr.worldX, ptr.worldY);
      },
      water: (t, d) => { if (!skip('water')) this.waterKit.update(t, d); },
      earth: (t, d) => { if (!skip('earth')) this.earthKit.update(t, d); },
      air: (t, d) => { if (!skip('air')) this.airKit.update(t, d); },
      magic: (t, d) => { if (!skip('magic')) this.magicKit.update(t, d); },
      soul: (t, d) => { if (!skip('soul')) this.soulKit.update(t, d); },
      hunt: (t, d) => { if (!skip('hunt')) this.huntKit.update(t, d); },
      sand: (t, d) => { if (!skip('sand')) this.timeKit.update(t, d); },
      gravity: (t, d) => { if (!skip('gravity')) this.gravityKit.update(t, d); },
      creation: (t, d) => { if (!skip('creation')) this.creationKit.update(t, d); },
      metal: (t, d) => { if (!skip('metal')) this.metalKit.update(t, d); },
      plasma: (t, d) => { if (!skip('plasma')) this.plasmaKit.update(t, d); },
      gunpowder: (t, d) => { if (!skip('gunpowder')) this.gunpowderKit.update(t, d); },
      justice: (t, d) => { if (!skip('justice')) this.justiceKit.update(t, d); },
      dream: (t, d) => { if (!skip('dream')) this.dreamKit.update(t, d); },
      chalk: (t, d) => { if (!skip('chalk')) this.chalkKit.update(t, d); },
      magma: (t, d) => { if (!skip('magma')) this.magmaKit.update(t, d); },
      depths: (t, d) => { if (!skip('depths')) this.depthsKit.update(t, d); },
      gluttony: (t, d) => { if (!skip('gluttony')) this.gluttonyKit.update(t, d); },
      ruin: (t, d) => { if (!skip('ruin')) this.ruinKit.update(t, d); },
      dune: (t, d) => { if (!skip('dune')) this.sandKit.update(t, d); },
      conquest: (t, d) => { if (!skip('conquest')) this.conquestKit.update(t, d); },
      passion: (t, d) => { if (!skip('passion')) this.passionKit.update(t, d); },
      growth: (t, d) => { if (!skip('growth')) this.growthKit.update(t, d); },
      rubber: (t, d) => { if (!skip('rubber')) this.rubberKit.update(t, d); },
      technology: (t, d) => { if (!skip('technology')) this.techKit.update(t, d); },
      subterfuge: (t, d) => { if (!skip('subterfuge')) this.subterfugeKit.update(t, d); },
      electricity: (t, d) => { if (!skip('electricity')) this.electricityKit.update(t, d); },
      slime: (t, d) => { if (!skip('slime')) this.slimeKit.update(t, d); },
    };
  }

  /**
   * Re-keys the entire player side onto another element. This is the whole of a Quantum
   * swap: every per-element gate in this file reads `elementId`, every kit adapter reads it
   * through a getter, and the four things that are *cached* off it rather than read live are
   * refreshed here. Nothing about the Fighter itself changes — same body, same HP, same
   * shields, same status effects, same cooldown timestamps.
   */
  private applyPlayerElement(id: string): void {
    this.elementId = id;
    this.playerElement = ELEMENT_MAP[id] ?? fireElement;
    this.player.element = this.playerElement;
    // Each half brings its own upgrades and its own mastery binds — bonding with an element
    // means being it, not borrowing five keys off it.
    this.activeUpgrades = PlayerData.getActiveUpgrades(id);
    this.masterySlotBinds = PlayerData.isMasteryEnabled(id)
      ? PlayerData.getMasteryBinds(id)
      : {};
    // The equipped perk belongs to the element too. Whoever launched the fight looked one up
    // for `'quantum'`, which owns none, so a bonded fighter re-derives it per half instead.
    this.playerPerkId = PlayerData.getEquippedPerk(id);
    this.skinsKit.setLoadouts(PlayerData.getEquippedSkin(id), this.npcSkinId);
    this.quantumSetHudForm();
    // Online: the peer's sim has a replica of us that has to become the same thing, and it
    // cannot derive any of this — our upgrades and binds live in our save, not on the wire.
    if (this.isOnline) {
      this.onlineKit?.sendQuantumSwap(
        id, this.activeUpgrades, this.masterySlotBinds,
        PlayerData.isMasteryEnabled(id), PlayerData.getEquippedSkin(id),
      );
    }
  }

  /**
   * The npc-side equivalent. `loadout` is present only for an online opponent's collapse: a
   * local npc has no save to read upgrades or a skin out of, so it simply changes element.
   */
  private applyNpcElement(
    id: string,
    loadout?: { upgrades: string[]; masteryBinds: Record<string, string>; masteryOn: boolean; skin: string | null },
  ): void {
    this.npcElementId = id;
    this.npcElement = ELEMENT_MAP[id] ?? waterElement;
    this.npc.element = this.npcElement;
    if (!loadout) return;
    this.npcUpgrades = loadout.upgrades;
    this.npcMasteryBinds = loadout.masteryBinds;
    this.npcMasteryOn = loadout.masteryOn;
    this.npcSkinId = loadout.skin;
    this.skinsKit.setLoadouts(PlayerData.getEquippedSkin(this.elementId), this.npcSkinId);
  }

  /**
   * Swaps the ability tray to whichever half of the bond is live, on the same pre-built-rows
   * model Hunt, Justice and Gluttony use — the cards for both halves are built once in
   * `createHUD` and toggled, because rebuilding a tray mid-fight drops the cooldown fills.
   */
  private quantumSetHudForm(): void {
    if (!this.playerBond || !this.quantumOwnFills.length) return;
    // Which stop of the cycle is live. Third State makes this three-way, and the core row only
    // exists when the upgrade built it — falling back to the first row keeps a save that somehow
    // reaches Quantum without the upgrade from ending up with an empty tray.
    const onCore = this.elementId === 'quantum' && this.quantumCoreFills.length > 0;
    const onSecond = !onCore && this.elementId === this.playerBond[1];
    const show = (objs: Phaser.GameObjects.GameObject[], on: boolean) => {
      for (const o of objs) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(on);
    };
    show(this.quantumOwnHudCards, !onSecond && !onCore);
    show(this.quantumOtherHudCards, onSecond);
    show(this.quantumCoreHudCards, onCore);
    this.abilityBars = onCore ? this.quantumCoreFills
      : onSecond ? this.quantumOtherFills
      : this.quantumOwnFills;
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

    // Standard nuke charge bar
    if (this.nukeChanneling) {
      const lockDur = this.nukeChannelEnd - this.nukeLockStartTime;
      this.player.chargeRatio = lockDur > 0 ? Math.min(1, (time - this.nukeLockStartTime) / lockDur) : 1;
    }

    // ── Fire per-frame ────────────────────────────────────────────
    if (this.elementId === 'fire' || this.npcElement.id === 'fire') {
      this.fireKit.update(time, delta, this.elementId === 'fire', this.npcElement.id === 'fire');
    this.skinsKit.update();
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
      if (t.burningUntil > time) {
        const stoked = t.fireStokeBonus > 0;
        const auraColor = this.skinsKit.fireColor('player', stoked ? 0xcc1100 : 0xff4400);
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
      this.playerSpeedMult *= this.soundKit.getPlayerSpeedMult();
    } else if (this.elementId === 'subterfuge') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
    } else if (this.elementId === 'water') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // Water Mastery — Slipstream: +25% while standing in your own water.
      this.playerSpeedMult *= this.waterKit.getPlayerSpeedMult();
    } else if (this.elementId === 'air') {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
      // Air Mastery — Dancer's Momentum, and the stride Wind Breaker costs her.
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
    // Air NPC: the funnel keeps her feet but takes her stride.
    if (this.npcElement.id === 'air') {
      this.npcSpeedMult *= this.airKit.getNpcSpeedMult();
    }
    // Water NPC: a Sulphur eruption they set off under themselves.
    if (this.npcElement.id === 'water') {
      this.npcSpeedMult *= this.waterKit.getNpcSpeedMult();
    }
    // Sound: PARTY MODE (Q+) hands the soloist's whole stride to the other side for 12s.
    if (this.elementId === 'sound') {
      this.npcSpeedMult *= this.soundKit.getNpcSpeedMult();
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
    // Fortune: the Chilly Pepper's ring and the auditor's rifle. Pulled for the same reason
    // Justice is — FortuneKit.update() runs long after movement has resolved — and unconditional
    // because a slow the shopkeeper put on somebody outlives him being the one holding the stall.
    this.playerSpeedMult *= this.fortuneKit.getPlayerSpeedMult();
    this.npcSpeedMult *= this.fortuneKit.getNpcSpeedMult();
    // Paper: the Journal's footwork entries against this specific opponent. Player-side only —
    // the journal lives in the save, so an npc Paper has nothing written up. Pulled for the same
    // reason Justice is: PaperKit.update() runs long after movement has resolved.
    if (this.elementId === 'paper') {
      this.playerSpeedMult *= this.paperKit.getPlayerSpeedMult();
    }
    // Justice: Sheer Will and Flight on whoever is wearing it, plus the flame pillar's
    // wade on whoever is standing in one. Pulled, not pushed — JusticeKit.update() runs
    // long after this block has already resolved the frame's movement.
    if (this.elementId === 'justice' || this.npcElement.id === 'justice') {
      this.playerSpeedMult *= this.justiceKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.justiceKit.getNpcSpeedMult();
    }
    // Chalk: teal Masterpiece chalk, on whoever is standing on their own. Pulled for the
    // same reason Justice is — ChalkKit.update() runs after the frame's movement resolves.
    if (this.elementId === 'chalk' || this.npcElement.id === 'chalk') {
      this.playerSpeedMult *= this.chalkKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.chalkKit.getNpcSpeedMult();
    }
    // Conquest: Speedy Walls and Force Shield, on whoever is standing beside their own masonry.
    // Pulled for the same reason Justice is — ConquestKit.update() runs after movement resolves.
    if (this.elementId === 'conquest' || this.npcElement.id === 'conquest') {
      this.playerSpeedMult *= this.conquestKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.conquestKit.getNpcSpeedMult();
    }
    // Magma: Dragon Kin's haste, on whoever is currently hatched. Pulled for the same reason.
    if (this.elementId === 'magma' || this.npcElement.id === 'magma') {
      this.playerSpeedMult *= this.magmaKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.magmaKit.getNpcSpeedMult();
    }
    // Depths: the lure's feeding frenzy and an icefish's chill, on whoever is wearing either.
    // Pulled for the same reason Chalk and Magma are — DepthsKit.update() runs after the
    // frame's movement has already resolved.
    if (this.elementId === 'depths' || this.npcElement.id === 'depths') {
      this.playerSpeedMult *= this.depthsKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.depthsKit.getNpcSpeedMult();
    }
    // Gluttony: Forage's half speed, on whoever has their head in the undergrowth. Pulled for
    // the same reason Depths is — GluttonyKit.update() runs after movement has resolved.
    if (this.elementId === 'gluttony' || this.npcElement.id === 'gluttony') {
      this.playerSpeedMult *= this.gluttonyKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.gluttonyKit.getNpcSpeedMult();
    }
    // Ruin: Unstoppable Decay's 10%-per-stack slow, on whoever the rot is working against.
    // Pulled for the same reason Depths and Magma are — RuinKit.update() runs after the
    // frame's movement has already resolved.
    if (this.elementId === 'ruin' || this.npcElement.id === 'ruin') {
      this.playerSpeedMult *= this.ruinKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.ruinKit.getNpcSpeedMult();
    }
    // Death: a Styx brand's 15%-per-stack slow on whoever is wearing it, plus Disarm's and the
    // Deal's boosts on the reaper. Pulled for the same reason Ruin is — DeathKit.update() runs
    // after the frame's movement has already resolved.
    if (this.elementId === 'death' || this.npcElement.id === 'death') {
      this.playerSpeedMult *= this.deathKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.deathKit.getNpcSpeedMult();
    }
    // Illusion: a Phantom's blast leaves whoever it caught 30% slower. Pulled for the same
    // reason Death and Ruin are — IllusionKit.update() runs after movement has resolved.
    if (this.elementId === 'illusion' || this.npcElement.id === 'illusion') {
      this.playerSpeedMult *= this.illusionKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.illusionKit.getNpcSpeedMult();
    }
    // Marrow's fever is a haste on its own host and its NETs are a slow on whoever is standing
    // in one — both pulled here, after movement has resolved, because the kit's update runs last.
    if (this.elementId === 'marrow' || this.npcElement.id === 'marrow') {
      this.playerSpeedMult *= this.marrowKit.getPlayerSpeedMult();
      this.npcSpeedMult *= this.marrowKit.getNpcSpeedMult();
    }
    // Psychic holds a comatose body completely still. Pulled here rather than pushed onto the
    // body for the same reason Death and Ruin are — the kit's update runs after movement.
    this.playerSpeedMult *= this.psychicKit.getPlayerSpeedMult();
    this.npcSpeedMult *= this.psychicKit.getNpcSpeedMult();
    // Radiation's Critical Mission is a speed *boost* that halves on a clock, and its baton
    // pins a stunned body outright. Bind's is the permanent tithe the patron charges for the
    // barrage. Both are pulled here for the same reason Psychic is — the kits update after
    // the frame's movement has already resolved.
    this.playerSpeedMult *= this.radiationKit.getPlayerSpeedMult();
    this.npcSpeedMult *= this.radiationKit.getNpcSpeedMult();
    this.playerSpeedMult *= this.bindKit.getPlayerSpeedMult();
    this.npcSpeedMult *= this.bindKit.getNpcSpeedMult();
    // Slime's slimeballs, gum and wall glue, plus the lurching haul that stands in for a bot
    // dragging itself along the floor. Pulled here for the same reason the two above are.
    this.playerSpeedMult *= this.gumKit.getPlayerSpeedMult();
    this.npcSpeedMult *= this.gumKit.getNpcSpeedMult();
    // Growth Mastery — Sickness/Carrier slows on whoever is carrying the plague
    if (this.elementId === 'growth' || this.npcElement.id === 'growth') {
      this.playerSpeedMult *= this.growthKit.getSickSpeedMult(this.player);
      this.npcSpeedMult *= this.growthKit.getSickSpeedMult(this.npc);
    }
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

    // ── Disgraced King: cleaves and grasping hands leave you wading ───
    if (this.isBossFight && this.bossKit) this.playerSpeedMult *= this.bossKit.getPlayerSpeedMult();
    // ── World Sovereigns hold their slows the same way ────────────────
    if (this.worldBossId && this.worldBossKit) this.playerSpeedMult *= this.worldBossKit.getPlayerSpeedMult();

    // ── World Shift: what the ground itself is doing to you ───────────
    // Pulled, like every other contribution on this chain — the whole value is
    // rebuilt each frame, so a map that wrote into it would be overwritten.
    if (this.secretMapKit.mapId) this.playerSpeedMult *= this.secretMapKit.speedMultFor(this.player);

    // ── Ruin's spikes: a speed buff comes back as the same-sized slow ──
    // The one-shot flip in RuinKit can only reach fields on `Fighter`; a boost owned by some
    // other kit is only ever visible here, as a number greater than 1.
    if (time < this.player.buffsInvertedUntil && this.playerSpeedMult > 1) {
      this.playerSpeedMult = Math.max(0.25, 2 - this.playerSpeedMult);
    }
    if (time < this.npc.buffsInvertedUntil && this.npcSpeedMult > 1) {
      this.npcSpeedMult = Math.max(0.25, 2 - this.npcSpeedMult);
    }

    // ── Quantum's Effect Split: half strength, whichever way it points ─
    // The other half of the ability lives in `Fighter.takeDamage`; between the two, every
    // generic multiplier in the game is covered without any kit having to know about it. After
    // Ruin's flip on purpose — a split buff turned inside out should still be a split.
    if (time < this.player.effectSplitUntil) this.playerSpeedMult = 1 + (this.playerSpeedMult - 1) * 0.5;
    if (time < this.npc.effectSplitUntil) this.npcSpeedMult = 1 + (this.npcSpeedMult - 1) * 0.5;

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
    } else if (this.elementId === 'gum' && !this.isDodging) {
      // Slime has no legs. WASD does nothing at all; GumKit sets the velocity from the arm's
      // grip in its own update, which runs later this frame and therefore wins.
      playerBody.setVelocity(0, 0);
    } else if (this.elementId === 'rubber' && this.rubberKit.isSlingActive() && !this.isDodging) {
      this.rubberKit.applySlingMovement(mouseX, mouseY);
    } else if (this.nukeChanneling &&
               !(this.elementId === 'water' && this.waterKit.isDaggerCharging())) {
      // Standard nuke: fully locked
      playerBody.setVelocity(0, 0);
    } else if (this.justiceKit.isLocked('player') || this.justiceKit.isOnTrial(this.player)) {
      // Judgement Day and the Seraph are scenes. Whether you are holding the scales or
      // hanging in them, WASD is not part of it.
      playerBody.setVelocity(0, 0);
    } else if (this.dreamKit.isPlayerLocked()) {
      // Asleep on the floor or resting in the oasis — neither is a state you walk out of.
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

      const moveMult = this.playerSpeedMult * this.gauntletSpeedMult;

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

    // ── Sound: locked on stage while playing the bugle bar or a Solo ──
    if (this.elementId === 'sound' && this.soundKit.isPerforming() && !this.isDodging) {
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
      this.airKit.handleInput(time, pointer, mouseX, mouseY);

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
    } else if (this.elementId === 'subterfuge') {
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
    } else if (this.elementId === 'justice') {
      this.justiceKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'dream') {
      this.dreamKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'chalk') {
      this.chalkKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'magma') {
      this.magmaKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'illusion') {
      this.illusionKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'depths') {
      this.depthsKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'gluttony') {
      this.gluttonyKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'ruin') {
      this.ruinKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'dune' || this.sandKit.ownsPlayerInput()) {
      // Also when a Sand NPC has dragged the player into a Final Trail: they are on a parkour
      // course and need Space to be a jump, whatever element they actually brought.
      this.sandKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'paper') {
      this.paperKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'death') {
      this.deathKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'marrow') {
      this.marrowKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'psychic') {
      this.psychicKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'radiation') {
      this.radiationKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'bind') {
      this.bindKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'gum') {
      this.gumKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'conquest') {
      this.conquestKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'passion') {
      this.passionKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'silence') {
      this.silenceKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'sand') {
      this.timeKit.handleInput(time, pointer, mouseX, mouseY);
    } else if (this.elementId === 'gravity') {
      this.gravityKit.handleInput(time, pointer, mouseX, mouseY, delta);
    } else if (this.elementId === 'creation') {
      this.creationKit.handleInput(time, pointer, mouseX, mouseY, playerCtx);
    } else if (this.elementId === 'quantum') {
      this.quantumCoreKit.handleInput(time, pointer, mouseX, mouseY, playerCtx);
    }
    // Fortune is outside the chain on purpose: an enemy of a Fortune npc is still a customer,
    // so the number keys that buy from the stall have to be live for whoever the player is.
    // The kit early-returns when no shop exists at all.
    this.fortuneKit.handleInput(time, pointer, mouseX, mouseY);
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
    // Sand has no dodge: Space is its vertical jump, and SandKit reads the key itself. Gated
    // here rather than inside the kit so one press can never be both a hop and a roll. The same
    // applies to anyone Sand has pulled onto a Final Trail course, whatever element they are.
    if (this.elementId !== 'dune' && !this.sandKit.isTrailActive()
      && Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dodgeOnCooldown && !this.isDodging && !this.nukeChanneling && !this.cardSluggishDisableDodge && !this.silenceKit.isPlayerControlLost() && time >= this.player.highGravityUntil) {
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
      isLocked: this.npcNukeChanneling || this.npc.frozenUntil > time || this.magnetKit.getNailPullUntil() > time || (this.npc.magicChainBound && time < this.npc.magicChainBoundEnd) || time < this.silenceKit.getNpcYankUntil() || (this.airKit.isNpcHawkDragged() || this.airKit.isNpcSwept()) || (this.npcElement.id === 'rubber' && this.rubberKit.isBounceFormActive('npc')) || this.waterKit.isNpcSplit() || this.npc.chickenUntil > Date.now() || this.techKit.isNpcDragged() || this.justiceKit.isLocked('npc') || this.justiceKit.isOnTrial(this.npc) || this.dreamKit.isAsleep(this.npc) || this.dreamKit.isInOasis('npc') || this.sandKit.locksNpcAbilities(),
      hasActiveGeyser: this.geysers.some((g) => g.owner === 'npc'),
      flameBodyActive: this.fireKit.isNpcFlameBodyActive(),
      projectiles: this.projectiles,
      plantCount: this.lifeKit.getPlantCount('npc'),
      thornDragActive: false,
      enemyNearPlant: this.lifeKit.getPlantCount('npc') > 0,
      airTornadoActive: this.airKit.isTornadoActive('npc'),
      airWindDodge: this.airKit.getWindDodge('npc'),
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
      subMoney: this.npcElement.id === 'subterfuge' ? this.subterfugeKit.getNpcMoney() : 0,
      subBullets: this.npcElement.id === 'subterfuge' ? this.subterfugeKit.getNpcBullets() : 0,
      subLackeys: this.npcElement.id === 'subterfuge' ? this.subterfugeKit.getNpcLackeyCount() : 0,
      npcJusticeWill: this.justiceKit.getWill('npc'),
      npcJusticeFlying: this.justiceKit.getForm('npc') === 'flight',
      npcJusticeSheer: this.justiceKit.isSheerWillActive('npc'),
      npcJusticeAnchored: this.justiceKit.hasAnchor('npc'),
      justicePillarX: this.justiceKit.getHostilePillarX(this.npc) ?? undefined,
      justicePillarHalfWidth: this.justiceKit.pillarAvoidHalfWidth,
      npcDreamTrance: this.dreamKit.isTranceOn('npc'),
      npcDreamTargetDrowsy: this.dreamKit.getDrowsy(this.player),
      npcDreamTargetAsleep: this.dreamKit.isAsleep(this.player),
      npcDreamCatchers: this.dreamKit.getCatcherCount('npc'),
      // Consumes the pacing gate, so this is only ever read once a frame.
      npcDreamMayCatch: this.npcElement.id === 'dream' && this.dreamKit.canPlaceCatcher('npc', time),
      npcChalkDrawing: this.chalkKit.isDrawing('npc'),
      npcChalkShieldHp: this.chalkKit.getShieldHp('npc'),
      npcChalkMasterpiece: this.chalkKit.isMasterpieceActive('npc'),
      npcChalkMayPerma: this.npcElement.id === 'chalk' && !this.chalkKit.hasPerma('npc'),
      npcIllusionDancing: this.illusionKit.isDancing('npc'),
      npcIllusionHasVeil: this.illusionKit.hasVeil('npc'),
      npcIllusionTargetFolded: this.illusionKit.isFolded(this.player),
      npcMagmaDragon: this.magmaKit.isDragonActive('npc'),
      npcMagmaFist: this.magmaKit.isFistActive('npc'),
      npcMagmaBloat: this.magmaKit.isBloatActive('npc'),
      npcMagmaVolcanoes: this.magmaKit.volcanoCount('npc'),
      npcMagmaHasEgg: this.magmaKit.hasEgg('npc'),
      npcMagmaChargeTarget: this.magmaKit.chargeTarget('npc') ?? undefined,
      // Depths: the seek point is the only one of these that moves the body, and it is
      // deliberately live for a Depths *player* too — the lure exists to be walked into.
      depthsSeekPoint: this.depthsKit.npcSeekPoint() ?? undefined,
      npcDepthsFishing: this.depthsKit.isFishing('npc'),
      npcDepthsHasFish: this.depthsKit.hasFish('npc'),
      npcDepthsSharkOut: this.depthsKit.isSharkOut('npc'),
      npcDepthsTargetLatches: this.depthsKit.latchCount(this.player),
      npcDepthsDrowning: this.depthsKit.isDrowning(this.npc),
      // Gluttony: the seek point is only ever a collection — something of the bot's own has
      // finished cooking, or is lying on the floor where it threw it.
      gluttonySeekPoint: this.gluttonyKit.npcSeekPoint() ?? undefined,
      npcGluttonyButcher: this.gluttonyKit.isButcher('npc'),
      npcGluttonyHunger: this.gluttonyKit.hungerMs('npc'),
      npcGluttonyFood: this.gluttonyKit.foodCount('npc'),
      npcGluttonyHasMeat: this.gluttonyKit.hasMeat('npc'),
      npcGluttonyForaging: this.gluttonyKit.isForaging('npc'),
      npcGluttonyGrillRoom: this.gluttonyKit.grillHasRoom(),
      npcGluttonyMawAwake: this.gluttonyKit.isMawAwake('npc'),
      npcGluttonyCooking: this.gluttonyKit.cookingCount('npc'),
      gluttonyGrillPoint: this.gluttonyKit.grillPoint(),
      // Conquest: the bot has to physically stand on the square it means to build on, so its
      // build queue is a destination before it is ever a cast.
      conquestSeekPoint: this.conquestKit.npcSeekPoint() ?? undefined,
      npcConquestReady: this.conquestKit.npcReadyToBuild() ?? undefined,
      npcConquestAuthority: this.conquestKit.npcAuthority(),
      // Passion: the bot's every decision is "how full is their bar", so that is what it gets.
      npcPassionHasRose: this.passionKit.hasRose('npc'),
      npcPassionPosing: this.passionKit.isPosing('npc'),
      npcPassionTargetLove: this.passionKit.loveRatio(this.player),
      // Ruin: three of its five refuse to be cast twice, so the bot is told what is already out.
      npcRuinRingUp: this.ruinKit.hasRing('npc'),
      npcRuinSkewerOut: this.ruinKit.hasSkewer('npc'),
      npcRuinDecayStacks: this.ruinKit.decayStacks('npc'),
      npcRuinCanLock: this.ruinKit.canLock(this.player),
      // Paper: which book is open decides what the click and the Q even are, so the bot has to
      // be told rather than guessing — and the Alien book refuses the click on its own clocks.
      npcPaperBook: this.paperKit.getBook('npc'),
      npcPaperLaserBusy: this.paperKit.isLaserBusy('npc'),
      npcPaperRiding: this.paperKit.isRiding('npc'),
      npcPaperMaches: this.paperKit.macheCount('npc'),
      // Sand: a course in progress owns the body, and three of its five live behind kit state
      // (a reloading gun, a worm already in the sand, an idol already awake) that no cooldown
      // could tell the bot about.
      npcDuneOnCourse: this.sandKit.isOnCourse('npc'),
      npcDuneReloaded: this.sandKit.isReloaded('npc'),
      npcDuneTrailUp: this.sandKit.isTrailActive(),
      npcDunePyramidAwake: this.sandKit.isPyramidAwake('npc'),
      // Death: three of its five refuse to be cast twice, and the handshake takes the body away
      // entirely — none of which the bot can see from where it stands.
      npcDeathBusy: this.deathKit.isBusy('npc'),
      npcDeathGuarding: this.deathKit.isGuarding('npc'),
      npcDeathDealing: this.deathKit.isDealing('npc'),
      npcDeathLimbsTaken: this.deathKit.limbsTaken(this.player),
      npcDeathTargetStyx: this.deathKit.markStacks('npc', this.player),
      npcDeathClock: this.deathKit.clockSeconds('npc'),
      // Disarmed by the Death upgrade: its weapon is on the floor and none of its keys work
      // until it walks over it, so fetching the thing outranks fighting entirely.
      deathWeaponPoint: this.deathKit.weaponPointFor(this.npc),

      // Fortune: the bot is spending a resource it cannot see from the arena, and its trigger
      // is gated by a magazine rather than by the ability's own cooldown.
      npcFortuneCoins: this.fortuneKit.coinsOf('npc'),
      npcFortuneInvested: this.fortuneKit.bankOf('npc') + this.fortuneKit.stocksOf('npc'),
      npcFortuneAmmo: this.fortuneKit.ammoOf('npc'),
      npcFortuneBeaming: this.fortuneKit.isBeaming('npc'),
      npcFortuneWall: this.fortuneKit.hasWall('npc'),

      // Marrow: every decision the bot makes is about the five sockets and the fever, and it
      // can see neither from the arena.
      npcMarrowCells: this.marrowKit.summonCount('npc'),
      npcMarrowMasts: this.marrowKit.mastCount('npc'),
      npcMarrowInflammation: this.marrowKit.inflammationOf('npc'),
      npcMarrowTcellArmed: this.marrowKit.isTcellArmed('npc'),

      // Psychic: every decision the bot makes is about a queue and a pool it can see and the
      // arena cannot, so both are handed over rather than guessed at.
      npcPsychicQueue: this.psychicKit.queueCount('npc'),
      npcPsychicBigCast: this.psychicKit.queueHasUltimate('npc'),
      npcPsychicStress: this.psychicKit.stressOnTarget('npc'),

      // Radiation: the whole element is two chains the arena cannot see — how many tracers are
      // already planted, and whether the flare gun is out with rounds left in it.
      npcRadiationTracers: this.radiationKit.tracersOn('npc'),
      npcRadiationFlares: this.radiationKit.flaresOut('npc'),
      npcRadiationBusy: this.radiationKit.isBusy('npc'),
      npcRadiationTargetDosed: this.radiationKit.targetIrradiated('npc'),

      // Bind: every decision the bot makes is about a bar it owns and a beam that can cook it.
      npcBindAnger: this.bindKit.angerOf('npc'),
      npcBindForsaken: this.bindKit.isForsaken('npc'),
      npcBindHeat: this.bindKit.heatOf('npc'),
      npcBindOverheated: this.bindKit.isOverheated('npc'),
      npcBindIdolFaith: this.bindKit.idolFaith('npc'),
      npcBindWard: this.bindKit.wardCharges('npc'),
      npcBindChained: this.bindKit.isChained('npc'),
      npcBindCult: this.bindKit.cultSize('npc'),
      // Slime: the bot's whole decision surface is what its one hand is currently able to do.
      npcGumHandless: this.gumKit.isHandless('npc'),
      npcGumBalls: this.gumKit.ballsReady('npc'),
      npcGumAbsorbArmed: this.gumKit.isAbsorbArmed('npc'),
      npcGumTargetEncased: this.gumKit.isTargetEncased('npc'),
    };

    // ── World Shift steering ──────────────────────────────────────
    // The map is allowed to override where the bot walks (a campfire it is about
    // to die without, a potion worth crossing for) and to tell it which side of
    // a lava river it belongs on. Written here, one line before the decision, so
    // it is always this frame's answer.
    if (this.secretMapKit.mapId) {
      aiState.mapSeekPoint = this.secretMapKit.seekPointFor(this.npc);
      const band = this.secretMapKit.avoidBand();
      if (band) {
        aiState.mapAvoidBandX = band.x;
        aiState.mapAvoidBandHalfWidth = band.halfWidth;
        aiState.mapCrossBand = this.secretMapKit.shouldCrossBand(this.npc, this.player);
      }
    }
    // The Graveyard is a three-way fight; the bot is allowed to turn on whatever
    // climbed out of the ground and is currently biting it.
    const npcTarget = this.secretMapKit.aiTargetOverride(this.npc, this.player) ?? this.player;

    const npcPreDashX = this.npc.x;
    const npcPreDashY = this.npc.y;
    const npcCastId = this.isOnline
      ? (this.isInvasion ? (this.invasionCoopKit?.consumeNpcCast() ?? null) : (this.onlineKit?.consumeNpcCast() ?? null))
      // The boss never runs the NPC state machine — DisgracedKingKit drives its
      // body and every attack it makes.
      // The practice range is the other body that never decides for itself: the
      // player drives it, and `O` is the only thing that hands it back its kit.
      : (this.isInvasion || this.isBossFight || !!this.worldBossId || (this.dummyPractice && !this.dummyAttacksOn) || this.shadowKit.isConsumeActive() || this.time.now < this.shadowKit.getNpcThrowUntil()) ? null : (this.npc as NpcOpponent).doAI(
        npcTarget,
        (tx: number, ty: number) => this.buildNpcContext(tx, ty),
        time,
        aiState,
      );
    this.npcCastId = npcCastId;
    // A Conquest build only lands once the bot is standing on the square, so the destination
    // it was walking to is retired here rather than inside the kit — this is the only place
    // that knows the cast actually went through.
    if (npcCastId && npcCastId.startsWith('conquest-') && npcCastId !== 'conquest-banner') {
      this.conquestKit.npcClearSeek();
    }

    // ── Invasion mode update ──────────────────────────────────────
    if (this.isInvasion) {
      if (this.isOnline) this.invasionCoopKit?.update(time, delta);
      else this.invasionKit.update(time, delta);
    }

    // ── Duo: the second opponent takes its turn ───────────────────
    // Immediately after the front bot's, and inside its own borrowed slot —
    // see DuoKit for why the slot is borrowed rather than widened.
    if (this.duoKit.isActive) {
      this.duoKit.update(time, delta);
      this.duoKit.clampToArena();
      this.duoKit.drawNameplate();
    }

    // ── World Shift: the arena's own rules ────────────────────────
    this.secretMapKit.update(time, delta);


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

    // ── Practice range ────────────────────────────────────────────
    // After the AI block, so the velocity written here is the last word even
    // once the target's abilities have been switched back on.
    if (this.dummyPractice) this.updateDummyPractice(time, delta);

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

    // The opponent's half of the same pull. Split from the player's because the
    // two multipliers are consumed at different points in the frame.
    if (this.secretMapKit.mapId) this.npcSpeedMult *= this.secretMapKit.speedMultFor(this.npc);

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

    // ── Justice per-frame ────────────────────────────────────────
    if (this.elementId === 'justice' || this.npcElement.id === 'justice') {
      this.justiceKit.update(time, delta);
    }

    // ── Dream per-frame ──────────────────────────────────────────
    if (this.elementId === 'dream' || this.npcElement.id === 'dream') {
      this.dreamKit.update(time, delta);
    }
    if (this.elementId === 'chalk' || this.npcElement.id === 'chalk') {
      this.chalkKit.update(time, delta);
    }
    if (this.elementId === 'magma' || this.npcElement.id === 'magma') {
      this.magmaKit.update(time, delta);
    }
    // Unconditional: a fold outlives the Illusion fighter that applied it, so the kit has to
    // keep ticking long enough to hand a victim's own body back. It early-outs on its own.
    this.illusionKit.update(time, delta);
    if (this.elementId === 'depths' || this.npcElement.id === 'depths') {
      this.depthsKit.update(time, delta);
    }
    if (this.elementId === 'gluttony' || this.npcElement.id === 'gluttony') {
      this.gluttonyKit.update(time, delta);
    }
    if (this.elementId === 'ruin' || this.npcElement.id === 'ruin') {
      this.ruinKit.update(time, delta);
    }
    // Also while a Final Trail is up: the race outlives a stance swap, and the rival it dragged
    // in may not be a Sand fighter at all.
    if (this.elementId === 'dune' || this.npcElement.id === 'dune' || this.sandKit.isTrailActive()) {
      this.sandKit.update(time, delta);
    }
    // Unconditional: a rider glued to a paper plane and the Journal's multipliers both outlive
    // being Paper, and this loop is the only thing that hands either back. It early-outs itself.
    this.paperKit.update(time, delta);
    // Unconditional for the same reason Paper is: a stun the kit is holding, a brand's
    // damage mirror and a running Deal all outlive being Death. It early-outs itself.
    this.deathKit.update(time, delta);
    this.fortuneKit.update(time, delta);
    this.marrowKit.update(time, delta);
    // Unconditional for the same reason Paper and Death are: a queue of borrowed casts, a
    // coma and a stress pool all outlive the psychic that started them, and this loop is the
    // only thing that hands any of them back. It early-outs itself.
    this.psychicKit.update(time, delta);
    // Unconditional for the same reason Psychic is: a dose, a swollen hitbox, a permanent tithe
    // and a queue of puddles all outlive the fighter that started them, and this loop is the
    // only thing that hands any of them back. Both early-out themselves.
    this.radiationKit.update(time, delta);
    this.bindKit.update(time, delta);
    // Unconditional for the same reason Bind is: gum shells, wall glue, a swallowed shot and a
    // pile of slimeballs all outlive the slime that made them. It early-outs itself.
    this.gumKit.update(time, delta);
    if (this.elementId === 'conquest' || this.npcElement.id === 'conquest') {
      this.conquestKit.update(time, delta);
    }
    if (this.elementId === 'passion' || this.npcElement.id === 'passion') {
      this.passionKit.update(time, delta);
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

    // ── Subterfuge per-frame ──────────────────────────────────────
    if (this.elementId === 'subterfuge' || this.npcElement.id === 'subterfuge') {
      this.subterfugeKit.update(time, delta);
    }

    // ── Quantum per-frame ─────────────────────────────────────────
    // Unconditional: the kit early-outs when neither side is Quantum, and when one is it
    // owns the instability decay, the bond readout, and the dormant half's tick.
    // Unconditional, unlike the bonded halves: the third state's parasites and seam outlive the
    // form that made them, so it is not a dormant tick — it always runs.
    this.quantumCoreKit.update(time, delta);
    this.quantumKit.update(time, delta);

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

    // Air's Wind Breaker holds its captives by position, so the kit has to run
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
    // Chaos Realm gets first refusal: anything it bounces back inside the arena
    // is still in play when the cull below looks at it. The Ricochet Glyph has the
    // same claim, which is why the artifact kit ticks here rather than down with the
    // item kit — a bounced shot has to be turned around before the cull sees it.
    this.artifactsKit?.update(delta);
    this.secretMapKit.reflectProjectiles();
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
      // Duo's partner and the Graveyard's risen are clamped by their own kits;
      // this is still the slot body's clamp.
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
      } else if (entry.abilityId.startsWith('dream-')) {
        // Trance is a toggle, not a cooldown — the kit owns the bar.
        entry.fill.setSize(entry.maxWidth * this.dreamKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('chalk-')) {
        // Four of the five spend most of their life showing a drawing window, a shield's
        // remaining board or the Masterpiece clock rather than a cooldown — the kit owns it.
        entry.fill.setSize(entry.maxWidth * this.chalkKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('illusion-')) {
        // The pane's remaining seconds and the dance's own clock outlast their cooldowns.
        entry.fill.setSize(entry.maxWidth * this.illusionKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('ruin-')) {
        // The spike ring's two-second fuse is the only thing worth counting on these cards.
        entry.fill.setSize(entry.maxWidth * this.ruinKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('paper-')) {
        // The click is gated by the Alien book's burst and reload rather than by its own
        // cooldown whenever that book is open, so the kit decides what the card is counting.
        entry.fill.setSize(entry.maxWidth * this.paperKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('dune-')) {
        // The click counts a reload the golden orb can halve, the two obby cards count how much
        // course is left to climb, and the Q counts a fuse and then a worm.
        entry.fill.setSize(entry.maxWidth * this.sandKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('fortune-')) {
        // The click counts a reload rather than its own cooldown, and the wall and the beam
        // are both durations — the kit decides what all three cards are showing.
        entry.fill.setSize(entry.maxWidth * this.fortuneKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('marrow-')) {
        // F reads as ready the moment it is armed with a T-cell, and the Q counts the mast
        // cells' five-second fuse rather than its own cooldown while any are still out.
        entry.fill.setSize(entry.maxWidth * this.marrowKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('death-')) {
        // A blade being held out, a noose hanging and the ten seconds of a deal all outlast
        // their own cooldowns, so the kit decides what those three cards are counting.
        entry.fill.setSize(entry.maxWidth * this.deathKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('glut-')) {
        // The knife card fills with heat rather than cooldown once it is ready, and the hunger
        // bar, the pot and the maw's own clock all outlast the cooldowns underneath them.
        entry.fill.setSize(entry.maxWidth * this.gluttonyKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('depths-')) {
        // The line coming in, the drowning clock and the shark's eight seconds all outlast
        // their own cooldowns, so the kit decides what these cards are counting.
        entry.fill.setSize(entry.maxWidth * this.depthsKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('passion-')) {
        // The rose's fifteen seconds and the pose's five both outlast their own cooldowns.
        entry.fill.setSize(entry.maxWidth * this.passionKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('magma-')) {
        // A live fist, a swollen bloat and Q's pressure-then-dragon arc all outlast their own
        // cooldowns, so the kit decides what these five cards are counting down.
        entry.fill.setSize(entry.maxWidth * this.magmaKit.getBarRatio(entry.abilityId, time), entry.fill.height);
      } else if (entry.abilityId.startsWith('justice-')) {
        // Sheer Will, Flight and a hooked chain are states, not cooldowns — the kit owns the bar.
        entry.fill.setSize(entry.maxWidth * this.justiceKit.getBarRatio(entry.abilityId, time), entry.fill.height);
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
      } else if (entry.abilityId === 'spin-dance') {
        // Charges, not a cooldown: full the moment one is banked, draining toward the next.
        // A second banked charge is invisible on a bar, so it goes in the sub-label instead.
        entry.fill.setSize(entry.maxWidth * this.airKit.getSpinChargeRatio(), entry.fill.height);
        if (entry.desc && this.hasUpgrade('e')) {
          entry.desc.setText(`Charges: ${this.airKit.getSpinCharges()}/2`);
        }
      } else if (entry.abilityId === 'wind-breaker' && this.airKit.isTornadoActive('player')) {
        // While she *is* the tornado the card reads as held, not as recharging.
        entry.fill.setSize(entry.maxWidth, entry.fill.height);
      } else if (entry.abilityId === 'winds-of-change') {
        entry.fill.setSize(entry.maxWidth * this.airKit.getWindsCooldownRatio(time), entry.fill.height);
      } else if (entry.abilityId === 'grav-bomb') {
        if (this.gravityKit.isGravBombHolding()) {
          entry.fill.setSize(entry.maxWidth * this.player.chargeRatio, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('grav-bomb'), entry.fill.height);
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

    // ── Disgraced King ────────────────────────────────────────────────
    // Runs last on purpose: the boss body has `moves = false` and is placed by
    // the kit, so anything that dragged or shoved it earlier this frame (a
    // grapple, a pull) is corrected before the frame is drawn.
    if (this.isBossFight) this.bossKit?.update(time, delta);
    if (this.worldBossId) this.worldBossKit?.update(time, delta);
    if (!this.gameEnded) {
      this.formatKit?.update(time, delta);
      this.gimmickKit?.update(time, delta);
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
    // Kill credit — see Fighter.lastDamageOwner. Stamped before any of the
    // on-hit riders below, so a shot that kills through a status still counts.
    target.lastDamageOwner = 'player';
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
    // Illusion Click+ (Immersion Breaker): a Crack Shot goes through a body rather than
    // stopping in it. The kit owns the whole hit, because its per-shot memory is the only
    // thing stopping one bullet from billing the same target on every frame it overlaps them.
    // Deliberately below the dodge roll — a pierce is not an answer to evasion.
    if (proj.texture.key === 'proj-illusion-crack' && this.illusionKit.onCrackShotHit(proj, target)) {
      return; // proj NOT deactivated — the kit's wall sweep still owns its end
    }
    // Ruin Click+: a shot that flew through a ruin crystal moves health into the weak pool
    // instead of dealing damage, so it never reaches the ordinary pipeline below. Deliberately
    // under every immunity and the dodge roll — rust is a different kind of hit, not a bypass.
    if (proj.ruinRusted && this.ruinKit.applyRustedHit(proj, target)) return;
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

  /**
   * Ruin's Spikes of Ruin: kill every structure, building and summon inside the circle that
   * doesn't belong to `exceptOwner`, and report how many died.
   *
   * The dispatch lives here because ArenaScene is the only object holding every kit, but none
   * of the *deciding* does — each kit answers `purgeSummons` for its own board, since only it
   * knows which of its objects is a thing somebody built and which is a puddle or a shot in
   * flight. Fighters are never touched by this: husks, bots and players are enemies, not
   * structures, and they take the ring's damage like anyone else.
   */
  private purgeSummonsInCircle(
    cx: number, cy: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    const kits: SummonPurgeTarget[] = [
      this.conquestKit, this.soulKit, this.subterfugeKit, this.creationKit, this.huntKit,
      this.growthKit, this.oilKit, this.crystalKit, this.silenceKit, this.shadowKit,
      this.magicKit, this.soundKit, this.magmaKit, this.lifeKit, this.techKit, this.illusionKit,
      this.paperKit, this.sandKit, this.quantumCoreKit, this.marrowKit,
    ];
    let razed = 0;
    for (const kit of kits) razed += kit?.purgeSummons(cx, cy, radius, exceptOwner, report) ?? 0;
    return razed;
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

  // ── Secret-mode plumbing ─────────────────────────────────────────

  /** Register a body a secret mode brought with it (map husks, Duo's partner). */
  private addMapEnemy(f: Fighter): void {
    this.enemies.push(f);
    this.enemyGroup.add(f, true);
  }

  private removeMapEnemy(f: Fighter): void {
    this.enemies = this.enemies.filter((e) => e !== f);
    this.enemyGroup.remove(f, false, false);
  }

  /**
   * Point the arena's single npc slot at `f` for the length of `fn`, then put it
   * back exactly as it was.
   *
   * Duo's whole approach rests on this: the slot is what `buildNpcContext()` and
   * every kit's NPC mirror are written against, so the only honest way for a
   * second opponent to cast its own element is to *be* the npc while it does.
   * The window is one synchronous decision-plus-cast and never spans a frame —
   * `finally` rather than a plain restore, so a throwing ability cannot strand
   * the arena pointing at the wrong body.
   */
  public withNpcSlot<T>(f: NpcOpponent, el: Element, fn: () => T): T {
    const prevNpc = this.npc;
    const prevEl = this.npcElement;
    const prevId = this.npcElementId;
    this.npc = f;
    this.npcElement = el;
    this.npcElementId = el.id;
    try {
      return fn();
    } finally {
      this.npc = prevNpc;
      this.npcElement = prevEl;
      this.npcElementId = prevId;
    }
  }

  private dealAoeDamageFromOwner(cx: number, cy: number, radius: number, damage: number, owner: 'player' | 'npc', except?: Fighter): void {
    // Any AoE can wipe silence stalkers caught in the blast.
    this.silenceKit.notifyAoeDamage(cx, cy, radius, owner);
    // ...and Conquest soldiers, who have no body of their own for the loops below to find.
    this.conquestKit.notifyAoeDamage(cx, cy, radius, owner, damage);
    if (owner === 'player') {
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0 || t === except) continue;
        if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
          // Kill credit — see Fighter.lastDamageOwner. The Graveyard's runic bars
          // are the only reader today, and they only ask about husks.
          t.lastDamageOwner = 'player';
          t.takeDamage(damage);
          this.spawnHitFlash(t.x, t.y, 0x9944ff);
          this.spawnDamageNumber(t.x, t.y - 28, damage);
        }
      }
    } else {
      // An npc-owned blast also catches the map's own bodies, which is what lets
      // a bot earn runic charge off husk kills. Deliberately limited to those:
      // the two opponents in a Duo must not splash each other.
      for (const t of this.enemies) {
        if (!t.active || t.hp <= 0 || t === except) continue;
        if (!this.secretMapKit.ownsBody(t)) continue;
        if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
          t.lastDamageOwner = 'npc';
          t.takeDamage(damage);
          this.spawnHitFlash(t.x, t.y, 0x9944ff);
        }
      }
      if (this.player !== except && Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) <= radius) {
        this.player.lastDamageOwner = 'npc';
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